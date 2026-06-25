import { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import type { SceneId } from '../contexts/themes';
import { animatedBackdropAllowed } from './scenes/motion';

/**
 * Full-viewport ambient backdrop for the active theme: a cosmic photo base
 * (`.scene-photo`) brought alive by pointer parallax, autonomous drift and
 * colour haze. Composites on the GPU; never touches the Web Audio graph; freezes
 * on a still frame under `prefers-reduced-motion`.
 *
 * Key constraint: parallax drives `transform` (via --px/--py) while drift drives
 * `background-position`, so the two animations never fight over one property.
 * `daybreak` has no photo, so it keeps pure CSS layers and gets no parallax/haze.
 */
const SCENES: Record<SceneId, React.ReactNode> = {
  daybreak: (
    <>
      <div className="day-sun" />
      <div className="day-cloud-a" />
      <div className="day-cloud-b" />
      <div className="day-cloud-c" />
    </>
  ),
  dusk: <div className="scene-photo scene-photo-dusk" />,
  tidal: <div className="scene-photo scene-photo-tidal" />,
  nocturne: <div className="scene-photo scene-photo-nocturne" />,
  aurora: <div className="scene-photo scene-photo-nebula" />,
  horizon: <div className="scene-photo scene-photo-horizon" />,
};

export function AmbientScene() {
  const { def } = useTheme();
  const sceneRef = useRef<HTMLDivElement>(null);
  const isPhoto = def.scene !== 'daybreak';

  // Pointer parallax: publish a normalised cursor offset (--px/--py, ~-1..1) that
  // each layer translates by its own depth factor. rAF-throttled; CSS smooths it.
  useEffect(() => {
    const el = sceneRef.current;
    if (!el || !animatedBackdropAllowed()) return;
    let raf = 0;
    let px = 0;
    let py = 0;
    const apply = () => {
      raf = 0;
      el.style.setProperty('--px', px.toFixed(3));
      el.style.setProperty('--py', py.toFixed(3));
    };
    const onMove = (e: PointerEvent) => {
      px = (e.clientX / window.innerWidth - 0.5) * 2;
      py = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // `def.scene` keys both the layer markup and the `.scene-<id>` CSS.
  return (
    <div ref={sceneRef} className={`scene scene-${def.scene}`} aria-hidden="true">
      {SCENES[def.scene]}
      {isPhoto && (
        <>
          <div className="scene-haze scene-haze-a" />
          <div className="scene-haze scene-haze-b" />
        </>
      )}
      <div className="scene-veil" />
      {/* Bloom that swells with the music; lives behind the glass, not over the UI. */}
      <div className="scene-breath" />
      {/* Drifting dust whose density rises with treble. */}
      <div className="scene-particles" />
      {isPhoto && (
        <div className="scene-meteors">
          <span className="meteor" />
          <span className="meteor" />
          <span className="meteor" />
          <span className="meteor" />
        </div>
      )}
      <div className="hud-scanlines" />
      <div className="hud-vignette" />
    </div>
  );
}
