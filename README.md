# Novel Reader Navigator

A full-stack web application for reading web novels. Add novels by URL, browse chapters, read with a clean reader interface, and sync your library across devices via Supabase.

## Features

- **Multi-source scraping** — WuxiaClick, NovelBin, EmpireNovel, and Project Gutenberg
- **Clean chapter reader** — AI + rule-based pipeline strips ads, navigation chrome, and site noise
- **Reader customization** — Adjustable font size (12–24 px), font family (serif/sans/mono), dark/light/system theme
- **Bookmarks** — Per-chapter bookmarks with labels; jump to position on click
- **Reading progress** — Scroll position saved per chapter; auto-resumes on return
- **Text-to-speech** — OpenAI TTS integration (Nova, Alloy, Echo, Fable, Onyx, Shimmer voices)
- **Novel search** — Search across enabled sources from the library page
- **Sync** — Library and progress synced to Supabase (requires account); offline queue for failed writes
- **Admin panel** — Site-wide settings, scraper config, content cleaning mode, maintenance controls
- **AI content cleaning** — Optional AI (GPT-4o-mini/GPT-4o) analyzes chapters, generates reusable regex rules stored in the database

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Routing | React Router v6 |
| Theme | next-themes |
| Backend | Supabase (Postgres + Auth + Edge Functions) |
| Edge runtime | Deno (Supabase Edge Functions) |
| Scraping | Firecrawl API |
| TTS | OpenAI API |
| Testing | Vitest + jsdom |
| CI | GitHub Actions |

## Project Structure

```text
src/
  pages/
    Index.tsx          # Library page
    Reader.tsx         # Chapter reader
    Auth.tsx           # Sign in / Sign up
    Admin.tsx          # Admin panel (admin role required)
  components/
    ReaderView.tsx     # Reader content + nav + bookmarks
    ChapterList.tsx    # Chapter browser + bookmarks tab
    NovelToolbar.tsx   # Top bar with reader settings popover
    AnnouncementBanner.tsx  # Admin-controlled site announcement
    SyncErrorBanner.tsx     # Offline sync failure notice
  contexts/
    ThemeContext.tsx              # next-themes wrapper + admin default theme
    ReaderContext.tsx             # Font size/family with admin defaults + user overrides
    AppSettingsContext.tsx        # Notification and refresh settings
    AdminPublicSettingsContext.tsx # maintenance_mode, announcement, registration_open
  lib/
    novel-store.ts     # Core data model (Novel, Chapter)
    bookmarks.ts       # Bookmark CRUD (localStorage)
    storage-manager.ts # Quota monitoring, reading progress
    validation.ts      # URL validation
    export-service.ts  # PDF/DOCX export

supabase/
  functions/
    scrape-novel/      # Scrapes novel metadata + chapter list
    scrape-chapter/    # Scrapes and cleans a single chapter
    search-novels/     # Searches across enabled sources
    openai-tts/        # Text-to-speech proxy (auth required)
    admin-api/         # Admin CRUD for settings and cleaning rules
    refresh-novels/    # Background novel refresh
    shared/
      chapter-cleaner.ts   # Rule-based cleaning pipeline
      content-scorer.ts    # Block noise scoring
      ai-cleaner.ts        # Dynamic rule application + AI analysis
      cache.ts             # LRU cache with TTL
      sanitization.ts      # Markdown sanitization
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Firecrawl API key
- (Optional) OpenAI API key for TTS and AI content cleaning

### Local Development

```sh
# Install dependencies
npm install

# Start the dev server
npm run dev
```

### Environment / Supabase Setup

1. Create a Supabase project and run the migrations in `supabase/migrations/`.
2. Set edge function secrets in the Supabase dashboard:
   - `FIRECRAWL_API_KEY` — required for scraping
   - `OPENAI_API_KEY` — required for TTS and AI cleaning
3. Deploy edge functions with `supabase functions deploy`.
4. The frontend reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your environment (or the Supabase integration auto-configures these).

> **Note:** All edge functions use `verify_jwt = false` in `supabase/config.toml` to bypass an ES256 JWT gateway issue. Auth is enforced inside each function via `supabase.auth.getUser()`.

### Running Tests

```sh
npx vitest run
```

129 tests across 11 test files covering validation, sanitization, storage, bookmarks, rate limiting, retry logic, and chapter-fetching integration.

## Admin Panel

Navigate to `/admin` (requires an account with the `admin` role in the `user_roles` table).

### Admin Settings

| Setting | Description |
| ------- | ----------- |
| `default_theme` | Site default theme: `light`, `dark`, or `system` |
| `default_font_size` | Default reader font size (12–24 px) |
| `default_font_family` | Default font family: `serif`, `sans-serif`, `monospace` |
| `default_notifications` | Default notification preference for new users |
| `default_refresh_interval` | Default background refresh interval in hours (1–168) |
| `registration_open` | Allow/block new user registrations |
| `maintenance_mode` | Show a full-width maintenance banner across the app |
| `announcement_message` | Dismissible info banner shown to all users |
| `adapter_wuxiaclick` | Enable/disable WuxiaClick scraping source |
| `adapter_novelbin` | Enable/disable NovelBin scraping source |
| `adapter_empirenovel` | Enable/disable EmpireNovel scraping source |
| `adapter_gutenberg` | Enable/disable Gutenberg scraping source |
| `cleaning_mode` | `rule-based` (default), `hybrid`, or `ai` |
| `cleaning_mode_ai_model` | AI model: `gpt-4o-mini` (recommended) or `gpt-4o` |

### Content Cleaning Modes

- **Rule-based** — Deterministic regex pipeline. Fast, free, no AI cost.
- **Hybrid** — Rule-based first; AI activates only when suspect blocks remain.
- **AI** — AI analyzes every freshly scraped chapter.

AI-generated rules are stored in the `cleaning_rules` table and applied on all future fetches without redeployment. Rules are manageable from the Admin → Preferences → Content Cleaning section.

## Contributing

1. Fork the repository and create a feature branch.
2. Run `npx vitest run` — all tests must pass.
3. Submit a pull request against `main`.
