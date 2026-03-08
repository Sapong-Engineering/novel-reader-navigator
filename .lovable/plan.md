

## Plan: Tie Search to Admin Adapter Preferences

Currently the `search-novels` edge function hardcodes `site:wuxia.click OR site:novelbin.com OR site:empirenovel.com`. It should instead read the `adapter_wuxiaclick`, `adapter_novelbin`, and `adapter_empirenovel` settings from the `admin_settings` table and only include enabled sites in the search query.

### Changes

**`supabase/functions/search-novels/index.ts`**:
1. Import `createClient` from Supabase JS
2. Before building the search query, create a service-role Supabase client and query `admin_settings` for the three adapter keys (`adapter_wuxiaclick`, `adapter_novelbin`, `adapter_empirenovel`)
3. Build the `site:` filter dynamically based on which adapters are enabled (default to all enabled if no settings exist)
4. If zero adapters are enabled, return an empty results array with a message

Map: `adapter_wuxiaclick` → `site:wuxia.click`, `adapter_novelbin` → `site:novelbin.com`, `adapter_empirenovel` → `site:empirenovel.com`

No other files need changes.

