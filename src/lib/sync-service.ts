import { supabase } from '@/integrations/supabase/client';
import { type Novel, type Chapter, getLibrary, saveNovel, deleteNovel as deleteLocalNovel } from './novel-store';
import { getBookmarks, type Bookmark } from './bookmarks';
import { getReadingProgress, saveReadingProgress, getLastReadChapter, saveLastReadChapter } from './storage-manager';

async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ── Novels ──

export async function syncLibraryFromBackend(): Promise<Novel[]> {
  const userId = await getUserId();
  if (!userId) return getLibrary();

  try {
    // Fetch novels and chapters in parallel
    const [novelsRes, chaptersRes] = await Promise.all([
      supabase.from('novels').select('*'),
      supabase.from('chapters').select('*'),
    ]);

    if (novelsRes.error) throw novelsRes.error;

    const remoteNovels = novelsRes.data ?? [];
    const remoteChapters = chaptersRes.data ?? [];

    if (!remoteNovels.length) {
      // Push all local novels to backend in parallel
      const local = getLibrary();
      if (local.length > 0) {
        await Promise.all(local.map(novel => upsertNovelToBackend(novel, userId)));
      }
      return local;
    }

    // Build chapter lookup by novel_id for O(1) access
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
        content: c.content ?? undefined,
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

    // Push local-only novels to backend in parallel
    const localOnly = localLibrary.filter(n => !seenLocalIds.has(n.id));
    if (localOnly.length > 0) {
      await Promise.all(localOnly.map(novel => upsertNovelToBackend(novel, userId)));
      mergedNovels.push(...localOnly);
    }

    return mergedNovels;
  } catch (err) {
    console.error('Sync failed, using local data:', err);
    return getLibrary();
  }
}

function mergeChapters(local: Chapter[], remote: Chapter[]): Chapter[] {
  const map = new Map<string, Chapter>();
  for (const ch of local) map.set(ch.id, ch);
  for (const ch of remote) {
    const existing = map.get(ch.id);
    if (!existing || ch.content) {
      map.set(ch.id, ch);
    }
  }
  return Array.from(map.values());
}

async function getOrCreateNovelId(localId: string, userId: string, novel: Novel): Promise<string> {
  const { data } = await supabase
    .from('novels')
    .select('id')
    .eq('local_id', localId)
    .eq('user_id', userId)
    .maybeSingle();

  if (data) return data.id;

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
  return inserted!.id;
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

  // Batch upsert all chapters with content in one call
  const chaptersWithContent = novel.chapters.filter(c => c.content);
  const chaptersPromise = chaptersWithContent.length > 0
    ? supabase.from('chapters').upsert(
        chaptersWithContent.map(ch => ({
          novel_id: novelUuid,
          user_id: userId,
          local_id: ch.id,
          title: ch.title,
          url: ch.url,
          content: ch.content ?? null,
          saved_at: ch.savedAt ?? null,
        })),
        { onConflict: 'novel_id,local_id' }
      )
    : Promise.resolve(null);

  await Promise.all([metaPromise, chaptersPromise]);
}

export async function syncNovel(novel: Novel): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  try {
    await upsertNovelToBackend(novel, userId);
  } catch (err) {
    console.error('Failed to sync novel to backend:', err);
  }
}

export async function syncDeleteNovel(localId: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  try {
    await supabase
      .from('novels')
      .delete()
      .eq('local_id', localId)
      .eq('user_id', userId);
  } catch (err) {
    console.error('Failed to delete novel from backend:', err);
  }
}

// ── Bookmarks ──

export async function syncBookmarksToBackend(novelLocalId: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  try {
    const { data: novelRow } = await supabase
      .from('novels')
      .select('id')
      .eq('local_id', novelLocalId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!novelRow) return;

    const localBookmarks = getBookmarks(novelLocalId);

    // Delete existing + re-insert in parallel where possible
    await supabase
      .from('bookmarks')
      .delete()
      .eq('novel_id', novelRow.id)
      .eq('user_id', userId);

    if (localBookmarks.length > 0) {
      await supabase
        .from('bookmarks')
        .insert(localBookmarks.map(b => ({
          user_id: userId,
          novel_id: novelRow.id,
          chapter_local_id: b.chapterId,
          chapter_title: b.chapterTitle,
          scroll_position: b.scrollPosition,
          label: b.label ?? null,
        })));
    }
  } catch (err) {
    console.error('Failed to sync bookmarks:', err);
  }
}

// ── Reading Progress ──

export async function syncProgressToBackend(
  novelLocalId: string,
  chapterLocalId: string,
  scrollPosition: number,
  isLastRead: boolean = false,
): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  try {
    const { data: novelRow } = await supabase
      .from('novels')
      .select('id')
      .eq('local_id', novelLocalId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!novelRow) return;

    // Unset previous last-read and upsert new progress in parallel
    const promises: Promise<unknown>[] = [];

    if (isLastRead) {
      promises.push(
        supabase
          .from('reading_progress')
          .update({ is_last_read: false })
          .eq('novel_id', novelRow.id)
          .eq('user_id', userId)
          .eq('is_last_read', true)
      );
    }

    promises.push(
      supabase
        .from('reading_progress')
        .upsert({
          user_id: userId,
          novel_id: novelRow.id,
          chapter_local_id: chapterLocalId,
          scroll_position: scrollPosition,
          is_last_read: isLastRead,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,novel_id,chapter_local_id' })
    );

    await Promise.all(promises);
  } catch (err) {
    console.error('Failed to sync progress:', err);
  }
}
