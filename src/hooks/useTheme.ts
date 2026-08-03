import { useCallback, useLayoutEffect, useState } from 'react';

export type ThemeId = 'auto' | 'word' | 'vscode' | 'mint';

export interface ThemeOption {
  id: ThemeId;
  swatch: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'auto', swatch: 'linear-gradient(135deg, #f5f4f0 50%, #1a1a1e 50%)' },
  { id: 'word', swatch: '#ffffff' },
  { id: 'vscode', swatch: '#1e1e1e' },
  { id: 'mint', swatch: '#effaf6' },
];

const STORAGE_KEY = 'markdown-editor-theme';
const THEME_IDS = new Set<ThemeId>(THEME_OPTIONS.map((option) => option.id));

function readStoredTheme(): ThemeId {
  const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
  return stored && THEME_IDS.has(stored) ? stored : 'auto';
}

export function isDarkTheme(theme: string | null): boolean {
  return theme === 'dark' || theme === 'vscode';
}

function applyTheme(theme: ThemeId): void {
  const root = document.documentElement;
  const resolvedTheme = theme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  root.setAttribute('data-theme', resolvedTheme);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(readStoredTheme);

  useLayoutEffect(() => {
    applyTheme(theme);
    if (theme !== 'auto') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('auto');
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemeId) => {
    if (!THEME_IDS.has(nextTheme)) return;
    setThemeState(nextTheme);
    localStorage.setItem(STORAGE_KEY, nextTheme);
  }, []);

  return { theme, setTheme };
}
