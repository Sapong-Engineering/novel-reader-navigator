

## Plan: Comprehensive Developer Documentation

Create a single `DEVELOPER_GUIDE.md` file at the project root containing full architectural documentation, data flow diagrams (ASCII), component maps, and a troubleshooting guide.

### Document Structure

**1. Architecture Overview**
- High-level description of the dual-storage (localStorage + backend), offline-first architecture
- Provider hierarchy: `ThemeProvider > AppSettingsProvider > ReaderProvider > QueryClientProvider > TooltipProvider`
- Route map: `/` (Index), `/auth` (Auth), `/admin` (Admin), `/reader/:novelId` (Reader), `*` (NotFound)

**2. Data Flow Diagrams** (ASCII art)
- Novel lifecycle: URL input -> `scrape-novel` edge function (Firecrawl + adapter registry) -> localStorage + backend sync
- Chapter fetch: user selects chapter -> check backend content -> fallback to `scrape-chapter` edge function -> save locally + sync
- Sync architecture: localStorage as primary cache, backend as source of truth for authenticated users, offline queue for retry
- Background fetch: `BatchFetcher` + `RateLimiter` + `withRetry` pipeline

**3. Database Schema**
- All 9 tables documented: `novels`, `chapters`, `bookmarks`, `reading_progress`, `reading_stats`, `reading_lists`, `reading_list_items`, `chapter_updates`, `admin_settings`, `profiles`, `user_roles`
- RLS policy summary per table
- Key relationships (local_id mapping pattern since no FK to auth.users)

**4. Edge Functions**
- `scrape-novel`: Firecrawl API + adapter registry (WuxiaClick, NovelBin, Default) + in-memory cache
- `scrape-chapter`: Firecrawl API + chapter-cleaner + in-memory cache
- `search-novels`: Multi-source search with admin-configurable adapters
- `refresh-novels`: Cron-style batch refresh, inserts `chapter_updates` for notifications
- `admin-api`: Admin operations

**5. Key Modules & Hooks**
- `novel-store.ts`: localStorage CRUD for novels
- `sync-service.ts`: Bidirectional sync (paginated fetch, UUID cache, debounced progress, offline queue integration)
- `offline-queue.ts`: Persisted queue with dedup and replay
- `storage-manager.ts`: Quota detection, reading progress, last-read tracking
- `background-fetch.ts`: Batch chapter fetching with rate limiting
- Hooks: `useAuth`, `useReadingStats`, `useReadingLists`, `useTTS`, `useImmersiveMode`, `useBookmarks`, `useChapterNavigation`, `useReadingProgress`, `useSyncStatus`

**6. Feature Map**
- Reading Lists, Reading Stats (streak tracker), TTS (Web Speech API), Immersive Mode (ambient sounds), Notifications, Bookmarks, Export (PDF/DOCX), Chapter search, Background fetch-all

**7. Context Providers**
- `ThemeContext`: dark/light/system via next-themes
- `AppSettingsContext`: sync, notification, refresh preferences in localStorage
- `ReaderContext`: font size, font family with CSS custom properties

**8. Troubleshooting Guide**
- Common issues: Firecrawl API key missing, CORS errors, storage quota exceeded, sync failures, chapter ordering, offline behavior, TTS voice unavailability
- Debug checklist per issue with specific file/function references
- How to check edge function logs, console errors, network requests
- RLS policy gotchas

### Files Created
| File | Action |
|------|--------|
| `DEVELOPER_GUIDE.md` | Create — full developer documentation |

### Implementation Notes
- All diagrams use ASCII art (no Mermaid in the markdown file for portability)
- Cross-references to exact file paths throughout
- Troubleshooting entries link to specific functions and error messages

