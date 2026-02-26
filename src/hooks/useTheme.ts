import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light' | 'auto';

const STORAGE_KEY = 'markdown-editor-theme';

function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const isDark = mode === 'dark' || (mode === 'auto' && prefersDark);
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    () => (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'auto'
  );

  // Apply theme whenever mode changes
  useEffect(() => {
    applyTheme(themeMode);
    localStorage.setItem(STORAGE_KEY, themeMode);
  }, [themeMode]);

  // Listen to OS preference changes when in auto mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (themeMode === 'auto') applyTheme('auto');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themeMode]);

  const cycleTheme = useCallback(() => {
    setThemeMode(prev => {
      if (prev === 'auto') return 'dark';
      if (prev === 'dark') return 'light';
      return 'auto';
    });
  }, []);

  return { themeMode, setThemeMode, cycleTheme };
}
