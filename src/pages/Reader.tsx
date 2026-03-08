import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ChapterList from '@/components/ChapterList';
import ReaderView from '@/components/ReaderView';
import NovelToolbar from '@/components/NovelToolbar';
import MobileChapterDrawer from '@/components/MobileChapterDrawer';
import ErrorBoundary from '@/components/ErrorBoundary';
import ImmersiveOverlay from '@/components/reader/ImmersiveOverlay';
import { type Novel, type Chapter, saveNovel, getNovel } from '@/lib/novel-store';
import { syncNovel, syncBookmarksToBackend, syncProgressToBackend, fetchChapterContentFromBackend, syncFullNovelFromBackend } from '@/lib/sync-service';
import { exportToPdfWithProgress, exportToDocxWithProgress } from '@/lib/export-service';
import { useChapterNavigation } from '@/hooks/useChapterNavigation';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useImmersiveMode } from '@/hooks/useImmersiveMode';
import { useReadingStats } from '@/hooks/useReadingStats';
import { useTTS } from '@/hooks/useTTS';
import { validateUrl } from '@/lib/validation';
import { scrapeChapterContent } from '@/lib/api/firecrawl';
import { orderChapters } from '@/lib/chapter-order';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { startFetchAll, cancelFetchAll, getFetchAllState, subscribeFetchAll, getBackgroundNovel } from '@/lib/background-fetch';

const Reader = () => {
  const { novelId } = useParams<{ novelId: string }>();
  const navigate = useNavigate();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const pendingScrollRef = useRef<number | null>(null);
  const forceScrollTopRef = useRef(false);

  const appSettings = useAppSettings();
  const immersive = useImmersiveMode();
  const isReading = Boolean(activeChapter?.content && !isLoadingChapter);
  const { recordChapterRead } = useReadingStats(isReading);

  // Background fetch state
  const [fetchState, setFetchState] = useState(getFetchAllState);
  useEffect(() => subscribeFetchAll(() => {
    setFetchState(getFetchAllState());
    const bgNovel = getBackgroundNovel();
    if (bgNovel && bgNovel.id === novelId) {
      setNovel(bgNovel);
    }
  }), [novelId]);

  const isFetchingAll = fetchState.isFetching && fetchState.progress.novelId === novelId;
  const fetchProgress = fetchState.progress;

  const handleNavSelectChapter = useCallback((chapter: Chapter) => {
    forceScrollTopRef.current = true;
    handleSelectChapter(chapter);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const orderedChapters = useMemo(() => orderChapters(novel?.chapters ?? []), [novel?.chapters]);

  const { hasPrev, hasNext, goToPrev, goToNext } = useChapterNavigation(
    orderedChapters,
    activeChapter,
    handleNavSelectChapter,
  );

  // TTS with auto-advance to next chapter
  const tts = useTTS(hasNext ? goToNext : undefined);

  // Set TTS paragraphs when chapter changes
  useEffect(() => {
    if (activeChapter?.content) {
      tts.setParagraphs(activeChapter.content);
    }
  }, [activeChapter?.id, activeChapter?.content]); // eslint-disable-line react-hooks/exhaustive-deps

  const novelIdStr = novelId ?? '';
  const { saveProgress, restoreProgress, getLastRead } = useReadingProgress(
    novelIdStr,
    activeChapter?.id,
  );

  const {
    bookmarks,
    addChapterBookmark,
    removeBookmark,
    isChapterBookmarked,
    getChapterBookmarks,
  } = useBookmarks(novelIdStr);

  useEffect(() => {
    if (!novelId) return;

    const stored = getNovel(novelId);
    if (stored) {
      setNovel(stored);
      const lastReadId = getLastRead();
      if (lastReadId) {
        const lastChapter = stored.chapters.find(c => c.id === lastReadId);
        if (lastChapter) setActiveChapter(lastChapter);
      }
    } else {
      toast.error('Novel not found in library. Please go back and try again.');
      navigate('/');
      return;
    }

    if (!appSettings.syncEnabled) return;
    syncFullNovelFromBackend(novelId).then(synced => {
      if (synced) {
        setNovel(prev => {
          if (!prev) return synced;
          const localById = new Map(prev.chapters.map(c => [c.id, c]));
          const merged = synced.chapters.map(sc => {
            const local = localById.get(sc.id);
            return local ? { ...sc, content: local.content ?? sc.content } : sc;
          });
          const remoteIds = new Set(synced.chapters.map(c => c.id));
          for (const lc of prev.chapters) {
            if (!remoteIds.has(lc.id)) merged.push(lc);
          }
          const updated = { ...synced, chapters: merged };
          saveNovel(updated);
          return updated;
        });
      }
    });
  }, [novelId, navigate, appSettings.syncEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSelectChapter(chapter: Chapter) {
    // Stop TTS when changing chapters
    tts.stop();

    if (chapter.content) {
      // Record previous chapter as read
      if (activeChapter?.content) {
        const wordCount = activeChapter.content.split(/\s+/).length;
        recordChapterRead(wordCount);
      }
      setActiveChapter(chapter);
      syncProgressToBackend(novelIdStr, chapter.id, 0, true);
      return;
    }
    setIsLoadingChapter(true);
    setActiveChapter(chapter);

    const validation = validateUrl(chapter.url);
    if (!validation.valid) {
      toast.error(`Invalid chapter URL: ${validation.error}`);
      setIsLoadingChapter(false);
      return;
    }

    try {
      let content = await fetchChapterContentFromBackend(novelIdStr, chapter.id);
      if (!content) {
        content = await scrapeChapterContent(chapter.url);
      }
      const updated: Chapter = { ...chapter, content, savedAt: new Date().toISOString() };
      setActiveChapter(updated);
      setNovel(prev => {
        if (!prev) return prev;
        const newNovel = { ...prev, chapters: prev.chapters.map(c => c.id === chapter.id ? updated : c) };
        saveNovel(newNovel);
        syncNovel(newNovel);
        return newNovel;
      });
      syncProgressToBackend(novelIdStr, chapter.id, 0, true);
    } catch (err) {
      console.error('Failed to fetch chapter:', err);
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to fetch chapter. Please check your connection and try again.',
      );
    } finally {
      setIsLoadingChapter(false);
    }
  }

  const handleJumpToBookmark = useCallback(
    async (chapterId: string, scrollPosition: number) => {
      if (!novel) return;
      const chapter = novel.chapters.find(c => c.id === chapterId);
      if (!chapter) return;
      pendingScrollRef.current = scrollPosition;
      await handleSelectChapter(chapter);
    },
    [novel], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleChapterReady = useCallback(
    async (container: HTMLElement) => {
      if (forceScrollTopRef.current) {
        forceScrollTopRef.current = false;
        container.scrollTop = 0;
        return;
      }
      const pending = pendingScrollRef.current;
      if (pending !== null) {
        pendingScrollRef.current = null;
        container.scrollTop = pending;
      } else {
        await restoreProgress(container);
      }
    },
    [restoreProgress],
  );

  const handleSaveProgress = useCallback(
    (scrollTop: number) => {
      saveProgress(scrollTop);
      if (activeChapter) {
        syncProgressToBackend(novelIdStr, activeChapter.id, scrollTop, false);
      }
    },
    [saveProgress, novelIdStr, activeChapter],
  );

  const handleAddBookmark = useCallback(
    (scrollPosition: number, label?: string) => {
      if (!activeChapter) return;
      addChapterBookmark(activeChapter, scrollPosition, label);
      syncBookmarksToBackend(novelIdStr);
      toast.success(label ? `Bookmarked: "${label}"` : 'Bookmark added');
    },
    [activeChapter, addChapterBookmark, novelIdStr],
  );

  const handleRemoveBookmark = useCallback(
    (id: string) => {
      removeBookmark(id);
      syncBookmarksToBackend(novelIdStr);
      toast.success('Bookmark removed');
    },
    [removeBookmark, novelIdStr],
  );

  const handleFetchAll = useCallback(async () => {
    if (!novel || isFetchingAll) return;
    await startFetchAll(novel, (updatedNovel) => {
      setNovel(updatedNovel);
    });
  }, [novel, isFetchingAll]);

  const handleSave = useCallback(() => {
    if (novel) {
      saveNovel(novel);
      syncNovel(novel);
      toast.success('Novel saved!');
    }
  }, [novel]);

  const handleManualSync = useCallback(async () => {
    if (!novel) return;
    toast.info('Syncing...');
    try {
      await syncNovel(novel);
      toast.success('Sync complete!');
    } catch {
      toast.error('Sync failed');
    }
  }, [novel]);

  const handleRepairChapterOrder = useCallback(() => {
    if (!novel) return;
    const sorted = orderChapters(novel.chapters);
    const repairedNovel: Novel = { ...novel, chapters: sorted };
    saveNovel(repairedNovel);
    setNovel(repairedNovel);
    syncNovel(repairedNovel);
    toast.success('Chapter order repaired');
  }, [novel]);

  const handleExportPdf = useCallback(async () => {
    if (!novel) return;
    const saved = novel.chapters.filter(c => c.content);
    if (!saved.length) { toast.error('No chapters to export. Fetch some chapters first.'); return; }
    await exportToPdfWithProgress(novel.title, saved, (p) => {
      if (p.done) toast.success('PDF downloaded!');
    });
  }, [novel]);

  const handleExportDocx = useCallback(async () => {
    if (!novel) return;
    const saved = novel.chapters.filter(c => c.content);
    if (!saved.length) { toast.error('No chapters to export. Fetch some chapters first.'); return; }
    await exportToDocxWithProgress(novel.title, saved, (p) => {
      if (p.done) toast.success('DOCX downloaded!');
    });
  }, [novel]);

  if (!novel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-sans-ui">Loading...</p>
      </div>
    );
  }

  const savedCount = novel.chapters.filter(c => c.content).length;
  const chapterBookmarks = activeChapter
    ? getChapterBookmarks(activeChapter.id)
    : [];
  const bookmarkedChapterIds = new Set(bookmarks.map(b => b.chapterId));

  return (
    <div
      className={`h-screen flex flex-col bg-background ${immersive.isImmersive ? 'reader-immersive' : ''}`}
      onClick={immersive.isImmersive ? immersive.showControls : undefined}
    >
      <div className={`transition-all duration-500 ${immersive.isImmersive ? 'opacity-0 h-0 overflow-hidden pointer-events-none' : 'opacity-100'}`}>
        <NovelToolbar
          title={novel.title}
          chapterCount={orderedChapters.length}
          savedCount={savedCount}
          onExportPdf={handleExportPdf}
          onExportDocx={handleExportDocx}
          onSave={handleSave}
          onBack={() => navigate('/')}
          onFetchAll={handleFetchAll}
          isFetchingAll={isFetchingAll}
          fetchProgress={fetchProgress}
          onSync={handleManualSync}
          onRepairChapterOrder={handleRepairChapterOrder}
          showReaderSettings
          onImmersiveMode={immersive.enter}
          mobileChapterDrawer={
            <MobileChapterDrawer
              chapters={orderedChapters}
              activeChapterId={activeChapter?.id}
              onSelectChapter={handleSelectChapter}
              bookmarks={bookmarks}
              onJumpToBookmark={handleJumpToBookmark}
              onRemoveBookmark={handleRemoveBookmark}
              bookmarkedChapterIds={bookmarkedChapterIds}
            />
          }
        />
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className={`w-72 border-r border-border bg-card flex-shrink-0 hidden md:flex flex-col transition-all duration-500 ${immersive.isImmersive ? '!hidden' : ''}`}>
          <ErrorBoundary>
            <ChapterList
              chapters={orderedChapters}
              activeChapterId={activeChapter?.id}
              onSelectChapter={handleSelectChapter}
              bookmarks={bookmarks}
              onJumpToBookmark={handleJumpToBookmark}
              onRemoveBookmark={handleRemoveBookmark}
              bookmarkedChapterIds={bookmarkedChapterIds}
            />
          </ErrorBoundary>
        </div>
        <div className="flex-1 flex flex-col">
          <ErrorBoundary>
            <ReaderView
              chapter={activeChapter}
              isLoading={isLoadingChapter}
              onPrevChapter={goToPrev}
              onNextChapter={goToNext}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onScroll={handleSaveProgress}
              onChapterReady={handleChapterReady}
              chapterBookmarks={chapterBookmarks}
              onAddBookmark={handleAddBookmark}
              onRemoveBookmark={handleRemoveBookmark}
              ttsCurrentIndex={tts.isPlaying || tts.isPaused ? tts.currentIndex : -1}
              isImmersive={immersive.isImmersive}
              tts={tts}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* Immersive overlay */}
      {immersive.isImmersive && (
        <ImmersiveOverlay
          visible={immersive.controlsVisible}
          ambientSound={immersive.ambientSound}
          onSoundChange={immersive.setAmbientSound}
          volume={immersive.volume}
          onVolumeChange={immersive.setVolume}
          onExit={immersive.exit}
        />
      )}
    </div>
  );
};

export default Reader;
