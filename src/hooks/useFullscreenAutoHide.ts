import { useEffect } from 'react';
import type { RefObject } from 'react';
import { FULLSCREEN_CHROME } from '../constants';

const AUTOHIDE_CLASS = 'chrome-autohide';
const IDLE_CLASS = 'chrome-idle';

// A panel the user is actively reading or editing (settings dialog, an open
// select/menu) must not vanish from under them; they're portalled outside the
// shell, so they're looked up document-wide.
const OPEN_OVERLAY_SELECTOR = '[role="dialog"], [role="menu"], [role="listbox"]';

const ACTIVITY_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/**
 * In browser fullscreen, hides the cockpit after a spell of inactivity (panels
 * fade, rails slide off the top and bottom edges) and brings it back on the next
 * movement. Toggles classes straight on the shell (no state, no re-render); the
 * motion itself is pure CSS so reduced motion can drop it, and it's transient:
 * at rest every section is exactly where it was.
 */
export function useFullscreenAutoHide(shellRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const shell = shellRef.current;
    if (!shell) return;

    let timer: number | undefined;
    let armed = false;
    let lastX = NaN;
    let lastY = NaN;

    const scheduleHide = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (document.querySelector(OPEN_OVERLAY_SELECTOR)) {
          scheduleHide();
          return;
        }
        shell.classList.add(IDLE_CLASS);
      }, FULLSCREEN_CHROME.IDLE_HIDE_DELAY_MS);
    };

    const onActivity = (e: Event) => {
      // Browsers fire synthetic pointermoves with unchanged coordinates (layout
      // shifts, entering fullscreen); counting them would keep the panels up forever.
      if (e.type === 'pointermove') {
        const { clientX, clientY } = e as PointerEvent;
        if (clientX === lastX && clientY === lastY) return;
        lastX = clientX;
        lastY = clientY;
      }
      shell.classList.remove(IDLE_CLASS);
      scheduleHide();
    };

    const arm = () => {
      if (armed) return;
      armed = true;
      shell.classList.add(AUTOHIDE_CLASS);
      ACTIVITY_EVENTS.forEach((type) =>
        window.addEventListener(type, onActivity, { passive: true, capture: true })
      );
      scheduleHide();
    };

    const disarm = () => {
      if (!armed) return;
      armed = false;
      window.clearTimeout(timer);
      shell.classList.remove(AUTOHIDE_CLASS, IDLE_CLASS);
      ACTIVITY_EVENTS.forEach((type) =>
        window.removeEventListener(type, onActivity, { capture: true })
      );
    };

    const sync = () => (document.fullscreenElement ? arm() : disarm());
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      disarm();
    };
  }, [shellRef, enabled]);
}
