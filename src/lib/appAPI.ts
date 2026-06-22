/**
 * Unified API abstraction layer.
 * - In Tauri: delegates to invoke() / listen()
 * - In Electron: delegates to window.electronAPI if available
 */
import { invoke } from '@tauri-apps/api/core';
import type { EventCallback, EventName, UnlistenFn } from '@tauri-apps/api/event';

export interface FileResult {
  filePath: string;
  fileName: string;
  content: string;
}

export interface SaveResult {
  filePath: string;
  fileName: string;
}

export interface WriteResult {
  success: boolean;
  error?: string;
}

// Detect runtime context
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;
export const isDesktop = isTauri || isElectron;

async function listenCurrentWebviewWindow<T>(
  event: EventName,
  handler: EventCallback<T>,
): Promise<UnlistenFn> {
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  return getCurrentWebviewWindow().listen<T>(event, handler);
}

export const appAPI = {
  platform: isTauri
    ? (navigator.userAgent.toLowerCase().includes('mac') ? 'darwin' : 'other')
    : (isElectron ? (window as any).electronAPI?.platform : 'other'),

  openFile: async (): Promise<FileResult | null> => {
    if (isTauri) {
      return invoke<FileResult | null>('open_file');
    }
    if (isElectron) {
      return (window as any).electronAPI.openFile();
    }
    return null;
  },

  writeFile: async (path: string, content: string): Promise<WriteResult> => {
    if (isTauri) {
      return invoke<WriteResult>('write_file', { path, content });
    }
    if (isElectron) {
      return (window as any).electronAPI.writeFile(path, content);
    }
    return { success: false, error: 'No native API available' };
  },

  saveFileAs: async (defaultName: string, content: string): Promise<SaveResult | null> => {
    if (isTauri) {
      return invoke<SaveResult | null>('save_file_as', { defaultName, content });
    }
    if (isElectron) {
      return (window as any).electronAPI.saveFileAs(defaultName, content);
    }
    return null;
  },

  setWindowTitle: async (title: string): Promise<void> => {
    document.title = title;
    if (isTauri) {
      await invoke('set_window_title', { title });
    }
  },

  nativePrint: async (): Promise<void> => {
    if (isTauri) {
      try {
        await invoke('plugin:webview|print');
      } catch {
        window.print();
      }
    } else {
      window.print();
    }
  },

  /** Check if this window was opened with a file (via file association / double-click). */
  getPendingFile: async (): Promise<FileResult | null> => {
    if (isTauri) {
      return invoke<FileResult | null>('get_pending_file');
    }
    return null;
  },

  // ── Menu event listeners ──

  onMenuOpen: (callback: () => void): Promise<UnlistenFn> => {
    if (isTauri) return listenCurrentWebviewWindow('menu:open', callback);
    if (isElectron) {
      (window as any).electronAPI.onMenuOpen(callback);
      return Promise.resolve(() => {});
    }
    return Promise.resolve(() => {});
  },

  onMenuSave: (callback: () => void): Promise<UnlistenFn> => {
    if (isTauri) return listenCurrentWebviewWindow('menu:save', callback);
    if (isElectron) {
      (window as any).electronAPI.onMenuSave(callback);
      return Promise.resolve(() => {});
    }
    return Promise.resolve(() => {});
  },

  onMenuSaveAs: (callback: () => void): Promise<UnlistenFn> => {
    if (isTauri) return listenCurrentWebviewWindow('menu:saveAs', callback);
    if (isElectron) {
      (window as any).electronAPI.onMenuSaveAs(callback);
      return Promise.resolve(() => {});
    }
    return Promise.resolve(() => {});
  },

  onMenuPrint: (callback: () => void): Promise<UnlistenFn> => {
    if (isTauri) return listenCurrentWebviewWindow('menu:print', callback);
    return Promise.resolve(() => {});
  },

  onMenuExportImage: (callback: () => void): Promise<UnlistenFn> => {
    if (isTauri) return listenCurrentWebviewWindow('menu:exportImage', callback);
    return Promise.resolve(() => {});
  },

  onMenuViewMode: (callback: (mode: string) => void): Promise<UnlistenFn> => {
    if (isTauri) return listenCurrentWebviewWindow<string>('menu:viewMode', (e) => callback(e.payload));
    return Promise.resolve(() => {});
  },

  onMenuToggleToc: (callback: () => void): Promise<UnlistenFn> => {
    if (isTauri) return listenCurrentWebviewWindow('menu:toggleToc', callback);
    return Promise.resolve(() => {});
  },

  onMenuToggleLocale: (callback: () => void): Promise<UnlistenFn> => {
    if (isTauri) return listenCurrentWebviewWindow('menu:toggleLocale', callback);
    return Promise.resolve(() => {});
  },

  onMenuFontChange: (callback: (fontId: string) => void): Promise<UnlistenFn> => {
    if (isTauri) return listenCurrentWebviewWindow<string>('menu:fontChange', (e) => callback(e.payload));
    return Promise.resolve(() => {});
  },

  onFileOpened: (callback: (file: FileResult) => void): Promise<UnlistenFn> => {
    if (isTauri) return listenCurrentWebviewWindow<FileResult>('file:opened', (event) => callback(event.payload));
    if (isElectron) {
      (window as any).electronAPI.onFileOpened(callback);
      return Promise.resolve(() => {});
    }
    return Promise.resolve(() => {});
  },
};
