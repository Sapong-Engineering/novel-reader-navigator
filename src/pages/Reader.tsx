import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ChapterList from '@/components/ChapterList';
import ReaderView from '@/components/ReaderView';
import NovelToolbar from '@/components/NovelToolbar';
import MobileChapterDrawer from '@/components/MobileChapterDrawer';
import ErrorBoundary from '@/components/ErrorBoundary';
import { type Novel, type Chapter, saveNovel, getNovel } from '@/lib/novel-store';
import { exportToPdfWithProgress, exportToDocxWithProgress } from '@/lib/export-service';
import { useChapterNavigation } from '@/hooks/useChapterNavigation';
import { useChapterFetcher } from '@/hooks/useChapterFetcher';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { validateUrl } from '@/lib/validation';
import { scrapeChapterContent } from '@/lib/api/firecrawl';

const Reader = () => {
  const { novelId } = useParams<{ novelId: string }>();
  const navigate = useNavigate();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);

  const { isFetching: isFetchingAll, progress: fetchProgress, fetchAll, cancel: cancelFetch } = useChapterFetcher();
  const { hasPrev, hasNext, goToPrev, goToNext } = useChapterNavigation(
    novel?.chapters ?? [],
    activeChapter,
    handleSelectChapter,
  );

  const novelIdStr = novelId ?? '';
  const { saveProgress, restoreProgress, getLastRead } = useReadingProgress(
    novelIdStr,
    activeChapter?.id,
  );

  useEffect(() => {
    if (novelId) {
      const stored = getNovel(novelId);
      if (stored) {
        setNovel(stored);
        // Auto-open last read chapter
        const lastReadId = getLastRead();
        if (lastReadId) {
          const lastChapter = stored.chapters.find(c => c.id === lastReadId);
          if (lastChapter) setActiveChapter(lastChapter);
        }
      } else {
        toast.error('Novel not found in library. Please go back and try again.');
        navigate('/');
      }
    }
  }, [novelId, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSelectChapter(chapter: Chapter) {
    if (chapter.content) {
      setActiveChapter(chapter);
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
      const content = await scrapeChapterContent(chapter.url);
      const updated: Chapter = { ...chapter, content, savedAt: new Date().toISOString() };
      setActiveChapter(updated);
      setNovel(prev => {
        if (!prev) return prev;
        const newNovel = { ...prev, chapters: prev.chapters.map(c => c.id === chapter.id ? updated : c) };
        saveNovel(newNovel);
        return newNovel;
      });
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

  const handleFetchAll = useCallback(async () => {
    if (!novel || isFetchingAll) return;
    await fetchAll(novel, setNovel);
  }, [novel, isFetchingAll, fetchAll]);

  const handleSave = useCallback(() => {
    if (novel) { saveNovel(novel); toast.success('Novel saved!'); }
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

  return (
    <div className="h-screen flex flex-col bg-background">
      <NovelToolbar
        title={novel.title}
        chapterCount={novel.chapters.length}
        savedCount={savedCount}
        onExportPdf={handleExportPdf}
        onExportDocx={handleExportDocx}
        onSave={handleSave}
        onBack={() => navigate('/')}
        onFetchAll={handleFetchAll}
        isFetchingAll={isFetchingAll}
        fetchProgress={fetchProgress}
        mobileChapterDrawer={
          <MobileChapterDrawer
            chapters={novel.chapters}
            activeChapterId={activeChapter?.id}
            onSelectChapter={handleSelectChapter}
          />
        }
      />
      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 border-r border-border bg-card flex-shrink-0 hidden md:flex flex-col">
          <ErrorBoundary>
            <ChapterList
              chapters={novel.chapters}
              activeChapterId={activeChapter?.id}
              onSelectChapter={handleSelectChapter}
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
              onScroll={saveProgress}
              onChapterReady={restoreProgress}
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default Reader;
