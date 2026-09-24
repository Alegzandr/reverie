/**
 * City Pop (citypop mood): a bay city late at night, the way the album sleeves
 * of the eighties drew it - few things, each one worth a look. Downtown
 * gathers around a lattice tower burning orange, a smaller cluster rises under
 * the moon, and between and beyond them the skyline thins to low blocks and
 * open sky. Most of the city has gone home: lights come in runs (an office
 * still going, a floor of flats), each room its own lamp, screen or blind. An
 * elevated expressway runs the waterfront with a few cars on it, three neon
 * signs and one billboard hang on the middle row, and the black water mirrors
 * only what burns bright. The music lives in a handful of downtown towers:
 * their windows climb with the band under them (bass on the left, air on the
 * right) - what plays now on the lower floors, a moment ago higher up - while
 * every other lit window only breathes with it. Downbeats lift the neon, the
 * traffic flows faster with the track, the treble sparkles on the water.
 * Analytic and edge-filtered, crisp at any size.
 */
export const SKYLINE = /* glsl */ `
const float SHORE = 0.27;
const float ROAD = 0.285;
const vec2 MOON_POS = vec2(-0.5, 0.8);
const float MOON_R = 0.034;
/* Where the sun lights the moon from: behind and to the lower right - a crescent. */
const vec3 MOON_SUN = vec3(0.76, -0.42, -0.5);
const vec2 TOWER_BASE = vec2(0.3, 0.29);
const float TOWER_H = 0.4;
const int ROWS = 3;
/* Seconds of music held per screen unit up a tower's floors. */
const float FLOOR_MEMORY = 9.0;
/* How far a tower may rise past its roofline (crowns, masts, billboards):
   the pixel test must reach this high or they get clipped. */
const float ROOF_REACH = 0.06;
/* Where the city gathers: downtown around the lattice tower, a smaller
   cluster across the bay under the moon. */
const float DOWNTOWN_X = 0.1;
const float UPTOWN_X = -0.62;
/* The vertical signs on the middle row: x, drop below the roof, colour. */
const vec3 NEON_SIGNS[3] = vec3[3](vec3(-0.21, 0.0, 0.9), vec3(0.02, 0.02, 0.5), vec3(0.46, 0.01, 0.1));
const float SIGN_HALF = 0.028;
const float BOARD_X = -0.13;
const vec3 SIGN_BACK = vec3(0.012, 0.006, 0.02);

/* Set while painting the bay: the reflection only needs each tower's glow,
   and the window grid, torn by the swell, would read as noise. */
float gBlurWindows = 0.0;

/* Palette, in linear light. */
const vec3 SKY_NAVY = vec3(0.004, 0.004, 0.022);
const vec3 SKY_VIOLET = vec3(0.05, 0.012, 0.09);
const vec3 SKY_HAZE = vec3(0.42, 0.06, 0.26);
/* The last of the city's light right on the horizon, warmer than the haze. */
const vec3 SKY_EMBER = vec3(0.9, 0.22, 0.16);
const vec3 MOON_PALE = vec3(1.0, 0.9, 0.8);
const vec3 MOONLIGHT = vec3(0.45, 0.55, 1.0);
const vec3 WIN_WARM = vec3(1.0, 0.66, 0.3);
const vec3 WIN_COOL = vec3(0.62, 0.86, 1.0);
const vec3 WIN_OFFICE = vec3(0.85, 0.95, 1.0);
const vec3 WIN_SCREEN = vec3(0.45, 0.5, 1.0);
const vec3 GLASS_DARK = vec3(0.004, 0.012, 0.03);
const vec3 NEON_PINK = vec3(1.0, 0.12, 0.5);
const vec3 NEON_CYAN = vec3(0.1, 0.85, 1.0);
const vec3 NEON_AMBER = vec3(1.0, 0.5, 0.08);
const vec3 TOWER_ORANGE = vec3(1.0, 0.36, 0.08);
const vec3 HEADLIGHT = vec3(1.0, 0.92, 0.8);
const vec3 TAILLIGHT = vec3(1.0, 0.05, 0.04);
const vec3 SODIUM = vec3(1.0, 0.55, 0.18);
/* Harbour water drinks red first; the mirror comes back a little cooler. */
const vec3 WATER_TINT = vec3(0.8, 0.88, 1.0);
const vec3 WATER_DEEP = vec3(0.002, 0.002, 0.008);

/* Edges filtered over a pixel's footprint rather than fwidth: a tower's
   distances jump where the neighbouring pixel picked another tower, and fwidth
   would smear that jump into a seam. The city is all axis-aligned edges. */
float coverage(float dist) {
  float aa = 0.9 / uRes.y;
  return 1.0 - smoothstep(-aa, aa, dist);
}

vec3 neonColor(float h) {
  return h > 0.66 ? NEON_PINK : (h > 0.33 ? NEON_CYAN : NEON_AMBER);
}

/* A drift of cloud: warped value noise stretched along the wind, thresholded
   into shapes. One two-channel fetch buys the warp. */
float cloudDensity(vec2 q, vec2 stretch, float cover, float drift) {
  vec2 p = q * stretch + vec2(uTime * drift, 0.0);
  vec2 warp = noise2v(p * 0.35 + 11.0) - 0.5;
  return smoothstep(cover, cover + 0.28, fbm2(p + warp * 1.6));
}

/* The moon as a lit sphere: a soft terminator, darker seas, a dimmer limb,
   and the night side faintly earthlit. Returns colour and coverage. */
vec4 moonDisc(vec2 dm, float d, float aa) {
  vec2 uv = dm / MOON_R;
  vec3 n = vec3(uv, sqrt(max(1.0 - dot(uv, uv), 0.0)));
  float ndl = dot(n, MOON_SUN);
  float lit = smoothstep(-0.03, 0.14, ndl);
  /* Surface texture pinned to the sphere, compressed toward the limb. */
  vec2 tc = uv / (0.45 + 0.55 * n.z);
  float maria = smoothstep(0.4, 0.6, fbm2(tc * 1.7 + 5.0));
  float craters = noise2(tc * 7.0 + 2.0);
  float albedo = (1.0 - maria * 0.38) * (0.9 + 0.2 * craters);
  float limb = mix(0.78, 1.0, sqrt(n.z));
  vec3 col = MOON_PALE * 1.5 * albedo * limb * lit + MOONLIGHT * 0.012 * albedo * (1.0 - lit);
  return vec4(col, 1.0 - smoothstep(MOON_R - aa, MOON_R + aa, d));
}

vec3 citySky(vec2 q) {
  float y = clamp((q.y - SHORE) / (1.0 - SHORE), 0.0, 1.0);
  float downtown = exp(-sq(q.x / 0.8));
  /* A city night sky: near-black blue at the zenith, lifting through violet
     to the skyglow - the city's own light scattered back by the air, pink
     turning sodium-orange right on the horizon, brightest over downtown. */
  vec3 c = mix(SKY_VIOLET * 0.8, uBg * 0.7 + SKY_NAVY, smoothstep(0.05, 0.85, y));
  float skyglow = exp(-y * 5.5);
  vec3 glowTint = mix(SKY_HAZE, SKY_EMBER, exp(-y * 16.0));
  c += glowTint * skyglow * (0.15 + 0.12 * downtown) * (1.0 + uLevel * 0.3 * uPlaying);

  /* Stars, thinned toward the horizon where the skyglow drowns them. */
  vec3 rd = normalize(vec3(q.x, y + 0.05, 1.0));
  vec3 stars = starfield(rd, 0.5) * smoothstep(0.3, 0.9, y);

  vec2 dm = q - MOON_POS;
  float d = length(dm);
  /* Derivatives taken out here: inside the branch they would be undefined. */
  float aa = fwidth(d) * 1.2;
  vec4 moon = d < MOON_R * 1.5 ? moonDisc(dm, d, aa) : vec4(0.0);
  /* The dark limb still hides the stars behind it; the air in front of it
     keeps the sky's own glow. */
  c += stars * (1.0 - moon.a);
  c += moon.rgb * moon.a;
  /* The aureole: a tight warm glow, a wider cool one scattered by the air -
     modest, a crescent lights little. */
  vec3 aureole = MOON_PALE * exp(-d * 40.0) * 0.14 + mix(MOON_PALE, MOONLIGHT, 0.6) * exp(-d * 10.0) * 0.04 + MOONLIGHT * exp(-d * 3.0) * 0.012;

  /* High cirrus drifting across the moon: silver where the moon lights it,
     faint pink over the city, and it veils what it crosses. */
  float moonLight = exp(-d * 9.0);
  float cirrus = cloudDensity(q - vec2(0.0, 0.5), vec2(1.1, 7.0), 0.5, 0.006) * smoothstep(0.25, 0.5, y) * (1.0 - smoothstep(0.85, 1.0, y));
  vec3 cirrusCol = SKY_NAVY * 0.6 + SKY_HAZE * 0.12 * skyglow * 2.0 + MOON_PALE * 0.32 * moonLight + MOONLIGHT * 0.02;
  c = mix(c, cirrusCol + moon.rgb * moon.a * 0.35, cirrus * 0.6);
  c += aureole * (1.0 + cirrus * 1.5);

  /* Low scud over the bay, lit from beneath by the city: its belly glows
     pink-orange, its tops fall dark. */
  float scud = cloudDensity(q, vec2(0.9, 14.0), 0.52, 0.003);
  float scudAbove = cloudDensity(q + vec2(0.0, 0.012), vec2(0.9, 14.0), 0.52, 0.003);
  float band = smoothstep(0.05, 0.2, y) * (1.0 - smoothstep(0.38, 0.62, y));
  float belly = clamp(scud - scudAbove * 0.7, 0.0, 1.0);
  vec3 scudCol = mix(SKY_VIOLET * 0.35, glowTint * 0.28 * (1.0 + downtown * 0.5), 0.35 + 0.65 * belly) + MOON_PALE * 0.08 * moonLight;
  c = mix(c, scudCol, scud * band * 0.75);

  return c;
}

/* How much city stands at x: downtown gathers around the lattice tower, a
   smaller cluster rises across the bay, and between and beyond them the
   skyline thins out to low blocks and open sky. */
float skylineMass(float x) {
  return exp(-sq((x - DOWNTOWN_X) / 0.4)) + 0.45 * exp(-sq((x - UPTOWN_X) / 0.2));
}

struct Tower {
  float h;
  float l;
  float w;
  float id;
};

/* The tower standing at px in a row. Two interleaved grids of different pitch
   make an uneven skyline; the taller building wins, unless qy is already above
   its roof reach - then a shorter one behind its crown may show. */
Tower pickTower(float px, float row, float qy) {
  float near = row / float(ROWS - 1);
  float base = SHORE + 0.004;
  Tower best = Tower(0.0, 0.0, 1.0, 0.0);
  for (int g = 0; g < 2; g++) {
    float fg = float(g);
    float pitch = mix(0.05, 0.1, near) * (1.0 + fg * 0.37);
    float x = px / pitch + fg * 0.5 + row * 3.3;
    float cell = floor(x);
    float h1 = hash12(vec2(cell, row * 11.0 + fg * 5.0));
    float h2 = hash12(vec2(cell + 17.0, row * 7.0 + fg));
    float inset = 0.06 + 0.22 * h2;
    float u = fract(x);
    if (u < inset || u > 1.0 - inset * 0.5) continue;
    float cx = (cell + 0.5 - fg * 0.5 - row * 3.3) * pitch;
    float mass = skylineMass(cx);
    /* Away from the clusters, lots stand empty and the sky shows through. */
    if (hash12(vec2(cell, row * 5.0 + fg * 13.0 + 2.0)) > 0.3 + mass * 0.9) continue;
    float h;
    if (row < 0.5) h = 0.035 + mass * (0.13 + h1 * 0.24) + h1 * 0.03;
    else if (row < 1.5) h = 0.03 + mass * (0.06 + h1 * 0.12) + h1 * 0.04;
    else h = 0.02 + h1 * 0.035 + mass * 0.025;
    /* The rows in front of the lattice tower stay low enough to show it. */
    if (row > 0.5) h *= 1.0 - 0.6 * exp(-sq((cx - TOWER_BASE.x) / 0.06));
    if (h > best.h && qy < base + h + ROOF_REACH) {
      best.h = h;
      best.l = (cell + inset - fg * 0.5 - row * 3.3) * pitch;
      best.w = (1.0 - inset * 1.5) * pitch;
      best.id = cell * 13.0 + fg * 101.0 + row * 37.0;
    }
  }
  return best;
}

/* A made-up kana: a few strokes on a 3x3 lattice, picked per glyph, drawn as
   neon tube. p is in glyph units (-0.5..0.5); returns the distance to the
   nearest stroke. */
float glyphDist(vec2 p, float seed) {
  float d = 1e3;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float at = (fk - 1.0) * 0.32;
    if (hash12(vec2(seed, fk)) < 0.45) d = min(d, length(vec2(max(abs(p.x) - 0.3, 0.0), p.y - at)));
    if (hash12(vec2(seed, fk + 7.0)) < 0.4) d = min(d, length(vec2(p.x - at, max(abs(p.y) - 0.3, 0.0))));
  }
  /* A glyph that drew nothing gets its middle bar. */
  return d > 100.0 ? length(vec2(max(abs(p.x) - 0.3, 0.0), p.y)) : d;
}

/* A neon tube's brightness at distance d (screen units): the lit core and
   the glow it lays on the glass around it. */
float tube(float d, float core) {
  return coverage(d - core) + exp(-d / (core * 3.0)) * 0.35;
}

/* An occasional stutter, the way an old transformer drops a sign for a beat. */
float neonStutter(float seed) {
  return 1.0 - 0.7 * step(0.985, hash12(vec2(floor(uTime * 9.0), seed)));
}

/* One row of towers. */
vec3 towers(vec2 q, vec3 col, float row) {
  float near = row / float(ROWS - 1);        /* 0 far .. 1 near */
  float px = q.x;
  float base = SHORE + 0.004;
  Tower t = pickTower(px, row, q.y);
  float top = base + t.h;
  float lx = px - t.l;
  float mid = lx - t.w * 0.5;
  float mass = skylineMass(t.l + t.w * 0.5);

  /* The roofline: setback crowns on the tall, a second tier on the tallest,
     plant rooms and water tanks on the rest, a mast here and there. */
  float hc = hash12(vec2(t.id, 3.0));
  float hr = hash12(vec2(t.id, 23.0));
  bool tall = t.h > 0.15;
  float crown = tall && hc > 0.45 ? step(abs(mid), t.w * 0.3) * 0.022 : 0.0;
  float tier = tall && hc > 0.75 ? step(abs(mid), t.w * 0.14) * 0.016 : 0.0;
  float plant = !tall && hr < 0.6 ? step(abs(mid - t.w * (hr - 0.3)), t.w * 0.18) * 0.007 : 0.0;
  float tankX = mid + t.w * (0.3 - hr * 0.2);
  float tank = !tall && hr > 0.35 ? step(abs(tankX), 0.0028) * (0.008 + 0.0022 * (1.0 - sq(tankX / 0.0028))) : 0.0;
  float mast = (tall && hc > 0.88) || (!tall && hr > 0.92) ? step(abs(mid), 0.0012) * 0.045 : 0.0;
  float roof = max(max(crown + tier, plant), max(tank, mast));
  float dist = q.y - (top + roof);
  float body = t.h > 0.0 ? coverage(dist) * coverage(-lx) * coverage(lx - t.w) : 0.0;

  /* The signs: a few, placed by hand on the middle row, each hung on
     whichever tower stands there - drawn from that tower's geometry, so a
     neighbour on the other grid can't cut them. */
  float flare = 1.0 + kickFlash(2.6) * 0.4 * uPlaying;
  vec3 halo = vec3(0.0);
  vec3 sign = vec3(0.0);
  float signMask = 0.0;
  if (row > 0.5 && row < 1.5) {
    for (int i = 0; i < 3; i++) {
      vec3 s = NEON_SIGNS[i];
      Tower st = pickTower(s.x, row, 0.0);
      if (st.h < 0.06) continue;
      vec3 neon = neonColor(s.z);
      vec2 sp = vec2(px - st.l - 0.009, q.y - (base + st.h - 0.035 - s.y));
      float box = coverage(abs(sp.x) - 0.0042) * coverage(abs(sp.y) - SIGN_HALF);
      float stutter = neonStutter(float(i));
      float halfGlyph = SIGN_HALF - 0.002;
      if (box > 0.0) {
        vec2 gp = vec2(sp.x / 0.0066, fract((sp.y + SIGN_HALF) / 0.0112) - 0.5);
        float seed = floor((sp.y + SIGN_HALF) / 0.0112) + float(i) * 17.0;
        float g = tube(glyphDist(gp, seed) * 0.0066, 0.00045) * step(abs(sp.y), halfGlyph);
        float rim = tube(abs(max(abs(sp.x) - 0.0042, abs(sp.y) - SIGN_HALF)), 0.0003);
        sign = mix(sign, mix(SIGN_BACK, neon * (g * 0.9 + rim * 0.35) * stutter * flare, min(g + rim, 1.0)), box);
        signMask = max(signMask, box);
      }
      float sd = length(vec2(sp.x, max(abs(sp.y) - SIGN_HALF, 0.0)));
      halo += neon * (exp(-sd * 90.0) * 0.05 + exp(-sd * 22.0) * 0.02) * flare * stutter;
    }
    /* One billboard over the rooftops, its glyphs running across it. */
    Tower bt = pickTower(BOARD_X, row, 0.0);
    vec3 neon = neonColor(0.9);
    float boardHalf = min(bt.w * 0.42, 0.032);
    float boardTop = base + bt.h;
    vec2 bp = vec2(px - bt.l - bt.w * 0.5, q.y - boardTop - 0.022);
    float panel = coverage(abs(bp.x) - boardHalf) * coverage(abs(bp.y) - 0.0075);
    float legs = coverage(abs(abs(bp.x) - boardHalf * 0.6) - 0.0007) * step(bp.y, 0.0) * step(boardTop - 0.001, q.y);
    float stutter = neonStutter(5.0);
    if (panel > 0.0) {
      vec2 gp = vec2(fract((bp.x + boardHalf) / 0.0092) - 0.5, bp.y / 0.0092);
      float seed = floor((bp.x + boardHalf) / 0.0092) + 61.0;
      float g = tube(glyphDist(gp, seed) * 0.0092, 0.0005) * step(abs(bp.x), boardHalf - 0.003);
      float rim = tube(abs(max(abs(bp.x) - boardHalf, abs(bp.y) - 0.0075)), 0.0003);
      sign = mix(sign, mix(SIGN_BACK, neon * (g * 0.9 + rim * 0.4) * stutter * flare, min(g + rim, 1.0)), panel);
    }
    sign = mix(sign, vec3(0.006, 0.004, 0.012), legs * (1.0 - panel));
    signMask = max(signMask, max(panel, legs));
    float bd = length(max(abs(bp) - vec2(boardHalf, 0.0075), 0.0));
    halo += neon * exp(-bd * 160.0) * 0.07 * flare * stutter;
  }
  if (t.h <= 0.0 || body <= 0.0) return mix(col + halo, sign, signMask);


  /* Aerial perspective: the far rows sink into the magenta haze, the near
     ones stand as silhouettes. */
  float hy = (q.y - base) / t.h;
  vec3 wall = mix(SKY_HAZE * 0.11 + uBg * 0.3, vec3(0.005, 0.004, 0.013) + uBg * 0.08, near);
  wall *= 0.8 + 0.4 * smoothstep(t.w * 0.2, t.w, lx) * (1.0 - near * 0.5);

  /* Three kinds of facade: punched windows, ribbon glazing, and curtain-wall
     glass that mirrors the haze until a floor lights up behind it. */
  float kind = hash12(vec2(t.id, 5.0));
  bool ribbon = kind > 0.6 && kind < 0.8;
  bool glass = kind >= 0.8;
  if (glass) wall = mix(wall, mix(SKY_HAZE * 0.1, GLASS_DARK, smoothstep(0.0, 1.0, hy)) * mix(1.6, 1.0, near), 0.7);

  vec2 cellSize = vec2(mix(0.0036, 0.008, near), mix(0.0052, 0.0105, near));
  if (ribbon) cellSize.x *= 0.6;
  /* The grid centred between the tower's edges: no half window at a corner. */
  float cols = max(floor(t.w / cellSize.x - 0.6), 1.0);
  float margin = (t.w - cols * cellSize.x) * 0.5;
  vec2 wv = vec2(lx - margin, q.y - base) / cellSize;
  vec2 wc = floor(wv);
  vec2 wf = fract(wv);
  float win;
  float winAvg;
  if (glass) {
    win = smoothstep(0.02, 0.07, wf.x) * (1.0 - smoothstep(0.93, 0.98, wf.x)) * smoothstep(0.08, 0.14, wf.y) * (1.0 - smoothstep(0.9, 0.96, wf.y));
    winAvg = 0.8;
  } else if (ribbon) {
    win = smoothstep(0.03, 0.1, wf.x) * (1.0 - smoothstep(0.9, 0.97, wf.x)) * smoothstep(0.28, 0.36, wf.y) * (1.0 - smoothstep(0.72, 0.8, wf.y));
    winAvg = 0.38;
  } else {
    win = smoothstep(0.12, 0.2, wf.x) * (1.0 - smoothstep(0.8, 0.88, wf.x)) * smoothstep(0.2, 0.3, wf.y) * (1.0 - smoothstep(0.75, 0.85, wf.y));
    winAvg = 0.33;
  }
  win *= step(0.0, wv.x) * step(wv.x, cols);
  /* Where a window is smaller than a couple of pixels, fade to its average. */
  float settle = (1.0 - smoothstep(0.35, 0.8, max(fwidth(wv.x), fwidth(wv.y)))) * (1.0 - gBlurWindows);

  /* Who is still at work, late: most of the city has gone home. Lights come
     in runs - an office still going, a floor of flats - with the odd lamp on
     its own; downtown keeps more of them. */
  float litShare = (row < 0.5 ? 0.3 : (row < 1.5 ? 0.26 : 0.12)) * (0.55 + 0.6 * min(mass, 1.0));
  vec2 zoneSize = glass ? vec2(1e3, 1.0) : (ribbon ? vec2(6.0 + floor(hr * 6.0), 1.0) : vec2(2.0 + floor(hc * 4.0), 1.0 + floor(hr * 3.0)));
  vec2 zone = floor(wc / zoneSize);
  float zoneOn = step(hash12(zone * vec2(1.7, 3.1) + t.id * 0.37), litShare);
  float lit = max(zoneOn * step(hash12(wc + t.id), 0.8), step(hash12(wc * 1.3 + t.id + 9.0), 0.025));

  /* The music lives in a handful of downtown towers: their windows climb with
     the band under them (bass on the left, air on the right) - what plays now
     on the lower floors, a moment ago higher up. Every other lit window only
     breathes with it. */
  float band = clamp((t.l + t.w * 0.5) / (0.89 * 2.0) + 0.5, 0.0, 1.0);
  float s = spec(band, (q.y - base) * FLOOR_MEMORY);
  float hero = step(hash12(vec2(t.id, 41.0)), 0.35) * step(0.13, t.h) * step(near, 0.6);
  float hw = glass ? hash12(vec2(t.id, wc.y)) * 0.8 : hash12(wc + t.id + 3.0);
  float litMusic = smoothstep(hw, hw + 0.25, 0.05 + s * 0.9) * uPlaying * hero;
  lit = max(lit, litMusic);
  /* Seen in the water, only each tower's overall glow matters. */
  lit = mix(lit, litShare * 0.85 + hero * s * 0.45 * uPlaying, gBlurWindows);

  /* Each lit room its own: warm lamps, office tubes, the blue of a screen, a
     blind half drawn. */
  float tt = hash12(wc + t.id + 5.0);
  vec3 tint = tt < 0.5 ? WIN_WARM : (tt < 0.8 ? WIN_COOL : (tt < 0.94 ? WIN_OFFICE : WIN_SCREEN));
  /* Office glazing reads white; down on the waterfront it would outshine downtown. */
  if (glass || ribbon) tint = mix(WIN_OFFICE, WIN_WARM, step(0.7, tt) * 0.6) * mix(1.0, 0.65, near);
  float roomLevel = 0.55 + 0.45 * hash12(wc + t.id + 11.0);
  if (tt >= 0.94 && !glass && !ribbon) roomLevel *= 0.8 + 0.2 * noise2(vec2(uTime * 3.0, tt * 50.0));
  float blind = step(hash12(wc + t.id + 13.0), 0.25) * step(0.55, wf.y) * 0.65;
  float ceiling = mix(0.8, 1.15, smoothstep(0.2, 0.85, wf.y));
  win = mix(winAvg, win * ceiling * (1.0 - blind), settle);

  float inTop = step(q.y, top - cellSize.y * 0.5);
  float glow = mix(0.13, 0.5, near) * roomLevel * (0.85 + 0.35 * s * uPlaying) * inTop;
  vec3 c = wall + tint * win * lit * glow;
  /* A lit window lights the wall around it a little, so the grid glows
     rather than sits as flat dots. */
  c += tint * lit * glow * 0.06 * settle;
  /* The floor slabs: a faint line of lighter concrete at each storey. */
  if (!glass) c += wall * 0.5 * (1.0 - smoothstep(0.0, 0.1, wf.y)) * settle * inTop;

  /* Moonlight rims the left edge and the roofline of the near towers; the
     street's sodium light washes up their feet. */
  float px1 = 1.5 / uRes.y;
  float rim = (1.0 - smoothstep(0.0, px1 * 2.0, lx)) + (1.0 - smoothstep(0.0, px1 * 1.5, -dist)) * 0.6;
  c += MOONLIGHT * rim * 0.05 * near;
  c += SODIUM * exp(-(q.y - base) * 45.0) * 0.05 * near;
  /* Floodlit crowns on the tallest. */
  if (crown > 0.0) c += mix(WIN_OFFICE, SKY_HAZE, 0.6) * exp(-max(top + crown + tier - q.y, 0.0) * 300.0) * step(q.y, top + crown + tier) * 0.06;
  /* Red aviation lights on the tallest roofs, slowly blinking. */
  if (t.h > 0.22) {
    float blink = step(0.5, fract(uTime * 0.5 + hc));
    float rl = length(vec2(mid, q.y - top - roof));
    c += TAILLIGHT * blink * (exp(-rl * 900.0) * 1.5 + exp(-rl * 200.0) * 0.06);
  }
  c = mix(c, sign, signMask);
  return mix(col + halo, c, max(body, signMask));
}

/* The lattice tower, floodlit orange: tapered legs, two decks, a mast. */
vec3 latticeTower(vec2 q, vec3 col) {
  vec2 t = q - TOWER_BASE;
  /* The floodlights' glow in the haze around it. */
  float yn = t.y / TOWER_H;
  float aura = exp(-abs(t.x) / mix(0.05, 0.012, clamp(yn, 0.0, 1.0))) * step(0.0, t.y) * (1.0 - smoothstep(0.75, 1.1, yn));
  col += TOWER_ORANGE * aura * 0.035 * (1.0 + uLevel * 0.3 * uPlaying);
  if (abs(t.x) > 0.08 || t.y < 0.0 || t.y > TOWER_H + 0.1) return col;
  float y = t.y / TOWER_H;
  float half_ = mix(0.06, 0.004, pow(clamp(y, 0.0, 1.0), 0.62));
  /* Four legs splayed over an arch at the foot. */
  float archHalf = half_ * 0.72 * sqrt(max(1.0 - y / 0.14, 0.0));
  float body = step(y, 1.0) * coverage(abs(t.x) - half_) * coverage(archHalf - abs(t.x));
  /* The mast above the lattice. */
  body = max(body, coverage(abs(t.x) - 0.0014) * step(TOWER_H, t.y) * step(t.y, TOWER_H + 0.085));
  /* Decks: two wider bands. */
  float deck1 = coverage(abs(t.y - TOWER_H * 0.36) - 0.008) * coverage(abs(t.x) - half_ - 0.008);
  float deck2 = coverage(abs(t.y - TOWER_H * 0.68) - 0.005) * coverage(abs(t.x) - half_ - 0.004);
  body = max(body, max(deck1, deck2));
  if (body <= 0.0) return col;
  /* Cross-bracing, fading to a solid glow where it packs tighter than a pixel. */
  vec2 lp = vec2(t.x / max(half_, 0.001) * 1.5, t.y * 70.0);
  float braceA = abs(fract(lp.y + lp.x) - 0.5);
  float braceB = abs(fract(lp.y - lp.x) - 0.5);
  float strut = max(smoothstep(0.38, 0.47, max(braceA, braceB)), smoothstep(0.8, 0.95, abs(lp.x) / 1.5));
  float lattice = mix(0.55, strut, 1.0 - smoothstep(0.3, 0.8, fwidth(lp.y)));
  float sparkle = 1.0 + uTreble * 0.5 * uPlaying * step(0.9, hash12(floor(vec2(t.x * 400.0, t.y * 300.0)) + floor(uTime * 8.0)));
  /* Lit from below: hotter at the foot, the white of the floodlights on
     the legs' inner faces. */
  vec3 c = TOWER_ORANGE * (0.1 + 0.72 * lattice) * mix(1.0, 0.5, y) * sparkle;
  c += vec3(1.0, 0.7, 0.4) * lattice * exp(-y * 6.0) * 0.25;
  /* The observation decks: windows all round, warm white. */
  float deckWin = step(0.3, fract(t.x * 260.0));
  c = mix(c, vec3(1.0, 0.85, 0.6) * mix(0.5, 1.1, deckWin), max(deck1, deck2) * 0.85);
  float blink = step(0.5, fract(uTime * 0.6));
  float bl = length(t - vec2(0.0, TOWER_H + 0.085));
  c += TAILLIGHT * blink * (exp(-bl * 600.0) * 2.0 + exp(-bl * 150.0) * 0.08);
  return mix(col, c, body);
}

/* The elevated expressway along the waterfront: a dark deck with its lit
   parapet, piers down to the quay, sodium lamps on posts, and two lanes of
   traffic flowing with the music. */
vec3 expressway(vec2 q, vec3 col) {
  float px1 = 1.0 / uRes.y;
  float d = abs(q.y - ROAD) - 0.006;
  float deck = coverage(d);
  /* The deck's face: a lit parapet band on top, shadow under the lip. */
  float face = clamp((q.y - ROAD + 0.006) / 0.012, 0.0, 1.0);
  vec3 deckCol = mix(vec3(0.003, 0.002, 0.008), vec3(0.02, 0.01, 0.018), smoothstep(0.55, 0.9, face));
  deckCol += SODIUM * 0.05 * (1.0 - smoothstep(0.0, px1 * 2.5, abs(q.y - ROAD - 0.0045)));
  vec3 c = mix(col, deckCol, deck);
  /* Piers down to the quay, the lamps' light on their flanks. */
  float pu = fract(q.x * 9.0) - 0.5;
  float pier = coverage(abs(pu) / 9.0 - 0.003) * step(q.y, ROAD) * step(SHORE, q.y);
  c = mix(c, vec3(0.006, 0.004, 0.012) + SODIUM * 0.015 * smoothstep(0.0, 1.0, pu / 0.027 * 0.5 + 0.5), pier);
  /* The quay: a hairline of warm light along the water's edge. */
  c += SODIUM * exp(-abs(q.y - SHORE - 0.002) / (px1 * 1.5)) * 0.05 * step(SHORE, q.y);
  /* Lamps on posts along the parapet. */
  float lampX = (fract(q.x * 22.0) - 0.5) / 22.0;
  float lampY = ROAD + 0.017;
  float post = coverage(abs(lampX) - 0.0006) * step(ROAD, q.y) * step(q.y, lampY);
  c = mix(c, vec3(0.01, 0.007, 0.012), post);
  /* Seen in the water the lamps and traffic are pre-blurred: the swell
     scatters the taps, and a hairline of light would come back as grain. */
  float soften = 1.0 + gBlurWindows * 3.0;
  float ld = length(vec2(lampX, q.y - lampY));
  c += SODIUM * (exp(-ld * 900.0 / soften) * 1.4 / soften + exp(-ld * 140.0) * 0.05);
  /* The pool of light each lamp throws on the roadway. */
  c += SODIUM * exp(-sq(lampX / 0.008)) * (1.0 - smoothstep(0.0, 0.01, abs(q.y - ROAD - 0.004))) * 0.03;
  /* Traffic: streaks of light, headlights one way, tail-lights the other,
     each with the soft glow it lays on the road around it. */
  for (int lane = 0; lane < 2; lane++) {
    float dir = lane == 0 ? 1.0 : -1.0;
    float ly = ROAD + (lane == 0 ? 0.0022 : -0.0012);
    float x = q.x * 30.0 + dir * uTravel * 3.5;
    float cell = floor(x);
    float hc = hash12(vec2(cell, float(lane) * 9.0));
    float u = fract(x);
    float streak = smoothstep(0.0, 0.03, u) * (1.0 - smoothstep(0.05 + hc * 0.1, 0.09 + hc * 0.14, u)) * step(0.62, hc);
    float dy = q.y - ly;
    float line = exp(-sq(dy / (0.0009 * soften))) / soften;
    float bloom = exp(-abs(dy) / 0.004) * 0.12;
    vec3 light = lane == 0 ? HEADLIGHT * 0.9 : TAILLIGHT * 1.3;
    c += light * streak * (line * deck + bloom);
  }
  return c;
}

vec3 city(vec2 q) {
  vec3 col = citySky(q);
  col = towers(q, col, 0.0);
  col = latticeTower(q, col);
  /* Haze settling between the far row and the rest of the city. */
  col += SKY_HAZE * (1.0 - smoothstep(SHORE, SHORE + 0.12, q.y)) * 0.03;
  col = towers(q, col, 1.0);
  col = towers(q, col, 2.0);
  /* The haze at the city's feet. */
  col += SKY_HAZE * (1.0 - smoothstep(SHORE, SHORE + 0.05, q.y)) * 0.05;
  return expressway(q, col);
}

/* The swell as a height field on the water plane, stretched along the shore. */
float swellHeight(vec2 w) {
  return vnoise(w * vec2(0.35, 2.2)) * 0.65 + vnoise(w * vec2(0.9, 5.3) + 7.1) * 0.35;
}

/* A nod lowers the eye a hair: the bay packs toward the horizon, the far city holds. */
const float NOD_SINK = 0.03;

vec3 world(vec2 fragCoord) {
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((fragCoord.x / uRes.x - 0.5) * aspect, fragCoord.y / uRes.y);
  if (p.y >= SHORE) return city(p);

  /* The bay, a mirror broken by the swell. On the water plane the swell's
     crests run along the shore; perspective packs them into slivers toward
     the horizon, and where they pack tighter than a pixel the water settles
     into a still mirror. */
  float below = SHORE - p.y;
  float depth = below / SHORE;
  float sunk = below * (1.0 + uNod * NOD_SINK);
  float z = 1.0 / (sunk + 0.004);
  vec2 w = vec2(p.x * z, z - uTime * 0.9);
  float settle = 1.0 - smoothstep(0.25, 0.7, fwidth(w.y) * 5.3);
  float e = 0.02;
  float h0 = swellHeight(w);
  vec2 slope = vec2(swellHeight(w + vec2(e, 0.0)) - h0, swellHeight(w + vec2(0.0, e)) - h0) / e * settle;
  /* The slope tips each sliver's reflection sideways a little and up or down
     a lot: that vertical scatter is what draws every light into a column.
     A per-frame jitter along the column blurs it, the accumulation averages. */
  /* Swell lines on top of it, packed by perspective: they cut the mirror
     into slivers, each torn a little sideways from its neighbours. */
  float phase = 0.9 / (sunk + 0.004) + uTime * 0.3;
  float settleLines = 1.0 - smoothstep(0.2, 0.6, fwidth(phase));
  float line = sin(phase * TAU + noise2(vec2(p.x * 4.0, floor(phase) * 0.7)) * 3.0);
  float sliver = mix(1.0, 0.75 + 0.4 * smoothstep(-0.5, 0.9, line), settleLines);
  float tear = (noise2(vec2(floor(phase) * 3.1, p.x * 2.0)) - 0.5) * settleLines;

  float jit = rayJitter(fragCoord);
  float reach = 0.006 + depth * 0.07;
  /* Where the swell is finer than a pixel its scatter is only a blur: two
     stratified taps down the column stand in for it. */
  float blur = reach * mix(1.6, 0.5, settle);
  float x = p.x + slope.x * 0.003 * (0.2 + depth) + tear * 0.006 * (0.2 + depth);
  float y = SHORE + below + slope.y * reach * 0.6;
  gBlurWindows = 1.0;
  vec3 refl = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    /* Mostly fixed taps, a little jitter: enough for the accumulation to
       smooth them, too little to leave grain. */
    float o = ((float(i) - 0.5) * 0.5 + (jit - 0.5) * 0.4) * blur;
    refl += city(vec2(x, max(y + o, SHORE + 0.0005)));
  }
  refl *= 0.5 * WATER_TINT;
  /* Only the bright lights survive the trip across dark water: the dim glow
     of walls and haze drops away faster than the windows and neon. */
  refl *= refl / (refl + 0.1) * 1.6;
  /* Glints: the crests facing you catch the lights full on. */
  float crest = smoothstep(0.55, 0.85, h0) * settle;
  float glint = 1.0 + crest * (0.8 + uTreble * 1.2 * uPlaying);
  /* Fresnel: far off the bay mirrors the city; at your feet you look down
     into black water. */
  vec3 col = refl * mix(0.7, 0.28, smoothstep(0.0, 1.0, depth)) * glint * sliver + WATER_DEEP * depth;
  /* The haze's sheen on the water, and a hairline where it meets the quay. */
  col += SKY_HAZE * 0.02 * (1.0 - depth);
  col += SKY_HAZE * exp(-below * 250.0) * 0.04;
  return col;
}
`;
