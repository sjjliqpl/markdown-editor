'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // Trigger from renderer
  openFile: () => ipcRenderer.invoke('dialog:open'),
  writeFile: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content),
  saveFileAs: (defaultName, content) => ipcRenderer.invoke('dialog:save', defaultName, content),
  openExternalUrl: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Listen for menu events
  onMenuNew: (callback) => ipcRenderer.on('menu:new', callback),
  onMenuOpen: (callback) => ipcRenderer.on('menu:open', callback),
  onMenuSave: (callback) => ipcRenderer.on('menu:save', callback),
  onMenuSaveAs: (callback) => ipcRenderer.on('menu:saveAs', callback),

  // Listen for externally opened files (double-click, drag to dock, etc.)
  onFileOpened: (callback) => ipcRenderer.on('file:opened', (_event, data) => callback(data)),

  // Cleanup listeners
  removeMenuListeners: () => {
    ipcRenderer.removeAllListeners('menu:new');
    ipcRenderer.removeAllListeners('menu:open');
    ipcRenderer.removeAllListeners('menu:save');
    ipcRenderer.removeAllListeners('menu:saveAs');
    ipcRenderer.removeAllListeners('file:opened');
  },
});
