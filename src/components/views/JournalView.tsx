import React, { useEffect, useState } from 'react';
import { useDate } from '../../context/DateContext';
import { JournalEntry } from '../../types/journal';
import JournalEntryCard from '../journal/JournalEntryCard';

function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function JournalView() {
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
          <h2 className="today-title text-title">Journal</h2>
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
          <div className="skeleton-card">
            <div className="skeleton-line" style={{ width: '30%' }} />
            <div className="skeleton-line" style={{ width: '85%' }} />
            <div className="skeleton-line" style={{ width: '60%' }} />
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-state-improved">
            <div className="empty-state-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                <line x1="9" y1="7" x2="15" y2="7"/>
                <line x1="9" y1="11" x2="13" y2="11"/>
              </svg>
            </div>
            <div className="empty-state-headline">No entries for this day</div>
            <div className="empty-state-subtitle">Click + New Entry to start writing.</div>
            <button
              type="button"
              className="btn-primary pressable"
              style={{ marginTop: '0.25rem' }}
              onClick={handleCreateEntry}
            >
              + New Entry
            </button>
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
