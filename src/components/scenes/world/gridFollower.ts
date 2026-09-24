import type { BeatGrid } from '../../../utils/beatGrid';
import type { BeatClockFrame } from './beatClock';

/**
 * Plays a track's beat grid against the playhead: a nod fires on the frame the
 * (led) playhead crosses a grid time. The playhead is in source-audio seconds,
 * so a speed change stretches the nods with the music; a seek or a new track
 * re-aims at the next beat without firing the ones jumped over, and a paused
 * playhead fires nothing.
 */

export interface GridFollower {
  /** `lead`: seconds of source audio to fire ahead, so the nod peaks as the hit is heard. */
  update(grid: BeatGrid, position: number, lead: number): BeatClockFrame;
}

/** A playhead move larger than a frame's worth of playback: a seek, not play. */
const SEEK_JUMP_SECONDS = 0.5;

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

export function createGridFollower(): GridFollower {
  let current: BeatGrid | null = null;
  let next = 0;
  let last = 0;
  const frame: BeatClockFrame = { nod: false, confidence: 0, period: 0.5 };

  return {
    update(grid, position, lead) {
      frame.nod = false;
      frame.period = grid.period || frame.period;
      const look = position + lead;
      const step = position - last;
      if (grid !== current || step < 0 || step > SEEK_JUMP_SECONDS) {
        current = grid;
        next = firstAfter(grid.times, look);
      } else if (step > 0) {
        let fired = -1;
        while (next < grid.times.length && grid.times[next] <= look) fired = next++;
        if (fired >= 0) {
          frame.nod = true;
          frame.confidence = grid.strength[fired];
        }
      }
      last = position;
      return frame;
    },
  };
}
