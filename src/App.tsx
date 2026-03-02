import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import MessageBubble from './components/MessageBubble';
import SettingsPanel from './components/SettingsPanel';
import { sendMessage, generateTitle, resetChat, generateImage, isImageRequest } from './services/geminiService';
import { Message, Conversation, AppSettings, AppModel, AttachedFile, GeneratedImage } from './types';

const DEFAULT_SETTINGS: AppSettings = {
  model: AppModel.Flash,
  systemPrompt: 'You are a helpful, knowledgeable, and thoughtful AI assistant. Be concise yet thorough, and use markdown formatting when appropriate.',
  temperature: 1.0,
  streaming: true,
};

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
  if (/503|overloaded|unavailable|exception parsing/i.test(raw))
    return 'Gemini servers are overloaded. Retried 4 times — please wait a moment and try again or change to different model in settings.';
  if (/429|rate.?limit|quota|too many/i.test(raw))
    return 'Rate limit reached. Please wait a minute before sending another message.';
  if (/401|api.?key|authentication/i.test(raw))
    return 'Invalid API key. Please check your GEMINI_API_KEY in the .env file.';
  return raw;
}

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.startsWith('text/') || mimeType.includes('javascript') || mimeType.includes('json')) return '📝';
  return '📎';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const ACCEPT = 'image/*,application/pdf,text/plain,text/csv,text/markdown,.py,.js,.ts,.tsx,.jsx,.json,.xml,.html,.css,.md,.csv';

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
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiKeyMissing = !process.env.API_KEY;

  const activeConversation =
    conversations.find(c => c.id === activeId) || null;

  /* ===============================
     RESPONSIVE SIDEBAR CONTROL
  =============================== */

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);

      if (desktop) {
        setSidebarOpen(true);   // Always visible on desktop
      } else {
        setSidebarOpen(false);  // Hidden on mobile initially
      }
    };

    handleResize(); // run on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* ===============================
     YOUR EXISTING LOGIC CONTINUES
  =============================== */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  /* Keep ALL your existing handlers here unchanged */
  /* handleNewConversation, handleSend, etc remain exactly same */



  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const handleNewConversation = useCallback(() => {
    const conv = createConversation(settings);
    setConversations(prev => [...prev, conv]);
    setActiveId(conv.id);
    resetChat();
    setError(null);
    setAttachments([]);
  }, [settings]);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveId(id);
    resetChat();
    setError(null);
    setAttachments([]);
  }, []);

  const handleDeleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    setActiveId(prev => prev !== id ? prev : null);
  }, []);

  const handleSettingsUpdate = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    resetChat();
  }, []);

  const readFilesAsBase64 = useCallback(async (fileList: File[]): Promise<AttachedFile[]> => {
    const results: AttachedFile[] = [];
    for (const file of fileList) {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      results.push({
        id: generateId(),
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64,
        size: file.size,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      });
    }
    return results;
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    const newAttachments = await readFilesAsBase64(files);
    setAttachments(prev => [...prev, ...newAttachments]);
    // Reset input so same file can be picked again
    e.target.value = '';
  }, [readFilesAsBase64]);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(i => i.type.startsWith('image/'));
    if (imageItems.length === 0) return;
    e.preventDefault();
    const files = imageItems.map(i => i.getAsFile()).filter((f): f is File => f !== null);
    const newAttachments = await readFilesAsBase64(files);
    setAttachments(prev => [...prev, ...newAttachments]);
  }, [readFilesAsBase64]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    const newAttachments = await readFilesAsBase64(files);
    setAttachments(prev => [...prev, ...newAttachments]);
  }, [readFilesAsBase64]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    const currentAttachments = Array.isArray(attachments) ? [...attachments] : [];
    if (!text && currentAttachments.length === 0) return;
    if (isLoading) return;
    if (apiKeyMissing) {
      setError('GEMINI_API_KEY is not set. Please add it to your .env file.');
      return;
    }

    setInput('');
    setAttachments([]);
    setError(null);
    setRetrying(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    let convId = activeId;
    if (!convId) {
      const conv = createConversation(settings);
      setConversations(prev => [...prev, conv]);
      setActiveId(conv.id);
      convId = conv.id;
    }

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      attachments: currentAttachments,
    };

    const assistantMsgId = generateId();
    const wantsImage = text.length > 0 && currentAttachments.length === 0 && isImageRequest(text);

    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: !wantsImage,
      isGeneratingImage: wantsImage,
    };

    setConversations(prev => prev.map(c =>
      c.id === convId
        ? { ...c, messages: [...c.messages, userMsg, assistantMsg], updatedAt: new Date() }
        : c
    ));

    setIsLoading(true);
    const retryTimer = setTimeout(() => setRetrying(true), 1500);

    try {
      // ── IMAGE GENERATION PATH ──
      if (wantsImage) {
        clearTimeout(retryTimer);
        let images: GeneratedImage[] = [];
        let generationError: string | null = null; // To store specific image generation error

        try {
          images = await generateImage(text);
        } catch (imgErr: unknown) {
          const raw = imgErr instanceof Error ? imgErr.message : 'Unknown image generation error.';
          generationError = friendlyError(raw);
          setError(generationError); // Display the generation error to the user

          // Update the assistant message to reflect the error
          setConversations(prev => prev.map(c =>
            c.id === convId
              ? { ...c, messages: c.messages.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, content: `Image generation failed: ${generationError}. Please try again later or ask me to generate text.`, isStreaming: false, isGeneratingImage: false }
                    : m
                )}
              : c
          ));
          setIsLoading(false); // Ensure loading state is reset
          setRetrying(false);
          return; // Stop processing this message, as we've handled the error and updated the UI.
        }

        // If we reach here, generateImage did not throw. Now check if images were actually returned.
        if (images.length === 0) {
          // If generateImage succeeded but returned no images, provide a text fallback.
          // This assumes the API call itself didn't error, but yielded no visual results.
          const fallback = await sendMessage(
            `The user asked: "${text}". Image generation yielded no results. Apologise briefly and offer to help another way.`,
            settings, []
          );
          setConversations(prev => prev.map(c =>
            c.id === convId
              ? { ...c, messages: c.messages.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, content: fallback, isStreaming: false, isGeneratingImage: false }
                    : m
                )}
              : c
          ));
        } else {
          // Images were successfully generated and returned
          setConversations(prev => prev.map(c =>
            c.id === convId
              ? { ...c, messages: c.messages.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, content: '', isStreaming: false, isGeneratingImage: false, generatedImages: images }
                    : m
                ), updatedAt: new Date() }
              : c
          ));
        }

      // ── TEXT / FILE PATH ──
      } else {
        let fullContent = '';

        if (settings.streaming) {
          await sendMessage(text, settings, currentAttachments, (chunk) => {
            setRetrying(false);
            fullContent += chunk;
            const captured = fullContent;
            setConversations(prev => prev.map(c =>
              c.id === convId
                ? {
                    ...c,
                    messages: c.messages.map(m =>
                      m.id === assistantMsgId ? { ...m, content: captured, isStreaming: true } : m
                    ),
                  }
                : c
            ));
          });
        } else {
          fullContent = await sendMessage(text, settings, currentAttachments);
        }

        clearTimeout(retryTimer);
        setRetrying(false);

        setConversations(prev => prev.map(c =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map(m =>
                  m.id === assistantMsgId ? { ...m, content: fullContent, isStreaming: false } : m
                ),
                updatedAt: new Date(),
              }
            : c
        ));
      }

      const conv = conversations.find(c => c.id === convId);
      // Only generate title if the conversation is new or has very few messages
      if (conv && conv.messages.length <= 2) { // Adjusted condition to prevent re-titling existing convs
        try {
          const title = await generateTitle([userMsg]);
          setConversations(prev => prev.map(c =>
            c.id === convId ? { ...c, title } : c
          ));
        } catch {
          // ignore title errors
        }
      }
    } catch (err: unknown) {
      clearTimeout(retryTimer);
      setRetrying(false);
      const raw = err instanceof Error ? err.message : 'An error occurred';
      setError(friendlyError(raw));
      setConversations(prev => prev.map(c =>
        c.id === convId
          ? { ...c, messages: c.messages.filter(m => m.id !== assistantMsgId) }
          : c
      ));
    } finally {
      setIsLoading(false);
    }
  }, [input, attachments, isLoading, activeId, settings, conversations, apiKeyMissing]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

  
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', overflowX: 'hidden', }}>
            {/* SIDEBAR */}
{/* Render sidebar only when:
   - Desktop (always)
   - Mobile AND open
*/}
{(isDesktop || sidebarOpen) && (
  <Sidebar
    conversations={conversations}
    activeId={activeId}
    onSelect={(id) => {
      setActiveId(id);
      if (!isDesktop) setSidebarOpen(false);
    }}
    onNew={() => {
      const conv = createConversation(settings);
      setConversations(prev => [...prev, conv]);
      setActiveId(conv.id);
      if (!isDesktop) setSidebarOpen(false);
    }}
    onDelete={handleDeleteConversation}
    isOpen={true}
    onClose={() => setSidebarOpen(false)}
  />
)}


      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            borderBottom: '1px solid rgba(120, 100, 255, 0.08)',
            background: 'rgba(10, 10, 15, 0.8)',
            backdropFilter: 'blur(12px)',
            flexShrink: 0,
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setSidebarOpen(true)} className="md:hidden"
              style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, padding: 4 }}>☰</button>
            <span style={{ fontSize: 13, color: '#555', fontFamily: "'DM Mono', monospace", display: 'none' }} className="md:block">
              {activeConversation?.title || 'Select or start a conversation'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              background: 'rgba(124, 107, 255, 0.12)', border: '1px solid rgba(124, 107, 255, 0.2)',
              color: '#9a8fff', fontFamily: "'DM Mono', monospace",
            }}>
              {settings.model.replace('gemini-', '').replace('-latest', '')}
            </div>
            <button onClick={() => setShowSettings(true)} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, color: '#777', cursor: 'pointer', padding: '6px 12px', fontSize: 13, transition: 'all 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            >⚙ Settings</button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
          {apiKeyMissing && (
            <div style={{
              margin: '0 auto 20px', maxWidth: 700, padding: '16px 20px',
              background: 'rgba(255, 107, 107, 0.08)', border: '1px solid rgba(255, 107, 107, 0.25)',
              borderRadius: 14, fontSize: 13, color: '#ff9a9a', lineHeight: 1.6,
            }}>
              <strong>⚠ API Key Missing</strong><br />
              Copy <code style={{ fontFamily: "'DM Mono', monospace", background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>.env.example</code> to{' '}
              <code style={{ fontFamily: "'DM Mono', monospace", background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>.env</code> and add your Gemini API key.<br />
              Get one at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#ffb3b3' }}>aistudio.google.com/apikey</a>
            </div>
          )}

          {showEmpty && !apiKeyMissing && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', minHeight: '60vh', gap: 16, textAlign: 'center',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20,
                background: 'linear-gradient(135deg, #7c6bff22, #b06bff22)',
                border: '1px solid rgba(124, 107, 255, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 8,
              }}>✦</div>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: '#c4c0d8', fontWeight: 400 }}>
                What can I help you with?
              </h1>
              <p style={{ color: '#444', fontSize: 14, maxWidth: 380 }}>
                Ask anything, upload images or files, and explore ideas together.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 520, marginTop: 8 }}>
                {[
                  'Explain quantum entanglement simply',
                  'Write a Python web scraper',
                  'Draft a professional email',
                  'Analyse an image for me',
                  'Review my code for bugs',
                  'Summarize a PDF document',
                ].map(s => (
                  <button key={s} onClick={() => { setInput(s); textareaRef.current?.focus(); }} style={{
                    padding: '8px 14px', borderRadius: 20,
                    background: 'rgba(124, 107, 255, 0.08)', border: '1px solid rgba(124, 107, 255, 0.2)',
                    color: '#9a8fff', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124, 107, 255, 0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(124, 107, 255, 0.08)')}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>

          {retrying && (
            <div style={{
              maxWidth: 760, margin: '16px auto 0', padding: '10px 16px',
              background: 'rgba(124, 107, 255, 0.08)', border: '1px solid rgba(124, 107, 255, 0.2)',
              borderRadius: 12, fontSize: 13, color: '#9a8fff',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                border: '2px solid rgba(124, 107, 255, 0.3)', borderTopColor: '#7c6bff',
                animation: 'spin 0.8s linear infinite', flexShrink: 0,
              }} />
              Server busy, please wait…
            </div>
          )}

          {error && (
            <div style={{
              maxWidth: 760, margin: '16px auto 0', padding: '12px 16px',
              background: 'rgba(255, 107, 107, 0.08)', border: '1px solid rgba(255, 107, 107, 0.2)',
              borderRadius: 12, fontSize: 13, color: '#ff9a9a',
            }}>
              ⚠ {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input box ── */}
        <div style={{
          padding: '12px 20px 16px',
          borderTop: '1px solid rgba(120, 100, 255, 0.08)',
          background: 'rgba(10, 10, 15, 0.95)',
          backdropFilter: 'blur(12px)',
          flexShrink: 0,
        }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>

            {/* The unified input card */}
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(124, 107, 255, 0.25)',
                borderRadius: 18,
                transition: 'border-color 0.2s',
                overflow: 'hidden',
              }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(124, 107, 255, 0.55)')}
              onBlurCapture={e => (e.currentTarget.style.borderColor = 'rgba(124, 107, 255, 0.25)')}
            >

              {/* Attachment previews — shown above textarea when files are attached */}
              {attachments.length > 0 && (
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 8,
                  padding: '12px 14px 0 14px',
                }}>
                  {attachments.map(file => (
                    <div key={file.id} style={{
                      position: 'relative', display: 'inline-flex', alignItems: 'center',
                      gap: 6, padding: '5px 28px 5px 8px',
                      background: 'rgba(124,107,255,0.12)',
                      border: '1px solid rgba(124,107,255,0.25)',
                      borderRadius: 10, maxWidth: 200,
                    }}>
                      {file.previewUrl ? (
                        <img src={file.previewUrl} alt={file.name}
                          style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{fileIcon(file.mimeType)}</span>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: 11, fontWeight: 500, color: '#c4b8ff',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{file.name}</div>
                        <div style={{ fontSize: 10, color: '#666' }}>{formatSize(file.size)}</div>
                      </div>
                      {/* Remove button */}
                      <button onClick={() => handleRemoveAttachment(file.id)} style={{
                        position: 'absolute', top: 4, right: 6,
                        background: 'none', border: 'none', color: '#666',
                        cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: 0,
                      }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ff6b6b')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#666')}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Textarea row */}
              <div style={{ display: 'flex', alignItems: 'flex-end', padding: '10px 10px 10px 14px', gap: 8 }}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={attachments.length > 0 ? 'Add a message… (optional)' : 'Message Gemini… or drop a file here'}
                  rows={1}
                  disabled={isLoading}
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    color: '#ddd9f0', fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                    resize: 'none', lineHeight: 1.65, maxHeight: 180, overflowY: 'auto',
                    paddingTop: 2, alignSelf: 'center',
                  }}
                />

                {/* Bottom-right toolbar: attach + send */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {/* Attach button — looks exactly like Claude's paperclip */}
                  <button
                    type="button"
                    title="Attach image or file"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: 34, height: 34, borderRadius: 9,
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#666', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s', fontSize: 16,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,107,255,0.12)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,107,255,0.35)';
                      (e.currentTarget as HTMLButtonElement).style.color = '#a89fff';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
                      (e.currentTarget as HTMLButtonElement).style.color = '#666';
                    }}
                  >
                    {/* Paperclip SVG */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                  </button>

                  {/* Send button */}
                  <button
                    onClick={handleSend}
                    disabled={!canSend}
                    style={{
                      width: 34, height: 34, borderRadius: 9, border: 'none',
                      background: canSend
                        ? 'linear-gradient(135deg, #7c6bff, #b06bff)'
                        : 'rgba(124, 107, 255, 0.15)',
                      color: canSend ? '#fff' : '#444',
                      cursor: canSend ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                      boxShadow: canSend ? '0 2px 12px rgba(124, 107, 255, 0.45)' : 'none',
                    }}
                  >
                    {isLoading ? (
                      <div style={{
                        width: 14, height: 14, border: '2px solid #555',
                        borderTopColor: '#9a8fff', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5"/>
                        <polyline points="5 12 12 5 19 12"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT}
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />

            <p style={{ textAlign: 'center', fontSize: 11, color: '#2e2e3a', marginTop: 8 }}>
              Enter to send · Shift+Enter for new line · paste or drop files to attach
            </p>
          </div>
        </div>
      </div>

      {showSettings && (
        <SettingsPanel settings={settings} onUpdate={handleSettingsUpdate} onClose={() => setShowSettings(false)} />
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