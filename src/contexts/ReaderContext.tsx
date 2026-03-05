import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface ReaderSettings {
  fontSize: number;
  fontFamily: 'serif' | 'sans-serif' | 'monospace';
}

export interface ReaderContextValue {
  settings: ReaderSettings;
  setFontSize: (size: number) => void;
  setFontFamily: (family: ReaderSettings['fontFamily']) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 16,
  fontFamily: 'serif',
};

const STORAGE_KEY = 'novel-reader-settings';

const ReaderContext = createContext<ReaderContextValue | undefined>(undefined);

function loadSettings(): ReaderSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

function applySettings(settings: ReaderSettings): void {
  document.documentElement.style.setProperty('--reader-font-size', `${settings.fontSize}px`);
  document.documentElement.style.setProperty('--reader-font-family', settings.fontFamily);
}

export function ReaderProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings);

  useEffect(() => {
    applySettings(settings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage errors
    }
  }, [settings]);

  const setFontSize = useCallback((size: number) => {
    const clamped = Math.min(24, Math.max(12, size));
    setSettings(prev => ({ ...prev, fontSize: clamped }));
  }, []);

  const setFontFamily = useCallback((family: ReaderSettings['fontFamily']) => {
    setSettings(prev => ({ ...prev, fontFamily: family }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return (
    <ReaderContext.Provider value={{ settings, setFontSize, setFontFamily, resetSettings }}>
      {children}
    </ReaderContext.Provider>
  );
}

export function useReaderContext(): ReaderContextValue {
  const ctx = useContext(ReaderContext);
  if (!ctx) throw new Error('useReaderContext must be used within ReaderProvider');
  return ctx;
}
