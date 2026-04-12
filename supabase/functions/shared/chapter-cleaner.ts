import { scoreBlock, isNoiseBlock } from './content-scorer.ts';

/**
 * Cleans scraped chapter markdown by stripping navigation, branding,
 * breadcrumbs, ads, and site chrome so only novel text remains.
 */
export function cleanChapterContent(markdown: string, url: string): string {
  let content = markdown;

  // ── Site-specific cleaning ──────────────────────────────────
  if (/wuxia\.click/i.test(url)) {
    content = cleanWuxiaClick(content);
  } else if (/novelbin\.(?:com|net|me)/i.test(url)) {
    content = cleanNovelBin(content);
  } else if (/empirenovel\.com/i.test(url)) {
    content = cleanEmpireNovel(content);
  }

  // ── Generic cleaning (all sites) ───────────────────────────

  // Structural cleaning: strip inline media, score each block, discard noise
  // blocks, and truncate the tail zone (comment widgets, footers, ad sections).
  // Handles any ad network or comment system generically — no hardcoded URLs.
  content = applyStructuralCleaning(content);

  // Final-pass targeted regex for navigation patterns that survive scoring
  // (single short link lines with "Previous"/"Next" don't always trigger the
  // multi-signal threshold but are unambiguously non-prose).

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

  // Ensure chapter title lines are separated from body text with double newlines
  // Matches "Chapter N", "Ch. N", "Episode N", "Part N", "Volume N", "Book N"
  content = content.replace(
    /^((?:Chapter|Ch\.?|Episode|Part|Book|Volume)\s+\d+[^\n]*)\n(?!\n)/gim,
    '$1\n\n'
  );

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
  content = content.replace(/^(?:\s|\p{Emoji_Presentation}|\p{Extended_Pictographic}|\u200d|\ufe0f)+$/gmu, '');

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

/** novelbin.com specific cleanup */
function cleanNovelBin(content: string): string {
  const lines = content.split('\n');

  // Find the chapter title line: "#### Chapter N: Title" or "Chapter N — Title"
  let chapterTitleIdx = -1;
  for (let i = 0; i < lines.length && i < 80; i++) {
    const line = lines[i].trim();
    if (/^#{0,6}\s*Chapter\s+\d+/i.test(line)) {
      chapterTitleIdx = i;
      break;
    }
  }

  if (chapterTitleIdx > 0) {
    content = lines.slice(chapterTitleIdx).join('\n');
  }

  // Remove markdown heading markers from chapter title
  content = content.replace(/^#{1,6}\s+(Chapter\s+\d+)/m, '$1');

  // Remove breadcrumb navigation at top
  content = content.replace(/^\d+\.\s*\[.*?\]\(.*?\)\s*$/gim, '');

  // Remove "Prev Chapter" / "Next Chapter" links and surrounding rules
  content = content.replace(/\[Prev Chapter\].*?\[Next Chapter\].*$/gim, '');
  content = content.replace(/^\*\s*\*\s*\*\s*$/gm, '');

  // Remove Translator/Editor credit lines
  content = content.replace(/^(?:Translator|Editor)\s*:\s*.+$/gim, '');

  // Remove novelbin watermarks/branding
  content = content.replace(/^.*(?:novelbin|novel\s*bin).*$/gim, '');

  // Remove "Reading" / "Plan to Read" / list links
  content = content.replace(/^\[(?:Reading|Plan to Read|Completed|Dropped)\].*$/gim, '');

  // Remove rating lines
  content = content.replace(/^_\*\*\d+\.?\d*\*\*_\s*$/gm, '');
  content = content.replace(/^_\/?_\s*$/gm, '');
  content = content.replace(/^_\d+_\s*$/gm, '');
  content = content.replace(/^_\*\*ratings?\*\*_\s*$/gim, '');

  // Remove "Novel info" / "## Novel info" sections
  content = content.replace(/^#{1,6}\s*Novel\s*info\s*$/gim, '');

  // Remove site footer / recommendation sections
  content = content.replace(/^.*(?:Terms of Service|Privacy Policy|DMCA|Copyright|Contact Us).*$/gim, '');

  // Remove image links to other novels at the bottom
  content = content.replace(/\[!\[.*?\]\(https?:\/\/images\.novelbin.*?\)\\\\/gim, '');

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

/**
 * Applies the structural cleaning algorithm to post-header-strip content.
 *
 * Three steps:
 *  1. Pre-process: strip inline media (images, compound image-links)
 *  2. Score each \n\n-delimited block — discard blocks scoring ≥ 0.40
 *  3. Detect story endpoint (last block with score < 0.40 AND ≥ 20 words)
 *     and truncate everything after it (the "tail zone")
 */
function applyStructuralCleaning(content: string): string {
  // Pre-process: remove markdown images and compound image-links first.
  // This improves scoring accuracy (image presence is the strongest signal)
  // and removes multi-line ad widgets before block splitting.
  content = removeInlineMedia(content);

  const blocks = content.split('\n\n');
  const scores = blocks.map(b => scoreBlock(b));

  // Find story endpoint: last block that is clearly prose (score < 0.40, ≥ 20 words).
  // Everything after this is the tail zone (comment sections, footers, rating widgets).
  let storyEndIdx = blocks.length - 1;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const wordCount = blocks[i].trim().split(/\s+/).length;
    if (scores[i] < 0.40 && wordCount >= 20) {
      storyEndIdx = i;
      break;
    }
  }

  // Keep only non-noise blocks up to and including the story endpoint.
  const kept = blocks
    .slice(0, storyEndIdx + 1)
    .filter((_b, i) => !isNoiseBlock(blocks[i]));

  return kept.join('\n\n');
}

/**
 * Removes inline media and ad widgets from scraped Markdown.
 * Novel chapter prose never legitimately contains images or external links —
 * any such Markdown is noise from ads, banners, or promotional widgets.
 */
function removeInlineMedia(content: string): string {
  // Normalize Windows line endings so all steps use consistent \n
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Step A: Strip compound image-links [![img](imgUrl) text](linkUrl)
  // The `s` flag (dotAll) lets . match \n so multi-line widgets are caught.
  // Middle section uses (?:[^\]]|\](?!\(https?:\/\/))*? to skip over nested ]
  // from inner images without stopping prematurely.
  content = content.replace(/\[!\[[^\]]*?\]\([^)]+?\)(?:[^\]]|\](?!\(https?:\/\/))*?\]\(https?:\/\/[^)]+?\)/gs, '');

  // Step B: Strip remaining standalone markdown images ![alt](url)
  content = content.replace(/!\[[^\]]*?\]\([^)]+?\)/g, '');

  // Step C: Strip orphaned link wrappers left after image removal [  \ ](url)
  content = content.replace(/\[[\s\\]*\]\(https?:\/\/[^)]+?\)/g, '');

  // Step D: Remove ALL lines ending with backslash (Firecrawl <br> artifacts,
  // including ad caption lines with punctuation like "Description text!\\").
  content = content.replace(/^.+\\{1,2}\s*$/gm, '');
  content = content.replace(/^\\{1,2}\s*$/gm, '');

  // Step E: Orphaned closing brackets — lines ending with ](url) with no [ opener.
  // [^\[\n]* excludes \n to keep match on a single line.
  content = content.replace(/^[^[\n]*\]\(https?:\/\/[^)]+\)\s*$/gm, '');

  // Step F: EasyPic AI image generator ads — title repeated verbatim followed by
  // a "Made with '<model>' Model" attribution line. Firecrawl may emit these with
  // single \n (br-style) or double \n\n (paragraph-style) separators, so we
  // match \n{1,2} between parts. Model name uses [^\n]+ to tolerate any quote style.
  // e.g. "Reveal Character!\n\nReveal Character!\n\nMade with 'SeekAstral v1.0' Model"
  content = content.replace(/^([^\n]+)\n{1,2}\1\n{1,2}Made with [^\n]+ Model[ \t]*$/gm, '');

  return content;
}
