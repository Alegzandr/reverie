import { useCallback, useEffect, useRef, useState } from 'react';
import { initGLScene } from './webgl/glScene';
import { WATER_FRAG } from './webgl/waterShader';
import { animatedBackdropAllowed } from './motion';

/** Where the moon sits (fraction of width/height). Shared by the GL shader and
 *  the canvas fallback so the reflection always sits under the moon. */
const MOON_X = 0.62;
const HORIZON_Y = 0.5;

/* ── Desktop: live WebGL water (the "paquet") ──────────────────────────────── */
function WaterGL({ onError }: { onError: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let handle: { dispose: () => void } | undefined;
    try {
      handle = initGLScene(canvas, WATER_FRAG);
    } catch (err) {
      // No WebGL or shader failure → let the parent drop to the canvas scene.
      console.warn('[Tidal] WebGL unavailable, falling back:', err);
      onError();
      return;
    }
    return () => handle?.dispose();
  }, [onError]);
  return <canvas ref={ref} className="tidal-canvas" aria-hidden="true" />;
}

/* ── Canvas moonglade (desktop fallback when no WebGL, or a still mobile frame) */
function TidalWater({ animate }: { animate: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    let raf = 0;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const moonX = MOON_X * w;
      const horizonY = HORIZON_Y * h;
      const waterH = h - horizonY;
      if (waterH <= 0) return;
      ctx.globalCompositeOperation = 'lighter';

      const step = 2;
      for (let y = horizonY; y < h; y += step) {
        const d = (y - horizonY) / waterH;
        const halfW = 5 + d * 72;
        const amp = 2 + d * 24;
        const wob =
          Math.sin(y * 0.05 + t * 0.0016) * amp + Math.sin(y * 0.013 - t * 0.0023) * amp * 0.5;
        const cx = moonX + wob;
        const gaps = 0.55 + 0.45 * Math.sin(y * 0.55 - t * 0.006);
        const alpha = (1 - d) * 0.5 * Math.max(0, gaps);
        if (alpha <= 0.012) continue;
        const grad = ctx.createLinearGradient(cx - halfW, 0, cx + halfW, 0);
        grad.addColorStop(0, 'rgba(150,230,255,0)');
        grad.addColorStop(0.5, `rgba(196,242,255,${alpha})`);
        grad.addColorStop(1, 'rgba(150,230,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(cx - halfW, y, halfW * 2, step + 0.6);
      }

      const lines = 8;
      for (let i = 0; i < lines; i++) {
        const baseY = horizonY + ((i + 0.5) / lines) * waterH;
        const y = baseY + Math.sin(t * 0.0009 + i * 1.7) * 7;
        const a = Math.max(0, 0.06 * (1.2 - (y - horizonY) / waterH));
        if (a <= 0.012) continue;
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, 'rgba(120,210,235,0)');
        g.addColorStop(0.5, `rgba(150,228,248,${a})`);
        g.addColorStop(1, 'rgba(120,210,235,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, y, w, 1.4);
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    resize();

    if (!animate) {
      draw(0);
      const onResize = () => {
        resize();
        draw(0);
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      if (now - last < 33) return;
      last = now;
      draw(now);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [animate]);

  return <canvas ref={ref} className="tidal-canvas" aria-hidden="true" />;
}

/** CSS still parts of the water scene (sky, horizon, moon, stars, clouds). */
function TidalSky() {
  return (
    <>
      <div className="tidal-stars" />
      <div className="tidal-cloud-a" />
      <div className="tidal-cloud-b" />
      <div className="tidal-moon" />
      <div className="tidal-horizon" />
    </>
  );
}

export function TidalScene() {
  const [animated] = useState(animatedBackdropAllowed);
  const [glFailed, setGlFailed] = useState(false);
  const onError = useCallback(() => setGlFailed(true), []);

  // Desktop with WebGL: the full procedural shader paints the whole scene.
  if (animated && !glFailed) {
    return <WaterGL onError={onError} />;
  }

  // Desktop without WebGL → animated canvas moonglade. Mobile / reduced-motion →
  // a single still frame. Either way the CSS sky sits behind it.
  return (
    <>
      <TidalSky />
      <TidalWater animate={animated} />
    </>
  );
}
