/**
 * Nebula Drift fragment shader (WebGL1). A deep cosmic backdrop: near-black
 * violet base, three drifting fbm nebula layers at different speeds/scales (the
 * parallax depth), two sparse twinkling star layers, and a single off-centre
 * focal astre top-right — a sphere-shaded disc with a light terminator melting
 * into an atmospheric corona. Procedural, no textures/assets. Colours come in as
 * uniforms read from the active theme tokens (u_bg / u_accent / u_ambient), so
 * the same shader recolours itself per immersive theme. Tuned calm: slow drift,
 * restrained glow, the astre stays the brightest thing so the waveform reads as
 * the foreground focal and the scene as depth behind it.
 */
export const NEBULA_FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_bg;      // deep near-black violet base
uniform vec3 u_accent;  // saturated violet/magenta — the focal light
uniform vec3 u_ambient; // secondary magenta for the nebula haze

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }

float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  f=f*f*(3.0-2.0*f);
  float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

float fbm(vec2 p){
  float v=0.0, a=0.5;
  for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  float tsec = u_time * 0.001;
  vec2 p = vec2(uv.x * aspect, uv.y);

  // Base: deep near-black violet, a touch lifted low (atmosphere settling).
  vec3 col = u_bg + u_bg * 0.25 * (1.0 - uv.y);

  // ── Nebula: three fbm layers drifting at different speeds/scales → parallax.
  float far = smoothstep(0.45, 1.0, fbm(p * 1.6 + vec2(tsec * 0.012, tsec * 0.006)));
  col += mix(u_ambient, u_accent, 0.35) * far * 0.22;

  float mid = smoothstep(0.55, 1.0, fbm(p * 3.1 + vec2(-tsec * 0.02, tsec * 0.014) + 11.0));
  col += mix(u_accent, u_ambient, 0.40) * mid * 0.28;

  float near = smoothstep(0.62, 1.0, fbm(p * 5.7 + vec2(tsec * 0.03, -tsec * 0.02) + 29.0));
  col += u_accent * near * 0.18;

  // ── Stars: two sparse twinkling layers, points placed inside each cell.
  float st = 0.0;
  for(int L=0; L<2; L++){
    float fl = float(L);
    float scale = 48.0 + fl * 60.0;
    float thr = 0.94 + fl * 0.015;
    vec2 g = p * scale;
    vec2 ci = floor(g);
    vec2 cf = fract(g);
    float h = hash(ci + fl * 23.0);
    float present = step(thr, h);
    vec2 pos = vec2(hash(ci + 1.7), hash(ci + 3.1));
    float d = length(cf - pos);
    float pt = smoothstep(0.09, 0.0, d);
    float tw = 0.5 + 0.5 * sin(tsec * 1.6 + h * 50.0);
    st += present * pt * tw * (0.7 + 0.5 * (1.0 - fl));
  }
  col += vec3(0.85, 0.82, 0.95) * st * 0.8;

  // Global vignette applied to the nebula/base BEFORE the astre, so the corners
  // fall to near-black but the focal astre keeps its full presence on top (the
  // astre lives in a corner — vignetting it was what made it read as timid).
  float vig = smoothstep(1.25, 0.35, length((uv - 0.5) * vec2(aspect, 1.0)));
  col *= 0.55 + 0.45 * vig;

  // ── Focal astre (hybrid: massive sphere-shaded disc + atmosphere). Sits high
  // in the top-right, large enough to overflow above and to the left of the glass
  // theme rail — a body you see, not a glow hiding behind the panel. Presence
  // comes from MASS + CONTOUR (terminator, limb, defined halo), not brightness.
  vec2 moon = vec2(0.79, 0.88);
  vec2 mp = (uv - moon) * vec2(aspect, 1.0);
  float md = length(mp);
  float R = 0.21;

  // wide outer corona melting into the nebula (soft, restrained — the dimmer the
  // better; this is the knob to pull back if the astre ever gets too hot)
  col += u_accent * smoothstep(R * 3.6, R, md) * 0.30;
  // defined atmospheric halo hugging the limb — this is what reads as 'mass'
  col += mix(u_accent, u_ambient, 0.30) * smoothstep(R * 1.7, R * 0.98, md) * 0.55;

  // the disc, sphere-shaded with a strong, crisp terminator for volume
  float disc = smoothstep(R, R * 0.975, md);
  vec2 n2 = mp / R;
  float zc = sqrt(max(0.0, 1.0 - dot(n2, n2)));
  vec3 N = normalize(vec3(n2, zc));
  vec3 Ldir = normalize(vec3(0.60, 0.50, 0.62));
  float lit = clamp(dot(N, Ldir), 0.0, 1.0);
  // sharper falloff = crisp terminator; the shadow side stays a dark silhouette
  float lum = 0.03 + 1.05 * pow(lit, 1.6);
  vec3 darkSide = u_bg * 1.15;                 // just above background → a mass
  vec3 litSide = mix(u_accent, vec3(1.0), 0.22);
  col = mix(col, mix(darkSide, litSide, lum), disc);

  // bright limb on the lit edge — a thin rim that sharpens the contour
  float rim = clamp(smoothstep(R, R * 0.93, md) - smoothstep(R * 0.93, R * 0.86, md), 0.0, 1.0);
  col += litSide * rim * pow(lit, 0.8) * 0.6;

  gl_FragColor = vec4(col, 1.0);
}
`;
