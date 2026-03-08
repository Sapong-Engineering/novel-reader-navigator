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
import { orderChapters } from '@/lib/chapter-order';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, LogOut, LogIn, Loader2, WifiOff, RefreshCw, Shield, Search as SearchIcon, Link as LinkIcon } from 'lucide-react';
import NovelSearch from '@/components/NovelSearch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import SyncIndicator from '@/components/SyncIndicator';
import SettingsPanel from '@/components/SettingsPanel';
import NotificationCenter from '@/components/NotificationCenter';
import BackgroundFetchBanner from '@/components/BackgroundFetchBanner';
import ReadingStats from '@/components/ReadingStats';
import ReadingListManager from '@/components/ReadingListManager';
import AddToListMenu from '@/components/AddToListMenu';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { useReadingLists } from '@/hooks/useReadingLists';
import { isSyncEnabled } from '@/lib/notify';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [isLoadingNovel, setIsLoadingNovel] = useState(false);
  const [library, setLibrary] = useState<Novel[]>(() => getLibrary());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeListFilter, setActiveListFilter] = useState<string | null>(null);
  const appSettings = useAppSettings();
  const [isAdmin, setIsAdmin] = useState(false);
  const readingLists = useReadingLists();

  // Check admin role
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    import('@/integrations/supabase/client').then(({ supabase }) => {
      supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
        .then(({ data }) => setIsAdmin(!!data));
    });
  }, [user]);

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

  // Sync library from backend when authenticated
  const syncedRef = useRef(false);
  useEffect(() => {
    if (user && !authLoading && !syncedRef.current && appSettings.syncEnabled) {
      syncedRef.current = true;
      setIsSyncing(true);
      syncLibraryFromBackend()
        .then(novels => setLibrary(novels))
        .catch(() => setLibrary(getLibrary()))
        .finally(() => setIsSyncing(false));
    }
    if (!user) syncedRef.current = false;
  }, [user, authLoading, appSettings.syncEnabled]);

  const handleFetchNovel = useCallback(async (url: string) => {
    const existing = library.find(n => n.url === url);
    if (existing) {
      navigate(`/reader/${existing.id}`);
      toast.info(`"${existing.title}" is already in your library.`);
      return;
    }

    setIsLoadingNovel(true);
    try {
      const info = await scrapeNovelInfo(url);
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
        chapters: orderChapters(info.chapters.map(ch => ({
          id: ch.id,
          title: ch.title,
          url: ch.url,
        }))),
        savedAt: new Date().toISOString(),
      };
      saveNovel(newNovel);
      await Promise.all([
        Promise.resolve(),
        syncNovel(newNovel),
      ]);
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
    syncDeleteNovel(id);
    setLibrary(getLibrary());
    toast.success('Novel removed from library');
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    toast.success('Signed out');
  }, [signOut]);

  const handleManualSync = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    toast.info('Syncing library...');
    try {
      const novels = await syncLibraryFromBackend();
      setLibrary(novels);
      toast.success('Library synced!');
    } catch {
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  const handleToggleList = useCallback((listId: string, novelId: string, checked: boolean) => {
    if (checked) {
      readingLists.addToList(listId, novelId);
    } else {
      readingLists.removeFromList(listId, novelId);
    }
  }, [readingLists]);

  // Filter library by active list
  const filteredLibrary = activeListFilter
    ? library.filter(n => readingLists.getListNovelIds(activeListFilter).includes(n.id))
    : library;

  return (
    <div id="main-content" className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-end px-4 py-3 gap-2">
        {user && (
          <Button variant="ghost" size="icon" onClick={handleManualSync} disabled={isSyncing || !appSettings.syncEnabled} aria-label="Sync library">
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        )}
        <SyncIndicator />
        <NotificationCenter />
        <ReadingStats />
        {user && (
          <ReadingListManager
            lists={readingLists.lists}
            onCreate={readingLists.createList}
            onRename={readingLists.renameList}
            onDelete={readingLists.deleteList}
          />
        )}
        <SettingsPanel onSync={user ? handleManualSync : undefined} />
        {authLoading ? null : user ? (
          <>
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                <Shield className="w-4 h-4 mr-1" /> Admin
              </Button>
            )}
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

      {/* Background fetch progress */}
      <BackgroundFetchBanner />

      {/* Offline banner */}
      {!isOnline && (
        <div role="status" aria-live="polite" className="mx-4 mb-2 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
          <WifiOff className="w-4 h-4 text-destructive flex-shrink-0" aria-hidden="true" />
          <p className="text-sm font-sans-ui text-foreground">
            You're offline. Your library is available from local cache. New novels can't be fetched until you reconnect.
          </p>
        </div>
      )}

      {/* Hero Section */}
      <div className="flex items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-2xl">
          <Tabs defaultValue="url" className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="url" className="flex-1 gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" /> Paste URL
              </TabsTrigger>
              <TabsTrigger value="search" className="flex-1 gap-1.5">
                <SearchIcon className="w-3.5 h-3.5" /> Search Novels
              </TabsTrigger>
            </TabsList>
            <TabsContent value="url">
              <NovelUrlInput onSubmit={handleFetchNovel} isLoading={isLoadingNovel} />
            </TabsContent>
            <TabsContent value="search">
              <NovelSearch onAddNovel={handleFetchNovel} isAddingNovel={isLoadingNovel} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Library Section */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="font-sans-ui font-semibold text-lg text-foreground">Your Library</h2>
          {library.length > 0 && (
            <span className="text-xs text-muted-foreground font-sans-ui ml-1">
              ({library.length} {library.length === 1 ? 'novel' : 'novels'})
            </span>
          )}
          {isSyncing && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-2" />}
        </div>

        {/* Reading list filter tabs */}
        {user && readingLists.lists.length > 0 && (
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto scrollbar-thin pb-1">
            <Button
              variant={activeListFilter === null ? 'default' : 'outline'}
              size="sm"
              className="font-sans-ui text-xs rounded-full px-3 h-7 whitespace-nowrap"
              onClick={() => setActiveListFilter(null)}
            >
              All
            </Button>
            {readingLists.lists.map(list => (
              <Button
                key={list.id}
                variant={activeListFilter === list.id ? 'default' : 'outline'}
                size="sm"
                className="font-sans-ui text-xs rounded-full px-3 h-7 whitespace-nowrap"
                onClick={() => setActiveListFilter(activeListFilter === list.id ? null : list.id)}
              >
                {list.icon} {list.name}
              </Button>
            ))}
          </div>
        )}

        {filteredLibrary.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-sans-ui text-sm">
              {activeListFilter ? 'No novels in this list yet.' : 'No saved novels yet. Paste a URL above to get started.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredLibrary.map(novel => (
              <NovelCard
                key={novel.id}
                novel={novel}
                onOpen={handleOpenNovel}
                onDelete={handleDeleteNovel}
                lists={readingLists.lists}
                selectedListIds={readingLists.getNovelLists(novel.id)}
                onToggleList={(listId, checked) => handleToggleList(listId, novel.id, checked)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
