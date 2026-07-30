'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';

interface DateContextType {
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  isToday: boolean;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export function normalizeToMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function DateProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDateState] = useState<Date>(() =>
    normalizeToMidnight(new Date())
  );

  const setSelectedDate = (d: Date) => {
    setSelectedDateState(normalizeToMidnight(d));
  };

  const isToday = useMemo(() => {
    const today = new Date();
    return isSameDay(selectedDate, today);
  }, [selectedDate]);

  return (
    <DateContext.Provider value={{ selectedDate, setSelectedDate, isToday }}>
      {children}
    </DateContext.Provider>
  );
}

export function useDate(): DateContextType {
  const context = useContext(DateContext);
  if (!context) {
    throw new Error('useDate must be used within a DateProvider');
  }
  return context;
}
