const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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
    backgroundColor: '#0c0d0e',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#141517',
      symbolColor: '#ededed',
      height: 38
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
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

// IPC Handlers for Native Dialogs
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
    buffer: Array.from(buffer)
  };
});

ipcMain.handle('file:readFromPath', async (event, filePath) => {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return {
    filePath,
    fileName: path.basename(filePath),
    fileSize: fs.statSync(filePath).size,
    buffer: Array.from(buffer)
  };
});

ipcMain.handle('dialog:saveFile', async (event, { defaultName, bufferData }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: 'Office Dokument', extensions: [defaultName.split('.').pop() || 'docx'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { success: false };
  }

  const buffer = Buffer.from(bufferData);
  fs.writeFileSync(result.filePath, buffer);
  return { success: true, savedPath: result.filePath };
});

app.whenReady().then(createWindow);

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
