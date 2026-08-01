'use client';

import React, { useState, useEffect } from 'react';
import { Habit, LogStatus } from '../../types/habit';

interface HabitCardProps {
  habit: Habit;
  dateString: string;
  index?: number;
  onDelete?: (id: number) => void;
  onArchive?: (id: number) => void;
  onEdit?: (habit: Habit) => void;
  // Drag props
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

// Drag handle SVG (6 dots, 2 columns of 3)
function DragHandle() {
  return (
    <span className="drag-handle" title="Drag to reorder">
      <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
        <circle cx="3" cy="3" r="1.5" />
        <circle cx="9" cy="3" r="1.5" />
        <circle cx="3" cy="8" r="1.5" />
        <circle cx="9" cy="8" r="1.5" />
        <circle cx="3" cy="13" r="1.5" />
        <circle cx="9" cy="13" r="1.5" />
      </svg>
    </span>
  );
}

export default function HabitCard({
  habit,
  dateString,
  index = 0,
  onDelete,
  onArchive,
  onEdit,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging = false,
}: HabitCardProps) {
  const isBreak = habit.type === 'break';
  const delayClass = index < 5 ? `anim-delay-${(index % 5) + 1}` : '';

  const initialStatus: LogStatus = habit.log ? habit.log.status : 'none';
  const [activeStatus, setActiveStatus] = useState<LogStatus>(initialStatus);
  const [pulsingStatus, setPulsingStatus] = useState<LogStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
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
    const targetStatus: LogStatus = activeStatus === clickedStatus ? 'none' : clickedStatus;
    const previousStatus = activeStatus;
    setActiveStatus(targetStatus);

    if (targetStatus !== 'none') {
      setPulsingStatus(targetStatus);
      setTimeout(() => setPulsingStatus(null), 120);
    }

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
      console.error('Habit log failed:', err);
      setActiveStatus(previousStatus);
      setErrorMessage('Failed to save status. Please try again.');
    }
  };

  const handleArchive = async () => {
    setIsMenuOpen(false);
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.habits) {
        await window.electronAPI.habits.archive(habit.id);
        if (onArchive) onArchive(habit.id);
        else if (onDelete) onDelete(habit.id);
      }
    } catch (err) {
      console.error('Failed to archive habit:', err);
    }
  };

  const handleDelete = async () => {
    setIsMenuOpen(false);
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.habits) {
        await window.electronAPI.habits.delete(habit.id);
        if (onDelete) onDelete(habit.id);
      }
    } catch (err) {
      console.error('Failed to delete habit:', err);
    }
  };

  const hasActive = activeStatus !== 'none';

  // Apply custom color as left border override
  const cardStyle: React.CSSProperties = {};
  if (habit.color) {
    cardStyle.borderLeft = `3px solid ${habit.color}`;
  }

  return (
    <div
      className={`habit-card hoverable anim-fade-slide-up ${delayClass} ${
        isBreak ? 'break-card' : ''
      } ${isDragging ? 'dragging' : ''}`}
      style={{ position: 'relative', ...cardStyle }}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {draggable && <DragHandle />}

      <div className="habit-card-body">
        <div className="habit-card-header">
          <div className="habit-title-container">
            <h3 className="habit-name">{habit.name}</h3>
            <span className={`habit-type-badge ${habit.type}`}>
              {habit.type === 'build' ? 'Build' : 'Break'}
            </span>

            {(() => {
              const timeList = Array.isArray(habit.time_of_day)
                ? habit.time_of_day
                : typeof habit.time_of_day === 'string' && habit.time_of_day
                ? [habit.time_of_day]
                : [];
              if (timeList.length === 0) return null;
              return (
                <div className="habit-time-chips">
                  {timeList.map((t) => (
                    <span key={t} className="habit-time-chip" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {t === 'morning' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginRight: '3px' }}>
                          <circle cx="12" cy="17" r="4"/>
                          <path d="M12 3v2M4.2 10.2l1.4 1.4M19.8 10.2l-1.4 1.4M2 17h2M20 17h2"/>
                        </svg>
                      )}
                      {t === 'afternoon' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginRight: '3px' }}>
                          <circle cx="12" cy="12" r="4"/>
                          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
                        </svg>
                      )}
                      {t === 'evening' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginRight: '3px' }}>
                          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                        </svg>
                      )}
                      {t}
                    </span>
                  ))}
                </div>
              );
            })()}
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
          {errorMessage && <div className="card-error-text" style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{errorMessage}</div>}

          <div className={`completion-btn-group ${hasActive ? 'has-active' : ''}`}>
            {isBreak ? (
              <>
                <button
                  type="button"
                  className={`completion-btn avoided ${activeStatus === 'completed' ? 'active' : ''} ${
                    pulsingStatus === 'completed' ? 'pulse-success' : ''
                  }`}
                  onClick={() => handleStatusClick('completed')}
                >
                  Avoided
                </button>
                <button
                  type="button"
                  className={`completion-btn skip ${activeStatus === 'skipped' ? 'active' : ''} ${
                    pulsingStatus === 'skipped' ? 'pulse-neutral' : ''
                  }`}
                  onClick={() => handleStatusClick('skipped')}
                >
                  Skip
                </button>
                <button
                  type="button"
                  className={`completion-btn relapsed ${activeStatus === 'failed' ? 'active' : ''} ${
                    pulsingStatus === 'failed' ? 'pulse-danger' : ''
                  }`}
                  onClick={() => handleStatusClick('failed')}
                >
                  Relapsed
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={`completion-btn complete ${activeStatus === 'completed' ? 'active' : ''} ${
                    pulsingStatus === 'completed' ? 'pulse-success' : ''
                  }`}
                  onClick={() => handleStatusClick('completed')}
                >
                  Complete
                </button>
                <button
                  type="button"
                  className={`completion-btn skip ${activeStatus === 'skipped' ? 'active' : ''} ${
                    pulsingStatus === 'skipped' ? 'pulse-neutral' : ''
                  }`}
                  onClick={() => handleStatusClick('skipped')}
                >
                  Skip
                </button>
                <button
                  type="button"
                  className={`completion-btn fail ${activeStatus === 'failed' ? 'active' : ''} ${
                    pulsingStatus === 'failed' ? 'pulse-danger' : ''
                  }`}
                  onClick={() => handleStatusClick('failed')}
                >
                  Fail
                </button>
              </>
            )}
          </div>
        </div>

        {isConfirmingDelete && (
          <div
            className="inline-delete-confirm anim-fade-in"
            style={{
              marginTop: '8px', padding: '8px 12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--danger)',
              borderRadius: '6px', fontSize: '0.85rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              Delete this habit and all its history? This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary pressable"
                style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                onClick={() => setIsConfirmingDelete(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary pressable"
                style={{ padding: '2px 8px', fontSize: '0.8rem', background: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ⋯ Action Menu Button */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className="habit-menu-btn pressable"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            fontSize: '1.2rem',
            cursor: 'pointer',
            padding: '0 4px',
          }}
          title="Options"
        >
          ⋯
        </button>

        {isMenuOpen && (
          <div
            className="habit-menu-dropdown anim-fade-in"
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '4px 0',
              zIndex: 20,
              minWidth: '110px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            {onEdit && (
              <button
                type="button"
                className="habit-menu-item"
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '6px 12px', background: 'none', border: 'none',
                  color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer',
                }}
                onClick={() => { setIsMenuOpen(false); onEdit(habit); }}
              >
                Edit
              </button>
            )}
            <button
              type="button"
              className="habit-menu-item"
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '6px 12px', background: 'none', border: 'none',
                color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer',
              }}
              onClick={handleArchive}
            >
              Archive
            </button>

            <button
              type="button"
              className="habit-menu-item text-danger"
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '6px 12px', background: 'none', border: 'none',
                color: 'var(--danger)', fontSize: '0.85rem', cursor: 'pointer',
              }}
              onClick={() => {
                setIsMenuOpen(false);
                setIsConfirmingDelete(true);
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
