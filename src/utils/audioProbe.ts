import { PLAYLIST } from '../constants';

/**
 * Cheap duration read for playlist rows: an <audio preload="metadata"> parses
 * the container header without decoding the whole track, so a 40-song drop
 * shows its running times in moments instead of burning seconds (and hundreds
 * of MB) on decodeAudioData per file. Resolves null when the browser can't
 * tell (unknown container, streaming WebM reporting Infinity, timeout); the
 * exact duration lands later anyway when the track is actually decoded.
 */
export function probeDuration(file: Blob, timeoutMs: number = PLAYLIST.DURATION_PROBE_TIMEOUT_MS): Promise<number | null> {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.muted = true;
    let url: string | null = null;
    let settled = false;

    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute('src');
      if (url) URL.revokeObjectURL(url);
      resolve(value);
    };

    const timer = window.setTimeout(() => finish(null), timeoutMs);
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      finish(Number.isFinite(d) && d > 0 ? d : null);
    };
    audio.onerror = () => finish(null);

    try {
      url = URL.createObjectURL(file);
      audio.src = url;
    } catch {
      finish(null);
    }
  });
}
