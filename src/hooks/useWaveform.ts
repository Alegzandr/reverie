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

  useEffect(() => {
    const targetBars = Math.max(1, Math.floor(bars));

    if (!buffer) {
      setState({ bars: new Array(targetBars).fill(0), isComputing: false });
      return;
    }

    let cancelled = false;
    setState((prev) => ({
      bars: prev.bars.length === targetBars ? prev.bars : new Array(targetBars).fill(0),
      isComputing: true,
    }));

    // Compute synchronously but yield to next tick to avoid blocking render
    const compute = () => {
      const next = getOrCreateWaveform(buffer, targetBars);
      if (!cancelled) {
        setState({ bars: next, isComputing: false });
      }
    };

    const handle = queueMicrotask ? queueMicrotask(compute) : setTimeout(compute, 0);

    return () => {
      cancelled = true;
      if (typeof handle === 'number') {
        clearTimeout(handle);
      }
    };
  }, [buffer, bars]);

  return state;
}
