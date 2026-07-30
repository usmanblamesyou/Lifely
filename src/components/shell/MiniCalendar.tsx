'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDate, isSameDay, normalizeToMidnight } from '../../context/DateContext';

interface MiniCalendarProps {
  onClose: () => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function MiniCalendar({ onClose }: MiniCalendarProps) {
  const { selectedDate, setSelectedDate } = useDate();
  const calendarRef = useRef<HTMLDivElement>(null);

  const [viewYear, setViewYear] = useState<number>(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(selectedDate.getMonth());

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        const triggerEl = document.getElementById('topbar-date-trigger');
        if (triggerEl && triggerEl.contains(event.target as Node)) {
          return;
        }
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const today = normalizeToMidnight(new Date());

  const handleSelectDay = (day: number) => {
    const targetDate = new Date(viewYear, viewMonth, day);
    setSelectedDate(targetDate);
    onClose();
  };

  return (
    <div ref={calendarRef} className="mini-calendar-dropdown anim-slide-down">
      <div className="mini-calendar-header">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="mini-calendar-nav-btn pressable"
          aria-label="Previous month"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="mini-calendar-title">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="mini-calendar-nav-btn pressable"
          aria-label="Next month"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="mini-calendar-grid">
        {WEEKDAYS.map((day) => (
          <div key={day} className="mini-calendar-weekday">
            {day}
          </div>
        ))}

        {Array.from({ length: firstDayOfWeek }).map((_, index) => (
          <div key={`empty-${index}`} className="mini-calendar-day empty" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const currentDate = new Date(viewYear, viewMonth, day);
          const isSelected = isSameDay(currentDate, selectedDate);
          const isCurrentToday = isSameDay(currentDate, today);

          let dayClassName = 'mini-calendar-day pressable';
          if (isSelected) {
            dayClassName += ' selected';
          } else if (isCurrentToday) {
            dayClassName += ' today';
          }

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleSelectDay(day)}
              className={dayClassName}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
