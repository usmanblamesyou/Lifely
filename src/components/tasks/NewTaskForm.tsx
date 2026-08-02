'use client';

import React, { useState } from 'react';
import {
  Task,
  TaskPriority,
  TaskRepeatType,
  TaskTimeOfDay,
  CreateTaskInput,
  UpdateTaskInput,
} from '../../types/task';
import CustomSelect from '../ui/CustomSelect';
import ColorPicker from '../ui/ColorPicker';

interface NewTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDueDate?: string;
  initialDueTime?: string;
  initialTimeOfDay?: TaskTimeOfDay;
  editTask?: Task;
}

const WEEKDAYS = [
  { label: 'Su', value: 0 },
  { label: 'Mo', value: 1 },
  { label: 'Tu', value: 2 },
  { label: 'We', value: 3 },
  { label: 'Th', value: 4 },
  { label: 'Fr', value: 5 },
  { label: 'Sa', value: 6 },
];

const PRIORITY_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const TIME_OF_DAY_OPTIONS = [
  { label: 'Morning', value: 'morning' },
  { label: 'Afternoon', value: 'afternoon' },
  { label: 'Evening', value: 'evening' },
];

const REPEAT_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

export default function NewTaskForm({
  isOpen,
  onClose,
  onSuccess,
  initialDueDate,
  initialDueTime,
  initialTimeOfDay,
  editTask,
}: NewTaskFormProps) {
  const isEditMode = Boolean(editTask);

  const getTodayString = () => {
    if (editTask) return editTask.due_date;
    if (initialDueDate) return initialDueDate;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getInitialRepeatDays = (): number[] => {
    if (editTask && Array.isArray(editTask.repeat_days)) return editTask.repeat_days;
    return [];
  };

  const getInitialMonthlyDay = (): number => {
    if (editTask && editTask.repeat_type === 'monthly' && Array.isArray(editTask.repeat_days) && editTask.repeat_days.length > 0) {
      return editTask.repeat_days[0];
    }
    return 1;
  };

  const [notes, setNotes] = useState(editTask?.notes ?? '');
  const [dueDate, setDueDate] = useState(getTodayString());
  const [dueTime, setDueTime] = useState(editTask?.due_time ?? initialDueTime ?? '');
  const [priority, setPriority] = useState<string>(editTask?.priority ?? 'none');
  const [repeatType, setRepeatType] = useState<TaskRepeatType>(editTask?.repeat_type ?? 'none');
  const [repeatDays, setRepeatDays] = useState<number[]>(getInitialRepeatDays());
  const [monthlyDay, setMonthlyDay] = useState<number>(getInitialMonthlyDay());
  const [checklistItems, setChecklistItems] = useState<string[]>(
    editTask?.checklist_json ?? []
  );
  const [color, setColor] = useState<string | null>(editTask?.color ?? null);
  const [timeOfDay, setTimeOfDay] = useState<TaskTimeOfDay>(
    editTask?.time_of_day ?? initialTimeOfDay ?? 'morning'
  );

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const toggleWeekday = (dayValue: number) => {
    setRepeatDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue].sort((a, b) => a - b)
    );
  };

  const handleAddChecklistItem = () => {
    setChecklistItems((prev) => [...prev, '']);
  };

  const handleChecklistChange = (index: number, val: string) => {
    setChecklistItems((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItems((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!isEditMode) {
      const titleInput = (document.getElementById('task-title-input') as HTMLInputElement)?.value?.trim();
      if (!titleInput) {
        newErrors.title = 'Task title is required';
      }
    }

    if (repeatType === 'weekly' && repeatDays.length === 0) {
      newErrors.repeatDays = 'At least one day must be selected for weekly repeat';
    }

    if (repeatType === 'monthly') {
      if (isNaN(monthlyDay) || monthlyDay < 1 || monthlyDay > 31) {
        newErrors.monthlyDay = 'Day of month must be between 1 and 31';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);

    let finalRepeatDays: number[] | null = null;
    if (repeatType === 'weekly') {
      finalRepeatDays = repeatDays;
    } else if (repeatType === 'monthly') {
      finalRepeatDays = [monthlyDay];
    }

    const finalPriority: TaskPriority = priority === 'none' ? null : (priority as TaskPriority);

    try {
      if (isEditMode && editTask) {
        const payload: UpdateTaskInput = {
          task_id: editTask.id,
          notes: notes.trim() ? notes.trim() : null,
          due_date: dueDate,
          due_time: dueTime.trim() ? dueTime.trim() : null,
          priority: finalPriority,
          repeat_type: repeatType,
          repeat_days: finalRepeatDays,
          checklist_items: checklistItems.filter((i) => i.trim().length > 0),
          color,
          time_of_day: timeOfDay,
        };
        if (typeof window !== 'undefined' && window.electronAPI?.tasks) {
          await window.electronAPI.tasks.update(payload);
        }
      } else {
        const titleInput = (document.getElementById('task-title-input') as HTMLInputElement)?.value?.trim() ?? '';
        const payload: CreateTaskInput = {
          title: titleInput,
          notes: notes.trim() ? notes.trim() : null,
          due_date: dueDate,
          due_time: dueTime.trim() ? dueTime.trim() : null,
          priority: finalPriority,
          repeat_type: repeatType,
          repeat_days: finalRepeatDays,
          checklist_items: checklistItems.filter((i) => i.trim().length > 0),
          color,
          time_of_day: timeOfDay,
        };
        if (typeof window !== 'undefined' && window.electronAPI?.tasks) {
          await window.electronAPI.tasks.create(payload);
        }
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save task:', err);
      setErrors({ submit: 'Failed to save task. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay anim-fade-in">
      <div className="modal-content anim-scale-in">
        <div className="modal-header">
          <h2 className="modal-title">{isEditMode ? 'Edit Task' : 'New Task'}</h2>
          <button type="button" onClick={onClose} className="modal-close-btn pressable">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {errors.submit && <div className="form-error">{errors.submit}</div>}

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Task Title {!isEditMode && '*'}</label>
            {isEditMode ? (
              <>
                <div className="readonly-field">{editTask!.title}</div>
                <span className="error-text" style={{ marginTop: 4 }}>Task title cannot be changed</span>
              </>
            ) : (
              <>
                <input
                  id="task-title-input"
                  type="text"
                  placeholder="e.g. Prepare presentation slides"
                  className={`form-input ${errors.title ? 'input-error' : ''}`}
                  defaultValue=""
                />
                {errors.title && <span className="error-text">{errors.title}</span>}
              </>
            )}
          </div>

          {/* Color */}
          <div className="form-group">
            <label className="form-label">Color</label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add details or context..."
              className="form-input form-textarea"
            />
          </div>

          {/* Due Date & Time */}
          <div className="form-row">
            <div className="form-group flex-1">
              <label className="form-label">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group flex-1">
              <label className="form-label">Due Time (Optional)</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Time of Day */}
          <div className="form-group">
            <label className="form-label">Time of Day</label>
            <CustomSelect
              id="select-task-time-of-day"
              value={timeOfDay}
              onChange={(val) => setTimeOfDay(val as TaskTimeOfDay)}
              options={TIME_OF_DAY_OPTIONS}
            />
          </div>

          {/* Priority */}
          <div className="form-group">
            <label className="form-label">Priority</label>
            <CustomSelect
              id="select-task-priority"
              value={priority}
              onChange={(val) => setPriority(val)}
              options={PRIORITY_OPTIONS}
            />
          </div>

          {/* Repeat */}
          <div className="form-group">
            <label className="form-label">Repeat</label>
            <CustomSelect
              id="select-task-repeat"
              value={repeatType}
              onChange={(val) => setRepeatType(val as TaskRepeatType)}
              options={REPEAT_OPTIONS}
            />

            {repeatType === 'weekly' && (
              <div className="weekday-selector">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    className={`weekday-chip pressable ${
                      repeatDays.includes(day.value) ? 'active' : ''
                    }`}
                    onClick={() => toggleWeekday(day.value)}
                  >
                    {day.label}
                  </button>
                ))}
                {errors.repeatDays && (
                  <span className="error-text block">{errors.repeatDays}</span>
                )}
              </div>
            )}

            {repeatType === 'monthly' && (
              <div className="monthly-day-input">
                <label className="sub-label">Day of Month (1-31):</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={monthlyDay}
                  onChange={(e) => setMonthlyDay(parseInt(e.target.value, 10))}
                  className="form-input number-input"
                />
                {errors.monthlyDay && (
                  <span className="error-text">{errors.monthlyDay}</span>
                )}
              </div>
            )}
          </div>

          {/* Checklist Items */}
          <div className="form-group">
            <div className="flex-between">
              <label className="form-label">Checklist Items</label>
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="add-sub-btn pressable"
              >
                + Add Item
              </button>
            </div>
            {checklistItems.map((item, idx) => (
              <div key={idx} className="sub-input-row">
                <input
                  type="text"
                  placeholder={`Item ${idx + 1}`}
                  value={item}
                  onChange={(e) => handleChecklistChange(idx, e.target.value)}
                  className="form-input"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveChecklistItem(idx)}
                  className="remove-sub-btn pressable"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary hoverable-subtle"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary hoverable" disabled={isSaving}>
              {isSaving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
