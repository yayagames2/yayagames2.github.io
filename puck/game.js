import { THREE, $, V3, C, clamp, lerp, rnd, T, store, engine, studioEnv, cnv, ctex, particles, CONFETTI, audio, toast, ICO, hubButtons, soundButton, qualityButton } from '../lib/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { openChest } from '../lib/chest.js';

const S = store('puck-save', { coins: 0, skin: 0, owned: [0, 1], mode: 'cpu', lv: 1, tbl: 0, career: 0, wins: 0, goals: 0, tut: 0 });
const E = engine(S, { fov: 46, far: 80, bloom: [.42, .4, .9], exposure: .95, vignette: .32, sat: 1.12 });
const { scene, camera, renderer } = E; studioEnv(E, '#e8f0ff', '#1a1a3a', .5);
const A = audio(S); const FX = particles(E, 1200); const GLOW = particles(E, 600, true);
const TAU = Math.PI * 2, W = 1.04, L = 2.0, R = .042, MR = .068, RT = .075, RH = .045, FLOOR = -.86;
const isPortrait = () => innerHeight > innerWidth;

/* ================= DATA ================= */
const TABLES = [
  { n: T('ארקייד קלאסי', 'Classic Arcade'), surf: '#e6e9f0', l1: '#e8202a', l2: '#1a5ad8', rail: '#1c1e28', top: '#2a2e3a', puck: '#ff2a3a', fr: .2, rest: .86, max: 5.0, gw: .30, led: '#ff3a5a' },
  { n: T('לילה ניאון', 'Neon Night'), surf: '#07071a', l1: '#ff2ad8', l2: '#2ae8ff', rail: '#120f22', top: '#1c1834', puck: '#3aff8a', neon: 1, fr: .17, rest: .88, max: 5.5, gw: .30, led: '#ff2ad8' },
  { n: T('קרחון', 'Glacier'), surf: '#dff6ff', l1: '#2a9aff', l2: '#1a3ab8', rail: '#e9f3fb', top: '#c8dcec', puck: '#16161e', ice: 1, fr: .07, rest: .93, max: 5.9, gw: .30, led: '#3ac8ff' },
  { n: T('הר געש', 'Volcano'), surf: '#22100a', l1: '#ff6a1a', l2: '#ffd23a', rail: '#2a1208', top: '#3a1a0c', puck: '#ffd23a', neon: 1, bump: [[-.27, 0], [.27, 0]], fr: .15, rest: .9, max: 5.6, gw: .32, led: '#ff6a1a' },
  { n: T('גביע הזהב', 'Gold Cup'), surf: '#0e1216', l1: '#ffd23a', l2: '#f4f4f4', rail: '#b88a2a', top: '#e8c25a', puck: '#f4f4f8', metal: 1, fr: .14, rest: .9, max: 6.3, gw: .26, led: '#ffd23a' }];
const CAREER = [
  { n: 'Rex', em: '🧢', t: 0, lv: .12 }, { n: 'Mia', em: '🎀', t: 0, lv: .24 }, { n: 'DJ Volt', em: '🎧', t: 1, lv: .34 }, { n: 'Nova', em: '💜', t: 1, lv: .44 },
  { n: 'Yeti Jo', em: '❄️', t: 2, lv: .52 }, { n: 'Frost', em: '⛄', t: 2, lv: .6 }, { n: 'Blaze', em: '🔥', t: 3, lv: .68 }, { n: 'Magma', em: '🌋', t: 3, lv: .76 },
  { n: 'Ace', em: '🕶️', t: 4, lv: .86 }, { n: 'The Champ', em: '👑', t: 4, lv: .96 }];
const LVS = [[T('קל', 'Easy'), .15], [T('בינוני', 'Medium'), .42], [T('קשה', 'Hard'), .7], [T('אגדה', 'Legend'), .95]];
const SKINS = [
  { n: T('אדום', 'Red'), c: '#e8202a', p: 0 }, { n: T('כחול', 'Blue'), c: '#1a6aff', p: 0 }, { n: T('ליים', 'Lime'), c: '#5ad83a', p: 150 },
  { n: T('ענבים', 'Grape'), c: '#8a3aff', p: 250 }, { n: T('שמש', 'Sunny'), c: '#ffc21a', p: 350 }, { n: T('ניאון', 'Neon'), c: '#ff2ad8', glow: 1, p: 600 },
  { n: T('קרח', 'Ice'), c: '#8ae8ff', glow: 1, p: 800 }, { n: T('כרום', 'Chrome'), c: '#dfe3ec', metal: 1, p: 1100 }, { n: T('זהב', 'Gold'), c: '#ffcf3a', metal: 1, p: 1600 },
  { n: T('לבה', 'Lava'), c: '#ff5a1a', glow: 1, p: 2000 }];
const ADS = ['bowl', 'helix', 'ski', 'drift', 'wave', 'rise', 'zori', 'robo', 'kibo', 'goal', 'chase', 'yaya', 'squishy', 'pet'];
const tableUnlocked = t => t === 0 || S.career >= t * 2;

/* ================= ROOM ================= */
scene.background = C('#05040f'); scene.fog = new THREE.Fog('#07061a', 7, 22);
const hemi = new THREE.HemisphereLight('#b8c8ff', '#1a1020', .5); scene.add(hemi);
const spots = [-.55, .55].map((z, i) => { const s = new THREE.SpotLight('#fff6ea', 3.4, 8, .8, .75, 1.1); s.position.set(i ? .6 : -.6, 3.0, z); s.target.position.set(0, 0, z * .8); if (i === 0) { s.castShadow = renderer.shadowMap.enabled; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -.0004; s.shadow.camera.near = .5; s.shadow.camera.far = 5; } scene.add(s, s.target); return s; });
const texL = new THREE.TextureLoader(); const tex = (u, cb) => texL.load(u, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; cb && cb(t); });
// carpet
const carpet = (() => { const c = cnv(512, 512), x = c.getContext('2d'); x.fillStyle = '#0c0a22'; x.fillRect(0, 0, 512, 512); const cols = ['#ff2ad8', '#2ae8ff', '#ffe24a', '#7aff5a', '#8a5aff'];
  for (let i = 0; i < 70; i++) { x.strokeStyle = cols[i % 5]; x.globalAlpha = .26; x.lineWidth = rnd(2, 4); const px = rnd(0, 512), py = rnd(0, 512), k = i % 4; x.beginPath(); if (k === 0) x.arc(px, py, rnd(8, 20), 0, TAU); else if (k === 1) { x.moveTo(px, py); x.lineTo(px + 26, py - 14); x.lineTo(px + 40, py + 8); } else if (k === 2) x.rect(px, py, rnd(10, 22), rnd(10, 22)); else { x.moveTo(px - 12, py); x.lineTo(px + 12, py); x.moveTo(px, py - 12); x.lineTo(px, py + 12); } x.stroke(); }
  x.globalAlpha = 1; return ctex(c, 8, 8); })();
const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 26).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: carpet, roughness: .95 })); floor.position.y = FLOOR; floor.receiveShadow = true; scene.add(floor);
const wallM = new THREE.MeshStandardMaterial({ color: '#141230', roughness: .9 });
for (const [x, z, ry] of [[0, -5.2, 0], [0, 5.2, Math.PI], [-4.6, 0, Math.PI / 2], [4.6, 0, -Math.PI / 2]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 5), wallM); w.position.set(x, FLOOR + 2.5, z); w.rotation.y = ry; scene.add(w);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(10.4, .04, .04), new THREE.MeshBasicMaterial({ color: ['#ff2ad8', '#2ae8ff', '#7a5aff', '#ffe24a'][Math.abs(Math.round(x + z)) % 4] })); strip.position.set(x, FLOOR + 3.6, z); strip.rotation.y = ry; strip.translateZ(.05); scene.add(strip); }
// billboards with our games
let adI = 0; const boards = [];
function billboard(x, z, ry, w = 1.5) { const g = new THREE.Group(); g.position.set(x, FLOOR + 2.05, z); g.rotation.y = ry; scene.add(g); const h = w / 1.6;
  const fr = new THREE.Mesh(new RoundedBoxGeometry(w + .12, h + .12, .06, 2, .03), new THREE.MeshStandardMaterial({ color: '#1a1830', roughness: .4, metalness: .5 })); g.add(fr);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(w + .2, h + .2), new THREE.MeshBasicMaterial({ color: ['#ff2ad8', '#2ae8ff', '#ffe24a'][boards.length % 3], transparent: true, opacity: .35, toneMapped: false })); glow.position.z = -.035; g.add(glow);
  const m = new THREE.MeshBasicMaterial({ color: '#d8d8d8', toneMapped: true }); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.z = .035; g.add(p);
  const id = ADS[adI++ % ADS.length]; tex('art/p/' + id + '.jpg', t => { m.map = t; m.needsUpdate = true; }); boards.push(g); }
for (const x of [-2.6, 0, 2.6]) billboard(x, -5.15, 0, 1.7);
for (const z of [-2.6, 0, 2.6]) { billboard(-4.55, z, Math.PI / 2); billboard(4.55, z, -Math.PI / 2); }
for (const x of [-2.4, 2.4]) billboard(x, 5.15, Math.PI);
// neon sign
const signC = cnv(1024, 256), sx = signC.getContext('2d');
(function drawSign() { sx.clearRect(0, 0, 1024, 256); sx.textAlign = 'center'; sx.font = '900 118px Arial'; sx.shadowBlur = 30; sx.shadowColor = '#ff2ad8'; sx.fillStyle = '#ffd0f6'; sx.fillText('OFFLINE ARCADE', 512, 120); sx.font = '900 64px Arial'; sx.shadowColor = '#2ae8ff'; sx.fillStyle = '#d8faff'; sx.fillText('50+ GAMES · NO WIFI NEEDED', 512, 214); })();
const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: ctex(signC), transparent: true, toneMapped: false })); sign.position.set(0, FLOOR + 3.25, -5.12); scene.add(sign);
// arcade cabinets along the side walls
for (const [x, z, ry, k] of [[-3.9, -1.3, Math.PI / 2, 0], [-3.9, 1.3, Math.PI / 2, 1], [3.9, -1.3, -Math.PI / 2, 2], [3.9, 1.3, -Math.PI / 2, 3], [-1.3, -4.5, 0, 4], [1.3, -4.5, 0, 5]]) {
  const g = new THREE.Group(); g.position.set(x, FLOOR, z); g.rotation.y = ry; scene.add(g); const col = ['#1a3ad8', '#d81a5a', '#5a1ad8', '#d87a1a', '#1aa88a', '#a81ad8'][k];
  const body = new THREE.Mesh(new THREE.BoxGeometry(.72, 1.75, .7), new THREE.MeshStandardMaterial({ color: col, roughness: .45 })); body.position.y = .875; g.add(body);
  const scrM = new THREE.MeshBasicMaterial({ color: '#cfcfcf' }); const scr = new THREE.Mesh(new THREE.PlaneGeometry(.56, .38), scrM); scr.position.set(0, 1.28, .352); scr.rotation.x = -.12; g.add(scr);
  tex('art/' + ADS[(k * 3 + 2) % ADS.length] + '.jpg', t => { scrM.map = t; scrM.needsUpdate = true; });
  const mq = new THREE.Mesh(new THREE.BoxGeometry(.72, .2, .12), new THREE.MeshBasicMaterial({ color: ['#ffe24a', '#2ae8ff', '#ff2ad8'][k % 3], toneMapped: false })); mq.position.set(0, 1.66, .32); g.add(mq);
  const cp = new THREE.Mesh(new THREE.BoxGeometry(.72, .06, .3), new THREE.MeshStandardMaterial({ color: '#16161e' })); cp.position.set(0, 1.0, .45); g.add(cp); }

/* ================= TABLE ================= */
const tableG = new THREE.Group(); scene.add(tableG);
const surfC = cnv(512, 1024), su = surfC.getContext('2d'), emC = cnv(512, 1024), em = emC.getContext('2d');
const surfT = ctex(surfC), emT = ctex(emC);
const surfM = new THREE.MeshPhysicalMaterial({ map: surfT, emissiveMap: emT, emissive: C('#ffffff'), emissiveIntensity: 0, roughness: .34, clearcoat: .7, clearcoatRoughness: .32, envMapIntensity: .45 });
const surf = new THREE.Mesh(new THREE.PlaneGeometry(W, L).rotateX(-Math.PI / 2), surfM); surf.receiveShadow = true; tableG.add(surf);
const railM = new THREE.MeshPhysicalMaterial({ color: '#1c1e28', roughness: .35, clearcoat: .8, clearcoatRoughness: .2 });
const railTopM = new THREE.MeshPhysicalMaterial({ color: '#2a2e3a', roughness: .3, clearcoat: 1, metalness: 0 });
const rails = new THREE.Group(); tableG.add(rails);
const bodyM = new THREE.MeshStandardMaterial({ color: '#16161e', roughness: .5 });
const apronC = cnv(2048, 192), ap = apronC.getContext('2d'), apronT = ctex(apronC); const endC = cnv(1024, 192), ep = endC.getContext('2d'), endT = ctex(endC);
const apronM = new THREE.MeshStandardMaterial({ map: apronT, emissiveMap: apronT, emissive: C('#ffffff'), emissiveIntensity: .55, roughness: .4 }), endM = new THREE.MeshStandardMaterial({ map: endT, emissiveMap: endT, emissive: C('#ffffff'), emissiveIntensity: .55, roughness: .4 });
const ledStripM = new THREE.MeshBasicMaterial({ color: '#ff3a5a', toneMapped: false });
const goalLights = [], bumpers = [];
const BW = W + RT * 2, BL = L + RT * 2;
{ const body = new THREE.Mesh(new THREE.BoxGeometry(BW, .2, BL), bodyM); body.position.y = -.125; body.castShadow = true; tableG.add(body);
  for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.PlaneGeometry(BL, .19), apronM); a.position.set(s * (BW / 2 + .002), -.125, 0); a.rotation.y = s * Math.PI / 2; tableG.add(a);
    const e = new THREE.Mesh(new THREE.PlaneGeometry(BW, .19), endM); e.position.set(0, -.125, s * (BL / 2 + .002)); e.rotation.y = s > 0 ? 0 : Math.PI; tableG.add(e);
    const st = new THREE.Mesh(new THREE.BoxGeometry(BW + .01, .014, .014), ledStripM); st.position.set(0, -.232, s * (BL / 2)); tableG.add(st);
    const st2 = new THREE.Mesh(new THREE.BoxGeometry(.014, .014, BL + .01), ledStripM); st2.position.set(s * BW / 2, -.232, 0); tableG.add(st2); }
  const base = new THREE.Mesh(new THREE.BoxGeometry(BW - .16, .5, BL - .5), bodyM); base.position.y = FLOOR + .35; tableG.add(base);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.09, .66, .09), bodyM); leg.position.set(x * (BW / 2 - .1), -.55, z * (BL / 2 - .14)); leg.castShadow = true; tableG.add(leg); } }
const goalSlots = [];
function buildRails(t) { rails.clear(); const gw = t.gw, h = RH + .03, y = RH - h / 2;
  const box = (w, d, x, z) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, .014), railM); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; rails.add(m);
    const tp = new THREE.Mesh(new THREE.BoxGeometry(w - .03, .004, d - .03), railTopM); tp.position.set(x, RH + .001, z); rails.add(tp); };
  for (const s of [-1, 1]) box(RT, BL, s * (W / 2 + RT / 2), 0);
  const seg = W / 2 + RT - gw / 2; for (const s of [-1, 1]) for (const e of [-1, 1]) box(seg, RT, s * (gw / 2 + seg / 2), e * (L / 2 + RT / 2));
  // goal slot (dark chute) + goal light
  goalLights.length = 0; goalSlots.length = 0;
  for (const e of [-1, 1]) { const slot = new THREE.Mesh(new THREE.BoxGeometry(gw, .05, RT), new THREE.MeshBasicMaterial({ color: '#000000' })); slot.position.set(0, -.03, e * (L / 2 + RT / 2)); rails.add(slot); goalSlots.push(slot);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(gw + .02, .02, .02), railM); lip.position.set(0, -.012, e * (L / 2 + RT - .01)); rails.add(lip);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(gw * .7, .025, .03), new THREE.MeshBasicMaterial({ color: e > 0 ? '#ff3a5a' : '#3a8aff', toneMapped: false })); gl.position.set(0, RH + .02, e * (L / 2 + RT + .03)); rails.add(gl); goalLights.push(gl);
    const glB = new THREE.Mesh(new THREE.BoxGeometry(gw * .74, .03, .02), new THREE.MeshStandardMaterial({ color: '#0a0a12' })); glB.position.set(0, RH + .02, e * (L / 2 + RT + .05)); rails.add(glB); }
  for (const b of bumpers) tableG.remove(b.m); bumpers.length = 0;
  for (const [bx, bz] of t.bump || []) { const g = new THREE.Group(); const post = new THREE.Mesh(new THREE.CylinderGeometry(.062, .068, .05, 32), new THREE.MeshPhysicalMaterial({ color: '#2a1208', roughness: .3, clearcoat: 1 })); post.position.y = .025; post.castShadow = true; g.add(post);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.064, .009, 10, 40).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: t.l1, toneMapped: false })); ring.position.y = .046; g.add(ring); g.position.set(bx, 0, bz); tableG.add(g); bumpers.push({ x: bx, z: bz, r: .068, m: g, ring, f: 0 }); } }
function drawSurface(t) { const w = 512, h = 1024, sX = w / W, sZ = h / L; su.fillStyle = t.surf; su.fillRect(0, 0, w, h); em.fillStyle = '#000'; em.fillRect(0, 0, w, h);
  if (t.ice) { for (let i = 0; i < 260; i++) { su.strokeStyle = `rgba(255,255,255,${rnd(.1, .35)})`; su.lineWidth = rnd(.5, 2); su.beginPath(); const x0 = rnd(0, w), y0 = rnd(0, h); su.moveTo(x0, y0); su.lineTo(x0 + rnd(-60, 60), y0 + rnd(-30, 30)); su.stroke(); } }
  if (t.metal) { for (let i = 0; i < 26; i++) { su.strokeStyle = 'rgba(255,210,80,.05)'; su.lineWidth = 18; su.beginPath(); su.moveTo(-100 + i * 50, 0); su.lineTo(-400 + i * 50, h); su.stroke(); } }
  if (t.neon && !t.bump) { const g = su.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, 520); g.addColorStop(0, 'rgba(120,60,255,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); su.fillStyle = g; su.fillRect(0, 0, w, h); }
  if (t.bump) { for (let i = 0; i < 40; i++) { const g = su.createRadialGradient(rnd(0, w), rnd(0, h), 2, 0, 0, 0); su.fillStyle = `rgba(255,${rnd(60, 140) | 0},20,${rnd(.04, .12)})`; su.beginPath(); su.arc(rnd(0, w), rnd(0, h), rnd(20, 90), 0, TAU); su.fill(); } }
  const lines = (x, glow) => { x.lineCap = 'round';
    const L1 = t.l1, L2 = t.l2; x.lineWidth = 7; x.strokeStyle = L1; x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke();
    x.lineWidth = 5; x.beginPath(); x.arc(w / 2, h / 2, .15 * sX, 0, TAU); x.stroke(); x.fillStyle = L1; x.beginPath(); x.arc(w / 2, h / 2, 9, 0, TAU); x.fill();
    for (const e of [0, 1]) { const y = e ? h : 0; x.strokeStyle = e ? L1 : L2; x.lineWidth = 6; x.beginPath(); x.arc(w / 2, y, .22 * sX, e ? Math.PI : 0, e ? TAU : Math.PI); x.stroke();
      x.lineWidth = 4; x.beginPath(); x.moveTo(0, e ? h - .45 * sZ : .45 * sZ); x.lineTo(w, e ? h - .45 * sZ : .45 * sZ); x.stroke();
      for (const s of [-1, 1]) { x.fillStyle = e ? L1 : L2; x.beginPath(); x.arc(w / 2 + s * .26 * sX, e ? h - .28 * sZ : .28 * sZ, 7, 0, TAU); x.fill(); } } };
  lines(su); if (t.neon) { em.shadowBlur = 12; for (const k of [0, 1]) { em.shadowColor = '#fff'; lines(em); } em.shadowBlur = 0; }
  // logo
  su.save(); su.translate(w / 2, h / 2); su.globalAlpha = t.neon ? .35 : .18; su.fillStyle = t.l2; su.font = '900 34px Arial'; su.textAlign = 'center'; su.fillText('OFFLINE ARCADE', 0, -.2 * sZ); su.rotate(Math.PI); su.fillText('OFFLINE ARCADE', 0, -.2 * sZ); su.restore();
  // air holes
  const nx = 32, nz = 62; su.fillStyle = t.neon ? 'rgba(255,255,255,.18)' : t.ice ? 'rgba(20,60,110,.35)' : t.metal ? 'rgba(255,220,120,.3)' : 'rgba(20,24,40,.42)';
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { su.beginPath(); su.arc((i + .5) * w / nx, (j + .5) * h / nz, 1.7, 0, TAU); su.fill(); }
  surfT.needsUpdate = true; emT.needsUpdate = true; surfM.emissiveIntensity = t.neon ? 1.1 : 0; surfM.roughness = t.ice ? .2 : .34; }
const adImgs = {}; ADS.forEach(id => { const im = new Image(); im.onload = () => { adImgs[id] = im; drawApron(TABLES[cur.t]); }; im.src = 'art/' + id + '.jpg'; });
function drawApron(t) { const w = 2048, h = 192; const g = ap.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1a1a2e'); g.addColorStop(1, '#07070f'); ap.fillStyle = g; ap.fillRect(0, 0, w, h);
  ap.fillStyle = t.l1; ap.fillRect(0, 0, w, 8); ap.fillStyle = t.l2; ap.fillRect(0, h - 8, w, 8);
  ap.textAlign = 'left'; ap.font = '900 64px Arial'; ap.fillStyle = '#ffffff'; ap.fillText('OFFLINE', 40, 92); ap.fillStyle = '#ffe24a'; ap.fillText('ARCADE', 40, 156); ap.font = '900 34px Arial'; ap.fillStyle = t.l2 === '#f4f4f4' ? '#ffd23a' : '#2ae8ff'; ap.fillText('50+ GAMES', 330, 92); ap.fillStyle = '#ffffff'; ap.fillText('NO WIFI', 330, 140);
  const ids = ['bowl', 'helix', 'ski', 'drift', 'wave', 'zori']; ids.forEach((id, i) => { const x = 560 + i * 245, im = adImgs[id]; ap.fillStyle = '#000'; ap.fillRect(x - 4, 20, 236, 152); if (im) ap.drawImage(im, x, 24, 228, 144); });
  apronT.needsUpdate = true;
  ep.fillStyle = '#0b0b16'; ep.fillRect(0, 0, 1024, 192); ep.fillStyle = t.l1; ep.fillRect(0, 0, 1024, 8); ep.textAlign = 'center'; ep.font = '900 70px Arial'; ep.fillStyle = '#fff'; ep.fillText('PUCK ARENA', 512, 100); ep.font = '800 34px Arial'; ep.fillStyle = '#ffe24a'; ep.fillText('OFFLINE ARCADE · 50+ GAMES', 512, 160); endT.needsUpdate = true; }

/* ================= SCOREBOARD (backbox) ================= */
const sbC = cnv(1024, 512), sbx = sbC.getContext('2d'), sbT = ctex(sbC);
const box = new THREE.Group(); box.position.set(0, 0, -(BL / 2 + .1)); tableG.add(box);
{ const pole = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.0, .08), bodyM); pole.position.set(0, .2, -.06); box.add(pole);
  const cab = new THREE.Mesh(new RoundedBoxGeometry(1.05, .56, .14, 3, .03), new THREE.MeshPhysicalMaterial({ color: '#15151f', roughness: .35, clearcoat: .8 })); cab.position.set(0, .78, -.05); box.add(cab);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(.97, .485), new THREE.MeshBasicMaterial({ map: sbT, toneMapped: false })); scr.position.set(0, .78, .022); box.add(scr); }
let tick = 0;
function drawBoard(now) { const x = sbx; x.fillStyle = '#04040a'; x.fillRect(0, 0, 1024, 512); const t = TABLES[cur.t];
  // LED dot grid look
  x.fillStyle = 'rgba(255,255,255,.03)'; for (let i = 0; i < 1024; i += 8) x.fillRect(i, 0, 1, 512);
  x.textAlign = 'center'; x.font = '900 190px Arial'; x.shadowBlur = 24;
  x.shadowColor = '#ff3a5a'; x.fillStyle = '#ff5a6a'; x.fillText(String(score[0]), 260, 250); x.shadowColor = '#3a8aff'; x.fillStyle = '#6aaaff'; x.fillText(String(score[1]), 764, 250);
  x.shadowBlur = 0; x.font = '900 44px Arial'; x.fillStyle = '#ffffff'; x.fillText(cur.names[0].toUpperCase().slice(0, 10), 260, 70); x.fillText(cur.names[1].toUpperCase().slice(0, 10), 764, 70);
  x.fillStyle = '#ffe24a'; x.font = '900 60px Arial'; x.fillText(':', 512, 220); x.font = '800 30px Arial'; x.fillText(cur.goal + ' 🏁', 512, 300);
  // ad ticker
  x.fillStyle = '#0d0d1a'; x.fillRect(0, 360, 1024, 152); x.font = '900 64px Arial'; x.textAlign = 'left'; x.fillStyle = t.led; x.shadowColor = t.led; x.shadowBlur = 16;
  const msg = '   OFFLINE ARCADE · 50+ GAMES · NO WIFI NEEDED · STRIKE NIGHT · SPIRAL DROP · DRIFT KING · POWDER RUSH · WAVE RUSH · ZORI · SKYRISE ·';
  const mw = x.measureText(msg).width; const off = (now * .12) % mw; x.fillText(msg, -off, 460); x.fillText(msg, mw - off, 460); x.shadowBlur = 0; sbT.needsUpdate = true; }

/* ================= PUCK & MALLETS ================= */
const lathe = pts => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 48);
const puckDecal = (() => { const c = cnv(256, 256), x = c.getContext('2d'); x.clearRect(0, 0, 256, 256); x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 96, 0, TAU); x.stroke(); x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '900 70px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('OA', 128, 132); return ctex(c); })();
const puckM = new THREE.MeshPhysicalMaterial({ color: '#ff2a3a', roughness: .3, clearcoat: 1, clearcoatRoughness: .1, emissive: C('#000000') });
const puckG = new THREE.Group(); scene.add(puckG);
{ const pm = new THREE.Mesh(lathe([[0, 0], [R - .005, 0], [R, .004], [R, .009], [R - .004, .0125], [0, .0125]]), puckM); pm.castShadow = true; puckG.add(pm);
  const d = new THREE.Mesh(new THREE.CircleGeometry(R * .82, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: puckDecal, transparent: true, depthWrite: false })); d.position.y = .0128; puckG.add(d); puckG.userData.decal = d; }
const MPROF = [[0, 0], [MR - .004, 0], [MR, .005], [MR, .017], [MR - .007, .024], [.032, .03], [.022, .038], [.019, .062], [.024, .068], [.028, .078], [.025, .09], [.015, .098], [0, .1]];
const malletGeo = lathe(MPROF);
function mkMallet() { const m = new THREE.MeshPhysicalMaterial({ color: '#e8202a', roughness: .28, clearcoat: 1, clearcoatRoughness: .08, emissive: C('#000000') }); const g = new THREE.Group(); const me = new THREE.Mesh(malletGeo, m); me.castShadow = true; g.add(me);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(MR - .006, .0035, 8, 48).rotateX(Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .2, clearcoat: 1 })); ring.position.y = .0175; g.add(ring); scene.add(g); return { g, m, ring }; }
const MV = [mkMallet(), mkMallet()];
function paintMallet(k, sk) { const s = SKINS[sk], m = MV[k].m; m.color.set(s.c); m.metalness = s.metal ? .95 : 0; m.roughness = s.metal ? .18 : .28; m.emissive.set(s.glow ? s.c : '#000000'); m.emissiveIntensity = s.glow ? .55 : 0; MV[k].ring.material.color.set(s.metal ? '#202028' : '#ffffff'); }

/* ================= STATE ================= */
const P = { x: 0, z: 0, vx: 0, vz: 0, y: 0, vy: 0, rot: 0, live: true };
const M = [{ x: 0, z: .8, vx: 0, vz: 0, tx: 0, tz: .8, sg: 1 }, { x: 0, z: -.8, vx: 0, vz: 0, tx: 0, tz: -.8, sg: -1 }];
let state = 'title', score = [0, 0], cur = { t: 0, names: ['YOU', 'CPU'], goal: 7, lv: .42, two: false, stage: -1 }, goalT = 0, serveTo = 0, lastScorer = -1, rally = 0, idleT = 0, hitCool = 0, wallCool = 0, coinsWon = 0, ai = { t: 0, tx: 0, tz: -.8, bank: 0 }, ai0 = { t: 0, tx: 0, tz: .8, bank: 0 };
function applyTable(ti) { cur.t = ti; const t = TABLES[ti]; drawSurface(t); buildRails(t); drawApron(t); railM.color.set(t.rail); railTopM.color.set(t.top); railM.metalness = railTopM.metalness = t.metal ? .9 : 0; railTopM.roughness = t.metal ? .2 : .3;
  puckM.color.set(t.puck); puckM.emissive.set(t.neon ? t.puck : '#000000'); puckM.emissiveIntensity = t.neon ? .7 : 0; ledStripM.color.set(t.l1);
  hemi.intensity = t.neon ? .32 : .55; spots.forEach(s => s.intensity = t.neon ? 2.2 : t.ice || ti === 0 ? 2.1 : 3.2); scene.background.set(t.ice ? '#0a1424' : t.bump ? '#120604' : '#05040f'); scene.fog.color.copy(scene.background); }

/* ================= PHYSICS ================= */
function clampMallet(m) { const xm = W / 2 - MR; m.x = clamp(m.x, -xm, xm); if (m.sg > 0) m.z = clamp(m.z, MR * .3, L / 2 - MR); else m.z = clamp(m.z, -L / 2 + MR, -MR * .3);
  for (const b of bumpers) { const dx = m.x - b.x, dz = m.z - b.z, d = Math.hypot(dx, dz), md = b.r + MR; if (d < md && d > 1e-6) { m.x = b.x + dx / d * md; m.z = b.z + dz / d * md; } } }
function moveMallet(m, maxV, dt) { const ox = m.x, oz = m.z; let dx = m.tx - m.x, dz = m.tz - m.z; const d = Math.hypot(dx, dz), st = maxV * dt; if (d > st) { dx *= st / d; dz *= st / d; } m.x += dx; m.z += dz; clampMallet(m); m.vx = (m.x - ox) / dt; m.vz = (m.z - oz) / dt; }
function step(dt) { const t = TABLES[cur.t];
  for (let k = 0; k < 2; k++) { const m = M[k]; const isAI = !cur.two && k === 1 || (state === 'title'); moveMallet(m, isAI ? 1.4 + (state === 'title' ? .55 : cur.lv) * 4.4 : 9, dt); }
  if (!P.live) return;
  // air glide + friction
  const f = Math.exp(-t.fr * dt); P.vx *= f; P.vz *= f; P.x += P.vx * dt; P.z += P.vz * dt;
  // bumpers
  for (const b of bumpers) { const dx = P.x - b.x, dz = P.z - b.z, d = Math.hypot(dx, dz), md = b.r + R; if (d < md) { const nx = dx / d, nz = dz / d, vn = P.vx * nx + P.vz * nz; if (vn < 0) { P.vx -= 2.05 * vn * nx; P.vz -= 2.05 * vn * nz; b.f = 1; sndWall(Math.abs(vn) * 1.4); sparks(P.x - nx * R, P.z - nz * R, Math.abs(vn), t.l1); } P.x = b.x + nx * md; P.z = b.z + nz * md; } }
  // side walls
  const xm = W / 2 - R; if (P.x < -xm) { P.x = -xm; if (P.vx < 0) { sndWall(-P.vx); P.vx = -P.vx * t.rest; } } else if (P.x > xm) { P.x = xm; if (P.vx > 0) { sndWall(P.vx); P.vx = -P.vx * t.rest; } }
  // end walls & goal mouth
  const zm = L / 2 - R, gh = t.gw / 2;
  for (const e of [-1, 1]) { if (P.z * e > zm) { if (Math.abs(P.x) < gh - R * .15) { /* inside mouth */ } else if (P.z * e < zm + R * 1.2 || Math.abs(P.x) > gh + R * .5) { P.z = e * zm; if (P.vz * e > 0) { sndWall(Math.abs(P.vz)); P.vz = -P.vz * t.rest; } } }
    for (const s of [-1, 1]) { const px = s * gh, pz = e * L / 2, dx = P.x - px, dz = P.z - pz, d = Math.hypot(dx, dz); if (d < R && d > 1e-6) { const nx = dx / d, nz = dz / d, vn = P.vx * nx + P.vz * nz; if (vn < 0) { P.vx -= (1 + t.rest) * vn * nx; P.vz -= (1 + t.rest) * vn * nz; sndWall(Math.abs(vn)); } P.x = px + nx * R; P.z = pz + nz * R; } } }
  // mallets
  for (let k = 0; k < 2; k++) { const m = M[k]; const dx = P.x - m.x, dz = P.z - m.z, d = Math.hypot(dx, dz), md = R + MR; if (d < md && d > 1e-6) { const nx = dx / d, nz = dz / d; const rv = (P.vx - m.vx) * nx + (P.vz - m.vz) * nz;
      if (rv < 0) { P.vx -= 1.9 * rv * nx; P.vz -= 1.9 * rv * nz; const sp = Math.hypot(P.vx, P.vz); if (sp > t.max) { P.vx *= t.max / sp; P.vz *= t.max / sp; } if (hitCool <= 0) { sndHit(-rv); hitCool = .06; if (-rv > 2.2) { sparks(P.x - nx * R, P.z - nz * R, -rv, '#ffffff'); shake = Math.min(1, shake + (-rv - 2) * .12); } } rally++; lastHit = k; }
      P.x = m.x + nx * md; P.z = m.z + nz * md;
      // pinned against a wall → push the mallet back instead
      if (Math.abs(P.x) > xm) { P.x = clamp(P.x, -xm, xm); m.x = P.x - nx * md; m.z = P.z - nz * md; } } }
  const sp = Math.hypot(P.vx, P.vz); if (sp > t.max) { P.vx *= t.max / sp; P.vz *= t.max / sp; }
  // goal?
  if (Math.abs(P.x) < gh && Math.abs(P.z) > L / 2 + R * .6 && state !== 'title') { goal(P.z > 0 ? 1 : 0); return; }
  if (Math.abs(P.x) < gh && Math.abs(P.z) > L / 2 + R * .6 && state === 'title') { P.live = false; goalT = 1; }
  if (Math.abs(P.z) > L / 2 + .2 || Math.abs(P.x) > W) { resetPuck(P.z > 0 ? 0 : 1); } }
let lastHit = -1;
function resetPuck(to) { P.live = true; P.x = rnd(-.05, .05); P.z = to === 0 ? .36 : -.36; P.vx = P.vz = 0; P.y = .25; P.vy = 0; rally = 0; idleT = 0; }

/* ================= AI ================= */
function predictX(px, pz, vx, vz, zLine) { if (Math.abs(vz) < .05) return px; const t = (zLine - pz) / vz; if (t < 0) return px; let x = px + vx * t; const xm = W / 2 - R, span = xm * 2; x += xm; x = ((x % (2 * span)) + 2 * span) % (2 * span); if (x > span) x = 2 * span - x; return x - xm; }
function think(k, A0, lv, dt) { const m = M[k], sg = m.sg; A0.t -= dt; if (A0.t > 0) return; A0.t = .26 - lv * .2 + rnd(0, .06); const homeZ = sg * (L / 2 - .17); const noise = (1 - lv) * .14;
  const own = P.z * sg > 0, toward = P.vz * sg > .25, slow = Math.hypot(P.vx, P.vz) < 1.6 + lv * 1.2;
  if (!P.live) { A0.tx = 0; A0.tz = homeZ; }
  else if (toward && !(own && slow && Math.abs(P.z) < L / 2 - .25)) { let x = predictX(P.x, P.z, P.vx, P.vz, homeZ); x = lerp(x * .55, x, lv) + rnd(-noise, noise);
    const tReach = (homeZ - P.z) / (P.vz || 1e-3); if (own && tReach < .32 + lv * .2 && tReach > 0 && lv > .3) { A0.tx = P.x + P.vx * .06; A0.tz = P.z + P.vz * .06; } else { A0.tx = x; A0.tz = homeZ; } }
  else if (own) { // attack: line up behind the puck, then drive through it
    if (A0.bank === 0 || Math.random() < .3) A0.bank = Math.random() < lv * .55 ? (Math.random() < .5 ? -1 : 1) : 2;
    const gx = A0.bank === 2 ? rnd(-.05, .05) : A0.bank * W, gz = -sg * L / 2; let dx = gx - P.x, dz = gz - P.z; const dl = Math.hypot(dx, dz); dx /= dl; dz /= dl;
    const bx = P.x - dx * (R + MR + .05), bz = P.z - dz * (R + MR + .05); const behind = (m.z - P.z) * sg > .02; const dB = Math.hypot(m.x - bx, m.z - bz);
    if (behind && dB < .09 + lv * .06) { A0.tx = P.x + dx * .3 + rnd(-noise, noise) * .4; A0.tz = P.z + dz * .3; } else if (!behind) { A0.tx = P.x + (m.x > P.x ? 1 : -1) * (R + MR + .06); A0.tz = P.z + sg * .14; } else { A0.tx = bx; A0.tz = bz; } }
  else { A0.tx = P.x * (.25 + lv * .35); A0.tz = homeZ - sg * .02 * lv; }
  m.tx = A0.tx; m.tz = A0.tz; }

/* ================= SOUND / FX ================= */
function sndHit(v) { const a = Math.min(.32, .07 + v * .045); A.noise(.05, 'bandpass', 2400 + v * 200, 3, a); A.tone(1100 + v * 60, .035, 'square', a * .25); A.tone(320, .05, 'triangle', a * .5); try { if (v > 2.5 && state === 'play') navigator.vibrate && navigator.vibrate(12); } catch (e) { } }
function sndWall(v) { if (wallCool > 0 || v < .15) return; wallCool = .04; const a = Math.min(.26, .05 + v * .04); A.noise(.07, 'bandpass', 900, 2, a); A.tone(180, .06, 'triangle', a * .6); }
function sparks(x, z, v, col) { const c = C(col), cc = [c.r * 2.5, c.g * 2.5, c.b * 2.5]; for (let i = 0; i < Math.min(26, 4 + v * 4); i++) GLOW.emit(V3(x, .02, z), V3(rnd(-1, 1), rnd(.2, 1), rnd(-1, 1)).multiplyScalar(rnd(.4, 1.2) * Math.min(3, v * .5)), cc, rnd(.008, .018), rnd(.2, .45), 3, 1, .94); }
let shake = 0, flash = 0;
function big(t, cls, sub) { const d = document.createElement('div'); d.innerHTML = t + (sub ? `<small>${sub}</small>` : ''); if (cls) d.className = cls; $('big').innerHTML = ''; $('big').appendChild(d); }
function goal(scorer) { P.live = false; score[scorer]++; S.goals += scorer === 0 && !cur.two ? 1 : 0; lastScorer = scorer; goalT = 1.7; flash = 1; shake = 1;
  const gl = goalLights[scorer === 0 ? 0 : 1]; if (gl) gl.userData.f = 1.6;
  A.noise(.35, 'bandpass', 700, 1.5, .22); A.tone(160, .25, 'square', .05, .05); [523, 659, 784, 1047].forEach((f, i) => A.tone(f, .16, 'square', .055, .1 + i * .09)); A.noise(1.2, 'bandpass', 1400, .6, .07, .2);
  const gz = scorer === 0 ? -L / 2 : L / 2; for (let i = 0; i < 70; i++) GLOW.emit(V3(rnd(-.15, .15), .05, gz), V3(rnd(-1.2, 1.2), rnd(1, 3), -Math.sign(gz) * rnd(.2, 1.4)), CONFETTI[i % 5], rnd(.012, .026), rnd(.6, 1.2), 4, 1, .97);
  const mine = cur.two ? scorer === 0 : scorer === 0; big(T('גול!', 'GOAL!'), mine ? '' : 'r', cur.two ? cur.names[scorer] : (mine ? (rally > 6 ? T('ראלי ענק! 🔥', 'Epic rally! 🔥') : '') : cur.names[1]));
  updHud(); serveTo = 1 - scorer; if (score[scorer] >= cur.goal) setTimeout(endMatch, 1300); }

/* ================= MATCH FLOW ================= */
function setupMatch() { const md = S.mode; score = [0, 0]; coinsWon = 0; lastHit = -1;
  if (md === 'career') { const st = Math.min(S.career, CAREER.length - 1), o = CAREER[st]; cur = { t: o.t, names: [T('אתם', 'You'), o.n], goal: st < 5 ? 5 : 7, lv: o.lv, two: false, stage: st, em: o.em }; }
  else if (md === 'two') { cur = { t: tableUnlocked(S.tbl) ? S.tbl : 0, names: [T('שחקן 1', 'Player 1'), T('שחקן 2', 'Player 2')], goal: 7, lv: .5, two: true, stage: -1 }; }
  else { cur = { t: tableUnlocked(S.tbl) ? S.tbl : 0, names: [T('אתם', 'You'), LVS[S.lv][0]], goal: 7, lv: LVS[S.lv][1], two: false, stage: -1 }; }
  applyTable(cur.t); paintMallet(0, S.skin); paintMallet(1, cur.two ? (S.skin === 1 ? 0 : 1) : (S.skin === 1 ? 0 : 1));
  M[0].x = M[0].tx = 0; M[0].z = M[0].tz = L / 2 - .2; M[1].x = M[1].tx = 0; M[1].z = M[1].tz = -(L / 2 - .2); resetPuck(cur.two ? (Math.random() < .5 ? 0 : 1) : 0); }
function start() { A.ac(); camera.clearViewOffset(); setupMatch(); state = 'play'; $('title').hidden = true; $('endSheet').hidden = true; $('hud').hidden = false; $('sb').hidden = false; $('pauseSheet').hidden = true; updHud(); fitCam(true);
  A.loopOn('air', 'lowpass', 520, .6, .035); A.startMusic({ bpm: 122, chords: [[45, 52, 57], [41, 48, 53], [48, 55, 60], [43, 50, 55]], kick: true, vol: .55, lead: false });
  big(T('3, 2, 1… בואו!', 'FACE OFF!'), 's', cur.stage >= 0 ? `${cur.em} ${cur.names[1]} · ${TABLES[cur.t].n}` : TABLES[cur.t].n); A.voice('wow', 1.2);
  if (cur.two) { $('hint').hidden = false; $('hint').textContent = T('👆 כל שחקן גורר את המחבט בצד שלו', '👆 Each player drags the mallet on their side'); setTimeout(() => $('hint').hidden = true, 3500); } else if (!S.tut) { $('hint').hidden = false; $('hint').textContent = T('👆 גררו את המחבט – והכניסו לשער של היריב!', '👆 Drag your mallet – score in the far goal!'); } }
function updHud() { $('sA').textContent = score[0]; $('sB').textContent = score[1]; $('nA').textContent = cur.names[0]; $('nB').textContent = cur.names[1]; $('sM').textContent = T('עד ', 'TO ') + cur.goal; $('coinTxt').textContent = S.coins; }
function endMatch() { if (state !== 'play') return; state = 'over'; A.stopMusic(); A.loopOff('air'); $('hint').hidden = true; const won = score[0] > score[1];
  let coins = 0, chest = null; const md = S.mode;
  if (md === 'career' && won) { const st = cur.stage; coins = 60 + st * 35; S.career = Math.max(S.career, st + 1); S.wins++; if ([2, 5, 9].includes(st)) chest = st === 9 ? 'gold' : 'silver'; }
  else if (md === 'cpu' && won) { coins = Math.round(30 + cur.lv * 110); S.wins++; } else if (md === 'cpu' || md === 'career') coins = 10 + score[0] * 3; else coins = 15;
  S.coins += coins; S.save();
  $('eE').textContent = cur.two ? '🏆' : won ? (cur.stage === 9 ? '👑' : '🏆') : '😤';
  $('eT').textContent = cur.two ? cur.names[won ? 0 : 1] + ' ' + T('ניצח!', 'wins!') : won ? (cur.stage === 9 ? T('אלופי הזירה! 👑', 'Arena Champion! 👑') : T('ניצחון! 🏆', 'You win! 🏆')) : cur.names[1] + ' ' + T('ניצח הפעם', 'won this time');
  $('eRes').innerHTML = `<span class="x">${score[0]}</span> : <span class="y">${score[1]}</span>`;
  $('eP').textContent = `🪙 +${coins}` + (md === 'career' && won && S.career < CAREER.length ? ' · ' + T('היריב הבא: ', 'Next: ') + CAREER[S.career].em + ' ' + CAREER[S.career].n : '') + (md === 'career' && won && [1, 3, 5, 7].includes(cur.stage) ? ' · ' + T('שולחן חדש נפתח! 🔓', 'New table unlocked! 🔓') : '');
  $('eAgain').textContent = md === 'career' && won && S.career < CAREER.length ? T('ליריב הבא ▶', 'Next rival ▶') : T('עוד משחק! 🏒', 'Play again! 🏒');
  if (won && !cur.two) { A.voice('yay', 1.3); for (let i = 0; i < 120; i++) GLOW.emit(V3(rnd(-.5, .5), .1, rnd(-.9, .9)), V3(rnd(-1, 1), rnd(1.5, 3.5), rnd(-1, 1)), CONFETTI[i % 5], rnd(.015, .03), rnd(1, 1.8), 3.5, 1, .98); } else if (!cur.two) A.voice('aww', 1);
  const show = () => { $('endSheet').hidden = false; updHud(); };
  if (chest) { const nxt = SKINS.findIndex((s, i) => !S.owned.includes(i)); const prizes = [{ ic: '🪙', name: '+' + (chest === 'gold' ? 500 : 200), sub: T('מטבעות', 'Coins') }]; S.coins += chest === 'gold' ? 500 : 200;
    if (nxt >= 0) { S.owned.push(nxt); prizes.push({ ic: '🏒', name: SKINS[nxt].n, sub: T('מחבט חדש!', 'New mallet!'), isNew: true }); } S.save(); setTimeout(() => openChest({ kind: chest, A, prizes, onDone: show }), 900); }
  else setTimeout(show, 700); }

/* ================= CAMERA ================= */
const camT = V3(0, 0, 0); let camDist = 3, camDir = V3(0, 1, 1).normalize(), camUp = V3(0, 1, 0), camLook = V3(0, 0, 0);
const corners = []; for (const x of [-BW / 2 - .02, BW / 2 + .02]) for (const z of [-BL / 2 - .03, BL / 2 + .03]) for (const y of [-.02, RH + .03]) corners.push(V3(x, y, z));
function fitCam(snap) { const two = state === 'play' && cur.two; if (two) { camDir.set(0, 1, .0001).normalize(); camUp.set(isPortrait() ? 0 : 1, 0, isPortrait() ? -1 : 0); camLook.set(0, 0, 0); }
  else { camDir.set(0, isPortrait() ? 1.35 : .82, 1).normalize(); camUp.set(0, 1, 0); camLook.set(0, 0, isPortrait() ? -.12 : -.18); }
  const box2 = two ? [.97, .86] : [.96, isPortrait() ? .8 : .86]; let lo = .5, hi = 12; const v = V3();
  for (let i = 0; i < 26; i++) { const d = (lo + hi) / 2; camera.position.copy(camLook).addScaledVector(camDir, d); camera.up.copy(camUp); camera.lookAt(camLook); camera.updateMatrixWorld(); let ok = true;
    for (const c of corners) { v.copy(c).project(camera); if (Math.abs(v.x) > box2[0] || v.y > box2[1] || v.y < -.97) { ok = false; break; } } if (ok) hi = d; else lo = d; }
  camDist = hi * (two ? 1.0 : 1.0); if (snap) { camera.position.copy(camLook).addScaledVector(camDir, camDist); camera.lookAt(camLook); } }
E.onResize.push(() => fitCam(true));

/* ================= INPUT ================= */
const ray = new THREE.Raycaster(), plane = new THREE.Plane(V3(0, 1, 0), -.03), ndc = new THREE.Vector2(), hit = V3();
const ptrs = new Map(); const keys = {};
function worldAt(cx, cy) { ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null; }
function aim(id, e) { const p = worldAt(e.clientX, e.clientY); if (!p) return; let k = ptrs.get(id); if (k === undefined) return; const m = M[k];
  const off = (e.pointerType === 'touch' && !cur.two) ? -.07 : 0; m.tx = p.x; m.tz = p.z + off * (k === 0 ? 1 : -1); }
$('stage').addEventListener('pointerdown', e => { if (state !== 'play') return; A.ac(); const p = worldAt(e.clientX, e.clientY); const k = cur.two ? (p && p.z < 0 ? 1 : 0) : 0; ptrs.set(e.pointerId, k); aim(e.pointerId, e);
  if (!S.tut) { S.tut = 1; S.save(); setTimeout(() => $('hint').hidden = true, 1500); } });
addEventListener('pointermove', e => { if (state !== 'play') return; if (!ptrs.has(e.pointerId)) { if (e.pointerType === 'mouse' && !cur.two) { ptrs.set(e.pointerId, 0); } else return; } aim(e.pointerId, e); });
const ptrUp = e => { if (e.pointerType !== 'mouse') ptrs.delete(e.pointerId); }; addEventListener('pointerup', ptrUp); addEventListener('pointercancel', ptrUp);
addEventListener('keydown', e => { keys[e.key.toLowerCase()] = 1; if (e.key === 'Escape') pause(); }); addEventListener('keyup', e => keys[e.key.toLowerCase()] = 0);

/* ================= LOOP ================= */
let last = performance.now(), tAcc = 0;
function loop(now) { requestAnimationFrame(loop); const dt = Math.min(.04, (now - last) / 1000); last = now; const t = now / 1000; A.tick(); hitCool -= dt; wallCool -= dt;
  if (state === 'play' || state === 'title') {
    // keyboard
    if (state === 'play') { const kx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0), kz = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0); if (kx || kz) { M[0].tx = M[0].x + kx * .25; M[0].tz = M[0].z + kz * .25; } }
    if (state === 'play' && !cur.two) think(1, ai, cur.lv, dt); if (state === 'title') { think(1, ai, .55, dt); think(0, ai0, .5, dt); }
    const n = 10; for (let i = 0; i < n; i++) step(dt / n);
    if (P.live) { const sp = Math.hypot(P.vx, P.vz); if (sp < .06) idleT += dt; else idleT = 0; if (idleT > 2.5 && Math.abs(P.z) < .1) { P.vz = (P.z >= 0 ? .4 : -.4); idleT = 0; } if (state === 'title' && idleT > 3) { P.vx = rnd(-1, 1); P.vz = rnd(-2, 2); idleT = 0; } }
    else { goalT -= dt; if (goalT <= 0 && !(state === 'play' && Math.max(...score) >= cur.goal)) resetPuck(state === 'title' ? (Math.random() < .5 ? 0 : 1) : serveTo); }
  }
  // puck visuals
  if (P.live) { P.vy -= 9.8 * dt; P.y += P.vy * dt; if (P.y < .0012) { if (P.vy < -1) A.tone(600, .03, 'square', .03); P.y = .0012; P.vy = 0; } P.y = Math.max(.0012, P.y); puckG.visible = true; }
  else { P.x += P.vx * dt * .5; P.z += P.vz * dt * .5; P.y -= dt * .3; puckG.visible = P.y > -.06; }
  P.y += Math.sin(t * 40) * .00015; puckG.position.set(P.x, P.y, P.z); puckG.rotation.y += (P.vx * .9 - P.vz * .4) * dt * 3;
  const spd = Math.hypot(P.vx, P.vz); if (P.live && spd > 1.8 && S.q !== 'low') { const c = C(TABLES[cur.t].puck); GLOW.emit(V3(P.x, .008, P.z), V3(0, .02, 0), [c.r * 1.6 + .3, c.g * 1.6 + .3, c.b * 1.6 + .3], R * 1.4 * Math.min(1, spd / 4), .18, 0, .55); }
  for (let k = 0; k < 2; k++) { const m = M[k]; MV[k].g.position.set(m.x, .001, m.z); MV[k].g.rotation.z = clamp(-m.vx * .015, -.08, .08); MV[k].g.rotation.x = clamp(m.vz * .015, -.08, .08); }
  for (const gl of goalLights) { gl.userData.f = Math.max(0, (gl.userData.f || 0) - dt); gl.material.color.setScalar(1); const on = gl.userData.f > 0 ? (Math.floor(t * 10) % 2 ? 3 : .6) : .8; gl.scale.y = on > 1 ? 1.6 : 1; gl.material.color.set(gl === goalLights[0] ? '#3a8aff' : '#ff3a5a').multiplyScalar(on); }
  for (const b of bumpers) { b.f = Math.max(0, b.f - dt * 3); b.ring.scale.setScalar(1 + b.f * .25); b.ring.material.color.set(TABLES[cur.t].l1).multiplyScalar(1 + b.f * 2); }
  // camera
  shake = Math.max(0, shake - dt * 2.2); flash = Math.max(0, flash - dt * 2); E.grade.uniforms.uFlash.value = flash * .22;
  if (state === 'title') { const a = t * .12, pt = isPortrait(), r = pt ? 3.3 : 2.3; camera.up.set(0, 1, 0); camera.position.set(Math.sin(a) * r, (pt ? 2.9 : 1.45) + Math.sin(t * .2) * .12, Math.cos(a) * r); camera.lookAt(0, pt ? -.95 : -.12, 0); if (!pt) { const w = innerWidth, h = innerHeight; camera.setViewOffset(w, h, w * .2, 0, w, h); } else camera.clearViewOffset(); }
  else { const tp = V3().copy(camLook).addScaledVector(camDir, camDist); if (!cur.two) { tp.x += P.x * .05; } camera.position.lerp(tp, Math.min(1, dt * 5)); camera.position.x += (Math.random() - .5) * shake * .02; camera.position.y += (Math.random() - .5) * shake * .02; camera.up.copy(camUp); camera.lookAt(camLook.x + (cur.two ? 0 : P.x * .04), camLook.y, camLook.z); }
  if (window.__cam) { const q = window.__cam; camera.up.set(0, 1, 0); camera.position.set(...q.p); camera.lookAt(...q.l); }
  tAcc += dt; if (tAcc > .05) { tAcc = 0; drawBoard(now); }
  FX.update(dt, -.2); GLOW.update(dt, -.05); E.render(); }

/* ================= UI ================= */
const updCoins = () => { $('coinTxt').textContent = S.coins; $('tCoins').textContent = S.coins; };
function renderTitle() { const M2 = [['cpu', '🤖', T('נגד המחשב', 'vs CPU'), LVS[S.lv][0]], ['career', '🏆', T('קריירה', 'Career'), (Math.min(S.career, 10)) + '/10'], ['two', '👥', T('נגד חבר', 'vs Friend'), T('על מכשיר אחד', 'one device')]];
  $('modeSeg').innerHTML = M2.map(([k, ic, n, s]) => `<button data-m="${k}" class="${S.mode === k ? 'on' : ''}"><span>${ic}</span>${n}<small>${s}</small></button>`).join('');
  const tbls = `<div class="tbls">${TABLES.map((t, i) => `<button class="tbl ${S.tbl === i ? 'on' : ''} ${tableUnlocked(i) ? '' : 'lk'}" data-t="${i}" style="--s:${t.surf};--r:${t.rail};--l:${t.l1}"><i></i>${tableUnlocked(i) ? t.n : '🔒 ' + t.n}</button>`).join('')}</div>`;
  let h = '';
  if (S.mode === 'cpu') h = `<div class="opt">${LVS.map(([n], i) => `<button data-l="${i}" class="${S.lv === i ? 'on' : ''}">${n}</button>`).join('')}</div>` + tbls;
  else if (S.mode === 'two') h = tbls;
  else { const st = Math.min(S.career, CAREER.length - 1), o = CAREER[st], done = S.career >= CAREER.length;
    h = `<div class="car"><div class="av">${done ? '👑' : o.em}</div><div>${done ? `<b>${T('אתם האלופים!', 'You are the champion!')}</b>${T('אפשר לשחק שוב נגד האלוף', 'Rematch the champ anytime')}` : `<b>${T('שלב ', 'Stage ')}${st + 1}: ${o.n}</b>${TABLES[o.t].n} · ${T('עד ', 'first to ')}${st < 5 ? 5 : 7}`}</div></div><div class="ladder">${CAREER.map((c, i) => `<span class="${i < S.career ? 'd' : i === st ? 'c' : ''}">${i < S.career || i === st ? c.em : '🔒'}</span>`).join('')}</div>`; }
  $('optBox').innerHTML = h; $('tWins').textContent = S.wins; updCoins(); $('goBtn').textContent = S.mode === 'career' ? T('לזירה! 🏒', 'Enter the arena! 🏒') : T('לשחק! 🏒', 'Play! 🏒');
  const ti = S.mode === 'career' ? CAREER[Math.min(S.career, CAREER.length - 1)].t : (tableUnlocked(S.tbl) ? S.tbl : 0); if (ti !== cur.t || !rails.children.length) applyTable(ti); }
$('modeSeg').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; S.mode = b.dataset.m; S.save(); A.tone(700, .05, 'triangle', .04); renderTitle(); };
$('optBox').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.l) S.lv = +b.dataset.l; if (b.dataset.t) { const i = +b.dataset.t; if (!tableUnlocked(i)) { toast(T('נפתח בקריירה 🔒', 'Unlock it in Career 🔒')); A.tone(200, .1, 'sine', .05); return; } S.tbl = i; } S.save(); A.tone(800, .04, 'triangle', .04); renderTitle(); };
function showTitle() { state = 'title'; A.stopMusic(); A.loopOff('air'); $('title').hidden = false; $('hud').hidden = true; $('sb').hidden = true; $('endSheet').hidden = true; $('pauseSheet').hidden = true; $('hint').hidden = true; $('big').innerHTML = ''; ptrs.clear();
  score = [0, 0]; cur.names = ['YOU', 'CPU']; cur.goal = 7; cur.two = false; renderTitle(); paintMallet(0, S.skin); paintMallet(1, S.skin === 1 ? 0 : 1); resetPuck(0); P.vz = -2; P.vx = .6; }
function renderShop() { $('shopCoins').textContent = S.coins; $('skins').innerHTML = SKINS.map((s, i) => { const own = S.owned.includes(i); return `<button class="sk ${S.skin === i ? 'on' : ''}" data-k="${i}"><canvas data-c="${i}" width="112" height="112"></canvas><b>${s.n}</b><small>${own ? (S.skin === i ? T('נבחר ✔', 'Selected ✔') : T('בחרו', 'Select')) : '🪙 ' + s.p}</small></button>`; }).join('');
  $('skins').querySelectorAll('canvas').forEach(cv => { const s = SKINS[+cv.dataset.c], x = cv.getContext('2d'); const g = x.createRadialGradient(44, 40, 4, 56, 56, 54); g.addColorStop(0, '#ffffff'); g.addColorStop(.25, s.c); g.addColorStop(1, s.metal ? '#3a3a44' : '#00000088'); x.fillStyle = g; x.beginPath(); x.arc(56, 56, 52, 0, TAU); x.fill(); x.strokeStyle = s.metal ? '#202028' : '#fff'; x.lineWidth = 4; x.beginPath(); x.arc(56, 56, 44, 0, TAU); x.stroke();
    x.fillStyle = s.c; x.beginPath(); x.arc(56, 56, 22, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.arc(50, 50, 8, 0, TAU); x.fill(); if (s.glow) { cv.style.filter = `drop-shadow(0 0 6px ${s.c})`; } }); }
$('skins').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; const i = +b.dataset.k, s = SKINS[i]; if (!S.owned.includes(i)) { if (S.coins < s.p) { toast(T('צריך עוד מטבעות 🪙', 'Need more coins 🪙')); A.tone(200, .1, 'sine', .05); return; } S.coins -= s.p; S.owned.push(i); A.voice('yay', 1.3); } S.skin = i; S.save(); paintMallet(0, i); paintMallet(1, i === 1 ? 0 : 1); renderShop(); updCoins(); };
$('goBtn').onclick = () => start(); $('shopBtn').onclick = () => { A.ac(); renderShop(); $('shopSheet').hidden = false; }; $('shopClose').onclick = () => $('shopSheet').hidden = true;
$('eAgain').onclick = () => start(); $('eMenu').onclick = () => showTitle();
function pause() { if (state !== 'play') return; state = 'pause'; $('pauseSheet').hidden = false; A.loopOff('air'); A.stopMusic(); }
$('pauseBtn').onclick = pause; $('pGo').onclick = () => { $('pauseSheet').hidden = true; state = 'play'; last = performance.now(); A.loopOn('air', 'lowpass', 520, .6, .035); A.startMusic(); }; $('pMenu').onclick = () => showTitle();
$('pauseBtn').innerHTML = ICO.pause('#ffffff'); $('homeT').innerHTML = ICO.home('#ffffff'); soundButton('sndBtn', S, A, '#0a2a6a'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('shopBtn').textContent = T('🏒 מחבטים', '🏒 Mallets'); $('shopT').textContent = T('מחבטים', 'Mallets'); $('shopClose').textContent = T('סגירה', 'Close'); $('eMenu').textContent = T('תפריט', 'Menu'); $('pT').textContent = T('הפסקה', 'Paused'); $('pGo').textContent = T('המשך ▶', 'Resume ▶'); $('pMenu').textContent = T('תפריט', 'Menu');
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
applyTable(0); setTimeout(() => { E.resize(); showTitle(); $('loading').hidden = true; requestAnimationFrame(loop); window.__puckOK = true; }, 30);
window.__pk = { sparks, GLOW, P, M, get state() { return state; }, set state(v) { state = v; }, get score() { return score; }, get cur() { return cur; }, start, step, think, ai, ai0, applyTable, fitCam, endMatch, S, setupMatch, sim(sec, f) { for (let i = 0; i < sec * 60; i++) { f && f(i); if (!cur.two) think(1, ai, cur.lv, 1 / 60); for (let j = 0; j < 10; j++) step(1 / 600); if (!P.live) { goalT -= 1 / 60; if (goalT <= 0) resetPuck(serveTo); } } } };
