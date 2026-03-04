import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';

interface Props {
  user: User;
  onSignOut: () => void;
  onShowAuth: () => void;
}

const UserMenu: React.FC<Props> = ({ user, onSignOut }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user.name
    ? user.name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen(o => !o)}
        title={user.name || user.email}
        style={{
          width: 36, height: 36, borderRadius: '50%', padding: 0,
          border: open ? '2px solid rgba(124,107,255,0.8)' : '2px solid rgba(124,107,255,0.35)',
          background: user.avatarUrl ? 'transparent' : 'linear-gradient(135deg, #7c6bff, #b06bff)',
          cursor: 'pointer', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: open ? '0 0 0 3px rgba(124,107,255,0.15)' : 'none',
        }}
      >
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
          : <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>{initials}</span>
        }
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 44, right: 0, zIndex: 1000,
          background: 'linear-gradient(180deg, #1c1a2e 0%, #141220 100%)',
          border: '1px solid rgba(124,107,255,0.25)', borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,107,255,0.1)',
          minWidth: 240, overflow: 'hidden',
          animation: 'fadeSlideIn 0.15s ease-out',
        }}>
          {/* User info header */}
          <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                background: user.avatarUrl ? 'transparent' : 'linear-gradient(135deg, #7c6bff, #b06bff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid rgba(124,107,255,0.3)',
              }}>
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                  : <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{initials}</span>
                }
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e8e6f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name || 'User'}
                </div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </div>
              </div>
            </div>
            {/* Sync badge */}
            {/* <div style={{
              marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 20,
              background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.18)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
              <span style={{ fontSize: 11, color: '#86efac' }}>Chats syncing to cloud</span>
            </div> */}
          </div>

          {/* Menu items */}
          <div style={{ padding: '6px' }}>
            <button
              onClick={() => { setOpen(false); onSignOut(); }}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10, border: 'none',
                background: 'transparent', color: '#888', cursor: 'pointer', fontSize: 13,
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = 'rgba(255,107,107,0.1)';
                b.style.color = '#ff9a9a';
              }}
              onMouseLeave={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = 'transparent';
                b.style.color = '#888';
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
