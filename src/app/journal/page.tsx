'use client';

import React, { useEffect, useState } from 'react';
import { useDate } from '../../context/DateContext';
import { JournalEntry } from '../../types/journal';
import JournalEntryCard from '../../components/journal/JournalEntryCard';

function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function JournalPage() {
  const { selectedDate } = useDate();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newlyCreatedId, setNewlyCreatedId] = useState<number | null>(null);

  const selectedDateStr = formatDateIso(selectedDate);

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.journal) {
        const res = await window.electronAPI.journal.getForDate(selectedDateStr);
        setEntries(res || []);
      }
    } catch (err) {
      console.error('Failed to fetch journal entries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [selectedDateStr]);

  const handleCreateEntry = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.journal) {
      const created = await window.electronAPI.journal.createEntry(selectedDateStr);
      setNewlyCreatedId(created.id);
      setEntries((prev) => [...prev, created]);
    }
  };

  const handleUpdateEntry = (updated: JournalEntry) => {
    setEntries((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  const handleDeleteEntry = (id: number) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const formatDateDisplay = (dateObj: Date) => {
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="journal-page">
      <div className="today-header">
        <div>
          <h2 className="today-title">Journal</h2>
          <div className="sub-label">{formatDateDisplay(selectedDate)}</div>
        </div>
        <button
          type="button"
          className="btn-primary pressable"
          onClick={handleCreateEntry}
        >
          + New Entry
        </button>
      </div>

      <div className="journal-entries-list">
        {isLoading ? (
          <div className="today-loading">Loading entries...</div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <span className="empty-text">
              No journal entries for this date. Click "+ New Entry" to begin writing.
            </span>
          </div>
        ) : (
          entries.map((entry) => (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
              onUpdate={handleUpdateEntry}
              onDelete={handleDeleteEntry}
              initialIsEditing={newlyCreatedId === entry.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
