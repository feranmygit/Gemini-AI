import { useEffect, useMemo, useState } from 'react';
import { AppModel, AppSettings, ThemeMode } from '../types';

function loadSavedSettings(): Partial<AppSettings> {
  try {
    const stored = localStorage.getItem('ai-studio-settings');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function sanitizeTheme(theme: unknown): ThemeMode {
  if (theme === 'light' || theme === 'dark' || theme === 'system') {
    return theme;
  }
  return 'dark';
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function buildDefaultSettings(): AppSettings {
  const saved = loadSavedSettings();

  return {
    model: saved.model || AppModel.Flash,
    systemPrompt:
      'You are a helpful, knowledgeable, and thoughtful AI assistant. Be concise yet thorough, and use markdown formatting when appropriate.',
    temperature: 1.0,
    streaming: true,
    provider: saved.provider || 'gemini',
    theme: sanitizeTheme(saved.theme),
    ollamaModel: saved.ollamaModel || 'llama3.2',
    groqApiKey: saved.groqApiKey || '',
    groqModel: saved.groqModel || 'llama-3.3-70b-versatile',
    openrouterApiKey: saved.openrouterApiKey || '',
    openrouterModel: saved.openrouterModel || 'openrouter/auto',
  };
}

export function useTheme() {
  const [settings, setSettings] = useState<AppSettings>(() => buildDefaultSettings());
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => getSystemTheme());

  useEffect(() => {
    try {
      localStorage.setItem('ai-studio-settings', JSON.stringify(settings));
    } catch {
      // ignore persistence errors
    }
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    const resolved = settings.theme === 'system' ? systemTheme : settings.theme;
    root.classList.toggle('dark', resolved === 'dark');
  }, [settings.theme, systemTheme]);

  useEffect(() => {
    if (!window.matchMedia) {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemTheme(media.matches ? 'dark' : 'light');
    onChange();
    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme = useMemo(() => {
    return settings.theme === 'system' ? systemTheme : settings.theme;
  }, [settings.theme, systemTheme]);

  return {
    settings,
    setSettings,
    resolvedTheme,
    systemTheme,
  };
}
