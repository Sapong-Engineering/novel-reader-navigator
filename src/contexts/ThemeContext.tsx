/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';

export interface ThemeContextValue {
  theme: string | undefined;
  setTheme: (theme: string) => void;
  toggleTheme: () => void;
  resolvedTheme: string | undefined;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/** Applies admin's default_theme once on mount — only if the user hasn't already
 *  picked their own theme. Runs inside NextThemesProvider so setTheme is available. */
function AdminThemeApplier() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const userHasTheme = localStorage.getItem('novel-reader-theme') !== null;
    if (userHasTheme) return;

    supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'default_theme')
      .maybeSingle()
      .then(({ data }) => {
        const v = String(data?.value ?? '');
        if (['light', 'dark', 'system'].includes(v)) setTheme(v);
      });
  }, [setTheme]);

  return null;
}

function ThemeContextBridge({ children }: { children: ReactNode }) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="novel-reader-theme"
    >
      <AdminThemeApplier />
      <ThemeContextBridge>{children}</ThemeContextBridge>
    </NextThemesProvider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider');
  return ctx;
}
