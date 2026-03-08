/**
 * Cleans scraped chapter markdown by stripping navigation, branding,
 * breadcrumbs, ads, and site chrome so only novel text remains.
 */
export function cleanChapterContent(markdown: string, url: string): string {
  let content = markdown;

  // ── Site-specific cleaning ──────────────────────────────────
  if (/wuxia\.click/i.test(url)) {
    content = cleanWuxiaClick(content);
  } else if (/empirenovel\.com/i.test(url)) {
    content = cleanEmpireNovel(content);
  }

  // ── Generic cleaning (all sites) ───────────────────────────

  // Remove markdown links to Previous/Next Chapter navigation
  content = content.replace(/\[.*?(?:Previous|Next)\s*(?:Chapter)?\s*\]\(.*?\)/gi, '');

  // Remove standalone "Previous Chapter" / "Next Chapter" text lines
  content = content.replace(/^.*(?:Previous|Next)\s+Chapter.*$/gim, '');

  // Remove breadcrumb-style lines: "Home > Novel > Chapter"
  content = content.replace(/^.*(?:Home|Novel|Chapters?)\s*[>›»→/]\s*.*$/gim, '');

  // Remove cookie/consent banners
  content = content.replace(/Your experience on this site.*$/si, '');
  content = content.replace(/We use cookies.*$/si, '');

  // Remove lines that are just markdown links (site nav)
  content = content.replace(/^\[.*?\]\(https?:\/\/[^)]+\)\s*$/gim, '');

  // Remove lines that are just URLs
  content = content.replace(/^https?:\/\/\S+\s*$/gim, '');

  // Remove horizontal rules used as section dividers at start/end
  content = content.replace(/^(?:---|___|\*\*\*)\s*\n/gm, '');

  // Remove empty markdown headings
  content = content.replace(/^#{1,6}\s*$/gm, '');

  // Clean up excessive newlines
  content = content.replace(/\n{4,}/g, '\n\n\n');

  return content.trim();
}

/** wuxia.click specific cleanup */
function cleanWuxiaClick(content: string): string {
  // The wuxia.click scrape returns a block of site UI elements before the actual chapter text.
  // Pattern: emoji icons, "# CH N", "[Novel Info]", "All Chapters", "A+", "A-", 
  //          "Mark Read", emoji, "Play", then "Chapter N: Title" followed by story text.
  //
  // Strategy: find the chapter title line ("Chapter N: Title" or "Chapter N") 
  // and discard everything before it.

  const lines = content.split('\n');

  // Find the chapter title line — it's typically "Chapter N: Title" or "Chapter N"
  // but NOT "# CH N" (which is site UI)
  let chapterTitleIdx = -1;
  for (let i = 0; i < lines.length && i < 80; i++) {
    const line = lines[i].trim();
    // Match "Chapter N: Title" or "Chapter N" as a standalone line (not "# CH N")
    if (/^Chapter\s+\d+/i.test(line) && !/^#/.test(line)) {
      chapterTitleIdx = i;
      break;
    }
  }

  if (chapterTitleIdx > 0) {
    // Keep from the chapter title line onward
    content = lines.slice(chapterTitleIdx).join('\n');
  }

  // Now clean remaining site chrome that might appear after the chapter text

  // Remove "# CH N" headings (site UI, not chapter title)
  content = content.replace(/^#\s*CH\s*\d+.*$/gim, '');

  // Remove site branding header
  content = content.replace(/^#{1,6}\s*(?:Wuxia\.?click|WuxiaClick).*$/gim, '');

  // Remove "[Novel Info]" lines
  content = content.replace(/^\[?Novel\s*Info\]?.*$/gim, '');

  // Remove "All Chapters" lines
  content = content.replace(/^All\s+Chapters?\s*$/gim, '');

  // Remove font size controls "A+" "A-"
  content = content.replace(/^A[+-]\s*$/gm, '');

  // Remove "Mark Read" / bookmark / follow / report lines
  content = content.replace(/^.*(?:Mark\s*Read|Bookmark|Follow|Report|Add to Library|Reading List).*$/gim, '');

  // Remove "Play" button text
  content = content.replace(/^Play\s*$/gim, '');

  // Remove lines that are just emoji(s) and/or whitespace
  content = content.replace(/^[\s\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f]+$/gmu, '');

  // Remove lines that are just backslashes (escaped chars from scrape)
  content = content.replace(/^\\+\s*$/gm, '');

  // Remove lines that are just "/" or "\" 
  content = content.replace(/^[/\\]\s*$/gm, '');

  // Remove "Read at wuxia.click" watermarks
  content = content.replace(/^.*(?:Read|Visit)\s+(?:at\s+)?wuxia\.click.*$/gim, '');

  // Remove rating/review/view count lines
  content = content.replace(/^.*(?:\d+\s*(?:ratings?|reviews?|views?|stars?)).*$/gim, '');

  // Remove site footer lines
  content = content.replace(/^.*(?:Terms of Service|Privacy Policy|Contact Us|DMCA|Copyright).*$/gim, '');

  // Remove chapter navigation blocks like "Chapter 1 | Chapter 2 | ..."
  content = content.replace(/^(?:Chapter\s+\d+\s*\|?\s*)+$/gim, '');

  // Remove "Translator:" / "Editor:" credit lines
  content = content.replace(/^(?:Translator|Editor|TL|ED)\s*:.*$/gim, '');

  // Clean trailing site chrome: after the last substantial paragraph, 
  // remove short lines that look like site UI
  const resultLines = content.split('\n');
  let lastContentIdx = resultLines.length - 1;
  for (let i = resultLines.length - 1; i >= 0; i--) {
    const line = resultLines[i].trim();
    if (!line) continue;
    // If line is substantial text (80+ chars), it's likely story content
    if (line.length >= 80) {
      lastContentIdx = i;
      break;
    }
    // Short lines at the end that aren't quotes or dialogue — likely site chrome
    if (line.length < 30 && !line.startsWith('"') && !line.startsWith("'") && !line.startsWith('\u201c')) {
      resultLines[i] = '';
    } else {
      lastContentIdx = i;
      break;
    }
  }

  content = resultLines.join('\n');

  return content;
}

/** empirenovel.com specific cleanup */
function cleanEmpireNovel(content: string): string {
  // Remove site branding
  content = content.replace(/^#{1,6}\s*(?:EmpireNovel|Empire\s*Novel).*$/gim, '');

  // Remove ad placeholders
  content = content.replace(/^.*(?:Advertisement|Sponsored|Ad\s*Block).*$/gim, '');

  return content;
}
