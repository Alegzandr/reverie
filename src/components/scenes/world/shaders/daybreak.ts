/**
 * Daybreak (light mood): gliding just above a sea of clouds at sunrise, the
 * sun low ahead, pastel sky overhead. Clouds are a thin slab of warped noise
 * marched only where the ray crosses it, lit with a single sun-ward sample
 * (bright rims, lavender shadows). The music warms the light: level lifts the
 * glow on the cloud tops, bass swells the sun, treble glints in the high air.
 */
export const DAYBREAK = /* glsl */ `
const float CLOUD_TOP = 0.0;
const float CLOUD_BASE = -1.6;
const vec3 DAY_SUN = vec3(0.0, 0.1, 1.0);

float dayDensity(vec3 p) {
  vec3 q = p * vec3(0.32, 0.55, 0.32) + vec3(uTravel * 0.02, 0.0, 0.0);
  vec4 w = noise3v(q * 0.35 + vec3(0.0, uTime * 0.01, 0.0));
  q += (w.gba - 0.5) * 1.4;
  /* A fine erosion octave crisps the billow edges. */
  float f = fbm3(q) - (noise3(q * 4.3 + 9.0) - 0.5) * 0.14;
  float y = (p.y - CLOUD_BASE) / (CLOUD_TOP - CLOUD_BASE);
  /* Flat bottoms, billowing tops. */
  float profile = smoothstep(0.0, 0.25, y) * (1.0 - smoothstep(0.55, 1.0, y));
  return max(0.0, (f - 0.5) * 4.2) * profile;
}

vec3 daySky(vec3 rd) {
  vec3 sun = normalize(DAY_SUN);
  float y = max(rd.y, 0.0);
  vec3 zenith = mix(uColB, vec3(0.2, 0.36, 0.8), 0.55) * 0.42;
  vec3 horizon = mix(uColA, vec3(1.0, 0.7, 0.52), 0.55) * 0.62;
  vec3 c = mix(horizon, zenith, pow(y, 0.55));
  float s = max(dot(rd, sun), 0.0);
  float pulse = 1.0 + uBass * 0.35 + kickFlash(3.0) * 0.2;
  c += vec3(1.0, 0.86, 0.7) * pow(s, 14.0) * 0.35 * pulse;
  c += vec3(1.0, 0.96, 0.9) * smoothstep(0.99905, 0.9994, s) * 2.0;
  c += vec3(1.0) * uTreble * 0.04 * pow(max(noise2(rd.xy * 60.0 + uTime * 0.3), 0.0), 8.0);
  return c;
}

vec3 world(vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * uRes) / uRes.y;
  vec3 ro = vec3(uPointer.x * 0.3, 0.9 + sin(uTime * 0.12) * 0.06, uTravel * 0.9);
  vec3 fw = normalize(vec3(uPointer.x * 0.05, -0.12 - uPointer.y * 0.03, 1.0));
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.4 * fw);
  vec3 sun = normalize(DAY_SUN);

  vec3 sky = daySky(rd);
  if (rd.y >= -0.005) return sky;

  float t0 = (CLOUD_TOP - ro.y) / rd.y;
  float t1 = min((CLOUD_BASE - ro.y) / rd.y, 60.0);
  const int STEPS = 40;
  float dt = (t1 - t0) / float(STEPS);
  float t = t0 + dt * rayJitter(fragCoord);
  vec3 col = vec3(0.0);
  float T = 1.0;
  vec3 shade = mix(uColB, vec3(0.42, 0.38, 0.7), 0.6) * 0.28;
  vec3 lit = vec3(1.0, 0.93, 0.86) * 0.78;
  vec3 rim = mix(uColA, vec3(1.0, 0.75, 0.6), 0.5);
  float glow = 0.9 + uLevel * 0.3;
  for (int i = 0; i < STEPS; i++) {
    vec3 p = ro + rd * t;
    float d = dayDensity(p);
    if (d > 0.01) {
      float toward = dayDensity(p + sun * 0.35);
      float light = clamp(0.35 + (d - toward) * 2.2, 0.0, 1.0);
      float forward = pow(max(dot(rd, sun), 0.0), 6.0);
      vec3 c = mix(shade, lit * glow, light) + rim * forward * light * 0.6;
      float a = 1.0 - exp(-d * dt * 2.2);
      col += T * a * c;
      T *= 1.0 - a;
      if (T < 0.02) break;
    }
    t += dt;
  }
  vec3 below = mix(uColB, vec3(0.5, 0.52, 0.8), 0.5) * 0.3;
  col += T * below;
  /* Aerial perspective: distant cloud tops melt into the horizon light. */
  float fog = 1.0 - exp(-t0 * 0.025);
  return mix(col, daySky(normalize(vec3(rd.x, 0.0, rd.z))), fog);
}
`;
