import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPdfReadingProgress, savePdfAudioProgress } from '@/lib/pdf-progress';
import type { PdfAudioSegment } from '@/lib/pdf-text';
import { useTTS } from '@/hooks/useTTS';

interface UsePdfAudioOptions {
  novelId: string;
  pageCount: number;
  visiblePage: number;
  getSegmentsForPage: (pageNumber: number) => PdfAudioSegment[];
  isPageLoading: (pageNumber: number) => boolean;
  ensurePageText: (pageNumber: number) => void;
  scrollToSegment: (segment: PdfAudioSegment) => void;
}

export function usePdfAudio({
  novelId,
  pageCount,
  visiblePage,
  getSegmentsForPage,
  isPageLoading,
  ensurePageText,
  scrollToSegment,
}: UsePdfAudioOptions) {
  const [audioPageNumber, setAudioPageNumber] = useState(() => {
    const progress = getPdfReadingProgress(novelId);
    return Math.min(Math.max(progress.pageNumber, 1), Math.max(pageCount, 1));
  });
  const audioPageNumberRef = useRef(audioPageNumber);
  const pendingPlayRef = useRef(false);

  useEffect(() => {
    audioPageNumberRef.current = audioPageNumber;
  }, [audioPageNumber]);

  const handlePageEnd = useCallback(() => {
    const nextPage = audioPageNumberRef.current + 1;
    if (nextPage > pageCount) return;

    pendingPlayRef.current = true;
    setAudioPageNumber(nextPage);
    ensurePageText(nextPage);
  }, [ensurePageText, pageCount]);

  const tts = useTTS(handlePageEnd);
  const { play: playTts, setParagraphList } = tts;

  useEffect(() => {
    if (tts.isPlaying || tts.isPaused) return;
    setAudioPageNumber(Math.min(Math.max(visiblePage, 1), Math.max(pageCount, 1)));
  }, [pageCount, tts.isPaused, tts.isPlaying, visiblePage]);

  useEffect(() => {
    ensurePageText(audioPageNumber);
  }, [audioPageNumber, ensurePageText]);

  const activePageSegments = useMemo(
    () => getSegmentsForPage(audioPageNumber),
    [audioPageNumber, getSegmentsForPage],
  );

  const activePageSegmentIds = useMemo(
    () => activePageSegments.map((segment) => segment.id).join('|'),
    [activePageSegments],
  );

  useEffect(() => {
    if (activePageSegments.length === 0) {
      setParagraphList([]);
      if (!isPageLoading(audioPageNumber)) {
        pendingPlayRef.current = false;
      }
      return;
    }

    const progress = getPdfReadingProgress(novelId);
    const startIndex = progress.pageNumber === audioPageNumber ? progress.audioSegmentIndex : 0;
    setParagraphList(activePageSegments.map((segment) => segment.text), startIndex);

    if (pendingPlayRef.current) {
      pendingPlayRef.current = false;
      window.requestAnimationFrame(() => playTts());
    }
  }, [activePageSegmentIds, activePageSegments, audioPageNumber, isPageLoading, novelId, playTts, setParagraphList]);

  const activeSegment = activePageSegments[tts.currentIndex] ?? null;

  useEffect(() => {
    if (!activeSegment || (!tts.isPlaying && !tts.isPaused)) return;
    savePdfAudioProgress(novelId, activeSegment.pageNumber, activeSegment.indexOnPage);
  }, [activeSegment, novelId, tts.isPaused, tts.isPlaying]);

  useEffect(() => {
    if (!activeSegment || (!tts.isPlaying && !tts.isPaused)) return;
    scrollToSegment(activeSegment);
  }, [activeSegment, scrollToSegment, tts.isPaused, tts.isPlaying]);

  const play = useCallback(() => {
    const segments = getSegmentsForPage(audioPageNumber);
    if (segments.length === 0) {
      ensurePageText(audioPageNumber);
      if (isPageLoading(audioPageNumber)) {
        pendingPlayRef.current = true;
      }
      return;
    }
    playTts();
  }, [audioPageNumber, ensurePageText, getSegmentsForPage, isPageLoading, playTts]);

  return {
    ...tts,
    play,
    audioPageNumber,
    activeSegment,
    isAudioTextLoading: isPageLoading(audioPageNumber),
    hasAudioText: activePageSegments.length > 0,
  };
}
