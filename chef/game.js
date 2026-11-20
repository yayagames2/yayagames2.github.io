import { THREE, $, V3, C, clamp, lerp, rnd, rng, T, EN, store, engine, studioEnv, std, shadowAll, cnv, ctex, particles, CONFETTI, audio, toast, ICO, hubButtons, soundButton, qualityButton, starsHTML, cutie } from '../lib/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const S = store('chef-save', { stars: {}, rest: 0 });
const E = engine(S, { fov: 40, bloom: [.3, .5, 1.25], exposure: 1, bg: '#ffd9c2' });
const { scene, camera, renderer } = E; studioEnv(E, '#fff4ec', '#c89a80', .35);
const A = audio(S); const FX = particles(E, 900);

/* ---------- restaurants & ingredients ---------- */
const ING = {
  bun: { e: '🍞', n: T('לחמנייה', 'Bun') }, patty: { e: '🥩', n: T('קציצה', 'Patty'), cook: 4.2 }, cheese: { e: '🧀', n: T('גבינה', 'Cheese') }, lettuce: { e: '🥬', n: T('חסה', 'Lettuce') }, tomato: { e: '🍅', n: T('עגבנייה', 'Tomato') },
  cola: { e: '🥤', n: T('קולה', 'Cola'), side: 1, pour: 1.6 }, orange: { e: '🍊', n: T('תפוזים', 'Orange'), side: 1, pour: 1.6 }, fries: { e: '🍟', n: T('צ׳יפס', 'Fries'), side: 1, pour: 2.2 },
  ketchup: { e: '', n: T('קטשופ', 'Ketchup'), sauce: '#e01e2a' }, mustard: { e: '', n: T('חרדל', 'Mustard'), sauce: '#ffc400' },
  pancake: { e: '🥞', n: T('פנקייק', 'Pancake'), cook: 3.6 }, syrup: { e: '🍯', n: T('סירופ', 'Syrup') }, berry: { e: '🍓', n: T('תות', 'Berry') }, cream: { e: '🍦', n: T('קצפת', 'Cream') }, choco: { e: '🍫', n: T('שוקולד', 'Choco') },
  milk: { e: '🥛', n: T('שייק', 'Shake'), side: 1, pour: 1.8 }, cocoa: { e: '☕', n: T('שוקו', 'Cocoa'), side: 1, pour: 1.8 },
};
const RESTS = [
  { id: 'burger', n: T('המבורגריה', 'Burger Bar'), ic: '🍔', wall: '#ffe2c8', wall2: '#ffcfb0', counter: '#ff6a4a', floor: ['#ffffff', '#2a2f3a'], main: ['bun', 'patty', 'cheese', 'lettuce', 'tomato', 'ketchup', 'mustard'], sides: ['cola', 'orange', 'fries'], cookItem: 'patty' },
  { id: 'pancake', n: T('בית הפנקייק', 'Pancake House'), ic: '🥞', wall: '#e8f4ff', wall2: '#d0e8ff', counter: '#5fb0ff', floor: ['#fff4e0', '#ffd8a8'], main: ['pancake', 'syrup', 'berry', 'cream', 'choco'], sides: ['milk', 'cocoa', 'orange'], cookItem: 'pancake' },
];
const LEVELS = []; for (let r = 0; r < 2; r++) for (let k = 0; k < 10; k++) LEVELS.push({ r, k, goal: 55 + k * 17 + r * 18, time: 110 + k * 4, patience: lerp(32, 20, k / 9), every: lerp(9, 5, k / 9), maxSeats: k < 2 ? 2 : 3, cookMax: k < 3 ? 1 : 2, toppings: Math.min(4, 1 + Math.floor(k / 3)), sideP: k < 1 ? 0 : k < 4 ? .4 : .7, unlockAt: [0, 0, 0, 2, 0, 4, 0, 6, 0, 0][k] });
function availMain(L) { return RESTS[L.r].main; }
function availSides(L) { const R = RESTS[L.r]; return L.sideP ? R.sides.slice(0, L.k < 5 ? 1 : L.k < 8 ? 2 : 3) : []; }

/* ---------- scene ---------- */
const hemi = new THREE.HemisphereLight(C('#fff4ec'), C('#a07a60'), .6); scene.add(hemi);
const key = new THREE.DirectionalLight(C('#fff0dc'), 2.0); key.position.set(-3, 8, 6); key.castShadow = true; key.shadow.mapSize.set(E.q === 'ultra' ? 2048 : 1024, E.q === 'ultra' ? 2048 : 1024); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -4, near: 1, far: 30 }); key.shadow.bias = -.0005; key.shadow.normalBias = .02; scene.add(key);
const room = new THREE.Group(); scene.add(room);
const SEATX = [-1.7, 0, 1.7];
let grillSlots = [], plateG = null, sideG = null, machine = null;
function chk(a, b, rep) { const c = cnv(128, 128), g = c.getContext('2d'); for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? b : a; g.fillRect(x * 64, y * 64, 64, 64); } return ctex(c, rep, rep); }
function buildRoom(R) {
  room.clear(); scene.background = C(R.wall);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), std('#ffffff', { map: chk(R.floor[0], R.floor[1], 10), roughness: .3 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; room.add(fl);
  const wc = cnv(128, 128), wg = wc.getContext('2d'); wg.fillStyle = R.wall; wg.fillRect(0, 0, 128, 128); wg.fillStyle = R.wall2; for (let x = 0; x < 128; x += 32) wg.fillRect(x, 0, 16, 128);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(20, 7), std('#ffffff', { map: ctex(wc, 10, 3), roughness: .9 })); wall.position.set(0, 3.5, -3.4); wall.receiveShadow = true; room.add(wall);
  // window with city
  const win = new THREE.Mesh(new RoundedBoxGeometry(4.2, 1.8, .1, 2, .05), std('#ffffff')); win.position.set(0, 2.6, -3.35); room.add(win);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.6), new THREE.MeshBasicMaterial({ color: R.id === 'burger' ? '#9fd8ff' : '#ffd6a8' })); sky.position.set(0, 2.6, -3.29); room.add(sky);
  for (let k = 0; k < 8; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.4, .4 + Math.random() * .8, .02), new THREE.MeshBasicMaterial({ color: ['#7aa8d8', '#9ab8e0', '#6a90c0'][k % 3] })); b.position.set(-1.75 + k * .5, 1.9 + b.geometry.parameters.height / 2, -3.28); room.add(b); }
  // sign
  const sc = cnv(512, 128), sg = sc.getContext('2d'); sg.fillStyle = '#fff'; sg.font = '900 ' + (R.id === 'burger' ? 58 : 50) + 'px Rubik, Arial'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.shadowColor = R.counter; sg.shadowBlur = 20; sg.fillText(R.ic + ' ' + (R.id === 'burger' ? 'BURGER BAR' : 'PANCAKE HOUSE'), 256, 66);
  const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace; const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, .9), new THREE.MeshBasicMaterial({ map: st, transparent: true, color: C('#ffffff').multiplyScalar(1.5) })); sign.position.set(0, 4.05, -3.3); room.add(sign);
  // customer counter (back) + stools
  const cm = new THREE.MeshPhysicalMaterial({ color: R.counter, roughness: .35, clearcoat: 1, clearcoatRoughness: .15 });
  const cc = new THREE.Mesh(new RoundedBoxGeometry(6.4, .72, .8, 3, .06), cm); cc.position.set(0, .36, -.3); room.add(cc);
  const top = new THREE.Mesh(new RoundedBoxGeometry(6.6, .08, 1.1, 2, .03), std('#f4f4f0', { roughness: .25 })); top.position.set(0, .76, -.3); room.add(top);
  for (const x of SEATX) { const s = new THREE.Group(); s.position.set(x, 0, -1.25); const p = new THREE.Mesh(new THREE.CylinderGeometry(.05, .08, .7, 10), std('#d0d4dc', { metalness: 1, roughness: .2 })); p.position.y = .35; s.add(p); const seat = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .1, 24), cm); seat.position.y = .74; s.add(seat); room.add(s); }
  // kitchen work counter (front)
  const wk = new THREE.Mesh(new RoundedBoxGeometry(6.4, .9, 1.2, 3, .05), std('#e8ecf2', { roughness: .3, metalness: .4 })); wk.position.set(0, .45, 1.15); room.add(wk);
  const wt = new THREE.Mesh(new RoundedBoxGeometry(6.5, .06, 1.3, 2, .02), std('#c8ccd4', { roughness: .2, metalness: .9 })); wt.position.set(0, .93, 1.15); room.add(wt);
  // grill
  const gr = new THREE.Mesh(new RoundedBoxGeometry(1.55, .14, .9, 2, .03), std('#2a2a33', { roughness: .4, metalness: .6 })); gr.position.set(-1.62, 1.0, 1.15); room.add(gr);
  const hot = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .75), new THREE.MeshStandardMaterial({ color: '#3a3a44', emissive: C('#ff4a1a'), emissiveIntensity: .25, roughness: .5, metalness: .4 })); hot.rotation.x = -Math.PI / 2; hot.position.set(-1.62, 1.075, 1.15); room.add(hot);
  for (let k = 0; k < 6; k++) { const ln = new THREE.Mesh(new THREE.BoxGeometry(1.35, .01, .02), std('#1a1a20')); ln.position.set(-1.62, 1.08, .85 + k * .12); room.add(ln); }
  grillSlots = [{ x: -1.98, z: 1.15 }, { x: -1.26, z: 1.15 }].map(s => ({ ...s, item: null, t: 0, mesh: null }));
  // plates
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(.42, .36, .05, 32), std('#ffffff', { roughness: .2 })); plate.position.set(-.25, .985, 1.15); room.add(plate);
  plateG = new THREE.Group(); plateG.position.set(-.25, 1.01, 1.15); room.add(plateG);
  sideG = new THREE.Group(); sideG.position.set(.65, .96, 1.25); room.add(sideG);
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .03, 24), std('#e0e4ec')); tray.position.set(.65, .97, 1.25); room.add(tray);
  // drink machine
  machine = new THREE.Group(); machine.position.set(1.78, .96, 1.2); machine.scale.set(1, .7, .8); const mb = new THREE.Mesh(new RoundedBoxGeometry(.95, 1.1, .6, 3, .08), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .3, clearcoat: 1 })); mb.position.y = .55; machine.add(mb);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(.8, .35), new THREE.MeshBasicMaterial({ color: C(R.counter).multiplyScalar(1.2) })); scr.position.set(0, .85, .31); machine.add(scr);
  const noz = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .12, 12), std('#c8ccd4', { metalness: 1, roughness: .2 })); noz.position.set(0, .48, .25); machine.add(noz);
  const drip = new THREE.Mesh(new THREE.BoxGeometry(.6, .04, .3), std('#a0a4ac', { metalness: .8, roughness: .3 })); drip.position.set(0, .03, .2); machine.add(drip); room.add(machine);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .35, 8), new THREE.MeshBasicMaterial({ color: '#7a3a1a', transparent: true, opacity: .9 })); stream.position.set(0, .26, .25); stream.visible = false; machine.add(stream); machine.userData.stream = stream;
  // ketchup & napkins decor
  for (const [x, c] of [[1.25, '#ff3b2a'], [1.42, '#ffd23a']]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, .26, 14), std(c, { roughness: .3 })); b.position.set(x, .9, -.15); room.add(b); }
  shadowAll(room, true, true); [fl, wall, sky, sign].forEach(m => m.castShadow = false);
}

/* ---------- food meshes ---------- */
const FM = {};
function foodMesh(id, cookT = 1) { const g = new THREE.Group(); let h = .05;
  const m = (geo, c, y, o = {}) => { const x = new THREE.Mesh(geo, std(c, Object.assign({ roughness: .6 }, o))); x.position.y = y; x.castShadow = true; g.add(x); return x; };
  switch (id) {
    case 'bunB': m(new THREE.CylinderGeometry(.3, .28, .1, 28), '#e8a04a', .05); h = .1; break;
    case 'bunT': { const d = m(new THREE.SphereGeometry(.31, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), '#e8a04a', 0); d.scale.y = .6; for (let k = 0; k < 9; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.015, 6, 4), std('#fff6d8')); const a = k * 2.4, r = .08 + (k % 3) * .06; s.position.set(Math.cos(a) * r, .16 - r * .3, Math.sin(a) * r); s.scale.y = .5; g.add(s); } h = .18; break; }
    case 'patty': { const c = cookT < 1 ? C('#d86a6a').lerp(C('#7a4428'), cookT) : cookT < 1.9 ? C('#7a4428') : C('#2a1a12'); m(new THREE.CylinderGeometry(.29, .29, .09, 24), c.getStyle(), .045, { roughness: .9 }); h = .09; break; }
    case 'cheese': { const x = m(new THREE.BoxGeometry(.52, .025, .52), '#ffc82a', .012); x.rotation.y = .4; h = .025; break; }
    case 'lettuce': { const x = m(new THREE.CylinderGeometry(.34, .34, .03, 10), '#6ad35a', .015); x.scale.set(1, 1, .92); h = .03; break; }
    case 'ketchup': case 'mustard': { const pts = []; for (let k = 0; k <= 40; k++) { const a = k / 40 * Math.PI * 4; const r = .05 + k / 40 * .17; pts.push(V3(Math.cos(a) * r, .015, Math.sin(a) * r)); } const tb = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, .022, 6), std(ING[id].sauce, { roughness: .25 })); tb.castShadow = true; g.add(tb); h = .025; break; }
    case 'tomato': for (const [dx, dz] of [[-.1, -.06], [.11, .04], [-.02, .12]]) { const t = m(new THREE.CylinderGeometry(.11, .11, .03, 18), '#ff3b3b', .015); t.position.x = dx; t.position.z = dz; } h = .03; break;
    case 'pancake': { const c = cookT < 1 ? C('#f6e0a8').lerp(C('#d8902a'), cookT) : cookT < 1.9 ? C('#d8902a') : C('#3a2212'); m(new THREE.CylinderGeometry(.31, .31, .07, 28), c.getStyle(), .035, { roughness: .8 }); h = .07; break; }
    case 'syrup': { const x = m(new THREE.CylinderGeometry(.27, .27, .015, 24), '#b8601a', .008, { roughness: .1, metalness: .1 }); h = .012; break; }
    case 'berry': for (let k = 0; k < 4; k++) { const b = m(new THREE.ConeGeometry(.05, .09, 10), '#ff2a4a', .04); b.rotation.x = Math.PI; const a = k * 1.57; b.position.x = Math.cos(a) * .12; b.position.z = Math.sin(a) * .12; } h = .05; break;
    case 'cream': { const c = m(new THREE.ConeGeometry(.14, .2, 12), '#fffaf0', .1); h = .14; break; }
    case 'choco': { for (let k = 0; k < 5; k++) { const b = m(new THREE.BoxGeometry(.06, .025, .03), '#5a2a12', .012); b.position.set(Math.cos(k * 1.3) * .14, .012, Math.sin(k * 1.3) * .14); b.rotation.y = k; } h = .02; break; }
    case 'cola': case 'orange': case 'milk': case 'cocoa': { const col = { cola: '#5a2010', orange: '#ff9a1a', milk: '#ffd0e0', cocoa: '#8a5030' }[id]; const cup = new THREE.Mesh(new THREE.CylinderGeometry(.13, .1, .34, 20, 1, true), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: .45, roughness: .05, side: THREE.DoubleSide })); cup.position.y = .17; g.add(cup);
      const liq = m(new THREE.CylinderGeometry(.12, .095, .28 * cookT, 20), col, .14 * cookT, { roughness: .2 }); g.userData.liq = liq; const st = m(new THREE.CylinderGeometry(.012, .012, .3, 6), '#ff5a6a', .38); st.rotation.z = .2; st.position.x = .04; h = .34; break; }
    case 'fries': { const box = m(new THREE.CylinderGeometry(.13, .1, .22, 4), '#ff3b2a', .11); box.rotation.y = Math.PI / 4; for (let k = 0; k < 9; k++) { const f = m(new THREE.BoxGeometry(.03, .2, .03), '#ffd24a', .26); f.position.x = (k % 3 - 1) * .05; f.position.z = (Math.floor(k / 3) - 1) * .05; f.rotation.z = (k % 2 - .5) * .3; } h = .3; break; }
  }
  g.userData.h = h; return g; }

/* ---------- state ---------- */
let L = null, state = 'title', coins = 0, timeLeft = 0, spawnT = 0, served = 0, lost = 0, combo = 0;
let plate = [], side = null, pouring = null, seats = [null, null, null];
function clearPlate() { plate = []; plateG.clear(); }
function rebuildPlate() { plateG.clear(); let y = 0;
  let bunsSeen = 0; for (const it of plate) { let id = it; if (it === 'bun') { id = bunsSeen ? 'bunT' : 'bunB'; bunsSeen++; } const m = foodMesh(id); m.position.y = y; m.rotation.y = Math.random() * .3; plateG.add(m); y += m.userData.h * .92; } }
function addMain(id) { if (plate.length >= 8) { A.tone(160, .15, 'square', .05); return; } if (id === 'bun' && plate.filter(x => x === 'bun').length >= 2) { A.tone(160, .15, 'square', .05); return; } if (plate.length && plate[plate.length - 1] === 'bun' && plate.filter(x => x === 'bun').length === 2) { toast(T('ההמבורגר כבר סגור', 'The burger is already closed')); return; }
  plate.push(id); rebuildPlate(); A.tone(500 + plate.length * 60, .07, 'triangle', .07); A.noise(.05, 'bandpass', 2200, 1, .08); checkMatch(); }
function sideOrder(id) { if (side || pouring) { A.tone(160, .15, 'square', .05); return; } pouring = { id, t: 0, dur: ING[id].pour }; machine.userData.stream.visible = id !== 'fries'; machine.userData.stream.material.color.set({ cola: '#5a2010', orange: '#ff9a1a', milk: '#ffd0e0', cocoa: '#8a5030' }[id] || '#ffd24a');
  A.loopOn('pour', 'bandpass', id === 'fries' ? 3000 : 1200, 1, .18, id === 'fries' ? 12 : 5); const m = foodMesh(id, .01); sideG.clear(); sideG.add(m); if (id === 'fries') { m.scale.setScalar(.01); } }
function cookPut(id) { const sl = grillSlots.find(s => !s.item); if (!sl || grillSlots.filter(s => s.item).length >= L.cookMax) { A.tone(160, .15, 'square', .05); toast(T('הגריל מלא', 'The grill is full')); return; } sl.item = id; sl.t = 0; sl.mesh = foodMesh(id, 0); sl.mesh.position.set(sl.x, 1.09, sl.z); room.add(sl.mesh); A.noise(.3, 'highpass', 3000, .7, .15); A.loopOn('siz', 'highpass', 5000, .6, .07, 8); }
function grillTap(k) { const sl = grillSlots[k]; if (!sl.item) return; const ct = sl.t / ING[sl.item].cook;
  if (ct >= 1.9) { room.remove(sl.mesh); sl.item = null; A.noise(.2, 'lowpass', 600, 1, .2); toast(T('שרוף! לפח 🗑️', 'Burnt! Into the bin 🗑️')); }
  else if (ct >= 1) { room.remove(sl.mesh); const id = sl.item; sl.item = null; plate.push(id); rebuildPlate(); A.tone(700, .08, 'triangle', .08); checkMatch(); }
  else { A.tone(220, .1, 'triangle', .05); toast(T('עוד לא מוכן…', 'Not ready yet…')); }
  if (!grillSlots.some(s => s.item)) A.loopOff('siz'); }
function trash() { if (!plate.length && !side) return; clearPlate(); side = null; sideG.clear(); A.noise(.25, 'lowpass', 900, 1, .2); A.tone(200, .12, 'triangle', .05); checkMatch(); }

/* ---------- customers ---------- */
const PALS = [['#f2c3a0', '#ff6fb5', '#5a3018'], ['#e8b48a', '#3a8bff', '#2a1a10'], ['#c98a5e', '#ffb31a', '#1a1010'], ['#f5d0b0', '#2fd3a5', '#c8902a'], ['#a8704a', '#ff8a3d', '#1a1010'], ['#f7d2b4', '#a46bff', '#c84a2a'], ['#d89a70', '#8bd34a', '#3a2010']];
function makeOrder() { const R = RESTS[L.r]; const tops = R.main.slice(2).sort(() => Math.random() - .5); const nT = clamp(Math.max(1, L.toppings - 1) + Math.floor(Math.random() * 2), 1, tops.length); let main;
  if (L.r === 0) { const mid = ['patty'].concat(L.k >= 6 && Math.random() < .3 ? ['patty'] : []).concat(tops.slice(0, nT)); mid.sort(() => Math.random() - .5); main = ['bun', ...mid, 'bun']; }
  else { const n = L.k < 4 ? 1 : 1 + Math.floor(Math.random() * 2); main = []; const t = tops.slice(0, nT); for (let k = 0; k < n; k++) { main.push('pancake'); if (k < n - 1 && t.length > 1 && Math.random() < .5) main.push(t.shift()); } main.push(...t); }
  const sides = availSides(L); const sd = sides.length && Math.random() < L.sideP ? sides[Math.floor(Math.random() * sides.length)] : null; return { main, side: sd }; }
function spawn() { const free = [0, 1, 2].filter(k => !seats[k] && k < 3).filter(k => L.maxSeats === 3 || k !== 2); if (!free.length) return; const k = free[Math.floor(Math.random() * free.length)];
  const p = PALS[Math.floor(Math.random() * PALS.length)]; const P = cutie({ skin: p[0], shirt: p[1], hair: p[2], long: Math.random() < .5, cap: Math.random() < .25 ? '#ff5a6a' : null });
  P.g.position.set(SEATX[k] + (k < 1 ? -4 : 4), 0, -1.15); P.g.rotation.y = 0; P.baseY = .42; P.g.scale.setScalar(1.15); scene.add(P.g); const o = makeOrder(); seats[k] = { P, o, k, pat: L.patience, max: L.patience, arrive: 0, state: 'walk', el: null }; A.tone(880, .08, 'sine', .05); A.tone(1100, .1, 'sine', .05, .08); }
function multisetEq(a, b) { if (a.length !== b.length) return false; const x = a.slice().sort().join(), y = b.slice().sort().join(); return x === y; }
function matches(c) { const okMain = plate.join() === c.o.main.join(); const okSide = c.o.side ? side === c.o.side : true; return okMain && okSide && (side ? c.o.side === side : true); }
let auto = null, warnT = 0;
function prefixOk(c) { if (plate.length > c.o.main.length) return 0; for (let k = 0; k < plate.length; k++) if (plate[k] !== c.o.main[k]) return 0; return 1; }
function checkMatch() { let anyPrefix = !plate.length; const full = [];
  seats.forEach(c => { if (!c || !c.el || c.state !== 'wait') return; const ok = prefixOk(c); if (ok && plate.length) anyPrefix = true; const n = c.o.main.length;
    c.el.querySelectorAll('.ly').forEach(e => { const i = +e.dataset.i; e.classList.toggle('ok', !!ok && i < plate.length); });
    const sd = c.el.querySelector('.sd'); if (sd) sd.classList.toggle('ok', side === c.o.side);
    c.el.classList.toggle('pre', !!ok && plate.length > 0); const m = matches(c); c.el.classList.toggle('match', m); if (m) full.push(c); });
  if (full.length) { full.sort((a, b) => a.pat - b.pat); auto = { c: full[0], t: .4 }; } else auto = null;
  if (!anyPrefix && plate.length && performance.now() - warnT > 1500) { warnT = performance.now(); A.tone(200, .15, 'square', .04); toast(T('אף לקוח לא הזמין את זה – לחצו ↩️ לביטול', 'No one ordered that – tap ↩️ to undo')); } }
function serve(c) { if (state !== 'play' || c.state !== 'wait') return; A.ac();
  if (!matches(c)) { A.tone(160, .2, 'square', .06); A.voice('huh', 1.2); c.P.setMood('angry'); setTimeout(() => c.state === 'wait' && c.P.setMood('smile'), 900); toast(multisetEq(plate, c.o.main) ? T('הסדר לא נכון! בנו בדיוק כמו בתמונה 🤨', 'Wrong order! Build it exactly like the picture 🤨') : T('זה לא מה שהזמנתי! 🤨', 'That’s not what I ordered! 🤨')); combo = 0; return; }
  const frac = c.pat / c.max; const base = 10 + c.o.main.length * 2 + (c.o.side ? 4 : 0); combo++; const tip = Math.round(base * frac * .6) + (combo >= 3 ? 3 : 0); const got = base + tip; coins += got; served++;
  const p = V3(c.P.g.position.x, 2.1, c.P.g.position.z).project(camera); const d = document.createElement('div'); d.className = 'coinpop'; d.textContent = '+' + got + (combo >= 3 ? ' 🔥' : ''); d.style.left = (p.x * .5 + .5) * innerWidth + 'px'; d.style.top = (1 - (p.y * .5 + .5)) * innerHeight + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 1000);
  [0, 4, 7].forEach((n, k) => A.tone(660 * Math.pow(2, n / 12), .12, 'triangle', .08, k * .06)); A.tone(1760, .2, 'square', .03, .2); A.voice('yay', 1.2 + Math.random() * .5);
  c.P.setMood('happy'); c.state = 'eat'; c.t = 0; c.el && c.el.remove(); c.el = null; FX.burst(V3(c.P.g.position.x, 1.8, c.P.g.position.z), 18, [[2.6, 2.1, .4]], 2.2, .07, .8, 4);
  const food = new THREE.Group(); const tray = new THREE.Mesh(new THREE.CylinderGeometry(.42, .36, .05, 32), std('#ffffff', { roughness: .2 })); tray.position.y = -.03; food.add(tray); plateG.children.slice().forEach(m => food.add(m)); food.position.set(-.25, 1.01, 1.15); scene.add(food); c.food = food; if (side) { const sm = sideG.children[0]; if (sm) { sm.position.set(.45, -.05, .05); food.add(sm); } } c.fly = { t: 0, x: c.P.g.position.x }; A.noise(.3, 'bandpass', 900, .8, .08, 0, 2400); auto = null;
  plate = []; side = null; plateG.clear(); sideG.clear(); checkMatch(); updHud(); if (coins >= L.goal && !L.reached) { L.reached = true; toast(T('הגעתם ליעד! ⭐ המשיכו להרוויח', 'Goal reached! ⭐ Keep earning'), 2500); } }
function updCustomers(dt, t) {
  for (const c of seats) { if (!c) continue; c.P.update(t, dt);
    if (c.state === 'walk') { const tx = SEATX[c.k]; c.P.g.position.x = lerp(c.P.g.position.x, tx, Math.min(1, dt * 3)); c.P.legs.forEach((l, i) => l.rotation.x = Math.sin(t * 12 + i * 3) * .5); c.P.g.position.y = .42 + Math.abs(Math.sin(t * 12)) * .04; if (Math.abs(c.P.g.position.x - tx) < .05) { c.state = 'wait'; c.P.g.position.x = tx; c.P.legs.forEach(l => l.rotation.x = 0); makeBubble(c); } }
    else if (c.state === 'wait') { c.pat -= dt * (L.k >= 7 ? 1.15 : 1); if (c.pat < c.max * .35 && c.P.mood === 'smile') c.P.setMood('sad'); if (c.pat <= 0) { c.state = 'leave'; c.P.setMood('angry'); c.el && c.el.remove(); c.el = null; lost++; combo = 0; A.voice('grr', 1); toast(T('לקוח עזב בכעס 😠', 'A customer left angry 😠')); } }
    else if (c.state === 'eat') { if (c.fly) { c.fly.t = Math.min(1, c.fly.t + dt / .42); const k = c.fly.t, e = k * k * (3 - 2 * k); c.food.position.set(lerp(-.25, c.fly.x, e), lerp(1.01, .86, e) + Math.sin(k * Math.PI) * .7, lerp(1.15, -.28, e)); c.food.rotation.y = k * Math.PI * 2; if (k >= 1) { c.fly = null; c.t = 0; A.tone(990, .08, 'triangle', .06); FX.burst(V3(c.P.g.position.x, 1.2, -.25), 14, [[2.6, 2.4, 1.4]], 1.6, .06, .6, 3); } } else { c.t += dt; if (c.food) c.food.scale.setScalar(Math.max(.01, 1 - c.t / 1.6)); if (c.t > 1.7) { c.state = 'leave'; if (c.food) scene.remove(c.food); } } }
    else if (c.state === 'leave') { const tx = c.k < 1 ? -6 : 6; c.P.g.position.x = lerp(c.P.g.position.x, tx, Math.min(1, dt * 1.4)); c.P.legs.forEach((l, i) => l.rotation.x = Math.sin(t * 12 + i * 3) * .5); c.P.g.rotation.y = c.k < 1 ? -Math.PI / 2 : Math.PI / 2; if (Math.abs(c.P.g.position.x - tx) < .3) { scene.remove(c.P.g); seats[c.k] = null; } } }
}
const SQ = c => `<svg viewBox="0 0 40 14" width="30" height="11"><path d="M2 8 Q7 1 12 8 T22 8 T32 8 T38 7" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/></svg>`;
const BOTTLE = c => `<svg viewBox="0 0 32 40" width="30" height="34"><rect x="8" y="10" width="16" height="28" rx="6" fill="${c}"/><path d="M12 10 L14 3 h4 L20 10z" fill="${c}"/><rect x="14" y="0" width="4" height="4" rx="1" fill="#555"/><rect x="11" y="18" width="10" height="9" rx="2" fill="#fff" opacity=".75"/></svg>`;
const icon = x => ING[x].sauce ? SQ(ING[x].sauce) : ING[x].e;
function makeBubble(c) { const el = document.createElement('div'); el.className = 'ord'; el.innerHTML = bubbleHTML(c) + `<div class="pt"><i></i></div>`;
  el.onclick = () => serve(c); $('over').appendChild(el); c.el = el; checkMatch(); }
function bubbleHTML(c) { const n = c.o.main.length; const st = c.o.main.slice().reverse().map((x, j) => `<span class="ly" data-i="${n - 1 - j}">${icon(x)}</span>`).join(''); return `<div class="its"><div class="stk">${st}</div>${c.o.side ? `<div class="sd">${ING[c.o.side].e}</div>` : ''}</div>`; }

/* ---------- overlay positioning ---------- */
let slotEls = [];
function buildBar() { const items = availMain(L).map(id => ({ id, kind: id === RESTS[L.r].cookItem ? 'cook' : 'main' })).concat(availSides(L).map(id => ({ id, kind: 'side' })));
  $('bar').innerHTML = items.map(it => `<button class="ing" data-id="${it.id}" data-k="${it.kind}">${ING[it.id].sauce ? BOTTLE(ING[it.id].sauce) : ING[it.id].e}<small>${ING[it.id].n}</small></button>`).join('') + `<button class="ing" id="undoBtn">↩️<small>${T('בטל', 'Undo')}</small></button><button class="ing trash" id="trashBtn">🗑️<small>${T('פח', 'Bin')}</small></button>`;
  $('bar').onclick = e => { const b = e.target.closest('.ing'); if (!b || state !== 'play') return; A.ac(); if (b.id === 'trashBtn') return trash(); if (b.id === 'undoBtn') { if (plate.length) { plate.pop(); rebuildPlate(); A.tone(380, .07, 'triangle', .06); checkMatch(); } return; } const k = b.dataset.k, id = b.dataset.id; if (k === 'cook') { const r = grillSlots.findIndex(s => s.item && s.t / ING[s.item].cook >= 1 && s.t / ING[s.item].cook < 1.9); if (r >= 0) grillTap(r); else cookPut(id); } else if (k === 'side') sideOrder(id); else addMain(id); };
  $('over').innerHTML = ''; slotEls = grillSlots.map((s, k) => { const el = document.createElement('div'); el.className = 'slot'; el.onclick = () => grillTap(k); $('over').appendChild(el); return el; });
  const se = document.createElement('div'); se.className = 'slot'; se.style.borderStyle = 'dotted'; se.onclick = () => { if (side) { side = null; sideG.clear(); checkMatch(); } }; $('over').appendChild(se); slotEls.sideEl = se; }
function placeOverlay() { const pr = v => { const p = v.clone().project(camera); return [(p.x * .5 + .5) * innerWidth, (1 - (p.y * .5 + .5)) * innerHeight]; };
  grillSlots.forEach((s, k) => { const el = slotEls[k]; if (!el) return; const [x, y] = pr(V3(s.x, 1.1, s.z)); el.style.left = x + 'px'; el.style.top = y + 'px'; const ct = s.item ? s.t / ING[s.item].cook : 0; el.className = 'slot' + (s.item && ct >= 1 && ct < 1.9 ? ' ready' : '') + (s.item && ct >= 1.55 && ct < 1.9 ? ' warn' : '') + (s.item && ct >= 1.9 ? ' burnt' : ''); el.style.setProperty('--p', Math.min(1, ct) * 360 + 'deg'); el.style.opacity = s.item ? 1 : .35; });
  const cb = $('bar').querySelector('[data-k="cook"]'); if (cb) cb.classList.toggle('ready', grillSlots.some(s => s.item && s.t / ING[s.item].cook >= 1 && s.t / ING[s.item].cook < 1.9));
  if (slotEls.sideEl) { const [x, y] = pr(V3(.65, 1.1, 1.25)); slotEls.sideEl.style.left = x + 'px'; slotEls.sideEl.style.top = y + 'px'; slotEls.sideEl.style.opacity = side ? 0 : 0; slotEls.sideEl.style.pointerEvents = side ? 'auto' : 'none'; }
  for (const c of seats) if (c && c.el) { const [x, y] = pr(V3(c.P.g.position.x, 2.2, c.P.g.position.z)); c.el.style.left = x + 'px'; c.el.style.top = y + 'px'; const i = c.el.querySelector('.pt i'); i.style.width = c.pat / c.max * 100 + '%'; i.style.background = c.pat / c.max < .35 ? '#ff3b4e' : c.pat / c.max < .6 ? '#ffb31a' : '#2fd36a'; } }

/* ---------- camera ---------- */
function fit() { const a = innerWidth / innerHeight; const port = a < 1; const tgt = V3(0, 1.1, .2); const fovR = THREE.MathUtils.degToRad(camera.fov / 2); const W = port ? 5.05 : 7.2;
  const d = Math.max((port ? 3.6 : 5.6) / (2 * Math.tan(fovR)), W / (2 * Math.tan(fovR) * a)); camera.position.set(0, tgt.y + d * .5, tgt.z + d * .87); camera.lookAt(tgt);
  const bar = $('bar'); const bh = bar && !bar.hidden ? bar.getBoundingClientRect().height : 0; camera.setViewOffset(innerWidth, innerHeight, 0, port ? -bh * .35 : bh * .2, innerWidth, innerHeight); camera.updateProjectionMatrix(); }
E.onResize.push(fit);

/* ---------- loop ---------- */
let last = performance.now(), hudT = 0;
function updHud() { $('coinTxt').textContent = '🪙 ' + coins; const sec = Math.max(0, Math.ceil(timeLeft)); $('timeTxt').textContent = '⏱ ' + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); $('goalI').style.width = clamp(coins / (L.goal * 1.6) * 100, 0, 100) + '%';
  $('lvInfo').textContent = T('יעד: ', 'Goal: ') + L.goal + ' 🪙'; }
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000) * (window.__fast || 1); last = now; const t = now / 1000;
  if (state === 'play') { timeLeft -= dt; spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = L.every * (.8 + Math.random() * .5); } if (timeLeft <= 0) end();
    for (const s of grillSlots) if (s.item) { const prev = s.t / ING[s.item].cook; s.t += dt; const ct = s.t / ING[s.item].cook; room.remove(s.mesh); s.mesh = foodMesh(s.item, ct); s.mesh.position.set(s.x, 1.09, s.z); room.add(s.mesh);
      if (Math.random() < (ct > 1.9 ? .5 : .15)) FX.emit(V3(s.x + rnd(-.2, .2), 1.2, s.z + rnd(-.2, .2)), V3(0, .6, 0), ct > 1.9 ? [.25, .25, .25] : [1.2, 1.2, 1.2], .18, 1.2, -.2, ct > 1.9 ? .7 : .35);
      if (prev < 1 && ct >= 1) A.tone(1320, .12, 'sine', .07); if (prev < 1.6 && ct >= 1.6) A.tone(400, .3, 'square', .04); }
    if (pouring) { pouring.t += dt; const f = clamp(pouring.t / pouring.dur, 0, 1); const m = sideG.children[0]; if (m) { if (pouring.id === 'fries') m.scale.setScalar(Math.max(.01, f)); else if (m.userData.liq) { m.userData.liq.scale.y = Math.max(.02, f); m.userData.liq.position.y = .14 * f; } }
      if (f >= 1) { side = pouring.id; pouring = null; machine.userData.stream.visible = false; A.loopOff('pour'); A.tone(990, .08, 'triangle', .06); checkMatch(); } }
    if (auto) { auto.t -= dt; if (auto.t <= 0) { const c = auto.c; auto = null; if (c.state === 'wait' && matches(c) && !pouring) serve(c); } }
    hudT -= dt; if (hudT <= 0) { hudT = .2; updHud(); } }
  updCustomers(dt, t); placeOverlay(); FX.update(dt, 0); A.tick(); E.render(); }
function end() { state = 'won'; A.allOff(); for (const c of seats) if (c && c.el) { c.el.remove(); c.el = null; }
  const s = coins >= L.goal * 1.6 ? 3 : coins >= L.goal * 1.25 ? 2 : coins >= L.goal ? 1 : 0; if (s) { const id = L.r * 10 + L.k; if ((S.stars[id] || 0) < s) S.stars[id] = s; S.save(); [0, 4, 7, 12].forEach((n, k) => A.tone(523 * Math.pow(2, n / 12), .25, 'triangle', .09, k * .1)); FX.burst(V3(0, 2, .5), 70, CONFETTI, 3.5, .08, 1.6, 4); } else A.voice('aww', 1);
  setTimeout(() => { $('wT').textContent = s ? [T('המשמרת הסתיימה!', 'Shift over!'), T('שף מעולה!', 'Great chef!'), T('שף כוכב! 👨‍🍳', 'Star chef! 👨‍🍳')][s - 1] : T('לא הגעתם ליעד', 'Goal not reached');
    $('wP').textContent = T(`${coins} מטבעות (יעד ${L.goal}) · ${served} לקוחות מרוצים`, `${coins} coins (goal ${L.goal}) · ${served} happy customers`) + (lost ? T(` · ${lost} עזבו`, ` · ${lost} left`) : '');
    [...$('wStars').children].forEach((e, k) => { e.classList.toggle('on', k < s); e.style.animationDelay = k * .25 + 's'; }); $('wNext').hidden = !s || L.r * 10 + L.k >= 19; $('winSheet').hidden = false; }, 800); }

/* ---------- screens ---------- */
let rsel = clamp(S.rest || 0, 0, 1);
const unlocked = i => i % 10 === 0 ? (i === 0 || Object.keys(S.stars).filter(k => +k < 10).length >= 5) : (S.stars[i - 1] || 0) > 0;
function renderTitle() { $('rest').innerHTML = RESTS.map((R, k) => { const un = unlocked(k * 10); return `<button class="rb2 ${un ? '' : 'lock'}" data-r="${k}" aria-pressed="${k === rsel}"><i>${un ? R.ic : '🔒'}</i>${R.n}${un ? '' : `<br><small style="font-size:11px">${T('השלימו 5 שלבים', 'Finish 5 levels')}</small>`}</button>`; }).join('');
  let h = ''; for (let j = 0; j < 10; j++) { const i = rsel * 10 + j, un = unlocked(i) && unlocked(rsel * 10), st = S.stars[i] || 0; h += `<button class="lb ${un ? '' : 'lock'}" data-i="${i}" ${un ? '' : 'disabled'}>${un ? j + 1 : '🔒'}<small>${un ? starsHTML(st) : ''}</small></button>`; } $('lgrid').innerHTML = h; }
$('rest').onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; A.ac(); const r = +b.dataset.r; if (!unlocked(r * 10)) { A.tone(160, .2, 'square', .05); return; } rsel = r; S.rest = r; S.save(); buildRoom(RESTS[r]); renderTitle(); };
$('lgrid').onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; A.ac(); play(+b.dataset.i); };
function play(i) { L = Object.assign({}, LEVELS[i]); buildRoom(RESTS[L.r]); seats.forEach(c => { if (c) { scene.remove(c.P.g); if (c.food) scene.remove(c.food); } }); seats = [null, null, null]; plate = []; side = null; pouring = null; coins = 0; served = 0; lost = 0; combo = 0; timeLeft = L.time; spawnT = 1;
  buildBar(); state = 'play'; $('title').hidden = true; $('winSheet').hidden = true; $('hud').hidden = $('bar').hidden = $('goal').hidden = false; $('lvName').textContent = RESTS[L.r].ic + ' ' + T('שלב ', 'Level ') + (L.k + 1); updHud(); fit();
  A.startMusic({ chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], bpm: 126, lead: true, kick: true, vol: .8 });
  if (!S.tut) { toast(L.r === 0 ? T('שימו קציצה על הגריל ובנו את ההמבורגר לפי ההזמנה מלמטה למעלה. כשהכול מדויק – המנה נשלחת ללקוח לבד!', 'Grill a patty and build the burger bottom-up like the order. When it’s exactly right it flies to the customer!') : T('שימו פנקייק על הגריל והוסיפו תוספות לפי ההזמנה. כשהכול מדויק – המנה נשלחת ללקוח לבד!', 'Grill a pancake and add toppings like the order. When it’s exactly right it flies to the customer!'), 5000); S.tut = 1; S.save(); } }
function showTitle() { state = 'title'; A.allOff(); $('title').hidden = false; $('hud').hidden = $('bar').hidden = $('goal').hidden = true; $('winSheet').hidden = true; for (const c of seats) if (c && c.el) { c.el.remove(); c.el = null; } $('over').innerHTML = ''; slotEls = []; renderTitle(); }
$('mapBtn').onclick = () => showTitle();
$('wMap').onclick = () => showTitle(); $('wAgain').onclick = () => play(L.r * 10 + L.k); $('wNext').onclick = () => play(L.r * 10 + L.k + 1);
$('mapBtn').innerHTML = ICO.grid('#e8442a'); $('homeT').innerHTML = ICO.home('#e8442a'); soundButton('sndBtn', S, A, '#e8442a'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('tSub').textContent = T('הכינו מנות לפי ההזמנות, מהר לפני שהלקוחות מאבדים סבלנות – ופתחו מסעדה חדשה!', 'Cook orders fast before customers lose patience – and unlock a new restaurant!');
$('wMap').textContent = T('שלבים', 'Levels'); $('wAgain').textContent = T('שוב', 'Again'); $('wNext').textContent = T('הבא ▶', 'Next ▶');
setTimeout(() => { buildRoom(RESTS[rsel]); L = LEVELS[rsel * 10]; E.resize(); fit(); showTitle(); $('loading').hidden = true; requestAnimationFrame(frame); window.__chefOK = true; }, 20);
window.__ch = { play, get seats() { return seats; }, get plate() { return plate; }, get side() { return side; }, addMain, cookPut, grillTap, sideOrder, serve, get coins() { return coins; }, grill: () => grillSlots, get state() { return state; }, set time(v) { timeLeft = v; } };
