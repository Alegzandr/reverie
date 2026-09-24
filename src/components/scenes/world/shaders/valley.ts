/**
 * Echo Valley (horizon mood): a fjord at dusk. Sheer cliffs plunge into a
 * mirror of still water, wall behind wall receding toward the open sea, mist
 * pooled at their feet - and above them a soft aurora of warm light unrolls
 * its veils. The rock never moves: the music lives in the sky. The veils
 * brighten with the track, their fine rays carry the spectrum upward (what
 * plays now at the hem, what played a moment ago higher up), and each downbeat
 * lets a gentle wash of light through the folds. The water holds all of it,
 * darker and cooler. Analytic silhouettes, anti-aliased, crisp at any size.
 */
export const VALLEY = /* glsl */ `
const float WATER = 0.4;
const int WALLS = 4;
/* Seconds of music held per screen unit up an aurora ray. */
const float RAY_MEMORY = 7.0;

/* Ridged fbm: sharp crests and notches - peaks, not plateaus. */
float ridgeNoise(float x, float seed) {
  float h = 0.0;
  float a = 0.55;
  float f = 1.0;
  for (int i = 0; i < 5; i++) {
    float n = 1.0 - abs(noise2(vec2(x * f, seed + float(i) * 13.1)) * 2.0 - 1.0);
    h += a * n * n;
    f *= 2.15;
    a *= 0.48;
  }
  return h;
}

/* The aurora: two soft ribbons of light undulating across the upper sky, faintly
   combed. The spectrum rides each ribbon from left to right, and rises through
   its combing - what plays now at the lower edge, older music above. */
vec3 fjordAurora(vec2 q, float aspect) {
  vec3 col = vec3(0.0);
  float band = clamp(q.x / aspect + 0.5, 0.0, 1.0);
  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    float x = q.x * (1.0 - fk * 0.25) + fk * 3.1;
    float centre = 0.76 + fk * 0.08 + 0.06 * sin(x * 1.7 + uTime * 0.025 + fk * 2.4) + 0.04 * (fbm2(vec2(x * 0.9 + fk * 5.0, uTime * 0.008)) - 0.5);
    float off = q.y - centre;
    float width = 0.035 + 0.02 * fk + 0.012 * sin(x * 2.3 + fk);
    /* Sharper below, trailing off above: light falling from a hem. */
    float ribbon = exp(-sq(off / (off < 0.0 ? width * 0.22 : width * 1.5)));
    float comb = 0.5 + 0.5 * pow(noise2(vec2(x * 30.0 + fk * 11.0, uTime * 0.03 + fk)), 1.5);
    float s = spec(band, clamp(off + width, 0.0, 1.0) * RAY_MEMORY);
    float music = mix(0.7, 0.4 + s * 1.2, uPlaying);
    vec3 hemColor = mix(uColB, vec3(1.0, 0.55, 0.62), 0.3);
    vec3 topColor = mix(uColA, vec3(0.62, 0.52, 1.0), 0.45);
    col += mix(hemColor, topColor, smoothstep(-0.01, 0.07, off)) * ribbon * comb * music * (0.36 - fk * 0.2);
  }
  return col * (1.0 + uLevel * 0.35 * uPlaying + kickFlash(1.8) * 0.3 * uPlaying);
}

vec3 fjordSky(vec2 q, float aspect) {
  float y = clamp((q.y - WATER) / (1.0 - WATER), 0.0, 1.0);
  /* Deep dusk indigo overhead, the last warm light low over the open sea. */
  vec3 high = mix(uBg, vec3(0.03, 0.03, 0.09), 0.5) * 0.7;
  vec3 mid = mix(uBg, vec3(0.2, 0.12, 0.3), 0.5) * 0.5;
  vec3 low = mix(uColA, vec3(1.0, 0.55, 0.4), 0.35) * 0.3;
  vec3 c = mix(low, mid, smoothstep(0.0, 0.22, y));
  c = mix(c, high, smoothstep(0.2, 0.85, y));
  vec3 rd = normalize(vec3(q.x, y * 0.9 + 0.1, 1.0));
  c += starfield(rd, 0.9) * smoothstep(0.3, 0.8, y);
  return c + fjordAurora(q, aspect);
}

vec3 world(vec2 fragCoord) {
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((fragCoord.x / uRes.x - 0.5) * aspect, fragCoord.y / uRes.y);

  /* The water mirrors the whole scene, barely stirred - and never by the music. */
  float under = step(p.y, WATER);
  float depth = clamp((WATER - p.y) / WATER, 0.0, 1.0);
  vec2 q = p;
  q.y = mix(p.y, 2.0 * WATER - p.y, under);
  float ripple = sin(p.y * 240.0 / (0.25 + depth) - uTime * 0.8) + 0.5 * sin(p.y * 470.0 / (0.3 + depth) + uTime * 0.6);
  q.x += ripple * 0.0009 * depth * under;

  vec3 col = fjordSky(q, aspect);

  /* Dusk air between the walls, and the ink of the nearest rock. */
  vec3 haze = mix(mix(uColA, vec3(1.0, 0.6, 0.45), 0.4) * 0.16, vec3(0.1, 0.08, 0.2), 0.6);
  vec3 ink = vec3(0.012, 0.012, 0.03) + uBg * 0.15;
  for (int i = 0; i < WALLS; i++) {
    float fi = float(i);
    float near = fi / float(WALLS - 1);               /* 0 far .. 1 near */
    float px = q.x + uPointer.x * 0.02 * near;
    float side = px < 0.0 ? -1.0 : 1.0;
    float ax = abs(px);
    /* Each wall pair leaves a gap that narrows with distance - the fjord's
       vanishing channel - and each side is pitched a little differently. */
    float gap = mix(0.05, 0.46, pow(near, 1.25)) * (1.0 + 0.22 * side * (hash12(vec2(fi, 2.0)) - 0.5));
    float face = mix(0.012, 0.045, near);
    float rise = smoothstep(gap, gap + face, ax);
    /* Crests: jagged ridgelines, climbing away from the channel. */
    float crest = ridgeNoise(ax * mix(3.2, 1.6, near) + fi * 9.0 + side * 3.7, fi * 4.0 + side);
    float tall = mix(0.08, 0.42, pow(near, 1.1));
    float h = WATER + rise * (tall * (0.45 + 0.75 * crest) + (ax - gap) * mix(0.05, 0.2, near));
    float dist = q.y - h;
    float edge = fwidth(dist) * 1.2 + 0.0004;
    float body = (1.0 - smoothstep(-edge, edge, dist)) * step(0.001, rise);
    /* Aerial perspective: far walls stay in the dusk air, near ones go to ink,
       each darkening toward its foot. */
    float vertical = smoothstep(WATER, max(h, WATER + 0.001), q.y);
    vec3 rock = mix(haze * 0.8, ink, 0.45 + pow(near, 0.8) * 0.55);
    rock = mix(rock * 0.7, rock, vertical);
    /* Strata: faint vertical grain in the rock, and the inner faces - turned
       to the open sea - catching the last warm light. */
    rock *= 0.9 + 0.2 * noise2(vec2(ax * mix(90.0, 45.0, near) + fi * 7.0, q.y * 3.0));
    float innerFace = 1.0 - smoothstep(gap, gap + face * 2.5, ax);
    rock += mix(uColA, vec3(1.0, 0.6, 0.45), 0.4) * innerFace * (0.05 + (1.0 - near) * 0.05) * (1.0 - vertical * 0.6);
    /* The aurora's glow grazing each crest. */
    /* (Bounded: far above a crest the unbounded exp overflows, and inf * 0 in
       the mix below would be NaN - a black hole in the sky.) */
    rock += mix(uColB, vec3(0.9, 0.6, 0.8), 0.5) * exp(min(dist, 0.0) / 0.0022) * (0.1 + (1.0 - near) * 0.06);
    /* Mist pooled at the waterline between the walls. */
    rock = mix(rock, haze * 1.25, (1.0 - smoothstep(WATER, WATER + 0.02 + (1.0 - near) * 0.03, q.y)) * (0.45 - near * 0.35));
    col = mix(col, rock, body);
  }

  /* Water: darker and cooler than what it holds, a faint sheen far off. */
  vec3 water = col * mix(0.7, 0.45, depth) + uColC * 0.004;
  water += mix(uColB, vec3(1.0, 0.7, 0.6), 0.4) * exp(-depth * 40.0) * 0.03;
  col = mix(col, water, under);
  return col;
}
`;
