const { app, BrowserWindow, ipcMain, dialog, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: 'DocProps Studio',
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#090a0c',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f1013',
      symbolColor: '#ededed',
      height: 38
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  // Security: prevent navigation to external or untrusted URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  // Security: deny all requests to open new windows
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  mainWindow.loadFile('index.html');

  // Handle file opened via command line argument (e.g. drop on exe or "Open with")
  if (process.argv.length >= 2) {
    const filePath = process.argv[1];
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('open-file-path', filePath);
      });
    }
  }
}

// IPC Handlers for Native Dialogs & System Integration
ipcMain.handle('theme:set', (event, theme) => {
  const isLight = theme === 'light';
  nativeTheme.themeSource = isLight ? 'light' : 'dark';
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.setTitleBarOverlay) {
    try {
      mainWindow.setTitleBarOverlay({
        color: isLight ? '#ffffff' : '#0e1014',
        symbolColor: isLight ? '#0f172a' : '#ededed',
        height: 38
      });
    } catch (e) {
      // Platform may not support titleBarOverlay
    }
  }
  return true;
});

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Office Dokumenty (*.docx, *.pptx, *.xlsx)', extensions: ['docx', 'pptx', 'xlsx', 'dotx', 'potx', 'xltx', 'docm', 'pptm', 'xlsm'] },
      { name: 'Všetky súbory', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const buffer = fs.readFileSync(filePath);
  return {
    filePath,
    fileName: path.basename(filePath),
    fileSize: fs.statSync(filePath).size,
    buffer: buffer
  };
});

ipcMain.handle('file:readFromPath', async (event, filePath) => {
  if (!filePath || typeof filePath !== 'string' || !path.isAbsolute(filePath)) return null;
  if (!fs.existsSync(filePath)) return null;
  try {
    const buffer = fs.readFileSync(filePath);
    return {
      filePath,
      fileName: path.basename(filePath),
      fileSize: fs.statSync(filePath).size,
      buffer: buffer
    };
  } catch (e) {
    return null;
  }
});

ipcMain.handle('dialog:saveFile', async (event, payload) => {
  if (!payload || !payload.bufferData) return { success: false, error: 'Neplatné dáta' };
  const defaultName = typeof payload.defaultName === 'string' ? path.basename(payload.defaultName) : 'dokument.docx';
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: 'Office Dokument', extensions: [defaultName.split('.').pop() || 'docx'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { success: false };
  }

  try {
    const buffer = Buffer.from(payload.bufferData);
    fs.writeFileSync(result.filePath, buffer);
    return { success: true, savedPath: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:saveDirect', async (event, payload) => {
  if (!payload || !payload.filePath || typeof payload.filePath !== 'string' || !payload.bufferData) {
    return { success: false, error: 'Neplatné vstupné parametre' };
  }
  if (!path.isAbsolute(payload.filePath)) {
    return { success: false, error: 'Vyžaduje sa absolútna cesta' };
  }
  try {
    const buffer = Buffer.from(payload.bufferData);
    fs.writeFileSync(payload.filePath, buffer);
    return { success: true, savedPath: payload.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  if (nativeTheme) {
    nativeTheme.themeSource = 'dark';
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

