import React, { useState, useCallback, useDeferredValue, useEffect, useMemo, useRef, useTransition } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Toolbar } from './Toolbar';
import { MarkdownEditor } from './MarkdownEditor';
import type { MarkdownEditorHandle } from './MarkdownEditor';
import { MarkdownPreview } from './MarkdownPreview';
import type { MarkdownPreviewHandle } from './MarkdownPreview';
import { TableOfContents } from './TableOfContents';
import { useFileSystem } from '../hooks/useFileSystem';
import { useAutoSave } from '../hooks/useAutoSave';
import { useTheme } from '../hooks/useTheme';
import { useLocale } from '../hooks/useLocale';
import { useFontFamily } from '../hooks/useFontFamily';
import { useToc } from '../hooks/useToc';
import { t } from '../i18n';

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
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const deferredContent = useDeferredValue(content);

  const [isPending, startTransition] = useTransition();

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    startTransition(() => {
      setViewMode(mode);
    });
  }, []);

  const { fileName, openFile, saveFile, saveFileAs } = useFileSystem(
    content,
    setContent
  );

  useAutoSave(content);
  const { themeMode, cycleTheme: cycleThemeRaw } = useTheme();
  const { locale, toggleLocale } = useLocale();
  const { fontFamily, setFontFamily: setFontFamilyRaw } = useFontFamily();

  const cycleTheme = useCallback(() => {
    startTransition(() => {
      cycleThemeRaw();
    });
  }, [cycleThemeRaw]);

  const setFontFamily = useCallback((font: Parameters<typeof setFontFamilyRaw>[0]) => {
    startTransition(() => {
      setFontFamilyRaw(font);
    });
  }, [setFontFamilyRaw]);
  const [showToc, setShowToc] = useState<boolean>(
    () => localStorage.getItem('markdown-toc-open') === 'true'
  );
  const tocItems = useToc(deferredContent);

  const editorRef = useRef<MarkdownEditorHandle>(null);
  const previewRef = useRef<MarkdownPreviewHandle>(null);
  const [editorTopLine, setEditorTopLine] = useState(0);

  const handleScrollToEditorLine = useCallback((lineNumber: number) => {
    editorRef.current?.scrollToLine(lineNumber);
  }, []);

  const handleTocToggle = useCallback(() => {
    setShowToc(prev => {
      const next = !prev;
      localStorage.setItem('markdown-toc-open', String(next));
      return next;
    });
  }, []);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  const handleExportImage = useCallback(async () => {
    const tr = t(locale);
    // Use the inner scrollable preview element to capture full content height
    const previewEl = document.getElementById('markdown-preview') as HTMLDivElement | null;
    if (!previewEl) {
      alert(tr.exportImageNoPreview);
      return;
    }
    // Temporarily expand the element to its full scroll height so html2canvas
    // captures all content, not just the visible viewport portion.
    const originalHeight = previewEl.style.height;
    const originalOverflow = previewEl.style.overflowY;
    const originalMaxHeight = previewEl.style.maxHeight;
    previewEl.style.height = previewEl.scrollHeight + 'px';
    previewEl.style.overflowY = 'visible';
    previewEl.style.maxHeight = 'none';
    try {
      const bgColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--bg-surface').trim() || '#ffffff';
      const canvas = await html2canvas(previewEl, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: bgColor,
        height: previewEl.scrollHeight,
        windowHeight: previewEl.scrollHeight,
        scrollY: -window.scrollY,
      });
      const link = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const baseName = fileName.replace(/\.[^.]+$/, '') || `Untitled_${date}`;
      link.download = `${baseName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export image failed:', err);
      alert(tr.exportImageFailed);
    } finally {
      // Always restore the original styles
      previewEl.style.height = originalHeight;
      previewEl.style.overflowY = originalOverflow;
      previewEl.style.maxHeight = originalMaxHeight;
    }
  }, [fileName, locale]);

  const handleExportPdfFile = useCallback(async () => {
    const tr = t(locale);
    const previewEl = document.getElementById('markdown-preview') as HTMLDivElement | null;
    if (!previewEl) {
      alert(tr.exportPdfNoPreview);
      return;
    }
    const originalHeight = previewEl.style.height;
    const originalOverflow = previewEl.style.overflowY;
    const originalMaxHeight = previewEl.style.maxHeight;
    previewEl.style.height = previewEl.scrollHeight + 'px';
    previewEl.style.overflowY = 'visible';
    previewEl.style.maxHeight = 'none';
    try {
      const bgColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--bg-surface').trim() || '#ffffff';
      const canvas = await html2canvas(previewEl, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: bgColor,
        height: previewEl.scrollHeight,
        windowHeight: previewEl.scrollHeight,
        scrollY: -window.scrollY,
      });
      // A4 dimensions in mm
      const A4_WIDTH_MM = 210;
      const A4_HEIGHT_MM = 297;
      const MARGIN_MM = 20;
      const contentWidth = A4_WIDTH_MM - MARGIN_MM * 2;
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgHeight / imgWidth;
      const pdfImgWidth = contentWidth;
      const pdfImgHeight = pdfImgWidth * ratio;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageContentHeight = A4_HEIGHT_MM - MARGIN_MM * 2;
      let yOffset = 0;
      let pageIndex = 0;
      while (yOffset < pdfImgHeight) {
        if (pageIndex > 0) pdf.addPage();
        // Crop canvas slice for this page
        const sliceHeightPx = Math.round((pageContentHeight / pdfImgHeight) * imgHeight);
        const yOffsetPx = Math.round((yOffset / pdfImgHeight) * imgHeight);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgWidth;
        sliceCanvas.height = Math.min(sliceHeightPx, imgHeight - yOffsetPx);
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, yOffsetPx, imgWidth, sliceCanvas.height, 0, 0, imgWidth, sliceCanvas.height);
        }
        const sliceDataUrl = sliceCanvas.toDataURL('image/png');
        const sliceHeightMm = (sliceCanvas.height / imgHeight) * pdfImgHeight;
        pdf.addImage(sliceDataUrl, 'PNG', MARGIN_MM, MARGIN_MM, pdfImgWidth, sliceHeightMm);
        yOffset += pageContentHeight;
        pageIndex++;
      }
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const baseName = fileName.replace(/\.[^.]+$/, '') || `Untitled_${dateStr}`;
      pdf.save(`${baseName}.pdf`);
    } catch (err) {
      console.error('Export PDF failed:', err);
      alert(tr.exportPdfFailed);
    } finally {
      previewEl.style.height = originalHeight;
      previewEl.style.overflowY = originalOverflow;
      previewEl.style.maxHeight = originalMaxHeight;
    }
  }, [fileName, locale]);

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
        handleExportPdfFile();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveFile, openFile, handleExportPdfFile]);

  const showEditor = viewMode === 'split' || viewMode === 'editor';
  const showPreview = viewMode === 'split' || viewMode === 'preview';

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
    }}>
      {/* Loading overlay during heavy transitions */}
      {isPending && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.18)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            animation: 'fadeIn 0.1s ease-out',
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 28px',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              style={{ animation: 'spin 0.8s linear infinite' }}
            >
              <circle
                cx="12" cy="12" r="10"
                stroke="var(--border)"
                strokeWidth="2.5"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <span style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-ui)',
              whiteSpace: 'nowrap',
            }}>
              {locale === 'zh' ? '正在渲染…' : 'Rendering…'}
            </span>
          </div>
        </div>
      )}
      <Toolbar
        onOpen={openFile}
        onSave={saveFile}
        onSaveAs={saveFileAs}
        onExportPdfFile={handleExportPdfFile}
        onExportImage={handleExportImage}
        fileName={fileName}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        wordCount={wordCount}
        charCount={charCount}
        themeMode={themeMode}
        onThemeCycle={cycleTheme}
        locale={locale}
        onToggleLocale={toggleLocale}
        fontFamily={fontFamily}
        onFontChange={setFontFamily}
        showToc={showToc}
        onTocToggle={handleTocToggle}
      />

      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* TOC panel — visible in all view modes */}
        {showToc && (
          <TableOfContents
            items={tocItems}
            open={showToc}
            onClose={() => {
              setShowToc(false);
              localStorage.setItem('markdown-toc-open', 'false');
            }}
            previewPaneId="markdown-preview"
            previewRef={previewRef}
            onScrollToEditorLine={showEditor ? handleScrollToEditorLine : undefined}
            editorTopLine={showEditor ? editorTopLine : undefined}
            hasPreview={showPreview}
          />
        )}
        {/* Editor pane */}
        {showEditor && (
          <div
            className="no-print"
            style={{
              flex: 1,
              minWidth: 0,
              borderRight: viewMode === 'split' ? '1px solid var(--border)' : 'none',
              transition: 'flex 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div onPaste={handleImagePaste} style={{ height: '100%' }}>
              <MarkdownEditor
                ref={editorRef}
                value={content}
                onChange={handleContentChange}
                onScroll={viewMode === 'split' ? (pct) => previewRef.current?.scrollToPercentage(pct) : undefined}
                onTopLineChange={setEditorTopLine}
              />
            </div>
          </div>
        )}

        {/* Preview pane */}
        {showPreview && (
          <div id="preview-pane" style={{
            flex: 1,
            minWidth: 0,
            transition: 'flex 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s ease',
            animation: 'fadeIn 0.2s ease-out',
            opacity: content !== deferredContent ? 0.6 : 1,
          }}>
            <MarkdownPreview
              ref={previewRef}
              content={deferredContent}
              fontFamily={fontFamily}
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
        {(() => {
          const tr = t(locale);
          return (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#4ade80',
                    display: 'inline-block',
                  }} />
                  {tr.autoSaved}
                </span>
                <span>{tr.markdown}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span>UTF-8</span>
                <span>{content.split('\n').length} {tr.lines}</span>
                <span>
                  {viewMode === 'split' ? tr.modeSplit : viewMode === 'editor' ? tr.modeEditor : tr.modePreview}
                </span>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};
