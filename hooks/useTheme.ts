import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export const THEME_KEY = 'mafia_theme_v1';

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return { theme, setTheme, toggleTheme };
};
