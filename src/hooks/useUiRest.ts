import { useCallback, useSyncExternalStore } from 'react';
import { UI_REST } from '../constants';

/**
 * The resting interface preference: in fullscreen, after a spell without input,
 * the cockpit steps aside and leaves the world (and a one-line readout) on
 * screen - see useFullscreenAutoHide. Windowed, the interface never rests.
 * Default on; kept in a tiny module-level store shared by the settings toggle
 * and the shell.
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
