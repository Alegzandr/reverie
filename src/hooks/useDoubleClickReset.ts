import { useCallback, useRef } from 'react';

/**
 * Maximum delay (ms) between two clicks for them to count as a "reset" double-click.
 * Deliberately tighter than the OS double-click threshold (~500ms, and up to 900ms
 * on Windows): that window was lenient enough that two ordinary, separate clicks on
 * a slider would reset it by accident. A deliberate quick double-tap still fits well
 * within this window, while two intentional adjustments do not.
 */
export const DOUBLE_CLICK_RESET_MS = 250;

/**
 * Returns an onClick handler that fires `onReset` only when two clicks land within
 * {@link DOUBLE_CLICK_RESET_MS} of each other. We track the timing ourselves instead
 * of relying on the native `onDoubleClick` event, whose interval is OS-controlled and
 * too forgiving — this is what was causing accidental resets.
 */
export function useDoubleClickReset(onReset: () => void, enabled = true) {
  const lastClickRef = useRef(0);

  return useCallback(
    () => {
      if (!enabled) return;
      const now = performance.now();
      if (now - lastClickRef.current <= DOUBLE_CLICK_RESET_MS) {
        // Consume the pair so a third quick click doesn't re-trigger.
        lastClickRef.current = 0;
        onReset();
      } else {
        lastClickRef.current = now;
      }
    },
    [onReset, enabled],
  );
}
