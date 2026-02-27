import React, { useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { FormatToolbar } from './FormatToolbar';
import { useHistory } from '../hooks/useHistory';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onScroll?: (scrollPercentage: number) => void;
  onImageUpload?: (file: File) => void;
  /** Called when the topmost visible line in the editor changes */
  onTopLineChange?: (lineNumber: number) => void;
}

export interface MarkdownEditorHandle {
  /** Scroll the editor so that the given 0-based line number is at the top */
  scrollToLine: (lineNumber: number) => void;
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(({
  value,
  onChange,
  onScroll,
  onImageUpload,
  onTopLineChange,
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { canUndo, canRedo, pushHistory, undo, redo } = useHistory(value);

  // Debounce timer ref for history push
  const historyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Compute the line-height of the textarea by measuring a single line */
  const getLineHeight = useCallback((): number => {
    const textarea = textareaRef.current;
    if (!textarea) return 22.95; // fallback: 13.5px * 1.7
    const computed = getComputedStyle(textarea);
    const lh = parseFloat(computed.lineHeight);
    if (!isNaN(lh) && lh > 0) return lh;
    // fallback: fontSize * lineHeight ratio
    const fs = parseFloat(computed.fontSize) || 13.5;
    return fs * 1.7;
  }, []);

  /** Scroll the textarea so the given 0-based line number is at the top */
  const scrollToLine = useCallback((lineNumber: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const lineH = getLineHeight();
    const paddingTop = parseFloat(getComputedStyle(textarea).paddingTop) || 24;
    const targetScrollTop = lineNumber * lineH - paddingTop;
    textarea.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
  }, [getLineHeight]);

  useImperativeHandle(ref, () => ({ scrollToLine }), [scrollToLine]);

  const handleScroll = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { scrollTop, scrollHeight, clientHeight } = textarea;

    // Report scroll percentage for preview sync
    if (onScroll && scrollHeight - clientHeight > 0) {
      const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
      onScroll(scrollPercentage);
    }

    // Report the top visible line number to parent
    if (onTopLineChange) {
      const lineH = getLineHeight();
      const paddingTop = parseFloat(getComputedStyle(textarea).paddingTop) || 24;
      const topLine = Math.floor((scrollTop + paddingTop) / lineH);
      onTopLineChange(Math.max(0, topLine));
    }
  }, [onScroll, onTopLineChange, getLineHeight]);

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
          const newContent = value.substring(0, start) + imageMarkdown + value.substring(end);
          onChange(newContent);
          pushHistory(newContent, start + imageMarkdown.length, start + imageMarkdown.length);
        }
        if (onImageUpload) onImageUpload(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
  };

  // Called by textarea onChange — debounce history push
  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
      if (historyTimer.current) clearTimeout(historyTimer.current);
      historyTimer.current = setTimeout(() => {
        const textarea = textareaRef.current;
        pushHistory(newValue, textarea?.selectionStart ?? 0, textarea?.selectionEnd ?? 0);
      }, 500);
    },
    [onChange, pushHistory]
  );

  const handleUndo = useCallback(() => {
    const state = undo();
    if (!state) return;
    onChange(state.value);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(state.selStart, state.selEnd);
    });
  }, [undo, onChange]);

  const handleRedo = useCallback(() => {
    const state = redo();
    if (!state) return;
    onChange(state.value);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(state.selStart, state.selEnd);
    });
  }, [redo, onChange]);

  // Push history immediately after format-toolbar actions (value changes from outside)
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      // Format toolbar already called pushHistory via applyFormat; skip debounce
    }
  }, [value]);

  // Handle Tab key for indent + Cmd/Ctrl+Z/Y shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newContent);
        pushHistory(newContent, start + 2, start + 2);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }
    } else if (mod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    } else if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      handleRedo();
    } else if (mod && e.key === 'b') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const s = textarea.selectionStart;
        const en = textarea.selectionEnd;
        const selected = value.substring(s, en) || 'bold text';
        const newValue = value.substring(0, s) + '**' + selected + '**' + value.substring(en);
        onChange(newValue);
        pushHistory(newValue, s + 2, s + 2 + selected.length);
        requestAnimationFrame(() => {
          textarea.setSelectionRange(s + 2, s + 2 + selected.length);
        });
      }
    } else if (mod && e.key === 'i') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const s = textarea.selectionStart;
        const en = textarea.selectionEnd;
        const selected = value.substring(s, en) || 'italic text';
        const newValue = value.substring(0, s) + '*' + selected + '*' + value.substring(en);
        onChange(newValue);
        pushHistory(newValue, s + 1, s + 1 + selected.length);
        requestAnimationFrame(() => {
          textarea.setSelectionRange(s + 1, s + 1 + selected.length);
        });
      }
    }
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (historyTimer.current) clearTimeout(historyTimer.current);
    };
  }, []);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
    }}>
      <FormatToolbar
        textareaRef={textareaRef}
        value={value}
        onChange={onChange}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        pushHistory={pushHistory}
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
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
});

MarkdownEditor.displayName = 'MarkdownEditor';
