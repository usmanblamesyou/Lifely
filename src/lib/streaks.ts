export type DayLog = { log_date: string; status: string };

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getDifferenceInDays(d1: Date, d2: Date): number {
  const msPerDay = 86400000;
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((utc1 - utc2) / msPerDay);
}

export function calculateStreak(
  logs: DayLog[],
  direction: 'build' | 'break' = 'build'
): number {
  if (!logs || logs.length === 0) return 0;

  // 1. Sort logs by log_date descending
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

export function calculateLongestStreak(logs: DayLog[]): number {
  if (!logs || logs.length === 0) return 0;

  // 1. Sort logs by log_date ascending
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
