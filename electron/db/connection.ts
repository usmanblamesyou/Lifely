import Database from 'better-sqlite3';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { initSchema } from './schema';

let dbInstance: Database.Database | null = null;
let resolvedDbPath = '';

export function getDatabasePath(): string {
  if (resolvedDbPath) {
    return resolvedDbPath;
  }

  const isDev = !app.isPackaged;
  if (isDev) {
    const rootDir = process.cwd();
    const dataDir = path.join(rootDir, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    resolvedDbPath = path.join(dataDir, 'dev.db');
  } else {
    const userDataDir = app.getPath('userData');
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    resolvedDbPath = path.join(userDataDir, 'app.db');
  }

  return resolvedDbPath;
}

export function initDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDatabasePath();
  console.log(`[DATABASE] Absolute DB Path: ${dbPath}`);

  dbInstance = new Database(dbPath);

  // Set PRAGMAs on every database open
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('busy_timeout = 5000');

  // Initialize production schema
  initSchema(dbInstance);

  // Migration block for tasks table columns (idempotent try/catch)
  try { dbInstance.exec('ALTER TABLE tasks ADD COLUMN repeat_type TEXT NOT NULL DEFAULT "none"'); } catch {}
  try { dbInstance.exec('ALTER TABLE tasks ADD COLUMN repeat_days TEXT'); } catch {}
  try { dbInstance.exec('ALTER TABLE tasks ADD COLUMN checklist_json TEXT'); } catch {}
  try { dbInstance.exec('ALTER TABLE tasks ADD COLUMN last_completed_date TEXT'); } catch {}
  try { dbInstance.exec('ALTER TABLE tasks ADD COLUMN last_skipped_date TEXT'); } catch {}

  // Migration block for journal_entries table columns
  try { dbInstance.exec('ALTER TABLE journal_entries ADD COLUMN pin_hash TEXT'); } catch {}

  return dbInstance;
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}
