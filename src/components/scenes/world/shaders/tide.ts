/**
 * Moon Tide (tidal mood): a calm sea under a high moon, a headland to the
 * right with its lighthouse, and a few rocks at your feet, backlit. Drawn
 * like an illustration: the water is a real plane of long, low swells (a sum
 * of analytic waves, each fading to its average once finer than a pixel), and
 * everything it shows is the scene above reflected off those slopes - so the
 * moon's glade, the lighthouse's column of warm light and the broken mirror of
 * the cape all come from the same place instead of being painted on.
 *
 * The music lives in the light, never in the water's shape: the glade
 * brightens with the track, each downbeat rolls a soft swell of moonlight down
 * it toward you, the treble sets its glints sparkling, and the lighthouse's
 * lamp burns with the level. The beam itself turns at its own slow pace.
 *
 * Colour script: one warm light in a cold night, then a second, smaller one.
 * The sky climbs from aqua haze through sapphire to the mood's ink; the moon is
 * ivory, and clouds are lit by it alone (silver-edged near it, dark further
 * out). The lighthouse lamp is the only other warm note.
 */
export const TIDE = /* glsl */ `
const float HORIZON = 0.42;
const float FOCAL = 1.0;
/* Eye height over the water, in the waves' units. */
const float EYE = 1.0;
const vec2 MOON_POS = vec2(-0.14, 0.76);
const float MOON_R = 0.05;
/* How fast a downbeat's swell of light rolls down the glade (screen units / s). */
const float GLADE_WAVE_SPEED = 0.16;
/* The swells: count, longest wavelength, and slope per wave. */
const int WAVES = 9;
const float WAVE_LONG = 1.6;
const float WAVE_SLOPE = 0.075;
/* The headland: where its cliff meets the sea, and its height (screen units). */
const float CAPE_X = 0.3;
const float CAPE_H = 0.052;
/* The lighthouse on it: position along the cape, tower height and half width. */
const float LIGHT_X = 0.4;
const float TOWER_H = 0.058;
const float TOWER_W = 0.0052;
/* One turn every ~18 s; the beam's reach at full sweep (screen units). */
const float BEAM_SPEED = 0.35;
const float BEAM_LEN = 1.1;
/* Cloud deck height (sets how fast clouds shrink toward the horizon). */
const float CLOUD_DECK = 0.32;

/* Palette, in linear light. */
const vec3 SKY_HAZE = vec3(0.012, 0.048, 0.07);
const vec3 SKY_SAPPHIRE = vec3(0.004, 0.013, 0.046);
const vec3 AIRGLOW = vec3(0.006, 0.03, 0.028);
const vec3 MOON_WARM = vec3(1.0, 0.93, 0.8);
const vec3 HALO_COOL = vec3(0.3, 0.62, 1.0);
const vec3 CORONA_IN = vec3(0.35, 0.65, 1.0);
const vec3 CORONA_OUT = vec3(1.0, 0.62, 0.52);
const vec3 CLOUD_SHADE = vec3(0.004, 0.008, 0.022);
const vec3 CLOUD_BODY = vec3(0.022, 0.034, 0.062);
const vec3 CLOUD_SILVER = vec3(0.42, 0.46, 0.55);
const vec3 LAND_FAR = vec3(0.008, 0.024, 0.04);
const vec3 CLIFF_LIT = vec3(0.05, 0.07, 0.095);
const vec3 CLIFF_SHADE = vec3(0.004, 0.008, 0.016);
const vec3 TOWER_LIT = vec3(0.2, 0.22, 0.27);
const vec3 TOWER_SHADE = vec3(0.02, 0.025, 0.04);
const vec3 TOWER_BAND = vec3(0.08, 0.012, 0.014);
const vec3 LAMP = vec3(1.0, 0.76, 0.42);
const vec3 WINDOW = vec3(1.0, 0.6, 0.28);
const vec3 ROCK = vec3(0.004, 0.006, 0.011);
const vec3 ROCK_RIM = vec3(0.5, 0.55, 0.62);
const vec3 WATER_DEEP = vec3(0.001, 0.01, 0.019);
const vec3 WATER_BODY = vec3(0.004, 0.03, 0.04);
/* Water drinks red first: the mirror comes back a touch greener than the sky. */
const vec3 WATER_TINT = vec3(0.78, 0.97, 1.0);

float lampLevel() {
  return mix(0.85, 0.55 + uLevel * 1.0, uPlaying) * (1.0 + kickFlash(2.0) * 0.35 * uPlaying);
}

/* Ridged 1D noise: a crest line of sharp notches and peaks. */
float crag(float x, float seed) {
  float r = 0.0;
  float a = 0.5;
  float f = 9.0;
  for (int i = 0; i < 3; i++) {
    r += a * (1.0 - abs(noise2(vec2(x * f, seed + float(i) * 5.3)) * 2.0 - 1.0));
    f *= 2.3;
    a *= 0.45;
  }
  return r;
}
/* The headland's skyline: a cliff facing the moon, rounding over into a long
   back that runs out of frame. */
float capeTop(float x) {
  float cliff = smoothstep(CAPE_X, CAPE_X + 0.006, x) * (0.8 + 0.2 * smoothstep(CAPE_X, CAPE_X + 0.05, x));
  return HORIZON + CAPE_H * cliff * (0.75 + 0.45 * fbm2(vec2(x * 6.0, 3.0)) + 0.06 * crag(x * 3.0, 7.0)) - max(x - CAPE_X - 0.3, 0.0) * 0.04;
}

/* The moon: ivory, its seas darker, bright-rimmed craters, a rayed one. */
vec3 moonDisc(vec2 dm) {
  vec2 uv = dm / MOON_R;
  float r2 = dot(uv, uv);
  float nz = sqrt(max(1.0 - r2, 0.0));
  /* Seas and highlands on the sphere, foreshortened toward the limb. */
  vec2 st = uv * (1.0 + 0.35 * (1.0 - nz));
  float maria = smoothstep(0.46, 0.64, fbm2(st * 1.7 + vec2(4.3, 1.9)));
  maria = max(maria, smoothstep(0.08, 0.0, length(st - vec2(-0.25, 0.3)) - 0.16) * 0.8);
  float grain = fbm2(st * 7.0 + 2.0);
  /* Craters: a jittered grid, each a bright rim round a darker floor. */
  vec2 cg = st * 4.5;
  vec2 id = floor(cg);
  float crater = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 cid = id + vec2(float(i), float(j));
      float h = hash12(cid + 3.1);
      vec2 cc = cid + 0.5 + (vec2(hash12(cid), hash12(cid + 7.7)) - 0.5) * 0.6;
      float cr = 0.12 + 0.2 * h * h;
      float d = length(cg - cc) / cr;
      crater += step(0.45, h) * (exp(-sq((d - 1.0) / 0.2)) * 0.5 - (1.0 - smoothstep(0.6, 1.0, d)) * 0.25);
    }
  }
  /* A young crater low on the disc, throwing faint rays across it. */
  vec2 ty = st - vec2(0.12, -0.55);
  float rays = pow(noise2(vec2(atan(ty.y, ty.x) * 5.0, 1.0)), 3.0) * exp(-length(ty) * 2.2);
  float albedo = mix(1.0, 0.6, maria) * (0.92 + 0.16 * grain) * (1.0 + crater * 0.18) + rays * 0.25;
  albedo += exp(-length(ty) / 0.05) * 0.4;
  return MOON_WARM * albedo * mix(0.8, 1.0, nz) * 0.95;
}

/* A deck of broken cloud seen in perspective, lit only by the moon: dark
   bodies, their edges silvered where they turn toward it. */
vec4 moonClouds(vec2 q, float d) {
  float h = q.y - HORIZON;
  vec2 cp = vec2(q.x, FOCAL) * (CLOUD_DECK / max(h, 0.012));
  vec2 mp = vec2(MOON_POS.x, FOCAL) * (CLOUD_DECK / (MOON_POS.y - HORIZON));
  vec2 wind = vec2(uTime * 0.006, 0.0);
  vec2 sc = vec2(2.2, 3.4);
  float n = fbm2((cp + wind) * sc);
  float band = smoothstep(0.04, 0.16, h) * (1.0 - smoothstep(0.26, 0.5, h));
  float dens = n + band * 0.22 - 0.1;
  /* Density measured a step toward the moon: where it falls, the edge is lit. */
  vec2 toMoon = normalize(mp - cp + 1e-4);
  float n2 = fbm2((cp + wind + toMoon * 0.06) * sc);
  float aa = fwidth(dens) + 0.01;
  float cov = smoothstep(0.5 - aa, 0.5 + aa + 0.08, dens) * smoothstep(0.01, 0.07, h);
  float edge = 1.0 - smoothstep(0.5, 0.62, dens);
  float lit = clamp((n - n2) * 9.0 + 0.4, 0.0, 1.0);
  float near = exp(-d * 3.5);
  vec3 c = mix(CLOUD_SHADE, CLOUD_BODY, lit * 0.6 + near * 0.4);
  c += CLOUD_SILVER * edge * (lit * 0.6 + 0.4) * (near * 0.9 + exp(-d * 1.2) * 0.12);
  return vec4(c, cov * 0.92);
}

vec3 tideSky(vec2 q, float moonGain) {
  float y = clamp((q.y - HORIZON) / (1.0 - HORIZON), 0.0, 1.0);
  vec3 c = mix(SKY_HAZE, SKY_SAPPHIRE, smoothstep(0.0, 0.35, y));
  c = mix(c, uBg * 0.8, smoothstep(0.35, 1.0, y));
  c += AIRGLOW * exp(-y * 16.0);
  vec2 dm = q - MOON_POS;
  float d = length(dm);
  float pulse = (1.0 + uBass * 0.2 * uPlaying) * moonGain;
  vec3 rd = normalize(vec3(q.x, y + 0.05, 1.0));
  c += starfield(rd, 1.1) * smoothstep(0.1, 0.5, y) * (1.0 - exp(-d * 6.0));
  /* The disc, then the clouds that may cross it. */
  float aa = fwidth(d) * 1.2;
  if (d < MOON_R + 0.01) c = mix(c, moonDisc(dm) * moonGain, 1.0 - smoothstep(MOON_R - aa, MOON_R + aa, d));
  vec4 cl = moonClouds(q, d);
  c = mix(c, cl.rgb, cl.a);
  /* Moonlight in the air, over everything: a wide cool bloom, a tight warm
     one, and the faint iridescent ring thin cloud draws around a bright moon. */
  c += HALO_COOL * exp(-d * 3.2) * 0.03 * pulse;
  c += mix(uColA, HALO_COOL, 0.5) * exp(-d * 7.0) * 0.08 * pulse;
  c += MOON_WARM * exp(-d * 26.0) * 0.3 * pulse;
  float ring = exp(-sq((d - 0.17) / 0.03));
  c += mix(CORONA_IN, CORONA_OUT, smoothstep(0.14, 0.2, d)) * ring * 0.012 * pulse;
  return c;
}

/* The lighthouse's lamp and its turning beam, as light in the air. */
vec3 lighthouseLight(vec2 q, vec2 lamp) {
  float a = uTime * BEAM_SPEED;
  float across = cos(a);
  /* sin(a) < 0: the beam is swinging through you. */
  float facing = pow(max(-sin(a), 0.0), 10.0);
  vec2 v = q - lamp;
  float along = v.x * sign(across);
  /* Clamped: behind the lamp exp(-t) would overflow, and inf * 0 is NaN. */
  float t = max(along, 0.0) / (BEAM_LEN * abs(across) + 0.02);
  float width = 0.0025 + max(along, 0.0) * 0.045;
  float beam = step(0.0, along) * exp(-t * 2.4) * exp(-sq(v.y / width)) * (1.0 - smoothstep(0.5, 1.0, t));
  beam *= 0.5 / (0.5 + abs(across));
  float r = length(v * vec2(1.0, 1.6));
  float glow = exp(-r / 0.004) * 0.9 + exp(-r / 0.025) * 0.12 + facing * (exp(-r / 0.02) * 0.9 + exp(-r / 0.08) * 0.15);
  /* A flat streak when it looks straight at you, like a lens would see it. */
  glow += facing * exp(-abs(v.x) / 0.12) * exp(-sq(v.y / 0.0025)) * 0.3;
  return LAMP * (beam * 0.4 + glow) * lampLevel();
}

/* Everything above the water: sky, the far shore, the cape and its light. */
vec3 tideAbove(vec2 q, float moonGain) {
  vec3 c = tideSky(q, moonGain);
  float aaY = 1.5 / uRes.y;
  /* A low far shore on the left, lost in the haze - it breaks the ruled line. */
  float shore = HORIZON + (0.004 + 0.012 * fbm2(vec2(q.x * 5.0, 7.0))) * smoothstep(-0.3, -0.5, q.x);
  c = mix(c, mix(LAND_FAR, SKY_HAZE, 0.35), (1.0 - smoothstep(shore - aaY, shore + aaY, q.y)) * step(HORIZON, q.y));

  /* Sampled a hair off sideways by height, so the cliff face breaks into
     buttresses instead of one clean edge. */
  float jag = crag(q.y * 18.0, 4.0);
  float top = capeTop(q.x + 0.012 * (jag - 0.5));
  float dist = q.y - top;
  float cover = (1.0 - smoothstep(-aaY, aaY, dist)) * step(CAPE_X - 0.01, q.x);
  if (cover > 0.0) {
    /* The cliff face turned to the moon takes its light, in strata; the back
       of the headland is in shade. Faint aerial haze over all of it. */
    float face = 1.0 - smoothstep(CAPE_X + 0.008, CAPE_X + 0.03, q.x);
    float lift = clamp((q.y - HORIZON) / CAPE_H, 0.0, 1.0);
    float strata = fbm2(vec2(q.x * 12.0, q.y * 260.0));
    vec3 lit = CLIFF_LIT * (0.4 + 0.5 * strata + 0.5 * jag) * (0.45 + 0.75 * lift);
    vec3 rock = mix(CLIFF_SHADE, lit, face);
    /* The crest catching the moon, and a dark turf line along the top. */
    rock += CLIFF_LIT * 0.8 * exp(dist / 0.0015) * smoothstep(CAPE_X + 0.25, CAPE_X, q.x);
    rock = mix(rock, CLIFF_SHADE * 0.7, smoothstep(-0.008, -0.002, dist) * (1.0 - face) * 0.6);
    /* Slow surf breaking white at the foot of the cliff. */
    float surf = exp(-(q.y - HORIZON) / 0.0018) * face * (0.5 + 0.5 * noise2(vec2(q.x * 90.0, uTime * 0.4)));
    rock += vec3(0.5, 0.6, 0.66) * surf * 0.25;
    rock = mix(rock, SKY_HAZE, 0.15);
    c = mix(c, rock, cover);
  }

  /* The lighthouse on the cliff top: a tapered white tower lit on its moon
     side, a dark band, the gallery, the glowing lantern room, a cap. */
  float base = capeTop(LIGHT_X) - 0.004;
  float ty = (q.y - base) / TOWER_H;
  float hw = TOWER_W * mix(1.0, 0.72, clamp(ty, 0.0, 1.0));
  float tx = (q.x - LIGHT_X) / hw;
  float aaX = 1.5 / (uRes.y * hw);
  float tower = (1.0 - smoothstep(1.0 - aaX, 1.0 + aaX, abs(tx))) * step(0.0, ty) * step(ty, 1.0);
  vec3 tcol = mix(TOWER_LIT, TOWER_SHADE, smoothstep(-0.7, 0.6, tx));
  tcol = mix(tcol, TOWER_BAND * (1.2 - smoothstep(-0.7, 0.6, tx) * 0.8), step(0.45, ty) * step(ty, 0.62));
  c = mix(c, tcol, tower);
  float topY = base + TOWER_H;
  float gallery = step(abs(q.x - LIGHT_X), TOWER_W * 1.25) * step(topY, q.y) * step(q.y, topY + 0.0022);
  c = mix(c, TOWER_SHADE, gallery);
  float roomY = topY + 0.0022;
  float room = step(abs(q.x - LIGHT_X), TOWER_W * 0.62) * step(roomY, q.y) * step(q.y, roomY + 0.0075);
  c = mix(c, LAMP * (1.1 + 0.6 * lampLevel()), room);
  float capY = roomY + 0.0075;
  float cap = step(abs(q.x - LIGHT_X), TOWER_W * 0.8 * (1.0 - (q.y - capY) / 0.005)) * step(capY, q.y);
  c = mix(c, TOWER_SHADE, cap);
  /* The keeper's cottage beside it, one window lit. */
  vec2 hv = q - vec2(LIGHT_X + 0.022, capeTop(LIGHT_X + 0.022) - 0.003);
  float house = step(abs(hv.x), 0.013) * step(0.0, hv.y) * step(hv.y, 0.011 - max(abs(hv.x) - 0.004, 0.0) * 0.35);
  float win = step(abs(hv.x + 0.004), 0.0022) * step(abs(hv.y - 0.0045), 0.0022);
  c = mix(c, mix(TOWER_SHADE * 0.8, WINDOW * 0.5 * lampLevel(), win), house);
  return c + lighthouseLight(q, vec2(LIGHT_X, roomY + 0.0038));
}

/* The swells at a point of the sea: surface slope (d/dx, d/dz). */
vec2 swellSlope(vec2 w) {
  vec2 g = vec2(0.0);
  float wl = WAVE_LONG;
  for (int i = 0; i < WAVES; i++) {
    float fi = float(i);
    /* Crests mostly parallel to the shore you face, a few cross-seas. */
    float ang = (hash12(vec2(fi, 3.0)) - 0.5) * (0.5 + fi * 0.12);
    vec2 dir = vec2(sin(ang), cos(ang));
    float k = TAU / wl;
    float ph = dot(dir, w) * k - uTime * sqrt(9.8 * k) * 0.35 + hash12(vec2(fi, 9.0)) * TAU;
    /* Finer than a pixel, a wave averages out: the far sea goes glassy. */
    float settle = 1.0 - smoothstep(0.6, 2.2, fwidth(ph));
    g += dir * cos(ph) * WAVE_SLOPE * settle;
    wl *= 0.66;
  }
  return g;
}

/* Rocks at your feet, black against the moon, silver-rimmed: a boulder and
   a low shelf on the left, one stone on the right. Continuous everywhere (a
   jump would blow up fwidth into a smear down the screen). */
float rockTop(float x) {
  float a = 0.17 * pow(max(1.0 - sq((x + 0.84) / 0.25), 0.0), 0.45);
  float b = 0.055 * pow(max(1.0 - sq((x + 0.52) / 0.2), 0.0), 0.35);
  float c = 0.045 * pow(max(1.0 - sq((x - 0.68) / 0.07), 0.0), 0.4);
  float h = max(max(a, b), c);
  return h * (0.78 + 0.35 * crag(x, 2.0)) - 0.003;
}

vec3 world(vec2 fragCoord) {
  float aspect = uRes.x / uRes.y;
  vec2 p0 = vec2((fragCoord.x / uRes.x - 0.5) * aspect, fragCoord.y / uRes.y);
  vec2 p = p0 + vec2(uPointer.x * 0.01, 0.0);
  vec3 col;
  if (p.y >= HORIZON) {
    col = tideAbove(p, 1.0);
  } else {
    /* The sea plane under your eye; the waves' slopes tilt its mirror. */
    float below = HORIZON - p.y;
    /* Nearness for the nod: the sea at your feet moves, the horizon holds. */
    gNear = below / HORIZON;
    vec3 rd = normalize(vec3(p.x, -below, FOCAL));
    float s = EYE / below;
    vec2 w = vec2(p.x, FOCAL) * s;
    vec2 g = swellSlope(w);
    vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
    vec3 r = reflect(rd, n);
    r.y = max(r.y, 1e-3);
    vec2 qr = vec2(r.x, r.y) / r.z * FOCAL + vec2(0.0, HORIZON);

    /* Downbeat swells: a band of moonlight rolling from the horizon toward you. */
    float swellLight = 0.0;
    for (int i = 0; i < 3; i++) {
      float age = uKicks[i];
      swellLight += exp(-sq((below - age * GLADE_WAVE_SPEED) / 0.035)) * exp(-age * 1.1);
    }
    float gain = 1.0 + (uLevel * 0.35 + swellLight * 0.9 + uTreble * 0.3) * uPlaying;
    vec3 refl = tideAbove(qr, gain) * WATER_TINT;
    /* A soft specular lobe round the moon's mirror: the glade's body between glints. */
    refl += MOON_WARM * exp(-sq(length(qr - MOON_POS) / 0.075)) * 0.34 * gain;

    float cosV = clamp(dot(-rd, n), 0.0, 1.0);
    float fres = 0.04 + 0.96 * pow(1.0 - cosV, 5.0);
    fres = mix(0.3, 1.0, fres);
    vec3 body = mix(WATER_BODY, WATER_DEEP, smoothstep(0.0, 0.3, below)) * (0.8 + 0.4 * n.z);
    col = mix(body, refl, fres);
    /* A hairline of light where sea meets sky. */
    col += mix(uColA, vec3(1.0), 0.45) * exp(-below * 300.0) * 0.05;
  }

  /* The near rocks, over everything, with their own parallax. */
  float rx = p0.x + uPointer.x * 0.035;
  float rt = rockTop(rx);
  float rdist = p0.y - rt;
  float raa = fwidth(rdist) + 1.0 / uRes.y;
  float rock = 1.0 - smoothstep(-raa, raa, rdist);
  if (rock > 0.0) {
    /* Backlit: faces toward you in shadow, a faint sky fill, and a silver rim
       where the top edge turns to the moon. */
    float slope = (rockTop(rx + 0.003) - rockTop(rx - 0.003)) / 0.006;
    float toMoon = clamp(0.35 + slope * sign(MOON_POS.x - rx) * 1.5, 0.0, 1.0);
    /* Facets: flat planes of rock meeting at creases, a shade apart. */
    float facet = floor(fbm2(p0 * vec2(26.0, 18.0)) * 5.0) / 5.0;
    vec3 rc = ROCK * (0.6 + 0.8 * facet) + SKY_HAZE * 0.08 * smoothstep(-0.06, 0.0, rdist);
    rc += ROCK_RIM * exp(rdist / 0.0012) * toMoon * 0.3;
    /* Wet glints on the ledges facing the moon. */
    float wet = smoothstep(0.74, 0.8, fbm2(p0 * vec2(110.0, 28.0) + 4.0)) * exp(rdist / 0.02) * toMoon;
    rc += ROCK_RIM * wet * 0.1;
    col = mix(col, rc, rock);
    gNear = mix(gNear, 1.0, rock);
  }
  return col;
}
`;
