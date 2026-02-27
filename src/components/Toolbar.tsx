import React, { useState } from 'react';
import {
  FolderOpen,
  Save,
  Download,
  Printer,
  FileText,
  PanelLeft,
  PanelRight,
  Columns2,
  ChevronDown,
  Sun,
  Moon,
  SunMoon,
  Image,
  Languages,
  Type,
} from 'lucide-react';
import type { ThemeMode } from '../hooks/useTheme';
import type { Locale } from '../i18n';
import { t } from '../i18n';
import type { FontFamily } from '../hooks/useFontFamily';
import { FONT_OPTIONS } from '../hooks/useFontFamily';

type ViewMode = 'split' | 'editor' | 'preview';

interface ToolbarProps {
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportPDF: () => void;
  onExportImage: () => void;
  fileName: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  wordCount: number;
  charCount: number;
  themeMode: ThemeMode;
  onThemeCycle: () => void;
  locale: Locale;
  onToggleLocale: () => void;
  fontFamily: FontFamily;
  onFontChange: (font: FontFamily) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onOpen,
  onSave,
  onSaveAs,
  onExportPDF,
  onExportImage,
  fileName,
  viewMode,
  onViewModeChange,
  wordCount,
  charCount,
  themeMode,
  onThemeCycle,
  locale,
  onToggleLocale,
  fontFamily,
  onFontChange,
}) => {
  const [showFileMenu, setShowFileMenu] = useState(false);
  const tr = t(locale);

  return (
    <div className="no-print" style={{
      height: '52px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      fontFamily: 'var(--font-ui)',
      position: 'relative',
      zIndex: 50,
    }}>
      {/* Left: Logo + File name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent), #c4841e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)',
          }}>
            <FileText size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}>
            {tr.appName}
          </span>
        </div>

        <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />

        {/* File menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowFileMenu(!showFileMenu)}
            onBlur={() => setTimeout(() => setShowFileMenu(false), 150)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
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
            {fileName}
            <ChevronDown size={12} />
          </button>

          {showFileMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              minWidth: '200px',
              padding: '4px',
              animation: 'tooltipFadeIn 0.15s ease-out',
              zIndex: 100,
            }}>
              <MenuItem icon={<FolderOpen size={14} />} label={tr.openFile} shortcut="⌘O" onClick={() => { onOpen(); setShowFileMenu(false); }} />
              <MenuItem icon={<Save size={14} />} label={tr.save} shortcut="⌘S" onClick={() => { onSave(); setShowFileMenu(false); }} />
              <MenuItem icon={<Download size={14} />} label={tr.saveAs} onClick={() => { onSaveAs(); setShowFileMenu(false); }} />
              <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
              <MenuItem icon={<Image size={14} />} label={tr.exportImage} onClick={() => { onExportImage(); setShowFileMenu(false); }} accent />
            </div>
          )}
        </div>
      </div>

      {/* Center: View mode toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-primary)',
        borderRadius: 'var(--radius-md)',
        padding: '3px',
        gap: '2px',
      }}>
        <ViewToggle icon={<PanelLeft size={14} />} tooltip={tr.editorOnly} active={viewMode === 'editor'} onClick={() => onViewModeChange('editor')} />
        <ViewToggle icon={<Columns2 size={14} />} tooltip={tr.splitView} active={viewMode === 'split'} onClick={() => onViewModeChange('split')} />
        <ViewToggle icon={<PanelRight size={14} />} tooltip={tr.previewOnly} active={viewMode === 'preview'} onClick={() => onViewModeChange('preview')} />
      </div>

      {/* Right: Stats + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '12px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
        }}>
          <span>{wordCount.toLocaleString()} {tr.words}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{charCount.toLocaleString()} {tr.chars}</span>
        </div>

        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

        {/* Theme toggle */}
        <ThemeToggle mode={themeMode} onCycle={onThemeCycle} locale={locale} />

        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

        {/* Language toggle */}
        <button
          onClick={onToggleLocale}
          title={tr.langToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <Languages size={14} />
          {tr.langToggle}
        </button>

        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

        {/* Font selector */}
        <FontSelector fontFamily={fontFamily} onFontChange={onFontChange} locale={locale} />

        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

        <button
          onClick={onExportPDF}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#fff',
            background: 'linear-gradient(135deg, var(--accent), #c4841e)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          title={`${tr.print} (⌘P)`}
        >
          <Printer size={13} />
          {tr.print}
        </button>
      </div>
    </div>
  );
};

const MenuItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  accent?: boolean;
}> = ({ icon, label, shortcut, onClick, accent }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      width: '100%',
      padding: '8px 12px',
      fontSize: '13px',
      color: accent ? 'var(--accent)' : 'var(--text-primary)',
      background: 'transparent',
      border: 'none',
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer',
      fontFamily: 'var(--font-ui)',
      textAlign: 'left',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
  >
    {icon}
    <span style={{ flex: 1 }}>{label}</span>
    {shortcut && (
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        {shortcut}
      </span>
    )}
  </button>
);

const ViewToggle: React.FC<{
  icon: React.ReactNode;
  tooltip: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, tooltip, active, onClick }) => (
  <button
    onClick={onClick}
    title={tooltip}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '30px',
      height: '26px',
      borderRadius: '5px',
      border: 'none',
      cursor: 'pointer',
      color: active ? 'var(--accent)' : 'var(--text-muted)',
      background: active ? 'var(--accent-subtle)' : 'transparent',
    }}
    onMouseEnter={e => {
      if (!active) {
        e.currentTarget.style.background = 'var(--bg-hover)';
        e.currentTarget.style.color = 'var(--text-primary)';
      }
    }}
    onMouseLeave={e => {
      if (!active) {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--text-muted)';
      }
    }}
  >
    {icon}
  </button>
);

const THEME_META: Record<ThemeMode, { icon: React.ReactNode; labelKey: 'themeAuto' | 'themeDark' | 'themeLight'; nextKey: 'themeAuto' | 'themeDark' | 'themeLight' }> = {
  auto: { icon: <SunMoon size={15} />, labelKey: 'themeAuto', nextKey: 'themeDark' },
  dark: { icon: <Moon size={15} />, labelKey: 'themeDark', nextKey: 'themeLight' },
  light: { icon: <Sun size={15} />, labelKey: 'themeLight', nextKey: 'themeAuto' },
};

const ThemeToggle: React.FC<{ mode: ThemeMode; onCycle: () => void; locale: Locale }> = ({ mode, onCycle, locale }) => {
  const meta = THEME_META[mode];
  const tr = t(locale);
  const label = tr[meta.labelKey];
  const next = tr[meta.nextKey];
  return (
    <button
      onClick={onCycle}
      title={tr.themeNext(next)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--text-secondary)',
        background: 'var(--bg-hover)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = 'var(--text-primary)';
        e.currentTarget.style.borderColor = 'var(--accent)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = 'var(--text-secondary)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {meta.icon}
      {label}
    </button>
  );
};

const FontSelector: React.FC<{
  fontFamily: FontFamily;
  onFontChange: (font: FontFamily) => void;
  locale: Locale;
}> = ({ fontFamily, onFontChange, locale }) => {
  const [open, setOpen] = useState(false);
  const tr = t(locale);

  const currentOpt = FONT_OPTIONS.find(o => o.id === fontFamily) ?? FONT_OPTIONS[0];

  const enFonts = FONT_OPTIONS.filter(o => o.group === 'en');
  const zhFonts = FONT_OPTIONS.filter(o => o.group === 'zh');

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        title={tr.fontLabel}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 10px',
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          background: 'var(--bg-hover)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          fontFamily: currentOpt.cssValue,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.borderColor = 'var(--accent)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'var(--text-secondary)';
          e.currentTarget.style.borderColor = 'var(--border)';
        }}
      >
        <Type size={14} style={{ flexShrink: 0, fontFamily: 'var(--font-ui)' }} />
        <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentOpt.label}
        </span>
        <ChevronDown size={11} style={{ opacity: 0.6, flexShrink: 0, fontFamily: 'var(--font-ui)' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          minWidth: '180px',
          padding: '4px',
          zIndex: 100,
          animation: 'tooltipFadeIn 0.15s ease-out',
        }}>
          {/* Latin group */}
          <div style={{
            padding: '4px 12px 2px',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-ui)',
          }}>
            {tr.fontGroupEn}
          </div>
          {enFonts.map(opt => (
            <FontItem
              key={opt.id}
              opt={opt}
              active={fontFamily === opt.id}
              onClick={() => { onFontChange(opt.id); setOpen(false); }}
            />
          ))}

          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

          {/* Chinese group */}
          <div style={{
            padding: '4px 12px 2px',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-ui)',
          }}>
            {tr.fontGroupZh}
          </div>
          {zhFonts.map(opt => (
            <FontItem
              key={opt.id}
              opt={opt}
              active={fontFamily === opt.id}
              onClick={() => { onFontChange(opt.id); setOpen(false); }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FontItem: React.FC<{
  opt: { id: FontFamily; label: string; cssValue: string };
  active: boolean;
  onClick: () => void;
}> = ({ opt, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      padding: '7px 12px',
      fontSize: '13px',
      color: active ? 'var(--accent)' : 'var(--text-primary)',
      background: active ? 'var(--accent-subtle)' : 'transparent',
      border: 'none',
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer',
      textAlign: 'left',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
  >
    <span style={{ fontFamily: opt.cssValue }}>{opt.label}</span>
    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: opt.cssValue, marginLeft: '10px' }}>
      Aa 文
    </span>
  </button>
);
