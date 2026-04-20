import { getLibrary, saveLibrary, type Novel } from '@/lib/novel-store';

export type NovelDeletionSource = 'user' | 'admin' | 'sync';

export interface DeletedNovel {
  localId: string;
  url?: string | null;
  title?: string | null;
  deletedAt: string;
  source: NovelDeletionSource | string;
}

export interface NovelDeletionInput {
  localId: string;
  url?: string | null;
  title?: string | null;
  deletedAt?: string;
  source?: NovelDeletionSource | string;
}

const DELETED_NOVELS_KEY = 'novel-reader-deletions';

function parseDate(value: string | null | undefined): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  return trimmed ? trimmed : null;
}

export function deletionFromNovel(
  novel: Novel,
  source: NovelDeletionSource | string = 'user',
  deletedAt = new Date().toISOString(),
): DeletedNovel {
  return {
    localId: novel.id,
    url: normalizeUrl(novel.url),
    title: novel.title,
    deletedAt,
    source,
  };
}

export function normalizeDeletion(input: NovelDeletionInput): DeletedNovel {
  return {
    localId: input.localId,
    url: normalizeUrl(input.url),
    title: input.title ?? null,
    deletedAt: input.deletedAt ?? new Date().toISOString(),
    source: input.source ?? 'user',
  };
}

export function getDeletedNovels(): DeletedNovel[] {
  try {
    const raw = localStorage.getItem(DELETED_NOVELS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DeletedNovel[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((deletion) => deletion?.localId && deletion?.deletedAt);
  } catch {
    return [];
  }
}

export function saveDeletedNovels(deletions: DeletedNovel[]): void {
  localStorage.setItem(DELETED_NOVELS_KEY, JSON.stringify(deletions));
}

export function recordDeletedNovel(deletion: NovelDeletionInput): DeletedNovel {
  const normalized = normalizeDeletion(deletion);
  const existing = getDeletedNovels();
  const nextByLocalId = new Map(existing.map((item) => [item.localId, item]));
  const previous = nextByLocalId.get(normalized.localId);

  if (!previous || parseDate(normalized.deletedAt) >= parseDate(previous.deletedAt)) {
    nextByLocalId.set(normalized.localId, normalized);
  }

  const next = Array.from(nextByLocalId.values())
    .sort((a, b) => parseDate(b.deletedAt) - parseDate(a.deletedAt));
  saveDeletedNovels(next);
  return nextByLocalId.get(normalized.localId)!;
}

export function isNovelDeletedBy(novel: Pick<Novel, 'id' | 'url' | 'savedAt'>, deletions: DeletedNovel[]): boolean {
  const novelSavedAt = parseDate(novel.savedAt);
  const novelUrl = normalizeUrl(novel.url);

  return deletions.some((deletion) => {
    const deletedAt = parseDate(deletion.deletedAt);
    if (deletion.localId === novel.id) return true;
    if (!novelUrl || normalizeUrl(deletion.url) !== novelUrl) return false;
    return novelSavedAt === 0 || novelSavedAt <= deletedAt;
  });
}

export function isNovelDeletedLocally(novel: Pick<Novel, 'id' | 'url' | 'savedAt'>): boolean {
  return isNovelDeletedBy(novel, getDeletedNovels());
}

export function filterDeletedNovels(library: Novel[], deletions = getDeletedNovels()): Novel[] {
  return library.filter((novel) => !isNovelDeletedBy(novel, deletions));
}

export function removeDeletedNovelsFromLibrary(deletions = getDeletedNovels()): Novel[] {
  const library = getLibrary();
  const filtered = filterDeletedNovels(library, deletions);
  if (filtered.length !== library.length) {
    saveLibrary(filtered);
  }
  return filtered;
}

export function purgeNovelLocalData(novel: Pick<Novel, 'id' | 'chapters'>): void {
  localStorage.removeItem(`bookmarks:${novel.id}`);
  localStorage.removeItem(`last-read:${novel.id}`);
  localStorage.removeItem(`pdf-progress:${novel.id}`);

  for (const chapter of novel.chapters) {
    localStorage.removeItem(`reading-progress:${novel.id}:${chapter.id}`);
    localStorage.removeItem(`tts-progress:${novel.id}:${chapter.id}`);
  }
}
