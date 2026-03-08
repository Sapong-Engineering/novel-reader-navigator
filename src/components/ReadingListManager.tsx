import { useState } from 'react';
import { FolderOpen, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { ReadingList } from '@/hooks/useReadingLists';

interface ReadingListManagerProps {
  lists: ReadingList[];
  onCreate: (name: string, icon?: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

const ReadingListManager = ({ lists, onCreate, onRename, onDelete }: ReadingListManagerProps) => {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName('');
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    onRename(id, editName.trim());
    setEditingId(null);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Manage reading lists">
          <FolderOpen className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="font-sans-ui flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" /> Reading Lists
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-2">
          {lists.map(list => (
            <div key={list.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30">
              <span className="text-lg">{list.icon}</span>
              {editingId === list.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="h-7 text-sm flex-1"
                    onKeyDown={e => e.key === 'Enter' && handleRename(list.id)}
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRename(list.id)}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-sans-ui font-medium">{list.name}</span>
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6"
                    onClick={() => { setEditingId(list.id); setEditName(list.name); }}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(list.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          ))}

          {/* Create new */}
          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="New list name..."
              className="h-8 text-sm flex-1"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <Button variant="outline" size="sm" className="h-8" onClick={handleCreate} disabled={!newName.trim()}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ReadingListManager;
