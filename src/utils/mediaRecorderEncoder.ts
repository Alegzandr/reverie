/**
 * MediaRecorder-based encoder for various audio formats
 * Supports: WebM, OGG (Opus/Vorbis), M4A/AAC (browser-dependent)
 */

import { MEDIA_RECORDER_FORMATS, AUDIO_PROCESSING, BITRATE, ERROR_MESSAGES } from '../constants';

export interface MediaRecorderEncoderOptions {
  mimeType: string;
  audioBitsPerSecond?: number;
}

/**
 * Encodes an AudioBuffer using the MediaRecorder API
 * This works by playing the buffer into a MediaStream and recording it
 */
export async function encodeWithMediaRecorder(
  audioBuffer: AudioBuffer,
  options: MediaRecorderEncoderOptions
): Promise<Blob> {
  const { mimeType, audioBitsPerSecond = BITRATE.DEFAULT_MEDIA_RECORDER_BPS } = options;

  // Check if the mimeType is supported
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    throw new Error(ERROR_MESSAGES.MIME_TYPE_NOT_SUPPORTED(mimeType));
  }

  // Create an offline audio context to play the buffer
  const audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();

  // Create a source from the buffer
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(destination);

  // Set up MediaRecorder
  const mediaRecorder = new MediaRecorder(destination.stream, {
    mimeType,
    audioBitsPerSecond,
  });

  const chunks: Blob[] = [];

  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      audioContext.close();
      resolve(blob);
    };

    mediaRecorder.onerror = (event) => {
      audioContext.close();
      reject(new Error(ERROR_MESSAGES.MEDIA_RECORDER_ERROR(event)));
    };

    // Start recording
    mediaRecorder.start();

    // Play the buffer
    source.start(0);

    // Stop recording when the buffer finishes playing
    source.onended = () => {
      // Add a small delay to ensure all data is captured
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }, AUDIO_PROCESSING.MEDIA_RECORDER_STOP_DELAY_MS);
    };
  });
}

/**
 * Check which formats are supported by the browser
 */
export function getSupportedMimeTypes(): string[] {
  return [...MEDIA_RECORDER_FORMATS.POSSIBLE_MIME_TYPES].filter(type => {
    try {
      return MediaRecorder.isTypeSupported(type);
    } catch {
      return false;
    }
  });
}

/**
 * Get the best supported MIME type for a given format
 */
export function getMimeTypeForFormat(format: string): string | null {
  const candidates = MEDIA_RECORDER_FORMATS.MIME_TYPE_MAP[format.toLowerCase() as keyof typeof MEDIA_RECORDER_FORMATS.MIME_TYPE_MAP] || [];

  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return null;
}
