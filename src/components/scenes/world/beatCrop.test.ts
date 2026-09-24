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
  it('peaks on the beat and falls off both ways, faster before than after', () => {
    expect(nodShape(0, PERIOD)).toBe(1);
    const before = nodShape(-0.05, PERIOD);
    const after = nodShape(0.05, PERIOD);
    expect(before).toBeLessThan(1);
    expect(after).toBeGreaterThan(before);
  });
});

describe('createBeatCrop', () => {
  it('peaks on each beat and rests between them', () => {
    const crop = playing();
    expect(crop.update(DT, at(PERIOD), 1)).toBeCloseTo(1, 1);
    expect(crop.update(DT, at(PERIOD * 1.5), 1)).toBeLessThan(0.1);
  });

  it('starts moving before the beat - into the hit, not after it', () => {
    const crop = playing();
    const lead = PERIOD * SCENE_WORLD.BEAT_CROP.RISE_PERIODS;
    expect(crop.update(DT, at(PERIOD - lead), 1)).toBeGreaterThan(0.3);
  });

  it('moves smoothly: no frame-to-frame jump anywhere in the beat', () => {
    const crop = playing();
    let prev = crop.update(DT, at(0), 1);
    for (let t = DT; t < PERIOD * 3; t += DT) {
      const v = crop.update(DT, at(t), 1);
      expect(Math.abs(v - prev)).toBeLessThan(0.35);
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
