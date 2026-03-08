

## Plan: Aggregated Novel Search + Super Admin Panel

### Feature 1: Aggregated Novel Search

**What**: A search bar on the homepage that searches for novels by title across all supported sites (wuxia.click, novelbin.com, empirenovel.com) simultaneously, returning combined results the user can add to their library with one click.

**Backend — New Edge Function `search-novels`**:
- Create `supabase/functions/search-novels/index.ts`
- Accepts `{ query: string }` body
- Uses Firecrawl's search API to search across all supported sites: `site:wuxia.click OR site:novelbin.com OR site:empirenovel.com {query}`
- Parses results, extracts novel title, URL, cover, and source site
- Returns deduplicated results with site labels

**Frontend — Search UI on Index page**:
- Add a `src/components/NovelSearch.tsx` component with a search input and results dropdown/grid
- Shows search results as cards with title, source site badge, and "Add to Library" button
- "Add to Library" triggers the existing `handleFetchNovel` flow (scrape-novel → save)
- Add a tab or toggle on the homepage to switch between "Paste URL" and "Search" modes

**API layer**:
- Add `searchNovels(query: string)` to `src/lib/api/firecrawl.ts`

### Feature 2: Super Admin Panel

**Database Changes** (migration):
1. Create `app_role` enum: `('admin', 'moderator', 'user')`
2. Create `user_roles` table with RLS + `has_role()` security definer function
3. Create a `profiles` table (`id uuid PK → auth.users, email text, created_at`) with a trigger to auto-create on signup
4. Add RLS policies: admins can read all novels, chapters, profiles; regular users only their own

**Backend — Admin Edge Function `admin-api`**:
- `supabase/functions/admin-api/index.ts`
- Validates caller is admin via `has_role(uid, 'admin')`
- Endpoints (via action field):
  - `list-users`: Query profiles + user_roles, return user list with stats (novel count, chapter count, last active)
  - `toggle-user`: Disable/enable a user account (using admin API or a `disabled` column on profiles)
  - `list-all-novels`: All novels across users with owner info
  - `delete-novel`: Remove a novel by ID (admin override)
  - `stats`: Aggregate counts (total users, novels, chapters, storage usage)

**Frontend — Admin Pages**:
- `src/pages/Admin.tsx` — main admin layout with sidebar tabs
- `src/components/admin/UserManagement.tsx` — user table with search, disable/enable actions
- `src/components/admin/ContentModeration.tsx` — browse all novels/chapters, delete content
- `src/components/admin/Analytics.tsx` — dashboard with stats cards and charts (using recharts)
- Route: `/admin` in App.tsx, protected by role check
- Admin nav link visible only to admin users in the top bar

**Assigning Admin Role**:
- First admin assigned via a database insert (manual or migration seed)
- Subsequent admins can be promoted from the admin panel

### Files to Create/Edit

| Action | File |
|--------|------|
| Create | `supabase/functions/search-novels/index.ts` |
| Create | `src/components/NovelSearch.tsx` |
| Create | `supabase/functions/admin-api/index.ts` |
| Create | `src/pages/Admin.tsx` |
| Create | `src/components/admin/UserManagement.tsx` |
| Create | `src/components/admin/ContentModeration.tsx` |
| Create | `src/components/admin/Analytics.tsx` |
| Edit   | `src/lib/api/firecrawl.ts` — add `searchNovels()` |
| Edit   | `src/pages/Index.tsx` — add search toggle |
| Edit   | `src/App.tsx` — add `/admin` route |
| Migration | Create `app_role` enum, `user_roles` table, `profiles` table, `has_role()` function, RLS policies |

### Safeguards
- All existing code remains untouched; new features are additive
- Admin panel is fully isolated behind role-based access
- Search is a separate edge function, doesn't modify scrape-novel

