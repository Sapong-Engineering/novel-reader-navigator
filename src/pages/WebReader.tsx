import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ChapterList from '@/components/ChapterList';
import ReaderView from '@/components/ReaderView';
import NovelToolbar from '@/components/NovelToolbar';
import MobileChapterDrawer from '@/components/MobileChapterDrawer';
import ErrorBoundary from '@/components/ErrorBoundary';
import ImmersiveOverlay from '@/components/reader/ImmersiveOverlay';
import { type Novel, type Chapter, saveNovel, getNovel } from '@/lib/novel-store';
import {
  syncNovel,
  syncBookmarksToBackend,
  syncProgressToBackend,
  fetchChapterContentFromBackend,
  syncFullNovelFromBackend,
  mergeBookmarksFromBackend,
} from '@/lib/sync-service';
import { exportToPdfWithProgress, exportToDocxWithProgress } from '@/lib/export-service';
import { useChapterNavigation } from '@/hooks/useChapterNavigation';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useImmersiveMode } from '@/hooks/useImmersiveMode';
import { useReadingStats } from '@/hooks/useReadingStats';
import { useTTS } from '@/hooks/useTTS';
import { useTTSProgress } from '@/hooks/useTTSProgress';
import { validateUrl } from '@/lib/validation';
import { scrapeChapterContent } from '@/lib/api/firecrawl';
import { orderChapters } from '@/lib/chapter-order';
import { chapterNeedsRefresh, mergeNovelWithLocalContent } from '@/lib/reader-state';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { startFetchAll, getFetchAllState, subscribeFetchAll, getBackgroundNovel } from '@/lib/background-fetch';
import { Button } from '@/components/ui/button';
import { PanelLeftOpen } from 'lucide-react';

const DESKTOP_SIDEBAR_STORAGE_KEY = 'reader-desktop-sidebar-open';

function getInitialDesktopSidebarState() {
  try {
    const stored = localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

interface WebReaderProps {
  novelId: string;
}

const WebReader = ({ novelId }: WebReaderProps) => {
  const novelIdStr = novelId;
  const navigate = useNavigate();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState<boolean>(getInitialDesktopSidebarState);
  const pendingScrollRef = useRef<number | null>(null);
  const forceScrollTopRef = useRef(false);
  const pendingTtsAutoPlayRef = useRef(false);
  const chapterSelectionRequestRef = useRef(0);
  const handleSelectChapterRef = useRef<(chapter: Chapter) => Promise<boolean>>(async () => false);

  const appSettings = useAppSettings();
  const immersive = useImmersiveMode();
  const isReading = Boolean(activeChapter?.content && !isLoadingChapter);
  const { recordChapterRead } = useReadingStats(isReading);

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

  const commitChapterSelection = useCallback((nextChapter: Chapter, previousChapter: Chapter | null) => {
    if (previousChapter?.id !== nextChapter.id && previousChapter?.content) {
      const wordCount = previousChapter.content.split(/\s+/).length;
      recordChapterRead(wordCount);
    }
    setActiveChapter(nextChapter);
    syncProgressToBackend(novelIdStr, nextChapter.id, 0, true);
  }, [novelIdStr, recordChapterRead]);

  const handleNavSelectChapter = useCallback((chapter: Chapter) => {
    forceScrollTopRef.current = true;
    void handleSelectChapterRef.current(chapter).then((didSelect) => {
      if (!didSelect) {
        forceScrollTopRef.current = false;
      }
    });
  }, []);

  const orderedChapters = useMemo(() => orderChapters(novel?.chapters ?? []), [novel?.chapters]);

  const { hasPrev, hasNext, goToPrev, goToNext } = useChapterNavigation(
    orderedChapters,
    activeChapter,
    handleNavSelectChapter,
  );

  const handleTtsChapterEnd = useCallback(() => {
    pendingTtsAutoPlayRef.current = true;
    goToNext();
  }, [goToNext]);
  const tts = useTTS(hasNext ? handleTtsChapterEnd : undefined);

  useEffect(() => {
    if (activeChapter?.content) {
      tts.setParagraphs(activeChapter.content);
      const shouldAutoPlay = pendingTtsAutoPlayRef.current;
      pendingTtsAutoPlayRef.current = false;
      ttsProgress.getRestoredIndex().then(savedIndex => {
        if (savedIndex > 0) tts.jumpTo(savedIndex);
        if (shouldAutoPlay) tts.play();
      });
    }
  }, [activeChapter?.id, activeChapter?.content]); // eslint-disable-line react-hooks/exhaustive-deps

  const { saveProgress, restoreProgress, getLastRead } = useReadingProgress(
    novelIdStr,
    activeChapter?.id,
  );
  const ttsProgress = useTTSProgress(novelIdStr, activeChapter?.id);

  useEffect(() => {
    if (tts.isPlaying || tts.isPaused) {
      ttsProgress.saveTtsIndex(tts.currentIndex);
    }
  }, [tts.currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tts.isPaused) {
      ttsProgress.saveTtsIndexNow(tts.currentIndex);
    }
  }, [tts.isPaused]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    bookmarks,
    addChapterBookmark,
    removeBookmark,
    getChapterBookmarks,
  } = useBookmarks(novelIdStr);

  useEffect(() => {
    try {
      localStorage.setItem(DESKTOP_SIDEBAR_STORAGE_KEY, String(isDesktopSidebarOpen));
    } catch {
      // Ignore localStorage failures for optional UI state.
    }
  }, [isDesktopSidebarOpen]);

  useEffect(() => {
    const stored = getNovel(novelId);
    if (stored) {
      setNovel(stored);
      getLastRead().then((lastReadId) => {
        if (!lastReadId) return;
        const lastChapter = stored.chapters.find(c => c.id === lastReadId);
        if (lastChapter) setActiveChapter(lastChapter);
      });
    } else {
      toast.error('Novel not found in library. Please go back and try again.');
      navigate('/');
      return;
    }

    if (!appSettings.syncEnabled) return;
    syncFullNovelFromBackend(novelId).then(synced => {
      if (synced) {
        setNovel(prev => {
          const updated = mergeNovelWithLocalContent(prev, synced);
          saveNovel(updated);
          return updated;
        });
      }
    });
  }, [novelId, navigate, appSettings.syncEnabled, getLastRead]);

  useEffect(() => {
    if (!appSettings.syncEnabled) return;
    void mergeBookmarksFromBackend(novelId);
  }, [novelId, appSettings.syncEnabled]);

  useEffect(() => {
    if (!novel || !activeChapter) return;

    const syncedActiveChapter = novel.chapters.find(chapter => chapter.id === activeChapter.id);
    if (chapterNeedsRefresh(activeChapter, syncedActiveChapter)) {
      setActiveChapter(syncedActiveChapter);
    }
  }, [novel, activeChapter]);

  const toggleDesktopSidebar = useCallback(() => {
    setIsDesktopSidebarOpen(prev => !prev);
  }, []);

  const handleSelectChapter = useCallback(async (chapter: Chapter): Promise<boolean> => {
    tts.stop();
    const requestId = ++chapterSelectionRequestRef.current;
    const previousChapter = activeChapter;

    if (chapter.content) {
      setIsLoadingChapter(false);
      commitChapterSelection(chapter, previousChapter);
      return true;
    }

    const validation = validateUrl(chapter.url);
    if (!validation.valid) {
      setIsLoadingChapter(false);
      toast.error(`Invalid chapter URL: ${validation.error}`);
      return false;
    }

    setIsLoadingChapter(true);

    try {
      let content = await fetchChapterContentFromBackend(novelIdStr, chapter.id);
      if (!content) {
        if (/gutenberg\.org/i.test(chapter.url)) {
          if (requestId !== chapterSelectionRequestRef.current) return false;
          toast.error('Chapter content not found. Re-fetch the novel to reload Gutenberg chapters.');
          return false;
        }
        content = await scrapeChapterContent(chapter.url);
      }

      if (requestId !== chapterSelectionRequestRef.current) return false;

      const updated: Chapter = { ...chapter, content, savedAt: new Date().toISOString() };
      commitChapterSelection(updated, previousChapter);
      setNovel(prev => {
        if (!prev) return prev;
        const newNovel = { ...prev, chapters: prev.chapters.map(c => c.id === chapter.id ? updated : c) };
        saveNovel(newNovel);
        syncNovel(newNovel);
        return newNovel;
      });
      return true;
    } catch (err) {
      if (requestId !== chapterSelectionRequestRef.current) return false;
      console.error('Failed to fetch chapter:', err);
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to fetch chapter. Please check your connection and try again.',
      );
      return false;
    } finally {
      if (requestId === chapterSelectionRequestRef.current) {
        setIsLoadingChapter(false);
      }
    }
  }, [activeChapter, commitChapterSelection, novelIdStr, tts]);
  handleSelectChapterRef.current = handleSelectChapter;

  const handleJumpToBookmark = useCallback(
    async (chapterId: string, scrollPosition: number) => {
      if (!novel) return;
      const chapter = novel.chapters.find(c => c.id === chapterId);
      if (!chapter) return;
      pendingScrollRef.current = scrollPosition;
      const didSelect = await handleSelectChapter(chapter);
      if (!didSelect) {
        pendingScrollRef.current = null;
      }
    },
    [handleSelectChapter, novel],
  );

  const handleChapterReady = useCallback(
    async (container: HTMLElement) => {
      const pending = pendingScrollRef.current;
      if (pending !== null) {
        pendingScrollRef.current = null;
        container.scrollTop = pending;
        return;
      }
      if (forceScrollTopRef.current) {
        forceScrollTopRef.current = false;
        container.scrollTop = 0;
        return;
      }
      await restoreProgress(container);
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

  const handleRefetchChapter = useCallback(async () => {
    if (!activeChapter || !novel) return;
    setIsLoadingChapter(true);
    try {
      const content = await scrapeChapterContent(activeChapter.url);
      const updated: Chapter = { ...activeChapter, content, savedAt: new Date().toISOString() };
      setActiveChapter(updated);
      setNovel(prev => {
        if (!prev) return prev;
        const newNovel = { ...prev, chapters: prev.chapters.map(c => c.id === activeChapter.id ? updated : c) };
        saveNovel(newNovel);
        syncNovel(newNovel);
        return newNovel;
      });
      toast.success('Chapter re-fetched');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Re-fetch failed');
    } finally {
      setIsLoadingChapter(false);
    }
  }, [activeChapter, novel]);

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
          isDesktopSidebarOpen={isDesktopSidebarOpen}
          onToggleDesktopSidebar={toggleDesktopSidebar}
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
        {!immersive.isImmersive && (
          <div
            className={`border-r border-border bg-card flex-shrink-0 hidden md:flex transition-all duration-300 ${
              isDesktopSidebarOpen ? 'w-72 flex-col' : 'w-14 items-start justify-center'
            }`}
          >
            {isDesktopSidebarOpen ? (
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
            ) : (
              <div className="w-full h-full flex items-start justify-center pt-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleDesktopSidebar}
                  aria-label="Expand chapter sidebar"
                  title="Expand chapter sidebar"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
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
              onRefetchChapter={activeChapter ? handleRefetchChapter : undefined}
            />
          </ErrorBoundary>
        </div>
      </div>

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

export default WebReader;
