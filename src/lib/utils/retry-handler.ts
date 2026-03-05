export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatusCodes: number[];
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: unknown,
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

function shouldRetry(error: unknown, retryableStatusCodes: number[]): boolean {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    // Network error
    return true;
  }
  if (error instanceof Response || (error && typeof error === 'object' && 'status' in error)) {
    const status = (error as { status: number }).status;
    return retryableStatusCodes.includes(status);
  }
  return false;
}

function getRetryAfterMs(error: unknown): number | null {
  if (error && typeof error === 'object' && 'headers' in error) {
    const headers = (error as { headers: Headers }).headers;
    const retryAfter = headers?.get('Retry-After');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) return seconds * 1000;
    }
  }
  return null;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const cfg: RetryConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt < cfg.maxAttempts; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === cfg.maxAttempts - 1;

      if (isLastAttempt || !shouldRetry(error, cfg.retryableStatusCodes)) {
        break;
      }

      const retryAfterMs = getRetryAfterMs(error);
      const exponentialDelay = Math.min(
        cfg.baseDelay * Math.pow(2, attempt),
        cfg.maxDelay,
      );
      const delay = retryAfterMs ?? exponentialDelay;

      console.log(
        `[${new Date().toISOString()}] Retry attempt ${attempt + 1}/${cfg.maxAttempts - 1} after ${delay}ms`,
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  throw new RetryError(
    `Failed after ${cfg.maxAttempts} attempts`,
    cfg.maxAttempts,
    lastError,
  );
}
