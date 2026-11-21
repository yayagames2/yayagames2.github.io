import { THREE, $, V3, C, clamp, lerp, rnd, T, EN, store, engine, studioEnv, std, particles, CONFETTI, audio, toast, ICO, hubButtons, qualityButton, isTouch } from '../lib/kit.js';
const S = store('goal-save', { mode: 'cpu', diff: 'normal', len: '3', w: 0, l: 0, wins: [0, 0], q: 'high' });
const E = engine(S, { fov: 40, bloom: [.35, .5, 1.05], exposure: 1.05, bg: '#0b1426', far: 400, vignette: .3 });
const { scene, camera } = E; const A = audio(S); const FX = particles(E, 1200);
studioEnv(E, '#cfe0ff', '#2a3a2a', .45);

/* ================= WORLD ================= */
const HL = 15, HW = 10, GW = 2.6, GH = 2.1, BR = .22; // half length, half width, half goal width, goal height, ball radius
scene.fog = new THREE.Fog('#0b1426', 70, 160);
const hemi = new THREE.HemisphereLight('#bcd4ff', '#1a3a1a', .55); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e0', 2.3); sun.position.set(-14, 30, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 22, bottom: -22, near: 5, far: 80 }); sun.shadow.bias = -.0004; scene.add(sun);
function pitchTex() { const c = document.createElement('canvas'); c.width = 1024; c.height = 1536; const x = c.getContext('2d'); const sx = c.width / (HW * 2 + 6), sz = c.height / (HL * 2 + 6); const px = v => (v + HW + 3) * sx, pz = v => (v + HL + 3) * sz;
  x.fillStyle = '#2f7a34'; x.fillRect(0, 0, c.width, c.height); const n = 12; for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? '#348a3a' : '#2d7532'; x.fillRect(0, pz(-HL) + i * (2 * HL / n) * sz, c.width, (2 * HL / n) * sz + 1); }
  const im = x.getImageData(0, 0, c.width, c.height), d = im.data; for (let i = 0; i < d.length; i += 4) { const v = (Math.random() - .5) * 18; d[i] += v; d[i + 1] += v * 1.2; d[i + 2] += v * .6; } x.putImageData(im, 0, 0);
  x.strokeStyle = 'rgba(255,255,255,.92)'; x.lineWidth = .12 * sx; x.strokeRect(px(-HW), pz(-HL), 2 * HW * sx, 2 * HL * sz); x.beginPath(); x.moveTo(px(-HW), pz(0)); x.lineTo(px(HW), pz(0)); x.stroke();
  x.beginPath(); x.ellipse(px(0), pz(0), 3 * sx, 3 * sz, 0, 0, Math.PI * 2); x.stroke(); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(px(0), pz(0), .2 * sx, .2 * sz, 0, 0, 7); x.fill();
  for (const s of [-1, 1]) { const g = s * HL; x.strokeRect(px(-6), s < 0 ? pz(g) : pz(g - 5 * s), 12 * sx, 5 * sz); x.strokeRect(px(-3.2), s < 0 ? pz(g) : pz(g - 2 * s), 6.4 * sx, 2 * sz); x.beginPath(); x.ellipse(px(0), pz(g - 3.6 * s), .18 * sx, .18 * sz, 0, 0, 7); x.fill();
    x.beginPath(); x.ellipse(px(0), pz(g - 3.6 * s), 2.6 * sx, 2.6 * sz, 0, s < 0 ? .6 : Math.PI + .6, s < 0 ? Math.PI - .6 : Math.PI * 2 - .6); x.stroke(); }
  for (const [cxp, czp] of [[-HW, -HL], [HW, -HL], [-HW, HL], [HW, HL]]) { x.beginPath(); x.ellipse(px(cxp), pz(czp), .8 * sx, .8 * sz, 0, 0, 7); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const pitch = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2 + 6, HL * 2 + 6), new THREE.MeshStandardMaterial({ map: pitchTex(), roughness: .92 })); pitch.rotation.x = -Math.PI / 2; pitch.receiveShadow = true; scene.add(pitch);
const outer = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), std('#1f4a24', { roughness: 1 })); outer.rotation.x = -Math.PI / 2; outer.position.y = -.02; outer.receiveShadow = true; scene.add(outer);
function adTex(txt, bg, fg) { const c = document.createElement('canvas'); c.width = 512; c.height = 64; const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 512, 64); x.fillStyle = fg; x.font = '900 40px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 256, 34); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const ADS = [['YA YA GAMES', '#0a2a8a', '#ffd23a'], ['OFFLINE ARCADE', '#d8202a', '#ffffff'], ['⚽ GOAL DUEL', '#111111', '#5ae08a'], ['NO WIFI? NO PROBLEM', '#ffd23a', '#111111']];
function boards() { const g = new THREE.Group(); const mk = (w, x, z, ry, k) => { const a = ADS[k % ADS.length]; const m = new THREE.Mesh(new THREE.BoxGeometry(w, .9, .12), [std('#222'), std('#222'), std('#222'), std('#222'), new THREE.MeshStandardMaterial({ map: adTex(a[0], a[1], a[2]), emissive: C('#ffffff'), emissiveMap: adTex(a[0], a[1], a[2]), emissiveIntensity: .35 }), std('#222')]); m.position.set(x, .45, z); m.rotation.y = ry; m.castShadow = true; g.add(m); };
  let k = 0; for (let z = -HL + 2.5; z < HL; z += 5) { mk(5, -HW - 1.3, z, Math.PI / 2, k++); mk(5, HW + 1.3, z, -Math.PI / 2, k++); }
  for (const s of [-1, 1]) for (const x of [-7.6, -3.8, 3.8, 7.6]) { if (Math.abs(x) < GW + 1.4) continue; mk(3.8, x, s * (HL + 1.4), s < 0 ? 0 : Math.PI, k++); } scene.add(g); }
boards();
const postM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .3, metalness: .1 });
const nets = [];
function goal(s) { const g = new THREE.Group(); const r = .07; const z = s * HL; const D = 1.6;
  const post = (x) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, GH, 12), postM); m.position.set(x, GH / 2, z); m.castShadow = true; g.add(m); }; post(-GW); post(GW);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(r, r, GW * 2 + r * 2, 12), postM); bar.rotation.z = Math.PI / 2; bar.position.set(0, GH, z); bar.castShadow = true; g.add(bar);
  const nc = document.createElement('canvas'); nc.width = nc.height = 64; const nx = nc.getContext('2d'); nx.strokeStyle = 'rgba(255,255,255,.9)'; nx.lineWidth = 3; nx.strokeRect(0, 0, 64, 64); const nt = new THREE.CanvasTexture(nc); nt.wrapS = nt.wrapT = THREE.RepeatWrapping;
  const mat = (rx, ry) => { const t = nt.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: .3, side: THREE.DoubleSide, roughness: .9 }); };
  const back = new THREE.Mesh(new THREE.PlaneGeometry(GW * 2, GH, 16, 8), mat(14, 7)); back.position.set(0, GH / 2, z + s * D); g.add(back);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(GW * 2, D), mat(14, 5)); top.rotation.x = Math.PI / 2; top.position.set(0, GH, z + s * D / 2); g.add(top);
  for (const sx of [-1, 1]) { const sd = new THREE.Mesh(new THREE.PlaneGeometry(D, GH), mat(5, 7)); sd.rotation.y = Math.PI / 2; sd.position.set(sx * GW, GH / 2, z + s * D / 2); g.add(sd); }
  scene.add(g); const base = back.geometry.attributes.position.array.slice(); nets.push({ s, back, base, bulge: 0, bx: 0, by: 1 }); }
goal(-1); goal(1);
function stadium() { const g = new THREE.Group(); const standM = std('#2a3040', { roughness: .8 }); const seats = []; const cols = ['#d8202a', '#1f5ad8', '#ffffff', '#ffd23a', '#2a2a2a', '#ff8a3a', '#3ac87a', '#c8c8d8'];
  const side = (len, cxp, czp, ry) => { for (let r = 0; r < 9; r++) { const st = new THREE.Mesh(new THREE.BoxGeometry(len, .6, 1.2), standM); const o = new THREE.Object3D(); o.position.set(cxp, 0, czp); o.rotation.y = ry; o.updateMatrixWorld(); st.position.copy(V3(0, .3 + r * .62, -r * 1.15).applyMatrix4(o.matrixWorld)); st.rotation.y = ry; st.receiveShadow = true; g.add(st);
      for (let k = 0; k < len / .55; k++) if (Math.random() < .9) seats.push({ p: V3(-len / 2 + .3 + k * .55, .9 + r * .62, -r * 1.15 + .1).applyMatrix4(o.matrixWorld), c: cols[Math.floor(Math.random() * cols.length)] }); } };
  side(HL * 2 + 6, -HW - 4, 0, Math.PI / 2); side(HL * 2 + 6, HW + 4, 0, -Math.PI / 2); side(HW * 2 + 8, 0, -HL - 4, 0); side(HW * 2 + 8, 0, HL + 4, Math.PI);
  const im = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.15, .32, 3, 8), new THREE.MeshStandardMaterial({ roughness: .9 }), seats.length); const m4 = new THREE.Matrix4(); seats.forEach((s, i) => { m4.makeTranslation(s.p.x, s.p.y, s.p.z); im.setMatrixAt(i, m4); im.setColorAt(i, C(s.c)); }); g.add(im); crowd = { im, seats, base: seats.map(s => s.p.y) };
  for (const [x, z] of [[-HW - 9, -HL - 9], [HW + 9, -HL - 9], [-HW - 9, HL + 9], [HW + 9, HL + 9]]) { const tw = new THREE.Mesh(new THREE.CylinderGeometry(.35, .5, 22, 8), std('#5a6070', { metalness: .6 })); tw.position.set(x, 11, z); g.add(tw);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, .4), new THREE.MeshBasicMaterial({ color: C('#ffffff').multiplyScalar(3) })); lamp.position.set(x * .97, 22, z * .97); lamp.lookAt(0, 0, 0); g.add(lamp); }
  scene.add(g); }
let crowd = null; stadium();

/* ================= PLAYERS ================= */
function numTex(n, col) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = col; x.fillRect(0, 0, 128, 128); x.fillStyle = '#fff'; x.font = '900 86px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 64, 70); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function makePlayer(jersey, shorts, socks, skin, hair, num) { const g = new THREE.Group(); const J = new THREE.MeshPhysicalMaterial({ color: C(jersey), roughness: .65, sheen: .6, sheenColor: C('#ffffff') }), Sh = std(shorts, { roughness: .7 }), So = std(socks, { roughness: .8 }), Sk = std(skin, { roughness: .6 }), Ha = std(hair, { roughness: .9 }), Bo = std('#111111', { roughness: .4 });
  const add = (parent, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const body = new THREE.Group(); body.position.y = .95; g.add(body);
  const torso = add(body, new THREE.CapsuleGeometry(.19, .42, 6, 14), J, 0, .38, 0); torso.scale.set(1.22, 1, .78);
  add(body, new THREE.BoxGeometry(.42, .22, .26), Sh, 0, .02, 0);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(.26, .26), new THREE.MeshStandardMaterial({ map: numTex(num, jersey), roughness: .7 })); back.position.set(0, .45, -.155); back.rotation.y = Math.PI; body.add(back);
  add(body, new THREE.CylinderGeometry(.05, .06, .1, 8), Sk, 0, .71, 0);
  const head = add(body, new THREE.SphereGeometry(.12, 18, 14), Sk, 0, .86, .01); head.scale.set(.92, 1.08, 1);
  const hairM = add(body, new THREE.SphereGeometry(.125, 18, 10, 0, Math.PI * 2, 0, Math.PI * .55), Ha, 0, .88, -.005); hairM.scale.set(.95, 1.05, 1.02);
  const arms = [], legs = [];
  for (const s of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(s * .27, .6, 0); body.add(sh); add(sh, new THREE.CapsuleGeometry(.055, .2, 4, 8), J, 0, -.14, 0); const el = new THREE.Group(); el.position.y = -.3; sh.add(el); add(el, new THREE.CapsuleGeometry(.045, .2, 4, 8), Sk, 0, -.13, 0); arms.push({ sh, el });
    const hip = new THREE.Group(); hip.position.set(s * .11, -.02, 0); body.add(hip); add(hip, new THREE.CapsuleGeometry(.08, .28, 4, 8), Sk, 0, -.22, 0); add(hip, new THREE.CylinderGeometry(.095, .09, .16, 10), Sh, 0, -.07, 0);
    const kn = new THREE.Group(); kn.position.y = -.44; hip.add(kn); add(kn, new THREE.CapsuleGeometry(.065, .28, 4, 8), So, 0, -.2, 0); const shoe = add(kn, new THREE.BoxGeometry(.1, .08, .26), Bo, 0, -.44, .05); legs.push({ hip, kn, shoe }); }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return { g, body, arms, legs, torso }; }
const TEAMS = [{ jersey: '#d8202a', shorts: '#ffffff', socks: '#d8202a', name: T('אדומים', 'RED') }, { jersey: '#1f5ad8', shorts: '#0a1a4a', socks: '#ffffff', name: T('כחולים', 'BLUE') }];
const P = [0, 1].map(i => { const t = TEAMS[i]; const m = makePlayer(t.jersey, t.shorts, t.socks, i ? '#8a5a3a' : '#f2c3a0', i ? '#111' : '#5a3a1a', i ? 7 : 10); scene.add(m.g);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.45, .55, 32), new THREE.MeshBasicMaterial({ color: C(t.jersey).multiplyScalar(1.6), transparent: true, opacity: .7, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .02; scene.add(ring);
  return { i, m, ring, pos: V3(0, 0, i ? -6 : 6), vel: V3(), face: i ? 0 : Math.PI, phase: 0, kickT: -1, tackT: -1, burstT: -1, cd: 0, charge: -1, stun: 0, goalDir: i ? 1 : -1 }; });
// player i attacks goal at z = goalDir*HL  (P0 attacks -HL i.e. "up" the screen)
P[0].goalDir = -1; P[1].goalDir = 1;

/* ================= BALL ================= */
function ballTex() { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#f6f6f2'; x.fillRect(0, 0, 512, 256); x.fillStyle = '#16161c';
  const pts = [[64, 40], [192, 40], [320, 40], [448, 40], [0, 128], [128, 128], [256, 128], [384, 128], [512, 128], [64, 216], [192, 216], [320, 216], [448, 216]];
  for (const [px, py] of pts) { x.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; const rx = 26 / Math.max(.35, Math.cos((py / 256 - .5) * Math.PI)); x.lineTo(px + Math.cos(a) * rx, py + Math.sin(a) * 26); } x.closePath(); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const ballM = new THREE.Mesh(new THREE.SphereGeometry(BR, 28, 20), new THREE.MeshPhysicalMaterial({ map: ballTex(), roughness: .35, clearcoat: .6 })); ballM.castShadow = true; scene.add(ballM);
const ballSh = new THREE.Mesh(new THREE.CircleGeometry(BR * 1.1, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .35, depthWrite: false })); ballSh.rotation.x = -Math.PI / 2; scene.add(ballSh);
const ball = { pos: V3(0, BR, 0), vel: V3(), spin: V3(), owner: -1, lastTouch: -1, ownT: 0 };

/* ================= AUDIO ================= */
function kickSnd(p) { A.noise(.08, 'lowpass', 900, 1, .25 + p * .2); A.tone(90 + p * 40, .12, 'sine', .25, 0, 50); }
function whistle(n = 1) { for (let k = 0; k < n; k++) { A.tone(2900, .22, 'square', .05, k * .3); A.tone(3100, .22, 'sine', .05, k * .3); } }
function roar(v = 1, d = 2.5) { A.noise(d, 'bandpass', 900, .6, .18 * v, 0, 700); A.noise(d * .8, 'lowpass', 500, .5, .14 * v); }
function crowdBed() { if (!A.loop('crowd')) A.loopOn('crowd', 'bandpass', 700, .5, .03, .15); }

/* ================= GAME STATE ================= */
let state = 'title', G = null; const keys = {};
const inp = [0, 1].map(() => ({ mx: 0, mz: 0, shoot: false, shootDown: false, tackle: false }));
function start() { $('title').hidden = true; $('endS').hidden = true; $('hud').hidden = false; $('menuBtn').hidden = false; $('c0').hidden = !isTouch && false; $('c1').hidden = S.mode !== '2p';
  document.body.classList.toggle('two', S.mode === '2p'); G = { mode: S.mode, sc: [0, 0], time: 180, len: S.len, over: false, pause: 0, kickoff: 1, cel: 0, scorer: -1 };
  $('n0').textContent = S.mode === 'cpu' ? T('אתה', 'YOU') : TEAMS[0].name; $('n1').textContent = S.mode === 'cpu' ? T('מחשב', 'CPU') : TEAMS[1].name; updHud();
  kickoff(Math.random() < .5 ? 0 : 1); state = 'play'; crowdBed(); A.startMusic && 0; }
function kickoff(k) { P[0].pos.set(0, 0, 5.5); P[1].pos.set(0, 0, -5.5); P[0].face = Math.PI; P[1].face = 0; for (const p of P) { p.vel.set(0, 0, 0); p.kickT = p.tackT = -1; p.charge = -1; p.stun = 0; }
  P[k].pos.set(0, 0, k ? -1 : 1); ball.pos.set(0, BR, 0); ball.vel.set(0, 0, 0); ball.owner = -1; G.pause = 1.4; whistle(1); bigText(T('שריקת פתיחה!', 'KICK-OFF!'), '', 1000); }
function updHud() { $('sc').textContent = `${G.sc[0]} : ${G.sc[1]}`; if (G.len === 't') { const s = Math.max(0, Math.ceil(G.time)); $('tm').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; } else $('tm').textContent = '🏁 ' + G.len; }
let bigT = 0; function bigText(a, b, ms = 1800) { const el = $('big'); el.innerHTML = a + (b ? `<small dir="ltr">${b}</small>` : ''); el.className = ''; void el.offsetWidth; el.className = 'on'; clearTimeout(bigT); bigT = setTimeout(() => el.className = '', ms); }

/* ================= INPUT ================= */
function joy(el, i) { const knob = el.querySelector('i'); let id = null, cx0 = 0, cy0 = 0; const R = 46, flip = () => i === 1 && G && G.mode === '2p' ? -1 : 1;
  el.addEventListener('pointerdown', e => { A.ac(); id = e.pointerId; el.setPointerCapture(id); const r = el.getBoundingClientRect(); cx0 = r.left + r.width / 2; cy0 = r.top + r.height / 2; move(e); });
  const move = e => { if (e.pointerId !== id) return; let dx = e.clientX - cx0, dy = e.clientY - cy0; const L = Math.hypot(dx, dy); if (L > R) { dx *= R / L; dy *= R / L; } const f = flip(); knob.style.transform = `translate(${dx * f}px,${dy * f}px)`; inp[i].mx = dx / R; inp[i].mz = dy / R; };
  el.addEventListener('pointermove', move); const up = e => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; inp[i].mx = inp[i].mz = 0; }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); }
for (const i of [0, 1]) { const c = $('c' + i); joy(c.querySelector('.joy'), i);
  for (const b of c.querySelectorAll('button')) { const k = b.dataset.b; b.addEventListener('pointerdown', e => { e.preventDefault(); A.ac(); b.classList.add('on'); if (k === 'shoot') inp[i].shootDown = true; else inp[i].tackle = true; });
    const up = () => { b.classList.remove('on'); if (k === 'shoot' && inp[i].shootDown) { inp[i].shootDown = false; inp[i].shoot = true; } }; b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up); } }
addEventListener('keydown', e => { keys[e.code] = 1; if (e.code === 'Space' && !e.repeat) inp[0].shootDown = true; if ((e.code === 'ShiftLeft' || e.code === 'KeyX') && !e.repeat) inp[0].tackle = true; if (e.code === 'Enter' && !e.repeat) inp[1].shootDown = true; if (e.code === 'ShiftRight' && !e.repeat) inp[1].tackle = true; });
addEventListener('keyup', e => { keys[e.code] = 0; if (e.code === 'Space' && inp[0].shootDown) { inp[0].shootDown = false; inp[0].shoot = true; } if (e.code === 'Enter' && inp[1].shootDown) { inp[1].shootDown = false; inp[1].shoot = true; } });
function keyInput() { const k0x = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), k0z = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0); if (k0x || k0z) { inp[0].mx = k0x; inp[0].mz = k0z; } else if (keys._k0) { inp[0].mx = inp[0].mz = 0; } keys._k0 = !!(k0x || k0z); }

/* ================= AI ================= */
const AIL = { easy: { spd: .82, react: .5, tack: .35, aim: 1.6 }, normal: { spd: .93, react: .28, tack: .55, aim: .9 }, hard: { spd: 1.0, react: .12, tack: .8, aim: .5 } };
let aiT = 0, aiPlan = null;
function ai(dt) { const me = P[1], op = P[0], L = AIL[S.diff]; const I = inp[1]; aiT -= dt; I.mx = I.mz = 0;
  const myGoal = V3(0, 0, -HL), opGoal = V3(0, 0, HL);
  if (ball.owner === 1) { const toG = opGoal.clone().sub(me.pos); const dist = toG.length(); let tgt = opGoal.clone(); const lat = op.pos.x - me.pos.x; if (op.pos.z > me.pos.z && op.pos.distanceTo(me.pos) < 5) tgt.x = me.pos.x - Math.sign(lat || 1) * 4;
    const d = tgt.sub(me.pos).normalize(); I.mx = d.x; I.mz = d.z;
    const open = !(op.pos.z > me.pos.z && Math.abs(op.pos.x - me.pos.x) < 1.3 && op.pos.z - me.pos.z < 4);
    if (dist < 12.5 && (open || dist < 7) && aiT <= 0) { if (I.charge == null) { I.charge = .35 + Math.min(.4, dist / 32) + rnd(-.05, .06); I.hold = 0; } I.shootDown = true; I.hold += dt; if (I.hold > I.charge * .9) { I.shootDown = false; I.shoot = true; I.charge = null; aiT = 1; } }
    if (op.pos.distanceTo(me.pos) < 2.2 && Math.random() < dt * 1.2) I.tackle = true; }
  else if (ball.owner === 0) { const toward = myGoal.clone().sub(ball.pos).normalize(); const tgt = ball.pos.clone().addScaledVector(toward, 1.6); const d = tgt.sub(me.pos); if (d.length() > .3) { d.normalize(); I.mx = d.x; I.mz = d.z; }
    if (me.pos.distanceTo(ball.pos) < 1.9 && aiT <= 0) { aiT = L.react + .5; if (Math.random() < L.tack) I.tackle = true; } }
  else { const lead = ball.pos.clone().addScaledVector(ball.vel, .35); lead.y = 0; const d = lead.sub(me.pos); if (d.length() > .2) { d.normalize(); I.mx = d.x; I.mz = d.z; } } }

/* ================= SIMULATION ================= */
const MAXV = 6.6, ACC = 26;
function owner() { return ball.owner >= 0 ? P[ball.owner] : null; }
function kick(p, power, dir, lift) { ball.owner = -1; ball.lastTouch = p.i; ball.ownT = .35; const v = 9 + power * 19; ball.vel.set(dir.x * v, lift, dir.z * v); ball.spin.set(rnd(-1, 1) * power * 2.2, 0, 0); p.kickT = 0; kickSnd(power); FX.burst(ball.pos.clone().setY(.05), 6, [[.4, .8, .3], [.6, .9, .4]], 1.5, .06, .5, 6); }
function shoot(p, power) { const toGoal = V3(rnd(-GW * .55, GW * .55), 0, p.goalDir * HL).sub(p.pos); toGoal.y = 0; toGoal.normalize(); const f = V3(Math.sin(p.face), 0, Math.cos(p.face));
  const aimTo = f.dot(toGoal) > .35 ? f.clone().lerp(toGoal, .4).normalize() : f; const lift = .9 + power * power * 5.6 + rnd(-.3, .3); kick(p, power, aimTo, lift); }
function stepPlayer(p, dt) { const I = inp[p.i]; let mx = I.mx, mz = I.mz; const L = p.i === 1 && G.mode === 'cpu' ? AIL[S.diff].spd : 1;
  if (p.stun > 0) { p.stun -= dt; mx = mz = 0; } if (p.tackT >= 0) { p.tackT += dt; mx = mz = 0; if (p.tackT > .65) p.tackT = -1; }
  const hasBall = ball.owner === p.i; let vmax = MAXV * L * (hasBall ? .88 : 1) * (p.burstT >= 0 ? 1.35 : 1); if (p.burstT >= 0) { p.burstT += dt; if (p.burstT > .7) p.burstT = -1; }
  const m = Math.min(1, Math.hypot(mx, mz)); const want = V3(mx, 0, mz); if (m > .05) want.normalize().multiplyScalar(vmax * m);
  if (p.tackT >= 0) { p.vel.multiplyScalar(Math.pow(.25, dt)); } else { const dv = want.sub(p.vel); const a = ACC * dt; if (dv.length() > a) dv.setLength(a); p.vel.add(dv); }
  p.pos.addScaledVector(p.vel, dt); p.pos.x = clamp(p.pos.x, -HW - .8, HW + .8); p.pos.z = clamp(p.pos.z, -HL - .8, HL + .8);
  const sp = Math.hypot(p.vel.x, p.vel.z); if (sp > .4 && p.tackT < 0) { const tf = Math.atan2(p.vel.x, p.vel.z); let d = tf - p.face; d = Math.atan2(Math.sin(d), Math.cos(d)); p.face += d * Math.min(1, dt * 12); }
  // buttons
  if (I.shootDown) { if (p.charge < 0) p.charge = 0; p.charge = Math.min(1, p.charge + dt * 1.15); }
  if (I.shoot) { I.shoot = false; const pw = Math.max(.15, p.charge < 0 ? .5 : p.charge); p.charge = -1; const d = p.pos.distanceTo(V3(ball.pos.x, 0, ball.pos.z)); if (hasBall || (d < 1.3 && ball.pos.y < 1.2 && ball.ownT <= 0 && ball.owner < 0)) shoot(p, pw); else if (d < 1.5 && ball.owner >= 0) { p.kickT = 0; } }
  if (I.tackle) { I.tackle = false; if (hasBall) { if (p.cd <= 0) { p.burstT = 0; p.cd = 2.2; A.noise(.3, 'bandpass', 1400, 1, .06, 0, 400); } } else if (p.tackT < 0 && p.cd <= 0) { p.tackT = 0; p.cd = 1.1; p.vel.add(V3(Math.sin(p.face), 0, Math.cos(p.face)).multiplyScalar(5)); A.noise(.45, 'lowpass', 700, 1, .12, 0, 200); } }
  p.cd -= dt; }
function stepBall(dt) { const o = owner();
  if (o) { const f = V3(Math.sin(o.face), 0, Math.cos(o.face)); const sp = Math.hypot(o.vel.x, o.vel.z); const tgt = o.pos.clone().addScaledVector(f, .62 + sp * .05); tgt.y = BR; const prev = ball.pos.clone(); ball.pos.lerp(tgt, Math.min(1, dt * 14)); ball.vel.copy(ball.pos.clone().sub(prev).divideScalar(Math.max(dt, 1e-4)));
    const other = P[1 - o.i]; if (other.tackT >= 0 && other.tackT < .45 && other.pos.distanceTo(ball.pos) < 1.15) { ball.owner = -1; ball.ownT = .3; ball.lastTouch = other.i; const away = ball.pos.clone().sub(other.pos).setY(0).normalize(); ball.vel.set(away.x * 7 + other.vel.x * .5, 1.5, away.z * 7 + other.vel.z * .5); o.stun = .55; kickSnd(.4); roar(.5, 1.2); A.voice('huh', 1.1); }
    else if (other.tackT < 0 && other.pos.distanceTo(ball.pos) < .55 && Math.random() < dt * 2.2) { ball.owner = other.i; ball.ownT = .4; A.tone(160, .08, 'sine', .1); } }
  else { ball.ownT -= dt; ball.vel.y -= 9.8 * dt; ball.vel.x += ball.spin.x * dt * (ball.pos.y > BR + .05 ? 1 : 0) * Math.sign(ball.vel.z || 1) * .6; ball.pos.addScaledVector(ball.vel, dt);
    if (ball.pos.y < BR) { ball.pos.y = BR; if (ball.vel.y < -1.2) { ball.vel.y *= -.52; A.noise(.05, 'lowpass', 400, 1, Math.min(.12, -ball.vel.y * .02)); } else ball.vel.y = 0; const fr = Math.pow(.62, dt); ball.vel.x *= fr; ball.vel.z *= fr; ball.spin.multiplyScalar(Math.pow(.2, dt)); }
    else { const dr = Math.pow(.985, dt * 60); ball.vel.x *= dr; ball.vel.z *= dr; }
    // walls (boards) except goal mouth
    if (Math.abs(ball.pos.x) > HW + 1.1) { ball.pos.x = Math.sign(ball.pos.x) * (HW + 1.1); ball.vel.x *= -.6; A.noise(.08, 'lowpass', 300, 1, .1); }
    for (const s of [-1, 1]) { const zl = s * HL; const inMouth = Math.abs(ball.pos.x) < GW - BR && ball.pos.y < GH - BR;
      if (s * ball.pos.z > HL - BR && !inMouth && s * ball.pos.z < HL + 1.2) { // posts / bar
        for (const px of [-GW, GW]) { const dx = ball.pos.x - px, dz = ball.pos.z - zl; const d = Math.hypot(dx, dz); if (d < BR + .07 && ball.pos.y < GH) { const n = V3(dx, 0, dz).normalize(); const vn = ball.vel.dot(n); if (vn < 0) { ball.vel.addScaledVector(n, -1.7 * vn); A.tone(1300, .25, 'triangle', .1); A.tone(900, .3, 'sine', .06); bigText(T('🥅 קורה!', '🥅 THE POST!'), '', 1200); roar(.6, 1.2); } } }
        if (Math.abs(ball.pos.x) < GW + .1 && Math.abs(ball.pos.y - GH) < BR + .07 && Math.abs(ball.pos.z - zl) < BR + .07) { ball.vel.y = -Math.abs(ball.vel.y) * .6 - 1; ball.vel.z *= -.5; A.tone(1300, .25, 'triangle', .1); bigText(T('🥅 משקוף!', '🥅 CROSSBAR!'), '', 1200); }
        if (s * ball.pos.z > HL + .3 && !(Math.abs(ball.pos.x) < GW && ball.pos.y < GH)) { if (Math.abs(ball.pos.x) < HW + 1.1 && s * ball.pos.z > HL + 1.25) { ball.pos.z = s * (HL + 1.25); ball.vel.z *= -.55; A.noise(.08, 'lowpass', 300, 1, .1); } } }
      if (inMouth && s * ball.pos.z > HL + BR && G && !G.cel) scored(s < 0 ? 0 : 1);
      if (s * ball.pos.z > HL + 1.45) { ball.pos.z = s * (HL + 1.45); ball.vel.z *= -.15; ball.vel.x *= .4; } }
    if (G && !G.cel && !G.over && Math.abs(ball.pos.z) > HL + .25) { G.outT = (G.outT || 0) + dt; if (G.outT > .9) { G.outT = 0; goalKick(ball.pos.z < 0 ? 1 : 0); } } else if (G) G.outT = 0;
    // pickup
    if (ball.ownT <= 0 && ball.pos.y < .8 && !G.cel) for (const p of P) { if (p.stun > 0 || p.tackT >= 0) { if (p.tackT >= 0 && p.pos.distanceTo(V3(ball.pos.x, 0, ball.pos.z)) < 1.1) { ball.vel.add(V3(Math.sin(p.face), .3, Math.cos(p.face)).multiplyScalar(5)); ball.ownT = .3; kickSnd(.3); } continue; }
      const d = Math.hypot(ball.pos.x - p.pos.x, ball.pos.z - p.pos.z); const rel = Math.hypot(ball.vel.x - p.vel.x, ball.vel.z - p.vel.z); if (d < .85 && rel < 13) { ball.owner = p.i; ball.lastTouch = p.i; A.tone(150, .06, 'sine', .1); A.noise(.05, 'lowpass', 600, 1, .08); break; } } }
  // roll visual
  const hv = V3(ball.vel.x, 0, ball.vel.z); const sp = hv.length(); if (sp > .01) { const ax = V3(hv.z, 0, -hv.x).normalize(); ballM.rotateOnWorldAxis(ax, sp * dt / BR); }
  ballM.position.copy(ball.pos); ballSh.position.set(ball.pos.x, .015, ball.pos.z); const hgt = ball.pos.y - BR; ballSh.scale.setScalar(1 + hgt * .3); ballSh.material.opacity = .35 / (1 + hgt * .6); }
function goalKick(k) { whistle(1); bigText(T('בעיטת שער', 'Goal kick'), '', 1000); const s = k === 1 ? -1 : 1; ball.pos.set(0, BR, s * (HL - 3)); ball.vel.set(0, 0, 0); ball.owner = k; ball.ownT = .5; P[k].pos.set(0, 0, s * (HL - 2.3)); P[k].face = k === 1 ? 0 : Math.PI; P[k].vel.set(0, 0, 0); const o = P[1 - k]; if (Math.abs(o.pos.z - P[k].pos.z) < 5) o.pos.z = s * (HL - 8); G.pause = .8; }
function scored(team) { if (G.cel) return; G.sc[team]++; G.cel = 3.2; G.scorer = team; ball.owner = -1; updHud(); whistle(1); roar(1.3, 3.5); setTimeout(() => roar(1, 2.5), 900); A.voice('yay', 1.2); for (let k = 0; k < 4; k++) A.tone(523 * Math.pow(2, [0, 4, 7, 12][k] / 12), .4, 'triangle', .07, .1 + k * .12);
  const net = nets.find(n => n.s === (team === 0 ? -1 : 1)); net.bulge = 1; net.bx = ball.pos.x / GW; net.by = ball.pos.y / GH;
  const who = G.mode === 'cpu' ? (team === 0 ? T('גוווול! 🎉', 'GOOOAL! 🎉') : T('גול למחשב 😬', 'CPU scores 😬')) : 'GOOOAL!'; bigText(who, `${G.sc[0]} : ${G.sc[1]}`, 2600);
  for (let k = 0; k < 5; k++) setTimeout(() => FX.burst(V3(rnd(-GW, GW), 2.5, (team === 0 ? -1 : 1) * HL), 40, CONFETTI, 5, .12, 2, 4), k * 200);
  ball.vel.multiplyScalar(.25); }
function afterGoal() { const t = G.scorer; G.cel = 0; const end = G.len !== 't' && G.sc[t] >= +G.len; if (end) return finish(); kickoff(1 - t); }
function finish() { G.over = true; state = 'end'; whistle(3); roar(1, 3); const w = G.sc[0] > G.sc[1] ? 0 : G.sc[1] > G.sc[0] ? 1 : -1;
  if (G.mode === 'cpu') { if (w === 0) S.w++; else if (w === 1) S.l++; } else if (w >= 0) S.wins[w]++; S.save();
  $('eT').textContent = w < 0 ? T('🤝 תיקו!', '🤝 Draw!') : G.mode === 'cpu' ? (w === 0 ? T('🏆 ניצחת!', '🏆 You win!') : T('😬 המחשב ניצח', '😬 CPU wins')) : `🏆 ${TEAMS[w].name} ${T('ניצחו!', 'win!')}`; $('eP').textContent = `${G.sc[0]} : ${G.sc[1]}`; setTimeout(() => $('endS').hidden = false, 1200); }

/* ================= ANIMATION ================= */
function animate(p, dt) { const m = p.m; const sp = Math.hypot(p.vel.x, p.vel.z); p.phase += dt * (2 + sp * 1.55); const k = Math.min(1, sp / MAXV); const s = Math.sin(p.phase);
  m.g.position.copy(p.pos); m.g.rotation.y = p.face; m.body.position.y = .95 + Math.abs(Math.cos(p.phase)) * .06 * k; m.body.rotation.x = k * .22;
  for (let j = 0; j < 2; j++) { const sg = j ? 1 : -1; const L = m.legs[j], Ar = m.arms[j]; L.hip.rotation.x = sg * s * .85 * k; L.kn.rotation.x = Math.max(0, -sg * Math.cos(p.phase)) * 1.2 * k + .05; Ar.sh.rotation.x = -sg * s * .75 * k; Ar.el.rotation.x = -.5 - .4 * k; Ar.sh.rotation.z = (j ? -1 : 1) * .12; }
  if (p.charge >= 0) { const L = m.legs[1]; L.hip.rotation.x = -.4 - p.charge * .7; L.kn.rotation.x = .9; m.body.rotation.x = -.1; }
  if (p.kickT >= 0) { p.kickT += dt; const u = p.kickT / .3; const L = m.legs[1]; L.hip.rotation.x = lerp(-.9, 1.3, Math.min(1, u * 1.6)); L.kn.rotation.x = lerp(1, .05, Math.min(1, u * 2)); m.arms[0].sh.rotation.x = -.9; m.arms[0].sh.rotation.z = .6; m.body.rotation.x = -.15; if (u > 1) p.kickT = -1; }
  if (p.tackT >= 0) { m.body.position.y = .55; m.body.rotation.x = -.75; m.legs[1].hip.rotation.x = 1.4; m.legs[1].kn.rotation.x = 0; m.legs[0].hip.rotation.x = .9; m.legs[0].kn.rotation.x = 1.2; m.arms[0].sh.rotation.z = 1; m.arms[1].sh.rotation.z = -1; }
  if (p.stun > 0) { m.body.rotation.z = Math.sin(p.stun * 20) * .15; } else m.body.rotation.z = 0;
  if (G && G.cel > 0 && G.scorer === p.i) { m.body.position.y = .95 + Math.abs(Math.sin(G.cel * 7)) * .35; for (const a of m.arms) { a.sh.rotation.x = -2.8; a.el.rotation.x = 0; } }
  p.ring.position.set(p.pos.x, .02, p.pos.z); p.ring.material.opacity = ball.owner === p.i ? .95 : .45; p.ring.scale.setScalar(ball.owner === p.i ? 1.15 + Math.sin(performance.now() / 120) * .06 : 1); }
function stepNets(dt) { for (const n of nets) { if (n.bulge <= 0) continue; n.bulge = Math.max(0, n.bulge - dt * 1.1); const a = n.back.geometry.attributes.position; for (let i = 0; i < a.count; i++) { const bx = n.base[i * 3] / GW, by = n.base[i * 3 + 1] / GH + .5; const d = Math.hypot(bx - n.bx, (by - n.by) * 1.4); const f = Math.max(0, 1 - d * 1.3) * Math.sin(n.bulge * Math.PI) * .9; a.setZ(i, n.base[i * 3 + 2] + f * n.s); } a.needsUpdate = true; } }

/* ================= CAMERA ================= */
const camT = V3(), camP = V3();
function fitCam(dt) { const port = innerHeight > innerWidth; const f = ball.pos; const wf = port ? 54 : 42; if (Math.abs(camera.fov - wf) > .5) { camera.fov = wf; camera.updateProjectionMatrix(); }
  const pts = [P[0].pos, P[1].pos, f]; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const q of pts) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z); }
  const dx = x1 - x0 + 4, dz = z1 - z0 + 5; const sz = Math.max(port ? dx * 1.55 : dx * .6, dz * (port ? .86 : 1.0), 8);
  let look = V3(clamp((x0 + x1) / 2, -HW * .8, HW * .8), 0, clamp((z0 + z1) / 2 + sz * .2, -HL + 2, HL + 3)); let pos = look.clone().add(port ? V3(0, sz * 1.05 + 4, sz * .85 + 4) : V3(0, sz * .8 + 4, sz * .85 + 5));
  if (G && G.cel > 0) { const sc = P[G.scorer].pos; look = sc.clone().setY(1); pos = sc.clone().add(V3(3, 3.5, 6 * (G.scorer === 0 ? 1 : -1))); }
  if (G && G.mode === '2p' && !(G.cel > 0)) { look = V3(0, 0, f.z * .12); pos = port ? V3(0, 30, look.z + 8) : V3(0, 24, look.z + 14); }
  const k = Math.min(1, dt * (G && G.cel > 0 ? 2 : 3)); camT.lerp(look, k); camP.lerp(pos, k); camera.position.copy(camP); camera.lookAt(camT); }

/* ================= LOOP ================= */
let last = performance.now();
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.04, (now - last) / 1000); last = now; A.tick();
  if (state === 'play' && G) { keyInput(); if (G.mode === 'cpu') ai(dt);
    if (G.pause > 0) { G.pause -= dt; stepBallIdle(dt); for (const i of [0, 1]) { inp[i].shoot = false; inp[i].tackle = false; } }
    else if (G.cel > 0) { G.cel -= dt; if (G.cel <= 0) afterGoal(); for (const p of P) { p.vel.multiplyScalar(Math.pow(.05, dt)); } stepBall(dt); }
    else { for (const p of P) stepPlayer(p, dt); const d = P[0].pos.distanceTo(P[1].pos); if (d < .7) { const n = P[0].pos.clone().sub(P[1].pos).setY(0).normalize().multiplyScalar((.7 - d) / 2); P[0].pos.add(n); P[1].pos.sub(n); } stepBall(dt);
      if (G.len === 't') { G.time -= dt; if (Math.floor(G.time + dt) !== Math.floor(G.time)) updHud(); if (G.time <= 0) { G.time = 0; updHud(); finish(); } } }
    for (const i of [0, 1]) { const pw = $('c' + i).querySelector('.pw'); const c = P[i].charge; pw.classList.toggle('on', c >= 0); if (c >= 0) pw.querySelector('i').style.width = (c * 100) + '%'; const bt = $('c' + i).querySelector('.bt'); bt.textContent = ball.owner === i ? T('💨 ספרינט', '💨 Burst') : T('🦵 תיקול', '🦵 Tackle'); } }
  for (const p of P) animate(p, dt); if (state !== 'play') stepBallIdle(dt); stepNets(dt); fitCam(dt);
  if (crowd) { const t = now / 1000, ex = G && G.cel > 0 ? 1 : .15; const m4 = new THREE.Matrix4(); for (let i = 0; i < crowd.seats.length; i += 1) { if (ex < .5 && i % 7) continue; const s = crowd.seats[i]; m4.makeTranslation(s.p.x, crowd.base[i] + Math.max(0, Math.sin(t * 9 + i)) * .18 * ex, s.p.z); crowd.im.setMatrixAt(i, m4); } crowd.im.instanceMatrix.needsUpdate = true; }
  FX.update(dt, 0); E.render(); }
function stepBallIdle(dt) { ballM.position.copy(ball.pos); ballSh.position.set(ball.pos.x, .015, ball.pos.z); }

/* ================= TITLE ================= */
function syncSeg(id, key, val) { document.querySelectorAll(`#${id} button`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[key] === String(val)))); }
function renderTitle() { syncSeg('modeSeg', 'm', S.mode); syncSeg('diffSeg', 'd', S.diff); syncSeg('lenSeg', 'l', S.len); $('diffBox').hidden = S.mode !== 'cpu'; $('sndChip').textContent = S.mute ? T('🔇 צלילים', '🔇 Sound') : T('🔊 צלילים', '🔊 Sound'); }
for (const [id, key, prop] of [['modeSeg', 'm', 'mode'], ['diffSeg', 'd', 'diff'], ['lenSeg', 'l', 'len']]) $(id).onclick = e => { const b = e.target.closest('button'); if (!b) return; A.ac(); S[prop] = b.dataset[key]; S.save(); A.tone(800, .06, 'triangle', .05); renderTitle(); };
$('sndChip').onclick = () => { A.setMute(!S.mute); S.save(); renderTitle(); };
function showTitle() { state = 'title'; G = null; A.loopOff('crowd'); $('title').hidden = false; $('hud').hidden = true; $('menuBtn').hidden = true; $('c0').hidden = $('c1').hidden = true; $('endS').hidden = true; P[0].pos.set(-1.5, 0, 3); P[1].pos.set(1.5, 0, -3); P[0].face = Math.PI * .8; P[1].face = -.2; ball.pos.set(0, BR, 0); renderTitle(); }
$('playBtn').onclick = () => { A.ac(); start(); $('c0').hidden = false; };
$('menuBtn').onclick = () => { A.ac(); showTitle(); }; $('eMenu').onclick = () => { A.ac(); showTitle(); }; $('eAgain').onclick = () => { A.ac(); start(); $('c0').hidden = false; };
$('menuBtn').innerHTML = ICO.home('#0a3a1a'); $('homeT').innerHTML = ICO.home('#0a3a1a'); hubButtons(['homeT'], A); qualityButton('qBtn', S);
$('tSub').textContent = T('כדורגל 1 על 1 באצטדיון מואר! כדררו, עקפו, תקלו והבקיעו. לחצו והחזיקו ⚽ כדי לטעון בעיטה חזקה.', '1-on-1 football in a floodlit stadium! Dribble, dodge, tackle and score. Press & hold ⚽ to charge a power shot.');
$('mT').textContent = T('👥 מי משחק?', '👥 Who’s playing?'); $('dT').textContent = T('🤖 רמת המחשב', '🤖 CPU level'); $('lT').textContent = T('🏁 אורך משחק', '🏁 Match length');
const mb = document.querySelectorAll('#modeSeg button'); mb[0].innerHTML = `🤖 ${T('נגד המחשב', 'vs CPU')}`; mb[1].innerHTML = `👥 ${T('2 שחקנים', '2 players')}<small>${T('על אותו טלפון', 'same phone')}</small>`;
const db = document.querySelectorAll('#diffSeg button'); db[0].textContent = T('😊 קל', '😊 Easy'); db[1].textContent = T('🙂 רגיל', '🙂 Normal'); db[2].textContent = T('🔥 קשה', '🔥 Hard');
const lb = document.querySelectorAll('#lenSeg button'); lb[0].innerHTML = T('ראשון ל־3', 'First to 3'); lb[1].innerHTML = T('ראשון ל־5', 'First to 5'); lb[2].innerHTML = T('⏱️ 3 דקות', '⏱️ 3 minutes');
for (const i of [0, 1]) { $('c' + i).querySelector('.bs').textContent = T('⚽ בעיטה', '⚽ Shoot'); }
$('playBtn').textContent = T('▶ למגרש!', '▶ Kick off!'); $('eMenu').textContent = T('תפריט', 'Menu'); $('eAgain').textContent = T('🔁 משחק חוזר', '🔁 Rematch');
E.onResize.push(() => {}); E.resize(); camP.set(0, 27, 17); camT.set(0, 0, 0); showTitle();
setTimeout(() => { $('loading').hidden = true; requestAnimationFrame(frame); window.__goalOK = true; }, 30);
window.__gd = { get G() { return G; }, P, ball, inp, start, scored, S };
