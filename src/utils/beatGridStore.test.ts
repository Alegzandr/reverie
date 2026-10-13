import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BeatGrid } from './beatGrid';
import type { BeatGridWorkerResponse } from './beatGrid.worker';

/** A worker the test answers by hand; records every instance and whether it was stopped. */
class FakeWorker {
  static all: FakeWorker[] = [];
  onmessage: ((e: MessageEvent<BeatGridWorkerResponse>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  terminated = false;
  constructor() {
    FakeWorker.all.push(this);
  }
  postMessage() {}
  terminate() {
    this.terminated = true;
  }
  reply(grid: BeatGrid) {
    if (!this.terminated) this.onmessage?.({ data: { ok: true, grid } } as MessageEvent<BeatGridWorkerResponse>);
  }
}

const grid = (): BeatGrid => ({ times: Float64Array.from([1, 2]), strength: Float32Array.from([1, 1]), period: 1 });
const track = () => new AudioBuffer({ numberOfChannels: 2, length: 4410, sampleRate: 44100 });
const flush = () => new Promise((r) => setTimeout(r, 0));

let peekBeatGrid: typeof import('./beatGridStore').peekBeatGrid;

beforeEach(async () => {
  FakeWorker.all = [];
  vi.stubGlobal('Worker', FakeWorker);
  // The store keeps its in-flight analysis per module: start each test clean.
  vi.resetModules();
  ({ peekBeatGrid } = await import('./beatGridStore'));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('peekBeatGrid', () => {
  it('analyses a track once and serves the cached grid', async () => {
    const a = track();
    expect(peekBeatGrid(a)).toBeNull();
    expect(peekBeatGrid(a)).toBeNull();
    expect(FakeWorker.all).toHaveLength(1);
    const g = grid();
    FakeWorker.all[0].reply(g);
    await flush();
    expect(peekBeatGrid(a)).toBe(g);
    expect(FakeWorker.all[0].terminated).toBe(true);
  });

  it('cancels the previous track when another one is asked for', async () => {
    const a = track();
    const b = track();
    peekBeatGrid(a);
    peekBeatGrid(b);
    expect(FakeWorker.all).toHaveLength(2);
    expect(FakeWorker.all[0].terminated).toBe(true);
    expect(FakeWorker.all[1].terminated).toBe(false);
    const g = grid();
    FakeWorker.all[1].reply(g);
    await flush();
    expect(peekBeatGrid(b)).toBe(g);
    expect(peekBeatGrid(a)).toBeNull();
  });

  it('restarts a cancelled track when it comes back', async () => {
    const a = track();
    const b = track();
    peekBeatGrid(a);
    peekBeatGrid(b);
    expect(peekBeatGrid(a)).toBeNull();
    expect(FakeWorker.all).toHaveLength(3);
    expect(FakeWorker.all[1].terminated).toBe(true);
    const g = grid();
    FakeWorker.all[2].reply(g);
    await flush();
    expect(peekBeatGrid(a)).toBe(g);
  });

  it('keeps an analysed track cached while another is analysed', async () => {
    const a = track();
    const b = track();
    peekBeatGrid(a);
    const g = grid();
    FakeWorker.all[0].reply(g);
    await flush();
    peekBeatGrid(b);
    expect(peekBeatGrid(a)).toBe(g);
    // Going back to a cached track leaves the other's analysis running.
    expect(FakeWorker.all[1].terminated).toBe(false);
  });
});
