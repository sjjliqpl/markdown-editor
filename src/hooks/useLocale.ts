import { useState, useCallback } from 'react';
import type { Locale } from '../i18n';

const STORAGE_KEY = 'markdown-editor-locale';

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(
    () => (localStorage.getItem(STORAGE_KEY) as Locale) || 'en'
  );

  const toggleLocale = useCallback(() => {
    setLocale(prev => {
      const next: Locale = prev === 'en' ? 'zh' : 'en';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { locale, toggleLocale };
}
