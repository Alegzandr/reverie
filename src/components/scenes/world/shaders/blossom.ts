/**
 * Hanami (sakura mood): walking a lane under cherry trees at golden hour, the
 * way an animated film would paint it. Pair after pair of old trunks lean in
 * over a sunlit earth path through green verges, their crowns meet overhead in
 * an arch of piled blossom, warm where the low sun catches it and lavender in
 * its shade; paper lanterns on posts line both sides, and at the far end of
 * the lane the sun pours through in soft shafts under towering evening
 * clouds. The only world you walk through rather than look at: the lane
 * drifts toward you, faster as the music swells, and petals fly past. The
 * lanterns carry the music (each its own band of the spectrum, the near ones
 * playing now, the far ones a moment ago, so the track recedes down the
 * lane); the sun breathes with the low end and each downbeat flares it.
 *
 * Drawn like an illustration, not simulated: each pair of trees is one flat
 * plate across the lane (blossom as loose clouds of flower bunches melted
 * into one another, wood as smooth tapered strokes that fork and fork
 * again), plates and lanterns composited front to back and edge-filtered at
 * their own depth - crisp at any size, no marching.
 */
export const BLOSSOM = /* glsl */ `
/* Screen height of the vanishing point, and the lens. */
const float HORIZON_Y = 0.42;
const float FOCAL = 1.15;
/* World units: metres, heights measured up from the path. */
const float EYE = 1.6;
const float SPACING = 3.0;
const float ROW_X = 2.3;
/* The arch the crowns draw over the lane: an ellipse, then drooping outward. */
const float ARCH_X = 2.05;
const float ARCH_Y = 1.75;
const float ARCH_CY = 2.35;
const float CLUMP_STEP = 0.19;
const float CLUMP_REACH = 2.55;
const float DROOP_RUN = 2.3;
const float DROOP_DROP = 0.75;
const float PATH_W = 0.95;
const float LANTERN_X = 1.65;
const float LANTERN_H = 0.9;
const vec2 LANTERN_SIZE = vec2(0.13, 0.17);
const float LANE_SPEED = 0.9;
const int ROWS = 11;
const int PETAL_SLICES = 8;
const float PETAL_DEPTH = 14.0;
const float PETAL_CELL = 0.75;
const float FOG = 0.045;
/* The lane only draws ROWS pairs of trees, so the farthest ones melt into the
   haze before the last row's depth (never under 28.5 m) instead of popping.
   They thicken into the haze colour first and stay solid; only once nearly
   haze-coloured do they thin out, or the sky and the rows behind read
   through them as ghost trees. */
const vec2 LANE_HAZE = vec2(12.0, 25.0);
const vec2 LANE_FADE = vec2(23.0, 28.0);
/* The far wood closing the lane: its height above the horizon (base, plus
   noise), how far it parts where the sun comes through, and how much of the
   blossom's colour survives the haze. */
const vec2 FAR_WOOD_H = vec2(0.014, 0.022);
const float FAR_WOOD_GAP = 0.45;
const float FAR_WOOD_TINT = 0.35;
/* A single blossom's size, metres. */
const float FLORET = 0.05;
/* A bunch of flowers on a spur, metres: the grain of a clump. */
const float BUNCH = 0.2;
/* Conservative bounds on a tree's wood, metres: a limb ends within 2.26 of the
   fork, strokes are at most 0.1 wide there (0.2 on the trunk), the chain of
   smooth unions can pull the distance in by 0.22 in total, plus a far pixel. */
const float WOOD_REACH = 2.8;
const float WOOD_TRUNK_TOP = 2.1;
const float WOOD_TRUNK_HALF = 0.9;
const float WOOD_FAR = 1e3;
/* The blossom's reach: clump centres span the arch and its droop, and a
   clump's bunches stay within 1.31 of its centre. */
const vec2 BLOOM_Y = vec2(0.2, 5.5);
const float BLOOM_X = 5.7;
/* Seconds of music per metre down the lane, as the lanterns replay it. */
const float LANE_MEMORY = 0.3;
/* Where the sun sits, relative to the vanishing point. */
const vec2 SUN_DIR = vec2(0.0, 0.03);

/* Palette, in linear light: a warm key and cool lavender shade, painted. */
const vec3 SKY_GOLD = vec3(1.0, 0.55, 0.22);
const vec3 SKY_PEACH = vec3(0.75, 0.32, 0.26);
const vec3 SKY_LAVENDER = vec3(0.16, 0.1, 0.26);
const vec3 SUN_WARM = vec3(1.0, 0.66, 0.36);
const vec3 CLOUD_LIT = vec3(1.0, 0.6, 0.42);
const vec3 CLOUD_SHADE = vec3(0.22, 0.13, 0.26);
const vec3 HAZE = vec3(0.09, 0.035, 0.05);
const vec3 BLOOM_SHADE = vec3(0.05, 0.022, 0.07);
const vec3 BLOOM_MID = vec3(0.3, 0.11, 0.2);
const vec3 BLOOM_LIT = vec3(1.0, 0.42, 0.56);
const vec3 BLOOM_PALE = vec3(1.0, 0.66, 0.72);
const vec3 BARK = vec3(0.03, 0.015, 0.014);
const vec3 BARK_SHADE = vec3(0.012, 0.008, 0.02);
const vec3 EARTH = vec3(0.17, 0.085, 0.045);
const vec3 GRASS = vec3(0.025, 0.05, 0.015);
const vec3 GRASS_LIT = vec3(0.13, 0.17, 0.03);
const vec3 LANTERN = vec3(1.0, 0.5, 0.2);
const vec3 PAPER = vec3(1.0, 0.42, 0.14);
const vec3 PETAL = vec3(1.0, 0.7, 0.76);

float sunPulse() {
  return 1.0 + (uBass * 0.3 + kickFlash(2.0) * 0.35) * uPlaying;
}

float lanternLevel() {
  return mix(0.6, 0.35 + uLevel * 1.1, uPlaying);
}

/* Towering evening cloud, painted: lit peach on the sun's side, lavender below. */
vec3 clouds(vec3 rd, vec3 c) {
  vec2 cp = vec2(rd.x / max(rd.y + 0.12, 0.05), rd.y) * vec2(0.9, 5.0);
  float n = fbm2(cp * vec2(1.0, 1.4) + vec2(uTime * 0.004, 0.0));
  float body = smoothstep(0.5, 0.56, n + smoothstep(0.05, 0.35, rd.y) * 0.25 - 0.1);
  float lit = smoothstep(0.5, 0.75, fbm2(cp * vec2(1.0, 1.4) + vec2(uTime * 0.004 + 0.06, -0.12)));
  vec3 cloud = mix(CLOUD_LIT * 0.55, CLOUD_SHADE, lit);
  cloud += SUN_WARM * 0.25 * exp(-length(rd.xy - SUN_DIR) * 6.0);
  return mix(c, cloud, body * smoothstep(0.02, 0.1, rd.y));
}

/* Where the ray escapes: golden sky, the sun straight down the lane, clouds,
   and a far wood along the horizon beyond the orchard - lost in the same haze
   as the far end of the path, so ground and sky meet without a seam. */
vec3 laneSky(vec3 rd, vec3 fogCol) {
  float y = rd.y;
  vec3 c = mix(SKY_GOLD * 0.6, SKY_PEACH * 0.7, smoothstep(0.0, 0.1, y));
  c = mix(c, SKY_LAVENDER * 0.55, smoothstep(0.06, 0.32, y));
  c = mix(c, uBg * 0.9 + vec3(0.006, 0.004, 0.02), smoothstep(0.35, 0.8, y));
  c = clouds(rd, c);
  float d = length(rd.xy - SUN_DIR);
  c += SUN_WARM * (exp(-d * 7.0) * 0.35 + exp(-d * 26.0) * 0.8) * sunPulse();
  /* Rounded crowns, parting a little where the lane opens onto the sun. */
  float crowns = FAR_WOOD_H.x + FAR_WOOD_H.y * fbm2(vec2(rd.x * 9.0, 2.0));
  float wood = crowns * mix(FAR_WOOD_GAP, 1.0, smoothstep(0.02, 0.2, abs(rd.x)));
  float aa = 1.5 / uRes.y;
  /* Thicker air toward its foot: pure haze at the horizon, a faint hint of
     blossom at the crowns. */
  vec3 far = mix(fogCol, BLOOM_MID + HAZE, FAR_WOOD_TINT * smoothstep(0.0, wood, y));
  return mix(c, far, 1.0 - smoothstep(wood - aa, wood + aa, y));
}

/* The warm air down the lane, and the sun's shafts slanting through it. */
vec3 laneFog(vec3 rd) {
  vec2 v = rd.xy - SUN_DIR;
  float d = length(v);
  vec2 dir = v / max(d, 1e-4);
  float shafts = smoothstep(0.5, 0.8, noise2(dir * 3.0 + vec2(uTime * 0.01, 0.0))) * exp(-d * 2.5) * smoothstep(0.0, 0.05, d);
  return HAZE + SUN_WARM * (exp(-d * 7.0) * 0.32 + shafts * 0.08) * sunPulse();
}

/* A cell pattern of small shapes on the ground, and how resolved it is here:
   xy = the shape's coverage, crisp near, fading to its average far off. */
float groundCells(vec2 uv, float size, float density, float seed, out float settle) {
  vec2 c = uv / size;
  vec2 id = floor(c);
  vec2 o = fract(c) - 0.5 - (vec2(hash12(id + seed), hash12(id + seed + 7.0)) - 0.5) * 0.5;
  float h = hash12(id + seed * 3.0);
  o = rot(h * TAU) * o;
  float r = length(o / vec2(0.3, 0.19));
  float aa = max(fwidth(c.x), fwidth(c.y)) * 3.0;
  settle = 1.0 - smoothstep(0.15, 0.35, max(fwidth(c.x), fwidth(c.y)));
  return (1.0 - smoothstep(1.0 - aa, 1.0 + aa, r)) * step(1.0 - density, h);
}

vec3 groundColor(vec3 g, float z) {
  float ax = abs(g.x);
  float verge = smoothstep(PATH_W - 0.15, PATH_W + 0.2, ax + (noise2(g.xz * 2.0) - 0.5) * 0.25);
  /* Sunlight through the crowns, in pools with painted, definite edges. */
  float dn = fbm2(g.xz * 0.5 + vec2(0.0, 3.0));
  float dw = fwidth(dn) + 0.015;
  float dapple = smoothstep(0.53 - dw, 0.53 + dw, dn);
  float settle;
  /* The path: packed earth, pebbles catching the light. */
  float pebble = groundCells(g.xz, 0.11, 0.55, 1.0, settle);
  vec3 earth = EARTH * (0.55 + 0.45 * dapple);
  earth = mix(earth, earth * mix(1.0, 1.35, pebble), settle);
  earth *= mix(1.0, 0.95, 1.0 - settle);
  /* The verges: tufts of grass, lighter where the sun lands. */
  float tuft = groundCells(g.xz * vec2(1.0, 0.7), 0.07, 0.8, 5.0, settle);
  vec3 grass = mix(GRASS, GRASS_LIT, dapple * 0.7);
  grass = mix(grass, mix(grass * 0.7, grass * 1.35, tuft), settle);
  vec3 c = mix(earth, grass, verge);
  /* Fallen petals: thick along the verges, a scattering down the path. */
  float drift = mix(0.12, 0.6, smoothstep(PATH_W - 0.1, PATH_W + 0.5, ax)) * (1.0 - smoothstep(ROW_X + 0.6, ROW_X + 2.5, ax));
  float petal = groundCells(g.xz + 0.37, 0.05, drift, 9.0, settle);
  vec3 petalCol = BLOOM_LIT * (0.3 + 0.35 * dapple);
  c = mix(c, petalCol, mix(drift * 0.4, petal, settle));
  /* Lantern light pooling at each post. */
  float dz = (fract(g.z / SPACING) - 0.5) * SPACING;
  float pool = 0.0;
  for (int k = 0; k < 2; k++) {
    float s = k == 0 ? -1.0 : 1.0;
    vec2 d = vec2(g.x - s * LANTERN_X, dz);
    pool += 1.0 / (1.0 + dot(d, d) * 3.0);
  }
  c += LANTERN * pool * lanternLevel() * 0.06;
  c += SUN_WARM * 0.08 * exp(-ax * 1.2) * smoothstep(4.0, 30.0, z) * sunPulse();
  return c;
}

/* Where along the arch a clump sits, and how big it is. */
vec3 clumpAt(float k, float row) {
  float a = k * CLUMP_STEP;
  float s = sign(a);
  float over = abs(a) - PI * 0.5;
  vec2 c = over <= 0.0
    ? vec2(ARCH_X * sin(a), ARCH_CY + ARCH_Y * cos(a))
    : vec2(s * (ARCH_X + over * DROOP_RUN), ARCH_CY - over * DROOP_DROP);
  float h = hash12(vec2(k, row));
  c += (vec2(hash12(vec2(k, row + 5.0)), h) - 0.5) * 0.18;
  float r = (0.42 + 0.26 * h) * (1.0 + 0.25 * smoothstep(0.8, 2.2, abs(a)));
  return vec3(c, r);
}

/* The arch parameter nearest a point of the plate (inverse of clumpAt). */
float archParam(vec2 q) {
  if (abs(q.x) <= ARCH_X && q.y >= ARCH_CY - 0.4) return atan(q.x / ARCH_X, (q.y - ARCH_CY) / ARCH_Y);
  return sign(q.x) * (PI * 0.5 + max(abs(q.x) - ARCH_X, 0.0) / DROOP_RUN);
}

/* A trunk's centre line: leaning in over the lane, gnarled. */
float trunkX(float up, float s, float seed) {
  return s * (ROW_X - 0.1 * up) + 0.1 * sin(up * 1.6 + seed * 9.0);
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float stroke(vec2 q, vec2 a, vec2 b, float wa, float wb) {
  vec2 e = b - a;
  float t = clamp(dot(q - a, e) / dot(e, e), 0.0, 1.0);
  return length(q - a - e * t) - mix(wa, wb, t);
}

/* Both trees of a row: trunk, and two limbs rising from the fork and bending
   in over the lane, joined smoothly. Distance in metres. */
float wood(vec2 q, float row) {
  float s = sign(q.x);
  float seed = hash12(vec2(row, s));
  float fork = 1.2 + 0.4 * seed;
  vec2 foot = vec2(trunkX(0.0, s, seed), 0.0);
  vec2 knee = vec2(trunkX(fork * 0.5, s, seed), fork * 0.5);
  vec2 top = vec2(trunkX(fork, s, seed), fork);
  /* Far from both the limbs' reach around the fork and the trunk's box, no
     stroke can come within a pixel: skip the twenty-odd segments. */
  if (length(q - top) > WOOD_REACH && (q.y > WOOD_TRUNK_TOP || abs(q.x - s * ROW_X) > WOOD_TRUNK_HALF)) return WOOD_FAR;
  float d = stroke(q, foot, knee, 0.2, 0.15);
  d = smin(d, stroke(q, knee, top, 0.15, 0.13), 0.08);
  /* Roots flaring into the verge. */
  d = smin(d, stroke(q, foot + vec2(-0.3, 0.0), foot + vec2(0.3, 0.0), 0.06, 0.06), 0.2);
  /* Three limbs from the fork - arching in over the lane, straight up, and
     out - each bending once and splitting into two tapering leaders that
     vanish into the blossom. */
  for (int j = 0; j < 3; j++) {
    float fj = float(j);
    float hj = hash12(vec2(row * 3.0 + fj, s));
    vec2 dirJ = normalize(vec2(-s * (0.85 - 0.75 * fj), 1.0 - 0.1 * fj));
    float len = (0.9 + 0.3 * hj) * (1.0 - 0.3 * fj);
    vec2 bend = top + dirJ * len * 0.55 + vec2(s * 0.12 * (hj - 0.5), 0.0);
    vec2 split = top + dirJ * len + vec2(-s * 0.1 * (1.0 - fj), 0.05);
    float w0 = 0.1 - fj * 0.015;
    d = smin(d, stroke(q, top, bend, w0, w0 * 0.8), 0.06);
    d = smin(d, stroke(q, bend, split, w0 * 0.8, w0 * 0.55), 0.04);
    for (int b = 0; b < 2; b++) {
      float fb = float(b) * 2.0 - 1.0;
      vec2 tip = split + normalize(dirJ + vec2(fb * 0.55, 0.15)) * (0.7 + 0.25 * hash12(vec2(hj, fb))) * (1.0 - 0.35 * fj);
      vec2 kink = mix(split, tip, 0.5) + vec2(fb * 0.06, 0.04);
      d = smin(d, stroke(q, split, kink, w0 * 0.5, w0 * 0.3), 0.03);
      d = smin(d, stroke(q, kink, tip, w0 * 0.3, 0.01), 0.02);
    }
  }
  return d;
}

/* One row's plate at a point: colour and coverage of blossom over wood. */
vec4 plate(vec2 q, float row, float px) {
  vec4 outCol = vec4(0.0);
  float dw = wood(q, row);
  float cw = 1.0 - smoothstep(-px, px, dw);
  if (cw > 0.0) {
    /* Bark: shaded lavender, a warm rim on the edge turned to the lane. */
    float s = sign(q.x);
    float side = clamp((trunkX(q.y, s, hash12(vec2(row, s))) - q.x) * s / 0.2, -1.0, 1.0);
    vec3 bark = mix(BARK_SHADE, BARK, 0.5 + 0.5 * side);
    bark += SUN_WARM * 0.03 * smoothstep(0.5, 1.0, side) * smoothstep(-0.04, 0.0, dw);
    outCol = vec4(bark, cw);
  }
  /* Blossom: each clump is a loose cloud of small bunches of flowers strung on
     its own twig - dense at the heart, ragged and gappy toward the edge, so
     the wood and the sky show through. Even clumps first, odd ones over. */
  if (q.y < BLOOM_Y.x || q.y > BLOOM_Y.y || abs(q.x) > BLOOM_X) return outCol;
  float a = archParam(q);
  float k0 = floor(a / CLUMP_STEP + 0.5);
  float kMax = floor(CLUMP_REACH / CLUMP_STEP);
  vec3 L = normalize(vec3(-sign(q.x) * 0.35, 0.6, 0.7));
  /* Bunches smaller than a few pixels resolve to a soft, sparser mass. */
  float resolve = 1.0 - smoothstep(BUNCH * 0.06, BUNCH * 0.16, px);
  for (int pass = 0; pass < 2; pass++) {
    /* Only this pass's parity, k0 - 4 .. k0 + 4. */
    float kStart = k0 - 4.0 + mod(float(pass) - k0, 2.0);
    for (int o = 0; o < 5; o++) {
      float k = kStart + 2.0 * float(o);
      if (k > k0 + 4.0) break;
      if (abs(k) > kMax) continue;
      vec3 cl = clumpAt(k, row);
      vec2 v = q - cl.xy;
      if (length(v) > cl.z * 1.3 + BUNCH) continue;
      float side = sign(cl.x);
      /* The bunches: jittered cells, kept with a probability that falls off
         from the heart; the nearest bunch surface wins. */
      vec2 off = vec2(k * 3.17, row * 1.73);
      vec2 cq = q / BUNCH + off;
      vec2 base = floor(cq);
      /* Bunches melt into one another (a soft union) and so do their normals:
         lumpy masses of flowers, never separate balls. */
      float best = 1e3;
      vec3 nsum = vec3(0.0);
      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 id = base + vec2(float(i), float(j));
          vec2 cc = (id + 0.5 + (vec2(hash12(id), hash12(id + 5.3)) - 0.5) * 0.8 - off) * BUNCH;
          float h = hash12(id + 11.7);
          float dc = length(cc - cl.xy) / cl.z + (hash12(id + 2.9) - 0.5) * 0.45;
          if (h > 1.0 - smoothstep(0.55, 1.15, dc)) continue;
          vec2 w = q - cc;
          float rs = BUNCH * (0.55 + 0.35 * hash12(id + 8.1)) * mix(1.0, 0.6, clamp(dc, 0.0, 1.0));
          vec2 wd = w / max(length(w), 1e-4);
          rs *= 1.0 + 0.3 * (noise2(wd * 2.5 + id * 1.7) - 0.5) + 0.12 * (noise2(wd * 9.0 + id * 2.3) - 0.5);
          float d = length(w) - rs;
          float hm = clamp(0.5 + 0.5 * (d - best) / (BUNCH * 0.25), 0.0, 1.0);
          best = mix(d, best, hm) - BUNCH * 0.25 * hm * (1.0 - hm);
          vec2 bnj = clamp(w / rs, -1.0, 1.0);
          nsum += vec3(bnj, sqrt(max(1.0 - dot(bnj, bnj), 0.0))) * exp(-max(d, -rs) / (BUNCH * 0.15));
        }
      }
      float fine = 1.0 - smoothstep(-px, px, best);
      /* Far off: the same clump as a soft mass, a little see-through. */
      float coarse = (1.0 - smoothstep(-px, px, length(v) - cl.z * 0.9)) * 0.85;
      float cov = mix(coarse, fine, resolve);
      if (cov <= 0.0) continue;

      vec2 n = v / cl.z;
      vec3 bn = normalize(nsum + vec3(0.0, 0.0, 1e-3));
      /* Each bunch lit on its own crown, the clump as a whole darker below
         and toward its heart - light through blossom, not a smooth ball. */
      vec3 N = normalize(vec3(bn.xy * 0.6 * resolve + n * 0.35, mix(0.8, bn.z, resolve) + 0.5));
      float key = dot(N, L) + n.y * 0.25 - (1.0 - clamp(length(n), 0.0, 1.0)) * 0.1;
      float lit = smoothstep(0.3, 0.6, key);
      vec3 c = mix(BLOOM_SHADE, BLOOM_MID, smoothstep(-0.05, 0.35, key));
      c = mix(c, BLOOM_PALE * 0.42, lit);
      /* The grain of the flowers themselves: a fine, soft mottle. */
      c *= 1.0 + (noise2(q / FLORET) - 0.5) * 0.18 * resolve;
      c += LANTERN * BLOOM_LIT * 0.1 * sq(max(-n.y, 0.0)) * lanternLevel();
      /* Sunlit fringe on the edge facing the far end of the lane. */
      c += SUN_WARM * 0.1 * smoothstep(0.7, 1.0, length(n)) * max(-n.x * side, 0.0) * sunPulse();
      c *= 1.0 + uTreble * 0.1 * uPlaying * lit;
      outCol = vec4(mix(outCol.rgb, c, cov), max(outCol.a, cov));
    }
  }
  return outCol;
}

/* A lantern on its post; brightness from its band of the music. */
vec4 lantern(vec2 q, float row, float s, float z, float px, out vec3 glow) {
  float band = hash12(vec2(row, s));
  float music = spec(band, z * LANE_MEMORY);
  float lit = mix(0.6, 0.3 + music * 1.7, uPlaying) * (1.0 + kickFlash(2.2) * 0.3 * uPlaying);
  vec2 dv = q - vec2(s * LANTERN_X, LANTERN_H + LANTERN_SIZE.y);
  vec2 e = dv / LANTERN_SIZE;
  float r = length(e);
  glow = LANTERN * lit * (exp(-r * 1.3) * 0.16 + exp(-r * 0.45) * 0.03);
  float post = (1.0 - smoothstep(0.025 - px, 0.025 + px, abs(dv.x))) * step(q.y, LANTERN_H);
  float body = 1.0 - smoothstep(1.0 - px / LANTERN_SIZE.x, 1.0 + px / LANTERN_SIZE.x, r);
  float ribs = 0.82 + 0.18 * cos(e.y * 14.0);
  float caps = smoothstep(0.78, 0.86, abs(e.y));
  vec3 paper = mix(PAPER * lit * 1.6 * ribs * (1.3 - 0.6 * r * r), BARK, caps);
  return vec4(mix(BARK, paper, body), max(post, body));
}

/* Petals in depth slices, drifting toward you as you walk. */
vec3 paintPetals(vec3 col, vec2 sp, vec3 ro, float solidZ, vec3 fogCol) {
  float density = 0.09 + 0.08 * uLevel * uPlaying;
  float slice = PETAL_DEPTH / float(PETAL_SLICES);
  for (int k = 0; k < PETAL_SLICES; k++) {
    float lap = float(k) * slice - ro.z;
    float z = mod(lap, PETAL_DEPTH) + 0.35;
    if (z > solidZ) continue;
    float gen = floor(lap / PETAL_DEPTH);
    vec2 w = sp / FOCAL * z + ro.xy;
    w.y += uTime * 0.28;
    w.x += sin(w.y * 0.8 + float(k)) * 0.3 + uTime * 0.12;
    vec2 cell = floor(w / PETAL_CELL);
    float h = hash12(cell + vec2(float(k) * 13.7, gen * 7.1));
    float present = smoothstep(h, h + 0.08, density);
    if (present <= 0.0) continue;
    vec2 f = fract(w / PETAL_CELL) - 0.5;
    f -= 0.25 * vec2(sin(uTime * (0.7 + h) + h * TAU), cos(uTime * (0.5 + h * 0.6) + h * 17.0));
    f = rot(uTime * (0.5 + h) + h * TAU) * f;
    float flip = 0.25 + 0.75 * abs(cos(uTime * (0.9 + h) + h * 9.0));
    vec2 e = f / vec2(0.075, 0.05 * flip);
    float r = length(e);
    /* Close petals blur out of focus; each fades in far off and out as it passes. */
    float soft = 0.08 + 0.5 / z;
    float notch = smoothstep(0.0, 0.25, length(e - vec2(1.0, 0.0)));
    float shape = (1.0 - smoothstep(1.0 - soft, 1.0 + soft, r)) * notch;
    float fade = smoothstep(0.35, 1.0, z) * (1.0 - smoothstep(PETAL_DEPTH * 0.6, PETAL_DEPTH, z));
    vec3 pc = mix(fogCol, PETAL * (0.3 + 0.4 * flip), exp(-z * FOG));
    col = mix(col, pc, shape * present * fade * 0.9);
  }
  return col;
}

vec3 world(vec2 fragCoord) {
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((fragCoord.x / uRes.x - 0.5) * aspect, fragCoord.y / uRes.y);
  vec2 sp = vec2(p.x, p.y - HORIZON_Y);
  vec3 ro = vec3(uPointer.x * 0.15 + sin(uTime * 0.11) * 0.05, sin(uTime * 0.37) * 0.01, uTravel * LANE_SPEED);
  vec3 rd = normalize(vec3(sp, FOCAL));
  vec3 fogCol = laneFog(rd);

  /* Depth (along the lane) at which the ray meets the path, if it does. */
  float groundZ = sp.y < 0.0 ? (EYE + ro.y) * FOCAL / -sp.y : 1e6;

  /* Lanterns and plates, front to back. */
  vec3 acc = vec3(0.0);
  float trans = 1.0;
  float solidZ = 1e6;
  float first = floor(ro.z / SPACING);
  for (int i = 0; i < ROWS; i++) {
    float row = first + float(i);
    for (int part = 0; part < 2; part++) {
      /* Lanterns stand halfway between one pair of trees and the next. */
      float z = (row + (part == 0 ? 0.5 : 1.0)) * SPACING - ro.z;
      if (z < 0.3 || z > groundZ) continue;
      vec2 q = vec2(ro.x + sp.x * z / FOCAL, EYE + ro.y + sp.y * z / FOCAL);
      float px = z / (FOCAL * uRes.y);
      float fog = exp(-z * FOG) * (1.0 - smoothstep(LANE_HAZE.x, LANE_HAZE.y, z));
      float fade = 1.0 - smoothstep(LANE_FADE.x, LANE_FADE.y, z);
      if (fade <= 0.0) continue;
      vec4 c;
      if (part == 0) {
        vec3 glow;
        c = lantern(q, row, sign(q.x), z, px, glow);
        acc += trans * glow * fog * fade;
      } else {
        c = plate(q, row + 1.0, px);
      }
      c.a *= fade;
      if (c.a <= 0.0) continue;
      acc += trans * c.a * mix(fogCol, c.rgb, fog);
      trans *= 1.0 - c.a;
      if (trans < 0.5 && solidZ > 1e5) solidZ = z;
      if (trans < 0.01) break;
    }
    if (trans < 0.01) break;
  }

  vec3 back;
  if (groundZ < 1e5) {
    vec3 g = vec3(ro.x + sp.x * groundZ / FOCAL, 0.0, ro.z + groundZ);
    back = mix(fogCol, groundColor(g, groundZ), exp(-groundZ * FOG));
    solidZ = min(solidZ, groundZ);
  } else {
    back = laneSky(rd, fogCol);
  }
  vec3 col = acc + trans * back;
  return paintPetals(col, sp, ro, solidZ, fogCol);
}
`;
