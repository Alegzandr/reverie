import { SCENE_WORLD } from '../../../constants';
import type { BeatClockFrame } from './beatClock';

/**
 * The head nod: on each of the beat clock's nods an envelope dips in and eases
 * back before the next one, scaled by how sure the clock is of the pulse (so it
 * grows in with the groove and fades at a breakdown). The worlds read it as
 * `uNod` and move their near layers more than the far ones (the parallax); the
 * present pass adds a hair of zoom on top, after the temporal accumulation so
 * the TAA history never sees it.
 */

export interface BeatCrop {
  /** Advance by dt seconds with the clock's frame; returns the zoom (>= 1). */
  update(dt: number, clock: BeatClockFrame): number;
  readonly zoom: number;
  /** 0..1 nod envelope, for the worlds' parallax. */
  readonly nod: number;
}

/** Eased both ways: a head accelerates into a nod and settles out of it - no hard edges. */
const easeInOut = (x: number) => x * x * (3 - 2 * x);

export function createBeatCrop(): BeatCrop {
  const C = SCENE_WORLD.BEAT_CROP;
  let zoom = 1;
  /** Seconds since the current nod started (large when none is running). */
  let sinceNod = Infinity;
  let from = 0;
  let peak = 0;
  let envelope = 0;

  return {
    get zoom() {
      return zoom;
    },
    get nod() {
      return envelope;
    },
    update(dt, clock) {
      if (clock.nod && clock.confidence > 0) {
        from = envelope;
        peak = clock.confidence;
        sinceNod = 0;
      } else {
        sinceNod += dt;
      }
      if (sinceNod < C.ATTACK_SECONDS) {
        envelope = from + (peak - from) * easeInOut(sinceNod / C.ATTACK_SECONDS);
      } else {
        const x = Math.min(1, (sinceNod - C.ATTACK_SECONDS) / (clock.period * C.RELEASE_PERIODS));
        envelope = peak * (1 - easeInOut(x));
      }
      zoom = 1 + C.NOD_ZOOM * envelope;
      return zoom;
    },
  };
}
