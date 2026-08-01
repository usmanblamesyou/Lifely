import React, { useEffect, useState } from 'react';
import { ProgressRange, ProgressData, HabitBreakdown } from '../../types/progress';
import PieChart from '../progress/PieChart';
import BarGraph from '../progress/BarGraph';

export default function ProgressView() {
  const [range, setRange] = useState<ProgressRange>('7d');
  const [data, setData] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
    setSelectedDate(null);
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

  const selectedDayData = selectedDate && data ? data.days.find((d) => d.date === selectedDate) : null;

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
                  const isSelected = selectedDate === dayStr;

                  return (
                    <div
                      key={dayNum}
                      className={`heatmap-day tier-${tier} ${!isInRange ? 'out-of-range' : ''} ${
                        isSelected ? 'selected' : ''
                      }`}
                      onClick={() => {
                        if (isInRange && dayData) {
                          setSelectedDate(selectedDate === dayStr ? null : dayStr);
                        }
                      }}
                      title={
                        isInRange && dayData
                          ? `${dayStr}: ${dayData.completed_count}/${dayData.scheduled_count} completed`
                          : undefined
                      }
                    >
                      {dayNum}
                      {isPerfect && <span className="heatmap-star">★</span>}
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

  const formatDateFull = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const sortedHabits = getSortedHabits();

  return (
    <div className="progress-page">
      <div className="today-header">
        <h2 className="today-title text-title">Progress & Performance</h2>
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

      {/* Selected Date Header Badge if Active */}
      {selectedDate && (
        <div className="date-detail-header" style={{ marginBottom: '1rem', marginTop: '0.5rem' }}>
          <div className="date-detail-title-group">
            <span className="date-detail-date-badge">
              📅 Selected Date: {formatDateFull(selectedDate)}
            </span>
            {selectedDayData && (
              <span className="text-caption">
                ({selectedDayData.completed_count} of {selectedDayData.scheduled_count} completed)
              </span>
            )}
          </div>
          <button
            type="button"
            className="clear-selection-btn"
            onClick={() => setSelectedDate(null)}
          >
            ✕ Clear Selection (Show All)
          </button>
        </div>
      )}

      {/* Main Progress Content */}
      {isLoading ? (
        <div className="skeleton-card" style={{ height: '220px', justifyContent: 'center' }}>
          <div className="skeleton-line" style={{ width: '40%', marginBottom: '12px' }} />
          <div className="skeleton-line" style={{ width: '90%' }} />
          <div className="skeleton-line" style={{ width: '70%', marginTop: '12px' }} />
        </div>
      ) : !data ? (
        <div className="empty-state-improved">
          <div className="empty-state-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
              <line x1="2" y1="20" x2="22" y2="20"/>
            </svg>
          </div>
          <div className="empty-state-headline">No data yet</div>
          <div className="empty-state-subtitle">Start checking in daily to see your progress here.</div>
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

          {/* Charts Section */}
          <div className="charts-row">
            <div className="chart-panel">
              <div className="chart-title">
                {selectedDate ? `Completion Breakdown (${selectedDate})` : 'Completion Breakdown'}
              </div>
              <PieChart
                summary={data.summary}
                habitBreakdown={data.habit_breakdown}
                selectedDayData={selectedDayData}
                isLoading={isLoading}
              />
            </div>
            <div className="chart-panel">
              <div className="chart-title">Daily Performance</div>
              <BarGraph
                days={data.days}
                range={range}
                habitBreakdown={data.habit_breakdown}
                selectedDate={selectedDate}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Selected Date Detailed Breakdown Panel */}
          {selectedDate && (
            <div className="date-detail-panel">
              <div className="date-detail-header">
                <div className="date-detail-title-group">
                  <h3 className="text-heading" style={{ margin: 0 }}>
                    Detailed Breakdown for {formatDateFull(selectedDate)}
                  </h3>
                </div>
                <button
                  type="button"
                  className="clear-selection-btn"
                  onClick={() => setSelectedDate(null)}
                >
                  ✕ Show Full Range
                </button>
              </div>

              {!selectedDayData || !selectedDayData.items || selectedDayData.items.length === 0 ? (
                <div className="empty-state" style={{ minHeight: 120 }}>
                  <span className="empty-text">No habits or tasks were scheduled for this date.</span>
                </div>
              ) : (
                <div className="date-detail-columns">
                  {/* Completed Items */}
                  <div className="date-detail-column">
                    <div className="date-detail-column-title completed">
                      <span>✓ Completed ({selectedDayData.items.filter((i) => i.status === 'completed').length})</span>
                    </div>
                    <div className="date-detail-list">
                      {selectedDayData.items.filter((i) => i.status === 'completed').length === 0 ? (
                        <div className="text-caption" style={{ padding: '0.5rem 0' }}>None completed on this day.</div>
                      ) : (
                        selectedDayData.items
                          .filter((i) => i.status === 'completed')
                          .map((item) => (
                            <div key={`${item.item_type}-${item.id}`} className="date-detail-card">
                              <div className="date-detail-card-left">
                                <div className="date-detail-icon-badge completed">✓</div>
                                <div className="date-detail-card-info">
                                  <span className="date-detail-card-title">{item.title}</span>
                                  <div className="date-detail-card-tags">
                                    <span className={`date-tag ${item.item_type}`}>{item.item_type}</span>
                                    {item.habit_type && <span className="date-tag habit">{item.habit_type}</span>}
                                    {item.priority && item.priority !== 'none' && (
                                      <span className={`date-tag priority-${item.priority}`}>{item.priority}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Not Completed Items */}
                  <div className="date-detail-column">
                    <div className="date-detail-column-title not-completed">
                      <span>✕ Not Completed ({selectedDayData.items.filter((i) => i.status !== 'completed').length})</span>
                    </div>
                    <div className="date-detail-list">
                      {selectedDayData.items.filter((i) => i.status !== 'completed').length === 0 ? (
                        <div className="text-caption" style={{ padding: '0.5rem 0' }}>All scheduled items completed! 🎉</div>
                      ) : (
                        selectedDayData.items
                          .filter((i) => i.status !== 'completed')
                          .map((item) => (
                            <div key={`${item.item_type}-${item.id}`} className="date-detail-card">
                              <div className="date-detail-card-left">
                                <div className="date-detail-icon-badge not-completed">
                                  {item.status === 'skipped' ? '↷' : '✕'}
                                </div>
                                <div className="date-detail-card-info">
                                  <span className="date-detail-card-title">{item.title}</span>
                                  <div className="date-detail-card-tags">
                                    <span className={`date-tag ${item.item_type}`}>{item.item_type}</span>
                                    {item.habit_type && <span className="date-tag habit">{item.habit_type}</span>}
                                    {item.priority && item.priority !== 'none' && (
                                      <span className={`date-tag priority-${item.priority}`}>{item.priority}</span>
                                    )}
                                    <span className="text-caption" style={{ textTransform: 'capitalize' }}>
                                      ({item.status})
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Habit Breakdown Table */}
          <div>
            <div className="recap-section-title" style={{ marginTop: '1.5rem' }}>
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
