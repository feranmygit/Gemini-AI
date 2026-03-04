import React, { useCallback, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import MessageBubble from '../components/MessageBubble';
import SettingsPanel from '../components/SettingsPanel';
import AuthModal from '../components/AuthModal';
import SavePromptBanner from '../components/SavePromptBanner';
import UserMenu from '../components/UserMenu';
import { isSupabaseConfigured } from '../services/authService';
import { AppSettings } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useConversations } from '../hooks/useConversations';
import { useFileHandler } from '../hooks/useFileHandler';
import { useChatEngine } from '../hooks/useChatEngine';

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

const MainApp: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user, authState, showAuth, authMode, openSignIn, openSignUp, closeAuth, signOutUser } = useAuth();
  const { settings, setSettings } = useTheme();

  const {
    conversations,
    setConversations,
    activeId,
    setActiveId,
    activeConversation,
    isSyncing,
    setIsSyncing,
    showSavePrompt,
    setShowSavePrompt,
    dismissSavePrompt,
    migrationNote,
    clearMigrationNote,
    newConversation,
    selectConversation,
    deleteConversation,
  } = useConversations({ user, authState });

  const {
    attachments,
    setAttachments,
    removeAttachment,
    clearAttachments,
    handleFileInput,
    handlePaste,
    handleDrop,
    acceptedUploadTypes,
  } = useFileHandler();

  const {
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
    providerColor: pc,
    activeModelLabel,
    showKeyWarning,
    keyWarningMessages: keyWarningMsg,
  } = useChatEngine({
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
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewConversation = useCallback(() => {
    newConversation(settings);
    resetRuntime();
    clearAttachments();
  }, [newConversation, settings, resetRuntime, clearAttachments]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      selectConversation(id);
      resetRuntime();
      clearAttachments();
    },
    [selectConversation, resetRuntime, clearAttachments],
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      deleteConversation(id);
      clearError();
      clearAttachments();
    },
    [deleteConversation, clearError, clearAttachments],
  );

  const handleSettingsUpdate = useCallback(
    (nextSettings: AppSettings) => {
      setSettings(nextSettings);
      resetRuntime();
    },
    [setSettings, resetRuntime],
  );

  const handleSignIn = useCallback(() => {
    setShowSavePrompt(false);
    openSignIn();
  }, [setShowSavePrompt, openSignIn]);

  const handleSignUp = useCallback(() => {
    setShowSavePrompt(false);
    openSignUp();
  }, [setShowSavePrompt, openSignUp]);

  const handleSignOut = useCallback(async () => {
    await signOutUser();
    setConversations([]);
    setActiveId(null);
    clearAttachments();
    resetRuntime();
  }, [signOutUser, setConversations, setActiveId, clearAttachments, resetRuntime]);

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

      <div className="main-content ml-0 flex flex-1 flex-col overflow-hidden">
        <div className="h-14 shrink-0 flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-[var(--app-panel)] px-5 backdrop-blur-[12px]">
          <div className="flex items-center gap-3">
            <button className="block cursor-pointer border-none bg-transparent p-1 text-lg text-[var(--app-text-muted)] md:hidden" onClick={() => setSidebarOpen(true)}>
              ☰
            </button>
            <span className="hidden font-mono text-[13px] text-[var(--app-text-soft)] md:block">
              {activeConversation?.title || 'start a conversation'}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex" style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: pc.bg, border: pc.border, color: pc.color, fontFamily: "'DM Mono', monospace", alignItems: 'center', gap: 5 }}>
              {providerIcons[settings.provider]} {activeModelLabel}
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="cursor-pointer rounded-[8px] border border-[var(--app-border-soft)] bg-[var(--app-surface)] px-3 py-1.5 text-[13px] text-[var(--app-text-soft)] transition-all duration-150 hover:bg-[var(--app-surface-hover)]"
            >
              Settings
            </button>
            {authState === 'authenticated' && user ? (
              <UserMenu user={user} onSignOut={handleSignOut} onShowAuth={openSignIn} />
            ) : (
              authState === 'guest' &&
              isSupabaseConfigured && (
                <button
                  onClick={openSignIn}
                  className="cursor-pointer rounded-[8px] border border-[rgba(124,107,255,0.25)] bg-[rgba(124,107,255,0.1)] px-[14px] py-1.5 text-xs text-[#9a8fff] transition-all duration-150 hover:bg-[rgba(124,107,255,0.2)]"
                >
                  Sign in
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          {migrationNote && (
            <div className="mx-auto mb-5 flex max-w-[700px] items-center justify-between rounded-xl border border-[var(--app-success-border)] bg-[var(--app-success-bg)] px-[18px] py-3 text-[13px] text-[var(--app-success-text)]">
              <span>{migrationNote}</span>
              <button onClick={clearMigrationNote} className="cursor-pointer border-none bg-transparent text-base text-[var(--app-success-text)]">
                ×
              </button>
            </div>
          )}

          {showKeyWarning && (
            <div className="mx-auto mb-5 max-w-[700px] rounded-[14px] border border-[var(--app-danger-border)] bg-[var(--app-danger-bg)] px-[18px] py-[14px] text-[13px] leading-[1.6] text-[var(--app-danger-text)]">
              <strong>API Key Missing</strong>
              <br />
              {keyWarningMsg[settings.provider]}
            </div>
          )}

          {showEmpty && !showKeyWarning && (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
              <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-[20px] border border-[rgba(124,107,255,0.3)] bg-[linear-gradient(135deg,#7c6bff22,#b06bff22)] text-[28px]">✦</div>
              <h1 className="text-[28px] font-normal text-[var(--app-text)]" style={{ fontFamily: "'DM Serif Display', serif" }}>What can I help you with?</h1>
              <p className="max-w-[380px] text-sm text-[var(--app-text-muted)]">Ask anything, upload images or files, and explore ideas together.</p>
              <div className="mt-2 flex max-w-[520px] flex-wrap justify-center gap-2">
                {['Explain quantum entanglement simply', 'Write a Python web scraper', 'Draft a professional email', 'Review my code for bugs'].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s);
                      textareaRef.current?.focus();
                    }}
                    className="cursor-pointer rounded-[20px] border border-[rgba(124,107,255,0.2)] bg-[rgba(124,107,255,0.08)] px-[14px] py-2 text-xs text-[#9a8fff] transition-all duration-150 hover:bg-[rgba(124,107,255,0.15)]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mx-auto flex max-w-[760px] flex-col gap-5">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>

          {retrying && (
            <div className="mx-auto mt-4 flex max-w-[760px] items-center gap-2.5 rounded-xl border border-[rgba(124,107,255,0.2)] bg-[rgba(124,107,255,0.08)] px-4 py-2.5 text-[13px] text-[#9a8fff]">
              <div className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-[rgba(124,107,255,0.3)] border-t-[#7c6bff]" />
              Server busy — retrying automatically…
            </div>
          )}

          {error && (
            <div className="mx-auto mt-4 max-w-[760px] rounded-xl border border-[var(--app-danger-border)] bg-[var(--app-danger-bg)] px-4 py-3 text-[13px] text-[var(--app-danger-text)]">{error}</div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 border-t border-[var(--app-border)] bg-[var(--app-panel)] px-5 pb-4 pt-3 backdrop-blur-[12px]">
          <div className="mx-auto max-w-[760px]">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="overflow-hidden rounded-[18px] border border-[rgba(124,107,255,0.25)] bg-[rgba(255,255,255,0.04)] transition-colors duration-200 focus-within:border-[rgba(124,107,255,0.55)]"
            >
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 px-[14px] pb-0 pt-3">
                  {attachments.map((file) => (
                    <div key={file.id} className="relative inline-flex max-w-[200px] items-center gap-1.5 rounded-[10px] border border-[rgba(124,107,255,0.25)] bg-[rgba(124,107,255,0.12)] py-[5px] pl-2 pr-7">
                      {file.previewUrl ? <img src={file.previewUrl} alt={file.name} className="h-7 w-7 shrink-0 rounded-[6px] object-cover" /> : <span className="shrink-0 text-[18px]">{fileIcon(file.mimeType)}</span>}
                      <div className="min-w-0">
                        <div className="truncate whitespace-nowrap text-[11px] font-medium text-[#c4b8ff]">{file.name}</div>
                        <div className="text-[10px] text-[var(--app-text-muted)]">{formatSize(file.size)}</div>
                      </div>
                      <button
                        onClick={() => removeAttachment(file.id)}
                        className="absolute right-1.5 top-1 cursor-pointer border-none bg-transparent p-0 text-[11px] leading-none text-[var(--app-text-muted)] hover:text-[#ff6b6b]"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2 px-[14px] py-[10px] pr-[10px]">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={attachments.length > 0 ? 'Add a message… (optional)' : `Message ${providerIcons[settings.provider]} ${activeModelLabel}…`}
                  rows={1}
                  disabled={isLoading}
                  className="max-h-[180px] flex-1 resize-none self-center overflow-y-auto border-none bg-transparent pt-0.5 text-sm leading-[1.65] text-[var(--app-text)] outline-none"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    title="Attach file"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-[9px] border border-[var(--app-border-soft)] bg-transparent text-[var(--app-text-muted)] transition-all duration-150 hover:border-[rgba(124,107,255,0.35)] hover:bg-[rgba(124,107,255,0.12)] hover:text-[#a89fff]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!canSend}
                    className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border-none transition-all duration-200"
                    style={{
                      background: canSend ? 'linear-gradient(135deg,#7c6bff,#b06bff)' : 'rgba(124,107,255,0.15)',
                      color: canSend ? '#fff' : 'var(--app-text-muted)',
                      cursor: canSend ? 'pointer' : 'not-allowed',
                      boxShadow: canSend ? '0 2px 12px rgba(124,107,255,0.45)' : 'none',
                    }}
                  >
                    {isLoading ? (
                      <div className="h-[14px] w-[14px] animate-spin rounded-full border-2 border-[var(--app-text-muted)] border-t-[#9a8fff]" />
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <input ref={fileInputRef} type="file" multiple accept={acceptedUploadTypes} className="hidden" onChange={handleFileInput} />
            <p className="mt-2 text-center text-[11px] text-[var(--app-text-muted)]">Enter to send · Shift+Enter for new line · paste or drop files to attach</p>
          </div>
        </div>
      </div>

      {showSettings && <SettingsPanel settings={settings} onUpdate={handleSettingsUpdate} onClose={() => setShowSettings(false)} />}
      {showAuth && <AuthModal initialMode={authMode} onSuccess={closeAuth} onClose={closeAuth} />}
      {showSavePrompt && authState === 'guest' && isSupabaseConfigured && <SavePromptBanner onSignUp={handleSignUp} onSignIn={handleSignIn} onDismiss={dismissSavePrompt} />}

      <style>{`
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .markdown-content { color: var(--app-text); }
        .markdown-content p { margin-bottom: 12px; line-height: 1.7; }
        .markdown-content p:last-child { margin-bottom: 0; }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 { font-family: 'DM Serif Display', serif; font-weight: 400; margin-top: 16px; margin-bottom: 8px; color: var(--app-text); }
        .markdown-content h1 { font-size: 22px; } .markdown-content h2 { font-size: 18px; } .markdown-content h3 { font-size: 15px; }
        .markdown-content code { font-family: 'DM Mono', monospace; font-size: 12.5px; background: var(--app-markdown-code-bg); border: 1px solid rgba(124,107,255,0.15); padding: 1px 6px; border-radius: 5px; color: #7c6bff; }
        .markdown-content pre code { background: none; border: none; padding: 0px; color: var(--app-text-soft); font-size: 13px; line-height: 1.6; }
        .markdown-content ul, .markdown-content ol { padding-left: 20px; margin-bottom: 12px; }
        .markdown-content li { margin-bottom: 4px; line-height: 1.7; }
        .markdown-content blockquote { border-left: 3px solid rgba(124,107,255,0.4); padding-left: 14px; color: var(--app-text-soft); margin: 12px 0; font-style: italic; }
        .markdown-content table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
        .markdown-content th { background: rgba(124,107,255,0.12); padding: 8px 12px; text-align: left; border: 1px solid rgba(124,107,255,0.15); color: #7c6bff; }
        .markdown-content td { padding: 8px 12px; border: 1px solid var(--app-border-soft); }
        .markdown-content a { color: #9a8fff; text-decoration: underline; }
        .markdown-content strong { color: var(--app-text); font-weight: 600; }
        .markdown-content hr { border: none; border-top: 1px solid var(--app-border-soft); margin: 16px 0; }
.markdown-content pre {
  position: relative;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;

  background: var(--app-markdown-pre-bg);
  border: 1px solid var(--app-border-soft);
  border-radius: 12px;

//   padding: 14px 16px; /* move padding here */

  box-sizing: border-box;
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: rgba(124,107,255,0.4) transparent;
}

/* WebKit browsers (Chrome, Edge, Safari) */
.markdown-content pre::-webkit-scrollbar {
  height: 4px; 
}

.markdown-content pre::-webkit-scrollbar-track {
  background: transparent;
}

.markdown-content pre::-webkit-scrollbar-thumb {
  background: rgba(124,107,255,0.4);
  border-radius: 10px;
}

.markdown-content pre::-webkit-scrollbar-thumb:hover {
  background: rgba(124,107,255,0.6);
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

export default MainApp;
