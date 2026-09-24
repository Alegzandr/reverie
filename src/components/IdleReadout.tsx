import { memo, useLayoutEffect, useRef } from 'react';
import type { PlaybackClock } from '../utils/playbackClock';

interface IdleReadoutProps {
  title: string;
  artist: string | null;
  clock: PlaybackClock;
  duration: number;
}

/**
 * What stays on the visor once the fullscreen cockpit has stepped aside: the
 * track on one line and a hairline of progress, set straight on the glass like
 * the rest of the HUD - no plate, no controls (any movement brings those back).
 * It only shows under `.chrome-idle` (see index.css), and it's a visual echo of
 * the now-playing card, so assistive tech is spared the duplicate.
 */
export const IdleReadout = memo(function IdleReadout({ title, artist, clock, duration }: IdleReadoutProps) {
  const fillRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const paint = () => {
      const r = duration > 0 ? Math.min(1, Math.max(0, clock.get() / duration)) : 0;
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${r.toFixed(5)})`;
    };
    paint();
    return clock.subscribe(paint);
  }, [clock, duration]);

  return (
    <div className="idle-readout" aria-hidden="true">
      <p className="idle-readout-line">
        <span className="idle-readout-title">{title}</span>
        {artist && <span className="idle-readout-artist">{artist}</span>}
      </p>
      <span className="idle-readout-track">
        <span ref={fillRef} className="idle-readout-fill" />
      </span>
    </div>
  );
});
