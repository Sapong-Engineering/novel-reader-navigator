import { beforeEach, describe, expect, it } from 'vitest';
import { getRenderableCoverUrl, markCoverUrlFailed, resetFailedCoverUrls } from './cover-image';

describe('getRenderableCoverUrl', () => {
  beforeEach(() => {
    resetFailedCoverUrls();
  });

  it('blocks known hotlink-protected cover hosts', () => {
    expect(
      getRenderableCoverUrl('https://www.empirenovel.com/uploads/novel/example/cover/cover_250x350.jpg'),
    ).toBeUndefined();
  });

  it('returns valid embeddable cover URLs', () => {
    expect(
      getRenderableCoverUrl('https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg'),
    ).toBe('https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg');
  });

  it('does not retry cover URLs that already failed in this session', () => {
    const coverUrl = 'https://example.com/cover.jpg';

    markCoverUrlFailed(coverUrl);

    expect(getRenderableCoverUrl(coverUrl)).toBeUndefined();
  });
});
