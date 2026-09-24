import { describe, expect, it } from 'vitest';
import { SCENE_WORLD } from '../../../constants';
import { createBeatCrop, nodShape } from './beatCrop';
import type { NodTiming } from './gridFollower';

const DT = 1 / 60;
const PERIOD = 0.7;

/** Timing at `t` seconds on a steady grid (beats at 0, PERIOD, 2 PERIOD, ...). */
const at = (t: number, strength = 1): NodTiming => {
  const since = ((t % PERIOD) + PERIOD) % PERIOD;
  return { sincePrev: since, untilNext: PERIOD - since, prevStrength: strength, nextStrength: strength, period: PERIOD };
};

/** A playing crop, warmed up so the rest fade is out of the way. */
function playing() {
  const crop = createBeatCrop();
  for (let i = 0; i < 120; i += 1) crop.update(DT, at(0.35), 1);
  return crop;
}

describe('nodShape', () => {
  it('peaks on the beat and settles longer than it winds up', () => {
    expect(nodShape(at(0))).toBe(1);
    const windUp = nodShape(at(PERIOD - 0.1));
    const settle = nodShape(at(0.1));
    expect(windUp).toBeLessThan(1);
    expect(settle).toBeGreaterThan(windUp);
  });

  it('never rests between beats: it only touches 0 at the turn', () => {
    const turn = PERIOD * SCENE_WORLD.BEAT_CROP.SETTLE_SHARE;
    expect(nodShape(at(turn))).toBeCloseTo(0, 6);
    expect(nodShape(at(turn - 0.05))).toBeGreaterThan(0);
    expect(nodShape(at(turn + 0.05))).toBeGreaterThan(0);
  });

  it('only sways within a beat of the grid across a gap', () => {
    const gap = { sincePrev: 2, untilNext: 3, prevStrength: 1, nextStrength: 1, period: PERIOD };
    expect(nodShape(gap)).toBe(0);
    expect(nodShape({ ...gap, sincePrev: Infinity, untilNext: 0.05 })).toBeGreaterThan(0.9);
  });
});

describe('createBeatCrop', () => {
  it('peaks on each beat and rests between them', () => {
    const crop = playing();
    expect(crop.update(DT, at(PERIOD), 1)).toBeCloseTo(1, 1);
    const turn = PERIOD * SCENE_WORLD.BEAT_CROP.SETTLE_SHARE;
    expect(crop.update(DT, at(PERIOD + turn), 1)).toBeLessThan(0.01);
  });

  it('starts moving before the beat - into the hit, not after it', () => {
    const crop = playing();
    expect(crop.update(DT, at(PERIOD - 0.05), 1)).toBeGreaterThan(0.8);
  });

  it('moves smoothly: no frame-to-frame jump anywhere in the beat', () => {
    const crop = playing();
    let prev = crop.update(DT, at(0), 1);
    for (let t = DT; t < PERIOD * 3; t += DT) {
      const v = crop.update(DT, at(t), 1);
      expect(Math.abs(v - prev)).toBeLessThan(0.15);
      prev = v;
    }
  });

  it('scales each nod by its beat strength', () => {
    const crop = playing();
    expect(crop.update(DT, at(PERIOD, 0.4), 1)).toBeCloseTo(0.4, 1);
  });

  it('comes to rest when the music stops, and is still without timing', () => {
    const crop = playing();
    for (let i = 0; i < 120; i += 1) crop.update(DT, at(PERIOD), 0);
    expect(crop.nod).toBeLessThan(0.01);
    expect(createBeatCrop().update(DT, null, 1)).toBe(0);
  });
});
