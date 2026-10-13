import { BEAT_GRID } from '../constants';
import type { BeatGrid } from './beatGrid';
import type { BeatGridWorkerRequest, BeatGridWorkerResponse } from './beatGrid.worker';

// Per AudioBuffer, like the loudness and tempo caches: the same buffer object
// is re-attached on every replay/seek, and the WeakMap lets the grid go with it.
const grids = new WeakMap<AudioBuffer, BeatGrid>();
const started = new WeakSet<AudioBuffer>();

/**
 * Mono, decimated to about ANALYSIS_RATE_HZ: all the analysis needs, a quarter
 * of a stereo track's bytes to hand to the worker.
 */
function downmix(buffer: AudioBuffer): { mono: Float32Array; sampleRate: number } {
  const factor = Math.max(1, Math.floor(buffer.sampleRate / BEAT_GRID.ANALYSIS_RATE_HZ));
  const mono = new Float32Array(Math.floor(buffer.length / factor));
  const scale = 1 / (factor * buffer.numberOfChannels);
  // Channel by channel, straight through memory: this runs on the main thread
  // at track load, so it must stay a few frames' worth even for a long track.
  for (let c = 0; c < buffer.numberOfChannels; c += 1) {
    const ch = buffer.getChannelData(c);
    if (factor === 2) {
      for (let i = 0, j = 0; i < mono.length; i += 1, j += 2) mono[i] += (ch[j] + ch[j + 1]) * scale;
    } else {
      for (let i = 0; i < mono.length; i += 1) {
        let s = 0;
        for (let k = 0, j = i * factor; k < factor; k += 1, j += 1) s += ch[j];
        mono[i] += s * scale;
      }
    }
  }
  return { mono, sampleRate: buffer.sampleRate / factor };
}

/** The one analysis in flight: a new track's request cancels the previous track's. */
let inFlight: { buffer: AudioBuffer; worker: Worker; settle: (grid: BeatGrid | null) => void } | null = null;

/** Stops the in-flight analysis (if any): its promise settles null and its buffer may be asked again. */
function cancelInFlight(): void {
  if (!inFlight) return;
  const { buffer, worker, settle } = inFlight;
  inFlight = null;
  worker.terminate();
  // Not analysed after all: coming back to this track must start it afresh.
  started.delete(buffer);
  settle(null);
}

function analyseInWorker(buffer: AudioBuffer): Promise<BeatGrid | null> {
  if (typeof Worker === 'undefined') return Promise.resolve(null);
  let worker: Worker;
  try {
    worker = new Worker(new URL('./beatGrid.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    let settled = false;
    const settle = (grid: BeatGrid | null) => {
      if (settled) return;
      settled = true;
      if (inFlight?.worker === worker) inFlight = null;
      worker.terminate();
      resolve(grid);
    };
    inFlight = { buffer, worker, settle };
    worker.onmessage = (e: MessageEvent<BeatGridWorkerResponse>) => settle(e.data.ok ? e.data.grid : null);
    // No grid is no harm: the worlds fall back to their live beat clock.
    worker.onerror = (e) => {
      e.preventDefault();
      settle(null);
    };
    const request: BeatGridWorkerRequest = downmix(buffer);
    worker.postMessage(request, [request.mono.buffer]);
  });
}

/**
 * The track's beat grid if it's ready; otherwise starts the analysis (once per
 * buffer) and returns null until it lands. Asking for a different track
 * cancels the one still being analysed: only the playing track's grid
 * matters, and a long track's analysis would otherwise hold a core for
 * nothing.
 */
export function peekBeatGrid(buffer: AudioBuffer): BeatGrid | null {
  const grid = grids.get(buffer);
  if (grid) return grid;
  if (!started.has(buffer)) {
    if (inFlight && inFlight.buffer !== buffer) cancelInFlight();
    started.add(buffer);
    void analyseInWorker(buffer).then((result) => {
      if (result) grids.set(buffer, result);
    });
  }
  return null;
}
