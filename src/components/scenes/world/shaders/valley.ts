/**
 * Echo Valley (horizon mood): dusk over a still lake, ranges of mountains
 * layered in mist, the sun settling into the notch between them. The music is
 * written on the ridgelines as fine threads of light: the nearest range sings
 * what plays now, and each range behind it carries what played a moment
 * earlier - the song echoing away into the distance. Drawn as layered
 * silhouettes (analytic, anti-aliased edges) mirrored in the water, so it stays
 * crisp at full resolution and costs next to nothing.
 */
export const VALLEY = /* glsl */ `
const float LAKE = 0.47;
const int RANGES = 5;

float valleyProfile(float x, float seed) {
  float h = 0.0;
  float a = 0.5;
  float f = 1.0;
  for (int i = 0; i < 5; i++) {
    float n = noise2(vec2(x * f, seed + float(i) * 13.1));
    h += a * (1.0 - abs(n * 2.0 - 1.0));
    f *= 2.1;
    a *= 0.48;
  }
  return h;
}

vec3 valleySky(vec2 q, float aspect) {
  float y = (q.y - LAKE) / (1.0 - LAKE);
  vec3 low = mix(uColA, vec3(1.0, 0.62, 0.38), 0.45) * 0.55;
  vec3 mid = mix(uColB, uColA, 0.35) * 0.16;
  vec3 high = uBg * 0.7 + uColC * 0.02;
  vec3 c = mix(low, mid, smoothstep(0.0, 0.35, y));
  c = mix(c, high, smoothstep(0.25, 0.95, y));
  /* Long, flat clouds lit from beneath by the sun. */
  float streak = fbm2(vec2(q.x * 1.6 + uTime * 0.006, q.y * 14.0));
  float band = smoothstep(0.5, 0.78, streak) * smoothstep(0.05, 0.25, y) * (1.0 - smoothstep(0.45, 0.8, y));
  c += mix(uColA, vec3(1.0, 0.7, 0.5), 0.5) * band * 0.08;
  /* The sun, low in the notch, and its wide warm bloom. */
  vec2 sun = vec2(0.0, LAKE + 0.075);
  float d = length((q - sun) * vec2(1.0, 1.0));
  float pulse = 1.0 + uBass * 0.25 + kickFlash(3.0) * 0.2;
  float aa = fwidth(d) * 1.5;
  c = mix(c, mix(vec3(1.0, 0.86, 0.66), uColA, 0.2) * 1.6, 1.0 - smoothstep(0.052 - aa, 0.052 + aa, d));
  c += mix(uColA, vec3(1.0, 0.72, 0.5), 0.5) * exp(-d * 9.0) * 0.35 * pulse;
  c += uColB * exp(-d * 2.5) * 0.05 * pulse;
  vec3 rd = normalize(vec3(q.x, y * 0.9 + 0.1, 1.0));
  c += starfield(rd, 0.7) * smoothstep(0.5, 0.9, y) * (0.5 + uTreble * 0.5);
  return c;
}

vec3 world(vec2 fragCoord) {
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((fragCoord.x / uRes.x - 0.5) * aspect, fragCoord.y / uRes.y);

  /* The lake mirrors everything above the shoreline, rippled a little -
     more near you, a touch more on the low end. */
  float under = step(p.y, LAKE);
  float depth = clamp((LAKE - p.y) / LAKE, 0.0, 1.0);
  vec2 q = p;
  q.y = mix(p.y, 2.0 * LAKE - p.y, under);
  float ripple = sin(p.y * 260.0 / (0.25 + depth) - uTime * 1.3) + 0.5 * sin(p.y * 510.0 / (0.3 + depth) + uTime * 0.9);
  q.x += ripple * 0.0012 * depth * (1.0 + uBass * 1.5) * under;

  vec3 col = valleySky(q, aspect);

  vec3 haze = mix(uColA, vec3(1.0, 0.66, 0.48), 0.45) * 0.36;
  vec3 ink = uBg * 0.55;
  for (int i = 0; i < RANGES; i++) {
    float fi = float(i);
    float near = fi / float(RANGES - 1);           /* 0 far .. 1 near */
    float drift = uTravel * (0.004 + near * 0.018) + uPointer.x * 0.02 * near;
    float x = q.x * (1.0 + near * 0.9) + drift + fi * 17.3;
    /* A V opening onto the sun: flanks rise away from the centre. Each range's
       V is offset and pitched differently, so the farther ones show through
       the saddles of the nearer ones - the layered, aerial-perspective look. */
    float cx = q.x - sin(fi * 2.3 + 0.7) * 0.18 * near;
    float flank = smoothstep(0.03, 1.1, abs(cx)) * (0.04 + near * 0.12) * (0.7 + 0.6 * hash12(vec2(fi, 4.0)));
    float base = LAKE + 0.004 + (1.0 - near) * 0.028;
    float h = base + flank + valleyProfile(x * 0.8, fi * 5.0) * (0.035 + near * 0.1) - near * 0.025;
    /* The music on the ridge: bass on the flanks, air near the notch; farther
       ranges hold older music - the echo. */
    float band = 1.0 - clamp(abs(q.x) / (aspect * 0.5), 0.0, 1.0);
    float age = (1.0 - near) * 2.2;
    float s = spec(band * 0.85, age);
    h += s * (0.018 + near * 0.05) * smoothstep(0.0, 0.25, abs(q.x)) * uPlaying;

    float dist = q.y - h;
    float aa = fwidth(dist) * 1.2 + 0.0004;
    float body = 1.0 - smoothstep(-aa, aa, dist);
    vec3 layer = mix(haze, ink, 0.12 + pow(near, 1.4) * 0.88);
    /* Mist pooling at each range's foot. */
    layer = mix(layer, haze, (1.0 - smoothstep(base, base + 0.05, q.y)) * (0.45 - near * 0.3));
    col = mix(col, layer, body);
    /* The thread of light along the ridge - brighter where the music peaks. */
    float thread = exp(-abs(dist) / (aa * 0.8 + 0.0003)) * (0.12 + s * 1.4) * (0.2 + near * 0.8);
    col += mix(uColA, vec3(1.0, 0.86, 0.72), 0.4 + s * 0.4) * thread * 0.3;
  }

  /* Motes drifting up over the water, catching the treble. */
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    vec2 m = vec2(
      (hash12(vec2(fi, 1.3)) - 0.5) * aspect * 0.9 + sin(uTime * 0.07 + fi) * 0.04,
      LAKE + 0.02 + fract(hash12(vec2(fi, 7.1)) + uTime * (0.004 + 0.003 * hash12(vec2(fi, 3.3)))) * 0.3
    );
    float d = length(q - m);
    col += mix(uColA, vec3(1.0, 0.9, 0.7), 0.5) * 0.00002 / (d * d + 0.00002) * (0.15 + uTreble * 0.5);
  }

  /* Water: darker, cooler, faintly glinting under the sun path. */
  vec3 water = col * mix(0.72, 0.5, depth) + uColB * 0.004;
  float path = exp(-abs(p.x) * 7.0) * (0.5 + 0.5 * ripple) * 0.06 * (1.0 - depth);
  water += mix(uColA, vec3(1.0, 0.8, 0.6), 0.5) * path;
  col = mix(col, water, under);
  return col;
}
`;
