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
}

const ReaderView = ({ chapter, isLoading, onPrevChapter, onNextChapter, hasPrev, hasNext }: ReaderViewProps) => {
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
        <div className="text-center animate-fade-in">
          <p className="text-muted-foreground font-sans-ui text-lg">
            Select a chapter to start reading
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-reader">
      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="max-w-2xl mx-auto px-8 py-12 animate-fade-in">
          <h2 className="font-sans-ui text-2xl font-bold mb-8 text-foreground">
            {chapter.title}
          </h2>
          {chapter.content ? (
            <div className="font-serif-reader text-reader leading-[1.9] text-[1.1rem] space-y-4">
              {chapter.content.split('\n\n').map((para, i) => (
                para.trim() && <p key={i}>{para.trim()}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground font-sans-ui italic">
              Chapter content not yet fetched. Click "Fetch" to load this chapter.
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Navigation */}
      <div className="border-t border-border px-6 py-3 flex items-center justify-between bg-card/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevChapter}
          disabled={!hasPrev}
          className="font-sans-ui"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        <span className="text-xs text-muted-foreground font-sans-ui">
          {chapter.title}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNextChapter}
          disabled={!hasNext}
          className="font-sans-ui"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default ReaderView;
