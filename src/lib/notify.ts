import { toast } from 'sonner';

const SETTINGS_KEY = 'novel-app-settings';
const NOTIFICATIONS_KEY = 'novel-notification-history';
const MAX_NOTIFICATIONS = 50;

interface AppSettings {
  syncEnabled: boolean;
  notificationsEnabled: boolean;
  notifyNewChapters: boolean;
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
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

// ── Settings ──

function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return {
      syncEnabled: true,
      notificationsEnabled: true,
      notifyNewChapters: true,
      soundEnabled: true,
      browserNotificationsEnabled: false,
      ...JSON.parse(raw),
    };
  } catch { /* ignore */ }
  return {
    syncEnabled: true,
    notificationsEnabled: true,
    notifyNewChapters: true,
    soundEnabled: true,
    browserNotificationsEnabled: false,
  };
}

// ── Notification history persistence ──

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

// ── Sound ──

let audioCtx: AudioContext | null = null;

function playNotificationSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const ctx = audioCtx;

    // Two-tone chime
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.connect(gain);
    osc1.start(now);
    osc1.stop(now + 0.15);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.15); // D6
    osc2.connect(gain);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.5);
  } catch {
    // AudioContext may not be available
  }
}

// ── Browser Notifications ──

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return Promise.resolve('denied' as NotificationPermission);
  return Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

function showBrowserNotification(title: string, body: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'novel-reader-notification',
    });
  } catch {
    // Notification constructor may fail in some contexts
  }
}

// ── Public API ──

export function isSyncEnabled(): boolean {
  return getSettings().syncEnabled;
}

export function notify(message: string, type: NotificationType = 'info'): void {
  const s = getSettings();

  saveNotification({
    id: crypto.randomUUID(),
    message,
    type,
    timestamp: new Date().toISOString(),
    read: false,
  });

  if (!s.notificationsEnabled) return;
  toast[type](message);

  if (s.soundEnabled) playNotificationSound();
  if (s.browserNotificationsEnabled && document.hidden) {
    showBrowserNotification('NovelNav', message);
  }
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

  if (s.soundEnabled) playNotificationSound();
  if (s.browserNotificationsEnabled && document.hidden) {
    showBrowserNotification('New Chapter', message);
  }
}
