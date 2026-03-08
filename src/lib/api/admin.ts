import { supabase } from '@/integrations/supabase/client';

export interface AdminStats {
  totalUsers: number;
  totalNovels: number;
  totalChapters: number;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  disabled: boolean;
  created_at: string;
  novelCount: number;
  roles: string[];
}

export interface AdminNovel {
  id: string;
  title: string;
  url: string;
  user_id: string;
  owner_email: string;
  owner_name: string | null;
  created_at: string;
  cover_url: string | null;
}

async function adminCall(action: string, params: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data?.data;
}

export const adminApi = {
  getStats: (): Promise<AdminStats> => adminCall('stats'),
  listUsers: (): Promise<AdminUser[]> => adminCall('list-users'),
  toggleUser: (userId: string, disabled: boolean) => adminCall('toggle-user', { userId, disabled }),
  listAllNovels: (): Promise<AdminNovel[]> => adminCall('list-all-novels'),
  deleteNovel: (novelId: string) => adminCall('delete-novel', { novelId }),
  setRole: (userId: string, role: string) => adminCall('set-role', { userId, role }),
  removeRole: (userId: string, role: string) => adminCall('remove-role', { userId, role }),
};
