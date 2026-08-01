'use client';

import React from 'react';

interface ThemeColorFieldProps {
  label: string;
  description?: string;
  value: string;
  onChange: (val: string) => void;
}

// Convert rgba/rgb/named/hex to hex 6 format for <input type="color">
function formatToHex(colorStr: string): string {
  if (!colorStr) return '#000000';
  const trimmed = colorStr.trim();
  if (trimmed.startsWith('#')) {
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    if (trimmed.length === 7 || trimmed.length === 9) {
      return trimmed.substring(0, 7);
    }
  }
  // If rgba string e.g. rgba(255, 255, 255, 0.92)
  const match = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (match) {
    const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  return '#1c1c1e';
}

export default function ThemeColorField({
  label,
  description,
  value,
  onChange,
}: ThemeColorFieldProps) {
  const hexVal = formatToHex(value);

  return (
    <div className="theme-color-field">
      <div className="theme-color-label-group">
        <span className="theme-color-label">{label}</span>
        {description && <span className="theme-color-desc">{description}</span>}
      </div>

      <div className="theme-color-controls">
        <div className="theme-color-swatch-wrapper" style={{ backgroundColor: value }}>
          <input
            type="color"
            value={hexVal}
            onChange={(e) => onChange(e.target.value)}
            className="theme-color-picker-input"
            title={`Pick ${label}`}
          />
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="form-input theme-hex-input"
          placeholder="#000000 or rgba(...)"
        />
      </div>
    </div>
  );
}
