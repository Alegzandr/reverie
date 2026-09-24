/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { MOODS, DEFAULT_MOOD, isMoodId } from './moods';
import type { MoodId, MoodDef } from './moods';

const STORAGE_KEY = 'mood';
/** Whether the live world runs (off = its still poster). One preference across
 *  every mood; missing/anything-but-'false' means on. */
const LIVING_WORLD_KEY = 'reverie:living-world';
/** How long `.mood-shifting` stays on <html> to ease the palette across a switch.
 *  Slightly longer than the 600ms colour transition in index.css, so the tween
 *  finishes before the class is pulled (yanking it mid-tween would snap the
 *  remaining distance). */
const MOOD_SHIFT_MS = 700;

interface MoodContextType {
  mood: MoodId;
  def: MoodDef;
  setMood: (id: MoodId) => void;
  /** The real-time world is running (vs. its still poster). */
  livingWorld: boolean;
  toggleLivingWorld: () => void;
}

const MoodContext = createContext<MoodContextType | undefined>(undefined);

// Storage can be missing or throw (private mode, blocked site data): the mood is
// a preference, so it falls back to the defaults and never takes the app down.
function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Unavailable - the choice holds for this session.
  }
}

function readInitialMood(): MoodId {
  const saved = readStored(STORAGE_KEY);
  return isMoodId(saved) ? saved : DEFAULT_MOOD;
}

function readInitialLivingWorld(): boolean {
  return readStored(LIVING_WORLD_KEY) !== 'false';
}

export function MoodProvider({ children }: { children: ReactNode }) {
  const [mood, setMoodState] = useState<MoodId>(readInitialMood);
  const [livingWorld, setLivingWorld] = useState<boolean>(readInitialLivingWorld);
  // Tracks the palette already painted, so we cross-fade only on a real change
  // (not the first apply). Null until the first effect run.
  const paintedMood = useRef<MoodId | null>(null);
  const shiftTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const def = MOODS[mood];
    writeStored(STORAGE_KEY, def.id);

    const root = document.documentElement;
    // Ease every palette-driven colour across the swap (text, accent fills,
    // borders, icons) - see `.mood-shifting` in index.css. Skip the very first
    // apply: there's no previous palette to cross-fade from. The world itself
    // cross-fades inside the scene engine.
    if (paintedMood.current !== null && paintedMood.current !== mood) {
      root.classList.add('mood-shifting');
      window.clearTimeout(shiftTimer.current);
      shiftTimer.current = window.setTimeout(
        () => root.classList.remove('mood-shifting'),
        MOOD_SHIFT_MS
      );
    }
    paintedMood.current = mood;

    root.setAttribute('data-mood', def.id);
    // Dark-based moods keep the `.dark` class so every existing `dark:` utility
    // and `.dark` rule keeps working without a rewrite.
    root.classList.toggle('dark', def.base === 'dark');
    // The glass chrome over the world is the one interface, for every mood.
    root.classList.add('immersive');
  }, [mood]);

  // Drop the pending cross-fade cleanup if we unmount mid-switch.
  useEffect(() => () => window.clearTimeout(shiftTimer.current), []);

  const setMood = useCallback((id: MoodId) => {
    if (!isMoodId(id)) return;
    setMoodState(id);
  }, []);

  const toggleLivingWorld = useCallback(() => {
    setLivingWorld((prev) => {
      const next = !prev;
      writeStored(LIVING_WORLD_KEY, String(next));
      return next;
    });
  }, []);

  // Stable value object so memoised consumers (AmbientScene, WorldSwitcher, …)
  // can bail out when the provider re-renders for an unrelated reason.
  const value = useMemo(
    () => ({ mood, def: MOODS[mood], setMood, livingWorld, toggleLivingWorld }),
    [mood, setMood, livingWorld, toggleLivingWorld],
  );

  return (
    <MoodContext.Provider value={value}>
      {children}
    </MoodContext.Provider>
  );
}

export function useMood() {
  const context = useContext(MoodContext);
  if (!context) {
    throw new Error('useMood must be used within MoodProvider');
  }
  return context;
}
