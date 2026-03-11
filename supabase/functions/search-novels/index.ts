import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ADAPTER_SITE_MAP: Record<string, string> = {
  adapter_wuxiaclick: 'wuxia.click',
  adapter_novelbin: 'novelbin.com',
  adapter_empirenovel: 'empirenovel.com',
  adapter_gutenberg: 'gutenberg.org',
};

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

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Search service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read enabled adapters from admin_settings using service role (adapter settings are not user-scoped)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const adapterKeys = Object.keys(ADAPTER_SITE_MAP);
    const { data: settings } = await serviceClient
      .from('admin_settings')
      .select('key, value')
      .in('key', adapterKeys);

    const settingsMap: Record<string, boolean> = {};
    (settings || []).forEach((s: any) => { settingsMap[s.key] = s.value; });

    // Build enabled sites list (default to enabled if no setting exists)
    const enabledSites = adapterKeys
      .filter(key => settingsMap[key] ?? true)
      .map(key => ADAPTER_SITE_MAP[key]);

    if (enabledSites.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: [], message: 'All adapters are disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const siteFilter = enabledSites.map(s => `site:${s}`).join(' OR ');
    const searchQuery = `(${siteFilter}) ${query.trim()}`;
    console.log('Searching novels:', searchQuery);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: searchQuery, limit: 20 }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl search error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Search failed (${response.status})` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const enabledSitesSet = new Set(enabledSites);

    const results = (data.data || [])
      .map((item: any) => {
        const url = item.url || '';
        let source = 'unknown';
        let domain = '';
        if (url.includes('novelbin.com')) { source = 'NovelBin'; domain = 'novelbin.com'; }
        else if (url.includes('wuxia.click')) { source = 'WuxiaClick'; domain = 'wuxia.click'; }
        else if (url.includes('empirenovel.com')) { source = 'EmpireNovel'; domain = 'empirenovel.com'; }
        else if (url.includes('gutenberg.org')) { source = 'Gutenberg'; domain = 'gutenberg.org'; }

        if (source === 'unknown') return null;
        if (!enabledSitesSet.has(domain)) return null;

        const isChapterPage = /chapter[-_\s]?\d/i.test(url) || /\/chapter\//i.test(url);
        const isUtilityPage = /\/(search|category|tag|login|register|contact|about|faq)\b/i.test(url);
        const isListPage = /\/novels-list/i.test(url) || /[?&]author=/i.test(url) || /[?&]category=/i.test(url);
        // For Gutenberg, only keep /ebooks/ pages (not raw .txt files or cache paths)
        const isGutenbergNonBook = source === 'Gutenberg' && !(/\/ebooks\/\d+/.test(url));
        if (isChapterPage || isUtilityPage || isListPage || isGutenbergNonBook) return null;

        const cleanUrl = url.replace(/\?page=\d+/, '');

        return {
          title: (item.title || '')
            .replace(/ - NovelBin| - WuxiaClick| - EmpireNovel| - Read| Online Free| Novel Full| read online \| Empire Novel| Light Novels| - Free eBook \| Project Gutenberg| by .* - Project Gutenberg/gi, '')
            .trim(),
          url: cleanUrl,
          description: item.description || '',
          source,
        };
      })
      .filter(Boolean);

    const seen = new Set<string>();
    const unique = results.filter((r: any) => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    console.log(`Found ${unique.length} novel results`);

    return new Response(
      JSON.stringify({ success: true, data: unique }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
