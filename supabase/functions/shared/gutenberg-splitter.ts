/**
 * Gutenberg text parser: strips boilerplate and splits into chapters.
 */

export interface GutenbergChapter {
  id: string;
  title: string;
  content: string;
}

export interface GutenbergMetadata {
  title: string;
  author: string;
  language: string;
}

/** Extract metadata from the Gutenberg text header block. */
export function parseGutenbergMetadata(text: string): GutenbergMetadata {
  const titleMatch = text.match(/^Title:\s*(.+)$/m);
  const authorMatch = text.match(/^Author:\s*(.+)$/m);
  const langMatch = text.match(/^Language:\s*(.+)$/m);

  return {
    title: titleMatch?.[1]?.trim() || 'Unknown Title',
    author: authorMatch?.[1]?.trim() || 'Unknown Author',
    language: langMatch?.[1]?.trim() || 'English',
  };
}

/** Strip Gutenberg boilerplate (header/footer legalese). */
export function stripBoilerplate(text: string): string {
  // Find start marker
  const startMarkers = [
    '*** START OF THE PROJECT GUTENBERG EBOOK',
    '*** START OF THIS PROJECT GUTENBERG EBOOK',
    '***START OF THE PROJECT GUTENBERG EBOOK',
  ];
  let startIdx = -1;
  for (const marker of startMarkers) {
    const idx = text.indexOf(marker);
    if (idx !== -1) {
      // Move past the marker line
      const lineEnd = text.indexOf('\n', idx);
      startIdx = lineEnd !== -1 ? lineEnd + 1 : idx + marker.length;
      break;
    }
  }

  // Find end marker
  const endMarkers = [
    '*** END OF THE PROJECT GUTENBERG EBOOK',
    '*** END OF THIS PROJECT GUTENBERG EBOOK',
    '***END OF THE PROJECT GUTENBERG EBOOK',
    'End of the Project Gutenberg EBook',
    'End of Project Gutenberg',
  ];
  let endIdx = text.length;
  for (const marker of endMarkers) {
    const idx = text.indexOf(marker);
    if (idx !== -1) {
      endIdx = idx;
      break;
    }
  }

  const body = text.slice(startIdx === -1 ? 0 : startIdx, endIdx).trim();
  return body;
}

// Chapter heading patterns ordered by specificity
const CHAPTER_PATTERNS: { pattern: RegExp; label: (m: RegExpMatchArray) => string }[] = [
  // "CHAPTER I — Title" or "CHAPTER 1: Title"
  {
    pattern: /^(?:CHAPTER|Chapter)\s+([IVXLCDM]+|\d+)\s*[.:—–-]\s*(.+)$/,
    label: (m) => `Chapter ${normalizeNum(m[1])}${m[2] ? ' — ' + m[2].trim() : ''}`,
  },
  // "CHAPTER I" or "CHAPTER 1" (no subtitle)
  {
    pattern: /^(?:CHAPTER|Chapter)\s+([IVXLCDM]+|\d+)\.?\s*$/,
    label: (m) => `Chapter ${normalizeNum(m[1])}`,
  },
  // "PART ONE" / "BOOK II" / "VOLUME III" / "ACT I"
  {
    pattern: /^(?:PART|Part|BOOK|Book|VOLUME|Volume|ACT|Act)\s+([IVXLCDM]+|\d+|(?:ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE)[A-Z]*)\.?\s*$/i,
    label: (m) => m[0].trim(),
  },
  // Bare Roman numeral on its own line (I. or XIV.)
  {
    pattern: /^([IVXLCDM]+)\.?\s*$/,
    label: (m) => `Chapter ${romanToArabic(m[1])}`,
  },
];

function normalizeNum(s: string): string {
  // If it's a roman numeral, convert to arabic
  if (/^[IVXLCDM]+$/i.test(s)) {
    return String(romanToArabic(s.toUpperCase()));
  }
  return s;
}

function romanToArabic(roman: string): number {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let result = 0;
  for (let i = 0; i < roman.length; i++) {
    const current = map[roman[i]] || 0;
    const next = map[roman[i + 1]] || 0;
    result += current < next ? -current : current;
  }
  return result;
}

/** Detect chapters using heading patterns. Returns null if detection fails sanity checks. */
function detectChapters(text: string): GutenbergChapter[] | null {
  const lines = text.split('\n');

  // Try each pattern
  for (const { pattern, label } of CHAPTER_PATTERNS) {
    const boundaries: { lineIdx: number; title: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;
      const match = trimmed.match(pattern);
      if (match) {
        boundaries.push({ lineIdx: i, title: label(match) });
      }
    }

    if (boundaries.length < 3) continue;

    // Build chapters
    const chapters: GutenbergChapter[] = [];
    for (let i = 0; i < boundaries.length; i++) {
      const start = boundaries[i].lineIdx + 1;
      const end = i + 1 < boundaries.length ? boundaries[i + 1].lineIdx : lines.length;
      const content = lines.slice(start, end).join('\n').trim();
      chapters.push({
        id: `ch-${i + 1}`,
        title: boundaries[i].title,
        content,
      });
    }

    // Sanity checks
    const wordCounts = chapters.map(ch => ch.content.split(/\s+/).length);
    const allAbove200 = wordCounts.every(w => w >= 200);
    const noneOver15k = wordCounts.every(w => w <= 15000);

    // Relax: at least most chapters pass
    const passCount = wordCounts.filter(w => w >= 200 && w <= 15000).length;
    if (passCount >= boundaries.length * 0.7 || (allAbove200 && noneOver15k)) {
      return chapters;
    }
  }

  return null;
}

/** Fallback: split by word count at paragraph boundaries. */
function splitByWordCount(text: string, targetWords = 4000): GutenbergChapter[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chapters: GutenbergChapter[] = [];
  let currentContent = '';
  let currentWordCount = 0;
  let chapterNum = 1;

  for (const para of paragraphs) {
    const paraWords = para.trim().split(/\s+/).length;
    currentContent += (currentContent ? '\n\n' : '') + para.trim();
    currentWordCount += paraWords;

    if (currentWordCount >= targetWords) {
      chapters.push({
        id: `ch-${chapterNum}`,
        title: `Part ${chapterNum}`,
        content: currentContent,
      });
      chapterNum++;
      currentContent = '';
      currentWordCount = 0;
    }
  }

  // Remaining content
  if (currentContent.trim()) {
    // If very small, merge with previous
    if (chapters.length > 0 && currentWordCount < 500) {
      chapters[chapters.length - 1].content += '\n\n' + currentContent;
    } else {
      chapters.push({
        id: `ch-${chapterNum}`,
        title: `Part ${chapterNum}`,
        content: currentContent,
      });
    }
  }

  // Cap at 200 chapters
  if (chapters.length > 200) {
    const merged: GutenbergChapter[] = [];
    const groupSize = Math.ceil(chapters.length / 200);
    for (let i = 0; i < chapters.length; i += groupSize) {
      const group = chapters.slice(i, i + groupSize);
      merged.push({
        id: `ch-${merged.length + 1}`,
        title: `Part ${merged.length + 1}`,
        content: group.map(c => c.content).join('\n\n'),
      });
    }
    return merged;
  }

  return chapters;
}

/** Main entry: split Gutenberg text into chapters. */
export function splitIntoChapters(rawText: string): GutenbergChapter[] {
  const body = stripBoilerplate(rawText);

  // Try structured chapter detection first
  const detected = detectChapters(body);
  if (detected && detected.length >= 3) {
    return detected;
  }

  // Fallback to word-count splitting
  return splitByWordCount(body);
}
