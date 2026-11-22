/* KIBO JUNGLE – an original 3D jungle platformer (Ya Ya Games) */
import { THREE, $, V3, C, clamp, lerp, rnd, rng, T, EN, store, engine, studioEnv, std, particles, audio, toast, ICO, hubButtons, qualityButton, isTouch, CONFETTI, SND_ON, SND_OFF } from '../lib/kit.js';
const S = store('kibo-save', { best: {}, unl: 1, sel: 0, tut: 0 });
const E = engine(S, { fov: 52, far: 170, bloom: [.28, .55, .9], exposure: 1.02, vignette: .26, sat: 1.12, bg: '#9ad6ff' });
const { scene, camera, renderer } = E; studioEnv(E, '#eef8ff', '#4a6a3a', .5);
const A = audio(S); const FX = particles(E, 2000); const GL = particles(E, 900, true);
const TAU = Math.PI * 2; const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };
const DUM = new THREE.Object3D();

/* ================= TEXTURES ================= */
function ct(w, h, f, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); f(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
const R0 = rng(11);
function blots(g, w, h, cols, n, s0, s1, a0 = .25, a1 = .7) { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; const s = s0 + R0() * (s1 - s0); g.globalAlpha = a0 + R0() * (a1 - a0); g.beginPath(); g.ellipse(R0() * w, R0() * h, s, s * (.5 + R0() * .6), R0() * 3, 0, TAU); g.fill(); } g.globalAlpha = 1; }
const TX = {
  grass: ct(128, 128, (g, w, h) => { g.fillStyle = '#5aa83a'; g.fillRect(0, 0, w, h); blots(g, w, h, ['#6cc04a', '#4a9430', '#7ad058', '#3f8a2a'], 90, 4, 14); g.lineWidth = 1.5; for (let i = 0; i < 260; i++) { const x = R0() * w, y = R0() * h; g.strokeStyle = ['#8ae060', '#3a7a22', '#a8f070'][i % 3]; g.globalAlpha = .55; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd(-3, 3), y - 5 - R0() * 5); g.stroke(); } g.globalAlpha = 1; for (let i = 0; i < 6; i++) { g.fillStyle = ['#ffe24a', '#ff8ac8', '#ffffff'][i % 3]; g.beginPath(); g.arc(R0() * w, R0() * h, 2.2, 0, TAU); g.fill(); } }, 1),
  path: ct(128, 128, (g, w, h) => { g.fillStyle = '#c99a62'; g.fillRect(0, 0, w, h); blots(g, w, h, ['#b8864e', '#d8aa72', '#a87a44', '#e0b884'], 120, 3, 12); for (let i = 0; i < 40; i++) { g.fillStyle = ['#8a8070', '#a8a090', '#6a5a48'][i % 3]; g.globalAlpha = .8; g.beginPath(); g.ellipse(R0() * w, R0() * h, 2 + R0() * 3, 1.5 + R0() * 2, R0() * 3, 0, TAU); g.fill(); } g.globalAlpha = 1; }, 1),
  stone: ct(128, 128, (g, w, h) => { g.fillStyle = '#a49c88'; g.fillRect(0, 0, w, h); blots(g, w, h, ['#b8b09a', '#948c78', '#aaa28c'], 80, 4, 16); g.strokeStyle = '#6a6252'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.moveTo(w / 2, 0); g.lineTo(w / 2, h / 2); g.moveTo(w * .3, h / 2); g.lineTo(w * .3, h); g.stroke(); blots(g, w, h, ['#5a8a3a', '#6aa040'], 10, 4, 10, .4, .8); }, 1),
  side: ct(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8a5a34'); gr.addColorStop(1, '#4a2e1a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,.08)' : 'rgba(255,220,180,.06)'; g.fillRect(0, 30 + i * 32 + R0() * 8, w, 10 + R0() * 10); } blots(g, w, h, ['#6a6050', '#8a8070', '#5a4030'], 26, 3, 7, .5, .9); g.fillStyle = '#4f9a30'; g.fillRect(0, 0, w, 12); for (let x = 0; x < w; x += 4) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x + 2, 16 + R0() * 10); g.lineTo(x + 4, 10); g.fill(); } g.fillStyle = '#7ad058'; g.fillRect(0, 0, w, 3); }, 1),
  sideS: ct(64, 256, (g, w, h) => { g.fillStyle = '#8a8270'; g.fillRect(0, 0, w, h); g.strokeStyle = '#5a5444'; g.lineWidth = 3; for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); const o = (y / 32) % 2 ? 0 : w / 2; g.beginPath(); g.moveTo(o, y); g.lineTo(o, y + 32); g.stroke(); } blots(g, w, h, ['#5a8a3a', '#6aa040', '#9a9280'], 22, 3, 8, .3, .7); g.fillStyle = '#5a9a3a'; g.fillRect(0, 0, w, 6); }, 1),
  bark: ct(32, 128, (g, w, h) => { g.fillStyle = '#7a5a3a'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 10) { g.fillStyle = 'rgba(40,20,10,.45)'; g.fillRect(0, y, w, 3); g.fillStyle = 'rgba(255,220,170,.12)'; g.fillRect(0, y + 3, w, 2); } }, 1),
  palm: ct(64, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#3e7a22'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 6); g.stroke(); for (let y = h - 14; y > 10; y -= 7) { const t = 1 - y / h; const L = (w / 2 - 2) * Math.sin(Math.min(1, (1 - t) * 1.25) * Math.PI * .5 + .15) * (t < .1 ? t * 10 : 1); for (const s of [-1, 1]) { g.strokeStyle = ['#4f9a2e', '#5fb03a', '#3f8a26'][(y / 7 | 0) % 3]; g.lineWidth = 4.5; g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + s * L * .5, y - 4, w / 2 + s * L, y - 12); g.stroke(); } } }),
  leaf: ct(128, 256, (g, w, h) => { g.clearRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#2f7a22'); gr.addColorStop(.5, '#58b23a'); gr.addColorStop(1, '#2f7a22'); g.fillStyle = gr; g.beginPath(); g.moveTo(w / 2, 4); g.bezierCurveTo(w + 10, h * .3, w - 4, h * .8, w / 2, h - 4); g.bezierCurveTo(4, h * .8, -10, h * .3, w / 2, 4); g.fill(); g.strokeStyle = '#a8e078'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, h - 4); g.lineTo(w / 2, 10); g.stroke(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(180,240,140,.6)'; for (let y = 30; y < h - 20; y += 16) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w / 2, y + 10); g.quadraticCurveTo(w / 2 + s * 20, y + 2, w / 2 + s * 46, y - 6); g.stroke(); } }),
  rock: ct(128, 128, (g, w, h) => { g.fillStyle = '#8a8a7a'; g.fillRect(0, 0, w, h); blots(g, w, h, ['#9a9a88', '#6a6a5a', '#a8a898', '#5a7a3a'], 90, 3, 12); }, 1),
  water: ct(128, 128, (g, w, h) => { g.fillStyle = '#1e8aa8'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(200,250,255,.35)'; g.lineWidth = 2; for (let i = 0; i < 26; i++) { const x = R0() * w, y = R0() * h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 3, x + 16, y); g.stroke(); } }, 1),
  ray: ct(32, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,250,210,0)'); gr.addColorStop(.3, 'rgba(255,250,210,.9)'); gr.addColorStop(1, 'rgba(255,250,210,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const g2 = g.createLinearGradient(0, 0, w, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = g2; g.fillRect(0, 0, w, h); }),
  blob: ct(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }),
  portal: ct(256, 256, (g, w, h) => { const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.3, '#aaffe0'); gr.addColorStop(.7, '#3ad8a0'); gr.addColorStop(1, 'rgba(20,120,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 6; for (let i = 0; i < 5; i++) { g.beginPath(); for (let a = 0; a < 5; a += .05) { const r = a * 22; const x = 128 + Math.cos(a + i * 1.256) * r, y = 128 + Math.sin(a + i * 1.256) * r; a ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } }) };
for (const k of ['palm', 'leaf', 'ray', 'blob', 'portal']) TX[k].colorSpace = THREE.SRGBColorSpace;
function crateTex(kind, n) { return ct(128, 128, (g, w, h) => {
  if (kind === 'i') { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#b8c0c8'); gr.addColorStop(1, '#6a727c'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = '#4a525c'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); g.lineWidth = 8; g.beginPath(); g.moveTo(16, 16); g.lineTo(w - 16, h - 16); g.moveTo(w - 16, 16); g.lineTo(16, h - 16); g.stroke(); g.fillStyle = '#e8eef4'; for (const [x, y] of [[14, 14], [w - 14, 14], [14, h - 14], [w - 14, h - 14]]) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); } return; }
  if (kind === 't') { g.fillStyle = '#e84a1a'; g.fillRect(0, 0, w, h); g.save(); g.beginPath(); g.rect(0, 0, w, h); g.rect(16, 16, w - 32, h - 32); g.clip('evenodd'); for (let i = -h; i < w; i += 16) { g.fillStyle = (i / 16) % 2 ? '#1a1a1a' : '#ffcf1a'; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 8, 0); g.lineTo(i + 8 + h, h); g.lineTo(i + h, h); g.fill(); } g.restore(); g.fillStyle = '#1a1a1a'; g.font = '900 ' + (n ? 64 : 40) + 'px Rubik,Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n ? String(n) : 'TNT', w / 2, h / 2 + 3); return; }
  g.fillStyle = '#c98a46'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 22) { g.fillStyle = 'rgba(90,50,20,.35)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(255,220,160,.16)'; g.fillRect(0, y + 2, w, 3); } blots(g, w, h, ['#b07438', '#d8a060'], 30, 2, 6, .2, .5);
  g.strokeStyle = '#7a4a1e'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14); g.strokeStyle = 'rgba(255,210,150,.35)'; g.lineWidth = 2; g.strokeRect(14, 14, w - 28, h - 28);
  g.fillStyle = '#9aa2aa'; for (const [x, y] of [[0, 0], [w - 22, 0], [0, h - 22], [w - 22, h - 22]]) { g.fillRect(x, y, 22, 22); g.fillStyle = '#e8eef4'; g.beginPath(); g.arc(x + 11, y + 11, 3.5, 0, TAU); g.fill(); g.fillStyle = '#9aa2aa'; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const ico = (txt, col, sz = 62) => { g.font = '900 ' + sz + 'px Rubik,Arial'; g.lineWidth = 8; g.strokeStyle = '#4a2a0e'; g.strokeText(txt, w / 2, h / 2 + 4); g.fillStyle = col; g.fillText(txt, w / 2, h / 2 + 4); };
  if (kind === '?') ico('?', '#fff3a0', 72);
  if (kind === 'b') { g.fillStyle = '#ffd21a'; for (const y of [30, 62]) { g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w / 2 + 30, y + 26); g.lineTo(w / 2 - 30, y + 26); g.fill(); } }
  if (kind === 'l') { g.fillStyle = '#ff4a7a'; g.beginPath(); g.moveTo(64, 100); g.bezierCurveTo(10, 60, 30, 20, 64, 46); g.bezierCurveTo(98, 20, 118, 60, 64, 100); g.fill(); g.strokeStyle = '#4a2a0e'; g.lineWidth = 5; g.stroke(); }
  if (kind === 'k') ico('C', '#7affa0', 70);
  if (kind === 'q') { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 40); gr.addColorStop(0, '#ffffd0'); gr.addColorStop(.5, '#d8ff6a'); gr.addColorStop(1, 'rgba(160,255,80,0)'); g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 40, 0, TAU); g.fill(); ico('✦', '#ffffff', 50); }
}); }
const CRM = {}; for (const k of ['c', '?', 'b', 'l', 'k', 'q', 't', 'i']) CRM[k] = new THREE.MeshStandardMaterial({ map: crateTex(k), roughness: k === 'i' ? .35 : .75, metalness: k === 'i' ? .55 : 0 });
const TNTN = [null, 1, 2, 3].map(n => n ? new THREE.MeshStandardMaterial({ map: crateTex('t', n), roughness: .7, emissive: C('#ff3a00'), emissiveIntensity: 0 }) : null);

/* ================= MATERIALS / GEOS ================= */
function boxUV(w, h, d, vh = 4) { const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv; const F = [[d, h / vh], [d, h / vh], [w, d], [w, d], [w, h / vh], [w, h / vh]]; for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * F[f][0], uv.getY(i) * F[f][1]); } return g; }
const M = { grass: std('#ffffff', { map: TX.grass, roughness: .9 }), path: std('#ffffff', { map: TX.path, roughness: .95 }), stone: std('#ffffff', { map: TX.stone, roughness: .85 }), side: std('#ffffff', { map: TX.side, roughness: .95 }), sideS: std('#ffffff', { map: TX.sideS, roughness: .9 }),
  bark: std('#ffffff', { map: TX.bark, roughness: .9 }), palm: new THREE.MeshStandardMaterial({ map: TX.palm, alphaTest: .45, side: THREE.DoubleSide, roughness: .75 }), leaf: new THREE.MeshStandardMaterial({ map: TX.leaf, alphaTest: .45, side: THREE.DoubleSide, roughness: .6 }),
  canopy: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .85, flatShading: true }), bush: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .85, flatShading: true }), rock: new THREE.MeshStandardMaterial({ map: TX.rock, roughness: .9, flatShading: true }),
  flower: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .5, emissive: C('#ffffff'), emissiveIntensity: .12 }), pillar: new THREE.MeshStandardMaterial({ map: TX.stone, roughness: .9 }) };
const G = { cell: boxUV(1, 4, 1), side: boxUV(11.5, 4, 1), crate: new THREE.BoxGeometry(.9, .9, .9), canopy: new THREE.IcosahedronGeometry(1, 1), bush: new THREE.IcosahedronGeometry(1, 1), rock: new THREE.DodecahedronGeometry(1, 0), trunk: new THREE.CylinderGeometry(.13, .22, 1, 8, 1).translate(0, .5, 0), trunk2: new THREE.CylinderGeometry(.28, .45, 1, 9, 1).translate(0, .5, 0), flower: new THREE.SphereGeometry(.09, 8, 6), pillar: new THREE.CylinderGeometry(.45, .5, 1, 10).translate(0, .5, 0) };
function frondGeo(L, W, lift, droop, segs = 8) { const g = new THREE.PlaneGeometry(W, L, 1, segs); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i) + L / 2, t = y / L; p.setXYZ(i, x * (1 - t * .25), lift * t * L - droop * t * t * L, y); } g.computeVertexNormals(); return g; }
G.frond = frondGeo(2.6, 1.0, .55, 1.0); G.fern = frondGeo(1.1, .5, .9, .9, 5); G.bigleaf = frondGeo(1.5, .9, .8, .55, 6);

/* ================= LEVELS ================= */
const LEVELS = [
  { n: T('שביל הג׳ונגל', 'Jungle Path'), ic: '🌴', th: 'day', rows: ['.....*6', '..f..*3', '.....*2', '.c...', '.....', '...c.', '.....*2', '.f.f.', '.....*2', '     *2', '.....*2', '..f..*2', '.....', '..e..', '.....*3', '.c.c.', '.....', 'f...f', '.....', '..?..', '.....*2', '     *3', '.....*2', '..k..', '.....*2', '.C...', '.....', '...b.', '.....*2', '^1', '.....*3', '.f.f.*2', '..e..', '.....*2', '.i.c.', '.....*2', '^0', '.....*2', '..p..', '.....*3', '  .  *4', '.....*2', '.t...', '.....*3', '..l..', '.....*2', 'f.f.f', '.....', '.ccc.', '.....*2', '     *2', '.....*2', '..q..', '.....*3', '..G..', '.....*6'],
    tips: { 3: T('הזיזו את הג׳ויסטיק כדי לרוץ 🏃', 'Move the joystick to run 🏃'), 9: T('🌀 סיבוב שובר ארגזים – נסו!', '🌀 Spin breaks crates – try it!'), 16: T('⤒ קפצו מעל הבור!', '⤒ Jump over the gap!'), 24: T('🦀 קפצו על הסרטן או הסתובבו לידו', '🦀 Jump on the crab or spin into it'), 46: T('🅲 ארגז C שומר את המקום שלכם', '🅲 The C crate saves your spot'), 50: T('ארגז הקפיצה זורק אתכם גבוה ⬆️', 'The bounce crate throws you high ⬆️'), 66: T('⚠️ TNT מתפוצץ! קפצו עליו וברחו', '⚠️ TNT explodes! Jump on it and run'), 85: T('✨ ארגז הגחלילית – שומרת עליכם מפגיעה', '✨ The firefly crate protects you from a hit') } },
  { n: T('חציית הנהר', 'River Crossing'), ic: '🌊', th: 'river', rows: ['.....*5', '..f..*2', '.c.c.', '.....*2', '     ', '  m  ', '     ', '.....*2', '..e..', '.....*2', '.f.f.', '.....', '     ', ' m   ', '     ', '.....*2', '..p.p', '.....*2', '.?.c.', '.....', '..k..', '.....*2', '..z..', '.....*3', '     ', '   m ', '     ', ' m   ', '     ', '.....*2', '.t.t.', '.....*2', '^1', '.....*2', '.c.c.', '..e..', '.....*2', '^0', '.....*2', '..l..', '.....', '.f.f.', '     ', '  m  ', '     ', '  m  ', '     ', '.....*2', '..b..', '^2', '.....*3', '.q.?.', '.....*2', '^0', '.....*2', '..z..', '.....*2', '..G..', '.....*6'],
    tips: { 5: T('קפצו על האבן הזזה 🪨', 'Jump onto the moving stone 🪨'), 22: T('🐝 דבורה! רק סיבוב 🌀 מנצח אותה', '🐝 A bee! Only a spin 🌀 beats it') } },
  { n: T('מקדש עתיק', 'Ancient Temple'), ic: '🛕', th: 'temple', rows: ['.....*5', '..f..*2', '.s.s.', '.....*2', 's...s', '.....', '.i.i.', '.....*2', '^1', '.....*2', '.f.f.', '..e..', '.....*2', '^2', '.....*2', '.c.?.', '.....*2', '^1', '.....', '  .  *4', '.....', '..k..', '.....*2', '.sss.', '.....*2', '..z..', '.....*2', '.t.t.', '.....*2', '^0', '.....*2', '  m  ', '     ', '.....', '..p..', '.....*2', '.C.C.', '.....*2', '..b..', '^2', '.....*3', '.f.f.', '..l..', '.....*2', 's.s.s', '.....*2', '^1', '.....*2', '.q...', '.....*2', '^0', '.....*2', '..G..', '.....*6'],
    tips: { 3: T('⚠️ קוצים! עברו כשהם למטה', '⚠️ Spikes! Pass when they’re down'), 6: T('ארגזי ברזל לא נשברים – אפשר לעמוד עליהם', 'Iron crates don’t break – you can stand on them') } },
  { n: T('בריחה מהסלע', 'Boulder Run'), ic: '🪨', th: 'chase', chase: 1, rows: ['.....*10', '.c...', '.....*3', '...c.', '.....*3', '     *2', '.....*4', '.i...', '.....*3', '...i.', '.....*3', '.f.f.*2', '.....*2', '     *2', '.....*3', ' ... *4', '.....*3', '..i..', '.....*3', '..k..', '.....*3', '^1', '.....*4', '^0', '.....*3', '     *3', '.....*3', '.c.c.', '.....*2', 'f.f.f', '.....*3', 'i...i', '.....*2', '..i..', '.....*3', '     *2', '.....*4', '..G..', '.....*8'],
    tips: { 2: T('🪨 סלע ענק! רוצו – רק ימינה ושמאלה וקפיצה', '🪨 A giant boulder! Run – just steer and jump') } },
  { n: T('מפל הענקים', 'Giant Falls'), ic: '💦', th: 'falls', rows: ['.....*5', '..f..*2', '.e.e.', '.....*2', '     ', ' m   ', '     ', '   m ', '     ', '.....*2', '..z..', '.....', '.s.s.', '.....*2', '^1', '.c?c.', '.....*2', '^2', '.....', '.p.p.', '.....*2', '..k..', '.....*2', '  .  *3', '     ', '  m  ', '     ', '.....*2', '.t.t.', '.....', '..e..', '.....*2', '^1', '.....', 'z...z', '.....*2', '..b..', '^3', '.....*2', '.f.f.', '.....', '..l..', '.....*2', '^2', '.....', 's...s', '.....', '..z..', '.....*2', '^0', '.....', '     ', ' m   ', '     ', '   m ', '     ', '.....*2', '.qCc.', '.....*2', '..G..', '.....*6'],
    tips: {} },
  { n: T('מלך הסרטנים', 'The Crab King'), ic: '👑', th: 'boss', boss: 1, rows: ['.....*5', '..f..*2', '.c.c.', '.....*2', '^1', '.....*2', '.f.f.', '..e..', '.....*2', '^0', '.....*2', '..?..', '.....*2', '..q..', '.....*2', '^1', '.....*2', 'f...f', '..z..', '.....*2', '  .  *3', '.....*2', '.l.C.', '.....*2', '^0', '.....*3', '.....*10', '..B..', '.....*5'],
    tips: { 2: T('👑 בסוף השלב מחכה מלך הסרטנים!', '👑 The Crab King waits at the end!') } }];
const THEMES = {
  day: { top: '#3a9aff', hor: '#cfeeff', fog: '#bfe6dc', sun: '#fff2d8', hemi: ['#e8f6ff', '#5a7a3a', 1.1], key: 2.6, stone: 0, near: 26, far: 95 },
  river: { top: '#2a8af0', hor: '#d8f4ff', fog: '#c8ecf0', sun: '#ffffff', hemi: ['#e8f8ff', '#3a6a5a', 1.15], key: 2.5, stone: 0, near: 26, far: 95, water: 1 },
  temple: { top: '#ff8a4a', hor: '#ffd8a0', fog: '#e8b088', sun: '#ffc888', hemi: ['#ffd8b0', '#5a4a3a', .95], key: 2.4, stone: 1, near: 22, far: 85 },
  chase: { top: '#4aa0e8', hor: '#e0f0e0', fog: '#c8e0c8', sun: '#fff0d0', hemi: ['#f0f8ff', '#4a6a3a', 1.05], key: 2.5, stone: 0, near: 26, far: 95 },
  boss: { top: '#5a2a9a', hor: '#ffae6a', fog: '#d89a8a', sun: '#ffcf9a', hemi: ['#ffe0c8', '#4a3a5a', 1.05], key: 2.4, stone: 1, near: 24, far: 85 },
  falls: { top: '#5ab0ff', hor: '#f0fbff', fog: '#d8f0ff', sun: '#ffffff', hemi: ['#f4fbff', '#4a7a6a', 1.2], key: 2.3, stone: 1, near: 20, far: 80, water: 1 } };

/* ================= LIGHTS / SKY ================= */
const hemi = new THREE.HemisphereLight('#e8f6ff', '#5a7a3a', 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff2d8', 2.6); sun.castShadow = E.q !== 'low'; sun.shadow.mapSize.set(E.q === 'ultra' ? 2048 : 1024, E.q === 'ultra' ? 2048 : 1024); const sc = sun.shadow.camera; sc.left = -13; sc.right = 13; sc.top = 13; sc.bottom = -13; sc.near = 1; sc.far = 50; sun.shadow.bias = -.0006; sun.shadow.normalBias = .03; scene.add(sun); scene.add(sun.target);
const skyU = { top: { value: C('#3a9aff') }, hor: { value: C('#cfeeff') } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU, vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }', fragmentShader: 'uniform vec3 top; uniform vec3 hor; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+.08,0.,1.); vec3 c = mix(hor, top, pow(h,.7)); float s = pow(max(dot(vP, normalize(vec3(.35,.45,-.8))),0.),60.); c += vec3(1.,.95,.8)*s*.9; gl_FragColor = vec4(c,1.); }' }));
sky.renderOrder = -1; scene.add(sky);
scene.fog = new THREE.Fog('#bfe6dc', 26, 95);

/* ================= KIBO (player) ================= */
function buildKibo() { const g = new THREE.Group(), root = new THREE.Group(); g.add(root);
  const fur = new THREE.MeshPhysicalMaterial({ color: '#9384c4', roughness: .6, sheen: 1, sheenColor: C('#e0d8ff'), sheenRoughness: .5 }); const cream = new THREE.MeshPhysicalMaterial({ color: '#fff4e2', roughness: .6, sheen: .6, sheenColor: C('#ffffff') }); const dark = std('#3a2e5a', { roughness: .5 }); const white = std('#ffffff', { roughness: .15 });
  const sp = (r, m, x, y, z, sx = 1, sy = 1, sz = 1, par = root) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; par.add(o); return o; };
  const body = sp(.3, fur, 0, .62, 0, 1, 1.12, .92); sp(.2, cream, 0, .58, .19, .95, 1.1, .5);
  const head = new THREE.Group(); head.position.y = 1.12; root.add(head);
  sp(.34, fur, 0, 0, 0, 1.05, .95, .95, head); sp(.2, cream, 0, -.1, .2, 1.15, .72, .6, head);
  for (const s of [-1, 1]) { sp(.12, dark, s * .13, .03, .2, 1, 1.1, .5, head); sp(.095, white, s * .13, .04, .25, 1, 1, .7, head); sp(.06, std('#ff9a1a', { roughness: .2, emissive: C('#ff6a00'), emissiveIntensity: .15 }), s * .135, .04, .305, 1, 1, .5, head); sp(.034, std('#120a1a'), s * .135, .04, .328, 1, 1, .4, head); sp(.014, std('#ffffff', { emissive: C('#ffffff'), emissiveIntensity: .8 }), s * .115, .07, .336, 1, 1, 1, head);
    const ear = sp(.11, fur, s * .27, .25, -.02, 1, 1.1, .55, head); sp(.065, std('#ffb0c8', { roughness: .6 }), s * .27, .25, .02, 1, 1.1, .4, head); }
  sp(.045, dark, 0, -.06, .33, 1.2, .8, .9, head);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(.06, .014, 6, 14, Math.PI), dark); smile.rotation.z = Math.PI; smile.position.set(0, -.13, .3); head.add(smile);
  const band = new THREE.Mesh(new THREE.TorusGeometry(.2, .05, 8, 22).rotateX(Math.PI / 2), std('#ff4a2a', { roughness: .6 })); band.position.y = .9; root.add(band); const knot = sp(.06, band.material, .1, .88, -.16, 1, 1, 1);
  const limb = (r, L, m, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); root.add(p); const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, L, 4, 10), m); c.position.y = -L / 2 - r * .5; c.castShadow = true; p.add(c); return p; };
  const arms = [-1, 1].map(s => { const a = limb(.065, .22, fur, s * .28, .8, 0); sp(.075, dark, 0, -.36, 0, 1, 1, 1, a); a.rotation.z = s * .25; return a; });
  const legs = [-1, 1].map(s => { const l = limb(.08, .14, fur, s * .15, .4, 0); sp(.095, dark, 0, -.3, .05, 1, .6, 1.4, l); return l; });
  const tail = new THREE.Group(); tail.position.set(0, .45, -.25); root.add(tail); const segs = []; let par = tail; for (let i = 0; i < 11; i++) { const s = new THREE.Group(); s.position.set(0, i ? .1 : 0, i ? -.03 : 0); par.add(s); const r = .085 - i * .003; const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), i % 2 ? std('#2a2240', { roughness: .6 }) : cream); m.scale.set(1, 1.1, 1); m.castShadow = true; s.add(m); segs.push(s); par = s; }
  const whirl = new THREE.Mesh(new THREE.CylinderGeometry(.7, .35, 1.2, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe8a0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, map: TX.ray })); whirl.position.y = .65; g.add(whirl);
  g.scale.setScalar(.82); return { g, root, head, body, arms, legs, tail, segs, whirl }; }
const KB = buildKibo(); scene.add(KB.g);
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: TX.blob, transparent: true, depthWrite: false })); scene.add(blob);
const buddyM = new THREE.Mesh(new THREE.SphereGeometry(.11, 14, 10), new THREE.MeshBasicMaterial({ color: '#f0ff9a' })); const buddyGlow = new THREE.Mesh(new THREE.SphereGeometry(.24, 14, 10), new THREE.MeshBasicMaterial({ color: '#c8ff5a', transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false })); buddyM.add(buddyGlow); scene.add(buddyM);
const buddyL = new THREE.PointLight('#d8ff6a', 0, 4, 2); buddyM.add(buddyL);

/* ================= ENEMIES & PROPS ================= */
function mk(geo, mat, x = 0, y = 0, z = 0, par) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; if (par) par.add(m); return m; }
const eyeW = std('#ffffff', { roughness: .15 }), eyeB = std('#140a14');
function eyes(par, x, y, z, r = .07) { for (const s of [-1, 1]) { mk(new THREE.SphereGeometry(r, 12, 10), eyeW, s * x, y, z, par); mk(new THREE.SphereGeometry(r * .5, 10, 8), eyeB, s * x, y, z + r * .65, par); } }
function buildCrab() { const g = new THREE.Group(); const red = new THREE.MeshPhysicalMaterial({ color: '#ff4a2a', roughness: .35, clearcoat: .8 }); const b = mk(new THREE.SphereGeometry(.32, 20, 14), red, 0, .32, 0, g); b.scale.set(1.35, .68, 1);
  for (const s of [-1, 1]) { mk(new THREE.CylinderGeometry(.025, .025, .22, 6), red, s * .1, .56, .12, g); }
  const eg = new THREE.Group(); g.add(eg); eyes(eg, .1, .68, .12, .075);
  const claws = [-1, 1].map(s => { const c = new THREE.Group(); c.position.set(s * .46, .38, .22); g.add(c); const p = mk(new THREE.SphereGeometry(.15, 14, 10), red, 0, 0, 0, c); p.scale.set(1, .8, 1.15); const top = mk(new THREE.ConeGeometry(.07, .2, 8), red, 0, .06, .16, c); top.rotation.x = Math.PI / 2; return c; });
  const legs = []; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const l = mk(new THREE.CylinderGeometry(.025, .02, .34, 6), red, s * (.34 + k * .02), .15, -.12 + k * .14, g); l.rotation.z = s * .9; legs.push(l); }
  return { g, claws, legs }; }
function buildPlant() { const g = new THREE.Group(); const green = std('#3aa03a', { roughness: .6 });
  for (let k = 0; k < 4; k++) { const l = new THREE.Mesh(G.bigleaf, M.leaf); l.rotation.set(-.15, k * TAU / 4 + .4, 0); l.scale.setScalar(.6); g.add(l); }
  const stem = mk(new THREE.CylinderGeometry(.06, .09, .9, 8), green, 0, .45, 0, g);
  const head = new THREE.Group(); head.position.set(0, 1.0, 0); g.add(head); const pm = new THREE.MeshPhysicalMaterial({ color: '#d83a8a', roughness: .4, clearcoat: .5 });
  const top = mk(new THREE.SphereGeometry(.3, 18, 12, 0, TAU, 0, Math.PI * .55), pm, 0, .02, 0, head); top.rotation.x = -.5; const bot = mk(new THREE.SphereGeometry(.3, 18, 12, 0, TAU, Math.PI * .55, Math.PI * .45), pm, 0, -.02, 0, head); bot.rotation.x = .3;
  mk(new THREE.SphereGeometry(.24, 14, 10), std('#5a0a2a'), 0, 0, .02, head);
  for (let k = 0; k < 8; k++) { const a = -Math.PI * .8 + k * Math.PI * 1.6 / 7; const tt = mk(new THREE.ConeGeometry(.035, .1, 6), eyeW, Math.cos(a) * .22, .06, .12 + Math.sin(a) * .02 + .08, head); tt.rotation.x = Math.PI; }
  for (let k = 0; k < 6; k++) mk(new THREE.SphereGeometry(.045, 8, 6), std('#ffe0f0'), rnd(-.2, .2), rnd(.12, .25), rnd(-.2, .1), head);
  eyes(head, .12, .25, .12, .06); return { g, head, top, bot }; }
function buildBee() { const g = new THREE.Group(); const y = new THREE.MeshPhysicalMaterial({ color: '#ffcf1a', roughness: .35, clearcoat: .6 }); const b = mk(new THREE.SphereGeometry(.22, 18, 14), y, 0, 0, 0, g); b.scale.set(1, .95, 1.3);
  for (const z of [-.08, .08]) { const r = mk(new THREE.TorusGeometry(.2, .035, 6, 20), std('#1a1a1a'), 0, 0, z, g); r.scale.set(1, .95, 1); }
  const st = mk(new THREE.ConeGeometry(.05, .14, 8), std('#1a1a1a'), 0, 0, -.32, g); st.rotation.x = -Math.PI / 2; eyes(g, .08, .06, .22, .055);
  const wm = new THREE.MeshPhysicalMaterial({ color: '#e8f8ff', roughness: .1, transparent: true, opacity: .55, side: THREE.DoubleSide }); const wings = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.CircleGeometry(.2, 14), wm); w.scale.set(.6, 1, 1); w.position.set(s * .12, .2, -.02); g.add(w); return w; });
  return { g, wings }; }
function buildSpikes() { const g = new THREE.Group(); mk(new THREE.BoxGeometry(.96, .06, .96), std('#6a6252', { roughness: .8 }), 0, .03, 0, g); const sg = new THREE.Group(); g.add(sg); const sm = std('#c8ccd4', { metalness: .8, roughness: .25 }); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) mk(new THREE.ConeGeometry(.1, .45, 8), sm, (i - 1) * .3, .2, (j - 1) * .3, sg); return { g, sg }; }
function buildPlat() { const g = new THREE.Group(); const m = mk(new THREE.CylinderGeometry(.82, .7, .5, 18), M.rock, 0, -.25, 0, g); m.receiveShadow = true; const t = mk(new THREE.CylinderGeometry(.8, .8, .06, 18), std('#5aa83a', { roughness: .9 }), 0, -.01, 0, g); t.receiveShadow = true; return g; }
function buildPortal() { const g = new THREE.Group(); const sm = std('#9a9282', { roughness: .85, map: TX.rock }); const ring = mk(new THREE.TorusGeometry(1.15, .2, 10, 28), sm, 0, 1.35, 0, g); for (const s of [-1, 1]) { mk(new THREE.CylinderGeometry(.25, .32, 1.4, 10), sm, s * 1.15, .7, 0, g); }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.02, 36), new THREE.MeshBasicMaterial({ map: TX.portal, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); disc.position.y = 1.35; g.add(disc); g.userData.disc = disc;
  for (let k = 0; k < 7; k++) { const gem = mk(new THREE.OctahedronGeometry(.09), std('#7affc8', { emissive: C('#3affa0'), emissiveIntensity: 1.2 }), Math.cos(k / 7 * Math.PI) * 1.15, 1.35 + Math.sin(k / 7 * Math.PI) * 1.15, .18, g); } return g; }
function buildFlag() { const g = new THREE.Group(); mk(new THREE.CylinderGeometry(.03, .03, 1.4, 6), std('#e8e0d0'), 0, .7, 0, g); const f = new THREE.Mesh(new THREE.PlaneGeometry(.55, .35), std('#3ad86a', { side: THREE.DoubleSide, emissive: C('#1a8a3a'), emissiveIntensity: .4 })); f.position.set(.28, 1.2, 0); g.add(f); g.userData.f = f; return g; }
const boulder = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 2), new THREE.MeshStandardMaterial({ map: TX.rock, color: '#c8b8a0', roughness: .9, flatShading: true })); boulder.castShadow = true; boulder.visible = false; scene.add(boulder);
const fruitGeo = new THREE.SphereGeometry(.17, 16, 12); fruitGeo.scale(1, .85, .85); const fruitMat = new THREE.MeshPhysicalMaterial({ color: '#ff9a1a', roughness: .3, clearcoat: .7, emissive: C('#ff5a00'), emissiveIntensity: .22 });
const fLeafGeo = new THREE.ConeGeometry(.05, .16, 6).rotateZ(-.8).translate(.05, .17, 0), fLeafMat = std('#3aa83a', { roughness: .6 });
const flyPool = []; for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(fruitGeo, fruitMat); m.visible = false; scene.add(m); flyPool.push({ m, on: 0 }); }

/* ================= LEVEL BUILD ================= */
let LV = null, lvG = null, water = null, portal = null; const crates = [], enemies = [], fruits = [], plats = [], spikes = [], flags = []; let fruitIM = null, fLeafIM = null;
function clearLevel() { BS = null; nuts.length = 0; rings.length = 0; if ($('bossBar')) $('bossBar').hidden = true; if (lvG) { scene.remove(lvG); lvG.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); } for (const a of [crates, enemies, fruits, plats, spikes, flags]) a.length = 0; }
function inst(geo, mat, list, shadow = true, recv = false, colors) { if (!list.length) return null; const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((o, i) => { DUM.position.set(o[0], o[1], o[2]); DUM.rotation.set(o[3] || 0, o[4] || 0, o[5] || 0, 'YXZ'); DUM.scale.set(o[6] ?? 1, o[7] ?? o[6] ?? 1, o[8] ?? o[6] ?? 1); DUM.updateMatrix(); im.setMatrixAt(i, DUM.matrix); if (colors) im.setColorAt(i, C(colors[i])); }); im.castShadow = shadow; im.receiveShadow = recv; lvG.add(im); return im; }
function buildLevel(i) { clearLevel(); const D = LEVELS[i], th = THEMES[D.th]; lvG = new THREE.Group(); scene.add(lvG); const R = rng(100 + i * 17);
  const rows = []; let h = 0; for (const ln of D.rows) { if (ln[0] === '^') { h = +ln.slice(1); continue; } const [s, n] = ln.split('*'); for (let k = 0; k < (+n || 1); k++) rows.push({ s: s.padEnd(5).slice(0, 5), h }); }
  rows.forEach(r => { r.g = [...r.s].map(ch => ch !== ' ' && ch !== 'm'); r.full = !r.g.some(Boolean); });
  LV = { i, D, th, rows, n: rows.length, chase: !!D.chase, cp: { x: 0, z: -1.5, y: rows[1].h }, tips: D.tips || {}, shown: {}, total: 0, goal: null, minH: Math.min(...rows.map(r => r.h)) };
  // ground cells
  const P = [], Gr = [], Sd = []; rows.forEach((r, ri) => { const z = -ri - .5, H = r.h + 4; r.g.forEach((g, c) => { if (!g) return; (c >= 1 && c <= 3 ? P : Gr).push([c - 2, r.h - H / 2, z, 0, 0, 0, 1, H / 4, 1]); }); if (!r.full) for (const s of [-1, 1]) Sd.push([s * 8.25, r.h + .22 - (H + .22) / 2, z, 0, 0, 0, 1, (H + .22) / 4, 1]); });
  for (let ri = -1; ri >= -9; ri--) { const z = -ri - .5, hh = rows[0].h, H = hh + 4; for (let c = 0; c < 5; c++) (c >= 1 && c <= 3 ? P : Gr).push([c - 2, hh - H / 2, z, 0, 0, 0, 1, H / 4, 1]); for (const s of [-1, 1]) Sd.push([s * 8.25, hh + .22 - (H + .22) / 2, z, 0, 0, 0, 1, (H + .22) / 4, 1]); }
  const topP = th.stone ? M.stone : M.path, sideM = th.stone ? M.sideS : M.side, topG = th.stone ? M.stone : M.grass;
  inst(G.cell, [sideM, sideM, topP, sideM, sideM, sideM], P, false, true); inst(G.cell, [sideM, sideM, topG, sideM, sideM, sideM], Gr, false, true); inst(G.side, [sideM, sideM, M.grass, sideM, sideM, sideM], Sd, false, true);
  // decor
  const palmT = [], fronds = [], trunks = [], canopies = [], canC = [], bushes = [], bushC = [], ferns = [], leaves = [], rocks = [], flowers = [], flC = [], pillars = [];
  const greens = ['#3f8f2a', '#4fa032', '#2f7a22', '#5aae3a', '#3a8a40'];
  rows.forEach((r, ri) => { if (r.full) return; const z0 = -ri - .5, y = r.h + .22; for (const s of [-1, 1]) {
    if (R() < .75) { const fx = s * (2.75 + R() * .5), fz = z0 + rnd(-.4, .4); const n = 5, yaw0 = R() * TAU, sc = .7 + R() * .5; for (let k = 0; k < n; k++) ferns.push([fx, y, fz, -.2 - R() * .3, yaw0 + k * TAU / n, 0, sc]); }
    if (R() < .3) leaves.push([s * (3 + R() * 1.6), y, z0 + rnd(-.4, .4), -.3, R() * TAU, 0, .9 + R() * .7]);
    if (R() < .6) { const bs = .45 + R() * .7; const bx = s * (3.3 + R() * 3.5), bz = z0 + rnd(-.5, .5); bushes.push([bx, y + bs * .35, bz, 0, R() * 3, 0, bs, bs * .7, bs]); bushC.push(greens[(R() * 5) | 0]); if (R() < .4) for (let k = 0; k < 4; k++) { flowers.push([bx + rnd(-bs, bs) * .7, y + bs * .55 + R() * .2, bz + rnd(-bs, bs) * .7]); flC.push(['#ff6ab8', '#ffe24a', '#ffffff', '#ff8a3a'][(R() * 4) | 0]); } }
    if (th.stone && R() < .18) { const ph = 1.2 + R() * 3.2; pillars.push([s * (3.3 + R() * 2.5), y - .1, z0, rnd(-.08, .08), R() * 3, rnd(-.08, .08), 1, ph, 1]); }
    if (R() < (th.stone ? .2 : .32)) { const ph = 3.6 + R() * 3, px = s * (3.5 + R() * 5), pz = z0 + rnd(-.4, .4), tx = -s * (.08 + R() * .12), tz = rnd(-.1, .1); trunks.push([px, y - .2, pz, tz, 0, tx, 1, ph, 1]); const top = V3(0, ph, 0).applyEuler(new THREE.Euler(tz, 0, tx, 'YXZ')); const yaw0 = R() * TAU; for (let k = 0; k < 8; k++) fronds.push([px + top.x, y - .2 + top.y, pz + top.z, -.25 - R() * .35, yaw0 + k * TAU / 8 + rnd(-.15, .15), 0, .85 + R() * .35]); palmT.push(1); }
    if (R() < .2) { const th2 = 5 + R() * 4, tx = s * (7.5 + R() * 6), tz = z0 + rnd(-.4, .4); trunks.push([tx, y - .2, tz, 0, 0, 0, 2.2, th2, 2.2]); for (let k = 0; k < 3; k++) { const cs = 1.8 + R() * 1.2; canopies.push([tx + rnd(-1.2, 1.2), y + th2 + rnd(-.3, .9), tz + rnd(-1.2, 1.2), R(), R() * 3, 0, cs, cs * .75, cs]); canC.push(greens[(R() * 5) | 0]); } }
    if (R() < .12) { const rs = .3 + R() * .6; rocks.push([s * (3 + R() * 6), y + rs * .3, z0, R() * 3, R() * 3, 0, rs, rs * .7, rs]); } } });
  inst(G.trunk, M.bark, trunks); inst(G.frond, M.palm, fronds, true); inst(G.fern, M.palm, ferns, false); inst(G.bigleaf, M.leaf, leaves, false); inst(G.canopy, M.canopy, canopies, true, false, canC); inst(G.bush, M.bush, bushes, false, false, bushC); inst(G.flower, M.flower, flowers, false, false, flC); inst(G.rock, M.rock, rocks); inst(G.pillar, M.pillar, pillars);
  // distant hills
  const hills = [], hc = []; for (let z = 10; z > -rows.length - 50; z -= 13) for (const s of [-1, 1]) { const r = 14 + R() * 12; hills.push([s * (26 + R() * 16), -6 + R() * 3, z + rnd(-5, 5), 0, R() * 3, 0, r, r * (.55 + R() * .3), r]); hc.push(['#2f6a2a', '#3a7a30', '#2a5a26', '#35702c'][(R() * 4) | 0]); }
  inst(G.canopy, M.canopy, hills, false, false, hc);
  // god rays
  for (let k = 0; k < Math.ceil(rows.length / 14); k++) { const ray = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 16), new THREE.MeshBasicMaterial({ map: TX.ray, transparent: true, opacity: .13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); ray.position.set((R() < .5 ? -1 : 1) * (3 + R() * 3), 6, -k * 14 - 6); ray.rotation.set(0, rnd(-.5, .5), .45); lvG.add(ray); }
  // water
  water = new THREE.Mesh(new THREE.PlaneGeometry(90, rows.length + 80).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: TX.water, color: th.water ? '#ffffff' : '#c8e0d0', roughness: .12, clearcoat: 1, transparent: true, opacity: .93 })); water.material.map = TX.water.clone(); water.material.map.repeat.set(30, (rows.length + 80) / 3); water.material.map.needsUpdate = true; water.position.set(0, LV.minH - 3.3, -rows.length / 2); lvG.add(water);
  // objects
  const fr = []; rows.forEach((r, ri) => { const z = -ri - .5; [...r.s].forEach((ch, c) => { const x = c - 2, y = r.h;
    if (ch === 'f') fr.push([x, y + .6, z]);
    if ('c?blkqti'.includes(ch)) addCrate(ch, x, y, z); if (ch === 'C') { const a = addCrate('c', x, y, z); const b = addCrate('c', x, y + .9, z); b.below = a; b.base = y; }
    if (ch === 'e') { const o = buildCrab(); enemies.push({ k: 'crab', o, g: o.g, x, x0: x, y, z, alive: 1, ph: R() * 6, amp: 1.6 }); }
    if (ch === 'p') { const o = buildPlant(); enemies.push({ k: 'plant', o, g: o.g, x, x0: x, y, z, alive: 1, st: 0, tt: 0, cd: 0 }); }
    if (ch === 'z') { const o = buildBee(); enemies.push({ k: 'bee', o, g: o.g, x, x0: x, y: y + 1.15, z, alive: 1, ph: R() * 6, amp: 1.7 }); }
    if (ch === 's') { const o = buildSpikes(); o.g.position.set(x, y, z); lvG.add(o.g); spikes.push({ o, x, y, z, ph: (ri % 3) * .8 }); }
    if (ch === 'm') { const g = buildPlat(); lvG.add(g); plats.push({ g, x: 0, x0: x, h: rows[Math.max(0, ri - 1)].h, z, ph: 0, px: 0, dx: 0 }); }
    if (ch === 'B') LV.bossAt = { x, y, z };
    if (ch === 'G') { portal = buildPortal(); portal.position.set(x, y, z); lvG.add(portal); LV.goal = { x, y, z }; } });
    if (r.full && ri % 2 === 0 && !r.s.includes('m')) fr.push([0, rows[Math.max(0, ri - 1)].h + 1.5, z]); });
  for (const e of enemies) { e.g.position.set(e.x, e.y, e.z); lvG.add(e.g); }
  fr.forEach(p => fruits.push({ x: p[0], y: p[1], z: p[2], alive: 1 }));
  fruitIM = new THREE.InstancedMesh(fruitGeo, fruitMat, Math.max(1, fruits.length)); fLeafIM = new THREE.InstancedMesh(fLeafGeo, fLeafMat, Math.max(1, fruits.length)); fruitIM.castShadow = true; lvG.add(fruitIM); lvG.add(fLeafIM); if (!fruits.length) { fruitIM.count = 0; fLeafIM.count = 0; }
  LV.total = crates.filter(c => c.kind !== 'i' && c.kind !== 'b').length;
  // theme
  skyU.top.value.set(th.top); skyU.hor.value.set(th.hor); scene.fog.color.set(th.fog); scene.fog.near = th.near; scene.fog.far = th.far; hemi.color.set(th.hemi[0]); hemi.groundColor.set(th.hemi[1]); hemi.intensity = th.hemi[2]; sun.color.set(th.sun); sun.intensity = th.key;
  boulder.visible = LV.chase; if (LV.bossAt) makeBoss(LV.bossAt); }
function addCrate(kind, x, y, z) { const m = new THREE.Mesh(G.crate, CRM[kind]); m.position.set(x, y + .45, z); m.castShadow = true; m.receiveShadow = true; lvG.add(m); const c = { kind, m, x, y, z, base: y, alive: 1, fuse: 0, sq: 0, vy: 0, below: null, tn: 0 }; crates.push(c); return c; }

/* ================= BOSS ================= */
let BS = null; const nuts = [], rings = [];
const nutGeo = new THREE.SphereGeometry(.34, 16, 12), nutMat = std('#7a4a26', { roughness: .8 }), ringMat = new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false });
function makeBoss(at) { const o = buildCrab(); const g = o.g; g.scale.setScalar(2.7); const gold = new THREE.MeshPhysicalMaterial({ color: '#ffcf3a', roughness: .25, metalness: .7, clearcoat: 1 });
  const crown = new THREE.Group(); crown.position.set(0, .62, 0); g.add(crown); mk(new THREE.CylinderGeometry(.16, .18, .1, 16, 1, true), gold, 0, 0, 0, crown); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; const sp = mk(new THREE.ConeGeometry(.04, .12, 6), gold, Math.sin(a) * .16, .1, Math.cos(a) * .16, crown); mk(new THREE.SphereGeometry(.025, 8, 6), std('#ff3a6a', { roughness: .2 }), Math.sin(a) * .16, .17, Math.cos(a) * .16, crown); }
  const stars = new THREE.Group(); stars.position.set(0, .95, 0); g.add(stars); for (let k = 0; k < 4; k++) { const a = k / 4 * TAU; mk(new THREE.OctahedronGeometry(.05), new THREE.MeshBasicMaterial({ color: '#fff27a' }), Math.sin(a) * .22, 0, Math.cos(a) * .22, stars); } stars.visible = false;
  g.rotation.y = 0; g.position.set(at.x, at.y, at.z); lvG.add(g); BS = { o, g, crown, stars, x: 0, y: at.y, z: at.z, hp: 3, st: 'wait', t: 0, nt: 0, on: 0, flash: 0, dead: 0, kv: null, arenaZ: at.z + 11 }; }
function bossBar() { const b = $('bossBar'); if (!b || !BS) return; b.hidden = !BS.on || BS.st === 'gone'; b.querySelector('i').style.width = (BS.hp / 3 * 100) + '%'; }
function throwNut() { const lane = clamp(Math.round(PL.p.x + rnd(-1, 1)), -2, 2); const m = new THREE.Mesh(nutGeo, nutMat); m.castShadow = true; lvG.add(m); const spd = 4.6 + (3 - BS.hp) * 1.1; nuts.push({ m, x: BS.x, tx: lane, y: BS.y + .34, z: BS.z + 1.4, v: spd, alive: 1 }); A.tone(160, .14, 'square', .05, 0, 90); BS.o.claws.forEach(c => c.rotation.x = -1); }
function slam() { const m = new THREE.Mesh(new THREE.RingGeometry(.85, 1, 40).rotateX(-Math.PI / 2), ringMat.clone()); m.position.set(BS.x, BS.y + .06, BS.z); lvG.add(m); rings.push({ m, r: 1, alive: 1 }); shake = .8; sfx.boom(); buzz([30, 30, 50]); FX.burst(V3(BS.x, BS.y + .2, BS.z), 30, [[.8, .7, .55]], 4, .2, .8, 6); }
function bossHit() { BS.hp--; BS.flash = .5; BS.st = 'hit'; BS.t = 0; PL.v.y = 12; PL.onG = 0; PL.cut = 0; sfx.knock(); A.voice('grr', .55); buzz([20, 20, 40]); GL.burst(V3(BS.x, BS.y + 2.2, BS.z), 30, [[2, 2, .8], [2, 1, .4]], 4, .12, .8, 2); bossBar();
  for (const n of nuts) { n.alive = 0; lvG.remove(n.m); } nuts.length = 0;
  if (BS.hp <= 0) { BS.st = 'dead'; BS.kv = V3(0, 9, -6); A.stopMusic(); big(T('👑 ניצחת את המלך!', '👑 You beat the King!'), T('קפצו לפורטל', 'Jump into the portal'), 2400); flash(.7); for (let i = 0; i < 4; i++) setTimeout(() => confettiAt(V3(BS ? BS.x : 0, BS ? BS.y : 0, BS ? BS.z : 0)), i * 250); }
  else big(T('💥 פגיעה!', '💥 Hit!'), (BS.hp) + ' ' + T('עוד', 'more'), 1000); }
function stepBoss(dt, t) { if (!BS) return; const P = PL.p; BS.t += dt;
  if (!BS.on) { if (state === 'play' && P.z < BS.arenaZ) { BS.on = 1; BS.st = 'attack'; BS.t = -1.2; LV.cp = { x: 0, z: P.z, y: PL.supH }; big('👑 ' + T('מלך הסרטנים!', 'The Crab King!'), T('חכו שיסתחרר – וקפצו לו על הראש!', 'Wait till he’s dizzy – then jump on his head!'), 2600); A.startMusic({ chords: [[52, 55, 59], [48, 52, 55], [50, 53, 57], [47, 50, 54]], bpm: 132, lead: true, vol: .4 }); bossBar(); }
    BS.o.claws.forEach((c, i) => c.rotation.x = Math.sin(t * 2 + i) * .2); BS.g.position.set(BS.x, BS.y, BS.z); return; }
  const o = BS.o, g = BS.g;
  if (BS.st === 'dead') { BS.t += 0; BS.kv.y -= 16 * dt; g.position.addScaledVector(BS.kv, dt); g.rotation.x += dt * 5; g.rotation.z += dt * 3; if (g.position.y < BS.y - 12) { BS.st = 'gone'; g.visible = false; portal = buildPortal(); portal.position.set(0, BS.y, BS.z); lvG.add(portal); LV.goal = { x: 0, y: BS.y, z: BS.z }; GL.burst(V3(0, BS.y + 1.3, BS.z), 50, [[.6, 2, 1.4]], 3, .1, 1.2, 0); A.tone(660, .2, 'triangle', .08); A.tone(990, .3, 'triangle', .08, .15); bossBar(); } return; }
  if (BS.st === 'gone') return;
  const fast = 3 - BS.hp;
  if (BS.st === 'attack') { const dur = 5.2 + fast * .6; BS.x = Math.sin(t * (1 + fast * .35)) * 1.5; o.legs.forEach((l, i) => l.rotation.x = Math.sin(t * 16 + i) * .45);
    BS.nt -= dt; if (BS.t > 0 && BS.nt <= 0) { BS.nt = 1.25 - fast * .22; throwNut(); }
    o.claws.forEach(c => c.rotation.x = lerp(c.rotation.x, Math.sin(t * 6) * .3, Math.min(1, dt * 6)));
    if (BS.t > dur) { if (fast > 0) { BS.st = 'jump'; BS.t = 0; } else { BS.st = 'dizzy'; BS.t = 0; A.tone(900, .5, 'sine', .05, 0, 300); } } }
  else if (BS.st === 'jump') { const h = Math.sin(Math.min(1, BS.t / .7) * Math.PI) * 2.2; g.position.y = BS.y + h; if (BS.t >= .7) { slam(); if (fast > 1) setTimeout(() => BS && BS.st !== 'dead' && BS.st !== 'gone' && slam(), 650); BS.st = 'dizzy'; BS.t = 0; A.tone(900, .5, 'sine', .05, .3, 300); } }
  else if (BS.st === 'dizzy') { o.legs.forEach(l => l.rotation.x = .9); if (BS.t > 3.2 - fast * .3) { BS.st = 'attack'; BS.t = 0; BS.nt = .6; } }
  else if (BS.st === 'hit') { BS.x = lerp(BS.x, 0, Math.min(1, dt * 3)); if (BS.t > 1.1) { BS.st = 'attack'; BS.t = 0; BS.nt = .8; } }
  const dz = BS.st === 'dizzy' ? 1 : 0; BS.stars.visible = !!dz; BS.stars.rotation.y += dt * 5; const sq = dz ? .78 + Math.sin(t * 3) * .03 : 1;
  if (BS.st !== 'jump') g.position.set(BS.x, BS.y, BS.z); else g.position.x = BS.x; g.scale.set(2.7 * (dz ? 1.08 : 1), 2.7 * sq, 2.7); g.rotation.z = dz ? Math.sin(t * 4) * .12 : 0;
  BS.flash = Math.max(0, BS.flash - dt); g.visible = !(BS.flash > 0 && Math.sin(t * 50) > 0);
  if (state === 'play' && BS.st !== 'hit') { const dx = P.x - BS.x, dzz = P.z - BS.z, d = Math.hypot(dx, dzz); const top = g.position.y + 1.6 * sq;
    if (d < 1.9 && P.y > top - .9 && PL.v.y < -1 && BS.st === 'dizzy') bossHit();
    else if (d < 2.0 && PL.spinT > 0 && BS.st === 'dizzy') bossHit();
    else if (d < 1.45 && P.y < top - .5) { if (BS.st === 'dizzy') { PL.v.z = 6; } else hurt(); } }
  // nuts
  for (const n of nuts) { if (!n.alive) continue; n.z += n.v * dt; n.x = lerp(n.x, n.tx, Math.min(1, dt * 2.5)); n.m.position.set(n.x, n.y, n.z); n.m.rotation.x += n.v / .34 * dt;
    if (state === 'play') { const d = Math.hypot(P.x - n.x, P.z - n.z); if (d < .75 && P.y < n.y + .3) { if (PL.spinT > 0) { n.alive = 0; lvG.remove(n.m); sfx.crate(); FX.burst(n.m.position, 18, [[.55, .35, .2], [.95, .9, .8]], 3, .1, .7, 10); collect(1); } else { hurt(); n.alive = 0; lvG.remove(n.m); } } }
    if (n.z > BS.arenaZ + 3) { n.alive = 0; lvG.remove(n.m); } }
  for (let i = nuts.length - 1; i >= 0; i--) if (!nuts[i].alive) nuts.splice(i, 1);
  for (const r of rings) { if (!r.alive) continue; r.r += dt * 5.5; r.m.scale.setScalar(r.r); r.m.material.opacity = clamp(1 - r.r / 12, 0, .85); const d = Math.hypot(P.x - BS.x, P.z - BS.z); if (state === 'play' && PL.onG && Math.abs(d - r.r) < .45 && P.y < BS.y + .4) hurt(); if (r.r > 12) { r.alive = 0; lvG.remove(r.m); } }
  for (let i = rings.length - 1; i >= 0; i--) if (!rings[i].alive) rings.splice(i, 1); }

/* ================= STATE ================= */
let state = 'title', lives = 3, fruitN = 0, crateN = 0, playT = 0, shake = 0, camH = 0, bz = 0, bH = 0, bSpd = 0, endT = 0, combo = 0, comboT = 0;
const PL = { p: V3(0, 0, -1.5), v: V3(), onG: 0, coy: 0, jb: 0, cut: 0, spinT: 0, spinCD: 0, face: Math.PI, inv: 0, buddy: 0, deadT: 0, plat: null, supH: 0, runPh: 0, land: 0 };
const inp = { x: 0, z: 0, jump: 0, held: 0, spin: 0, kx: 0, kz: 0 };
function cellTop(x, z) { const r = Math.floor(-z), c = Math.round(x + 2); if (r < 0) return LV.rows[0].h; if (r >= LV.n || c < 0 || c > 4) return -99; const R = LV.rows[r]; return R.g[c] ? R.h : -99; }
function footSup(x, z, y) { let m = -99; for (const [a, b] of [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]]) { const h = cellTop(x + a, z + b); if (h <= y + .45) m = Math.max(m, h); } return m; }
function footTop(x, z) { let m = -99; for (const [a, b] of [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]]) m = Math.max(m, cellTop(x + a, z + b)); return m; }
const sfx = { jump: () => A.tone(380, .12, 'square', .045, 0, 720), land: () => A.noise(.06, 'lowpass', 500, 1, .06), spin: () => { A.noise(.32, 'bandpass', 700, 2, .08, 0, 2600); A.tone(520, .2, 'triangle', .04, 0, 900); },
  crate: () => { A.noise(.16, 'lowpass', 1400, 1, .14); A.tone(170, .1, 'triangle', .1, 0, 90); }, fruit: k => A.tone(1100 + Math.min(k, 12) * 55, .07, 'sine', .055), boing: () => A.tone(240, .3, 'sine', .12, 0, 900), beep: () => A.tone(980, .07, 'square', .05),
  boom: () => { A.noise(1.0, 'lowpass', 600, 1, .3); A.tone(80, .7, 'sine', .25, 0, 30); }, hurt: () => A.tone(320, .3, 'sawtooth', .07, 0, 110), knock: () => { A.tone(640, .12, 'square', .05, 0, 1600); A.noise(.1, 'highpass', 2000, 1, .05); },
  life: () => [523, 659, 784, 1047].forEach((f, i) => A.tone(f, .14, 'triangle', .08, i * .09)), cp: () => [660, 880, 1320].forEach((f, i) => A.tone(f, .12, 'sine', .08, i * .08)), win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => A.tone(f, .2, 'triangle', .09, i * .11)) };

/* ================= HUD ================= */
function updHud() { $('nF').textContent = fruitN; $('nC').textContent = crateN + '/' + LV.total; $('nL').textContent = lives; $('bud').hidden = !PL.buddy; $('bud').textContent = '✨'.repeat(PL.buddy); }
function bump(id) { const e = $(id); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
let tipT = 0; function tip(t) { $('tip').querySelector('span').textContent = t; $('tip').classList.add('on'); tipT = 4.2; }
let bigT = 0; function big(a, b = '', d = 1400) { $('big').innerHTML = a + (b ? `<small>${b}</small>` : ''); $('big').classList.add('on'); clearTimeout(bigT); bigT = setTimeout(() => $('big').classList.remove('on'), d); }
function flash(o = .7) { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = o; requestAnimationFrame(() => { f.style.transition = 'opacity .35s'; f.style.opacity = 0; }); }
function hurtFx() { const f = $('hurt'); f.style.opacity = 1; setTimeout(() => f.style.opacity = 0, 250); }

/* ================= ACTIONS ================= */
function collect(k = 1) { fruitN += k; combo++; comboT = .8; sfx.fruit(combo); bump('hF'); if (Math.floor(fruitN / 100) > Math.floor((fruitN - k) / 100)) { lives++; sfx.life(); big('❤️ +1', T('100 מנגו!', '100 mangos!')); } updHud(); }
function flyFruit(from, n) { for (let i = 0; i < n; i++) { const f = flyPool.find(q => !q.on); if (!f) { collect(1); continue; } f.on = 1; f.t = -i * .06; f.m.visible = true; f.m.position.copy(from); f.v = V3(rnd(-2, 2), rnd(4, 6.5), rnd(-1.5, 1.5)); } }
function breakCrate(c, how) { if (!c.alive) return; c.alive = 0; c.m.visible = false; crateN++; bump('hC'); sfx.crate(); buzz(12); const p = c.m.position.clone();
  FX.burst(p, 26, [[.85, .55, .28], [.65, .4, .2], [.95, .75, .45]], 4.2, .1, .9, 14); FX.burst(p, 10, [[.9, .85, .75]], 1.6, .22, .7, -1);
  const k = c.kind; if (k === 'c') flyFruit(p, 2); if (k === '?') flyFruit(p, 6);
  if (k === 'l') { lives++; sfx.life(); big('❤️ +1'); GL.burst(p, 30, [[2, .6, 1.2], [2, 1.2, 1.6]], 3, .12, 1, 2); }
  if (k === 'k') { LV.cp = { x: c.x, z: c.z, y: c.base }; sfx.cp(); const f = buildFlag(); f.position.set(c.x, c.base, c.z); lvG.add(f); flags.push(f); toast(T('✔ נקודת שמירה!', '✔ Checkpoint!')); GL.burst(p, 30, [[.6, 2, 1], [1.6, 2, 1.4]], 3, .1, 1, 2); }
  if (k === 'q') { PL.buddy = Math.min(2, PL.buddy + 1); A.tone(880, .3, 'sine', .08, 0, 1760); toast(T('✨ גחלילית שומרת עליך!', '✨ A firefly protects you!')); GL.burst(p, 40, [[1.8, 2, .8]], 2.5, .1, 1.2, 0); }
  updHud(); }
function explode(c) { if (!c.alive) return; c.alive = 0; c.m.visible = false; crateN++; bump('hC'); sfx.boom(); buzz([30, 30, 60]); shake = .7; flash(.6); const p = c.m.position.clone();
  GL.burst(p, 70, [[2.4, 1.4, .3], [2.4, .8, .2], [2.4, 2, .8]], 6, .2, .7, 0); FX.burst(p, 30, [[.35, .32, .3], [.5, .45, .4]], 2.5, .45, 1.4, -2);
  for (const o of crates) if (o.alive && o.m.position.distanceTo(p) < 2.1) { if (o.kind === 't') { o.fuse = o.fuse > 0 ? Math.min(o.fuse, .15) : .15; } else if (o.kind !== 'i' && o.kind !== 'b') breakCrate(o); }
  for (const e of enemies) if (e.alive && e.g.position.distanceTo(p) < 2.3) knock(e);
  if (state === 'play' && PL.p.clone().setY(PL.p.y + .5).distanceTo(p) < 2.0) hurt(1); updHud(); }
function knock(e) { if (!e.alive) return; e.alive = 0; e.dead = 1.3; e.kv = V3((e.g.position.x - PL.p.x) * 2.5 + rnd(-1, 1), 7.5, -7); sfx.knock(); GL.burst(e.g.position.clone().add(V3(0, .4, 0)), 14, [[2, 2, .8], [2, 2, 2]], 3, .09, .6, 0); }
function hurt(boom) { if (PL.inv > 0 || state !== 'play') return; if (PL.buddy > 0 && !boom) { PL.buddy--; PL.inv = 1.8; sfx.hurt(); hurtFx(); PL.v.y = 6; updHud(); toast(T('הגחלילית הצילה אותך!', 'The firefly saved you!')); return; } if (PL.buddy > 0 && boom) { PL.buddy--; PL.inv = 1.8; sfx.hurt(); hurtFx(); updHud(); return; } die(); }
function die() { if (state !== 'play') return; state = 'dead'; PL.deadT = 0; sfx.hurt(); A.voice('aww', 1.4); buzz([40, 40, 80]); hurtFx(); }
function spinHits() { const pc = PL.p; for (const c of crates) { if (!c.alive) continue; const dx = c.x - pc.x, dz = c.z - pc.z; if (dx * dx + dz * dz > 1.25 || c.y > pc.y + 1.1 || c.y + .9 < pc.y - .2) continue; if (c.kind === 'i') continue; if (c.kind === 'b') { c.sq = 1; continue; } if (c.kind === 't') explode(c); else breakCrate(c); }
  for (const e of enemies) { if (!e.alive) continue; const ep = e.k === 'plant' ? e.o.head.getWorldPosition(V3()) : e.g.position; if (Math.hypot(ep.x - pc.x, ep.z - pc.z) < 1.3 && Math.abs(ep.y - (pc.y + .5)) < 1.3) knock(e); } }

/* ================= PLAYER ================= */
function support() { const P = PL.p; let h = footSup(P.x, P.z, P.y), crate = null, plat = null;
  for (const c of crates) if (c.alive && Math.abs(c.z - P.z) < .7 && Math.abs(c.x - P.x) < .7) { const top = c.y + .9; if (top > h && P.y >= top - .4) { h = top; crate = c; } }
  for (const q of plats) if (Math.abs(q.z - P.z) < .85 && Math.abs(q.x - P.x) < .85) { if (q.h > h && P.y >= q.h - .45) { h = q.h; plat = q; crate = null; } }
  return { h, crate, plat }; }
function stepPlayer(dt) { const P = PL, sp = 5.4; let tx, tz;
  if (LV.chase) { tx = -inp.x * sp; tz = -5.75; } else { tx = inp.x * sp; tz = inp.z * sp; }
  const k = Math.min(1, (P.onG ? 14 : 7) * dt); P.v.x = lerp(P.v.x, tx, k); P.v.z = LV.chase ? tz : lerp(P.v.z, tz, k);
  P.jb -= dt; P.coy -= dt; if (inp.jump) { P.jb = .15; inp.jump = 0; }
  if (P.jb > 0 && (P.onG || P.coy > 0)) { P.v.y = 9.4; P.onG = 0; P.coy = 0; P.jb = 0; P.cut = 1; P.plat = null; sfx.jump(); FX.burst(P.p.clone().add(V3(0, .05, 0)), 8, [[.85, .78, .62]], 1.2, .12, .5, 2); }
  if (P.cut && !inp.held && P.v.y > 3) { P.v.y *= .5; P.cut = 0; }
  P.spinCD -= dt; if (inp.spin) { inp.spin = 0; if (P.spinCD <= 0) { P.spinT = .48; P.spinCD = .6; sfx.spin(); } } if (P.spinT > 0) { P.spinT -= dt; spinHits(); }
  const nx = clamp(P.p.x + P.v.x * dt, -2.3, 2.3); if (footTop(nx, P.p.z) <= P.p.y + .42) P.p.x = nx; else P.v.x = 0;
  const nz = Math.min(1.3, P.p.z + P.v.z * dt); if (footTop(P.p.x, nz) <= P.p.y + .42) P.p.z = nz; else P.v.z = LV.chase ? P.v.z : 0;
  if (P.plat && P.onG) P.p.x = clamp(P.p.x + P.plat.dx, -2.3, 2.3);
  for (const c of crates) { if (!c.alive) continue; const dx = P.p.x - c.x, dz = P.p.z - c.z, ox = .74 - Math.abs(dx), oz = .74 - Math.abs(dz); if (ox <= 0 || oz <= 0) continue; const top = c.y + .9; if (P.p.y >= top - .38 || P.p.y + 1 <= c.y) continue; if (LV.chase && !'itb'.includes(c.kind)) { breakCrate(c); continue; } const px = P.p.x, pz = P.p.z; if (ox < oz) P.p.x = clamp(P.p.x + Math.sign(dx || 1) * ox, -2.3, 2.3); else P.p.z += Math.sign(dz || 1) * oz; if (footTop(P.p.x, P.p.z) > P.p.y + .42) { P.p.x = px; P.p.z = pz; if (ox < oz) P.p.z += Math.sign(dz || 1) * oz; else P.p.x = clamp(P.p.x + Math.sign(dx || 1) * ox, -2.3, 2.3); if (footTop(P.p.x, P.p.z) > P.p.y + .42) { P.p.x = px; P.p.z = pz; } } }
  P.v.y = Math.max(-24, P.v.y - 27 * dt); const y0 = P.p.y; P.p.y += P.v.y * dt;
  if (P.v.y > 0) for (const c of crates) if (c.alive && Math.abs(c.x - P.p.x) < .6 && Math.abs(c.z - P.p.z) < .6 && P.p.y + 1.02 >= c.y && y0 + .6 < c.y) { P.v.y = 0; P.p.y = c.y - 1.02; if (c.kind === 't') { if (!c.fuse) c.fuse = 2.4; } else if (c.kind !== 'i' && c.kind !== 'b') breakCrate(c); else c.sq = 1; break; }
  const s = support(); P.supH = s.h > -50 ? s.h : P.supH;
  if (P.v.y <= 0 && P.p.y <= s.h && y0 >= s.h - .4) { P.p.y = s.h; const hard = P.v.y < -9;
    if (s.crate) { const c = s.crate; if (c.kind === 'i') { P.v.y = 0; if (!P.onG && hard) sfx.land(); P.onG = 1; P.plat = null; }
      else if (c.kind === 'b') { P.v.y = 13.2; P.onG = 0; P.cut = 0; c.sq = 1; sfx.boing(); if ((c.hits = (c.hits || 0) + 1) <= 3) flyFruit(c.m.position.clone().add(V3(0, .5, 0)), 1); }
      else if (c.kind === 't') { if (!c.fuse) c.fuse = 2.4; P.v.y = 8.6; P.onG = 0; P.cut = 0; c.sq = 1; sfx.boing(); }
      else { breakCrate(c); P.v.y = 8.6; P.onG = 0; P.cut = 0; } }
    else { if (!P.onG && hard) { sfx.land(); FX.burst(P.p.clone().add(V3(0, .05, 0)), 10, [[.85, .78, .62]], 1.6, .14, .5, 2); P.land = .18; } P.v.y = 0; P.onG = 1; P.plat = s.plat || null; } }
  else { if (P.onG) P.coy = .11; P.onG = 0; if (P.v.y > 0) P.plat = null; }
  if (P.p.y < LV.minH - 5) { die(); } }

/* ================= WORLD STEP ================= */
function stepWorld(dt, t) { const P = PL;
  for (const q of plats) { const nx = q.x0 * 0 + Math.sin(t * TAU / 3.4 + q.ph) * 1.55; q.dx = nx - q.x; q.x = nx; q.g.position.set(q.x, q.h, q.z); }
  for (const c of crates) { if (!c.alive) continue; if (c.below && !c.below.alive && c.y > c.base) { c.vy -= 20 * dt; c.y = Math.max(c.base, c.y + c.vy * dt); if (c.y === c.base) c.vy = 0; c.m.position.y = c.y + .45; }
    if (c.sq > 0) { c.sq = Math.max(0, c.sq - dt * 4); const s = 1 - Math.sin(c.sq * Math.PI) * .25; c.m.scale.set(2 - s, s, 2 - s); c.m.position.y = c.y + .45 * s; }
    if (c.fuse > 0) { const n0 = Math.ceil(c.fuse / .8); c.fuse -= dt; const n = Math.max(1, Math.ceil(c.fuse / .8)); if (n !== c.tn) { c.tn = n; c.m.material = TNTN[Math.min(3, n)]; sfx.beep(); } c.m.material.emissiveIntensity = (Math.sin(t * 30) > 0 ? .6 : 0); if (c.fuse <= 0) explode(c); } }
  for (const e of enemies) { if (e.dead > 0) { e.dead -= dt; e.kv.y -= 18 * dt; e.g.position.addScaledVector(e.kv, dt); e.g.rotation.x += 9 * dt; e.g.rotation.z += 6 * dt; if (e.dead <= 0) e.g.visible = false; continue; } if (!e.alive) continue;
    if (Math.abs(e.z - P.p.z) > 30) continue;
    if (e.k === 'crab') { e.x = clamp(e.x0 * .2 + Math.sin(t * 1.35 + e.ph) * e.amp, -2, 2); e.g.position.set(e.x, e.y, e.z); e.o.legs.forEach((l, i) => l.rotation.x = Math.sin(t * 14 + i) * .4); e.o.claws.forEach((c, i) => c.rotation.x = Math.sin(t * 5 + i * 2) * .3 - .1); }
    if (e.k === 'bee') { e.x = clamp(e.x0 * .2 + Math.sin(t * 1.7 + e.ph) * e.amp, -2.1, 2.1); e.g.position.set(e.x, e.y + Math.sin(t * 3 + e.ph) * .15, e.z); e.o.wings.forEach((w, i) => w.rotation.y = (i ? 1 : -1) * (.3 + Math.sin(t * 60) * .7)); e.g.rotation.y = Math.cos(t * 1.7 + e.ph) > 0 ? .5 : -.5; }
    if (e.k === 'plant') { const dz = P.p.z - e.z, dx = P.p.x - e.x; e.cd -= dt; if (e.st === 0 && e.cd <= 0 && dz > .2 && dz < 2.8 && Math.abs(dx) < 1.7 && state === 'play') { e.st = 1; e.tt = 0; A.tone(200, .15, 'sawtooth', .04, 0, 120); }
      if (e.st === 1) { e.tt += dt; const a = e.tt < .22 ? e.tt / .22 : e.tt < .5 ? 1 : Math.max(0, 1 - (e.tt - .5) / .45); e.o.head.position.set(clamp(dx, -1, 1) * a * .5, 1.0 + a * .1, a * 1.15); e.o.top.rotation.x = -.5 - a * .4; e.o.bot.rotation.x = .3 + a * .3; if (e.tt > .95) { e.st = 0; e.cd = .9; } }
      else { e.o.head.position.set(Math.sin(t * 2 + e.x) * .06, 1.0 + Math.sin(t * 3) * .03, 0); e.o.top.rotation.x = -.5 - Math.max(0, Math.sin(t * 4)) * .15; } }
    if (state !== 'play') continue;
    const ep = e.k === 'plant' ? e.o.head.getWorldPosition(V3()) : e.g.position.clone().add(V3(0, e.k === 'crab' ? .3 : 0, 0)); const pc = P.p.clone().add(V3(0, .5, 0)); const d = ep.distanceTo(pc);
    if (d < (e.k === 'plant' ? .7 : .78)) { if (P.spinT > 0) knock(e); else if (P.v.y < -1 && P.p.y > ep.y - .25) { e.alive = 0; e.dead = 0; e.g.visible = false; P.v.y = 9; P.cut = 0; sfx.knock(); FX.burst(ep, 16, [[.9, .3, .2], [1, 1, 1]], 3, .1, .6, 8); } else hurt(); } }
  for (const s of spikes) { const up = ((t + s.ph) % 2.6) < 1.1; s.o.sg.position.y = lerp(s.o.sg.position.y, up ? 0 : -.42, Math.min(1, dt * 14)); if (up && state === 'play' && Math.abs(P.p.x - s.x) < .5 && Math.abs(P.p.z - s.z) < .5 && P.p.y < s.y + .4) hurt(); }
  // fruits
  if (fruitIM && fruits.length) { const pc = P.p.clone().add(V3(0, .5, 0)); fruits.forEach((f, i) => { if (f.alive && state === 'play' && Math.abs(f.z - P.p.z) < 1 && Math.hypot(f.x - pc.x, f.y - pc.y, f.z - pc.z) < .72) { f.alive = 0; collect(1); GL.burst(V3(f.x, f.y, f.z), 6, [[2, 1.4, .4]], 1.5, .07, .4, 0); }
    DUM.position.set(f.x, f.y + Math.sin(t * 3 + f.z) * .06, f.z); DUM.rotation.set(0, t * 2.2 + f.x, 0); DUM.scale.setScalar(f.alive ? 1 : 0); DUM.updateMatrix(); fruitIM.setMatrixAt(i, DUM.matrix); fLeafIM.setMatrixAt(i, DUM.matrix); }); fruitIM.instanceMatrix.needsUpdate = true; fLeafIM.instanceMatrix.needsUpdate = true; }
  for (const f of flyPool) { if (!f.on) continue; f.t += dt; if (f.t < 0) continue; if (f.t < .35) { f.v.y -= 16 * dt; f.m.position.addScaledVector(f.v, dt); } else { const tg = P.p.clone().add(V3(0, .7, 0)); f.m.position.lerp(tg, Math.min(1, dt * 12)); if (f.m.position.distanceTo(tg) < .3 || f.t > 1.2) { f.on = 0; f.m.visible = false; collect(1); } } f.m.rotation.y += dt * 8; }
  comboT -= dt; if (comboT < 0) combo = 0;
  if (portal) { portal.userData.disc.rotation.z -= dt * 1.4; if (Math.random() < .3) GL.emit(portal.position.clone().add(V3(rnd(-.9, .9), 1.35 + rnd(-.9, .9), .1)), V3(0, .6, .4), [.6, 2, 1.4], .07, 1, 0); }
  for (const f of flags) f.userData.f.rotation.y = Math.sin(t * 4) * .3;
  if (water) water.material.map.offset.set(t * .02, -t * .05);
  // boulder
  if (LV.chase) { const gap = bz - P.p.z; if (state === 'play') { bSpd = 5.35 + Math.max(0, gap - 8) * .7; bz -= bSpd * dt; } const gt = cellTop(0, bz); if (gt > -50) bH = lerp(bH, gt, Math.min(1, dt * 6)); boulder.position.set(0, bH + 2.2, bz); boulder.rotation.x -= bSpd / 2.2 * dt;
    if (state === 'play') { shake = Math.max(shake, clamp((9 - gap) / 9, 0, .35)); if (Math.random() < .5) FX.emit(V3(rnd(-1.8, 1.8), bH + .1, bz - 1.6), V3(rnd(-1, 1), rnd(1, 2), rnd(0, 2)), [.75, .68, .55], .3, .8, -1); for (const c of crates) if (c.alive && c.z > bz - 2) { c.alive = 0; c.m.visible = false; } if (gap < 2.1) die(); } }
  // ambience
  if (Math.random() < dt * 6) GL.emit(P.p.clone().add(V3(rnd(-5, 5), rnd(.5, 3), rnd(-8, 2))), V3(rnd(-.2, .2), rnd(-.05, .15), rnd(-.2, .2)), [1.6, 2, .6], .05, 2.5, 0);
  if (Math.random() < dt * 2) FX.emit(P.p.clone().add(V3(rnd(-4, 4), 5, rnd(-8, 0))), V3(rnd(-.4, .4), -.8, rnd(-.2, .2)), [.35, .65, .2], .12, 5, .2); }

/* ================= KIBO ANIM ================= */
function animKibo(dt, t) { const P = PL, K = KB; K.g.position.copy(P.p); const spd = Math.hypot(P.v.x, P.v.z);
  if (state === 'dead') { P.deadT += dt; K.root.rotation.y += dt * 14; K.root.position.y = Math.sin(Math.min(1, P.deadT / .6) * Math.PI) * 1.2; const s = Math.max(.01, 1 - Math.max(0, P.deadT - .6) * 1.6); K.root.scale.setScalar(s); if (Math.random() < .5) GL.emit(P.p.clone().add(V3(rnd(-.4, .4), 1 + K.root.position.y, rnd(-.4, .4))), V3(rnd(-1, 1), 1.5, rnd(-1, 1)), [2, 2, .8], .08, .6, 0); return; }
  K.root.scale.setScalar(1);
  if (spd > .6 && !(P.spinT > 0)) { const tf = Math.atan2(P.v.x, P.v.z); let d = tf - P.face; d = Math.atan2(Math.sin(d), Math.cos(d)); P.face += d * Math.min(1, dt * 14); } K.g.rotation.y = P.face;
  if (P.spinT > 0) { K.root.rotation.y += dt * 30; K.whirl.material.opacity = .55; K.whirl.rotation.y -= dt * 20; if (Math.random() < .8) GL.emit(P.p.clone().add(V3(rnd(-.6, .6), rnd(.3, 1.1), rnd(-.6, .6))), V3(rnd(-1, 1), .5, rnd(-1, 1)), [2, 1.8, 1], .06, .3, 0); } else { K.root.rotation.y = 0; K.whirl.material.opacity = Math.max(0, K.whirl.material.opacity - dt * 4); }
  if (P.onG && spd > .8) { P.runPh += dt * spd * 2.6; const s = Math.sin(P.runPh); K.legs[0].rotation.x = s * .95; K.legs[1].rotation.x = -s * .95; K.arms[0].rotation.x = -s * .9; K.arms[1].rotation.x = s * .9; K.root.position.y = Math.abs(Math.cos(P.runPh)) * .07; K.root.rotation.x = .14; if (Math.random() < dt * 8) FX.emit(P.p.clone().add(V3(0, .05, 0)), V3(rnd(-.5, .5), .6, rnd(-.5, .5)), [.85, .78, .62], .1, .4, 1); }
  else if (!P.onG) { const up = P.v.y > 0; K.legs[0].rotation.x = lerp(K.legs[0].rotation.x, up ? -.9 : -.3, dt * 12); K.legs[1].rotation.x = lerp(K.legs[1].rotation.x, up ? .2 : .5, dt * 12); for (const a of K.arms) a.rotation.x = lerp(a.rotation.x, up ? -2.4 : -1.4, dt * 10); K.root.position.y = 0; K.root.rotation.x = lerp(K.root.rotation.x, up ? -.08 : .08, dt * 6); }
  else { for (const l of K.legs) l.rotation.x = lerp(l.rotation.x, 0, dt * 10); K.arms[0].rotation.x = lerp(K.arms[0].rotation.x, Math.sin(t * 2) * .08, dt * 8); K.arms[1].rotation.x = lerp(K.arms[1].rotation.x, -Math.sin(t * 2) * .08, dt * 8); K.root.position.y = Math.sin(t * 2.5) * .015; K.root.rotation.x = lerp(K.root.rotation.x, 0, dt * 8); }
  if (P.land > 0) { P.land -= dt; const q = Math.sin(P.land / .18 * Math.PI) * .18; K.root.scale.set(1 + q, 1 - q, 1 + q); }
  K.segs.forEach((s, i) => { s.rotation.x = -.2 - (P.onG ? 0 : .1) + Math.sin(t * 3 - i * .5) * .07; s.rotation.z = Math.sin(t * 2.2 - i * .6) * .08; });
  K.head.rotation.z = Math.sin(t * 1.6) * .04; K.g.visible = !(P.inv > 0 && Math.floor(P.inv * 12) % 2);
  blob.position.set(P.p.x, P.supH + .03, P.p.z); const hh = clamp((P.p.y - P.supH) * .3, 0, .7); blob.scale.setScalar(.95 * (1 - hh * .6)); blob.material.opacity = 1 - hh; blob.visible = P.supH > -50;
  buddyM.visible = P.buddy > 0; if (P.buddy) { buddyM.position.set(P.p.x + Math.sin(t * 2.3) * .55, P.p.y + 1.35 + Math.sin(t * 3.1) * .12, P.p.z + Math.cos(t * 2.3) * .4); buddyL.intensity = 2; if (Math.random() < .4) GL.emit(buddyM.position, V3(rnd(-.2, .2), -.2, rnd(-.2, .2)), [1.6, 2, .6], .05, .5, 0); } }

/* ================= CAMERA ================= */
const camP = V3(0, 4, 8), camL = V3();
function updCam(dt, snap) { const P = PL.p, port = innerWidth < innerHeight; camH = snap ? PL.supH : lerp(camH, Math.max(PL.supH, P.y - 2.2), Math.min(1, dt * 3)); let tp, tl;
  if (state === 'title') { const a = Math.sin(performance.now() / 4000) * .35; tp = V3(P.x + Math.sin(a) * 4.2, camH + 1.6, P.z + Math.cos(a) * 4.2 + .2); tl = V3(P.x, camH + (port ? .25 : .75), P.z); }
  else if (LV.chase) { tp = V3(P.x * .35, camH + (port ? 4.4 : 3.6), P.z - (port ? 9.8 : 8.2)); tl = V3(P.x * .45, camH + .9, P.z + 3); }
  else if (BS && BS.on && BS.st !== 'gone') { tp = V3(P.x * .4, camH + (port ? 6.4 : 5.2), P.z + (port ? 9.6 : 8)); tl = V3(P.x * .5, camH + .8, (P.z + BS.z) / 2 - 1); }
  else { tp = V3(P.x * .55, camH + (port ? 4.9 : 4.0), P.z + (port ? 8.6 : 7.2)); tl = V3(P.x * .7, camH + .7, P.z - 4.4); }
  if (snap) { camP.copy(tp); camL.copy(tl); } else { camP.lerp(tp, Math.min(1, dt * 5)); camL.lerp(tl, Math.min(1, dt * 6)); }
  camera.position.copy(camP); if (shake > 0) { camera.position.add(V3(rnd(-1, 1), rnd(-1, 1), 0).multiplyScalar(shake * .25)); shake = Math.max(0, shake - dt * 1.6); } camera.lookAt(camL);
  const fov = port ? 60 : 50; if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  sun.position.set(P.x + 6, P.y + 14, P.z + 5); sun.target.position.set(P.x, P.y, P.z - 3); sky.position.copy(camera.position); }

/* ================= FLOW ================= */
function respawn() { for (const n of nuts) lvG && lvG.remove(n.m); nuts.length = 0; for (const r of rings) lvG && lvG.remove(r.m); rings.length = 0; if (BS && BS.on && BS.st !== 'dead' && BS.st !== 'gone') { BS.st = 'attack'; BS.t = -1.5; BS.nt = 1; } const c = LV.cp; PL.p.set(c.x, c.y + .01, c.z); PL.v.set(0, 0, 0); PL.inv = 1.4; PL.deadT = 0; PL.onG = 1; PL.supH = c.y; PL.face = Math.PI; PL.spinT = 0; KB.root.scale.setScalar(1); KB.root.position.y = 0; KB.root.rotation.set(0, 0, 0); if (LV.chase) { bz = PL.p.z + 8; bH = c.y; } updCam(0, true); }
function startLevel(i) { S.sel = i; S.save(); buildLevel(i); lives = 3; fruitN = 0; crateN = 0; playT = 0; PL.buddy = 0; LV.cp = { x: 0, z: -1.5, y: LV.rows[1].h }; respawn(); state = 'play';
  $('title').hidden = true; $('hud').hidden = false; $('ctl').hidden = !isTouch; ['endS', 'pauseS', 'overS'].forEach(id => $(id).hidden = true); updHud();
  big(LEVELS[i].ic + ' ' + LEVELS[i].n, T('שלב ', 'Level ') + (i + 1), 1800); A.startMusic({ chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], bpm: LV.chase ? 140 : 116, lead: true, vol: .38 }); }
function win() { state = 'win'; endT = 0; sfx.win(); A.voice('yay', 1.3); confettiAt(PL.p); buzz([20, 30, 20]); }
function confettiAt(p) { FX.burst(p.clone().add(V3(0, 1.5, 0)), 80, CONFETTI, 5, .08, 1.8, 6); }
function showEnd() { A.stopMusic(); const i = LV.i, tot = LV.total, all = crateN >= tot; const st = 1 + (crateN >= tot * .5 ? 1 : 0) + (all ? 1 : 0); const b = S.best[i] || { st: 0, gem: 0, f: 0 }; S.best[i] = { st: Math.max(b.st, st), gem: b.gem || all, f: Math.max(b.f || 0, fruitN) }; S.unl = Math.max(S.unl, Math.min(LEVELS.length, i + 2)); S.save();
  $('eT').textContent = T('שלב הושלם! 🎉', 'Level complete! 🎉'); $('eS').innerHTML = [0, 1, 2].map(k => `<i class="${k < st ? 'on' : ''}" style="animation-delay:${k * .2}s">⭐</i>`).join('');
  $('eG').innerHTML = all ? `<div class="gem">💎</div><b>${T('שברת את כל הארגזים!', 'You broke every crate!')}</b>` : `<small style="color:#6a7a4a;font-weight:800">${T('שברו את כל הארגזים כדי לקבל 💎', 'Break every crate to win the 💎')}</small>`;
  $('eP').innerHTML = `<span>🥭 ${fruitN}</span><span>📦 ${crateN}/${tot}</span><span>⏱ ${Math.floor(playT / 60)}:${String(Math.floor(playT % 60)).padStart(2, '0')}</span>`; $('eNext').hidden = i >= LEVELS.length - 1; $('endS').hidden = false; $('ctl').hidden = true; }
function gameOver() { A.stopMusic(); $('oT').textContent = T('נגמרו החיים', 'Out of lives'); $('oP').textContent = T('לא נורא – קיבו מוכן לנסות שוב!', 'No worries – Kibo is ready to try again!'); $('overS').hidden = false; $('ctl').hidden = true; }
function toTitle() { state = 'title'; A.stopMusic(); ['hud', 'ctl', 'endS', 'pauseS', 'overS'].forEach(id => $(id).hidden = true); $('title').hidden = false; buildLevel(S.sel || 0); PL.p.set(0, LV.rows[3].h, -3.2); PL.supH = PL.p.y; PL.v.set(0, 0, 0); PL.face = 0; PL.onG = 1; PL.buddy = 0; PL.inv = 0; boulder.visible = false; renderTitle(); updCam(0, true); }
function pause() { if (state !== 'play') return; state = 'pause'; $('pT').textContent = T('הפסקה', 'Paused'); $('pP').textContent = LEVELS[LV.i].ic + ' ' + LEVELS[LV.i].n; $('pauseS').hidden = false; }
function renderTitle() { $('tSub').textContent = T('רוצו, קפצו, הסתובבו ושברו ארגזים בג׳ונגל!', 'Run, jump, spin and smash crates in the jungle!');
  $('lvs').innerHTML = LEVELS.map((L, i) => { const lock = i >= S.unl, b = S.best[i]; return `<button class="lvc ${lock ? 'lock' : ''} ${i === S.sel ? 'on' : ''}" data-i="${i}"><span class="n">${i + 1}</span>${b && b.gem ? '<span class="gm">💎</span>' : ''}<i>${lock ? '🔒' : L.ic}</i>${L.n}<small>${b ? '★'.repeat(b.st) + '☆'.repeat(3 - b.st) : '☆☆☆'}</small></button>`; }).join('');
  $('goBtn').textContent = '▶ ' + T('לשחק', 'Play') + ' – ' + LEVELS[S.sel].n; $('sndChip').textContent = S.mute ? T('🔇 צליל', '🔇 Sound') : T('🔊 צליל', '🔊 Sound'); }
$('lvs').onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; A.ac(); const i = +b.dataset.i; if (i >= S.unl) { toast(T('סיימו את השלב הקודם כדי לפתוח 🔒', 'Finish the previous level to unlock 🔒')); return; } A.tone(700, .06, 'triangle', .05); if (i !== S.sel) { S.sel = i; S.save(); toTitle(); } };
$('goBtn').onclick = () => { A.ac(); startLevel(S.sel); };
$('sndChip').onclick = () => { A.setMute(!S.mute); S.save(); renderTitle(); };
$('qBtnG').onclick = () => { A.ac(); pause(); };
$('pGo').onclick = () => { $('pauseS').hidden = true; state = 'play'; }; $('pRe').onclick = () => startLevel(LV.i); $('pMenu').onclick = toTitle;
$('eMenu').onclick = toTitle; $('eRe').onclick = () => startLevel(LV.i); $('eNext').onclick = () => startLevel(Math.min(LEVELS.length - 1, LV.i + 1));
$('oMenu').onclick = toTitle; $('oRe').onclick = () => startLevel(LV.i);
for (const [id, he, en] of [['pGo', '▶ המשך', '▶ Resume'], ['pRe', '↻ מההתחלה', '↻ Restart'], ['pMenu', '🏠 תפריט', '🏠 Menu'], ['eMenu', '🏠', '🏠'], ['eRe', '↻', '↻'], ['eNext', 'לשלב הבא ›', 'Next level ›'], ['oMenu', '🏠 תפריט', '🏠 Menu'], ['oRe', '↻ לנסות שוב', '↻ Try again']]) $(id).textContent = T(he, en);
$('bJ').querySelector('small').textContent = T('קפיצה', 'Jump'); $('bS').querySelector('small').textContent = T('סיבוב', 'Spin');

/* ================= INPUT ================= */
(() => { const el = $('joy'), knob = el.querySelector('i'); let id = null, cx = 0, cy = 0; const R = 48;
  el.addEventListener('pointerdown', e => { A.ac(); id = e.pointerId; el.setPointerCapture(id); const r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; mv(e); });
  const mv = e => { if (e.pointerId !== id) return; let dx = e.clientX - cx, dy = e.clientY - cy; const L = Math.hypot(dx, dy); if (L > R) { dx *= R / L; dy *= R / L; } knob.style.transform = `translate(${dx}px,${dy}px)`; inp.x = dx / R; inp.z = dy / R; if (Math.abs(inp.x) < .12) inp.x = 0; if (Math.abs(inp.z) < .12) inp.z = 0; };
  el.addEventListener('pointermove', mv); const up = e => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; inp.x = inp.z = 0; }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  const bJ = $('bJ'), bS = $('bS'); bJ.addEventListener('pointerdown', e => { e.preventDefault(); A.ac(); inp.jump = 1; inp.held = 1; bJ.classList.add('on'); }); const ju = () => { inp.held = 0; bJ.classList.remove('on'); }; bJ.addEventListener('pointerup', ju); bJ.addEventListener('pointercancel', ju); bJ.addEventListener('pointerleave', ju);
  bS.addEventListener('pointerdown', e => { e.preventDefault(); A.ac(); inp.spin = 1; bS.classList.add('on'); }); const su = () => bS.classList.remove('on'); bS.addEventListener('pointerup', su); bS.addEventListener('pointercancel', su); bS.addEventListener('pointerleave', su); })();
const keys = {}; addEventListener('keydown', e => { if (keys[e.code]) return; keys[e.code] = 1; A.ac(); if (e.code === 'Space' || e.code === 'KeyW' && false) { inp.jump = 1; inp.held = 1; e.preventDefault(); } if (['KeyX', 'KeyK', 'ShiftLeft', 'ShiftRight', 'KeyJ'].includes(e.code)) inp.spin = 1; if (e.code === 'Escape' || e.code === 'KeyP') state === 'play' ? pause() : state === 'pause' && $('pGo').onclick(); kb(); });
addEventListener('keyup', e => { keys[e.code] = 0; if (e.code === 'Space') inp.held = 0; kb(); });
function kb() { if (isTouch && !keys.ArrowLeft && !keys.ArrowRight && !keys.ArrowUp && !keys.ArrowDown && !keys.KeyA && !keys.KeyD && !keys.KeyW && !keys.KeyS) return; inp.x = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0); inp.z = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0); if (inp.x && inp.z) { inp.x *= .72; inp.z *= .72; } }
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (state === 'play') pause(); A.stopMusic(); } });

/* ================= LOOP ================= */
let last = performance.now();
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.033, (now - last) / 1000); last = now; A.tick && A.tick(); const t = now / 1000;
  if (state === 'play') { playT += dt; PL.inv = Math.max(0, PL.inv - dt); stepPlayer(dt / 2); stepPlayer(dt / 2); const row = Math.floor(-PL.p.z); for (const k in LV.tips) if (row >= +k && !LV.shown[k]) { LV.shown[k] = 1; tip(LV.tips[k]); }
    if (LV.goal && Math.abs(PL.p.z - LV.goal.z) < .6 && Math.abs(PL.p.x - LV.goal.x) < 1.3 && PL.p.y < LV.goal.y + 2.5) win(); }
  if (state === 'dead' && PL.deadT > 1.5) { lives--; updHud(); if (lives <= 0) { state = 'over'; gameOver(); } else { respawn(); state = 'play'; } }
  if (state === 'win') { endT += dt; PL.v.set(0, 0, 0); PL.face += dt * 6; if (endT > .2 && Math.random() < .3) confettiAt(PL.p); if (endT > 1.7) { state = 'end'; showEnd(); } }
  if (LV) { stepWorld(dt, t); stepBoss(dt, t); animKibo(dt, t); updCam(dt); }
  if (tipT > 0) { tipT -= dt; if (tipT <= 0) $('tip').classList.remove('on'); }
  FX.update(dt, .02); GL.update(dt); E.render(); }

hubButtons(['homeT'], A); $('homeT').innerHTML = ICO.home('#2a3a12'); qualityButton('qBtn', S);
if (EN) { document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr'; }
E.resize(); toTitle(); setTimeout(() => { $('loading').hidden = true; requestAnimationFrame(frame); window.__kbOK = true; }, 30);
window.__kb = { get BS() { return BS; }, nuts, stepBoss, set statePlay(v) { state = v; }, respawn, stepWorld, PL, inp, get LV() { return LV; }, get state() { return state; }, startLevel, crates, enemies, fruits, plats, stepPlayer, updCam, buildLevel, toTitle, win, get lives() { return lives; }, get fruitN() { return fruitN; }, get crateN() { return crateN; }, set state(v) { state = v; } };
