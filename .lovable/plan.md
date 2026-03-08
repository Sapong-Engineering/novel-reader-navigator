

## Settings Panel with Sync Toggle & In-App Notifications

### Overview
Create a dedicated Settings page/panel accessible from both the Index and Reader pages, consolidating all app settings (theme, reader preferences, sync toggle, notifications) into one place. Add an in-app notification system for sync updates and new chapter discoveries.

### New Files

**`src/contexts/AppSettingsContext.tsx`**
- New context managing app-wide settings persisted to localStorage
- Settings: `syncEnabled` (boolean, default true), `notificationsEnabled` (boolean, default true), `autoFetchNewChapters` (boolean, default false)
- Exposes getters/setters and a `resetAll` function

**`src/components/SettingsPanel.tsx`**
- A Sheet/Dialog panel (slide-out from right) containing all settings grouped into sections:
  - **Appearance**: Theme toggle (dark/light/system) using existing `useThemeContext`
  - **Reader**: Font size slider, font family selector (pulled from `useReaderContext`)
  - **Sync & Data**: Toggle sync on/off (when off, skip all `syncNovel`/`syncLibraryFromBackend` calls), manual sync button, repair chapter order
  - **Notifications**: Toggle in-app notifications for sync updates, new chapters discovered
- Uses `Switch` component for toggles, existing UI primitives

**`src/components/NotificationToast.tsx`** (or just use sonner)
- Leverage existing `sonner` toast system but gate notifications behind the `notificationsEnabled` setting
- Create a helper `notifyIfEnabled(message, type)` that checks the setting before calling `toast`

### Modified Files

**`src/contexts/AppSettingsContext.tsx`** (new)
- `syncEnabled`: gates all sync-service calls
- `notificationsEnabled`: gates toast notifications for background events
- Persisted to `localStorage` key `novel-app-settings`

**`src/lib/sync-service.ts`**
- Import `getAppSettings` (a non-React getter from AppSettingsContext)
- At the top of `syncNovel`, `syncLibraryFromBackend`, `syncChapterToBackend`, etc., check `syncEnabled` — if false, return early
- Replace relevant `toast` calls with the gated `notifyIfEnabled` helper

**`src/App.tsx`**
- Wrap with `AppSettingsProvider`

**`src/pages/Index.tsx`**
- Add a Settings gear icon button in the top bar that opens the SettingsPanel
- Respect `syncEnabled` — skip auto-sync on mount if disabled

**`src/pages/Reader.tsx`**
- Add Settings gear icon to toolbar
- Respect `syncEnabled` — skip `syncFullNovelFromBackend` on mount if disabled

**`src/components/NovelToolbar.tsx`**
- Add a gear icon button that triggers `onOpenSettings` callback
- Move "Repair chapter order" from ReaderSettingsPopover into the full Settings panel (keep the popover for quick font adjustments only)

### Settings Structure
```text
┌─────────────────────────┐
│ Settings            [X] │
├─────────────────────────┤
│ APPEARANCE              │
│  Theme: [Dark|Light|Sys]│
│                         │
│ READER                  │
│  Font size: [-] 16 [+]  │
│  Font: [Serif|Sans|Mono]│
│                         │
│ SYNC & DATA             │
│  Cloud sync    [toggle] │
│  ⟳ Sync now    [button] │
│  Repair chapters [btn]  │
│                         │
│ NOTIFICATIONS           │
│  Sync updates  [toggle] │
│  New chapters  [toggle] │
│                         │
│ [Reset all defaults]    │
└─────────────────────────┘
```

### Notification Gating
- Create a simple `src/lib/notify.ts` with `notify(msg, type)` that reads settings from localStorage directly (no React dependency) and calls `toast` only if enabled
- Replace existing `toast.info/success` calls for sync events with `notify()`

### Files Summary
- **New**: `src/contexts/AppSettingsContext.tsx`, `src/components/SettingsPanel.tsx`, `src/lib/notify.ts`
- **Modified**: `src/App.tsx`, `src/pages/Index.tsx`, `src/pages/Reader.tsx`, `src/components/NovelToolbar.tsx`, `src/lib/sync-service.ts`

