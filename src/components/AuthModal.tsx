import React, { useState } from 'react';
import { signIn, signUp, signInWithGoogle, resetPassword, isSupabaseConfigured } from '../services/authService';
import { AuthMode } from '../types';

interface Props {
  initialMode?: AuthMode;
  onSuccess: () => void;
  onClose: () => void;
}

const G_ICON = (
  <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.2 30.2 0 24 0 14.8 0 6.9 5.4 3 13.3l7.9 6.1C12.8 13.2 17.9 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8C43.5 37.3 46.5 31.4 46.5 24.5z"/>
    <path fill="#FBBC05" d="M10.9 28.6A14.8 14.8 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6L2.4 13.3A23.8 23.8 0 0 0 0 24c0 3.8.9 7.4 2.4 10.7l8.5-6.1z"/>
    <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.7 2.2-7.7 2.2-6.1 0-11.2-3.7-13.1-9l-8.5 6.1C6.9 42.6 14.8 48 24 48z"/>
  </svg>
);

const InputField: React.FC<{
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}> = ({ label, type, value, onChange, placeholder, autoComplete }) => (
  <div>
    <label style={{ fontSize: 12, color: '#7c6bff', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      style={{
        width: '100%', padding: '11px 14px', boxSizing: 'border-box',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 11, color: '#ddd9f0', fontSize: 14, outline: 'none',
        fontFamily: "'DM Sans', sans-serif", transition: 'border-color 0.2s',
      }}
      onFocus={e => (e.target.style.borderColor = 'rgba(124,107,255,0.6)')}
      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
    />
  </div>
);

const AuthModal: React.FC<Props> = ({ initialMode = 'signin', onSuccess, onClose }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim()) { setError('Email is required.'); return; }
    if (!password.trim()) { setError('Password is required.'); return; }
    if (mode === 'signup' && !name.trim()) { setError('Name is required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email.trim(), password, name.trim());
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
      } else {
        await signIn(email.trim(), password);
        onSuccess();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // redirect happens automatically — onSuccess fires via onAuthStateChange
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      setGoogleLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) { setError('Enter your email above first.'); return; }
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSuccess('Password reset email sent! Check your inbox.');
      setShowReset(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', padding: 20,
      }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{
          width: '100%', maxWidth: 440,
          background: 'linear-gradient(180deg, #151423 0%, #0f0e1a 100%)',
          border: '1px solid rgba(124,107,255,0.2)', borderRadius: 20, padding: 32,
          boxShadow: '0 24px 80px rgba(0,0,0,0.85)',
        }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#e8e6f0', marginBottom: 12 }}>
            Setup Required
          </h2>
          <p style={{ fontSize: 13, color: '#888', lineHeight: 1.7, marginBottom: 20 }}>
            To enable user accounts and cloud sync, add your Supabase credentials to <code style={{ color: '#c4b8ff', background: 'rgba(124,107,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>.env</code>:
          </p>
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: '14px 16px', fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#b8d4ff', lineHeight: 2 }}>
            VITE_SUPABASE_URL=https://xxx.supabase.co<br/>
            VITE_SUPABASE_ANON_KEY=eyJ...
          </div>
          <p style={{ fontSize: 12, color: '#555', marginTop: 12 }}>
            Get these from <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: '#7c6bff' }}>supabase.com/dashboard</a> → your project → Settings → API.
          </p>
          <button onClick={onClose} style={{
            marginTop: 20, width: '100%', padding: '11px', borderRadius: 11, border: 'none',
            background: 'rgba(124,107,255,0.15)', color: '#9a8fff', cursor: 'pointer', fontSize: 14,
          }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 420,
        background: 'linear-gradient(180deg, #151423 0%, #0f0e1a 100%)',
        border: '1px solid rgba(124,107,255,0.2)', borderRadius: 22, padding: 32,
        boxShadow: '0 24px 80px rgba(0,0,0,0.9)',
        overflowY: 'auto',
        animation: 'fadeSlideIn 0.22s ease-out',
      }} className="modal-panel">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 26, marginBottom: 6 }}>{mode === 'signin' ? '👋' : ' '}</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#e8e6f0', margin: 0 }}>
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </h2>
            <p style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
              {mode === 'signin' ? 'Sign in to sync your conversations' : 'Free forever · no credit card needed'}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, color: '#666', cursor: 'pointer', padding: '4px 10px', fontSize: 13,
          }}>✕</button>
        </div>

        {/* Success banner */}
        {success && (
          <div style={{
            marginBottom: 18, padding: '11px 14px', borderRadius: 10,
            background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
            fontSize: 13, color: '#86efac',
          }}> {success}</div>
        )}

        {/* Error banner */}
        {error && (
          <div style={{
            marginBottom: 18, padding: '11px 14px', borderRadius: 10,
            background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)',
            fontSize: 13, color: '#ff9a9a',
          }}>⚠ {error}</div>
        )}

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          style={{
            width: '100%', padding: '11px 16px', borderRadius: 11, marginBottom: 16,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#ddd9f0', fontSize: 14, cursor: googleLoading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif",
            opacity: googleLoading ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!googleLoading) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.09)'; }}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'}
        >
          {G_ICON}
          {googleLoading ? 'Redirecting…' : `Continue with Google`}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          <span style={{ fontSize: 11, color: '#444' }}>or with email</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'signup' && (
            <InputField label="Full name" type="text" value={name} onChange={setName} placeholder="Your name" autoComplete="name" />
          )}
          <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
          {!showReset && (
            <InputField
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          )}
        </div>

        {/* Forgot password */}
        {mode === 'signin' && !showReset && (
          <button onClick={() => setShowReset(true)} style={{
            background: 'none', border: 'none', color: '#555', fontSize: 12,
            cursor: 'pointer', padding: '6px 0', textDecoration: 'underline',
          }}>
            Forgot password?
          </button>
        )}
        {showReset && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button onClick={handleReset} disabled={loading} style={{
              padding: '8px 14px', borderRadius: 8, border: 'none', fontSize: 12,
              background: 'rgba(124,107,255,0.15)', color: '#9a8fff', cursor: 'pointer',
            }}>
              Send reset email
            </button>
            <button onClick={() => setShowReset(false)} style={{
              padding: '8px 14px', borderRadius: 8, border: 'none', fontSize: 12,
              background: 'rgba(255,255,255,0.05)', color: '#666', cursor: 'pointer',
            }}>
              Cancel
            </button>
          </div>
        )}

        {/* Submit */}
        {!showReset && (
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              marginTop: 20, width: '100%', padding: '12px', borderRadius: 12, border: 'none',
              background: loading ? 'rgba(124,107,255,0.3)' : 'linear-gradient(135deg, #7c6bff, #b06bff)',
              color: loading ? '#666' : '#fff', fontSize: 15, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(124,107,255,0.45)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        )}

        {/* Mode toggle */}
        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#555' }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setSuccess(null); }} style={{
            background: 'none', border: 'none', color: '#9a8fff', cursor: 'pointer', fontSize: 13,
            textDecoration: 'underline', padding: 0,
          }}>
            {mode === 'signin' ? 'Sign up free' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
