import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import NovelUrlInput from '@/components/NovelUrlInput';
import ChapterList from '@/components/ChapterList';
import ReaderView from '@/components/ReaderView';
import NovelToolbar from '@/components/NovelToolbar';
import { exportToPdf, exportToDocx } from '@/lib/export-utils';
import {
  type Novel,
  type Chapter,
  saveNovel,
  getLibrary,
  generateId,
} from '@/lib/novel-store';

// Demo data for initial experience (since scraping needs backend)
const DEMO_CHAPTERS: Chapter[] = Array.from({ length: 20 }, (_, i) => ({
  id: `ch-${i + 1}`,
  title: `Chapter ${i + 1}`,
  url: `#chapter-${i + 1}`,
  content: i < 3
    ? `This is a demo preview of Chapter ${i + 1} of "Swallowed Star".\n\nIn the year 2056, a catastrophe swept the world. Monsters appeared and civilization trembled. Among the survivors, warriors rose to protect humanity.\n\nLuo Feng, an eighteen-year-old, trained relentlessly in martial arts. His dream was to become a fighter — one of the elite warriors who ventured into the wilderness to battle the monsters that threatened human civilization.\n\nThe world had changed forever, but in that change, new possibilities emerged. Powers beyond human comprehension awaited those brave enough to seek them.\n\n"To connect to the actual novel content, enable Lovable Cloud and the Firecrawl connector to scrape the source website."`
    : undefined,
}));

const Index = () => {
  const [novel, setNovel] = useState<Novel | null>(null);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [isLoadingNovel, setIsLoadingNovel] = useState(false);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);

  const handleFetchNovel = useCallback(async (url: string) => {
    setIsLoadingNovel(true);

    // For now, create a demo novel since scraping needs Cloud + Firecrawl
    setTimeout(() => {
      const newNovel: Novel = {
        id: generateId(),
        title: 'Swallowed Star',
        url,
        description: 'In the year 2056, a catastrophe swept the world...',
        chapters: DEMO_CHAPTERS,
        savedAt: new Date().toISOString(),
      };
      setNovel(newNovel);
      setIsLoadingNovel(false);
      toast.success('Novel loaded! Select a chapter to read.');
    }, 1000);
  }, []);

  const handleSelectChapter = useCallback((chapter: Chapter) => {
    if (chapter.content) {
      setActiveChapter(chapter);
    } else {
      setIsLoadingChapter(true);
      setActiveChapter(chapter);
      // Simulate fetch — real implementation would use Firecrawl
      setTimeout(() => {
        const updated = {
          ...chapter,
          content: `Content for "${chapter.title}" would be fetched from the source website using Firecrawl.\n\nTo enable real scraping, connect Lovable Cloud and add the Firecrawl connector.\n\nThis demo shows the reading experience you'll get once connected.`,
          savedAt: new Date().toISOString(),
        };
        setActiveChapter(updated);
        if (novel) {
          const updatedChapters = novel.chapters.map(c =>
            c.id === chapter.id ? updated : c
          );
          setNovel({ ...novel, chapters: updatedChapters });
        }
        setIsLoadingChapter(false);
      }, 800);
    }
  }, [novel]);

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
