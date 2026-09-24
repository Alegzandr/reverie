import { describe, expect, it } from 'vitest';
import type { BeatGrid } from '../../../utils/beatGrid';
import { gridTiming, type NodTiming } from './gridFollower';

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
