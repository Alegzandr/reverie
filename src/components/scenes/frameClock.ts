// Shared frame-loop timing for the canvas instruments (waveInstrument,
// SpectrumMeter, SceneAurora).

/**
 * Minimum ms between idle repaints (~30fps). When no audio is driving an
 * instrument, a full display-rate loop buys nothing visible, so the idle
 * paths skip frames younger than this and let the compositor rest.
 */
export const IDLE_FRAME_MS = 33;

/**
 * Minimum ms between live repaints (~120fps). rAF follows the display, and on a
 * 240-480Hz monitor every loop (world shader, CSS audio vars, canvases, clock)
 * would otherwise run 2-4x the work for motion nobody can tell apart.
 */
export const LIVE_FRAME_MS = 1000 / 120;

/** Weight of each new rAF delta in the running refresh-period estimate. */
const PERIOD_EMA = 0.1;
/** rAF deltas above this are stalls (background tab, jank), not the refresh period. */
const PERIOD_OUTLIER_MS = 100;

/**
 * A per-loop frame limiter: `gate(now)` is true when this rAF should draw.
 * The threshold sits half a refresh period under `minFrameMs`, so the loop
 * settles on a whole divisor of the display rate (480Hz → every 4th, 144Hz →
 * every 2nd) - even pacing, no alternating 2/3-frame judder - and a 60Hz
 * display never drops a frame to jitter.
 */
export function createFrameGate(minFrameMs: number = LIVE_FRAME_MS): (now: number) => boolean {
  let lastDraw = -Infinity;
  let prevNow = -1;
  let period = -1;
  return (now) => {
    if (prevNow >= 0) {
      const d = now - prevNow;
      // Seeded by the first real delta so a 480Hz loop is capped from its second frame.
      if (d > 0 && d < PERIOD_OUTLIER_MS) period = period < 0 ? d : period + (d - period) * PERIOD_EMA;
    }
    prevNow = now;
    if (now - lastDraw < minFrameMs - Math.max(period, 0) / 2) return false;
    lastDraw = now;
    return true;
  };
}

/**
 * Real frame delta in seconds, clamped so a background-tab stall can't
 * teleport the physics (max 50ms) and a duplicate timestamp can't zero it
 * (min 1ms). Pass `lastNow < 0` on the first frame to get a 1/60 fallback.
 * Integrating over this keeps motion speed identical at 60, 120 or 144Hz.
 */
export function frameDeltaSeconds(now: number, lastNow: number): number {
  return lastNow < 0 ? 1 / 60 : Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000));
}
