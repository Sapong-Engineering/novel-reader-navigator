import { supabase } from '@/integrations/supabase/client';
import { type Novel, type Chapter, getLibrary, saveNovel, getNovel, deleteNovel as deleteLocalNovel } from './novel-store';
import { getBookmarks, type Bookmark } from './bookmarks';
import { getReadingProgress, saveReadingProgress, getLastReadChapter, saveLastReadChapter } from './storage-manager';
import { setSyncStatus } from '@/hooks/useSyncStatus';
import { enqueue, dequeue, getQueueLength, onConnectivityChange } from './offline-queue';

// ── Caches ──

let cachedUserId: string | null = null;
let userIdInitialized = false;
const novelUuidCache = new Map<string, string>(); // local_id -> backend uuid

// Listen for auth changes to keep cache fresh
supabase.auth.onAuthStateChange((_event, session) => {
  cachedUserId = session?.user?.id ?? null;
  userIdInitialized = true;
  if (!session?.user) {
    novelUuidCache.clear();
  }
});

async function getUserId(): Promise<string | null> {
  if (userIdInitialized) return cachedUserId;
  const { data: { session } } = await supabase.auth.getSession();
  cachedUserId = session?.user?.id ?? null;
  userIdInitialized = true;
  return cachedUserId;
}

// ── Debounced progress sync ──

let progressTimer: ReturnType<typeof setTimeout> | null = null;
let pendingProgress: { novelLocalId: string; chapterLocalId: string; scrollPosition: number; isLastRead: boolean } | null = null;

function flushProgressSync() {
  if (!pendingProgress) return;
  const p = pendingProgress;
  pendingProgress = null;
  _syncProgressToBackend(p.novelLocalId, p.chapterLocalId, p.scrollPosition, p.isLastRead);
}

export function syncProgressToBackend(
  novelLocalId: string,
  chapterLocalId: string,
  scrollPosition: number,
  isLastRead: boolean = false,
): void {
  // Last-read changes flush immediately
  if (isLastRead) {
    pendingProgress = null;
    if (progressTimer) { clearTimeout(progressTimer); progressTimer = null; }
    _syncProgressToBackend(novelLocalId, chapterLocalId, scrollPosition, true);
    return;
  }
  pendingProgress = { novelLocalId, chapterLocalId, scrollPosition, isLastRead };
  if (progressTimer) clearTimeout(progressTimer);
  progressTimer = setTimeout(flushProgressSync, 2000);
}

async function _syncProgressToBackend(
  novelLocalId: string,
  chapterLocalId: string,
  scrollPosition: number,
  isLastRead: boolean,
): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  try {
    const novelUuid = await resolveNovelUuid(novelLocalId, userId);
    if (!novelUuid) return;

    if (isLastRead) {
      await supabase
        .from('reading_progress')
        .update({ is_last_read: false })
        .eq('novel_id', novelUuid)
        .eq('user_id', userId)
        .eq('is_last_read', true);
    }

    await supabase
      .from('reading_progress')
      .upsert({
        user_id: userId,
        novel_id: novelUuid,
        chapter_local_id: chapterLocalId,
        scroll_position: scrollPosition,
        is_last_read: isLastRead,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,novel_id,chapter_local_id' });
  } catch (err) {
    console.error('Failed to sync progress:', err);
    enqueue('syncProgress', { novelLocalId, chapterLocalId, scrollPosition, isLastRead });
  }
}

// ── Novel UUID resolution (cached) ──

async function resolveNovelUuid(localId: string, userId: string): Promise<string | null> {
  const cached = novelUuidCache.get(localId);
  if (cached) return cached;

  const { data } = await supabase
    .from('novels')
    .select('id')
    .eq('local_id', localId)
    .eq('user_id', userId)
    .maybeSingle();

  if (data) {
    novelUuidCache.set(localId, data.id);
    return data.id;
  }
  return null;
}

async function getOrCreateNovelId(localId: string, userId: string, novel: Novel): Promise<string> {
  const cached = novelUuidCache.get(localId);
  if (cached) return cached;

  const { data } = await supabase
    .from('novels')
    .select('id')
    .eq('local_id', localId)
    .eq('user_id', userId)
    .maybeSingle();

  if (data) {
    novelUuidCache.set(localId, data.id);
    return data.id;
  }

  const { data: inserted, error } = await supabase
    .from('novels')
    .insert({
      user_id: userId,
      local_id: novel.id,
      title: novel.title,
      url: novel.url,
      cover_url: novel.coverUrl ?? null,
      description: novel.description ?? null,
      saved_at: novel.savedAt,
    })
    .select('id')
    .single();

  if (error) throw error;
  novelUuidCache.set(localId, inserted!.id);
  return inserted!.id;
}

// ── Novels ──

export async function syncLibraryFromBackend(): Promise<Novel[]> {
  const userId = await getUserId();
  if (!userId) return getLibrary();
  setSyncStatus('syncing');

  try {
    // Fetch novels and chapter METADATA only (skip content for speed)
    const [novelsRes, chaptersRes] = await Promise.all([
      supabase.from('novels').select('*'),
      supabase.from('chapters').select('id,novel_id,local_id,title,url,saved_at'),
    ]);

    if (novelsRes.error) throw novelsRes.error;

    const remoteNovels = novelsRes.data ?? [];
    const remoteChapters = chaptersRes.data ?? [];

    // Populate UUID cache
    for (const rn of remoteNovels) {
      novelUuidCache.set(rn.local_id, rn.id);
    }

    if (!remoteNovels.length) {
      const local = getLibrary();
      if (local.length > 0) {
        await Promise.all(local.map(novel => upsertNovelToBackend(novel, userId)));
      }
      return local;
    }

    // Build chapter lookup by novel_id
    const chaptersByNovelId = new Map<string, typeof remoteChapters>();
    for (const c of remoteChapters) {
      const arr = chaptersByNovelId.get(c.novel_id) ?? [];
      arr.push(c);
      chaptersByNovelId.set(c.novel_id, arr);
    }

    const localLibrary = getLibrary();
    const localMap = new Map(localLibrary.map(n => [n.id, n]));
    const mergedNovels: Novel[] = [];
    const seenLocalIds = new Set<string>();

    for (const rn of remoteNovels) {
      seenLocalIds.add(rn.local_id);
      const chapters = (chaptersByNovelId.get(rn.id) ?? []).map(c => ({
        id: c.local_id,
        title: c.title,
        url: c.url,
        // No content from backend during initial sync — use local content if available
        savedAt: c.saved_at ?? undefined,
      }));

      const localNovel = localMap.get(rn.local_id);

      const novel: Novel = {
        id: rn.local_id,
        title: rn.title,
        url: rn.url,
        coverUrl: rn.cover_url ?? undefined,
        description: rn.description ?? undefined,
        savedAt: rn.saved_at,
        chapters: mergeChapters(localNovel?.chapters ?? [], chapters),
      };
      saveNovel(novel);
      mergedNovels.push(novel);
    }

    // Push local-only novels to backend
    const seenUrls = new Set(mergedNovels.map(n => n.url));
    const localOnly = localLibrary.filter(n => !seenLocalIds.has(n.id) && !seenUrls.has(n.url));
    if (localOnly.length > 0) {
      await Promise.all(localOnly.map(novel => upsertNovelToBackend(novel, userId)));
      mergedNovels.push(...localOnly);
    }

    // Deduplicate by URL
    const urlMap = new Map<string, Novel>();
    for (const novel of mergedNovels) {
      const existing = urlMap.get(novel.url);
      if (!existing) {
        urlMap.set(novel.url, novel);
      } else {
        const existingFetched = existing.chapters.filter(c => c.content).length;
        const currentFetched = novel.chapters.filter(c => c.content).length;
        if (currentFetched > existingFetched) {
          urlMap.set(novel.url, novel);
        }
      }
    }

    setSyncStatus('done');
    return Array.from(urlMap.values());
  } catch (err) {
    setSyncStatus('error');
    console.error('Sync failed, using local data:', err);
    return getLibrary();
  }
}

function mergeChapters(local: Chapter[], remote: Chapter[]): Chapter[] {
  const map = new Map<string, Chapter>();
  // Remote first (has latest metadata)
  for (const ch of remote) map.set(ch.id, ch);
  // Local overrides if it has content
  for (const ch of local) {
    const existing = map.get(ch.id);
    if (!existing || ch.content) {
      map.set(ch.id, ch);
    }
  }
  return Array.from(map.values());
}

async function upsertNovelToBackend(novel: Novel, userId: string): Promise<void> {
  const novelUuid = await getOrCreateNovelId(novel.id, userId, novel);

  // Update metadata
  const metaPromise = supabase
    .from('novels')
    .update({
      title: novel.title,
      url: novel.url,
      cover_url: novel.coverUrl ?? null,
      description: novel.description ?? null,
      saved_at: novel.savedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', novelUuid);

  // Batch upsert ALL chapters (metadata for all, content for those that have it)
  const allChaptersData = novel.chapters.map(ch => ({
    novel_id: novelUuid,
    user_id: userId,
    local_id: ch.id,
    title: ch.title,
    url: ch.url,
    content: ch.content ?? null,
    saved_at: ch.savedAt ?? null,
  }));

  const chaptersPromise = allChaptersData.length > 0
    ? supabase.from('chapters').upsert(allChaptersData, { onConflict: 'novel_id,local_id' })
    : Promise.resolve(null);

  await Promise.all([metaPromise, chaptersPromise]);
}

export async function syncNovel(novel: Novel): Promise<void> {
  if (!navigator.onLine) {
    enqueue('syncNovel', { novelId: novel.id });
    setSyncStatus('idle');
    return;
  }
  const userId = await getUserId();
  if (!userId) return;
  setSyncStatus('syncing');
  try {
    await upsertNovelToBackend(novel, userId);
    setSyncStatus('done');
  } catch (err) {
    setSyncStatus('error');
    enqueue('syncNovel', { novelId: novel.id });
    console.error('Failed to sync novel to backend:', err);
  }
}

export async function syncDeleteNovel(localId: string): Promise<void> {
  if (!navigator.onLine) {
    enqueue('deleteNovel', { localId });
    setSyncStatus('idle');
    return;
  }
  const userId = await getUserId();
  if (!userId) return;
  setSyncStatus('syncing');
  try {
    novelUuidCache.delete(localId);
    await supabase
      .from('novels')
      .delete()
      .eq('local_id', localId)
      .eq('user_id', userId);
    setSyncStatus('done');
  } catch (err) {
    setSyncStatus('error');
    enqueue('deleteNovel', { localId });
    console.error('Failed to delete novel from backend:', err);
  }
}
}

// ── On-demand chapter content from backend ──

export async function fetchChapterContentFromBackend(
  novelLocalId: string,
  chapterLocalId: string,
): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;
  try {
    const novelUuid = await resolveNovelUuid(novelLocalId, userId);
    if (!novelUuid) return null;

    const { data } = await supabase
      .from('chapters')
      .select('content')
      .eq('novel_id', novelUuid)
      .eq('local_id', chapterLocalId)
      .maybeSingle();

    return data?.content ?? null;
  } catch (err) {
    console.error('Failed to fetch chapter content from backend:', err);
    return null;
  }
}

// ── Bookmarks ──

export async function syncBookmarksToBackend(novelLocalId: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  setSyncStatus('syncing');
  try {
    const novelUuid = await resolveNovelUuid(novelLocalId, userId);
    if (!novelUuid) return;

    const localBookmarks = getBookmarks(novelLocalId);

    await supabase
      .from('bookmarks')
      .delete()
      .eq('novel_id', novelUuid)
      .eq('user_id', userId);

    if (localBookmarks.length > 0) {
      await supabase
        .from('bookmarks')
        .insert(localBookmarks.map(b => ({
          user_id: userId,
          novel_id: novelUuid,
          chapter_local_id: b.chapterId,
          chapter_title: b.chapterTitle,
          scroll_position: b.scrollPosition,
          label: b.label ?? null,
        })));
    }
    setSyncStatus('done');
  } catch (err) {
    setSyncStatus('error');
    console.error('Failed to sync bookmarks:', err);
  }
}
