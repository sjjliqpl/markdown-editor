import React, { forwardRef, useImperativeHandle } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Options as RehypeSanitizeOptions } from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { FontFamily } from '../hooks/useFontFamily';
import { slugify } from '../hooks/useToc';
import { appAPI } from '../lib/appAPI';

type CodeProps = React.ComponentProps<'code'> & {
  inline?: boolean;
};

type SyntaxHighlighterTheme = Record<string, React.CSSProperties>;

/** Recursively extract plain text from React children */
function extractText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (React.isValidElement(children)) {
    const props = children.props as { children?: React.ReactNode };
    return extractText(props.children);
  }
  return '';
}

const markdownSanitizeSchema: RehypeSanitizeOptions = {
  ...defaultSchema,
  tagNames: Array.from(new Set([...(defaultSchema.tagNames ?? []), 'details', 'summary'])),
  attributes: {
    ...defaultSchema.attributes,
    details: [...(defaultSchema.attributes?.details ?? []), 'open'],
    img: [...(defaultSchema.attributes?.img ?? []), 'alt', 'title', 'className', 'loading'],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ['http', 'https', 'data', 'blob', 'asset', 'local-resource'],
  },
  strip: [...(defaultSchema.strip ?? []), 'script', 'style'],
};

export interface MarkdownPreviewHandle {
  /** Scroll the preview pane to a given percentage (0-1) without triggering React state */
  scrollToPercentage: (percentage: number) => void;
}

interface MarkdownPreviewProps {
  content: string;
  fontFamily?: FontFamily;
  fileDir?: string | null;
}

const MarkdownPreviewInner: React.ForwardRefRenderFunction<MarkdownPreviewHandle, MarkdownPreviewProps> = ({
  content,
  fontFamily = 'serif',
  fileDir = null,
}, ref) => {
  const previewRef = React.useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = React.useState(true);

  useImperativeHandle(ref, () => ({
    scrollToPercentage: (percentage: number) => {
      const el = previewRef.current;
      if (!el) return;
      const { scrollHeight, clientHeight } = el;
      el.scrollTop = percentage * (scrollHeight - clientHeight);
    },
  }), []);

  // Resolve actual CSS font value from fontFamily id
  const fontCssMap: Record<string, string> = {
    serif:          'var(--font-serif)',
    lora:           'var(--font-lora)',
    sans:           'var(--font-ui)',
    inter:          'var(--font-inter)',
    mono:           'var(--font-mono)',
    'noto-serif-sc': 'var(--font-noto-serif-sc)',
    'noto-sans-sc':  'var(--font-noto-sans-sc)',
    zcool:          'var(--font-zcool)',
  };
  const resolvedFont = fontCssMap[fontFamily] ?? 'var(--font-serif)';

  const handleLinkClick = React.useCallback((event: React.MouseEvent<HTMLAnchorElement>, href?: string) => {
    if (!href) return;
    if (/^https?:\/\//i.test(href)) {
      event.preventDefault();
      appAPI.openExternalUrl(href).catch((error) => {
        console.error('Error opening external link:', error);
      });
    }
  }, []);

  let headingIndex = 0;
  const markdownComponents: Components = {
    h1({ children, ...props }) {
      const text = extractText(children);
      const id = slugify(text, headingIndex++);
      return <h1 data-heading-id={id} id={id} {...props}>{children}</h1>;
    },
    h2({ children, ...props }) {
      const text = extractText(children);
      const id = slugify(text, headingIndex++);
      return <h2 data-heading-id={id} id={id} {...props}>{children}</h2>;
    },
    h3({ children, ...props }) {
      const text = extractText(children);
      const id = slugify(text, headingIndex++);
      return <h3 data-heading-id={id} id={id} {...props}>{children}</h3>;
    },
    a({ href, children, ...props }) {
      const isExternal = typeof href === 'string' && /^https?:\/\//i.test(href);
      return (
        <a
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          onClick={(event) => handleLinkClick(event, href)}
          {...props}
        >
          {children}
        </a>
      );
    },
    details({ children, ...props }) {
      return (
        <details
          {...props}
          style={{
            margin: '1.25em 0',
            padding: '0 16px',
            border: '1px solid var(--border-surface)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface-warm)',
            color: 'var(--text-on-surface)',
            overflow: 'hidden',
          }}
        >
          {children}
        </details>
      );
    },
    summary({ children, ...props }) {
      return (
        <summary
          {...props}
          style={{
            margin: '0 -16px',
            padding: '10px 16px',
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            fontWeight: 600,
            color: 'var(--text-on-surface)',
            background: 'var(--bg-hover)',
            userSelect: 'none',
          }}
        >
          {children}
        </summary>
      );
    },
    code({ inline, className, children, ...props }: CodeProps) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={(isDark ? oneDark : oneLight) as unknown as SyntaxHighlighterTheme}
          language={match[1]}
          PreTag="div"
          customStyle={{
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            lineHeight: '1.6',
            fontFamily: 'var(--font-mono)',
            backgroundColor: isDark ? '#282c34' : '#f0f0f0',
          }}
          codeTagProps={{
            style: {
              background: isDark ? '#282c34' : '#f0f0f0',
            },
          }}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    img({ src, alt }) {
      let resolvedSrc = src;
      if (src && fileDir && !/^(https?:|data:|blob:)/i.test(src)) {
        const absolutePath = src.startsWith('/')
          ? src
          : `${fileDir}/${src}`;
        // Tauri uses asset:// protocol; Electron uses local-resource://
        const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
        resolvedSrc = isTauri
          ? `asset://localhost/${encodeURI(absolutePath.replace(/^\//, ''))}`
          : `local-resource://${encodeURI(absolutePath)}`;
      }
      return (
        <img
          src={resolvedSrc}
          alt={alt}
          className="max-w-full rounded-lg"
          loading="lazy"
        />
      );
    },
  };

  React.useEffect(() => {
    // Check current theme
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isCurrentlyDark = currentTheme === 'dark' || (currentTheme !== 'light' && prefersDark);
    setIsDark(isCurrentlyDark);

    // Listen for theme changes
    const handleThemeChange = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      const prefersD = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(theme === 'dark' || (theme !== 'light' && prefersD));
    };

    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', handleThemeChange);

    return () => {
      observer.disconnect();
      mq.removeEventListener('change', handleThemeChange);
    };
  }, []);


  return (
    <div
      ref={previewRef}
      id="markdown-preview"
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '32px 40px',
        background: 'var(--bg-surface)',
        color: 'var(--text-on-surface)',
        fontFamily: resolvedFont,
        fontSize: '15px',
        lineHeight: '1.75',
      }}
    >
      <div className="prose prose-stone max-w-none"
        style={{
          fontFamily: resolvedFont,
        }}
      >
        <style>{`
          #markdown-preview .prose {
            color: var(--text-on-surface);
          }
          #markdown-preview .prose strong {
            color: var(--text-on-surface);
          }
          #markdown-preview .prose em {
            color: var(--text-on-surface);
          }
          #markdown-preview .prose h1,
          #markdown-preview .prose h2,
          #markdown-preview .prose h3,
          #markdown-preview .prose h4,
          #markdown-preview .prose h5,
          #markdown-preview .prose h6 {
            font-family: var(--font-ui);
            font-weight: 700;
            letter-spacing: -0.02em;
            color: var(--text-on-surface);
          }
          #markdown-preview .prose h1 {
            font-size: 2em;
            border-bottom: 2px solid var(--border-surface);
            padding-bottom: 0.3em;
            margin-bottom: 0.8em;
          }
          #markdown-preview .prose h2 {
            font-size: 1.5em;
            border-bottom: 1px solid var(--border-surface);
            padding-bottom: 0.25em;
          }
          #markdown-preview .prose p {
            color: var(--text-on-surface);
            line-height: 1.8;
          }
          #markdown-preview .prose a {
            color: var(--accent);
            text-decoration: underline;
            text-underline-offset: 3px;
            text-decoration-color: var(--accent-subtle);
          }
          #markdown-preview .prose a:hover {
            color: var(--accent-hover);
            text-decoration-color: var(--accent-hover);
          }
          #markdown-preview .prose code:not(pre code) {
            font-family: var(--font-mono);
            font-size: 0.85em;
            padding: 2px 6px;
            background: var(--bg-hover);
            border-radius: 4px;
            color: var(--accent);
            font-weight: 500;
          }
          #markdown-preview .prose blockquote {
            border-left: 3px solid var(--accent);
            background: var(--accent-subtle);
            padding: 12px 20px;
            border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
            font-style: italic;
            color: var(--text-on-surface-secondary);
          }
          #markdown-preview .prose table {
            border-collapse: collapse;
            width: 100%;
            font-family: var(--font-ui);
            font-size: 0.9em;
          }
          #markdown-preview .prose th {
            background: var(--bg-hover);
            font-weight: 600;
            text-align: left;
            padding: 10px 14px;
            border-bottom: 2px solid var(--border-surface);
          }
          #markdown-preview .prose td {
            padding: 10px 14px;
            border-bottom: 1px solid var(--border-surface);
          }
          #markdown-preview .prose tr:hover td {
            background: var(--bg-elevated);
          }
          #markdown-preview .prose img {
            max-width: 100%;
            border-radius: var(--radius-lg);
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          }
          #markdown-preview .prose hr {
            border: none;
            height: 1px;
            background: var(--border-surface);
            margin: 2em 0;
          }
          #markdown-preview .prose ul li::marker {
            color: var(--accent);
          }
          #markdown-preview .prose ol li::marker {
            color: var(--accent);
            font-weight: 600;
          }
          #markdown-preview .prose pre {
            border-radius: var(--radius-md) !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            font-size: 0.85em !important;
          }
        `}</style>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[
            rehypeRaw,
            [rehypeSanitize, markdownSanitizeSchema],
          ]}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export const MarkdownPreview = React.memo(forwardRef(MarkdownPreviewInner));
