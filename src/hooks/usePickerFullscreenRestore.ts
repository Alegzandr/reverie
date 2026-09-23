import { useCallback, useEffect, useRef } from 'react';

/**
 * Opening a native file picker throws the browser out of fullscreen. Selecting
 * files fires `change` (restore right there); cancelling fires nothing, and
 * re-entering fullscreen needs a fresh user activation a focus/timer won't
 * grant. So the restore is armed on the user's next gesture (pointerdown /
 * keydown) - the first moment a valid activation exists - covering both paths.
 */
export function usePickerFullscreenRestore() {
  const wasFullscreenRef = useRef(false);
  const disarmRef = useRef<(() => void) | null>(null);

  const restore = useCallback(() => {
    disarmRef.current?.();
    disarmRef.current = null;
    if (!wasFullscreenRef.current) return;
    wasFullscreenRef.current = false;
    if (typeof document !== 'undefined' && !document.fullscreenElement && document.documentElement.requestFullscreen) {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  /** Wire to the file input's onClick (fires before the dialog opens). */
  const onInputClick = useCallback(() => {
    wasFullscreenRef.current = typeof document !== 'undefined' && Boolean(document.fullscreenElement);
    if (!wasFullscreenRef.current) return;
    // Runs on `click`, after the opening pointerdown/keydown already fired, so
    // the next gesture heard is the one that closes (or follows) the dialog.
    const onGesture = () => restore();
    window.addEventListener('pointerdown', onGesture, { once: true });
    window.addEventListener('keydown', onGesture, { once: true });
    disarmRef.current = () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
  }, [restore]);

  useEffect(() => () => disarmRef.current?.(), []);

  return { onInputClick, restore };
}
