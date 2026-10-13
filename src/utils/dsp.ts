// Gain/cutoff curves shared by the offline renderer (audioProcessor) and the
// live playback graph (effectGraph), so both engines sound identical.

import { AUDIO_EFFECTS, AUDIO_SIGNAL, EFFECT_DEFAULTS } from '../constants';
import type { AudioProcessingOptions } from './audioProcessor';

/**
 * Underwater muffle cutoff (Hz) for a given amount (0..1). The sweep is exponential
 * so the perceived "submerging" is even across the slider: 0 → transparent (MAX),
 * 1 → deep muffle (MIN).
 */
export function underwaterCutoffHz(amount: number): number {
  const a = Math.max(0, Math.min(1, amount));
  const { UNDERWATER_CUTOFF_MAX_HZ: max, UNDERWATER_CUTOFF_MIN_HZ: min } = AUDIO_EFFECTS.BASS_BOOST;
  return max * Math.pow(min / max, a);
}

/**
 * Reverb makeup gain for a given amount (0..1). The wet/dry crossfade
 * (`dry = 1 - 0.5·amount`) pulls the direct signal down up to -6 dB while the
 * decorrelated wet tail only partly fills it back in, so the mix gets quieter as
 * reverb rises. Because dry and wet are decorrelated their powers add, giving an
 * exact compensation: out / sqrt((1-0.5a)² + k·a²), where k ≈ 0.0525 is the
 * measured power the normalized convolver returns relative to the input. Derived
 * by measuring integrated loudness (BS.1770); residual is within ±0.08 dB and the
 * value is content-independent. Restoring loudness adds no clipping since reverb
 * lowers the crest factor.
 */
export function reverbMakeupGain(amount: number): number {
  const a = Math.max(0, Math.min(1, amount));
  return 1 / Math.sqrt((1 - 0.5 * a) ** 2 + 0.0525 * a * a);
}

/**
 * Bass-boost output trim for a given intensity (0..1). The +18 dB low shelf adds
 * level and eats headroom, so the output is scaled back as the boost grows. The
 * loudness gain accelerates (a shelf is dB-linear in intensity), so the trim is
 * quadratic rather than linear. The 0.4 coefficient is a content-centered
 * compromise measured across a bass-heavy track and pink noise (BS.1770): it keeps
 * neutral material within ±1 dB and caps a worst-case full boost at ~+1.6 dB
 * instead of the +3.5 dB the previous linear 1-0.25·i left.
 */
export function bassBoostTrimGain(intensity: number): number {
  const i = Math.max(0, Math.min(1, intensity));
  return 1 - 0.4 * i * i;
}

/**
 * Every parameter of the effect chain, derived from the user's options. This is
 * the single source of truth for both engines: the live graph ramps its nodes to
 * these values and the offline export builds the same chain with them, so what
 * is auditioned is what gets rendered.
 *
 * Inactive stages resolve to exact bypass values rather than "nearly transparent"
 * ones: a highpass at 0 Hz and a lowpass at Nyquist reduce to H(z) = 1 in the Web
 * Audio biquad, so plain playback is untouched by filters the user never enabled.
 */
export interface EffectParams {
  highpassHz: number;
  lowshelfGainDb: number;
  peakGainDb: number;
  lowpassHz: number;
  /** Peak swing (Hz) of the underwater LFO on the lowpass cutoff. */
  lowpassLfoDepthHz: number;
  dryGain: number;
  wetGain: number;
  /** Whether the reverb convolver needs input at all (wet gain above zero). */
  reverbAudible: boolean;
  eightD: boolean;
  /** Level of the panned (orbiting) signal. */
  pannedGain: number;
  /** Depth of the orbit LFO on the stereo pan (0 = centered). */
  panDepth: number;
  /** Level of the un-panned 8D ambience bed. */
  bedGain: number;
  rotationHz: number;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Highpass frequency at which the biquad reduces to a pass-through. */
export const HIGHPASS_BYPASS_HZ = 0;

export function computeEffectParams(options: AudioProcessingOptions, sampleRate: number): EffectParams {
  const { BASS_BOOST, REVERB, EIGHT_D } = AUDIO_EFFECTS;
  const reverb = clamp01(options.reverbAmount || 0);
  const bassMode = !!options.bassBoost;
  const bass = bassMode ? clamp01(options.bassBoostIntensity ?? 0) : 0;
  const underwater = bassMode ? clamp01(options.bassUnderwater ?? 0) : 0;
  const eightD = !!options.audio8D;

  // The bass trim folds into the dry/wet gains: the bass filters sit before the
  // reverb split, so scaling both branches equally trims the bass-stage output.
  const levelTrim = reverbMakeupGain(reverb) * bassBoostTrimGain(bass);
  const underwaterActive = underwater > 0;
  const cutoff = underwaterCutoffHz(underwater);
  const rotationSpeed = options.rotationSpeed || EFFECT_DEFAULTS.EIGHT_D_AUDIO.ROTATION_DEFAULT;

  return {
    highpassHz: bassMode ? BASS_BOOST.HIGHPASS_FREQUENCY_HZ : HIGHPASS_BYPASS_HZ,
    lowshelfGainDb: bass * BASS_BOOST.LOWSHELF_MAX_GAIN_DB,
    peakGainDb: -bass * BASS_BOOST.PEAKING_MAX_CUT_DB,
    lowpassHz: underwaterActive ? cutoff : sampleRate / 2,
    lowpassLfoDepthHz: underwaterActive ? cutoff * BASS_BOOST.UNDERWATER_LFO_DEPTH_RATIO * underwater : 0,
    dryGain: (1 - reverb * REVERB.WET_RATIO) * levelTrim,
    wetGain: reverb * REVERB.WET_RATIO * levelTrim,
    reverbAudible: reverb > 0,
    eightD,
    pannedGain: eightD ? AUDIO_SIGNAL.EIGHT_D_MIX.DRY_GAIN : 1,
    panDepth: eightD ? 1 : 0,
    bedGain: eightD ? AUDIO_SIGNAL.EIGHT_D_MIX.WET_GAIN : 0,
    rotationHz: eightD
      ? Math.max(EIGHT_D.MIN_ROTATION_HZ, rotationSpeed / EIGHT_D.SECONDS_PER_ROTATION)
      : EIGHT_D.MIN_ROTATION_HZ,
  };
}
