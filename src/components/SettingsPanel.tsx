import React from 'react';
import { AppSettings, AppModel } from '../types';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdate, onClose }) => {
  const models = [
    { value: AppModel.Flash, label: 'Gemini 2.5 Flash', desc: 'Fast, efficient, great for most tasks' },
    { value: AppModel.Pro, label: 'Gemini 2.5 Pro', desc: 'Most capable, best for complex reasoning' },
    { value: AppModel.FlashLite, label: 'Flash Lite', desc: 'Fastest, lightweight tasks' },
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      padding: 20,
      margin: 20,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'linear-gradient(180deg, #151423 0%, #0f0e1a 100%)',
          border: '1px solid rgba(124, 107, 255, 0.2)',
          borderRadius: 20,
          padding: 28,
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          animation: 'fadeSlideIn 0.25s ease-out',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop:50 }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#e8e6f0' }}>
            Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#888',
              cursor: 'pointer',
              padding: '4px 10px',
              fontSize: 13,
            }}
          >✕</button>
        </div>

        {/* Model Selection */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#7c6bff', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
            Model
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {models.map(m => (
              <div
                key={m.value}
                onClick={() => onUpdate({ ...settings, model: m.value })}
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: settings.model === m.value
                    ? '1px solid rgba(124, 107, 255, 0.5)'
                    : '1px solid rgba(255,255,255,0.06)',
                  background: settings.model === m.value
                    ? 'rgba(124, 107, 255, 0.12)'
                    : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: settings.model === m.value ? '#c4b8ff' : '#999' }}>
                  {m.label}
                </div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Temperature */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#7c6bff', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            Temperature
            <span style={{ color: '#888', fontFamily: "'DM Mono', monospace", textTransform: 'none', letterSpacing: 0 }}>
              {settings.temperature.toFixed(1)}
            </span>
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.temperature}
            onChange={e => onUpdate({ ...settings, temperature: parseFloat(e.target.value) })}
            style={{ width: '100%', accentColor: '#7c6bff' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#444', marginTop: 4 }}>
            <span>Precise</span>
            <span>Creative</span>
          </div>
        </div>

        {/* Streaming Toggle */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#7c6bff', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Streaming
            <button
              onClick={() => onUpdate({ ...settings, streaming: !settings.streaming })}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                border: 'none',
                background: settings.streaming ? '#7c6bff' : '#2a2840',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute',
                top: 3,
                left: settings.streaming ? 23 : 3,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
              }} />
            </button>
          </label>
          <p style={{ fontSize: 11, color: '#555', marginTop: 6 }}>
            Stream responses word by word as they're generated
          </p>
        </div>

        {/* System Prompt */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#7c6bff', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            System Prompt
          </label>
          <textarea
            value={settings.systemPrompt}
            onChange={e => onUpdate({ ...settings, systemPrompt: e.target.value })}
            rows={4}
            placeholder="You are a helpful AI assistant..."
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              color: '#c4c0d8',
              fontSize: 13,
              fontFamily: "'DM Mono', monospace",
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.6,
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(124, 107, 255, 0.4)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
