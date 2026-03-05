import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, BookmarkCheck } from 'lucide-react';
import type { Chapter } from '@/lib/novel-store';

interface ChapterListProps {
  chapters: Chapter[];
  activeChapterId?: string;
  onSelectChapter: (chapter: Chapter) => void;
}

const ChapterList = ({ chapters, activeChapterId, onSelectChapter }: ChapterListProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="font-sans-ui font-semibold text-sm uppercase tracking-wider text-muted-foreground">
          Chapters ({chapters.length})
        </h2>
      </div>
      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-2">
          {chapters.map((chapter) => (
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
                <span className="truncate">{chapter.title}</span>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChapterList;
