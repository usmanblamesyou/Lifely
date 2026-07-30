import { ipcMain, dialog, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { getDb, getDatabasePath } from './connection';

export type DayLog = { log_date: string; status: string };

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDifferenceInDays(d1: Date, d2: Date): number {
  const msPerDay = 86400000;
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((utc1 - utc2) / msPerDay);
}

function calculateStreak(
  logs: DayLog[],
  direction: 'build' | 'break' = 'build'
): number {
  if (!logs || logs.length === 0) return 0;

  const sorted = [...logs].sort((a, b) => (a.log_date < b.log_date ? 1 : -1));

  let streak = 0;
  let prevDate: Date | null = null;

  for (const log of sorted) {
    if (log.status !== 'completed') {
      break;
    }

    const currentDate = parseLocalDate(log.log_date);

    if (prevDate !== null) {
      const diff = getDifferenceInDays(prevDate, currentDate);
      if (diff !== 1) {
        break;
      }
    }

    streak++;
    prevDate = currentDate;
  }

  return streak;
}

function calculateLongestStreak(logs: DayLog[]): number {
  if (!logs || logs.length === 0) return 0;

  const sorted = [...logs].sort((a, b) => (a.log_date > b.log_date ? 1 : -1));

  let maxRun = 0;
  let currentRun = 0;
  let prevDate: Date | null = null;

  for (const log of sorted) {
    const currentDate = parseLocalDate(log.log_date);

    if (log.status === 'completed') {
      if (prevDate === null) {
        currentRun = 1;
      } else {
        const diff = getDifferenceInDays(currentDate, prevDate);
        if (diff === 1) {
          currentRun++;
        } else {
          currentRun = 1;
        }
      }
      if (currentRun > maxRun) {
        maxRun = currentRun;
      }
    } else {
      currentRun = 0;
    }

    prevDate = currentDate;
  }

  return maxRun;
}

function parseJsonField<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function formatHabitRow(db: any, row: any, dateStr?: string) {
  const checklistRows = db
    .prepare('SELECT * FROM checklist_items WHERE habit_id = ? ORDER BY position ASC')
    .all(row.id);

  let logObj = null;
  if (dateStr) {
    const logRow = db
      .prepare('SELECT id, status, count, note FROM habit_logs WHERE habit_id = ? AND log_date = ?')
      .get(row.id, dateStr);
    if (logRow) {
      logObj = {
        id: logRow.id,
        status: logRow.status,
        count: logRow.count,
        note: logRow.note,
      };
    }
  }

  return {
    ...row,
    is_archived: Boolean(row.is_archived),
    repeat_days: parseJsonField<number[]>(row.repeat_days),
    time_of_day: parseJsonField<('morning' | 'afternoon' | 'evening')[]>(row.time_of_day),
    reminder_times: parseJsonField<string[]>(row.reminder_times),
    checklist_items: checklistRows,
    log: logObj,
  };
}

function formatTaskRow(row: any, dateStr?: string) {
  const checklistItems = parseJsonField<string[]>(row.checklist_json) || [];
  const repeatDays = parseJsonField<number[]>(row.repeat_days);

  let effectiveStatus = row.status || 'pending';
  if (dateStr && row.repeat_type && row.repeat_type !== 'none') {
    if (row.last_completed_date === dateStr) {
      effectiveStatus = 'completed';
    } else if (row.last_skipped_date === dateStr) {
      effectiveStatus = 'skipped';
    } else {
      effectiveStatus = 'pending';
    }
  }

  return {
    ...row,
    status: effectiveStatus,
    repeat_days: repeatDays,
    checklist_json: checklistItems,
  };
}

function computeHabitRecap(db: any, habitId: number) {
  const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(habitId);
  if (!habit) return null;

  const nowIso = new Date().toISOString();
  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const startDateStr = habit.start_date;
  const endDateStr = habit.end_date || getTodayStr();

  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [eY, eM, eD] = endDateStr.split('-').map(Number);

  const msPerDay = 86400000;
  const startUtc = Date.UTC(sY, sM - 1, sD);
  const endUtc = Date.UTC(eY, eM - 1, eD);

  const total_days_active = Math.max(1, Math.round((endUtc - startUtc) / msPerDay) + 1);

  const logs = db
    .prepare('SELECT log_date, status FROM habit_logs WHERE habit_id = ? ORDER BY log_date ASC')
    .all(habitId) as DayLog[];

  const logMap = new Map<string, string>();
  let days_completed = 0;
  let days_skipped = 0;

  const dayOfWeekCompletions = [0, 0, 0, 0, 0, 0, 0];

  logs.forEach((log) => {
    logMap.set(log.log_date, log.status);
    if (log.status === 'completed') {
      days_completed++;
      const [y, m, d] = log.log_date.split('-').map(Number);
      const dayIdx = new Date(y, m - 1, d).getDay();
      dayOfWeekCompletions[dayIdx]++;
    } else if (log.status === 'skipped') {
      days_skipped++;
    }
  });

  const days_missed = Math.max(0, total_days_active - days_completed - days_skipped);
  const completion_rate = Math.round((days_completed / total_days_active) * 10000) / 10000;

  const longest_streak = calculateLongestStreak(logs);
  const current_streak = calculateStreak(logs, habit.type);

  // Calculate worst_miss_window (consecutive days in range where status is 'failed' OR missing log)
  let maxMissWindow = 0;
  let currentMissWindow = 0;

  const curr = new Date(sY, sM - 1, sD);
  const end = new Date(eY, eM - 1, eD);

  while (curr <= end) {
    const cY = curr.getFullYear();
    const cM = String(curr.getMonth() + 1).padStart(2, '0');
    const cD = String(curr.getDate()).padStart(2, '0');
    const dateStr = `${cY}-${cM}-${cD}`;

    const st = logMap.get(dateStr);
    if (!st || st === 'failed') {
      currentMissWindow++;
      if (currentMissWindow > maxMissWindow) {
        maxMissWindow = currentMissWindow;
      }
    } else {
      currentMissWindow = 0;
    }

    curr.setDate(curr.getDate() + 1);
  }

  // Calculate best_day_of_week
  let maxCompletions = 0;
  let bestDayIdx: number | null = null;
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  dayOfWeekCompletions.forEach((count, idx) => {
    if (count > maxCompletions) {
      maxCompletions = count;
      bestDayIdx = idx;
    }
  });

  const best_day_of_week =
    bestDayIdx !== null && maxCompletions > 0
      ? { day: bestDayIdx, label: dayNames[bestDayIdx] }
      : null;

  const recapData = {
    habit_id: habit.id,
    habit_name: habit.name,
    habit_type: habit.type,
    start_date: startDateStr,
    end_date: endDateStr,
    total_days_active,
    days_completed,
    days_missed,
    days_skipped,
    completion_rate,
    longest_streak,
    current_streak,
    worst_miss_window: maxMissWindow,
    best_day_of_week,
    total_logged_days: logs.length,
    logs: logs.map((l) => ({ log_date: l.log_date, status: l.status })),
  };

  db.prepare(`
    INSERT INTO habit_recap_cache (
      habit_id, total_days_active, days_completed, days_missed, days_skipped,
      completion_rate, longest_streak, worst_miss_window, calculated_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(habit_id) DO UPDATE SET
      total_days_active = excluded.total_days_active,
      days_completed = excluded.days_completed,
      days_missed = excluded.days_missed,
      days_skipped = excluded.days_skipped,
      completion_rate = excluded.completion_rate,
      longest_streak = excluded.longest_streak,
      worst_miss_window = excluded.worst_miss_window,
      calculated_at = excluded.calculated_at,
      updated_at = excluded.updated_at
  `).run(
    habit.id,
    total_days_active,
    days_completed,
    days_missed,
    days_skipped,
    completion_rate,
    longest_streak,
    maxMissWindow,
    nowIso,
    nowIso,
    nowIso
  );

  return recapData;
}

export function setupIpcHandlers(): void {
  // --- HABITS HANDLERS ---
  ipcMain.handle('habits:create', async (_, data: any) => {
    const db = getDb();
    const now = new Date().toISOString();

    const endDate =
      data.end_condition === 'on_date' && data.end_condition_value
        ? data.end_condition_value
        : null;

    const repeatDaysStr =
      data.repeat_days && data.repeat_days.length > 0
        ? JSON.stringify(data.repeat_days)
        : null;

    const timeOfDayStr =
      data.time_of_day && data.time_of_day.length > 0
        ? JSON.stringify(data.time_of_day)
        : null;

    const reminderTimesStr =
      data.reminder_times && data.reminder_times.length > 0
        ? JSON.stringify(data.reminder_times)
        : null;

    const insertHabit = db.prepare(`
      INSERT INTO habits (
        name, type, repeat_type, repeat_days, goal_count, goal_period,
        time_of_day, area_id, start_date, end_date, end_condition,
        end_condition_value, reminder_times, is_archived, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, 0, ?, ?
      )
    `);

    const insertChecklistItem = db.prepare(`
      INSERT INTO checklist_items (
        habit_id, label, position, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `);

    let habitId = 0;

    const createTransaction = db.transaction(() => {
      const res = insertHabit.run(
        data.name,
        data.type,
        data.repeat_type,
        repeatDaysStr,
        data.goal_count || 1,
        data.goal_period || 'day',
        timeOfDayStr,
        data.area_id || null,
        data.start_date,
        endDate,
        data.end_condition,
        data.end_condition_value || null,
        reminderTimesStr,
        now,
        now
      );

      habitId = Number(res.lastInsertRowid);

      if (Array.isArray(data.checklist_items)) {
        data.checklist_items.forEach((label: string, index: number) => {
          if (label && label.trim().length > 0) {
            insertChecklistItem.run(habitId, label.trim(), index, now, now);
          }
        });
      }
    });

    createTransaction();

    const insertedRow = db
      .prepare('SELECT * FROM habits WHERE id = ?')
      .get(habitId);

    return formatHabitRow(db, insertedRow);
  });

  ipcMain.handle('habits:log', async (_, data: any) => {
    const db = getDb();
    const now = new Date().toISOString();
    const { habit_id, log_date, status, note } = data;

    if (status === 'none') {
      db.prepare('DELETE FROM habit_logs WHERE habit_id = ? AND log_date = ?').run(
        habit_id,
        log_date
      );
      return null;
    }

    const count =
      typeof data.count === 'number'
        ? data.count
        : status === 'completed'
        ? 1
        : 0;

    const existing = db
      .prepare('SELECT id FROM habit_logs WHERE habit_id = ? AND log_date = ?')
      .get(habit_id, log_date) as { id: number } | undefined;

    if (existing) {
      db.prepare(
        'UPDATE habit_logs SET status = ?, count = ?, note = ?, updated_at = ? WHERE habit_id = ? AND log_date = ?'
      ).run(status, count, note || null, now, habit_id, log_date);
    } else {
      db.prepare(
        'INSERT INTO habit_logs (habit_id, log_date, status, count, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(status, log_date, status, count, note || null, now, now);
    }

    return db
      .prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND log_date = ?')
      .get(habit_id, log_date);
  });

  ipcMain.handle('habits:get-logs-for-date', async (_, dateStr: string) => {
    const db = getDb();
    return db
      .prepare('SELECT * FROM habit_logs WHERE log_date = ?')
      .all(dateStr);
  });

  ipcMain.handle('habits:get-for-date', async (_, dateStr: string) => {
    const db = getDb();

    const habitRows = db
      .prepare(`
        SELECT * FROM habits
        WHERE is_archived = 0
          AND start_date <= ?
          AND (end_date IS NULL OR end_date >= ?)
        ORDER BY created_at ASC
      `)
      .all(dateStr, dateStr);

    const [year, month, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const dayOfWeek = targetDate.getDay();
    const dayOfMonth = targetDate.getDate();

    const matchedHabits = habitRows.filter((row: any) => {
      if (row.repeat_type === 'daily') {
        return true;
      }
      if (row.repeat_type === 'weekly') {
        const days = parseJsonField<number[]>(row.repeat_days);
        return Array.isArray(days) && days.includes(dayOfWeek);
      }
      if (row.repeat_type === 'monthly') {
        const days = parseJsonField<number[]>(row.repeat_days);
        return Array.isArray(days) && days.includes(dayOfMonth);
      }
      return false;
    });

    return matchedHabits.map((row: any) => formatHabitRow(db, row, dateStr));
  });

  ipcMain.handle('habits:get-streak', async (_, habitId: number) => {
    const db = getDb();
    const habit = db
      .prepare('SELECT type FROM habits WHERE id = ?')
      .get(habitId) as { type: 'build' | 'break' } | undefined;

    if (!habit) {
      return { current_streak: 0, longest_streak: 0 };
    }

    const logs = db
      .prepare(
        'SELECT log_date, status FROM habit_logs WHERE habit_id = ? ORDER BY log_date ASC'
      )
      .all(habitId) as DayLog[];

    const current_streak = calculateStreak(logs, habit.type);
    const longest_streak = calculateLongestStreak(logs);

    return { current_streak, longest_streak };
  });

  ipcMain.handle('habits:archive', async (_, habitId: number) => {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare('UPDATE habits SET is_archived = 1, updated_at = ? WHERE id = ?').run(
      now,
      habitId
    );

    const row = db.prepare('SELECT * FROM habits WHERE id = ?').get(habitId);
    return formatHabitRow(db, row);
  });

  ipcMain.handle('habits:unarchive', async (_, habitId: number) => {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare('UPDATE habits SET is_archived = 0, updated_at = ? WHERE id = ?').run(
      now,
      habitId
    );

    const row = db.prepare('SELECT * FROM habits WHERE id = ?').get(habitId);
    return formatHabitRow(db, row);
  });

  ipcMain.handle('habits:end', async (_, data: { habit_id: number; end_date: string }) => {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare('UPDATE habits SET end_date = ?, updated_at = ? WHERE id = ?').run(
      data.end_date,
      now,
      data.habit_id
    );

    const row = db.prepare('SELECT * FROM habits WHERE id = ?').get(data.habit_id);
    return formatHabitRow(db, row);
  });

  ipcMain.handle('habits:delete', async (_, habitId: number) => {
    const db = getDb();
    db.prepare('DELETE FROM habits WHERE id = ?').run(habitId);
    db.prepare('DELETE FROM habit_recap_cache WHERE habit_id = ?').run(habitId);
    return { success: true };
  });

  ipcMain.handle('habits:calculate-recap', async (_, habitId: number) => {
    const db = getDb();
    return computeHabitRecap(db, habitId);
  });

  ipcMain.handle('habits:get-recap', async (_, habitId: number) => {
    const db = getDb();
    const cachedRow = db
      .prepare('SELECT * FROM habit_recap_cache WHERE habit_id = ?')
      .get(habitId) as any;

    if (cachedRow) {
      const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(habitId) as any;
      if (habit) {
        const logs = db
          .prepare('SELECT log_date, status FROM habit_logs WHERE habit_id = ? ORDER BY log_date ASC')
          .all(habitId) as DayLog[];

        const dayOfWeekCompletions = [0, 0, 0, 0, 0, 0, 0];
        logs.forEach((log) => {
          if (log.status === 'completed') {
            const [y, m, d] = log.log_date.split('-').map(Number);
            const dayIdx = new Date(y, m - 1, d).getDay();
            dayOfWeekCompletions[dayIdx]++;
          }
        });

        let maxCompletions = 0;
        let bestDayIdx: number | null = null;
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        dayOfWeekCompletions.forEach((count, idx) => {
          if (count > maxCompletions) {
            maxCompletions = count;
            bestDayIdx = idx;
          }
        });

        const best_day_of_week =
          bestDayIdx !== null && maxCompletions > 0
            ? { day: bestDayIdx, label: dayNames[bestDayIdx] }
            : null;

        const current_streak = calculateStreak(logs, habit.type);

        return {
          habit_id: habit.id,
          habit_name: habit.name,
          habit_type: habit.type,
          start_date: habit.start_date,
          end_date: habit.end_date || habit.start_date,
          total_days_active: cachedRow.total_days_active,
          days_completed: cachedRow.days_completed,
          days_missed: cachedRow.days_missed,
          days_skipped: cachedRow.days_skipped,
          completion_rate: cachedRow.completion_rate,
          longest_streak: cachedRow.longest_streak,
          current_streak,
          worst_miss_window: cachedRow.worst_miss_window,
          best_day_of_week,
          total_logged_days: logs.length,
          logs: logs.map((l) => ({ log_date: l.log_date, status: l.status })),
        };
      }
    }

    return computeHabitRecap(db, habitId);
  });

  ipcMain.handle('habits:get-all', async () => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM habits ORDER BY created_at DESC').all();

    return rows.map((row: any) => {
      const formatted = formatHabitRow(db, row);
      const logs = db
        .prepare('SELECT log_date, status FROM habit_logs WHERE habit_id = ? ORDER BY log_date ASC')
        .all(row.id) as DayLog[];

      const current_streak = calculateStreak(logs, row.type);
      return {
        ...formatted,
        current_streak,
      };
    });
  });

  // --- PROGRESS HANDLER ---
  ipcMain.handle('progress:get-data', async (_, params: { range: string; end_date?: string }) => {
    const db = getDb();
    const getTodayStr = () => {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const endDateStr = params.end_date || getTodayStr();
    const [eY, eM, eD] = endDateStr.split('-').map(Number);
    const endObj = new Date(eY, eM - 1, eD);

    const startObj = new Date(eY, eM - 1, eD);
    const range = params.range || '7d';

    if (range === '7d') {
      startObj.setDate(startObj.getDate() - 6);
    } else if (range === '14d') {
      startObj.setDate(startObj.getDate() - 13);
    } else if (range === '1m') {
      startObj.setMonth(startObj.getMonth() - 1);
    } else if (range === '3m') {
      startObj.setMonth(startObj.getMonth() - 3);
    } else if (range === '6m') {
      startObj.setMonth(startObj.getMonth() - 6);
    } else if (range === '1y') {
      startObj.setFullYear(startObj.getFullYear() - 1);
    }

    const rangeStartStr = formatDateIso(startObj);
    const rangeEndStr = formatDateIso(endObj);

    const days: any[] = [];
    const curr = new Date(startObj.getFullYear(), startObj.getMonth(), startObj.getDate());

    const allHabits = db.prepare('SELECT * FROM habits WHERE is_archived = 0').all() as any[];
    const allTasks = db.prepare('SELECT * FROM tasks').all() as any[];
    const allHabitLogs = db.prepare('SELECT * FROM habit_logs').all() as any[];

    // Map logs by habit_id and log_date
    const habitLogsMap = new Map<string, string>();
    allHabitLogs.forEach((l) => {
      habitLogsMap.set(`${l.habit_id}_${l.log_date}`, l.status);
    });

    while (curr <= endObj) {
      const dayStr = formatDateIso(curr);
      const dayOfWeek = curr.getDay();
      const dayOfMonth = curr.getDate();

      // 1. Scheduled Habits for dayStr
      const scheduledHabits = allHabits.filter((h) => {
        if (h.start_date > dayStr) return false;
        if (h.end_date && h.end_date < dayStr) return false;

        if (h.repeat_type === 'daily') return true;
        if (h.repeat_type === 'weekly') {
          const days = parseJsonField<number[]>(h.repeat_days);
          return Array.isArray(days) && days.includes(dayOfWeek);
        }
        if (h.repeat_type === 'monthly') {
          const days = parseJsonField<number[]>(h.repeat_days);
          return Array.isArray(days) && days.includes(dayOfMonth);
        }
        return false;
      });

      // 2. Scheduled Tasks for dayStr
      const scheduledTasks = allTasks.filter((t) => {
        if (t.repeat_type === 'none') {
          return t.due_date === dayStr;
        }
        if (t.due_date > dayStr) return false;
        if (t.repeat_type === 'daily') return true;
        if (t.repeat_type === 'weekly') {
          const days = parseJsonField<number[]>(t.repeat_days);
          return Array.isArray(days) && days.includes(dayOfWeek);
        }
        if (t.repeat_type === 'monthly') {
          const days = parseJsonField<number[]>(t.repeat_days);
          return Array.isArray(days) && days.includes(dayOfMonth);
        }
        return false;
      });

      const scheduled_count = scheduledHabits.length + scheduledTasks.length;

      // 3. Completed Habits
      let completed_habits = 0;
      scheduledHabits.forEach((h) => {
        const st = habitLogsMap.get(`${h.id}_${dayStr}`);
        if (st === 'completed') {
          completed_habits++;
        }
      });

      // 4. Completed Tasks
      let completed_tasks = 0;
      scheduledTasks.forEach((t) => {
        if (t.repeat_type === 'none') {
          if (t.status === 'completed' && t.due_date === dayStr) {
            completed_tasks++;
          }
        } else {
          if (t.last_completed_date === dayStr) {
            completed_tasks++;
          }
        }
      });

      const completed_count = completed_habits + completed_tasks;

      let daily_score: number | null = null;
      let tier: 'perfect' | 'good' | 'poor' | 'empty' = 'empty';

      if (scheduled_count > 0) {
        daily_score = Math.round((completed_count / scheduled_count) * 10000) / 10000;
        if (daily_score === 1.0) {
          tier = 'perfect';
        } else if (daily_score >= 0.5) {
          tier = 'good';
        } else {
          tier = 'poor';
        }
      }

      days.push({
        date: dayStr,
        daily_score,
        tier,
        scheduled_count,
        completed_count,
      });

      curr.setDate(curr.getDate() + 1);
    }

    // Summary Stats
    const total_days = days.length;
    let perfect_days = 0;
    let good_days = 0;
    let poor_days = 0;
    let empty_days = 0;
    let total_completed = 0;
    let total_scheduled = 0;

    const nonEmptyDays = days.filter((d) => d.daily_score !== null);

    days.forEach((d) => {
      if (d.tier === 'perfect') perfect_days++;
      else if (d.tier === 'good') good_days++;
      else if (d.tier === 'poor') poor_days++;
      else empty_days++;

      total_completed += d.completed_count;
      total_scheduled += d.scheduled_count;
    });

    let average_completion_rate = 0;
    if (nonEmptyDays.length > 0) {
      const sumScores = nonEmptyDays.reduce((acc, d) => acc + (d.daily_score || 0), 0);
      average_completion_rate = Math.round((sumScores / nonEmptyDays.length) * 10000) / 10000;
    }

    let best_day: string | null = null;
    let highestScore = -1;
    nonEmptyDays.forEach((d) => {
      if (d.daily_score !== null && d.daily_score >= highestScore) {
        highestScore = d.daily_score;
        best_day = d.date;
      }
    });

    let worst_day: string | null = null;
    let lowestScore = 999;
    nonEmptyDays.forEach((d) => {
      if (d.daily_score !== null && d.daily_score <= lowestScore) {
        lowestScore = d.daily_score;
        worst_day = d.date;
      }
    });

    let best_streak = 0;
    let currentStreakRun = 0;
    days.forEach((d) => {
      if (d.tier === 'perfect' || d.tier === 'good') {
        currentStreakRun++;
        if (currentStreakRun > best_streak) {
          best_streak = currentStreakRun;
        }
      } else {
        currentStreakRun = 0;
      }
    });

    // Habit Breakdown Table
    const habitBreakdowns: any[] = [];
    (allHabits as any[]).forEach((h) => {
      let days_scheduled = 0;

      days.forEach((d) => {
        if (h.start_date <= d.date && (!h.end_date || h.end_date >= d.date)) {
          const [y, m, dayNum] = d.date.split('-').map(Number);
          const dt = new Date(y, m - 1, dayNum);
          const dayOfWeek = dt.getDay();
          const dayOfMonth = dt.getDate();

          let match = false;
          if (h.repeat_type === 'daily') match = true;
          else if (h.repeat_type === 'weekly') {
            const rDays = parseJsonField<number[]>(h.repeat_days);
            match = Array.isArray(rDays) && rDays.includes(dayOfWeek);
          } else if (h.repeat_type === 'monthly') {
            const rDays = parseJsonField<number[]>(h.repeat_days);
            match = Array.isArray(rDays) && rDays.includes(dayOfMonth);
          }

          if (match) days_scheduled++;
        }
      });

      if (days_scheduled > 0) {
        const logsInRange = (allHabitLogs as any[]).filter(
          (l) => l.habit_id === h.id && l.log_date >= rangeStartStr && l.log_date <= rangeEndStr
        );

        let days_completed = 0;
        let days_skipped = 0;

        logsInRange.forEach((l) => {
          if (l.status === 'completed') days_completed++;
          else if (l.status === 'skipped') days_skipped++;
        });

        const days_missed = Math.max(0, days_scheduled - days_completed - days_skipped);
        const completion_rate = Math.round((days_completed / days_scheduled) * 10000) / 10000;

        habitBreakdowns.push({
          habit_id: h.id,
          habit_name: h.name,
          habit_type: h.type,
          days_scheduled,
          days_completed,
          days_missed,
          days_skipped,
          completion_rate,
        });
      }
    });

    habitBreakdowns.sort((a, b) => b.completion_rate - a.completion_rate);

    return {
      range_start: rangeStartStr,
      range_end: rangeEndStr,
      days,
      summary: {
        total_days,
        perfect_days,
        good_days,
        poor_days,
        empty_days,
        average_completion_rate,
        best_day,
        worst_day,
        best_streak,
        total_completed,
        total_scheduled,
      },
      habit_breakdown: habitBreakdowns,
    };
  });

  // --- TASKS HANDLERS ---
  ipcMain.handle('tasks:create', async (_, data: any) => {
    const db = getDb();
    const now = new Date().toISOString();

    const repeatDaysStr =
      data.repeat_days && data.repeat_days.length > 0
        ? JSON.stringify(data.repeat_days)
        : null;

    const checklistItems = Array.isArray(data.checklist_items)
      ? data.checklist_items.filter((i: string) => i && i.trim().length > 0)
      : [];
    const checklistJsonStr =
      checklistItems.length > 0 ? JSON.stringify(checklistItems) : null;

    const stmt = db.prepare(`
      INSERT INTO tasks (
        title, notes, due_date, due_time, status, priority,
        repeat_type, repeat_days, checklist_json, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, 'pending', ?,
        ?, ?, ?, ?, ?
      )
    `);

    const res = stmt.run(
      data.title.trim(),
      data.notes ? data.notes.trim() : null,
      data.due_date,
      data.due_time || null,
      data.priority || null,
      data.repeat_type || 'none',
      repeatDaysStr,
      checklistJsonStr,
      now,
      now
    );

    const insertedRow = db
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .get(res.lastInsertRowid);

    return formatTaskRow(insertedRow, data.due_date);
  });

  ipcMain.handle('tasks:get-for-date', async (_, dateStr: string) => {
    const db = getDb();

    const taskRows = db
      .prepare(`
        SELECT * FROM tasks
        WHERE (repeat_type = 'none' AND due_date = ?)
           OR (repeat_type != 'none' AND due_date <= ?)
        ORDER BY created_at ASC
      `)
      .all(dateStr, dateStr);

    const [year, month, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const dayOfWeek = targetDate.getDay();
    const dayOfMonth = targetDate.getDate();

    const matchedTasks = taskRows.filter((row: any) => {
      if (row.repeat_type === 'none') {
        return row.due_date === dateStr;
      }
      if (row.repeat_type === 'daily') {
        return true;
      }
      if (row.repeat_type === 'weekly') {
        const days = parseJsonField<number[]>(row.repeat_days);
        return Array.isArray(days) && days.includes(dayOfWeek);
      }
      if (row.repeat_type === 'monthly') {
        const days = parseJsonField<number[]>(row.repeat_days);
        return Array.isArray(days) && days.includes(dayOfMonth);
      }
      return false;
    });

    return matchedTasks.map((row: any) => formatTaskRow(row, dateStr));
  });

  ipcMain.handle('tasks:update-status', async (_, data: any) => {
    const db = getDb();
    const now = new Date().toISOString();
    const { task_id, status, date } = data;

    let lastCompleted: string | null = null;
    let lastSkipped: string | null = null;

    const existingTask = db
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .get(task_id) as any;

    if (existingTask) {
      lastCompleted = existingTask.last_completed_date || null;
      lastSkipped = existingTask.last_skipped_date || null;
    }

    if (status === 'completed') {
      lastCompleted = date;
    } else if (status === 'skipped') {
      lastSkipped = date;
    } else if (status === 'pending') {
      lastCompleted = null;
      lastSkipped = null;
    }

    db.prepare(`
      UPDATE tasks
      SET status = ?, last_completed_date = ?, last_skipped_date = ?, updated_at = ?
      WHERE id = ?
    `).run(status, lastCompleted, lastSkipped, now, task_id);

    const updatedRow = db
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .get(task_id);

    return formatTaskRow(updatedRow, date);
  });

  ipcMain.handle('tasks:get-all', async () => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM tasks ORDER BY due_date DESC, created_at DESC').all();
    return rows.map((row: any) => formatTaskRow(row));
  });

  // --- AREAS HANDLERS ---
  ipcMain.handle('areas:get-all', async () => {
    const db = getDb();
    return db.prepare('SELECT * FROM areas ORDER BY name ASC').all();
  });

  ipcMain.handle('areas:create', async (_, data: any) => {
    const db = getDb();
    const now = new Date().toISOString();
    const res = db
      .prepare(
        'INSERT INTO areas (name, color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(data.name, data.color || null, data.icon || null, now, now);

    return db
      .prepare('SELECT * FROM areas WHERE id = ?')
      .get(res.lastInsertRowid);
  });

  // --- JOURNAL HANDLERS ---
  ipcMain.handle('journal:get-for-date', async (_, dateStr: string) => {
    const db = getDb();
    const rows = db
      .prepare('SELECT * FROM journal_entries WHERE entry_date = ? ORDER BY started_at ASC')
      .all(dateStr);
    return rows.map((row: any) => formatJournalRow(row));
  });

  ipcMain.handle('journal:create-entry', async (_, dateStr: string) => {
    const db = getDb();
    const now = new Date().toISOString();
    const res = db
      .prepare(`
        INSERT INTO journal_entries (
          entry_date, started_at, ended_at, mood, content, is_locked, created_at, updated_at
        ) VALUES (?, ?, NULL, NULL, '', 0, ?, ?)
      `)
      .run(dateStr, now, now, now);

    const inserted = db
      .prepare('SELECT * FROM journal_entries WHERE id = ?')
      .get(res.lastInsertRowid);
    return formatJournalRow(inserted);
  });

  ipcMain.handle('journal:update-entry', async (_, data: { id: number; content?: string; mood?: string | null; ended_at?: string | null }) => {
    const db = getDb();
    const now = new Date().toISOString();
    const { id, content, mood, ended_at } = data;

    const fields: string[] = [];
    const params: any[] = [];

    if (content !== undefined) {
      fields.push('content = ?');
      params.push(content);
    }
    if (mood !== undefined) {
      fields.push('mood = ?');
      params.push(mood);
    }
    if (ended_at !== undefined) {
      fields.push('ended_at = ?');
      params.push(ended_at);
    }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      params.push(now);
      params.push(id);

      const sql = `UPDATE journal_entries SET ${fields.join(', ')} WHERE id = ?`;
      db.prepare(sql).run(...params);
    }

    const updated = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id);
    return formatJournalRow(updated);
  });

  ipcMain.handle('journal:lock-entry', async (_, data: { id: number; pin: string }) => {
    const db = getDb();
    const crypto = require('crypto');
    const now = new Date().toISOString();
    const pinHash = crypto.createHash('sha256').update(data.pin).digest('hex');

    db.prepare('UPDATE journal_entries SET is_locked = 1, pin_hash = ?, updated_at = ? WHERE id = ?').run(
      pinHash,
      now,
      data.id
    );

    const updated = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(data.id);
    return formatJournalRow(updated);
  });

  ipcMain.handle('journal:unlock-entry', async (_, data: { id: number; pin: string }) => {
    const db = getDb();
    const crypto = require('crypto');
    const row = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(data.id) as any;

    if (!row) {
      return { success: false };
    }

    const pinHash = crypto.createHash('sha256').update(data.pin).digest('hex');
    if (row.pin_hash === pinHash) {
      return { success: true, entry: formatJournalRow(row) };
    }

    return { success: false };
  });

  ipcMain.handle('journal:delete-entry', async (_, id: number) => {
    const db = getDb();
    db.prepare('DELETE FROM journal_entries WHERE id = ?').run(id);
    return { success: true };
  });

  // --- SETTINGS HANDLERS ---
  ipcMain.handle('settings:export-data', async () => {
    const db = getDb();
    const habits = db.prepare('SELECT * FROM habits').all();
    const habit_logs = db.prepare('SELECT * FROM habit_logs').all();
    const checklist_items = db.prepare('SELECT * FROM checklist_items').all();
    const tasks = db.prepare('SELECT * FROM tasks').all();
    // Exclude pin_hash from journal_entries
    const journal_entries = db
      .prepare(
        'SELECT id, entry_date, started_at, ended_at, mood, content, is_locked, created_at, updated_at FROM journal_entries'
      )
      .all();
    const areas = db.prepare('SELECT * FROM areas').all();
    const habit_recap_cache = db.prepare('SELECT * FROM habit_recap_cache').all();

    const todayStr = formatDateIso(new Date());
    const res = await dialog.showSaveDialog({
      title: 'Export Lifely Data',
      defaultPath: `lifely-export-${todayStr}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (res.canceled || !res.filePath) {
      return { success: false, cancelled: true };
    }

    const exportObj = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      app: 'Lifely',
      data: {
        habits,
        habit_logs,
        checklist_items,
        tasks,
        journal_entries,
        areas,
        habit_recap_cache,
      },
    };

    fs.writeFileSync(res.filePath, JSON.stringify(exportObj, null, 2), 'utf-8');
    return { success: true, path: res.filePath };
  });

  ipcMain.handle('settings:import-data', async () => {
    const db = getDb();
    const res = await dialog.showOpenDialog({
      title: 'Import Lifely Data',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });

    if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
      return { success: false, cancelled: true };
    }

    const filePath = res.filePaths[0];
    let fileContent = '';
    try {
      fileContent = fs.readFileSync(filePath, 'utf-8');
    } catch {
      return { success: false, error: 'Could not read import file' };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(fileContent);
    } catch {
      return { success: false, error: 'Invalid JSON file' };
    }

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !parsed.version ||
      parsed.app !== 'Lifely' ||
      !parsed.data ||
      typeof parsed.data !== 'object' ||
      !Array.isArray(parsed.data.habits)
    ) {
      return { success: false, error: 'Invalid export file' };
    }

    const data = parsed.data;
    const areas = data.areas || [];
    const habits = data.habits || [];
    const checklist_items = data.checklist_items || [];
    const habit_logs = data.habit_logs || [];
    const habit_recap_cache = data.habit_recap_cache || [];
    const journal_entries = data.journal_entries || [];
    const tasks = data.tasks || [];

    const importTransaction = db.transaction(() => {
      // 1. Delete all existing data in FK order
      db.prepare('DELETE FROM habit_recap_cache').run();
      db.prepare('DELETE FROM habit_logs').run();
      db.prepare('DELETE FROM checklist_items').run();
      db.prepare('DELETE FROM journal_entries').run();
      db.prepare('DELETE FROM tasks').run();
      db.prepare('DELETE FROM habits').run();
      db.prepare('DELETE FROM areas').run();

      // 2. Helper to insert rows dynamically
      const insertRows = (tableName: string, rows: any[]) => {
        if (!rows || rows.length === 0) return;
        const keys = Object.keys(rows[0]);
        const cols = keys.join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const stmt = db.prepare(`INSERT OR IGNORE INTO ${tableName} (${cols}) VALUES (${placeholders})`);
        for (const row of rows) {
          const vals = keys.map((k) => row[k]);
          stmt.run(...vals);
        }
      };

      insertRows('areas', areas);
      insertRows('habits', habits);
      insertRows('checklist_items', checklist_items);
      insertRows('habit_logs', habit_logs);
      insertRows('habit_recap_cache', habit_recap_cache);
      insertRows('journal_entries', journal_entries);
      insertRows('tasks', tasks);
    });


    try {
      importTransaction();
      return {
        success: true,
        counts: {
          habits: habits.length,
          habit_logs: habit_logs.length,
          checklist_items: checklist_items.length,
          tasks: tasks.length,
          journal_entries: journal_entries.length,
          areas: areas.length,
          habit_recap_cache: habit_recap_cache.length,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to import data' };
    }
  });

  ipcMain.handle('settings:backup-database', async () => {
    const dbPath = getDatabasePath();
    const todayStr = formatDateIso(new Date());
    const res = await dialog.showSaveDialog({
      title: 'Backup Database File',
      defaultPath: `lifely-backup-${todayStr}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    });

    if (res.canceled || !res.filePath) {
      return { success: false, cancelled: true };
    }

    try {
      fs.copyFileSync(dbPath, res.filePath);
      return { success: true, path: res.filePath };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to backup database' };
    }
  });

  ipcMain.handle('settings:clear-all-data', async (_, confirmationText: string) => {
    if (confirmationText !== 'DELETE ALL MY DATA') {
      return { success: false, error: 'Confirmation text did not match' };
    }

    const db = getDb();
    const clearTransaction = db.transaction(() => {
      db.prepare('DELETE FROM habit_recap_cache').run();
      db.prepare('DELETE FROM habit_logs').run();
      db.prepare('DELETE FROM checklist_items').run();
      db.prepare('DELETE FROM journal_entries').run();
      db.prepare('DELETE FROM tasks').run();
      db.prepare('DELETE FROM habits').run();
      db.prepare('DELETE FROM areas').run();
    });

    try {
      clearTransaction();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to clear data' };
    }
  });

  ipcMain.handle('settings:get-database-info', async () => {
    const db = getDb();
    const dbPath = getDatabasePath();
    const dbSizeBytes = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;

    const habitCount = (db.prepare('SELECT COUNT(*) as n FROM habits').get() as any).n;
    const taskCount = (db.prepare('SELECT COUNT(*) as n FROM tasks').get() as any).n;
    const logCount = (db.prepare('SELECT COUNT(*) as n FROM habit_logs').get() as any).n;
    const journalCount = (db.prepare('SELECT COUNT(*) as n FROM journal_entries').get() as any).n;

    return {
      db_path: dbPath,
      db_size_bytes: dbSizeBytes,
      habit_count: habitCount,
      task_count: taskCount,
      log_count: logCount,
      journal_count: journalCount,
      export_available: true,
    };
  });

  ipcMain.handle('settings:open-db-folder', async () => {
    const dbPath = getDatabasePath();
    const folderPath = path.dirname(dbPath);
    await shell.openPath(folderPath);
    return { success: true };
  });
}


function formatJournalRow(row: any) {
  if (!row) return null;
  return {
    ...row,
    is_locked: Boolean(row.is_locked),
  };
}
