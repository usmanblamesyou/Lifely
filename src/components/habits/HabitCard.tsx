'use client';

import React, { useState, useEffect } from 'react';
import { Habit, LogStatus } from '../../types/habit';

interface HabitCardProps {
  habit: Habit;
  dateString: string;
  index?: number;
}

export default function HabitCard({
  habit,
  dateString,
  index = 0,
}: HabitCardProps) {
  const isBreak = habit.type === 'break';
  const delayClass = index < 5 ? `anim-delay-${(index % 5) + 1}` : '';

  const initialStatus: LogStatus = habit.log ? habit.log.status : 'none';
  const [activeStatus, setActiveStatus] = useState<LogStatus>(initialStatus);
  const [pulsingStatus, setPulsingStatus] = useState<LogStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [streakInfo, setStreakInfo] = useState<{
    current_streak: number;
    longest_streak: number;
  } | null>(null);

  useEffect(() => {
    setActiveStatus(habit.log ? habit.log.status : 'none');
    setErrorMessage(null);
  }, [habit, dateString]);

  const fetchStreak = async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.habits?.getStreak) {
        const res = await window.electronAPI.habits.getStreak(habit.id);
        setStreakInfo(res);
      }
    } catch (err) {
      console.error('Failed to fetch streak:', err);
    }
  };

  useEffect(() => {
    fetchStreak();
  }, [habit.id, activeStatus, dateString]);

  const handleStatusClick = async (clickedStatus: LogStatus) => {
    setErrorMessage(null);

    const targetStatus: LogStatus =
      activeStatus === clickedStatus ? 'none' : clickedStatus;

    // 1. Save previous state for rollback
    const previousStatus = activeStatus;

    // 2. Optimistic UI update
    setActiveStatus(targetStatus);

    // 3. Pulse animation trigger
    if (targetStatus !== 'none') {
      setPulsingStatus(targetStatus);
      setTimeout(() => setPulsingStatus(null), 120);
    }

    // 4. IPC Call in background
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.habits) {
        await window.electronAPI.habits.log({
          habit_id: habit.id,
          log_date: dateString,
          status: targetStatus,
        });
        fetchStreak();
      }
    } catch (err) {
      console.error('Failed to log habit status:', err);
      // 5. Revert on failure
      setActiveStatus(previousStatus);
      setErrorMessage('Failed to save status. Please try again.');
    }
  };

  const hasActive = activeStatus !== 'none';

  return (
    <div
      className={`habit-card hoverable anim-fade-slide-up ${delayClass} ${
        isBreak ? 'break-card' : ''
      }`}
    >
      <div className="habit-card-header">
        <div className="habit-title-container">
          <h3 className="habit-name">{habit.name}</h3>
          <span className={`habit-type-badge ${habit.type}`}>
            {habit.type === 'build' ? 'Build' : 'Break'}
          </span>

          {habit.time_of_day && habit.time_of_day.length > 0 && (
            <div className="habit-time-chips">
              {habit.time_of_day.map((t) => (
                <span key={t} className="habit-time-chip">
                  {t === 'morning' ? '🌅' : t === 'afternoon' ? '☀️' : '🌙'} {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {streakInfo && streakInfo.current_streak > 0 && (
        <div
          className={`habit-streak-badge anim-fade-in ${
            isBreak ? 'break-streak' : 'build-streak'
          }`}
        >
          {isBreak ? (
            <>🛡️ {streakInfo.current_streak} {streakInfo.current_streak === 1 ? 'day' : 'days'} clean</>
          ) : (
            <>🔥 {streakInfo.current_streak} {streakInfo.current_streak === 1 ? 'day' : 'days'} streak</>
          )}
        </div>
      )}

      <div className="habit-completion-container">
        {errorMessage && <div className="card-error-text">{errorMessage}</div>}

        <div className={`completion-btn-group ${hasActive ? 'has-active' : ''}`}>
          {isBreak ? (
            /* BREAK HABIT BUTTONS: Avoided / Skip / Relapsed */
            <>
              <button
                type="button"
                className={`completion-btn avoided pressable ${
                  activeStatus === 'completed' ? 'active' : ''
                } ${pulsingStatus === 'completed' ? 'pulse-anim' : ''}`}
                onClick={() => handleStatusClick('completed')}
              >
                {activeStatus === 'completed' ? '✓ Avoided' : 'Avoided'}
              </button>

              <button
                type="button"
                className={`completion-btn skip pressable ${
                  activeStatus === 'skipped' ? 'active' : ''
                } ${pulsingStatus === 'skipped' ? 'pulse-anim' : ''}`}
                onClick={() => handleStatusClick('skipped')}
              >
                {activeStatus === 'skipped' ? 'Skipped' : 'Skip'}
              </button>

              <button
                type="button"
                className={`completion-btn relapsed pressable ${
                  activeStatus === 'failed' ? 'active' : ''
                } ${pulsingStatus === 'failed' ? 'pulse-anim' : ''}`}
                onClick={() => handleStatusClick('failed')}
              >
                {activeStatus === 'failed' ? 'Relapsed' : 'Relapsed'}
              </button>
            </>
          ) : (
            /* BUILD HABIT BUTTONS: Complete / Skip / Fail */
            <>
              <button
                type="button"
                className={`completion-btn complete pressable ${
                  activeStatus === 'completed' ? 'active' : ''
                } ${pulsingStatus === 'completed' ? 'pulse-anim' : ''}`}
                onClick={() => handleStatusClick('completed')}
              >
                {activeStatus === 'completed' ? '✓ Done' : 'Complete'}
              </button>

              <button
                type="button"
                className={`completion-btn skip pressable ${
                  activeStatus === 'skipped' ? 'active' : ''
                } ${pulsingStatus === 'skipped' ? 'pulse-anim' : ''}`}
                onClick={() => handleStatusClick('skipped')}
              >
                {activeStatus === 'skipped' ? 'Skipped' : 'Skip'}
              </button>

              <button
                type="button"
                className={`completion-btn fail pressable ${
                  activeStatus === 'failed' ? 'active' : ''
                } ${pulsingStatus === 'failed' ? 'pulse-anim' : ''}`}
                onClick={() => handleStatusClick('failed')}
              >
                {activeStatus === 'failed' ? 'Failed' : 'Fail'}
              </button>
            </>
          )}
        </div>
      </div>

      {habit.checklist_items && habit.checklist_items.length > 0 && (
        <div className="habit-checklist">
          <div className="habit-checklist-title">Checklist:</div>
          <ul className="habit-checklist-list">
            {habit.checklist_items.map((item) => (
              <li key={item.id} className="habit-checklist-item">
                <span className="checklist-bullet">•</span>
                <span className="checklist-label">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
