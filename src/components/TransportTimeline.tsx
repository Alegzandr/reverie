import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatClock } from '../utils/formatters';

interface TransportTimelineProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Classic transport seekbar: elapsed time, a thin scrubbable track with a draggable
 * playhead, and the total duration. The track sits inside a tall transparent hit area
 * so it's easy to grab without looking like a thick bar.
 */
export function TransportTimeline({
  currentTime,
  duration,
  onSeek,
  disabled,
  className = '',
}: TransportTimelineProps) {
  const { t } = useTranslation();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const progress = duration ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const seekFromEvent = (clientX: number) => {
    if (disabled || !duration || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    onSeek(ratio * duration);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    draggingRef.current = true;
    try {
      trackRef.current?.setPointerCapture(event.pointerId);
    } catch {
      // setPointerCapture is unavailable in some environments; dragging still works.
    }
    seekFromEvent(event.clientX);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    seekFromEvent(event.clientX);
  };

  const endDrag = () => {
    draggingRef.current = false;
  };

  return (
    <div className={`flex items-center gap-3 min-w-0 ${className}`}>
      <span className="text-xs font-medium tabular-nums text-[rgb(var(--color-text-secondary))] w-10 text-right shrink-0">
        {formatClock(currentTime)}
      </span>

      {/* Tall transparent hit area around a thin visible track */}
      <div
        ref={trackRef}
        className={`group relative flex-1 min-w-0 h-6 flex items-center touch-none select-none ${
          disabled ? 'cursor-default opacity-50' : 'cursor-pointer'
        }`}
        role="slider"
        aria-label={t('waveform.scrub')}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration) || 0}
        aria-valuenow={Math.round(currentTime) || 0}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          if (disabled || !duration) return;
          if (e.key === 'ArrowRight') onSeek(Math.min(duration, currentTime + 5));
          if (e.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - 5));
        }}
      >
        {/* Faint HUD graduations above the track */}
        <div className="hud-ruler pointer-events-none absolute inset-x-0 top-0 opacity-30" aria-hidden="true" />

        <div className="relative w-full h-1.5 rounded-full bg-[rgba(var(--color-border),0.55)] overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[rgb(var(--color-accent))]"
            style={{ width: `${progress}%` }}
            aria-hidden="true"
          />
        </div>
        {/* Playhead thumb: appears on hover/focus, always visible while scrubbing */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_2px_6px_-1px_rgba(0,0,0,0.35),0_0_0_4px_rgba(var(--color-accent),0.25)] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          style={{ left: `${progress}%` }}
          aria-hidden="true"
        />
      </div>

      <span className="text-xs font-medium tabular-nums text-[rgb(var(--color-text-secondary))] w-10 shrink-0">
        {formatClock(duration)}
      </span>
    </div>
  );
}
