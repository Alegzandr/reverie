import { DRUM_BAND_WEIGHTS as W } from '../constants';

/**
 * Onset weight of a band centred at `hz`. One definition for the live beat
 * clock and the offline beat grid, so both nod on the same drums.
 */
export function drumBandWeight(hz: number): number {
  if (hz < W.KICK_MAX_HZ) return W.KICK;
  if (hz < W.SNARE_BODY_MAX_HZ) return W.SNARE_BODY;
  if (hz > W.SNARE_CRACK_MIN_HZ && hz < W.SNARE_CRACK_MAX_HZ) return W.SNARE_CRACK;
  return 0;
}
