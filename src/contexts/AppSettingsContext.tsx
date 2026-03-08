import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface AppSettings {
  syncEnabled: boolean;
  notificationsEnabled: boolean;
  notifyNewChapters: boolean;
  autoFetchNewChapters: boolean;
  refreshIntervalHours: number;
}

export interface AppSettingsContextValue extends AppSettings {
  setSyncEnabled: (v: boolean) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setNotifyNewChapters: (v: boolean) => void;
  setAutoFetchNewChapters: (v: boolean) => void;
  setRefreshIntervalHours: (v: number) => void;
  resetAll: () => void;
}

const STORAGE_KEY = 'novel-app-settings';

const DEFAULTS: AppSettings = {
  syncEnabled: true,
  notificationsEnabled: true,
  notifyNewChapters: true,
  autoFetchNewChapters: false,
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
