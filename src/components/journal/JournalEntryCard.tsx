'use client';

import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, MOOD_OPTIONS, MoodType } from '../../types/journal';

interface JournalEntryCardProps {
  entry: JournalEntry;
  onUpdate: (updated: JournalEntry) => void;
  onDelete: (id: number) => void;
  initialIsEditing?: boolean;
}

export default function JournalEntryCard({
  entry,
  onUpdate,
  onDelete,
  initialIsEditing = false,
}: JournalEntryCardProps) {
  const [isEditing, setIsEditing] = useState(
    initialIsEditing || (!entry.ended_at && entry.content === '')
  );
  const [content, setContent] = useState(entry.content || '');
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(entry.mood || null);

  // Session-only unlock state
  const [unlockedInSession, setUnlockedInSession] = useState(false);

  // Lock flow state
  const [isLocking, setIsLocking] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Unlock flow state
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Delete flow state
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce save ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setContent(entry.content || '');
    setSelectedMood(entry.mood || null);
  }, [entry]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const formatTime = (iso: string | null) => {
    if (!iso) return 'In progress';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  // Perform backend update for content auto-save
  const performSave = async (newContent: string) => {
    if (typeof window !== 'undefined' && window.electronAPI?.journal) {
      const updated = await window.electronAPI.journal.updateEntry({
        id: entry.id,
        content: newContent,
      });
      onUpdate(updated);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      performSave(val);
    }, 500);
  };

  const handleMoodSelect = async (moodValue: MoodType) => {
    setSelectedMood(moodValue);
    if (typeof window !== 'undefined' && window.electronAPI?.journal) {
      const updated = await window.electronAPI.journal.updateEntry({
        id: entry.id,
        mood: moodValue,
      });
      onUpdate(updated);
    }
  };

  // Done button handler - FLUSH DEBOUNCE and set ended_at
  const handleDone = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (typeof window !== 'undefined' && window.electronAPI?.journal) {
      const updated = await window.electronAPI.journal.updateEntry({
        id: entry.id,
        content,
        ended_at: new Date().toISOString(),
      });
      onUpdate(updated);
    }
    setIsEditing(false);
  };

  // Lock flow
  const handleLockEntry = async () => {
    setPinError(null);
    if (!pinInput || pinInput.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    if (pinInput !== confirmPinInput) {
      setPinError('PINs do not match');
      return;
    }

    if (typeof window !== 'undefined' && window.electronAPI?.journal) {
      const updated = await window.electronAPI.journal.lockEntry({
        id: entry.id,
        pin: pinInput,
      });
      onUpdate(updated);
      setIsLocking(false);
      setPinInput('');
      setConfirmPinInput('');
    }
  };

  // Unlock flow
  const handleUnlockEntry = async () => {
    setUnlockError(null);
    if (!unlockPinInput) {
      setUnlockError('Incorrect PIN');
      return;
    }

    if (typeof window !== 'undefined' && window.electronAPI?.journal) {
      const res = await window.electronAPI.journal.unlockEntry({
        id: entry.id,
        pin: unlockPinInput,
      });

      if (res.success && res.entry) {
        setUnlockedInSession(true);
        setIsUnlocking(false);
        setUnlockPinInput('');
        onUpdate(res.entry);
      } else {
        setUnlockError('Incorrect PIN');
      }
    }
  };

  // Delete flow
  const handleDeleteEntry = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.journal) {
      await window.electronAPI.journal.deleteEntry(entry.id);
      onDelete(entry.id);
    }
  };

  const getMoodEmoji = (mood: MoodType | null) => {
    const found = MOOD_OPTIONS.find((m) => m.value === mood);
    return found ? found.emoji : '○';
  };

  // 1. LOCKED MODE (Persistent lock, not unlocked in this session)
  if (entry.is_locked && !unlockedInSession) {
    return (
      <div className="journal-entry-card locked">
        <div className="locked-state">
          <span className="locked-icon">🔒</span>
          <div>
            <div className="journal-entry-time">{formatTime(entry.started_at)}</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              This entry is locked.
            </div>
          </div>
        </div>

        {isUnlocking ? (
          <div className="journal-pin-panel anim-slide-down">
            <p>Enter 4-digit PIN to unlock:</p>
            <input
              type="password"
              className="pin-input"
              maxLength={6}
              value={unlockPinInput}
              onChange={(e) => setUnlockPinInput(e.target.value)}
              placeholder="••••"
              autoFocus
            />
            {unlockError && <div className="pin-error">{unlockError}</div>}
            <div className="habit-inline-confirm-buttons">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setIsUnlocking(false);
                  setUnlockError(null);
                  setUnlockPinInput('');
                }}
              >
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleUnlockEntry}>
                Unlock
              </button>
            </div>
          </div>
        ) : (
          <div className="journal-entry-actions">
            <button
              type="button"
              className="journal-action-btn pressable"
              onClick={() => setIsUnlocking(true)}
            >
              Unlock
            </button>
          </div>
        )}
      </div>
    );
  }

  // 2. EDITING MODE
  if (isEditing) {
    return (
      <div className="journal-entry-card editing">
        <div className="journal-entry-header flex-between">
          <div className="journal-entry-time">
            {formatTime(entry.started_at)} — {formatTime(entry.ended_at)}
          </div>
        </div>

        {/* Mood Picker Row */}
        <div className="mood-picker">
          {MOOD_OPTIONS.map((m) => {
            const isActive = selectedMood === m.value;
            return (
              <button
                key={m.value}
                type="button"
                className={`mood-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleMoodSelect(m.value)}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Textarea for Journal Content */}
        <textarea
          ref={textareaRef}
          className="journal-textarea"
          value={content}
          onChange={handleContentChange}
          placeholder="Write your thoughts..."
        />

        <div className="flex-between" style={{ paddingTop: '0.25rem' }}>
          <div className="sub-label">Auto-saving...</div>
          <button type="button" className="btn-primary pressable" onClick={handleDone}>
            Done
          </button>
        </div>
      </div>
    );
  }

  // 3. VIEWING MODE
  return (
    <div className="journal-entry-card">
      <div className="journal-entry-header">
        <span className="journal-entry-mood">{getMoodEmoji(entry.mood)}</span>
        <span className="journal-entry-time">
          {formatTime(entry.started_at)} — {formatTime(entry.ended_at)}
        </span>
      </div>

      <div className="journal-entry-preview journal-content">
        {entry.content && entry.content.trim().length > 0 ? (
          entry.content
        ) : (
          <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            No text content recorded.
          </span>
        )}
      </div>

      {/* Lock Setup Inline Panel */}
      {isLocking && (
        <div className="journal-pin-panel anim-slide-down">
          <p>Set a PIN to lock this entry:</p>
          <div className="form-row">
            <input
              type="password"
              className="pin-input"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="PIN"
              autoFocus
            />
            <input
              type="password"
              className="pin-input"
              maxLength={6}
              value={confirmPinInput}
              onChange={(e) => setConfirmPinInput(e.target.value)}
              placeholder="Confirm PIN"
            />
          </div>
          {pinError && <div className="pin-error">{pinError}</div>}
          <div className="habit-inline-confirm-buttons">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setIsLocking(false);
                setPinError(null);
                setPinInput('');
                setConfirmPinInput('');
              }}
            >
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={handleLockEntry}>
              Lock Entry
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Inline Panel */}
      {isDeleting && (
        <div className="habit-inline-confirm anim-slide-down">
          <p>Delete this entry? This cannot be undone.</p>
          <div className="habit-inline-confirm-buttons">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsDeleting(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary text-danger"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--danger)' }}
              onClick={handleDeleteEntry}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Default Action Buttons */}
      {!isLocking && !isDeleting && (
        <div className="journal-action-btn-group" style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="journal-action-btn pressable"
            onClick={() => setIsLocking(true)}
          >
            Lock
          </button>
          <button
            type="button"
            className="journal-action-btn pressable"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </button>
          <button
            type="button"
            className="journal-action-btn danger pressable"
            onClick={() => setIsDeleting(true)}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
