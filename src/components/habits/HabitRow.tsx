'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Habit } from '../../types/habit';
import RecapPanel from './RecapPanel';

interface HabitRowProps {
  habit: Habit;
  onUpdate: () => void;
}

export default function HabitRow({ habit, onUpdate }: HabitRowProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'none' | 'end' | 'delete'>('none');
  const [showRecap, setShowRecap] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const isBreak = habit.type === 'break';
  const isArchived = habit.is_archived;

  // Format date helper: "2026-07-01" -> "Jul 1, 2026"
  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTodayString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        menuBtnRef.current &&
        !menuBtnRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleArchive = async () => {
    setIsMenuOpen(false);
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.habits) {
        await window.electronAPI.habits.archive(habit.id);
        onUpdate();
      }
    } catch (err) {
      console.error('Failed to archive habit:', err);
    }
  };

  const handleUnarchive = async () => {
    setIsMenuOpen(false);
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.habits) {
        await window.electronAPI.habits.unarchive(habit.id);
        onUpdate();
      }
    } catch (err) {
      console.error('Failed to unarchive habit:', err);
    }
  };

  const handleConfirmEnd = async () => {
    const todayStr = getTodayString();
    setConfirmMode('none');
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.habits) {
        await window.electronAPI.habits.end({
          habit_id: habit.id,
          end_date: todayStr,
        });
        onUpdate();
      }
    } catch (err) {
      console.error('Failed to end habit:', err);
    }
  };

  const handleConfirmDelete = async () => {
    setConfirmMode('none');
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.habits) {
        await window.electronAPI.habits.delete(habit.id);
        onUpdate();
      }
    } catch (err) {
      console.error('Failed to delete habit:', err);
    }
  };

  const currentStreak = habit.current_streak || 0;

  return (
    <>
      <div className={`habit-row ${isArchived ? 'archived' : ''}`}>
        <div className="habit-row-left">
          <div className="habit-row-name">{habit.name}</div>
          <div className="habit-row-meta">
            <span className={`habit-type-badge ${habit.type}`}>
              {isBreak ? 'Break' : 'Build'}
            </span>

            <span className="habit-row-date">
              Started {formatDateString(habit.start_date)}
            </span>

            {habit.end_date && (
              <span className="habit-row-date text-tertiary">
                • Ended {formatDateString(habit.end_date)}
              </span>
            )}
          </div>
        </div>

        <div className="habit-row-right">
          {habit.end_date && (
            <button
              type="button"
              className="btn-recap pressable"
              onClick={() => setShowRecap(true)}
            >
              View Recap
            </button>
          )}

          {currentStreak > 0 && !habit.end_date && (
            <span
              className={`habit-row-streak ${
                isBreak ? 'break-streak' : 'build-streak'
              }`}
            >
              {isBreak
                ? `🛡️ ${currentStreak} ${currentStreak === 1 ? 'day' : 'days'} clean`
                : `🔥 ${currentStreak} ${currentStreak === 1 ? 'day' : 'days'} streak`}
            </span>
          )}

          {isArchived ? (
            <div className="flex-between gap-2">
              <button
                type="button"
                className="btn-secondary pressable"
                onClick={handleUnarchive}
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              >
                Unarchive
              </button>
              <button
                ref={menuBtnRef}
                type="button"
                className="habit-action-menu-btn pressable"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                ⋯
              </button>
            </div>
          ) : (
            <button
              ref={menuBtnRef}
              type="button"
              className="habit-action-menu-btn pressable"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              ⋯
            </button>
          )}

          {isMenuOpen && (
            <div ref={menuRef} className="habit-action-menu anim-slide-down">
              {!isArchived ? (
                <>
                  {!habit.end_date && (
                    <button
                      type="button"
                      className="habit-action-item"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setConfirmMode('end');
                      }}
                    >
                      End Habit
                    </button>
                  )}
                  <button
                    type="button"
                    className="habit-action-item"
                    onClick={handleArchive}
                  >
                    Archive
                  </button>
                  <button
                    type="button"
                    className="habit-action-item danger"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setConfirmMode('delete');
                    }}
                  >
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="habit-action-item"
                    onClick={handleUnarchive}
                  >
                    Unarchive
                  </button>
                  <button
                    type="button"
                    className="habit-action-item danger"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setConfirmMode('delete');
                    }}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Inline Confirmation Panels */}
        {confirmMode === 'end' && (
          <div className="habit-inline-confirm anim-slide-down">
            <p>
              End this habit? This will stop it from appearing on future dates.
              Your history will be saved.
            </p>
            <div className="habit-inline-confirm-buttons">
              <button
                type="button"
                className="btn-secondary pressable"
                onClick={() => setConfirmMode('none')}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary pressable"
                onClick={handleConfirmEnd}
              >
                End Habit
              </button>
            </div>
          </div>
        )}

        {confirmMode === 'delete' && (
          <div className="habit-inline-confirm anim-slide-down">
            <p>
              Permanently delete this habit and all its history? This cannot be
              undone.
            </p>
            <div className="habit-inline-confirm-buttons">
              <button
                type="button"
                className="btn-secondary pressable"
                onClick={() => setConfirmMode('none')}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary pressable"
                style={{ backgroundColor: 'var(--danger)' }}
                onClick={handleConfirmDelete}
              >
                Delete Forever
              </button>
            </div>
          </div>
        )}
      </div>

      {showRecap && (
        <RecapPanel habitId={habit.id} onClose={() => setShowRecap(false)} />
      )}
    </>
  );
}
