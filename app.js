import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* =========================================================
   Балтийские Морепродукты — сцена, скролл и моушен
   ========================================================= */

const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
const isMobile = innerWidth < 900;
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
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.25 : 1.75));
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
const seg = isMobile ? 160 : 256;
const oceanGeo = new THREE.PlaneGeometry(420, 420, seg, seg);
oceanGeo.rotateX(-Math.PI / 2);
const oceanMat = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: {
    uTime: { value: 0 }, uCam: { value: camera.position }, uSunDir: { value: sunDir },
    uDeep: { value: C.deep }, uShallow: { value: C.shallow }, uSky: { value: C.horizon }, uSkyTop: { value: C.skyTop },
    uSun: { value: C.sun }, uFog: { value: fogColor }, uFogDensity: { value: 0.02 },
  },
  vertexShader: /* glsl */`
    uniform float uTime;
    varying vec3 vWorld;
    varying vec3 vN;
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
const PN = isMobile ? 900 : 2200;
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
const FN = isMobile ? 70 : 160;
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
  { l1: 'Шпроты', l2: 'в масле', plate: '#0d2233', plate2: '#1a3a52' },
  { l1: 'Килька', l2: 'в томатном соусе', plate: '#5a1512', plate2: '#86261e' },
  { l1: 'Печень трески', l2: 'натуральная', plate: '#0f2c27', plate2: '#1d4a40' },
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
  ctx.fillText('БАЛТИЙСКИЕ МОРЕПРОДУКТЫ', W / 2, m + 104);
  ctx.font = '500 20px Manrope';
  ctx.fillText('КАЛИНИНГРАДСКАЯ ОБЛАСТЬ · С 2005', W / 2, H - m - 46);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.font = `italic 300 ${p.l1.length > 8 ? 132 : 168}px "Cormorant Garamond"`;
  ctx.fillText(p.l1, W / 2, H / 2 + 34);
  ctx.font = '300 70px "Cormorant Garamond"';
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
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  mouse.sx = lerp(mouse.sx, mouse.x, 0.05);
  mouse.sy = lerp(mouse.sy, mouse.y, 0.05);

  if (seaVisible) {
    const tg = cameraTarget(lenis.scroll);
    cam.y = lerp(cam.y, tg.y, 0.08);
    cam.z = lerp(cam.z, tg.z, 0.08);
    camera.position.set(mouse.sx * 0.8, cam.y + intro.v * 7, cam.z + intro.v * 6);

    const under = clamp((0.4 - camera.position.y) / 1.2);
    const depthT = clamp((-camera.position.y - 2) / 10);
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

  // Побережье: кадр раскрывается, фото плывёт
  gsap.fromTo('.coast__frame', { clipPath: 'inset(12% 10% 12% 10%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
    scrollTrigger: { trigger: '.coast', start: 'top bottom', end: 'center center', scrub: true } });
  gsap.fromTo('.coast__frame img', { yPercent: -8, scale: 1.12 }, { yPercent: 8, scale: 1, ease: 'none',
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
      gsap.from(st.querySelector('.step__n'), { xPercent: 40, ease: 'none',
        scrollTrigger: { trigger: st, containerAnimation: h, start: 'left right', end: 'right left', scrub: true } });
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
    gsap.from(r.children, { yPercent: 100, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: r, start: 'top 92%' } });
  });

  // Карта
  const dots = document.querySelector('.map__dots');
  let html = '';
  for (let y = 20; y < 600; y += 22) for (let x = 10; x < 1000; x += 22) {
    const n = Math.sin(x * 0.011) * Math.cos(y * 0.017) + Math.sin((x + y) * 0.006);
    if (n > -0.15) html += `<circle cx="${x}" cy="${y}" r="${(1 + (n + 0.15) * 0.9).toFixed(2)}"/>`;
  }
  dots.innerHTML = html;
  gsap.from('.map__dots circle', { opacity: 0, duration: 1.4, stagger: { each: 0.0015, from: 'center' }, scrollTrigger: { trigger: '.export', start: 'top 70%' } });
  document.querySelectorAll('.map__routes path').forEach((p) => {
    const L = p.getTotalLength(); gsap.set(p, { strokeDasharray: L, strokeDashoffset: L });
  });
  gsap.to('.map__routes path', { strokeDashoffset: 0, ease: 'none', stagger: 0.15, scrollTrigger: { trigger: '.export', start: 'top 60%', end: 'center 40%', scrub: 1 } });
  gsap.from('.pt', { scale: 0, opacity: 0, transformOrigin: 'center', duration: 1, ease: 'back.out(2)', stagger: 0.12, scrollTrigger: { trigger: '.export', start: 'top 55%' } });

  // Бегущая строка, реагирует на скорость скролла
  const mq = document.querySelector('.marquee__inner');
  const loop = gsap.to(mq, { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
  const skew = gsap.quickTo(mq, 'skewX', { duration: 0.6, ease: 'power3' });
  lenis.on('scroll', ({ velocity }) => {
    skew(clamp(velocity * -0.35, -14, 14));
    loop.timeScale(1 + Math.min(Math.abs(velocity) * 0.15, 5));
  });

  ScrollTrigger.refresh();
  computeKeys();
}

/* ---------- Видео: играют только в кадре ---------- */
function setupVideos() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
    });
  }, { rootMargin: '200px' });
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
  document.querySelectorAll('.row').forEach((row, i) => {
    row.addEventListener('mouseenter', () => {
      if (current === row) return;
      const prev = current; current = row;
      const img = new Image(); img.src = row.dataset.img; img.alt = '';
      inner.appendChild(img);
      const dir = prev && [...row.parentNode.children].indexOf(prev) > i ? -1 : 1;
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
  if (isTouch) return;
  const cur = document.querySelector('.cursor');
  const label = cur.querySelector('.cursor__label');
  const cx = gsap.quickTo(cur, 'x', { duration: 0.45, ease: 'power3' });
  const cy = gsap.quickTo(cur, 'y', { duration: 0.45, ease: 'power3' });
  addEventListener('pointermove', (e) => { cx(e.clientX); cy(e.clientY); });
  document.querySelectorAll('[data-cursor], a').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      const txt = el.dataset.cursor;
      if (txt) { label.textContent = txt; cur.classList.add('has-label'); } else cur.classList.add('is-hover');
    });
    el.addEventListener('mouseleave', () => cur.classList.remove('is-hover', 'has-label'));
  });
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
  const countEl = document.getElementById('count');
  const bar = document.querySelector('.loader__bar i');
  const prog = { v: 0 };
  const fake = gsap.to(prog, { v: 86, duration: 1.5, ease: 'power2.out', onUpdate: () => {
    countEl.textContent = Math.round(prog.v); bar.style.transform = `scaleX(${prog.v / 100})`;
  } });

  await Promise.all([
    document.fonts.load('italic 300 120px "Cormorant Garamond"'),
    document.fonts.load('300 120px "Cormorant Garamond"'),
    document.fonts.load('500 20px Manrope'),
  ]).catch(() => {});
  await document.fonts.ready;

  renderer.compile(scene, camera);
  renderer.setAnimationLoop(tick);
  setupScroll();
  setupCursor();
  setupVideos();
  setupPreview();
  resizeTin();

  await new Promise((r) => (fake.isActive() ? fake.eventCallback('onComplete', r) : r()));
  await gsap.to(prog, { v: 100, duration: 0.6, ease: 'power2.inOut', onUpdate: () => {
    countEl.textContent = Math.round(prog.v); bar.style.transform = `scaleX(${prog.v / 100})`;
  } });

  scrollTo(0, 0);
  lenis.scrollTo(0, { immediate: true, force: true });
  const tl = gsap.timeline({ onComplete: () => { document.body.classList.remove('is-loading'); lenis.start(); } });
  tl.to('.loader__count, .loader__top, .loader__caption, .loader__bar', { yPercent: -40, opacity: 0, duration: 0.8, ease: 'power3.in', stagger: 0.04 })
    .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.3, ease: 'expo.inOut' }, '-=0.2')
    .to(intro, { v: 0, duration: 3.2, ease: 'expo.out' }, '-=1.1')
    .from('.hero__title .line > span', { yPercent: 120, rotate: 5, duration: 1.6, ease: 'expo.out', stagger: 0.11 }, '-=3.0')
    .from('.nav > *, .hero__eyebrow span, .hero__lead, .scroll-hint, .depth', { opacity: 0, y: 24, duration: 1.2, ease: 'power3.out', stagger: 0.06 }, '-=2.4')
    .set('.loader', { display: 'none' });
}
boot();
