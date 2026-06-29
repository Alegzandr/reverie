import { useRef, useState } from 'react';
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
  // Click the trailing clock to flip between total duration and time remaining.
  // Independent from the panel's own toggle.
  const [showRemaining, setShowRemaining] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  // Defer the seek (and its audio-graph rebuild) to drag-end; the fill/thumb track
  // the pointer visually via `dragRatio` while scrubbing.
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const dragRatioRef = useRef(0);
  const lastSeekedRatioRef = useRef(0);

  const baseRatio = duration ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const progress = (dragRatio ?? baseRatio) * 100;

  const ratioFromEvent = (clientX: number) => {
    if (disabled || !duration || !trackRef.current) return null;
    const rect = trackRef.current.getBoundingClientRect();
    if (!rect.width) return null;
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const r = ratioFromEvent(event.clientX);
    if (r === null) return;
    draggingRef.current = true;
    try {
      trackRef.current?.setPointerCapture(event.pointerId);
    } catch {
      // setPointerCapture is unavailable in some environments; dragging still works.
    }
    // Seek immediately on press so a plain click still jumps the playhead.
    setDragRatio(r);
    dragRatioRef.current = r;
    lastSeekedRatioRef.current = r;
    onSeek(r * duration);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const r = ratioFromEvent(event.clientX);
    if (r === null) return;
    // Visual only - the real seek (and graph rebuild) is deferred to drag-end.
    setDragRatio(r);
    dragRatioRef.current = r;
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    // Commit the final position once; skip a redundant seek if the pointer never
    // moved off the press point (a plain click already seeked there).
    if (!disabled && duration && dragRatioRef.current !== lastSeekedRatioRef.current) {
      onSeek(dragRatioRef.current * duration);
    }
    setDragRatio(null);
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

      <button
        type="button"
        onClick={() => setShowRemaining((v) => !v)}
        className="text-xs font-medium tabular-nums text-[rgb(var(--color-text-secondary))] w-12 text-left shrink-0 transition-colors hover:text-[rgb(var(--color-text))] focus-visible:text-[rgb(var(--color-text))] cursor-pointer"
        aria-label={t('waveform.toggleRemaining')}
        aria-pressed={showRemaining}
      >
        {showRemaining ? `-${formatClock(duration - currentTime)}` : formatClock(duration)}
      </button>
    </div>
  );
}
