import { DEFAULT_CHAT_PROMPT } from '../../../lib/prompts';
import { ChatRequestBody } from '../../../lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GROQ_API_BASE_URL = 'https://api.groq.com/openai/v1';

function getApiKey(request: Request) {
  return request.headers.get('x-groq-key')?.trim() || process.env.GROQ_API_KEY?.trim() || null;
}

function normalizeMessages(messages: unknown) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .map((message) => {
      const entry = message as ChatRequestBody['messages'][number];
      const role = entry?.role === 'assistant' ? 'assistant' : entry?.role === 'user' ? 'user' : null;
      const content = typeof entry?.content === 'string' ? entry.content.trim() : '';

      if (!role || !content) {
        return null;
      }

      return { role, content };
    })
    .filter(Boolean);
}

function interpolateTemplate(template: string, transcriptWindow: string) {
  return template.replace('{transcriptWindow}', transcriptWindow);
}

export async function POST(request: Request) {
  const apiKey = getApiKey(request);

  if (!apiKey) {
    return Response.json({ error: 'No API key' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<ChatRequestBody>;
    const messages = normalizeMessages(body?.messages);
    const systemPrompt = interpolateTemplate(
      typeof body?.chatPrompt === 'string' && body.chatPrompt.trim()
        ? body.chatPrompt
        : DEFAULT_CHAT_PROMPT,
      String(body?.transcriptWindow ?? '')
    );

    const upstream = await fetch(`${GROQ_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        stream: true,
        temperature: 0.2,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      throw new Error((await upstream.text()) || 'Chat streaming failed');
    }

    const reader = upstream.body.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let buffer = '';
        let sentDone = false;

        const pushChunk = (eventChunk: string) => {
          const lines = eventChunk.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed.startsWith('data:')) {
              continue;
            }

            const data = trimmed.slice(5).trim();

            if (!data) {
              continue;
            }

            if (data === '[DONE]') {
              sentDone = true;
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return true;
            }

            try {
              const payload = JSON.parse(data);
              const token = payload?.choices?.[0]?.delta?.content ?? '';

              if (token) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
              }
            } catch (_error) {
              continue;
            }
          }

          return false;
        };

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });

            let separatorIndex = buffer.indexOf('\n\n');
            while (separatorIndex >= 0) {
              const eventChunk = buffer.slice(0, separatorIndex);
              buffer = buffer.slice(separatorIndex + 2);

              if (pushChunk(eventChunk)) {
                return;
              }

              separatorIndex = buffer.indexOf('\n\n');
            }
          }

          if (buffer.trim()) {
            pushChunk(buffer);
          }

          if (!sentDone) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        } catch (error) {
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Chat streaming failed' },
      { status: 500 }
    );
  }
}
