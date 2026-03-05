import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { scrapeChapterContent } from '@/lib/api/firecrawl';
import { type Novel, type Chapter, saveNovel } from '@/lib/novel-store';
import { RateLimiter } from '@/lib/utils/rate-limiter';
import { withRetry } from '@/lib/utils/retry-handler';
import { BatchFetcher } from '@/lib/utils/batch-fetcher';

export interface FetchProgress {
  current: number;
  total: number;
  currentTitle?: string;
}

export interface UseChapterFetcherResult {
  isFetching: boolean;
  progress: FetchProgress;
  fetchChapter: (chapter: Chapter, novel: Novel, onUpdate: (n: Novel) => void) => Promise<void>;
  fetchAll: (novel: Novel, onUpdate: (n: Novel) => void) => Promise<void>;
  cancel: () => void;
}

const rateLimiter = new RateLimiter({ requestsPerSecond: 2, maxConcurrent: 3 });

export function useChapterFetcher(): UseChapterFetcherResult {
  const [isFetching, setIsFetching] = useState(false);
  const [progress, setProgress] = useState<FetchProgress>({ current: 0, total: 0 });
  const batchFetcherRef = useRef(new BatchFetcher({ batchSize: 3 }));

  const cancel = useCallback(() => {
    batchFetcherRef.current.cancel();
  }, []);

  const fetchChapter = useCallback(
    async (chapter: Chapter, novel: Novel, onUpdate: (n: Novel) => void) => {
      if (chapter.content) return;

      const content = await rateLimiter.execute(() =>
        withRetry(() => scrapeChapterContent(chapter.url)),
      );

      const updated: Chapter = { ...chapter, content, savedAt: new Date().toISOString() };
      const newNovel: Novel = {
        ...novel,
        chapters: novel.chapters.map(c => (c.id === chapter.id ? updated : c)),
      };
      saveNovel(newNovel);
      onUpdate(newNovel);
    },
    [],
  );

  const fetchAll = useCallback(
    async (novel: Novel, onUpdate: (n: Novel) => void) => {
      const unfetched = novel.chapters.filter(c => !c.content);
      if (unfetched.length === 0) {
        toast.info('All chapters already fetched!');
        return;
      }

      setIsFetching(true);
      setProgress({ current: 0, total: unfetched.length });
      let currentNovel = novel;
      batchFetcherRef.current.reset();

      await batchFetcherRef.current.process(
        unfetched,
        async (chapter, _idx) => {
          setProgress(prev => ({ ...prev, currentTitle: chapter.title }));

          const content = await rateLimiter.execute(() =>
            withRetry(() => scrapeChapterContent(chapter.url)),
          );

          const updated: Chapter = { ...chapter, content, savedAt: new Date().toISOString() };
          currentNovel = {
            ...currentNovel,
            chapters: currentNovel.chapters.map(c => (c.id === chapter.id ? updated : c)),
          };
          saveNovel(currentNovel);
          onUpdate(currentNovel);
        },
        (completed, total) => {
          setProgress(prev => ({ ...prev, current: completed, total }));
        },
      );

      setIsFetching(false);
      toast.success('Chapters fetched!');
    },
    [],
  );

  return { isFetching, progress, fetchChapter, fetchAll, cancel };
}
