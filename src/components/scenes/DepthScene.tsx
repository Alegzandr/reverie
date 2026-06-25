import { useCallback, useEffect, useRef, useState } from 'react';
import { initDepthScene } from './webgl/depthScene';
import { animatedBackdropAllowed } from './motion';

/**
 * Depth-map 2.5D parallax backdrop. On desktop with WebGL it samples the photo
 * (plus an optional depth map) and offsets each pixel by depth × cursor, so the
 * flat cosmic image gains real volume as the mouse moves — the Wallpaper-Engine
 * signature. Without WebGL, on touch, or under reduced-motion it drops to the
 * plain CSS photo (`.scene-photo` + the per-scene image class), which keeps its
 * own gentle pointer parallax + slow pan.
 *
 * `depthUrl` is optional: when omitted the shader uses a procedural centred-dome
 * depth (good enough to read as 2.5D); drop a real `*-depth` map later to upgrade.
 */
interface DepthSceneProps {
  /** Full-bleed photo URL (served from /public). */
  photo: string;
  /** The `.scene-photo-*` class used for the CSS fallback (carries the image). */
  fallbackClass: string;
  /** Optional grayscale depth map URL (white = near, black = far). */
  depthUrl?: string;
}

function DepthGL({ photo, depthUrl, onError }: { photo: string; depthUrl?: string; onError: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let handle: { dispose: () => void } | undefined;
    try {
      handle = initDepthScene(canvas, photo, { depthUrl });
    } catch (err) {
      console.warn('[Depth] WebGL unavailable, falling back:', err);
      onError();
      return;
    }
    return () => handle?.dispose();
  }, [photo, depthUrl, onError]);
  return <canvas ref={ref} className="scene-canvas" aria-hidden="true" />;
}

export function DepthScene({ photo, fallbackClass, depthUrl }: DepthSceneProps) {
  const [animated] = useState(animatedBackdropAllowed);
  const [glFailed, setGlFailed] = useState(false);
  const onError = useCallback(() => setGlFailed(true), []);

  if (animated && !glFailed) {
    return <DepthGL photo={photo} depthUrl={depthUrl} onError={onError} />;
  }
  return <div className={`scene-photo ${fallbackClass}`} />;
}
