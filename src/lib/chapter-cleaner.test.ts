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

  // Step D: Remove ALL lines ending with backslash (Firecrawl <br> artifacts,
  // including ad caption lines with punctuation like "Description text!\\").
  content = content.replace(/^.+\\{1,2}\s*$/gm, '');
  content = content.replace(/^\\{1,2}\s*$/gm, '');

  // Step E: orphaned closing brackets — lines ending with ](url) with no [ opener
  // [^\[\n]* excludes \n to keep match on a single line.
  content = content.replace(/^[^\[\n]*\]\(https?:\/\/[^)]+\)\s*$/gm, '');

  // Step F: EasyPic AI image generator ads — title repeated verbatim + "Made with '...' Model"
  content = content.replace(/^([^\n]+)\n{1,2}\1\n{1,2}Made with [^\n]+ Model[ \t]*$/gm, '');

  return content;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Original toy-ify ad (single inner image — Step A original failure mode).
const BESTPHOTO_TOY_AD =
  `[![](https://bestphoto.ai/android-chrome-512x512.png)\\` + '\n' +
  `EasyPhoto\\` + '\n' +
  `Toy-ify\\` + '\n' +
  `Free To Try\\` + '\n' +
  `![Before - Original Image](https://images.bestphoto.ai/toy-before-9.jpg)\\` + '\n' +
  `Before\\` + '\n' +
  `![After - AI Enhanced Image](https://images.bestphoto.ai/toy-after-9.jpg)\\` + '\n' +
  `After - AI Enhanced](https://bestphoto.ai/free-tools/toy-ify)`;

// Photo-to-caricature variant — reported regression.
const BESTPHOTO_CARICATURE_AD =
  `[![](https://bestphoto.ai/logo.png)\\` + '\n' +
  `Before\\` + '\n' +
  `![After - AI Enhanced Image](https://images.bestphoto.ai/caricature-after.jpg)\\` + '\n' +
  `After - AI Enhanced](https://bestphoto.ai/free-tools/photo-to-caricature)`;

// The orphaned tail fragment that appeared in real scraped content.
const ORPHANED_CLOSING_BRACKET =
  `Before\\` + '\n\n' +
  `After - AI Enhanced](https://bestphoto.ai/free-tools/photo-to-caricature)`;

// A nav link that must NOT be removed by Step E.
const NAV_LINK = `[Previous Chapter](https://wuxia.click/chapter/foo-1)`;

// EasyPhoto text-only ad (no compound image-link — just backslash-terminated lines).
// Description line has punctuation (!, ,) which broke the old narrow Step D pattern.
const EASYPHOTO_TEXT_AD =
  `EasyPhoto\\` + '\n' +
  `Roman Statue\\` + '\n' +
  `Transform people into classical Roman marble statues! Create timeless artistic portraits!\\` + '\n' +
  `Free To Try\\` + '\n' +
  `No Sign Up\\` + '\n' +
  `Instant Results\\` + '\n' +
  `Before\\` + '\n' +
  `After - AI Enhanced](https://bestphoto.ai/free-tools/roman-statue)`;

// EasyPic AI image ads — repeated title + "Made with '...' Model" (no URL, no backslash).
// Double-newline (paragraph) variant:
const EASYPIC_REVEAL_AD =
  `Reveal Character!\n\nReveal Character!\n\nMade with 'SeekAstral v1.0' Model`;

const EASYPIC_CRAFT_AD =
  `Craft Your Masterpiece\n\nCraft Your Masterpiece\n\nMade with 'architecture watercolor style建筑水彩画风格 v1.0' Model`;

// Single-newline (br) variant — Firecrawl sometimes emits these as <br> breaks:
const EASYPIC_REVEAL_AD_SINGLE_NL =
  `Reveal Character!\nReveal Character!\nMade with 'SeekAstral v1.0' Model`;

// Clean prose that must survive all steps unchanged.
const PROSE = `Luo Feng stood atop the cliff, the wind howling around him as he gazed out across the vast expanse of the Nilotic Sea.`;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('removeInlineMedia — Step A (compound image-link with nested inner images)', () => {
  it('removes the toy-ify bestphoto.ai ad (nested inner images inside outer link)', () => {
    const result = removeInlineMedia(BESTPHOTO_TOY_AD);
    expect(result).not.toContain('bestphoto.ai');
    expect(result).not.toContain('![');
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

describe('removeInlineMedia — Step D (backslash-terminated lines)', () => {
  it('removes "Before\\\\" orphaned caption lines', () => {
    const result = removeInlineMedia('Before\\\\');
    expect(result.trim()).toBe('');
  });

  it('removes backslash-only lines', () => {
    const result = removeInlineMedia('\\\\');
    expect(result.trim()).toBe('');
  });

  it('removes description lines with punctuation ending in backslash', () => {
    const line = 'Transform people into classical Roman marble statues! Create timeless artistic portraits!\\\\';
    const result = removeInlineMedia(line);
    expect(result.trim()).toBe('');
  });

  it('does not remove short prose sentences without trailing backslashes', () => {
    const short = 'He smiled.';
    const result = removeInlineMedia(short);
    expect(result.trim()).toBe(short);
  });
});

describe('removeInlineMedia — EasyPhoto text-only ad (no compound image-link)', () => {
  it('removes all lines of the text-only EasyPhoto ad including description with punctuation', () => {
    const result = removeInlineMedia(EASYPHOTO_TEXT_AD);
    expect(result).not.toContain('bestphoto.ai');
    expect(result).not.toContain('Roman Statue');
    expect(result).not.toContain('Transform people');
    expect(result.trim()).toBe('');
  });

  it('strips EasyPhoto text ad embedded between two prose paragraphs', () => {
    const content = PROSE + '\n\n' + EASYPHOTO_TEXT_AD + '\n\n' + PROSE;
    const result = removeInlineMedia(content);
    expect(result).not.toContain('bestphoto.ai');
    expect(result).not.toContain('Roman Statue');
    expect(result).toContain('Luo Feng stood');
    expect(result.split('Luo Feng stood').length - 1).toBe(2);
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
    expect(result).toContain(NAV_LINK);
  });

  it('does NOT remove prose text containing a ] that is not a link closer', () => {
    const prose = 'The array [1, 2, 3] held three values and nothing more.';
    const result = removeInlineMedia(prose);
    expect(result.trim()).toBe(prose);
  });
});

describe('removeInlineMedia — Step F (EasyPic repeated-title + Made with Model)', () => {
  it('removes "Reveal Character!" variant', () => {
    const result = removeInlineMedia(EASYPIC_REVEAL_AD);
    expect(result).not.toContain('Reveal Character');
    expect(result).not.toContain('SeekAstral');
    expect(result.trim()).toBe('');
  });

  it('removes "Craft Your Masterpiece" variant with unicode in model name', () => {
    const result = removeInlineMedia(EASYPIC_CRAFT_AD);
    expect(result).not.toContain('Craft Your Masterpiece');
    expect(result).not.toContain('Made with');
    expect(result.trim()).toBe('');
  });

  it('removes EasyPic ad embedded between two prose paragraphs', () => {
    const content = PROSE + '\n\n' + EASYPIC_REVEAL_AD + '\n\n' + PROSE;
    const result = removeInlineMedia(content);
    expect(result).not.toContain('Reveal Character');
    expect(result).toContain('Luo Feng stood');
    expect(result.split('Luo Feng stood').length - 1).toBe(2);
  });

  it('removes single-newline (br-style) "Reveal Character!" variant', () => {
    const result = removeInlineMedia(EASYPIC_REVEAL_AD_SINGLE_NL);
    expect(result).not.toContain('Reveal Character');
    expect(result).not.toContain('SeekAstral');
    expect(result.trim()).toBe('');
  });

  it('does NOT remove prose where a sentence happens to repeat', () => {
    // Prose can theoretically repeat a short phrase — ensure we do not over-remove.
    // The distinguishing marker is the "Made with '...' Model" line; without it, no removal.
    const repeated = `He waited.\n\nHe waited.\n\nSilence stretched on.`;
    const result = removeInlineMedia(repeated);
    expect(result.trim()).toBe(repeated);
  });
});

describe('removeInlineMedia — combined (prose + ad block)', () => {
  it('strips ad widget embedded between two prose paragraphs', () => {
    const content = PROSE + '\n\n' + BESTPHOTO_CARICATURE_AD + '\n\n' + PROSE;
    const result = removeInlineMedia(content);
    expect(result).not.toContain('bestphoto.ai');
    expect(result).not.toContain('After - AI Enhanced]');
    expect(result).toContain('Luo Feng stood');
    expect(result.split('Luo Feng stood').length - 1).toBe(2);
  });
});
