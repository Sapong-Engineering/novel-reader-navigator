import { useState, useEffect, useCallback } from 'react';
import { adminApi, type AdminNovel } from '@/lib/api/admin';
import { toast } from 'sonner';
import { Loader2, Trash2, Search, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NovelCover from '@/components/NovelCover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

const ContentModeration = () => {
  const [novels, setNovels] = useState<AdminNovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchNovels = useCallback(async () => {
    try {
      const data = await adminApi.listAllNovels();
      setNovels(data);
    } catch { toast.error('Failed to load novels'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNovels(); }, [fetchNovels]);

  const handleDelete = async (novelId: string) => {
    setDeleting(novelId);
    try {
      await adminApi.deleteNovel(novelId);
      toast.success('Novel deleted');
      setNovels(prev => prev.filter(n => n.id !== novelId));
    } catch { toast.error('Failed to delete novel'); }
    finally { setDeleting(null); }
  };

  const filtered = novels.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.owner_email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search novels or owners..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} novels</span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(n => (
              <TableRow key={n.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <NovelCover
                      coverUrl={n.cover_url}
                      title={n.title}
                      alt=""
                      className="w-8 h-10 rounded"
                      imageClassName="object-cover"
                      iconClassName="w-4 h-4"
                    />
                    <span className="font-sans-ui text-sm font-medium text-foreground truncate max-w-[200px]">
                      {n.title}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{n.owner_email}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon" asChild>
                      <a href={n.url} target="_blank" rel="noopener noreferrer" title="View source">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={deleting === n.id} title="Delete novel">
                          {deleting === n.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{n.title}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove this novel, all its chapters, bookmarks, and reading progress. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(n.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ContentModeration;
