import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

// Absolute fallback when neither admin settings nor user overrides are present
const HARDCODED_DEFAULTS: ReaderSettings = {
  fontSize: 16,
  fontFamily: 'serif',
};

// Only user-explicitly-chosen values live here (partial — only keys they've changed)
const STORAGE_KEY = 'novel-reader-settings';

function loadUserOverrides(): Partial<ReaderSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

function saveUserOverrides(overrides: Partial<ReaderSettings>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

function applySettings(settings: ReaderSettings): void {
  document.documentElement.style.setProperty('--reader-font-size', `${settings.fontSize}px`);
  document.documentElement.style.setProperty('--reader-font-family', settings.fontFamily);
}

const ReaderContext = createContext<ReaderContextValue | undefined>(undefined);

export function ReaderProvider({ children }: { children: ReactNode }) {
  const [adminDefaults, setAdminDefaults] = useState<ReaderSettings>(HARDCODED_DEFAULTS);
  const [userOverrides, setUserOverrides] = useState<Partial<ReaderSettings>>(loadUserOverrides);

  // Effective settings: admin defaults as base, user overrides on top
  const settings: ReaderSettings = { ...adminDefaults, ...userOverrides };

  // Fetch admin defaults once on mount — applies to users without explicit preferences
  useEffect(() => {
    supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['default_font_size', 'default_font_family'])
      .then(({ data }) => {
        if (!data?.length) return;
        const map: Record<string, string> = {};
        for (const row of data) map[row.key] = String(row.value);
        setAdminDefaults(prev => ({
          ...prev,
          ...(map.default_font_size ? { fontSize: Math.min(24, Math.max(12, Number(map.default_font_size))) } : {}),
          ...(map.default_font_family ? { fontFamily: map.default_font_family as ReaderSettings['fontFamily'] } : {}),
        }));
      });
  }, []);

  // Apply CSS vars whenever effective settings change
  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  const setFontSize = useCallback((size: number) => {
    const clamped = Math.min(24, Math.max(12, size));
    setUserOverrides(prev => {
      const next = { ...prev, fontSize: clamped };
      saveUserOverrides(next);
      return next;
    });
  }, []);

  const setFontFamily = useCallback((family: ReaderSettings['fontFamily']) => {
    setUserOverrides(prev => {
      const next = { ...prev, fontFamily: family };
      saveUserOverrides(next);
      return next;
    });
  }, []);

  // Reset clears user overrides so admin defaults take effect immediately
  const resetSettings = useCallback(() => {
    setUserOverrides({});
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
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
