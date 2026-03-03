import { AppSettings, AttachedFile } from '../types';

const GROQ_BASE = 'https://api.groq.com/openai/v1';

export const GROQ_MODELS = [
  { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', desc: 'Best quality — fast & free' },
  { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', desc: 'Fastest — great for simple tasks' },
  { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', desc: 'Long context — 32k tokens' },
  { value: 'gemma2-9b-it', label: 'Gemma 2 9B', desc: 'Google open model — efficient' },
];

export interface GroqMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export async function sendGroqMessage(
  content: string,
  settings: AppSettings,
  history: GroqMessage[],
  attachments: AttachedFile[] | null | undefined,
  onChunk?: (text: string) => void
): Promise<string> {
  const apiKey = settings.groqApiKey;
  if (!apiKey) throw new Error('Groq API key not set. Add it in Settings.');

  const files = Array.isArray(attachments) ? attachments : [];

  // Build user message with optional image attachments
  const userContent = files.length > 0
    ? [
        ...files
          .filter(f => f.mimeType.startsWith('image/'))
          .map(f => ({ type: 'image_url', image_url: { url: `data:${f.mimeType};base64,${f.base64}` } })),
        { type: 'text', text: content },
      ]
    : content;

  const messages: GroqMessage[] = [
    { role: 'system', content: settings.systemPrompt || 'You are a helpful AI assistant.' },
    ...history,
    { role: 'user', content: userContent as string },
  ];

  const body = {
    model: settings.groqModel || 'llama-3.3-70b-versatile',
    messages,
    temperature: settings.temperature,
    stream: !!(onChunk),
    max_tokens: 4096,
  };

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const msg = err?.error?.message || `Groq error ${res.status}`;
    if (res.status === 401) throw new Error('Invalid Groq API key. Check your key in Settings.');
    if (res.status === 429) throw new Error('Groq rate limit reached. Wait a moment and try again.');
    throw new Error(msg);
  }

  if (onChunk) {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let full = '';
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') break;
        try {
          const json = JSON.parse(payload);
          const chunk = json.choices?.[0]?.delta?.content || '';
          if (chunk) { full += chunk; onChunk(chunk); }
        } catch { /* skip */ }
      }
    }
    return full;
  } else {
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
}
