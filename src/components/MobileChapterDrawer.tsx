import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import ChapterList from './ChapterList';
import type { Chapter } from '@/lib/novel-store';
import type { Bookmark } from '@/lib/bookmarks';
import { useState } from 'react';

interface MobileChapterDrawerProps {
  chapters: Chapter[];
  activeChapterId?: string;
  onSelectChapter: (chapter: Chapter) => void;
  bookmarks?: Bookmark[];
  onJumpToBookmark?: (chapterId: string, scrollPosition: number) => void;
  onRemoveBookmark?: (id: string) => void;
  bookmarkedChapterIds?: Set<string>;
}

const MobileChapterDrawer = ({
  chapters,
  activeChapterId,
  onSelectChapter,
  bookmarks,
  onJumpToBookmark,
  onRemoveBookmark,
  bookmarkedChapterIds,
}: MobileChapterDrawerProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(300px,85vw)] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-0 flex-shrink-0">
          <SheetTitle className="font-sans-ui text-sm">Chapters</SheetTitle>
        </SheetHeader>
        <div className="flex-1 min-h-0">
          <ChapterList
            chapters={chapters}
            activeChapterId={activeChapterId}
            onSelectChapter={(ch) => {
              onSelectChapter(ch);
              setOpen(false);
            }}
            bookmarks={bookmarks}
            onJumpToBookmark={(chapterId, scrollPosition) => {
              onJumpToBookmark?.(chapterId, scrollPosition);
              setOpen(false);
            }}
            onRemoveBookmark={onRemoveBookmark}
            bookmarkedChapterIds={bookmarkedChapterIds}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileChapterDrawer;
