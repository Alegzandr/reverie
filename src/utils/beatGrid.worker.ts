/// <reference lib="webworker" />
import { analyzeBeatGrid, type BeatGrid } from './beatGrid';

export interface BeatGridWorkerRequest {
  mono: Float32Array;
  sampleRate: number;
}

export type BeatGridWorkerResponse = { ok: true; grid: BeatGrid } | { ok: false; error: string };

// About a second per four minutes of audio: off the main thread the worlds and
// input stay live while a new track is analysed.
self.onmessage = (e: MessageEvent<BeatGridWorkerRequest>) => {
  try {
    const grid = analyzeBeatGrid(e.data.mono, e.data.sampleRate);
    const reply: BeatGridWorkerResponse = { ok: true, grid };
    self.postMessage(reply, [grid.times.buffer, grid.strength.buffer]);
  } catch (err) {
    const reply: BeatGridWorkerResponse = { ok: false, error: err instanceof Error ? err.message : String(err) };
    self.postMessage(reply);
  }
};
