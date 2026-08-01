export type ProgressRange = '7d' | '14d' | '1m' | '3m' | '6m' | '1y';

export interface DayItem {
  id: number;
  item_type: 'habit' | 'task';
  title: string;
  status: 'completed' | 'missed' | 'pending' | 'skipped';
  color?: string | null;
  habit_type?: 'build' | 'break';
  priority?: string;
}

export interface DayData {
  date: string;
  daily_score: number | null;
  tier: 'perfect' | 'good' | 'poor' | 'empty';
  scheduled_count: number;
  completed_count: number;
  items?: DayItem[];
}

export interface SummaryStats {
  total_days: number;
  perfect_days: number;
  good_days: number;
  poor_days: number;
  empty_days: number;
  average_completion_rate: number;
  best_day: string | null;
  worst_day: string | null;
  best_streak: number;
  total_completed: number;
  total_scheduled: number;
}

export interface HabitBreakdown {
  habit_id: number;
  habit_name: string;
  habit_type: 'build' | 'break';
  days_scheduled: number;
  days_completed: number;
  days_missed: number;
  days_skipped: number;
  completion_rate: number;
}

export interface ProgressData {
  range_start: string;
  range_end: string;
  days: DayData[];
  summary: SummaryStats;
  habit_breakdown: HabitBreakdown[];
}
