import { beforeEach, describe, expect, it } from 'vitest';
import { getPdfReadingProgress, savePdfReadingProgress } from './pdf-progress';

describe('pdf progress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when no progress exists', () => {
    expect(getPdfReadingProgress('novel-1')).toEqual({
      pageNumber: 1,
      scrollTop: 0,
      updatedAt: null,
    });
  });

  it('persists and restores page progress', () => {
    savePdfReadingProgress('novel-1', 7, 1280);
    const restored = getPdfReadingProgress('novel-1');

    expect(restored.pageNumber).toBe(7);
    expect(restored.scrollTop).toBe(1280);
    expect(restored.updatedAt).toEqual(expect.any(String));
  });
});
