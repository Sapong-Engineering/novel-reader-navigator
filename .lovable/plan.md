

## Sync Architecture Overhaul

### Current Problems
1. **Novel scrape doesn't save to cloud in parallel** — scraping happens client-side, saves to localStorage first, then syncs to backend as an afterthought
2. **Other devices don't auto-load synced content** — chapter content is excluded from sync fetches for speed, but there's no mechanism to pull it on demand reliably
3. **No automatic novel updates** — once scraped, a novel's chapter list is never refreshed from the source site
4. **No real cross-device sync trigger** — devices only sync on login/manual refresh, not proactively

### Plan

#### 1. Parallel save on initial scrape (frontend change)
**File: `src/pages/Index.tsx`**
- In `handleFetchNovel`, after `scrapeNovelInfo` returns, call `saveNovel` (local) and `syncNovel` (backend) in parallel using `Promise.all`
- This already partially happens but `syncNovel` is fire-and-forget. Make the UI wait for both to complete before navigating, ensuring the novel + all chapter metadata lands in the cloud before the user leaves

#### 2. Auto-load full library on new device (frontend change)
**File: `src/lib/sync-service.ts`**
- `syncLibraryFromBackend` already fetches novels + chapter metadata. This works. The gap is chapter **content** — currently skipped for speed
- Add a flag to `syncLibraryFromBackend` or a separate function `syncFullNovelFromBackend(novelLocalId)` that fetches chapter content when opening a novel on a new device
- **File: `src/pages/Reader.tsx`** — on load, if novel exists in backend but chapters lack content locally, call `fetchChapterContentFromBackend` to hydrate from cloud before falling back to scraping

#### 3. Cron job for automatic novel updates (new edge function + cron)
**New file: `supabase/functions/refresh-novels/index.ts`**
- A backend function that:
  1. Queries all distinct novel URLs from the `novels` table (using service role key)
  2. For each URL, calls the `scrape-novel` logic to get current chapter list
  3. Compares with existing chapters in DB
  4. Inserts any new chapters (metadata only — no content fetch to save Firecrawl credits)
  5. Updates `novels.updated_at`
- Scheduled via `pg_cron` + `pg_net` to run every 24 hours
- Rate-limited to avoid hammering Firecrawl (process novels sequentially with delays)

**Database: enable `pg_cron` and `pg_net` extensions, then schedule the job**

#### 4. Device sync on novel open (frontend change)
**File: `src/pages/Reader.tsx`**
- When opening a novel, fetch fresh chapter list from backend to pick up any cron-discovered new chapters
- Merge with local state (append new chapters, preserve existing content)
- This ensures all devices see new chapters within seconds of opening the reader

### Files to create/modify
- `src/pages/Index.tsx` — parallel save on scrape
- `src/pages/Reader.tsx` — sync on open, hydrate content from cloud
- `src/lib/sync-service.ts` — add `syncNovelFromBackend(localId)` for single-novel pull with content, add `refreshNovelChapters` helper
- `supabase/functions/refresh-novels/index.ts` — cron edge function for 24h novel refresh
- Database — enable `pg_cron`/`pg_net` extensions, create scheduled job

### Technical notes
- The cron function uses `SUPABASE_SERVICE_ROLE_KEY` (already configured as a secret) to bypass RLS
- New chapters discovered by cron get `sort_order` assigned based on their position in the freshly scraped list
- Firecrawl credit usage: ~1 credit per novel per day for the metadata scrape (no chapter content)
- The cron processes max ~50 novels per run with 2s delays to stay within Firecrawl rate limits

