export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessagePayload {
  role: ChatRole;
  content: string;
}

const OPENAI_API_KEY =
  import.meta.env.VITE_OPENAI_API_KEY ??
  import.meta.env.OPENAI_API_KEY ??
  '';

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';
const MODEL = 'gpt-5';

function extractResponseText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const data = payload as Record<string, unknown>;

  if (typeof data.output_text === 'string') {
    return data.output_text;
  }

  if (Array.isArray(data.output)) {
    const fragments: string[] = [];
    for (const entry of data.output) {
      if (!entry || typeof entry !== 'object') continue;
      const content = (entry as Record<string, unknown>).content;
      if (typeof content === 'string') {
        fragments.push(content);
      } else if (Array.isArray(content)) {
        for (const part of content) {
          if (!part || typeof part !== 'object') continue;
          const partRecord = part as Record<string, unknown>;
          if (typeof partRecord.text === 'string') {
            fragments.push(partRecord.text);
          } else if (typeof partRecord.value === 'string') {
            fragments.push(partRecord.value);
          }
        }
      }
    }
    if (fragments.length) {
      return fragments.join('').trim();
    }
  }

  if (Array.isArray(data.choices)) {
    const firstChoice = data.choices[0];
    if (firstChoice && typeof firstChoice === 'object') {
      const message = (firstChoice as Record<string, unknown>).message;
      if (message && typeof message === 'object') {
        const content = (message as Record<string, unknown>).content;
        if (typeof content === 'string') {
          return content.trim();
        }
      }
    }
  }

  return '';
}

export async function callOpenAiChat(
  messages: ChatMessagePayload[],
  options: { temperature?: number; signal?: AbortSignal } = {}
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing OpenAI API key. Set VITE_OPENAI_API_KEY in your environment.');
  }

  const input = messages.map((message) => ({
    role: message.role,
    content: [
      {
        type: 'text',
        text: message.content
      }
    ]
  }));

  const payload = {
    model: MODEL,
    temperature: options.temperature ?? 1,
    input
  };

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(payload),
    signal: options.signal
  });

  if (!response.ok) {
    let message = `OpenAI request failed (${response.status})`;
    try {
      const errorPayload = await response.json();
      if (errorPayload?.error?.message) {
        message = String(errorPayload.error.message);
      } else if (errorPayload?.message) {
        message = String(errorPayload.message);
      }
    } catch {
      // Ignore JSON parse errors.
    }
    throw new Error(message);
  }

  const data = await response.json();
  const text = extractResponseText(data);
  if (!text) {
    throw new Error('OpenAI returned an empty response.');
  }
  return text.trim();
}
