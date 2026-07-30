'use client';

import React, { useEffect, useState } from 'react';

interface DbInfo {
  db_path: string;
  db_size_bytes: number;
  habit_count: number;
  task_count: number;
  log_count: number;
  journal_count: number;
  export_available: boolean;
}

export default function SettingsPage() {
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [confirmInput, setConfirmInput] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [clearFeedback, setClearFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchDbInfo = async () => {
    setIsLoadingInfo(true);
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.settings) {
        const info = await window.electronAPI.settings.getDatabaseInfo();
        setDbInfo(info);
      }
    } catch (err) {
      console.error('Failed to fetch database info:', err);
    } finally {
      setIsLoadingInfo(false);
    }
  };

  useEffect(() => {
    fetchDbInfo();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleExport = async () => {
    setActionFeedback(null);
    setIsExporting(true);
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.settings) {
        const res = await window.electronAPI.settings.exportData();
        if (res.success && res.path) {
          setActionFeedback({
            type: 'success',
            message: `Data exported successfully to ${res.path}`,
          });
        } else if (res.error) {
          setActionFeedback({ type: 'error', message: res.error });
        }
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Export failed',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setActionFeedback(null);
    setIsImporting(true);
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.settings) {
        const res = await window.electronAPI.settings.importData();
        if (res.success) {
          setActionFeedback({
            type: 'success',
            message: 'Data imported successfully! All records restored.',
          });
          await fetchDbInfo();
        } else if (res.error) {
          setActionFeedback({ type: 'error', message: res.error });
        }
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Import failed',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleBackup = async () => {
    setActionFeedback(null);
    setIsBackingUp(true);
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.settings) {
        const res = await window.electronAPI.settings.backupDatabase();
        if (res.success && res.path) {
          setActionFeedback({
            type: 'success',
            message: `Database backup created successfully at ${res.path}`,
          });
        } else if (res.error) {
          setActionFeedback({ type: 'error', message: res.error });
        }
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Backup failed',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleClearData = async () => {
    setClearFeedback(null);
    setIsClearing(true);
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.settings) {
        const res = await window.electronAPI.settings.clearAllData(confirmInput);
        if (res.success) {
          setClearFeedback({
            type: 'success',
            message: 'All data cleared successfully. Database is clean.',
          });
          setConfirmInput('');
          await fetchDbInfo();
        } else if (res.error) {
          setClearFeedback({ type: 'error', message: res.error });
        }
      }
    } catch (err: any) {
      setClearFeedback({
        type: 'error',
        message: err.message || 'Failed to clear data',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleOpenFolder = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.settings) {
      await window.electronAPI.settings.openDbFolder();
    }
  };

  return (
    <div className="settings-page">
      <div className="today-header">
        <div>
          <h2 className="today-title">Settings</h2>
          <div className="sub-label">Manage data, backups, and system info</div>
        </div>
      </div>

      {/* --- Section 1: Data Management --- */}
      <div className="settings-section">
        <div className="settings-section-title">Data Management</div>

        {isLoadingInfo ? (
          <div className="today-loading">Loading database info...</div>
        ) : dbInfo ? (
          <div className="db-info-card">
            <div className="db-info-row">
              <span className="db-info-label">Database Path</span>
              <span className="db-info-value">{dbInfo.db_path}</span>
            </div>
            <div className="db-info-row">
              <span className="db-info-label">File Size</span>
              <span className="db-info-value">{formatFileSize(dbInfo.db_size_bytes)}</span>
            </div>
            <div className="db-info-row" style={{ paddingTop: '0.25rem' }}>
              <span className="db-info-label">Record Summary</span>
              <span className="db-info-value" style={{ fontFamily: 'inherit' }}>
                Habits: <strong>{dbInfo.habit_count}</strong> &nbsp;•&nbsp; Tasks:{' '}
                <strong>{dbInfo.task_count}</strong> &nbsp;•&nbsp; Logs:{' '}
                <strong>{dbInfo.log_count}</strong> &nbsp;•&nbsp; Journal Entries:{' '}
                <strong>{dbInfo.journal_count}</strong>
              </span>
            </div>
          </div>
        ) : null}

        <div className="settings-actions-row">
          <button
            type="button"
            className="btn-primary pressable"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export Data'}
          </button>
          <button
            type="button"
            className="btn-secondary pressable"
            onClick={handleImport}
            disabled={isImporting}
          >
            {isImporting ? 'Importing...' : 'Import Data'}
          </button>
          <button
            type="button"
            className="btn-secondary pressable"
            onClick={handleBackup}
            disabled={isBackingUp}
          >
            {isBackingUp ? 'Backing Up...' : 'Backup Database'}
          </button>
        </div>

        {actionFeedback && (
          <div className={`settings-feedback ${actionFeedback.type}`}>
            {actionFeedback.message}
          </div>
        )}
      </div>

      {/* --- Section 2: Danger Zone --- */}
      <div className="settings-section">
        <div className="settings-section-title" style={{ color: 'var(--danger)' }}>
          Danger Zone
        </div>
        <div className="danger-zone">
          <div className="danger-zone-title">Clear All Data</div>
          <div className="danger-zone-desc">
            Permanently delete all habits, tasks, logs, and journal entries. This cannot be
            undone.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="form-label" htmlFor="confirm-delete-input">
              Type <code style={{ color: 'var(--danger)' }}>DELETE ALL MY DATA</code> to confirm:
            </label>
            <input
              id="confirm-delete-input"
              type="text"
              className="form-input"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="DELETE ALL MY DATA"
            />
          </div>

          <div>
            <button
              type="button"
              className="btn-primary text-danger pressable"
              style={{
                background: confirmInput === 'DELETE ALL MY DATA' ? 'var(--danger)' : 'var(--bg-elevated)',
                color: confirmInput === 'DELETE ALL MY DATA' ? '#ffffff' : 'var(--text-tertiary)',
                borderColor: confirmInput === 'DELETE ALL MY DATA' ? 'var(--danger)' : 'var(--border-subtle)',
                opacity: confirmInput === 'DELETE ALL MY DATA' ? 1 : 0.6,
                cursor: confirmInput === 'DELETE ALL MY DATA' ? 'pointer' : 'not-allowed',
              }}
              disabled={confirmInput !== 'DELETE ALL MY DATA' || isClearing}
              onClick={handleClearData}
            >
              {isClearing ? 'Clearing...' : 'Clear All Data'}
            </button>
          </div>

          {clearFeedback && (
            <div className={`settings-feedback ${clearFeedback.type}`}>
              {clearFeedback.message}
            </div>
          )}
        </div>
      </div>

      {/* --- Section 3: About --- */}
      <div className="settings-section">
        <div className="settings-section-title">About</div>
        <div className="about-section">
          <div className="about-row">
            <span className="db-info-label">Application Name</span>
            <span className="db-info-value" style={{ fontFamily: 'inherit' }}>Lifely</span>
          </div>
          <div className="about-row">
            <span className="db-info-label">Version</span>
            <span className="db-info-value">0.1.0</span>
          </div>
          <div className="about-row">
            <span className="db-info-label">Built By</span>
            <span className="db-info-value" style={{ fontFamily: 'inherit' }}>Aevo Labs</span>
          </div>
          <div className="about-row">
            <span className="db-info-label">Database Folder</span>
            <button
              type="button"
              className="about-link"
              onClick={handleOpenFolder}
              title="Open folder in File Explorer"
            >
              {dbInfo ? dbInfo.db_path : 'Open folder in File Explorer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
