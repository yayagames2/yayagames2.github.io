import { THREE, $, V3, C, clamp, lerp, rng, T, EN, store, std, audio, toast, ICO, hubButtons, soundButton, qualityButton, starsHTML, cnv, ctex } from '../lib/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const S = store('spot-save', { stars: {}, tier: 0 });
const A = audio(S);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = S.q !== 'low'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const PR = S.q === 'ultra' ? Math.min(2, devicePixelRatio || 1) : S.q === 'high' ? Math.min(1.5, devicePixelRatio || 1) : 1; renderer.setPixelRatio(PR);
$('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(42, 1, .1, 80);
{ const es = new THREE.Scene(); const bx = new THREE.BoxGeometry(30, 14, 30); const cols = []; const p = bx.attributes.position; for (let i = 0; i < p.count; i++) { const c = C(p.getY(i) > 0 ? '#fff8ee' : '#c8b8a8').multiplyScalar(.4); cols.push(c.r, c.g, c.b); }
  bx.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); es.add(new THREE.Mesh(bx, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }))); const pl = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshBasicMaterial({ color: C('#fff').multiplyScalar(2) })); pl.position.set(-4, 6, 6); pl.lookAt(0, 0, 0); es.add(pl);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, .03).texture; pm.dispose(); }
const hemi = new THREE.HemisphereLight(C('#fff6ec'), C('#b89a80'), .7); scene.add(hemi);
const sun = new THREE.DirectionalLight(C('#fff1dc'), 2.2); sun.position.set(-4, 8, 6); sun.castShadow = true; sun.shadow.mapSize.set(S.q === 'ultra' ? 2048 : 1024, S.q === 'ultra' ? 2048 : 1024); Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 }); sun.shadow.bias = -.0005; sun.shadow.normalBias = .02; scene.add(sun);

/* ---------- builder DSL ---------- */
let R = Math.random, G = null, ITEMS = [];
const pick = a => a[Math.floor(R() * a.length)];
const PAL = ['#ff5a6a', '#ffb13a', '#ffe14a', '#5fd36a', '#3aa8ff', '#8a6bff', '#ff7ab8', '#2fd3c0', '#ff8a3d', '#ffffff', '#4a5a7a'];
const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: C(c), roughness: .55 }, o));
function mesh(geo, c, x, y, z, par, o = {}) { const m = new THREE.Mesh(geo, c.isMaterial ? c : mat(c, o)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; (par || G).add(m); return m; }
const box = (w, h, d, c, x, y, z, p, r = .03) => mesh(r ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2) * .99) : new THREE.BoxGeometry(w, h, d), c, x, y, z, p);
const cyl = (rt, rb, h, c, x, y, z, p, s = 20) => mesh(new THREE.CylinderGeometry(rt, rb, h, s), c, x, y, z, p);
const sph = (r, c, x, y, z, p) => mesh(new THREE.SphereGeometry(r, 20, 14), c, x, y, z, p);
const cone = (r, h, c, x, y, z, p, s = 16) => mesh(new THREE.ConeGeometry(r, h, s), c, x, y, z, p);
const tor = (r, t, c, x, y, z, p, arc = Math.PI * 2) => mesh(new THREE.TorusGeometry(r, t, 10, 28, arc), c, x, y, z, p);
function item(name, x, y, z, fn, o = {}) { const g = new THREE.Group(); g.position.set(x, y, z); g.userData.item = true; g.userData.name = name; g.userData.asym = !!o.asym; g.userData.mov = o.mov !== false; G.add(g); const main = fn(g); g.userData.main = main || g.children[0]; ITEMS.push(g); if (o.ry) g.rotation.y = o.ry; return g; }
function art() { const c = cnv(128, 96), g = c.getContext('2d'); g.fillStyle = pick(['#fff4e0', '#e0f0ff', '#f0ffe8', '#ffe8f0']); g.fillRect(0, 0, 128, 96); for (let k = 0; k < 4; k++) { g.fillStyle = pick(PAL); const t = Math.floor(R() * 3); if (t === 0) { g.beginPath(); g.arc(R() * 128, R() * 96, 10 + R() * 22, 0, 7); g.fill(); } else if (t === 1) g.fillRect(R() * 100, R() * 70, 20 + R() * 40, 14 + R() * 30); else { g.beginPath(); g.moveTo(R() * 128, 96); g.lineTo(R() * 128, R() * 40); g.lineTo(R() * 128, 96); g.fill(); } } const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; }
function texPattern(a, b, kind, rep = 4) { const c = cnv(128, 128), g = c.getContext('2d'); g.fillStyle = a; g.fillRect(0, 0, 128, 128); g.fillStyle = b;
  if (kind === 'plank') { for (let y = 0; y < 128; y += 32) { g.fillRect(0, y, 128, 2); g.fillRect((y * 3) % 128, y, 2, 32); } }
  else if (kind === 'check') { for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) if ((x + y) % 2) g.fillRect(x * 64, y * 64, 64, 64); }
  else if (kind === 'stripe') { for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 16, 128); }
  else if (kind === 'dots') { for (let y = 16; y < 128; y += 32) for (let x = 16; x < 128; x += 32) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); } }
  else if (kind === 'grain') { for (let i = 0; i < 1400; i++) { g.globalAlpha = .25; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); } g.globalAlpha = 1; }
  else if (kind === 'stars') { g.font = '22px Arial'; for (let i = 0; i < 9; i++) g.fillText('★', Math.random() * 110, 20 + Math.random() * 108); }
  return ctex(c, rep, rep); }
const FLOORS = [['#e3b98a', '#c99a6a', 'plank'], ['#ffffff', '#3a3f4a', 'check'], ['#b8d8ff', '#a8c8f0', 'grain'], ['#f2d0b0', '#e0b890', 'check'], ['#d8e8d0', '#c0d8b8', 'plank'], ['#c8a0e0', '#b088d0', 'grain'], ['#9a6a4a', '#7a5038', 'plank']];
const WALLS = [['#ffe4d0', '#ffd3b8', 'stripe'], ['#fff4d8', '#ffffff', 'dots'], ['#e8e0ff', '#ffffff', 'stars'], ['#d8f4ec', '#bfe8dc', 'stripe'], ['#ffe0ec', '#ffffff', 'dots'], ['#e0ecff', '#c8dcff', 'stripe'], ['#fff0c8', '#ffe0a0', 'dots']];
function room(floorA, floorB, fk, wallA, wallB, wk, opts = {}) { if (R() < .85) { [floorA, floorB, fk] = pick(FLOORS); [wallA, wallB, wk] = pick(WALLS); opts = Object.assign({}, opts, { trim: pick(['#ffffff', '#ff8a5a', '#8a6bff', '#2fd3c0', '#ffd23a']) }); } const fl = mesh(new THREE.PlaneGeometry(9, 7), new THREE.MeshStandardMaterial({ map: texPattern(floorA, floorB, fk, 4), roughness: .6 }), 0, 0, 0); fl.rotation.x = -Math.PI / 2; fl.castShadow = false;
  const wm = new THREE.MeshStandardMaterial({ map: texPattern(wallA, wallB, wk, 3), roughness: .9 }); const bw = mesh(new THREE.PlaneGeometry(9, 4.2), wm, 0, 2.1, -3); bw.castShadow = false; const lw = mesh(new THREE.PlaneGeometry(7, 4.2), wm, -4.5, 2.1, .5); lw.rotation.y = Math.PI / 2; lw.castShadow = false;
  box(9, .14, .06, opts.trim || '#ffffff', 0, .07, -2.97, null, 0); const b2 = box(7, .14, .06, opts.trim || '#ffffff', -4.47, .07, .5, null, 0); b2.rotation.y = Math.PI / 2; }

/* ---------- themes ---------- */
const THEMES = [
  { id: 'living', n: T('סלון', 'Living room'), cam: [3.2, 3.6, 6.2], tgt: [-.6, .9, -.6], build() {
    room('#e3b98a', '#c99a6a', 'plank', '#ffe4d0', '#ffd3b8', 'stripe');
    const sc = pick(['#5a8aff', '#ff7a6a', '#4fc3a1', '#a46bff']);
    item('sofa', -1, 0, -2.3, g => { const m = box(2.6, .45, .9, sc, 0, .35, 0, g, .08); box(2.6, .7, .25, sc, 0, .7, -.38, g, .08); for (const s of [-1, 1]) box(.25, .55, .9, sc, s * 1.25, .45, 0, g, .08); return m; });
    for (let k = 0; k < 3; k++) item('cushion', -1.8 + k * .8, .66, -2.42, g => box(.5, .42, .16, pick(PAL), 0, 0, 0, g, .07), { mov: false });
    item('table', -.6, 0, -.6, g => { const t = box(1.5, .08, .8, '#8a5a3a', 0, .48, 0, g, .02); for (const [x, z] of [[-.65, -.32], [.65, -.32], [-.65, .32], [.65, .32]]) cyl(.035, .035, .46, '#6a4028', x, .23, z, g); return t; });
    item('mug', -1.05, .52, -.55, g => { const m = cyl(.08, .07, .16, pick(PAL), 0, .08, 0, g); tor(.05, .015, m.material, .09, .08, 0, g); return m; }, { asym: true });
    item('books', -.35, .52, -.7, g => { let y = 0; let m; for (let k = 0; k < 3; k++) { const h = .05 + R() * .03; const b = box(.36 - k * .04, h, .26, pick(PAL), 0, y + h / 2, 0, g, .01); b.rotation.y = (R() - .5) * .4; y += h; if (!m) m = b; } return m; });
    item('vase', -.05, .52, -.45, g => { const v = cyl(.07, .1, .28, pick(PAL), 0, .14, 0, g); for (let k = 0; k < 3; k++) { cyl(.006, .006, .25, '#3a8a3a', (k - 1) * .04, .38, 0, g, 4); sph(.05, pick(['#ff5a6a', '#ffe14a', '#ffffff']), (k - 1) * .05, .52, 0, g); } return v; });
    item('lamp', 1.6, 0, -2.3, g => { cyl(.18, .2, .04, '#2a2a33', 0, .02, 0, g); cyl(.02, .02, 1.5, '#2a2a33', 0, .77, 0, g); const s = cone(.28, .35, pick(['#fff2c8', '#ffd0e0', '#c8f0ff']), 0, 1.6, 0, g, 24); return s; });
    item('rug', -.5, .005, .3, g => { const r = mesh(new THREE.CircleGeometry(1.3, 40), pick(['#ffb0c0', '#b0d8ff', '#fff0a0', '#c8f0c8']), 0, 0, 0, g); r.rotation.x = -Math.PI / 2; r.castShadow = false; return r; }, { mov: false });
    for (let k = 0; k < 2; k++) item('frame', -2 + k * 1.6, 2.2 + (k ? .15 : 0), -2.96, g => { box(.9, .7, .05, pick(['#d6b25e', '#2a2a33', '#ffffff', '#8a5a3a']), 0, 0, 0, g, .01); const p = mesh(new THREE.PlaneGeometry(.78, .58), new THREE.MeshStandardMaterial({ map: art(), roughness: .8 }), 0, 0, .03, g); return p; }, { mov: false });
    item('clock', -4.46, 2.4, -.6, g => { const c = cyl(.3, .3, .05, pick(PAL), 0, 0, 0, g, 28); c.rotation.z = Math.PI / 2; const f = cyl(.25, .25, .06, '#ffffff', .01, 0, 0, g, 28); f.rotation.z = Math.PI / 2; const h = box(.02, .18, .02, '#222', .05, .06, 0, g, 0); h.rotation.x = .6; return c; }, { mov: false });
    item('shelf', -4.25, 1.3, 1.2, g => { const s = box(.35, .06, 1.4, '#8a5a3a', 0, 0, 0, g, .01); for (let k = 0; k < 6; k++) { const h = .22 + R() * .12; box(.2, h, .1, pick(PAL), 0, h / 2 + .03, -.55 + k * .2, g, .01); } return s; }, { mov: false });
    item('plant', 2.2, 0, -1.6, g => { const p = cyl(.2, .15, .35, pick(['#ffffff', '#ff8a5a', '#5a8aff']), 0, .17, 0, g); for (let k = 0; k < 7; k++) { const l = sph(.18, '#3fae5a', Math.cos(k) * .15, .55 + R() * .3, Math.sin(k) * .15, g); l.scale.set(.5, 1, .3); l.rotation.z = Math.cos(k) * .6; } return p; });
    item('cat', .4, .02, .6, g => { const b = sph(.22, pick(['#ff9a3a', '#2a2a33', '#ffffff', '#9a9aa8']), 0, .16, 0, g); b.scale.set(1.4, .8, 1); const h = sph(.13, b.material, .3, .26, 0, g); for (const s of [-1, 1]) cone(.04, .08, b.material, .32, .38, s * .07, g, 6); cyl(.03, .03, .4, b.material, -.35, .1, .1, g, 6).rotation.z = 1.3; return b; }, { asym: true });
    item('ball', 1.3, .15, .9, g => sph(.15, pick(PAL), 0, 0, 0, g));
    item('window', 1.2, 2.3, -2.97, g => { const f = box(1.2, 1.1, .06, '#ffffff', 0, 0, 0, g, .01); mesh(new THREE.PlaneGeometry(1.05, .95), new THREE.MeshBasicMaterial({ color: '#bfe6ff' }), 0, 0, .035, g); box(.04, .95, .02, '#ffffff', 0, 0, .05, g, 0); for (const s of [-1, 1]) box(.28, 1.3, .05, pick(['#ff7a8a', '#7ab8ff', '#ffd27a']), s * .72, -.05, .06, g, .02); return f; }, { mov: false });
  } },
  { id: 'garden', n: T('גינה', 'Garden'), cam: [2.8, 3.4, 6.4], tgt: [-.4, .8, -.8], sky: '#9fdcff', build() {
    const gr = mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ map: texPattern('#7fd16a', '#6cc25a', 'grain', 6), roughness: .95 }), 0, 0, 0); gr.rotation.x = -Math.PI / 2; gr.castShadow = false;
    for (let x = -4.5; x <= 4.5; x += .5) { box(.12, .9, .06, '#ffffff', x, .45, -3, null, .02); } box(9.4, .08, .05, '#ffffff', 0, .7, -2.96, null, 0); box(9.4, .08, .05, '#ffffff', 0, .3, -2.96, null, 0);
    for (const [x, z] of [[-3, -2.4], [2.8, -2.2]]) item('tree', x, 0, z, g => { cyl(.12, .18, 1.6, '#8a5a3a', 0, .8, 0, g); const c = sph(.9, pick(['#3fae5a', '#58c26a', '#2f9a4a']), 0, 2.1, 0, g); sph(.6, c.material, .5, 1.8, .2, g); sph(.6, c.material, -.5, 1.9, -.1, g); return c; }, { mov: false });
    for (let k = 0; k < 6; k++) item('flower', -3.6 + k * 1.3 + R() * .3, 0, -1.9 + R() * .4, g => { cyl(.015, .015, .5, '#3a8a3a', 0, .25, 0, g, 4); const c = pick(PAL.slice(0, 8)); for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2; sph(.07, c, Math.cos(a) * .08, .52, Math.sin(a) * .08, g); } return sph(.05, '#ffe14a', 0, .53, 0, g); });
    item('blanket', -.4, .01, .4, g => { const b = mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshStandardMaterial({ map: texPattern(pick(['#ff5a6a', '#3aa8ff', '#ffb13a']), '#ffffff', 'check', 3), roughness: .9 }), 0, 0, 0, g); b.rotation.x = -Math.PI / 2; b.castShadow = false; return b; }, { mov: false });
    item('basket', -1.1, 0, .1, g => { const b = cyl(.32, .26, .3, '#c8904a', 0, .15, 0, g); const h = tor(.28, .025, '#a06a30', 0, .3, 0, g, Math.PI); return b; });
    for (let k = 0; k < 3; k++) item('apple', .1 + k * .32, .1, .5 + (k % 2) * .25, g => { const a = sph(.1, pick(['#ff3b3b', '#7ad35a', '#ffd23a']), 0, 0, 0, g); cyl(.01, .01, .06, '#6a4028', 0, .11, 0, g, 4); return a; });
    item('sandwich', -.3, .03, .9, g => { box(.36, .05, .26, '#f2c88a', 0, 0, 0, g, .02); box(.38, .03, .28, '#5fd36a', 0, .04, 0, g, .01); return box(.36, .05, .26, '#f2c88a', 0, .08, 0, g, .02); }, { asym: true });
    for (let k = 0; k < 2; k++) item('butterfly', -1.8 + k * 3, 1.3 + R() * .5, -.6 + R(), g => { const c = pick(PAL); for (const s of [-1, 1]) { const w = sph(.12, c, s * .1, 0, 0, g); w.scale.set(1, .15, .8); w.rotation.z = s * .4; } return cyl(.015, .015, .15, '#222', 0, 0, 0, g, 4); });
    item('bench', 2.2, 0, -1, g => { const s = box(1.4, .08, .45, pick(['#8a5a3a', '#3aa8ff', '#ff7a6a']), 0, .45, 0, g, .02); box(1.4, .35, .06, s.material, 0, .75, -.2, g, .02); for (const x of [-.6, .6]) box(.06, .45, .4, '#3a3a44', x, .22, 0, g, 0); return s; }, { asym: true });
    item('birdhouse', -3, 1.5, -1.5, g => { const b = box(.3, .32, .3, pick(PAL), 0, 0, 0, g, .02); const r = cone(.28, .2, '#8a3a3a', 0, .26, 0, g, 4); r.rotation.y = Math.PI / 4; cyl(.05, .05, .02, '#222', 0, .02, .16, g, 12).rotation.x = Math.PI / 2; return b; }, { mov: false });
    item('can', 1.2, 0, .3, g => { const c = cyl(.15, .17, .3, pick(['#3aa8ff', '#5fd36a', '#ff5a6a']), 0, .15, 0, g); const sp = cyl(.025, .03, .35, c.material, .2, .28, 0, g, 8); sp.rotation.z = -1; return c; }, { asym: true });
    for (let k = 0; k < 2; k++) item('mushroom', 1.8 + k * .5, 0, .9 - k * .3, g => { cyl(.05, .06, .15, '#fff4e0', 0, .07, 0, g, 10); const c = sph(.14, pick(['#ff3b3b', '#ffb13a', '#a46bff']), 0, .16, 0, g); c.scale.y = .6; return c; });
    item('rock', 2.6, 0, .4, g => { const r = mesh(new THREE.DodecahedronGeometry(.22, 0), '#9aa0a8', 0, .12, 0, g); r.scale.set(1.3, .7, 1); return r; });
    item('sun', 1.6, 3.6, -3.5, g => mesh(new THREE.SphereGeometry(.4, 20, 14), new THREE.MeshBasicMaterial({ color: C('#ffd84a').multiplyScalar(1.4) }), 0, 0, 0, g), { mov: false });
  } },
  { id: 'beach', n: T('חוף', 'Beach'), cam: [2.6, 3.2, 6.6], tgt: [-.3, .7, -.8], sky: '#8fd8ff', build() {
    const sd = mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ map: texPattern('#f6dca0', '#e8c888', 'grain', 6), roughness: .95 }), 0, 0, 0); sd.rotation.x = -Math.PI / 2; sd.castShadow = false;
    const sea = mesh(new THREE.PlaneGeometry(16, 6), new THREE.MeshStandardMaterial({ color: '#2fa8e8', roughness: .15, metalness: .2 }), 0, .02, -4.5); sea.rotation.x = -Math.PI / 2; sea.castShadow = false;
    const foam = mesh(new THREE.PlaneGeometry(16, .25), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 0, .03, -1.55); foam.rotation.x = -Math.PI / 2; foam.castShadow = false;
    item('umbrella', -1.6, 0, -.8, g => { cyl(.025, .025, 1.8, '#ffffff', 0, .9, 0, g, 8); const top = cone(1.0, .45, pick(['#ff5a6a', '#ffb13a', '#3aa8ff']), 0, 1.8, 0, g, 12); top.material.map = texPattern(top.material.color.getStyle(), '#ffffff', 'stripe', 2); top.material.color.set('#ffffff'); return top; }, { mov: false });
    item('towel', -1.2, .01, .3, g => { const t = mesh(new THREE.PlaneGeometry(.9, 1.7), new THREE.MeshStandardMaterial({ map: texPattern(pick(['#ff7ab8', '#2fd3c0', '#8a6bff']), '#ffffff', 'stripe', 2), roughness: .9 }), 0, 0, 0, g); t.rotation.x = -Math.PI / 2; t.castShadow = false; return t; }, { mov: false });
    item('ball', .2, .22, .6, g => { const b = sph(.22, '#ffffff', 0, 0, 0, g); b.material.map = texPattern(pick(['#ff3b3b', '#3aa8ff', '#ffd23a']), '#ffffff', 'stripe', 1); return b; });
    item('bucket', .9, 0, .2, g => { const b = cyl(.18, .14, .28, pick(['#ff5a6a', '#ffd23a', '#3aa8ff', '#5fd36a']), 0, .14, 0, g); tor(.17, .012, '#ffffff', 0, .3, 0, g, Math.PI); return b; });
    item('shovel', 1.25, .02, .5, g => { const s = box(.08, .02, .5, pick(PAL), 0, 0, 0, g, 0); box(.18, .03, .18, s.material, 0, 0, .3, g, .01); return s; }, { asym: true });
    item('castle', 1.6, 0, -.6, g => { const b = box(.8, .35, .6, '#f0cc88', 0, .17, 0, g, .02); for (const [x, z] of [[-.35, -.25], [.35, -.25], [-.35, .25], [.35, .25]]) { cyl(.11, .12, .55, '#f0cc88', x, .27, z, g, 12); cone(.13, .2, '#e8bc70', x, .64, z, g, 12); } const fl = box(.14, .1, .01, pick(['#ff3b3b', '#3aa8ff']), .07, .9, 0, g, 0); cyl(.008, .008, .3, '#6a4028', 0, .78, 0, g, 4); return b; });
    for (let k = 0; k < 3; k++) item('shell', -2.4 + k * .9, .03, 1 + (k % 2) * .4, g => { const s = sph(.1, pick(['#ffd0e0', '#fff4e0', '#ffb08a']), 0, 0, 0, g); s.scale.set(1, .4, 1.2); return s; });
    item('palm', -3.4, 0, -1.8, g => { const t = cyl(.1, .16, 2.4, '#a8784a', 0, 1.2, 0, g, 10); t.rotation.z = .12; for (let k = 0; k < 6; k++) { const l = sph(.6, '#3fae5a', Math.cos(k) * .45 + .15, 2.35, Math.sin(k) * .45, g); l.scale.set(1, .1, .3); l.rotation.y = -k; l.rotation.z = -.3; } for (let k = 0; k < 2; k++) sph(.1, '#6a4028', .1 + k * .1, 2.2, .1, g); return t; }, { mov: false });
    item('crab', 2.4, .08, .8, g => { const b = sph(.16, '#ff4a3a', 0, 0, 0, g); b.scale.set(1.3, .6, 1); for (const s of [-1, 1]) { sph(.07, b.material, s * .25, .05, .12, g); sph(.03, '#222', s * .06, .1, .14, g); } return b; });
    item('boat', 1.8, .1, -4.2, g => { const h = box(1.2, .25, .45, pick(['#ffffff', '#ff5a6a', '#ffd23a']), 0, 0, 0, g, .1); cyl(.02, .02, 1.1, '#6a4028', 0, .6, 0, g, 6); const s = cone(.4, .9, '#ffffff', .18, .65, 0, g, 3); s.scale.z = .1; return h; }, { asym: true, mov: false });
    item('surf', 2.7, 0, -1.2, g => { const s = box(.45, 1.9, .07, pick(['#ff7ab8', '#2fd3c0', '#ffb13a']), 0, .95, 0, g, .2); s.rotation.x = -.15; return s; });
    item('star', -.4, .02, 1.3, g => { const s = new THREE.Shape(); for (let k = 0; k < 10; k++) { const r = k % 2 ? .07 : .17, a = k / 10 * Math.PI * 2; s.lineTo(Math.cos(a) * r, Math.sin(a) * r); } const m = mesh(new THREE.ExtrudeGeometry(s, { depth: .04, bevelEnabled: false }), pick(['#ff8a3d', '#ff5a6a', '#ffb13a']), 0, 0, 0, g); m.rotation.x = -Math.PI / 2; return m; });
    item('glasses', -1.1, .04, -.2, g => { for (const s of [-1, 1]) { const l = cyl(.07, .07, .02, '#1c1c28', s * .1, 0, 0, g, 16); } return box(.08, .02, .02, pick(['#ff3b3b', '#1c1c28', '#3aa8ff']), 0, 0, 0, g, 0); }, { asym: false });
  } },
  { id: 'kitchen', n: T('מטבח', 'Kitchen'), cam: [3.0, 3.5, 6.2], tgt: [-.6, 1.0, -.8], build() {
    room('#ffffff', '#3a3f4a', 'check', '#fff4d8', '#ffffff', 'dots', { trim: '#ff8a5a' });
    const cc = pick(['#7ab8ff', '#ff9a8a', '#8ad8b0', '#ffd27a']);
    box(4.6, .9, .7, cc, -.6, .45, -2.6, null, .03); box(4.7, .06, .76, '#f4f4f4', -.6, .93, -2.6, null, .01);
    item('fridge', -3.8, 0, -2.4, g => { const f = box(.9, 2.1, .8, pick(['#ffffff', '#ff8a8a', '#8ad0ff']), 0, 1.05, 0, g, .08); box(.04, .5, .04, '#c8ccd4', .38, 1.4, .42, g, 0); box(.04, .4, .04, '#c8ccd4', .38, .5, .42, g, 0); return f; }, { mov: false });
    for (let k = 0; k < 3; k++) item('magnet', -4.0 + k * .2, 1.6 + (k % 2) * .25, -1.98, g => sph(.06, pick(PAL), 0, 0, 0, g), {});
    item('stove', .5, .96, -2.55, g => { const s = box(.9, .04, .6, '#2a2a33', 0, 0, 0, g, .01); for (const [x, z] of [[-.22, -.14], [.22, -.14], [-.22, .14], [.22, .14]]) tor(.08, .015, '#5a5a66', x, .03, z, g).rotation.x = Math.PI / 2; return s; }, { mov: false });
    item('pot', .28, .98, -2.68, g => { const p = cyl(.18, .16, .24, pick(['#ff5a3a', '#3aa8ff', '#c8ccd4']), 0, .12, 0, g); cyl(.19, .19, .03, p.material, 0, .26, 0, g); return p; });
    item('kettle', .74, .98, -2.42, g => { const k = sph(.15, pick(['#ffd23a', '#ff7ab8', '#ffffff']), 0, .14, 0, g); k.scale.y = .9; const sp = cyl(.02, .035, .16, k.material, .15, .16, 0, g, 8); sp.rotation.z = -.9; tor(.08, .015, '#2a2a33', 0, .3, 0, g, Math.PI); return k; }, { asym: true });
    item('bowl', -1.6, .96, -2.5, g => { const b = mesh(new THREE.SphereGeometry(.26, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), pick(['#ffffff', '#5fd0ff', '#ffb0c0']), 0, .2, 0, g); b.material.side = THREE.DoubleSide; for (let k = 0; k < 4; k++) sph(.08, pick(['#ff3b3b', '#ffd23a', '#7ad35a', '#ff8a3d']), (k % 2 - .5) * .16, .16 + (k > 1 ? .08 : 0), (k > 1 ? .05 : -.05), g); return b; });
    item('board', -.6, .97, -2.4, g => { const b = box(.5, .03, .32, '#c8904a', 0, 0, 0, g, .01); box(.12, .05, .06, '#ff8a3d', -.08, .04, 0, g, .02); return b; }, { asym: true });
    item('plates', -2.4, .96, -2.5, g => { let m; for (let k = 0; k < 4; k++) { const p = cyl(.18, .14, .025, '#ffffff', 0, .015 + k * .03, 0, g, 24); if (!m) m = p; } m.material.color.set(pick(['#ffffff', '#bfe6ff', '#ffe0a8'])); return m; });
    for (let k = 0; k < 3; k++) item('jar', -2.8 + k * .28, 1.6, -2.85, g => { const j = cyl(.09, .09, .22, '#ffffff', 0, 0, 0, g, 16); j.material = new THREE.MeshStandardMaterial({ color: pick(['#ffd27a', '#ff9a8a', '#c8f0a8', '#d0c0ff']), roughness: .3 }); cyl(.095, .095, .05, '#8a5a3a', 0, .13, 0, g, 16); return j; });
    box(1.2, .05, .3, '#ffffff', -2.5, 1.48, -2.85, null, .01);
    item('clock', -.2, 2.6, -2.96, g => { const c = cyl(.28, .28, .05, pick(PAL), 0, 0, 0, g, 28); c.rotation.x = Math.PI / 2; const f = cyl(.23, .23, .06, '#ffffff', 0, 0, .01, g, 28); f.rotation.x = Math.PI / 2; box(.02, .16, .02, '#222', .04, .05, .05, g, 0).rotation.z = -.6; return c; }, { mov: false });
    for (let k = 0; k < 2; k++) item('pan', 1.3 + k * .55, 2.2, -2.94, g => { const p = cyl(.2, .2, .04, pick(['#2a2a33', '#c8ccd4', '#ff5a3a']), 0, 0, 0, g, 24); p.rotation.x = Math.PI / 2; box(.04, .4, .03, '#8a5a3a', 0, .38, 0, g, 0); return p; }, { mov: false });
    item('table', 1.0, 0, .2, g => { const t = box(1.4, .07, .9, '#e8c49a', 0, .72, 0, g, .02); for (const [x, z] of [[-.6, -.36], [.6, -.36], [-.6, .36], [.6, .36]]) cyl(.03, .03, .7, '#a07850', x, .35, z, g); return t; }, { mov: false });
    for (const s of [-1, 1]) item('chair', 1.0 + s * .95, 0, .2, g => { const c = box(.45, .06, .45, pick(['#ff7a6a', '#3aa8ff', '#ffd23a']), 0, .45, 0, g, .02); box(.06, .55, .45, c.material, -s * .2 * -1 * -1 * (s), .75, 0, g, .02).position.x = s * .2; for (const [x, z] of [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]]) cyl(.02, .02, .44, '#3a3a44', x, .22, z, g, 6); return c; }, { asym: true });
    item('cup', .75, .76, .05, g => { const m = cyl(.07, .06, .14, pick(PAL), 0, .07, 0, g); tor(.045, .014, m.material, .08, .07, 0, g); return m; }, { asym: true });
    item('plant', 1.4, .76, .35, g => { const p = cyl(.12, .09, .2, pick(['#ffffff', '#ff8a5a']), 0, .1, 0, g); for (let k = 0; k < 5; k++) { const l = sph(.1, '#3fae5a', Math.cos(k) * .07, .3 + R() * .1, Math.sin(k) * .07, g); l.scale.set(.5, 1, .4); } return p; });
  } },
  { id: 'toys', n: T('חדר ילדים', 'Kids room'), cam: [3.1, 3.6, 6.3], tgt: [-.6, .9, -.6], build() {
    room('#b8d8ff', '#a8c8f0', 'grain', '#e8e0ff', '#ffffff', 'stars', { trim: '#8a6bff' });
    item('bed', -2.8, 0, -1.9, g => { const b = box(1.4, .4, 2.0, '#ffffff', 0, .3, 0, g, .05); box(1.42, .12, 1.4, pick(['#ff9ac0', '#8ad0ff', '#ffd27a', '#a8e8a8']), 0, .55, .3, g, .05); box(1.5, .9, .1, '#8a6bff', 0, .55, -1, g, .04); return b; }, { mov: false });
    item('pillow', -2.8, .62, -2.55, g => box(.8, .18, .4, pick(['#ffffff', '#ffe0f0', '#e0f0ff']), 0, 0, 0, g, .08), { mov: false });
    item('shelf', -.2, 1.5, -2.88, g => { const s = box(1.8, .06, .3, '#ffffff', 0, 0, 0, g, .01); return s; }, { mov: false });
    item('robot', -.7, 1.53, -2.85, g => { const b = box(.2, .24, .14, pick(['#c8ccd4', '#5fd0ff', '#ffd23a']), 0, .14, 0, g, .03); box(.16, .14, .12, b.material, 0, .34, 0, g, .03); for (const s of [-1, 1]) sph(.025, '#ff3b3b', s * .04, .35, .07, g); cyl(.008, .008, .1, '#222', 0, .46, 0, g, 4); return b; }, { asym: true });
    item('teddy', .1, 1.53, -2.85, g => { const c = pick(['#c98a5a', '#ffb0c0', '#ffffff']); const b = sph(.13, c, 0, .13, 0, g); sph(.1, c, 0, .32, 0, g); for (const s of [-1, 1]) sph(.04, c, s * .08, .41, 0, g); return b; });
    item('rocket', .55, 1.53, -2.85, g => { const b = cyl(.07, .08, .32, pick(['#ffffff', '#ff5a6a']), 0, .16, 0, g, 16); cone(.07, .14, pick(['#ff3b3b', '#3aa8ff']), 0, .39, 0, g, 16); for (let k = 0; k < 3; k++) { const f = box(.02, .1, .08, '#3aa8ff', Math.cos(k * 2.1) * .08, .05, Math.sin(k * 2.1) * .08, g, 0); f.rotation.y = -k * 2.1; } return b; });
    const L = ['A', 'B', 'C', 'D', 'E', 'ג', 'ד', 'א']; for (let k = 0; k < 4; k++) item('block', -.9 + k * .42, .17, .7 + (k % 2) * .2, g => { const c = cnv(64, 64), q = c.getContext('2d'); q.fillStyle = pick(PAL.slice(0, 9)); q.fillRect(0, 0, 64, 64); q.fillStyle = '#fff'; q.font = '900 44px Rubik, Arial'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(pick(L), 32, 34); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const b = mesh(new RoundedBoxGeometry(.32, .32, .32, 2, .03), new THREE.MeshStandardMaterial({ map: tx, roughness: .5 }), 0, 0, 0, g); b.rotation.y = (R() - .5); return b; });
    item('ball', 1.6, .2, .9, g => { const b = sph(.2, '#ffffff', 0, 0, 0, g); b.material.map = texPattern(pick(['#ff3b3b', '#3aa8ff', '#5fd36a']), '#ffffff', 'stripe', 1); return b; });
    for (let k = 0; k < 3; k++) item('train', .2 + k * .6, 0, -.4, g => { const c = box(.5, .25, .3, pick(['#ff3b3b', '#3aa8ff', '#ffd23a', '#5fd36a']), 0, .2, 0, g, .04); if (k === 0) cyl(.05, .05, .2, '#2a2a33', .15, .42, 0, g, 10); for (const x of [-.15, .15]) for (const s of [-1, 1]) cyl(.07, .07, .04, '#2a2a33', x, .07, s * .16, g, 12).rotation.x = Math.PI / 2; return c; }, { asym: k === 0 });
    for (let k = 0; k < 2; k++) item('poster', -1.8 + k * 3.0, 2.6, -2.96, g => { box(.8, 1.0, .03, '#ffffff', 0, 0, 0, g, .01); const p = mesh(new THREE.PlaneGeometry(.7, .9), new THREE.MeshStandardMaterial({ map: art() }), 0, 0, .02, g); return p; }, { mov: false });
    item('lamp', 2.3, 0, -1.8, g => { cyl(.15, .18, .05, '#ffffff', 0, .02, 0, g); cyl(.02, .02, 1.1, '#ffffff', 0, .55, 0, g); return sph(.22, pick(['#ffe14a', '#ff9ac0', '#8ad0ff']), 0, 1.2, 0, g); });
    item('drum', 2.0, 0, .2, g => { const d = cyl(.3, .3, .3, pick(['#ff3b3b', '#3aa8ff', '#8a6bff']), 0, .15, 0, g, 24); cyl(.31, .31, .02, '#ffffff', 0, .31, 0, g, 24); for (const s of [-1, 1]) { const st = cyl(.015, .015, .4, '#d6b25e', s * .12, .38, .1, g, 6); st.rotation.z = s * .8; } return d; });
    item('rug', -.2, .005, .4, g => { const r = mesh(new THREE.CircleGeometry(1.2, 6), pick(['#ffe14a', '#ff9ac0', '#8ad0ff', '#a8e8a8']), 0, 0, 0, g); r.rotation.x = -Math.PI / 2; r.castShadow = false; return r; }, { mov: false });
  } },
  { id: 'snow', n: T('שלג', 'Snow'), ic: '⛄', cam: [2.6, 3.4, 6.4], tgt: [-.3, .8, -.8], sky: '#cfe8ff', build() {
    const gr = mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ map: texPattern('#ffffff', '#e4eefa', 'grain', 6), roughness: .9 }), 0, 0, 0); gr.rotation.x = -Math.PI / 2; gr.castShadow = false;
    for (let k = 0; k < 5; k++) item('pine', -3.8 + k * 1.9 + R() * .4, 0, -2.5 + R() * .4, g => { cyl(.08, .1, .4, '#7a4a2a', 0, .2, 0, g); const c = cone(.6, 1.1, pick(['#2f8a5a', '#3aa06a', '#2a7a4a']), 0, .9, 0, g); cone(.45, .8, c.material, 0, 1.4, 0, g); cone(.25, .35, '#ffffff', 0, 1.75, 0, g); return c; }, { mov: false });
    for (let k = 0; k < 2; k++) item('snowman', -2 + k * 3.2, 0, -.6 + R() * .6, g => { const b = sph(.38, '#ffffff', 0, .38, 0, g); sph(.27, '#ffffff', 0, .95, 0, g); sph(.19, '#ffffff', 0, 1.35, 0, g); cone(.05, .2, '#ff8a1a', 0, 1.35, .25, g, 8).rotation.x = Math.PI / 2; const hat = cyl(.15, .15, .22, pick(['#2a2a33', '#ff3b3b', '#3a5a8a']), 0, 1.6, 0, g); cyl(.24, .24, .03, hat.material, 0, 1.5, 0, g); tor(.2, .05, pick(['#ff3b3b', '#3aa8ff', '#ffd23a']), 0, 1.17, 0, g).rotation.x = Math.PI / 2; for (const sx of [-1, 1]) sph(.03, '#222', sx * .07, 1.42, .16, g); return b; });
    item('igloo', 2.2, 0, -1.6, g => { const d = mesh(new THREE.SphereGeometry(.9, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), '#eef6ff', 0, 0, 0, g); const door = mesh(new THREE.SphereGeometry(.35, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#2a3a5a', 0, 0, .75, g); door.scale.z = .5; return d; }, { mov: false });
    item('sled', .3, 0, .6, g => { const s = box(.9, .06, .4, pick(['#ff3b3b', '#3aa8ff', '#8a5a3a']), 0, .18, 0, g, .02); for (const z of [-.18, .18]) box(1.0, .04, .04, '#c8ccd4', 0, .05, z, g, 0); return s; }, { asym: true });
    item('penguin', -1, 0, .7, g => { const b = sph(.22, '#1c2235', 0, .3, 0, g); b.scale.y = 1.3; const w = sph(.16, '#ffffff', 0, .27, .1, g); w.scale.set(1, 1.3, .7); sph(.14, '#1c2235', 0, .62, 0, g); cone(.04, .1, '#ff9a1a', 0, .6, .15, g, 8).rotation.x = Math.PI / 2; return b; }, { asym: true });
    for (let k = 0; k < 3; k++) item('gift', -3 + k * .7, 0, .9 + R() * .3, g => { const b = box(.3, .3, .3, pick(PAL), 0, .15, 0, g, .03); box(.32, .05, .06, '#ffffff', 0, .31, 0, g, 0); return b; });
    item('skis', 1.6, 0, .4, g => { const a = box(.08, .02, 1.1, pick(['#ff3b3b', '#ffd23a', '#2fd3c0']), -.06, .02, 0, g, .01); box(.08, .02, 1.1, a.material, .06, .02, 0, g, .01); return a; }, { asym: true });
  } },
  { id: 'space', n: T('חלל', 'Space'), ic: '🚀', cam: [2.6, 3.4, 6.4], tgt: [-.3, .8, -.8], sky: '#12103a', build() {
    const gr = mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ map: texPattern(pick(['#8a7ab0', '#9aa0b8', '#b08a7a']), '#6a5a90', 'grain', 6), roughness: .95 }), 0, 0, 0); gr.rotation.x = -Math.PI / 2; gr.castShadow = false;
    for (let k = 0; k < 4; k++) { const c = mesh(new THREE.CircleGeometry(.4 + R() * .3, 24), '#5a4a78', -3 + k * 2 + R(), .005, -1.2 + R() * 2, null); c.rotation.x = -Math.PI / 2; c.castShadow = false; }
    item('rocket', -2.4, 0, -1.6, g => { const b = cyl(.3, .35, 1.6, '#f4f4f8', 0, 1.0, 0, g, 20); cone(.3, .6, pick(['#ff3b3b', '#3aa8ff']), 0, 2.1, 0, g, 20); for (let k = 0; k < 3; k++) { const f = box(.06, .5, .4, '#ff3b3b', Math.cos(k * 2.1) * .35, .35, Math.sin(k * 2.1) * .35, g, 0); f.rotation.y = -k * 2.1; } const w = cyl(.12, .12, .05, '#5fd0ff', 0, 1.3, .32, g, 16); w.rotation.x = Math.PI / 2; return b; }, { mov: false });
    for (let k = 0; k < 3; k++) item('planet', -2.5 + k * 2.6, 2.4 + R() * .6, -2.6, g => { const p = sph(.3 + R() * .25, pick(['#ff9a4a', '#5fd0ff', '#ff6fb5', '#a46bff', '#7ad35a']), 0, 0, 0, g); if (R() < .6) tor(p.geometry.parameters.radius * 1.5, .03, '#ffe0a8', 0, 0, 0, g).rotation.x = 1.2; return p; }, { mov: false });
    for (let k = 0; k < 2; k++) item('alien', -.6 + k * 1.8, 0, .2 + R() * .5, g => { const c = pick(['#7dff8a', '#5fd0ff', '#ff9ae0']); const b = sph(.22, c, 0, .3, 0, g); b.scale.y = 1.2; sph(.2, c, 0, .7, 0, g); sph(.07, '#1a1a22', -.07, .72, .16, g); sph(.07, '#1a1a22', .07, .72, .16, g); for (const sx of [-1, 1]) { cyl(.01, .01, .25, '#222', sx * .08, .95, 0, g, 4); sph(.04, '#ffd23a', sx * .08, 1.08, 0, g); } return b; });
    item('ufo', 2.2, .9, -1.4, g => { const d = cyl(.7, .4, .18, '#c8d4e4', 0, 0, 0, g, 28); sph(.3, '#9fe8ff', 0, .15, 0, g); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; sph(.05, '#ffe14a', Math.cos(a) * .55, -.02, Math.sin(a) * .55, g); } return d; }, { mov: false });
    for (let k = 0; k < 3; k++) item('crystal', 1 + k * .45, 0, .8 - k * .3, g => { const c = mesh(new THREE.OctahedronGeometry(.18, 0), pick(['#ff6fd0', '#5fd0ff', '#ffe14a', '#7aff9a']), 0, .2, 0, g); c.scale.y = 1.8; return c; });
    item('flag', .2, 0, -1.6, g => { cyl(.02, .02, 1.2, '#c8ccd4', 0, .6, 0, g, 6); return box(.5, .3, .02, pick(PAL), .25, 1.05, 0, g, 0); }, { asym: true });
    item('robot', -1.8, 0, .9, g => { const b = box(.32, .36, .24, pick(['#c8ccd4', '#ffd23a', '#5fd0ff']), 0, .35, 0, g, .04); box(.26, .22, .2, b.material, 0, .66, 0, g, .04); sph(.04, '#ff3b3b', -.06, .68, .11, g); sph(.04, '#ff3b3b', .06, .68, .11, g); for (const sx of [-1, 1]) box(.08, .2, .08, '#8a8a99', sx * .1, .1, 0, g, .02); return b; }, { asym: true });
  } },
  { id: 'farm', n: T('חווה', 'Farm'), ic: '🐄', cam: [2.8, 3.4, 6.4], tgt: [-.4, .8, -.8], sky: '#a8dcff', build() {
    const gr = mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ map: texPattern('#8ad06a', '#7ac25a', 'grain', 6), roughness: .95 }), 0, 0, 0); gr.rotation.x = -Math.PI / 2; gr.castShadow = false;
    item('barn', -2.6, 0, -2.2, g => { const b = box(1.8, 1.3, 1.2, pick(['#d83a2a', '#c84a3a', '#8a5aa0']), 0, .65, 0, g, .02); const r = mesh(new THREE.CylinderGeometry(.01, 1.05, .7, 4), '#5a3a2a', 0, 1.65, 0, g); r.rotation.y = Math.PI / 4; r.scale.set(1.25, 1, .85); box(.6, .8, .04, '#ffffff', 0, .4, .62, g, 0); return b; }, { mov: false });
    for (let x = -1.2; x <= 3.6; x += .5) box(.08, .55, .08, '#c8904a', x, .27, -2.4, null, .01); box(5, .06, .05, '#c8904a', 1.2, .45, -2.4, null, 0);
    for (let k = 0; k < 2; k++) item('cow', -.3 + k * 2, 0, -1 + R() * .6, g => { const b = box(.8, .42, .4, '#ffffff', 0, .55, 0, g, .1); for (let s = 0; s < 3; s++) { const sp = sph(.1, '#2a2a33', (R() - .5) * .5, .7, .21, g); sp.scale.set(1, 1, .2); } const h = box(.3, .28, .3, '#ffffff', .5, .7, 0, g, .08); box(.2, .14, .25, '#ffb0c0', .65, .62, 0, g, .05); for (const [x, z] of [[-.28, -.14], [.28, -.14], [-.28, .14], [.28, .14]]) box(.09, .36, .09, '#ffffff', x, .18, z, g, .02); return b; }, { asym: true });
    item('pig', 1.6, 0, .6, g => { const b = sph(.26, '#ffb0c0', 0, .3, 0, g); b.scale.set(1.3, 1, 1); cyl(.08, .08, .06, '#ff8aa0', .34, .32, 0, g, 12).rotation.z = Math.PI / 2; return b; }, { asym: true });
    for (let k = 0; k < 3; k++) item('chicken', -1.6 + k * .5, 0, .7 + R() * .4, g => { const b = sph(.12, pick(['#ffffff', '#c8904a', '#ffe0a0']), 0, .15, 0, g); sph(.08, b.material, .08, .27, 0, g); cone(.03, .06, '#ffb31a', .16, .27, 0, g, 6).rotation.z = -Math.PI / 2; cone(.03, .06, '#ff3b3b', .08, .36, 0, g, 6); return b; }, { asym: true });
    for (let k = 0; k < 2; k++) item('hay', 2.6, 0, -.6 + k * .8, g => { const h = cyl(.3, .3, .5, '#f2c84a', 0, .3, 0, g, 18); h.rotation.z = Math.PI / 2; return h; });
    item('tractor', .4, 0, .2, g => { const b = box(.7, .35, .45, pick(['#2fb04a', '#ff3b3b', '#3aa8ff']), 0, .4, 0, g, .05); box(.3, .35, .4, b.material, -.2, .75, 0, g, .04); for (const [x, r] of [[-.25, .25], [.3, .16]]) for (const z of [-.27, .27]) { const w = cyl(r, r, .1, '#2a2a33', x, r, z, g, 16); w.rotation.x = Math.PI / 2; } return b; }, { asym: true });
    item('tree', 3.2, 0, -1.8, g => { cyl(.1, .15, 1.2, '#8a5a3a', 0, .6, 0, g); const c = sph(.7, '#3fae5a', 0, 1.6, 0, g); for (let k = 0; k < 4; k++) sph(.07, '#ff3b3b', Math.cos(k * 1.6) * .55, 1.5 + (k % 2) * .3, Math.sin(k * 1.6) * .55 + .2, g); return c; }, { mov: false });
  } },
  { id: 'sea', n: T('מתחת לים', 'Under the sea'), ic: '🐠', cam: [2.6, 3.2, 6.4], tgt: [-.3, .9, -.8], sky: '#1a6aa8', build() {
    const gr = mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ map: texPattern('#e8d8a8', '#d8c090', 'grain', 6), roughness: .95 }), 0, 0, 0); gr.rotation.x = -Math.PI / 2; gr.castShadow = false;
    for (let k = 0; k < 6; k++) item('seaweed', -3.6 + k * 1.3 + R() * .3, 0, -2.3 + R() * .5, g => { let m; for (let j = 0; j < 4; j++) { const p = cyl(.05, .06, .4, pick(['#2fb04a', '#4fd06a']), Math.sin(j) * .06, .2 + j * .38, 0, g, 6); p.rotation.z = Math.sin(j * 1.4) * .3; m = m || p; } return m; }, { mov: false });
    for (let k = 0; k < 3; k++) item('coral', -2.5 + k * 2.2, 0, -1.2 + R() * .6, g => { const c = pick(['#ff6f8a', '#ffb13a', '#b06bff', '#ff8a3d']); const b = cyl(.06, .08, .5, c, 0, .25, 0, g, 8); for (let j = 0; j < 4; j++) { const br = cyl(.04, .05, .35, c, Math.cos(j * 1.6) * .1, .55, Math.sin(j * 1.6) * .1, g, 6); br.rotation.set(Math.sin(j) * .6, 0, Math.cos(j * 1.6) * .6); sph(.06, c, Math.cos(j * 1.6) * .2, .72, Math.sin(j * 1.6) * .2, g); } return b; });
    for (let k = 0; k < 4; k++) item('fish', -3 + k * 1.8 + R() * .4, .9 + R() * 1.4, -1.6 + R() * 2, g => { const c = pick(['#ffb31a', '#ff5a6a', '#5fd0ff', '#ffe14a', '#a46bff']); const b = sph(.18, c, 0, 0, 0, g); b.scale.set(1.4, 1, .6); const t = cone(.13, .2, c, -.3, 0, 0, g, 8); t.rotation.z = Math.PI / 2; sph(.03, '#1a1a22', .17, .05, .08, g); return b; }, { asym: true });
    item('chest', 1.6, 0, .2, g => { const b = box(.6, .35, .4, '#8a5a2a', 0, .18, 0, g, .03); const lid = mesh(new THREE.CylinderGeometry(.2, .2, .6, 16, 1, false, 0, Math.PI), '#8a5a2a', 0, .36, 0, g); lid.rotation.z = Math.PI / 2; box(.62, .06, .06, '#ffcf3a', 0, .2, .21, g, 0); for (let k = 0; k < 4; k++) sph(.05, '#ffcf3a', -.2 + k * .13, .4, .05, g); return b; }, { mov: false });
    item('starfish', -.6, .02, .9, g => { const s = new THREE.Shape(); for (let k = 0; k < 10; k++) { const r = k % 2 ? .07 : .18, a = k / 10 * Math.PI * 2; s.lineTo(Math.cos(a) * r, Math.sin(a) * r); } const m = mesh(new THREE.ExtrudeGeometry(s, { depth: .04, bevelEnabled: false }), pick(['#ff8a3d', '#ff5a6a', '#ffb13a']), 0, 0, 0, g); m.rotation.x = -Math.PI / 2; return m; });
    item('sub', 2.4, 1.6, -1.8, g => { const b = sph(.4, pick(['#ffd23a', '#ff8a3d']), 0, 0, 0, g); b.scale.set(1.8, 1, 1); cyl(.1, .12, .35, b.material, 0, .45, 0, g, 12); for (const x of [-.25, .15]) { const w = cyl(.1, .1, .05, '#9fe8ff', x, .05, .38, g, 14); w.rotation.x = Math.PI / 2; } return b; }, { asym: true, mov: false });
    item('octopus', -2.2, 0, .5, g => { const c = pick(['#b07aff', '#ff6fb5', '#ff8a3d']); const b = sph(.28, c, 0, .42, 0, g); b.scale.y = 1.15; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const l = sph(.08, c, Math.cos(a) * .25, .12, Math.sin(a) * .25, g); l.scale.y = 1.8; } sph(.05, '#fff', -.09, .5, .24, g); sph(.05, '#fff', .09, .5, .24, g); return b; });
  } },
  { id: 'park', n: T('גן משחקים', 'Playground'), ic: '🛝', cam: [2.8, 3.4, 6.4], tgt: [-.4, .8, -.8], sky: '#9fdcff', build() {
    const gr = mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ map: texPattern(pick(['#7fd16a', '#5fc8a8', '#ff8a6a']), '#6cc25a', 'grain', 6), roughness: .95 }), 0, 0, 0); gr.rotation.x = -Math.PI / 2; gr.castShadow = false;
    item('slide', -2.5, 0, -1.6, g => { const c = pick(['#ff5a6a', '#3aa8ff', '#ffd23a']); for (const x of [-.25, .25]) cyl(.04, .04, 1.4, '#c8ccd4', x, .7, -.5, g, 8); box(.6, .06, .5, c, 0, 1.4, -.5, g, .02); const s = box(.55, .05, 1.6, c, 0, .75, .3, g, .02); s.rotation.x = .7; return s; }, { mov: false });
    item('swing', .6, 0, -2.0, g => { const f = cyl(.04, .04, 2.2, '#3a5a8a', 0, 1.55, 0, g, 8); f.rotation.z = Math.PI / 2; for (const x of [-1.1, 1.1]) for (const z of [-.3, .3]) { const l = cyl(.04, .04, 1.65, '#3a5a8a', x, .78, z * .5, g, 8); l.rotation.x = z; } for (const x of [-.45, .45]) { for (const sx of [-.15, .15]) cyl(.008, .008, .95, '#555', x + sx, 1.05, 0, g, 4); box(.36, .05, .15, pick(PAL), x, .57, 0, g, .01); } return f; }, { mov: false });
    item('sandbox', 2.2, 0, -.6, g => { const b = box(1.3, .18, 1.0, '#c8904a', 0, .09, 0, g, .02); box(1.15, .05, .85, '#f6dca0', 0, .17, 0, g, 0); return b; }, { mov: false });
    item('bucket', 2.0, .2, -.6, g => cyl(.12, .1, .2, pick(['#ff5a6a', '#3aa8ff', '#5fd36a']), 0, .1, 0, g));
    item('seesaw', -.8, 0, .4, g => { cyl(.12, .14, .3, '#ffd23a', 0, .15, 0, g, 12); const p = box(1.8, .07, .25, pick(['#ff7a4a', '#5fd0ff', '#a46bff']), 0, .34, 0, g, .02); p.rotation.z = .18; return p; }, { asym: true });
    item('ball', 1.2, .18, .8, g => { const b = sph(.18, '#ffffff', 0, 0, 0, g); b.material.map = texPattern(pick(['#ff3b3b', '#3aa8ff', '#ffd23a']), '#ffffff', 'stripe', 1); return b; });
    item('bench', 3.0, 0, .8, g => { const s = box(1.1, .07, .4, '#8a5a3a', 0, .42, 0, g, .02); box(1.1, .3, .05, s.material, 0, .7, -.18, g, .02); for (const x of [-.45, .45]) box(.05, .42, .35, '#3a3a44', x, .21, 0, g, 0); return s; }, { asym: true });
    item('tree', -3.6, 0, -.4, g => { cyl(.12, .18, 1.4, '#8a5a3a', 0, .7, 0, g); const c = sph(.75, pick(['#3fae5a', '#58c26a']), 0, 1.8, 0, g); sph(.5, c.material, .45, 1.6, .2, g); return c; }, { mov: false });
    item('kite', -1.6, 2.6, -2, g => { const k = mesh(new THREE.OctahedronGeometry(.3, 0), pick(PAL), 0, 0, 0, g); k.scale.set(1, 1.4, .1); return k; }, { mov: false });
  } },

];
const MODS = [{ k: 'color' }, { k: 'hide' }, { k: 'scale' }, { k: 'rotate' }, { k: 'move' }];


function decorate(th) { // per-level variety: drop/jitter items and add random props
  const FIXED = ['sofa', 'table', 'bed', 'bench', 'fridge', 'stove', 'shelf', 'umbrella', 'towel', 'blanket', 'rug', 'chair', 'basket', 'board', 'plates', 'pot', 'kettle', 'bowl'];
  for (const g of ITEMS.slice()) { if (!g.userData.mov || g.position.y > .05 || FIXED.includes(g.userData.name)) continue; if (R() < .22) { g.parent.remove(g); ITEMS.splice(ITEMS.indexOf(g), 1); continue; } g.position.x += (R() - .5) * 1.1; g.position.z += (R() - .5) * .8; g.scale.multiplyScalar(.85 + R() * .35); if (g.userData.asym) g.rotation.y += (R() - .5) * 1.2; }
  const props = [
    g => sph(.16, pick(PAL), 0, .16, 0, g),
    g => { let y = 0; let m; for (let k = 0; k < 2 + Math.floor(R() * 3); k++) { const h = .06; const b = box(.34, h, .25, pick(PAL), 0, y + h / 2, 0, g, .01); b.rotation.y = (R() - .5) * .5; y += h; m = m || b; } return m; },
    g => { const b = box(.32, .26, .32, pick(PAL), 0, .13, 0, g, .03); box(.34, .05, .06, '#ffffff', 0, .27, 0, g, 0); box(.06, .05, .34, '#ffffff', 0, .27, 0, g, 0); return b; },
    g => { const p = cyl(.14, .11, .24, pick(['#ffffff', '#ff8a5a', '#5a8aff', '#ffd23a']), 0, .12, 0, g); for (let k = 0; k < 5; k++) { const l = sph(.12, pick(['#3fae5a', '#58c26a']), Math.cos(k) * .09, .36 + R() * .12, Math.sin(k) * .09, g); l.scale.set(.5, 1, .4); } return p; },
    g => { const c = box(.4, .14, .22, pick(PAL), 0, .12, 0, g, .05); box(.2, .1, .2, c.material, -.03, .24, 0, g, .04); for (const x of [-.12, .12]) for (const z of [-.12, .12]) { const w = cyl(.05, .05, .04, '#222', x, .05, z, g, 10); w.rotation.x = Math.PI / 2; } return c; },
    g => { const b = sph(.13, pick(['#c98a5a', '#ffb0c0', '#ffffff', '#9ad0ff']), 0, .13, 0, g); sph(.1, b.material, 0, .32, 0, g); for (const sx of [-1, 1]) sph(.04, b.material, sx * .08, .41, 0, g); return b; },
    g => { const c = cone(.14, .4, pick(PAL), 0, .2, 0, g, 12); sph(.04, '#ffffff', 0, .42, 0, g); return c; },
  ];
  const names = ['ball', 'books', 'gift', 'plant', 'car', 'teddy', 'cone'];
  const n = 4 + Math.floor(R() * 4);
  for (let k = 0; k < n; k++) { const kk = Math.floor(R() * props.length); let x, z, ok = false; for (let t = 0; t < 30 && !ok; t++) { x = -3.6 + R() * 6.4; z = -1.6 + R() * 2.8; ok = ITEMS.every(o => Math.hypot(o.position.x - x, o.position.z - z) > .55 || o.position.y > .3); }
    if (ok) item(names[kk], x, 0, z, props[kk], { asym: kk === 4, ry: R() * 6 }); }
  LV.yaw = (R() < .5 ? -1 : 1) * (.12 + R() * .3); LV.h = (R() - .5) * 1.1;
  if (th.sky && !['space', 'sea'].includes(th.id)) scene.background = C(pick(['#9fdcff', '#8fd8ff', '#ffd0a8', '#c8b8ff', '#a8f0ff', '#ffe0b0', '#ffc0d8']));
  sun.position.set(-4 + R() * 8, 7 + R() * 3, 4 + R() * 3);
}
/* ---------- level setup ---------- */
let LV = null, groupL = null, groupR = null, diffs = [], found = 0, mistakes = 0, timeLeft = 0, timeMax = 0, hints = 2, state = 'title', views = [];
function genLevel(i) {
  const th = THEMES[(i * 7) % 10]; R = rng(i * 7717 + 99); ITEMS = [];
  if (groupL) scene.remove(groupL); if (groupR) scene.remove(groupR);
  groupL = new THREE.Group(); G = groupL; LV = { i, th, tier: Math.floor(i / 6) }; th.build(); scene.add(groupL); scene.background = C(th.sky || '#ffe9c8'); decorate(th); LV.mirror = Math.floor(i / 10) % 2 === 1; if (LV.mirror) groupL.scale.x = -1;
  ITEMS.forEach((g, k) => g.userData.id = k);
  groupR = groupL.clone(true); scene.add(groupR); const itemsR = []; groupR.traverse(o => { if (o.userData.item) itemsR[o.userData.id] = o; });
  const tier = Math.floor(i / 6), sub = i % 6; const n = 5 + (sub >= 3 ? 1 : 0) + (tier >= 3 ? 1 : 0);
  LV = Object.assign(LV, { i, th, tier, n, time: [120, 115, 110, 100, 95][tier] - sub * 2 });
  layout(); // need camera for visibility
  // choose candidates
  setCamFor(views[0]); scene.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(); const meshesL = []; groupL.traverse(o => { if (o.isMesh) meshesL.push(o); });
  const cands = [];
  for (const g of ITEMS) { const r = projRect(g, views[0]); if (!r) continue; const area = r.w * r.h / (views[0].w * views[0].h); if (area < (tier >= 3 ? .0016 : tier >= 2 ? .0022 : .003) || area > .1) continue;
    const c = new THREE.Box3().setFromObject(g).getCenter(V3()); const nd = c.clone().project(camera); ray.setFromCamera(new THREE.Vector2(nd.x, nd.y), camera); const hit = ray.intersectObjects(meshesL, false)[0];
    let o = hit && hit.object; while (o && !o.userData.item) o = o.parent; if (o !== g) continue; cands.push({ g, r }); }
  cands.sort(() => R() - .5); const chosen = [];
  for (const c of cands) { if (chosen.length >= n) break; const cx = c.r.x + c.r.w / 2, cy = c.r.y + c.r.h / 2; if (chosen.some(o => Math.hypot(o.cx - cx, o.cy - cy) < Math.min(views[0].w, views[0].h) * .12)) continue; c.cx = cx; c.cy = cy; chosen.push(c); }
  diffs = chosen.map(c => { const gL = c.g, gR = itemsR[gL.userData.id]; const pool = ['color', 'hide', 'color'].concat(tier >= 1 ? ['scale', 'color'] : []).concat(tier >= 2 && gL.userData.asym ? ['rotate', 'rotate'] : []).concat(tier >= 3 && gL.userData.mov ? ['move', 'move'] : []);
    let k = pick(pool); if (k === 'move' && !gL.userData.mov) k = 'color';
    const side = R() < .5 ? gL : gR, other = side === gL ? gR : gL;
    if (k === 'color') { const main = findMain(gR, gL); if (!main || !main.material || !main.material.color) k = 'hide'; else { main.material = main.material.clone(); if (main.material.map) { main.material.map = null; main.material.color.set(pick(PAL)); } else { const hsl = {}; main.material.color.getHSL(hsl); const sh = tier >= 3 ? .22 : .38; main.material.color.setHSL((hsl.h + sh + R() * .2) % 1, Math.max(.55, hsl.s), clamp(hsl.l < .25 || hsl.l > .85 ? .55 : hsl.l, .3, .7)); } } }
    if (k === 'hide') side.visible = false;
    if (k === 'scale') gR.scale.multiplyScalar(R() < .5 ? 1.45 : .62);
    if (k === 'rotate') gR.rotation.y += Math.PI / 2 * (R() < .5 ? 1 : -1) + (R() < .3 ? Math.PI / 2 : 0);
    if (k === 'move') gR.position.x += (R() < .5 ? -1 : 1) * .45;
    return { gL, gR, k, found: false }; });
  found = 0; mistakes = 0; hints = 2; timeMax = timeLeft = LV.time; groupR.visible = false;
}
function findMain(gR, gL) { const mL = gL.userData.main; if (!mL) return null; // locate same path inside gR
  const path = []; let o = mL; while (o && o !== gL) { path.unshift(o.parent.children.indexOf(o)); o = o.parent; } let r = gR; for (const k of path) r = r.children[k]; return r; }
function projRect(g, v) { if (!g.visible) return null; const b = new THREE.Box3().setFromObject(g); if (b.isEmpty()) return null; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let k = 0; k < 8; k++) { const p = V3(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).project(camera); const sx = v.x + (p.x * .5 + .5) * v.w, sy = v.y + (1 - (p.y * .5 + .5)) * v.h; x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy); }
  x0 = Math.max(x0, v.x); y0 = Math.max(y0, v.y); x1 = Math.min(x1, v.x + v.w); y1 = Math.min(y1, v.y + v.h); if (x1 <= x0 || y1 <= y0) return null; return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
function layout() { const W = innerWidth, H = innerHeight, top = Math.max(84, (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0) + 84), pad = 8;
  if (W / H > 1.05) { const w = (W - pad * 3) / 2, h = H - top - pad; views = [{ x: pad, y: top, w, h }, { x: pad * 2 + w, y: top, w, h }]; }
  else { const h = (H - top - pad * 3) / 2, w = W - pad * 2; views = [{ x: pad, y: top, w, h }, { x: pad, y: top + h + pad, w, h }]; }
  if (EN === false && W / H > 1.05) { } }
function setCamFor(v) { const th = LV.th; camera.aspect = v.w / v.h; const mx = LV.mirror ? -1 : 1; const tgt = V3(th.tgt[0] * mx, th.tgt[1], th.tgt[2]); const base = V3(th.cam[0] * mx, th.cam[1], th.cam[2]).sub(tgt).applyAxisAngle(V3(0, 1, 0), LV.yaw || 0).add(tgt); base.y += LV.h || 0; const dir = base.clone().sub(tgt).normalize();
  const pts = [V3(-4.2, 0, -2.9), V3(3.2, 0, -2.9), V3(-4.2, 0, 1.6), V3(3.2, 0, 1.6), V3(-4.2, 2.8, -2.9), V3(3.2, 2.8, -2.9)].map(p => { p.x *= mx; return p; });
  let lo = 2, hi = 40; for (let it = 0; it < 26; it++) { const d = (lo + hi) / 2; camera.position.copy(tgt).addScaledVector(dir, d); camera.lookAt(tgt); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); let ok = true; for (const p of pts) { const q = p.clone().project(camera); if (Math.abs(q.x) > 1.02 || Math.abs(q.y) > 1.02) { ok = false; break; } } if (ok) hi = d; else lo = d; }
  const d = hi * .82; camera.position.copy(tgt).addScaledVector(dir, d); camera.lookAt(tgt); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); }
function render() { const W = innerWidth, H = innerHeight; renderer.setSize(W, H, false); renderer.setScissorTest(false); renderer.setClearColor(C('#ffe9c8')); renderer.clear(); renderer.setScissorTest(true);
  if (!LV) return; views.forEach((v, k) => { renderer.setViewport(v.x, H - v.y - v.h, v.w, v.h); renderer.setScissor(v.x, H - v.y - v.h, v.w, v.h); setCamFor(v); groupL.visible = k === 0; groupR.visible = k === 1; renderer.render(scene, camera); });
  placeMarkers(); }
function rectFor(d, k) { setCamFor(views[k]); scene.updateMatrixWorld(true); const show = [d.gL.visible, d.gR.visible]; groupL.visible = groupR.visible = true; const g = k === 0 ? (d.gL.visible ? d.gL : d.gR) : (d.gR.visible ? d.gR : d.gL);
  const gh = g === d.gL ? groupL : groupR; const other = gh === groupL ? groupR : groupL; const wasVis = g.visible; g.visible = true; let r = null;
  if (g.parent !== gh) { } r = projRect(g, views[k]); g.visible = wasVis;
  // if hidden here, use the other copy's rect projected in this view
  if (!r) { const og = g === d.gL ? d.gR : d.gL; const ov = og.visible; og.visible = true; r = projRect(og, views[k]); og.visible = ov; }
  return r; }
function placeMarkers() { const box = $('views'); box.innerHTML = ''; views.forEach((v, k) => { const tg = document.createElement('div'); tg.className = 'tag'; tg.style.left = v.x + 8 + 'px'; tg.style.top = v.y + 8 + 'px'; tg.textContent = k ? T('תמונה 2', 'Picture 2') : T('תמונה 1', 'Picture 1'); box.appendChild(tg); });
  for (const d of diffs) { if (!d.found && !d.hint) continue; for (let k = 0; k < 2; k++) { const r = d.rects[k]; if (!r) continue; const m = document.createElement('div'); m.className = 'mk' + (d.found ? '' : ' hint'); const rad = Math.max(22, Math.max(r.w, r.h) / 2 + 8); m.style.left = r.x + r.w / 2 - rad + 'px'; m.style.top = r.y + r.h / 2 - rad + 'px'; m.style.width = m.style.height = rad * 2 + 'px'; box.appendChild(m); } } }
function computeRects() { const gv = [groupL.visible, groupR.visible]; for (const d of diffs) { const vis = [d.gL.visible, d.gR.visible]; d.rects = [rectFor(d, 0), rectFor(d, 1)]; d.gL.visible = vis[0]; d.gR.visible = vis[1]; } groupL.visible = gv[0]; groupR.visible = gv[1]; }

/* ---------- input ---------- */
renderer.domElement.addEventListener('pointerdown', e => { if (state !== 'play') return; A.ac(); const x = e.clientX, y = e.clientY; const k = views.findIndex(v => x >= v.x && x <= v.x + v.w && y >= v.y && y <= v.y + v.h); if (k < 0) return;
  let hit = null; for (const d of diffs) { if (d.found) continue; const r = d.rects[k]; if (!r) continue; const pad = 14; if (x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad) { if (!hit || r.w * r.h < hit.r.w * hit.r.h) hit = { d, r }; } }
  if (hit) { hit.d.found = true; hit.d.hint = false; found++; A.tone(880, .12, 'triangle', .1); A.tone(1320, .2, 'triangle', .08, .08); updDots(); placeMarkers(); if (found === diffs.length) win(); }
  else { mistakes++; timeLeft = Math.max(0, timeLeft - 5); A.tone(180, .2, 'square', .06); const xx = document.createElement('div'); xx.className = 'x'; xx.textContent = '✕'; xx.style.left = x + 'px'; xx.style.top = y + 'px'; document.body.appendChild(xx); setTimeout(() => xx.remove(), 700); if (navigator.vibrate) try { navigator.vibrate(40); } catch (e2) { } } });
$('hintBtn').onclick = () => { if (state !== 'play' || !hints) return; const d = diffs.find(x => !x.found && !x.hint); if (!d) return; hints--; d.hint = true; $('hintN').textContent = hints; A.tone(660, .2, 'sine', .08); placeMarkers(); };
function updDots() { $('dots').innerHTML = diffs.map(d => `<i class="${d.found ? 'on' : ''}"></i>`).join(''); }
function win() { state = 'won'; const frac = timeLeft / timeMax; let s = frac > .5 ? 3 : frac > .2 ? 2 : 1; if (mistakes > 4) s = Math.max(1, s - 1); if (hints < 2) s = Math.min(s, hints === 0 ? 1 : 2); s = Math.max(1, s);
  if ((S.stars[LV.i] || 0) < s) S.stars[LV.i] = s; S.save(); [0, 4, 7, 12].forEach((n, k) => A.tone(523 * Math.pow(2, n / 12), .25, 'triangle', .09, k * .1));
  setTimeout(() => { $('wT').textContent = [T('מצאתם הכל!', 'Found them all!'), T('עין חדה!', 'Sharp eyes!'), T('בלש מושלם!', 'Perfect detective!')][s - 1]; $('wP').textContent = T(`נשארו ${Math.ceil(timeLeft)} שניות · ${mistakes} טעויות`, `${Math.ceil(timeLeft)}s left · ${mistakes} mistakes`);
    [...$('wStars').children].forEach((e, k) => { e.classList.toggle('on', k < s); e.style.animationDelay = k * .25 + 's'; }); $('wNext').hidden = LV.i >= 29; $('wNext').textContent = T('הבא ▶', 'Next ▶'); $('winSheet').hidden = false; }, 900); }
function lose() { state = 'lost'; diffs.forEach(d => { if (!d.found) d.hint = true; }); placeMarkers(); A.tone(300, .3, 'triangle', .08, 0, 200); A.tone(220, .4, 'triangle', .08, .25, 150);
  setTimeout(() => { $('wT').textContent = T('נגמר הזמן ⏰', 'Time’s up ⏰'); $('wP').textContent = T(`מצאתם ${found} מתוך ${diffs.length}. הכחולים הם אלה שפספסתם`, `You found ${found} of ${diffs.length}. The blue ones are the ones you missed`); [...$('wStars').children].forEach(e => e.classList.remove('on')); $('wNext').hidden = true; $('winSheet').hidden = false; }, 1400); }

/* ---------- loop ---------- */
let last = performance.now(), hudT = 0;
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.1, (now - last) / 1000); last = now; A.tick();
  if (state === 'play') { timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; lose(); } hudT -= dt; if (hudT <= 0) { hudT = .2; const sec = Math.ceil(timeLeft); $('timeTxt').textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); $('barI').style.width = timeLeft / timeMax * 100 + '%'; $('barI').style.background = timeLeft / timeMax < .25 ? '#ff3b4e' : ''; } } }
function full() { layout(); if (!LV) return; computeRects(); render(); }
addEventListener('resize', () => { full(); });

/* ---------- screens ---------- */
let tab = clamp(S.tier || 0, 0, 4);
const unlocked = i => i % 6 === 0 || (S.stars[i - 1] || 0) > 0;
const DIFF = [T('קל', 'Easy'), T('רגיל', 'Normal'), T('מאתגר', 'Tricky'), T('קשה', 'Hard'), T('מומחה', 'Expert')]; const ICW = { living: '🛋️', garden: '🌷', beach: '🏖️', kitchen: '🍳', toys: '🧸', snow: '⛄', space: '🚀', farm: '🐄', sea: '🐠', park: '🛝' };
function renderTitle() { $('tabs').innerHTML = DIFF.map((t, k) => `<button data-k="${k}" aria-pressed="${k === tab}">${t}</button>`).join('');
  let h = ''; for (let j = 0; j < 6; j++) { const i = tab * 6 + j, un = unlocked(i), st = S.stars[i] || 0; h += `<button class="lb ${un ? '' : 'lock'}" data-i="${i}" ${un ? '' : 'disabled'}>${un ? `<span style="font-size:15px">${ICW[THEMES[(i * 7) % 10].id]}</span>` + (i + 1) : '🔒'}<small>${un ? starsHTML(st) : ''}</small></button>`; } $('lgrid').innerHTML = h; }
$('tabs').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; A.ac(); tab = +b.dataset.k; S.tier = tab; S.save(); renderTitle(); genLevel(tab * 6); full(); };
$('lgrid').onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; A.ac(); play(+b.dataset.i); };
function play(i) { genLevel(i); full(); state = 'play'; $('title').hidden = true; $('winSheet').hidden = true; $('hud').hidden = $('bar').hidden = false; $('lvName').textContent = (i + 1) + ' · ' + LV.th.n; $('hintN').textContent = hints; updDots();
  A.startMusic({ chords: [[60, 64, 67], [65, 69, 72], [62, 65, 69], [67, 71, 74]], bpm: 96, lead: true, vol: .8 });
  if (!S.tut) { toast(T(`מצאו ${diffs.length} הבדלים בין שתי התמונות – לחצו עליהם!`, `Find ${diffs.length} differences between the two pictures – tap them!`), 4000); S.tut = 1; S.save(); } else toast(T(`${diffs.length} הבדלים`, `${diffs.length} differences`)); }
function showTitle() { state = 'title'; $('title').hidden = false; $('hud').hidden = $('bar').hidden = true; $('winSheet').hidden = true; renderTitle(); }
$('mapBtn').onclick = () => { tab = LV.tier; showTitle(); };
$('wMap').onclick = () => { tab = LV.tier; showTitle(); }; $('wAgain').onclick = () => play(LV.i); $('wNext').onclick = () => play(LV.i + 1);
$('mapBtn').innerHTML = ICO.grid('#ff6a1f'); $('homeT').innerHTML = ICO.home('#ff6a1f'); soundButton('sndBtn', S, A, '#ff6a1f'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('tSub').textContent = T('שתי תמונות כמעט זהות – מצאו את כל ההבדלים לפני שהזמן נגמר!', 'Two almost identical pictures – find every difference before time runs out!');
$('wMap').textContent = T('שלבים', 'Levels'); $('wAgain').textContent = T('שוב', 'Again');
setTimeout(() => { const first = [...Array(30).keys()].find(i => unlocked(i) && !S.stars[i]) ?? 0; tab = Math.floor(first / 6); genLevel(first); full(); showTitle(); $('loading').hidden = true; requestAnimationFrame(frame); window.__spotOK = true; }, 20);
window.__sp = { get diffs() { return diffs; }, get state() { return state; }, play, genLevel, full, views: () => views };
