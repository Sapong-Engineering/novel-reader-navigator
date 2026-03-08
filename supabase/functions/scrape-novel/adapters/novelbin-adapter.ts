import type { SiteAdapter, NovelInfo, ChapterInfo } from './types.ts';

export class NovelBinAdapter implements SiteAdapter {
  readonly urlPattern = /novelbin\.(?:com|net|me)/;

  extractNovelInfo({
    baseUrl,
    markdown,
    links,
    metadata,
  }: {
    baseUrl: string;
    markdown: string;
    links: string[];
    metadata: Record<string, string>;
  }): NovelInfo {
    // Extract novel slug from URL: /b/swallowed-star → swallowed-star
    const slugMatch = baseUrl.match(/\/b\/([^/?#]+)/);
    const slug = slugMatch ? slugMatch[1].replace(/\/$/, '') : '';

    // Extract title: look for "# [Title](url)" pattern first, then ### heading
    const linkedTitleMatch = markdown.match(/^#\s+\[([^\]]+)\]/m);
    const headingMatch = markdown.match(/^###\s+([^\[#\n]+)/m);
    const title = linkedTitleMatch
      ? linkedTitleMatch[1].trim()
      : headingMatch
        ? headingMatch[1].trim()
        : metadata.title?.replace(/\s*[-|].*$/, '') || 'Unknown Novel';

    // Extract description — text block after tabs section, before chapter list
    const descMatch = markdown.match(/(?:Comments\))\s*\n\n([\s\S]*?)(?=\n-\s*\[Chapter\s+\d)/i);
    const description = descMatch ? descMatch[1].trim() : '';

    // Extract cover image
    const coverMatch = markdown.match(/!\[.*?\]\((https?:\/\/[^\s)]*?novelbin[^\s)]*)\)/i);
    const coverUrl = coverMatch ? coverMatch[1] : undefined;

    // Extract chapters from markdown links: [Chapter N — Title](url)
    const chapterRegex = /\[Chapter\s+(\d+)\s*[—–\-:]*\s*(.*?)\]\((https:\/\/novelbin\.[^)]+\/chapter-\d+)\s*(?:"[^"]*")?\)/gi;
    const chapters: ChapterInfo[] = [];
    const seenNumbers = new Set<number>();
    let match: RegExpExecArray | null;

    while ((match = chapterRegex.exec(markdown)) !== null) {
      const num = parseInt(match[1], 10);
      if (seenNumbers.has(num)) continue;
      seenNumbers.add(num);

      const chTitle = match[2].trim()
        ? `Chapter ${num} — ${match[2].trim()}`
        : `Chapter ${num}`;

      chapters.push({
        id: `ch-${num}`,
        title: chTitle,
        url: match[3],
      });
    }

    // If we found chapters from links, sort them. Also check for total chapter count.
    chapters.sort((a, b) => {
      const aNum = parseInt(a.id.replace('ch-', ''), 10);
      const bNum = parseInt(b.id.replace('ch-', ''), 10);
      return aNum - bNum;
    });

    // Check latest chapter link for max count
    const latestMatch = markdown.match(/Chapter\s+(\d+)\s*[-—–:]/i);
    const latestNum = latestMatch ? parseInt(latestMatch[1], 10) : 0;

    // Also check "N chapters" pattern
    const countMatch = markdown.match(/(\d[\d,]*)\s*chapters?/i);
    const countNum = countMatch ? parseInt(countMatch[1].replace(/,/g, ''), 10) : 0;

    const maxChapter = Math.max(
      latestNum,
      countNum,
      chapters.length > 0 ? parseInt(chapters[chapters.length - 1].id.replace('ch-', ''), 10) : 0
    );

    // Fill in missing chapters (novelbin only shows first ~30 on the page)
    const origin = baseUrl.match(/(https?:\/\/[^/]+)/)?.[1] || 'https://novelbin.com';
    for (let i = 1; i <= maxChapter; i++) {
      if (!seenNumbers.has(i)) {
        chapters.push({
          id: `ch-${i}`,
          title: `Chapter ${i}`,
          url: `${origin}/b/${slug}/chapter-${i}`,
        });
      }
    }

    // Re-sort after filling
    chapters.sort((a, b) => {
      const aNum = parseInt(a.id.replace('ch-', ''), 10);
      const bNum = parseInt(b.id.replace('ch-', ''), 10);
      return aNum - bNum;
    });

    return { title, description, coverUrl, chapters };
  }
}
