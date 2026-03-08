import { scrapeChapterContent } from '@/lib/api/firecrawl';
import { type Novel, type Chapter, saveNovel, getNovel } from '@/lib/novel-store';
import { RateLimiter } from '@/lib/utils/rate-limiter';
import { withRetry } from '@/lib/utils/retry-handler';
import { BatchFetcher } from '@/lib/utils/batch-fetcher';
import { syncChapterToBackend, syncNovel } from '@/lib/sync-service';
import { notify } from '@/lib/notify';

export interface FetchProgress {
  current: number;
  total: number;
  totalChapters: number;
  fetchedChapters: number;
  currentTitle?: string;
  novelId: string;
  novelTitle: string;
}

type Listener = () => void;

const rateLimiter = new RateLimiter({ requestsPerSecond: 2, maxConcurrent: 3 });
const batchFetcher = new BatchFetcher<Chapter>({ batchSize: 3 });

let _isFetching = false;
let _progress: FetchProgress = { current: 0, total: 0, totalChapters: 0, fetchedChapters: 0, novelId: '', novelTitle: '' };
let _currentNovel: Novel | null = null;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach(fn => fn());
}

export function subscribeFetchAll(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getFetchAllState() {
  return { isFetching: _isFetching, progress: _progress };
}

export function getBackgroundNovel(): Novel | null {
  return _currentNovel;
}

export function cancelFetchAll() {
  batchFetcher.cancel();
}

export async function startFetchAll(
  novel: Novel,
  onUpdate?: (novel: Novel) => void,
): Promise<void> {
  if (_isFetching) return;

  const unfetched = novel.chapters.filter(c => !c.content);
  if (unfetched.length === 0) {
    notify('All chapters already fetched!', 'info');
    return;
  }

  _isFetching = true;
  const alreadyFetched = novel.chapters.filter(c => !!c.content).length;
  _progress = { current: 0, total: unfetched.length, totalChapters: novel.chapters.length, fetchedChapters: alreadyFetched, novelId: novel.id, novelTitle: novel.title };
  _currentNovel = novel;
  batchFetcher.reset();
  emit();

  await batchFetcher.process(
    unfetched,
    async (chapter: Chapter) => {
      _progress = { ..._progress, currentTitle: chapter.title };
      emit();

      const content = await rateLimiter.execute(() =>
        withRetry(() => scrapeChapterContent(chapter.url)),
      );

      const updated: Chapter = { ...chapter, content, savedAt: new Date().toISOString() };
      _currentNovel = {
        ..._currentNovel!,
        chapters: _currentNovel!.chapters.map(c => (c.id === chapter.id ? updated : c)),
      };
      saveNovel(_currentNovel);
      onUpdate?.(_currentNovel);
      syncChapterToBackend(novel.id, updated);
    },
    (completed, total) => {
      _progress = { ..._progress, current: completed, total };
      emit();
    },
  );

  // Final sync
  const latest = getNovel(novel.id);
  if (latest) syncNovel(latest);

  _isFetching = false;
  _currentNovel = null;
  emit();
  notify(`Finished fetching ${unfetched.length} chapters for "${novel.title}"`, 'success');
}
