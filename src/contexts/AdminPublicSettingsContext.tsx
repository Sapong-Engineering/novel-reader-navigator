/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminPublicSettings {
  maintenanceMode: boolean;
  announcementMessage: string;
  registrationOpen: boolean;
}

const DEFAULTS: AdminPublicSettings = {
  maintenanceMode: false,
  announcementMessage: '',
  registrationOpen: true,
};

const AdminPublicSettingsContext = createContext<AdminPublicSettings>(DEFAULTS);

export function AdminPublicSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AdminPublicSettings>(DEFAULTS);

  useEffect(() => {
    supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['maintenance_mode', 'announcement_message', 'registration_open'])
      .then(({ data }) => {
        if (!data?.length) return;
        const map: Record<string, unknown> = {};
        for (const row of data) map[row.key] = row.value;
        setSettings({
          maintenanceMode: map.maintenance_mode === true || map.maintenance_mode === 'true',
          announcementMessage: typeof map.announcement_message === 'string' ? map.announcement_message : '',
          registrationOpen: map.registration_open !== false && map.registration_open !== 'false',
        });
      });
  }, []);

  return (
    <AdminPublicSettingsContext.Provider value={settings}>
      {children}
    </AdminPublicSettingsContext.Provider>
  );
}

export function useAdminPublicSettings(): AdminPublicSettings {
  return useContext(AdminPublicSettingsContext);
}
