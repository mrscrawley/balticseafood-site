import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { applyI18n, T, tr } from './i18n.js?v=1794923498';
import { setupHookCursor } from './cursor.js?v=1794923498';
import { setupTransitions } from './transition.js?v=1794923498';

applyI18n();
setupTransitions();

/* =========================================================
   Балтийские Морепродукты — сцена, скролл и моушен
   ========================================================= */

const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
const isMobile = innerWidth < 900;
// слабое устройство: телефон или мало памяти/ядер — облегчённая сцена
const isLow = isMobile || (navigator.deviceMemory || 8) <= 4 || (navigator.hardwareConcurrency || 8) <= 4;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);

gsap.registerPlugin(ScrollTrigger);

/* ---------- Плавный скролл ---------- */
const lenis = new Lenis({
  duration: 1.35,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  wheelMultiplier: 0.9,
});
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop();
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
scrollTo(0, 0);

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const el = id === '#top' ? 0 : document.querySelector(id);
    if (el === null) return;
    e.preventDefault();
    lenis.scrollTo(el, { duration: 2.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
  });
});

/* ---------- Шапка: стеклянная подложка при скролле, прячется вниз / появляется вверх ---------- */
const navEl = document.querySelector('.nav');
let navLast = 0;
lenis.on('scroll', ({ scroll }) => {
  navEl.classList.toggle('is-scrolled', scroll > 40);
  const down = scroll > navLast + 2, up = scroll < navLast - 2;
  if (down && scroll > innerHeight * 0.8) navEl.classList.add('is-hidden');
  else if (up) navEl.classList.remove('is-hidden');
  navLast = scroll;
});

/* ---------- Мышь ---------- */
const mouse = { x: 0, y: 0, sx: 0, sy: 0, px: innerWidth / 2, py: innerHeight / 2 };
addEventListener('pointermove', (e) => {
  mouse.px = e.clientX; mouse.py = e.clientY;
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = (e.clientY / innerHeight) * 2 - 1;
});

/* =========================================================
   1. МОРЕ: небо, волны Герстнера, подводный мир
   ========================================================= */
const seaCanvas = document.getElementById('sea');
const renderer = new THREE.WebGLRenderer({ canvas: seaCanvas, antialias: !isMobile, powerPreference: 'high-performance' });
let seaPR = Math.min(devicePixelRatio, isLow ? 1 : 1.6);
renderer.setPixelRatio(seaPR);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 2.2, 10);

const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const C = {
  skyTop: new THREE.Color('#060b10'),
  horizon: new THREE.Color('#3f5767'),
  sun: new THREE.Color('#f2dcb0'),
  deep: new THREE.Color('#041018'),
  shallow: new THREE.Color('#1b4250'),
  underFog: new THREE.Color('#05202a'),
  abyss: new THREE.Color('#020a10'),
};
const sunDir = new THREE.Vector3(0.15, 0.07, -1).normalize();
const fogColor = new THREE.Color();
scene.fog = new THREE.FogExp2(fogColor, 0.02);

// Небо
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: {
    uTop: { value: C.skyTop }, uHorizon: { value: C.horizon }, uSun: { value: C.sun }, uSunDir: { value: sunDir },
    uUnder: { value: 0 }, uFog: { value: fogColor },
  },
  vertexShader: /* glsl */`
    varying vec3 vDir;
    void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform vec3 uTop, uHorizon, uSun, uSunDir, uFog;
    uniform float uUnder;
    varying vec3 vDir;
    void main(){
      vec3 d = normalize(vDir);
      float h = d.y;
      vec3 col = mix(uHorizon, uTop, smoothstep(-0.02, 0.5, h));
      float s = max(dot(d, uSunDir), 0.0);
      col += uSun * (pow(s, 900.0) * 3.0 + pow(s, 40.0) * 0.35 + pow(s, 6.0) * 0.08);
      // под водой: та же толща воды, светлее к поверхности
      vec3 water = uFog * (0.75 + 0.6 * smoothstep(-0.6, 0.9, h));
      col = mix(col, water, uUnder);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyMat);
sky.frustumCulled = false;
scene.add(sky);

// Океан
const seg = isLow ? 128 : 256;
const oceanGeo = new THREE.PlaneGeometry(420, 420, seg, seg);
oceanGeo.rotateX(-Math.PI / 2);
const oceanMat = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: {
    uTime: { value: 0 }, uCam: { value: camera.position }, uSunDir: { value: sunDir },
    uDeep: { value: C.deep }, uShallow: { value: C.shallow }, uSky: { value: C.horizon }, uSkyTop: { value: C.skyTop },
    uSun: { value: C.sun }, uFog: { value: fogColor }, uFogDensity: { value: 0.02 },
    uRipples: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, -100, 0)) },
  },
  vertexShader: /* glsl */`
    uniform float uTime;
    uniform vec4 uRipples[8];   // x, z, время старта, сила
    varying vec3 vWorld;
    varying vec3 vN;
    // кольца ряби от курсора: бегущая волна с затуханием по расстоянию и времени
    float ripples(vec2 q){
      float h = 0.0;
      for (int i = 0; i < 8; i++) {
        vec4 r = uRipples[i];
        float age = uTime - r.z;
        if (age < 0.0 || age > 4.0) continue;
        float d = length(q - r.xy);
        float front = age * 2.6;
        float env = smoothstep(front + 0.8, front - 0.6, d) * exp(-d * 0.16) * exp(-age * 0.7);
        h += sin(d * 2.4 - age * 6.5) * env * r.w;
      }
      return h * 0.34;
    }
    vec3 gerstner(vec4 w, vec3 p, inout vec3 T, inout vec3 B){
      float steep = w.z; float k = 6.28318 / w.w; float c = sqrt(9.8 / k);
      vec2 d = normalize(w.xy);
      float f = k * (dot(d, p.xz) - c * uTime);
      float a = steep / k;
      T += vec3(-d.x * d.x * steep * sin(f), d.x * steep * cos(f), -d.x * d.y * steep * sin(f));
      B += vec3(-d.x * d.y * steep * sin(f), d.y * steep * cos(f), -d.y * d.y * steep * sin(f));
      return vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
    }
    void main(){
      vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
      vec3 T = vec3(1.0, 0.0, 0.0), B = vec3(0.0, 0.0, 1.0);
      vec3 o = vec3(0.0);
      o += gerstner(vec4(1.0, 0.55, 0.16, 16.0), p, T, B);
      o += gerstner(vec4(-0.35, 1.0, 0.13, 9.0), p, T, B);
      o += gerstner(vec4(0.75, -0.3, 0.10, 5.0), p, T, B);
      o += gerstner(vec4(-0.8, -0.45, 0.07, 2.7), p, T, B);
      o += gerstner(vec4(0.2, 0.9, 0.05, 1.6), p, T, B);
      // рябь: высота + наклон нормали через конечные разности
      float e = 0.12;
      float h0 = ripples(p.xz);
      T.y += (ripples(p.xz + vec2(e, 0.0)) - h0) / e;
      B.y += (ripples(p.xz + vec2(0.0, e)) - h0) / e;
      o.y += h0;
      p += o;
      vN = normalize(cross(B, T));
      vWorld = p;
      gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 uCam, uSunDir, uDeep, uShallow, uSky, uSkyTop, uSun, uFog;
    uniform float uFogDensity, uTime;
    varying vec3 vWorld;
    varying vec3 vN;
    void main(){
      vec3 n = normalize(vN);
      vec3 v = normalize(uCam - vWorld);
      vec3 col;
      if (gl_FrontFacing) {
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
        vec3 r = reflect(-v, n);
        vec3 skyc = mix(uSky, uSkyTop, smoothstep(0.0, 0.5, r.y));
        float sp = max(dot(r, uSunDir), 0.0);
        float spec = pow(sp, 350.0) * 6.0 + pow(sp, 30.0) * 0.25;
        float crest = smoothstep(0.1, 0.9, vWorld.y);
        vec3 water = mix(uDeep, uShallow, 0.25 + crest * 0.55);
        col = mix(water, skyc, fres) + uSun * spec;
      } else {
        // вид на поверхность снизу: окно Снелла
        float up = pow(max(dot(-n, v), 0.0), 3.0);
        col = mix(uDeep * 1.4, uShallow * 2.6 + uSun * 0.35, up);
      }
      float d = length(uCam - vWorld);
      float f = 1.0 - exp(-pow(uFogDensity * d, 1.35) * 1.4);
      col = mix(col, uFog, f);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.frustumCulled = false;
scene.add(ocean);

// Подводная взвесь
const PN = isLow ? 700 : 2200;
const pPos = new Float32Array(PN * 3);
const pRand = new Float32Array(PN);
for (let i = 0; i < PN; i++) {
  pPos[i * 3] = (Math.random() - 0.5) * 44;
  pPos[i * 3 + 1] = -Math.random() * 26;
  pPos[i * 3 + 2] = -Math.random() * 46 + 8;
  pRand[i] = Math.random();
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('aRand', new THREE.BufferAttribute(pRand, 1));
const pMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
  vertexShader: /* glsl */`
    uniform float uTime, uPR;
    attribute float aRand;
    varying float vA;
    void main(){
      vec3 p = position;
      p.y = mod(p.y + uTime * (0.08 + aRand * 0.18), 26.0) - 26.0;
      p.x += sin(uTime * 0.3 + aRand * 30.0) * 0.4;
      p.z += cos(uTime * 0.25 + aRand * 20.0) * 0.3;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = (1.2 + aRand * 2.6) * uPR * (22.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
      vA = smoothstep(42.0, 3.0, -mv.z) * smoothstep(0.5, 2.0, -mv.z) * (0.4 + aRand * 0.6);
    }`,
  fragmentShader: /* glsl */`
    uniform float uOpacity;
    varying float vA;
    void main(){
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, d);
      gl_FragColor = vec4(0.72, 0.88, 0.92, a * vA * uOpacity);
    }`,
});
const plankton = new THREE.Points(pGeo, pMat);
plankton.frustumCulled = false;
scene.add(plankton);

// Солнечные лучи под водой
const rayMat = (seed) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uSeed: { value: seed } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform float uTime, uOpacity, uSeed;
    varying vec2 vUv;
    void main(){
      float a = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
      a *= pow(vUv.y, 1.8);
      a *= 0.55 + 0.45 * sin(uTime * 0.6 + uSeed * 6.0);
      gl_FragColor = vec4(0.62, 0.86, 0.95, a * uOpacity);
    }`,
});
const rays = new THREE.Group();
for (let i = 0; i < 9; i++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + Math.random() * 2.2, 30), rayMat(Math.random()));
  m.position.set((Math.random() - 0.5) * 26, -15, -10 - Math.random() * 18);
  m.rotation.z = (Math.random() - 0.5) * 0.35 + 0.12;
  m.userData.base = m.rotation.z;
  m.userData.seed = Math.random() * 10;
  rays.add(m);
}
scene.add(rays);

// Стая рыб (инстансы + шейдерное виляние хвостом)
function fishGeometry() {
  const s = new THREE.Shape();
  s.moveTo(1.0, 0);
  s.bezierCurveTo(0.85, 0.26, 0.25, 0.33, -0.45, 0.11);
  s.lineTo(-0.92, 0.34);
  s.quadraticCurveTo(-0.76, 0.0, -0.92, -0.3);
  s.lineTo(-0.45, -0.09);
  s.bezierCurveTo(0.2, -0.27, 0.8, -0.22, 1.0, 0);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.1, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 4, curveSegments: 14,
  });
  g.center();
  g.rotateY(-Math.PI / 2); // нос смотрит в +Z
  g.computeVertexNormals();
  return g;
}
const FN = isLow ? 60 : 160;
const fishUniforms = { uTime: { value: 0 } };
const fishMat = new THREE.MeshStandardMaterial({
  color: '#6f8794', metalness: 0.92, roughness: 0.34, envMap: envTex, envMapIntensity: 0.55,
});
fishMat.onBeforeCompile = (sh) => {
  sh.uniforms.uTime = fishUniforms.uTime;
  sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
     float ph = float(gl_InstanceID) * 1.731;
     float tail = smoothstep(0.35, -1.0, position.z);
     transformed.x += sin(uTime * 8.0 + ph - position.z * 2.6) * 0.16 * (0.18 + tail);`
  );
};
const fish = new THREE.InstancedMesh(fishGeometry(), fishMat, FN);
fish.frustumCulled = false;
scene.add(fish);
const fishData = Array.from({ length: FN }, () => ({
  r: 5 + Math.random() * 7,
  speed: (0.1 + Math.random() * 0.07) * (Math.random() < 0.85 ? 1 : -1),
  phase: Math.random() * Math.PI * 2,
  y: (Math.random() - 0.5) * 3.2,
  wob: Math.random() * Math.PI * 2,
  scale: 0.2 + Math.random() * 0.22,
  ox: 0, oy: 0, oz: 0,
}));
const school = new THREE.Vector3(0, -9, -12);
const dummy = new THREE.Object3D();
const fishPos = (d, t, out) => {
  const a = d.phase + t * d.speed;
  out.set(
    school.x + Math.cos(a) * d.r,
    school.y + d.y + Math.sin(a * 2 + d.wob) * 0.5,
    school.z + Math.sin(a) * d.r * 0.55
  );
  return out;
};
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();

scene.add(new THREE.HemisphereLight('#9fd3e6', '#02080c', 1.4));
const sunLight = new THREE.DirectionalLight('#dff4ff', 2.2);
sunLight.position.set(2, 20, 4);
scene.add(sunLight);

/* ---------- Камера по скроллу ---------- */
const keys = { dive: innerHeight, riseStart: 1e9, riseEnd: 1e9 + 1 };
function computeKeys() {
  keys.dive = innerHeight * 1.05;
  const contact = document.querySelector('.contact');
  const top = contact.getBoundingClientRect().top + (lenis.scroll || scrollY);
  keys.riseEnd = Math.max(top + 10, lenis.limit || document.documentElement.scrollHeight - innerHeight);
  keys.riseStart = Math.max(keys.dive + 10, top - innerHeight * 1.3);
}
ScrollTrigger.addEventListener('refresh', computeKeys);

const intro = { v: 1 };
const cam = { y: 2.2, z: 10 };
function cameraTarget(y) {
  if (y < keys.dive) return { y: lerp(2.2, -7.5, smooth(clamp(y / keys.dive))), z: 10 };
  if (y < keys.riseStart) {
    const t = (y - keys.dive) / (keys.riseStart - keys.dive);
    return { y: lerp(-7.5, -11.5, t), z: lerp(10, -6, t) };
  }
  const t = smooth(clamp((y - keys.riseStart) / (keys.riseEnd - keys.riseStart)));
  return { y: lerp(-11.5, 1.4, t), z: lerp(-6, -10, t) };
}

const depthEl = document.getElementById('depth');
const depthMark = document.querySelector('.depth__mark');
const lookAt = new THREE.Vector3();
const clock = new THREE.Clock();

/* =========================================================
   2. БАНКА КОНСЕРВОВ (отдельная WebGL-сцена)
   ========================================================= */
const PRODUCTS = [
  { l1: T('Шпроты', 'Sprats'), l2: T('в масле', 'in oil'), plate: '#0d2233', plate2: '#1a3a52' },
  { l1: T('Килька', 'Sprat'), l2: T('в томатном соусе', 'in tomato sauce'), plate: '#5a1512', plate2: '#86261e' },
  { l1: T('Печень трески', 'Cod liver'), l2: T('натуральная', 'natural'), plate: '#0f2c27', plate2: '#1d4a40' },
];

const tinCanvas = document.getElementById('tin');
const tinRenderer = new THREE.WebGLRenderer({ canvas: tinCanvas, antialias: true, alpha: true });
tinRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
tinRenderer.toneMapping = THREE.ACESFilmicToneMapping;
tinRenderer.toneMappingExposure = 0.85;
tinRenderer.outputColorSpace = THREE.SRGBColorSpace;
tinRenderer.setClearColor(0x000000, 0);
const tinScene = new THREE.Scene();
tinScene.environment = new THREE.PMREMGenerator(tinRenderer).fromScene(new RoomEnvironment(tinRenderer), 0.04).texture;
const tinCam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
tinCam.position.set(0, 0, 11);

const key = new THREE.DirectionalLight('#ffe3b0', 1.5); key.position.set(4, 5, 6); tinScene.add(key);
const rim = new THREE.DirectionalLight('#7fc4ff', 3.5); rim.position.set(-5, 2, -4); tinScene.add(rim);
const fill = new THREE.DirectionalLight('#ffffff', 0.5); fill.position.set(0, -4, 3); tinScene.add(fill);

const TW = 3.4, TH = 2.2, TR = 0.62;
const shape = new THREE.Shape();
shape.moveTo(-TW / 2 + TR, -TH / 2);
shape.lineTo(TW / 2 - TR, -TH / 2);
shape.quadraticCurveTo(TW / 2, -TH / 2, TW / 2, -TH / 2 + TR);
shape.lineTo(TW / 2, TH / 2 - TR);
shape.quadraticCurveTo(TW / 2, TH / 2, TW / 2 - TR, TH / 2);
shape.lineTo(-TW / 2 + TR, TH / 2);
shape.quadraticCurveTo(-TW / 2, TH / 2, -TW / 2, TH / 2 - TR);
shape.lineTo(-TW / 2, -TH / 2 + TR);
shape.quadraticCurveTo(-TW / 2, -TH / 2, -TW / 2 + TR, -TH / 2);
const tinGeo = new THREE.ExtrudeGeometry(shape, {
  depth: 0.62, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.08, bevelSegments: 8, curveSegments: 48,
});
tinGeo.center();

const labelCanvas = document.createElement('canvas');
labelCanvas.width = 1360; labelCanvas.height = 880;
const lctx = labelCanvas.getContext('2d');
const labelTex = new THREE.CanvasTexture(labelCanvas);
labelTex.colorSpace = THREE.SRGBColorSpace;
labelTex.anisotropy = tinRenderer.capabilities.getMaxAnisotropy();
labelTex.repeat.set(1 / TW, 1 / TH);
labelTex.offset.set(0.5, 0.5);

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function drawLabel(p) {
  const W = labelCanvas.width, H = labelCanvas.height, ctx = lctx;
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#7a5a26'); g.addColorStop(0.3, '#e9cf91'); g.addColorStop(0.55, '#a07b39');
  g.addColorStop(0.8, '#f3dfa8'); g.addColorStop(1, '#8a6a30');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // штампованные кольца
  for (let i = 0; i < 6; i++) {
    const m = 30 + i * 16;
    rr(ctx, m, m, W - 2 * m, H - 2 * m, 230 - i * 16);
    ctx.lineWidth = 4;
    ctx.strokeStyle = i % 2 ? 'rgba(255,244,210,.55)' : 'rgba(60,40,12,.45)';
    ctx.stroke();
  }
  // центральная плашка
  const m = 150;
  const pg = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W / 1.6);
  pg.addColorStop(0, p.plate2); pg.addColorStop(1, p.plate);
  rr(ctx, m, m, W - 2 * m, H - 2 * m, 140); ctx.fillStyle = pg; ctx.fill();
  rr(ctx, m + 18, m + 18, W - 2 * m - 36, H - 2 * m - 36, 124);
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(236,208,150,.85)'; ctx.stroke();
  // волны-орнамент
  ctx.strokeStyle = 'rgba(236,208,150,.35)'; ctx.lineWidth = 2;
  for (let k = 0; k < 2; k++) {
    ctx.beginPath();
    const y0 = H - m - 92 + k * 16;
    for (let x = m + 120; x <= W - m - 120; x += 4) ctx.lineTo(x, y0 + Math.sin(x / 22) * 5);
    ctx.stroke();
  }
  ctx.fillStyle = '#ecd096';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
  ctx.font = '500 26px Manrope';
  ctx.fillText(T('БАЛТИЙСКИЕ МОРЕПРОДУКТЫ', 'BALTIC SEAFOOD'), W / 2, m + 104);
  ctx.font = '500 20px Manrope';
  ctx.fillText(T('КАЛИНИНГРАДСКАЯ ОБЛАСТЬ · С 2005', 'KALININGRAD REGION · SINCE 2005'), W / 2, H - m - 46);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.font = `italic 300 ${p.l1.length > 8 ? 132 : 168}px "Baltic Display"`;
  ctx.fillText(p.l1, W / 2, H / 2 + 34);
  ctx.font = '300 70px "Baltic Display"';
  ctx.fillText(p.l2, W / 2, H / 2 + 118);
  labelTex.needsUpdate = true;
}

const lidMat = new THREE.MeshStandardMaterial({ map: labelTex, metalness: 0.25, roughness: 0.5, envMapIntensity: 0.35 });
const sideMat = new THREE.MeshStandardMaterial({ color: '#b8924f', metalness: 1, roughness: 0.26, envMapIntensity: 0.9 });
const tin = new THREE.Mesh(tinGeo, [lidMat, sideMat]);
const tinGroup = new THREE.Group();
tinGroup.add(tin);
tinScene.add(tinGroup);

const tinState = { spin: 0, idx: -1, visible: false, enter: 0 };
function resizeTin() {
  const r = tinCanvas.getBoundingClientRect();
  if (!r.width || !r.height) return;
  tinRenderer.setSize(r.width, r.height, false);
  tinCam.aspect = r.width / r.height;
  tinCam.position.z = tinCam.aspect < 0.9 ? 12.5 : 8.6;
  tinCam.updateProjectionMatrix();
}

/* =========================================================
   3. РЕНДЕР-ЦИКЛ
   ========================================================= */
let seaVisible = true;
export const seaState = { under: 0, depthT: 0 };   // читает звук

// Луч из камеры через курсор — для ряби и для стаи
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const schoolPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const hit = new THREE.Vector3(), cursorFish = new THREE.Vector3();
let cursorFishActive = false;
let rippleIdx = 0, lastRipple = { x: 1e9, z: 1e9, t: 0 };
function addRipple(x, z, t, strength) {
  oceanMat.uniforms.uRipples.value[rippleIdx].set(x, z, t, strength);
  rippleIdx = (rippleIdx + 1) % 8;
}
let mouseMoved = false;
addEventListener('pointermove', () => { mouseMoved = true; });
addEventListener('pointerdown', (e) => {
  if (seaState.under > 0.5 || e.target.closest('a, button, input, select, textarea')) return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  if (raycaster.ray.intersectPlane(waterPlane, hit)) addRipple(hit.x, hit.z, clock.elapsedTime, 2.2);
});

// Адаптивное качество: если кадров мало — снижаем разрешение моря
let frames = 0, fpsTime = 0;
function adaptQuality(dt) {
  frames++; fpsTime += dt;
  if (fpsTime < 2) return;
  const fps = frames / fpsTime;
  frames = 0; fpsTime = 0;
  if (fps < 42 && seaPR > 0.75) { seaPR = Math.max(0.75, seaPR - 0.25); renderer.setPixelRatio(seaPR); renderer.setSize(innerWidth, innerHeight); }
  else if (fps > 57 && seaPR < Math.min(devicePixelRatio, isLow ? 1 : 1.6)) { seaPR = Math.min(seaPR + 0.25, isLow ? 1 : 1.6); renderer.setPixelRatio(seaPR); renderer.setSize(innerWidth, innerHeight); }
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  mouse.sx = lerp(mouse.sx, mouse.x, 0.05);
  mouse.sy = lerp(mouse.sy, mouse.y, 0.05);
  if (!document.hidden) adaptQuality(dt);

  if (seaVisible) {
    const tg = cameraTarget(lenis.scroll);
    cam.y = lerp(cam.y, tg.y, 0.08);
    cam.z = lerp(cam.z, tg.z, 0.08);
    camera.position.set(mouse.sx * 0.8, cam.y + intro.v * 7, cam.z + intro.v * 6);

    const under = clamp((0.4 - camera.position.y) / 1.2);
    const depthT = clamp((-camera.position.y - 2) / 10);
    seaState.under = under; seaState.depthT = depthT;

    // курсор над водой → рябь; под водой → точка, от которой шарахается стая
    if (mouseMoved && !isTouch) {
      mouseMoved = false;
      ndc.set(mouse.x, -mouse.y);
      raycaster.setFromCamera(ndc, camera);
      if (under < 0.5 && raycaster.ray.intersectPlane(waterPlane, hit)) {
        const dx = hit.x - lastRipple.x, dz = hit.z - lastRipple.z;
        if (dx * dx + dz * dz > 2.2 && t - lastRipple.t > 0.09) {
          addRipple(hit.x, hit.z, t, 1);
          lastRipple = { x: hit.x, z: hit.z, t };
        }
      }
      if (under > 0.5) {
        schoolPlane.constant = -school.z;
        cursorFishActive = !!raycaster.ray.intersectPlane(schoolPlane, cursorFish);
      }
    }
    // туман и цвета
    fogColor.copy(C.horizon).lerp(C.underFog, under).lerp(C.abyss, depthT * under * 0.7);
    scene.fog.color.copy(fogColor);
    const density = lerp(0.012, lerp(0.05, 0.075, depthT), under);
    scene.fog.density = density;
    oceanMat.uniforms.uFogDensity.value = density;
    renderer.setClearColor(fogColor);
    skyMat.uniforms.uUnder.value = under;
    sky.position.copy(camera.position);

    lookAt.set(mouse.sx * 1.5, lerp(-0.6, camera.position.y + 0.4 - mouse.sy * 0.8, under) - intro.v * 4, camera.position.z - 30);
    camera.lookAt(lookAt);

    oceanMat.uniforms.uTime.value = t;
    ocean.position.x = camera.position.x;
    ocean.position.z = Math.round(camera.position.z / 20) * 20;

    pMat.uniforms.uTime.value = t;
    pMat.uniforms.uOpacity.value = under;
    plankton.position.set(camera.position.x, 0, camera.position.z);

    rays.position.set(camera.position.x, 0, camera.position.z);
    rays.children.forEach((m) => {
      m.material.uniforms.uTime.value = t;
      m.material.uniforms.uOpacity.value = under * 0.09 * (1 - depthT * 0.6);
      m.rotation.z = m.userData.base + Math.sin(t * 0.2 + m.userData.seed) * 0.05;
      m.lookAt(camera.position.x, m.position.y, camera.position.z + 30);
    });

    // стая плывёт вместе со зрителем
    fish.visible = under > 0.05;
    if (fish.visible) {
      school.x = lerp(school.x, mouse.sx * 2.5, 0.02);
      school.y = lerp(school.y, camera.position.y - 3.2, 0.03);
      school.z = Math.min(lerp(school.z, camera.position.z - 18, 0.03), camera.position.z - 16);
      fishUniforms.uTime.value = t;
      for (let i = 0; i < FN; i++) {
        const d = fishData[i];
        fishPos(d, t, tmpA);
        fishPos(d, t + 0.05 * Math.sign(d.speed), tmpB);
        // рыбы расплываются от курсора и плавно возвращаются в стаю
        let tx = 0, ty = 0, tz = 0;
        if (cursorFishActive) {
          const vx = tmpA.x - cursorFish.x, vy = tmpA.y - cursorFish.y, vz = tmpA.z - cursorFish.z;
          const dist = Math.hypot(vx, vy, vz * 0.5) || 1;
          const R = 4.2;
          if (dist < R) {
            const f = (1 - dist / R) ** 2 * 3.2 / dist;
            tx = vx * f; ty = vy * f; tz = vz * f * 0.6;
          }
        }
        const k = (tx || ty) ? 0.12 : 0.03;
        d.ox = lerp(d.ox, tx, k); d.oy = lerp(d.oy, ty, k); d.oz = lerp(d.oz, tz, k);
        tmpA.x += d.ox; tmpA.y += d.oy; tmpA.z += d.oz;
        tmpB.x += d.ox * 0.9 + d.ox * 0.4; tmpB.y += d.oy * 1.3; tmpB.z += d.oz;
        dummy.position.copy(tmpA);
        dummy.lookAt(tmpB);
        dummy.scale.setScalar(d.scale);
        dummy.updateMatrix();
        fish.setMatrixAt(i, dummy.matrix);
      }
      fish.instanceMatrix.needsUpdate = true;
    }

    renderer.render(scene, camera);

    const meters = Math.max(0, Math.round(-camera.position.y * 3.2));
    depthEl.textContent = meters;
    depthMark.style.transform = `translateY(${clamp(meters / 40) * 179}px)`;
  }

  if (tinState.visible) {
    const bob = Math.sin(t * 1.1) * 0.12;
    tinGroup.position.y = bob + (1 - tinState.enter) * -3;
    tinGroup.rotation.y = Math.sin(t * 0.45) * 0.28 + tinState.spin + mouse.sx * 0.45;
    tinGroup.rotation.x = -0.32 + Math.sin(t * 0.7) * 0.05 + mouse.sy * 0.2;
    tinGroup.rotation.z = Math.sin(t * 0.5) * 0.04;
    tinRenderer.render(tinScene, tinCam);
  }
}

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  resizeTin();
}
addEventListener('resize', resize);

/* =========================================================
   4. ТЕКСТ, РЕВИЛЫ, ПИНЫ
   ========================================================= */
// Разбиваем манифест на слова
const man = document.querySelector('.manifesto__text');
man.innerHTML = man.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w} </span>`).join('');

function setupScroll() {
  // Hero уходит наверх
  gsap.to('.hero__title', {
    yPercent: -35, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 20%', scrub: true },
  });
  gsap.to('.hero__bottom, .hero__eyebrow', {
    y: -80, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '45% top', scrub: true },
  });

  // Манифест: слова проявляются
  gsap.to('.manifesto__text .w', {
    opacity: 1, stagger: 0.06, ease: 'none',
    scrollTrigger: { trigger: '.manifesto', start: 'top 65%', end: 'bottom 75%', scrub: 0.6 },
  });

  // Заголовки-маски
  document.querySelectorAll('.catalog .title, .export .title, .contact__title, .process .title').forEach((h) => {
    gsap.from(h.querySelectorAll('.mask > span'), {
      yPercent: 115, rotate: 3, duration: 1.4, ease: 'expo.out', stagger: 0.1,
      scrollTrigger: { trigger: h, start: 'top 85%' },
    });
  });
  document.querySelectorAll('.label, .export__lead, .process__lead, .contact__grid').forEach((el) => {
    gsap.from(el, { y: 40, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  // Цифры
  document.querySelectorAll('.stat').forEach((s, i) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.stats', start: 'top 75%' }, delay: i * 0.12 });
    tl.from(s.querySelector('.stat__num'), { yPercent: 60, opacity: 0, duration: 1.3, ease: 'expo.out' })
      .to(s.querySelector('.stat__line'), { '--s': 1, duration: 1.4, ease: 'expo.inOut' }, 0.1)
      .from(s.querySelector('.stat__label'), { opacity: 0, y: 14, duration: 1, ease: 'power3.out' }, 0.35);
    const c = s.querySelector('[data-count]');
    if (c) {
      const end = +c.dataset.count, start = end > 100 ? 1900 : 0, o = { v: start };
      tl.to(o, { v: end, duration: 1.8, ease: 'expo.out', onUpdate: () => (c.textContent = Math.round(o.v)) }, 0);
    }
  });

  // Фильм: кадр раскрывается из карточки на весь экран
  const frame = document.querySelector('.film__frame');
  gsap.timeline({ scrollTrigger: { trigger: '.film', start: 'top 60%', end: 'center center', scrub: 1 } })
    .fromTo(frame, { '--iy': '30%', '--ix': isMobile ? '18%' : '34%', '--r': '18px', '--fs': 1.3 },
      { '--iy': '0%', '--ix': '0%', '--r': '0px', '--fs': 1, ease: 'power2.inOut' });
  gsap.from('.film__title .mask > span', {
    yPercent: 115, rotate: 3, duration: 1.5, ease: 'expo.out', stagger: 0.12,
    scrollTrigger: { trigger: '.film', start: 'top 15%' },
  });
  gsap.from('.film__kicker', { opacity: 0, y: 20, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.film', start: 'top 15%' } });
  gsap.to('.film__text', { opacity: 0, y: -60, ease: 'none', scrollTrigger: { trigger: '.film', start: '72% center', end: 'bottom top', scrub: true } });

  // пока фильм закрывает весь экран, море не рисуем — экономим видеокарту
  ScrollTrigger.create({ trigger: '.film', start: 'center+=8% center', end: 'bottom bottom',
    onToggle: (s) => { seaVisible = !s.isActive; } });

  // Побережье: кадр раскрывается, фото плывёт
  gsap.fromTo('.coast__frame > *', { yPercent: -8, scale: 1.18 }, { yPercent: 8, scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.coast', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.coast__title .mask > span', { yPercent: 115, rotate: 3, duration: 1.5, ease: 'expo.out', stagger: 0.12,
    scrollTrigger: { trigger: '.coast__title', start: 'top 85%' } });
  gsap.from('.coast__caption, .coast .label', { opacity: 0, y: 30, duration: 1.2, ease: 'power3.out', stagger: 0.1,
    scrollTrigger: { trigger: '.coast__title', start: 'top 80%' } });
  gsap.to('.coast__content', { yPercent: -18, ease: 'none',
    scrollTrigger: { trigger: '.coast', start: 'top bottom', end: 'bottom top', scrub: true } });

  const mm = gsap.matchMedia();

  // Производство: горизонтальный скролл
  mm.add('(min-width: 901px)', () => {
    const track = document.querySelector('.process__track');
    const dist = () => track.scrollWidth - innerWidth;
    const h = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '.process', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 },
    });
    track.querySelectorAll('.step').forEach((st) => {
      const fig = st.querySelector('.step__media');
      gsap.from(fig, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.6, ease: 'expo.out',
        scrollTrigger: { trigger: st, containerAnimation: h, start: 'left 85%' } });
      gsap.fromTo(fig.firstElementChild, { xPercent: 7 }, { xPercent: -7, ease: 'none',
        scrollTrigger: { trigger: st, containerAnimation: h, start: 'left right', end: 'right left', scrub: true } });
      gsap.from(st.querySelector('.step__n'), { x: 60, opacity: 0, duration: 1.3, ease: 'expo.out',
        scrollTrigger: { trigger: st, containerAnimation: h, start: 'left 80%' } });
      gsap.from([st.querySelector('h3'), st.querySelector('p')], { y: 50, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1,
        scrollTrigger: { trigger: st, containerAnimation: h, start: 'left 70%' } });
    });
  });
  mm.add('(max-width: 900px)', () => {
    document.querySelectorAll('.step__media').forEach((fig) => {
      gsap.from(fig, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: fig, start: 'top 85%' } });
      gsap.fromTo(fig.firstElementChild, { yPercent: 6 }, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });

  // Продукция: пин + смена банки
  const slides = gsap.utils.toArray('.pslide');
  const items = gsap.utils.toArray('.products__index li');
  function showProduct(i) {
    if (i === tinState.idx) return;
    const prev = tinState.idx;
    tinState.idx = i;
    items.forEach((li, k) => li.classList.toggle('is-active', k === i));
    if (prev >= 0) {
      const out = slides[prev];
      gsap.to(out.querySelectorAll('.mask > span'), { yPercent: -115, duration: 0.7, ease: 'expo.in', stagger: 0.05 });
      gsap.to(out.querySelector('.pslide__text'), { opacity: 0, y: -20, duration: 0.5, onComplete: () => gsap.set(out, { visibility: 'hidden' }) });
      // банка делает оборот, этикетка меняется на ребре
      const dir = i > prev ? 1 : -1;
      const startSpin = tinState.spin;
      let swapped = false;
      gsap.to(tinState, {
        spin: startSpin + dir * Math.PI * 2, duration: 1.4, ease: 'expo.inOut',
        onUpdate() { if (!swapped && this.progress() > 0.35) { swapped = true; drawLabel(PRODUCTS[i]); } },
      });
    } else {
      drawLabel(PRODUCTS[i]);
    }
    const inn = slides[i];
    gsap.set(inn, { visibility: 'visible' });
    gsap.fromTo(inn.querySelectorAll('.mask > span'), { yPercent: 115 }, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, delay: prev >= 0 ? 0.45 : 0 });
    gsap.fromTo(inn.querySelector('.pslide__text'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: prev >= 0 ? 0.6 : 0.2 });
  }
  showProduct(0);

  ScrollTrigger.create({
    trigger: '.products', start: 'top top', end: '+=260%', pin: '.products__pin', scrub: true,
    onUpdate: (s) => {
      showProduct(Math.min(2, Math.floor(s.progress * 3)));
      gsap.set('.products__progress i', { scaleX: s.progress });
    },
  });
  ScrollTrigger.create({
    trigger: '.products', start: 'top bottom', end: 'bottom top',
    onToggle: (s) => { tinState.visible = s.isActive; if (s.isActive) resizeTin(); },
  });
  gsap.to(tinState, { enter: 1, ease: 'none', scrollTrigger: { trigger: '.products', start: 'top bottom', end: 'top top', scrub: true } });

  // Каталог: строки
  gsap.utils.toArray('.row').forEach((r) => {
    gsap.from(r, { y: 50, opacity: 0, duration: 1.2, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: r, start: 'top 95%' } });
  });

  // Карта
  buildMap();

  ScrollTrigger.refresh();
  computeKeys();
}

/* ---------- Карта поставок: настоящая Европа из точек ---------- */
async function buildMap() {
  const svg = document.querySelector('.map');
  if (!svg || !window.d3 || !window.topojson) return;
  const W = 1600, H = 900;
  let world;
  try {
    world = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json').then((r) => r.json());
  } catch (e) { return; }
  const countries = topojson.feature(world, world.objects.countries);
  // все точки поставок помещаются в правую часть кадра (с запасом на обрезку краёв при slice)
  const proj = d3.geoMercator().fitExtent([[730, 230], [1330, 640]],
    { type: 'MultiPoint', coordinates: [[2.35, 48.86], [37.62, 55.75], [12.57, 57.5], [20.51, 54.71]] });

  // Растеризуем сушу в скрытый canvas и снимаем точки по сетке
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const gp = d3.geoPath(proj, ctx);
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); gp(countries); ctx.fill();
  const HL = new Set(['276', '208', '250']); // Германия, Дания, Франция
  ctx.fillStyle = '#ff0000'; ctx.beginPath();
  gp({ type: 'FeatureCollection', features: countries.features.filter((f) => HL.has(String(f.id))) }); ctx.fill();
  const px = ctx.getImageData(0, 0, W, H).data;
  const step = 11;
  let land = '', hl = '';
  for (let y = step / 2; y < H; y += step) {
    for (let x = step / 2; x < W; x += step) {
      const i = ((y | 0) * W + (x | 0)) * 4;
      if (px[i + 3] < 128) continue;
      if (px[i + 1] < 128) hl += `<circle cx="${x}" cy="${y}" r="2.2"/>`;
      else land += `<circle cx="${x}" cy="${y}" r="1.6"/>`;
    }
  }
  svg.querySelector('.map__dots').innerHTML = `<g class="d-land">${land}</g><g class="d-hl">${hl}</g>`;
  svg.querySelector('.map__borders').setAttribute('d', d3.geoPath(proj)(topojson.mesh(world, world.objects.countries)));

  // Маршруты из Калининграда
  const home = proj([20.51, 54.71]);
  const dest = [
    { n: tr('map.de', 'Германия'), c: [9.99, 53.55], lx: -16, ly: 32, a: 'end' },
    { n: tr('map.dk', 'Дания'), c: [12.57, 55.68], lx: -16, ly: -18, a: 'end' },
    { n: tr('map.fr', 'Франция'), c: [2.35, 48.86], lx: -16, ly: 32, a: 'end' },
    { n: tr('map.ru', 'Россия'), c: [37.62, 55.75], lx: 16, ly: -18, a: 'start' },
  ];
  let routes = '', pts = '';
  dest.forEach((d, k) => {
    const p = proj(d.c);
    const len = Math.hypot(p[0] - home[0], p[1] - home[1]);
    const cx = (home[0] + p[0]) / 2, cy = (home[1] + p[1]) / 2 - len * 0.34;
    const path = `M${home[0].toFixed(1)} ${home[1].toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    routes += `<path class="r-base" d="${path}"/><path class="r-line" id="route${k}" d="${path}"/>` +
      `<circle class="r-spark" r="3.4" filter="url(#glow)"><animateMotion dur="${(2.4 + k * 0.5).toFixed(1)}s" repeatCount="indefinite" rotate="auto"><mpath href="#route${k}"/></animateMotion></circle>`;
    pts += `<g class="pt" transform="translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})"><circle r="14" class="pt__pulse"/><circle r="4.5"/>` +
      `<text x="${d.lx}" y="${d.ly}" text-anchor="${d.a}">${d.n}</text></g>`;
  });
  pts += `<g class="pt pt--home" transform="translate(${home[0].toFixed(1)} ${home[1].toFixed(1)})">` +
    `<circle r="30" class="pt__pulse"/><circle r="16" class="pt__ring"/><circle r="6"/><text x="22" y="40">${tr('map.home', 'Калининград')}</text></g>`;
  svg.querySelector('.map__routes').innerHTML = routes;
  svg.querySelector('.map__points').innerHTML = pts;

  // На телефоне показываем фрагмент вокруг Балтики целиком
  if (isMobile) {
    svg.setAttribute('viewBox', `${(home[0] - 560).toFixed(0)} ${(home[1] - 260).toFixed(0)} 860 560`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }

  const lines = svg.querySelectorAll('.r-line');
  lines.forEach((p) => { const L = p.getTotalLength(); gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }); });
  gsap.set('.r-spark', { opacity: 0 });
  gsap.timeline({ scrollTrigger: { trigger: '.export', start: 'top 65%' } })
    .from('.map__dots, .map__borders', { opacity: 0, duration: 1.8, ease: 'power2.out' })
    .from('.map .pt', { scale: 0, opacity: 0, transformOrigin: 'center', duration: 0.9, ease: 'back.out(2)', stagger: 0.1 }, 0.4)
    .to(lines, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', stagger: 0.15 }, 0.6)
    .to('.r-spark', { opacity: 1, duration: 0.6, stagger: 0.15 }, 1.9);
  gsap.fromTo('.map', { yPercent: 5 }, { yPercent: -5, ease: 'none',
    scrollTrigger: { trigger: '.export', start: 'top bottom', end: 'bottom top', scrub: true } });
}

/* ---------- Свой выпадающий список в стиле сайта (родной select остаётся скрытым и хранит значение) ---------- */
function enhanceSelect(select) {
  const opts = [...select.options];
  const wrap = document.createElement('div');
  wrap.className = 'dd';
  const id = 'dd-' + Math.random().toString(36).slice(2, 7);
  wrap.innerHTML = `
    <button type="button" class="dd__btn" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}" data-cursor>
      <span class="dd__value"></span><i class="dd__chev" aria-hidden="true"></i>
    </button>
    <ul class="dd__list" id="${id}" role="listbox" tabindex="-1" data-lenis-prevent>
      ${opts.map((o, i) => `<li class="dd__opt${i === 0 ? ' is-placeholder' : ''}" role="option" data-i="${i}" aria-selected="${o.selected}"><span>${o.textContent}</span></li>`).join('')}
    </ul>`;
  select.classList.add('dd__native');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  select.after(wrap);
  const btn = wrap.querySelector('.dd__btn'), list = wrap.querySelector('.dd__list'), val = wrap.querySelector('.dd__value');
  const items = [...list.children];
  let open = false, active = select.selectedIndex;

  function render() {
    val.textContent = opts[select.selectedIndex].textContent;
    wrap.classList.toggle('is-empty', select.selectedIndex === 0);
    items.forEach((li, i) => {
      li.setAttribute('aria-selected', String(i === select.selectedIndex));
      li.classList.toggle('is-active', i === active);
    });
  }
  function setOpen(state) {
    if (open === state) return;
    open = state;
    wrap.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (open) {
      active = Math.max(select.selectedIndex, 0); render();
      gsap.fromTo(list, { clipPath: 'inset(0% 0% 100% 0%)', y: -8 }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 0.55, ease: 'expo.out' });
      gsap.fromTo(items, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', stagger: 0.025 });
      list.focus({ preventScroll: true });
    } else {
      gsap.to(list, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.35, ease: 'expo.in' });
    }
  }
  function choose(i) {
    select.selectedIndex = i;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    render(); setOpen(false); btn.focus({ preventScroll: true });
  }
  btn.addEventListener('click', () => setOpen(!open));
  items.forEach((li, i) => {
    li.addEventListener('click', () => choose(i));
    li.addEventListener('pointerenter', () => { active = i; render(); });
  });
  list.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      render(); items[active].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false); if (e.key === 'Escape') btn.focus(); }
  });
  btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); } });
  document.addEventListener('pointerdown', (e) => { if (open && !wrap.contains(e.target)) setOpen(false); });
  gsap.set(list, { clipPath: 'inset(0% 0% 100% 0%)' });
  render();
}

/* ---------- Закупщикам: появление и демо-форма (ничего никуда не отправляет) ---------- */
function setupBuyers() {
  const sec = document.querySelector('.buyers');
  if (!sec) return;
  gsap.from(sec.querySelectorAll('.buyers__head .mask > span'), { y: 0, yPercent: 115, rotate: 3, duration: 1.5, ease: 'expo.out', stagger: 0.1,
    scrollTrigger: { trigger: '.buyers__head', start: 'top 80%' } });
  gsap.from(sec.querySelectorAll('.bcard'), { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, clearProps: 'transform,opacity',
    scrollTrigger: { trigger: '.buyers__grid', start: 'top 85%' } });
  gsap.from(sec.querySelectorAll('.rfq__title, .field, .rfq__foot'), { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.05, clearProps: 'transform,opacity',
    scrollTrigger: { trigger: '.rfq', start: 'top 80%' } });
  const form = sec.querySelector('.rfq');
  form.querySelectorAll('select').forEach(enhanceSelect);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.classList.add('is-done');
    gsap.fromTo(form.querySelector('.rfq__done'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
  });
}

/* ---------- Звук моря: синтез в браузере, без аудиофайлов ---------- */
function setupSound() {
  const btn = document.querySelector('.sound');
  if (!btn) return;
  let ctx = null, master, surfMix, surfLP, deepGain, bubbleTimer, on = false;

  function brownNoise(seconds) {
    const len = ctx.sampleRate * seconds, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let last = 0;
      for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    }
    return buf;
  }
  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const buf = brownNoise(6);
    const src = (rate) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate; return s; };
    const lfo = (hz, amt, target) => { const o = ctx.createOscillator(); o.frequency.value = hz; const g = ctx.createGain(); g.gain.value = amt; o.connect(g).connect(target); o.start(); };

    // прибой: шум через фильтр, громкость дышит как накат волн
    surfMix = ctx.createGain(); surfMix.connect(master);
    surfLP = ctx.createBiquadFilter(); surfLP.type = 'lowpass'; surfLP.frequency.value = 900; surfLP.Q.value = 0.4;
    const swell = ctx.createGain(); swell.gain.value = 0.5;
    const s1 = src(1); s1.connect(surfLP).connect(swell).connect(surfMix); s1.start();
    lfo(0.11, 0.3, swell.gain); lfo(0.043, 0.14, swell.gain);
    // пена: шипение на высоких
    const foamBP = ctx.createBiquadFilter(); foamBP.type = 'bandpass'; foamBP.frequency.value = 2400; foamBP.Q.value = 0.6;
    const foam = ctx.createGain(); foam.gain.value = 0.05;
    const s2 = src(1.7); s2.connect(foamBP).connect(foam).connect(surfMix); s2.start();
    lfo(0.11, 0.045, foam.gain);
    // под водой: глухой гул
    deepGain = ctx.createGain(); deepGain.gain.value = 0; deepGain.connect(master);
    const deepLP = ctx.createBiquadFilter(); deepLP.type = 'lowpass'; deepLP.frequency.value = 240;
    const s3 = src(0.6); s3.connect(deepLP).connect(deepGain); s3.start();
    const hum = ctx.createOscillator(); hum.frequency.value = 52; const humG = ctx.createGain(); humG.gain.value = 0.035;
    hum.connect(humG).connect(deepGain); hum.start();
  }
  function bubble() {
    if (!on) return;
    if (seaState.under > 0.5) {
      const t = ctx.currentTime, f = 280 + Math.random() * 520;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2.6, t + 0.09);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.04, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      o.connect(g).connect(master); o.start(t); o.stop(t + 0.16);
    }
    bubbleTimer = setTimeout(bubble, 350 + Math.random() * 2200);
  }
  // звук следует за глубиной: над водой прибой, под водой гул
  gsap.ticker.add(() => {
    if (!ctx || !on) return;
    const u = seaState.under, t = ctx.currentTime;
    surfMix.gain.setTargetAtTime(1 - u * 0.85, t, 0.3);
    surfLP.frequency.setTargetAtTime(lerp(950, 320, u), t, 0.3);
    deepGain.gain.setTargetAtTime(u * (0.7 + seaState.depthT * 0.4), t, 0.3);
  });
  async function toggle(state) {
    if (!ctx) build();
    on = state;
    if (ctx.state === 'suspended') await ctx.resume();
    master.gain.setTargetAtTime(on ? 0.32 : 0, ctx.currentTime, 0.5);
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', String(on));
    clearTimeout(bubbleTimer);
    if (on) bubble();
  }
  btn.addEventListener('click', () => toggle(!on));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (on) ctx.resume();
  });
}

/* ---------- Видео: играют только в кадре ---------- */
function setupVideos() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) {
        if (!v.src) v.src = (isLow && v.dataset.srcM) || v.dataset.src;   // на телефонах лёгкая версия
        v.play().catch(() => {});
      } else v.pause();
    });
  }, { rootMargin: '300px' });
  document.querySelectorAll('video').forEach((v) => { v.muted = true; io.observe(v); });
}

/* ---------- Превью рыбы за курсором в каталоге ---------- */
function setupPreview() {
  if (isTouch) return;
  const pv = document.querySelector('.preview');
  const inner = pv.querySelector('.preview__inner');
  const px = gsap.quickTo(pv, 'x', { duration: 0.7, ease: 'power3' });
  const py = gsap.quickTo(pv, 'y', { duration: 0.7, ease: 'power3' });
  const pr = gsap.quickTo(pv, 'rotation', { duration: 0.9, ease: 'power3' });
  let lastX = 0;
  addEventListener('pointermove', (e) => {
    px(e.clientX); py(e.clientY);
    pr(clamp((e.clientX - lastX) * 0.6, -12, 12)); lastX = e.clientX;
  });
  let current = null;
  const rowsAll = [...document.querySelectorAll('.row')];
  rowsAll.forEach((row, i) => {
    row.addEventListener('mouseenter', () => {
      if (current === row) return;
      const prev = current; current = row;
      const img = new Image(); img.src = row.dataset.img; img.alt = '';
      inner.appendChild(img);
      const dir = prev && rowsAll.indexOf(prev) > i ? -1 : 1;
      gsap.fromTo(img, { yPercent: 100 * dir, scale: 1.3 }, { yPercent: 0, scale: 1, duration: 0.9, ease: 'expo.out',
        onComplete: () => { while (inner.children.length > 1) inner.firstElementChild.remove(); } });
    });
  });
  const list = document.querySelector('.catalog__list');
  list.addEventListener('mouseenter', () => gsap.to(pv, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.out' }));
  list.addEventListener('mouseleave', () => { current = null; gsap.to(pv, { clipPath: 'inset(50% 50% 50% 50%)', duration: 0.6, ease: 'expo.inOut' }); });
}

/* ---------- Курсор и магнитные кнопки ---------- */
function setupCursor() {
  setupHookCursor();
  if (isTouch) return;
  document.querySelectorAll('.magnetic').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, .4)' });
    const y = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, .4)' });
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.35);
      y((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener('mouseleave', () => { x(0); y(0); });
  });
}

/* =========================================================
   5. ЗАГРУЗКА И ИНТРО
   ========================================================= */
async function boot() {
  // ждём шрифты, но не дольше 1,2 с: экрана загрузки нет, сайт стартует сразу
  await Promise.race([
    Promise.all([
      document.fonts.load('italic 300 120px "Baltic Display"'),
      document.fonts.load('300 120px "Baltic Display"'),
      document.fonts.load('500 20px Manrope'),
    ]).catch(() => {}),
    new Promise((r) => setTimeout(r, 1200)),
  ]);

  renderer.compile(scene, camera);
  renderer.setAnimationLoop(tick);
  setupScroll();
  setupCursor();
  setupVideos();
  setupPreview();
  setupSound();
  setupBuyers();
  resizeTin();

  // пришли по ссылке вида index.html#catalog — сразу к нужному блоку, иначе в начало
  const hashEl = location.hash && document.querySelector(location.hash);
  lenis.start();
  if (hashEl) { intro.v = 0; lenis.scrollTo(hashEl, { immediate: true, force: true }); }
  else { scrollTo(0, 0); lenis.scrollTo(0, { immediate: true, force: true }); }
  const tl = gsap.timeline();
  // y: 0 обязательно: иначе GSAP запоминает стартовый CSS-сдвиг (translateY 120%) как постоянный y
  tl.fromTo('.hero__title .line > span', { y: 0, yPercent: 120, rotate: 5 }, { y: 0, yPercent: 0, rotate: 0, duration: 1.6, ease: 'expo.out', stagger: 0.11 }, 0.15)
    .fromTo('.nav, .hero__eyebrow, .hero__lead, .scroll-hint, .depth', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.06, clearProps: 'transform' }, 0.4)
    .to(intro, { v: 0, duration: 2.8, ease: 'expo.out' }, 0);
  document.body.classList.remove('is-loading');
}
boot();
