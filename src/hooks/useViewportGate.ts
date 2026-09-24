import { useEffect, useState } from 'react';
import { VIEWPORT } from '../constants';

const NARROW_QUERY = `(max-width: ${VIEWPORT.MIN_DESKTOP_WIDTH - 1}px)`;
const FINE_POINTER_QUERY = '(pointer: fine)';

/**
 * Browser zoom shrinks the CSS viewport exactly like a small screen does, but
 * the window itself stays wide: `outerWidth` is measured in screen pixels and
 * ignores zoom. A desktop (fine pointer) whose window is still desktop-wide is
 * someone zooming in to read - they keep the app (it scrolls sideways under
 * 1024 CSS px, see index.css) instead of being sent away.
 */
function isGated(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.matchMedia(NARROW_QUERY).matches) return false;
  const zoomedDesktop =
    window.matchMedia(FINE_POINTER_QUERY).matches && window.outerWidth >= VIEWPORT.MIN_DESKTOP_WIDTH;
  return !zoomedDesktop;
}

/**
 * Desktop check, mirroring Wootility's "your window is too small" gate. Follows
 * resizes and zoom changes so the app reveals itself the instant the window
 * crosses the threshold - no reload needed. SSR-safe default.
 */
export function useIsViewportTooNarrow(): boolean {
  const [tooNarrow, setTooNarrow] = useState(isGated);

  useEffect(() => {
    const mql = window.matchMedia(NARROW_QUERY);
    const sync = () => setTooNarrow(isGated());
    mql.addEventListener('change', sync);
    window.addEventListener('resize', sync);
    return () => {
      mql.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  return tooNarrow;
}
