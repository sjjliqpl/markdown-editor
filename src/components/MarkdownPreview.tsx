import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { FontFamily } from '../hooks/useFontFamily';

interface MarkdownPreviewProps {
  content: string;
  scrollPercentage?: number;
  fontFamily?: FontFamily;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  scrollPercentage = 0,
  fontFamily = 'serif',
}) => {
  const previewRef = React.useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = React.useState(true);

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

  React.useEffect(() => {
    if (previewRef.current && scrollPercentage !== undefined) {
      const { scrollHeight, clientHeight } = previewRef.current;
      const scrollTop = scrollPercentage * (scrollHeight - clientHeight);
      previewRef.current.scrollTop = scrollTop;
    }
  }, [scrollPercentage]);

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
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  style={isDark ? oneDark : oneLight}
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
                  {...props}
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
              return (
                <img
                  src={src}
                  alt={alt}
                  className="max-w-full rounded-lg"
                  loading="lazy"
                />
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};
