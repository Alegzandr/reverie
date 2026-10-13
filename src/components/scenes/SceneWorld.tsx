import { memo, useEffect, useRef } from 'react';
import { createWorldEngine, type WorldEngine } from './world/engine';
import { currentWorldAnalyser } from './world/analyserSource';
import type { WorldId } from './world/worlds';

interface SceneWorldProps {
  world: WorldId;
  /** Reduced motion: the world accumulates one calm frame per change and rests. */
  still: boolean;
  onReady: () => void;
  onFail: () => void;
  /** The GL context was lost; onReady fires again once a restore paints. */
  onLost: () => void;
}

/**
 * React's thin hold on the world engine: it owns the canvas and forwards mood
 * changes. The engine is created once per mount (switching worlds cross-fades
 * inside it - no remount, no recompile of a world already seen).
 */
export const SceneWorld = memo(function SceneWorld({ world, still, onReady, onFail, onLost }: SceneWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<WorldEngine | null>(null);
  // The engine is built with whatever world is current at mount; later changes
  // go through setWorld, so the creating effect must not depend on `world`.
  const worldRef = useRef(world);
  const callbacks = useRef({ onReady, onFail, onLost });
  useEffect(() => {
    callbacks.current = { onReady, onFail, onLost };
    worldRef.current = world;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createWorldEngine(canvas, {
      getAnalyser: currentWorldAnalyser,
      world: worldRef.current,
      still,
      onReady: () => callbacks.current.onReady(),
      onFail: () => callbacks.current.onFail(),
      onLost: () => callbacks.current.onLost(),
    });
    if (!engine) {
      callbacks.current.onFail();
      return;
    }
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [still]);

  useEffect(() => {
    engineRef.current?.setWorld(world);
  }, [world]);

  return <canvas ref={canvasRef} className="scene-world" aria-hidden="true" />;
});
