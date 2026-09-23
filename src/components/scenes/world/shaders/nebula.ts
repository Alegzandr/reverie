/**
 * Nebula Drift (aurora mood): a stellar nursery hanging in deep space, seen
 * from a slow orbit. A young cluster at its heart lights the gas from inside
 * (emission scales with the light reaching each point), dark dust lanes cut
 * across it, and black space with stars frames it. The cluster is the music's
 * heart: bass swells its light, every kick sends a shell of light rushing out
 * through the gas, mids stir the folds, treble sets the stars twinkling.
 */
export const NEBULA = /* glsl */ `
const float NEB_R = 8.0;

/* Hubble palette, bent to the mood: ionised teal near the hot core, the accent
   through the body, a warm rose at the rim - so even a one-hue mood reads rich. */
vec3 nebRamp(float h, float lit) {
  vec3 teal = mix(uColC, vec3(0.1, 0.75, 0.95), 0.55);
  vec3 warm = mix(uColA, vec3(1.0, 0.36, 0.55), 0.45);
  vec3 c = mix(teal, uColA, smoothstep(0.2, 0.5, h));
  c = mix(c, warm, smoothstep(0.55, 0.9, h));
  return mix(c, vec3(1.0, 0.92, 0.96), smoothstep(2.5, 7.0, lit) * 0.35);
}

/* Light from the central cluster: 1/r² with a soft core, kicks as travelling shells. */
float nebLight(vec3 p) {
  float r = length(p);
  float power = 2.0 + uBass * 1.6 + kickFlash(2.5) * 1.1;
  float shell = 0.0;
  for (int i = 0; i < 3; i++) {
    float age = uKicks[i];
    shell += exp(-abs(r - age * 7.5) * 1.3) * exp(-age * 1.2) * (1.0 - float(i) * 0.3);
  }
  return power * 3.0 / (0.6 + r * r * 0.9) + shell * 0.9;
}

float nebDensity(vec3 p, out float hue, out float dust) {
  float r = length(p);
  vec4 w = noise3v(p * 0.1 + vec3(0.0, uTime * 0.006, uTime * 0.009));
  /* A slow swirl around the axis gives the gas a sense of rotation. */
  vec3 s = p;
  s.xz *= rot(r * 0.14 + uTravel * 0.02);
  vec3 q = s * 0.34 + (w.gba - 0.5) * (4.0 + uMid * 1.6);
  /* Billows (fbm) carved into filaments (ridged): the Hubble look. */
  float body = fbm3(q);
  float veins = ridged3(q * 1.7 + 11.0);
  float f = body * 0.5 + veins * 0.68;
  float shape = 1.0 - smoothstep(NEB_R * 0.25, NEB_R, r * (0.8 + 0.4 * w.r));
  float cavity = smoothstep(0.6, 2.2, r);
  hue = smoothstep(2.6, 7.5, r) * 0.95 - 0.1 + (noise3(p * 0.07 + 20.0) - 0.5) * 1.2 + (body - 0.5) * 0.4;
  dust = smoothstep(0.52, 0.7, noise3(q * 1.3 + vec3(4.0, 1.0, 7.0))) * shape * smoothstep(1.5, 4.0, r);
  return pow(max(0.0, (f - 0.52 + uBass * 0.04) * 2.8), 1.9) * shape * cavity;
}

vec2 sphereHit(vec3 ro, vec3 rd, float R) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - R * R;
  float h = b * b - c;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}

vec3 world(vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * uRes) / uRes.y;
  float a = uTravel * 0.035 + uPointer.x * 0.12 + 0.6;
  float elev = 0.18 + sin(uTravel * 0.02) * 0.12 - uPointer.y * 0.06;
  float dist = 15.5 - uBass * 0.4;
  vec3 ro = vec3(sin(a) * cos(elev), sin(elev), cos(a) * cos(elev)) * dist;
  vec3 fw = normalize(-ro + vec3(0.0, -1.6, 0.0));
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.55 * fw);

  vec3 col = vec3(0.0);
  float T = 1.0;
  vec2 span = sphereHit(ro, rd, NEB_R);
  if (span.y > 0.0) {
    float t0 = max(span.x, 0.0);
    const int STEPS = 56;
    float dt = (span.y - t0) / float(STEPS);
    float t = t0 + dt * rayJitter(fragCoord);
    for (int i = 0; i < STEPS; i++) {
      vec3 p = ro + rd * t;
      float hue;
      float dust;
      float d = nebDensity(p, hue, dust);
      float lit = nebLight(p);
      float absorb = d * 0.9 + dust * 1.2;
      if (absorb > 0.002) {
        vec3 emit = nebRamp(hue, lit) * d * (0.005 + lit * (0.4 + uLevel * 0.25));
        float alpha = 1.0 - exp(-absorb * dt);
        col += T * emit * dt;
        T *= 1.0 - alpha;
        if (T < 0.02) break;
      }
      t += dt;
    }
  }

  /* The cluster itself: analytic cores so they stay pin-sharp. */
  vec3 core = mix(vec3(1.0, 0.95, 0.98), uColA, 0.2);
  float power = 0.8 + uBass * 1.0 + kickFlash(4.0) * 0.9;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec3 sp = i == 0 ? vec3(0.0) : vec3(sin(fi * 2.4), cos(fi * 3.1) * 0.6, cos(fi * 2.4)) * (0.5 + fi * 0.18);
    float tc = dot(sp - ro, rd);
    float ang = length(ro + rd * tc - sp) / max(tc, 0.1);
    float b = i == 0 ? 1.0 : 0.35;
    col += core * power * b * 0.00022 / (ang * ang + 0.000035) * (0.25 + 0.75 * T);
  }

  vec3 deep = uBg * 0.2 + mix(uColC, uColB, 0.5) * 0.015 * fbm3(rd * 2.5 + 7.0);
  col += T * (deep + starfield(rd, 1.2) * (0.7 + uTreble * 0.9));
  return col;
}
`;
