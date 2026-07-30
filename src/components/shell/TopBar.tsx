'use client';

import React, { useState } from 'react';
import { useDate } from '../../context/DateContext';
import MiniCalendar from './MiniCalendar';

export default function TopBar() {
  const { selectedDate, isToday } = useDate();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const formattedDate = isToday
    ? 'Today'
    : selectedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

  const toggleCalendar = () => {
    setIsCalendarOpen((prev) => !prev);
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          id="topbar-date-trigger"
          type="button"
          className="topbar-date-btn hoverable-subtle"
          onClick={toggleCalendar}
        >
          <span className="topbar-date-text">{formattedDate}</span>
          <svg
            className={`topbar-chevron ${isCalendarOpen ? 'open' : ''}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {isCalendarOpen && (
          <MiniCalendar onClose={() => setIsCalendarOpen(false)} />
        )}
      </div>

      <div className="topbar-right">
        <button type="button" className="topbar-menu-btn pressable" aria-label="Menu">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </header>
  );
}
