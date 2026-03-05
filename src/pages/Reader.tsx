import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ChapterList from '@/components/ChapterList';
import ReaderView from '@/components/ReaderView';
import NovelToolbar from '@/components/NovelToolbar';
import MobileChapterDrawer from '@/components/MobileChapterDrawer';
import { exportToPdf, exportToDocx } from '@/lib/export-utils';
import { scrapeChapterContent } from '@/lib/api/firecrawl';
import { type Novel, type Chapter, saveNovel, getNovel } from '@/lib/novel-store';

const Reader = () => {
  const { novelId } = useParams<{ novelId: string }>();
  const navigate = useNavigate();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (novelId) {
      const stored = getNovel(novelId);
      if (stored) {
        setNovel(stored);
      } else {
        toast.error('Novel not found in library');
        navigate('/');
      }
    }
  }, [novelId, navigate]);

  const handleSelectChapter = useCallback(async (chapter: Chapter) => {
    if (chapter.content) {
      setActiveChapter(chapter);
      return;
    }
    setIsLoadingChapter(true);
    setActiveChapter(chapter);
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
      toast.error(err instanceof Error ? err.message : 'Failed to fetch chapter');
    } finally {
      setIsLoadingChapter(false);
    }
  }, []);

  const handleFetchAll = useCallback(async () => {
    if (!novel || isFetchingAll) return;
    const unfetched = novel.chapters.filter(c => !c.content);
    if (unfetched.length === 0) {
      toast.info('All chapters already fetched!');
      return;
    }
    setIsFetchingAll(true);
    setFetchProgress({ current: 0, total: unfetched.length });
    let currentNovel = novel;

    for (let i = 0; i < unfetched.length; i++) {
      setFetchProgress({ current: i + 1, total: unfetched.length });
      try {
        const content = await scrapeChapterContent(unfetched[i].url);
        const updated: Chapter = { ...unfetched[i], content, savedAt: new Date().toISOString() };
        currentNovel = {
          ...currentNovel,
          chapters: currentNovel.chapters.map(c => c.id === unfetched[i].id ? updated : c),
        };
        setNovel(currentNovel);
        saveNovel(currentNovel);
      } catch (err) {
        console.error(`Failed chapter ${unfetched[i].title}:`, err);
        toast.error(`Failed: ${unfetched[i].title}`);
      }
    }
    setIsFetchingAll(false);
    toast.success('All chapters fetched!');
  }, [novel, isFetchingAll]);

  const activeIndex = novel?.chapters.findIndex(c => c.id === activeChapter?.id) ?? -1;

  const handlePrev = useCallback(() => {
    if (novel && activeIndex > 0) handleSelectChapter(novel.chapters[activeIndex - 1]);
  }, [novel, activeIndex, handleSelectChapter]);

  const handleNext = useCallback(() => {
    if (novel && activeIndex < novel.chapters.length - 1) handleSelectChapter(novel.chapters[activeIndex + 1]);
  }, [novel, activeIndex, handleSelectChapter]);

  const handleSave = useCallback(() => {
    if (novel) { saveNovel(novel); toast.success('Novel saved!'); }
  }, [novel]);

  const handleExportPdf = useCallback(async () => {
    if (!novel) return;
    const saved = novel.chapters.filter(c => c.content);
    if (!saved.length) { toast.error('No chapters to export.'); return; }
    await exportToPdf(novel.title, saved);
    toast.success('PDF downloaded!');
  }, [novel]);

  const handleExportDocx = useCallback(async () => {
    if (!novel) return;
    const saved = novel.chapters.filter(c => c.content);
    if (!saved.length) { toast.error('No chapters to export.'); return; }
    await exportToDocx(novel.title, saved);
    toast.success('DOCX downloaded!');
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
          <ChapterList
            chapters={novel.chapters}
            activeChapterId={activeChapter?.id}
            onSelectChapter={handleSelectChapter}
          />
        </div>
        <div className="flex-1">
          <ReaderView
            chapter={activeChapter}
            isLoading={isLoadingChapter}
            onPrevChapter={handlePrev}
            onNextChapter={handleNext}
            hasPrev={activeIndex > 0}
            hasNext={activeIndex < novel.chapters.length - 1}
          />
        </div>
      </div>
    </div>
  );
};

export default Reader;
