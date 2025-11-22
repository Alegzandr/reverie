import { Mp3Encoder } from 'lamejs';

export async function audioBufferToMp3(
  audioBuffer: AudioBuffer,
  bitRate: number = 192
): Promise<Blob> {
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.length;

  // Convert float samples to PCM
  const left = new Int16Array(samples);
  const right = channels > 1 ? new Int16Array(samples) : null;

  const leftData = audioBuffer.getChannelData(0);
  for (let i = 0; i < samples; i++) {
    left[i] = Math.max(-1, Math.min(1, leftData[i])) * 0x7fff;
  }

  if (right && channels > 1) {
    const rightData = audioBuffer.getChannelData(1);
    for (let i = 0; i < samples; i++) {
      right[i] = Math.max(-1, Math.min(1, rightData[i])) * 0x7fff;
    }
  }

  // Encode to MP3
  const mp3encoder = new Mp3Encoder(channels, sampleRate, bitRate);
  const mp3Data: Uint8Array[] = [];

  const sampleBlockSize = 1152;
  for (let i = 0; i < samples; i += sampleBlockSize) {
    const leftChunk = left.subarray(i, i + sampleBlockSize);
    const rightChunk = right ? right.subarray(i, i + sampleBlockSize) : undefined;
    const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }

  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(new Uint8Array(mp3buf));
  }

  return new Blob(mp3Data as BlobPart[], { type: 'audio/mp3' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
