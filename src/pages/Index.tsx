import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import NovelUrlInput from '@/components/NovelUrlInput';
import ChapterList from '@/components/ChapterList';
import ReaderView from '@/components/ReaderView';
import NovelToolbar from '@/components/NovelToolbar';
import { exportToPdf, exportToDocx } from '@/lib/export-utils';
import { scrapeNovelInfo, scrapeChapterContent } from '@/lib/api/firecrawl';
import {
  type Novel,
  type Chapter,
  saveNovel,
  generateId,
} from '@/lib/novel-store';

const Index = () => {
  const [novel, setNovel] = useState<Novel | null>(null);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [isLoadingNovel, setIsLoadingNovel] = useState(false);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);

  const handleFetchNovel = useCallback(async (url: string) => {
    setIsLoadingNovel(true);
    try {
      const info = await scrapeNovelInfo(url);
      const newNovel: Novel = {
        id: generateId(),
        title: info.title,
        url,
        coverUrl: info.coverUrl,
        description: info.description,
        chapters: info.chapters.map(ch => ({
          id: ch.id,
          title: ch.title,
          url: ch.url,
        })),
        savedAt: new Date().toISOString(),
      };
      setNovel(newNovel);
      toast.success(`Loaded "${info.title}" with ${info.chapters.length} chapters!`);
    } catch (err) {
      console.error('Failed to fetch novel:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to fetch novel');
    } finally {
      setIsLoadingNovel(false);
    }
  }, []);

  const handleSelectChapter = useCallback(async (chapter: Chapter) => {
    if (chapter.content) {
      setActiveChapter(chapter);
      return;
    }

    setIsLoadingChapter(true);
    setActiveChapter(chapter);

    try {
      const content = await scrapeChapterContent(chapter.url);
      const updated: Chapter = {
        ...chapter,
        content,
        savedAt: new Date().toISOString(),
      };
      setActiveChapter(updated);
      setNovel(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          chapters: prev.chapters.map(c => c.id === chapter.id ? updated : c),
        };
      });
    } catch (err) {
      console.error('Failed to fetch chapter:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to fetch chapter');
    } finally {
      setIsLoadingChapter(false);
    }
  }, []);

  const activeIndex = novel?.chapters.findIndex(c => c.id === activeChapter?.id) ?? -1;

  const handlePrev = useCallback(() => {
    if (novel && activeIndex > 0) {
      handleSelectChapter(novel.chapters[activeIndex - 1]);
    }
  }, [novel, activeIndex, handleSelectChapter]);

  const handleNext = useCallback(() => {
    if (novel && activeIndex < novel.chapters.length - 1) {
      handleSelectChapter(novel.chapters[activeIndex + 1]);
    }
  }, [novel, activeIndex, handleSelectChapter]);

  const handleSave = useCallback(() => {
    if (novel) {
      saveNovel(novel);
      toast.success('Novel saved to library!');
    }
  }, [novel]);

  const handleExportPdf = useCallback(async () => {
    if (!novel) return;
    const saved = novel.chapters.filter(c => c.content);
    if (saved.length === 0) {
      toast.error('No chapters to export. Fetch some chapters first.');
      return;
    }
    await exportToPdf(novel.title, saved);
    toast.success('PDF downloaded!');
  }, [novel]);

  const handleExportDocx = useCallback(async () => {
    if (!novel) return;
    const saved = novel.chapters.filter(c => c.content);
    if (saved.length === 0) {
      toast.error('No chapters to export. Fetch some chapters first.');
      return;
    }
    await exportToDocx(novel.title, saved);
    toast.success('DOCX downloaded!');
  }, [novel]);

  // Landing / URL input view
  if (!novel) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <NovelUrlInput onSubmit={handleFetchNovel} isLoading={isLoadingNovel} />
      </div>
    );
  }

  // Reader view
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
        onBack={() => { setNovel(null); setActiveChapter(null); }}
      />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 border-r border-border bg-card flex-shrink-0 hidden md:flex flex-col">
          <ChapterList
            chapters={novel.chapters}
            activeChapterId={activeChapter?.id}
            onSelectChapter={handleSelectChapter}
          />
        </div>
        {/* Reader */}
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

export default Index;
