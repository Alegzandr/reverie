/**
 * Borealis (dark mood): great arcs of aurora sweeping a deep blue sky, the last
 * of twilight glowing rose and amber behind a jagged range, and all of it held
 * again in a mirror-still lake. Drawn stylised - luminous ribbons, clean
 * silhouettes, a perfect reflection - never simulated.
 *
 * The aurora listens: each ribbon's brightness breathes with the mids, each
 * stretch of sky sways with its own band of the spectrum (low notes to the
 * left, air to the right), and a kick sends a soft surge along the arcs.
 */
export const BOREALIS = /* glsl */ `
const float SHORE = 0.5;

/* Aurora green, pulled a little toward the mood's ambient so each palette
   still owns its sky. */
vec3 boreGreen() {
  return mix(vec3(0.1, 1.0, 0.55), uColB, 0.12);
}

/* One ribbon: a bright lower hem that fades upward into rays. */
float boreRibbon(vec2 q, float base, float amp, float freq, float phase, float width) {
  float t = uTravel * 0.05;
  float bend = base
    + sin(q.x * freq + phase + t) * amp
    + (noise2(vec2(q.x * 1.3 + t * 0.6, phase)) - 0.5) * amp * 1.2;
  float d = q.y - bend;
  /* Sharp hem below, long soft glow above. */
  float hem = exp(-max(-d, 0.0) * 70.0 / width);
  float rise = exp(-max(d, 0.0) * 13.0 / width);
  /* Along its length the ribbon thickens and thins, folds catch more light. */
  float fold = 0.25 + 0.75 * smoothstep(0.25, 0.75, noise2(vec2(q.x * 0.9 + t * 0.4, phase * 3.0)));
  float rays = 0.6 + 0.4 * noise2(vec2(q.x * 26.0 + phase * 7.0, t * 0.8));
  return hem * rise * fold * rays;
}

vec3 boreSky(vec2 q) {
  float y = clamp((q.y - SHORE) / (1.0 - SHORE), 0.0, 1.0);
  /* Deep blue overhead, twilight rose and amber low behind the range. */
  vec3 deep = mix(uBg, uColB * 0.25, 0.35) * 0.9;
  vec3 dusk = mix(uColA, vec3(1.0, 0.55, 0.3), 0.45);
  vec3 c = mix(uColB * 0.12 + deep * 0.6, deep * 0.5, smoothstep(0.1, 0.8, y));
  float twilight = exp(-y * 9.0) * (0.55 + 0.45 * smoothstep(-0.9, 0.3, q.x));
  c += dusk * twilight * 0.32;
  /* Warm cloud bands caught in the last light. */
  float band = smoothstep(0.55, 0.8, fbm2(vec2(q.x * 1.6 + uTime * 0.005, q.y * 16.0)));
  c += dusk * band * exp(-y * 5.0) * 0.12;
  c += starfield(normalize(vec3(q.x, y + 0.05, 1.0)), 1.0) * smoothstep(0.25, 0.7, y) * (0.6 + uTreble * 0.5);

  /* The aurora: three arcs at different heights and sweeps. */
  float listen = mix(0.8, 0.45 + spec(clamp(0.5 + q.x * 0.45, 0.0, 1.0), 0.3) * 1.1, uPlaying);
  float swell = (0.75 + uMid * 0.6 + uLevel * 0.25) * listen;
  float surge = exp(-abs(fract(q.x * 0.25 - uKicks.x * 0.35 + 0.5) - 0.5) * 7.0) * exp(-uKicks.x * 1.0) * 0.6;
  float a1 = boreRibbon(q, SHORE + 0.3, 0.09, 1.6, 0.0, 1.0);
  float a2 = boreRibbon(q, SHORE + 0.46, 0.12, 1.1, 2.1, 1.3);
  float a3 = boreRibbon(q, SHORE + 0.17, 0.05, 2.3, 4.2, 0.7) * smoothstep(-0.2, 0.6, q.x);
  vec3 green = boreGreen();
  vec3 upper = mix(uColB, vec3(0.45, 0.35, 0.95), 0.4);
  vec3 aur = green * (a1 + a2 * 0.8 + a3 * 0.7);
  /* The tops of the rays drift toward blue-violet, as real ones do. */
  aur += upper * (a1 + a2) * 0.25 * smoothstep(0.35, 0.95, y);
  c += aur * swell * (1.0 + surge) * 0.42;
  return c;
}

/* A mountain crest: ridged octaves (sharp summits, rounded saddles), a taller
   massif left of centre. Sampled in 1D, so the silhouette is one clean line. */
float boreCrest(float x, float seed) {
  float h = 0.0;
  float a = 0.5;
  float f = 1.0;
  for (int i = 0; i < 6; i++) {
    float n = noise2(vec2(x * f, seed + float(i) * 9.0));
    float r = 1.0 - abs(n * 2.0 - 1.0);
    h += a * r * r;
    f *= 2.1;
    a *= 0.48;
  }
  float massif = exp(-pow((x + 0.15) * 1.8, 2.0)) + 0.55 * exp(-pow((x - 0.55) * 2.4, 2.0));
  return h * (0.3 + massif * 0.8);
}

/* One range: a filtered silhouette, a gentle darkening toward the water, and a
   crisp snow cap riding the crest on the high ground. */
vec3 boreRange(vec3 col, vec2 q, float seed, float height, float snowiness, vec3 rockTop, vec3 rockFoot, vec3 snowWest, vec3 snowEast) {
  float h = SHORE + 0.003 + boreCrest(q.x, seed) * height;
  float d = q.y - h;
  float aa = fwidth(d) + 0.0003;
  float land = 1.0 - smoothstep(-aa, aa, d);
  if (land <= 0.0) return col;
  float rise = clamp((q.y - SHORE) / max(h - SHORE, 0.001), 0.0, 1.0);
  vec3 rock = mix(rockFoot, rockTop, smoothstep(0.0, 1.0, rise));
  float capDepth = (0.008 + 0.016 * noise2(vec2(q.x * 3.1, seed + 40.0))) * smoothstep(SHORE + 0.07, SHORE + 0.13, h);
  float cd = d + capDepth + (noise2(vec2(q.x * 38.0, seed + 7.0)) - 0.5) * 0.004;
  float ac = fwidth(cd) + 0.0003;
  float cap = smoothstep(-ac, ac, cd) * step(0.0005, capDepth) * snowiness;
  vec3 snow = mix(snowWest, snowEast, smoothstep(-0.7, 0.7, q.x));
  return mix(col, mix(rock, snow, cap), land);
}

vec3 world(vec2 fragCoord) {
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((fragCoord.x / uRes.x - 0.5) * aspect + uPointer.x * 0.015, fragCoord.y / uRes.y);

  /* The lake is a mirror - only the faintest breath disturbs it. */
  float under = step(p.y, SHORE);
  float depth = clamp((SHORE - p.y) / SHORE, 0.0, 1.0);
  vec2 q = p;
  q.y = mix(p.y, 2.0 * SHORE - p.y, under);
  q.x += sin(p.y * 420.0 / (0.2 + depth) + uTime * 0.8) * 0.0006 * depth * depth * under * (1.0 + uBass);

  vec3 col = boreSky(q);

  /* Two ranges: the far one washed pale by the air, the near one dark, both
     with clean snow caps - rose with twilight in the west, aurora-green east. */
  vec3 dusk = mix(uColA, vec3(1.0, 0.55, 0.3), 0.45);
  vec3 green = boreGreen();
  vec3 air = boreSky(vec2(q.x, SHORE + 0.03));
  vec3 rock = mix(uBg, uColB, 0.06) * 0.42;
  col = boreRange(col, vec2(q.x * 0.85 + 0.37 + uTravel * 0.001, q.y), 61.0, 0.12, 0.0,
    mix(rock, air, 0.55), mix(rock, air, 0.68),
    mix(air, dusk * 0.4 + 0.1, 0.35), mix(air, green * 0.2 + 0.06, 0.35));
  col = boreRange(col, vec2(q.x * 1.2 + uTravel * 0.002, q.y), 41.0, 0.27, 1.0,
    rock * 1.15, mix(rock * 0.7, air, 0.12),
    dusk * 0.11 + vec3(0.045, 0.045, 0.06), green * 0.05 + vec3(0.03, 0.04, 0.055));

  /* Mirror: the lake holds it all, a shade darker and cooler, glassy near the shore. */
  vec3 lake = col * mix(0.82, 0.55, depth) + uColB * 0.003;
  col = mix(col, lake, under);
  return col;
}
`;
