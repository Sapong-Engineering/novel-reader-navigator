import { describe, it, expect, beforeEach } from 'vitest';
import {
  getBookmarks,
  addBookmark,
  removeBookmark,
  isChapterBookmarked,
  getChapterBookmarks,
  findNearbyBookmark,
  setBookmarks,
  mergeBookmarkCollections,
} from './bookmarks';

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

describe('bookmarks', () => {
  beforeEach(() => localStorageMock.clear());

  describe('getBookmarks', () => {
    it('returns empty array when no bookmarks', () => {
      expect(getBookmarks('novel-1')).toEqual([]);
    });

    it('returns bookmarks for the given novel', () => {
      addBookmark({ novelId: 'novel-1', chapterId: 'ch-1', chapterTitle: 'Ch 1', scrollPosition: 100 });
      expect(getBookmarks('novel-1')).toHaveLength(1);
    });

    it('does not return bookmarks from another novel', () => {
      addBookmark({ novelId: 'novel-2', chapterId: 'ch-1', chapterTitle: 'Ch 1', scrollPosition: 0 });
      expect(getBookmarks('novel-1')).toHaveLength(0);
    });

    it('returns bookmarks replaced via setBookmarks', () => {
      setBookmarks('novel-1', [{
        id: 'bookmark-1',
        novelId: 'novel-1',
        chapterId: 'ch-3',
        chapterTitle: 'Chapter 3',
        scrollPosition: 90,
        createdAt: '2026-04-12T00:00:00.000Z',
      }]);

      expect(getBookmarks('novel-1')).toEqual([
        expect.objectContaining({ id: 'bookmark-1', chapterId: 'ch-3' }),
      ]);
    });
  });

  describe('addBookmark', () => {
    it('creates a bookmark with id and createdAt', () => {
      const bm = addBookmark({
        novelId: 'n1', chapterId: 'ch-1', chapterTitle: 'Chapter 1', scrollPosition: 200,
      });
      expect(bm.id).toBeTruthy();
      expect(bm.createdAt).toBeTruthy();
      expect(bm.scrollPosition).toBe(200);
    });

    it('stores optional label', () => {
      const bm = addBookmark({
        novelId: 'n1', chapterId: 'ch-1', chapterTitle: 'Chapter 1', scrollPosition: 0, label: 'my spot',
      });
      expect(bm.label).toBe('my spot');
    });

    it('accumulates multiple bookmarks', () => {
      addBookmark({ novelId: 'n1', chapterId: 'ch-1', chapterTitle: 'Ch 1', scrollPosition: 0 });
      addBookmark({ novelId: 'n1', chapterId: 'ch-2', chapterTitle: 'Ch 2', scrollPosition: 500 });
      expect(getBookmarks('n1')).toHaveLength(2);
    });

    it('generates unique ids', () => {
      const b1 = addBookmark({ novelId: 'n1', chapterId: 'ch-1', chapterTitle: 'Ch 1', scrollPosition: 0 });
      const b2 = addBookmark({ novelId: 'n1', chapterId: 'ch-1', chapterTitle: 'Ch 1', scrollPosition: 100 });
      expect(b1.id).not.toBe(b2.id);
    });
  });

  describe('removeBookmark', () => {
    it('removes bookmark by id', () => {
      const bm = addBookmark({ novelId: 'n1', chapterId: 'ch-1', chapterTitle: 'Ch 1', scrollPosition: 0 });
      removeBookmark(bm.id, 'n1');
      expect(getBookmarks('n1')).toHaveLength(0);
    });

    it('only removes the specified bookmark', () => {
      const b1 = addBookmark({ novelId: 'n1', chapterId: 'ch-1', chapterTitle: 'Ch 1', scrollPosition: 0 });
      addBookmark({ novelId: 'n1', chapterId: 'ch-2', chapterTitle: 'Ch 2', scrollPosition: 200 });
      removeBookmark(b1.id, 'n1');
      expect(getBookmarks('n1')).toHaveLength(1);
      expect(getBookmarks('n1')[0].chapterId).toBe('ch-2');
    });

    it('is a no-op for unknown id', () => {
      addBookmark({ novelId: 'n1', chapterId: 'ch-1', chapterTitle: 'Ch 1', scrollPosition: 0 });
      removeBookmark('nonexistent', 'n1');
      expect(getBookmarks('n1')).toHaveLength(1);
    });
  });

  describe('isChapterBookmarked', () => {
    it('returns true when chapter has a bookmark', () => {
      addBookmark({ novelId: 'n1', chapterId: 'ch-5', chapterTitle: 'Ch 5', scrollPosition: 0 });
      expect(isChapterBookmarked('n1', 'ch-5')).toBe(true);
    });

    it('returns false when chapter has no bookmark', () => {
      expect(isChapterBookmarked('n1', 'ch-99')).toBe(false);
    });
  });

  describe('getChapterBookmarks', () => {
    it('returns only bookmarks for the specified chapter', () => {
      addBookmark({ novelId: 'n1', chapterId: 'ch-1', chapterTitle: 'Ch 1', scrollPosition: 0 });
      addBookmark({ novelId: 'n1', chapterId: 'ch-1', chapterTitle: 'Ch 1', scrollPosition: 300 });
      addBookmark({ novelId: 'n1', chapterId: 'ch-2', chapterTitle: 'Ch 2', scrollPosition: 100 });
      expect(getChapterBookmarks('n1', 'ch-1')).toHaveLength(2);
      expect(getChapterBookmarks('n1', 'ch-2')).toHaveLength(1);
    });
  });

  describe('findNearbyBookmark', () => {
    it('finds bookmark within default tolerance (50px)', () => {
      const bm = addBookmark({ novelId: 'n1', chapterId: 'ch-1', chapterTitle: 'Ch 1', scrollPosition: 100 });
      expect(findNearbyBookmark('n1', 'ch-1', 140)?.id).toBe(bm.id);
    });

    it('returns undefined when no bookmark is within tolerance', () => {
      addBookmark({ novelId: 'n1', chapterId: 'ch-1', chapterTitle: 'Ch 1', scrollPosition: 100 });
      expect(findNearbyBookmark('n1', 'ch-1', 200)).toBeUndefined();
    });

    it('respects custom tolerance', () => {
      const bm = addBookmark({ novelId: 'n1', chapterId: 'ch-1', chapterTitle: 'Ch 1', scrollPosition: 100 });
      expect(findNearbyBookmark('n1', 'ch-1', 200, 110)?.id).toBe(bm.id);
      expect(findNearbyBookmark('n1', 'ch-1', 200, 90)).toBeUndefined();
    });

    it('finds exact match', () => {
      const bm = addBookmark({ novelId: 'n1', chapterId: 'ch-1', chapterTitle: 'Ch 1', scrollPosition: 250 });
      expect(findNearbyBookmark('n1', 'ch-1', 250)?.id).toBe(bm.id);
    });
  });

  describe('mergeBookmarkCollections', () => {
    it('keeps unique remote bookmarks when merging devices', () => {
      const merged = mergeBookmarkCollections(
        [{
          id: 'local-1',
          novelId: 'novel-1',
          chapterId: 'ch-1',
          chapterTitle: 'Chapter 1',
          scrollPosition: 100,
          createdAt: '2026-04-12T00:00:00.000Z',
        }],
        [{
          id: 'remote-1',
          novelId: 'novel-1',
          chapterId: 'ch-2',
          chapterTitle: 'Chapter 2',
          scrollPosition: 250,
          createdAt: '2026-04-12T01:00:00.000Z',
        }],
      );

      expect(merged.map((bookmark) => bookmark.chapterId)).toEqual(['ch-1', 'ch-2']);
    });

    it('does not duplicate bookmarks already present locally', () => {
      const merged = mergeBookmarkCollections(
        [{
          id: 'local-1',
          novelId: 'novel-1',
          chapterId: 'ch-1',
          chapterTitle: 'Chapter 1',
          scrollPosition: 100,
          label: 'favorite spot',
          createdAt: '2026-04-12T00:00:00.000Z',
        }],
        [{
          id: 'remote-1',
          novelId: 'novel-1',
          chapterId: 'ch-1',
          chapterTitle: 'Chapter 1',
          scrollPosition: 100,
          label: 'favorite spot',
          createdAt: '2026-04-12T00:00:00.000Z',
        }],
      );

      expect(merged).toHaveLength(1);
    });
  });
});
