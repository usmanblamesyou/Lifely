'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskStatus } from '../../types/task';

interface TaskCardProps {
  task: Task;
  dateString: string;
  index?: number;
  onDelete?: (id: number) => void;
  onEdit?: (task: Task) => void;
  // Drag props
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

function DragHandle() {
  return (
    <span className="drag-handle" title="Drag to reorder">
      <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
        <circle cx="3" cy="3" r="1.5" />
        <circle cx="9" cy="3" r="1.5" />
        <circle cx="3" cy="8" r="1.5" />
        <circle cx="9" cy="8" r="1.5" />
        <circle cx="3" cy="13" r="1.5" />
        <circle cx="9" cy="13" r="1.5" />
      </svg>
    </span>
  );
}

export default function TaskCard({
  task,
  dateString,
  index = 0,
  onDelete,
  onEdit,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging = false,
}: TaskCardProps) {
  const delayClass = index < 5 ? `anim-delay-${(index % 5) + 1}` : '';

  const calculateEffectiveStatus = (t: Task): TaskStatus => {
    if (t.repeat_type && t.repeat_type !== 'none') {
      if (t.last_completed_date === dateString) return 'completed';
      if (t.last_skipped_date === dateString) return 'skipped';
      return 'pending';
    }
    return t.status || 'pending';
  };

  const [localStatus, setLocalStatus] = useState<TaskStatus>(
    calculateEffectiveStatus(task)
  );
  const [pulsingStatus, setPulsingStatus] = useState<TaskStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    setLocalStatus(calculateEffectiveStatus(task));
    setErrorMessage(null);
  }, [task, dateString]);

  const handleStatusClick = async (clickedStatus: TaskStatus) => {
    setErrorMessage(null);
    const targetStatus: TaskStatus = localStatus === clickedStatus ? 'pending' : clickedStatus;
    const previousStatus = localStatus;
    setLocalStatus(targetStatus);

    if (targetStatus !== 'pending') {
      setPulsingStatus(targetStatus);
      setTimeout(() => setPulsingStatus(null), 120);
    }

    try {
      if (typeof window !== 'undefined' && window.electronAPI?.tasks) {
        const result = await window.electronAPI.tasks.updateStatus({
          task_id: task.id,
          status: targetStatus,
          date: dateString,
        });
        if (result) setLocalStatus(calculateEffectiveStatus(result));
      }
    } catch (err) {
      console.error('Failed to update task status:', err);
      setLocalStatus(previousStatus);
      setErrorMessage('Failed to update task');
    }
  };

  const handleDelete = async () => {
    setIsMenuOpen(false);
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.tasks?.delete) {
        await window.electronAPI.tasks.delete(task.id);
        if (onDelete) onDelete(task.id);
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const hasActive = localStatus !== 'pending';

  const getRepeatLabel = (repeatType: string) => {
    if (repeatType === 'daily') return '↻ Daily';
    if (repeatType === 'weekly') return '↻ Weekly';
    if (repeatType === 'monthly') return '↻ Monthly';
    return null;
  };

  const repeatLabel = getRepeatLabel(task.repeat_type);

  const cardStyle: React.CSSProperties = {};
  if (task.color) {
    cardStyle.borderLeft = `3px solid ${task.color}`;
  }

  return (
    <div
      className={`task-card hoverable anim-fade-slide-up ${delayClass} ${isDragging ? 'dragging' : ''}`}
      style={{ position: 'relative', ...cardStyle }}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {draggable && <DragHandle />}

      <div className="task-card-body">
        <div className="task-card-header">
          <div className="task-title-container">
            <h3 className="task-title">{task.title}</h3>

            {task.priority && (
              <span className={`priority-badge ${task.priority}`}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </span>
            )}

            {repeatLabel && (
              <span className="repeat-type-badge">{repeatLabel}</span>
            )}

            {task.due_time && (
              <span className="task-time-chip">⏰ {task.due_time}</span>
            )}
          </div>
        </div>

        {task.notes && <p className="task-notes" style={{ margin: 0 }}>{task.notes}</p>}

        <div className="task-action-row">
          {errorMessage && <div className="card-error-text" style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '4px' }}>{errorMessage}</div>}

          <div className={`completion-btn-group ${hasActive ? 'has-active' : ''}`}>
            <button
              type="button"
              className={`completion-btn complete ${localStatus === 'completed' ? 'active' : ''} ${
                pulsingStatus === 'completed' ? 'pulse-success' : ''
              }`}
              onClick={() => handleStatusClick('completed')}
            >
              Complete
            </button>
            <button
              type="button"
              className={`completion-btn skip ${localStatus === 'skipped' ? 'active' : ''} ${
                pulsingStatus === 'skipped' ? 'pulse-neutral' : ''
              }`}
              onClick={() => handleStatusClick('skipped')}
            >
              Skip
            </button>
          </div>
        </div>

        {isConfirmingDelete && (
          <div
            className="inline-delete-confirm anim-fade-in"
            style={{
              marginTop: '8px', padding: '8px 12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--danger)',
              borderRadius: '6px', fontSize: '0.85rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              Delete this task? This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary pressable"
                style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                onClick={() => setIsConfirmingDelete(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary pressable"
                style={{ padding: '2px 8px', fontSize: '0.8rem', background: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ⋯ Action Menu */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className="task-menu-btn pressable"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-tertiary)', fontSize: '1.2rem',
            cursor: 'pointer', padding: '0 4px',
          }}
          title="Options"
        >
          ⋯
        </button>

        {isMenuOpen && (
          <div
            className="task-menu-dropdown anim-fade-in"
            style={{
              position: 'absolute', top: '100%', right: 0,
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px', padding: '4px 0',
              zIndex: 20, minWidth: '100px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            {onEdit && (
              <button
                type="button"
                className="task-menu-item"
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '6px 12px', background: 'none', border: 'none',
                  color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer',
                }}
                onClick={() => { setIsMenuOpen(false); onEdit(task); }}
              >
                Edit
              </button>
            )}
            <button
              type="button"
              className="task-menu-item text-danger"
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '6px 12px', background: 'none', border: 'none',
                color: 'var(--danger)', fontSize: '0.85rem', cursor: 'pointer',
              }}
              onClick={() => {
                setIsMenuOpen(false);
                setIsConfirmingDelete(true);
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
