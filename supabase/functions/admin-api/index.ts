import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // User client to get caller identity
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if caller is admin
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { action, ...params } = body;

    // Lightweight admin check endpoint — no body needed
    if (action === 'check-admin') {
      return new Response(JSON.stringify({ success: true, data: { isAdmin: true } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result: any;

    switch (action) {
      case 'stats': {
        const [users, novels, chapters] = await Promise.all([
          adminClient.from('profiles').select('id', { count: 'exact', head: true }),
          adminClient.from('novels').select('id', { count: 'exact', head: true }),
          adminClient.from('chapters').select('id', { count: 'exact', head: true }),
        ]);
        result = {
          totalUsers: users.count || 0,
          totalNovels: novels.count || 0,
          totalChapters: chapters.count || 0,
        };
        break;
      }

      case 'list-users': {
        const { data: profiles } = await adminClient
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        // Get novel counts per user
        const { data: novelCounts } = await adminClient
          .from('novels')
          .select('user_id');

        const countMap: Record<string, number> = {};
        (novelCounts || []).forEach((n: any) => {
          countMap[n.user_id] = (countMap[n.user_id] || 0) + 1;
        });

        // Get roles
        const { data: roles } = await adminClient.from('user_roles').select('*');
        const roleMap: Record<string, string[]> = {};
        (roles || []).forEach((r: any) => {
          if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
          roleMap[r.user_id].push(r.role);
        });

        result = (profiles || []).map((p: any) => ({
          ...p,
          novelCount: countMap[p.id] || 0,
          roles: roleMap[p.id] || [],
        }));
        break;
      }

      case 'toggle-user': {
        const { userId, disabled } = params;
        if (!userId) throw new Error('userId required');
        const { error } = await adminClient
          .from('profiles')
          .update({ disabled: !!disabled, updated_at: new Date().toISOString() })
          .eq('id', userId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'list-all-novels': {
        const { data } = await adminClient
          .from('novels')
          .select('*, profiles!novels_user_id_fkey(email, display_name)')
          .order('created_at', { ascending: false });

        // The join may fail if FK doesn't exist, fallback to manual join
        if (data && data.length > 0 && data[0].profiles) {
          result = data;
        } else {
          const { data: novels } = await adminClient
            .from('novels')
            .select('*')
            .order('created_at', { ascending: false });

          const userIds = [...new Set((novels || []).map((n: any) => n.user_id))];
          const { data: profiles } = await adminClient
            .from('profiles')
            .select('id, email, display_name')
            .in('id', userIds);

          const profileMap: Record<string, any> = {};
          (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

          result = (novels || []).map((n: any) => ({
            ...n,
            owner_email: profileMap[n.user_id]?.email || 'Unknown',
            owner_name: profileMap[n.user_id]?.display_name || null,
          }));
        }
        break;
      }

      case 'delete-novel': {
        const { novelId } = params;
        if (!novelId) throw new Error('novelId required');
        // Delete chapters first, then novel
        await adminClient.from('chapters').delete().eq('novel_id', novelId);
        await adminClient.from('bookmarks').delete().eq('novel_id', novelId);
        await adminClient.from('reading_progress').delete().eq('novel_id', novelId);
        const { error } = await adminClient.from('novels').delete().eq('id', novelId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'set-role': {
        const { userId, role } = params;
        if (!userId || !role) throw new Error('userId and role required');
        const { error } = await adminClient
          .from('user_roles')
          .upsert({ user_id: userId, role }, { onConflict: 'user_id,role' });
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'remove-role': {
        const { userId, role } = params;
        if (!userId || !role) throw new Error('userId and role required');
        const { error } = await adminClient
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'get-settings': {
        const { data } = await adminClient
          .from('admin_settings')
          .select('key, value');
        const map: Record<string, any> = {};
        (data || []).forEach((r: any) => { map[r.key] = r.value; });
        result = map;
        break;
      }

      case 'update-setting': {
        const { key, value } = params;
        if (!key) throw new Error('key required');
        const { error } = await adminClient
          .from('admin_settings')
          .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: 'key' });
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'list-cleaning-rules': {
        const { data: rules } = await adminClient
          .from('cleaning_rules')
          .select('id, pattern, flags, description, source_url, created_at, created_by')
          .order('created_at', { ascending: false });
        result = rules ?? [];
        break;
      }

      case 'delete-cleaning-rule': {
        const { ruleId } = params;
        if (!ruleId) throw new Error('ruleId required');
        const { error: delErr } = await adminClient
          .from('cleaning_rules')
          .delete()
          .eq('id', ruleId);
        if (delErr) throw delErr;
        result = { success: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Admin API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
