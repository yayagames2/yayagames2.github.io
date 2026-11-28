import { THREE, $, V3, C, clamp, lerp, rnd, T, isTouch, store, engine, studioEnv, std, shadowAll, cnv, ctex, particles, CONFETTI, audio, toast, ICO, hubButtons, soundButton, qualityButton } from '../lib/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { loadMix, MixRig } from '../lib/mixchar.js';

/* ================= SETUP ================= */
const S = store('pong-save', { coins: 0, lvl: 0, mode: 'cpu', tour: 0, tro: {}, chal: {}, tut: 0, wins: 0, best: 0 });
const E = engine(S, { fov: 46, far: 120, bloom: [.32, .55, .86], exposure: 1.02, vignette: .3, sat: 1.1 });
const { scene, camera, renderer } = E; studioEnv(E, '#dfe6ff', '#141a38', .38);
const A = audio(S); const FX = particles(E, 900); const GL = particles(E, 260, true);
const TAU = Math.PI * 2, G = 9.81;
const TY = .76, HL = 1.37, HW = .7625, NH = .1525, R = .02; // table top height, half length, half width, net height, ball radius
const PZ = 1.62, AZ = -1.62; // player / opponent hit planes
const rgb = h => { const c = C(h); return [c.r, c.g, c.b]; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };
const UP = V3(0, 1, 0); const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

const LV = [
  { n: T('מתחיל', 'Rookie'), spd: 2.7, react: .3, err: .19, pw: [.28, .5], spin: .2, smart: .25, reach: .64, mag: .6, hr: .25, hint: 1 },
  { n: T('מועדון', 'Club'), spd: 3.4, react: .23, err: .145, pw: [.38, .64], spin: .4, smart: .45, reach: .7, mag: .38, hr: .22, hint: 1 },
  { n: T('מקצוען', 'Pro'), spd: 4.1, react: .17, err: .105, pw: [.48, .78], spin: .6, smart: .62, reach: .76, mag: .2, hr: .19, hint: 0 },
  { n: T('אלוף', 'Champion'), spd: 4.8, react: .12, err: .075, pw: [.58, .9], spin: .75, smart: .78, reach: .82, mag: .08, hr: .17, hint: 0 },
  { n: T('אגדה', 'Legend'), spd: 5.6, react: .08, err: .05, pw: [.68, 1], spin: .9, smart: .9, reach: .88, mag: 0, hr: .16, hint: 0 },
];
const OPP = [['Leo', '🇧🇷', 'remy'], ['Mia', '🇸🇪', 'luna'], ['Kenji', '🇯🇵', 'kai'], ['Sofia', '🇪🇸', 'rio'], ['Wang', '🇨🇳', 'kai'], ['Max', '🇩🇪', 'remy'], ['Noa', '🇮🇱', 'luna'], ['Zoe', '🇫🇷', 'rio'], ['Raj', '🇮🇳', 'zori']];
const TOURS = [
  { n: T('גביע השכונה', 'Local Cup'), e: '🥉', lv: [0, 1, 1], pts: [7, 7, 11], prize: 60 },
  { n: T('האליפות הארצית', 'National Open'), e: '🥈', lv: [1, 2, 2], pts: [7, 11, 11], prize: 120 },
  { n: T('אליפות העולם', 'World Championship'), e: '🥇', lv: [2, 3, 4], pts: [11, 11, 11], prize: 250 },
];
const ROUNDS = [T('רבע גמר', 'Quarter-final'), T('חצי גמר', 'Semi-final'), T('גמר', 'Final')];
const CHALS = [
  { n: T('מטרה גדולה', 'Big target'), e: '🎯', tg: [[0, -.75, .3]], feed: 'easy', th: [8, 14, 20] },
  { n: T('פינות', 'Corners'), e: '📐', tg: [[-.5, -1.05, .2], [.5, -1.05, .2]], feed: 'easy', th: [6, 11, 16] },
  { n: T('קטן ועמוק', 'Small & deep'), e: '🔬', tg: [[0, -1.15, .15]], feed: 'mid', th: [5, 9, 13] },
  { n: T('מטרה זזה', 'Moving target'), e: '↔️', tg: [[0, -.85, .22]], move: 1, feed: 'mid', th: [6, 10, 15] },
  { n: T('נגד חיתוך', 'Beat the chop'), e: '🌀', tg: [[-.35, -.8, .24], [.35, -.8, .24]], feed: 'chop', th: [6, 11, 16] },
  { n: T('מכות מהירות', 'Smash zone'), e: '⚡', tg: [[0, -.9, .32]], smash: 1, feed: 'mid', th: [5, 9, 14] },
];
const BALLS = 20;

/* ================= ARENA ================= */
const hemi = new THREE.HemisphereLight('#cfdcff', '#1a1430', .55); scene.add(hemi);
const key = new THREE.DirectionalLight('#fff6ea', 2.2); key.position.set(1.5, 7, 2.5); key.castShadow = renderer.shadowMap.enabled; key.shadow.mapSize.set(2048, 2048); { const c = key.shadow.camera; c.left = -3; c.right = 3; c.top = 4; c.bottom = -4; c.near = 1; c.far = 14; } key.shadow.bias = -.0004; key.shadow.normalBias = .02; scene.add(key);
const fill = new THREE.DirectionalLight('#9ab8ff', .55); fill.position.set(-3, 4, -3); scene.add(fill);
for (const [x, z] of [[-1.6, -1.8], [1.6, -1.8], [-1.6, 1.8], [1.6, 1.8]]) { const sp = new THREE.SpotLight('#ffffff', 26, 12, .55, .55, 1.6); sp.position.set(x, 6.2, z); sp.target.position.set(x * .2, TY, z * .3); scene.add(sp, sp.target); }
scene.fog = new THREE.Fog('#070b1a', 14, 38); renderer.setClearColor('#070b1a');

// floor: sport floor with court lines
const floorTex = (() => { const c = cnv(1024, 1024), g = c.getContext('2d'); g.fillStyle = '#7a1e1a'; g.fillRect(0, 0, 1024, 1024); for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,200,180'},${rnd(.02, .06)})`; g.fillRect(rnd(0, 1024), rnd(0, 1024), rnd(2, 30), rnd(1, 3)); }
  g.fillStyle = '#2a3a8a'; g.fillRect(212, 112, 600, 800); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 6; g.strokeRect(212, 112, 600, 800); return ctex(c); })();
const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 18.6), new THREE.MeshStandardMaterial({ map: floorTex, roughness: .42, metalness: .05 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
// table
const tableTex = (() => { const c = cnv(512, 920), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 512, 920); gr.addColorStop(0, '#1a4aa8'); gr.addColorStop(1, '#123a8a'); g.fillStyle = gr; g.fillRect(0, 0, 512, 920);
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(255,255,255,${rnd(.01, .035)})`; g.fillRect(rnd(0, 512), rnd(0, 920), 2, 2); } g.fillStyle = '#f4f6fa'; const e = 7; g.fillRect(0, 0, 512, e); g.fillRect(0, 920 - e, 512, e); g.fillRect(0, 0, e, 920); g.fillRect(512 - e, 0, e, 920); g.fillRect(256 - 1.5, 0, 3, 920);
  g.font = '900 30px Arial'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.18)'; g.save(); g.translate(256, 700); g.fillText('YAYA GAMES', 0, 0); g.restore(); g.save(); g.translate(256, 220); g.rotate(Math.PI); g.fillText('YAYA GAMES', 0, 0); g.restore(); return ctex(c); })();
const TBL = new THREE.Group(); scene.add(TBL);
{ const topM = new THREE.MeshPhysicalMaterial({ map: tableTex, roughness: .32, clearcoat: .45, clearcoatRoughness: .4 }); const sideM = std('#0e2a66', { roughness: .5 }); const top = new THREE.Mesh(new THREE.BoxGeometry(HW * 2, .03, HL * 2), [sideM, sideM, topM, sideM, sideM, sideM]); top.position.y = TY - .015; TBL.add(top);
  const fr = std('#20242c', { roughness: .45, metalness: .6 }); for (const z of [-.85, .85]) { for (const x of [-.55, .55]) { const lg = new THREE.Mesh(new THREE.BoxGeometry(.05, TY - .05, .05), fr); lg.position.set(x, (TY - .05) / 2, z); TBL.add(lg); } const cb = new THREE.Mesh(new THREE.BoxGeometry(1.15, .05, .05), fr); cb.position.set(0, .16, z); TBL.add(cb); const wh = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .03, 14), std('#111')); wh.rotation.z = Math.PI / 2; }
  const un = new THREE.Mesh(new THREE.BoxGeometry(1.3, .06, 2.4), std('#16181e', { roughness: .8 })); un.position.y = TY - .06; TBL.add(un);
  // net
  const nc = cnv(256, 64), g = nc.getContext('2d'); g.clearRect(0, 0, 256, 64); g.strokeStyle = 'rgba(20,20,28,.9)'; g.lineWidth = 1.2; for (let x = 0; x <= 256; x += 6) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x, 64); g.stroke(); } for (let y = 8; y <= 64; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); } g.fillStyle = '#f6f6f8'; g.fillRect(0, 0, 256, 8);
  const net = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2 + .3, NH), new THREE.MeshStandardMaterial({ map: ctex(nc), transparent: true, alphaTest: .25, side: THREE.DoubleSide, roughness: .8 })); net.position.set(0, TY + NH / 2, 0); TBL.add(net);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, NH + .02, 10), std('#2a2e38', { metalness: .7, roughness: .3 })); p.position.set(s * (HW + .15), TY + NH / 2, 0); TBL.add(p); const cl = new THREE.Mesh(new THREE.BoxGeometry(.05, .03, .07), p.material); cl.position.set(s * (HW + .14), TY + .01, 0); TBL.add(cl); }
  shadowAll(TBL, true, true); net.castShadow = false; }
// barriers with LED boards
const ledTex = (() => { const c = cnv(1024, 64), g = c.getContext('2d'); const items = [['YAYA GAMES', '#ffb84a'], ['OFFLINE ARCADE', '#5ae8ff'], ['SPIN MASTERS', '#ff6a3a'], ['YAYA GAMES', '#7aff7a']]; g.fillStyle = '#05081a'; g.fillRect(0, 0, 1024, 64);
  items.forEach(([t, col], i) => { g.fillStyle = col; g.font = '900 34px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 128 + i * 256, 34); }); return ctex(c, 1, 1); })();
const LED = []; { const bm = std('#0a0e20', { roughness: .6 }); const add = (w, x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; const b = new THREE.Mesh(new THREE.BoxGeometry(w, .72, .06), bm); b.position.y = .36; g.add(b); const t = ledTex.clone(); t.needsUpdate = true; t.repeat.set(w / 4, 1); const l = new THREE.Mesh(new THREE.PlaneGeometry(w, .5), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); l.position.set(0, .4, .035); g.add(l); LED.push(t); scene.add(g); };
  add(8, 0, -5.6, 0); add(11, -4, 0, Math.PI / 2); add(11, 4, 0, -Math.PI / 2); add(3, -2.6, 5.4, Math.PI); add(3, 2.6, 5.4, Math.PI); }
// stands with crowd
const crowd = (() => { const n = S.q === 'low' ? 160 : 420; const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.19, .32, 4, 8), std('#ffffff', { roughness: .8 }), n); const head = new THREE.InstancedMesh(new THREE.SphereGeometry(.13, 10, 8), std('#ffffff', { roughness: .7 }), n);
  const d = new THREE.Object3D(), skins = ['#f2c3a0', '#c98e6a', '#8a5a3c', '#e8b088'], shirts = ['#ff5a3a', '#3a8aff', '#ffd23a', '#ffffff', '#2ac88a', '#a85aff', '#ff8ab8', '#1a1a2a']; const base = []; let i = 0;
  const tier = new THREE.MeshStandardMaterial({ color: '#141a34', roughness: .8 });
  for (const [x0, z0, w, ry, rows] of [[0, -7, 12, 0, 5], [-6.2, 0, 13, Math.PI / 2, 4], [6.2, 0, 13, -Math.PI / 2, 4]]) { for (let r = 0; r < rows; r++) { const st = new THREE.Mesh(new THREE.BoxGeometry(w, .4, .9), tier); const off = r * .9; const dx = Math.sin(ry) * -off, dz = Math.cos(ry) * -off; st.position.set(x0 + dx, .2 + r * .4, z0 + dz); st.rotation.y = ry; scene.add(st);
      for (let k = 0; k < w / .55 && i < n; k++) { if (Math.random() < .12) continue; const u = -w / 2 + .3 + k * .55 + rnd(-.08, .08); const x = x0 + Math.cos(ry) * u + dx, z = z0 - Math.sin(ry) * u + dz, y = .4 + r * .4 + .38; base.push([x, y, z, ry, rnd(0, 6)]); d.position.set(x, y, z); d.rotation.set(0, ry, 0); d.updateMatrix(); body.setMatrixAt(i, d.matrix); body.setColorAt(i, C(pick(shirts)).multiplyScalar(.55)); d.position.y += .4; d.updateMatrix(); head.setMatrixAt(i, d.matrix); head.setColorAt(i, C(pick(skins)).multiplyScalar(.75)); i++; } } }
  body.count = head.count = i; scene.add(body, head); return { body, head, base, cheer: 0 }; })();
function crowdTick(t, dt) { const c = crowd; c.cheer = Math.max(0, c.cheer - dt * .5); if (S.q === 'low' && c.cheer <= 0) return; const d = new THREE.Object3D(); for (let i = 0; i < c.base.length; i++) { const [x, y, z, ry, ph] = c.base[i]; const j = c.cheer > 0 ? Math.max(0, Math.sin(t * 9 + ph * 3)) * .22 * Math.min(1, c.cheer) : Math.sin(t * 1.3 + ph) * .012; d.position.set(x, y + j, z); d.rotation.set(0, ry, 0); d.updateMatrix(); c.body.setMatrixAt(i, d.matrix); d.position.y += .4; d.updateMatrix(); c.head.setMatrixAt(i, d.matrix); } c.body.instanceMatrix.needsUpdate = c.head.instanceMatrix.needsUpdate = true; }
// big screen scoreboard on far wall
const scr = (() => { const c = cnv(512, 256), t = ctex(c); const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.1), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); m.position.set(0, 4.3, -8.2); scene.add(m); const fr = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.3, .1), std('#0a0e1a')); fr.position.set(0, 4.3, -8.27); scene.add(fr); return { c, t }; })();
function drawScreen() { const g = scr.c.getContext('2d'); g.fillStyle = '#05081a'; g.fillRect(0, 0, 512, 256); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 30px Arial'; g.fillStyle = '#ffb84a'; g.fillText('SPIN MASTERS', 256, 34);
  if (M) { g.font = '900 28px Arial'; g.fillStyle = '#fff'; g.fillText(M.names[0], 128, 92); g.fillText(M.names[1], 384, 92); g.font = '900 96px Arial'; g.fillStyle = '#ff6a2a'; g.fillText(M.sc[0], 128, 175); g.fillStyle = '#3a9aff'; g.fillText(M.sc[1], 384, 175); g.fillStyle = '#fff'; g.font = '900 60px Arial'; g.fillText(':', 256, 170); }
  scr.t.needsUpdate = true; }

/* ================= BALL ================= */
const ballTex = (() => { const c = cnv(256, 128), g = c.getContext('2d'); g.fillStyle = '#fff6ee'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#ff7a2a'; g.fillRect(0, 60, 256, 8); g.font = '900 26px Arial'; g.textAlign = 'center'; g.fillText('★', 64, 44); g.fillText('★', 192, 104); return ctex(c); })();
const ballM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: ballTex, roughness: .35, clearcoat: .6, sheen: .4 });
const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 20, 14), ballM); ball.castShadow = true; ball.scale.setScalar(1.45); scene.add(ball);
const shadowTex = (() => { const c = cnv(64, 64), g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return ctex(c); })();
const bShadow = new THREE.Mesh(new THREE.PlaneGeometry(.09, .09), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })); bShadow.rotation.x = -Math.PI / 2; bShadow.renderOrder = 3; scene.add(bShadow);
const B = { p: V3(0, 1, 0), v: V3(), w: V3(), live: false, last: null, bP: 0, bA: 0, served: false, serve: false, firstB: null, held: null, net: false, tHit: 0 };
const trail = []; const TRN = 16;
function accel(p, v, w, out) { const sp = v.length(); out.set(0, -G, 0).addScaledVector(v, -.11 * sp); const mg = V3().crossVectors(w, v).multiplyScalar(.0038); return out.add(mg); }
const _a = V3();
function stepBall(dt, ev) { // physics with events: 'table'(side), 'net', 'floor'
  accel(B.p, B.v, B.w, _a); B.v.addScaledVector(_a, dt); const py = B.p.y, pz = B.p.z; B.p.addScaledVector(B.v, dt); B.w.multiplyScalar(Math.pow(.985, dt * 60 / 60));
  // net
  if (Math.sign(pz) !== Math.sign(B.p.z) && Math.abs(B.p.x) < HW + .16 && B.p.y < TY + NH + R && B.p.y > TY - .02) { B.p.z = Math.sign(pz) * (R + .002); B.v.z *= -.18; B.v.x *= .5; B.v.y = Math.min(B.v.y, .4); B.w.multiplyScalar(.3); ev && ev('net'); }
  // table
  if (B.p.y < TY + R && py >= TY + R - .001 && B.v.y < 0 && Math.abs(B.p.x) <= HW + R * .5 && Math.abs(B.p.z) <= HL + R * .5) { B.p.y = TY + R; B.v.y = -B.v.y * .89; const rv = V3(0, -R, 0); const vc = V3().crossVectors(B.w, rv).add(B.v); vc.y = 0; const J = vc.multiplyScalar(-.32); B.v.add(J); B.w.multiplyScalar(.62); ev && ev('table', B.p.z > 0 ? 'p' : 'a'); }
  // floor
  if (B.p.y < R) { B.p.y = R; if (B.v.y < 0) { B.v.y = -B.v.y * .62; B.v.x *= .8; B.v.z *= .8; ev && ev('floor'); } }
}
// predict / solve shots
const SIM = { p: V3(), v: V3(), w: V3() };
function simulate(p, v, w, maxT, fn) { const sv = [B.p.clone(), B.v.clone(), B.w.clone()]; B.p.copy(p); B.v.copy(v); B.w.copy(w); const dt = 1 / 240; let t = 0, stop = false; const ev = (k, s) => { if (fn(k, s, t) === true) stop = true; };
  while (t < maxT && !stop) { stepBall(dt, ev); t += dt; if (fn('step', null, t) === true) stop = true; } const out = { p: B.p.clone(), v: B.v.clone(), t }; B.p.copy(sv[0]); B.v.copy(sv[1]); B.w.copy(sv[2]); return out; }
function landing(p, v, w) { p = p.clone(); let land = null, netY = null, netHit = false; simulate(p, v, w, 2.5, (k, s, t) => { if (k === 'net') { netHit = true; return true; } if (k === 'step' && netY == null && Math.sign(B.p.z) !== Math.sign(p.z)) netY = B.p.y; if (k === 'table') { land = B.p.clone(); land.own = Math.sign(B.p.z) === Math.sign(p.z); return true; } if (k === 'floor') { land = B.p.clone(); land.y = -1; return true; } }); return { land, netY, netHit }; }
function solveShot(p0, tgt, T0, w) { p0 = p0.clone(); // returns velocity so the ball first bounces exactly at tgt (x,z), clearing the net; adds arc if needed
  let T = T0, best = null, bestE = 1e9; const clr = TY + NH + R + .02;
  for (let tries = 0; tries < 8; tries++) { const v = V3((tgt.x - p0.x) / T, (TY + R - p0.y) / T + .5 * G * T, (tgt.z - p0.z) / T);
    for (let it = 0; it < 14; it++) { const L = landing(p0, v, w); if (L.netHit || (L.netY != null && L.netY < clr) || (L.land && L.land.own)) break; if (!L.land || L.land.y < 0) { v.x *= .93; v.z *= .93; continue; }
      const dx = tgt.x - L.land.x, dz = tgt.z - L.land.z, e = Math.hypot(dx, dz); if (e < bestE) { bestE = e; best = v.clone(); } if (e < .012) return v; v.x += dx / T * .8; v.z += dz / T * .8; }
    if (bestE < .04) return best; T *= 1.1; }
  return best || V3((tgt.x - p0.x) / T0, (TY + R - p0.y) / T0 + .5 * G * T0 + .6, (tgt.z - p0.z) / T0); }
function spinFor(v, top, side) { const d = V3(v.x, 0, v.z).normalize(); return V3().crossVectors(UP, d).multiplyScalar(top).add(V3(0, side, 0)); }

/* ================= PADDLES ================= */
function mkPaddle(col) { const g = new THREE.Group(); const sh = new THREE.Shape(); sh.absellipse(0, 0, .076, .081, 0, TAU); const wood = std('#c89a5a', { roughness: .55 });
  const core = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .006, bevelEnabled: false, curveSegments: 36 }), wood); core.position.z = -.003; g.add(core);
  const pipT = (() => { const c = cnv(128, 128), x = c.getContext('2d'); x.fillStyle = col; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(0,0,0,${rnd(.04, .12)})`; x.beginPath(); x.arc(rnd(0, 128), rnd(0, 128), 1.4, 0, TAU); x.fill(); } return ctex(c); })();
  const f = new THREE.Mesh(new THREE.ShapeGeometry(sh, 36), new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: pipT, roughness: .62, sheen: .5, sheenColor: C(col) })); f.position.z = .0035; g.add(f);
  const b = new THREE.Mesh(new THREE.ShapeGeometry(sh, 36), std('#121214', { roughness: .7, side: THREE.BackSide })); b.position.z = -.0035; g.add(b);
  const h = new THREE.Mesh(new RoundedBoxGeometry(.028, .1, .024, 2, .008), wood); h.position.y = -.12; g.add(h); const fl = new THREE.Mesh(new RoundedBoxGeometry(.03, .025, .026, 2, .006), std('#2a2a30', { roughness: .4 })); fl.position.y = -.075; g.add(fl);
  return shadowAll(g, true, false); }
const pp = mkPaddle('#d81a1a'); scene.add(pp); const PP = { x: 0, y: 1.0, tx: 0, ty: 1.0, swing: 0, vx: 0, vy: 0 };
const ap = mkPaddle('#1a1a1a'); ap.children[1].material.color.set('#ffffff'); scene.add(ap);

/* ================= OPPONENT ================= */
const OP = { g: new THREE.Group(), x: 0, tx: 0, M: null, plan: null, swingT: -1, hand: V3(-.35, 1.0, AZ - .1), pad: V3(), react: 0, load: null, step: 0 };
scene.add(OP.g); OP.g.position.set(0, 0, -2.05);
let OPTOK = 0;
function loadOpp(file) { if (OP.load === file && (OP.M || OP.pending)) return; OP.load = file; const tok = ++OPTOK; OP.pending = true; if (OP.M) { OP.g.remove(OP.M.holder); OP.M = null; }
  loadMix('lib/chars/' + file + '.glb').then(src => { if (tok !== OPTOK) return; OP.pending = false; if (!src) return; for (const c of [...OP.g.children]) OP.g.remove(c); const Mx = new MixRig(src, 1.74); Mx.holder.traverse(o => { if (o.isMesh) o.castShadow = true; }); OP.g.add(Mx.holder); OP.M = Mx; }); }
const _v1 = V3(), _v2 = V3(), _q = new THREE.Quaternion();
function posePlayerRig(dt, t) { const Mx = OP.M; if (!Mx) return; OP.cele = Math.max(0, (OP.cele || 0) - dt); OP.sad = Math.max(0, (OP.sad || 0) - dt); const sw = OP.swingT >= 0 ? OP.swingT / .32 : -1; const fore = OP.fore !== false;
  const tw = sw >= 0 ? (fore ? lerp(-.55, .45, ease(sw)) : lerp(.45, -.4, ease(sw))) : (OP.plan && OP.plan.ok ? (OP.plan.side < 0 ? -.3 : .3) : 0); OP.tw = lerp(OP.tw || 0, tw, Math.min(1, dt * 14));
  const bounce = OP.cele > 0 ? Math.max(0, Math.sin(OP.cele * 9)) * .1 : (state === 'play' || state === 'serve') ? Math.abs(Math.sin(t * 5)) * .02 : 0; const crouch = (OP.sad > 0 ? .05 : .13 + (sw >= 0 ? .04 : 0)) - bounce; const d = V3(0, -crouch, 0); Mx.hips(d); const stp = Math.sin(OP.step * 9) * Math.min(1, Math.abs(OP.x - OP.tx) * 3) * .08;
  for (const [sd, sx, ph] of [['Left', 1, 0], ['Right', -1, Math.PI]]) { const hip = Mx.restP[sd + 'UpLeg'].clone().add(d); Mx.legIK(sd, hip, V3(sx * .26 + Math.sin(OP.step * 9 + ph) * stp, Mx.ankleH + Math.max(0, Math.sin(OP.step * 9 + ph)) * stp * .6, .02), V3(0, .1, 1).normalize()); }
  const fw = OP.sad > 0 ? .55 : .34; Mx.aim('Spine', 'Spine1', V3(Math.sin(OP.tw) * .25, 1, fw).normalize()); Mx.aim('Spine1', 'Spine2', V3(Math.sin(OP.tw) * .5, 1, Math.cos(OP.tw) * .22).normalize());
  // right arm: IK toward paddle handle (character space)
  OP.g.updateMatrixWorld(); Mx.holder.updateMatrixWorld(); const inv = new THREE.Matrix4().copy(Mx.holder.matrixWorld).invert(); const handW = ap.localToWorld(V3(0, -.13, 0)); const hc = handW.clone().applyMatrix4(inv);
  const sh = Mx.restP.RightArm.clone().add(d.clone().multiplyScalar(.9)); const reach = sh.distanceTo(Mx.restP.RightForeArm) + Mx.restP.RightForeArm.distanceTo(Mx.restP.RightHand); const dv = hc.clone().sub(sh); if (dv.length() > reach * .98) hc.copy(sh).addScaledVector(dv.normalize(), reach * .98);
  Mx.limbIK('RightArm', 'RightForeArm', 'RightHand', sh, hc, V3(-.6, -.6, -.4).normalize());
  if (OP.cele > 0) { Mx.aim('LeftArm', 'LeftForeArm', V3(.35, .9, .2).normalize()); Mx.aim('LeftForeArm', 'LeftHand', V3(.05, 1, .1).normalize()); } else if (OP.sad > 0) { Mx.aim('LeftArm', 'LeftForeArm', V3(.2, -1, 0).normalize()); Mx.aim('LeftForeArm', 'LeftHand', V3(.1, -1, .1).normalize()); } else { Mx.aim('LeftArm', 'LeftForeArm', V3(.55 - OP.tw * .4, -.5, .55).normalize()); Mx.aim('LeftForeArm', 'LeftHand', V3(-.1, .15, 1).normalize()); }
  // head looks at the ball
  const bc = B.p.clone().applyMatrix4(inv); const hp = Mx.restP.Head.clone().add(d); const ld = bc.sub(hp).normalize(); ld.y = clamp(ld.y, -.6, .4); Mx.aim('Neck', 'Head', OP.sad > 0 ? V3(0, .6, .8).normalize() : V3(ld.x * .4, 1, .25).normalize()); Mx.apply(); gripPaddle(Mx); }
// the paddle sits in the opponent's hand: fingers curl round the handle, the blade follows the forearm
const GQ = new THREE.Quaternion(), GM = new THREE.Matrix4(), GX = V3(), GY = V3(), GZ = V3(), GA = V3(), GB = V3(), GC = V3();
function gripPaddle(Mx) { const H = Mx.B.RightHand, MD = Mx.B.RightHandMiddle1, FA = Mx.B.RightForeArm; if (!H || !MD || !FA) return;
  const cu = window.__curl || [1.15, 1.25, 1.1], ax = window.__cax || 'x', sg = window.__csg || 1;
  for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (let i = 1; i <= 3; i++) { const b = Mx.B['RightHand' + f + i]; if (!b) continue; const q = new THREE.Quaternion().setFromAxisAngle(ax === 'x' ? V3(1, 0, 0) : ax === 'y' ? V3(0, 1, 0) : V3(0, 0, 1), sg * cu[i - 1] * (f === 'Index' ? .85 : 1)); b.quaternion.multiply(q); }
  for (let i = 1; i <= 3; i++) { const b = Mx.B['RightHandThumb' + i]; if (!b) continue; const t = window.__tcurl || [.0, .5, .5]; const q = new THREE.Quaternion().setFromAxisAngle(window.__tax ? V3(...window.__tax) : V3(0, 0, 1), t[i - 1]); b.quaternion.multiply(q); }
  Mx.holder.updateMatrixWorld(true); FA.getWorldPosition(GA); H.getWorldPosition(GB); MD.getWorldPosition(GC);
  const palm = GB.clone().lerp(GC, .55); GY.subVectors(GB, GA).normalize(); // blade continues along the forearm
  const gw = window.__gw || [.45, 1, -.3]; GY.multiplyScalar(gw[0]); GY.y += gw[1]; GY.x += gw[2]; GY.normalize(); // wrist cocked: blade stands up above the hand, face to the net
  GZ.set(0, 0, 1).addScaledVector(GY, -GY.z).normalize(); if (GZ.lengthSq() < 1e-4) GZ.set(1, 0, 0); GX.crossVectors(GY, GZ).normalize(); GZ.crossVectors(GX, GY).normalize();
  GM.makeBasis(GX, GY, GZ); GQ.setFromRotationMatrix(GM); ap.quaternion.copy(GQ); ap.position.copy(palm).addScaledVector(GY, .115); }


/* ================= MATCH STATE ================= */
let state = 'title', M = null, CH = null, slow = 1, shake = 0, msgT = 0;
function newMatch(o) { M = Object.assign({ sc: [0, 0], to: 11, server: Math.random() < .5 ? 0 : 1, serves: 0, rally: 0, lv: LV[S.lvl], names: [T('אתה', 'You'), 'Leo'], flag: '🇧🇷', over: false, points: 0, longest: 0 }, o); }
function setHUD() { $('sb').hidden = false; $('nm0').textContent = M.names[0]; $('nm1').textContent = M.flag + ' ' + M.names[1]; $('sc0').textContent = M.sc[0]; $('sc1').textContent = M.sc[1]; $('sv0').classList.toggle('on', M.server === 0); $('sv1').classList.toggle('on', M.server === 1); $('gm').textContent = M.label || ''; drawScreen(); }
function popTxt(t, col) { const el = document.createElement('div'); el.textContent = t; el.style.cssText = `position:fixed;z-index:7;left:50%;top:58%;transform:translateX(-50%);font-weight:900;font-size:22px;color:${col};text-shadow:0 2px 6px #000;pointer-events:none;transition:all .6s ease-out;opacity:1`; document.body.appendChild(el); requestAnimationFrame(() => { el.style.top = '52%'; el.style.opacity = '0'; }); setTimeout(() => el.remove(), 700); }
function big(txt, sub, blue) { const d = document.createElement('div'); if (blue) d.className = 'b'; d.innerHTML = txt + (sub ? `<small>${sub}</small>` : ''); $('big').innerHTML = ''; $('big').appendChild(d); }
function hint(txt) { $('hint').hidden = !txt; if (txt) $('hintT').textContent = txt; }

/* ================= INPUT ================= */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); const PT = { on: false, x: 0, y: 0, hist: [], id: null, down: 0 };
function toPlane(cx, cy, z) { ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); const o = ray.ray.origin, d = ray.ray.direction; const t = (z - o.z) / d.z; return o.clone().addScaledVector(d, t); }
function swipe(ms = 110) { const h = PT.hist, now = performance.now(); let a = null; for (let i = h.length - 1; i >= 0; i--) { if (now - h[i].t > ms) { a = h[i]; break; } } if (!a) a = h[0]; const b = h[h.length - 1]; if (!a || !b || b.t - a.t < 8) return { vx: 0, vy: 0 }; const dt = (b.t - a.t) / 1000, sc = innerHeight; return { vx: (b.x - a.x) / dt / sc, vy: -(b.y - a.y) / dt / sc }; }
const stage = $('stage');
stage.addEventListener('pointerdown', e => { A.ac(); if (state !== 'play' && state !== 'serve') return; PT.on = true; PT.id = e.pointerId; PT.down = performance.now(); PT.sy = e.clientY; PT.sx = e.clientX; try { stage.setPointerCapture(e.pointerId); } catch (er) { } mv(e); });
const mv = e => { if (!PT.on || e.pointerId !== PT.id) return; PT.x = e.clientX; PT.y = e.clientY; PT.hist.push({ t: performance.now(), x: e.clientX, y: e.clientY }); if (PT.hist.length > 24) PT.hist.shift(); { const q = swipe(90); if (Math.hypot(q.vx, q.vy) > Math.hypot(SWG.vx, SWG.vy) || performance.now() - SWG.t > 260) { SWG.vx = q.vx; SWG.vy = q.vy; SWG.t = performance.now(); } } const off = Math.min(80, innerHeight * .09); const p = toPlane(e.clientX, e.clientY - off, PZ); PP.tx = clamp(p.x, -1.25, 1.25); PP.ty = clamp(p.y, TY + .05, 1.28);
  if (state === 'serve' && M && M.server === 0 && !B.serve) { const s = swipe(); const dy = PT.sy - e.clientY; if (s.vy > .45 || dy > Math.max(35, innerHeight * .05)) playerServe({ vx: s.vx, vy: Math.max(s.vy, .9) }); } };
stage.addEventListener('pointermove', mv);
const upH = e => { if (e.pointerId !== PT.id) return; if (state === 'serve' && M && M.server === 0 && !B.serve && performance.now() - PT.down < 300 && Math.hypot(e.clientX - PT.sx, e.clientY - PT.sy) < 20) playerServe({ vx: 0, vy: 1.2 }); PT.on = false; PT.hist.length = 0; }; stage.addEventListener('pointerup', upH); stage.addEventListener('pointercancel', upH);
addEventListener('keydown', e => { if (e.code === 'Escape') pause(); });

/* ================= SHOTS ================= */
function sfxHit(pw) { A.noise(.035, 'bandpass', 2400 + pw * 1400, 1.4, .3 + pw * .25); A.tone(1500 + pw * 500, .04, 'sine', .14, 0, 900); }
function sfxBounce(net) { if (net) { A.noise(.08, 'lowpass', 500, 1, .22); return; } A.tone(2100, .025, 'sine', .14, 0, 1500); A.noise(.02, 'highpass', 3500, 1, .1); }
function crowdCheer(k = 1) { crowd.cheer = Math.min(2.5, crowd.cheer + k); A.noise(.9 + k * .5, 'bandpass', 900, .6, .06 + k * .04, 0, 1400); }
function hitBall(who, v, w, kind) { B.v.copy(v); B.w.copy(w); B.last = who; B.bP = 0; B.bA = 0; B.net = false; B.tHit = 0; if (!B.serve) { M && M.rally++; } const pw = clamp(v.length() / 16, 0, 1); sfxHit(pw);
  if (kind === 'smash') { shake = .18; GL.burst(B.p, 14, [[3, 2.2, 1], [3, 1.4, .4]], 2.2, .05, .35, 0); if (who === 'p') { slowMo(.35, .45); } }
  if (M && M.rally >= 8 && Math.random() < .5) A.noise(.6, 'bandpass', 600, .8, .035, 0, 900); if (M && M.rally >= 6 && M.rally % 4 === 2) { $('rally').hidden = false; $('rally').textContent = '🔥 ' + T('ראלי ', 'RALLY ') + M.rally; } }
function slowMo(f, d) { slow = f; setTimeout(() => slow = 1, d * 1000); }
// ---- player stroke: the swipe decides everything ----
// direction of the swipe = where on the table the ball goes (precise), swipe speed = power,
// slow swipe = high lob, fast swipe = low hard drive, fast swipe on a high ball = smash downward, swipe down = chop
const SWG = { vx: 0, vy: 0, t: -1e9 };
function strokeNow() { const s = swipe(130), now = performance.now(); const sp = Math.hypot(s.vx, s.vy), sp2 = Math.hypot(SWG.vx, SWG.vy); return (now - SWG.t < 260 && sp2 > sp) ? { vx: SWG.vx, vy: SWG.vy } : s; }
const AIM = (() => { const g = new THREE.Mesh(new THREE.RingGeometry(.05, .075, 32), new THREE.MeshBasicMaterial({ color: '#ffe24a', transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); g.rotation.x = -Math.PI / 2; g.renderOrder = 4; scene.add(g); return { g, t: 0 }; })();
function showAim(p) { AIM.g.position.set(p.x, TY + .004, p.z); AIM.t = .9; }
let HITQ = .5;
function playerShot() { const s = strokeNow(); const perfect = HITQ < .38, edge = HITQ > .8; const sp = Math.hypot(s.vx, s.vy); const hi = B.p.y > TY + .32; let kind, p, tx, tz, Tf, top, side;
  if (sp < .38) { kind = 'block'; p = .35; tx = clamp(PP.x * .6, -.6, .6); tz = -.95; Tf = .6; top = -25; side = 0; }
  else if (s.vy < -.3 && Math.abs(s.vy) > Math.abs(s.vx) * .7) { kind = 'chop'; p = clamp((sp - .3) / 2.4, .15, 1); const ang = Math.atan2(s.vx, -s.vy); tz = -(.45 + p * .5); tx = clamp(B.p.x + Math.tan(clamp(ang, -1.1, 1.1)) * (B.p.z - tz) * .55, -.72, .72); Tf = lerp(.9, .6, p); top = 90 + p * 60; side = clamp(s.vx * 20, -50, 50); }
  else { p = clamp((sp - .38) / 2.7, 0, 1); const ang = Math.atan2(s.vx, Math.max(.2, s.vy)); tz = -(.48 + p * .78); tx = clamp(B.p.x + Math.tan(clamp(ang, -1.15, 1.15)) * (B.p.z - tz) * .55, -.73, .73);
    if (p > .72 && hi) { kind = 'smash'; Tf = .22; top = -120; tz = -(.75 + p * .45); } else if (p < .22) { kind = 'lob'; Tf = lerp(1.0, .85, p / .22); top = -15; } else { kind = p > .7 ? 'power' : 'drive'; Tf = lerp(.6, .24, Math.pow((p - .22) / .78, .85)); top = -(40 + 130 * p); }
    side = clamp(s.vx * 22, -55, 55); }
  if (CH && CH.def.smash && kind !== 'smash' && kind !== 'power') tz = Math.max(tz, -.9);
  if (p > .94) { tz -= (p - .94) * 6 * Math.random(); } // over-hit can sail long
  if (edge && kind !== 'block') { tx += rnd(-.12, .12); tz += rnd(-.1, .15); Tf *= 1.12; } if (perfect && kind !== 'lob' && kind !== 'block') Tf *= .88;
  const tgt = V3(tx, 0, tz); const w0 = spinFor(V3(tx - B.p.x, 0, tz - B.p.z), top, side); const v = solveShot(B.p, tgt, Tf, w0); const L = landing(B.p, v, w0); if (L.land && L.land.y > 0) showAim(L.land);
  hitBall('p', v, w0, kind); PP.swing = 1; PP.fx = clamp(tx - PP.x, -.6, .6); if (kind === 'power' || kind === 'smash') setTimeout(() => popTxt(Math.round(v.length() * 3.6 * 1.6) + ' km/h', '#ffe24a'), 220); if (perfect && p > .3) { popTxt(T('מושלם!', 'PERFECT!'), '#7aff7a'); A.tone(2200, .05, 'sine', .08); } else if (edge && p > .2) popTxt(T('בקצה', 'Edge'), '#ffb84a'); buzz(kind === 'smash' ? 45 : 12 + p * 20);
  const k = kind === 'smash' ? 1 : kind === 'power' ? .7 : kind === 'lob' ? .15 : .35 + p * .3; shake = Math.max(shake, .02 + k * .07); if (k > .5 && kind !== 'smash') { slow = .08; setTimeout(() => slow = 1, 70); }
  GL.burst(B.p, 6 + Math.round(k * 16), [[3, 2.6, 1.6], [2.6, 1.8, .8]], .8 + k * 2, .03 + k * .03, .25, 0);
  if (kind === 'smash') big('SMASH!', '', false); else if (kind === 'lob') A.noise(.25, 'bandpass', 900, 1, .05, 0, 1600); else if (kind === 'power') A.noise(.18, 'bandpass', 1400, .8, .08, 0, 600);
  return kind; }
// ---- opponent: varied, readable shot types ----
function aiShot() { const lv = M.lv; const hi = B.p.y > TY + .34; const smart = Math.random() < lv.smart; const away = PP.x > 0 ? -1 : 1;
  const r = Math.random(); let kind; if (hi && Math.random() < .35 + lv.smart * .5) kind = 'smash'; else if (r < .12 + lv.spin * .12) kind = 'push'; else if (r < .3 + lv.spin * .15) kind = 'loop'; else if (r < .36) kind = 'lob'; else kind = 'drive';
  const pw = rnd(lv.pw[0], lv.pw[1]); let tx = smart ? away * rnd(.25, .68) : rnd(-.6, .6), tz, Tf, top, side = rnd(-1, 1) * 45 * lv.spin;
  if (kind === 'smash') { tz = rnd(.75, 1.15); Tf = lerp(.42, .3, pw); top = -120; } else if (kind === 'push') { tz = rnd(.3, .55); Tf = rnd(.85, 1.0); top = 100; } else if (kind === 'loop') { tz = rnd(.85, 1.2); Tf = lerp(1.0, .75, pw); top = -170 * (.5 + lv.spin * .5); } else if (kind === 'lob') { tz = rnd(.9, 1.2); Tf = rnd(.95, 1.05); top = -20; } else { tz = rnd(.6, 1.2); Tf = lerp(.95, .45, pw); top = -(40 + pw * 100) * (.5 + lv.spin * .5); }
  const e = lv.err * (1 + pw * .8); tx += rnd(-e, e); tz += rnd(-e, e) * 1.2; if (Math.random() < lv.err * .45) { if (Math.random() < .5) tz += rnd(.2, .45); else tx += Math.sign(tx || 1) * rnd(.15, .35); }
  const w0 = spinFor(V3(tx - B.p.x, 0, tz - B.p.z), top, side); let v = solveShot(B.p, V3(tx, 0, tz), Tf, w0); if (Math.random() < lv.err * .3) v.y -= rnd(.5, 1.0); hitBall('a', v, w0, kind); OP.swingT = 0; OP.fore = B.p.x <= OP.g.position.x; if (kind === 'smash') shake = Math.max(shake, .05); }
// serves
function serveSolve(p0, side, tx, tz2, top) { let best = null; for (let t1 = .1; t1 <= .37; t1 += .03) for (let z1f = .35; z1f <= .96; z1f += .061) { const z1 = side * z1f * HL; const x1 = lerp(p0.x, tx, (z1 - p0.z) / (tz2 - p0.z)); const v = V3((x1 - p0.x) / t1, (TY + R - p0.y) / t1 + .5 * G * t1, (z1 - p0.z) / t1); const w = spinFor(v, top, 0); let nb = 0, l2 = null, ok = true;
    simulate(p0, v, w, 2.2, (k, s) => { if (k === 'net') { ok = false; return true; } if (k === 'table') { nb++; if (nb === 1 && s !== (side > 0 ? 'p' : 'a')) { ok = false; return true; } if (nb === 2) { l2 = B.p.clone(); return true; } } if (k === 'floor') { ok = false; return true; } });
    if (!ok || !l2 || Math.sign(l2.z) === side) continue; const err = Math.hypot(l2.x - tx, l2.z - tz2); if (!best || err < best.err) best = { err, v, w }; } return best; }
function anyServe(p0, side, tx, tz, top) { for (const [x, z, sp] of [[tx, tz, top], [tx * .5, tz, top * .5], [0, side * -.9, -30]]) { for (const h of [0, .08, .16, .26]) { const q = p0.clone(); q.y += h; const r = serveSolve(q, side, x, z, sp); if (r) { p0.y = q.y; return r; } } } const v = V3(0, 1.6, side * -4.2); return { v, w: V3(), err: 9 }; }
function playerServe(s) { if (B.serve || state !== 'serve') return; B.serve = true; const pw = clamp(Math.hypot(s.vx, s.vy) / 2.4, .15, 1); const ang = Math.atan2(s.vx, Math.max(.2, s.vy)); const tz = -(.55 + pw * .65); const tx = clamp(PP.x + Math.tan(clamp(ang, -1, 1)) * (PZ - tz) * .5, -.62, .62); B.p.set(clamp(PP.x, -.7, .7), TY + .3, PZ - .2); const sol = anyServe(B.p, 1, tx, tz, -40 - pw * 50);
  hint(''); B.live = true; B.held = null; hitBall('p', sol.v, sol.w, 'serve'); PP.swing = 1; state = 'play'; M.rally = 0; }
function aiServe() { B.serve = true; const lv = M.lv; const tx = rnd(-.55, .55), tz = rnd(.6, 1.15); B.p.set(clamp(OP.g.position.x - .3, -.7, .7), TY + .3, -(HL + .2)); const sol = anyServe(B.p, -1, tx, tz, -30 - lv.spin * 60);
  B.live = true; B.held = null; hitBall('a', sol.v, sol.w, 'serve'); OP.swingT = 0; state = 'play'; M.rally = 0; }

/* ================= RULES ================= */
function onEvent(k, side) { if (!B.live) return; if (k === 'table') { sfxBounce(); FX.emit(B.p.clone(), V3(0, .3, 0), [1, 1, 1], .05, .2, 0, .5);
    if (CH && B.last === 'p' && side === 'a' && !B.chk) { B.chk = 1; chalLand(B.p); }
    if (B.serve) { // serve: first bounce must be on server's side, then the other side
      const sv = B.last === 'p' ? 'p' : 'a'; if (!B.firstB) { B.firstB = side; if (side !== sv) return fault(sv, T('הגשה לא חוקית', 'Bad serve')); return; } if (side === sv) return fault(sv, T('הגשה לא חוקית', 'Bad serve')); B.serve = false; B.firstB = null; }
    const recv = B.last === 'p' ? 'a' : 'p'; if (side === B.last) return fault(B.last, T('נגע בצד שלך', 'Own side!')); if (side === recv) { if (recv === 'p') { B.bP++; if (B.bP >= 2) return win('a', T('קפיצה כפולה', 'Double bounce')); } else { B.bA++; if (B.bA >= 2) return win('p', T('קפיצה כפולה', 'Double bounce')); } } }
  else if (k === 'net') { sfxBounce(true); B.net = true; }
  else if (k === 'floor') { const recv = B.last === 'p' ? 'a' : 'p'; const bounced = recv === 'p' ? B.bP : B.bA; if (bounced >= 1 && !B.serve) return win(B.last, recv === 'p' ? T('לא החזרת', 'Missed!') : T('נקודה!', 'Winner!')); return fault(B.last, B.net ? T('ברשת', 'Net!') : T('בחוץ', 'Out!')); } }
function fault(who, why) { win(who === 'p' ? 'a' : 'p', why); }
function win(who, why) { if (!B.live) return; (window.__why = window.__why || []).push([who, why, B.last, B.bP, B.bA, OP.plan ? OP.plan.ok : null]); B.live = false; B.serve = false; B.firstB = null; if (CH) { chalBallDone(); return; } const i = who === 'p' ? 0 : 1; M.sc[i]++; M.points++; M.longest = Math.max(M.longest, M.rally); $('rally').hidden = true;
  if (i === 0) { OP.sad = 1.4; big(T('נקודה!', 'POINT!'), why, false); crowdCheer(M.rally > 6 ? 2 : 1); A.tone(880, .12, 'triangle', .06); A.tone(1320, .18, 'triangle', .06, .1); } else { OP.cele = 1.3; big(T('נקודה ליריב', 'Their point'), why, true); A.tone(330, .2, 'triangle', .05); crowdCheer(.6); }
  setHUD(); state = 'point'; msgT = 1.7; const [a, b] = M.sc; const to = M.to; if ((a >= to || b >= to) && Math.abs(a - b) >= 2) { M.over = true; msgT = 2.2; return; }
  M.serves++; const per = (a >= to - 1 && b >= to - 1) ? 1 : 2; if (M.serves >= per) { M.serves = 0; M.server = 1 - M.server; } }
function nextPoint() { if (M.over) return endMatch(); setHUD(); { const [a, b] = M.sc, to = M.to; let tag = ''; if (a >= to - 1 && b >= to - 1 && a === b) tag = T('שוויון!', 'DEUCE!'); else if ((a >= to - 1 || b >= to - 1) && a !== b) tag = a > b ? T('נקודת ניצחון שלך! 🔥', 'YOUR MATCH POINT! 🔥') : T('נקודת ניצחון ליריב 😬', 'MATCH POINT – THEM 😬'); if (tag) { const sb = $('sub'); sb.hidden = false; sb.textContent = tag; clearTimeout(nextPoint.t); nextPoint.t = setTimeout(() => sb.hidden = true, 2200); A.tone(660, .15, 'triangle', .05); A.tone(880, .2, 'triangle', .05, .15); } } B.live = false; B.v.set(0, 0, 0); B.w.set(0, 0, 0); state = 'serve'; if (M.server === 0) { B.held = 'p'; hint(isTouch ? T('החליקו למעלה כדי להגיש ☝️', 'Swipe up to serve ☝️') : T('גררו את העכבר למעלה כדי להגיש', 'Drag up to serve')); } else { B.held = 'a'; hint(''); OP.serveT = .9 + rnd(0, .5); } }

/* ================= CHALLENGES ================= */
const TGT = []; { const tm = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .85, depthWrite: false, toneMapped: false }); for (let i = 0; i < 3; i++) { const g = new THREE.Group(); const r1 = new THREE.Mesh(new THREE.RingGeometry(.82, 1, 48), tm('#ffffff')); const r2 = new THREE.Mesh(new THREE.RingGeometry(.42, .62, 40), tm('#ff5a2a')); const r3 = new THREE.Mesh(new THREE.CircleGeometry(.2, 32), tm('#ffe24a')); g.add(r1, r2, r3); g.rotation.x = -Math.PI / 2; g.position.y = TY + .003; g.visible = false; scene.add(g); TGT.push(g); } }
const machine = (() => { const g = new THREE.Group(); const b = new THREE.Mesh(new RoundedBoxGeometry(.36, .3, .3, 3, .05), std('#ff5a2a', { roughness: .35, metalness: .3 })); b.position.y = .15; g.add(b); const n = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, .2, 16), std('#222', { metalness: .6 })); n.rotation.x = Math.PI / 2; n.position.set(0, .2, .2); g.add(n); const hop = new THREE.Mesh(new THREE.CylinderGeometry(.16, .1, .2, 18, 1, true), new THREE.MeshPhysicalMaterial({ color: '#cfe8ff', transmission: .6, roughness: .1, transparent: true, opacity: .6 })); hop.position.y = .4; g.add(hop); const st = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .5, 8), std('#333')); st.position.y = -.25; g.add(st); g.position.set(0, TY + .55, -(HL + .25)); g.visible = false; scene.add(shadowAll(g)); return g; })();
function startChal(i) { const def = CHALS[i]; CH = { i, def, n: 0, hits: 0, score: 0, t: 0, feedT: 1.2 }; M = null; TGT.forEach((g, k) => { const tg = def.tg[k]; g.visible = !!tg; if (tg) { g.position.x = tg[0]; g.position.z = tg[1]; g.scale.setScalar(tg[2]); g.userData.tg = tg; } }); machine.visible = true; OP.g.visible = false; ap.visible = false; $('sb').hidden = true; chalHUD(); state = 'chal'; B.live = false; ball.visible = false; }
function chalHUD() { const s = $('sub'); s.hidden = false; s.innerHTML = `${CH.def.e} ${CH.def.n} · 🎯 <b>${CH.score}</b> · ⚪ ${Math.min(BALLS, CH.n)}/${BALLS}`; }
function chalFeed() { const d = CH.def; ball.visible = true; B.serve = false; B.firstB = null; B.chk = 0; B.p.copy(machine.position).add(V3(0, -.05, .25)); const tx = d.feed === 'easy' ? rnd(-.15, .15) : rnd(-.45, .45), tz = d.feed === 'easy' ? rnd(.75, .95) : rnd(.6, 1.15); const T0 = d.feed === 'easy' ? .95 : .75; const top = d.feed === 'chop' ? 110 : -40;
  const w0 = spinFor(V3(tx, 0, tz - B.p.z), top, 0); const v = solveShot(B.p.clone(), V3(tx, 0, tz), T0, w0); B.live = true; hitBall('a', v, w0, 'feed'); B.bA = 0; CH.n++; CH.feedT = 99; chalHUD(); A.noise(.12, 'lowpass', 700, 1, .15); }
function chalLand(p) { const d = CH.def; let got = 0; TGT.forEach(g => { if (!g.visible) return; const tg = g.userData.tg, r = tg[2]; const dd = Math.hypot(p.x - g.position.x, p.z - g.position.z); if (dd < r) { const sp = B.v.length(); if (d.smash && sp < 9) { big(T('חזק יותר!', 'Harder!'), '', true); return; } const pts = dd < r * .2 ? 3 : dd < r * .62 ? 2 : 1; got = Math.max(got, pts); } });
  if (got) { CH.score += got; CH.hits++; big(got === 3 ? T('בול!', 'BULLSEYE!') : '+' + got, '', false); A.tone(1047, .12, 'triangle', .07); A.tone(1568, .2, 'triangle', .07, .08); crowdCheer(got === 3 ? 1.5 : .7); GL.burst(p.clone().setY(TY + .05), 18, [[3, 2.4, .8], [3, 1.2, .4]], 1.5, .05, .6, 2); } chalHUD(); }
function chalBallDone() { if (CH.n >= BALLS) { state = 'point'; msgT = 1.4; CH.done = true; } else { CH.feedT = 1.1; state = 'chal'; } }
function endChal() { const d = CH.def; const st = CH.score >= d.th[2] ? 3 : CH.score >= d.th[1] ? 2 : CH.score >= d.th[0] ? 1 : 0; const k = 'c' + CH.i; const prev = S.chal[k] || 0; if (st > prev) S.chal[k] = st; const coins = st * 10 + (st > prev ? 10 : 0); S.coins += coins; S.save();
  showEnd(st ? '⭐'.repeat(st) : '🎯', `${d.e} ${d.n}`, [[T('ניקוד', 'Score'), CH.score], [T('פגיעות', 'Hits'), CH.hits + '/' + BALLS], ['🪙', '+' + coins]], `⭐ ${d.th[0]} · ⭐⭐ ${d.th[1]} · ⭐⭐⭐ ${d.th[2]}`, st > 0 && CH.i < CHALS.length - 1 ? T('לאתגר הבא ▶', 'Next challenge ▶') : T('שוב 🔁', 'Again 🔁'), () => startGame(st > 0 && CH.i < CHALS.length - 1 ? CH.i + 1 : CH.i)); if (st) { A.voice('yay', 1.2); confetti(); } }

/* ================= GAME LOOP ================= */
let last = performance.now(), tAcc = 0;
function physics(dt) { const sub = 4, h = dt / sub; for (let i = 0; i < sub; i++) { if (!B.live) break; stepBall(h, onEvent); B.tHit += h; checkHits(); } }
function checkHits() { if (!B.live) return; const lv = M ? M.lv : LV[1];
  // player hit window
  if (B.last !== 'p' && B.v.z > 0 && B.bP >= 1 && B.p.z > .45 && B.p.z < PZ + .3 && ((B.v.y < 0 && B.p.y < TY + .32) || B.p.z > PZ - .35)) { const d = Math.hypot(B.p.x - PP.x, B.p.y - PP.y); const swg = performance.now() - SWG.t < 220 && Math.hypot(SWG.vx, SWG.vy) > .8 ? 1.35 : 1; const hr = (CH ? .23 : lv.hr) * swg; if (d < hr) { HITQ = d / hr; playerShot(); return; } }
  // opponent hit (follows its plan)
  if (!CH && B.last === 'p' && B.v.z < 0 && B.bA >= 1 && OP.plan && OP.plan.ok && B.p.z < OP.plan.p.z + .06) { const d = Math.abs(OP.g.position.x + OP.plan.side - B.p.x); if (d < .22 + lv.reach * .3) { aiShot(); OP.plan = null; } else OP.plan.ok = false; } }
function planAI() { // predict where the ball will be when it reaches the AI hit plane after one bounce on AI side
  const lv = M.lv; let bounced = false, hit = null; simulate(B.p, B.v, B.w, 2.2, (k, s) => { if (k === 'table' && s === 'a') bounced = true; if (k === 'net' || k === 'floor') return true; if (k === 'step' && bounced && B.v.z < 0 && B.p.y > TY - .05 && (B.p.z < AZ + .15 || (B.v.y < 0 && B.p.y < TY + .3 && B.p.z < -.45))) { hit = B.p.clone(); return true; } if (k === 'step' && bounced && B.p.z < -HL - .9) return true; });
  if (!hit) { OP.plan = { ok: false }; return; } const side = hit.x < OP.g.position.x + .05 ? -.4 : .32; OP.plan = { ok: true, p: hit, side, tx: clamp(hit.x - side, -2.2, 2.2) }; OP.react = lv.react; }
function oppTick(dt, t) { if (CH) return; const lv = M ? M.lv : LV[1]; if (B.live && B.last === 'p' && !OP.plan) planAI(); if (B.last === 'a' || !B.live) { OP.plan = null; }
  let tx = OP.plan && OP.plan.ok ? OP.plan.tx : B.held === 'a' ? .3 : clamp(B.p.x * .4, -.5, .5); if (OP.react > 0) { OP.react -= dt; tx = OP.g.position.x; }
  const dx = tx - OP.g.position.x, mvs = Math.min(Math.abs(dx), lv.spd * dt); OP.g.position.x += Math.sign(dx) * mvs; const tz = OP.plan && OP.plan.ok ? clamp(OP.plan.p.z - .62, -2.4, -1.55) : -2.05; OP.g.position.z = lerp(OP.g.position.z, tz, Math.min(1, dt * lv.spd * .9)); if (mvs > .001) OP.step += dt; OP.x = OP.g.position.x; OP.tx = tx;
  // paddle: ready position, swing toward the ball when it approaches
  const ready = V3(OP.g.position.x - .36, TY + .3, OP.g.position.z + .75); let pad = ready.clone(), rotY = 0, rotZ = .3;
  if (OP.plan && OP.plan.ok && B.live) { const dz = B.p.z - OP.plan.p.z; const k = clamp(1 - dz / 1.6, 0, 1); pad.lerp(V3(B.p.x, B.p.y, OP.plan.p.z - .04), k * k); rotZ = OP.plan.side < 0 ? .5 : -.3; }
  if (OP.swingT >= 0) { OP.swingT += dt; const s = OP.swingT / .32; if (s >= 1) OP.swingT = -1; else { const ft = Math.sin(s * Math.PI); pad.add(V3(Math.sin(s * Math.PI) * .25 * (rotZ > 0 ? 1 : -1), ft * .18, ft * .25)); rotY = ft * .6; } }
  if (B.held === 'a') { pad.set(OP.g.position.x - .3, TY + .22, -(HL + .25)); }
  OP.pad.lerp(pad, Math.min(1, dt * 18)); ap.position.copy(OP.pad); ap.rotation.set(-.2, Math.PI + rotY, rotZ);
  if (B.held === 'a' && state === 'serve') { OP.serveT -= dt; B.p.set(OP.pad.x, OP.pad.y + .05 + Math.max(0, Math.sin(t * 3)) * .04, OP.pad.z + .1); if (OP.serveT <= 0 && !B.serve) { B.p.y += .1; aiServe(); } }
  posePlayerRig(dt, t); }
function playerTick(dt, t) { const lv = M ? M.lv : LV[1]; let tx = PP.tx, ty = PP.ty;
  // aim assist: pull the paddle toward the incoming ball
  if (B.live && B.last !== 'p' && B.v.z > 0 && lv.mag > 0 && !CH) { const k = lv.mag * clamp(1 - (PZ - B.p.z) / 2.4, 0, 1); tx = lerp(tx, B.p.x, k); ty = lerp(ty, clamp(B.p.y, TY + .08, 1.4), k * .6); }
  if (CH && B.live && B.v.z > 0) { const k = .35 * clamp(1 - (PZ - B.p.z) / 2.4, 0, 1); tx = lerp(tx, B.p.x, k); }
  const ox = PP.x, oy = PP.y; PP.x = lerp(PP.x, tx, Math.min(1, dt * 22)); PP.y = lerp(PP.y, ty, Math.min(1, dt * 22)); PP.vx = (PP.x - ox) / dt; PP.vy = (PP.y - oy) / dt; PP.swing = Math.max(0, PP.swing - dt * 4.5); AIM.t = Math.max(0, AIM.t - dt); AIM.g.material.opacity = Math.min(1, AIM.t * 2) * .9; AIM.g.scale.setScalar(1 + (.9 - AIM.t) * .6);
  PP.z = lerp(PP.z || PZ, B.live && B.last !== 'p' && B.v.z > 0 && B.bP >= 1 ? clamp(B.p.z + .04, .5, PZ) : PZ, Math.min(1, dt * 14)); const sw = Math.sin(PP.swing * Math.PI); pp.position.set(PP.x + sw * (PP.fx || 0) * .35, PP.y + sw * .12, PP.z - sw * .32); pp.rotation.set(-.35 - sw * .7, clamp(-PP.x * .25, -.4, .4), clamp(-PP.vx * .02, -.5, .5) + (PP.x < 0 ? .25 : -.25));
  if (B.held === 'p') { B.p.set(PP.x, PP.y + .16 + Math.abs(Math.sin(t * 3)) * .05, PZ - .12); B.v.set(0, 0, 0); } }
let CAMX = 0;
function camTick(dt) { if (window.__camOv) { window.__camOv(camera, dt); return; } const asp = innerWidth / innerHeight; const port = asp < 1; const z = port ? 3.35 : 2.9, y = port ? 1.85 : 1.62; const fov = port ? 66 : 48; if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  let want = state === 'title' ? Math.sin(performance.now() / 4000) * 1.2 : PP.x * .25; if (state !== 'title' && B.live && B.p.z > 0) want = lerp(want, clamp(B.p.x, -1.2, 1.2) * (port ? .75 : .45), clamp(B.p.z / 1.4, 0, 1)); CAMX = lerp(CAMX, want, Math.min(1, dt * (port ? 5 : 3.5))); const fx = CAMX; camera.position.set(fx + (Math.random() - .5) * shake, y + (Math.random() - .5) * shake, z); camera.lookAt(fx * .6, TY + (port ? .2 : .12), port ? -1.0 : -.55); shake = Math.max(0, shake - dt * .8); }
function loop(now) { requestAnimationFrame(loop); let dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000; A.tick(); const pdt = dt * slow;
  if (state === 'play' || state === 'serve' || state === 'chal' || state === 'point') {
    if (state === 'play') physics(pdt); else if (state === 'point') { if (B.live === false && ball.visible) { const ev = () => { }; for (let i = 0; i < 4; i++) stepBall(pdt / 4, ev); } msgT -= dt; if (msgT <= 0) { if (CH) { if (CH.done) endChal(); else state = 'chal'; } else nextPoint(); } }
    if (state === 'chal') { physicsChal(pdt); }
    playerTick(dt, t); oppTick(pdt, t);
    if (state === 'play' && B.live && B.tHit > 4) { const side = B.p.z > 0 ? 'p' : 'a'; win(side === 'p' ? 'a' : 'p', T('הכדור נעצר', 'Dead ball')); } }
  else if (state === 'title') { titleTick(dt, t); }
  ball.position.copy(B.p); { const wl = B.w.length(); if (wl > .5) ball.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(B.w.clone().divideScalar(wl), wl * pdt * .09)); }
  const onT = Math.abs(B.p.x) < HW && Math.abs(B.p.z) < HL; const gy = onT && B.p.y > TY ? TY + .002 : .002; bShadow.position.set(B.p.x, gy, B.p.z); const hgt = B.p.y - gy; bShadow.scale.setScalar(1 + hgt * 1.4); bShadow.material.opacity = clamp(1 - hgt * .6, .15, 1) * (ball.visible ? 1 : 0);
  trail.unshift(B.p.clone()); if (trail.length > TRN) trail.pop(); const sp = B.v.length(); if (B.live && sp > 6 && ball.visible) for (let i = 2; i < trail.length; i += 3) GL.emit(trail[i], V3(), sp > 13 ? [2.4, 1.2, .5] : [1.2, 1.3, 1.6], .022 * (1 - i / TRN) + .006, .06, 0, .5);
  if (TGT[0].visible && CH && CH.def.move) TGT[0].position.x = Math.sin(t * 1.1) * .5;
  LED.forEach(tx => tx.offset.x = (t * .05) % 1); crowdTick(t, dt); camTick(dt); FX.update(dt); GL.update(dt); E.render(); }
function physicsChal(dt) { if (!B.live) { CH.feedT -= dt; if (CH.feedT <= 0 && CH.n < BALLS) chalFeed(); else if (CH.feedT <= 0 && CH.n >= BALLS && !CH.done) { CH.done = true; state = 'point'; msgT = .6; } return; } const sub = 4, h = dt / sub; for (let i = 0; i < sub; i++) { if (!B.live) break; stepBall(h, chalEvent); B.tHit += h; checkHits(); } if (B.live && B.tHit > 4) { B.live = false; chalBallDone(); } }
function chalEvent(k, side) { if (!B.live) return; if (k === 'table') { sfxBounce(); if (B.last === 'a' && side === 'p') B.bP++; if (B.last === 'p' && side === 'a' && !B.chk) { B.chk = 1; chalLand(B.p); } if (B.last === 'p' && side === 'a') { B.live = false; setTimeout(() => { if (CH) chalBallDone(); }, 350); } if (B.last === 'p' && side === 'p') { B.live = false; chalBallDone(); } } else if (k === 'net') sfxBounce(true); else if (k === 'floor') { B.live = false; chalBallDone(); } }

/* ================= FLOW ================= */
let pendTour = null;
function startGame(chal) { $('title').hidden = true; $('endSheet').hidden = true; $('hud').hidden = false; $('sub').hidden = true; $('rally').hidden = true; TGT.forEach(g => g.visible = false); machine.visible = false; CH = null; ap.visible = true; OP.g.visible = true; ball.visible = true; A.ac();
  if (S.mode === 'chal') { startChal(chal != null ? chal : S.chalSel || 0); hint(T('החזירו את הכדור אל המטרות! החליקו למעלה דרך הכדור', 'Return the ball onto the targets! Swipe up through the ball')); setTimeout(() => hint(''), 3500); return; }
  if (S.mode === 'tour') { const tr = TOURS[S.tour], rd = S.round || 0; const o = OPP[(S.tour * 3 + rd + 2) % OPP.length]; newMatch({ lv: LV[tr.lv[rd]], names: [T('אתה', 'You'), o[0]], flag: o[1], to: tr.pts[rd], label: `${tr.e} ${ROUNDS[rd]}` }); loadOpp(o[2]); }
  else { const o = OPP[(S.wins + S.lvl) % OPP.length]; newMatch({ lv: LV[S.lvl], names: [T('אתה', 'You'), o[0]], flag: o[1], to: S.short ? 7 : 11, label: LV[S.lvl].n }); loadOpp(o[2]); }
  $('sub').hidden = false; $('sub').textContent = `${M.label} · ${T('משחק עד', 'Game to')} ${M.to}`; setTimeout(() => { if (state !== 'title') $('sub').hidden = true; }, 3000);
  OP.g.position.x = 0; OP.plan = null; setHUD(); state = 'point'; msgT = .8; M.serves = 0; big(M.flag + ' ' + M.names[1], M.lv.n, true); A.voice('wow', 1.1);
  if ((S.tut || 0) < 2) { S.tut = 2; S.save(); setTimeout(showHelp, 600); } }
function endMatch() { state = 'done'; const won = M.sc[0] > M.sc[1]; hint(''); let coins = won ? 20 + S.lvl * 10 : 5; let title = won ? T('ניצחת! 🏆', 'You win! 🏆') : T('הפסד הפעם', 'Not this time'); let goTxt = T('משחק נוסף 🔁', 'Play again 🔁'), goFn = () => startGame(); let note = '';
  if (won) { S.wins++; crowdCheer(2.5); confetti(); A.voice('yay', 1.2); [0, 4, 7, 12].forEach((k, i) => A.tone(523 * Math.pow(2, k / 12), .25, 'triangle', .07, i * .1)); }
  if (S.mode === 'tour') { const tr = TOURS[S.tour]; const rd = S.round || 0; if (won) { if (rd < 2) { S.round = rd + 1; goTxt = T('לסיבוב הבא ▶', 'Next round ▶'); note = T('עליתם ל', 'You reached the ') + ROUNDS[rd + 1] + '!'; coins += 10; } else { S.round = 0; S.tro[S.tour] = 1; coins += tr.prize; title = tr.e + ' ' + T('אלופים!', 'Champions!'); note = T('זכיתם ב', 'You won the ') + tr.n + '!'; if (S.tour < TOURS.length - 1) { S.tour++; goTxt = T('לטורניר הבא ▶', 'Next tournament ▶'); } } }
    else { S.round = 0; note = T('הטורניר נגמר – נסו שוב מההתחלה!', 'Tournament over – try again from the start!'); goTxt = T('נסו שוב 🔁', 'Try again 🔁'); } }
  else if (won && S.lvl < LV.length - 1) { note = T('נסו את הרמה הבאה: ', 'Try the next level: ') + LV[S.lvl + 1].n; }
  S.coins += coins; S.best = Math.max(S.best, M.longest); S.save();
  showEnd(won ? '🏆' : '🏓', title, [[M.names[0], M.sc[0]], [M.flag + ' ' + M.names[1], M.sc[1]], [T('ראלי הכי ארוך', 'Longest rally'), M.longest], ['🪙', '+' + coins]], note, goTxt, goFn); }
function showEnd(e, t, rows, p, goTxt, goFn) { $('eE').textContent = e; $('eT').textContent = t; $('eRes').innerHTML = rows.map(([a, b], i) => `<li class="${i === 0 ? 'w' : ''}"><span>${a}</span><b>${b}</b></li>`).join(''); $('eP').textContent = p || ''; $('eGo').textContent = goTxt; $('eGo').onclick = () => { $('endSheet').hidden = true; goFn(); }; setTimeout(() => $('endSheet').hidden = false, 700); state = 'done'; $('coinTxt').textContent = S.coins; }
function confetti() { for (let i = 0; i < 90; i++) FX.emit(V3(rnd(-2, 2), 3.2, rnd(-2, 1)), V3(rnd(-.6, .6), rnd(-.5, .6), rnd(-.6, .6)), CONFETTI[i % CONFETTI.length], rnd(.04, .07), rnd(2, 3.4), 1.6, 1, .97); }
function pause() { if (state === 'title' || state === 'done') return; state0 = state; state = 'pause'; $('pauseSheet').hidden = false; } let state0 = 'play';
function resume() { $('pauseSheet').hidden = true; state = state0; last = performance.now(); }
function showHelp() { $('helpSheet').hidden = false; }

/* ================= TITLE ================= */
const MODES = [['cpu', '🏓', T('משחק מהיר', 'Quick match')], ['tour', '🏆', T('קריירה', 'Career')], ['chal', '🎯', T('אתגרים', 'Challenges')]];
function renderTitle() { $('tTro').textContent = Object.keys(S.tro).length; $('tCoins').textContent = S.coins; $('modeSeg').innerHTML = MODES.map(([k, ic, n]) => `<button class="${S.mode === k ? 'on' : ''}" data-m="${k}"><span>${ic}</span>${n}</button>`).join('');
  const o = $('optRow'), inf = $('modeInfo');
  if (S.mode === 'cpu') { inf.textContent = T('בחרו רמת יריב:', 'Pick your opponent level:'); o.innerHTML = LV.map((l, i) => `<button class="${S.lvl === i ? 'on' : ''}" data-l="${i}">${l.n}<small>${'●'.repeat(i + 1)}</small></button>`).join('') + `<button class="${S.short ? 'on' : ''}" data-s="1">${S.short ? T('עד 7 ✓', 'To 7 ✓') : T('עד 7', 'To 7')}</button>`; $('goBtn').textContent = T('🏓 בואו נשחק!', '🏓 Let’s play!'); }
  else if (S.mode === 'tour') { const tr = TOURS[S.tour], rd = S.round || 0; inf.innerHTML = `${tr.e} <b>${tr.n}</b> · ${T('פרס', 'Prize')} ${tr.prize} 🪙`; o.innerHTML = `<div class="bracket" style="width:100%">${ROUNDS.map((r, i) => `<div class="${i < rd ? 'dn' : i === rd ? 'cur' : ''}">${r}<br>${OPP[(S.tour * 3 + i + 2) % OPP.length][1]} ${OPP[(S.tour * 3 + i + 2) % OPP.length][0]}<br><small>${LV[tr.lv[i]].n}</small></div>`).join('')}</div>` + TOURS.map((t, i) => `<button class="${i === S.tour ? 'on' : ''} ${i > 0 && !S.tro[i - 1] ? 'lk' : ''}" data-t="${i}">${S.tro[i] ? '🏆' : t.e} ${t.n}</button>`).join(''); $('goBtn').textContent = rd ? T('▶ המשך טורניר', '▶ Continue tournament') : T('🏆 התחל טורניר', '🏆 Start tournament'); }
  else { inf.textContent = T('20 כדורים – פגעו במטרות על השולחן', '20 balls – hit the targets on the table'); o.innerHTML = CHALS.map((c, i) => { const lk = i > 0 && !(S.chal['c' + (i - 1)] > 0); const st = S.chal['c' + i] || 0; return `<button class="${(S.chalSel || 0) === i ? 'on' : ''} ${lk ? 'lk' : ''}" data-c="${i}">${c.e} ${c.n}<small>${'★'.repeat(st)}${'☆'.repeat(3 - st)}</small></button>`; }).join(''); $('goBtn').textContent = T('🎯 לאתגר!', '🎯 Start challenge!'); } }
$('modeSeg').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; A.ac(); S.mode = b.dataset.m; S.save(); A.tone(700, .05, 'triangle', .05); renderTitle(); };
$('optRow').onclick = e => { const b = e.target.closest('button'); if (!b) return; A.ac(); A.tone(760, .05, 'triangle', .05);
  if (b.dataset.l != null) S.lvl = +b.dataset.l; else if (b.dataset.s) S.short = S.short ? 0 : 1; else if (b.dataset.t != null) { const i = +b.dataset.t; if (i > 0 && !S.tro[i - 1]) { toast(T('🔒 זכו קודם בטורניר הקודם', '🔒 Win the previous tournament first')); return; } if (i !== S.tour) { S.tour = i; S.round = 0; } } else if (b.dataset.c != null) { const i = +b.dataset.c; if (i > 0 && !(S.chal['c' + (i - 1)] > 0)) { toast(T('🔒 קבלו לפחות כוכב באתגר הקודם', '🔒 Get at least one star in the previous challenge')); return; } S.chalSel = i; }
  S.save(); renderTitle(); };
$('goBtn').onclick = () => startGame();
function showTitle() { state = 'title'; CH = null; M = null; $('title').hidden = false; ['hud', 'sb', 'sub', 'rally', 'hint', 'endSheet', 'pauseSheet'].forEach(id => $(id).hidden = true); TGT.forEach(g => g.visible = false); machine.visible = false; OP.g.visible = true; ap.visible = true; ball.visible = true; B.live = false; B.held = null; renderTitle(); drawScreen(); if (!OP.M) loadOpp('remy'); }
let titleRally = 0;
function titleTick(dt, t) { // attract mode: the cub-style demo rally between two paddles
  titleRally -= dt; if (!B.live && titleRally <= 0) { B.p.set(0, TY + .3, HL - .1); const tgt = V3(rnd(-.4, .4), 0, -rnd(.6, 1.1)); const w0 = spinFor(V3(tgt.x, 0, tgt.z - B.p.z), -60, 0); B.v.copy(solveShot(B.p, tgt, .7, w0)); B.w.copy(w0); B.live = true; B.last = 'p'; titleRally = 99; }
  if (B.live) { for (let i = 0; i < 4; i++) stepBall(dt / 4, (k) => { if (k === 'table') sfxBounceQuiet(); if (k === 'floor' || k === 'net') { B.live = false; titleRally = .5; } });
    if (B.v.z < 0 && B.p.z < AZ + .1 && B.p.y > TY) { const tgt = V3(rnd(-.45, .45), 0, rnd(.6, 1.1)); const w0 = spinFor(V3(tgt.x - B.p.x, 0, tgt.z - B.p.z), -70, 0); B.v.copy(solveShot(B.p, tgt, .75, w0)); B.w.copy(w0); OP.swingT = 0; }
    if (B.v.z > 0 && B.p.z > PZ - .1 && B.p.y > TY) { const tgt = V3(rnd(-.45, .45), 0, -rnd(.6, 1.1)); const w0 = spinFor(V3(tgt.x - B.p.x, 0, tgt.z - B.p.z), -70, 0); B.v.copy(solveShot(B.p, tgt, .75, w0)); B.w.copy(w0); PP.swing = 1; } }
  PP.tx = clamp(B.p.x, -1, 1); PP.ty = clamp(B.p.y, TY + .1, 1.3); playerTick(dt, t); OP.plan = B.v.z < 0 ? { ok: true, p: V3(B.p.x, B.p.y, AZ), side: -.38, tx: B.p.x + .38 } : null; oppTickTitle(dt, t); }
function sfxBounceQuiet() { }
function oppTickTitle(dt, t) { const tx = OP.plan ? OP.plan.tx : 0; OP.g.position.x = lerp(OP.g.position.x, tx, Math.min(1, dt * 3)); OP.step += dt * Math.min(1, Math.abs(tx - OP.g.position.x) * 4); const pad = V3(OP.g.position.x - .36, TY + .3, -(HL + .3)); if (OP.plan) pad.lerp(V3(B.p.x, B.p.y, AZ - .04), clamp(1 - (B.p.z - AZ) / 1.6, 0, 1)); OP.pad.lerp(pad, Math.min(1, dt * 14)); ap.position.copy(OP.pad); ap.rotation.set(-.2, Math.PI, .3); posePlayerRig(dt, t); }

/* ================= BOOT ================= */
$('pauseBtn').innerHTML = ICO.pause('#ffffff'); $('homeT').innerHTML = ICO.home('#ffffff'); soundButton('sndBtn', S, A, '#1c2240'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('pauseBtn').onclick = () => pause(); $('pGo').onclick = () => resume(); $('pMenu').onclick = () => { $('pauseSheet').hidden = true; showTitle(); }; $('eMenu').onclick = () => { $('endSheet').hidden = true; showTitle(); };
$('pT').textContent = T('הפסקה', 'Paused'); $('pMenu').textContent = T('תפריט', 'Menu'); $('pGo').textContent = T('המשך ▶', 'Resume ▶'); $('eMenu').textContent = T('תפריט', 'Menu');
$('helpBtn').textContent = T('❓ איך משחקים', '❓ How to play'); $('helpBtn').onclick = () => { A.ac(); showHelp(); }; $('hX').textContent = T('הבנתי! 🏓', 'Got it! 🏓'); $('hX').onclick = () => $('helpSheet').hidden = true; $('hT').textContent = T('איך משחקים', 'How to play');
$('hB').innerHTML = T('☝️ <b>המחבט זז עם האצבע</b> – שימו אותו מול הכדור.<br>🎯 <b>הכיוון של ההחלקה = לאן הכדור טס</b>: החליקו ישר, אלכסון שמאלה או אלכסון ימינה – הכדור נוחת בדיוק לשם (העיגול הצהוב מראה איפה).<br>🐢 <b>החלקה איטית</b> = כדור גבוה ורך (לוב).<br>⚡ <b>החלקה מהירה</b> = מכה חזקה ושטוחה; על כדור גבוה = סמאש!<br>⬇️ <b>החלקה למטה</b> = חיתוך עם ספין אחורי.<br>✋ <b>מחבט עומד</b> = חסימה רכה.<br>🎾 הגשה: החליקו למעלה כשהכדור מעל המחבט.<br>⚠️ מכה מהירה מדי עלולה לעוף החוצה!',
  '☝️ <b>The paddle follows your finger</b> – put it in front of the ball.<br>🎯 <b>The direction of your swipe = where the ball goes</b>: swipe straight, diagonally left or right – the ball lands exactly there (the yellow ring shows where).<br>🐢 <b>Slow swipe</b> = high soft ball (lob).<br>⚡ <b>Fast swipe</b> = hard flat shot; on a high ball = SMASH!<br>⬇️ <b>Swipe down</b> = chop with backspin.<br>✋ <b>Still paddle</b> = soft block.<br>🎾 Serve: swipe up while the ball floats over your paddle.<br>⚠️ Swipe too fast and the ball may fly out!');
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
setTimeout(() => { E.resize(); showTitle(); $('loading').hidden = true; $('coinTxt').textContent = S.coins; requestAnimationFrame(loop); window.__pongOK = true; }, 30);
window.__pong = { serveSolve, simulate, playerServe, SWG, get state() { return state; }, set state(v) { state = v; }, B, PP, OP, get M() { return M; }, get CH() { return CH; }, startGame, LV, S, playerShot, swipe, PT, camera, solveShot, landing };
