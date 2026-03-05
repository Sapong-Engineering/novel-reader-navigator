export interface RateLimiterConfig {
  requestsPerSecond: number;
  maxConcurrent: number;
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  requestsPerSecond: 2,
  maxConcurrent: 3,
};

export class RateLimiter {
  private config: RateLimiterConfig;
  private tokens: number;
  private lastRefill: number;
  private activeCount: number;
  private queue: Array<() => void>;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tokens = this.config.requestsPerSecond;
    this.lastRefill = Date.now();
    this.activeCount = 0;
    this.queue = [];
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const newTokens = elapsed * this.config.requestsPerSecond;
    this.tokens = Math.min(this.config.requestsPerSecond, this.tokens + newTokens);
    this.lastRefill = now;
  }

  private processQueue(): void {
    while (
      this.queue.length > 0 &&
      this.activeCount < this.config.maxConcurrent &&
      this.tokens >= 1
    ) {
      this.refillTokens();
      if (this.tokens < 1) break;
      this.tokens -= 1;
      this.activeCount += 1;
      const next = this.queue.shift()!;
      next();
    }
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        this.refillTokens();
        if (this.activeCount < this.config.maxConcurrent && this.tokens >= 1) {
          this.tokens -= 1;
          this.activeCount += 1;
          resolve(this.release.bind(this));
        } else {
          this.queue.push(tryAcquire);
        }
      };
      tryAcquire();
    });
  }

  private release(): void {
    this.activeCount = Math.max(0, this.activeCount - 1);
    // Schedule queue processing after minimum delay
    const minDelayMs = 1000 / this.config.requestsPerSecond;
    setTimeout(() => this.processQueue(), minDelayMs);
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}
