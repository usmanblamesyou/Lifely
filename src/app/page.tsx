'use client';

import React from 'react';
import { useView } from '../context/ViewContext';
import TodayView from '../components/views/TodayView';
import MorningView from '../components/views/MorningView';
import AfternoonView from '../components/views/AfternoonView';
import EveningView from '../components/views/EveningView';
import ProgressView from '../components/views/ProgressView';
import JournalView from '../components/views/JournalView';
import HabitsView from '../components/views/HabitsView';
import SettingsView from '../components/views/SettingsView';

export default function Home() {
  const { activeView } = useView();

  return (
    <>
      {activeView === 'today' && <TodayView />}
      {activeView === 'morning' && <MorningView />}
      {activeView === 'afternoon' && <AfternoonView />}
      {activeView === 'evening' && <EveningView />}
      {activeView === 'progress' && <ProgressView />}
      {activeView === 'journal' && <JournalView />}
      {activeView === 'habits' && <HabitsView />}
      {activeView === 'settings' && <SettingsView />}
    </>
  );
}
