import { THREE, $, V3, C, clamp, lerp, rnd, T, store, engine, studioEnv, std, shadowAll, cnv, ctex, particles, audio, toast, ICO, hubButtons, soundButton, qualityButton } from '../lib/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ================= save / engine ================= */
const S = store('cub-save', { coins: 0, stars: {}, hat: 'chef', hats: ['chef'], tut: {}, cooked: 0 });
if (!S.stars || typeof S.stars !== 'object') S.stars = {}; if (!Array.isArray(S.hats)) S.hats = ['chef']; if (!S.tut || typeof S.tut !== 'object') S.tut = {};
const E = engine(S, { fov: 36, bloom: [.16, .5, 1.25], exposure: 1.02, bg: '#f3e3cf', preserve: true, vignette: .24, sat: 1.06 });
const { scene, camera, renderer } = E;
studioEnv(E, '#fff3e2', '#b89070', .42, [[-4, 5, 4, 6, 4, 2.2], [4, 4, 3, 4, 4, 1.4], [0, 6.9, 0, 10, 10, 1], [0, 2, -6, 6, 3, 1.6]]);
const A = audio(S); const FX = particles(E, 1600);
const TAU = Math.PI * 2;
const ease = p => { p = clamp(p, 0, 1); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
const eOut = p => 1 - Math.pow(1 - clamp(p, 0, 1), 3);
const pick = a => a[Math.floor(Math.random() * a.length)];
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };
const rgb = h => { const c = C(h); return [c.r, c.g, c.b]; };
const phys = (c, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color: C(c), roughness: .5 }, o));

/* ================= textures ================= */
function noiseCanvas(N, oct, fn) { const c = cnv(N, N), g = c.getContext('2d'), id = g.createImageData(N, N), h = new Float32Array(N * N);
  for (let o = 0; o < oct; o++) { const f = 4 << o, a = 1 / (1 << o), grid = []; for (let i = 0; i < f * f; i++) grid.push(Math.random());
    const G = (i, j) => grid[((j % f + f) % f) * f + ((i % f + f) % f)];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const gx = x / N * f, gy = y / N * f, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      h[y * N + x] += a * lerp(lerp(G(x0, y0), G(x0 + 1, y0), sx), lerp(G(x0, y0 + 1), G(x0 + 1, y0 + 1), sx), sy); } }
  let mn = 1e9, mx = -1e9; for (const v of h) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
  for (let i = 0; i < N * N; i++) { const [r, gg, b, al] = fn((h[i] - mn) / (mx - mn), i % N, Math.floor(i / N)); id.data[i * 4] = r; id.data[i * 4 + 1] = gg; id.data[i * 4 + 2] = b; id.data[i * 4 + 3] = al ?? 255; }
  g.putImageData(id, 0, 0); return c; }
function woodCanvas(w = 512, h = 512, base = [196, 140, 88], strips = 7) { const c = cnv(w, h), g = c.getContext('2d');
  for (let s = 0; s < strips; s++) { const x0 = s * w / strips, k = rnd(.86, 1.1); g.fillStyle = `rgb(${base[0] * k | 0},${base[1] * k | 0},${base[2] * k | 0})`; g.fillRect(x0, 0, w / strips + 1, h);
    for (let i = 0; i < 26; i++) { const xx = x0 + Math.random() * w / strips; g.strokeStyle = `rgba(${Math.random() < .5 ? '90,50,20' : '255,230,190'},${rnd(.05, .18)})`; g.lineWidth = rnd(.6, 2.2); g.beginPath(); g.moveTo(xx, 0);
      for (let y = 0; y <= h; y += 16) g.lineTo(xx + Math.sin(y * .02 + i) * 3, y); g.stroke(); }
    g.fillStyle = 'rgba(70,35,10,.35)'; g.fillRect(x0, 0, 1.5, h); }
  return c; }
function tileCanvas() { const c = cnv(512, 512), g = c.getContext('2d'); g.fillStyle = '#d8cfc4'; g.fillRect(0, 0, 512, 512);
  for (let r = 0; r < 8; r++) for (let k = -1; k < 5; k++) { const x = k * 128 + (r % 2) * 64, y = r * 64; const gr = g.createLinearGradient(0, y, 0, y + 64); gr.addColorStop(0, '#fffdf8'); gr.addColorStop(1, '#efe6da'); g.fillStyle = gr; g.beginPath(); g.roundRect(x + 3, y + 3, 122, 58, 6); g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x + 10, y + 7, 60, 3); }
  return c; }
const furC = noiseCanvas(128, 5, v => { const k = 150 + v * 105; return [k, k, k]; });
const FURB = ctex(furC, 3, 3, false);
const MOTTLE = ctex(noiseCanvas(256, 5, v => { const k = 255 - Math.pow(v, 2.2) * 150; return [k, k * .93, k * .85]; }), 1, 1);
const MEATN = ctex(noiseCanvas(128, 5, v => { const k = 200 + v * 55; return [k, k * .9, k * .85]; }), 2, 2);
function capCanvas(kind) { const c = cnv(128, 128), g = c.getContext('2d'), m = 64; const circ = (r, col) => { g.fillStyle = col; g.beginPath(); g.arc(m, m, r, 0, TAU); g.fill(); };
  if (kind === 'tomato') { circ(64, '#c81e14'); circ(58, '#f2533e'); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .4; g.save(); g.translate(m + Math.cos(a) * 30, m + Math.sin(a) * 30); g.rotate(a); g.fillStyle = '#f4a048'; g.beginPath(); g.ellipse(0, 0, 20, 13, 0, 0, TAU); g.fill();
      g.fillStyle = '#f8e6a0'; for (let s = 0; s < 6; s++) { g.beginPath(); g.ellipse(rnd(-12, 12), rnd(-6, 6), 3, 2, rnd(0, 3), 0, TAU); g.fill(); } g.restore(); }
    g.strokeStyle = 'rgba(255,200,180,.7)'; g.lineWidth = 5; for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .4 + Math.PI / 4; g.beginPath(); g.moveTo(m, m); g.lineTo(m + Math.cos(a) * 56, m + Math.sin(a) * 56); g.stroke(); } circ(10, '#f6b0a0'); }
  if (kind === 'cucumber') { circ(64, '#2f6a1c'); circ(58, '#cfe8a0'); circ(46, '#e2f2c0'); g.fillStyle = 'rgba(255,255,240,.9)'; for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; g.save(); g.translate(m + Math.cos(a) * 16, m + Math.sin(a) * 16); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 16, 10, 0, 0, TAU); g.fill();
      g.fillStyle = '#f8f4d8'; for (let s = 0; s < 4; s++) { g.beginPath(); g.ellipse(rnd(-9, 9), rnd(-4, 4), 4, 2.2, 0, 0, TAU); g.fill(); } g.fillStyle = 'rgba(255,255,240,.9)'; g.restore(); } }
  if (kind === 'carrot') { circ(64, '#e86a10'); circ(58, '#f68a24'); circ(30, '#f8a848'); g.strokeStyle = 'rgba(255,220,160,.35)'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; g.beginPath(); g.moveTo(m + Math.cos(a) * 30, m + Math.sin(a) * 30); g.lineTo(m + Math.cos(a) * 56, m + Math.sin(a) * 56); g.stroke(); } }
  if (kind === 'sausage') { circ(64, '#8a3a1e'); circ(58, '#d8806a'); for (let i = 0; i < 40; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(255,230,220,.8)' : 'rgba(150,40,30,.5)'; g.beginPath(); g.arc(m + rnd(-48, 48), m + rnd(-48, 48), rnd(1.5, 4), 0, TAU); g.fill(); } g.globalCompositeOperation = 'destination-in'; circ(64, '#000'); g.globalCompositeOperation = 'source-over'; }
  return c; }
const CAPT = {}; const capTex = k => CAPT[k] || (CAPT[k] = ctex(capCanvas(k)));

/* ================= data ================= */
const FOOD = {
  tomato: { e: '🍅', n: T('עגבנייה', 'Tomato'), len: .19, prof: x => Math.sqrt(Math.max(0, 1 - x * x)) * .092 + .004, skin: phys('#d4281a', { roughness: .25, clearcoat: .8, clearcoatRoughness: .2 }) },
  cucumber: { e: '🥒', n: T('מלפפון', 'Cucumber'), len: .34, prof: x => .042 * (1 - Math.pow(Math.abs(x), 6) * .7), skin: std('#2f6a1c', { roughness: .45 }) },
  carrot: { e: '🥕', n: T('גזר', 'Carrot'), len: .34, prof: x => .045 * clamp(1 - (x + 1) * .42, .1, 1) * (x > .9 ? (1 - (x - .9) * 6) : 1) + .006, skin: std('#ee7414', { roughness: .55 }) },
  sausage: { e: '🌭', n: T('נקניק', 'Sausage'), len: .3, prof: x => .032 * Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(x), 8))) + .002, skin: phys('#a84a2a', { roughness: .35, clearcoat: .6 }) },
};
const HATS = { chef: { e: '👨‍🍳', n: T('כובע שף', 'Chef hat'), p: 0 }, bow: { e: '🎀', n: T('פפיון', 'Bow'), p: 30 }, flower: { e: '🌼', n: T('פרח', 'Flower'), p: 40 }, cap: { e: '🧢', n: T('כובע מצחייה', 'Cap'), p: 50 }, crown: { e: '👑', n: T('כתר', 'Crown'), p: 70 }, party: { e: '🥳', n: T('כובע מסיבה', 'Party hat'), p: 90 } };
const BEARTALK = {
  hi: [T('אני כל כך רעב! 🍯', 'I’m sooo hungry! 🍯'), T('מה נבשל היום? 😋', 'What are we cooking today? 😋'), T('יאמי! אפשר לטעום? 🐻', 'Yummy! Can I taste? 🐻')],
  step: [T('וואו! 🤩', 'Wow! 🤩'), T('יפה מאוד! 👏', 'Great job! 👏'), T('מריח מדהים! 😋', 'Smells amazing! 😋'), T('אתם שפים! ⭐', 'You’re a chef! ⭐'), T('ממממ! 💛', 'Mmmm! 💛')],
  y3: [T('הכי טעים בעולם!! 😍', 'Best thing ever!! 😍'), T('אני אוהב אתכם! 💖', 'I love you! 💖'), T('עוד! עוד! 🤩', 'More! More! 🤩')],
  y2: [T('טעים מאוד! 😊', 'Very tasty! 😊'), T('יאמי! תודה! 🐻', 'Yummy! Thank you! 🐻')],
  y1: [T('טעים… אבל אפשר עוד יותר טוב 🙂', 'Tasty… but it can be even better 🙂'), T('לא רע! 😌', 'Not bad! 😌')],
};

/* ================= kitchen scene ================= */
const hemi = new THREE.HemisphereLight('#fff4e2', '#a07850', .55); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffe4c4', 2.3); sun.position.set(-1.6, 4.2, 2.4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -1.8, right: 1.8, top: 1.8, bottom: -1.8, near: .5, far: 10 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .02; sun.shadow.radius = 4; scene.add(sun);
const rim = new THREE.DirectionalLight('#ffd49a', 1.5); rim.position.set(.6, 2, -4); scene.add(rim);
const warm = new THREE.PointLight('#ffb870', .0, 3, 2); scene.add(warm);

const K = new THREE.Group(); scene.add(K);
const counterM = std('#ffffff', { map: ctex(woodCanvas(1024, 512, [206, 150, 96], 9), 1, 1), roughness: .55 });
const counter = new THREE.Mesh(new RoundedBoxGeometry(3.6, .1, 2.6, 4, .03), counterM); counter.position.set(0, -.05, -.35); counter.receiveShadow = true; K.add(counter);
const front = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, .1), std('#6e8a7a', { roughness: .7 })); front.position.set(0, -.66, .9); K.add(front);
// back wall with tiles + window
const wallM = std('#f4e4cc', { roughness: .95 });
const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), wallM); wall.position.set(0, 1.4, -2.3); K.add(wall);
const tiles = new THREE.Mesh(new THREE.PlaneGeometry(8, .9), std('#ffffff', { map: ctex(tileCanvas(), 6, 1.4), roughness: .25 })); tiles.position.set(0, .45, -2.29); K.add(tiles);
const winSky = (() => { const c = cnv(256, 256), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#9fd0f0'); gr.addColorStop(.6, '#ffe8c8'); gr.addColorStop(1, '#ffd0a0'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(255,255,255,.85)'; for (const [x, y, r] of [[60, 70, 22], [84, 62, 28], [110, 72, 20], [180, 110, 16], [198, 104, 22], [216, 112, 15]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  g.fillStyle = '#8ac070'; g.beginPath(); g.moveTo(0, 256); for (let x = 0; x <= 256; x += 8) g.lineTo(x, 200 + Math.sin(x * .03) * 14 + Math.sin(x * .11) * 5); g.lineTo(256, 256); g.fill();
  g.fillStyle = '#6aa858'; for (let i = 0; i < 9; i++) { const x = rnd(0, 256); g.beginPath(); g.arc(x, rnd(190, 215), rnd(10, 22), 0, TAU); g.fill(); } return c; })();
const win = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.05), new THREE.MeshBasicMaterial({ map: ctex(winSky), toneMapped: false })); win.position.set(0, 1.55, -2.28); K.add(win);
const frameM = std('#fffaf2', { roughness: .6 });
for (const [w, h, x, y] of [[1.62, .07, 0, 2.1], [1.62, .09, 0, 1.0], [.07, 1.12, -.78, 1.55], [.07, 1.12, .78, 1.55], [.04, 1.05, 0, 1.55], [1.5, .04, 0, 1.6]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, .06), frameM); b.position.set(x, y, -2.25); K.add(b); }
const sill = new THREE.Mesh(new RoundedBoxGeometry(1.8, .05, .22, 3, .015), frameM); sill.position.set(0, .98, -2.17); K.add(sill);
// curtains
const curtM = std('#f6b8a0', { roughness: .9, side: THREE.DoubleSide });
for (const s of [-1, 1]) { const g = new THREE.PlaneGeometry(.55, 1.4, 24, 4); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 34) * .025); g.computeVertexNormals(); const m = new THREE.Mesh(g, curtM); m.position.set(s * 1.02, 1.45, -2.18); K.add(m); }
const rod = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, 2.7, 10), std('#b08050', { metalness: .4, roughness: .4 })); rod.rotation.z = Math.PI / 2; rod.position.set(0, 2.17, -2.16); K.add(rod);
// fairy lights
const bulbs = []; for (let i = 0; i < 15; i++) { const x = -1.3 + i / 14 * 2.6, y = 2.25 - Math.sin(i / 14 * Math.PI) * .12 - (i % 2) * .01; const b = new THREE.Mesh(new THREE.SphereGeometry(.018, 10, 8), new THREE.MeshBasicMaterial({ color: C(pick(['#ffd27a', '#ffb0a0', '#fff0b0'])).multiplyScalar(2.2), toneMapped: false })); b.position.set(x, y, -2.14); K.add(b); bulbs.push(b); }
// window-sill plants & jars
function pot(x, z, s = 1, y = 1.005) { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(.07 * s, .055 * s, .12 * s, 18), std(pick(['#e8805a', '#f0e0c8', '#8ab0c8']), { roughness: .6 })); p.position.y = .06 * s; g.add(p);
  const lm = std('#4a9a48', { roughness: .6, side: THREE.DoubleSide }); for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.05 * s, 10, 8), lm); l.scale.set(.45, 1.3, .12); const a = i / 9 * TAU; l.position.set(Math.cos(a) * .03 * s, .16 * s + Math.random() * .04 * s, Math.sin(a) * .03 * s); l.rotation.set(Math.sin(a) * .6, a, Math.cos(a) * .6); g.add(l); }
  g.position.set(x, y, z); K.add(shadowAll(g)); return g; }
pot(-.6, -2.15); pot(.55, -2.15, .85); pot(-1.45, -1.35, 1.6, 0);
function jar(x, z, col, h = .2) { const g = new THREE.Group(); const gl = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, h, 22), phys('#ffffff', { transmission: .9, roughness: .05, thickness: .02, transparent: true, opacity: .5 })); gl.position.y = h / 2; g.add(gl);
  const ct = new THREE.Mesh(new THREE.CylinderGeometry(.058, .058, h * .7, 18), std(col, { roughness: .8 })); ct.position.y = h * .36; g.add(ct); const lid = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .03, 22), std('#c89060', { roughness: .5 })); lid.position.y = h + .015; g.add(lid); g.position.set(x, 0, z); K.add(shadowAll(g)); }
jar(1.35, -1.55, '#f2e8d4'); jar(1.5, -1.3, '#d08a3a', .16); jar(1.2, -1.75, '#7a4a2a', .24);
// honey pot (bear's favourite) on the back counter
const crock = new THREE.Group(); { const b = new THREE.Mesh(new THREE.SphereGeometry(.1, 24, 18), phys('#f0b030', { roughness: .2, clearcoat: 1 })); b.scale.y = .9; b.position.y = .09; crock.add(b); const r = new THREE.Mesh(new THREE.TorusGeometry(.065, .012, 8, 22), std('#c8801a')); r.rotation.x = Math.PI / 2; r.position.y = .17; crock.add(r);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .2, 8), std('#b07840')); st.position.set(.02, .22, 0); st.rotation.z = -.3; crock.add(st); crock.position.set(-1.2, 0, -1.65); K.add(shadowAll(crock)); }
shadowAll(K, false, true); counter.castShadow = false;

/* ================= bear ================= */
const furM = phys('#a5683a', { roughness: .92, sheen: 1, sheenColor: C('#ffd2a0'), sheenRoughness: .5, bumpMap: FURB, bumpScale: 1.4 });
const lightM = phys('#f1d2a6', { roughness: .9, sheen: .8, sheenColor: C('#fff0d8'), bumpMap: FURB, bumpScale: .8 });
const darkM = phys('#1c120c', { roughness: .15, clearcoat: 1 });
const B = { g: new THREE.Group(), mood: 'idle', look: V3(0, 0, .2), t: 0, clap: 0, eat: 0, jump: 0, chew: 0, lean: 0 };
(() => { const g = B.g; const body = new THREE.Mesh(new THREE.SphereGeometry(.36, 40, 30), furM); body.scale.set(1, 1.05, .88); body.position.y = .04; g.add(body); B.body = body;
  const belly = new THREE.Mesh(new THREE.SphereGeometry(.25, 32, 24), lightM); belly.scale.set(1, 1.1, .6); belly.position.set(0, .02, .2); g.add(belly);
  // bib
  const bib = new THREE.Mesh(new THREE.SphereGeometry(.3, 32, 16, -1.1, 2.2, .35, .75), std('#ffffff', { roughness: .8, side: THREE.DoubleSide })); bib.position.set(0, .05, .02); bib.scale.set(1.02, 1.05, 1); g.add(bib);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(.2, .012, 8, 40, Math.PI * .9), std('#e8442a')); trim.rotation.set(-1.5, 0, Math.PI * 1.05); trim.position.set(0, .3, .1); g.add(trim);
  const head = new THREE.Group(); head.position.y = .55; g.add(head); B.head = head;
  const sk = new THREE.Mesh(new THREE.SphereGeometry(.29, 44, 34), furM); sk.scale.set(1.1, .96, 1); head.add(sk);
  const mz = new THREE.Mesh(new THREE.SphereGeometry(.14, 32, 24), lightM); mz.scale.set(1.2, .82, .9); mz.position.set(0, -.08, .23); head.add(mz);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.048, 24, 16), darkM); nose.scale.set(1.35, .85, .9); nose.position.set(0, -.025, .355); head.add(nose);
  const hl = new THREE.Mesh(new THREE.SphereGeometry(.012, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); hl.position.set(-.015, -.005, .395); head.add(hl);
  const mouthM = std('#4a1a1a', { roughness: .5 });
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(.05, 20, 12, 0, TAU, Math.PI / 2, Math.PI / 2), mouthM); mouth.scale.set(1.2, 0, .5); mouth.position.set(0, -.115, .33); head.add(mouth); B.mouth = mouth;
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 8), std('#ff7a8a')); tongue.scale.set(1.2, .5, .8); tongue.position.set(0, -.16, .33); tongue.visible = false; head.add(tongue); B.tongue = tongue;
  const smile = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V3(-.05, 0, 0), V3(0, -.035, .01), V3(.05, 0, 0)), 12, .007, 6), darkM); smile.position.set(0, -.095, .345); head.add(smile); B.smile = smile;
  const line = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .05, 6), darkM); line.position.set(0, -.07, .35); head.add(line);
  B.eyes = []; B.happyEyes = [];
  for (const s of [-1, 1]) { const e = new THREE.Group(); e.position.set(s * .105, .045, .255); const ball = new THREE.Mesh(new THREE.SphereGeometry(.042, 24, 18), darkM); ball.scale.set(.9, 1.1, .6); e.add(ball);
    const h1 = new THREE.Mesh(new THREE.SphereGeometry(.013, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); h1.position.set(.012, .018, .025); e.add(h1); const h2 = h1.clone(); h2.scale.setScalar(.5); h2.position.set(-.01, -.012, .026); e.add(h2);
    head.add(e); B.eyes.push(e);
    const he = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V3(-.035, 0, 0), V3(0, .04, .01), V3(.035, 0, 0)), 12, .009, 6), darkM); he.position.set(s * .105, .035, .27); he.visible = false; head.add(he); B.happyEyes.push(he);
    const ch = new THREE.Mesh(new THREE.CircleGeometry(.045, 20), new THREE.MeshBasicMaterial({ color: '#ff8a8a', transparent: true, opacity: .45, depthWrite: false })); ch.position.set(s * .19, -.07, .235); ch.lookAt(s * .5, -.1, .9); head.add(ch);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(.1, 24, 18), furM); ear.scale.set(1, 1, .55); ear.position.set(s * .22, .22, -.03); head.add(ear);
    const ei = new THREE.Mesh(new THREE.SphereGeometry(.06, 18, 12), lightM); ei.scale.set(1, 1, .4); ei.position.set(s * .222, .215, .015); head.add(ei); }
  B.arms = []; for (const s of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(s * .27, .16, .1); const a = new THREE.Mesh(new THREE.CapsuleGeometry(.075, .2, 6, 16), furM); a.position.y = -.14; sh.add(a);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(.085, 20, 14), furM); paw.position.y = -.28; paw.scale.set(1, .9, 1); sh.add(paw); const pad = new THREE.Mesh(new THREE.SphereGeometry(.05, 14, 10), lightM); pad.scale.set(1, 1, .4); pad.position.set(0, -.3, .07); sh.add(pad);
    sh.rotation.x = -1.0; sh.rotation.z = s * .25; g.add(sh); B.arms.push(sh); }
  B.hat = new THREE.Group(); B.hat.position.y = .25; head.add(B.hat);
  shadowAll(g, true, false); head.children.forEach(c => { if (c !== sk) c.castShadow = false; }); g.position.set(0, -.02, -.88); scene.add(g); })();
function setHat(k) { B.hat.clear(); const h = B.hat; const w = std('#ffffff', { roughness: .75 });
  if (k === 'chef') { const band = new THREE.Mesh(new THREE.CylinderGeometry(.17, .18, .1, 30), w); band.position.y = .02; h.add(band); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; const p = new THREE.Mesh(new THREE.SphereGeometry(.1, 18, 14), w); p.position.set(Math.cos(a) * .1, .14, Math.sin(a) * .1); h.add(p); } const tp = new THREE.Mesh(new THREE.SphereGeometry(.13, 20, 14), w); tp.position.y = .17; h.add(tp); }
  if (k === 'bow') { const m = std('#ff5a9a', { roughness: .4 }); for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(.08, 18, 12), m); l.scale.set(1.2, .8, .45); l.position.set(s * .08, .01, .02); l.rotation.z = s * .3; h.add(l); } const c = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 10), m); c.position.y = .01; h.add(c); h.children.forEach(o => o.position.x += .13); }
  if (k === 'flower') { const pm = std('#fff4a0', { roughness: .5 }); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const p = new THREE.Mesh(new THREE.SphereGeometry(.04, 12, 8), pm); p.scale.set(1, .4, .6); p.position.set(.14 + Math.cos(a) * .045, .0, Math.sin(a) * .045); h.add(p); } const c = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 8), std('#ff9a2a')); c.position.set(.14, .01, 0); h.add(c); h.rotation.z = -.4; }
  if (k === 'cap') { const m = std('#3a8aff', { roughness: .6 }); const c = new THREE.Mesh(new THREE.SphereGeometry(.24, 28, 16, 0, TAU, 0, Math.PI / 2), m); c.scale.y = .6; c.position.y = -.05; h.add(c); const v = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .015, 24, 1, false, -Math.PI / 2, Math.PI), m); v.position.set(0, -.04, .2); h.add(v); }
  if (k === 'crown') { const m = phys('#ffc830', { metalness: .9, roughness: .25 }); const r = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .07, 30, 1, true), Object.assign(m, { side: THREE.DoubleSide })); r.position.y = .0; h.add(r); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const s = new THREE.Mesh(new THREE.ConeGeometry(.03, .08, 10), m); s.position.set(Math.cos(a) * .13, .07, Math.sin(a) * .13); h.add(s); const gm = new THREE.Mesh(new THREE.SphereGeometry(.014, 8, 6), std(pick(['#ff3a5a', '#3aa8ff', '#5ad86a']), { roughness: .1 })); gm.position.set(Math.cos(a) * .135, .0, Math.sin(a) * .135); h.add(gm); } }
  if (k === 'party') { const c = cnv(128, 128), g = c.getContext('2d'); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ff5a9a' : '#ffd23a'; g.fillRect(0, i * 16, 128, 16); } const cone = new THREE.Mesh(new THREE.ConeGeometry(.1, .26, 28), std('#ffffff', { map: ctex(c) })); cone.position.y = .12; h.add(cone); const pom = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 10), std('#3aa8ff')); pom.position.y = .26; h.add(pom); h.rotation.z = .2; }
  shadowAll(h, true, false); }
setHat(S.hat);
function bearMood(m, dur = 0) { B.mood = m; B.moodT = dur; const happy = m === 'love' || m === 'yum';
  B.eyes.forEach(e => e.visible = !happy); B.happyEyes.forEach(e => e.visible = happy); B.tongue.visible = m === 'love'; }
function bearTick(t, dt) { B.t += dt; const g = B.g, h = B.head; if (B.moodT > 0) { B.moodT -= dt; if (B.moodT <= 0) bearMood('idle'); }
  const m = B.mood; const bob = Math.sin(t * 1.7) * .006;
  // head look
  const lp = B.look.clone(); const hp = h.getWorldPosition(V3()); const dx = lp.x - hp.x, dz = lp.z - hp.z, dy = lp.y - hp.y; const yaw = clamp(Math.atan2(dx, dz), -.7, .7), pitch = clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -.15, .55);
  h.rotation.y = lerp(h.rotation.y, m === 'love' ? Math.sin(t * 7) * .25 : yaw, dt * 5); h.rotation.x = lerp(h.rotation.x, m === 'eat' ? .45 + Math.sin(t * 9) * .05 : pitch * .8, dt * 5); h.rotation.z = lerp(h.rotation.z, m === 'love' ? Math.sin(t * 7) * .12 : m === 'think' ? .18 : Math.sin(t * .8) * .04, dt * 4);
  // jump / lean
  const jumpy = m === 'love' || m === 'cheer'; B.jump = jumpy ? B.jump + dt : 0; g.position.y = -.02 + bob + (jumpy ? Math.abs(Math.sin(B.jump * 7)) * .09 : 0);
  B.lean = lerp(B.lean, m === 'eat' ? .3 : m === 'watch' ? .12 : 0, dt * 4); g.rotation.x = B.lean; g.position.z = -.88 + B.lean * .4;
  // mouth
  let mo = 0; if (m === 'eat') { B.chew += dt * 9; mo = Math.max(0, Math.sin(B.chew)) * .9; } else if (m === 'wow' || m === 'cheer' || m === 'love') mo = .8; else if (m === 'hungry') mo = .35 + Math.sin(t * 3) * .1;
  B.mouth.scale.y = lerp(B.mouth.scale.y, mo, dt * 14); B.mouth.visible = B.mouth.scale.y > .06; B.smile.visible = mo < .2;
  // arms
  B.clap = Math.max(0, B.clap - dt); const cl = B.clap > 0 ? Math.abs(Math.sin(B.clap * 16)) : 0;
  B.arms.forEach((a, i) => { const s = i ? 1 : -1; const up = m === 'love' ? 1 : 0; a.rotation.x = lerp(a.rotation.x, up ? -2.6 : B.clap > 0 ? -1.5 : m === 'eat' ? -1.4 : -1.0, dt * 10); a.rotation.z = lerp(a.rotation.z, up ? s * (.5 + Math.sin(B.jump * 7) * .2) : B.clap > 0 ? -s * (.15 + cl * .35) : s * .25, dt * 12); });
  // blink
  const bl = Math.sin(t * 1.1) > .992 || Math.sin(t * .37 + 1) > .995; B.eyes.forEach(e => e.scale.y = bl ? .1 : 1);
  if (m === 'love' && Math.random() < dt * 5) { const p = h.getWorldPosition(V3()).add(V3(rnd(-.25, .25), .25, .1)); FX.emit(p, V3(rnd(-.15, .15), rnd(.4, .7), 0), rgb(pick(['#ff4a7a', '#ff8ab0'])), .07, 1.4, -.1, 1, .98); } }
function bearCheer() { B.clap = .8; bearMood('cheer', .9); A.voice('yay', 1.55); }
function bearSay(txt, ms = 1800) { const b = $('bub'); b.textContent = txt; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); clearTimeout(bearSay.t); bearSay.t = setTimeout(() => b.classList.remove('on'), ms); }
function placeBub() { const b = $('bub'); if (!b.classList.contains('on')) return; const p = B.head.getWorldPosition(V3()).add(V3(0, .38, 0)).project(camera); b.style.left = clamp((p.x * .5 + .5) * innerWidth, 90, innerWidth - 90) + 'px'; b.style.top = Math.max(b.offsetHeight + 64, (-p.y * .5 + .5) * innerHeight) + 'px'; }

/* ================= props ================= */
const W = V3(0, 0, .2); // work centre on the counter
const ST = new THREE.Group(); scene.add(ST); // current station
let stOld = null, stK = 1;
function newStation() { if (stOld) scene.remove(stOld); stOld = ST.clone(false); const kids = [...ST.children]; kids.forEach(k => stOld.add(k)); stOld.position.copy(ST.position); scene.add(stOld); ST.position.set(-2.6, 0, 0); stK = 0; }
function stationTick(dt) { if (stK >= 1) return; stK = Math.min(1, stK + dt * 2.2); const e = ease(stK); ST.position.x = lerp(-2.6, 0, e); if (stOld) { stOld.position.x = lerp(0, 2.8, e); if (stK >= 1) { scene.remove(stOld); stOld = null; } } }
const ceramic = phys('#fbf8f2', { roughness: .18, clearcoat: .6 });
function mkBoard() { const b = new THREE.Mesh(new RoundedBoxGeometry(.72, .035, .42, 4, .015), std('#ffffff', { map: ctex(woodCanvas(512, 256, [222, 176, 120], 5), 1, 1), roughness: .5 })); b.position.y = .0175; return shadowAll(b); }
function mkPlate(r = .26) { const pts = [V3(0, 0), V3(r * .62, 0), V3(r * .7, .012), V3(r * .72, .016), V3(r * .95, .03), V3(r, .036), V3(r * .97, .04), V3(r * .9, .034), V3(r * .7, .022), V3(0, .02)].map(v => new THREE.Vector2(v.x, v.y));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), ceramic); const rimM = new THREE.Mesh(new THREE.TorusGeometry(r * .985, .003, 6, 80), std('#e8a05a', { roughness: .4 })); rimM.rotation.x = Math.PI / 2; rimM.position.y = .039; const g = new THREE.Group(); g.add(m, rimM); return shadowAll(g); }
function mkBowl(r = .2, col = '#bcd8ea', wood = false) { const pts = [[0, 0], [r * .45, 0], [r * .5, .01], [r * .8, .05], [r * .98, .12], [r, .14], [r * .95, .14], [r * .93, .12], [r * .75, .055], [r * .45, .02], [0, .018]].map(([x, y]) => new THREE.Vector2(x, y));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), wood ? std('#ffffff', { map: ctex(woodCanvas(256, 256, [170, 110, 60], 4), 3, 1), roughness: .45 }) : phys(col, { roughness: .2, clearcoat: .7 }));
  const band = new THREE.Mesh(new THREE.TorusGeometry(r * .985, .006, 6, 80), std(wood ? '#7a4a22' : '#ffffff')); band.rotation.x = Math.PI / 2; band.position.y = .138; const g = new THREE.Group(); g.add(m, band); g.userData.r = r; return shadowAll(g); }
const bowlR = (r, h) => h < .05 ? r * lerp(.45, .75, h / .05) : r * lerp(.75, .93, (h - .05) / .07);
function mkStove() { const g = new THREE.Group(); const top = new THREE.Mesh(new RoundedBoxGeometry(.78, .04, .62, 4, .015), phys('#1a1a1e', { roughness: .08, clearcoat: 1, metalness: .2 })); top.position.y = .02; g.add(top);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.19, .012, 8, 64), new THREE.MeshBasicMaterial({ color: '#ff5a20', transparent: true, opacity: .0, toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.y = .041; g.add(ring); g.userData.ring = ring;
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(.12, .01, 8, 48), ring.material); r2.rotation.x = Math.PI / 2; r2.position.y = .041; g.add(r2);
  for (const x of [-.3, .3]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .02, 16), std('#c8c8cc', { metalness: .8, roughness: .3 })); k.position.set(x, .05, .25); g.add(k); }
  return shadowAll(g); }
function mkPan() { const g = new THREE.Group(); const pm = phys('#26262a', { roughness: .38, metalness: .55, clearcoat: .3 }); const base = new THREE.Mesh(new THREE.CylinderGeometry(.21, .2, .015, 56), pm); base.position.y = .05; g.add(base);
  const side = new THREE.Mesh(new THREE.CylinderGeometry(.235, .21, .045, 56, 1, true), Object.assign(pm.clone(), { side: THREE.DoubleSide })); side.position.y = .078; g.add(side);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(.235, .006, 6, 64), pm); lip.rotation.x = Math.PI / 2; lip.position.y = .1; g.add(lip);
  const h = new THREE.Mesh(new RoundedBoxGeometry(.3, .025, .045, 3, .01), std('#3a2418', { roughness: .5 })); h.position.set(.36, .1, 0); h.rotation.z = .12; g.add(h);
  const oil = new THREE.Mesh(new THREE.CircleGeometry(.205, 48), phys('#e8b84a', { roughness: .05, clearcoat: 1, transparent: true, opacity: .22, depthWrite: false })); oil.rotation.x = -Math.PI / 2; oil.position.y = .0585; g.add(oil);
  return shadowAll(g); }
function mkKnife() { const g = new THREE.Group(); const blade = new THREE.Mesh(new THREE.BoxGeometry(.004, .07, .22), phys('#dfe4ea', { metalness: 1, roughness: .18 })); blade.position.set(0, .035, -.02); g.add(blade);
  const hd = new RoundedBoxGeometry(.022, .03, .13, 3, .008); const handle = new THREE.Mesh(hd, std('#4a2a18', { roughness: .4 })); handle.position.set(0, .055, .16); g.add(handle); return shadowAll(g); }
function mkSpoon(whisk = false) { const g = new THREE.Group(); const hm = std('#c89060', { roughness: .45 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.012, .009, .34, 10), hm); handle.position.y = .2; g.add(handle);
  if (whisk) { const wm = phys('#e8ecf0', { metalness: 1, roughness: .2 }); for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.045, .0025, 6, 24, Math.PI), wm); t.rotation.set(0, i / 6 * Math.PI, Math.PI); t.position.y = .03; t.scale.y = 1.6; g.add(t); } }
  else { const bowl = new THREE.Mesh(new THREE.SphereGeometry(.04, 16, 10), hm); bowl.scale.set(1, .35, 1.4); bowl.position.y = .015; g.add(bowl); }
  g.rotation.z = .35; return shadowAll(g); }
function mkEgg() { const pts = []; const SC = 1.35; for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI; const y = -Math.cos(a) * .042 * SC, r = Math.sin(a) * .032 * SC * (1 - .12 * Math.cos(a)); pts.push(new THREE.Vector2(r, y)); }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), phys('#f6e8d6', { roughness: .5, sheen: .3 })); return shadowAll(m); }
function liquidDisc(r) { const c = cnv(256, 256); const tex = ctex(c); const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64), phys('#ffffff', { map: tex, roughness: .12, clearcoat: .8 })); m.rotation.x = -Math.PI / 2; m.userData.c = c; m.userData.tex = tex; return m; }
function drawBowl(B2) { const L = B2.liq; if (!L) return; const g = L.userData.c.getContext('2d'); const mixc = C(B2.mixCol || '#f0d8a0');
  g.fillStyle = B2.base || '#fff'; g.fillRect(0, 0, 256, 256);
  g.save(); g.translate(128, 128); g.rotate(B2.rot || 0);
  for (const b of B2.blobs) { g.globalAlpha = 1 - B2.mix * .9; g.fillStyle = b.col; g.beginPath(); const sw = B2.mix * 3; g.ellipse(b.x * Math.cos(sw) - b.y * Math.sin(sw) * .2, b.y, b.r * (1 + B2.mix * 1.5), b.r * (1 - B2.mix * .6), sw, 0, TAU); g.fill(); }
  if (B2.mix > 0) { g.globalAlpha = 1; g.strokeStyle = `rgba(255,255,255,${.25 * (1 - B2.mix)})`; g.lineWidth = 6; for (let i = 0; i < 4; i++) { g.beginPath(); for (let a = 0; a < 9; a += .2) g.lineTo(Math.cos(a + i * 1.6) * a * 12, Math.sin(a + i * 1.6) * a * 12); g.stroke(); } }
  g.restore(); g.globalAlpha = B2.mix; g.fillStyle = mixc.getStyle(); g.fillRect(0, 0, 256, 256); g.globalAlpha = 1;
  // tiny bubbles
  g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(rnd(40, 216), rnd(40, 216), rnd(1, 3), 0, TAU); g.fill(); }
  L.userData.tex.needsUpdate = true; }
function setBowlLevel(B2, lvl) { B2.lvl = lvl; const h = .025 + lvl * .085; const r = bowlR(B2.r, h) * .985; B2.liq.position.y = h; B2.liq.scale.setScalar(r / B2.r); B2.liq.visible = lvl > .01; }
function mkBowlState(r = .2) { const g = mkBowl(r); const liq = liquidDisc(r); g.add(liq); const BS = { g, r, liq, blobs: [], base: '#fffaf0', mix: 0, rot: 0, lvl: 0, mixCol: '#f0d8a0' }; setBowlLevel(BS, 0); drawBowl(BS); return BS; }
// food objects
function pancakeMesh(col) { const g = new THREE.Group(); const m = phys(col, { map: MOTTLE, roughness: .65, sheen: .3 }); const sideM = phys(col, { roughness: .7 }); const pc = new THREE.Mesh(new THREE.CylinderGeometry(.17, .165, .028, 56, 1), [sideM, m, m]); g.add(pc); g.userData.top = m; g.userData.side = sideM; return shadowAll(g); }
function pattyMesh(col) { const g = new THREE.Group(); const m = phys(col, { map: MEATN, roughness: .7, bumpMap: MEATN, bumpScale: 2 }); const p = new THREE.Mesh(new RoundedBoxGeometry(.24, .035, .24, 6, .016), m); p.scale.set(1, 1, 1); g.add(p); const cyl = new THREE.Mesh(new THREE.CylinderGeometry(.118, .118, .036, 40), m); g.add(cyl); p.visible = false; g.userData.top = m; g.userData.side = m; return shadowAll(g); }
function sausageMesh(col) { const m = phys(col, { roughness: .3, clearcoat: .7, map: MEATN }); const s = new THREE.Mesh(new THREE.CapsuleGeometry(.03, .24, 8, 20), m); s.rotation.z = Math.PI / 2; const g = new THREE.Group(); g.add(s); g.userData.top = m; g.userData.side = m; return shadowAll(g); }
function friedEgg() { const g = new THREE.Group(); const shp = new THREE.Shape(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, r = .1 * (1 + Math.sin(a * 3 + 1) * .12 + Math.sin(a * 5) * .06); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? shp.lineTo(x, y) : shp.moveTo(x, y); }
  const wM = phys('#ffffff', { roughness: .3, clearcoat: .5, transparent: true, opacity: .55 }); const w = new THREE.Mesh(new THREE.ExtrudeGeometry(shp, { depth: .008, bevelEnabled: true, bevelSize: .006, bevelThickness: .004, bevelSegments: 3 }), wM); w.rotation.x = -Math.PI / 2; g.add(w);
  const y = new THREE.Mesh(new THREE.SphereGeometry(.04, 28, 18), phys('#ffaa10', { roughness: .1, clearcoat: 1 })); y.scale.y = .55; y.position.set(.012, .014, -.01); g.add(y); g.userData.white = wM; return shadowAll(g); }
function sliceMesh(food, r, w = .012) { const P = FOOD[food]; const capM = phys('#ffffff', { map: capTex(food), roughness: .3, clearcoat: food === 'tomato' || food === 'cucumber' ? .6 : .2 }); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 32), [P.skin, capM, capM]); return shadowAll(m); }
function lettuceMesh(r = .16) { const g = new THREE.Group(); for (let k = 0; k < 2; k++) { const geo = new THREE.CircleGeometry(r, 64, 0, TAU); const p = geo.attributes.position; const cols = [];
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), d = Math.hypot(x, y) / r, a = Math.atan2(y, x); p.setZ(i, Math.sin(a * 14 + k) * .012 * d * d + d * d * .01); const c = C('#d8f0a0').lerp(C('#4aa83a'), d); cols.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, std('#ffffff', { vertexColors: true, roughness: .45, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.rotation.z = k * 1.3; m.position.set(k * .02, k * .004, -k * .015); g.add(m); }
  return shadowAll(g); }
function cheeseSlice() { const m = new THREE.Mesh(new RoundedBoxGeometry(.2, .008, .2, 2, .003), phys('#ffc23a', { roughness: .35, clearcoat: .3 })); m.rotation.y = Math.PI / 4; return shadowAll(m); }
function bunHalf(top) { const g = new THREE.Group(); const crust = phys('#c8782a', { roughness: .5, clearcoat: .4 }), crumb = std('#f6deb0', { roughness: .9 });
  if (top) { const d = new THREE.Mesh(new THREE.SphereGeometry(.15, 40, 20, 0, TAU, 0, Math.PI / 2), crust); d.scale.y = .62; g.add(d); const bt = new THREE.Mesh(new THREE.CircleGeometry(.15, 40), crumb); bt.rotation.x = Math.PI / 2; g.add(bt);
    const sm = std('#fff4d6', { roughness: .6 }); for (let i = 0; i < 26; i++) { const a = rnd(0, TAU), rr = Math.sqrt(Math.random()) * .12; const y = Math.sqrt(Math.max(0, .0225 - rr * rr)) * .62; const s = new THREE.Mesh(new THREE.SphereGeometry(.008, 6, 4), sm); s.scale.set(1, .5, 1.8); s.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); s.rotation.y = rnd(0, 3); g.add(s); } }
  else { const b = new THREE.Mesh(new THREE.CylinderGeometry(.15, .14, .04, 40), [crust, crumb, crust]); b.position.y = .02; g.add(b); }
  return shadowAll(g); }
function toastMesh() { const g = new THREE.Group(); const crust = std('#b8742a', { roughness: .7 }), top = phys('#e8b868', { map: MOTTLE, roughness: .8 }); const s = new THREE.Mesh(new RoundedBoxGeometry(.2, .028, .21, 4, .012), [crust, crust, top, crust, crust, crust]); g.add(s); return shadowAll(g); }
function pizzaBase() { const g = new THREE.Group(); const dough = phys('#f2dcaa', { map: MOTTLE, roughness: .8 }); const d = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .016, 72), dough); d.position.y = .008; g.add(d);
  const crust = new THREE.Mesh(new THREE.TorusGeometry(.275, .022, 14, 80), phys('#f0d090', { roughness: .7, map: MOTTLE })); crust.rotation.x = Math.PI / 2; crust.position.y = .018; crust.scale.z = .8; g.add(crust); g.userData.crust = crust; g.userData.dough = dough; return shadowAll(g); }
function bunDog() { const g = new THREE.Group(); const crust = phys('#d8904a', { roughness: .5, clearcoat: .3 }); for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.CapsuleGeometry(.04, .24, 8, 20), crust); h.rotation.z = Math.PI / 2; h.scale.set(1, .85, .75); h.position.set(0, .035, s * .034); g.add(h); }
  const inner = new THREE.Mesh(new THREE.BoxGeometry(.26, .01, .05), std('#f6deb0')); inner.position.y = .025; g.add(inner); return shadowAll(g); }

/* ================= paint overlay ================= */
function paintLayer(w, h, round, col, opt = {}) { const c = cnv(256, Math.round(256 * h / w)); const tex = ctex(c); const mat = (opt.gloss ? phys : std)('#ffffff', Object.assign({ map: tex, transparent: true, roughness: opt.gloss ? .08 : .5, clearcoat: opt.gloss ? 1 : 0, depthWrite: false, alphaTest: .02 }, {}));
  const geo = round ? new THREE.CircleGeometry(w / 2, 64) : new THREE.PlaneGeometry(w, h); const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; m.receiveShadow = true;
  const P = { m, c, tex, w, h, round, col, cells: new Set(), total: 0, N: 16 };
  for (let i = 0; i < P.N; i++) for (let j = 0; j < P.N; j++) { const u = (i + .5) / P.N - .5, v = (j + .5) / P.N - .5; if (!round || Math.hypot(u, v) < .44) P.total++; }
  P.paint = (lx, lz, rad) => { const g = c.getContext('2d'); const u = lx / w + .5, v = lz / h + .5; if (round && Math.hypot(u - .5, v - .5) > .5) return; const px = u * c.width, py = v * c.height, rp = rad / w * c.width;
    const gr = g.createRadialGradient(px, py, 0, px, py, rp); const cc = C(col); const s = `${cc.r * 255 | 0},${cc.g * 255 | 0},${cc.b * 255 | 0}`; gr.addColorStop(0, `rgba(${s},1)`); gr.addColorStop(.7, `rgba(${s},.95)`); gr.addColorStop(1, `rgba(${s},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(px, py, rp, 0, TAU); g.fill(); if (opt.spots) { g.fillStyle = opt.spots; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(px + rnd(-rp, rp) * .7, py + rnd(-rp, rp) * .7, rnd(1, 3), 0, TAU); g.fill(); } }
    if (round) { g.globalCompositeOperation = 'destination-in'; g.fillStyle = '#000'; g.beginPath(); g.arc(c.width / 2, c.height / 2, c.width * .47, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; }
    tex.needsUpdate = true; const rr = rad / w * P.N;
    for (let i = 0; i < P.N; i++) for (let j = 0; j < P.N; j++) { const cu = (i + .5) / P.N, cv = (j + .5) / P.N; if (round && Math.hypot(cu - .5, cv - .5) >= .44) continue; if (Math.hypot((cu - u) * P.N, (cv - v) * P.N * h / w) < rr * .9) P.cells.add(i * 99 + j); } };
  P.cov = () => P.cells.size / P.total; return P; }

/* ================= camera ================= */
const CAM = { t: V3(0, .2, -.4), p: V3(0, 2, 2), t0: V3(), p0: V3(), k: 1, dur: .9, orbit: 0 };
const VIEWS = {
  title: { t: V3(0, .45, -1.0), d: V3(0, .32, 1).normalize(), w: 1.15, h: 1.25 },
  work: { t: V3(0, .24, -.2), d: V3(0, .82, 1).normalize(), w: .86, h: 1.5 },
  oven: { t: V3(0, .2, .15), d: V3(0, .22, 1).normalize(), w: .95, h: .8 },
  serve: { t: V3(0, .3, -.85), d: V3(0, .5, 1).normalize(), w: 1.0, h: 1.05 },
};
let curView = 'title';
function topPad() { return curView === 'title' ? 170 : 66; }
function botPad() { if (curView === 'title') return innerHeight * .46; const p = $('panel'); return p.hidden ? 20 : p.offsetHeight + 6; }
function viewPose(name, out) { const v = VIEWS[name], H = innerHeight, asp = innerWidth / H, th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const use = Math.max(.35, (H - topPad() - botPad()) / H); const dist = Math.max(v.h / (2 * th * use), v.w / (2 * th * asp)) * 1.02;
  out.t.copy(v.t); out.p.copy(v.t).addScaledVector(v.d, dist); return out; }
function setView(name, dur = .9) { curView = name; CAM.t0.copy(CAM.t); CAM.p0.copy(CAM.p); CAM.k = 0; CAM.dur = dur; }
function camUpdate(dt) { const tgt = viewPose(curView, { t: V3(), p: V3() }); if (curView === 'title') { CAM.orbit += dt * .15; const r = tgt.p.clone().sub(tgt.t); r.applyAxisAngle(V3(0, 1, 0), Math.sin(CAM.orbit) * .18); tgt.p.copy(tgt.t).add(r); }
  if (CAM.k < 1) { CAM.k = Math.min(1, CAM.k + dt / CAM.dur); const e = ease(CAM.k); CAM.t.lerpVectors(CAM.t0, tgt.t, e); CAM.p.lerpVectors(CAM.p0, tgt.p, e); } else { CAM.t.lerp(tgt.t, Math.min(1, dt * 6)); CAM.p.lerp(tgt.p, Math.min(1, dt * 6)); }
  camera.position.copy(CAM.p); camera.lookAt(CAM.t);
  const off = (botPad() - topPad()) / 2; if (Math.abs(off) > 1) camera.setViewOffset(innerWidth, innerHeight + 2 * off, 0, 2 * off, innerWidth, innerHeight); else camera.clearViewOffset(); }

/* ================= input helpers ================= */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), stageEl = $('stage');
function setRay(e) { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); }
function onPlane(e, h) { setRay(e); const t = (h - ray.ray.origin.y) / ray.ray.direction.y; if (!(t > 0)) return null; return ray.ray.origin.clone().addScaledVector(ray.ray.direction, t); }
function toScr(v) { const p = v.clone().project(camera); return { x: (p.x * .5 + .5) * innerWidth, y: (-p.y * .5 + .5) * innerHeight }; }

/* ================= sounds ================= */
const SFX = {
  chop() { A.noise(.06, 'bandpass', 2600, 2, .22); A.tone(140, .09, 'sine', .22, 0, 70); },
  crack() { A.noise(.05, 'highpass', 3000, 1, .28); A.noise(.04, 'highpass', 4200, 1, .2, .05); },
  plop() { A.tone(520, .16, 'sine', .14, 0, 160); A.noise(.08, 'lowpass', 900, 1, .1); },
  pop() { A.tone(700, .09, 'sine', .12, 0, 1300); },
  ding() { A.tone(1568, .9, 'sine', .1); A.tone(2093, .9, 'sine', .06, .02); },
  whoosh() { A.noise(.35, 'bandpass', 600, 1.2, .1, 0, 2400); },
  step() { [784, 988, 1175].forEach((f, i) => A.tone(f, .22, 'triangle', .07, i * .07)); },
  chomp() { A.noise(.07, 'lowpass', 1400, 1, .3); A.tone(180, .06, 'sine', .1, 0, 90); },
  flip() { A.noise(.15, 'bandpass', 1200, 1, .14, 0, 400); },
  squeeze() { A.noise(.12, 'lowpass', 700, 3, .12, 0, 300); },
  oops() { A.tone(520, .16, 'triangle', .1, 0, 380); A.tone(390, .32, 'triangle', .1, .15, 260); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => A.tone(f, .35, 'triangle', .09, i * .09)); },
};
function sizzle(on, v = .06) { if (on) { const l = A.loop('sz') || A.loopOn('sz', 'highpass', 5200, .6, v); if (l) l.g.gain.value = v; } else A.loopOff('sz'); }

/* ================= panel / ui ================= */
const panel = $('panel'), pin = $('pin');
let UI = {};
function showPanel(html) { pin.innerHTML = html; panel.hidden = false; UI = { meter: pin.querySelector('.meter'), btns: pin.querySelector('.pbtns') }; }
function inst(ic, txt) { return `<div class="inst"><span class="ic">${ic}</span><span>${txt}</span></div>`; }
function meterHTML(band, emo = '🥞', burn = true, label = '') { return `<div class="meter"><i class="fill"></i><i class="band" style="inset-inline-start:${band[0] * 100}%;width:${(band[1] - band[0]) * 100}%"></i>${burn ? '<i class="burn"></i>' : ''}<span>${label}</span><b style="left:0">${emo}</b></div>`; }
function setMeter(v) { const m = UI.meter; if (!m) return; v = clamp(v, 0, 1); m.querySelector('.fill').style.width = v * 100 + '%'; const b = m.querySelector('b'); const rtl = document.dir === 'rtl'; b.style.left = (rtl ? (1 - v) : v) * 100 + '%'; }
const guide = $('guide'); let GD = null;
function setGuide(type, at) { GD = type ? { type, at } : null; guide.className = type || ''; guide.hidden = !type; guide.textContent = '👆'; }
function guideTick() { if (!GD) return; const p = typeof GD.at === 'function' ? GD.at() : GD.at; if (!p) { guide.hidden = true; return; } const s = p.isVector3 ? toScr(p) : p; guide.hidden = false; guide.style.left = s.x + 'px'; guide.style.top = s.y + 'px'; }
function dotsUI() { $('dots').innerHTML = RUN.steps.map((s, i) => `<i class="${i < RUN.i ? 'on' : i === RUN.i ? 'cur' : ''}"></i>`).join(''); }
function coinsUI() { $('coinTxt').textContent = '🪙 ' + S.coins; }
function flash(a = .6) { const f = $('flash'); f.style.opacity = a; setTimeout(() => f.style.opacity = 0, 120); }
function big3(t, ms = 900) { const b = $('big3'); b.textContent = t; b.classList.add('on'); clearTimeout(big3.t); big3.t = setTimeout(() => b.classList.remove('on'), ms); }

/* ================= steps ================= */
let RUN = null; // {rec, steps, i, q:[], R:{}}
let cur = null, ptr = null;
function oops(txt, emo = '😱') { SFX.oops(); buzz([30, 40, 30]); big3(emo, 1000); bearMood('wow', 1.3); A.voice('hm', 1.4); bearSay(txt, 2400); if (cur) cur.fails = (cur.fails || 0) + 1; }
function done(q = 1) { if (!cur || cur.fin) return; cur.fin = true; if (q != null) RUN.q.push(cur.fails ? Math.min(q, .8) : q); setGuide(null); SFX.step(); bearCheer(); if (Math.random() < .55) bearSay(pick(BEARTALK.step), 1300);
  FX.burst(W.clone().add(V3(0, .15, 0)), 18, [rgb('#ffd23a'), rgb('#ffffff'), rgb('#ff9a5a')], 1.3, .035, .7, 5); buzz(20);
  setTimeout(nextStep, cur.delay || 750); }
function nextStep() { if (cur && cur.end) cur.end(); RUN.i++; if (RUN.i >= RUN.steps.length) return; startStep(); }
function startStep() { cur = Object.assign({ fin: false, t: 0 }, RUN.steps[RUN.i]()); dotsUI(); cur.start && cur.start(); if (cur.view) setView(cur.view, .8); else if (curView !== 'work') setView('work', .8); B.look.copy(W); }

// --- crack an egg ---
function stCrack(into) { let egg, taps = 0, anim = 0, halves = [], target, t1 = 0; const shells = []; return { k: 'crack',
  start() { newStation(); if (into === 'bowl') { const R = RUN.R; R.bowl = R.bowl || mkBowlState(); R.bowl.g.position.copy(W); ST.add(R.bowl.g); target = V3(W.x, .06, W.z); }
    else { const s = mkStove(); s.position.copy(W); ST.add(s); const p = mkPan(); p.position.copy(W); ST.add(p); RUN.R.stove = s; RUN.R.pan = p; target = V3(W.x, .06, W.z); }
    egg = mkEgg(); egg.position.set(W.x + .02, .32, W.z); egg.rotation.z = .5; ST.add(egg); cur.egg = egg;
    showPanel(inst('🥚', T('הקישו בעדינות על הביצה – פעמיים', 'Tap the egg gently – twice'))); setGuide('tap', () => egg.getWorldPosition(V3()).add(V3(0, .02, 0))); },
  update(dt, t) { if (taps === 0) { egg.position.y = .32 + Math.sin(t * 3) * .012; egg.rotation.z = .5 + Math.sin(t * 2) * .08; }
    if (anim > 0) { anim -= dt; const k = 1 - anim / .18; egg.position.y = .32 - Math.sin(k * Math.PI) * .12; }
    for (const h of halves) { h.v.y -= dt * 2; h.m.position.addScaledVector(h.v, dt); h.m.rotation.z += h.s * dt * 4; h.m.material.opacity = Math.max(0, h.m.material.opacity - dt * .9); }
    if (cur.drop) { const d = cur.drop; d.t += dt; const k = eOut(Math.min(1, d.t / .35)); d.g.position.y = lerp(.28, d.y, k); d.g.scale.set(1, lerp(1.6, 1, k), 1); if (d.t > .35 && !d.splat) { d.splat = 1; SFX.plop(); FX.burst(target.clone().add(V3(0, .02, 0)), 10, [rgb('#fff6e0'), rgb('#ffcc40')], .6, .03, .5, 4); } } },
  down(e) { if (cur.fin) return; if (shells.length || taps >= 2) { this.pickShell(e); return; } if (anim > 0) return; const now = performance.now(); const hard = taps === 1 && now - t1 < 380; t1 = now; taps++; anim = .18; SFX.crack(); buzz(15);
    if (taps === 1) { const crk = new THREE.Mesh(new THREE.TorusGeometry(.031, .0025, 4, 24), std('#7a5a40')); crk.rotation.x = Math.PI / 2; crk.position.y = .002; egg.add(crk); FX.burst(egg.position.clone().add(ST.position), 5, [rgb('#f6e8d6')], .4, .015, .4, 3); }
    else { setTimeout(() => { egg.visible = false; for (const s of [-1, 1]) { const m = mkEgg(); m.material = m.material.clone(); m.material.transparent = true; m.scale.y = .55; m.position.copy(egg.position).add(V3(s * .02, s * .01, 0)); ST.add(m); halves.push({ m, v: V3(s * .35, .5, 0), s }); }
        const dg = new THREE.Group(); if (into === 'bowl') { const B2 = RUN.R.bowl; B2.blobs.push({ x: rnd(-20, 20), y: rnd(-20, 20), r: 34, col: '#ffb020' }, { x: 0, y: 0, r: 54, col: 'rgba(255,250,235,.9)' }); if (B2.lvl < .15) setBowlLevel(B2, .15); drawBowl(B2);
          const y = new THREE.Mesh(new THREE.SphereGeometry(.035, 20, 14), phys('#ffaa10', { roughness: .1, clearcoat: 1 })); y.scale.y = .6; dg.add(y); dg.position.set(target.x, .28, target.z); ST.add(dg); cur.drop = { g: dg, t: 0, y: RUN.R.bowl.liq.position.y + .005 }; setTimeout(() => { dg.visible = false; }, 500); }
        else { const fe = friedEgg(); fe.position.y = 0; dg.add(fe); dg.position.set(target.x, .28, target.z); ST.add(dg); RUN.R.egg = fe; cur.drop = { g: dg, t: 0, y: .06 }; }
        if (hard) setTimeout(() => this.smash(), 450); else setTimeout(() => done(1), 700); }, 120); } },
  smash() { if (cur.fin) return; oops(T('חזק מדי! 😮 בעדינות…', 'Too hard! 😮 Gently…'), '😮'); const y = into === 'bowl' ? RUN.R.bowl.liq.position.y + .008 : .072; const sm = phys('#d8a066', { roughness: .55, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 8, 0, 2.2, 0, 1.1), sm); const a = i / 3 * TAU + rnd(-.4, .4), r = rnd(.04, .08); m.position.set(W.x + Math.cos(a) * r, y + .25, W.z + Math.sin(a) * r); m.rotation.set(rnd(-.6, .6), rnd(0, TAU), rnd(-.6, .6)); ST.add(shadowAll(m)); shells.push(m); const y0 = m.position.y; tween(.35, k => m.position.y = lerp(y0, y, k * k), () => SFX.pop(), i * .12); }
    setTimeout(() => { if (cur.fin) return; showPanel(inst('🐚', T('אופס! נפלו קליפות. הקישו עליהן כדי להוציא', 'Oops! Shell bits fell in. Tap them to take them out'))); setGuide('tap', () => shells[0] ? shells[0].getWorldPosition(V3()) : null); }, 900); },
  pickShell(e) { if (!shells.length) return; let best = null, bd = 70; for (const m of shells) { const p = toScr(m.getWorldPosition(V3())); const dd = Math.hypot(p.x - e.clientX, p.y - e.clientY); if (dd < bd) { bd = dd; best = m; } } if (!best) return;
    shells.splice(shells.indexOf(best), 1); SFX.pop(); buzz(12); const p0 = best.position.clone(); tween(.4, k => { best.position.set(p0.x + k * .35, p0.y + Math.sin(k * Math.PI) * .2 + k * .1, p0.z); best.rotation.x += .3; }, () => ST.remove(best)); if (!shells.length) { setGuide(null); setTimeout(() => done(1), 500); } },
  end() { halves.forEach(h => ST.remove(h.m)); shells.forEach(m => ST.remove(m)); } }; }

// --- pour (hold) ---
const POURS = {
  milk: { e: '🥛', n: T('לחצו והחזיקו כדי לשפוך חלב', 'Press and hold to pour the milk'), col: '#ffffff', make() { const g = new THREE.Group(); const box = new THREE.Mesh(new RoundedBoxGeometry(.09, .2, .09, 3, .008), std('#ffffff', { map: ctex((() => { const c = cnv(128, 256), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 256); x.fillStyle = '#4a8ad8'; x.fillRect(0, 150, 128, 106); x.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { x.beginPath(); x.ellipse(rnd(10, 118), rnd(165, 240), rnd(8, 16), rnd(5, 10), rnd(0, 3), 0, TAU); x.fill(); } x.fillStyle = '#2a5aa8'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.fillText('MILK', 64, 110); return c; })()), roughness: .6 }));
      box.position.y = .1; g.add(box); const roof = new THREE.Mesh(new THREE.CylinderGeometry(.0, .064, .05, 4, 1), std('#ffffff', { roughness: .6 })); roof.rotation.y = Math.PI / 4; roof.position.y = .225; g.add(roof); const cap = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .02, 12), std('#3a7ad8')); cap.position.set(-.025, .24, 0); g.add(cap); g.userData.spout = V3(-.04, .23, 0); return shadowAll(g); } },
  flour: { e: '🌾', n: T('לחצו והחזיקו כדי לשפוך קמח', 'Press and hold to pour the flour'), col: '#fbf6ea', powder: true, make() { const g = new THREE.Group(); const cup = new THREE.Mesh(new THREE.CylinderGeometry(.06, .05, .09, 28, 1, true), Object.assign(phys('#e8ecf0', { metalness: .9, roughness: .25 }), { side: THREE.DoubleSide })); cup.position.y = .045; g.add(cup); const bot = new THREE.Mesh(new THREE.CircleGeometry(.05, 28), cup.material); bot.rotation.x = -Math.PI / 2; g.add(bot);
      const fl = new THREE.Mesh(new THREE.SphereGeometry(.058, 24, 12, 0, TAU, 0, Math.PI / 2), std('#fbf6ea', { roughness: 1 })); fl.scale.y = .5; fl.position.y = .085; g.add(fl); const h = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .14, 8), cup.material); h.rotation.z = Math.PI / 2; h.position.set(.12, .06, 0); g.add(h); g.userData.spout = V3(-.06, .09, 0); return shadowAll(g); } },
  dressing: { e: '🫒', n: T('לחצו והחזיקו כדי לשפוך רוטב', 'Press and hold to pour the dressing'), col: '#e8c84a', make() { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .16, 24), phys('#ffffff', { transmission: .85, roughness: .05, thickness: .03, transparent: true, opacity: .6 })); b.position.y = .08; g.add(b); const o = new THREE.Mesh(new THREE.CylinderGeometry(.036, .036, .12, 20), phys('#e8c040', { roughness: .1, transparent: true, opacity: .85 })); o.position.y = .065; g.add(o);
      const n = new THREE.Mesh(new THREE.CylinderGeometry(.012, .03, .05, 16), b.material); n.position.y = .185; g.add(n); g.userData.spout = V3(-.012, .21, 0); return shadowAll(g); } },
};
function stPour(kind, band = [.55, .8], into = 'bowl') { const P = POURS[kind]; let src, hold = false, tilt = 0, lvl0 = 0, lvl = 0, stream, B2, spilt = false, nb0 = 0; return { k: 'pour',
  start() { const R = RUN.R; if (into === 'bowl') { B2 = R.bowl; if (!B2) { B2 = R.bowl = mkBowlState(); B2.g.position.copy(W); } if (B2.g.parent !== ST) { newStation(); ST.add(B2.g); } lvl0 = B2.lvl; nb0 = B2.blobs.length; }
    else { B2 = null; }
    src = P.make(); src.position.set(W.x + .17, .2, W.z); ST.add(src); stream = new THREE.Mesh(new THREE.CylinderGeometry(.007, .009, 1, 10), phys(P.col, { roughness: .1, clearcoat: 1 })); stream.visible = false; ST.add(stream);
    showPanel(inst(P.e, P.n) + meterHTML(band, P.e, true, T('עד הפס הירוק', 'Up to the green zone'))); setMeter(0);
    setGuide('hold', () => src.getWorldPosition(V3()).add(V3(-.05, .1, 0))); },
  update(dt, t) { tilt = lerp(tilt, hold ? 1.9 : 0, dt * 7); src.rotation.z = tilt; src.position.y = .2 + tilt * .03;
    const pouring = hold && tilt > 1.4 && !cur.fin; if (pouring) { lvl = Math.min(1.02, lvl + dt * .28); setMeter(lvl);
      if (B2) { if (kind === 'flour') { if (Math.random() < dt * 14) B2.blobs.push({ x: rnd(-40, 40), y: rnd(-40, 40), r: rnd(14, 26), col: '#fdfaf2' }); } else { B2.base = kind === 'milk' ? '#fffcf4' : B2.base; } setBowlLevel(B2, Math.min(.9, lvl0 + lvl * (kind === 'flour' ? .25 : .45))); if (Math.random() < dt * 8) drawBowl(B2); }
      if (!A.loop('pour')) A.loopOn('pour', kind === 'flour' ? 'highpass' : 'bandpass', kind === 'flour' ? 3000 : 900, kind === 'flour' ? .5 : 1.4, .08, kind === 'flour' ? 0 : 7); }
    else if (A.loop('pour')) A.loopOff('pour');
    const sp = src.localToWorld(src.userData.spout.clone()); const tgtY = B2 ? B2.liq.position.y + B2.g.position.y : .08;
    if (pouring && !P.powder) { const len = sp.y - tgtY; stream.visible = true; stream.scale.set(1 + Math.sin(t * 30) * .1, len, 1); stream.position.set(sp.x - ST.position.x, tgtY + len / 2, sp.z); if (Math.random() < dt * 20) FX.emit(V3(sp.x, tgtY + .005, sp.z), V3(rnd(-.2, .2), rnd(.2, .5), rnd(-.2, .2)), rgb(P.col), .02, .4, 4); }
    else stream.visible = false;
    if (pouring && P.powder) for (let i = 0; i < 3; i++) FX.emit(sp.clone().add(V3(rnd(-.02, .02), 0, rnd(-.02, .02))), V3(rnd(-.05, .05), rnd(-.6, -.3), rnd(-.05, .05)), rgb('#fffaf0'), rnd(.015, .03), .45, 1.5, .9);
    if (lvl >= 1 && hold && !spilt) this.spill(); },
  spill() { spilt = true; hold = false; A.loopOff('pour'); const c = B2 ? B2.g.getWorldPosition(V3()) : RUN.R.dish.getWorldPosition(V3()); const rr = B2 ? B2.r : .24;
    for (let i = 0; i < 40; i++) { const a = rnd(0, TAU); FX.emit(c.clone().add(V3(Math.cos(a) * rr, .13, Math.sin(a) * rr)), V3(Math.cos(a) * rnd(.2, .6), rnd(.1, .5), Math.sin(a) * rnd(.2, .6)), rgb(P.col), rnd(.015, .03), .7, 4); }
    const pd = new THREE.Mesh(new THREE.CircleGeometry(rr * 1.35, 40), phys(P.col, { roughness: .1, clearcoat: 1, transparent: true, opacity: .85, depthWrite: false })); pd.rotation.x = -Math.PI / 2; pd.position.set(c.x - ST.position.x, .002, c.z); pd.scale.setScalar(.6); ST.add(pd); tween(.4, k => pd.scale.setScalar(lerp(.6, 1, k))); tween(.8, k => pd.material.opacity = .85 * (1 - k), () => ST.remove(pd), 1.8);
    oops(T('אופס! נשפך החוצה 💦 ננסה שוב', 'Oops! It spilled over 💦 Let’s try again'), '💦');
    setTimeout(() => { if (cur.fin) return; lvl = 0; setMeter(0); if (B2) { B2.blobs.length = nb0; setBowlLevel(B2, lvl0); drawBowl(B2); } spilt = false; setGuide('hold', () => src.getWorldPosition(V3()).add(V3(-.05, .1, 0))); }, 1500); },
  down() { if (cur.fin || spilt) return; hold = true; setGuide(null); A.ac(); },
  up() { if (!hold) return; hold = false; if (cur.fin) return; if (lvl >= band[0]) { const q = lvl <= band[1] ? 1 : clamp(1 - (lvl - band[1]) * 3, .3, 1); if (lvl > band[1]) bearSay(T('אופס, קצת יותר מדי 😅', 'Oops, a bit too much 😅'), 1400); setTimeout(() => done(q), 350); }
    else if (lvl > .05) toast(T('עוד קצת… עד הפס הירוק!', 'A little more… up to the green!')); },
  end() { A.loopOff('pour'); ST.remove(src); ST.remove(stream); } }; }

// --- stir / toss ---
function stStir(mixCol, toss = false) { let tool, acc = 0, lastA = null, speed = 0, B2; return { k: 'stir',
  start() { const R = RUN.R; B2 = R.bowl; if (B2.g.parent !== ST) { newStation(); ST.add(B2.g); } B2.mixCol = mixCol; tool = mkSpoon(!toss); tool.position.set(W.x + .08, .05, W.z); ST.add(tool);
    showPanel(inst(toss ? '🥗' : '🥄', toss ? T('ערבבו בעיגולים כדי לערבב את הסלט', 'Stir in circles to toss the salad') : T('ערבבו בעיגולים עד שהבלילה חלקה', 'Stir in circles until the batter is smooth')) + meterHTML([.98, 1], toss ? '🥗' : '🥄', false, T('ערבוב', 'Mixing'))); setMeter(0);
    setGuide('circle', () => B2.g.getWorldPosition(V3()).add(V3(-.05, .1, 0))); },
  update(dt, t) { speed = lerp(speed, 0, dt * 4); const l = A.loop('stir'); if (l) l.g.gain.value = clamp(speed * .04, 0, .09); B2.mix = toss ? 0 : clamp(acc / (TAU * 3.2), 0, 1); B2.rot = acc * .6;
    if (!toss && Math.random() < dt * 20) drawBowl(B2); if (toss && B2.pieces) { B2.pieces.rotation.y = acc * .5; B2.pieces.children.forEach((p, i) => { p.position.y = p.userData.y + Math.abs(Math.sin(acc * 2 + i)) * Math.min(.03, speed * .01); }); }
    setMeter(acc / (TAU * 3.2)); },
  down(e) { if (cur.fin) return; A.ac(); if (!A.loop('stir')) A.loopOn('stir', 'lowpass', 700, 2, 0, 4); this.move(e); setGuide(null); },
  move(e) { if (cur.fin || !ptr) return; const c = B2.g.getWorldPosition(V3()); const p = onPlane(e, .1); if (!p) return; const dx = p.x - c.x, dz = p.z - c.z, r = Math.hypot(dx, dz); const rr = Math.min(r, B2.r * .7); const a = Math.atan2(dz, dx);
    tool.position.set(c.x - ST.position.x + Math.cos(a) * rr, .03, c.z + Math.sin(a) * rr); tool.rotation.set(0, -a, .35);
    if (lastA != null && r > .03) { let d = a - lastA; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; if (Math.abs(d) < 1.2) { acc += Math.abs(d); speed += Math.abs(d) * 6; } } lastA = a;
    if (Math.random() < .2) FX.emit(V3(tool.position.x + ST.position.x, B2.liq.position.y + .01, tool.position.z), V3(rnd(-.1, .1), .2, rnd(-.1, .1)), rgb('#ffffff'), .012, .4, 1);
    if (acc >= TAU * 3.2) { B2.mix = toss ? 0 : 1; if (!toss) drawBowl(B2); A.loopOff('stir'); done(1); } },
  up() { lastA = null; },
  end() { A.loopOff('stir'); ST.remove(tool); } }; }

// --- fry (with flip) ---
const COOK = {
  pancake: { e: '🥞', raw: '#f3dfae', gold: '#d8953e', burnt: '#3a2412', make: c => pancakeMesh(c), y: .074, rate: .17 },
  patty: { e: '🍔', raw: '#c25a5e', gold: '#6a3a22', burnt: '#221208', make: c => pattyMesh(c), y: .079, rate: .15 },
  sausage: { e: '🌭', raw: '#e8a08e', gold: '#a8502a', burnt: '#2a140a', make: c => sausageMesh(c), y: .09, rate: .19 },
  egg: { e: '🍳', raw: '#ffffff', gold: '#ffffff', burnt: '#a07850', y: .06, rate: .16 },
};
const cookCol = (k, d) => { const c = COOK[k]; return d < .82 ? C(c.raw).lerp(C(c.gold), clamp(d / .82, 0, 1)) : C(c.gold).lerp(C(c.burnt), clamp((d - .9) / .5, 0, 1)); };
function stFry(kind, flips = 1) { const K2 = COOK[kind]; let item, side = 0, d = [0, 0], fl = 0, flipping = 0, qs = [], hot = 0, burning = false; const band = [.68, .95], MX = 1.3; return { k: 'fry',
  mkItem() { item = new THREE.Group(); const m = K2.make(K2.raw); item.add(m); item.userData.m = m; item.position.set(W.x, K2.y + .2, W.z); ST.add(item); SFX.plop(); cur.item = item; },
  start() { const R = RUN.R; if (!R.pan) { newStation(); const s = mkStove(); s.position.copy(W); ST.add(s); const p = mkPan(); p.position.copy(W); ST.add(p); R.stove = s; R.pan = p; }
    if (kind === 'egg') item = R.egg.parent; else this.mkItem();
    cur.item = item; R.cooked = R.cooked || {};
    showPanel(inst(K2.e, flips ? T('כשהצד מוזהב – הפכו!', 'When it’s golden – flip it!') : T('כשהחלבון מתקשה ולבן – הוציאו!', 'When the egg white is set – take it out!')) + meterHTML([band[0] / MX, band[1] / MX], K2.e, true, '') + `<div class="pbtns"><button class="btn pri" id="flipB">${flips ? T('🔄 להפוך', '🔄 Flip') : T('🍳 מוכן!', '🍳 Done!')}</button></div>`);
    $('flipB').onclick = () => this.act(); },
  update(dt, t) { const R = RUN.R; hot = Math.min(1, hot + dt * 1.5); R.stove.userData.ring.material.opacity = hot * (.55 + Math.sin(t * 9) * .05); warm.position.copy(W).add(V3(0, .2, 0)); warm.intensity = hot * .6;
    if (!cur.fin) { if (!flipping && !burning) d[side] += dt * K2.rate; sizzle(true, .03 + Math.min(.08, d[side] * .07)); }
    if (item.position.y > (kind === 'egg' ? .0 : K2.y) && !flipping && kind !== 'egg') item.position.y = Math.max(K2.y, item.position.y - dt * 1.5);
    const show = d[side]; setMeter(show / MX); const btn = $('flipB'); if (btn) btn.classList.toggle('blink', show >= band[0] && show <= band[1]);
    // colours: bottom side cooking shows on the rim; top shows the other side
    if (kind === 'egg') { const k = clamp(d[0] / .8, 0, 1); R.egg.userData.white.opacity = lerp(.55, 1, k); R.egg.userData.white.color.copy(d[0] > 1 ? C('#fff').lerp(C('#c89a6a'), clamp((d[0] - 1) / .4, 0, 1)) : C('#ffffff')); }
    else { const m = item.userData.m; if (m.userData.side !== m.userData.top) { m.userData.top.color.copy(cookCol(kind, fl ? d[0] : 0)); m.userData.side.color.copy(cookCol(kind, Math.max(d[0], d[1]) * .85)); } else m.userData.top.color.copy(cookCol(kind, fl ? d[0] : d[0] * .45)); }
    if (Math.random() < dt * (4 + d[side] * 14)) FX.emit(item.getWorldPosition(V3()).add(V3(rnd(-.12, .12), .03, rnd(-.12, .12))), V3(rnd(-.03, .03), rnd(.15, .3), rnd(-.03, .03)), rgb(d[side] > 1 ? '#6a6a6a' : '#ffffff'), rnd(.04, .08), 1.1, -.05, .25, .99);
    if (Math.random() < dt * 10) FX.emit(item.getWorldPosition(V3()).add(V3(rnd(-.2, .2), .01, rnd(-.2, .2))), V3(rnd(-.2, .2), rnd(.3, .6), rnd(-.2, .2)), rgb('#fff6d0'), .01, .3, 4);
    if (flipping) { flipping = Math.max(0, flipping - dt); const k = 1 - flipping / .55; item.position.y = K2.y + Math.sin(k * Math.PI) * .2; if (kind === 'sausage') item.rotation.x = (fl - 1) * Math.PI + k * Math.PI; else item.rotation.x = (fl - 1) * Math.PI + k * Math.PI; if (!flipping) { item.rotation.x = fl * Math.PI; SFX.plop(); } }
    if (!cur.fin && !burning && d[side] > MX) this.burn(); },
  burn() { burning = true; d[side] = 1.6; const c = item.getWorldPosition(V3()); for (let i = 0; i < 26; i++) FX.emit(c.clone().add(V3(rnd(-.12, .12), .04, rnd(-.12, .12))), V3(rnd(-.05, .05), rnd(.2, .45), rnd(-.05, .05)), rgb('#4a4a4a'), rnd(.07, .13), 1.6, -.05, .3, .99);
    oops(T('אוי! נשרף 🔥 מכינים חדש', 'Oh no! It burnt 🔥 Let’s make a new one'), '🔥');
    setTimeout(() => { if (cur.fin) return; const R = RUN.R; if (kind === 'egg') { const dg = R.egg.parent; dg.remove(R.egg); const fe = friedEgg(); dg.add(fe); R.egg = fe; SFX.plop(); } else { ST.remove(item); this.mkItem(); } d = [0, 0]; side = 0; fl = 0; qs = []; flipping = 0; item.rotation.x = 0; burning = false; }, 1700); },
  act() { if (cur.fin || flipping || burning) return; A.ac(); const q = clamp(1 - Math.max(0, band[0] - d[side], d[side] - band[1]) * 2.6, .2, 1); qs.push(q); if (d[side] < band[0] - .25) { toast(T('עוד לא… חכו שיזהיב', 'Not yet… wait until it’s golden')); qs.pop(); return; }
    if (q > .95) big3('👌', 700); else if (d[side] > band[1]) bearSay(T('קצת שרוף… 😬', 'A bit burnt… 😬'), 1300);
    if (fl < flips) { fl++; side = 1; flipping = .55; SFX.flip(); buzz(20); return; }
    sizzle(false); RUN.R.cooked[kind] = { d: [...d], top: cookCol(kind, d[0]).getHex(), bot: cookCol(kind, d[1]).getHex() }; done(qs.reduce((a, b) => a + b, 0) / qs.length); },
  down(e) { if (cur.fin) return; setRay(e); if (ray.intersectObject(item, true).length) this.act(); },
  end() { sizzle(false); warm.intensity = 0; } }; }

// --- slice ---
function stSlice(food, n) { const P = FOOD[food]; const segs = []; const junk = []; let k = 0, knife, chopT = 0, y0 = null, xs = 0, swiped = false, tiltK = 0; const L = P.len, w = L / (n + 1.6), x0 = W.x - .08 - L / 2, xR = x0 + L; let cuts = []; return { k: 'slice',
  start() { newStation(); const b = mkBoard(); b.position.copy(W); ST.add(b); const item = new THREE.Group(); item.position.set(0, 0, W.z); ST.add(item);
    // segments from the right end: n slices + remainder (built from 3 pieces for a smooth silhouette)
    const prof = x => P.prof((x - (x0 + L / 2)) / (L / 2));
    const mkSeg = (a, b2) => { const r1 = Math.max(.003, prof(a)), r2 = Math.max(.003, prof(b2)); const capM = phys('#ffffff', { map: capTex(food), roughness: .3, clearcoat: .4 }); const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, b2 - a, 32), [P.skin, capM, capM]); m.rotation.z = Math.PI / 2; m.position.set((a + b2) / 2, .035 + Math.max(r1, r2, prof((a + b2) / 2)), 0); m.userData.r = prof((a + b2) / 2); m.userData.w = b2 - a; return shadowAll(m); };
    for (let i = 0; i < n; i++) { const b2 = xR - i * w, a = b2 - w; const m = mkSeg(a, b2); item.add(m); segs.push(m); }
    const rem = xR - n * w; for (let i = 0; i < 4; i++) { const a = x0 + (rem - x0) * i / 4, b2 = x0 + (rem - x0) * (i + 1) / 4; item.add(mkSeg(a, b2)); }
    if (food === 'carrot') { const lf = new THREE.Group(); for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.003, .006, .09, 6), std('#4a9a38')); l.position.set(xR + .04, .08, (i - 1.5) * .012); l.rotation.z = -1.2 + i * .15; lf.add(l); } item.add(lf); }
    knife = mkKnife(); knife.position.set(xR - w, .24, W.z); ST.add(knife); cur.item = item;
    showPanel(inst('🔪', T('החליקו ישר למטה כדי לחתוך', 'Swipe straight down to slice') + ` <b style="color:#e8732a">0/${n}</b>`));
    setGuide('swipe', () => knife.getWorldPosition(V3()).add(V3(0, .05, 0))); RUN.R.slices = RUN.R.slices || {}; },
  update(dt) { const tx = xR - (k + 1) * w; knife.position.x = lerp(knife.position.x, tx, dt * 10); if (chopT > 0) { chopT = Math.max(0, chopT - dt); const p = 1 - chopT / .22; knife.position.y = p < .35 ? lerp(.24, .036, p / .35) : lerp(.036, .24, (p - .35) / .65); } else knife.position.y = lerp(knife.position.y, .24, dt * 10); knife.rotation.x = lerp(knife.rotation.x, tiltK, dt * 14); if (chopT <= 0) tiltK = 0;
    for (let i = junk.length - 1; i >= 0; i--) { const j = junk[i]; j.v.y -= dt * 3; j.m.position.addScaledVector(j.v, dt); j.m.rotation.x += dt * 9; j.t += dt; if (j.m.position.y < .045 && j.t < .6) { j.m.position.y = .045; j.v.y = Math.abs(j.v.y) * .3; } if (j.t > 1.2) { ST.remove(j.m); junk.splice(i, 1); } }
    cuts.forEach((c, i) => { c.t = Math.min(1, c.t + dt * 2.6); const e = ease(c.t); const m = c.m; m.position.x = lerp(c.x0, c.tx, e); m.position.z = lerp(0, c.tz, e); m.position.y = lerp(c.y0, .035 + m.userData.w / 2 + i * .0015, e) + Math.sin(e * Math.PI) * .06; m.rotation.z = lerp(Math.PI / 2, 0, e); m.rotation.x = lerp(0, -.08, e); }); },
  chop() { if (cur.fin || chopT > .05 || k >= n) return; A.ac(); chopT = .22; setTimeout(() => { SFX.chop(); buzz(12); const m = segs[k]; cuts.push({ m, t: 0, x0: m.position.x, y0: m.position.y, tx: W.x + .17 + (cuts.length - (n - 1) / 2) * .03 + .06, tz: (cuts.length - (n - 1) / 2) * .045 });
      FX.burst(V3(m.position.x - w / 2, .07, W.z), 6, [rgb(food === 'tomato' ? '#ff5040' : food === 'cucumber' ? '#cfe8a0' : food === 'carrot' ? '#ffa040' : '#e8a090')], .5, .012, .5, 4); k++;
      const b = pin.querySelector('.inst b'); if (b) b.textContent = `${k}/${n}`; if (k >= n) { RUN.R.slices[food] = n; setTimeout(() => done(1), 450); } }, 70); setGuide(null); },
  crooked(dx) { if (cur.fin || chopT > .05 || k >= n) return; A.ac(); chopT = .22; tiltK = Math.sign(dx) * .55; setGuide(null);
    setTimeout(() => { SFX.chop(); const m = segs[k]; const pc = sliceMesh(food, m.userData.r * .85, .022); pc.position.set(m.position.x - w / 2, m.position.y, W.z); pc.rotation.set(Math.sign(dx) * .7, 0, Math.PI / 2 + .5); pc.scale.set(1, 1, .55); ST.add(pc); junk.push({ m: pc, v: V3(.25, .5, Math.sign(dx) * .9), t: 0 });
      oops(T('עקום! 😬 חתכו ישר למטה', 'Crooked! 😬 Cut straight down'), '😬'); setTimeout(() => { if (!cur.fin) setGuide('swipe', () => knife.getWorldPosition(V3()).add(V3(0, .05, 0))); }, 1200); }, 70); },
  down(e) { if (cur.fin) return; y0 = e.clientY; xs = e.clientX; swiped = false; },
  move(e) { if (y0 == null || swiped || cur.fin) return; const dy = e.clientY - y0, dx = e.clientX - xs; if (dy > 34) { swiped = true; if (Math.abs(dx) > dy * .85) this.crooked(dx); else this.chop(); } },
  up(e) { if (y0 != null && !swiped && !cur.fin && Math.abs(e.clientY - y0) < 12) toast(T('החליקו את האצבע ישר למטה ⬇️', 'Swipe your finger straight down ⬇️')); y0 = null; },
  end() { junk.forEach(j => ST.remove(j.m)); } }; }

// --- paint (sauce / honey / butter / ketchup) ---
const PAINTS = {
  honey: { e: '🍯', col: '#e8a020', gloss: true, txt: T('מרחו דבש על הפנקייק', 'Drizzle honey over the pancakes'), tool: 'dipper', rad: .028 },
  sauce: { e: '🍅', col: '#c22a16', spots: 'rgba(120,20,10,.5)', txt: T('מרחו רוטב עגבניות על הבצק', 'Spread tomato sauce on the dough'), tool: 'ladle', rad: .045 },
  butter: { e: '🧈', col: '#ffe680', gloss: true, txt: T('מרחו חמאה על הטוסט', 'Spread butter on the toast'), tool: 'knife', rad: .035 },
  ketchup: { e: '🥫', col: '#c8140a', gloss: true, txt: T('ציירו קטשופ על הנקניקייה', 'Draw ketchup on the hot dog'), tool: 'bottle', rad: .017, need: .55 },
  mustard: { e: '🟡', col: '#f2c214', gloss: true, txt: T('ועכשיו חרדל!', 'Now mustard!'), tool: 'bottle', rad: .015, need: .45 },
};
function toolMesh(kind, col) { const g = new THREE.Group(); if (kind === 'dipper') { const h = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, .24, 8), std('#b07840')); h.position.y = .14; g.add(h); for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.016 - Math.abs(i - 2) * .002, .004, 6, 16), phys('#e8a020', { roughness: .1, clearcoat: 1 })); r.rotation.x = Math.PI / 2; r.position.y = .01 + i * .009; g.add(r); } }
  else if (kind === 'ladle') { const b = new THREE.Mesh(new THREE.SphereGeometry(.04, 18, 10, 0, TAU, Math.PI / 2, Math.PI / 2), Object.assign(phys('#d8dde2', { metalness: .9, roughness: .25 }), { side: THREE.DoubleSide })); b.position.y = .04; g.add(b); const h = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .26, 8), b.material); h.position.set(.04, .15, 0); h.rotation.z = -.3; g.add(h); }
  else if (kind === 'knife') { const bl = new THREE.Mesh(new RoundedBoxGeometry(.03, .004, .12, 2, .002), phys('#dfe4ea', { metalness: 1, roughness: .2 })); bl.position.y = .01; g.add(bl); const h = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, .1, 8), std('#3a7ad8')); h.rotation.x = Math.PI / 2; h.position.set(0, .02, .11); g.add(h); g.rotation.x = -.3; }
  else { const b = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .14, 20), phys(col, { roughness: .2, clearcoat: .6 })); b.position.y = .13; g.add(b); const n = new THREE.Mesh(new THREE.ConeGeometry(.012, .05, 12), b.material); n.rotation.x = Math.PI; n.position.y = .04; g.add(n); }
  return shadowAll(g); }
function stPaint(kind, tgt) { const P = PAINTS[kind]; let layer, tool, last = null, stream; return { k: 'paint',
  start() { const R = RUN.R; const T2 = R.surf[tgt]; if (R.dish.parent !== ST) { newStation(); ST.add(R.dish); R.dish.position.copy(W); }
    layer = paintLayer(T2.w, T2.h, T2.round, P.col, { gloss: P.gloss, spots: P.spots }); layer.m.position.copy(T2.pos); T2.parent.add(layer.m); (R.layers = R.layers || []).push(layer);
    tool = toolMesh(P.tool, P.col); tool.position.set(W.x + .25, .25, W.z + .1); ST.add(tool); stream = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, 1, 6), phys(P.col, { roughness: .1, clearcoat: 1 })); stream.visible = false; ST.add(stream);
    cur.T2 = T2; showPanel(inst(P.e, P.txt) + meterHTML([P.need || .8, 1], P.e, false, '') + `<div class="pbtns"><button class="btn" id="doneB" style="visibility:hidden">${T('✔ מספיק', '✔ Enough')}</button></div>`); setMeter(0);
    $('doneB').onclick = () => { if (layer.cov() > (P.need || .8) * .6) done(clamp(layer.cov() / (P.need || .8), .4, 1)); };
    setGuide('drag', () => T2.parent.localToWorld(T2.pos.clone()).add(V3(0, .05, 0))); },
  update(dt, t) { if (!ptr) { tool.position.y = lerp(tool.position.y, .25, dt * 5); stream.visible = false; } const c = layer.cov(); setMeter(c / (P.need || .8)); const b = $('doneB'); if (b) b.style.visibility = c > (P.need || .8) * .6 ? 'visible' : 'hidden';
    if (!cur.fin && c >= (P.need || .8)) done(1); },
  down(e) { if (cur.fin) return; A.ac(); setGuide(null); last = null; this.move(e); },
  move(e) { if (cur.fin || !ptr) return; const T2 = cur.T2; const wp = T2.parent.localToWorld(T2.pos.clone()); const p = onPlane(e, wp.y); if (!p) return;
    tool.position.set(p.x - ST.position.x, wp.y + (P.tool === 'bottle' ? .03 : P.tool === 'dipper' ? .08 : .005), p.z); if (P.tool === 'bottle') tool.rotation.set(0, 0, 0);
    if (P.tool === 'dipper' || P.tool === 'bottle') { stream.visible = true; const top = P.tool === 'bottle' ? .04 : .0; const len = tool.position.y + top - wp.y; stream.scale.set(1, len, 1); stream.position.set(tool.position.x, wp.y + len / 2, tool.position.z); }
    const lp = layer.m.worldToLocal(p.clone()); const steps = last ? Math.ceil(last.distanceTo(lp) / (P.rad * .4)) : 1; for (let i = 1; i <= steps; i++) { const q = last ? last.clone().lerp(lp, i / steps) : lp; layer.paint(q.x, -q.y, P.rad); } last = lp;
    if (Math.random() < .3) (P.tool === 'bottle' ? SFX.squeeze : () => A.noise(.08, 'lowpass', 500, 2, .05))(); },
  up() { last = null; },
  end() { ST.remove(tool); ST.remove(stream); } }; }

// --- sprinkle (drag) / place (tap) ---
const SPR = {
  cheese: { e: '🧀', txt: T('פזרו גבינה על כל הפיצה', 'Sprinkle cheese all over the pizza'), need: 90, drag: true, make() { const m = new THREE.Mesh(new THREE.CapsuleGeometry(.004, .03, 3, 6), phys('#ffe9a0', { roughness: .4 })); return m; }, rot: true },
  berries: { e: '🫐', txt: T('הקישו כדי לשים פירות יער', 'Tap to add berries'), need: 8, make() { const blue = Math.random() < .6; const m = new THREE.Mesh(new THREE.SphereGeometry(blue ? .016 : .02, 16, 12), phys(blue ? '#2a3870' : '#d8203e', { roughness: blue ? .45 : .5, sheen: blue ? .6 : .2, sheenColor: C('#a0b0e0'), clearcoat: blue ? 0 : .3 })); return shadowAll(m); } },
  herbs: { e: '🌿', txt: T('פזרו תבלינים ירוקים', 'Sprinkle some herbs'), need: 40, drag: true, make() { return new THREE.Mesh(new THREE.BoxGeometry(.008, .002, .005), std(pick(['#3a8a2a', '#5aa83a', '#2a6a1c']))); }, rot: true },
  sausage: { e: '🌭', txt: T('הקישו על הפיצה כדי לשים פרוסות נקניק', 'Tap the pizza to place sausage slices'), need: 7, make() { const m = sliceMesh('sausage', .03, .008); return m; } },
  olive: { e: '🫒', txt: T('הקישו על הפיצה כדי לשים זיתים', 'Tap the pizza to place olives'), need: 8, flat: true, lift: .006, make() { const m = new THREE.Mesh(new THREE.TorusGeometry(.014, .0068, 10, 22), phys('#2c2822', { roughness: .22, clearcoat: .9 })); m.userData.noBake = true; return shadowAll(m); } },
  onion: { e: '🧅', txt: T('פזרו בצל מטוגן', 'Sprinkle crispy onions'), need: 30, drag: true, make() { const m = new THREE.Mesh(new THREE.TorusGeometry(.008, .003, 4, 10, 4), std('#d8902a', { roughness: .6 })); return m; }, rot: true },
};
function stSprinkle(kind, tgt) { const P = SPR[kind]; let cnt = 0, acc = 0, falls = [], last = 0; const cells = new Set(); return { k: P.drag ? 'drag' : 'tap',
  start() { const R = RUN.R; if (R.dish.parent !== ST) { newStation(); ST.add(R.dish); R.dish.position.copy(W); } cur.T2 = R.surf[tgt];
    showPanel(inst(P.e, P.txt) + meterHTML([.98, 1], P.e, false, '')); setMeter(0); setGuide(P.drag ? 'drag' : 'tap', () => cur.T2.parent.localToWorld(cur.T2.pos.clone()).add(V3(0, .04, 0))); },
  spawn(p) { const T2 = cur.T2; const wp = T2.parent.localToWorld(T2.pos.clone()); const lp = T2.parent.worldToLocal(p.clone()); const dx = lp.x - T2.pos.x, dz = lp.z - T2.pos.z; const R0 = T2.w / 2 * .92;
    if (T2.round ? Math.hypot(dx, dz) > R0 : (Math.abs(dx) > T2.w / 2 * .9 || Math.abs(dz) > T2.h / 2 * .9)) return false;
    const m = P.make(); m.position.set(lp.x, T2.pos.y + .1, lp.z); if (P.rot) m.rotation.set(Math.PI / 2 + rnd(-.3, .3), 0, rnd(0, TAU)); else if (P.flat) m.rotation.set(Math.PI / 2, 0, 0); else m.rotation.y = rnd(0, TAU); T2.parent.add(m); (RUN.R.bits = RUN.R.bits || []).push(m);
    falls.push({ m, y: T2.pos.y + (T2.top || .004) + (kind === 'sausage' ? .004 : P.lift || 0) + Math.random() * .003, v: 0 }); cnt++; cells.add(Math.round(dx / .05) * 99 + Math.round(dz / .05)); setMeter(cnt / P.need);
    if (cnt >= P.need && !cur.fin) setTimeout(() => done(clamp(cells.size / (P.drag ? Math.min(14, Math.max(3, T2.w * T2.h / .0025 * .45)) : 5), .5, 1)), 300); return true; },
  update(dt) { for (let i = falls.length - 1; i >= 0; i--) { const f = falls[i]; f.v += dt * 4; f.m.position.y -= f.v * dt; if (f.m.position.y <= f.y) { f.m.position.y = f.y; falls.splice(i, 1); if (!P.drag) SFX.pop(); } } },
  down(e) { if (cur.fin) return; A.ac(); setGuide(null); const T2 = cur.T2; const wp = T2.parent.localToWorld(T2.pos.clone()); const p = onPlane(e, wp.y); if (!p) return; if (!P.drag) { if (this.spawn(p)) buzz(10); else toast(T('על האוכל 😉', 'On the food 😉')); } else this.move(e); },
  move(e) { if (cur.fin || !ptr || !P.drag) return; const T2 = cur.T2; const wp = T2.parent.localToWorld(T2.pos.clone()); const p = onPlane(e, wp.y); if (!p) return; const now = performance.now(); if (now - last < 18) return; last = now;
    for (let i = 0; i < 2; i++) this.spawn(p.clone().add(V3(rnd(-.03, .03), 0, rnd(-.03, .03)))); if (Math.random() < .3) A.noise(.05, 'highpass', 5000, 1, .03); } }; }

// --- assemble (drag ingredients onto the dish, in order) ---
function stAssemble(layers, opt = {}) { let k = 0, flying = null, drag = null, mist = 0, ring; const falls = []; return { k: 'asm',
  start() { const R = RUN.R; if (R.dish.parent !== ST) { newStation(); ST.add(R.dish); R.dish.position.copy(W); } R.stackY = R.stackY || .04;
    ring = new THREE.Mesh(new THREE.RingGeometry(.15, .175, 48), new THREE.MeshBasicMaterial({ color: '#7ad84a', transparent: true, opacity: .55, depthWrite: false, toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.visible = false; R.dish.add(ring);
    showPanel(inst('👆', opt.txt || T('גררו את המצרכים אל הצלחת לפי הסדר', 'Drag the ingredients onto the plate in order')) + `<div class="chips2">${layers.map((l, i) => `<button class="ing${i === 0 ? ' nx' : ''}" data-i="${i}" style="touch-action:none">${l.e}</button>`).join('')}</div>`);
    pin.querySelector('.chips2').onpointerdown = e => { const b = e.target.closest('.ing'); if (!b || cur.fin || flying || drag || b.classList.contains('dn')) return; e.preventDefault(); const i = +b.dataset.i; if (i !== k) { if (i > k) { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); mist++; A.voice('hm', 1.5); bearMood('think', .8); } return; } this.grab(b, e); };
    setGuide('drag', () => { const b = pin.querySelector('.ing.nx'); if (!b || drag || flying) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * .6 }; }); },
  grab(b, e) { A.ac(); setGuide(null); const R = RUN.R; const L = layers[k]; const m = L.make(); R.dish.add(m); drag = { m, b, L, x0: e.clientX, y0: e.clientY, far: false }; b.classList.add('dn'); SFX.pop(); this.dmove(e);
    this._mv = ev => this.dmove(ev); this._up = ev => this.drop(ev); addEventListener('pointermove', this._mv); addEventListener('pointerup', this._up); addEventListener('pointercancel', this._up); },
  unhook() { removeEventListener('pointermove', this._mv); removeEventListener('pointerup', this._up); removeEventListener('pointercancel', this._up); },
  dmove(e) { if (!drag || !RUN) return; const R = RUN.R; if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 18) drag.far = true; const p = onPlane(e, .15); if (!p) return; const lp = R.dish.worldToLocal(p.clone()); drag.m.position.set(lp.x, Math.max(R.stackY + .1, .17), lp.z); drag.m.rotation.y = Math.sin(performance.now() / 200) * .15; },
  drop(e) { if (!drag) return; this.unhook(); const R = RUN.R; const { m, b, L, far } = drag; drag = null; ring.visible = false;
    if (Math.hypot(m.position.x, m.position.z) < .19) { flying = { m, t: 0, from: m.position.clone(), to: V3(0, L.y != null ? L.y : R.stackY + (L.off || 0), 0), h: L.h || 0 }; SFX.whoosh(); return; }
    b.classList.remove('dn');
    if (!far) { R.dish.remove(m); toast(T('גררו אל הצלחת 👆', 'Drag it onto the plate 👆')); setGuide('drag', () => { const bb = pin.querySelector('.ing.nx'); if (!bb || drag || flying) return null; const r = bb.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * .6 }; }); return; }
    falls.push({ m, v: 0, t: 0, land: false }); oops(T('נפל! 😅 שימו מעל הצלחת', 'It fell! 😅 Drop it over the plate'), '😅'); },
  update(dt) { const R = RUN.R; if (drag) { ring.visible = drag.far; ring.position.y = R.stackY + .004; const over = Math.hypot(drag.m.position.x, drag.m.position.z) < .19; ring.material.color.set(over ? '#5ad83a' : '#ffb04a'); ring.material.opacity = over ? .75 : .4; }
    for (let i = falls.length - 1; i >= 0; i--) { const f = falls[i]; if (!f.land) { f.v += dt * 3.2; f.m.position.y -= f.v * dt; f.m.rotation.z += dt * 3; if (f.m.position.y <= .012) { f.m.position.y = .012; f.land = true; SFX.plop(); buzz(15); } } else { f.t += dt; if (f.t > .5) f.m.scale.multiplyScalar(Math.pow(.02, dt * 2)); if (f.t > 1.4) { f.m.parent && f.m.parent.remove(f.m); falls.splice(i, 1); } } }
    if (!flying) return; const f = flying; f.t = Math.min(1, f.t + dt * 3.2); const e = ease(f.t); f.m.position.lerpVectors(f.from, f.to, e); f.m.rotation.y = (1 - e) * .5;
    if (f.t >= 1) { R.stackY += f.h; flying = null; SFX.plop(); buzz(12); f.m.scale.set(1.08, .8, 1.08); setTimeout(() => f.m.scale.set(1, 1, 1), 110); k++; const nb = pin.querySelector(`.ing[data-i="${k}"]`); if (nb) nb.classList.add('nx'); if (k >= layers.length) done(clamp(1 - mist * .08, .6, 1)); else setGuide('drag', () => { const bb = pin.querySelector('.ing.nx'); if (!bb || drag || flying) return null; const r = bb.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * .6 }; }); } },
  end() { this.unhook(); if (ring && ring.parent) ring.parent.remove(ring); falls.forEach(f => f.m.parent && f.m.parent.remove(f.m)); } }; }

// --- press the meatball into a patty ---
function stPress() { let ball, n = 0; const N = 4; return { k: 'press',
  start() { newStation(); const b = mkBoard(); b.position.copy(W); ST.add(b); ball = new THREE.Mesh(new THREE.SphereGeometry(.07, 36, 24), phys('#c25a5e', { map: MEATN, roughness: .7, bumpMap: MEATN, bumpScale: 2 })); ball.position.set(W.x, .035 + .07, W.z); ST.add(shadowAll(ball)); cur.ball = ball;
    showPanel(inst('✋', T('לחצו על כדור הבשר כדי לשטח אותו לקציצה', 'Press the meatball to flatten it into a patty') + ` <b style="color:#e8732a">0/${N}</b>`)); setGuide('tap', () => ball.getWorldPosition(V3()).add(V3(0, .04, 0))); },
  update() { },
  down(e) { if (cur.fin || n >= N) return; const c = toScr(ball.getWorldPosition(V3())); if (Math.hypot(c.x - e.clientX, c.y - e.clientY) > 110) return; A.ac(); setGuide(null); n++; const p = n / N; const sy0 = ball.scale.y, sx0 = ball.scale.x, sy = lerp(1, .27, p), sx = lerp(1, 1.68, p);
    tween(.16, k => { const o = Math.sin(k * Math.PI) * .12; ball.scale.set(lerp(sx0, sx, k) + o, Math.max(.2, lerp(sy0, sy, k) - o), lerp(sx0, sx, k) + o); ball.position.y = .035 + .07 * ball.scale.y; });
    SFX.plop(); A.tone(110, .1, 'sine', .2, 0, 60); buzz(18); FX.burst(V3(W.x, .05, W.z), 6, [rgb('#e8a090')], .4, .012, .4, 3); const bb = pin.querySelector('.inst b'); if (bb) bb.textContent = `${n}/${N}`; if (n >= N) setTimeout(() => done(1), 450); } }; }

// --- roll out the pizza dough ---
function stRoll() { let rp, base, dome, acc = 0, lastZ = null; const NEED = 2.4; return { k: 'roll',
  start() { newStation(); const R = RUN.R; const d = new THREE.Group(); R.dish = d; R.surf = {}; const board = new THREE.Mesh(new THREE.CylinderGeometry(.33, .33, .02, 64), std('#ffffff', { map: ctex(woodCanvas(256, 256, [200, 150, 96], 4)), roughness: .6 })); board.position.y = .01; board.userData.plate = true; d.add(shadowAll(board)); base = pizzaBase(); base.position.y = .02; d.add(base); R.base = base; d.position.copy(W); ST.add(d); R.surf.top = { parent: d, pos: V3(0, .0365, 0), w: .5, h: .5, round: true, top: .002 }; dome = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 16, 0, TAU, 0, Math.PI / 2), base.children[0].material); d.add(shadowAll(dome)); this.shape(0);
    rp = new THREE.Group(); const wm = std('#e8c090', { roughness: .55 }); const c = new THREE.Mesh(new THREE.CylinderGeometry(.032, .032, .4, 28), wm); c.rotation.z = Math.PI / 2; rp.add(c); for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(.013, .013, .1, 12), std('#c8905a', { roughness: .5 })); h.rotation.z = Math.PI / 2; h.position.x = sx * .25; rp.add(h); } rp.position.set(W.x, .12, W.z + .2); ST.add(shadowAll(rp)); cur.rp = rp;
    showPanel(inst('🫓', T('גלגלו את המערוך קדימה ואחורה כדי לרדד את הבצק', 'Roll the pin back and forth to flatten the dough')) + meterHTML([.98, 1], '🫓', false, '')); setMeter(0); setGuide('swipe', () => rp.getWorldPosition(V3()).add(V3(0, .04, 0))); },
  shape(p) { const e = eOut(p); const sx = lerp(.42, 1, e); base.scale.set(sx, lerp(2, 1, e), sx); if (base.userData.crust) base.userData.crust.visible = e > .75; if (dome) { const h = lerp(.075, 0, e); dome.visible = h > .002; dome.scale.set(.28 * sx * .98, Math.max(.001, h), .28 * sx * .98); dome.position.y = .02 + .016 * base.scale.y - .001; } },
  update(dt) { const top = .02 + .016 * base.scale.y; if (!ptr) rp.position.y = lerp(rp.position.y, top + .032 + .03, dt * 8); else rp.position.y = lerp(rp.position.y, top + .032, dt * 20); },
  down(e) { if (cur.fin) return; A.ac(); setGuide(null); lastZ = null; this.move(e); },
  move(e) { if (cur.fin || !ptr) return; const p = onPlane(e, .06); if (!p) return; const z = clamp(p.z, W.z - .32, W.z + .32); rp.position.z = z;
    if (lastZ != null) { const dz = z - lastZ; const r = .28 * base.scale.x + .06; if (Math.abs(z - W.z) < r) acc += Math.abs(dz); rp.rotation.x += dz / .032; if (Math.abs(dz) > .004 && Math.random() < .35) { FX.emit(V3(W.x + rnd(-.18, .18), .05, z), V3(rnd(-.1, .1), rnd(.1, .3), rnd(-.1, .1)), rgb('#fffaf0'), rnd(.01, .02), .5, 1.5, .9); A.noise(.05, 'lowpass', 500, 1, .04); } }
    lastZ = z; const pr = Math.min(1, acc / NEED); this.shape(pr); setMeter(pr); if (pr >= 1) { ST.remove(rp); done(1); } },
  up() { lastZ = null; },
  end() { if (rp.parent) ST.remove(rp); this.shape(1); } }; }

// --- automatic plating ---
function stAuto(fn, icon, txt) { return { start() { showPanel(inst(icon, txt)); setGuide(null); fn(); }, update() { }, delay: 300 }; }

// --- bake in the oven ---
function stBake() { let oven, d = 0, hot = 0, door, inside, burning = false; const band = [.62, .9], MX = 1.3; return { k: 'bake', view: 'oven',
  start() { newStation(); const R = RUN.R; oven = new THREE.Group(); const body = std('#e8e2da', { roughness: .4, metalness: .2 }); const sh = (w, h, dd, x, y, z, m = body) => { const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, dd, 3, .01), m); b.position.set(x, y, z); oven.add(b); return b; };
    sh(.9, .04, .6, 0, .02, 0); sh(.9, .04, .6, 0, .5, 0); sh(.04, .5, .6, -.43, .26, 0); sh(.2, .5, .6, .35, .26, 0); sh(.9, .5, .04, 0, .26, -.28, std('#3a2a22'));
    const inM = new THREE.MeshBasicMaterial({ color: '#ffb060', transparent: true, opacity: 0 }); inside = new THREE.Mesh(new THREE.BoxGeometry(.64, .42, .52), Object.assign(inM, { side: THREE.BackSide })); inside.position.set(-.08, .26, 0); oven.add(inside);
    door = new THREE.Mesh(new THREE.BoxGeometry(.66, .44, .015), phys('#2a2a2a', { transparent: true, opacity: .22, roughness: .05, clearcoat: 1, depthWrite: false })); door.position.set(-.08, .26, .305); oven.add(door);
    const hd = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .5, 10), std('#b8bcc4', { metalness: .9, roughness: .3 })); hd.rotation.z = Math.PI / 2; hd.position.set(-.08, .44, .34); oven.add(hd);
    for (const y of [.36, .26, .16]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .02, 18), std('#3a3a3a')); k.rotation.x = Math.PI / 2; k.position.set(.35, y, .31); oven.add(k); }
    const rack = new THREE.Mesh(new THREE.BoxGeometry(.6, .005, .48), std('#888', { metalness: .9, roughness: .4 })); rack.position.set(-.08, .1, 0); oven.add(rack);
    oven.position.set(W.x, 0, W.z - .1); ST.add(shadowAll(oven)); R.dish.scale.setScalar(.85); R.dish.position.set(-.08, .105, 0); oven.add(R.dish); cur.ol = new THREE.PointLight('#ff8a3a', 0, 1.2, 2); cur.ol.position.set(-.08, .35, 0); oven.add(cur.ol);
    showPanel(inst('🔥', T('אופים! הוציאו כשהגבינה זהובה', 'Baking! Take it out when the cheese is golden')) + meterHTML([band[0] / MX, band[1] / MX], '🍕', true, '') + `<div class="pbtns"><button class="btn pri" id="outB">${T('🧤 להוציא!', '🧤 Take out!')}</button></div>`); $('outB').onclick = () => this.act(); },
  update(dt, t) { if (cur.fin) return; hot = Math.min(1, hot + dt); if (!burning) d += dt * .14; setMeter(d / MX); inside.material.opacity = hot * (.25 + Math.sin(t * 6) * .03); cur.ol.intensity = hot * 1.4; const R = RUN.R;
    (R.bits || []).forEach(b => { if (Array.isArray(b.material) || b.userData.noBake) return; if (b.userData.ch == null) b.userData.ch = b.material.color.clone(); b.material.color.copy(b.userData.ch).lerp(C(d > 1 ? '#5a3010' : '#e8a84a'), clamp(d * .5, 0, d > 1 ? .9 : .55)); if (b.geometry.type === 'CapsuleGeometry') b.scale.set(1 + d * .6, 1, 1 + d * .4); });
    R.base.userData.crust.material.color.copy(C('#f0d090').lerp(C(d > 1 ? '#5a3010' : '#c87a30'), clamp(d, 0, 1.2) * .8)); $('outB').classList.toggle('blink', d >= band[0] && d <= band[1]); if (Math.random() < dt * 6) A.noise(.05, 'highpass', 6000, 1, .015);
    if (d > MX && !burning) this.burn(); },
  burn() { burning = true; d = 1.5; const c = oven.getWorldPosition(V3()).add(V3(-.08, .5, .2)); for (let i = 0; i < 30; i++) FX.emit(c.clone().add(V3(rnd(-.25, .25), 0, rnd(-.05, .05))), V3(rnd(-.05, .05), rnd(.2, .5), rnd(0, .1)), rgb('#4a4a4a'), rnd(.08, .15), 1.8, -.05, .3, .99);
    oops(T('אוי! הפיצה נשרפה 🔥 אופים שוב', 'Oh no! The pizza burnt 🔥 Bake it again'), '🔥'); setTimeout(() => { if (cur.fin) return; d = 0; burning = false; }, 1800); },
  act() { if (cur.fin || burning) return; if (d < band[0] - .3) { toast(T('עוד לא… חכו שהגבינה תימס', 'Not yet… wait for the cheese to melt')); return; } SFX.ding(); const q = clamp(1 - Math.max(0, band[0] - d, d - band[1]) * 2.6, .2, 1); RUN.R.baked = d;
    const R = RUN.R; setTimeout(() => { R.dish.scale.setScalar(1); }, 600); done(q); },
  end() { const R = RUN.R; newStation(); ST.add(R.dish); R.dish.scale.setScalar(1); R.dish.position.set(W.x, 0, W.z); R.dish.rotation.set(0, 0, 0); } }; }

// --- cut the pizza ---
function stCut(n = 2) { let k = 0, a0 = null, wheel, anim = null; const angs = []; return { k: 'cut',
  start() { const R = RUN.R; if (R.dish.parent !== ST) { newStation(); ST.add(R.dish); R.dish.position.copy(W); }
    wheel = new THREE.Group(); const w = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .004, 32), phys('#dfe4ea', { metalness: 1, roughness: .2 })); w.rotation.x = Math.PI / 2; wheel.add(w); const h = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .12, 10), std('#e8442a')); h.position.set(0, .07, .0); h.rotation.x = -.6; h.position.z = .05; wheel.add(h); wheel.position.set(W.x + .35, .1, W.z); ST.add(shadowAll(wheel));
    showPanel(inst('🍕', T('החליקו לאורך הפיצה כדי לחתוך', 'Swipe across the pizza to cut it') + ` <b style="color:#e8732a">0/${n}</b>`)); setGuide('line', () => W.clone().add(V3(0, .05, 0))); },
  update(dt) { if (!anim) return; anim.t = Math.min(1, anim.t + dt * 1.8); const e = ease(anim.t); const p = anim.a.clone().lerp(anim.b, e); wheel.position.set(p.x - ST.position.x, .065, p.z); wheel.rotation.y = -anim.ang; wheel.children[0].rotation.y += dt * 20;
    anim.line.scale.x = Math.max(.001, e); const mid = anim.a.clone().lerp(p, .5); anim.line.position.set(mid.x - W.x, .043, mid.z - W.z); if (Math.random() < .3) A.noise(.04, 'bandpass', 1800, 2, .05);
    if (anim.t >= 1) { anim = null; k++; const b = pin.querySelector('.inst b'); if (b) b.textContent = `${k}/${n}`; if (k >= n) setTimeout(() => done(1), 300); } },
  down(e) { if (cur.fin || anim) return; a0 = onPlane(e, .03); },
  up(e) { if (cur.fin || anim || !a0) return; const b = onPlane(e, .03); if (!b) return; const d = b.clone().sub(a0); if (d.length() < .1) { a0 = null; return; } setGuide(null); A.ac(); { const nn = V3(-d.z, 0, d.x).normalize(); if (Math.abs(W.clone().sub(a0).setY(0).dot(nn)) > .095) { oops(T('עקום! חתכו דרך האמצע של הפיצה', 'Crooked! Cut through the middle of the pizza'), '😬'); a0 = null; setTimeout(() => { if (!cur.fin) setGuide('line', () => W.clone().add(V3(0, .05, 0))); }, 1200); return; } }
    let ang = Math.atan2(d.z, d.x); if (angs.some(x => Math.abs(Math.sin(x - ang)) < .3)) ang += Math.PI / n; angs.push(ang); const c = W.clone(); const dir = V3(Math.cos(ang), 0, Math.sin(ang)); const pa = c.clone().addScaledVector(dir, -.27), pb = c.clone().addScaledVector(dir, .27);
    const line = new THREE.Mesh(new THREE.BoxGeometry(.54, .004, .006), std('#5a2a10', { roughness: .8 })); line.rotation.y = -ang; RUN.R.dish.add(line); anim = { a: pa, b: pb, t: 0, ang, line }; RUN.R.cuts = (RUN.R.cuts || 0) + 1; a0 = null; } }; }

// --- serve to the bear ---
function stServe() { let t = 0, ph = 0, chomps = 0; return { k: 'serve', view: 'serve',
  start() { const R = RUN.R; panel.hidden = true; setGuide(null); if (R.dish.parent !== ST) { newStation(); ST.add(R.dish); R.dish.position.copy(W); } scene.attach(R.dish); cur.from = R.dish.position.clone(); cur.to = V3(0, 0, -.36); bearMood('hungry'); B.look.copy(R.dish.position); bearSay(T('זה בשבילי?! 🤩', 'Is that for me?! 🤩'), 1500); A.voice('wow', 1.6); },
  update(dt) { const R = RUN.R; t += dt; const d = R.dish; if (ph === 0) { const k = ease(Math.min(1, t / 1.1)); d.position.lerpVectors(cur.from, cur.to, k); d.position.y = Math.sin(k * Math.PI) * .05; B.look.copy(d.position); if (k >= 1) { ph = 1; t = 0; bearMood('eat'); } }
    else if (ph === 1) { const nC = Math.floor(t / .42); if (nC > chomps) { chomps = nC; SFX.chomp(); FX.burst(B.head.getWorldPosition(V3()).add(V3(0, -.12, .32)), 6, [rgb('#e8b868'), rgb('#ffffff'), rgb('#c8782a')], .7, .02, .6, 4); d.children.forEach(c => { if (c.userData.plate) return; c.scale.multiplyScalar(.86); }); }
      if (t > 2.6) { ph = 2; t = 0; const q = RUN.q.length ? RUN.q.reduce((a, b) => a + b, 0) / RUN.q.length : 1; cur.stars = q > .9 ? 3 : q > .72 ? 2 : 1; const st = cur.stars; d.children.forEach(c => { if (!c.userData.plate) c.visible = false; });
        if (st === 3) { bearMood('love', 3.2); SFX.win(); A.voice('yay', 1.6); bearSay(pick(BEARTALK.y3), 2600); FX.burst(B.head.getWorldPosition(V3()).add(V3(0, .1, .2)), 40, [rgb('#ff4a7a'), rgb('#ffd23a'), rgb('#ff8ab0')], 2.2, .05, 1.5, 2.5); flash(.35); }
        else if (st === 2) { bearMood('yum', 2.6); A.voice('yay', 1.5); bearSay(pick(BEARTALK.y2), 2400); }
        else { bearMood('idle'); A.voice('hm', 1.5); bearSay(pick(BEARTALK.y1), 2400); } } }
    else if (ph === 2 && t > 2.4 && !cur.fin) { cur.fin = true; showResult(cur.stars); } } }; }

const TW = []; function tween(dur, fn, end, delay = 0) { TW.push({ t: -delay, dur, fn, end }); }
function tweenTick(dt) { for (let i = TW.length - 1; i >= 0; i--) { const w = TW[i]; w.t += dt; if (w.t < 0) continue; const k = Math.min(1, w.t / w.dur); w.fn(k); if (k >= 1) { TW.splice(i, 1); w.end && w.end(); } } }
/* ================= recipes ================= */
function plateDish() { const R = RUN.R; const d = new THREE.Group(); const p = mkPlate(); p.userData.plate = true; p.children.forEach(c => c.userData.plate = true); d.add(p); R.dish = d; R.surf = {}; return d; }
const RECIPES = [
  { id: 'pancakes', e: '🥞', n: T('פנקייק דבש', 'Honey pancakes'), steps: () => [
    () => stCrack('bowl'), () => stPour('milk', [.5, .78]), () => stPour('flour', [.5, .78]), () => stStir('#f2d9a4'), () => stFry('pancake', 1),
    () => stAuto(() => { const R = RUN.R; newStation(); const d = plateDish(); d.position.copy(W); ST.add(d); const ck = R.cooked.pancake; for (let i = 0; i < 3; i++) { const pc = pancakeMesh('#' + C(ck.top).getHexString()); pc.userData.top.color.setHex(ck.top); pc.position.y = .45 + i * .2; pc.rotation.y = rnd(0, 3); d.add(pc); const y = .036 + i * .029; pc.visible = false; tween(.42, k => { pc.visible = true; pc.position.y = lerp(.5, y, k * k); }, () => { SFX.plop(); pc.scale.set(1.06, .7, 1.06); tween(.15, k => pc.scale.set(lerp(1.06, 1, k), lerp(.7, 1, k), lerp(1.06, 1, k))); }, i * .38); }
      R.surf.top = { parent: d, pos: V3(0, .036 + 2 * .029 + .0145 + .001, 0), w: .33, h: .33, round: true, top: .006 }; setTimeout(() => done(null), 1300); }, '🥞', T('עורמים את הפנקייקים…', 'Stacking the pancakes…')),
    () => stPaint('honey', 'top'), () => stSprinkle('berries', 'top'), () => stServe()] },
  { id: 'burger', e: '🍔', n: T('המבורגר', 'Burger'), steps: () => [
    () => stPress(), () => stFry('patty', 1), () => stCrack('pan'), () => stFry('egg', 0), () => stSlice('tomato', 3), () => stSlice('cucumber', 5),
    () => { const s = stAssemble([{ e: '🥬', h: .012, make: () => lettuceMesh(.15) }, { e: '🥩', h: .036, off: .018, make: () => { const m = pattyMesh('#6a3a22'); const ck = RUN.R.cooked.patty; m.userData.top.color.setHex(ck ? ck.top : 0x6a3a22); return m; } }, { e: '🍳', h: .016, off: .004, make: () => { const e = friedEgg(); e.userData.white.opacity = 1; e.scale.setScalar(1.2); e.rotation.y = 1; return e; } },
      { e: '🍅', h: .012, off: .006, make: () => { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const s2 = sliceMesh('tomato', .06, .011); s2.position.set(Math.cos(i * 2.1) * .05, i * .002, Math.sin(i * 2.1) * .05); g.add(s2); } return g; } },
      { e: '🥒', h: .01, off: .005, make: () => { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const s2 = sliceMesh('cucumber', .038, .008); s2.position.set(Math.cos(i * 1.6) * .06, i * .001, Math.sin(i * 1.6) * .06); g.add(s2); } return g; } },
      { e: '🍞', h: .09, make: () => bunHalf(true) }]); const st0 = s.start; s.start = () => { newStation(); const d = plateDish(); d.position.copy(W); ST.add(d); const bb = bunHalf(false); bb.position.y = .022; d.add(bb); RUN.R.stackY = .062; st0.call(s); }; return s; },
    () => stServe()] },
  { id: 'pizza', e: '🍕', n: T('פיצה', 'Pizza'), steps: () => [
    () => stRoll(), () => stPaint('sauce', 'top'), () => stSprinkle('cheese', 'top'), () => stSprinkle('olive', 'top'), () => stBake(), () => stCut(2), () => stServe()] },
  { id: 'breakfast', e: '🍳', n: T('ארוחת בוקר', 'Breakfast'), steps: () => [
    () => stCrack('pan'), () => stFry('egg', 0), () => stSlice('tomato', 4),
    () => { const s = stPaint('butter', 'toast'); const s0 = s.start; s.start = () => { newStation(); const R = RUN.R; const d = plateDish(); const tst = toastMesh(); tst.position.set(-.08, .05, .02); tst.rotation.y = .25; d.add(tst); R.toast = tst; R.surf.toast = { parent: tst, pos: V3(0, .0145, 0), w: .19, h: .2, round: false }; d.position.copy(W); ST.add(d); s0.call(s); }; return s; },
    () => stAuto(() => { const R = RUN.R; const d = R.dish; const e = R.egg; d.attach(e); e.position.set(.1, .042, -.04); e.rotation.set(0, 0, 0); e.scale.setScalar(.9); for (let i = 0; i < 4; i++) { const s2 = sliceMesh('tomato', .055, .011); s2.position.set(.08 + i * .03, .05 + i * .003, .12 - i * .01); s2.rotation.x = -.15; d.add(s2); } R.surf.all = { parent: d, pos: V3(0, .07, 0), w: .44, h: .44, round: true, top: -.01 }; SFX.plop(); setTimeout(() => done(null), 900); }, '🍽️', T('מסדרים יפה בצלחת…', 'Plating it nicely…')),
    () => stSprinkle('herbs', 'all'), () => stServe()] },
  { id: 'salad', e: '🥗', n: T('סלט צבעוני', 'Rainbow salad'), steps: () => [
    () => stSlice('cucumber', 5), () => stSlice('tomato', 3), () => stSlice('carrot', 6),
    () => { const s = stStir('#ffffff', true); const s0 = s.start; s.start = () => { newStation(); const R = RUN.R; const b = mkBowl(.24, '#fff', true); const BS = { g: b, r: .24, liq: new THREE.Object3D(), blobs: [], lvl: 0 }; b.position.copy(W); ST.add(b); R.bowl = BS; const pcs = new THREE.Group(); pcs.position.y = .05; b.add(pcs); BS.pieces = pcs;
      const lt = lettuceMesh(.17); lt.position.y = .01; pcs.add(lt); const add = (food, r, n2) => { for (let i = 0; i < n2; i++) { const m = sliceMesh(food, r, .01); const a = rnd(0, TAU), rr = rnd(0, .13); m.position.set(Math.cos(a) * rr, .02 + rnd(0, .03), Math.sin(a) * rr); m.rotation.set(rnd(-.5, .5), 0, rnd(-.5, .5)); m.userData.y = m.position.y; pcs.add(m); } };
      add('cucumber', .038, 8); add('tomato', .05, 5); add('carrot', .03, 8); lt.userData.y = .01; R.dish = b; s0.call(s); }; return s; },
    () => stPour('dressing', [.45, .75], 'salad'), () => stServe()] },
  { id: 'hotdog', e: '🌭', n: T('נקניקייה', 'Hot dog'), steps: () => [
    () => stFry('sausage', 1),
    () => { const s = stAssemble([{ e: '🌭', y: .08, make: () => { const m = sausageMesh('#a8502a'); m.userData.top.color.setHex(RUN.R.cooked.sausage.top); return m; } }], { txt: T('גררו את הנקניקייה אל הלחמנייה', 'Drag the sausage into the bun') }); const s0 = s.start; s.start = () => { newStation(); const R = RUN.R; const d = plateDish(); d.position.copy(W); ST.add(d); const bn = bunDog(); bn.position.y = .03; d.add(bn); R.surf.dog = { parent: d, pos: V3(0, .108, 0), w: .3, h: .07, round: false }; R.stackY = .08; s0.call(s); }; return s; },
    () => stPaint('ketchup', 'dog'), () => stPaint('mustard', 'dog'), () => stSprinkle('onion', 'dog'), () => stServe()] },
];
const recUnlocked = i => i === 0 || S.stars[RECIPES[i - 1].id] > 0 || S.stars[RECIPES[i].id] > 0;

/* ================= flow ================= */
let state = 'title';
function clearKitchen() { TW.length = 0; if (stOld) { scene.remove(stOld); stOld = null; } ST.clear(); ST.position.set(0, 0, 0); stK = 1; if (RUN && RUN.R.dish && RUN.R.dish.parent) RUN.R.dish.parent.remove(RUN.R.dish); A.allOff(); warm.intensity = 0; }
function startRecipe(i) { const r = RECIPES[i]; clearKitchen(); $('title').hidden = true; $('bookSheet').hidden = true; $('resSheet').hidden = true; $('hud').hidden = false; state = 'cook';
  RUN = { rec: r, idx: i, steps: r.steps(), i: 0, q: [], R: {} }; $('recT').textContent = r.e + ' ' + r.n; coinsUI(); bearMood('idle'); bearSay(pick(BEARTALK.hi), 1600); A.startMusic({ chords: [[53, 57, 60, 64], [50, 53, 57, 60], [55, 58, 62, 65], [48, 52, 55, 59]], bpm: 78, lead: true, vol: .55 });
  setView('work', 1); startStep(); }
function showResult(st) { state = 'result'; const r = RUN.rec; const prev = S.stars[r.id] || 0; const coins = st * 10 + (st > prev ? 10 : 0); S.coins += coins; S.stars[r.id] = Math.max(prev, st); S.cooked++; S.save(); coinsUI();
  const next = RUN.idx + 1 < RECIPES.length ? RUN.idx + 1 : -1; const newly = next >= 0 && prev === 0;
  $('resCard').innerHTML = `<div class="rbig">${r.e}</div><h3>${r.n}</h3><div class="st">${[1, 2, 3].map(i => `<i class="${i <= st ? 'on' : ''}" style="animation-delay:${i * .2}s">⭐</i>`).join('')}</div>
    <p>${st === 3 ? T('הדובי מאוהב! מושלם! 💖', 'The cub is in love! Perfect! 💖') : st === 2 ? T('יאמי! כמעט מושלם 😋', 'Yummy! Almost perfect 😋') : T('טעים! נסו שוב בשביל 3 כוכבים', 'Tasty! Try again for 3 stars')}</p><div class="cn">+${coins} 🪙</div>
    ${newly ? `<p style="color:#e8442a">${T('🔓 מתכון חדש נפתח:', '🔓 New recipe unlocked:')} ${RECIPES[next].e} ${RECIPES[next].n}</p>` : ''}
    <div class="row" style="margin-top:12px">${next >= 0 ? `<button class="btn pri" id="rNext">${T('למתכון הבא', 'Next recipe')} ${RECIPES[next].e}</button>` : ''}<button class="btn" id="rAgain">${T('🔁 שוב', '🔁 Again')}</button><button class="btn" id="rBook">${T('📖 ספר מתכונים', '📖 Cookbook')}</button></div>`;
  $('resSheet').hidden = false; if (st === 3) A.tone(1319, .4, 'triangle', .08, .5);
  if ($('rNext')) $('rNext').onclick = () => startRecipe(next); $('rAgain').onclick = () => startRecipe(RUN.idx); $('rBook').onclick = () => { $('resSheet').hidden = true; showBook(); }; }
function showBook() { $('bookT').textContent = T('📖 ספר המתכונים של הדובי', '📖 The cub’s cookbook'); $('bookX').textContent = T('סגירה', 'Close');
  $('book').innerHTML = RECIPES.map((r, i) => { const u = recUnlocked(i), s = S.stars[r.id] || 0; return `<button class="rc${u ? '' : ' lk'}${u && !s ? ' nw' : ''}" data-new="${T('חדש', 'NEW')}" data-i="${i}"><span class="e">${r.e}</span><b>${r.n}</b><small>${[1, 2, 3].map(k => k <= s ? '⭐' : '☆').join('')}</small></button>`; }).join('');
  $('bookSheet').hidden = false; }
$('book').onclick = e => { const b = e.target.closest('.rc'); if (!b) return; const i = +b.dataset.i; if (!recUnlocked(i)) { toast(T('סיימו את המתכון הקודם כדי לפתוח', 'Finish the previous recipe to unlock')); return; } A.ac(); SFX.pop(); startRecipe(i); };
$('bookX').onclick = () => { $('bookSheet').hidden = true; if (state !== 'title') showTitle(); };
function showHats() { $('hatT').textContent = T('🎩 הארון של הדובי', '🎩 The cub’s closet'); $('hatX').textContent = T('סגירה', 'Close');
  $('hats').innerHTML = Object.entries(HATS).map(([k, h]) => `<button class="hat${S.hat === k ? ' on' : ''}" data-k="${k}"><span class="e">${h.e}</span>${h.n}<span class="p">${S.hats.includes(k) ? (S.hat === k ? '✔' : '') : h.p + ' 🪙'}</span></button>`).join(''); $('hatSheet').hidden = false; }
$('hats').onclick = e => { const b = e.target.closest('.hat'); if (!b) return; const k = b.dataset.k; A.ac(); if (!S.hats.includes(k)) { if (S.coins < HATS[k].p) { toast(T('צריך עוד מטבעות – בשלו עוד מתכונים! 🪙', 'Need more coins – cook more recipes! 🪙')); return; } S.coins -= HATS[k].p; S.hats.push(k); SFX.win(); }
  S.hat = k; S.save(); setHat(k); bearCheer(); showHats(); statUI(); };
$('hatX').onclick = () => { $('hatSheet').hidden = true; };
function statUI() { const st = Object.values(S.stars).reduce((a, b) => a + b, 0); $('stat').innerHTML = `<span>🪙 ${S.coins}</span><span>⭐ ${st}/${RECIPES.length * 3}</span>`; }
function showTitle() { clearKitchen(); state = 'title'; RUN = null; cur = null; $('hud').hidden = true; panel.hidden = true; setGuide(null); $('resSheet').hidden = true; $('title').hidden = false; statUI(); setView('title', 1.1); bearMood('idle'); B.look.set(0, .5, 2); A.stopMusic();
  // a little showcase dish on the counter
  const d = new THREE.Group(); const p = mkPlate(.22); d.add(p); for (let i = 0; i < 3; i++) { const pc = pancakeMesh('#d8953e'); pc.scale.setScalar(.8); pc.position.y = .036 + i * .024; pc.rotation.y = i; d.add(pc); } const hn = new THREE.Mesh(new THREE.SphereGeometry(.1, 24, 12, 0, TAU, 0, Math.PI / 2), phys('#e8a020', { roughness: .05, clearcoat: 1, transparent: true, opacity: .85 })); hn.scale.set(1.1, .12, 1.1); hn.position.y = .1; d.add(hn);
  for (let i = 0; i < 6; i++) { const m = SPR.berries.make(); const a = i / 6 * TAU; m.position.set(Math.cos(a) * .06, .112, Math.sin(a) * .06); d.add(m); } d.position.set(.0, 0, -.28); ST.add(d); }

/* ================= input ================= */
stageEl.addEventListener('pointerdown', e => { A.ac(); ptr = { id: e.pointerId }; try { stageEl.setPointerCapture(e.pointerId); } catch (er) { } if (state === 'cook' && cur && cur.down) cur.down(e); });
stageEl.addEventListener('pointermove', e => { if (state === 'cook' && cur && cur.move) cur.move(e); if (state === 'cook' && cur && !cur.fin) { const p = onPlane(e, .05); if (p && ptr) B.look.lerp(p, .2); } });
const upH = e => { if (state === 'cook' && cur && cur.up) cur.up(e); ptr = null; }; stageEl.addEventListener('pointerup', upH); stageEl.addEventListener('pointercancel', upH);

/* ================= loop ================= */
let last = performance.now();
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000) * (window.__fast || 1); last = now; const t = now / 1000;
  stationTick(dt); tweenTick(dt); if (state === 'cook' && cur) { cur.t += dt; cur.update && cur.update(dt, t); if (!ptr && !cur.fin && cur.item) B.look.lerp(cur.item.getWorldPosition(V3()), dt * 3); }
  bearTick(t, dt); bulbs.forEach((b, i) => b.material.color.setScalar(1.6 + Math.sin(t * 2 + i * 1.7) * .6).multiply(C(i % 3 === 0 ? '#ffd27a' : i % 3 === 1 ? '#ffb0a0' : '#fff0b0')));
  if (state === 'title' && ST.children[0]) ST.children[0].rotation.y += dt * .4;
  camUpdate(dt); placeBub(); guideTick(); FX.update(dt, -.2); A.tick(); E.render(); }

/* ================= boot ================= */
$('backBtn').innerHTML = ICO.grid('#e8732a'); $('homeT').innerHTML = ICO.home('#e8732a'); soundButton('sndBtn', S, A, '#e8732a'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('backBtn').onclick = () => { $('resSheet').hidden = true; showTitle(); };
$('tSub').textContent = T('מבשלים צעד אחר צעד – שוברים ביצים, חותכים, מטגנים ומקשטים – ומאכילים את הדובי הרעב!', 'Cook step by step – crack, slice, fry and decorate – and feed the hungry cub!');
$('cookBtn').textContent = T('🍳 בואו נבשל!', '🍳 Let’s cook!'); $('hatBtn').textContent = T('🎩 הארון של הדובי', '🎩 The cub’s closet');
$('cookBtn').onclick = () => { A.ac(); SFX.pop(); showBook(); }; $('hatBtn').onclick = () => { A.ac(); SFX.pop(); showHats(); };
setTimeout(() => { E.resize(); viewPose('title', CAM); CAM.k = 1; showTitle(); CAM.k = 1; $('loading').hidden = true; requestAnimationFrame(frame); window.__cubOK = true; }, 30);
window.__cub = { VIEWS, setView, get state() { return state; }, get cur() { return cur; }, get RUN() { return RUN; }, startRecipe, RECIPES, B, S, done: q => done(q), onPlane, toScr, W };
