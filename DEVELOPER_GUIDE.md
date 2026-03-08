# NovelNav — Developer Guide

> Comprehensive technical documentation for the NovelNav web novel reader application.
> Last updated: 2026-03-08

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Flow Diagrams](#2-data-flow-diagrams)
3. [Database Schema](#3-database-schema)
4. [Edge Functions (Backend)](#4-edge-functions-backend)
5. [Key Modules & Libraries](#5-key-modules--libraries)
6. [React Hooks Reference](#6-react-hooks-reference)
7. [Context Providers](#7-context-providers)
8. [Feature Map](#8-feature-map)
9. [Troubleshooting Guide](#9-troubleshooting-guide)

---

## 1. Architecture Overview

### 1.1 Tech Stack

| Layer        | Technology                                                    |
|-------------|---------------------------------------------------------------|
| Frontend    | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui          |
| State       | React Context + React Query (`@tanstack/react-query`)         |
| Backend     | Supabase (Lovable Cloud) — Postgres + Edge Functions (Deno)   |
| Scraping    | Firecrawl API (called from Edge Functions)                    |
| Auth        | Supabase Auth (email/password)                                |
| Offline     | localStorage + offline queue with auto-replay                 |
| Export      | jsPDF (PDF), docx (DOCX), file-saver                         |
| PWA         | vite-plugin-pwa                                               |

### 1.2 Provider Hierarchy

```
<ErrorBoundary>
  <ThemeProvider>                    ← dark/light/system theme (next-themes)
    <AppSettingsProvider>            ← sync, notifications, refresh prefs (localStorage)
      <ReaderProvider>               ← font size, font family (CSS custom properties)
        <QueryClientProvider>        ← React Query cache
          <TooltipProvider>          ← Radix tooltip context
            <Toaster /> <Sonner />   ← Toast notifications
            <SyncErrorBanner />      ← Persistent sync error UI
            <BrowserRouter>          ← React Router v6
              <Routes>...</Routes>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ReaderProvider>
    </AppSettingsProvider>
  </ThemeProvider>
</ErrorBoundary>
```

### 1.3 Route Map

| Path               | Page Component | Purpose                              |
|--------------------|---------------|---------------------------------------|
| `/`                | `Index`       | Library grid, search, novel URL input |
| `/auth`            | `Auth`        | Sign up / sign in forms              |
| `/admin`           | `Admin`       | Admin dashboard (role-gated)         |
| `/reader/:novelId` | `Reader`      | Chapter reader with toolbar          |
| `*`                | `NotFound`    | 404 fallback                         |

### 1.4 Dual-Storage Architecture

NovelNav uses an **offline-first** architecture with two storage layers:

```
┌─────────────────────────────────────────────────────┐
│                   Client (Browser)                  │
│                                                     │
│  ┌──────────────┐     ┌────────────────────────┐   │
│  │ localStorage  │◄───►│   React State / Hooks   │   │
│  │  (offline     │     │  (novels, chapters,     │   │
│  │   cache)      │     │   bookmarks, progress)  │   │
│  └──────┬───────┘     └───────────┬────────────┘   │
│         │                         │                  │
│         │    ┌──────────────┐    │                  │
│         └───►│ Offline Queue │    │                  │
│              │ (pending ops) │    │                  │
│              └──────┬───────┘    │                  │
│                     │            │                  │
└─────────────────────┼────────────┼──────────────────┘
                      │            │
              ┌───────▼────────────▼──────────┐
              │     Supabase Backend           │
              │  ┌──────────┐  ┌───────────┐  │
              │  │ Postgres  │  │   Edge     │  │
              │  │ (novels,  │  │ Functions  │  │
              │  │ chapters, │  │ (scrape,   │  │
              │  │ progress) │  │  search,   │  │
              │  │           │  │  refresh)  │  │
              │  └──────────┘  └───────────┘  │
              └────────────────────────────────┘
```

**Key principle**: localStorage is the primary read source for speed; the backend is the source of truth for authenticated users. When offline, operations are queued and replayed when connectivity returns.

---

## 2. Data Flow Diagrams

### 2.1 Novel Discovery & Import

```
User enters URL or searches
          │
          ▼
┌──────────────────────┐
│  NovelUrlInput.tsx    │──── URL ────┐
│  NovelSearch.tsx      │──── query ──┤
└──────────────────────┘             │
                                      ▼
                          ┌───────────────────────┐
                          │  Edge Function:        │
                          │  scrape-novel/         │
                          │  search-novels/        │
                          │                        │
                          │  1. Check in-mem cache  │
                          │  2. Call Firecrawl API  │
                          │  3. Select adapter:     │
                          │     - WuxiaClick        │
                          │     - NovelBin          │
                          │     - Default           │
                          │  4. Extract novel info  │
                          │  5. Cache result        │
                          └───────────┬─────────────┘
                                      │
                        { title, description,
                          coverUrl, chapters[] }
                                      │
                                      ▼
                          ┌───────────────────────┐
                          │  Index.tsx             │
                          │                        │
                          │  1. Generate local ID   │
                          │  2. saveNovel()         │  ← localStorage
                          │  3. syncNovel()         │  ← backend (async)
                          └───────────────────────┘
```

### 2.2 Chapter Reading Flow

```
User selects chapter from ChapterList / MobileChapterDrawer
          │
          ▼
┌──────────────────────────────────────────┐
│  Reader.tsx  →  useChapterFetcher.ts     │
│                                          │
│  1. Check local novel.chapters[i].content│
│     ├─ HIT → render immediately          │
│     └─ MISS ──┐                          │
│               ▼                          │
│  2. fetchChapterContentFromBackend()     │
│     (sync-service.ts)                    │
│     ├─ HIT → save locally + render       │
│     └─ MISS ──┐                          │
│               ▼                          │
│  3. scrapeChapterContent()               │
│     (Edge Function: scrape-chapter/)     │
│     │                                    │
│     ▼                                    │
│  4. Save to local + sync to backend      │
│     - saveNovel() → localStorage         │
│     - syncChapterToBackend() → DB        │
│                                          │
│  5. Render in ReaderView.tsx             │
│     - Apply font size/family (CSS vars)  │
│     - data-para-index for TTS tracking   │
│     - Track reading progress             │
│     - Track reading stats                │
└──────────────────────────────────────────┘
```

### 2.3 Sync Architecture

```
┌─────── Online Path ─────────────────────────────────────────┐
│                                                              │
│  syncNovel(novel)                                            │
│    └─► getOrCreateNovelId()  ← novelUuidCache (Map)         │
│        └─► upsertNovelToBackend()                            │
│            ├─ UPDATE novels metadata                         │
│            └─ UPSERT chapters in 500-row chunks              │
│                                                              │
│  syncLibraryFromBackend()                                    │
│    ├─ fetchAllRows(novels) ← paginated (bypasses 1000 limit)│
│    ├─ fetchAllRows(chapters metadata only)                   │
│    ├─ Merge: backend order + local content                   │
│    ├─ Push local-only novels to backend                      │
│    └─ Deduplicate by URL                                     │
│                                                              │
│  syncProgressToBackend()                                     │
│    ├─ Debounced (2s) for scroll position                     │
│    └─ Immediate for last-read chapter changes                │
│                                                              │
│  syncBookmarksToBackend()                                    │
│    └─ DELETE all + INSERT current (full replace)             │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌─────── Offline Path ────────────────────────────────────────┐
│                                                              │
│  When !navigator.onLine:                                     │
│    enqueue(type, payload)  → localStorage 'offline_sync_queue'│
│    Types: syncNovel, deleteNovel, syncBookmarks, syncProgress│
│    Deduplication by type + key (e.g. syncNovel:novelId)      │
│                                                              │
│  When back online:                                           │
│    window 'online' event                                     │
│      └─► replayOfflineQueue()                                │
│          └─ dequeue() loop → execute each op → re-enqueue    │
│             on failure if still offline                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 2.4 Background Fetch Pipeline

```
startFetchAll(novel)
    │
    ├─ Filter unfetched chapters
    │
    ▼
BatchFetcher<Chapter>  (batchSize: 3)
    │
    ├─── Batch 1: [ch1, ch2, ch3]  ──── Promise.all ────┐
    ├─── Batch 2: [ch4, ch5, ch6]  ──── Promise.all ────┤
    ├─── ...                                             │
    │                                                     │
    │   For each chapter:                                 │
    │     RateLimiter.execute()   (2 req/s, 3 concurrent) │
    │       └─ withRetry()        (3 attempts, exp backoff)│
    │           └─ scrapeChapterContent(url)               │
    │               └─ Edge Function: scrape-chapter/      │
    │                                                      │
    │   On success:                                        │
    │     saveNovel() → localStorage                       │
    │     syncChapterToBackend() → DB                      │
    │     emit progress update                             │
    │                                                      │
    ▼                                                      │
subscribeFetchAll(listener)  ← React components listen    │
BackgroundFetchBanner.tsx    ← Shows progress bar          │
```

---

## 3. Database Schema

### 3.1 Entity-Relationship Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   profiles    │     │   novels     │     │    chapters      │
│──────────────│     │──────────────│     │──────────────────│
│ id (PK=auth) │     │ id (PK,uuid) │◄────│ novel_id (FK)    │
│ email        │     │ local_id     │     │ id (PK,uuid)     │
│ display_name │     │ user_id      │     │ local_id         │
│ disabled     │     │ title        │     │ user_id          │
│ created_at   │     │ url          │     │ title            │
│ updated_at   │     │ cover_url    │     │ url              │
└──────────────┘     │ description  │     │ content          │
                     │ saved_at     │     │ sort_order       │
┌──────────────┐     │ created_at   │     │ saved_at         │
│  user_roles   │     │ updated_at   │     │ created_at       │
│──────────────│     └──────┬───────┘     └──────────────────┘
│ id (PK,uuid) │            │
│ user_id      │            ├─────────────────────────────┐
│ role (enum)  │            │                             │
└──────────────┘     ┌──────▼───────┐     ┌──────────────▼───┐
                     │  bookmarks   │     │ reading_progress │
                     │──────────────│     │──────────────────│
                     │ id (PK,uuid) │     │ id (PK,uuid)     │
                     │ novel_id(FK) │     │ novel_id (FK)     │
                     │ user_id      │     │ user_id           │
                     │ chapter_*    │     │ chapter_local_id  │
                     │ scroll_pos   │     │ scroll_position   │
                     │ label        │     │ is_last_read      │
                     │ created_at   │     │ updated_at        │
                     └──────────────┘     └──────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  reading_stats   │  │  reading_lists   │  │reading_list_items│
│──────────────────│  │──────────────────│  │──────────────────│
│ id (PK,uuid)     │  │ id (PK,uuid)     │◄─│ list_id (FK)     │
│ user_id          │  │ user_id          │  │ id (PK,uuid)     │
│ date             │  │ name             │  │ user_id          │
│ reading_seconds  │  │ icon             │  │ novel_local_id   │
│ words_read       │  │ sort_order       │  │ added_at         │
│ chapters_read    │  │ created_at       │  └──────────────────┘
└──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌──────────────────┐
│ chapter_updates  │  │ admin_settings   │
│──────────────────│  │──────────────────│
│ id (PK,uuid)     │  │ key (PK,text)    │
│ user_id          │  │ value (jsonb)    │
│ novel_id (FK)    │  │ updated_by       │
│ novel_title      │  │ updated_at       │
│ chapter_count    │  └──────────────────┘
│ seen             │
│ discovered_at    │
└──────────────────┘
```

### 3.2 RLS Policy Summary

All tables have Row Level Security (RLS) enabled. Policies use `RESTRICTIVE` mode (deny by default).

| Table                | SELECT              | INSERT             | UPDATE             | DELETE             |
|---------------------|---------------------|--------------------|--------------------|---------------------|
| `novels`            | own + admin         | own                | own                | own + admin         |
| `chapters`          | own + admin         | own                | own                | own                 |
| `bookmarks`         | own                 | own                | own                | own                 |
| `reading_progress`  | own                 | own                | own                | own                 |
| `reading_stats`     | own                 | own                | own                | ✗ (not allowed)     |
| `reading_lists`     | own                 | own                | own                | own                 |
| `reading_list_items`| own                 | own                | ✗ (not allowed)    | own                 |
| `chapter_updates`   | own                 | own                | own                | own                 |
| `profiles`          | own + admin         | ✗ (trigger only)   | own + admin        | ✗ (not allowed)     |
| `admin_settings`    | admin + adapter keys| admin              | admin              | admin               |
| `user_roles`        | own + admin (ALL)   | admin              | admin              | admin               |

**"own"** = `auth.uid() = user_id`  
**"admin"** = `has_role(auth.uid(), 'admin')`  
**"adapter keys"** = public SELECT on keys matching `adapter_*` names

### 3.3 Key Design Patterns

- **`local_id` mapping**: Novels and chapters have both a `local_id` (generated client-side via `crypto.randomUUID()`) and a backend `id` (Postgres `gen_random_uuid()`). The `novelUuidCache` (`Map<string, string>`) maps `local_id → backend uuid` to avoid repeated lookups.
- **No FK to `auth.users`**: The `profiles` table mirrors auth user data via a `handle_new_user()` trigger. All other tables use a plain `user_id uuid` column.
- **Unique constraints**: `chapters` has a unique constraint on `(novel_id, local_id)` enabling upsert operations. `reading_progress` has one on `(user_id, novel_id, chapter_local_id)`.

### 3.4 Database Functions

| Function         | Type               | Purpose                                         |
|-----------------|--------------------|-------------------------------------------------|
| `has_role()`    | `SECURITY DEFINER` | Check if user has a specific role (avoids RLS recursion) |
| `handle_new_user()` | Trigger function | Auto-create `profiles` row on auth signup       |

### 3.5 Enums

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
```

---

## 4. Edge Functions (Backend)

All edge functions run on Deno and are deployed automatically. They handle CORS via a shared `corsHeaders` object.

### 4.1 `scrape-novel/`

**Purpose**: Scrape a novel page to extract title, description, cover URL, and chapter list.

**Flow**:
```
Request { url } → Cache check → Firecrawl API (markdown + links) → Adapter → Response
```

**Adapter Registry** (`supabase/functions/scrape-novel/adapters/types.ts`):

| Adapter         | File                       | URL Pattern          |
|----------------|----------------------------|----------------------|
| WuxiaClick     | `wuxiaclick-adapter.ts`    | `wuxia.click`        |
| NovelBin       | `novelbin-adapter.ts`      | `novelbin.com`       |
| Default        | `default-adapter.ts`       | Fallback (any URL)   |

Each adapter implements `extractNovelInfo({ baseUrl, markdown, links, metadata })` → `NovelInfo`.

**Caching**: In-memory `Cache` class (`shared/cache.ts`) with TTL. Key derived from URL.

### 4.2 `scrape-chapter/`

**Purpose**: Scrape a single chapter page for its text content.

**Flow**:
```
Request { url } → Cache check → Firecrawl API (markdown) → cleanChapterContent() → Response
```

**Content cleaning** (`shared/chapter-cleaner.ts`): Strips navigation elements, branding, breadcrumbs, and ads from the scraped markdown.

### 4.3 `search-novels/`

**Purpose**: Search for novels across enabled source sites.

**Flow**:
```
Request { query }
  → Read admin_settings for enabled adapters
  → Build Firecrawl search query with site: filters
  → Filter results (exclude chapter pages, utility pages, duplicates)
  → Response
```

**Admin-configurable sources** via `admin_settings` table:
- `adapter_wuxiaclick` → `wuxia.click`
- `adapter_novelbin` → `novelbin.com`
- `adapter_empirenovel` → `empirenovel.com`

### 4.4 `refresh-novels/`

**Purpose**: Batch-refresh novels to discover new chapters. Designed for periodic/cron invocation.

**Flow**:
```
1. Query novels not updated within interval_hours (default: 24h, max 50)
2. For each novel:
   a. Call scrape-novel/ to get current chapter list
   b. Compare with existing chapters (paginated fetch)
   c. INSERT new chapters with sort_order
   d. INSERT chapter_updates notification record
   e. UPDATE novel.updated_at timestamp
   f. Rate limit: 2s delay between novels
```

**Inputs**: `{ interval_hours?: number }` (1–168, default 24)

### 4.5 `admin-api/`

**Purpose**: Centralized admin API handling user management, content moderation, analytics, and system settings.

**Auth**: Two-step verification:
1. Extract caller identity via user-scoped Supabase client (`Authorization` header)
2. Check `user_roles` table for `admin` role using service-role client

**Flow**:
```
Request { action, ...params }
  → Verify JWT (user client)
  → Check admin role (service-role client)
  → Route to action handler
  → Response { success, data }
```

**Available Actions**:

| Action            | Params                | Purpose                                              |
|-------------------|-----------------------|------------------------------------------------------|
| `stats`           | —                     | Returns `totalUsers`, `totalNovels`, `totalChapters` (aggregate counts) |
| `list-users`      | —                     | All profiles with novel counts and role assignments  |
| `toggle-user`     | `userId`, `disabled`  | Enable/disable a user account via `profiles.disabled`|
| `list-all-novels` | —                     | All novels with owner email (FK join with fallback)  |
| `delete-novel`    | `novelId`             | Cascade delete: chapters → bookmarks → progress → novel |
| `set-role`        | `userId`, `role`      | Upsert role assignment (`admin`, `moderator`, `user`)|
| `remove-role`     | `userId`, `role`      | Delete specific role assignment                      |
| `get-settings`    | —                     | Read all `admin_settings` as key-value map           |
| `update-setting`  | `key`, `value`        | Upsert setting with `updated_by` audit trail         |

**Delete cascade order** (for `delete-novel`):
```
1. DELETE chapters WHERE novel_id = X
2. DELETE bookmarks WHERE novel_id = X
3. DELETE reading_progress WHERE novel_id = X
4. DELETE novels WHERE id = X
```

**Admin Settings keys** (stored in `admin_settings` table):

| Key                    | Type    | Purpose                                    |
|------------------------|---------|--------------------------------------------|
| `adapter_wuxiaclick`   | boolean | Enable/disable WuxiaClick scraping source  |
| `adapter_novelbin`     | boolean | Enable/disable NovelBin scraping source    |
| `adapter_empirenovel`  | boolean | Enable/disable EmpireNovel scraping source |
| *(extensible)*         | jsonb   | Any future admin-configurable setting      |

### 4.6 Required Secrets

| Secret               | Used By                           |
|-----------------------|-----------------------------------|
| `FIRECRAWL_API_KEY`   | scrape-novel, scrape-chapter, search-novels, refresh-novels |
| `SUPABASE_URL`        | refresh-novels, search-novels, admin-api |
| `SUPABASE_SERVICE_ROLE_KEY` | refresh-novels, search-novels, admin-api |

---

## 5. Key Modules & Libraries

### 5.1 `src/lib/novel-store.ts` — Local Novel Storage

localStorage CRUD for the novel library.

| Function      | Purpose                                      |
|--------------|----------------------------------------------|
| `getLibrary()` | Read all novels from `novel-reader-library` key |
| `saveNovel()`  | Insert or update a novel in the library       |
| `getNovel(id)` | Find a novel by local ID                      |
| `deleteNovel()`| Remove a novel from localStorage              |
| `generateId()` | `crypto.randomUUID()` wrapper                |
| `safePersist()`| Write with `QuotaExceededError` handling      |

### 5.2 `src/lib/sync-service.ts` — Bidirectional Sync

The core synchronization engine (620 lines). Handles all backend communication for novels, chapters, bookmarks, and progress.

**Key functions**:

| Function                       | Purpose                                                    |
|-------------------------------|------------------------------------------------------------|
| `syncLibraryFromBackend()`     | Full library sync — paginated fetch, merge, dedup          |
| `syncNovel(novel)`             | Push single novel + chapters to backend                    |
| `syncDeleteNovel(localId)`     | Delete novel from backend                                  |
| `syncChapterToBackend()`       | Push single chapter content to backend                     |
| `syncFullNovelFromBackend()`   | Pull full novel with chapter content from backend          |
| `fetchChapterContentFromBackend()` | Fetch single chapter's content from backend            |
| `syncProgressToBackend()`      | Debounced progress sync (2s delay, immediate for last-read)|
| `syncBookmarksToBackend()`     | Full-replace bookmark sync                                 |
| `replayOfflineQueue()`         | Process pending offline operations                         |

**Internal helpers**:
- `fetchAllRows<T>()` — Paginated fetch that bypasses Supabase's 1000-row default limit
- `resolveNovelUuid()` / `getOrCreateNovelId()` — Map `local_id` to backend UUID with in-memory cache
- `mergeChapters()` — Merge local content with backend chapter order
- `upsertNovelToBackend()` — Upsert novel metadata + chapters in 500-row chunks

### 5.3 `src/lib/offline-queue.ts` — Offline Persistence

Queues operations to localStorage when offline and replays them when connectivity returns.

| Export                   | Purpose                                          |
|--------------------------|--------------------------------------------------|
| `enqueue(type, payload)` | Add operation (deduplicates by type + key)       |
| `dequeue()`              | Pop next operation                                |
| `getQueueLength()`       | Count pending operations                          |
| `clearQueue()`           | Remove all queued operations                      |
| `peekAll()`              | View queue without consuming                      |
| `onConnectivityChange()` | Register online/offline listener                  |

**Operation types**: `syncNovel`, `deleteNovel`, `syncBookmarks`, `syncProgress`

### 5.4 `src/lib/storage-manager.ts` — Storage Quota & Progress

| Function                    | Purpose                                     |
|----------------------------|---------------------------------------------|
| `getQuota()`               | Estimate storage usage (navigator.storage or localStorage) |
| `calculateNovelSize()`     | Calculate UTF-16 byte size of a novel       |
| `saveNovelWithQuotaCheck()`| Save with pre-flight quota check            |
| `saveReadingProgress()`    | Persist scroll position per chapter (localStorage) |
| `getReadingProgress()`     | Restore scroll position                     |
| `saveLastReadChapter()`    | Track last-read chapter per novel           |
| `getLastReadChapter()`     | Retrieve last-read chapter ID               |

### 5.5 `src/lib/background-fetch.ts` — Batch Chapter Fetching

Orchestrates fetching all unfetched chapters for a novel using the rate-limited batch pipeline.

**Global state** (singleton pattern):
- `_isFetching`, `_progress`, `_currentNovel`
- `subscribeFetchAll(listener)` — React components subscribe to progress updates
- `cancelFetchAll()` — Cancel ongoing fetch via `BatchFetcher.cancel()`

### 5.6 `src/lib/notify.ts` — Notification System

Multi-channel notification system:

```
notify(message, type)
    │
    ├─► saveNotification()  → localStorage history (max 50)
    ├─► toast[type]()       → Sonner toast (if notificationsEnabled)
    ├─► playNotificationSound() → Web Audio API two-tone chime (if soundEnabled)
    └─► showBrowserNotification() → Native Notification API (if enabled + tab hidden)
```

Also provides: `markAllRead()`, `clearNotificationHistory()`, `getUnreadCount()`, `subscribeNotifications()`.

### 5.7 `src/lib/bookmarks.ts` — Bookmark Storage

localStorage-backed bookmarks scoped per novel.

| Function              | Purpose                                    |
|-----------------------|--------------------------------------------|
| `getBookmarks(novelId)` | Get all bookmarks for a novel            |
| `addBookmark(data)`   | Create bookmark with auto-generated ID     |
| `removeBookmark(id)`  | Delete a bookmark                          |
| `isChapterBookmarked()` | Check if a chapter has any bookmarks     |
| `findNearbyBookmark()` | Find bookmark within tolerance of scroll pos |

### 5.8 `src/lib/export-service.ts` — Export Pipeline

Exports novels to PDF or DOCX with progress callbacks and abort support.

| Function                      | Output  | Library  |
|------------------------------|---------|----------|
| `exportToPdfWithProgress()`  | `.pdf`  | jsPDF    |
| `exportToDocxWithProgress()` | `.docx` | docx     |

Both yield to the UI thread between chapters via `setTimeout(0)`.

### 5.9 `src/lib/chapter-order.ts` — Chapter Sorting

Extracts chapter numbers from title/id/url using regex patterns and sorts numerically with `localeCompare` fallback.

### 5.10 `src/lib/validation.ts` — URL Validation

Input validation and sanitization for novel URLs.

| Function        | Purpose                                                     |
|----------------|-------------------------------------------------------------|
| `sanitizeUrl()` | Trim + auto-prefix `https://` if no protocol present       |
| `validateUrl()` | Full validation: malicious pattern check, protocol whitelist, length limit, domain requirement |

**Malicious patterns blocked**: `javascript:`, `data:`, `vbscript:`, `<script` tags.  
**Defaults**: `http:`/`https:` only, max 2048 chars, domain required.  
Returns `{ valid, error?, sanitized? }`.

### 5.11 `src/lib/export-utils.ts` — Simple Export (Legacy)

Synchronous export functions without progress tracking. Used as a simpler alternative to `export-service.ts`.

| Function          | Purpose                                           |
|-------------------|---------------------------------------------------|
| `exportToPdf()`   | Generate PDF with jsPDF (no progress/cancel)      |
| `exportToDocx()`  | Generate DOCX with docx library (no progress/cancel) |

**Difference from `export-service.ts`**: The `export-service.ts` version adds `onProgress` callbacks, `AbortSignal` cancellation, and `setTimeout(0)` yields between chapters. Use `export-service.ts` for large novels; `export-utils.ts` for quick single-chapter exports.

### 5.12 Utility Classes

| Class          | File                       | Purpose                                       |
|---------------|---------------------------|------------------------------------------------|
| `RateLimiter` | `src/lib/utils/rate-limiter.ts` | Token bucket rate limiter (2 req/s, 3 concurrent) |
| `BatchFetcher`| `src/lib/utils/batch-fetcher.ts`| Process items in parallel batches with cancel  |
| `withRetry()` | `src/lib/utils/retry-handler.ts`| Exponential backoff retry (3 attempts, respects Retry-After) |

---

## 6. React Hooks Reference

### 6.1 `useAuth()` — `src/hooks/useAuth.ts`

Returns `{ user, session, loading, signUp, signIn, signOut }`.

Listens to `supabase.auth.onAuthStateChange` and caches session state. All auth-gated features check `user` before making backend calls.

### 6.2 `useReadingStats(isReading)` — `src/hooks/useReadingStats.ts`

Tracks reading time and chapter completion.

- **Time tracking**: Increments a `secondsRef` counter every 1s while `isReading === true`. Flushes to `reading_stats` table every 60s and on cleanup.
- **Chapter tracking**: `recordChapterRead(wordCount)` increments `chapters_read` and `words_read` for today's date.
- **Upsert pattern**: Check for existing row by `(user_id, date)`, update or insert accordingly.

### 6.3 `useReadingLists()` — `src/hooks/useReadingLists.ts`

CRUD for reading lists with auto-seeding.

- **Default lists**: "Plan to Read" 📋, "Currently Reading" 📖, "Completed" ✅ — auto-created on first use.
- Returns: `{ lists, items, addToList, removeFromList, createList, renameList, deleteList, getNovelLists, getListNovelIds }`.

### 6.4 `useTTS(onChapterEnd?)` — `src/hooks/useTTS.ts`

Text-to-Speech using the Web Speech API (`speechSynthesis`).

- **Paragraph splitting**: Content split on `\n\n`
- **Voice selection**: Filters to English voices, defaults to system default
- **Speed control**: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
- **Auto-advance**: Calls `onChapterEnd` when the last paragraph finishes (if `autoAdvance` is true)
- **Paragraph highlighting**: `currentIndex` maps to `data-para-index` attributes in `ReaderView.tsx` with CSS class `.tts-active-paragraph`
- Returns: `{ isPlaying, isPaused, currentIndex, play, pause, stop, jumpTo, speed, setSpeed, voices, ... }`

### 6.5 `useImmersiveMode()` — `src/hooks/useImmersiveMode.ts`

Distraction-free reading mode with ambient sounds.

- **Ambient sounds**: rain, fireplace, cafe (loaded from freesound.org CDN)
- **Controls auto-hide**: Overlay controls fade after 3s, reappear on mouse movement
- **Volume control**: 0–1 range, default 0.4
- **Audio lifecycle**: `HTMLAudioElement` with `loop: true`, cleaned up on exit/unmount
- Returns: `{ isImmersive, ambientSound, setAmbientSound, volume, setVolume, enter, exit, toggleImmersive, controlsVisible, showControls }`

### 6.6 `useBookmarks(novelId)` — `src/hooks/useBookmarks.ts`

Wrapper around `src/lib/bookmarks.ts` with React state. Refreshes on add/remove.

### 6.7 `useChapterNavigation(chapters, activeChapter, onSelectChapter)` — `src/hooks/useChapterNavigation.ts`

Provides `goToPrev`, `goToNext`, `hasPrev`, `hasNext`. Registers keyboard listeners for `ArrowLeft` / `ArrowRight` (skips when input/textarea focused).

### 6.8 `useReadingProgress(novelId, chapterId)` — `src/hooks/useReadingProgress.ts`

Debounced (500ms) scroll position saving to localStorage. Restores scroll on chapter load.

### 6.9 `useSyncStatus()` — `src/hooks/useSyncStatus.ts`

Returns current `SyncState`: `'idle' | 'syncing' | 'done' | 'error'`. Global singleton broadcasting via `Set<listener>`. `'done'` auto-transitions to `'idle'` after 2s.

### 6.10 `useChapterSearch()` — `src/hooks/useChapterSearch.ts`

Filter chapters by title search query.

### 6.11 `useChapterFetcher()` — `src/hooks/useChapterFetcher.ts`

Manages the chapter content loading flow (local → backend → scrape).

---

## 7. Context Providers

### 7.1 `ThemeContext` — `src/contexts/ThemeContext.tsx`

Wraps `next-themes` `ThemeProvider` with a custom bridge context.

| Property       | Type                     | Purpose                |
|---------------|--------------------------|------------------------|
| `theme`       | `string \| undefined`    | Current theme name     |
| `setTheme()`  | `(theme: string) => void`| Set specific theme     |
| `toggleTheme()`| `() => void`            | Toggle dark ↔ light    |
| `resolvedTheme`| `string \| undefined`   | Resolved system theme  |

**Storage**: `localStorage['novel-reader-theme']`

### 7.2 `AppSettingsContext` — `src/contexts/AppSettingsContext.tsx`

Application-wide preference toggles.

| Setting                    | Type      | Default | Purpose                           |
|---------------------------|-----------|---------|-----------------------------------|
| `syncEnabled`             | `boolean` | `true`  | Enable/disable backend sync       |
| `notificationsEnabled`    | `boolean` | `true`  | Enable in-app toast notifications |
| `notifyNewChapters`       | `boolean` | `true`  | Show new chapter notifications    |
| `autoFetchNewChapters`    | `boolean` | `false` | Auto-fetch new chapter content    |
| `refreshIntervalHours`    | `number`  | `24`    | Novel refresh interval            |
| `soundEnabled`            | `boolean` | `true`  | Play notification sounds          |
| `browserNotificationsEnabled`| `boolean`| `false`| Use native browser Notification API|

**Storage**: `localStorage['novel-app-settings']`

### 7.3 `ReaderContext` — `src/contexts/ReaderContext.tsx`

Reader display preferences, applied as CSS custom properties.

| Setting      | Type       | Default      | CSS Variable             |
|-------------|------------|--------------|--------------------------|
| `fontSize`  | `number`   | `16`         | `--reader-font-size`     |
| `fontFamily`| `string`   | `'serif'`    | `--reader-font-family`   |

**Range**: fontSize clamped to 12–24px  
**Storage**: `localStorage['novel-reader-settings']`

---

## 8. Feature Map

### 8.1 Core Features

| Feature            | Components                                       | Hooks/Modules                        |
|-------------------|--------------------------------------------------|--------------------------------------|
| Novel Import      | `NovelUrlInput`, `NovelSearch`                   | `scrapeNovelInfo()`, `searchNovels()`|
| Chapter Reading   | `ReaderView`, `ChapterList`, `MobileChapterDrawer`| `useChapterFetcher`, `useChapterNavigation` |
| Library           | `NovelCard`, `Index.tsx`                          | `novel-store.ts`, `sync-service.ts`  |
| Bookmarks         | Integrated in `Reader.tsx`                        | `useBookmarks`, `bookmarks.ts`       |
| Export            | Toolbar actions                                   | `export-service.ts`                  |
| Settings          | `SettingsPanel`, `ReaderSettingsPopover`           | `AppSettingsContext`, `ReaderContext` |

### 8.2 Reading Enhancement Features

| Feature            | Components                      | Hooks                    | Backend Table       |
|-------------------|---------------------------------|--------------------------|---------------------|
| Reading Lists     | `ReadingListManager`, `AddToListMenu` | `useReadingLists`   | `reading_lists`, `reading_list_items` |
| Reading Stats     | `ReadingStats`                  | `useReadingStats`        | `reading_stats`     |
| TTS               | `TTSControls`                   | `useTTS`                 | —                   |
| Immersive Mode    | `ImmersiveOverlay`              | `useImmersiveMode`       | —                   |
| Notifications     | `NotificationCenter`            | —                        | `chapter_updates`   |
| Background Fetch  | `BackgroundFetchBanner`         | —                        | — (uses edge functions) |
| Chapter Search    | Part of `ChapterList`           | `useChapterSearch`       | —                   |

### 8.3 Admin Features

| Feature              | Component                      | Backend              |
|---------------------|--------------------------------|----------------------|
| User Management     | `admin/UserManagement`         | `profiles`, `user_roles`, `admin-api` |
| Content Moderation  | `admin/ContentModeration`      | `novels`, `chapters`, `admin-api` |
| Analytics           | `admin/Analytics`              | `reading_stats`, `admin-api` |
| Preferences         | `admin/AdminPreferences`       | `admin_settings`     |

---

## 9. Troubleshooting Guide

### 9.1 Novel Scraping Fails

**Symptom**: "Failed to scrape novel" or "Firecrawl not configured" error.

**Checklist**:
1. **Check `FIRECRAWL_API_KEY` secret** — Must be set in Lovable Cloud secrets. Verify it's a valid key.
2. **Check edge function logs** — Look for `Firecrawl error:` log entries.
3. **URL format** — Ensure the URL points to a novel's main page (not a chapter page). The URL is auto-prefixed with `https://` if missing.
4. **Adapter coverage** — If the site isn't WuxiaClick or NovelBin, the default adapter attempts generic extraction. It may not work well on all sites.
5. **Cache** — Stale cached results may return old data. In-memory cache clears on edge function cold start.

**Files**: `supabase/functions/scrape-novel/index.ts`, `src/lib/api/firecrawl.ts`

### 9.2 Chapter Content Not Loading

**Symptom**: Blank chapter view, or perpetual loading spinner.

**Checklist**:
1. **Fetch cascade**: The system tries three sources in order:
   - Local cache (`novel.chapters[i].content`)
   - Backend DB (`fetchChapterContentFromBackend()`)
   - Live scrape (`scrapeChapterContent()` edge function)
2. **Check console** for `Failed to fetch chapter content from backend:` or `Failed to scrape chapter`.
3. **Content cleaning** may strip too aggressively — check `shared/chapter-cleaner.ts`.
4. **Rate limiting** — If fetching many chapters, the `RateLimiter` (2 req/s, 3 concurrent) may cause delays. This is by design to avoid API throttling.

**Files**: `src/hooks/useChapterFetcher.ts`, `src/lib/sync-service.ts:399–421`, `supabase/functions/scrape-chapter/index.ts`

### 9.3 Sync Not Working

**Symptom**: Data doesn't appear on other devices, sync indicator shows error.

**Checklist**:
1. **Auth required** — Sync only works for authenticated users. Check `useAuth().user` is not null.
2. **Sync enabled** — Verify `AppSettings.syncEnabled` is `true` (check `localStorage['novel-app-settings']`).
3. **`isSyncEnabled()`** — Called at the top of every sync function (`src/lib/notify.ts:159`). Returns `false` if sync is disabled.
4. **Network** — If offline, operations are queued in `localStorage['offline_sync_queue']`. Check `getQueueLength()`.
5. **RLS policies** — Ensure the user_id in the token matches the data's user_id. Use console to check for `403` or `new row violates row-level security` errors.
6. **1000-row limit** — The sync system uses `fetchAllRows()` with pagination. If chapters seem to be missing, verify paginated fetch is working (check for range errors in network tab).
7. **UUID cache stale** — If a novel was deleted and re-added, `novelUuidCache` may have stale entries. Signing out and back in clears the cache.

**Files**: `src/lib/sync-service.ts`, `src/hooks/useSyncStatus.ts`, `src/lib/offline-queue.ts`

### 9.4 Storage Quota Exceeded

**Symptom**: "Storage is full" toast, or novels failing to save silently.

**Checklist**:
1. **localStorage limit** — Most browsers allow ~5–10MB. Novel content is stored as UTF-16 (2 bytes per character).
2. **Check quota**: Call `getQuota()` from `src/lib/storage-manager.ts` in the console.
3. **Remove unused novels** — Each novel with all chapters can consume several MB.
4. **`safePersist()`** in `novel-store.ts` catches `QuotaExceededError` and shows a toast.
5. **`saveNovelWithQuotaCheck()`** in `storage-manager.ts` does a pre-flight check before writing.

**Files**: `src/lib/novel-store.ts:24–36`, `src/lib/storage-manager.ts`

### 9.5 Chapters Out of Order

**Symptom**: Chapters appear in wrong sequence.

**Checklist**:
1. **sort_order** — Backend chapters have `sort_order` (integer). Set during initial sync.
2. **`chapter-order.ts`** — Extracts chapter numbers via regex from title/id/url. Falls back to `localeCompare`.
3. **Backend vs. local ordering** — Backend `sort_order` takes priority during sync. Local-only chapters are appended at the end.
4. **Tie-breaking** — If `sort_order` values are equal, `compareChapterOrder()` uses natural number extraction.

**Files**: `src/lib/chapter-order.ts`, `src/lib/sync-service.ts:221–228`

### 9.6 TTS Not Working

**Symptom**: No audio when playing TTS, or voice list is empty.

**Checklist**:
1. **Browser support** — `speechSynthesis` API is not available in all browsers. Check `'speechSynthesis' in window`.
2. **Voice loading** — Voices load asynchronously. The hook listens for `voiceschanged` event.
3. **English filter** — Only voices with `lang.startsWith('en')` are shown. Non-English users see no voices.
4. **Chrome bug** — Chrome sometimes requires a user gesture before `speechSynthesis.speak()` works. The play button click should satisfy this.
5. **Content format** — Content is split on `\n\n`. If chapter content uses `\n` (single newlines), paragraphs won't split correctly.

**Files**: `src/hooks/useTTS.ts`, `src/components/reader/TTSControls.tsx`

### 9.7 Notifications Not Appearing

**Symptom**: No toasts, no notification bell updates.

**Checklist**:
1. **`notificationsEnabled`** — Check `AppSettings.notificationsEnabled` is `true`.
2. **`notifyNewChapters`** — Specifically for chapter update notifications.
3. **Browser Notifications** — Requires explicit permission via `Notification.requestPermission()`. Check `browserNotificationsEnabled` setting.
4. **Chapter updates** — The `refresh-novels/` edge function inserts `chapter_updates` rows. If it hasn't run, there's nothing to notify about.
5. **Sound** — Requires `AudioContext`. Some browsers block audio until user interaction.

**Files**: `src/lib/notify.ts`, `src/components/NotificationCenter.tsx`, `src/contexts/AppSettingsContext.tsx`

### 9.8 Admin Panel Access Denied

**Symptom**: Admin page shows access denied or redirects.

**Checklist**:
1. **Role assignment** — User must have a row in `user_roles` with `role = 'admin'`.
2. **`has_role()` function** — `SECURITY DEFINER` function that bypasses RLS. If it doesn't exist, all admin policies will fail.
3. **Check role assignment**: Query `user_roles` table directly (requires service role key or admin access).
4. **Never check admin status client-side** — Always verified via RLS policies and `has_role()`.

**Files**: `src/pages/Admin.tsx`, `src/lib/api/admin.ts`, `supabase/functions/admin-api/index.ts`

### 9.9 Background Fetch Stalls

**Symptom**: Fetch-all progress bar stops advancing.

**Checklist**:
1. **Rate limiter exhaustion** — The `RateLimiter` allows 2 req/s with 3 concurrent. Large backlogs will be slow.
2. **Retry exhaustion** — `withRetry()` attempts 3 times with exponential backoff (1s, 2s, 4s). After 3 failures, the chapter is skipped.
3. **Cancel state** — Check if `batchFetcher.cancel()` was called (e.g., navigating away).
4. **Firecrawl rate limits** — The Firecrawl API may return `429`. The retry handler respects `Retry-After` headers.
5. **Console logs** — Look for `[timestamp] Retry attempt X/Y after Zms` messages.

**Files**: `src/lib/background-fetch.ts`, `src/lib/utils/rate-limiter.ts`, `src/lib/utils/retry-handler.ts`, `src/lib/utils/batch-fetcher.ts`

### 9.10 Common Error Messages

| Error Message | Source | Likely Cause |
|--------------|--------|-------------|
| `"Storage is full. Consider removing some novels..."` | `novel-store.ts:30` | localStorage quota exceeded |
| `"Firecrawl not configured"` | Edge functions | `FIRECRAWL_API_KEY` secret missing |
| `"Failed to sync novel to backend"` | `sync-service.ts:368` | Network error or RLS violation |
| `"Failed after N attempts"` | `retry-handler.ts:83` | Repeated scraping failures |
| `"Query must be at least 2 characters"` | `search-novels/` | Search query too short |
| `"All adapters are disabled"` | `search-novels/` | All sources disabled in admin |

### 9.11 Debug Checklist

1. **Console errors** — Open browser DevTools → Console. Filter for `[sync]`, `[refresh]`, `Retry attempt`.
2. **Network tab** — Filter for `/functions/v1/` to see edge function calls and responses.
3. **localStorage inspection** — Check keys: `novel-reader-library`, `offline_sync_queue`, `novel-app-settings`, `bookmarks:*`, `reading-progress:*`, `last-read:*`.
4. **Edge function logs** — Available in Lovable Cloud backend view.
5. **Sync state** — Import `useSyncStatus` and check current state, or look for `SyncIndicator` in the UI.

---

## Appendix: File Index

### Core Library (`src/lib/`)

| File                  | Lines | Purpose                          |
|-----------------------|-------|----------------------------------|
| `novel-store.ts`      | 69    | localStorage novel CRUD          |
| `sync-service.ts`     | 620   | Backend sync engine              |
| `offline-queue.ts`    | 95    | Offline operation queue          |
| `storage-manager.ts`  | 137   | Storage quota + reading progress |
| `background-fetch.ts` | 102   | Batch chapter fetcher            |
| `notify.ts`           | 201   | Multi-channel notifications      |
| `bookmarks.ts`        | 67    | Bookmark localStorage CRUD       |
| `chapter-order.ts`    | 38    | Chapter sorting logic            |
| `export-service.ts`   | 121   | PDF/DOCX export pipeline         |
| `validation.ts`       | —     | Input validation utilities       |
| `api/firecrawl.ts`    | 74    | Edge function client wrappers    |
| `api/admin.ts`        | —     | Admin API client                 |
| `utils/rate-limiter.ts`| 80   | Token bucket rate limiter        |
| `utils/batch-fetcher.ts`| 78  | Parallel batch processor         |
| `utils/retry-handler.ts`| 88  | Exponential backoff retry        |

### Hooks (`src/hooks/`)

| File                      | Purpose                        |
|--------------------------|--------------------------------|
| `useAuth.ts`             | Authentication state           |
| `useReadingStats.ts`     | Time/chapter tracking          |
| `useReadingLists.ts`     | Reading list CRUD              |
| `useTTS.ts`              | Text-to-Speech                 |
| `useImmersiveMode.ts`    | Immersive reading mode         |
| `useBookmarks.ts`        | Bookmark management            |
| `useChapterNavigation.ts`| Prev/next + keyboard nav       |
| `useChapterFetcher.ts`   | Chapter content loading        |
| `useChapterSearch.ts`    | Chapter title filtering        |
| `useReadingProgress.ts`  | Scroll position persistence    |
| `useSyncStatus.ts`       | Sync state broadcasting        |

### Edge Functions (`supabase/functions/`)

| Function          | Purpose                            |
|-------------------|------------------------------------|
| `scrape-novel/`   | Scrape novel metadata + chapters   |
| `scrape-chapter/` | Scrape single chapter content      |
| `search-novels/`  | Multi-source novel search          |
| `refresh-novels/` | Batch refresh + new chapter alerts |
| `admin-api/`      | Admin operations                   |
