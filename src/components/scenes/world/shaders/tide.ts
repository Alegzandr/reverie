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
 */
export const TIDE = /* glsl */ `
const float HORIZON = 0.46;
const vec2 MOON_POS = vec2(0.0, 0.76);
const float MOON_R = 0.055;
/* How fast a downbeat's swell of light rolls down the glade (screen units / s). */
const float GLADE_WAVE_SPEED = 0.16;

vec3 tideSky(vec2 q, float moon) {
  float y = clamp((q.y - HORIZON) / (1.0 - HORIZON), 0.0, 1.0);
  vec3 low = mix(uColB, uColC, 0.35) * 0.1 + uBg * 0.7;
  vec3 high = uBg * 0.35;
  vec3 c = mix(low, high, pow(y, 0.6));
  float d = length(q - MOON_POS);
  float pulse = 1.0 + uBass * 0.2;
  /* Halo in two soft rings, then the disc. */
  c += mix(uColB, vec3(1.0), 0.35) * exp(-d * 5.5) * 0.14 * pulse;
  c += mix(uColA, vec3(1.0), 0.6) * exp(-d * 18.0) * 0.28 * pulse;
  float aa = fwidth(d) * 1.2;
  vec3 disc = mix(vec3(0.94, 0.97, 1.0), uColA, 0.08) * 1.5;
  c = mix(c, disc, (1.0 - smoothstep(MOON_R - aa, MOON_R + aa, d)) * moon);
  /* A few thin cloud streaks crossing the lower sky. */
  float streak = smoothstep(0.62, 0.8, fbm2(vec2(q.x * 1.2 + uTime * 0.004, q.y * 22.0)));
  c += mix(uColB, vec3(1.0), 0.4) * streak * 0.03 * smoothstep(0.02, 0.2, y) * (1.0 - smoothstep(0.4, 0.7, y));
  vec3 rd = normalize(vec3(q.x, y + 0.05, 1.0));
  c += starfield(rd, 1.1) * smoothstep(0.15, 0.5, y) * (0.7 + uTreble * 0.5);
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
  vec3 refl = tideSky(m, 0.0);

  /* The glade: the moon's light on the water as a column of horizontal
     slivers, widening toward you. */
  /* Each sliver is its own length - the column frays at its edges. */
  float fray = noise2(vec2(floor(phase) * 3.7, 1.0));
  float gx = abs(p.x + slide * 3.0 - MOON_POS.x + (fray - 0.5) * below * 0.08);
  float width = (0.015 + below * 0.32) * (0.55 + fray * 0.9);
  float column = 1.0 - smoothstep(width * 0.25, width, gx);
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
  vec3 glade = mix(vec3(0.9, 0.96, 1.0), uColA, 0.15) * column * sliver * (0.9 - below * 0.9) * 0.9 * (lift + glint);

  /* Mirror tint: the sea is darker than the sky it holds, most at your feet. */
  vec3 sea = refl * mix(0.9, 0.55, smoothstep(0.0, HORIZON, below)) + uBg * 0.05;
  vec3 col = sea + glade;
  /* A hairline of light where sea meets sky. */
  col += mix(uColB, vec3(1.0), 0.5) * exp(-below * 260.0) * 0.08;
  return col;
}
`;
