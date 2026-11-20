import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass, FXAAShader } from '../lib/postfx.js';

/* ================= basics ================= */
const $ = id => document.getElementById(id);
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = h => new THREE.Color(h);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const isTouch = matchMedia('(pointer:coarse)').matches;
let LANG = null; try { LANG = localStorage.getItem('oa-lang'); } catch (e) { }
if (LANG !== 'he' && LANG !== 'en') LANG = /^he|^iw/i.test(navigator.language || '') ? 'he' : 'en';
const EN = LANG === 'en'; document.documentElement.lang = LANG; document.documentElement.dir = EN ? 'ltr' : 'rtl';
const T = (he, en) => EN ? en : he;
let SAVE = { q: isTouch ? 'high' : 'ultra', mute: false, stars: {}, tier: 0 };
try { Object.assign(SAVE, JSON.parse(localStorage.getItem('ron-save') || '{}')); } catch (e) { }
const store = () => { try { localStorage.setItem('ron-save', JSON.stringify(SAVE)); } catch (e) { } };
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ================= renderer ================= */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = SAVE.q !== 'low'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, .1, 80);
const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: SAVE.q === 'ultra' ? 4 : 0 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .28, .45, 1.6); bloom.enabled = SAVE.q !== 'low'; composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null } }, fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec3 c=texture2D(tDiffuse,vUv).rgb; float r=length(vUv-.5); float l=dot(c,vec3(.299,.587,.114)); c=mix(vec3(l),c,1.1); c*=1.0-smoothstep(.5,1.0,r)*.25; gl_FragColor=vec4(c,1.0);} ` });
composer.addPass(grade); const fxaa = new ShaderPass(FXAAShader); composer.addPass(fxaa);
{ const dpr = devicePixelRatio || 1, pr = SAVE.q === 'ultra' ? Math.min(dpr, 2) : SAVE.q === 'high' ? Math.min(dpr, 1.5) : 1; renderer.setPixelRatio(pr); composer.setPixelRatio(pr); }
{ const es = new THREE.Scene(); const bx = new THREE.BoxGeometry(30, 14, 30); const cols = []; const p = bx.attributes.position;
  for (let i = 0; i < p.count; i++) { const c = (p.getY(i) > 0 ? C('#f4fbff') : C('#a9c2d6')).multiplyScalar(.35); cols.push(c.r, c.g, c.b); }
  bx.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); es.add(new THREE.Mesh(bx, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const pn = (x, y, z, w, h, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: C('#ffffff').multiplyScalar(i), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
  pn(-6, 6, 5, 6, 4, 2.4); pn(7, 5, -3, 5, 5, 1.2); pn(0, 6.9, 0, 10, 10, .8);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, .03).texture; pm.dispose(); }
const hemi = new THREE.HemisphereLight(C('#f4fbff'), C('#9a8a7a'), .5); scene.add(hemi);
const key = new THREE.DirectionalLight(C('#fff3e2'), 2.3); key.castShadow = true; key.shadow.mapSize.set(SAVE.q === 'ultra' ? 2048 : 1024, SAVE.q === 'ultra' ? 2048 : 1024); key.shadow.bias = -.0005; key.shadow.normalBias = .03; key.shadow.radius = 3;
scene.add(key, key.target);
const fillL = new THREE.DirectionalLight(C('#dbe9ff'), .55); scene.add(fillL);

/* ================= textures ================= */
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const ctex = (c, rx = 1, ry = 1) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
function seededNoise(g, w, h, n, col, a, r) { const R = rng(n); for (let i = 0; i < n; i++) { g.fillStyle = col; g.globalAlpha = a * R(); g.beginPath(); g.arc(R() * w, R() * h, R() * r, 0, 7); g.fill(); } g.globalAlpha = 1; }
const TEX = {
  planks() { const c = cnv(512, 512), g = c.getContext('2d'); const cols = ['#e3bf92', '#d9b384', '#e8c79c', '#d4ab7a']; for (let i = 0; i < 8; i++) { g.fillStyle = cols[i % 4]; g.fillRect(0, i * 64, 512, 64); const off = (i * 197) % 512; g.fillStyle = 'rgba(90,50,20,.25)'; g.fillRect(off, i * 64, 3, 64); g.fillRect(0, i * 64, 512, 2); }
    g.strokeStyle = 'rgba(120,70,30,.12)'; for (let i = 0; i < 90; i++) { const y = Math.random() * 512; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + 4, 340, y - 4, 512, y + 2); g.stroke(); } return ctex(c, 3, 3); },
  subway(base, line) { const c = cnv(256, 256), g = c.getContext('2d'); g.fillStyle = line; g.fillRect(0, 0, 256, 256); g.fillStyle = base; for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) { const ox = (y % 2) * 32; g.fillRect(x * 64 + ox + 2, y * 32 + 2, 60, 28); } g.fillStyle = 'rgba(255,255,255,.35)'; for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) { const ox = (y % 2) * 32; g.fillRect(x * 64 + ox + 4, y * 32 + 4, 56, 5); } return ctex(c, 6, 3); },
  checker(a, b) { const c = cnv(256, 256), g = c.getContext('2d'); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * 64, y * 64, 64, 64); } return ctex(c, 6, 6); },
  concrete() { const c = cnv(512, 512), g = c.getContext('2d'); g.fillStyle = '#a7a39b'; g.fillRect(0, 0, 512, 512); seededNoise(g, 512, 512, 900, '#6f6b64', .25, 8); seededNoise(g, 512, 512, 600, '#d4d0c8', .2, 6); g.strokeStyle = 'rgba(60,55,50,.35)'; g.lineWidth = 3; g.strokeRect(0, 0, 512, 512); return ctex(c, 4, 4); },
  brick() { const c = cnv(256, 256), g = c.getContext('2d'); g.fillStyle = '#d8cbbb'; g.fillRect(0, 0, 256, 256); const R = rng(5); for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) { const ox = (y % 2) * 32; const h = 10 + R() * 14; g.fillStyle = `hsl(${h},${45 + R() * 15}%,${36 + R() * 10}%)`; g.fillRect(x * 64 + ox + 3, y * 32 + 3, 58, 26); } return ctex(c, 6, 3); },
  marble() { const c = cnv(512, 512), g = c.getContext('2d'); g.fillStyle = '#d8d2c8'; g.fillRect(0, 0, 512, 512); const R = rng(9); g.lineCap = 'round';
    for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(${120 + R() * 40},${120 + R() * 40},${130 + R() * 40},${.15 + R() * .3})`; g.lineWidth = .6 + R() * 2.4; let x = R() * 512, y = R() * 512; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (R() - .3) * 90; y += (R() - .5) * 90; g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = 'rgba(200,170,90,.6)'; g.lineWidth = 3; g.strokeRect(0, 0, 512, 512); return ctex(c, 3, 3); },
  teal() { const c = cnv(256, 256), g = c.getContext('2d'); g.fillStyle = '#1f5a5c'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(230,190,100,.55)'; g.lineWidth = 2; for (let x = 0; x <= 256; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); } seededNoise(g, 256, 256, 200, '#2c7477', .4, 10); return ctex(c, 5, 2); },
  butter() { const c = cnv(256, 256), g = c.getContext('2d'); g.fillStyle = '#ffe6a6'; g.fillRect(0, 0, 256, 256); g.fillStyle = 'rgba(255,255,255,.55)'; for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) { g.beginPath(); g.arc(x + 16, y + 16, 4, 0, 7); g.fill(); } return ctex(c, 6, 3); },
  hazard() { const c = cnv(128, 128), g = c.getContext('2d'); g.fillStyle = '#ffcc2e'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#2a2a2a'; for (let i = -128; i < 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 16 - 128, 128); g.lineTo(i - 128, 128); g.fill(); } const t = ctex(c, 1, 1); return t; },
  swirl() { const c = cnv(256, 256), g = c.getContext('2d'); const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, '#0c5fb8'); gr.addColorStop(1, '#5cc2ff'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 6;
    for (let k = 0; k < 4; k++) { g.beginPath(); for (let a = 0; a < 6; a += .05) { const r = 10 + a * 19; g.lineTo(128 + Math.cos(a + k * 1.57) * r, 128 + Math.sin(a + k * 1.57) * r); } g.stroke(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; },
};
const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: C(c), roughness: .55 }, o));
const chrome = std('#eef2f6', { metalness: 1, roughness: .12 });
const copper = std('#d98a52', { metalness: .9, roughness: .28 });
const whiteGloss = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .12, clearcoat: 1, clearcoatRoughness: .08 });
function shadowAll(o, cast = true, recv = true) { o.traverse(m => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = recv; } }); return o; }

/* ================= pipe geometry ================= */
const DX = [0, 1, 0, -1], DZ = [-1, 0, 1, 0];
const rotMask = (m, r) => { let o = 0; for (let d = 0; d < 4; d++) if (m & (1 << d)) o |= 1 << ((d + r) % 4); return o; };
const BASE = { s: 5, e: 3, t: 7, x: 15 };
const typeOf = m => { const b = [0, 1, 2, 3].filter(d => m & (1 << d)); if (b.length === 4) return 'x'; if (b.length === 3) return 't'; if (b.length === 2) return (b[1] - b[0]) === 2 ? 's' : 'e'; return null; };
const rotFor = (type, m) => { for (let r = 0; r < 4; r++) if (rotMask(BASE[type], r) === m) return r; return 0; };
const PR = .165, WR = .118, SEG = 22;
function tagGeo(g, arm, tFn) { const p = g.attributes.position, n = p.count; const a = new Float32Array(n), t = new Float32Array(n); for (let i = 0; i < n; i++) { a[i] = arm; t[i] = tFn(i, p); } g.setAttribute('aArm', new THREE.BufferAttribute(a, 1)); g.setAttribute('aT', new THREE.BufferAttribute(t, 1)); return g; }
function straightArm(d, r) { const g = new THREE.CylinderGeometry(r, r, .5, SEG, 1, true); if (d % 2 === 0) g.rotateX(Math.PI / 2); else g.rotateZ(Math.PI / 2); g.translate(DX[d] * .25, 0, DZ[d] * .25); return tagGeo(g, d, (i, p) => clamp((p.getX(i) * DX[d] + p.getZ(i) * DZ[d]) / .5, 0, 1)); }
class Arc extends THREE.Curve { constructor(a0, a1) { super(); this.a0 = a0; this.a1 = a1; } getPoint(t, o = new THREE.Vector3()) { const a = lerp(this.a0, this.a1, t); return o.set(.5 + Math.cos(a) * .5, 0, -.5 + Math.sin(a) * .5); } }
function elbowArm(d, r) { const g = new THREE.TubeGeometry(new Arc(Math.PI * .75, d === 0 ? Math.PI : Math.PI / 2), 10, r, SEG, false); const uv = g.attributes.uv; return tagGeo(g, d, i => uv.getX(i)); }
const ARMS = { s: [0, 2], e: [0, 1], t: [0, 1, 2], x: [0, 1, 2, 3] };
function pieceGeo(type, r) { const parts = ARMS[type].map(d => type === 'e' ? elbowArm(d, r) : straightArm(d, r)); return mergeGeometries(parts); }
function fittingGeo(type) { const parts = [];
  for (const d of ARMS[type]) { const f = new THREE.CylinderGeometry(.215, .215, .08, 24); if (d % 2 === 0) f.rotateX(Math.PI / 2); else f.rotateZ(Math.PI / 2); f.translate(DX[d] * .45, 0, DZ[d] * .45); parts.push(f);
    const b = new THREE.CylinderGeometry(.19, .19, .05, 24); if (d % 2 === 0) b.rotateX(Math.PI / 2); else b.rotateZ(Math.PI / 2); b.translate(DX[d] * .37, 0, DZ[d] * .37); parts.push(b); }
  if (type === 't' || type === 'x') parts.push(new THREE.SphereGeometry(.245, 24, 16));
  if (type === 'e') { const k = new THREE.SphereGeometry(.2, 20, 14); const p = new Arc(0, 0); k.translate(.5 + Math.cos(Math.PI * .75) * .5, 0, -.5 + Math.sin(Math.PI * .75) * .5); parts.push(k); }
  if (type === 's') { const k = new THREE.CylinderGeometry(.2, .2, .14, 24); k.rotateX(Math.PI / 2); parts.push(k); }
  return mergeGeometries(parts.map(g => { g.deleteAttribute('uv'); return g; }));
}
const GEO = {}; for (const t of ['s', 'e', 't', 'x']) GEO[t] = { glass: pieceGeo(t, PR), water: pieceGeo(t, WR), fit: fittingGeo(t) };
const useTrans = SAVE.q !== 'low';
const glassM = useTrans ? new THREE.MeshPhysicalMaterial({ color: '#cfeeff', transmission: .92, thickness: .6, roughness: .2, ior: 1.45, metalness: 0, envMapIntensity: 1.5, attenuationColor: C('#7fc9ff'), attenuationDistance: .7, clearcoat: 1, clearcoatRoughness: .05, side: THREE.DoubleSide })
  : new THREE.MeshPhysicalMaterial({ color: '#cfeeff', transparent: true, opacity: .5, roughness: .05, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false });
const WATER_VS = `attribute float aArm; attribute float aT; varying float vArm; varying float vT; varying vec3 vN; varying vec3 vWP;
  void main(){ vArm=aArm; vT=aT; vN=normalize(mat3(modelMatrix)*normal); vec4 wp=modelMatrix*vec4(position,1.0); vWP=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`;
const WATER_FS = `uniform vec4 uFill; uniform vec4 uFrom; uniform float uTime; varying float vArm; varying float vT; varying vec3 vN; varying vec3 vWP;
  void main(){ int a=int(vArm+0.5); float f = a==0?uFill.x : a==1?uFill.y : a==2?uFill.z : uFill.w; float fr = a==0?uFrom.x : a==1?uFrom.y : a==2?uFrom.z : uFrom.w;
    float p = fr>0.5 ? 1.0-vT : vT; if(f<=0.001 || p>f) discard;
    float dir = fr>0.5 ? 1.0 : -1.0; float s = sin((vT*dir*9.0 + uTime*9.0))*0.5+0.5;
    vec3 V=normalize(cameraPosition-vWP); float fres=pow(1.0-abs(dot(normalize(vN),V)),2.0);
    vec3 col=mix(vec3(0.05,0.38,0.95),vec3(0.35,0.8,1.0),s*0.45+fres*0.5); col+=vec3(0.7,0.95,1.0)*pow(s,8.0)*0.6;
    gl_FragColor=vec4(col*1.15,1.0); }`;
function waterMat() { return new THREE.ShaderMaterial({ vertexShader: WATER_VS, fragmentShader: WATER_FS, uniforms: { uFill: { value: new THREE.Vector4() }, uFrom: { value: new THREE.Vector4() }, uTime: { value: 0 } } }); }
function lineGeo(len, r) { const g = new THREE.CylinderGeometry(r, r, len, SEG, 1, true); g.rotateX(Math.PI / 2); g.translate(0, 0, len / 2); return tagGeo(g, 0, (i, p) => clamp(p.getZ(i) / len, 0, 1)); }

/* ================= levels ================= */
const TIERS = [
  { n: T('קל מאוד', 'Very easy'), d: T('צינורות ישרים ומרפקים – רק מסובבים', 'Straight pipes and elbows – just rotate'), room: 'bath' },
  { n: T('קל', 'Easy'), d: T('יותר צינורות מבלבלים, וחלקים להרכבה', 'More tricky pipes, and parts to place'), room: 'kitchen' },
  { n: T('בינוני', 'Medium'), d: T('צינורות T, ברגים נעולים ושני יעדים', 'T-pipes, bolted pipes and two targets'), room: 'basement' },
  { n: T('קשה', 'Hard'), d: T('בלי רמזים בדרך – מתכננים ובונים לבד', 'No live hints – plan and build it yourself'), room: 'spa' },
];
// [W,H, fill, types, lockFrac, place, extraTray, two, preview, extraLen]
const LV = [
  [3, 3, 0, 'se', 0, 0, 0, 0, 1, 0], [3, 4, 0, 'se', 0, 0, 0, 0, 1, 1], [3, 4, .4, 'se', 0, 0, 0, 0, 1, 1], [4, 4, .4, 'se', 0, 0, 0, 0, 1, 2], [4, 5, .55, 'se', 0, 0, 0, 0, 1, 2], [4, 5, .7, 'se', 0, 0, 0, 0, 1, 3],
  [4, 5, .85, 'se', 0, 0, 0, 0, 1, 3], [5, 5, .9, 'se', 0, 0, 0, 0, 1, 4], [5, 6, 1, 'set', 0, 0, 0, 0, 1, 4], [5, 6, 1, 'set', .15, 0, 0, 0, 1, 5], [5, 6, 1, 'set', 0, 2, 1, 0, 1, 4], [5, 7, 1, 'set', .1, 2, 1, 0, 1, 5],
  [5, 7, 1, 'set', .2, 0, 0, 0, 1, 6], [6, 7, 1, 'setx', .15, 0, 0, 0, 1, 6], [6, 7, 1, 'set', .1, 3, 1, 0, 1, 6], [6, 7, 1, 'set', .15, 2, 1, 1, 1, 4], [6, 8, 1, 'setx', .1, 0, 0, 1, 1, 6], [6, 8, 1, 'set', .15, 4, 2, 0, 0, 6],
  [6, 8, 1, 'setx', .1, 0, 0, 0, 0, 8], [7, 8, 1, 'set', .1, 4, 2, 0, 0, 8], [7, 8, 1, 'setx', .12, 0, 0, 1, 0, 6], [7, 9, 1, 'set', .15, 5, 2, 0, 0, 9], [7, 9, 1, 'setx', .1, 4, 2, 1, 0, 7], [7, 9, 1, 'setx', .1, 6, 2, 1, 0, 8],
];
function findPath(R, W, H, start, goal, used, minL, maxL, budget = 40000) {
  let steps = 0;
  const key = (c, r) => r * W + c;
  for (let attempt = 0; attempt < 60; attempt++) {
    const vis = new Set(used); const path = [];
    const dfs = (c, r) => { if (++steps > budget) return false; path.push([c, r]); vis.add(key(c, r));
      if (c === goal[0] && r === goal[1]) { if (path.length >= minL && path.length <= maxL) return true; }
      else if (path.length < maxL) { const ds = [0, 1, 2, 3].sort(() => R() - .5);
        ds.sort((a, b) => { const da = Math.abs(c + DX[a] - goal[0]) + Math.abs(r + DZ[a] - goal[1]), db = Math.abs(c + DX[b] - goal[0]) + Math.abs(r + DZ[b] - goal[1]); return (da - db) * (path.length < minL ? -.2 : 1) + (R() - .5) * 2.2; });
        for (const d of ds) { const nc = c + DX[d], nr = r + DZ[d]; if (nc < 0 || nr < 0 || nc >= W || nr >= H || vis.has(key(nc, nr))) continue; if (dfs(nc, nr)) return true; } }
      path.pop(); vis.delete(key(c, r)); return false; };
    steps = 0; if (dfs(start[0], start[1])) return path; minL = Math.max(2, minL - 1);
  }
  return null;
}
const dirTo = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1]; return dx === 1 ? 1 : dx === -1 ? 3 : dz === 1 ? 2 : 0; };
function genLevel(i) {
  const [W, H, fill, types, lockF, place, extra, two, preview, extraLen] = LV[i]; const R = rng(i * 7919 + 1234);
  const cs = Math.floor(R() * Math.ceil(W / 2)), ct = W - 1 - Math.floor(R() * Math.ceil(W / 2.5));
  const minL = H + Math.abs(ct - cs) + extraLen, maxL = minL + 6;
  let path, need, targets; const K = (c, r) => r * W + c;
  for (let tries = 0; tries < 12; tries++) {
  const mL = Math.max(H, minL - tries);
  path = findPath(R, W, H, [cs, H - 1], [ct, 0], [], mL, mL + 6) || findPath(R, W, H, [cs, H - 1], [ct, 0], [], H, W * H);
  need = new Map();
  path.forEach((p, k) => { const inD = k === 0 ? 2 : dirTo(p, path[k - 1]); const outD = k === path.length - 1 ? 0 : dirTo(p, path[k + 1]); need.set(K(p[0], p[1]), (1 << inD) | (1 << outD)); });
  targets = [{ c: ct, r: -1, kind: two ? 'toilet' : ['toilet', 'tub', 'sink'][i % 3] }];
  if (two) { // branch to a second target on the top edge
    let ok = false; const cols = [...Array(W).keys()].filter(c => Math.abs(c - ct) >= 2).sort((a, b) => Math.abs(b - ct) - Math.abs(a - ct));
    const order = path.map((p, k) => k).filter(k => k >= 1 && k <= path.length - 2).sort(() => R() - .5);
    for (const ct2 of cols) { if (ok) break;
      for (const k of order) { if (ok) break; const p = path[k]; const m = need.get(K(p[0], p[1])); if (!m || typeOf(m) === 't') continue;
        for (let d = 0; d < 4 && !ok; d++) { if (m & (1 << d)) continue; const nc = p[0] + DX[d], nr = p[1] + DZ[d]; if (nc < 0 || nr < 0 || nc >= W || nr >= H || need.has(K(nc, nr))) continue;
          const used = [...need.keys()]; const p2 = findPath(R, W, H, [nc, nr], [ct2, 0], used, 1, W * H, 3000); if (!p2) continue;
          need.set(K(p[0], p[1]), m | (1 << d));
          p2.forEach((q, j) => { const inD = j === 0 ? (d + 2) % 4 : dirTo(q, p2[j - 1]); const outD = j === p2.length - 1 ? 0 : dirTo(q, p2[j + 1]); need.set(K(q[0], q[1]), (1 << inD) | (1 << outD)); });
          targets.push({ c: ct2, r: -1, kind: 'tub' }); ok = true; } } }
  }
  if (!two || targets.length > 1) break; }
  const cells = []; const tray = { s: 0, e: 0, t: 0, x: 0 };
  const pathKeys = [...need.keys()];
  const placeSet = new Set(); { const cand = pathKeys.filter((k, j) => j > 0).sort(() => R() - .5); for (let j = 0; j < place && j < cand.length; j++) placeSet.add(cand[j]); }
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) { const k = K(c, r); let cell = null;
    if (need.has(k)) { const m = need.get(k), ty = typeOf(m); if (placeSet.has(k)) { tray[ty]++; cell = { c, r, empty: true, need: m }; }
      else { const lock = R() < lockF && k !== K(cs, H - 1); cell = { c, r, type: ty, rot: lock ? rotFor(ty, m) : Math.floor(R() * 4), lock, need: m }; } }
    else if (R() < fill) { const ty = types[Math.floor(R() * types.length)] || 's'; const lock = R() < lockF * .6; cell = { c, r, type: ty, rot: Math.floor(R() * 4), lock, need: 0 }; }
    else if (place) cell = { c, r, empty: true, need: 0 };
    cells.push(cell); }
  for (let j = 0; j < extra; j++) tray[types[Math.floor(R() * types.length)]]++;
  // make sure it isn't solved already
  const pc = cells.filter(c => c && c.need && !c.empty && !c.lock); if (pc.length && pc.every(c => rotMask(BASE[c.type], c.rot) === c.need)) pc[0].rot = (pc[0].rot + 1) % 4;
  let par = 0; for (const c of cells) if (c && c.need) { if (c.empty) par += 1; else if (!c.lock) { let k = 0; while (rotMask(BASE[c.type], (c.rot + k) % 4) !== c.need && k < 4) k++; par += k; } }
  return { i, W, H, cs, targets, cells, tray, preview: !!preview, par, tier: Math.floor(i / 6), place: place > 0 };
}

/* ================= rooms ================= */
const room = new THREE.Group(); scene.add(room);
const ROOMS = {
  bath: { bg: '#d9f1ef', floor: () => std('#ffffff', { map: TEX.planks(), roughness: .5 }), wall: () => std('#ffffff', { map: TEX.subway('#bdeee2', '#e8f7f3'), roughness: .35 }), plate: '#f6fbfd', frame: '#7fd3c3', light: '#fff3e2' },
  kitchen: { bg: '#ffeec4', floor: () => std('#ffffff', { map: TEX.checker('#2c2f3a', '#e2ddd3'), roughness: .25 }), wall: () => std('#ffffff', { map: TEX.butter(), roughness: .7 }), plate: '#e2f0ff', frame: '#ff9b4a', light: '#fff0d6' },
  basement: { bg: '#5d5550', floor: () => std('#ffffff', { map: TEX.concrete(), roughness: .85 }), wall: () => std('#ffffff', { map: TEX.brick(), roughness: .9 }), plate: '#6f7782', frame: '#4a4f57', light: '#ffd9a8' },
  spa: { bg: '#1f4a4c', floor: () => std('#ffffff', { map: TEX.marble(), roughness: .15 }), wall: () => std('#ffffff', { map: TEX.teal(), roughness: .6 }), plate: '#e4ddd2', frame: '#b8923e', light: '#ffe8cc' },
};
let ROOM = null;
function buildRoom(lv) {
  room.clear(); const th = ROOMS[TIERS[lv.tier].room]; ROOM = th; scene.background = C(th.bg);
  const bw = lv.W, bh = lv.H; const north = -bh / 2 - 3.1, west = -bw / 2 - 3.4;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), th.floor()); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; room.add(fl);
  const wm = th.wall(); const wn = new THREE.Mesh(new THREE.PlaneGeometry(40, 9), wm); wn.position.set(0, 4.5, north); wn.receiveShadow = true; room.add(wn);
  const ww = new THREE.Mesh(new THREE.PlaneGeometry(40, 9), wm); ww.rotation.y = Math.PI / 2; ww.position.set(west, 4.5, 0); ww.receiveShadow = true; room.add(ww);
  const base = std(th.frame, { roughness: .5 }); const bb = new THREE.Mesh(new THREE.BoxGeometry(40, .22, .06), base); bb.position.set(0, .11, north + .03); room.add(bb); const bb2 = bb.clone(); bb2.rotation.y = Math.PI / 2; bb2.position.set(west + .03, .11, 0); room.add(bb2);
  // board frame
  const fm = std(th.frame, { roughness: .4, metalness: lv.tier === 3 ? .8 : 0 });
  const fr = new THREE.Mesh(new RoundedBoxGeometry(bw + .5, .14, bh + .5, 3, .06), fm); fr.position.y = .02; fr.receiveShadow = true; fr.castShadow = true; room.add(fr);
  const pit = new THREE.Mesh(new THREE.BoxGeometry(bw + .1, .02, bh + .1), std(lv.tier === 2 ? '#3d4249' : '#c6d3dc', { roughness: .9 })); pit.position.y = .095; pit.receiveShadow = true; room.add(pit);
  // props
  const R = rng(lv.i * 31 + 7);
  if (th === ROOMS.bath || th === ROOMS.spa) { // plant + towel rack + mirror
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(.32, .24, .55, 24), std(th === ROOMS.spa ? '#d6b25e' : '#ffffff', { roughness: .3, metalness: th === ROOMS.spa ? .8 : 0 })); pot.position.set(west + .7, .275, north + .7); room.add(pot);
    for (let k = 0; k < 9; k++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(.24, 14, 8), std('#3fb874', { roughness: .5 })); const a = k / 9 * 6.28; lf.scale.set(.5, .12, 1); lf.position.set(west + .7 + Math.cos(a) * .25, .7 + R() * .6, north + .7 + Math.sin(a) * .25); lf.rotation.set(-.4, -a + 1.57, 0); room.add(lf); }
    const mir = new THREE.Mesh(new THREE.CircleGeometry(.7, 48), std('#dfeefa', { metalness: 1, roughness: .03 })); mir.position.set(bw / 2 + .2, 2.3, north + .02); room.add(mir);
    const mf = new THREE.Mesh(new THREE.TorusGeometry(.72, .05, 12, 60), th === ROOMS.spa ? std('#d6b25e', { metalness: 1, roughness: .2 }) : std('#7fd3c3')); mf.position.copy(mir.position); room.add(mf);
    if (th === ROOMS.spa) for (let k = 0; k < 5; k++) { const cd = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .18 + R() * .15, 16), std('#fff8ec')); cd.position.set(west + .4, .1, -1 + k * .35); room.add(cd); const fl2 = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), new THREE.MeshBasicMaterial({ color: C('#ffc46b').multiplyScalar(5) })); fl2.position.set(cd.position.x, cd.geometry.parameters.height + .05, cd.position.z); fl2.scale.y = 1.6; room.add(fl2); }
  } else if (th === ROOMS.kitchen) {
    for (let k = 0; k < 3; k++) { const cab = new THREE.Mesh(new RoundedBoxGeometry(1.1, .9, .6, 2, .04), std('#7cc6ff', { roughness: .45 })); cab.position.set(west + .32, .45, -bh / 2 + .3 + k * 1.15); cab.rotation.y = Math.PI / 2; room.add(cab);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.14, .05, .64), std('#ffffff', { roughness: .25 })); top.position.set(cab.position.x, .92, cab.position.z); top.rotation.y = Math.PI / 2; room.add(top); }
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(.22, .18, .14, 24), chrome); pan.position.set(west + .32, 1.02, -bh / 2 + .5); room.add(pan);
  } else { // basement: boiler + bulbs + crates
    const boil = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, 1.8, 28), std('#c94f3a', { roughness: .4, metalness: .3 })); boil.position.set(west + .7, .9, north + .8); room.add(boil);
    const gauge = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .04, 20), chrome); gauge.rotation.x = Math.PI / 2; gauge.position.set(west + .7, 1.3, north + 1.26); room.add(gauge);
    for (let k = 0; k < 3; k++) { const cr = new THREE.Mesh(new RoundedBoxGeometry(.6, .5, .6, 2, .03), std('#b8874f', { roughness: .8 })); cr.position.set(west + .5, .25 + (k === 2 ? .5 : 0), -bh / 2 + 1.5 + (k % 2) * .65); room.add(cr); }
    for (const x of [-1.2, 1.4]) { const bulb = new THREE.Mesh(new THREE.SphereGeometry(.09, 16, 12), new THREE.MeshBasicMaterial({ color: C('#ffcf80').multiplyScalar(5) })); bulb.position.set(x, 3.4, -bh / 2); room.add(bulb); const cord = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, 2), std('#222')); cord.position.set(x, 4.45, -bh / 2); room.add(cord); }
  }
  shadowAll(room, true, true); fl.castShadow = false; wn.castShadow = false; ww.castShadow = false;
  key.color = C(th.light); key.intensity = th === ROOMS.basement ? 1.8 : th === ROOMS.spa ? 1.55 : th === ROOMS.kitchen ? 1.85 : 2.3; hemi.intensity = th === ROOMS.basement ? .35 : th === ROOMS.spa ? .3 : .5;
  key.position.set(-3, 9, 5); key.target.position.set(0, 0, 0); const sz = Math.max(bw, bh) / 2 + 4; Object.assign(key.shadow.camera, { left: -sz, right: sz, top: sz, bottom: -sz, near: 1, far: 30 }); key.shadow.camera.updateProjectionMatrix();
  fillL.position.set(5, 4, 3);
}

/* ================= characters ================= */
function faceParts(g, headR, skin, o = {}) {
  const eyes = [];
  for (const s of [-1, 1]) { const e = new THREE.Group(); e.position.set(s * headR * .36, headR * .12, headR * .88); const w = new THREE.Mesh(new THREE.SphereGeometry(headR * .2, 20, 14), std('#ffffff', { roughness: .15 })); w.scale.set(1, 1.15, .6); e.add(w);
    const p = new THREE.Mesh(new THREE.SphereGeometry(headR * .11, 16, 12), std('#15131a', { roughness: .1 })); p.position.z = headR * .1; e.add(p); const h = new THREE.Mesh(new THREE.SphereGeometry(headR * .035, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); h.position.set(headR * .04, headR * .05, headR * .2); e.add(h); g.add(e); eyes.push(e); }
  const brows = []; for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(headR * .04, headR * .22, 4, 8), std(o.brow || '#3a2418')); b.rotation.z = Math.PI / 2; b.position.set(s * headR * .36, headR * .42, headR * .86); g.add(b); brows.push(b); }
  const mDark = std('#5e1a2c', { roughness: .4 });
  const sad = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V3(-.1, -.02, 0), V3(0, .05, 0), V3(.1, -.02, 0)).getPoints ? new THREE.QuadraticBezierCurve3(V3(-headR * .25, -headR * .05, 0), V3(0, headR * .1, 0), V3(headR * .25, -headR * .05, 0)) : null, 12, headR * .035, 6), mDark);
  sad.position.set(0, -headR * .36, headR * .93); g.add(sad);
  const happy = new THREE.Group(); const hm = new THREE.Mesh(new THREE.SphereGeometry(headR * .22, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mDark); hm.scale.set(1.1, 1, .45); happy.add(hm);
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(headR * .1, 12, 8), std('#ff7c94')); tongue.scale.set(1.2, .5, .5); tongue.position.set(0, -headR * .12, headR * .04); happy.add(tongue);
  happy.position.set(0, -headR * .3, headR * .9); happy.visible = false; g.add(happy);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(headR * (o.nose || .14), 16, 12), std(C(skin).lerp(C('#ff8a80'), .25).getStyle(), { roughness: .5 })); nose.position.set(0, -headR * .06, headR * .98); g.add(nose);
  for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.CircleGeometry(headR * .14, 16), new THREE.MeshBasicMaterial({ color: '#ff7a8a', transparent: true, opacity: .35, depthWrite: false })); ch.position.set(s * headR * .58, -headR * .18, headR * .8); ch.lookAt(s * headR * 1.6, -headR * .4, headR * 2.4); g.add(ch); }
  const tear = new THREE.Mesh(new THREE.SphereGeometry(headR * .07, 12, 10), new THREE.MeshPhysicalMaterial({ color: '#7fd0ff', roughness: .05, transmission: .6, thickness: .1 })); tear.scale.y = 1.4; tear.position.set(headR * .4, -headR * .05, headR * .9); g.add(tear);
  return { eyes, brows, sad, happy, tear };
}
function person(o) {
  const g = new THREE.Group(); const skin = o.skin, hr = .3; const bodyM = std(o.shirt, { roughness: .7 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.24, .34, 6, 16), bodyM); body.position.y = .62; g.add(body);
  const headG = new THREE.Group(); headG.position.y = 1.18; g.add(headG);
  const head = new THREE.Mesh(new THREE.SphereGeometry(hr, 32, 24), new THREE.MeshPhysicalMaterial({ color: skin, roughness: .55, sheen: .4, sheenColor: C(skin).lerp(C('#fff'), .5) })); headG.add(head);
  if (o.hair) { const h = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.06, 28, 18, 0, Math.PI * 2, 0, Math.PI * .5), std(o.hair, { roughness: .8 })); h.rotation.x = -.25; headG.add(h);
    if (o.bun) { const b = new THREE.Mesh(new THREE.SphereGeometry(hr * .38, 16, 12), std(o.hair, { roughness: .8 })); b.position.set(0, hr * 1.05, -hr * .25); headG.add(b); } }
  if (o.cap) { const c = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.1, 28, 16, 0, Math.PI * 2, 0, Math.PI * .55), std(o.cap, { roughness: .6 })); c.rotation.x = -.15; headG.add(c); }
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(hr * .2, 12, 10), head.material); e.scale.set(.5, 1, .8); e.position.set(s * hr * .98, 0, 0); headG.add(e); }
  const F = faceParts(headG, hr, skin, { brow: o.hair || '#3a2418' });
  const arms = []; for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.set(s * .27, .86, 0); const m = new THREE.Mesh(new THREE.CapsuleGeometry(.075, .3, 4, 10), bodyM); m.position.y = -.2; a.add(m); const hd = new THREE.Mesh(new THREE.SphereGeometry(.085, 12, 10), head.material); hd.position.y = -.42; a.add(hd); a.rotation.z = s * .25; g.add(a); arms.push(a); }
  const legs = []; for (const s of [-1, 1]) { const l = new THREE.Group(); l.position.set(s * .11, .38, 0); const m = new THREE.Mesh(new THREE.CapsuleGeometry(.085, .26, 4, 10), std(o.pants || '#3b4b6b', { roughness: .8 })); m.position.y = -.17; l.add(m); const sh = new THREE.Mesh(new RoundedBoxGeometry(.15, .09, .24, 2, .04), std(o.shoe || '#ffffff', { roughness: .4 })); sh.position.set(0, -.36, .05); l.add(sh); g.add(l); legs.push(l); }
  shadowAll(g, true, false);
  return { g, headG, F, arms, legs, body, mood: 'sad', sit: false, jump: 0, ph: Math.random() * 6 };
}
function setMood(P, m) { P.mood = m; P.F.sad.visible = m === 'sad'; P.F.happy.visible = m === 'happy'; P.F.tear.visible = m === 'sad'; }
function animPerson(P, t, dt) {
  const happy = P.mood === 'happy';
  if (happy) { P.jump += dt; const j = Math.abs(Math.sin(P.jump * 6 + P.ph)); P.g.position.y = P.baseY + j * .45; P.arms.forEach((a, i) => a.rotation.z = lerp(a.rotation.z, (i ? 1 : -1) * (2.6 + Math.sin(t * 12) * .25), dt * 10)); P.headG.rotation.x = lerp(P.headG.rotation.x, -.15, dt * 6);
    if (P.sit) P.legs.forEach(l => l.rotation.x = lerp(l.rotation.x, 0, dt * 8)); }
  else { P.g.position.y = P.baseY + Math.sin(t * 1.6 + P.ph) * .01; P.headG.rotation.x = lerp(P.headG.rotation.x, .22, dt * 3); P.arms.forEach((a, i) => a.rotation.z = lerp(a.rotation.z, (i ? 1 : -1) * .25, dt * 6));
    const ty = (t * .7 + P.ph) % 2; P.F.tear.position.y = P.headG.children[0].geometry.parameters.radius * (-.05 - ty * .35); P.F.tear.visible = ty < 1.2; }
  for (const e of P.F.eyes) e.scale.y = (Math.sin(t * 1.3 + P.ph) > .985) ? .1 : happy ? .6 : 1;
  P.F.brows.forEach((b, i) => b.rotation.z = Math.PI / 2 + (happy ? 0 : (i ? -.35 : .35)));
}
function buildRon() {
  const P = person({ skin: '#e9b48a', shirt: '#ff8a1f', pants: '#1f7f8c', shoe: '#4a3426', hair: null });
  P.mood = 'ron';
  const hat = new THREE.Group(); const dome = new THREE.Mesh(new THREE.SphereGeometry(.33, 28, 16, 0, Math.PI * 2, 0, Math.PI * .5), std('#ffc93a', { roughness: .35 })); hat.add(dome);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .03, 32), std('#ffc93a', { roughness: .35 })); brim.position.set(0, .01, .05); hat.add(brim);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, .07, 16), chrome); lamp.rotation.x = Math.PI / 2; lamp.position.set(0, .16, .3); hat.add(lamp);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(.05, 16), new THREE.MeshBasicMaterial({ color: C('#fff4c0').multiplyScalar(4) })); glow.position.set(0, .16, .34); hat.add(glow);
  hat.position.y = .1; hat.rotation.x = -.12; P.headG.add(hat);
  const beard = new THREE.Mesh(new THREE.SphereGeometry(.24, 20, 14, 0, Math.PI * 2, Math.PI * .45, Math.PI * .55), std('#7a4a2a', { roughness: .9 })); beard.position.set(0, -.04, .08); beard.scale.set(1.05, .9, 1); P.headG.add(beard);
  const gl = new THREE.Group(); for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.075, .013, 8, 24), std('#20262e')); r.position.set(s * .11, .04, .29); gl.add(r); } const br = new THREE.Mesh(new THREE.BoxGeometry(.07, .012, .012), std('#20262e')); br.position.set(0, .05, .29); gl.add(br); P.headG.add(gl);
  // overall bib + straps
  const bib = new THREE.Mesh(new RoundedBoxGeometry(.36, .3, .1, 2, .03), std('#1f7f8c', { roughness: .7 })); bib.position.set(0, .72, .2); P.g.add(bib);
  for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(.06, .3, .04), std('#1f7f8c')); st.position.set(s * .13, .93, .2); st.rotation.z = s * .12; P.g.add(st); const bt = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .02, 12), chrome); bt.rotation.x = Math.PI / 2; bt.position.set(s * .13, .84, .26); P.g.add(bt); }
  const belt = new THREE.Mesh(new THREE.TorusGeometry(.25, .04, 8, 32), std('#5a3a20')); belt.rotation.x = Math.PI / 2; belt.position.y = .48; P.g.add(belt);
  // wrench in right hand
  const w = new THREE.Group(); const handle = new THREE.Mesh(new RoundedBoxGeometry(.07, .52, .035, 2, .015), chrome); handle.position.y = -.12; w.add(handle);
  const headW = new THREE.Mesh(new RoundedBoxGeometry(.2, .12, .05, 2, .02), chrome); headW.position.y = .17; w.add(headW);
  const jaw = new THREE.Mesh(new RoundedBoxGeometry(.06, .14, .05, 2, .02), chrome); jaw.position.set(-.06, .29, 0); w.add(jaw); const jaw2 = jaw.clone(); jaw2.position.set(.06, .27, 0); w.add(jaw2);
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .1, 12), std('#c9a24a', { metalness: 1, roughness: .3 })); screw.rotation.z = Math.PI / 2; screw.position.y = .12; w.add(screw);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .2, 12), std('#ff3b3b', { roughness: .6 })); grip.position.y = -.3; w.add(grip);
  w.position.set(0, -.45, .1); w.rotation.x = -.4; P.arms[1].add(w); P.wrench = w;
  P.F.tear.visible = false; P.F.sad.visible = false; P.F.happy.visible = true; P.F.happy.scale.set(.8, .55, 1);
  shadowAll(P.g, true, false); P.swing = 0; return P;
}
function animRon(P, t, dt, cheer) {
  P.swing = Math.max(0, P.swing - dt * 3);
  const s = Math.sin((1 - P.swing) * Math.PI) * (P.swing > 0 ? 1 : 0);
  P.arms[1].rotation.x = lerp(P.arms[1].rotation.x, -s * 1.8 - (cheer ? 2.6 : .2), dt * 14);
  P.arms[1].rotation.z = lerp(P.arms[1].rotation.z, cheer ? .3 : .25, dt * 8);
  P.arms[0].rotation.z = lerp(P.arms[0].rotation.z, cheer ? -2.6 : -.25, dt * 8);
  P.g.position.y = P.baseY + (cheer ? Math.abs(Math.sin(t * 7)) * .3 : Math.sin(t * 2) * .012);
  for (const e of P.F.eyes) e.scale.y = (Math.sin(t * 1.1) > .985) ? .1 : 1;
  P.F.brows.forEach(b => b.rotation.z = Math.PI / 2);
}

/* fixtures */
function fixture(kind) {
  const g = new THREE.Group(); const o = { g, kind, water: null };
  if (kind === 'toilet') {
    const ped = new THREE.Mesh(new THREE.LatheGeometry([[.16, 0], [.2, .02], [.14, .2], [.2, .38]].map(p => new THREE.Vector2(...p)), 32), whiteGloss); ped.position.z = .05; g.add(ped);
    const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0, .32], [.14, .33], [.27, .4], [.31, .5], [.3, .52], [.25, .5]].map(p => new THREE.Vector2(...p)), 40), whiteGloss); bowl.scale.z = 1.25; bowl.position.z = .1; g.add(bowl);
    const seat = new THREE.Mesh(new THREE.TorusGeometry(.26, .045, 12, 40), std('#ffffff', { roughness: .3 })); seat.rotation.x = Math.PI / 2; seat.scale.y = 1.25; seat.position.set(0, .54, .1); g.add(seat);
    const tank = new THREE.Mesh(new RoundedBoxGeometry(.62, .55, .24, 3, .06), whiteGloss); tank.position.set(0, .82, -.3); g.add(tank);
    const lid = new THREE.Mesh(new RoundedBoxGeometry(.66, .05, .28, 2, .02), whiteGloss); lid.position.set(0, 1.11, -.3); g.add(lid);
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .03, 16), chrome); btn.position.set(0, 1.15, -.3); g.add(btn);
    const wat = new THREE.Mesh(new THREE.CircleGeometry(.22, 40), new THREE.MeshStandardMaterial({ map: TEX.swirl(), roughness: .05, metalness: .1, transparent: true, opacity: 0 })); wat.rotation.x = -Math.PI / 2; wat.scale.y = 1.25; wat.position.set(0, .45, .1); g.add(wat); o.water = wat;
    o.inlet = V3(0, .25, .3); o.seatY = .55;
  } else if (kind === 'tub') {
    const shell = new THREE.Group(); const w = 1.55, d = .8, h = .55, th = .07;
    const bot = new THREE.Mesh(new RoundedBoxGeometry(w, th, d, 2, .03), whiteGloss); bot.position.y = .14; shell.add(bot);
    for (const [x, z, sx, sz] of [[0, -d / 2, w, th], [0, d / 2, w, th], [-w / 2, 0, th, d], [w / 2, 0, th, d]]) { const m = new THREE.Mesh(new RoundedBoxGeometry(sx, h, sz, 2, .03), whiteGloss); m.position.set(x, .14 + h / 2, z); shell.add(m); }
    for (const [x, z, sx, sz] of [[0, -d / 2, w + .1, .14], [0, d / 2, w + .1, .14], [-w / 2, 0, .14, d + .1], [w / 2, 0, .14, d + .1]]) { const rim = new THREE.Mesh(new RoundedBoxGeometry(sx, .06, sz, 2, .025), whiteGloss); rim.position.set(x, .14 + h, z); shell.add(rim); }
    for (const [x, z] of [[-.6, -.3], [.6, -.3], [-.6, .3], [.6, .3]]) { const f = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 10), std('#d6b25e', { metalness: 1, roughness: .25 })); f.position.set(x, .07, z); shell.add(f); }
    g.add(shell);
    const fau = new THREE.Mesh(new THREE.TorusGeometry(.12, .03, 10, 20, Math.PI), chrome); fau.position.set(-w / 2 + .1, .14 + h + .1, 0); fau.rotation.y = Math.PI / 2; g.add(fau);
    const wg = new THREE.BoxGeometry(w - .13, 1, d - .13); wg.translate(0, .5, 0);
    const wat = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: '#2f9bff', emissive: C('#0b4fa8'), emissiveIntensity: .35, roughness: .08, metalness: .1, transparent: true, opacity: .82, depthWrite: false })); wat.position.y = .175; wat.scale.y = .01; g.add(wat); o.water = wat; wat.visible = false; wat.renderOrder = 3;
    const foam = new THREE.Group(); for (let k = 0; k < 22; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.05 + Math.random() * .05, 10, 8), std('#ffffff', { roughness: .4 })); b.position.set((Math.random() - .5) * (w - .3), 0, (Math.random() - .5) * (d - .3)); b.scale.y = .6; foam.add(b); } foam.visible = false; g.add(foam); o.foam = foam;
    const duck = new THREE.Group(); const db = new THREE.Mesh(new THREE.SphereGeometry(.08, 14, 10), std('#ffd23a', { roughness: .3 })); db.scale.set(1.2, .8, 1); duck.add(db); const dh = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 10), db.material); dh.position.set(.06, .07, 0); duck.add(dh); const bk = new THREE.Mesh(new THREE.ConeGeometry(.025, .05, 8), std('#ff7a1a')); bk.rotation.z = -Math.PI / 2; bk.position.set(.12, .07, 0); duck.add(bk);
    duck.position.set(.55, .14 + h + .06, d / 2 - .02); g.add(duck); o.duck = duck;
    o.inlet = V3(0, .3, d / 2 + .02); o.seatY = .25; o.tub = true;
  } else { // sink
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(.1, .16, .8, 24), whiteGloss); ped.position.y = .4; g.add(ped);
    const basin = new THREE.Mesh(new THREE.LatheGeometry([[0, .78], [.2, .8], [.34, .9], [.36, 1.0], [.32, 1.0], [.18, .86]].map(p => new THREE.Vector2(...p)), 40), whiteGloss); basin.scale.z = .8; g.add(basin);
    const tap = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .25, 12), chrome); tap.position.set(0, 1.1, -.22); g.add(tap); const sp = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .16, 12), chrome); sp.rotation.x = Math.PI / 2; sp.position.set(0, 1.22, -.15); g.add(sp);
    const wat = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .3, 10), new THREE.MeshStandardMaterial({ color: '#7fd0ff', emissive: C('#3aa0ff'), emissiveIntensity: .6, transparent: true, opacity: .85 })); wat.position.set(0, 1.06, -.08); wat.visible = false; g.add(wat); o.water = wat;
    o.inlet = V3(0, .3, .17); o.seatY = 0; o.stand = true;
  }
  shadowAll(g, true, true); return o;
}

/* ================= board build ================= */
const boardG = new THREE.Group(); scene.add(boardG);
let LVL = null, tiles = [], stubs = [], FIX = [], RON = null, PEOPLE = [];
const baseGeo = new RoundedBoxGeometry(.94, .1, .94, 2, .03);
const hazardTex = TEX.hazard();
const cellPos = (c, r) => V3((c - (LVL.W - 1) / 2), 0, (r - (LVL.H - 1) / 2));
function makeTileMesh(cell) {
  const g = new THREE.Group(); const p = cellPos(cell.c, cell.r); g.position.copy(p);
  const bm = cell.lock ? std('#ffffff', { map: hazardTex, roughness: .5 }) : std(ROOM.plate, { roughness: .45, metalness: LVL.tier === 2 ? .5 : 0 });
  const base = new THREE.Mesh(baseGeo, bm); base.position.y = .13; base.receiveShadow = true; g.add(base);
  if (cell.lock) for (const [x, z] of [[-.36, -.36], [.36, -.36], [-.36, .36], [.36, .36]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .04, 6), chrome); b.position.set(x, .2, z); g.add(b); }
  const sock = new THREE.Mesh(new THREE.RingGeometry(.3, .36, 32), new THREE.MeshBasicMaterial({ color: '#7fc8ff', transparent: true, opacity: 0, depthWrite: false })); sock.rotation.x = -Math.PI / 2; sock.position.y = .185; g.add(sock);
  const pipe = new THREE.Group(); pipe.position.y = .36; g.add(pipe);
  boardG.add(g); return { cell, g, pipe, sock, base, ang: 0, angT: 0, water: null, fit: null, pop: 0 };
}
function setPiece(t, type) {
  t.pipe.clear(); t.cell.type = type; t.cell.empty = !type; if (!type) { t.water = t.fit = null; return; }
  const G = GEO[type]; const gl = new THREE.Mesh(G.glass, glassM); gl.renderOrder = 2; t.pipe.add(gl);
  const wm = waterMat(); const w = new THREE.Mesh(G.water, wm); w.renderOrder = 1; t.pipe.add(w); t.water = wm;
  const fm = copper.clone(); fm.emissive = C('#38ffb0'); fm.emissiveIntensity = 0; const f = new THREE.Mesh(G.fit, fm); f.castShadow = true; t.pipe.add(f); t.fit = fm;
  t.ang = t.angT = -t.cell.rot * Math.PI / 2; t.pipe.rotation.y = t.ang;
}
function lineStub(a, b) { const len = a.distanceTo(b); const g = new THREE.Group(); g.position.copy(a); g.lookAt(b);
  const gl = new THREE.Mesh((() => { const q = new THREE.CylinderGeometry(PR, PR, len, SEG, 1, true); q.rotateX(Math.PI / 2); q.translate(0, 0, len / 2); return q; })(), glassM); gl.renderOrder = 2; g.add(gl);
  const wm = waterMat(); const w = new THREE.Mesh(lineGeo(len, WR), wm); w.renderOrder = 1; g.add(w);
  for (const z of [0.06, len - .06]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(.215, .215, .08, 24), copper); f.rotation.x = Math.PI / 2; f.position.z = z; f.castShadow = true; g.add(f); }
  boardG.add(g); return { g, water: wm, len }; }
function buildBoard(lv) {
  boardG.clear(); tiles = []; FIX = []; PEOPLE = []; stubs = [];
  for (const cell of lv.cells) { if (!cell) { tiles.push(null); continue; } const t = makeTileMesh(cell); if (!cell.empty) setPiece(t, cell.type); tiles.push(t); }
  const Y = .36;
  // source: valve + stub from south
  const sp = cellPos(lv.cs, lv.H - 1); const edgeS = V3(sp.x, Y, sp.z + .5), valveP = V3(sp.x, Y, sp.z + 1.25);
  stubs.src = lineStub(valveP, edgeS);
  const valve = new THREE.Group(); valve.position.copy(valveP); const vb = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .3, 24), chrome); vb.rotation.x = Math.PI / 2; valve.add(vb);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .3, 10), chrome); stem.position.y = .2; valve.add(stem);
  const wheel = new THREE.Group(); const wr = new THREE.Mesh(new THREE.TorusGeometry(.2, .035, 10, 28), std('#ff3b3b', { roughness: .35 })); wr.rotation.x = Math.PI / 2; wheel.add(wr);
  for (let k = 0; k < 3; k++) { const sk = new THREE.Mesh(new THREE.BoxGeometry(.4, .03, .03), wr.material); sk.rotation.y = k * Math.PI / 3; wheel.add(sk); } wheel.position.y = .36; valve.add(wheel); stubs.wheel = wheel;
  const riser = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, Y, 16), copper); riser.position.y = -Y / 2; valve.add(riser);
  boardG.add(shadowAll(valve)); stubs.valve = valveP;
  RON = buildRon(); RON.g.position.set(sp.x - .8, 0, sp.z + 1.4); RON.baseY = 0; boardG.add(RON.g);
  // targets
  stubs.tg = [];
  lv.targets.forEach((tg, k) => { const p = cellPos(tg.c, 0); const edge = V3(p.x, Y, p.z - .5); const f = fixture(tg.kind);
    const fz = p.z - (f.tub ? 1.62 : 1.5); f.g.position.set(p.x, 0, fz);
    boardG.add(f.g); f.g.updateMatrixWorld(true); const inl = f.inlet.clone().applyMatrix4(f.g.matrixWorld);
    const mid = V3(edge.x, Y, inl.z);
    const s1 = lineStub(edge, V3(edge.x, Y, mid.z)); const s2 = null;
    stubs.tg.push({ a: s1, b: s2, f });
    const P = person([{ skin: '#f2c3a0', shirt: '#ff5fa2', hair: '#4a2a18', bun: true }, { skin: '#c98b5e', shirt: '#4fd1c5', cap: '#ff9fd0' }, { skin: '#f7d2b4', shirt: '#7c6cff', hair: '#f2c46a' }][(lv.i + k) % 3]);
    if (f.kind === 'toilet') { P.sit = true; P.g.position.set(p.x, f.seatY - .32, fz + .12); P.legs.forEach(l => l.rotation.x = -1.45); P.baseY = f.seatY - .32;
      const np = new THREE.Mesh(new THREE.PlaneGeometry(.42, .3), new THREE.MeshStandardMaterial({ map: (() => { const c = cnv(128, 96), q = c.getContext('2d'); q.fillStyle = '#f4f1e8'; q.fillRect(0, 0, 128, 96); q.fillStyle = '#444'; q.fillRect(8, 8, 112, 14); for (let y = 30; y < 92; y += 8) q.fillRect(8, y, 50 + (y % 16) * 2, 3); q.fillRect(70, 30, 50, 34); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(), side: THREE.DoubleSide, roughness: .8 }));
      np.position.set(0, .78, .34); np.rotation.x = -.5; P.g.add(np); P.paper = np; }
    else if (f.kind === 'tub') { P.sit = true; P.g.position.set(p.x + .3, .05, fz - .05); P.baseY = .05; P.legs.forEach(l => l.visible = false); }
    else { P.g.position.set(p.x + .62, 0, fz + .25); P.baseY = 0; }
    setMood(P, 'sad'); boardG.add(P.g); PEOPLE.push(P); FIX.push(f);
    // leak puddle + drip point
    const pud = new THREE.Mesh(new THREE.CircleGeometry(.45, 32), new THREE.MeshPhysicalMaterial({ color: '#7fc8ff', roughness: .02, transmission: .3, transparent: true, opacity: .7 })); pud.rotation.x = -Math.PI / 2; pud.position.set(edge.x + .25, .012, mid.z + .5); pud.scale.set(1, .7, 1); boardG.add(pud); f.puddle = pud; f.drip = V3(edge.x, Y - .1, (edge.z + mid.z) / 2);
  });
  orient();
}
function orient() { if (!RON) return; const land = innerWidth / innerHeight > 1.05; const yaw = land ? Math.PI / 2 * .55 : 0; RON.g.rotation.y = land ? .75 : -.25; PEOPLE.forEach(P => P.g.rotation.y = land ? .6 : 0); }

/* ================= flow ================= */
const cellAt = (c, r) => (c < 0 || r < 0 || c >= LVL.W || r >= LVL.H) ? null : tiles[r * LVL.W + c];
const maskOf = t => (!t || t.cell.empty) ? 0 : rotMask(BASE[t.cell.type], t.cell.rot);
function trace() { // BFS from source, returns order with depths, leaks and reached targets
  const res = { order: [], leaks: [], reached: new Set(), seen: new Set() };
  const st = cellAt(LVL.cs, LVL.H - 1); if (!st || !(maskOf(st) & 4)) { res.leaks.push({ c: LVL.cs, r: LVL.H - 1, d: 0, src: true }); return res; }
  const q = [[st, 2, 0]]; res.seen.add(st);
  while (q.length) { const [t, inD, depth] = q.shift(); const m = maskOf(t); res.order.push({ t, inD, depth, m });
    for (let d = 0; d < 4; d++) { if (!(m & (1 << d)) || d === inD) continue; const nc = t.cell.c + DX[d], nr = t.cell.r + DZ[d];
      if (nr < 0) { const k = LVL.targets.findIndex(g => g.c === nc); if (k >= 0 && d === 0) { res.reached.add(k); continue; } }
      const n = cellAt(nc, nr); const back = (d + 2) % 4;
      if (n && (maskOf(n) & (1 << back))) { if (!res.seen.has(n)) { res.seen.add(n); q.push([n, back, depth + 1]); } }
      else res.leaks.push({ t, d, depth }); } }
  return res;
}

/* ================= particles ================= */
const PMAX = 1500; const pGeo = new THREE.BufferGeometry(); const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3), pSize = new Float32Array(PMAX), pA = new Float32Array(PMAX);
for (const [n, a, k] of [['position', pPos, 3], ['aCol', pCol, 3], ['aSize', pSize, 1], ['aA', pA, 1]]) pGeo.setAttribute(n, new THREE.BufferAttribute(a, k).setUsage(THREE.DynamicDrawUsage));
const pMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uPx: { value: 800 } },
  vertexShader: `attribute vec3 aCol; attribute float aSize; attribute float aA; uniform float uPx; varying vec3 vC; varying float vA; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=aSize*uPx/max(.1,-mv.z); vC=aCol; vA=aA; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 d=gl_PointCoord-.5; float r=length(d); if(r>.5) discard; gl_FragColor=vec4(vC*(1.0+0.4*smoothstep(.3,0.,length(d+.12))), smoothstep(.5,.2,r)*vA); }` });
const pts = new THREE.Points(pGeo, pMat); pts.frustumCulled = false; pts.renderOrder = 6; scene.add(pts);
const parts = [];
function emit(p, v, c, size, life, grav = 9, alpha = 1, square = false) { if (parts.length >= PMAX) parts.shift(); parts.push({ p: p.clone(), v: v.clone(), c, size, life, max: life, grav, alpha }); }
function updParts(dt) { let n = 0; for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life -= dt; if (q.life <= 0 || q.p.y < 0) { parts.splice(i, 1); continue; } q.v.y -= q.grav * dt; q.p.addScaledVector(q.v, dt); }
  for (const q of parts) { pPos.set([q.p.x, q.p.y, q.p.z], n * 3); pCol.set(q.c, n * 3); pSize[n] = q.size; pA[n] = q.alpha * Math.min(1, q.life / q.max * 3); n++; }
  pGeo.setDrawRange(0, n); for (const k of ['position', 'aCol', 'aSize', 'aA']) pGeo.attributes[k].needsUpdate = true; }
const WC = [.6, .85, 1.3];

/* ================= audio ================= */
let AC = null, master = null, noiseBuf = null, musicBus = null;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = SAVE.mute ? 0 : .9; master.connect(AC.destination); noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; musicBus = AC.createGain(); musicBus.gain.value = .7; musicBus.connect(master); } catch (e) { } } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
function tone(f, d, type = 'sine', v = .1, t0 = 0, f2 = 0, bus) { const a = ac(); if (!a) return; const t = a.currentTime + t0, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(bus || master); o.start(t); o.stop(t + d + .05); }
function noise(d, type, f, q, v, t0 = 0, f2 = 0) { const a = ac(); if (!a) return; const t = a.currentTime + t0, s = a.createBufferSource(); s.buffer = noiseBuf; const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d); fl.Q.value = q; const g = a.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + d + .05); }
const sfx = {
  clank() { tone(820, .18, 'triangle', .07); tone(1310, .14, 'sine', .05); tone(2270, .09, 'sine', .03); noise(.05, 'bandpass', 3000, 2, .15); },
  ratchet() { for (let k = 0; k < 3; k++) noise(.02, 'highpass', 4000, 1, .18, k * .045); },
  place() { tone(180, .12, 'sine', .14, 0, 90); noise(.06, 'lowpass', 900, 1, .2); tone(980, .1, 'triangle', .04, .04); },
  deny() { tone(160, .18, 'square', .05); tone(150, .18, 'square', .05, .12); },
  squeak() { tone(900, .35, 'sine', .04, 0, 1500); tone(1200, .3, 'triangle', .02, .1, 700); },
  flush() { noise(1.4, 'lowpass', 2400, 1, .35, 0, 300); noise(.9, 'bandpass', 700, 2, .2, .3, 200); },
  splash() { noise(.4, 'lowpass', 1800, 1, .3, 0, 400); for (let k = 0; k < 4; k++) tone(600 + Math.random() * 900, .08, 'sine', .04, k * .05, 1400); },
  star(k) { tone(880 * Math.pow(1.25, k), .3, 'triangle', .1); tone(1760 * Math.pow(1.25, k), .3, 'sine', .04, .02); },
  pick() { tone(660, .05, 'triangle', .06); },
  fail() { tone(400, .25, 'triangle', .07, 0, 300); tone(300, .35, 'triangle', .07, .2, 200); },
};
const loops = {};
function loopOn(n, type, f, q, v, lfo) { const a = ac(); if (!a || loops[n]) return; const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = a.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(v, a.currentTime + .2); s.connect(fl).connect(g).connect(master); s.start(); const ns = [s];
  if (lfo) { const o = a.createOscillator(); o.frequency.value = lfo; const og = a.createGain(); og.gain.value = f * .3; o.connect(og).connect(fl.frequency); o.start(); ns.push(o); } loops[n] = { g, ns }; }
function loopOff(n) { const l = loops[n]; if (!l) return; delete loops[n]; l.g.gain.cancelScheduledValues(AC.currentTime); l.g.gain.setValueAtTime(l.g.gain.value, AC.currentTime); l.g.gain.linearRampToValueAtTime(0, AC.currentTime + .3); setTimeout(() => l.ns.forEach(x => { try { x.stop(); } catch (e) { } }), 400); }
function voice(kind, pitch = 1) { const a = ac(); if (!a) return; let tt = a.currentTime; const seq = { yay: [[1, .12], [1.3, .12], [1.6, .3]], aww: [[1.1, .2], [.8, .4]], hm: [[1, .15], [1.05, .2]] }[kind];
  for (const [m, d] of seq) { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(200 * pitch * m, tt); o.frequency.linearRampToValueAtTime(200 * pitch * m * (kind === 'aww' ? .9 : 1.1), tt + d);
    const f1 = a.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 750 * Math.sqrt(pitch); f1.Q.value = 3; const f2 = a.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1800 * Math.sqrt(pitch); f2.Q.value = 4; const g = a.createGain();
    g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(.11, tt + .02); g.gain.exponentialRampToValueAtTime(.0001, tt + d); o.connect(f1).connect(g); o.connect(f2).connect(g); g.connect(master); o.start(tt); o.stop(tt + d + .02); tt += d * .9; } }
let mOn = false, mT = 0, mStep = 0;
function music() { if (!AC || !mOn) return; const sp = 60 / 108 / 2; while (mT < AC.currentTime + .25) { const s = mStep % 32, bar = Math.floor(mStep / 8) % 4; const root = [48, 53, 55, 53][bar]; const mf = n => 440 * Math.pow(2, (n - 69) / 12);
    const pl = (f, d, ty, v) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = ty; o.frequency.value = f; g.gain.setValueAtTime(0, mT); g.gain.linearRampToValueAtTime(v, mT + .01); g.gain.exponentialRampToValueAtTime(.0001, mT + d); o.connect(g).connect(musicBus); o.start(mT); o.stop(mT + d + .05); };
    if (s % 4 === 0 || s % 8 === 6) pl(mf(root - 12 + (s % 8 === 6 ? 7 : 0)), sp * 1.8, 'triangle', .1);
    const mel = [0, 4, 7, 12, 7, 4, 9, 7][(mStep + bar) % 8]; if (s % 2 === 0 && (s * 7 + bar) % 5 !== 0) { pl(mf(root + 24 + mel), sp * .9, 'sine', .035); pl(mf(root + 36 + mel), sp * .4, 'sine', .01); }
    if (s % 4 === 2) { const b = AC.createBufferSource(); b.buffer = noiseBuf; const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = AC.createGain(); g.gain.setValueAtTime(.03, mT); g.gain.exponentialRampToValueAtTime(.0001, mT + .06); b.connect(f).connect(g).connect(musicBus); b.start(mT, Math.random()); b.stop(mT + .07); }
    mT += sp; mStep++; } }
function startMusic() { if (!ac() || mOn) return; mOn = true; mT = AC.currentTime + .1; }

/* ================= game state ================= */
let state = 'title', moves = 0, hints = 3, hintUsed = false, fails = 0, flow = null, sel = null, winT = 0;
function loadLevel(i) {
  LVL = genLevel(i); buildRoom(LVL); buildBoard(LVL); moves = 0; hints = 3; hintUsed = false; fails = 0; flow = null; sel = null; winT = 0;
  for (const k of Object.keys(loops)) loopOff(k); parts.length = 0;
  $('lvName').textContent = T('שלב ', 'Level ') + (i + 1) + ' · ' + TIERS[LVL.tier].n; updHud(); renderTray(); fitCamera(true); updPreview();
}
function updHud() { $('lvMoves').textContent = T('מהלכים: ', 'Moves: ') + moves; $('hintN').textContent = hints; $('hintBtn').style.opacity = hints ? 1 : .45; }
const PIECE_SVG = { s: '<path d="M24 4v40" />', e: '<path d="M24 4v12a8 8 0 0 0 8 8h12" />', t: '<path d="M24 4v40M24 24h20" />', x: '<path d="M24 4v40M4 24h40" />' };
function renderTray() {
  const tr = $('tray'); if (!LVL.place) { tr.hidden = true; return; } tr.hidden = false;
  tr.innerHTML = ['s', 'e', 't', 'x'].filter(k => LVL.tray[k] > 0 || LVL.cells.some(c => c && c.placed === k)).map(k => `<button class="pc ${LVL.tray[k] ? '' : 'empty'}" data-k="${k}" aria-pressed="${sel === k}"><svg viewBox="0 0 48 48"><g fill="none" stroke="#1466d8" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">${PIECE_SVG[k]}</g><g fill="none" stroke="#bfe6ff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${PIECE_SVG[k].replace(/stroke[^ ]*/g, '')}</g></svg><span class="c">${LVL.tray[k]}</span></button>`).join('');
}
$('tray').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; ac(); const k = b.dataset.k; if (!LVL.tray[k]) { sfx.deny(); return; } sel = sel === k ? null : k; sfx.pick(); renderTray(); };
function updPreview() {
  const tr = trace(); const lit = new Set(tr.order.map(o => o.t));
  for (const t of tiles) if (t && t.fit) t.fit.emissiveIntensity = LVL.preview && lit.has(t) ? .55 : 0;
  const ready = tr.reached.size === LVL.targets.length; $('goBtn').classList.toggle('ready', LVL.preview && ready); return tr;
}
let toastT = 0; function toast(s, ms = 2200) { $('toast').textContent = s; $('toast').classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => $('toast').classList.remove('on'), ms); }
function tapCell(t) {
  if (state !== 'play' || flow) return; ac(); startMusic();
  if (t.cell.empty) { if (!LVL.place) return; if (!sel) { toast(T('בחרו צינור מהארגז למטה', 'Pick a pipe from the toolbox below')); sfx.deny(); return; }
    if (!LVL.tray[sel]) { sfx.deny(); return; } LVL.tray[sel]--; t.cell.rot = 0; t.cell.placed = sel; setPiece(t, sel); t.pop = 1; moves++; sfx.place(); RON.swing = 1; if (!LVL.tray[sel]) sel = null; renderTray(); updHud(); updPreview(); return; }
  if (t.cell.lock) { sfx.deny(); toast(T('הצינור הזה מוברג – אי אפשר לסובב', 'This pipe is bolted – it can’t turn')); t.pop = .5; return; }
  t.cell.rot = (t.cell.rot + 1) % 4; t.angT -= Math.PI / 2; moves++; sfx.clank(); sfx.ratchet(); RON.swing = 1; updHud(); updPreview();
}
function removeCell(t) { if (!t.cell.placed || flow) return; LVL.tray[t.cell.placed]++; t.cell.placed = null; setPiece(t, null); sfx.pick(); renderTray(); updPreview(); }
function hint() {
  if (state !== 'play' || flow || !hints) return; ac();
  for (const t of tiles) { if (!t || !t.cell.need) continue; const c = t.cell;
    if (c.empty) { const ty = typeOf(c.need); if (LVL.tray[ty] > 0) { LVL.tray[ty]--; c.placed = ty; c.rot = rotFor(ty, c.need); setPiece(t, ty); t.pop = 1; done(); return; } continue; }
    if (!c.lock && maskOf(t) !== c.need) { const want = rotFor(c.type, c.need); let k = 0; while ((c.rot + k) % 4 !== want && k < 4) k++; if (c.type === 's' && k > 1) k -= 2; c.rot = (c.rot + k) % 4; t.angT -= k * Math.PI / 2; t.pop = 1; done(); return; } }
  function done() { hints--; hintUsed = true; sfx.clank(); RON.swing = 1; renderTray(); updHud(); updPreview(); toast(T('רון סידר צינור אחד בשבילכם 💡', 'Ron fixed one pipe for you 💡')); }
}
$('hintBtn').onclick = hint;

/* flow run */
const D = .17;
function openWater() {
  if (state !== 'play' || flow) return; ac(); startMusic(); sfx.squeak(); RON.swing = 1;
  const tr = trace(); flow = { t: 0, tr, src: .45, cells: new Map(), end: 0, leakAt: [], reachedAt: [] };
  for (const o of tr.order) { const t0 = flow.src + o.depth * 2 * D; flow.cells.set(o.t, { t0, inD: o.inD, m: o.m }); flow.end = Math.max(flow.end, t0 + 2 * D); }
  for (const l of tr.leaks) { if (l.src) { flow.leakAt.push({ t: flow.src, p: V3(cellPos(LVL.cs, LVL.H - 1).x, .36, cellPos(LVL.cs, LVL.H - 1).z + .5), d: V3(0, .6, 1) }); continue; }
    const t0 = flow.src + l.depth * 2 * D + 2 * D; const p = cellPos(l.t.cell.c, l.t.cell.r).add(V3(DX[l.d] * .5, .36, DZ[l.d] * .5)); flow.leakAt.push({ t: t0, p, d: V3(DX[l.d], .8, DZ[l.d]) }); flow.end = Math.max(flow.end, t0 + 1.4); }
  // target reach times
  for (const o of tr.order) for (let d = 0; d < 4; d++) if ((o.m & (1 << d)) && d === 0 && o.t.cell.r === 0) { const k = LVL.targets.findIndex(g => g.c === o.t.cell.c); if (k >= 0 && tr.reached.has(k)) { flow.reachedAt[k] = flow.cells.get(o.t).t0 + 2 * D; flow.end = Math.max(flow.end, flow.reachedAt[k] + .9); } }
  flow.win = tr.reached.size === LVL.targets.length; flow.leaky = tr.leaks.length > 0;
  loopOn('flow', 'lowpass', 700, 1, .25, 4); $('goBtn').disabled = true;
}
function setArmFill(w, m, inD, p, drain) { // m world mask, inD world entry dir; fill uniforms are in local arm space
  const t = w.t; const rot = t.cell.rot; const fill = w.mat.uniforms.uFill.value, from = w.mat.uniforms.uFrom.value; const arr = [0, 0, 0, 0], fr = [0, 0, 0, 0];
  for (let d = 0; d < 4; d++) { if (!(m & (1 << d))) continue; const la = (d - rot + 4) % 4; if (d === inD) { arr[la] = clamp(p / D, 0, 1); fr[la] = 1; } else { arr[la] = clamp((p - D) / D, 0, 1); fr[la] = 0; } }
  fill.set(...arr.map(v => v * drain)); from.set(...fr);
}
function updFlow(dt, tt) {
  if (!flow) return; dt *= (window.__fast || 1); flow.t += dt; const ft = flow.t; const drain = flow.draining ? Math.max(0, 1 - flow.draining) : 1;
  const sF = clamp(ft / flow.src, 0, 1) * drain; stubs.src.water.uniforms.uFill.value.set(sF, 0, 0, 0); stubs.src.water.uniforms.uFrom.value.set(0, 0, 0, 0); stubs.wheel.rotation.y = -Math.min(ft, .6) * 8;
  for (const [t, c] of flow.cells) { if (!t.water) continue; setArmFill({ t, mat: { uniforms: t.water.uniforms } }, c.m, c.inD, ft - c.t0, drain); t.water.uniforms.uTime.value = tt; }
  stubs.src.water.uniforms.uTime.value = tt;
  stubs.tg.forEach((s, k) => { const r = flow.reachedAt[k]; const f = r ? clamp((ft - r) / .3, 0, 1) : 0; s.a.water.uniforms.uFill.value.set(f, 0, 0, 0); s.a.water.uniforms.uTime.value = tt; if (s.b) { s.b.water.uniforms.uFill.value.set(r ? clamp((ft - r - .3) / .25, 0, 1) : 0, 0, 0, 0); s.b.water.uniforms.uTime.value = tt; }
    if (r && ft > r + .45 && !s.done) { s.done = true; fixtureOn(s.f, k); } });
  if (!flow.draining) for (const l of flow.leakAt) if (ft > l.t) { if (!l.on) { l.on = true; loopOn('spray', 'highpass', 2200, .6, .18, 9); } for (let k = 0; k < 3; k++) emit(l.p, l.d.clone().multiplyScalar(2.2).add(V3((Math.random() - .5) * 1.4, Math.random() * 1.6, (Math.random() - .5) * 1.4)), WC, .05 + Math.random() * .04, 1.2, 9, .9); }
  if (ft > flow.end && !flow.done) { flow.done = true; loopOff('flow'); loopOff('spray');
    if (flow.win) win(); else { fails++; sfx.fail(); voice('aww', 1.4); toast(flow.leaky ? T('אוי! יש דליפה – המים לא מגיעים 💦', 'Oops! There’s a leak – the water doesn’t get there 💦') : T('המים עוד לא מגיעים', 'The water doesn’t reach yet'), 2600); flow.draining = .0001; } }
  if (flow.draining) { flow.draining += dt * 1.4; if (flow.draining >= 1) { flow = null; $('goBtn').disabled = false; resetWater(); } }
}
function resetWater() { for (const t of tiles) if (t && t.water) t.water.uniforms.uFill.value.set(0, 0, 0, 0); stubs.src.water.uniforms.uFill.value.set(0, 0, 0, 0); stubs.tg.forEach(s => { s.a.water.uniforms.uFill.value.set(0, 0, 0, 0); if (s.b) s.b.water.uniforms.uFill.value.set(0, 0, 0, 0); s.done = false; }); }
function fixtureOn(f, k) { f.active = 0; if (f.kind === 'toilet') sfx.flush(); else sfx.splash(); const P = PEOPLE[k]; setMood(P, 'happy'); if (P.paper) P.paper.visible = false; voice('yay', 1.3 + k * .25); if (f.water) f.water.visible = true; }
function win() {
  state = 'won'; winT = 0; voice('yay', .9); sfx.splash();
  const slack = [6, 6, 8, 10][LVL.tier]; let s = 3; if (moves > LVL.par + slack) s--; if (hintUsed) s--; if (fails >= 2) s--; if (flow.leaky) s--; s = Math.max(1, s);
  const id = LVL.i; if ((SAVE.stars[id] || 0) < s) SAVE.stars[id] = s; store(); LVL.starsWon = s;
  setTimeout(() => { $('wT').textContent = [T('עבודה טובה!', 'Good job!'), T('מעולה!', 'Great!'), T('אלוף האינסטלציה!', 'Plumbing champion!')][s - 1];
    $('wP').textContent = T(`${moves} מהלכים`, `${moves} moves`) + (flow && flow.leaky ? T(' · היו דליפות בדרך', ' · there were leaks') : '');
    [...$('wStars').children].forEach((e, k) => { e.classList.toggle('on', k < s); e.style.animationDelay = k * .25 + 's'; if (k < s) setTimeout(() => sfx.star(k), 250 * k + 150); });
    $('wNext').hidden = id >= LV.length - 1; $('winSheet').hidden = false; }, 2600);
}

/* ================= input ================= */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(V3(0, 1, 0), -.3);
function cellFromEvent(e) { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); const h = V3(); if (!ray.ray.intersectPlane(plane, h)) return null;
  const c = Math.round(h.x + (LVL.W - 1) / 2), r = Math.round(h.z + (LVL.H - 1) / 2); return cellAt(c, r); }
let down = null;
renderer.domElement.addEventListener('pointerdown', e => { if (state !== 'play') return; down = { x: e.clientX, y: e.clientY, t: performance.now(), cell: cellFromEvent(e), lp: false };
  if (down.cell && down.cell.cell.placed) down.timer = setTimeout(() => { if (down) { down.lp = true; removeCell(down.cell); } }, 480); });
renderer.domElement.addEventListener('pointerup', e => { if (!down) return; clearTimeout(down.timer); const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); if (!down.lp && moved < 14 && down.cell) tapCell(down.cell); down = null; });
renderer.domElement.addEventListener('pointercancel', () => { if (down) clearTimeout(down.timer); down = null; });
$('goBtn').onclick = openWater;
addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') openWater(); });

/* ================= camera ================= */
const camT = V3(), camP = V3(), camLook = V3(); let camInit = false;
function fitCamera(snap) {
  if (!LVL) return; const land = innerWidth / innerHeight > 1.05; orient();
  const W = LVL.W, H = LVL.H; const zMin = -H / 2 - 2.35, zMax = H / 2 + 1.75, xMin = -W / 2 - .25, xMax = W / 2 + .25;
  const center = V3((xMin + xMax) / 2, 0, (zMin + zMax) / 2); const elev = THREE.MathUtils.degToRad(land ? 46 : 52);
  const dir = land ? V3(Math.cos(elev), Math.sin(elev), 0) : V3(0, Math.sin(elev), Math.cos(elev));
  const pts = []; for (const x of [xMin, xMax]) for (const z of [zMin, zMax]) for (const y of [0, 1.35]) pts.push(V3(x, y, z));
  const top = .8, bot = land ? (LVL.place ? -.62 : -.72) : (LVL.place ? -.6 : -.74); // NDC bounds (leave room for HUD/dock)
  const cam = camera.clone(); let lo = 2, hi = 60;
  for (let it = 0; it < 30; it++) { const d = (lo + hi) / 2; cam.position.copy(center).addScaledVector(dir, d); cam.lookAt(center); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    let ok = true; for (const p of pts) { const v = p.clone().project(cam); if (v.x < -.94 || v.x > .94 || v.y > top || v.y < bot) { ok = false; break; } } if (ok) hi = d; else lo = d; }
  // re-centre vertically: shift look point so content sits between top & bot
  camP.copy(center).addScaledVector(dir, hi); camLook.copy(center);
  cam.position.copy(camP); cam.lookAt(camLook); cam.updateMatrixWorld(); let ymin = 9, ymax = -9; for (const p of pts) { const v = p.clone().project(cam); ymin = Math.min(ymin, v.y); ymax = Math.max(ymax, v.y); }
  const shift = ((top + bot) / 2 - (ymin + ymax) / 2); const up = V3(0, 1, 0).applyQuaternion(cam.quaternion); const hgt = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * hi; camLook.addScaledVector(up, -shift * hgt / 2); camP.addScaledVector(up, -shift * hgt / 2);
  if (snap || !camInit) { camera.position.copy(camP); camT.copy(camLook); camInit = true; }
}
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h); const pr = renderer.getPixelRatio(); fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr)); camera.aspect = w / h; camera.updateProjectionMatrix();
  pMat.uniforms.uPx.value = h * pr / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))); fitCamera(true); }
addEventListener('resize', resize);

/* ================= loop ================= */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
  camera.position.lerp(camP, Math.min(1, dt * 4)); camT.lerp(camLook, Math.min(1, dt * 4)); camera.lookAt(camT);
  for (const tl of tiles) { if (!tl) continue; tl.ang = lerp(tl.ang, tl.angT, Math.min(1, dt * 16)); tl.pipe.rotation.y = tl.ang + (tl.angT - tl.ang) * -.15; tl.pop = Math.max(0, tl.pop - dt * 3); tl.pipe.position.y = .36 + Math.sin(tl.pop * Math.PI) * .18;
    tl.sock.material.opacity = tl.cell.empty && sel ? .45 + Math.sin(t * 6) * .3 : tl.cell.empty && LVL.place ? .18 : 0; }
  if (RON) animRon(RON, t, dt, state === 'won');
  PEOPLE.forEach(P => animPerson(P, t, dt));
  FIX.forEach((f, k) => { if (f.water && f.water.visible) { if (f.kind === 'toilet') { f.water.material.opacity = Math.min(1, f.water.material.opacity + dt * 2); f.water.rotation.z += dt * 6; }
      else if (f.kind === 'tub') { f.water.scale.y = Math.min(.4, f.water.scale.y + dt * .22); f.foam.visible = true; f.foam.position.y = .175 + f.water.scale.y; f.foam.children.forEach((b, i) => b.position.y = Math.sin(t * 3 + i) * .012); f.water.position.y = .175; if (f.duck) f.duck.position.y = Math.max(f.duck.position.y, .175 + f.water.scale.y + .04 + Math.sin(t * 3) * .01); if (Math.random() < .3) emit(f.g.position.clone().add(V3((Math.random() - .5) * 1.2, .175 + f.water.scale.y + .05, (Math.random() - .5) * .5)), V3(0, .4, 0), [1.2, 1.3, 1.4], .07, .8, -.2, .7); }
      else { f.water.scale.y = .8 + Math.sin(t * 30) * .05; if (Math.random() < .5) emit(f.g.position.clone().add(V3(0, .9, -.08)), V3((Math.random() - .5) * .3, .5, (Math.random() - .5) * .3), WC, .03, .5, 6, .8); } }
    if (f.puddle) { const solved = f.water && f.water.visible; f.puddle.scale.x = lerp(f.puddle.scale.x, solved ? .01 : 1 + Math.sin(t * 2) * .03, dt * 2); f.puddle.scale.y = f.puddle.scale.x * .7; if (!solved && Math.random() < dt * 3) emit(f.drip, V3(0, 0, 0), WC, .045, .8, 6, .9); } });
  if (state === 'won') { winT += dt; if (winT < 2.5 && Math.random() < .7) { const P = PEOPLE[Math.floor(Math.random() * PEOPLE.length)]; if (P) emit(P.g.position.clone().add(V3(0, 1.6, 0)), V3((Math.random() - .5) * 3, 3 + Math.random() * 2, (Math.random() - .5) * 3), [[2.4, .6, 1], [.4, 1.6, 2.6], [2.6, 2.2, .4], [.5, 2.4, 1.2]][Math.floor(Math.random() * 4)], .07, 2, 5, 1); } }
  updFlow(dt, t); updParts(dt); music();
  composer.render();
}

/* ================= screens ================= */
let tabTier = clamp(SAVE.tier || 0, 0, 3);
function unlocked(i) { return i % 6 === 0 || (SAVE.stars[i - 1] || 0) > 0; }
function renderTitle() {
  $('tabs').innerHTML = TIERS.map((t, k) => `<button data-k="${k}" aria-pressed="${k === tabTier}">${t.n}</button>`).join('');
  $('tdesc').textContent = TIERS[tabTier].d;
  let h = ''; for (let j = 0; j < 6; j++) { const i = tabTier * 6 + j; const st = SAVE.stars[i] || 0; const un = unlocked(i);
    h += `<button class="lb ${un ? '' : 'lock'} ${LVL && LVL.i === i ? 'cur' : ''}" data-i="${i}" ${un ? '' : 'disabled'}>${un ? i + 1 : '🔒'}<small>${un ? '★'.repeat(st) + '☆'.repeat(3 - st) : ''}</small></button>`; }
  $('lgrid').innerHTML = h;
}
$('tabs').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; ac(); sfx.pick(); tabTier = +b.dataset.k; SAVE.tier = tabTier; store(); renderTitle(); if (!LVL || LVL.tier !== tabTier) loadLevel(tabTier * 6); };
$('lgrid').onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; ac(); startMusic(); sfx.pick(); play(+b.dataset.i); };
function play(i) { if (!LVL || LVL.i !== i || state === 'won') loadLevel(i); else { /* keep */ } state = 'play'; $('title').hidden = true; $('winSheet').hidden = true; $('hud').hidden = $('dock').hidden = false; $('goBtn').disabled = false;
  if (i === 0 && !SAVE.tut) { toast(T('לחצו על צינור כדי לסובב אותו – חברו את רון לאסלה!', 'Tap a pipe to rotate it – connect Ron to the toilet!'), 4200); SAVE.tut = 1; store(); }
  else if (LVL.place && !SAVE.tutP) { toast(T('בחרו חלק מהארגז ולחצו על משבצת ריקה. לחיצה ארוכה מחזירה אותו', 'Pick a part, tap an empty spot. Long-press to take it back'), 4600); SAVE.tutP = 1; store(); }
  else if (LVL.targets.length > 1) toast(T('שני לקוחות! המים צריכים להגיע לשניהם', 'Two customers! The water must reach both'), 3500);
  else if (!LVL.preview && LVL.i === 18) toast(T('מכאן אין רמזים ירוקים – תכננו בעצמכם', 'From here on no green hints – plan it yourself'), 3800); }
function showTitle() { state = 'title'; for (const k of Object.keys(loops)) loopOff(k); $('title').hidden = false; $('hud').hidden = $('dock').hidden = true; $('winSheet').hidden = true; renderTitle(); }
$('mapBtn').onclick = () => { ac(); sfx.pick(); tabTier = LVL.tier; showTitle(); };
$('resetBtn').onclick = () => { if (flow && !flow.done) return; ac(); sfx.pick(); loadLevel(LVL.i); state = 'play'; };
$('wMap').onclick = () => { tabTier = LVL.tier; loadLevel(LVL.i); showTitle(); };
$('wAgain').onclick = () => { $('winSheet').hidden = true; loadLevel(LVL.i); state = 'play'; };
$('wNext').onclick = () => { $('winSheet').hidden = true; play(LVL.i + 1); };
function syncSnd() { $('sndBtn').innerHTML = SAVE.mute ? '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#1466d8"/><path d="M17 9l5 6M22 9l-5 6" stroke="#1466d8" stroke-width="2.4" stroke-linecap="round"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#1466d8"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="#1466d8" stroke-width="2.2" stroke-linecap="round"/></svg>'; }
$('sndBtn').onclick = () => { SAVE.mute = !SAVE.mute; store(); syncSnd(); if (master) master.gain.value = SAVE.mute ? 0 : .9; };
const QN = { ultra: T('אולטרה', 'Ultra'), high: T('גבוהה', 'High'), low: T('חסכונית', 'Saver') };
$('qBtn').textContent = '✨ ' + T('גרפיקה: ', 'Graphics: ') + QN[SAVE.q]; $('qBtn').onclick = () => { SAVE.q = { ultra: 'high', high: 'low', low: 'ultra' }[SAVE.q]; store(); location.reload(); };
$('goBtn').innerHTML = '💧 ' + T('פתחו את המים', 'Open the water');
$('tSub').textContent = T('חברו את הצינורות מרון ועד הלקוח העצוב – ותנו למים לזרום!', 'Connect the pipes from Ron to the sad customer – and let the water flow!');
$('wMap').textContent = T('שלבים', 'Levels'); $('wAgain').textContent = T('שוב', 'Again'); $('wNext').textContent = T('הבא ▶', 'Next ▶');
$('loadTxt').textContent = T('רון אוסף את הכלים…', 'Ron is grabbing his tools…'); syncSnd();
if (window.parent !== window) { const go = () => { try { if (AC) AC.suspend(); } catch (e) { } window.parent.postMessage('skyplay-home', '*'); }; $('homeT').hidden = false; $('homeT').onclick = go; const b = $('homeT').cloneNode(true); b.id = 'hubHome'; b.removeAttribute('style'); b.onclick = go; $('hud').prepend(b); }

setTimeout(() => { const first = [...Array(24).keys()].find(i => unlocked(i) && !SAVE.stars[i]) ?? 0; tabTier = Math.floor(first / 6); loadLevel(first); resize(); showTitle(); $('loading').hidden = true; requestAnimationFrame(frame); window.__ronOK = true; }, 30);
window.__p = { get LVL() { return LVL; }, get state() { return state; }, get flow() { return flow; }, play, loadLevel, openWater, trace, tiles: () => tiles, tapCell, genLevel,
  solve() { for (const t of tiles) { if (!t || !t.cell.need) continue; const c = t.cell; if (c.empty) { const ty = typeOf(c.need); if (LVL.tray[ty] > 0) LVL.tray[ty]--; c.placed = ty; c.rot = rotFor(ty, c.need); setPiece(t, ty); } else if (!c.lock) { c.rot = rotFor(c.type, c.need); t.ang = t.angT = -c.rot * Math.PI / 2; } } updPreview(); renderTray(); } };
