'use client';

import React, { useEffect, useState } from 'react';
import { HabitRecap } from '../../types/habit';

interface RecapPanelProps {
  habitId: number;
  onClose: () => void;
}

export default function RecapPanel({ habitId, onClose }: RecapPanelProps) {
  const [recap, setRecap] = useState<HabitRecap | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Month navigation for heatmap
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth());

  useEffect(() => {
    const fetchRecap = async () => {
      setIsLoading(true);
      try {
        if (typeof window !== 'undefined' && window.electronAPI?.habits) {
          const data = await window.electronAPI.habits.getRecap(habitId);
          setRecap(data);
          if (data && data.start_date) {
            const [y, m] = data.start_date.split('-').map(Number);
            setViewYear(y);
            setViewMonth(m - 1);
          }
        }
      } catch (err) {
        console.error('Failed to fetch habit recap:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecap();
  }, [habitId]);

  if (isLoading) {
    return (
      <div className="recap-overlay anim-fade-in">
        <div className="recap-panel anim-scale-in">
          <div className="today-loading">Loading recap...</div>
        </div>
      </div>
    );
  }

  if (!recap) {
    return (
      <div className="recap-overlay anim-fade-in">
        <div className="recap-panel anim-scale-in">
          <div className="flex-between">
            <h2>Recap Not Found</h2>
            <button type="button" onClick={onClose} className="modal-close-btn pressable">
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isBreak = recap.habit_type === 'break';
  const pct = Math.round(recap.completion_rate * 100);

  const getHeroLabel = () => {
    if (isBreak) {
      if (pct >= 80) return 'Incredible discipline';
      if (pct >= 60) return 'Strong resistance';
      if (pct >= 40) return 'Making progress';
      return 'Keep pushing';
    } else {
      if (pct >= 80) return 'Outstanding consistency';
      if (pct >= 60) return 'Good progress';
      if (pct >= 40) return 'Building momentum';
      return 'Room to grow';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Heatmap helper calculations
  const logMap = new Map<string, string>();
  if (recap.logs) {
    recap.logs.forEach((l) => logMap.set(l.log_date, l.status));
  }

  const [sY, sM, sD] = recap.start_date.split('-').map(Number);
  const [eY, eM, eD] = recap.end_date.split('-').map(Number);
  const startUtc = Date.UTC(sY, sM - 1, sD);
  const endUtc = Date.UTC(eY, eM - 1, eD);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  return (
    <div className="recap-overlay anim-fade-in">
      <div className="recap-panel anim-scale-in">
        {/* Header */}
        <div className="modal-header" style={{ padding: 0, border: 'none' }}>
          <div>
            <div className="flex-between gap-2" style={{ justifyContent: 'flex-start' }}>
              <h2 className="modal-title" style={{ fontSize: '1.4rem' }}>
                {recap.habit_name}
              </h2>
              <span className={`habit-type-badge ${recap.habit_type}`}>
                {isBreak ? 'Break' : 'Build'}
              </span>
            </div>
            <div className="sub-label">
              {formatDate(recap.start_date)} → {formatDate(recap.end_date)}
            </div>
          </div>
          <button type="button" onClick={onClose} className="modal-close-btn pressable">
            ✕
          </button>
        </div>

        {/* Hero Stat */}
        <div className="recap-hero">
          <div className="recap-percentage">{pct}%</div>
          <div className="recap-label">{getHeroLabel()}</div>
        </div>

        {/* Stat Grid */}
        <div className="recap-stat-grid">
          <div className="recap-stat-card">
            <span className="recap-stat-label">Total Days</span>
            <span className="recap-stat-value">{recap.total_days_active}</span>
          </div>
          <div className="recap-stat-card">
            <span className="recap-stat-label">Completed</span>
            <span className="recap-stat-value" style={{ color: 'var(--success)' }}>
              {recap.days_completed}
            </span>
          </div>
          <div className="recap-stat-card">
            <span className="recap-stat-label">Missed</span>
            <span className="recap-stat-value" style={{ color: 'var(--danger)' }}>
              {recap.days_missed}
            </span>
          </div>
          <div className="recap-stat-card">
            <span className="recap-stat-label">Skipped</span>
            <span className="recap-stat-value" style={{ color: 'var(--warning)' }}>
              {recap.days_skipped}
            </span>
          </div>
          <div className="recap-stat-card">
            <span className="recap-stat-label">Longest Streak</span>
            <span className="recap-stat-value">{recap.longest_streak}</span>
          </div>
          <div className="recap-stat-card">
            <span className="recap-stat-label">Worst Miss Window</span>
            <span className="recap-stat-value">{recap.worst_miss_window}</span>
          </div>
        </div>

        {/* Best Day */}
        <div>
          <div className="recap-section-title">Your Best Day</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {recap.best_day_of_week ? recap.best_day_of_week.label : 'No completions recorded.'}
          </div>
        </div>

        {/* Journey Section */}
        <div>
          <div className="recap-section-title">Your Journey</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>
            {isBreak ? (
              <span style={{ color: 'var(--success)' }}>
                🛡️ Longest clean run: {recap.longest_streak} {recap.longest_streak === 1 ? 'day' : 'days'}
              </span>
            ) : (
              <span style={{ color: 'var(--accent)' }}>
                🔥 Longest streak: {recap.longest_streak} {recap.longest_streak === 1 ? 'day' : 'days'}
              </span>
            )}
          </div>
        </div>

        {/* Mini Calendar Heatmap */}
        <div>
          <div className="recap-section-title">Habit Heatmap</div>
          <div className="recap-heatmap">
            <div className="mini-calendar-header">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="mini-calendar-nav-btn pressable"
              >
                ‹
              </button>
              <span className="mini-calendar-title">{monthLabel}</span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="mini-calendar-nav-btn pressable"
              >
                ›
              </button>
            </div>

            <div className="mini-calendar-grid">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} className="mini-calendar-weekday">
                  {d}
                </div>
              ))}

              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="mini-calendar-day empty" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const cellUtc = Date.UTC(viewYear, viewMonth, dayNum);
                const isInRange = cellUtc >= startUtc && cellUtc <= endUtc;

                const dayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(
                  dayNum
                ).padStart(2, '0')}`;
                const status = logMap.get(dayStr);

                let cellStyle: React.CSSProperties = {};
                if (!isInRange) {
                  cellStyle = { opacity: 0.25, cursor: 'default' };
                } else if (status === 'completed') {
                  cellStyle = { backgroundColor: 'rgba(76, 175, 130, 0.7)', color: '#fff' };
                } else if (status === 'failed') {
                  cellStyle = { backgroundColor: 'rgba(224, 82, 82, 0.5)', color: '#fff' };
                } else if (status === 'skipped') {
                  cellStyle = { backgroundColor: 'rgba(224, 160, 82, 0.4)', color: '#fff' };
                } else {
                  cellStyle = { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' };
                }

                return (
                  <div key={dayNum} className="mini-calendar-day" style={cellStyle}>
                    {dayNum}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
