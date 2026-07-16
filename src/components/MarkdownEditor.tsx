import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView, ViewUpdate, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor } from '@codemirror/view';
import { EditorState, type Extension, Prec } from '@codemirror/state';
import { bracketMatching, defaultHighlightStyle, HighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo, undoDepth, redoDepth } from '@codemirror/commands';
import { findNext, findPrevious, openSearchPanel, search, searchKeymap } from '@codemirror/search';
import { tags as highlightTags } from '@lezer/highlight';
import { BOLD_COMMAND, FormatToolbar, ITALIC_COMMAND, type FormatCommand } from './FormatToolbar';
import { createSearchPanel, showReplaceControls, updateSearchPanelLocale } from './SearchPanel';
import type { Locale } from '../i18n';
import { isTauri } from '../lib/appAPI';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onScroll?: (scrollPercentage: number) => void;
  onImageUpload?: (file: File) => void;
  /** Called when the topmost visible line in the editor changes */
  onTopLineChange?: (lineNumber: number) => void;
  locale: Locale;
  onReady?: () => void;
}

export type SearchAction = 'find' | 'replace' | 'next' | 'previous';

export interface MarkdownEditorHandle {
  /** Scroll the editor so that the given 0-based line number is at the top */
  scrollToLine: (lineNumber: number) => void;
  runSearchAction: (action: SearchAction) => void;
}

const EDITOR_PLACEHOLDER = '# Start writing your markdown here...';

const codeMirrorTheme = EditorView.theme({
  '&': {
    height: '100%',
    width: '100%',
    color: 'var(--text-primary)',
    backgroundColor: 'transparent',
    fontFamily: 'var(--font-mono)',
    fontSize: '13.5px',
  },
  '.cm-scroller': {
    height: '100%',
    overflow: 'auto',
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.7',
  },
  '.cm-content': {
    minHeight: '100%',
    padding: '12px 28px 24px 0',
    caretColor: 'var(--accent)',
  },
  '.cm-line': {
    padding: '0 2px',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-muted)',
    borderRight: '1px solid var(--border-subtle)',
    padding: '0 6px 0 8px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--accent-subtle)',
    color: 'var(--accent)',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    background: 'var(--selection-bg)',
  },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    background: 'var(--selection-bg)',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--accent)',
  },
  '.cm-matchingBracket, .cm-nonmatchingBracket': {
    backgroundColor: 'var(--accent-subtle)',
    outline: '1px solid var(--accent)',
  },
  '.cm-placeholder': {
    color: 'var(--text-muted)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
  },
  '.cm-panels': {
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
  },
  '.cm-search-panel': {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '8px 10px',
    borderBottom: '1px solid var(--border)',
    fontFamily: 'var(--font-ui)',
  },
  '.cm-search-row': {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  '.cm-search-replace-row[hidden]': {
    display: 'none',
  },
  '.cm-search-input': {
    minWidth: '120px',
    flex: '1 1 220px',
    height: '28px',
    padding: '0 9px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  '.cm-search-input:focus': {
    borderColor: 'var(--accent)',
    boxShadow: '0 0 0 2px var(--accent-subtle)',
  },
  '.cm-search-status': {
    minWidth: '48px',
    color: 'var(--text-muted)',
    fontSize: '11px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  '.cm-search-status.is-error': {
    minWidth: '120px',
    color: '#ef4444',
  },
  '.cm-search-button': {
    height: '28px',
    padding: '0 9px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
    whiteSpace: 'nowrap',
  },
  '.cm-search-button:hover': {
    background: 'var(--bg-hover)',
    color: 'var(--text-primary)',
  },
  '.cm-search-icon-button, .cm-search-option': {
    minWidth: '28px',
    padding: '0 6px',
  },
  '.cm-search-option[aria-pressed=true]': {
    borderColor: 'var(--accent)',
    background: 'var(--accent-subtle)',
    color: 'var(--accent)',
  },
  '.cm-search-close': {
    marginLeft: 'auto',
    fontSize: '18px',
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(226, 163, 54, 0.28)',
    outline: '1px solid rgba(226, 163, 54, 0.55)',
    borderRadius: '2px',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'rgba(96, 165, 250, 0.42)',
    outline: '2px solid #60a5fa',
  },
}, { dark: true });

const markdownHighlightStyle = syntaxHighlighting(defaultHighlightStyle, { fallback: true });

const markdownSyntaxTheme = syntaxHighlighting(HighlightStyle.define([
  { tag: highlightTags.heading1, color: 'var(--accent)', fontWeight: '700', fontSize: '1.25em' },
  { tag: highlightTags.heading2, color: 'var(--accent)', fontWeight: '700', fontSize: '1.16em' },
  { tag: highlightTags.heading3, color: 'var(--accent)', fontWeight: '700', fontSize: '1.08em' },
  { tag: highlightTags.heading, color: 'var(--accent)', fontWeight: '700' },
  { tag: highlightTags.strong, color: 'var(--text-primary)', fontWeight: '700' },
  { tag: highlightTags.emphasis, color: 'var(--text-primary)', fontStyle: 'italic' },
  { tag: highlightTags.link, color: 'var(--accent)', textDecoration: 'underline' },
  { tag: highlightTags.url, color: 'var(--accent-hover)' },
  { tag: highlightTags.monospace, color: 'var(--accent)' },
  { tag: highlightTags.quote, color: 'var(--text-secondary)', fontStyle: 'italic' },
  { tag: highlightTags.meta, color: 'var(--text-muted)' },
]), { fallback: true });

function insertImageMarkdown(view: EditorView, markdownText: string) {
  const selection = view.state.selection.main;
  view.dispatch({
    changes: { from: selection.from, to: selection.to, insert: markdownText },
    selection: { anchor: selection.from + markdownText.length },
    scrollIntoView: true,
  });
  view.focus();
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(({
  value,
  onChange,
  onScroll,
  onImageUpload,
  onTopLineChange,
  locale,
  onReady,
}, ref) => {
  const codeMirrorRef = useRef<ReactCodeMirrorRef>(null);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  const getView = useCallback(() => codeMirrorRef.current?.view ?? null, []);

  useEffect(() => {
    const view = getView();
    if (view) updateSearchPanelLocale(view, locale);
  }, [getView, locale]);

  const updateHistoryState = useCallback((state: EditorState) => {
    setHistoryState((current) => {
      const next = {
        canUndo: undoDepth(state) > 0,
        canRedo: redoDepth(state) > 0,
      };
      return current.canUndo === next.canUndo && current.canRedo === next.canRedo ? current : next;
    });
  }, []);

  const reportScrollPosition = useCallback((view: EditorView) => {
    const { scrollTop, scrollHeight, clientHeight } = view.scrollDOM;

    if (onScroll && scrollHeight - clientHeight > 0) {
      onScroll(scrollTop / (scrollHeight - clientHeight));
    }

    if (onTopLineChange) {
      const pos = view.posAtCoords({
        x: view.contentDOM.getBoundingClientRect().left + 1,
        y: view.scrollDOM.getBoundingClientRect().top + 1,
      }) ?? 0;
      onTopLineChange(Math.max(0, view.state.doc.lineAt(pos).number - 1));
    }
  }, [onScroll, onTopLineChange]);

  const scrollToLine = useCallback((lineNumber: number) => {
    const view = getView();
    if (!view) return;
    const line = view.state.doc.line(Math.min(view.state.doc.lines, Math.max(1, lineNumber + 1)));
    view.dispatch({
      effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 12 }),
    });
    view.focus();
  }, [getView]);

  const runSearchAction = useCallback((action: SearchAction) => {
    const view = getView();
    if (!view) return;
    if (action === 'next') {
      findNext(view);
    } else if (action === 'previous') {
      findPrevious(view);
    } else {
      openSearchPanel(view);
      showReplaceControls(view, action === 'replace');
    }
  }, [getView]);

  useImperativeHandle(ref, () => ({ scrollToLine, runSearchAction }), [runSearchAction, scrollToLine]);

  const applyCommand = useCallback((command: FormatCommand) => {
    const view = getView();
    if (!view) return;
    const selection = view.state.selection.main;
    const commandRange = {
      from: selection.from,
      to: selection.to,
    };
    let selectedText = view.state.doc.sliceString(selection.from, selection.to);
    const preview = command(selectedText);

    if (preview.lineMode) {
      const fromLine = view.state.doc.lineAt(selection.from);
      const toLine = view.state.doc.lineAt(selection.to);
      commandRange.from = fromLine.from;
      commandRange.to = toLine.to;
      selectedText = view.state.doc.sliceString(commandRange.from, commandRange.to);
    }

    const { insert, anchor, head } = command(selectedText);
    const anchorPos = commandRange.from + anchor;
    const headPos = commandRange.from + head;

    view.dispatch({
      changes: { from: commandRange.from, to: commandRange.to, insert },
      selection: { anchor: anchorPos, head: headPos },
      scrollIntoView: true,
    });
    view.focus();
    updateHistoryState(view.state);
  }, [getView, updateHistoryState]);

  const handleUndo = useCallback(() => {
    const view = getView();
    if (!view) return;
    undo(view);
    updateHistoryState(view.state);
    view.focus();
  }, [getView, updateHistoryState]);

  const handleRedo = useCallback(() => {
    const view = getView();
    if (!view) return;
    redo(view);
    updateHistoryState(view.state);
    view.focus();
  }, [getView, updateHistoryState]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const view = getView();
    if (!view) return;

    const images = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
    if (images.length === 0) return;

    event.preventDefault();
    const markdownText = images
      .map((file) => {
        if (onImageUpload) onImageUpload(file);
        return `\n![${file.name}](${URL.createObjectURL(file)})\n`;
      })
      .join('');
    insertImageMarkdown(view, markdownText);
  }, [getView, onImageUpload]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (Array.from(event.dataTransfer.items).some((item) => item.type.startsWith('image/'))) {
      event.preventDefault();
    }
  }, []);

  const extensions = useMemo<Extension[]>(() => {
    const runCommand = (view: EditorView, command: FormatCommand) => {
      const selection = view.state.selection.main;
      const selectedText = view.state.doc.sliceString(selection.from, selection.to);
      const { insert, anchor, head } = command(selectedText);
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert },
        selection: {
          anchor: selection.from + anchor,
          head: selection.from + head,
        },
        scrollIntoView: true,
      });
      return true;
    };

    return [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      drawSelection(),
      dropCursor(),
      history(),
      indentOnInput(),
      bracketMatching(),
      markdown(),
      markdownHighlightStyle,
      markdownSyntaxTheme,
      search({ top: true, createPanel: createSearchPanel(locale) }),
      EditorState.tabSize.of(2),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update: ViewUpdate) => {
        updateHistoryState(update.state);
        if (update.docChanged || update.viewportChanged) {
          reportScrollPosition(update.view);
        }
      }),
      EditorView.domEventHandlers({
        scroll: (_event, view) => {
          reportScrollPosition(view);
        },
      }),
      Prec.highest(keymap.of([
        indentWithTab,
        { key: 'Mod-b', run: (view) => runCommand(view, BOLD_COMMAND) },
        { key: 'Mod-i', run: (view) => runCommand(view, ITALIC_COMMAND) },
      ])),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      ...(!isTauri ? [keymap.of(searchKeymap)] : []),
    ];
  }, [locale, reportScrollPosition, updateHistoryState]);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
    }}>
      <FormatToolbar
        canUndo={historyState.canUndo}
        canRedo={historyState.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onApply={applyCommand}
        onFind={() => runSearchAction('find')}
        locale={locale}
      />
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <CodeMirror
          ref={codeMirrorRef}
          value={value}
          height="100%"
          width="100%"
          style={{ height: '100%' }}
          theme={codeMirrorTheme}
          basicSetup={false}
          extensions={extensions}
          placeholder={EDITOR_PLACEHOLDER}
          onChange={onChange}
          onCreateEditor={(view) => {
            updateHistoryState(view.state);
            onReady?.();
          }}
        />
      </div>
    </div>
  );
});

MarkdownEditor.displayName = 'MarkdownEditor';
