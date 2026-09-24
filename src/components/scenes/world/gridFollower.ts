import { SCENE_WORLD } from '../../../constants';
import type { BeatGrid } from '../../../utils/beatGrid';

/**
 * Where the playhead sits between two beats: what the nod's shape is drawn
 * from. Both the track's beat grid and the live clock produce it.
 */
export interface NodTiming {
  /** Seconds since the last beat (Infinity when there is none). */
  sincePrev: number;
  /** Seconds to the next beat (Infinity when there is none). */
  untilNext: number;
  /** 0..1 strengths of those two beats (how much each one nods). */
  prevStrength: number;
  nextStrength: number;
  /** Seconds between beats. */
  period: number;
}

/** Index of the first grid time strictly after t. */
function firstAfter(times: Float64Array, t: number): number {
  let lo = 0;
  let hi = times.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The grid read at a playhead position (source-audio seconds). Stateless: a
 * seek, a speed change or a new track needs no bookkeeping, and a paused
 * playhead simply holds still.
 */
export function gridTiming(grid: BeatGrid, position: number, out: NodTiming): NodTiming {
  const next = firstAfter(grid.times, position);
  const prev = next - 1;
  out.sincePrev = prev >= 0 ? position - grid.times[prev] : Infinity;
  out.untilNext = next < grid.times.length ? grid.times[next] - position : Infinity;
  out.prevStrength = prev >= 0 ? grid.strength[prev] : 0;
  out.nextStrength = next < grid.times.length ? grid.strength[next] : 0;
  out.period = grid.period;
  return out;
}

export interface Playhead {
  /** Advance by dt seconds towards the reported position; returns the smoothed one. */
  update(dt: number, reported: number): number;
}

/**
 * The playhead as the nod reads it. The reported position moves in coarse,
 * uneven steps (the audio clock ticks per hardware buffer, and the tick that
 * publishes it runs on its own frame loop), which a sway at a fraction of a
 * beat turns into visible stutter. An alpha-beta filter glides through them at
 * the learnt playback speed; a jump far off that path is a seek, taken at once.
 */
export function createPlayhead(): Playhead {
  const C = SCENE_WORLD.BEAT_CROP;
  let position = NaN;
  let speed = 1;
  return {
    update(dt, reported) {
      const predicted = position + speed * dt;
      const error = reported - predicted;
      if (!(Math.abs(error) < C.PLAYHEAD_SNAP_SECONDS)) {
        position = reported;
        return position;
      }
      position = predicted + C.PLAYHEAD_ALPHA * error;
      speed = Math.max(0, speed + (C.PLAYHEAD_BETA * error) / dt);
      return position;
    },
  };
}
