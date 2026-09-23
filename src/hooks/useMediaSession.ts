import { useEffect, useRef } from 'react';
import { coverUrl } from '../utils/coverUrl';

interface MediaSessionInput {
  title: string | null;
  artist: string | null;
  cover: Blob | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

/**
 * Tells the OS what's playing (media overlay, lock screen, headset buttons)
 * and routes its play/pause/next/previous back to the player. Best effort:
 * browsers without the Media Session API simply skip it.
 */
export function useMediaSession({ title, artist, cover, isPlaying, onPlay, onPause, onNext, onPrevious }: MediaSessionInput) {
  const handlers = useRef({ onPlay, onPause, onNext, onPrevious });
  useEffect(() => {
    handlers.current = { onPlay, onPause, onNext, onPrevious };
  });

  const session = typeof navigator !== 'undefined' && 'mediaSession' in navigator ? navigator.mediaSession : null;

  useEffect(() => {
    if (!session) return;
    const bind = (action: MediaSessionAction, fn: () => void) => {
      try {
        session.setActionHandler(action, fn);
      } catch {
        // Action unsupported here.
      }
    };
    bind('play', () => handlers.current.onPlay());
    bind('pause', () => handlers.current.onPause());
    bind('nexttrack', () => handlers.current.onNext());
    bind('previoustrack', () => handlers.current.onPrevious());
    return () => {
      for (const action of ['play', 'pause', 'nexttrack', 'previoustrack'] as MediaSessionAction[]) bind(action, () => {});
    };
  }, [session]);

  useEffect(() => {
    if (!session || typeof MediaMetadata === 'undefined') return;
    if (!title) {
      session.metadata = null;
      return;
    }
    const art = coverUrl(cover);
    session.metadata = new MediaMetadata({
      title,
      artist: artist ?? 'Reverie',
      artwork: art ? [{ src: art }] : [{ src: `${import.meta.env.BASE_URL}icon-512.png`, sizes: '512x512', type: 'image/png' }],
    });
  }, [session, title, artist, cover]);

  useEffect(() => {
    if (session) session.playbackState = isPlaying ? 'playing' : 'paused';
  }, [session, isPlaying]);
}
