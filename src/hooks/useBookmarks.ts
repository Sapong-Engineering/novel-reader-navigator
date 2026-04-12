import { useState, useCallback, useEffect } from 'react';
import {
  getBookmarks,
  addBookmark,
  removeBookmark,
  isChapterBookmarked,
  getChapterBookmarks,
  findNearbyBookmark,
  subscribeBookmarks,
  type Bookmark,
} from '@/lib/bookmarks';
import type { Chapter } from '@/lib/novel-store';

export interface UseBookmarksResult {
  bookmarks: Bookmark[];
  addChapterBookmark: (chapter: Chapter, scrollPosition: number, label?: string) => Bookmark;
  removeBookmark: (id: string) => void;
  isChapterBookmarked: (chapterId: string) => boolean;
  getChapterBookmarks: (chapterId: string) => Bookmark[];
  findNearbyBookmark: (chapterId: string, scrollPosition: number) => Bookmark | undefined;
}

export function useBookmarks(novelId: string): UseBookmarksResult {
  const [bookmarks, setBookmarksState] = useState<Bookmark[]>(() => getBookmarks(novelId));

  const refresh = useCallback(() => {
    setBookmarksState(getBookmarks(novelId));
  }, [novelId]);

  useEffect(() => {
    refresh();
    return subscribeBookmarks(novelId, refresh);
  }, [novelId, refresh]);

  const addChapterBookmark = useCallback(
    (chapter: Chapter, scrollPosition: number, label?: string): Bookmark => {
      const bookmark = addBookmark({
        novelId,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        scrollPosition,
        label: label?.trim() || undefined,
      });
      refresh();
      return bookmark;
    },
    [novelId, refresh],
  );

  const handleRemove = useCallback(
    (id: string) => {
      removeBookmark(id, novelId);
      refresh();
    },
    [novelId, refresh],
  );

  return {
    bookmarks,
    addChapterBookmark,
    removeBookmark: handleRemove,
    isChapterBookmarked: (chapterId) => isChapterBookmarked(novelId, chapterId),
    getChapterBookmarks: (chapterId) => getChapterBookmarks(novelId, chapterId),
    findNearbyBookmark: (chapterId, scrollPosition) =>
      findNearbyBookmark(novelId, chapterId, scrollPosition),
  };
}
