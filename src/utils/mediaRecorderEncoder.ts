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

  // A realtime context: MediaRecorder can only capture a live stream, so the buffer
  // is played (silently, into a stream destination) at 1x speed.
  const audioContext = new AudioContext();
  // The context is per-export and must be released on every exit path, or the
  // browser's context budget runs out across repeated exports.
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    void Promise.resolve()
      .then(() => audioContext.close())
      .catch(() => {
        // already closed or never started - nothing left to release
      });
  };

  let mediaRecorder: MediaRecorder;
  let source: AudioBufferSourceNode;
  try {
    await resumeOrFail(audioContext);

    const destination = audioContext.createMediaStreamDestination();
    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(destination);

    mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType,
      audioBitsPerSecond,
    });
  } catch (error) {
    close();
    throw error instanceof Error ? error : new Error(ERROR_MESSAGES.MEDIA_RECORDER_ERROR(error));
  }

  const chunks: Blob[] = [];

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (outcome: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      close();
      outcome();
    };
    const fail = (error: Error) => {
      // Settle first: stopping the recorder fires onstop, which would otherwise
      // resolve a partial recording as if it were complete.
      finish(() => reject(error));
      if (mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
        } catch {
          // recorder already torn down
        }
      }
    };

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      finish(() => resolve(new Blob(chunks, { type: mimeType })));
    };

    mediaRecorder.onerror = (event) => {
      fail(new Error(ERROR_MESSAGES.MEDIA_RECORDER_ERROR(event)));
    };

    // Stop recording when the buffer finishes playing.
    source.onended = () => {
      // Small delay so the recorder flushes the final chunk before stopping.
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }, AUDIO_PROCESSING.MEDIA_RECORDER_STOP_DELAY_MS);
    };

    // Recording runs in real time; if playback stalls (a context suspended by the
    // OS, a recorder that never reports stop), give up so the MP3 fallback runs
    // instead of leaving the export spinning forever.
    const watchdog = setTimeout(
      () => fail(new Error(ERROR_MESSAGES.MEDIA_RECORDER_TIMEOUT)),
      audioBuffer.duration * 1000 + AUDIO_PROCESSING.MEDIA_RECORDER_WATCHDOG_MARGIN_MS,
    );

    try {
      mediaRecorder.start();
      source.start(0);
    } catch (error) {
      fail(error instanceof Error ? error : new Error(ERROR_MESSAGES.MEDIA_RECORDER_ERROR(error)));
    }
  });
}

/**
 * Bring a freshly created context to 'running'. Created after the export's awaits,
 * it may lack a user gesture; Safari then keeps it suspended (and can leave
 * resume() pending forever), which would record silence. Rejecting lets the
 * caller fall back to an encoder that needs no realtime playback.
 */
async function resumeOrFail(audioContext: AudioContext): Promise<void> {
  if (audioContext.state !== 'running' && typeof audioContext.resume === 'function') {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, AUDIO_PROCESSING.MEDIA_RECORDER_RESUME_TIMEOUT_MS);
    });
    try {
      await Promise.race([audioContext.resume(), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
  if (audioContext.state !== 'running') {
    throw new Error(ERROR_MESSAGES.MEDIA_RECORDER_SUSPENDED);
  }
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
