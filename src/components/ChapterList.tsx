import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { BookmarkCheck, Search, X } from 'lucide-react';
import type { Chapter } from '@/lib/novel-store';
import { useChapterSearch } from '@/hooks/useChapterSearch';
import { Button } from '@/components/ui/button';

interface ChapterListProps {
  chapters: Chapter[];
  activeChapterId?: string;
  onSelectChapter: (chapter: Chapter) => void;
}

const ChapterList = ({ chapters, activeChapterId, onSelectChapter }: ChapterListProps) => {
  const { searchQuery, setSearchQuery, filteredChapters, resultCount, clearSearch, highlightMatch } =
    useChapterSearch(chapters);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-2">
        <h2 className="font-sans-ui font-semibold text-sm uppercase tracking-wider text-muted-foreground">
          Chapters ({chapters.length})
        </h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search chapters..."
            className="pl-8 pr-8 h-8 text-sm font-sans-ui"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-6 w-6"
              onClick={clearSearch}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs text-muted-foreground font-sans-ui">
            {resultCount} result{resultCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-2">
          {filteredChapters.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => onSelectChapter(chapter)}
              className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 font-sans-ui text-sm transition-colors
                ${activeChapterId === chapter.id
                  ? 'bg-chapter-active text-foreground font-medium'
                  : 'hover:bg-chapter-hover text-muted-foreground hover:text-foreground'
                }`}
            >
              <div className="flex items-center gap-2">
                {chapter.content && (
                  <BookmarkCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                )}
                {searchQuery ? (
                  <span
                    className="truncate"
                    dangerouslySetInnerHTML={{ __html: highlightMatch(chapter.title) }}
                  />
                ) : (
                  <span className="truncate">{chapter.title}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChapterList;
