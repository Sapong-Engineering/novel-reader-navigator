

## Issues Identified

1. **Library inaccessible on homepage** -- The homepage only shows a URL input. Saved novels (from `localStorage`) are never displayed. There's no way to browse previously saved novels.
2. **No proper navigation/routing** -- The entire app is a single page with state-driven views. No routes for library, reader, etc.
3. **Downloading entire novel not possible** -- Export only works for already-fetched chapters. There's no "fetch all chapters" or "download entire novel" feature.
4. **Mobile/tablet responsiveness** -- Chapter sidebar is `hidden md:flex`, no mobile chapter access. Reader padding not mobile-optimized.
5. **No PWA support** -- No manifest, no service worker, no install capability.

## Plan

### 1. Add Library Page on Homepage
- Show saved novels from `localStorage` below the URL input on the homepage
- Each novel card shows title, cover image, chapter count, saved chapter count, and last saved date
- Clicking a novel card loads it into the reader (same as current flow)
- Add delete button per novel
- If no saved novels, show a subtle "No saved novels yet" message

### 2. Add Proper Routing
- `/` -- Homepage with URL input + library grid
- `/reader/:novelId` -- Reader view for a specific novel (load from localStorage)
- Keep the ability to load a novel from URL on homepage and navigate to reader

### 3. Add "Fetch All Chapters" / "Download Entire Novel"
- Add a "Fetch All" button in the toolbar that sequentially scrapes all unfetched chapters (with progress indicator)
- Export buttons already work for fetched chapters -- this completes the flow

### 4. Mobile Chapter Drawer
- On mobile, replace the hidden sidebar with a Sheet/Drawer that slides in from the left
- Add a hamburger/menu button in the toolbar to toggle it
- Reader view: reduce padding on mobile, adjust font sizes

### 5. PWA Setup
- Install `vite-plugin-pwa`
- Configure in `vite.config.ts` with manifest (app name "Novel Reader", theme color, icons)
- Add mobile meta tags to `index.html` (apple-mobile-web-app-capable, theme-color, etc.)
- Create PWA icons in `/public`
- Add `/~oauth` to `navigateFallbackDenylist`

### Technical Details

**Files to create:**
- `src/pages/Library.tsx` -- or merge library into existing `Index.tsx`
- `src/components/NovelCard.tsx` -- library card component
- `src/components/MobileChapterDrawer.tsx` -- sheet-based chapter list for mobile

**Files to modify:**
- `src/App.tsx` -- add routes (`/`, `/reader/:novelId`)
- `src/pages/Index.tsx` -- add library grid, navigate to reader route on novel select
- `src/components/NovelToolbar.tsx` -- add "Fetch All" button, mobile menu trigger
- `src/components/ReaderView.tsx` -- responsive padding
- `vite.config.ts` -- add vite-plugin-pwa config
- `index.html` -- PWA meta tags
- `tailwind.config.ts` -- if needed for any utility additions

**New dependency:**
- `vite-plugin-pwa`

