import { AppSettings, AttachedFile } from '../types';

const OR_BASE = 'https://openrouter.ai/api/v1';

// Updated March 2026 — OpenRouter changes free models frequently.
// Check https://openrouter.ai/models?q=:free for the latest list.
export const OPENROUTER_FREE_MODELS = [
  { value: 'openrouter/auto',                              label: '✨ Auto (best available)',        desc: 'Picks the best free model automatically — recommended' },
  { value: 'meta-llama/llama-3.3-70b-instruct:free',      label: 'Llama 3.3 70B',                  desc: 'Meta — strong all-rounder · 128k context' },
  { value: 'meta-llama/llama-4-maverick:free',             label: 'Llama 4 Maverick',               desc: 'Meta latest — multimodal, very capable' },
  { value: 'meta-llama/llama-4-scout:free',                label: 'Llama 4 Scout',                  desc: 'Meta latest — fast & efficient' },
  { value: 'deepseek/deepseek-chat-v3-0324:free',          label: 'DeepSeek V3',                    desc: 'Excellent reasoning & coding' },
  { value: 'deepseek/deepseek-r1:free',                    label: 'DeepSeek R1',                    desc: 'Step-by-step reasoning model' },
  { value: 'google/gemini-2.0-flash-exp:free',             label: 'Gemini 2.0 Flash',               desc: 'Google — fast, multimodal' },
  { value: 'mistralai/mistral-small-3.1-24b-instruct:free',label: 'Mistral Small 3.1 24B',          desc: 'Mistral — balanced quality & speed' },
  { value: 'nvidia/llama-3.1-nemotron-nano-8b-v1:free',    label: 'Nemotron Nano 8B',               desc: 'NVIDIA — fast & efficient' },
];

export interface ORMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function sendOpenRouterMessage(
  content: string,
  settings: AppSettings,
  history: ORMessage[],
  attachments: AttachedFile[] | null | undefined,
  onChunk?: (text: string) => void
): Promise<string> {
  const apiKey = settings.openrouterApiKey;
  if (!apiKey) throw new Error('OpenRouter API key not set. Add it in Settings.');

  const files = Array.isArray(attachments) ? attachments : [];
  // OpenRouter free models don't support vision — just use text
  const userContent = files.length > 0 && content
    ? `${content}\n\n[Note: ${files.length} file(s) attached — vision not supported on free models]`
    : content;

  const messages: ORMessage[] = [
    { role: 'system', content: settings.systemPrompt || 'You are a helpful AI assistant.' },
    ...history,
    { role: 'user', content: userContent },
  ];

  const body = {
    model: settings.openrouterModel || 'meta-llama/llama-3.3-70b-instruct:free',
    messages,
    temperature: settings.temperature,
    stream: !!(onChunk),
  };

  const res = await fetch(`${OR_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Gemini AI Studio',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const msg = err?.error?.message || `OpenRouter error ${res.status}`;
    if (res.status === 401) throw new Error('Invalid OpenRouter API key. Check your key in Settings.');
    if (res.status === 429) throw new Error('OpenRouter rate limit reached. Wait a moment and try again.');
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
