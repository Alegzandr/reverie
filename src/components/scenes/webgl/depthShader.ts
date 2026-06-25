/**
 * Cosmic backdrop fragment shader — clean parallax + living light, fully
 * procedural so it works on ANY photo with no per-image assets.
 *
 *  1. Parallax — by default a RIGID plane glide: the whole image pans with the
 *     cursor (and a slow autonomous drift), with overscan so no edge shows. No
 *     per-pixel warping → the image never smears or stretches. A single-image
 *     procedural "depth displacement" looks ugly (rubbery smearing), so true
 *     depth-driven 2.5D only kicks in when a real depth map is supplied via
 *     u_depth (clean ML/painted maps displace well); then near pixels shift more.
 *  2. Living light — bright regions (light sources: a planet's rim, a nebula core,
 *     stars) breathe in intensity over time via low-frequency procedural noise.
 *     This is a colour modulation, not geometry, so it never deforms the image.
 *
 * Uniforms: u_res (canvas px), u_time (ms), u_mouse (smoothed pointer, -1..1),
 * u_imgAspect (img w/h), u_hasDepth (0/1), u_amp (uv displacement, x/y),
 * u_light (living-light strength), u_tex (photo, TEXTURE0), u_depth (TEXTURE1).
 */
export const DEPTH_FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_imgAspect;
uniform float u_hasDepth;
uniform vec2 u_amp;
uniform float u_light;
uniform sampler2D u_tex;
uniform sampler2D u_depth;

const vec3 LUMA = vec3(0.299, 0.587, 0.114);

void main(){
  // Cover-fit: preserve the image aspect, crop the overflow.
  float ca = u_res.x / u_res.y;
  vec2 p = (gl_FragCoord.xy / u_res) - 0.5;
  if (ca > u_imgAspect) p.y *= u_imgAspect / ca;
  else p.x *= ca / u_imgAspect;
  vec2 uv = p + 0.5;

  // Slight overscan so the parallax pan never reaches the clamped edge, then flip
  // Y so screen-up maps to image-up (rows upload top-first).
  uv = (uv - 0.5) * 0.92 + 0.5;
  uv.y = 1.0 - uv.y;

  // Parallax base = rigid plane glide (cursor + slow autonomous drift).
  vec2 drift = vec2(sin(u_time * 0.00006), cos(u_time * 0.000045)) * 0.004;
  vec2 disp = -u_mouse * u_amp + drift;

  // Only a real depth map earns per-pixel depth displacement (clean maps look
  // good); the procedural path stays a rigid glide so nothing smears.
  if (u_hasDepth > 0.5) {
    float depth = texture2D(u_depth, uv).r;
    disp *= (depth - 0.4) * 2.2;
  }

  vec3 col = texture2D(u_tex, uv + disp).rgb;

  // Living light: only the bright light sources react. Two low-frequency spatial
  // waves at different rates make different regions swell/dim out of phase, so the
  // light shimmers organically instead of pulsing as one block.
  float l = dot(col, LUMA);
  float mask = smoothstep(0.5, 0.92, l);
  float shimmer =
    sin(u_time * 0.00115 + uv.x * 8.0 + uv.y * 3.0) * 0.55 +
    sin(u_time * 0.00083 - uv.y * 6.5 + uv.x * 2.0) * 0.45;
  col += col * mask * shimmer * u_light;

  gl_FragColor = vec4(col, 1.0);
}
`;
