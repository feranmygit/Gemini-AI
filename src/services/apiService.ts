/**
 * apiService.ts
 * All frontend API calls go through here.
 * In development  → talks to Vite dev server (Gemini called directly via geminiService)
 * In production   → talks to /api/* routes on your Express server (key stays on server)
 */

import { AttachedFile, GeneratedImage } from '../types';

// In dev, Vite proxies /api → localhost:3001. In prod, same origin.
const API = '';

const RETRYABLE = [503, 429, 500, 502, 504];

async function fetchWithRetry(url: string, options: RequestInit, retries = 4): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (!RETRYABLE.includes(res.status)) return res;
    if (i < retries - 1) await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000 + Math.random() * 300));
  }
  return fetch(url, options);
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: AttachedFile[];
}

export async function chatStream(
  messages: ChatMessage[],
  model: string,
  systemPrompt: string,
  temperature: number,
  onChunk: (text: string) => void
): Promise<string> {
  const res = await fetchWithRetry(`${API}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, systemPrompt, temperature, messages, stream: true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Server error ${res.status}`);
  }

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
      const payload = line.slice(6);
      if (payload === '[DONE]') break;
      try {
        const { text } = JSON.parse(payload);
        if (text) { full += text; onChunk(text); }
      } catch { /* skip */ }
    }
  }
  return full;
}

export async function chatOnce(
  messages: ChatMessage[],
  model: string,
  systemPrompt: string,
  temperature: number
): Promise<string> {
  const res = await fetchWithRetry(`${API}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, systemPrompt, temperature, messages, stream: false }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Server error ${res.status}`);
  }
  const data = await res.json();
  return data.text || '';
}

export async function generateImageApi(prompt: string): Promise<GeneratedImage[]> {
  const res = await fetchWithRetry(`${API}/api/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Server error ${res.status}`);
  }
  const data = await res.json();
  return (data.images ?? []).map((img: { base64: string; mimeType: string }) => ({
    base64: img.base64,
    mimeType: img.mimeType,
    prompt,
  }));
}

export async function generateTitleApi(firstMessage: string): Promise<string> {
  const res = await fetch(`${API}/api/title`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstMessage }),
  });
  if (!res.ok) return 'New Conversation';
  const data = await res.json();
  return data.title || 'New Conversation';
}
