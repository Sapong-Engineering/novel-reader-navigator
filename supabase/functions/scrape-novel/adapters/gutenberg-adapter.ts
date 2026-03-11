import type { SiteAdapter, NovelInfo, ChapterInfo } from './types.ts';
import { parseGutenbergMetadata, splitIntoChapters } from '../../shared/gutenberg-splitter.ts';

export class GutenbergAdapter implements SiteAdapter {
  readonly urlPattern = /gutenberg\.org/;

  /**
   * extractNovelInfo is called by the scrape-novel function with Firecrawl output.
   * For Gutenberg, we override the flow: we fetch the .txt directly (no Firecrawl needed for the text).
   * The scrape-novel index.ts will detect Gutenberg URLs and call fetchGutenbergNovel() instead.
   *
   * This method is a fallback for if Firecrawl output is passed (e.g. from book HTML page).
   */
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
    const title = metadata.title?.replace(/\s*[-—|].*Project Gutenberg.*$/i, '').trim() || 'Unknown Book';
    const description = metadata.description || '';
    const bookId = extractBookId(baseUrl);
    const coverUrl = bookId ? `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.cover.medium.jpg` : undefined;

    return { title, description, coverUrl, chapters: [] };
  }
}

/** Extract numeric book ID from various Gutenberg URL formats. */
export function extractBookId(url: string): string | null {
  // /ebooks/78156
  const ebooksMatch = url.match(/\/ebooks\/(\d+)/);
  if (ebooksMatch) return ebooksMatch[1];

  // /cache/epub/78156/pg78156.txt
  const cacheMatch = url.match(/\/cache\/epub\/(\d+)/);
  if (cacheMatch) return cacheMatch[1];

  // /files/78156/
  const filesMatch = url.match(/\/files\/(\d+)/);
  if (filesMatch) return filesMatch[1];

  return null;
}

/** Resolve the canonical .txt URL for a book ID. */
export function resolveTxtUrl(bookId: string): string {
  return `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.txt`;
}

/**
 * Full Gutenberg novel fetch: downloads .txt, parses metadata, splits into chapters.
 * Called directly from scrape-novel/index.ts for Gutenberg URLs.
 */
export async function fetchGutenbergNovel(url: string): Promise<NovelInfo> {
  const bookId = extractBookId(url);
  if (!bookId) {
    throw new Error('Could not extract Gutenberg book ID from URL');
  }

  const txtUrl = resolveTxtUrl(bookId);
  console.log('Fetching Gutenberg text:', txtUrl);

  const response = await fetch(txtUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch Gutenberg text: ${response.status}`);
  }

  const rawText = await response.text();
  const meta = parseGutenbergMetadata(rawText);
  const gutenbergChapters = splitIntoChapters(rawText);

  const coverUrl = `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.cover.medium.jpg`;

  const chapters: ChapterInfo[] = gutenbergChapters.map((ch, i) => ({
    id: ch.id,
    title: ch.title,
    // Synthetic URL used only as stable identifier — content is inline
    url: `https://www.gutenberg.org/ebooks/${bookId}/chapter/${i + 1}`,
    content: ch.content,
  }));

  const description = `By ${meta.author}. Language: ${meta.language}.`;

  return {
    title: meta.title,
    description,
    coverUrl,
    chapters,
  };
}
