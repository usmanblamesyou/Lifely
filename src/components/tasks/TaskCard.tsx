'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskStatus } from '../../types/task';

interface TaskCardProps {
  task: Task;
  dateString: string;
  index?: number;
}

export default function TaskCard({
  task,
  dateString,
  index = 0,
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

  useEffect(() => {
    setLocalStatus(calculateEffectiveStatus(task));
    setErrorMessage(null);
  }, [task, dateString]);

  const handleStatusClick = async (clickedStatus: TaskStatus) => {
    setErrorMessage(null);

    const targetStatus: TaskStatus =
      localStatus === clickedStatus ? 'pending' : clickedStatus;

    // 1. Save previous status
    const previousStatus = localStatus;

    // 2. Optimistic UI update
    setLocalStatus(targetStatus);

    // 3. Pulse animation state
    if (targetStatus !== 'pending') {
      setPulsingStatus(targetStatus);
      setTimeout(() => setPulsingStatus(null), 120);
    }

    // 4. Background IPC Call
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.tasks) {
        const result = await window.electronAPI.tasks.updateStatus({
          task_id: task.id,
          status: targetStatus,
          date: dateString,
        });

        // 5. Update with confirmed result
        if (result) {
          setLocalStatus(calculateEffectiveStatus(result));
        }
      }
    } catch (err) {
      console.error('Failed to update task status:', err);
      // 6. Revert state on failure
      setLocalStatus(previousStatus);
      setErrorMessage('Failed to update task');
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

  return (
    <div className={`task-card hoverable anim-fade-slide-up ${delayClass}`}>
      <div className="task-card-header">
        <div className="task-title-container">
          <h3 className="task-title">{task.title}</h3>

          {task.priority && (
            <span className={`priority-badge ${task.priority}`}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
          )}

          {repeatLabel && <span className="task-repeat-badge">{repeatLabel}</span>}
        </div>

        {task.due_time && (
          <div className="task-due-time">
            🕒 {task.due_time}
          </div>
        )}
      </div>

      {task.notes && <p className="task-notes">{task.notes}</p>}

      <div className="task-completion-container">
        {errorMessage && <div className="card-error-text">{errorMessage}</div>}

        <div className={`completion-btn-group ${hasActive ? 'has-active' : ''}`}>
          <button
            type="button"
            className={`completion-btn complete pressable ${
              localStatus === 'completed' ? 'active' : ''
            } ${pulsingStatus === 'completed' ? 'pulse-anim' : ''}`}
            onClick={() => handleStatusClick('completed')}
          >
            {localStatus === 'completed' ? '✓ Done' : 'Complete'}
          </button>

          <button
            type="button"
            className={`completion-btn skip pressable ${
              localStatus === 'skipped' ? 'active' : ''
            } ${pulsingStatus === 'skipped' ? 'pulse-anim' : ''}`}
            onClick={() => handleStatusClick('skipped')}
          >
            Skip
          </button>
        </div>
      </div>

      {task.checklist_json && task.checklist_json.length > 0 && (
        <div className="task-checklist">
          <div className="task-checklist-title">Checklist:</div>
          <ul className="task-checklist-list">
            {task.checklist_json.map((item, idx) => (
              <li key={idx} className="task-checklist-item">
                <span className="checklist-bullet">•</span>
                <span className="checklist-label">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
