// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from './useTheme';

const STORAGE_KEY = 'markdown-editor-theme';

function ThemeHarness() {
  const { theme, setTheme } = useTheme();
  return <button onClick={() => setTheme('word')}>{theme}</button>;
}

describe('useTheme', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    });
    document.documentElement.removeAttribute('data-theme');
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists a selected theme and applies it to the document', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => root.render(<ThemeHarness />));
    await act(async () => container.querySelector('button')?.click());

    expect(localStorage.getItem(STORAGE_KEY)).toBe('word');
    expect(document.documentElement.getAttribute('data-theme')).toBe('word');
    expect(container.textContent).toBe('word');

    await act(async () => root.unmount());
  });

  it('falls back to auto when the stored theme is unknown', async () => {
    localStorage.setItem(STORAGE_KEY, 'unknown-theme');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => root.render(<ThemeHarness />));

    expect(container.textContent).toBe('auto');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    await act(async () => root.unmount());
  });
});
