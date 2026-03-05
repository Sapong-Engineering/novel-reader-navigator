import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BookmarkCheck, Search, X, Bookmark, Trash2 } from 'lucide-react';
import type { Chapter } from '@/lib/novel-store';
import type { Bookmark as BookmarkType } from '@/lib/bookmarks';
import { useChapterSearch } from '@/hooks/useChapterSearch';

interface ChapterListProps {
  chapters: Chapter[];
  activeChapterId?: string;
  onSelectChapter: (chapter: Chapter) => void;
  bookmarks?: BookmarkType[];
  onJumpToBookmark?: (chapterId: string, scrollPosition: number) => void;
  onRemoveBookmark?: (id: string) => void;
  bookmarkedChapterIds?: Set<string>;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type Tab = 'chapters' | 'bookmarks';

const ChapterList = ({
  chapters,
  activeChapterId,
  onSelectChapter,
  bookmarks = [],
  onJumpToBookmark,
  onRemoveBookmark,
  bookmarkedChapterIds = new Set(),
}: ChapterListProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('chapters');
  const { searchQuery, setSearchQuery, filteredChapters, resultCount, clearSearch, highlightMatch } =
    useChapterSearch(chapters);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab header */}
      <div className="flex-shrink-0 border-b border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab('chapters')}
            className={`flex-1 py-2.5 text-xs font-sans-ui font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'chapters'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Chapters ({chapters.length})
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 py-2.5 text-xs font-sans-ui font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'bookmarks'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Bookmarks{bookmarks.length > 0 ? ` (${bookmarks.length})` : ''}
          </button>
        </div>
      </div>

      {/* Chapters panel */}
      {activeTab === 'chapters' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-shrink-0 p-3 border-b border-border">
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
              <p className="text-xs text-muted-foreground font-sans-ui mt-1.5">
                {resultCount} result{resultCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <ScrollArea className="flex-1">
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
                    {chapter.content ? (
                      <BookmarkCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    ) : bookmarkedChapterIds.has(chapter.id) ? (
                      <Bookmark className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    ) : null}
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
      )}

      {/* Bookmarks panel */}
      {activeTab === 'bookmarks' && (
        <div className="flex flex-col flex-1 min-h-0">
          {bookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 px-4 text-center gap-2">
              <Bookmark className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground font-sans-ui">No bookmarks yet</p>
              <p className="text-xs text-muted-foreground/70 font-sans-ui">
                Use the bookmark icon while reading to save your place
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-2">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="group flex items-start gap-2 px-3 py-2.5 rounded-lg mb-0.5 hover:bg-chapter-hover transition-colors"
                  >
                    <button
                      className="flex-1 text-left min-w-0"
                      onClick={() => onJumpToBookmark?.(bookmark.chapterId, bookmark.scrollPosition)}
                    >
                      <p className="font-sans-ui text-sm text-foreground truncate">
                        {bookmark.label || bookmark.chapterTitle}
                      </p>
                      <p className="font-sans-ui text-xs text-muted-foreground mt-0.5">
                        {bookmark.label ? `${bookmark.chapterTitle} · ` : ''}
                        {formatRelativeTime(bookmark.createdAt)}
                      </p>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5"
                      onClick={() => onRemoveBookmark?.(bookmark.id)}
                      title="Remove bookmark"
                    >
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
};

export default ChapterList;
