import { describe, expect, it } from 'vitest';
import { BEAT_GRID } from '../constants';
import { analyzeBeatGrid } from './beatGrid';

const SR = 22050;

/** Deterministic pseudo-random (the tests must not flake). */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296 - 0.5;
  };
}

/** Fades a sound out over its last 20 ms: a hard cut is a click, and a click is a hit. */
const tail = (t: number, seconds: number) => Math.min(1, (seconds - t) / 0.02);

/** A kick: a pitch-dropping sine burst plus a click of noise, ~150 ms. */
function addKick(out: Float32Array, at: number, rand: () => number) {
  const start = Math.round(at * SR);
  for (let i = 0; i < SR * 0.15 && start + i < out.length; i += 1) {
    const t = i / SR;
    const env = Math.exp(-t * 30) * tail(t, 0.15);
    out[start + i] += 0.8 * env * Math.sin(2 * Math.PI * (50 + 120 * Math.exp(-t * 40)) * t) + 0.3 * Math.exp(-t * 200) * rand();
  }
}

/** A held note: a few harmonics, slow decay; `attack` in seconds (5 ms: piano-ish, longer: a pad). */
function addNote(out: Float32Array, at: number, hz: number, seconds: number, attack = 0.005) {
  const start = Math.round(at * SR);
  for (let i = 0; i < SR * seconds && start + i < out.length; i += 1) {
    const t = i / SR;
    const env = Math.min(1, t / attack) * Math.exp(-t * 1.5) * tail(t, seconds);
    let v = 0;
    for (let h = 1; h <= 4; h += 1) v += Math.sin(2 * Math.PI * hz * h * t) / h;
    out[start + i] += 0.25 * env * v;
  }
}

describe('analyzeBeatGrid', () => {
  it('finds a drum groove: its tempo, its hits, and full strength', () => {
    const rand = rng(1);
    const audio = new Float32Array(SR * 20);
    for (let t = 0.25; t < 20; t += 0.6) addKick(audio, t, rand);
    for (let i = 0; i < audio.length; i += 1) audio[i] += 0.01 * rand();
    const grid = analyzeBeatGrid(audio, SR);
    expect(grid.period).toBeCloseTo(0.6, 1);
    const late = [...grid.times].filter((t) => t > 5 && t < 18);
    expect(late.length).toBeGreaterThan(15);
    for (const t of late) {
      const off = (((t - 0.25) % 0.6) + 0.6) % 0.6;
      expect(Math.min(off, 0.6 - off)).toBeLessThan(0.04);
    }
    const strong = [...grid.strength].filter((_, i) => grid.times[i] > 5 && grid.times[i] < 18);
    expect(Math.min(...strong)).toBeGreaterThan(0.8);
  });

  it('keeps full strength when the hits sit in digital silence', () => {
    const rand = rng(4);
    const audio = new Float32Array(SR * 16);
    for (let t = 0.3; t < 16; t += 60 / 95) addKick(audio, t, rand);
    const grid = analyzeBeatGrid(audio, SR);
    const mid = [...grid.strength].filter((_, i) => grid.times[i] > 4 && grid.times[i] < 12);
    expect(Math.min(...mid)).toBeGreaterThan(0.8);
  });

  it('nods every other beat at fast tempos', () => {
    const rand = rng(2);
    const audio = new Float32Array(SR * 16);
    const beat = 60 / 174;
    for (let t = 0.1; t < 16; t += beat) addKick(audio, t, rand);
    const grid = analyzeBeatGrid(audio, SR);
    expect(grid.period).toBeCloseTo(beat * 2, 1);
    expect(grid.period).toBeGreaterThanOrEqual(BEAT_GRID.NOD_MIN_PERIOD);
  });

  it('gives a ballad of held notes (no drums) no strength', () => {
    const audio = new Float32Array(SR * 20);
    const notes = [110, 146.8, 164.8, 196, 220, 130.8];
    for (let k = 0; k * 0.75 < 19; k += 1) addNote(audio, k * 0.75, notes[k % notes.length], 1.6);
    const grid = analyzeBeatGrid(audio, SR);
    const mid = [...grid.strength].filter((_, i) => grid.times[i] > 4 && grid.times[i] < 16);
    expect(Math.max(0, ...mid)).toBeLessThan(0.2);
  });

  it('stops the nods where the drums drop out', () => {
    const rand = rng(3);
    const audio = new Float32Array(SR * 24);
    for (let t = 0.2; t < 10; t += 0.5) addKick(audio, t, rand);
    for (let t = 16.2; t < 24; t += 0.5) addKick(audio, t, rand);
    for (let k = 0; k * 0.5 < 24; k += 1) addNote(audio, k * 0.5, 440, 0.9, 0.08);
    const grid = analyzeBeatGrid(audio, SR);
    const gap = [...grid.strength].filter((_, i) => grid.times[i] > 11.5 && grid.times[i] < 14.5);
    const groove = [...grid.strength].filter((_, i) => grid.times[i] > 3 && grid.times[i] < 8);
    expect(Math.max(0, ...gap)).toBeLessThan(0.2);
    expect(Math.min(...groove)).toBeGreaterThan(0.6);
  });

  it('returns an empty grid for audio too short to judge', () => {
    const grid = analyzeBeatGrid(new Float32Array(SR), SR);
    expect(grid.times.length).toBe(0);
  });
});
