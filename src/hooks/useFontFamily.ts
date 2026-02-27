import { useState, useCallback } from 'react';

export type FontFamily =
  | 'serif'
  | 'sans'
  | 'mono'
  | 'inter'
  | 'lora'
  | 'noto-serif-sc'
  | 'noto-sans-sc'
  | 'zcool';

export interface FontOption {
  id: FontFamily;
  label: string;
  cssValue: string;
  group: 'en' | 'zh';
}

export const FONT_OPTIONS: FontOption[] = [
  // ── English ──────────────────────────────────────
  { id: 'serif',        label: 'Source Serif 4',  cssValue: 'var(--font-serif)',        group: 'en' },
  { id: 'lora',         label: 'Lora',             cssValue: 'var(--font-lora)',         group: 'en' },
  { id: 'sans',         label: 'DM Sans',          cssValue: 'var(--font-ui)',           group: 'en' },
  { id: 'inter',        label: 'Inter',            cssValue: 'var(--font-inter)',        group: 'en' },
  { id: 'mono',         label: 'JetBrains Mono',  cssValue: 'var(--font-mono)',         group: 'en' },
  // ── Chinese ──────────────────────────────────────
  { id: 'noto-serif-sc', label: '思源宋体',         cssValue: 'var(--font-noto-serif-sc)', group: 'zh' },
  { id: 'noto-sans-sc',  label: '思源黑体',         cssValue: 'var(--font-noto-sans-sc)',  group: 'zh' },
  { id: 'zcool',         label: '站酷小薇体',       cssValue: 'var(--font-zcool)',         group: 'zh' },
];

const STORAGE_KEY = 'markdown-preview-font';

export function useFontFamily() {
  const [fontFamily, setFontFamilyState] = useState<FontFamily>(
    () => (localStorage.getItem(STORAGE_KEY) as FontFamily) || 'serif'
  );

  const setFontFamily = useCallback((font: FontFamily) => {
    setFontFamilyState(font);
    localStorage.setItem(STORAGE_KEY, font);
  }, []);

  const currentOption = FONT_OPTIONS.find(o => o.id === fontFamily) ?? FONT_OPTIONS[0];

  return { fontFamily, currentOption, setFontFamily };
}

