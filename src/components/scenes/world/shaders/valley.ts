/**
 * Echo Valley (horizon mood): a fjord at pastel dusk, remembered as
 * vaporwave. A great striped sun sits low in the gap at the end of the fjord;
 * wall behind wall of faceted mountains close in on both sides, each drawn in
 * a neon wireframe; and the still water between them mirrors it all under a
 * glowing perspective grid that glides slowly toward you. Thin bands of
 * cloud cross the sun, lit from below.
 *
 * The music lives in the light, never in the shapes: the grid carries the
 * spectrum (each line its band across, what plays now at your feet, what
 * played a moment ago out toward the sun - the valley's echo), each downbeat
 * rolls a wave of light down the grid and up the wireframes, and the sun
 * breathes with the low end. Everything is analytic and edge-filtered, crisp
 * at any size.
 *
 * Colour script: peach to magenta to violet, one cool note - the cyan of the
 * wireframes' crests - so the pink never goes flat.
 */
export const VALLEY = /* glsl */ `
const float WATER = 0.4;
/* Nod: how much the near walls loom, and how far the eye sinks over the lake. */
const float NOD_LOOM = 0.035;
const float NOD_SINK = 0.03;
const int WALLS = 4;
const vec2 SUN_POS = vec2(0.0, 0.5);
const float SUN_R = 0.19;
/* The lake's grid: cell size, and how fast it glides toward you. */
const float GRID = 0.55;
const float GRID_SPEED = 0.6;
/* Seconds of music per grid unit of depth, as the lines replay it. */
const float GRID_MEMORY = 0.35;
/* How fast a downbeat's light runs down the grid (depth units / s) and up
   the wireframes (fraction of a wall per second). */
const float KICK_RUN = 6.0;
const float KICK_CLIMB = 0.9;
/* The depth a downbeat's light sets out from, toward you. */
const float KICK_FROM = 12.0;

/* Palette, in linear light. */
const vec3 SUN_TOP = vec3(1.0, 0.72, 0.1);
const vec3 SUN_MID = vec3(1.0, 0.26, 0.1);
const vec3 SUN_LOW = vec3(0.85, 0.03, 0.38);
const vec3 SKY_PEACH = vec3(1.0, 0.42, 0.3);
const vec3 SKY_ROSE = vec3(0.62, 0.1, 0.32);
const vec3 SKY_VIOLET = vec3(0.14, 0.035, 0.2);
const vec3 NEON_PINK = vec3(1.0, 0.16, 0.62);
const vec3 NEON_CYAN = vec3(0.1, 0.85, 1.0);
const vec3 ROCK_DEEP = vec3(0.012, 0.004, 0.03);
const vec3 ROCK_LIT = vec3(0.09, 0.022, 0.08);
const vec3 CLOUD_LIT = vec3(1.0, 0.5, 0.45);
const vec3 CLOUD_SHADE = vec3(0.3, 0.1, 0.3);
const vec3 WATER_TINT = vec3(0.6, 0.55, 0.85);

float sunPulse() {
  return 1.0 + (uBass * 0.25 + kickFlash(2.0) * 0.3) * uPlaying;
}

/* Light of the latest downbeats as a wave travelling along some distance. */
float kickWave(float at, float speed, float width) {
  float w = 0.0;
  for (int i = 0; i < 3; i++) {
    float age = uKicks[i];
    w += exp(-sq((at - age * speed) / width)) * exp(-age * 1.2);
  }
  return w * uPlaying;
}

/* The sun: warm gold on top sinking to magenta, cut by slits that widen as
   they near the horizon and drift slowly down through it. */
vec4 stripedSun(vec2 q) {
  vec2 d = q - SUN_POS;
  float r = length(d);
  float v = d.y / SUN_R;
  vec3 c = mix(SUN_LOW, SUN_MID, smoothstep(-0.9, 0.1, v));
  c = mix(c, SUN_TOP, smoothstep(0.0, 0.85, v));
  float aa = fwidth(r) * 1.2;
  float disc = 1.0 - smoothstep(SUN_R - aa, SUN_R + aa, r);
  float phase = v * 7.0 + uTime * 0.12;
  float gap = mix(0.0, 0.62, smoothstep(0.25, -0.95, v));
  float f = abs(fract(phase) - 0.5) * 2.0;
  float fw = fwidth(phase) * 2.0;
  float slit = smoothstep(gap - fw, gap + fw, f) * step(v, 0.3) + step(0.3, v);
  return vec4(c * 0.7 * sunPulse(), disc * mix(1.0, slit, step(v, 0.3)));
}

vec3 duskSky(vec2 q) {
  float y = clamp((q.y - WATER) / (1.0 - WATER), 0.0, 1.0);
  vec3 c = mix(SKY_PEACH * 0.5, SKY_ROSE * 0.42, smoothstep(0.0, 0.2, y));
  c = mix(c, SKY_VIOLET * 0.5, smoothstep(0.15, 0.45, y));
  c = mix(c, uBg * 0.6, smoothstep(0.4, 0.85, y));
  vec3 rd = normalize(vec3(q.x, y * 0.9 + 0.1, 1.0));
  c += starfield(rd, 0.8) * smoothstep(0.45, 0.85, y);
  float d = length(q - SUN_POS);
  /* The sun's glow in the dusk air, wide and soft. */
  c += mix(SUN_MID, SUN_LOW, 0.4) * (exp(-d * 5.0) * 0.1 + exp(-d * 14.0) * 0.16) * sunPulse();
  /* Thin bands of cloud across the sky, lit from below by the sun: long
     streaks with ragged ends, thicker nearer the horizon. */
  float band = fbm2(vec2(q.x * 1.3 + uTime * 0.005, q.y * 26.0));
  float ends = fbm2(vec2(q.x * 4.0 - uTime * 0.004, q.y * 9.0 + 3.0));
  float streak = smoothstep(0.6, 0.64, band * 0.8 + ends * 0.35) * smoothstep(0.02, 0.1, y) * (1.0 - smoothstep(0.4, 0.62, y));
  /* Backlit: dark violet bodies, their undersides rimmed where the sun
     reaches them (density read a step lower thins out at the lower edge). */
  float lower = fbm2(vec2(q.x * 1.3 + uTime * 0.005, (q.y - 0.006) * 26.0)) * 0.8 + ends * 0.35;
  float rim = 1.0 - smoothstep(0.58, 0.66, lower);
  vec3 cloud = mix(CLOUD_SHADE * 0.3, CLOUD_LIT * (0.25 + exp(-d * 3.0) * 0.6), rim);
  c = mix(c, cloud, streak * 0.75);
  /* The sun last: a graphic disc, in front of everything in its sky. */
  vec4 sun = stripedSun(q);
  return mix(c, sun.rgb, sun.a);
}

/* Faceted crests: straight slopes between alternating tall and low vertices. */
float vertexH(float cell, float seed) {
  float h = hash12(vec2(cell, seed));
  return mod(cell, 2.0) < 1.0 ? 0.7 + 0.3 * h : 0.25 + 0.3 * h;
}

float gridLine(float x) {
  float fw = fwidth(x);
  float d = abs(fract(x + 0.5) - 0.5);
  /* Lines finer than a pixel fade to their average instead of shimmering. */
  return (1.0 - smoothstep(0.0, fw * 1.5, d)) * (1.0 - smoothstep(0.25, 0.5, fw));
}

/* The walls of the fjord over the sky at q, their wireframes and crests. */
vec3 fjordWalls(vec2 q, vec3 col) {
  vec3 haze = mix(SKY_PEACH * 0.45, SKY_ROSE * 0.4, 0.4);
  for (int i = 0; i < WALLS; i++) {
    float fi = float(i);
    float near = fi / float(WALLS - 1);               /* 0 far .. 1 near */
    float px = q.x + uPointer.x * 0.02 * near;
    /* A nod: the near walls loom up out of the water more than the far ones. */
    float qy = WATER + (q.y - WATER) / (1.0 + uNod * NOD_LOOM * near);
    float side = px < 0.0 ? -1.0 : 1.0;
    float ax = abs(px);
    /* Each wall pair leaves a gap that narrows with distance - the fjord's
       vanishing channel - and each side is pitched a little differently. */
    float gap = mix(0.1, 0.5, pow(near, 1.3)) * (1.0 + 0.2 * side * (hash12(vec2(fi, 2.0)) - 0.5));
    float run = max(ax - gap, 0.0);
    float cx = run * mix(9.0, 3.6, near) + 0.35;
    float cell = floor(cx);
    float f = fract(cx);
    float seed = fi * 4.0 + side;
    float hA = vertexH(cell, seed);
    float hB = vertexH(cell + 1.0, seed);
    float tall = mix(0.07, 0.36, pow(near, 1.1));
    /* The first slope rises straight out of the water at the channel and
       meets the crest wherever it reaches it. */
    float inner = run * tall / mix(0.06, 0.16, near);
    float ridge = tall * mix(hA, hB, f) + run * mix(0.03, 0.14, near);
    float h = WATER + min(inner, ridge);
    float ramp = step(inner, ridge);
    float dist = qy - h;
    float edge = fwidth(dist) + 0.0005;
    float body = (1.0 - smoothstep(-edge, edge, dist)) * step(0.0005, run);
    /* Facets turned toward the channel face the sun; the rest are in shade. */
    float toSun = max(ramp, step(hA, hB));
    float vH = clamp((qy - WATER) / max(h - WATER, 1e-3), 0.0, 1.0);
    vec3 rock = mix(ROCK_DEEP, ROCK_LIT * (0.4 + 0.6 * vH), toSun * (0.55 + 0.45 * (1.0 - near)));
    rock = mix(rock * 0.6, rock, vH);
    /* Aerial perspective: far walls sink into the warm air. */
    rock = mix(rock, haze, sq(1.0 - near) * 0.5);
    /* The wireframe: the vertices' verticals, contours, and one diagonal per
       facet, so each face reads as triangles. */
    float rows = mix(4.0, 7.0, near);
    float wire = max(max(gridLine(cx), gridLine(vH * rows)), gridLine(f - vH * rows));
    float climb = kickWave(vH, KICK_CLIMB, 0.1);
    vec3 neon = mix(NEON_PINK, NEON_CYAN, smoothstep(0.35, 1.0, vH));
    rock += neon * wire * (0.14 + 0.22 * near) * (1.0 + uLevel * 0.4 * uPlaying + climb * 1.5);
    /* The crest line itself, bright, cooler on the near walls. */
    float crest = exp(-abs(dist) / (edge * 1.4));
    vec3 crestCol = mix(NEON_PINK, NEON_CYAN, 0.35 + near * 0.6);
    col = mix(col, rock, body);
    col += crestCol * crest * step(0.0005, run) * (0.35 + 0.35 * near) * (1.0 + climb * 0.5);
    /* Mist pooled on the water at the walls' feet. */
    float mist = (1.0 - smoothstep(WATER, WATER + 0.015 + 0.02 * (1.0 - near), qy)) * step(qy, h) * step(0.0005, run);
    col = mix(col, haze * 1.2, mist * (0.45 - near * 0.3));
  }
  return col;
}

vec3 world(vec2 fragCoord) {
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((fragCoord.x / uRes.x - 0.5) * aspect, fragCoord.y / uRes.y);

  if (p.y >= WATER) return fjordWalls(p, duskSky(p));

  /* The lake: the scene mirrored, barely stirred - and never by the music. */
  float below = WATER - p.y;
  float z = 0.1 / (below * (1.0 + uNod * NOD_SINK));
  vec2 w = vec2(p.x * z * 4.0, z);
  float ripple = sin(z * 22.0 - uTime * 0.9) * 0.6 + sin(z * 47.0 + p.x * 6.0 + uTime * 0.7) * 0.4 + (noise2(vec2(p.x * 30.0, z * 8.0)) - 0.5) * 0.4;
  float settle = 1.0 - smoothstep(0.3, 1.2, fwidth(z * 47.0));
  vec2 m = vec2(p.x + ripple * settle * 0.006 * below * 4.0, WATER + below * (1.0 + ripple * settle * 0.025));
  vec3 refl = fjordWalls(m, duskSky(m)) * WATER_TINT;
  float fres = smoothstep(0.0, WATER, below);
  vec3 col = refl * mix(0.62, 0.3, fres);

  /* The grid on the water, gliding toward you. Its lines replay the music:
     each crosswise line lit by its band across the lake, its depth the age. */
  vec2 g = vec2(w.x, w.y + uTravel * GRID_SPEED) / GRID;
  float lineX = gridLine(g.x);
  float lineZ = gridLine(g.y);
  float band = clamp(p.x / aspect + 0.5, 0.0, 1.0);
  float music = mix(0.7, 0.35 + spec(band, z * GRID_MEMORY) * 1.3, uPlaying);
  float run = kickWave(KICK_FROM - z, KICK_RUN, 0.9);
  float fade = exp(-z * 0.22);
  vec3 grid = NEON_PINK * lineZ * music + mix(NEON_PINK, NEON_CYAN, 0.35) * lineX * 0.8;
  col += grid * fade * (0.5 + run * 0.8) * (1.0 + uLevel * 0.3 * uPlaying);
  /* The sun's own path on the water, and the glow of the far grid. */
  col += SUN_LOW * exp(-abs(p.x) * 7.0) * exp(-below * 8.0) * 0.06 * sunPulse();
  col += mix(NEON_PINK, SKY_PEACH, 0.5) * exp(-below * 90.0) * 0.08;
  return col;
}
`;
