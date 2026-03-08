

## Plan: Five Niche Reading Features

### Feature 1: Reading Statistics & Streak Tracker

**What**: Track daily reading time, chapters read, and words consumed. Show a GitHub-style contribution calendar and streak counter.

**Database**: New `reading_stats` table:
- `id`, `user_id`, `date` (date), `reading_seconds` (int), `chapters_read` (int), `words_read` (int)
- Unique constraint on `(user_id, date)`, RLS per user
- Upsert daily — increment on each session

**Frontend**:
- New `src/hooks/useReadingStats.ts` — tracks time spent reading via a `setInterval` while a chapter is active in ReaderView. On chapter completion (navigating to next), increments `chapters_read`. Estimates `words_read` from chapter content length. Debounce-syncs to backend every 60s and on unmount.
- New `src/components/ReadingStats.tsx` — a sheet/dialog accessible from Index page toolbar showing:
  - Current streak (consecutive days with >0 reading)
  - Today's reading time
  - A 12-week contribution grid (colored squares per day, intensity by minutes read)
  - Total chapters / words read stats
- Uses recharts for optional bar chart of weekly reading time

**Integration**: Add stats icon button to Index page top bar, next to Settings.

---

### Feature 2: Chapter Update Notifications (Automated Polling)

**What**: The existing `refresh-novels` cron edge function already checks for new chapters. This feature closes the loop by recording discovered chapters and surfacing them in the notification center.

**Database**: New `chapter_updates` table:
- `id`, `user_id`, `novel_id`, `chapter_count` (int), `discovered_at` (timestamptz), `seen` (bool default false)
- RLS per user

**Backend**: Modify `supabase/functions/refresh-novels/index.ts` to insert a row into `chapter_updates` when new chapters are found for a user's novel.

**Frontend**:
- Extend `src/components/NotificationCenter.tsx` to fetch from `chapter_updates` where `seen = false` and display "X new chapters found for Novel Title" entries.
- Mark as seen on click, navigate to reader.
- If `appSettings.notifyNewChapters` is on, trigger a browser notification via the existing `notify()` system.

---

### Feature 3: Reading Lists / Collections

**What**: Let users organize novels into custom collections like "Plan to Read", "Currently Reading", "Completed", plus custom lists.

**Database**: Two new tables:
- `reading_lists`: `id`, `user_id`, `name` (text), `icon` (text, optional emoji), `sort_order` (int), `created_at`
- `reading_list_items`: `id`, `list_id` (FK → reading_lists), `novel_id` (text — the local novel ID), `user_id`, `added_at`
- RLS per user on both
- Seed 3 default lists on first use via frontend logic

**Frontend**:
- New `src/hooks/useReadingLists.ts` — CRUD for lists and items
- New `src/components/ReadingListManager.tsx` — a sheet showing lists with drag-to-reorder (or simple up/down), add/rename/delete list
- Modify `src/pages/Index.tsx` — add a filter/tab bar above the library grid to filter by list. Add a "Add to list" dropdown on `NovelCard` hover menu.
- New `src/components/AddToListMenu.tsx` — dropdown with checkboxes for each list

---

### Feature 6: Text-to-Speech (TTS)

**What**: Built-in browser TTS using the Web Speech API (no API key needed). Includes play/pause, speed control, voice selection, and auto-advance to next chapter.

**No backend changes needed** — uses `window.speechSynthesis` entirely client-side.

**Frontend**:
- New `src/hooks/useTTS.ts` — manages `SpeechSynthesisUtterance`, splits chapter text into paragraphs, tracks current paragraph index, handles play/pause/stop, speed (0.5x–2x), voice selection from `speechSynthesis.getVoices()`, auto-advance callback on chapter end.
- New `src/components/reader/TTSControls.tsx` — a floating/docked bar in the reader with:
  - Play/Pause/Stop buttons
  - Speed selector (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
  - Voice dropdown
  - Auto-advance toggle
  - Current paragraph indicator / progress
  - Highlights current paragraph being read in the reader prose
- Integrate into `ReaderView.tsx` — add TTS controls bar, pass chapter content to the hook, highlight active paragraph via a ref/class.

---

### Feature 10: Immersive Mode

**What**: A distraction-free reading mode that hides all chrome (toolbar, chapter sidebar, nav bar) and optionally plays ambient background sounds.

**Frontend**:
- New `src/hooks/useImmersiveMode.ts` — boolean toggle, stores preference in localStorage. Manages ambient audio playback (rain, fireplace, cafe) using `HTMLAudioElement` with looping. Uses royalty-free audio URLs or small embedded audio.
- New `src/components/reader/ImmersiveOverlay.tsx` — when active:
  - Fades out toolbar, sidebar, and bottom nav bar via CSS classes
  - Shows only the reader prose, full-width and full-height
  - A subtle floating pill at bottom-center with: exit button, ambient sound selector (off/rain/fireplace/cafe), volume slider
  - Tap/click anywhere shows controls briefly, then auto-hides after 3s
- Modify `src/pages/Reader.tsx` — add immersive mode state, conditionally hide sidebar/toolbar, render ImmersiveOverlay
- Add "Immersive Mode" button to `NovelToolbar.tsx` (an expand/maximize icon)
- Add ambient sound files as small MP3s in `/public/sounds/` (rain, fireplace, cafe — ~30s loops)
- CSS: Add `reader-immersive` class to root that transitions opacity of chrome elements

---

### Implementation Order

1. **Immersive Mode** — self-contained, UI-only, no DB
2. **TTS** — self-contained, no DB, enhances reader
3. **Reading Stats** — new table + hook + component
4. **Reading Lists** — two new tables + UI changes to Index
5. **Chapter Update Notifications** — extends existing edge function + notification center

### Summary of DB Migrations

```sql
-- reading_stats
CREATE TABLE public.reading_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  reading_seconds int NOT NULL DEFAULT 0,
  chapters_read int NOT NULL DEFAULT 0,
  words_read int NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);
ALTER TABLE public.reading_stats ENABLE ROW LEVEL SECURITY;
-- RLS: users own rows

-- reading_lists
CREATE TABLE public.reading_lists (...);
CREATE TABLE public.reading_list_items (...);
-- RLS on both

-- chapter_updates
CREATE TABLE public.chapter_updates (...);
-- RLS per user
```

### Files Created/Modified

| File | Action |
|------|--------|
| `src/hooks/useReadingStats.ts` | Create |
| `src/components/ReadingStats.tsx` | Create |
| `src/hooks/useReadingLists.ts` | Create |
| `src/components/ReadingListManager.tsx` | Create |
| `src/components/AddToListMenu.tsx` | Create |
| `src/hooks/useTTS.ts` | Create |
| `src/components/reader/TTSControls.tsx` | Create |
| `src/hooks/useImmersiveMode.ts` | Create |
| `src/components/reader/ImmersiveOverlay.tsx` | Create |
| `src/pages/Reader.tsx` | Modify — add TTS, immersive mode |
| `src/pages/Index.tsx` | Modify — add stats button, reading list tabs |
| `src/components/ReaderView.tsx` | Modify — TTS paragraph highlighting |
| `src/components/NovelToolbar.tsx` | Modify — add immersive mode button |
| `src/components/NovelCard.tsx` | Modify — add "Add to list" menu |
| `src/components/NotificationCenter.tsx` | Modify — show chapter updates |
| `supabase/functions/refresh-novels/index.ts` | Modify — insert chapter_updates |
| 3 new migrations | Create |

