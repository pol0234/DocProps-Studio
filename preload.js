const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  readFromPath: (filePath) => ipcRenderer.invoke('file:readFromPath', filePath),
  saveFileDialog: (defaultName, bufferData) => ipcRenderer.invoke('dialog:saveFile', { defaultName, bufferData }),
  saveDirect: (filePath, bufferData) => ipcRenderer.invoke('file:saveDirect', { filePath, bufferData }),
  setTheme: (theme) => ipcRenderer.invoke('theme:set', theme),
  onOpenFileFromSystem: (callback) => ipcRenderer.on('open-file-path', (event, filePath) => callback(filePath))
});

