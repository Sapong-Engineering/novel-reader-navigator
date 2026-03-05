import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import ChapterList from './ChapterList';
import type { Chapter } from '@/lib/novel-store';
import { useState } from 'react';

interface MobileChapterDrawerProps {
  chapters: Chapter[];
  activeChapterId?: string;
  onSelectChapter: (chapter: Chapter) => void;
}

const MobileChapterDrawer = ({ chapters, activeChapterId, onSelectChapter }: MobileChapterDrawerProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0">
        <SheetHeader className="px-4 pt-4 pb-0">
          <SheetTitle className="font-sans-ui text-sm">Chapters</SheetTitle>
        </SheetHeader>
        <div className="h-[calc(100vh-60px)]">
          <ChapterList
            chapters={chapters}
            activeChapterId={activeChapterId}
            onSelectChapter={(ch) => {
              onSelectChapter(ch);
              setOpen(false);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileChapterDrawer;
