import type { SiteAdapter, NovelInfo, ChapterInfo } from './types.ts';

export class WuxiaClickAdapter implements SiteAdapter {
  readonly urlPattern = /wuxia\.click/;

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
    // Extract novel slug from URL path: /novel/swallowed-star → swallowed-star
    const slugMatch = baseUrl.match(/\/novel\/([^/?#]+)/);
    const slug = slugMatch ? slugMatch[1].replace(/\/$/, '') : '';

    // Extract title from ##### heading or metadata
    const titleMatch = markdown.match(/^#{1,5}\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : metadata.title || 'Unknown Novel';

    // Extract description from #### Description section
    const descMatch = markdown.match(/####?\s*Description\s*\n([\s\S]*?)(?=\n#{1,4}\s|\n---|\n\*\*|$)/i);
    const description = descMatch ? descMatch[1].trim() : '';

    // Extract cover image
    const coverMatch = markdown.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
    const coverUrl = coverMatch ? coverMatch[1] : undefined;

    // Extract chapter count from "N Chapters" text
    const chapterCountMatch = markdown.match(/(\d[\d,]*)\s*Chapters?/i);
    let chapterCount = 0;
    if (chapterCountMatch) {
      chapterCount = parseInt(chapterCountMatch[1].replace(/,/g, ''), 10);
    }

    // Also try to find chapter count from links
    const chapterLinkPattern = /\/chapter\/[^/]+-(\d+)/g;
    let linkMatch: RegExpExecArray | null;
    let maxFromLinks = 0;
    const allText = markdown + '\n' + links.join('\n');
    while ((linkMatch = chapterLinkPattern.exec(allText)) !== null) {
      const n = parseInt(linkMatch[1], 10);
      if (n > maxFromLinks) maxFromLinks = n;
    }

    const totalChapters = Math.max(chapterCount, maxFromLinks);

    // Generate chapter URLs
    const chapters: ChapterInfo[] = [];
    for (let i = 1; i <= totalChapters; i++) {
      chapters.push({
        id: `ch-${i}`,
        title: `Chapter ${i}`,
        url: `https://wuxia.click/chapter/${slug}-${i}`,
      });
    }

    return { title, description, coverUrl, chapters };
  }
}
