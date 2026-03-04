import React from 'react';
import { Conversation, User } from '../types';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  authState: 'loading' | 'guest' | 'authenticated';
  onSignIn: () => void;
  onSignUp: () => void;
  onSignOut: () => void;
  isSyncing: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  conversations, activeId, onSelect, onNew, onDelete,
  isOpen, onClose, user, authState, onSignIn, onSignUp, onSignOut, isSyncing,
}) => {
  return (
    <>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 20, background: 'var(--app-overlay)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      )}

      <aside style={{
        background: 'var(--app-panel-strong)',
        borderRight: '1px solid rgba(120,100,255,0.12)',
        width: 272, flexShrink: 0,
        position: 'fixed', left: 0, top: 0, zIndex: 30,
        display: 'flex', flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
      }} className="md-sidebar sidebar-shell">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, #7c6bff, #b06bff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>✦</div>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: '#e8e6f0' }}>AI Studio</span>
          </div>
          <button className='block md:hidden' onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--app-text-muted)', cursor: 'pointer', fontSize: 16, padding: 4 }}>✕</button>
        </div>

        {/* New chat */}
        <div style={{ padding: '0 14px 14px' }}>
          <button onClick={onNew} style={{
            width: '100%', padding: '10px 16px',
            background: 'linear-gradient(135deg, rgba(124,107,255,0.15), rgba(176,107,255,0.15))',
            border: '1px solid rgba(124,107,255,0.3)', borderRadius: 12,
            color: '#b4a8ff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
          }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'linear-gradient(135deg,rgba(124,107,255,0.25),rgba(176,107,255,0.25))'; b.style.borderColor = 'rgba(124,107,255,0.5)'; }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'linear-gradient(135deg,rgba(124,107,255,0.15),rgba(176,107,255,0.15))'; b.style.borderColor = 'rgba(124,107,255,0.3)'; }}
          >
            <span style={{ fontSize: 18 }}>+</span> New Conversation
          </button>
        </div>

        {/* Conversations */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
          {conversations.length === 0 ? (
            <div style={{ color: 'var(--app-text-muted)', fontSize: 12, textAlign: 'center', padding: '28px 16px' }}>No conversations yet</div>
          ) : (
            conversations.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map(conv => (
              <div key={conv.id} onClick={() => { onSelect(conv.id); onClose(); }} style={{
                padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                background: activeId === conv.id ? 'rgba(124,107,255,0.15)' : 'transparent',
                border: activeId === conv.id ? '1px solid rgba(124,107,255,0.2)' : '1px solid transparent',
                transition: 'all 0.15s', marginBottom: 2,
              }}
                onMouseEnter={e => { if (activeId !== conv.id) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (activeId !== conv.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: activeId === conv.id ? '#c4b8ff' : '#9a94b0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--app-text-muted)', marginTop: 2 }}>{conv.messages.length} msg{conv.messages.length !== 1 ? 's' : ''}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); onDelete(conv.id); }} className="del-btn" style={{
                  background: 'none', border: 'none', color: 'var(--app-text-muted)', cursor: 'pointer',
                  padding: '2px 5px', borderRadius: 4, fontSize: 12,
                  opacity: 0, transition: 'all 0.15s', flexShrink: 0,
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ff6b6b'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--app-text-muted)'}
                >✕</button>
              </div>
            ))
          )}
        </div>

        {/* Bottom auth section */}
        <div style={{ padding: '14px', borderTop: '1px solid var(--app-border)' }}>
          {authState === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid rgba(124,107,255,0.4)', borderTopColor: '#7c6bff', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ fontSize: 12, color: 'var(--app-text-muted)' }}>Loading…</div>
            </div>
          )}

          {authState === 'guest' && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--app-text-soft)', marginBottom: 10, lineHeight: 1.5, padding: '0 2px' }}>
                Guest mode — chats are lost on page refresh
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                <button onClick={onSignUp} style={{
                  flex: 1, padding: '9px 10px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #7c6bff, #b06bff)',
                  color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(124,107,255,0.3)',
                }}>Sign up free</button>
                <button onClick={onSignIn} style={{
                  flex: 1, padding: '9px 10px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--app-text-soft)', fontSize: 12, cursor: 'pointer',
                }}>Sign in</button>
              </div>
            </div>
          )}

          {authState === 'authenticated' && user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                background: user.avatarUrl ? 'transparent' : 'linear-gradient(135deg,#7c6bff,#b06bff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid rgba(124,107,255,0.3)',
              }}>
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{(user.name || user.email)[0].toUpperCase()}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#c4b8ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name || user.email}</div>
                <div style={{ fontSize: 10, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {isSyncing
                    ? <><div style={{ width: 5, height: 5, borderRadius: '50%', border: '1.5px solid #4ade80', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />Syncing…</>
                    : <><div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80' }} />Synced</>
                  }
                </div>
              </div>
              <button onClick={onSignOut} title="Sign out" style={{
                background: 'none', border: 'none', color: 'var(--app-text-muted)', cursor: 'pointer', padding: 6, borderRadius: 7, transition: 'all 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,107,107,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#ff9a9a'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--app-text-muted)'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>

      <style>{`
        aside div:hover .del-btn { opacity: 1 !important; }
        @media (min-width: 768px) { .md-sidebar { position: relative !important; transform: translateX(0) !important; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

export default Sidebar;
