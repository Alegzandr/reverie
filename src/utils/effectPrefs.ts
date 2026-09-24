import { EFFECT_DEFAULTS } from '../constants';
import type { EffectMode, EffectSettings } from '../components/EffectControls';

/**
 * The whole effect console, not just the active effect: a slider tuned on an
 * effect you then switched away from is still there when you come back to it,
 * across reloads too.
 */
export interface EffectPrefs {
  mode: EffectMode;
  speedUp: number;
  slowSpeed: number;
  reverbAmount: number;
  rotationSpeed: number;
  bassBoostIntensity: number;
  bassUnderwater: number;
  enableBeats: boolean;
  beatsVolume: number;
}

const D = EFFECT_DEFAULTS;
const MODES: readonly EffectMode[] = ['none', 'speed-up', 'slow-reverb', '8d-audio', 'bass-boost'];

export const DEFAULT_EFFECT_PREFS: EffectPrefs = {
  mode: D.MODE_DEFAULT,
  speedUp: D.SPEED_UP.DEFAULT,
  slowSpeed: D.SLOW_REVERB.SPEED_DEFAULT,
  reverbAmount: D.SLOW_REVERB.REVERB_DEFAULT,
  rotationSpeed: D.EIGHT_D_AUDIO.ROTATION_DEFAULT,
  bassBoostIntensity: D.BASS_BOOST_UI.INTENSITY_DEFAULT,
  bassUnderwater: D.BASS_BOOST_UI.UNDERWATER_DEFAULT,
  enableBeats: D.NIGHTCORE_BEATS.ENABLED_DEFAULT,
  beatsVolume: D.NIGHTCORE_BEATS.VOLUME_DEFAULT,
};

// Stored values are untrusted (older builds, hand edits): a bad field falls back
// alone, and ranges are re-clamped so a retuned slider bound can't be exceeded.
function num(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

export function loadEffectPrefs(): EffectPrefs {
  let raw: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(D.STORAGE_KEY) ?? 'null');
    if (parsed && typeof parsed === 'object') raw = parsed as Record<string, unknown>;
  } catch {
    // Storage blocked or corrupt: behave like a first visit.
  }
  if (!raw) return DEFAULT_EFFECT_PREFS;
  const f = DEFAULT_EFFECT_PREFS;
  return {
    mode: MODES.includes(raw.mode as EffectMode) ? (raw.mode as EffectMode) : f.mode,
    speedUp: num(raw.speedUp, f.speedUp, D.SPEED_UP.MIN, D.SPEED_UP.MAX),
    slowSpeed: num(raw.slowSpeed, f.slowSpeed, D.SLOW_REVERB.SPEED_MIN, D.SLOW_REVERB.SPEED_MAX),
    reverbAmount: num(raw.reverbAmount, f.reverbAmount, D.SLOW_REVERB.REVERB_MIN, D.SLOW_REVERB.REVERB_MAX),
    rotationSpeed: num(raw.rotationSpeed, f.rotationSpeed, D.EIGHT_D_AUDIO.ROTATION_MIN, D.EIGHT_D_AUDIO.ROTATION_MAX),
    bassBoostIntensity: num(raw.bassBoostIntensity, f.bassBoostIntensity, D.BASS_BOOST_UI.INTENSITY_MIN, D.BASS_BOOST_UI.INTENSITY_MAX),
    bassUnderwater: num(raw.bassUnderwater, f.bassUnderwater, D.BASS_BOOST_UI.UNDERWATER_MIN, D.BASS_BOOST_UI.UNDERWATER_MAX),
    enableBeats: typeof raw.enableBeats === 'boolean' ? raw.enableBeats : f.enableBeats,
    beatsVolume: num(raw.beatsVolume, f.beatsVolume, D.NIGHTCORE_BEATS.VOLUME_MIN, D.NIGHTCORE_BEATS.VOLUME_MAX),
  };
}

export function saveEffectPrefs(prefs: EffectPrefs): void {
  try {
    localStorage.setItem(D.STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Private mode / quota: the session still works, it just won't be remembered.
  }
}

/** What the engine hears for a given console state (only the active effect's parameters). */
export function settingsFromPrefs(p: EffectPrefs): EffectSettings {
  switch (p.mode) {
    case 'speed-up':
      return { mode: 'speed-up', speedMultiplier: p.speedUp, reverbAmount: 0, enableBeats: p.enableBeats, beatsVolume: p.beatsVolume };
    case 'slow-reverb':
      return { mode: 'slow-reverb', speedMultiplier: p.slowSpeed, reverbAmount: p.reverbAmount };
    case '8d-audio':
      return { mode: '8d-audio', speedMultiplier: 1, reverbAmount: 0, rotationSpeed: p.rotationSpeed };
    case 'bass-boost':
      return {
        mode: 'bass-boost',
        speedMultiplier: 1,
        reverbAmount: 0,
        bassBoostIntensity: p.bassBoostIntensity,
        bassUnderwater: p.bassUnderwater,
      };
    default:
      // Bypass: play the untouched track - no time-stretch, no reverb, no spatialiser.
      return { mode: 'none', speedMultiplier: 1, reverbAmount: 0 };
  }
}
