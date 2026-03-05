import { useEffect, useCallback, useRef } from 'react';
import {
  saveReadingProgress,
  getReadingProgress,
  saveLastReadChapter,
  getLastReadChapter,
} from '@/lib/storage-manager';

export interface UseReadingProgressResult {
  saveProgress: (scrollTop: number) => void;
  restoreProgress: (container: HTMLElement) => Promise<void>;
  getLastRead: () => string | null;
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
      const scrollTop = await getReadingProgress(novelId, chapterId);
      if (scrollTop > 0) {
        container.scrollTop = scrollTop;
      }
    },
    [novelId, chapterId],
  );

  const getLastRead = useCallback(
    () => getLastReadChapter(novelId),
    [novelId],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return { saveProgress, restoreProgress, getLastRead };
}
