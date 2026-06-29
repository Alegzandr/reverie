import { describe, it, expect } from 'vitest';
import { getBufferLoudness } from './audioLoudness';

/**
 * Build a minimal AudioBuffer-like object from raw per-channel sample arrays.
 * sampleRate is tiny so a handful of samples spans several measurement windows.
 */
const makeBuffer = (channels: number[][], sampleRate = 100): AudioBuffer =>
  ({
    numberOfChannels: channels.length,
    length: channels[0]?.length ?? 0,
    sampleRate,
    getChannelData: (ch: number) => Float32Array.from(channels[ch]),
  }) as unknown as AudioBuffer;

describe('getBufferLoudness', () => {
  it('reads the peak from the loudest sample across channels, regardless of sign', () => {
    const buffer = makeBuffer([
      [0, 0.3, -0.2],
      [0.1, -0.6, 0.4],
    ]);
    expect(getBufferLoudness(buffer).peak).toBeCloseTo(0.6, 5);
  });

  it('measures RMS as the amplitude of a steady tone', () => {
    // A constant 0.5 amplitude signal has RMS 0.5 (every window clears the gate).
    const buffer = makeBuffer([new Array(50).fill(0.5)]);
    expect(getBufferLoudness(buffer).rms).toBeCloseTo(0.5, 5);
  });

  it('gates out silent windows so a quiet intro does not drag loudness down', () => {
    // 5 windows (sampleRate 100, 50ms window = 5 samples): first 4 silent, last loud.
    const silent = new Array(20).fill(0);
    const loud = new Array(5).fill(0.4);
    const ungated = getBufferLoudness(makeBuffer([[...silent, ...loud]]));
    // Gated RMS reflects the loud section (~0.4), not the ~0.18 full-track average.
    expect(ungated.rms).toBeCloseTo(0.4, 2);
  });

  it('floors a silent buffer to a small epsilon, never zero', () => {
    const profile = getBufferLoudness(makeBuffer([[0, 0, 0, 0, 0]]));
    expect(profile.peak).toBeGreaterThan(0);
    expect(profile.peak).toBeLessThan(0.001);
    expect(profile.rms).toBeGreaterThan(0);
    expect(profile.rms).toBeLessThan(0.001);
  });

  it('clamps any over-range sample to 1', () => {
    expect(getBufferLoudness(makeBuffer([[1.4, -0.2]])).peak).toBe(1);
  });

  it('caches per buffer so a second read does not rescan', () => {
    let reads = 0;
    const buffer = {
      numberOfChannels: 1,
      length: 2,
      sampleRate: 100,
      getChannelData: () => {
        reads++;
        return Float32Array.from([0.5, -0.5]);
      },
    } as unknown as AudioBuffer;

    expect(getBufferLoudness(buffer).peak).toBeCloseTo(0.5, 5);
    expect(getBufferLoudness(buffer).peak).toBeCloseTo(0.5, 5);
    expect(reads).toBe(1);
  });
});
