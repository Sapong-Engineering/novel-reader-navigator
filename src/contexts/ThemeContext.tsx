import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';

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
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
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
