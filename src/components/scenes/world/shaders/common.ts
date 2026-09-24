import { SCENE_WORLD } from '../../../../constants';

/**
 * Shared GLSL for every world: the uniform contract with the engine, noise and
 * spectrum helpers, and the common finish (tonemap, dither, fade). Each world
 * supplies `vec3 world(vec2 fragCoord)`; the engine appends this `main`.
 */

export const VERTEX_SHADER = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const PRELUDE = `#version 300 es
precision highp float;
precision highp sampler3D;

uniform vec2 uRes;
uniform float uTime;      // seconds, always running
uniform float uTravel;    // integrated forward motion (world units), faster with the music
uniform float uLevel;     // smoothed energies 0..1
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uPlaying;   // 0..1 eased: music is flowing
uniform vec4 uKicks;      // seconds since the last four kicks (large = none)
/* Mood tokens as light (linear), which is what the worlds shade with. The
   engine linearises them on the CPU once per palette read: a per-pixel pow on
   frame-constant values was twelve log2/exp2 pairs for nothing. */
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform vec3 uBg;
uniform vec3 uBackground; // the background as authored (sRGB 0..1), for the fade
uniform float uLight;     // 1 on the light palette
uniform vec2 uPointer;    // eased pointer, -1..1
uniform float uFade;      // world intro/outro 0..1
uniform vec2 uJitter;     // sub-pixel offset, new every frame (temporal anti-aliasing)
uniform float uSeed;      // per-frame noise seed: march jitter averages out across frames
uniform sampler2D uSpec;  // spectrum history: x = band (low..high), y = row (time)
uniform float uSpecHead;  // fractional row of "now"
uniform sampler3D uNoise3;
uniform sampler2D uNoise2;

out vec4 outColor;

/* How near what this pixel shows is: 0 on the horizon and in the sky, 1 at
   your feet. The world sets it; it rides out in alpha so the present pass can
   move near things more than far ones on a nod (parallax, after the temporal
   accumulation - no smear). */
float gNear = 0.0;

#define PI 3.14159265
#define TAU 6.28318531
#define SPEC_BANDS ${SCENE_WORLD.BANDS.toFixed(1)}
#define SPEC_ROWS ${SCENE_WORLD.HISTORY_ROWS.toFixed(1)}
#define SPEC_RATE ${SCENE_WORLD.HISTORY_RATE.toFixed(1)}

/* One hardware-filtered fetch per octave (see noiseTextures.ts). */
vec4 noise3v(vec3 p) { return texture(uNoise3, p * (1.0 / 16.0)); }
float noise3(vec3 p) { return noise3v(p).r; }
float fbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise3(p);
    p = p * 2.02 + vec3(3.1, 1.7, 5.3);
    a *= 0.5;
  }
  return v / 0.9375;
}
/* Ridged fbm: sharp creases where the noise crosses its midline - filaments, veins. */
float ridged3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    float n = 1.0 - abs(noise3(p) * 2.0 - 1.0);
    v += a * n * n;
    p = p * 2.03 + vec3(1.3, 4.7, 2.9);
    a *= 0.5;
  }
  return v / 0.9375;
}
vec2 noise2v(vec2 p) { return texture(uNoise2, p * (1.0 / 32.0)).rg; }
float noise2(vec2 p) { return noise2v(p).r; }
float fbm2(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise2(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p + vec2(7.3, 2.1);
    a *= 0.5;
  }
  return v / 0.96875;
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

/* Procedural value noise with a quintic fade: C2-smooth, so anything shaded
   from its derivatives (water normals) stays smooth. The texture noise is
   hardware-bilinear - fine for volumes, but its normals facet. */
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

/* Per-pixel, per-frame offset for ray starts: banding becomes noise, and the
   temporal accumulation averages that noise away. */
float rayJitter(vec2 fragCoord) {
  return fract(hash12(fragCoord) + uSeed * 0.61803399);
}

/* The music, as the worlds remember it: band 0..1 (low..high), age in seconds. */
float spec(float band, float age) {
  float row = uSpecHead - age * SPEC_RATE;
  float u = (clamp(band, 0.0, 1.0) * (SPEC_BANDS - 1.0) + 0.5) / SPEC_BANDS;
  return texture(uSpec, vec2(u, (row + 0.5) / SPEC_ROWS)).r;
}
float specNow(float band) { return spec(band, 0.0); }

/* Envelope of the most recent kicks - a sharp flash that rings down. */
float kickFlash(float decay) {
  return max(max(exp(-uKicks.x * decay), exp(-uKicks.y * decay) * 0.6), exp(-uKicks.z * decay) * 0.35);
}

/* x^2 for Gaussian falloffs: GLSL leaves pow() undefined for a negative base,
   and some drivers return NaN for it - which the TAA then spreads as black. */
float sq(float x) { return x * x; }

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

/* Sparse twinkling stars on a direction, two depths. */
vec3 starfield(vec3 rd, float density) {
  vec3 col = vec3(0.0);
  for (int l = 0; l < 2; l++) {
    float scale = 90.0 + float(l) * 130.0;
    vec3 p = rd * scale;
    vec3 id = floor(p);
    vec3 f = fract(p) - 0.5;
    float h = hash13(id + float(l) * 37.0);
    float th = 1.0 - density * (l == 0 ? 0.035 : 0.06);
    if (h > th) {
      float tw = 0.65 + 0.35 * sin(uTime * (1.5 + h * 4.0) + h * 40.0) + uTreble * 0.6;
      float b = (h - th) / (1.0 - th);
      col += mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.9, 0.8), fract(h * 13.0)) * (1.0 - smoothstep(0.0, 0.12, length(f))) * b * tw * 2.2;
    }
  }
  return col;
}

vec3 tonemap(vec3 x) {
  /* ACES filmic fit (Narkowicz) - rolls highlights off like film instead of clipping. */
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

vec3 world(vec2 fragCoord);

void main() {
  vec3 col = world(gl_FragCoord.xy + uJitter);
  col = tonemap(max(col, 0.0));
  col = pow(col, vec3(1.0 / 2.2));
  float f = smoothstep(0.0, 1.0, uFade);
  col = mix(uBackground, col, f);
  outColor = vec4(col, clamp(gNear, 0.0, 1.0));
}
`;

/**
 * Temporal accumulation: each frame's jittered render is folded into a running
 * history, so edges resolve to true anti-aliasing and the volumes' march noise
 * melts into smooth gradients. The history is clamped to the current frame's
 * 3x3 colour range (slightly widened so noise still averages) - motion and kicks
 * can't leave ghosts behind.
 */
export const ACCUMULATE_SHADER = `#version 300 es
precision highp float;
uniform sampler2D uCurrent;
uniform sampler2D uHistory;
uniform float uBlend;
out vec4 outColor;
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  ivec2 hi = textureSize(uCurrent, 0) - 1;
  vec4 cur = texelFetch(uCurrent, p, 0);
  vec4 mn = cur;
  vec4 mx = cur;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      if (x == 0 && y == 0) continue; /* the centre is cur, already folded in */
      vec4 c = texelFetch(uCurrent, clamp(p + ivec2(x, y), ivec2(0), hi), 0);
      mn = min(mn, c);
      mx = max(mx, c);
    }
  }
  /* Nearness (alpha) is resolved like colour: jittered edges average out. */
  vec4 widen = (mx - mn) * 0.35;
  vec4 hist = clamp(texelFetch(uHistory, p, 0), mn - widen, mx + widen);
  outColor = mix(cur, hist, uBlend);
}
`;

/**
 * Final pass: a gentle sharpen (the accumulation softens a touch), the
 * cross-fade from the previous world's last frame on a mood switch, and dither
 * against banding.
 */
export const PRESENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform sampler2D uSnapshot;
uniform float uMix;
uniform float uSharpen;
uniform float uSeed;
// The head nod: its envelope (0..1) and how far the nearest things rise at
// its peak (fraction of the frame height).
uniform float uNod;
uniform float uNodLift;
out vec4 outColor;
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
/* Catmull-Rom in 9 bilinear taps: a sub-pixel shift that stays sharp (a plain
   bilinear read at half a texel is a two-texel average - the nod would blur
   the frame on every beat). */
vec3 sharpSample(sampler2D tex, vec2 uv, vec2 size) {
  vec2 pos = uv * size;
  vec2 t1 = floor(pos - 0.5) + 0.5;
  vec2 f = pos - t1;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 t0 = (t1 - 1.0) / size;
  vec2 t3 = (t1 + 2.0) / size;
  vec2 t12 = (t1 + w2 / w12) / size;
  vec3 c = texture(tex, vec2(t0.x, t0.y)).rgb * w0.x * w0.y
    + texture(tex, vec2(t12.x, t0.y)).rgb * w12.x * w0.y
    + texture(tex, vec2(t3.x, t0.y)).rgb * w3.x * w0.y
    + texture(tex, vec2(t0.x, t12.y)).rgb * w0.x * w12.y
    + texture(tex, vec2(t12.x, t12.y)).rgb * w12.x * w12.y
    + texture(tex, vec2(t3.x, t12.y)).rgb * w3.x * w12.y
    + texture(tex, vec2(t0.x, t3.y)).rgb * w0.x * w3.y
    + texture(tex, vec2(t12.x, t3.y)).rgb * w12.x * w3.y
    + texture(tex, vec2(t3.x, t3.y)).rgb * w3.x * w3.y;
  return max(c, 0.0);
}
void main() {
  vec2 size = vec2(textureSize(uImage, 0));
  // At rest (uNod 0) this lands on texel centres: the taps read exactly what
  // texelFetch did, so the nod costs nothing when it's still.
  vec2 uv = gl_FragCoord.xy / size;
  // Parallax: near things rise with the nod, the horizon holds. A backward
  // warp: read from below by the nearness found there - the nearest within
  // the lift, so a near edge rises over the far one instead of staying put
  // while its inside slides. No zoom: a uniform magnification puts every
  // pixel on a different sub-pixel phase and softens the frame on each beat.
  float lift = uNod * uNodLift;
  float near = max(texture(uImage, uv).a,
    max(texture(uImage, uv - vec2(0.0, lift * 0.5)).a, texture(uImage, uv - vec2(0.0, lift)).a));
  uv.y -= lift * near;
  vec2 px = 1.0 / size;
  vec3 c = sharpSample(uImage, uv, size);
  vec3 n = texture(uImage, uv + vec2(0.0, px.y)).rgb
    + texture(uImage, uv - vec2(0.0, px.y)).rgb
    + texture(uImage, uv + vec2(px.x, 0.0)).rgb
    + texture(uImage, uv - vec2(px.x, 0.0)).rgb;
  c = max(c + (c - n * 0.25) * uSharpen, 0.0);
  if (uMix < 1.0) {
    vec3 before = sharpSample(uSnapshot, uv, vec2(textureSize(uSnapshot, 0)));
    c = mix(before, c, smoothstep(0.0, 1.0, uMix));
  }
  c += (hash(gl_FragCoord.xy + uSeed * 7.13) - 0.5) / 255.0;
  outColor = vec4(c, 1.0);
}
`;
