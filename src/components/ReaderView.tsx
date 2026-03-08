import { useRef, useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Loader2, Bookmark, BookmarkCheck, ArrowUp, ArrowDown, BookOpen } from 'lucide-react';
import type { Chapter } from '@/lib/novel-store';
import type { Bookmark as BookmarkType } from '@/lib/bookmarks';

interface ReaderViewProps {
  chapter: Chapter | null;
  novelTitle?: string;
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
  novelTitle,
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
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !chapter) return;

    setCurrentScrollTop(0);
    setScrollProgress(0);
    onChapterReady?.(el);

    const handleScroll = () => {
      const top = el.scrollTop;
      const maxScroll = el.scrollHeight - el.clientHeight;
      setCurrentScrollTop(top);
      setScrollProgress(maxScroll > 0 ? Math.min((top / maxScroll) * 100, 100) : 0);
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
          <div className="reader-loading-icon">
            <BookOpen className="w-10 h-10 text-primary mx-auto" />
          </div>
          <p className="text-muted-foreground font-sans-ui mt-4 text-sm tracking-wide uppercase">
            Loading chapter…
          </p>
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="flex items-center justify-center h-full bg-reader">
        <div className="text-center animate-fade-in px-4">
          <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground font-sans-ui text-base sm:text-lg">
            Select a chapter to start reading
          </p>
        </div>
      </div>
    );
  }

  const showScrollTop = currentScrollTop > 300;

  const handleScrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-full bg-reader relative">
      {/* Reading progress bar */}
      <div className="h-0.5 w-full bg-muted/50 shrink-0 overflow-hidden">
        <div
          className="h-full reader-progress-bar transition-all duration-200 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        <div className="max-w-2xl mx-auto px-5 sm:px-10 py-8 sm:py-14 animate-fade-in">
          {/* Chapter header */}
          <header className="mb-8 sm:mb-12">
            {novelTitle && (
              <p className="font-sans-ui text-xs sm:text-sm text-muted-foreground tracking-widest uppercase mb-2">
                {novelTitle}
              </p>
            )}
            <h2 className="font-sans-ui text-2xl sm:text-3xl font-bold text-foreground leading-tight tracking-tight">
              {chapter.title}
            </h2>
            <div className="reader-ornament mt-5 sm:mt-6" />
          </header>

          {/* Chapter content */}
          {chapter.content ? (
            <div
              className="reader-prose font-serif-reader text-reader leading-[1.85] sm:leading-[2] space-y-5"
              style={{
                fontSize: 'var(--reader-font-size, 17px)',
                fontFamily: 'var(--reader-font-family, serif)',
              }}
            >
              {chapter.content.split('\n\n').map((para, i) =>
                para.trim() && (
                  <p key={i} className={i === 0 ? 'reader-first-paragraph' : ''}>
                    {para.trim()}
                  </p>
                )
              )}
            </div>
          ) : (
            <p className="text-muted-foreground font-sans-ui italic text-center py-12">
              Chapter content not yet fetched.
            </p>
          )}

          {/* End-of-chapter ornament */}
          {chapter.content && (
            <div className="reader-ornament mt-10 sm:mt-14 mb-4" />
          )}
        </div>
      </div>

      {/* Floating scroll buttons */}
      <div className="absolute right-4 bottom-24 flex flex-col gap-2 z-10">
        {showScrollTop && (
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 rounded-full reader-float-btn animate-fade-in"
            onClick={handleScrollToTop}
            title="Back to top"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
        )}
        {!showScrollTop && chapter.content && (
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 rounded-full reader-float-btn animate-fade-in"
            onClick={handleScrollToBottom}
            title="Go to bottom"
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Inline bookmark label input */}
      {showLabelInput && (
        <div className="border-t border-border px-3 sm:px-6 py-2 flex items-center gap-2 bg-card/70 backdrop-blur-sm">
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

      {/* Bottom navigation */}
      <div className="reader-nav-bar px-3 sm:px-6 py-3.5 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevChapter}
          disabled={!hasPrev}
          className="font-sans-ui rounded-full px-4 border-border/60 hover:bg-accent/10"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Previous</span>
          <span className="sm:hidden">Prev</span>
        </Button>

        <div className="flex items-center gap-1.5 min-w-0">
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

        <Button
          variant="outline"
          size="sm"
          onClick={onNextChapter}
          disabled={!hasNext}
          className="font-sans-ui rounded-full px-4 border-border/60 hover:bg-accent/10"
        >
          <span className="hidden sm:inline">Next</span>
          <span className="sm:hidden">Next</span>
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default ReaderView;
