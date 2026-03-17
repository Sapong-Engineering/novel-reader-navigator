import { createContext, useContext, useState, useEffect } from 'react';
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
  // Default to 'system' until admin setting is loaded
  const [defaultTheme, setDefaultTheme] = useState<string>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Only apply admin default_theme if user hasn't already set their own preference
    const userHasTheme = localStorage.getItem('novel-reader-theme') !== null;
    if (userHasTheme) {
      setReady(true);
      return;
    }
    supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'default_theme')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && ['light', 'dark', 'system'].includes(String(data.value))) {
          setDefaultTheme(String(data.value));
        }
        setReady(true);
      });
  }, []);

  // Don't render until we know the correct defaultTheme to avoid flash
  if (!ready) return null;

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      storageKey="novel-reader-theme"
    >
      <ThemeContextBridge>{children}</ThemeContextBridge>
    </NextThemesProvider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider');
  return ctx;
}
