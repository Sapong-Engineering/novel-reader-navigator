import { useCallback, useRef, useEffect } from 'react';
import { saveTtsProgress, getTtsProgressEntry } from '@/lib/storage-manager';
import { syncTtsProgressToBackend, fetchTtsParagraphIndexFromBackend } from '@/lib/sync-service';

function selectNewest<T extends { updatedAt: string | null }>(
  local: T | null,
  remote: T | null,
): T | null {
  if (!local) return remote;
  if (!remote) return local;
  if (!local.updatedAt && remote.updatedAt) return remote;
  if (!remote.updatedAt) return local;
  return new Date(remote.updatedAt!).getTime() > new Date(local.updatedAt!).getTime()
    ? remote
    : local;
}

export interface UseTTSProgressResult {
  /** Debounced save — call on every paragraph index change while playing */
  saveTtsIndex: (index: number) => void;
  /** Immediate save — call on pause/stop to flush pending saves */
  saveTtsIndexNow: (index: number) => void;
  /** Merges local + remote and returns the newest paragraph index */
  getRestoredIndex: () => Promise<number>;
}

export function useTTSProgress(
  novelId: string,
  chapterId: string | undefined,
): UseTTSProgressResult {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveTtsIndex = useCallback(
    (index: number) => {
      if (!chapterId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTtsProgress(novelId, chapterId, index);
      }, 500);
      syncTtsProgressToBackend(novelId, chapterId, index);
    },
    [novelId, chapterId],
  );

  const saveTtsIndexNow = useCallback(
    (index: number) => {
      if (!chapterId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTtsProgress(novelId, chapterId, index);
      syncTtsProgressToBackend(novelId, chapterId, index);
    },
    [novelId, chapterId],
  );

  const getRestoredIndex = useCallback(
    async (): Promise<number> => {
      if (!chapterId) return 0;
      const local = getTtsProgressEntry(novelId, chapterId);
      const remote = await fetchTtsParagraphIndexFromBackend(novelId, chapterId);

      const preferred = selectNewest(
        { paragraphIndex: local.paragraphIndex, updatedAt: local.updatedAt },
        remote ? { paragraphIndex: remote.paragraphIndex, updatedAt: remote.updatedAt } : null,
      );

      if (!preferred) return 0;
      if (remote && preferred.updatedAt === remote.updatedAt) {
        saveTtsProgress(novelId, chapterId, remote.paragraphIndex);
      }
      return preferred.paragraphIndex;
    },
    [novelId, chapterId],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return { saveTtsIndex, saveTtsIndexNow, getRestoredIndex };
}
