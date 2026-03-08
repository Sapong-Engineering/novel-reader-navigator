import { toast } from 'sonner';

const SETTINGS_KEY = 'novel-app-settings';
const NOTIFICATIONS_KEY = 'novel-notification-history';
const MAX_NOTIFICATIONS = 50;

interface AppSettings {
  syncEnabled: boolean;
  notificationsEnabled: boolean;
  notifyNewChapters: boolean;
}

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface AppNotification {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
}

// ── In-memory subscribers for React ──
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitChange() {
  listeners.forEach(fn => fn());
}

// ── Persistence ──

function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { syncEnabled: true, notificationsEnabled: true, notifyNewChapters: true, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { syncEnabled: true, notificationsEnabled: true, notifyNewChapters: true };
}

export function getNotificationHistory(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveNotification(n: AppNotification) {
  const history = getNotificationHistory();
  history.unshift(n);
  if (history.length > MAX_NOTIFICATIONS) history.length = MAX_NOTIFICATIONS;
  try { localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(history)); } catch { /* ignore */ }
  emitChange();
}

export function markAllRead() {
  const history = getNotificationHistory();
  const updated = history.map(n => ({ ...n, read: true }));
  try { localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  emitChange();
}

export function clearNotificationHistory() {
  try { localStorage.removeItem(NOTIFICATIONS_KEY); } catch { /* ignore */ }
  emitChange();
}

export function getUnreadCount(): number {
  return getNotificationHistory().filter(n => !n.read).length;
}

// ── Public API ──

export function isSyncEnabled(): boolean {
  return getSettings().syncEnabled;
}

export function notify(message: string, type: NotificationType = 'info'): void {
  // Always persist to history
  saveNotification({
    id: crypto.randomUUID(),
    message,
    type,
    timestamp: new Date().toISOString(),
    read: false,
  });

  // Show toast only if notifications enabled
  if (!getSettings().notificationsEnabled) return;
  toast[type](message);
}

export function notifyNewChapter(message: string): void {
  const s = getSettings();

  saveNotification({
    id: crypto.randomUUID(),
    message,
    type: 'info',
    timestamp: new Date().toISOString(),
    read: false,
  });

  if (!s.notificationsEnabled || !s.notifyNewChapters) return;
  toast.info(message);
}
