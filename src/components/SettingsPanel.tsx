import React, { useState, useEffect } from 'react';
import { AppSettings, AppModel, Provider } from '../types';
import { getOllamaModels, isOllamaRunning, OllamaModel } from '../services/ollamaService';
import { GROQ_MODELS } from '../services/groqService';
import { OPENROUTER_FREE_MODELS } from '../services/openrouterService';

interface Props {
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
  onClose: () => void;
}

const GEMINI_MODELS = [
  { value: AppModel.Flash, label: 'Gemini 2.5 Flash', desc: 'Fast & efficient · needs API key' },
  { value: AppModel.Pro, label: 'Gemini 2.5 Pro', desc: 'Most capable · needs API key' },
  { value: AppModel.FlashLite, label: 'Flash Lite', desc: 'Fastest · needs API key' },
];

const PROVIDERS: { id: Provider; icon: string; label: string; sub: string }[] = [
  { id: 'gemini',      icon: '', label: 'Google Gemini', sub: 'API key · Cloud' },
  { id: 'groq',        icon: '', label: 'Groq',          sub: 'Free · Very fast' },
  { id: 'openrouter',  icon: '', label: 'OpenRouter',    sub: 'Free models · Cloud' },
  { id: 'ollama',      icon: '', label: 'Ollama',        sub: 'Local · No internet' },
];

const Label: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
    <span style={{ fontSize: 12, fontWeight: 600, color: '#7c6bff', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
      {children}
    </span>
    {right}
  </div>
);

const ModelList: React.FC<{
  models: { value: string; label: string; desc: string }[];
  selected: string;
  onSelect: (v: string) => void;
}> = ({ models, selected, onSelect }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
    {models.map(m => (
      <div key={m.value} onClick={() => onSelect(m.value)} style={{
        padding: '10px 14px', borderRadius: 11, cursor: 'pointer', transition: 'all 0.15s',
        background: selected === m.value ? 'rgba(124,107,255,0.14)' : 'rgba(255,255,255,0.02)',
        border: selected === m.value ? '1px solid rgba(124,107,255,0.45)' : '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: selected === m.value ? '#c4b8ff' : '#888' }}>{m.label}</div>
        <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{m.desc}</div>
      </div>
    ))}
  </div>
);

const ApiKeyInput: React.FC<{
  value: string;
  placeholder: string;
  link: string;
  linkLabel: string;
  onChange: (v: string) => void;
}> = ({ value, placeholder, link, linkLabel, onChange }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '10px 40px 10px 12px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, color: '#ddd9f0', fontSize: 13,
            fontFamily: "'DM Mono', monospace", outline: 'none', boxSizing: 'border-box' as const,
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(124,107,255,0.5)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <button onClick={() => setShow(s => !s)} style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 13,
        }}>{show ? '🙈' : '👁'}</button>
      </div>
      <a href={link} target="_blank" rel="noopener noreferrer" style={{
        fontSize: 11, color: '#7c6bff', display: 'inline-block', marginTop: 5, textDecoration: 'none',
      }}>↗ {linkLabel}</a>
    </div>
  );
};

const SettingsPanel: React.FC<Props> = ({ settings, onUpdate, onClose }) => {
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [checking, setChecking] = useState(false);

  const checkOllama = async () => {
    setChecking(true);
    const running = await isOllamaRunning();
    setOllamaOnline(running);
    if (running) {
      const models = await getOllamaModels();
      setOllamaModels(models);
      if (models.length > 0 && !settings.ollamaModel) {
        onUpdate({ ...settings, ollamaModel: models[0].name });
      }
    }
    setChecking(false);
  };

  useEffect(() => {
    if (settings.provider === 'ollama') checkOllama();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const p = settings.provider;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)', padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 550,
        background: 'linear-gradient(180deg, #151423 0%, #0f0e1a 100%)',
        border: '1px solid rgba(124,107,255,0.2)', borderRadius: 20, padding: 28,
        boxShadow: '0 24px 80px rgba(0,0,0,0.85)',
        overflowY: 'auto',
        animation: 'fadeSlideIn 0.25s ease-out',
      }} className="modal-panel">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#e8e6f0' }}>Settings</h2>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, color: '#888', cursor: 'pointer', padding: '4px 10px', fontSize: 13,
          }}>✕</button>
        </div>

        {/* Provider grid */}
        <div style={{ marginBottom: 24 }}>
          <Label>AI Provider</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {PROVIDERS.map(pr => (
              <div key={pr.id} onClick={() => {
                onUpdate({ ...settings, provider: pr.id });
                if (pr.id === 'ollama' && ollamaOnline === null) checkOllama();
              }} style={{
                padding: '11px 13px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
                background: p === pr.id ? 'rgba(124,107,255,0.15)' : 'rgba(255,255,255,0.02)',
                border: p === pr.id ? '1px solid rgba(124,107,255,0.5)' : '1px solid rgba(255,255,255,0.07)',
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{pr.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: p === pr.id ? '#c4b8ff' : '#666' }}>{pr.label}</div>
                <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>{pr.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Connection info */}
        <div style={{
          marginBottom: 20, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          fontSize: 12, color: '#555', lineHeight: 1.7,
        }}>
          {{
            gemini:     'Gemini → your key stays on the server (secure in production)',
            groq:       'Groq → browser calls Groq directly · key in your browser only',
            openrouter: 'OpenRouter → browser calls OpenRouter directly · key in your browser only',
            ollama:     'Ollama → browser calls localhost · local dev only, not for production',
          }[p]}
        </div>

        {/* ── Gemini ── */}
        {p === 'gemini' && (
          <div style={{ marginBottom: 24 }}>
            <Label>Model</Label>
            <ModelList models={GEMINI_MODELS} selected={settings.model} onSelect={v => onUpdate({ ...settings, model: v })} />
          </div>
        )}

        {/* ── Groq ── */}
        {p === 'groq' && (
          <div style={{ marginBottom: 24 }}>
            <Label>Groq API Key</Label>
            <ApiKeyInput
              value={settings.groqApiKey || ''}
              placeholder="gsk_..."
              link="https://console.groq.com/keys"
              linkLabel="Get free Groq key at console.groq.com"
              onChange={v => onUpdate({ ...settings, groqApiKey: v })}
            />
            <div style={{ marginTop: 16 }}>
              <Label>Model</Label>
              <ModelList
                models={GROQ_MODELS}
                selected={settings.groqModel || GROQ_MODELS[0].value}
                onSelect={v => onUpdate({ ...settings, groqModel: v })}
              />
            </div>
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 10,
              background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.15)',
              fontSize: 12, color: '#86efac', lineHeight: 1.6,
            }}>
               <strong>Free tier:</strong> 6,000 requests/day · No credit card needed · Works in production
            </div>
          </div>
        )}

        {/* ── OpenRouter ── */}
        {p === 'openrouter' && (
          <div style={{ marginBottom: 24 }}>
            <Label>OpenRouter API Key</Label>
            <ApiKeyInput
              value={settings.openrouterApiKey || ''}
              placeholder="sk-or-..."
              link="https://openrouter.ai/keys"
              linkLabel="Get free OpenRouter key at openrouter.ai"
              onChange={v => onUpdate({ ...settings, openrouterApiKey: v })}
            />
            <div style={{ marginTop: 16 }}>
              <Label>Free Model</Label>
              <ModelList
                models={OPENROUTER_FREE_MODELS}
                selected={settings.openrouterModel || OPENROUTER_FREE_MODELS[0].value}
                onSelect={v => onUpdate({ ...settings, openrouterModel: v })}
              />
            </div>
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 10,
              background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.15)',
              fontSize: 12, color: '#86efac', lineHeight: 1.6,
            }}>
               <strong>Free models</strong> cost $0 · Works in production · 200 req/day<br/>
               <strong>Auto</strong> always picks the best available free model automatically<br/>
              <a href="https://openrouter.ai/models?q=:free" target="_blank" rel="noopener noreferrer"
                style={{ color: '#6ee7b7', fontSize: 11 }}>↗ See latest free models at openrouter.ai</a>
            </div>
          </div>
        )}

        {/* ── Ollama ── */}
        {p === 'ollama' && (
          <div style={{ marginBottom: 24 }}>
            <Label right={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: ollamaOnline ? '#4ade80' : '#f87171' }} />
                <span style={{ fontSize: 11, color: ollamaOnline ? '#4ade80' : '#f87171' }}>
                  {checking ? 'Checking…' : ollamaOnline ? 'Running' : 'Not found'}
                </span>
                <button onClick={checkOllama} style={{
                  fontSize: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 5, color: '#888', cursor: 'pointer', padding: '2px 8px',
                }}>↻</button>
              </div>
            }>Local Model</Label>

            {!ollamaOnline && (
              <div style={{
                padding: '12px 14px', borderRadius: 10, marginBottom: 12,
                background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)',
                fontSize: 12, color: '#fca5a5', lineHeight: 1.8,
              }}>
                <strong>Ollama not running — local dev only.</strong><br />
                1. Install from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" style={{ color: '#fca5a5' }}>ollama.com</a><br />
                2. <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0 4px', borderRadius: 3 }}>ollama serve</code><br />
                3. <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0 4px', borderRadius: 3 }}>ollama pull llama3.2</code>
              </div>
            )}

            {ollamaOnline && ollamaModels.length > 0 && (
              <ModelList
                models={ollamaModels.map(m => ({ value: m.name, label: `🦙 ${m.name}`, desc: `${(m.size / 1e9).toFixed(1)} GB` }))}
                selected={settings.ollamaModel}
                onSelect={v => onUpdate({ ...settings, ollamaModel: v })}
              />
            )}

            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 10,
              background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.18)',
              fontSize: 12, color: '#fde68a', lineHeight: 1.6,
            }}>
               Ollama only works on <strong>your local machine</strong>. For production use Groq or OpenRouter instead.
            </div>
          </div>
        )}

        {/* Temperature */}
        <div style={{ marginBottom: 24 }}>
          <Label right={
            <span style={{ fontSize: 12, color: '#888', fontFamily: "'DM Mono', monospace" }}>
              {settings.temperature.toFixed(1)}
            </span>
          }>Temperature</Label>
          <input type="range" min="0" max="2" step="0.1" value={settings.temperature}
            onChange={e => onUpdate({ ...settings, temperature: parseFloat(e.target.value) })}
            style={{ width: '100%', accentColor: '#7c6bff' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#444', marginTop: 4 }}>
            <span>Precise</span><span>Creative</span>
          </div>
        </div>

        {/* Streaming */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#7c6bff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Streaming</span>
            <button onClick={() => onUpdate({ ...settings, streaming: !settings.streaming })} style={{
              width: 44, height: 24, borderRadius: 12, border: 'none',
              background: settings.streaming ? '#7c6bff' : '#2a2840',
              cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: 3, left: settings.streaming ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
              }} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#555', marginTop: 6 }}>Stream responses word by word</p>
        </div>

        {/* System Prompt */}
        <div>
          <Label>System Prompt</Label>
          <textarea value={settings.systemPrompt} rows={4}
            onChange={e => onUpdate({ ...settings, systemPrompt: e.target.value })}
            placeholder="You are a helpful AI assistant..."
            style={{
              width: '100%', padding: '11px 13px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 11, color: '#c4c0d8', fontSize: 13,
              fontFamily: "'DM Mono', monospace", resize: 'vertical', outline: 'none', lineHeight: 1.6,
              boxSizing: 'border-box' as const,
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(124,107,255,0.4)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
