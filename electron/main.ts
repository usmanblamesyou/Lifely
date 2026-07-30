import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { initDatabase } from './db/connection';
import { setupIpcHandlers } from './db/handlers';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  // Initialize Database and IPC handlers
  initDatabase();
  setupIpcHandlers();

  const isPackaged = app.isPackaged;
  const iconPath = path.join(__dirname, '../build/icons/icon.ico');

  mainWindow = new BrowserWindow({
    width: isPackaged ? 1200 : 1000,
    height: isPackaged ? 800 : 700,
    minWidth: isPackaged ? 900 : undefined,
    minHeight: isPackaged ? 600 : undefined,
    title: 'Lifely - Local Habit & Task Tracker',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isPackaged) {
    mainWindow.setMenuBarVisibility(false);
  }

  const outPath = path.join(__dirname, '../out/index.html');
  if (fs.existsSync(outPath)) {
    mainWindow.loadFile(outPath);
  } else {
    mainWindow.loadURL('http://localhost:3000');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
