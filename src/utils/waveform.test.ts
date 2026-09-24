import { describe, it, expect } from 'vitest';
import { normalizeEnvelope, shapeEnvelope } from './waveform';
import { WAVEFORM } from '../constants';
import type { AudioProcessingOptions } from './audioProcessor';

const base: AudioProcessingOptions = {
  speedMultiplier: 1,
  reverbAmount: 0,
};

describe('shapeEnvelope', () => {
  it('returns the source bars unchanged without options or effects', () => {
    const bars = [0.2, 0.4, 0.6];
    expect(shapeEnvelope(bars, null)).toEqual(bars);
    expect(shapeEnvelope(bars, base)).toEqual(bars);
  });

  it('raises amplitude for bass boost (clamped to 1)', () => {
    const bars = [0.3, 0.5, 0.9];
    const out = shapeEnvelope(bars, { ...base, bassBoost: true, bassBoostIntensity: 1 });
    expect(out[0]).toBeGreaterThan(bars[0]);
    expect(out[1]).toBeGreaterThan(bars[1]);
    expect(out.every((v) => v <= 1)).toBe(true);
  });

  it('fills a gap after a peak when reverb is applied (decaying tail)', () => {
    const bars = [0.9, 0, 0, 0];
    const out = shapeEnvelope(bars, { ...base, reverbAmount: 0.8 });
    // The silence right after the peak is lifted by the tail.
    expect(out[1]).toBeGreaterThan(bars[1]);
    // The tail decays over time.
    expect(out[1]).toBeGreaterThan(out[3]);
  });

  it('modulates the envelope for 8D rotation', () => {
    const bars = new Array(16).fill(0.5);
    const out = shapeEnvelope(bars, { ...base, audio8D: true, rotationSpeed: 0.4 });
    expect(Math.max(...out)).toBeGreaterThan(0.5);
    expect(Math.min(...out)).toBeLessThan(0.5);
    expect(out.every((v) => v >= 0 && v <= 1)).toBe(true);
  });
});

describe('normalizeEnvelope', () => {
  it('leaves a silent envelope untouched', () => {
    expect(normalizeEnvelope([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('lifts the peak to the display ceiling and widens a compressed band', () => {
    const bars = [0.55, 0.6, 0.58, 0.7, 0.62, 0.56, 0.68, 0.6, 0.57, 0.66];
    const out = normalizeEnvelope(bars);
    expect(Math.max(...out)).toBeCloseTo(WAVEFORM.NORMALIZED_PEAK);
    const inSpread = Math.max(...bars) - Math.min(...bars);
    const outSpread = Math.max(...out) - Math.min(...out);
    expect(outSpread).toBeGreaterThan(inSpread * 2);
  });

  it('keeps order and holds silence at zero', () => {
    const out = normalizeEnvelope([0, 0.3, 0.5, 0.4, 0]);
    expect(out[0]).toBe(0);
    expect(out[4]).toBe(0);
    expect(out[2]).toBeGreaterThan(out[3]);
    expect(out[3]).toBeGreaterThan(out[1]);
  });
});
