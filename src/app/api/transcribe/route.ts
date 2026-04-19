const GROQ_API_BASE_URL = 'https://api.groq.com/openai/v1';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const apiKey = getApiKey(request);

  if (!apiKey) {
    return Response.json({ error: 'No API key' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const audio = getAudioFile(formData);

    if (audio.size < 1000) {
      return Response.json({ text: '' });
    }

    const attempt = async () => {
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
        const errorText = await response.text();
        throw new Error(errorText || 'Transcription failed');
      }

      const transcription = await response.json();
      return typeof transcription?.text === 'string' ? transcription.text : '';
    };

    let text = '';

    try {
      text = await attempt();
    } catch (_error) {
      await sleep(2000);
      text = await attempt();
    }

    return Response.json({ text });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Transcription failed' },
      { status: 500 }
    );
  }
}
