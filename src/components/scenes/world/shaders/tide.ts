/**
 * Moon Tide (tidal mood): a still, mirror-bright sea under a low moon - drawn
 * stylised, not simulated. The water reflects the whole sky; long, slow swell
 * lines (compressed by perspective toward the horizon) break the reflection
 * into slivers, which is what turns the moon's reflection into a shimmering
 * column of light. The music lives in that light, never in the water's shape:
 * the glade brightens with the track, each downbeat sends a soft swell of
 * moonlight rolling down the column toward you, and the treble sets a few
 * slivers glinting. Everything is analytic and edge-filtered, so it stays
 * crisp at any resolution.
 *
 * Colour script: one warm light in a cold night. The sky climbs from an aqua
 * haze at the horizon through sapphire to the mood's ink at the zenith; the
 * moon alone is warm (ivory disc, faint corona), and that warmth is what the
 * glade carries down onto the water, fraying to aqua at its edges. Clouds are
 * lit by the moon, not the sky: silver close to it, dark shapes further out.
 */
export const TIDE = /* glsl */ `
const float HORIZON = 0.46;
const vec2 MOON_POS = vec2(0.0, 0.76);
const float MOON_R = 0.055;
/* How fast a downbeat's swell of light rolls down the glade (screen units / s). */
const float GLADE_WAVE_SPEED = 0.16;

/* Palette, in linear light. */
const vec3 SKY_HAZE = vec3(0.010, 0.050, 0.070);
const vec3 SKY_SAPPHIRE = vec3(0.004, 0.013, 0.046);
const vec3 AIRGLOW = vec3(0.006, 0.030, 0.026);
const vec3 MOON_WARM = vec3(1.0, 0.92, 0.78);
/* The mirrored moon reads a shade warmer than the disc: the tonemap bleaches it. */
const vec3 GLADE_WARM = vec3(1.0, 0.86, 0.66);
const vec3 HALO_COOL = vec3(0.30, 0.62, 1.0);
const vec3 CORONA_IN = vec3(0.35, 0.65, 1.0);
const vec3 CORONA_OUT = vec3(1.0, 0.62, 0.52);
const vec3 CLOUD_SHADE = vec3(0.003, 0.005, 0.018);
const vec3 CLOUD_SILVER = vec3(0.17, 0.19, 0.26);
const vec3 WATER_DEEP = vec3(0.001, 0.010, 0.020);
/* Water drinks red first: the mirror comes back a touch greener than the sky. */
const vec3 WATER_TINT = vec3(0.78, 0.97, 1.0);

vec3 tideSky(vec2 q, float moon) {
  float y = clamp((q.y - HORIZON) / (1.0 - HORIZON), 0.0, 1.0);
  vec3 c = mix(SKY_HAZE, SKY_SAPPHIRE, smoothstep(0.0, 0.3, y));
  c = mix(c, uBg * 0.8, smoothstep(0.3, 1.0, y));
  c += AIRGLOW * exp(-y * 12.0);
  vec2 dm = q - MOON_POS;
  float d = length(dm);
  float pulse = 1.0 + uBass * 0.2;
  /* Moonlight in the air: a wide cool bloom, then a tight warm one, and the
     faint iridescent ring thin cloud draws around a bright moon. */
  c += HALO_COOL * exp(-d * 3.2) * 0.035 * pulse;
  c += mix(uColA, HALO_COOL, 0.5) * exp(-d * 7.0) * 0.1 * pulse;
  c += MOON_WARM * exp(-d * 24.0) * 0.4 * pulse;
  float ring = exp(-sq((d - 0.17) / 0.03));
  c += mix(CORONA_IN, CORONA_OUT, smoothstep(0.14, 0.2, d)) * ring * 0.014 * pulse;
  /* The disc: ivory, its seas a shade darker, the limb softly dimmed. */
  float aa = fwidth(d) * 1.2;
  float maria = smoothstep(0.42, 0.68, fbm2(dm * 34.0 + 11.0));
  float limb = sqrt(max(1.0 - sq(d / MOON_R), 0.0));
  vec3 disc = MOON_WARM * (1.25 + limb * 0.35) * (1.0 - maria * 0.28);
  c = mix(c, disc, (1.0 - smoothstep(MOON_R - aa, MOON_R + aa, d)) * moon);
  /* Thin cloud streaks crossing the lower sky, lit only by the moon. */
  float streak = smoothstep(0.58, 0.8, fbm2(vec2(q.x * 1.2 + uTime * 0.004, q.y * 22.0)));
  float band = smoothstep(0.02, 0.2, y) * (1.0 - smoothstep(0.4, 0.7, y));
  vec3 cloud = mix(CLOUD_SHADE, CLOUD_SILVER, exp(-d * 3.6));
  c = mix(c, cloud, streak * band * 0.5);
  vec3 rd = normalize(vec3(q.x, y + 0.05, 1.0));
  c += starfield(rd, 1.1) * smoothstep(0.15, 0.5, y) * (1.0 - streak * band) * (0.7 + uTreble * 0.5);
  return c;
}

vec3 world(vec2 fragCoord) {
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((fragCoord.x / uRes.x - 0.5) * aspect + uPointer.x * 0.02, fragCoord.y / uRes.y);
  if (p.y >= HORIZON) return tideSky(p, 1.0);

  /* Perspective: depth grows toward the horizon; world x widens with it. */
  float below = HORIZON - p.y;
  float z = 0.12 / below;
  vec2 w = vec2(p.x * z * 3.0, z + uTravel * 0.25);

  /* Swell lines, perspective-compressed (1/depth), rolling slowly in. Where
     they pack tighter than a pixel they fade to their average, so the far
     water goes glassy instead of shimmering. */
  float phase = 1.1 / (below + 0.004) + uTime * 0.35 + sin(p.x * 3.0 + uTime * 0.15) * 0.4;
  float fwp = fwidth(phase);
  float settle = 1.0 - smoothstep(0.15, 0.5, fwp);
  float swell = sin(phase * TAU) * settle;
  float swell2 = sin(phase * TAU * 2.3 + p.x * 9.0) * settle;
  float slide = (swell * 0.6 + swell2 * 0.4) * (0.002 + below * 0.05);

  /* A mirror of the sky (the moon's own disc left out - the glade stands for it). */
  vec2 m = vec2(p.x + slide, 2.0 * HORIZON - p.y);
  vec3 refl = tideSky(m, 0.0) * WATER_TINT;

  /* The glade: the moon's light on the water as a column of horizontal
     slivers, widening toward you. */
  /* Each sliver is its own length - the column frays at its edges. */
  float fray = noise2(vec2(floor(phase) * 3.7, 1.0));
  float gx = abs(p.x + slide * 3.0 - MOON_POS.x + (fray - 0.5) * below * 0.08);
  float width = (0.015 + below * 0.32) * (0.55 + fray * 0.9);
  float column = 1.0 - smoothstep(width * 0.25, width, gx);
  float core = 1.0 - smoothstep(0.0, width * 0.55, gx);
  float sliver = mix(0.35, smoothstep(0.1, 0.8, swell * 0.6 + swell2 * 0.4), settle);
  /* Downbeat swells: a band of moonlight rolling from the horizon toward you. */
  float swellLight = 0.0;
  for (int i = 0; i < 3; i++) {
    float age = uKicks[i];
    float front = age * GLADE_WAVE_SPEED;
    swellLight += exp(-sq((below - front) / 0.035)) * exp(-age * 1.1);
  }
  float lift = 1.0 + uLevel * 0.35 * uPlaying + swellLight * 0.9 * uPlaying;
  /* Treble glints: a few slivers catch the light, never the whole column. */
  float glint = step(0.9, hash12(vec2(floor(phase), floor((p.x + slide * 3.0) * 60.0)))) * uTreble * uPlaying * 1.6;
  /* Warm pearl where the moon is mirrored straight at you, aqua where the
     slivers fray out of it. */
  vec3 gladeTint = mix(mix(uColA, vec3(0.75, 0.95, 1.0), 0.55), mix(GLADE_WARM, vec3(1.0), 0.1), core);
  float fade = 0.9 - below * 0.9;
  vec3 glade = gladeTint * column * sliver * fade * 0.95 * (lift + glint);
  /* The light the slivers scatter into the water around them. */
  glade += mix(uColA, HALO_COOL, 0.4) * exp(-gx / (width * 1.6)) * fade * 0.03 * lift;

  /* Fresnel: far off the sea mirrors the sky; at your feet you look down into
     deep, dark water. */
  float fres = smoothstep(0.0, HORIZON, below);
  vec3 sea = refl * mix(0.95, 0.45, fres) + WATER_DEEP * fres;
  vec3 col = sea + glade;
  /* A hairline of light where sea meets sky. */
  col += mix(uColA, vec3(1.0), 0.45) * exp(-below * 260.0) * 0.07;
  return col;
}
`;
