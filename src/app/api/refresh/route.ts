import { DEFAULT_SUGGESTION_PROMPT, MALFORMED_JSON_RETRY_SUFFIX } from '../../../lib/prompts';
import { RefreshResponse, SuggestionType } from '../../../lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GROQ_API_BASE_URL = 'https://api.groq.com/openai/v1';

const SUGGESTION_TYPES: SuggestionType[] = [
  'QUESTION',
  'ANSWER',
  'FACT_CHECK',
  'TALKING_PT',
  'CLARIFY',
  'NEXT_STEP',
];

function getApiKey(request: Request) {
  return request.headers.get('x-groq-key')?.trim() || process.env.GROQ_API_KEY?.trim() || null;
}

function getAudioFile(formData: FormData) {
  const value = formData.get('audio');

  if (!value || typeof value === 'string') {
    throw new Error('Audio file is required');
  }

  return value;
}

function getFormString(formData: FormData, key: string, fallback = '') {
  const value = formData.get(key);
  return typeof value === 'string' ? value : fallback;
}

function getFormNumber(formData: FormData, key: string, fallback = 0) {
  const rawValue = getFormString(formData, key, '');
  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function toStringArray(value: string) {
  if (!value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((entry) => String(entry ?? '').trim()).filter(Boolean)
      : [];
  } catch (_error) {
    return value
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
}

function interpolateTemplate(template: string, replacements: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => replacements[key] || '');
}

function parseJsonObject(value: string) {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    const firstBraceIndex = trimmed.indexOf('{');
    const lastBraceIndex = trimmed.lastIndexOf('}');

    if (firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex) {
      return JSON.parse(trimmed.slice(firstBraceIndex, lastBraceIndex + 1));
    }

    throw new Error('Suggestion model returned malformed JSON');
  }
}

async function transcribeAudio(audio: File, apiKey: string) {
  if (audio.size < 1000) {
    return '';
  }

  const payload = new FormData();
  payload.append('file', audio);
  payload.append('model', 'whisper-large-v3');

  const response = await fetch(`${GROQ_API_BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: payload,
  });

  if (!response.ok) {
    throw new Error((await response.text()) || 'Transcription failed');
  }

  const transcription = await response.json();
  return typeof transcription?.text === 'string' ? transcription.text.trim() : '';
}

async function generateSuggestions(
  apiKey: string,
  prompt: string,
  chunkIds: string[]
) {
  const execute = async (content: string) => {
    const response = await fetch(`${GROQ_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Return only valid JSON that matches the requested schema.' },
          { role: 'user', content },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error((await response.text()) || 'Suggestion generation failed');
    }

    const payload = await response.json();
    return String(payload?.choices?.[0]?.message?.content ?? '');
  };

  const createdAt = new Date().toISOString();
  const toSuggestions = (rawText: string) => {
    const parsed = parseJsonObject(rawText) as { suggestions?: Array<Record<string, string>> };
    const suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];

    return suggestions.slice(0, 3).map((suggestion) => {
      const normalizedType = String(suggestion.type ?? '').trim().toUpperCase() as SuggestionType;

      return {
        id: crypto.randomUUID(),
        type: SUGGESTION_TYPES.includes(normalizedType) ? normalizedType : 'QUESTION',
        title: String(suggestion.title ?? '').trim(),
        preview: String(suggestion.preview ?? '').trim(),
        detail: String(suggestion.detail ?? '').trim(),
        reason: String(suggestion.reason ?? '').trim(),
        basedOnChunkIds: chunkIds,
        createdAt,
      };
    });
  };

  let raw = await execute(prompt);

  try {
    return toSuggestions(raw);
  } catch (_error) {
    raw = await execute(`${prompt}\n\n${MALFORMED_JSON_RETRY_SUFFIX}`);
    return toSuggestions(raw);
  }
}

export async function POST(request: Request) {
  const apiKey = getApiKey(request);

  if (!apiKey) {
    return Response.json({ error: 'No API key' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const audio = getAudioFile(formData);
    const transcriptText = await transcribeAudio(audio, apiKey);

    const audioStartMs = getFormNumber(formData, 'audioStartMs', 0);
    const audioEndMs = getFormNumber(formData, 'audioEndMs', audioStartMs);
    const transcriptChunk = {
      id: crypto.randomUUID(),
      text: transcriptText,
      createdAt: new Date().toISOString(),
      audioStartMs,
      audioEndMs,
    };

    const previousTitles = toStringArray(getFormString(formData, 'previousTitles', '[]'));
    const previousChunkIds = toStringArray(getFormString(formData, 'chunkIds', '[]'));
    const transcriptWindow = getFormString(formData, 'transcriptWindow', '').trim();
    const recentWindow = getFormString(formData, 'recentWindow', '').trim();
    const suggestionPrompt = getFormString(formData, 'suggestionPrompt', '').trim() || undefined;

    const combinedTranscriptWindow = [transcriptWindow, transcriptText].filter(Boolean).join('\n');
    const combinedRecentWindow = [recentWindow, transcriptText].filter(Boolean).join('\n').slice(-500);
    const combinedChunkIds = [...previousChunkIds, transcriptChunk.id];

    const suggestions = transcriptText
      ? await generateSuggestions(
          apiKey,
          interpolateTemplate(suggestionPrompt || DEFAULT_SUGGESTION_PROMPT, {
            transcriptWindow: combinedTranscriptWindow || transcriptText,
            recentWindow: combinedRecentWindow || transcriptText,
            previousTitles: previousTitles.length ? previousTitles.join('\n') : 'None',
          }),
          combinedChunkIds
        )
      : [];

    return Response.json<RefreshResponse>({
      transcriptChunk: transcriptText ? transcriptChunk : null,
      suggestions,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Refresh failed' },
      { status: 500 }
    );
  }
}
