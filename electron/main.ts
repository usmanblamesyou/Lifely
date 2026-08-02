import { app, BrowserWindow, Menu } from 'electron';
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
  const iconPath = process.platform === 'darwin'
    ? path.join(__dirname, '../build/icons/icon.icns')
    : path.join(__dirname, '../build/icons/icon.ico');

  const winOptions: Electron.BrowserWindowConstructorOptions = {
    width: isPackaged ? 1200 : 1000,
    height: isPackaged ? 800 : 700,
    minWidth: isPackaged ? 900 : undefined,
    minHeight: isPackaged ? 600 : undefined,
    title: 'Lifely',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  };

  // macOS: native inset title bar with traffic-light controls
  if (process.platform === 'darwin') {
    winOptions.titleBarStyle = 'hiddenInset';
  }

  mainWindow = new BrowserWindow(winOptions);

  // Hide the window-level menu bar on Windows/Linux; on macOS the menu is
  // system-level and setMenuBarVisibility is a no-op, but we gate it anyway.
  if (process.platform !== 'darwin') {
    mainWindow.setMenuBarVisibility(false);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

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

  // macOS native application menu (gives Cmd+C/V/Z, Hide, Quit, etc.)
  if (process.platform === 'darwin') {
    const menu = Menu.buildFromTemplate([
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
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' },
          { role: 'front' },
        ],
      },
    ]);
    Menu.setApplicationMenu(menu);
  }

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
