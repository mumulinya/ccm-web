const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/dynamicIconImports-DuVFx370.js","assets/visualizerModes-DfBJXREF.js","assets/rolldown-runtime-hePW80VL.js","assets/useTranslation-C2Te3mgV.js","assets/lucide-icons-CFBY1lqE.js","assets/desktopTransport-C3zTRYnF.js","assets/use-presence-Dz6DoSgG.js"])))=>i.map(i=>d[i]);
import{n as e,r as t}from"./rolldown-runtime-hePW80VL.js";import{a as n,ft as r,ht as i,t as a,ut as o}from"./visualizerModes-DfBJXREF.js";import{L as s,_i as c,_n as l,_o as u,ic as d,ji as f,jn as p,k as m,qi as h,r as g,rt as _,ts as v}from"./lucide-icons-CFBY1lqE.js";import{n as y,r as b}from"./urlBackground-B7cq42ZX.js";import{i as x,r as S}from"./useMotionSettingsStore-BeCs-WRY.js";import{A as C,I as w,M as T,O as E,c as ee,o as te,s as ne,x as re}from"./use-presence-Dz6DoSgG.js";import{D as ie,E as D,T as ae,n as oe,p as se,t as O,w as ce}from"./proxy-D3YQvh28.js";import{t as le}from"./use-transform-xcjKtu7v.js";import{t as ue}from"./AnimatePresence-BHKlKuCV.js";import{i as de}from"./colorExtractor-BMuncSe0.js";import{a as k,c as fe,d as pe,h as A,i as me,l as he,m as ge,o as _e,p as ve,r as ye,t as be,u as xe}from"./LatentBackground-ByTBobaF.js";var Se=new Set,Ce=({timestamp:e})=>{Se.forEach(t=>t.tick(e))},we=class extends ce{constructor(e){super(),this.state=`idle`,this.startTime=0,this.currentTime=0,this.started=!1,this.hasNextTarget=!1,this.nextTarget=0,this.stop=()=>{this.state!==`idle`&&(this.teardown(),this.options.onStop?.())},this.options=e,ae(e),this.factory=e.type||ie,this.generator=this.factory(e);let{driver:t}=e;t&&(this.driver=t(e=>this.tick(e))),this.startTime=this.now(),this.state=`running`,this.driver?this.driver.start():(Se.size||ee.update(Ce,!0),Se.add(this))}setTarget(e,t){this.nextTarget=e,this.nextVelocity=t,this.hasNextTarget=!0}retarget(e,t){let{options:n,generator:r}=this;n.keyframes=e,n.velocity=t,this.startTime=this.now(),this.currentTime=0,r.retarget?r.retarget(e,t):this.generator=this.factory(n)}tick(e){let{options:t,hasNextTarget:n}=this,{delay:r=0,onUpdate:i,onPlay:a}=t,o=Math.round(e-this.startTime)-r,s=this.currentTime=Math.max(0,o),c=this.generator.next(s),l=o<0?t.keyframes[0]:c.value;if(n){this.hasNextTarget=!1;let{keyframes:e}=t;e[0]=l,e[1]=this.nextTarget,this.retarget(e,this.nextVelocity??this.getGeneratorVelocity())}(n||!this.started)&&(this.started=!0,a?.()),this.state===`running`&&(i?.(l),c.done&&o>=0&&!n&&!this.hasNextTarget&&this.state===`running`&&(this.notifyFinished(),this.teardown(),this.state=`finished`,t.onComplete?.()))}getGeneratorVelocity(){return D(this.generator,this.currentTime,this.options.velocity)}now(){return this.driver?this.driver.now():te.now()}teardown(){this.state=`idle`,this.driver?this.driver.stop():(Se.delete(this),Se.size||ne(Ce))}};function Te(e,t,n={}){let r=e.get(),i=null,a,o=typeof r==`string`?r.replace(/[\d.-]/g,``):void 0,s=e=>a(o?e+o:e),c=()=>e.events.animationStart?.notify(),l=()=>{i&&=(i.stop(),null),e.animation=void 0};if(e.attach((t,r)=>{a=r;let o=De(t);if(i?.state===`running`){i.setTarget(o,n.velocity);return}let u=De(e.get()),d=i?i.getGeneratorVelocity():e.getVelocity();if(l(),u===o)return;let f=i=new we({keyframes:[u,o],velocity:d,type:`spring`,restDelta:.001,restSpeed:.01,...n,onUpdate:s,onPlay:c});e.animation=f,f.then(()=>{i===f&&(i=null,e.animation=void 0,e.events.animationComplete?.notify())})},l),se(t)){let r=n.skipInitialAnimation===!0,i=t.on(`change`,t=>{r?(r=!1,e.jump(Ee(t,o),!1)):e.set(Ee(t,o))}),a=e.on(`destroy`,i);return()=>{i(),a()}}return l}function Ee(e,t){return t?e+t:e}function De(e){return typeof e==`number`?e:parseFloat(e)}var j=t(d(),1);function Oe(e,t={}){let{isStatic:n}=(0,j.useContext)(oe),r=()=>se(e)?e.get():e;if(n)return le(r);let i=de(r());return(0,j.useInsertionEffect)(()=>Te(i,e,t),[i,JSON.stringify(t)]),i}function ke(e,t={}){return Oe(e,{type:`spring`,...t})}var Ae=`#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform float u_pixelRatio;

uniform vec4 u_colorFront;
uniform vec4 u_colorBack;

uniform sampler2D u_image;
uniform float u_imageAspectRatio;

uniform float u_contrast;
uniform float u_roughness;
uniform float u_fiber;
uniform float u_fiberSize;
uniform float u_crumples;
uniform float u_crumpleSize;
uniform float u_folds;
uniform float u_foldCount;
uniform float u_drops;
uniform float u_seed;
uniform float u_fade;

uniform sampler2D u_noiseTexture;

in vec2 v_imageUV;

out vec4 fragColor;

float getUvFrame(vec2 uv) {
  float aax = 2. * fwidth(uv.x);
  float aay = 2. * fwidth(uv.y);

  float left   = smoothstep(0., aax, uv.x);
  float right = 1. - smoothstep(1. - aax, 1., uv.x);
  float bottom = smoothstep(0., aay, uv.y);
  float top = 1. - smoothstep(1. - aay, 1., uv.y);

  return left * right * bottom * top;
}

${fe}
${pe}
${ve}
float valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = randomR(i);
  float b = randomR(i + vec2(1.0, 0.0));
  float c = randomR(i + vec2(0.0, 1.0));
  float d = randomR(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}
float fbm(vec2 n) {
  float total = 0.0, amplitude = .4;
  for (int i = 0; i < 3; i++) {
    total += valueNoise(n) * amplitude;
    n *= 1.99;
    amplitude *= 0.65;
  }
  return total;
}


float randomG(vec2 p) {
  vec2 uv = floor(p) / 50. + .5;
  return texture(u_noiseTexture, fract(uv)).g;
}
float roughness(vec2 p) {
  p *= .1;
  float o = 0.;
  for (float i = 0.; ++i < 4.; p *= 2.1) {
    vec4 w = vec4(floor(p), ceil(p));
    vec2 f = fract(p);
    o += mix(
    mix(randomG(w.xy), randomG(w.xw), f.y),
    mix(randomG(w.zy), randomG(w.zw), f.y),
    f.x);
    o += .2 / exp(2. * abs(sin(.2 * p.x + .5 * p.y)));
  }
  return o / 3.;
}

${he}

vec2 randomGB(vec2 p) {
  vec2 uv = floor(p) / 50. + .5;
  return texture(u_noiseTexture, fract(uv)).gb;
}
float crumpledNoise(vec2 t, float pw) {
  vec2 p = floor(t);
  float wsum = 0.;
  float cl = 0.;
  for (int y = -1; y < 2; y += 1) {
    for (int x = -1; x < 2; x += 1) {
      vec2 b = vec2(float(x), float(y));
      vec2 q = b + p;
      vec2 q2 = q - floor(q / 8.) * 8.;
      vec2 c = q + randomGB(q2);
      vec2 r = c - t;
      float w = pow(smoothstep(0., 1., 1. - abs(r.x)), pw) * pow(smoothstep(0., 1., 1. - abs(r.y)), pw);
      cl += (.5 + .5 * sin((q2.x + q2.y * 5.) * 8.)) * w;
      wsum += w;
    }
  }
  return pow(wsum != 0.0 ? cl / wsum : 0.0, .5) * 2.;
}
float crumplesShape(vec2 uv) {
  return crumpledNoise(uv * .25, 16.) * crumpledNoise(uv * .5, 2.);
}


vec2 folds(vec2 uv) {
  vec3 pp = vec3(0.);
  float l = 9.;
  for (float i = 0.; i < 15.; i++) {
    if (i >= u_foldCount) break;
    vec2 rand = randomGB(vec2(i, i * u_seed));
    float an = rand.x * TWO_PI;
    vec2 p = vec2(cos(an), sin(an)) * rand.y;
    float dist = distance(uv, p);
    l = min(l, dist);

    if (l == dist) {
      pp.xy = (uv - p.xy);
      pp.z = dist;
    }
  }
  return mix(pp.xy, vec2(0.), pow(pp.z, .25));
}

float drops(vec2 uv) {
  vec2 iDropsUV = floor(uv);
  vec2 fDropsUV = fract(uv);
  float dropsMinDist = 1.;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 neighbor = vec2(float(i), float(j));
      vec2 offset = randomGB(iDropsUV + neighbor);
      offset = .5 + .5 * sin(10. * u_seed + TWO_PI * offset);
      vec2 pos = neighbor + offset - fDropsUV;
      float dist = length(pos);
      dropsMinDist = min(dropsMinDist, dropsMinDist*dist);
    }
  }
  return 1. - smoothstep(.05, .09, pow(dropsMinDist, .5));
}

float lst(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

void main() {

  vec2 imageUV = v_imageUV;
  vec2 patternUV = v_imageUV - .5;
  patternUV = 5. * (patternUV * vec2(u_imageAspectRatio, 1.));

  vec2 roughnessUv = 1.5 * (gl_FragCoord.xy - .5 * u_resolution) / u_pixelRatio;
  float roughness = roughness(roughnessUv + vec2(1., 0.)) - roughness(roughnessUv - vec2(1., 0.));

  vec2 crumplesUV = fract(patternUV * .02 / u_crumpleSize - u_seed) * 32.;
  float crumples = u_crumples * (crumplesShape(crumplesUV + vec2(.05, 0.)) - crumplesShape(crumplesUV));

  vec2 fiberUV = 2. / u_fiberSize * patternUV;
  float fiber = fiberNoise(fiberUV, vec2(0.));
  fiber = .5 * u_fiber * (fiber - 1.);

  vec2 normal = vec2(0.);
  vec2 normalImage = vec2(0.);

  vec2 foldsUV = patternUV * .12;
  foldsUV = rotate(foldsUV, 4. * u_seed);
  vec2 w = folds(foldsUV);
  foldsUV = rotate(foldsUV + .007 * cos(u_seed), .01 * sin(u_seed));
  vec2 w2 = folds(foldsUV);

  float drops = u_drops * drops(patternUV * 2.);

  float fade = u_fade * fbm(.17 * patternUV + 10. * u_seed);
  fade = clamp(8. * fade * fade * fade, 0., 1.);

  w = mix(w, vec2(0.), fade);
  w2 = mix(w2, vec2(0.), fade);
  crumples = mix(crumples, 0., fade);
  drops = mix(drops, 0., fade);
  fiber *= mix(1., .5, fade);
  roughness *= mix(1., .5, fade);

  normal.xy += u_folds * min(5. * u_contrast, 1.) * 4. * max(vec2(0.), w + w2);
  normalImage.xy += u_folds * 2. * w;

  normal.xy += crumples;
  normalImage.xy += 1.5 * crumples;

  normal.xy += 3. * drops;
  normalImage.xy += .2 * drops;

  normal.xy += u_roughness * 1.5 * roughness;
  normal.xy += fiber;

  normalImage += u_roughness * .75 * roughness;
  normalImage += .2 * fiber;

  vec3 lightPos = vec3(1., 2., 1.);
  float res = dot(normalize(vec3(normal, 9.5 - 9. * pow(u_contrast, .1))), normalize(lightPos));

  vec3 fgColor = u_colorFront.rgb * u_colorFront.a;
  float fgOpacity = u_colorFront.a;
  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  float bgOpacity = u_colorBack.a;

  imageUV += .02 * normalImage;
  float frame = getUvFrame(imageUV);
  vec4 image = texture(u_image, imageUV);
  image.rgb += .6 * pow(u_contrast, .4) * (res - .7);

  frame *= image.a;

  vec3 color = fgColor * res;
  float opacity = fgOpacity * res;

  color += bgColor * (1. - opacity);
  opacity += bgOpacity * (1. - opacity);
  opacity = mix(opacity, 1., frame);

  color -= .007 * drops;

  color.rgb = mix(color, image.rgb, frame);

  fragColor = vec4(color, opacity);
}
`,je=`#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_rotation;

uniform vec4 u_colorBack;
uniform vec4 u_colorShadow;
uniform vec4 u_colorHighlight;

uniform sampler2D u_image;
uniform float u_imageAspectRatio;

uniform float u_size;
uniform float u_shadows;
uniform float u_angle;
uniform float u_stretch;
uniform float u_shape;
uniform float u_distortion;
uniform float u_highlights;
uniform float u_distortionShape;
uniform float u_shift;
uniform float u_blur;
uniform float u_edges;
uniform float u_marginLeft;
uniform float u_marginRight;
uniform float u_marginTop;
uniform float u_marginBottom;
uniform float u_grainMixer;
uniform float u_grainOverlay;

in vec2 v_imageUV;

out vec4 fragColor;

${fe}
${pe}
${xe}

float valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

float getUvFrame(vec2 uv, float softness) {
  float aax = 2. * fwidth(uv.x);
  float aay = 2. * fwidth(uv.y);
  float left   = smoothstep(0., aax + softness, uv.x);
  float right  = 1. - smoothstep(1. - softness - aax, 1., uv.x);
  float bottom = smoothstep(0., aay + softness, uv.y);
  float top    = 1. - smoothstep(1. - softness - aay, 1., uv.y);
  return left * right * bottom * top;
}

const int MAX_RADIUS = 50;
vec4 samplePremultiplied(sampler2D tex, vec2 uv) {
  vec4 c = texture(tex, uv);
  c.rgb *= c.a;
  return c;
}
vec4 getBlur(sampler2D tex, vec2 uv, vec2 texelSize, vec2 dir, float sigma) {
  if (sigma <= .5) return texture(tex, uv);
  int radius = int(min(float(MAX_RADIUS), ceil(3.0 * sigma)));

  float twoSigma2 = 2.0 * sigma * sigma;
  float gaussianNorm = 1.0 / sqrt(TWO_PI * sigma * sigma);

  vec4 sum = samplePremultiplied(tex, uv) * gaussianNorm;
  float weightSum = gaussianNorm;

  for (int i = 1; i <= MAX_RADIUS; i++) {
    if (i > radius) break;

    float x = float(i);
    float w = exp(-(x * x) / twoSigma2) * gaussianNorm;

    vec2 offset = dir * texelSize * x;
    vec4 s1 = samplePremultiplied(tex, uv + offset);
    vec4 s2 = samplePremultiplied(tex, uv - offset);

    sum += (s1 + s2) * w;
    weightSum += 2.0 * w;
  }

  vec4 result = sum / weightSum;
  if (result.a > 0.) {
    result.rgb /= result.a;
  }

  return result;
}

vec2 rotateAspect(vec2 p, float a, float aspect) {
  p.x *= aspect;
  p = rotate(p, a);
  p.x /= aspect;
  return p;
}

float smoothFract(float x) {
  float f = fract(x);
  float w = fwidth(x);

  float edge = abs(f - 0.5) - 0.5;
  float band = smoothstep(-w, w, edge);

  return mix(f, 1.0 - f, band);
}

void main() {

  float patternRotation = -u_angle * PI / 180.;
  float patternSize = mix(200., 5., u_size);

  vec2 uv = v_imageUV;

  vec2 uvMask = gl_FragCoord.xy / u_resolution.xy;
  vec2 sw = vec2(.005);
  vec4 margins = vec4(u_marginLeft, u_marginTop, u_marginRight, u_marginBottom);
  float mask =
  smoothstep(margins[0], margins[0] + sw.x, uvMask.x + sw.x) *
  smoothstep(margins[2], margins[2] + sw.x, 1.0 - uvMask.x + sw.x) *
  smoothstep(margins[1], margins[1] + sw.y, uvMask.y + sw.y) *
  smoothstep(margins[3], margins[3] + sw.y, 1.0 - uvMask.y + sw.y);
  float maskOuter =
  smoothstep(margins[0] - sw.x, margins[0], uvMask.x + sw.x) *
  smoothstep(margins[2] - sw.x, margins[2], 1.0 - uvMask.x + sw.x) *
  smoothstep(margins[1] - sw.y, margins[1], uvMask.y + sw.y) *
  smoothstep(margins[3] - sw.y, margins[3], 1.0 - uvMask.y + sw.y);
  float maskStroke = maskOuter - mask;
  float maskInner =
  smoothstep(margins[0] - 2. * sw.x, margins[0], uvMask.x) *
  smoothstep(margins[2] - 2. * sw.x, margins[2], 1.0 - uvMask.x) *
  smoothstep(margins[1] - 2. * sw.y, margins[1], uvMask.y) *
  smoothstep(margins[3] - 2. * sw.y, margins[3], 1.0 - uvMask.y);
  float maskStrokeInner = maskInner - mask;

  uv -= .5;
  uv *= patternSize;
  uv = rotateAspect(uv, patternRotation, u_imageAspectRatio);

  float curve = 0.;
  float patternY = uv.y / u_imageAspectRatio;
  if (u_shape > 4.5) {
    // pattern
    curve = .5 + .5 * sin(.5 * PI * uv.x) * cos(.5 * PI * patternY);
  } else if (u_shape > 3.5) {
    // zigzag
    curve = 10. * abs(fract(.1 * patternY) - .5);
  } else if (u_shape > 2.5) {
    // wave
    curve = 4. * sin(.23 * patternY);
  } else if (u_shape > 1.5) {
    // lines irregular
    curve = .5 + .5 * sin(.5 * uv.x) * sin(1.7 * uv.x);
  } else {
    // lines
  }

  vec2 UvToFract = uv + curve;
  vec2 fractOrigUV = fract(uv);
  vec2 floorOrigUV = floor(uv);

  float x = smoothFract(UvToFract.x);
  float xNonSmooth = fract(UvToFract.x) + .0001;

  float highlightsWidth = 2. * max(.001, fwidth(UvToFract.x));
  highlightsWidth += 2. * maskStrokeInner;
  float highlights = smoothstep(0., highlightsWidth, xNonSmooth);
  highlights *= smoothstep(1., 1. - highlightsWidth, xNonSmooth);
  highlights = 1. - highlights;
  highlights *= u_highlights;
  highlights = clamp(highlights, 0., 1.);
  highlights *= mask;

  float shadows = pow(x, 1.3);
  float distortion = 0.;
  float fadeX = 1.;
  float frameFade = 0.;

  float aa = fwidth(xNonSmooth);
  aa = max(aa, fwidth(uv.x));
  aa = max(aa, fwidth(UvToFract.x));
  aa = max(aa, .0001);

  if (u_distortionShape == 1.) {
    distortion = -pow(1.5 * x, 3.);
    distortion += (.5 - u_shift);

    frameFade = pow(1.5 * x, 3.);
    aa = max(.2, aa);
    aa += mix(.2, 0., u_size);
    fadeX = smoothstep(0., aa, xNonSmooth) * smoothstep(1., 1. - aa, xNonSmooth);
    distortion = mix(.5, distortion, fadeX);
  } else if (u_distortionShape == 2.) {
    distortion = 2. * pow(x, 2.);
    distortion -= (.5 + u_shift);

    frameFade = pow(abs(x - .5), 4.);
    aa = max(.2, aa);
    aa += mix(.2, 0., u_size);
    fadeX = smoothstep(0., aa, xNonSmooth) * smoothstep(1., 1. - aa, xNonSmooth);
    distortion = mix(.5, distortion, fadeX);
    frameFade = mix(1., frameFade, .5 * fadeX);
  } else if (u_distortionShape == 3.) {
    distortion = pow(2. * (xNonSmooth - .5), 6.);
    distortion -= .25;
    distortion -= u_shift;

    frameFade = 1. - 2. * pow(abs(x - .4), 2.);
    aa = .15;
    aa += mix(.1, 0., u_size);
    fadeX = smoothstep(0., aa, xNonSmooth) * smoothstep(1., 1. - aa, xNonSmooth);
    frameFade = mix(1., frameFade, fadeX);

  } else if (u_distortionShape == 4.) {
    x = xNonSmooth;
    distortion = sin((x + .25) * TWO_PI);
    shadows = .5 + .5 * asin(distortion) / (.5 * PI);
    distortion *= .5;
    distortion -= u_shift;
    frameFade = .5 + .5 * sin(x * TWO_PI);
  } else if (u_distortionShape == 5.) {
    distortion -= pow(abs(x), .2) * x;
    distortion += .33;
    distortion -= 3. * u_shift;
    distortion *= .33;

    frameFade = .3 * (smoothstep(.0, 1., x));
    shadows = pow(x, 2.5);

    aa = max(.1, aa);
    aa += mix(.1, 0., u_size);
    fadeX = smoothstep(0., aa, xNonSmooth) * smoothstep(1., 1. - aa, xNonSmooth);
    distortion *= fadeX;
  }

  vec2 dudx = dFdx(v_imageUV);
  vec2 dudy = dFdy(v_imageUV);
  vec2 grainUV = v_imageUV - .5;
  grainUV *= (.8 / vec2(length(dudx), length(dudy)));
  grainUV += .5;
  float grain = valueNoise(grainUV);
  grain = smoothstep(.4, .7, grain);
  grain *= u_grainMixer;
  distortion = mix(distortion, 0., grain);

  shadows = min(shadows, 1.);
  shadows += maskStrokeInner;
  shadows *= mask;
  shadows = min(shadows, 1.);
  shadows *= pow(u_shadows, 2.);
  shadows = clamp(shadows, 0., 1.);

  distortion *= 3. * u_distortion;
  frameFade *= u_distortion;

  fractOrigUV.x += distortion;
  floorOrigUV = rotateAspect(floorOrigUV, -patternRotation, u_imageAspectRatio);
  fractOrigUV = rotateAspect(fractOrigUV, -patternRotation, u_imageAspectRatio);

  uv = (floorOrigUV + fractOrigUV) / patternSize;
  uv += pow(maskStroke, 4.);

  uv += vec2(.5);

  uv = mix(v_imageUV, uv, smoothstep(0., .7, mask));
  float blur = mix(0., 50., u_blur);
  blur = mix(0., blur, smoothstep(.5, 1., mask));

  float edgeDistortion = mix(.0, .04, u_edges);
  edgeDistortion += .06 * frameFade * u_edges;
  edgeDistortion *= mask;
  float frame = getUvFrame(uv, edgeDistortion);

  float stretch = 1. - smoothstep(0., .5, xNonSmooth) * smoothstep(1., 1. - .5, xNonSmooth);
  stretch = pow(stretch, 2.);
  stretch *= mask;
  stretch *= getUvFrame(uv, .1 + .05 * mask * frameFade);
  uv.y = mix(uv.y, .5, u_stretch * stretch);

  vec4 image = getBlur(u_image, uv, 1. / u_resolution / u_pixelRatio, vec2(0., 1.), blur);
  image.rgb *= image.a;
  vec4 backColor = u_colorBack;
  backColor.rgb *= backColor.a;
  vec4 highlightColor = u_colorHighlight;
  highlightColor.rgb *= highlightColor.a;
  vec4 shadowColor = u_colorShadow;

  vec3 color = highlightColor.rgb * highlights;
  float opacity = highlightColor.a * highlights;

  shadows = mix(shadows * shadowColor.a, 0., highlights);
  color = mix(color, shadowColor.rgb * shadowColor.a, .5 * shadows);
  color += .5 * pow(shadows, .5) * shadowColor.rgb;
  opacity += shadows;
  color = clamp(color, vec3(0.), vec3(1.));
  opacity = clamp(opacity, 0., 1.);

  color += image.rgb * (1. - opacity) * frame;
  opacity += image.a * (1. - opacity) * frame;

  color += backColor.rgb * (1. - opacity);
  opacity += backColor.a * (1. - opacity);

  float grainOverlay = valueNoise(rotate(grainUV, 1.) + vec2(3.));
  grainOverlay = mix(grainOverlay, valueNoise(rotate(grainUV, 2.) + vec2(-1.)), .5);
  grainOverlay = pow(grainOverlay, 1.3);

  float grainOverlayV = grainOverlay * 2. - 1.;
  vec3 grainOverlayColor = vec3(step(0., grainOverlayV));
  float grainOverlayStrength = u_grainOverlay * abs(grainOverlayV);
  grainOverlayStrength = pow(grainOverlayStrength, .8);
  grainOverlayStrength *= mask;
  color = mix(color, grainOverlayColor, .35 * grainOverlayStrength);

  opacity += .5 * grainOverlayStrength;
  opacity = clamp(opacity, 0., 1.);

  fragColor = vec4(color, opacity);
}
`,Me={lines:1,linesIrregular:2,wave:3,zigzag:4,pattern:5},Ne={prism:1,lens:2,contour:3,cascade:4,flat:5},Pe=`#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;

uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

uniform vec4 u_colorFront;
uniform vec4 u_colorBack;
uniform vec4 u_colorHighlight;

uniform sampler2D u_image;
uniform float u_imageAspectRatio;

uniform float u_type;
uniform float u_pxSize;
uniform bool u_originalColors;
uniform bool u_inverted;
uniform float u_colorSteps;

out vec4 fragColor;


${xe}
${fe}

float getUvFrame(vec2 uv, vec2 pad) {
  float aa = 0.0001;

  float left   = smoothstep(-pad.x, -pad.x + aa, uv.x);
  float right  = smoothstep(1.0 + pad.x, 1.0 + pad.x - aa, uv.x);
  float bottom = smoothstep(-pad.y, -pad.y + aa, uv.y);
  float top    = smoothstep(1.0 + pad.y, 1.0 + pad.y - aa, uv.y);

  return left * right * bottom * top;
}

vec2 getImageUV(vec2 uv) {
  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  float r = u_rotation * PI / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);

  vec2 imageBoxSize;
  if (u_fit == 1.) { // contain
    imageBoxSize.x = min(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else if (u_fit == 2.) { // cover
    imageBoxSize.x = max(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else {
    imageBoxSize.x = min(10.0, 10.0 / u_imageAspectRatio * u_imageAspectRatio);
  }
  imageBoxSize.y = imageBoxSize.x / u_imageAspectRatio;
  vec2 imageBoxScale = u_resolution.xy / imageBoxSize;

  vec2 imageUV = uv;
  imageUV *= imageBoxScale;
  imageUV += boxOrigin * (imageBoxScale - 1.);
  imageUV += graphicOffset;
  imageUV /= u_scale;
  imageUV.x *= u_imageAspectRatio;
  imageUV = graphicRotation * imageUV;
  imageUV.x /= u_imageAspectRatio;

  imageUV += .5;
  imageUV.y = 1. - imageUV.y;

  return imageUV;
}

const int bayer2x2[4] = int[4](0, 2, 3, 1);
const int bayer4x4[16] = int[16](
0, 8, 2, 10,
12, 4, 14, 6,
3, 11, 1, 9,
15, 7, 13, 5
);

const int bayer8x8[64] = int[64](
0, 32, 8, 40, 2, 34, 10, 42,
48, 16, 56, 24, 50, 18, 58, 26,
12, 44, 4, 36, 14, 46, 6, 38,
60, 28, 52, 20, 62, 30, 54, 22,
3, 35, 11, 43, 1, 33, 9, 41,
51, 19, 59, 27, 49, 17, 57, 25,
15, 47, 7, 39, 13, 45, 5, 37,
63, 31, 55, 23, 61, 29, 53, 21
);

float getBayerValue(vec2 uv, int size) {
  ivec2 pos = ivec2(fract(uv / float(size)) * float(size));
  int index = pos.y * size + pos.x;

  if (size == 2) {
    return float(bayer2x2[index]) / 4.0;
  } else if (size == 4) {
    return float(bayer4x4[index]) / 16.0;
  } else if (size == 8) {
    return float(bayer8x8[index]) / 64.0;
  }
  return 0.0;
}


void main() {

  float pxSize = u_pxSize * u_pixelRatio;
  vec2 pxSizeUV = gl_FragCoord.xy - .5 * u_resolution;
  pxSizeUV /= pxSize;
  vec2 canvasPixelizedUV = (floor(pxSizeUV) + .5) * pxSize;
  vec2 normalizedUV = canvasPixelizedUV / u_resolution;

  vec2 imageUV = getImageUV(normalizedUV);
  vec2 ditheringNoiseUV = canvasPixelizedUV;
  vec4 image = texture(u_image, imageUV);
  float frame = getUvFrame(imageUV, pxSize / u_resolution);

  int type = int(floor(u_type));
  float dithering = 0.0;

  float lum = dot(vec3(.2126, .7152, .0722), image.rgb);
  lum = u_inverted ? (1. - lum) : lum;

  switch (type) {
    case 1: {
      dithering = step(hash21(ditheringNoiseUV), lum);
    } break;
    case 2:
    dithering = getBayerValue(pxSizeUV, 2);
    break;
    case 3:
    dithering = getBayerValue(pxSizeUV, 4);
    break;
    default :
    dithering = getBayerValue(pxSizeUV, 8);
    break;
  }

  float colorSteps = max(floor(u_colorSteps), 1.);
  vec3 color = vec3(0.0);
  float opacity = 1.;

  dithering -= .5;
  float brightness = clamp(lum + dithering / colorSteps, 0.0, 1.0);
  brightness = mix(0.0, brightness, frame);
  brightness = mix(0.0, brightness, image.a);
  float quantLum = floor(brightness * colorSteps + 0.5) / colorSteps;
  quantLum = mix(0.0, quantLum, frame);

  if (u_originalColors == true) {
    vec3 normColor = image.rgb / max(lum, 0.001);
    color = normColor * quantLum;

    float quantAlpha = floor(image.a * colorSteps + 0.5) / colorSteps;
    opacity = mix(quantLum, 1., quantAlpha);
  } else {
    vec3 fgColor = u_colorFront.rgb * u_colorFront.a;
    float fgOpacity = u_colorFront.a;
    vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
    float bgOpacity = u_colorBack.a;
    vec3 hlColor = u_colorHighlight.rgb * u_colorHighlight.a;
    float hlOpacity = u_colorHighlight.a;

    fgColor = mix(fgColor, hlColor, step(1.02 - .02 * u_colorSteps, brightness));
    fgOpacity = mix(fgOpacity, hlOpacity, step(1.02 - .02 * u_colorSteps, brightness));

    color = fgColor * quantLum;
    opacity = fgOpacity * quantLum;
    color += bgColor * (1.0 - opacity);
    opacity += bgOpacity * (1.0 - opacity);
  }

  fragColor = vec4(color, opacity);
}
`,Fe=`#version 300 es
precision mediump float;

uniform sampler2D u_image;
uniform float u_imageAspectRatio;
uniform float u_spread;
uniform float u_bias;
uniform float u_angle;
uniform float u_perspective;
uniform float u_count;
uniform float u_dispersion;
uniform float u_dispersionShift;
uniform float u_dispersionColor;
uniform float u_focusCenter;
uniform float u_focusEdges;
uniform float u_swirl;
uniform float u_noise;
uniform float u_noiseFrequency;
uniform float u_noiseOffset;
uniform float u_lensBulge;
uniform float u_lensCircle;
uniform float u_grainMixer;
uniform float u_grainOverlay;
uniform float u_imageX;
uniform float u_imageY;

in vec2 v_imageUV;

out vec4 fragColor;

${fe}
${xe}
${pe}

float valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = hash21(i);
  float b = hash21(i + vec2(1., 0.));
  float c = hash21(i + vec2(0., 1.));
  float d = hash21(i + vec2(1., 1.));
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float getUvFrame(vec2 uv) {
  vec2 invAA = 1. / clamp(fwidth(uv), 1e-5, .02);
  vec2 lo = clamp(uv * invAA + .5, 0., 1.);
  vec2 hi = clamp((1. - uv) * invAA + .5, 0., 1.);
  return lo.x * hi.x * lo.y * hi.y;
}

vec4 sampleOverWhite(vec2 uv) {
  vec4 img = texture(u_image, uv);
  float cover = img.a * getUvFrame(uv);
  vec3 colorOverWhite = mix(vec3(1.), img.rgb, cover);
  return vec4(colorOverWhite, cover);
}

vec3 hueColor(float hue) {
  vec3 rgb = clamp(abs(mod(hue * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.);
  rgb = rgb * rgb * (3. - 2. * rgb);
  return rgb;
}
                                            
float boxInradius() {
  return .5 * min(u_imageAspectRatio, 1.);
}

float boxOutradius() {
  return .5 * length(vec2(u_imageAspectRatio, 1.));
}

float spreadReach() {
  return .7 * pow(u_spread, 1.3 + 2.7 * u_spread);
}

float innerCircleMask(float radius, float inradius) {
  return 1. - smoothstep(.5 * inradius, 1.1 * inradius, radius);
}

float dispersionCurve(float t, float biasPow) {
  float mirroredT = u_bias < 0. ? 1. - t : t;
  float curved = pow(mirroredT, biasPow);
  return u_bias < 0. ? 1. - curved : curved;
}

vec2 getSpread(vec2 fromCenter, float radius, vec2 warpedUV, float edgeAA, float inradius, float outradius, float reach, out float outStrength) {
  float angleRad = radians(u_angle);
  vec2 uniformDir = vec2(cos(angleRad), sin(angleRad));

  float invInradius = 1. / inradius;
  vec2 radialDir = fromCenter * invInradius;
  float maxLen = (outradius + reach) * invInradius;
  float radialLen = radius * invInradius;
  if (radialLen > maxLen) radialDir *= maxLen / radialLen;
  vec2 spreadDir = mix(uniformDir, radialDir, u_perspective);

  float bandProximity = smoothstep(inradius * .8, inradius, radius);
  float lensCircleMaxing = bandProximity * u_lensCircle * u_lensCircle * u_lensCircle;
  spreadDir = mix(spreadDir, radialDir, lensCircleMaxing);

  vec2 warpedAbs = abs(warpedUV - .5);
  float inner = mix(1., smoothstep(0., mix(inradius, outradius, u_focusCenter), radius), u_focusCenter);
  float boxDist = max(warpedAbs.x, warpedAbs.y) * 2.;
  float outer = mix(1., 1. - min(boxDist, 1.), u_focusEdges);
  float strength = inner * outer;

  strength *= mix(1., mix(.15, .03, max(-u_lensBulge, 0.)), lensCircleMaxing);

  vec2 outside = max(warpedAbs - .5, 0.);
  float margin = max(reach * length(spreadDir) * (1. - u_lensCircle), edgeAA);
  strength *= 1. - smoothstep(0., margin, length(outside));

  outStrength = strength;
  vec2 axis = spreadDir * (reach * strength);

  if (u_noise > 0.) {
    float turn = (valueNoise(fromCenter * u_noiseFrequency * 18. + u_noiseOffset * 30.) - .5) * 2. * u_noise;
    float cs = cos(turn), sn = sin(turn);
    axis = mat2(cs, -sn, sn, cs) * axis;
  }

  axis.x /= u_imageAspectRatio;
  return axis;
}

vec2 lensWarp(vec2 fromCenter, float radius, float inradius, out float bulgeFade) {
  bulgeFade = 1.;
  if (u_lensBulge == 0. && u_lensCircle <= 0.) return fromCenter;
  if (radius < 1e-5) return fromCenter;
  
  float r = radius;

  if (u_lensBulge != 0.) {
    float rn = radius / inradius;
    float bulge = abs(u_lensBulge) * (u_lensBulge > 0. ? 1.4 : 1.2);
    if (u_lensBulge > 0.) bulgeFade = 1. - smoothstep(1.45, 1.53, rn * bulge);
    float map = u_lensBulge > 0.
      ? tan(min(rn * bulge, 1.53)) / tan(bulge)
      : atan(rn * tan(bulge)) / bulge;
    float bulgeScale = map / rn;
    fromCenter *= bulgeScale;
    r *= bulgeScale;
  }

  if (u_lensCircle > 0.) {
    vec2 dir = fromCenter / max(r, 1e-5);
    vec2 halfBox = vec2(u_imageAspectRatio, 1.) * .5;
    float rBox = min(halfBox.x / max(abs(dir.x), 1e-4), halfBox.y / max(abs(dir.y), 1e-4));
    float band = inradius * mix(.03, .2, .5 * (u_lensBulge + 1.));
    float innerEdge = inradius - band;
    float over = smoothstep(0., 1., (r - innerEdge) / band);
    float g = r + (rBox - inradius) * pow(over, 14.);
    fromCenter = dir * mix(r, g, u_lensCircle);
  }

  return fromCenter;
}

void main() {
  vec2 uv = v_imageUV;

  float invAspect = 1. / u_imageAspectRatio;
  float inradius = boxInradius();
  float outradius = boxOutradius();
  float reach = spreadReach();

  vec2 fromCenter = uv - .5;
  fromCenter.x *= u_imageAspectRatio;
  float radius = length(fromCenter);

  float bulgeFade;
  vec2 warpedFromCenter = lensWarp(fromCenter, radius, inradius, bulgeFade);
  vec2 baseUV = vec2(warpedFromCenter.x * invAspect, warpedFromCenter.y) + .5;

  vec2 baseDerivative = fwidth(baseUV);
  float edgeAA = clamp(2. * max(baseDerivative.x, baseDerivative.y), .001, .02);

  float spreadStrength;
  vec2 spreadAxis = getSpread(fromCenter, radius, baseUV, edgeAA, inradius, outradius, reach, spreadStrength);

  vec2 grainUV = vec2(0.);
  if (u_grainMixer > 0. || u_grainOverlay > 0.) {
    vec2 dudx = dFdx(v_imageUV);
    vec2 dudy = dFdy(v_imageUV);
    grainUV = (v_imageUV - .5) * (.8 / vec2(length(dudx), length(dudy))) + .5;
  }

  if (u_grainMixer > 0.) {
    float grainSeed = valueNoise(grainUV);
    vec2 jit = fract(grainSeed * vec2(157.31, 113.57)) * 2. - 1.;
    spreadAxis += jit * .3 * u_grainMixer * length(spreadAxis);
  }

  float count = floor(u_count);
  int countInteger = int(count);

  float invCount = 1. / count;
  float invSpan = 1. / max(count - 1., 1.);
  float hueBase = u_dispersionColor + .5;
  float biasPower = 1. + 2. * abs(u_bias);
  vec2 tapBias = .5 - vec2(u_imageX, u_imageY);

  float centerAmount = clamp(1. - u_dispersionShift, 0., 1.);
  float edgesAmount = clamp(1. + u_dispersionShift, 0., 1.);
  float dispersion = u_dispersion * mix(edgesAmount, centerAmount, innerCircleMask(radius, inradius));
  float dispersionPower = pow(dispersion, .8);

  float warpedRadius = length(warpedFromCenter);
  float swirlAngle = u_swirl * .4 * PI * spreadStrength * u_spread * min(1., inradius / max(warpedRadius, 1e-4));

  vec3 colorSum = vec3(0.);
  vec3 weightSum = vec3(0.);
  float coverSum = 0.;

  for (int i = 0; i < ${{maxSamples:50}.maxSamples}; i++) {
    if (i >= countInteger) break;

    float layer = float(i);
    float hue = hueBase + layer * invCount;

    float spread = layer * invSpan;
    if (u_bias != 0.) spread = dispersionCurve(spread, biasPower);

    // mix(axis, -axis, spread) is axis scaled by the signed position along the fan
    float fanPos = 1. - 2. * spread;
    vec2 tapUV = baseUV + spreadAxis * fanPos - .5;

    if (u_swirl != 0.) {
      tapUV.x *= u_imageAspectRatio;
      tapUV = rotate(tapUV, swirlAngle * fanPos);
      tapUV.x *= invAspect;
    }

    vec4 tap = sampleOverWhite(tapUV + tapBias);
    vec3 weight = 1. - dispersionPower * hueColor(hue);

    colorSum += tap.rgb * weight;
    weightSum += weight;
    coverSum += tap.a;
  }

  vec3 color = colorSum / max(weightSum, 1e-4);
  float coverAvg = coverSum * invCount;

  float ground = min(color.r, min(color.g, color.b));
  float alpha = max(coverAvg, 1. - ground);
  vec3 premult = max(color - (1. - alpha), 0.);
  fragColor = vec4(premult, alpha) * bulgeFade;

  if (u_grainOverlay > 0.) {
    float grain = valueNoise(rotate(grainUV, 1.) + vec2(3.));
    grain = mix(grain, valueNoise(rotate(grainUV, 2.) + vec2(-1.)), .5);
    grain = pow(grain, 1.3);
    float grainV = grain * 2. - 1.;
    float grainStrength = pow(u_grainOverlay * abs(grainV), .8) * fragColor.a;
    fragColor.rgb = mix(fragColor.rgb, vec3(step(0., grainV)) * fragColor.a, .35 * grainStrength);
  }
}
`,Ie=`#version 300 es
precision mediump float;

uniform float u_rotation;

uniform float u_time;

uniform vec4 u_colorFront;
uniform vec4 u_colorBack;
uniform float u_radius;
uniform float u_contrast;

uniform sampler2D u_image;
uniform float u_imageAspectRatio;

uniform float u_size;
uniform float u_grainMixer;
uniform float u_grainOverlay;
uniform float u_grainSize;
uniform float u_grid;
uniform bool u_originalColors;
uniform bool u_inverted;
uniform float u_type;

in vec2 v_imageUV;

out vec4 fragColor;

${fe}
${pe}
${xe}

float valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

float lst(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

float sst(float edge0, float edge1, float x) {
  return smoothstep(edge0, edge1, x);
}

float getCircle(vec2 uv, float r, float baseR) {
  r = mix(.25 * baseR, 0., r);
  float d = length(uv - .5);
  float aa = fwidth(d);
  return 1. - smoothstep(r - aa, r + aa, d);
}

float getCell(vec2 uv) {
  float insideX = step(0.0, uv.x) * (1.0 - step(1.0, uv.x));
  float insideY = step(0.0, uv.y) * (1.0 - step(1.0, uv.y));
  return insideX * insideY;
}

float getCircleWithHole(vec2 uv, float r, float baseR) {
  float cell = getCell(uv);

  r = mix(.75 * baseR, 0., r);
  float rMod = mod(r, .5);

  float d = length(uv - .5);
  float aa = fwidth(d);
  float circle = 1. - smoothstep(rMod - aa, rMod + aa, d);
  if (r < .5) {
    return circle;
  } else {
    return cell - circle;
  }
}

float getGooeyBall(vec2 uv, float r, float baseR) {
  float d = length(uv - .5);
  float sizeRadius = .3;
  if (u_grid == 1.) {
    sizeRadius = .42;
  }
  sizeRadius = mix(sizeRadius * baseR, 0., r);
  d = 1. - sst(0., sizeRadius, d);

  d = pow(d, 2. + baseR);
  return d;
}

float getSoftBall(vec2 uv, float r, float baseR) {
  float d = length(uv - .5);
  float sizeRadius = clamp(baseR, 0., 1.);
  sizeRadius = mix(.5 * sizeRadius, 0., r);
  d = 1. - lst(0., sizeRadius, d);
  float powRadius = 1. - lst(0., 2., baseR);
  d = pow(d, 4. + 3. * powRadius);
  return d;
}

float getUvFrame(vec2 uv, vec2 pad) {
  float aa = 0.0001;

  float left   = smoothstep(-pad.x, -pad.x + aa, uv.x);
  float right  = smoothstep(1.0 + pad.x, 1.0 + pad.x - aa, uv.x);
  float bottom = smoothstep(-pad.y, -pad.y + aa, uv.y);
  float top    = smoothstep(1.0 + pad.y, 1.0 + pad.y - aa, uv.y);

  return left * right * bottom * top;
}

float sigmoid(float x, float k) {
  return 1.0 / (1.0 + exp(-k * (x - 0.5)));
}

float getLumAtPx(vec2 uv, float contrast) {
  vec4 tex = texture(u_image, uv);
  vec3 color = vec3(
  sigmoid(tex.r, contrast),
  sigmoid(tex.g, contrast),
  sigmoid(tex.b, contrast)
  );
  float lum = dot(vec3(0.2126, 0.7152, 0.0722), color);
  lum = mix(1., lum, tex.a);
  lum = u_inverted ? (1. - lum) : lum;
  return lum;
}

float getLumBall(vec2 p, vec2 pad, vec2 inCellOffset, float contrast, float baseR, float stepSize, out vec4 ballColor) {
  p += inCellOffset;
  vec2 uv_i = floor(p);
  vec2 uv_f = fract(p);
  vec2 samplingUV = (uv_i + .5 - inCellOffset) * pad + vec2(.5);
  float outOfFrame = getUvFrame(samplingUV, pad * stepSize);

  float lum = getLumAtPx(samplingUV, contrast);
  ballColor = texture(u_image, samplingUV);
  ballColor.rgb *= ballColor.a;
  ballColor *= outOfFrame;

  float ball = 0.;
  if (u_type == 0.) {
    // classic
    ball = getCircle(uv_f, lum, baseR);
  } else if (u_type == 1.) {
    // gooey
    ball = getGooeyBall(uv_f, lum, baseR);
  } else if (u_type == 2.) {
    // holes
    ball = getCircleWithHole(uv_f, lum, baseR);
  } else if (u_type == 3.) {
    // soft
    ball = getSoftBall(uv_f, lum, baseR);
  }

  return ball * outOfFrame;
}


void main() {

  float stepMultiplier = 1.;
  if (u_type == 0.) {
    // classic
    stepMultiplier = 2.;
  } else if (u_type == 1. || u_type == 3.) {
    // gooey & soft
    stepMultiplier = 6.;
  }

  float cellsPerSide = mix(300., 7., pow(u_size, .7));
  cellsPerSide /= stepMultiplier;
  float cellSizeY = 1. / cellsPerSide;
  vec2 pad = cellSizeY * vec2(1. / u_imageAspectRatio, 1.);
  if (u_type == 1. && u_grid == 1.) {
    // gooey diagonal grid works differently
    pad *= .7;
  }

  vec2 uv = v_imageUV;
  uv -= vec2(.5);
  uv /= pad;

  float contrast = mix(0., 15., pow(u_contrast, 1.5));
  float baseRadius = u_radius;
  if (u_originalColors == true) {
    contrast = mix(.1, 4., pow(u_contrast, 2.));
    baseRadius = 2. * pow(.5 * u_radius, .3);
  }

  float totalShape = 0.;
  vec3 totalColor = vec3(0.);
  float totalOpacity = 0.;

  vec4 ballColor;
  float shape;
  float stepSize = 1. / stepMultiplier;
  for (float x = -0.5; x < 0.5; x += stepSize) {
    for (float y = -0.5; y < 0.5; y += stepSize) {
      vec2 offset = vec2(x, y);

      if (u_grid == 1.) {
        float rowIndex = floor((y + .5) / stepSize);
        float colIndex = floor((x + .5) / stepSize);
        if (stepSize == 1.) {
          rowIndex = floor(uv.y + y + 1.);
          if (u_type == 1.) {
            colIndex = floor(uv.x + x + 1.);
          }
        }
        if (u_type == 1.) {
          if (mod(rowIndex + colIndex, 2.) == 1.) {
            continue;
          }
        } else {
          if (mod(rowIndex, 2.) == 1.) {
            offset.x += .5 * stepSize;
          }
        }
      }

      shape = getLumBall(uv, pad, offset, contrast, baseRadius, stepSize, ballColor);
      totalColor   += ballColor.rgb * shape;
      totalShape   += shape;
      totalOpacity += shape;
    }
  }

  const float eps = 1e-4;

  totalColor /= max(totalShape, eps);
  totalOpacity /= max(totalShape, eps);

  float finalShape = 0.;
  if (u_type == 0.) {
    finalShape = min(1., totalShape);
  } else if (u_type == 1.) {
    float aa = fwidth(totalShape);
    float th = .5;
    finalShape = smoothstep(th - aa, th + aa, totalShape);
  } else if (u_type == 2.) {
    finalShape = min(1., totalShape);
  } else if (u_type == 3.) {
    finalShape = totalShape;
  }

  vec2 grainSize = mix(2000., 200., u_grainSize) * vec2(1., 1. / u_imageAspectRatio);
  vec2 grainUV = v_imageUV - .5;
  grainUV *= grainSize;
  grainUV += .5;
  float grain = valueNoise(grainUV);
  grain = smoothstep(.55, .7 + .2 * u_grainMixer, grain);
  grain *= u_grainMixer;
  finalShape = mix(finalShape, 0., grain);

  vec3 color = vec3(0.);
  float opacity = 0.;

  if (u_originalColors == true) {
    color = totalColor * finalShape;
    opacity = totalOpacity * finalShape;

    vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
    color = color + bgColor * (1. - opacity);
    opacity = opacity + u_colorBack.a * (1. - opacity);
  } else {
    vec3 fgColor = u_colorFront.rgb * u_colorFront.a;
    float fgOpacity = u_colorFront.a;
    vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
    float bgOpacity = u_colorBack.a;

    color = fgColor * finalShape;
    opacity = fgOpacity * finalShape;
    color += bgColor * (1. - opacity);
    opacity += bgOpacity * (1. - opacity);
  }

  float grainOverlay = valueNoise(rotate(grainUV, 1.) + vec2(3.));
  grainOverlay = mix(grainOverlay, valueNoise(rotate(grainUV, 2.) + vec2(-1.)), .5);
  grainOverlay = pow(grainOverlay, 1.3);

  float grainOverlayV = grainOverlay * 2. - 1.;
  vec3 grainOverlayColor = vec3(step(0., grainOverlayV));
  float grainOverlayStrength = u_grainOverlay * abs(grainOverlayV);
  grainOverlayStrength = pow(grainOverlayStrength, .8);
  color = mix(color, grainOverlayColor, .5 * grainOverlayStrength);

  opacity += .5 * grainOverlayStrength;
  opacity = clamp(opacity, 0., 1.);

  fragColor = vec4(color, opacity);
}
`,Le={classic:0,gooey:1,holes:2,soft:3},Re={square:0,hex:1};function ze(){if(typeof window>`u`)return;let e=new Image;return e.src=Be,e}var Be=`data:image/png;base64,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`,M=re(),N={name:`Default`,params:{...A,fit:`cover`,scale:.6,speed:0,frame:0,colorFront:`#9fadbc`,colorBack:`#ffffff`,contrast:.3,roughness:.4,fiber:.3,fiberSize:.2,crumples:.3,crumpleSize:.35,folds:.65,foldCount:5,fade:0,drops:.2,seed:5.8}};({...A}),{...A},{...A};var Ve=(0,j.memo)(function({speed:e=N.params.speed,frame:t=N.params.frame,colorFront:n=N.params.colorFront,colorBack:r=N.params.colorBack,image:i=``,contrast:a=N.params.contrast,roughness:o=N.params.roughness,fiber:s=N.params.fiber,crumples:c=N.params.crumples,folds:l=N.params.folds,drops:u=N.params.drops,seed:d=N.params.seed,fiberScale:f,fiberSize:p=f===void 0?N.params.fiberSize:.2/f,crumplesScale:m,crumpleSize:h=m===void 0?N.params.crumpleSize:.2/m,blur:g,fade:_=g===void 0?N.params.fade:g,foldsNumber:v,foldCount:y=v===void 0?N.params.foldCount:v,fit:b=N.params.fit,scale:x=N.params.scale,rotation:S=N.params.rotation,originX:C=N.params.originX,originY:w=N.params.originY,offsetX:T=N.params.offsetX,offsetY:E=N.params.offsetY,worldWidth:ee=N.params.worldWidth,worldHeight:te=N.params.worldHeight,...ne}){let re=typeof window<`u`&&{u_noiseTexture:ze()},ie={u_image:i,u_colorFront:k(n),u_colorBack:k(r),u_contrast:a,u_roughness:o,u_fiber:s,u_fiberSize:p,u_crumples:c,u_crumpleSize:h,u_foldCount:y,u_folds:l,u_fade:_,u_drops:u,u_seed:d,...re,u_fit:ge[b],u_scale:x,u_rotation:S,u_offsetX:T,u_offsetY:E,u_originX:C,u_originY:w,u_worldWidth:ee,u_worldHeight:te};return(0,M.jsx)(me,{...ne,speed:e,frame:t,fragmentShader:Ae,mipmaps:[`u_image`],uniforms:ie})},ye),P={name:`Default`,params:{...A,fit:`cover`,speed:0,frame:0,colorBack:`#00000000`,colorShadow:`#000000`,colorHighlight:`#ffffff`,shadows:.25,size:.5,angle:0,distortionShape:`prism`,highlights:.1,shape:`lines`,distortion:.5,shift:0,blur:0,edges:.25,stretch:0,margin:0,marginLeft:0,marginRight:0,marginTop:0,marginBottom:0,grainMixer:0,grainOverlay:0}};({...A}),{...A},{...A};var He=(0,j.memo)(function({speed:e=P.params.speed,frame:t=P.params.frame,colorBack:n=P.params.colorBack,colorShadow:r=P.params.colorShadow,colorHighlight:i=P.params.colorHighlight,image:a=``,shadows:o=P.params.shadows,angle:s=P.params.angle,distortion:c=P.params.distortion,distortionShape:l=P.params.distortionShape,highlights:u=P.params.highlights,shape:d=P.params.shape,shift:f=P.params.shift,blur:p=P.params.blur,edges:m=P.params.edges,margin:h,marginLeft:g=h??P.params.marginLeft,marginRight:_=h??P.params.marginRight,marginTop:v=h??P.params.marginTop,marginBottom:y=h??P.params.marginBottom,grainMixer:b=P.params.grainMixer,grainOverlay:x=P.params.grainOverlay,stretch:S=P.params.stretch,count:C,size:w=C===void 0?P.params.size:(1/(C*1.6))**(1/6)/.7-.5,fit:T=P.params.fit,scale:E=P.params.scale,rotation:ee=P.params.rotation,originX:te=P.params.originX,originY:ne=P.params.originY,offsetX:re=P.params.offsetX,offsetY:ie=P.params.offsetY,worldWidth:D=P.params.worldWidth,worldHeight:ae=P.params.worldHeight,...oe}){let se={u_image:a,u_colorBack:k(n),u_colorShadow:k(r),u_colorHighlight:k(i),u_shadows:o,u_size:w,u_angle:s,u_distortion:c,u_shift:f,u_blur:p,u_edges:m,u_stretch:S,u_distortionShape:Ne[l],u_highlights:u,u_shape:Me[d],u_marginLeft:g,u_marginRight:_,u_marginTop:v,u_marginBottom:y,u_grainMixer:b,u_grainOverlay:x,u_fit:ge[T],u_scale:E,u_rotation:ee,u_offsetX:re,u_offsetY:ie,u_originX:te,u_originY:ne,u_worldWidth:D,u_worldHeight:ae};return(0,M.jsx)(me,{...oe,speed:e,frame:t,fragmentShader:je,mipmaps:[`u_image`],uniforms:se})}),F={name:`Default`,params:{...A,fit:`cover`,speed:0,frame:0,colorFront:`#94ffaf`,colorBack:`#000c38`,colorHighlight:`#eaff94`,type:`8x8`,size:2,colorSteps:2,originalColors:!1,inverted:!1}};({...A}),{...A},{...A};var Ue=(0,j.memo)(function({speed:e=F.params.speed,frame:t=F.params.frame,colorFront:n=F.params.colorFront,colorBack:r=F.params.colorBack,colorHighlight:i=F.params.colorHighlight,image:a=``,type:o=F.params.type,colorSteps:s=F.params.colorSteps,originalColors:c=F.params.originalColors,inverted:l=F.params.inverted,pxSize:u,size:d=u===void 0?F.params.size:u,fit:f=F.params.fit,scale:p=F.params.scale,rotation:m=F.params.rotation,originX:h=F.params.originX,originY:g=F.params.originY,offsetX:_=F.params.offsetX,offsetY:v=F.params.offsetY,worldWidth:y=F.params.worldWidth,worldHeight:b=F.params.worldHeight,...x}){let S={u_image:a,u_colorFront:k(n),u_colorBack:k(r),u_colorHighlight:k(i),u_type:_e[o],u_pxSize:d,u_colorSteps:s,u_originalColors:c,u_inverted:l,u_fit:ge[f],u_rotation:m,u_scale:p,u_offsetX:_,u_offsetY:v,u_originX:h,u_originY:g,u_worldWidth:y,u_worldHeight:b};return(0,M.jsx)(me,{...x,speed:e,frame:t,fragmentShader:Pe,uniforms:S})},ye),I={name:`Default`,params:{...A,scale:1,fit:`contain`,speed:0,frame:0,spread:.6,bias:1,angle:0,perspective:.1,count:35,dispersion:1,dispersionShift:0,dispersionColor:.6,focusCenter:.8,focusEdges:1,swirl:.35,noise:0,noiseFrequency:.25,noiseOffset:0,lensBulge:0,lensCircle:0,grainMixer:0,grainOverlay:0,imageX:0,imageY:0}};({...A}),{...A},{...A};var We=(0,j.memo)(function({speed:e=I.params.speed,frame:t=I.params.frame,image:n=``,spread:r=I.params.spread,bias:i=I.params.bias,angle:a=I.params.angle,perspective:o=I.params.perspective,count:s=I.params.count,dispersion:c=I.params.dispersion,dispersionShift:l=I.params.dispersionShift,dispersionColor:u=I.params.dispersionColor,focusCenter:d=I.params.focusCenter,focusEdges:f=I.params.focusEdges,swirl:p=I.params.swirl,noise:m=I.params.noise,noiseFrequency:h=I.params.noiseFrequency,noiseOffset:g=I.params.noiseOffset,lensBulge:_=I.params.lensBulge,lensCircle:v=I.params.lensCircle,grainMixer:y=I.params.grainMixer,grainOverlay:b=I.params.grainOverlay,imageX:x=I.params.imageX,imageY:S=I.params.imageY,fit:C=I.params.fit,scale:w=I.params.scale,rotation:T=I.params.rotation,originX:E=I.params.originX,originY:ee=I.params.originY,offsetX:te=I.params.offsetX,offsetY:ne=I.params.offsetY,worldWidth:re=I.params.worldWidth,worldHeight:ie=I.params.worldHeight,...D}){let ae={u_image:n,u_spread:r,u_bias:i,u_angle:a,u_perspective:o,u_count:s,u_dispersion:c,u_dispersionShift:l,u_dispersionColor:u,u_focusCenter:d,u_focusEdges:f,u_swirl:p,u_noise:m,u_noiseFrequency:h,u_noiseOffset:g,u_lensBulge:_,u_lensCircle:v,u_grainMixer:y,u_grainOverlay:b,u_imageX:x,u_imageY:S,u_fit:ge[C],u_rotation:T,u_scale:w,u_offsetX:te,u_offsetY:ne,u_originX:E,u_originY:ee,u_worldWidth:re,u_worldHeight:ie};return(0,M.jsx)(me,{...D,speed:e,frame:t,fragmentShader:Fe,mipmaps:[`u_image`],uniforms:ae})},ye),L={name:`Default`,params:{...A,fit:`cover`,speed:0,frame:0,colorBack:`#f2f1e8`,colorFront:`#2b2b2b`,size:.5,radius:1.25,contrast:.4,originalColors:!1,inverted:!1,grainMixer:.2,grainOverlay:.2,grainSize:.5,grid:`hex`,type:`gooey`}};({...A}),{...A},{...A};var Ge=(0,j.memo)(function({speed:e=L.params.speed,frame:t=L.params.frame,colorFront:n=L.params.colorFront,colorBack:r=L.params.colorBack,image:i=``,size:a=L.params.size,radius:o=L.params.radius,contrast:s=L.params.contrast,originalColors:c=L.params.originalColors,inverted:l=L.params.inverted,grainMixer:u=L.params.grainMixer,grainOverlay:d=L.params.grainOverlay,grainSize:f=L.params.grainSize,grid:p=L.params.grid,type:m=L.params.type,fit:h=L.params.fit,scale:g=L.params.scale,rotation:_=L.params.rotation,originX:v=L.params.originX,originY:y=L.params.originY,offsetX:b=L.params.offsetX,offsetY:x=L.params.offsetY,worldWidth:S=L.params.worldWidth,worldHeight:C=L.params.worldHeight,...w}){let T={u_image:i,u_colorFront:k(n),u_colorBack:k(r),u_size:a,u_radius:o,u_contrast:s,u_originalColors:c,u_inverted:l,u_grainMixer:u,u_grainOverlay:d,u_grainSize:f,u_grid:Re[p],u_type:Le[m],u_fit:ge[h],u_rotation:_,u_scale:g,u_offsetX:b,u_offsetY:x,u_originX:v,u_originY:y,u_worldWidth:S,u_worldHeight:C};return(0,M.jsx)(me,{...w,speed:e,frame:t,fragmentShader:Ie,uniforms:T})},ye),Ke=e=>e,qe=({onClick:e,label:t,title:n,isDaylight:r})=>(0,M.jsx)(`button`,{type:`button`,onClick:e,className:`h-6 rounded-md px-1.5 text-[10px] font-bold transition-all ${r?`bg-white shadow-sm hover:bg-white/90`:`bg-white/20 shadow-sm hover:bg-white/30`}`,title:n,"aria-label":n,children:t}),Je=({active:e,onToggle:t,label:n,theme:r,children:i})=>(0,M.jsx)(`button`,{type:`button`,onClick:t,className:`flex h-6 w-6 items-center justify-center rounded-md transition-all ${e?``:`opacity-40 hover:opacity-100`}`,style:e?{color:r.accentColor}:void 0,title:n,"aria-label":n,"aria-pressed":e,children:i}),R=({label:e,description:t,checked:n,onChange:r,theme:i})=>(0,M.jsxs)(`div`,{className:`flex items-center justify-between gap-4`,children:[(0,M.jsxs)(`div`,{className:`space-y-1`,children:[(0,M.jsx)(`div`,{className:`text-sm font-medium`,style:{color:i.primaryColor},children:e}),t&&(0,M.jsx)(`div`,{className:`max-w-[320px] text-xs opacity-70`,style:{color:i.secondaryColor},children:t})]}),(0,M.jsx)(`button`,{type:`button`,"aria-pressed":n,disabled:!r,onClick:()=>r?.(!n),className:`h-6 w-12 shrink-0 rounded-full p-1 transition-colors disabled:opacity-45`,style:{backgroundColor:n?i.secondaryColor:o(i.secondaryColor,.18)},children:(0,M.jsx)(`div`,{className:`h-4 w-4 rounded-full shadow-sm transition-transform ${n?`translate-x-6`:`translate-x-0`}`,style:{backgroundColor:i.backgroundColor}})})]}),Ye=({config:e,actions:t,t:n,theme:r,controlCardBg:i,rangeInputClass:a,onSliderPointerDown:s,onSliderCommit:c})=>{let l=e?.common,u=t?.common,d=o(r.secondaryColor,.16),f=l?.opacity??.75;return(0,M.jsxs)(M.Fragment,{children:[(0,M.jsxs)(`div`,{className:`rounded-[24px] border p-4 space-y-4`,style:{backgroundColor:i,borderColor:d},children:[(0,M.jsx)(R,{label:n(`options.disableVisualizerVignette`),description:n(`options.disableVisualizerVignetteDesc`),checked:l?.disableVignette??!1,onChange:u?.onDisableVignetteChange,theme:r}),(0,M.jsx)(R,{label:n(`options.disableVisualizerGeometricBackground`),description:n(`options.disableVisualizerGeometricBackgroundDesc`),checked:l?.disableGeometricBackground??!1,onChange:u?.onDisableGeometricChange,theme:r})]}),(0,M.jsx)(`div`,{className:`rounded-[24px] border p-4 space-y-4`,style:{backgroundColor:i,borderColor:d},children:(0,M.jsxs)(`div`,{className:`space-y-2`,children:[(0,M.jsx)(`div`,{className:`text-sm font-medium`,style:{color:r.primaryColor},children:n(`options.previewCoverBackgroundSettings`)}),(0,M.jsx)(`div`,{className:`text-xs opacity-70`,style:{color:r.secondaryColor},children:n(`options.previewCoverBackgroundSettingsDesc`)}),(0,M.jsx)(R,{label:n(`theme.addCoverColor`),description:n(`options.coverColorBackgroundDesc`),checked:l?.useCoverColorBg??!1,onChange:u?.onCoverColorChange,theme:r}),(0,M.jsxs)(`div`,{className:`flex items-center justify-between text-sm`,style:{color:r.primaryColor},children:[(0,M.jsx)(`span`,{children:n(`options.previewCoverBackgroundOpacity`)}),(0,M.jsxs)(`span`,{className:`font-mono opacity-70`,style:{color:r.secondaryColor},children:[Math.round(f*100),`%`]})]}),(0,M.jsx)(`input`,{type:`range`,min:`0`,max:`1`,step:`0.05`,value:f,onChange:e=>u?.onOpacityChange?.(Number(e.target.value)),onPointerDown:s,onPointerUp:c,className:a})]})})]})},z=24,Xe=96,Ze=()=>{if(typeof navigator>`u`)return!1;let e=navigator.userAgent,t=/iPad|iPhone|iPod/i.test(e)||navigator.platform===`MacIntel`&&navigator.maxTouchPoints>1,n=/WebKit/i.test(e),r=/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser|GSA/i.test(e);return t&&n&&!r},Qe=e=>new Promise(t=>{if(typeof document>`u`){t(null);return}let n=new Image;n.crossOrigin=`anonymous`,n.decoding=`async`,n.onload=()=>{try{let e=document.createElement(`canvas`),r=document.createElement(`canvas`);e.width=z,e.height=z,r.width=Xe,r.height=Xe;let i=e.getContext(`2d`),a=r.getContext(`2d`);if(!i||!a){t(null);return}let o=n.naturalWidth||n.width,s=n.naturalHeight||n.height,c=Math.min(o,s),l=Math.max(0,(o-c)/2),u=Math.max(0,(s-c)/2);i.imageSmoothingEnabled=!0,i.imageSmoothingQuality=`high`,i.drawImage(n,l,u,c,c,0,0,z,z),a.imageSmoothingEnabled=!0,a.imageSmoothingQuality=`high`,a.globalAlpha=1,a.drawImage(e,0,0,z,z,0,0,Xe,Xe),[{x:-8,y:-8,size:112,alpha:.22},{x:6,y:0,size:Xe,alpha:.14},{x:0,y:6,size:Xe,alpha:.14}].forEach(({x:t,y:n,size:r,alpha:i})=>{a.globalAlpha=i,a.drawImage(e,0,0,z,z,t,n,r,r)}),a.globalAlpha=1,t(r.toDataURL(`image/jpeg`,.72))}catch(e){console.warn(`[FluidBackground] Failed to build soft focus cover`,e),t(null)}},n.onerror=()=>t(null),n.src=e}),$e=384,et=(e,t)=>new Promise(n=>{if(typeof document>`u`){n(null);return}let r=new Image;r.crossOrigin=`anonymous`,r.decoding=`async`,r.onload=()=>{try{let e=r.naturalWidth||r.width,i=r.naturalHeight||r.height;if(!e||!i){n(null);return}let a=Math.min(1,t/Math.max(e,i)),o=Math.max(1,Math.round(e*a)),s=Math.max(1,Math.round(i*a)),c=document.createElement(`canvas`);c.width=o,c.height=s;let l=c.getContext(`2d`);if(!l){n(null);return}l.imageSmoothingEnabled=!0,l.imageSmoothingQuality=`high`,l.drawImage(r,0,0,o,s),n(c.toDataURL(`image/jpeg`,.82))}catch(e){console.warn(`[FluidBackground] Failed to downscale cover`,e),n(null)}},r.onerror=()=>n(null),r.src=e}),tt=(0,j.memo)(({coverUrl:e,theme:t})=>{let n=(0,j.useMemo)(Ze,[]),[r,i]=(0,j.useState)(null);(0,j.useEffect)(()=>{let t=!1;return!n||!e?(i(null),()=>{t=!0}):(i(null),Qe(e).then(e=>{t||i(e)}),()=>{t=!0})},[e,n]);let a=(0,j.useRef)(0),[o,s]=(0,j.useState)([]),[c,l]=(0,j.useState)(()=>new Set);(0,j.useEffect)(()=>{if(n)return;if(!e){s([]);return}let t=!1;return et(e,$e).then(n=>{if(t)return;let r=n??e;s(t=>{let n=t[t.length-1];return n&&n.sourceCover===e?t:(a.current+=1,[...n?[n]:[],{url:r,sourceCover:e,key:a.current}])})}),()=>{t=!0}},[e,n]);let u=(0,j.useCallback)(e=>{l(t=>t.has(e)?t:new Set(t).add(e))},[]),d=n?r??e??null:null,f=n&&!!r,p=(0,j.useMemo)(()=>n?{transform:`scale(${f?1.28:1.2}) translateZ(0)`,opacity:f?.94:.3,willChange:`transform, opacity`,backfaceVisibility:`hidden`,WebkitBackfaceVisibility:`hidden`}:{filter:`blur(40px)`,transform:`scale(1.5) translateZ(0)`,opacity:1,willChange:`transform, opacity, filter`,backfaceVisibility:`hidden`,WebkitBackfaceVisibility:`hidden`},[n,f]);return(0,M.jsxs)(`div`,{className:`absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0`,style:{isolation:`isolate`,contain:`paint`,transform:`translateZ(0)`},children:[e?(0,M.jsxs)(M.Fragment,{children:[n?(0,M.jsx)(`img`,{src:d??e,alt:``,"aria-hidden":`true`,draggable:!1,decoding:`async`,className:`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out`,style:p}):o.map((e,t)=>{let n=t===o.length-1,r=c.has(e.key);return(0,M.jsx)(O.div,{className:`absolute inset-0 w-full h-full`,style:{willChange:`opacity`},initial:{opacity:+!n},animate:{opacity:n&&!r?0:1},transition:{duration:1.5,ease:`easeInOut`},onAnimationComplete:()=>{n&&r&&(s(t=>t.filter(t=>t.key===e.key)),l(t=>t.has(e.key)?new Set([e.key]):t))},children:(0,M.jsx)(`img`,{src:e.url,alt:``,"aria-hidden":`true`,draggable:!1,decoding:`async`,className:`absolute inset-0 w-full h-full object-cover`,style:p,ref:t=>{t&&!c.has(e.key)&&t.decode().then(()=>requestAnimationFrame(()=>u(e.key))).catch(()=>u(e.key))},onError:()=>{s(t=>t.length>1?t.filter(t=>t.key!==e.key):t)}})},e.key)}),n&&(0,M.jsxs)(M.Fragment,{children:[!f&&(0,M.jsx)(`img`,{src:e,alt:``,"aria-hidden":`true`,draggable:!1,decoding:`async`,className:`absolute inset-0 w-full h-full object-cover`,style:{transform:`scale(1.36) translateZ(0)`,opacity:.12,willChange:`transform, opacity`,backfaceVisibility:`hidden`,WebkitBackfaceVisibility:`hidden`}}),(0,M.jsx)(`div`,{className:`absolute inset-0 w-full h-full`,style:{backgroundColor:t.backgroundColor,opacity:.28}}),(0,M.jsx)(`div`,{className:`absolute inset-0 w-full h-full`,style:{background:`radial-gradient(circle at 20% 20%, ${t.accentColor}55 0%, transparent 42%), radial-gradient(circle at 80% 28%, ${t.secondaryColor}50 0%, transparent 44%), radial-gradient(circle at 50% 78%, ${t.primaryColor}28 0%, transparent 52%)`,opacity:f?.52:.7}})]})]}):(0,M.jsx)(`div`,{className:`absolute inset-0 w-full h-full transition-colors duration-1000`,style:{backgroundColor:t.backgroundColor,opacity:.8}}),(0,M.jsx)(`div`,{className:`absolute inset-0 w-full h-full`,style:{background:`linear-gradient(to bottom right, ${t.primaryColor}, transparent, ${t.secondaryColor})`,opacity:n?.2:.4,mixBlendMode:n?`normal`:`overlay`}})]})},(e,t)=>{if(e.coverUrl!==t.coverUrl)return!1;let n=e.theme,r=t.theme;return n.backgroundColor===r.backgroundColor&&n.primaryColor===r.primaryColor&&n.secondaryColor===r.secondaryColor}),nt=null,rt=null,it=!1,at=new Map,ot=new Map,st=new Set,ct=new Set,lt=0,ut=e=>typeof e==`object`&&!!e&&`$$typeof`in e&&`render`in e,dt=e=>e.replace(/(?:^|-)(\w)/g,(e,t)=>t.toUpperCase()),ft=e=>{let t=new Map,n=new Map,r=Object.keys(e);return[e=>e,e=>`${e}Icon`,e=>`Lucide${e}`].forEach(e=>{r.forEach(r=>{let i=e(dt(r));t.has(i)||(t.set(i,r),n.has(i.toLowerCase())||n.set(i.toLowerCase(),i))})}),{loaders:e,keysByName:t,namesByLowercase:n}},pt=()=>{lt+=1,ct.forEach(e=>e())},mt=()=>(rt??=i(()=>import(`./dynamicIconImports-DuVFx370.js`).then(e=>(nt=ft(e.default),it=!1,pt(),nt)),__vite__mapDeps([0,1,2,3,4,5,6])).catch(e=>{throw rt=null,it=!0,pt(),e}),rt),ht=(e,t)=>{if(at.has(t))return Promise.resolve();let n=ot.get(t);return n||(n=e.loaders[t]().then(e=>{ut(e.default)&&(at.set(t,e.default),st.delete(t),pt())}).catch(()=>{st.add(t),pt()}).finally(()=>ot.delete(t)),ot.set(t,n)),n},gt=e=>typeof e==`string`?e.trim():``,_t=async e=>{let t=(e??[]).map(gt).filter(Boolean);if(t.length===0)return;let n;try{n=await mt()}catch{return}await Promise.all(t.map(e=>{let t=n.keysByName.has(e)?e:n.namesByLowercase.get(e.toLowerCase()),r=t?n.keysByName.get(t):void 0;return r?ht(n,r):void 0}))},vt=async e=>{let t=gt(e);if(!t)return!1;try{return(await mt()).keysByName.has(t)}catch{return!1}},yt=e=>{let t=nt?.keysByName.get(gt(e));return t?at.get(t)??null:null},bt=e=>{let t=gt(e);if(!t)return`missing`;if(!nt)return it?`missing`:`loading`;let n=nt.keysByName.get(t);return n?at.has(n)?`ready`:st.has(n)?`missing`:`loading`:`missing`},xt=e=>[...new Set((e??[]).map(e=>typeof e==`string`?nt?.namesByLowercase.get(e.trim().toLowerCase()):void 0).filter(e=>e!==void 0&&yt(e)!==null))],St=e=>(ct.add(e),()=>{ct.delete(e)}),Ct=()=>lt,wt=e=>{let t=e?.join(`
`)??``;return(0,j.useEffect)(()=>{t&&_t(t.split(`
`))},[t]),(0,j.useSyncExternalStore)(St,Ct,Ct)},Tt=e=>{switch(e.type){case`circle`:return`bass`;case`square`:return`lowMid`;case`triangle`:return`mid`;case`cross`:return`treble`;case`icon`:return`vocal`;default:return`default`}},Et=e=>e===`triangle`?`polygon(50% 0%, 0% 100%, 100% 100%)`:e===`cross`?`polygon(20% 0%, 0% 20%, 30% 50%, 0% 80%, 20% 100%, 50% 70%, 80% 100%, 100% 80%, 70% 50%, 100% 20%, 80% 0%, 50% 30%)`:`none`,Dt=(e,t)=>{let n=(e.type===`circle`||e.type===`square`)&&!e.filled;return{left:`${e.initialX}%`,top:`${e.initialY}%`,width:e.size,height:e.size,border:n?`1px solid ${t.secondaryColor}`:`none`,backgroundColor:n?`transparent`:t.secondaryColor,borderRadius:e.type===`circle`?`50%`:`0%`,opacity:e.opacity,clipPath:Et(e.type)}},Ot=({disabled:e=!1})=>e?null:(0,M.jsx)(`div`,{className:`absolute inset-0 pointer-events-none`,style:{background:`radial-gradient(circle, transparent 40%, rgba(0,0,0,0.6) 100%)`}}),kt=({theme:e,shapes:t,particles:n,hideShapes:r,disableVignette:i})=>(0,M.jsxs)(`div`,{className:`absolute inset-0`,children:[!r&&(0,M.jsxs)(M.Fragment,{children:[t.map(t=>{if(t.type===`icon`&&t.iconName){if(bt(t.iconName)===`loading`)return null;let n=yt(t.iconName);if(n)return(0,M.jsx)(`div`,{className:`absolute flex items-center justify-center`,style:{left:`${t.initialX}%`,top:`${t.initialY}%`,width:t.size,height:t.size,color:e.secondaryColor,opacity:t.opacity,transform:`rotate(${t.initialRotation}deg)`},children:(0,M.jsx)(n,{size:t.size,strokeWidth:1,absoluteStrokeWidth:!0})},t.id)}return(0,M.jsx)(`div`,{className:`absolute`,style:{...Dt(t,e),transform:`rotate(${t.initialRotation}deg)`}},t.id)}),n.map(t=>(0,M.jsx)(`div`,{className:`absolute rounded-full`,style:{backgroundColor:e.accentColor,width:t.size,height:t.size,left:`${t.left}%`,top:`${t.top}%`,opacity:t.opacity}},`p-${t.id}`))]}),(0,M.jsx)(Ot,{disabled:i})]}),At=({theme:e,audioPower:t,audioBands:n,shapes:r,particles:i,hideShapes:a,disableVignette:o})=>{let s=e=>{let n=ke(e||t,{stiffness:300,damping:30});return le(n,[10,200],[.95,1.45])},c={bass:s(n?.bass),lowMid:s(n?.lowMid),mid:s(n?.mid),vocal:s(n?.vocal),treble:s(n?.treble),default:s(t)};return(0,M.jsxs)(`div`,{className:`absolute inset-0`,children:[!a&&(0,M.jsxs)(M.Fragment,{children:[r.map(t=>{if(t.type===`icon`&&t.iconName){if(bt(t.iconName)===`loading`)return null;let n=yt(t.iconName);if(n)return(0,M.jsx)(O.div,{className:`absolute flex items-center justify-center`,style:{left:`${t.initialX}%`,top:`${t.initialY}%`,width:t.size,height:t.size,color:e.secondaryColor,scale:c.vocal},animate:{y:t.reverse?[-30,30,-30]:[30,-30,30],x:t.reverse?[15,-15,15]:[-15,15,-15],rotate:[t.initialRotation,t.initialRotation+360],opacity:[0,t.opacity*3,0]},transition:{duration:t.duration,repeat:1/0,ease:`linear`,delay:t.delay,opacity:{duration:t.duration*.5,repeat:1/0,ease:`easeInOut`,delay:t.delay}},children:(0,M.jsx)(n,{size:t.size,strokeWidth:1,absoluteStrokeWidth:!0})},t.id)}return(0,M.jsx)(O.div,{className:`absolute`,style:{...Dt(t,e),scale:c[Tt(t)]},animate:{y:t.reverse?[-30,30,-30]:[30,-30,30],x:t.reverse?[15,-15,15]:[-15,15,-15],rotate:[t.initialRotation,t.initialRotation+360]},transition:{duration:t.duration,repeat:1/0,ease:`linear`,delay:t.delay}},t.id)}),i.map(t=>(0,M.jsx)(O.div,{className:`absolute rounded-full`,style:{backgroundColor:e.accentColor,width:t.size,height:t.size,left:`${t.left}%`,top:`${t.top}%`,opacity:t.opacity},animate:{y:[0,-100],opacity:[0,t.opacity,0]},transition:{duration:t.duration,repeat:1/0,ease:`linear`,delay:t.delay}},`p-${t.id}`))]}),(0,M.jsx)(Ot,{disabled:o})]})},jt=({theme:e,audioPower:t,audioBands:n,seed:r,hideShapes:i=!1,disableVignette:a=!1,paused:o=!1})=>{wt(e.lyricsIcons);let s=(0,j.useMemo)(()=>{let t=[`circle`,`square`,`triangle`,`cross`],n=e.lyricsIcons||[],r=0;return Array.from({length:15}).map((e,i)=>{let a=n.length>0&&Math.random()>.7&&r<6;a&&(r+=1);let o=a?n[Math.floor(Math.random()*n.length)]:null;return{id:i,type:a?`icon`:t[Math.floor(Math.random()*t.length)],iconName:o,initialX:Math.random()*100,initialY:Math.random()*100,size:40+Math.random()*100,duration:a?20+Math.random()*20:30+Math.random()*30,delay:Math.random()*5,opacity:.11+Math.random()*.08,reverse:Math.random()>.5,filled:Math.random()<.3,initialRotation:Math.random()*360}})},[e.lyricsIcons,r]),c=(0,j.useMemo)(()=>Array.from({length:20}).map((e,t)=>({id:t,size:Math.random()*4+1,left:Math.random()*100,top:Math.random()*100,opacity:Math.random()*.3,duration:15+Math.random()*20,delay:Math.random()*10})),[r]);return(0,M.jsx)(O.div,{className:`absolute inset-0`,initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},transition:{duration:.6,ease:`easeInOut`},children:o?(0,M.jsx)(kt,{theme:e,shapes:s,particles:c,hideShapes:i,disableVignette:a}):(0,M.jsx)(At,{theme:e,audioPower:t,audioBands:n,shapes:s,particles:c,hideShapes:i,disableVignette:a})})},Mt=j.memo(e=>{let t=String(e.seed??`default`);return(0,M.jsx)(`div`,{className:`absolute inset-0 overflow-hidden pointer-events-none`,children:(0,M.jsx)(ue,{mode:`sync`,children:(0,M.jsx)(jt,{...e},t)})})},(e,t)=>{if(e.seed!==t.seed||e.audioPower!==t.audioPower||e.hideShapes!==t.hideShapes||e.disableVignette!==t.disableVignette||e.paused!==t.paused)return!1;let n=e.audioBands,r=t.audioBands;if(!n!=!r)return!1;let i=!0;if(n&&r&&(i=n.bass===r.bass&&n.lowMid===r.lowMid&&n.mid===r.mid&&n.vocal===r.vocal&&n.treble===r.treble),!i)return!1;let a=e.theme,o=t.theme,s=a.backgroundColor===o.backgroundColor&&a.primaryColor===o.primaryColor&&a.secondaryColor===o.secondaryColor&&a.accentColor===o.accentColor,c=!!(a.lyricsIcons===o.lyricsIcons||a.lyricsIcons?.length===o.lyricsIcons?.length&&a.lyricsIcons?.every((e,t)=>e===o.lyricsIcons?.[t]));return s&&c}),Nt=e({default:()=>Pt}),Pt=Ke({mode:`common`,order:10,labelKey:`options.visualizerBackgroundModeCommon`,labelFallback:`Common`,render:({config:e,theme:t,coverUrl:n,audioPower:r,audioBands:i,seed:a,staticMode:o,paused:s})=>{let c=e?.common,l=c?.useCoverColorBg??!1;return(0,M.jsxs)(M.Fragment,{children:[l&&(0,M.jsx)(O.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},transition:{duration:1},className:`absolute inset-0 z-0`,children:(0,M.jsx)(tt,{coverUrl:n,theme:t})},`fluid-bg`),(0,M.jsx)(`div`,{className:`absolute inset-0 z-0 transition-all duration-1000`,style:{backgroundColor:t.backgroundColor,opacity:l?c?.opacity??.75:1}}),!o&&(0,M.jsx)(`div`,{className:`absolute inset-0 z-0`,children:(0,M.jsx)(Mt,{theme:t,audioPower:r,audioBands:i,seed:a,hideShapes:c?.disableGeometricBackground??!1,disableVignette:c?.disableVignette??!1,paused:s})})]})},renderSettingsPanel:e=>(0,M.jsx)(Ye,{...e}),renderQuickControls:({config:e,actions:t,t:n,theme:r})=>{let i=e?.common?.useCoverColorBg??!1;return(0,M.jsx)(Je,{active:i,theme:r,label:n(i?`theme.addCoverColor`:`theme.useDefaultColor`),onToggle:()=>t?.common?.onCoverColorChange?.(!i),children:(0,M.jsx)(u,{size:14})})},resetSettings:e=>{e?.common?.onOpacityChange?.(.75),e?.common?.onCoverColorChange?.(!1),e?.common?.onDisableVignetteChange?.(!1),e?.common?.onDisableGeometricChange?.(!1)}}),B=({label:e,value:t,min:n,max:r,step:i,format:a=e=>e.toFixed(1),rangeInputClass:o,theme:s,onChange:c,onPointerDown:l,onPointerUp:u,disabled:d=!1})=>(0,M.jsxs)(`label`,{className:`block space-y-2`,children:[(0,M.jsxs)(`span`,{className:`flex justify-between gap-3 text-sm`,style:{color:s.primaryColor},children:[(0,M.jsx)(`span`,{children:e}),(0,M.jsx)(`span`,{className:`font-mono opacity-70`,children:a(t)})]}),(0,M.jsx)(`input`,{type:`range`,min:n,max:r,step:i,value:t,disabled:d,onChange:e=>c(Number(e.target.value)),onPointerDown:l,onPointerUp:u,className:o})]}),Ft=({t:e,isDaylight:t,theme:n,controlCardBg:r,rangeInputClass:i,tuning:a,onTuningChange:s,onSliderPointerDown:c,onSliderCommit:l})=>{let u=o(n.secondaryColor,t?.18:.16),d=o(n.accentColor,t?.1:.16),f=[[`dithering`,e(`options.latentDisplayDithering`)],[`mesh`,e(`options.latentDisplayMesh`)],[`both`,e(`options.latentDisplayBoth`)]],p=[[`cover-theme`,e(`options.latentColorSourceCoverTheme`)],[`cover-only`,e(`options.latentColorSourceCoverOnly`)]],m={rangeInputClass:i,theme:n,onPointerDown:c,onPointerUp:l};return(0,M.jsxs)(`div`,{className:`rounded-[24px] border p-4 space-y-5`,style:{backgroundColor:r,borderColor:u},children:[(0,M.jsxs)(`div`,{className:`space-y-1`,children:[(0,M.jsx)(`div`,{className:`text-sm font-medium`,style:{color:n.primaryColor},children:e(`options.latentBackgroundSettings`)}),(0,M.jsx)(`div`,{className:`text-xs opacity-70`,style:{color:n.secondaryColor},children:e(`options.latentBackgroundSettingsDesc`)})]}),(0,M.jsxs)(`div`,{className:`space-y-2`,children:[(0,M.jsx)(`div`,{className:`text-sm`,style:{color:n.primaryColor},children:e(`options.latentDisplayMode`)}),(0,M.jsx)(`div`,{className:`grid grid-cols-3 gap-2`,children:f.map(([e,t])=>(0,M.jsx)(`button`,{type:`button`,onClick:()=>s?.({displayMode:e}),className:`rounded-xl border px-2 py-2 text-xs`,style:{borderColor:a.displayMode===e?n.accentColor:u,backgroundColor:a.displayMode===e?d:`transparent`,color:n.primaryColor},children:t},e))})]}),(0,M.jsxs)(`div`,{className:`space-y-2`,children:[(0,M.jsx)(`div`,{className:`text-sm`,style:{color:n.primaryColor},children:e(`options.latentColorSource`)}),(0,M.jsx)(`div`,{className:`grid grid-cols-2 gap-2`,children:p.map(([e,t])=>(0,M.jsx)(`button`,{type:`button`,onClick:()=>s?.({colorSource:e}),className:`rounded-xl border px-2 py-2 text-xs`,style:{borderColor:a.colorSource===e?n.accentColor:u,backgroundColor:a.colorSource===e?d:`transparent`,color:n.primaryColor},children:t},e))})]}),(0,M.jsx)(R,{label:e(`options.latentDynamicOnlyInPlayer`),description:e(`options.latentDynamicOnlyInPlayerDesc`),checked:a.dynamicOnlyInPlayer,onChange:e=>s?.({dynamicOnlyInPlayer:e}),theme:n}),(0,M.jsx)(R,{label:e(`options.latentEnhancedBeatResponse`),description:e(`options.latentEnhancedBeatResponseDesc`),checked:a.enhancedBeatResponse,onChange:e=>s?.({enhancedBeatResponse:e}),theme:n}),(0,M.jsxs)(`div`,{className:`space-y-3 rounded-2xl border p-3`,style:{borderColor:u},children:[(0,M.jsx)(R,{label:e(`options.nomandBackgroundOverlay`),description:e(`options.nomandBackgroundOverlayDesc`),checked:a.overlayEnabled,onChange:e=>s?.({overlayEnabled:e}),theme:n}),(0,M.jsx)(`div`,{className:a.overlayEnabled?``:`opacity-45`,children:(0,M.jsx)(B,{...m,label:e(`options.nomandBackgroundOverlayOpacity`),value:a.overlayOpacity,disabled:!a.overlayEnabled,min:0,max:1,step:.05,format:e=>`${Math.round(e*100)}%`,onChange:e=>s?.({overlayOpacity:e})})})]}),(0,M.jsxs)(`div`,{className:`space-y-4 rounded-2xl border p-3`,style:{borderColor:u},children:[(0,M.jsx)(`div`,{className:`text-xs font-medium uppercase tracking-[0.2em]`,style:{color:n.secondaryColor},children:e(`options.latentDitheringGroup`)}),(0,M.jsx)(B,{...m,label:e(`options.latentBaseSpeed`),value:a.ditheringSpeed,min:0,max:2,step:.1,onChange:e=>s?.({ditheringSpeed:e})}),(0,M.jsx)(B,{...m,label:e(`options.latentAudioSpeed`),value:a.ditheringAudioSpeed,min:0,max:2,step:.1,onChange:e=>s?.({ditheringAudioSpeed:e})}),(0,M.jsx)(B,{...m,label:e(`options.latentDitheringSize`),value:a.ditheringSize,min:.5,max:8,step:.25,onChange:e=>s?.({ditheringSize:e})}),(0,M.jsx)(B,{...m,label:e(`options.latentDitheringOpacity`),value:a.ditheringOpacity,min:0,max:1,step:.05,format:e=>`${Math.round(e*100)}%`,onChange:e=>s?.({ditheringOpacity:e})})]}),(0,M.jsxs)(`div`,{className:`space-y-4 rounded-2xl border p-3`,style:{borderColor:u},children:[(0,M.jsx)(`div`,{className:`text-xs font-medium uppercase tracking-[0.2em]`,style:{color:n.secondaryColor},children:e(`options.latentMeshGroup`)}),(0,M.jsx)(B,{...m,label:e(`options.latentBaseSpeed`),value:a.meshSpeed,min:0,max:2,step:.1,onChange:e=>s?.({meshSpeed:e})}),(0,M.jsx)(B,{...m,label:e(`options.latentAudioSpeed`),value:a.meshAudioSpeed,min:0,max:2,step:.1,onChange:e=>s?.({meshAudioSpeed:e})}),(0,M.jsx)(B,{...m,label:e(`options.latentMeshDistortion`),value:a.meshDistortion,min:0,max:2,step:.05,onChange:e=>s?.({meshDistortion:e})}),(0,M.jsx)(B,{...m,label:e(`options.latentMeshSwirl`),value:a.meshSwirl,min:0,max:1,step:.05,onChange:e=>s?.({meshSwirl:e})})]})]})},It=e({default:()=>zt}),Lt=[`dithering`,`mesh`,`both`],Rt={dithering:`options.latentDisplayDithering`,mesh:`options.latentDisplayMesh`,both:`options.latentDisplayBoth`},zt=Ke({mode:`latent`,order:35,labelKey:`options.visualizerBackgroundModeLatent`,labelFallback:`Latent`,render:({config:e,theme:t,coverUrl:n,audioPower:r,audioBands:i,staticMode:a,paused:o})=>(0,M.jsx)(be,{theme:t,coverUrl:n,audioPower:r,audioBands:i,staticMode:a,paused:o,tuning:e?.latent?.tuning}),renderSettingsPanel:({config:e,actions:t,...n})=>(0,M.jsx)(Ft,{...n,tuning:e?.latent?.tuning??E,onTuningChange:t?.latent?.onTuningChange}),renderQuickControls:({config:e,actions:t,t:n,isDaylight:r,theme:i})=>{let a=e?.latent?.tuning??E,o=n(Rt[a.displayMode]);return(0,M.jsxs)(M.Fragment,{children:[(0,M.jsx)(qe,{isDaylight:r,label:o,title:`${n(`options.latentDisplayMode`)}: ${o}`,onClick:()=>{let e=Lt.indexOf(a.displayMode);t?.latent?.onTuningChange?.({displayMode:Lt[(e+1)%Lt.length]})}}),(0,M.jsx)(Je,{active:a.overlayEnabled,theme:i,label:n(`options.nomandBackgroundOverlay`),onToggle:()=>t?.latent?.onTuningChange?.({overlayEnabled:!a.overlayEnabled}),children:(0,M.jsx)(c,{size:14})})]})},resetSettings:e=>e?.latent?.onResetTuning?.()});function Bt(){return(Bt=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e}).apply(this,arguments)}function Vt(e,t){if(e==null)return{};var n,r,i={},a=Object.keys(e);for(r=0;r<a.length;r++)t.indexOf(n=a[r])>=0||(i[n]=e[n]);return i}function Ht(e){var t=(0,j.useRef)(e),n=(0,j.useRef)(function(e){t.current&&t.current(e)});return t.current=e,n.current}var Ut=function(e,t,n){return t===void 0&&(t=0),n===void 0&&(n=1),e>n?n:e<t?t:e},Wt=function(e){return`touches`in e},Gt=function(e){return e&&e.ownerDocument.defaultView||self},Kt=function(e,t,n){var r=e.getBoundingClientRect(),i=Wt(t)?function(e,t){for(var n=0;n<e.length;n++)if(e[n].identifier===t)return e[n];return e[0]}(t.touches,n):t;return{left:Ut((i.pageX-(r.left+Gt(e).pageXOffset))/r.width),top:Ut((i.pageY-(r.top+Gt(e).pageYOffset))/r.height)}},qt=function(e){!Wt(e)&&e.preventDefault()},Jt=j.memo(function(e){var t=e.onMove,n=e.onKey,r=e.onEnd,i=Vt(e,[`onMove`,`onKey`,`onEnd`]),a=(0,j.useRef)(null),o=Ht(t),s=Ht(n),c=Ht(r),l=(0,j.useRef)(null),u=(0,j.useRef)(!1),d=(0,j.useMemo)(function(){var e=function(e){qt(e),(Wt(e)?e.touches.length>0:e.buttons>0)&&a.current?o(Kt(a.current,e,l.current)):(n(!1),c())},t=function(){n(!1),c()};function n(n){var r=u.current,i=Gt(a.current),o=n?i.addEventListener:i.removeEventListener;o(r?`touchmove`:`mousemove`,e),o(r?`touchend`:`mouseup`,t)}return[function(e){var t=e.nativeEvent,r=a.current;if(r&&(qt(t),!function(e,t){return t&&!Wt(e)}(t,u.current)&&r)){if(Wt(t)){u.current=!0;var i=t.changedTouches||[];i.length&&(l.current=i[0].identifier)}r.focus(),o(Kt(r,t,l.current)),n(!0)}},function(e){var t=e.which||e.keyCode;t<37||t>40||(e.preventDefault(),s({left:t===39?.05:t===37?-.05:0,top:t===40?.05:t===38?-.05:0}))},function(e){var t=e.which||e.keyCode;t>=37&&t<=40&&c()},n]},[s,o,c]),f=d[0],p=d[1],m=d[2],h=d[3];return(0,j.useEffect)(function(){return h},[h]),j.createElement(`div`,Bt({},i,{onTouchStart:f,onMouseDown:f,className:`react-colorful__interactive`,ref:a,onKeyDown:p,onKeyUp:m,tabIndex:0,role:`slider`}))}),Yt=function(e){return e.filter(Boolean).join(` `)},Xt=function(e){var t=e.color,n=e.left,r=e.top,i=r===void 0?.5:r,a=Yt([`react-colorful__pointer`,e.className]);return j.createElement(`div`,{className:a,style:{top:100*i+`%`,left:100*n+`%`}},j.createElement(`div`,{className:`react-colorful__pointer-fill`,style:{backgroundColor:t}}))},V=function(e,t,n){return t===void 0&&(t=0),n===void 0&&(n=10**t),Math.round(n*e)/n},Zt=function(e){return on(Qt(e))},Qt=function(e){return e[0]===`#`&&(e=e.substring(1)),e.length<6?{r:parseInt(e[0]+e[0],16),g:parseInt(e[1]+e[1],16),b:parseInt(e[2]+e[2],16),a:e.length===4?V(parseInt(e[3]+e[3],16)/255,2):1}:{r:parseInt(e.substring(0,2),16),g:parseInt(e.substring(2,4),16),b:parseInt(e.substring(4,6),16),a:e.length===8?V(parseInt(e.substring(6,8),16)/255,2):1}},$t=function(e){return an(nn(e))},en=function(e){var t=e.s,n=e.v,r=e.a,i=(200-t)*n/100;return{h:V(e.h),s:V(i>0&&i<200?t*n/100/(i<=100?i:200-i)*100:0),l:V(i/2),a:V(r,2)}},tn=function(e){var t=en(e);return`hsl(`+t.h+`, `+t.s+`%, `+t.l+`%)`},nn=function(e){var t=e.h,n=e.s,r=e.v,i=e.a;t=t/360*6,n/=100,r/=100;var a=Math.floor(t),o=r*(1-n),s=r*(1-(t-a)*n),c=r*(1-(1-t+a)*n),l=a%6;return{r:V(255*[r,s,o,o,c,r][l]),g:V(255*[c,r,r,s,o,o][l]),b:V(255*[o,o,c,r,r,s][l]),a:V(i,2)}},rn=function(e){var t=e.toString(16);return t.length<2?`0`+t:t},an=function(e){var t=e.r,n=e.g,r=e.b,i=e.a,a=i<1?rn(V(255*i)):``;return`#`+rn(t)+rn(n)+rn(r)+a},on=function(e){var t=e.r,n=e.g,r=e.b,i=e.a,a=Math.max(t,n,r),o=a-Math.min(t,n,r),s=o?a===t?(n-r)/o:a===n?2+(r-t)/o:4+(t-n)/o:0;return{h:60*(s<0?s+6:s),s:a?o/a*100:0,v:a/255*100,a:i}},sn=j.memo(function(e){var t=e.hue,n=e.onChange,r=e.onChangeEnd,i=Yt([`react-colorful__hue`,e.className]);return j.createElement(`div`,{className:i},j.createElement(Jt,{onMove:function(e){n({h:360*e.left})},onKey:function(e){n({h:Ut(t+360*e.left,0,360)})},onEnd:r,"aria-label":`Hue`,"aria-valuenow":V(t),"aria-valuemax":`360`,"aria-valuemin":`0`},j.createElement(Xt,{className:`react-colorful__hue-pointer`,left:t/360,color:tn({h:t,s:100,v:100,a:1})})))}),cn=j.memo(function(e){var t=e.hsva,n=e.onChange,r=e.onChangeEnd,i={backgroundColor:tn({h:t.h,s:100,v:100,a:1})};return j.createElement(`div`,{className:`react-colorful__saturation`,style:i},j.createElement(Jt,{onMove:function(e){n({s:100*e.left,v:100-100*e.top})},onKey:function(e){n({s:Ut(t.s+100*e.left,0,100),v:Ut(t.v-100*e.top,0,100)})},onEnd:r,"aria-label":`Color`,"aria-valuetext":`Saturation `+V(t.s)+`%, Brightness `+V(t.v)+`%`},j.createElement(Xt,{className:`react-colorful__saturation-pointer`,top:1-t.v/100,left:t.s/100,color:tn(t)})))}),ln=function(e,t){if(e===t)return!0;for(var n in e)if(e[n]!==t[n])return!1;return!0},un=function(e,t){return e.toLowerCase()===t.toLowerCase()||ln(Qt(e),Qt(t))};function dn(e,t,n,r){var i=Ht(n),a=Ht(r),o=(0,j.useState)(function(){return e.toHsva(t)}),s=o[0],c=o[1],l=(0,j.useRef)({color:t,hsva:s}),u=(0,j.useRef)(!1);return(0,j.useEffect)(function(){if(!e.equal(t,l.current.color)){var n=e.toHsva(t);l.current={hsva:n,color:t},c(n),u.current=!1}},[t,e]),(0,j.useEffect)(function(){var t;ln(s,l.current.hsva)||e.equal(t=e.fromHsva(s),l.current.color)||(l.current={hsva:s,color:t},i(t),u.current=!0)},[s,e,i]),[s,(0,j.useCallback)(function(e){c(function(t){return Object.assign({},t,e)})},[]),(0,j.useCallback)(function(){u.current&&(u.current=!1,a(l.current.color))},[a])]}var fn=typeof window<`u`?j.useLayoutEffect:j.useEffect,pn=function(){return typeof __webpack_nonce__<`u`?__webpack_nonce__:void 0},mn=new WeakMap,hn=function(e){fn(function(){var t=e.current;if(typeof document<`u`&&t){var n=t.getRootNode?t.getRootNode():t.ownerDocument,r=n&&(`head`in n||`host`in n)?n:t.ownerDocument;if(!mn.has(r)){var i=`head`in r?r.head:r,a=(i.ownerDocument||document).createElement(`style`);a.innerHTML=`.react-colorful{position:relative;display:flex;flex-direction:column;width:200px;height:200px;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;cursor:default}.react-colorful__saturation{position:relative;flex-grow:1;border-color:transparent;border-bottom:12px solid #000;border-radius:8px 8px 0 0;background-image:linear-gradient(0deg,#000,transparent),linear-gradient(90deg,#fff,hsla(0,0%,100%,0))}.react-colorful__alpha-gradient,.react-colorful__pointer-fill{content:"";position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;border-radius:inherit}.react-colorful__alpha-gradient,.react-colorful__saturation{box-shadow:inset 0 0 0 1px rgba(0,0,0,.05)}.react-colorful__alpha,.react-colorful__hue{position:relative;height:24px}.react-colorful__hue{background:linear-gradient(90deg,red 0,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,red)}.react-colorful__last-control{border-radius:0 0 8px 8px}.react-colorful__interactive{position:absolute;left:0;top:0;right:0;bottom:0;border-radius:inherit;outline:none;touch-action:none}.react-colorful__pointer{position:absolute;z-index:1;box-sizing:border-box;width:28px;height:28px;transform:translate(-50%,-50%);background-color:#fff;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,.2)}.react-colorful__interactive:focus .react-colorful__pointer{transform:translate(-50%,-50%) scale(1.1)}.react-colorful__alpha,.react-colorful__alpha-pointer{background-color:#fff;background-image:url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill-opacity=".05"><path d="M8 0h8v8H8zM0 8h8v8H0z"/></svg>')}.react-colorful__saturation-pointer{z-index:3}.react-colorful__hue-pointer{z-index:2}`;var o=pn();o&&a.setAttribute(`nonce`,o),mn.set(r,a),i.appendChild(a)}}},[])},gn=function(e){var t=e.className,n=e.colorModel,r=e.color,i=r===void 0?n.defaultColor:r,a=e.onChange,o=e.onChangeEnd,s=Vt(e,[`className`,`colorModel`,`color`,`onChange`,`onChangeEnd`]),c=(0,j.useRef)(null);hn(c);var l=dn(n,i,a,o),u=l[0],d=l[1],f=l[2],p=Yt([`react-colorful`,t]);return j.createElement(`div`,Bt({},s,{ref:c,className:p}),j.createElement(cn,{hsva:u,onChange:d,onChangeEnd:f}),j.createElement(sn,{hue:u.h,onChange:d,onChangeEnd:f,className:`react-colorful__last-control`}))},_n={defaultColor:`000`,toHsva:Zt,fromHsva:function(e){return $t({h:e.h,s:e.s,v:e.v,a:1})},equal:un},vn=function(e){return j.createElement(gn,Bt({},e,{colorModel:_n}))},yn=({children:e,theme:t})=>(0,M.jsx)(`div`,{className:`text-xs font-medium uppercase tracking-[0.24em] opacity-45`,style:{color:t.secondaryColor},children:e}),bn=({label:e,value:t,options:n,onChange:r,isDaylight:i,theme:a})=>(0,M.jsxs)(`div`,{className:`space-y-2.5`,children:[(0,M.jsx)(yn,{theme:a,children:e}),(0,M.jsx)(`div`,{className:`flex flex-wrap gap-2`,children:n.map(e=>{let n=e.value===t;return(0,M.jsx)(`button`,{type:`button`,onClick:()=>{e.disabled||r(e.value)},disabled:e.disabled,className:`rounded-full border px-3 py-2 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-45`,style:{color:e.disabled?o(a.secondaryColor,.72):a.primaryColor,borderColor:n?a.accentColor:o(a.secondaryColor,i?.18:.14),backgroundColor:n?o(a.accentColor,i?.1:.16):o(a.backgroundColor,i?.24:.34),boxShadow:n?`inset 0 0 0 1px ${a.accentColor}`:`none`},children:e.label},String(e.value))})})]}),H=({label:e,valueLabel:t,value:n,min:r,max:i,step:a,onChange:o,rangeInputClass:s,onSliderPointerDown:c,onSliderCommit:l})=>(0,M.jsxs)(`div`,{className:`space-y-2`,children:[(0,M.jsxs)(`div`,{className:`flex items-center justify-between gap-3 text-sm`,style:{color:`var(--text-primary)`},children:[(0,M.jsx)(`span`,{children:e}),(0,M.jsx)(`span`,{className:`font-mono opacity-70`,style:{color:`var(--text-secondary)`},children:t})]}),(0,M.jsx)(`input`,{type:`range`,min:r,max:i,step:a,value:n,onChange:e=>o(parseFloat(e.target.value)),onPointerDown:c,onPointerUp:l,onPointerCancel:l,onBlur:l,className:s})]}),xn=(e,t,n,r)=>Number.isFinite(e)?Math.min(n,Math.max(t,e)):r,Sn=e=>{let t=e.trim().replace(/^#/,``);return/^[0-9a-fA-F]{6}$/.test(t)?`#${t.toLowerCase()}`:null},Cn=({t:e,isDaylight:t,theme:n,controlCardBg:r,rangeInputClass:i,tuning:a=C,onTuningChange:c,monetBackgroundImage:l,onUploadMonetBackgroundImage:u,onClearMonetBackgroundImage:d,isLoadingMonetBackgroundImage:p=!1,onSliderPointerDown:m,onSliderCommit:h})=>{let g=(0,j.useRef)(null),[_,v]=(0,j.useState)(null),y={backgroundSource:a.backgroundSource??C.backgroundSource,backgroundLayout:a.backgroundLayout??C.backgroundLayout,backgroundBlurPx:xn(a.backgroundBlurPx??C.backgroundBlurPx,0,60,C.backgroundBlurPx),backgroundOverlayOpacity:xn(a.backgroundOverlayOpacity??C.backgroundOverlayOpacity,0,1,C.backgroundOverlayOpacity),backgroundGrayscale:xn(a.backgroundGrayscale??C.backgroundGrayscale,0,1,C.backgroundGrayscale),backgroundSaturation:xn(a.backgroundSaturation??C.backgroundSaturation,0,2,C.backgroundSaturation),backgroundWash:xn(a.backgroundWash??C.backgroundWash,0,1,C.backgroundWash),backgroundHalfPaneOffsetX:xn(a.backgroundHalfPaneOffsetX??C.backgroundHalfPaneOffsetX,-40,40,C.backgroundHalfPaneOffsetX),backgroundWashColorMode:a.backgroundWashColorMode??C.backgroundWashColorMode,backgroundWashCustomColor:Sn(a.backgroundWashCustomColor)??C.backgroundWashCustomColor,backgroundDriftEnabled:a.backgroundDriftEnabled??C.backgroundDriftEnabled,backgroundDriftStrength:xn(a.backgroundDriftStrength??C.backgroundDriftStrength,0,1,C.backgroundDriftStrength),backgroundStreaksEnabled:a.backgroundStreaksEnabled??C.backgroundStreaksEnabled},b=(0,j.useMemo)(()=>[{value:`cover-derived`,label:e(`options.monetBackgroundSourceCover`)},{value:`uploaded-global`,label:e(`options.monetBackgroundSourceUploaded`),disabled:!l&&!p}],[p,l,e]),x=(0,j.useMemo)(()=>[{value:`half-pane-gradient`,label:e(`options.monetLayoutHalfPane`)},{value:`full-overlay`,label:e(`options.monetLayoutFullOverlay`)}],[e]),S=(0,j.useMemo)(()=>[{value:`theme`,label:e(`options.monetBackgroundWashTheme`)},{value:`custom`,label:e(`options.monetBackgroundWashCustom`)}],[e]),w=async t=>{let n=Array.from(t.target.files??[]);if(t.target.value=``,v(null),!n.length||!u)return;let r=await u(n);r.ok?(c?.({backgroundSource:`uploaded-global`}),v(n[0].name)):v(r.error||e(`options.monetUploadBackground`))};return(0,M.jsxs)(`div`,{className:`rounded-[24px] border p-4 space-y-4`,style:{backgroundColor:r,borderColor:o(n.secondaryColor,.16)},children:[(0,M.jsxs)(`div`,{className:`space-y-1`,children:[(0,M.jsx)(`div`,{className:`text-sm font-medium`,style:{color:n.primaryColor},children:e(`options.monetBackgroundSettings`)}),(0,M.jsx)(`div`,{className:`text-xs opacity-70`,style:{color:n.secondaryColor},children:e(`options.monetBackgroundSettingsDesc`)})]}),(0,M.jsxs)(`div`,{className:`space-y-3.5 rounded-[18px] border border-white/5 p-3.5 bg-black/5 dark:bg-white/5`,children:[(0,M.jsx)(`div`,{className:`text-xs font-semibold uppercase tracking-wider opacity-65`,style:{color:n.accentColor},children:e(`options.monetGroupBackgroundSource`)}),(0,M.jsx)(bn,{label:e(`options.monetBackgroundSource`),value:y.backgroundSource,options:b,onChange:e=>c?.({backgroundSource:e}),isDaylight:t,theme:n}),(0,M.jsxs)(`div`,{className:`space-y-2.5`,children:[(0,M.jsx)(yn,{theme:n,children:e(`options.monetUploadBackground`)}),(0,M.jsxs)(`div`,{className:`flex flex-wrap items-center gap-2`,children:[(0,M.jsxs)(`button`,{type:`button`,onClick:()=>g.current?.click(),disabled:p||!u,className:`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-45`,style:{color:n.primaryColor,borderColor:o(n.secondaryColor,t?.18:.14),backgroundColor:o(n.backgroundColor,t?.24:.34)},children:[(0,M.jsx)(f,{size:15}),(0,M.jsx)(`span`,{children:e(`options.monetUploadBackground`)})]}),(0,M.jsxs)(`button`,{type:`button`,onClick:()=>void d?.(),disabled:!l||!d,className:`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-45`,style:{color:n.primaryColor,borderColor:o(n.secondaryColor,t?.18:.14),backgroundColor:o(n.backgroundColor,t?.24:.34)},children:[(0,M.jsx)(s,{size:15}),(0,M.jsx)(`span`,{children:e(`options.monetClearBackground`)})]})]}),(0,M.jsx)(`div`,{className:`text-xs opacity-60`,style:{color:`var(--text-secondary)`},children:_||l?.name||`-`}),(0,M.jsx)(`input`,{ref:g,type:`file`,accept:`.png,.jpg,.jpeg,.gif,.webp,.svg,image/*`,className:`hidden`,onChange:e=>void w(e)})]})]}),(0,M.jsxs)(`div`,{className:`space-y-3.5 rounded-[18px] border border-white/5 p-3.5 bg-black/5 dark:bg-white/5`,children:[(0,M.jsx)(`div`,{className:`text-xs font-semibold uppercase tracking-wider opacity-65`,style:{color:n.accentColor},children:e(`options.monetGroupLayoutPosition`)}),(0,M.jsx)(bn,{label:e(`options.monetBackgroundLayout`),value:y.backgroundLayout,options:x,onChange:e=>c?.({backgroundLayout:e}),isDaylight:t,theme:n}),y.backgroundLayout===`half-pane-gradient`&&(0,M.jsx)(H,{label:e(`options.monetHalfPaneOffsetX`),valueLabel:`${Math.round(y.backgroundHalfPaneOffsetX)}%`,min:-40,max:40,step:2,value:y.backgroundHalfPaneOffsetX,onChange:e=>c?.({backgroundHalfPaneOffsetX:e}),rangeInputClass:i,onSliderPointerDown:m,onSliderCommit:h}),(0,M.jsx)(R,{label:e(`options.monetBackgroundDriftEnabled`),description:e(`options.monetBackgroundDriftEnabledDesc`),checked:y.backgroundDriftEnabled,onChange:e=>c?.({backgroundDriftEnabled:e}),theme:n}),y.backgroundDriftEnabled&&(0,M.jsx)(H,{label:e(`options.monetBackgroundDriftStrength`),valueLabel:`${Math.round(y.backgroundDriftStrength*100)}%`,min:0,max:1,step:.05,value:y.backgroundDriftStrength,onChange:e=>c?.({backgroundDriftStrength:e}),rangeInputClass:i,onSliderPointerDown:m,onSliderCommit:h})]}),(0,M.jsxs)(`div`,{className:`space-y-3.5 rounded-[18px] border border-white/5 p-3.5 bg-black/5 dark:bg-white/5`,children:[(0,M.jsx)(`div`,{className:`text-xs font-semibold uppercase tracking-wider opacity-65`,style:{color:n.accentColor},children:e(`options.monetGroupFiltersPostProcessing`)}),(0,M.jsx)(H,{label:e(`options.monetBackgroundBlur`),valueLabel:`${Math.round(y.backgroundBlurPx)}px`,min:0,max:60,step:2,value:y.backgroundBlurPx,onChange:e=>c?.({backgroundBlurPx:e}),rangeInputClass:i,onSliderPointerDown:m,onSliderCommit:h}),(0,M.jsx)(H,{label:e(`options.monetBackgroundSaturation`),valueLabel:`${Math.round(y.backgroundSaturation*100)}%`,min:0,max:2,step:.05,value:y.backgroundSaturation,onChange:e=>c?.({backgroundSaturation:e}),rangeInputClass:i,onSliderPointerDown:m,onSliderCommit:h}),(0,M.jsx)(H,{label:e(`options.monetBackgroundGrayscale`),valueLabel:`${Math.round(y.backgroundGrayscale*100)}%`,min:0,max:1,step:.02,value:y.backgroundGrayscale,onChange:e=>c?.({backgroundGrayscale:e}),rangeInputClass:i,onSliderPointerDown:m,onSliderCommit:h})]}),(0,M.jsxs)(`div`,{className:`space-y-3.5 rounded-[18px] border border-white/5 p-3.5 bg-black/5 dark:bg-white/5`,children:[(0,M.jsx)(`div`,{className:`text-xs font-semibold uppercase tracking-wider opacity-65`,style:{color:n.accentColor},children:e(`options.monetGroupColorTintWash`)}),(0,M.jsx)(H,{label:e(`options.monetBackgroundOverlayOpacity`),valueLabel:`${Math.round(y.backgroundOverlayOpacity*100)}%`,min:0,max:1,step:.02,value:y.backgroundOverlayOpacity,onChange:e=>c?.({backgroundOverlayOpacity:e}),rangeInputClass:i,onSliderPointerDown:m,onSliderCommit:h}),(0,M.jsx)(H,{label:e(`options.monetBackgroundWash`),valueLabel:`${Math.round(y.backgroundWash*100)}%`,min:0,max:1,step:.02,value:y.backgroundWash,onChange:e=>c?.({backgroundWash:e}),rangeInputClass:i,onSliderPointerDown:m,onSliderCommit:h}),(0,M.jsx)(R,{label:e(`options.monetBackgroundStreaksEnabled`),description:e(`options.monetBackgroundStreaksEnabledDesc`),checked:y.backgroundStreaksEnabled,onChange:e=>c?.({backgroundStreaksEnabled:e}),theme:n}),(0,M.jsx)(bn,{label:e(`options.monetBackgroundWashColorMode`),value:y.backgroundWashColorMode,options:S,onChange:e=>c?.({backgroundWashColorMode:e}),isDaylight:t,theme:n}),y.backgroundWashColorMode===`custom`&&(0,M.jsxs)(`div`,{className:`space-y-3 rounded-[20px] border p-3`,style:{borderColor:o(n.secondaryColor,.14),backgroundColor:o(n.backgroundColor,.2)},children:[(0,M.jsxs)(`div`,{className:`flex items-center justify-between gap-3`,children:[(0,M.jsx)(`div`,{className:`text-sm`,style:{color:n.primaryColor},children:e(`options.monetBackgroundWashCustomColor`)}),(0,M.jsx)(`div`,{className:`rounded-full px-3 py-1 text-xs font-mono`,style:{color:n.backgroundColor,backgroundColor:y.backgroundWashCustomColor},children:y.backgroundWashCustomColor.toUpperCase()})]}),(0,M.jsx)(vn,{color:y.backgroundWashCustomColor,onChange:e=>c?.({backgroundWashCustomColor:e}),style:{width:`100%`,height:180}})]})]})]})},wn=1920,Tn=1080,En=new Map,Dn={r:10,g:10,b:12},On={r:245,g:245,b:245},U=(e,t,n)=>Math.min(n,Math.max(t,e)),W=(e,t,n)=>e+(t-e)*n,kn=(e,t,n)=>.2126*e+.7152*t+.0722*n,An=(e,t)=>kn(e.r,e.g,e.b)<=kn(t.r,t.g,t.b)?{shadow:e,highlight:t}:{shadow:t,highlight:e},jn=({coverUrl:e,monetBackgroundImage:t,tuning:n})=>n.backgroundSource===`uploaded-global`?t?.url??e??null:e??t?.url??null,Mn=async e=>{let t=new Image;(e.startsWith(`http://`)||e.startsWith(`https://`))&&(t.crossOrigin=`anonymous`),t.decoding=`async`;let n=new Promise((n,r)=>{t.onload=()=>n(),t.onerror=()=>r(Error(`Failed to load image: ${e}`))});t.src=e;try{await t.decode()}catch{await n}return t},Nn=(e,t,n)=>{let r=e[t];return typeof r==`number`&&Number.isFinite(r)?r:n},Pn=(e,t,n,r)=>{let i=Nn(t,`width`,n),a=Nn(t,`height`,r);if(!i||!a)return;let o=Math.max(n/i,r/a),s=i*o,c=a*o,l=(n-s)/2,u=(r-c)/2;e.drawImage(t,l,u,s,c)},Fn=(e,t)=>{let n=r(e);return n?{r:U(n.r,0,255),g:U(n.g,0,255),b:U(n.b,0,255)}:t},In=(e,t,n,r)=>{let{shadow:i,highlight:a}=An(t,r);if(e<=.55){let t=e/.55;return{r:W(i.r,n.r,t),g:W(i.g,n.g,t),b:W(i.b,n.b,t)}}let o=(e-.55)/.45;return{r:W(n.r,a.r,o),g:W(n.g,a.g,o),b:W(n.b,a.b,o)}},Ln=(e,t,n,r,i)=>{let a=U(i.backgroundGrayscale,0,1),o=U(i.backgroundSaturation,0,2),s=U(i.backgroundWash,0,1);if(a<=0&&Math.abs(o-1)<.001&&s<=0)return;let c=e.getImageData(0,0,t,n),l=c.data,u=Fn(r.backgroundColor,Dn),d=Fn(r.accentColor,u),f=Fn(r.primaryColor,On),p=Fn(i.backgroundWashCustomColor,d),m=i.backgroundWashColorMode===`custom`?p:d;for(let e=0;e<l.length;e+=4){let t=l[e],n=l[e+1],r=l[e+2];if(l[e+3]===0)continue;let i=kn(t,n,r);if(a>0&&(t=W(t,i,a),n=W(n,i,a),r=W(r,i,a)),Math.abs(o-1)>=.001){let e=kn(t,n,r);t=e+(t-e)*o,n=e+(n-e)*o,r=e+(r-e)*o}if(s>0){let e=In(U(i/255,0,1),u,m,f);t=W(t,e.r,s),n=W(n,e.g,s),r=W(r,e.b,s)}l[e]=Math.round(U(t,0,255)),l[e+1]=Math.round(U(n,0,255)),l[e+2]=Math.round(U(r,0,255))}e.putImageData(c,0,0)},Rn=(e,t,n,r,i)=>{let a=U(i.backgroundOverlayOpacity,0,1),s=e.createLinearGradient(0,0,t,n);s.addColorStop(0,o(r.accentColor,.08+a*.62)),s.addColorStop(.44,o(r.backgroundColor,.16+a*.58)),s.addColorStop(1,o(r.primaryColor,.06+a*.36)),e.fillStyle=s,e.fillRect(0,0,t,n);let c=e.createRadialGradient(t*.18,n*.34,0,t*.18,n*.34,t*.55);c.addColorStop(0,o(r.accentColor,a*.42)),c.addColorStop(1,o(r.backgroundColor,0)),e.fillStyle=c,e.fillRect(0,0,t,n);let l=e.createLinearGradient(t*.45,0,t,0);if(l.addColorStop(0,o(r.backgroundColor,0)),l.addColorStop(1,o(r.backgroundColor,.18+a*.38)),e.fillStyle=l,e.fillRect(0,0,t,n),i.backgroundStreaksEnabled!==!1){e.fillStyle=o(r.backgroundColor,.1+a*.08);for(let r=0;r<18;r+=1){let i=r*127%t,a=r*211%n-40;e.fillRect(i,a,1,n*.28)}}},zn=({coverUrl:e,monetBackgroundImage:t,theme:n,tuning:r})=>JSON.stringify({sourceUrl:jn({coverUrl:e,monetBackgroundImage:t,tuning:r}),uploadedId:r.backgroundSource===`uploaded-global`?t?.id??null:null,theme:{backgroundColor:n.backgroundColor,primaryColor:n.primaryColor,accentColor:n.accentColor},tuning:{backgroundSource:r.backgroundSource,backgroundBlurPx:r.backgroundBlurPx,backgroundOverlayOpacity:r.backgroundOverlayOpacity,backgroundGrayscale:r.backgroundGrayscale,backgroundSaturation:r.backgroundSaturation,backgroundWash:r.backgroundWash,backgroundWashColorMode:r.backgroundWashColorMode,backgroundWashCustomColor:r.backgroundWashCustomColor,backgroundStreaksEnabled:r.backgroundStreaksEnabled}}),Bn=null,Vn=()=>{if(Bn!==null)return Bn;if(typeof document>`u`)return!1;try{let e=document.createElement(`canvas`);e.width=2,e.height=2;let t=e.getContext(`2d`);return!t||typeof t.filter!=`string`?(Bn=!1,!1):(t.fillStyle=`#000000`,t.fillRect(0,0,2,2),t.filter=`blur(1px)`,t.fillStyle=`#ffffff`,t.fillRect(0,0,1,1),Bn=t.getImageData(1,1,1,1).data[0]>0,Bn)}catch{return Bn=!1,!1}},Hn=async({coverUrl:e,monetBackgroundImage:t,theme:n,tuning:r})=>{let i=jn({coverUrl:e,monetBackgroundImage:t,tuning:r});if(!i)return null;let a=await Mn(i),o=document.createElement(`canvas`);o.width=wn,o.height=Tn;let s=o.getContext(`2d`);return s?(s.fillStyle=n.backgroundColor,s.fillRect(0,0,o.width,o.height),s.save(),Vn()&&(s.filter=`blur(${U(r.backgroundBlurPx,0,60)}px)`),Pn(s,a,o.width,o.height),s.restore(),Ln(s,o.width,o.height,n,r),Rn(s,o.width,o.height,n,r),o.toDataURL(`image/jpeg`,.92)):null},Un=e=>{let t=zn(e),n=En.get(t);if(n)return n;let r=Hn(e).catch(()=>null);return En.set(t,r),r},Wn=240,Gn=76,Kn=156,qn=3.4,Jn=.035,Yn=.01,Xn=12.9898,Zn=78.233,Qn=39.425,$n=(e,t)=>(e%t+t)%t,er=(e,t)=>{let n=Math.sin(e*127.1+t*311.7)*43758.5453;return n-Math.floor(n)},tr=e=>e*e*(3-2*e),nr=(e,t,n)=>{let r=Math.floor(e),i=er($n(r,t),n);return i+(er($n(r+1,t),n)-i)*tr(e-r)},rr=(e,t)=>{let n=nr(e,Gn,t),r=nr(e*2,152,t+17.31);return(n*.68+r*.32)*2-1},ir=e=>{let t=e.reduce((e,t)=>Math.max(e,Math.abs(t)),0);return t>0?e.map(e=>e/t):e},ar=e=>{let t=Math.min(1,Math.max(0,e)),n=qn*t,r=1+n/100*2+Yn,i=Jn*t,a=[],o=[],s=[];for(let e=0;e<=Kn;e+=1){let t=Gn*e/Kn;a.push(rr(t,Xn)),o.push(rr(t,Zn)),s.push(rr(t,Qn))}let c=ir(a),l=ir(o),u=ir(s);return{keyframes:c.map((e,t)=>({transform:`translate3d(${(e*n).toFixed(4)}%, ${(l[t]*n).toFixed(4)}%, 0) scale(${(r+i*((u[t]+1)/2)).toFixed(5)})`})),durationMs:Wn*1e3,maxTravelPercent:n,minScale:r}},or=e=>x(t=>S(t,e)),sr=180,cr=(e,t,n)=>Math.min(n,Math.max(t,e)),lr=(e,t,n,r)=>{(0,j.useEffect)(()=>{let i=e.current;if(!i||!t||n<=0||typeof i.animate!=`function`||r)return;let a=ar(n),o=i.animate(a.keyframes,{duration:a.durationMs,iterations:1/0,easing:`linear`});return()=>o.cancel()},[t,e,n,r])},ur=(e,t,n)=>n.backgroundSource===`uploaded-global`?t?.url??e??null:e??t?.url??null,dr=({coverUrl:e,monetBackgroundImage:t,theme:n,isDaylight:r=!1,tuning:i=C,transparentBackground:a=!1,staticMode:s=!1})=>{let[c,l]=(0,j.useState)(null),u=ur(e,t,i),d=(0,j.useMemo)(()=>`linear-gradient(135deg, ${o(n.accentColor,.22)}, ${o(n.backgroundColor,.96)} 50%, ${o(n.primaryColor,.18)})`,[n]),f=(0,j.useMemo)(()=>`linear-gradient(90deg, ${o(n.backgroundColor,.18)} 0%, ${o(n.backgroundColor,.32)} 34%, ${o(n.backgroundColor,.66)} 70%, ${o(n.backgroundColor,.82)} 100%)`,[n]),p=(0,j.useMemo)(()=>zn({coverUrl:e,monetBackgroundImage:t,theme:n,tuning:i}),[e,t,n,i]);(0,j.useEffect)(()=>{let r=!1,o;return!u||a?(l(null),()=>{r=!0}):(o=window.setTimeout(()=>{Un({coverUrl:e,monetBackgroundImage:t,theme:n,tuning:i}).then(e=>{r||l(t=>t===e?t:e)})},sr),()=>{r=!0,o!==void 0&&window.clearTimeout(o)})},[p,u,a]);let m=(0,j.useRef)(null),h=cr(i.backgroundDriftStrength??0,0,1),g=!!i.backgroundDriftEnabled&&!s&&h>0;lr(m,g,h,or(`monetBackground`));let _=(0,j.useMemo)(()=>g?{willChange:`transform`}:void 0,[g]),v=(0,j.useMemo)(()=>Vn(),[])?0:i.backgroundBlurPx,y=(0,j.useMemo)(()=>v<=0?{}:{filter:`blur(${v}px)`,WebkitFilter:`blur(${v}px)`,transform:`scale(1.1) translateZ(0)`},[v]);if(a)return null;let b=c?`url(${c})`:u?`linear-gradient(135deg, ${o(n.accentColor,.2)}, ${o(n.backgroundColor,.78)}), url(${u})`:d;if(i.backgroundLayout===`full-overlay`)return(0,M.jsxs)(`div`,{className:`absolute inset-0 z-0 overflow-hidden`,children:[(0,M.jsx)(`div`,{ref:m,className:`absolute inset-0`,style:_,children:(0,M.jsx)(ue,{initial:!1,children:(0,M.jsx)(O.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},transition:{duration:.8,ease:`easeInOut`},className:`absolute inset-0`,style:{backgroundColor:n.backgroundColor,backgroundImage:b,backgroundSize:`cover`,backgroundPosition:`center`,...y}},c||u||`fallback`)})}),(0,M.jsx)(`div`,{className:`absolute inset-0`,style:{background:f}})]});let x=(r?.7:.3)+cr(i.backgroundOverlayOpacity,0,1)*.16,S=cr(50+i.backgroundHalfPaneOffsetX,10,90);return(0,M.jsxs)(`div`,{className:`absolute inset-0 z-0 overflow-hidden`,children:[(0,M.jsx)(`div`,{className:`absolute inset-0`,style:{backgroundColor:n.backgroundColor,backgroundImage:d}}),(0,M.jsx)(ue,{initial:!1,children:c||u?(0,M.jsx)(`div`,{className:`absolute inset-y-0 left-0 w-[72%] sm:w-[68%] lg:w-[60%] overflow-hidden`,style:{WebkitMaskImage:`linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.94) 48%, rgba(0,0,0,0.46) 74%, rgba(0,0,0,0) 100%)`,maskImage:`linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.94) 48%, rgba(0,0,0,0.46) 74%, rgba(0,0,0,0) 100%)`},children:(0,M.jsx)(`div`,{ref:m,className:`absolute inset-0`,style:_,children:(0,M.jsx)(O.div,{initial:{opacity:0},animate:{opacity:x},exit:{opacity:0},transition:{duration:.8,ease:`easeInOut`},className:`absolute inset-0`,style:{backgroundImage:b,backgroundRepeat:`no-repeat`,backgroundSize:`cover`,backgroundPosition:`${S}% center`,...y}},c||u||`fallback`)})}):null}),(0,M.jsx)(`div`,{className:`absolute inset-0`,style:{background:`linear-gradient(90deg, ${o(n.backgroundColor,.14)} 0%, ${o(n.backgroundColor,.28)} 28%, ${o(n.backgroundColor,.62)} 64%, ${o(n.backgroundColor,.86)} 100%)`}}),(0,M.jsx)(`div`,{className:`absolute inset-0`,style:{backgroundImage:`radial-gradient(circle at 18% 34%, ${o(n.accentColor,.18)}, transparent 36%)`,backgroundSize:`cover`,backgroundPosition:`center`}}),(0,M.jsx)(`div`,{className:`absolute inset-0`,style:{background:f}})]})},fr=e({default:()=>pr}),pr=Ke({mode:`monet`,order:20,labelKey:`options.visualizerBackgroundModeMonet`,labelFallback:`Monet`,render:({config:e,coverUrl:t,theme:n,isDaylight:r,staticMode:i})=>(0,M.jsx)(dr,{coverUrl:t,monetBackgroundImage:e?.customImage,theme:n,isDaylight:r,tuning:e?.monet?.tuning,transparentBackground:e?.transparent,staticMode:i}),renderSettingsPanel:({config:e,actions:t,t:n,isDaylight:r,theme:i,controlCardBg:a,rangeInputClass:o,onSliderPointerDown:s,onSliderCommit:c})=>(0,M.jsx)(Cn,{t:n,isDaylight:r,theme:i,controlCardBg:a,rangeInputClass:o,tuning:e?.monet?.tuning??C,onTuningChange:t?.monet?.onTuningChange,monetBackgroundImage:e?.customImage,onUploadMonetBackgroundImage:t?.customImage?.onUpload,onClearMonetBackgroundImage:t?.customImage?.onClear,isLoadingMonetBackgroundImage:t?.customImage?.isLoading,onSliderPointerDown:s,onSliderCommit:c}),renderQuickControls:({config:e,actions:t,t:n,isDaylight:r})=>{let i=(e?.monet?.tuning??C).backgroundLayout===`full-overlay`,a=n(i?`options.monetLayoutFullOverlay`:`options.monetLayoutHalfPane`);return(0,M.jsx)(qe,{isDaylight:r,label:a,title:`${n(`options.monetBackgroundLayout`)}: ${a}`,onClick:()=>t?.monet?.onTuningChange?.({backgroundLayout:i?`half-pane-gradient`:`full-overlay`})})},resetSettings:e=>e?.monet?.onResetTuning?.()}),mr=1.8,hr=.01,gr=16/9,_r={fiberSize:.2,crumples:.35,crumpleSize:.35,folds:.65,foldCount:5,drops:.2,seed:5.8},vr={perspective:.4,count:20,focusCenter:.55,focusEdges:.8,swirl:.08,lensCircle:.1},yr=e=>Math.min(1,Math.max(0,e)),br=e=>Math.min(mr,Math.max(1,e)),xr=e=>e<=1?1:br(e+hr),Sr=e=>xr(1/(1-2*Math.min(Math.max(e,0),.45))),Cr=(e,t,n)=>n&&!t?!e:e,wr=(e,t,n)=>Cr(!e,t,n),Tr=(e,t)=>{let{folds:n,crumples:r,drops:i}=_r;return Sr(.02*(2*n+1.5*r+.2*i+.75*yr(e)+.1*yr(t)))},Er=(e,t)=>{let n=.5*Math.hypot(gr,1),r=yr(t),i=.7*r**(1.3+2.7*r)*(1-vr.focusEdges),a=Math.max(.35,1-i/n);if(e<=0)return xr(1/a);let o=Math.min(e,1)*1.4,s=e=>{let t=2*n/e;return Math.tan(t*o)/Math.tan(o)/t},c=Math.max(1,2*n*o/1.45);if(c>=mr||s(mr)>mr*a)return mr;if(c===1&&s(1)<=a)return xr(1/a);let l=mr;for(let e=0;e<32;e+=1){let e=(c+l)/2;s(e)>e*a?c=e:l=e}return xr(l)},Dr=j.memo(({coverUrl:e,monetBackgroundImage:t,tuning:n,theme:r,isDaylight:i})=>{let a={...T,...n},o=a.imageSource===`uploaded-global`?t?.url??e:e??t?.url;return o?(0,M.jsxs)(`div`,{className:`absolute inset-0 z-0 overflow-hidden`,style:{backgroundColor:r.backgroundColor,pointerEvents:`none`},children:[(()=>{let e={width:`100%`,height:`100%`,image:o,fit:`cover`,minPixelRatio:1,maxPixelCount:2073600,style:{width:`100%`,height:`100%`}};switch(a.effect){case`fluted-glass`:return(0,M.jsx)(He,{...e,colorBack:r.backgroundColor,colorShadow:r.secondaryColor,colorHighlight:r.primaryColor,shadows:.25,size:a.flutedGlassSize,distortion:a.flutedGlassDistortion,blur:a.flutedGlassBlur,shape:`lines`,distortionShape:`prism`,highlights:.1,edges:.25},`${o}:fluted-glass`);case`paper-texture`:return(0,M.jsx)(Ve,{...e,..._r,colorFront:r.accentColor,colorBack:r.backgroundColor,contrast:a.paperTextureContrast,roughness:a.paperTextureRoughness,fiber:a.paperTextureFiber,scale:Tr(a.paperTextureRoughness,a.paperTextureFiber)},`${o}:paper-texture`);case`halftone-dots`:return(0,M.jsx)(Ge,{...e,colorBack:r.backgroundColor,colorFront:r.accentColor,size:a.halftoneDotsSize,radius:a.halftoneDotsRadius,contrast:a.halftoneDotsContrast,originalColors:a.halftoneDotsOriginalColors,inverted:wr(a.halftoneDotsInverted,a.halftoneDotsOriginalColors,i),grid:`hex`,type:`gooey`,grainMixer:.12,grainOverlay:.06,grainSize:.5},`${o}:halftone-dots`);case`lens-distortion`:return(0,M.jsx)(We,{...e,...vr,spread:a.lensDistortionSpread,dispersion:a.lensDistortionDispersion,lensBulge:a.lensDistortionBulge,scale:Er(a.lensDistortionBulge,a.lensDistortionSpread)},`${o}:lens-distortion`);default:return(0,M.jsx)(Ue,{...e,colorBack:r.backgroundColor,colorFront:r.accentColor,colorHighlight:r.primaryColor,originalColors:a.originalColors,inverted:Cr(a.inverted,a.originalColors,i),type:a.ditheringType,size:a.size,colorSteps:a.colorSteps},`${o}:dithering`)}})(),a.overlayEnabled&&a.overlayOpacity>0&&(0,M.jsx)(`div`,{className:`absolute inset-0`,style:{backgroundColor:r.backgroundColor,opacity:a.overlayOpacity}})]}):(0,M.jsx)(`div`,{className:`absolute inset-0 z-0`,style:{backgroundColor:r.backgroundColor}})}),Or=e=>e.toFixed(2),G=e=>`${Math.round(e*100)}%`,kr=(e,t)=>({borderColor:o(e.secondaryColor,t?.18:.16),selectedBg:o(e.accentColor,t?.1:.16)}),K=({label:e,value:t,min:n,max:r,step:i,rangeInputClass:a,theme:o,onChange:s,onPointerDown:c,onPointerUp:l,format:u=Or})=>(0,M.jsxs)(`label`,{className:`block space-y-2`,children:[(0,M.jsxs)(`span`,{className:`flex justify-between gap-3 text-sm`,style:{color:o.primaryColor},children:[(0,M.jsx)(`span`,{children:e}),(0,M.jsx)(`span`,{className:`font-mono opacity-70`,children:u(t)})]}),(0,M.jsx)(`input`,{type:`range`,min:n,max:r,step:i,value:t,onChange:e=>s(Number(e.target.value)),onPointerDown:c,onPointerUp:l,onPointerCancel:l,className:a})]}),Ar=[`2x2`,`4x4`,`8x8`],jr=({t:e,isDaylight:t,theme:n,rangeInputClass:r,tuning:i,onTuningChange:a,onSliderPointerDown:o,onSliderCommit:s})=>{let{borderColor:c,selectedBg:l}=kr(n,t),u={rangeInputClass:r,theme:n,onPointerDown:o,onPointerUp:s};return(0,M.jsxs)(`div`,{className:`space-y-4 rounded-2xl border p-3`,style:{borderColor:c},children:[(0,M.jsx)(`div`,{className:`text-xs font-medium uppercase tracking-[0.2em]`,style:{color:n.secondaryColor},children:e(`options.nomandBackgroundEffectDithering`)}),(0,M.jsxs)(`div`,{className:`space-y-2`,children:[(0,M.jsx)(`div`,{className:`text-sm`,style:{color:n.primaryColor},children:e(`options.nomandBackgroundDitheringType`)}),(0,M.jsx)(`div`,{className:`grid grid-cols-3 gap-2`,children:Ar.map(e=>(0,M.jsx)(`button`,{type:`button`,onClick:()=>a?.({ditheringType:e}),className:`rounded-xl border px-2 py-2 text-xs`,style:{borderColor:i.ditheringType===e?n.accentColor:c,backgroundColor:i.ditheringType===e?l:`transparent`,color:n.primaryColor},children:e},e))})]}),(0,M.jsx)(K,{...u,label:e(`options.nomandBackgroundSize`),value:i.size,min:.5,max:20,step:.5,format:e=>e.toFixed(1),onChange:e=>a?.({size:e})}),(0,M.jsx)(K,{...u,label:e(`options.nomandBackgroundColorSteps`),value:i.colorSteps,min:1,max:7,step:1,format:e=>String(Math.round(e)),onChange:e=>a?.({colorSteps:e})}),(0,M.jsx)(R,{label:e(`options.nomandBackgroundOriginalColors`),checked:i.originalColors,onChange:e=>a?.({originalColors:e}),theme:n}),(0,M.jsx)(R,{label:e(`options.nomandBackgroundInverted`),checked:i.inverted,onChange:e=>a?.({inverted:e}),theme:n})]})},Mr=({t:e,isDaylight:t,theme:n,rangeInputClass:r,tuning:i,onTuningChange:a,onSliderPointerDown:o,onSliderCommit:s})=>{let{borderColor:c}=kr(n,t),l={rangeInputClass:r,theme:n,onPointerDown:o,onPointerUp:s};return(0,M.jsxs)(`div`,{className:`space-y-4 rounded-2xl border p-3`,style:{borderColor:c},children:[(0,M.jsx)(`div`,{className:`text-xs font-medium uppercase tracking-[0.2em]`,style:{color:n.secondaryColor},children:e(`options.nomandBackgroundEffectFlutedGlass`)}),(0,M.jsx)(K,{...l,label:e(`options.nomandBackgroundFlutedGlassSize`),value:i.flutedGlassSize,min:.1,max:1,step:.05,onChange:e=>a?.({flutedGlassSize:e})}),(0,M.jsx)(K,{...l,label:e(`options.nomandBackgroundFlutedGlassDistortion`),value:i.flutedGlassDistortion,min:0,max:1,step:.05,format:G,onChange:e=>a?.({flutedGlassDistortion:e})}),(0,M.jsx)(K,{...l,label:e(`options.nomandBackgroundFlutedGlassBlur`),value:i.flutedGlassBlur,min:0,max:1,step:.05,format:G,onChange:e=>a?.({flutedGlassBlur:e})})]})},Nr=({t:e,isDaylight:t,theme:n,rangeInputClass:r,tuning:i,onTuningChange:a,onSliderPointerDown:o,onSliderCommit:s})=>{let{borderColor:c}=kr(n,t),l={rangeInputClass:r,theme:n,onPointerDown:o,onPointerUp:s};return(0,M.jsxs)(`div`,{className:`space-y-4 rounded-2xl border p-3`,style:{borderColor:c},children:[(0,M.jsx)(`div`,{className:`text-xs font-medium uppercase tracking-[0.2em]`,style:{color:n.secondaryColor},children:e(`options.nomandBackgroundEffectHalftoneDots`)}),(0,M.jsx)(K,{...l,label:e(`options.nomandBackgroundHalftoneDotsSize`),value:i.halftoneDotsSize,min:.1,max:1,step:.05,onChange:e=>a?.({halftoneDotsSize:e})}),(0,M.jsx)(K,{...l,label:e(`options.nomandBackgroundHalftoneDotsRadius`),value:i.halftoneDotsRadius,min:.1,max:2,step:.05,onChange:e=>a?.({halftoneDotsRadius:e})}),(0,M.jsx)(K,{...l,label:e(`options.nomandBackgroundHalftoneDotsContrast`),value:i.halftoneDotsContrast,min:0,max:1,step:.05,format:G,onChange:e=>a?.({halftoneDotsContrast:e})}),(0,M.jsx)(R,{label:e(`options.nomandBackgroundOriginalColors`),checked:i.halftoneDotsOriginalColors,onChange:e=>a?.({halftoneDotsOriginalColors:e}),theme:n}),(0,M.jsx)(R,{label:e(`options.nomandBackgroundInverted`),checked:i.halftoneDotsInverted,onChange:e=>a?.({halftoneDotsInverted:e}),theme:n})]})},Pr=({t:e,isDaylight:t,theme:n,rangeInputClass:r,tuning:i,onTuningChange:a,onSliderPointerDown:o,onSliderCommit:s})=>{let{borderColor:c}=kr(n,t),l={rangeInputClass:r,theme:n,onPointerDown:o,onPointerUp:s};return(0,M.jsxs)(`div`,{className:`space-y-4 rounded-2xl border p-3`,style:{borderColor:c},children:[(0,M.jsx)(`div`,{className:`text-xs font-medium uppercase tracking-[0.2em]`,style:{color:n.secondaryColor},children:e(`options.nomandBackgroundEffectLensDistortion`)}),(0,M.jsx)(K,{...l,label:e(`options.nomandBackgroundLensDistortionSpread`),value:i.lensDistortionSpread,min:0,max:1,step:.05,format:G,onChange:e=>a?.({lensDistortionSpread:e})}),(0,M.jsx)(K,{...l,label:e(`options.nomandBackgroundLensDistortionBulge`),value:i.lensDistortionBulge,min:-1,max:1,step:.05,onChange:e=>a?.({lensDistortionBulge:e})}),(0,M.jsx)(K,{...l,label:e(`options.nomandBackgroundLensDistortionDispersion`),value:i.lensDistortionDispersion,min:0,max:1,step:.05,format:G,onChange:e=>a?.({lensDistortionDispersion:e})})]})},Fr=({t:e,isDaylight:t,theme:n,rangeInputClass:r,tuning:i,onTuningChange:a,onSliderPointerDown:o,onSliderCommit:s})=>{let{borderColor:c}=kr(n,t),l={rangeInputClass:r,theme:n,onPointerDown:o,onPointerUp:s};return(0,M.jsxs)(`div`,{className:`space-y-4 rounded-2xl border p-3`,style:{borderColor:c},children:[(0,M.jsx)(`div`,{className:`text-xs font-medium uppercase tracking-[0.2em]`,style:{color:n.secondaryColor},children:e(`options.nomandBackgroundEffectPaperTexture`)}),(0,M.jsx)(K,{...l,label:e(`options.nomandBackgroundPaperTextureContrast`),value:i.paperTextureContrast,min:0,max:1,step:.05,format:G,onChange:e=>a?.({paperTextureContrast:e})}),(0,M.jsx)(K,{...l,label:e(`options.nomandBackgroundPaperTextureRoughness`),value:i.paperTextureRoughness,min:0,max:1,step:.05,format:G,onChange:e=>a?.({paperTextureRoughness:e})}),(0,M.jsx)(K,{...l,label:e(`options.nomandBackgroundPaperTextureFiber`),value:i.paperTextureFiber,min:0,max:1,step:.05,format:G,onChange:e=>a?.({paperTextureFiber:e})})]})},Ir=[`dithering`,`fluted-glass`,`paper-texture`,`halftone-dots`,`lens-distortion`],Lr={dithering:`options.nomandBackgroundEffectDithering`,"fluted-glass":`options.nomandBackgroundEffectFlutedGlass`,"paper-texture":`options.nomandBackgroundEffectPaperTexture`,"halftone-dots":`options.nomandBackgroundEffectHalftoneDots`,"lens-distortion":`options.nomandBackgroundEffectLensDistortion`},Rr=e=>{let{t,isDaylight:n,theme:r,tuning:i}=e,{borderColor:a,selectedBg:o}=kr(r,n);return(0,M.jsxs)(`div`,{className:`space-y-4`,children:[(0,M.jsxs)(`div`,{className:`space-y-2`,children:[(0,M.jsx)(`div`,{className:`text-sm`,style:{color:r.primaryColor},children:t(`options.nomandBackgroundEffect`)}),(0,M.jsx)(`div`,{className:`grid grid-cols-2 gap-2 sm:grid-cols-3`,children:Ir.map(n=>(0,M.jsx)(`button`,{type:`button`,onClick:()=>e.onTuningChange?.({effect:n}),className:`rounded-xl border px-2 py-2 text-xs`,style:{borderColor:i.effect===n?r.accentColor:a,backgroundColor:i.effect===n?o:`transparent`,color:r.primaryColor},children:t(Lr[n])},n))})]}),i.effect===`dithering`&&(0,M.jsx)(jr,{...e}),i.effect===`fluted-glass`&&(0,M.jsx)(Mr,{...e}),i.effect===`paper-texture`&&(0,M.jsx)(Fr,{...e}),i.effect===`halftone-dots`&&(0,M.jsx)(Nr,{...e}),i.effect===`lens-distortion`&&(0,M.jsx)(Pr,{...e})]})},zr=({t:e,isDaylight:t,theme:n,controlCardBg:r,rangeInputClass:i,tuning:a,onTuningChange:c,monetBackgroundImage:l,onUploadMonetBackgroundImage:u,onClearMonetBackgroundImage:d,isLoadingMonetBackgroundImage:f=!1,onSliderPointerDown:p,onSliderCommit:h})=>{let g={...T,...a},_=(0,j.useRef)(null),[v,y]=(0,j.useState)(``),b=o(n.secondaryColor,t?.18:.16),x=o(n.accentColor,t?.1:.16),S=e=>{c?.({imageSource:e})},C=async t=>{if(!t.length||!u)return;let n=await u(t);y(n.ok?e(`options.nomandBackgroundUploadSuccess`):n.error??e(`options.nomandBackgroundUploadFailed`)),n.ok&&S(`uploaded-global`)};return(0,M.jsxs)(`div`,{className:`rounded-[24px] border p-4 space-y-4`,style:{backgroundColor:r,borderColor:b},children:[(0,M.jsxs)(`div`,{className:`space-y-1`,children:[(0,M.jsx)(`div`,{className:`text-sm font-medium`,style:{color:n.primaryColor},children:e(`options.nomandBackgroundSettings`)}),(0,M.jsx)(`div`,{className:`text-xs opacity-70`,style:{color:n.secondaryColor},children:e(`options.nomandBackgroundSettingsDesc`)})]}),(0,M.jsxs)(`div`,{className:`space-y-2`,children:[(0,M.jsx)(`div`,{className:`text-sm`,style:{color:n.primaryColor},children:e(`options.nomandBackgroundSource`)}),(0,M.jsx)(`div`,{className:`grid grid-cols-2 gap-2`,children:[[`cover-derived`,e(`options.monetBackgroundSourceCover`)],[`uploaded-global`,e(`options.monetBackgroundSourceUploaded`)]].map(([e,t])=>(0,M.jsx)(`button`,{type:`button`,disabled:e===`uploaded-global`&&!l&&!f,onClick:()=>S(e),className:`rounded-2xl border px-3 py-2 text-sm disabled:opacity-40`,style:{borderColor:g.imageSource===e?n.accentColor:b,backgroundColor:g.imageSource===e?x:`transparent`,color:n.primaryColor},children:t},e))}),(0,M.jsxs)(`div`,{className:`flex flex-wrap gap-2`,children:[(0,M.jsx)(`input`,{ref:_,type:`file`,accept:`image/png,image/jpeg,image/webp,image/gif`,className:`hidden`,onChange:e=>{C(Array.from(e.target.files??[])),e.target.value=``}}),(0,M.jsxs)(`button`,{type:`button`,disabled:f||!u,onClick:()=>_.current?.click(),className:`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs disabled:opacity-40`,style:{borderColor:b,color:n.primaryColor},children:[(0,M.jsx)(m,{size:14}),e(`options.monetUploadBackground`)]}),(0,M.jsxs)(`button`,{type:`button`,disabled:!l||!d,onClick:()=>void d?.(),className:`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs disabled:opacity-40`,style:{borderColor:b,color:n.secondaryColor},children:[(0,M.jsx)(s,{size:14}),e(`options.monetClearBackground`)]})]}),(0,M.jsx)(`div`,{className:`truncate text-xs opacity-60`,style:{color:n.secondaryColor},children:v||l?.name||`-`})]}),(0,M.jsx)(Rr,{t:e,isDaylight:t,theme:n,rangeInputClass:i,tuning:g,onTuningChange:c,onSliderPointerDown:p,onSliderCommit:h}),(0,M.jsxs)(`div`,{className:`space-y-3 rounded-2xl border p-3`,style:{borderColor:b},children:[(0,M.jsx)(R,{label:e(`options.nomandBackgroundOverlay`),description:e(`options.nomandBackgroundOverlayDesc`),checked:g.overlayEnabled,onChange:e=>c?.({overlayEnabled:e}),theme:n}),(0,M.jsxs)(`label`,{className:`block space-y-2 ${g.overlayEnabled?``:`opacity-45`}`,children:[(0,M.jsxs)(`span`,{className:`flex justify-between text-sm`,style:{color:n.primaryColor},children:[(0,M.jsx)(`span`,{children:e(`options.nomandBackgroundOverlayOpacity`)}),(0,M.jsxs)(`span`,{className:`font-mono opacity-70`,children:[Math.round(g.overlayOpacity*100),`%`]})]}),(0,M.jsx)(`input`,{type:`range`,min:`0`,max:`1`,step:`0.05`,value:g.overlayOpacity,disabled:!g.overlayEnabled,onChange:e=>c?.({overlayOpacity:Number(e.target.value)}),onPointerDown:p,onPointerUp:h,className:i})]})]})]})},Br=e({default:()=>Vr}),Vr=Ke({mode:`nomand`,order:30,labelKey:`options.visualizerBackgroundModeNomand`,labelFallback:`Nomand`,render:({config:e,coverUrl:t,theme:n,isDaylight:r})=>(0,M.jsx)(Dr,{coverUrl:t,monetBackgroundImage:e?.customImage,tuning:e?.nomand?.tuning,theme:n,isDaylight:r}),renderSettingsPanel:({config:e,actions:t,...n})=>(0,M.jsx)(zr,{...n,tuning:e?.nomand?.tuning??T,onTuningChange:t?.nomand?.onTuningChange,monetBackgroundImage:e?.customImage,onUploadMonetBackgroundImage:t?.customImage?.onUpload,onClearMonetBackgroundImage:t?.customImage?.onClear,isLoadingMonetBackgroundImage:t?.customImage?.isLoading}),renderQuickControls:({config:e,actions:t,t:n,theme:r})=>{let i=e?.nomand?.tuning??T;return(0,M.jsx)(Je,{active:i.overlayEnabled,theme:r,label:n(`options.nomandBackgroundOverlay`),onToggle:()=>t?.nomand?.onTuningChange?.({overlayEnabled:!i.overlayEnabled}),children:(0,M.jsx)(c,{size:14})})},resetSettings:e=>e?.nomand?.onResetTuning?.()}),Hr=5120,Ur=5121,Wr=5122,Gr=5123,Kr=5124,qr=5125,Jr=5126,Yr=32819,Xr=32820,Zr=33635,Qr=5131,$r=33640,ei=35899,ti=35902,ni=36269,ri=34042,ii={};{let e=ii;e[Hr]=Int8Array,e[Ur]=Uint8Array,e[Wr]=Int16Array,e[Gr]=Uint16Array,e[Kr]=Int32Array,e[qr]=Uint32Array,e[Jr]=Float32Array,e[Yr]=Uint16Array,e[Xr]=Uint16Array,e[Zr]=Uint16Array,e[Qr]=Uint16Array,e[$r]=Uint32Array,e[ei]=Uint32Array,e[ti]=Uint32Array,e[ni]=Uint32Array,e[ri]=Uint32Array}function ai(e){if(e instanceof Int8Array)return Hr;if(e instanceof Uint8Array||e instanceof Uint8ClampedArray)return Ur;if(e instanceof Int16Array)return Wr;if(e instanceof Uint16Array)return Gr;if(e instanceof Int32Array)return Kr;if(e instanceof Uint32Array)return qr;if(e instanceof Float32Array)return Jr;throw Error(`unsupported typed array type`)}function oi(e){if(e===Int8Array)return Hr;if(e===Uint8Array||e===Uint8ClampedArray)return Ur;if(e===Int16Array)return Wr;if(e===Uint16Array)return Gr;if(e===Int32Array)return Kr;if(e===Uint32Array)return qr;if(e===Float32Array)return Jr;throw Error(`unsupported typed array type`)}function si(e){let t=ii[e];if(!t)throw Error(`unknown gl type`);return t}var ci=typeof SharedArrayBuffer<`u`?function(e){return e&&e.buffer&&(e.buffer instanceof ArrayBuffer||e.buffer instanceof SharedArrayBuffer)}:function(e){return e&&e.buffer&&e.buffer instanceof ArrayBuffer};function li(...e){console.error(...e)}function ui(...e){console.warn(...e)}var di=new Map;function fi(e,t){if(!e||typeof e!=`object`)return!1;let n=di.get(t);n||(n=new WeakMap,di.set(t,n));let r=n.get(e);if(r===void 0){let i=Object.prototype.toString.call(e);r=i.substring(8,i.length-1)===t,n.set(e,r)}return r}function pi(e,t){return typeof WebGLBuffer<`u`&&fi(t,`WebGLBuffer`)}function mi(e,t){return typeof WebGLTexture<`u`&&fi(t,`WebGLTexture`)}var hi=35044,gi=34962,_i=34963,vi=34660,yi=5120,bi=5121,xi=5122,Si=5123,Ci=5124,wi=5125,Ti=5126,Ei={attribPrefix:``};function Di(e,t,n,r,i){e.bindBuffer(t,n),e.bufferData(t,r,i||hi)}function Oi(e,t,n,r){if(pi(e,t))return t;n||=gi;let i=e.createBuffer();return Di(e,n,i,t,r),i}function ki(e){return e===`indices`}function Ai(e){return e===Int8Array||e===Uint8Array}function ji(e){return e.length?e:e.data}var Mi=/coord|texture/i,Ni=/color|colour/i;function Pi(e,t){let n;if(n=Mi.test(e)?2:Ni.test(e)?4:3,t%n>0)throw Error(`Can not guess numComponents for attribute '${e}'. Tried ${n} but ${t} values is not evenly divisible by ${n}. You should specify it.`);return n}function Fi(e,t,n){return e.numComponents||e.size||Pi(t,n||ji(e).length)}function Ii(e,t){if(ci(e))return e;if(ci(e.data))return e.data;Array.isArray(e)&&(e={data:e});let n=e.type?Ri(e.type):void 0;return n||=ki(t)?Uint16Array:Float32Array,new n(e.data)}function Li(e){return typeof e==`number`?e:e?oi(e):Ti}function Ri(e){return typeof e==`number`?si(e):e||Float32Array}function zi(e,t){return{buffer:t.buffer,numValues:24,type:Li(t.type),arrayType:Ri(t.type)}}function Bi(e,t){let n=t.data||t,r=Ri(t.type),i=n*r.BYTES_PER_ELEMENT,a=e.createBuffer();return e.bindBuffer(gi,a),e.bufferData(gi,i,t.drawType||hi),{buffer:a,numValues:n,type:oi(r),arrayType:r}}function Vi(e,t,n){let r=Ii(t,n);return{arrayType:r.constructor,buffer:Oi(e,r,void 0,t.drawType),type:ai(r),numValues:0}}function Hi(e,t){let n={};return Object.keys(t).forEach(function(r){if(!ki(r)){let i=t[r],a=i.attrib||i.name||i.attribName||Ei.attribPrefix+r;if(i.value){if(!Array.isArray(i.value)&&!ci(i.value))throw Error(`array.value is not array or typedarray`);n[a]={value:i.value}}else{let t;t=i.buffer&&i.buffer instanceof WebGLBuffer?zi:typeof i==`number`||typeof i.data==`number`?Bi:Vi;let{buffer:o,type:s,numValues:c,arrayType:l}=t(e,i,r),u=i.normalize===void 0?Ai(l):i.normalize,d=Fi(i,r,c);n[a]={buffer:o,numComponents:d,type:s,normalize:u,stride:i.stride||0,offset:i.offset||0,divisor:i.divisor===void 0?void 0:i.divisor,drawType:i.drawType}}}}),e.bindBuffer(gi,null),n}function Ui(e,t){return t===yi||t===bi?1:t===xi||t===Si?2:t===Ci||t===wi||t===Ti?4:0}var Wi=[`position`,`positions`,`a_position`];function Gi(e,t){let n,r=0;for(;r<Wi.length&&(n=Wi[r],!(n in t||(n=Ei.attribPrefix+n,n in t)));++r);r===Wi.length&&(n=Object.keys(t)[0]);let i=t[n];if(!i.buffer)return 1;e.bindBuffer(gi,i.buffer);let a=e.getBufferParameter(gi,vi);e.bindBuffer(gi,null);let o=a/Ui(e,i.type),s=i.numComponents||i.size,c=o/s;if(c%1!=0)throw Error(`numComponents ${s} not correct for length ${length}`);return c}function Ki(e,t,n){let r=Hi(e,t),i=Object.assign({},n||{});i.attribs=Object.assign({},n?n.attribs:{},r);let a=t.indices;if(a){let t=Ii(a,`indices`);i.indices=Oi(e,t,_i),i.numElements=t.length,i.elementType=ai(t)}else i.numElements||=Gi(e,i.attribs);return i}function qi(e){return!!e.texStorage2D}var Ji=function(){let e={},t={};function n(n){let r=n.constructor.name;if(!e[r]){for(let e in n)if(typeof n[e]==`number`){let r=t[n[e]];t[n[e]]=r?`${r} | ${e}`:e}e[r]=!0}}return function(e,r){return n(e),t[r]||(typeof r==`number`?`0x${r.toString(16)}`:r)}}();new Uint8Array([128,192,255,255]);var Yi=6406,Xi=6407,Zi=6408,Qi=6409,$i=6410,ea=6402,ta=34041,na=33319,ra=33320,ia=6403,aa=36244,oa=36248,sa=36249,ca={};{let e=ca;e[Yi]={numColorComponents:1},e[Qi]={numColorComponents:1},e[$i]={numColorComponents:2},e[Xi]={numColorComponents:3},e[Zi]={numColorComponents:4},e[ia]={numColorComponents:1},e[aa]={numColorComponents:1},e[na]={numColorComponents:2},e[ra]={numColorComponents:2},e[Xi]={numColorComponents:3},e[oa]={numColorComponents:3},e[Zi]={numColorComponents:4},e[sa]={numColorComponents:4},e[ea]={numColorComponents:1},e[ta]={numColorComponents:2}}var la=li;function ua(e){return typeof document<`u`&&document.getElementById?document.getElementById(e):null}var da=33984,fa=34962,pa=34963,ma=35713,ha=35714,ga=35632,_a=35633,va=35981,ya=35718,ba=35721,xa=35971,Sa=35382,Ca=35396,wa=35398,Ta=35392,Ea=35395,Da=5126,Oa=35664,ka=35665,Aa=35666,ja=5124,Ma=35667,Na=35668,Pa=35669,Fa=35670,Ia=35671,La=35672,Ra=35673,za=35674,Ba=35675,Va=35676,Ha=35678,Ua=35680,Wa=35679,Ga=35682,Ka=35685,qa=35686,Ja=35687,Ya=35688,Xa=35689,Za=35690,Qa=36289,$a=36292,eo=36293,to=5125,no=36294,ro=36295,io=36296,ao=36298,oo=36299,so=36300,co=36303,lo=36306,uo=36307,fo=36308,po=36311,mo=3553,ho=34067,go=32879,_o=35866,q={};function vo(e,t){return q[t].bindPoint}function yo(e,t){return function(n){e.uniform1f(t,n)}}function bo(e,t){return function(n){e.uniform1fv(t,n)}}function xo(e,t){return function(n){e.uniform2fv(t,n)}}function So(e,t){return function(n){e.uniform3fv(t,n)}}function Co(e,t){return function(n){e.uniform4fv(t,n)}}function wo(e,t){return function(n){e.uniform1i(t,n)}}function To(e,t){return function(n){e.uniform1iv(t,n)}}function Eo(e,t){return function(n){e.uniform2iv(t,n)}}function Do(e,t){return function(n){e.uniform3iv(t,n)}}function Oo(e,t){return function(n){e.uniform4iv(t,n)}}function ko(e,t){return function(n){e.uniform1ui(t,n)}}function Ao(e,t){return function(n){e.uniform1uiv(t,n)}}function jo(e,t){return function(n){e.uniform2uiv(t,n)}}function Mo(e,t){return function(n){e.uniform3uiv(t,n)}}function No(e,t){return function(n){e.uniform4uiv(t,n)}}function Po(e,t){return function(n){e.uniformMatrix2fv(t,!1,n)}}function Fo(e,t){return function(n){e.uniformMatrix3fv(t,!1,n)}}function Io(e,t){return function(n){e.uniformMatrix4fv(t,!1,n)}}function Lo(e,t){return function(n){e.uniformMatrix2x3fv(t,!1,n)}}function Ro(e,t){return function(n){e.uniformMatrix3x2fv(t,!1,n)}}function zo(e,t){return function(n){e.uniformMatrix2x4fv(t,!1,n)}}function Bo(e,t){return function(n){e.uniformMatrix4x2fv(t,!1,n)}}function Vo(e,t){return function(n){e.uniformMatrix3x4fv(t,!1,n)}}function Ho(e,t){return function(n){e.uniformMatrix4x3fv(t,!1,n)}}function J(e,t,n,r){let i=vo(e,t);return qi(e)?function(t){let a,o;!t||mi(e,t)?(a=t,o=null):(a=t.texture,o=t.sampler),e.uniform1i(r,n),e.activeTexture(da+n),e.bindTexture(i,a),e.bindSampler(n,o)}:function(t){e.uniform1i(r,n),e.activeTexture(da+n),e.bindTexture(i,t)}}function Y(e,t,n,r,i){let a=vo(e,t),o=new Int32Array(i);for(let e=0;e<i;++e)o[e]=n+e;return qi(e)?function(t){e.uniform1iv(r,o),t.forEach(function(t,r){e.activeTexture(da+o[r]);let i,s;!t||mi(e,t)?(i=t,s=null):(i=t.texture,s=t.sampler),e.bindSampler(n,s),e.bindTexture(a,i)})}:function(t){e.uniform1iv(r,o),t.forEach(function(t,n){e.activeTexture(da+o[n]),e.bindTexture(a,t)})}}q[Da]={Type:Float32Array,size:4,setter:yo,arraySetter:bo},q[Oa]={Type:Float32Array,size:8,setter:xo,cols:2},q[ka]={Type:Float32Array,size:12,setter:So,cols:3},q[Aa]={Type:Float32Array,size:16,setter:Co,cols:4},q[ja]={Type:Int32Array,size:4,setter:wo,arraySetter:To},q[Ma]={Type:Int32Array,size:8,setter:Eo,cols:2},q[Na]={Type:Int32Array,size:12,setter:Do,cols:3},q[Pa]={Type:Int32Array,size:16,setter:Oo,cols:4},q[to]={Type:Uint32Array,size:4,setter:ko,arraySetter:Ao},q[no]={Type:Uint32Array,size:8,setter:jo,cols:2},q[ro]={Type:Uint32Array,size:12,setter:Mo,cols:3},q[io]={Type:Uint32Array,size:16,setter:No,cols:4},q[Fa]={Type:Uint32Array,size:4,setter:wo,arraySetter:To},q[Ia]={Type:Uint32Array,size:8,setter:Eo,cols:2},q[La]={Type:Uint32Array,size:12,setter:Do,cols:3},q[Ra]={Type:Uint32Array,size:16,setter:Oo,cols:4},q[za]={Type:Float32Array,size:32,setter:Po,rows:2,cols:2},q[Ba]={Type:Float32Array,size:48,setter:Fo,rows:3,cols:3},q[Va]={Type:Float32Array,size:64,setter:Io,rows:4,cols:4},q[Ka]={Type:Float32Array,size:32,setter:Lo,rows:2,cols:3},q[qa]={Type:Float32Array,size:32,setter:zo,rows:2,cols:4},q[Ja]={Type:Float32Array,size:48,setter:Ro,rows:3,cols:2},q[Ya]={Type:Float32Array,size:48,setter:Vo,rows:3,cols:4},q[Xa]={Type:Float32Array,size:64,setter:Bo,rows:4,cols:2},q[Za]={Type:Float32Array,size:64,setter:Ho,rows:4,cols:3},q[Ha]={Type:null,size:0,setter:J,arraySetter:Y,bindPoint:mo},q[Ua]={Type:null,size:0,setter:J,arraySetter:Y,bindPoint:ho},q[Wa]={Type:null,size:0,setter:J,arraySetter:Y,bindPoint:go},q[Ga]={Type:null,size:0,setter:J,arraySetter:Y,bindPoint:mo},q[Qa]={Type:null,size:0,setter:J,arraySetter:Y,bindPoint:_o},q[$a]={Type:null,size:0,setter:J,arraySetter:Y,bindPoint:_o},q[eo]={Type:null,size:0,setter:J,arraySetter:Y,bindPoint:ho},q[ao]={Type:null,size:0,setter:J,arraySetter:Y,bindPoint:mo},q[oo]={Type:null,size:0,setter:J,arraySetter:Y,bindPoint:go},q[so]={Type:null,size:0,setter:J,arraySetter:Y,bindPoint:ho},q[co]={Type:null,size:0,setter:J,arraySetter:Y,bindPoint:_o},q[lo]={Type:null,size:0,setter:J,arraySetter:Y,bindPoint:mo},q[uo]={Type:null,size:0,setter:J,arraySetter:Y,bindPoint:go},q[fo]={Type:null,size:0,setter:J,arraySetter:Y,bindPoint:ho},q[po]={Type:null,size:0,setter:J,arraySetter:Y,bindPoint:_o};function Uo(e,t){return function(n){if(n.value)switch(e.disableVertexAttribArray(t),n.value.length){case 4:e.vertexAttrib4fv(t,n.value);break;case 3:e.vertexAttrib3fv(t,n.value);break;case 2:e.vertexAttrib2fv(t,n.value);break;case 1:e.vertexAttrib1fv(t,n.value);break;default:throw Error(`the length of a float constant value must be between 1 and 4!`)}else e.bindBuffer(fa,n.buffer),e.enableVertexAttribArray(t),e.vertexAttribPointer(t,n.numComponents||n.size,n.type||Da,n.normalize||!1,n.stride||0,n.offset||0),e.vertexAttribDivisor&&e.vertexAttribDivisor(t,n.divisor||0)}}function X(e,t){return function(n){if(n.value){if(e.disableVertexAttribArray(t),n.value.length===4)e.vertexAttrib4iv(t,n.value);else throw Error(`The length of an integer constant value must be 4!`)}else e.bindBuffer(fa,n.buffer),e.enableVertexAttribArray(t),e.vertexAttribIPointer(t,n.numComponents||n.size,n.type||ja,n.stride||0,n.offset||0),e.vertexAttribDivisor&&e.vertexAttribDivisor(t,n.divisor||0)}}function Wo(e,t){return function(n){if(n.value){if(e.disableVertexAttribArray(t),n.value.length===4)e.vertexAttrib4uiv(t,n.value);else throw Error(`The length of an unsigned integer constant value must be 4!`)}else e.bindBuffer(fa,n.buffer),e.enableVertexAttribArray(t),e.vertexAttribIPointer(t,n.numComponents||n.size,n.type||to,n.stride||0,n.offset||0),e.vertexAttribDivisor&&e.vertexAttribDivisor(t,n.divisor||0)}}function Go(e,t,n){let r=n.size,i=n.count;return function(n){e.bindBuffer(fa,n.buffer);let a=n.size||n.numComponents||r,o=a/i,s=n.type||Da,c=q[s].size*a,l=n.normalize||!1,u=n.offset||0,d=c/i;for(let r=0;r<i;++r)e.enableVertexAttribArray(t+r),e.vertexAttribPointer(t+r,o,s,l,c,u+d*r),e.vertexAttribDivisor&&e.vertexAttribDivisor(t+r,n.divisor||0)}}var Z={};Z[Da]={size:4,setter:Uo},Z[Oa]={size:8,setter:Uo},Z[ka]={size:12,setter:Uo},Z[Aa]={size:16,setter:Uo},Z[ja]={size:4,setter:X},Z[Ma]={size:8,setter:X},Z[Na]={size:12,setter:X},Z[Pa]={size:16,setter:X},Z[to]={size:4,setter:Wo},Z[no]={size:8,setter:Wo},Z[ro]={size:12,setter:Wo},Z[io]={size:16,setter:Wo},Z[Fa]={size:4,setter:X},Z[Ia]={size:8,setter:X},Z[La]={size:12,setter:X},Z[Ra]={size:16,setter:X},Z[za]={size:4,setter:Go,count:2},Z[Ba]={size:9,setter:Go,count:3},Z[Va]={size:16,setter:Go,count:4};var Ko=/ERROR:\s*\d+:(\d+)/gi;function qo(e,t=``,n=0){let r=[...t.matchAll(Ko)],i=new Map(r.map((e,n)=>{let i=parseInt(e[1]),a=r[n+1],o=a?a.index:t.length,s=t.substring(e.index,o);return[i-1,s]}));return e.split(`
`).map((e,t)=>{let r=i.get(t);return`${t+1+n}: ${e}${r?`\n\n^^^ ${r}`:``}`}).join(`
`)}var Jo=/^[ \t]*\n/;function Yo(e){let t=0;return Jo.test(e)&&(t=1,e=e.replace(Jo,``)),{lineOffset:t,shaderSource:e}}function Xo(e,t){return e.errorCallback(t),e.callback&&setTimeout(()=>{e.callback(`${t}\n${e.errors.join(`
`)}`)}),null}function Zo(e,t,n,r){if(r||=la,!e.getShaderParameter(n,ma)){let i=e.getShaderInfoLog(n),{lineOffset:a,shaderSource:o}=Yo(e.getShaderSource(n)),s=`${qo(o,i,a)}\nError compiling ${Ji(e,t)}: ${i}`;return r(s),s}return``}function Qo(e,t,n){let r,i,a;if(typeof t==`function`&&(n=t,t=void 0),typeof e==`function`)n=e,e=void 0;else if(e&&!Array.isArray(e)){let t=e;n=t.errorCallback,e=t.attribLocations,r=t.transformFeedbackVaryings,i=t.transformFeedbackMode,a=t.callback}let o=n||la,s=[],c={errorCallback(e,...t){s.push(e),o(e,...t)},transformFeedbackVaryings:r,transformFeedbackMode:i,callback:a,errors:s};{let n={};Array.isArray(e)?e.forEach(function(e,r){n[e]=t?t[r]:r}):n=e||{},c.attribLocations=n}return c}var $o=[`VERTEX_SHADER`,`FRAGMENT_SHADER`];function es(e,t){if(t.indexOf(`frag`)>=0)return ga;if(t.indexOf(`vert`)>=0)return _a}function ts(e,t,n){let r=e.getAttachedShaders(t);for(let t of r)n.has(t)||e.deleteShader(t);e.deleteProgram(t)}var ns=(e=0)=>new Promise(t=>setTimeout(t,e));function rs(e,t,n){let r=e.createProgram(),{attribLocations:i,transformFeedbackVaryings:a,transformFeedbackMode:o}=Qo(n);for(let n=0;n<t.length;++n){let i=t[n];if(typeof i==`string`){let t=ua(i),r=t?t.text:i,a=e[$o[n]];t&&t.type&&(a=es(e,t.type)||a),i=e.createShader(a),e.shaderSource(i,Yo(r).shaderSource),e.compileShader(i)}e.attachShader(r,i)}Object.entries(i).forEach(([t,n])=>e.bindAttribLocation(r,n,t));{let t=a;t&&(t.attribs&&(t=t.attribs),Array.isArray(t)||(t=Object.keys(t)),e.transformFeedbackVaryings(r,t,o||va))}return e.linkProgram(r),r}function is(e,t,n,r,i){let a=Qo(n,r,i),o=new Set(t),s=rs(e,t,a);function c(e,t){let n=os(e,t,a.errorCallback);return n&&ts(e,t,o),n}if(a.callback){as(e,s).then(()=>{let t=c(e,s);a.callback(t,t?void 0:s)});return}return c(e,s)?void 0:s}async function as(e,t){let n=e.getExtension(`KHR_parallel_shader_compile`),r=n?(e,t)=>e.getProgramParameter(t,n.COMPLETION_STATUS_KHR):()=>!0,i=0;do await ns(i),i=1e3/60;while(!r(e,t))}function os(e,t,n){if(n||=la,!e.getProgramParameter(t,ha)){let r=e.getProgramInfoLog(t);return n(`Error in program linking: ${r}`),`${r}\n${e.getAttachedShaders(t).map(t=>Zo(e,e.getShaderParameter(t,e.SHADER_TYPE),t,n)).filter(e=>e).join(`
`)}`}}function ss(e,t,n,r,i){return is(e,t,n,r,i)}function cs(e){let t=e.name;return t.startsWith(`gl_`)||t.startsWith(`webgl_`)}var ls=/(\.|\[|]|\w+)/g,us=e=>e>=`0`&&e<=`9`;function ds(e,t,n,r){let i=e.split(ls).filter(e=>e!==``),a=0,o=``;for(;;){let e=i[a++];o+=e;let s=us(e[0]),c=s?parseInt(e):e;if(s&&(o+=i[a++]),a===i.length){n[c]=t;break}{let e=i[a++],t=e===`[`,s=n[c]||(t?[]:{});n[c]=s,n=s,r[o]=r[o]||function(e){return function(t){hs(e,t)}}(s),o+=e}}}function fs(e,t){let n=0;function r(t,r,i){let a=r.name.endsWith(`[0]`),o=r.type,s=q[o];if(!s)throw Error(`unknown type: 0x${o.toString(16)}`);let c;if(s.bindPoint){let t=n;n+=r.size,c=a?s.arraySetter(e,o,t,i,r.size):s.setter(e,o,t,i,r.size)}else c=s.arraySetter&&a?s.arraySetter(e,i):s.setter(e,i);return c.location=i,c}let i={},a={},o=e.getProgramParameter(t,ya);for(let n=0;n<o;++n){let o=e.getActiveUniform(t,n);if(cs(o))continue;let s=o.name;s.endsWith(`[0]`)&&(s=s.substr(0,s.length-3));let c=e.getUniformLocation(t,o.name);if(c){let e=r(t,o,c);i[s]=e,ds(s,e,a,i)}}return i}function ps(e,t){let n={},r=e.getProgramParameter(t,xa);for(let i=0;i<r;++i){let r=e.getTransformFeedbackVarying(t,i);n[r.name]={index:i,type:r.type,size:r.size}}return n}function ms(e,t){let n=e.getProgramParameter(t,ya),r=[],i=[];for(let a=0;a<n;++a){i.push(a),r.push({});let n=e.getActiveUniform(t,a);r[a].name=n.name}[[`UNIFORM_TYPE`,`type`],[`UNIFORM_SIZE`,`size`],[`UNIFORM_BLOCK_INDEX`,`blockNdx`],[`UNIFORM_OFFSET`,`offset`]].forEach(function(n){let a=n[0],o=n[1];e.getActiveUniforms(t,i,e[a]).forEach(function(e,t){r[t][o]=e})});let a={},o=e.getProgramParameter(t,Sa);for(let n=0;n<o;++n){let r=e.getActiveUniformBlockName(t,n),i={index:e.getUniformBlockIndex(t,r),usedByVertexShader:e.getActiveUniformBlockParameter(t,n,Ca),usedByFragmentShader:e.getActiveUniformBlockParameter(t,n,wa),size:e.getActiveUniformBlockParameter(t,n,Ta),uniformIndices:e.getActiveUniformBlockParameter(t,n,Ea)};i.used=i.usedByVertexShader||i.usedByFragmentShader,a[r]=i}return{blockSpecs:a,uniformData:r}}function hs(e,t){for(let n in t){let r=e[n];typeof r==`function`?r(t[n]):hs(e[n],t[n])}}function gs(e,...t){let n=e.uniformSetters||e,r=t.length;for(let e=0;e<r;++e){let r=t[e];if(Array.isArray(r)){let e=r.length;for(let t=0;t<e;++t)gs(n,r[t])}else for(let e in r){let t=n[e];t&&t(r[e])}}}function _s(e,t){let n={},r=e.getProgramParameter(t,ba);for(let i=0;i<r;++i){let r=e.getActiveAttrib(t,i);if(cs(r))continue;let a=e.getAttribLocation(t,r.name),o=Z[r.type],s=o.setter(e,a,o);s.location=a,n[r.name]=s}return n}function vs(e,t){for(let n in t){let r=e[n];r&&r(t[n])}}function ys(e,t,n){n.vertexArrayObject?e.bindVertexArray(n.vertexArrayObject):(vs(t.attribSetters||t,n.attribs),n.indices&&e.bindBuffer(pa,n.indices))}function bs(e,t){let n=fs(e,t),r=_s(e,t),i={program:t,uniformSetters:n,attribSetters:r,uniformLocations:Object.fromEntries(Object.entries(n).map(([e,t])=>[e,t.location])),attribLocations:Object.fromEntries(Object.entries(r).map(([e,t])=>[e,t.location]))};return qi(e)&&(i.uniformBlockSpec=ms(e,t),i.transformFeedbackInfo=ps(e,t)),i}var xs=/\s|{|}|;/;function Ss(e,t,n,r,i){let a=Qo(n,r,i),o=[];if(t=t.map(function(e){if(!xs.test(e)){let t=ua(e);if(t)e=t.text;else{let t=`no element with id: ${e}`;a.errorCallback(t),o.push(t)}}return e}),o.length)return Xo(a,``);let s=a.callback;s&&(a.callback=(t,n)=>{s(t,t?void 0:bs(e,n))});let c=ss(e,t,a);return c?bs(e,c):null}var Cs=4,ws=5123;function Ts(e,t,n,r,i,a){n=n===void 0?Cs:n;let o=t.indices,s=t.elementType,c=r===void 0?t.numElements:r;i=i===void 0?0:i,s||o?a===void 0?e.drawElements(n,c,s===void 0?ws:t.elementType,i):e.drawElementsInstanced(n,c,s===void 0?ws:t.elementType,i,a):a===void 0?e.drawArrays(n,i,c):e.drawArraysInstanced(n,i,c,a)}var Es=6402,Ds=33190,Os=36012,ks=35056,As=36013,js=32854,Ms=32855,Ns=36194,Ps=33189,Fs=6401,Is=36168,Ls=34041,Rs=36096,zs=36128,Bs=33306,Q={};Q[Ls]=Bs,Q[Fs]=zs,Q[Is]=zs,Q[Es]=Rs,Q[Ps]=Rs,Q[Ds]=Rs,Q[Os]=Rs,Q[ks]=Bs,Q[As]=Bs;var Vs={};Vs[js]=!0,Vs[Ms]=!0,Vs[Ns]=!0,Vs[Ls]=!0,Vs[Ps]=!0,Vs[Fs]=!0,Vs[Is]=!0;var Hs={addExtensionsToContext:!0},Us=/^(.*?)_/;function Ws(e,t){Ji(e,0);let n=e.getExtension(t);if(n){let r={},i=Us.exec(t)[1],a=`_`+i;for(let t in n){let o=n[t],s=typeof o==`function`,c=s?i:a,l=t;t.endsWith(c)&&(l=t.substring(0,t.length-c.length)),e[l]===void 0?s?e[l]=function(e){return function(){return e.apply(n,arguments)}}(o):(e[l]=o,r[l]=o):!s&&e[l]!==o&&ui(l,e[l],o,t)}r.constructor={name:n.constructor.name},Ji(r,0)}return n}var Gs=`ANGLE_instanced_arrays.EXT_blend_minmax.EXT_color_buffer_float.EXT_color_buffer_half_float.EXT_disjoint_timer_query.EXT_disjoint_timer_query_webgl2.EXT_frag_depth.EXT_sRGB.EXT_shader_texture_lod.EXT_texture_compression_bptc.EXT_texture_compression_rgtc.EXT_texture_filter_anisotropic.OES_element_index_uint.OES_standard_derivatives.OES_texture_float.OES_texture_float_linear.OES_texture_half_float.OES_texture_half_float_linear.OES_vertex_array_object.WEBGL_color_buffer_float.WEBGL_compressed_texture_atc.WEBGL_compressed_texture_etc1.WEBGL_compressed_texture_etc.WEBGL_compressed_texture_pvrtc.WEBGL_compressed_texture_s3tc.WEBGL_compressed_texture_s3tc_srgb.WEBGL_depth_texture.WEBGL_draw_buffers`.split(`.`);function Ks(e){for(let t=0;t<Gs.length;++t)Ws(e,Gs[t])}function qs(e,t){let n=[`webgl2`,`webgl`,`experimental-webgl`],r=null;for(let i=0;i<n.length;++i)if(r=e.getContext(n[i],t),r){Hs.addExtensionsToContext&&Ks(r);break}return r}function Js(e,t){return qs(e,t)}function Ys(e,t){t||=1,t=Math.max(0,t);let n=e.clientWidth*t|0,r=e.clientHeight*t|0;return e.width!==n||e.height!==r?(e.width=n,e.height=r,!0):!1}var Xs=150,Zs=`
attribute float a_index;
uniform vec2 u_resolution;
uniform float u_time;
varying float v_color_type;
varying float v_intensity_base;

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  float seed = a_index * 123.456;
  
  float speed_rand = hash2(vec2(seed, 1.1));
  float size_rand = hash2(vec2(seed, 2.2));
  float y_rand = hash2(vec2(seed, 3.3));
  float x_rand = hash2(vec2(seed, 4.4));
  float blink_rand = hash2(vec2(seed, 5.5));
  float color_type_rand = hash2(vec2(seed, 6.6));

  float aspect = u_resolution.x / u_resolution.y;
  float speed = 0.008 + speed_rand * 0.024;
  float size = 0.0006 + 0.0032 * pow(size_rand, 3.8);
  
  float y = -0.45 + y_rand * 0.9;
  
  float margin = 0.05;
  float width = aspect + margin * 2.0;
  float x = fract(x_rand + u_time * speed);
  x = x * width - (aspect * 0.5 + margin);
  
  float wave = sin(u_time * 0.3 + y_rand * 6.283) * 0.005;
  
  float ndc_x = x / (aspect * 0.5);
  float ndc_y = (y + wave) / 0.5;
  
  gl_Position = vec4(ndc_x, ndc_y, 0.0, 1.0);
  
  // Point size in pixels. 
  float pointSize = size * u_resolution.y * 3.5;
  gl_PointSize = max(2.0, pointSize);
  
  float blink = 0.3 + 0.7 * sin(u_time * (1.0 + blink_rand * 2.5) + x_rand * 6.283);
  v_intensity_base = blink;
  v_color_type = color_type_rand;
}
`,Qs=`
precision mediump float;
uniform vec3 u_particle_color;
uniform vec3 u_particle_accent_color;

varying float v_color_type;
varying float v_intensity_base;

void main() {
  vec2 pc = gl_PointCoord - 0.5;
  float dist = length(pc);
  
  float alpha = smoothstep(0.5, 0.1, dist) * v_intensity_base;
  if (alpha < 0.01) discard;
  
  vec3 baseColor = v_color_type > 0.90 ? u_particle_accent_color : u_particle_color;
  
  // Pre-multiplied alpha blending
  gl_FragColor = vec4(baseColor * alpha, alpha);
}
`,$s=({theme:e,isDaylight:t,paused:n=!1})=>{let i=(0,j.useRef)(null),a=(0,j.useRef)(null),o=(0,j.useRef)(0),s=(0,j.useRef)(null),c=r(e.primaryColor)||(t?{r:0,g:0,b:0}:{r:255,g:255,b:255}),l=[c.r/255,c.g/255,c.b/255],u=r(e.accentColor)||c,d=[u.r/255,u.g/255,u.b/255],f=t?[1,1,1]:[0,0,0],p=(0,j.useRef)(n),m=(0,j.useRef)(l),h=(0,j.useRef)(d),g=(0,j.useRef)(f);return p.current=n,m.current=l,h.current=d,g.current=f,(0,j.useEffect)(()=>{let e=i.current;if(!e)return;let t=Js(e,{alpha:!1,depth:!1,antialias:!1});if(!t)return;let n=Ss(t,[Zs,Qs],e=>{console.error(`SoraBackground twgl program error:`,e)});if(!n)return;let r=new Float32Array(Xs);for(let e=0;e<Xs;e++)r[e]=e;let c=Ki(t,{a_index:{numComponents:1,data:r}}),l=null,u=()=>{a.current===null&&(a.current=requestAnimationFrame(d))},d=r=>{if(a.current=null,!p.current&&l!==null){let e=(r-l)/1e3;o.current+=e}l=p.current?null:r,Ys(e),t.viewport(0,0,t.canvas.width,t.canvas.height);let i=g.current;t.clearColor(i[0],i[1],i[2],1),t.clear(t.COLOR_BUFFER_BIT),t.enable(t.BLEND),t.blendFunc(t.ONE,t.ONE_MINUS_SRC_ALPHA);let s={u_resolution:[t.canvas.width,t.canvas.height],u_time:o.current,u_particle_color:m.current,u_particle_accent_color:h.current};t.useProgram(n.program),ys(t,n,c),gs(n,s),Ts(t,c,t.POINTS),p.current||u()},f=new ResizeObserver(u);return f.observe(e),s.current=u,u(),()=>{s.current=null,f.disconnect(),a.current!==null&&(cancelAnimationFrame(a.current),a.current=null),t.deleteProgram(n.program),c.attribs&&c.attribs.a_index&&c.attribs.a_index.buffer&&t.deleteBuffer(c.attribs.a_index.buffer)}},[]),(0,j.useEffect)(()=>{s.current?.()},[n,t,e.primaryColor,e.accentColor]),(0,M.jsx)(`canvas`,{ref:i,className:`absolute inset-0 w-full h-full block pointer-events-none`,style:{width:`100%`,height:`100%`,willChange:`transform`,transform:`translateZ(0)`}})},ec=({t:e,isDaylight:t,theme:n,controlCardBg:r,tuning:i,onTuningChange:a})=>{let s=o(n.secondaryColor,t?.18:.16);return(0,M.jsxs)(`div`,{className:`rounded-[24px] border p-4 space-y-5`,style:{backgroundColor:r,borderColor:s},children:[(0,M.jsx)(`div`,{className:`space-y-1`,children:(0,M.jsx)(`div`,{className:`text-sm font-medium`,style:{color:n.primaryColor},children:e(`options.soraBackgroundSettings`)})}),(0,M.jsx)(R,{label:e(`options.soraBlank`),description:e(`options.soraBlankDesc`),checked:i.blank,onChange:e=>a?.({blank:e}),theme:n})]})},tc=e({default:()=>nc}),nc=Ke({mode:`sora`,order:50,labelKey:`options.visualizerBackgroundModeSora`,labelFallback:`Sora`,render:({config:e,theme:t,isDaylight:n,paused:r,staticMode:i})=>(0,M.jsx)(`div`,{className:`absolute inset-0 z-0`,style:{backgroundColor:n?`#ffffff`:`#000000`},children:!e?.sora?.tuning?.blank&&(0,M.jsx)($s,{theme:t,isDaylight:n,paused:r||i})}),renderSettingsPanel:({config:e,actions:t,t:n,isDaylight:r,theme:i,controlCardBg:a})=>(0,M.jsx)(ec,{t:n,isDaylight:r,theme:i,controlCardBg:a,tuning:e?.sora?.tuning??w,onTuningChange:t?.sora?.onTuningChange}),renderQuickControls:({config:e,actions:t,t:n,theme:r})=>{let i=e?.sora?.tuning??w;return(0,M.jsx)(Je,{active:i.blank,theme:r,label:n(`options.soraBlank`),onToggle:()=>t?.sora?.onTuningChange?.({blank:!i.blank}),children:(0,M.jsx)(_,{size:14})})},resetSettings:e=>e?.sora?.onResetTuning?.()}),rc=({urlBackgroundList:e=[],urlBackgroundSelectedId:t=null})=>{let n=(0,j.useMemo)(()=>b(e.find(e=>e.id===t)),[e,t]),r=(0,j.useRef)(null),[i,a]=(0,j.useState)(!1);return(0,j.useEffect)(()=>{a(!1);let e=r.current;if(!e)return;let t=e.getBoundingClientRect();if(t.width>0&&t.height>0){a(!0);return}let n=new ResizeObserver(e=>{for(let t of e){let{width:e,height:r}=t.contentRect;e>0&&r>0&&(a(!0),n.disconnect())}});return n.observe(e),()=>{n.disconnect()}},[n]),n?.url?(0,M.jsxs)(`div`,{ref:r,className:`absolute inset-0 z-0 overflow-hidden`,children:[i&&(0,M.jsx)(`iframe`,{src:n.url,title:n.note||n.url,className:`w-full h-full border-0`,style:{pointerEvents:`none`},sandbox:`allow-scripts`,allowFullScreen:!0},n.url),(0,M.jsx)(`div`,{className:`absolute inset-0`,style:{background:`linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.35))`,pointerEvents:`none`}})]}):null},ic=()=>`url-bg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,ac=({t:e,isDaylight:t,theme:n,controlCardBg:r,urlBackgroundList:i=[],urlBackgroundSelectedId:a=null,onAddUrlBackgroundItem:c,onUpdateUrlBackgroundItem:u,onDeleteUrlBackgroundItem:d,onSetUrlBackgroundSelectedId:f})=>{let[m,_]=(0,j.useState)(!1),[b,x]=(0,j.useState)(null),[S,C]=(0,j.useState)(``),[w,T]=(0,j.useState)(``),E=(0,j.useCallback)(()=>{C(``),T(``),_(!1),x(null)},[]),ee=(0,j.useCallback)(()=>{let e=y(S);if(!e)return;let t={id:ic(),url:e,note:w.trim()||e};c?.(t),f?.(t.id),E()},[S,w,c,f,E]),te=(0,j.useCallback)(e=>{x(e.id),C(e.url),T(e.note)},[]),ne=(0,j.useCallback)(()=>{if(!b)return;let e=y(S);e&&(u?.(b,{url:e,note:w.trim()||e}),E())},[b,S,w,u,E]),re=(0,j.useCallback)(e=>{d?.(e)},[d]),ie=(0,j.useCallback)(e=>{f?.(e)},[f]),D=o(n.secondaryColor,t?.18:.16),ae=o(n.backgroundColor,t?.24:.34),oe=o(n.backgroundColor,t?.42:.52);return(0,M.jsxs)(`div`,{className:`rounded-[24px] border p-4 space-y-4`,style:{backgroundColor:r,borderColor:D},children:[(0,M.jsxs)(`div`,{className:`space-y-1`,children:[(0,M.jsx)(`div`,{className:`text-sm font-medium`,style:{color:n.primaryColor},children:e(`options.urlBackgroundSettings`)}),(0,M.jsx)(`div`,{className:`text-xs opacity-70`,style:{color:n.secondaryColor},children:e(`options.urlBackgroundSettingsDesc`)})]}),i.length>0&&(0,M.jsx)(`div`,{className:`space-y-2`,children:i.map(r=>(0,M.jsx)(`div`,{className:`rounded-2xl border p-3 transition-all`,style:{borderColor:r.id===a?n.accentColor:D,backgroundColor:r.id===a?o(n.accentColor,t?.1:.16):ae},children:b===r.id?(0,M.jsxs)(`div`,{className:`space-y-2`,children:[(0,M.jsx)(`input`,{type:`url`,value:S,onChange:e=>C(e.target.value),placeholder:`https://example.com`,className:`w-full rounded-xl border px-3 py-2 text-sm outline-none`,style:{backgroundColor:oe,borderColor:D,color:n.primaryColor}}),(0,M.jsx)(`input`,{type:`text`,value:w,onChange:e=>T(e.target.value),placeholder:e(`options.urlBackgroundNotePlaceholder`),className:`w-full rounded-xl border px-3 py-2 text-sm outline-none`,style:{backgroundColor:oe,borderColor:D,color:n.primaryColor}}),(0,M.jsxs)(`div`,{className:`flex gap-2 justify-end`,children:[(0,M.jsx)(`button`,{type:`button`,onClick:E,className:`h-8 w-8 rounded-full border flex items-center justify-center transition-colors hover:bg-white/10`,style:{borderColor:D,color:n.secondaryColor},children:(0,M.jsx)(g,{size:14})}),(0,M.jsx)(`button`,{type:`button`,onClick:ne,disabled:!S.trim(),className:`h-8 w-8 rounded-full border flex items-center justify-center transition-colors hover:bg-white/10 disabled:opacity-40`,style:{borderColor:n.accentColor,color:n.accentColor},children:(0,M.jsx)(v,{size:14})})]})]}):(0,M.jsxs)(`div`,{className:`flex items-center gap-3`,children:[(0,M.jsxs)(`button`,{type:`button`,onClick:()=>ie(r.id),className:`flex-1 text-left min-w-0`,children:[(0,M.jsx)(`div`,{className:`text-sm font-medium truncate`,style:{color:n.primaryColor},children:r.note}),(0,M.jsx)(`div`,{className:`text-xs opacity-60 truncate mt-0.5`,style:{color:n.secondaryColor},children:r.url})]}),(0,M.jsxs)(`div`,{className:`flex items-center gap-1 shrink-0`,children:[(0,M.jsx)(`button`,{type:`button`,onClick:()=>te(r),className:`h-7 w-7 rounded-full border flex items-center justify-center transition-colors hover:bg-white/10`,style:{borderColor:D,color:n.secondaryColor},children:(0,M.jsx)(p,{size:12})}),(0,M.jsx)(`button`,{type:`button`,onClick:()=>re(r.id),className:`h-7 w-7 rounded-full border flex items-center justify-center transition-colors hover:bg-red-500/10`,style:{borderColor:D,color:n.secondaryColor},children:(0,M.jsx)(s,{size:12})})]})]})},r.id))}),m?(0,M.jsxs)(`div`,{className:`space-y-2 rounded-2xl border p-3`,style:{borderColor:D,backgroundColor:ae},children:[(0,M.jsx)(`input`,{type:`url`,value:S,onChange:e=>C(e.target.value),placeholder:`https://example.com`,autoFocus:!0,className:`w-full rounded-xl border px-3 py-2 text-sm outline-none`,style:{backgroundColor:oe,borderColor:D,color:n.primaryColor}}),(0,M.jsx)(`input`,{type:`text`,value:w,onChange:e=>T(e.target.value),placeholder:e(`options.urlBackgroundNotePlaceholder`),className:`w-full rounded-xl border px-3 py-2 text-sm outline-none`,style:{backgroundColor:oe,borderColor:D,color:n.primaryColor}}),(0,M.jsxs)(`div`,{className:`flex gap-2 justify-end`,children:[(0,M.jsx)(`button`,{type:`button`,onClick:E,className:`h-8 w-8 rounded-full border flex items-center justify-center transition-colors hover:bg-white/10`,style:{borderColor:D,color:n.secondaryColor},children:(0,M.jsx)(g,{size:14})}),(0,M.jsx)(`button`,{type:`button`,onClick:ee,disabled:!S.trim(),className:`h-8 w-8 rounded-full border flex items-center justify-center transition-colors hover:bg-white/10 disabled:opacity-40`,style:{borderColor:n.accentColor,color:n.accentColor},children:(0,M.jsx)(v,{size:14})})]})]}):(0,M.jsxs)(`button`,{type:`button`,onClick:()=>{C(``),T(``),_(!0)},className:`flex h-10 w-full items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-medium transition-colors hover:bg-white/5`,style:{borderColor:D,color:n.primaryColor},children:[(0,M.jsx)(l,{size:16}),e(`options.urlBackgroundAdd`)]}),i.length===0&&!m&&(0,M.jsxs)(`div`,{className:`flex flex-col items-center gap-2 py-3 opacity-50`,children:[(0,M.jsx)(h,{size:24,style:{color:n.secondaryColor}}),(0,M.jsx)(`div`,{className:`text-xs`,style:{color:n.secondaryColor},children:e(`options.urlBackgroundEmpty`)})]})]})},oc=e({default:()=>sc}),sc=Ke({mode:`url`,order:40,labelKey:`options.visualizerBackgroundModeUrl`,labelFallback:`Embed`,render:({config:e})=>(0,M.jsx)(rc,{urlBackgroundList:e?.url?.items,urlBackgroundSelectedId:e?.url?.selectedId}),renderSettingsPanel:({config:e,actions:t,...n})=>(0,M.jsx)(ac,{...n,urlBackgroundList:e?.url?.items,urlBackgroundSelectedId:e?.url?.selectedId,onAddUrlBackgroundItem:t?.url?.onAdd,onUpdateUrlBackgroundItem:t?.url?.onUpdate,onDeleteUrlBackgroundItem:t?.url?.onDelete,onSetUrlBackgroundSelectedId:t?.url?.onSelect})}),{entries:cc,byMode:$}=(e=>{let t=Object.entries(e).map(([e,t])=>{if(!t.default)throw Error(`[VisualizerBackgroundRegistry] Missing default export in ${e}`);return t.default}),n={};return t.forEach(e=>{if(n[e.mode])throw Error(`[VisualizerBackgroundRegistry] Duplicate background mode "${e.mode}"`);n[e.mode]=e}),{entries:[...t].sort((e,t)=>e.order-t.order),byMode:n}})(Object.assign({"./common/entry.tsx":Nt,"./latent/entry.tsx":It,"./monet/entry.tsx":fr,"./nomand/entry.tsx":Br,"./sora/entry.tsx":tc,"./url/entry.tsx":oc}));n(`VisualizerBackgroundRegistry`,cc.map(e=>e.mode),a);var lc=e=>typeof e==`string`&&!!$[e],uc=e=>$[e]??$.latent,dc=(e,t)=>{let n=uc(e),r=t(n.labelKey);return!r||r===n.labelKey?n.labelFallback:r},fc=e=>!$[e.mode]&&($[e.mode]=e,cc.push(e),cc.sort((e,t)=>e.order-t.order),!0),pc=e=>{if(!$[e])return!1;delete $[e];let t=cc.findIndex(t=>t.mode===e);return t>=0&&cc.splice(t,1),!0},mc=e=>typeof e!=`number`||!Number.isFinite(e)?null:Math.round(Math.min(900,Math.max(100,e))/10)*10,hc=(e,t)=>mc(e?.fontWeight)??t,gc=`"獅尾四季春加糖SC"`,_c={sans:`"Inter", "Noto Sans CJK SC", "Noto Sans JP", "Source Han Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif`,serif:`${gc}, "Iowan Old Style", "Noto Serif CJK SC", "Noto Serif JP", "Source Han Serif SC", "Songti SC", "STSong", "Georgia", serif`,mono:`"IBM Plex Mono", "Sarasa Mono SC", "Noto Sans Mono CJK SC", "Noto Sans Mono", "SFMono-Regular", Consolas, monospace`},vc={sans:`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, "Noto Sans CJK SC", "Source Han Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans JP", "Source Han Sans JP", "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif`,serif:`${gc}, "Folia Noto Serif SC", "Iowan Old Style", Georgia, "Times New Roman", "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", "Noto Serif JP", "Source Han Serif JP", "Yu Mincho", "MS PMincho", serif`,mono:`Consolas, "IBM Plex Mono", "SFMono-Regular", Menlo, Monaco, "Sarasa Mono SC", "Noto Sans Mono CJK SC", "SimHei", "DengXian", "Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans Mono CJK JP", "MS Gothic", monospace`},yc=new Set([`serif`,`sans-serif`,`monospace`,`cursive`,`fantasy`,`system-ui`,`ui-serif`,`ui-sans-serif`,`ui-monospace`,`ui-rounded`,`emoji`,`math`,`fangsong`]),bc=e=>`"${e.replace(/["\\]/g,`\\$&`)}"`,xc=e=>e.trim().replace(/^['"]|['"]$/g,``).trim(),Sc=e=>{let t=xc(e);return t?yc.has(t.toLowerCase())?t:bc(t):null},Cc=e=>{let t=new Set,n=[];return e?.forEach(e=>{let r=xc(e??``);if(!r)return;let i=r.toLocaleLowerCase();t.has(i)||(t.add(i),n.push(r))}),n},wc=e=>{let t=[...e.fontFamily?[e.fontFamily]:[],...e.fontFamilyStack??[]];return t.length===0?[]:Cc(t).map(Sc).filter(e=>!!e)},Tc=e=>_c[e]??_c.sans,Ec=e=>{let t=Tc(e.fontStyle),n=wc(e);return n.length===0?t:`${n.join(`, `)}, ${t}`},Dc=e=>{let t=vc[e.fontStyle]??vc.sans,n=wc(e);return n.length===0?t:`${n.join(`, `)}, ${t}`};export{ke as C,ze as S,_t as _,Dc as a,qe as b,dc as c,pc as d,or as f,vt as g,bt as h,hc as i,uc as l,wt as m,mc as n,cc as o,vn as p,Ec as r,fc as s,Cc as t,lc as u,yt as v,Je as x,xt as y};