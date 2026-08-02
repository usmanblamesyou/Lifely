import type Database from 'better-sqlite3';

export function initSchema(db: Database.Database): void {
  // 1. areas
  db.exec(`
    CREATE TABLE IF NOT EXISTS areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 2. habits
  db.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('build', 'break')),
      repeat_type TEXT NOT NULL CHECK(repeat_type IN ('daily', 'weekly', 'monthly')),
      repeat_days TEXT,
      goal_count INTEGER NOT NULL DEFAULT 1,
      goal_period TEXT NOT NULL CHECK(goal_period IN ('day', 'week', 'month')),
      time_of_day TEXT,
      area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      end_condition TEXT NOT NULL CHECK(end_condition IN ('never', 'on_date', 'after_reps')),
      end_condition_value TEXT,
      reminder_times TEXT,
      is_archived INTEGER NOT NULL DEFAULT 0 CHECK(is_archived IN (0,1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_habits_area_id ON habits(area_id);
    CREATE INDEX IF NOT EXISTS idx_habits_start_date ON habits(start_date);
    CREATE INDEX IF NOT EXISTS idx_habits_is_archived ON habits(is_archived);
  `);

  // 3. habit_logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      log_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('completed', 'skipped', 'failed', 'none')),
      count INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(habit_id, log_date)
    );

    CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id);
    CREATE INDEX IF NOT EXISTS idx_habit_logs_log_date ON habit_logs(log_date);
    CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON habit_logs(habit_id, log_date);
  `);

  // 4. tasks
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      notes TEXT,
      due_date TEXT NOT NULL,
      due_time TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'skipped')),
      area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL,
      priority TEXT CHECK(priority IN ('low', 'medium', 'high', NULL)),
      time_of_day TEXT NOT NULL DEFAULT 'morning' CHECK(time_of_day IN ('morning', 'afternoon', 'evening')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_area_id ON tasks(area_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  `);

  // 5. journal_entries
  db.exec(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_date TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      mood TEXT CHECK(mood IN ('great', 'good', 'neutral', 'bad', 'terrible', NULL)),
      content TEXT NOT NULL DEFAULT '',
      is_locked INTEGER NOT NULL DEFAULT 0 CHECK(is_locked IN (0,1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON journal_entries(entry_date);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_started_at ON journal_entries(started_at);
  `);

  // 6. checklist_items
  db.exec(`
    CREATE TABLE IF NOT EXISTS checklist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_checklist_items_habit_id ON checklist_items(habit_id);
  `);

  // 7. habit_recap_cache
  db.exec(`
    CREATE TABLE IF NOT EXISTS habit_recap_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      total_days_active INTEGER NOT NULL,
      days_completed INTEGER NOT NULL,
      days_missed INTEGER NOT NULL,
      days_skipped INTEGER NOT NULL,
      completion_rate REAL NOT NULL,
      longest_streak INTEGER NOT NULL,
      worst_miss_window INTEGER NOT NULL,
      calculated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(habit_id)
    );

    CREATE INDEX IF NOT EXISTS idx_habit_recap_cache_habit_id ON habit_recap_cache(habit_id);
  `);

  // 8. settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}
