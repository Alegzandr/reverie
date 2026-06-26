import { useEffect, useState } from 'react';
import { VIEWPORT } from '../constants';

const NARROW_QUERY = `(max-width: ${VIEWPORT.MIN_DESKTOP_WIDTH - 1}px)`;

/**
 * Width-based desktop check, mirroring Wootility's "your window is too small"
 * gate. Tracks `matchMedia` so the app reveals itself the instant the viewport
 * crosses the threshold (rotate, resize) — no reload needed. SSR-safe default.
 */
export function useIsViewportTooNarrow(): boolean {
  const [tooNarrow, setTooNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(NARROW_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(NARROW_QUERY);
    const onChange = (e: MediaQueryListEvent) => setTooNarrow(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return tooNarrow;
}
