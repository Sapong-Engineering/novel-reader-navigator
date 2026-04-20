import { describe, expect, it } from 'vitest';
import { normalizePdfTitle } from './pdf-import';

describe('normalizePdfTitle', () => {
  it('removes the extension and normalizes separators', () => {
    expect(normalizePdfTitle('My_Book-2026.pdf')).toBe('My Book 2026');
  });

  it('falls back to a readable default for empty names', () => {
    expect(normalizePdfTitle('.pdf')).toBe('Untitled PDF');
  });
});
