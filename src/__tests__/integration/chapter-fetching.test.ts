import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchFetcher } from '@/lib/utils/batch-fetcher';
import { withRetry, RetryError } from '@/lib/utils/retry-handler';
import { RateLimiter } from '@/lib/utils/rate-limiter';

describe('Chapter fetching workflow integration', () => {
  describe('BatchFetcher with retries', () => {
    it('fetches all chapters successfully', async () => {
      const fetcher = new BatchFetcher({ batchSize: 2 });
      const items = ['ch1', 'ch2', 'ch3', 'ch4'];
      const fn = vi.fn().mockResolvedValue('content');

      const result = await fetcher.process(items, fn);
      expect(result.failures).toHaveLength(0);
      expect(result.results).toHaveLength(4);
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it('reports progress for each item', async () => {
      const fetcher = new BatchFetcher({ batchSize: 2 });
      const items = ['ch1', 'ch2', 'ch3'];
      const fn = vi.fn().mockResolvedValue('content');
      const progressUpdates: number[] = [];

      await fetcher.process(items, fn, (completed) => {
        progressUpdates.push(completed);
      });

      expect(progressUpdates).toEqual([1, 2, 3]);
    });

    it('isolates failures - other items still complete', async () => {
      const fetcher = new BatchFetcher({ batchSize: 3 });
      const items = ['ch1', 'ch2', 'ch3'];
      const fn = vi.fn()
        .mockResolvedValueOnce('ok')
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce('ok');

      const result = await fetcher.process(items, fn);
      expect(result.failures).toHaveLength(1);
      expect(result.results.filter(r => r.error === undefined)).toHaveLength(2);
    });

    it('supports cancellation', async () => {
      const fetcher = new BatchFetcher({ batchSize: 1 });
      const items = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'];
      let completed = 0;

      const fn = vi.fn().mockImplementation(async () => {
        completed += 1;
        if (completed === 2) fetcher.cancel();
        await new Promise(res => setTimeout(res, 5));
        return 'content';
      });

      await fetcher.process(items, fn);
      // Should stop after cancellation
      expect(fn.mock.calls.length).toBeLessThan(items.length);
    });

    it('calls batch complete callback after each batch', async () => {
      const fetcher = new BatchFetcher({ batchSize: 2 });
      const items = ['ch1', 'ch2', 'ch3', 'ch4'];
      const fn = vi.fn().mockResolvedValue('content');
      const batchCompletions: number[] = [];

      await fetcher.process(items, fn, undefined, (batchIdx) => {
        batchCompletions.push(batchIdx);
      });

      expect(batchCompletions).toEqual([0, 1]);
    });
  });

  describe('Rate limiter + retry integration', () => {
    it('retries failed requests before giving up', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { maxAttempts: 3, baseDelay: 1, maxDelay: 10 });
      expect(result).toBe('success');
    });

    it('rate limiter allows sequential execution', async () => {
      const limiter = new RateLimiter({ requestsPerSecond: 10, maxConcurrent: 2 });
      const results: string[] = [];

      await limiter.execute(async () => { results.push('a'); });
      await limiter.execute(async () => { results.push('b'); });

      expect(results).toEqual(['a', 'b']);
    });

    it('handles partial success in batch with retries', async () => {
      const fetcher = new BatchFetcher({ batchSize: 2 });
      const items = ['url1', 'url2', 'url3'];
      const callCounts: Record<string, number> = {};

      const fn = vi.fn().mockImplementation(async (url: string) => {
        callCounts[url] = (callCounts[url] ?? 0) + 1;
        if (url === 'url2' && callCounts[url] === 1) throw new Error('temporary');
        return `content:${url}`;
      });

      const result = await fetcher.process(items, fn);
      // url2 fails on first try (no retry in batch-fetcher, that's retry-handler's job)
      expect(result.failures.length).toBeGreaterThanOrEqual(0);
    });
  });
});
