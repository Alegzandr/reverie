/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { THEMES, DEFAULT_THEME, isThemeId } from './themes';
import type { ThemeId, ThemeDef } from './themes';

const STORAGE_KEY = 'theme';
const RECENTS_KEY = 'theme-recents';
/** How many moods the rail surfaces as "recently used". */
const MAX_RECENTS = 5;

interface ThemeContextType {
  theme: ThemeId;
  def: ThemeDef;
  setTheme: (id: ThemeId) => void;
  /** Most-recently-applied moods, newest first, current theme always at index 0. */
  recentThemes: ThemeId[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function readInitialTheme(): ThemeId {
  const saved = localStorage.getItem(STORAGE_KEY);
  return isThemeId(saved) ? saved : DEFAULT_THEME;
}

function readRecents(): ThemeId[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]');
    if (Array.isArray(raw)) return raw.filter(isThemeId);
  } catch {
    // Corrupt/missing list — start fresh.
  }
  return [];
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readInitialTheme);
  const [recentThemes, setRecentThemes] = useState<ThemeId[]>(() => {
    const current = readInitialTheme();
    // Pin the active theme to the front so the rail always opens on the mood
    // you're actually hearing.
    return [current, ...readRecents().filter((id) => id !== current)].slice(0, MAX_RECENTS);
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

  useEffect(() => {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recentThemes));
  }, [recentThemes]);

  const setTheme = useCallback((id: ThemeId) => {
    if (!isThemeId(id)) return;
    setThemeState(id);
    setRecentThemes((prev) => [id, ...prev.filter((t) => t !== id)].slice(0, MAX_RECENTS));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, def: THEMES[theme], setTheme, recentThemes }}>
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
