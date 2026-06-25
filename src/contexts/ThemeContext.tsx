/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { THEMES, DEFAULT_THEME, isThemeId } from './themes';
import type { ThemeId, ThemeDef } from './themes';

const STORAGE_KEY = 'theme';

interface ThemeContextType {
  theme: ThemeId;
  def: ThemeDef;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isThemeId(saved) ? saved : DEFAULT_THEME;
  });

  useEffect(() => {
    const def = THEMES[theme];
    localStorage.setItem(STORAGE_KEY, def.id);

    const root = document.documentElement;
    root.setAttribute('data-theme', def.id);
    // Dark-based themes keep the `.dark` class so every existing `dark:` utility
    // and `.dark` rule keeps working without a rewrite.
    root.classList.toggle('dark', def.base === 'dark');
    // The futuristic HUD is the one interface, present for every theme; a theme
    // only swaps the palette + the animated background. So `.immersive` is
    // always on (it gates the holographic chrome + ambient scene).
    root.classList.add('immersive');
  }, [theme]);

  const setTheme = useCallback((id: ThemeId) => {
    if (isThemeId(id)) setThemeState(id);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, def: THEMES[theme], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
