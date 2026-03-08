import { useState, useCallback, useEffect, useRef } from 'react';
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
import { syncLibraryFromBackend, syncNovel, syncDeleteNovel } from '@/lib/sync-service';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, LogOut, LogIn, Loader2, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SyncIndicator from '@/components/SyncIndicator';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [isLoadingNovel, setIsLoadingNovel] = useState(false);
  const [library, setLibrary] = useState<Novel[]>(() => getLibrary());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Track online/offline status
  useEffect(() => {
    const onOnline = () => { setIsOnline(true); toast.success('Back online'); };
    const onOffline = () => { setIsOnline(false); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Sync library from backend when authenticated (guarded against double-fire)
  const syncedRef = useRef(false);
  useEffect(() => {
    if (user && !authLoading && !syncedRef.current) {
      syncedRef.current = true;
      setIsSyncing(true);
      syncLibraryFromBackend()
        .then(novels => setLibrary(novels))
        .catch(() => setLibrary(getLibrary()))
        .finally(() => setIsSyncing(false));
    }
    if (!user) syncedRef.current = false;
  }, [user, authLoading]);

  const handleFetchNovel = useCallback(async (url: string) => {
    // Check if novel with same URL already exists
    const existing = library.find(n => n.url === url);
    if (existing) {
      navigate(`/reader/${existing.id}`);
      toast.info(`"${existing.title}" is already in your library.`);
      return;
    }

    setIsLoadingNovel(true);
    try {
      const info = await scrapeNovelInfo(url);

      // Check again after fetch (by URL or title)
      const existingAfterFetch = library.find(n => n.url === url);
      if (existingAfterFetch) {
        navigate(`/reader/${existingAfterFetch.id}`);
        toast.info(`"${existingAfterFetch.title}" is already in your library.`);
        return;
      }

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
      syncNovel(newNovel);
      setLibrary(getLibrary());
      navigate(`/reader/${newNovel.id}`);
      toast.success(`Loaded "${info.title}" with ${info.chapters.length} chapters!`);
    } catch (err) {
      console.error('Failed to fetch novel:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to fetch novel');
    } finally {
      setIsLoadingNovel(false);
    }
  }, [navigate, library]);

  const handleOpenNovel = useCallback((novel: Novel) => {
    navigate(`/reader/${novel.id}`);
  }, [navigate]);

  const handleDeleteNovel = useCallback((id: string) => {
    deleteNovel(id);
    syncDeleteNovel(id); // fire-and-forget
    setLibrary(getLibrary());
    toast.success('Novel removed from library');
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    toast.success('Signed out');
  }, [signOut]);

  return (
    <div id="main-content" className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-end px-4 py-3 gap-2">
        <SyncIndicator />
        {authLoading ? null : user ? (
          <>
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-1" /> Sign Out
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
            <LogIn className="w-4 h-4 mr-1" /> Sign In
          </Button>
        )}
      </div>

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
          {isSyncing && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-2" />}
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
