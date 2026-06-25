import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { WAVEFORM } from '../constants';
import { useWaveform } from '../hooks/useWaveform';
import { shapeEnvelope } from '../utils/waveform';
import { formatClock } from '../utils/formatters';
import type { AudioProcessingOptions } from '../utils/audioProcessor';

interface WaveformTimelineProps {
  buffer?: AudioBuffer | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  options?: AudioProcessingOptions | null;
}

export function WaveformTimeline({
  buffer,
  duration,
  currentTime,
  isPlaying,
  onSeek,
  options,
}: WaveformTimelineProps) {
  const { t } = useTranslation();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  // DAW-style zoom: a constant pixels-per-second, so the content width and the bar count
  // both scale by the stretch factor (1 / rate) and density stays the same. Slowing down
  // makes the clip physically wider (it overflows and scrolls); speeding up makes it
  // shorter, so it sits narrower against the left, time-0 anchored like a real timeline.
  const rate = options?.speedMultiplier || 1;
  const stretch = rate > 0 ? 1 / rate : 1;
  const widthPercent = stretch * 100;
  const barCount = Math.max(WAVEFORM.MIN_BAR_COUNT, Math.round(WAVEFORM.BAR_COUNT * stretch));

  const { bars: sourceBars } = useWaveform({ buffer, bars: barCount });
  // Preview the active effect by reshaping the source envelope in step with the sound.
  const bars = useMemo(() => shapeEnvelope(sourceBars, options), [sourceBars, options]);

  const ratio = duration ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const playhead = ratio * 100;

  const seekFromEvent = (clientX: number) => {
    if (!duration || !contentRef.current) return;
    const rect = contentRef.current.getBoundingClientRect();
    if (!rect.width) return;
    const r = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    onSeek(r * duration);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    try {
      contentRef.current?.setPointerCapture(event.pointerId);
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

  // Keep the playhead in view as it travels through an overflowing (stretched) waveform.
  // Skipped while scrubbing so the auto-follow never fights the user's drag.
  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content || draggingRef.current) return;
    const overflow = content.scrollWidth - viewport.clientWidth;
    if (overflow <= 1) return;
    const playheadPx = ratio * content.scrollWidth;
    const target = Math.min(Math.max(playheadPx - viewport.clientWidth / 2, 0), overflow);
    viewport.scrollLeft = target;
  }, [ratio, stretch, isPlaying]);

  return (
    <div className="relative glass hud-frame rounded-3xl p-5 sm:p-6 flex flex-col gap-5 h-full">
      {/* Slim header (now-playing status + clock) with the HUD scale tucked
          right under it, on a shared header height so it lines up with the
          control rail's header across the grid. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 min-h-7">
          <span
            className={`inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full ${
              isPlaying
                ? 'text-[rgb(var(--color-accent-text))] bg-[rgba(var(--color-accent),0.12)]'
                : 'text-[rgb(var(--color-text-secondary))] bg-[rgba(var(--color-border),0.35)]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isPlaying ? 'bg-[rgb(var(--color-accent))] animate-pulse' : 'bg-[rgb(var(--color-text-secondary))]'
              }`}
              aria-hidden="true"
            />
            {isPlaying ? t('waveform.playing') : t('waveform.idle')}
          </span>
          <p className="text-sm font-semibold tabular-nums text-[rgb(var(--color-text))]" aria-live="polite">
            {formatClock(currentTime)}
            <span className="text-[rgb(var(--color-text-secondary))] font-normal"> / {formatClock(duration)}</span>
          </p>
        </div>
        <div className="hud-ruler" aria-hidden="true" />
      </div>

      {/* Scroll viewport: the ambient glow stays put while the waveform pans inside it.
         A definite height is essential — the parent grid is items-start, so this card is
         content-sized; without a concrete height here the inner h-full chain collapses. */}
      <div
        ref={viewportRef}
        className="relative h-52 sm:h-60 rounded-2xl overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          className="wf-aura pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--color-ambient),0.10),transparent_50%),radial-gradient(circle_at_80%_0%,rgba(var(--color-accent),0.08),transparent_45%)]"
          aria-hidden="true"
        />

        {/* Scrub surface — its width grows with the stretch factor, so it can overflow. */}
        <div
          ref={contentRef}
          data-testid="waveform-timeline"
          className="relative h-full cursor-pointer flex items-center touch-none select-none"
          style={{ width: `${widthPercent}%` }}
          role="slider"
          aria-label={t('waveform.scrub')}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration) || 0}
          aria-valuenow={Math.round(currentTime) || 0}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(e) => {
            if (!duration) return;
            if (e.key === 'ArrowRight') onSeek(Math.min(duration, currentTime + 5));
            if (e.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - 5));
          }}
        >
          {/* Fill the viewport height so bars and playhead share the same extent.
             h-full on each column is essential: the bars size in % against it. */}
          <div className="relative z-10 w-full flex items-center gap-[3px] h-full py-4 px-1 pointer-events-none">
            {bars.map((bar, index) => {
              const barCenter = ((index + 0.5) / bars.length) * 100;
              const played = barCenter <= playhead;
              return (
                <div
                  key={index}
                  className="flex-1 h-full flex items-center"
                  style={{ minWidth: '2px', maxWidth: '8px' }}
                  aria-hidden="true"
                >
                  <div
                    className="w-full rounded-full transition-[height] duration-150 ease-out"
                    style={{
                      height: `${Math.max(WAVEFORM.MIN_BAR_HEIGHT_PERCENT, bar * 100)}%`,
                      background: `linear-gradient(180deg, rgba(var(--color-accent),${played ? 0.95 : 0.4}), rgba(var(--color-accent),${played ? 0.5 : 0.2}))`,
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div
            className="absolute top-4 bottom-4 z-20 w-[2px] bg-[rgb(var(--color-accent))] rounded-full shadow-[0_0_0_8px_rgba(var(--color-accent),0.12)] pointer-events-none"
            style={{ left: `${playhead}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* HUD corner readouts: live status + the active speed / reverb values */}
      <div className="flex items-center justify-between">
        <span className="hud-readout">{isPlaying ? '● Live' : '○ Standby'}</span>
        <span className="hud-readout tabular-nums">
          {rate.toFixed(2)}× · {Math.round((options?.reverbAmount ?? 0) * 100)}% RV
        </span>
      </div>
    </div>
  );
}
