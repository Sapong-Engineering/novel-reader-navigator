import { beforeEach, describe, expect, it } from 'vitest';
import { clearQueue, enqueue, peekAll } from './offline-queue';

describe('offline queue conflict handling', () => {
  beforeEach(() => {
    localStorage.clear();
    clearQueue();
  });

  it('drops pending sync when a delete is queued for the same novel', () => {
    enqueue('syncNovel', { novelId: 'novel-1' });
    enqueue('deleteNovel', { localId: 'novel-1', deletedAt: '2026-04-20T10:00:00.000Z' });

    expect(peekAll()).toEqual([
      expect.objectContaining({
        type: 'deleteNovel',
        payload: expect.objectContaining({ localId: 'novel-1' }),
      }),
    ]);
  });

  it('does not queue a sync while a delete is pending for the same novel', () => {
    enqueue('deleteNovel', { localId: 'novel-1', deletedAt: '2026-04-20T10:00:00.000Z' });
    enqueue('syncNovel', { novelId: 'novel-1' });

    expect(peekAll()).toHaveLength(1);
    expect(peekAll()[0].type).toBe('deleteNovel');
  });
});
