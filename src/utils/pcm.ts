import { AUDIO_SIGNAL } from '../constants';

/**
 * Quantize a float sample [-1, 1] to 16-bit signed PCM. Asymmetric on purpose:
 * negatives scale by 0x8000 so the full -32768 code is reachable.
 */
export function floatToInt16(sample: number): number {
  const clamped = Math.max(-1, Math.min(1, sample));
  return clamped < 0
    ? clamped * AUDIO_SIGNAL.PCM.INT16_MIN
    : clamped * AUDIO_SIGNAL.PCM.INT16_MAX;
}

/** Quantize one channel of float samples to 16-bit PCM. */
export function channelToInt16(data: Float32Array): Int16Array {
  const out = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = floatToInt16(data[i]);
  }
  return out;
}

/** All channels of a buffer, interleaved frame by frame and quantized to 16-bit PCM. */
export function interleaveToInt16(buffer: AudioBuffer): Int16Array {
  return interleaveInto(buffer, new Int16Array(buffer.length * buffer.numberOfChannels));
}

/**
 * The same 16-bit codes, one 32-bit slot per sample (libFLAC's input layout).
 * Written directly: in-range values truncate identically in both array types,
 * so this skips the Int16 intermediate and its full-length copy.
 */
export function interleaveToInt32(buffer: AudioBuffer): Int32Array {
  return interleaveInto(buffer, new Int32Array(buffer.length * buffer.numberOfChannels));
}

function interleaveInto<T extends Int16Array | Int32Array>(buffer: AudioBuffer, out: T): T {
  const channelCount = buffer.numberOfChannels;
  const channels: Float32Array[] = [];
  for (let c = 0; c < channelCount; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let write = 0;
  for (let frame = 0; frame < buffer.length; frame++) {
    for (let c = 0; c < channelCount; c++) {
      out[write++] = floatToInt16(channels[c][frame]);
    }
  }
  return out;
}
