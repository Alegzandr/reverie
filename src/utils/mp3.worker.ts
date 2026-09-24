/// <reference lib="webworker" />
import { encodeMp3 } from './mp3Core';

export interface Mp3WorkerRequest {
  left: Int16Array;
  right: Int16Array | null;
  channels: number;
  sampleRate: number;
  bitRate: number;
}

export type Mp3WorkerResponse = { ok: true; chunks: Uint8Array[] } | { ok: false; error: string };

// lamejs is synchronous and takes ~1.4 s per stereo minute: off the main
// thread the worlds, spinner and input stay live through an export.
self.onmessage = (e: MessageEvent<Mp3WorkerRequest>) => {
  const { left, right, channels, sampleRate, bitRate } = e.data;
  try {
    const chunks = encodeMp3(left, right, channels, sampleRate, bitRate);
    const reply: Mp3WorkerResponse = { ok: true, chunks };
    self.postMessage(reply, chunks.map((c) => c.buffer));
  } catch (err) {
    const reply: Mp3WorkerResponse = { ok: false, error: err instanceof Error ? err.message : String(err) };
    self.postMessage(reply);
  }
};
