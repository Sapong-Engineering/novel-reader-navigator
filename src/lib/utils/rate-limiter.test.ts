import { describe, it, expect, vi } from 'vitest';
import { RateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
  it('executes a single request immediately', async () => {
    const limiter = new RateLimiter({ requestsPerSecond: 2, maxConcurrent: 3 });
    const result = await limiter.execute(async () => 'ok');
    expect(result).toBe('ok');
  });

  it('respects maxConcurrent limit', async () => {
    const limiter = new RateLimiter({ requestsPerSecond: 10, maxConcurrent: 2 });
    let active = 0;
    let maxActive = 0;

    const task = () =>
      limiter.execute(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise(res => setTimeout(res, 10));
        active -= 1;
      });

    await Promise.all([task(), task(), task()]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it('propagates errors from executed function', async () => {
    const limiter = new RateLimiter();
    await expect(
      limiter.execute(async () => { throw new Error('test error'); }),
    ).rejects.toThrow('test error');
  });

  it('releases slot after completion allowing next task', async () => {
    const limiter = new RateLimiter({ requestsPerSecond: 10, maxConcurrent: 1 });
    const results: number[] = [];
    await limiter.execute(async () => { results.push(1); });
    await limiter.execute(async () => { results.push(2); });
    expect(results).toEqual([1, 2]);
  });
});
