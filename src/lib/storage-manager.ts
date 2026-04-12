import { getLibrary, saveNovel, type Novel } from './novel-store';

export interface StorageQuota {
  usedBytes: number;
  totalBytes: number;
  usagePercent: number;
  isWarning: boolean;
  isExceeded: boolean;
}

export interface ReadingProgressEntry {
  scrollPosition: number;
  updatedAt: string | null;
}

export interface LastReadChapterEntry {
  chapterId: string | null;
  updatedAt: string | null;
}

const WARNING_THRESHOLD = 0.8; // 80%
const STORAGE_KEY = 'novel-reader-library';

export class StorageQuotaExceededError extends Error {
  constructor(
    public readonly used: number,
    public readonly available: number,
    public readonly needed: number,
  ) {
    super(
      `Storage quota exceeded. Used: ${formatBytes(used)}, ` +
        `Available: ${formatBytes(available)}, Needed: ${formatBytes(needed)}. ` +
        `Try removing some novels to free up space.`,
    );
    this.name = 'StorageQuotaExceededError';
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export async function getQuota(): Promise<StorageQuota> {
  let totalBytes = 5 * 1024 * 1024; // Default 5 MB localStorage estimate
  let usedBytes = 0;

  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      totalBytes = estimate.quota ?? totalBytes;
      usedBytes = estimate.usage ?? 0;
    } else {
      // Estimate from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          usedBytes += (localStorage.getItem(key) ?? '').length * 2; // UTF-16
        }
      }
    }
  } catch {
    // Fallback: estimate from localStorage size
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        usedBytes += (localStorage.getItem(key) ?? '').length * 2;
      }
    }
  }

  const usagePercent = totalBytes > 0 ? usedBytes / totalBytes : 0;
  return {
    usedBytes,
    totalBytes,
    usagePercent,
    isWarning: usagePercent >= WARNING_THRESHOLD,
    isExceeded: usagePercent >= 1,
  };
}

export function calculateNovelSize(novel: Novel): number {
  return JSON.stringify(novel).length * 2; // UTF-16 bytes
}

export async function saveNovelWithQuotaCheck(novel: Novel): Promise<void> {
  const novelJson = JSON.stringify(novel);
  const neededBytes = novelJson.length * 2;

  // Check existing library size
  const existingData = localStorage.getItem(STORAGE_KEY) ?? '[]';
  const existingSizeBytes = existingData.length * 2;

  // Estimate available space (use 5MB as conservative localStorage limit)
  const maxBytes = 5 * 1024 * 1024;
  const otherStorageBytes = (() => {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key !== STORAGE_KEY) {
        total += (localStorage.getItem(key) ?? '').length * 2;
      }
    }
    return total;
  })();

  const availableBytes = maxBytes - otherStorageBytes - existingSizeBytes + calculateNovelSize(
    getLibrary().find(n => n.id === novel.id) ?? novel,
  );

  if (neededBytes > availableBytes) {
    throw new StorageQuotaExceededError(
      maxBytes - availableBytes,
      availableBytes,
      neededBytes,
    );
  }

  saveNovel(novel);
}

export async function getReadingProgress(
  novelId: string,
  chapterId: string,
): Promise<number> {
  const entry = await getReadingProgressEntry(novelId, chapterId);
  return entry.scrollPosition;
}

export async function getReadingProgressEntry(
  novelId: string,
  chapterId: string,
): Promise<ReadingProgressEntry> {
  const key = `reading-progress:${novelId}:${chapterId}`;
  const stored = localStorage.getItem(key);
  if (!stored) return { scrollPosition: 0, updatedAt: null };

  try {
    const parsed = JSON.parse(stored);
    if (typeof parsed === 'number') {
      return { scrollPosition: parsed, updatedAt: null };
    }
    if (parsed && typeof parsed === 'object') {
      return {
        scrollPosition: typeof parsed.scrollPosition === 'number' ? parsed.scrollPosition : 0,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      };
    }
  } catch {
    const numeric = parseFloat(stored);
    if (!Number.isNaN(numeric)) {
      return { scrollPosition: numeric, updatedAt: null };
    }
  }

  return { scrollPosition: 0, updatedAt: null };
}

export function saveReadingProgress(
  novelId: string,
  chapterId: string,
  scrollPosition: number,
): void {
  const key = `reading-progress:${novelId}:${chapterId}`;
  localStorage.setItem(key, JSON.stringify({
    scrollPosition,
    updatedAt: new Date().toISOString(),
  }));
}

export function getLastReadChapter(novelId: string): string | null {
  return getLastReadChapterEntry(novelId).chapterId;
}

export function getLastReadChapterEntry(novelId: string): LastReadChapterEntry {
  const stored = localStorage.getItem(`last-read:${novelId}`);
  if (!stored) return { chapterId: null, updatedAt: null };

  try {
    const parsed = JSON.parse(stored);
    if (typeof parsed === 'string') {
      return { chapterId: parsed, updatedAt: null };
    }
    if (parsed && typeof parsed === 'object') {
      return {
        chapterId: typeof parsed.chapterId === 'string' ? parsed.chapterId : null,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      };
    }
  } catch {
    return { chapterId: stored, updatedAt: null };
  }

  return { chapterId: null, updatedAt: null };
}

export function saveLastReadChapter(novelId: string, chapterId: string): void {
  localStorage.setItem(`last-read:${novelId}`, JSON.stringify({
    chapterId,
    updatedAt: new Date().toISOString(),
  }));
}

export interface TtsProgressEntry {
  paragraphIndex: number;
  updatedAt: string | null;
}

export function getTtsProgressEntry(novelId: string, chapterId: string): TtsProgressEntry {
  const key = `tts-progress:${novelId}:${chapterId}`;
  const stored = localStorage.getItem(key);
  if (!stored) return { paragraphIndex: 0, updatedAt: null };

  try {
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === 'object') {
      return {
        paragraphIndex: typeof parsed.paragraphIndex === 'number' ? parsed.paragraphIndex : 0,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      };
    }
  } catch {
    // Fall back to the default empty-progress payload below.
  }

  return { paragraphIndex: 0, updatedAt: null };
}

export function saveTtsProgress(novelId: string, chapterId: string, paragraphIndex: number): void {
  const key = `tts-progress:${novelId}:${chapterId}`;
  localStorage.setItem(key, JSON.stringify({
    paragraphIndex,
    updatedAt: new Date().toISOString(),
  }));
}
