'use client';

import React, { useState } from 'react';
import {
  HabitType,
  RepeatType,
  GoalPeriod,
  TimeOfDay,
  EndCondition,
  CreateHabitInput,
} from '../../types/habit';
import CustomSelect from '../ui/CustomSelect';

interface NewHabitFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialStartDate?: string;
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

const REPEAT_OPTIONS = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

const GOAL_PERIOD_OPTIONS = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

const END_CONDITION_OPTIONS = [
  { label: 'Never', value: 'never' },
  { label: 'On Date', value: 'on_date' },
  { label: 'After Reps', value: 'after_reps' },
];

const TIME_OF_DAY_CHIPS: { label: string; value: TimeOfDay; icon: string }[] = [
  { label: 'Morning', value: 'morning', icon: '🌅' },
  { label: 'Afternoon', value: 'afternoon', icon: '☀️' },
  { label: 'Evening', value: 'evening', icon: '🌙' },
];

export default function NewHabitForm({
  isOpen,
  onClose,
  onSuccess,
  initialStartDate,
}: NewHabitFormProps) {
  const getTodayString = () => {
    if (initialStartDate) return initialStartDate;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [name, setName] = useState('');
  const [type, setType] = useState<HabitType>('build');
  const [repeatType, setRepeatType] = useState<RepeatType>('daily');
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [monthlyDay, setMonthlyDay] = useState<number>(1);
  const [goalCount, setGoalCount] = useState<number>(1);
  const [goalPeriod, setGoalPeriod] = useState<GoalPeriod>('day');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay[]>([]);
  const [startDate, setStartDate] = useState(getTodayString());
  const [endCondition, setEndCondition] = useState<EndCondition>('never');
  const [endConditionValue, setEndConditionValue] = useState<string>('');
  const [reminderTimes, setReminderTimes] = useState<string[]>([]);
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

  const toggleTimeOfDay = (tod: TimeOfDay) => {
    setTimeOfDay((prev) =>
      prev.includes(tod) ? prev.filter((t) => t !== tod) : [...prev, tod]
    );
  };

  const handleAddReminder = () => {
    if (reminderTimes.length < 5) {
      setReminderTimes((prev) => [...prev, '09:00']);
    }
  };

  const handleReminderChange = (index: number, val: string) => {
    setReminderTimes((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRemoveReminder = (index: number) => {
    setReminderTimes((prev) => prev.filter((_, i) => i !== index));
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

    if (!name.trim()) {
      newErrors.name = 'Habit name is required';
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

    const payload: CreateHabitInput = {
      name: name.trim(),
      type,
      repeat_type: repeatType,
      repeat_days: finalRepeatDays,
      goal_count: Number(goalCount) || 1,
      goal_period: goalPeriod,
      time_of_day: timeOfDay.length > 0 ? timeOfDay : null,
      area_id: null, // Area field removed; sent as null
      start_date: startDate,
      end_condition: endCondition,
      end_condition_value: endCondition !== 'never' ? endConditionValue : null,
      reminder_times: reminderTimes.length > 0 ? reminderTimes : null,
      checklist_items: checklistItems.filter((i) => i.trim().length > 0),
    };

    try {
      if (typeof window !== 'undefined' && window.electronAPI?.habits) {
        await window.electronAPI.habits.create(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create habit:', err);
      setErrors({ submit: 'Failed to save habit. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay anim-fade-in">
      <div className="modal-content anim-scale-in">
        <div className="modal-header">
          <h2 className="modal-title">New Habit</h2>
          <button type="button" onClick={onClose} className="modal-close-btn pressable">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {errors.submit && <div className="form-error">{errors.submit}</div>}

          {/* Name */}
          <div className="form-group">
            <label className="form-label">Habit Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning Meditation"
              className={`form-input ${errors.name ? 'input-error' : ''}`}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          {/* Type */}
          <div className="form-group">
            <label className="form-label">Habit Type</label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn build pressable ${type === 'build' ? 'active' : ''}`}
                onClick={() => setType('build')}
              >
                Build
              </button>
              <button
                type="button"
                className={`toggle-btn break pressable ${type === 'break' ? 'active' : ''}`}
                onClick={() => setType('break')}
              >
                Break
              </button>
            </div>
          </div>

          {/* Repeat */}
          <div className="form-group">
            <label className="form-label">Repeat</label>
            <CustomSelect
              id="select-repeat-type"
              value={repeatType}
              onChange={(val) => setRepeatType(val as RepeatType)}
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

          {/* Goal */}
          <div className="form-group">
            <label className="form-label">Goal</label>
            <div className="goal-inputs">
              <input
                type="number"
                min="1"
                value={goalCount}
                onChange={(e) => setGoalCount(parseInt(e.target.value, 10))}
                className="form-input number-input"
              />
              <span className="goal-text">time(s) per</span>
              <CustomSelect
                id="select-goal-period"
                value={goalPeriod}
                onChange={(val) => setGoalPeriod(val as GoalPeriod)}
                options={GOAL_PERIOD_OPTIONS}
              />
            </div>
          </div>

          {/* Time of Day */}
          <div className="form-group">
            <label className="form-label">Time of Day</label>
            <div className="chip-group">
              {TIME_OF_DAY_CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  className={`chip-btn pressable ${
                    timeOfDay.includes(chip.value) ? 'active' : ''
                  }`}
                  onClick={() => toggleTimeOfDay(chip.value)}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Start Date */}
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-input"
            />
          </div>

          {/* End Condition */}
          <div className="form-group">
            <label className="form-label">End Condition</label>
            <CustomSelect
              id="select-end-condition"
              value={endCondition}
              onChange={(val) => setEndCondition(val as EndCondition)}
              options={END_CONDITION_OPTIONS}
            />

            {endCondition === 'on_date' && (
              <input
                type="date"
                value={endConditionValue}
                onChange={(e) => setEndConditionValue(e.target.value)}
                className="form-input mt-2"
              />
            )}

            {endCondition === 'after_reps' && (
              <input
                type="number"
                min="1"
                placeholder="Number of repetitions"
                value={endConditionValue}
                onChange={(e) => setEndConditionValue(e.target.value)}
                className="form-input mt-2"
              />
            )}
          </div>

          {/* Reminders */}
          <div className="form-group">
            <div className="flex-between">
              <label className="form-label">Reminders (Up to 5)</label>
              {reminderTimes.length < 5 && (
                <button
                  type="button"
                  onClick={handleAddReminder}
                  className="add-sub-btn pressable"
                >
                  + Add Time
                </button>
              )}
            </div>
            {reminderTimes.map((time, idx) => (
              <div key={idx} className="sub-input-row">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => handleReminderChange(idx, e.target.value)}
                  className="form-input time-input"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveReminder(idx)}
                  className="remove-sub-btn pressable"
                >
                  ✕
                </button>
              </div>
            ))}
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
              {isSaving ? 'Saving...' : 'Save Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
