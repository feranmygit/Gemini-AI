import { useCallback, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, Dispatch, KeyboardEvent, SetStateAction } from 'react';
import { sendMessage, generateTitle, resetChat, generateImage, isImageRequest } from '../services/geminiService';
import { sendOllamaMessage } from '../services/ollamaService';
import { sendGroqMessage } from '../services/groqService';
import { sendOpenRouterMessage } from '../services/openrouterService';
import { chatStream, chatOnce, generateImageApi, generateTitleApi, ChatMessage } from '../services/apiService';
import { saveConversationCloud, saveMessageCloud, updateConversationTitleCloud } from '../services/storageService';
import { AppSettings, AttachedFile, Conversation, GeneratedImage, Message, User } from '../types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function createConversation(settings: AppSettings): Conversation {
  return {
    id: generateId(),
    title: 'New Conversation',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    model: settings.model,
    systemPrompt: settings.systemPrompt,
  };
}

function friendlyError(raw: string): string {
  if (/503|overloaded|unavailable|exception parsing/i.test(raw)) {
    return 'AI servers are overloaded. Please wait a moment, or switch provider in Settings.';
  }
  if (/429|rate.?limit|quota|too many/i.test(raw)) {
    return 'Rate limit reached. Please wait a minute, or switch to a different provider in Settings.';
  }
  if (/401|api.?key|authentication/i.test(raw)) {
    return 'Invalid API key. Check your key in Settings.';
  }
  if (/request too large|too many tokens|context.?length|maximum context/i.test(raw)) {
    return 'Message too long for this model. Try a shorter message or a larger-context model.';
  }
  return raw;
}

type UseChatEngineArgs = {
  user: User | null;
  settings: AppSettings;
  conversations: Conversation[];
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  activeId: string | null;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  activeConversation: Conversation | null;
  attachments: AttachedFile[];
  setAttachments: Dispatch<SetStateAction<AttachedFile[]>>;
  setIsSyncing: Dispatch<SetStateAction<boolean>>;
};

export function useChatEngine({
  user,
  settings,
  conversations,
  setConversations,
  activeId,
  setActiveId,
  activeConversation,
  attachments,
  setAttachments,
  setIsSyncing,
}: UseChatEngineArgs) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const apiKeyMissing = !import.meta.env.PROD && !import.meta.env.VITE_API_KEY;

  const handleSend = useCallback(async () => {
    const text = input.trim();
    const currentAttachments = Array.isArray(attachments) ? [...attachments] : [];
    if (!text && !currentAttachments.length) {
      return;
    }
    if (isLoading) {
      return;
    }

    if (settings.provider === 'gemini' && apiKeyMissing && !import.meta.env.PROD) {
      setError('Gemini API key missing. Add it to .env, or switch to Groq/OpenRouter in Settings.');
      return;
    }
    if (settings.provider === 'groq' && !settings.groqApiKey) {
      setError('Groq API key not set. Go to Settings and paste your key from console.groq.com.');
      return;
    }
    if (settings.provider === 'openrouter' && !settings.openrouterApiKey) {
      setError('OpenRouter API key not set. Go to Settings and paste your key from openrouter.ai.');
      return;
    }

    setInput('');
    setAttachments([]);
    setError(null);
    setRetrying(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    let conversationId = activeId;
    if (!conversationId) {
      const conversation = createConversation(settings);
      setConversations((previous) => [...previous, conversation]);
      setActiveId(conversation.id);
      conversationId = conversation.id;
      if (user) {
        setIsSyncing(true);
        saveConversationCloud(conversation, user.id).finally(() => setIsSyncing(false));
      }
    }

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      attachments: currentAttachments,
    };
    const assistantMsgId = generateId();
    const wantsImage = text.length > 0 && !currentAttachments.length && isImageRequest(text);
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: !wantsImage,
      isGeneratingImage: wantsImage,
    };

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, messages: [...conversation.messages, userMsg, assistantMsg], updatedAt: new Date() }
          : conversation,
      ),
    );

    if (user) {
      setIsSyncing(true);
      void saveMessageCloud(userMsg, conversationId).catch(console.error);
    }

    setIsLoading(true);
    const retryTimer = setTimeout(() => setRetrying(true), 1500);

    try {
      const isProd = import.meta.env.PROD === true;

      if (wantsImage) {
        clearTimeout(retryTimer);
        let images: GeneratedImage[] = [];

        try {
          images = isProd ? await generateImageApi(text) : await generateImage(text);
        } catch (imageError: unknown) {
          const raw = imageError instanceof Error ? imageError.message : '';
          const fallback = isProd
            ? await chatOnce(
                [{ role: 'user', content: `Image generation failed (${raw}). Apologize briefly.` }],
                settings.model,
                settings.systemPrompt,
                settings.temperature,
              )
            : await sendMessage(`Image generation failed (${raw}). Apologize briefly.`, settings, []);

          setConversations((previous) =>
            previous.map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    messages: conversation.messages.map((message) =>
                      message.id === assistantMsgId
                        ? { ...message, content: fallback, isStreaming: false, isGeneratingImage: false }
                        : message,
                    ),
                  }
                : conversation,
            ),
          );

          if (user) {
            const fallbackMsg: Message = {
              id: assistantMsgId,
              role: 'assistant',
              content: fallback,
              timestamp: new Date(),
            };
            saveMessageCloud(fallbackMsg, conversationId)
              .catch(console.error)
              .finally(() => setIsSyncing(false));
          }
          return;
        }

        setConversations((previous) =>
          previous.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  updatedAt: new Date(),
                  messages: conversation.messages.map((message) =>
                    message.id === assistantMsgId
                      ? {
                          ...message,
                          content: '',
                          isStreaming: false,
                          isGeneratingImage: false,
                          generatedImages: images,
                        }
                      : message,
                  ),
                }
              : conversation,
          ),
        );

        if (user) {
          const imageMessage: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            generatedImages: images,
          };
          saveMessageCloud(imageMessage, conversationId)
            .catch(console.error)
            .finally(() => setIsSyncing(false));
        }
      } else {
        let fullContent = '';
        const onChunk = (chunk: string) => {
          setRetrying(false);
          fullContent += chunk;
          const snapshot = fullContent;
          setConversations((previous) =>
            previous.map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    messages: conversation.messages.map((message) =>
                      message.id === assistantMsgId ? { ...message, content: snapshot, isStreaming: true } : message,
                    ),
                  }
                : conversation,
            ),
          );
        };

        const historyMessages = (activeConversation?.messages ?? []).slice(-20);
        const tokenLimits: Record<string, number> = {
          'llama-3.1-8b-instant': 4000,
          'llama-3.3-70b-versatile': 24000,
          'mixtral-8x7b-32768': 28000,
          'gemma2-9b-it': 6000,
        };
        const modelLimit = tokenLimits[settings.groqModel] ?? 12000;
        const estimateTokens = (value: string) => Math.ceil(value.length / 4);
        const allHistory = historyMessages
          .filter((message) => !message.isGeneratingImage && message.content)
          .map((message) => ({ role: message.role as 'user' | 'assistant', content: message.content }));
        let tokenBudget = modelLimit - estimateTokens(text) - estimateTokens(settings.systemPrompt || '');
        const trimmedHistory: typeof allHistory = [];
        for (let index = allHistory.length - 1; index >= 0; index--) {
          const tokens = estimateTokens(allHistory[index].content);
          if (tokenBudget - tokens < 500) {
            break;
          }
          trimmedHistory.unshift(allHistory[index]);
          tokenBudget -= tokens;
        }

        if (isProd && settings.provider === 'gemini') {
          const apiMessages: ChatMessage[] = [
            ...historyMessages
              .filter((message) => !message.isGeneratingImage && message.content)
              .map((message) => ({
                role: message.role as 'user' | 'assistant',
                content: message.content,
                attachments: message.attachments,
              })),
            { role: 'user', content: text, attachments: currentAttachments },
          ];
          if (settings.streaming) {
            await chatStream(apiMessages, settings.model, settings.systemPrompt, settings.temperature, onChunk);
          } else {
            fullContent = await chatOnce(apiMessages, settings.model, settings.systemPrompt, settings.temperature);
          }
        } else if (settings.provider === 'groq') {
          fullContent = await sendGroqMessage(
            text,
            settings,
            trimmedHistory,
            currentAttachments,
            settings.streaming ? onChunk : undefined,
          );
        } else if (settings.provider === 'openrouter') {
          fullContent = await sendOpenRouterMessage(
            text,
            settings,
            trimmedHistory,
            currentAttachments,
            settings.streaming ? onChunk : undefined,
          );
        } else if (settings.provider === 'ollama') {
          const ollamaHistory = historyMessages
            .filter((message) => !message.isGeneratingImage)
            .map((message) => ({ role: message.role as 'user' | 'assistant', content: message.content }));
          fullContent = await sendOllamaMessage(
            text,
            settings,
            ollamaHistory,
            currentAttachments,
            settings.streaming ? onChunk : undefined,
          );
        } else if (settings.streaming) {
          await sendMessage(text, settings, currentAttachments, onChunk);
        } else {
          fullContent = await sendMessage(text, settings, currentAttachments);
        }

        clearTimeout(retryTimer);
        setRetrying(false);

        setConversations((previous) =>
          previous.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  updatedAt: new Date(),
                  messages: conversation.messages.map((message) =>
                    message.id === assistantMsgId ? { ...message, content: fullContent, isStreaming: false } : message,
                  ),
                }
              : conversation,
          ),
        );

        if (user) {
          const assistantResponse: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: fullContent,
            timestamp: new Date(),
          };
          saveMessageCloud(assistantResponse, conversationId)
            .catch(console.error)
            .finally(() => setIsSyncing(false));
        }
      }

      const conversation = conversations.find((item) => item.id === conversationId);
      if (!conversation || conversation.messages.length === 0) {
        try {
          let title = '';
          const titlePrompt = `Generate a very short title (3-5 words max) for a conversation starting with: "${text.slice(0, 200)}". Return ONLY the title, no quotes, no punctuation at the end.`;
          if (isProd && settings.provider === 'gemini') {
            title = await generateTitleApi(text);
          } else if (settings.provider === 'groq') {
            title = await sendGroqMessage(titlePrompt, settings, [], null);
          } else if (settings.provider === 'openrouter') {
            title = await sendOpenRouterMessage(titlePrompt, settings, [], null);
          } else if (settings.provider !== 'ollama') {
            title = await generateTitle([userMsg]);
          }

          if (title.trim()) {
            setConversations((previous) =>
              previous.map((item) => (item.id === conversationId ? { ...item, title: title.trim() } : item)),
            );
            if (user) {
              void updateConversationTitleCloud(conversationId, title.trim()).catch(console.error);
            }
          }
        } catch {
          // ignore title errors
        }
      }
    } catch (caught: unknown) {
      clearTimeout(retryTimer);
      setRetrying(false);
      if (user) {
        setIsSyncing(false);
      }
      const raw = caught instanceof Error ? caught.message : 'An error occurred';
      setError(friendlyError(raw));
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, messages: conversation.messages.filter((message) => message.id !== assistantMsgId) }
            : conversation,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    input,
    attachments,
    isLoading,
    settings,
    apiKeyMissing,
    activeId,
    setAttachments,
    setConversations,
    setActiveId,
    user,
    setIsSyncing,
    activeConversation,
    conversations,
  ]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  const handleInputChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetRuntime = useCallback(() => {
    resetChat();
    setError(null);
    setRetrying(false);
  }, []);

  const messages = activeConversation?.messages || [];
  const showEmpty = messages.length === 0;
  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isLoading;

  const providerColors: Record<string, { bg: string; border: string; color: string }> = {
    gemini: { bg: 'rgba(124,107,255,0.12)', border: '1px solid rgba(124,107,255,0.2)', color: '#9a8fff' },
    groq: { bg: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fde68a' },
    openrouter: { bg: 'rgba(99,211,174,0.1)', border: '1px solid rgba(99,211,174,0.25)', color: '#6ee7b7' },
    ollama: { bg: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#86efac' },
  };

  const providerIcons: Record<string, string> = { gemini: '', groq: '', openrouter: '', ollama: '' };
  const providerColor = providerColors[settings.provider] || providerColors.gemini;

  const activeModelLabel = useMemo(() => {
    switch (settings.provider) {
      case 'groq':
        return settings.groqModel?.split('-').slice(0, 3).join('-') || 'groq';
      case 'openrouter': {
        const model = settings.openrouterModel || '';
        return model === 'openrouter/auto' ? 'auto' : model.split('/')[1]?.replace(':free', '') || 'openrouter';
      }
      case 'ollama':
        return settings.ollamaModel || 'no model';
      default:
        return settings.model.replace('gemini-', '').replace('-latest', '');
    }
  }, [settings]);

  const showKeyWarning =
    (settings.provider === 'gemini' && apiKeyMissing) ||
    (settings.provider === 'groq' && !settings.groqApiKey) ||
    (settings.provider === 'openrouter' && !settings.openrouterApiKey);

  const keyWarningMessages: Record<string, string> = {
    gemini: 'Gemini API key missing. Add to .env or switch to Groq/OpenRouter (free, no server needed).',
    groq: 'Groq API key not set. Go to Settings and paste your free key from console.groq.com.',
    openrouter: 'OpenRouter API key not set. Go to Settings and paste your free key from openrouter.ai.',
  };

  return {
    input,
    setInput,
    isLoading,
    retrying,
    error,
    clearError,
    showSettings,
    setShowSettings,
    sidebarOpen,
    setSidebarOpen,
    textareaRef,
    handleSend,
    handleKeyDown,
    handleInputChange,
    resetRuntime,
    messages,
    showEmpty,
    canSend,
    providerIcons,
    providerColor,
    activeModelLabel,
    showKeyWarning,
    keyWarningMessages,
  };
}
