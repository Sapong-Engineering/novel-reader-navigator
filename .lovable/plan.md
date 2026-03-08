

## Backend-First Storage & Sync Optimizations

### Problem
1. **Chapters only sync if they have content** -- `upsertNovelToBackend` filters `novel.chapters.filter(c => c.content)`, so chapter metadata (title, url) for unfetched chapters never reaches the backend. On a new device, the user gets novels but no chapter list until re-scraped.
2. **`getUserId()` makes a network call every time** -- each sync function calls `supabase.auth.getUser()` which hits the API.
3. **Progress sync fires on every scroll** -- no debounce on the backend call, generating excessive requests.
4. **Initial sync fetches full chapter `content` via `select('*')`** -- huge payloads slow down the <5s target. Content is already in localStorage if previously fetched; only needed on-demand.

### Changes

#### `src/lib/sync-service.ts`

1. **Save ALL chapter metadata to backend** (not just chapters with content):
   - In `upsertNovelToBackend`, split into two operations: batch upsert ALL chapters (metadata only: title, url, local_id) + batch upsert content for chapters that have it. This ensures the chapter list is always available on the backend.

2. **Cache `userId` in memory**:
   - Replace `supabase.auth.getUser()` with `supabase.auth.getSession()` (reads from local storage, no network call). Cache result in a module-level variable, refresh on auth state change.

3. **Fetch chapter metadata only on initial sync**:
   - Change `supabase.from('chapters').select('*')` to `select('id,novel_id,local_id,title,url,saved_at')` -- skip `content` column. Content is loaded on-demand when a chapter is opened.

4. **Add on-demand chapter content fetch from backend**:
   - New export `fetchChapterContentFromBackend(novelLocalId, chapterLocalId)` that fetches a single chapter's content from the backend. Used in `Reader.tsx` when opening a chapter that has no local content.

5. **Debounce backend progress sync**:
   - Wrap `syncProgressToBackend` calls with a 2-second debounce so scroll events don't flood the backend.

6. **Cache novel UUID mapping**:
   - Module-level `Map<string, string>` mapping `local_id` to backend UUID. Populated during `syncLibraryFromBackend`, reused in `getOrCreateNovelId` to skip the DB lookup.

#### `src/pages/Reader.tsx`

1. **Try backend content before scraping**:
   - In `handleSelectChapter`, if chapter has no local content, first try `fetchChapterContentFromBackend()`. If found, use it (avoids re-scraping). Only fall back to `scrapeChapterContent()` if backend returns nothing.

2. **Debounce backend progress sync**:
   - Wrap the `syncProgressToBackend` call in `handleSaveProgress` with a debounced function (2s delay).

#### `src/pages/Index.tsx`

- Add a sync guard ref to prevent `syncLibraryFromBackend` from running twice on mount.

### Implementation Order

1. Add userId cache + novel UUID cache + debounce utility to sync-service
2. Update `upsertNovelToBackend` to save all chapters (not just those with content)
3. Update `syncLibraryFromBackend` to fetch metadata-only for chapters
4. Add `fetchChapterContentFromBackend` function
5. Update Reader.tsx to try backend content first + debounce progress sync
6. Add sync guard to Index.tsx

