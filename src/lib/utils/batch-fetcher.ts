export interface BatchConfig {
  batchSize: number;
}

export interface BatchResult<T> {
  results: Array<{ index: number; value?: T; error?: unknown }>;
  failures: Array<{ index: number; error: unknown }>;
}

export type ProgressCallback = (completed: number, total: number) => void;
export type BatchCompleteCallback = (batchIndex: number) => void;

const DEFAULT_CONFIG: BatchConfig = {
  batchSize: 3,
};

export class BatchFetcher<T> {
  private config: BatchConfig;
  private cancelled = false;

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  cancel(): void {
    this.cancelled = true;
  }

  reset(): void {
    this.cancelled = false;
  }

  async process(
    items: T[],
    fn: (item: T, index: number) => Promise<unknown>,
    onProgress?: ProgressCallback,
    onBatchComplete?: BatchCompleteCallback,
  ): Promise<BatchResult<unknown>> {
    this.cancelled = false;
    const results: Array<{ index: number; value?: unknown; error?: unknown }> = [];
    const failures: Array<{ index: number; error: unknown }> = [];
    let completed = 0;

    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += this.config.batchSize) {
      batches.push(items.slice(i, i + this.config.batchSize));
    }

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      if (this.cancelled) break;

      const batch = batches[batchIdx];
      const batchOffset = batchIdx * this.config.batchSize;

      // Process items within batch in parallel
      await Promise.all(
        batch.map(async (item, localIdx) => {
          const globalIdx = batchOffset + localIdx;
          if (this.cancelled) return;
          try {
            const value = await fn(item, globalIdx);
            results.push({ index: globalIdx, value });
          } catch (error) {
            results.push({ index: globalIdx, error });
            failures.push({ index: globalIdx, error });
          } finally {
            completed += 1;
            onProgress?.(completed, items.length);
          }
        }),
      );

      onBatchComplete?.(batchIdx);
    }

    return { results, failures };
  }
}
