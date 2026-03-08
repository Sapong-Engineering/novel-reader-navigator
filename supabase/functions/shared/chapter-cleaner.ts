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
  // Remove site branding header (e.g. "##### Wuxia.click" or logo lines)
  content = content.replace(/^#{1,6}\s*(?:Wuxia\.?click|WuxiaClick).*$/gim, '');

  // Remove "Read at wuxia.click" / "Visit wuxia.click" watermarks
  content = content.replace(/^.*(?:Read|Visit)\s+(?:at\s+)?wuxia\.click.*$/gim, '');

  // Remove bookmark/follow/report buttons text
  content = content.replace(/^.*(?:Bookmark|Follow|Report|Add to Library|Reading List).*$/gim, '');

  // Remove rating/review lines
  content = content.replace(/^.*(?:\d+\s*(?:ratings?|reviews?|views?|stars?)).*$/gim, '');

  // Remove chapter navigation blocks like "Chapter 1 | Chapter 2 | ..."
  content = content.replace(/^(?:Chapter\s+\d+\s*\|?\s*)+$/gim, '');

  // Remove site footer lines
  content = content.replace(/^.*(?:Terms of Service|Privacy Policy|Contact Us|DMCA|Copyright).*$/gim, '');

  // Remove "Translator:" / "Editor:" credit lines at the very top (keep if in middle of content)
  content = content.replace(/^(?:Translator|Editor|TL|ED)\s*:.*$/gim, '');

  // Remove the block of metadata that appears before chapter content
  // Pattern: everything before the first real paragraph (2+ sentences or 100+ chars)
  const lines = content.split('\n');
  let contentStartIdx = 0;
  for (let i = 0; i < lines.length && i < 30; i++) {
    const line = lines[i].trim();
    // Skip empty lines, short metadata, headings
    if (!line || line.startsWith('#') || line.startsWith('[') || line.startsWith('!') ||
        line.length < 60 || /^[\s*_\-|>#\[\]!]/.test(line)) {
      continue;
    }
    // Found a substantial paragraph — this is likely the start of actual content
    contentStartIdx = i;
    break;
  }

  // Keep the chapter title heading if it's right before the content
  if (contentStartIdx > 0) {
    for (let i = contentStartIdx - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('#') && /chapter/i.test(line)) {
        contentStartIdx = i;
        break;
      }
      if (line) break; // stop at first non-empty non-heading line
    }
    lines.splice(0, contentStartIdx);
    content = lines.join('\n');

  }

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
