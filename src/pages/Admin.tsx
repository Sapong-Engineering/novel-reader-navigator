import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Shield, Users, BookOpen, BarChart3, ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserManagement from '@/components/admin/UserManagement';
import ContentModeration from '@/components/admin/ContentModeration';
import Analytics from '@/components/admin/Analytics';
import AdminPreferences from '@/components/admin/AdminPreferences';

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }

    supabase.functions
      .invoke('admin-api', { body: { action: 'check-admin' } })
      .then(({ data, error }) => {
        if (error || !data?.data?.isAdmin) {
          toast.error('Access denied: admin role required');
          navigate('/');
        } else {
          setIsAdmin(true);
        }
        setChecking(false);
      });
  }, [user, authLoading, navigate]);

  if (authLoading || checking || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Shield className="w-8 h-8 text-muted-foreground animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="font-sans-ui font-semibold text-lg text-foreground">Admin Panel</h1>
          <span className="text-xs text-muted-foreground ml-auto">{user?.email}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="analytics" className="gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="w-3.5 h-3.5" /> Users
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Content
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-1.5">
              <Settings className="w-3.5 h-3.5" /> Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <Analytics />
          </TabsContent>
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
          <TabsContent value="content">
            <ContentModeration />
          </TabsContent>
          <TabsContent value="preferences">
            <AdminPreferences />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
