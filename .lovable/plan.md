

## Issues to Fix

### 1. Duplicate novels in library
When a novel is fetched via URL, it always generates a new `id` via `generateId()` regardless of whether a novel with the same URL already exists. On sync, the `local_id` differs so it appears as a separate entry.

**Fix**: In `Index.tsx` `handleFetchNovel`, before creating a new novel, check if one with the same URL already exists in the library. If so, update it instead of creating a duplicate. Also in `syncLibraryFromBackend`, deduplicate by URL when merging remote and local novels.

### 2. Chapter navigation doesn't scroll to top
When `goToNext` or `goToPrev` is called, the `ReaderView` `useEffect` runs on `chapter?.id` change and calls `onChapterReady`, which restores saved progress. For fresh chapter navigations (next/prev), it should scroll to top instead of restoring a previous scroll position.

**Fix**: Add a `scrollToTop` ref/flag in `Reader.tsx`. Set it to `true` when next/prev is clicked. In `handleChapterReady`, if the flag is set, scroll to 0 instead of restoring progress.

### 3. No scroll-to-top / scroll-to-bottom buttons
**Fix**: Add a floating "Back to Top" button that appears when scrolled down, and a "Go to Bottom" button when near the top, inside `ReaderView`.

## Changes

### `src/pages/Index.tsx`
- In `handleFetchNovel`: check `library` for existing novel with same URL. If found, navigate to it instead of creating a duplicate.

### `src/lib/sync-service.ts`
- In `syncLibraryFromBackend`: after merging, deduplicate novels by URL (keep the one with more content/chapters fetched).

### `src/pages/Reader.tsx`
- Add a `forceScrollTopRef` that's set to `true` when `goToNext`/`goToPrev` triggers navigation.
- Wrap `handleSelectChapter` to accept an optional `scrollToTop` param, or create wrapper functions for prev/next that set the ref before calling the handler.
- In `handleChapterReady`: if `forceScrollTopRef.current` is true, scroll to 0 and reset the flag.

### `src/components/ReaderView.tsx`
- Add a floating "Back to Top" button (appears when `currentScrollTop > 300`).
- Add a "Go to Bottom" button (appears when near top, content is long enough).
- Both use `scrollRef.current.scrollTo({ top, behavior: 'smooth' })`.

