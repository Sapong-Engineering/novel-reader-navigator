export interface Bookmark {
  id: string;
  novelId: string;
  chapterId: string;
  chapterTitle: string;
  scrollPosition: number;
  label?: string;
  createdAt: string;
}

type BookmarkListener = () => void;

const listenersByNovel = new Map<string, Set<BookmarkListener>>();

function storageKey(novelId: string): string {
  return `bookmarks:${novelId}`;
}

function emitBookmarksChanged(novelId: string): void {
  listenersByNovel.get(novelId)?.forEach((listener) => listener());
}

function persistBookmarks(novelId: string, bookmarks: Bookmark[]): void {
  localStorage.setItem(storageKey(novelId), JSON.stringify(bookmarks));
  emitBookmarksChanged(novelId);
}

function normalizeLabel(label?: string): string | undefined {
  const trimmed = label?.trim();
  return trimmed ? trimmed : undefined;
}

function getBookmarkIdentity(bookmark: Pick<Bookmark, 'chapterId' | 'scrollPosition' | 'label' | 'createdAt'>): string {
  return [
    bookmark.chapterId,
    bookmark.scrollPosition,
    normalizeLabel(bookmark.label) ?? '',
    bookmark.createdAt,
  ].join('::');
}

function generateBookmarkId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 10);
}

export function getBookmarks(novelId: string): Bookmark[] {
  try {
    const data = localStorage.getItem(storageKey(novelId));
    return data ? (JSON.parse(data) as Bookmark[]) : [];
  } catch {
    return [];
  }
}

export function setBookmarks(novelId: string, bookmarks: Bookmark[]): void {
  persistBookmarks(novelId, bookmarks);
}

export function mergeBookmarkCollections(local: Bookmark[], incoming: Bookmark[]): Bookmark[] {
  const merged = [...local];
  const seen = new Set(local.map(getBookmarkIdentity));

  for (const bookmark of incoming) {
    const normalizedBookmark: Bookmark = {
      ...bookmark,
      label: normalizeLabel(bookmark.label),
    };
    const identity = getBookmarkIdentity(normalizedBookmark);
    if (seen.has(identity)) continue;
    seen.add(identity);
    merged.push(normalizedBookmark);
  }

  return merged;
}

export function subscribeBookmarks(novelId: string, listener: BookmarkListener): () => void {
  const listeners = listenersByNovel.get(novelId) ?? new Set<BookmarkListener>();
  listeners.add(listener);
  listenersByNovel.set(novelId, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      listenersByNovel.delete(novelId);
    }
  };
}

export function addBookmark(
  data: Omit<Bookmark, 'id' | 'createdAt'>,
): Bookmark {
  const bookmark: Bookmark = {
    ...data,
    id: generateBookmarkId(),
    label: normalizeLabel(data.label),
    createdAt: new Date().toISOString(),
  };
  const all = getBookmarks(data.novelId);
  all.push(bookmark);
  persistBookmarks(data.novelId, all);
  return bookmark;
}

export function removeBookmark(id: string, novelId: string): void {
  const filtered = getBookmarks(novelId).filter(b => b.id !== id);
  persistBookmarks(novelId, filtered);
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
