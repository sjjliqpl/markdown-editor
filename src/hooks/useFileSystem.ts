import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { appAPI } from '../lib/appAPI';
import type { UnlistenFn } from '@tauri-apps/api/event';

// Keep Electron type declaration for backward compatibility
declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      openFile: () => Promise<{ filePath: string; fileName: string; content: string } | null>;
      writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
      saveFileAs: (defaultName: string, content: string) => Promise<{ filePath: string; fileName: string } | null>;
      onMenuOpen: (cb: () => void) => void;
      onMenuSave: (cb: () => void) => void;
      onMenuSaveAs: (cb: () => void) => void;
      onFileOpened: (cb: (data: { filePath: string; fileName: string; content: string }) => void) => void;
      removeMenuListeners: () => void;
    };
  }
}

export const useFileSystem = (
  content: string,
  setContent: (content: string) => void,
  onExternalOpen?: () => void,
) => {
  const [fileName, setFileName] = useState<string>('Untitled.md');
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [nativeFilePath, setNativeFilePath] = useState<string | null>(null);

  const onExternalOpenRef = useRef(onExternalOpen);
  onExternalOpenRef.current = onExternalOpen;

  const isNative = typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || !!window.electronAPI);

  const fileDir = useMemo(() => {
    if (!nativeFilePath) return null;
    const lastSep = Math.max(nativeFilePath.lastIndexOf('/'), nativeFilePath.lastIndexOf('\\'));
    return lastSep > 0 ? nativeFilePath.substring(0, lastSep) : null;
  }, [nativeFilePath]);

  // --- Stable refs so menu listeners never need to re-subscribe ---
  const contentRef = useRef(content);
  contentRef.current = content;
  const fileNameRef = useRef(fileName);
  fileNameRef.current = fileName;
  const fileHandleRef = useRef(fileHandle);
  fileHandleRef.current = fileHandle;
  const nativeFilePathRef = useRef(nativeFilePath);
  nativeFilePathRef.current = nativeFilePath;
  // ----------------------------------------------------------------

  const openFile = useCallback(async () => {
    try {
      if (isNative) {
        const result = await appAPI.openFile();
        if (result) {
          setContent(result.content);
          setFileName(result.fileName);
          setNativeFilePath(result.filePath);
          setFileHandle(null);
          // Switch to preview+TOC just like when opening via file association
          onExternalOpenRef.current?.();
        }
        return;
      }

      if ('showOpenFilePicker' in window) {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'Markdown Files',
              accept: {
                'text/markdown': ['.md', '.markdown'],
                'text/plain': ['.txt'],
              },
            },
          ],
        });
        const file = await handle.getFile();
        const text = await file.text();
        setContent(text);
        setFileName(file.name);
        setFileHandle(handle);
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md,.markdown,.txt';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const text = await file.text();
            setContent(text);
            setFileName(file.name);
          }
        };
        input.click();
      }
    } catch (err) {
      console.error('Error opening file:', err);
    }
  }, [setContent, isNative]);

  const saveFileAs = useCallback(async () => {
    try {
      if (isNative) {
        const result = await appAPI.saveFileAs(fileNameRef.current, contentRef.current);
        if (result) {
          setFileName(result.fileName);
          setNativeFilePath(result.filePath);
        }
        return;
      }

      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileNameRef.current,
          types: [{ description: 'Markdown Files', accept: { 'text/markdown': ['.md'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(contentRef.current);
        await writable.close();
        setFileHandle(handle);
        setFileName(handle.name);
      } else {
        const blob = new Blob([contentRef.current], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileNameRef.current;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error saving file:', err);
    }
  }, [isNative]);

  const saveFile = useCallback(async () => {
    try {
      if (isNative) {
        if (nativeFilePathRef.current) {
          await appAPI.writeFile(nativeFilePathRef.current, contentRef.current);
        } else {
          await saveFileAs();
        }
        return;
      }
      if (fileHandleRef.current) {
        const writable = await fileHandleRef.current.createWritable();
        await writable.write(contentRef.current);
        await writable.close();
      } else {
        await saveFileAs();
      }
    } catch (err) {
      console.error('Error saving file:', err);
      await saveFileAs();
    }
  }, [isNative, saveFileAs]);

  // Wire up native app menu events — runs only once (stable refs used inside)
  useEffect(() => {
    if (!isNative) return;

    const unlisteners: UnlistenFn[] = [];
    let cancelled = false;

    (async () => {
      const fns = await Promise.all([
        appAPI.onMenuOpen(() => openFile()),
        appAPI.onMenuSave(() => saveFile()),
        appAPI.onMenuSaveAs(() => saveFileAs()),
        appAPI.onMenuPrint(async () => {
          await appAPI.nativePrint();
        }),
        appAPI.onFileOpened((data) => {
          setContent(data.content);
          setFileName(data.fileName);
          setNativeFilePath(data.filePath);
          setFileHandle(null);
          onExternalOpenRef.current?.();
        }),
      ]);
      if (!cancelled) {
        unlisteners.push(...fns);
      } else {
        // Effect was already cleaned up — immediately unlisten
        fns.forEach((fn) => fn());
      }
    })();

    return () => {
      cancelled = true;
      unlisteners.forEach((fn) => fn());
      if (window.electronAPI?.removeMenuListeners) {
        window.electronAPI.removeMenuListeners();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNative]); // Intentionally stable — callbacks access current values via refs

  return { fileName, fileDir, openFile, saveFile, saveFileAs };
};

