import { contextBridge, ipcRenderer } from 'electron';

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
    calculateRecap: (habitId: number) => ipcRenderer.invoke('habits:calculate-recap', habitId),
    getRecap: (habitId: number) => ipcRenderer.invoke('habits:get-recap', habitId),
  },
  tasks: {
    create: (data: any) => ipcRenderer.invoke('tasks:create', data),
    getForDate: (date: string) => ipcRenderer.invoke('tasks:get-for-date', date),
    updateStatus: (data: any) => ipcRenderer.invoke('tasks:update-status', data),
    getAll: () => ipcRenderer.invoke('tasks:get-all'),
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
  },
});

