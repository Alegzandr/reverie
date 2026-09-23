/**
 * Singularity (nocturne mood): a black hole with its accretion disk, light
 * bent around it (photon paths integrated through a Schwarzschild-style pull, so
 * the far side of the disk arcs over the shadow and the photon ring appears on
 * its own). The disk is the spectrum: bass at the inner edge, treble at the
 * rim, rotating Kepler-fast inside and slow outside. Kicks send luminous ripples
 * out across the disk, the jets breathe with the low end.
 */
export const SINGULARITY = /* glsl */ `
const float BH_IN = 2.6;
const float BH_OUT = 12.0;

vec3 bhSky(vec3 rd) {
  vec3 band = normalize(vec3(0.25, 1.0, 0.35));
  float milky = exp(-pow(dot(rd, band) * 2.6, 2.0));
  float n = fbm3(rd * 3.2 + 4.0);
  vec3 sky = uBg * 0.25 + mix(uColC, uColB, n) * milky * n * 0.09;
  return sky + starfield(rd, 1.4) * (0.8 + uTreble * 0.8);
}

vec4 bhDisk(vec3 hit, vec3 rd) {
  float r = length(hit.xz);
  float x = clamp((r - BH_IN) / (BH_OUT - BH_IN), 0.0, 1.0);
  /* Differential rotation: inner orbits lap the outer ones. */
  float ang = atan(hit.z, hit.x) + uTravel * 2.6 * pow(r, -1.5);
  vec3 sp = vec3(cos(ang) * 2.4, sin(ang) * 2.4, r * 1.9);
  float n = fbm3(sp);
  float arcs = 0.5 + 0.5 * sin(r * 6.0 + n * 5.0);
  float dens = smoothstep(0.0, 0.05, x) * (1.0 - smoothstep(0.45, 1.0, x)) * (0.3 + n * 1.1) * (0.55 + 0.45 * arcs);

  /* The disk is the spectrum, read in radius. */
  float band = x;
  float s = spec(band, 0.0);
  dens *= mix(0.75, 0.35 + s * 1.5, uPlaying);

  float ripple = 0.0;
  for (int i = 0; i < 3; i++) {
    float age = uKicks[i];
    ripple += exp(-abs(r - (BH_IN + age * 6.5)) * 1.6) * exp(-age * 0.9);
  }

  vec3 hot = vec3(1.0, 0.88, 0.72);
  vec3 c = mix(hot, uColA, smoothstep(0.0, 0.28, x));
  c = mix(c, uColB, smoothstep(0.28, 0.8, x));
  /* Relativistic beaming: the side rushing toward us burns brighter. */
  vec3 vel = normalize(vec3(-hit.z, 0.0, hit.x));
  float dop = clamp(1.0 + 0.6 * dot(vel, -rd), 0.3, 1.7);
  float bright = dens * dop * dop * dop * (0.3 + uBass * 0.5 + uLevel * 0.2) * (1.6 - x * 1.2) + ripple * 0.5;
  return vec4(c * bright, clamp(dens * 0.9 + ripple * 0.2, 0.0, 0.92));
}

vec3 world(vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * uRes) / uRes.y;
  float a = uTime * 0.012 + uPointer.x * 0.15 + 0.4;
  float elev = 0.13 + uPointer.y * -0.05 + sin(uTime * 0.05) * 0.02;
  float dist = 23.0;
  vec3 ro = vec3(sin(a) * cos(elev), sin(elev), cos(a) * cos(elev)) * dist;
  vec3 fw = normalize(-ro + vec3(0.0, -0.4, 0.0));
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
  vec3 up = cross(fw, rt);
  float roll = 0.12;
  vec3 r2 = rt * cos(roll) + up * sin(roll);
  vec3 u2 = up * cos(roll) - rt * sin(roll);
  vec3 rd = normalize(uv.x * r2 + uv.y * u2 + 1.9 * fw);

  vec3 p = ro;
  vec3 v = rd;
  vec3 h = cross(p, v);
  float h2 = dot(h, h);
  vec3 col = vec3(0.0);
  float T = 1.0;
  float ring = 0.0;
  float jet = 0.0;
  bool swallowed = false;
  for (int i = 0; i < 120; i++) {
    float r = length(p);
    float dt = clamp(r * 0.08, 0.03, 1.1);
    vec3 prev = p;
    v += -1.5 * h2 * p / pow(r, 5.0) * dt;
    p += v * dt;
    if (prev.y * p.y < 0.0) {
      vec3 hit = mix(prev, p, prev.y / (prev.y - p.y));
      float hr = length(hit.xz);
      if (hr > BH_IN * 0.95 && hr < BH_OUT) {
        vec4 d = bhDisk(hit, normalize(v));
        col += T * d.rgb;
        T *= 1.0 - d.a;
      }
    }
    ring += exp(-abs(r - 1.55) * 9.0) * dt;
    float axis = dot(p.xz, p.xz);
    jet += exp(-axis * 5.0 / (0.25 + abs(p.y) * 0.1)) * smoothstep(1.2, 3.0, abs(p.y)) * exp(-abs(p.y) * 0.13) * dt;
    if (r < 1.0) {
      swallowed = true;
      break;
    }
    if (r > 45.0 || T < 0.02) break;
  }
  /* The photon ring lives on escaping light only - the shadow stays true black. */
  if (!swallowed) {
    vec3 glow = mix(uColC, vec3(1.0), 0.3);
    col += T * glow * min(ring, 1.5) * (0.12 + uLevel * 0.25 + kickFlash(6.0) * 0.3);
    col += T * bhSky(normalize(v));
  }
  col += T * mix(uColB, vec3(0.85, 0.9, 1.0), 0.4) * jet * (0.03 + uBass * 0.3 + kickFlash(4.0) * 0.25);
  return col;
}
`;
