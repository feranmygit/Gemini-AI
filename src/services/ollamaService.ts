import { AppSettings, AttachedFile } from '../types';

export const OLLAMA_BASE = 'http://localhost:11434';

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

export async function getOllamaModels(): Promise<OllamaModel[]> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.models ?? [];
  } catch {
    return [];
  }
}

export async function isOllamaRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

interface OllamaChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export async function sendOllamaMessage(
  content: string,
  settings: AppSettings,
  history: OllamaChatMessage[],
  attachments: AttachedFile[] | null | undefined,
  onChunk?: (text: string) => void
): Promise<string> {
  const files = Array.isArray(attachments) ? attachments : [];

  // Build the user message — include images as base64 if present
  const userMessage: OllamaChatMessage = files.length > 0
    ? {
        role: 'user',
        content: [
          ...files
            .filter(f => f.mimeType.startsWith('image/'))
            .map(f => ({ type: 'image_url', image_url: { url: `data:${f.mimeType};base64,${f.base64}` } })),
          { type: 'text', text: content },
        ],
      }
    : { role: 'user', content };

  const messages: OllamaChatMessage[] = [
    { role: 'system', content: settings.systemPrompt || 'You are a helpful AI assistant.' },
    ...history,
    userMessage,
  ];

  const body = {
    model: (settings.ollamaModel || 'llama3.2').replace('ollama:', ''),
    messages,
    stream: !!(settings.streaming && onChunk),
    options: { temperature: settings.temperature },
  };

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama error ${res.status}: ${err}`);
  }

  if (settings.streaming && onChunk) {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          const chunk = json.message?.content || '';
          if (chunk) {
            fullText += chunk;
            onChunk(chunk);
          }
        } catch { /* skip malformed lines */ }
      }
    }
    return fullText;
  } else {
    const data = await res.json();
    return data.message?.content || '';
  }
}
