/**
 * Singularity (nocturne mood): a total eclipse, face-on, drawn the way the real
 * thing photographs. The corona falls off steeply from the limb (a K-corona
 * ~r^-7 over a faint, far-reaching F-corona); long helmet streamers flare out
 * along a tilted equator, tapering and bending as they go; fine polar plumes
 * comb the poles; a few rose prominences stand on the limb over a hairline of
 * chromosphere; and one diamond bead burns where the last of the light slips
 * past. The disc is not quite void: a whisper of earthshine. Pearl white near
 * the limb, only the far corona takes the mood's hue.
 *
 * The corona is the spectrum: bass along the lower limb, treble along the upper,
 * and the music travels outward through it - the light near the disc is what
 * plays now, further out what played a moment ago. Each downbeat lets a faint
 * shell of light rise off the limb; the bead breathes with the low end.
 */
export const SINGULARITY = /* glsl */ `
const vec2 EC_C = vec2(0.0, 0.1);
const float EC_R = 0.15;
/* How near the eclipse counts for the nod's parallax: it floats in front of the stars, not at your feet. */
const float ECLIPSE_NEAR = 0.5;
/* The solar equator's tilt, and where the bead sits on the limb. */
const float EQ_TILT = 0.32;
const float BEAD_ANGLE = 2.4;
/* Seconds of music held per disc radius above the limb. */
const float CORONA_MEMORY = 1.6;

float angDiff(float a, float b) {
  return atan(sin(a - b), cos(a - b));
}

/* Helmet streamers: broad at the limb, tapering and curving poleward as they
   reach out. Four of them, uneven, like a real minimum-activity corona. */
float streamers(float th, float rr) {
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float side = i < 2 ? 0.0 : PI;
    float base = EQ_TILT + side + (i == 0 || i == 2 ? 0.16 : -0.2);
    float bend = (i == 0 || i == 3 ? 1.0 : -1.0) * 0.1 * (rr - 1.0);
    float width = (0.3 + 0.14 * hash12(vec2(fi, 3.0))) / pow(rr, 0.75);
    float strength = 0.6 + 0.8 * hash12(vec2(fi, 9.0));
    s += strength * exp(-sq(angDiff(th, base + bend) / width));
  }
  return s;
}

vec3 world(vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * uRes) / uRes.y;
  vec2 d = uv - EC_C - uPointer * 0.006;
  float r = length(d);
  vec2 dir = d / max(r, 1e-4);
  float th = atan(d.y, d.x);
  float rr = max(r / EC_R, 1.0);
  float x = rr - 1.0;
  float aa = fwidth(r) * 1.2;

  /* Radial falloff: bright inner corona, faint far glow. */
  float kCorona = pow(rr, -7.0);
  float fCorona = pow(rr, -2.4) * 0.05;

  /* Structure: streamers, polar plumes, and a fine combing through it all. */
  float helmets = streamers(th, rr) * pow(rr, -3.2);
  float polar = exp(-sq(angDiff(th, EQ_TILT + PI * 0.5) / 0.55)) + exp(-sq(angDiff(th, EQ_TILT - PI * 0.5) / 0.55));
  float plumeRays = pow(noise2(dir * 22.0 + vec2(x * 0.15)), 3.0) * 2.4;
  float plumes = polar * plumeRays * pow(rr, -5.5) * 0.6;
  float comb = 0.7 + 0.6 * pow(noise2(dir * 9.0 + vec2(x * 0.35 + uTime * 0.004, -x * 0.2)), 2.0);

  /* The music, read round the limb and outward in time - blurred across
     neighbouring bands and a second of history, so the corona swells as light,
     never as rings or hard sectors. */
  float band = dir.y * 0.5 + 0.5;
  float age = x * CORONA_MEMORY;
  float s = 0.0;
  for (int i = -1; i <= 1; i++) {
    for (int j = 0; j < 3; j++) {
      s += spec(band + float(i) * 0.06, age + float(j) * 0.35);
    }
  }
  s /= 9.0;
  float music = mix(0.7, 0.55 + s * 0.8, uPlaying) * (1.0 + uLevel * 0.25 * uPlaying);

  float shells = 0.0;
  for (int i = 0; i < 3; i++) {
    float kAge = uKicks[i];
    shells += exp(-sq((x - kAge * 1.1) / 0.25)) * exp(-kAge * 1.6);
  }

  float corona = (kCorona * 1.1 + helmets * 0.9 + plumes) * comb * music + fCorona;
  corona += shells * 0.06 * uPlaying * (kCorona * 4.0 + helmets);

  /* Pearl at the limb, the mood's hue only in the far, faint corona. */
  vec3 pearl = vec3(1.0, 0.97, 0.94);
  vec3 far = mix(uColA, vec3(0.85, 0.85, 1.0), 0.5);
  vec3 col = mix(far, pearl, exp(-x * 1.4)) * corona;

  /* Deep space behind. */
  vec3 rd = normalize(vec3(uv, 1.0));
  col += (uBg * 0.08 + starfield(rd, 1.2) * 0.9) * (1.0 - clamp(corona * 2.0, 0.0, 1.0));

  /* The disc: earthshine, barely there, over true shadow. */
  float disc = 1.0 - smoothstep(EC_R - aa, EC_R + aa, r);
  /* Nearness for the nod: the eclipse and its inner corona move, the stars hold. */
  gNear = ECLIPSE_NEAR * (1.0 - smoothstep(EC_R, EC_R * 4.0, r));
  vec3 earthshine = vec3(0.005, 0.006, 0.011) * (0.6 + 0.8 * fbm2(d * 18.0 + 4.0)) * (1.0 - r / EC_R * 0.5);
  col = mix(col, earthshine, disc);

  /* Chromosphere and prominences: rose light standing on the limb. */
  vec3 rose = mix(vec3(1.0, 0.32, 0.46), uColA, 0.2);
  float lift = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float at = 0.9 + fi * 2.1 + hash12(vec2(fi, 1.0)) * 0.6;
    float height = (0.06 + 0.07 * hash12(vec2(fi, 6.0))) * EC_R;
    float shape = exp(-sq(angDiff(th, at) / (0.06 + 0.04 * hash12(vec2(fi, 2.0)))));
    float ragged = 0.6 + 0.8 * noise2(vec2(th * 40.0 + fi * 5.0, (r - EC_R) * 300.0 + uTime * 0.05));
    lift = max(lift, height * shape * ragged);
  }
  float above = r - EC_R;
  float prom = (1.0 - smoothstep(lift * 0.6, lift + aa, above)) * step(0.0, above) * step(0.0001, lift);
  col = mix(col, rose * (1.4 + uTreble * 0.5 * uPlaying), prom * 0.85);
  col += rose * exp(-abs(above) / (0.0016 + aa)) * 0.8;

  /* The diamond bead, with a short four-point glint. */
  vec2 bead = EC_C + vec2(cos(BEAD_ANGLE), sin(BEAD_ANGLE)) * EC_R;
  vec2 b = uv - uPointer * 0.006 - bead;
  float bb = dot(b, b);
  float breath = 1.0 + uBass * 0.35 * uPlaying;
  col += pearl * (0.000032 / (bb + 0.000009)) * breath;
  float spikes = exp(-abs(b.x) * 1100.0) * exp(-abs(b.y) * 34.0) + exp(-abs(b.y) * 1100.0) * exp(-abs(b.x) * 34.0);
  col += pearl * spikes * 0.28 * breath;
  return col;
}
`;
