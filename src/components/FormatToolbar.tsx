import React, { useCallback } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Link,
  Image,
  Code,
  Code2,
  Quote,
  List,
  ListOrdered,
  CheckSquare,
  Table,
  Minus,
  CornerDownLeft,
  Undo2,
  Redo2,
} from 'lucide-react';

interface FormatAction {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  action: (value: string, selStart: number, selEnd: number) => { newValue: string; newSelStart: number; newSelEnd: number };
  dividerBefore?: boolean;
}

interface FormatToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  pushHistory: (value: string, selStart: number, selEnd: number) => void;
}

// Wrap selection or insert placeholder
function wrapOrInsert(
  value: string,
  selStart: number,
  selEnd: number,
  before: string,
  after: string,
  placeholder: string
) {
  const selected = value.substring(selStart, selEnd);
  const text = selected || placeholder;
  const newValue = value.substring(0, selStart) + before + text + after + value.substring(selEnd);
  const newStart = selStart + before.length;
  const newEnd = newStart + text.length;
  return { newValue, newSelStart: newStart, newSelEnd: newEnd };
}

// Insert at start of each selected line
function toggleLinePrefix(
  value: string,
  selStart: number,
  selEnd: number,
  prefix: string
) {
  const before = value.substring(0, selStart);
  const lineStart = before.lastIndexOf('\n') + 1;
  const chunk = value.substring(lineStart, selEnd);
  const lines = chunk.split('\n');
  const alreadyPrefixed = lines.every(l => l.startsWith(prefix));
  const newLines = alreadyPrefixed
    ? lines.map(l => l.slice(prefix.length))
    : lines.map(l => prefix + l);
  const newChunk = newLines.join('\n');
  const newValue = value.substring(0, lineStart) + newChunk + value.substring(selEnd);
  const delta = newChunk.length - chunk.length;
  return {
    newValue,
    newSelStart: lineStart,
    newSelEnd: selEnd + delta,
  };
}

const FORMAT_ACTIONS: FormatAction[] = [
  {
    icon: <Bold size={14} />,
    label: 'Bold',
    shortcut: '⌘B',
    action: (v, s, e) => wrapOrInsert(v, s, e, '**', '**', 'bold text'),
  },
  {
    icon: <Italic size={14} />,
    label: 'Italic',
    shortcut: '⌘I',
    action: (v, s, e) => wrapOrInsert(v, s, e, '*', '*', 'italic text'),
  },
  {
    icon: <Strikethrough size={14} />,
    label: 'Strikethrough',
    action: (v, s, e) => wrapOrInsert(v, s, e, '~~', '~~', 'strikethrough'),
  },
  {
    icon: <Heading1 size={14} />,
    label: 'Heading 1',
    dividerBefore: true,
    action: (v, s, e) => toggleLinePrefix(v, s, e, '# '),
  },
  {
    icon: <Heading2 size={14} />,
    label: 'Heading 2',
    action: (v, s, e) => toggleLinePrefix(v, s, e, '## '),
  },
  {
    icon: <Heading3 size={14} />,
    label: 'Heading 3',
    action: (v, s, e) => toggleLinePrefix(v, s, e, '### '),
  },
  {
    icon: <Quote size={14} />,
    label: 'Blockquote',
    dividerBefore: true,
    action: (v, s, e) => toggleLinePrefix(v, s, e, '> '),
  },
  {
    icon: <Code size={14} />,
    label: 'Inline Code',
    action: (v, s, e) => wrapOrInsert(v, s, e, '`', '`', 'code'),
  },
  {
    icon: <Code2 size={14} />,
    label: 'Code Block',
    action: (v, s, e) => {
      const selected = v.substring(s, e);
      const text = selected || 'code here';
      const newText = '\n```\n' + text + '\n```\n';
      const newValue = v.substring(0, s) + newText + v.substring(e);
      const newStart = s + 5;
      return { newValue, newSelStart: newStart, newSelEnd: newStart + text.length };
    },
  },
  {
    icon: <List size={14} />,
    label: 'Bullet List',
    dividerBefore: true,
    action: (v, s, e) => toggleLinePrefix(v, s, e, '- '),
  },
  {
    icon: <ListOrdered size={14} />,
    label: 'Ordered List',
    action: (v, s, e) => toggleLinePrefix(v, s, e, '1. '),
  },
  {
    icon: <CheckSquare size={14} />,
    label: 'Task List',
    action: (v, s, e) => toggleLinePrefix(v, s, e, '- [ ] '),
  },
  {
    icon: <Link size={14} />,
    label: 'Link',
    dividerBefore: true,
    action: (v, s, e) => {
      const selected = v.substring(s, e);
      const text = selected || 'link text';
      const newText = `[${text}](url)`;
      const newValue = v.substring(0, s) + newText + v.substring(e);
      return { newValue, newSelStart: s + text.length + 3, newSelEnd: s + text.length + 3 + 3 };
    },
  },
  {
    icon: <Image size={14} />,
    label: 'Image',
    action: (v, s, e) => {
      const selected = v.substring(s, e);
      const alt = selected || 'alt text';
      const newText = `![${alt}](url)`;
      const newValue = v.substring(0, s) + newText + v.substring(e);
      return { newValue, newSelStart: s + alt.length + 4, newSelEnd: s + alt.length + 4 + 3 };
    },
  },
  {
    icon: <Table size={14} />,
    label: 'Table',
    action: (v, s, _e) => {
      const tableText = '\n| Header 1 | Header 2 | Header 3 |\n| -------- | -------- | -------- |\n| Cell 1   | Cell 2   | Cell 3   |\n';
      const newValue = v.substring(0, s) + tableText + v.substring(s);
      const newSel = s + tableText.length;
      return { newValue, newSelStart: newSel, newSelEnd: newSel };
    },
  },
  {
    icon: <Minus size={14} />,
    label: 'Horizontal Rule',
    dividerBefore: true,
    action: (v, s, _e) => {
      const hr = '\n---\n';
      const newValue = v.substring(0, s) + hr + v.substring(s);
      const newSel = s + hr.length;
      return { newValue, newSelStart: newSel, newSelEnd: newSel };
    },
  },
  {
    icon: <CornerDownLeft size={14} />,
    label: 'Line Break',
    action: (v, s, _e) => {
      const br = '  \n';
      const newValue = v.substring(0, s) + br + v.substring(s);
      const newSel = s + br.length;
      return { newValue, newSelStart: newSel, newSelEnd: newSel };
    },
  },
];

export const FormatToolbar: React.FC<FormatToolbarProps> = ({
  textareaRef,
  value,
  onChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  pushHistory,
}) => {
  const applyFormat = useCallback(
    (action: FormatAction) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const selStart = textarea.selectionStart;
      const selEnd = textarea.selectionEnd;
      const { newValue, newSelStart, newSelEnd } = action.action(value, selStart, selEnd);

      onChange(newValue);
      pushHistory(newValue, newSelStart, newSelEnd);

      // Restore focus and selection after React re-render
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(newSelStart, newSelEnd);
      });
    },
    [textareaRef, value, onChange, pushHistory]
  );

  return (
    <div
      className="no-print"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1px',
        padding: '5px 10px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
        minHeight: '36px',
      }}
    >
      {/* Undo / Redo */}
      <IconButton
        icon={<Undo2 size={14} />}
        label="Undo"
        shortcut="⌘Z"
        disabled={!canUndo}
        onMouseDown={(e) => { e.preventDefault(); onUndo(); }}
      />
      <IconButton
        icon={<Redo2 size={14} />}
        label="Redo"
        shortcut="⌘⇧Z"
        disabled={!canRedo}
        onMouseDown={(e) => { e.preventDefault(); onRedo(); }}
      />

      {/* Divider */}
      <div style={{ width: '1px', height: '18px', background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />

      {FORMAT_ACTIONS.map((action, index) => (
        <React.Fragment key={index}>
          {action.dividerBefore && (
            <div style={{
              width: '1px',
              height: '18px',
              background: 'var(--border)',
              margin: '0 4px',
              flexShrink: 0,
            }} />
          )}
          <FormatButton action={action} onApply={() => applyFormat(action)} />
        </React.Fragment>
      ))}
    </div>
  );
};

const FormatButton: React.FC<{
  action: FormatAction;
  onApply: () => void;
}> = ({ action, onApply }) => {
  return (
    <button
      onMouseDown={(e) => {
        // Prevent textarea from losing focus
        e.preventDefault();
        onApply();
      }}
      title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '26px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
        background: 'transparent',
        flexShrink: 0,
        transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--bg-hover)';
        e.currentTarget.style.color = 'var(--text-primary)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }}
    >
      {action.icon}
    </button>
  );
};

const IconButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
}> = ({ icon, label, shortcut, disabled, onMouseDown }) => (
  <button
    onMouseDown={onMouseDown}
    disabled={disabled}
    title={shortcut ? `${label} (${shortcut})` : label}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '28px',
      height: '26px',
      border: 'none',
      borderRadius: '5px',
      cursor: disabled ? 'default' : 'pointer',
      color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
      background: 'transparent',
      flexShrink: 0,
      opacity: disabled ? 0.4 : 1,
      transition: 'background 0.1s, color 0.1s, opacity 0.1s',
    }}
    onMouseEnter={e => {
      if (!disabled) {
        e.currentTarget.style.background = 'var(--bg-hover)';
        e.currentTarget.style.color = 'var(--text-primary)';
      }
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.color = disabled ? 'var(--text-muted)' : 'var(--text-secondary)';
    }}
  >
    {icon}
  </button>
);
