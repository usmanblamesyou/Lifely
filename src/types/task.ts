export type TaskPriority = 'low' | 'medium' | 'high' | null;
export type TaskStatus = 'pending' | 'completed' | 'skipped';
export type TaskRepeatType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: number;
  title: string;
  notes: string | null;
  due_date: string;
  due_time: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  repeat_type: TaskRepeatType;
  repeat_days: number[] | null;
  checklist_json: string[];
  last_completed_date: string | null;
  last_skipped_date: string | null;
  position: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  notes?: string | null;
  due_date: string;
  due_time?: string | null;
  priority?: TaskPriority;
  repeat_type: TaskRepeatType;
  repeat_days?: number[] | null;
  checklist_items: string[];
  color?: string | null;
}

export interface UpdateTaskInput {
  task_id: number;
  notes: string | null;
  due_date: string;
  due_time: string | null;
  priority: TaskPriority;
  repeat_type: TaskRepeatType;
  repeat_days: number[] | null;
  checklist_items: string[];
  color: string | null;
}

export interface UpdateTaskStatusInput {
  task_id: number;
  status: TaskStatus;
  date: string;
}
