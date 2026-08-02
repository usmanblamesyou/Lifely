import { contextBridge, ipcRenderer } from 'electron';

// Synchronous Theme Initialization before DOM / React mount (prevents theme flash)
try {
  const themeConfig = ipcRenderer.sendSync('settings:get-theme-sync');
  if (themeConfig && themeConfig.colors) {
    const style = document.createElement('style');
    style.id = 'theme-init-style';
    style.textContent = `:root {
      --bg-base: ${themeConfig.colors.bg_base};
      --bg-surface: ${themeConfig.colors.bg_surface};
      --bg-elevated: ${themeConfig.colors.bg_elevated};
      --bg-card: ${themeConfig.colors.bg_card};
      --text-primary: ${themeConfig.colors.text_primary};
      --text-secondary: ${themeConfig.colors.text_secondary};
      --text-dim: ${themeConfig.colors.text_dim};
      --accent: ${themeConfig.colors.accent};
      --accent-hover: ${themeConfig.colors.accent_hover};
      --border-color: ${themeConfig.colors.border_color};
    }`;
    (document.head || document.documentElement).appendChild(style);
  }
} catch (e) {
  console.error('Failed synchronous theme initialization in preload:', e);
}

// macOS: stamp a class on <html> synchronously before React hydrates so that
// mac-only CSS rules (drag regions, traffic-light clearance) can be gated on
// html.platform-mac without ever activating on Windows/Linux.
// process.platform is available here because sandbox: false keeps Node.js
// accessible in the preload context even with contextIsolation: true.
if (process.platform === 'darwin') {
  document.documentElement.classList.add('platform-mac');
}

contextBridge.exposeInMainWorld('electronAPI', {
  habits: {
    create: (data: any) => ipcRenderer.invoke('habits:create', data),
    getForDate: (date: string) => ipcRenderer.invoke('habits:get-for-date', date),
    getAll: () => ipcRenderer.invoke('habits:get-all'),
    log: (data: any) => ipcRenderer.invoke('habits:log', data),
    getLogsForDate: (date: string) => ipcRenderer.invoke('habits:get-logs-for-date', date),
    getStreak: (habitId: number) => ipcRenderer.invoke('habits:get-streak', habitId),
    archive: (habitId: number) => ipcRenderer.invoke('habits:archive', habitId),
    unarchive: (habitId: number) => ipcRenderer.invoke('habits:unarchive', habitId),
    end: (data: any) => ipcRenderer.invoke('habits:end', data),
    delete: (habitId: number) => ipcRenderer.invoke('habits:delete', habitId),
    update: (data: any) => ipcRenderer.invoke('habits:update', data),
    reorder: (updates: any[]) => ipcRenderer.invoke('habits:reorder', updates),
    calculateRecap: (habitId: number) => ipcRenderer.invoke('habits:calculate-recap', habitId),
    getRecap: (habitId: number) => ipcRenderer.invoke('habits:get-recap', habitId),
  },
  tasks: {
    create: (data: any) => ipcRenderer.invoke('tasks:create', data),
    getForDate: (date: string) => ipcRenderer.invoke('tasks:get-for-date', date),
    updateStatus: (data: any) => ipcRenderer.invoke('tasks:update-status', data),
    getAll: () => ipcRenderer.invoke('tasks:get-all'),
    delete: (taskId: number) => ipcRenderer.invoke('tasks:delete', taskId),
    update: (data: any) => ipcRenderer.invoke('tasks:update', data),
    reorder: (updates: any[]) => ipcRenderer.invoke('tasks:reorder', updates),
  },
  areas: {
    getAll: () => ipcRenderer.invoke('areas:get-all'),
    create: (data: any) => ipcRenderer.invoke('areas:create', data),
  },
  progress: {
    getData: (params: any) => ipcRenderer.invoke('progress:get-data', params),
  },
  journal: {
    getForDate: (date: string) => ipcRenderer.invoke('journal:get-for-date', date),
    createEntry: (date: string) => ipcRenderer.invoke('journal:create-entry', date),
    updateEntry: (data: any) => ipcRenderer.invoke('journal:update-entry', data),
    lockEntry: (data: any) => ipcRenderer.invoke('journal:lock-entry', data),
    unlockEntry: (data: any) => ipcRenderer.invoke('journal:unlock-entry', data),
    deleteEntry: (id: number) => ipcRenderer.invoke('journal:delete-entry', id),
  },
  settings: {
    exportData: () => ipcRenderer.invoke('settings:export-data'),
    importData: () => ipcRenderer.invoke('settings:import-data'),
    backupDatabase: () => ipcRenderer.invoke('settings:backup-database'),
    clearAllData: (text: string) => ipcRenderer.invoke('settings:clear-all-data', text),
    getDatabaseInfo: () => ipcRenderer.invoke('settings:get-database-info'),
    openDbFolder: () => ipcRenderer.invoke('settings:open-db-folder'),
    getTheme: () => ipcRenderer.invoke('settings:get-theme'),
    saveTheme: (config: any) => ipcRenderer.invoke('settings:save-theme', config),
  },
});

