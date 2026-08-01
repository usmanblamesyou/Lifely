'use client';

import React from 'react';

const PRESET_COLORS: { name: string; value: string | null }[] = [
  { name: 'Default', value: null },
  { name: 'Graphite', value: '#8E8E93' },
  { name: 'Blue', value: '#0A84FF' },
  { name: 'Green', value: '#32D74B' },
  { name: 'Amber', value: '#FF9F0A' },
  { name: 'Red', value: '#FF453A' },
  { name: 'Pink', value: '#FF375F' },
  { name: 'Purple', value: '#BF5AF2' },
  { name: 'Cyan', value: '#5AC8F5' },
];

interface ColorPickerProps {
  value: string | null;
  onChange: (color: string | null) => void;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      {PRESET_COLORS.map((c) => {
        const isSelected = value === c.value;
        return (
          <button
            key={c.name}
            type="button"
            title={c.name}
            onClick={() => onChange(c.value)}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: isSelected
                ? '2px solid var(--text-primary)'
                : '2px solid transparent',
              outline: isSelected
                ? '2px solid var(--border-strong)'
                : '2px solid transparent',
              outlineOffset: 1,
              background: c.value ?? 'transparent',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isSelected ? '0 0 0 1px rgba(255,255,255,0.3)' : 'none',
              transition: 'outline 0.12s, border-color 0.12s',
            }}
          >
            {c.value === null && (
              /* Default: circle with diagonal slash */
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                <line x1="2" y1="12" x2="12" y2="2" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
