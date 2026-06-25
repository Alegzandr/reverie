/**
 * Depth-map 2.5D parallax runner — builds on the same minimal-WebGL approach as
 * glScene.ts (one full-screen triangle + fragment shader, ~30fps, paused when the
 * tab is hidden, DPR capped, clean dispose, NO loseContext so StrictMode remounts
 * survive). This variant adds what depth parallax needs: image textures (the photo
 * + an optional depth map) and a per-frame `u_mouse` driven by a smoothed pointer.
 *
 * The photo loads asynchronously; the draw loop simply waits (clearing to black)
 * until the texture is ready, then paints every frame. If the GL context or shader
 * fails it throws synchronously so the caller can fall back to the CSS photo.
 */
import { DEPTH_FRAG } from './depthShader';

export interface DepthHandle {
  dispose: () => void;
}

const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';

export interface DepthOptions {
  /** Optional grayscale depth map URL (white = near, black = far). */
  depthUrl?: string;
  /** UV displacement amplitude [x, y]. Larger = more pronounced parallax. */
  amp?: [number, number];
  /** Living-light strength — how much bright sources vary in intensity (0 = off). */
  light?: number;
}

export function initDepthScene(
  canvas: HTMLCanvasElement,
  photoUrl: string,
  opts: DepthOptions = {}
): DepthHandle {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: 'low-power',
  }) as WebGLRenderingContext | null;
  if (!gl) throw new Error('webgl-unavailable');

  const compile = (type: number, src: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('shader-alloc');
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('shader-compile: ' + log);
    }
    return shader;
  };

  const program = gl.createProgram();
  if (!program) throw new Error('program-alloc');
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, DEPTH_FRAG);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('program-link: ' + gl.getProgramInfoLog(program));
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(program, 'a');
  gl.enableVertexAttribArray(aLoc);
  gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, 'u_res');
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uMouse = gl.getUniformLocation(program, 'u_mouse');
  const uImgAspect = gl.getUniformLocation(program, 'u_imgAspect');
  const uHasDepth = gl.getUniformLocation(program, 'u_hasDepth');
  const uAmp = gl.getUniformLocation(program, 'u_amp');
  gl.uniform1i(gl.getUniformLocation(program, 'u_tex'), 0);
  gl.uniform1i(gl.getUniformLocation(program, 'u_depth'), 1);
  const amp = opts.amp ?? [0.035, 0.028];
  gl.uniform2f(uAmp, amp[0], amp[1]);
  gl.uniform2f(uMouse, 0, 0);
  gl.uniform1f(uHasDepth, 0);
  gl.uniform1f(uImgAspect, 1);
  gl.uniform1f(gl.getUniformLocation(program, 'u_light'), opts.light ?? 0.16);

  // ── Textures ──────────────────────────────────────────────────────────────
  // NPOT-safe: CLAMP_TO_EDGE + LINEAR, no mipmaps. Y is flipped on upload so the
  // shader's top-origin assumption holds.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  const makeTex = (unit: number) => {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // 1x1 black placeholder until the image arrives.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  };
  const photoTex = makeTex(0);
  const depthTex = makeTex(1);

  let photoReady = false;
  let disposed = false;
  const loadImage = (
    url: string,
    tex: WebGLTexture | null,
    unit: number,
    onLoad: (img: HTMLImageElement) => void
  ) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (disposed) return;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      onLoad(img);
    };
    img.src = url;
  };

  loadImage(photoUrl, photoTex, 0, (img) => {
    if (img.naturalHeight > 0) gl.uniform1f(uImgAspect, img.naturalWidth / img.naturalHeight);
    photoReady = true;
  });
  if (opts.depthUrl) {
    loadImage(opts.depthUrl, depthTex, 1, () => gl.uniform1f(uHasDepth, 1));
  }

  // ── Sizing ──────────────────────────────────────────────────────────────
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const resize = () => {
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  resize();
  window.addEventListener('resize', resize);

  // ── Pointer (smoothed) ────────────────────────────────────────────────────
  let tx = 0;
  let ty = 0; // target, -1..1
  let mx = 0;
  let my = 0; // smoothed
  const onMove = (e: PointerEvent) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  let lost = false;
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
  };
  const onRestored = () => {
    lost = false;
  };
  canvas.addEventListener('webglcontextlost', onLost, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);

  // ── Loop ──────────────────────────────────────────────────────────────────
  let raf = 0;
  let last = 0;
  const t0 = performance.now();
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (document.hidden || lost) return;
    if (now - last < 33) return; // ~30fps
    last = now;
    // ease the pointer toward its target so motion is silky, not steppy
    mx += (tx - mx) * 0.08;
    my += (ty - my) * 0.08;
    gl.uniform2f(uMouse, mx, my);
    gl.uniform1f(uTime, now - t0);
    if (photoReady) gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  raf = requestAnimationFrame(frame);

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
      gl.deleteTexture(photoTex);
      gl.deleteTexture(depthTex);
      // See glScene.ts: deliberately NOT calling loseContext().
    },
  };
}
