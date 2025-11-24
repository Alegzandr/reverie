/**
 * MediaRecorder-based encoder for various audio formats
 * Supports: WebM, OGG (Opus/Vorbis), M4A/AAC (browser-dependent)
 */

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
  const { mimeType, audioBitsPerSecond = 192000 } = options;

  // Check if the mimeType is supported
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    throw new Error(`MIME type ${mimeType} is not supported by this browser`);
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
      reject(new Error(`MediaRecorder error: ${event}`));
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
      }, 100);
    };
  });
}

/**
 * Check which formats are supported by the browser
 */
export function getSupportedMimeTypes(): string[] {
  const possibleTypes = [
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/webm;codecs=vorbis',
    'audio/ogg',
    'audio/ogg;codecs=opus',
    'audio/ogg;codecs=vorbis',
    'audio/mp4',
    'audio/mp4;codecs=mp4a.40.2', // AAC-LC
    'audio/mpeg', // Some browsers might support MP3
    'audio/wav', // Some browsers might support WAV
  ];

  return possibleTypes.filter(type => {
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
  const formatMap: Record<string, string[]> = {
    'webm': ['audio/webm;codecs=opus', 'audio/webm'],
    'ogg': ['audio/ogg;codecs=opus', 'audio/ogg;codecs=vorbis', 'audio/ogg'],
    'opus': ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus'],
    'm4a': ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4'],
    'aac': ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4'],
    'mp4': ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4'],
  };

  const candidates = formatMap[format.toLowerCase()] || [];

  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return null;
}
