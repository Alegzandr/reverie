/**
 * AIFF (Audio Interchange File Format) Encoder
 * AIFF is similar to WAV but uses big-endian byte order (Apple's format)
 */

export async function audioBufferToAiff(audioBuffer: AudioBuffer): Promise<Blob> {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;

  const numFrames = audioBuffer.length;
  const bytesPerFrame = numberOfChannels * bytesPerSample;
  const dataSize = numFrames * bytesPerFrame;

  // AIFF file structure:
  // FORM chunk (12 bytes)
  // COMM chunk (26 bytes)
  // SSND chunk (16 bytes + data)
  const formChunkSize = 4 + 26 + 16 + dataSize; // Excluding 'FORM' and size itself
  const buffer = new ArrayBuffer(12 + 26 + 16 + dataSize);
  const view = new DataView(buffer);

  let pos = 0;

  // Helper functions for big-endian writing
  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(pos++, str.charCodeAt(i));
    }
  };

  const writeUint32BE = (value: number) => {
    view.setUint32(pos, value, false); // false = big-endian
    pos += 4;
  };

  const writeUint16BE = (value: number) => {
    view.setUint16(pos, value, false);
    pos += 2;
  };

  const writeInt16BE = (value: number) => {
    view.setInt16(pos, value, false);
    pos += 2;
  };

  // Write 80-bit extended precision sample rate
  const writeExtended = (value: number) => {
    // Simplified 80-bit extended precision conversion
    // For standard sample rates, we can use lookup table
    const exponent = 0x400e; // Common exponent for audio sample rates
    const mantissa = Math.floor(value * Math.pow(2, 32 - 15));

    writeUint16BE(exponent);
    writeUint32BE(mantissa);
    writeUint32BE(0); // Lower 32 bits
  };

  // FORM chunk
  writeString('FORM');
  writeUint32BE(formChunkSize);
  writeString('AIFF');

  // Common (COMM) chunk
  writeString('COMM');
  writeUint32BE(18); // COMM chunk size (18 bytes)
  writeUint16BE(numberOfChannels);
  writeUint32BE(numFrames);
  writeUint16BE(bitsPerSample);
  writeExtended(sampleRate);

  // Sound Data (SSND) chunk
  writeString('SSND');
  writeUint32BE(dataSize + 8); // Data size + offset + blockSize
  writeUint32BE(0); // offset
  writeUint32BE(0); // blockSize

  // Write audio data (interleaved, big-endian)
  const channels: Float32Array[] = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  for (let i = 0; i < numFrames; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      writeInt16BE(intSample);
    }
  }

  return new Blob([buffer], { type: 'audio/aiff' });
}
