import { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import type { SceneId } from '../contexts/themes';
import { animatedBackdropAllowed } from './scenes/motion';

/**
 * Full-viewport ambient backdrop for the immersive themes — the living scene
 * you can lose yourself in while a track plays. Mounted only when an immersive
 * theme is active; it composites on the GPU and never competes with the Web
 * Audio graph. All motion is silenced under `prefers-reduced-motion` (the scene
 * freezes on a still frame).
 *
 * Wallpaper-Engine approach: each immersive scene is a real cosmic image as the
 * full-bleed base layer (<div.scene-photo>), made alive by light layers on top:
 * pointer parallax at several depths + slow autonomous drift + drifting colour
 * haze. To avoid conflicts, parallax drives `transform` (via the --px/--py vars,
 * smoothed by a CSS transition) while autonomous drift drives `background-position`
 * (keyframes) — the two never fight over the same property.
 * The former procedural scenes (NebulaScene/nebulaShader, TidalScene/waterShader)
 * are retired from the render but kept orphaned. `light` (daybreak) has no dropped
 * image, so it keeps its CSS layers and gets no parallax/haze.
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

  // Pointer parallax — the Wallpaper-Engine "depth" feel. Publishes a normalised
  // cursor offset (--px/--py, roughly -1..1) on the scene root; each layer reads
  // it and translates by its own depth factor. rAF-throttled, written straight to
  // the element's style; the layers' CSS transition does the smoothing. Desktop +
  // fine pointer + no-reduce only (matches the rest of the scene-motion strategy).
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

  // Every theme has an animated background — the HUD is the one interface.
  // `def.scene` keys both the layer markup and the `.scene-<id>` CSS.
  return (
    <div ref={sceneRef} className={`scene scene-${def.scene}`} aria-hidden="true">
      {SCENES[def.scene]}
      {/* Drifting colour haze — two soft, blurred blobs at different depths that
          parallax with the pointer and drift on their own. The atmosphere that
          sells the image as a living place. Photo scenes only. */}
      {isPhoto && (
        <>
          <div className="scene-haze scene-haze-a" />
          <div className="scene-haze scene-haze-b" />
        </>
      )}
      <div className="scene-veil" />
      {/* Environmental light that swells with the music — the bloom lives in the
          backdrop layer so it brightens the scene behind the glass rather than
          tinting over the UI. Cut on photo scenes (see CSS) so it never washes
          out the image. */}
      <div className="scene-breath" />
      {/* Drifting dust whose brightness/density rises with treble (the air/highs).
          Two parallax depths via ::before/::after; motion gated to desktop. */}
      <div className="scene-particles" />
      <div className="hud-scanlines" />
      <div className="hud-vignette" />
    </div>
  );
}
