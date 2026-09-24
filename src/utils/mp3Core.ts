import { Mp3Encoder } from '@breezystack/lamejs';

/** lamejs's frame size: feeding whole frames keeps its internal buffering trivial. */
const MP3_BLOCK_SAMPLES = 1152;

/**
 * The MP3 encode proper, on already-quantised 16-bit PCM. Pure and synchronous,
 * so it runs unchanged in the export worker or, as a fallback, on the main thread.
 */
export function encodeMp3(
  left: Int16Array,
  right: Int16Array | null,
  channels: number,
  sampleRate: number,
  bitRate: number,
): Uint8Array[] {
  const mp3encoder = new Mp3Encoder(channels, sampleRate, bitRate);
  const mp3Data: Uint8Array[] = [];

  for (let i = 0; i < left.length; i += MP3_BLOCK_SAMPLES) {
    const leftChunk = left.subarray(i, i + MP3_BLOCK_SAMPLES);
    const rightChunk = right ? right.subarray(i, i + MP3_BLOCK_SAMPLES) : undefined;
    const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }

  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(new Uint8Array(mp3buf));
  }
  return mp3Data;
}
