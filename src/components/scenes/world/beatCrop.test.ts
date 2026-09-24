import { describe, expect, it } from 'vitest';
import { SCENE_WORLD } from '../../../constants';
import type { BeatClockFrame } from './beatClock';
import { createBeatCrop } from './beatCrop';

const C = SCENE_WORLD.BEAT_CROP;
const DT = 1 / 60;

const clock = (nod: boolean, confidence = 1, period = 0.5): BeatClockFrame => ({ nod, confidence, period });

describe('createBeatCrop', () => {
  it('rests at the plain frame until the clock nods', () => {
    const crop = createBeatCrop();
    for (let i = 0; i < 60; i += 1) crop.update(DT, clock(false));
    expect(crop.zoom).toBe(1);
    expect(crop.nod).toBe(0);
  });

  it('dips in over the attack, then settles fully before the next beat', () => {
    const crop = createBeatCrop();
    crop.update(DT, clock(true));
    const trace: number[] = [];
    for (let t = DT; t < 0.5; t += DT) {
      crop.update(DT, clock(false));
      trace.push(crop.nod);
    }
    const peakAt = trace.indexOf(Math.max(...trace)) * DT;
    expect(Math.max(...trace)).toBeCloseTo(1, 1);
    expect(peakAt).toBeLessThanOrEqual(C.ATTACK_SECONDS + DT);
    expect(trace[trace.length - 1]).toBe(0);
    expect(crop.zoom).toBe(1);
  });

  it('scales the nod by the clock confidence', () => {
    const crop = createBeatCrop();
    crop.update(DT, clock(true, 0.4));
    for (let t = 0; t < C.ATTACK_SECONDS; t += DT) crop.update(DT, clock(false, 0.4));
    expect(crop.nod).toBeCloseTo(0.4, 2);
    expect(crop.zoom).toBeCloseTo(1 + C.NOD_ZOOM * 0.4, 4);
  });

  it('starts a new nod from wherever the last one was (no jump)', () => {
    const crop = createBeatCrop();
    crop.update(DT, clock(true));
    for (let i = 0; i < 8; i += 1) crop.update(DT, clock(false));
    const before = crop.nod;
    crop.update(DT, clock(true));
    expect(Math.abs(crop.nod - before)).toBeLessThan(0.1);
  });
});
