import { ERROR_MESSAGES } from '../constants';

export interface ErrorCopy {
  key: string;
  params?: Record<string, string | number>;
}

/**
 * The engine reports errors in plain English (they also land in the console and
 * the tests); the listener sees them in their own language. Each raw message is
 * mapped by its origin onto a translated line that names the problem and the
 * way out, never the exception text.
 */
export function describeError(raw: string): ErrorCopy {
  const tooLarge = /Maximum size is (\d+)/.exec(raw);
  if (tooLarge) return { key: 'errors.tooLarge', params: { max: Number(tooLarge[1]) } };
  if (raw.startsWith(ERROR_MESSAGES.LOAD_FAILED)) return { key: 'errors.loadFailed' };
  if (raw === ERROR_MESSAGES.PROCESS_FAILED) return { key: 'errors.processFailed' };
  if (raw === ERROR_MESSAGES.NO_AUDIO_TO_PLAY || raw === ERROR_MESSAGES.NO_AUDIO_TO_EXPORT) return { key: 'errors.noAudio' };
  if (raw.startsWith(ERROR_MESSAGES.EXPORT_FAILED) || /MIME type|MediaRecorder/.test(raw)) return { key: 'errors.exportFailed' };
  return { key: 'errors.generic' };
}
