import { channelToInt16 } from './pcm';
import type { Mp3WorkerRequest, Mp3WorkerResponse } from './mp3.worker';

type Pcm = Pick<Mp3WorkerRequest, 'left' | 'right'>;

/**
 * Encode in a dedicated worker; resolves null when workers are unavailable or
 * the worker can't start. The PCM is quantised only once the worker exists and
 * is transferred (not copied), so a fallback re-quantises instead of holding a
 * second copy through the export.
 */
function encodeInWorker(quantise: () => Pcm, meta: Omit<Mp3WorkerRequest, 'left' | 'right'>): Promise<Uint8Array[] | null> {
  if (typeof Worker === 'undefined') return Promise.resolve(null);
  let worker: Worker;
  try {
    worker = new Worker(new URL('./mp3.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<Mp3WorkerResponse>) => {
      worker.terminate();
      if (e.data.ok) resolve(e.data.chunks);
      else reject(new Error(e.data.error));
    };
    // A worker that can't even start (blocked script, failed chunk) falls back
    // to the main thread rather than failing the export.
    worker.onerror = (e) => {
      e.preventDefault();
      worker.terminate();
      resolve(null);
    };
    const { left, right } = quantise();
    const request: Mp3WorkerRequest = { left, right, ...meta };
    worker.postMessage(request, right ? [left.buffer, right.buffer] : [left.buffer]);
  });
}

// Encodes an AudioBuffer to MP3 at the requested bitrate (matched to the source when available).
export async function audioBufferToMp3(
  audioBuffer: AudioBuffer,
  bitRate: number = 192
): Promise<Blob> {
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const quantise = (): Pcm => ({
    left: channelToInt16(audioBuffer.getChannelData(0)),
    right: channels > 1 ? channelToInt16(audioBuffer.getChannelData(1)) : null,
  });

  // Same deterministic encoder either way, so the bytes are identical; the
  // worker only keeps the UI (worlds, spinner, input) live through the encode.
  let mp3Data = await encodeInWorker(quantise, { channels, sampleRate, bitRate });
  if (!mp3Data) {
    const { left, right } = quantise();
    const { encodeMp3 } = await import('./mp3Core');
    mp3Data = encodeMp3(left, right, channels, sampleRate, bitRate);
  }

  return new Blob(mp3Data as BlobPart[], { type: 'audio/mp3' });
}
