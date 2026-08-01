export type HabitType = 'build' | 'break';
export type RepeatType = 'daily' | 'weekly' | 'monthly';
export type GoalPeriod = 'day' | 'week' | 'month';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';
export type EndCondition = 'never' | 'on_date' | 'after_reps';
export type LogStatus = 'completed' | 'skipped' | 'failed' | 'none';

export interface ChecklistItem {
  id: number;
  habit_id: number;
  label: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface HabitLog {
  id: number;
  habit_id: number;
  log_date: string;
  status: LogStatus;
  count: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: number;
  name: string;
  type: HabitType;
  repeat_type: RepeatType;
  repeat_days: number[] | null;
  goal_count: number;
  goal_period: GoalPeriod;
  time_of_day: TimeOfDay[] | null;
  area_id: number | null;
  start_date: string;
  end_date: string | null;
  end_condition: EndCondition;
  end_condition_value: string | null;
  reminder_times: string[] | null;
  is_archived: boolean;
  checklist_items: ChecklistItem[];
  log: Pick<HabitLog, 'id' | 'status' | 'count' | 'note'> | null;
  current_streak?: number;
  position: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface HabitRecap {
  habit_id: number;
  habit_name: string;
  habit_type: HabitType;
  start_date: string;
  end_date: string;
  total_days_active: number;
  days_completed: number;
  days_missed: number;
  days_skipped: number;
  completion_rate: number;
  longest_streak: number;
  current_streak: number;
  worst_miss_window: number;
  best_day_of_week: { day: number; label: string } | null;
  total_logged_days: number;
  logs: { log_date: string; status: string }[];
}

export interface CreateHabitInput {
  name: string;
  type: HabitType;
  repeat_type: RepeatType;
  repeat_days: number[] | null;
  goal_count: number;
  goal_period: GoalPeriod;
  time_of_day: TimeOfDay[] | null;
  area_id: number | null;
  start_date: string;
  end_condition: EndCondition;
  end_condition_value: string | null;
  reminder_times: string[] | null;
  checklist_items: string[];
  color?: string | null;
}

export interface UpdateHabitInput {
  habit_id: number;
  repeat_type: RepeatType;
  repeat_days: number[] | null;
  goal_count: number;
  goal_period: GoalPeriod;
  time_of_day: TimeOfDay[] | null;
  start_date: string;
  end_condition: EndCondition;
  end_condition_value: string | null;
  reminder_times: string[] | null;
  checklist_items: string[];
  color: string | null;
}

export interface LogHabitInput {
  habit_id: number;
  log_date: string;
  status: LogStatus;
  count?: number;
  note?: string | null;
}

export interface Area {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAreaInput {
  name: string;
  color?: string | null;
  icon?: string | null;
}
