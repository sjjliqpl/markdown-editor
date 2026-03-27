import { useState, useCallback, useEffect } from 'react';

// Type definition for Electron IPC bridge injected by preload.cjs
declare global {
  interface Window {
    electronAPI?: {
      openFile: () => Promise<{ filePath: string; fileName: string; content: string } | null>;
      writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
      saveFileAs: (defaultName: string, content: string) => Promise<{ filePath: string; fileName: string } | null>;
      onMenuOpen: (cb: () => void) => void;
      onMenuSave: (cb: () => void) => void;
      onMenuSaveAs: (cb: () => void) => void;
      removeMenuListeners: () => void;
    };
  }
}

export const useFileSystem = (
  content: string,
  setContent: (content: string) => void
) => {
  const [fileName, setFileName] = useState<string>('Untitled.md');
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  // Track native file path when running inside Electron
  const [nativeFilePath, setNativeFilePath] = useState<string | null>(null);

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  const openFile = useCallback(async () => {
    try {
      if (isElectron) {
        const result = await window.electronAPI!.openFile();
        if (result) {
          setContent(result.content);
          setFileName(result.fileName);
          setNativeFilePath(result.filePath);
          setFileHandle(null);
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
  }, [setContent, isElectron]);

  const saveFileAs = useCallback(async () => {
    try {
      if (isElectron) {
        const result = await window.electronAPI!.saveFileAs(fileName, content);
        if (result) {
          setFileName(result.fileName);
          setNativeFilePath(result.filePath);
        }
        return;
      }

      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'Markdown Files',
              accept: { 'text/markdown': ['.md'] },
            },
          ],
        });

        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        setFileHandle(handle);
        setFileName(handle.name);
      } else {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error saving file:', err);
    }
  }, [content, fileName, isElectron]);

  const saveFile = useCallback(async () => {
    try {
      if (isElectron) {
        if (nativeFilePath) {
          await window.electronAPI!.writeFile(nativeFilePath, content);
        } else {
          await saveFileAs();
        }
        return;
      }

      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        await saveFileAs();
      }
    } catch (err) {
      console.error('Error saving file:', err);
      await saveFileAs();
    }
  }, [content, fileHandle, nativeFilePath, saveFileAs, isElectron]);

  // Wire up native app menu events from Electron
  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI!.onMenuOpen(openFile);
    window.electronAPI!.onMenuSave(saveFile);
    window.electronAPI!.onMenuSaveAs(saveFileAs);
    return () => window.electronAPI!.removeMenuListeners();
  }, [isElectron, openFile, saveFile, saveFileAs]);

  return {
    fileName,
    openFile,
    saveFile,
    saveFileAs,
  };
};
