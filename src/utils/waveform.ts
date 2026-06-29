/**
 * Waveform utilities
 *
 * Generates downsampled waveform bar data and caches results per AudioBuffer + bar count.
 * This avoids recomputing on every render while keeping generation synchronous for predictable tests.
 */

import { WAVEFORM } from '../constants';
import type { AudioProcessingOptions } from './audioProcessor';

type BarCache = Map<number, number[]>;
let waveformCache = new WeakMap<AudioBuffer, BarCache>();

/**
 * Clear waveform cache (primarily for testing)
 */
export function clearWaveformCache() {
  waveformCache = new WeakMap<AudioBuffer, BarCache>();
}

/**
 * Compute and cache waveform bar data for an AudioBuffer
 */
export function getOrCreateWaveform(buffer: AudioBuffer, bars: number = WAVEFORM.BAR_COUNT): number[] {
  const normalizedBars = Math.max(1, Math.floor(bars));
  const existing = waveformCache.get(buffer)?.get(normalizedBars);
  if (existing) return existing;

  const computed = computeWaveform(buffer, normalizedBars);
  const barCache = waveformCache.get(buffer) ?? new Map<number, number[]>();
  barCache.set(normalizedBars, computed);
  waveformCache.set(buffer, barCache);
  return computed;
}

/**
 * Generate waveform bars by sampling absolute amplitude across channels
 */
export function computeWaveform(buffer: AudioBuffer, bars: number): number[] {
  const channelCount = buffer.numberOfChannels || 1;
  const channelData: Float32Array[] = [];
  for (let c = 0; c < channelCount; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  const samplesPerBar = Math.max(1, Math.floor(buffer.length / bars));
  const barsOut = new Array<number>(bars);

  for (let bar = 0; bar < bars; bar++) {
    const start = bar * samplesPerBar;
    const end = Math.min(start + samplesPerBar, buffer.length);
    const span = end - start || 1;

    let sum = 0;
    for (let c = 0; c < channelCount; c++) {
      const data = channelData[c];
      for (let i = start; i < end; i++) {
        sum += Math.abs(data[i]);
      }
    }

    const avg = sum / (span * channelCount);
    barsOut[bar] = Math.min(1, Math.sqrt(avg));
  }

  return barsOut;
}

/**
 * Reshape a source amplitude envelope to preview the active effect.
 *
 * The live audio graph never bakes a processed buffer, so the waveform reflects the
 * settings by transforming the displayed bars in step with what you hear: bass adds
 * body (more amplitude), reverb smears energy forward into a decaying tail, and 8D
 * rotation makes perceived loudness swell and dip across the track. Speed isn't shaped
 * here: the whole clip stays on screen and the playhead simply travels faster.
 *
 * Pure and cheap (operates on the ~96 display bars), so it can run on every tweak.
 */
export function shapeEnvelope(bars: number[], options?: AudioProcessingOptions | null): number[] {
  if (!options || bars.length === 0) return bars;

  const {
    reverbAmount = 0,
    audio8D = false,
    rotationSpeed = 0,
    bassBoost = false,
    bassBoostIntensity = 0,
    bassUnderwater = 0,
  } = options;

  let out = bars.slice();

  // Bass boost: a fuller low end reads as more amplitude across the track.
  if (bassBoost && bassBoostIntensity > 0) {
    const gain = 1 + 0.8 * bassBoostIntensity;
    out = out.map((b) => Math.min(1, b * gain));
  }

  // Underwater muffle: a lowpass softens transients, so peaks round off and bleed
  // into their neighbours - the bars blur toward a local average and lose a little top.
  if (bassBoost && bassUnderwater > 0) {
    const w = bassUnderwater;
    const blurred = out.map((b, i) => {
      const prev = out[i - 1] ?? b;
      const next = out[i + 1] ?? b;
      return b * (1 - 0.5 * w) + ((prev + next) / 2) * (0.5 * w);
    });
    out = blurred.map((b) => b * (1 - 0.15 * w));
  }

  // Reverb: each bar bleeds into the following ones (a decaying tail) and fills gaps.
  if (reverbAmount > 0) {
    const decay = 0.55 + 0.4 * reverbAmount;
    const wet = Math.min(1, reverbAmount);
    let carry = 0;
    out = out.map((b) => {
      carry = Math.max(b, carry * decay);
      return Math.min(1, b * (1 - 0.45 * wet) + carry * (0.45 * wet));
    });
  }

  // 8D rotation: the pan sweep makes loudness swell and dip over time.
  if (audio8D) {
    const depth = 0.22;
    const cycles = Math.max(1, rotationSpeed * 5);
    const n = out.length;
    out = out.map((b, i) => {
      const swell = 1 + depth * Math.sin((i / n) * Math.PI * 2 * cycles);
      return Math.min(1, Math.max(0, b * swell));
    });
  }

  return out;
}
