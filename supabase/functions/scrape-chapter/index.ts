import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { chapterContentCache, Cache } from '../shared/cache.ts';
import { cleanChapterContent } from '../shared/chapter-cleaner.ts';
import { isHostAllowed } from '../shared/allowed-hosts.ts';
import { applyDynamicRules, analyzeContentWithAI, type CleaningRule } from '../shared/ai-cleaner.ts';
import { scoreBlock } from '../shared/content-scorer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Module-level singletons (live for the lifetime of a warm instance) ────────

// Service-role client for reading admin_settings + writing new cleaning rules.
// Created once per cold start to avoid per-request overhead.
const serviceClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// 5-min in-process caches so DB is not hit on every warm request.
const rulesCache    = new Cache<CleaningRule[]>({ ttlMs: 5 * 60 * 1000, maxSize: 1 });
const settingsCache = new Cache<{ mode: string; model: string }>({ ttlMs: 5 * 60 * 1000, maxSize: 1 });
const RULES_KEY     = 'all';
const SETTINGS_KEY  = 'cleaning';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchCleaningSettings(): Promise<{ mode: string; model: string }> {
  const cached = settingsCache.get(SETTINGS_KEY);
  if (cached) return cached;

  const { data } = await serviceClient
    .from('admin_settings')
    .select('key, value')
    .in('key', ['cleaning_mode', 'cleaning_mode_ai_model']);

  const map: Record<string, string> = {};
  for (const row of (data ?? [])) map[row.key] = row.value as string;

  const result = {
    mode:  map['cleaning_mode']          ?? 'rule-based',
    model: map['cleaning_mode_ai_model'] ?? 'gpt-4o-mini',
  };
  settingsCache.set(SETTINGS_KEY, result);
  return result;
}

async function fetchDynamicRules(): Promise<CleaningRule[]> {
  const cached = rulesCache.get(RULES_KEY);
  if (cached) return cached;

  const { data, error } = await serviceClient
    .from('cleaning_rules')
    .select('id, pattern, flags, description, source_url')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load dynamic cleaning rules:', error);
    return [];
  }

  const rules: CleaningRule[] = (data ?? []).map((row: Record<string, string>) => ({
    id: row.id,
    pattern: row.pattern,
    flags: row.flags,
    description: row.description,
    source_url: row.source_url ?? undefined,
  }));

  rulesCache.set(RULES_KEY, rules);
  return rules;
}

/** Returns true if any paragraph block scores in the near-noise range (0.25–0.39),
 *  meaning it survived the rule-based threshold but still looks suspicious. */
function hasSuspectBlocks(content: string): boolean {
  return content.split('\n\n').some(block => {
    const score = scoreBlock(block);
    return score >= 0.25 && score < 0.40;
  });
}

async function saveNewRules(rules: CleaningRule[], sourceUrl: string): Promise<void> {
  if (rules.length === 0) return;
  const rows = rules.map(r => ({
    pattern:     r.pattern,
    flags:       r.flags,
    description: r.description,
    source_url:  sourceUrl,
    created_by:  null,  // null = AI-generated
  }));
  const { error } = await serviceClient.from('cleaning_rules').insert(rows);
  if (error) {
    console.error('Failed to save AI-generated cleaning rules:', error);
    return;
  }
  // Invalidate rule cache so the next warm request picks up the new rules
  rulesCache.set(RULES_KEY, []);
  console.log(`Saved ${rules.length} new AI-generated cleaning rule(s)`);
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Validate URL against shared allowlist
    const hostCheck = isHostAllowed(formattedUrl);
    if (!hostCheck.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL not from a supported source' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gutenberg chapters have inline content — they should never need scraping
    if (/gutenberg\.org/i.test(formattedUrl)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Gutenberg chapter content is embedded in the novel. Re-fetch the novel to reload chapter content.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache first — cached content is already fully cleaned
    const cacheKey = Cache.keyFromUrl(formattedUrl);
    const cached = chapterContentCache.get(cacheKey);
    if (cached) {
      console.log('Cache hit for chapter:', formattedUrl);
      return new Response(
        JSON.stringify({ success: true, data: { content: cached } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping chapter:', formattedUrl);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Failed: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markdown = data.data?.markdown || data.markdown || '';

    // ── Cleaning pipeline ──────────────────────────────────────────────────

    // Step 1: Existing rule-based pipeline (always runs, unchanged)
    let content = cleanChapterContent(markdown, formattedUrl);

    // Fetch cleaning settings + dynamic rules concurrently (both cached on warm requests)
    const [{ mode, model }, dynamicRules] = await Promise.all([
      fetchCleaningSettings(),
      fetchDynamicRules(),
    ]);

    // Step 2: Apply DB-stored dynamic rules (all modes — fast regex, no cost)
    if (dynamicRules.length > 0) {
      content = applyDynamicRules(content, dynamicRules);
    }

    // Step 3: AI analysis — only in 'hybrid' or 'ai' mode, and only when useful
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (openaiKey && (mode === 'hybrid' || mode === 'ai')) {
      // hybrid: only trigger when suspect blocks remain; ai: always trigger
      const shouldAnalyze = mode === 'ai' || hasSuspectBlocks(content);
      if (shouldAnalyze) {
        try {
          const newRules = await analyzeContentWithAI(content, formattedUrl, openaiKey, model);
          if (newRules.length > 0) {
            // Apply new rules immediately to this response
            content = applyDynamicRules(content, newRules);
            // Persist rules without blocking the response
            saveNewRules(newRules, formattedUrl).catch(e =>
              console.error('Rule save failed:', e)
            );
          }
        } catch (aiErr) {
          // AI failure must NEVER prevent chapter delivery — degrade gracefully
          console.error('AI cleaner failed, proceeding with rule-based result:', aiErr);
        }
      }
    }

    // ── Cache and return ───────────────────────────────────────────────────

    chapterContentCache.set(cacheKey, content);

    console.log(`Scraped chapter content: ${content.length} chars (mode: ${mode})`);

    return new Response(
      JSON.stringify({ success: true, data: { content } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
