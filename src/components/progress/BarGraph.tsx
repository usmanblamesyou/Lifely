'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DayData, ProgressRange, HabitBreakdown } from '../../types/progress';

interface BarGraphProps {
  days: DayData[];
  range: ProgressRange;
  habitBreakdown: HabitBreakdown[];
  selectedDate?: string | null;
  isLoading?: boolean;
}

interface BarGroup {
  label: string;
  completed: number;
  missed: number;
  rawDate?: string;
}

export default function BarGraph({ days, range, habitBreakdown, selectedDate, isLoading }: BarGraphProps) {
  const [clickedGroup, setClickedGroup] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setClickedGroup(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="chart-placeholder anim-pulse" style={{ height: 260 }}>
        <div className="today-loading">Loading graph...</div>
      </div>
    );
  }

  if (!days || days.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: 220 }}>
        <span className="empty-text">No data for this range yet.</span>
      </div>
    );
  }

  // Aggregate DayData[] into groups based on range
  const aggregateData = (): BarGroup[] => {
    if (range === '7d' || range === '14d') {
      return days.map((d) => {
        const [y, m, dayNum] = d.date.split('-').map(Number);
        const dateObj = new Date(y, m - 1, dayNum);
        const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const missed = Math.max(0, d.scheduled_count - d.completed_count);
        return {
          label,
          completed: d.completed_count,
          missed,
          rawDate: d.date,
        };
      });
    }

    if (range === '1m' || range === '3m') {
      const weeksMap = new Map<string, { completed: number; missed: number }>();
      days.forEach((d) => {
        const [y, m, dayNum] = d.date.split('-').map(Number);
        const dateObj = new Date(y, m - 1, dayNum);
        const weekNum = Math.ceil(dayNum / 7);
        const weekKey = `${dateObj.toLocaleDateString('en-US', { month: 'short' })} W${weekNum}`;

        const existing = weeksMap.get(weekKey) || { completed: 0, missed: 0 };
        const missed = Math.max(0, d.scheduled_count - d.completed_count);

        weeksMap.set(weekKey, {
          completed: existing.completed + d.completed_count,
          missed: existing.missed + missed,
        });
      });

      return Array.from(weeksMap.entries()).map(([label, vals]) => ({
        label,
        completed: vals.completed,
        missed: vals.missed,
      }));
    }

    // '6m' or '1y' — Aggregate by month
    const monthsMap = new Map<string, { completed: number; missed: number }>();
    days.forEach((d) => {
      const [y, m] = d.date.split('-').map(Number);
      const monthKey = new Date(y, m - 1, 1).toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });

      const existing = monthsMap.get(monthKey) || { completed: 0, missed: 0 };
      const missed = Math.max(0, d.scheduled_count - d.completed_count);

      monthsMap.set(monthKey, {
        completed: existing.completed + d.completed_count,
        missed: existing.missed + missed,
      });
    });

    return Array.from(monthsMap.entries()).map(([label, vals]) => ({
      label,
      completed: vals.completed,
      missed: vals.missed,
    }));
  };

  const groups = aggregateData();
  const maxVal = Math.max(1, ...groups.map((g) => Math.max(g.completed, g.missed)));

  // SVG Chart Geometry Constants
  const svgWidth = 600;
  const svgHeight = 200;
  const chartX = 45;
  const chartY = 15;
  const chartW = 530;
  const chartH = 145;
  const baselineY = chartY + chartH; // y = 160

  const groupWidth = chartW / groups.length;
  const barWidth = Math.max(6, Math.min(18, (groupWidth - 10) / 2));

  // Y-axis gridlines
  const gridTicks = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="auto">
          {/* Horizontal Dashed Gridlines & Y-axis labels */}
          {gridTicks.map((pct, idx) => {
            const yPos = baselineY - pct * chartH;
            const valLabel = Math.round(pct * maxVal);

            return (
              <g key={idx}>
                <line
                  x1={chartX}
                  y1={yPos}
                  x2={chartX + chartW}
                  y2={yPos}
                  stroke="var(--border-subtle)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={chartX - 6}
                  y={yPos + 3}
                  textAnchor="end"
                  fill="var(--text-tertiary)"
                  fontSize="10"
                >
                  {valLabel}
                </text>
              </g>
            );
          })}

          {/* Render Bar Groups */}
          {groups.map((g, idx) => {
            const groupCenterX = chartX + idx * groupWidth + groupWidth / 2;

            const compHeight = Math.max(2, (g.completed / maxVal) * chartH);
            const missHeight = Math.max(2, (g.missed / maxVal) * chartH);

            const compY = baselineY - compHeight;
            const missY = baselineY - missHeight;

            const compX = groupCenterX - barWidth - 1;
            const missX = groupCenterX + 1;

            const isClicked = clickedGroup === idx;
            const isSelectedDate = Boolean(selectedDate && g.rawDate === selectedDate);
            const barOpacity = isSelectedDate || isClicked ? 1 : selectedDate ? 0.35 : 0.85;

            return (
              <g
                key={idx}
                onClick={() => setClickedGroup(idx === clickedGroup ? null : idx)}
                style={{ cursor: 'pointer' }}
              >
                {/* Hitbox */}
                <rect
                  x={chartX + idx * groupWidth}
                  y={chartY}
                  width={groupWidth}
                  height={chartH}
                  fill="transparent"
                />

                {isSelectedDate && (
                  <rect
                    x={chartX + idx * groupWidth + 2}
                    y={chartY}
                    width={groupWidth - 4}
                    height={chartH + 20}
                    fill="rgba(255, 255, 255, 0.06)"
                    rx="4"
                  />
                )}

                {/* Completed Bar (Green) */}
                <rect
                  x={compX}
                  y={compY}
                  width={barWidth}
                  height={compHeight}
                  rx="2"
                  ry="2"
                  fill="var(--success)"
                  opacity={barOpacity}
                  stroke={isSelectedDate ? 'var(--text-primary)' : 'none'}
                  strokeWidth={isSelectedDate ? 1 : 0}
                  style={{ transition: 'opacity var(--dur-fast) var(--ease-out)' }}
                />

                {/* Missed Bar (Red) */}
                <rect
                  x={missX}
                  y={missY}
                  width={barWidth}
                  height={missHeight}
                  rx="2"
                  ry="2"
                  fill="var(--danger)"
                  opacity={barOpacity}
                  stroke={isSelectedDate ? 'var(--text-primary)' : 'none'}
                  strokeWidth={isSelectedDate ? 1 : 0}
                  style={{ transition: 'opacity var(--dur-fast) var(--ease-out)' }}
                />

                {/* X-axis Label */}
                <text
                  x={groupCenterX}
                  y={baselineY + 16}
                  textAnchor="middle"
                  fill="var(--text-secondary)"
                  fontSize="9"
                  transform={
                    range === '7d' || range === '14d'
                      ? `rotate(-25, ${groupCenterX}, ${baselineY + 16})`
                      : undefined
                  }
                >
                  {g.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Click Tooltip — Persistent until dismissed */}
        {clickedGroup !== null && groups[clickedGroup] && (
          <div
            className="heatmap-tooltip"
            style={{
              left: `${((chartX + clickedGroup * groupWidth + groupWidth / 2) / svgWidth) * 100}%`,
              top: '5px',
              bottom: 'auto',
            }}
          >
            {groups[clickedGroup].label}: {groups[clickedGroup].completed} completed, {groups[clickedGroup].missed} missed
          </div>
        )}
      </div>

      {/* Bar Legend */}
      <div className="bar-legend" style={{ justifyContent: 'center' }}>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: 'var(--success)', borderRadius: '2px' }} />
          <span>Completed</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: 'var(--danger)', borderRadius: '2px' }} />
          <span>Missed</span>
        </div>
      </div>
    </div>
  );
}
