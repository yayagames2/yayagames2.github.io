/* ZORI – Jungle Swing · original 3D vine-swinging platformer for Offline Arcade */
import * as THREE from 'three';
import { EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass, FXAAShader } from '../lib/postfx.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const isTouch = (matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let R = rng(1);
const C = h => new THREE.Color(h);
const HDR = (h, k) => new THREE.Color(h).multiplyScalar(k);

/* ================= save / settings ================= */
const SAVE = { stars: {}, best: {}, unlocked: 1, diff: 'normal', q: isTouch ? 'high' : 'ultra', snd: true };
try { Object.assign(SAVE, JSON.parse(localStorage.getItem('zori-save') || '{}')); } catch (e) { }
const save = () => { try { localStorage.setItem('zori-save', JSON.stringify(SAVE)); } catch (e) { } };
const DIFF = {
  easy: { name: 'Łatwy', lives: 5, hearts: 4, grab: 2.5, assist: 1, enemy: .7, extra: 0, gap: -.4 },
  normal: { name: 'Normalny', lives: 3, hearts: 3, grab: 1.9, assist: .7, enemy: 1, extra: 1, gap: 0 },
  hard: { name: 'Trudny', lives: 2, hearts: 2, grab: 1.45, assist: .35, enemy: 1.35, extra: 2, gap: .35 }
};
const D = () => DIFF[SAVE.diff] || DIFF.normal;

/* ================= themes & levels ================= */
const THEMES = {
  sunrise: { name: 'Korony drzew o świcie', en: 'SUNRISE CANOPY', ic: '🌅', top: '#3f86d8', hor: '#ffd9a0', sun: '#fff1c8', sunI: 3.4, sunDir: [.4, .55, .7], hemiS: '#cfe8ff', hemiG: '#3c5a2a', hemiI: 1.15,
    fog: '#bfe0c8', fogN: 30, fogF: 190, hazard: 'mist', trees: 'broad', leaf: ['#2f8a3e', '#4aa83f', '#6fbf3a', '#2b7a4b'], plat: 'branch', fx: 'butterfly', grad: 'linear-gradient(160deg,#ffcf7a,#3f9a55)' },
  river: { name: 'Rzeka krokodyli', en: 'CROCODILE RIVER', ic: '🐊', top: '#2f7fe0', hor: '#bfe8ff', sun: '#ffffff', sunI: 3.6, sunDir: [-.3, .75, .5], hemiS: '#bfe4ff', hemiG: '#2c5a3a', hemiI: 1.2,
    fog: '#a8d8e0', fogN: 35, fogF: 210, hazard: 'water', water: '#1f7f8a', trees: 'palm', leaf: ['#3b9a3a', '#58b545', '#2f7d3a'], plat: 'raft', fx: 'leaf', grad: 'linear-gradient(160deg,#7fd6ff,#1f7f8a)' },
  falls: { name: 'Wąwóz wodospadu', en: 'WATERFALL GORGE', ic: '💦', top: '#4f8fb0', hor: '#dff4f0', sun: '#f4fff8', sunI: 2.6, sunDir: [.2, .6, .75], hemiS: '#d0f0ff', hemiG: '#2a4a40', hemiI: 1.25,
    fog: '#cfe9e6', fogN: 18, fogF: 150, hazard: 'water', water: '#2f8f9a', trees: 'cliff', leaf: ['#2f8f5a', '#47a86a', '#1f6f4a'], plat: 'stone', fx: 'mist', extra: 'falls', grad: 'linear-gradient(160deg,#dff4f0,#2f8f9a)' },
  bamboo: { name: 'Bambusowy las', en: 'BAMBOO SUNSET', ic: '🎋', top: '#5a3f9a', hor: '#ff9a6a', sun: '#ffb070', sunI: 3.2, sunDir: [-.6, .28, .7], hemiS: '#ffc8a8', hemiG: '#4a3a2a', hemiI: 1.05,
    fog: '#e8a080', fogN: 28, fogF: 170, hazard: 'mist', trees: 'bamboo', leaf: ['#7fbf3a', '#9ad04a', '#5fa83a'], plat: 'bamboo', fx: 'leaf', grad: 'linear-gradient(160deg,#ff9a6a,#5a3f9a)' },
  night: { name: 'Noc świetlików', en: 'FIREFLY NIGHT', ic: '✨', top: '#050a24', hor: '#1f3a6a', sun: '#9fb8ff', sunI: 1.1, sunDir: [-.4, .6, .6], hemiS: '#4a6ab0', hemiG: '#101a20', hemiI: .7,
    fog: '#0f1f3a', fogN: 22, fogF: 140, hazard: 'mist', trees: 'broad', leaf: ['#1f4a4a', '#245a50', '#183a3f'], plat: 'branch', fx: 'firefly', night: 1, extra: 'shrooms', grad: 'linear-gradient(160deg,#1f3a6a,#050a24)' },
  temple: { name: 'Zaginiona świątynia', en: 'LOST TEMPLE', ic: '🗿', top: '#6a8fb0', hor: '#ffe2a8', sun: '#ffd890', sunI: 3.2, sunDir: [.5, .45, .7], hemiS: '#ffe8c8', hemiG: '#4a4030', hemiI: 1.1,
    fog: '#e8d0a0', fogN: 26, fogF: 170, hazard: 'mist', trees: 'pillar', leaf: ['#5a8a3a', '#6f9a3f', '#4a7a33'], plat: 'stone', fx: 'dust', extra: 'ruins', grad: 'linear-gradient(160deg,#ffe2a8,#8a7a50)' },
  volcano: { name: 'Lawowy grzbiet', en: 'VOLCANO RIDGE', ic: '🌋', top: '#1a0a12', hor: '#ff5a2a', sun: '#ff8a50', sunI: 2.2, sunDir: [.3, .35, .8], hemiS: '#ff9a7a', hemiG: '#2a0a05', hemiI: .9,
    fog: '#4a1a14', fogN: 20, fogF: 150, hazard: 'lava', trees: 'dead', leaf: ['#3a2a20'], plat: 'basalt', fx: 'ember', grad: 'linear-gradient(160deg,#ff5a2a,#1a0a12)' },
  storm: { name: 'Szczyt burz', en: 'STORM SUMMIT', ic: '⛈️', top: '#1f2a3a', hor: '#6a7f8f', sun: '#cfe0ff', sunI: 1.6, sunDir: [.2, .7, .6], hemiS: '#8fa0b8', hemiG: '#1a2a20', hemiI: .95,
    fog: '#4a5a66', fogN: 16, fogF: 120, hazard: 'mist', trees: 'broad', leaf: ['#1f5a3a', '#2a6a40', '#174a30'], plat: 'branch', fx: 'rain', extra: 'storm', grad: 'linear-gradient(160deg,#6a7f8f,#1f2a3a)' }
};
/* segment scripts: each level is built from these pieces */
const LEVELS = [
  { th: 'sunrise', seed: 11, sway: .02, segs: ['start', 'ground:10', 'branches:3', 'ground:8', 'vines:2', 'ground:8', 'check', 'branches:4', 'vines:3', 'bounce:1', 'ground:6', 'end'],
    tips: [[6, isTouch ? 'Ruszaj joystickiem, by biec' : 'Strzałki / WASD – bieg'], [20, isTouch ? 'Naciśnij „Skok”, by skakać między gałęziami' : 'Spacja – skok'], [50, 'Skocz do liany, by ją złapać!'], [56, 'Skocz jeszcze raz, by puścić – gdy bujasz się do przodu'], [100, 'Grzyb-trampolina – wystrzel wysoko!']] },
  { th: 'river', seed: 22, sway: .025, segs: ['start', 'ground:8', 'logs:3', 'ground:6', 'vines:3', 'snake:10', 'check', 'logs:4', 'zigzag:4', 'vines:3', 'ground:6', 'end'],
    tips: [[16, 'Tratwy się poruszają – wyczuj moment skoku'], [62, 'Wąż! Skocz na niego albo rzuć kamieniem'], [100, 'Gałęzie zygzakiem – skacz w lewo i w prawo']] },
  { th: 'falls', seed: 33, sway: .018, segs: ['start', 'ground:8', 'pillars:5', 'vines:4', 'check', 'ground:6', 'zip:34', 'crumble:4', 'vinesX:3', 'ground:6', 'end'],
    tips: [[22, 'Słupki na różnych wysokościach – skacz w górę i w dół!'], [90, 'Tyrolka! Skocz na linę, by zjechać'], [124, 'Skały się kruszą – nie zatrzymuj się!']] },
  { th: 'bamboo', seed: 44, sway: .03, segs: ['start', 'ground:8', 'zigzag:5', 'wasp', 'vines:4', 'check', 'bounce:3', 'zip:28', 'snakes:16', 'vinesX:4', 'ground:6', 'end'],
    tips: [[26, 'Osy! Rzucaj w nie kamieniami']] },
  { th: 'night', seed: 55, sway: .02, segs: ['start', 'ground:8', 'bounce:3', 'vinesX:4', 'check', 'pillars:6', 'wasp', 'bounce:2', 'vines:4', 'snakes:14', 'ground:6', 'end'], tips: [[12, 'W ciemności – podążaj za świetlikami ✨']] },
  { th: 'temple', seed: 66, sway: .016, segs: ['start', 'ground:8', 'crumble:5', 'vines:3', 'snakes:14', 'check', 'zip:30', 'gauntlet:5', 'pillars:5', 'vinesX:4', 'ground:6', 'end'], tips: [] },
  { th: 'volcano', seed: 77, sway: .022, segs: ['start', 'ground:8', 'crumble:4', 'vinesX:4', 'check', 'bounce:2', 'logs:4', 'wasp', 'pillars:6', 'check', 'gauntlet:5', 'vinesX:5', 'ground:6', 'end'], tips: [[10, 'Lawa! Nie spadnij…']] },
  { th: 'storm', seed: 88, sway: .028, segs: ['start', 'ground:8', 'vinesX:5', 'check', 'zip:36', 'crumble:4', 'wasp', 'vinesX:6', 'check', 'bounce:2', 'snakes:12', 'zip:30', 'zigzag:5', 'vines:4', 'ground:6', 'end'], tips: [[8, 'Burza! Liany mocno się bujają']] },
  { th: 'river', nm: 'Wężowa przełęcz', ne: 'SNAKE PASS', seed: 99, sway: .03, segs: ['start', 'ground:8', 'snakes:18', 'logs:4', 'check', 'zigzag:6', 'snakes:16', 'vinesX:4', 'check', 'logs:5', 'snakes:14', 'ground:6', 'end'], tips: [[10, 'Wszędzie węże! Rzucaj kamieniami albo na nie skacz']] },
  { th: 'falls', nm: 'Skok wiary', ne: 'LEAP OF FAITH', seed: 111, sway: .02, segs: ['start', 'ground:8', 'pillars:7', 'check', 'vinesX:6', 'zip:40', 'check', 'pillars:6', 'crumble:5', 'vinesX:5', 'ground:6', 'end'], tips: [[10, 'Wysokie i niskie skoki – bądź precyzyjny!']] },
  { th: 'night', nm: 'Osia kotlina', ne: 'WASP HOLLOW', seed: 122, sway: .024, segs: ['start', 'ground:8', 'gauntlet:6', 'wasp', 'check', 'bounce:3', 'vinesX:5', 'wasp', 'check', 'gauntlet:6', 'zigzag:6', 'ground:6', 'end'], tips: [[10, 'Rój os! Miej kamienie pod ręką']] },
  { th: 'volcano', nm: 'Serce wulkanu', ne: 'HEART OF THE VOLCANO', seed: 133, sway: .03, segs: ['start', 'ground:8', 'crumble:5', 'pillars:6', 'check', 'vinesX:6', 'zip:34', 'gauntlet:6', 'check', 'logs:5', 'snakes:14', 'vinesX:6', 'zigzag:6', 'ground:6', 'end'], tips: [[8, 'Ostatnie wyzwanie! Do końca docierają tylko mistrzowie 🏆']] }
];

/* ================= renderer ================= */
let Q = SAVE.q;
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = Q !== 'low'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('stage').appendChild(renderer.domElement);
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, .2, 900);
scene.add(camera);
const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: renderer.capabilities.isWebGL2 && !isTouch ? 4 : 0 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .45, .55, .92); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uWarm: { value: 0 }, uFlash: { value: 0 } },
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uWarm; uniform float uFlash; varying vec2 vUv;
  void main(){ vec3 c=texture2D(tDiffuse,vUv).rgb; vec2 d=vUv-.5; float r=length(d);
    c=mix(c,c*c*(3.0-2.0*c),.18); float l=dot(c,vec3(.299,.587,.114)); c=mix(vec3(l),c,1.12);
    c*=1.0-smoothstep(.38,.95,r)*.42; c+=vec3(uFlash); gl_FragColor=vec4(c,1.0); }` });
composer.addPass(grade);
const fxaa = new ShaderPass(FXAAShader); composer.addPass(fxaa);

/* lights */
const hemi = new THREE.HemisphereLight(0xffffff, 0x334422, 1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 140 });
sun.shadow.bias = -.0005; sun.shadow.normalBias = .4; scene.add(sun, sun.target);

/* sky */
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: C('#3f86d8') }, hor: { value: C('#ffd9a0') }, sunC: { value: C('#fff') }, sunDir: { value: new THREE.Vector3(0, .5, .8) }, night: { value: 0 }, time: { value: 0 } },
  vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform vec3 top,hor,sunC,sunDir; uniform float night,time; varying vec3 vP;
  float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float n2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ float v=0.0,a=.5; for(int i=0;i<5;i++){ v+=a*n2(p); p*=2.02; a*=.5; } return v; }
  void main(){ vec3 d=normalize(vP); float h=clamp(d.y,0.0,1.0);
    vec3 c=mix(hor,top,pow(smoothstep(-.05,.7,h),.8));
    float s=max(dot(d,normalize(sunDir)),0.0);
    c+=sunC*(pow(s,6.0)*.35+pow(s,64.0)*.6+pow(s,900.0)*(night>.5?3.0:8.0));
    if(d.y>0.0){ vec2 uv=d.xz/(d.y+.15)*1.4+vec2(time*.006,0.0); float n=fbm(uv);
      float cl=smoothstep(.55,.85,n)*smoothstep(0.0,.18,d.y)*(1.0-smoothstep(.55,.95,d.y));
      vec3 cc=mix(hor*1.05,vec3(1.0),.35)*(night>.5?.25:1.0); c=mix(c,cc,cl*.65);
      float st=step(.9975,h21(floor(d.xz/(d.y+.3)*380.0)))*smoothstep(.2,.8,d.y)*night; c+=vec3(st*2.2); }
    gl_FragColor=vec4(c,1.0); }` });
const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), skyMat); sky.frustumCulled = false; scene.add(sky);
function makeEnv() {
  const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat));
  const g = new THREE.Mesh(new THREE.CircleGeometry(49, 24), new THREE.MeshBasicMaterial({ color: C('#2a3a26') })); g.rotation.x = -Math.PI / 2; g.position.y = -3; es.add(g);
  if (scene.environment) scene.environment.dispose();
  scene.environment = pm.fromScene(es, .04, .1, 200).texture; pm.dispose();
}

/* ================= procedural textures ================= */
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
function tex(c, srgb, rx, ry) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; t.repeat.set(rx || 1, ry || 1); return t; }
const TX = {};
function barkTex() {
  if (TX.bark) return TX.bark; const S = 256, c = cnv(S), g = c.getContext('2d');
  g.fillStyle = '#6b4a30'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) { const x = Math.random() * S, w = 2 + Math.random() * 6; g.fillStyle = `rgba(${30 + Math.random() * 30 | 0},${18 + Math.random() * 18 | 0},10,${.25 + Math.random() * .35})`; g.fillRect(x, 0, w, S); }
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(255,230,190,${Math.random() * .07})`; g.fillRect(Math.random() * S, Math.random() * S, 2, 3 + Math.random() * 8); }
  for (let i = 0; i < 14; i++) { g.strokeStyle = 'rgba(25,15,8,.55)'; g.lineWidth = 2; g.beginPath(); const y = Math.random() * S; g.ellipse(Math.random() * S, y, 6 + Math.random() * 6, 3 + Math.random() * 3, 0, 0, 7); g.stroke(); }
  return TX.bark = tex(c, true, 1, 3);
}
function stoneTex() {
  if (TX.stone) return TX.stone; const S = 256, c = cnv(S), g = c.getContext('2d');
  g.fillStyle = '#8f8a7c'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 5000; i++) { const v = Math.random() < .5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},${Math.random() * .08})`; g.fillRect(Math.random() * S, Math.random() * S, 2, 2); }
  g.strokeStyle = 'rgba(40,36,30,.6)'; g.lineWidth = 3;
  for (let y = 0; y < S; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); for (let x = (y / 64 % 2) * 48; x < S; x += 96) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); } }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(70,110,50,${.15 + Math.random() * .25})`; g.beginPath(); g.arc(Math.random() * S, Math.random() * S, 4 + Math.random() * 12, 0, 7); g.fill(); }
  return TX.stone = tex(c, true);
}
function grassTex() {
  if (TX.grass) return TX.grass; const S = 256, c = cnv(S), g = c.getContext('2d');
  g.fillStyle = '#4a8a2e'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `hsla(${85 + Math.random() * 40},${45 + Math.random() * 25}%,${22 + Math.random() * 26}%,.6)`; g.fillRect(Math.random() * S, Math.random() * S, 2, 4 + Math.random() * 5); }
  return TX.grass = tex(c, true, 2, 2);
}
function bambooTex() {
  if (TX.bam) return TX.bam; const c = cnv(64, 256), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, '#5f8f2a'); gr.addColorStop(.45, '#b5d36a'); gr.addColorStop(1, '#4f7a22');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 64) { g.fillStyle = '#3f6a1a'; g.fillRect(0, y, 64, 5); g.fillStyle = 'rgba(255,255,220,.35)'; g.fillRect(0, y + 5, 64, 2); }
  return TX.bam = tex(c, true, 1, 4);
}
function leafCardTex() {
  if (TX.leaf) return TX.leaf; const c = cnv(128), g = c.getContext('2d');
  g.translate(64, 64);
  for (let i = 0; i < 7; i++) { g.save(); g.rotate(i / 7 * Math.PI * 2 + Math.random() * .3); g.fillStyle = `hsl(${100 + Math.random() * 30},55%,${30 + Math.random() * 15}%)`;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(14, -30, 0, -60); g.quadraticCurveTo(-14, -30, 0, 0); g.fill(); g.strokeStyle = 'rgba(255,255,200,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -55); g.stroke(); g.restore(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return TX.leaf = t;
}
function glowTex() {
  if (TX.glow) return TX.glow; const c = cnv(64), g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return TX.glow = new THREE.CanvasTexture(c);
}
function noiseTex() {
  if (TX.noise) return TX.noise; const S = 512, c = cnv(S), g = c.getContext('2d');
  g.fillStyle = '#0a0200'; g.fillRect(0, 0, S, S);
  const blob = (x, y, r, col) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2); } };
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) blob(Math.random() * S, Math.random() * S, 30 + Math.random() * 90, `rgba(${180 + Math.random() * 75 | 0},${50 + Math.random() * 60 | 0},0,.55)`);
  for (let i = 0; i < 40; i++) blob(Math.random() * S, Math.random() * S, 10 + Math.random() * 30, 'rgba(255,210,80,.55)');
  g.globalCompositeOperation = 'source-over'; g.strokeStyle = 'rgba(10,2,0,.7)'; g.lineCap = 'round';
  for (let i = 0; i < 26; i++) { let x = Math.random() * S, y = Math.random() * S; g.lineWidth = 6 + Math.random() * 14; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (Math.random() - .5) * 120; y += (Math.random() - .5) * 120; g.lineTo(x, y); } g.stroke(); }
  return TX.noise = tex(c, true, 5, 24);
}
function letterTex(ch) {
  const c = cnv(128), g = c.getContext('2d');
  const gr = g.createRadialGradient(54, 48, 6, 64, 64, 60); gr.addColorStop(0, '#fff6b8'); gr.addColorStop(.6, '#ffc21f'); gr.addColorStop(1, '#b86a00');
  g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = '#fff1a0'; g.stroke();
  g.fillStyle = '#6a3500'; g.font = '900 72px system-ui,Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ================= helpers ================= */
const tmpO = new THREE.Object3D(), tmpC = new THREE.Color(), V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3();
function instanced(geo, mat, list, shadow, recv) {
  if (!list.length) return null;
  const m = new THREE.InstancedMesh(geo, mat, list.length);
  list.forEach((it, i) => { tmpO.position.set(it.x, it.y, it.z); tmpO.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0); const s = it.s || 1; tmpO.scale.set(it.sx || s, it.sy || s, it.sz || s); tmpO.updateMatrix(); m.setMatrixAt(i, tmpO.matrix); if (it.c) m.setColorAt(i, tmpC.set(it.c)); });
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.castShadow = !!shadow; m.receiveShadow = !!recv; return m;
}

/* ================= world (rebuilt per level) ================= */
let W = null;
function clearWorld() {
  if (!W) return;
  W.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map && m.map.userData.own) m.map.dispose(); m.dispose(); }); });
  scene.remove(W.group); W = null;
}

function buildLevel(idx) {
  clearWorld();
  const L = LEVELS[idx], T = THEMES[L.th], d = D();
  R = rng(L.seed * 977 + 13);
  W = { idx, L, T, group: new THREE.Group(), plats: [], vines: [], zips: [], fruits: [], letters: [], enemies: [], checks: [], tips: L.tips.map(t => ({ z: t[0], txt: t[1], shown: false })), anim: [], len: 0, hazY: -14 };
  scene.add(W.group);
  const G = W.group, sway = L.sway, amp = 7;
  const xAt = z => Math.sin(z * sway) * amp + Math.sin(z * sway * 2.7 + 1) * 2;
  W.xAt = xAt;
  let z = 0, y = 0;
  const fruitCands = [];
  const P = (o) => { const p = Object.assign({ kind: 'ground', w: 6, d: 6, y: 0, x: 0, z: 0, solid: true }, o); p.x0 = p.x; p.y0 = p.y; W.plats.push(p); return p; };
  const fruitRow = (z0, z1, yy, n) => { for (let i = 0; i < n; i++) { const t = (i + .5) / n, zz = lerp(z0, z1, t); W.fruits.push({ x: xAt(zz), y: yy, z: zz }); } };
  const gapX = d.gap;
  for (const s of L.segs) {
    const [k, a] = s.split(':'), n = +a || 0;
    if (k === 'start') { P({ kind: 'ground', x: xAt(z + 7), z: z + 7, w: 9, d: 14, y }); W.spawn = new THREE.Vector3(xAt(z + 3), y, z + 3); z += 14; }
    else if (k === 'ground') { const len = n; P({ kind: 'ground', x: xAt(z + len / 2), z: z + len / 2, w: 7, d: len, y }); fruitRow(z + 1, z + len - 1, y + 1.2, Math.max(2, len / 3 | 0)); z += len; }
    else if (k === 'check') { P({ kind: 'ground', x: xAt(z + 4), z: z + 4, w: 8, d: 8, y }); W.checks.push({ x: xAt(z + 4) + 2.6, y, z: z + 4, on: false }); z += 8; }
    else if (k === 'branches') {
      for (let i = 0; i < n; i++) { const gap = 2.3 + R() * .9 + gapX; z += gap; const dy = clamp((R() - .5) * 1.4, -.9, .8); const ny = y + dy; const dep = 3 + R() * 1.5;
        fruitCands.push(new THREE.Vector3(xAt(z - gap / 2), Math.max(y, ny) + 2.2, z - gap / 2));
        W.fruits.push({ x: xAt(z - gap / 2), y: Math.max(y, ny) + 2.0, z: z - gap / 2 });
        y = ny; P({ kind: 'branch', x: xAt(z + dep / 2) + (R() - .5) * 1.5, z: z + dep / 2, w: 2.6, d: dep, y }); z += dep; }
    }
    else if (k === 'vines') {
      const startZ = z; z += 3; const top = y;
      for (let i = 0; i < n; i++) { const vz = z + i * 7.2, vx = xAt(vz); const A = new THREE.Vector3(vx, top + 10.5 + (R() - .5), vz);
        W.vines.push({ A, len: 7.4, x: vx, z: vz, ph: R() * 6, cool: 0 });
        fruitCands.push(new THREE.Vector3(vx, top + 4.4, vz + 3.6));
        for (let f = 0; f < 3; f++) W.fruits.push({ x: xAt(vz + 2 + f * 1.4), y: top + 3.4 + Math.sin(f / 2 * Math.PI) * 1.4, z: vz + 2 + f * 1.4 }); }
      z += (n - 1) * 7.2 + 5.5;
      P({ kind: 'ground', x: xAt(z + 3.5), z: z + 3.5, w: 7, d: 7, y }); z += 7;
    }
    else if (k === 'bounce') {
      for (let i = 0; i < n; i++) { z += 2.5; P({ kind: 'bounce', x: xAt(z + 1.8), z: z + 1.8, w: 3.6, d: 3.6, y: y - .6 }); fruitCands.push(new THREE.Vector3(xAt(z + 6), y + 8.5, z + 6));
        for (let f = 0; f < 4; f++) W.fruits.push({ x: xAt(z + 3.5 + f * 1.3), y: y + 4.5 + Math.sin(f / 3 * Math.PI) * 2.5, z: z + 3.5 + f * 1.3 });
        z += 3.6 + 6 + gapX; }
      P({ kind: 'ground', x: xAt(z + 3.5), z: z + 3.5, w: 7, d: 7, y }); z += 7;
    }
    else if (k === 'logs') {
      for (let i = 0; i < n; i++) { z += 2.4 + gapX * .5; const p = P({ kind: T.plat === 'basalt' ? 'basalt' : 'raft', x: xAt(z + 1.75), z: z + 1.75, w: 3.4, d: 3.5, y: y - .3 });
        p.move = { amp: 2.6 + R() * 1.2, spd: (.7 + R() * .5) * (d.enemy * .6 + .4), ph: R() * 6 }; W.fruits.push({ x: p.x, y: y + 1, z: p.z }); z += 3.5; }
      z += 2.4; P({ kind: 'ground', x: xAt(z + 3.5), z: z + 3.5, w: 7, d: 7, y }); z += 7;
    }
    else if (k === 'crumble') {
      for (let i = 0; i < n; i++) { z += 2.2 + gapX * .5; y = y + clamp((R() - .5) * 1.2, -.5, .5); const p = P({ kind: 'crumble', x: xAt(z + 1.9), z: z + 1.9, w: 3, d: 3.8, y }); p.cr = { t: -1, fall: 0 };
        W.fruits.push({ x: p.x, y: y + 1.2, z: p.z }); z += 3.8; }
      z += 2.6; P({ kind: 'ground', x: xAt(z + 3.5), z: z + 3.5, w: 7, d: 7, y }); z += 7;
    }
    else if (k === 'zip') {
      const len = n, drop = len * .18;
      const a = new THREE.Vector3(xAt(z - 1), y + 4.6, z - 1), b = new THREE.Vector3(xAt(z + len), y - drop + 4.6, z + len);
      W.zips.push({ a, b, len: a.distanceTo(b) });
      for (let f = 1; f < 8; f++) { const t = f / 8; W.fruits.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) - 1.1, z: lerp(a.z, b.z, t) }); }
      fruitCands.push(new THREE.Vector3(lerp(a.x, b.x, .5), lerp(a.y, b.y, .5) - 1.0, lerp(a.z, b.z, .5)));
      z += len; y -= drop; P({ kind: 'ground', x: xAt(z + 4), z: z + 4, w: 7, d: 8, y }); z += 8;
    }
    else if (k === 'snake') {
      const len = n; P({ kind: 'ground', x: xAt(z + len / 2), z: z + len / 2, w: 7, d: len, y });
      const cnt = 1 + (d.extra > 1 ? 1 : 0);
      for (let i = 0; i < cnt; i++) W.enemies.push({ type: 'snake', x: xAt(z + len * (.4 + i * .3)), y, z: z + len * (.4 + i * .3), cx: xAt(z + len / 2), range: 2.6, ph: R() * 6, hp: 2, alive: true });
      fruitRow(z + 1, z + len - 1, y + 1.2, 3); z += len;
    }
    else if (k === 'pillars') {
      for (let i = 0; i < n; i++) { const gap = 2.2 + R() * .7 + gapX * .7; z += gap; const dy = i % 2 ? -(.9 + R() * .9) : .7 + R() * .6; const ny = clamp(y + dy, y - 1.8, y + 1.3); y = ny;
        P({ kind: T.plat === 'basalt' ? 'basalt' : 'branch', x: xAt(z + 1) + (R() - .5) * 1.2, z: z + 1, w: 2.1, d: 2, y }); W.fruits.push({ x: xAt(z + 1), y: y + 1.3, z: z + 1 }); z += 2; }
      z += 2.4; P({ kind: 'ground', x: xAt(z + 3.5), z: z + 3.5, w: 7, d: 7, y }); z += 7;
    }
    else if (k === 'zigzag') {
      for (let i = 0; i < n; i++) { const gap = 2.4 + R() * .6 + gapX * .6; z += gap; const side = i % 2 ? -1 : 1; const dep = 2.8;
        P({ kind: 'branch', x: xAt(z + dep / 2) + side * 2.6, z: z + dep / 2, w: 2.3, d: dep, y }); W.fruits.push({ x: xAt(z + dep / 2) + side * 2.6, y: y + 1.3, z: z + dep / 2 }); z += dep; }
      z += 2.4; P({ kind: 'ground', x: xAt(z + 3.5), z: z + 3.5, w: 7, d: 7, y }); z += 7;
    }
    else if (k === 'vinesX') {
      const top = y; z += 3;
      for (let i = 0; i < n; i++) { const sp = 7.3 + R() * .5 + gapX * .4; const vz = z, vx = xAt(vz) + (R() - .5) * 1.2; const hh = top + 10.5 + (R() - .5) * 1.6;
        W.vines.push({ A: new THREE.Vector3(vx, hh, vz), len: 7.4 + (R() - .5) * .5, x: vx, z: vz, ph: R() * 6, cool: 0 });
        for (let f = 0; f < 2; f++) W.fruits.push({ x: xAt(vz + 2.5 + f * 2), y: top + 3.8 + f * .6, z: vz + 2.5 + f * 2 }); fruitCands.push(new THREE.Vector3(vx, top + 4.6, vz + 3.8)); z += sp; }
      z += -1.7; P({ kind: 'ground', x: xAt(z + 3.5), z: z + 3.5, w: 7, d: 7, y }); z += 7;
    }
    else if (k === 'gauntlet') {
      for (let i = 0; i < n; i++) { z += 2.3 + gapX * .5; const p = P({ kind: 'crumble', x: xAt(z + 1.9), z: z + 1.9, w: 3, d: 3.6, y }); p.cr = { t: -1, fall: 0 }; W.fruits.push({ x: p.x, y: y + 1.2, z: p.z });
        if (i % 2 === 1) W.enemies.push({ type: 'wasp', hx: xAt(z + 1.9), hy: y + 3.2, hz: z + 1.9, x: 0, y: 0, z: 0, ph: R() * 6, hp: 1, alive: true }); z += 3.6; }
      z += 2.6; P({ kind: 'ground', x: xAt(z + 3.5), z: z + 3.5, w: 7, d: 7, y }); z += 7;
    }
    else if (k === 'snakes') {
      const len = n; P({ kind: 'ground', x: xAt(z + len / 2), z: z + len / 2, w: 7, d: len, y }); const cnt = Math.max(2, Math.round(len / 7)) + (d.extra > 1 ? 1 : 0);
      for (let i = 0; i < cnt; i++) { const zz = z + len * ((i + .6) / (cnt + .4)); W.enemies.push({ type: 'snake', x: xAt(zz), y, z: zz, cx: xAt(zz), range: 2.4 + R(), ph: R() * 6, hp: 2, alive: true }); }
      fruitRow(z + 1, z + len - 1, y + 1.2, Math.max(3, len / 3 | 0)); z += len;
    }
    else if (k === 'wasp') { for (let i = 0; i < 1 + d.extra; i++) W.enemies.push({ type: 'wasp', hx: xAt(z + 4 + i * 5), hy: y + 3.2, hz: z + 4 + i * 5, x: 0, y: 0, z: 0, ph: R() * 6, hp: 1, alive: true }); }
    else if (k === 'end') { P({ kind: 'ground', x: xAt(z + 6), z: z + 6, w: 10, d: 12, y }); W.end = new THREE.Vector3(xAt(z + 8), y, z + 8); z += 12; }
  }
  W.len = z;
  W.hazY = Math.min(...W.plats.map(p => p.y)) - 13;
  // letters: 4 spread along the level
  fruitCands.sort((a, b) => a.z - b.z);
  const want = 4; for (let i = 0; i < want; i++) { const c = fruitCands[Math.min(fruitCands.length - 1, Math.round((i + .5) / want * fruitCands.length - .5))]; if (c) W.letters.push({ ch: 'ZORI'[i], x: c.x, y: c.y + .6, z: c.z, got: false }); }
  W.fruitTotal = W.fruits.length;
  buildVisuals();
}

/* ================= visuals ================= */
function addMesh(geo, mat, x, y, z, shadow = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; W.group.add(m); return m; }
function buildVisuals() {
  const T = W.T, G = W.group, len = W.len;
  // atmosphere
  skyMat.uniforms.top.value.set(T.top); skyMat.uniforms.hor.value.set(T.hor); skyMat.uniforms.sunC.value.set(T.sun); skyMat.uniforms.night.value = T.night || 0;
  skyMat.uniforms.sunDir.value.set(...T.sunDir).normalize();
  scene.fog = new THREE.Fog(C(T.fog), T.fogN, T.fogF);
  hemi.color.set(T.hemiS); hemi.groundColor.set(T.hemiG); hemi.intensity = T.hemiI;
  sun.color.set(T.sun); sun.intensity = T.sunI;
  bloom.strength = T.night ? .75 : T.hazard === 'lava' ? .7 : .42;
  renderer.toneMappingExposure = T.night ? 1.15 : 1.0;
  makeEnv();
  heroLight.intensity = T.night ? 9 : T.extra === 'storm' ? 3 : 0;
  const barkM = new THREE.MeshStandardMaterial({ map: barkTex(), roughness: .92, color: T.trees === 'dead' ? C('#4a3a32') : C('#ffffff') });
  const stoneM = new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: .88, color: T.plat === 'basalt' ? C('#4a4040') : C('#ffffff') });
  const grassM = new THREE.MeshStandardMaterial({ map: grassTex(), roughness: .95, color: C(T.night ? '#6f9a8a' : T.hazard === 'lava' ? '#7a5a40' : '#ffffff') });
  const dirtM = new THREE.MeshStandardMaterial({ color: C(T.hazard === 'lava' ? '#2a1a16' : '#5a3f2a'), roughness: 1 });
  const leafM = new THREE.MeshStandardMaterial({ roughness: .85, flatShading: true });
  const bamM = new THREE.MeshStandardMaterial({ map: bambooTex(), roughness: .6 });
  const H = W.hazY;
  /* --- platforms --- */
  for (const p of W.plats) {
    let m;
    if (p.kind === 'ground' || p.kind === 'check') {
      const top = (T.plat === 'stone' || T.plat === 'basalt') ? stoneM : grassM;
      const g = new RoundedBoxGeometry(p.w, 1.2, p.d, 3, .35); m = addMesh(g, [top, top, top, dirtM, top, top].length ? top : top, p.x, p.y - .6, p.z);
      const col = addMesh(new THREE.CylinderGeometry(p.w * .32, p.w * .18, p.y - H, 9, 1), T.plat === 'stone' || T.plat === 'basalt' ? stoneM : dirtM, p.x, (p.y + H) / 2 - 1, p.z, false);
      p.mesh = m;
    } else if (p.kind === 'branch') {
      if (T.plat === 'bamboo') { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, p.d + .4, 10), bamM); b.rotation.x = Math.PI / 2; b.position.set(-p.w / 2 + .35 + i * (p.w - .7) / 3, -.3, 0); b.castShadow = true; b.receiveShadow = true; g.add(b); } g.position.set(p.x, p.y, p.z); G.add(g); m = g;
        const pole = addMesh(new THREE.CylinderGeometry(.35, .4, p.y - H, 8), bamM, p.x, (p.y + H) / 2, p.z, false); }
      else { const g = new THREE.CylinderGeometry(p.w * .42, p.w * .5, p.d + .8, 12, 1); g.rotateX(Math.PI / 2); m = addMesh(g, barkM, p.x, p.y - p.w * .42, p.z);
        const moss = addMesh(new THREE.BoxGeometry(p.w * .7, .08, p.d), grassM, p.x, p.y - .02, p.z, false);
        const tr = addMesh(new THREE.CylinderGeometry(.7, 1.2, p.y - H - 1, 10), barkM, p.x, (p.y + H) / 2 - 1, p.z, false); }
      p.mesh = m;
    } else if (p.kind === 'raft') {
      const g = new THREE.Group(); for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, p.d, 10), T.trees === 'palm' ? barkM : bamM); b.rotation.x = Math.PI / 2; b.position.set(-p.w / 2 + .34 + i * (p.w - .68) / 4, -.32, 0); b.castShadow = true; b.receiveShadow = true; g.add(b); }
      g.position.set(p.x, p.y, p.z); G.add(g); p.mesh = g;
    } else if (p.kind === 'stone' || p.kind === 'crumble' || p.kind === 'basalt') {
      m = addMesh(new RoundedBoxGeometry(p.w, 1, p.d, 2, .18), stoneM, p.x, p.y - .5, p.z); p.mesh = m;
    } else if (p.kind === 'bounce') {
      const g = new THREE.Group();
      const capM = new THREE.MeshStandardMaterial({ color: C(T.night ? '#3ad6ff' : '#ff4f6a'), emissive: C(T.night ? '#20a8ff' : '#ff2050'), emissiveIntensity: T.night ? 1.6 : .35, roughness: .45 });
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1.9, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), capM); cap.scale.y = .55; cap.castShadow = true; g.add(cap);
      const dotM = new THREE.MeshStandardMaterial({ color: C('#fff6e8'), roughness: .6 });
      for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28, r = i ? 1.15 : 0; const dd = new THREE.Mesh(new THREE.SphereGeometry(.28, 10, 8), dotM); dd.position.set(Math.cos(a) * r, i ? .78 : 1.02, Math.sin(a) * r); dd.scale.y = .4; g.add(dd); }
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(.5, .7, p.y - H, 10), new THREE.MeshStandardMaterial({ color: C('#efe2c8'), roughness: .8 })); stem.position.y = -(p.y - H) / 2; g.add(stem);
      g.position.set(p.x, p.y - .2, p.z); G.add(g); p.mesh = g; p.cap = cap;
    }
  }
  /* --- vines --- */
  const vineM = new THREE.MeshStandardMaterial({ color: C(T.night ? '#3f7a4a' : '#5a7a2a'), roughness: .8 });
  const vleafM = new THREE.MeshStandardMaterial({ map: leafCardTex(), transparent: true, alphaTest: .4, side: THREE.DoubleSide, roughness: .7 });
  for (const v of W.vines) {
    v.pts = []; for (let i = 0; i <= 10; i++) v.pts.push(new THREE.Vector3());
    v.curve = new THREE.CatmullRomCurve3(v.pts);
    v.mesh = new THREE.Mesh(new THREE.TubeGeometry(v.curve, 20, .085, 6), vineM); v.mesh.castShadow = true; G.add(v.mesh);
    // canopy blob the vine hangs from
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 1), leafM.clone()); blob.material.color.set(T.leaf[0]); blob.position.copy(v.A).add(V1.set(0, 1.4, 0)); blob.scale.set(1.4, .8, 1.2); blob.castShadow = true; G.add(blob);
    v.leaves = []; for (let i = 0; i < 5; i++) { const lf = new THREE.Mesh(new THREE.PlaneGeometry(.7, .7), vleafM); G.add(lf); v.leaves.push(lf); }
    v.tip = new THREE.Vector3(v.A.x, v.A.y - v.len, v.A.z); v.vel = new THREE.Vector3();
    updateVineShape(v, 0);
  }
  /* --- ziplines --- */
  const cableM = new THREE.MeshStandardMaterial({ color: C('#d8c8a0'), roughness: .5, metalness: .2 });
  for (const zl of W.zips) {
    const curve = new THREE.LineCurve3(zl.a, zl.b); G.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 2, .06, 6), cableM));
    for (const e of [zl.a, zl.b]) addMesh(new THREE.CylinderGeometry(.35, .5, e.y - W.hazY + 2, 8), barkM, e.x + 1.2, (e.y + W.hazY) / 2, e.z);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.3, .07, 8, 18), new THREE.MeshStandardMaterial({ color: C('#ffb040'), emissive: C('#ff8000'), emissiveIntensity: .6 }));
    handle.position.copy(zl.a); G.add(handle); zl.handle = handle;
  }
  /* --- hazard floor --- */
  const hz = new THREE.PlaneGeometry(260, len + 260, 80, 80); hz.rotateX(-Math.PI / 2);
  let hzM;
  if (T.hazard === 'water') {
    hzM = new THREE.MeshStandardMaterial({ color: C(T.water), roughness: .08, metalness: .2, envMapIntensity: 1.2, transparent: true, opacity: .93 });
    hzM.onBeforeCompile = sh => { sh.uniforms.uT = { value: 0 }; W.waterU = sh.uniforms.uT;
      sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.y += sin(position.x*.35+uT*1.3)*.35+cos(position.z*.27+uT*1.1)*.3;')
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n objectNormal = normalize(vec3(-cos(position.x*.35+uT*1.3)*.12, 1.0, sin(position.z*.27+uT*1.1)*.08));'); };
  } else if (T.hazard === 'lava') {
    const nt = noiseTex(); hzM = new THREE.MeshStandardMaterial({ color: C('#200400'), emissive: C('#ff5a10'), emissiveMap: nt, emissiveIntensity: 2.4, roughness: .9 }); W.lavaTex = nt;
  } else {
    hzM = new THREE.MeshStandardMaterial({ color: C(T.night ? '#081418' : '#1f3a26'), roughness: 1 });
  }
  const hzMesh = new THREE.Mesh(hz, hzM); hzMesh.position.set(0, W.hazY, len / 2); hzMesh.receiveShadow = true; G.add(hzMesh);
  /* --- side forest / scenery --- */
  buildScenery(T, leafM, barkM, stoneM, bamM);
  /* --- fruits --- */
  const fg = new THREE.SphereGeometry(.32, 16, 12); fg.scale(.92, 1.1, .92);
  W.fruitMesh = new THREE.InstancedMesh(fg, new THREE.MeshStandardMaterial({ color: C('#ff8a1a'), emissive: C('#ff5a00'), emissiveIntensity: .45, roughness: .35 }), W.fruits.length);
  W.fruitLeaf = new THREE.InstancedMesh(new THREE.ConeGeometry(.1, .3, 6).rotateZ(.8).translate(.08, .42, 0), new THREE.MeshStandardMaterial({ color: C('#3faa3a') }), W.fruits.length);
  W.fruitMesh.castShadow = true; G.add(W.fruitMesh, W.fruitLeaf); W.fruitMesh.frustumCulled = W.fruitLeaf.frustumCulled = false;
  W.fruits.forEach(f => { f.got = false; f.ph = R() * 6; });
  /* --- letters --- */
  for (const l of W.letters) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: letterTex(l.ch), depthWrite: false })); s.scale.set(1.25, 1.25, 1); s.position.set(l.x, l.y, l.z); G.add(s); l.spr = s;
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: HDR('#ffd25e', 2), blending: THREE.AdditiveBlending, depthWrite: false })); gl.scale.set(3, 3, 1); s.add(gl); gl.scale.set(2.4, 2.4, 1); }
  /* --- checkpoints (totems) --- */
  for (const c of W.checks) {
    const g = new THREE.Group(); g.position.set(c.x, c.y, c.z);
    const woodM = new THREE.MeshStandardMaterial({ map: barkTex(), color: C('#c08a5a'), roughness: .8 });
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new RoundedBoxGeometry(.9, .8, .9, 2, .12), woodM); b.position.y = .4 + i * .82; b.castShadow = true; g.add(b);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(.55, .12, .05), new THREE.MeshBasicMaterial({ color: 0x221100 })); eye.position.set(0, .5 + i * .82, -.46); g.add(eye); }
    c.gem = new THREE.Mesh(new THREE.OctahedronGeometry(.32, 0), new THREE.MeshStandardMaterial({ color: C('#555'), emissive: C('#000'), roughness: .3, metalness: .4 })); c.gem.position.y = 2.95; g.add(c.gem);
    G.add(g); c.g = g;
  }
  /* --- end portal --- */
  if (W.end) {
    const g = new THREE.Group(); g.position.copy(W.end);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, .42, 14, 48), stoneM); ring.position.y = 2.9; ring.castShadow = true; g.add(ring);
    const core = new THREE.Mesh(new THREE.CircleGeometry(2.05, 48), new THREE.MeshBasicMaterial({ color: HDR('#7fffd0', 1.6), transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false })); core.position.y = 2.9; g.add(core);
    for (let i = 0; i < 2; i++) { const pil = new THREE.Mesh(new THREE.BoxGeometry(.9, 5.6, .9), stoneM); pil.position.set(i ? 2.9 : -2.9, 2.8, 0); pil.castShadow = true; g.add(pil); }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color: HDR('#7fffd0', 1.2), transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false })); beam.position.y = 30; g.add(beam);
    G.add(g); W.portal = { g, core, ring };
  }
  /* --- enemies --- */
  for (const e of W.enemies) {
    const g = new THREE.Group();
    if (e.type === 'snake') {
      const bm = new THREE.MeshStandardMaterial({ color: C(W.T.hazard === 'lava' ? '#c84a1a' : '#4fa83a'), roughness: .45 }); const sm = new THREE.MeshStandardMaterial({ color: C('#f2d24a'), roughness: .5 });
      e.segs = []; for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.26 - i * .015, 12, 10), i % 2 ? sm : bm); s.castShadow = true; g.add(s); e.segs.push(s); }
      const head = e.segs[0]; head.scale.set(1.25, 1, 1.5);
      [-1, 1].forEach(sd => { const ey = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0x000000 })); ey.position.set(sd * .14, .12, .2); head.add(ey);
        const ew = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); ew.position.set(sd * .14, .1, .16); head.add(ew); });
    } else {
      const body = new THREE.Mesh(new THREE.SphereGeometry(.34, 14, 10), new THREE.MeshStandardMaterial({ color: C('#ffc21f'), roughness: .4 })); body.scale.set(.9, .9, 1.3); g.add(body);
      for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(new THREE.TorusGeometry(.3, .07, 6, 16), new THREE.MeshStandardMaterial({ color: C('#1a1a1a') })); st.position.z = -.15 + i * .18; g.add(st); }
      const wingM = new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: .55, side: THREE.DoubleSide });
      e.wings = [-1, 1].map(sd => { const w = new THREE.Mesh(new THREE.PlaneGeometry(.55, .3), wingM); w.position.set(sd * .35, .28, 0); g.add(w); return w; });
      const ey = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 })); ey.position.set(0, .1, .42); g.add(ey);
      g.traverse(o => o.castShadow = true);
    }
    G.add(g); e.g = g;
  }
  /* --- particles --- */
  buildParticles(T);
}

function buildScenery(T, leafM, barkM, stoneM, bamM) {
  const G = W.group, len = W.len, xAt = W.xAt, H = W.hazY;
  const trunks = [], blobs = [], bams = [], rocks = [], ferns = [], fronds = [];
  for (let z = -30; z < len + 60; z += 4 + R() * 4) {
    for (const side of [-1, 1]) {
      if (R() < .2) continue;
      const off = 11 + R() * 16, x = xAt(z) + side * off;
      if (T.trees === 'broad' || T.trees === 'cliff' || T.trees === 'pillar') {
        if (T.trees === 'pillar' && R() < .4) { rocks.push({ x, y: H + 10 + R() * 4, z, sx: 2.2, sy: 24 + R() * 10, sz: 2.2, c: '#c8b89a', ry: R() * 3 }); continue; }
        const h = 26 + R() * 14; trunks.push({ x, y: H + h / 2, z, sx: 1 + R() * .5, sy: h / 20, sz: 1 + R() * .5 });
        for (let k = 0; k < 4; k++) blobs.push({ x: x + (R() - .5) * 6, y: H + h - 1 + R() * 4, z: z + (R() - .5) * 6, s: 3 + R() * 2.5, sy: (3 + R() * 2) * .7, c: T.leaf[(R() * T.leaf.length) | 0], ry: R() * 6 });
      } else if (T.trees === 'palm') {
        const h = 18 + R() * 10, lean = side * (.1 + R() * .15);
        trunks.push({ x, y: H + h / 2, z, sx: .55, sy: h / 20, sz: .55, rz: -lean });
        const tx = x + Math.sin(lean) * h * .5;
        for (let k = 0; k < 7; k++) fronds.push({ x: tx, y: H + h, z, ry: k / 7 * 6.28 + R() * .3, rz: .9 + R() * .3, s: 1, c: T.leaf[(R() * T.leaf.length) | 0] });
      } else if (T.trees === 'bamboo') {
        for (let k = 0; k < 4; k++) { const h = 22 + R() * 14; bams.push({ x: x + (R() - .5) * 4, y: H + h / 2, z: z + (R() - .5) * 4, sx: 1, sy: h / 20, sz: 1, rz: (R() - .5) * .1 }); fronds.push({ x: x + (R() - .5) * 4, y: H + h, z: z + (R() - .5) * 4, ry: R() * 6, rz: 1.1, s: .7, c: T.leaf[(R() * T.leaf.length) | 0] }); }
      } else if (T.trees === 'dead') {
        const h = 14 + R() * 10; trunks.push({ x, y: H + h / 2, z, sx: .6, sy: h / 20, sz: .6, rz: (R() - .5) * .2 });
        for (let k = 0; k < 3; k++) trunks.push({ x: x + (R() - .5) * 2, y: H + h * (.6 + R() * .3), z, sx: .2, sy: .25, sz: .2, rz: (R() < .5 ? -1 : 1) * (.8 + R() * .5) });
        if (R() < .5) rocks.push({ x: x + (R() - .5) * 6, y: H + 2, z, s: 3 + R() * 4, c: '#3a2a26', ry: R() * 3 });
      }
      if (T.trees === 'cliff' && R() < .6) rocks.push({ x: xAt(z) + side * (20 + R() * 10), y: H + 12, z, sx: 9, sy: 30 + R() * 14, sz: 9, c: '#7a8a80', ry: R() * 3 });
    }
  }
  const trunkG = new THREE.CylinderGeometry(.7, 1.1, 20, 9, 1);
  const tm = instanced(trunkG, barkM, trunks, true, false); if (tm) G.add(tm);
  const blobG = new THREE.IcosahedronGeometry(1, 1);
  const lm = instanced(blobG, leafM, blobs, true, false); if (lm) G.add(lm);
  const bm = instanced(new THREE.CylinderGeometry(.28, .32, 20, 8), bamM, bams, true, false); if (bm) G.add(bm);
  const rm = instanced(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: .9, flatShading: true }), rocks, true, true); if (rm) G.add(rm);
  // palm / bamboo fronds: long leaf planes
  if (fronds.length) {
    const fg = new THREE.PlaneGeometry(1.6, 6, 1, 4); fg.translate(0, 3, 0); const pa = fg.attributes.position; for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); pa.setZ(i, -y * y * .05); pa.setX(i, pa.getX(i) * (1 - y / 7)); } fg.computeVertexNormals();
    const fm = instanced(fg, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .7 }), fronds.map(f => ({ ...f, rx: 0 })), true, false);
    if (fm) { fronds.forEach((f, i) => { tmpO.position.set(f.x, f.y, f.z); tmpO.rotation.set(0, f.ry, 0); tmpO.rotateX(f.rz); tmpO.scale.setScalar(f.s); tmpO.updateMatrix(); fm.setMatrixAt(i, tmpO.matrix); }); G.add(fm); }
  }
  // decorative hanging vines from canopy near the path
  const hv = []; for (let z = 0; z < len; z += 3 + R() * 4) for (const side of [-1, 1]) if (R() < .55) hv.push({ x: W.xAt(z) + side * (5 + R() * 5), y: 9 + R() * 5, z, sx: 1, sy: .4 + R() * .5, sz: 1 });
  const hvm = instanced(new THREE.CylinderGeometry(.05, .05, 20, 4).translate(0, -10, 0), new THREE.MeshStandardMaterial({ color: C('#4a6a2a') }), hv, false, false); if (hvm) G.add(hvm);
  // ferns on ground platforms
  for (const p of W.plats) if (p.kind === 'ground' && T.hazard !== 'lava') for (let i = 0; i < p.d * .9; i++) { const side = R() < .5 ? -1 : 1; ferns.push({ x: p.x + side * (p.w / 2 - .4 - R() * .8), y: p.y, z: p.z + (R() - .5) * p.d, s: .5 + R() * .5, ry: R() * 6, c: T.leaf[(R() * T.leaf.length) | 0] }); }
  const fernG = mergeGeometries([0, 1, 2].map(k => { const g = new THREE.PlaneGeometry(1.3, 1.1); g.translate(0, .5, 0); g.rotateX(-.25); g.rotateY(k * Math.PI / 3); return g; }));
  const fm2 = instanced(fernG, new THREE.MeshStandardMaterial({ map: leafCardTex(), alphaTest: .45, side: THREE.DoubleSide, roughness: .8 }), ferns, false, false); if (fm2) G.add(fm2);
  // far silhouettes
  const far = []; for (let z = -60; z < len + 120; z += 18) for (const side of [-1, 1]) far.push({ x: W.xAt(z) + side * (60 + R() * 50), y: H + 20, z, sx: 10 + R() * 10, sy: 30 + R() * 30, sz: 10 + R() * 10, c: T.night ? '#0c1828' : T.hazard === 'lava' ? '#2a0e0c' : '#2f5a44' });
  const farM = instanced(new THREE.ConeGeometry(1, 2, 7), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), far, false, false); if (farM) G.add(farM);
  /* theme extras */
  if (T.extra === 'falls') {
    const fallM = new THREE.MeshBasicMaterial({ color: HDR('#e8fbff', 1.2), transparent: true, opacity: .55, depthWrite: false, map: (() => { const c = cnv(64, 256), g = c.getContext('2d'); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${.2 + Math.random() * .6})`; g.fillRect(Math.random() * 64, Math.random() * 256, 2 + Math.random() * 4, 30 + Math.random() * 80); } const t = tex(c, true, 2, 1); return t; })() });
    W.fallTex = fallM.map;
    for (let z = 20; z < len; z += 38) for (const side of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(8, 44), fallM); m.position.set(W.xAt(z) + side * 17, H + 18, z); m.rotation.y = side > 0 ? -Math.PI / 2 + .3 : Math.PI / 2 - .3; G.add(m); }
  }
  if (T.extra === 'ruins') {
    for (let z = 15; z < len; z += 26) { const side = R() < .5 ? -1 : 1; const g = new THREE.Group(); const sM = new THREE.MeshStandardMaterial({ map: stoneTex(), color: C('#d8c8a8'), roughness: .9 });
      const head = new THREE.Mesh(new RoundedBoxGeometry(4, 5, 3.6, 2, .4), sM); head.position.y = 2.5; g.add(head);
      [-1, 1].forEach(s => { const e = new THREE.Mesh(new THREE.BoxGeometry(.9, .5, .3), new THREE.MeshBasicMaterial({ color: HDR('#ffb040', 2) })); e.position.set(s * .9, 3.2, -1.82); g.add(e); });
      const nose = new THREE.Mesh(new THREE.BoxGeometry(.7, 1.4, .5), sM); nose.position.set(0, 2.2, -1.9); g.add(nose);
      g.position.set(W.xAt(z) + side * 10, -2, z); g.rotation.y = side * .5 + Math.PI; g.traverse(o => { o.castShadow = true; o.receiveShadow = true; }); G.add(g); }
  }
  if (T.extra === 'shrooms') {
    const sh = []; for (let z = 0; z < len; z += 2 + R() * 3) for (const side of [-1, 1]) if (R() < .5) sh.push({ x: W.xAt(z) + side * (6 + R() * 8), y: -2 + R() * 6, z, s: .5 + R() * .9, c: ['#3ad6ff', '#b46bff', '#4fffb0'][(R() * 3) | 0] });
    const m = instanced(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ emissive: C('#ffffff'), emissiveIntensity: .0, roughness: .4 }), sh, false, false);
    if (m) { m.material = new THREE.MeshBasicMaterial({ color: HDR('#ffffff', 1) }); sh.forEach((s, i) => m.setColorAt(i, tmpC.set(s.c).multiplyScalar(1.1))); m.instanceColor.needsUpdate = true; G.add(m); }
    const moon = new THREE.Mesh(new THREE.CircleGeometry(14, 32), new THREE.MeshBasicMaterial({ color: HDR('#e8f0ff', 1.6), fog: false })); moon.position.set(-80, 120, len + 200); moon.lookAt(0, 0, 0); G.add(moon);
  }
}

/* particles: butterflies, leaves, fireflies, embers, rain, mist, dust */
function buildParticles(T) {
  const kind = T.fx, n = kind === 'rain' ? 1600 : kind === 'firefly' ? 260 : 220;
  const pos = new Float32Array(n * 3), data = [];
  for (let i = 0; i < n; i++) data.push({ x: (R() - .5) * 40, y: R() * 16 - 2, z: R() * 60 - 10, ph: R() * 6, sp: .5 + R() });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  let mat;
  if (kind === 'rain') { mat = new THREE.PointsMaterial({ color: HDR('#bcd4ff', 1), size: .08, transparent: true, opacity: .6, depthWrite: false }); }
  else { const col = { butterfly: '#ffd25e', leaf: '#9ad04a', firefly: '#c8ff6a', ember: '#ff7a2a', mist: '#ffffff', dust: '#ffe8b0' }[kind];
    mat = new THREE.PointsMaterial({ color: HDR(col, kind === 'firefly' || kind === 'ember' ? 3 : kind === 'mist' ? .5 : 1.2), size: kind === 'mist' ? 6 : kind === 'firefly' ? .35 : .22, map: glowTex(), transparent: true, depthWrite: false, blending: kind === 'mist' ? THREE.NormalBlending : THREE.AdditiveBlending, opacity: kind === 'mist' ? .25 : 1 }); }
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; W.group.add(pts);
  W.fx = { kind, pts, pos, data, n };
}
function updateParticles(dt, t) {
  const F = W.fx; if (!F) return; const cx = P.pos.x, cz = P.pos.z, cy = P.pos.y;
  for (let i = 0; i < F.n; i++) { const d = F.data[i];
    if (F.kind === 'rain') { d.y -= dt * 28; if (d.y < -6) d.y += 26; }
    else if (F.kind === 'ember') { d.y += dt * d.sp * 1.5; if (d.y > 18) d.y = -4; }
    else if (F.kind === 'leaf') { d.y -= dt * d.sp * .7; d.x += Math.sin(t + d.ph) * dt; if (d.y < -4) d.y = 16; }
    let wz = d.z + Math.floor((cz - d.z + 20) / 60) * 60; // wrap around player
    const k = i * 3; F.pos[k] = cx + d.x + (F.kind === 'butterfly' || F.kind === 'firefly' ? Math.sin(t * d.sp + d.ph) * 1.2 : 0);
    F.pos[k + 1] = cy + d.y + (F.kind === 'firefly' || F.kind === 'butterfly' ? Math.sin(t * 1.7 * d.sp + d.ph) * .6 : 0); F.pos[k + 2] = wz;
  }
  F.pts.geometry.attributes.position.needsUpdate = true;
}

/* ================= vines simulation ================= */
function updateVineShape(v, t) {
  // free vine sways; held vine stretches to hero hand
  const A = v.A;
  if (v === P.vine) v.tip.copy(handPos(V3));
  else { const sx = Math.sin(t * .9 + v.ph) * .5, sz = Math.cos(t * .7 + v.ph) * .4;
    v.tip.x += ((A.x + sx) - v.tip.x) * .08; v.tip.z += ((A.z + sz) - v.tip.z) * .08; v.tip.y += ((A.y - v.len) - v.tip.y) * .08; }
  for (let i = 0; i <= 10; i++) { const k = i / 10; v.pts[i].set(lerp(A.x, v.tip.x, k), lerp(A.y, v.tip.y, k), lerp(A.z, v.tip.z, k));
    const sag = Math.sin(k * Math.PI) * (v === P.vine ? .15 : .35); v.pts[i].x += sag * .4; v.pts[i].z -= sag * .2; }
  v.mesh.geometry.dispose(); v.mesh.geometry = new THREE.TubeGeometry(v.curve, 16, .085, 6);
  v.leaves.forEach((lf, i) => { const p = v.pts[2 + i * 1.6 | 0]; lf.position.copy(p); lf.rotation.set(.4, i * 1.3 + t * .2, .2); });
}

/* ================= hero: ZORI ================= */
const HERO = (() => {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.position.y = .92;
  const skin = new THREE.MeshPhysicalMaterial({ color: C('#c98a5a'), roughness: .55, sheen: .4, sheenColor: C('#ff9a7a') });
  const tunic = new THREE.MeshStandardMaterial({ color: C('#2f9a5a'), roughness: .7 });
  const tunic2 = new THREE.MeshStandardMaterial({ color: C('#57c27a'), roughness: .7 });
  const hairM = new THREE.MeshStandardMaterial({ color: C('#2a1a12'), roughness: .6 });
  const bandM = new THREE.MeshStandardMaterial({ color: C('#ff8a1a'), roughness: .5, emissive: C('#ff5a00'), emissiveIntensity: .15 });
  const beadM = new THREE.MeshStandardMaterial({ color: C('#3ad6ff'), roughness: .2, metalness: .3, emissive: C('#1aa8ff'), emissiveIntensity: .6 });
  const M = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; return o; };
  // torso + leaf tunic
  const torso = M(new THREE.CapsuleGeometry(.2, .32, 6, 14), tunic, 0, .32, 0); torso.scale.set(1.15, 1, .8); body.add(torso);
  const belt = M(new THREE.TorusGeometry(.2, .035, 6, 20), bandM, 0, .1, 0); belt.rotation.x = Math.PI / 2; belt.scale.set(1.15, .8, 1); body.add(belt);
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; const lf = M(new THREE.ConeGeometry(.07, .26, 4), i % 2 ? tunic : tunic2, Math.sin(a) * .2, -.05, Math.cos(a) * .15); lf.rotation.x = Math.PI; body.add(lf); }
  const neck = M(new THREE.CylinderGeometry(.06, .07, .1, 10), skin, 0, .62, 0); body.add(neck);
  const bead = M(new THREE.OctahedronGeometry(.05, 0), beadM, 0, .52, .16); body.add(bead);
  // head
  const head = new THREE.Group(); head.position.y = .82; body.add(head);
  const skull = M(new THREE.SphereGeometry(.17, 22, 16), skin); skull.scale.set(1, 1.05, 1); head.add(skull);
  const hair = M(new THREE.SphereGeometry(.185, 22, 14, 0, Math.PI * 2, 0, Math.PI * .55), hairM, 0, .02, -.015); head.add(hair);
  const tail = M(new THREE.CapsuleGeometry(.055, .3, 4, 8), hairM, 0, -.02, -.2); tail.rotation.x = .5; head.add(tail);
  const band = M(new THREE.TorusGeometry(.175, .028, 6, 26), bandM, 0, .05, 0); band.rotation.x = Math.PI / 2 - .12; head.add(band);
  const feather = M(new THREE.ConeGeometry(.045, .32, 6), new THREE.MeshStandardMaterial({ color: C('#ff3b5c'), roughness: .5 }), .14, .2, -.08); feather.rotation.z = -.5; head.add(feather);
  [-1, 1].forEach(s => { const w = M(new THREE.SphereGeometry(.042, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), s * .065, .02, .145); head.add(w);
    const p = M(new THREE.SphereGeometry(.024, 8, 6), new THREE.MeshBasicMaterial({ color: 0x1a0e08 }), s * .065, .02, .175); head.add(p);
    const paint = M(new THREE.BoxGeometry(.06, .012, .01), bandM, s * .1, -.04, .15); paint.rotation.z = s * .3; head.add(paint); });
  // limbs
  function limb(len, r, mat) { const g = new THREE.Group(); const m = M(new THREE.CapsuleGeometry(r, len, 4, 10), mat, 0, -len / 2 - r * .5, 0); g.add(m); return g; }
  const armL = limb(.24, .055, skin), armR = limb(.24, .055, skin); armL.position.set(.26, .56, 0); armR.position.set(-.26, .56, 0);
  const foreL = limb(.22, .048, skin), foreR = limb(.22, .048, skin); foreL.position.y = -.31; foreR.position.y = -.31; armL.add(foreL); armR.add(foreR);
  [foreL, foreR].forEach(f => { const br = M(new THREE.TorusGeometry(.055, .018, 6, 14), bandM, 0, -.2, 0); br.rotation.x = Math.PI / 2; f.add(br); });
  const handL = new THREE.Object3D(), handR = new THREE.Object3D(); handL.position.y = -.33; handR.position.y = -.33; foreL.add(handL); foreR.add(handR);
  body.add(armL, armR);
  const legL = limb(.3, .07, skin), legR = limb(.3, .07, skin); legL.position.set(.1, 0, 0); legR.position.set(-.1, 0, 0);
  const shinL = limb(.3, .06, skin), shinR = limb(.3, .06, skin); shinL.position.y = -.4; shinR.position.y = -.4; legL.add(shinL); legR.add(shinR);
  [shinL, shinR].forEach(s => { const f = M(new THREE.BoxGeometry(.1, .06, .22), new THREE.MeshStandardMaterial({ color: C('#6a3a1a') }), 0, -.42, .04); s.add(f); });
  const shorts = M(new THREE.CylinderGeometry(.2, .22, .18, 14), new THREE.MeshStandardMaterial({ color: C('#7a4a22'), roughness: .8 }), 0, -.02, 0); shorts.scale.z = .8; body.add(shorts);
  body.add(legL, legR);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root, body, head, armL, armR, foreL, foreR, legL, legR, shinL, shinR, handL, handR, tail };
})();
scene.add(HERO.root);
const heroLight = new THREE.PointLight(0xbfe8ff, 0, 14, 1.6); scene.add(heroLight);
const pose = { al: 0, ar: 0, alz: .15, arz: .15, el: -.3, er: -.3, ll: 0, lr: 0, sl: 0, sr: 0, lean: 0 };
function handPos(out) { HERO.root.updateMatrixWorld(true); HERO.handL.getWorldPosition(V1); HERO.handR.getWorldPosition(V2); return out.copy(V1).add(V2).multiplyScalar(.5); }

/* ================= player state ================= */
const P = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), prevY: 0, ground: false, plat: null, coyote: 0, buf: 0, face: 0, vine: null, ropeL: 0, zip: null, zipT: 0, zipV: 0,
  hearts: 3, lives: 3, inv: 0, fruit: 0, letters: 0, cp: null, time: 0, phase: 0, dead: false, throwCD: 0, squash: 0 };
const inp = { x: 0, y: 0, jump: false, jumpHeld: false, throw: false };
const keys = {};
let state = 'title', curLevel = 0;

function startLevel(i) {
  curLevel = i; stones.length = 0; bursts.length = 0; buildLevel(i); const d = D();
  P.hearts = d.hearts; P.lives = d.lives; P.fruit = 0; P.letters = 0; P.time = 0; P.cp = W.spawn.clone();
  respawn(true); state = 'play';
  showScreens(); updateHud();
  const T = W.T, NM = W.L.nm || T.name; $('banN').textContent = 'Poziom ' + (i + 1) + ' · ' + (W.L.ne || T.en); $('banT').textContent = T.ic + ' ' + NM; flashBanner();
  $('lvName').textContent = (i + 1) + ' · ' + NM;
  music.setTheme(W.L.th); resize();
}
function respawn(first) {
  P.pos.copy(P.cp); P.vel.set(0, 0, 0); P.vine = null; P.zip = null; P.ground = true; P.prevY = P.pos.y; P.inv = first ? 0 : 1.5; P.dead = false; P.face = 0;
  camPos.set(P.pos.x, P.pos.y + 4, P.pos.z - 9); HERO.root.visible = true;
}
function hurt(knock) {
  if (P.inv > 0 || state !== 'play') return;
  P.hearts--; P.inv = 1.4; sfx.hurt(); buzz([40, 30, 60]); flashHurt();
  if (knock) { P.vel.add(knock); P.ground = false; }
  if (P.hearts <= 0) loseLife(); updateHud();
}
function fell() { if (P.dead) return; P.dead = true; window.__lastFall = P.pos.z; sfx.splash(); burst(P.pos.x, W.hazY + .5, P.pos.z, W.T.hazard === 'lava' ? '#ff7a2a' : W.T.hazard === 'water' ? '#bff4ff' : '#cfe8d0', 30, 6);
  setTimeout(() => { if (state !== 'play') return; P.hearts--; flashHurt(); if (P.hearts <= 0) loseLife(); else respawn(); updateHud(); }, 700); }
function loseLife() {
  P.lives--; if (P.lives <= 0) { state = 'over'; showScreens(); sfx.lose(); return; }
  P.hearts = D().hearts; toast('💔  ' + P.lives + ' żyć zostało', 1600); respawn();
}

/* ================= physics ================= */
const GRAV = 26, JUMP = 10.2, RUN = 7.6;
const landRing = new THREE.Mesh(new THREE.RingGeometry(.42, .6, 28), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .55, depthWrite: false })); landRing.rotation.x = -Math.PI / 2; landRing.renderOrder = 5; landRing.visible = false; scene.add(landRing);
function jumpAssist(d) { // steer a platform jump so it lands on the next platform ahead
  let best = null; for (const p of W.plats) { if (!p.solid || p === P.plat || p.kind === 'bounce') continue; const front = p.z - p.d / 2; if (front < P.pos.z - .5 || front - P.pos.z > 9.5 || Math.abs(p.y - P.pos.y) > 3) continue; if (P.plat && p.z <= P.plat.z) continue; if (!best || p.z < best.z) best = p; }
  if (!best) return; const dh = best.y - P.pos.y, disc = JUMP * JUMP - 2 * GRAV * dh; if (disc <= 0) return; const t = (JUMP + Math.sqrt(disc)) / GRAV;
  const tz = clamp(P.pos.z + Math.max(P.vel.z, 2) * t, best.z - best.d / 2 + 1, best.z + best.d / 2 - .9); const tx = best.move ? best.x0 + Math.sin((W.t + t) * best.move.spd + best.move.ph) * best.move.amp : best.x;
  const vz = (tz - P.pos.z) / t, vx = (tx - P.pos.x) / t; if (vz > RUN * 1.45 || Math.abs(vx) > RUN * 1.3) return; const a = Math.max(.55, d.assist);
  P.vel.z = lerp(P.vel.z, vz, a); P.vel.x = lerp(P.vel.x, vx, a); P.bounceLock = t * .75; P.assistJ = true; }
function platAt(p, x, z, r) { return x > p.x - p.w / 2 - r && x < p.x + p.w / 2 + r && z > p.z - p.d / 2 - r && z < p.z + p.d / 2 + r; }
function step(dt) {
  const d = D();
  P.time += dt; P.inv = Math.max(0, P.inv - dt); P.throwCD -= dt;
  // world anim: moving & crumbling platforms
  for (const p of W.plats) {
    if (p.move) { const nx = p.x0 + Math.sin(W.t * p.move.spd + p.move.ph) * p.move.amp; p.dx = nx - p.x; p.x = nx; if (p.mesh) p.mesh.position.x = p.x; }
    if (p.cr) { if (p.cr.t >= 0) { p.cr.t += dt; if (p.mesh) { p.mesh.position.x = p.x + Math.sin(p.cr.t * 60) * .05; }
        if (p.cr.t > 1.15) { p.solid = false; p.cr.fall += dt * 18; p.mesh.position.y -= p.cr.fall * dt; p.mesh.rotation.x += dt * .8; }
        if (p.cr.t > 3.6) { p.cr.t = -1; p.cr.fall = 0; p.solid = true; p.mesh.position.set(p.x, p.y - .5, p.z); p.mesh.rotation.set(0, 0, 0); } } }
  }
  // input → camera space (camera looks +Z: screen-right = world -X)
  let ix = inp.x + ((keys.ArrowRight || keys.KeyD) ? 1 : 0) - ((keys.ArrowLeft || keys.KeyA) ? 1 : 0);
  let iz = -inp.y + ((keys.ArrowUp || keys.KeyW) ? 1 : 0) - ((keys.ArrowDown || keys.KeyS) ? 1 : 0);
  const im = Math.hypot(ix, iz); if (im > 1) { ix /= im; iz /= im; }
  const wx = -ix, wz = iz;
  if (inp.jump) { P.buf = .2; inp.jump = false; }
  P.buf -= dt;
  if (P.dead) return;

  if (P.zip) { // ---- zipline
    const zl = P.zip; P.zipV = Math.min(17, P.zipV + 14 * dt); P.zipT += P.zipV * dt / zl.len;
    const t = Math.min(1, P.zipT); V1.lerpVectors(zl.a, zl.b, t); zl.handle.position.copy(V1);
    P.pos.set(V1.x, V1.y - 2.05, V1.z); P.vel.subVectors(zl.b, zl.a).normalize().multiplyScalar(P.zipV);
    if (P.buf > 0 || t >= 1) { P.buf = 0; P.zip = null; P.vel.y = 5; P.vel.multiplyScalar(t >= 1 ? .38 : .7); P.vel.y = 5; sfx.jump(); }
    else return;
  }
  if (P.vine) { // ---- swinging
    const v = P.vine, A = v.A;
    P.vel.y -= GRAV * dt;
    // pump along input direction
    P.vel.x += wx * 7 * dt; P.vel.z += wz * 9 * dt;
    P.pos.addScaledVector(P.vel, dt);
    const hand = V1.set(P.pos.x, P.pos.y + 1.78, P.pos.z);
    V2.subVectors(hand, A); const dist = V2.length();
    if (dist > P.ropeL) { V2.multiplyScalar(1 / dist); hand.copy(A).addScaledVector(V2, P.ropeL); P.pos.set(hand.x, hand.y - 1.78, hand.z);
      const vr = P.vel.dot(V2); if (vr > 0) P.vel.addScaledVector(V2, -vr); }
    P.vel.multiplyScalar(1 - .08 * dt);
    P.face = Math.atan2(P.vel.x, Math.max(.5, P.vel.z)) * .6;
    if (P.buf > 0) { P.buf = 0; releaseVine(); }
    return;
  }
  // ---- normal movement
  P.bounceLock = Math.max(0, (P.bounceLock || 0) - dt);
  const acc = P.ground ? 60 : P.bounceLock > 0 ? 3 : 22, max = RUN;
  const tvx = wx * max, tvz = wz * max;
  const k = Math.min(1, acc * dt / max);
  P.vel.x += (tvx - P.vel.x) * k; P.vel.z += (tvz - P.vel.z) * k;
  if (im > .1) P.face = Math.atan2(wx, wz);
  if (P.buf > 0 && (P.ground || P.coyote > 0)) { P.vel.y = JUMP; P.ground = false; P.coyote = 0; P.buf = 0; sfx.jump(); if (wz > .15 || P.vel.z > 2) jumpAssist(d); P.plat = null; }
  if (!inp.jumpHeld && !keys.Space && P.vel.y > 3 && !P.bounced && !P.assistJ) P.vel.y -= GRAV * .9 * dt; // short hop
  P.vel.y -= GRAV * dt; P.vel.y = Math.max(P.vel.y, -34);
  P.prevY = P.pos.y;
  if (P.ground && P.plat && P.plat.dx) P.pos.x += P.plat.dx;
  P.pos.addScaledVector(P.vel, dt);
  // landing
  const was = P.ground; P.ground = false;
  for (const p of W.plats) {
    if (!p.solid || Math.abs(p.z - P.pos.z) > p.d / 2 + 2) continue;
    if (!platAt(p, P.pos.x, P.pos.z, was ? .25 : .55)) continue;
    if (P.prevY >= p.y - .75 && P.pos.y <= p.y + .02 && P.vel.y <= 0) { // forgiving: edges and slightly-low landings still count
      P.pos.y = p.y; P.ground = true; P.plat = p; P.bounced = false; P.assistJ = false; P.target = null; if (!was && !platAt(p, P.pos.x, P.pos.z, 0)) { P.pos.x = clamp(P.pos.x, p.x - p.w / 2 + .2, p.x + p.w / 2 - .2); P.pos.z = clamp(P.pos.z, p.z - p.d / 2 + .2, p.z + p.d / 2 - .2); }
      if (!was && P.vel.y < -6) { sfx.land(); P.squash = .2; }
      P.vel.y = 0;
      if (p.kind === 'bounce') { P.vel.y = 17.5; P.ground = false; P.bounced = true; sfx.boing(); p.squish = .3; P.squash = .25;
        let nx = null; for (const q of W.plats) if (q !== p && q.z - q.d / 2 > p.z + p.d / 2 - .1 && (!nx || q.z < nx.z)) nx = q;
        if (nx && nx.z - p.z < 16) { const ty = nx.y + (nx.kind === 'bounce' ? 0 : 0), dh = ty - p.y, disc = 17.5 * 17.5 - 4 * 13 * dh;
          if (disc > 0) { const ft = (17.5 + Math.sqrt(disc)) / 26, tz = nx.kind === 'bounce' ? nx.z : nx.z - nx.d / 2 + 2.2;
            const a = Math.max(.65, d.assist); P.vel.z = lerp(P.vel.z, (tz - P.pos.z) / ft, a); P.vel.x = lerp(P.vel.x, (nx.x - P.pos.x) / ft, a); P.target = null; P.bounceLock = ft * .8; } } }
      if (p.cr && p.cr.t < 0) { p.cr.t = 0; sfx.crack(); }
      break;
    }
  }
  if (P.ground) P.coyote = .2; else P.coyote -= dt;
  { let lp = null; if (!P.ground && !P.vine && !P.zip) for (const p of W.plats) { if (!p.solid || p.y > P.pos.y + .05 || !platAt(p, P.pos.x, P.pos.z, .3)) continue; if (!lp || p.y > lp.y) lp = p; }
    landRing.visible = !!lp; if (lp) { landRing.position.set(P.pos.x, lp.y + .04, P.pos.z); const h = clamp((P.pos.y - lp.y) / 6, 0, 1); landRing.scale.setScalar(1.3 - h * .5); landRing.material.opacity = .7 - h * .35; } }
  if (!P.ground && was === true) P.plat = null;
  // grab vine (airborne)
  if (!P.ground) {
    const hand = V1.set(P.pos.x, P.pos.y + 1.6, P.pos.z);
    if (P.target) { const tv = P.target, ty = clamp(hand.y, tv.A.y - tv.len, tv.A.y - 2.2); V2.set(tv.A.x - hand.x, ty - hand.y, tv.A.z - hand.z); const dd = V2.length();
      if (dd < 5 && dd > .2) { P.vel.addScaledVector(V2.normalize(), 22 * d.assist * dt); } }
    for (const v of W.vines) { if (v.cool > 0) continue;
      const A = v.A, B = V2.set(A.x, A.y - v.len, A.z);
      const t = clamp((hand.y - B.y) / (A.y - B.y), 0, 1); V3.set(lerp(B.x, A.x, t), lerp(B.y, A.y, t), lerp(B.z, A.z, t));
      if (V3.distanceTo(hand) < d.grab && hand.y < A.y - 2) { grabVine(v); return; } }
    for (const zl of W.zips) { V3.copy(zl.a); if (V3.distanceTo(V1.set(P.pos.x, P.pos.y + 1.8, P.pos.z)) < d.grab + .6) { P.zip = zl; P.zipT = 0; P.zipV = Math.max(6, P.vel.length()); sfx.zip(); return; } }
  }
  if (P.pos.y < W.hazY + 1.2) fell();
}
function grabVine(v) { landRing.visible = false;
  P.vine = v; P.target = null; const hand = V1.set(P.pos.x, P.pos.y + 1.78, P.pos.z); P.ropeL = Math.max(3, hand.distanceTo(v.A));
  P.vel.z = Math.max(P.vel.z, 5.5); sfx.grab(); buzz(12);
}
function releaseVine() {
  const v = P.vine, d = D(); P.vine = null; v.cool = .6; P.ground = false; P.bounced = false;
  const i = W.vines.indexOf(v), nx = W.vines[i + 1];
  let target = null;
  if (nx && nx.z - v.z < 12) target = V2.set(nx.A.x, nx.A.y - nx.len * .62, nx.A.z);
  else { // landing platform ahead
    let best = null; for (const p of W.plats) if (p.z - p.d / 2 > v.z && (!best || p.z < best.z)) best = p;
    if (best) target = V2.set(best.x, best.y + 1.2, best.z - best.d / 2 + 2.2);
  }
  const vz0 = Math.max(P.vel.z, 0);
  P.target = (nx && nx.z - v.z < 12) ? nx : null;
  if (target && P.vel.z > -1) {
    const t = .62, hand = V1.set(P.pos.x, P.pos.y + 1.6, P.pos.z);
    const nvx = (target.x - hand.x) / t, nvz = (target.z - hand.z) / t, nvy = (target.y - hand.y + .5 * GRAV * t * t) / t;
    const a = d.assist; P.vel.x = lerp(P.vel.x, nvx, a); P.vel.z = lerp(vz0 + 2, nvz, a); P.vel.y = lerp(Math.max(P.vel.y, 5) + 3, nvy, a);
  } else { P.vel.y = Math.max(P.vel.y, 5) + 3; P.vel.z += 2; }
  sfx.whoosh();
}

/* ================= enemies, collectibles, projectiles ================= */
const stones = [];
const stoneMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(.16, 0), new THREE.MeshStandardMaterial({ color: C('#8a8070'), roughness: .9 }));
function throwStone() {
  if (P.throwCD > 0 || state !== 'play' || P.dead) return; P.throwCD = .35;
  const m = stoneMesh.clone(); handPos(V1); m.position.copy(V1); W.group.add(m);
  const dir = new THREE.Vector3(Math.sin(P.face), .12, Math.cos(P.face)).normalize();
  // aim assist toward nearest enemy in front
  let best = null, bd = 18; for (const e of W.enemies) { if (!e.alive) continue; V2.copy(e.g.position).sub(V1); const dd = V2.length(); if (dd < bd && V2.normalize().dot(dir) > .6) { bd = dd; best = V2.clone(); } }
  if (best) dir.copy(best).add(V3.set(0, .1, 0)).normalize();
  stones.push({ m, v: dir.multiplyScalar(24), life: 1.3 }); sfx.throw();
}
function updateEnemies(dt) {
  const d = D();
  for (const e of W.enemies) {
    if (!e.alive) { if (e.g.visible) { e.g.scale.multiplyScalar(1 - dt * 5); if (e.g.scale.x < .05) e.g.visible = false; } continue; }
    if (e.type === 'snake') {
      e.ph += dt * 1.8 * d.enemy; const hx = e.cx + Math.sin(e.ph * .6) * e.range, dir = Math.cos(e.ph * .6);
      e.x = hx; e.g.position.set(0, 0, 0);
      const sg = dir > 0 ? 1 : -1; e.segs.forEach((s, i) => { s.position.set(hx - sg * i * .27, e.y + .22 + (i === 0 ? .16 : 0), e.z + Math.sin(e.ph * 5 - i * .8) * .16 * Math.min(1, i)); });
      e.segs[0].rotation.y = sg > 0 ? Math.PI / 2 : -Math.PI / 2;
      const hp = e.segs[0].position; e.hit = hp;
    } else {
      e.ph += dt; const toP = V1.set(P.pos.x, P.pos.y + 1, P.pos.z);
      const home = V2.set(e.hx + Math.sin(e.ph * 1.3) * 2, e.hy + Math.sin(e.ph * 2.1) * .6, e.hz + Math.cos(e.ph) * 1.5);
      if (!e.p) e.p = home.clone();
      const chase = toP.distanceTo(e.p) < 11 && state === 'play';
      const tgt = chase ? toP : home; e.p.lerp(tgt, Math.min(1, dt * (chase ? 1.1 * d.enemy : 1.5)));
      e.g.position.copy(e.p); e.g.lookAt(toP.x, e.p.y, toP.z); e.wings.forEach((w, i) => w.rotation.x = Math.sin(W.t * 50 + i) * .8); e.hit = e.p;
    }
    // collisions with player
    const hp = e.hit, dx = hp.x - P.pos.x, dz = hp.z - P.pos.z, dy = hp.y - (P.pos.y + .8);
    if (dx * dx + dz * dz < .9 && Math.abs(dy) < 1.1 && !P.dead) {
      if (P.vel.y < -2 && P.pos.y > hp.y - .2) { killEnemy(e); P.vel.y = 11; P.ground = false; sfx.stomp(); }
      else hurt(V1.set(-dx * 2, 5, -dz * 2 - 1.2));
    }
  }
  for (let i = stones.length - 1; i >= 0; i--) {
    const s = stones[i]; s.v.y -= 9 * dt; s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += dt * 10; s.life -= dt; let hit = false;
    for (const e of W.enemies) if (e.alive && e.hit && s.m.position.distanceTo(e.hit) < .8) { e.hp--; hit = true; burst(e.hit.x, e.hit.y, e.hit.z, '#ffffff', 8, 3); if (e.hp <= 0) killEnemy(e); else sfx.hit(); break; }
    if (hit || s.life <= 0) { W.group.remove(s.m); stones.splice(i, 1); }
  }
}
function killEnemy(e) { e.alive = false; burst(e.hit.x, e.hit.y, e.hit.z, e.type === 'snake' ? '#7fe05a' : '#ffd21f', 18, 5); sfx.pop(); P.fruit += 2; toast('+2 🥭', 700); updateHud(); }

function updateCollect(dt, t) {
  const fm = W.fruitMesh, fl = W.fruitLeaf, hx = P.pos.x, hy = P.pos.y + 1, hz = P.pos.z;
  for (let i = 0; i < W.fruits.length; i++) {
    const f = W.fruits[i];
    if (!f.got) { const dx = f.x - hx, dy = f.y - hy, dz = f.z - hz; if (dx * dx + dy * dy + dz * dz < 1.6 && !P.dead) { f.got = true; P.fruit++; sfx.fruit(); burst(f.x, f.y, f.z, '#ffb040', 6, 2.5); updateHud(); } }
    if (f.got) { tmpO.scale.setScalar(0); } else { tmpO.scale.setScalar(1); }
    tmpO.position.set(f.x, f.y + Math.sin(t * 2.4 + f.ph) * .12, f.z); tmpO.rotation.set(0, t * 2 + f.ph, 0); tmpO.updateMatrix(); fm.setMatrixAt(i, tmpO.matrix); fl.setMatrixAt(i, tmpO.matrix);
  }
  fm.instanceMatrix.needsUpdate = fl.instanceMatrix.needsUpdate = true;
  for (const l of W.letters) {
    if (l.got) continue; l.spr.position.y = l.y + Math.sin(t * 2 + l.x) * .2;
    if (Math.hypot(l.x - hx, l.spr.position.y - hy, l.z - hz) < 1.5 && !P.dead) { l.got = true; P.letters++; W.group.remove(l.spr); sfx.letter(); burst(l.x, l.y, l.z, '#ffd25e', 26, 4); toast('Litera ' + l.ch + '!', 900); updateHud(); }
  }
  for (const c of W.checks) {
    if (!c.on && Math.abs(P.pos.z - c.z) < 3 && Math.abs(P.pos.x - c.x) < 5 && P.ground) { c.on = true; P.cp = new THREE.Vector3(c.x - 2.4, c.y, c.z); c.gem.material.color.set('#7fffd0'); c.gem.material.emissive.set('#20ffa0'); c.gem.material.emissiveIntensity = 2.5; sfx.check(); toast('✔ Punkt kontrolny', 1200); }
    c.gem.rotation.y += dt * 2;
  }
  if (W.portal) { W.portal.ring.rotation.z += dt * .4; W.portal.core.material.opacity = .45 + Math.sin(t * 3) * .12;
    if (P.pos.distanceTo(W.end) < 3.2 && state === 'play') levelDone(); }
  for (const tip of W.tips) if (!tip.shown && P.pos.z > tip.z) { tip.shown = true; toast(tip.txt, 3200); }
}

/* bursts */
const bursts = [];
function burst(x, y, z, col, n, sp) {
  const pos = new Float32Array(n * 3), vel = []; for (let i = 0; i < n; i++) { pos.set([x, y, z], i * 3); vel.push(new THREE.Vector3((Math.random() - .5) * sp, Math.random() * sp, (Math.random() - .5) * sp)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.Points(g, new THREE.PointsMaterial({ color: HDR(col, 2.2), size: .28, map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.frustumCulled = false; W.group.add(m); bursts.push({ m, vel, life: .8 });
}
function updateBursts(dt) {
  for (let i = bursts.length - 1; i >= 0; i--) { const b = bursts[i]; b.life -= dt; const pa = b.m.geometry.attributes.position;
    for (let k = 0; k < b.vel.length; k++) { b.vel[k].y -= 6 * dt; pa.setXYZ(k, pa.getX(k) + b.vel[k].x * dt, pa.getY(k) + b.vel[k].y * dt, pa.getZ(k) + b.vel[k].z * dt); }
    pa.needsUpdate = true; b.m.material.opacity = Math.max(0, b.life / .8);
    if (b.life <= 0) { W.group.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose(); bursts.splice(i, 1); } }
}

/* ================= hero animation ================= */
function animateHero(dt, t) {
  const h = HERO; let T;
  const sp = Math.hypot(P.vel.x, P.vel.z);
  if (P.vine) { const sw = clamp(P.vel.z * .06, -.6, .6);
    T = { al: -2.85, ar: -2.85, alz: .05, arz: .05, el: -.1, er: -.1, ll: -.5 + sw, lr: -.2 + sw, sl: .6, sr: .3, lean: -sw * .6 }; }
  else if (P.zip) T = { al: -2.9, ar: -2.6, alz: .1, arz: .2, el: -.1, er: -.2, ll: -1, lr: -.9, sl: .9, sr: .8, lean: .1 };
  else if (!P.ground) { const up = P.vel.y > 0; T = { al: up ? -2.2 : -1.2, ar: up ? -1.6 : -1.0, alz: .6, arz: .6, el: -.6, er: -.6, ll: up ? -1.1 : -.4, lr: up ? .2 : -.2, sl: up ? 1.5 : .6, sr: up ? .5 : .5, lean: .15 }; }
  else if (sp > .5) { P.phase += dt * sp * 1.55; const s = Math.sin(P.phase), am = clamp(sp / RUN, 0, 1);
    T = { al: -s * 1.1 * am, ar: s * 1.1 * am, alz: .15, arz: .15, el: -.4 - .8 * am, er: -.4 - .8 * am, ll: s * 1.0 * am, lr: -s * 1.0 * am, sl: (.2 + Math.max(0, Math.sin(P.phase + 1.6)) * 1.3) * am, sr: (.2 + Math.max(0, -Math.sin(P.phase + 1.6)) * 1.3) * am, lean: .25 * am }; }
  else { const b = Math.sin(t * 2) * .04; T = { al: b, ar: -b, alz: .15, arz: .15, el: -.25, er: -.25, ll: 0, lr: 0, sl: 0, sr: 0, lean: 0 }; }
  const k = Math.min(1, dt * 14); for (const key in T) pose[key] += (T[key] - pose[key]) * k;
  h.armL.rotation.set(pose.al, 0, pose.alz); h.armR.rotation.set(pose.ar, 0, -pose.arz); h.foreL.rotation.x = pose.el; h.foreR.rotation.x = pose.er;
  h.legL.rotation.x = pose.ll; h.legR.rotation.x = pose.lr; h.shinL.rotation.x = pose.sl; h.shinR.rotation.x = pose.sr;
  h.body.rotation.x = pose.lean; h.tail.rotation.x = .5 + Math.min(1, sp / 6) * .6 + Math.sin(t * 9) * .08 * Math.min(1, sp / 4);
  P.squash = Math.max(0, P.squash - dt); const sq = 1 - P.squash * .6; h.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  h.root.position.copy(P.pos); let fy = P.face; if (P.vine || P.zip) fy = 0;
  const df = Math.atan2(Math.sin(fy - h.root.rotation.y), Math.cos(fy - h.root.rotation.y)); h.root.rotation.y += df * Math.min(1, dt * 12);
  h.root.visible = !(P.inv > 0 && Math.floor(t * 16) % 2 === 0);
}

/* ================= camera ================= */
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function updateCamera(dt) {
  const back = P.vine || P.zip ? 9.6 : 7.3, up = P.vine ? 4.2 : 3.6;
  const tx = lerp(P.pos.x, W.xAt(P.pos.z + 4), .3);
  V1.set(tx, Math.max(P.pos.y, (P.cp ? P.cp.y : 0) - 2) + up, P.pos.z - back);
  camPos.lerp(V1, Math.min(1, dt * 4.5));
  V2.set(P.pos.x * .7 + W.xAt(P.pos.z + 10) * .3, P.pos.y + 1.4, P.pos.z + 6); camLook.lerp(V2, Math.min(1, dt * 6));
  camera.position.copy(camPos); camera.lookAt(camLook);
  const fov = 60 + clamp(P.vel.length() - 8, 0, 12) * .5; if (Math.abs(camera.fov - fov) > .1) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
  sun.position.set(P.pos.x + W.T.sunDir[0] * 60, P.pos.y + W.T.sunDir[1] * 60, P.pos.z + W.T.sunDir[2] * 60 - 20); sun.target.position.set(P.pos.x, P.pos.y, P.pos.z + 6);
  sky.position.copy(camera.position); heroLight.position.set(P.pos.x, P.pos.y + 2.5, P.pos.z - 1.5);
}

/* ================= audio ================= */
let AC = null, master = null;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = SAVE.snd ? .8 : 0; master.connect(AC.destination); } catch (e) { } } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
function tone(f, d, type = 'sine', v = .15, t0 = 0, f2 = 0) { const a = ac(); if (!a) return; const t = a.currentTime + t0, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(master); o.start(t); o.stop(t + d + .05); }
let nb = null; function noise(d, v, f, q, type = 'bandpass', t0 = 0, f2 = 0) { const a = ac(); if (!a) return; if (!nb) { nb = a.createBuffer(1, a.sampleRate * 2, a.sampleRate); const ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
  const t = a.currentTime + t0, s = a.createBufferSource(); s.buffer = nb; const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d); fl.Q.value = q; const g = a.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + d + .05); }
const sfx = {
  jump() { tone(420, .16, 'triangle', .12, 0, 760); }, land() { noise(.12, .2, 300, 1); }, grab() { noise(.1, .25, 2200, 2); tone(520, .08, 'square', .05); },
  whoosh() { noise(.35, .28, 500, 1, 'bandpass', 0, 2600); tone(300, .25, 'sine', .06, 0, 700); }, boing() { tone(180, .4, 'sine', .25, 0, 640); tone(360, .3, 'triangle', .08, .02, 900); },
  fruit() { tone(880 + Math.random() * 80, .1, 'triangle', .1); tone(1320, .12, 'sine', .07, .05); }, letter() { [660, 880, 1100, 1320].forEach((f, i) => tone(f, .25, 'triangle', .12, i * .07)); },
  hurt() { tone(220, .3, 'sawtooth', .1, 0, 90); }, splash() { noise(.6, .35, 900, .6, 'lowpass', 0, 200); }, check() { [523, 659, 784].forEach((f, i) => tone(f, .3, 'sine', .12, i * .1)); },
  zip() { noise(1.2, .1, 3000, 4); tone(600, .2, 'square', .04, 0, 300); }, crack() { noise(.25, .3, 700, 1.5); }, throw() { noise(.12, .2, 1600, 1, 'bandpass', 0, 600); },
  hit() { tone(700, .08, 'square', .08, 0, 300); }, pop() { tone(300, .2, 'triangle', .15, 0, 900); noise(.15, .2, 2000, 1); }, stomp() { tone(160, .2, 'sine', .25, 0, 60); noise(.1, .2, 500, 1); },
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, .4, 'triangle', .13, i * .12)); tone(1568, .8, 'sine', .08, .6); }, lose() { [392, 330, 262].forEach((f, i) => tone(f, .4, 'triangle', .12, i * .2)); },
  thunder() { noise(2.2, .5, 400, .5, 'lowpass', 0, 60); }
};
const music = (() => {
  const SC = { sunrise: [0, 2, 4, 7, 9], river: [0, 2, 4, 7, 9], falls: [0, 2, 3, 7, 9], bamboo: [0, 3, 5, 7, 10], night: [0, 3, 5, 7, 10], temple: [0, 1, 4, 5, 7], volcano: [0, 1, 3, 6, 7], storm: [0, 2, 3, 7, 8] };
  const ROOT = { sunrise: 60, river: 62, falls: 57, bamboo: 59, night: 57, temple: 55, volcano: 52, storm: 54 }, BPM = { sunrise: 104, river: 112, falls: 96, bamboo: 100, night: 84, temple: 92, volcano: 118, storm: 124 };
  let th = 'sunrise', timer = 0, next = 0, step = 0, on = false;
  const mt = m => 440 * Math.pow(2, (m - 69) / 12);
  function tick() { const a = AC; if (!a || !on) return; const spb = 60 / BPM[th] / 2;
    while (next < a.currentTime + .2) { const t0 = next - a.currentTime, sc = SC[th], r = ROOT[th], s = step % 16;
      if (state === 'play' && SAVE.snd) {
        if (s % 2 === 0 || Math.random() < .3) { const n = sc[(step * 3 + (step >> 3)) % sc.length] + (Math.random() < .3 ? 12 : 0); tone(mt(r + n), .28, 'triangle', .045, Math.max(0, t0)); tone(mt(r + n + 12), .12, 'sine', .02, Math.max(0, t0)); }
        if (s === 0 || s === 8) tone(mt(r - 24 + sc[(step >> 4) % 3]), .5, 'sine', .09, Math.max(0, t0));
        if (s % 4 === 2) noise(.05, .05, 6000, 1, 'highpass', Math.max(0, t0));
        if (s === 4 || s === 12) noise(.1, .08, 1200, 2, 'bandpass', Math.max(0, t0));
        if (Math.random() < .04) { const f = 1800 + Math.random() * 1800; tone(f, .12, 'sine', .025, Math.max(0, t0) + .05, f * 1.4); tone(f * 1.2, .1, 'sine', .02, Math.max(0, t0) + .2, f); } // bird
      }
      next += spb; step++; } }
  return { setTheme(t) { th = t; ac(); if (!on && AC) { on = true; next = AC.currentTime + .1; timer = setInterval(tick, 60); } } };
})();
function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } }

/* ================= UI ================= */
function showScreens() {
  $('title').hidden = state !== 'title'; $('map').hidden = state !== 'map';
  $('hud').hidden = !(state === 'play' || state === 'pause'); $('touch').hidden = !(state === 'play' && isTouch);
  $('pause').hidden = state !== 'pause'; $('done').hidden = state !== 'done'; $('over').hidden = state !== 'over';
}
function updateHud() {
  if (!W) return; const d = D(); $('hHearts').textContent = '❤️'.repeat(Math.max(0, P.hearts)) + '🤍'.repeat(Math.max(0, d.hearts - P.hearts));
  $('hLives').textContent = '×' + P.lives; $('hFruit').textContent = P.fruit + '/' + W.fruitTotal;
  [...$('hLet').children].forEach((el, i) => el.classList.toggle('on', !!(W.letters[i] && W.letters[i].got)));
}
let toastT = 0; function toast(m, ms) { const el = $('toast'); el.textContent = m; el.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => el.style.opacity = 0, ms || 1400); }
function flashBanner() { const b = $('banner'); b.style.opacity = 1; setTimeout(() => b.style.opacity = 0, 2400); }
function flashHurt() { const h = $('hurt'); h.style.transition = 'none'; h.style.opacity = .9; requestAnimationFrame(() => { h.style.transition = 'opacity .5s'; h.style.opacity = 0; }); }
function levelDone() {
  state = 'done'; sfx.win(); buzz([30, 40, 30, 40, 60]);
  const fr = P.fruit / Math.max(1, W.fruitTotal), stars = 1 + (P.letters >= 4 ? 1 : 0) + (fr >= .7 ? 1 : 0);
  const k = curLevel + 1, prev = SAVE.stars[k] || 0; SAVE.stars[k] = Math.max(prev, stars); SAVE.unlocked = Math.max(SAVE.unlocked, Math.min(LEVELS.length, k + 1)); save();
  $('doneT').textContent = curLevel === LEVELS.length - 1 ? '🏆 Ukończyłeś wyprawę!' : 'Poziom ' + k + ' ukończony!';
  $('dF').textContent = P.fruit + '/' + W.fruitTotal; $('dL').textContent = P.letters + '/4'; $('dT').textContent = Math.floor(P.time / 60) + ':' + String(Math.floor(P.time % 60)).padStart(2, '0');
  $('dHint').textContent = stars < 3 ? (P.letters < 4 ? '⭐ Zbierz wszystkie 4 litery, by zdobyć dodatkową gwiazdkę' : '') + (fr < .7 ? (P.letters < 4 ? ' · ' : '') + '⭐ Zbierz 70% owoców, by zdobyć dodatkową gwiazdkę' : '') : 'Idealnie! 3 gwiazdki';
  $('nextBtn').hidden = curLevel >= LEVELS.length - 1;
  const st = [...$('doneS').children]; st.forEach(s => s.classList.remove('on')); st.forEach((s, i) => { if (i < stars) setTimeout(() => { s.classList.add('on'); tone(700 + i * 200, .2, 'triangle', .12); }, 400 + i * 350); });
  showScreens();
}
function renderMap() {
  $('lvGrid').innerHTML = LEVELS.map((L, i) => { const T = THEMES[L.th], st = SAVE.stars[i + 1] || 0, lock = i + 1 > SAVE.unlocked;
    return `<button class="lv${lock ? ' lock' : ''}" data-i="${i}" style="background:${T.grad}"><span class="n">${i + 1}</span><span class="ic">${T.ic}</span><b>${L.nm || T.name}</b><span class="st">${'⭐'.repeat(st)}${'☆'.repeat(3 - st)}</span></button>`; }).join('');
}
$('lvGrid').onclick = e => { const b = e.target.closest('.lv'); if (!b || b.classList.contains('lock')) { if (b) toast('🔒 Najpierw ukończ poprzedni poziom', 1200); return; } ac(); sfx.jump(); startLevel(+b.dataset.i); };
$('playBtn').onclick = () => { ac(); sfx.jump(); renderMap(); state = 'map'; showScreens(); };
$('mapBack').onclick = () => { state = 'title'; showScreens(); };
function syncDiff() { [...$('diffSeg').children].forEach(b => b.setAttribute('aria-pressed', b.dataset.d === SAVE.diff)); }
$('diffSeg').onclick = e => { const b = e.target.closest('[data-d]'); if (!b) return; SAVE.diff = b.dataset.d; save(); syncDiff(); sfx.fruit(); };
syncDiff();
const QL = { ultra: 'Ultra', high: 'Wysoka', low: 'Oszczędna' };
function syncBtns() { const s = SAVE.snd ? '🔊 Dźwięk' : '🔇 Wyciszone', q = '✨ ' + QL[Q]; $('sndBtn').textContent = s; $('sndBtn2').textContent = s; $('qBtn').textContent = q; $('qBtn2').textContent = q; if (master) master.gain.value = SAVE.snd ? .8 : 0; }
const toggleSnd = () => { SAVE.snd = !SAVE.snd; save(); ac(); syncBtns(); };
const toggleQ = () => { Q = { ultra: 'high', high: 'low', low: 'ultra' }[Q]; SAVE.q = Q; save(); applyQuality(); syncBtns(); };
$('sndBtn').onclick = toggleSnd; $('sndBtn2').onclick = toggleSnd; $('qBtn').onclick = toggleQ; $('qBtn2').onclick = toggleQ;
$('pBtn').onclick = () => { if (state === 'play') { state = 'pause'; showScreens(); } };
$('resBtn').onclick = () => { state = 'play'; showScreens(); last = performance.now(); };
$('rstBtn').onclick = () => startLevel(curLevel);
$('toMap').onclick = () => { renderMap(); state = 'map'; showScreens(); };
$('nextBtn').onclick = () => startLevel(Math.min(LEVELS.length - 1, curLevel + 1));
$('againBtn').onclick = () => startLevel(curLevel);
$('mapBtn2').onclick = () => { renderMap(); state = 'map'; showScreens(); };
$('retryBtn').onclick = () => startLevel(curLevel);
$('mapBtn3').onclick = () => { renderMap(); state = 'map'; showScreens(); };
$('keysTxt').textContent = isTouch ? '' : 'Klawisze: Strzałki / WASD · Spacja – skok · F – rzut · P – pauza';
if (window.parent !== window) { ['homeT', 'homeP'].forEach(id => { $(id).hidden = false; $(id).onclick = () => { try { if (AC) AC.suspend(); } catch (e) { } window.parent.postMessage('skyplay-home', '*'); }; }); }
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') { state = 'pause'; showScreens(); } });

/* input */
addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'Space') { if (!e.repeat) inp.jump = true; e.preventDefault(); } if (e.code === 'KeyF' || e.code === 'KeyJ') throwStone(); if (e.code === 'KeyP' || e.code === 'Escape') { if (state === 'play') { state = 'pause'; showScreens(); } else if (state === 'pause') { state = 'play'; showScreens(); } } if (e.code.startsWith('Arrow')) e.preventDefault(); });
addEventListener('keyup', e => { keys[e.code] = false; });
(() => { const joy = $('joy'), th = $('thumb'); let id = null, cx = 0, cy = 0;
  const mv = e => { let dx = e.clientX - cx, dy = e.clientY - cy; const m = Math.hypot(dx, dy), mx = 50; if (m > mx) { dx *= mx / m; dy *= mx / m; } th.style.transform = `translate(${dx}px,${dy}px)`; inp.x = dx / mx; inp.y = dy / mx; };
  joy.addEventListener('pointerdown', e => { id = e.pointerId; joy.setPointerCapture(id); const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; mv(e); ac(); });
  joy.addEventListener('pointermove', e => { if (e.pointerId === id) mv(e); });
  const end = e => { if (e.pointerId === id) { id = null; inp.x = inp.y = 0; th.style.transform = ''; } }; joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
  const bj = $('bJump'); bj.addEventListener('pointerdown', e => { e.preventDefault(); inp.jump = true; inp.jumpHeld = true; bj.classList.add('on'); ac(); });
  const ju = () => { inp.jumpHeld = false; bj.classList.remove('on'); }; bj.addEventListener('pointerup', ju); bj.addEventListener('pointercancel', ju);
  const bt = $('bThrow'); bt.addEventListener('pointerdown', e => { e.preventDefault(); throwStone(); bt.classList.add('on'); }); bt.addEventListener('pointerup', () => bt.classList.remove('on'));
})();

/* ================= loop ================= */
let last = performance.now(), flashK = 0, nextBolt = 6;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (W) {
    W.t = (W.t || 0) + dt;
    skyMat.uniforms.time.value = W.t;
    if (state === 'play') { const sub = 3; for (let i = 0; i < sub; i++) step(dt / sub); updateEnemies(dt); updateCollect(dt, W.t); }
    for (const v of W.vines) { v.cool = Math.max(0, v.cool - dt); updateVineShape(v, W.t); }
    for (const p of W.plats) if (p.cap && p.squish > 0) { p.squish -= dt; p.cap.scale.y = .55 * (1 - Math.sin(p.squish / .3 * Math.PI) * .35); }
    if (W.waterU) W.waterU.value = W.t; if (W.lavaTex) W.lavaTex.offset.y -= dt * .02; if (W.fallTex) W.fallTex.offset.y += dt * 1.4;
    updateParticles(dt, W.t); updateBursts(dt); animateHero(dt, W.t); updateCamera(dt);
    if (W.T.extra === 'storm') { nextBolt -= dt; if (nextBolt <= 0) { nextBolt = 5 + Math.random() * 7; flashK = 1; setTimeout(() => sfx.thunder(), 300 + Math.random() * 900); } }
    flashK = Math.max(0, flashK - dt * 3); grade.uniforms.uFlash.value = flashK * .35;
  }
  composer.render();
}

/* ================= resize / quality ================= */
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h); const pr = renderer.getPixelRatio(); fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr)); camera.aspect = w / h; camera.updateProjectionMatrix(); }
function applyQuality() {
  const dpr = devicePixelRatio || 1, pr = Q === 'ultra' ? Math.min(dpr, 2) : Q === 'high' ? Math.min(dpr, 1.5) : Math.min(dpr, 1);
  renderer.setPixelRatio(pr); composer.setPixelRatio(pr);
  const sh = Q !== 'low'; if (renderer.shadowMap.enabled !== sh) { renderer.shadowMap.enabled = sh; scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); }); }
  const ms = Q === 'ultra' ? 2048 : 1024; if (sun.shadow.mapSize.x !== ms) { sun.shadow.mapSize.set(ms, ms); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  bloom.enabled = Q !== 'low'; resize();
}
addEventListener('resize', resize);
applyQuality(); syncBtns();
// backdrop for the title screen: level 1 scenery
buildLevel(0); P.cp = W.spawn.clone(); respawn(true);
camPos.set(P.pos.x, 4, P.pos.z - 9);
state = 'title'; showScreens();
requestAnimationFrame(frame);
setTimeout(() => { $('loading').hidden = true; }, 300);
window.__zoriOK = true;
window.__z = { startLevel, respawn, P, get W() { return W; }, get state() { return state; }, keys, inp, releaseVine };
