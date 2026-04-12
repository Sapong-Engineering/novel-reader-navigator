/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AppSettings {
  syncEnabled: boolean;
  notificationsEnabled: boolean;
  notifyNewChapters: boolean;
  autoFetchNewChapters: boolean;
  refreshIntervalHours: number;
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
}

export interface AppSettingsContextValue extends AppSettings {
  setSyncEnabled: (v: boolean) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setNotifyNewChapters: (v: boolean) => void;
  setAutoFetchNewChapters: (v: boolean) => void;
  setRefreshIntervalHours: (v: number) => void;
  setSoundEnabled: (v: boolean) => void;
  setBrowserNotificationsEnabled: (v: boolean) => void;
  resetAll: () => void;
}

const STORAGE_KEY = 'novel-app-settings';

const DEFAULTS: AppSettings = {
  syncEnabled: true,
  notificationsEnabled: true,
  notifyNewChapters: true,
  autoFetchNewChapters: false,
  refreshIntervalHours: 24,
  soundEnabled: true,
  browserNotificationsEnabled: false,
};

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULTS;
}

function persist(s: AppSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

const AppSettingsContext = createContext<AppSettingsContextValue | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(load);
  // Track whether the user has already saved explicit preferences
  const hasStoredPrefs = useRef(localStorage.getItem(STORAGE_KEY) !== null);

  // Fetch admin defaults once on mount — only apply if user has no stored prefs
  useEffect(() => {
    if (hasStoredPrefs.current) return;
    supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['default_notifications', 'default_refresh_interval'])
      .then(({ data }) => {
        if (!data?.length) return;
        const map: Record<string, unknown> = {};
        for (const row of data) map[row.key] = row.value;
        setSettings(prev => ({
          ...prev,
          ...(map.default_notifications !== undefined
            ? { notificationsEnabled: map.default_notifications === true || map.default_notifications === 'true' }
            : {}),
          ...(map.default_refresh_interval !== undefined
            ? { refreshIntervalHours: Math.max(1, Math.min(168, Number(map.default_refresh_interval) || 24)) }
            : {}),
        }));
      });
  }, []);

  useEffect(() => { persist(settings); }, [settings]);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  const value: AppSettingsContextValue = {
    ...settings,
    setSyncEnabled: v => update({ syncEnabled: v }),
    setNotificationsEnabled: v => update({ notificationsEnabled: v }),
    setNotifyNewChapters: v => update({ notifyNewChapters: v }),
    setAutoFetchNewChapters: v => update({ autoFetchNewChapters: v }),
    setRefreshIntervalHours: v => update({ refreshIntervalHours: v }),
    setSoundEnabled: v => update({ soundEnabled: v }),
    setBrowserNotificationsEnabled: v => update({ browserNotificationsEnabled: v }),
    resetAll: () => setSettings(DEFAULTS),
  };

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsContextValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}
