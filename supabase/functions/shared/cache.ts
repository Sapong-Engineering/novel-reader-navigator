export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessedAt: number;
}

export interface CacheConfig {
  ttlMs: number;
  maxSize: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
  maxSize: 100,
};

export class Cache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    entry.lastAccessedAt = Date.now();
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.size >= this.config.maxSize && !this.store.has(key)) {
      this.evictLRU();
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.config.ttlMs,
      lastAccessedAt: Date.now(),
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.store) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  static keyFromUrl(url: string): string {
    return url.toLowerCase().trim();
  }
}

// Singleton caches for novel info and chapter content
export const novelInfoCache = new Cache<unknown>({ ttlMs: 24 * 60 * 60 * 1000, maxSize: 50 });
export const chapterContentCache = new Cache<string>({ ttlMs: 24 * 60 * 60 * 1000, maxSize: 500 });
