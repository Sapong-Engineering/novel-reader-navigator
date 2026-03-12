import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getReadingProgress,
  getReadingProgressEntry,
  saveReadingProgress,
  getLastReadChapter,
  getLastReadChapterEntry,
  saveLastReadChapter,
  calculateNovelSize,
} from './storage-manager';
import type { Novel } from './novel-store';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('saveReadingProgress / getReadingProgress', () => {
  beforeEach(() => localStorageMock.clear());

  it('saves and retrieves scroll position', async () => {
    saveReadingProgress('novel-1', 'ch-1', 350);
    const pos = await getReadingProgress('novel-1', 'ch-1');
    expect(pos).toBe(350);
  });

  it('stores a timestamped progress payload', async () => {
    saveReadingProgress('novel-1', 'ch-1', 350);
    const entry = await getReadingProgressEntry('novel-1', 'ch-1');
    expect(entry.scrollPosition).toBe(350);
    expect(entry.updatedAt).toEqual(expect.any(String));
  });

  it('returns 0 for unknown chapter', async () => {
    const pos = await getReadingProgress('novel-x', 'ch-x');
    expect(pos).toBe(0);
  });

  it('saves zero scroll position', async () => {
    saveReadingProgress('novel-1', 'ch-1', 0);
    const pos = await getReadingProgress('novel-1', 'ch-1');
    expect(pos).toBe(0);
  });

  it('reads legacy numeric progress values', async () => {
    localStorage.setItem('reading-progress:novel-1:ch-1', '125');
    const entry = await getReadingProgressEntry('novel-1', 'ch-1');
    expect(entry).toEqual({ scrollPosition: 125, updatedAt: null });
  });

  it('falls back safely on malformed progress values', async () => {
    localStorage.setItem('reading-progress:novel-1:ch-1', '{bad json');
    const entry = await getReadingProgressEntry('novel-1', 'ch-1');
    expect(entry).toEqual({ scrollPosition: 0, updatedAt: null });
  });
});

describe('saveLastReadChapter / getLastReadChapter', () => {
  beforeEach(() => localStorageMock.clear());

  it('saves and retrieves last read chapter', () => {
    saveLastReadChapter('novel-1', 'ch-5');
    expect(getLastReadChapter('novel-1')).toBe('ch-5');
  });

  it('stores a timestamped last-read payload', () => {
    saveLastReadChapter('novel-1', 'ch-5');
    const entry = getLastReadChapterEntry('novel-1');
    expect(entry.chapterId).toBe('ch-5');
    expect(entry.updatedAt).toEqual(expect.any(String));
  });

  it('returns null when none saved', () => {
    expect(getLastReadChapter('novel-unknown')).toBeNull();
  });

  it('updates last read chapter', () => {
    saveLastReadChapter('novel-1', 'ch-1');
    saveLastReadChapter('novel-1', 'ch-10');
    expect(getLastReadChapter('novel-1')).toBe('ch-10');
  });

  it('reads legacy string last-read values', () => {
    localStorage.setItem('last-read:novel-1', 'ch-7');
    expect(getLastReadChapterEntry('novel-1')).toEqual({ chapterId: 'ch-7', updatedAt: null });
  });
});

describe('calculateNovelSize', () => {
  it('returns size in bytes greater than zero for non-empty novel', () => {
    const novel: Novel = {
      id: 'n1',
      title: 'Test Novel',
      url: 'https://example.com',
      chapters: [{ id: 'ch-1', title: 'Chapter 1', url: 'https://example.com/1' }],
      savedAt: new Date().toISOString(),
    };
    expect(calculateNovelSize(novel)).toBeGreaterThan(0);
  });

  it('returns larger size for novel with content', () => {
    const base: Novel = {
      id: 'n1',
      title: 'Test',
      url: 'https://example.com',
      chapters: [],
      savedAt: new Date().toISOString(),
    };
    const withContent: Novel = {
      ...base,
      chapters: [
        { id: 'ch-1', title: 'Ch 1', url: 'https://example.com/1', content: 'a'.repeat(10000) },
      ],
    };
    expect(calculateNovelSize(withContent)).toBeGreaterThan(calculateNovelSize(base));
  });
});
