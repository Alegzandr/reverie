import { useEffect, useState } from 'react';
import { WAVEFORM } from '../constants';
import { getOrCreateWaveform } from '../utils/waveform';

interface UseWaveformParams {
  buffer?: AudioBuffer | null;
  bars?: number;
}

interface UseWaveformState {
  bars: number[];
  isComputing: boolean;
}

/**
 * Hook that returns cached waveform bars for an AudioBuffer
 */
export function useWaveform({ buffer, bars = WAVEFORM.BAR_COUNT }: UseWaveformParams): UseWaveformState {
  const [state, setState] = useState<UseWaveformState>({
    bars: new Array(Math.max(1, Math.floor(bars))).fill(0),
    isComputing: Boolean(buffer),
  });

  const schedule = (fn: () => void) => {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(fn);
      return null;
    }
    return setTimeout(fn, 0);
  };

  useEffect(() => {
    const targetBars = Math.max(1, Math.floor(bars));

    if (!buffer) {
      const handle = schedule(() => setState({ bars: new Array(targetBars).fill(0), isComputing: false }));
      return () => {
        if (typeof handle === 'number') {
          clearTimeout(handle);
        }
      };
    }

    let cancelled = false;
    const pending = schedule(() => {
      setState((prev) => ({
        bars: prev.bars.length === targetBars ? prev.bars : new Array(targetBars).fill(0),
        isComputing: true,
      }));
    });

    // Compute synchronously but yield to next tick to avoid blocking render
    const compute = () => {
      const next = getOrCreateWaveform(buffer, targetBars);
      if (!cancelled) {
        setState({ bars: next, isComputing: false });
      }
    };

    const handle = schedule(compute);

    return () => {
      cancelled = true;
      if (typeof pending === 'number') {
        clearTimeout(pending);
      }
      if (typeof handle === 'number') {
        clearTimeout(handle);
      }
    };
  }, [buffer, bars]);

  return state;
}
