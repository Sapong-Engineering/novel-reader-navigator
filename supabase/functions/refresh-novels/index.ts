import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');

  if (!firecrawlKey) {
    return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY not set' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Parse optional interval_hours from request body (default 24)
    let intervalHours = 24;
    try {
      const body = await req.json();
      if (body?.interval_hours && typeof body.interval_hours === 'number') {
        intervalHours = Math.max(1, Math.min(168, body.interval_hours));
      }
    } catch { /* no body or invalid JSON — use default */ }

    const cutoff = new Date(Date.now() - intervalHours * 60 * 60 * 1000).toISOString();

    // Get novels not refreshed within the interval
    const { data: novels, error: novelsErr } = await supabase
      .from('novels')
      .select('id, local_id, url, user_id, updated_at')
      .lt('updated_at', cutoff)
      .order('updated_at', { ascending: true })
      .limit(50);

    if (novelsErr) throw novelsErr;
    if (!novels || novels.length === 0) {
      return new Response(JSON.stringify({ message: 'No novels to refresh', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let refreshed = 0;
    let newChaptersTotal = 0;

    for (const novel of novels) {
      try {
        // Scrape current chapter list from source
        const scrapeRes = await fetch(`${supabaseUrl}/functions/v1/scrape-novel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ url: novel.url }),
        });

        if (!scrapeRes.ok) {
          console.error(`[refresh] Failed to scrape ${novel.url}: ${scrapeRes.status}`);
          continue;
        }

        const scrapeData = await scrapeRes.json();
        if (!scrapeData.success || !scrapeData.data?.chapters) continue;

        const remoteChapters: { id: string; title: string; url: string }[] = scrapeData.data.chapters;

        // Get ALL existing chapter local_ids for this novel (paginated to avoid 1000-row limit)
        const allExisting: { local_id: string }[] = [];
        let from = 0;
        const PAGE = 1000;
        while (true) {
          const { data: page } = await supabase
            .from('chapters')
            .select('local_id')
            .eq('novel_id', novel.id)
            .range(from, from + PAGE - 1);
          if (!page || page.length === 0) break;
          allExisting.push(...page);
          if (page.length < PAGE) break;
          from += PAGE;
        }

        const existingIds = new Set(allExisting.map(c => c.local_id));

        // Find new chapters
        const newChapters = remoteChapters.filter(ch => !existingIds.has(ch.id));

        if (newChapters.length > 0) {
          const startOrder = existingIds.size;
          const inserts = newChapters.map((ch, i) => ({
            novel_id: novel.id,
            user_id: novel.user_id,
            local_id: ch.id,
            title: ch.title,
            url: ch.url,
            sort_order: startOrder + i,
          }));

          const { error: insertErr } = await supabase.from('chapters').insert(inserts);
          if (insertErr) {
            console.error(`[refresh] Insert failed for ${novel.url}:`, insertErr);
          } else {
            newChaptersTotal += newChapters.length;
            console.log(`[refresh] Added ${newChapters.length} new chapters for "${novel.url}"`);
          }
        }

        // Update timestamp
        await supabase
          .from('novels')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', novel.id);

        refreshed++;

        // Rate limit: 2s delay between novels
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        console.error(`[refresh] Error processing ${novel.url}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ message: 'Refresh complete', refreshed, newChaptersTotal }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[refresh] Fatal error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
