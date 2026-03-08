import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ChapterList from '@/components/ChapterList';
import ReaderView from '@/components/ReaderView';
import NovelToolbar from '@/components/NovelToolbar';
import MobileChapterDrawer from '@/components/MobileChapterDrawer';
import ErrorBoundary from '@/components/ErrorBoundary';
import { type Novel, type Chapter, saveNovel, getNovel } from '@/lib/novel-store';
import { syncNovel, syncBookmarksToBackend, syncProgressToBackend, fetchChapterContentFromBackend, syncFullNovelFromBackend } from '@/lib/sync-service';
import { exportToPdfWithProgress, exportToDocxWithProgress } from '@/lib/export-service';
import { useChapterNavigation } from '@/hooks/useChapterNavigation';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { useBookmarks } from '@/hooks/useBookmarks';
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

  const { isFetching: isFetchingAll, progress: fetchProgress, fetchAll } = useChapterFetcher();
  const appSettings = useAppSettings();

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

    // Sync from backend to pick up new chapters (cron-discovered or from other devices)
    if (!appSettings.syncEnabled) return;
    syncFullNovelFromBackend(novelId).then(synced => {
      if (synced) {
        setNovel(prev => {
          if (!prev) return synced;
          // Merge: keep local content, add new remote chapters
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
    if (chapter.content) {
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
      // Try backend first, then scrape as fallback
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
      syncBookmarksToBackend(novelIdStr); // sync after add
      toast.success(label ? `Bookmarked: "${label}"` : 'Bookmark added');
    },
    [activeChapter, addChapterBookmark, novelIdStr],
  );

  const handleRemoveBookmark = useCallback(
    (id: string) => {
      removeBookmark(id);
      syncBookmarksToBackend(novelIdStr); // sync after remove
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
    <div className="h-screen flex flex-col bg-background">
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
      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 border-r border-border bg-card flex-shrink-0 hidden md:flex flex-col">
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
        <div className="flex-1">
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
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default Reader;
