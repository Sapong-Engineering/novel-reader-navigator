import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Loader2, Bookmark, BookmarkCheck } from 'lucide-react';
import type { Chapter } from '@/lib/novel-store';
import type { Bookmark as BookmarkType } from '@/lib/bookmarks';

interface ReaderViewProps {
  chapter: Chapter | null;
  isLoading?: boolean;
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onScroll?: (scrollTop: number) => void;
  onChapterReady?: (container: HTMLElement) => Promise<void>;
  chapterBookmarks?: BookmarkType[];
  onAddBookmark?: (scrollPosition: number, label?: string) => void;
  onRemoveBookmark?: (id: string) => void;
}

const ReaderView = ({
  chapter,
  isLoading,
  onPrevChapter,
  onNextChapter,
  hasPrev,
  hasNext,
  onScroll,
  onChapterReady,
  chapterBookmarks = [],
  onAddBookmark,
  onRemoveBookmark,
}: ReaderViewProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentScrollTop, setCurrentScrollTop] = useState(0);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !chapter) return;

    setCurrentScrollTop(0);
    onChapterReady?.(el);

    const handleScroll = () => {
      const top = el.scrollTop;
      setCurrentScrollTop(top);
      onScroll?.(top);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [chapter?.id, onChapterReady, onScroll]); // eslint-disable-line react-hooks/exhaustive-deps

  const nearbyBookmark = chapterBookmarks.find(
    b => Math.abs(b.scrollPosition - currentScrollTop) <= 50,
  );
  const isBookmarked = Boolean(nearbyBookmark);

  const handleBookmarkToggle = () => {
    if (isBookmarked && nearbyBookmark) {
      onRemoveBookmark?.(nearbyBookmark.id);
    } else {
      setShowLabelInput(true);
      setLabelDraft('');
    }
  };

  const handleConfirmBookmark = () => {
    onAddBookmark?.(currentScrollTop, labelDraft || undefined);
    setShowLabelInput(false);
    setLabelDraft('');
  };

  const handleCancelBookmark = () => {
    setShowLabelInput(false);
    setLabelDraft('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-reader">
        <div className="text-center animate-fade-in">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground font-sans-ui">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="flex items-center justify-center h-full bg-reader">
        <div className="text-center animate-fade-in px-4">
          <p className="text-muted-foreground font-sans-ui text-base sm:text-lg">
            Select a chapter to start reading
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-reader">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-12 animate-fade-in">
          <h2 className="font-sans-ui text-xl sm:text-2xl font-bold mb-6 sm:mb-8 text-foreground">
            {chapter.title}
          </h2>
          {chapter.content ? (
            <div
              className="font-serif-reader text-reader leading-[1.8] sm:leading-[1.9] space-y-4"
              style={{
                fontSize: 'var(--reader-font-size, 16px)',
                fontFamily: 'var(--reader-font-family, serif)',
              }}
            >
              {chapter.content.split('\n\n').map((para, i) => (
                para.trim() && <p key={i}>{para.trim()}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground font-sans-ui italic">
              Chapter content not yet fetched.
            </p>
          )}
        </div>
      </div>

      {/* Inline bookmark label input */}
      {showLabelInput && (
        <div className="border-t border-border px-3 sm:px-6 py-2 flex items-center gap-2 bg-card/70">
          <Input
            value={labelDraft}
            onChange={e => setLabelDraft(e.target.value)}
            placeholder="Bookmark label (optional)"
            className="h-7 text-sm font-sans-ui flex-1"
            onKeyDown={e => {
              if (e.key === 'Enter') handleConfirmBookmark();
              if (e.key === 'Escape') handleCancelBookmark();
            }}
            autoFocus
          />
          <Button size="sm" className="h-7 text-xs font-sans-ui" onClick={handleConfirmBookmark}>
            Save
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs font-sans-ui" onClick={handleCancelBookmark}>
            Cancel
          </Button>
        </div>
      )}

      <div className="border-t border-border px-3 sm:px-6 py-3 flex items-center justify-between bg-card/50">
        <Button variant="ghost" size="sm" onClick={onPrevChapter} disabled={!hasPrev} className="font-sans-ui">
          <ChevronLeft className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Previous</span>
          <span className="sm:hidden">Prev</span>
        </Button>

        <div className="flex items-center gap-1.5">
          {onAddBookmark && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={handleBookmarkToggle}
              title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-4 h-4 text-primary" />
              ) : (
                <Bookmark className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          )}
          <span className="text-xs text-muted-foreground font-sans-ui truncate max-w-[120px] sm:max-w-[200px] text-center">
            {chapter.title}
          </span>
        </div>

        <Button variant="ghost" size="sm" onClick={onNextChapter} disabled={!hasNext} className="font-sans-ui">
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default ReaderView;
