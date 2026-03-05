import { AdapterRegistry } from './adapters/types.ts';
import { DefaultAdapter } from './adapters/default-adapter.ts';
import { novelInfoCache, Cache } from '../shared/cache.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const registry = new AdapterRegistry(new DefaultAdapter());

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
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

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Check cache first
    const cacheKey = Cache.keyFromUrl(formattedUrl);
    const cached = novelInfoCache.get(cacheKey);
    if (cached) {
      console.log('Cache hit for:', formattedUrl);
      return new Response(
        JSON.stringify({ success: true, data: cached }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping novel page:', formattedUrl);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown', 'links'],
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

    const markdown: string = data.data?.markdown || data.markdown || '';
    const links: string[] = data.data?.links || data.links || [];
    const metadata: Record<string, string> = data.data?.metadata || data.metadata || {};

    const adapter = registry.getAdapter(formattedUrl);
    const novelInfo = adapter.extractNovelInfo({
      baseUrl: formattedUrl,
      markdown,
      links,
      metadata,
    });

    console.log(`Found ${novelInfo.chapters.length} chapters for "${novelInfo.title}"`);

    // Store in cache for future requests
    const cacheKey = Cache.keyFromUrl(formattedUrl);
    novelInfoCache.set(cacheKey, novelInfo);

    return new Response(
      JSON.stringify({ success: true, data: novelInfo }),
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
