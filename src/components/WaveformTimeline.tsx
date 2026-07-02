import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WAVEFORM } from '../constants';
import { useWaveform } from '../hooks/useWaveform';
import { useMood } from '../contexts/MoodContext';
import { shapeEnvelope } from '../utils/waveform';
import { formatClock } from '../utils/formatters';
import { createWaveInstrument, type WaveInstrument } from './waveInstrument';
import type { AudioProcessingOptions } from '../utils/audioProcessor';

interface WaveformTimelineProps {
  buffer?: AudioBuffer | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  options?: AudioProcessingOptions | null;
  /** Live playback analyser - feeds the instrument's spectral overlays. */
  getAnalyser?: () => AnalyserNode | null;
}

/**
 * The centre instrument. The track is drawn by the Canvas wave instrument
 * (`waveInstrument.ts`) as a continuous ribbon of light; this component owns
 * everything around the paint: the HUD plate, the clock, seek + keyboard
 * interaction, the DAW-style stretch/scroll behaviour, and the render loop
 * cadence (every display frame while playing, throttled when idle, one paint
 * per change under reduced motion).
 */
export function WaveformTimeline({
  buffer,
  duration,
  currentTime,
  isPlaying,
  onSeek,
  options,
  getAnalyser,
}: WaveformTimelineProps) {
  const { t } = useTranslation();
  const { mood } = useMood();
  // Click the trailing clock to flip between total duration and time remaining.
  // Panel and footer keep their own toggle, so each can be set independently.
  const [showRemaining, setShowRemaining] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  // While scrubbing we move the playhead visually but defer the actual seek to
  // drag-end, so dragging stops rebuilding the whole audio graph on every
  // pointermove. `dragRatio` drives the on-screen playhead during a drag.
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const dragRatioRef = useRef(0);
  const lastSeekedRatioRef = useRef(0);
  // Latest pointer X during a scrub, so the edge auto-scroll loop can recompute
  // the ratio as the content slides underneath a stationary cursor.
  const lastClientXRef = useRef(0);
  // Edge auto-scroll: a rAF that pans the viewport while the pointer rests in a
  // left/right edge zone during a scrub, letting one drag reach the whole clip.
  const edgeRafRef = useRef(0);
  const edgeVelRef = useRef(0);
  // Grab-to-pan (middle / right button): moves the view without seeking.
  const panningRef = useRef(false);
  const panStartRef = useRef({ x: 0, scrollLeft: 0 });

  const reduceMotion = useMemo(
    () =>
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

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

  // The instrument's per-effect signatures (weave, afterglow, core pulse).
  const fx = useMemo(
    () => ({
      reverb: options?.reverbAmount ?? 0,
      is8D: options?.audio8D ?? false,
      rotation: options?.rotationSpeed ?? 0,
      bass: options?.bassBoost ? (options.bassBoostIntensity ?? 0) : 0,
      muffle: options?.bassBoost ? (options.bassUnderwater ?? 0) : 0,
    }),
    [options]
  );

  // Latest inputs for the paint loop, refreshed after every render (the loop
  // itself never re-subscribes on prop churn - it just reads the ref).
  const frameRef = useRef({ env: bars, ratio: displayRatio, isPlaying, reducedMotion: reduceMotion, fx });
  useEffect(() => {
    frameRef.current = { env: bars, ratio: displayRatio, isPlaying, reducedMotion: reduceMotion, fx };
  });

  // The analyser prop is stable in practice, but route it through a ref so the
  // instrument (created once) always reads the current one.
  const getAnalyserRef = useRef(getAnalyser);
  useEffect(() => {
    getAnalyserRef.current = getAnalyser;
  }, [getAnalyser]);

  const instrumentRef = useRef<WaveInstrument | null>(null);

  const ratioFromEvent = (clientX: number) => {
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return null;
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  };

  const stopEdgeScroll = () => {
    if (edgeRafRef.current) cancelAnimationFrame(edgeRafRef.current);
    edgeRafRef.current = 0;
    edgeVelRef.current = 0;
  };

  // The edge-scroll tick: pan the viewport by the current velocity, then re-derive
  // the scrub ratio from the last pointer X (the content moved under the cursor).
  const edgeTick = () => {
    edgeRafRef.current = requestAnimationFrame(edgeTick);
    const viewport = viewportRef.current;
    if (!viewport || edgeVelRef.current === 0) return;
    viewport.scrollLeft += edgeVelRef.current;
    const r = ratioFromEvent(lastClientXRef.current);
    if (r !== null) {
      setDragRatio(r);
      dragRatioRef.current = r;
    }
  };

  // Arm/disarm edge auto-scroll based on how deep the pointer sits in either edge
  // zone of the viewport - only meaningful once the clip actually overflows.
  const updateEdgeScroll = (clientX: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const overflow = viewport.scrollWidth - viewport.clientWidth;
    if (overflow <= 1) {
      stopEdgeScroll();
      return;
    }
    const rect = viewport.getBoundingClientRect();
    const zone = WAVEFORM.EDGE_SCROLL_ZONE_PX;
    let vel = 0;
    if (clientX < rect.left + zone) {
      vel = -((rect.left + zone - clientX) / zone) * WAVEFORM.EDGE_SCROLL_MAX_SPEED;
    } else if (clientX > rect.right - zone) {
      vel = ((clientX - (rect.right - zone)) / zone) * WAVEFORM.EDGE_SCROLL_MAX_SPEED;
    }
    edgeVelRef.current = vel;
    if (vel !== 0 && !edgeRafRef.current) edgeRafRef.current = requestAnimationFrame(edgeTick);
    else if (vel === 0) stopEdgeScroll();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    // Middle or right button starts a grab-to-pan of the view, leaving the
    // playhead untouched. Primary button (or touch/pen) scrubs.
    if (event.button === 1 || event.button === 2) {
      const viewport = viewportRef.current;
      if (!viewport) return;
      panningRef.current = true;
      panStartRef.current = { x: event.clientX, scrollLeft: viewport.scrollLeft };
      try {
        contentRef.current?.setPointerCapture(event.pointerId);
      } catch {
        // setPointerCapture is unavailable in some environments; panning still works.
      }
      if (contentRef.current) contentRef.current.style.cursor = 'grabbing';
      event.preventDefault();
      return;
    }
    if (event.button !== 0) return;
    const r = ratioFromEvent(event.clientX);
    if (r === null) return;
    draggingRef.current = true;
    lastClientXRef.current = event.clientX;
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
    if (panningRef.current) {
      const viewport = viewportRef.current;
      if (!viewport) return;
      // Follow the cursor: dragging right pulls earlier content into view.
      viewport.scrollLeft = panStartRef.current.scrollLeft - (event.clientX - panStartRef.current.x);
      return;
    }
    if (!draggingRef.current || !duration) return;
    const r = ratioFromEvent(event.clientX);
    if (r === null) return;
    lastClientXRef.current = event.clientX;
    // Visual only - the real seek (and graph rebuild) is deferred to drag-end.
    setDragRatio(r);
    dragRatioRef.current = r;
    // A cursor parked at the edge keeps the clip scrolling so one drag can reach
    // positions beyond the current viewport.
    updateEdgeScroll(event.clientX);
  };

  const endDrag = () => {
    if (panningRef.current) {
      panningRef.current = false;
      if (contentRef.current) contentRef.current.style.cursor = '';
      return;
    }
    if (!draggingRef.current) return;
    draggingRef.current = false;
    stopEdgeScroll();
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
  // Bumped on real size changes so the reduced-motion paint path repaints too.
  const [resizeTick, setResizeTick] = useState(0);

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    metricsRef.current = { scrollWidth: content.scrollWidth, clientWidth: viewport.clientWidth };
  }, []);

  const follow = useCallback(() => {
    const viewport = viewportRef.current;
    // Never yank the view back to the playhead while the user is scrubbing or
    // manually panning it.
    if (!viewport || draggingRef.current || panningRef.current) return;
    const { scrollWidth, clientWidth } = metricsRef.current;
    const overflow = scrollWidth - clientWidth;
    if (overflow <= 1) return;
    const playheadPx = ratioRef.current * scrollWidth;
    const target = Math.min(Math.max(playheadPx - clientWidth / 2, 0), overflow);
    viewport.scrollLeft = target;
  }, []);

  // One paint with the freshest layout numbers - the whole draw path in one place.
  const drawNow = useCallback((now?: number) => {
    const viewport = viewportRef.current;
    const instrument = instrumentRef.current;
    if (!viewport || !instrument) return;
    instrument.draw(
      {
        ...frameRef.current,
        contentWidth: metricsRef.current.scrollWidth || viewport.clientWidth,
        scrollLeft: viewport.scrollLeft,
      },
      now ?? performance.now()
    );
  }, []);

  // Mount the instrument once per canvas lifetime.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const instrument = createWaveInstrument(canvas, () => getAnalyserRef.current?.() ?? null);
    instrumentRef.current = instrument;
    return () => {
      instrument?.destroy();
      instrumentRef.current = null;
    };
  }, []);

  // Stop any in-flight edge auto-scroll when the component unmounts.
  useEffect(() => stopEdgeScroll, []);

  // Refresh cached metrics on real size changes; the per-frame effect just consumes
  // them. ResizeObserver is feature-detected (absent under jsdom).
  useEffect(() => {
    measure();
    follow();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      measure();
      follow();
      setResizeTick((n) => n + 1);
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

  // The paint loop. rAF runs at the display's own refresh rate; when the
  // instrument is idle (paused, embers gone) it relaxes to ~30fps so a resting
  // cockpit costs almost nothing. Under reduced motion there is NO loop at all -
  // the effect below paints once per actual change.
  useEffect(() => {
    if (reduceMotion) return;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const f = frameRef.current;
      const idle = !f.isPlaying && !instrumentRef.current?.hasLiveOverlays();
      if (idle && now - last < 33) return;
      last = now;
      drawNow(now);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion, drawNow]);

  // Reduced motion: static paints driven by real state changes (seek, effect
  // tweak, mood swap, scroll, resize) - never a free-running loop.
  useEffect(() => {
    if (!reduceMotion) return;
    drawNow();
    const viewport = viewportRef.current;
    const onScroll = () => drawNow();
    viewport?.addEventListener('scroll', onScroll, { passive: true });
    return () => viewport?.removeEventListener('scroll', onScroll);
  }, [reduceMotion, drawNow, bars, displayRatio, isPlaying, fx, mood, resizeTick]);

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
            <span className="text-[rgb(var(--color-text-secondary))] font-normal">
              {' / '}
              <button
                type="button"
                onClick={() => setShowRemaining((v) => !v)}
                className="font-normal tabular-nums transition-colors hover:text-[rgb(var(--color-text))] focus-visible:text-[rgb(var(--color-text))] cursor-pointer"
                aria-label={t('waveform.toggleRemaining')}
                aria-pressed={showRemaining}
              >
                {showRemaining
                  ? `-${formatClock(duration - currentTime)}`
                  : formatClock(duration)}
              </button>
            </span>
          </p>
        </div>
        <div className="hud-ruler" aria-hidden="true" />
      </div>

      {/* The instrument stage. The canvas is viewport-sized and stays put; the
         transparent scroll layer above it carries the stretched clip (and all
         pointer interaction), and the paint translates by its scrollLeft. A
         definite height is essential - the parent grid is items-start, so this
         card is content-sized; without a concrete height the h-full chain
         collapses. */}
      <div ref={stageRef} className="relative h-52 sm:h-60 rounded-2xl overflow-hidden">
        <div
          className="wf-aura pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--color-ambient),0.10),transparent_50%),radial-gradient(circle_at_80%_0%,rgba(var(--color-accent),0.08),transparent_45%)]"
          aria-hidden="true"
        />
        <canvas ref={canvasRef} className="absolute inset-0 z-10 h-full w-full" aria-hidden="true" />

        {/* Scroll viewport: transparent, above the paint; the clip pans inside it. */}
        <div
          ref={viewportRef}
          className="absolute inset-0 z-20 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* Scrub surface - its width grows with the stretch factor, so it can overflow. */}
          <div
            ref={contentRef}
            data-testid="waveform-timeline"
            className="relative h-full cursor-pointer touch-none select-none"
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
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (!duration) return;
              if (e.key === 'ArrowRight') onSeek(Math.min(duration, currentTime + 5));
              if (e.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - 5));
            }}
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
