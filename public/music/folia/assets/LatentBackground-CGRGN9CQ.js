import{r as e}from"./rolldown-runtime-hePW80VL.js";import{ii as t}from"./folia-icons-C-1JgITt.js";import{O as n,a as r,x as i}from"./use-presence-BuFOqE_4.js";import{W as a,n as o}from"./proxy-Ckz_84jH.js";var s=e(t(),1);function c(e){let t=a(()=>r(e)),{isStatic:n}=(0,s.useContext)(o);if(n){let[,n]=(0,s.useState)(e);(0,s.useEffect)(()=>t.on(`change`,n),[])}return t}var l=`#version 300 es
precision mediump float;

layout(location = 0) in vec4 a_position;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_imageAspectRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;
uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

out vec2 v_objectUV;
out vec2 v_objectBoxSize;
out vec2 v_responsiveUV;
out vec2 v_responsiveBoxGivenSize;
out vec2 v_patternUV;
out vec2 v_patternBoxSize;
out vec2 v_imageUV;

vec3 getBoxSize(float boxRatio, vec2 givenBoxSize) {
  vec2 box = vec2(0.);
  // fit = none
  box.x = boxRatio * min(givenBoxSize.x / boxRatio, givenBoxSize.y);
  float noFitBoxWidth = box.x;
  if (u_fit == 1.) { // fit = contain
    box.x = boxRatio * min(u_resolution.x / boxRatio, u_resolution.y);
  } else if (u_fit == 2.) { // fit = cover
    box.x = boxRatio * max(u_resolution.x / boxRatio, u_resolution.y);
  }
  box.y = box.x / boxRatio;
  return vec3(box, noFitBoxWidth);
}

void main() {
  gl_Position = a_position;

  vec2 uv = gl_Position.xy * .5;
  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * 3.14159265358979323846 / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);


  // ===================================================

  float fixedRatio = 1.;
  vec2 fixedRatioBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );

  v_objectBoxSize = getBoxSize(fixedRatio, fixedRatioBoxGivenSize).xy;
  vec2 objectWorldScale = u_resolution.xy / v_objectBoxSize;

  v_objectUV = uv;
  v_objectUV *= objectWorldScale;
  v_objectUV += boxOrigin * (objectWorldScale - 1.);
  v_objectUV += graphicOffset;
  v_objectUV /= u_scale;
  v_objectUV = graphicRotation * v_objectUV;

  // ===================================================

  v_responsiveBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  float responsiveRatio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
  vec2 responsiveBoxSize = getBoxSize(responsiveRatio, v_responsiveBoxGivenSize).xy;
  vec2 responsiveBoxScale = u_resolution.xy / responsiveBoxSize;

  #ifdef ADD_HELPERS
  v_responsiveHelperBox = uv;
  v_responsiveHelperBox *= responsiveBoxScale;
  v_responsiveHelperBox += boxOrigin * (responsiveBoxScale - 1.);
  #endif

  v_responsiveUV = uv;
  v_responsiveUV *= responsiveBoxScale;
  v_responsiveUV += boxOrigin * (responsiveBoxScale - 1.);
  v_responsiveUV += graphicOffset;
  v_responsiveUV /= u_scale;
  v_responsiveUV.x *= responsiveRatio;
  v_responsiveUV = graphicRotation * v_responsiveUV;
  v_responsiveUV.x /= responsiveRatio;

  // ===================================================

  float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 patternBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  patternBoxRatio = patternBoxGivenSize.x / patternBoxGivenSize.y;

  vec3 boxSizeData = getBoxSize(patternBoxRatio, patternBoxGivenSize);
  v_patternBoxSize = boxSizeData.xy;
  float patternBoxNoFitBoxWidth = boxSizeData.z;
  vec2 patternBoxScale = u_resolution.xy / v_patternBoxSize;

  v_patternUV = uv;
  v_patternUV += graphicOffset / patternBoxScale;
  v_patternUV += boxOrigin;
  v_patternUV -= boxOrigin / patternBoxScale;
  v_patternUV *= u_resolution.xy;
  v_patternUV /= u_pixelRatio;
  if (u_fit > 0.) {
    v_patternUV *= (patternBoxNoFitBoxWidth / v_patternBoxSize.x);
  }
  v_patternUV /= u_scale;
  v_patternUV = graphicRotation * v_patternUV;
  v_patternUV += boxOrigin / patternBoxScale;
  v_patternUV -= boxOrigin;
  // x100 is a default multiplier between vertex and fragmant shaders
  // we use it to avoid UV presision issues
  v_patternUV *= .01;

  // ===================================================

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

  v_imageUV = uv;
  v_imageUV *= imageBoxScale;
  v_imageUV += boxOrigin * (imageBoxScale - 1.);
  v_imageUV += graphicOffset;
  v_imageUV /= u_scale;
  v_imageUV.x *= u_imageAspectRatio;
  v_imageUV = graphicRotation * v_imageUV;
  v_imageUV.x /= u_imageAspectRatio;

  v_imageUV += .5;
  v_imageUV.y = 1. - v_imageUV.y;
}`,u=8294400,d=class{parentElement;canvasElement;gl;program=null;uniformLocations={};fragmentShader;rafId=null;lastRenderTime=0;currentFrame=0;speed=0;currentSpeed=0;providedUniforms;mipmaps=[];hasBeenDisposed=!1;resolutionChanged=!0;textures=new Map;minPixelRatio;maxPixelCount;isSafari=h();uniformCache={};textureUnitMap=new Map;ownerDocument;constructor(e,t,n,r,i=0,a=0,o=2,s=u,c=[]){if(e?.nodeType===1)this.parentElement=e;else throw Error(`Paper Shaders: parent element must be an HTMLElement`);if(this.ownerDocument=e.ownerDocument,!this.ownerDocument.querySelector(`style[data-paper-shader]`)){let e=this.ownerDocument.createElement(`style`);e.innerHTML=m,e.setAttribute(`data-paper-shader`,``),this.ownerDocument.head.prepend(e)}let l=this.ownerDocument.createElement(`canvas`);this.canvasElement=l,this.parentElement.prepend(l),this.fragmentShader=t,this.providedUniforms=n,this.mipmaps=c,this.currentFrame=a,this.minPixelRatio=o,this.maxPixelCount=s;let d=l.getContext(`webgl2`,r);if(!d)throw Error(`Paper Shaders: WebGL is not supported in this browser`);this.gl=d,this.initProgram(),this.setupPositionAttribute(),this.setupUniforms(),this.setUniformValues(this.providedUniforms),this.setupResizeObserver(),visualViewport?.addEventListener(`resize`,this.handleVisualViewportChange),this.setupIntersectionObserver(),this.setSpeed(i),this.parentElement.setAttribute(`data-paper-shader`,``),this.parentElement.paperShaderMount=this,this.ownerDocument.addEventListener(`visibilitychange`,this.handleDocumentVisibilityChange)}initProgram=()=>{let e=p(this.gl,l,this.fragmentShader);e&&(this.program=e)};setupPositionAttribute=()=>{let e=this.gl.getAttribLocation(this.program,`a_position`),t=this.gl.createBuffer();this.gl.bindBuffer(this.gl.ARRAY_BUFFER,t),this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),this.gl.STATIC_DRAW),this.gl.enableVertexAttribArray(e),this.gl.vertexAttribPointer(e,2,this.gl.FLOAT,!1,0,0)};setupUniforms=()=>{let e={u_time:this.gl.getUniformLocation(this.program,`u_time`),u_pixelRatio:this.gl.getUniformLocation(this.program,`u_pixelRatio`),u_resolution:this.gl.getUniformLocation(this.program,`u_resolution`)};Object.entries(this.providedUniforms).forEach(([t,n])=>{if(e[t]=this.gl.getUniformLocation(this.program,t),n instanceof HTMLImageElement){let n=`${t}AspectRatio`;e[n]=this.gl.getUniformLocation(this.program,n)}}),this.uniformLocations=e};renderScale=1;parentWidth=0;parentHeight=0;parentDevicePixelWidth=0;parentDevicePixelHeight=0;devicePixelsSupported=!1;intersectionObserver=null;isInViewport=!0;resizeObserver=null;setupResizeObserver=()=>{this.resizeObserver=new ResizeObserver(([e])=>{if(e?.borderBoxSize[0]){let t=e.devicePixelContentBoxSize?.[0];t!==void 0&&(this.devicePixelsSupported=!0,this.parentDevicePixelWidth=t.inlineSize,this.parentDevicePixelHeight=t.blockSize),this.parentWidth=e.borderBoxSize[0].inlineSize,this.parentHeight=e.borderBoxSize[0].blockSize}this.handleResize()}),this.resizeObserver.observe(this.parentElement)};setupIntersectionObserver=()=>{let e=this.ownerDocument.defaultView;e?.IntersectionObserver&&(this.intersectionObserver=new e.IntersectionObserver(([e])=>{this.isInViewport=e?.isIntersecting??!0,this.updateCurrentSpeed()}),this.intersectionObserver.observe(this.parentElement))};handleVisualViewportChange=()=>{this.resizeObserver?.disconnect(),this.setupResizeObserver()};handleResize=()=>{let e=0,t=0,n=Math.max(1,window.devicePixelRatio),r=visualViewport?.scale??1;if(this.devicePixelsSupported){let i=Math.max(1,this.minPixelRatio/n);e=this.parentDevicePixelWidth*i*r,t=this.parentDevicePixelHeight*i*r}else{let i=Math.max(n,this.minPixelRatio)*r;if(this.isSafari){let e=g(this.ownerDocument);i*=Math.max(1,e)}e=Math.round(this.parentWidth)*i,t=Math.round(this.parentHeight)*i}let i=Math.sqrt(this.maxPixelCount)/Math.sqrt(e*t),a=Math.min(1,i),o=Math.round(e*a),s=Math.round(t*a),c=o/Math.round(this.parentWidth);(this.canvasElement.width!==o||this.canvasElement.height!==s||this.renderScale!==c)&&(this.renderScale=c,this.canvasElement.width=o,this.canvasElement.height=s,this.resolutionChanged=!0,this.gl.viewport(0,0,this.gl.canvas.width,this.gl.canvas.height),this.render(performance.now()))};render=e=>{if(this.hasBeenDisposed)return;if(this.program===null){console.warn(`Tried to render before program or gl was initialized`);return}let t=e-this.lastRenderTime;this.lastRenderTime=e,this.currentSpeed!==0&&(this.currentFrame+=t*this.currentSpeed),this.gl.clear(this.gl.COLOR_BUFFER_BIT),this.gl.useProgram(this.program),this.gl.uniform1f(this.uniformLocations.u_time,this.currentFrame*.001),this.resolutionChanged&&=(this.gl.uniform2f(this.uniformLocations.u_resolution,this.gl.canvas.width,this.gl.canvas.height),this.gl.uniform1f(this.uniformLocations.u_pixelRatio,this.renderScale),!1),this.gl.drawArrays(this.gl.TRIANGLES,0,6),this.currentSpeed===0?this.rafId=null:this.requestRender()};requestRender=()=>{this.rafId!==null&&cancelAnimationFrame(this.rafId),this.rafId=requestAnimationFrame(this.render)};setTextureUniform=(e,t)=>{if(!t.complete||t.naturalWidth===0)throw Error(`Paper Shaders: image for uniform ${e} must be fully loaded`);let n=this.textures.get(e);n&&this.gl.deleteTexture(n),this.textureUnitMap.has(e)||this.textureUnitMap.set(e,this.textureUnitMap.size);let r=this.textureUnitMap.get(e);this.gl.activeTexture(this.gl.TEXTURE0+r);let i=this.gl.createTexture();this.gl.bindTexture(this.gl.TEXTURE_2D,i),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_S,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_T,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.LINEAR),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MAG_FILTER,this.gl.LINEAR),this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA,this.gl.RGBA,this.gl.UNSIGNED_BYTE,t),this.mipmaps.includes(e)&&(this.gl.generateMipmap(this.gl.TEXTURE_2D),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.LINEAR_MIPMAP_LINEAR));let a=this.gl.getError();if(a!==this.gl.NO_ERROR||i===null){console.error(`Paper Shaders: WebGL error when uploading texture:`,a);return}this.textures.set(e,i);let o=this.uniformLocations[e];if(o){this.gl.uniform1i(o,r);let n=`${e}AspectRatio`,i=this.uniformLocations[n];if(i){let e=t.naturalWidth/t.naturalHeight;this.gl.uniform1f(i,e)}}};areUniformValuesEqual=(e,t)=>e===t?!0:Array.isArray(e)&&Array.isArray(t)&&e.length===t.length?e.every((e,n)=>this.areUniformValuesEqual(e,t[n])):!1;setUniformValues=e=>{this.gl.useProgram(this.program),Object.entries(e).forEach(([e,t])=>{let n=t;if(t instanceof HTMLImageElement&&(n=`${t.src.slice(0,200)}|${t.naturalWidth}x${t.naturalHeight}`),this.areUniformValuesEqual(this.uniformCache[e],n))return;this.uniformCache[e]=n;let r=this.uniformLocations[e];if(!r){console.warn(`Uniform location for ${e} not found`);return}if(t instanceof HTMLImageElement)this.setTextureUniform(e,t);else if(Array.isArray(t)){let n=null,i=null;if(t[0]!==void 0&&Array.isArray(t[0])){let r=t[0].length;if(t.every(e=>e.length===r))n=t.flat(),i=r;else{console.warn(`All child arrays must be the same length for ${e}`);return}}else n=t,i=n.length;switch(i){case 2:this.gl.uniform2fv(r,n);break;case 3:this.gl.uniform3fv(r,n);break;case 4:this.gl.uniform4fv(r,n);break;case 9:this.gl.uniformMatrix3fv(r,!1,n);break;case 16:this.gl.uniformMatrix4fv(r,!1,n);break;default:console.warn(`Unsupported uniform array length: ${i}`)}}else typeof t==`number`?this.gl.uniform1f(r,t):typeof t==`boolean`?this.gl.uniform1i(r,+!!t):console.warn(`Unsupported uniform type for ${e}: ${typeof t}`)})};getCurrentFrame=()=>this.currentFrame;setFrame=e=>{this.currentFrame=e,this.lastRenderTime=performance.now(),this.render(performance.now())};setSpeed=(e=1)=>{this.speed=e,this.updateCurrentSpeed()};updateCurrentSpeed=()=>{this.setCurrentSpeed(this.ownerDocument.hidden||!this.isInViewport?0:this.speed)};setCurrentSpeed=e=>{this.currentSpeed=e,this.rafId===null&&e!==0&&(this.lastRenderTime=performance.now(),this.rafId=requestAnimationFrame(this.render)),this.rafId!==null&&e===0&&(cancelAnimationFrame(this.rafId),this.rafId=null)};setMaxPixelCount=(e=u)=>{this.maxPixelCount=e,this.handleResize()};setMinPixelRatio=(e=2)=>{this.minPixelRatio=e,this.handleResize()};setUniforms=e=>{this.setUniformValues(e),this.providedUniforms={...this.providedUniforms,...e},this.render(performance.now())};handleDocumentVisibilityChange=()=>{this.updateCurrentSpeed()};dispose=()=>{this.hasBeenDisposed=!0,this.rafId!==null&&(cancelAnimationFrame(this.rafId),this.rafId=null),this.gl&&this.program&&(this.textures.forEach(e=>{this.gl.deleteTexture(e)}),this.textures.clear(),this.gl.deleteProgram(this.program),this.program=null,this.gl.bindBuffer(this.gl.ARRAY_BUFFER,null),this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,null),this.gl.bindRenderbuffer(this.gl.RENDERBUFFER,null),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null),this.gl.getError()),this.resizeObserver&&=(this.resizeObserver.disconnect(),null),this.intersectionObserver&&=(this.intersectionObserver.disconnect(),null),visualViewport?.removeEventListener(`resize`,this.handleVisualViewportChange),this.ownerDocument.removeEventListener(`visibilitychange`,this.handleDocumentVisibilityChange),this.uniformLocations={},this.canvasElement.remove(),delete this.parentElement.paperShaderMount}};function f(e,t,n){let r=e.createShader(t);return r?(e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(console.error(`An error occurred compiling the shaders: `+e.getShaderInfoLog(r)),e.deleteShader(r),null)):null}function p(e,t,n){let r=e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT),i=r?r.precision:null;i&&i<23&&(t=t.replace(/precision\s+(lowp|mediump)\s+float;/g,`precision highp float;`),n=n.replace(/precision\s+(lowp|mediump)\s+float/g,`precision highp float`).replace(/\b(uniform|varying|attribute)\s+(lowp|mediump)\s+(\w+)/g,`$1 highp $3`));let a=f(e,e.VERTEX_SHADER,t),o=f(e,e.FRAGMENT_SHADER,n);if(!a||!o)return null;let s=e.createProgram();return s?(e.attachShader(s,a),e.attachShader(s,o),e.linkProgram(s),e.getProgramParameter(s,e.LINK_STATUS)?(e.detachShader(s,a),e.detachShader(s,o),e.deleteShader(a),e.deleteShader(o),s):(console.error(`Unable to initialize the shader program: `+e.getProgramInfoLog(s)),e.deleteProgram(s),e.deleteShader(a),e.deleteShader(o),null)):null}var m=`@layer paper-shaders {
  :where([data-paper-shader]) {
    isolation: isolate;
    position: relative;

    & canvas {
      contain: strict;
      display: block;
      position: absolute;
      inset: 0;
      z-index: -1;
      width: 100%;
      height: 100%;
      border-radius: inherit;
      corner-shape: inherit;
    }
  }
}`;function h(){let e=navigator.userAgent.toLowerCase();return e.includes(`safari`)&&!e.includes(`chrome`)&&!e.includes(`android`)}function g(e){let t=visualViewport?.scale??1,n=visualViewport?.width??window.innerWidth,r=window.innerWidth-e.documentElement.clientWidth,i=t*n+r,a=outerWidth/i,o=Math.round(100*a);return o%5==0?o/100:o===33?1/3:o===67?2/3:o===133?4/3:a}var _={fit:`contain`,scale:1,rotation:0,offsetX:0,offsetY:0,originX:.5,originY:.5,worldWidth:0,worldHeight:0},v={fit:`none`,scale:1,rotation:0,offsetX:0,offsetY:0,originX:.5,originY:.5,worldWidth:0,worldHeight:0},y={none:0,contain:1,cover:2},b=`
#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846
`,x=`
vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
`,S=`
  float hash11(float p) {
    p = fract(p * 0.3183099) + 0.1;
    p *= p + 19.19;
    return fract(p * p);
  }
`,C=`
  float hash21(vec2 p) {
    p = fract(p * vec2(0.3183099, 0.3678794)) + 0.1;
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }
`,w=`
  float randomR(vec2 p) {
    vec2 uv = floor(p) / 100. + .5;
    return texture(u_noiseTexture, fract(uv)).r;
  }
`,T=`
  vec2 randomGB(vec2 p) {
    vec2 uv = floor(p) / 100. + .5;
    return texture(u_noiseTexture, fract(uv)).gb;
  }
`,ee=`
  color += 1. / 256. * (fract(sin(dot(.014 * gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453123) - .5);
`,te=`
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
      dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`,ne=`
float fiberRandom(vec2 p) {
  vec2 uv = floor(p) / 100.;
  return texture(u_noiseTexture, fract(uv)).b;
}

float fiberValueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = fiberRandom(i);
  float b = fiberRandom(i + vec2(1.0, 0.0));
  float c = fiberRandom(i + vec2(0.0, 1.0));
  float d = fiberRandom(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

float fiberNoiseFbm(in vec2 n, vec2 seedOffset) {
  float total = 0.0, amplitude = 1.;
  for (int i = 0; i < 4; i++) {
    n = rotate(n, .7);
    total += fiberValueNoise(n + seedOffset) * amplitude;
    n *= 2.;
    amplitude *= 0.6;
  }
  return total;
}

float fiberNoise(vec2 uv, vec2 seedOffset) {
  float epsilon = 0.001;
  float n1 = fiberNoiseFbm(uv + vec2(epsilon, 0.0), seedOffset);
  float n2 = fiberNoiseFbm(uv - vec2(epsilon, 0.0), seedOffset);
  float n3 = fiberNoiseFbm(uv + vec2(0.0, epsilon), seedOffset);
  float n4 = fiberNoiseFbm(uv - vec2(0.0, epsilon), seedOffset);
  return length(vec2(n1 - n2, n3 - n4)) / (2.0 * epsilon);
}
`,E={maxColorCount:10},re=`#version 300 es
precision mediump float;

uniform float u_time;

uniform vec4 u_colors[${E.maxColorCount}];
uniform float u_colorsCount;

uniform float u_distortion;
uniform float u_swirl;
uniform float u_grainMixer;
uniform float u_grainOverlay;

in vec2 v_objectUV;
out vec4 fragColor;

${b}
${x}
${C}

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

float noise(vec2 n, vec2 seedOffset) {
  return valueNoise(n + seedOffset);
}

vec2 getPosition(int i, float t) {
  float a = float(i) * .37;
  float b = .6 + fract(float(i) / 3.) * .9;
  float c = .8 + fract(float(i + 1) / 4.);

  float x = sin(t * b + a);
  float y = cos(t * c + a * 1.5);

  return .5 + .5 * vec2(x, y);
}

void main() {
  vec2 uv = v_objectUV;
  uv += .5;
  vec2 grainUV = uv * 1000.;

  float grain = noise(grainUV, vec2(0.));
  float mixerGrain = .4 * u_grainMixer * (grain - .5);

  const float firstFrameOffset = 41.5;
  float t = .5 * (u_time + firstFrameOffset);

  float radius = smoothstep(0., 1., length(uv - .5));
  float center = 1. - radius;
  for (float i = 1.; i <= 2.; i++) {
    uv.x += u_distortion * center / i * sin(t + i * .4 * smoothstep(.0, 1., uv.y)) * cos(.2 * t + i * 2.4 * smoothstep(.0, 1., uv.y));
    uv.y += u_distortion * center / i * cos(t + i * 2. * smoothstep(.0, 1., uv.x));
  }

  vec2 uvRotated = uv;
  uvRotated -= vec2(.5);
  float angle = 3. * u_swirl * radius;
  uvRotated = rotate(uvRotated, -angle);
  uvRotated += vec2(.5);

  vec3 color = vec3(0.);
  float opacity = 0.;
  float totalWeight = 0.;

  for (int i = 0; i < ${E.maxColorCount}; i++) {
    if (i >= int(u_colorsCount)) break;

    vec2 pos = getPosition(i, t) + mixerGrain;
    vec3 colorFraction = u_colors[i].rgb * u_colors[i].a;
    float opacityFraction = u_colors[i].a;

    float dist = length(uvRotated - pos);

    dist = pow(dist, 3.5);
    float weight = 1. / (dist + 1e-3);
    color += colorFraction * weight;
    opacity += opacityFraction * weight;
    totalWeight += weight;
  }

  color /= max(1e-4, totalWeight);
  opacity /= max(1e-4, totalWeight);

  float grainOverlay = valueNoise(rotate(grainUV, 1.) + vec2(3.));
  grainOverlay = mix(grainOverlay, valueNoise(rotate(grainUV, 2.) + vec2(-1.)), .5);
  grainOverlay = pow(grainOverlay, 1.3);

  float grainOverlayV = grainOverlay * 2. - 1.;
  vec3 grainOverlayColor = vec3(step(0., grainOverlayV));
  float grainOverlayStrength = u_grainOverlay * abs(grainOverlayV);
  grainOverlayStrength = pow(grainOverlayStrength, .8);
  color = mix(color, grainOverlayColor, .35 * grainOverlayStrength);

  opacity += .5 * grainOverlayStrength;
  opacity = clamp(opacity, 0., 1.);

  fragColor = vec4(color, opacity);
}
`,ie=`#version 300 es
precision mediump float;

uniform float u_time;

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

uniform float u_pxSize;
uniform vec4 u_colorBack;
uniform vec4 u_colorFront;
uniform float u_shape;
uniform float u_type;

out vec4 fragColor;

${te}
${b}
${S}
${C}

float getSimplexNoise(vec2 uv, float t) {
  float noise = .5 * snoise(uv - vec2(0., .3 * t));
  noise += .5 * snoise(2. * uv + vec2(0., .32 * t));

  return noise;
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
  float t = .5 * u_time;

  float pxSize = u_pxSize * u_pixelRatio;
  vec2 pxSizeUV = gl_FragCoord.xy - .5 * u_resolution;
  pxSizeUV /= pxSize;
  vec2 canvasPixelizedUV = (floor(pxSizeUV) + .5) * pxSize;
  vec2 normalizedUV = canvasPixelizedUV / u_resolution;

  vec2 ditheringNoiseUV = canvasPixelizedUV;
  vec2 shapeUV = normalizedUV;

  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * PI / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);

  float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 boxSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  
  if (u_shape > 3.5) {
    vec2 objectBoxSize = vec2(0.);
    // fit = none
    objectBoxSize.x = min(boxSize.x, boxSize.y);
    if (u_fit == 1.) { // fit = contain
      objectBoxSize.x = min(u_resolution.x, u_resolution.y);
    } else if (u_fit == 2.) { // fit = cover
      objectBoxSize.x = max(u_resolution.x, u_resolution.y);
    }
    objectBoxSize.y = objectBoxSize.x;
    vec2 objectWorldScale = u_resolution.xy / objectBoxSize;

    shapeUV *= objectWorldScale;
    shapeUV += boxOrigin * (objectWorldScale - 1.);
    shapeUV += vec2(-u_offsetX, u_offsetY);
    shapeUV /= u_scale;
    shapeUV = graphicRotation * shapeUV;
  } else {
    vec2 patternBoxSize = vec2(0.);
    // fit = none
    patternBoxSize.x = patternBoxRatio * min(boxSize.x / patternBoxRatio, boxSize.y);
    float patternWorldNoFitBoxWidth = patternBoxSize.x;
    if (u_fit == 1.) { // fit = contain
      patternBoxSize.x = patternBoxRatio * min(u_resolution.x / patternBoxRatio, u_resolution.y);
    } else if (u_fit == 2.) { // fit = cover
      patternBoxSize.x = patternBoxRatio * max(u_resolution.x / patternBoxRatio, u_resolution.y);
    }
    patternBoxSize.y = patternBoxSize.x / patternBoxRatio;
    vec2 patternWorldScale = u_resolution.xy / patternBoxSize;

    shapeUV += vec2(-u_offsetX, u_offsetY) / patternWorldScale;
    shapeUV += boxOrigin;
    shapeUV -= boxOrigin / patternWorldScale;
    shapeUV *= u_resolution.xy;
    shapeUV /= u_pixelRatio;
    if (u_fit > 0.) {
      shapeUV *= (patternWorldNoFitBoxWidth / patternBoxSize.x);
    }
    shapeUV /= u_scale;
    shapeUV = graphicRotation * shapeUV;
    shapeUV += boxOrigin / patternWorldScale;
    shapeUV -= boxOrigin;
    shapeUV += .5;
  }

  float shape = 0.;
  if (u_shape < 1.5) {
    // Simplex noise
    shapeUV *= .001;

    shape = 0.5 + 0.5 * getSimplexNoise(shapeUV, t);
    shape = smoothstep(0.3, 0.9, shape);

  } else if (u_shape < 2.5) {
    // Warp
    shapeUV *= .003;

    for (float i = 1.0; i < 6.0; i++) {
      shapeUV.x += 0.6 / i * cos(i * 2.5 * shapeUV.y + t);
      shapeUV.y += 0.6 / i * cos(i * 1.5 * shapeUV.x + t);
    }

    shape = .15 / max(0.001, abs(sin(t - shapeUV.y - shapeUV.x)));
    shape = smoothstep(0.02, 1., shape);

  } else if (u_shape < 3.5) {
    // Dots
    shapeUV *= .05;

    float stripeIdx = floor(2. * shapeUV.x / TWO_PI);
    float rand = hash11(stripeIdx * 10.);
    rand = sign(rand - .5) * pow(.1 + abs(rand), .4);
    shape = sin(shapeUV.x) * cos(shapeUV.y - 5. * rand * t);
    shape = pow(abs(shape), 6.);

  } else if (u_shape < 4.5) {
    // Sine wave
    shapeUV *= 4.;

    float wave = cos(.5 * shapeUV.x - 2. * t) * sin(1.5 * shapeUV.x + t) * (.75 + .25 * cos(3. * t));
    shape = 1. - smoothstep(-1., 1., shapeUV.y + wave);

  } else if (u_shape < 5.5) {
    // Ripple

    float dist = length(shapeUV);
    float waves = sin(pow(dist, 1.7) * 7. - 3. * t) * .5 + .5;
    shape = waves;

  } else if (u_shape < 6.5) {
    // Swirl

    float l = length(shapeUV);
    float angle = 6. * atan(shapeUV.y, shapeUV.x) + 4. * t;
    float twist = 1.2;
    float offset = 1. / pow(max(l, 1e-6), twist) + angle / TWO_PI;
    float mid = smoothstep(0., 1., pow(l, twist));
    shape = mix(0., fract(offset), mid);

  } else {
    // Sphere
    shapeUV *= 2.;

    float d = 1. - pow(length(shapeUV), 2.);
    vec3 pos = vec3(shapeUV, sqrt(max(0., d)));
    vec3 lightPos = normalize(vec3(cos(1.5 * t), .8, sin(1.25 * t)));
    shape = .5 + .5 * dot(lightPos, pos);
    shape *= step(0., d);
  }


  int type = int(floor(u_type));
  float dithering = 0.0;

  switch (type) {
    case 1: {
      dithering = step(hash21(ditheringNoiseUV), shape);
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

  dithering -= .5;
  float res = step(.5, shape + dithering);

  vec3 fgColor = u_colorFront.rgb * u_colorFront.a;
  float fgOpacity = u_colorFront.a;
  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  float bgOpacity = u_colorBack.a;

  vec3 color = fgColor * res;
  float opacity = fgOpacity * res;

  color += bgColor * (1. - opacity);
  opacity += bgOpacity * (1. - opacity);

  fragColor = vec4(color, opacity);
}
`,ae={simplex:1,warp:2,dots:3,wave:4,ripple:5,swirl:6,sphere:7},D={random:1,"2x2":2,"4x4":3,"8x8":4};function O(e){if(Array.isArray(e))return e.length===4?e:e.length===3?[...e,1]:M;if(typeof e!=`string`)return M;let t,n,r,i=1;if(e.startsWith(`#`))[t,n,r,i]=k(e);else if(e.startsWith(`rgb`)){let a=oe(e);if(a===null)return M;[t,n,r,i]=a}else if(e.startsWith(`hsl`)){let a=se(e);if(a===null)return M;[t,n,r,i]=A(a)}else return console.error(`Unsupported color format`,e),M;return[j(t,0,1),j(n,0,1),j(r,0,1),j(i,0,1)]}function k(e){return e=e.replace(/^#/,``),(e.length===3||e.length===4)&&(e=e.split(``).map(e=>e+e).join(``)),e.length===6&&(e+=`ff`),/^[0-9a-f]{8}$/i.test(e)?[parseInt(e.slice(0,2),16)/255,parseInt(e.slice(2,4),16)/255,parseInt(e.slice(4,6),16)/255,parseInt(e.slice(6,8),16)/255]:(console.warn(`Invalid hex color`),M)}function oe(e){let t=e.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+))?\s*\)$/i);return t?[parseInt(t[1]??`0`)/255,parseInt(t[2]??`0`)/255,parseInt(t[3]??`0`)/255,t[4]===void 0?1:parseFloat(t[4])]:null}function se(e){let t=e.match(/^hsla?\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*([0-9.]+))?\s*\)$/i);return t?[parseInt(t[1]??`0`),parseInt(t[2]??`0`),parseInt(t[3]??`0`),t[4]===void 0?1:parseFloat(t[4])]:null}function A(e){let[t,n,r,i]=e,a=t/360,o=n/100,s=r/100,c,l,u;if(n===0)c=l=u=s;else{let e=(e,t,n)=>(n<0&&(n+=1),n>1&&--n,n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*(2/3-n)*6:e),t=s<.5?s*(1+o):s+o-s*o,n=2*s-t;c=e(n,t,a+1/3),l=e(n,t,a),u=e(n,t,a-1/3)}return[c,l,u,i]}var j=(e,t,n)=>Math.min(Math.max(e,t),n),M=[.5,.5,.5,1];function ce(e){let t=s.useRef(void 0),n=s.useCallback(t=>{let n=e.map(e=>{if(e!=null){if(typeof e==`function`){let n=e,r=n(t);return typeof r==`function`?r:()=>{n(null)}}return e.current=t,()=>{e.current=null}}});return()=>{n.forEach(e=>e?.())}},e);return s.useMemo(()=>e.every(e=>e==null)?null:e=>{t.current&&=(t.current(),void 0),e!=null&&(t.current=n(e))},e)}function N(e){if(e.naturalWidth<1024&&e.naturalHeight<1024){if(e.naturalWidth<1||e.naturalHeight<1)return;let t=e.naturalWidth/e.naturalHeight;e.width=Math.round(t>1?1024*t:1024),e.height=Math.round(t>1?1024:1024/t)}}var P=i();async function F(e){let t={},n=[],r=e=>{try{return e.startsWith(`/`)||new URL(e),!0}catch{return!1}},i=e=>{try{return!e.startsWith(`/`)&&new URL(e,window.location.origin).origin!==window.location.origin}catch{return!1}};return Object.entries(e).forEach(([e,a])=>{if(typeof a==`string`){let o=a||`data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==`;if(!r(o)){console.warn(`Uniform "${e}" has invalid URL "${o}". Skipping image loading.`);return}let s=new Promise((n,r)=>{let a=new Image;i(o)&&(a.crossOrigin=`anonymous`),a.onload=()=>{N(a),t[e]=a,n()},a.onerror=()=>{console.error(`Could not set uniforms. Failed to load image at ${o}`),r()},a.src=o});n.push(s)}else if(a instanceof HTMLImageElement){let r=a.decode().then(()=>{N(a),t[e]=a});n.push(r)}else t[e]=a}),await Promise.all(n),t}var I=(0,s.forwardRef)(function({fragmentShader:e,uniforms:t,webGlContextAttributes:n,speed:r=0,frame:i=0,width:a,height:o,minPixelRatio:c,maxPixelCount:l,mipmaps:u,style:f,...p},m){let[h,g]=(0,s.useState)(!1),_=(0,s.useRef)(null),v=(0,s.useRef)(null),y=(0,s.useRef)(n);(0,s.useEffect)(()=>((async()=>{let n=await F(t);_.current&&!v.current&&(v.current=new d(_.current,e,n,y.current,r,i,c,l,u),g(!0))})(),()=>{v.current?.dispose(),v.current=null}),[e]),(0,s.useEffect)(()=>{let e=!1;return(async()=>{let n=await F(t);e||v.current?.setUniforms(n)})(),()=>{e=!0}},[t,h]),(0,s.useEffect)(()=>{v.current?.setSpeed(r)},[r,h]),(0,s.useEffect)(()=>{v.current?.setMaxPixelCount(l)},[l,h]),(0,s.useEffect)(()=>{v.current?.setMinPixelRatio(c)},[c,h]),(0,s.useEffect)(()=>{v.current?.setFrame(i)},[i,h]);let b=ce([_,m]);return(0,P.jsx)(`div`,{ref:b,style:a!==void 0||o!==void 0?{width:typeof a==`string`&&isNaN(+a)===!1?+a:a,height:typeof o==`string`&&isNaN(+o)===!1?+o:o,...f}:f,...p})});I.displayName=`ShaderMount`;function L(e,t){if(Object.keys(e).length!==Object.keys(t).length)return!1;for(let n in e){if(n===`colors`){let n=Array.isArray(e.colors),r=Array.isArray(t.colors);if(!n||!r){if(Object.is(e.colors,t.colors)===!1)return!1;continue}if(e.colors?.length!==t.colors?.length||!e.colors?.every((e,n)=>e===t.colors?.[n]))return!1;continue}if(Object.is(e[n],t[n])===!1)return!1}return!0}var R={name:`Default`,params:{..._,speed:1,frame:0,colors:[`#e0eaff`,`#241d9a`,`#f75092`,`#9f50d3`],distortion:.8,swirl:.1,grainMixer:0,grainOverlay:0}};({..._}),{..._},{..._};var le=(0,s.memo)(function({speed:e=R.params.speed,frame:t=R.params.frame,colors:n=R.params.colors,distortion:r=R.params.distortion,swirl:i=R.params.swirl,grainMixer:a=R.params.grainMixer,grainOverlay:o=R.params.grainOverlay,fit:s=R.params.fit,rotation:c=R.params.rotation,scale:l=R.params.scale,originX:u=R.params.originX,originY:d=R.params.originY,offsetX:f=R.params.offsetX,offsetY:p=R.params.offsetY,worldWidth:m=R.params.worldWidth,worldHeight:h=R.params.worldHeight,...g}){let _={u_colors:n.map(O),u_colorsCount:n.length,u_distortion:r,u_swirl:i,u_grainMixer:a,u_grainOverlay:o,u_fit:y[s],u_rotation:c,u_scale:l,u_offsetX:f,u_offsetY:p,u_originX:u,u_originY:d,u_worldWidth:m,u_worldHeight:h};return(0,P.jsx)(I,{...g,speed:e,frame:t,fragmentShader:re,uniforms:_})},L),z={name:`Default`,params:{...v,speed:1,frame:0,scale:.6,colorBack:`#000000`,colorFront:`#00b2ff`,shape:`sphere`,type:`4x4`,size:2}};({...v}),{...v},{..._},{..._},{..._};var ue=(0,s.memo)(function({speed:e=z.params.speed,frame:t=z.params.frame,colorBack:n=z.params.colorBack,colorFront:r=z.params.colorFront,shape:i=z.params.shape,type:a=z.params.type,pxSize:o,size:s=o===void 0?z.params.size:o,fit:c=z.params.fit,scale:l=z.params.scale,rotation:u=z.params.rotation,originX:d=z.params.originX,originY:f=z.params.originY,offsetX:p=z.params.offsetX,offsetY:m=z.params.offsetY,worldWidth:h=z.params.worldWidth,worldHeight:g=z.params.worldHeight,..._}){let v={u_colorBack:O(n),u_colorFront:O(r),u_shape:ae[i],u_type:D[a],u_pxSize:s,u_fit:y[c],u_scale:l,u_rotation:u,u_offsetX:p,u_offsetY:m,u_originX:d,u_originY:f,u_worldWidth:h,u_worldHeight:g};return(0,P.jsx)(I,{..._,speed:e,frame:t,fragmentShader:ie,uniforms:v})}),B=4,V=128,H=(e,t)=>{let n=255,r=0;for(let i of e)n=Math.min(n,i[t]),r=Math.max(r,i[t]);return r-n},de=e=>{if(e.colors.length<2)return null;let t={r:H(e.colors,`r`),g:H(e.colors,`g`),b:H(e.colors,`b`)},n=Object.keys(t).reduce((e,n)=>t[n]>t[e]?n:e,`r`),r=[...e.colors].sort((e,t)=>e[n]-t[n]),i=e.weight/2,a=0,o=1;for(let e=0;e<r.length-1&&(a+=r[e].weight,o=e+1,!(a>=i));e+=1);let s=r.slice(0,o),c=r.slice(o);return[{colors:s,weight:s.reduce((e,t)=>e+t.weight,0)},{colors:c,weight:c.reduce((e,t)=>e+t.weight,0)}]},fe=e=>{let t=e.colors.reduce((e,t)=>({r:e.r+t.r*t.weight,g:e.g+t.g*t.weight,b:e.b+t.b*t.weight}),{r:0,g:0,b:0});return{r:Math.round(t.r/e.weight),g:Math.round(t.g/e.weight),b:Math.round(t.b/e.weight),weight:e.weight}},pe=({r:e,g:t,b:n})=>`#${e.toString(16).padStart(2,`0`)}${t.toString(16).padStart(2,`0`)}${n.toString(16).padStart(2,`0`)}`,U=(e,t=5)=>{if(t<=0)return[];let n=new Map;for(let t=0;t<e.length;t+=4){if(e[t+3]<V)continue;let r=e[t],i=e[t+1],a=e[t+2],o=r>>B<<8|i>>B<<4|a>>B,s=n.get(o);s?(s.r+=r,s.g+=i,s.b+=a,s.weight+=1):n.set(o,{r,g:i,b:a,weight:1})}let r=[...n.values()].map(e=>({r:Math.round(e.r/e.weight),g:Math.round(e.g/e.weight),b:Math.round(e.b/e.weight),weight:e.weight}));if(r.length===0)return[];let i=[{colors:r,weight:r.reduce((e,t)=>e+t.weight,0)}];for(;i.length<Math.min(t,r.length);){let e=-1,t=-1;for(let n=0;n<i.length;n+=1){let r=i[n];if(r.colors.length<2)continue;let a=Math.max(H(r.colors,`r`),H(r.colors,`g`),H(r.colors,`b`))*Math.sqrt(r.weight);a>t&&(t=a,e=n)}if(e<0)break;let n=de(i[e]);if(!n)break;i.splice(e,1,...n)}return i.map(fe).sort((e,t)=>t.weight-e.weight).map(pe)},W=(e,{silent:t=!1}={})=>new Promise(n=>{let r=new Image;r.crossOrigin=`Anonymous`,r.onload=()=>{let e=document.createElement(`canvas`),i=e.getContext(`2d`);if(!i){n(null);return}e.width=50,e.height=50;try{i.drawImage(r,0,0,50,50),n(i.getImageData(0,0,50,50).data)}catch(e){t||console.warn(`Failed to read image pixels for color extraction`,e),n(null)}},r.onerror=e=>{t||console.warn(`Failed to load image for color extraction`,e),n(null)},r.src=e}),me=(e,t)=>{let n=[];for(let t=0;t<e.length;t+=8){let r=e[t],i=e[t+1],a=e[t+2];if(e[t+3]<128)continue;let o=Math.max(r,i,a),s=Math.min(r,i,a),c=(o+s)/2;((o===s?0:(o-s)/(255-Math.abs(o+s-255)))>.2&&c>30&&c<220||n.length<100)&&n.push({r,g:i,b:a})}n.sort((e,t)=>{let n=(Math.max(e.r,e.g,e.b)-Math.min(e.r,e.g,e.b))/255;return(Math.max(t.r,t.g,t.b)-Math.min(t.r,t.g,t.b))/255-n});let r=[];for(let e of n){if(r.length>=t)break;(r.every(t=>Math.sqrt((e.r-t.r)**2+(e.g-t.g)**2+(e.b-t.b)**2)>20)||r.length===0)&&r.push(e)}return r.map(e=>`#${e.r.toString(16).padStart(2,`0`)}${e.g.toString(16).padStart(2,`0`)}${e.b.toString(16).padStart(2,`0`)}`)},he=async(e,t=5)=>{let n=await W(e);return n?me(n,t):[]},G=async(e,t=5)=>{let n=await W(e);return n?U(n,t):[]},K=(e,t,n)=>{let r=e.setUniformValues;if(n&&typeof r==`function`){r(t);return}e.setUniforms(t)},q=Object.freeze({antialias:!1,depth:!1}),J=e=>(t=>{if(e.current=t,t)return()=>{e.current=null;let n=t.paperShaderMount?.canvasElement;if(!n)return;let r=n.getContext(`webgl2`);queueMicrotask(()=>{!r||n.isConnected||r.isContextLost()||r.getExtension(`WEBGL_lose_context`)?.loseContext()})}}),Y=921600,ge=.12,X=e=>Math.min(1,Math.max(0,e/255)),_e=e=>Math.min(2,Math.max(0,e)),Z=e=>Math.min(1,Math.max(0,e)),Q=(e,t,n)=>e+(t-e)*n,ve=(e,t,n,r,i)=>(X(e)*.22+X(t)*.18+X(n)*.22+X(r)*.28+X(i)*.1)**.55,ye=(e,t,n)=>Math.max(n*.84,Z((e-t)*7)),be=(e,t)=>Z(e*.42+t*.85),xe=(e,t,n)=>n?be(e,t):Z(e),$=(e,t,n,r)=>_e(r?e*ge:Q(e,t,n)),Se=(e,t,n)=>{let r=e[0]??t.secondaryColor;if(n===`cover-only`){let t=e[1]??r,n=e[2]??t;return{ditheringBack:n,ditheringFront:r,mesh:[r,t,n,e[3]??r,e[4]??t,e[5]??n]}}let i=e[1]??t.primaryColor,a=e[2]??r,o=e[3]??i;return{ditheringBack:t.backgroundColor,ditheringFront:r,mesh:[r,i,a,o,t.backgroundColor,t.accentColor]}},Ce=s.memo(({theme:e,coverUrl:t,audioPower:r,audioBands:i,staticMode:a,paused:o,tuning:c})=>{let l=(0,s.useRef)(null),u=(0,s.useRef)(null),d=(0,s.useMemo)(()=>J(l),[]),f=(0,s.useMemo)(()=>J(u),[]),p=(0,s.useRef)(null),m=(0,s.useRef)(null),h=(0,s.useRef)(o),[g,_]=(0,s.useState)([]),v=c??n,y=v.displayMode!==`mesh`,b=v.displayMode!==`dithering`;h.current=o,(0,s.useEffect)(()=>{let e=!0;return t?(G(t,6).then(t=>{e&&_(t)}),()=>{e=!1}):(_([]),()=>{e=!1})},[t]);let x=(0,s.useMemo)(()=>Se(g,e,v.colorSource),[g,e,v.colorSource]);return(0,s.useEffect)(()=>{let e=l.current?.paperShaderMount,t=u.current?.paperShaderMount;if(a){e?.setSpeed(0),t?.setSpeed(0);return}let n=0,o=new WeakMap,s=(e,t,n)=>{let r=o.get(e);r||(r={},o.set(e,r)),r[t]!==n&&(r[t]=n,e.style[t]=n)},c=0,d=0,f=0,g=0,_=0,y=0,x=()=>{let e=h.current,t=e?0:X(r.get()),a=e?0:X(i.bass.get()),o=e?0:ve(i.bass.get(),i.lowMid.get(),i.mid.get(),i.vocal.get(),i.treble.get()),S=e?0:X(Math.max(i.mid.get(),i.vocal.get()));c=Q(c,t,.12),d=Q(d,a,.16),f=Q(f,S,.13),y=v.enhancedBeatResponse?ye(o,_,y):0,_=o;let C=xe(o,y,v.enhancedBeatResponse);g=Q(g,C,C>g?.42:.14);let w=l.current?.paperShaderMount,T=u.current?.paperShaderMount;if(w){let t=$(v.ditheringSpeed,v.ditheringAudioSpeed,g,e);w.setSpeed(t),K(w,{u_pxSize:Math.max(.5,v.ditheringSize-d*v.ditheringSize*.34)},t!==0)}if(T){let t=$(v.meshSpeed,v.meshAudioSpeed,g,e);T.setSpeed(t),K(T,{u_distortion:v.meshDistortion+c*.62,u_swirl:v.meshSwirl+f*.38},t!==0)}p.current&&(s(p.current,`opacity`,b?`${Math.min(1,v.ditheringOpacity+d*.25)}`:`1`),s(p.current,`transform`,`scale(${1.015+d*.025})`)),m.current&&(s(m.current,`filter`,`saturate(${1.04+f*.34}) brightness(${.94+c*.16})`),s(m.current,`transform`,`scale(${1.025+c*.018})`)),n=requestAnimationFrame(x)};return n=requestAnimationFrame(x),()=>cancelAnimationFrame(n)},[i,r,b,a,v]),(0,P.jsxs)(`div`,{className:`absolute inset-0 z-0 overflow-hidden`,style:{backgroundColor:e.backgroundColor,pointerEvents:`none`},children:[b&&(0,P.jsx)(`div`,{ref:m,className:`absolute inset-0`,style:{transform:`scale(1.025)`,transformOrigin:`center`},children:(0,P.jsx)(le,{ref:f,width:`100%`,height:`100%`,colors:x.mesh,distortion:v.meshDistortion,swirl:v.meshSwirl,grainMixer:0,grainOverlay:.01,speed:a?0:$(v.meshSpeed,v.meshAudioSpeed,0,o),minPixelRatio:1,maxPixelCount:Y,webGlContextAttributes:q,style:{width:`100%`,height:`100%`}})}),y&&(0,P.jsx)(`div`,{ref:p,className:`absolute inset-0`,style:{mixBlendMode:b?`soft-light`:`normal`,opacity:b?v.ditheringOpacity:1,transform:`scale(1.015)`,transformOrigin:`center`},children:(0,P.jsx)(ue,{ref:d,width:`100%`,height:`100%`,colorBack:x.ditheringBack,colorFront:x.ditheringFront,shape:`warp`,type:`4x4`,size:v.ditheringSize,speed:a?0:$(v.ditheringSpeed,v.ditheringAudioSpeed,0,o),minPixelRatio:1,maxPixelCount:Y,webGlContextAttributes:q,style:{width:`100%`,height:`100%`}})}),v.overlayEnabled&&v.overlayOpacity>0&&(0,P.jsx)(`div`,{className:`absolute inset-0`,style:{backgroundColor:e.backgroundColor,opacity:v.overlayOpacity}})]})});export{y as _,W as a,O as c,b as d,ne as f,w as g,T as h,G as i,D as l,x as m,K as n,L as o,C as p,he as r,I as s,Ce as t,ee as u,_ as v,c as y};