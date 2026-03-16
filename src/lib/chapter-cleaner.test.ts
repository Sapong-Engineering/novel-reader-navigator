/**
 * Tests for the removeInlineMedia ad-stripping pipeline.
 *
 * Following the established pattern (see sanitization.test.ts / content-scorer.test.ts):
 * the pure function is re-implemented locally because supabase/functions/ is outside
 * Vitest's module resolution scope.
 */
import { describe, it, expect } from 'vitest';

// ── Re-implement removeInlineMedia (mirrors chapter-cleaner.ts) ───────────────

function removeInlineMedia(content: string): string {
  // Step A: compound image-links [![img](imgUrl) text](linkUrl)
  // Middle section uses (?:[^\]]|\](?!\(https?:\/\/))*? to skip over nested ]
  // from inner images without stopping prematurely.
  content = content.replace(/\[!\[[^\]]*?\]\([^)]+?\)(?:[^\]]|\](?!\(https?:\/\/))*?\]\(https?:\/\/[^)]+?\)/gs, '');

  // Step B: standalone markdown images ![alt](url)
  content = content.replace(/!\[[^\]]*?\]\([^)]+?\)/g, '');

  // Step C: orphaned link wrappers left after image removal [  \ ](url)
  content = content.replace(/\[[\s\\]*\]\(https?:\/\/[^)]+?\)/g, '');

  // Step D: backslash-only lines + short label+backslash lines (ad captions)
  content = content.replace(/^\w[\w\s\-]{0,20}\\{1,2}\s*$/gm, '');
  content = content.replace(/^\\{1,2}\s*$/gm, '');

  // Step E: orphaned closing brackets — lines ending with ](url) with no [ opener
  // [^\[\n]* excludes \n to keep match on a single line.
  content = content.replace(/^[^\[\n]*\]\(https?:\/\/[^)]+\)\s*$/gm, '');

  return content;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Original toy-ify ad (single inner image — Step A original failure mode).
// Contains one inner ![Before] image and one inner ![After] image inside the
// outer compound link, meaning Step A's old [^\]]*? would stop at the first ].
const BESTPHOTO_TOY_AD =
  `[![](https://bestphoto.ai/android-chrome-512x512.png)\\` + '\n' +
  `EasyPhoto\\` + '\n' +
  `Toy-ify\\` + '\n' +
  `Transform anyone into a toy figure! Create Funko Pop, LEGO, and other toy versions!\\` + '\n' +
  `Free To Try\\` + '\n' +
  `No Sign Up\\` + '\n' +
  `Instant Results\\` + '\n' +
  `![Before - Original Image](https://images.bestphoto.ai/toy-before-9.jpg)\\` + '\n' +
  `Before\\` + '\n' +
  `![After - AI Enhanced Image](https://images.bestphoto.ai/toy-after-9.jpg)\\` + '\n' +
  `After - AI Enhanced](https://bestphoto.ai/free-tools/toy-ify)`;

// Photo-to-caricature variant — same structure, different inner images/URL.
// Represents the ad reported as slipping through the cleaner.
const BESTPHOTO_CARICATURE_AD =
  `[![](https://bestphoto.ai/logo.png)\\` + '\n' +
  `Before\\` + '\n' +
  `![After - AI Enhanced Image](https://images.bestphoto.ai/caricature-after.jpg)\\` + '\n' +
  `After - AI Enhanced](https://bestphoto.ai/free-tools/photo-to-caricature)`;

// The orphaned tail fragment that appeared in real scraped content — the remnant
// after Steps A–D (old pipeline) failed to match the full compound link.
const ORPHANED_CLOSING_BRACKET =
  `Before\\` + '\n\n' +
  `After - AI Enhanced](https://bestphoto.ai/free-tools/photo-to-caricature)`;

// A nav link that must NOT be removed by Step E (has [ opener on same line).
const NAV_LINK = `[Previous Chapter](https://wuxia.click/chapter/foo-1)`;

// Clean prose that must survive all steps unchanged.
const PROSE = `Luo Feng stood atop the cliff, the wind howling around him as he gazed out across the vast expanse of the Nilotic Sea.`;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('removeInlineMedia — Step A (compound image-link with nested inner images)', () => {
  it('removes the toy-ify bestphoto.ai ad (nested inner images inside outer link)', () => {
    const result = removeInlineMedia(BESTPHOTO_TOY_AD);
    expect(result).not.toContain('bestphoto.ai');
    expect(result).not.toContain('![');
    expect(result.trim()).toBe('');
  });

  it('removes the photo-to-caricature bestphoto.ai ad (reported regression)', () => {
    const result = removeInlineMedia(BESTPHOTO_CARICATURE_AD);
    expect(result).not.toContain('bestphoto.ai');
    expect(result).not.toContain('![');
  });

  it('does not remove plain prose', () => {
    const result = removeInlineMedia(PROSE);
    expect(result.trim()).toBe(PROSE.trim());
  });
});

describe('removeInlineMedia — Step D (short label+backslash lines)', () => {
  it('removes "Before\\\\" orphaned caption lines', () => {
    const result = removeInlineMedia('Before\\\\');
    expect(result.trim()).toBe('');
  });

  it('removes backslash-only lines', () => {
    const result = removeInlineMedia('\\\\');
    expect(result.trim()).toBe('');
  });

  it('does not remove short prose sentences without trailing backslashes', () => {
    const short = 'He smiled.';
    const result = removeInlineMedia(short);
    expect(result.trim()).toBe(short);
  });
});

describe('removeInlineMedia — Step E (orphaned closing bracket sweep)', () => {
  it('removes a line ending with ](url) that has no [ opener', () => {
    const orphan = 'After - AI Enhanced](https://bestphoto.ai/free-tools/photo-to-caricature)';
    const result = removeInlineMedia(orphan);
    expect(result).not.toContain('bestphoto.ai');
    expect(result.trim()).toBe('');
  });

  it('handles the full two-block orphaned tail (Before\\\\ + closing bracket line)', () => {
    const result = removeInlineMedia(ORPHANED_CLOSING_BRACKET);
    expect(result).not.toContain('bestphoto.ai');
    expect(result).not.toContain('After - AI Enhanced]');
  });

  it('does NOT remove a nav link that has a [ opener on the same line', () => {
    const result = removeInlineMedia(NAV_LINK);
    // Step E should not touch this — it has [ before ]
    expect(result).toContain(NAV_LINK);
  });

  it('does NOT remove prose text containing a ] that is not a link closer', () => {
    const prose = 'The array [1, 2, 3] held three values and nothing more.';
    const result = removeInlineMedia(prose);
    expect(result.trim()).toBe(prose);
  });
});

describe('removeInlineMedia — combined (prose + ad block)', () => {
  it('strips ad widget embedded between two prose paragraphs', () => {
    const content =
      PROSE + '\n\n' +
      BESTPHOTO_CARICATURE_AD + '\n\n' +
      PROSE;
    const result = removeInlineMedia(content);
    expect(result).not.toContain('bestphoto.ai');
    expect(result).toContain('Luo Feng stood');
    // Prose appears twice (before and after the ad)
    expect(result.split('Luo Feng stood').length - 1).toBe(2);
  });
});
