import { describe, it, expect } from 'vitest';
import { EFFECT_DEFAULTS } from '../constants';
import { DEFAULT_EFFECT_PREFS, loadEffectPrefs, saveEffectPrefs, settingsFromPrefs } from './effectPrefs';

describe('effectPrefs', () => {
  it('defaults to the untouched track when nothing is stored', () => {
    expect(loadEffectPrefs()).toEqual(DEFAULT_EFFECT_PREFS);
    expect(settingsFromPrefs(loadEffectPrefs())).toEqual({ mode: 'none', speedMultiplier: 1, reverbAmount: 0 });
  });

  it('round-trips a saved console', () => {
    const prefs = { ...DEFAULT_EFFECT_PREFS, mode: 'bass-boost' as const, bassBoostIntensity: 0.8, enableBeats: true };
    saveEffectPrefs(prefs);
    expect(loadEffectPrefs()).toEqual(prefs);
  });

  it('falls back per field and clamps out-of-range values', () => {
    localStorage.setItem(
      EFFECT_DEFAULTS.STORAGE_KEY,
      JSON.stringify({ mode: 'bogus', slowSpeed: 5, reverbAmount: 'loud', rotationSpeed: 1 }),
    );
    const prefs = loadEffectPrefs();
    expect(prefs.mode).toBe('none');
    expect(prefs.slowSpeed).toBe(EFFECT_DEFAULTS.SLOW_REVERB.SPEED_MAX);
    expect(prefs.reverbAmount).toBe(EFFECT_DEFAULTS.SLOW_REVERB.REVERB_DEFAULT);
    expect(prefs.rotationSpeed).toBe(1);
  });

  it('survives corrupt storage', () => {
    localStorage.setItem(EFFECT_DEFAULTS.STORAGE_KEY, '{not json');
    expect(loadEffectPrefs()).toEqual(DEFAULT_EFFECT_PREFS);
  });
});
