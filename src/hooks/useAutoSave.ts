import { useEffect } from 'react';

const AUTOSAVE_KEY = 'markdown-autosave';
const AUTOSAVE_DELAY = 2000; // 2 seconds

export const useAutoSave = (content: string) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(AUTOSAVE_KEY, content);
    }, AUTOSAVE_DELAY);

    return () => clearTimeout(timer);
  }, [content]);
};
