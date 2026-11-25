/* SKYRISE – original vertical climbing game (Ya Ya Games) */
import { THREE, $, V3, C, clamp, lerp, rnd, rng, T, EN, store, engine, studioEnv, std, particles, audio, toast, ICO, hubButtons, qualityButton, isTouch, CONFETTI } from '../lib/kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { loadMix, MixRig } from '../lib/mixchar.js';
const S = store('rise-save', { mode: 'easy', best: 0, cp: -1, wins: 0, bestT: 0, tut: 0 });
const E = engine(S, { fov: 55, far: 600, bloom: [.18, .5, .92], exposure: 1.0, vignette: .22, sat: 1.06, bg: '#a8c8e8' });
const { scene, camera, renderer } = E; studioEnv(E, '#dfeeff', '#6a7080', .55);
const A = audio(S); const FX = particles(E, 1200); const GL = particles(E, 500, true);
const TAU = Math.PI * 2; const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };

/* ================= TEXTURES ================= */
function ct(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); f(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
const R0 = rng(5);
function blots(g, w, h, cols, n, s0, s1, a0 = .2, a1 = .6) { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.globalAlpha = a0 + R0() * (a1 - a0); const s = s0 + R0() * (s1 - s0); g.beginPath(); g.ellipse(R0() * w, R0() * h, s, s * (.4 + R0() * .7), R0() * 3, 0, TAU); g.fill(); } g.globalAlpha = 1; }
function streaks(g, w, h, col, n, a = .25) { g.strokeStyle = col; for (let i = 0; i < n; i++) { g.globalAlpha = a * R0(); g.lineWidth = 1 + R0() * 3; const x = R0() * w; g.beginPath(); g.moveTo(x, R0() * h * .3); g.lineTo(x + rnd(-4, 4), h * (.5 + R0() * .5)); g.stroke(); } g.globalAlpha = 1; }
const TX = {
  rust: ct(256, 256, (g, w, h) => { g.fillStyle = '#7a4630'; g.fillRect(0, 0, w, h); blots(g, w, h, ['#a85a2a', '#5a3020', '#c87a3a', '#6a6058', '#3a2418'], 260, 3, 22); streaks(g, w, h, '#3a2010', 40); }),
  steel: ct(256, 256, (g, w, h) => { g.fillStyle = '#8c949c'; g.fillRect(0, 0, w, h); blots(g, w, h, ['#a4acb4', '#727a82', '#9a6040', '#b0b8c0'], 140, 2, 14, .1, .4); streaks(g, w, h, '#4a5058', 30, .2); }),
  paint: ct(256, 256, (g, w, h) => { g.fillStyle = '#e0b020'; g.fillRect(0, 0, w, h); blots(g, w, h, ['#f0c030', '#c89818', '#8a4a20', '#5a4a3a'], 120, 2, 10, .1, .5); streaks(g, w, h, '#6a4010', 24, .25); for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(80,60,40,.5)'; g.fillRect(R0() * w, R0() * h, 2 + R0() * 6, 1 + R0() * 2); } }),
  concrete: ct(256, 256, (g, w, h) => { g.fillStyle = '#a09a92'; g.fillRect(0, 0, w, h); blots(g, w, h, ['#b4aea6', '#8a847c', '#c0bab2', '#6a665e'], 300, 1, 10, .12, .45); g.strokeStyle = 'rgba(40,36,32,.5)'; g.lineWidth = 1.2; for (let i = 0; i < 6; i++) { let x = R0() * w, y = R0() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rnd(-14, 14); y += rnd(4, 16); g.lineTo(x, y); } g.stroke(); } streaks(g, w, h, '#4a463e', 20, .2); }),
  wood: ct(256, 256, (g, w, h) => { const pl = 4; for (let i = 0; i < pl; i++) { g.fillStyle = ['#9a6a3e', '#8a5c34', '#a8764a', '#7e5430'][i]; g.fillRect(0, i * h / pl, w, h / pl); g.strokeStyle = 'rgba(50,30,14,.35)'; for (let k = 0; k < 14; k++) { g.lineWidth = .8 + R0(); g.beginPath(); const y = i * h / pl + R0() * h / pl; g.moveTo(0, y); g.bezierCurveTo(w * .3, y + rnd(-4, 4), w * .6, y + rnd(-4, 4), w, y + rnd(-3, 3)); g.stroke(); } g.fillStyle = 'rgba(30,16,6,.7)'; g.fillRect(0, (i + 1) * h / pl - 3, w, 3); g.fillStyle = '#3a3a3a'; for (const x of [10, w - 10]) { g.beginPath(); g.arc(x, i * h / pl + h / pl / 2, 3, 0, TAU); g.fill(); } } blots(g, w, h, ['#5a4028', '#c8a070'], 40, 2, 8, .1, .3); }),
  cont: ct(256, 256, (g, w, h) => { g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, 'rgba(0,0,0,.28)'); gr.addColorStop(.4, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(0,0,0,.12)'); g.fillStyle = gr; g.fillRect(x, 0, 16, h); } blots(g, w, h, ['#8a5030', '#5a3a28'], 70, 2, 10, .15, .5); streaks(g, w, h, '#6a3a20', 30, .3); g.fillStyle = 'rgba(30,30,30,.5)'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6); }),
  asphalt: ct(256, 256, (g, w, h) => { g.fillStyle = '#4a4a4c'; g.fillRect(0, 0, w, h); blots(g, w, h, ['#5a5a5c', '#3a3a3c', '#6a665e', '#2e2e30'], 500, 1, 6, .2, .6); g.strokeStyle = 'rgba(20,20,20,.6)'; for (let i = 0; i < 5; i++) { let x = R0() * w, y = R0() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += rnd(-10, 10); y += rnd(-10, 10); g.lineTo(x, y); } g.stroke(); } }),
  tin: ct(256, 256, (g, w, h) => { g.fillStyle = '#8a8c90'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 10) { g.fillStyle = x % 20 ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.2)'; g.fillRect(x, 0, 5, h); } blots(g, w, h, ['#9a5a2a', '#6a3a1a', '#b07040'], 120, 3, 18, .2, .6); }),
  rock: ct(256, 256, (g, w, h) => { g.fillStyle = '#7a7268'; g.fillRect(0, 0, w, h); blots(g, w, h, ['#8a8278', '#5a544c', '#9a9288', '#4a463e'], 300, 2, 16, .2, .6); }),
  grass: ct(256, 256, (g, w, h) => { g.fillStyle = '#5a8a3a'; g.fillRect(0, 0, w, h); blots(g, w, h, ['#6a9a44', '#4a7a2e', '#7aa850', '#3e6a26'], 300, 2, 12, .2, .6); g.lineWidth = 1.4; for (let i = 0; i < 400; i++) { const x = R0() * w, y = R0() * h; g.strokeStyle = ['#8ab860', '#3a6222'][i % 2]; g.globalAlpha = .5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd(-2, 2), y - 4 - R0() * 4); g.stroke(); } g.globalAlpha = 1; }),
  facade: ct(256, 512, (g, w, h) => { g.fillStyle = '#c8c0b4'; g.fillRect(0, 0, w, h); blots(g, w, h, ['#b8b0a4', '#d4ccc0', '#9a9488'], 120, 4, 30, .1, .3); for (let y = 10; y < h - 10; y += 32) for (let x = 12; x < w - 12; x += 30) { const lit = R0() < .12; g.fillStyle = lit ? '#ffe2a0' : ['#3a4a5e', '#2c3a4c', '#4a5a6e'][(R0() * 3) | 0]; g.fillRect(x, y, 18, 20); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(x, y, 18, 4); if (R0() < .2) { g.fillStyle = '#7a7268'; g.fillRect(x - 2, y + 20, 22, 4); } } streaks(g, w, h, '#5a5248', 50, .2); }),
  cloud: ct(256, 128, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 26; i++) { const x = w * (.15 + R0() * .7), y = h * (.4 + R0() * .35), r = 18 + R0() * 34; const gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } }),
  blob: ct(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }),
  beam: ct(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(120,255,200,0)'); gr.addColorStop(.5, 'rgba(120,255,200,.7)'); gr.addColorStop(1, 'rgba(120,255,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }),
  denim: ct(128, 128, (g, w, h) => { g.fillStyle = '#3a5a8a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = R0() < .5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.1)'; g.fillRect(R0() * w, R0() * h, 2, 1); } }),
  fabric: ct(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { g.fillStyle = R0() < .5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.1)'; g.fillRect(R0() * w, R0() * h, 1 + R0() * 2, 1); } }) };
TX.blob.wrapS = TX.blob.wrapT = THREE.ClampToEdgeWrapping; TX.cloud.wrapS = TX.cloud.wrapT = THREE.ClampToEdgeWrapping;
const MAT = { rust: std('#ffffff', { map: TX.rust, roughness: .85, metalness: .35 }), steel: std('#ffffff', { map: TX.steel, roughness: .45, metalness: .7 }), paint: std('#ffffff', { map: TX.paint, roughness: .6, metalness: .3 }), concrete: std('#ffffff', { map: TX.concrete, roughness: .92 }), wood: std('#ffffff', { map: TX.wood, roughness: .85 }),
  contR: std('#c8442e', { map: TX.cont, roughness: .6, metalness: .35 }), contB: std('#2e66a8', { map: TX.cont, roughness: .6, metalness: .35 }), contG: std('#3a8a5a', { map: TX.cont, roughness: .6, metalness: .35 }), contO: std('#e0862a', { map: TX.cont, roughness: .6, metalness: .35 }),
  tin: std('#ffffff', { map: TX.tin, roughness: .6, metalness: .5 }), rock: std('#ffffff', { map: TX.rock, roughness: .95 }), grass: std('#ffffff', { map: TX.grass, roughness: .95 }), white: std('#f4f4f0', { roughness: .5 }), cloudP: std('#ffffff', { roughness: 1, emissive: C('#dfe8f4'), emissiveIntensity: .25 }), gold: std('#ffcf4a', { metalness: 1, roughness: .2 }) };
function uvScale(g, f) { const uv = g.attributes.uv, n = uv.count; for (let i = 0; i < n; i++) { const [a, b] = f(i); uv.setXY(i, uv.getX(i) * a, uv.getY(i) * b); } return g; }
function boxGeo(sx, sy, sz, k = .5) { const g = new THREE.BoxGeometry(sx, sy, sz); const F = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]]; uvScale(g, i => F[(i / 4) | 0].map(v => v * k)); return g; }
function cylGeo(r, len, seg = 20, k = .5) { const g = new THREE.CylinderGeometry(r, r, len, seg, 1, false); uvScale(g, () => [TAU * r * k, len * k]); return g; }

/* ================= WORLD ================= */
const COL = []; const BUCK = {}; const DUM = new THREE.Object3D();
function put(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) { DUM.position.set(x, y, z); DUM.rotation.set(rx, ry, rz); DUM.updateMatrix(); geo.applyMatrix4(DUM.matrix); for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k); geo.clearGroups(); (BUCK[mat] = BUCK[mat] || []).push(geo.index ? geo.toNonIndexed() : geo); }
function box(x, y, z, sx, sy, sz, ry, mat, solid = true, extra = {}) { put(boxGeo(sx, sy, sz), mat, x, y, z, 0, ry); if (solid) COL.push({ t: 'b', x, y, z, hx: sx / 2, hy: sy / 2, hz: sz / 2, ry, c: Math.cos(ry), s: Math.sin(ry), r: Math.hypot(sx, sz) / 2 + 1, ...extra }); }
function pipe(x, y, z, r, len, ry, mat, solid = true) { put(cylGeo(r, len), mat, x, y, z, 0, ry, Math.PI / 2); if (solid) COL.push({ t: 'c', x, y, z, rr: r, hl: len / 2, ry, c: Math.cos(ry), s: Math.sin(ry), r: len / 2 + 1 }); for (const e of [-1, 1]) { const fl = cylGeo(r * 1.25, .12, 20); put(fl, mat, x + Math.cos(ry) * e * (len / 2 - .06), y, z - Math.sin(ry) * e * (len / 2 - .06), 0, ry, Math.PI / 2); } }
function pole(x, y0, y1, z, r, mat) { if (y1 - y0 < .3) return; put(cylGeo(r, y1 - y0, 10), mat, x, (y0 + y1) / 2, z); }
const dirOf = h => V3(Math.sin(h), 0, -Math.cos(h));
const CPS = []; let SUMMIT = null, TOPY = 0; const R = rng(2024);
function rr(a, b) { return a + R() * (b - a); }
const ROUTE = []; // course path (each obstacle in order) – used to aim the camera at the next challenge
function genCourse() { let p = V3(0, 0, -2), h = 0, n = 0;
  // start stairs of crates
  box(0, .45, -3, 1.6, .9, 1.6, .2, 'wood'); box(.8, 1.0, -5.2, 1.8, 2, 1.8, -.3, 'contO'); p.set(.8, 2, -5.2); n = 2;
  const sectionOf = y => y < 18 ? 0 : y < 50 ? 1 : y < 85 ? 2 : 3;
  let sinceCp = 0;
  while (p.y < 118 && n < 400) { n++; sinceCp++; ROUTE.push(p.clone());
    const sec = sectionOf(p.y); h += rr(-.75, .75); const d0 = Math.hypot(p.x, p.z); if (d0 > 16) { const toC = Math.atan2(-p.x, p.z) ; let dd = toC - h; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); h += dd * .6; }
    const dir = dirOf(h), side = V3(-dir.z, 0, dir.x);
    if (sinceCp >= 8) { sinceCp = 0; const g = rr(1.3, 2), top = p.y + rr(.2, .8); const c = p.clone().addScaledVector(dir, g + 1.7); c.y = top; const mat = ['concrete', 'steel', 'concrete', 'rock'][sec]; box(c.x, top - .3, c.z, 3.4, .6, 3.4, -h, mat); if (sec === 3) box(c.x, top - 1.1, c.z, 2.6, 1, 2.6, -h + .4, 'rock', false); CPS.push(V3(c.x, top, c.z)); p.copy(c).addScaledVector(dir, 1.4); supports(c, top - .6, sec); continue; }
    const kinds = [['crate', 'cont', 'plank', 'cont', 'ac', 'climb', 'pipe'], ['pipe', 'pipe', 'pipe', 'steelbox', 'climb', 'beam', 'pipe'], ['beam', 'beam', 'slab', 'cont', 'climb', 'pipe', 'plank'], ['rock', 'rock', 'plank', 'cloud', 'climb', 'rock', 'cont']][sec];
    const k = kinds[(R() * kinds.length) | 0];
    if (k === 'pipe' || k === 'beam' || k === 'plank') { const dy = rr(-.2, 1.0), gap = rr(1.1, 2.15 - dy * .5), L = rr(4.5, 9); const top = p.y + dy; const st = p.clone().addScaledVector(dir, gap); const c = st.clone().addScaledVector(dir, L / 2); const ry = Math.PI / 2 - h;
      if (k === 'pipe') { const r = rr(.42, .6); pipe(c.x, top - r, c.z, r, L, ry, R() < .6 ? 'rust' : 'steel'); }
      else if (k === 'beam') { const w = rr(.6, .85); box(c.x, top - .2, c.z, L, .4, w, ry, 'paint'); box(c.x, top - .55, c.z, L, .3, .12, ry, 'paint', false); box(c.x, top - .78, c.z, L, .1, w, ry, 'paint', false); }
      else { const w = rr(.9, 1.25); box(c.x, top - .08, c.z, L, .16, w, ry, 'wood'); }
      supports(c, top - .6, sec, L, h); p.copy(st).addScaledVector(dir, L); p.y = top; continue; }
    if (k === 'climb') { const top = p.y + rr(1.6, 2.0), gap = rr(.4, .9), sz = rr(1.6, 2.6), hh = rr(2.2, 4); const c = p.clone().addScaledVector(dir, gap + sz / 2); const mat = ['contB', 'steel', 'concrete', 'rock'][sec]; box(c.x, top - hh / 2, c.z, sz, hh, sz, -h, mat, true, { grab: 1 }); p.copy(c).addScaledVector(dir, sz / 2 - .2); p.y = top; continue; }
    // block types
    const dy = rr(-.1, .95), gap = rr(1.0, 2.05 - dy * .5); let sx = 2, sy = 1, sz = 2, mat = 'wood', ry = -h;
    if (k === 'crate') { sx = sz = rr(1.1, 1.6); sy = sx; mat = 'wood'; }
    if (k === 'cont') { sx = 2.4; sy = 2.6; sz = rr(5, 6.5); mat = ['contR', 'contB', 'contG', 'contO'][(R() * 4) | 0]; }
    if (k === 'ac') { sx = 1.3; sy = 1; sz = 1.1; mat = 'steel'; }
    if (k === 'steelbox') { sx = sz = rr(1.4, 2.2); sy = rr(1, 2); mat = 'steel'; }
    if (k === 'slab') { sx = rr(2.5, 4); sz = rr(2, 3.5); sy = .4; mat = 'concrete'; }
    if (k === 'rock') { sx = rr(2, 3.4); sz = rr(2, 3.4); sy = rr(1.2, 2.4); mat = 'rock'; }
    if (k === 'cloud') { sx = rr(2.5, 4); sz = rr(2.5, 4); sy = .8; mat = 'cloudP'; }
    const top = p.y + dy; const along = (k === 'cont' ? sz : Math.max(sx, sz)); const c = p.clone().addScaledVector(dir, gap + along / 2);
    box(c.x, top - sy / 2, c.z, sx, sy, sz, ry, mat, true, { grab: 1 });
    if (k === 'rock') { box(c.x, top + .02, c.z, sx * .98, .06, sz * .98, ry, 'grass', false); box(c.x, top - sy - .5, c.z, sx * .7, 1, sz * .7, ry + .5, 'rock', false); }
    if (k === 'cont') { for (const e of [-1, 1]) put(cylGeo(.04, 8, 6), 'steel', c.x + side.x * e * .9, top + 4, c.z + side.z * e * .9); }
    if (k === 'ac') { put(cylGeo(.35, .06, 20), 'steel', c.x, top + .02, c.z); }
    if (k !== 'cont' && k !== 'cloud') supports(c, top - sy, sec);
    p.copy(c).addScaledVector(dir, along / 2 - .3); p.y = top; }
  // summit
  ROUTE.push(p.clone()); const dir = dirOf(h); const c = p.clone().addScaledVector(dir, 4); ROUTE.push(c.clone().setY(p.y + .6)); c.y = p.y + .6; box(c.x, c.y - 1, c.z, 7, 2, 7, 0, 'rock'); box(c.x, c.y + .02, c.z, 6.9, .06, 6.9, 0, 'grass', false); box(c.x, c.y - 3, c.z, 5, 2.5, 5, .5, 'rock', false); box(c.x, c.y - 5, c.z, 3, 2, 3, .9, 'rock', false); SUMMIT = c; TOPY = c.y; }
function supports(c, yTop, sec, L = 0, h = 0) { if (sec >= 2 || yTop < .5 || yTop > 32 || R() > .35) return; const mat = sec === 1 ? 'rust' : sec === 2 ? 'paint' : 'wood'; if (L > 0) { const d = dirOf(h); for (const e of [-.35, .35]) { const q = c.clone().addScaledVector(d, e * L); pole(q.x, 0, yTop, q.z, sec === 1 ? .14 : .1, mat); } } else pole(c.x, 0, yTop, c.z, .16, mat); }
function decor() { // ground shacks, clutter & city
  box(0, -.25, 0, 400, .5, 400, 0, 'asphalt', false);
  for (let i = 0; i < 34; i++) { const a = R() * TAU, d = rr(9, 28), x = Math.cos(a) * d, z = Math.sin(a) * d; const sx = rr(2.5, 5), sz = rr(2.5, 5), sy = rr(2.2, 4.5); if (COL.some(c => Math.hypot(c.x - x, c.z - z) < c.r + 2.5 && c.y < 8)) continue; box(x, sy / 2, z, sx, sy, sz, R() * 3, R() < .5 ? 'concrete' : 'tin'); box(x, sy + .06, z, sx + .5, .12, sz + .5, R() * 3, 'tin', false); }
  for (let i = 0; i < 50; i++) { const a = R() * TAU, d = rr(4, 30), x = Math.cos(a) * d, z = Math.sin(a) * d; const y = rr(4, 70); if (COL.some(c => Math.abs(c.x - x) < c.r + 3 && Math.abs(c.z - z) < c.r + 3 && Math.abs(c.y - y) < 6)) continue; if (R() < .5) put(cylGeo(rr(.2, .5), rr(4, 12), 16), R() < .5 ? 'rust' : 'steel', x, y, z, 0, R() * 3, Math.PI / 2); else put(boxGeo(rr(1, 3), rr(1, 3), rr(1, 3)), ['contR', 'contB', 'wood', 'steel'][(R() * 4) | 0], x, y, z, 0, R() * 3); }
  // vertical pipe forest
  for (let i = 0; i < 7; i++) { const a = R() * TAU, d = rr(26, 40); pole(Math.cos(a) * d, 0, rr(20, 70), Math.sin(a) * d, rr(.3, .7), R() < .5 ? 'rust' : 'steel'); } }
let CITYM = null, BLINK = null; const birds = [], helis = [];
function buildLife() { // flocks of birds and helicopters circling the tower
  const wingG = new THREE.BufferGeometry(); wingG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, .25, -.9, 0, -.1, 0, 0, -.25, 0, 0, .25, .9, 0, -.1, 0, 0, -.25], 3)); wingG.computeVertexNormals(); const bm = new THREE.MeshBasicMaterial({ color: '#2a2a34', side: THREE.DoubleSide });
  for (const [h, rad, n] of [[22, 30, 7], [52, 38, 9], [88, 30, 6], [110, 44, 8]]) { const fl = { h, rad, a: Math.random() * TAU, sp: .12 + Math.random() * .08, list: [] }; for (let i = 0; i < n; i++) { const b = new THREE.Group(); const L = new THREE.Mesh(wingG, bm); b.add(L); b.userData = { off: V3(rnd(-4, 4), rnd(-1.5, 1.5), rnd(-4, 4)), ph: Math.random() * 6 }; b.scale.setScalar(.9 + Math.random() * .4); scene.add(b); fl.list.push(b); } birds.push(fl); }
  const bodyM = std('#e8eef4', { roughness: .4, metalness: .3 }), redM = std('#d82a2a', { roughness: .4 }), glass = std('#2a4a6a', { roughness: .1, metalness: .5 }), dk = std('#2a2a30', { roughness: .6 });
  for (const [h, rad, dir] of [[40, 48, 1], [78, 56, -1]]) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 2.2, 8, 14), bodyM); b.rotation.x = Math.PI / 2; g.add(b); const st = new THREE.Mesh(new THREE.BoxGeometry(.24, .5, 2.4), redM); st.position.set(0, 0, 0); st.scale.set(9.4, .3, 1); g.add(st); const cp = new THREE.Mesh(new THREE.SphereGeometry(1.0, 14, 10, 0, TAU, 0, Math.PI / 2), glass); cp.rotation.x = Math.PI / 2; cp.position.z = 1.5; g.add(cp);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(.18, .35, 4.2, 8), bodyM); tail.rotation.x = Math.PI / 2; tail.position.set(0, .3, -3.6); g.add(tail); const fin = new THREE.Mesh(new THREE.BoxGeometry(.1, 1.2, .8), redM); fin.position.set(0, .8, -5.5); g.add(fin);
    for (const sd of [-1, 1]) { const sk = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, 3.6), dk); sk.position.set(sd * .9, -1.5, 0); g.add(sk); }
    const rot = new THREE.Group(); rot.position.y = 1.35; for (let i = 0; i < 4; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(.3, .05, 7), dk); bl.rotation.y = i * Math.PI / 4 * 2 / 2 + i * Math.PI / 4; rot.add(bl); } g.add(rot); const tr = new THREE.Group(); tr.position.set(.3, .8, -5.6); for (let i = 0; i < 2; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(.05, 1.6, .15), dk); bl.rotation.x = i * Math.PI / 2; tr.add(bl); } g.add(tr);
    const bk = new THREE.Mesh(new THREE.SphereGeometry(.18, 6, 4), new THREE.MeshBasicMaterial({ color: '#ff3a2a' })); bk.position.set(0, -.9, -1); g.add(bk); g.traverse(m => { if (m.isMesh) m.castShadow = true; }); scene.add(g); helis.push({ g, rot, tr, bk, h, rad, dir, a: Math.random() * TAU }); } }
function life(dt, t) { for (const fl of birds) { fl.a += dt * fl.sp; const cx = Math.cos(fl.a) * fl.rad, cz = Math.sin(fl.a) * fl.rad; fl.list.forEach((b, i) => { const o = b.userData.off; b.position.set(cx + o.x, fl.h + o.y + Math.sin(t * 1.3 + i) * .6, cz + o.z); b.rotation.set(0, -fl.a, 0); const fp = Math.sin(t * 9 + b.userData.ph); b.children[0].scale.y = 1; b.children[0].rotation.z = 0; b.children[0].geometry; b.scale.y = 1; b.children[0].morph = 0; b.children[0].rotation.x = 0; b.children[0].scale.x = .75 + Math.abs(fp) * .25; b.children[0].position.y = fp * .15; }); }
  for (const h of helis) { h.a += dt * .09 * h.dir; const x = Math.cos(h.a) * h.rad, z = Math.sin(h.a) * h.rad; h.g.position.set(x, h.h + Math.sin(t * .7) * 1.5, z); h.g.rotation.set(.12, -h.a + (h.dir > 0 ? Math.PI : 0), Math.sin(t * .5) * .05); h.rot.rotation.y += dt * 30; h.tr.rotation.x += dt * 40; h.bk.visible = Math.sin(t * 6) > .3; }
  if (BLINK) BLINK.color.setScalar(0).setRGB(Math.sin(t * 3) > 0 ? 1.4 : .25, .1, .05); }
function buildCity() { const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0); uvScale(geo, i => { const f = (i / 4) | 0; return f === 2 || f === 3 ? [0, 0] : [1, 1]; }); const N = 420; const m = new THREE.MeshStandardMaterial({ map: TX.facade, roughness: .85 }); const im = new THREE.InstancedMesh(geo, m, N); const RC = rng(77);
  for (let i = 0; i < N; i++) { const a = RC() * TAU, d = 45 + RC() * 170; const w = 8 + RC() * 16, dd = 8 + RC() * 16, hh = 12 + RC() * (30 + d * .45); DUM.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); DUM.rotation.set(0, RC() * 3, 0); DUM.scale.set(w, hh, dd); DUM.updateMatrix(); im.setMatrixAt(i, DUM.matrix); im.setColorAt(i, C(['#ffffff', '#e8dccc', '#d8e0e8', '#f0e0d0', '#c8c8c8'][(RC() * 5) | 0])); }
  im.receiveShadow = false; scene.add(im); CITYM = m; m.emissive = C('#ffb860'); m.emissiveMap = TX.facade; m.emissiveIntensity = 0;
  { const RC2 = rng(77); const tops = []; for (let i = 0; i < N; i++) { const a = RC2() * TAU, d = 45 + RC2() * 170; const w = 8 + RC2() * 16, dd = 8 + RC2() * 16, hh = 12 + RC2() * (30 + d * .45); const ry = RC2() * 3; RC2(); tops.push([Math.cos(a) * d, hh, Math.sin(a) * d, w, dd, ry]); }
    const boxG = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0), tankG = new THREE.CylinderGeometry(.5, .5, 1, 10).translate(0, .5, 0), antG = new THREE.CylinderGeometry(.08, .12, 1, 5).translate(0, .5, 0);
    const bx = new THREE.InstancedMesh(boxG, std('#9aa0a8', { roughness: .8 }), N), tk = new THREE.InstancedMesh(tankG, std('#8a6a4a', { roughness: .85 }), N), an = new THREE.InstancedMesh(antG, std('#5a5a60', { metalness: .6, roughness: .4 }), N); const lights = [];
    tops.forEach(([x, h, z, w, dd, ry], i) => { const r3 = (i * 9301 + 49297) % 233280 / 233280; DUM.rotation.set(0, ry, 0); DUM.position.set(x + Math.cos(ry) * w * .2, h, z - Math.sin(ry) * w * .2); DUM.scale.set(w * .3, 1.6 + r3 * 2, dd * .3); DUM.updateMatrix(); bx.setMatrixAt(i, DUM.matrix);
      DUM.position.set(x - Math.cos(ry) * w * .22, h, z + Math.sin(ry) * w * .22); DUM.scale.set(2.4, 2.6 + r3 * 1.5, 2.4); DUM.updateMatrix(); tk.setMatrixAt(i, DUM.matrix); DUM.position.set(x, h, z); DUM.scale.set(1, 4 + r3 * 10, 1); DUM.updateMatrix(); an.setMatrixAt(i, DUM.matrix); if (i % 3 === 0) lights.push([x, h + 4 + r3 * 10 + .2, z]); });
    scene.add(bx, tk, an); const lm = new THREE.MeshBasicMaterial({ color: '#ff2a1a' }); const li = new THREE.InstancedMesh(new THREE.SphereGeometry(.45, 6, 4), lm, lights.length); lights.forEach((q, i) => { DUM.position.set(...q); DUM.scale.setScalar(1); DUM.rotation.set(0, 0, 0); DUM.updateMatrix(); li.setMatrixAt(i, DUM.matrix); }); scene.add(li); BLINK = lm; }
  // clouds
  for (let i = 0; i < 46; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.cloud, transparent: true, depthWrite: false, opacity: .9, fog: true })); const a = R() * TAU, d = rr(75, 230); sp.position.set(Math.cos(a) * d, rr(40, 160), Math.sin(a) * d); const s = rr(30, 70); sp.scale.set(s, s * .5, 1); scene.add(sp); } }
genCourse(); decor(); buildCity(); buildLife();
for (const k in BUCK) { const g = mergeGeometries(BUCK[k], false); const mat = k === 'asphalt' ? std('#ffffff', { map: TX.asphalt, roughness: .95 }) : MAT[k]; const m = new THREE.Mesh(g, mat); m.castShadow = k !== 'asphalt'; m.receiveShadow = true; scene.add(m); }
// checkpoints visuals
const CPV = CPS.map(p => { const g = new THREE.Group(); g.position.copy(p); const ring = new THREE.Mesh(new THREE.TorusGeometry(.9, .06, 10, 40).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffb21a' })); ring.position.y = .05; g.add(ring); const bm = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 9, 20, 1, true), new THREE.MeshBasicMaterial({ map: TX.beam, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, color: '#ffb21a' })); bm.position.y = 4.5; g.add(bm);
  const lc = document.createElement('canvas'); lc.width = lc.height = 256; const lx = lc.getContext('2d'); const gr = lx.createRadialGradient(128, 128, 20, 128, 128, 124); gr.addColorStop(0, 'rgba(20,24,40,.78)'); gr.addColorStop(.85, 'rgba(20,24,40,.6)'); gr.addColorStop(1, 'rgba(20,24,40,0)'); lx.fillStyle = gr; lx.beginPath(); lx.arc(128, 128, 124, 0, Math.PI * 2); lx.fill();
  lx.fillStyle = '#ffffff'; lx.textAlign = 'center'; lx.textBaseline = 'middle'; lx.font = '900 92px Arial'; lx.direction = 'ltr'; lx.fillText(Math.round(p.y) + (EN ? 'm' : ''), 128, 112); lx.font = '800 30px Arial'; lx.fillStyle = '#ffd27a'; lx.fillText(T('מטר · נקודת שמירה', 'CHECKPOINT'), 128, 186);
  const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace; const lb = new THREE.Mesh(new THREE.CircleGeometry(.86, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: lt, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); lb.position.y = .035; g.add(lb);
  scene.add(g); return { g, ring, bm, lb }; });
// summit trophy
const trophy = new THREE.Group(); { const prof = []; for (let i = 0; i <= 16; i++) { const t = i / 16; prof.push(new THREE.Vector2(t < .15 ? .35 : t < .45 ? .08 + (.45 - t) * .2 : .08 + Math.sin((t - .45) / .55 * Math.PI * .5) * .38, t * 1.3)); } const cup = new THREE.Mesh(new THREE.LatheGeometry(prof, 36), MAT.gold); cup.castShadow = true; trophy.add(cup); for (const s of [-1, 1]) { const hd = new THREE.Mesh(new THREE.TorusGeometry(.18, .04, 8, 20, Math.PI), MAT.gold); hd.position.set(s * .44, 1.0, 0); hd.rotation.z = s * -Math.PI / 2; trophy.add(hd); } trophy.position.copy(SUMMIT); trophy.scale.setScalar(1.4); scene.add(trophy); }
const tLight = new THREE.PointLight('#ffd27a', 6, 10, 2); tLight.position.copy(SUMMIT).add(V3(0, 2.5, 0)); scene.add(tLight);

/* ================= SKY & LIGHT ================= */
const skyU = { top: { value: C('#3a78c8') }, hor: { value: C('#cfe0f0') }, sunD: { value: V3(.45, .5, -.75).normalize() } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU, vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }', fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 sunD; varying vec3 vP; void main(){ float h = clamp(vP.y*1.3+.05,0.,1.); vec3 c = mix(hor, top, pow(h,.6)); c = mix(c, vec3(.75,.72,.68), clamp(-vP.y*3.,0.,1.)); float s = max(dot(vP, sunD),0.); c += vec3(1.,.9,.7)*(pow(s,800.)*3. + pow(s,12.)*.25); gl_FragColor = vec4(c,1.); }' }));
sky.renderOrder = -1; scene.add(sky); scene.fog = new THREE.Fog('#c4d4e4', 70, 430);
const hemi = new THREE.HemisphereLight('#dde8f8', '#6a6258', 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0dc', 2.8); sun.castShadow = E.q !== 'low'; const SM = E.q === 'ultra' ? 2048 : 1024; sun.shadow.mapSize.set(SM, SM); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 }); sun.shadow.bias = -.0005; sun.shadow.normalBias = .04; scene.add(sun, sun.target);

/* ================= HUMAN ================= */
function headGeo() { const g = new THREE.SphereGeometry(.1, 44, 34); const p = g.attributes.position; const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i) * 1.17, z = p.getZ(i); const ny = y / .117; const k = ss(.15, -1, ny); x *= (1 - .36 * k) * .9; z *= 1 - .1 * k; if (z > 0) { z += .014 * k * (z / .1); z += .006 * Math.exp(-(((ny - .3) / .12) ** 2)) * (z / .1); const ex = Math.abs(x) - .034, ey = ny - .1; z -= .006 * Math.exp(-(ex * ex) / .0004 - (ey * ey) / .02) * (z / .1); } else z *= 1.07; if (ny > .55) x *= 1 - .06 * (ny - .55); p.setXYZ(i, x, y, z); } g.computeVertexNormals(); return g; }
function makeHuman() {
  const skin = new THREE.MeshPhysicalMaterial({ color: '#d39a74', roughness: .5, sheen: .5, sheenColor: C('#ffb59a'), sheenRoughness: .6, clearcoat: .05 });
  const shirt = new THREE.MeshPhysicalMaterial({ color: '#f0c431', map: TX.fabric, roughness: .85, sheen: 1, sheenColor: C('#fff3c0'), sheenRoughness: .8 });
  const jeans = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: TX.denim, roughness: .9, sheen: .6, sheenColor: C('#9ab8e8') });
  const shoe = std('#f2f2ee', { roughness: .55 }), sole = std('#2a2a2c', { roughness: .8 }), hairM = std('#2e1e12', { roughness: .85 }), capM = new THREE.MeshPhysicalMaterial({ color: '#2856c8', roughness: .75, sheen: .8, sheenColor: C('#8ab0ff') }), bagM = new THREE.MeshPhysicalMaterial({ color: '#2f6a4a', roughness: .8, sheen: .6, sheenColor: C('#8ad8aa') }), dark = std('#1a1410', { roughness: .4 }), white = std('#f8f6f2', { roughness: .2 });
  const J = {}, root = new THREE.Group();
  const grp = (n, par, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); par.add(g); J[n] = g; g.userData.base = g.position.clone(); return g; };
  const ms = (geo, m, par, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.x = rx; o.castShadow = true; par.add(o); return o; };
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 16);
  const hips = grp('hips', root, 0, .96, 0); ms(cap(.15, .08), jeans, hips, 0, -.01, 0, 1.12, .95, .78); ms(new THREE.TorusGeometry(.148, .018, 8, 28).rotateX(Math.PI / 2), std('#3a2a1e', { roughness: .5 }), hips, 0, .06, 0, 1.1, 1, .8);
  const spine = grp('spine', hips, 0, .09, 0); ms(cap(.142, .1), shirt, spine, 0, .06, 0, 1, 1, .74);
  const chest = grp('chest', spine, 0, .18, 0); { const pr = [[.13, -.08], [.152, .02], [.172, .12], [.188, .2], [.186, .255], [.155, .3], [.07, .33], [.04, .335]].map(([r, y]) => new THREE.Vector2(r, y)); ms(new THREE.LatheGeometry(pr, 28), shirt, chest, 0, 0, 0, 1, 1, .68); }
  const bag = ms(new RoundedBoxGeometry(.3, .38, .15, 3, .05), bagM, chest, 0, .12, -.17); for (const s of [-1, 1]) { const st = ms(new RoundedBoxGeometry(.03, .3, .012, 2, .005), std('#1e3a2a', { roughness: .7 }), chest, s * .095, .15, .118, 1, 1, 1, -.18); } ms(new RoundedBoxGeometry(.2, .12, .05, 2, .02), bagM, chest, 0, .02, -.26);
  const neck = grp('neck', chest, 0, .33, 0); ms(new THREE.CylinderGeometry(.05, .056, .11, 12), skin, neck, 0, .04, 0);
  const head = grp('head', neck, 0, .1, 0);
  ms(headGeo(), skin, head, 0, .09, 0); ms(new THREE.SphereGeometry(.02, 14, 10), skin, head, 0, .075, .1, .75, 1.15, 1.1); ms(new THREE.SphereGeometry(.013, 10, 8), skin, head, 0, .062, .108, 1.3, .8, .9);
  for (const s of [-1, 1]) { ms(new THREE.SphereGeometry(.028, 12, 10), skin, head, s * .088, .085, -.005, .45, 1, .75); ms(new THREE.SphereGeometry(.0145, 16, 12), white, head, s * .034, .1, .083); ms(new THREE.SphereGeometry(.0082, 12, 10), std('#5a3a20', { roughness: .2 }), head, s * .034, .1, .094); ms(new THREE.SphereGeometry(.0042, 8, 6), dark, head, s * .034, .1, .1); ms(new THREE.SphereGeometry(.0018, 6, 4), std('#ffffff', { emissive: C('#ffffff'), emissiveIntensity: .6 }), head, s * .031, .103, .102); const br = ms(new RoundedBoxGeometry(.036, .007, .01, 2, .003), hairM, head, s * .035, .121, .095); br.rotation.z = s * -.12; }
  ms(new RoundedBoxGeometry(.034, .007, .008, 2, .003), std('#b0605a', { roughness: .4 }), head, 0, .036, .1);
  ms(new THREE.SphereGeometry(.111, 24, 16, Math.PI / 2 + .95, TAU - 1.9, 0, Math.PI * .6), hairM, head, 0, .095, -.006, .96, 1.08, 1.06);
  ms(new THREE.SphereGeometry(.116, 24, 14, 0, TAU, 0, Math.PI * .45), capM, head, 0, .108, -.004, .97, 1.02, 1.06); const vis = ms(new THREE.CylinderGeometry(.09, .09, .012, 20, 1, false, -Math.PI * .5, Math.PI), capM, head, 0, .13, .085); vis.scale.set(1, 1, 1.1); vis.rotation.x = .12;
  for (const s of [-1, 1]) { const k = s < 0 ? 'L' : 'R';
    const sh = grp('sh' + k, chest, s * .185, .265, 0); ms(new THREE.SphereGeometry(.065, 14, 10), shirt, sh, 0, 0, 0); ms(new THREE.CylinderGeometry(.064, .057, .15, 14), shirt, sh, 0, -.07, 0); ms(cap(.049, .2), skin, sh, 0, -.16, 0);
    const el = grp('el' + k, sh, 0, -.29, 0); ms(new THREE.SphereGeometry(.047, 14, 10), skin, el); ms(cap(.043, .19), skin, el, 0, -.13, 0, 1, 1, .9);
    const ha = grp('ha' + k, el, 0, -.265, 0); ms(new RoundedBoxGeometry(.08, .1, .035, 2, .015), skin, ha, 0, -.05, .005); ms(cap(.014, .035), skin, ha, -s * .04, -.035, .025, 1, 1, 1, -.4);
    const th = grp('th' + k, hips, s * .095, -.05, 0); ms(cap(.085, .27), jeans, th, 0, -.22, 0, .96, 1, 1);
    const kn = grp('kn' + k, th, 0, -.44, 0); ms(new THREE.SphereGeometry(.07, 14, 10), jeans, kn); ms(cap(.062, .29), jeans, kn, 0, -.205, 0);
    const an = grp('an' + k, kn, 0, -.41, 0); ms(new RoundedBoxGeometry(.108, .085, .27, 3, .035), shoe, an, 0, -.025, .045); ms(new THREE.BoxGeometry(.112, .026, .275), sole, an, 0, -.06, .045); ms(new THREE.BoxGeometry(.08, .01, .05), std('#d83a2a'), an, 0, .016, .13); }
  return { root, J }; }
const HU = makeHuman(); scene.add(HU.root); const J = HU.J; const JN = Object.keys(J); const ROT = {}; JN.forEach(n => ROT[n] = [0, 0, 0]);
// Mixamo character (Remy) driven by the procedural rig; the procedural body stays as a fallback until it loads
let MX = null; const MXMAP = [['hips', 'Hips'], ['spine', 'Spine'], ['chest', 'Spine2'], ['neck', 'Neck'], ['head', 'Head'], ['shL', 'RightArm'], ['elL', 'RightForeArm'], ['haL', 'RightHand'], ['shR', 'LeftArm'], ['elR', 'LeftForeArm'], ['haR', 'LeftHand'], ['thL', 'RightUpLeg'], ['knL', 'RightLeg'], ['anL', 'RightFoot'], ['thR', 'LeftUpLeg'], ['knR', 'LeftLeg'], ['anR', 'LeftFoot']];
const _mxQ = new THREE.Quaternion(), _mxD = V3(), HIP0 = J.hips.userData.base.clone();
loadMix().then(src => { if (!src) return; MX = new MixRig(src, 1.78); HU.root.add(MX.holder); HU.root.traverse(o => { if (o.isMesh && !MX.meshes.includes(o)) o.visible = false; }); });
function driveMix() { if (!MX) return; HU.root.getWorldQuaternion(_mxQ).invert(); for (const [j, b] of MXMAP) MX.from(b, J[j], _mxQ); MX.hips(_mxD.copy(J.hips.position).sub(HIP0)); MX.apply(); }
const blob = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: TX.blob, transparent: true, depthWrite: false })); scene.add(blob);

/* ================= PLAYER ================= */
const RAD = .3, HGT = 1.8, STEP = .4;
const PL = { p: V3(0, 0, 1.5), v: V3(), onG: 1, coy: 0, jb: 0, face: Math.PI, st: 'idle', airT: 0, land: 0, hang: null, cu: 0, from: V3(), to: V3(), peak: 0, noGrab: 0, ph: 0, stun: 0, step: 0, gH: 0 };
const inp = { x: 0, y: 0, jump: 0, kx: 0, ky: 0 };
let camYaw = Math.PI, camPitch = .3, lookT = 0, state = 'title', playT = 0, curH = 0;
function near(c, x, z, pad = 1) { return Math.abs(c.x - x) < c.r + pad && Math.abs(c.z - z) < c.r + pad; }
function loc(c, x, z) { const dx = x - c.x, dz = z - c.z; return [dx * c.c - dz * c.s, dx * c.s + dz * c.c]; }
function toW(c, lx, lz) { return [c.x + lx * c.c + lz * c.s, c.z - lx * c.s + lz * c.c]; }
function groundAt(x, z, y) { let best = 0, col = null; for (const c of COL) { if (!near(c, x, z) || c.y > y + 4 || c.y < y - 30) continue; const [lx, lz] = loc(c, x, z); let top = -1e9;
    if (c.t === 'b') { if (Math.abs(lx) <= c.hx + .1 && Math.abs(lz) <= c.hz + .1) top = c.y + c.hy; } else if (Math.abs(lx) <= c.hl && Math.abs(lz) < c.rr * .9) top = c.y + Math.sqrt(c.rr * c.rr - lz * lz);
    if (top <= y + STEP && top > best) { best = top; col = c; } } return { h: best, col }; }
function collideH() { const P = PL.p; for (const c of COL) { if (!near(c, P.x, P.z)) continue; const bot = c.y - (c.t === 'b' ? c.hy : c.rr), top = c.y + (c.t === 'b' ? c.hy : c.rr); if (top <= P.y + STEP || bot >= P.y + HGT) continue; let [lx, lz] = loc(c, P.x, P.z);
    if (c.t === 'b') { const ex = c.hx + RAD, ez = c.hz + RAD; if (Math.abs(lx) >= ex || Math.abs(lz) >= ez) continue; let nx = 0, nz = 0; if (ex - Math.abs(lx) < ez - Math.abs(lz)) { nx = Math.sign(lx) || 1; lx = nx * ex; } else { nz = Math.sign(lz) || 1; lz = nz * ez; } const [wx, wz] = toW(c, lx, lz); P.x = wx; P.z = wz; const n = V3(nx * c.c + nz * c.s, 0, -nx * c.s + nz * c.c); const d = PL.v.dot(n); if (d < 0) PL.v.addScaledVector(n, -d); }
    else { if (Math.abs(lx) >= c.hl || Math.abs(lz) >= c.rr + RAD) continue; const nz = Math.sign(lz) || 1; lz = nz * (c.rr + RAD); const [wx, wz] = toW(c, lx, lz); P.x = wx; P.z = wz; const n = V3(nz * c.s, 0, nz * c.c); const d = PL.v.dot(n); if (d < 0) PL.v.addScaledVector(n, -d); } } }
function ceiling() { const P = PL.p; for (const c of COL) { if (c.t !== 'b' || !near(c, P.x, P.z)) continue; const bot = c.y - c.hy; if (bot < P.y + HGT - .35 || bot > P.y + HGT + .05) continue; const [lx, lz] = loc(c, P.x, P.z); if (Math.abs(lx) < c.hx && Math.abs(lz) < c.hz) { P.y = bot - HGT; if (PL.v.y > 0) PL.v.y = 0; } } }
function moveIntent() { const mx = inp.x, my = inp.y; const L = Math.min(1, Math.hypot(mx, my)); if (L < .08) return { d: V3(), L: 0 }; const f = V3(-Math.sin(camYaw), 0, -Math.cos(camYaw)), r = V3(Math.cos(camYaw), 0, -Math.sin(camYaw)); const d = f.multiplyScalar(-my).addScaledVector(r, mx); d.normalize(); return { d, L }; }
function tryGrab(mi) { const P = PL.p; const intent = mi.L > .2 ? mi.d : V3(PL.v.x, 0, PL.v.z).normalize(); if (intent.lengthSq() < .1) return false;
  for (const c of COL) { if (c.t !== 'b' || !near(c, P.x, P.z)) continue; const top = c.y + c.hy, dh = top - P.y; if (dh < 1.1 || dh > 2.45) continue; const [lx, lz] = loc(c, P.x, P.z); const cx = clamp(lx, -c.hx, c.hx), cz = clamp(lz, -c.hz, c.hz); const ox = lx - cx, oz = lz - cz, d = Math.hypot(ox, oz); if (d < .01 || d > RAD + .32) continue;
    let nlx = 0, nlz = 0, ex, ez; if (Math.abs(ox) > Math.abs(oz)) { nlx = Math.sign(ox); ex = nlx * c.hx; ez = clamp(lz, -c.hz + .22, c.hz - .22); } else { nlz = Math.sign(oz); ez = nlz * c.hz; ex = clamp(lx, -c.hx + .22, c.hx - .22); }
    const n = V3(nlx * c.c + nlz * c.s, 0, -nlx * c.s + nlz * c.c); if (intent.dot(n) > -.35) continue; const [wx, wz] = toW(c, ex, ez);
    if (COL.some(o => o !== c && o.t === 'b' && Math.abs(o.y - o.hy - top) < 1.2 && o.y - o.hy > top - .2 && (() => { const [a, b] = loc(o, wx - n.x * .4, wz - n.z * .4); return Math.abs(a) < o.hx && Math.abs(b) < o.hz; })())) continue;
    PL.hang = { c, n, e: V3(wx, top, wz) }; P.set(wx + n.x * (RAD + .04), top - 2.02, wz + n.z * (RAD + .04)); PL.v.set(0, 0, 0); PL.st = 'hang'; PL.face = Math.atan2(-n.x, -n.z); A.noise(.08, 'lowpass', 900, 1, .08); A.tone(180, .08, 'triangle', .05); return true; } return false; }
function stepPlayer(dt) { const P = PL, mi = moveIntent(); P.noGrab -= dt; P.jb -= dt; P.coy -= dt; if (inp.jump) { P.jb = .18; inp.jump = 0; } P.stun = Math.max(0, P.stun - dt);
  if (P.st === 'hang') { const n = P.hang.n; if (P.jb > 0 || (mi.L > .5 && mi.d.dot(n) < -.6)) { P.jb = 0; P.st = 'climb'; P.cu = 0; P.from.copy(P.p); P.to.copy(P.hang.e).addScaledVector(n, -.42); A.noise(.25, 'lowpass', 700, 1, .06); } else if (mi.L > .5 && mi.d.dot(n) > .5) { P.st = 'air'; P.noGrab = .45; P.v.set(n.x * 1.6, 0, n.z * 1.6); P.airT = 0; P.peak = P.p.y; } return; }
  if (P.st === 'climb') { P.cu += dt / 1.05; const u = Math.min(1, P.cu); const e1 = t => t * t * (3 - 2 * t); if (u < .55) { const q = e1(u / .55); P.p.set(P.from.x, lerp(P.from.y, P.to.y, q), P.from.z); } else { const q = e1((u - .55) / .45); P.p.set(lerp(P.from.x, P.to.x, q), P.to.y, lerp(P.from.z, P.to.z, q)); } if (u >= 1) { P.st = 'idle'; P.onG = 1; P.v.set(0, 0, 0); P.gH = P.p.y; } return; }
  let spd = 0; if (mi.L > 0 && !P.stun) spd = mi.L < .75 ? 2.3 * mi.L / .75 : 5.4; const tv = mi.d.clone().multiplyScalar(spd); const k = Math.min(1, (P.onG ? 14 : 3.2) * dt); P.v.x = lerp(P.v.x, tv.x, k); P.v.z = lerp(P.v.z, tv.z, k);
  if (mi.L > .1 && !P.stun) { const tf = Math.atan2(mi.d.x, mi.d.z); let d = tf - P.face; d = Math.atan2(Math.sin(d), Math.cos(d)); P.face += d * Math.min(1, dt * (P.onG ? 12 : 5)); }
  if (P.jb > 0 && (P.onG || P.coy > 0) && !P.stun) { P.v.y = 7.7; P.onG = 0; P.coy = 0; P.jb = 0; P.st = 'air'; P.airT = 0; P.peak = P.p.y; A.noise(.08, 'lowpass', 600, 1, .05); A.voice && Math.random() < .3 && A.tone(260, .08, 'sine', .03); }
  P.p.x += P.v.x * dt; P.p.z += P.v.z * dt; collideH();
  const y0 = P.p.y; P.v.y = Math.max(-40, P.v.y - 20 * dt); P.p.y += P.v.y * dt; if (P.v.y > 0) ceiling();
  const g = groundAt(P.p.x, P.p.z, Math.max(y0, P.p.y)); P.gH = g.h;
  if (P.onG) { if (g.h >= P.p.y - .45 && P.v.y <= 0) { P.p.y = g.h; P.v.y = 0; } else { P.onG = 0; P.coy = .17; P.st = 'air'; P.airT = 0; P.peak = P.p.y; } }
  else { P.airT += dt; P.peak = Math.max(P.peak, P.p.y); if (P.v.y <= 0 && P.p.y <= g.h) { const fall = P.peak - g.h; P.p.y = g.h; P.v.y = 0; P.onG = 1; P.st = 'idle'; P.land = clamp(fall / 4, .2, 1); A.noise(.1, 'lowpass', 400 + 200 * (1 - P.land), 1, .05 + P.land * .08); FX.burst(P.p.clone().add(V3(0, .05, 0)), 6 + (P.land * 12 | 0), [[.7, .68, .62]], 1 + P.land * 2, .1, .5, 2);
        if (fall > 7) { P.stun = .7; shake = .4; buzz(60); A.tone(140, .25, 'sine', .12, 0, 70); if (fall > 12) bigTxt('−' + Math.round(fall) + T(' מ׳ 😱', ' m 😱'), '', 1200); } }
      else if (P.noGrab <= 0 && P.airT > .1 && P.v.y < 2.5) tryGrab(mi); }
  if (P.onG) P.st = Math.hypot(P.v.x, P.v.z) > .3 ? 'move' : 'idle';
  if (P.p.y < -20) { P.p.set(0, 0, 1.5); P.v.set(0, 0, 0); } }

/* ================= ANIMATION ================= */
const TG = {}; JN.forEach(n => TG[n] = [0, 0, 0]); let hipY = .96, hipYc = .96, lastStepS = 0;
function sT(n, x = 0, y = 0, z = 0) { const a = TG[n]; a[0] = x; a[1] = y; a[2] = z; }
function addT(n, x = 0, y = 0, z = 0) { const a = TG[n]; a[0] += x; a[1] += y; a[2] += z; }
function animHuman(dt, t) { const P = PL; JN.forEach(n => sT(n)); hipY = .96; let kS = 13;
  const spd = Math.hypot(P.v.x, P.v.z); const rb = clamp((spd - 2.2) / 2.8, 0, 1); const L = ['L', 'R'];
  if (P.st === 'move') { P.ph += dt * (3.4 + spd * 1.3); const ph = P.ph; const amp = clamp(spd / 2.2, .25, 1);
    L.forEach((k, i) => { const s = i ? 1 : -1, a = ph + (i ? Math.PI : 0), sa = Math.sin(a), ca = Math.cos(a);
      sT('th' + k, (-sa * (.4 + .42 * rb) - .08 * rb) * amp, 0, s * .02); sT('kn' + k, (.1 + Math.max(0, ca) * (.55 + 1.15 * rb) + (sa < 0 ? .12 : 0)) * amp); sT('an' + k, (Math.max(0, -sa) * (.35 + .3 * rb) - Math.max(0, sa) * .18) * amp);
      const aa = a + Math.PI, saa = Math.sin(aa); sT('sh' + k, -saa * (.32 + .55 * rb) * amp + .05, 0, s * (.08 + .08 * rb)); sT('el' + k, -(.2 + 1.1 * rb) - Math.max(0, saa) * .35 * rb); sT('ha' + k, 0, 0, s * .1); });
    hipY = .96 - .02 - .035 * rb + Math.cos(2 * ph) * (.012 + .028 * rb); sT('hips', 0, Math.sin(ph) * (.1 + .06 * rb), Math.cos(ph) * .035); sT('spine', .05 + .14 * rb, -Math.sin(ph) * .08); sT('chest', .03, -Math.sin(ph) * (.1 + .1 * rb)); sT('head', -.08 * rb, Math.sin(ph) * .06);
    const st = Math.sign(Math.sin(ph)); if (st !== lastStepS) { lastStepS = st; A.noise(.05, 'lowpass', 300 + Math.random() * 300, 1, .03 + rb * .02); } }
  else if (P.st === 'idle') { const b = Math.sin(t * 1.7); L.forEach((k, i) => { const s = i ? 1 : -1; sT('sh' + k, .04 + b * .01, 0, s * .07); sT('el' + k, -.14); sT('ha' + k, 0, 0, s * .12); sT('th' + k, -.02, 0, s * .04); sT('kn' + k, .05); sT('an' + k, -.03); }); sT('chest', b * .015); sT('hips', 0, 0, Math.sin(t * .6) * .02); sT('head', Math.sin(t * .4) * .05, Math.sin(t * .31) * .25); }
  else if (P.st === 'air') { const up = P.v.y > 0, flail = P.v.y < -8 || P.airT > 1.1; kS = 9;
    if (flail) { L.forEach((k, i) => { const s = i ? 1 : -1, o = i ? Math.PI : 0; sT('sh' + k, -2.1 + Math.sin(t * 9 + o) * .7, 0, s * (.9 + Math.sin(t * 7 + o) * .25)); sT('el' + k, -.5 - Math.sin(t * 9 + o) * .3); sT('th' + k, -.5 + Math.sin(t * 6 + o) * .55); sT('kn' + k, .9 + Math.cos(t * 6 + o) * .4); sT('an' + k, .3); }); sT('spine', -.08); sT('head', -.2); }
    else { L.forEach((k, i) => { const s = i ? 1 : -1, lead = i === 0; sT('sh' + k, up ? (lead ? .5 : -1.4) : -.9, 0, s * (up ? .3 : .55)); sT('el' + k, up ? -.9 : -.5); sT('th' + k, up ? (lead ? -1.05 : .3) : (lead ? -.55 : -.1)); sT('kn' + k, up ? (lead ? 1.5 : .6) : (lead ? .7 : .45)); sT('an' + k, .35); }); sT('spine', up ? .14 : .02); sT('head', up ? -.1 : .1); } }
  else if (P.st === 'hang') { kS = 16; L.forEach((k, i) => { const s = i ? 1 : -1, o = i ? 1.3 : 0; sT('sh' + k, -2.95, 0, s * .2); sT('el' + k, -.25); sT('ha' + k, -.3); sT('th' + k, .05 + Math.sin(t * 1.8 + o) * .07); sT('kn' + k, .3 + Math.sin(t * 1.8 + o) * .08); sT('an' + k, .4); }); sT('spine', .06); sT('head', -.3); hipY = .96; }
  else if (P.st === 'climb') { kS = 18; const u = P.cu; L.forEach((k, i) => { const s = i ? 1 : -1, lead = i === 0;
      if (u < .45) { const q = u / .45; sT('sh' + k, lerp(-2.95, -1.25, q), 0, s * lerp(.2, .55, q)); sT('el' + k, lerp(-.25, -2.2, q)); sT('th' + k, lead ? lerp(.05, -1.1, q) : lerp(.05, .25, q)); sT('kn' + k, lead ? lerp(.3, 1.8, q) : .4); sT('spine', lerp(.06, .35, q)); }
      else if (u < .8) { const q = (u - .45) / .35; sT('sh' + k, lerp(-1.25, -.35, q), 0, s * lerp(.55, .3, q)); sT('el' + k, lerp(-2.2, -.4, q)); sT('th' + k, lead ? lerp(-1.1, -1.4, q) : lerp(.25, -.6, q)); sT('kn' + k, lead ? lerp(1.8, 1.6, q) : lerp(.4, 1.4, q)); sT('spine', lerp(.35, .55, q)); hipY = .96 - .15 * q; }
      else { const q = (u - .8) / .2; sT('sh' + k, lerp(-.35, .05, q), 0, s * .1); sT('el' + k, -.2); sT('th' + k, lerp(lead ? -1.4 : -.6, 0, q)); sT('kn' + k, lerp(lead ? 1.6 : 1.4, .05, q)); sT('spine', lerp(.55, 0, q)); hipY = .96 - .15 * (1 - q); } }); sT('head', -.15); }
  if (P.land > 0) { const la = P.land * (P.land > .05 ? 1 : 0); hipY -= .26 * la; L.forEach(k => { addT('th' + k, -.95 * la); addT('kn' + k, 1.75 * la); addT('an' + k, -.75 * la); addT('sh' + k, -.35 * la); addT('el' + k, -.4 * la); }); addT('spine', .45 * la); P.land = Math.max(0, P.land - dt * (P.stun > 0 ? .9 : 2.6)); }
  const f = 1 - Math.exp(-dt * kS); for (const n of JN) { const r = ROT[n], tg = TG[n]; for (let a = 0; a < 3; a++) r[a] += (tg[a] - r[a]) * f; J[n].rotation.set(r[0], r[1], r[2]); }
  hipYc += (hipY - hipYc) * (1 - Math.exp(-dt * 16)); J.hips.position.y = hipYc;
  HU.root.position.copy(P.p); let d = P.face - HU.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); HU.root.rotation.y += d * Math.min(1, dt * 18); driveMix();
  blob.position.set(P.p.x, P.gH + .02, P.p.z); const hh = clamp((P.p.y - P.gH) * .25, 0, .8); blob.scale.setScalar(1 - hh * .5); blob.material.opacity = 1 - hh; blob.visible = P.st !== 'hang' && P.st !== 'climb'; }

/* ================= CAMERA ================= */
let shake = 0; const camT = V3(0, 1.5, 0), camPos = V3(); let camDist = 5.2;
function solidAt(x, y, z) { for (const c of COL) { if (!near(c, x, z, .2)) continue; const [lx, lz] = loc(c, x, z); if (c.t === 'b') { if (Math.abs(lx) < c.hx && Math.abs(lz) < c.hz && Math.abs(y - c.y) < c.hy) return true; } else if (Math.abs(lx) < c.hl && Math.hypot(lz, y - c.y) < c.rr) return true; } return false; }
let routeI = 0;
function guideYaw() { // camera sits behind the player, looking at the next obstacle on the course
  const P = PL.p; let best = routeI, bd = 1e9; for (let i = Math.max(0, routeI - 6); i < Math.min(ROUTE.length, routeI + 10); i++) { const r = ROUTE[i]; const dd = Math.hypot(r.x - P.x, r.z - P.z) + Math.abs(r.y - P.y) * 2; if (dd < bd) { bd = dd; best = i; } }
  if (bd > 12) for (let i = 0; i < ROUTE.length; i++) { const r = ROUTE[i]; const dd = Math.hypot(r.x - P.x, r.z - P.z) + Math.abs(r.y - P.y) * 2; if (dd < bd) { bd = dd; best = i; } }
  routeI = best; let j = Math.min(ROUTE.length - 1, best + 1); while (j < ROUTE.length - 1 && Math.hypot(ROUTE[j].x - P.x, ROUTE[j].z - P.z) < 2.5) j++;
  const t = ROUTE[Math.min(ROUTE.length - 1, j + 1)], t1 = ROUTE[j]; const tx = (t1.x * 2 + t.x) / 3 - P.x, tz = (t1.z * 2 + t.z) / 3 - P.z; return Math.atan2(-tx, -tz); }
function updCam(dt, snap) { const P = PL.p, port = innerWidth < innerHeight; const want = port ? 6.4 : 5.2; const tgt = V3(P.x, P.y + (PL.st === 'hang' ? 2.0 : 1.55), P.z); if (snap) camT.copy(tgt); else camT.lerp(tgt, Math.min(1, dt * 10));
  lookT -= dt; if (lookT <= 0 && state === 'play') { const g = guideYaw(); let d = g - camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); camYaw += d * Math.min(1, dt * (PL.onG ? 1.6 : .7)); }
  if (state === 'title') camYaw += dt * .12;
  const dirC = V3(Math.sin(camYaw) * Math.cos(camPitch), Math.sin(camPitch), Math.cos(camYaw) * Math.cos(camPitch)); let dist = want; for (let s = .6; s <= want; s += .35) { const q = camT.clone().addScaledVector(dirC, s); if (solidAt(q.x, q.y, q.z)) { dist = Math.max(.9, s - .35); break; } }
  camDist = snap ? dist : (dist < camDist ? dist : lerp(camDist, dist, Math.min(1, dt * 3))); camPos.copy(camT).addScaledVector(dirC, camDist); if (camPos.y < .4) camPos.y = .4;
  camera.position.copy(camPos); if (shake > 0) { camera.position.add(V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(shake * .15)); shake = Math.max(0, shake - dt * 1.5); } camera.lookAt(camT); if (window.__camOverride) { const o = window.__camOverride, P = PL.p; camera.position.set(P.x + o[0], P.y + o[1], P.z + o[2]); camera.lookAt(P.x + o[3], P.y + o[4], P.z + o[5]); }
  const fov = port ? 62 : 55; if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  sun.position.set(P.x + 12, P.y + 20, P.z - 10); sun.target.position.set(P.x, P.y, P.z); sky.position.copy(camera.position);
  const hk = clamp(P.y / 120, 0, 1), hs = hk * hk; skyU.top.value.set('#3a78c8').lerp(C('#3a3a8a'), hs); skyU.hor.value.set('#cfe0f0').lerp(C('#ffb07a'), hs); scene.fog.color.set('#c4d4e4').lerp(C('#f2c4a4'), hs); sun.color.set('#fff0dc').lerp(C('#ffb070'), hs); hemi.color.set('#dde8f8').lerp(C('#ffd8c0'), hs); if (CITYM) CITYM.emissiveIntensity = hs * .45; }

/* ================= HUD / FLOW ================= */
let tipT = 0; function tip(t, d = 4.5) { $('tip').querySelector('span').textContent = t; $('tip').classList.add('on'); tipT = d; }
let bigTo = 0; function bigTxt(a, b = '', d = 1500) { $('big').innerHTML = a + (b ? `<small>${b}</small>` : ''); $('big').classList.add('on'); clearTimeout(bigTo); bigTo = setTimeout(() => $('big').classList.remove('on'), d); }
const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function updHud() { const h = Math.max(0, PL.p.y); curH = h; $('nH').textContent = Math.round(h); if (h > S.best + .5) { S.best = Math.round(h); if (Math.random() < .05) S.save(); } $('nB').textContent = S.best; $('nT').textContent = fmt(playT); $('mF').style.height = clamp(h / TOPY * 100, 0, 100) + '%'; $('mB').style.bottom = clamp(S.best / TOPY * 100, 0, 100) + '%'; }
function cpMark() { CPV.forEach((v, i) => { const on = S.mode === 'easy' && i <= S.cp; v.ring.material.color.set(on ? '#5aff9a' : '#ffb21a'); v.bm.visible = !on; v.g.visible = S.mode === 'easy'; }); }
function spawnAt(i) { if (i >= 0 && CPS[i]) { PL.p.copy(CPS[i]); } else PL.p.set(0, 0, 1.5); PL.v.set(0, 0, 0); PL.st = 'idle'; PL.onG = 1; PL.hang = null; PL.gH = PL.p.y; PL.face = Math.PI; routeI = 0; camYaw = ROUTE.length ? guideYaw() : 0; updCam(0, true); }
function start() { A.ac(); state = 'play'; $('title').hidden = true; $('hud').hidden = false; $('meter').hidden = false; $('ctl').hidden = false; $('joy').hidden = $('bJ').hidden = !isTouch; $('cpBtn').hidden = S.mode !== 'easy'; ['endS', 'pauseS'].forEach(i => $(i).hidden = true);
  if (S.mode !== 'easy') S.cp = -1; spawnAt(S.mode === 'easy' ? S.cp : -1); playT = S.mode === 'easy' && S.cp >= 0 ? (S.t || 0) : 0; cpMark(); updHud();
  if (!S.tut) { tip(T('🕹️ ג׳ויסטיק לריצה · גררו את המסך כדי להסתובב · ⤒ קפיצה', '🕹️ Joystick to run · drag the screen to look · ⤒ jump'), 6); setTimeout(() => state === 'play' && tip(T('🧗 קפצו אל קיר גבוה – הדמות תיתפס בקצה. לחצו ⤒ כדי לטפס!', '🧗 Jump at a tall wall – you’ll grab the edge. Press ⤒ to climb up!'), 6), 7000); S.tut = 1; S.save(); }
  A.startMusic({ chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], bpm: 84, lead: false, vol: .22 }); }
function toTitle() { state = 'title'; A.stopMusic(); ['hud', 'meter', 'ctl', 'endS', 'pauseS'].forEach(i => $(i).hidden = true); $('title').hidden = false; spawnAt(-1); PL.face = 0; renderTitle(); }
function renderTitle() { $('tSub').textContent = T('טפסו הכי גבוה שאפשר – ואל תיפלו!', 'Climb as high as you can – and don’t fall!');
  const mb = $('modes').children; mb[0].innerHTML = T('🟢 רגיל', '🟢 Normal') + `<small>${T('עם נקודות שמירה', 'with checkpoints')}</small>`; mb[1].innerHTML = T('🔥 אמיתי', '🔥 Hardcore') + `<small>${T('נופלים = מתחילים מלמטה', 'fall = start over')}</small>`; for (const b of mb) b.setAttribute('aria-pressed', b.dataset.m === S.mode);
  $('rec').textContent = `🏆 ${T('שיא גובה', 'Best height')}: ${S.best} / ${Math.round(TOPY)} ${T('מ׳', 'm')}` + (S.wins ? ` · ⛰️ ×${S.wins}` + (S.bestT ? ` · ⏱ ${fmt(S.bestT)}` : '') : '');
  $('goBtn').textContent = S.mode === 'easy' && S.cp >= 0 ? T('▶ להמשיך לטפס', '▶ Keep climbing') : T('▶ להתחיל לטפס', '▶ Start climbing'); $('newBtn').hidden = !(S.mode === 'easy' && S.cp >= 0); $('newBtn').textContent = T('↺ מההתחלה', '↺ Restart'); $('sndChip').textContent = S.mute ? T('🔇 צליל', '🔇 Sound') : T('🔊 צליל', '🔊 Sound'); }
function win() { state = 'win'; A.stopMusic(); S.wins = (S.wins || 0) + 1; if (!S.bestT || playT < S.bestT) S.bestT = Math.round(playT); S.cp = -1; S.t = 0; S.save(); [523, 659, 784, 1047, 1319].forEach((f, i) => A.tone(f, .25, 'triangle', .09, i * .12)); for (let i = 0; i < 4; i++) setTimeout(() => FX.burst(PL.p.clone().add(V3(0, 2, 0)), 80, CONFETTI, 6, .09, 2, 6), i * 300);
  setTimeout(() => { $('eT').textContent = T('הגעת לפסגה! 🏔️', 'You reached the top! 🏔️'); $('eP').textContent = T('אלוף/ה! מעטים מגיעים לכאן.', 'Champion! Few climbers make it here.'); $('eS').innerHTML = `<span>⏱ ${fmt(playT)}</span><span>📏 ${Math.round(TOPY)} ${T('מ׳', 'm')}</span>`; $('endS').hidden = false; $('ctl').hidden = true; }, 1600); }
$('modes').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; A.ac(); S.mode = b.dataset.m; S.save(); renderTitle(); };
$('goBtn').onclick = start; $('newBtn').onclick = () => { S.cp = -1; S.t = 0; S.save(); renderTitle(); };
$('sndChip').onclick = () => { A.setMute(!S.mute); S.save(); renderTitle(); };
$('pBtn').onclick = () => { if (state !== 'play') return; state = 'pause'; S.t = playT; S.save(); $('pT').textContent = T('הפסקה', 'Paused'); $('pP').textContent = `📏 ${Math.round(curH)} ${T('מ׳', 'm')} · ⏱ ${fmt(playT)}`; $('pauseS').hidden = false; };
$('pGo').onclick = () => { $('pauseS').hidden = true; state = 'play'; }; $('pMenu').onclick = () => { S.t = playT; S.save(); toTitle(); };
$('eMenu').onclick = toTitle; $('eAgain').onclick = () => { S.cp = -1; start(); };
$('cpBtn').onclick = () => { if (state !== 'play') return; spawnAt(S.cp); A.tone(600, .1, 'sine', .05, 0, 900); };
for (const [id, he, en] of [['pGo', '▶ המשך', '▶ Resume'], ['pMenu', '🏠 תפריט', '🏠 Menu'], ['eMenu', '🏠 תפריט', '🏠 Menu'], ['eAgain', '↺ שוב מההתחלה', '↺ Climb again']]) $(id).textContent = T(he, en);
$('bJ').querySelector('small').textContent = T('קפיצה', 'Jump');

/* ================= INPUT ================= */
(() => { const el = $('joy'), knob = el.querySelector('i'); let id = null, cx = 0, cy = 0; const RR = 48;
  el.addEventListener('pointerdown', e => { e.stopPropagation(); A.ac(); id = e.pointerId; el.setPointerCapture(id); const r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; mv(e); });
  const mv = e => { if (e.pointerId !== id) return; let dx = e.clientX - cx, dy = e.clientY - cy; const L = Math.hypot(dx, dy); if (L > RR) { dx *= RR / L; dy *= RR / L; } knob.style.transform = `translate(${dx}px,${dy}px)`; inp.x = dx / RR; inp.y = dy / RR; };
  el.addEventListener('pointermove', mv); const up = e => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; inp.x = inp.y = 0; }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  const bJ = $('bJ'); bJ.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); A.ac(); inp.jump = 1; bJ.classList.add('on'); }); const ju = () => bJ.classList.remove('on'); bJ.addEventListener('pointerup', ju); bJ.addEventListener('pointercancel', ju);
  const lk = $('look'); const ptrs = new Map(); lk.addEventListener('pointerdown', e => { A.ac(); ptrs.set(e.pointerId, [e.clientX, e.clientY]); try { lk.setPointerCapture(e.pointerId); } catch (er) { } });
  lk.addEventListener('pointermove', e => { const q = ptrs.get(e.pointerId); if (!q) return; const dx = e.clientX - q[0], dy = e.clientY - q[1]; q[0] = e.clientX; q[1] = e.clientY; camYaw -= dx * .0065; camPitch = clamp(camPitch + dy * .005, -.25, 1.15); lookT = 2.5; });
  const lu = e => ptrs.delete(e.pointerId); lk.addEventListener('pointerup', lu); lk.addEventListener('pointercancel', lu); })();
const keys = {}; addEventListener('keydown', e => { if (keys[e.code]) return; keys[e.code] = 1; A.ac(); if (e.code === 'Space') { inp.jump = 1; e.preventDefault(); } if (e.code === 'Escape' || e.code === 'KeyP') state === 'play' ? $('pBtn').onclick() : state === 'pause' && $('pGo').onclick(); kb(); });
addEventListener('keyup', e => { keys[e.code] = 0; kb(); });
function kb() { const any = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].some(k => keys[k]); if (!any && isTouch) return; inp.x = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0); inp.y = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0); }
document.addEventListener('visibilitychange', () => { if (document.hidden) { S.t = playT; S.save(); if (state === 'play') $('pBtn').onclick(); A.stopMusic(); } });

/* ================= LOOP ================= */
let last = performance.now(), hudT = 0;
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.033, (now - last) / 1000); last = now; A.tick && A.tick(); const t = now / 1000;
  if (state === 'play') { playT += dt; stepPlayer(dt / 2); stepPlayer(dt / 2);
    if (S.mode === 'easy' && PL.onG) CPS.forEach((c, i) => { if (i > S.cp && Math.hypot(PL.p.x - c.x, PL.p.z - c.z) < 1.8 && Math.abs(PL.p.y - c.y) < .6) { S.cp = i; S.t = playT; S.save(); cpMark(); A.tone(660, .12, 'sine', .08); A.tone(990, .2, 'sine', .08, .1); toast(T('✔ נקודת שמירה ', '✔ Checkpoint ') + (i + 1) + '/' + CPS.length); GL.burst(c.clone().add(V3(0, 1, 0)), 40, [[.6, 2, 1.2]], 3, .1, 1, 1); } });
    if (Math.hypot(PL.p.x - SUMMIT.x, PL.p.z - SUMMIT.z) < 2.4 && Math.abs(PL.p.y - SUMMIT.y) < 1.5) win();
    hudT -= dt; if (hudT <= 0) { hudT = .1; updHud(); } }
  else if (state === 'title' || state === 'win') { PL.st = state === 'win' ? 'idle' : 'idle'; }
  animHuman(dt, t); updCam(dt);
  trophy.rotation.y += dt * .8; life(dt, t); CPV.forEach(v => v.bm.rotation.y += dt * .5);
  if (Math.random() < dt * 3) GL.emit(PL.p.clone().add(V3(rnd(-6, 6), rnd(0, 4), rnd(-6, 6))), V3(rnd(-.3, .3), rnd(-.1, .1), rnd(-.3, .3)), [1.2, 1.2, 1.1], .035, 3, 0);
  if (tipT > 0) { tipT -= dt; if (tipT <= 0) $('tip').classList.remove('on'); }
  FX.update(dt, .02); GL.update(dt); E.render(); }
hubButtons(['homeT'], A); $('homeT').innerHTML = ICO.home('#1a2a44'); qualityButton('qBtn', S);
if (EN) { document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr'; }
E.resize(); toTitle(); setTimeout(() => { $('loading').hidden = true; requestAnimationFrame(frame); window.__rsOK = true; }, 30);
window.__rs = { PL, inp, COL, CPS, get SUMMIT() { return SUMMIT; }, TOPY, stepPlayer, start, toTitle, updCam, animHuman, set yaw(v) { camYaw = v; }, get state() { return state; }, set state(v) { state = v; }, spawnAt };
