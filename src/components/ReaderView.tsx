import { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { Chapter } from '@/lib/novel-store';

interface ReaderViewProps {
  chapter: Chapter | null;
  isLoading?: boolean;
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onScroll?: (scrollTop: number) => void;
  onChapterReady?: (container: HTMLElement) => Promise<void>;
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
}: ReaderViewProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !chapter) return;

    onChapterReady?.(el);

    const handleScroll = () => {
      onScroll?.(el.scrollTop);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [chapter?.id, onChapterReady, onScroll]); // eslint-disable-line react-hooks/exhaustive-deps

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

      <div className="border-t border-border px-3 sm:px-6 py-3 flex items-center justify-between bg-card/50">
        <Button variant="ghost" size="sm" onClick={onPrevChapter} disabled={!hasPrev} className="font-sans-ui">
          <ChevronLeft className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Previous</span>
          <span className="sm:hidden">Prev</span>
        </Button>
        <span className="text-xs text-muted-foreground font-sans-ui truncate max-w-[40%] text-center">
          {chapter.title}
        </span>
        <Button variant="ghost" size="sm" onClick={onNextChapter} disabled={!hasNext} className="font-sans-ui">
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default ReaderView;
