import { useCallback, useEffect, useRef, useState } from 'react';
import { initGLScene } from './webgl/glScene';
import { NEBULA_FRAG } from './webgl/nebulaShader';
import { animatedBackdropAllowed } from './motion';

/**
 * Nebula Drift backdrop — the cosmic depth layer for the immersive themes. On
 * desktop with WebGL it runs the procedural nebula shader (deep violet base, a
 * focal astre top-right, drifting parallax haze); without WebGL, on touch, or
 * under reduced-motion it drops to the soft CSS veils (the still/cheap frame).
 * Colours are read from the live theme tokens so the same scene recolours per
 * theme once the palette is propagated.
 */

/** Read an `r, g, b` CSS token (0-255 triplet) into a 0-1 vec3 for the shader. */
function readRGB(varName: string, fallback: [number, number, number]): [number, number, number] {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const parts = raw.split(',').map((s) => parseFloat(s.trim()));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return fallback;
  return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
}

/* ── Desktop: live WebGL nebula ─────────────────────────────────────────────── */
function NebulaGL({ onError }: { onError: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let handle: { dispose: () => void } | undefined;
    try {
      handle = initGLScene(canvas, NEBULA_FRAG, {
        u_bg: readRGB('--color-background', [0.035, 0.024, 0.07]),
        u_accent: readRGB('--color-accent', [0.698, 0.361, 0.973]),
        u_ambient: readRGB('--color-ambient', [0.745, 0.376, 0.925]),
      });
    } catch (err) {
      // No WebGL or shader failure → let the parent drop to the CSS veils.
      console.warn('[Nebula] WebGL unavailable, falling back:', err);
      onError();
      return;
    }
    return () => handle?.dispose();
  }, [onError]);
  return <canvas ref={ref} className="scene-canvas" aria-hidden="true" />;
}

/* ── CSS fallback: soft nebula veils (no-WebGL / touch / reduced-motion) ─────── */
function NebulaVeils() {
  return (
    <>
      <div className="aurora-veil-a" />
      <div className="aurora-veil-b" />
      <div className="aurora-veil-c" />
    </>
  );
}

export function NebulaScene() {
  const [animated] = useState(animatedBackdropAllowed);
  const [glFailed, setGlFailed] = useState(false);
  const onError = useCallback(() => setGlFailed(true), []);

  // Desktop with WebGL: the procedural shader paints the whole scene.
  if (animated && !glFailed) {
    return <NebulaGL onError={onError} />;
  }

  // Otherwise the still/cheap CSS veils over the scene base gradient.
  return <NebulaVeils />;
}
