'use client';

import React, { useState } from 'react';
import { SummaryStats, HabitBreakdown } from '../../types/progress';

interface PieChartProps {
  summary: SummaryStats;
  habitBreakdown: HabitBreakdown[];
  isLoading?: boolean;
}

export default function PieChart({ summary, habitBreakdown, isLoading }: PieChartProps) {
  const [activeSegment, setActiveSegment] = useState<'completed' | 'missed' | 'skipped' | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  if (isLoading) {
    return (
      <div className="chart-placeholder anim-pulse" style={{ height: 260 }}>
        <div className="today-loading">Loading chart...</div>
      </div>
    );
  }

  const completed = summary.total_completed || 0;
  const skipped = habitBreakdown.reduce((acc, h) => acc + (h.days_skipped || 0), 0);
  const missed = Math.max(0, (summary.total_scheduled || 0) - completed - skipped);
  const total = completed + missed + skipped;

  if (total === 0) {
    return (
      <div className="empty-state" style={{ minHeight: 220 }}>
        <span className="empty-text">No data for this range yet.</span>
      </div>
    );
  }

  const segments = [
    { key: 'completed' as const, label: 'Completed', count: completed, color: 'var(--success)' },
    { key: 'missed' as const, label: 'Missed', count: missed, color: 'var(--danger)' },
    { key: 'skipped' as const, label: 'Skipped', count: skipped, color: 'var(--warning)' },
  ];

  // SVG Arc Math Helper Functions
  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    // Prevent 360 degree arc overlap issue
    const effectiveEndAngle = endAngle - startAngle >= 360 ? startAngle + 359.999 : endAngle;
    const start = polarToCartesian(cx, cy, r, effectiveEndAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = effectiveEndAngle - startAngle <= 180 ? '0' : '1';

    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  let currentAngle = 0;
  const arcSegments = segments.map((seg) => {
    const percentage = seg.count / total;
    const angleSpan = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleSpan;
    currentAngle = endAngle;

    return {
      ...seg,
      percentage,
      startAngle,
      endAngle,
    };
  });

  const overallPct = Math.round(summary.average_completion_rate * 100);

  // Drill-down data calculation
  const getDrillDownHabits = () => {
    if (!activeSegment) return [];
    const list = habitBreakdown
      .map((h) => {
        let count = 0;
        if (activeSegment === 'completed') count = h.days_completed;
        else if (activeSegment === 'missed') count = h.days_missed;
        else if (activeSegment === 'skipped') count = h.days_skipped;
        return { name: h.habit_name, count };
      })
      .filter((item) => item.count > 0);

    return list.sort((a, b) => (sortAsc ? a.count - b.count : b.count - a.count));
  };

  const drillDownList = getDrillDownHabits();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <svg viewBox="0 0 200 200" width="200" height="200">
          {/* Default hole background */}
          <circle cx="100" cy="100" r="65" fill="none" stroke="var(--bg-elevated)" strokeWidth="30" />

          {/* Render Donut Segment Arcs */}
          {arcSegments.map((seg) => {
            if (seg.count === 0) return null;
            const isActive = activeSegment === seg.key;
            const strokeWidth = isActive ? 36 : 30;

            return (
              <path
                key={seg.key}
                d={describeArc(100, 100, 65, seg.startAngle, seg.endAngle)}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                style={{
                  cursor: 'pointer',
                  transition: 'stroke-width var(--dur-fast) var(--ease-spring)',
                }}
                onClick={() => setActiveSegment(activeSegment === seg.key ? null : seg.key)}
              />
            );
          })}

          {/* Donut Center Text */}
          <text x="100" y="96" textAnchor="middle" fill="#ffffff" fontSize="24" fontWeight="800">
            {overallPct}%
          </text>
          <text x="100" y="112" textAnchor="middle" fill="var(--text-secondary)" fontSize="10">
            completion
          </text>
        </svg>
      </div>

      {/* Segment Legend */}
      <div className="pie-legend" style={{ justifyContent: 'center' }}>
        {segments.map((seg) => {
          const isActive = activeSegment === seg.key;
          return (
            <div
              key={seg.key}
              className="legend-item pressable"
              style={{
                cursor: 'pointer',
                fontWeight: isActive ? 700 : 400,
                opacity: activeSegment && !isActive ? 0.5 : 1,
              }}
              onClick={() => setActiveSegment(activeSegment === seg.key ? null : seg.key)}
            >
              <span className="legend-dot" style={{ backgroundColor: seg.color }} />
              <span>
                {seg.label} ({seg.count})
              </span>
            </div>
          );
        })}
      </div>

      {/* Segment Drill-Down List */}
      {activeSegment && (
        <div className="pie-drill-down anim-slide-down">
          <div className="flex-between mb-2">
            <span className="recap-section-title" style={{ margin: 0, textTransform: 'capitalize' }}>
              {activeSegment} Breakdown
            </span>
            <button
              type="button"
              className="add-sub-btn"
              onClick={() => setSortAsc(!sortAsc)}
              style={{ fontSize: '0.75rem' }}
            >
              Sort: {sortAsc ? 'Ascending ↑' : 'Descending ↓'}
            </button>
          </div>

          {drillDownList.length === 0 ? (
            <div className="sub-label" style={{ textAlign: 'center', padding: '0.5rem' }}>
              No habits with {activeSegment} days.
            </div>
          ) : (
            drillDownList.map((item, idx) => (
              <div key={idx} className="drill-down-row">
                <span className="drill-down-name">{item.name}</span>
                <span>
                  {item.count} {item.count === 1 ? 'day' : 'days'}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
