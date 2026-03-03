import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import MessageBubble from './components/MessageBubble';
import SettingsPanel from './components/SettingsPanel';
import AuthModal from './components/AuthModal';
import SavePromptBanner from './components/SavePromptBanner';
import UserMenu from './components/UserMenu';
import { sendMessage, generateTitle, resetChat, generateImage, isImageRequest } from './services/geminiService';
import { sendOllamaMessage } from './services/ollamaService';
import { sendGroqMessage } from './services/groqService';
import { sendOpenRouterMessage } from './services/openrouterService';
import { chatStream, chatOnce, generateImageApi, generateTitleApi, ChatMessage } from './services/apiService';
import { getSession, signOut, onAuthStateChange, isSupabaseConfigured } from './services/authService';
import {
  loadLocalConversations, saveLocalConversations,
  loadCloudConversations, saveConversationCloud, saveMessageCloud,
  deleteConversationCloud, updateConversationTitleCloud, migrateLocalToCloud,
} from './services/storageService';
import { Message, Conversation, AppSettings, AppModel, AttachedFile, GeneratedImage, User, AuthMode, AuthState } from './types';

// ─── Settings persistence ─────────────────────────────────────────────────────
function loadSavedSettings(): Partial<AppSettings> {
  try { const s = localStorage.getItem('ai-studio-settings'); return s ? JSON.parse(s) : {}; }
  catch { return {}; }
}
const saved = loadSavedSettings();
const DEFAULT_SETTINGS: AppSettings = {
  model: AppModel.Flash,
  systemPrompt: 'You are a helpful, knowledgeable, and thoughtful AI assistant. Be concise yet thorough, and use markdown formatting when appropriate.',
  temperature: 1.0, streaming: true, provider: 'gemini',
  ollamaModel: saved.ollamaModel || 'llama3.2',
  groqApiKey: saved.groqApiKey || '',
  groqModel: saved.groqModel || 'llama-3.3-70b-versatile',
  openrouterApiKey: saved.openrouterApiKey || '',
  openrouterModel: saved.openrouterModel || 'openrouter/auto',
  ...(saved.provider ? { provider: saved.provider } : {}),
  ...(saved.model ? { model: saved.model } : {}),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateId(): string { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function createConversation(settings: AppSettings): Conversation {
  return { id: generateId(), title: 'New Conversation', messages: [], createdAt: new Date(), updatedAt: new Date(), model: settings.model, systemPrompt: settings.systemPrompt };
}

function friendlyError(raw: string): string {
  if (/503|overloaded|unavailable|exception parsing/i.test(raw)) return 'AI servers are overloaded. Please wait a moment, or switch provider in ⚙ Settings.';
  if (/429|rate.?limit|quota|too many/i.test(raw)) return 'Rate limit reached. Please wait a minute, or switch to a different provider in ⚙ Settings.';
  if (/401|api.?key|authentication/i.test(raw)) return 'Invalid API key. Check your key in ⚙ Settings.';
  if (/request too large|too many tokens|context.?length|maximum context/i.test(raw)) return 'Message too long for this model. Try Mixtral 8x7B in ⚙ Settings → Groq (32k tokens), or start a new conversation.';
  return raw;
}

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '';
  if (mimeType === 'application/pdf') return '';
  if (mimeType.startsWith('text/') || mimeType.includes('javascript') || mimeType.includes('json')) return '📝';
  return '';
}
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const ACCEPT = 'image/*,application/pdf,text/plain,text/csv,text/markdown,.py,.js,.ts,.tsx,.jsx,.json,.xml,.html,.css,.md,.csv';

// ─── Component ────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth state
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [migrationNote, setMigrationNote] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiKeyMissing = !import.meta.env.VITE_API_KEY;
  const activeConversation = conversations.find(c => c.id === activeId) || null;

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeConversation?.messages]);

  // ── Persist settings ──────────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem('ai-studio-settings', JSON.stringify(settings)); } catch { }
  }, [settings]);

  // ── Auth init + listener ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // No Supabase — load local conversations, run as guest
      setConversations(loadLocalConversations());
      setAuthState('guest');
      return;
    }

    // onAuthStateChange fires for BOTH normal sign-in AND OAuth redirects.
    // This is the single source of truth for auth state.
    const unsub = onAuthStateChange(async (changedUser) => {
      if (changedUser) {
        setUser(changedUser);
        setAuthState('authenticated');
        setShowAuth(false);
        setShowSavePrompt(false);

        // Clean up the URL after OAuth redirect (removes ?code=... from address bar)
        if (window.location.search || window.location.hash) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Migrate any local guest conversations to the cloud
        const count = await migrateLocalToCloud(changedUser.id);
        if (count > 0) setMigrationNote(`${count} guest conversation${count > 1 ? 's' : ''} saved to your account!`);

        // Load all cloud conversations
        const cloud = await loadCloudConversations(changedUser.id);
        setConversations(cloud);
      } else {
        setUser(null);
        setAuthState('guest');
        setConversations(loadLocalConversations());
      }
    });

    // Also check for an existing session on load (handles page refresh)
    getSession().then(async sessionUser => {
      if (sessionUser) {
        // Session already active — onAuthStateChange will fire, but set loading state now
        setUser(sessionUser);
        setAuthState('authenticated');
      } else {
        setConversations(loadLocalConversations());
        setAuthState('guest');
      }
    });

    return unsub;
  }, []);

  // ── Persist conversations for guests ─────────────────────────────────────
  useEffect(() => {
    if (authState === 'guest') saveLocalConversations(conversations);
  }, [conversations, authState]);

  // ── Show save-prompt after first completed conversation ───────────────────
  useEffect(() => {
    if (authState !== 'guest') return;
    const key = 'ai-studio-save-prompt-dismissed';
    if (localStorage.getItem(key)) return;
    const hasMessages = conversations.some(c => c.messages.length >= 2);
    if (hasMessages) setShowSavePrompt(true);
  }, [conversations, authState]);

  // ── Handlers: conversations ───────────────────────────────────────────────
  const handleNewConversation = useCallback(() => {
    const conv = createConversation(settings);
    setConversations(prev => [...prev, conv]);
    setActiveId(conv.id);
    resetChat();
    setError(null);
    setAttachments([]);
    if (user) {
      setIsSyncing(true);
      saveConversationCloud(conv, user.id).finally(() => setIsSyncing(false));
    }
  }, [settings, user]);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveId(id);
    resetChat();
    setError(null);
    setAttachments([]);
  }, []);

  const handleDeleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    setActiveId(prev => prev !== id ? prev : null);
    if (user) deleteConversationCloud(id);
  }, [user]);

  const handleSettingsUpdate = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    resetChat();
  }, []);

  // ── Handlers: auth ────────────────────────────────────────────────────────
  const openSignIn = useCallback(() => { setAuthMode('signin'); setShowAuth(true); }, []);
  const openSignUp = useCallback(() => { setAuthMode('signup'); setShowAuth(true); }, []);
  const handleSignOut = useCallback(async () => {
    await signOut();
    setUser(null);
    setAuthState('guest');
    setConversations([]);
    setActiveId(null);
  }, []);

  // ── File handling ─────────────────────────────────────────────────────────
  const readFilesAsBase64 = useCallback(async (fileList: File[]): Promise<AttachedFile[]> => {
    const results: AttachedFile[] = [];
    for (const file of fileList) {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(',')[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      results.push({ id: generateId(), name: file.name, mimeType: file.type || 'application/octet-stream', base64, size: file.size, previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null });
    }
    return results;
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const newAtt = await readFilesAsBase64(Array.from(e.target.files));
    setAttachments(prev => [...prev, ...newAtt]);
    e.target.value = '';
  }, [readFilesAsBase64]);

  const handleRemoveAttachment = useCallback((id: string) => setAttachments(prev => prev.filter(a => a.id !== id)), []);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const imgs = Array.from(e.clipboardData.items).filter(i => i.type.startsWith('image/'));
    if (!imgs.length) return;
    e.preventDefault();
    const files = imgs.map(i => i.getAsFile()).filter((f): f is File => f !== null);
    const newAtt = await readFilesAsBase64(files);
    setAttachments(prev => [...prev, ...newAtt]);
  }, [readFilesAsBase64]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    const newAtt = await readFilesAsBase64(files);
    setAttachments(prev => [...prev, ...newAtt]);
  }, [readFilesAsBase64]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    const currentAttachments = Array.isArray(attachments) ? [...attachments] : [];
    if (!text && !currentAttachments.length) return;
    if (isLoading) return;

    if (settings.provider === 'gemini' && apiKeyMissing) {
      setError('Gemini API key missing. Add it to .env, or switch to Groq/OpenRouter in ⚙ Settings — both are free.');
      return;
    }
    if (settings.provider === 'groq' && !settings.groqApiKey) {
      setError('Groq API key not set. Go to ⚙ Settings → Groq and paste your free key from console.groq.com.');
      return;
    }
    if (settings.provider === 'openrouter' && !settings.openrouterApiKey) {
      setError('OpenRouter API key not set. Go to ⚙ Settings → OpenRouter and paste your free key from openrouter.ai.');
      return;
    }

    setInput('');
    setAttachments([]);
    setError(null);
    setRetrying(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    let convId = activeId;
    if (!convId) {
      const conv = createConversation(settings);
      setConversations(prev => [...prev, conv]);
      setActiveId(conv.id);
      convId = conv.id;
      if (user) {
        setIsSyncing(true);
        saveConversationCloud(conv, user.id).finally(() => setIsSyncing(false));
      }
    }

    const userMsg: Message = { id: generateId(), role: 'user', content: text, timestamp: new Date(), attachments: currentAttachments };
    const assistantMsgId = generateId();
    const wantsImage = text.length > 0 && !currentAttachments.length && isImageRequest(text);
    const assistantMsg: Message = { id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date(), isStreaming: !wantsImage, isGeneratingImage: wantsImage };

    setConversations(prev => prev.map(c =>
      c.id === convId ? { ...c, messages: [...c.messages, userMsg, assistantMsg], updatedAt: new Date() } : c
    ));

    // Save user message to cloud
    if (user) {
      setIsSyncing(true);
      saveMessageCloud(userMsg, convId!).catch(console.error);
    }

    setIsLoading(true);
    const retryTimer = setTimeout(() => setRetrying(true), 1500);

    try {
      const isProd = import.meta.env.PROD === true;

      // ── IMAGE PATH ────────────────────────────────────────────────────────
      if (wantsImage) {
        clearTimeout(retryTimer);
        let images: GeneratedImage[] = [];
        try {
          images = isProd ? await generateImageApi(text) : await generateImage(text);
        } catch (imgErr: unknown) {
          const raw = imgErr instanceof Error ? imgErr.message : '';
          const fallback = isProd
            ? await chatOnce([{ role: 'user', content: `Image generation failed (${raw}). Apologise briefly.` }], settings.model, settings.systemPrompt, settings.temperature)
            : await sendMessage(`Image generation failed (${raw}). Apologise briefly.`, settings, []);
          setConversations(prev => prev.map(c =>
            c.id === convId ? { ...c, messages: c.messages.map(m => m.id === assistantMsgId ? { ...m, content: fallback, isStreaming: false, isGeneratingImage: false } : m) } : c
          ));
          if (user) {
            const fallbackMsg: Message = { id: assistantMsgId, role: 'assistant', content: fallback, timestamp: new Date() };
            saveMessageCloud(fallbackMsg, convId!).catch(console.error).finally(() => setIsSyncing(false));
          }
          return;
        }
        setConversations(prev => prev.map(c =>
          c.id === convId ? {
            ...c, updatedAt: new Date(),
            messages: c.messages.map(m => m.id === assistantMsgId ? { ...m, content: '', isStreaming: false, isGeneratingImage: false, generatedImages: images } : m),
          } : c
        ));
        if (user) {
          const imgMsg: Message = { id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date(), generatedImages: images };
          saveMessageCloud(imgMsg, convId!).catch(console.error).finally(() => setIsSyncing(false));
        }

      // ── TEXT PATH ─────────────────────────────────────────────────────────
      } else {
        let fullContent = '';
        const onChunk = (chunk: string) => {
          setRetrying(false);
          fullContent += chunk;
          const cap = fullContent;
          setConversations(prev => prev.map(c =>
            c.id === convId ? { ...c, messages: c.messages.map(m => m.id === assistantMsgId ? { ...m, content: cap, isStreaming: true } : m) } : c
          ));
        };

        const historyMsgs = (activeConversation?.messages ?? []).slice(-20);
        const TOKEN_LIMITS: Record<string, number> = { 'llama-3.1-8b-instant': 4000, 'llama-3.3-70b-versatile': 24000, 'mixtral-8x7b-32768': 28000, 'gemma2-9b-it': 6000 };
        const modelLimit = TOKEN_LIMITS[settings.groqModel] ?? 12000;
        const estimateTokens = (s: string) => Math.ceil(s.length / 4);
        const allHistory = historyMsgs.filter(m => !m.isGeneratingImage && m.content).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
        let tokenBudget = modelLimit - estimateTokens(text) - estimateTokens(settings.systemPrompt || '');
        const trimmedHistory: typeof allHistory = [];
        for (let i = allHistory.length - 1; i >= 0; i--) {
          const tokens = estimateTokens(allHistory[i].content);
          if (tokenBudget - tokens < 500) break;
          trimmedHistory.unshift(allHistory[i]);
          tokenBudget -= tokens;
        }
        const chatHistory = trimmedHistory;

        if (isProd && settings.provider === 'gemini') {
          const apiMessages: ChatMessage[] = [
            ...historyMsgs.filter(m => !m.isGeneratingImage && m.content).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content, attachments: m.attachments })),
            { role: 'user', content: text, attachments: currentAttachments },
          ];
          if (settings.streaming) await chatStream(apiMessages, settings.model, settings.systemPrompt, settings.temperature, onChunk);
          else fullContent = await chatOnce(apiMessages, settings.model, settings.systemPrompt, settings.temperature);
        } else if (settings.provider === 'groq') {
          fullContent = await sendGroqMessage(text, settings, chatHistory, currentAttachments, settings.streaming ? onChunk : undefined);
        } else if (settings.provider === 'openrouter') {
          fullContent = await sendOpenRouterMessage(text, settings, chatHistory, currentAttachments, settings.streaming ? onChunk : undefined);
        } else if (settings.provider === 'ollama') {
          const ollamaHistory = historyMsgs.filter(m => !m.isGeneratingImage).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
          fullContent = await sendOllamaMessage(text, settings, ollamaHistory, currentAttachments, settings.streaming ? onChunk : undefined);
        } else {
          if (settings.streaming) await sendMessage(text, settings, currentAttachments, onChunk);
          else fullContent = await sendMessage(text, settings, currentAttachments);
        }

        clearTimeout(retryTimer);
        setRetrying(false);

        setConversations(prev => prev.map(c =>
          c.id === convId ? { ...c, updatedAt: new Date(), messages: c.messages.map(m => m.id === assistantMsgId ? { ...m, content: fullContent, isStreaming: false } : m) } : c
        ));

        // Save assistant message to cloud
        if (user) {
          const aMsg: Message = { id: assistantMsgId, role: 'assistant', content: fullContent, timestamp: new Date() };
          saveMessageCloud(aMsg, convId!).catch(console.error).finally(() => setIsSyncing(false));
        }
      }

      // ── Auto title ────────────────────────────────────────────────────────
      const conv = conversations.find(c => c.id === convId);
      if (!conv || conv.messages.length === 0) {
        try {
          let title = '';
          const titlePrompt = `Generate a very short title (3-5 words max) for a conversation starting with: "${text.slice(0, 200)}". Return ONLY the title, no quotes, no punctuation at the end.`;
          if (isProd && settings.provider === 'gemini') title = await generateTitleApi(text);
          else if (settings.provider === 'groq') title = await sendGroqMessage(titlePrompt, settings, [], null);
          else if (settings.provider === 'openrouter') title = await sendOpenRouterMessage(titlePrompt, settings, [], null);
          else if (settings.provider !== 'ollama') title = await generateTitle([userMsg]);
          if (title.trim()) {
            setConversations(prev => prev.map(c => c.id === convId ? { ...c, title: title.trim() } : c));
            if (user) updateConversationTitleCloud(convId!, title.trim()).catch(console.error);
          }
        } catch { /* ignore title errors */ }
      }

    } catch (err: unknown) {
      clearTimeout(retryTimer);
      setRetrying(false);
      if (user) setIsSyncing(false);
      const raw = err instanceof Error ? err.message : 'An error occurred';
      setError(friendlyError(raw));
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, messages: c.messages.filter(m => m.id !== assistantMsgId) } : c
      ));
    } finally {
      setIsLoading(false);
    }
  }, [input, attachments, isLoading, activeId, settings, conversations, apiKeyMissing, activeConversation, user]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const t = e.target;
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 180) + 'px';
  };

  const messages = activeConversation?.messages || [];
  const showEmpty = messages.length === 0;
  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isLoading;

  const providerColors: Record<string, { bg: string; border: string; color: string }> = {
    gemini:     { bg: 'rgba(124,107,255,0.12)', border: '1px solid rgba(124,107,255,0.2)',  color: '#9a8fff' },
    groq:       { bg: 'rgba(251,191,36,0.1)',   border: '1px solid rgba(251,191,36,0.25)', color: '#fde68a' },
    openrouter: { bg: 'rgba(99,211,174,0.1)',   border: '1px solid rgba(99,211,174,0.25)', color: '#6ee7b7' },
    ollama:     { bg: 'rgba(74,222,128,0.1)',   border: '1px solid rgba(74,222,128,0.25)', color: '#86efac' },
  };
  const providerIcons: Record<string, string> = { gemini: '', groq: '', openrouter: '', ollama: '' };
  const pc = providerColors[settings.provider] || providerColors.gemini;
  const activeModelLabel = () => {
    switch (settings.provider) {
      case 'groq':       return settings.groqModel?.split('-').slice(0,3).join('-') || 'groq';
      case 'openrouter': { const m = settings.openrouterModel || ''; return m === 'openrouter/auto' ? 'auto' : (m.split('/')[1]?.replace(':free','') || 'openrouter'); }
      case 'ollama':     return settings.ollamaModel || 'no model';
      default:           return settings.model.replace('gemini-','').replace('-latest','');
    }
  };

  const showKeyWarning = (settings.provider === 'gemini' && apiKeyMissing) || (settings.provider === 'groq' && !settings.groqApiKey) || (settings.provider === 'openrouter' && !settings.openrouterApiKey);
  const keyWarningMsg: Record<string, string> = {
    gemini:     'Gemini API key missing. Add to .env — or switch to Groq/OpenRouter (free, no server needed).',
    groq:       'Groq API key not set. Go to ⚙ Settings → Groq and paste your free key from console.groq.com.',
    openrouter: 'OpenRouter API key not set. Go to ⚙ Settings → OpenRouter and paste your free key from openrouter.ai.',
  };

  return (
    <div className="app-shell">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
        onDelete={handleDeleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        authState={authState}
        onSignIn={openSignIn}
        onSignUp={openSignUp}
        onSignOut={handleSignOut}
        isSyncing={isSyncing}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginLeft: 0 }} className="main-content">
        {/* Top bar */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', borderBottom: '1px solid rgba(120,100,255,0.08)',
          background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(12px)', flexShrink: 0, gap: 12,
        }}>
          <div className='hidden md:block' style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className='block md:hidden' onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, padding: 4 }}>☰</button>
            <span className='hidden md:block' style={{ fontSize: 13, color: '#555', fontFamily: "'DM Mono', monospace" }}>
              {activeConversation?.title || 'start a conversation'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Provider badge */}
            <div style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: pc.bg, border: pc.border, color: pc.color, fontFamily: "'DM Mono', monospace", display: 'flex', alignItems: 'center', gap: 5 }}>
              {providerIcons[settings.provider]} {activeModelLabel()}
            </div>
            {/* Settings */}
            <button onClick={() => setShowSettings(true)} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, color: '#777', cursor: 'pointer', padding: '6px 12px', fontSize: 13, transition: 'all 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            >Settings</button>
            {/* >⚙ Settings</button> */}
            {/* User menu (authenticated) or Sign in button (guest) */}
            {authState === 'authenticated' && user
              ? <UserMenu user={user} onSignOut={handleSignOut} onShowAuth={openSignIn} />
              : authState === 'guest' && isSupabaseConfigured && (
                <button onClick={openSignIn} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                  background: 'rgba(124,107,255,0.1)', border: '1px solid rgba(124,107,255,0.25)',
                  color: '#9a8fff', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,107,255,0.2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(124,107,255,0.1)')}
                >Sign in</button>
              )
            }
          </div>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>

          {/* Migration note */}
          {migrationNote && (
            <div style={{
              margin: '0 auto 20px', maxWidth: 700, padding: '12px 18px',
              background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
              borderRadius: 12, fontSize: 13, color: '#86efac', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span> {migrationNote}</span>
              <button onClick={() => setMigrationNote(null)} style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
          )}

          {/* Key warning */}
          {showKeyWarning && (
            <div style={{
              margin: '0 auto 20px', maxWidth: 700, padding: '14px 18px',
              background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)',
              borderRadius: 14, fontSize: 13, color: '#ff9a9a', lineHeight: 1.6,
            }}>
              <strong>⚠ API Key Missing</strong><br />{keyWarningMsg[settings.provider]}
            </div>
          )}

          {/* Empty state */}
          {showEmpty && !showKeyWarning && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#7c6bff22,#b06bff22)', border: '1px solid rgba(124,107,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 8 }}>✦</div>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: '#c4c0d8', fontWeight: 400 }}>What can I help you with?</h1>
              <p style={{ color: '#444', fontSize: 14, maxWidth: 380 }}>Ask anything, upload images or files, and explore ideas together.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 520, marginTop: 8 }}>
                {['Explain quantum entanglement simply',
                'Write a Python web scraper',
                'Draft a professional email',
                'Review my code for bugs'].map(s => (
                  <button key={s} onClick={() => { setInput(s); textareaRef.current?.focus(); }} style={{
                    padding: '8px 14px', borderRadius: 20,
                    background: 'rgba(124,107,255,0.08)', border: '1px solid rgba(124,107,255,0.2)',
                    color: '#9a8fff', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,107,255,0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(124,107,255,0.08)')}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
          </div>

          {retrying && (
            <div style={{ maxWidth: 760, margin: '16px auto 0', padding: '10px 16px', background: 'rgba(124,107,255,0.08)', border: '1px solid rgba(124,107,255,0.2)', borderRadius: 12, fontSize: 13, color: '#9a8fff', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(124,107,255,0.3)', borderTopColor: '#7c6bff', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
              Server busy — retrying automatically…
            </div>
          )}

          {error && (
            <div style={{ maxWidth: 760, margin: '16px auto 0', padding: '12px 16px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 12, fontSize: 13, color: '#ff9a9a' }}>
              ⚠ {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid rgba(120,100,255,0.08)', background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(124,107,255,0.25)', borderRadius: 18, transition: 'border-color 0.2s', overflow: 'hidden' }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(124,107,255,0.55)')}
              onBlurCapture={e => (e.currentTarget.style.borderColor = 'rgba(124,107,255,0.25)')}
            >
              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 14px 0 14px' }}>
                  {attachments.map(file => (
                    <div key={file.id} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 28px 5px 8px', background: 'rgba(124,107,255,0.12)', border: '1px solid rgba(124,107,255,0.25)', borderRadius: 10, maxWidth: 200 }}>
                      {file.previewUrl ? <img src={file.previewUrl} alt={file.name} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} /> : <span style={{ fontSize: 18, flexShrink: 0 }}>{fileIcon(file.mimeType)}</span>}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: '#c4b8ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                        <div style={{ fontSize: 10, color: '#666' }}>{formatSize(file.size)}</div>
                      </div>
                      <button onClick={() => handleRemoveAttachment(file.id)} style={{ position: 'absolute', top: 4, right: 6, background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ff6b6b')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#666')}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-end', padding: '10px 10px 10px 14px', gap: 8 }}>
                <textarea ref={textareaRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown} onPaste={handlePaste}
                  placeholder={attachments.length > 0 ? 'Add a message… (optional)' : `Message ${providerIcons[settings.provider]} ${activeModelLabel()}…`}
                  rows={1} disabled={isLoading}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#ddd9f0', fontSize: 14, fontFamily: "'DM Sans', sans-serif", resize: 'none', lineHeight: 1.65, maxHeight: 180, overflowY: 'auto', paddingTop: 2, alignSelf: 'center' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button type="button" title="Attach file" onClick={() => fileInputRef.current?.click()} style={{ width: 34, height: 34, borderRadius: 9, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                    onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(124,107,255,0.12)'; b.style.borderColor = 'rgba(124,107,255,0.35)'; b.style.color = '#a89fff'; }}
                    onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'transparent'; b.style.borderColor = 'rgba(255,255,255,0.1)'; b.style.color = '#666'; }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  </button>
                  <button onClick={handleSend} disabled={!canSend} style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: canSend ? 'linear-gradient(135deg,#7c6bff,#b06bff)' : 'rgba(124,107,255,0.15)', color: canSend ? '#fff' : '#444', cursor: canSend ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: canSend ? '0 2px 12px rgba(124,107,255,0.45)' : 'none' }}>
                    {isLoading
                      ? <div style={{ width: 14, height: 14, border: '2px solid #555', borderTopColor: '#9a8fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                    }
                  </button>
                </div>
              </div>
            </div>
            <input ref={fileInputRef} type="file" multiple accept={ACCEPT} style={{ display: 'none' }} onChange={handleFileInput} />
            <p style={{ textAlign: 'center', fontSize: 11, color: '#2e2e3a', marginTop: 8 }}>Enter to send · Shift+Enter for new line · paste or drop files to attach</p>
          </div>
        </div>
      </div>

      {/* Modals & overlays */}
      {showSettings && <SettingsPanel settings={settings} onUpdate={handleSettingsUpdate} onClose={() => setShowSettings(false)} />}
      {showAuth && <AuthModal initialMode={authMode} onSuccess={() => setShowAuth(false)} onClose={() => setShowAuth(false)} />}
      {showSavePrompt && authState === 'guest' && isSupabaseConfigured && (
        <SavePromptBanner
          onSignUp={() => { setShowSavePrompt(false); openSignUp(); }}
          onSignIn={() => { setShowSavePrompt(false); openSignIn(); }}
          onDismiss={() => { setShowSavePrompt(false); localStorage.setItem('ai-studio-save-prompt-dismissed', '1'); }}
        />
      )}

      <style>{`
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .markdown-content { color: #ddd9f0; }
        .markdown-content p { margin-bottom: 12px; line-height: 1.7; }
        .markdown-content p:last-child { margin-bottom: 0; }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 { font-family: 'DM Serif Display', serif; font-weight: 400; margin-top: 16px; margin-bottom: 8px; color: #e8e6f0; }
        .markdown-content h1 { font-size: 22px; } .markdown-content h2 { font-size: 18px; } .markdown-content h3 { font-size: 15px; }
        .markdown-content code { font-family: 'DM Mono', monospace; font-size: 12.5px; background: rgba(124,107,255,0.1); border: 1px solid rgba(124,107,255,0.15); padding: 1px 6px; border-radius: 5px; color: #c4b8ff; }
        .markdown-content pre code { background: none; border: none; padding: 0; color: #b8d4ff; font-size: 13px; line-height: 1.6; }
        .markdown-content ul, .markdown-content ol { padding-left: 20px; margin-bottom: 12px; }
        .markdown-content li { margin-bottom: 4px; line-height: 1.7; }
        .markdown-content blockquote { border-left: 3px solid rgba(124,107,255,0.4); padding-left: 14px; color: #9a94b0; margin: 12px 0; font-style: italic; }
        .markdown-content table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
        .markdown-content th { background: rgba(124,107,255,0.12); padding: 8px 12px; text-align: left; border: 1px solid rgba(124,107,255,0.15); color: #c4b8ff; }
        .markdown-content td { padding: 8px 12px; border: 1px solid rgba(255,255,255,0.06); }
        .markdown-content a { color: #9a8fff; text-decoration: underline; }
        .markdown-content strong { color: #e8e6f0; font-weight: 600; }
        .markdown-content hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 16px 0; }
      
      .markdown-content pre {
  position: relative;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: pre;
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  padding: 16px;
  box-sizing: border-box;
}

.markdown-content {
  max-width: 100%;
  overflow-wrap: break-word;
}

.markdown-content code {
  word-break: normal;
}

      `}</style>
    </div>
  );
};

export default App;
