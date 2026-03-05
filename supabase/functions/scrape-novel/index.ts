const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    // Parse the novel info from markdown
    const markdown = data.data?.markdown || data.markdown || '';
    const links = data.data?.links || data.links || [];
    const metadata = data.data?.metadata || data.metadata || {};

    // Extract title from first heading
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : metadata.title || 'Unknown Novel';

    // Extract description from Summary section
    const summaryMatch = markdown.match(/\*\*Summary\*\*(.+?)(?:\n\n|\[First Chapter)/s);
    const description = summaryMatch ? summaryMatch[1].trim() : '';

    // Extract cover image
    const coverMatch = markdown.match(/!\[.*?\]\((.*?cover.*?)\)/i);
    const coverUrl = coverMatch ? coverMatch[1] : undefined;

    // Extract chapter URLs - find all links that match the novel chapter pattern
    // URLs look like: https://www.empirenovel.com/novel/swallowed-star/123
    const baseUrl = formattedUrl.replace(/\/$/, '');
    const chapterPattern = new RegExp(`^${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(\\d+)$`);
    
    const chapterNumbers: number[] = [];
    for (const link of links) {
      const match = link.match(chapterPattern);
      if (match) {
        chapterNumbers.push(parseInt(match[1], 10));
      }
    }

    // Also try to extract from markdown content (chapter links in text)
    const chapterLinkPattern = new RegExp(`${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(\\d+)`, 'g');
    let linkMatch;
    while ((linkMatch = chapterLinkPattern.exec(markdown)) !== null) {
      const num = parseInt(linkMatch[1], 10);
      if (!chapterNumbers.includes(num)) {
        chapterNumbers.push(num);
      }
    }

    // Determine total chapter count from first/last chapter info
    let maxChapter = chapterNumbers.length > 0 ? Math.max(...chapterNumbers) : 0;
    const lastChapterMatch = markdown.match(/Chapter\s+(\d+)\]/);
    if (lastChapterMatch) {
      const n = parseInt(lastChapterMatch[1], 10);
      if (n > maxChapter) maxChapter = n;
    }

    // Generate full chapter list
    const chapters = [];
    for (let i = 1; i <= maxChapter; i++) {
      chapters.push({
        id: `ch-${i}`,
        title: `Chapter ${i}`,
        url: `${baseUrl}/${i}`,
      });
    }

    console.log(`Found ${chapters.length} chapters for "${title}"`);

    return new Response(
      JSON.stringify({
        success: true,
        data: { title, description, coverUrl, chapters },
      }),
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
