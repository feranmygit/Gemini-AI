export interface AttachedFile {
  id: string;
  name: string;
  mimeType: string;
  base64: string;
  size: number;
  previewUrl: string | null;
}

export interface GeneratedImage {
  base64: string;
  mimeType: string;
  prompt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  attachments?: AttachedFile[];
  generatedImages?: GeneratedImage[];
  isGeneratingImage?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  model: string;
  systemPrompt: string;
}

export type Provider = 'gemini' | 'groq' | 'openrouter' | 'ollama';

export interface AppSettings {
  model: string;
  systemPrompt: string;
  temperature: number;
  streaming: boolean;
  provider: Provider;
  // Ollama
  ollamaModel: string;
  // Groq
  groqApiKey: string;
  groqModel: string;
  // OpenRouter
  openrouterApiKey: string;
  openrouterModel: string;
}

export enum AppModel {
  Flash = 'gemini-2.5-flash',
  Pro = 'gemini-2.5-pro',
  FlashLite = 'gemini-flash-lite-latest',
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export type AuthMode = 'signin' | 'signup';
export type AuthState = 'loading' | 'guest' | 'authenticated';
