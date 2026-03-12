import { List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import type { ReadingList } from '@/hooks/useReadingLists';

interface AddToListMenuProps {
  novelLocalId: string;
  lists: ReadingList[];
  selectedListIds: string[];
  onToggle: (listId: string, checked: boolean) => void;
}

const AddToListMenu = ({ novelLocalId, lists, selectedListIds, onToggle }: AddToListMenuProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 left-2 h-7 w-7 bg-background/80 backdrop-blur-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          aria-label="Add to list"
          onClick={(e) => e.stopPropagation()}
        >
          <List className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(192px,80vw)] p-2" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-semibold font-sans-ui text-muted-foreground mb-2 px-1">Add to list</p>
        {lists.map(list => {
          const checked = selectedListIds.includes(list.id);
          return (
            <label
              key={list.id}
              className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-accent/10 cursor-pointer"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => onToggle(list.id, !!v)}
              />
              <span className="text-sm font-sans-ui">{list.icon} {list.name}</span>
            </label>
          );
        })}
      </PopoverContent>
    </Popover>
  );
};

export default AddToListMenu;
