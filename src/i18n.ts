export type Locale = 'zh' | 'en';

export interface Translation {
  appName: string;
  openFile: string;
  save: string;
  saveAs: string;
  exportImage: string;
  print: string;
  editorOnly: string;
  splitView: string;
  previewOnly: string;
  words: string;
  chars: string;
  themeAuto: string;
  themeDark: string;
  themeLight: string;
  themeNext: (next: string) => string;
  autoSaved: string;
  markdown: string;
  lines: string;
  modeSplit: string;
  modeEditor: string;
  modePreview: string;
  exportImageNoPreview: string;
  exportImageFailed: string;
  langToggle: string;
}

const en: Translation = {
  appName: 'Markdown Editor',
  openFile: 'Open File',
  save: 'Save',
  saveAs: 'Save As...',
  exportImage: 'Export Image',
  print: 'Print',
  editorOnly: 'Editor Only',
  splitView: 'Split View',
  previewOnly: 'Preview Only',
  words: 'words',
  chars: 'chars',
  themeAuto: 'Auto',
  themeDark: 'Dark',
  themeLight: 'Light',
  themeNext: (next: string) => `Theme: ${next}`,
  autoSaved: 'Auto-saved',
  markdown: 'Markdown',
  lines: 'lines',
  modeSplit: 'Split',
  modeEditor: 'Editor',
  modePreview: 'Preview',
  exportImageNoPreview: 'Please switch to Preview or Split view before exporting as image.',
  exportImageFailed: 'Export image failed, please try again.',
  langToggle: '中文',
};

const zh: Translation = {
  appName: 'Markdown 编辑器',
  openFile: '打开文件',
  save: '保存',
  saveAs: '另存为…',
  exportImage: '导出图片',
  print: '打印',
  editorOnly: '仅编辑',
  splitView: '分屏视图',
  previewOnly: '仅预览',
  words: '词',
  chars: '字符',
  themeAuto: '自动',
  themeDark: '深色',
  themeLight: '浅色',
  themeNext: (next: string) => `主题：${next}`,
  autoSaved: '已自动保存',
  markdown: 'Markdown',
  lines: '行',
  modeSplit: '分屏',
  modeEditor: '编辑',
  modePreview: '预览',
  exportImageNoPreview: '请切换到预览或分屏视图后再导出图片。',
  exportImageFailed: '导出图片失败，请重试。',
  langToggle: 'English',
};

const translations: Record<Locale, Translation> = { en, zh };

export function t(locale: Locale): Translation {
  return translations[locale];
}
