import { SCENE_WORLD } from '../../../constants';
import type { NodTiming } from './gridFollower';

/**
 * The head nod's envelope, drawn from where the music sits between two beats.
 * A head vibing to a groove sways continuously: it lands on the beat (the
 * peak), eases off over most of the beat and winds back into the next one.
 * Both halves are cosine eases, so the motion slows to a stop at the peak and
 * the trough instead of bouncing off them, and it never rests between beats -
 * a nod that snaps up and then waits reads as hopping. The settle is scaled by
 * the beat it leaves, the wind-up by the beat it goes to, so the sway grows in
 * with the drums and fades at a breakdown. The present pass turns it into a
 * zoom from the frame centre (near things swell more than far ones), after
 * the temporal accumulation so nothing smears.
 */

export interface BeatCrop {
  /** Advance by dt seconds; `playing` (0..1) fades the nod out when the music stops. */
  update(dt: number, timing: NodTiming | null, playing: number): number;
  /** 0..1 nod envelope. */
  readonly nod: number;
  /**
   * The timing source is about to change (live clock <-> beat grid): their
   * phases differ, so ease from the current nod into the new one instead of
   * jumping.
   */
  handoff(): void;
}

const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);

/** The sway (0..1) at a point between two beats. */
export function nodShape(timing: NodTiming): number {
  const { sincePrev, untilNext, period } = timing;
  // A gap in the grid (or no beat at all on one side) is longer than a beat:
  // the sway then only spans one period around each beat that exists.
  const span = Math.min(sincePrev + untilNext, period);
  const settle = span * SCENE_WORLD.BEAT_CROP.SETTLE_SHARE;
  const windUp = span - settle;
  if (sincePrev < settle) return timing.prevStrength * ease(1 - sincePrev / settle);
  if (untilNext < windUp) return timing.nextStrength * ease(1 - untilNext / windUp);
  return 0;
}

export function createBeatCrop(): BeatCrop {
  const C = SCENE_WORLD.BEAT_CROP;
  let nod = 0;
  let live = 0;
  /** The nod a handoff eases from, and the seconds of that ease still to run. */
  let handoffFrom = 0;
  let handoffLeft = 0;

  return {
    get nod() {
      return nod;
    },
    handoff() {
      handoffFrom = nod;
      handoffLeft = C.SOURCE_HANDOFF_SECONDS;
    },
    update(dt, timing, playing) {
      // Music stopping (pause, end) lets the head come to rest instead of freezing mid-nod.
      live += (Math.min(1, Math.max(0, playing)) - live) * Math.min(1, dt / C.REST_SECONDS);
      const target = timing && timing.period > 0 ? nodShape(timing) * live : 0;
      if (handoffLeft > 0) {
        handoffLeft = Math.max(0, handoffLeft - dt);
        nod = handoffFrom + (target - handoffFrom) * ease(1 - handoffLeft / C.SOURCE_HANDOFF_SECONDS);
        return nod;
      }
      nod = target;
      return nod;
    },
  };
}
