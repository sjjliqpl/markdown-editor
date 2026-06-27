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

export interface FormatCommandResult {
  insert: string;
  anchor: number;
  head: number;
  lineMode?: boolean;
}

export type FormatCommand = (selectedText: string) => FormatCommandResult;

interface FormatAction {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  command: FormatCommand;
  dividerBefore?: boolean;
}

interface FormatToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onApply: (command: FormatCommand) => void;
}

function commandResult(insert: string, anchor: number, head = anchor, lineMode = false): FormatCommandResult {
  return { insert, anchor, head, lineMode };
}

function wrapOrInsert(before: string, after: string, placeholder: string): FormatCommand {
  return (selectedText) => {
    const text = selectedText || placeholder;
    return commandResult(`${before}${text}${after}`, before.length, before.length + text.length);
  };
}

export const BOLD_COMMAND = wrapOrInsert('**', '**', 'bold text');
export const ITALIC_COMMAND = wrapOrInsert('*', '*', 'italic text');

function toggleLinePrefix(prefix: string): FormatCommand {
  return (selectedText) => {
    const text = selectedText || '';
    const lines = text.split('\n');
    const alreadyPrefixed = lines.length > 0 && lines.every((line) => line.startsWith(prefix));
    const formatted = alreadyPrefixed
      ? lines.map((line) => line.slice(prefix.length)).join('\n')
      : lines.map((line) => prefix + line).join('\n');
    return commandResult(formatted, 0, formatted.length, true);
  };
}

const FORMAT_ACTIONS: FormatAction[] = [
  {
    icon: <Bold size={14} />,
    label: 'Bold',
    shortcut: '⌘B',
    command: BOLD_COMMAND,
  },
  {
    icon: <Italic size={14} />,
    label: 'Italic',
    shortcut: '⌘I',
    command: ITALIC_COMMAND,
  },
  {
    icon: <Strikethrough size={14} />,
    label: 'Strikethrough',
    command: wrapOrInsert('~~', '~~', 'strikethrough'),
  },
  {
    icon: <Heading1 size={14} />,
    label: 'Heading 1',
    dividerBefore: true,
    command: toggleLinePrefix('# '),
  },
  {
    icon: <Heading2 size={14} />,
    label: 'Heading 2',
    command: toggleLinePrefix('## '),
  },
  {
    icon: <Heading3 size={14} />,
    label: 'Heading 3',
    command: toggleLinePrefix('### '),
  },
  {
    icon: <Quote size={14} />,
    label: 'Blockquote',
    dividerBefore: true,
    command: toggleLinePrefix('> '),
  },
  {
    icon: <Code size={14} />,
    label: 'Inline Code',
    command: wrapOrInsert('`', '`', 'code'),
  },
  {
    icon: <Code2 size={14} />,
    label: 'Code Block',
    command: (selectedText) => {
      const text = selectedText || 'code here';
      const insert = `\n\`\`\`\n${text}\n\`\`\`\n`;
      return commandResult(insert, 5, 5 + text.length);
    },
  },
  {
    icon: <List size={14} />,
    label: 'Bullet List',
    dividerBefore: true,
    command: toggleLinePrefix('- '),
  },
  {
    icon: <ListOrdered size={14} />,
    label: 'Ordered List',
    command: toggleLinePrefix('1. '),
  },
  {
    icon: <CheckSquare size={14} />,
    label: 'Task List',
    command: toggleLinePrefix('- [ ] '),
  },
  {
    icon: <Link size={14} />,
    label: 'Link',
    dividerBefore: true,
    command: (selectedText) => {
      const text = selectedText || 'link text';
      const insert = `[${text}](url)`;
      const urlStart = text.length + 3;
      return commandResult(insert, urlStart, urlStart + 3);
    },
  },
  {
    icon: <Image size={14} />,
    label: 'Image',
    command: (selectedText) => {
      const alt = selectedText || 'alt text';
      const insert = `![${alt}](url)`;
      const urlStart = alt.length + 4;
      return commandResult(insert, urlStart, urlStart + 3);
    },
  },
  {
    icon: <Table size={14} />,
    label: 'Table',
    command: () => {
      const insert = '\n| Header 1 | Header 2 | Header 3 |\n| -------- | -------- | -------- |\n| Cell 1   | Cell 2   | Cell 3   |\n';
      return commandResult(insert, insert.length);
    },
  },
  {
    icon: <Minus size={14} />,
    label: 'Horizontal Rule',
    dividerBefore: true,
    command: () => {
      const insert = '\n---\n';
      return commandResult(insert, insert.length);
    },
  },
  {
    icon: <CornerDownLeft size={14} />,
    label: 'Line Break',
    command: () => {
      const insert = ' '.repeat(2) + '\n';
      return commandResult(insert, insert.length);
    },
  },
];

export const FormatToolbar: React.FC<FormatToolbarProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onApply,
}) => {
  const applyFormat = useCallback((action: FormatAction) => {
    onApply(action.command);
  }, [onApply]);

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
      <IconButton
        icon={<Undo2 size={14} />}
        label="Undo"
        shortcut="⌘Z"
        disabled={!canUndo}
        onMouseDown={(event) => { event.preventDefault(); onUndo(); }}
      />
      <IconButton
        icon={<Redo2 size={14} />}
        label="Redo"
        shortcut="⌘⇧Z"
        disabled={!canRedo}
        onMouseDown={(event) => { event.preventDefault(); onRedo(); }}
      />

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
      onMouseDown={(event) => {
        event.preventDefault();
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
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'var(--bg-hover)';
        event.currentTarget.style.color = 'var(--text-primary)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent';
        event.currentTarget.style.color = 'var(--text-secondary)';
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
  onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => void;
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
    onMouseEnter={(event) => {
      if (!disabled) {
        event.currentTarget.style.background = 'var(--bg-hover)';
        event.currentTarget.style.color = 'var(--text-primary)';
      }
    }}
    onMouseLeave={(event) => {
      event.currentTarget.style.background = 'transparent';
      event.currentTarget.style.color = disabled ? 'var(--text-muted)' : 'var(--text-secondary)';
    }}
  >
    {icon}
  </button>
);
