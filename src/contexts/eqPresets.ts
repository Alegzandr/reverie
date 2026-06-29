import { AUDIO_EFFECTS } from '../constants';

/**
 * Listening-EQ presets. Gains are dB per band, in the canonical band order
 * declared by `AUDIO_EFFECTS.EQUALIZER.BANDS` (60Hz, 150Hz, 400Hz, 1KHz,
 * 2.4KHz, 15KHz). These tune playback comfort only - they are never applied to
 * exports.
 */
export interface EqPreset {
  /** Display name; not translated, used verbatim in the picker and persistence. */
  name: string;
  /** One gain in dB per band, same order as AUDIO_EFFECTS.EQUALIZER.BANDS. */
  gains: number[];
}

/** Number of bands the EQ exposes. */
export const EQ_BAND_COUNT = AUDIO_EFFECTS.EQUALIZER.BANDS.length;

/** All gains at 0 dB - a transparent, no-op EQ. */
export const EQ_FLAT_GAINS: number[] = Array.from({ length: EQ_BAND_COUNT }, () => 0);

/** The neutral default preset name. */
export const EQ_DEFAULT_PRESET = 'Flat';

/** Sentinel preset name for hand-tuned gains that match no built-in preset. */
export const EQ_CUSTOM = 'custom';

/**
 * The preset bank, in display order. Gains transcribed from the classic
 * Acoustic/Rock/… banks, reordered to the canonical band order above.
 */
export const EQ_PRESETS: EqPreset[] = [
  { name: 'Flat', gains: [0, 0, 0, 0, 0, 0] },
  { name: 'Acoustic', gains: [3, 2, 0, 0, 2, 1] },
  { name: 'Bass booster', gains: [4, 3, 1, 0, 0, 0] },
  { name: 'Bass reducer', gains: [-4, -3, -1, 0, 0, 0] },
  { name: 'Classical', gains: [3, 3, -1, -1, 0, 3] },
  { name: 'Dance', gains: [4, 3, 1, 2, 4, -1] },
  { name: 'Deep', gains: [3, 1, 2, 1, 0, -2] },
  { name: 'Electronic', gains: [3, 1, -1, 1, 1, 4] },
  { name: 'HipHop', gains: [3, 2, -1, -1, 1, 3] },
  { name: 'Jazz', gains: [2, 1, -1, -1, 0, 3] },
  { name: 'Latin', gains: [3, 0, 0, 0, 0, 4] },
  { name: 'Loudness', gains: [5, 1, -1, 1, -1, 2] },
  { name: 'Lounge', gains: [-1, 0, 3, 1, 0, 1] },
  { name: 'Piano', gains: [2, 0, 2, 1, 3, 2] },
  { name: 'Pop', gains: [0, 1, 3, 3, 1, -1] },
  { name: 'RnB', gains: [4, 3, -1, -1, 1, 2] },
  { name: 'Rock', gains: [3, 2, 0, -1, 0, 3] },
  { name: 'Small speakers', gains: [4, 3, 2, 1, 0, -2] },
  { name: 'Spoken word', gains: [0, 0, 2, 2, 3, 0] },
  { name: 'Treble booster', gains: [0, 0, 0, 1, 2, 5] },
  { name: 'Treble reducer', gains: [0, 0, 1, -1, -2, -4] },
  { name: 'Vocal booster', gains: [-2, -2, 2, 2, 1, -1] },
];

/** Whether two gain arrays are equal band-for-band. */
export function gainsEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** The preset whose gains match `gains` exactly, or the custom sentinel. */
export function presetNameForGains(gains: number[]): string {
  const match = EQ_PRESETS.find((p) => gainsEqual(p.gains, gains));
  return match ? match.name : EQ_CUSTOM;
}
