&nbsp;

## Problem Analysis

Two issues identified:

### Issue 1: Chapters not syncing to backend after fetch

When a chapter is fetched individually via `handleSelectChapter` in `Reader.tsx` (line 103), `syncNovel` is called — this works. However, the `fetchAll` flow in `useChapterFetcher.ts` only calls `saveNovel` (localStorage) per chapter. The `syncNovel` call in `Reader.tsx` line 181 fires after the entire batch, but **individual chapter content is saved to localStorage during the batch without syncing**. If the user navigates away mid-fetch or the final sync fails, chapters are lost on other devices.

More critically: `syncNovel` calls `upsertNovelToBackend` which batch-upserts ALL chapters including content. This should work for the final call, but the 1000-row Supabase query limit could truncate large chapter lists. Also, `syncLibraryFromBackend` fetches chapter metadata only (no `content` column) for speed — so on another device, chapters appear but have no content, and on-demand fetch from backend `fetchChapterContentFromBackend`) requires content to have been synced.

**Root cause**: `upsertNovelToBackend` sends chapter content in the upsert, but for novels with many chapters, the batch upsert might silently fail or hit limits. Also, the `fetchAll` only syncs once at the end — if it fails, nothing is persisted to the backend.

### Issue 2: No manual sync button

Users can't force a re-sync.

## Plan

### 1. Make chapter fetching sync incrementally to backend

In `useChapterFetcher.ts`, accept an optional `onChapterFetched` callback. In `Reader.tsx`, pass a callback that syncs individual chapters to the backend immediately after fetch, rather than waiting for the entire batch.

Add a new `syncChapterToBackend` function in `sync-service.ts` that upserts a single chapter (more reliable than full-novel upsert for large novels).

### 2. Add manual sync button to toolbar

- Add a sync/refresh button to `NovelToolbar.tsx` (on both Index and Reader pages)

- On Index: triggers `syncLibraryFromBackend` 

- On Reader: triggers full `syncNovel` for the current novel

### 3. Batch upsert chunking

Split large chapter upserts in `upsertNovelToBackend` into chunks of 500 to avoid hitting Supabase limits.

### Files to modify

- `src/lib/sync-service.ts` — add `syncChapterToBackend`, chunk upserts

- `src/hooks/useChapterFetcher.ts` — add `onSyncChapter` callback parameter

- `src/pages/Reader.tsx` — pass sync callback to fetcher, add manual sync to toolbar

- `src/pages/Index.tsx` — add manual sync button

- `src/components/NovelToolbar.tsx` — add `onSync` prop and sync button

  
  
Plan: Add "Repair chapter order" to Reader Settings

Add a button to the existing `ReaderSettingsPopover` that re-sorts the current novel's chapters using `orderChapters`, saves to localStorage, and syncs to backend with corrected `sort_order` values.

### Changes

`**src/components/reader/ReaderSettingsPopover.tsx**`

- Accept two new props: `onRepairChapterOrder` callback and an optional `disabled` flag
- Add a new section after "Reset defaults" with a `Separator` and a "Repair chapter order" button (using `ArrowUpDown` or `ListOrdered` icon)
- Clicking it calls the callback

`**src/pages/Reader.tsx**`

- Add a `handleRepairChapterOrder` callback that:
  1. Takes current `novel.chapters`
  2. Runs `orderChapters()` on them
  3. Updates each chapter's position as the new canonical order
  4. Calls `saveNovel()` + `syncNovel()` to persist
  5. Updates state with `setNovel`
  6. Shows a toast: "Chapter order repaired"
- Pass it to `NovelToolbar` → `ReaderSettingsPopover`

`**src/components/NovelToolbar.tsx**`

- Accept `onRepairChapterOrder` prop and forward it to `ReaderSettingsPopover`