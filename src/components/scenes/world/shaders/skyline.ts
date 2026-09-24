/**
 * City Pop (citypop mood): a bay city at midnight, the way the album sleeves
 * of the eighties drew it. Towers stand in three rows against a sky that
 * glows magenta where the city's light meets the haze, two searchlights sweep
 * the low cloud, a lattice tower burns orange among them, an elevated
 * expressway runs the waterfront with its streams of head- and tail-lights,
 * and the black water below mirrors it all, the swell pulling every light
 * into a long shivering column. The music lives in the windows: each tower
 * takes the band of the spectrum under it (bass on the left, air on the
 * right), its windows glowing up the floors as the band sounds - what plays
 * now on the lower floors, a moment ago higher up. Downbeats flare the neon
 * signs, the traffic flows faster with the track, the treble sets the tower
 * lights and the water's glints sparkling. Analytic and edge-filtered, crisp
 * at any size.
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
const vec3 SEARCHLIGHT = vec3(0.7, 0.6, 1.0);
const vec3 WIN_WARM = vec3(1.0, 0.66, 0.3);
const vec3 WIN_COOL = vec3(0.62, 0.86, 1.0);
const vec3 WIN_OFFICE = vec3(0.85, 0.95, 1.0);
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

/* A searchlight from behind the towers, swinging slowly through the haze. */
float searchlight(vec2 q, float x0, float seed) {
  vec2 o = vec2(x0, SHORE + 0.08);
  float a = sin(uTime * 0.05 + seed) * 0.42 + sin(uTime * 0.021 + seed * 2.7) * 0.12;
  vec2 dir = vec2(sin(a), cos(a));
  vec2 r = q - o;
  float along = dot(r, dir);
  float across = abs(r.x * dir.y - r.y * dir.x);
  float width = 0.004 + along * 0.05;
  return exp(-sq(across / width)) * smoothstep(0.0, 0.15, along) * exp(-along * 2.2) * step(0.0, along);
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

  /* The searchlights catch in the haze and brighten where they cross cloud. */
  float cloudCatch = max(scud * band, cirrus);
  float beams = searchlight(q, -0.35, 0.0) + searchlight(q, 0.62, 2.1) * 0.8;
  c += SEARCHLIGHT * beams * (0.04 + cloudCatch * 0.14) * (1.0 + kickFlash(2.0) * 0.3 * uPlaying);
  return c;
}

/* One row of towers. Two interleaved grids of different pitch make an uneven
   skyline; the taller building at a pixel wins, and its facade is drawn. */
vec3 towers(vec2 q, vec3 col, float row) {
  float near = row / float(ROWS - 1);        /* 0 far .. 1 near */
  float px = q.x + uPointer.x * 0.012 * (near + 0.3);
  float base = SHORE + 0.004;
  float bestH = 0.0;
  float bestL = 0.0;
  float bestW = 1.0;
  float bestId = 0.0;
  for (int g = 0; g < 2; g++) {
    float fg = float(g);
    float pitch = mix(0.07, 0.11, near) * (1.0 + fg * 0.37);
    float x = px / pitch + fg * 0.5 + row * 3.3;
    float cell = floor(x);
    float h1 = hash12(vec2(cell, row * 11.0 + fg * 5.0));
    float h2 = hash12(vec2(cell + 17.0, row * 7.0 + fg));
    float inset = 0.06 + 0.22 * h2;
    float u = fract(x);
    if (u < inset || u > 1.0 - inset * 0.5) continue;
    /* Downtown: the far rows climb toward the middle of the bay. */
    float downtown = exp(-sq(px / 0.55)) * (1.0 - near);
    float h = mix(0.06, 0.2, near * 0.3 + 0.2) + h1 * mix(0.2, 0.12, near) + downtown * 0.16;
    if (h > bestH && q.y < base + h + ROOF_REACH) {
      bestH = h;
      bestL = (cell + inset - fg * 0.5 - row * 3.3) * pitch;
      bestW = (1.0 - inset * 1.5) * pitch;
      bestId = cell * 13.0 + fg * 101.0 + row * 37.0;
    }
  }
  if (bestH <= 0.0) return col;
  float top = base + bestH;
  float lx = px - bestL;
  float mid = lx - bestW * 0.5;
  /* A setback crown on some towers, a mast on a few, a rooftop billboard on
     some of the near ones. */
  float hc = hash12(vec2(bestId, 3.0));
  float hb = hash12(vec2(bestId, 21.0));
  float crown = step(0.55, hc) * step(abs(mid), bestW * 0.28) * 0.025;
  float mast = step(0.82, hc) * step(abs(mid), 0.0012) * 0.05;
  float dist = q.y - (top + max(crown, mast));
  float body = coverage(dist) * coverage(-lx) * coverage(lx - bestW);
  bool hasBoard = near > 0.4 && hb < 0.3 && hc < 0.82;
  vec2 bp = vec2(mid, q.y - top - crown - 0.017);
  float boardHalf = bestW * 0.36;
  float board = 0.0;
  if (hasBoard) {
    board = coverage(abs(bp.x) - boardHalf) * coverage(abs(bp.y) - 0.008);
    float legs = coverage(abs(abs(bp.x) - boardHalf * 0.6) - 0.0008) * step(bp.y, 0.0);
    body = max(body, max(board, legs * coverage(q.y - top - crown - 0.01)));
  }
  /* The billboard's light spills into the night around it. */
  vec3 halo = vec3(0.0);
  float flare = 1.0 + kickFlash(2.6) * 0.9 * uPlaying;
  if (hasBoard) {
    float bd = length(max(abs(bp) - vec2(boardHalf, 0.008), 0.0));
    halo = neonColor(hb * 3.3) * exp(-bd * 220.0) * 0.12 * flare;
  }
  if (body <= 0.0) return col + halo;

  /* Aerial perspective: the far rows sink into the magenta haze. */
  float hy = (q.y - base) / bestH;
  vec3 wall = mix(SKY_HAZE * 0.16 + uBg * 0.3, vec3(0.006, 0.005, 0.016) + uBg * 0.1, near);
  wall *= 0.8 + 0.4 * smoothstep(bestW * 0.2, bestW, lx) * (1.0 - near * 0.5);

  /* Three kinds of facade: punched windows, ribbon glazing, and curtain-wall
     glass that mirrors the haze until a floor lights up behind it. */
  float kind = hash12(vec2(bestId, 5.0));
  bool ribbon = kind > 0.55 && kind < 0.8;
  bool glass = kind >= 0.8;
  if (glass) wall = mix(wall, mix(SKY_HAZE * 0.1, GLASS_DARK, smoothstep(0.0, 1.0, hy)) * mix(1.6, 1.0, near), 0.7);

  vec2 cellSize = vec2(mix(0.004, 0.009, near), mix(0.006, 0.012, near));
  if (ribbon) cellSize.x *= 0.6;
  /* The grid centred between the tower's edges: no half window at a corner. */
  float cols = max(floor(bestW / cellSize.x - 0.6), 1.0);
  float margin = (bestW - cols * cellSize.x) * 0.5;
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
  float settle = 1.0 - smoothstep(0.35, 0.8, max(fwidth(wv.x), fwidth(wv.y)));
  win = mix(winAvg, win, settle * (1.0 - gBlurWindows));

  /* Who is still at work: whole floors go dark, offices light in runs, and
     glass towers light a floor at a time. */
  float floorOn = step(0.22, hash12(vec2(bestId, wc.y + 0.5)));
  float hw;
  if (glass) hw = hash12(vec2(bestId, wc.y)) * 0.8;
  else if (ribbon) hw = hash12(vec2(floor(wc.x / 4.0), wc.y) + bestId);
  else hw = hash12(wc + bestId);
  float band = clamp((bestL + bestW * 0.5) / (0.89 * 2.0) + 0.5, 0.0, 1.0);
  float s = spec(band, (q.y - base) * FLOOR_MEMORY);
  float litBase = step(hw, 0.34) * floorOn;
  float litMusic = smoothstep(hw, hw + 0.25, 0.1 + s * 0.9) * uPlaying;
  float lit = max(litBase * mix(0.65, 0.5, uPlaying), litMusic);
  lit = mix(lit, 0.55 + 0.6 * s * uPlaying, gBlurWindows);
  vec3 tint = glass || ribbon ? WIN_OFFICE : mix(WIN_WARM, WIN_COOL, step(0.62, hash12(vec2(bestId, wc.y))));
  if (ribbon) tint = mix(tint, WIN_WARM, 0.4) * 0.75;
  float inTop = step(q.y, top - cellSize.y * 0.5);
  float glow = mix(0.12, 0.5, near) * (0.7 + 0.6 * s * uPlaying) * inTop;
  vec3 c = wall + tint * win * lit * glow;
  /* A lit window lights the wall around it a little, so the grid glows
     rather than sits as flat dots. */
  c += tint * lit * glow * 0.06 * (1.0 - gBlurWindows);

  /* Moonlight rims the left edge and the roofline of the near towers; the
     street's sodium light washes up their feet. */
  float px1 = 1.5 / uRes.y;
  float rim = (1.0 - smoothstep(0.0, px1 * 2.0, lx)) + (1.0 - smoothstep(0.0, px1 * 1.5, -dist)) * 0.6;
  c += MOONLIGHT * rim * 0.05 * near;
  c += SODIUM * exp(-(q.y - base) * 45.0) * 0.05 * near;
  /* Floodlit crowns on the tallest. */
  if (crown > 0.0 && bestH > 0.17) c += mix(WIN_OFFICE, SKY_HAZE, 0.6) * exp(-max(top + crown - q.y, 0.0) * 300.0) * step(q.y, top + crown) * 0.06;

  /* Neon: a vertical sign down the flank of some near towers. */
  float hn = hash12(vec2(bestId, 9.0));
  if (near > 0.4 && hn > 0.5) {
    vec3 neon = neonColor((hn - 0.5) * 2.0);
    float sy = top - 0.03 - hn * 0.05;
    vec2 sp = vec2(lx - 0.008, q.y - (sy - 0.035));
    float sign = coverage(abs(sp.x) - 0.0035) * coverage(abs(sp.y) - 0.035);
    /* Glyph blocks lit inside the sign, flickering on on a downbeat. */
    float glyph = step(0.35, hash12(vec2(floor(sp.y / 0.007), bestId))) * step(abs(sp.x), 0.0022);
    c = mix(c, neon * (0.12 + glyph * 0.8) * flare, sign);
    float sd = length(vec2(sp.x, max(abs(sp.y) - 0.035, 0.0)));
    c += neon * (exp(-sd * 90.0) * 0.08 + exp(-sd * 25.0) * 0.03) * flare;
  }
  /* The billboard: a dark panel, a lit border, a row of glyphs. */
  if (hasBoard) {
    vec3 neon = neonColor(hb * 3.3);
    float edge = coverage(abs(bp.x) - boardHalf) * coverage(abs(bp.y) - 0.008) * (1.0 - coverage(abs(bp.x) - boardHalf + 0.0012) * coverage(abs(bp.y) - 0.0068));
    float gx = floor(bp.x / 0.005);
    float glyph = step(0.3, hash12(vec2(gx, bestId + floor(bp.y / 0.004)))) * coverage(abs(bp.y) - 0.0045) * coverage(abs(bp.x) - boardHalf + 0.003);
    glyph *= step(0.15, fract(bp.x / 0.005)) * step(fract(bp.x / 0.005), 0.85);
    vec3 panel = vec3(0.01, 0.006, 0.02) + neon * (edge * 0.7 + glyph * 0.9) * flare;
    c = mix(c, panel, board);
  }
  /* Red aviation lights on the tallest roofs, slowly blinking. */
  if (bestH > 0.2) {
    float blink = step(0.5, fract(uTime * 0.5 + hc));
    float rl = length(vec2(mid, q.y - top - max(crown, mast)));
    c += TAILLIGHT * blink * (exp(-rl * 900.0) * 1.5 + exp(-rl * 200.0) * 0.06);
  }
  return mix(col + halo, c, body);
}

/* The lattice tower, floodlit orange: tapered legs, two decks, a mast. */
vec3 latticeTower(vec2 q, vec3 col) {
  vec2 t = q - TOWER_BASE - vec2(uPointer.x * 0.008, 0.0);
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
  vec3 c = TOWER_ORANGE * (0.12 + 0.88 * lattice) * mix(1.0, 0.5, y) * sparkle;
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
    float streak = smoothstep(0.0, 0.05, u) * (1.0 - smoothstep(0.1 + hc * 0.5, 0.2 + hc * 0.6, u)) * step(0.35, hc);
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
  float z = 1.0 / (below + 0.004);
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
  float phase = 0.9 / (below + 0.004) + uTime * 0.3;
  float settleLines = 1.0 - smoothstep(0.2, 0.6, fwidth(phase));
  float line = sin(phase * TAU + noise2(vec2(p.x * 4.0, floor(phase) * 0.7)) * 3.0);
  float sliver = mix(1.0, 0.5 + 0.8 * smoothstep(-0.5, 0.9, line), settleLines);
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
  refl *= refl / (refl + 0.04) * 1.3;
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
