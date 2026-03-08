/**
 * Offline sync queue — persists pending operations to localStorage
 * and replays them when connectivity returns.
 */

export interface QueuedOperation {
  id: string;
  type: 'syncNovel' | 'deleteNovel' | 'syncBookmarks' | 'syncProgress';
  payload: Record<string, unknown>;
  createdAt: string;
}

const QUEUE_KEY = 'offline_sync_queue';

function loadQueue(): QueuedOperation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedOperation[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

let idCounter = 0;

export function enqueue(type: QueuedOperation['type'], payload: Record<string, unknown>): void {
  const queue = loadQueue();
  // Deduplicate: replace existing op with same type + key
  const key = dedupeKey(type, payload);
  const filtered = queue.filter(op => dedupeKey(op.type, op.payload) !== key);
  filtered.push({
    id: `${Date.now()}-${++idCounter}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
  });
  saveQueue(filtered);
}

function dedupeKey(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case 'syncNovel':
      return `syncNovel:${payload.novelId}`;
    case 'deleteNovel':
      return `deleteNovel:${payload.localId}`;
    case 'syncBookmarks':
      return `syncBookmarks:${payload.novelLocalId}`;
    case 'syncProgress':
      return `syncProgress:${payload.novelLocalId}:${payload.chapterLocalId}`;
    default:
      return `${type}:${JSON.stringify(payload)}`;
  }
}

export function getQueueLength(): number {
  return loadQueue().length;
}

export function dequeue(): QueuedOperation | undefined {
  const queue = loadQueue();
  const op = queue.shift();
  saveQueue(queue);
  return op;
}

export function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

export function peekAll(): QueuedOperation[] {
  return loadQueue();
}

// ── Online/Offline listener ──

type OnlineCallback = (online: boolean) => void;
const onlineListeners = new Set<OnlineCallback>();

export function onConnectivityChange(cb: OnlineCallback): () => void {
  onlineListeners.add(cb);
  return () => { onlineListeners.delete(cb); };
}

function notifyConnectivity(online: boolean) {
  onlineListeners.forEach(cb => cb(online));
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => notifyConnectivity(true));
  window.addEventListener('offline', () => notifyConnectivity(false));
}
