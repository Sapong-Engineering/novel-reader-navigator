import { useEffect, useCallback, useRef } from 'react';
import {
  saveReadingProgress,
  getReadingProgressEntry,
  saveLastReadChapter,
  getLastReadChapterEntry,
} from '@/lib/storage-manager';
import {
  fetchLastReadingPositionFromBackend,
  fetchReadingPositionForChapterFromBackend,
} from '@/lib/sync-service';

export interface UseReadingProgressResult {
  saveProgress: (scrollTop: number) => void;
  restoreProgress: (container: HTMLElement) => Promise<void>;
  getLastRead: () => Promise<string | null>;
  getPreferredScrollPosition: (chapterId: string) => Promise<number>;
}

function selectNewest<T extends { updatedAt: string | null }>(local: T | null, remote: T | null): T | null {
  if (!local) return remote;
  if (!remote) return local;
  if (!local.updatedAt && remote.updatedAt) return remote;
  if (!remote.updatedAt) return local;
  if (!local.updatedAt && !remote.updatedAt) return local;
  return new Date(remote.updatedAt!).getTime() > new Date(local.updatedAt!).getTime()
    ? remote
    : local;
}

export function useReadingProgress(
  novelId: string,
  chapterId: string | undefined,
): UseReadingProgressResult {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save last read chapter whenever chapterId changes
  useEffect(() => {
    if (novelId && chapterId) {
      saveLastReadChapter(novelId, chapterId);
    }
  }, [novelId, chapterId]);

  const saveProgress = useCallback(
    (scrollTop: number) => {
      if (!chapterId) return;
      // Debounce saves
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveReadingProgress(novelId, chapterId, scrollTop);
      }, 500);
    },
    [novelId, chapterId],
  );

  const restoreProgress = useCallback(
    async (container: HTMLElement) => {
      if (!chapterId) return;
      const scrollTop = await getPreferredScrollPosition(chapterId);
      if (scrollTop > 0) {
        container.scrollTop = scrollTop;
      }
    },
    [chapterId],
  );

  const getLastRead = useCallback(
    async () => {
      const local = getLastReadChapterEntry(novelId);
      const remote = await fetchLastReadingPositionFromBackend(novelId);

      const preferred = selectNewest(
        local.chapterId ? { chapterId: local.chapterId, updatedAt: local.updatedAt } : null,
        remote ? { chapterId: remote.chapterLocalId, updatedAt: remote.updatedAt } : null,
      );

      if (!preferred?.chapterId) return null;
      if (remote && preferred.chapterId === remote.chapterLocalId) {
        saveLastReadChapter(novelId, remote.chapterLocalId);
      }
      return preferred.chapterId;
    },
    [novelId],
  );

  const getPreferredScrollPosition = useCallback(
    async (targetChapterId: string) => {
      const local = await getReadingProgressEntry(novelId, targetChapterId);
      const remote = await fetchReadingPositionForChapterFromBackend(novelId, targetChapterId);

      const preferred = selectNewest(
        { scrollPosition: local.scrollPosition, updatedAt: local.updatedAt },
        remote ? { scrollPosition: remote.scrollPosition, updatedAt: remote.updatedAt } : null,
      );

      if (!preferred) return 0;
      if (remote && preferred.updatedAt === remote.updatedAt) {
        saveReadingProgress(novelId, targetChapterId, remote.scrollPosition);
      }
      return preferred.scrollPosition;
    },
    [novelId],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return { saveProgress, restoreProgress, getLastRead, getPreferredScrollPosition };
}
