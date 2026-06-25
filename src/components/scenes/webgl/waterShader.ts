/**
 * Night-ocean fragment shader (WebGL1). A 2D scene: sky gradient + moon + stars
 * above the horizon; below it, the water reflects the sky distorted by an
 * animated ripple field, with the moonglade (the moon's broken reflection) and
 * surface sparkle. Procedural — no textures, no assets. Tuned cool to sit under
 * the Tidal palette. Kept deliberately calm (slow ripples, soft sparkle).
 */
export const WATER_FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;

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

vec3 skyColor(float y){
  vec3 top = vec3(0.015,0.03,0.09);
  vec3 hor = vec3(0.05,0.18,0.30);
  return mix(hor, top, clamp(y,0.0,1.0));
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  float tsec = u_time * 0.001;

  float horizon = 0.5;
  vec2 moonUV = vec2(0.62, 0.82);
  vec3 moonCol = vec3(0.82,0.92,1.0);
  vec3 col;

  if(uv.y >= horizon){
    float y = (uv.y - horizon) / (1.0 - horizon);
    col = skyColor(y);

    // stars: small round points placed at a random spot inside each cell (NOT
    // a whole cell — that gives blocky squares). Two sparse layers, gently
    // twinkling, thinning toward the horizon.
    float st = 0.0;
    for(int L=0; L<2; L++){
      float fl = float(L);
      float scale = 40.0 + fl * 50.0;
      float thr = 0.93 + fl * 0.02;
      vec2 g = vec2(uv.x * aspect, uv.y) * scale;
      vec2 ci = floor(g);
      vec2 cf = fract(g);
      float h = hash(ci + fl * 19.0);
      float present = step(thr, h);
      vec2 pos = vec2(hash(ci + 1.3), hash(ci + 2.7));
      float d = length(cf - pos);
      float pt = smoothstep(0.10, 0.0, d);
      float tw = 0.55 + 0.45 * sin(tsec * 2.0 + h * 40.0);
      st += present * pt * tw * (0.7 + 0.5 * (1.0 - fl));
    }
    st *= smoothstep(0.0, 0.30, y);
    col += vec3(0.85,0.92,1.0) * st;

    // moon: disc + soft halo
    vec2 mp = (uv - moonUV) * vec2(aspect, 1.0);
    float md = length(mp);
    col += moonCol * smoothstep(0.05, 0.0, md);
    col += moonCol * 0.22 * smoothstep(0.28, 0.0, md);
  } else {
    float depth = (horizon - uv.y) / horizon; // 0 at horizon, 1 at the bottom

    // ripple field — two octaves drifting toward the viewer
    float rip  = fbm(vec2(uv.x * aspect * 7.0,  uv.y * 42.0 - tsec * 1.1));
    float rip2 = fbm(vec2(uv.x * aspect * 16.0 + 3.0, uv.y * 80.0 - tsec * 1.7));
    float disp = ((rip - 0.5) * 0.6 + (rip2 - 0.5) * 0.4) * (0.012 + 0.05 * depth);

    // reflect the sky across the horizon, perturbed by the ripples
    float my = horizon + (horizon - uv.y) + disp;
    float ry = (my - horizon) / (1.0 - horizon);
    vec3 refl = skyColor(ry);
    vec3 deep = mix(vec3(0.04,0.16,0.24), vec3(0.01,0.04,0.09), depth);
    col = mix(refl, deep, clamp(0.4 + 0.45 * depth, 0.0, 1.0));

    // moonglade — bright reflection column under the moon, broken into dashes
    float mx = (uv.x - moonUV.x) * aspect + disp * 3.5;
    float glade = smoothstep(0.14 + 0.22 * depth, 0.0, abs(mx));
    float brk = 0.45 + 0.55 * sin(uv.y * 110.0 - tsec * 4.0 + rip * 7.0);
    glade *= brk * (1.0 - depth * 0.55);
    col += moonCol * glade * 0.7;

    // scattered surface sparkle
    float spk = smoothstep(0.78, 0.96, fbm(vec2(uv.x * aspect * 36.0, uv.y * 110.0 - tsec * 2.2)));
    col += moonCol * spk * 0.06 * (1.0 - depth * 0.7);
  }

  // glowing horizon line
  float hl = smoothstep(0.018, 0.0, abs(uv.y - horizon));
  col += vec3(0.25,0.55,0.65) * hl * 0.6;

  gl_FragColor = vec4(col, 1.0);
}
`;
