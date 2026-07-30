'use client';

import React, { useEffect, useState } from 'react';
import { ProgressRange, ProgressData, HabitBreakdown } from '../../types/progress';
import PieChart from '../../components/progress/PieChart';
import BarGraph from '../../components/progress/BarGraph';

export default function ProgressPage() {
  const [range, setRange] = useState<ProgressRange>('7d');
  const [data, setData] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tooltip state for heatmap
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    completed: number;
    scheduled: number;
    score: number;
    cellKey: string;
  } | null>(null);

  // Habit breakdown sorting
  const [sortField, setSortField] = useState<keyof HabitBreakdown>('completion_rate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchProgress = async () => {
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.progress) {
        const res = await window.electronAPI.progress.getData({ range });
        setData(res);
      }
    } catch (err) {
      console.error('Failed to fetch progress data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [range]);

  const handleSort = (field: keyof HabitBreakdown) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortedHabits = () => {
    if (!data || !data.habit_breakdown) return [];
    return [...data.habit_breakdown].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') {
        const comp = (valA as string).localeCompare(valB as string);
        return sortOrder === 'asc' ? comp : -comp;
      }

      const numA = valA as number;
      const numB = valB as number;
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });
  };

  // Helper to generate monthly grids stacked vertically
  const renderStackedMonthCalendars = () => {
    if (!data || !data.range_start || !data.range_end) return null;

    const dayMap = new Map<string, any>();
    data.days.forEach((d) => dayMap.set(d.date, d));

    const [sY, sM, sD] = data.range_start.split('-').map(Number);
    const [eY, eM, eD] = data.range_end.split('-').map(Number);

    const startUtc = Date.UTC(sY, sM - 1, sD);
    const endUtc = Date.UTC(eY, eM - 1, eD);

    const months: { year: number; month: number }[] = [];
    let curY = sY;
    let curM = sM - 1;

    while (curY < eY || (curY === eY && curM <= eM - 1)) {
      months.push({ year: curY, month: curM });
      curM++;
      if (curM > 11) {
        curM = 0;
        curY++;
      }
    }

    return (
      <div className="heatmap-months">
        {months.map(({ year, month }) => {
          const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          });

          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const firstDayOfWeek = new Date(year, month, 1).getDay();

          return (
            <div key={`${year}-${month}`} className="heatmap-month">
              <div className="heatmap-month-label">{monthLabel}</div>
              <div className="heatmap-grid">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <div key={d} className="mini-calendar-weekday">
                    {d}
                  </div>
                ))}

                {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="heatmap-day tier-empty out-of-range" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
                    dayNum
                  ).padStart(2, '0')}`;

                  const cellUtc = Date.UTC(year, month, dayNum);
                  const isInRange = cellUtc >= startUtc && cellUtc <= endUtc;

                  const dayData = dayMap.get(dayStr);
                  const tier = isInRange && dayData ? dayData.tier : 'empty';
                  const isPerfect = tier === 'perfect';

                  const cellKey = `${year}-${month}-${dayNum}`;
                  const isHovered = hoveredDay?.cellKey === cellKey;

                  return (
                    <div
                      key={dayNum}
                      className={`heatmap-day tier-${tier} ${!isInRange ? 'out-of-range' : ''}`}
                      onMouseEnter={() => {
                        if (isInRange && dayData) {
                          setHoveredDay({
                            date: dayStr,
                            completed: dayData.completed_count,
                            scheduled: dayData.scheduled_count,
                            score:
                              dayData.daily_score !== null
                                ? Math.round(dayData.daily_score * 100)
                                : 0,
                            cellKey,
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      {dayNum}
                      {isPerfect && <span className="heatmap-star">★</span>}

                      {isHovered && (
                        <div className="heatmap-tooltip">
                          {hoveredDay.date}: {hoveredDay.completed} of {hoveredDay.scheduled}{' '}
                          completed ({hoveredDay.score}%)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const formatDateLabel = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const sortedHabits = getSortedHabits();

  return (
    <div className="progress-page">
      <div className="today-header">
        <h2 className="today-title">Progress & Performance</h2>
      </div>

      {/* Range Selector Bar */}
      <div className="habits-filter-bar">
        <div className="filter-chip-group">
          {(
            [
              ['7d', '7 Days'],
              ['14d', '14 Days'],
              ['1m', '1 Month'],
              ['3m', '3 Months'],
              ['6m', '6 Months'],
              ['1y', '1 Year'],
            ] as const
          ).map(([rKey, rLabel]) => (
            <button
              key={rKey}
              type="button"
              className={`filter-chip pressable ${range === rKey ? 'active' : ''}`}
              onClick={() => setRange(rKey as ProgressRange)}
            >
              {rLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Main Progress Content */}
      {isLoading ? (
        <div className="today-loading">Loading analytics...</div>
      ) : !data ? (
        <div className="empty-state">
          <span className="empty-text">No analytics data found.</span>
        </div>
      ) : (
        <>
          {data.summary.empty_days === data.summary.total_days && (
            <div className="form-error" style={{ marginBottom: '1rem' }}>
              Not enough data yet. Check back after using the app for at least 7 days.
            </div>
          )}

          {/* Calendar Heatmap Stack */}
          {renderStackedMonthCalendars()}

          {/* Summary Stats Bar */}
          <div className="summary-stats-bar">
            <div className="recap-stat-card">
              <span className="recap-stat-label">Average</span>
              <span className="recap-stat-value">
                {Math.round(data.summary.average_completion_rate * 100)}%
              </span>
            </div>
            <div className="recap-stat-card">
              <span className="recap-stat-label">Best Day</span>
              <span className="recap-stat-value" style={{ fontSize: '1.2rem' }}>
                {formatDateLabel(data.summary.best_day)}
              </span>
            </div>
            <div className="recap-stat-card">
              <span className="recap-stat-label">Worst Day</span>
              <span className="recap-stat-value" style={{ fontSize: '1.2rem' }}>
                {formatDateLabel(data.summary.worst_day)}
              </span>
            </div>
            <div className="recap-stat-card">
              <span className="recap-stat-label">Best Streak</span>
              <span className="recap-stat-value">{data.summary.best_streak} days</span>
            </div>
            <div className="recap-stat-card">
              <span className="recap-stat-label">Total Done</span>
              <span className="recap-stat-value" style={{ color: 'var(--success)' }}>
                {data.summary.total_completed}
              </span>
            </div>
          </div>

          {/* Stages 11 & 12: Charts Section */}
          <div className="charts-row">
            <div className="chart-panel">
              <div className="chart-title">Completion Breakdown</div>
              <PieChart
                summary={data.summary}
                habitBreakdown={data.habit_breakdown}
                isLoading={isLoading}
              />
            </div>
            <div className="chart-panel">
              <div className="chart-title">Daily Performance</div>
              <BarGraph
                days={data.days}
                range={range}
                habitBreakdown={data.habit_breakdown}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Habit Breakdown Table */}
          <div>
            <div className="recap-section-title" style={{ marginTop: '1rem' }}>
              Habit Performance Breakdown
            </div>
            {sortedHabits.length === 0 ? (
              <div className="empty-state">
                <span className="empty-text">No active habits in this date range.</span>
              </div>
            ) : (
              <table className="progress-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('habit_name')}>
                      Name {sortField === 'habit_name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onClick={() => handleSort('habit_type')}>
                      Type {sortField === 'habit_type' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onClick={() => handleSort('days_scheduled')}>
                      Scheduled {sortField === 'days_scheduled' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onClick={() => handleSort('days_completed')}>
                      Completed {sortField === 'days_completed' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onClick={() => handleSort('days_missed')}>
                      Missed {sortField === 'days_missed' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onClick={() => handleSort('days_skipped')}>
                      Skipped {sortField === 'days_skipped' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onClick={() => handleSort('completion_rate')}>
                      Rate {sortField === 'completion_rate' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHabits.map((h) => {
                    const pct = Math.round(h.completion_rate * 100);
                    let rateClass = 'rate-cell-poor';
                    if (pct >= 80) rateClass = 'rate-cell-good';
                    else if (pct >= 50) rateClass = 'rate-cell-mid';

                    return (
                      <tr key={h.habit_id}>
                        <td style={{ fontWeight: 600 }}>{h.habit_name}</td>
                        <td>
                          <span className={`habit-type-badge ${h.habit_type}`}>
                            {h.habit_type}
                          </span>
                        </td>
                        <td>{h.days_scheduled}</td>
                        <td>{h.days_completed}</td>
                        <td>{h.days_missed}</td>
                        <td>{h.days_skipped}</td>
                        <td className={rateClass}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
