import { useState, useCallback } from 'react';

export const useFileSystem = (
  content: string,
  setContent: (content: string) => void
) => {
  const [fileName, setFileName] = useState<string>('Untitled.md');
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);

  const openFile = useCallback(async () => {
    try {
      // 尝试使用 File System Access API
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
        // 降级方案：使用传统的 input file
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
  }, [setContent]);

  const saveFile = useCallback(async () => {
    try {
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
  }, [content, fileHandle]);

  const saveFileAs = useCallback(async () => {
    try {
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
        // 降级方案：使用 Blob 下载
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
  }, [content, fileName]);

  return {
    fileName,
    openFile,
    saveFile,
    saveFileAs,
  };
};
