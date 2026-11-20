import { THREE, $, V3, C, clamp, lerp, rnd, rng, T, EN, store, engine, studioEnv, std, shadowAll, cnv, ctex, particles, CONFETTI, audio, toast, ICO, hubButtons, soundButton, qualityButton, starsHTML } from '../lib/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { LEVELS } from './levels.js';

const S = store('jam-save', { stars: {}, tier: 0 });
const E = engine(S, { fov: 38, bloom: [.35, .5, 1.25], exposure: 1, bg: '#8fd0ff' });
const { scene, camera, renderer } = E;
studioEnv(E);
const A = audio(S);
const FX = particles(E, 1200);
const N = 6, EXIT_ROW = 2;

/* ---------- themes ---------- */
const TIERS = [
  { n: T('קל', 'Easy'), sky: '#8fd0ff', fog: '#bfe6ff', sun: '#fff4e0', si: 2.4, hemi: .55, asph: '#5b6069', lamps: false, rain: false },
  { n: T('בינוני', 'Medium'), sky: '#ffb488', fog: '#ffd2b0', sun: '#ffc78f', si: 2.1, hemi: .45, asph: '#5d5a60', lamps: false, rain: false },
  { n: T('קשה', 'Hard'), sky: '#6e7f98', fog: '#8b98ab', sun: '#dfe8ff', si: 1.3, hemi: .45, asph: '#3d424b', lamps: true, rain: true },
  { n: T('מומחה', 'Expert'), sky: '#151a3a', fog: '#1c2148', sun: '#8fa6ff', si: .7, hemi: .25, asph: '#2a2d38', lamps: true, rain: false, neon: true },
];
const hemi = new THREE.HemisphereLight(C('#eaf6ff'), C('#6a7a5a'), .55); scene.add(hemi);
const sun = new THREE.DirectionalLight(C('#fff4e0'), 2.4); sun.position.set(-6, 12, 7); sun.castShadow = true; sun.shadow.mapSize.set(E.q === 'ultra' ? 2048 : 1024, E.q === 'ultra' ? 2048 : 1024);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); sun.shadow.bias = -.0005; sun.shadow.normalBias = .03; scene.add(sun);
scene.fog = new THREE.Fog(C('#bfe6ff'), 18, 42);

/* ---------- textures ---------- */
function asphaltTex(base) { const c = cnv(256, 256), g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 256, 256); const R = rng(3);
  for (let i = 0; i < 2500; i++) { const v = R(); g.fillStyle = v < .5 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.07)'; g.fillRect(R() * 256, R() * 256, 1 + R() * 2, 1 + R() * 2); } return ctex(c, 8, 8); }
function grassTex() { const c = cnv(128, 128), g = c.getContext('2d'); g.fillStyle = '#6fbf5a'; g.fillRect(0, 0, 128, 128); const R = rng(8); for (let i = 0; i < 900; i++) { g.fillStyle = R() < .5 ? '#5fae4c' : '#84cf6a'; g.fillRect(R() * 128, R() * 128, 2, 3); } return ctex(c, 20, 20); }
function windowsTex(wall, win, lit) { const c = cnv(128, 256), g = c.getContext('2d'); g.fillStyle = wall; g.fillRect(0, 0, 128, 256); const R = rng(wall.length * 7);
  for (let y = 12; y < 250; y += 28) for (let x = 10; x < 120; x += 28) { g.fillStyle = lit && R() < .45 ? '#ffd98a' : win; g.fillRect(x, y, 18, 18); } return ctex(c, 1, 1); }

/* ---------- static world ---------- */
const world = new THREE.Group(); scene.add(world);
const lotG = new THREE.Group(); scene.add(lotG);
let asphMat, lampLights = [];
function buildWorld(tier) {
  world.clear(); lampLights = []; const th = TIERS[tier];
  scene.background = C(th.sky); scene.fog.color = C(th.fog); sun.color = C(th.sun); sun.intensity = th.si; hemi.intensity = th.hemi;
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), std('#ffffff', { map: grassTex(), roughness: .95 })); grass.rotation.x = -Math.PI / 2; grass.position.y = -.02; grass.receiveShadow = true; world.add(grass);
  asphMat = std('#ffffff', { map: asphaltTex(th.asph), roughness: th.rain ? .25 : .85, metalness: th.rain ? .3 : 0 });
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(N + 1.2, N + 1.2), asphMat); lot.rotation.x = -Math.PI / 2; lot.receiveShadow = true; world.add(lot);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 80), asphMat); road.rotation.x = -Math.PI / 2; road.position.set(N / 2 + 2.2, .001, 0); road.receiveShadow = true; world.add(road);
  const road2 = new THREE.Mesh(new THREE.PlaneGeometry(80, 2.4), asphMat); road2.rotation.x = -Math.PI / 2; road2.position.set(0, .001, -N / 2 - 2.6); road2.receiveShadow = true; world.add(road2);
  const lineM = new THREE.MeshBasicMaterial({ color: '#f4f4f0' }); const yel = new THREE.MeshBasicMaterial({ color: '#ffd23a' });
  for (let z = -40; z < 40; z += 1.4) { const d = new THREE.Mesh(new THREE.PlaneGeometry(.1, .7), yel); d.rotation.x = -Math.PI / 2; d.position.set(N / 2 + 2.2, .004, z); world.add(d); }
  // parking bay lines
  for (let i = 0; i <= N; i++) { const a = new THREE.Mesh(new THREE.PlaneGeometry(.04, N), lineM); a.rotation.x = -Math.PI / 2; a.position.set(i - N / 2, .003, 0); a.material = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .22 }); world.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(N, .04), a.material); b.rotation.x = -Math.PI / 2; b.position.set(0, .003, i - N / 2); world.add(b); }
  // exit arrows on red row
  for (let k = 0; k < 2; k++) { const s = new THREE.Shape(); s.moveTo(-.25, -.12); s.lineTo(.05, -.12); s.lineTo(.05, -.25); s.lineTo(.3, 0); s.lineTo(.05, .25); s.lineTo(.05, .12); s.lineTo(-.25, .12); const ar = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .55 })); ar.rotation.x = -Math.PI / 2; ar.position.set(N / 2 + .35 + k * .55, .004, EXIT_ROW - N / 2 + .5); world.add(ar); }
  // curbs (gap at exit)
  const curbM = std(th.neon ? '#ff3b9a' : '#e9e6dd', { roughness: .6, emissive: th.neon ? C('#ff2a8a') : C('#000'), emissiveIntensity: th.neon ? 1.4 : 0 });
  const curb = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, .14, d), curbM); m.position.set(x, .07, z); m.castShadow = true; m.receiveShadow = true; world.add(m); };
  const h = N / 2 + .12; curb(0, -h, N + .36, .12); curb(0, h, N + .36, .12); curb(-h, 0, .12, N + .36);
  const ez = EXIT_ROW - N / 2 + .5; curb(h, (-h + ez - .5) / 2, .12, (ez - .5) - (-h)); curb(h, (ez + .5 + h) / 2, .12, h - (ez + .5));
  const sign = new THREE.Mesh(new THREE.BoxGeometry(.06, .5, .9), new THREE.MeshStandardMaterial({ color: '#2fd36a', emissive: C('#1faa50'), emissiveIntensity: th.neon ? 2 : .6 })); sign.position.set(h + .25, .9, ez - .8); world.add(sign);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .9, 8), std('#9aa3ad', { metalness: .8, roughness: .3 })); pole.position.set(h + .25, .45, ez - .8); world.add(pole);
  // buildings + trees
  const R = rng(tier * 13 + 5); const pal = [['#f6c89f', '#5a7aa8'], ['#cfe3f5', '#3d5f8a'], ['#f2a7a7', '#5b4a7a'], ['#fff1c2', '#4a6a8a'], ['#b8e0c8', '#3a5a6a'], ['#d9c8f5', '#4a4a7a']];
  const bld = (x, z, w, d, hh) => { const p = pal[Math.floor(R() * pal.length)]; const t = windowsTex(p[0], p[1], th.lamps); t.repeat.set(Math.max(1, Math.round(w)), Math.max(1, Math.round(hh / 1.5)));
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), std('#ffffff', { map: t, roughness: .7 })); m.position.set(x, hh / 2, z); m.castShadow = true; m.receiveShadow = true; world.add(m);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + .1, .12, d + .1), std(p[1], { roughness: .8 })); roof.position.set(x, hh + .06, z); world.add(roof); };
  for (let i = 0; i < 7; i++) bld(-N / 2 - 2.4 - R() * 1.5, -8 + i * 2.6, 1.6 + R(), 1.8 + R() * .6, 1.6 + R() * 3.5);
  for (let i = 0; i < 6; i++) bld(-8 + i * 2.8, -N / 2 - 5 - R() * 1.2, 2 + R() * .8, 1.6, 2 + R() * 4);
  const leafM = std(th.neon ? '#2f6b5a' : '#4fae54', { roughness: .8 }), trunkM = std('#8a5a3a');
  const tree = (x, z, s) => { const g = new THREE.Group(); g.position.set(x, 0, z); const tr = new THREE.Mesh(new THREE.CylinderGeometry(.06 * s, .09 * s, .7 * s, 8), trunkM); tr.position.y = .35 * s; g.add(tr);
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(.38 * s * (1 - k * .15), 1), leafM); b.position.set(rnd(-.12, .12) * s, (.85 + k * .32) * s, rnd(-.12, .12) * s); g.add(b); } world.add(shadowAll(g)); };
  for (let i = 0; i < 9; i++) tree(-N / 2 - .9, -N / 2 + .4 + i * .75, .8 + R() * .3);
  for (let i = 0; i < 12; i++) tree(N / 2 + 4.1 + R() * .6, -9 + i * 1.6, .9 + R() * .4);
  for (let i = 0; i < 8; i++) tree(-N / 2 + .3 + i * .8, N / 2 + .9 + R() * .3, .7 + R() * .3);
  // street lamps
  if (th.lamps) for (const [x, z] of [[N / 2 + .7, -2.5], [N / 2 + .7, 2], [-N / 2 - .5, -1], [-1, N / 2 + .5], [2, -N / 2 - .6]]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, 2.2, 8), std('#3a3f48', { metalness: .6 })); pl.position.set(x, 1.1, z); world.add(pl);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.12, 14, 10), new THREE.MeshBasicMaterial({ color: C('#ffd99a').multiplyScalar(5) })); bulb.position.set(x, 2.25, z); world.add(bulb);
    const L = new THREE.PointLight(C('#ffcf8a'), th.neon ? 6 : 4, 6, 1.6); L.position.set(x, 2.1, z); world.add(L); lampLights.push(L); }
  if (th.neon) { const nl = new THREE.Mesh(new THREE.PlaneGeometry(N + 1.2, N + 1.2), new THREE.MeshBasicMaterial({ color: '#4a2cff', transparent: true, opacity: .08, blending: THREE.AdditiveBlending, depthWrite: false })); nl.rotation.x = -Math.PI / 2; nl.position.y = .006; world.add(nl); }
}

/* ---------- cars ---------- */
const COLORS = ['#3d8bff', '#ffb31a', '#2fd3a5', '#a46bff', '#ff8a3d', '#5fd0ff', '#ff6fb5', '#8bd34a', '#f2f2f2', '#2c3e66', '#ffd23a', '#5a5a66'];
const glassM = new THREE.MeshPhysicalMaterial({ color: '#1b2a3e', roughness: .05, metalness: .2, clearcoat: 1, envMapIntensity: 1.6 });
const tireM = std('#1c1c22', { roughness: .8 }), rimM = std('#d5dbe3', { metalness: 1, roughness: .2 });
const lightM = new THREE.MeshBasicMaterial({ color: C('#fff6d8').multiplyScalar(3) }), tailM = new THREE.MeshBasicMaterial({ color: C('#ff2a2a').multiplyScalar(2.2) });
const wheelGeo = new THREE.CylinderGeometry(.15, .15, .1, 16); wheelGeo.rotateX(Math.PI / 2); const rimGeo = new THREE.CylinderGeometry(.08, .08, .11, 10); rimGeo.rotateX(Math.PI / 2);
function carMesh(len, color, kind, R) {
  const g = new THREE.Group(); const L = len * .96 - .1, W = .74;
  const paint = new THREE.MeshPhysicalMaterial({ color, roughness: .32, metalness: .35, clearcoat: 1, clearcoatRoughness: .12 });
  if (len === 3) {
    const bus = kind === 'bus';
    const cab = new THREE.Mesh(new RoundedBoxGeometry(bus ? L : .8, bus ? .78 : .62, W, 3, .1), paint); cab.position.set(bus ? 0 : L / 2 - .4, bus ? .52 : .45, 0); g.add(cab);
    if (bus) { for (let i = 0; i < 5; i++) { const w = new THREE.Mesh(new THREE.BoxGeometry(.34, .2, W + .01), glassM); w.position.set(-L / 2 + .42 + i * .5, .68, 0); g.add(w); } const st = new THREE.Mesh(new THREE.BoxGeometry(L - .1, .05, W + .012), std('#1c1c22')); st.position.y = .45; g.add(st); }
    else { const ws = new THREE.Mesh(new THREE.BoxGeometry(.1, .24, W - .12), glassM); ws.position.set(L / 2 - .05, .58, 0); g.add(ws);
      const box = new THREE.Mesh(new RoundedBoxGeometry(L - .86, .86, W + .04, 2, .05), std(['#ffffff', '#f4e9d8', '#e8f2ff'][Math.floor(R() * 3)], { roughness: .5 })); box.position.set(-(.86) / 2 + .0, .6, 0); box.position.x = -L / 2 + (L - .86) / 2; g.add(box);
      const logo = new THREE.Mesh(new THREE.CircleGeometry(.16, 20), new THREE.MeshStandardMaterial({ color, roughness: .4 })); logo.position.set(box.position.x, .62, W / 2 + .025); g.add(logo); const l2 = logo.clone(); l2.position.z = -W / 2 - .025; l2.rotation.y = Math.PI; g.add(l2); }
    for (const x of [-L / 2 + .35, L / 2 - .35, -L / 2 + .8]) for (const s of [-1, 1]) { const w = new THREE.Mesh(wheelGeo, tireM); w.position.set(x, .15, s * (W / 2 - .02)); g.add(w); const r = new THREE.Mesh(rimGeo, rimM); r.position.copy(w.position); g.add(r); }
  } else {
    const body = new THREE.Mesh(new RoundedBoxGeometry(L, .3, W, 3, .1), paint); body.position.y = .3; g.add(body);
    const cl = kind === 'mini' ? L * .62 : L * .5; const cab = new THREE.Mesh(new RoundedBoxGeometry(cl, .26, W - .1, 3, .1), paint); cab.position.set(kind === 'sport' ? -.08 : -.04, .55, 0); g.add(cab);
    const win = new THREE.Mesh(new RoundedBoxGeometry(cl + .02, .18, W - .06, 2, .07), glassM); win.position.set(cab.position.x, .56, 0); g.add(win);
    if (kind === 'taxi') { const sg = new THREE.Mesh(new RoundedBoxGeometry(.28, .1, .16, 2, .03), new THREE.MeshStandardMaterial({ color: '#fff3c0', emissive: C('#ffd23a'), emissiveIntensity: .8 })); sg.position.set(cab.position.x, .73, 0); g.add(sg);
      const ch = new THREE.Mesh(new THREE.BoxGeometry(L * .7, .06, W + .005), std('#1c1c22')); ch.position.y = .33; g.add(ch); }
    if (kind === 'sport') { const st = new THREE.Mesh(new THREE.BoxGeometry(L + .005, .02, .12), std('#ffffff', { roughness: .3 })); st.position.y = .455; g.add(st); const sp = new THREE.Mesh(new THREE.BoxGeometry(.12, .04, W - .04), paint); sp.position.set(-L / 2 + .08, .56, 0); g.add(sp);
      for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.04, .12, .04), std('#1c1c22')); p.position.set(-L / 2 + .08, .48, s * .25); g.add(p); } }
    for (const x of [-L / 2 + .3, L / 2 - .3]) for (const s of [-1, 1]) { const w = new THREE.Mesh(wheelGeo, tireM); w.position.set(x, .15, s * (W / 2 - .02)); g.add(w); const r = new THREE.Mesh(rimGeo, rimM); r.position.copy(w.position); g.add(r); }
  }
  for (const s of [-1, 1]) { const hl = new THREE.Mesh(new THREE.BoxGeometry(.03, .06, .13), lightM); hl.position.set(L / 2 + .005, .32, s * .24); g.add(hl); const tl = new THREE.Mesh(new THREE.BoxGeometry(.03, .06, .13), tailM); tl.position.set(-L / 2 - .005, .32, s * .24); g.add(tl); }
  shadowAll(g, true, false); g.traverse(m => { if (m.isMesh && (m.material === lightM || m.material === tailM)) m.castShadow = false; });
  return { g, paint };
}

/* ---------- level ---------- */
let LV = null, cars = [], moves = 0, hints = 3, hintUsed = false, history = [], state = 'title', winT = 0, arrow = null;
function parse(code) { const out = []; for (let i = 0; i < code.length; i += 4) out.push({ x: +code[i], y: +code[i + 1], l: +code[i + 2], h: code[i + 3] === 'h' }); return out; }
const posOf = c => c.h ? c.x : c.y;
function worldPos(c, m) { const x = c.h ? m : c.x, y = c.h ? c.y : m; return c.h ? V3(x + (c.l - 1) / 2 - (N - 1) / 2, 0, y - (N - 1) / 2) : V3(x - (N - 1) / 2, 0, y + (c.l - 1) / 2 - (N - 1) / 2); }
function loadLevel(i) {
  lotG.clear(); cars = []; const [opt, code] = LEVELS[i]; const tier = Math.floor(i / 10); if (!LV || LV.tier !== tier) buildWorld(tier);
  LV = { i, opt, tier, code }; moves = 0; hints = 3; hintUsed = false; history = []; state = 'play'; winT = 0;
  const R = rng(i * 97 + 3); const kinds2 = ['sedan', 'mini', 'sedan', 'taxi', 'mini', 'sedan', 'mini'];
  parse(code).forEach((c, k) => { const red = k === 0; let col, kind;
    if (red) { col = '#ff2a3a'; kind = 'sport'; } else if (c.l === 3) { kind = R() < .45 ? 'bus' : 'truck'; col = kind === 'bus' ? '#ffc21a' : COLORS[Math.floor(R() * COLORS.length)]; } else { kind = kinds2[Math.floor(R() * kinds2.length)]; col = kind === 'taxi' ? '#ffd23a' : COLORS[Math.floor(R() * COLORS.length)]; }
    const m = carMesh(c.l, col, kind, R); if (!c.h) m.g.rotation.y = -Math.PI / 2; // face +z
    const flip = R() < .5 && !red; if (flip) m.g.rotation.y += Math.PI;
    const car = Object.assign(c, { k, red, mesh: m.g, paint: m.paint, m: posOf(c), vis: posOf(c), bump: 0 }); m.g.position.copy(worldPos(c, c.m)); m.g.userData.car = car; lotG.add(m.g); cars.push(car); });
  if (TIERS[tier].lamps) cars.forEach(c => { if (Math.random() < .0) { } });
  arrow = new THREE.Group(); const sh = new THREE.Shape(); sh.moveTo(-.18, -.08); sh.lineTo(.02, -.08); sh.lineTo(.02, -.18); sh.lineTo(.22, 0); sh.lineTo(.02, .18); sh.lineTo(.02, .08); sh.lineTo(-.18, .08);
  const am = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: C('#ffffff').multiplyScalar(2), transparent: true, opacity: .9, depthWrite: false })); am.rotation.x = -Math.PI / 2; arrow.add(am); lotG.add(arrow);
  $('lvName').textContent = (i + 1) + ' · ' + TIERS[tier].n; updHud(); fitCamera(true);
  A.startMusic({ chords: [[[48, 52, 55], [53, 57, 60], [55, 59, 62], [53, 57, 60]], [[50, 53, 57], [55, 59, 62], [52, 55, 59], [57, 60, 64]], [[45, 48, 52], [50, 53, 57], [52, 55, 59], [45, 48, 52]], [[43, 47, 50], [48, 52, 55], [45, 48, 52], [50, 54, 57]]][tier], bpm: [108, 100, 92, 116][tier], kick: tier === 3 });
}
function updHud() { $('lvMoves').textContent = T('מהלכים ', 'Moves ') + moves + ' / ' + LV.opt; $('hintN').textContent = hints; $('hintBtn').style.opacity = hints ? 1 : .45; }
function occGrid(except) { const g = new Int8Array(N * N).fill(-1); for (const c of cars) { if (c === except) continue; for (let j = 0; j < c.l; j++) { const x = c.h ? c.m + j : c.x, y = c.h ? c.y : c.m + j; if (x < N) g[y * N + x] = c.k; } } return g; }
function range(c) { const g = occGrid(c); let lo = c.m, hi = c.m; const free = p => { const x = c.h ? p : c.x, y = c.h ? c.y : p; return g[y * N + x] < 0; };
  while (lo - 1 >= 0 && free(lo - 1)) lo--; while (hi + c.l < N && free(hi + c.l)) hi++; if (c.red && hi + c.l === N) hi = N; return [lo, hi]; }

/* ---------- solver (hint) ---------- */
function solveFrom() {
  const fixed = cars.map(c => [c.h ? c.y : c.x, c.l, c.h]); const start = cars.map(c => c.m);
  const key = s => s.join(','); const seen = new Map([[key(start), null]]); const q = [start]; let head = 0;
  while (head < q.length) { const s = q[head++]; if (s[0] + fixed[0][1] >= N) { let k = key(s), path = []; while (seen.get(k)) { const [pk, mv] = seen.get(k); path.push(mv); k = pk; } return path.reverse(); }
    const grid = new Int8Array(N * N).fill(-1); fixed.forEach(([o, l, h], i) => { for (let j = 0; j < l; j++) { const x = h ? s[i] + j : o, y = h ? o : s[i] + j; grid[y * N + x] = i; } });
    for (let i = 0; i < fixed.length; i++) { const [o, l, h] = fixed[i]; for (const d of [-1, 1]) { let m = s[i]; while (true) { m += d; if (m < 0 || m + l > N) break; const x = h ? (d > 0 ? m + l - 1 : m) : o, y = h ? o : (d > 0 ? m + l - 1 : m); if (grid[y * N + x] >= 0 && grid[y * N + x] !== i) break;
          const ns = s.slice(); ns[i] = m; const k = key(ns); if (!seen.has(k)) { seen.set(k, [key(s), [i, m]]); q.push(ns); } } } }
    if (q.length > 200000) break; }
  return null;
}
function hint() { if (state !== 'play' || !hints) return; A.ac(); const p = solveFrom(); if (!p || !p.length) return; const [i, m] = p[0]; const c = cars[i];
  hints--; hintUsed = true; pushHist(); c.m = m; moves++; sfxSlide(); updHud(); toast(T('💡 הזזתי מכונית אחת בשבילכם', '💡 I moved one car for you')); checkWin(); }
$('hintBtn').onclick = hint;

/* ---------- input ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(V3(0, 1, 0), -.3);
let drag = null;
function rayAt(e) { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); }
renderer.domElement.addEventListener('pointerdown', e => { if (state !== 'play') return; A.ac(); rayAt(e);
  const hit = ray.intersectObjects(lotG.children, true).find(h => { let o = h.object; while (o && !o.userData.car) o = o.parent; return o; });
  let car = null; if (hit) { let o = hit.object; while (o && !o.userData.car) o = o.parent; car = o.userData.car; }
  if (!car) { const p = V3(); if (ray.ray.intersectPlane(plane, p)) { const cx = Math.floor(p.x + N / 2), cy = Math.floor(p.z + N / 2); car = cars.find(c => { for (let j = 0; j < c.l; j++) { const x = c.h ? c.m + j : c.x, y = c.h ? c.y : c.m + j; if (x === cx && y === cy) return true; } return false; }); } }
  if (!car) return; const p0 = V3(); ray.ray.intersectPlane(plane, p0); drag = { car, p0, m0: car.m, rng: range(car), id: e.pointerId, last: car.m }; renderer.domElement.setPointerCapture(e.pointerId);
  A.loopTone('eng', 'sawtooth', 55, .035); car.bump = .3; });
renderer.domElement.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; rayAt(e); const p = V3(); if (!ray.ray.intersectPlane(plane, p)) return; const c = drag.car;
  const d = c.h ? p.x - drag.p0.x : p.z - drag.p0.z; const raw = drag.m0 + d; const v = clamp(raw, drag.rng[0], drag.rng[1]);
  if ((raw < drag.rng[0] - .25 || raw > drag.rng[1] + .25) && !drag.bumped) { drag.bumped = true; sfxBump(); c.bump = 1; } if (raw >= drag.rng[0] && raw <= drag.rng[1]) drag.bumped = false;
  const sp = Math.abs(v - c.vis); c.vis = v; const L = A.loop('eng'); if (L && L.osc) L.osc.frequency.setTargetAtTime(55 + Math.min(120, sp * 900), A.ctx.currentTime, .05); });
const endDrag = e => { if (!drag) return; const c = drag.car; A.loopOff('eng'); const m = Math.round(c.vis); if (m !== drag.m0) { pushHist(drag.m0, c); c.m = m; moves++; A.tone(520, .05, 'triangle', .06); updHud(); checkWin(); } else c.m = drag.m0; drag = null; };
renderer.domElement.addEventListener('pointerup', endDrag); renderer.domElement.addEventListener('pointercancel', endDrag);
function pushHist(m0, c) { history.push(cars.map(x => x.m)); if (c && m0 !== undefined) history[history.length - 1][c.k] = m0; }
$('undoBtn').onclick = () => { if (state !== 'play' || !history.length) return; const h = history.pop(); cars.forEach((c, i) => c.m = h[i]); moves = Math.max(0, moves - 1); A.tone(400, .06, 'triangle', .05); updHud(); };
$('resetBtn').onclick = () => { if (state === 'won') return; loadLevel(LV.i); };
function sfxSlide() { A.noise(.18, 'lowpass', 500, 1, .18); A.tone(90, .2, 'sawtooth', .04, 0, 140); }
function sfxBump() { A.tone(90, .12, 'sine', .2, 0, 50); A.noise(.08, 'lowpass', 400, 1, .25); }
function checkWin() { const r = cars[0]; if (r.m + r.l >= N) win(); }
function win() {
  state = 'won'; winT = 0; A.tone(220, .7, 'sawtooth', .05, 0, 880); A.noise(.6, 'bandpass', 900, 1, .15, 0, 2400); setTimeout(() => { A.tone(440, .15, 'square', .05); A.tone(554, .15, 'square', .05, .18); }, 500);
  let s = 3; if (moves > LV.opt + Math.max(2, Math.round(LV.opt * .35))) s = 2; if (moves > LV.opt * 2 + 4) s = 1; if (hintUsed) s = Math.min(s, 2); s = Math.max(1, s);
  if ((S.stars[LV.i] || 0) < s) S.stars[LV.i] = s; S.save();
  setTimeout(() => { $('wT').textContent = [T('יצאת מהפקק!', 'You got out!'), T('מעולה!', 'Great!'), T('נהג מושלם!', 'Perfect driver!')][s - 1];
    $('wP').textContent = T(`${moves} מהלכים (הכי טוב: ${LV.opt})`, `${moves} moves (best: ${LV.opt})`);
    [...$('wStars').children].forEach((e, k) => { e.classList.toggle('on', k < s); e.style.animationDelay = k * .25 + 's'; if (k < s) setTimeout(() => A.tone(880 * Math.pow(1.25, k), .3, 'triangle', .1), 250 * k + 150); });
    $('wNext').hidden = LV.i >= LEVELS.length - 1; $('winSheet').hidden = false; }, 1700);
}

/* ---------- camera ---------- */
const camP = V3(), camL = V3();
function fitCamera(snap) { const land = innerWidth / innerHeight > 1.05; const elev = THREE.MathUtils.degToRad(land ? 52 : 62);
  const pts = []; for (const x of [-N / 2 - .3, N / 2 + 1.2]) for (const z of [-N / 2 - .3, N / 2 + .3]) for (const y of [0, .9]) pts.push(V3(x, y, z));
  const center = V3(.45, 0, 0); const dir = V3(0, Math.sin(elev), Math.cos(elev)); const cam = camera.clone(); let lo = 3, hi = 60;
  for (let it = 0; it < 28; it++) { const d = (lo + hi) / 2; cam.position.copy(center).addScaledVector(dir, d); cam.lookAt(center); cam.updateMatrixWorld(); let ok = true; for (const p of pts) { const v = p.clone().project(cam); if (Math.abs(v.x) > .93 || v.y > .76 || v.y < -.84) { ok = false; break; } } if (ok) hi = d; else lo = d; }
  camP.copy(center).addScaledVector(dir, hi); camL.copy(center); cam.position.copy(camP); cam.lookAt(camL); cam.updateMatrixWorld(); let a = 9, b = -9; for (const p of pts) { const v = p.clone().project(cam); a = Math.min(a, v.y); b = Math.max(b, v.y); }
  const shift = (-.04) - (a + b) / 2; const up = V3(0, 1, 0).applyQuaternion(cam.quaternion); const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * hi; camL.addScaledVector(up, -shift * h / 2); camP.addScaledVector(up, -shift * h / 2);
  if (snap) { camera.position.copy(camP); camera.lookAt(camL); } }
E.onResize.push(() => fitCamera(true));

/* ---------- loop ---------- */
let last = performance.now(); const camLook = V3();
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
  camera.position.lerp(camP, Math.min(1, dt * 4)); camLook.lerp(camL, Math.min(1, dt * 4)); camera.lookAt(camLook);
  for (const c of cars) { if (!drag || drag.car !== c) c.vis = lerp(c.vis, c.m, Math.min(1, dt * 14)); let vis = c.vis;
    if (c.red && state === 'won') { winT += dt / cars.length * 0 + 0; }
    const p = worldPos(c, vis); c.bump = Math.max(0, c.bump - dt * 4); c.mesh.position.set(p.x, Math.sin(c.bump * Math.PI) * .06, p.z); c.mesh.rotation.z = (drag && drag.car === c ? .02 : 0); }
  if (state === 'won') { winT += dt; const r = cars[0]; const ext = Math.max(0, winT - .1); r.m = N - r.l + ext * ext * 9; r.vis = r.m; const p = worldPos(r, r.m); r.mesh.position.set(p.x, 0, p.z);
    if (winT < 1.2 && Math.random() < .6) FX.emit(V3(p.x - 1, .25, p.z), V3(-rnd(1, 2), rnd(.2, .6), rnd(-.3, .3)), [1.2, 1.2, 1.3], .14, .7, -.4, .4);
    if (winT > .3 && winT < .5) FX.burst(V3(N / 2 + .5, .6, EXIT_ROW - N / 2 + .5), 50, CONFETTI, 3.5, .09, 1.6, 5); }
  if (arrow && cars[0]) { const r = cars[0]; const p = worldPos(r, r.vis); arrow.position.set(p.x + r.l / 2 + .35 + Math.sin(t * 5) * .08, .75, p.z); arrow.visible = state === 'play'; }
  if (LV && TIERS[LV.tier].rain && Math.random() < .9) for (let k = 0; k < 3; k++) FX.emit(V3(rnd(-6, 8), 6, rnd(-6, 5)), V3(-.4, -9, 0), [.6, .7, .85], .03, .7, 0, .5);
  FX.update(dt, 0); A.tick(); E.render();
}

/* ---------- screens ---------- */
let tab = clamp(S.tier || 0, 0, 3);
const unlocked = i => i % 10 === 0 || (S.stars[i - 1] || 0) > 0;
function renderTitle() { $('tabs').innerHTML = TIERS.map((t, k) => `<button data-k="${k}" aria-pressed="${k === tab}">${t.n}</button>`).join('');
  let h = ''; for (let j = 0; j < 10; j++) { const i = tab * 10 + j, un = unlocked(i), st = S.stars[i] || 0; h += `<button class="lb ${un ? '' : 'lock'} ${LV && LV.i === i ? 'cur' : ''}" data-i="${i}" ${un ? '' : 'disabled'}>${un ? i + 1 : '🔒'}<small>${un ? starsHTML(st) : ''}</small></button>`; } $('lgrid').innerHTML = h; }
$('tabs').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; A.ac(); A.tone(660, .05, 'triangle', .06); tab = +b.dataset.k; S.tier = tab; S.save(); renderTitle(); loadLevel(tab * 10); state = 'title'; };
$('lgrid').onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; A.ac(); play(+b.dataset.i); };
function play(i) { if (!LV || LV.i !== i || state === 'won') loadLevel(i); state = 'play'; $('title').hidden = true; $('winSheet').hidden = true; $('hud').hidden = false;
  if (i === 0 && !S.tut) { toast(T('גררו את המכוניות קדימה ואחורה – פנו דרך לאדומה!', 'Drag cars back and forth – clear a way for the red one!'), 4200); S.tut = 1; S.save(); } }
function showTitle() { state = 'title'; $('title').hidden = false; $('hud').hidden = true; $('winSheet').hidden = true; renderTitle(); }
$('mapBtn').onclick = () => { tab = LV.tier; showTitle(); };
$('wMap').onclick = () => { tab = LV.tier; loadLevel(LV.i); showTitle(); };
$('wAgain').onclick = () => { $('winSheet').hidden = true; loadLevel(LV.i); };
$('wNext').onclick = () => { $('winSheet').hidden = true; play(LV.i + 1); };
$('mapBtn').innerHTML = ICO.grid('#e0233a'); $('undoBtn').innerHTML = ICO.undo('#e0233a'); $('resetBtn').innerHTML = ICO.reset('#e0233a'); $('homeT').innerHTML = ICO.home('#e0233a');
soundButton('sndBtn', S, A, '#e0233a'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('tSub').textContent = T('חניון בפקק! הזיזו את המכוניות בסדר הנכון ושחררו את המכונית האדומה', 'The lot is jammed! Slide the cars in the right order and free the red car');
$('wMap').textContent = T('שלבים', 'Levels'); $('wAgain').textContent = T('שוב', 'Again'); $('wNext').textContent = T('הבא ▶', 'Next ▶');
setTimeout(() => { const first = [...Array(LEVELS.length).keys()].find(i => unlocked(i) && !S.stars[i]) ?? 0; tab = Math.floor(first / 10); loadLevel(first); E.resize(); showTitle(); $('loading').hidden = true; requestAnimationFrame(frame); window.__jamOK = true; }, 20);
window.__j = { range, scr(c) { const p = worldPos(c, c.m).project(camera); return [(p.x * .5 + .5) * innerWidth, (1 - (p.y * .5 + .5)) * innerHeight]; }, get LV() { return LV; }, get state() { return state; }, cars: () => cars, solveFrom, play, loadLevel, apply(i, m) { pushHist(); cars[i].m = m; moves++; updHud(); checkWin(); } };
