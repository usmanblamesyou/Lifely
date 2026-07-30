import {
  Habit,
  CreateHabitInput,
  LogHabitInput,
  HabitLog,
  HabitRecap,
  Area,
  CreateAreaInput,
} from './habit';
import {
  Task,
  CreateTaskInput,
  UpdateTaskStatusInput,
} from './task';
import { ProgressRange, ProgressData } from './progress';
import { JournalEntry } from './journal';

export interface ElectronAPI {
  habits: {
    create: (data: CreateHabitInput) => Promise<Habit>;
    getForDate: (date: string) => Promise<Habit[]>;
    getAll: () => Promise<Habit[]>;
    log: (data: LogHabitInput) => Promise<HabitLog | null>;
    getLogsForDate: (date: string) => Promise<HabitLog[]>;
    getStreak: (habitId: number) => Promise<{ current_streak: number; longest_streak: number }>;
    archive: (habitId: number) => Promise<Habit>;
    unarchive: (habitId: number) => Promise<Habit>;
    end: (data: { habit_id: number; end_date: string }) => Promise<Habit>;
    delete: (habitId: number) => Promise<{ success: boolean }>;
    calculateRecap: (habitId: number) => Promise<HabitRecap>;
    getRecap: (habitId: number) => Promise<HabitRecap>;
  };
  tasks: {
    create: (data: CreateTaskInput) => Promise<Task>;
    getForDate: (date: string) => Promise<Task[]>;
    updateStatus: (data: UpdateTaskStatusInput) => Promise<Task>;
    getAll: () => Promise<Task[]>;
  };
  areas: {
    getAll: () => Promise<Area[]>;
    create: (data: CreateAreaInput) => Promise<Area>;
  };
  progress: {
    getData: (params: { range: ProgressRange; end_date?: string }) => Promise<ProgressData>;
  };
  journal: {
    getForDate: (date: string) => Promise<JournalEntry[]>;
    createEntry: (date: string) => Promise<JournalEntry>;
    updateEntry: (data: { id: number; content?: string; mood?: string | null; ended_at?: string | null }) => Promise<JournalEntry>;
    lockEntry: (data: { id: number; pin: string }) => Promise<JournalEntry>;
    unlockEntry: (data: { id: number; pin: string }) => Promise<{ success: boolean; entry?: JournalEntry }>;
    deleteEntry: (id: number) => Promise<{ success: boolean }>;
  };
  settings: {
    exportData: () => Promise<{ success: boolean; path?: string; error?: string; cancelled?: boolean }>;
    importData: () => Promise<{ success: boolean; counts?: any; error?: string; cancelled?: boolean }>;

    backupDatabase: () => Promise<{ success: boolean; path?: string; error?: string; cancelled?: boolean }>;
    clearAllData: (text: string) => Promise<{ success: boolean; error?: string }>;
    getDatabaseInfo: () => Promise<{
      db_path: string;
      db_size_bytes: number;
      habit_count: number;
      task_count: number;
      log_count: number;
      journal_count: number;
      export_available: boolean;
    }>;
    openDbFolder: () => Promise<{ success: boolean }>;
  };
}


declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    require?: any;
  }
}
