import React, { useRef, useCallback } from 'react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onScroll?: (scrollPercentage: number) => void;
  onImageUpload?: (file: File) => void;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  onScroll,
  onImageUpload,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && onScroll) {
      const { scrollTop, scrollHeight, clientHeight } = textareaRef.current;
      if (scrollHeight - clientHeight > 0) {
        const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
        onScroll(scrollPercentage);
      }
    }
  }, [onScroll]);

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        const imageMarkdown = `\n![${file.name}](${url})\n`;
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newContent =
            value.substring(0, start) +
            imageMarkdown +
            value.substring(end);
          onChange(newContent);
        }
        if (onImageUpload) {
          onImageUpload(file);
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
  };

  // Handle Tab key for indent
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newContent);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }
    }
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
    }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        placeholder="# Start writing your markdown here..."
        style={{
          flex: 1,
          width: '100%',
          padding: '24px 28px',
          fontFamily: 'var(--font-mono)',
          fontSize: '13.5px',
          lineHeight: '1.7',
          color: 'var(--text-primary)',
          background: 'transparent',
          border: 'none',
          resize: 'none',
          outline: 'none',
          caretColor: 'var(--accent)',
          tabSize: 2,
          letterSpacing: '0.01em',
        }}
      />
    </div>
  );
};
