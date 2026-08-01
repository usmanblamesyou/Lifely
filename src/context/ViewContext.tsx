'use client';

import React, { createContext, useContext, useState } from 'react';

export type ActiveView =
  | 'today'
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'progress'
  | 'journal'
  | 'habits'
  | 'settings';

interface ViewContextType {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState<ActiveView>('today');

  return (
    <ViewContext.Provider value={{ activeView, setActiveView }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
}
