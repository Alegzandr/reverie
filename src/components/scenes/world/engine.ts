import { SCENE_WORLD } from '../../../constants';
import { IDLE_FRAME_MS, frameDeltaSeconds } from '../frameClock';
import { createMoodPaletteCache } from '../paletteReader';
import { createAudioFeed, type AudioFeed } from './audioFeed';
import { buildNoise2D, buildNoise3D } from './noiseTextures';
import { ACCUMULATE_SHADER, PRELUDE, PRESENT_SHADER, VERTEX_SHADER } from './shaders/common';
import { WORLD_SHADERS, WORLD_SPEED, type WorldId } from './worlds';

/**
 * The living-world renderer: one WebGL2 canvas behind the whole app, painting
 * the active mood's world and feeding it the music (spectrum history texture,
 * energies, kicks). Framework-free on purpose - React only mounts the canvas.
 *
 * Image quality: every frame is rendered with a sub-pixel jitter into an
 * offscreen target, folded into a running history (temporal anti-aliasing: clean
 * edges, march noise resolved into smooth gradients), then presented with a
 * gentle sharpen and dither. Budget: the resolution adapts to the measured frame
 * time (raymarched worlds pay per pixel), the loop idles at ~30fps without
 * music, pauses while the tab is hidden, and a `still` engine accumulates a
 * short burst of frames and rests (the reduced-motion world: same place, no motion).
 */

export interface WorldEngineOptions {
  getAnalyser: () => AnalyserNode | null;
  world: WorldId;
  /** Reduced motion: accumulate one calm frame per change, never loop. */
  still: boolean;
  /** First frame is on screen - the fallback photo may retire. */
  onReady?: () => void;
  /** The world can't run here (no WebGL2, compile failure, lost context). */
  onFail?: () => void;
  /** Pin the render scale (diagnostics / captures); adaptive when omitted. */
  fixedScale?: number;
}

export interface WorldEngine {
  setWorld(id: WorldId): void;
  dispose(): void;
}

type UniformName =
  | 'uRes' | 'uTime' | 'uTravel' | 'uLevel' | 'uBass' | 'uMid' | 'uTreble' | 'uPlaying' | 'uKicks'
  | 'uAccent' | 'uAmbient' | 'uGlow' | 'uBackground' | 'uLight' | 'uPointer' | 'uFade' | 'uSpec' | 'uSpecHead'
  | 'uNoise3' | 'uNoise2' | 'uJitter' | 'uSeed';

const UNIFORMS: UniformName[] = [
  'uRes', 'uTime', 'uTravel', 'uLevel', 'uBass', 'uMid', 'uTreble', 'uPlaying', 'uKicks',
  'uAccent', 'uAmbient', 'uGlow', 'uBackground', 'uLight', 'uPointer', 'uFade', 'uSpec', 'uSpecHead',
  'uNoise3', 'uNoise2', 'uJitter', 'uSeed',
];

interface Program {
  program: WebGLProgram;
  loc: Record<UniformName, WebGLUniformLocation | null>;
}

interface Target {
  tex: WebGLTexture;
  fbo: WebGLFramebuffer;
}

/** Texture units: the world's inputs, then the post passes' images. */
const UNIT = { spec: 0, noise3: 1, noise2: 2, current: 3, history: 4, snapshot: 5 } as const;

/** Fixed time the still (reduced-motion) frame is painted at - a composed moment, not t=0. */
const STILL_TIME = 24;

/** Halton(2,3) - well-spread sub-pixel offsets for the jitter sequence. */
function halton(index: number, base: number): number {
  let f = 1;
  let r = 0;
  let i = index;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
}
const JITTER = Array.from({ length: 16 }, (_, i) => [halton(i + 1, 2) - 0.5, halton(i + 1, 3) - 0.5]);

const parseTriplet = (value: string, fallback: [number, number, number]): [number, number, number] => {
  const m = value.split(',').map((x) => parseFloat(x));
  if (m.length < 3 || m.some((n) => Number.isNaN(n))) return fallback;
  return [m[0] / 255, m[1] / 255, m[2] / 255];
};

export function createWorldEngine(canvas: HTMLCanvasElement, options: WorldEngineOptions): WorldEngine | null {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  });
  if (!gl) return null;

  const { still, getAnalyser } = options;
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const feed: AudioFeed = createAudioFeed(getAnalyser);

  // ── GPU resources ──────────────────────────────────────────────────────────
  let vs: WebGLShader | null = null;
  let quad: WebGLBuffer | null = null;
  let specTex: WebGLTexture | null = null;
  let noise3Tex: WebGLTexture | null = null;
  let noise2Tex: WebGLTexture | null = null;
  let accumProg: WebGLProgram | null = null;
  let presentProg: WebGLProgram | null = null;
  let scene: Target | null = null;
  let history: [Target, Target] | null = null;
  /** The last presented frame of the world we're leaving, cross-faded out on a switch. */
  let snapshot: Target | null = null;
  let lastPresented: Target | null = null;
  let targetW = 0;
  let targetH = 0;
  let floatTargets = false;
  const programs = new Map<WorldId, Program | 'failed'>();
  const pending = new Map<WorldId, { program: WebGLProgram; fs: WebGLShader }>();

  const noise3 = buildNoise3D();
  const noise2 = buildNoise2D();

  const linkSync = (fragment: string): WebGLProgram | null => {
    if (!vs) return null;
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!fs || !program) return null;
    gl.shaderSource(fs, fragment);
    gl.compileShader(fs);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, 'aPos');
    gl.linkProgram(program);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    return program;
  };

  const setupShared = (): boolean => {
    if (gl.isContextLost()) return false;
    vs = gl.createShader(gl.VERTEX_SHADER);
    if (!vs) return false;
    gl.shaderSource(vs, VERTEX_SHADER);
    gl.compileShader(vs);

    quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    // Every program binds aPos to location 0, so one attribute setup serves all.
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    specTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + UNIT.spec);
    gl.bindTexture(gl.TEXTURE_2D, specTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, SCENE_WORLD.BANDS, SCENE_WORLD.HISTORY_ROWS, 0, gl.RED, gl.UNSIGNED_BYTE, feed.history);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    noise3Tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + UNIT.noise3);
    gl.bindTexture(gl.TEXTURE_3D, noise3Tex);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, noise3.size, noise3.size, noise3.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, noise3.data);
    for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, p, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    noise2Tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + UNIT.noise2);
    gl.bindTexture(gl.TEXTURE_2D, noise2Tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, noise2.size, noise2.size, 0, gl.RG, gl.UNSIGNED_BYTE, noise2.data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Half-float targets keep the long dark gradients band-free through the
    // accumulation; plain RGBA8 is the (still dithered) fallback.
    floatTargets = !!gl.getExtension('EXT_color_buffer_float');
    accumProg = linkSync(ACCUMULATE_SHADER);
    presentProg = linkSync(PRESENT_SHADER);
    return !!(accumProg && presentProg);
  };

  const makeTarget = (w: number, h: number): Target | null => {
    const tex = gl.createTexture();
    const fbo = gl.createFramebuffer();
    if (!tex || !fbo) return null;
    gl.activeTexture(gl.TEXTURE0 + UNIT.current);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (floatTargets) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo };
  };

  const dropTarget = (t: Target | null) => {
    if (!t) return;
    gl.deleteTexture(t.tex);
    gl.deleteFramebuffer(t.fbo);
  };

  const dropTargets = () => {
    dropTarget(scene);
    if (history) history.forEach(dropTarget);
    dropTarget(snapshot);
    scene = null;
    history = null;
    snapshot = null;
    lastPresented = null;
    crossfade = 1;
    targetW = targetH = 0;
  };

  let resetHistory = true;
  let crossfade = 1;

  /** Freeze the frame on screen so the next world can fade in over it. */
  const captureSnapshot = () => {
    if (!lastPresented || !targetW) return;
    if (!snapshot) snapshot = makeTarget(targetW, targetH);
    if (!snapshot) return;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, lastPresented.fbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, snapshot.fbo);
    gl.blitFramebuffer(0, 0, targetW, targetH, 0, 0, targetW, targetH, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    crossfade = 0;
  };

  /** (Re)allocate the offscreen targets for a render size; resets the history. */
  const ensureTargets = (w: number, h: number): boolean => {
    if (scene && history && w === targetW && h === targetH) return true;
    dropTargets();
    scene = makeTarget(w, h);
    const a = makeTarget(w, h);
    const b = makeTarget(w, h);
    if (!scene || !a || !b) return false;
    history = [a, b];
    targetW = w;
    targetH = h;
    resetHistory = true;
    return true;
  };

  const releaseAll = () => {
    for (const p of programs.values()) if (p !== 'failed') gl.deleteProgram(p.program);
    for (const p of pending.values()) {
      gl.deleteShader(p.fs);
      gl.deleteProgram(p.program);
    }
    programs.clear();
    pending.clear();
    dropTargets();
    if (accumProg) gl.deleteProgram(accumProg);
    if (presentProg) gl.deleteProgram(presentProg);
    if (vs) gl.deleteShader(vs);
    if (quad) gl.deleteBuffer(quad);
    for (const t of [specTex, noise3Tex, noise2Tex]) if (t) gl.deleteTexture(t);
    vs = quad = specTex = noise3Tex = noise2Tex = null;
    accumProg = presentProg = null;
  };

  // A lost context already freed everything GPU-side; just forget the handles.
  const forgetHandles = () => {
    programs.clear();
    pending.clear();
    vs = quad = specTex = noise3Tex = noise2Tex = null;
    accumProg = presentProg = null;
    scene = null;
    history = null;
    snapshot = null;
    lastPresented = null;
    targetW = targetH = 0;
  };

  /** Start compiling a world (non-blocking where the driver allows it). */
  const request = (id: WorldId) => {
    if (programs.has(id) || pending.has(id) || !vs) return;
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!fs || !program) {
      programs.set(id, 'failed');
      return;
    }
    gl.shaderSource(fs, `${PRELUDE}\n${WORLD_SHADERS[id]}`);
    gl.compileShader(fs);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, 'aPos');
    gl.linkProgram(program);
    pending.set(id, { program, fs });
  };

  /** Finish a pending compile if it's done; returns the ready program, if any. */
  const resolve = (id: WorldId): Program | 'failed' | null => {
    const ready = programs.get(id);
    if (ready) return ready;
    const job = pending.get(id);
    if (!job) return null;
    if (parallel && !gl.getProgramParameter(job.program, parallel.COMPLETION_STATUS_KHR)) return null;
    pending.delete(id);
    if (!gl.getProgramParameter(job.program, gl.LINK_STATUS)) {
      console.warn(`World "${id}" failed to compile:`, gl.getShaderInfoLog(job.fs) || gl.getProgramInfoLog(job.program));
      gl.deleteShader(job.fs);
      gl.deleteProgram(job.program);
      programs.set(id, 'failed');
      return 'failed';
    }
    gl.deleteShader(job.fs);
    const loc = Object.fromEntries(UNIFORMS.map((u) => [u, gl.getUniformLocation(job.program, u)])) as Program['loc'];
    const entry: Program = { program: job.program, loc };
    programs.set(id, entry);
    return entry;
  };

  // ── Palette (re-read only when the mood could have changed) ────────────────
  let colA: [number, number, number] = [0.7, 0.36, 0.97];
  let colB: [number, number, number] = [0.74, 0.38, 0.92];
  let colC: [number, number, number] = [0.47, 0.39, 0.94];
  let bg: [number, number, number] = [0.04, 0.02, 0.07];
  let light = 0;
  const palette = createMoodPaletteCache(() => {
    const cs = getComputedStyle(canvas);
    colA = parseTriplet(cs.getPropertyValue('--color-accent').trim(), colA);
    colB = parseTriplet(cs.getPropertyValue('--color-ambient').trim(), colB);
    colC = parseTriplet(cs.getPropertyValue('--hud-glow').trim(), colC);
    bg = parseTriplet(cs.getPropertyValue('--color-background').trim(), bg);
    light = document.documentElement.classList.contains('dark') ? 0 : 1;
  });

  // ── Pointer parallax (eased in the loop) ───────────────────────────────────
  let pointerTarget = [0, 0];
  const pointer = [0, 0];
  const onPointer = (e: PointerEvent) => {
    pointerTarget = [(e.clientX / window.innerWidth - 0.5) * 2, (e.clientY / window.innerHeight - 0.5) * 2];
  };
  if (!still) window.addEventListener('pointermove', onPointer, { passive: true });

  // ── Loop state ─────────────────────────────────────────────────────────────
  let current: WorldId = options.world;
  let target: WorldId = options.world;
  let fade = 0;
  let time = still ? STILL_TIME : 0;
  let travel = still ? STILL_TIME * 0.6 : 0;
  let raf = 0;
  let lastNow = -1;
  let lastDraw = 0;
  let disposed = false;
  let readyFired = false;
  let scale: number = options.fixedScale ?? SCENE_WORLD.RENDER_SCALE_START;
  let frameEma = 16.7;
  let lastAdapt = 0;
  let viewW = canvas.clientWidth;
  let viewH = canvas.clientHeight;
  let frameIndex = 0;
  let stillFramesLeft: number = SCENE_WORLD.STILL_FRAMES;

  const measure = () => {
    viewW = canvas.clientWidth;
    viewH = canvas.clientHeight;
    if (still) {
      stillFramesLeft = SCENE_WORLD.STILL_FRAMES;
      schedule();
    }
  };
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
  ro?.observe(canvas);

  const uploadHistory = () => {
    const rows = feed.consumeDirty();
    if (!rows.length || !specTex) return;
    gl.activeTexture(gl.TEXTURE0 + UNIT.spec);
    gl.bindTexture(gl.TEXTURE_2D, specTex);
    if (rows.length > SCENE_WORLD.HISTORY_ROWS / 4) {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SCENE_WORLD.BANDS, SCENE_WORLD.HISTORY_ROWS, gl.RED, gl.UNSIGNED_BYTE, feed.history);
      return;
    }
    for (const row of rows) {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, row, SCENE_WORLD.BANDS, 1, gl.RED, gl.UNSIGNED_BYTE, feed.history, row * SCENE_WORLD.BANDS);
    }
  };

  const drawWorld = (prog: Program, w: number, h: number) => {
    const f = feed.frame;
    const { loc } = prog;
    const [jx, jy] = JITTER[frameIndex % JITTER.length];
    gl.useProgram(prog.program);
    gl.uniform2f(loc.uRes, w, h);
    gl.uniform1f(loc.uTime, time);
    gl.uniform1f(loc.uTravel, travel);
    gl.uniform1f(loc.uLevel, f.level);
    gl.uniform1f(loc.uBass, f.bass);
    gl.uniform1f(loc.uMid, f.mid);
    gl.uniform1f(loc.uTreble, f.treble);
    gl.uniform1f(loc.uPlaying, f.playing);
    gl.uniform4f(loc.uKicks, f.kicks[0], f.kicks[1], f.kicks[2], f.kicks[3]);
    gl.uniform3f(loc.uAccent, colA[0], colA[1], colA[2]);
    gl.uniform3f(loc.uAmbient, colB[0], colB[1], colB[2]);
    gl.uniform3f(loc.uGlow, colC[0], colC[1], colC[2]);
    gl.uniform3f(loc.uBackground, bg[0], bg[1], bg[2]);
    gl.uniform1f(loc.uLight, light);
    gl.uniform2f(loc.uPointer, pointer[0], pointer[1]);
    gl.uniform1f(loc.uFade, fade);
    gl.uniform2f(loc.uJitter, jx, jy);
    gl.uniform1f(loc.uSeed, frameIndex % 64);
    // One row behind "now" plus the sub-row fraction: scrolls smoothly and never
    // blends into the row that's about to be overwritten.
    gl.uniform1f(loc.uSpecHead, feed.head - 1 + feed.headFraction);
    gl.uniform1i(loc.uSpec, UNIT.spec);
    gl.uniform1i(loc.uNoise3, UNIT.noise3);
    gl.uniform1i(loc.uNoise2, UNIT.noise2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const render = (prog: Program) => {
    const w = Math.max(2, Math.round(viewW * scale));
    const h = Math.max(2, Math.round(viewH * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    if (!ensureTargets(w, h) || !scene || !history || !accumProg || !presentProg) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.viewport(0, 0, w, h);

    // 1. The world, jittered, into the scene target.
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo);
    drawWorld(prog, w, h);

    // 2. Fold it into the running history.
    const [prev, next] = frameIndex % 2 === 0 ? history : [history[1], history[0]];
    gl.bindFramebuffer(gl.FRAMEBUFFER, next.fbo);
    gl.useProgram(accumProg);
    gl.activeTexture(gl.TEXTURE0 + UNIT.current);
    gl.bindTexture(gl.TEXTURE_2D, scene.tex);
    gl.activeTexture(gl.TEXTURE0 + UNIT.history);
    gl.bindTexture(gl.TEXTURE_2D, prev.tex);
    gl.uniform1i(gl.getUniformLocation(accumProg, 'uCurrent'), UNIT.current);
    gl.uniform1i(gl.getUniformLocation(accumProg, 'uHistory'), UNIT.history);
    const weight = resetHistory ? 0 : SCENE_WORLD.TAA_HISTORY_WEIGHT;
    gl.uniform1f(gl.getUniformLocation(accumProg, 'uBlend'), weight);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    resetHistory = false;

    // 3. Present.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(presentProg);
    gl.activeTexture(gl.TEXTURE0 + UNIT.current);
    gl.bindTexture(gl.TEXTURE_2D, next.tex);
    gl.uniform1i(gl.getUniformLocation(presentProg, 'uImage'), UNIT.current);
    gl.activeTexture(gl.TEXTURE0 + UNIT.snapshot);
    gl.bindTexture(gl.TEXTURE_2D, (snapshot ?? next).tex);
    gl.uniform1i(gl.getUniformLocation(presentProg, 'uSnapshot'), UNIT.snapshot);
    gl.uniform1f(gl.getUniformLocation(presentProg, 'uMix'), snapshot ? crossfade : 1);
    gl.uniform1f(gl.getUniformLocation(presentProg, 'uSharpen'), SCENE_WORLD.PRESENT_SHARPEN);
    gl.uniform1f(gl.getUniformLocation(presentProg, 'uSeed'), frameIndex % 64);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    lastPresented = next;
    frameIndex += 1;

    if (!readyFired) {
      readyFired = true;
      canvas.style.display = '';
      options.onReady?.();
    }
  };

  const fail = () => {
    stop();
    canvas.style.display = 'none';
    options.onFail?.();
  };

  const adaptScale = (now: number, deltaMs: number) => {
    if (options.fixedScale) return;
    frameEma += (deltaMs - frameEma) * 0.08;
    if (now - lastAdapt < SCENE_WORLD.SCALE_ADAPT_INTERVAL_MS) return;
    lastAdapt = now;
    if (frameEma > SCENE_WORLD.SLOW_FRAME_MS && scale > SCENE_WORLD.RENDER_SCALE_MIN) {
      scale = Math.max(SCENE_WORLD.RENDER_SCALE_MIN, scale * 0.88);
    } else if (frameEma < SCENE_WORLD.FAST_FRAME_MS && scale < SCENE_WORLD.RENDER_SCALE_MAX) {
      scale = Math.min(SCENE_WORLD.RENDER_SCALE_MAX, scale * 1.04);
    }
  };

  const frame = (now: number) => {
    raf = 0;
    if (disposed) return;
    if (!still) raf = requestAnimationFrame(frame);
    if (document.hidden) {
      lastNow = -1;
      return;
    }
    const dt = still ? 0 : frameDeltaSeconds(now, lastNow);
    const deltaMs = lastNow < 0 ? 16.7 : now - lastNow;
    lastNow = now;

    if (!still) {
      feed.update(dt);
      pointer[0] += (pointerTarget[0] - pointer[0]) * Math.min(1, dt * 1.5);
      pointer[1] += (pointerTarget[1] - pointer[1]) * Math.min(1, dt * 1.5);
    }

    // Mood switch: once the new world has compiled, freeze the frame on screen
    // and cross-fade the new world in over it (the first frame of an app
    // session instead rises out of the background colour via uFade).
    const swapping = target !== current;
    if (swapping) {
      request(target);
      const next = resolve(target);
      if (next) {
        if (!still) captureSnapshot();
        current = target;
        resetHistory = true;
        stillFramesLeft = SCENE_WORLD.STILL_FRAMES;
      }
    }
    if (fade < 1) fade = still ? 1 : Math.min(1, fade + (dt * 1000) / SCENE_WORLD.WORLD_FADE_IN_MS);
    if (crossfade < 1) crossfade = Math.min(1, crossfade + (dt * 1000) / SCENE_WORLD.WORLD_FADE_IN_MS);

    // Idle: without music the worlds drift - ~30fps is plenty.
    const idle = feed.frame.playing < 0.02 && fade >= 1 && crossfade >= 1 && !swapping;
    if (!still && idle && now - lastDraw < IDLE_FRAME_MS) return;
    lastDraw = now;

    request(current);
    const prog = resolve(current);
    if (prog === 'failed') {
      fail();
      return;
    }
    if (!prog) {
      // Still compiling (parallel compile): keep polling; the photo stays up.
      if (still) schedule();
      return;
    }

    if (!still) {
      const f = feed.frame;
      time += dt;
      travel += dt * WORLD_SPEED[current] * (0.6 + f.level * 0.5 + f.bass * 0.3) * (0.6 + 0.4 * Math.max(f.playing, 0.3));
      adaptScale(now, deltaMs);
    }
    palette.ensure();
    uploadHistory();
    render(prog);

    // A still world accumulates a short burst of jittered frames, then rests.
    if (still) {
      stillFramesLeft -= 1;
      if (stillFramesLeft > 0 || target !== current) schedule();
    }
  };

  function schedule() {
    if (!raf && !disposed) raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  const onVisibility = () => {
    if (!document.hidden) {
      lastNow = -1;
      schedule();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  const onLost = (e: Event) => {
    e.preventDefault();
    stop();
    forgetHandles();
    crossfade = 1;
    canvas.style.display = 'none';
  };
  const onRestored = () => {
    readyFired = false;
    resetHistory = true;
    if (setupShared()) schedule();
    else fail();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  canvas.style.display = 'none';
  if (gl.isContextLost()) {
    gl.getExtension('WEBGL_lose_context')?.restoreContext();
  } else if (!setupShared()) {
    releaseAll();
    return null;
  } else {
    // The canvas itself fades in over the poster (CSS); the world starts whole.
    fade = 1;
    request(current);
    schedule();
  }

  return {
    setWorld(id: WorldId) {
      if (id === target) return;
      target = id;
      request(id);
      if (still) schedule();
    },
    dispose() {
      disposed = true;
      stop();
      ro?.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      feed.dispose();
      if (!gl.isContextLost()) releaseAll();
      // Deliberately no loseContext(): under StrictMode the effect re-runs on the
      // same canvas, and a killed context composites as a white sheet.
    },
  };
}
