/**
 * Extracts audio metadata directly from file headers without decoding
 * This preserves the original sample rate before Web Audio API resampling
 */

import { METADATA_EXTRACTION, ERROR_MESSAGES } from '../constants';

export interface RawAudioMetadata {
  sampleRate: number | null;
  channels: number | null;
  bitDepth: number | null;
}

/**
 * Read a 32-bit little-endian integer from a DataView
 */
function readUint32LE(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

/**
 * Read a 16-bit little-endian integer from a DataView
 */
function readUint16LE(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

/**
 * Read a 32-bit big-endian integer from a DataView
 */
function readUint32BE(view: DataView, offset: number): number {
  return view.getUint32(offset, false);
}

/**
 * Read a 16-bit big-endian integer from a DataView
 */
function readUint16BE(view: DataView, offset: number): number {
  return view.getUint16(offset, false);
}

/**
 * Read a string from a DataView
 */
function readString(view: DataView, offset: number, length: number): string {
  let str = '';
  for (let i = 0; i < length; i++) {
    str += String.fromCharCode(view.getUint8(offset + i));
  }
  return str;
}

/**
 * Extract metadata from WAV file header
 */
async function extractWavMetadata(file: File): Promise<RawAudioMetadata> {
  const buffer = await file.slice(0, METADATA_EXTRACTION.HEADER_SIZES.WAV).arrayBuffer();
  const view = new DataView(buffer);

  // Check for RIFF header
  const riff = readString(view, 0, 4);
  if (riff !== 'RIFF') {
    return { sampleRate: null, channels: null, bitDepth: null };
  }

  // Check for WAVE format
  const wave = readString(view, 8, 4);
  if (wave !== 'WAVE') {
    return { sampleRate: null, channels: null, bitDepth: null };
  }

  // Read format chunk
  const fmt = readString(view, 12, 4);
  if (fmt !== 'fmt ') {
    return { sampleRate: null, channels: null, bitDepth: null };
  }

  const channels = readUint16LE(view, 22);
  const sampleRate = readUint32LE(view, 24);
  const bitDepth = readUint16LE(view, 34);

  return { sampleRate, channels, bitDepth };
}

/**
 * Extract metadata from AIFF file header
 */
async function extractAiffMetadata(file: File): Promise<RawAudioMetadata> {
  const buffer = await file.slice(0, METADATA_EXTRACTION.HEADER_SIZES.AIFF).arrayBuffer();
  const view = new DataView(buffer);

  // Check for FORM header
  const form = readString(view, 0, 4);
  if (form !== 'FORM') {
    return { sampleRate: null, channels: null, bitDepth: null };
  }

  // Check for AIFF format
  const aiff = readString(view, 8, 4);
  if (aiff !== 'AIFF' && aiff !== 'AIFC') {
    return { sampleRate: null, channels: null, bitDepth: null };
  }

  // Find COMM chunk
  let offset = 12;
  while (offset < buffer.byteLength - 8) {
    const chunkId = readString(view, offset, 4);
    const chunkSize = readUint32BE(view, offset + 4);

    if (chunkId === 'COMM') {
      const channels = readUint16BE(view, offset + 8);
      const bitDepth = readUint16BE(view, offset + 14);

      // Read 80-bit extended precision sample rate (simplified)
      const exponent = readUint16BE(view, offset + 16);
      const mantissaHigh = readUint32BE(view, offset + 18);

      // Convert from 80-bit extended to regular number (simplified)
      const sampleRate = mantissaHigh / Math.pow(2, 32 - (exponent - 0x3ffe));

      return { sampleRate: Math.round(sampleRate), channels, bitDepth };
    }

    offset += 8 + chunkSize;
  }

  return { sampleRate: null, channels: null, bitDepth: null };
}

/**
 * Extract metadata from FLAC file header
 */
async function extractFlacMetadata(file: File): Promise<RawAudioMetadata> {
  const buffer = await file.slice(0, METADATA_EXTRACTION.HEADER_SIZES.FLAC).arrayBuffer();
  const view = new DataView(buffer);

  // Check for fLaC header
  const flac = readString(view, 0, 4);
  if (flac !== 'fLaC') {
    return { sampleRate: null, channels: null, bitDepth: null };
  }

  // Read STREAMINFO block (should be first metadata block)
  const blockType = view.getUint8(4) & 0x7f;
  if (blockType !== 0) {
    return { sampleRate: null, channels: null, bitDepth: null };
  }

  // Read sample rate (20 bits starting at byte 18, bits 0-19)
  // Channels (3 bits, bits 20-22)
  // Bit depth (5 bits, bits 23-27)
  const byte18 = view.getUint8(18);
  const byte19 = view.getUint8(19);
  const byte20 = view.getUint8(20);
  const byte21 = view.getUint8(21);

  const sampleRate = (byte18 << 12) | (byte19 << 4) | (byte20 >> 4);
  const channels = ((byte20 & 0x0e) >> 1) + 1;
  // Bit depth is a 5-bit field stored as (bitsPerSample - 1). The `+ 1` must apply
  // to the whole reconstructed value, not just the low nibble - hence the parens.
  const bitDepth = (((byte20 & 0x01) << 4) | ((byte21 & 0xf0) >> 4)) + 1;

  return { sampleRate, channels, bitDepth };
}

/**
 * Extract metadata from MP3 file header
 */
async function extractMp3Metadata(file: File): Promise<RawAudioMetadata> {
  const buffer = await file.slice(0, METADATA_EXTRACTION.HEADER_SIZES.MP3_SEARCH).arrayBuffer();
  const view = new DataView(buffer);

  // Skip ID3v2 tag if present
  let offset = 0;
  if (readString(view, 0, 3) === 'ID3') {
    const size = (view.getUint8(6) << 21) | (view.getUint8(7) << 14) |
                 (view.getUint8(8) << 7) | view.getUint8(9);
    offset = 10 + size;
  }

  while (offset < buffer.byteLength - 4) {
    const byte = view.getUint8(offset);

    // Check for frame sync (11 consecutive set bits)
    if (byte === METADATA_EXTRACTION.MP3_FRAME_SYNC) {
      const nextByte = view.getUint8(offset + 1);
      if ((nextByte & METADATA_EXTRACTION.MP3_FRAME_SYNC_MASK) === METADATA_EXTRACTION.MP3_FRAME_SYNC_MASK) {
        // Found sync word
        const version = (nextByte >> 3) & 0x03;
        const samplingRateIndex = (view.getUint8(offset + 2) >> 2) & 0x03;
        const channelMode = (view.getUint8(offset + 3) >> 6) & 0x03;

        const sampleRate = METADATA_EXTRACTION.MP3_SAMPLE_RATES[version]?.[samplingRateIndex];
        const channels = channelMode === 3 ? 1 : 2;

        if (sampleRate) {
          return { sampleRate, channels, bitDepth: null };
        }
      }
    }
    offset++;
  }

  return { sampleRate: null, channels: null, bitDepth: null };
}

/**
 * Extract metadata from audio file based on format
 */
export async function extractAudioMetadata(file: File): Promise<RawAudioMetadata> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  try {
    switch (extension) {
      case 'wav':
      case 'wave':
        return await extractWavMetadata(file);

      case 'aiff':
      case 'aif':
      case 'aifc':
        return await extractAiffMetadata(file);

      case 'flac':
        return await extractFlacMetadata(file);

      case 'mp3':
        return await extractMp3Metadata(file);

      // For other formats (OGG, M4A, WebM), we can't easily extract without heavy parsing
      // Return null values to use decoded buffer info as fallback
      default:
        return { sampleRate: null, channels: null, bitDepth: null };
    }
  } catch (error) {
    console.warn(ERROR_MESSAGES.METADATA_EXTRACTION_FAILED(extension), error);
    return { sampleRate: null, channels: null, bitDepth: null };
  }
}
