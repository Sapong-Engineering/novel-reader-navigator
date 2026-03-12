import { useState } from 'react';
import { Book, Trash2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import AddToListMenu from '@/components/AddToListMenu';
import type { Novel } from '@/lib/novel-store';
import type { ReadingList } from '@/hooks/useReadingLists';

interface NovelCardProps {
  novel: Novel;
  onOpen: (novel: Novel) => void;
  onDelete: (id: string) => void;
  lists?: ReadingList[];
  selectedListIds?: string[];
  onToggleList?: (listId: string, checked: boolean) => void;
}

const NovelCard = ({ novel, onOpen, onDelete, lists = [], selectedListIds = [], onToggleList }: NovelCardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const savedCount = novel.chapters.filter(c => c.content).length;
  const savedDate = new Date(novel.savedAt).toLocaleDateString();

  return (
    <div className="group relative bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* Cover / Placeholder */}
      <button
        onClick={() => onOpen(novel)}
        className="w-full aspect-[3/4] relative bg-secondary flex items-center justify-center overflow-hidden"
      >
        {novel.coverUrl ? (
          <img
            src={novel.coverUrl}
            alt={`Cover of ${novel.title}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <Book className="w-12 h-12 text-muted-foreground/40" aria-hidden="true" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="inline-flex items-center gap-1.5 text-xs font-sans-ui font-medium text-white bg-primary/90 rounded-md px-2.5 py-1">
            <BookOpen className="w-3 h-3" aria-hidden="true" />
            Read
          </span>
        </div>
      </button>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-sans-ui font-semibold text-sm truncate text-foreground">
          {novel.title}
        </h3>
        <p className="text-xs text-muted-foreground font-sans-ui mt-1">
          {savedCount}/{novel.chapters.length} chapters · {savedDate}
        </p>
      </div>

      {/* Add to list */}
      {lists.length > 0 && onToggleList && (
        <AddToListMenu
          novelLocalId={novel.id}
          lists={lists}
          selectedListIds={selectedListIds}
          onToggle={onToggleList}
        />
      )}

      {/* Delete with confirmation */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 bg-background/80 backdrop-blur-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity text-destructive hover:text-destructive"
            aria-label={`Delete ${novel.title}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{novel.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this novel and all saved chapters from your library. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete(novel.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NovelCard;
