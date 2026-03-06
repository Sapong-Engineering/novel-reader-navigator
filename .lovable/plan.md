

## Backend Persistence with Authentication

### Overview

Migrate all localStorage-based data (novels, chapters, bookmarks, reading progress) to Lovable Cloud database tables, with localStorage kept as an offline cache. Add email/password authentication so each user has their own synced library.

### Database Schema

Four tables, all with `user_id` referencing `auth.users(id)` and RLS policies:

```text
novels
├── id (uuid, PK)
├── user_id (uuid, NOT NULL, FK → auth.users)
├── title (text)
├── url (text)
├── cover_url (text, nullable)
├── description (text, nullable)
├── local_id (text)  -- maps to existing localStorage IDs
├── saved_at (timestamptz)
├── created_at (timestamptz, default now())
└── updated_at (timestamptz, default now())

chapters
├── id (uuid, PK)
├── novel_id (uuid, FK → novels, CASCADE)
├── user_id (uuid, NOT NULL, FK → auth.users)
├── local_id (text)  -- maps to existing localStorage chapter IDs
├── title (text)
├── url (text)
├── content (text, nullable)
├── saved_at (timestamptz, nullable)
├── created_at (timestamptz, default now())

bookmarks
├── id (uuid, PK)
├── user_id (uuid, NOT NULL, FK → auth.users)
├── novel_id (uuid, FK → novels, CASCADE)
├── chapter_local_id (text)
├── chapter_title (text)
├── scroll_position (float)
├── label (text, nullable)
├── created_at (timestamptz, default now())

reading_progress
├── id (uuid, PK)
├── user_id (uuid, NOT NULL, FK → auth.users)
├── novel_id (uuid, FK → novels, CASCADE)
├── chapter_local_id (text)
├── scroll_position (float)
├── is_last_read (boolean, default false)
├── updated_at (timestamptz, default now())
└── UNIQUE(user_id, novel_id, chapter_local_id)
```

RLS: Each table gets `SELECT/INSERT/UPDATE/DELETE` policies scoped to `auth.uid() = user_id`.

### Authentication

- Create `src/pages/Auth.tsx` with email/password sign-up and login forms (tabs)
- Add `/auth` route in `App.tsx`
- Create `src/hooks/useAuth.ts` for session management (`onAuthStateChange` + `getSession`)
- Redirect unauthenticated users to `/auth`, authenticated users away from `/auth`
- Do NOT enable auto-confirm -- users verify email first

### Sync Layer

Create `src/lib/sync-service.ts`:
- On login: pull all user data from backend → merge with localStorage (backend wins for conflicts)
- On novel save/chapter fetch/bookmark add: write to localStorage immediately, then upsert to backend
- On novel delete: remove from both
- If offline (network error on backend call): queue for retry, localStorage is source of truth
- Expose `syncLibrary()`, `syncNovel()`, `syncBookmark()`, `syncProgress()` functions

### Changes to Existing Files

**`src/lib/novel-store.ts`** -- Add async backend variants alongside existing localStorage functions. The sync service calls both.

**`src/lib/bookmarks.ts`** -- Add backend sync for add/remove operations.

**`src/lib/storage-manager.ts`** -- Add backend sync for reading progress and last-read chapter.

**`src/hooks/useBookmarks.ts`** -- Call sync service after localStorage writes.

**`src/hooks/useReadingProgress.ts`** -- Call sync service after saving progress.

**`src/pages/Index.tsx`** -- On mount, if authenticated, call `syncLibrary()` to merge backend data. Show user email and logout button.

**`src/pages/Reader.tsx`** -- After fetching a chapter, sync it to backend.

**`src/App.tsx`** -- Add `/auth` route, wrap routes with auth context.

### Build Error Fixes

1. **`scrape-novel/index.ts` line 91**: Duplicate `const cacheKey` -- remove the second declaration, reuse the existing variable.
2. **`useChapterFetcher.ts` line 69**: Add type annotation to the `BatchFetcher.process` callback parameter (`chapter: Chapter`).

### Implementation Order

1. Fix existing build errors (scrape-novel duplicate variable, useChapterFetcher types)
2. Create database migration (4 tables + RLS)
3. Create Auth page and useAuth hook
4. Create sync service
5. Wire sync into existing hooks and pages
6. Add logout button to Index page header

