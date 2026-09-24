import { SCENE_WORLD } from '../../../constants';
import type { NodTiming } from './gridFollower';

/**
 * The head nod's envelope, drawn from where the music sits between two beats.
 * A head doesn't jolt after the hit - it moves into it: the envelope rises
 * just before each beat, peaks on it and settles over the following part of
 * the beat, all on smooth (Gaussian) curves - no edge, no step, however the
 * frames fall. Each side is scaled by its beat's strength, so the nods grow
 * in with the drums and fade at a breakdown. The present pass turns it into
 * parallax (near things rise more than far ones) and a hair of zoom, after the
 * temporal accumulation so nothing smears.
 */

export interface BeatCrop {
  /** Advance by dt seconds; `playing` (0..1) fades the nod out when the music stops. */
  update(dt: number, timing: NodTiming | null, playing: number): number;
  /** 0..1 nod envelope. */
  readonly nod: number;
}

/** The envelope of one beat at `from` seconds from it (negative: before), for a beat period. */
export function nodShape(from: number, period: number): number {
  const C = SCENE_WORLD.BEAT_CROP;
  const width = period * (from < 0 ? C.RISE_PERIODS : C.SETTLE_PERIODS);
  return Math.exp(-((from / width) ** 2));
}

export function createBeatCrop(): BeatCrop {
  let nod = 0;
  let live = 0;

  return {
    get nod() {
      return nod;
    },
    update(dt, timing, playing) {
      // Music stopping (pause, end) lets the head come to rest instead of freezing mid-nod.
      live += (Math.min(1, Math.max(0, playing)) - live) * Math.min(1, dt / SCENE_WORLD.BEAT_CROP.REST_SECONDS);
      if (!timing || !(timing.period > 0)) {
        nod = 0;
        return nod;
      }
      const after = timing.prevStrength * nodShape(timing.sincePrev, timing.period);
      const before = timing.nextStrength * nodShape(-timing.untilNext, timing.period);
      nod = Math.max(after, before) * live;
      return nod;
    },
  };
}
