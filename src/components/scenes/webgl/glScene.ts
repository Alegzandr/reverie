/**
 * Minimal WebGL scene runner — the same approach Wallpaper Engine's "Web"
 * wallpapers use: one full-screen triangle + a fragment shader, run on the GPU.
 * No dependency, no 3D engine. It keeps the main thread (and the Web Audio
 * graph) free: the shader does the work on the GPU.
 *
 * Guardrails for a browser tab (vs a desktop wallpaper): ~30fps cap, paused when
 * the tab is hidden, DPR capped at 1.5, and a clean dispose. If the GL context
 * or shader fails it throws, so the caller can fall back to the CSS/canvas scene.
 */
export interface GLHandle {
  dispose: () => void;
}

const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';

/**
 * Optional static (per-mount) uniforms — e.g. palette colours read from the CSS
 * theme tokens. Set once after the program links (they don't change per frame),
 * keyed by uniform name; the array length picks the setter (1→float … 4→vec4).
 */
export type StaticUniforms = Record<string, number[]>;

export function initGLScene(
  canvas: HTMLCanvasElement,
  frag: string,
  uniforms?: StaticUniforms
): GLHandle {
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
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    throw new Error('program-link: ' + log);
  }
  gl.useProgram(program);

  // Static colour/scalar uniforms (palette tokens etc.) — set once now since
  // they never change for the life of this scene.
  if (uniforms) {
    for (const name in uniforms) {
      const value = uniforms[name];
      const loc = gl.getUniformLocation(program, name);
      if (!loc) continue;
      if (value.length === 1) gl.uniform1f(loc, value[0]);
      else if (value.length === 2) gl.uniform2f(loc, value[0], value[1]);
      else if (value.length === 3) gl.uniform3f(loc, value[0], value[1], value[2]);
      else if (value.length === 4) gl.uniform4f(loc, value[0], value[1], value[2], value[3]);
    }
  }

  // A single oversized triangle covers the clip space — cheaper than a quad.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(program, 'a');
  gl.enableVertexAttribArray(aLoc);
  gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, 'u_res');
  const uTime = gl.getUniformLocation(program, 'u_time');

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

  // First paint immediately so there's no black flash before the loop kicks in.
  gl.uniform1f(uTime, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  let raf = 0;
  let last = 0;
  const t0 = performance.now();
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (document.hidden || lost) return;
    if (now - last < 33) return; // ~30fps
    last = now;
    gl.uniform1f(uTime, now - t0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  raf = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
