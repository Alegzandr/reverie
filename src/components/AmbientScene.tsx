import { useTheme } from '../contexts/ThemeContext';
import type { SceneId } from '../contexts/themes';
import { TidalScene } from './scenes/TidalScene';
import { NebulaScene } from './scenes/NebulaScene';

/**
 * Full-viewport ambient backdrop for the immersive themes — the living scene
 * you can lose yourself in while a track plays. Mounted only when an immersive
 * theme is active; pure CSS (no binary assets, no canvas), so it composites on
 * the GPU and never competes with the Web Audio graph. All motion is silenced
 * under `prefers-reduced-motion` (the scene freezes on a still frame).
 *
 * Tidal (water) is the production reference; the other three are tasteful V2
 * baselines that already recolour the whole HUD via their theme tokens.
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
  dusk: (
    <>
      <div className="dusk-glow-a" />
      <div className="dusk-glow-b" />
      <div className="dusk-stars" />
    </>
  ),
  tidal: <TidalScene />,
  nocturne: (
    <>
      <div className="noct-glow-a" />
      <div className="noct-glow-b" />
      <div className="noct-stars" />
      <div className="noct-stars-2" />
    </>
  ),
  aurora: <NebulaScene />,
  horizon: (
    <>
      <div className="horizon-glow-a" />
      <div className="horizon-glow-b" />
      <div className="horizon-sun" />
    </>
  ),
};

export function AmbientScene() {
  const { def } = useTheme();

  // Every theme has an animated background — the HUD is the one interface.
  // `def.scene` keys both the layer markup and the `.scene-<id>` CSS.
  return (
    <div className={`scene scene-${def.scene}`} aria-hidden="true">
      {SCENES[def.scene]}
      <div className="scene-veil" />
      {/* Environmental light that swells with the music — the bloom lives in the
          backdrop layer so it brightens the scene behind the glass rather than
          tinting over the UI. Calm and invisible until a track plays. */}
      <div className="scene-breath" />
      {/* Drifting dust whose brightness/density rises with treble (the air/highs).
          Two parallax depths via ::before/::after; motion gated to desktop. */}
      <div className="scene-particles" />
      <div className="hud-scanlines" />
      <div className="hud-vignette" />
    </div>
  );
}
