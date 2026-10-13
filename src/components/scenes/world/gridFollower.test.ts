import { describe, expect, it } from 'vitest';
import type { BeatGrid } from '../../../utils/beatGrid';
import { createPlayhead, gridTiming, type NodTiming } from './gridFollower';

const grid: BeatGrid = {
  times: Float64Array.from({ length: 20 }, (_, i) => 1 + i * 0.5),
  strength: Float32Array.from({ length: 20 }, (_, i) => (i < 10 ? 1 : 0.25)),
  period: 0.5,
};
const out = (): NodTiming => ({ sincePrev: 0, untilNext: 0, prevStrength: 0, nextStrength: 0, period: 0 });

describe('gridTiming', () => {
  it('places the playhead between its two beats', () => {
    const t = gridTiming(grid, 2.1, out());
    expect(t.sincePrev).toBeCloseTo(0.1, 9);
    expect(t.untilNext).toBeCloseTo(0.4, 9);
    expect(t.period).toBe(0.5);
  });

  it('carries the strength of each side', () => {
    const t = gridTiming(grid, 5.75, out());
    expect(t.prevStrength).toBe(1);
    expect(t.nextStrength).toBe(0.25);
  });

  it('counts a playhead exactly on a beat as just past it', () => {
    const t = gridTiming(grid, 3, out());
    expect(t.sincePrev).toBe(0);
    expect(t.untilNext).toBeCloseTo(0.5, 9);
  });

  it('has no beat before the first one or after the last', () => {
    const early = gridTiming(grid, 0.2, out());
    expect(early.sincePrev).toBe(Infinity);
    expect(early.prevStrength).toBe(0);
    const late = gridTiming(grid, 30, out());
    expect(late.untilNext).toBe(Infinity);
    expect(late.nextStrength).toBe(0);
  });
});

describe('createPlayhead', () => {
  const DT = 1 / 60;

  it('glides through a clock that ticks in coarse steps', () => {
    const playhead = createPlayhead();
    const STEP = 0.01;
    let worst = 0;
    for (let i = 0; i < 600; i += 1) {
      const t = i * DT;
      const smooth = playhead.update(DT, Math.floor(t / STEP) * STEP);
      if (i > 120) worst = Math.max(worst, Math.abs(smooth - (t - STEP / 2)));
    }
    expect(worst).toBeLessThan(STEP / 3);
  });

  it('learns a playback speed other than 1', () => {
    const playhead = createPlayhead();
    let smooth = 0;
    for (let i = 0; i < 600; i += 1) smooth = playhead.update(DT, i * DT * 1.25);
    expect(smooth).toBeCloseTo(599 * DT * 1.25, 2);
  });

  it('takes a seek at once', () => {
    const playhead = createPlayhead();
    for (let i = 0; i < 60; i += 1) playhead.update(DT, i * DT);
    expect(playhead.update(DT, 42)).toBe(42);
  });

  it('picks the music straight back up after a pause', () => {
    const playhead = createPlayhead();
    let t = 0;
    for (let i = 0; i < 300; i += 1) {
      t += DT;
      playhead.update(DT, t);
    }
    // A second paused: the reported position holds still.
    let held = 0;
    for (let i = 0; i < 60; i += 1) held = playhead.update(DT, t);
    expect(held).toBe(t);
    expect(playhead.speed).toBeCloseTo(1, 1);
    let worst = 0;
    for (let i = 0; i < 60; i += 1) {
      t += DT;
      worst = Math.max(worst, Math.abs(playhead.update(DT, t) - t));
    }
    expect(worst).toBeLessThan(0.01);
  });

  it('adopts a speed change instead of trailing behind it', () => {
    const playhead = createPlayhead();
    let t = 0;
    for (let i = 0; i < 300; i += 1) {
      t += DT;
      playhead.update(DT, t);
    }
    let worstLate = 0;
    for (let i = 0; i < 120; i += 1) {
      t += DT * 1.5;
      const err = Math.abs(playhead.update(DT, t) - t);
      if (i > 30) worstLate = Math.max(worstLate, err);
    }
    expect(playhead.speed).toBeCloseTo(1.5, 1);
    expect(worstLate).toBeLessThan(0.01);
  });

  it('forgets everything on reset', () => {
    const playhead = createPlayhead();
    for (let i = 0; i < 60; i += 1) playhead.update(DT, i * DT);
    playhead.reset();
    expect(playhead.update(DT, 0.1)).toBe(0.1);
  });
});
