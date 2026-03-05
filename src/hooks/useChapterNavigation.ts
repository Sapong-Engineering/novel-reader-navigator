import { useEffect, useCallback } from 'react';
import type { Chapter } from '@/lib/novel-store';

export interface UseChapterNavigationResult {
  activeIndex: number;
  hasPrev: boolean;
  hasNext: boolean;
  goToPrev: () => void;
  goToNext: () => void;
}

export function useChapterNavigation(
  chapters: Chapter[],
  activeChapter: Chapter | null,
  onSelectChapter: (chapter: Chapter) => void,
): UseChapterNavigationResult {
  const activeIndex = chapters.findIndex(c => c.id === activeChapter?.id);
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex >= 0 && activeIndex < chapters.length - 1;

  const goToPrev = useCallback(() => {
    if (hasPrev) onSelectChapter(chapters[activeIndex - 1]);
  }, [hasPrev, chapters, activeIndex, onSelectChapter]);

  const goToNext = useCallback(() => {
    if (hasNext) onSelectChapter(chapters[activeIndex + 1]);
  }, [hasNext, chapters, activeIndex, onSelectChapter]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goToPrev, goToNext]);

  return { activeIndex, hasPrev, hasNext, goToPrev, goToNext };
}
