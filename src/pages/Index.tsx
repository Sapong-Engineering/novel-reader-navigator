import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import NovelUrlInput from '@/components/NovelUrlInput';
import NovelCard from '@/components/NovelCard';
import { scrapeNovelInfo } from '@/lib/api/firecrawl';
import {
  type Novel,
  getLibrary,
  saveNovel,
  deleteNovel,
  generateId,
} from '@/lib/novel-store';
import { BookOpen } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const [isLoadingNovel, setIsLoadingNovel] = useState(false);
  const [library, setLibrary] = useState<Novel[]>(() => getLibrary());

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
      saveNovel(newNovel);
      setLibrary(getLibrary());
      navigate(`/reader/${newNovel.id}`);
      toast.success(`Loaded "${info.title}" with ${info.chapters.length} chapters!`);
    } catch (err) {
      console.error('Failed to fetch novel:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to fetch novel');
    } finally {
      setIsLoadingNovel(false);
    }
  }, [navigate]);

  const handleOpenNovel = useCallback((novel: Novel) => {
    navigate(`/reader/${novel.id}`);
  }, [navigate]);

  const handleDeleteNovel = useCallback((id: string) => {
    deleteNovel(id);
    setLibrary(getLibrary());
    toast.success('Novel removed from library');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="flex items-center justify-center px-4 py-12 sm:py-20">
        <NovelUrlInput onSubmit={handleFetchNovel} isLoading={isLoadingNovel} />
      </div>

      {/* Library Section */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="font-sans-ui font-semibold text-lg text-foreground">Your Library</h2>
          {library.length > 0 && (
            <span className="text-xs text-muted-foreground font-sans-ui ml-1">
              ({library.length} {library.length === 1 ? 'novel' : 'novels'})
            </span>
          )}
        </div>

        {library.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-sans-ui text-sm">
              No saved novels yet. Paste a URL above to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {library.map(novel => (
              <NovelCard
                key={novel.id}
                novel={novel}
                onOpen={handleOpenNovel}
                onDelete={handleDeleteNovel}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
