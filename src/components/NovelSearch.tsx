import { useState, useCallback } from 'react';
import { Search, Loader2, Plus, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { searchNovels, type SearchResult } from '@/lib/api/firecrawl';
import { toast } from 'sonner';

interface NovelSearchProps {
  onAddNovel: (url: string) => void;
  isAddingNovel: boolean;
}

const sourceColors: Record<string, string> = {
  NovelBin: 'bg-primary/10 text-primary border-primary/20',
  WuxiaClick: 'bg-accent/10 text-accent border-accent/20',
  EmpireNovel: 'bg-secondary text-secondary-foreground border-border',
};

const NovelSearch = ({ onAddNovel, isAddingNovel }: NovelSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingUrl, setAddingUrl] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (query.trim().length < 2) {
      toast.error('Enter at least 2 characters');
      return;
    }
    setIsSearching(true);
    setResults([]);
    try {
      const data = await searchNovels(query.trim());
      setResults(data);
      if (data.length === 0) {
        toast.info('No novels found. Try different keywords.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  const handleAdd = (url: string) => {
    setAddingUrl(url);
    onAddNovel(url);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search novels across all sites..."
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isSearching || query.trim().length < 2}>
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </Button>
      </form>

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-sans-ui">
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </p>
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
            {results.map((result) => (
              <div
                key={result.url}
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-card/80 transition-colors"
              >
                <Globe className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-sans-ui font-medium text-sm text-foreground truncate">
                      {result.title}
                    </h3>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sourceColors[result.source] || ''}`}>
                      {result.source}
                    </Badge>
                  </div>
                  {result.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {result.description}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAdd(result.url)}
                  disabled={isAddingNovel && addingUrl === result.url}
                  className="flex-shrink-0"
                >
                  {isAddingNovel && addingUrl === result.url ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  <span className="ml-1">Add</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isSearching && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm font-sans-ui">Searching across novel sites...</span>
        </div>
      )}
    </div>
  );
};

export default NovelSearch;
