# Markdown Editor

一个极简、高性能的 Web 版 Markdown 编辑器，支持实时预览和专业的 PDF 打印/导出功能。

## ✨ 核心特性

- 📝 **实时预览** - 编辑区和预览区实时同步，支持同步滚动
- 📁 **文件操作** - 支持打开、保存和另存为 Markdown 文件
- 🖨️ **PDF 导出** - 专业的打印样式，一键生成 PDF
- 🎨 **语法高亮** - 代码块语法高亮显示
- 📸 **图片支持** - 支持拖拽上传和粘贴图片
- 💾 **自动保存** - 自动保存到本地存储，防止内容丢失
- ⌨️ **快捷键** - 支持常用快捷键操作

## 🛠️ 技术栈

- **React 18** - 使用函数式组件和 Hooks
- **TypeScript** - 严格类型检查
- **Vite** - 快速的构建工具
- **Tailwind CSS** - 实用优先的 CSS 框架
- **react-markdown** - Markdown 渲染
- **remark-gfm** - GitHub Flavored Markdown 支持
- **react-syntax-highlighter** - 代码语法高亮
- **lucide-react** - 图标库

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 [http://localhost:5173](http://localhost:5173) 查看应用。

### 构建生产版本

```bash
npm run build
```

构建产物会生成在 `dist` 目录。

## ⌨️ 快捷键

- `Ctrl/Cmd + S` - 保存文件
- `Ctrl/Cmd + O` - 打开文件
- `Ctrl/Cmd + P` - 导出 PDF

## 📚 功能说明

### Markdown 支持

支持完整的 GitHub Flavored Markdown (GFM) 语法，包括：

- 标题、段落、强调
- 列表（有序、无序、任务列表）
- 代码块和行内代码
- 表格
- 引用块
- 链接和图片
- 水平线

### 图片处理

1. **拖拽上传**：直接将图片拖入编辑区
2. **粘贴上传**：复制图片后在编辑区粘贴
3. 自动生成 Markdown 图片语法并创建本地预览

### PDF 导出

- 使用浏览器原生打印功能
- 优化的打印样式（A4 纸张，合适的边距）
- 防止元素在页面中断开
- 自动隐藏工具栏和编辑区

### 文件操作

- **打开**：支持 File System Access API，降级到传统文件选择
- **保存**：保存到已打开的文件
- **另存为**：保存到新文件
- **自动保存**：每 2 秒自动保存到 localStorage

## 📁 项目结构

```
src/
├── components/
│   ├── Editor.tsx              # 主编辑器容器
│   ├── MarkdownEditor.tsx      # 左侧编辑区
│   ├── MarkdownPreview.tsx     # 右侧预览区
│   └── Toolbar.tsx             # 工具栏
├── hooks/
│   ├── useFileSystem.ts        # 文件操作
│   └── useAutoSave.ts          # 自动保存
├── index.css                   # 全局样式
├── print.css                   # 打印样式
├── App.tsx                     # 根组件
└── main.tsx                    # 入口文件
```

## 🎯 设计原则

1. **极简设计** - 简洁的界面，专注于内容创作
2. **高性能** - 使用 `useDeferredValue` 优化大文件渲染
3. **用户体验** - 实时预览、同步滚动、键盘快捷键
4. **可访问性** - 遵循无障碍设计原则
5. **专业导出** - 符合打印规范的 PDF 导出

## 📝 License

MIT
