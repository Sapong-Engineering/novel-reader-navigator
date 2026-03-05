export interface Bookmark {
  id: string;
  novelId: string;
  chapterId: string;
  chapterTitle: string;
  scrollPosition: number;
  label?: string;
  createdAt: string;
}

function storageKey(novelId: string): string {
  return `bookmarks:${novelId}`;
}

export function getBookmarks(novelId: string): Bookmark[] {
  try {
    const data = localStorage.getItem(storageKey(novelId));
    return data ? (JSON.parse(data) as Bookmark[]) : [];
  } catch {
    return [];
  }
}

export function addBookmark(
  data: Omit<Bookmark, 'id' | 'createdAt'>,
): Bookmark {
  const bookmark: Bookmark = {
    ...data,
    id: Math.random().toString(36).substring(2, 10),
    createdAt: new Date().toISOString(),
  };
  const all = getBookmarks(data.novelId);
  all.push(bookmark);
  localStorage.setItem(storageKey(data.novelId), JSON.stringify(all));
  return bookmark;
}

export function removeBookmark(id: string, novelId: string): void {
  const filtered = getBookmarks(novelId).filter(b => b.id !== id);
  localStorage.setItem(storageKey(novelId), JSON.stringify(filtered));
}

export function isChapterBookmarked(
  novelId: string,
  chapterId: string,
): boolean {
  return getBookmarks(novelId).some(b => b.chapterId === chapterId);
}

export function getChapterBookmarks(
  novelId: string,
  chapterId: string,
): Bookmark[] {
  return getBookmarks(novelId).filter(b => b.chapterId === chapterId);
}

/** Returns a bookmark within `tolerance` px of `scrollPosition`, or undefined. */
export function findNearbyBookmark(
  novelId: string,
  chapterId: string,
  scrollPosition: number,
  tolerance = 50,
): Bookmark | undefined {
  return getChapterBookmarks(novelId, chapterId).find(
    b => Math.abs(b.scrollPosition - scrollPosition) <= tolerance,
  );
}
