import { THREE, $, V3, C, clamp, lerp, rnd, rng, T, store, engine, studioEnv, cnv, ctex, particles, CONFETTI, audio, toast, ICO, hubButtons, soundButton, qualityButton } from '../lib/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const S = store('scoot-save', { coins: 0, best: {}, goals: {}, park: 0, ctl: 'touch', skin: 0, owned: [0], tut: 0, mode: 'comp', wins: 0 });
const E = engine(S, { fov: 60, far: 420, bloom: [.28, .4, .92], exposure: 1.02, vignette: .3, sat: 1.12 });
const { scene, camera, renderer } = E; studioEnv(E, '#fff4e4', '#6a7a5a', .55);
const A = audio(S); const FX = particles(E, 900); const GLOW = particles(E, 700, true);
const TAU = Math.PI * 2, G = 14, BARMAX = .45, SESSION = 120;
const isPortrait = () => innerHeight > innerWidth;

/* ================= DATA ================= */
const PARKS = [
  { n: T('פארק השמש', 'Sunny Park'), time: 'day', grad: 'linear-gradient(180deg,#6ab8ff,#cfe9ff)', stars: [15000, 45000, 100000], need: 0,
    goals: [['bar', 1, T('לנחות ברספין', 'Land a Barspin')], ['vert', 1, T('לעוף מעל רמפת רבע-צינור', 'Air out of a quarterpipe')], ['score', 45000, T('להשיג 45,000 בסשן', 'Score 45,000 in a session')]] },
  { n: T('פארק בשקיעה', 'Sunset Park'), time: 'sunset', grad: 'linear-gradient(180deg,#3a3a8a,#ff9a5a)', stars: [25000, 70000, 150000], need: 2,
    goals: [['flip', 1, T('לנחות סלטה', 'Land a flip')], ['grind', 8, T('גריינד של 8 מטר', 'Grind 8 m')], ['mult', 6, T('קומבו ×6', 'Combo ×6')]] },
  { n: T('פארק ניאון', 'Neon Park'), time: 'night', grad: 'linear-gradient(180deg,#0a0a2a,#6a1a8a)', stars: [35000, 90000, 200000], need: 4,
    goals: [['double', 1, T('ברספין כפול או טייל-וויפ כפול', 'A double Barspin or Tailwhip')], ['mult', 8, T('קומבו ×8', 'Combo ×8')], ['score', 120000, T('להשיג 120,000 בסשן', 'Score 120,000 in a session')]] }];
const SKINS = [
  { n: T('סטנדרט', 'Standard'), tier: 0, deck: '#16161c', bars: '#c8ccd6', wheel: '#f2f2f2', grip: '#141416', p: 0 }, { n: T('ניאון', 'Neon'), tier: 0, deck: '#1a1a2a', bars: '#3ae8ff', wheel: '#ff2ad8', grip: '#ff2ad8', p: 200 },
  { n: T('לבה', 'Lava'), tier: 0, deck: '#2a0a0a', bars: '#ff5a1a', wheel: '#ffd23a', grip: '#1a1a1a', p: 350 }, { n: T('ליים', 'Lime'), tier: 0, deck: '#10201a', bars: '#7aff3a', wheel: '#1a1a1a', grip: '#7aff3a', p: 450 },
  { n: T('ענבים', 'Grape'), tier: 1, deck: '#20103a', bars: '#9a5aff', wheel: '#ffffff', grip: '#ffffff', p: 700 }, { n: T('קרח', 'Ice'), tier: 1, deck: '#dfefff', bars: '#5ab8ff', wheel: '#9ae8ff', grip: '#1a3a6a', p: 900 },
  { n: T('הסוואה', 'Camo'), tier: 1, deck: '#3a4a2a', bars: '#6a7a4a', wheel: '#2a2a1a', grip: '#2a2a1a', p: 1100 }, { n: T('ורוד', 'Bubblegum'), tier: 1, deck: '#ffb8e8', bars: '#ff5ab8', wheel: '#ffffff', grip: '#ffffff', p: 1300 },
  { n: T('כרום', 'Chrome'), tier: 2, deck: '#c8ccd6', bars: '#f4f6fa', wheel: '#16161c', grip: '#16161c', p: 2000, metal: 1 }, { n: T('זהב', 'Gold'), tier: 2, deck: '#16161c', bars: '#ffcf3a', wheel: '#ffcf3a', grip: '#16161c', p: 3000, metal: 1 }];
const TIERS = ['Standard', 'Epic', 'Legendary'];
const ADS = ['bowl', 'helix', 'puck', 'ski', 'drift', 'wave', 'rise', 'zori', 'robo', 'kibo', 'goal', 'chase', 'yaya', 'squishy', 'pet', 'mud'];
const TRICK = { bar: { n: 'Barspin', dur: .22, pts: 500 }, whip: { n: 'Tailwhip', dur: .26, pts: 650 }, spin: { n: '360', dur: .4, pts: 800 }, flip: { n: 'Backflip', dur: .58, pts: 1500 }, fflip: { n: 'Frontflip', dur: .62, pts: 1800 } };
const NUM = ['', '', 'Double ', 'Triple ', 'Quad '];

/* ================= TEXTURES ================= */
const R0 = rng(5);
function winTex(pal, night) { const c = cnv(256, 512), x = c.getContext('2d'); x.fillStyle = pal[0]; x.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(0,0,0,${R0() * .06})`; x.fillRect(R0() * 256, R0() * 512, 3, 3); }
  for (let fy = 0; fy < 8; fy++) for (let fx = 0; fx < 4; fx++) { const lit = night ? R0() < .55 : R0() < .12; const g = x.createLinearGradient(0, 0, 0, 40);
    if (lit) { g.addColorStop(0, night ? '#ffe2a0' : '#fff6d8'); g.addColorStop(1, night ? '#ffb85a' : '#e8d8b0'); } else { g.addColorStop(0, pal[1]); g.addColorStop(1, pal[2]); }
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(fx * 64 + 10, fy * 64 + 12, 46, 42); x.fillStyle = g; x.fillRect(fx * 64 + 12, fy * 64 + 14, 42, 38); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(fx * 64 + 12, fy * 64 + 14, 42, 4); x.fillStyle = pal[3]; x.fillRect(fx * 64 + 32, fy * 64 + 14, 2, 38); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }
function noiseTex(base, n, a, w = 256, cb) { const c = cnv(w, w), x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, w, w); for (let i = 0; i < n; i++) { const v = R0() < .5 ? 0 : 255; x.fillStyle = `rgba(${v},${v},${v},${R0() * a})`; x.fillRect(R0() * w, R0() * w, 1 + R0() * 2, 1 + R0() * 2); } cb && cb(x, w); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
const asphaltT = noiseTex('#3a3d44', 9000, .25, 512);
const walkT = noiseTex('#9a9aa2', 3000, .18, 256, (x, w) => { x.strokeStyle = 'rgba(40,40,50,.45)'; x.lineWidth = 2; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * w / 4, 0); x.lineTo(i * w / 4, w); x.stroke(); x.beginPath(); x.moveTo(0, i * w / 4); x.lineTo(w, i * w / 4); x.stroke(); } });
const roofT = noiseTex('#8e8a84', 14000, .35, 256, (x, w) => { x.strokeStyle = 'rgba(40,36,32,.55)'; x.lineWidth = 3; for (let i = 0; i <= 2; i++) { x.beginPath(); x.moveTo(i * w / 2, 0); x.lineTo(i * w / 2, w); x.stroke(); x.beginPath(); x.moveTo(0, i * w / 2); x.lineTo(w, i * w / 2); x.stroke(); } for (let i = 0; i < 7; i++) { x.fillStyle = `rgba(30,28,26,${.12 + R0() * .2})`; x.beginPath(); x.ellipse(R0() * w, R0() * w, 10 + R0() * 30, 6 + R0() * 18, R0() * 3, 0, TAU); x.fill(); } });
const plyT = noiseTex('#c89a5a', 2500, .14, 256, (x, w) => { for (let i = 0; i < 30; i++) { x.strokeStyle = `rgba(120,70,20,${R0() * .25})`; x.beginPath(); x.moveTo(0, R0() * w); x.bezierCurveTo(w / 3, R0() * w, w * .66, R0() * w, w, R0() * w); x.stroke(); } });
const concT = noiseTex('#b8b4ac', 6000, .2, 256);
const gripT = noiseTex('#141418', 6000, .5, 128);

/* ================= SKY / LIGHT ================= */
const skyU = { a: { value: C('#3a8aff') }, b: { value: C('#dff0ff') }, sd: { value: V3(.4, .5, -.6).normalize() }, sc: { value: C('#fff2d0') } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(380, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'uniform vec3 a,b,sc,sd; varying vec3 vP; void main(){ float h=clamp(vP.y*1.4+.15,0.,1.); vec3 c=mix(b,a,pow(h,.7)); float s=max(dot(vP,sd),0.); c+=sc*pow(s,600.)*3.+sc*pow(s,8.)*.35; gl_FragColor=vec4(c,1.); }' })); scene.add(sky);
const hemi = new THREE.HemisphereLight('#dfefff', '#5a5040', .9); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e0', 2.6); sun.castShadow = renderer.shadowMap.enabled; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 120 }); sun.shadow.bias = -.0005; sun.shadow.normalBias = .02; scene.add(sun, sun.target);
scene.fog = new THREE.Fog('#cfe2f4', 90, 300);


/* ================= PARK DEFINITION ================= */
const BX = 26, BZ0 = -34, BZ1 = 26; // fence bounds
const QR = 3.2, QH = 2.6, QL = Math.sqrt(QR * QR - (QR - QH) * (QR - QH)), QDECK = 2.0;
const FEAT = [], RAILS = [], BOXES = [];
// quarterpipe: wall line + inward axis
function qp(ax, at, sign, a0, a1) { FEAT.push({ k: 'qp', ax, at, sign, a0, a1 }); }
function qpH(f, x, z) { const u = f.ax === 'z' ? x : z, d = (f.ax === 'z' ? z - f.at : x - f.at) * f.sign; if (u < f.a0 || u > f.a1 || d < 0 || d > QDECK + QL) return null;
  if (d <= QDECK) return QH; const t = QDECK + QL - d; return QR - Math.sqrt(Math.max(0, QR * QR - t * t)); }
qp('z', BZ0, 1, -22, 22); qp('x', BX, -1, -24, 8); qp('x', -BX, 1, -24, 8);
// bank along the south wall
FEAT.push({ k: 'bank', z0: 20, z1: 25.5, x0: -20, x1: 20, h: 1.5 });
// funbox (center) with a flat rail on top
FEAT.push({ k: 'fun', x0: -3.2, x1: 3.2, zA: -2, zB: -5, zC: -10.5, zD: -13.5, h: 1.15 });
// kickers: p0, dir (unit), len, w, ht
const KICKS = [{ x: -14, z: 8, dx: 0, dz: -1, len: 2.6, w: 2.6, ht: 1.0 }, { x: 14, z: -22, dx: 0, dz: 1, len: 2.6, w: 2.6, ht: 1.0 }, { x: -16, z: -16, dx: .7071, dz: -.7071, len: 2.4, w: 2.4, ht: .9 }];
for (const k of KICKS) FEAT.push({ k: 'kick', ...k });
// raised platform with stairs (east)
FEAT.push({ k: 'plat', x0: 11, x1: 21, z0: 4, z1: 12, h: 1.36, stairs: { z0: 4, z1: .6, n: 5 }, ramp: { z0: 12, z1: 16.5 } });
// ledges & boxes (top heights)
function box(x0, x1, z0, z1, top, kind) { const b = { k: 'box', x0, x1, z0, z1, top, kind }; FEAT.push(b); BOXES.push(b); return b; }
function rail(ax, ay, az, bx, by, bz, kind = 'rail') { const r = { a: V3(ax, ay, az), b: V3(bx, by, bz), kind }; r.d = r.b.clone().sub(r.a); r.len = r.d.length(); r.d.divideScalar(r.len); RAILS.push(r); return r; }
box(-20.3, -19.7, -6, 5, .45, 'ledge'); rail(-20, .47, -5.8, -20, .47, 4.8, 'ledge');
box(-18, -8, 13.6, 14.2, .45, 'ledge'); rail(-17.8, .47, 13.9, -8.2, .47, 13.9, 'ledge');
rail(-7, .52, 9, -7, .52, 0.5); rail(7, .52, -19, 7, .52, -28);
rail(0, 1.15 + .42, -5.6, 0, 1.15 + .42, -9.9); // funbox rail
rail(12.2, 1.36 + .8, 4.3, 12.2, .8, .4, 'hand'); rail(19.8, 1.36 + .8, 4.3, 19.8, .8, .4, 'hand'); // stair handrails
rail(-21.6, QH + .03, BZ0 + QDECK, 21.6, QH + .03, BZ0 + QDECK, 'coping'); // north coping
box(5.86, 6.14, 8, 16, .32, 'beam'); rail(6, .34, 16, 6, .34, 8, 'beam'); // balance beam
function beamAt(x, z) { for (const r of RAILS) { if (r.kind !== 'beam') continue; const t = (x - r.a.x) * r.d.x + (z - r.a.z) * r.d.z; if (t < -.15 || t > r.len + .15) continue; if (Math.hypot(x - (r.a.x + r.d.x * t), z - (r.a.z + r.d.z * t)) < .22) return { r, t: clamp(t, 0, r.len) }; } return null; }
function featH(f, x, z) {
  if (f.k === 'qp') return qpH(f, x, z);
  if (f.k === 'bank') { if (x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1 + 1) return null; return z >= f.z1 ? f.h : f.h * (z - f.z0) / (f.z1 - f.z0); }
  if (f.k === 'fun') { if (x < f.x0 || x > f.x1 || z > f.zA || z < f.zD) return null; if (z >= f.zB) return f.h * (f.zA - z) / (f.zA - f.zB); if (z >= f.zC) return f.h; return f.h * (z - f.zD) / (f.zC - f.zD); }
  if (f.k === 'kick') { const rx = x - f.x, rz = z - f.z, u = rx * f.dx + rz * f.dz, v = -rx * f.dz + rz * f.dx; if (u < 0 || u > f.len || Math.abs(v) > f.w / 2) return null; return f.ht * Math.pow(u / f.len, 1.7); }
  if (f.k === 'plat') { if (x < f.x0 || x > f.x1) return null; if (z >= f.z0 && z <= f.z1) return f.h; const st = f.stairs; if (z < st.z0 && z >= st.z1) { const n = st.n, i = Math.floor((st.z0 - z) / ((st.z0 - st.z1) / n)); return f.h * (1 - (i + 1) / (n + 1)); }
    const rp = f.ramp; if (z > rp.z0 && z <= rp.z1) return f.h * (rp.z1 - z) / (rp.z1 - rp.z0); return null; }
  if (f.k === 'box') { if (x > f.x0 && x < f.x1 && z > f.z0 && z < f.z1) return f.top; return null; }
  return null; }
function qpAt(x, z) { for (const f of FEAT) { if (f.k !== 'qp') continue; const u = f.ax === 'z' ? x : z, d = (f.ax === 'z' ? z - f.at : x - f.at) * f.sign; if (u >= f.a0 && u <= f.a1 && d >= 0 && d <= QDECK + QL) return { f, d }; } return null; }
function H(x, z) { if (x < -BX - .5 || x > BX + .5 || z < BZ0 - .5 || z > BZ1 + .5) return null; let h = 0; for (const f of FEAT) { const v = featH(f, x, z); if (v !== null && v > h) h = v; } return h; }
const isStairs = (x, z) => x >= 11 && x <= 21 && z < 4 && z >= .6;

/* ================= PARK BUILD ================= */
const MATS = {}; const mat = (k, f) => MATS[k] || (MATS[k] = f());
const texL = new THREE.TextureLoader(); const posterCache = {}; function poster(u) { if (posterCache[u]) return posterCache[u]; const m = new THREE.MeshBasicMaterial({ color: '#dcdcdc' }); posterCache[u] = m; texL.load(u, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; m.map = t; m.needsUpdate = true; }); return m; }
const brickT = (() => { const w = 512, c = cnv(w, w), x = c.getContext('2d'); x.fillStyle = '#6e5446'; x.fillRect(0, 0, w, w); const bw = 64, bh = 32;
  for (let j = -2; j < 18; j++) for (let i = -2; i < 10; i++) { const ox = (i * bw * 2 + j * bh) % (w + bw * 2) - bw, oy = j * bh; for (const rot of [0, 1]) { const hue = 12 + R0() * 16, l = 40 + R0() * 16, s = 16 + R0() * 16; x.fillStyle = `hsl(${hue},${s}%,${l}%)`; if (!rot) x.fillRect(ox + 2, oy + 2, bw - 4, bh - 4); else x.fillRect(ox + bw + 2, oy - bh + 2, bh - 4, bw - 4); } }
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(0,0,0,${R0() * .12})`; x.fillRect(R0() * w, R0() * w, 2, 2); } for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(20,14,10,${R0() * .12})`; x.beginPath(); x.ellipse(R0() * w, R0() * w, 20 + R0() * 60, 10 + R0() * 30, R0() * 3, 0, TAU); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; })();
const smoothConc = noiseTex('#c4beb4', 16000, .14, 512, (x, w) => { for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(60,50,40,${R0() * .08})`; x.beginPath(); x.ellipse(R0() * w, R0() * w, 30 + R0() * 90, 20 + R0() * 50, R0() * 3, 0, TAU); x.fill(); } for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(30,30,30,${R0() * .25})`; x.lineWidth = 1 + R0() * 2; x.beginPath(); const a = R0() * w, b = R0() * w; x.moveTo(a, b); x.quadraticCurveTo(a + R0() * 60 - 30, b + R0() * 60 - 30, a + R0() * 120 - 60, b + R0() * 120 - 60); x.stroke(); } });
const leafT = noiseTex('#3a6a2a', 14000, .35, 256);
let parkG = null; const ledScreens = []; let adI = 0; const nextAd = () => ADS[adI++ % ADS.length];
function buildPark(pi) { const night = PARKS[pi].time === 'night'; if (parkG) { scene.remove(parkG); parkG.traverse(o => { if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose(); }); } parkG = new THREE.Group(); scene.add(parkG); const rn = rng(77 + pi); adI = pi * 3;
  const add = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; parkG.add(m); return m; };
  // ground
  const gt = brickT.clone(); gt.repeat.set((BX * 2 + 40) / 2.4, (BZ1 - BZ0 + 40) / 2.4); gt.needsUpdate = true;
  const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(BX * 2 + 40, BZ1 - BZ0 + 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: gt, roughness: .92 })), false, true); ground.position.set(0, 0, (BZ0 + BZ1) / 2);
  const concM = new THREE.MeshStandardMaterial({ map: smoothConc, roughness: .78, color: night ? '#9a96a8' : '#ffffff' });
  // quarterpipes (extruded profile)
  for (const f of FEAT.filter(f => f.k === 'qp')) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0, QH); sh.lineTo(QDECK, QH); const N = 18; for (let i = 0; i <= N; i++) { const t = QL * (1 - i / N); sh.lineTo(QDECK + QL - t, QR - Math.sqrt(QR * QR - t * t)); } sh.lineTo(0, 0);
    const len = f.a1 - f.a0; const g = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false, curveSegments: 4 }); // shape x = d (inward), y = h, z = along
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
    const m = add(new THREE.Mesh(g, concM)); if (f.ax === 'z') { m.rotation.y = -Math.PI / 2; m.position.set(f.a1, 0, f.at); }
    else { m.rotation.y = f.sign > 0 ? 0 : Math.PI; m.position.set(f.at, 0, f.sign > 0 ? f.a0 : f.a1); }
    // coping
    const cp = add(new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, len, 10), mat('steel', () => new THREE.MeshStandardMaterial({ color: '#d0d4dc', metalness: .95, roughness: .2 }))));
    if (f.ax === 'z') { cp.rotation.z = Math.PI / 2; cp.position.set((f.a0 + f.a1) / 2, QH + .02, f.at + f.sign * QDECK); } else { cp.rotation.x = Math.PI / 2; cp.position.set(f.at + f.sign * QDECK, QH + .02, (f.a0 + f.a1) / 2); }
    // graffiti ad on the deck wall
    if (f.ax === 'z') { const gc = cnv(1024, 256), x = gc.getContext('2d'); x.font = '900 120px Arial'; x.textAlign = 'center'; x.lineWidth = 14; x.strokeStyle = '#1a0a3a'; x.strokeText('OFFLINE ARCADE', 512, 150); const gr = x.createLinearGradient(0, 0, 1024, 0); gr.addColorStop(0, '#ff3a8a'); gr.addColorStop(.5, '#ffb02a'); gr.addColorStop(1, '#3ae8ff'); x.fillStyle = gr; x.fillText('OFFLINE ARCADE', 512, 150); x.font = '900 54px Arial'; x.fillStyle = '#fff'; x.strokeText('50+ GAMES · NO WIFI', 512, 225); x.fillText('50+ GAMES · NO WIFI', 512, 225);
      const gm = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), new THREE.MeshStandardMaterial({ map: ctex(gc), transparent: true, roughness: .9, depthWrite: false })); gm.position.set(0, QH * .48, f.at + f.sign * (QDECK + QL) + .01); gm.rotation.x = -.05; gm.visible = false; parkG.add(gm);
      const wall = add(new THREE.Mesh(new THREE.BoxGeometry(len + .6, 2.2, .3), concM)); wall.position.set(0, QH + 1.1, f.at - .15 * f.sign);
      const wg = new THREE.Mesh(new THREE.PlaneGeometry(12, 2), new THREE.MeshBasicMaterial({ map: ctex(gc), transparent: true })); wg.position.set(0, QH + 1.1, f.at + .01 * f.sign); parkG.add(wg); } }
  // bank
  { const f = FEAT.find(f => f.k === 'bank'); const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(f.z1 - f.z0, f.h); sh.lineTo(f.z1 - f.z0 + 1, f.h); sh.lineTo(f.z1 - f.z0 + 1, 0); sh.lineTo(0, 0); const g = new THREE.ExtrudeGeometry(sh, { depth: f.x1 - f.x0, bevelEnabled: false }); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
    const m = add(new THREE.Mesh(g, concM)); m.rotation.y = -Math.PI / 2; m.position.set(f.x1, 0, f.z0); }
  // funbox
  { const f = FEAT.find(f => f.k === 'fun'); const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(f.zA - f.zB, f.h); sh.lineTo(f.zA - f.zC, f.h); sh.lineTo(f.zA - f.zD, 0); sh.lineTo(0, 0); const g = new THREE.ExtrudeGeometry(sh, { depth: f.x1 - f.x0, bevelEnabled: false });
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4); const m = add(new THREE.Mesh(g, concM)); m.rotation.y = Math.PI / 2; m.position.set(f.x0, 0, f.zA); }
  // kickers
  const plyM = mat('ply', () => new THREE.MeshStandardMaterial({ map: plyT, roughness: .7 }));
  for (const k of KICKS) { const sh = new THREE.Shape(); sh.moveTo(0, 0); for (let i = 0; i <= 12; i++) { const t = i / 12; sh.lineTo(t * k.len, k.ht * Math.pow(t, 1.7)); } sh.lineTo(k.len, 0); const g = new THREE.ExtrudeGeometry(sh, { depth: k.w, bevelEnabled: false }); g.translate(0, 0, -k.w / 2);
    const m = add(new THREE.Mesh(g, plyM)); m.position.set(k.x, 0, k.z); m.rotation.y = Math.atan2(-k.dz, k.dx);
    const lip = add(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, k.w, 8).rotateX(Math.PI / 2), MATS.steel)); lip.rotation.y = Math.atan2(-k.dz, k.dx); lip.position.set(k.x + k.dx * k.len, k.ht, k.z + k.dz * k.len); }
  // platform + stairs + ramp
  { const f = FEAT.find(f => f.k === 'plat'); const w = f.x1 - f.x0, cx = (f.x0 + f.x1) / 2; const top = add(new THREE.Mesh(new THREE.BoxGeometry(w, f.h, f.z1 - f.z0), concM)); top.position.set(cx, f.h / 2, (f.z0 + f.z1) / 2);
    const st = f.stairs, n = st.n, tr = (st.z0 - st.z1) / n; for (let i = 0; i < n; i++) { const h = f.h * (1 - (i + 1) / (n + 1)); const s = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, tr), concM)); s.position.set(cx, h / 2, st.z0 - tr * (i + .5)); }
    const sh = new THREE.Shape(); sh.moveTo(0, f.h); sh.lineTo(f.ramp.z1 - f.ramp.z0, 0); sh.lineTo(0, 0); sh.lineTo(0, f.h); const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); const m = add(new THREE.Mesh(g, concM)); m.rotation.y = -Math.PI / 2; m.position.set(f.x1, 0, f.ramp.z0); }
  // boxes / ledges
  for (const b of BOXES) { const m = add(new THREE.Mesh(new THREE.BoxGeometry(b.x1 - b.x0, b.top, b.z1 - b.z0), b.kind === 'beam' ? plyM : mat('granite', () => new THREE.MeshStandardMaterial({ color: '#8e8a92', roughness: .45 })))); m.position.set((b.x0 + b.x1) / 2, b.top / 2, (b.z0 + b.z1) / 2); }
  // rails (skip coping & ledge edges)
  const railM = mat('rail', () => new THREE.MeshStandardMaterial({ color: '#e2e6ee', metalness: .92, roughness: .18 })), postM = mat('post', () => new THREE.MeshStandardMaterial({ color: '#2c2e36', metalness: .6, roughness: .35 }));
  for (const r of RAILS) { if (r.kind === 'ledge' || r.kind === 'coping' || r.kind === 'beam') continue; const mid = r.a.clone().add(r.b).multiplyScalar(.5); const m = add(new THREE.Mesh(new THREE.CylinderGeometry(.032, .032, r.len, 12), railM)); m.position.copy(mid); m.quaternion.setFromUnitVectors(V3(0, 1, 0), r.d);
    const np = Math.max(2, Math.round(r.len / 2.4)); for (let i = 0; i <= np; i++) { const p = r.a.clone().addScaledVector(r.d, i / np * r.len), gh = H(p.x, p.z + (i === 0 ? .05 : i === np ? -.05 : 0)) ?? 0; const po = add(new THREE.Mesh(new THREE.BoxGeometry(.05, Math.max(.05, p.y - gh), .05), postM)); po.position.set(p.x, (p.y + gh) / 2, p.z); } }
  // cones
  const coneM = mat('cone', () => new THREE.MeshStandardMaterial({ color: '#ff6a1a', roughness: .5 })), wM = mat('white', () => new THREE.MeshStandardMaterial({ color: '#f4f4f4', roughness: .5 }));
  for (const [cx, cz] of [[-4, 20], [-2, 20], [0, 20], [2, 20], [4, 20], [-12, -6], [-10, -8], [10, -12], [12, -10], [22, 18]]) { const c = add(new THREE.Mesh(new THREE.ConeGeometry(.16, .46, 16), coneM)); c.position.set(cx, .23, cz); const s = new THREE.Mesh(new THREE.CylinderGeometry(.09, .115, .08, 16), wM); s.position.set(cx, .26, cz); parkG.add(s); const b = add(new THREE.Mesh(new THREE.BoxGeometry(.38, .03, .38), coneM)); b.position.set(cx, .015, cz); }
  // fence + hedges + trees + lamps
  const woodM = mat('wood', () => new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: .75 })), hedgeM = mat('hedge', () => new THREE.MeshStandardMaterial({ map: leafT, roughness: 1, color: night ? '#5a7a6a' : '#ffffff' }));
  const fence = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0); for (const y of [.45, .95]) { const r = add(new THREE.Mesh(new THREE.BoxGeometry(len, .08, .06), woodM)); r.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); r.rotation.y = -ang; }
    const n = Math.round(len / 2.5); for (let i = 0; i <= n; i++) { const p = add(new THREE.Mesh(new THREE.BoxGeometry(.12, 1.2, .12), woodM)); p.position.set(x0 + (x1 - x0) * i / n, .6, z0 + (z1 - z0) * i / n); }
    const h = add(new THREE.Mesh(new THREE.BoxGeometry(len, 1.6, 1.1), hedgeM)); h.position.set((x0 + x1) / 2 - Math.sin(ang) * -.9, .8, (z0 + z1) / 2 + Math.cos(ang) * .9); h.rotation.y = -ang; };
  fence(-BX - .3, BZ1 + .3, BX + .3, BZ1 + .3);
  for (const sx of [-1, 1]) { const hh = add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.6, BZ1 - 8 + .3), hedgeM)); hh.position.set(sx * (BX + 1.2), .8, (BZ1 + 8) / 2 + .2); }
  const trunkM = mat('trunk', () => new THREE.MeshStandardMaterial({ color: '#5a3e2a', roughness: .9 })), folM = [0, 1, 2].map(i => mat('fol' + i + night, () => new THREE.MeshStandardMaterial({ color: night ? ['#1a3a2a', '#24402a', '#1a3020'][i] : ['#3a7a2a', '#4a8a32', '#2e6a24'][i], roughness: .95, flatShading: true })));
  const tree = (x, z, s) => { const t = add(new THREE.Mesh(new THREE.CylinderGeometry(.12 * s, .18 * s, 2.6 * s, 7), trunkM)); t.position.set(x, 1.3 * s, z); for (let i = 0; i < 4; i++) { const g = new THREE.IcosahedronGeometry((1 + rn() * .6) * s, 1); const p = g.attributes.position; for (let j = 0; j < p.count; j++) p.setXYZ(j, p.getX(j) * (1 + rnd(-.12, .12)), p.getY(j) * (1 + rnd(-.12, .12)), p.getZ(j) * (1 + rnd(-.12, .12))); g.computeVertexNormals();
      const f = add(new THREE.Mesh(g, folM[i % 3])); f.position.set(x + rnd(-.8, .8) * s, (2.7 + rnd(0, 1.2)) * s, z + rnd(-.8, .8) * s); } };
  for (let i = 0; i < 46; i++) { const side = i % 4; let x, z; if (side === 0) { x = rnd(-BX - 8, BX + 8); z = BZ1 + 4 + rnd(0, 8); } else if (side === 1) { x = -BX - 4 - rnd(0, 8); z = rnd(BZ0, BZ1 + 6); } else if (side === 2) { x = BX + 4 + rnd(0, 8); z = rnd(BZ0, BZ1 + 6); } else { x = rnd(-BX - 6, BX + 6); z = BZ0 - 6 - rnd(0, 6); } tree(x, z, .9 + rn() * .6); }
  const lampM = MATS.post; for (const [lx, lz] of [[-BX + .8, -20], [-BX + .8, 0], [-BX + .8, 18], [BX - .8, -20], [BX - .8, 18], [-10, BZ1 - .8], [10, BZ1 - .8]]) { const p = add(new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 5.2, 8), lampM)); p.position.set(lx, 2.6, lz); const hd = new THREE.Mesh(new THREE.SphereGeometry(.26, 12, 8), new THREE.MeshBasicMaterial({ color: night ? '#fff0c0' : '#f0f0e8', toneMapped: !night })); hd.position.set(lx, 5.3, lz); parkG.add(hd);
    if (night) { const pool = new THREE.Mesh(new THREE.CircleGeometry(4, 24).rotateX(-Math.PI / 2), mat('pool', () => new THREE.MeshBasicMaterial({ color: '#ffd08a', transparent: true, opacity: .18, depthWrite: false }))); pool.position.set(lx, .02, lz); parkG.add(pool); } }
  // billboards with our games around the park
  const bb = (x, z, ry, w = 4.2, y = 3.2) => { const h = w / 1.6, g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parkG.add(g); const fr = new THREE.Mesh(new RoundedBoxGeometry(w + .3, h + .3, .22, 2, .06), mat('bbf', () => new THREE.MeshStandardMaterial({ color: '#1c1e26', metalness: .6, roughness: .4 }))); fr.castShadow = true; g.add(fr);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), poster('art/p/' + nextAd() + '.jpg')); p.position.z = .115; g.add(p); for (const e of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.14, y, .14), MATS.post); leg.position.set(e * w * .35, -y / 2, -.06); leg.castShadow = true; g.add(leg); }
    if (night) { const gl = new THREE.Mesh(new THREE.PlaneGeometry(w + 1, h + 1), new THREE.MeshBasicMaterial({ color: ['#ff2ad8', '#2ae8ff', '#ffd23a'][adI % 3], transparent: true, opacity: .28, depthWrite: false })); gl.position.z = -.13; g.add(gl); } };
  for (const x of [-16, -5.5, 5.5, 16]) bb(x, BZ0 - .6, 0, 4.6, QH + 3.6);
  bb(BX + .6, -14, -Math.PI / 2); bb(BX + .6, 20, -Math.PI / 2); bb(-BX - .6, -12, Math.PI / 2); bb(-BX - .6, 14, Math.PI / 2); bb(-12, BZ1 + 1.4, Math.PI); bb(12, BZ1 + 1.4, Math.PI);
  // city skyline + LED screen
  const wins = [0, 1, 2].map(i => winTex([['#c8b8a0', '#5a7a9a', '#2a4a6a', '#a89880'], ['#d8d0c8', '#4a6a8a', '#24405a', '#b8b0a8'], ['#8a9aa8', '#3a5a7a', '#1a3050', '#6a7a88']][i], night));
  for (let i = 0; i < 26; i++) { const a = i / 26 * TAU, r = 70 + rn() * 40, w = 10 + rn() * 14, h = 20 + rn() * 50, x = Math.sin(a) * r, z = (BZ0 + BZ1) / 2 + Math.cos(a) * r; const t = wins[i % 3].clone(); t.repeat.set(Math.round(w / 4), Math.round(h / 4)); t.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshStandardMaterial({ map: t, roughness: .85, emissive: C(night ? '#ffffff' : '#000000'), emissiveMap: night ? t : null, emissiveIntensity: night ? .6 : 0 })); m.position.set(x, h / 2 - 1, z); m.lookAt(0, h / 2, (BZ0 + BZ1) / 2); parkG.add(m); }
  const scrC = cnv(1024, 576), scrX = scrC.getContext('2d'), scrT = ctex(scrC); const scr = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), new THREE.MeshBasicMaterial({ map: scrT, toneMapped: false })); scr.position.set(0, 14, BZ0 - 48); parkG.add(scr);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(17, 10, .6), mat('bbf')); frame.position.set(0, 14, BZ0 - 48.4); parkG.add(frame); const pole = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 1), MATS.post); pole.position.set(0, 4.5, BZ0 - 48.6); parkG.add(pole);
  const imgs = ['bowl', 'puck', 'helix', 'ski', 'drift', 'wave'].map(id => { const im = new Image(); im.src = 'art/p/' + id + '.jpg'; return im; }); let lastI = -1;
  ledScreens.length = 0; ledScreens.push(t => { const i = Math.floor(t / 3) % imgs.length; if (i === lastI) return; lastI = i; const im = imgs[i]; scrX.fillStyle = '#000'; scrX.fillRect(0, 0, 1024, 576); if (im.complete && im.naturalWidth) scrX.drawImage(im, 0, 0, 1024, 576); else lastI = -1; scrX.fillStyle = 'rgba(0,0,0,.55)'; scrX.fillRect(0, 500, 1024, 76); scrX.fillStyle = '#ffd23a'; scrX.font = '900 46px Arial'; scrX.textAlign = 'center'; scrX.fillText('OFFLINE ARCADE · 50+ GAMES', 512, 552); scrT.needsUpdate = true; });
  // gate banner
  const bc = cnv(1024, 128), bx = bc.getContext('2d'); const bg = bx.createLinearGradient(0, 0, 1024, 0); bg.addColorStop(0, '#ff2a6a'); bg.addColorStop(.5, '#ff8a1a'); bg.addColorStop(1, '#ffd23a'); bx.fillStyle = bg; bx.fillRect(0, 0, 1024, 128); bx.fillStyle = '#fff'; bx.font = '900 64px Arial'; bx.textAlign = 'center'; bx.textBaseline = 'middle'; bx.fillText('OFFLINE ARCADE · SCOOT PARK', 512, 68);
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.5), new THREE.MeshStandardMaterial({ map: ctex(bc), side: THREE.DoubleSide, emissive: C('#ffffff'), emissiveMap: ctex(bc), emissiveIntensity: night ? .6 : .12 })); ban.position.set(0, 5.4, BZ1 + .4); parkG.add(ban);
  for (const e of [-1, 1]) { const p = add(new THREE.Mesh(new THREE.BoxGeometry(.3, 6.2, .3), MATS.post)); p.position.set(e * 6.2, 3.1, BZ1 + .4); } }

/* ================= SCOOTER ================= */
const SC = new THREE.Group(); scene.add(SC); const riderG = new THREE.Group(); riderG.position.y = .95; SC.add(riderG); const riderOff = new THREE.Group(); riderOff.position.y = -.95; riderG.add(riderOff);
const yawG = new THREE.Group(); riderOff.add(yawG); const trickG = new THREE.Group(); trickG.position.set(0, .36, .02); yawG.add(trickG); const trickOff = new THREE.Group(); trickOff.position.set(0, -.36, -.02); trickG.add(trickOff);
const pivot = new THREE.Group(); pivot.position.set(0, .085, -.24); trickOff.add(pivot);
const deckG = new THREE.Group(); pivot.add(deckG); const barG = new THREE.Group(); pivot.add(barG);
const scM = { deck: new THREE.MeshPhysicalMaterial({ color: '#16161c', roughness: .35, metalness: .4, clearcoat: .6 }), bars: new THREE.MeshPhysicalMaterial({ color: '#c8ccd6', roughness: .22, metalness: .85, clearcoat: .5 }),
  wheel: new THREE.MeshPhysicalMaterial({ color: '#f2f2f2', roughness: .5, clearcoat: .3 }), core: new THREE.MeshStandardMaterial({ color: '#2a2c34', metalness: .9, roughness: .25 }), grip: new THREE.MeshStandardMaterial({ map: gripT, roughness: 1 }), rub: new THREE.MeshStandardMaterial({ color: '#141416', roughness: .95 }) };
{ // deck (relative to pivot at the headtube)
  const dk = new THREE.Mesh(new RoundedBoxGeometry(.118, .034, .52, 3, .012), scM.deck); dk.position.set(0, 0, .3); dk.castShadow = true; deckG.add(dk);
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(.106, .5).rotateX(-Math.PI / 2), scM.grip); gp.position.set(0, .0175, .3); deckG.add(gp);
  const nk = new THREE.Mesh(new THREE.BoxGeometry(.07, .05, .09), scM.deck); nk.position.set(0, .01, .03); nk.rotation.x = -.5; deckG.add(nk);
  const dropout = new THREE.Mesh(new THREE.BoxGeometry(.11, .03, .1), scM.deck); dropout.position.set(0, -.018, .58); deckG.add(dropout);
  const rw = wheel(); rw.position.set(0, -.03, .6); deckG.add(rw); deckG.userData.w = rw;
  const fe = new THREE.Mesh(new THREE.CylinderGeometry(.068, .068, .05, 16, 1, true, -Math.PI / 2, Math.PI * .55).rotateZ(Math.PI / 2), scM.deck); fe.position.set(0, -.03, .6); deckG.add(fe);
  // bars group: headtube + fork + T-bar
  const ht = new THREE.Mesh(new THREE.CylinderGeometry(.024, .024, .13, 14), scM.deck); ht.position.y = .045; barG.add(ht);
  const fork = new THREE.Mesh(new THREE.BoxGeometry(.09, .1, .03), scM.bars); fork.position.set(0, -.04, -.035); barG.add(fork);
  const fw = wheel(); fw.position.set(0, -.115, -.06); barG.add(fw); barG.userData.w = fw;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .7, 12), scM.bars); tube.position.set(0, .44, 0); tube.castShadow = true; barG.add(tube);
  const clamp2 = new THREE.Mesh(new THREE.CylinderGeometry(.026, .026, .06, 12), scM.deck); clamp2.position.y = .13; barG.add(clamp2);
  const cross = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .56, 12).rotateZ(Math.PI / 2), scM.bars); cross.position.y = .79; cross.castShadow = true; barG.add(cross);
  for (const e of [-1, 1]) { const gr = new THREE.Mesh(new THREE.CylinderGeometry(.019, .019, .13, 14).rotateZ(Math.PI / 2), scM.rub); gr.position.set(e * .23, .79, 0); barG.add(gr); const end = new THREE.Mesh(new THREE.CylinderGeometry(.021, .021, .012, 14).rotateZ(Math.PI / 2), scM.rub); end.position.set(e * .3, .79, 0); barG.add(end); } }
function wheel() { const g = new THREE.Group(); const tire = new THREE.Mesh(new THREE.TorusGeometry(.042, .016, 12, 28).rotateY(Math.PI / 2), scM.wheel); tire.castShadow = true; g.add(tire); const core = new THREE.Mesh(new THREE.CylinderGeometry(.034, .034, .024, 16).rotateZ(Math.PI / 2), scM.core); g.add(core); for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.026, .004, .06), scM.wheel); sp.rotation.x = i * TAU / 5; g.add(sp); } return g; }
function paintScooter(k) { const s = SKINS[k]; scM.deck.color.set(s.deck); scM.bars.color.set(s.bars); scM.wheel.color.set(s.wheel); scM.rub.color.set(s.grip || '#141416'); scM.bars.metalness = s.metal ? 1 : .85; scM.deck.metalness = s.metal ? .9 : .4; }

{ // teddy mascot sitting on the deck (our purple bear)
  const bm = new THREE.MeshStandardMaterial({ color: '#9a7ae8', roughness: .85 }), bw = new THREE.MeshStandardMaterial({ color: '#f4eaff', roughness: .9 }), bk = new THREE.MeshStandardMaterial({ color: '#1a1020', roughness: .4 });
  const bear = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 12), bm); body.scale.set(1, 1.15, .9); body.position.y = .05; bear.add(body); const belly = new THREE.Mesh(new THREE.SphereGeometry(.032, 12, 8), bw); belly.position.set(0, .045, -.03); bear.add(belly);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.042, 16, 12), bm); head.position.y = .125; bear.add(head); for (const e of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(.016, 10, 8), bm); ear.position.set(e * .03, .16, 0); bear.add(ear); const eye = new THREE.Mesh(new THREE.SphereGeometry(.007, 8, 6), bk); eye.position.set(e * .015, .132, -.038); bear.add(eye);
    const arm = new THREE.Mesh(new THREE.SphereGeometry(.017, 8, 6), bm); arm.scale.set(1, 1.6, 1); arm.position.set(e * .05, .07, -.01); bear.add(arm); const leg = new THREE.Mesh(new THREE.SphereGeometry(.02, 8, 6), bm); leg.position.set(e * .028, .012, -.03); bear.add(leg); }
  const snout = new THREE.Mesh(new THREE.SphereGeometry(.016, 10, 8), bw); snout.position.set(0, .118, -.038); bear.add(snout); bear.name = 'bear'; bear.position.set(0, .02, .22); bear.traverse(o => o.castShadow = true); deckG.add(bear); deckG.userData.bear = bear; }

/* ================= PLAYER ================= */
const RIDE_H = .95, K_SW = .0078, FL = 520, WMAX = 15;
const mkPart = step => ({ a: 0, w: 0, a0: 0, auto: null, catching: false, free: false, step });
const Q = { bar: mkPart(TAU), whip: mkPart(TAU), spin: mkPart(Math.PI), flip: mkPart(Math.PI), roll: mkPart(Math.PI) };
const P = { x: 0, z: 18, y: 0, u: 0, psi: 0, vx: 0, vz: 0, vy: 0, air: false, grind: null, gt: 0, bal: 0, bar: 0, pitch: 0, airT: 0, done: [], crash: 0, crashV: V3(), pushCD: 0, grindM: 0, auto: 0, autoT: 0, autoA: 0, back: 0, slope: 0, fakie: false, fy: 0, rq: null, rf: null, fj: false };
let state = 'title', score = 0, combo = { pts: 0, list: [], mult: 0, t: 0 }, runStats = {}, slow = 0, shake = 0, park = 0, tLeft = SESSION;
const fwdX = a => Math.sin(a), fwdZ = a => -Math.cos(a);
function resetQ() { for (const k in Q) Object.assign(Q[k], { a: 0, w: 0, a0: 0, auto: null, catching: false, free: false }); }
function respawn() { Object.assign(P, { x: 0, z: 18, y: H(0, 18), u: 8.5, psi: 0, vy: 0, air: false, grind: null, done: [], crash: 0, bar: 0, airT: 0, auto: 0, autoA: 0, back: 0, fakie: false, fy: 0, rq: null, rf: null, fj: false }); resetQ(); $('cue').hidden = true; camInit = true; }
function applyTime(pi) { const t = PARKS[pi].time;
  if (t === 'day') { skyU.a.value.set('#2a7ae8'); skyU.b.value.set('#d8ecff'); skyU.sc.value.set('#fff2d0'); skyU.sd.value.set(.65, .6, -.35).normalize(); sun.color.set('#fff0d8'); sun.intensity = 2.9; E.renderer.toneMappingExposure = 1.02; hemi.color.set('#dfefff'); hemi.groundColor.set('#7a6a50'); hemi.intensity = .8; scene.fog.color.set('#d4e4f2'); scene.fog.near = 60; scene.fog.far = 240; }
  if (t === 'sunset') { skyU.a.value.set('#2a2a7a'); skyU.b.value.set('#ff9a5a'); skyU.sc.value.set('#ffb070'); skyU.sd.value.set(-.6, .2, -.75).normalize(); sun.color.set('#ffb070'); sun.intensity = 2.2; E.renderer.toneMappingExposure = 1.0; hemi.color.set('#ffc8a0'); hemi.groundColor.set('#3a2a3a'); hemi.intensity = .7; scene.fog.color.set('#e89a7a'); scene.fog.near = 50; scene.fog.far = 200; }
  if (t === 'night') { skyU.a.value.set('#04051a'); skyU.b.value.set('#2a1a4a'); skyU.sc.value.set('#9ab0ff'); skyU.sd.value.set(.3, .5, .8).normalize(); sun.color.set('#8aa0ff'); sun.intensity = .9; hemi.color.set('#6a7aff'); hemi.groundColor.set('#1a1020'); hemi.intensity = .45; E.renderer.toneMappingExposure = .72; scene.fog.color.set('#140c2a'); scene.fog.near = 40; scene.fog.far = 170; } }

/* ================= TRICKS / SCORE ================= */
// Every part of the scooter is a real rotating body: a swipe flings it, holding the finger catches it when it comes around.
const NUMN = n => n <= 1 ? '' : n === 2 ? 'Double ' : n === 3 ? 'Triple ' : n === 4 ? 'Quad ' : n + 'x ';
const halfName = (h, base) => (h === 1 ? '180 ' : h === 2 ? '' : h === 3 ? '540 ' : h % 2 === 0 ? NUMN(h / 2) : h * 180 + ' ') + base;
const BASEP = { bar: 500, whip: 650, spin: 350, flip: 800, roll: 850 };
const odd = v => (Math.round(v / Math.PI) % 2 + 2) % 2 === 1;
function orient() { return (odd(Q.roll.a) ? 'Bottom-Up ' : '') + (odd(Q.flip.a) ? 'Reverse ' : ''); }
function regTrick(k, delta) { const h = Math.round(Math.abs(delta) / Math.PI); if (!h) return; const dir = Math.sign(delta); let name, pts;
  if (k === 'bar' || k === 'whip') { const n = Math.round(h / 2); if (!n) return; const ori = orient(); name = ori + NUMN(n) + (dir < 0 ? 'Opposite ' : '') + (k === 'bar' ? 'Barspin' : 'Tailwhip'); pts = BASEP[k] * n * (ori ? 1.5 : 1) * (dir < 0 ? 1.1 : 1); if (k === 'bar') runStats.bar = 1; if (n > 1) runStats.double = 1; }
  else if (k === 'spin') { name = h * 180 + ' Spin'; pts = BASEP.spin * h; }
  else if (k === 'flip') { name = halfName(h, (dir > 0 ? 'Front' : 'Back') + ' Scooter Flip'); pts = BASEP.flip * h; runStats.flip = 1; }
  else { name = halfName(h, (dir < 0 ? 'Opposite ' : '') + 'Side Scooter Flip'); pts = BASEP.roll * h; runStats.flip = 1; }
  P.done.push({ name, pts: Math.round(pts) }); A.tone(880 + P.done.length * 110, .06, 'triangle', .045); try { navigator.vibrate && navigator.vibrate(12); } catch (e) { } }
const nearestT = p => Math.round(p.a / p.step) * p.step;
function catchPart(k) { const p = Q[k], t = nearestT(p); p.a = t; p.w = 0; p.free = false; p.auto = null; if (Math.abs(t - p.a0) > .1) { regTrick(k, t - p.a0); p.a0 = t; } }
function timeToLand() { const h = H(P.x, P.z) ?? 0, d = P.y - h; if (P.vy > 0 && d < 0) return 9; return (P.vy + Math.sqrt(Math.max(0, P.vy * P.vy + 2 * G * Math.max(0, d)))) / G; }
function updParts(dt) { const ttl = P.air ? timeToLand() : 9, autoC = ttl < .32;
  if (P.rf && ttl < .3 && P.rf.a < TAU) P.rf.w = Math.max(P.rf.w, (TAU - P.rf.a) / Math.max(.05, ttl - .03)); // help the rider flip finish
  for (const k in Q) { const p = Q[k];
  if (p.auto !== null) { const d = p.auto - p.a, s = Math.sign(d) * Math.min(Math.abs(d), (k === 'flip' || k === 'roll' ? 9 : 12) * dt); p.a += s; p.w = s / dt; if (Math.abs(p.auto - p.a) < 1e-3) { p.a = p.auto; catchPart(k); } continue; }
  p.a += p.w * dt; p.w *= 1 - .22 * dt;
  const lockT = (k === 'flip' || k === 'roll') && (autoC || Math.abs(p.w) > 2) ? TAU : p.step;
  if (autoC && Math.abs(p.w) > 2) { // landing soon: if it can't come around in time, the rider grabs it to the closest straight position
    const nxt = (p.w > 0 ? Math.ceil(p.a / lockT - 1e-6) : Math.floor(p.a / lockT + 1e-6)) * lockT; if (Math.abs(nxt - p.a) > Math.abs(p.w) * Math.max(0, ttl - .05)) { p.w = 0; p.free = false; } }
  if (p.catching || (autoC && Math.abs(p.a - Math.round(p.a / lockT) * lockT) > .02)) { const t = Math.round(p.a / lockT) * lockT, d = t - p.a;
    if (Math.abs(p.w) > 2) { if (Math.abs(d) < .7) { p.w = 0; p.free = false; } }
    else if (autoC || Math.abs(d) < 2.4) { p.w = 0; p.a += d * Math.min(1, dt * (autoC ? 24 : 18)); if (Math.abs(d) < .02) catchPart(k); } } } }
function partsOK() { for (const k in Q) { const p = Q[k], st = k === 'spin' ? Math.PI : TAU; if (Math.abs(p.a - Math.round(p.a / st) * st) > .95) return false; } return !(P.rf && P.rf.a < TAU * .72); }
function settleTricks() { for (const k of ['flip', 'roll', 'spin', 'bar', 'whip']) { const p = Q[k], st = k === 'spin' ? Math.PI : TAU, t = Math.round(p.a / st) * st; if (Math.abs(t - p.a0) > .1) regTrick(k, t - p.a0); }
  if (odd(Q.spin.a)) { P.fakie = !P.fakie; P.fy = P.fakie ? Math.PI : 0; P.done.push({ name: P.fakie ? 'Fakie Landing' : 'Revert Landing', pts: 300 }); }
  if (P.rf) { const r = P.rf; P.done.push({ name: (r.rev ? 'Reverse ' : '') + (r.k === 'side' && r.dir < 0 ? 'Opposite ' : '') + { front: 'Front', back: 'Back', side: 'Side' }[r.k] + ' Rider Flip', pts: Math.round({ front: 1500, back: 1400, side: 1700 }[r.k] * (r.rev ? 1.3 : 1)) }); runStats.flip = 1; }
  if (P.fj && P.airT > .3) P.done.push({ name: 'Fakie Jump', pts: 250 });
  resetQ(); P.rf = null; P.fj = false; }
function trickAuto(k, dir = 1) { if (!P.air || P.crash || state !== 'play') return; const p = Q[k]; p.free = false; p.catching = false; p.auto = (p.auto ?? nearestT(p)) + dir * TAU; A.noise(.12, 'bandpass', 900, 1.2, .05, 0, 2400); }
function addCombo(name, pts) { combo.list.push(name); combo.pts += pts; combo.mult = Math.min(10, combo.mult + 1); combo.t = 1.6; runStats.mult = Math.max(runStats.mult || 0, combo.mult); drawCombo(); }
function bankCombo() { if (!combo.list.length) return; const tot = Math.round(combo.pts * combo.mult); score += tot; $('combo').innerHTML = `<div class="bank"><div class="c">${comboText()}</div><div class="p">+${tot.toLocaleString('en-US')}</div></div>`;
  if (combo.mult >= 4) { A.tone(880, .12, 'triangle', .06); A.tone(1320, .2, 'triangle', .06, .08); } combo = { pts: 0, list: [], mult: 0, t: 0 }; updHud(); }
function comboText() { const L = combo.list, out = []; let i = 0; while (i < L.length) { let j = i; while (j + 1 < L.length && L[j + 1] === L[i]) j++; out.push(L[i] + (j > i ? ' ×' + (j - i + 1) : '')); i = j + 1; } return out.slice(-4).join(' + '); }
function drawCombo() { if (!combo.list.length) return; $('combo').innerHTML = `<div class="c">${comboText()}</div><div class="p">${Math.round(combo.pts).toLocaleString('en-US')} ×${combo.mult}</div>`; updHud(); }
function bail() { if (P.crash) return; P.crash = 1.3; P.grind = null; P.rf = null; P.rq = null; $('cue').hidden = true; combo = { pts: 0, list: [], mult: 0, t: 0 }; $('combo').innerHTML = ''; big(T('נפילה!', 'BAIL!')); shake = 1.1;
  P.crashV.set(rnd(-2, 2), rnd(2.5, 4.5), rnd(-2, 2)); A.noise(.4, 'lowpass', 900, 1, .3); A.noise(.25, 'bandpass', 2400, 2, .15, .05); A.voice('aww', 1.1); try { navigator.vibrate && navigator.vibrate([30, 40, 60]); } catch (e) { } A.loopOff('grind'); updHud(); }
function big(t, cls) { const d = document.createElement('div'); d.textContent = t; if (cls) d.className = cls; $('big').innerHTML = ''; $('big').appendChild(d); }
function cue(t) { const c = $('cue'); c.textContent = t; c.hidden = false; }

/* ================= PHYSICS ================= */
function slopeAt(x, z, a, d = .25) { const h0 = H(x - fwdX(a) * d, z - fwdZ(a) * d), h1 = H(x + fwdX(a) * d, z + fwdZ(a) * d); if (h0 === null || h1 === null || Math.abs(h1 - h0) > 1.2) return 0; return (h1 - h0) / (2 * d); }
function launch(vy) { P.air = true; P.vy = vy; P.airT = 0; const vh = Math.hypot(P.vx, P.vz); P.auto = 0; P.autoT = 0; P.autoA = 0;
  if (vy > 3 && vh < vy * .45) { P.auto = Math.PI * (Math.random() < .5 ? 1 : -1); P.autoT = 2 * vy / G * .8; }
  P.fj = P.fakie && vy > 2.5;
  if (P.rq && vy > 2.4) { const T0 = 2 * vy / G, gh = H(P.x + P.vx * T0, P.z + P.vz * T0) ?? 0, drop = Math.max(0, P.y - gh), Tf = (vy + Math.sqrt(vy * vy + 2 * G * drop)) / G; P.rf = { k: P.rq.k, dir: P.rq.dir, rev: P.fakie, a: 0, w: TAU / Math.max(.3, Tf * .7) }; A.noise(.3, 'bandpass', 600, 1, .08, 0, 1600); }
  P.rq = null; $('cue').hidden = true; A.noise(.08, 'highpass', 1800, 1, .08); A.tone(180, .06, 'triangle', .08); }
function ollie() { if (P.air || P.crash || state !== 'play') return; if (P.grind) { endGrind(false); P.vy = 4.6; addCombo('Jump Off Rail', 150); return; } const ch = Math.cos(Math.atan(P.slope)); P.vx = fwdX(P.psi) * P.u * ch; P.vz = fwdZ(P.psi) * P.u * ch; launch(5.3 + Math.min(1.4, Math.abs(P.u) * .07) + Math.max(0, P.u * Math.sin(Math.atan(P.slope)))); }
function push() { if (P.air || P.grind || P.crash || P.pushCD > 0) return; P.pushCD = .3; if (P.u < 0) P.u = 0; P.u = Math.min(P.u + 2.6, Math.max(P.u, 12)); A.noise(.15, 'lowpass', 700, 1, .06); }
function toggleFakie() { if (P.air || P.grind || P.crash || state !== 'play') return; P.fakie = !P.fakie; addCombo(P.fakie ? 'Fakie' : 'Revert', 150); A.noise(.18, 'bandpass', 1400, 1.5, .07, 0, 600); }
function queueRider(k, dir) { if (P.air || P.crash || P.grind) return; P.rq = { k, dir: dir || 1, t: 1.8 }; cue((P.fakie && k === 'front' ? 'Reverse ' : '') + { front: 'Front', back: 'Back', side: 'Side' }[k] + ' Rider Flip ↻'); A.tone(520, .07, 'triangle', .05); }
function onRamp() { if (P.u < 2 || P.grind) return false; if (P.slope > .18) return true; for (const d of [1.2, 2.4, 3.4]) { const x = P.x + fwdX(P.psi) * d, z = P.z + fwdZ(P.psi) * d; if (slopeAt(x, z, P.psi) > .2) return true; } return false; }
function land() { if (P.auto) P.psi += P.auto; P.autoA = 0; const s = slopeAt(P.x, P.z, P.psi); const fx = fwdX(P.psi), fz = fwdZ(P.psi); let vh = P.vx * fx + P.vz * fz; const sq = Math.sqrt(1 + s * s); let u = (vh + P.vy * s) / sq;
  const nrm = Math.abs(-P.vy - vh * s) / sq; if (!partsOK() || nrm > 19) { bail(); return; }
  settleTricks(); P.air = false; P.y = H(P.x, P.z) ?? P.y;
  if (P.auto) { runStats.vert = 1; addCombo(P.airT > 1 ? 'Air 180' : 'Quarter 180', Math.round(300 + P.airT * 300)); }
  if (P.airT > .75 && !P.auto) addCombo(P.airT > 1.4 ? 'Huge Air' : 'Big Air', Math.round(P.airT * 260));
  if (!P.done.length && !P.auto && P.airT > .3 && !combo.list.length) addCombo('Ollie', 100);
  for (const t of P.done) addCombo(t.name, t.pts);
  if (P.done.length) { slow = .32; A.tone(660, .1, 'triangle', .06); A.tone(990, .16, 'triangle', .06, .07); }
  if (u < -.5) { u = -u; P.psi += Math.PI; P.fakie = !P.fakie; P.fy = P.fakie ? Math.PI : 0; } P.u = Math.min(u, 15); P.psi = Math.atan2(Math.sin(P.psi), Math.cos(P.psi));
  const hard = Math.min(1, nrm / 10); A.noise(.12, 'lowpass', 400, 1, .1 + hard * .2); A.tone(90, .12, 'sine', .12 * hard + .04); shake = Math.max(shake, hard * .45);
  for (let i = 0; i < 14; i++) FX.emit(V3(P.x + rnd(-.25, .25), P.y + .03, P.z + rnd(-.25, .25)), V3(rnd(-1, 1), rnd(.2, 1), rnd(-1, 1)), [.75, .7, .66], rnd(.05, .12), rnd(.4, .8), 2, .5, .92);
  P.done = []; P.vy = 0; P.airT = 0; P.auto = 0; }
function tryGrind() { const fx = P.vx, fz = P.vz, vh = Math.hypot(fx, fz) || 1;
  for (const r of RAILS) { if (r.kind === 'beam') continue; const dh = Math.hypot(r.d.x, r.d.z); if (dh < .2) continue; const t = ((P.x - r.a.x) * r.d.x + (P.z - r.a.z) * r.d.z) / (dh * dh); if (t < 0 || t > r.len) continue; const pt = r.a.clone().addScaledVector(r.d, t);
    if (Math.hypot(P.x - pt.x, P.z - pt.z) > .4) continue; const dy = P.y - pt.y; if (dy < -.3 || dy > .5) continue; const cosA = (fx * r.d.x + fz * r.d.z) / (vh * dh); if (Math.abs(cosA) < .55) continue;
    if (!partsOK()) { bail(); return true; } settleTricks(); for (const q of P.done) addCombo(q.name, q.pts); P.done = [];
    startGrind(r, t, cosA >= 0 ? 1 : -1, Math.max(3, vh * Math.abs(cosA))); return true; }
  return false; }
function startGrind(r, t, dir, u) { P.grind = r; P.gt = t; P.gdir = dir; P.u = u; P.bal = rnd(-.15, .15); P.air = false; P.vy = 0; P.grindM = 0; P.auto = 0; P.autoA = 0;
  A.noise(.1, 'bandpass', r.kind === 'beam' ? 900 : 3200, 3, .14); if (r.kind !== 'beam') A.loopOn('grind', 'bandpass', 2600, 6, .045, 7); }
function endGrind(slip) { const r = P.grind, m = Math.round(P.grindM); runStats.grind = Math.max(runStats.grind || 0, P.grindM);
  if (m >= 1) addCombo((r.kind === 'beam' ? 'Balance ' : r.kind === 'ledge' ? '5-0 ' : r.kind === 'coping' ? 'Coping Grind ' : 'Grind ') + m + 'm', m * (r.kind === 'beam' ? 170 : 140));
  P.grind = null; A.loopOff('grind'); const sp = P.gdir; P.vx = r.d.x * sp * P.u; P.vz = r.d.z * sp * P.u; P.psi = Math.atan2(P.vx, -P.vz); if (slip) { combo.mult = Math.max(0, combo.mult - 2); P.x += (Math.random() < .5 ? -1 : 1) * .35; } launch(slip ? .3 : r.kind === 'beam' ? .6 : 1.4); }
function step(dt) { if (P.crash) { P.crash -= dt; P.crashV.y -= G * dt; P.x += P.crashV.x * dt; P.z += P.crashV.z * dt; P.y += P.crashV.y * dt; const h = H(P.x, P.z); if (h !== null && P.y < h) { P.y = h; P.crashV.multiplyScalar(.4); P.crashV.y = Math.abs(P.crashV.y) * .3; }
    if (P.crash <= 0) { const x = P.x, z = P.z; respawn(); if (H(x, z) !== null && H(x, z) < .05) { P.x = x; P.z = z; P.y = 0; P.u = 3; } } return; }
  P.pushCD -= dt; if (P.rq) { P.rq.t -= dt; if (P.rq.t <= 0) { P.rq = null; $('cue').hidden = true; } }
  if (P.grind) { const r = P.grind, sp = P.gdir, beam = r.kind === 'beam'; P.u += -G * r.d.y * sp * dt * .9 - (beam ? .2 : .35) * dt; P.u = clamp(P.u, beam ? 2.5 : 1.2, 15); P.gt += P.u * sp * dt;
    P.bal += (P.bal * (beam ? 1.9 : 1.5) + rnd(-1, 1) * (beam ? 1.3 : 1.05)) * dt - P.bar / BARMAX * 2.6 * dt; P.grindM += P.u * dt; combo.t = 1.6;
    if (!beam && Math.random() < .7) { const c = r.a.clone().addScaledVector(r.d, P.gt); GLOW.emit(V3(c.x, c.y + .02, c.z), V3(rnd(-1, 1), rnd(.5, 2), rnd(-1, 1)), [2.6, 1.8, .6], rnd(.02, .04), rnd(.2, .45), 6, 1, .95); }
    const pos = r.a.clone().addScaledVector(r.d, clamp(P.gt, 0, r.len)); P.x = pos.x; P.y = pos.y + .02; P.z = pos.z; P.psi = Math.atan2(r.d.x * sp, -r.d.z * sp); P.pitch = Math.atan2(r.d.y * sp, Math.hypot(r.d.x, r.d.z));
    if (P.gt < 0 || P.gt > r.len) endGrind(false); else if (Math.abs(P.bal) > 1) endGrind(true); return; }
  if (!P.air) { const h0 = P.y; let s = slopeAt(P.x, P.z, P.psi); const sq = Math.sqrt(1 + s * s); P.slope = s; const stairs = isStairs(P.x, P.z);
    let a = -G * s / sq * (stairs ? .2 : 1) - .1 * Math.sign(P.u) - .0028 * P.u * Math.abs(P.u); if (P.u < 8.8 && P.u > -.5 && Math.abs(s) < .15) a += 4.6; P.u = clamp(P.u + a * dt, -15, 18);
    // rolled back down a ramp: now riding fakie (backwards)
    if (P.u < -.3) { P.back += dt; if (P.back > .25 && Math.abs(s) < .4) { P.psi += Math.PI; P.u = -P.u; P.back = 0; P.fakie = !P.fakie; P.fy = P.fakie ? Math.PI : 0; addCombo(P.fakie ? 'Fakie' : 'Revert', 80); } } else P.back = 0;
    const vh = P.u / sq; P.psi += vh * Math.tan(P.bar) / .62 * .55 * dt;
    let nx = P.x + fwdX(P.psi) * vh * dt, nz = P.z + fwdZ(P.psi) * vh * dt;
    if (Math.abs(nx) > BX - .3 || nz < BZ0 + .3 || nz > BZ1 - .3) { const hit = Math.abs(nx) > BX - .3 ? Math.abs(Math.sin(P.psi)) : Math.abs(Math.cos(P.psi)); if (hit * Math.abs(P.u) > 6.5) { bail(); return; } if (Math.abs(nx) > BX - .3) { P.psi = -P.psi; nx = Math.sign(nx) * (BX - .3); } else { P.psi = Math.PI - P.psi; nz = clamp(nz, BZ0 + .3, BZ1 - .3); } P.u *= .7; A.noise(.08, 'lowpass', 500, 1, .08); }
    const q0 = qpAt(P.x, P.z), q1 = qpAt(nx, nz);
    if (q0 && q0.d > QDECK + .02 && q1 && q1.d <= QDECK + .06 && P.u > 0) { // up the quarterpipe and over the coping: go vert
      const f = q0.f, wn = f.ax === 'z' ? [0, -f.sign] : [-f.sign, 0]; let hx = fwdX(P.psi) * vh, hz = fwdZ(P.psi) * vh; const vn = hx * wn[0] + hz * wn[1]; hx -= wn[0] * (vn + .35); hz -= wn[1] * (vn + .35);
      P.x = P.x + (nx - P.x) * .5; P.z = P.z + (nz - P.z) * .5; P.y = QH; P.vx = hx; P.vz = hz; launch(Math.max(6.2, Math.hypot(P.u * s / sq, vn))); return; }
    const bm = beamAt(nx, nz); if (bm && h0 < bm.r.a.y - .1) { const r = bm.r, ca = fwdX(P.psi) * r.d.x + fwdZ(P.psi) * r.d.z; if (Math.abs(ca) > .82 && P.u > 1.5) { startGrind(r, bm.t, ca >= 0 ? 1 : -1, Math.abs(P.u)); return; } }
    const hn = H(nx, nz);
    if (hn === null) { P.x = nx; P.z = nz; P.vx = fwdX(P.psi) * vh; P.vz = fwdZ(P.psi) * vh; launch(P.u * s / sq); return; }
    if (hn > h0 + .3) { if (Math.abs(P.u) > 2.6) { bail(); return; } P.u = 0; return; }
    const s2 = slopeAt(nx, nz, P.psi), vyG = (hn - h0) / dt;
    if ((hn < h0 - .3 && !stairs) || (s > 1.4 && s2 < s * .45 && vyG > 1.5)) { P.x = nx; P.z = nz; P.vx = fwdX(P.psi) * vh; P.vz = fwdZ(P.psi) * vh; launch(s > 1.4 ? P.u * s / sq : P.u * clamp(s, -1, 2) / sq * .95); return; }
    if (stairs && hn < h0 - .05) { shake = Math.max(shake, .25); P.u *= .97; A.noise(.05, 'lowpass', 300, 1, .1); }
    P.x = nx; P.z = nz; P.y = hn; P.pitch = lerp(P.pitch, Math.atan(s), Math.min(1, dt * 14));
    if (combo.list.length) { combo.t -= dt; if (combo.t <= 0) bankCombo(); } return; }
  // ---- air ----
  P.airT += dt; P.vy -= G * dt; P.x += P.vx * dt; P.z += P.vz * dt; P.y += P.vy * dt;
  if (Math.abs(P.x) > BX - .3) { P.x = Math.sign(P.x) * (BX - .3); P.vx *= -.4; } if (P.z < BZ0 + .3 || P.z > BZ1 - .3) { P.z = clamp(P.z, BZ0 + .3, BZ1 - .3); P.vz *= -.4; }
  updParts(dt); if (P.rf) P.rf.a = Math.min(TAU, P.rf.a + P.rf.w * dt);
  if (P.auto) { const e = clamp(P.airT / Math.max(.2, P.autoT), 0, 1); P.autoA = P.auto * (e < .5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2); }
  P.pitch = lerp(P.pitch, P.auto ? -1.2 * Math.sign(P.vy) * .5 : clamp(P.vy * .04, -.5, .4), Math.min(1, dt * 3));
  if (P.vy < .8 && tryGrind()) return;
  const hn = H(P.x, P.z); if (hn !== null && P.y <= hn) { const prevY = P.y - P.vy * dt; if (hn - prevY > .5 && Math.abs(slopeAt(P.x, P.z, Math.atan2(P.vx, -P.vz))) < 1) { bail(); return; } P.y = hn; land(); return; }
  if (P.y < -5) bail(); }

/* ================= RIVALS (competition) ================= */
const RIV = [
  { n: T('מאיה', 'Maya'), shirt: '#ff4a8a', pants: '#2a2a4a', helm: '#ffd23a', skin: '#f0c098', deck: '#1a1a2a', bars: '#ff4a8a', wheel: '#ffffff', skill: .55, sp: 8.4, loop: 0, wp: 2, at: [3, 8, Math.PI] },
  { n: T('רון', 'Ron'), shirt: '#3a9aff', pants: '#1a1a24', helm: '#f4f4f4', skin: '#c89068', deck: '#10201a', bars: '#7aff3a', wheel: '#1a1a1a', skill: .72, sp: 8.7, loop: 1, wp: 0, at: [-14, 11, 0] },
  { n: T('ליאו', 'Leo'), shirt: '#ffb02a', pants: '#2a3a2a', helm: '#ff3a3a', skin: '#e8b088', deck: '#20103a', bars: '#9a5aff', wheel: '#ffffff', skill: .85, sp: 9.0, loop: 2, wp: 0, at: [16, -6, 0] }];
const LOOPS = [[[0, -33, 1], [3, 10], [3, 22.5], [0, 16]], [[-14, 0], [-11, -10], [-11, -33, 1], [-10.5, -12], [-10.5, 22], [-14, 15]], [[16, -33, 1], [14, -26], [14, -15], [9.5, -6], [9.5, 22], [16, 17]]];
const RSCALE = [.82, 1.17, 1.48];
const BOT_TR = [['Barspin', 500, .32, { bar: 1 }], ['Tailwhip', 650, .38, { whip: 1 }], ['Opposite Barspin', 550, .36, { bar: -1 }], ['Opposite Tailwhip', 715, .42, { whip: -1 }],
  ['Double Barspin', 1000, .58, { bar: 2 }], ['360 Spin', 700, .6, { spin: 2 }], ['Double Tailwhip', 1300, .68, { whip: 2 }], ['Front Scooter Flip', 1600, .74, { flip: 1 }], ['Back Scooter Flip', 1600, .74, { flip: -1 }],
  ['Side Scooter Flip', 1700, .8, { roll: 1 }], ['Triple Tailwhip', 1950, .92, { whip: 3 }], ['Back Rider Flip', 1400, .9, { rb: 1 }], ['Front Rider Flip', 1500, .95, { rf: 1 }], ['Side Rider Flip', 1700, 1, { rs: 1 }]];
const bots = [];
function limb(a, b, r, m, g) { const d = b.clone().sub(a), L = d.length(); const geo = new THREE.CapsuleGeometry(r, Math.max(.01, L - r * 2), 4, 10); const o = new THREE.Mesh(geo, m); o.position.copy(a).addScaledVector(d, .5); o.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); o.castShadow = true; g.add(o); return o; }
function makeRiderBody(d) { const g = new THREE.Group(); const sk = new THREE.MeshStandardMaterial({ color: d.skin, roughness: .7 }), sh = new THREE.MeshStandardMaterial({ color: d.shirt, roughness: .8 }), pa = new THREE.MeshStandardMaterial({ color: d.pants, roughness: .85 }), he = new THREE.MeshPhysicalMaterial({ color: d.helm, roughness: .3, clearcoat: .8 }), shoe = new THREE.MeshStandardMaterial({ color: '#f4f4f4', roughness: .6 });
  const hipF = V3(.08, .8, .14), hipB = V3(-.08, .8, .2), kF = V3(.08, .47, -.04), kB = V3(-.08, .46, .3), fF = V3(.05, .14, -.02), fB = V3(-.04, .14, .24);
  limb(hipF, kF, .062, pa, g); limb(kF, fF, .052, pa, g); limb(hipB, kB, .062, pa, g); limb(kB, fB, .052, pa, g);
  for (const f of [fF, fB]) { const s = new THREE.Mesh(new RoundedBoxGeometry(.1, .07, .22, 2, .03), shoe); s.position.set(f.x, .135, f.z - .03); s.castShadow = true; g.add(s); }
  limb(V3(0, .8, .18), V3(0, 1.22, .07), .15, sh, g);
  const shL = V3(-.17, 1.2, .07), shR = V3(.17, 1.2, .07), eL = V3(-.25, 1.0, -.07), eR = V3(.25, 1.0, -.07), hL = V3(-.23, .885, -.23), hR = V3(.23, .885, -.23);
  limb(shL, eL, .045, sh, g); limb(shR, eR, .045, sh, g); limb(eL, hL, .04, sk, g); limb(eR, hR, .04, sk, g);
  const neck = limb(V3(0, 1.28, .05), V3(0, 1.36, .03), .045, sk, g);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.1, 16, 12), sk); head.position.set(0, 1.44, .02); head.castShadow = true; g.add(head);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(.118, 18, 12, 0, TAU, 0, Math.PI * .55), he); helm.position.set(0, 1.46, .025); helm.rotation.x = -.15; helm.castShadow = true; g.add(helm);
  return g; }
function drawLabel(b, sub) { const x = b.lc.getContext('2d'); x.clearRect(0, 0, 256, 96); x.textAlign = 'center'; x.lineJoin = 'round'; x.font = '900 36px Arial'; x.lineWidth = 8; x.strokeStyle = 'rgba(10,14,40,.9)'; x.strokeText(b.d.n, 128, 38); x.fillStyle = b.d.shirt; x.fillText(b.d.n, 128, 38);
  if (sub) { x.font = '900 24px Arial'; x.lineWidth = 6; x.strokeText(sub, 128, 76); x.fillStyle = sub === 'BAIL!' ? '#ff5a6a' : '#ffd23a'; x.fillText(sub, 128, 76); } b.lt.needsUpdate = true; }
function makeRival(d) { const root = new THREE.Group(); scene.add(root); const rG = new THREE.Group(); rG.position.y = RIDE_H; root.add(rG); const rO = new THREE.Group(); rO.position.y = -RIDE_H; rG.add(rO);
  const yG = new THREE.Group(); rO.add(yG); const tG = new THREE.Group(); tG.position.set(0, .36, .02); yG.add(tG); const tO = new THREE.Group(); tO.position.set(0, -.36, -.02); tG.add(tO);
  const pv = pivot.clone(true); tO.add(pv); const bear = pv.getObjectByName('bear'); if (bear) bear.parent.remove(bear);
  const mm = new Map([[scM.deck, new THREE.MeshPhysicalMaterial({ color: d.deck, roughness: .35, metalness: .4, clearcoat: .6 })], [scM.bars, new THREE.MeshPhysicalMaterial({ color: d.bars, roughness: .25, metalness: .8, clearcoat: .5 })], [scM.wheel, new THREE.MeshPhysicalMaterial({ color: d.wheel, roughness: .5 })], [scM.rub, new THREE.MeshStandardMaterial({ color: '#141416', roughness: .95 })]]);
  pv.traverse(o => { if (o.isMesh && mm.has(o.material)) o.material = mm.get(o.material); });
  const body = makeRiderBody(d); yG.add(body);
  const lc = cnv(256, 96), lt = ctex(lc); const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: lt, depthWrite: false, transparent: true, fog: false })); spr.scale.set(1.6, .6, 1); spr.position.y = 2.05; rO.add(spr);
  const b = { d, root, rG, yG, tG, body, deck: pv.children[0], bars: pv.children[1], lc, lt, spr }; drawLabel(b); return b; }
function resetBots() { for (const b of bots) { const d = b.d; Object.assign(b, { x: d.at[0], z: d.at[1], psi: d.at[2], y: H(d.at[0], d.at[1]) ?? 0, u: d.sp, air: false, vx: 0, vy: 0, vz: 0, airT: 0, ps: 0, pitch: 0, auto: 0, autoT: 0, wp: d.wp, plan: [], animT: 1, bailP: false, crash: 0, score: 0, cp: 0, cm: 0, ct: 0, subT: 0, ollT: 0 }); drawLabel(b); } }
function botPlan(b, Tf) { b.plan = []; b.animT = Math.max(.25, Tf * .78); b.bailP = false; if (Tf < .32) return; const sk = b.d.skill, avail = BOT_TR.filter(t => t[2] <= Tf * (.85 + sk * .25)); if (!avail.length) return;
  b.plan.push(avail[Math.min(avail.length - 1, Math.floor(Math.pow(Math.random(), 1.5 - sk) * avail.length))]);
  const p0 = b.plan[0][3]; if (Tf > .85 && Math.random() < sk * .55 && !p0.rb && !p0.rf && !p0.rs) { const p2 = BOT_TR[Math.floor(Math.random() * 4)]; if (!(p2[3].bar && p0.bar) && !(p2[3].whip && p0.whip)) b.plan.push(p2); }
  b.bailP = Math.random() < .1 * (1.2 - sk); }
function botLaunch(b, vy, Tf) { b.air = true; b.airT = 0; b.vy = vy; botPlan(b, Tf); }
function botLand(b) { const sc = RSCALE[park] || 1;
  if (b.bailP) { b.crash = 1.3; b.cp = 0; b.cm = 0; drawLabel(b, 'BAIL!'); b.subT = 1.4; return; }
  const names = []; if (b.auto) { b.cp += 300 + b.airT * 300; b.cm = Math.min(10, b.cm + 1); }
  for (const t of b.plan) { b.cp += t[1]; b.cm = Math.min(10, b.cm + 1); names.push(t[0]); } if (!b.plan.length && b.airT > .3) { b.cp += 100; b.cm = Math.min(10, b.cm + 1); }
  b.ct = 1.6; if (names.length) { drawLabel(b, names.join(' + ')); b.subT = 1.6; } b.plan = []; b.auto = 0; b.sc = sc; }
function botBank(b) { if (b.cp > 0) b.score += Math.round(b.cp * Math.max(1, b.cm) * (RSCALE[park] || 1)); b.cp = 0; b.cm = 0; }
function botStep(b, dt) {
  if (b.subT > 0) { b.subT -= dt; if (b.subT <= 0) drawLabel(b); }
  if (b.crash > 0) { b.crash -= dt; if (b.crash <= 0) b.u = 3; return; }
  if (b.air) { b.airT += dt; b.vy -= G * dt; b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt; b.pitch = lerp(b.pitch, b.auto ? 0 : clamp(b.vy * .04, -.5, .4), Math.min(1, dt * 3));
    const h = H(b.x, b.z) ?? 0; if (b.y <= h && b.vy < 0) { b.y = h; b.air = false; if (b.auto) b.psi += b.auto; botLand(b); } return; }
  const L = LOOPS[b.d.loop], wp = L[b.wp], dx = wp[0] - b.x, dz = wp[1] - b.z, des = Math.atan2(dx, -dz), df = Math.atan2(Math.sin(des - b.psi), Math.cos(des - b.psi)), tr = Math.abs(df) > 1.2 ? 3.1 : 2.2;
  b.psi += clamp(df, -tr * dt, tr * dt); b.u = lerp(b.u, Math.abs(df) > 1.2 ? b.d.sp * .78 : b.d.sp, Math.min(1, dt * 1.5));
  const fx = fwdX(b.psi), fz = fwdZ(b.psi);
  if (wp[2]) { const q = qpAt(b.x, b.z); if (q && q.d <= QDECK + .08) { b.vx = b.vz = 0; const vy = 6 + b.d.skill * 1.6 + rnd(-.4, .4); b.auto = Math.PI; b.autoT = 2 * vy / G * .8; b.wp = (b.wp + 1) % L.length; botLaunch(b, vy, 2 * vy / G); return; } }
  else if (Math.hypot(dx, dz) < 2.2) b.wp = (b.wp + 1) % L.length;
  const s = clamp(slopeAt(b.x, b.z, b.psi), -4, 4), hor = b.u / Math.sqrt(1 + s * s), nx = b.x + fx * hor * dt, nz = b.z + fz * hor * dt;
  const h8 = H(b.x + fx * .8, b.z + fz * .8) ?? b.y, h11 = H(b.x + fx * 1.15, b.z + fz * 1.15) ?? b.y;
  if (Math.abs(s) < .12 && ((h11 - h8 > .18 && h11 > b.y + .2) || h11 < b.y - .4)) { b.vx = fx * hor; b.vz = fz * hor; const vy = h11 < b.y ? 4.2 : 5.2; botLaunch(b, vy, (vy + Math.sqrt(vy * vy + 2 * G * Math.max(0, b.y - Math.min(h11, b.y)))) / G); return; }
  const hn = H(nx, nz) ?? b.y;
  if (hn < b.y - .25 || (b.ps > .28 && s < b.ps * .4 && !qpAt(b.x, b.z))) { b.vx = fx * hor; b.vz = fz * hor; b.x = nx; b.z = nz; const vy = Math.max(0, b.u * b.ps / Math.sqrt(1 + b.ps * b.ps)) * .95, drop = Math.max(0, b.y - (H(nx + fx * 3, nz + fz * 3) ?? 0)); botLaunch(b, vy, (vy + Math.sqrt(vy * vy + 2 * G * drop)) / G); b.ps = 0; return; }
  b.x = nx; b.z = nz; b.y = hn; b.ps = s; b.pitch = lerp(b.pitch, Math.atan(s), Math.min(1, dt * 12));
  if (b.cp > 0) { b.ct -= dt; if (b.ct <= 0) botBank(b); } }
const ease = e => e < .5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2;
function botVisual(b, t) { b.root.visible = true; b.root.position.set(b.x, b.y, b.z); b.root.rotation.order = 'YXZ'; b.root.rotation.y = -b.psi; b.root.rotation.x = b.pitch; b.root.rotation.z = 0;
  let bar = 0, whip = 0, spin = 0, flip = 0, roll = 0, rx = 0, rz = 0;
  if (b.air) { const e = ease(clamp(b.airT / b.animT, 0, b.bailP ? .7 : 1)); for (const tr of b.plan) { const k = tr[3]; bar += (k.bar || 0) * TAU * e; whip += (k.whip || 0) * TAU * e; spin += (k.spin || 0) * Math.PI * e; flip += (k.flip || 0) * TAU * e; roll += (k.roll || 0) * TAU * e; if (k.rf) rx = -TAU * e; if (k.rb) rx = TAU * e; if (k.rs) rz = TAU * e; }
    if (b.auto) spin += b.auto * ease(clamp(b.airT / Math.max(.2, b.autoT), 0, 1)); }
  if (b.crash > 0) { rz = Math.min(1.4, (1.3 - b.crash) * 5); }
  b.rG.rotation.set(rx, 0, rz); b.yG.rotation.y = -spin; b.tG.rotation.set(-flip, 0, roll); b.deck.rotation.y = -whip; b.bars.rotation.y = -bar; }
function standings() { const L = [{ n: T('אתה', 'You'), s: score, me: 1 }, ...bots.map(b => ({ n: b.d.n, s: b.score, c: b.d.shirt }))]; return L.sort((a, b) => b.s - a.s); }
function drawLB() { const L = standings(); $('lb').innerHTML = L.map((r, i) => `<div class="${r.me ? 'me' : ''}"><b>${i + 1}</b><span${r.c ? ` style="color:${r.c}"` : ''}>${r.n}</span><em>${r.s.toLocaleString('en-US')}</em></div>`).join(''); }

/* ================= CAMERA ================= */
const rig = new THREE.Object3D(); let camInit = true, vertK = 0; const cyaw = { v: 0 }, camP = V3(), camL = V3(), qTmp = new THREE.Quaternion();
const angLerp = (a, b, t) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * t; };
function updCam(dt) { const tgt = V3(P.x, P.y, P.z); if (camInit) { rig.position.copy(tgt); cyaw.v = P.psi; camInit = false; }
  rig.position.x = lerp(rig.position.x, tgt.x, Math.min(1, dt * 10)); rig.position.z = lerp(rig.position.z, tgt.z, Math.min(1, dt * 10)); rig.position.y = lerp(rig.position.y, tgt.y, Math.min(1, dt * (P.air ? 4.5 : 10)));
  if (!P.air || !P.auto) cyaw.v = angLerp(cyaw.v, P.psi, Math.min(1, dt * (P.air ? 2 : 4.5)));
  rig.rotation.set(0, -cyaw.v, 0); rig.updateMatrixWorld(); const pt = isPortrait(); const va = P.air && P.auto ? 1 : 0; vertK = lerp(vertK, va, Math.min(1, dt * 2.5)); const back = (pt ? 1.25 : 1.45) + vertK * 2.2, up = (pt ? 1.12 : .95) + vertK * 1.2;
  camP.set(0, up, back).applyMatrix4(rig.matrixWorld); camL.set(0, pt ? .15 : .25, pt ? -4.2 : -4.5).applyMatrix4(rig.matrixWorld); camera.up.set(0, 1, 0);
  if (P.rf && P.rf.a > 0) { // rider flip: the whole world turns around the rider, like in first person
    const pv = V3(P.x, P.y + RIDE_H, P.z), r = P.rf, ax = r.k === 'side' ? V3(-fwdX(P.psi), 0, -fwdZ(P.psi)) : V3(Math.cos(P.psi), 0, Math.sin(P.psi)), ang = r.k === 'front' ? -r.a : r.k === 'back' ? r.a : r.dir * r.a;
    qTmp.setFromAxisAngle(ax, ang); camP.sub(pv).applyQuaternion(qTmp).add(pv); camL.sub(pv).applyQuaternion(qTmp).add(pv); camera.up.applyQuaternion(qTmp); }
  camera.position.copy(camP); camera.lookAt(camL);
  if (shake > 0) { camera.position.x += rnd(-1, 1) * shake * .04; camera.position.y += rnd(-1, 1) * shake * .04; }
  camera.fov = lerp(camera.fov, (pt ? 64 : 50) + clamp(Math.abs(P.u) - 6, 0, 10) * .8, Math.min(1, dt * 3)); camera.updateProjectionMatrix();
  sun.position.set(P.x + 40 * skyU.sd.value.x, 50, P.z + 40 * skyU.sd.value.z); sun.target.position.set(P.x, 0, P.z); }

/* ================= INPUT (two fingers on the scooter) ================= */
const ptrs = new Map(); const keys = {}; const ringB = $('ringB'), ringD = $('ringD'), scr = V3();
function screenOf(obj, off) { scr.copy(off); obj.localToWorld(scr); scr.project(camera); return [(scr.x + 1) / 2 * innerWidth, (1 - scr.y) / 2 * innerHeight]; }
const BARPT = V3(0, .79, 0), DECKPT = V3(0, .03, .3);
function placeRings() { const show = state === 'play' && S.ctl === 'touch'; ringB.hidden = ringD.hidden = !show; if (!show) return; const [bx, by] = screenOf(barG, BARPT), [dx, dy] = screenOf(deckG, DECKPT);
  ringB.style.transform = `translate(${bx - 36}px,${by - 36}px)`; ringD.style.transform = `translate(${dx - 36}px,${dy - 36}px)`; let hb = 0, hd = 0; for (const p of ptrs.values()) { if (p.role === 'bar') hb = 1; else hd = 1; } ringB.classList.toggle('on', !!hb); ringD.classList.toggle('on', !!hd); }
function finger(role) { for (const p of ptrs.values()) if (p.role === role) return p; return null; }
$('stage').addEventListener('pointerdown', e => { if (state !== 'play' || S.ctl !== 'touch') return; A.ac(); const [bx, by] = screenOf(barG, BARPT), [dx, dy] = screenOf(deckG, DECKPT);
  let role = Math.hypot(e.clientX - bx, e.clientY - by) < Math.hypot(e.clientX - dx, e.clientY - dy) ? 'bar' : 'deck'; const others = [...ptrs.values()]; if (others.length === 1 && others[0].role === role) role = role === 'bar' ? 'deck' : 'bar';
  if (others.length >= 2) return; const now = performance.now(); ptrs.set(e.pointerId, { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, h: [[e.clientX, e.clientY, now]], role, fastT: 0, stillT: now }); });
addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const now = performance.now(); p.x = e.clientX; p.y = e.clientY; p.h.push([p.x, p.y, now]); while (p.h.length > 2 && now - p.h[0][2] > 140) p.h.shift(); const v = fvel(p, now); if (!p.pk || v.s > p.pk.s) p.pk = v; });
const up = e => { const p = ptrs.get(e.pointerId); if (p && p.pk && P.air && state === 'play') { p.h = []; p.final = true; touchInput(performance.now(), 0); } ptrs.delete(e.pointerId); }; addEventListener('pointerup', up); addEventListener('pointercancel', up);
function fvel(p, now) { const h = p.h; let j = h.length - 1; if (j < 0) return { x: 0, y: 0, s: 0 }; while (j > 0 && now - h[j - 1][2] <= 80) j--; const a = h[j], b = h[h.length - 1]; if (a === b) return { x: 0, y: 0, s: 0 };
  const dt = Math.max(16, now - a[2]) / 1000, x = (b[0] - a[0]) / dt, y = (b[1] - a[1]) / dt; return { x, y, s: Math.hypot(x, y) }; }
let gLock = false, gPend = 0;
function touchInput(now, dt) { const fb = finger('bar'), fd = finger('deck'); let vb = null, vd = null;
  // use the fastest motion seen since the last frame, so quick flicks are never missed on slow phones
  for (const p of [fb, fd]) if (p) { const cur = fvel(p, now), v = p.pk && p.pk.s > cur.s ? p.pk : cur; p.pk = null; if (p === fb) vb = v; else vd = v; if (v.s > FL) { if (!p.fastT) p.fastT = now; } else p.fastT = 0; if (v.s < 160) { if (!p.stillT) p.stillT = now; } else p.stillT = 0; }
  if (P.air && !P.grind) { gLock = true; airTouch(now, dt, fb, fd, vb, vd); } else groundTouch(now, fb, fd, vb, vd); }
function groundTouch(now, fb, fd, vb, vd) { const fastB = !!vb && vb.s > 600, fastD = !!vd && vd.s > 600;
  if (gLock) { if ((!vb || vb.s < 260) && (!vd || vd.s < 260)) gLock = false; return; }
  if (!fastB && !fastD) { gPend = 0; return; } if (!gPend) gPend = now;
  const both = !!(fb && fd); let dir = null;
  if (both && fastB && fastD) { const vB = Math.abs(vb.y) > Math.abs(vb.x), vD = Math.abs(vd.y) > Math.abs(vd.x);
    if (vB && vD && Math.sign(vb.y) === Math.sign(vd.y)) dir = vb.y < 0 ? 'U' : 'D'; else if (!vB && !vD && Math.sign(vb.x) !== Math.sign(vd.x)) dir = 'O'; else dir = 'X'; }
  else if (!both || now - gPend > 75) { const v = fastB ? vb : vd; dir = Math.abs(v.y) > Math.abs(v.x) * 1.1 ? (v.y < 0 ? 'u' : 'd') : 'X'; }
  if (!dir) return; gLock = true; gPend = 0; const ramp = onRamp();
  if (dir === 'U') { if (P.grind) ollie(); else if (ramp) queueRider('front', 1); else ollie(); }
  else if (dir === 'D') { if (ramp) queueRider('back', 1); else push(); }
  else if (dir === 'O') { if (ramp) queueRider('side', Math.sign(vb.x)); else toggleFakie(); }
  else if (dir === 'u') ollie(); else if (dir === 'd') push(); }
function airTouch(now, dt, fb, fd, vb, vd) { let barV = 0, whipV = 0, flipV = 0, rollV = 0, spinV = 0; const both = !!(vb && vd);
  if (both) { if (Math.sign(vb.y) === Math.sign(vd.y)) flipV = -Math.sign(vb.y) * Math.min(Math.abs(vb.y), Math.abs(vd.y));
    if (Math.sign(vb.x) !== Math.sign(vd.x)) rollV = Math.sign(vb.x) * Math.min(Math.abs(vb.x), Math.abs(vd.x)); else spinV = Math.sign(vb.x) * Math.min(Math.abs(vb.x), Math.abs(vd.x));
    barV = vb.x - rollV - spinV; whipV = vd.x + rollV - spinV; }
  else if (vb) barV = vb.x; else if (vd) whipV = vd.x;
  const fling = (k, v) => { const p = Q[k]; p.auto = null; p.catching = false; p.free = true; const w = clamp(v * K_SW, -WMAX, WMAX); if (Math.sign(w) !== Math.sign(p.w) || Math.abs(w) > Math.abs(p.w)) { if (!p.w) A.noise(.1, 'bandpass', 1100, 1.4, .06, 0, 2600); p.w = w; } };
  const comb = both && vb.s > FL * .75 && vd.s > FL * .75;
  if (comb) { if (Math.abs(flipV) > FL * .55) fling('flip', flipV); if (Math.abs(rollV) > FL * .55) fling('roll', rollV); if (Math.abs(spinV) > FL * .55) fling('spin', spinV); }
  const settled = (me, other) => !other || comb || me.final || (me.fastT && now - me.fastT > 50);
  if (vb && Math.abs(barV) > FL && Math.abs(barV) > Math.abs(vb.y) * .8 && settled(fb, fd)) fling('bar', barV);
  if (vd && Math.abs(whipV) > FL && Math.abs(whipV) > Math.abs(vd.y) * .8 && settled(fd, fb)) fling('whip', whipV);
  // slow finger movement drags the part directly (it follows your finger)
  const drag = (k, v) => { const p = Q[k]; if (p.auto === null && Math.abs(p.w) < 1.5 && Math.abs(v) < FL) p.a += v * K_SW * dt * .8; };
  if (vb) drag('bar', barV); if (vd) drag('whip', whipV); if (both) { drag('flip', flipV); drag('roll', rollV); drag('spin', spinV); }
  const still = p => !!p && !!p.stillT && now - p.stillT > 70;
  Q.bar.catching = still(fb); Q.whip.catching = still(fd); Q.flip.catching = Q.roll.catching = Q.spin.catching = still(fb) && still(fd); }
addEventListener('keydown', e => { const k = e.key; keys[k] = 1; if (state !== 'play') return; if (k === ' ' || k === 'ArrowUp') { e.preventDefault(); if (P.air) trickAuto('flip', 1); else if (onRamp()) queueRider('front', 1); else ollie(); } if (k === 'ArrowDown') { if (P.air) trickAuto('flip', -1); else if (onRamp()) queueRider('back', 1); else push(); }
  if (k === 'z' || k === 'Z') trickAuto('bar', 1); if (k === 'x' || k === 'X') trickAuto('whip', 1); if (k === 'c' || k === 'C') trickAuto('spin', 1); if (k === 'v' || k === 'V') trickAuto('roll', 1); if (k === 'f' || k === 'F') { if (onRamp()) queueRider('side', 1); else toggleFakie(); } if (k === 'Escape') pause(); });
addEventListener('keyup', e => keys[e.key] = 0);
const hold = { L: 0, R: 0 }; for (const [id, k] of [['bL', 'L'], ['bR', 'R']]) { const b = $(id); b.addEventListener('pointerdown', e => { e.stopPropagation(); hold[k] = 1; }); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => hold[k] = 0); }
$('bJ').addEventListener('pointerdown', e => { e.stopPropagation(); A.ac(); if (P.air) trickAuto('flip', -1); else if (onRamp()) queueRider('back', 1); else ollie(); }); $('bP').addEventListener('pointerdown', e => { e.stopPropagation(); push(); });
$('airB').addEventListener('pointerdown', e => { const b = e.target.closest('[data-t]'); if (!b) return; e.stopPropagation(); const t = b.dataset.t; if (t === 'flip') trickAuto('flip', -1); else trickAuto(t, 1); });

/* ================= LOOP ================= */
let last = performance.now(), hudT = 0, airSlow = 1;
function loop(now) { requestAnimationFrame(loop); let dt = Math.min(.04, (now - last) / 1000); last = now; const t = now / 1000; A.tick();
  if (slow > 0) { slow -= dt; dt *= .35; }
  if (state === 'play') { tLeft -= dt; if (tLeft <= 0) { tLeft = 0; finish(); }
    let target = 0; if (S.ctl === 'touch') { touchInput(now, dt); const st = finger(P.fakie ? 'deck' : 'bar') || [...ptrs.values()][0]; if (st && !P.air) target = clamp((st.x - st.x0) / (innerWidth * .16), -1, 1) * BARMAX; } else target = (hold.R - hold.L) * BARMAX;
    if (keys.ArrowLeft || keys.a) target = -BARMAX; if (keys.ArrowRight || keys.d) target = BARMAX; P.bar = lerp(P.bar, target, Math.min(1, dt * 12));
    const tricking = P.air && (P.rf || Object.values(Q).some(q => q.free || q.auto !== null)); airSlow = lerp(airSlow, tricking ? .72 : 1, Math.min(1, dt * 8)); const pdt = dt * airSlow;
    const n = 4; for (let i = 0; i < n; i++) { step(pdt / n); if (S.mode !== 'free') for (const b of bots) botStep(b, pdt / n); }
    hudT += dt; if (hudT > .1) { hudT = 0; updHud(); } $('airB').hidden = S.ctl !== 'btn' || !P.air;
    const rl = A.loop('roll'); if (rl) { rl.fl.frequency.value = 180 + Math.abs(P.u) * 40; rl.g.gain.value = P.air || P.crash || (P.grind && P.grind.kind !== 'beam') ? 0 : .02 + Math.abs(P.u) * .004; } }
  else if (state === 'title') titleCam(t);
  if (state !== 'title') { shake = Math.max(0, shake - dt * 2.5); updCam(dt); }
  P.fy = lerp(P.fy, P.fakie ? Math.PI : 0, Math.min(1, dt * 14));
  SC.position.set(P.x, P.y, P.z); SC.rotation.order = 'YXZ'; SC.rotation.y = -P.psi; SC.rotation.x = P.pitch; SC.rotation.z = -P.bar * clamp(Math.abs(P.u) / 10, 0, 1) * .5;
  riderG.rotation.set(0, 0, 0); if (P.rf) { if (P.rf.k === 'front') riderG.rotation.x = -P.rf.a; else if (P.rf.k === 'back') riderG.rotation.x = P.rf.a; else riderG.rotation.z = P.rf.dir * P.rf.a; }
  yawG.rotation.y = -(Q.spin.a + P.autoA + P.fy); trickG.rotation.set(-Q.flip.a, 0, Q.roll.a); deckG.rotation.y = -Q.whip.a; barG.rotation.y = -((P.fakie ? -1 : 1) * P.bar * 1.5 + Q.bar.a);
  const wr = P.u * dt / .058; if (!P.air) { deckG.userData.w.rotation.x -= wr; barG.userData.w.rotation.x -= wr; }
  if (P.crash) { SC.rotation.z += t * 9; SC.rotation.x += t * 5; }
  for (const b of bots) { if (S.mode === 'free' || state === 'title') b.root.visible = false; else botVisual(b, t); }
  placeRings(); FX.update(dt, -1e9); GLOW.update(dt); for (const l of ledScreens) l(t); E.render(); }
function titleCam(t) { const a = t * .12; Object.assign(P, { x: 0, z: 18, y: H(0, 18), u: 0, air: false, pitch: 0, psi: 0, fakie: false, rf: null, bar: Math.sin(t * .8) * .2 }); resetQ(); camera.up.set(0, 1, 0); const pt = isPortrait(), r = pt ? 2.0 : 1.7;
  camera.position.set(Math.sin(a) * r, (pt ? 1.25 : .9), 18 + Math.cos(a) * r); camera.lookAt(0, pt ? .1 : .4, 18); camera.fov = pt ? 60 : 50; camera.updateProjectionMatrix(); sun.position.set(40 * skyU.sd.value.x, 50, 18 + 40 * skyU.sd.value.z); sun.target.position.set(0, 0, 18); }
/* ================= FLOW / UI ================= */
const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function updHud() { $('scT').textContent = score.toLocaleString('en-US'); $('mX').textContent = '×' + Math.max(1, combo.mult); $('mBar').innerHTML = Array.from({ length: 10 }, (_, i) => `<i class="${i < combo.mult ? 'on' : ''}"></i>`).join(''); $('timeT').textContent = fmt(tLeft); $('timeT').classList.toggle('low', tLeft < 15); $('coinTxt').textContent = S.coins; if (S.mode !== 'free' && state === 'play') drawLB(); }
function start() { A.ac(); park = S.park; if (!parkG || parkG.userData.p !== park) { buildPark(park); applyTime(park); parkG.userData.p = park; } respawn(); resetBots(); score = 0; tLeft = SESSION; combo = { pts: 0, list: [], mult: 0, t: 0 }; runStats = {}; state = 'play'; ptrs.clear(); gLock = false;
  $('title').hidden = true; $('endSheet').hidden = true; $('pauseSheet').hidden = true; $('hud').hidden = false; $('score').hidden = false; $('timeT').hidden = false; $('combo').innerHTML = ''; $('lb').hidden = S.mode === 'free';
  const btn = S.ctl === 'btn'; for (const id of ['bL', 'bR', 'bJ', 'bP']) $(id).hidden = !btn; $('bJ').textContent = T('קפיצה', 'JUMP'); $('bP').textContent = T('דחיפה', 'PUSH');
  S.runs = (S.runs || 0) + 1; S.save(); A.loopOn('roll', 'bandpass', 300, 1.2, .02); A.startMusic({ bpm: 124, chords: [[40, 47, 52], [43, 50, 55], [36, 43, 48], [38, 45, 50]], kick: true, vol: .5, lead: true }); updHud();
  big(S.mode === 'free' ? T('סשן של 2 דקות!', '2 MIN SESSION!') : T('תחרות! 🏆', 'CONTEST! 🏆'), 'g'); }
function finish() { if (state !== 'play') return; if (P.grind) endGrind(false); bankCombo(); for (const b of bots) botBank(b); state = 'done'; A.loopOff('roll'); A.loopOff('grind'); A.stopMusic(); $('lb').hidden = true;
  const comp = S.mode !== 'free', L = comp ? standings() : null, place = comp ? L.findIndex(r => r.me) + 1 : 0;
  const R = PARKS[park], st = R.stars.filter(x => score >= x).length, key = 'p' + park, nb = score > (S.best[key] || 0); if (nb) S.best[key] = score;
  const g = S.goals[key] || [0, 0, 0]; R.goals.forEach(([k, v], i) => { const ok = k === 'score' ? score >= v : k === 'grind' ? (runStats.grind || 0) >= v : k === 'mult' ? (runStats.mult || 0) >= v : !!runStats[k]; if (ok) g[i] = 1; }); S.goals[key] = g;
  const bonus = comp ? [0, 150, 80, 40, 0][place] : 0, coins = Math.round(score / 500) + st * 30 + bonus; S.coins += coins; if (comp && place === 1) S.wins = (S.wins || 0) + 1; S.save();
  A.voice(comp && place > 1 ? 'aww' : 'yay', 1.2);
  for (let i = 0; i < 120; i++) GLOW.emit(V3(P.x + rnd(-3, 3), P.y + rnd(1, 4), P.z + rnd(-3, 3)), V3(rnd(-2, 2), rnd(1, 5), rnd(-2, 2)), CONFETTI[i % 5], rnd(.04, .08), rnd(1, 2), 4, 1, .98);
  $('eS').textContent = comp ? ['', '🥇', '🥈', '🥉', '4️⃣'][place] : '⭐'.repeat(st) + '☆'.repeat(3 - st);
  $('eT').textContent = comp ? (place === 1 ? T('ניצחת בתחרות! 🏆', 'You won the contest! 🏆') : T('מקום ' + place, 'Place ' + place)) : (nb ? T('שיא חדש! 🔥', 'New best! 🔥') : T('הסשן הסתיים!', 'Session over!'));
  $('eRes').textContent = score.toLocaleString('en-US');
  $('eRank').innerHTML = comp ? L.map((r, i) => `<div class="${r.me ? 'me' : ''}"><b>${['🥇', '🥈', '🥉', '4'][i]}</b><span>${r.n}</span><em>${r.s.toLocaleString('en-US')}</em></div>`).join('') : ''; $('eRank').hidden = !comp;
  $('eP').textContent = `🪙 +${coins} · ⭐ ${st}/3 · ${T('יעדים', 'Goals')} ${g.filter(Boolean).length}/3`; setTimeout(() => $('endSheet').hidden = false, 900); }
const totStars = () => Object.values(S.goals).reduce((a, g) => a + g.filter(Boolean).length, 0);
// ---- park map ----
const PINS = [[25, 70], [54, 44], [82, 70]], SOON = [12, 40];
function mapSVG() { const rn = rng(9); let blocks = ''; for (let i = 0; i < 40; i++) { const x = rn() * 400, y = rn() * 200, w = 18 + rn() * 26, h = 12 + rn() * 20; if (PINS.some(([px, py]) => Math.abs(px * 4 - x - w / 2) < 46 && Math.abs(py * 2 - y - h / 2) < 34)) continue; blocks += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" rx="3" fill="${['#e4d9bf', '#d9ccae', '#ece3cc'][i % 3]}" stroke="#c9bb98" stroke-width="1"/>`; }
  let parks = PINS.map(([px, py], i) => `<ellipse cx="${px * 4}" cy="${py * 2 + 6}" rx="40" ry="26" fill="#9ad46e" stroke="#6fb04a" stroke-width="2"/><path d="M${px * 4 - 18} ${py * 2 + 12} q18 -16 36 0" fill="none" stroke="#c4beb4" stroke-width="6" stroke-linecap="round"/>` + [0, 1, 2, 3, 4].map(j => `<circle cx="${px * 4 - 30 + j * 15}" cy="${py * 2 + (j % 2 ? 22 : -8)}" r="5" fill="#4f9a3a"/>`).join('')).join('');
  parks += `<ellipse cx="${SOON[0] * 4}" cy="${SOON[1] * 2 + 6}" rx="34" ry="20" fill="#f6e3a8" stroke="#e0c27a" stroke-width="2"/>`;
  return `<svg viewBox="0 0 400 200" preserveAspectRatio="none"><rect width="400" height="200" fill="#efe6cf"/><path d="M-10 150 C80 120 140 190 230 150 S360 90 410 120 L410 140 C360 112 300 170 230 172 S90 142 -10 172Z" fill="#7cc4ff"/>${blocks}
  <g stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round"><path d="M0 95 H400"/><path d="M150 0 V200"/><path d="M300 0 C290 60 320 120 300 200"/><path d="M0 40 C120 50 260 30 400 45"/></g>
  <g stroke="#f7d36a" stroke-width="1.6" fill="none" stroke-dasharray="6 6"><path d="M0 95 H400"/><path d="M150 0 V200"/></g>${parks}</svg>`; }
function renderMap() { const ts = totStars(); $('map').innerHTML = mapSVG() + PARKS.map((r, i) => { const lk = ts < r.need, g = S.goals['p' + i] || [0, 0, 0], ok = g.filter(Boolean).length;
    return `<button class="pin ${S.park === i ? 'on' : ''} ${lk ? 'lk' : ''}" data-r="${i}" style="left:${PINS[i][0]}%;top:${PINS[i][1]}%;--g:${r.grad}"><i><b>${lk ? '🔒' : '🛴'}</b></i><span>${r.n}</span><small>${lk ? '⭐' + r.need : '⭐'.repeat(ok) + '☆'.repeat(3 - ok)}</small></button>`; }).join('')
    + `<button class="pin lk soon" data-soon="1" style="left:${SOON[0]}%;top:${SOON[1]}%;--g:linear-gradient(180deg,#ffd27a,#ff9a5a)"><i><b>🏖️</b></i><span>${T('פארק החוף', 'Beach Park')}</span><small>${T('בקרוב', 'Soon')}</small></button>`; }
function renderTitle() { const ts = totStars(); $('tStars').textContent = ts; $('tCoins').textContent = S.coins; renderMap();
  const R = PARKS[S.park], g = S.goals['p' + S.park] || [0, 0, 0]; $('goals').innerHTML = `<b class="gt">📍 ${R.n}</b>` + R.goals.map((x, i) => `<span class="${g[i] ? 'ok' : ''}">${g[i] ? '✅' : '⬜'} ${x[2]}</span>`).join('') + `<span>🏆 ${T('שיא', 'Best')}: ${(S.best['p' + S.park] || 0).toLocaleString('en-US')}${S.wins ? ' · 🥇 ' + S.wins : ''}</span>`;
  $('modeRow').innerHTML = `<button data-m="comp" class="${S.mode !== 'free' ? 'on' : ''}">🏆 ${T('תחרות מול רוכבים', 'Contest vs riders')}</button><button data-m="free" class="${S.mode === 'free' ? 'on' : ''}">🛴 ${T('סשן חופשי', 'Free session')}</button>`;
  $('ctlRow').innerHTML = `<button data-c="touch" class="${S.ctl === 'touch' ? 'on' : ''}">✌️ ${T('אצבעות על הקורקינט', 'Fingers on scooter')}</button><button data-c="btn" class="${S.ctl === 'btn' ? 'on' : ''}">🎮 ${T('כפתורים', 'Buttons')}</button>`; $('goBtn').textContent = T('צא לרכיבה! 🛴', 'Ride! 🛴'); }
$('map').onclick = e => { const b = e.target.closest('.pin'); if (!b) return; if (b.dataset.soon) { toast(T('פארק החוף יגיע בקרוב! 🏖️', 'Beach Park is coming soon! 🏖️')); return; } const i = +b.dataset.r; if (totStars() < PARKS[i].need) { toast(T('צריך עוד כוכבים ⭐', 'Need more stars ⭐') + ' (' + PARKS[i].need + ')'); return; } if (S.park === i) return; S.park = i; S.save(); A.tone(700, .05, 'triangle', .04); buildPark(i); applyTime(i); parkG.userData.p = i; renderTitle(); };
$('modeRow').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; S.mode = b.dataset.m; S.save(); A.tone(620, .04, 'triangle', .04); renderTitle(); };
$('ctlRow').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; S.ctl = b.dataset.c; S.save(); renderTitle(); };
function showTitle() { state = 'title'; A.stopMusic(); A.loopOff('roll'); A.loopOff('grind'); $('title').hidden = false; for (const id of ['hud', 'score', 'timeT', 'endSheet', 'pauseSheet', 'cue', 'lb', 'bL', 'bR', 'bJ', 'bP', 'airB']) $(id).hidden = true; $('combo').innerHTML = ''; $('big').innerHTML = ''; resetQ(); P.crash = 0; P.rf = null; renderTitle(); }
function renderShop() { $('shopCoins').textContent = S.coins; $('skins').innerHTML = [0, 1, 2].map(tr => `<div class="tier t${tr}">${TIERS[tr]}</div>` + SKINS.map((s, i) => s.tier !== tr ? '' : `<button class="sk ${S.skin === i ? 'on' : ''}" data-k="${i}"><canvas data-c="${i}" width="144" height="112"></canvas><b>${s.n}</b><small>${S.owned.includes(i) ? (S.skin === i ? T('נבחר ✔', 'Selected ✔') : T('בחרו', 'Select')) : '🪙 ' + s.p}</small></button>`).join('')).join('');
  $('skins').querySelectorAll('canvas').forEach(cv => { const s = SKINS[+cv.dataset.c], x = cv.getContext('2d'); x.lineCap = 'round'; x.strokeStyle = s.bars; x.lineWidth = 7; x.beginPath(); x.moveTo(40, 92); x.lineTo(40, 16); x.moveTo(16, 16); x.lineTo(64, 16); x.stroke(); x.strokeStyle = s.grip; x.lineWidth = 9; x.beginPath(); x.moveTo(14, 16); x.lineTo(24, 16); x.moveTo(56, 16); x.lineTo(66, 16); x.stroke(); x.fillStyle = s.deck; x.fillRect(36, 84, 90, 12); x.fillStyle = s.wheel; for (const wx of [40, 122]) { x.beginPath(); x.arc(wx, 100, 9, 0, TAU); x.fill(); } x.fillStyle = '#9a7ae8'; x.beginPath(); x.arc(92, 74, 9, 0, TAU); x.fill(); x.beginPath(); x.arc(92, 62, 7, 0, TAU); x.fill(); }); }
$('skins').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; const i = +b.dataset.k, s = SKINS[i]; if (!S.owned.includes(i)) { if (S.coins < s.p) { toast(T('צריך עוד מטבעות 🪙', 'Need more coins 🪙')); return; } S.coins -= s.p; S.owned.push(i); A.voice('yay', 1.3); } S.skin = i; S.save(); paintScooter(i); renderShop(); renderTitle(); };
$('goBtn').onclick = () => start(); $('shopBtn').onclick = () => { A.ac(); renderShop(); $('shopSheet').hidden = false; }; $('shopClose').onclick = () => $('shopSheet').hidden = true;
$('eAgain').onclick = () => start(); $('eMenu').onclick = () => showTitle();
function pause() { if (state !== 'play') return; state = 'pause'; $('pauseSheet').hidden = false; A.loopOff('roll'); A.loopOff('grind'); A.stopMusic(); }
$('pauseBtn').onclick = pause; $('pGo').onclick = () => { $('pauseSheet').hidden = true; state = 'play'; last = performance.now(); ptrs.clear(); A.loopOn('roll', 'bandpass', 300, 1.2, .02); A.startMusic(); }; $('pMenu').onclick = () => showTitle(); $('pRe').onclick = () => start();
$('pauseBtn').innerHTML = ICO.pause('#ffffff'); $('homeT').innerHTML = ICO.home('#ffffff'); soundButton('sndBtn', S, A, '#1a2a5a'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('shopBtn').textContent = T('🛴 שוק הקורקינטים', '🛴 Scooter Market'); $('shopT').textContent = T('שוק הקורקינטים', 'Scooter Market'); $('shopClose').textContent = T('סגירה', 'Close'); $('eAgain').textContent = T('עוד סשן! 🛴', 'Ride again! 🛴'); $('eMenu').textContent = T('תפריט', 'Menu'); $('pT').textContent = T('הפסקה', 'Paused'); $('pGo').textContent = T('המשך ▶', 'Resume ▶'); $('pMenu').textContent = T('תפריט', 'Menu'); $('pRe').textContent = T('מההתחלה', 'Restart');
const AIRL = { bar: T('ברספין', 'BARSPIN'), whip: T('וויפ', 'WHIP'), spin: '360', flip: T('סלטה', 'FLIP') }; $('airB').querySelectorAll('button').forEach(b => b.textContent = AIRL[b.dataset.t]);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
park = S.park || 0; paintScooter(S.skin); buildPark(park); applyTime(park); parkG.userData.p = park;
setTimeout(() => { E.resize(); showTitle(); $('loading').hidden = true; requestAnimationFrame(loop); window.__scOK = true; }, 30);
for (const d of RIV) bots.push(makeRival(d)); resetBots();
window.__sc = { P, Q, bots, botStep, ptrs, get state() { return state; }, set state(v) { state = v; }, get score() { return score; }, get combo() { return combo; }, start, step, trickAuto, ollie, push, queueRider, toggleFakie, onRamp, catchPart, updParts, standings, park: () => park, H, RAILS, FEAT, finish, S, bankCombo, respawn, updCam, slopeAt,
  set tLeft(v) { tLeft = v; }, sim(sec, f) { for (let i = 0; i < sec * 60; i++) { f && f(i); for (let j = 0; j < 4; j++) step(1 / 240); } } };
