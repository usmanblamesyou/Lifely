'use client';

import React, { useState } from 'react';
import {
  TaskPriority,
  TaskRepeatType,
  CreateTaskInput,
} from '../../types/task';
import CustomSelect from '../ui/CustomSelect';

interface NewTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDueDate?: string;
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
}: NewTaskFormProps) {
  const getTodayString = () => {
    if (initialDueDate) return initialDueDate;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(getTodayString());
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<string>('none');
  const [repeatType, setRepeatType] = useState<TaskRepeatType>('none');
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [monthlyDay, setMonthlyDay] = useState<number>(1);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);

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

    if (!title.trim()) {
      newErrors.title = 'Task title is required';
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

    const finalPriority: TaskPriority =
      priority === 'none' ? null : (priority as TaskPriority);

    const payload: CreateTaskInput = {
      title: title.trim(),
      notes: notes.trim() ? notes.trim() : null,
      due_date: dueDate,
      due_time: dueTime.trim() ? dueTime.trim() : null,
      priority: finalPriority,
      repeat_type: repeatType,
      repeat_days: finalRepeatDays,
      checklist_items: checklistItems.filter((i) => i.trim().length > 0),
    };

    try {
      if (typeof window !== 'undefined' && window.electronAPI?.tasks) {
        await window.electronAPI.tasks.create(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create task:', err);
      setErrors({ submit: 'Failed to save task. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay anim-fade-in">
      <div className="modal-content anim-scale-in">
        <div className="modal-header">
          <h2 className="modal-title">New Task</h2>
          <button type="button" onClick={onClose} className="modal-close-btn pressable">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {errors.submit && <div className="form-error">{errors.submit}</div>}

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Task Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Prepare presentation slides"
              className={`form-input ${errors.title ? 'input-error' : ''}`}
            />
            {errors.title && <span className="error-text">{errors.title}</span>}
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
              {isSaving ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
