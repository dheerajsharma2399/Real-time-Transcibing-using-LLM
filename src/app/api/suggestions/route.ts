import { DEFAULT_SUGGESTION_PROMPT, MALFORMED_JSON_RETRY_SUFFIX } from '../../../lib/prompts';
import { SuggestionsRequestBody } from '../../../lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GROQ_API_BASE_URL = 'https://api.groq.com/openai/v1';

const SUGGESTION_TYPES = ['QUESTION', 'ANSWER', 'FACT_CHECK', 'TALKING_PT', 'CLARIFY', 'NEXT_STEP'];

function getApiKey(request: Request) {
  return request.headers.get('x-groq-key')?.trim() || process.env.GROQ_API_KEY?.trim() || null;
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? '').trim()).filter(Boolean);
  }

  return [];
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

async function requestSuggestions(apiKey: string, prompt: string) {
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
        {
          role: 'system',
          content: 'Return only valid JSON that matches the requested schema.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error((await response.text()) || 'Suggestion generation failed');
  }

  const payload = await response.json();
  return String(payload?.choices?.[0]?.message?.content ?? '');
}

export async function POST(request: Request) {
  const apiKey = getApiKey(request);

  if (!apiKey) {
    return Response.json({ error: 'No API key' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<SuggestionsRequestBody>;
    const transcriptWindow = String(body?.transcriptWindow ?? '');
    const recentWindow = String(body?.recentWindow ?? '');
    const previousTitles = toStringArray(body?.previousTitles);
    const chunkIds = toStringArray(body?.chunkIds);
    const prompt = interpolateTemplate(
      typeof body?.suggestionPrompt === 'string' && body.suggestionPrompt.trim()
        ? body.suggestionPrompt
        : DEFAULT_SUGGESTION_PROMPT,
      {
        transcriptWindow,
        recentWindow,
        previousTitles: previousTitles.length ? previousTitles.join('\n') : 'None',
      }
    );

    const createdAt = new Date().toISOString();
    const parseSuggestions = (content: string) => {
      const parsed = parseJsonObject(content) as { suggestions?: Array<Record<string, string>> };
      const suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];

      return suggestions.slice(0, 3).map((suggestion) => ({
        id: crypto.randomUUID(),
        type: SUGGESTION_TYPES.includes(String(suggestion.type).trim().toUpperCase())
          ? (String(suggestion.type).trim().toUpperCase() as
              | 'QUESTION'
              | 'ANSWER'
              | 'FACT_CHECK'
              | 'TALKING_PT'
              | 'CLARIFY'
              | 'NEXT_STEP')
          : 'QUESTION',
        title: String(suggestion.title ?? '').trim(),
        preview: String(suggestion.preview ?? '').trim(),
        detail: String(suggestion.detail ?? '').trim(),
        reason: String(suggestion.reason ?? '').trim(),
        basedOnChunkIds: chunkIds,
        createdAt,
      }));
    };

    let raw = await requestSuggestions(apiKey, prompt);
    let suggestions;

    try {
      suggestions = parseSuggestions(raw);
    } catch (_error) {
      raw = await requestSuggestions(apiKey, `${prompt}\n\n${MALFORMED_JSON_RETRY_SUFFIX}`);
      suggestions = parseSuggestions(raw);
    }

    return Response.json({ suggestions });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Suggestion generation failed' },
      { status: 500 }
    );
  }
}
