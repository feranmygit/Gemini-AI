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

export interface AppSettings {
  model: string;
  systemPrompt: string;
  temperature: number;
  streaming: boolean;
}

export enum AppModel {
  Flash = 'gemini-2.5-flash',
  Pro = 'gemini-2.5-pro',
  FlashLite = 'gemini-flash-lite-latest',
}