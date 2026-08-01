'use client';

import React, { useEffect, useState } from 'react';
import HabitRow from '../habits/HabitRow';
import NewHabitForm from '../habits/NewHabitForm';
import { Habit, HabitType } from '../../types/habit';

export default function HabitsView() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | HabitType>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');

  const fetchHabits = async () => {
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.habits) {
        const data = await window.electronAPI.habits.getAll();
        setHabits(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch all habits:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const filteredHabits = habits.filter((h) => {
    if (typeFilter !== 'all' && h.type !== typeFilter) {
      return false;
    }
    if (statusFilter === 'active' && h.is_archived) {
      return false;
    }
    if (statusFilter === 'archived' && !h.is_archived) {
      return false;
    }
    return true;
  });

  return (
    <div className="habits-page">
      <div className="today-header">
        <h2 className="today-title text-title">Habit Management</h2>
      </div>

      <div className="habits-filter-bar">
        {/* Type Filter Chips */}
        <div className="filter-chip-group">
          <button
            type="button"
            className={`filter-chip pressable ${typeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setTypeFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`filter-chip pressable ${typeFilter === 'build' ? 'active' : ''}`}
            onClick={() => setTypeFilter('build')}
          >
            Build
          </button>
          <button
            type="button"
            className={`filter-chip pressable ${typeFilter === 'break' ? 'active' : ''}`}
            onClick={() => setTypeFilter('break')}
          >
            Break
          </button>
        </div>

        {/* Status Filter Chips */}
        <div className="filter-chip-group">
          <button
            type="button"
            className={`filter-chip pressable ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Active
          </button>
          <button
            type="button"
            className={`filter-chip pressable ${statusFilter === 'archived' ? 'active' : ''}`}
            onClick={() => setStatusFilter('archived')}
          >
            Archived
          </button>
        </div>
      </div>

      <div className="today-content">
        {isLoading ? (
          <div className="skeleton-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="skeleton-card" style={{ padding: '0.875rem' }}><div className="skeleton-line" style={{ width: '60%' }} /></div>
            <div className="skeleton-card" style={{ padding: '0.875rem' }}><div className="skeleton-line" style={{ width: '50%' }} /></div>
            <div className="skeleton-card" style={{ padding: '0.875rem' }}><div className="skeleton-line" style={{ width: '70%' }} /></div>
          </div>
        ) : filteredHabits.length === 0 ? (
          <div className="empty-state-improved">
            <div className="empty-state-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 22V12"/>
                <path d="M12 12C12 12 7 10 7 5a5 5 0 0 1 10 0c0 5-5 7-5 7z"/>
                <path d="M12 12C12 12 17 10 17 5"/>
              </svg>
            </div>
            <div className="empty-state-headline">No habits yet</div>
            <div className="empty-state-subtitle">
              {statusFilter === 'archived'
                ? 'No archived habits.'
                : 'Head to Today view to add your first habit.'}
            </div>
          </div>
        ) : (
          <div className="habits-list">
            {filteredHabits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                onUpdate={fetchHabits}
                onEdit={setEditHabit}
              />
            ))}
          </div>
        )}
      </div>

      <NewHabitForm
        isOpen={Boolean(editHabit)}
        onClose={() => setEditHabit(null)}
        onSuccess={fetchHabits}
        editHabit={editHabit || undefined}
        initialStartDate=""
      />
    </div>
  );
}
