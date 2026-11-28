import { THREE, $, V3, C, clamp, lerp, rnd, rng, T, isTouch, store, engine, studioEnv, std, shadowAll, cnv, ctex, particles, audio, toast, ICO, hubButtons, soundButton, qualityButton, cutie } from '../lib/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loadMix, MixRig } from '../lib/mixchar.js';

const S = store('dash-save', { best: 0, coins: 0, char: 0, owned: [0], up: { mag: 0, jet: 0, x2: 0, shield: 0 }, tut: 0, runs: 0 });
const E = engine(S, { fov: 62, far: 320, bloom: [.3, .5, 1.02], exposure: 1.06, vignette: .22, sat: 1.16 });
const { scene, camera, renderer } = E; studioEnv(E, '#eaf4ff', '#8a8a7a', .55);
const A = audio(S); const FX = particles(E, 1600);
const LW = 2.3, CH = 64, G = 34, TRAIN_H = 2.9, RAMP_L = 5, CAR_L = 11, CAR_GAP = .5, FLY_Y = 7, FLY_DUR = 7;
const LANES = [-LW, 0, LW];
const TAU = Math.PI * 2;
const TW = 9.2, PW = 3.4, PH = .32, XB = TW / 2 + PW; // track bed width, platform width/height, building line

/* ================= CHARACTERS ================= */
const CHARS = [
  { n: 'Remy', f: 'remy', price: 0, col: '#3a6ad8' },
  { n: 'Kai', f: 'kai', price: 400, col: '#e83a3a' },
  { n: 'Luna', f: 'luna', price: 900, col: '#ff6ab0', fem: 1 },
  { n: 'Rio', f: 'rio', price: 1800, col: '#8ad0c8' },
  { n: 'Zori', f: 'zori', price: 3500, col: '#ffb23a', fem: 1 },
];
if (!(S.char < CHARS.length)) S.char = 0;
const UPS = [['mag', '🧲', T('מגנט', 'Magnet')], ['jet', '🎈', T('בלונים', 'Balloons')], ['x2', '✖️2', T('כפול מטבעות', 'Double coins')], ['shield', '🫧', T('בועת מגן', 'Shield bubble')]];
const upDur = k => k === 'fly' ? FLY_DUR : 8 + (S.up[k] || 0) * 3, upCost = k => 300 * Math.pow(2, S.up[k] || 0);
const PICON = { mag: '🧲', jet: '🎈', x2: '💰', shield: '🫧', fly: '✈️' };

/* ================= CURVED WORLD ================= */
// every surface bends down (and gently sideways) with distance from the camera – the classic endless-runner horizon
const BEND = { value: .0017 }, CURV = { value: 0 };
const bentM = new WeakSet();
function bendMat(m) { if (!m || bentM.has(m) || m.isShaderMaterial || m.isPointsMaterial || m.isLineBasicMaterial) return; bentM.add(m); const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => { if (prev) prev.call(m, sh, r); sh.uniforms.uBend = BEND; sh.uniforms.uCurv = CURV;
    const code = '\n{ float bz = max(0., -mvPosition.z - 7.); mvPosition.y -= bz * bz * uBend; mvPosition.x += bz * bz * uCurv; gl_Position = projectionMatrix * mvPosition; }\n';
    let v = sh.vertexShader; v = v.includes('#include <project_vertex>') ? v.replace('#include <project_vertex>', '#include <project_vertex>' + code) : v.replace('gl_Position = projectionMatrix * mvPosition;', 'gl_Position = projectionMatrix * mvPosition;' + code);
    sh.vertexShader = 'uniform float uBend;\nuniform float uCurv;\n' + v; };
  m.needsUpdate = true; }
function bendAll(o) { o.traverse(x => { if (x.material) [].concat(x.material).forEach(bendMat); }); return o; }

/* ================= ZONES ================= */
const ZONES = [
  { n: T('🏙️ מרכז העיר', '🏙️ Downtown'), skyA: '#3f9cff', skyB: '#e4f4ff', fog: '#cfe6ff', sun: '#fff1da', sunI: 2.5, hemi: '#ffffff', hemiG: '#8a7a6a', bld: ['#f28b78', '#ffd27a', '#8fc9f2', '#b9a6ff', '#93dcae', '#ffb3d6', '#f1e1c9', '#a9c8e6', '#ff9e5e'], far: ['#9ab8d8', '#a8c0e0', '#b8c8e0'], tree: ['#4fb64a', '#6cc45a', '#3e9a3e', '#5ab84a'], acc: '#ff5a3a' },
  { n: T('🌸 רובע הפריחה', '🌸 Blossom District'), skyA: '#7d9cff', skyB: '#ffe6f3', fog: '#ffdcea', sun: '#fff0ea', sunI: 2.35, hemi: '#fff4fa', hemiG: '#a07a8a', bld: ['#fff4ea', '#ffe0d2', '#f7d9e8', '#e8eefa', '#fbe8c8', '#ffd0c0', '#f4c8d8'], far: ['#e8c0d8', '#d8c8e8', '#f0d0e0'], tree: ['#ffb7d5', '#ff9cc4', '#ffd2e6', '#ff8ab8'], acc: '#ff6aa8' },
  { n: T('🌇 נמל השקיעה', '🌇 Sunset Harbor'), skyA: '#4a3f9e', skyB: '#ffb56e', fog: '#f7b483', sun: '#ffb070', sunI: 2.25, hemi: '#ffd8b8', hemiG: '#6a4a5a', bld: ['#c8604a', '#3f8a8a', '#e0a048', '#8a5a7a', '#d87a5a', '#5a7aa8', '#b84a4a'], far: ['#8a5a7a', '#7a5a8a', '#9a6a7a'], tree: ['#ff8a3a', '#ffb23a', '#e8602a', '#d84a2a'], acc: '#ffb23a' },
];
const ZL = CH * 9;
const zoneAt = z => Math.floor(Math.max(0, -z) / ZL) % ZONES.length;

/* ================= WORLD ================= */
scene.fog = new THREE.Fog('#cfe6ff', 70, 240); renderer.setClearColor('#cfe6ff');
const skyM = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { a: { value: C('#3f9cff') }, b: { value: C('#e4f4ff') } }, vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }', fragmentShader: 'uniform vec3 a; uniform vec3 b; varying vec3 vP; void main(){ float h = normalize(vP).y; gl_FragColor = vec4(mix(b, a, smoothstep(-.02, .55, h)), 1.); }' });
const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), skyM); scene.add(sky);
const hemi = new THREE.HemisphereLight('#ffffff', '#8a7a6a', .95); scene.add(hemi); const sun = new THREE.DirectionalLight('#fff4e0', 2.5); sun.castShadow = renderer.shadowMap.enabled; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 14, bottom: -12, near: 1, far: 60 }); sun.shadow.bias = -.0005; scene.add(sun, sun.target);
// clouds that travel with the camera
const cloudT = (() => { const c = cnv(256, 128), x = c.getContext('2d'); for (let i = 0; i < 14; i++) { const cx = 40 + Math.random() * 176, cy = 60 + Math.random() * 30, r = 22 + Math.random() * 30; const g = x.createRadialGradient(cx, cy, 2, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); } return ctex(c); })();
const clouds = new THREE.Group(); scene.add(clouds); for (let i = 0; i < 12; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudT, fog: false, depthWrite: false, transparent: true, opacity: .9 })); s.scale.set(60 + Math.random() * 50, 26 + Math.random() * 16, 1); s.position.set(rnd(-170, 170), rnd(55, 110), -rnd(80, 280)); s.userData.v = rnd(.5, 1.5); clouds.add(s); }

// textures
function noise(x, w, h, n, f) { for (let i = 0; i < n; i++) { x.fillStyle = f(); x.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 2, 2 + Math.random() * 2); } }
const trackT = (() => { const W = 512, H = 256; const c = cnv(W, H), x = c.getContext('2d'); const px = m => (m + TW / 2) / TW * W;
  x.fillStyle = '#8f877c'; x.fillRect(0, 0, W, H); const cs = 16; for (let j = 0; j < H / cs; j++) for (let i = -1; i < W / cs + 1; i++) { const v = 128 + Math.random() * 42 | 0; x.fillStyle = `rgb(${v + 8},${v + 2},${v - 8})`; const ox = (j % 2) * cs / 2; x.beginPath(); x.roundRect(i * cs + ox + 1.2, j * cs + 1.2, cs - 2.4, cs - 2.4, 4); x.fill(); }
  for (const L of LANES) { const a = px(L - 1.06), b = px(L + 1.06); x.fillStyle = '#6c6a70'; x.fillRect(a, 0, b - a, H); noise(x, b - a, H, 1, () => '#000'); for (let i = 0; i < 1600; i++) { const v = 90 + Math.random() * 40 | 0; x.fillStyle = `rgba(${v},${v},${v + 6},.5)`; x.fillRect(a + Math.random() * (b - a), Math.random() * H, 2, 2); }
    x.fillStyle = '#d8d0c0'; x.fillRect(a - 3, 0, 4, H); x.fillRect(b - 1, 0, 4, H); x.fillStyle = 'rgba(255,255,255,.55)'; for (let y = 10; y < H; y += 64) x.fillRect(px(L) - 3, y, 6, 30); }
  return ctex(c, 1, CH / 4); })();
const trackM = std('#ffffff', { map: trackT, roughness: .9 });
const platT = (() => { const c = cnv(128, 128), x = c.getContext('2d'); x.fillStyle = '#ddd4c6'; x.fillRect(0, 0, 128, 128); noise(x, 128, 128, 600, () => `rgba(0,0,0,${Math.random() * .06})`); x.strokeStyle = '#bdb2a2'; x.lineWidth = 3; for (let i = 0; i <= 128; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); } return ctex(c, 2, CH / 4); })();
const platM = std('#ffffff', { map: platT, roughness: .9 }); const platG = new THREE.BoxGeometry(PW, PH, CH, 1, 1, 32);
const road = trackT, walk = platT; // used by the intro scene
const FS = 6.4; // one facade texture tile = 6.4 m (2x2 windows)
const facadeT = (() => { const c = cnv(256, 256), x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256); noise(x, 256, 256, 2400, () => `rgba(0,0,0,${Math.random() * .045})`);
  x.fillStyle = 'rgba(0,0,0,.07)'; x.fillRect(0, 122, 256, 8); x.fillRect(0, 250, 256, 6);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const X = i * 128 + 30, Y = j * 128 + 20, w = 68, h = 82, lit = i + j * 2 === 1 || i + j * 2 === 2 && Math.random() < .5;
    x.fillStyle = 'rgba(0,0,0,.16)'; x.fillRect(X - 6, Y - 5, w + 13, h + 14); x.fillStyle = '#f8f4ec'; x.fillRect(X - 4, Y - 4, w + 8, h + 8);
    const g = x.createLinearGradient(X, Y, X + w * .6, Y + h); if (lit) { g.addColorStop(0, '#fff2c8'); g.addColorStop(1, '#ffc46a'); } else { g.addColorStop(0, '#d2ecff'); g.addColorStop(.45, '#6a8ab8'); g.addColorStop(1, '#2a3a5a'); } x.fillStyle = g; x.fillRect(X, Y, w, h);
    if (!lit && Math.random() < .5) { x.fillStyle = 'rgba(255,190,200,.55)'; x.fillRect(X, Y, w * .3, h); x.fillRect(X + w * .7, Y, w * .3, h); }
    x.fillStyle = '#f8f4ec'; x.fillRect(X + w / 2 - 2, Y, 4, h); x.fillRect(X, Y + h * .36, w, 4);
    x.fillStyle = 'rgba(255,255,255,.3)'; x.beginPath(); x.moveTo(X + 3, Y + h - 6); x.lineTo(X + w * .42, Y + 4); x.lineTo(X + w * .58, Y + 4); x.lineTo(X + 12, Y + h - 6); x.fill();
    x.fillStyle = '#e4ddd0'; x.fillRect(X - 9, Y + h + 4, w + 18, 7); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(X - 9, Y + h + 11, w + 18, 3); }
  return ctex(c); })();
const shopT = (() => { const c = cnv(256, 128), x = c.getContext('2d'); x.fillStyle = '#3a3a44'; x.fillRect(0, 0, 256, 128); const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#fff0d0'); g.addColorStop(1, '#c89a6a'); x.fillStyle = g; x.fillRect(10, 18, 150, 104); x.fillRect(176, 18, 70, 110);
  const cols = ['#ff6a6a', '#ffd23a', '#6ad0ff', '#8ae06a', '#ff9ad0', '#b48aff']; for (let i = 0; i < 18; i++) { x.fillStyle = cols[i % 6]; const px = 18 + (i % 6) * 23, py = 60 + Math.floor(i / 6) * 20; x.beginPath(); x.arc(px, py, 7, 0, TAU); x.fill(); } x.fillStyle = '#5a3a2a'; x.fillRect(14, 70, 142, 4); x.fillRect(14, 90, 142, 4);
  x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(10, 18, 150, 6); x.fillStyle = '#2a2a30'; x.fillRect(206, 18, 4, 110); x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.moveTo(20, 120); x.lineTo(70, 20); x.lineTo(90, 20); x.lineTo(40, 120); x.fill(); return ctex(c); })();
const MAT = { facade: std('#ffffff', { map: facadeT, vertexColors: true, roughness: .78 }), plain: std('#ffffff', { vertexColors: true, roughness: .82 }), metal: std('#ffffff', { vertexColors: true, metalness: .55, roughness: .35 }),
  shop: std('#ffffff', { map: shopT, vertexColors: true, roughness: .3, emissive: C('#ffffff'), emissiveMap: shopT, emissiveIntensity: .35 }), glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), leaf: std('#ffffff', { vertexColors: true, roughness: .85, flatShading: true }) };
const shade = (c, k) => '#' + C(c).multiplyScalar(k).getHexString();
function uvBox(g, w, h, d, su0, sv0) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) { const f = Math.floor(i / 4); if (f === 2 || f === 3) { uv.setXY(i, .02, .55); continue; } const su = (f < 2 ? d : w) / su0, sv = h / sv0; uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); } }
function tint(g, c, k = 1) { if (g.index) g = g.toNonIndexed(); const n = g.attributes.position.count, a = new Float32Array(n * 3), cc = C(c); for (let i = 0; i < n; i++) { a[i * 3] = cc.r * k; a[i * 3 + 1] = cc.g * k; a[i * 3 + 2] = cc.b * k; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2)); return g; }
class Bk { constructor() { this.b = {}; } add(k, g) { (this.b[k] || (this.b[k] = [])).push(g); }
  box(k, w, h, d, x, y, z, c, uv, glow = 1) { const g = new THREE.BoxGeometry(w, h, d, 1, 1, !uv && d > 6 ? Math.ceil(d / 2) : 1); if (uv) uvBox(g, w, h, d, uv[0], uv[1]); g.translate(x, y, z); this.add(k, tint(g, c, glow)); }
  geo(k, g, x, y, z, c, glow = 1) { g.translate(x, y, z); this.add(k, tint(g, c, glow)); }
  build(par, shadow = false) { for (const k in this.b) { const geo = mergeGeometries(this.b[k]); this.b[k].forEach(g => g.dispose()); if (!geo) continue; const m = new THREE.Mesh(geo, MAT[k]); m.receiveShadow = k !== 'glow'; m.castShadow = shadow; par.add(m); } this.b = {}; } }

const pickR = (a, r) => a[Math.floor(r() * a.length)];
const AWN = ['#ff5a5a', '#2a9aff', '#2ab07a', '#ffb23a', '#a05aff', '#ff7ab0', '#1ab0b0'];
function building(bk, s, z, wd, h, dp, Z, r) { const c = pickR(Z.bld, r), x = s * (XB + dp / 2), zc = -z - wd / 2, fx = s * XB;
  bk.box('facade', dp, h, wd, x, h / 2, zc, c, [FS, FS]);
  bk.box('plain', dp + .6, .5, wd + .3, x - s * .05, h + .1, zc, shade(c, .72)); // cornice
  bk.box('plain', .18, h - 3.6, .35, fx - s * .09, (h + 3.6) / 2, zc - wd / 2 + .3, shade(c, .85)); // pilaster
  if (r() < .85) { const aw = pickR(AWN, r);
    bk.box('shop', .2, 3.1, wd - 1.4, fx - s * .1, 1.75, zc, '#ffffff', [FS, 3.1 * 2]);
    const ag = new THREE.BoxGeometry(1.4, .1, wd - 1.2); ag.rotateZ(s * .38); bk.geo('plain', ag, fx - s * .66, 3.55, zc, aw);
    bk.box('plain', .06, .42, wd - 1.2, fx - s * 1.3, 3.1, zc, shade(aw, .85)); // awning valance
    bk.box('glow', .14, .62, Math.min(wd * .5, 4.5), fx - s * .08, 4.35, zc, pickR(['#ff6a4a', '#ffd23a', '#5ad8ff', '#8aff7a', '#ff7ad8'], r), 1.5); }
  if (h > 10 && r() < .45) for (let y = 6.4; y < h - 2; y += 3.2) { bk.box('plain', .9, .14, wd * .62, fx - s * .45, y - 1.55, zc, '#f4f0ea'); bk.box('metal', .05, .55, wd * .62, fx - s * .88, y - 1.2, zc, '#3a3a44'); }
  if (r() < .55) { const tx = x + rnd(-1, 1), tz = zc + rnd(-1.5, 1.5); bk.geo('plain', new THREE.CylinderGeometry(.85, .85, 1.5, 12), tx, h + 1.7, tz, '#8a5a3a'); bk.geo('plain', new THREE.ConeGeometry(.95, .6, 12), tx, h + 2.75, tz, '#6a4a3a'); for (const [a, b] of [[-.5, -.5], [.5, .5], [-.5, .5], [.5, -.5]]) bk.box('metal', .08, .8, .08, tx + a, h + .6, tz + b, '#3a3a40'); }
  else bk.box('plain', 1.4, .8, 1.2, x + rnd(-1, 1), h + .7, zc + rnd(-1.5, 1.5), '#c8c8cc');
  if (r() < .3) bk.box('metal', .08, 3, .08, x, h + 1.8, zc, '#5a5a62'); }
function lamp(bk, s, z) { const x = s * (TW / 2 + .55); bk.box('metal', .14, 4.7, .14, x, PH + 2.35, z, '#3a3a46'); bk.box('metal', 1.0, .09, .09, x - s * .5, PH + 4.65, z, '#3a3a46'); bk.box('glow', .44, .14, .3, x - s * .95, PH + 4.55, z, '#fff2c8', 2.2); }
function tree(bk, s, z, Z, r) { const x = s * (XB - .9); bk.geo('plain', new THREE.CylinderGeometry(.13, .2, 2.4, 7), x, PH + 1.2, z, '#7a4a2a'); const n = 3 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) { const rr = .8 + r() * .55; bk.geo('leaf', new THREE.IcosahedronGeometry(rr, 1), x + rnd(-.6, .6), PH + 2.7 + rnd(-.2, .7), z + rnd(-.7, .7), pickR(Z.tree, r)); } }
function gantry(bk, z) { for (const s of [-1, 1]) { bk.box('metal', .22, 6.4, .22, s * (TW / 2 - .1), 3.2, z, '#5a5e6a'); bk.box('metal', .5, .3, .5, s * (TW / 2 - .1), .15, z, '#4a4e5a'); } bk.box('metal', TW, .26, .26, 0, 6.3, z, '#5a5e6a'); for (const L of LANES) bk.box('metal', .08, .32, .08, L, 6.05, z, '#2a2a30'); }
function bridge(bk, z, Z) { const span = (XB + 3) * 2, BY = 13.4; bk.box('plain', span, .8, 3.4, 0, BY, z, shade(Z.acc, .85)); bk.box('plain', span, .25, 3.6, 0, BY + .52, z, '#e8e4dc');
  for (const o of [-1.65, 1.65]) { bk.box('metal', span, .08, .08, 0, BY + 1.5, z + o, '#ffffff'); for (let xx = -span / 2; xx <= span / 2; xx += 1.2) bk.box('metal', .06, .9, .06, xx, BY + 1.05, z + o, '#ffffff'); }
  for (const s of [-1, 1]) bk.box('plain', 1.0, BY, 1.4, s * (TW / 2 + PW - .8), BY / 2 - .3, z, '#c8c0b4'); bk.box('glow', 5, .55, .06, 0, BY, z + 1.73, Z.acc, 1.6); }

const coinFaceT = (() => { const c = cnv(128, 128), x = c.getContext('2d'); const g = x.createRadialGradient(54, 50, 6, 64, 64, 64); g.addColorStop(0, '#fff6b0'); g.addColorStop(.6, '#ffd23a'); g.addColorStop(1, '#d89a10'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#c88a10'; x.lineWidth = 8; x.beginPath(); x.arc(64, 64, 50, 0, TAU); x.stroke();
  x.fillStyle = '#fff2a0'; x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 15 : 34; x.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); } x.fill(); x.strokeStyle = '#d8a020'; x.lineWidth = 3; x.stroke(); return ctex(c); })();
const coinG = new THREE.CylinderGeometry(.36, .36, .08, 22); { const uv = coinG.attributes.uv; for (let i = 0; i < 46; i++) uv.setXY(i, .06, .5); coinG.clearGroups(); } coinG.rotateX(Math.PI / 2);
const coinSide = new THREE.MeshStandardMaterial({ color: '#ffc81a', metalness: .9, roughness: .25, emissive: C('#a86a00'), emissiveIntensity: .4 }), coinFace = new THREE.MeshStandardMaterial({ map: coinFaceT, metalness: .55, roughness: .3, emissive: C('#ffffff'), emissiveMap: coinFaceT, emissiveIntensity: .3 });
const coinM = new THREE.MeshStandardMaterial({ map: coinFaceT, metalness: .75, roughness: .28, emissive: C('#ffffff'), emissiveMap: coinFaceT, emissiveIntensity: .35 }); const COIN_MAX = 200, _cq = new THREE.Quaternion(), _cs = V3(1, 1, 1), _c0 = V3(0, 0, 0), _cm = new THREE.Matrix4(); let coinRot = 0;

// trains
const SHARED = new Set(); const shG = g => (SHARED.add(g), g);
const carG = shG(new RoundedBoxGeometry(2.2, 2.55, CAR_L, 3, .3)), sideG = shG(new THREE.BoxGeometry(.03, 1.95, CAR_L - .9)), roofG = shG(new THREE.BoxGeometry(1.7, .12, CAR_L - 1.2)), acG = shG(new RoundedBoxGeometry(.95, .32, 1.6, 2, .08)), underG = shG(new THREE.BoxGeometry(1.8, .45, CAR_L - 1.4)), wheelG = shG(new THREE.CylinderGeometry(.34, .34, .16, 14).rotateZ(Math.PI / 2)), wsG = shG(new THREE.BoxGeometry(1.75, .95, .04)), hlG = shG(new THREE.SphereGeometry(.14, 12, 8)), signG = shG(new THREE.BoxGeometry(1.2, .24, .04)), coupG = shG(new THREE.BoxGeometry(.9, .55, CAR_GAP + .4));
const rampShape = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(RAMP_L, 0); s.lineTo(RAMP_L, TRAIN_H); s.closePath(); return s; })();
const rampG = shG((() => { const g = new THREE.ExtrudeGeometry(rampShape, { depth: 2.0, bevelEnabled: false }); g.translate(-RAMP_L, 0, -1); g.rotateY(Math.PI / 2); return g; })());
const rampCapG = shG((() => { const g = new THREE.ShapeGeometry(rampShape); g.translate(-RAMP_L, 0, 0); g.rotateY(Math.PI / 2); return g; })());
const stripeYB = (() => { const c = cnv(64, 64), x = c.getContext('2d'); x.fillStyle = '#ffd23a'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#1a1a1a'; for (let i = -64; i < 128; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 16, 0); x.lineTo(i + 16 - 64, 64); x.lineTo(i - 64, 64); x.fill(); } return ctex(c, 1, 1); })();
const LIV = [['#e8403a', '#ffffff', '#ffd23a'], ['#2a7aff', '#ffffff', '#ff5a3a'], ['#21a86a', '#f4f0e0', '#ffd23a'], ['#ff9a1a', '#2a2a3a', '#ffffff'], ['#7a4aff', '#ffffff', '#5ad8ff'], ['#f4f4f0', '#e8403a', '#2a7aff']].map(([b, st, ac]) => {
  const c = cnv(1024, 192), x = c.getContext('2d'); x.fillStyle = b; x.fillRect(0, 0, 1024, 192); x.fillStyle = st; x.fillRect(0, 150, 1024, 16); x.fillStyle = ac; x.fillRect(0, 170, 1024, 6);
  const door = X => { x.fillStyle = shade(b, .8); x.fillRect(X - 4, 18, 96, 132); x.fillStyle = '#20303e'; x.fillRect(X + 6, 26, 36, 60); x.fillRect(X + 50, 26, 36, 60); x.fillStyle = shade(b, .6); x.fillRect(X + 45, 18, 2, 132); };
  door(150); door(780); for (const wx of [20, 300, 410, 520, 630, 910]) { const w = wx === 20 || wx === 910 ? 90 : 96; const g = x.createLinearGradient(wx, 30, wx + w, 110); g.addColorStop(0, '#cfe8ff'); g.addColorStop(.5, '#4a6a90'); g.addColorStop(1, '#1e2a3a'); x.fillStyle = '#1a1a22'; x.fillRect(wx - 4, 26, w + 8, 82); x.fillStyle = g; x.fillRect(wx, 30, w, 74); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(wx + 8, 34, 10, 66); }
  return { body: std(b, { roughness: .32, metalness: .25 }), side: std('#ffffff', { map: ctex(c), roughness: .3, metalness: .2 }), roof: std(shade(b, .55), { roughness: .6 }) }; });
const darkM = std('#2a2a32'), glassM = new THREE.MeshStandardMaterial({ color: '#1e2c3c', metalness: .6, roughness: .08 }), whiteM = std('#f4f4f4'), greyM = std('#8a8e98', { roughness: .6 }), rampM = std('#ffffff', { map: (() => { const c = cnv(128, 128), x = c.getContext('2d'); x.fillStyle = '#9aa0aa'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#b8bec8'; for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { x.save(); x.translate(i * 16 + 8, j * 16 + 8); x.rotate((i + j) % 2 ? .6 : -.6); x.fillRect(-6, -1.5, 12, 3); x.restore(); } x.fillStyle = '#ffd23a'; x.fillRect(0, 0, 10, 128); x.fillRect(118, 0, 10, 128); return ctex(c, 1, 2); })(), roughness: .45, metalness: .6 }), rampCapM = std('#ffffff', { map: stripeYB, roughness: .5, side: THREE.DoubleSide });
const hlOn = new THREE.MeshBasicMaterial({ color: C('#fffbe0').multiplyScalar(3), toneMapped: false }), hlOff = new THREE.MeshBasicMaterial({ color: C('#ffe0a0').multiplyScalar(1.2), toneMapped: false }), signM = new THREE.MeshBasicMaterial({ color: C('#ffb23a').multiplyScalar(1.8), toneMapped: false });
const stripeM = (() => { const c = cnv(64, 16), x = c.getContext('2d'); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#ff3a2a'; x.fillRect(i * 8, 0, 8, 16); } return new THREE.MeshStandardMaterial({ map: ctex(c, 3, 1), roughness: .5 }); })();
const _m4 = new THREE.Matrix4();
function compact(g) { const by = new Map(); g.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(); const ms = []; g.traverse(o => { if (o.isMesh) ms.push(o); });
  for (const o of ms) { let geo = o.geometry.clone(); if (geo.index) geo = geo.toNonIndexed(); geo.applyMatrix4(_m4.multiplyMatrices(inv, o.matrixWorld)); for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k); if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2)); if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(geo); }
  g.clear(); for (const [m, arr] of by) { const geo = mergeGeometries(arr); arr.forEach(a => a.dispose()); const mesh = new THREE.Mesh(geo, m); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); } return g; }
function mkTrain(n, li, moving, rampOn) { const g = new THREE.Group(); const L = LIV[li % LIV.length];
  for (let k = 0; k < n; k++) { const zc = -(k * (CAR_L + CAR_GAP) + CAR_L / 2); const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, zc + z); g.add(o); return o; };
    add(carG, L.body, 0, 1.53, 0); for (const s of [-1, 1]) add(sideG, L.side, s * 1.1, 1.5, 0); add(roofG, L.roof, 0, 2.84, 0); add(acG, greyM, 0, 2.94, -2.6); add(acG, greyM, 0, 2.94, 2.6); add(underG, darkM, 0, .32, 0);
    for (const s of [-1, 1]) for (const wz of [-CAR_L / 2 + 1.4, -CAR_L / 2 + 2.3, CAR_L / 2 - 2.3, CAR_L / 2 - 1.4]) add(wheelG, darkM, s * .82, .34, wz);
    const ends = []; if (k === 0) ends.push(1); if (k === n - 1) ends.push(-1);
    if (k === 0) { const pm = darkM; for (const [y, z, rx, l] of [[3.6, .55, .75, 1.6], [4.95, .55, -.75, 1.6]]) { const a = new THREE.Mesh(new THREE.BoxGeometry(.06, l, .06), pm); a.position.set(0, y, zc + z); a.rotation.x = rx; g.add(a); } const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, .06, .14), pm); top.position.set(0, 5.82, zc + .55); g.add(top); const base = new THREE.Mesh(new THREE.BoxGeometry(.9, .12, .7), pm); base.position.set(0, 2.98, zc + .55); g.add(base); }
    for (const e of ends) { const ez = e * (CAR_L / 2 + .01); add(wsG, glassM, 0, 2.02, ez); add(signG, signM, 0, 2.62, ez); for (const s of [-1, 1]) add(hlG, moving && e > 0 ? hlOn : hlOff, s * .68, .92, ez); }
    if (k < n - 1) add(coupG, darkM, 0, .9, -CAR_L / 2 - CAR_GAP / 2); }
  if (rampOn) { const r = new THREE.Mesh(rampG, rampM); g.add(r); for (const s of [-1, 1]) { const cp = new THREE.Mesh(rampCapG, rampCapM); cp.position.x = s * 1.005; g.add(cp); } for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.12, TRAIN_H * .5, .12), darkM); leg.position.set(s * .9, TRAIN_H * .25, RAMP_L * .5); g.add(leg); } }
  return compact(g); }
// obstacles
const postG = shG(new THREE.BoxGeometry(.14, 1, .2)), boardG = shG(new THREE.BoxGeometry(2, .34, .14)), lampG = shG(new THREE.SphereGeometry(.09, 10, 8)), crateG = shG(new RoundedBoxGeometry(1, 1, 1, 2, .05));
const redGlow = new THREE.MeshBasicMaterial({ color: C('#ff3a2a').multiplyScalar(2.2), toneMapped: false }), crateM = std('#c8904a', { roughness: .85 }), crateM2 = std('#a8743a', { roughness: .85 });
const ybM = std('#ffffff', { map: stripeYB, roughness: .45 });

const chunks = []; let nextZ = 0; const mvBlock = [[0, 0], [0, 0], [0, 0]];
const laneBlocked = (ln, wz0, wz1 = wz0) => { const b = mvBlock[ln]; return wz1 < b[1] && wz0 > b[0]; }; // world-z range overlaps a reserved mover path
function buildChunk(z0, diff) { const g = new THREE.Group(); g.position.z = z0; scene.add(g); const r = rng((Math.floor(-z0 * 13) + runSeed) | 0); const Z = ZONES[zoneAt(z0 - CH / 2)]; const ch = { g, z0, obs: [], coins: [], pows: [], movers: [] }; const bk = new Bk();
  const rd = new THREE.Mesh(new THREE.PlaneGeometry(TW, CH, 1, 32), trackM); rd.rotation.x = -Math.PI / 2; rd.position.z = -CH / 2; rd.receiveShadow = true; g.add(rd);
  for (const L of LANES) for (const o of [-.72, .72]) { bk.box('metal', .16, .025, CH, L + o, .012, -CH / 2, '#3a3a40'); bk.box('metal', .07, .03, CH, L + o, .02, -CH / 2, '#e8ecf4'); }
  for (const s of [-1, 1]) { const pf = new THREE.Mesh(platG, platM); pf.position.set(s * (TW / 2 + PW / 2), PH / 2, -CH / 2); pf.receiveShadow = true; g.add(pf);
    bk.box('plain', .3, .02, CH, s * (TW / 2 + .2), PH + .011, -CH / 2, '#ffd23a'); bk.box('plain', .08, PH, CH, s * (TW / 2 + .04), PH / 2, -CH / 2, '#b8b0a2');
    for (let z = 0; z < CH;) { const wd = 7 + r() * 6, h = (Z === ZONES[2] ? 6 : 8) + r() * (Z === ZONES[1] ? 10 : 17), dp = 7 + r() * 4; building(bk, s, z, wd, h, dp, Z, r); z += wd + .3; }
    for (let z = r() * 10; z < CH; z += 16 + r() * 12) { const w = 10 + r() * 9, h = 24 + r() * 46; bk.box('facade', w, h, w, s * (XB + 17 + r() * 16), h / 2, -z - w / 2, pickR(Z.far, r), [FS * 1.2, FS * 1.2]); }
    for (let z = 6; z < CH; z += 16) lamp(bk, s, -z);
    for (let z = 2 + r() * 4; z < CH; z += 8 + r() * 6) if (r() < .8) tree(bk, s, -z, Z, r);
    if (Z === ZONES[1]) for (let z = 6; z < CH - 16; z += 16) for (let i = 1; i < 8; i++) bk.geo('glow', new THREE.SphereGeometry(.16, 8, 6), s * (TW / 2 + .55 - s * .95), PH + 4.3 - Math.sin(i / 8 * Math.PI) * .7, -z - i * 2, i % 2 ? '#ff6a8a' : '#ffd27a', 1.6); }
  for (let z = 12; z < CH; z += 32) gantry(bk, -z);
  for (const L of LANES) bk.box('metal', .035, .035, CH, L, 5.88, -CH / 2, '#2a2a30');
  if (z0 < -60 && r() < .35) bridge(bk, -(14 + r() * 36), Z);
  bk.build(g); bendAll(g); const og = new THREE.Group(); g.add(og);
  if (z0 > -40) { chunks.push(ch); return ch; }
  // obstacle rows
  const gap = lerp(15, 9.5, diff); let z = 6 + r() * 4;
  const W = zz => z0 - zz; // local distance -> world z
  while (z < CH - 6) { const kinds = [0, 0, 0]; const roll = r(); const rowZ = W(z);
    const open = [0, 1, 2].filter(l => !laneBlocked(l, rowZ - 14, rowZ + 2));
    if (diff > .06 && roll < .1 + diff * .16 && open.length >= 2) { // a train rushing towards the player
      const ln = open[Math.floor(r() * open.length)], n = r() < .5 ? 2 : 1, L = n * CAR_L + (n - 1) * CAR_GAP, v = 8 + diff * 6; const slot = W(z); const dist = Math.max(12, pl.z - slot), tt = dist / Math.max(17.5, pl.sp), near0 = slot - v * tt;
      const tg = mkTrain(n, Math.floor(r() * LIV.length), true, false); tg.position.set(LANES[ln], 0, near0); scene.add(tg); bendAll(tg);
      const o = { k: 'train', lane: ln, z0: near0 - L, z1: near0, rampZ: null, v, g: tg, mover: true }; ch.obs.push(o); ch.movers.push(o); mvBlock[ln] = [near0 - L - 10, slot + 4];
      z += L * .5 + gap; continue; }
    if (roll < .3 + diff * .12) { // parked trains, some with ramps
      const n = r() < .25 + diff * .3 ? 2 : 1, cars = 1 + Math.floor(r() * (1 + diff * 2.2)), len = cars * CAR_L + (cars - 1) * CAR_GAP; const cand = open.filter(l => !laneBlocked(l, W(z + len + RAMP_L), W(z))).sort(() => r() - .5); const lanes = cand.slice(0, Math.min(n, Math.max(0, cand.length - (open.length < 3 ? 1 : 0))));
      let anyRamp = false; for (const ln of lanes) { const rampOn = r() < .5 || (lanes.length === 2 && !anyRamp && ln === lanes[1]); anyRamp = anyRamp || rampOn; const zN = z + (rampOn ? RAMP_L : 0); const t = mkTrain(cars, Math.floor(r() * LIV.length), false, rampOn); t.position.set(LANES[ln], 0, -zN); og.add(t);
        ch.obs.push({ k: 'train', lane: ln, z0: W(zN + len) , z1: W(z), rampZ: rampOn ? W(zN) : null });
        if (rampOn) for (let k = 0; k < 3; k++) addCoin(ch, ln, z + 1 + k * 1.6, TRAIN_H * ((k + 1) / 3.4) + .9);
        if (rampOn || r() < .5) for (let k = 0; k < Math.floor(len / 2.2); k++) addCoin(ch, ln, zN + 1 + k * 2.2, TRAIN_H + 1); }
      z += len + RAMP_L + gap * .7; continue; }
    let free = open.length ? open[Math.floor(r() * open.length)] : 1; for (let ln = 0; ln < 3; ln++) { if (ln === free && r() < .85) continue; if (laneBlocked(ln, rowZ - 2, rowZ + 2)) continue; const q = r(); kinds[ln] = q < .42 ? 'hurdle' : q < .76 ? 'bar' : 'block'; }
    for (let ln = 0; ln < 3; ln++) { const k = kinds[ln]; if (!k) continue; const x = LANES[ln], o = new THREE.Group(); o.position.set(x, 0, -z); og.add(o);
      if (k === 'hurdle') { for (const s of [-1, 1]) { const p = new THREE.Mesh(postG, whiteM); p.scale.y = .95; p.position.set(s * .92, .47, 0); o.add(p); const lm = new THREE.Mesh(lampG, redGlow); lm.position.set(s * .92, 1.0, 0); o.add(lm); } const b = new THREE.Mesh(boardG, stripeM); b.position.y = .78; o.add(b); ch.obs.push({ k, lane: ln, z0: W(z) - .25, z1: W(z) + .25, top: 1.0 }); if (r() < .55) for (let c = -2; c <= 2; c++) addCoin(ch, ln, z + c * 1.4, 1.2 + (2.2 - Math.abs(c) * .5)); }
      else if (k === 'bar') { for (const s of [-1, 1]) { const p = new THREE.Mesh(postG, darkM); p.scale.y = 2.3; p.position.set(s * 1.02, 1.15, 0); o.add(p); } const b = new THREE.Mesh(boardG, ybM); b.scale.set(1.05, 1.5, 1); b.position.y = 1.62; o.add(b); for (const s of [-1, 1]) { const lm = new THREE.Mesh(lampG, redGlow); lm.position.set(s * .6, 1.62, .1); o.add(lm); } ch.obs.push({ k, lane: ln, z0: W(z) - .25, z1: W(z) + .25, low: 1.3 }); for (let c = 0; c < 3; c++) addCoin(ch, ln, z - 1.6 + c * 1.6, .7); }
      else { const a = new THREE.Mesh(crateG, crateM); a.scale.set(1.6, .95, 1.2); a.position.y = .475; o.add(a); const b2 = new THREE.Mesh(crateG, crateM2); b2.scale.set(.8, .55, .8); b2.position.set(rnd(-.3, .3), 1.22, rnd(-.1, .1)); b2.rotation.y = rnd(-.4, .4); o.add(b2); ch.obs.push({ k: 'block', lane: ln, z0: W(z) - .7, z1: W(z) + .7, top: 1.0 }); }
    }
    for (let ln = 0; ln < 3; ln++) if (!kinds[ln] && !laneBlocked(ln, W(z + 2), W(z - 6)) && r() < .55) for (let c = 0; c < 5; c++) addCoin(ch, ln, z - 6 + c * 1.6, 1);
    if (r() < .08 + diff * .03) { const ln = [0, 1, 2].find(l => !kinds[l] && !laneBlocked(l, W(z - 7), W(z - 11))); if (ln != null) addPow(ch, ln, z - 9); }
    z += gap * (.8 + r() * .5); }
  compact(og); bendAll(og); chunks.push(ch); return ch; }
function addCoin(ch, ln, z, y) { if (!ch.cim) { ch.cim = new THREE.InstancedMesh(coinG, coinM, COIN_MAX); ch.cim.count = 0; ch.cim.frustumCulled = false; ch.g.add(ch.cim); } if (ch.coins.length >= COIN_MAX) return; const m = { position: V3(LANES[ln], y, -z), visible: true }; ch.coins.push({ m, lane: ln, z: ch.z0 - z, y, got: 0 }); ch.cim.count = ch.coins.length; }
function coinTick(dt) { coinRot += dt * 4; _cq.setFromAxisAngle(V3(0, 1, 0), coinRot); for (const ch of chunks) { if (!ch.cim) continue; ch.coins.forEach((c, i) => { _cm.compose(c.m.position, _cq, c.got ? _c0 : _cs); ch.cim.setMatrixAt(i, _cm); }); ch.cim.instanceMatrix.needsUpdate = true; } }
function addCoinW(ln, wz, y) { const ch = chunks.find(c => wz <= c.z0 && wz > c.z0 - CH); if (ch) addCoin(ch, ln, ch.z0 - wz, y); }
const POWS = ['mag', 'jet', 'x2', 'shield', 'fly', 'fly'];
const powTex = {}; function pTex(k) { if (powTex[k]) return powTex[k]; const c = cnv(128, 128), x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 10, 64, 64, 62); g.addColorStop(0, '#ffffff'); g.addColorStop(.7, k === 'fly' ? '#ffb07a' : '#8ad8ff'); g.addColorStop(1, k === 'fly' ? 'rgba(255,120,60,0)' : 'rgba(90,180,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.font = '64px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(PICON[k], 64, 70); return powTex[k] = ctex(c); }
function addPow(ch, ln, z) { const k = POWS[Math.floor(Math.random() * POWS.length)]; const mat = new THREE.SpriteMaterial({ map: pTex(k), depthWrite: false }); bendMat(mat); const m = new THREE.Sprite(mat); m.scale.setScalar(1.4); m.position.set(LANES[ln], 1.3, -z); ch.g.add(m); ch.pows.push({ m, k, lane: ln, z: ch.z0 - z, got: 0 }); }
function dropChunk(ch) { scene.remove(ch.g); for (const o of ch.movers) scene.remove(o.g); ch.g.traverse(o => { if (o.isInstancedMesh) o.dispose(); if (o.geometry && o.geometry !== coinG && !SHARED.has(o.geometry)) o.geometry.dispose(); if (o.isSprite) o.material.dispose(); }); }

/* ================= PLAYER ================= */
let P = null, pg = null; const pl = { z: 0, lane: 1, x: 0, y: 0, vy: 0, slide: 0, air: false, sp: 12, dist: 0, coins: 0, dead: false, stumble: 0, pw: {}, ground: 0, lastLaneT: 0, prevLane: 1 };
// invisible joint skeleton (same layout as Skyrise) that drives a rigged character
let MX = null, rollG = null, tiltG = null, body = null, J = {}, JN = [], HIP0 = null; const ROTJ = {}, TGJ = {}; const hero = { ph: 0, land: 0, hipYc: .96, lastStep: 0, deadT: 0 };
const MXMAP = [['hips', 'Hips'], ['spine', 'Spine'], ['chest', 'Spine2'], ['neck', 'Neck'], ['head', 'Head'], ['shL', 'RightArm'], ['elL', 'RightForeArm'], ['haL', 'RightHand'], ['shR', 'LeftArm'], ['elR', 'LeftForeArm'], ['haR', 'LeftHand'], ['thL', 'RightUpLeg'], ['knL', 'RightLeg'], ['anL', 'RightFoot'], ['thR', 'LeftUpLeg'], ['knR', 'LeftLeg'], ['anR', 'LeftFoot']];
function mkSkel() { body = new THREE.Group(); J = {}; const grp = (n, par, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); par.add(g); J[n] = g; g.userData.base = g.position.clone(); return g; };
  const hips = grp('hips', body, 0, .96, 0), spine = grp('spine', hips, 0, .09, 0), chest = grp('chest', spine, 0, .18, 0), neck = grp('neck', chest, 0, .33, 0); grp('head', neck, 0, .1, 0);
  for (const s of [-1, 1]) { const k = s < 0 ? 'L' : 'R'; const sh = grp('sh' + k, chest, s * .185, .265, 0), el = grp('el' + k, sh, 0, -.29, 0); grp('ha' + k, el, 0, -.265, 0); const th = grp('th' + k, hips, s * .095, -.05, 0), kn = grp('kn' + k, th, 0, -.44, 0); grp('an' + k, kn, 0, -.41, 0); }
  JN = Object.keys(J); JN.forEach(n => { ROTJ[n] = [0, 0, 0]; TGJ[n] = [0, 0, 0]; }); HIP0 = J.hips.userData.base.clone(); }
function mannequin(col) { const ms = [], skin = std('#e8b890', { roughness: .6 }), shirt = std(col, { roughness: .6 }), pants = std('#2a3450', { roughness: .7 }); const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
  const add = (geo, m, j, y) => { const o = new THREE.Mesh(geo, m); o.position.y = y; J[j].add(o); o.castShadow = true; ms.push(o); };
  add(cap(.16, .28), shirt, 'spine', .16); add(new THREE.SphereGeometry(.13, 16, 12), skin, 'head', .1); for (const k of ['L', 'R']) { add(cap(.05, .2), shirt, 'sh' + k, -.14); add(cap(.045, .2), skin, 'el' + k, -.13); add(cap(.07, .3), pants, 'th' + k, -.22); add(cap(.06, .3), pants, 'kn' + k, -.2); add(new THREE.BoxGeometry(.1, .08, .24), darkM, 'an' + k, -.03); } return ms; }
const blobT = (() => { const c = cnv(64, 64), x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return ctex(c); })();
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobT, transparent: true, depthWrite: false })); scene.add(blob);
let jetG = null, balG = null, flames = [];
function mkHero() { if (pg) scene.remove(pg); pg = new THREE.Group(); rollG = new THREE.Group(); rollG.position.y = .62; pg.add(rollG); const off = new THREE.Group(); off.position.y = -.62; rollG.add(off); tiltG = new THREE.Group(); off.add(tiltG);
  mkSkel(); body.rotation.y = Math.PI; tiltG.add(body); MX = null; hero.ph = 0; hero.land = 0; hero.deadT = 0;
  const fb = mannequin(CHARS[S.char].col); const mine = pg;
  loadMix('lib/chars/' + CHARS[S.char].f + '.glb').then(src => { if (!src || pg !== mine) return; MX = new MixRig(src, 1.7); body.add(MX.holder); fb.forEach(m => m.visible = false); });
  P = { g: tiltG, legs: [J.thL, J.thR], arms: [J.shL, J.shR], update() { } };
  // paper plane the hero rides on
  jetG = new THREE.Group(); pg.add(jetG); flames = []; { const pm = std('#fbfaf6', { roughness: .7, side: THREE.DoubleSide }), fm = std('#e8e4da', { roughness: .7, side: THREE.DoubleSide });
    const tri = (pts, m) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3)); g.computeVertexNormals(); const o = new THREE.Mesh(g, m); o.castShadow = true; jetG.add(o); return o; };
    const N = [0, 0, -1.9], Tl = [-1.05, .05, .9], Tr = [1.05, .05, .9], K = [0, -.32, .9], C0 = [0, 0, .9]; tri([N, Tl, C0], pm); tri([N, C0, Tr], pm); tri([N, K, [0, 0, .9]], fm); tri([[-.08, 0, -1.2], [-.08, -.3, .9], [-.08, 0, .9]], fm); tri([[.08, 0, -1.2], [.08, 0, .9], [.08, -.3, .9]], fm);
    for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(.02, .01, 2.2), std('#c8c0b0')); st.position.set(s * .42, .03, -.3); st.rotation.y = s * -.2; jetG.add(st); } jetG.position.y = -.12; }
  jetG.visible = false;
  // balloon bunch for floaty jumps
  balG = new THREE.Group(); J.haR.add(balG); { const cols = ['#ff4a5a', '#ffd23a', '#4ab8ff', '#7ae05a', '#ff7ad0']; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; const b = new THREE.Mesh(new THREE.SphereGeometry(.2, 16, 12), new THREE.MeshStandardMaterial({ color: cols[i], roughness: .25, metalness: .05, emissive: C(cols[i]), emissiveIntensity: .15 })); b.scale.y = 1.18; b.position.set(Math.cos(a) * .2, 1.35 + (i % 2) * .22, Math.sin(a) * .2); balG.add(b);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, 1.3, 4), std('#ffffff')); str.position.set(Math.cos(a) * .1, .65 + (i % 2) * .1, Math.sin(a) * .1); str.rotation.set(Math.sin(a) * .15, 0, -Math.cos(a) * .15); balG.add(str); } } balG.visible = false;
  const bub = new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 16), new THREE.MeshStandardMaterial({ color: '#7ad8ff', transparent: true, opacity: .22, emissive: C('#3a8aff'), emissiveIntensity: .5, depthWrite: false })); bub.position.y = .9; bub.visible = false; pg.add(bub); pg.userData.bub = bub;
  scene.add(pg); }
const _mq = new THREE.Quaternion(), _md = V3();
function driveMix() { if (!MX) return; body.getWorldQuaternion(_mq).invert(); for (const [j, b] of MXMAP) MX.from(b, J[j], _mq); MX.hips(_md.copy(J.hips.position).sub(HIP0)); MX.apply(); }
function animHero(t, dt) { const L = ['L', 'R']; JN.forEach(n => { const a = TGJ[n]; a[0] = a[1] = a[2] = 0; }); const sT = (n, x = 0, y = 0, z = 0) => { const a = TGJ[n]; a[0] = x; a[1] = y; a[2] = z; }, aT = (n, x = 0, y = 0, z = 0) => { const a = TGJ[n]; a[0] += x; a[1] += y; a[2] += z; };
  let hipY = .96, kS = 14; const st = state === 'title' || state === 'pause' && false ? 'idle' : state === 'over' ? 'dead' : pl.pw.fly > 0 ? 'fly' : pl.slide > 0 ? 'roll' : pl.air ? 'air' : 'run';
  if (st === 'run') { hero.ph += dt * Math.min(15.5, 8 + pl.sp * .2); const ph = hero.ph;
    L.forEach((k, i) => { const s = i ? 1 : -1, a = ph + (i ? Math.PI : 0), sa = Math.sin(a), ca = Math.cos(a); sT('th' + k, -sa * .85 - .1, 0, s * .02); sT('kn' + k, .12 + Math.max(0, ca) * 1.75 + (sa < 0 ? .15 : 0)); sT('an' + k, Math.max(0, -sa) * .65 - Math.max(0, sa) * .2);
      const sb = Math.sin(a + Math.PI); sT('sh' + k, -sb * .9 + .05, 0, s * .16); sT('el' + k, -1.35 - Math.max(0, sb) * .35); sT('ha' + k, 0, 0, s * .1); });
    hipY = .9 + Math.cos(2 * ph) * .04; sT('hips', 0, Math.sin(ph) * .16, Math.cos(ph) * .035); sT('spine', .2, -Math.sin(ph) * .08); sT('chest', .04, -Math.sin(ph) * .2); sT('head', -.12, Math.sin(ph) * .06);
    const sg = Math.sign(Math.sin(ph)); if (sg !== hero.lastStep) { hero.lastStep = sg; if (state === 'run') A.noise(.04, 'lowpass', 400 + Math.random() * 300, 1, .025); } }
  else if (st === 'idle') { const b = Math.sin(t * 1.7); L.forEach((k, i) => { const s = i ? 1 : -1; sT('sh' + k, .04 + b * .01, 0, s * .07); sT('el' + k, -.16); sT('ha' + k, 0, 0, s * .12); sT('th' + k, -.02, 0, s * .04); sT('kn' + k, .05); sT('an' + k, -.03); }); sT('chest', b * .015); sT('hips', 0, 0, Math.sin(t * .6) * .02); sT('head', Math.sin(t * .4) * .05, Math.sin(t * .31) * .25); }
  else if (st === 'air') { const up = pl.vy > 2; kS = 11; L.forEach((k, i) => { const s = i ? 1 : -1, lead = i === 0; sT('sh' + k, up ? (lead ? .6 : -1.5) : -1.0, 0, s * (up ? .35 : .6)); sT('el' + k, up ? -1.0 : -.55); sT('th' + k, up ? (lead ? -1.3 : .35) : (lead ? -.7 : -.15)); sT('kn' + k, up ? (lead ? 1.7 : .8) : (lead ? .9 : .6)); sT('an' + k, .35); }); sT('spine', up ? .2 : .05); sT('head', up ? -.15 : .05); }
  else if (st === 'roll') { kS = 24; L.forEach((k, i) => { const s = i ? 1 : -1; sT('th' + k, -2.05, 0, s * .12); sT('kn' + k, 2.35); sT('an' + k, .45); sT('sh' + k, -1.0, 0, s * .35); sT('el' + k, -1.9); }); sT('spine', .75); sT('chest', .35); sT('head', .35); hipY = .96; }
  else if (st === 'fly') { kS = 7; const w = Math.sin(t * 2.2); L.forEach((k, i) => { const s = i ? 1 : -1; sT('th' + k, -.45 + s * .25, 0, s * .22); sT('kn' + k, .8); sT('an' + k, -.3); sT('sh' + k, -.1, 0, s * (1.25 + w * s * .15)); sT('el' + k, -.15); }); sT('hips', 0, .55, 0); sT('spine', .15, 0, w * .08); sT('head', -.1, -.4); hipY = .78; }
  else if (st === 'dead') { kS = 9; L.forEach((k, i) => { const s = i ? 1 : -1; sT('sh' + k, -.5, 0, s * 1.3); sT('el' + k, -.3); sT('th' + k, -.4 + i * .35); sT('kn' + k, .5); }); sT('spine', -.25); sT('head', -.45); }
  if (hero.land > 0 && st === 'run') { const la = hero.land; hipY -= .2 * la; L.forEach(k => { aT('th' + k, -.7 * la); aT('kn' + k, 1.3 * la); aT('an' + k, -.5 * la); }); aT('spine', .35 * la); } hero.land = Math.max(0, hero.land - dt * 4);
  if (pl.pw.jet > 0 && state === 'run' && st !== 'roll' && st !== 'fly') { sT('shR', -2.75, 0, .25); sT('elR', -.15); }
  const f = 1 - Math.exp(-dt * kS); for (const n of JN) { const r = ROTJ[n], tg = TGJ[n]; for (let a = 0; a < 3; a++) r[a] += (tg[a] - r[a]) * f; J[n].rotation.set(r[0], r[1], r[2]); }
  hero.hipYc += (hipY - hero.hipYc) * (1 - Math.exp(-dt * 16)); J.hips.position.y = hero.hipYc;
  if (st === 'roll') { const k = clamp((1 - pl.slide / .75) * 1.25, 0, 1); rollG.rotation.x = -TAU * (k * k * (3 - 2 * k)); } else if (st === 'dead') { hero.deadT += dt; rollG.rotation.x = lerp(rollG.rotation.x, 1.35, Math.min(1, dt * 7)); } else { if (rollG.rotation.x < -Math.PI) rollG.rotation.x += TAU; rollG.rotation.x = lerp(rollG.rotation.x, 0, Math.min(1, dt * 14)); }
  if (st === 'air' && pl.jumpFlip) { const k = clamp(pl.vy > 0 ? (1 - pl.vy / pl.jumpV) * .5 : .5 + Math.min(.5, -pl.vy / pl.jumpV * .5), 0, 1); rollG.rotation.x = -TAU * k; }
  jetG.visible = st === 'fly'; if (jetG.visible) { jetG.rotation.z = Math.sin(t * 2.2) * .12; jetG.rotation.x = Math.sin(t * 1.7) * .05; if (Math.random() < .5) { const p = jetG.getWorldPosition(V3()); FX.emit(p.add(V3(rnd(-1, 1), 0, 1)), V3(0, 0, 8), [2.2, 2.4, 2.6], rnd(.05, .1), .35, 0); } }
  balG.visible = pl.pw.jet > 0 && state === 'run'; if (balG.visible) balG.rotation.y = t * .4;
  driveMix(); }
const dog = (() => { const g = new THREE.Group(); const v = cutie({ skin: '#f2c3a0', shirt: '#ffffff', hat: '#ffffff', hair: '#3a2a1a', pants: '#3a3a4a' }); v.g.rotation.y = Math.PI; v.g.scale.setScalar(1.45); v.g.position.y = .2; g.add(v.g); v.arms[0].rotation.x = -1.4; v.arms[1].rotation.x = -2.8;
  const dm = std('#2ab0ff', { roughness: .35, metalness: .3 }), mm = std('#3a3a44', { metalness: .6, roughness: .3 }); const deck = new THREE.Mesh(new RoundedBoxGeometry(.36, .06, 1.05, 2, .02), dm); deck.position.y = .16; g.add(deck);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.15, 8), mm); stem.position.set(0, .72, -.5); stem.rotation.x = -.15; g.add(stem); const bar = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .55, 8), mm); bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.28, -.58); g.add(bar);
  const legs = []; for (const z of [-.5, .5]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .06, 14).rotateZ(Math.PI / 2), mm); w.position.set(0, .1, z); g.add(w); legs.push(w); }
  g.userData.legs = legs; g.userData.v = v; shadowAll(g); g.visible = false; scene.add(g); return g; })();


/* ================= INTRO PRANK ================= */
const emoT = {}; function emo(e, sc = .7) { if (!emoT[e]) { const c = cnv(128, 128), x = c.getContext('2d'); x.font = '100px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, 64, 70); emoT[e] = ctex(c); } const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emoT[e], depthWrite: false })); sp.scale.setScalar(sc); return sp; }
const PRANKS = [
  { e: '🍩', col: '#ff9ad0', v: { shirt: '#ffffff', hat: '#ffffff', hair: '#3a2a1a', pants: '#3a3a4a' }, he: 'חטף סופגנייה מהמאפייה!', hf: 'חטפה סופגנייה מהמאפייה!', en: 'snatched a donut from the bakery!' },
  { e: '🍦', col: '#8ad0ff', v: { shirt: '#5ab4ff', cap: '#ffffff', hair: '#1a1a1a', pants: '#2a3a6a' }, he: 'לקח גלידה מהעגלה בלי לשלם!', hf: 'לקחה גלידה מהעגלה בלי לשלם!', en: 'grabbed an ice cream without paying!' },
  { e: '🍉', col: '#8ae0a8', v: { shirt: '#2ab06a', cap: '#ff3a6a', hair: '#5a3a1a', pants: '#3a3a4a' }, he: 'סחב אבטיח מהדוכן!', hf: 'סחבה אבטיח מהדוכן!', en: 'swiped a watermelon from the stand!' },
  { e: '🧁', col: '#ffd27a', v: { shirt: '#ff8a1a', hat: '#ffffff', hair: '#ffd23a', pants: '#2a2a3a', long: true }, he: 'גנב קאפקייק מהקונדיטוריה!', hf: 'גנבה קאפקייק מהקונדיטוריה!', en: 'nabbed a cupcake from the sweet shop!' },
];
let IG = null, intro = null, introT = 0;
function clearIntro() { $('icap').hidden = $('iskip').hidden = true; if (IG) { scene.remove(IG); IG = null; } if (intro && intro.loot && intro.loot.parent) intro.loot.parent.remove(intro.loot); intro = null; }
function buildIntro() { clearIntro(); const pr = PRANKS[Math.floor(Math.random() * PRANKS.length)]; const g = new THREE.Group(); IG = g; scene.add(g);
  const cx = -1.75, cz = .2; const tM = std(pr.col, { roughness: .5 });
  const tbl = new THREE.Mesh(new RoundedBoxGeometry(.9, .95, 1.7, 3, .08), tM); tbl.position.set(cx, .48, cz); g.add(tbl);
  const top = new THREE.Mesh(new RoundedBoxGeometry(1.05, .08, 1.85, 2, .03), whiteM); top.position.set(cx, .99, cz); g.add(top);
  for (const z of [-.8, .8]) { const po = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1.4, 8), whiteM); po.position.set(cx - .38, 1.7, cz + z); g.add(po); }
  const aw = new THREE.Mesh(new THREE.BoxGeometry(1.25, .1, 2.1), stripeM); aw.position.set(cx - .1, 2.42, cz); aw.rotation.z = -.22; g.add(aw);
  const goods = []; for (let i = 0; i < 4; i++) { const sp = emo(pr.e, .42); sp.position.set(cx + .12, 1.2, cz - .6 + i * .4); g.add(sp); goods.push(sp); }
  const sign = emo(pr.e, .7); sign.position.set(cx - .3, 2.85, cz); g.add(sign);
  const vend = cutie({ skin: '#f2c3a0', ...pr.v }); vend.g.position.set(cx - .85, -1.25, cz); vend.g.rotation.y = Math.PI / 2; g.add(vend.g);
  const mad = emo('😠', .55); mad.position.set(cx - .85, 2.15, cz); mad.visible = false; g.add(mad);
  shadowAll(g); bendAll(g); intro = { pr, goods, vend, mad, loot: null, flags: {}, cz };
}
function beginRun() { $('icap').hidden = $('iskip').hidden = true; state = 'run'; runT = 0; $('hud').hidden = false; A.startMusic({ chords: [[45, 52, 57], [41, 48, 53], [43, 50, 55], [40, 47, 52]], bpm: 132, lead: true, kick: true, vol: .55 });
  if (!S.tut) { S.tut = 1; S.save(); toast(isTouch ? T('החליקו ימינה/שמאלה להחליף מסלול · למעלה לקפוץ · למטה להתגלגל', 'Swipe left/right to switch lanes · up to jump · down to roll') : T('חצים: ימין/שמאל, למעלה לקפוץ, למטה להתגלגל', 'Arrows: left/right, up to jump, down to roll'), 4500); } }
const IEND = 2.7;
function stepIntro(t, dt) { introT += dt; const k = introT, I = intro, f = I.flags, s = Math.min(1, dt * 12);
  const sneak = clamp(k / .7, 0, 1), turn = clamp((k - 1.75) / .4, 0, 1);
  pg.position.set(pl.x - .55 * sneak * (1 - turn), pl.y, pl.z + .2 * (1 - turn)); pg.rotation.y = lerp(Math.PI / 2, 0, turn * turn * (3 - 2 * turn)); pg.rotation.z = 0;
  const tip = k < .7 ? Math.sin(k * 22) : 0;
  P.legs.forEach((l, i) => l.rotation.x = k < .7 ? (i ? tip : -tip) * .55 : k < 1.75 ? 0 : (i ? 1 : -1) * Math.sin(t * 16) * .9);
  P.arms.forEach((a, i) => { const reach = i === 0 && k > .7 && k < 1.35; a.rotation.x = lerp(a.rotation.x, reach ? -1.55 : k < .7 ? -.9 : k < 1.75 ? -2.7 : (i ? -1 : 1) * Math.sin(t * 16) * 1.1, s); a.rotation.z = lerp(a.rotation.z, (i ? 1 : -1) * .25, s); });
  P.g.rotation.x = lerp(P.g.rotation.x, k < .7 ? .28 : 0, s); P.g.position.z = 0;
  const hop = k > 1.4 && k < 1.75 ? Math.sin((k - 1.4) / .35 * Math.PI) * .55 : 0; P.g.position.y = hop + (k < .7 ? Math.abs(tip) * .05 : 0); P.update(t, dt);
  if (k < .7 && Math.floor(k * 7) !== f.tp) { f.tp = Math.floor(k * 7); A.tone(f.tp % 2 ? 660 : 880, .05, 'triangle', .035); }
  if (k > .8 && !f.grab) { f.grab = 1; const gd = I.goods.pop(); IG.remove(gd); const l = emo(I.pr.e, .42); l.position.set(0, -.52, .06); P.arms[0].add(l); I.loot = l; A.tone(1200, .06, 'sine', .07); A.tone(1700, .08, 'sine', .06, .06); FX.burst(V3(pl.x - 1.1, 1.2, pl.z + .2), 12, [[1.6, 1.4, .6], [1.6, .8, 1.4]], 3, .08, .4, 1); $('icapT').textContent = `${I.pr.e} ${CHARS[S.char].n} ${T(CHARS[S.char].fem ? I.pr.hf : I.pr.he, I.pr.en)}`; $('icap').hidden = false; }
  if (k > 1.15) { I.vend.g.position.y = lerp(I.vend.g.position.y, 0, Math.min(1, dt * 14)); I.vend.update(t, dt); }
  if (k > 1.25 && !f.wh) { f.wh = 1; I.mad.visible = true; A.tone(2600, .22, 'square', .045, 0, 2300); A.tone(2600, .3, 'square', .045, .28, 2200); A.voice('aww', .7); }
  if (I.mad.visible) { I.mad.scale.setScalar(.55 + Math.sin(t * 14) * .06); I.vend.arms[0].rotation.x = -2.6 + Math.sin(t * 18) * .4; }
  if (k > 1.4 && !f.hop) { f.hop = 1; const h = emo('😜', .5); h.position.set(0, 1.85, 0); pg.add(h); f.hEmo = h; A.tone(500, .12, 'triangle', .06, 0, 900); }
  if (f.hEmo && k > 2.1) { pg.remove(f.hEmo); f.hEmo = null; }
  if (k >= IEND) { if (f.hEmo) { pg.remove(f.hEmo); f.hEmo = null; } I.chase = 0; beginRun(); } }
function stepChase(t, dt) { const I = intro; if (!I || !IG) return; if (I.loot && runT > 3.5) { I.loot.parent && I.loot.parent.remove(I.loot); I.loot = null; } I.chase += dt; const v = I.vend.g;
  if (I.chase < 2.4) { v.rotation.y = lerp(v.rotation.y, Math.PI, Math.min(1, dt * 6)); v.position.x = lerp(v.position.x, -1.2, dt * 2); v.position.z -= 9 * dt; I.vend.legs.forEach((l, i) => l.rotation.x = Math.sin(t * 15 + i * Math.PI) * .9); I.mad.position.set(v.position.x, 2.15, v.position.z); }
  else { I.vend.legs.forEach(l => l.rotation.x = 0); v.position.y = Math.abs(Math.sin(t * 10)) * .15; I.mad.position.set(v.position.x, 2.15 + v.position.y, v.position.z); }
  if (pl.z < -90) clearIntro(); }

/* ================= INPUT ================= */
const keys = {}; let tq = null;
addEventListener('keydown', e => { if (state === 'intro') { introT = Math.max(introT, IEND - .35); return; } if (state !== 'run') return; if (['ArrowLeft', 'KeyA'].includes(e.code)) act('l'); if (['ArrowRight', 'KeyD'].includes(e.code)) act('r'); if (['ArrowUp', 'KeyW', 'Space'].includes(e.code)) { act('u'); e.preventDefault(); } if (['ArrowDown', 'KeyS'].includes(e.code)) act('d'); if (e.code === 'Escape') pause(); });
const stage = $('stage');
addEventListener('pointerdown', e => { if (state === 'intro' && !e.target.closest('button')) { introT = Math.max(introT, IEND - .35); return; } if (state !== 'run' || e.target.closest('button')) return; A.ac(); tq = { x: e.clientX, y: e.clientY, done: false }; });
addEventListener('pointermove', e => { if (!tq || tq.done) return; const dx = e.clientX - tq.x, dy = e.clientY - tq.y; if (Math.hypot(dx, dy) > 28) { tq.done = true; if (Math.abs(dx) > Math.abs(dy)) act(dx > 0 ? 'r' : 'l'); else act(dy < 0 ? 'u' : 'd'); } });
addEventListener('pointerup', e => { if (tq && !tq.done && state === 'run') act('u'); tq = null; });
function act(k) { if (pl.dead) return; if (k === 'l' || k === 'r') { const nl = clamp(pl.lane + (k === 'l' ? -1 : 1), 0, 2); if (nl !== pl.lane) { pl.prevLane = pl.lane; pl.lane = nl; pl.lastLaneT = 0; A.noise(.12, 'bandpass', 2400, 1, .04, 0, 900); } }
  else if (k === 'u') { if (pl.pw.fly > 0) return; if (!pl.air) { pl.vy = pl.jumpV = pl.pw.jet > 0 ? 12.5 : 11.5; pl.jumpFlip = pl.pw.jet > 0 && Math.random() < .35; pl.air = true; pl.slide = 0; A.tone(400, .14, 'triangle', .07, 0, 820); } }
  else if (k === 'd') { if (pl.pw.fly > 0) return; if (pl.air) { pl.vy = Math.min(pl.vy, -16); pl.jumpFlip = false; } pl.slide = .75; A.noise(.3, 'lowpass', 900, 1, .08); } }


/* ================= ZONE LIGHTING ================= */
let curZone = -1; const _ca = C('#000'), _cb = C('#000');
const lerpC = (a, b, m) => _ca.set(a).lerp(_cb.set(b), m);
function zoneTick(dt) { const d = Math.max(0, -pl.z), zi = Math.floor(d / ZL), f = d / ZL - zi, A0 = ZONES[zi % 3], B0 = ZONES[(zi + 1) % 3], m = clamp((f - .9) / .1, 0, 1);
  skyM.uniforms.a.value.copy(lerpC(A0.skyA, B0.skyA, m)); skyM.uniforms.b.value.copy(lerpC(A0.skyB, B0.skyB, m)); const fc = lerpC(A0.fog, B0.fog, m); scene.fog.color.copy(fc); renderer.setClearColor(fc);
  sun.color.copy(lerpC(A0.sun, B0.sun, m)); sun.intensity = lerp(A0.sunI, B0.sunI, m); hemi.color.copy(lerpC(A0.hemi, B0.hemi, m)); hemi.groundColor.copy(lerpC(A0.hemiG, B0.hemiG, m));
  CURV.value = state === 'run' || state === 'over' || state === 'pause' ? Math.sin(d / 230) * .0011 : 0;
  if (state === 'run' && zi !== curZone) { if (curZone >= 0) toast(ZONES[zi % 3].n, 1500); curZone = zi; } }

/* ================= GAME ================= */
let runSeed = 1; let state = 'title', mult = 1, camZ = 0, shake = 0, runT = 0;
function groundAt(x, z, lane) { let gnd = 0; for (const ch of chunks) for (const o of ch.obs) if (o.k === 'train' && o.lane === lane && z < o.z1 && z > o.z0) { const tz = o.rampZ; if (tz != null && z > tz) { const k = (o.z1 - z) / RAMP_L; gnd = Math.max(gnd, clamp(1 - k, 0, 1) * TRAIN_H); } else if (z <= (o.rampZ ?? o.z1)) gnd = Math.max(gnd, TRAIN_H); } return gnd; }
function reset() { for (const ch of chunks) dropChunk(ch); chunks.length = 0; nextZ = 0; mvBlock.forEach(b => { b[0] = b[1] = 0; }); curZone = -1; A.loopOff('jet'); Object.assign(pl, { z: 0, lane: 1, x: 0, y: 0, vy: 0, slide: 0, air: false, sp: 17.5, dist: 0, coins: 0, dead: false, stumble: 0, pw: {}, ground: 0, prevLane: 1, jumpFlip: false, wasFly: false, inv: 0 }); mult = 1 + Math.floor((S.runs || 0) / 10) * 0; while (nextZ > -CH * 4) { buildChunk(nextZ, 0); nextZ -= CH; } mkHero(); dog.visible = false; camZ = 4; clearIntro(); }
function start(skip) { A.ac(); runSeed = Math.floor(Math.random() * 1e6); reset(); $('title').hidden = true; $('endSheet').hidden = true; $('pows').innerHTML = ''; updHud(); A.stopMusic();
  if (skip === true) { beginRun(); return; } buildIntro(); introT = 0; state = 'intro'; $('hud').hidden = true; $('iskip').textContent = T('הקישו כדי לדלג ⏩', 'Tap to skip ⏩'); $('iskip').hidden = false; }
function updHud() { $('scoreTxt').textContent = Math.floor(pl.dist * mult + pl.coins * 10); $('coinTxt').textContent = pl.coins; $('multTxt').textContent = 'x' + mult; }
function crash(why) { if (pl.inv > 0 || window.__god) return false; if (pl.pw.shield > 0) { pl.pw.shield = 0; pl.inv = 1.2; FX.burst(V3(pl.x, 1, pl.z), 30, [[.5, 1.6, 2.6], [1.6, 2.2, 2.6]], 5, .14, .6, 2); A.tone(900, .15, 'square', .05, 0, 300); toast(T('הבועה הצילה אתכם! 🫧', 'The bubble saved you! 🫧'), 1100); return false; }
  pl.dead = true; state = 'over'; A.loopOff('jet'); A.stopMusic(); A.noise(.5, 'lowpass', 500, 1, .45); A.tone(120, .4, 'sawtooth', .07, 0, 50); A.voice('aww', 1.1); shake = .6; try { navigator.vibrate && navigator.vibrate(150); } catch (e) { }
  dog.visible = true; dog.position.set(pl.x + (pl.lane < 2 ? 1.25 : -1.25), 0, pl.z + 4);
  const score = Math.floor(pl.dist * mult + pl.coins * 10); const nb = score > S.best; if (nb) S.best = score; S.coins += pl.coins * (pl.x2 ? 1 : 1); S.runs = (S.runs || 0) + 1; S.save();
  const rs = runSeed; setTimeout(() => { if (state !== 'over' || rs !== runSeed) return; $('eT').textContent = nb ? T('שיא חדש! 🏆', 'New record! 🏆') : T('אוי! נתקלתם 😵', 'Oops! You crashed 😵'); $('eP').innerHTML = T(`ניקוד: <b>${score}</b> · שיא: ${S.best}<br>🪙 +${pl.coins} (יש לכם ${S.coins})`, `Score: <b>${score}</b> · Best: ${S.best}<br>🪙 +${pl.coins} (you have ${S.coins})`); $('endSheet').hidden = false; if (nb) A.voice('yay', 1.2); }, 1200); return true; }
function step(dt) { if (state !== 'run') return; runT += dt; const d = Math.min(1, pl.dist / 3000); pl.sp = 17.5 + 20 * (1 - Math.exp(-pl.dist / 1300)); const v = pl.sp * dt; pl.z -= v; pl.dist += v; pl.inv = Math.max(0, (pl.inv || 0) - dt); for (const k in pl.pw) pl.pw[k] = Math.max(0, pl.pw[k] - dt);
  for (const ch of chunks) for (const o of ch.movers) { const dz = o.v * dt; o.z0 += dz; o.z1 += dz; o.g.position.z += dz; if (!o.horn && o.z1 > pl.z - 55 && o.z1 < pl.z) { o.horn = 1; A.tone(185, .55, 'sawtooth', .05); A.tone(233, .55, 'sawtooth', .04); } }
  while (nextZ > pl.z - CH * 3.5) { buildChunk(nextZ, Math.min(1, pl.dist / 2500)); nextZ -= CH; } while (chunks.length && chunks[0].z0 - CH > pl.z + 20) dropChunk(chunks.shift());
  const tx = LANES[pl.lane]; const ox = pl.x; pl.x = lerp(pl.x, tx, Math.min(1, dt * 14)); pl.lastLaneT += dt;
  const flying = pl.pw.fly > 0; if (pl.wasFly && !flying) { pl.inv = Math.max(pl.inv, 1.3); A.loopOff('jet'); } pl.wasFly = flying;
  const gnd = groundAt(pl.x, pl.z, pl.lane); if (flying) { pl.y = lerp(pl.y, FLY_Y, Math.min(1, dt * 2.5)); pl.vy = 0; pl.air = true; pl.slide = 0; } else { pl.vy -= G * (pl.pw.jet > 0 && pl.vy < 6 ? .42 : 1) * dt; pl.y += pl.vy * dt; } if (flying) { } else if (pl.y <= gnd) { if (pl.air && pl.vy < -6) { FX.burst(V3(pl.x, gnd + .1, pl.z), 8, [[.8, .8, .8]], 2, .1, .4, 4); hero.land = Math.min(1, -pl.vy / 22); } pl.y = gnd; pl.vy = 0; pl.air = false; pl.jumpFlip = false; } else if (pl.y > gnd + .05 && !pl.air) { if (gnd < pl.y - .4) pl.air = true; else pl.y = gnd; }
  pl.slide = Math.max(0, pl.slide - dt);
  // collisions
  const h = pl.slide > 0 ? .7 : 1.6; for (const ch of chunks) { if (!flying) for (const o of ch.obs) { if (pl.z > o.z1 + .5 || pl.z < o.z0 - .5) continue; const ox2 = LANES[o.lane]; if (Math.abs(ox2 - pl.x) > 1.25) continue; if (pl.z > o.z1 || pl.z < o.z0) continue; let hit = false;
      if (o.k === 'bar') hit = pl.y + h > o.low && pl.y < o.low + .5;
      else if (o.k === 'train') { const top = groundAt(pl.x, pl.z, o.lane); hit = pl.y < (o.rampZ != null && pl.z > o.rampZ ? top - .5 : TRAIN_H - .5); }
      else hit = pl.y < o.top - .15;
      if (hit && !(pl.inv > 0)) { if (Math.abs(ox2 - pl.x) > .55 && pl.lastLaneT < .35 && o.lane === pl.lane) { pl.lane = pl.prevLane; pl.stumble = 1.2; shake = .25; A.noise(.2, 'lowpass', 700, 1, .25); dog.visible = true; dog.position.set(pl.x, 0, pl.z + 7); if (pl.stumbleT > 0) { if (crash()) return; } pl.stumbleT = 6; pl.inv = .4; } else { pl.why = o.k + ' y' + pl.y.toFixed(2) + ' sl' + pl.slide.toFixed(2) + ' dz' + (pl.z - o.z1).toFixed(2); if (crash()) return; } } }
    for (const c of ch.coins) { if (c.got) continue; const near = pl.pw.mag > 0 && Math.abs(c.z - pl.z) < 9; if (near) { c.m.position.x = lerp(c.m.position.x, pl.x, dt * 8); c.m.position.y = lerp(c.m.position.y, pl.y + 1, dt * 8); c.m.position.z = lerp(c.m.position.z, pl.z - ch.z0, dt * 8); }
      const wx = c.m.position.x, wz = ch.z0 + c.m.position.z, wy = c.m.position.y; if (Math.abs(wz - pl.z) < .9 && Math.abs(wx - pl.x) < 1 && Math.abs(wy - (pl.y + .8)) < 1.4) { c.got = 1; c.m.visible = false; pl.coins += pl.pw.x2 > 0 ? 2 : 1; A.tone(1320 + (pl.coins % 5) * 80, .06, 'square', .035); A.tone(1980, .08, 'sine', .04, .04); FX.burst(V3(wx, wy, wz), 5, [[2.6, 2.2, .6]], 2, .07, .3, 3); } }
    for (const p of ch.pows) { if (p.got) continue; if (Math.abs(p.z - pl.z) < 1 && Math.abs(LANES[p.lane] - pl.x) < 1 && pl.y < 2.5) { p.got = 1; p.m.visible = false; pl.pw[p.k] = upDur(p.k); if (p.k === 'fly') skyCoins(); A.tone(660, .1, 'triangle', .07); A.tone(990, .15, 'triangle', .07, .08); A.tone(1320, .2, 'triangle', .06, .16); toast({ mag: T('🧲 מגנט מטבעות!', '🧲 Coin magnet!'), jet: T('🎈 בלונים – קפיצות מרחפות!', '🎈 Balloons – floaty jumps!'), x2: T('💰 מטבעות כפולים!', '💰 Double coins!'), shield: T('🫧 בועת מגן!', '🫧 Shield bubble!'), fly: T('✈️ מטוס נייר! עפים מעל הכול!', '✈️ Paper plane! Soar over everything!') }[p.k], 1200); } } }
  pl.stumbleT = Math.max(0, (pl.stumbleT || 0) - dt); if (pl.stumbleT <= 0) dog.visible = false;
  if (Math.floor(pl.dist / 500) + 1 > mult && mult < 9) { mult = Math.floor(pl.dist / 500) + 1; toast('✖️' + mult + ' ' + T('מכפיל ניקוד!', 'score multiplier!'), 1000); A.tone(880, .2, 'square', .04); }
  updHud(); const pw = Object.entries(pl.pw).filter(([k, v]) => v > 0); $('pows').innerHTML = pw.map(([k, v]) => `<span><i style="width:${v / upDur(k) * 100}%"></i>${PICON[k]}</span>`).join(''); }
function pose(t, dt) { if (!P) return; if (state === 'intro') { stepIntro(t, dt); driveMix(); blob.position.set(pg.position.x, .02, pg.position.z); return; } if (intro && state === 'run') stepChase(t, dt);
  pg.position.set(pl.x, pl.y, pl.z); pg.userData.bub.visible = pl.pw.shield > 0; const s = Math.min(1, dt * 14);
  tiltG.position.set(0, 0, 0); tiltG.rotation.x = lerp(tiltG.rotation.x, 0, s); pg.rotation.z = lerp(pg.rotation.z, (LANES[pl.lane] - pl.x) * -.1, s);
  if (state === 'title') pg.rotation.y = Math.PI + .55 + Math.sin(t * .6) * .3; else pg.rotation.y = lerp(pg.rotation.y, (LANES[pl.lane] - pl.x) * -.25, s);
  animHero(t, dt); const gnd = state === 'run' || state === 'over' ? groundAt(pl.x, pl.z, pl.lane) : 0; blob.position.set(pl.x, gnd + .03, pl.z); const hh = clamp((pl.y - gnd) * .18, 0, .85); blob.scale.setScalar(1 - hh * .6); blob.material.opacity = 1 - hh;
  if (dog.visible) { dog.position.x = lerp(dog.position.x, pl.x + (pl.lane < 2 ? 1.25 : -1.25), dt * 4); dog.position.z = lerp(dog.position.z, pl.z + (state === 'over' ? 1.2 : 3.6), dt * 2.5); dog.userData.legs.forEach(l => l.rotation.x -= dt * 25); dog.userData.v.arms[1].rotation.x = -2.8 + Math.sin(t * 14) * .35; dog.position.y = 0; } }
function skyCoins() { let ln = pl.lane; A.loopOn('jet', 'bandpass', 420, .7, .06); for (let d = 34; d < FLY_DUR * pl.sp * .95; d += 2.4) { if ((d / 2.4 | 0) % 11 === 0 && d > 20) ln = clamp(ln + (Math.random() < .5 ? -1 : 1), 0, 2); addCoinW(ln, pl.z - d, FLY_Y + .9); } }
function pause() { if (state !== 'run') return; state = 'pause'; $('pauseSheet').hidden = false; }
function showTitle() { state = 'title'; A.stopMusic(); reset(); $('title').hidden = false; $('hud').hidden = true; $('endSheet').hidden = $('pauseSheet').hidden = $('shopSheet').hidden = true; $('tBest').textContent = S.best; $('tCoins').textContent = S.coins; }
function renderShop() { $('chars').innerHTML = CHARS.map((c, i) => { const own = S.owned.includes(i); return `<button class="ci${S.char === i ? ' on' : ''}" data-c="${i}"><span class="dot" style="background:${c.col}"></span><b>${c.n}</b><small>${own ? (S.char === i ? T('נבחר ✔', 'Selected ✔') : T('בחרו', 'Select')) : '🪙 ' + c.price}</small></button>`; }).join('');
  $('ups').innerHTML = UPS.map(([k, ic, n]) => `<button class="ui" data-u="${k}"><b>${ic} ${n}</b><small>${T('רמה', 'Lvl')} ${S.up[k] || 0}/5 · ${upDur(k)}${T('ש׳', 's')}</small><span>${(S.up[k] || 0) >= 5 ? 'MAX' : '🪙 ' + upCost(k)}</span></button>`).join(''); $('shopCoins').textContent = S.coins; }
$('chars').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; const i = +b.dataset.c, c = CHARS[i]; if (!S.owned.includes(i)) { if (S.coins < c.price) { toast(T('צריך עוד מטבעות 🪙', 'Need more coins 🪙')); A.tone(200, .1, 'sine', .05); return; } S.coins -= c.price; S.owned.push(i); A.voice('yay', 1.3); } S.char = i; S.save(); renderShop(); mkHero(); $('tCoins').textContent = S.coins; };
$('ups').onclick = e => { const b = e.target.closest('[data-u]'); if (!b) return; const k = b.dataset.u; if ((S.up[k] || 0) >= 5) return; const cst = upCost(k); if (S.coins < cst) { toast(T('צריך עוד מטבעות 🪙', 'Need more coins 🪙')); return; } S.coins -= cst; S.up[k] = (S.up[k] || 0) + 1; S.save(); A.tone(880, .1, 'triangle', .06); A.tone(1320, .14, 'triangle', .06, .08); renderShop(); $('tCoins').textContent = S.coins; };
$('goBtn').onclick = () => start(); $('shopBtn').onclick = () => { A.ac(); renderShop(); $('shopSheet').hidden = false; }; $('shopClose').onclick = () => $('shopSheet').hidden = true;
$('eAgain').onclick = () => start(); $('eMenu').onclick = () => showTitle(); $('pauseBtn').onclick = () => pause(); $('pGo').onclick = () => { $('pauseSheet').hidden = true; state = 'run'; }; $('pMenu').onclick = () => showTitle();
$('pauseBtn').innerHTML = ICO.pause('#ffffff'); $('homeT').innerHTML = ICO.home('#ffffff'); soundButton('sndBtn', S, A, '#1c2240'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('goBtn').textContent = T('לרוץ! 🏃', 'RUN! 🏃'); $('shopBtn').textContent = T('🛍️ חנות ודמויות', '🛍️ Shop & characters'); $('shopT').textContent = T('חנות', 'Shop'); $('charsT').textContent = T('דמויות', 'Characters'); $('upsT').textContent = T('שדרוגים', 'Upgrades'); $('shopClose').textContent = T('סגירה', 'Close'); $('eAgain').textContent = T('שוב! 🏃', 'Again! 🏃'); $('eMenu').textContent = T('תפריט', 'Menu'); $('pT').textContent = T('הפסקה', 'Paused'); $('pGo').textContent = T('המשך ▶', 'Resume ▶'); $('pMenu').textContent = T('תפריט', 'Menu'); $('bestL').textContent = T('שיא', 'Best');
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
let last = performance.now();
function loop(now) { requestAnimationFrame(loop); const dt = Math.min(.04, (now - last) / 1000) * (window.__fast || 1); last = now; const t = now / 1000; A.tick(); step(dt); pose(t, dt);
  for (const ch of chunks) { for (const p of ch.pows) if (!p.got) p.m.position.y = 1.3 + Math.sin(t * 3) * .15; } coinTick(dt); zoneTick(dt);
  shake = Math.max(0, shake - dt * 2); const camTX = pl.x * .7; if (state === 'title') { camera.position.set(pl.x + 2.6, 2.3, pl.z + 4.2); camera.lookAt(pl.x - .3, 1.3, pl.z - 3); } else if (state === 'intro') { const m = clamp((introT - 1.8) / (IEND - 1.8), 0, 1), q = m * m * (3 - 2 * m); camera.fov = 58; camera.updateProjectionMatrix(); camera.position.set(lerp(pl.x + 2.5, pl.x * .7, q), lerp(2.0, 3.4, q), lerp(pl.z + 3.9, pl.z + 6.2, q)); camera.lookAt(lerp(-.85, 0, q), lerp(1.05, 1.2, q), lerp(pl.z + .1, pl.z - 6, q)); } else { camera.fov = lerp(camera.fov, 64 + (pl.sp - 17.5) * .55 + (pl.pw && pl.pw.jet > 0 ? 8 : 0), Math.min(1, dt * 3)); camera.updateProjectionMatrix(); camZ = pl.z + 6.2; camera.position.set(lerp(camera.position.x, camTX, Math.min(1, dt * 6)) + (Math.random() - .5) * shake, lerp(camera.position.y, 3.4 + pl.y * (pl.pw.fly > 0 ? .92 : .6), Math.min(1, dt * 5)), camZ); camera.lookAt(camTX * .6, 1.2 + pl.y * (pl.pw.fly > 0 ? .85 : .5), pl.z - 6); const fov = 64 + (pl.sp - 12) * .45; if (Math.abs(camera.fov - fov) > .2) { camera.fov = fov; camera.updateProjectionMatrix(); } }
  sun.position.set(pl.x + 6, 14, pl.z + 6); sun.target.position.set(pl.x, 0, pl.z - 4); sky.position.copy(camera.position); clouds.position.set(camera.position.x, 0, camera.position.z); clouds.children.forEach(c => { c.position.x += c.userData.v * dt; if (c.position.x > 190) c.position.x = -190; }); FX.update(dt); E.render(); }
setTimeout(() => { E.resize(); showTitle(); $('loading').hidden = true; requestAnimationFrame(loop); window.__dashOK = true; }, 30);
window.__da = { info() { renderer.info.autoReset = false; renderer.info.reset(); renderer.render(scene, camera); const r = [renderer.info.render.calls, renderer.info.render.triangles]; renderer.info.autoReset = true; return r; }, power(k) { pl.pw[k] = upDur(k); if (k === 'fly') skyCoins(); }, get chunksN() { return chunks.length; }, sim(sec, useBot = 1) { for (let t = 0; t < sec && state === 'run'; t += 1 / 60) { if (useBot) this.bot(); step(1 / 60); } return [state, Math.round(pl.dist), pl.coins, pl.why]; }, bot() { if (state !== 'run') return; for (const ch of chunks) for (const o of ch.obs) { if (o.lane !== pl.lane) continue; const dz = pl.z - o.z1; if (dz < 0 || dz > (o.k === 'train' ? (o.mover ? 9 + o.v * .6 : 9) : 4.5) * (pl.sp + (o.v || 0)) / 12) continue; if (o.k === 'train' && (o.rampZ == null || o.mover) && pl.y < TRAIN_H - .3) { const free = [0, 1, 2].filter(l => Math.abs(l - pl.lane) === 1 && !chunks.some(c2 => c2.obs.some(q => q.lane === l && q.z1 > pl.z - 30 && q.z0 < pl.z + 2 && (q.k === 'train' && (q.rampZ == null || q.mover) || q.k === 'block')))); if (free.length) act(free[0] < pl.lane ? 'l' : 'r'); } else if (o.k === 'bar') act('d'); else if (o.k !== 'train') act('u'); } }, start, get pl() { return pl; }, get state() { return state; }, act, get chunks() { return chunks; }, showTitle, get introT() { return introT; }, set introT(v) { introT = v; }, get intro() { return intro; } };
