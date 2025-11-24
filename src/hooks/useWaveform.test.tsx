import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWaveform } from './useWaveform';
import { clearWaveformCache, getOrCreateWaveform } from '../utils/waveform';

describe('useWaveform', () => {
  beforeEach(() => {
    clearWaveformCache();
  });

  it('returns zeroed bars when no buffer is provided', () => {
    const { result } = renderHook(() => useWaveform({ buffer: null, bars: 4 }));

    expect(result.current.bars).toHaveLength(4);
    expect(result.current.bars.every((value) => value === 0)).toBe(true);
    expect(result.current.isComputing).toBe(false);
  });

  it('computes waveform bars and marks completion', async () => {
    const buffer = new AudioBuffer({ length: 100, numberOfChannels: 1, sampleRate: 44100 });
    const data = buffer.getChannelData(0);
    data.fill(0);
    data[10] = 0.8;
    data[50] = 0.6;

    const { result } = renderHook(() => useWaveform({ buffer, bars: 5 }));

    await waitFor(() => {
      expect(result.current.isComputing).toBe(false);
    });

    expect(result.current.bars).toHaveLength(5);
    expect(result.current.bars.some((value) => value > 0)).toBe(true);
  });

  it('reuses cached waveform for the same buffer and bar count', () => {
    const buffer = new AudioBuffer({ length: 50, numberOfChannels: 1, sampleRate: 44100 });
    const first = getOrCreateWaveform(buffer, 3);
    const second = getOrCreateWaveform(buffer, 3);

    expect(first).toBe(second);
  });
});
