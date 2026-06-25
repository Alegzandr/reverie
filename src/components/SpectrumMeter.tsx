import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface SpectrumMeterProps {
  /** Returns the live analyser node, or null while stopped. */
  getAnalyser: () => AnalyserNode | null;
  isPlaying: boolean;
  className?: string;
}

const BAR_COUNT = 28;
const BAR_GAP = 2; // device-independent px between bars

/**
 * A compact live spectrum read off the playback analyser — the little instrument
 * that makes the transport feel alive without competing with the waveform. It
 * draws real frequency data while a track plays; when idle (or under
 * prefers-reduced-motion) it settles to a calm, static baseline rather than
 * faking motion.
 */
export function SpectrumMeter({ getAnalyser, isPlaying, className }: SpectrumMeterProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let freq: Uint8Array<ArrayBuffer> | null = null;
    // Smoothed bar heights (0..1) so idle decay and motion read softly.
    const levels = new Array(BAR_COUNT).fill(0.12);

    const resolve = (name: string, fallback: string) => {
      const v = getComputedStyle(canvas).getPropertyValue(name).trim();
      return v ? `rgb(${v})` : fallback;
    };

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      const analyser = getAnalyser();
      if (analyser && isPlaying) {
        if (!freq || freq.length !== analyser.frequencyBinCount) {
          freq = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
        }
        analyser.getByteFrequencyData(freq);
        // Map the (mostly low-end) spectrum onto our bars with a gentle log-ish
        // spread so mids/highs aren't crushed into the last few bars.
        const usable = Math.floor(freq.length * 0.7);
        for (let i = 0; i < BAR_COUNT; i++) {
          const idx = Math.floor(((i + 1) / BAR_COUNT) ** 1.6 * (usable - 1));
          const target = (freq[idx] ?? 0) / 255;
          levels[i] += (target - levels[i]) * 0.35;
        }
      } else {
        for (let i = 0; i < BAR_COUNT; i++) {
          levels[i] += (0.12 - levels[i]) * 0.15;
        }
      }

      const accent = resolve('--color-accent', 'rgb(167,139,250)');
      const ambient = resolve('--color-ambient', 'rgb(56,224,232)');
      const grad = ctx.createLinearGradient(0, cssH, 0, 0);
      grad.addColorStop(0, ambient);
      grad.addColorStop(1, accent);
      ctx.fillStyle = grad;

      const barW = (cssW - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT;
      const radius = Math.min(barW / 2, 2);
      for (let i = 0; i < BAR_COUNT; i++) {
        const h = Math.max(2, levels[i] * cssH);
        const x = i * (barW + BAR_GAP);
        const y = cssH - h;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, h, radius);
        ctx.fill();
      }

      // Keep animating while playing; settle to one static frame otherwise.
      const settling = levels.some((l) => Math.abs(l - 0.12) > 0.01);
      if (!reduceMotion && (isPlaying || settling)) {
        raf = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [getAnalyser, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={t('studio.levels')}
      className={className}
    />
  );
}
