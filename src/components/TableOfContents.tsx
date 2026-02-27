import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Hash, ChevronRight, X } from 'lucide-react';
import type { TocItem } from '../hooks/useToc';

interface TableOfContentsProps {
  items: TocItem[];
  open: boolean;
  onClose: () => void;
  previewPaneId?: string;
  /** Called when user clicks a TOC item — scroll editor to corresponding line */
  onScrollToEditorLine?: (lineNumber: number) => void;
  /** The current topmost visible line number in the editor (0-based) */
  editorTopLine?: number;
  /** Whether preview pane is visible (for preview scroll sync) */
  hasPreview?: boolean;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  items,
  open,
  onClose,
  previewPaneId = 'markdown-preview',
  onScrollToEditorLine,
  editorTopLine,
  hasPreview = true,
}) => {
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);
  /**
   * When the user clicks a TOC item we "lock" that id here.
   * While locked, ALL external sources (IntersectionObserver + editorTopLine)
   * are blocked from changing the highlight. The lock is released only after
   * the smooth scroll truly finishes (scrollend event or 1200ms fallback).
   */
  const lockedIdRef = useRef<string | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tocListRef = useRef<HTMLDivElement>(null);

  /** Release the lock and let normal tracking resume */
  const releaseLock = useCallback(() => {
    lockedIdRef.current = null;
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }, []);

  /** Set active only when not locked (or when we are the lock owner) */
  const setActiveIfUnlocked = useCallback((id: string) => {
    if (lockedIdRef.current !== null) return; // locked by a click — ignore
    setActiveId(id);
  }, []);

  // Track active heading via IntersectionObserver on the preview container
  useEffect(() => {
    if (!open || !hasPreview) return;
    observerRef.current?.disconnect();

    const root = document.getElementById(previewPaneId);
    if (!root) return;

    const headingEls: Element[] = items
      .map(item => root.querySelector(`[data-heading-id="${item.id}"]`))
      .filter(Boolean) as Element[];

    if (!headingEls.length) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (lockedIdRef.current !== null) return; // locked by click
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = (visible[0].target as HTMLElement).dataset.headingId ?? '';
          if (id) setActiveId(id);
        }
      },
      { root, threshold: 0.2, rootMargin: '-10% 0px -60% 0px' }
    );

    headingEls.forEach(el => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, [open, items, previewPaneId, hasPreview]);

  // Track active heading from editor scroll position
  useEffect(() => {
    if (!open || editorTopLine === undefined || items.length === 0) return;
    // In preview-only mode there is no editor to track
    if (!onScrollToEditorLine && hasPreview) return;

    // Find the last heading whose lineNumber <= editorTopLine
    let activeItem: TocItem | undefined;
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].lineNumber <= editorTopLine) {
        activeItem = items[i];
        break;
      }
    }
    if (activeItem) setActiveIfUnlocked(activeItem.id);
  }, [open, hasPreview, editorTopLine, items, onScrollToEditorLine, setActiveIfUnlocked]);

  // Auto-scroll the active TOC item into view within the TOC list
  useEffect(() => {
    if (!activeId || !tocListRef.current) return;
    const activeBtn = tocListRef.current.querySelector('.toc-item-btn.active') as HTMLElement | null;
    if (activeBtn) {
      activeBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeId]);

  const scrollToHeading = useCallback((item: TocItem) => {
    // Immediately lock to this id — no other source may change it until scroll ends
    lockedIdRef.current = item.id;
    setActiveId(item.id);

    // Fallback: always release after 1200ms even if scrollend never fires
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(releaseLock, 1200);

    // 1. Scroll preview pane (if visible)
    if (hasPreview) {
      const root = document.getElementById(previewPaneId);
      if (root) {
        const target = root.querySelector(`[data-heading-id="${item.id}"]`) as HTMLElement | null;
        if (target) {
          const containerRect = root.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const scrollOffset = root.scrollTop + (targetRect.top - containerRect.top) - 32;
          root.scrollTo({ top: scrollOffset, behavior: 'smooth' });

          // Release lock once this scroll element finishes moving
          root.addEventListener('scrollend', releaseLock, { once: true });
        }
      }
    }

    // 2. Scroll editor textarea to the heading's source line
    if (onScrollToEditorLine) {
      onScrollToEditorLine(item.lineNumber);
    }
  }, [hasPreview, previewPaneId, onScrollToEditorLine, releaseLock]);

  if (!open) return null;

  return (
    <aside
      className="no-print"
      style={{
        width: '240px',
        flexShrink: 0,
        height: '100%',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'tocSlideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 5,
      }}
    >
      <style>{`
        @keyframes tocSlideIn {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .toc-item-btn {
          transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
        }
        .toc-item-btn:hover {
          background: var(--bg-hover) !important;
        }
        .toc-item-btn.active {
          color: var(--accent) !important;
          background: var(--accent-subtle) !important;
        }
        .toc-item-btn.active .toc-indicator {
          opacity: 1 !important;
          transform: scaleY(1) !important;
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '14px 16px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Hash size={14} color="var(--accent)" strokeWidth={2.5} />
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)',
          }}>
            Contents
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close table of contents"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '22px',
            height: '22px',
            borderRadius: '4px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          }}
        >
          <X size={13} />
        </button>
      </div>

      {/* TOC list */}
      <div ref={tocListRef} style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 0',
      }}>
        {items.length === 0 ? (
          <div style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '12px',
            fontFamily: 'var(--font-ui)',
            lineHeight: 1.6,
          }}>
            <Hash size={28} style={{ opacity: 0.2, margin: '0 auto 8px', display: 'block' }} />
            No headings yet.<br />
            Add <code style={{ fontSize: '11px', padding: '1px 4px', background: 'var(--bg-hover)', borderRadius: '3px' }}># Heading</code> to your document.
          </div>
        ) : (
          items.map((item) => {
            const isActive = activeId === item.id;
            const indent = (item.level - 1) * 14;
            return (
              <button
                key={item.id}
                className={`toc-item-btn${isActive ? ' active' : ''}`}
                onClick={() => scrollToHeading(item)}
                title={item.text}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  paddingLeft: `${12 + indent}px`,
                  paddingRight: '12px',
                  paddingTop: item.level === 1 ? '6px' : '4px',
                  paddingBottom: item.level === 1 ? '6px' : '4px',
                  gap: '7px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                {/* Active indicator bar */}
                <div
                  className="toc-indicator"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '4px',
                    bottom: '4px',
                    width: '2.5px',
                    background: 'var(--accent)',
                    borderRadius: '0 2px 2px 0',
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? 'scaleY(1)' : 'scaleY(0)',
                    transition: 'opacity 0.2s ease, transform 0.2s ease',
                  }}
                />

                {item.level === 1 ? (
                  <ChevronRight
                    size={11}
                    style={{
                      flexShrink: 0,
                      opacity: 0.5,
                      color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  />
                ) : (
                  <span style={{
                    width: item.level === 2 ? '8px' : '6px',
                    height: item.level === 2 ? '8px' : '5px',
                    borderRadius: item.level === 2 ? '2px' : '50%',
                    background: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    flexShrink: 0,
                    opacity: item.level === 3 ? 0.6 : 0.8,
                    transition: 'background 0.15s ease',
                  }} />
                )}

                <span style={{
                  fontSize: item.level === 1 ? '12.5px' : '11.5px',
                  fontWeight: item.level === 1 ? 600 : item.level === 2 ? 500 : 400,
                  fontFamily: 'var(--font-ui)',
                  color: 'inherit',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.4,
                  letterSpacing: item.level === 1 ? '-0.01em' : '0',
                }}>
                  {item.text}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Footer badge */}
      {items.length > 0 && (
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--border)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          textAlign: 'right',
          flexShrink: 0,
        }}>
          {items.length} heading{items.length !== 1 ? 's' : ''}
        </div>
      )}
    </aside>
  );
};

