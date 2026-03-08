

## Plan: Add Admin Preferences Tab

Add a fourth "Preferences" tab to the admin panel with three sections: app-wide defaults, scraper configuration, and maintenance controls. Settings will be stored in a new `admin_settings` database table so they persist across sessions and apply globally.

### Database

**New table `admin_settings`** (migration):
- `key TEXT PRIMARY KEY` — setting identifier (e.g. `default_font_family`, `maintenance_mode`)
- `value JSONB NOT NULL` — setting value
- `updated_at TIMESTAMPTZ DEFAULT now()`
- `updated_by UUID REFERENCES auth.users(id)`
- RLS: only admins can read/write (using `has_role`)

### Backend

**Add actions to `admin-api` edge function**:
- `get-settings` — returns all rows from `admin_settings` as a key-value map
- `update-setting` — upserts a single `{ key, value }` into `admin_settings`
- `set-maintenance-mode` — special case that also updates a `maintenance_mode` flag

### Frontend

**New `src/components/admin/AdminPreferences.tsx`** with three sections:

1. **App-Wide Defaults** — default reader font family, font size, theme, refresh interval, notification defaults. These define what new users start with (currently hardcoded in `AppSettingsContext`).

2. **Scraper Configuration** — toggle which adapters are enabled (WuxiaClick, NovelBin, EmpireNovel), set scrape rate limit (requests/minute), set max concurrent scrapes.

3. **Maintenance Controls** — toggle registration open/closed, toggle maintenance mode (shows a banner to all users), editable announcement/banner message text.

Each setting saves individually on change via the admin API.

**Edit `src/pages/Admin.tsx`**:
- Add a 4th tab: `<TabsTrigger value="preferences">` with a Settings icon
- Import and render `AdminPreferences` in the new `TabsContent`

### Files to Create/Edit

| Action | File |
|--------|------|
| Create | `src/components/admin/AdminPreferences.tsx` |
| Edit | `src/pages/Admin.tsx` — add Preferences tab |
| Edit | `supabase/functions/admin-api/index.ts` — add get/update settings actions |
| Edit | `src/lib/api/admin.ts` — add `getSettings()` and `updateSetting()` |
| Migration | Create `admin_settings` table with admin-only RLS |

