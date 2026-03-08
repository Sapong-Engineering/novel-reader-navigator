import { useState, useEffect, useCallback } from 'react';
import { adminApi, type AdminUser } from '@/lib/api/admin';
import { toast } from 'sonner';
import { Loader2, Ban, CheckCircle, ShieldPlus, ShieldMinus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const UserManagement = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await adminApi.listUsers();
      setUsers(data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggle = async (user: AdminUser) => {
    setActionLoading(user.id);
    try {
      await adminApi.toggleUser(user.id, !user.disabled);
      toast.success(`User ${user.disabled ? 'enabled' : 'disabled'}`);
      await fetchUsers();
    } catch { toast.error('Failed to update user'); }
    finally { setActionLoading(null); }
  };

  const handlePromote = async (userId: string) => {
    setActionLoading(userId);
    try {
      await adminApi.setRole(userId, 'admin');
      toast.success('Admin role granted');
      await fetchUsers();
    } catch { toast.error('Failed to set role'); }
    finally { setActionLoading(null); }
  };

  const handleDemote = async (userId: string) => {
    setActionLoading(userId);
    try {
      await adminApi.removeRole(userId, 'admin');
      toast.success('Admin role removed');
      await fetchUsers();
    } catch { toast.error('Failed to remove role'); }
    finally { setActionLoading(null); }
  };

  const filtered = users.filter(u =>
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.display_name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} users</span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Novels</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(u => (
              <TableRow key={u.id} className={u.disabled ? 'opacity-50' : ''}>
                <TableCell className="font-sans-ui text-sm">{u.email || 'N/A'}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {u.roles.length > 0 ? u.roles.map(r => (
                      <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                    )) : <span className="text-xs text-muted-foreground">user</span>}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{u.novelCount}</TableCell>
                <TableCell>
                  <Badge variant={u.disabled ? 'destructive' : 'outline'} className="text-[10px]">
                    {u.disabled ? 'Disabled' : 'Active'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => handleToggle(u)}
                      disabled={actionLoading === u.id}
                      title={u.disabled ? 'Enable' : 'Disable'}
                    >
                      {u.disabled ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Ban className="w-4 h-4 text-destructive" />}
                    </Button>
                    {u.roles.includes('admin') ? (
                      <Button variant="ghost" size="icon" onClick={() => handleDemote(u.id)} disabled={actionLoading === u.id} title="Remove admin">
                        <ShieldMinus className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => handlePromote(u.id)} disabled={actionLoading === u.id} title="Make admin">
                        <ShieldPlus className="w-4 h-4 text-primary" />
                      </Button>
                    )}
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

export default UserManagement;
