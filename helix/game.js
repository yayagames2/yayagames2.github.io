import { THREE, $, V3, C, clamp, lerp, rnd, rng, T, store, engine, studioEnv, cnv, ctex, particles, CONFETTI, audio, toast, ICO, hubButtons, soundButton, qualityButton } from '../lib/kit.js';

const S = store('helix-save', { level: 1, best: 0, bestLv: 1, coins: 0, skin: 0, owned: [0], tut: 0 });
const E = engine(S, { fov: 46, far: 300, bloom: [.16, .4, .9], exposure: .92, vignette: .3, sat: 1.2 });
const { scene, camera, renderer } = E; studioEnv(E, '#ffffff', '#8a7ab8', .38);
const A = audio(S); const FX = particles(E, 1600); const GLOW = particles(E, 400, true);
const TAU = Math.PI * 2, NS = 12, W = TAU / NS, GAP = 3.4, R0 = .52, R1 = 2.15, TH = .36, BR = .34, BRAD = 1.33, GRAV = 30, BOUNCE = 9.8;

/* ================= THEMES ================= */
const THEMES = [
  { n: 'candy', top: '#ffb0e0', bot: '#6a4ae8', plat: ['#14b8b0', '#1a9ad0'], pole: '#ffe8f6', danger: '#ff1a3a' },
  { n: 'ocean', top: '#6ad8ff', bot: '#123a9a', plat: ['#ffb414', '#ff8a1a'], pole: '#eaf6ff', danger: '#e8103a' },
  { n: 'sunset', top: '#ffb25a', bot: '#b82a6a', plat: ['#3a2a8a', '#5a32b8'], pole: '#fff0d8', danger: '#ff1a1a' },
  { n: 'neon', top: '#2a0a5a', bot: '#05051a', plat: ['#10d8b8', '#e02ac0'], pole: '#b8b8ff', danger: '#ff2a2a' },
  { n: 'jungle', top: '#c8ff9a', bot: '#148a5a', plat: ['#ff6a14', '#ffb414'], pole: '#ffffff', danger: '#c8102a' },
];
const theme = lv => THEMES[Math.floor((lv - 1) / 3) % THEMES.length];

/* ================= SKINS ================= */
const SKINS = [
  { n: T('בועי', 'Bubbles'), p: 0, c: '#ff5ab0', face: 1, tr: [3, .7, 1.8] },
  { n: T('שמשי', 'Sunny'), p: 150, c: '#ffd23a', face: 1, tr: [3, 2.4, .4] },
  { n: T('ליים', 'Limey'), p: 250, c: '#7aff4a', face: 2, tr: [1, 3, .6] },
  { n: T('פנדה', 'Panda'), p: 400, c: '#ffffff', face: 3, tr: [2.6, 2.6, 2.6] },
  { n: T('כדורסל', 'Hoops'), p: 550, c: '#ff8a2a', pat: 'ball', tr: [3, 1.4, .3] },
  { n: T('אבטיח', 'Melon'), p: 700, c: '#2ac84a', pat: 'melon', tr: [3, .6, .8] },
  { n: T('כוכב לכת', 'Planet'), p: 950, c: '#9a6aff', pat: 'planet', ring: 1, tr: [1.6, 1, 3] },
  { n: T('דיסקו', 'Disco'), p: 1250, c: '#d8d8e8', pat: 'disco', metal: 1, tr: [2.4, 2.4, 3] },
  { n: T('אש', 'Blaze'), p: 1600, c: '#ff5a1a', pat: 'fire', glow: 1, tr: [3, 1.2, .2] },
  { n: T('גלקסיה', 'Galaxy'), p: 2000, c: '#1a1a5a', pat: 'galaxy', glow: 1, tr: [1.2, 1.6, 3] },
];
function skinCanvas(k, sz = 256) { const s = SKINS[k], c = cnv(sz * 2, sz), x = c.getContext('2d'), w = sz * 2, h = sz; x.fillStyle = s.c; x.fillRect(0, 0, w, h);
  if (s.pat === 'ball') { x.strokeStyle = '#3a1a00'; x.lineWidth = sz * .035; x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); for (const cx of [w * .25, w * .75]) { x.moveTo(cx, 0); x.lineTo(cx, h); } x.stroke(); x.beginPath(); x.ellipse(w / 2, h / 2, w * .18, h * .5, 0, 0, TAU); x.stroke(); }
  if (s.pat === 'melon') { for (let i = 0; i < 14; i++) { x.fillStyle = '#0a6a2a'; x.beginPath(); const cx = i / 14 * w; x.moveTo(cx, 0); for (let y = 0; y <= h; y += 8) x.lineTo(cx + Math.sin(y * .08 + i) * 8 + 10, y); for (let y = h; y >= 0; y -= 8) x.lineTo(cx + Math.sin(y * .08 + i) * 8 - 2, y); x.fill(); } }
  if (s.pat === 'planet') { for (let i = 0; i < 9; i++) { x.fillStyle = ['#ff8ad8', '#6a3ad8', '#b88aff', '#ffd2f0'][i % 4]; x.fillRect(0, h * (.1 + i * .09), w, h * .05 + Math.sin(i) * 4); } }
  if (s.pat === 'disco') { const n = 24; for (let j = 0; j < n / 2; j++) for (let i = 0; i < n; i++) { const v = 140 + Math.random() * 115 | 0; x.fillStyle = `rgb(${v},${v},${v + 10})`; x.fillRect(i * w / n + 1, j * h / (n / 2) + 1, w / n - 2, h / (n / 2) - 2); } }
  if (s.pat === 'fire') { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffe24a'); g.addColorStop(.5, '#ff6a1a'); g.addColorStop(1, '#c81a0a'); x.fillStyle = g; x.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,240,120,${Math.random() * .5})`; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, Math.random() * 18 + 4, 0, TAU); x.fill(); } }
  if (s.pat === 'galaxy') { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#1a0a4a'); g.addColorStop(.5, '#3a1a8a'); g.addColorStop(1, '#0a1a5a'); x.fillStyle = g; x.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '255,120,220' : '120,200,255'},.25)`; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, Math.random() * 40 + 10, 0, TAU); x.fill(); } for (let i = 0; i < 160; i++) { x.fillStyle = '#fff'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }
  // face on the front (u≈.75 faces +z after our rotation)
  const fx = w * .75, fy = h * .5;
  if (s.face === 3) { x.fillStyle = '#1a1a22'; for (const d of [-1, 1]) { x.beginPath(); x.ellipse(fx + d * sz * .09, fy - sz * .02, sz * .06, sz * .085, d * .5, 0, TAU); x.fill(); x.beginPath(); x.arc(fx + d * sz * .17, fy - sz * .3, sz * .07, 0, TAU); x.fill(); } }
  if (s.face) { for (const d of [-1, 1]) { x.fillStyle = s.face === 3 ? '#fff' : '#1a1a2a'; x.beginPath(); x.arc(fx + d * sz * .085, fy - sz * .03, sz * .04, 0, TAU); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(fx + d * sz * .085 + sz * .012, fy - sz * .045, sz * .014, 0, TAU); x.fill(); }
    x.strokeStyle = '#1a1a2a'; x.lineWidth = sz * .022; x.lineCap = 'round'; x.beginPath(); x.arc(fx, fy + sz * .03, sz * .07, .25, Math.PI - .25); x.stroke();
    x.fillStyle = 'rgba(255,90,120,.45)'; for (const d of [-1, 1]) { x.beginPath(); x.ellipse(fx + d * sz * .16, fy + sz * .05, sz * .045, sz * .028, 0, 0, TAU); x.fill(); } }
  return c; }

/* ================= WORLD ================= */
const skyU = { a: { value: C('#ff9ad8') }, b: { value: C('#7a5aff') }, t: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'uniform vec3 a; uniform vec3 b; uniform float t; varying vec3 vP; void main(){ vec3 n = normalize(vP); float h = n.y*.5+.5; float w = sin(n.x*6.+t*.3)*sin(n.z*5.-t*.2)*.04; vec3 c = mix(b, a, smoothstep(.15,.85,h+w)); gl_FragColor = vec4(c,1.); }' }));
scene.add(sky);
scene.add(new THREE.HemisphereLight('#ffffff', '#5a4a98', .55)); const sun = new THREE.DirectionalLight('#ffffff', 2.4); sun.position.set(4, 10, 8); sun.castShadow = renderer.shadowMap.enabled; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 6, bottom: -6, near: 1, far: 40 }); sun.shadow.bias = -.0008; scene.add(sun, sun.target);
const rim = new THREE.DirectionalLight('#ffd8ff', 1.1); rim.position.set(-6, 3, -6); scene.add(rim);
// floating bokeh orbs
const orbs = new THREE.Group(); scene.add(orbs); const orbT = (() => { const c = cnv(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.4, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
for (let i = 0; i < 46; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: orbT, transparent: true, depthWrite: false, opacity: rnd(.15, .45), blending: THREE.AdditiveBlending })); const a = rnd(0, TAU), r = rnd(9, 26); s.position.set(Math.sin(a) * r, rnd(-30, 8), -Math.abs(Math.cos(a) * r) - 4); s.scale.setScalar(rnd(.6, 2.6)); s.userData.sp = rnd(.2, .7); orbs.add(s); }

// slice geometry (annular sector, extruded, bevelled)
const sliceGeo = (() => { const s = new THREE.Shape(), a0 = .012, a1 = W - .012, P = (r, a) => [r * Math.sin(a), -r * Math.cos(a)];
  s.moveTo(...P(R0, a0)); for (let i = 0; i <= 10; i++) s.lineTo(...P(R1, a0 + (a1 - a0) * i / 10)); for (let i = 10; i >= 0; i--) s.lineTo(...P(R0, a0 + (a1 - a0) * i / 10)); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: TH - .1, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 3, curveSegments: 4 }); g.rotateX(-Math.PI / 2); g.translate(0, -(TH - .1) - .05, 0); g.computeVertexNormals(); return g; })();
const splatT = (() => { const c = cnv(128, 128), x = c.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); x.arc(64, 64, 34, 0, TAU); x.fill(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + Math.random() * .3, r = 36 + Math.random() * 20; x.beginPath(); x.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 5 + Math.random() * 7, 0, TAU); x.fill(); } return new THREE.CanvasTexture(c); })();
const splatG = new THREE.PlaneGeometry(.75, .75).rotateX(-Math.PI / 2);
let platM, platM2, dangerM, goalM, poleM;
function mkMats(th) {
  platM = new THREE.MeshPhysicalMaterial({ color: C(th.plat[0]), roughness: .28, clearcoat: 1, clearcoatRoughness: .1, metalness: .05 });
  platM2 = new THREE.MeshPhysicalMaterial({ color: C(th.plat[1]), roughness: .28, clearcoat: 1, clearcoatRoughness: .1, metalness: .05 });
  dangerM = new THREE.MeshPhysicalMaterial({ color: C(th.danger), emissive: C(th.danger), emissiveIntensity: .55, roughness: .3, clearcoat: 1 });
  goalM = new THREE.MeshPhysicalMaterial({ color: C('#ffffff'), emissive: C('#ffe27a'), emissiveIntensity: .35, roughness: .2, clearcoat: 1, metalness: .2 });
  const c = cnv(256, 256), x = c.getContext('2d'); x.fillStyle = th.pole; x.fillRect(0, 0, 256, 256); x.fillStyle = th.plat[0]; x.globalAlpha = .55;
  for (let i = -2; i < 4; i++) { x.beginPath(); x.moveTo(i * 128, 256); x.lineTo(i * 128 + 48, 256); x.lineTo(i * 128 + 48 + 256, 0); x.lineTo(i * 128 + 256, 0); x.fill(); } x.globalAlpha = 1;
  poleM = new THREE.MeshPhysicalMaterial({ map: ctex(c, 2, 10), roughness: .25, clearcoat: 1 }); }

/* ================= LEVEL ================= */
const tower = new THREE.Group(); scene.add(tower); let plats = [], debris = [], splats = [], pole = null;
let level = S.level, rot = 0, rotV = 0, state = 'title', curTheme = theme(level);
function buildLevel(lv) {
  for (const p of plats) tower.remove(p.g); plats = []; for (const d of debris) scene.remove(d.m); debris = []; splats = []; if (pole) tower.remove(pole);
  curTheme = theme(lv); mkMats(curTheme); skyU.a.value.set(curTheme.top); skyU.b.value.set(curTheme.bot); scene.fog = new THREE.Fog(C(curTheme.bot), 22, 70);
  const r = rng(lv * 7919 + 13), n = Math.min(10 + lv * 2, 46), dangerN = Math.min(6, 1 + Math.floor(lv / 2)), moveP = lv >= 5 ? Math.min(.35, .08 + lv * .015) : 0;
  for (let k = 0; k < n; k++) { const g = new THREE.Group(); g.position.y = -k * GAP; tower.add(g); const types = new Array(NS).fill(0);
    const gs = k === 0 ? 3 + Math.floor(r() * 6) : Math.floor(r() * NS), gl = k === 0 ? 3 : r() < Math.max(.25, .7 - lv * .05) ? 3 : 2; for (let i = 0; i < gl; i++) types[(gs + i) % NS] = 1;
    if (k > 1) { const dn = Math.min(NS - gl - 2, Math.floor(r() * (dangerN + 1)) + (lv > 3 ? 1 : 0)); let tries = 0; for (let i = 0; i < dn && tries < 50; tries++) { const j = Math.floor(r() * NS); if (types[j] || types[(j + 1) % NS] === 1 && r() < .5) continue; types[j] = 2; i++; } }
    const slices = types.map((t, i) => { if (t === 1) return { t, m: null }; const m = new THREE.Mesh(sliceGeo, t === 2 ? dangerM : (k % 2 ? platM2 : platM)); m.rotation.y = i * W; m.castShadow = m.receiveShadow = true; g.add(m); return { t, m }; });
    const mv = k > 2 && r() < moveP ? (r() < .5 ? -1 : 1) * (.5 + r() * .7) : 0; plats.push({ g, y: -k * GAP, slices, rp: (k === 0 ? 0 : r() * TAU), mv, done: false }); g.rotation.y = plats[k].rp; }
  // the very first platform: put the gap away from the ball so the player learns to spin
  // goal ring
  const gy = -n * GAP, gg = new THREE.Group(); gg.position.y = gy; tower.add(gg); const gs2 = []; for (let i = 0; i < NS; i++) { const m = new THREE.Mesh(sliceGeo, goalM); m.rotation.y = i * W; m.receiveShadow = true; gg.add(m); gs2.push({ t: 3, m }); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R1 + .15, .12, 10, 48), new THREE.MeshBasicMaterial({ color: '#ffe24a' })); ring.rotation.x = Math.PI / 2; ring.position.y = -.05; gg.add(ring);
  plats.push({ g: gg, y: gy, slices: gs2, rp: 0, mv: 0, goal: true, ring });
  pole = new THREE.Mesh(new THREE.CylinderGeometry(R0 - .02, R0 - .02, n * GAP + 12, 24), poleM); pole.position.y = gy / 2 + 2; pole.castShadow = pole.receiveShadow = true; tower.add(pole);
  totalFloors = n; }
let totalFloors = 0;

/* ================= BALL ================= */
const ballG = new THREE.Group(); scene.add(ballG); let ballM = null, ringM = null;
function mkBall() { if (ballM) ballG.remove(ballM); if (ringM) ballG.remove(ringM); const s = SKINS[S.skin], t = new THREE.CanvasTexture(skinCanvas(S.skin)); t.colorSpace = THREE.SRGBColorSpace;
  ballM = new THREE.Mesh(new THREE.SphereGeometry(BR, 40, 28), new THREE.MeshPhysicalMaterial({ map: t, roughness: s.metal ? .15 : .25, metalness: s.metal ? .8 : 0, clearcoat: 1, clearcoatRoughness: .08, emissive: s.glow ? C(s.c) : C('#000'), emissiveIntensity: s.glow ? .35 : 0 }));
  ballM.rotation.y = Math.PI; ballM.castShadow = true; ballG.add(ballM);
  ringM = null; if (s.ring) { ringM = new THREE.Mesh(new THREE.TorusGeometry(BR * 1.55, .035, 8, 40), new THREE.MeshStandardMaterial({ color: '#ffd8a8', roughness: .4 })); ringM.rotation.set(1.2, 0, .3); ballG.add(ringM); } }
const B = { y: 1.5, vy: 0, combo: 0, sq: 0, fever: 0, dead: false, lastP: 0 };
let score = 0, lvScore = 0, camY = 3, shake = 0, passed = 0, runCoins = 0, flash = 0;

/* ================= FLOW ================= */
function resetBall() { B.y = plats.length ? 1.2 : 1.5; B.vy = 0; B.combo = 0; B.sq = 0; B.fever = 0; B.dead = false; passed = 0; camY = 3; ballG.position.set(0, B.y, BRAD); ballG.visible = true; }
function startLevel() { buildLevel(level); resetBall(); rot = 0; tower.rotation.y = 0; lvScore = score; $('lvA').textContent = level; $('lvB').textContent = level + 1; const c = curTheme.plat[0]; $('lvA').style.background = $('lvB').style.background = c; $('lvI').style.background = c; $('lvI').style.width = '0%'; $('score').textContent = score; }
function play(fresh) { A.ac(); if (fresh) { score = 0; runCoins = 0; } state = 'play'; $('title').hidden = true; $('endSheet').hidden = true; $('pauseSheet').hidden = true; $('hud').hidden = false; $('lvbar').hidden = false; $('score').hidden = false; startLevel(); A.startMusic({ chords: [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 55]], bpm: 112, vol: .8 });
  if (!S.tut) { $('hint').hidden = false; $('hint').textContent = T('👈 גוררים כדי לסובב את המגדל 👉', '👈 Drag to spin the tower 👉'); } updCoins(); }
function showTitle() { state = 'title'; A.stopMusic(); $('title').hidden = false; $('hud').hidden = true; $('lvbar').hidden = true; $('score').hidden = true; $('endSheet').hidden = true; $('pauseSheet').hidden = true; $('hint').hidden = true; $('tBest').textContent = S.best; $('tCoins').textContent = S.coins; $('goBtn').textContent = T('שלב ', 'Level ') + S.level + ' ▶'; buildLevel(S.level); level = S.level; resetBall(); }
function updCoins() { $('coinTxt').textContent = S.coins; }
function die() { if (B.dead) return; B.dead = true; state = 'dead'; ballG.visible = false; shake = .5; flash = 1; A.noise(.4, 'lowpass', 900, 1, .25); A.tone(300, .5, 'sawtooth', .07, 0, 80);
  const s = SKINS[S.skin]; for (let i = 0; i < 60; i++) FX.emit(V3(0, B.y, BRAD), V3(rnd(-5, 5), rnd(1, 7), rnd(-1, 6)), s.tr.map(v => v / 3), rnd(.08, .16), rnd(.6, 1.2), 14, 1, .97);
  if (score > S.best) S.best = score; S.save();
  setTimeout(() => { $('eE').textContent = '💥'; $('eT').textContent = T('אופס! נגעתם באדום', 'Oops! You hit red'); const pct = Math.round(passed / totalFloors * 100); $('eP').innerHTML = `${T('שלב', 'Level')} ${level} · ${pct}%<br>${T('ניקוד', 'Score')}: ${score} · 🏆 ${S.best}`; $('eAgain').textContent = T('שוב! 🔄', 'Retry! 🔄'); $('endSheet').hidden = false; score = lvScore; }, 900); }
function win() { state = 'win'; const gain = 10 + level * 2; S.coins += gain; runCoins += gain; A.tone(660, .15, 'triangle', .08); A.tone(880, .15, 'triangle', .08, .12); A.tone(1320, .35, 'triangle', .08, .24); A.voice('yay', 1.4);
  for (let i = 0; i < 140; i++) { const a = rnd(0, TAU); FX.emit(V3(Math.sin(a) * 1.5, B.y + .2, Math.cos(a) * 1.5), V3(Math.sin(a) * rnd(1, 4), rnd(5, 11), Math.cos(a) * rnd(1, 4)), CONFETTI[i % 5], rnd(.08, .14), rnd(1.4, 2.4), 9, 1, .985); }
  combo(T('שלב הושלם!', 'Level complete!') + ` +${gain}🪙`, true); level++; if (level > S.level) S.level = level; if (level > S.bestLv) S.bestLv = level; if (score > S.best) S.best = score; S.save(); updCoins();
  setTimeout(() => { if (state === 'win') { state = 'play'; startLevel(); } }, 1800); }
function combo(txt, f) { const d = document.createElement('div'); d.textContent = txt; if (f) d.className = 'f'; $('combo').appendChild(d); setTimeout(() => d.remove(), 1000); }
function explodePlat(p, smash) { p.done = true; const wp = new THREE.Vector3(); p.slices.forEach((s, si) => { if (!s.m) return; const a = si * W + W / 2 + rot + p.rp; s.m.getWorldPosition(wp); const q = new THREE.Quaternion(); s.m.getWorldQuaternion(q); p.g.remove(s.m); s.m.position.copy(wp); s.m.quaternion.copy(q); s.m.material = s.m.material.clone(); s.m.material.transparent = true; scene.add(s.m);
    const out = V3(Math.sin(a), 0, Math.cos(a)); debris.push({ m: s.m, v: out.multiplyScalar(rnd(4, 8) * (smash ? 1.4 : 1)).add(V3(0, rnd(2, 6), 0)), av: V3(rnd(-4, 4), rnd(-4, 4), rnd(-4, 4)), life: 1.1 }); });
  if (p.ring) p.ring.visible = false; }

/* ================= INPUT ================= */
let drag = null; const keys = {};
$('stage').addEventListener('pointerdown', e => { if (state !== 'play' && state !== 'title') return; drag = { x: e.clientX, id: e.pointerId }; A.ac(); });
addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; const dx = e.clientX - drag.x; drag.x = e.clientX; const k = 3.6 / Math.min(innerWidth, 700); rot += dx * k; rotV = dx * k * 60; if (state === 'play' && !S.tut && Math.abs(dx) > 2) { S.tut = 1; S.save(); $('hint').hidden = true; } });
addEventListener('pointerup', e => { if (drag && e.pointerId === drag.id) drag = null; }); addEventListener('pointercancel', () => drag = null);
addEventListener('keydown', e => { keys[e.key] = 1; }); addEventListener('keyup', e => { keys[e.key] = 0; });

/* ================= STEP ================= */
const sliceAt = p => { const a = ((-(rot + p.g.rotation.y - 0) % TAU) + TAU) % TAU; return p.slices[Math.floor(a / W) % NS]; };
function step(dt) {
  if (keys.ArrowLeft) rot -= 3.4 * dt; if (keys.ArrowRight) rot += 3.4 * dt;
  tower.rotation.y = rot; for (const p of plats) if (p.mv && !p.done) { p.rp += p.mv * dt; p.g.rotation.y = p.rp; }
  if (state !== 'play') return;
  const y0 = B.y; B.vy -= GRAV * dt; B.y += B.vy * dt;
  for (let i = 0; i < plats.length; i++) { const p = plats[i]; if (p.done) continue; const top = p.y;
    if (y0 - BR >= top - .001 && B.y - BR < top && B.vy < 0) { const s = sliceAt(p);
      if (p.goal) { B.y = top + BR; B.vy = BOUNCE * .7; bounceFx(p, s); win(); return; }
      if (s.t === 1) { // fall through
        explodePlat(p, false); B.combo++; passed++; const add = B.combo * (1 + Math.floor(level / 4)); score += add; S.coins += 1; runCoins++; updCoins(); $('score').textContent = score;
        A.noise(.16, 'bandpass', 900 + B.combo * 200, 2, .08); A.tone(400 + B.combo * 90, .08, 'triangle', .04);
        if (B.combo === 3) { combo('🔥 ' + T('אש!', 'FEVER!'), true); A.tone(880, .25, 'sawtooth', .05, 0, 1400); }
        else if (B.combo >= 2) combo('+' + add);
        continue; }
      if (B.combo >= 3) { // smash through anything
        explodePlat(p, true); passed++; score += 5 * B.combo; $('score').textContent = score; shake = .3; flash = .6; A.noise(.35, 'lowpass', 1400, 1, .22); A.tone(140, .3, 'square', .07, 0, 60); combo('💥 ' + T('ריסוק!', 'SMASH!') + ' +' + 5 * B.combo, true);
        B.y = top + BR; B.vy = BOUNCE * .75; B.combo = 0; B.sq = 1; continue; }
      if (s.t === 2) { B.y = top + BR; die(); return; }
      B.y = top + BR; B.vy = BOUNCE; bounceFx(p, s); if (B.combo >= 2) combo(T('כל הכבוד!', 'Nice!')); B.combo = 0; } }
  const pct = clamp(passed / totalFloors, 0, 1); $('lvI').style.width = pct * 100 + '%';
}
function bounceFx(p, s) { B.sq = 1; A.tone(520 + Math.random() * 40, .07, 'sine', .07); A.noise(.05, 'lowpass', 600, 1, .05);
  const col = SKINS[S.skin].tr; for (let i = 0; i < 10; i++) FX.emit(V3(rnd(-.2, .2), B.y - BR + .05, BRAD + rnd(-.2, .2)), V3(rnd(-1.6, 1.6), rnd(1.2, 3), rnd(-1.2, 1.6)), col.map(v => v / 3), rnd(.05, .09), rnd(.3, .55), 9);
  if (s && s.m && splats.length < 60) { const m = new THREE.Mesh(splatG, new THREE.MeshBasicMaterial({ map: splatT, color: C(SKINS[S.skin].c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); const inv = new THREE.Matrix4().copy(s.m.matrixWorld).invert(); const lp = V3(rnd(-.08, .08), p.y + .006, BRAD).applyMatrix4(inv); m.position.copy(lp); m.position.y = .006; m.rotation.y = rnd(0, TAU); m.scale.setScalar(rnd(.75, 1)); s.m.add(m); splats.push(m); } }

/* ================= LOOP ================= */
let last = performance.now();
function loop(now) { requestAnimationFrame(loop); const dt = Math.min(.04, (now - last) / 1000); last = now; const t = now / 1000; A.tick();
  if (state === 'title') { rot += dt * .35; B.vy -= GRAV * dt; B.y += B.vy * dt; if (B.y - BR < 0 && B.vy < 0) { B.y = BR; B.vy = BOUNCE * .92; B.sq = 1; } }
  if (state === 'win') { B.vy -= GRAV * dt; B.y += B.vy * dt; const gt = plats[plats.length - 1].y; if (B.y - BR < gt && B.vy < 0) { B.y = gt + BR; B.vy = BOUNCE * .6; B.sq = 1; } }
  if (state !== 'pause') step(dt);
  // ball pose: squash & stretch, fever flames
  B.sq = Math.max(0, B.sq - dt * 5); const st = clamp(Math.abs(B.vy) / 25, 0, .25); const sq = B.sq * .35;
  ballG.position.set(0, B.y - sq * BR * .5, BRAD); ballG.scale.set(1 + sq * .5, 1 - sq + st * .4, 1 + sq * .5 - st * .2);
  if (ringM) ringM.rotation.z += dt * .6;
  if (state === 'play' || state === 'win') { const s = SKINS[S.skin], c = B.combo >= 3 ? [3, 1.4, .3] : s.tr; if (Math.random() < (B.combo >= 3 ? 1 : .5)) { (B.combo >= 3 ? GLOW : FX).emit(V3(rnd(-.12, .12), B.y + rnd(-.1, .1), BRAD + rnd(-.1, .1)), V3(rnd(-.3, .3), B.combo >= 3 ? rnd(1, 3) : rnd(.2, .8), rnd(-.3, .3)), c.map(v => v / (B.combo >= 3 ? 1.5 : 3)), B.combo >= 3 ? rnd(.18, .3) : rnd(.06, .1), B.combo >= 3 ? .35 : .4, 0, .9); } }
  for (let i = debris.length - 1; i >= 0; i--) { const d = debris[i]; d.life -= dt; d.v.y -= 16 * dt; d.m.position.addScaledVector(d.v, dt); d.m.rotation.x += d.av.x * dt; d.m.rotation.z += d.av.z * dt; d.m.material.opacity = clamp(d.life / .6, 0, 1); if (d.life <= 0) { scene.remove(d.m); debris.splice(i, 1); } }
  for (const p of plats) if (p.goal && p.ring) p.ring.material.color.setHSL((t * .3) % 1, .9, .6);
  dangerM && (dangerM.emissiveIntensity = .45 + Math.sin(t * 6) * .2);
  // camera follows the ball downward only
  const ty = Math.min(camY, B.y); camY = lerp(camY, ty, Math.min(1, dt * 8)); shake = Math.max(0, shake - dt * 1.5); flash = Math.max(0, flash - dt * 2.5); E.grade.uniforms.uFlash.value = flash * .35;
  const sx = (Math.random() - .5) * shake * .4, sy = (Math.random() - .5) * shake * .4;
  if (state === 'title') { camera.position.set(0 + sx, 3.4, 8.6); camera.lookAt(0, .2, 0); }
  else { const land = innerWidth > innerHeight; camera.position.set(sx, camY + (land ? 3.4 : 4.6) + sy, land ? 8.8 : 9.6); camera.lookAt(0, camY - (land ? 2.2 : 1.6), 0); }
  sun.position.set(4, camY + 10, 8); sun.target.position.set(0, camY - 2, 0); sky.position.copy(camera.position); skyU.t.value = t;
  for (const o of orbs.children) { o.position.y += o.userData.sp * dt; if (o.position.y > camY + 10) o.position.y = camY - 30; if (o.position.y < camY - 32) o.position.y = camY + 8; }
  FX.update(dt); GLOW.update(dt); E.render(); }

/* ================= UI ================= */
function renderShop() { $('shopCoins').textContent = S.coins; $('skins').innerHTML = SKINS.map((s, i) => { const own = S.owned.includes(i); return `<button class="sk ${S.skin === i ? 'on' : ''}" data-k="${i}"><canvas data-c="${i}" width="112" height="112"></canvas><b>${s.n}</b><small>${own ? (S.skin === i ? T('נבחר ✔', 'Selected ✔') : T('בחרו', 'Select')) : '🪙 ' + s.p}</small></button>`; }).join('');
  $('skins').querySelectorAll('canvas').forEach(cv => { const k = +cv.dataset.c, src = skinCanvas(k, 128), x = cv.getContext('2d'); x.save(); x.beginPath(); x.arc(56, 56, 54, 0, TAU); x.clip(); x.drawImage(src, 64, 0, 128, 128, 0, 0, 112, 112); const g = x.createRadialGradient(40, 36, 4, 56, 56, 60); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.35, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)'); x.fillStyle = g; x.fillRect(0, 0, 112, 112); x.restore(); }); }
$('skins').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; const i = +b.dataset.k, s = SKINS[i]; if (!S.owned.includes(i)) { if (S.coins < s.p) { toast(T('צריך עוד מטבעות 🪙', 'Need more coins 🪙')); A.tone(200, .1, 'sine', .05); return; } S.coins -= s.p; S.owned.push(i); A.voice('yay', 1.3); } S.skin = i; S.save(); mkBall(); renderShop(); $('tCoins').textContent = S.coins; };
$('goBtn').onclick = () => { level = S.level; play(true); }; $('shopBtn').onclick = () => { A.ac(); renderShop(); $('shopSheet').hidden = false; }; $('shopClose').onclick = () => $('shopSheet').hidden = true;
$('eAgain').onclick = () => { $('endSheet').hidden = true; play(false); }; $('eMenu').onclick = () => showTitle();
function pause() { if (state !== 'play') return; state = 'pause'; $('pauseSheet').hidden = false; }
$('pauseBtn').onclick = pause; $('pGo').onclick = () => { $('pauseSheet').hidden = true; state = 'play'; last = performance.now(); }; $('pMenu').onclick = () => showTitle();
$('pauseBtn').innerHTML = ICO.pause('#ffffff'); $('homeT').innerHTML = ICO.home('#ffffff'); soundButton('sndBtn', S, A, '#2a1a4a'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('shopBtn').textContent = T('🎨 כדורים', '🎨 Balls'); $('shopT').textContent = T('כדורים', 'Balls'); $('shopClose').textContent = T('סגירה', 'Close'); $('eMenu').textContent = T('תפריט', 'Menu'); $('pT').textContent = T('הפסקה', 'Paused'); $('pGo').textContent = T('המשך ▶', 'Resume ▶'); $('pMenu').textContent = T('תפריט', 'Menu');
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
mkBall();
setTimeout(() => { E.resize(); showTitle(); $('loading').hidden = true; requestAnimationFrame(loop); }, 30);
window.__hx = { get state() { return state; }, get B() { return B; }, get plats() { return plats; }, get rot() { return rot; }, set rot(v) { rot = v; }, play, step, sliceAt, win, die, get level() { return level; }, set level(v) { level = v; } };
