import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WAVEFORM } from '../constants';
import { useWaveform } from '../hooks/useWaveform';
import { shapeEnvelope } from '../utils/waveform';
import { formatClock } from '../utils/formatters';
import type { AudioProcessingOptions } from '../utils/audioProcessor';

// Bar gradients are CSS-var driven (constant across moods), so hoist them out of
// the per-frame render path. Played bars read brighter than not-yet-played ones.
const BAR_BG_PLAYED =
  'linear-gradient(180deg, rgba(var(--color-accent),0.95), rgba(var(--color-accent),0.5))';
const BAR_BG_UNPLAYED =
  'linear-gradient(180deg, rgba(var(--color-accent),0.4), rgba(var(--color-accent),0.2))';
const BAR_WRAPPER_STYLE = { minWidth: '2px', maxWidth: '8px' } as const;

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
  // While scrubbing we move the playhead visually but defer the actual seek to
  // drag-end, so dragging stops rebuilding the whole audio graph on every
  // pointermove. `dragRatio` drives the on-screen playhead during a drag.
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const dragRatioRef = useRef(0);
  const lastSeekedRatioRef = useRef(0);

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
  // During a drag the playhead follows the pointer; otherwise it follows playback.
  const displayRatio = dragRatio ?? ratio;
  const playhead = displayRatio * 100;
  const playedCount = Math.min(bars.length, Math.max(0, Math.round(displayRatio * bars.length)));

  // Pre-shaped, stable per-bar style objects: recomputed only when the bar heights
  // change (a new waveform / speed step), never on the ~60fps playhead tick.
  const barStyles = useMemo(
    () =>
      bars.map((b) => {
        const height = `${Math.max(WAVEFORM.MIN_BAR_HEIGHT_PERCENT, b * 100)}%`;
        return {
          played: { height, background: BAR_BG_PLAYED },
          unplayed: { height, background: BAR_BG_UNPLAYED },
        };
      }),
    [bars]
  );

  // The bar column reconciles only when the heights or the played-count change, so
  // React bails out of it on the per-frame App re-render (O(1) instead of O(bars)).
  const barEls = useMemo(
    () =>
      barStyles.map((s, index) => (
        <div
          key={index}
          className="flex-1 h-full flex items-center"
          style={BAR_WRAPPER_STYLE}
          aria-hidden="true"
        >
          <div
            className="w-full rounded-full transition-[height] duration-150 ease-out"
            style={index < playedCount ? s.played : s.unplayed}
          />
        </div>
      )),
    [barStyles, playedCount]
  );

  const ratioFromEvent = (clientX: number) => {
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return null;
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    const r = ratioFromEvent(event.clientX);
    if (r === null) return;
    draggingRef.current = true;
    try {
      contentRef.current?.setPointerCapture(event.pointerId);
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
    if (!draggingRef.current || !duration) return;
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
    if (duration && dragRatioRef.current !== lastSeekedRatioRef.current) {
      onSeek(dragRatioRef.current * duration);
    }
    setDragRatio(null);
  };

  // Auto-follow the playhead through an overflowing (stretched) waveform without a
  // forced reflow each frame: layout metrics are cached and refreshed only when the
  // content actually resizes (ResizeObserver), not read on the per-frame tick.
  const metricsRef = useRef({ scrollWidth: 0, clientWidth: 0 });
  const ratioRef = useRef(ratio);

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    metricsRef.current = { scrollWidth: content.scrollWidth, clientWidth: viewport.clientWidth };
  }, []);

  const follow = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || draggingRef.current) return;
    const { scrollWidth, clientWidth } = metricsRef.current;
    const overflow = scrollWidth - clientWidth;
    if (overflow <= 1) return;
    const playheadPx = ratioRef.current * scrollWidth;
    const target = Math.min(Math.max(playheadPx - clientWidth / 2, 0), overflow);
    viewport.scrollLeft = target;
  }, []);

  // Refresh cached metrics on real size changes; the per-frame effect just consumes
  // them. ResizeObserver is feature-detected (absent under jsdom).
  useEffect(() => {
    measure();
    follow();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      measure();
      follow();
    });
    const content = contentRef.current;
    const viewport = viewportRef.current;
    if (content) ro.observe(content);
    if (viewport) ro.observe(viewport);
    return () => ro.disconnect();
  }, [measure, follow, stretch, bars.length]);

  // Per-frame auto-follow: no layout reads here - follow() uses cached metrics.
  useEffect(() => {
    ratioRef.current = ratio;
    follow();
  }, [ratio, stretch, isPlaying, follow]);

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
         A definite height is essential - the parent grid is items-start, so this card is
         content-sized; without a concrete height here the inner h-full chain collapses. */}
      <div
        ref={viewportRef}
        className="relative h-52 sm:h-60 rounded-2xl overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          className="wf-aura pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--color-ambient),0.10),transparent_50%),radial-gradient(circle_at_80%_0%,rgba(var(--color-accent),0.08),transparent_45%)]"
          aria-hidden="true"
        />

        {/* Scrub surface - its width grows with the stretch factor, so it can overflow. */}
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
            {barEls}
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
