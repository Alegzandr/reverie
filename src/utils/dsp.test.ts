import { describe, it, expect } from 'vitest';
import { computeEffectParams, HIGHPASS_BYPASS_HZ, underwaterCutoffHz, reverbMakeupGain, bassBoostTrimGain } from './dsp';
import { AUDIO_EFFECTS, AUDIO_SIGNAL, EFFECT_DEFAULTS } from '../constants';

const SAMPLE_RATE = 48000;
const base = { speedMultiplier: 1, reverbAmount: 0 };

describe('computeEffectParams', () => {
  it('leaves every filter at an exact bypass when no effect is on', () => {
    const p = computeEffectParams(base, SAMPLE_RATE);
    expect(p.highpassHz).toBe(HIGHPASS_BYPASS_HZ);
    expect(p.lowpassHz).toBe(SAMPLE_RATE / 2);
    expect(p.lowpassLfoDepthHz).toBe(0);
    expect(p.lowshelfGainDb).toBe(0);
    expect(p.peakGainDb).toBe(-0);
    expect(p.dryGain).toBe(1);
    expect(p.wetGain).toBe(0);
    expect(p.pannedGain).toBe(1);
    expect(p.panDepth).toBe(0);
    expect(p.bedGain).toBe(0);
    expect(p.reverbAudible).toBe(false);
  });

  it('engages the rumble highpass only in bass-boost mode', () => {
    const p = computeEffectParams({ ...base, bassBoost: true, bassBoostIntensity: 0 }, SAMPLE_RATE);
    expect(p.highpassHz).toBe(AUDIO_EFFECTS.BASS_BOOST.HIGHPASS_FREQUENCY_HZ);
    // Underwater at 0 keeps the lowpass out of the way even in bass mode.
    expect(p.lowpassHz).toBe(SAMPLE_RATE / 2);
  });

  it('scales the bass shelf, cut and trim with intensity', () => {
    const p = computeEffectParams({ ...base, bassBoost: true, bassBoostIntensity: 0.5 }, SAMPLE_RATE);
    expect(p.lowshelfGainDb).toBeCloseTo(0.5 * AUDIO_EFFECTS.BASS_BOOST.LOWSHELF_MAX_GAIN_DB);
    expect(p.peakGainDb).toBeCloseTo(-0.5 * AUDIO_EFFECTS.BASS_BOOST.PEAKING_MAX_CUT_DB);
    expect(p.dryGain).toBeCloseTo(bassBoostTrimGain(0.5));
  });

  it('ignores bass settings outside bass-boost mode', () => {
    const p = computeEffectParams({ ...base, bassBoost: false, bassBoostIntensity: 1, bassUnderwater: 1 }, SAMPLE_RATE);
    expect(p.lowshelfGainDb).toBe(0);
    expect(p.lowpassHz).toBe(SAMPLE_RATE / 2);
  });

  it('closes the underwater lowpass along the shared curve', () => {
    const p = computeEffectParams({ ...base, bassBoost: true, bassBoostIntensity: 0, bassUnderwater: 0.5 }, SAMPLE_RATE);
    const cutoff = underwaterCutoffHz(0.5);
    expect(p.lowpassHz).toBeCloseTo(cutoff);
    expect(p.lowpassLfoDepthHz).toBeCloseTo(cutoff * AUDIO_EFFECTS.BASS_BOOST.UNDERWATER_LFO_DEPTH_RATIO * 0.5);
  });

  it('splits dry/wet with makeup gain', () => {
    const p = computeEffectParams({ ...base, reverbAmount: 0.6 }, SAMPLE_RATE);
    const makeup = reverbMakeupGain(0.6);
    expect(p.dryGain).toBeCloseTo((1 - 0.6 * AUDIO_EFFECTS.REVERB.WET_RATIO) * makeup);
    expect(p.wetGain).toBeCloseTo(0.6 * AUDIO_EFFECTS.REVERB.WET_RATIO * makeup);
    expect(p.reverbAudible).toBe(true);
  });

  it('orbits the dry share and keeps the bed for 8D', () => {
    const p = computeEffectParams({ ...base, audio8D: true, rotationSpeed: 0.8 }, SAMPLE_RATE);
    expect(p.pannedGain).toBe(AUDIO_SIGNAL.EIGHT_D_MIX.DRY_GAIN);
    expect(p.bedGain).toBe(AUDIO_SIGNAL.EIGHT_D_MIX.WET_GAIN);
    expect(p.panDepth).toBe(1);
    expect(p.rotationHz).toBeCloseTo(0.8 / AUDIO_EFFECTS.EIGHT_D.SECONDS_PER_ROTATION);
  });

  it('falls back to the default rotation speed', () => {
    const p = computeEffectParams({ ...base, audio8D: true }, SAMPLE_RATE);
    expect(p.rotationHz).toBeCloseTo(
      EFFECT_DEFAULTS.EIGHT_D_AUDIO.ROTATION_DEFAULT / AUDIO_EFFECTS.EIGHT_D.SECONDS_PER_ROTATION,
    );
  });
});
