import React, { useState, useCallback, useDeferredValue, useEffect, useMemo } from 'react';
import { Toolbar } from './Toolbar';
import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { useFileSystem } from '../hooks/useFileSystem';
import { useAutoSave } from '../hooks/useAutoSave';
import { useTheme } from '../hooks/useTheme';

const INITIAL_CONTENT = `# Welcome to Markdown Editor

This is a **high-performance** Markdown editor with real-time preview and PDF export.

## Features

- ✨ Real-time preview
- 📁 Open and save files
- 🖨️ Professional PDF export
- 🎨 Syntax highlighting
- 📸 Image paste and upload
- 🔄 Auto-save

## Example Code

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
\`\`\`

## Tables

| Feature | Status |
|---------|--------|
| Preview | ✅ |
| Export | ✅ |
| Auto-save | ✅ |

> Start editing to see changes in real-time!
`;

type ViewMode = 'split' | 'editor' | 'preview';

export const Editor: React.FC = () => {
  const [content, setContent] = useState<string>(
    () => localStorage.getItem('markdown-autosave') || INITIAL_CONTENT
  );
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const deferredContent = useDeferredValue(content);

  const { fileName, openFile, saveFile, saveFileAs } = useFileSystem(
    content,
    setContent
  );

  useAutoSave(content);
  const { themeMode, cycleTheme } = useTheme();

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  const handleExportPDF = useCallback(() => {
    window.print();
  }, []);

  const handleImagePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = items[i].getAsFile();
          if (blob) {
            const url = URL.createObjectURL(blob);
            const imageMarkdown = `\n![image](${url})\n`;
            setContent(content + imageMarkdown);
          }
        }
      }
    },
    [content]
  );

  // Word and character count
  const { wordCount, charCount } = useMemo(() => {
    const trimmed = content.trim();
    if (!trimmed) return { wordCount: 0, charCount: 0 };
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    return { wordCount: words, charCount: content.length };
  }, [content]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        openFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handleExportPDF();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveFile, openFile, handleExportPDF]);

  const showEditor = viewMode === 'split' || viewMode === 'editor';
  const showPreview = viewMode === 'split' || viewMode === 'preview';

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
    }}>
      <Toolbar
        onOpen={openFile}
        onSave={saveFile}
        onSaveAs={saveFileAs}
        onExportPDF={handleExportPDF}
        fileName={fileName}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        wordCount={wordCount}
        charCount={charCount}
        themeMode={themeMode}
        onThemeCycle={cycleTheme}
      />

      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Editor pane */}
        {showEditor && (
          <div
            className="no-print"
            style={{
              width: viewMode === 'split' ? '50%' : '100%',
              borderRight: viewMode === 'split' ? '1px solid var(--border)' : 'none',
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div onPaste={handleImagePaste} style={{ height: '100%' }}>
              <MarkdownEditor
                value={content}
                onChange={handleContentChange}
                onScroll={setScrollPercentage}
              />
            </div>
          </div>
        )}

        {/* Resize handle */}
        {viewMode === 'split' && (
          <div style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: '4px',
            marginLeft: '-2px',
            cursor: 'col-resize',
            zIndex: 10,
            background: 'transparent',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--accent-subtle)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
          />
        )}

        {/* Preview pane */}
        {showPreview && (
          <div id="preview-pane" style={{
            width: viewMode === 'split' ? '50%' : '100%',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: 'fadeIn 0.2s ease-out',
          }}>
            <MarkdownPreview
              content={deferredContent}
              scrollPercentage={viewMode === 'split' ? scrollPercentage : undefined}
            />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="no-print status-bar" style={{
        height: '28px',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#4ade80',
              display: 'inline-block',
            }} />
            Auto-saved
          </span>
          <span>Markdown</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>UTF-8</span>
          <span>{content.split('\n').length} lines</span>
          <span>
            {viewMode === 'split' ? 'Split' : viewMode === 'editor' ? 'Editor' : 'Preview'}
          </span>
        </div>
      </div>
    </div>
  );
};
