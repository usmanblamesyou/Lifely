'use client';

import React, { useEffect, useState } from 'react';
import { useDate } from '../../context/DateContext';
import HabitCard from '../../components/habits/HabitCard';
import NewHabitForm from '../../components/habits/NewHabitForm';
import TaskCard from '../../components/tasks/TaskCard';
import NewTaskForm from '../../components/tasks/NewTaskForm';
import { Habit } from '../../types/habit';
import { Task } from '../../types/task';

export default function TodayPage() {
  const { selectedDate } = useDate();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const day = String(selectedDate.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;

  const fetchForDate = async () => {
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const [habitsData, tasksData] = await Promise.all([
          window.electronAPI.habits.getForDate(dateString),
          window.electronAPI.tasks.getForDate(dateString),
        ]);
        setHabits(habitsData || []);
        setTasks(tasksData || []);
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

  const buildHabits = habits.filter((h) => h.type === 'build');
  const breakHabits = habits.filter((h) => h.type === 'break');

  return (
    <div className="today-view">
      <div className="today-header">
        <h2 className="today-title">Scheduled Overview</h2>
      </div>

      <div className="today-content">
        {isLoading ? (
          <div className="today-loading">Loading schedule...</div>
        ) : (
          <div className="today-sections">
            {/* HABITS SECTION */}
            <div className="today-section">
              <div className="section-header">
                <span className="section-title">Habits</span>
                <div className="section-divider" />
              </div>

              {habits.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-text">
                    No habits scheduled for this day.
                  </span>
                </div>
              ) : (
                <div className="habit-list-container">
                  {/* Build Habits */}
                  {buildHabits.length > 0 && (
                    <div className="habit-list">
                      {buildHabits.map((habit, index) => (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          dateString={dateString}
                          index={index}
                        />
                      ))}
                    </div>
                  )}

                  {/* Sub-divider for Break Habits when both exist */}
                  {buildHabits.length > 0 && breakHabits.length > 0 && (
                    <div className="section-header sub-header mt-4">
                      <span className="section-title text-danger">Breaking</span>
                      <div className="section-divider danger-divider" />
                    </div>
                  )}

                  {/* Break Habits */}
                  {breakHabits.length > 0 && (
                    <div className="habit-list">
                      {breakHabits.map((habit, index) => (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          dateString={dateString}
                          index={buildHabits.length + index}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* TASKS SECTION */}
            <div className="today-section mt-4">
              <div className="section-header">
                <span className="section-title">Tasks</span>
                <div className="section-divider" />
              </div>

              {tasks.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-text">
                    No tasks scheduled for this day.
                  </span>
                </div>
              ) : (
                <div className="task-list">
                  {tasks.map((task, index) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      dateString={dateString}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="today-footer-buttons">
        <button
          type="button"
          className="btn-primary hoverable"
          onClick={() => setIsHabitModalOpen(true)}
        >
          + New Habit
        </button>

        <button
          type="button"
          className="btn-primary hoverable"
          onClick={() => setIsTaskModalOpen(true)}
        >
          + New Task
        </button>
      </div>

      <NewHabitForm
        isOpen={isHabitModalOpen}
        onClose={() => setIsHabitModalOpen(false)}
        onSuccess={fetchForDate}
        initialStartDate={dateString}
      />

      <NewTaskForm
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={fetchForDate}
        initialDueDate={dateString}
      />
    </div>
  );
}
