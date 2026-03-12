import { useState, useCallback, useEffect } from 'react';
import { Search, Loader2, Plus, Globe, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { searchNovels, getActiveSources, type SearchResult, type ActiveSource } from '@/lib/api/firecrawl';
import { toast } from 'sonner';

interface NovelSearchProps {
  onAddNovel: (url: string) => void;
  isAddingNovel: boolean;
}

const sourceColors: Record<string, string> = {
  NovelBin: 'bg-primary/10 text-primary border-primary/20',
  WuxiaClick: 'bg-accent/10 text-accent border-accent/20',
  EmpireNovel: 'bg-secondary text-secondary-foreground border-border',
  Gutenberg: 'bg-muted text-muted-foreground border-border',
};

const NovelSearch = ({ onAddNovel, isAddingNovel }: NovelSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingUrl, setAddingUrl] = useState<string | null>(null);
  const [activeSources, setActiveSources] = useState<ActiveSource[]>([]);
  // null means "All sources"
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  useEffect(() => {
    getActiveSources().then(setActiveSources).catch(() => {});
  }, []);

  const handleSearch = useCallback(async () => {
    if (query.trim().length < 2) {
      toast.error('Enter at least 2 characters');
      return;
    }
    setIsSearching(true);
    setResults([]);
    setSourceFilter(null);
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

  const visibleResults = sourceFilter
    ? results.filter(r => r.source === sourceFilter)
    : results;

  // Sources that actually appear in results (for filter chips)
  const resultSources = Array.from(new Set(results.map(r => r.source)));

  const isGutenbergAdding = (url: string) =>
    isAddingNovel && addingUrl === url && url.includes('gutenberg.org');

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

      {/* Active sources indicator */}
      {activeSources.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-muted-foreground font-sans-ui">Sources:</span>
          {activeSources.map((source) => (
            <Badge
              key={source.key}
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${
                source.enabled
                  ? sourceColors[source.label] || 'bg-primary/10 text-primary border-primary/20'
                  : 'bg-muted/50 text-muted-foreground/50 border-border/50 line-through'
              }`}
            >
              {source.label}
            </Badge>
          ))}
        </div>
      )}

      {/* Source filter chips — shown only after search returns results from multiple sources */}
      {results.length > 0 && resultSources.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-muted-foreground font-sans-ui">Filter:</span>
          <button
            onClick={() => setSourceFilter(null)}
            className={`text-[11px] px-2 py-0.5 rounded-full border font-sans-ui transition-colors ${
              sourceFilter === null
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/40'
            }`}
          >
            All ({results.length})
          </button>
          {resultSources.map(src => (
            <button
              key={src}
              onClick={() => setSourceFilter(src === sourceFilter ? null : src)}
              className={`text-[11px] px-2 py-0.5 rounded-full border font-sans-ui transition-colors ${
                sourceFilter === src
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:border-foreground/40'
              }`}
            >
              {src} ({results.filter(r => r.source === src).length})
            </button>
          ))}
        </div>
      )}

      {visibleResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-sans-ui">
            {visibleResults.length} result{visibleResults.length !== 1 ? 's' : ''}{sourceFilter ? ` from ${sourceFilter}` : ''}
          </p>
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
            {visibleResults.map((result) => {
              const isGutenberg = result.source === 'Gutenberg';
              return (
                <div
                  key={result.url}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-card/80 transition-colors"
                >
                  {isGutenberg
                    ? <BookOpen className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                    : <Globe className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-sans-ui font-medium text-sm text-foreground truncate">
                        {result.title}
                      </h3>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sourceColors[result.source] || ''}`}>
                        {result.source}
                      </Badge>
                      {isGutenberg && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                          Public Domain
                        </Badge>
                      )}
                    </div>
                    {isGutenberg && result.author && (
                      <p className="text-xs text-muted-foreground font-sans-ui mt-0.5">
                        by {result.author}
                      </p>
                    )}
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
              );
            })}
          </div>
        </div>
      )}

      {isSearching && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm font-sans-ui">
            {activeSources.some(s => s.label === 'Gutenberg' && s.enabled)
              ? 'Searching novels and public domain books...'
              : 'Searching across novel sites...'}
          </span>
        </div>
      )}

      {/* Gutenberg-specific note shown while adding */}
      {isGutenbergAdding(addingUrl ?? '') && (
        <p className="text-xs text-muted-foreground font-sans-ui text-center animate-pulse">
          Fetching full text and detecting chapters — this may take a few seconds…
        </p>
      )}
    </div>
  );
};

export default NovelSearch;
