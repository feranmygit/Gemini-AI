import { GoogleGenAI, Chat, Modality } from '@google/genai';
import { Message, AppSettings, AttachedFile, GeneratedImage } from '../types';

let chatInstance: Chat | null = null;
let currentSettings: AppSettings | null = null;

function getAI(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export function createNewChat(settings: AppSettings): void {
  const ai = getAI();
  currentSettings = settings;
  chatInstance = ai.chats.create({
    model: settings.model,
    config: {
      systemInstruction: settings.systemPrompt || 'You are a helpful, knowledgeable, and thoughtful AI assistant.',
      temperature: settings.temperature,
    },
  });
}

const RETRYABLE_CODES = [503, 429, 500, 502, 504];
const MAX_RETRIES = 4;

function isRetryable(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (/got status:\s*(503|429|500|502|504)/.test(msg)) return true;
    if (/overloaded|unavailable|rate.?limit|quota|too many/i.test(msg)) return true;
    const codeMatch = msg.match(/"code"\s*:\s*(\d+)/);
    if (codeMatch && RETRYABLE_CODES.includes(Number(codeMatch[1]))) return true;
  }
  return false;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err)) throw err;
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 300;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// Detect if user is asking for image generation
export function isImageRequest(text: string): boolean {
  return /\b(generate|create|draw|make|paint|design|sketch|render|produce|show me|give me)\b.{0,60}\b(image|picture|photo|illustration|artwork|drawing|painting|visual|poster|logo|icon|banner)\b/i.test(text)
    || /\b(image|picture|photo|illustration|artwork|drawing|painting)\b.{0,40}\b(of|showing|depicting|with|featuring)\b/i.test(text);
}

// Extract a clean image prompt from the user message
function extractImagePrompt(text: string): string {
  // Remove conversational wrappers and keep the descriptive part
  return text
    .replace(/^(please\s+)?(can you\s+)?(generate|create|draw|make|paint|design|sketch|render|produce|show me|give me)\s+(a|an|the|me\s+a|me\s+an)?\s*/i, '')
    .replace(/^(image|picture|photo|illustration|artwork|drawing|painting)\s+of\s+/i, '')
    .trim() || text;
}

export async function generateImage(prompt: string): Promise<GeneratedImage[]> {
  const ai = getAI();
  const cleanPrompt = extractImagePrompt(prompt);

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: cleanPrompt }] },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    })
  );

  const images: GeneratedImage[] = [];
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      images.push({
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png',
        prompt: cleanPrompt,
      });
    }
  }
  return images;
}

function buildParts(text: string, files: AttachedFile[]) {
  const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    parts.push({ inlineData: { mimeType: file.mimeType, data: file.base64 } });
  }
  if (text && text.trim().length > 0) {
    parts.push({ text });
  }
  return parts;
}

export async function sendMessage(
  content: string,
  settings: AppSettings,
  attachments: AttachedFile[] | null | undefined,
  onChunk?: (text: string) => void
): Promise<string> {
  const files: AttachedFile[] = Array.isArray(attachments) ? attachments : [];
  const hasFiles = files.length > 0;

  if (hasFiles) {
    const ai = getAI();
    const parts = buildParts(content, files);

    if (settings.streaming && onChunk) {
      return withRetry(async () => {
        let fullText = '';
        const stream = await ai.models.generateContentStream({
          model: settings.model,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contents: { parts: parts as any },
          config: { systemInstruction: settings.systemPrompt, temperature: settings.temperature },
        });
        for await (const chunk of stream) {
          const t = chunk.text || '';
          fullText += t;
          onChunk(t);
        }
        return fullText;
      });
    } else {
      return withRetry(async () => {
        const response = await ai.models.generateContent({
          model: settings.model,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contents: { parts: parts as any },
          config: { systemInstruction: settings.systemPrompt, temperature: settings.temperature },
        });
        return response.text || '';
      });
    }
  }

  if (!chatInstance || currentSettings?.model !== settings.model || currentSettings?.systemPrompt !== settings.systemPrompt) {
    createNewChat(settings);
  }
  if (!chatInstance) throw new Error('Chat not initialized');

  if (settings.streaming && onChunk) {
    return withRetry(async () => {
      let fullText = '';
      const stream = await chatInstance!.sendMessageStream({ message: content });
      for await (const chunk of stream) {
        const t = chunk.text || '';
        fullText += t;
        onChunk(t);
      }
      return fullText;
    });
  } else {
    return withRetry(async () => {
      const response = await chatInstance!.sendMessage({ message: content });
      return response.text || '';
    });
  }
}

export async function generateTitle(messages: Message[]): Promise<string> {
  const ai = getAI();
  const firstUserMsg = messages.find(m => m.role === 'user')?.content || '';
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a very short title (3-5 words max) for a conversation that starts with: "${firstUserMsg.slice(0, 200)}". Return only the title, no quotes, no punctuation at the end.`,
      config: {
        temperature: 0.2,
      },
    })
  );
  return response.text?.trim() || 'New Conversation';
}

export function resetChat(): void {
  chatInstance = null;
  currentSettings = null;
}