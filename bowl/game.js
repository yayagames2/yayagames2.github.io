import { THREE, $, V3, C, clamp, lerp, rnd, T, store, engine, studioEnv, cnv, ctex, particles, CONFETTI, audio, toast, ICO, hubButtons, soundButton, qualityButton } from '../lib/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const S = store('bowl-save', { best: 0, coins: 0, skin: 0, owned: [0], mode: 'cpu', np: 2, lvl: 1, games: 0, strikes: 0, tut: 0 });
const E = engine(S, { fov: 50, far: 120, bloom: [.55, .5, .78], exposure: 1.0, vignette: .3, sat: 1.15 });
const { scene, camera, renderer } = E; studioEnv(E, '#ffd8ff', '#2a1a4a', .45);
const A = audio(S); const FX = particles(E, 1500); const GLOW = particles(E, 300, true);
const TAU = Math.PI * 2, LW = .533, GW = .24, HEAD = -18.29, BR = .109, PH = .381, MB = 7, MP = 1.55;
const PIN0 = [[0, 0], [-.1524, -.264], [.1524, -.264], [-.3048, -.528], [0, -.528], [.3048, -.528], [-.4572, -.792], [-.1524, -.792], [.1524, -.792], [.4572, -.792]].map(([x, z]) => [x, HEAD + z]);
const DECK_END = HEAD - 1.05;

/* ================= SKINS ================= */
const SKINS = [
  { n: T('קלאסי', 'Classic'), p: 0, a: '#e8202a', b: '#5a0a12', pat: 'swirl' },
  { n: T('גלקסיה', 'Galaxy'), p: 200, a: '#3a1a9a', b: '#0a0a3a', pat: 'galaxy' },
  { n: T('ממתק', 'Candy'), p: 350, a: '#ff7ad8', b: '#ffffff', pat: 'swirl' },
  { n: T('אמרלד', 'Emerald'), p: 500, a: '#1ad87a', b: '#0a4a2a', pat: 'swirl' },
  { n: T('קרח', 'Ice'), p: 700, a: '#bff4ff', b: '#3a9ad8', pat: 'swirl' },
  { n: T('אבטיח', 'Melon'), p: 850, a: '#2ac84a', b: '#0a6a2a', pat: 'melon' },
  { n: T('פנדה', 'Panda'), p: 1000, a: '#ffffff', b: '#1a1a22', pat: 'panda' },
  { n: T('אש', 'Inferno'), p: 1300, a: '#ff6a1a', b: '#8a0a0a', pat: 'fire', glow: 1 },
  { n: T('דיסקו', 'Disco'), p: 1700, a: '#d8d8e8', b: '#8a8aa8', pat: 'disco', metal: 1 },
  { n: T('זהב', 'Gold'), p: 2500, a: '#ffd23a', b: '#a86a00', pat: 'swirl', metal: 1 },
];
function skinCanvas(k, sz = 256) { const s = SKINS[k], c = cnv(sz * 2, sz), x = c.getContext('2d'), w = sz * 2, h = sz; x.fillStyle = s.a; x.fillRect(0, 0, w, h);
  if (s.pat === 'swirl') { for (let i = 0; i < 26; i++) { x.strokeStyle = i % 2 ? s.b : 'rgba(255,255,255,.18)'; x.globalAlpha = .35; x.lineWidth = rnd(6, 26); x.beginPath(); const y0 = rnd(0, h); x.moveTo(0, y0); for (let xx = 0; xx <= w; xx += 16) x.lineTo(xx, y0 + Math.sin(xx * .02 + i) * rnd(14, 40)); x.stroke(); } x.globalAlpha = 1; }
  if (s.pat === 'galaxy') { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#1a0a4a'); g.addColorStop(.5, '#5a1aa8'); g.addColorStop(1, '#0a2a6a'); x.fillStyle = g; x.fillRect(0, 0, w, h); for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '255,120,220' : '120,200,255'},.22)`; x.beginPath(); x.arc(rnd(0, w), rnd(0, h), rnd(10, 50), 0, TAU); x.fill(); } for (let i = 0; i < 200; i++) { x.fillStyle = '#fff'; x.fillRect(rnd(0, w), rnd(0, h), 2, 2); } }
  if (s.pat === 'melon') { for (let i = 0; i < 14; i++) { x.fillStyle = s.b; x.beginPath(); const cx = i / 14 * w; x.moveTo(cx, 0); for (let y = 0; y <= h; y += 8) x.lineTo(cx + Math.sin(y * .08 + i) * 8 + 10, y); for (let y = h; y >= 0; y -= 8) x.lineTo(cx + Math.sin(y * .08 + i) * 8 - 2, y); x.fill(); } }
  if (s.pat === 'panda') { x.fillStyle = s.b; for (const [px, py, r] of [[.12, .3, .1], [.62, .3, .1], [.37, .75, .14], [.87, .75, .14]]) { x.beginPath(); x.arc(px * w, py * h, r * h, 0, TAU); x.fill(); } }
  if (s.pat === 'fire') { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffe24a'); g.addColorStop(.5, '#ff5a1a'); g.addColorStop(1, '#8a0a0a'); x.fillStyle = g; x.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,240,120,${Math.random() * .5})`; x.beginPath(); x.arc(rnd(0, w), rnd(0, h), rnd(4, 22), 0, TAU); x.fill(); } }
  if (s.pat === 'disco') { const n = 28; for (let j = 0; j < n / 2; j++) for (let i = 0; i < n; i++) { const v = 130 + Math.random() * 125 | 0; x.fillStyle = `rgb(${v},${v},${v + 12})`; x.fillRect(i * w / n + 1, j * h / (n / 2) + 1, w / n - 2, h / (n / 2) - 2); } }
  // finger holes
  x.fillStyle = 'rgba(0,0,0,.85)'; for (const [hx, hy, r] of [[.72, .38, .035], [.78, .38, .035], [.75, .55, .042]]) { x.beginPath(); x.ellipse(hx * w, hy * h, r * h * .7, r * h, 0, 0, TAU); x.fill(); }
  return c; }

/* ================= ALLEY ================= */
scene.background = C('#06031a'); scene.fog = new THREE.Fog('#0a0620', 26, 60);
scene.add(new THREE.HemisphereLight('#c8b8ff', '#1a0a2a', .55));
const key = new THREE.DirectionalLight('#ffffff', 1.4); key.position.set(2, 8, 4); key.castShadow = renderer.shadowMap.enabled; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -2, right: 2, top: 4, bottom: -4, near: 1, far: 30 }); key.shadow.bias = -.0006; scene.add(key, key.target);
const pinSpot = new THREE.SpotLight('#fff4e8', 13, 9, .45, .5, 1.3); pinSpot.position.set(0, 3.2, HEAD + 1.2); pinSpot.target.position.set(0, 0, HEAD - .4); pinSpot.castShadow = renderer.shadowMap.enabled; pinSpot.shadow.mapSize.set(1024, 1024); scene.add(pinSpot, pinSpot.target);
const laneTex = (() => { const c = cnv(512, 2048), x = c.getContext('2d'); const nb = 39; for (let i = 0; i < nb; i++) { const l = 62 + ((i * 37) % 11) - 5; x.fillStyle = `hsl(${32 + (i % 3) * 2},${52 + (i % 4) * 3}%,${l}%)`; x.fillRect(i * 512 / nb, 0, 512 / nb + 1, 2048); }
  for (let i = 0; i < 2400; i++) { x.fillStyle = `rgba(90,50,20,${Math.random() * .08})`; x.fillRect(Math.random() * 512, Math.random() * 2048, 1, rnd(10, 60)); }
  for (let i = 0; i < nb; i++) { x.fillStyle = 'rgba(60,30,10,.25)'; x.fillRect(i * 512 / nb, 0, 1, 2048); } return ctex(c, 1, 3); })();
const laneM = new THREE.MeshPhysicalMaterial({ map: laneTex, roughness: .22, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.2 });
const alley = new THREE.Group(); scene.add(alley);
function laneAt(cx, main) { const g = new THREE.Group(); g.position.x = cx; alley.add(g);
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(LW * 2, 23.6).rotateX(-Math.PI / 2), laneM); lane.position.set(0, 0, -9.3); lane.receiveShadow = true; g.add(lane);
  const app = new THREE.Mesh(new THREE.PlaneGeometry(LW * 2 + GW * 2, 5).rotateX(-Math.PI / 2), laneM); app.position.set(0, -.001, 2.5); app.receiveShadow = true; g.add(app);
  const gm = new THREE.MeshStandardMaterial({ color: '#2a2a3a', metalness: .7, roughness: .35 });
  for (const s of [-1, 1]) { const gu = new THREE.Mesh(new THREE.CylinderGeometry(GW / 2, GW / 2, 20.4, 16, 1, true, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI), gm); gu.position.set(s * (LW + GW / 2), 0, -9.9); g.add(gu);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(.06, .08, 22), new THREE.MeshStandardMaterial({ color: '#16101e', roughness: .5 })); cap.position.set(s * (LW + GW + .03), .04, -9.5); g.add(cap);
    // kickback walls at the pin deck
    const kb = new THREE.Mesh(new THREE.BoxGeometry(.06, .7, 2.2), new THREE.MeshStandardMaterial({ color: '#1a1030', roughness: .6 })); kb.position.set(s * (LW + GW + .03), .35, HEAD - .5); g.add(kb);
    if (main) { const neon = new THREE.Mesh(new THREE.BoxGeometry(.025, .025, 21), new THREE.MeshBasicMaterial({ color: s < 0 ? '#ff3ad8' : '#3ae8ff' })); neon.position.set(s * (LW + GW + .03), .095, -9.5); g.add(neon); } }
  // arrows & dots
  const am = new THREE.MeshBasicMaterial({ color: '#3a1a08' });
  for (let i = -3; i <= 3; i++) { const ar = new THREE.Mesh(new THREE.ConeGeometry(.025, .14, 3).rotateX(-Math.PI / 2), am); ar.scale.y = .02; ar.position.set(i * .127, .001, -4.6 - Math.abs(i) * .3); g.add(ar); const d = new THREE.Mesh(new THREE.CircleGeometry(.012, 10).rotateX(-Math.PI / 2), am); d.position.set(i * .127, .001, -2.1); g.add(d); }
  const foul = new THREE.Mesh(new THREE.PlaneGeometry(LW * 2 + GW * 2, .03).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#16101e' })); foul.position.set(0, .002, 0); g.add(foul);
  // pin deck back (pit curtain)
  const back = new THREE.Mesh(new THREE.PlaneGeometry(LW * 2 + GW * 2 + .2, 1.2), new THREE.MeshStandardMaterial({ color: '#0a0614', roughness: 1 })); back.position.set(0, .6, DECK_END - .7); g.add(back);
  const pit = new THREE.Mesh(new THREE.PlaneGeometry(LW * 2 + GW * 2, .9).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#05030a' })); pit.position.set(0, -.25, DECK_END - .4); g.add(pit);
  // masking unit with LED screen
  const mask = new THREE.Mesh(new THREE.BoxGeometry(LW * 2 + GW * 2 + .3, .55, .25), new THREE.MeshStandardMaterial({ color: '#140a24', roughness: .6 })); mask.position.set(0, 1.35, HEAD + 1.4); g.add(mask);
  return g; }
laneAt(0, true); const SIDE = 2.35; for (const s of [-2, -1, 1, 2]) laneAt(s * SIDE, false);
// LED screen on the masking unit
const ledC = cnv(512, 128), ledX = ledC.getContext('2d'), ledT = new THREE.CanvasTexture(ledC); ledT.colorSpace = THREE.SRGBColorSpace;
const led = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .38), new THREE.MeshBasicMaterial({ map: ledT, toneMapped: false })); led.position.set(0, 1.35, HEAD + 1.276 + .25); alley.add(led);
function drawLed(txt, col = '#ff4ad8', t = 0) { ledX.fillStyle = '#05020c'; ledX.fillRect(0, 0, 512, 128); ledX.font = '900 70px Arial'; ledX.textAlign = 'center'; ledX.textBaseline = 'middle'; ledX.shadowColor = col; ledX.shadowBlur = 24; ledX.fillStyle = col; ledX.fillText(txt, 256, 66);
  ledX.shadowBlur = 0; ledX.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < 128; y += 4) ledX.fillRect(0, y, 512, 1.5); for (let x = 0; x < 512; x += 4) ledX.fillRect(x, 0, 1.5, 128); ledT.needsUpdate = true; }
drawLed('STRIKE NIGHT');
// walls, ceiling & cosmic decor
const wallC = cnv(512, 256), wx = wallC.getContext('2d'); wx.fillStyle = '#0c0620'; wx.fillRect(0, 0, 512, 256); for (let i = 0; i < 90; i++) { wx.fillStyle = ['#ff3ad8', '#3ae8ff', '#ffe24a', '#7aff5a'][i % 4]; wx.globalAlpha = rnd(.3, .9); const r = rnd(1, 4); wx.beginPath(); wx.arc(rnd(0, 512), rnd(0, 256), r, 0, TAU); wx.fill(); } wx.globalAlpha = 1;
for (let i = 0; i < 6; i++) { wx.strokeStyle = ['#ff3ad8', '#3ae8ff', '#ffe24a'][i % 3]; wx.lineWidth = 3; wx.globalAlpha = .5; wx.beginPath(); wx.arc(rnd(0, 512), rnd(0, 256), rnd(14, 40), 0, TAU); wx.stroke(); } wx.globalAlpha = 1;
const wallM = new THREE.MeshStandardMaterial({ map: ctex(wallC, 4, 1), emissive: C('#ffffff'), emissiveMap: ctex(wallC, 4, 1), emissiveIntensity: .55, roughness: 1 });
const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 5), wallM); backWall.position.set(0, 2.2, DECK_END - .75); alley.add(backWall);
for (const s of [-1, 1]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(26, 5), wallM); sw.rotation.y = -s * Math.PI / 2; sw.position.set(s * 6.2, 2.2, -8); alley.add(sw); }
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 28).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#08041a', roughness: 1 })); ceil.position.set(0, 3.6, -8); alley.add(ceil);
for (let i = 0; i < 7; i++) { const z = -1 - i * 3; for (const [cx, col] of [[-3.5, '#ff3ad8'], [3.5, '#3ae8ff'], [0, '#b87aff']]) { const tb = new THREE.Mesh(new THREE.BoxGeometry(cx ? .05 : 2.2, .04, cx ? 2.2 : .05), new THREE.MeshBasicMaterial({ color: col })); tb.position.set(cx, 3.55, z); alley.add(tb); } }
// ball return
const ret = new THREE.Mesh(new RoundedBoxGeometry(.7, .55, 1.4, 3, .15), new THREE.MeshPhysicalMaterial({ color: '#2a1a5a', roughness: .3, clearcoat: 1 })); ret.position.set(-SIDE / 2, .28, 2.6); alley.add(ret);
const hood = new THREE.Mesh(new THREE.SphereGeometry(.32, 24, 12, 0, TAU, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#ff3ad8', roughness: .2, clearcoat: 1, transparent: true, opacity: .7 })); hood.position.set(-SIDE / 2, .55, 2.4); alley.add(hood);

/* ================= PINS ================= */
const pinTex = (() => { const c = cnv(64, 256), x = c.getContext('2d'); x.fillStyle = '#fbfaf6'; x.fillRect(0, 0, 64, 256); x.fillStyle = '#e8141e'; x.fillRect(0, 256 * (1 - .705), 64, 9); x.fillRect(0, 256 * (1 - .745), 64, 9); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const pinGeo = (() => { const pts = [[0, 0], [.026, 0], [.034, .006], [.046, .03], [.056, .07], [.0605, .115], [.059, .155], [.052, .195], [.04, .232], [.03, .262], [.0275, .282], [.03, .305], [.036, .335], [.034, .36], [.024, .376], [.008, .3805], [0, .381]].map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, 24); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < p.count; i++) uv.setY(i, p.getY(i) / PH); return g; })();
const pinM = new THREE.MeshPhysicalMaterial({ map: pinTex, roughness: .18, clearcoat: 1, clearcoatRoughness: .05 });
const pins = PIN0.map(([x, z], i) => { const m = new THREE.Mesh(pinGeo, pinM); m.castShadow = true; m.receiveShadow = true; scene.add(m); return { m, i, x, z, vx: 0, vz: 0, phi: 0, w: 0, dx: 0, dz: -1, y: 0, vy: 0, up: true, gone: false, yaw: rnd(0, TAU), yv: 0 }; });
// static pins on neighbour lanes (instanced)
const nPins = new THREE.InstancedMesh(pinGeo, pinM, 40); { let k = 0; const mm = new THREE.Matrix4(); for (const s of [-2, -1, 1, 2]) for (const [x, z] of PIN0) { mm.makeTranslation(s * SIDE + x, 0, z); nPins.setMatrixAt(k++, mm); } } scene.add(nPins);
const UPQ = new THREE.Quaternion(), tq = new THREE.Quaternion(), ax = new THREE.Vector3(), yq = new THREE.Quaternion();
function placePin(p) { p.m.visible = !p.gone || p.y > -1; const s = Math.sin(p.phi), c = Math.cos(p.phi);
  ax.set(p.dz, 0, -p.dx).normalize(); tq.setFromAxisAngle(ax, p.phi); yq.setFromAxisAngle(V3(0, 1, 0), p.yaw); p.m.quaternion.copy(tq).multiply(yq);
  // when lying, lift by the belly radius so it rests on the deck
  p.m.position.set(p.x, p.y + .05 * s, p.z); }
function resetPins(all) { for (let i = 0; i < 10; i++) { const p = pins[i]; if (all || (!p.gone && p.up)) { if (all) { p.x = PIN0[i][0]; p.z = PIN0[i][1]; } p.vx = p.vz = 0; p.phi = 0; p.w = 0; p.y = 0; p.vy = 0; p.up = true; p.gone = false; p.yv = 0; } else { p.gone = true; p.y = -5; } placePin(p); } }

/* ================= BALL ================= */
const ballG = new THREE.Group(); scene.add(ballG); let ballM;
const guideT = (() => { const c = cnv(32, 256), x = c.getContext('2d'); for (let y = 0; y < 256; y += 32) { const g = x.createLinearGradient(0, 0, 0, 256); x.fillStyle = `rgba(255,255,255,${.85 * (1 - y / 256)})`; x.beginPath(); x.moveTo(16, y + 4); x.lineTo(28, y + 22); x.lineTo(4, y + 22); x.fill(); } return new THREE.CanvasTexture(c); })();
const guide = new THREE.Mesh(new THREE.PlaneGeometry(.12, 5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: guideT, transparent: true, depthWrite: false, color: '#9af0ff' })); guide.position.y = .004; scene.add(guide);
function mkBall() { if (ballM) ballG.remove(ballM); const s = SKINS[S.skin], t = new THREE.CanvasTexture(skinCanvas(S.skin)); t.colorSpace = THREE.SRGBColorSpace;
  ballM = new THREE.Mesh(new THREE.SphereGeometry(BR, 40, 28), new THREE.MeshPhysicalMaterial({ map: t, roughness: s.metal ? .12 : .16, metalness: s.metal ? .75 : .05, clearcoat: 1, clearcoatRoughness: .03, emissive: s.glow ? C(s.a) : C('#000'), emissiveIntensity: s.glow ? .3 : 0 })); ballM.castShadow = true; ballG.add(ballM); }
const ball = { x: 0, y: BR, z: .3, vx: 0, vz: 0, vy: 0, spin: 0, rolling: false, gutter: false, done: true, aimX: 0, t: 0 };

/* ================= GAME / SCORING ================= */
const NAMES = [T('אתם', 'You'), 'Remy', 'Luna', 'Kai'], PCOL = ['#ff5ae0', '#5ae8ff', '#ffe24a', '#7aff5a'];
let players = [], cur = 0, frame = 0, rollN = 0, state = 'title', phase = 'aim', settleT = 0, hitT = 0, firstHit = false, gameCoins = 0, standBefore = 10;
function frameScores(r) { // r = flat roll list → per-frame cumulative scores (null when pending)
  const out = []; let i = 0, tot = 0; for (let f = 0; f < 10; f++) { if (i >= r.length) { out.push(null); continue; }
    if (f < 9) { if (r[i] === 10) { if (r[i + 2] == null) { out.push(null); i++; continue; } tot += 10 + r[i + 1] + r[i + 2]; i++; }
      else { if (r[i + 1] == null) { out.push(null); i++; continue; } if (r[i] + r[i + 1] === 10) { if (r[i + 2] == null) { out.push(null); i += 2; continue; } tot += 10 + r[i + 2]; } else tot += r[i] + r[i + 1]; i += 2; } out.push(tot); }
    else { const a = r[i], b = r[i + 1], c = r[i + 2]; if (b == null || ((a === 10 || a + b === 10) && c == null)) { out.push(null); continue; } tot += a + b + (c || 0); out.push(tot); } }
  return out; }
function frameMarks(r) { const out = []; let i = 0; const v = n => n ? n : '-';
  for (let f = 0; f < 10; f++) { const m = []; const a = r[i], b = r[i + 1], c = r[i + 2];
    if (f < 9) { if (a == null) { out.push(m); continue; } if (a === 10) { m.push('', 'X'); i++; } else { m.push(v(a)); if (b != null) m.push(a + b === 10 ? '/' : v(b)); i += 2; } }
    else { if (a != null) m.push(a === 10 ? 'X' : v(a)); if (b != null) m.push(a === 10 ? (b === 10 ? 'X' : v(b)) : (a + b === 10 ? '/' : v(b)));
      if (c != null) m.push(a === 10 ? (b === 10 ? (c === 10 ? 'X' : v(c)) : (b + c === 10 ? '/' : v(c))) : (c === 10 ? 'X' : v(c))); }
    out.push(m); } return out; }
const total = p => { const s = frameScores(p.rolls); for (let i = 9; i >= 0; i--) if (s[i] != null) return s[i]; return 0; };
function renderCard() { const h = players.map((p, k) => { const sc = frameScores(p.rolls), mk = frameMarks(p.rolls); let row = `<div class="prow ${k === cur && state === 'play' ? 'on' : ''}"><div class="nm" style="background:${PCOL[k]}33;color:${PCOL[k]}">${p.name}</div>`;
    for (let f = 0; f < 10; f++) { const m = mk[f] || []; row += `<div class="fr ${f === 9 ? 't' : ''} ${k === cur && f === p.frame && state === 'play' ? 'cur' : ''}"><div class="rl">${(f === 9 ? [0, 1, 2] : [0, 1]).map(j => `<i>${m[j] ?? ''}</i>`).join('')}</div><div class="tot">${sc[f] ?? ''}</div></div>`; }
    return row + `<div class="sum">${total(p)}</div></div>`; }).join(''); $('card').innerHTML = h; }

function newGame() { const m = S.mode; players = [];
  if (m === 'solo') players.push({ name: NAMES[0], cpu: 0 });
  else if (m === 'cpu') players.push({ name: NAMES[0], cpu: 0 }, { name: 'Remy 🤖', cpu: S.lvl });
  else for (let i = 0; i < S.np; i++) players.push({ name: T('שחקן ', 'Player ') + (i + 1), cpu: 0 });
  players.forEach(p => { p.rolls = []; p.frame = 0; p.strikes = 0; }); cur = 0; gameCoins = 0; }
function start() { A.ac(); newGame(); state = 'play'; $('title').hidden = true; $('endSheet').hidden = true; $('hud').hidden = false; $('card').hidden = false; $('turn').hidden = false; updCoins();
  A.startMusic({ chords: [[45, 52, 57, 60], [43, 50, 55, 59], [41, 48, 53, 57], [43, 50, 55, 59]], bpm: 96, vol: .6 }); beginTurn(true); }
function beginTurn(fresh) { const p = players[cur]; if (fresh) { resetPins(true); rollN = 0; standBefore = 10; } phase = 'aim'; ball.done = false; ball.rolling = false; ball.gutter = false; ball.x = p.cpu ? 0 : (p.aimX ?? 0); ball.z = .3; ball.y = BR; ball.vx = ball.vz = ball.vy = 0; firstHit = false; settleT = 0; hitT = 0; ball.trail = [];
  $('turnT').textContent = (players.length > 1 ? p.name + ' · ' : '') + T('מסגרת ', 'Frame ') + (p.frame + 1) + (rollN ? ' · ' + T('זריקה ', 'Ball ') + (rollN + 1) : '') + (p.cpu ? '' : ' · ' + T('החליקו למעלה 👆', 'Swipe up 👆'));
  $('turn').hidden = false; $('mvL').hidden = $('mvR').hidden = !!p.cpu; renderCard(); drawLed(players.length > 1 ? p.name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim() || 'YOUR TURN' : T('FRAME ', 'FRAME ') + (p.frame + 1), PCOL[cur]);
  if (p.cpu) setTimeout(() => cpuThrow(p), 900); }
function throwBall(angle, speed, spin) { if (phase !== 'aim') return; phase = 'roll'; $('turn').hidden = true; ball.rolling = true; ball.vz = -speed * Math.cos(angle); ball.vx = speed * Math.sin(angle); ball.spin = spin; ball.t = 0; $('mvL').hidden = $('mvR').hidden = true;
  A.noise(.25, 'lowpass', 300, 1, .12); A.loopOn('roll', 'lowpass', 180, 1, 0); }
function cpuThrow(p) { if (state !== 'play' || phase !== 'aim') return; const sk = [0, .85, .45, .2][p.cpu] || .45; const stand = pins.filter(q => !q.gone && q.up);
  let tx = rollN === 0 ? .07 * (Math.random() < .8 ? 1 : -1) : stand.reduce((a, q) => a + q.x, 0) / Math.max(1, stand.length);
  tx += rnd(-1, 1) * sk * .35; const x0 = rnd(-.15, .15); ball.x = x0; const ang = Math.atan2(tx - x0, Math.abs(HEAD) + .3); throwBall(ang, rnd(7.6, 9.2), rnd(-.2, .2) * sk); }

/* ================= PHYSICS ================= */
function stepPhys(dt) {
  if (ball.rolling) { ball.t += dt;
    if (!ball.gutter) { if (ball.z < -8.5) ball.vx += ball.spin * 1.1 * dt; if (Math.abs(ball.x) > LW - BR * .35 && ball.z > HEAD + .2) { ball.gutter = true; A.noise(.3, 'lowpass', 220, 1, .1); } }
    if (ball.gutter) { const gx = Math.sign(ball.x) * (LW + GW / 2); ball.x = lerp(ball.x, gx, Math.min(1, dt * 10)); ball.vx = 0; ball.y = lerp(ball.y, BR - .07, Math.min(1, dt * 10)); }
    ball.x += ball.vx * dt; ball.z += ball.vz * dt; ball.vz *= Math.pow(.985, dt);
    if (ball.z < DECK_END + .1) { ball.vy -= 9.8 * dt; ball.y += ball.vy * dt; }
    if (ball.z < DECK_END - .6) { ball.rolling = false; A.loopOff('roll'); }
    if (Math.abs(ball.x) > LW + GW + .02 && !ball.gutter) { ball.vx *= -.5; ball.x = Math.sign(ball.x) * (LW + GW + .02); }
    const lp = A.loop('roll'); if (lp) lp.g.gain.value = clamp(.08 - ball.z * .002, 0, .08) * (ball.rolling ? 1 : 0); }
  // ball ↔ pins
  if (ball.rolling && !ball.gutter && ball.y > 0) for (const p of pins) { if (p.gone) continue; const px = p.x + p.dx * Math.tan(Math.min(p.phi, 1.2)) * BR, pz = p.z + p.dz * Math.tan(Math.min(p.phi, 1.2)) * BR;
    let dx = px - ball.x, dz = pz - ball.z; const d = Math.hypot(dx, dz), rs = BR + .058; if (d < rs && d > 1e-4) { dx /= d; dz /= d; const rel = (ball.vx - p.vx) * dx + (ball.vz - p.vz) * dz;
      if (rel > 0) { const J = 1.55 * rel / (1 / MB + 1 / MP); ball.vx -= J / MB * dx; ball.vz -= J / MB * dz; p.vx += J / MP * dx * 1.3 + rnd(-.4, .4); p.vz += J / MP * dz * 1.3; knock(p, dx, dz, J / MP * 8.5); hitFx(p, J); }
      p.x += dx * (rs - d) * .6; p.z += dz * (rs - d) * .6; } }
  // pins
  for (const p of pins) { if (p.gone && p.y < -1) continue;
    // tilt dynamics
    const HP = Math.PI / 2 - .002;
    if (p.phi >= HP && p.w >= -.01) { if (p.w > .8) { p.w = -p.w * .25; if (!p.gone) A.noise(.05, 'bandpass', 1800, 3, .04); } else { p.w = 0; p.phi = Math.PI / 2; } }
    else if (p.phi > 0 || p.w !== 0) { const crit = .19; const al = p.phi < crit ? -60 * p.phi - 4 * p.w : 26 * Math.sin(p.phi);
      p.w += al * dt; p.phi = clamp(p.phi + p.w * dt, 0, Math.PI / 2); if (p.phi <= 0 && p.w < 0) p.w = 0;
      if (p.phi < .02 && Math.abs(p.w) < .2) { p.phi = 0; p.w = 0; } }
    p.up = p.phi < .6;
    const fr = p.phi > 1.2 ? 1.8 : 2.6; const sp = Math.hypot(p.vx, p.vz); if (sp > 0) { const k = Math.max(0, 1 - fr * dt / Math.max(sp, .3)); p.vx *= k; p.vz *= k; }
    p.x += p.vx * dt; p.z += p.vz * dt; p.yaw += p.yv * dt; p.yv *= Math.pow(.2, dt);
    // kickback walls
    const wx = LW + GW + .02; if (Math.abs(p.x) > wx && p.z < HEAD + .6) { p.x = Math.sign(p.x) * wx; p.vx *= -.55; }
    // off the deck → gutter or pit
    if (!p.gone && (p.z < DECK_END || (Math.abs(p.x) > LW + .02 && p.z > HEAD - .95))) { p.gone = true; p.up = false; p.vy = 0; }
    if (p.gone) { p.vy -= 9.8 * dt; p.y += p.vy * dt; if (Math.abs(p.x) > LW + .02 && p.y < -.08) { p.y = -.08; p.vy = 0; } }
    placePin(p); }
  // pin ↔ pin
  for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) { if (i === j) continue; const a = pins[i], b = pins[j]; if (a.gone || b.gone) continue; if (a.phi < .05 && Math.hypot(a.vx, a.vz) < .05) continue;
    // a's axis segment (projected), b's base point
    const L = PH * Math.sin(a.phi) * .95, tx = a.x + a.dx * L, tz = a.z + a.dz * L; let ux = tx - a.x, uz = tz - a.z; const ll = ux * ux + uz * uz;
    let u = ll > 1e-6 ? clamp(((b.x - a.x) * ux + (b.z - a.z) * uz) / ll, 0, 1) : 0; const cx = a.x + ux * u, cz = a.z + uz * u; let nx = b.x - cx, nz = b.z - cz; const d = Math.hypot(nx, nz), rs = .11;
    if (d < rs && d > 1e-4) { nx /= d; nz /= d; const vpx = a.vx + a.dx * a.w * PH * u * Math.cos(a.phi), vpz = a.vz + a.dz * a.w * PH * u * Math.cos(a.phi); const rel = (vpx - b.vx) * nx + (vpz - b.vz) * nz;
      if (rel > 0) { const J = Math.max(rel * 1.2, a.phi > .25 || Math.hypot(a.vx, a.vz) > .6 ? .85 : 0); b.vx += J * nx; b.vz += J * nz; a.vx -= J * nx * .35; a.vz -= J * nz * .35; if (a.phi > .3) a.w *= .85; knock(b, nx, nz, J * 9); if (J > .25) clink(J); }
      b.x += nx * (rs - d) * .5; b.z += nz * (rs - d) * .5; } } }
function knock(p, nx, nz, dw) { if (dw < .4) return; if (p.phi < .1) { p.dx = nx; p.dz = nz; } else { const k = .3; p.dx = lerp(p.dx, nx, k); p.dz = lerp(p.dz, nz, k); const l = Math.hypot(p.dx, p.dz) || 1; p.dx /= l; p.dz /= l; } p.w = Math.max(p.w, Math.min(14, dw)); p.yv += rnd(-6, 6); if (!firstHit) { firstHit = true; hitT = 0; } }
let clinkT = 0; function clink(J) { if (clinkT > 0) return; clinkT = .03; A.noise(.08, 'bandpass', rnd(1800, 3200), 4, Math.min(.16, .04 + J * .06)); A.tone(rnd(900, 1400), .05, 'triangle', .02); }
function hitFx(p, J) { A.noise(.18, 'bandpass', 1500, 2, Math.min(.3, .1 + J * .015)); A.noise(.3, 'lowpass', 400, 1, .12); A.tone(160, .12, 'square', .03); shake = Math.min(.35, shake + J * .02); for (let i = 0; i < 8; i++) FX.emit(V3(p.x, .2, p.z), V3(rnd(-1.5, 1.5), rnd(.5, 2.5), rnd(-1.5, .5)), [2.6, 2.6, 2.6], rnd(.02, .04), rnd(.3, .5), 6); }

/* ================= FLOW AFTER A ROLL ================= */
function settled() { if (ball.rolling) return false; for (const p of pins) { if (p.gone) continue; if (Math.hypot(p.vx, p.vz) > .04 || Math.abs(p.w) > .15 || (p.phi > .19 && p.phi < 1.5)) return false; } return true; }
function endRoll() { phase = 'result'; const p = players[cur]; const standing = pins.filter(q => !q.gone && q.up).length; const down = standBefore - standing; p.rolls.push(down);
  const tenth = p.frame === 9; let txt = '', cls = '', bonus = 0; const mk = frameMarks(p.rolls)[p.frame] || []; const lastM = mk[mk.length - 1];
  if (lastM === 'X') { txt = 'STRIKE!'; bonus = 20; p.strikes++; if (!p.cpu) S.strikes++; strikeFx(); }
  else if (lastM === '/') { txt = 'SPARE!'; cls = 's'; bonus = 10; spareFx(); }
  else if (down === 0) { txt = ball.gutter ? T('גאטר 😅', 'Gutter 😅') : T('פספוס', 'Miss'); cls = 'g'; A.voice('aww', 1); }
  else { txt = down + ' ' + T('פינים', 'pins'); cls = 'g'; A.tone(660, .1, 'triangle', .05); }
  big(txt, cls, !p.cpu && (down || bonus) ? '+' + (down + bonus) + '🪙' : ''); if (!p.cpu) { S.coins += down + bonus; gameCoins += down + bonus; updCoins(); }
  drawLed(txt.replace(/[^A-Za-z0-9! ]/g, '').trim() || String(down), txt === 'STRIKE!' ? '#ff4ad8' : txt === 'SPARE!' ? '#3ae8ff' : '#ffe24a');
  // decide next
  let nextBall = false, resetAll = false; rollN++;
  if (!tenth) { if (rollN === 1 && down < 10) nextBall = true; }
  else { const r = p.rolls.slice(-rollN); if (rollN === 1) { nextBall = true; resetAll = down === 10; } else if (rollN === 2) { if (r[0] === 10 || r[0] + r[1] === 10) { nextBall = true; resetAll = standing === 0; } } }
  renderCard(); S.save();
  setTimeout(() => { if (state !== 'play') return;
    if (nextBall) { standBefore = resetAll ? 10 : standing; if (resetAll) { resetPins(true); } else sweep(); beginTurn(false); return; }
    p.frame++; if (players.every(q => q.frame >= 10)) return endGame(); cur = (cur + 1) % players.length; while (players[cur].frame >= 10) cur = (cur + 1) % players.length; beginTurn(true); }, 1900); }
function sweep() { for (const p of pins) { if (p.gone || !p.up) { p.gone = true; p.y = -5; placePin(p); } else { p.phi = 0; p.w = 0; p.vx = p.vz = 0; p.yv = 0; placePin(p); } } }
function big(t, cls, sub) { const d = document.createElement('div'); d.innerHTML = t + (sub ? `<small>${sub}</small>` : ''); if (cls) d.className = cls; $('big').innerHTML = ''; $('big').appendChild(d); }
function strikeFx() { A.tone(523, .14, 'square', .06); A.tone(659, .14, 'square', .06, .12); A.tone(784, .14, 'square', .06, .24); A.tone(1047, .45, 'square', .06, .36); A.voice('yay', 1.4); flash = .8;
  for (let i = 0; i < 160; i++) FX.emit(V3(rnd(-.6, .6), rnd(.2, 1.2), HEAD + rnd(-.6, .4)), V3(rnd(-2.5, 2.5), rnd(2, 6), rnd(-1, 2.5)), CONFETTI[i % 5], rnd(.03, .06), rnd(1.4, 2.4), 6, 1, .985); }
function spareFx() { A.tone(659, .14, 'triangle', .07); A.tone(988, .3, 'triangle', .07, .12); for (let i = 0; i < 70; i++) GLOW.emit(V3(rnd(-.6, .6), rnd(.2, 1), HEAD + rnd(-.6, .4)), V3(rnd(-1.5, 1.5), rnd(1, 3.5), rnd(-1, 1.5)), [.4, 1.6, 2.6], rnd(.04, .08), rnd(.8, 1.4), 3); }
function endGame() { state = 'over'; A.stopMusic(); A.loopOff('roll'); const res = players.map((p, i) => ({ p, i, s: total(p) })).sort((a, b) => b.s - a.s); const me = total(players[0]); const nb = me > S.best; if (nb) S.best = me; S.games++;
  const wonCpu = S.mode === 'cpu' && res[0].i === 0; const bonus = 25 + (wonCpu ? 60 + S.lvl * 30 : 0) + (nb ? 50 : 0); S.coins += bonus; gameCoins += bonus; if (wonCpu && S.lvl < 3) { S.lvl++; } S.save(); updCoins(); renderCard();
  $('eE').textContent = wonCpu || S.mode === 'solo' ? '🏆' : S.mode === 'party' ? '🎉' : '🎳';
  $('eT').textContent = S.mode === 'cpu' ? (wonCpu ? T('ניצחתם את רמי! 🏆', 'You beat Remy! 🏆') : T('רמי ניצח הפעם', 'Remy won this time')) : S.mode === 'party' ? res[0].p.name + ' ' + T('ניצח!', 'wins!') : T('המשחק הסתיים', 'Game over');
  $('eRes').innerHTML = res.map((r, k) => `<li class="${k === 0 ? 'w' : ''}"><span>${['🥇', '🥈', '🥉', '4️⃣'][k]} ${r.p.name}</span><b>${r.s}${r.p.strikes ? ' · ' + r.p.strikes + 'X' : ''}</b></li>`).join('');
  $('eP').textContent = `🪙 +${gameCoins}` + (nb ? ' · ' + T('שיא חדש! 🆕', 'New best! 🆕') : '') + (wonCpu && S.lvl > 1 ? ' · ' + T('רמי מתחזק 💪', 'Remy levels up 💪') : '');
  $('endSheet').hidden = false; drawLed(nb ? 'NEW BEST ' + me : 'SCORE ' + me, '#ffe24a'); }

/* ================= INPUT ================= */
let sw = null; const keys = {};
$('stage').addEventListener('pointerdown', e => { if (state !== 'play' || phase !== 'aim' || players[cur].cpu) return; A.ac(); sw = { pts: [[e.clientX, e.clientY, performance.now()]], id: e.pointerId, x0: ball.x }; });
addEventListener('pointermove', e => { if (!sw || e.pointerId !== sw.id) return; sw.pts.push([e.clientX, e.clientY, performance.now()]); const p0 = sw.pts[0]; const dy = p0[1] - e.clientY, dx = e.clientX - p0[0];
  if (dy < 30 && Math.abs(dx) > 10) { ball.x = clamp(sw.x0 + dx * 1.1 / Math.min(innerWidth, 800), -LW + BR, LW - BR); players[cur].aimX = ball.x; } });
addEventListener('pointerup', e => { if (!sw || e.pointerId !== sw.id) return; const P = sw.pts; sw = null; if (P.length < 2) return; const a = P[0], b = P[P.length - 1]; const dy = a[1] - b[1], dx = b[0] - a[0]; if (dy < 50) return;
  // speed from the last ~120ms of the swipe
  let k = P.length - 1; while (k > 0 && b[2] - P[k][2] < 120) k--; const vp = Math.hypot(b[0] - P[k][0], b[1] - P[k][1]) / Math.max(16, b[2] - P[k][2]); const speed = clamp(5.8 + vp * 2.2, 6.2, 10.2);
  const ang = clamp(Math.atan2(dx, dy) * .16, -.07, .07);
  // curve: max signed deviation from the straight line
  let dev = 0; const L = Math.hypot(dx, dy) || 1; for (const q of P) { const s = ((q[0] - a[0]) * dy - (a[1] - q[1]) * dx) / L; if (Math.abs(s) > Math.abs(dev)) dev = s; } const spin = clamp(-dev / L * 3.2, -1, 1);
  if (!S.tut) { S.tut = 1; S.save(); } throwBall(ang, speed, spin); });
let mvDir = 0; for (const [id, d] of [['mvL', -1], ['mvR', 1]]) { const b = $(id); b.addEventListener('pointerdown', e => { e.stopPropagation(); mvDir = d; }); b.addEventListener('pointerup', () => mvDir = 0); b.addEventListener('pointerleave', () => mvDir = 0); }
addEventListener('keydown', e => { keys[e.key] = 1; if (e.key === ' ' && state === 'play' && phase === 'aim' && !players[cur].cpu) throwBall(0, 8.6, 0); }); addEventListener('keyup', e => keys[e.key] = 0);

/* ================= LOOP ================= */
let last = performance.now(), shake = 0, flash = 0, camZ = 2.2, camX = 0;
function loop(now) { requestAnimationFrame(loop); const dt = Math.min(.04, (now - last) / 1000); last = now; const t = now / 1000; A.tick(); clinkT -= dt;
  if (state === 'play') {
    if (phase === 'aim' && !players[cur].cpu) { const mv = mvDir || (keys.ArrowLeft ? -1 : keys.ArrowRight ? 1 : 0); if (mv) { ball.x = clamp(ball.x + mv * .55 * dt, -LW + BR, LW - BR); players[cur].aimX = ball.x; } }
    if (phase === 'roll') { const n = 6; for (let i = 0; i < n; i++) stepPhys(dt / n); if (firstHit) hitT += dt; settleT += dt; if ((!ball.rolling && (settled() || hitT > 3.2)) || settleT > 9) endRoll(); }
  } else if (state === 'title') { const n = 4; for (let i = 0; i < n; i++) stepPhys(dt / n); titleT += dt; if (titleT > 5.5 && !ball.rolling && settled()) { titleT = 0; titleRoll(); } }
  // ball pose
  ballG.position.set(ball.x, ball.y, ball.z); if (ballM) { ballM.rotation.x += (-ball.vz / BR) * dt * (ball.rolling ? 1 : 0); ballM.rotation.z += ball.spin * dt * 2; }
  ballG.visible = ball.z > DECK_END - 1.2 && ball.y > -.6; guide.visible = state === 'play' && phase === 'aim' && !players[cur].cpu; guide.position.set(ball.x, .004, ball.z - 2.8); guide.material.opacity = .55 + Math.sin(t * 4) * .25;
  if (ball.rolling && Math.random() < .5 && S.q !== 'low') { const s = SKINS[S.skin]; GLOW.emit(V3(ball.x + rnd(-.03, .03), .03, ball.z + .12), V3(0, rnd(.05, .2), 0), s.glow ? [2.4, 1, .3] : [.7, .5, 1.2], rnd(.03, .06), .45, 0, .8); }
  // camera
  shake = Math.max(0, shake - dt * 1.4); flash = Math.max(0, flash - dt * 2); E.grade.uniforms.uFlash.value = flash * .3;
  const sx = (Math.random() - .5) * shake * .05, sy = (Math.random() - .5) * shake * .05;
  let tz, ty, lz, ly, lx = 0;
  if (state === 'title') { const a = Math.sin(t * .15) * .25; tz = 1.6; ty = 1.15; lz = -12; ly = .3; camX = lerp(camX, Math.sin(a) * 1.2, dt); lx = 0; }
  else if (phase === 'aim') { tz = 2.25; ty = 1.0; lz = -11; ly = .25; camX = lerp(camX, ball.x * .6, Math.min(1, dt * 4)); lx = ball.x * .3; }
  else { const bz = Math.max(ball.z, HEAD + 2.3); tz = bz + 2.4; ty = lerp(.95, .72, clamp((0 - bz) / 14, 0, 1)); lz = Math.min(ball.z - 6, HEAD + .2); ly = .2; camX = lerp(camX, ball.x * .35, Math.min(1, dt * 3)); lx = ball.x * .25; }
  camZ = lerp(camZ, tz, Math.min(1, dt * (phase === 'roll' ? 5 : 3))); camera.position.set(camX + sx, lerp(camera.position.y || ty, ty, Math.min(1, dt * 3)) + sy, camZ); camera.lookAt(lx, ly, lz);
  if (window.__cam) { const q = window.__cam; camera.position.set(...q.p); camera.lookAt(...q.l); }
  key.position.set(camX + 2, 8, camZ + 2); key.target.position.set(0, 0, camZ - 6);
  if (state === 'over' || phase === 'result') drawLedBlink(t);
  FX.update(dt, -.3); GLOW.update(dt); E.render(); }
let blinkT = 0, titleT = 3; function drawLedBlink(t) { if (t - blinkT < .25) return; blinkT = t; led.material.color.setScalar(Math.floor(t * 4) % 2 ? 1 : .75); }
function titleRoll() { phase = 'roll'; resetPins(true); ball.x = rnd(-.1, .1); ball.z = .3; ball.y = BR; ball.vy = 0; ball.gutter = false; ball.rolling = true; ball.vz = -8.6; ball.vx = (.06 - ball.x) / 2.2; ball.spin = 0; firstHit = false; }

/* ================= UI ================= */
const updCoins = () => { $('coinTxt').textContent = S.coins; $('tCoins').textContent = S.coins; };
function renderTitle() { const M = [['solo', '🎳', T('לבד', 'Solo'), T('שברו את השיא', 'Beat your best')], ['cpu', '🤖', T('נגד רמי', 'vs Remy'), T('רמה ', 'Level ') + S.lvl], ['party', '👨‍👩‍👧', T('מסיבה', 'Party'), T('2–4 על מכשיר אחד', '2–4 on one device')]];
  $('modeSeg').innerHTML = M.map(([k, ic, n, s]) => `<button data-m="${k}" class="${S.mode === k ? 'on' : ''}"><span>${ic}</span>${n}<small>${s}</small></button>`).join('');
  $('optRow').innerHTML = S.mode === 'party' ? [2, 3, 4].map(n => `<button data-n="${n}" class="${S.np === n ? 'on' : ''}">${n} ${T('שחקנים', 'players')}</button>`).join('') : S.mode === 'cpu' ? [1, 2, 3].map(n => `<button data-l="${n}" class="${S.lvl === n ? 'on' : ''}">${['', T('קל', 'Easy'), T('בינוני', 'Medium'), T('מקצוען', 'Pro')][n]}</button>`).join('') : '';
  $('tBest').textContent = S.best; updCoins(); }
$('modeSeg').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; S.mode = b.dataset.m; S.save(); A.tone(700, .05, 'triangle', .04); renderTitle(); };
$('optRow').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.n) S.np = +b.dataset.n; if (b.dataset.l) S.lvl = +b.dataset.l; S.save(); renderTitle(); };
function showTitle() { state = 'title'; A.stopMusic(); A.loopOff('roll'); $('title').hidden = false; $('hud').hidden = true; $('card').hidden = true; $('turn').hidden = true; $('endSheet').hidden = true; $('pauseSheet').hidden = true; $('mvL').hidden = $('mvR').hidden = true; $('big').innerHTML = ''; renderTitle(); resetPins(true); ball.rolling = false; ball.z = .3; ball.x = 0; phase = 'aim'; drawLed('STRIKE NIGHT'); }
function renderShop() { $('shopCoins').textContent = S.coins; $('skins').innerHTML = SKINS.map((s, i) => { const own = S.owned.includes(i); return `<button class="sk ${S.skin === i ? 'on' : ''}" data-k="${i}"><canvas data-c="${i}" width="112" height="112"></canvas><b>${s.n}</b><small>${own ? (S.skin === i ? T('נבחר ✔', 'Selected ✔') : T('בחרו', 'Select')) : '🪙 ' + s.p}</small></button>`; }).join('');
  $('skins').querySelectorAll('canvas').forEach(cv => { const k = +cv.dataset.c, src = skinCanvas(k, 128), x = cv.getContext('2d'); x.save(); x.beginPath(); x.arc(56, 56, 54, 0, TAU); x.clip(); x.drawImage(src, 64, 0, 128, 128, 0, 0, 112, 112); const g = x.createRadialGradient(40, 36, 4, 56, 56, 60); g.addColorStop(0, 'rgba(255,255,255,.6)'); g.addColorStop(.35, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.4)'); x.fillStyle = g; x.fillRect(0, 0, 112, 112); x.restore(); }); }
$('skins').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; const i = +b.dataset.k, s = SKINS[i]; if (!S.owned.includes(i)) { if (S.coins < s.p) { toast(T('צריך עוד מטבעות 🪙', 'Need more coins 🪙')); A.tone(200, .1, 'sine', .05); return; } S.coins -= s.p; S.owned.push(i); A.voice('yay', 1.3); } S.skin = i; S.save(); mkBall(); renderShop(); updCoins(); };
$('goBtn').onclick = () => start(); $('shopBtn').onclick = () => { A.ac(); renderShop(); $('shopSheet').hidden = false; }; $('shopClose').onclick = () => $('shopSheet').hidden = true;
$('eAgain').onclick = () => start(); $('eMenu').onclick = () => showTitle();
function pause() { if (state !== 'play') return; state = 'pause'; $('pauseSheet').hidden = false; A.loopOff('roll'); }
$('pauseBtn').onclick = pause; $('pGo').onclick = () => { $('pauseSheet').hidden = true; state = 'play'; last = performance.now(); }; $('pMenu').onclick = () => showTitle();
$('pauseBtn').innerHTML = ICO.pause('#ffffff'); $('homeT').innerHTML = ICO.home('#ffffff'); soundButton('sndBtn', S, A, '#2a1a4a'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('goBtn').textContent = T('לשחק! 🎳', 'Bowl! 🎳'); $('shopBtn').textContent = T('🎨 כדורים', '🎨 Balls'); $('shopT').textContent = T('כדורים', 'Balls'); $('shopClose').textContent = T('סגירה', 'Close'); $('eAgain').textContent = T('עוד משחק! 🎳', 'Play again! 🎳'); $('eMenu').textContent = T('תפריט', 'Menu'); $('pT').textContent = T('הפסקה', 'Paused'); $('pGo').textContent = T('המשך ▶', 'Resume ▶'); $('pMenu').textContent = T('תפריט', 'Menu');
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
mkBall(); resetPins(true);
setTimeout(() => { E.resize(); showTitle(); $('loading').hidden = true; requestAnimationFrame(loop); }, 30);
window.__bw = { get state() { return state; }, get phase() { return phase; }, ball, pins, throwBall, stepPhys, settled, frameScores, frameMarks, get players() { return players; }, start, endRoll, newGame };
