# Markdown Editor & PDF Exporter - 项目指令指南

## 1. 项目愿景 (Project Vision)
开发一个极简、高性能的 Web 版 Markdown 编辑器，支持打开，保存，实时预览和专业的 PDF 打印/导出功能。

## 2. 技术栈约束 (Tech Stack)
- **Frontend**: React (Functional Components) + Tailwind CSS。
- **Icons**: Lucide React。
- **Markdown Parsing**:
    - 使用 `unified`, `remark-parse`, `rehype-react` 生态。
    - 必须支持 GitHub Flavored Markdown (GFM)。
- **Syntax Highlighting**: 使用 `shiki` 或 `prismjs`。
- **PDF Generation**: 采用浏览器原生 `window.print()` 结合 CSS Paged Media 规范。

## 3. 编辑器核心逻辑 (Editor Logic)
- **State Management**: 使用 React `useState` 或 `useReducer` 管理 Markdown 源码。
- **Sync Scroll**: 实现编辑区与预览区的同步滚动映射（基于行号或百分比）。
- **Performance**: 预览渲染需使用 `useDeferredValue` 或 `debounce` 优化，防止大文件输入卡顿。

## 4. 图片处理规范 (Image Handling)
- **Upload/Paste**:
    - 监听 `onPaste` 和 `onDrop` 事件。
    - 使用 `URL.createObjectURL` 生成本地预览链接，并自动插入 `![image](url)` 语法。
- **Styles**: 预览区图片默认 `max-width: 100%`, `rounded-lg`。
- **PDF Compatibility**: 确保图片在打印前已完全加载，防止导出空白。

## 5. PDF 与打印样式 (PDF & Print Standards)
所有关于打印的生成需遵循以下 CSS 规则：
- **Page Setup**: 使用 `@page { size: A4; margin: 20mm; }`。
- **Typography**: 打印时字体大小建议为 11pt 或 12pt，行高 1.6。
- **Element Breaking**:
    - `h1`, `h2` 之后避免断页 (`break-after: avoid`)。
    - `pre`, `blockquote`, `img` 内部禁止断页 (`break-inside: avoid`)。
- **UI Filtering**: 打印时必须隐藏侧边栏、工具栏和按钮（`@media print { .no-print { display: none; } }`）。

## 6. 代码风格与质量 (Code Style)
- **TypeScript**: 强制使用严格类型检查。
- **Naming**: 组件使用 PascalCase，函数和变量使用 camelCase。
- **Components**: 优先编写小的、可复用的 UI 组件。
- **Refactoring**: 保持逻辑（Hooks）与视图（Components）分离。

## 7. 交互习惯 (Interaction Preference)
- 在提供代码建议时，优先考虑可访问性 (A11y) 和响应式设计。
- 解释代码时，重点说明 Markdown 转换的 AST (抽象语法树) 逻辑。

## 8. 文件操作规范 (File Operations)
- **Open**:
    - 使用 `window.showOpenFilePicker` (File System Access API) 优先。
    - 降级方案：使用 `<input type="file">` 配合 `FileReader`。
    - 仅限 `.md`, `.markdown`, `.txt` 格式。
- **Save/Save As**:
    - 默认保存为 `.md`。
    - 导出文件名建议格式：`Untitled_YYYYMMDD.md`。
    - **自动保存**: 实现基于 `localStorage` 的自动暂存功能。
