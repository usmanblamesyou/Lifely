'use client';

import React, { useEffect, useState } from 'react';
import HabitRow from '../../components/habits/HabitRow';
import { Habit, HabitType } from '../../types/habit';

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const getEmptyMessage = () => {
    if (habits.length === 0) {
      return 'No habits yet. Add your first habit from the Today view.';
    }
    if (statusFilter === 'active') {
      return 'No active habits. Check the Archived tab.';
    }
    return 'No archived habits.';
  };

  return (
    <div className="habits-page">
      <div className="today-header">
        <h2 className="today-title">Habit Management</h2>
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
          <div className="today-loading">Loading habits...</div>
        ) : filteredHabits.length === 0 ? (
          <div className="empty-state">
            <span className="empty-text">{getEmptyMessage()}</span>
          </div>
        ) : (
          <div className="habits-list">
            {filteredHabits.map((habit) => (
              <HabitRow key={habit.id} habit={habit} onUpdate={fetchHabits} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
