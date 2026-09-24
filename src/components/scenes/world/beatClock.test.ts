import { describe, expect, it } from 'vitest';
import { SCENE_WORLD } from '../../../constants';
import { createBeatClock } from './beatClock';

const DT = 1 / 60;
const BANDS = SCENE_WORLD.BANDS;

/** Deterministic pseudo-random (the tests must not flake). */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Plays `seconds` of synthetic bands: `hitAt(t)` returns the energy of a
 * broadband hit starting at t (a drum), decaying over ~120 ms; `tone` adds a
 * narrow sustained note that changes pitch every `toneEvery` seconds.
 */
function play(seconds: number, hitAt: (t: number) => boolean, opts: { level?: number; tones?: boolean } = {}) {
  const clock = createBeatClock();
  const bands = new Float32Array(BANDS);
  const rand = rng(7);
  const nods: number[] = [];
  let lastHit = -1;
  let note = 20;
  let confidence = 0;
  let period = 0;
  for (let i = 0; i < seconds * 60; i += 1) {
    const t = i * DT;
    if (hitAt(t)) lastHit = t;
    const hit = lastHit >= 0 ? Math.exp(-(t - lastHit) / 0.12) : 0;
    if (opts.tones && rand() < 0.03) note = 4 + Math.floor(rand() * 40);
    for (let b = 0; b < BANDS; b += 1) {
      bands[b] = 0.15 + 0.05 * rand() + hit * 0.7 + (opts.tones && Math.abs(b - note) < 2 ? 0.7 : 0);
    }
    const frame = clock.update(DT, bands, opts.level ?? 0.5);
    if (frame.nod) nods.push(t);
    confidence = frame.confidence;
    period = frame.period;
  }
  return { nods, confidence, period };
}

/** A hit on each frame that crosses a multiple of `beat` seconds (offset `phase`). */
const every = (beat: number, phase = 0) => (t: number) => Math.floor((t - phase) / beat) !== Math.floor((t - phase - DT) / beat);

describe('createBeatClock', () => {
  it('locks onto a steady groove and nods on its beat', () => {
    const { nods, confidence, period } = play(12, every(0.5, 0.2));
    expect(period).toBeCloseTo(0.5, 1);
    expect(confidence).toBeGreaterThan(0.8);
    // Nods lead the hit by NOD_LEAD so the motion peaks on it.
    const lead = SCENE_WORLD.BEAT_CLOCK.NOD_LEAD_SECONDS;
    const late = nods.filter((t) => t > 6);
    expect(late.length).toBeGreaterThan(10);
    for (const t of late) {
      const offBeat = (((t + lead - 0.2) % 0.5) + 0.5) % 0.5;
      expect(Math.min(offBeat, 0.5 - offBeat)).toBeLessThan(0.04);
    }
  });

  it('nods every other beat at drum-and-bass tempos', () => {
    const { period, confidence } = play(12, every(60 / 174));
    expect(confidence).toBeGreaterThan(0.6);
    expect(period).toBeCloseTo((60 / 174) * 2, 1);
  });

  it('keeps its confidence low on sparse, irregular notes (no drums)', () => {
    const rand = rng(3);
    const { confidence } = play(15, () => rand() < 0.012, { tones: true });
    expect(confidence).toBeLessThan(0.3);
  });

  it('trusts nothing in near-silence', () => {
    const { confidence } = play(8, every(0.5), { level: 0.01 });
    expect(confidence).toBe(0);
  });
});
