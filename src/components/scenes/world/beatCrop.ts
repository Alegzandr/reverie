import { SCENE_WORLD } from '../../../constants';

/**
 * The edit-style "pan crop": the presented frame snaps in on each kick, then
 * settles back with an ease-out while its crop window slides a touch toward
 * the next side, like keyframed zooms laid on a track's hits. Applied after
 * the temporal accumulation (present pass), so the TAA history never sees the
 * motion and nothing ghosts.
 */

export interface BeatCropFrame {
  /** >= 1: how much the frame is magnified around its (panned) centre. */
  zoom: number;
  /** Crop-window centre offset, as a fraction of the frame (always inside the crop margin). */
  panX: number;
  panY: number;
}

export interface BeatCrop {
  /** Advance by dt seconds with the feed's newest kick age, bass energy and playing level. */
  update(dt: number, kickAge: number, bass: number, playing: number): BeatCropFrame;
  frame: BeatCropFrame;
}

/**
 * Where each successive kick nudges the window: alternating sides with a little
 * vertical wander, so consecutive hits read as cuts rather than a wobble.
 */
const PAN_PATH: ReadonlyArray<readonly [number, number]> = [
  [1, 0.35],
  [-1, -0.2],
  [0.85, -0.4],
  [-0.9, 0.3],
];

const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;

export function createBeatCrop(): BeatCrop {
  const C = SCENE_WORLD.BEAT_CROP;
  const frame: BeatCropFrame = { zoom: 1, panX: 0, panY: 0 };
  // Starts below any real age so the feed's initial "no kick yet" isn't read as a hit.
  let lastKickAge = -Infinity;
  /** Seconds since the current punch started (large when none is running). */
  let sincePunch = Infinity;
  let punchFrom = 0;
  let punchPeak = 0;
  let envelope = 0;
  let meanGap: number = C.CALM_GAP_SECONDS;
  let step = 0;
  const panTarget = [0, 0];

  return {
    frame,
    update(dt, kickAge, bass, playing) {
      // A new kick shows up as the newest kick age dropping back toward zero.
      if (kickAge < lastKickAge && playing > 0) {
        // A long pause says nothing about the tempo: cap its weight in the mean.
        if (Number.isFinite(sincePunch)) meanGap += (Math.min(sincePunch, C.CALM_GAP_SECONDS * 2) - meanGap) * C.GAP_SMOOTHING;
        const calm = Math.min(1, Math.max(0, (meanGap - SCENE_WORLD.KICK_MIN_GAP_SECONDS) / (C.CALM_GAP_SECONDS - SCENE_WORLD.KICK_MIN_GAP_SECONDS)));
        const density = C.DENSE_STRENGTH + (1 - C.DENSE_STRENGTH) * calm;
        const strength = Math.min(1, C.STRENGTH_FLOOR + bass * C.STRENGTH_BASS_GAIN) * density;
        punchFrom = envelope;
        // A softer hit landing on a stronger one's tail must not yank the zoom out.
        punchPeak = Math.max(strength, envelope);
        sincePunch = 0;
        const [dx, dy] = PAN_PATH[step % PAN_PATH.length];
        step += 1;
        panTarget[0] = dx * C.PAN * strength;
        panTarget[1] = dy * C.PAN * strength;
      } else {
        sincePunch += dt;
      }
      lastKickAge = kickAge;

      if (sincePunch < C.ATTACK_SECONDS) {
        envelope = punchFrom + (punchPeak - punchFrom) * easeOutCubic(sincePunch / C.ATTACK_SECONDS);
      } else {
        const x = Math.min(1, (sincePunch - C.ATTACK_SECONDS) / C.RELEASE_SECONDS);
        envelope = punchPeak * (1 - x) ** 3;
      }

      const live = Math.min(1, Math.max(0, playing));
      if (live <= 0) {
        panTarget[0] = 0;
        panTarget[1] = 0;
      }
      frame.zoom = 1 + (C.REST_ZOOM + C.PUNCH_ZOOM * envelope) * live;
      const k = Math.min(1, dt * C.PAN_RATE);
      // The window never leaves the magnified frame (no smeared edge texels).
      const margin = (1 - 1 / frame.zoom) * 0.5 * 0.9;
      frame.panX = Math.max(-margin, Math.min(margin, frame.panX + (panTarget[0] * live - frame.panX) * k));
      frame.panY = Math.max(-margin, Math.min(margin, frame.panY + (panTarget[1] * live - frame.panY) * k));
      return frame;
    },
  };
}
