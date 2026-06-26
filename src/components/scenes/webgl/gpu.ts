/**
 * GPU capability probe. Reverie's ambient scene is composited entirely on the GPU
 * (CSS transforms, backdrop-filter blur, haze/particle/meteor layers). When the
 * browser's hardware acceleration is off — or the GPU is blocklisted — the browser
 * falls back to a software rasterizer and every one of those layers is painted on
 * the CPU, which is what makes the cockpit feel sluggish.
 *
 * The most reliable, non-flaky signal for that (far better than guessing from a
 * dropped-frame counter) is the WebGL renderer string: a software path reports
 * SwiftShader / llvmpipe / "Microsoft Basic Render". We read it from a throwaway
 * context, then release the context immediately.
 *
 *   'hardware' — GPU compositing available (or we can't tell → assume fine, never nag)
 *   'software' — CPU rasterizer confirmed → degrade the scene + nudge the user
 *   'none'     — no WebGL at all (could be a privacy blocker, so we don't degrade)
 */
export type GpuTier = 'hardware' | 'software' | 'none';

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|software|microsoft basic|basic render/;

let cached: GpuTier | undefined;

export function detectGpuTier(): GpuTier {
  if (cached) return cached;
  if (typeof document === 'undefined') return (cached = 'none');

  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return (cached = 'none');

    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)).toLowerCase()
      : '';

    // Free the probe context right away; we only needed the renderer string.
    gl.getExtension('WEBGL_lose_context')?.loseContext();

    return (cached = SOFTWARE_RENDERER.test(renderer) ? 'software' : 'hardware');
  } catch {
    return (cached = 'none');
  }
}
