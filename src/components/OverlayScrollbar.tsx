import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * A true overlay scrollbar for a scroll container.
 *
 * Styled `::-webkit-scrollbar`s stay *classic* on Chromium/Windows: they always
 * reserve their gutter the moment content overflows, carving a bare strip down
 * the right edge. We don't want that - the cockpit content should span the full
 * width. So the target's native scrollbar is hidden outright (`.overlay-scroll`,
 * in index.css) and this component paints a floating thumb over it instead,
 * driven straight from the container's scroll geometry.
 *
 * The thumb is portaled to <body> so no transformed ancestor (the raked consoles,
 * the boot choreography) can trap its `position: fixed`. It reveals only while
 * `.is-scrolling` is live on <html> (the same signal the old native thumb used),
 * on hover, or while being dragged - and fades back out when idle. Track insets
 * keep it clear of the sticky top/bottom HUD rails.
 */
export function OverlayScrollbar({
  target,
  insetTop = 68,
  insetBottom = 84,
}: {
  target: React.RefObject<HTMLElement | null>;
  /** Gap (px) between the track top and the viewport top - clears the top rail. */
  insetTop?: number;
  /** Gap (px) between the track bottom and the viewport bottom - clears the bottom rail. */
  insetBottom?: number;
}) {
  const [geom, setGeom] = useState<{ top: number; height: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  // Live scroll<->thumb mapping, refreshed on every measure so the drag handler
  // (bound once) always converts pointer travel with the current ratio.
  const mapRef = useRef({ overflow: 0, travel: 0 });

  useEffect(() => {
    const el = target.current;
    if (!el) return;

    const measure = () => {
      const { scrollHeight, clientHeight, scrollTop } = el;
      const overflow = scrollHeight - clientHeight;
      if (overflow <= 1) {
        setGeom(null);
        mapRef.current = { overflow: 0, travel: 0 };
        return;
      }
      const rect = el.getBoundingClientRect();
      const trackTop = rect.top + insetTop;
      const trackHeight = Math.max(0, rect.height - insetTop - insetBottom);
      const thumbHeight = Math.max(
        40,
        Math.min(trackHeight, (clientHeight / scrollHeight) * trackHeight),
      );
      const travel = trackHeight - thumbHeight;
      const top = trackTop + (travel > 0 ? (scrollTop / overflow) * travel : 0);
      mapRef.current = { overflow, travel };
      setGeom({ top, height: thumbHeight });
    };

    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    // The ResizeObserver fires once on observe (initial geometry) and again on
    // every size change. Content height drives scrollHeight but the observer
    // only reports a box's own size, so observe the direct children too - the
    // thumb then resizes when the effects console expands or a track loads.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    Array.from(el.children).forEach((child) => ro.observe(child));
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, [target, insetTop, insetBottom]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = target.current;
    const thumb = thumbRef.current;
    if (!el || !thumb) return;
    e.preventDefault();
    thumb.setPointerCapture(e.pointerId);
    setDragging(true);
    const startY = e.clientY;
    const startScroll = el.scrollTop;

    const onMove = (ev: PointerEvent) => {
      const { overflow, travel } = mapRef.current;
      if (travel <= 0) return;
      el.scrollTop = startScroll + ((ev.clientY - startY) / travel) * overflow;
    };
    const onUp = (ev: PointerEvent) => {
      setDragging(false);
      try {
        thumb.releasePointerCapture(ev.pointerId);
      } catch {
        /* pointer already released */
      }
      thumb.removeEventListener('pointermove', onMove);
      thumb.removeEventListener('pointerup', onUp);
      thumb.removeEventListener('pointercancel', onUp);
    };
    thumb.addEventListener('pointermove', onMove);
    thumb.addEventListener('pointerup', onUp);
    thumb.addEventListener('pointercancel', onUp);
  };

  if (!geom) return null;

  return createPortal(
    <div
      ref={thumbRef}
      onPointerDown={onPointerDown}
      className={`overlay-scroll-thumb${dragging ? ' is-dragging' : ''}`}
      style={{ top: geom.top, height: geom.height }}
      aria-hidden="true"
    />,
    document.body,
  );
}
