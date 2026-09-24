import { describe, expect, it } from 'vitest';
import { SCENE_WORLD } from '../../../constants';
import { createBeatCrop, type BeatCrop } from './beatCrop';

const C = SCENE_WORLD.BEAT_CROP;
const DT = 1 / 60;
const NO_KICK = 1e3;

/** Plays `seconds` at 60 fps with a kick every `gap` seconds (none when omitted); returns the zoom trace. */
function play(crop: BeatCrop, seconds: number, gap?: number, bass = 0.7, playing = 1): number[] {
  const zooms: number[] = [];
  let age = NO_KICK;
  for (let t = 0; t < seconds; t += DT) {
    age = gap !== undefined && age >= gap ? 0 : Math.min(NO_KICK, age + DT);
    zooms.push(crop.update(DT, age, bass, playing).zoom);
  }
  return zooms;
}

describe('createBeatCrop', () => {
  it('rests at the plain frame without music', () => {
    const crop = createBeatCrop();
    play(crop, 1, 0.5, 0.7, 0);
    expect(crop.frame).toEqual({ zoom: 1, panX: 0, panY: 0 });
  });

  it('does not read the feed\'s initial "no kick" age as a hit', () => {
    const crop = createBeatCrop();
    const zooms = play(crop, 0.3);
    expect(Math.max(...zooms)).toBeCloseTo(1 + C.REST_ZOOM, 6);
  });

  it('snaps in on a kick, then settles back to the resting crop', () => {
    const crop = createBeatCrop();
    play(crop, 0.1);
    crop.update(DT, 0, 1, 1);
    const trace = play(crop, 1);
    const peak = Math.max(...trace);
    expect(peak).toBeGreaterThan(1 + C.REST_ZOOM + C.PUNCH_ZOOM * 0.8);
    expect(peak).toBeLessThanOrEqual(1 + C.REST_ZOOM + C.PUNCH_ZOOM + 1e-9);
    expect(trace.indexOf(peak) * DT).toBeLessThanOrEqual(C.ATTACK_SECONDS + DT);
    expect(trace[trace.length - 1]).toBeCloseTo(1 + C.REST_ZOOM, 6);
  });

  it('punches softer when kicks come dense', () => {
    const calm = Math.max(...play(createBeatCrop(), 4, 0.5).slice(-60));
    const dense = Math.max(...play(createBeatCrop(), 4, 0.22).slice(-60));
    expect(dense).toBeLessThan(calm);
  });

  it('keeps the crop window inside the magnified frame', () => {
    const crop = createBeatCrop();
    for (let i = 0; i < 400; i += 1) {
      const f = crop.update(DT, i % 20 === 0 ? 0 : (i % 20) * DT, 1, 1);
      const margin = (1 - 1 / f.zoom) / 2;
      expect(Math.abs(f.panX)).toBeLessThanOrEqual(margin);
      expect(Math.abs(f.panY)).toBeLessThanOrEqual(margin);
    }
  });

  it('alternates the slide side from one kick to the next', () => {
    const crop = createBeatCrop();
    play(crop, 0.1);
    crop.update(DT, 0, 1, 1);
    play(crop, 0.4);
    const first = Math.sign(crop.frame.panX);
    crop.update(DT, 0, 1, 1);
    play(crop, 0.4);
    expect(Math.sign(crop.frame.panX)).toBe(-first);
  });
});
