import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { UI_REST } from '../constants';

/**
 * The resting interface: while music plays and the listener is still, the
 * panels fade back and the world takes the screen - any movement, key or
 * scroll brings everything straight back. Nothing moves, only opacity changes,
 * so the layout never drifts. A preference (default on) lives in a tiny
 * module-level store shared by the settings toggle and the shell.
 */
const listeners = new Set<() => void>();
let enabled: boolean | null = null;

function readEnabled(): boolean {
  if (enabled === null) {
    enabled = typeof localStorage === 'undefined' || localStorage.getItem(UI_REST.STORAGE_KEY) !== 'false';
  }
  return enabled;
}

export function toggleUiRest(): void {
  enabled = !readEnabled();
  try {
    localStorage.setItem(UI_REST.STORAGE_KEY, String(enabled));
  } catch {
    // Storage unavailable - the choice holds for this session.
  }
  listeners.forEach((l) => l());
}

/** Test helper: forget the cached preference. */
export function resetUiRestStore(): void {
  enabled = null;
}

export function useUiRestPreference(): boolean {
  const subscribe = useCallback((l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  }, []);
  return useSyncExternalStore(subscribe, readEnabled);
}

/** True while the interface should rest (playing, preference on, listener still). */
export function useUiRest(playing: boolean): boolean {
  const pref = useUiRestPreference();
  const armed = playing && pref;
  const [resting, setResting] = useState(false);

  useEffect(() => {
    if (!armed) {
      const id = window.setTimeout(() => setResting(false), 0);
      return () => window.clearTimeout(id);
    }
    let timer = window.setTimeout(() => setResting(true), UI_REST.IDLE_MS);
    const wake = () => {
      setResting(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setResting(true), UI_REST.IDLE_MS);
    };
    const events = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'focusin'] as const;
    events.forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, wake));
    };
  }, [armed]);

  return armed && resting;
}
