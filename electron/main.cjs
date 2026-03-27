'use strict';

const { app, BrowserWindow, ipcMain, dialog, Menu, shell, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');

// Register custom protocol for loading local images referenced in markdown files
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-resource', privileges: { standard: false, secure: true, supportFetchAPI: true, stream: true } },
]);

// Track file path requested before the window is ready (macOS open-file / argv)
let pendingFilePath = null;
let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 16, y: 18 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    win.loadURL('http://localhost:5173');
  }

  // Once the renderer is ready, send any pending file
  win.webContents.on('did-finish-load', () => {
    if (pendingFilePath) {
      sendFileToRenderer(win, pendingFilePath);
      pendingFilePath = null;
    }
  });

  mainWindow = win;
  return win;
}

function sendFileToRenderer(win, filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    win.webContents.send('file:opened', { filePath, fileName, content });
  } catch (err) {
    console.error('Failed to read file:', err);
  }
}

// macOS: open-file fires when a file is double-clicked or dropped onto the dock icon
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow && mainWindow.webContents) {
    sendFileToRenderer(mainWindow, filePath);
  } else {
    pendingFilePath = filePath;
  }
});

function buildMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open…',
          accelerator: 'CmdOrCtrl+O',
          click: (_, win) => win?.webContents.send('menu:open'),
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: (_, win) => win?.webContents.send('menu:save'),
        },
        {
          label: 'Save As…',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: (_, win) => win?.webContents.send('menu:saveAs'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }]
          : [{ role: 'close' }]),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// IPC: open file dialog
ipcMain.handle('dialog:open', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown'] },
      { name: 'Text', extensions: ['txt'] },
    ],
    properties: ['openFile'],
  });

  if (canceled || filePaths.length === 0) return null;

  const filePath = filePaths[0];
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  return { filePath, fileName, content };
});

// IPC: write to existing path
ipcMain.handle('file:write', async (_event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: save-as dialog
ipcMain.handle('dialog:save', async (_event, defaultName, content) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  });

  if (canceled || !filePath) return null;

  fs.writeFileSync(filePath, content, 'utf-8');
  return { filePath, fileName: path.basename(filePath) };
});

app.whenReady().then(() => {
  // Serve local files (images etc.) referenced by markdown documents
  protocol.handle('local-resource', (request) => {
    const filePath = decodeURIComponent(new URL(request.url).pathname);
    return net.fetch('file://' + filePath);
  });

  buildMenu();
  createWindow();

  // Windows / Linux: file path comes as a command-line argument
  if (process.platform !== 'darwin') {
    const fileArg = process.argv.find((arg) => /\.(md|markdown|txt)$/i.test(arg));
    if (fileArg && fs.existsSync(fileArg)) {
      pendingFilePath = path.resolve(fileArg);
      // Window just created; did-finish-load handler will pick it up
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// macOS: handle second-instance for when app is already running
app.on('second-instance', (_event, argv) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    const fileArg = argv.find((arg) => /\.(md|markdown|txt)$/i.test(arg));
    if (fileArg && fs.existsSync(fileArg)) {
      sendFileToRenderer(mainWindow, path.resolve(fileArg));
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
