/**
 * Nebula Drift (aurora mood): the Veil - the lace a supernova left behind. One
 * vast shell sweeps across the sky from off-frame, and all of it is drawn as
 * fine luminous filaments (no fog, no blob): strands running along the shell,
 * undulating slowly like silk in water, in the two emission lights of the real
 * thing - a cool ionised blue and a warm rose, laid side by side - bent to the
 * mood's palette. Three depths of lace parallax gently against each other.
 *
 * The music touches it lightly: the filaments glow a little brighter with the
 * track, and the spectrum ripples outward through the lace as a faint shimmer,
 * each strand lit by the music of a moment ago. Contemplative, never a pulse.
 */
export const NEBULA = /* glsl */ `
/* The shell's centre sits far below the frame, so its rim spans the sky as a
   low canopy - rising from the left, cresting past the middle - and leaves the
   lower centre (where the waveform rides) to open space. Every visible point is
   above the centre, so the angle never wraps. */
const vec2 SHELL_C = vec2(0.35, -1.9);
const float SHELL_R = 2.25;
const float SHELL_W = 0.2;

/* One depth of lace: anisotropic ridges - tight across the shell, long along it -
   so strands follow the rim, warped by slow large-scale undulation. Returns the
   filament light; 'across' is the warped distance from the rim (for the music). */
float lace(vec2 p, float seed, out float across, out float along) {
  vec2 d = p - SHELL_C;
  float r = length(d);
  float th = atan(d.y, d.x) + uTravel * 0.004;
  vec2 q = vec2(th * 2.2, r * 1.1) + seed;
  vec2 w = vec2(fbm2(q + uTime * 0.012), fbm2(q * 1.3 + 5.2 - uTime * 0.01)) - 0.5;
  float rr = r + w.x * 0.16;
  float tt = th + w.y * 0.1;
  across = rr - SHELL_R;
  along = tt;

  /* Each strand is a hairline core in a soft sheath of its own light. */
  float n = 0.0;
  float amp = 1.0;
  float fq = 1.0;
  for (int i = 0; i < 3; i++) {
    float v = noise2(vec2(tt * 2.4 * fq + seed * 3.1, rr * 17.0 * fq + seed));
    float ridge = 1.0 - abs(v * 2.0 - 1.0);
    /* A few strands burn bright, most are faint: lace, not a comb. */
    float gain = 0.25 + 2.2 * pow(noise2(vec2(tt * 0.9 + fq * 5.0, rr * 5.5 * fq + seed)), 3.0);
    n += amp * gain * (pow(ridge, 60.0) + pow(ridge, 10.0) * 0.18);
    fq *= 1.9;
    amp *= 0.5;
  }
  /* The lace gathers along the rim and frays out on either side. */
  float band = exp(-pow(across / SHELL_W, 2.0));
  /* Strands thin out and brighten in knots along their length. */
  float knots = 0.35 + 0.95 * smoothstep(0.4, 0.8, noise2(vec2(tt * 2.2, seed * 7.0)));
  /* Bundles with dark water between them: the lace is mostly air. */
  float bundles = smoothstep(0.3, 0.6, noise2(vec2(tt * 1.3 + seed, rr * 0.7)));
  return n * band * knots * bundles;
}

vec3 world(vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * uRes) / uRes.y;

  vec3 blue = mix(uColC, vec3(0.28, 0.72, 1.0), 0.55);
  vec3 rose = mix(uColA, vec3(1.0, 0.42, 0.56), 0.4);

  /* Faint music in the lace: brightness follows the level softly; the spectrum
     ripples outward from the rim, a few seconds per sweep. */
  float lift = 1.0 + uLevel * 0.22 * uPlaying;

  vec3 col = vec3(0.0);
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float depth = 1.0 - fk * 0.3;
    vec2 p = uv * (1.0 + fk * 0.16) + uPointer * 0.012 * (fk + 1.0) + vec2(fk * 0.07, -fk * 0.05);
    float across;
    float along;
    float h = lace(p, fk * 1.93, across, along);
    /* The rose light runs a hair outside the blue - the Veil's two-tone strands. */
    float across2;
    float along2;
    float h2 = lace(p + normalize(p - SHELL_C) * 0.035, fk * 1.93, across2, along2);
    float band = clamp((along - 1.1) / 1.0, 0.0, 1.0);
    float shimmer = spec(band, clamp(abs(across) * 7.0, 0.0, 6.0)) * uPlaying * 0.35;
    float light = depth * lift;
    col += blue * h * (2.1 + shimmer) * light;
    col += rose * h2 * (2.3 + shimmer) * light;
  }

  /* A whisper of the gas the lace is made of - never a fog bank. */
  float r = length(uv - SHELL_C);
  float haze = exp(-pow((r - SHELL_R) / 0.35, 2.0)) * fbm2(uv * 2.2 + 3.0);
  col += mix(blue, rose, 0.4) * haze * 0.06;

  vec3 rd = normalize(vec3(uv + uPointer * 0.004, 1.0));
  col += uBg * 0.18 + starfield(rd, 1.25) * 0.85;
  return col;
}
`;
