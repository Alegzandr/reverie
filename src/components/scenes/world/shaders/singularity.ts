/**
 * Singularity (nocturne mood): a total eclipse seen face-on - a perfect black
 * disc ringed by its corona, fine streamers of light combed outward, a hairline
 * of chromosphere at the limb and one diamond bead where the last of the light
 * slips past the edge. One light, one silhouette, deep black around it.
 *
 * The corona is the spectrum: bass along the lower limb, treble along the upper,
 * and the music travels outward through the streamers - the light near the disc
 * is what plays now, the light further out is what played a moment ago. Each
 * downbeat sends a faint shell of light rising off the limb; the bead breathes
 * with the low end.
 */
export const SINGULARITY = /* glsl */ `
const vec2 EC_C = vec2(0.0, 0.1);
const float EC_R = 0.16;
/* The bead sits on the upper-left limb. */
const float BEAD_ANGLE = 2.35;
/* Seconds of music held per screen unit above the limb. */
const float CORONA_MEMORY = 11.0;

/* Streamers: noise sampled round a circle (seamless in angle) and barely
   moving with height, so the structure reads as fine radial combing. */
float streamers(vec2 dir, float x, float t) {
  float s = 0.0;
  float amp = 0.6;
  float f = 3.2;
  for (int i = 0; i < 3; i++) {
    float n = noise2(dir * f + vec2(x * 1.2 + t, x * 0.7 - t * 0.6) + float(i) * 7.3);
    s += amp * pow(n, 2.6);
    f *= 2.35;
    amp *= 0.55;
  }
  return s;
}

vec3 world(vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * uRes) / uRes.y;
  vec2 d = uv - EC_C - uPointer * 0.006;
  float r = length(d);
  vec2 dir = d / max(r, 1e-4);
  float x = max(r - EC_R, 0.0);
  float aa = fwidth(r) * 1.2;

  vec3 inner = mix(vec3(1.0, 0.97, 0.94), uColA, 0.25);
  vec3 outer = mix(uColB, uColA, 0.35);

  float combs = streamers(dir, x, uTime * 0.004);
  float falloff = exp(-x / 0.06) * 0.85 + exp(-x / 0.2) * 0.26 + exp(-x / 0.45) * 0.025;

  /* The music, read round the limb and outward in time. */
  /* Blurred across neighbouring bands and across a second of history, so the
     corona swells as light - never as rings or hard sectors. */
  float band = dir.y * 0.5 + 0.5;
  float age = x * CORONA_MEMORY;
  float s = 0.0;
  for (int i = -1; i <= 1; i++) {
    for (int j = 0; j < 3; j++) {
      s += spec(band + float(i) * 0.06, age + float(j) * 0.35);
    }
  }
  s /= 9.0;
  float music = mix(0.6, 0.45 + s * 0.8, uPlaying);

  float shells = 0.0;
  for (int i = 0; i < 3; i++) {
    float age = uKicks[i];
    shells += exp(-sq((x - age * 0.16) / 0.035)) * exp(-age * 1.6);
  }

  float corona = falloff * (0.35 + 1.25 * combs) * music + shells * 0.15 * uPlaying * (0.4 + combs);
  vec3 col = mix(outer, inner, exp(-x / 0.09)) * corona * (1.0 + uLevel * 0.3 * uPlaying);

  /* Deep space behind, dimmed where the corona already owns the light. */
  vec3 rd = normalize(vec3(uv, 1.0));
  col += (uBg * 0.16 + starfield(rd, 1.3) * 0.9) * (1.0 - clamp(corona * 1.5, 0.0, 1.0));

  /* The disc: true black, anti-aliased edge. */
  col *= smoothstep(EC_R - aa, EC_R + aa, r);

  /* Chromosphere: a hairline of rose light hugging the limb. */
  vec3 chromo = mix(uColA, vec3(1.0, 0.45, 0.62), 0.45);
  col += chromo * exp(-abs(r - EC_R) / (0.0022 + aa)) * 0.9;

  /* The diamond bead and its four-point glint. */
  vec2 bead = EC_C + vec2(cos(BEAD_ANGLE), sin(BEAD_ANGLE)) * EC_R;
  vec2 b = uv - uPointer * 0.006 - bead;
  float bb = dot(b, b);
  float breath = 1.0 + uBass * 0.4 * uPlaying;
  vec3 beadLight = vec3(1.0, 0.98, 0.96) * (0.000045 / (bb + 0.000012)) * breath;
  float spikes = (exp(-abs(b.x) * 900.0) * exp(-abs(b.y) * 26.0) + exp(-abs(b.y) * 900.0) * exp(-abs(b.x) * 26.0)) * 0.35;
  col += beadLight + inner * spikes * breath;
  return col;
}
`;
