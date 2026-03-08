import type { SiteAdapter, NovelInfo, ChapterInfo } from './types.ts';

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class DefaultAdapter implements SiteAdapter {
  readonly urlPattern = null;

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
    // Extract title from first heading
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    const title = titleMatch
      ? titleMatch[1].trim()
      : metadata.title || 'Unknown Novel';

    // Extract description from Summary section or #### Description
    const summaryMatch = markdown.match(/\*\*Summary\*\*(.+?)(?:\n\n|\[First Chapter)/s);
    const descSectionMatch = markdown.match(/####?\s*Description\s*\n([\s\S]*?)(?=\n#{1,4}\s|\n---|\n\*\*|$)/i);
    const description = summaryMatch ? summaryMatch[1].trim() : descSectionMatch ? descSectionMatch[1].trim() : '';

    // Extract cover image
    const coverMatch = markdown.match(/!\[.*?\]\((.*?cover.*?)\)/i);
    const coverUrl = coverMatch ? coverMatch[1] : undefined;

    // Extract chapter URLs
    const escapedBase = escapeRegExp(baseUrl.replace(/\/$/, ''));
    const chapterPattern = new RegExp(`^${escapedBase}/(\\d+)$`);
    const chapterLinkPattern = new RegExp(`${escapedBase}/(\\d+)`, 'g');

    const chapterNumbers = new Set<number>();

    for (const link of links) {
      const match = link.match(chapterPattern);
      if (match) chapterNumbers.add(parseInt(match[1], 10));
    }

    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = chapterLinkPattern.exec(markdown)) !== null) {
      chapterNumbers.add(parseInt(linkMatch[1], 10));
    }

    // Determine max chapter count
    let maxChapter = chapterNumbers.size > 0 ? Math.max(...chapterNumbers) : 0;
    const lastChapterMatch = markdown.match(/Chapter\s+(\d+)\]/);
    if (lastChapterMatch) {
      const n = parseInt(lastChapterMatch[1], 10);
      if (n > maxChapter) maxChapter = n;
    }

    // Also check for "N Chapters" text pattern
    const chapterCountMatch = markdown.match(/(\d[\d,]*)\s*Chapters?/i);
    if (chapterCountMatch) {
      const n = parseInt(chapterCountMatch[1].replace(/,/g, ''), 10);
      if (n > maxChapter) maxChapter = n;
    }

    const cleanBase = baseUrl.replace(/\/$/, '');
    const chapters: ChapterInfo[] = [];
    for (let i = 1; i <= maxChapter; i++) {
      chapters.push({ id: `ch-${i}`, title: `Chapter ${i}`, url: `${cleanBase}/${i}` });
    }

    return { title, description, coverUrl, chapters };
  }
}
