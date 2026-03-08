import type { Chapter } from './novel-store';

type ChapterLike = Pick<Chapter, 'id' | 'title' | 'url'>;

function extractChapterNumber(chapter: ChapterLike): number | null {
  const sources = [chapter.title, chapter.id, chapter.url];

  for (const source of sources) {
    const chapterMatch = source.match(/chapter\s*(\d+(?:\.\d+)?)/i);
    if (chapterMatch) return Number(chapterMatch[1]);

    const chMatch = source.match(/\bch[-_ ]?(\d+(?:\.\d+)?)\b/i);
    if (chMatch) return Number(chMatch[1]);

    const firstNumber = source.match(/(\d+(?:\.\d+)?)/);
    if (firstNumber) return Number(firstNumber[1]);
  }

  return null;
}

export function compareChapterOrder(a: ChapterLike, b: ChapterLike): number {
  const aNumber = extractChapterNumber(a);
  const bNumber = extractChapterNumber(b);

  if (aNumber !== null && bNumber !== null && aNumber !== bNumber) {
    return aNumber - bNumber;
  }

  if (aNumber !== null && bNumber === null) return -1;
  if (aNumber === null && bNumber !== null) return 1;

  return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
}

export function orderChapters<T extends ChapterLike>(chapters: T[]): T[] {
  return [...chapters].sort(compareChapterOrder);
}
