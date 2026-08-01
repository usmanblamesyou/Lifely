'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light' | 'custom';

export interface ThemeColors {
  bg_base: string;
  bg_surface: string;
  bg_elevated: string;
  bg_card: string;
  text_primary: string;
  text_secondary: string;
  text_dim: string;
  accent: string;
  accent_hover: string;
  border_color: string;
}

export interface ThemeConfig {
  mode: ThemeMode;
  colors: ThemeColors;
}

export const DARK_PRESET: ThemeColors = {
  bg_base: '#0d0d0d',
  bg_surface: '#141414',
  bg_elevated: '#1c1c1e',
  bg_card: '#1c1c1e',
  text_primary: 'rgba(255, 255, 255, 0.92)',
  text_secondary: 'rgba(255, 255, 255, 0.55)',
  text_dim: 'rgba(255, 255, 255, 0.30)',
  accent: '#8E8E93',
  accent_hover: '#AEAEB2',
  border_color: 'rgba(255, 255, 255, 0.12)',
};

export const LIGHT_PRESET: ThemeColors = {
  bg_base: '#f5f5f7',
  bg_surface: '#ffffff',
  bg_elevated: '#ffffff',
  bg_card: '#ffffff',
  text_primary: '#1d1d1f',
  text_secondary: '#6e6e73',
  text_dim: '#86868b',
  accent: '#6e6e73',
  accent_hover: '#525257',
  border_color: '#d2d2d7',
};

interface ThemeContextType {
  savedConfig: ThemeConfig;
  draftConfig: ThemeConfig;
  setDraftMode: (mode: ThemeMode) => void;
  updateDraftColor: (key: keyof ThemeColors, value: string) => void;
  resetDraftToDarkDefaults: () => void;
  saveTheme: () => Promise<void>;
  discardDraft: () => void;
  hasUnsavedChanges: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function applyThemeToDom(colors: ThemeColors) {
  if (typeof document === 'undefined') return;
  let style = document.getElementById('theme-init-style') as HTMLStyleElement;
  if (!style) {
    style = document.createElement('style');
    style.id = 'theme-init-style';
    document.head.appendChild(style);
  }
  style.textContent = `:root {
    --bg-base: ${colors.bg_base};
    --bg-surface: ${colors.bg_surface};
    --bg-elevated: ${colors.bg_elevated};
    --bg-card: ${colors.bg_card};
    --text-primary: ${colors.text_primary};
    --text-secondary: ${colors.text_secondary};
    --text-dim: ${colors.text_dim};
    --accent: ${colors.accent};
    --accent-hover: ${colors.accent_hover};
    --border-color: ${colors.border_color};
  }`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [savedConfig, setSavedConfig] = useState<ThemeConfig>({
    mode: 'dark',
    colors: DARK_PRESET,
  });
  const [draftConfig, setDraftConfig] = useState<ThemeConfig>({
    mode: 'dark',
    colors: DARK_PRESET,
  });

  useEffect(() => {
    async function loadTheme() {
      if (typeof window !== 'undefined' && window.electronAPI?.settings) {
        try {
          const cfg = await window.electronAPI.settings.getTheme();
          if (cfg && cfg.mode && cfg.colors) {
            setSavedConfig(cfg);
            setDraftConfig(cfg);
            applyThemeToDom(cfg.colors);
          }
        } catch (err) {
          console.error('Failed to load theme config from SQLite:', err);
        }
      }
    }
    loadTheme();
  }, []);

  const setDraftMode = (mode: ThemeMode) => {
    setDraftConfig((prev) => {
      let colors = prev.colors;
      if (mode === 'dark') colors = DARK_PRESET;
      else if (mode === 'light') colors = LIGHT_PRESET;
      else if (mode === 'custom' && prev.mode !== 'custom') {
        colors = { ...DARK_PRESET };
      }
      return { mode, colors };
    });
  };

  const updateDraftColor = (key: keyof ThemeColors, value: string) => {
    setDraftConfig((prev) => ({
      ...prev,
      mode: 'custom',
      colors: {
        ...prev.colors,
        [key]: value,
      },
    }));
  };

  const resetDraftToDarkDefaults = () => {
    setDraftConfig({
      mode: 'custom',
      colors: { ...DARK_PRESET },
    });
  };

  const saveTheme = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.settings) {
      await window.electronAPI.settings.saveTheme(draftConfig);
    }
    setSavedConfig(draftConfig);
    applyThemeToDom(draftConfig.colors);
  };

  const discardDraft = () => {
    setDraftConfig(savedConfig);
  };

  const hasUnsavedChanges = JSON.stringify(savedConfig) !== JSON.stringify(draftConfig);

  return (
    <ThemeContext.Provider
      value={{
        savedConfig,
        draftConfig,
        setDraftMode,
        updateDraftColor,
        resetDraftToDarkDefaults,
        saveTheme,
        discardDraft,
        hasUnsavedChanges,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
