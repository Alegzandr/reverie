/**
 * Waveform utilities
 *
 * Generates downsampled waveform bar data and caches results per AudioBuffer + bar count.
 * This avoids recomputing on every render while keeping generation synchronous for predictable tests.
 */

import { WAVEFORM } from '../constants';

type BarCache = Map<number, number[]>;
let waveformCache = new WeakMap<AudioBuffer, BarCache>();

/**
 * Clear waveform cache (primarily for testing)
 */
export function clearWaveformCache() {
  waveformCache = new WeakMap<AudioBuffer, BarCache>();
}

/**
 * Retrieve a cached waveform if it exists
 */
export function getCachedWaveform(buffer: AudioBuffer, bars: number): number[] | undefined {
  return waveformCache.get(buffer)?.get(bars);
}

/**
 * Compute and cache waveform bar data for an AudioBuffer
 */
export function getOrCreateWaveform(buffer: AudioBuffer, bars: number = WAVEFORM.BAR_COUNT): number[] {
  const normalizedBars = Math.max(1, Math.floor(bars));
  const existing = getCachedWaveform(buffer, normalizedBars);
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
