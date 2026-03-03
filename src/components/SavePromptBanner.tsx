import React, { useState } from 'react';

interface Props {
  onSignUp: () => void;
  onSignIn: () => void;
  onDismiss: () => void;
}

const SavePromptBanner: React.FC<Props> = ({ onSignUp, onSignIn, onDismiss }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  return (
    <div style={{
      position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
      zIndex: 40, width: 'calc(100% - 40px)', maxWidth: 640,
      background: 'linear-gradient(135deg, rgba(124,107,255,0.12), rgba(176,107,255,0.12))',
      border: '1px solid rgba(124,107,255,0.3)',
      borderRadius: 16, padding: '14px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', gap: 14,
      animation: 'slideUp 0.3s ease-out',
    }}>
      <div style={{ fontSize: 24, flexShrink: 0 }}></div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#c4b8ff', marginBottom: 2 }}>
          Don't lose your conversation
        </div>
        <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
          Sign up free to save your chats and access them from any device.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={onSignUp}
          style={{
            padding: '8px 14px', borderRadius: 9, border: 'none',
            background: 'linear-gradient(135deg, #7c6bff, #b06bff)',
            color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(124,107,255,0.4)',
            whiteSpace: 'nowrap',
          }}
        >
          Sign up free
        </button>
        <button
          onClick={onSignIn}
          style={{
            padding: '8px 12px', borderRadius: 9,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#888', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          Sign in
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none', border: 'none', color: '#444',
            cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1,
          }}
          title="Dismiss"
        >✕</button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SavePromptBanner;
