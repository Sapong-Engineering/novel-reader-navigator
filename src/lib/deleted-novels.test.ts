import { beforeEach, describe, expect, it } from 'vitest';
import {
  deletionFromNovel,
  filterDeletedNovels,
  getDeletedNovels,
  isNovelDeletedBy,
  purgeNovelLocalData,
  recordDeletedNovel,
} from './deleted-novels';
import type { Novel } from './novel-store';

const baseNovel: Novel = {
  id: 'novel-1',
  title: 'Deleted Novel',
  url: 'https://example.com/novel',
  chapters: [
    { id: 'chapter-1', title: 'Chapter 1', url: 'https://example.com/novel/1' },
  ],
  savedAt: '2026-04-19T10:00:00.000Z',
};

describe('deleted novel tombstones', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records latest deletion metadata by local id', () => {
    recordDeletedNovel({ localId: 'novel-1', title: 'Old', deletedAt: '2026-04-18T10:00:00.000Z' });
    recordDeletedNovel({ localId: 'novel-1', title: 'New', deletedAt: '2026-04-20T10:00:00.000Z' });

    expect(getDeletedNovels()).toEqual([
      expect.objectContaining({ localId: 'novel-1', title: 'New' }),
    ]);
  });

  it('treats local id deletion as authoritative', () => {
    const deletion = deletionFromNovel(baseNovel, 'user', '2026-04-20T10:00:00.000Z');

    expect(isNovelDeletedBy(baseNovel, [deletion])).toBe(true);
  });

  it('uses url tombstones only for stale savedAt values', () => {
    const deletion = {
      localId: 'deleted-on-other-device',
      url: baseNovel.url,
      title: baseNovel.title,
      deletedAt: '2026-04-20T10:00:00.000Z',
      source: 'sync',
    };

    expect(isNovelDeletedBy(baseNovel, [deletion])).toBe(true);
    expect(isNovelDeletedBy({
      ...baseNovel,
      id: 'fresh-readd',
      savedAt: '2026-04-20T10:01:00.000Z',
    }, [deletion])).toBe(false);
  });

  it('filters deleted novels from a library without dropping fresh re-adds', () => {
    const deletion = {
      localId: 'other-device-id',
      url: baseNovel.url,
      title: baseNovel.title,
      deletedAt: '2026-04-20T10:00:00.000Z',
      source: 'sync',
    };
    const freshNovel = {
      ...baseNovel,
      id: 'fresh-readd',
      savedAt: '2026-04-20T10:01:00.000Z',
    };

    expect(filterDeletedNovels([baseNovel, freshNovel], [deletion])).toEqual([freshNovel]);
  });

  it('purges related local reader data', () => {
    localStorage.setItem('bookmarks:novel-1', '[]');
    localStorage.setItem('last-read:novel-1', 'chapter-1');
    localStorage.setItem('reading-progress:novel-1:chapter-1', '100');
    localStorage.setItem('tts-progress:novel-1:chapter-1', '2');
    localStorage.setItem('pdf-progress:novel-1', '{}');

    purgeNovelLocalData(baseNovel);

    expect(localStorage.getItem('bookmarks:novel-1')).toBeNull();
    expect(localStorage.getItem('last-read:novel-1')).toBeNull();
    expect(localStorage.getItem('reading-progress:novel-1:chapter-1')).toBeNull();
    expect(localStorage.getItem('tts-progress:novel-1:chapter-1')).toBeNull();
    expect(localStorage.getItem('pdf-progress:novel-1')).toBeNull();
  });
});
