import { memo, useCallback, useEffect, useState } from 'react';
import { useMood } from '../contexts/MoodContext';
import { MOODS, MOOD_ORDER, worldPoster } from '../contexts/moods';
import { prefersReducedMotion } from './scenes/motion';
import { detectGpuTier } from './scenes/webgl/gpu';
import { SceneWorld } from './scenes/SceneWorld';

/**
 * The world behind the interface. Two layers:
 *
 *  - Posters: a still of every world, stacked, the active one faded in. They
 *    paint instantly, carry the mood while the live world compiles, and ARE
 *    the backdrop wherever it can't run (no WebGL2, software rendering, the
 *    living world switched off) - cross-fading on a mood switch.
 *  - The living world (SceneWorld): the real-time, music-driven scene. It
 *    fades in over the posters once its first frame is up, then handles mood
 *    switches itself (an in-engine cross-fade). Under reduced motion it still
 *    runs, but paints one calm frame per change and never moves.
 *
 * Over everything sits the helmet: the visor's rounded rim, a breath of glare
 * and two edge rulers - the glass the whole interface is projected on.
 *
 * Mounted once at the app root, above the welcome/workspace split, so starting
 * a session never recompiles or blinks the world.
 */

/** Live rendering is for real desktops: a fine pointer and room to breathe. */
function canRenderLive(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  const desktop = window.matchMedia('(min-width: 768px) and (pointer: fine)').matches;
  return desktop && detectGpuTier() !== 'software';
}

export const AmbientScene = memo(function AmbientScene() {
  const { def } = useMood();
  const [capable] = useState(canRenderLive);
  const [still] = useState(prefersReducedMotion);
  const [failed, setFailed] = useState(false);
  const [live, setLive] = useState(false);

  const runWorld = capable && !failed;

  // Leaving the live world (GPU failure) drops back to the poster immediately.
  useEffect(() => {
    if (runWorld) return;
    const id = window.setTimeout(() => setLive(false), 0);
    return () => window.clearTimeout(id);
  }, [runWorld]);

  // Lets the rest of the stylesheet know a real-time world is on screen.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('world-live', live && runWorld);
    return () => root.classList.remove('world-live');
  }, [live, runWorld]);

  const onReady = useCallback(() => setLive(true), []);
  const onFail = useCallback(() => {
    setFailed(true);
    setLive(false);
  }, []);

  return (
    <>
      <div className={`scene${live && runWorld ? ' is-live' : ''}`} aria-hidden="true">
        <div className="scene-posters">
          {MOOD_ORDER.map((id) => {
            const world = MOODS[id].world;
            return (
              <img
                key={id}
                src={worldPoster(world)}
                alt=""
                decoding="async"
                className={`scene-poster${world === def.world ? ' is-active' : ''}`}
              />
            );
          })}
        </div>
        {runWorld && <SceneWorld world={def.world} still={still} onReady={onReady} onFail={onFail} />}
        <div className="scene-veil" />
        <div className="scene-vignette" />
      </div>
      {/* The visor glass you look through: over the interface too (the HUD is
          projected on it), never catching a pointer. */}
      <div className="helmet" aria-hidden="true">
        <span className="helmet-ticks is-left" />
        <span className="helmet-ticks is-right" />
      </div>
    </>
  );
});
