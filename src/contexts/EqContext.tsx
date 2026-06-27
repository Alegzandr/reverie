/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { AUDIO_EFFECTS } from '../constants';
import {
  EQ_PRESETS,
  EQ_FLAT_GAINS,
  EQ_DEFAULT_PRESET,
  EQ_BAND_COUNT,
  presetNameForGains,
} from './eqPresets';

const { GAINS_STORAGE_KEY, PRESET_STORAGE_KEY, GAIN_MIN_DB, GAIN_MAX_DB } = AUDIO_EFFECTS.EQUALIZER;

interface EqContextType {
  /** Current per-band gains in dB, in canonical band order. */
  gains: number[];
  /** Active preset name, or the custom sentinel when hand-tuned. */
  presetName: string;
  /** Apply a named preset's gains wholesale. */
  setPreset: (name: string) => void;
  /** Nudge a single band; flips the active preset to custom unless it still matches one. */
  setBandGain: (index: number, valueDb: number) => void;
  /** Reset every band to 0 dB (the Flat preset). */
  reset: () => void;
}

const EqContext = createContext<EqContextType | undefined>(undefined);

function clampGain(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(GAIN_MIN_DB, Math.min(GAIN_MAX_DB, value));
}

/** A valid 6-length gain array, clamped to range, or null if the input is unusable. */
function sanitizeGains(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length !== EQ_BAND_COUNT) return null;
  if (!raw.every((v) => typeof v === 'number')) return null;
  return raw.map(clampGain);
}

function readInitialGains(): number[] {
  try {
    const stored = sanitizeGains(JSON.parse(localStorage.getItem(GAINS_STORAGE_KEY) ?? 'null'));
    if (stored) return stored;
  } catch {
    // Corrupt/missing — fall through to the default preset.
  }
  const def = EQ_PRESETS.find((p) => p.name === EQ_DEFAULT_PRESET);
  return def ? [...def.gains] : [...EQ_FLAT_GAINS];
}

export function EqProvider({ children }: { children: ReactNode }) {
  const [gains, setGains] = useState<number[]>(readInitialGains);

  // The active preset is derived from the gains, so the picker always reflects
  // whatever the bands actually are (including "custom" after a manual nudge).
  const presetName = useMemo(() => presetNameForGains(gains), [gains]);

  useEffect(() => {
    localStorage.setItem(GAINS_STORAGE_KEY, JSON.stringify(gains));
    localStorage.setItem(PRESET_STORAGE_KEY, presetName);
  }, [gains, presetName]);

  const setPreset = useCallback((name: string) => {
    const preset = EQ_PRESETS.find((p) => p.name === name);
    if (preset) setGains([...preset.gains]);
  }, []);

  const setBandGain = useCallback((index: number, valueDb: number) => {
    setGains((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = [...prev];
      next[index] = clampGain(valueDb);
      return next;
    });
  }, []);

  const reset = useCallback(() => setGains([...EQ_FLAT_GAINS]), []);

  const value = useMemo(
    () => ({ gains, presetName, setPreset, setBandGain, reset }),
    [gains, presetName, setPreset, setBandGain, reset],
  );

  return <EqContext.Provider value={value}>{children}</EqContext.Provider>;
}

export function useEq() {
  const context = useContext(EqContext);
  if (!context) {
    throw new Error('useEq must be used within EqProvider');
  }
  return context;
}
