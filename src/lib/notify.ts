import { toast } from 'sonner';

const SETTINGS_KEY = 'novel-app-settings';

interface AppSettings {
  syncEnabled: boolean;
  notificationsEnabled: boolean;
  notifyNewChapters: boolean;
}

function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { syncEnabled: true, notificationsEnabled: true, notifyNewChapters: true, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { syncEnabled: true, notificationsEnabled: true, notifyNewChapters: true };
}

export function isSyncEnabled(): boolean {
  return getSettings().syncEnabled;
}

type ToastType = 'success' | 'error' | 'info' | 'warning';

export function notify(message: string, type: ToastType = 'info'): void {
  if (!getSettings().notificationsEnabled) return;
  toast[type](message);
}

export function notifyNewChapter(message: string): void {
  const s = getSettings();
  if (!s.notificationsEnabled || !s.notifyNewChapters) return;
  toast.info(message);
}
