/**
 * content-scorer.ts
 *
 * Scores scraped Markdown blocks on a 0.0–1.0 noise scale.
 * 0.0 = pure story prose.  1.0 = pure site chrome / ad / UI widget.
 *
 * Uses only structural signals — no hardcoded URLs, product names, or
 * platform-specific text — so it handles any future ad network or comment
 * system without needing new rules.
 *
 * All functions are pure TypeScript with no Deno-specific APIs so they
 * can be tested with Vitest as well as run in the Edge Function runtime.
 */

// ── UI keyword vocabulary ─────────────────────────────────────────────────────
// Phrases that indicate site chrome, not story prose. The scorer counts how
// many of these appear in a block; 2+ is a strong noise signal.

export const UI_VOCABULARY: readonly string[] = [
  // Navigation
  'Previous Chapter', 'Next Chapter', 'Table of Contents', 'All Chapters',
  'Chapter List', 'Read Next', 'Read Prev',
  // Site chrome
  'Novel Info', 'Read at', 'Visit us at', 'Originally posted',
  'Mark Read', 'Bookmark', 'Follow Novel', 'Add to Library',
  // Comments / engagement
  'Report chapter', 'What do you think', 'Total Responses', 'Loading comments',
  'Sort by', 'Add a Comment', 'Post Comment', 'Load More', 'Submit Reply',
  'Upvote', 'Downvote', 'Reaction',
  // Legal / footer
  'Terms of Service', 'Privacy Policy', 'Cookie Policy', 'DMCA', 'Copyright',
  'Contact Us',
  // Promotional
  'Free To Try', 'No Sign Up', 'Instant Results',
  'Advertisement', 'Sponsored', 'Ad Block',
  // Auth
  'Log in', 'Sign in', 'Register', 'Create account',
  // Credits
  'Translator', 'Editor', 'Proofreader',
];

// ── Primitive signal functions ────────────────────────────────────────────────

/**
 * Ratio of characters that are inside Markdown link text/URLs `[text](url)`
 * to total characters in the block. Returns 0.0–1.0.
 * High link density (> 0.20) is a strong indicator of nav or ad content.
 */
export function computeLinkDensity(text: string): number {
  if (!text) return 0;
  let linkChars = 0;
  // Match [text](url) — count all chars of the entire match
  const linkPattern = /\[[^\]]*?\]\([^)]*?\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkPattern.exec(text)) !== null) {
    linkChars += m[0].length;
  }
  return Math.min(1.0, linkChars / text.length);
}

/**
 * Ratio of lines shorter than 25 characters to total lines in the block.
 * Returns 0.0–1.0.
 * UI widgets stack short label strings vertically; prose lines are typically
 * 60–100 chars.
 */
export function computeShortLineRatio(text: string): number {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return 0;
  const shortLines = lines.filter(l => l.trim().length < 25).length;
  return shortLines / lines.length;
}

/**
 * Number of UI_VOCABULARY entries found in the block (case-insensitive).
 */
export function countUIKeywords(text: string): number {
  const lower = text.toLowerCase();
  return UI_VOCABULARY.filter(kw => lower.includes(kw.toLowerCase())).length;
}

/**
 * Count of `http://` or `https://` occurrences in the block.
 * Multiple URLs in a single block is a sign of nav menus or ad widgets.
 */
export function countExternalUrls(text: string): number {
  return (text.match(/https?:\/\//g) ?? []).length;
}

// ── Composite scorer ──────────────────────────────────────────────────────────

/**
 * Assigns a noise score 0.0–1.0 to a single `\n\n`-separated content block.
 *
 * Signal weights are additive and clamped to 1.0:
 *
 *   +0.60  block contains a Markdown image `![`  (prose never has images)
 *   +0.30  link density > 20%                    (ads/nav are link-heavy)
 *   +0.25  short-line ratio > 60% AND < 40 words (stacked UI labels)
 *   +0.25  ≥ 2 UI vocabulary matches             (site chrome language)
 *   +0.20  ≥ 2 external URLs                     (link-heavy content)
 *   +0.15  Markdown heading with < 15 words       (short UI section headers)
 *
 * Threshold for "noise": score ≥ 0.40  (see isNoiseBlock).
 */
export function scoreBlock(text: string): number {
  if (!text.trim()) return 1.0; // empty blocks are noise

  let score = 0;

  // Strong: markdown image syntax — chapter prose never contains images
  if (/!\[/.test(text)) score += 0.60;

  // Link-heavy block
  if (computeLinkDensity(text) > 0.20) score += 0.30;

  // Stacked short lines (UI chrome pattern) with low word count
  const wordCount = text.trim().split(/\s+/).length;
  if (computeShortLineRatio(text) > 0.60 && wordCount < 40) score += 0.25;

  // Multiple UI vocabulary matches
  if (countUIKeywords(text) >= 2) score += 0.25;

  // Multiple external URLs
  if (countExternalUrls(text) >= 2) score += 0.20;

  // Short Markdown heading (site UI section header, not a chapter title)
  if (/^#{1,6}\s+.{1,40}$/m.test(text) && wordCount < 15) score += 0.15;

  return Math.min(1.0, score);
}

/**
 * Returns true if the block is classified as noise.
 * @param threshold  Default 0.40 — blocks at or above this score are noise.
 */
export function isNoiseBlock(text: string, threshold = 0.40): boolean {
  return scoreBlock(text) >= threshold;
}
