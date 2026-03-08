const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const searchQuery = `(site:wuxia.click OR site:novelbin.com OR site:empirenovel.com) ${query.trim()}`;
    console.log('Searching novels:', searchQuery);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 20,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl search error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Search failed (${response.status})` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse results into novel entries
    const results = (data.data || [])
      .map((item: any) => {
        const url = item.url || '';
        let source = 'unknown';
        if (url.includes('novelbin.com')) source = 'NovelBin';
        else if (url.includes('wuxia.click')) source = 'WuxiaClick';
        else if (url.includes('empirenovel.com')) source = 'EmpireNovel';

        // Filter out non-novel pages (chapter pages, search pages, etc.)
        const isNovelPage = 
          (source === 'NovelBin' && /\/b\/[^/]+$/.test(url)) ||
          (source === 'WuxiaClick' && /\/book\/[^/]+$/.test(url)) ||
          (source === 'EmpireNovel' && /\/book\/[^/]+$/.test(url));

        if (!isNovelPage) return null;

        return {
          title: (item.title || '').replace(/ - NovelBin| - WuxiaClick| - EmpireNovel|Read Online Free/gi, '').trim(),
          url,
          description: item.description || '',
          source,
        };
      })
      .filter(Boolean);

    // Deduplicate by URL
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
