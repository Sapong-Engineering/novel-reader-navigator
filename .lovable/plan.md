

## Plan: Dynamic Multi-Site Scraping Support

### Problem
The current scraper only works with empirenovel.com. Sites like wuxia.click use different URL structures and load chapter lists dynamically (client-side rendered tabs), so the default adapter finds zero chapters.

### Key Findings
- **wuxia.click chapter URL pattern**: `https://wuxia.click/chapter/{novel-slug}-{chapter-number}`
- The novel page contains a chapter count in text (e.g. `1486 Chapters`) but the chapter list is behind a JS-rendered tab
- The novel slug is extracted from the URL path: `/novel/swallowed-star` → `swallowed-star`
- Chapter content is accessible via Firecrawl at the chapter URLs

### Approach
Create a **WuxiaClickAdapter** that registers with the existing `AdapterRegistry` pattern -- no changes to existing working code.

### Changes

**1. New file: `supabase/functions/scrape-novel/adapters/wuxiaclick-adapter.ts`**
- `urlPattern`: `/wuxia\.click/`
- Extract title from `##### {title}` heading pattern in markdown
- Extract description from the `#### Description` section
- Extract cover image URL from `![Title](url)` pattern
- Extract chapter count from `{N} Chapters` text in markdown
- Extract novel slug from the base URL path (`/novel/{slug}`)
- Generate chapter URLs using pattern: `https://wuxia.click/chapter/{slug}-{i}` for i = 1 to N

**2. Edit: `supabase/functions/scrape-novel/index.ts`**
- Import `WuxiaClickAdapter` and register it with the registry (one line: `registry.register(new WuxiaClickAdapter())`)
- No other changes

**3. Improve the `DefaultAdapter` fallback** (minor enhancement)
- Also look for `{N} Chapters` pattern in markdown as an additional chapter count signal, making it more resilient for unknown sites that display chapter counts similarly
- Extract description from `#### Description` section as fallback

This keeps all existing empirenovel.com logic untouched while adding wuxia.click support through the adapter pattern already in place.

