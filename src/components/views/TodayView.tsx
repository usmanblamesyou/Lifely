import React, { useEffect, useState } from 'react';
import { useDate } from '../../context/DateContext';
import { Habit } from '../../types/habit';
import { Task } from '../../types/task';
import HabitCard from '../habits/HabitCard';
import TaskCard from '../tasks/TaskCard';
import NewHabitForm from '../habits/NewHabitForm';
import NewTaskForm from '../tasks/NewTaskForm';
import { useDragReorder } from '../../hooks/useDragReorder';

function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function habitMatchesSection(habit: Habit, section: 'morning' | 'afternoon' | 'evening'): boolean {
  if (!habit.time_of_day) return true;
  if (Array.isArray(habit.time_of_day)) {
    return habit.time_of_day.length === 0 || habit.time_of_day.includes(section);
  }
  if (typeof habit.time_of_day === 'string') {
    return habit.time_of_day === '' || (habit.time_of_day as string).includes(section);
  }
  return true;
}

export default function TodayView() {
  const { selectedDate } = useDate();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editHabit, setEditHabit] = useState<Habit | undefined>(undefined);
  const [editTask, setEditTask] = useState<Task | undefined>(undefined);

  const dateString = formatDateIso(selectedDate);

  const fetchForDate = async () => {
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const [habitsRes, tasksRes] = await Promise.all([
          window.electronAPI.habits.getForDate(dateString),
          window.electronAPI.tasks.getForDate(dateString),
        ]);
        setHabits(habitsRes || []);
        setTasks(tasksRes || []);
      }
    } catch (err) {
      console.error('Failed to fetch data for date:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForDate();
  }, [dateString]);

  const handleHabitDelete = (id: number) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const handleTaskDelete = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleHabitEdit = (habit: Habit) => {
    setEditHabit(habit);
    setIsHabitModalOpen(true);
  };

  const handleTaskEdit = (task: Task) => {
    setEditTask(task);
    setIsTaskModalOpen(true);
  };

  // Drag-to-reorder for habits and tasks
  const habitDrag = useDragReorder(
    habits.map((h) => ({ ...h, id: h.id })),
    async (updates) => {
      if (!window.electronAPI?.habits?.reorder) return;
      await window.electronAPI.habits.reorder(
        updates.map((u) => ({ habit_id: u.id, position: u.position }))
      );
      setHabits((prev) => {
        const idxMap: Record<number, number> = {};
        updates.forEach((u) => { idxMap[u.id] = u.position; });
        return [...prev].sort((a, b) => (idxMap[a.id] ?? 0) - (idxMap[b.id] ?? 0));
      });
    }
  );

  const taskDrag = useDragReorder(
    tasks.map((t) => ({ ...t, id: t.id })),
    async (updates) => {
      if (!window.electronAPI?.tasks?.reorder) return;
      await window.electronAPI.tasks.reorder(
        updates.map((u) => ({ task_id: u.id, position: u.position }))
      );
      setTasks((prev) => {
        const idxMap: Record<number, number> = {};
        updates.forEach((u) => { idxMap[u.id] = u.position; });
        return [...prev].sort((a, b) => (idxMap[a.id] ?? 0) - (idxMap[b.id] ?? 0));
      });
    }
  );

  // Section Filtering (applied to ordered arrays)
  const orderedHabits = habitDrag.orderedItems as Habit[];
  const orderedTasks = taskDrag.orderedItems as Task[];

  const morningHabits = orderedHabits.filter((h) => habitMatchesSection(h, 'morning'));
  const afternoonHabits = orderedHabits.filter((h) => habitMatchesSection(h, 'afternoon'));
  const eveningHabits = orderedHabits.filter((h) => habitMatchesSection(h, 'evening'));

  const morningTasks = orderedTasks.filter((t) => !t.due_time || t.due_time < '12:00');
  const afternoonTasks = orderedTasks.filter(
    (t) => !t.due_time || (t.due_time >= '12:00' && t.due_time < '17:00')
  );
  const eveningTasks = orderedTasks.filter((t) => !t.due_time || t.due_time >= '17:00');

  const hasMorning = morningHabits.length > 0 || morningTasks.length > 0;
  const hasAfternoon = afternoonHabits.length > 0 || afternoonTasks.length > 0;
  const hasEvening = eveningHabits.length > 0 || eveningTasks.length > 0;

  const isEverythingEmpty = !hasMorning && !hasAfternoon && !hasEvening;

  const renderSectionIcon = (section: 'MORNING' | 'AFTERNOON' | 'EVENING') => {
    if (section === 'MORNING') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
          <circle cx="12" cy="17" r="4"/>
          <path d="M12 3v2M4.2 10.2l1.4 1.4M19.8 10.2l-1.4 1.4M2 17h2M20 17h2"/>
        </svg>
      );
    }
    if (section === 'AFTERNOON') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
        </svg>
      );
    }
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    );
  };

  const renderSection = (
    title: 'MORNING' | 'AFTERNOON' | 'EVENING',
    sectionHabits: Habit[],
    sectionTasks: Task[]
  ) => {
    const buildHabits = sectionHabits.filter((h) => h.type === 'build');
    const breakHabits = sectionHabits.filter((h) => h.type === 'break');

    return (
      <div className="today-section mt-4" style={{ marginTop: '1.5rem' }}>
        <div className="section-header">
          <span className="section-title">
            {renderSectionIcon(title)} {title}
          </span>
          <div className="section-divider" />
        </div>

        <div className="habit-list-container">
          {/* Build Habits */}
          {buildHabits.length > 0 && (
            <div className="habit-list">
              {buildHabits.map((habit, index) => (
                <HabitCard
                  key={`build-${habit.id}`}
                  habit={habit}
                  dateString={dateString}
                  index={index}
                  onDelete={handleHabitDelete}
                  onEdit={handleHabitEdit}
                  draggable
                  onDragStart={() => habitDrag.handleDragStart(habit.id)}
                  onDragOver={(e) => habitDrag.handleDragOver(e, habit.id)}
                  onDrop={habitDrag.handleDrop}
                  onDragEnd={habitDrag.handleDragEnd}
                  isDragging={habitDrag.isDragging(habit.id)}
                />
              ))}
            </div>
          )}

          {/* Sub-divider for Break Habits when both exist */}
          {buildHabits.length > 0 && breakHabits.length > 0 && (
            <div className="section-header sub-header mt-2">
              <span className="section-title text-danger">Breaking</span>
              <div className="section-divider danger-divider" />
            </div>
          )}

          {/* Break Habits */}
          {breakHabits.length > 0 && (
            <div className="habit-list">
              {breakHabits.map((habit, index) => (
                <HabitCard
                  key={`break-${habit.id}`}
                  habit={habit}
                  dateString={dateString}
                  index={buildHabits.length + index}
                  onDelete={handleHabitDelete}
                  onEdit={handleHabitEdit}
                  draggable
                  onDragStart={() => habitDrag.handleDragStart(habit.id)}
                  onDragOver={(e) => habitDrag.handleDragOver(e, habit.id)}
                  onDrop={habitDrag.handleDrop}
                  onDragEnd={habitDrag.handleDragEnd}
                  isDragging={habitDrag.isDragging(habit.id)}
                />
              ))}
            </div>
          )}

          {/* Tasks */}
          {sectionTasks.length > 0 && (
            <div className="task-list" style={{ marginTop: '0.75rem' }}>
              {sectionTasks.map((task, index) => (
                <TaskCard
                  key={`task-${task.id}`}
                  task={task}
                  dateString={dateString}
                  index={index}
                  onDelete={handleTaskDelete}
                  onEdit={handleTaskEdit}
                  draggable
                  onDragStart={() => taskDrag.handleDragStart(task.id)}
                  onDragOver={(e) => taskDrag.handleDragOver(e, task.id)}
                  onDrop={taskDrag.handleDrop}
                  onDragEnd={taskDrag.handleDragEnd}
                  isDragging={taskDrag.isDragging(task.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="today-view">
      <div className="today-header">
        <h2 className="today-title text-title">Scheduled Overview</h2>
      </div>

      <div className="today-content">
        {isLoading ? (
          <div className="skeleton-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="skeleton-card">
              <div className="skeleton-line" style={{ width: '40%' }} />
              <div className="skeleton-line" style={{ width: '80%' }} />
            </div>
            <div className="skeleton-card">
              <div className="skeleton-line" style={{ width: '35%' }} />
              <div className="skeleton-line" style={{ width: '75%' }} />
            </div>
          </div>
        ) : isEverythingEmpty ? (
          <div className="empty-state-improved">
            <div className="empty-state-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="5" y="2" width="14" height="20" rx="2"/>
                <line x1="9" y1="7" x2="15" y2="7"/>
                <line x1="9" y1="11" x2="15" y2="11"/>
                <line x1="9" y1="15" x2="12" y2="15"/>
              </svg>
            </div>
            <div className="empty-state-headline">Nothing scheduled</div>
            <div className="empty-state-subtitle">Add a habit or task to start tracking this day.</div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                className="btn-primary pressable"
                onClick={() => setIsHabitModalOpen(true)}
              >
                + New Habit
              </button>
              <button
                type="button"
                className="btn-secondary pressable"
                onClick={() => setIsTaskModalOpen(true)}
              >
                + New Task
              </button>
            </div>
          </div>
        ) : (
          <div className="today-sections">
            {hasMorning && renderSection('MORNING', morningHabits, morningTasks)}
            {hasAfternoon && renderSection('AFTERNOON', afternoonHabits, afternoonTasks)}
            {hasEvening && renderSection('EVENING', eveningHabits, eveningTasks)}
          </div>
        )}
      </div>

      <div className="today-footer-buttons">
        <button
          type="button"
          className="btn-primary pressable"
          onClick={() => { setEditHabit(undefined); setIsHabitModalOpen(true); }}
        >
          + New Habit
        </button>

        <button
          type="button"
          className="btn-primary pressable"
          onClick={() => { setEditTask(undefined); setIsTaskModalOpen(true); }}
        >
          + New Task
        </button>
      </div>

      <NewHabitForm
        isOpen={isHabitModalOpen}
        onClose={() => { setIsHabitModalOpen(false); setEditHabit(undefined); }}
        onSuccess={fetchForDate}
        initialStartDate={dateString}
        editHabit={editHabit}
      />

      <NewTaskForm
        isOpen={isTaskModalOpen}
        onClose={() => { setIsTaskModalOpen(false); setEditTask(undefined); }}
        onSuccess={fetchForDate}
        initialDueDate={dateString}
        editTask={editTask}
      />
    </div>
  );
}
