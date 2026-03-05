import { describe, it, expect, vi } from 'vitest';
import { withRetry, RetryError } from './retry-handler';

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn, { maxAttempts: 3, baseDelay: 10, maxDelay: 100 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on network error and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce('ok');
    const result = await withRetry(fn, { maxAttempts: 3, baseDelay: 1, maxDelay: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws RetryError after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelay: 1, maxDelay: 10 }),
    ).rejects.toThrow(RetryError);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry on 4xx errors (except 429)', async () => {
    const err = Object.assign(new Error('Not Found'), { status: 404 });
    const fn = vi.fn().mockRejectedValue(err);
    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelay: 1, maxDelay: 10 }),
    ).rejects.toBeDefined();
    // Should not retry 404
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 status', async () => {
    const err = Object.assign(new Error('Too Many Requests'), { status: 429 });
    const fn = vi.fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce('ok');
    const result = await withRetry(fn, {
      maxAttempts: 3,
      baseDelay: 1,
      maxDelay: 10,
      retryableStatusCodes: [429, 500, 502, 503, 504],
    });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on 500 server error', async () => {
    const err = Object.assign(new Error('Internal Server Error'), { status: 500 });
    const fn = vi.fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce('ok');
    const result = await withRetry(fn, { maxAttempts: 3, baseDelay: 1, maxDelay: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('RetryError includes attempt count', async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    try {
      await withRetry(fn, { maxAttempts: 2, baseDelay: 1, maxDelay: 10 });
    } catch (e) {
      expect(e).toBeInstanceOf(RetryError);
      expect((e as RetryError).attempts).toBe(2);
    }
  });
});
