import { THREE, $, V3, C, clamp, lerp, rnd, rng, T, EN, isTouch, store, engine, studioEnv, std, cnv, ctex, particles, audio, toast, ICO, hubButtons, soundButton, qualityButton } from '../lib/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { carMerged } from '../lib/carkit.js';

const S = store('chase-save', { stars: {}, side: 'rob', lvl: { rob: 0, cop: 0 }, car: { rob: 0, cop: 0 }, tut: 0 });
const E = engine(S, { fov: 62, far: 560, bloom: [.62, .55, .78], exposure: 1.25, vignette: .38, sat: 1.18 });
const { scene, camera, renderer } = E; studioEnv(E, '#4a5aa8', '#06070e', .35);
const A = audio(S); const FX = particles(E, 2600), FXA = particles(E, 1600, true);
const TAU = Math.PI * 2; const wrapPi = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const LOW = S.q === 'low';

/* ================= DATA ================= */
const CARS = {
  rob: [{ n: 'Viper', k: 'sport', c: '#ffd21a', d: T('מהירה וזריזה – אחיזה טובה', 'Fast and nimble – good grip'), max: 35, acc: 15, grip: 7.2, turn: 2.35, mass: 1, hp: 100 },
    { n: 'Bruiser', k: 'muscle', c: '#ff3a2a', d: T('כבדה וחזקה – מעיפה ניידות', 'Heavy and tough – knocks cops aside'), max: 33, acc: 13.5, grip: 6.4, turn: 2.15, mass: 1.5, hp: 160 },
    { n: 'Shadow', k: 'sport', c: '#9a4aff', d: T('הכי מהירה – מחליקה בפניות', 'Fastest – drifts in turns'), max: 37.5, acc: 16, grip: 5.4, turn: 2.45, mass: .9, hp: 85 }],
  cop: [{ n: 'Cruiser', k: 'police', c: '#ffffff', d: T('ניידת מאוזנת ויציבה', 'Balanced, steady patrol car'), max: 35, acc: 14.5, grip: 7, turn: 2.3, mass: 1.3, hp: 140 },
    { n: 'Interceptor', k: 'policeS', c: '#ffffff', d: T('ספורטיבית ומהירה במיוחד', 'Sporty and extra fast'), max: 38, acc: 16.5, grip: 6.4, turn: 2.4, mass: 1.1, hp: 110 },
    { n: 'Bulldog', k: 'policeV', c: '#ffffff', d: T('ג׳יפ ענק – מתנגשת הכי חזק', 'Huge SUV – hits the hardest'), max: 33, acc: 13, grip: 8, turn: 2.1, mass: 1.9, hp: 220 }],
};
const LV = {
  rob: [{ bags: 6, time: 150, heat: 1, maxH: 2, spikes: 0, block: 0 }, { bags: 8, time: 170, heat: 1, maxH: 3, spikes: 1, block: 0 }, { bags: 10, time: 190, heat: 2, maxH: 4, spikes: 1, block: 0 },
    { bags: 12, time: 210, heat: 2, maxH: 4, spikes: 1, block: 1 }, { bags: 14, time: 230, heat: 3, maxH: 5, spikes: 1, block: 1 }, { bags: 16, time: 250, heat: 3, maxH: 5, spikes: 1, block: 1 }],
  cop: [{ rob: 1, time: 120, rmax: 26, hp: 80 }, { rob: 1, time: 110, rmax: 27.5, hp: 100 }, { rob: 2, time: 180, rmax: 28, hp: 100 }, { rob: 2, time: 170, rmax: 29.5, hp: 120 }, { rob: 3, time: 240, rmax: 30, hp: 120 }, { rob: 3, time: 230, rmax: 31.5, hp: 140 }],
};
const COPCAR = { max: 33, acc: 14, grip: 7, turn: 2.3, mass: 1.35, hp: 999 }, CIVCAR = { max: 15, acc: 8, grip: 8, turn: 2.0, mass: .8, hp: 999 };
const CIVS = [['sedan', '#d8dce8'], ['sedan', '#2a5ad8'], ['taxi', '#ffc81a'], ['van', '#f4f4f4'], ['sedan', '#c8202a'], ['suv', '#2a2a32'], ['sedan', '#3a8a5a'], ['van', '#5a7ab8'], ['suv', '#8a8a96'], ['taxi', '#ffc81a'], ['sedan', '#ff8a2a'], ['sedan', '#6a3a8a']];

/* ================= CITY ================= */
const NB = 8, P = 52, W = 16, HW = W / 2, O = NB * P / 2, LANE = 3.9, EDGE = O + HW;
const RW = rng(77); const blocks = []; const PARKS = new Set(['3,3', '1,5', '6,1', '5,6', '2,1', '6,4']);
for (let i = 0; i < NB; i++) for (let j = 0; j < NB; j++) { const x0 = i * P - O + HW, z0 = j * P - O + HW; blocks.push({ i, j, x0, x1: x0 + P - W, z0, z1: z0 + P - W, park: PARKS.has(i + ',' + j), trees: [] }); }
const blockAt = (i, j) => i >= 0 && j >= 0 && i < NB && j < NB ? blocks[i * NB + j] : null;
const nodeP = (i, j) => [i * P - O, j * P - O];
function solidAt(x, z) { const i = Math.floor((x + O) / P), j = Math.floor((z + O) / P); const b = blockAt(i, j); if (!b) return Math.abs(x) > EDGE || Math.abs(z) > EDGE; if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) return false; return !b.park; }
const nearNode = (x, z) => [clamp(Math.round((x + O) / P), 0, NB), clamp(Math.round((z + O) / P), 0, NB)];

function buildCity() { const root = new THREE.Group(); scene.add(root);
  // sky
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: {},
    vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h=clamp(vP.y,0.,1.); vec3 c=mix(vec3(.16,.08,.22),vec3(.02,.03,.09),smoothstep(0.,.35,h)); c+=vec3(.25,.1,.05)*pow(1.-h,8.)*.6; gl_FragColor=vec4(c,1.); }' }));
  sky.renderOrder = -1; scene.add(sky); E.sky = sky;
  const sg = new THREE.BufferGeometry(), sp = []; for (let i = 0; i < 700; i++) { const a = RW() * TAU, y = .15 + RW() * .85, r = Math.sqrt(1 - y * y); sp.push(Math.cos(a) * r * 470, y * 470, Math.sin(a) * r * 470); } sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#c8d8ff', size: 1.6, sizeAttenuation: false, fog: false })); scene.add(stars); E.stars = stars;
  const moon = new THREE.Mesh(new THREE.CircleGeometry(16, 32), new THREE.MeshBasicMaterial({ color: C('#fff4d8').multiplyScalar(1.6), fog: false })); moon.position.set(-200, 260, -340); moon.lookAt(0, 0, 0); scene.add(moon); E.moon = moon;
  scene.fog = new THREE.Fog('#0d1028', 60, 330);
  // ground
  const ac = cnv(512, 512), ax = ac.getContext('2d'); ax.fillStyle = '#25262e'; ax.fillRect(0, 0, 512, 512); for (let i = 0; i < 9000; i++) { const v = 30 + Math.random() * 30; ax.fillStyle = `rgb(${v},${v},${v + 6})`; ax.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
  for (let i = 0; i < 14; i++) { ax.strokeStyle = 'rgba(10,10,14,.35)'; ax.lineWidth = 1 + Math.random() * 2; ax.beginPath(); let x = Math.random() * 512, y = Math.random() * 512; ax.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rnd(-40, 40); y += rnd(-40, 40); ax.lineTo(x, y); } ax.stroke(); }
  const gt = ctex(ac, 70, 70); const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ map: gt, roughness: .42, metalness: .25, color: '#9aa0b8', envMapIntensity: .8 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);
  // sidewalk slabs + parks
  const slabs = [], grass = []; for (const b of blocks) { const g = new THREE.BoxGeometry(b.x1 - b.x0, b.park ? .08 : .3, b.z1 - b.z0); g.translate((b.x0 + b.x1) / 2, b.park ? .04 : .15, (b.z0 + b.z1) / 2); (b.park ? grass : slabs).push(g); }
  const slabM = new THREE.Mesh(mergeGeometries(slabs), std('#6a6e7e', { roughness: .8 })); slabM.receiveShadow = true; root.add(slabM);
  const grassM = new THREE.Mesh(mergeGeometries(grass), std('#1e4a2a', { roughness: .95 })); grassM.receiveShadow = true; root.add(grassM);
  // trees in parks
  const tp = []; for (const b of blocks) if (b.park) { for (let k = 0; k < 9; k++) { const x = lerp(b.x0 + 4, b.x1 - 4, RW()), z = lerp(b.z0 + 4, b.z1 - 4, RW()); if (Math.abs(x - (b.x0 + b.x1) / 2) < 5 && Math.abs(z - (b.z0 + b.z1) / 2) < 5) continue; b.trees.push([x, z]); tp.push([x, z, .8 + RW() * .6]); } }
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.25, .35, 3, 6), std('#3a2a1e'), tp.length), crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.2, 1), std('#1a5a32', { roughness: .9, flatShading: true }), tp.length); const d = new THREE.Object3D();
  tp.forEach(([x, z, s], i) => { d.position.set(x, 1.5, z); d.scale.set(1, 1, 1); d.rotation.set(0, 0, 0); d.updateMatrix(); trunk.setMatrixAt(i, d.matrix); d.position.y = 3.8 * s; d.scale.setScalar(s); d.rotation.y = i; d.updateMatrix(); crown.setMatrixAt(i, d.matrix); }); trunk.castShadow = crown.castShadow = true; root.add(trunk, crown);
  // fountains in park centres
  for (const b of blocks) if (b.park) { const f = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, .7, 20), std('#8a8ea0')); f.position.set((b.x0 + b.x1) / 2, .35, (b.z0 + b.z1) / 2); root.add(f); const w = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, .1, 20), new THREE.MeshBasicMaterial({ color: C('#3ab8ff').multiplyScalar(1.5) })); w.position.set(f.position.x, .72, f.position.z); root.add(w); b.trees.push([f.position.x, f.position.z, 3.8]); }
  // buildings
  const fc = cnv(512, 512), fx = fc.getContext('2d'), ec = cnv(512, 512), ex = ec.getContext('2d'); fx.fillStyle = '#5a5e70'; fx.fillRect(0, 0, 512, 512); ex.fillStyle = '#000'; ex.fillRect(0, 0, 512, 512);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const x = c * 64 + 16, y = r * 64 + 14; fx.fillStyle = '#141824'; fx.fillRect(x, y, 32, 38); fx.fillStyle = '#4a4e5e'; fx.fillRect(x - 2, y + 38, 36, 4);
    if (Math.random() < .34) { const k = Math.random(); ex.fillStyle = k < .7 ? `hsl(${34 + Math.random() * 12},85%,${42 + Math.random() * 18}%)` : k < .9 ? `hsl(${200 + Math.random() * 15},55%,${45 + Math.random() * 12}%)` : `hsl(${290 + Math.random() * 30},50%,45%)`; ex.globalAlpha = .35 + Math.random() * .65; ex.fillRect(x, y, 32, 38); ex.globalAlpha = 1; } }
  const P3 = [], N3 = [], U3 = [], C3 = []; const TW = 17;
  function quad(a, b, c, d, n, ua, ub, va, vb, col) { for (const [p, u, v] of [[a, ua, va], [b, ub, va], [c, ub, vb], [a, ua, va], [c, ub, vb], [d, ua, vb]]) { P3.push(...p); N3.push(...n); U3.push(u, v); C3.push(col.r, col.g, col.b); } }
  function addBox(x0, x1, y0, y1, z0, z1, col, uo) { const w = x1 - x0, l = z1 - z0, v0 = y0 / TW, v1 = y1 / TW;
    quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], uo / TW, (uo + l) / TW, v0, v1, col);
    quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], uo / TW, (uo + l) / TW, v0, v1, col);
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], uo / TW, (uo + w) / TW, v0, v1, col);
    quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], uo / TW, (uo + w) / TW, v0, v1, col);
    quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], .004, .006, .994, .996, col); }
  const TINTS = ['#c8ccd8', '#a8b0c8', '#d8c8b8', '#9aa8b8', '#b8a8c8', '#c8d0c0', '#e0d8d0'].map(c => C(c));
  const neonP = [], neonC = [], NEON = ['#ff2a8a', '#2af0ff', '#9a5aff', '#ffb21f', '#3aff8a'].map(c => C(c)); const roofs = [];
  function neonBox(x0, x1, y, z0, z1, col) { const g = new THREE.BoxGeometry(x1 - x0 + .2, .35, z1 - z0 + .2).toNonIndexed(); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); const n = g.attributes.position.count; const ca = new Float32Array(n * 3); for (let i = 0; i < n; i++) ca.set([col.r, col.g, col.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(ca, 3)); g.deleteAttribute('uv'); neonP.push(g); }
  for (const b of blocks) { if (b.park) continue; const cxb = (b.x0 + b.x1) / 2, czb = (b.z0 + b.z1) / 2, dc = Math.hypot(cxb, czb) / O; const split = RW() < .35 ? 1 : RW() < .5 ? 2 : 4; const lots = [];
    const m = 2.2, X0 = b.x0 + m, X1 = b.x1 - m, Z0 = b.z0 + m, Z1 = b.z1 - m, XM = (X0 + X1) / 2 + rnd(-3, 3), ZM = (Z0 + Z1) / 2 + rnd(-3, 3);
    if (split === 1) lots.push([X0, X1, Z0, Z1]); else if (split === 2) { if (RW() < .5) lots.push([X0, XM - .6, Z0, Z1], [XM + .6, X1, Z0, Z1]); else lots.push([X0, X1, Z0, ZM - .6], [X0, X1, ZM + .6, Z1]); } else lots.push([X0, XM - .6, Z0, ZM - .6], [XM + .6, X1, Z0, ZM - .6], [X0, XM - .6, ZM + .6, Z1], [XM + .6, X1, ZM + .6, Z1]);
    for (const [x0, x1, z0, z1] of lots) { const h = Math.round((10 + RW() * 30 + (1 - dc) * 45 * RW()) / 3) * 3; const col = TINTS[Math.floor(RW() * TINTS.length)], uo = Math.floor(RW() * 8) * 3; addBox(x0, x1, .3, h, z0, z1, col, uo);
      if (h > 30 && RW() < .6) { const ins = 2 + RW() * 3, h2 = h + Math.round(6 + RW() * 15); addBox(x0 + ins, x1 - ins, h, h2, z0 + ins, z1 - ins, col, uo); if (RW() < .5) neonBox(x0 + ins, x1 - ins, h2, z0 + ins, z1 - ins, NEON[Math.floor(RW() * 5)]); roofs.push([(x0 + x1) / 2, h2, (z0 + z1) / 2]); }
      else { if (RW() < .4) neonBox(x0, x1, h, z0, z1, NEON[Math.floor(RW() * 5)]); roofs.push([(x0 + x1) / 2, h, (z0 + z1) / 2]); } } }
  // skyline outside the walls
  for (let k = 0; k < 90; k++) { const a = k / 90 * TAU, r = EDGE + 40 + RW() * 60, x = Math.cos(a) * r, z = Math.sin(a) * r, s = 10 + RW() * 14, h = 20 + RW() * 70; addBox(x - s, x + s, 0, h, z - s, z + s, TINTS[k % 7], 0); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(N3, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(U3, 2)); bg.setAttribute('color', new THREE.Float32BufferAttribute(C3, 3));
  const ft = ctex(fc), et = ctex(ec); const bm = new THREE.MeshStandardMaterial({ map: ft, emissiveMap: et, emissive: C('#ffffff'), emissiveIntensity: 1.5, vertexColors: true, roughness: .75, metalness: .15, envMapIntensity: .5 });
  const bmesh = new THREE.Mesh(bg, bm); bmesh.castShadow = bmesh.receiveShadow = true; root.add(bmesh);
  if (neonP.length) { const nm = new THREE.MeshBasicMaterial({ vertexColors: true }); nm.color.setScalar(2.4); root.add(new THREE.Mesh(mergeGeometries(neonP), nm)); }
  // roof beacons (red aircraft lights)
  const rb = new THREE.InstancedMesh(new THREE.SphereGeometry(.45, 8, 6), new THREE.MeshBasicMaterial({ color: C('#ff2a2a').multiplyScalar(3) }), roofs.length); roofs.forEach(([x, y, z], i) => { d.position.set(x, y + .6, z); d.scale.setScalar(1); d.rotation.set(0, 0, 0); d.updateMatrix(); rb.setMatrixAt(i, d.matrix); }); root.add(rb); E.beacons = rb;
  // neon signs on facades
  const WORDS = ['PIZZA', 'HOTEL', 'CAFE', '24/7', 'ARCADE', 'YA YA', 'SUSHI', 'BANK', 'DINER', 'GYM'];
  const signTex = WORDS.map((w, i) => { const c = cnv(256, 96), x = c.getContext('2d'); const col = ['#ff2a8a', '#2af0ff', '#ffd23a', '#9a5aff', '#3aff8a'][i % 5]; x.font = '900 62px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = col; x.shadowBlur = 18; x.fillStyle = col; x.fillText(w, 128, 50); x.shadowBlur = 0; x.fillStyle = '#ffffff'; x.globalAlpha = .7; x.fillText(w, 128, 50); return ctex(c); });
  for (let k = 0; k < 34; k++) { const b = blocks[Math.floor(RW() * blocks.length)]; if (b.park) continue; const side = Math.floor(RW() * 4), m = new THREE.MeshBasicMaterial({ map: signTex[k % WORDS.length], transparent: true, depthWrite: false, side: THREE.DoubleSide }); m.color.setScalar(1.8); const s = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), m);
    const y = 5 + RW() * 6, t = lerp(.25, .75, RW()); if (side === 0) { s.position.set(lerp(b.x0, b.x1, t), y, b.z1 - 2.05); } else if (side === 1) { s.position.set(lerp(b.x0, b.x1, t), y, b.z0 + 2.05); s.rotation.y = Math.PI; } else if (side === 2) { s.position.set(b.x1 - 2.05, y, lerp(b.z0, b.z1, t)); s.rotation.y = Math.PI / 2; } else { s.position.set(b.x0 + 2.05, y, lerp(b.z0, b.z1, t)); s.rotation.y = -Math.PI / 2; }
    s.translateZ(.15); root.add(s); }
  // road markings
  const yel = [], wht = [], xw = [];
  for (let k = 0; k <= NB; k++) for (let s = 0; s < NB; s++) { const L = k * P - O, a = s * P - O + HW, b2 = (s + 1) * P - O - HW;
    for (const along of [0, 1]) { const seg = (u, v, len, wd, arr, off) => arr.push(along ? [L + off, (u + v) / 2, wd, len] : [(u + v) / 2, L + off, len, wd]);
      seg(a, b2, b2 - a, .18, yel, -.22); seg(a, b2, b2 - a, .18, yel, .22);
      for (let u = a + 2; u < b2 - 3; u += 7) for (const off of [-LANE, LANE]) seg(u, u + 3.2, 3.2, .16, wht, off); } }
  for (let i = 0; i <= NB; i++) for (let j = 0; j <= NB; j++) { const [nx, nz] = nodeP(i, j); for (let s = -3; s <= 3; s++) { const o = s * 2.1; if (j < NB) xw.push([nx + o, nz + HW + 1.6, 1.1, 2.6]); if (j > 0) xw.push([nx + o, nz - HW - 1.6, 1.1, 2.6]); if (i < NB) xw.push([nx + HW + 1.6, nz + o, 2.6, 1.1]); if (i > 0) xw.push([nx - HW - 1.6, nz + o, 2.6, 1.1]); } }
  const pg = new THREE.PlaneGeometry(1, 1); pg.rotateX(-Math.PI / 2);
  const mk = (arr, col, y, add) => { const m = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ color: col, roughness: .6, emissive: col, emissiveIntensity: add || .08 }), arr.length); arr.forEach(([x, z, sx, sz], i) => { d.position.set(x, y, z); d.rotation.set(0, 0, 0); d.scale.set(sx, 1, sz); d.updateMatrix(); m.setMatrixAt(i, d.matrix); }); m.receiveShadow = true; root.add(m); };
  mk(yel, '#e8b81a', .02, .25); mk(wht, '#d8dce8', .02); mk(xw, '#c8ccd8', .02);
  // street lamps + light pools
  const lamps = []; for (const b of blocks) { if (b.park && RW() < .3) continue; for (const [x, z, ox, oz] of [[b.x0 + .9, b.z0 + .9, -1, -1], [b.x1 - .9, b.z0 + .9, 1, -1], [b.x0 + .9, b.z1 - .9, -1, 1], [b.x1 - .9, b.z1 - .9, 1, 1]]) lamps.push([x, z, ox, oz]); }
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(.11, .15, 7.5, 6), std('#2a2c34', { metalness: .6, roughness: .4 }), lamps.length); const head = new THREE.InstancedMesh(new THREE.BoxGeometry(.9, .25, .5), new THREE.MeshBasicMaterial({ color: C('#ffe0a0').multiplyScalar(3) }), lamps.length);
  const pt = (() => { const c = cnv(128, 128), x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return ctex(c); })(); E.glowTex = pt;
  const pool = new THREE.InstancedMesh(pg, new THREE.MeshBasicMaterial({ map: pt, color: C('#ffa860').multiplyScalar(.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), lamps.length);
  lamps.forEach(([x, z, ox, oz], i) => { d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.position.set(x, 3.75, z); d.updateMatrix(); pole.setMatrixAt(i, d.matrix); d.position.set(x + ox * .6, 7.4, z + oz * .6); d.updateMatrix(); head.setMatrixAt(i, d.matrix); d.position.set(x + ox * 2.2, .05, z + oz * 2.2); d.scale.set(15, 1, 15); d.updateMatrix(); pool.setMatrixAt(i, d.matrix); });
  pole.castShadow = true; root.add(pole, head, pool);
  // barrier walls at the city edge
  const wg = []; for (const s of [-1, 1]) { const a = new THREE.BoxGeometry(2 * EDGE + 2, 1.2, 1); a.translate(0, .6, s * (EDGE + .5)); wg.push(a); const b2 = new THREE.BoxGeometry(1, 1.2, 2 * EDGE + 2); b2.translate(s * (EDGE + .5), .6, 0); wg.push(b2); }
  root.add(new THREE.Mesh(mergeGeometries(wg), std('#c8c8d0', { roughness: .7 })));
  const stripe = []; for (let k = -EDGE; k < EDGE; k += 6) for (const s of [-1, 1]) { const a = new THREE.BoxGeometry(3, .25, 1.05); a.translate(k, 1.0, s * (EDGE + .5)); stripe.push(a); const b2 = new THREE.BoxGeometry(1.05, .25, 3); b2.translate(s * (EDGE + .5), 1.0, k); stripe.push(b2); }
  const sm = new THREE.MeshBasicMaterial({ color: C('#ff4a2a').multiplyScalar(1.5) }); root.add(new THREE.Mesh(mergeGeometries(stripe), sm));
  return root; }

/* ================= LIGHTS ================= */
const hemi = new THREE.HemisphereLight('#5a6ac8', '#141018', 1.1); scene.add(hemi);
const moonL = new THREE.DirectionalLight('#9ab0ff', .9); moonL.position.set(-60, 120, -80); moonL.castShadow = true; const SC = moonL.shadow.camera; SC.left = SC.bottom = -55; SC.right = SC.top = 55; SC.near = 10; SC.far = 300; moonL.shadow.mapSize.setScalar(S.q === 'ultra' ? 2048 : 1024); moonL.shadow.bias = -.0005; scene.add(moonL, moonL.target);
const headL = new THREE.SpotLight('#fff0d0', 22, 50, .5, .7, 1.2); scene.add(headL, headL.target);
const copL = [new THREE.PointLight('#ff2a2a', 0, 22, 1.4), new THREE.PointLight('#2a6aff', 0, 22, 1.4)]; copL.forEach(l => scene.add(l));
buildCity();

/* ================= CARS ================= */
function geoBox(w, h, l, x, y, z, col, r = 0) { let g = r ? new RoundedBoxGeometry(w, h, l, 2, r) : new THREE.BoxGeometry(w, h, l); g = g.index ? g.toNonIndexed() : g; g.translate(x, y, z); g.deleteAttribute('uv'); const c = C(col), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
function wheelG(x, z, r = .38) { let g = new THREE.CylinderGeometry(r, r, .32, 12).toNonIndexed(); g.rotateZ(Math.PI / 2); g.translate(x, r, z); g.deleteAttribute('uv'); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([.05, .05, .06], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
const GL = '#141c2a', WH = '#ffffff', DK = '#16161a', CH = '#b8bcc8';
function carGeo(k) { const B = [], L = []; const H = (w, l, x, z, y = .62) => L.push(geoBox(w, .16, .08, x, y, z, '#fff2d0')), Tl = (w, x, z, y = .66) => L.push(geoBox(w, .14, .08, x, y, z, '#ff1a1a'));
  if (k === 'sport' || k === 'policeS') { B.push(geoBox(2.0, .55, 4.5, 0, .55, 0, k === 'policeS' ? DK : WH, .22), geoBox(1.6, .46, 1.9, 0, 1.02, -.35, GL, .18), geoBox(1.62, .07, 1.5, 0, 1.25, -.4, k === 'policeS' ? WH : WH), geoBox(1.9, .08, .45, 0, 1.0, -2.05, k === 'policeS' ? WH : DK), geoBox(.12, .3, .12, -.7, .85, -2.05, DK), geoBox(.12, .3, .12, .7, .85, -2.05, DK));
    if (k === 'policeS') B.push(geoBox(2.04, .3, 1.6, 0, .6, -.2, WH, .1)); H(.45, 0, -.65, 2.24, .6); H(.45, 0, .65, 2.24, .6); Tl(.5, -.65, -2.26); Tl(.5, .65, -2.26); }
  else if (k === 'muscle') { B.push(geoBox(2.05, .72, 4.6, 0, .62, 0, WH, .2), geoBox(1.7, .55, 2.0, 0, 1.22, -.3, GL, .16), geoBox(1.72, .07, 1.6, 0, 1.5, -.35, WH), geoBox(.7, .2, 1.2, 0, 1.05, 1.2, DK), geoBox(2.08, .16, .25, 0, .45, 2.3, CH), geoBox(2.08, .16, .25, 0, .45, -2.3, CH)); H(.4, 0, -.68, 2.31); H(.4, 0, .68, 2.31); Tl(.6, -.6, -2.31); Tl(.6, .6, -2.31); }
  else if (k === 'van') { B.push(geoBox(2.1, 1.75, 4.9, 0, 1.15, 0, WH, .2), geoBox(1.9, .7, .1, 0, 1.55, 2.42, GL), geoBox(.06, .6, 2.6, -1.06, 1.55, .2, GL), geoBox(.06, .6, 2.6, 1.06, 1.55, .2, GL), geoBox(2.12, .3, 4.92, 0, .42, 0, '#5a5e6a')); H(.4, 0, -.7, 2.46, .75); H(.4, 0, .7, 2.46, .75); Tl(.3, -.85, -2.46, .9); Tl(.3, .85, -2.46, .9); }
  else if (k === 'suv' || k === 'policeV') { B.push(geoBox(2.15, 1.0, 4.7, 0, .85, 0, k === 'policeV' ? DK : WH, .2), geoBox(1.95, .66, 3.0, 0, 1.68, -.3, GL, .14), geoBox(1.97, .08, 2.8, 0, 2.03, -.3, WH), geoBox(2.2, .25, .3, 0, .5, 2.38, CH)); if (k === 'policeV') B.push(geoBox(2.18, .5, 2.4, 0, .95, -.1, WH, .1)); H(.45, 0, -.7, 2.36, .9); H(.45, 0, .7, 2.36, .9); Tl(.4, -.75, -2.36, 1.0); Tl(.4, .75, -2.36, 1.0); }
  else { const pol = k === 'police'; B.push(geoBox(2.0, .68, 4.5, 0, .6, 0, pol ? DK : WH, .22), geoBox(1.75, .56, 2.25, 0, 1.18, -.2, GL, .18), geoBox(1.77, .07, 1.95, 0, 1.47, -.25, WH)); if (pol) B.push(geoBox(2.04, .42, 2.0, 0, .66, -.15, WH, .1), geoBox(2.05, .2, .3, 0, .45, 2.28, DK)); H(.42, 0, -.65, 2.26); H(.42, 0, .65, 2.26); Tl(.45, -.65, -2.26); Tl(.45, .65, -2.26); if (k === 'taxi') L.push(geoBox(.8, .3, .4, 0, 1.68, -.2, '#ffd23a')); }
  const len = k === 'van' ? 1.65 : 1.45; for (const x of [-.9, .9]) for (const z of [-len, len]) B.push(wheelG(x * (k === 'van' || k.includes('V') || k === 'suv' ? 1.05 : 1), z, k === 'suv' || k === 'policeV' ? .45 : .38));
  return { body: mergeGeometries(B), lights: mergeGeometries(L) }; }
const POLO = { body: '#16161a', doors: '#ffffff', roofC: '#ffffff' };
const GEO = { sport: carMerged('corsa'), muscle: carMerged('hammer'), sedan: carMerged('sedan'), taxi: carMerged('sedan', { taxi: 1 }), van: carMerged('van'), suv: carMerged('suv'), police: carMerged('sedan', POLO), policeS: carMerged('corsa', POLO), policeV: carMerged('suv', POLO) };
const LIGHTM = new THREE.MeshBasicMaterial({ vertexColors: true }); LIGHTM.color.setScalar(3);
const matCache = {}; const bodyMat = c => matCache[c] || (matCache[c] = new THREE.MeshStandardMaterial({ color: C(c), vertexColors: true, roughness: .28, metalness: .55, envMapIntensity: 1.3 }));
const BEAMG = new THREE.PlaneGeometry(6, 14); BEAMG.rotateX(-Math.PI / 2); BEAMG.translate(0, .06, 9.2);
const beamTex = (() => { const c = cnv(64, 128), x = c.getContext('2d'); const g = x.createLinearGradient(0, 128, 0, 0); g.addColorStop(0, 'rgba(255,240,200,.9)'); g.addColorStop(1, 'rgba(255,240,200,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(24, 128); x.lineTo(40, 128); x.lineTo(64, 0); x.lineTo(0, 0); x.fill(); const r = x.createRadialGradient(32, 128, 0, 32, 128, 40); return ctex(c); })();
const BEAMM = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .55 });
const barR = new THREE.MeshBasicMaterial({ color: '#ff2020' }), barB = new THREE.MeshBasicMaterial({ color: '#2050ff' });
const poolG = new THREE.PlaneGeometry(13, 13); poolG.rotateX(-Math.PI / 2); poolG.translate(0, .07, 0);
const poolM = new THREE.MeshBasicMaterial({ map: null, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .5 });
const cars = [];
function makeCar(kind, color, role, st) { const g = new THREE.Group(); const body = new THREE.Mesh(GEO[kind].body, bodyMat(color)); body.castShadow = !LOW; g.add(body); g.add(new THREE.Mesh(GEO[kind].lights, LIGHTM)); const beam = new THREE.Mesh(BEAMG, BEAMM); g.add(beam);
  const pol = kind.startsWith('police'); if (pol) { const y = GEO[kind].H + .16; const r = new THREE.Mesh(new THREE.BoxGeometry(.55, .2, .32), barR), b = new THREE.Mesh(new THREE.BoxGeometry(.55, .2, .32), barB); r.position.set(-.33, y, -.2); b.position.set(.33, y, -.2); g.add(r, b); g.add(new THREE.Mesh(new THREE.BoxGeometry(1.3, .1, .4), new THREE.MeshStandardMaterial({ color: '#222' }))).position.set(0, y - .1, -.2);
    if (!poolM.map) poolM.map = E.glowTex; const pl = new THREE.Mesh(poolG, poolM.clone()); g.add(pl); g.userData.pool = pl; }
  scene.add(g); const c = { g, kind, role, st: { ...st }, x: 0, z: 0, a: 0, vx: 0, vz: 0, vf: 0, vs: 0, hp: st.hp, maxHp: st.hp, flat: 0, nitro: 1, loose: 0, roll: 0, pol, dead: 0, ctl: { gas: 0, brk: 0, steer: 0, hb: 0, nit: 0 }, siren: pol };
  cars.push(c); return c; }
function removeCar(c) { scene.remove(c.g); const i = cars.indexOf(c); if (i >= 0) cars.splice(i, 1); }
function place(c, x, z, a) { c.x = x; c.z = z; c.a = a; c.vx = c.vz = 0; c.g.position.set(x, 0, z); c.g.rotation.set(0, a, 0); }

/* ================= PHYSICS ================= */
let shake = 0, gt = 0;
function drive(c, dt) { const k = c.ctl, st = c.st, fx = Math.sin(c.a), fz = Math.cos(c.a); let vf = c.vx * fx + c.vz * fz, vs = c.vx * -fz + c.vz * fx;
  const nit = k.nit && c.nitro > 0; if (nit) c.nitro = Math.max(0, c.nitro - dt * .32); const flat = c.flat > 0; if (flat) c.flat -= dt; const dmg = c.hp < c.maxHp * .25 ? .82 : 1;
  const max = st.max * (nit ? 1.32 : 1) * (flat ? .55 : 1) * dmg;
  if (k.gas && !c.loose) vf += st.acc * (nit ? 1.8 : 1) * Math.max(.05, 1 - Math.max(0, vf) / max) * dt; else vf -= vf * .4 * dt;
  if (k.brk && !c.loose) { if (vf > .5) vf -= 30 * dt; else vf = Math.max(-11, vf - 10 * dt); }
  if (vf > max) vf += (max - vf) * 1.6 * dt;
  const sf = clamp(vf / 4, -1, 1) * (1 - .36 * Math.min(1, Math.abs(vf) / 40)); c.a -= (c.loose ? 0 : k.steer) * st.turn * sf * dt * (k.hb ? 1.4 : 1) + (flat ? Math.sin(gt * 13 + c.x) * .25 * dt * Math.min(1, vf / 10) : 0);
  if (c.spin) { c.a += c.spin * dt; c.spin *= Math.exp(-2.5 * dt); if (Math.abs(c.spin) < .2) c.spin = 0; }
  const wx = fx * vf - fz * vs, wz = fz * vf + fx * vs, fx2 = Math.sin(c.a), fz2 = Math.cos(c.a); vf = wx * fx2 + wz * fz2; vs = -wx * fz2 + wz * fx2;
  const grip = k.hb ? 1.4 : st.grip * (flat ? .5 : 1) * (c.loose ? .5 : 1); vs *= Math.exp(-grip * dt);
  c.vx = fx2 * vf - fz2 * vs; c.vz = fz2 * vf + fx2 * vs; c.x += c.vx * dt; c.z += c.vz * dt; c.vf = vf; c.vs = vs; if (c.loose > 0) c.loose -= dt; }
function hitWalls(c, dt) { const fx = Math.sin(c.a), fz = Math.cos(c.a); let worst = 0, nx = 0, nz = 0, px = 0, pz = 0;
  for (const o of [1.35, -1.35]) { let x = c.x + fx * o, z = c.z + fz * o; const r = 1.15; const ci = Math.floor((x + O) / P), cj = Math.floor((z + O) / P);
    for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) { const b = blockAt(i, j); if (!b) continue;
      if (b.park) { for (const [tx, tz, tr] of b.trees) { const dx = x - tx, dz = z - tz, d = Math.hypot(dx, dz), R = r + (tr ? 3.6 - (tr > 3 ? 0 : 3.2) : .4); const RR = tr > 3 ? 3.8 : 1.4; if (d < RR && d > .01) { const pen = RR - d; c.x += dx / d * pen; c.z += dz / d * pen; x += dx / d * pen; z += dz / d * pen; const vn = c.vx * dx / d + c.vz * dz / d; if (vn < 0) { c.vx -= 1.3 * vn * dx / d; c.vz -= 1.3 * vn * dz / d; if (-vn > worst) { worst = -vn; nx = dx / d; nz = dz / d; px = x; pz = z; } } } } continue; }
      const qx = clamp(x, b.x0, b.x1), qz = clamp(z, b.z0, b.z1); let dx = x - qx, dz = z - qz, d = Math.hypot(dx, dz);
      if (d === 0) { const opts = [[x - b.x0, -1, 0], [b.x1 - x, 1, 0], [z - b.z0, 0, -1], [b.z1 - z, 0, 1]].sort((p, q) => p[0] - q[0]); dx = opts[0][1]; dz = opts[0][2]; d = 0; const pen = opts[0][0] + r; c.x += dx * pen; c.z += dz * pen; x += dx * pen; z += dz * pen; const vn = c.vx * dx + c.vz * dz; if (vn < 0) { c.vx -= 1.3 * vn * dx; c.vz -= 1.3 * vn * dz; } continue; }
      if (d < r) { dx /= d; dz /= d; const pen = r - d; c.x += dx * pen; c.z += dz * pen; x += dx * pen; z += dz * pen; const vn = c.vx * dx + c.vz * dz; if (vn < 0) { c.vx -= 1.25 * vn * dx; c.vz -= 1.25 * vn * dz; if (-vn > worst) { worst = -vn; nx = dx; nz = dz; px = qx; pz = qz; } const tang = c.vx * -dz + c.vz * dx; c.vx -= -dz * tang * .4 * dt * 5; c.vz -= dx * tang * .4 * dt * 5; } } }
    const lim = EDGE - r; if (Math.abs(x) > lim) { const s = Math.sign(x); c.x -= s * (Math.abs(x) - lim); if (c.vx * s > 0) { if (Math.abs(c.vx) > worst) { worst = Math.abs(c.vx); nx = -s; nz = 0; px = s * EDGE; pz = z; } c.vx *= -.25; } }
    if (Math.abs(z) > lim) { const s = Math.sign(z); c.z -= s * (Math.abs(z) - lim); if (c.vz * s > 0) { if (Math.abs(c.vz) > worst) { worst = Math.abs(c.vz); nx = 0; nz = -s; px = x; pz = s * EDGE; } c.vz *= -.25; } } }
  if (worst > 3) impact(c, worst, px, pz, nx, nz, null); }
function hitCars() { for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) { const a = cars[i], b = cars[j]; if (a.ghost || b.ghost) continue; const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz; if (d2 > 4.4 * 4.4 || d2 < 1e-4) continue;
    // oriented: approximate cars as 2 circles each
    let best = null; for (const oa of [1.25, -1.25]) for (const ob of [1.25, -1.25]) { const ax = a.x + Math.sin(a.a) * oa, az = a.z + Math.cos(a.a) * oa, bx = b.x + Math.sin(b.a) * ob, bz = b.z + Math.cos(b.a) * ob; const ex = bx - ax, ez = bz - az, d = Math.hypot(ex, ez); if (d < 2.15 && (!best || d < best.d)) best = { d, ex, ez, ax, az }; }
    if (!best) continue; const d = best.d || .01, nx = best.ex / d, nz = best.ez / d, pen = 2.15 - d, ma = a.st.mass, mb = b.st.mass, tot = ma + mb;
    a.x -= nx * pen * mb / tot; a.z -= nz * pen * mb / tot; b.x += nx * pen * ma / tot; b.z += nz * pen * ma / tot;
    const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz; if (rv >= 0) continue; const jimp = -(1.35) * rv / (1 / ma + 1 / mb); a.vx -= jimp * nx / ma; a.vz -= jimp * nz / ma; b.vx += jimp * nx / mb; b.vz += jimp * nz / mb;
    const sp = -rv; if (sp > 3) { a.spin = (a.spin || 0) + rnd(-1, 1) * sp * .12 / ma; b.spin = (b.spin || 0) + rnd(-1, 1) * sp * .12 / mb; impact(a, sp, best.ax + nx * 1.05, best.az + nz * 1.05, nx, nz, b); } } }
function impact(c, sp, x, z, nx, nz, other) { const me = G.me; const nearMe = me && (c === me || other === me);
  if (sp > 5) for (let k = 0; k < Math.min(26, sp * 1.5); k++) FXA.emit(V3(x, .6 + Math.random(), z), V3(nx * rnd(2, 9) + rnd(-4, 4), rnd(1, 6), nz * rnd(2, 9) + rnd(-4, 4)), [3, 1.7, .5], rnd(.12, .25), rnd(.25, .6), 12);
  for (const q of [c, other]) if (q && q.role === 'civ') q.loose = 2.5;
  if (nearMe) { shake = Math.max(shake, Math.min(1.2, sp / 14)); const vol = Math.min(.35, sp / 50); A.noise(.35, 'lowpass', 900, 1, vol, 0, 200); A.tone(90, .3, 'square', vol * .4, 0, 40); if (sp > 9) A.noise(.5, 'highpass', 2500, 1, vol * .5); try { navigator.vibrate && navigator.vibrate(Math.min(80, sp * 4)); } catch (e) { } }
  if (G.state === 'play') { const dmg = sp > 4 ? (sp - 3) * 1.6 : 0;
    if (G.side === 'rob') { if (c === me || other === me) { const o = c === me ? other : c; me.hp = Math.max(0, me.hp - (o ? (o.pol ? Math.max(0, sp - 4) * .6 : Math.max(0, sp - 4) * .25) : Math.max(0, sp - 7) * .35) / me.st.mass); if (o && o.pol && sp > 6) pop(T('בום! 💥', 'BAM! 💥'), 'sm'); } }
    else { for (const [p, q] of [[c, other], [other, c]]) if (p && p.role === 'rob' && q === me && !p.caught) { p.hp = Math.max(0, p.hp - dmg * 2.2 * me.st.mass); if (sp > 6) pop(sp > 14 ? T('מכה אדירה! 💥', 'MASSIVE HIT! 💥') : T('בום! 💥', 'BAM! 💥'), sp > 14 ? 'gold' : 'sm'); } } } }

/* ================= ROAD NAV ================= */
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function assignPath(c) { const gi = (c.x + O) / P, gj = (c.z + O) / P; const ri = Math.round(gi), rj = Math.round(gj); const dX = Math.abs(c.x - (ri * P - O)), dZ = Math.abs(c.z - (rj * P - O)); const fx = Math.sin(c.a), fz = Math.cos(c.a);
  if (dZ <= dX) { let s = fx >= 0 ? 1 : -1; let ni = s > 0 ? Math.floor(gi) + 1 : Math.ceil(gi) - 1; if (ni > NB || ni < 0) { s = -s; ni = clamp(ri + s, 0, NB); } c.nb = [ni, clamp(rj, 0, NB)]; c.dir = [s, 0]; }
  else { let s = fz >= 0 ? 1 : -1; let nj = s > 0 ? Math.floor(gj) + 1 : Math.ceil(gj) - 1; if (nj > NB || nj < 0) { s = -s; nj = clamp(rj + s, 0, NB); } c.nb = [clamp(ri, 0, NB), nj]; c.dir = [0, s]; } c.ndir = null; }
function chooseDir(c, scorer) { const [i, j] = c.nb, opts = DIRS.filter(([dx, dz]) => !(dx === -c.dir[0] && dz === -c.dir[1]) && i + dx >= 0 && i + dx <= NB && j + dz >= 0 && j + dz <= NB); if (!opts.length) return [-c.dir[0], -c.dir[1]];
  if (scorer) { opts.sort((a, b) => scorer(b) - scorer(a)); return opts[0]; } const st = opts.find(o => o[0] === c.dir[0] && o[1] === c.dir[1]); return st && Math.random() < .5 ? st : opts[Math.floor(Math.random() * opts.length)]; }
function laneTarget(c, lane, desired, scorer) { if (!c.nb) assignPath(c); const [ni, nj] = c.nb, [nx, nz] = nodeP(ni, nj), [dx, dz] = c.dir; const along = (nx - c.x) * dx + (nz - c.z) * dz;
  if (along < 16 && !c.ndir) c.ndir = chooseDir(c, scorer); if (along < 4) { c.dir = c.ndir || c.dir; c.nb = [ni + c.dir[0], nj + c.dir[1]]; c.ndir = null; return laneTarget(c, lane, desired, scorer); }
  const rx = -dz, rz = dx; let tx, tz, sp = desired;
  if (c.ndir && along < 13 && (c.ndir[0] !== dx || c.ndir[1] !== dz)) { const [ex, ez] = c.ndir; tx = nx + ex * 8 + -ez * lane; tz = nz + ez * 8 + ex * lane; sp = Math.min(desired, lane > 2 ? 7 : desired * .62); }
  else { const lx = nx + rx * lane, lz = nz + rz * lane; const proj = (c.x - lx) * dx + (c.z - lz) * dz; tx = lx + dx * (proj + 11); tz = lz + dz * (proj + 11); }
  return [tx, tz, sp]; }
function steerTo(c, tx, tz, sp) { const want = Math.atan2(tx - c.x, tz - c.z), diff = wrapPi(want - c.a); const k = c.ctl; k.steer = clamp(-diff * 2.6, -1, 1); const v = c.vf;
  if (c.stuck > 1.1) { k.gas = 0; k.brk = 1; k.steer = -k.steer; if (c.stuck > 2.2) c.stuck = 0; return; } k.gas = v < sp ? 1 : 0; k.brk = v > sp + 3 || (Math.abs(diff) > 1.3 && v > 14) ? 1 : 0; }
function los(ax, az, bx, bz) { const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 4); for (let i = 1; i < n; i++) { const t = i / n; if (solidAt(lerp(ax, bx, t), lerp(az, bz, t))) return false; } return true; }
function aheadBlocked(c, dist) { const fx = Math.sin(c.a), fz = Math.cos(c.a); for (const o of cars) { if (o === c) continue; const dx = o.x - c.x, dz = o.z - c.z, al = dx * fx + dz * fz; if (al < 2 || al > dist) continue; if (Math.abs(dx * -fz + dz * fx) < 2.6) return al; } return 0; }

/* ================= GAME STATE ================= */
const G = { state: 'title', side: 'rob', lvl: 0, me: null, cops: [], robs: [], civs: [], bags: [], picks: [], spikes: [], heat: 1, timeL: 0, got: 0, need: 0, caught: 0, bust: 0, spotT: 0, heatT: 0, spikeT: 0, blockT: 0, ts: 1, slowT: 0, spk: 3 };
const inp = { l: 0, r: 0, gas: 0, brk: 0, nit: 0 }; const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyE' || e.code === 'KeyQ') useSpikes(); if (e.code === 'Escape') pause(); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); });
addEventListener('keyup', e => keys[e.code] = false);
for (const [id, k] of [['bL', 'l'], ['bR', 'r'], ['bGas', 'gas'], ['bBrk', 'brk'], ['bNit', 'nit']]) { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); A.ac(); try { b.setPointerCapture(e.pointerId); } catch (er) { } inp[k] = 1; b.classList.add('on'); }); const off = () => { inp[k] = 0; b.classList.remove('on'); }; b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off); }
$('bSpk').addEventListener('pointerdown', e => { e.preventDefault(); A.ac(); useSpikes(); });

/* ---------- world objects ---------- */
const bagGeo = (() => { const g = [geoBox(1, 1, 1, 0, 0, 0, '#fff')]; return null; })();
const beamCyl = new THREE.CylinderGeometry(1.1, 1.1, 60, 12, 1, true); beamCyl.translate(0, 30, 0);
function makePick(kind, x, z) { const g = new THREE.Group(); const col = kind === 'bag' ? '#3aff6a' : kind === 'nit' ? '#3ae8ff' : '#ffb23a';
  if (kind === 'bag') { const vis = new THREE.Group(); vis.scale.setScalar(1.35); g.add(vis);
    const prof = [[0, 0], [.75, .05], [1.05, .35], [1.12, .75], [1.0, 1.15], [.7, 1.45], [.32, 1.62], [.26, 1.7]].map(([x, y]) => new THREE.Vector2(x, y)); const sack = new THREE.Mesh(new THREE.LatheGeometry(prof, 20), std('#d8b070', { roughness: .85 })); sack.position.y = .15; vis.add(sack);
    const top = new THREE.Mesh(new THREE.ConeGeometry(.42, .55, 14, 1, true), std('#c89a58', { roughness: .85, side: THREE.DoubleSide })); top.rotation.x = Math.PI; top.position.y = 2.05; vis.add(top);
    const rope = new THREE.Mesh(new THREE.TorusGeometry(.3, .07, 6, 14), std('#7a4a1a')); rope.rotation.x = Math.PI / 2; rope.position.y = 1.82; vis.add(rope);
    const dc = cnv(128, 128), dx = dc.getContext('2d'); dx.fillStyle = '#1a8a3a'; dx.beginPath(); dx.arc(64, 64, 58, 0, TAU); dx.fill(); dx.strokeStyle = '#0a5a1a'; dx.lineWidth = 6; dx.stroke(); dx.font = '900 96px system-ui'; dx.textAlign = 'center'; dx.textBaseline = 'middle'; dx.fillStyle = '#ffffff'; dx.fillText('$', 64, 70); const dTex = ctex(dc);
    for (const sgn of [1, -1]) { const dl = new THREE.Mesh(new THREE.CircleGeometry(.55, 24), new THREE.MeshStandardMaterial({ map: dTex, transparent: true, roughness: .6, emissive: C('#2a7a2a'), emissiveIntensity: .5 })); dl.position.set(0, .95, sgn * 1.14); if (sgn < 0) dl.rotation.y = Math.PI; vis.add(dl); }
    const bn = cnv(128, 64), bx = bn.getContext('2d'); bx.fillStyle = '#6ac86a'; bx.fillRect(0, 0, 128, 64); bx.strokeStyle = '#1a6a2a'; bx.lineWidth = 5; bx.strokeRect(4, 4, 120, 56); bx.fillStyle = '#2a8a3a'; bx.beginPath(); bx.ellipse(64, 32, 18, 22, 0, 0, TAU); bx.fill(); bx.font = '900 30px system-ui'; bx.textAlign = 'center'; bx.textBaseline = 'middle'; bx.fillStyle = '#eaffea'; bx.fillText('$', 64, 34); bx.fillStyle = '#1a6a2a'; bx.font = '900 15px system-ui'; bx.fillText('100', 20, 18); bx.fillText('100', 108, 48); const nTex = ctex(bn);
    const edge = new THREE.MeshStandardMaterial({ color: '#e8f4e0', roughness: .9 }), face = new THREE.MeshStandardMaterial({ map: nTex, roughness: .7, emissive: C('#1a5a1a'), emissiveIntensity: .35 }), band = std('#ffd23a', { roughness: .5 });
    for (const [x, z, r, h] of [[1.5, .2, .4, .45], [-1.4, -.3, -.3, .3], [1.25, -.9, 1.1, .22]]) { const st = new THREE.Mesh(new THREE.BoxGeometry(1.3, h, .62), [edge, edge, face, edge, edge, edge]); st.position.set(x, h / 2, z); st.rotation.y = r; vis.add(st); const bd = new THREE.Mesh(new THREE.BoxGeometry(.18, h + .02, .64), band); bd.position.copy(st.position); bd.rotation.y = r; vis.add(bd); }
    const coinM = std('#ffc21a', { metalness: .9, roughness: .25, emissive: C('#7a5000'), emissiveIntensity: .4 }); for (let k = 0; k < 3; k++) { const cn = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .08, 18), coinM); cn.rotation.x = Math.PI / 2; cn.position.set(Math.cos(k * 2.1) * 1.7, 2.3 + k * .25, Math.sin(k * 2.1) * 1.7); cn.userData.coin = k; vis.add(cn); } }
  else { const s = new THREE.Mesh(kind === 'nit' ? new THREE.CylinderGeometry(.45, .45, 1.4, 12) : new THREE.TorusGeometry(.55, .2, 8, 16), new THREE.MeshStandardMaterial({ color: col, emissive: C(col), emissiveIntensity: 1.5, metalness: .5, roughness: .3 })); s.position.y = 1.2; g.add(s); }
  const bm = new THREE.MeshBasicMaterial({ color: C(col).multiplyScalar(.6), transparent: true, opacity: kind === 'bag' ? .22 : .14, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }); const beam = new THREE.Mesh(beamCyl, bm); g.add(beam);
  const pl = new THREE.Mesh(poolG, new THREE.MeshBasicMaterial({ map: E.glowTex, color: C(col).multiplyScalar(.7), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); pl.scale.setScalar(.6); g.add(pl);
  g.position.set(x, 0, z); scene.add(g); return { g, kind, x, z, t: Math.random() * 6 }; }
function randRoadSpot(minD = 0, from = null) { for (let k = 0; k < 200; k++) { const along = Math.random() < .5, L = Math.floor(Math.random() * (NB + 1)), s = Math.floor(Math.random() * NB), u = lerp(s * P - O + HW + 4, (s + 1) * P - O - HW - 4, Math.random()), off = (Math.random() < .5 ? -1 : 1) * rnd(1, 5.5);
  const x = along ? L * P - O + off : u, z = along ? u : L * P - O + off; if (from && Math.hypot(x - from[0], z - from[1]) < minD) continue; return [x, z, along]; } return [0, 0, true]; }
const spikeGeo = (() => { const g = []; g.push(geoBox(12, .1, 1.1, 0, .05, 0, '#2a2a30')); for (let i = 0; i < 16; i++) { let c = new THREE.ConeGeometry(.16, .5, 5).toNonIndexed(); c.translate(-5.6 + i * .75, .3, 0); c.deleteAttribute('uv'); const n = c.attributes.position.count, a = new Float32Array(n * 3); for (let q = 0; q < n; q++) a.set([.75, .78, .85], q * 3); c.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.push(c); } return mergeGeometries(g); })();
const warnM = new THREE.MeshBasicMaterial({ color: '#ff8a1a' });
function placeSpikes(target, dist = 62) { const fx = Math.sin(target.a), fz = Math.cos(target.a); const alongZ = Math.abs(fz) > Math.abs(fx); let x, z;
  if (alongZ) { const li = Math.round((target.x + O) / P); x = li * P - O; if (Math.abs(target.x - x) > HW) return null; z = clamp(target.z + Math.sign(fz) * dist, -O + 2, O - 2); const nj = Math.round((z + O) / P); if (Math.abs(z - (nj * P - O)) < HW + 2) z += (z > nj * P - O ? 1 : -1) * (HW + 3 - Math.abs(z - (nj * P - O))); }
  else { const lj = Math.round((target.z + O) / P); z = lj * P - O; if (Math.abs(target.z - z) > HW) return null; x = clamp(target.x + Math.sign(fx) * dist, -O + 2, O - 2); const ni = Math.round((x + O) / P); if (Math.abs(x - (ni * P - O)) < HW + 2) x += (x > ni * P - O ? 1 : -1) * (HW + 3 - Math.abs(x - (ni * P - O))); }
  const g = new THREE.Group(); const m = new THREE.Mesh(spikeGeo, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: .8, roughness: .35 })); g.add(m); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.ConeGeometry(.35, .9, 8), new THREE.MeshStandardMaterial({ color: '#ff6a0a', emissive: C('#ff6a0a'), emissiveIntensity: 1.2 })); w.position.set(s * 6.6, .45, 0); g.add(w); }
  const pl = new THREE.Mesh(poolG, new THREE.MeshBasicMaterial({ map: E.glowTex, color: C('#ff6a0a').multiplyScalar(.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(pl);
  g.position.set(x, 0, z); g.rotation.y = alongZ ? 0 : Math.PI / 2; scene.add(g); const sp = { g, x, z, alongZ, life: 30, hit: new Set() }; G.spikes.push(sp); return sp; }
function spikeHit(c, sp) { const lx = sp.alongZ ? c.x - sp.x : c.z - sp.z, lz = sp.alongZ ? c.z - sp.z : c.x - sp.x; return Math.abs(lx) < 6.2 && Math.abs(lz) < 1.6; }

/* ---------- helicopter ---------- */
const heli = (() => { const g = new THREE.Group(); const bm = std('#1a1e2a', { metalness: .5, roughness: .4 }); const b = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), bm); b.scale.set(1, .85, 1.6); g.add(b); const tail = new THREE.Mesh(new THREE.CylinderGeometry(.18, .35, 5, 8), bm); tail.rotation.x = Math.PI / 2; tail.position.set(0, .3, -4); g.add(tail);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), new THREE.MeshStandardMaterial({ color: '#2a4a6a', metalness: .9, roughness: .1 })); glass.scale.set(1, .8, 1); glass.position.set(0, .2, 1.3); g.add(glass);
  const rot = new THREE.Mesh(new THREE.BoxGeometry(11, .06, .35), std('#0a0a0a')); rot.position.y = 1.55; g.add(rot); const rot2 = rot.clone(); rot2.rotation.y = Math.PI / 2; g.add(rot2); const tr = new THREE.Mesh(new THREE.BoxGeometry(.06, 1.8, .2), std('#0a0a0a')); tr.position.set(.25, .4, -6.4); g.add(tr);
  const blink = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff2020' })); blink.position.set(0, -1.2, 0); g.add(blink); const sk = new THREE.Mesh(new THREE.BoxGeometry(2.4, .1, 3), bm); sk.position.y = -1.35; g.add(sk);
  const coneG = new THREE.ConeGeometry(9, 1, 32, 1, true); coneG.translate(0, -.5, 0); const cone = new THREE.Mesh(coneG, new THREE.MeshBasicMaterial({ color: C('#fff6d8').multiplyScalar(.5), transparent: true, opacity: .05, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  const spot = new THREE.Mesh(poolG, new THREE.MeshBasicMaterial({ map: E.glowTex, color: C('#fff4d8').multiplyScalar(.45), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); spot.scale.setScalar(1.45);
  const L = new THREE.SpotLight('#fff4d8', 0, 90, .26, .5, 1); scene.add(g, cone, spot, L, L.target); g.visible = cone.visible = spot.visible = false;
  return { g, rot, rot2, tr, blink, cone, spot, L, on: false, x: 0, z: 0, tx: 0, tz: 0, y: 34 }; })();
function heliShow(v) { heli.on = v; heli.g.visible = heli.cone.visible = heli.spot.visible = v; heli.L.intensity = v ? 32 : 0; if (!v) A.loopOff('heli'); }

/* ================= ROUND SETUP ================= */
function clearRound() { for (const c of [...cars]) removeCar(c); for (const p of [...G.bags, ...G.picks]) scene.remove(p.g); for (const s of G.spikes) scene.remove(s.g); G.bags = []; G.picks = []; G.spikes = []; G.cops = []; G.robs = []; G.civs = []; G.me = null; heliShow(false); }
function spawnCiv(near) { const [x, z, along] = randRoadSpot(near ? 50 : 0, near); const t = CIVS[Math.floor(Math.random() * CIVS.length)]; const c = makeCar(t[0], t[1], 'civ', { ...CIVCAR, max: rnd(11, 15) });
  const dirS = Math.random() < .5 ? 1 : -1; const a = along ? (dirS > 0 ? 0 : Math.PI) : (dirS > 0 ? Math.PI / 2 : -Math.PI / 2); const li = along ? Math.round((x + O) / P) * P - O : x, lj = along ? z : Math.round((z + O) / P) * P - O;
  const fx = Math.sin(a), fz = Math.cos(a), rx = -fz, rz = fx; place(c, along ? li + rx * LANE : x, along ? z : lj + rz * LANE, a); assignPath(c); c.want = rnd(10, 13.5); G.civs.push(c); return c; }
function respawnCiv(c, near) { const [x, z, along] = randRoadSpot(70, near); for (let k = 0; k < 20; k++) { const [x2, z2, al2] = randRoadSpot(70, near); if (Math.hypot(x2 - near[0], z2 - near[1]) < 150) { const a = al2 ? (Math.random() < .5 ? 0 : Math.PI) : (Math.random() < .5 ? Math.PI / 2 : -Math.PI / 2); const li = al2 ? Math.round((x2 + O) / P) * P - O : x2, lj = al2 ? z2 : Math.round((z2 + O) / P) * P - O; const fx = Math.sin(a), fz = Math.cos(a); place(c, al2 ? li - fz * LANE : x2, al2 ? z2 : lj + fx * LANE, a); assignPath(c); c.loose = 0; c.spin = 0; return; } } }
function spawnCop(near, far = [75, 125], mode = 'chase') { let best = null; for (let k = 0; k < 40; k++) { const i = Math.floor(Math.random() * (NB + 1)), j = Math.floor(Math.random() * (NB + 1)); const [x, z] = nodeP(i, j), d = Math.hypot(x - near[0], z - near[1]); if (d > far[0] && d < far[1]) { best = [x, z]; break; } } if (!best) best = nodeP(0, 0);
  const kinds = ['police', 'police', 'policeS', 'policeV']; const k = kinds[Math.floor(Math.random() * (G.heat >= 3 ? 4 : 2))]; const c = makeCar(k, '#ffffff', 'cop', { ...COPCAR, max: COPCAR.max + G.heat * 1.1 + (k === 'policeS' ? 2 : 0), mass: k === 'policeV' ? 1.9 : 1.35 });
  place(c, best[0], best[1], Math.atan2(near[0] - best[0], near[1] - best[1])); c.mode = mode; c.stuck = 0; G.cops.push(c); return c; }
function startRound(side, lvl) { clearRound(); G.side = side; G.lvl = lvl; const L = LV[side][lvl]; G.cfg = L; const cs = CARS[side][S.car[side] || 0];
  const me = makeCar(cs.k, cs.c, 'me', cs); G.me = me; const [sx, sz] = nodeP(4, 4); place(me, sx - LANE, sz + 14, 0); me.nitro = 1;
  G.timeL = L.time; G.got = 0; G.caught = 0; G.bust = 0; G.spotT = 0; G.heatT = 0; G.spikeT = 14; G.blockT = 30; G.spk = 3; G.ts = 1; G.slowT = 0; G.dmgTaken = 0; G.maxSpd = 0; G.lostCount = 0;
  const nCiv = LOW ? 14 : 24; for (let i = 0; i < nCiv; i++) spawnCiv([me.x, me.z]);
  if (side === 'rob') { G.need = L.bags; G.heat = L.heat; const from = [me.x, me.z]; const pts = []; for (let i = 0; i < L.bags; i++) { for (let k = 0; k < 80; k++) { const [x, z] = randRoadSpot(45, from); if (pts.every(p => Math.hypot(p[0] - x, p[1] - z) > 42)) { pts.push([x, z]); break; } } } for (const [x, z] of pts) G.bags.push(makePick('bag', x, z));
    for (let i = 0; i < G.heat; i++) spawnCop([me.x, me.z], [90, 160]); }
  else { G.need = L.rob; G.heat = 0; for (let i = 0; i < Math.min(2, L.rob); i++) spawnRobber(i); G.spk = 3; heliShow(true); heli.x = me.x; heli.z = me.z - 30; }
  for (let i = 0; i < 4; i++) { const [x, z] = randRoadSpot(40, [me.x, me.z]); G.picks.push(makePick(i % 2 ? 'fix' : 'nit', x, z)); }
  $('bSpk').hidden = side !== 'cop'; updSpk(); }
function spawnRobber(i) { const me = G.me, L = G.cfg; const [x, z, along] = randRoadSpot(90, [me.x, me.z]); const kinds = ['muscle', 'sport', 'sedan', 'suv'], cols = ['#ff3a2a', '#ffd21a', '#1a1a1a', '#9a4aff']; const c = makeCar(kinds[(G.caught + i) % 4], cols[(G.caught + i) % 4], 'rob', { max: L.rmax, acc: 14, grip: 7, turn: 2.3, mass: 1.1, hp: L.hp });
  place(c, x, z, along ? 0 : Math.PI / 2); assignPath(c); c.bust = 0; c.stuck = 0; G.robs.push(c); return c; }

/* ================= AI ================= */
function aiCiv(c, dt) { if (c.loose > 0) { c.ctl.gas = 0; c.ctl.brk = 1; c.ctl.steer = 0; if (c.loose <= dt * 2) assignPath(c); return; }
  const [tx, tz, sp] = laneTarget(c, LANE, c.want); const blk = aheadBlocked(c, 13); steerTo(c, tx, tz, blk ? Math.max(0, (blk - 5) * .8) : sp); }
function aiCop(c, dt, target) { if (c.mode === 'block') { c.ctl.gas = 0; c.ctl.brk = 1; if (Math.hypot(target.x - c.x, target.z - c.z) < 26) c.mode = 'chase'; return; }
  if (c.mode === 'search') { const [tx, tz, sp] = laneTarget(c, LANE, 13); steerTo(c, tx, tz, sp); return; }
  const d = Math.hypot(target.x - c.x, target.z - c.z), lead = Math.min(1.1, d / 30); const px = target.x + target.vx * lead, pz = target.z + target.vz * lead;
  if (d < 70 && los(c.x, c.z, px, pz)) { c.wp = null; steerTo(c, px, pz, 60); }
  else { const [ti, tj] = nearNode(target.x, target.z); if (!c.wp || Math.hypot(nodeP(...c.wp)[0] - c.x, nodeP(...c.wp)[1] - c.z) < 8) { const [ci, cj] = nearNode(c.x, c.z); const base = c.wp && Math.hypot(nodeP(...c.wp)[0] - c.x, nodeP(...c.wp)[1] - c.z) < 8 ? c.wp : [ci, cj];
      if (Math.hypot(nodeP(...base)[0] - c.x, nodeP(...base)[1] - c.z) > 10) c.wp = base; else { const opts = DIRS.map(([dx, dz]) => [base[0] + dx, base[1] + dz]).filter(([i, j]) => i >= 0 && j >= 0 && i <= NB && j <= NB); opts.sort((a, b) => (Math.abs(a[0] - ti) + Math.abs(a[1] - tj) + Math.random() * .5) - (Math.abs(b[0] - ti) + Math.abs(b[1] - tj) + Math.random() * .5)); c.wp = opts[0]; } }
    const [wx, wz] = nodeP(...c.wp); steerTo(c, wx, wz, 40); }
  if (Math.abs(c.vf) < 2 && c.ctl.gas) c.stuck = (c.stuck || 0) + dt; else if (c.stuck < 1.1) c.stuck = 0; else c.stuck += dt; }
function aiRob(c, dt, chaser) { if (c.caught) { c.ctl.gas = 0; c.ctl.brk = 1; c.ctl.steer = 0; return; }
  const sc = d => { const [i, j] = c.nb; const [x, z] = nodeP(i + d[0], j + d[1]); return Math.hypot(x - chaser.x, z - chaser.z) + Math.random() * 40; };
  const [tx, tz, sp] = laneTarget(c, 2.2, c.st.max, sc); const dd = Math.hypot(chaser.x - c.x, chaser.z - c.z); let sx = 0; if (dd < 22) sx = Math.sin(gt * 2.3 + c.x) * 3;
  steerTo(c, tx + sx, tz + sx, c.flat > 0 ? c.st.max * .6 : (dd > 90 ? c.st.max * .62 : c.st.max)); const blk = aheadBlocked(c, 9); if (blk && c.vf > 10) c.ctl.steer = clamp(c.ctl.steer + (Math.sin(c.x) > 0 ? .8 : -.8), -1, 1);
  if (Math.abs(c.vf) < 2 && c.ctl.gas) c.stuck = (c.stuck || 0) + dt; else if (c.stuck < 1.1) c.stuck = 0; else c.stuck += dt; if (c.stuck > 2.2) { c.stuck = 0; assignPath(c); } }

/* ================= HUD / FX ================= */
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function pop(txt, cls = '') { const d = document.createElement('div'); d.textContent = txt; if (cls) d.className = cls; $('msg').innerHTML = ''; $('msg').appendChild(d); }
function updSpk() { $('spkN').textContent = G.spk; $('bSpk').classList.toggle('dim', G.spk <= 0); }
function useSpikes() { if (G.state !== 'play' || G.side !== 'cop' || G.spk <= 0) return; const tgt = nearestRob(); if (!tgt) return; const sp = placeSpikes(tgt, 48); if (!sp) { toast(T('הגנב לא על כביש – נסו שוב', 'The robber is off-road – try again'), 1200); return; } G.spk--; updSpk(); pop(T('🚧 קוצים הונחו לפני הגנב!', '🚧 Spikes laid ahead of the robber!'), 'blue sm'); A.tone(500, .1, 'square', .06); A.tone(700, .12, 'square', .06, .1); }
function nearestRob() { let b = null, bd = 1e9; for (const r of G.robs) { if (r.caught) continue; const d = Math.hypot(r.x - G.me.x, r.z - G.me.z); if (d < bd) { bd = d; b = r; } } return b; }
const mini = $('mini'), mx = mini.getContext('2d');
function drawMini() { const me = G.me; if (!me) return; const sc = .62, fx = Math.sin(me.a), fz = Math.cos(me.a), rx = -fz, rz = fx; const a = sc * rx, b = -sc * fx, c = sc * rz, d = -sc * fz, e = 116 - (a * me.x + c * me.z), f = 116 - (b * me.x + d * me.z);
  const to = (x, z) => { let X = a * x + c * z + e - 116, Y = b * x + d * z + f - 116; const L = Math.hypot(X, Y); if (L > 104) { X *= 104 / L; Y *= 104 / L; } return [X + 116, Y + 116, L > 104]; };
  mx.setTransform(1, 0, 0, 1, 0, 0); mx.clearRect(0, 0, 232, 232); mx.save(); mx.beginPath(); mx.arc(116, 116, 114, 0, TAU); mx.clip(); mx.fillStyle = 'rgba(10,14,34,.9)'; mx.fillRect(0, 0, 232, 232);
  mx.setTransform(a, b, c, d, e, f); mx.fillStyle = '#4a5070'; for (let k = 0; k <= NB; k++) { mx.fillRect(k * P - O - HW, -EDGE, W, 2 * EDGE); mx.fillRect(-EDGE, k * P - O - HW, 2 * EDGE, W); } mx.fillStyle = '#1e5a32'; for (const bl of blocks) if (bl.park) mx.fillRect(bl.x0, bl.z0, bl.x1 - bl.x0, bl.z1 - bl.z0);
  mx.setTransform(1, 0, 0, 1, 0, 0); const dot = (x, z, col, r, edgeShow = true) => { const [X, Y, out] = to(x, z); if (out && !edgeShow) return; mx.fillStyle = col; mx.beginPath(); mx.arc(X, Y, out ? r * .8 : r, 0, TAU); mx.fill(); };
  for (const s of G.spikes) dot(s.x, s.z, '#ff8a1a', 5, false); for (const p of G.picks) dot(p.x, p.z, p.kind === 'nit' ? '#3ae8ff' : '#ffb23a', 4, false);
  if (G.route && G.state === 'play') { const r = G.route, pts = [[me.x, me.z], [r.wx, r.wz]]; if (r.wn) { let [i, j] = r.wn; const [ti, tj] = nearNode(r.tx, r.tz); let g = 0; while ((i !== ti || j !== tj) && g++ < 20) { if (i !== ti) i += Math.sign(ti - i); else j += Math.sign(tj - j); pts.push(nodeP(i, j)); } pts.push([r.tx, r.tz]); }
    mx.save(); mx.setLineDash([7, 5]); mx.strokeStyle = 'rgba(255,214,58,.95)'; mx.lineWidth = 4; mx.lineCap = 'round'; mx.beginPath(); pts.forEach(([x, z], k) => { const X = a * x + c * z + e, Y = b * x + d * z + f; k ? mx.lineTo(X, Y) : mx.moveTo(X, Y); }); mx.stroke(); mx.restore(); }
  for (const bg of G.bags) dot(bg.x, bg.z, '#3aff6a', 7); const blinkP = Math.floor(gt * 6) % 2;
  for (const cp of G.cops) dot(cp.x, cp.z, blinkP ? '#ff3a3a' : '#3a7aff', 6); for (const r of G.robs) if (!r.caught) dot(r.x, r.z, '#ff3a3a', 8);
  if (heli.on) { const [X, Y] = to(heli.x, heli.z); mx.strokeStyle = 'rgba(255,240,200,.7)'; mx.lineWidth = 2; mx.beginPath(); mx.arc(X, Y, 9, 0, TAU); mx.stroke(); }
  mx.fillStyle = '#fff'; mx.beginPath(); mx.moveTo(116, 104); mx.lineTo(124, 124); mx.lineTo(116, 120); mx.lineTo(108, 124); mx.closePath(); mx.fill(); mx.restore(); }
const bustRing = new THREE.Mesh(new THREE.RingGeometry(3, 3.6, 48), new THREE.MeshBasicMaterial({ color: C('#ff2a3a').multiplyScalar(1.6), transparent: true, depthWrite: false, side: THREE.DoubleSide })); bustRing.rotation.x = -Math.PI / 2; bustRing.visible = false; scene.add(bustRing); let ringV = -1;
const arrow = (() => { const sh = new THREE.Shape(); sh.moveTo(0, 1.1); sh.lineTo(.9, -.2); sh.lineTo(.35, -.2); sh.lineTo(.35, -.9); sh.lineTo(-.35, -.9); sh.lineTo(-.35, -.2); sh.lineTo(-.9, -.2); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: .18, bevelEnabled: false }); g.rotateX(Math.PI / 2); g.translate(0, 0, 0); return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: C('#ffd23a').multiplyScalar(1.3), transparent: true, opacity: .9 })); })(); scene.add(arrow); arrow.visible = false;
let hudT = 0;
function hud(dt) { hudT -= dt; if (hudT > 0) return; hudT = .1; const me = G.me;
  if (G.side === 'rob') { $('objTxt').textContent = `💰 ${G.got}/${G.need}`; $('objSub').textContent = T('שקי כסף', 'money bags'); $('heatTxt').innerHTML = '★'.repeat(G.heat) + `<span class="off">${'★'.repeat(5 - G.heat)}</span>`; $('heatSub').textContent = T('רמת מרדף', 'wanted level'); }
  else { $('objTxt').textContent = `🦹 ${G.caught}/${G.need}`; $('objSub').textContent = T('נעצרו', 'busted'); const r = nearestRob(); $('heatTxt').innerHTML = r ? `🎯 ${Math.round(Math.hypot(r.x - me.x, r.z - me.z))}m` : '—'; $('heatSub').textContent = r ? T('כוח גנב: ', 'Robber: ') + Math.round(r.hp / r.maxHp * 100) + '%' : ''; }
  $('timeTxt').textContent = fmt(Math.max(0, G.timeL)); $('timeTxt').style.color = G.timeL < 20 ? '#ff6a6a' : ''; $('hpI').style.width = Math.round(me.hp / me.maxHp * 100) + '%';
  $('spdTxt').textContent = Math.round(Math.abs(me.vf) * 3.6 * 1.3); $('nitI').style.width = Math.round(me.nitro * 100) + '%'; $('bNit').classList.toggle('dim', me.nitro <= .02);
  const bustV = G.side === 'rob' ? G.bust : Math.max(0, ...G.robs.map(r => r.bust || 0)); $('bustW').hidden = bustV < .02; const q = Math.round(bustV * 24) / 24; if (q !== ringV) { ringV = q; bustRing.geometry.dispose(); bustRing.geometry = new THREE.RingGeometry(3, 3.7, 48, 1, Math.PI / 2, -Math.max(.001, q) * TAU); } bustRing.visible = G.side === 'rob' && bustV > .02 && G.state === 'play'; bustRing.position.set(me.x, .15, me.z); $('bustI').style.width = Math.round(bustV * 100) + '%'; $('bustS').textContent = G.side === 'rob' ? T('🚨 השוטר תופס אותך! סעו מהר כדי לברוח!', '🚨 The cop is catching you! Drive fast to escape!') : T('🚔 עוצרים את הגנב…', '🚔 Arresting the robber…'); }

/* ================= GAME LOOP ================= */
let camPos = V3(0, 30, 60), camLook = V3(), camYaw = 0;
function controls(dt) { const me = G.me, k = me.ctl; if (window.__bot) { let b = null, bd = 1e9; for (const p of (G.side === 'rob' ? G.bags : G.robs)) { const d = Math.hypot(p.x - me.x, p.z - me.z); if (d < bd) { bd = d; b = p; } } if (b) aiCop(me, dt, { x: b.x, z: b.z, vx: b.vx || 0, vz: b.vz || 0 }); k.nit = 0; return; } const L = inp.l || keys.ArrowLeft || keys.KeyA, R = inp.r || keys.ArrowRight || keys.KeyD; const tgt = (R ? 1 : 0) - (L ? 1 : 0); me.steerS = me.steerS || 0; me.steerS += clamp(tgt - me.steerS, -dt * (tgt ? 7 : 11), dt * (tgt ? 7 : 11)); k.steer = me.steerS; k.gas = inp.gas || keys.ArrowUp || keys.KeyW ? 1 : 0; k.brk = inp.brk || keys.ArrowDown || keys.KeyS ? 1 : 0; k.hb = keys.ShiftLeft || keys.ShiftRight || (k.brk && k.gas) ? 1 : 0; if (k.hb) k.brk = 0; k.nit = inp.nit || keys.Space ? 1 : 0; }
function sim(dt) { const me = G.me; gt += dt; const play = G.state === 'play';
  if (play) { controls(dt); G.timeL -= dt; me.nitro = Math.min(1, me.nitro + dt * .035); }
  else if (G.state === 'count' || G.state === 'end') { me.ctl.gas = me.ctl.steer = 0; me.ctl.brk = G.state === 'count' ? 1 : 0; me.ctl.nit = 0; }
  // AI
  const chaseTarget = G.side === 'rob' ? me : null;
  for (const c of G.civs) aiCiv(c, dt);
  for (const c of G.cops) aiCop(c, dt, chaseTarget || G.robs[0] || me);
  for (const r of G.robs) aiRob(r, dt, me);
  for (const c of cars) drive(c, dt); hitCars(); for (const c of cars) hitWalls(c, dt);
  for (const c of cars) { c.g.position.set(c.x, 0, c.z); c.g.rotation.y = c.a; const lean = clamp(c.vs * .012, -.08, .08); c.g.rotation.z = -lean; c.g.rotation.x = clamp(-(c.vf - (c.pvf || 0)) * .02, -.05, .05); c.pvf = c.vf;
    if (Math.abs(c.vs) > 4.5 && Math.abs(c.vf) > 6 && Math.random() < .5) for (const s of [-1, 1]) FX.emit(V3(c.x - Math.sin(c.a) * 1.6 + Math.cos(c.a) * s * .9, .3, c.z - Math.cos(c.a) * 1.6 - Math.sin(c.a) * s * .9), V3(rnd(-.5, .5), rnd(.5, 1.2), rnd(-.5, .5)), [.6, .6, .66], rnd(1, 1.6), rnd(.6, 1.1), -.3, .28, .97);
    if (c.flat > 0 && Math.abs(c.vf) > 4 && Math.random() < .6) FXA.emit(V3(c.x + rnd(-1, 1), .25, c.z + rnd(-1, 1)), V3(rnd(-3, 3), rnd(1, 4), rnd(-3, 3)), [3, 1.8, .6], .14, .35, 10);
    if (c.hp < c.maxHp * .3 && c.hp < 900 && Math.random() < .3) FX.emit(V3(c.x + Math.sin(c.a) * 1.6, 1.2, c.z + Math.cos(c.a) * 1.6), V3(rnd(-.4, .4), rnd(1.5, 2.5), rnd(-.4, .4)), [.18, .18, .2], rnd(1.4, 2.2), 1.4, -.5, .45, .98); }
  if (me.ctl.nit && me.nitro > 0 && me.vf > 3) { for (const s of [-.5, .5]) FXA.emit(V3(me.x - Math.sin(me.a) * 2.4 + Math.cos(me.a) * s, .5, me.z - Math.cos(me.a) * 2.4 - Math.sin(me.a) * s), V3(-Math.sin(me.a) * 8 + rnd(-1, 1), rnd(0, 1), -Math.cos(me.a) * 8 + rnd(-1, 1)), Math.random() < .5 ? [.6, 1.6, 3] : [2.2, .8, 3], rnd(.35, .6), .22, 0); }
  // civ recycle
  for (const c of G.civs) if (Math.hypot(c.x - me.x, c.z - me.z) > 170) respawnCiv(c, [me.x, me.z]);
  // spikes
  for (let i = G.spikes.length - 1; i >= 0; i--) { const s = G.spikes[i]; s.life -= dt; s.g.children[1].material.emissiveIntensity = 1 + Math.sin(gt * 12) * .8;
    for (const c of cars) if (!c.pol && c.role !== 'civ' && !s.hit.has(c) && spikeHit(c, s)) { s.hit.add(c); c.flat = 5.5; FXA.burst(V3(c.x, .4, c.z), 30, [[3, 1.8, .5], [3, 3, 2]], 7, .18, .5, 10); A.noise(.25, 'highpass', 3000, 1, .25); A.noise(.6, 'bandpass', 900, 2, .15, .05); A.tone(160, .4, 'square', .06, 0, 60); if (c === me) { pop(T('💥 פנצ׳ר! הצמיגים נוקבו!', '💥 Flat tires!'), ''); shake = 1; } else if (c.role === 'rob') pop(T('💥 הגנב עלה על הקוצים!', '💥 Robber hit the spikes!'), 'blue'); }
    if (s.life <= 0 || Math.hypot(s.x - me.x, s.z - me.z) > 220) { scene.remove(s.g); G.spikes.splice(i, 1); } }
  // pickups
  for (const p of [...G.bags, ...G.picks]) { p.t += dt; const it = p.g.children[0]; it.rotation.y = p.t * (p.kind === 'bag' ? 1.2 : 2); it.position.y = (p.kind === 'bag' ? .1 : 1.2) + Math.sin(p.t * 3) * .2; if (p.kind === 'bag') for (const ch of it.children) if (ch.userData.coin != null) { ch.rotation.z = p.t * 4 + ch.userData.coin; ch.position.y = 2.3 + ch.userData.coin * .25 + Math.sin(p.t * 3 + ch.userData.coin) * .2; } }
  if (play) { for (let i = G.bags.length - 1; i >= 0; i--) { const p = G.bags[i]; if (Math.hypot(p.x - me.x, p.z - me.z) < 4.2) { scene.remove(p.g); G.bags.splice(i, 1); G.got++; FXA.burst(V3(p.x, 1.2, p.z), 40, [[.6, 3, 1], [3, 2.6, .6]], 6, .25, .9, 8); [0, 4, 7, 12].forEach((k2, j) => A.tone(880 * Math.pow(2, k2 / 12), .15, 'triangle', .07, j * .05)); A.noise(.25, 'highpass', 6000, 1, .08);
        pop(`+$${(500 + G.lvl * 250).toLocaleString()}`, 'gold'); if (G.got % 3 === 0 && G.heat < G.cfg.maxH) { G.heat++; setTimeout(() => G.state === 'play' && pop(T('🚨 רמת המרדף עלתה!', '🚨 Wanted level up!'), ''), 900); } if (G.got >= G.need) win(); } }
    for (let i = G.picks.length - 1; i >= 0; i--) { const p = G.picks[i]; if (Math.hypot(p.x - me.x, p.z - me.z) < 3.8) { scene.remove(p.g); G.picks.splice(i, 1); if (p.kind === 'nit') { me.nitro = Math.min(1, me.nitro + .6); pop(T('⚡ ניטרו!', '⚡ NITRO!'), 'blue sm'); A.noise(.5, 'bandpass', 800, 2, .12, 0, 3000); } else { me.hp = Math.min(me.maxHp, me.hp + me.maxHp * .45); pop(T('🔧 תוקן!', '🔧 Repaired!'), 'gold sm'); A.tone(660, .1, 'triangle', .07); A.tone(990, .15, 'triangle', .07, .1); }
        setTimeout(() => { if (G.state === 'play') { const [x, z] = randRoadSpot(60, [G.me.x, G.me.z]); G.picks.push(makePick(p.kind, x, z)); } }, 9000); } } }
  // police logic
  if (G.side === 'rob' && play) robLogic(dt); if (G.side === 'cop' && play) copLogic(dt);
  if (play && G.timeL <= 0) lose(G.side === 'rob' ? T('נגמר הזמן! ⏰', 'Time’s up! ⏰') : T('הגנבים ברחו! ⏰', 'The robbers got away! ⏰'));
  // helicopter
  if (heli.on) { const tg = G.side === 'rob' ? me : (nearestRob() || me); const hs = G.side === 'rob' ? 24 + G.heat * 2 : 60; const dx = tg.x + tg.vx * .8 - heli.x, dz = tg.z + tg.vz * .8 - heli.z, dd = Math.hypot(dx, dz); if (dd > .5) { const m = Math.min(dd, hs * dt); heli.x += dx / dd * m; heli.z += dz / dd * m; }
    const hy = 30 + Math.sin(gt * .7) * 2; heli.g.position.set(heli.x - 6, hy, heli.z - 8); heli.g.rotation.set(clamp(dd * .01, 0, .25), Math.atan2(dx, dz), 0); heli.rot.rotation.y = heli.rot2.rotation.y = gt * 28; heli.rot2.rotation.y += Math.PI / 2; heli.tr.rotation.x = gt * 40; heli.blink.visible = Math.floor(gt * 2) % 2 === 0;
    const sx = heli.x + Math.sin(gt * 1.3) * 3, sz = heli.z + Math.cos(gt * 1.1) * 3; heli.spot.position.set(sx, .02, sz); const top = heli.g.position.clone(); top.y -= 1.2; const h = top.y; heli.cone.position.copy(top); heli.cone.scale.set(1, h, 1); heli.cone.lookAt(sx, 0, sz); heli.cone.rotateX(-Math.PI / 2); heli.L.position.copy(top); heli.L.target.position.set(sx, 0, sz);
    const hd = Math.hypot(heli.x - me.x, heli.z - me.z); A.loopOn('heli', 'lowpass', 220, 1, .0, 13); const hl = A.loop('heli'); if (hl) hl.g.gain.value = clamp(.22 - hd / 400, .02, .2) * (G.state === 'title' ? .4 : 1); }
  // FX + lights
  FX.update(dt); FXA.update(dt); const ph = Math.floor(gt * 7) % 4; barR.color.setScalar(0).r = ph < 2 ? 3 : .25; barB.color.setRGB(0, .12, ph >= 2 ? 3 : .3);
  const cl = [...cars].filter(c => c.pol && c.siren).sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z));
  for (const c of cars) if (c.g.userData.pool) { const pm = c.g.userData.pool.material; pm.color.set(ph < 2 ? '#ff2020' : '#2050ff'); pm.opacity = c.siren ? .45 : 0; }
  copL.forEach((l, i) => { const c = cl[i >> 0]; if (c) { l.position.set(c.x, 2.4, c.z); l.color.set(ph < 2 ? (i ? '#ff2020' : '#ff2020') : '#2050ff'); l.intensity = 14; } else l.intensity = 0; });
  // police edge glow
  const dc = cl[0] && cl[0] !== me ? Math.hypot(cl[0].x - me.x, cl[0].z - me.z) : (G.side === 'cop' ? 30 : 999); const eo = G.state === 'title' ? 0 : clamp(1 - dc / 55, 0, .85); $('edge').style.opacity = eo; $('edge').style.boxShadow = `inset 0 0 90px 30px ${ph < 2 ? 'rgba(255,30,40,.75)' : 'rgba(40,90,255,.75)'}`;
  // audio
  if (G.state === 'play' || G.state === 'count') { const sp = Math.abs(me.vf); const e1 = A.loop('eng'), e2 = A.loop('eng2'); if (e1) e1.osc.frequency.value = 55 + sp * 4.2 + (me.ctl.nit ? 40 : 0); if (e2) e2.osc.frequency.value = 28 + sp * 2.1; const sk = A.loop('skid'); if (sk) sk.g.gain.value = Math.abs(me.vs) > 4.5 && sp > 6 ? .07 : 0;
    const sir = A.loop('sir'); if (sir) { sir.osc.frequency.value = 720 + 260 * Math.sin(gt * 5.2); sir.g.gain.value = G.side === 'cop' ? .022 : clamp(.05 - dc / 1500, 0, .045); } }
  // camera
  updCam(dt); }
function robLogic(dt) { const me = G.me;
  // spawn / maintain cops
  const want = [0, 1, 2, 3, 4, 5][G.heat]; if (G.cops.filter(c => c.mode !== 'block').length < want) { const c = spawnCop([me.x, me.z]); c.mode = 'chase'; }
  // spotted?
  let seen = false; for (const c of G.cops) { const d = Math.hypot(c.x - me.x, c.z - me.z); if (d < 58 && los(c.x, c.z, me.x, me.z)) seen = true; }
  const inLight = heli.on && Math.hypot(heli.x - me.x, heli.z - me.z) < 10; if (inLight) seen = true;
  if (seen) { G.spotT = 0; for (const c of G.cops) if (c.mode === 'search') { c.mode = 'chase'; c.siren = true; } } else { G.spotT += dt; if (G.spotT > 7 && G.heat > 1) { G.spotT = 0; G.heat--; G.lostCount++; pop(T('😎 התחמקתם מהם!', '😎 You lost them!'), 'gold'); A.voice('yay', .9); for (const c of G.cops) if (Math.hypot(c.x - me.x, c.z - me.z) > 60) { c.mode = 'search'; assignPath(c); } } }
  G.heatT += dt; if (G.heatT > 45 && G.heat < G.cfg.maxH) { G.heatT = 0; G.heat++; pop(T('🚨 תגבורת בדרך!', '🚨 Backup is coming!'), ''); }
  heliShow(G.heat >= 3 && G.cfg.maxH >= 3 ? true : false);
  // remove extra cops far away
  for (let i = G.cops.length - 1; i >= 0; i--) { const c = G.cops[i]; if (Math.hypot(c.x - me.x, c.z - me.z) > 200 || (G.cops.length > want + 1 && c.mode === 'search' && Math.hypot(c.x - me.x, c.z - me.z) > 90)) { removeCar(c); G.cops.splice(i, 1); } }
  // spikes & roadblocks
  if (G.cfg.spikes && G.heat >= 2) { G.spikeT -= dt; if (G.spikeT <= 0 && me.vf > 10) { const s = placeSpikes(me, 70 + Math.random() * 20); G.spikeT = s ? rnd(16, 24) : 2; if (s) { pop(T('⚠️ קוצים על הכביש לפניכם!', '⚠️ Spike strip ahead!'), 'sm'); A.tone(880, .12, 'square', .05); A.tone(660, .12, 'square', .05, .14); } } }
  if (G.cfg.block && G.heat >= 3) { G.blockT -= dt; if (G.blockT <= 0 && me.vf > 12) { const s = placeSpikes(me, 90); G.blockT = s ? rnd(28, 36) : 3; if (s) { for (const k of [-1, 1]) { const c = spawnCop([s.x, s.z], [0, 1], 'block'); const off = 4.5 * k; place(c, s.x + (s.alongZ ? off : 0), s.z + (s.alongZ ? 2.8 : 0) + (s.alongZ ? 0 : off), s.alongZ ? Math.PI / 2 + k * .5 : k * .5); c.x += s.alongZ ? 0 : 2.8; c.mode = 'block'; } pop(T('🚧 מחסום משטרתי!', '🚧 Police roadblock!'), ''); } } }
  // bust meter
  let close = false, nearC = 1e9; for (const c of G.cops) { const dd = Math.hypot(c.x - me.x, c.z - me.z); if (c.mode !== 'block') nearC = Math.min(nearC, dd); if (dd < 6.5 && c.mode !== 'block') close = true; } if (nearC < 25 && !S.bustTip) { S.bustTip = 1; S.save(); toast(T('🚔 שימו לב: אם ניידת נוגעת בכם כשאתם כמעט עומדים – מד המעצר מתמלא, ואחרי 3 שניות נתפסים! הדרך לברוח: לא לעצור ולהמשיך לנסוע.', '🚔 Heads up: if a cop car touches you while you are almost stopped, the arrest meter fills – 3 seconds and you are busted! To escape: keep moving.'), 6000); } if (close && Math.abs(me.vf) < 6 && !window.__nobust) G.bust = Math.min(1, G.bust + dt / 2.8); else G.bust = Math.max(0, G.bust - dt / 1.4);
  if (G.bust >= 1) lose(T('נתפסתם! 🚔', 'BUSTED! 🚔'), true); else if (me.hp <= 0 && !window.__nobust) lose(T('הרכב התרסק – נתפסתם! 🚔', 'Car wrecked – BUSTED! 🚔'), true); }
function copLogic(dt) { const me = G.me;
  for (const r of G.robs) { if (r.caught) continue; const d = Math.hypot(r.x - me.x, r.z - me.z); if ((d < 8 && Math.abs(r.vf) < 6) || r.hp <= 0) r.bust = Math.min(1, r.bust + dt / (r.hp <= 0 ? .4 : 1.4)); else r.bust = Math.max(0, r.bust - dt / 2);
    if (r.bust >= 1) { r.caught = 1; G.caught++; r.siren = false; slow(1.4); flash(.6); pop(T('🚔 נעצר! עבודה מצוינת!', '🚔 BUSTED! Great job!'), 'blue'); A.voice('yay', 1); [0, 4, 7, 12].forEach((k2, j) => A.tone(523 * Math.pow(2, k2 / 12), .2, 'triangle', .07, j * .08));
      setTimeout(() => { removeCar(r); G.robs.splice(G.robs.indexOf(r), 1); if (G.state !== 'play') return; if (G.caught >= G.need) win(); else if (G.robs.length + G.caught < G.need) { spawnRobber(0); pop(T('🦹 גנב חדש נמלט!', '🦹 Another robber is fleeing!'), 'sm'); } }, 1500); } }
  me.hp = Math.max(me.maxHp * .15, me.hp); }
function updCam(dt) { const me = G.me; if (!me) return; const sp = Math.abs(me.vf); if (G.state === 'title' && window.__cam) { const q = window.__cam; camera.position.set(...q.p); camera.lookAt(...q.l); camera.fov = q.f || 50; camera.updateProjectionMatrix(); return; }
  if (G.state === 'title') { const t = gt * .12; const tg = G.robs[0] || me; camLook.lerp(V3(tg.x, 1.5, tg.z), 1 - Math.exp(-3 * dt)); camPos.lerp(V3(tg.x - Math.sin(tg.a + Math.sin(t) * .9) * 16, 7.5 + Math.sin(t * .7) * 2, tg.z - Math.cos(tg.a + Math.sin(t) * .9) * 16), 1 - Math.exp(-2.5 * dt)); camera.position.copy(camPos); camera.lookAt(camLook); camera.fov = 58; camera.updateProjectionMatrix(); return; }
  if (G.state === 'end' && G.endOrbit) { const t = gt * .35; camPos.lerp(V3(me.x + Math.sin(t) * 14, 6, me.z + Math.cos(t) * 14), 1 - Math.exp(-2 * dt)); camLook.lerp(V3(me.x, 1, me.z), 1 - Math.exp(-4 * dt)); camClip(me); }
  else { const vh = sp > 3 ? Math.atan2(me.vx, me.vz) : me.a; const blend = me.vf < -1 ? me.a : vh; camYaw += wrapPi(lerp(me.a, me.a + wrapPi(blend - me.a), .35) - camYaw) * (1 - Math.exp(-4.5 * dt)); const dist = 9.5 + sp * .07, hgt = 3.6 + sp * .025;
    const want = V3(me.x - Math.sin(camYaw) * dist, hgt, me.z - Math.cos(camYaw) * dist); camPos.lerp(want, 1 - Math.exp(-7 * dt)); camLook.lerp(V3(me.x + Math.sin(me.a) * 6, 1.1, me.z + Math.cos(me.a) * 6), 1 - Math.exp(-9 * dt)); }
  camClip(me);
  camera.position.copy(camPos); if (shake > 0) { camera.position.x += rnd(-1, 1) * shake * .5; camera.position.y += rnd(-1, 1) * shake * .35; shake = Math.max(0, shake - dt * 2.2); } camera.lookAt(camLook);
  const fov = 62 + Math.min(16, sp * .32) + (me.ctl.nit && me.nitro > 0 ? 9 : 0); camera.fov = lerp(camera.fov, fov, 1 - Math.exp(-4 * dt)); camera.updateProjectionMatrix();
  // lights follow
  moonL.position.set(me.x - 40, 110, me.z - 55); moonL.target.position.set(me.x, 0, me.z); headL.position.set(me.x + Math.sin(me.a) * 1.8, 1.0, me.z + Math.cos(me.a) * 1.8); headL.target.position.set(me.x + Math.sin(me.a) * 20, 0, me.z + Math.cos(me.a) * 20);
  E.sky.position.copy(camera.position); E.stars.position.copy(camera.position);
  // objective arrow
  let tg = null, bd = 1e9; for (const p of G.side === 'rob' ? G.bags : G.robs.filter(r => !r.caught)) { const d = Math.hypot(p.x - me.x, p.z - me.z); if (d < bd) { bd = d; tg = p; } } arrow.visible = !!tg && G.state === 'play' && bd > 14;
  G.route = null; if (tg) { const [wx, wz, wn] = routeTo(me, tg.x, tg.z); G.route = { wx, wz, wn, tx: tg.x, tz: tg.z }; arrow.position.set(me.x, 2.7 + Math.sin(gt * 4) * .12, me.z); arrow.lookAt(wx, 2.7, wz); if (Math.hypot(camPos.x - me.x, camPos.z - me.z) < 6) arrow.visible = false; } }
function routeTo(me, tx, tz) { if (Math.hypot(tx - me.x, tz - me.z) < 50 && los(me.x, me.z, tx, tz)) return [tx, tz, null];
  const [ti, tj] = nearNode(tx, tz), gi = (me.x + O) / P, gj = (me.z + O) / P, ri = clamp(Math.round(gi), 0, NB), rj = clamp(Math.round(gj), 0, NB); const ok = ([i, j]) => i >= 0 && j >= 0 && i <= NB && j <= NB; const man = ([i, j]) => Math.abs(i - ti) + Math.abs(j - tj);
  let best = null, bs = 1e9; const near = Math.hypot(me.x - (ri * P - O), me.z - (rj * P - O)) < 11;
  const cands = near ? DIRS.map(([dx, dz]) => [ri + dx, rj + dz]).filter(ok) : (Math.abs(me.z - (rj * P - O)) < Math.abs(me.x - (ri * P - O)) ? [[Math.floor(gi), rj], [Math.ceil(gi), rj]] : [[ri, Math.floor(gj)], [ri, Math.ceil(gj)]]).filter(ok);
  if (near && man([ri, rj]) === 0) return [tx, tz, [ri, rj]];
  for (const c of cands) { const [x, z] = nodeP(...c); const sc = man(c) + Math.hypot(x - me.x, z - me.z) / P * .9; if (sc < bs) { bs = sc; best = c; } } if (!best) return [tx, tz, null]; const [x, z] = nodeP(...best); return [x, z, best]; }
function camClip(me) { const fx = camPos.x, fz = camPos.z, L = Math.hypot(fx - me.x, fz - me.z); if (L < 2) return; let ok = L; for (let s = 1.2; s <= L + .6; s += .6) { const t = Math.min(1, s / L); if (solidAt(lerp(me.x, fx, t), lerp(me.z, fz, t))) { ok = Math.max(2.2, s - 1.4); break; } }
  if (ok < L) { camPos.x = me.x + (fx - me.x) * ok / L; camPos.z = me.z + (fz - me.z) * ok / L; camPos.y = Math.max(camPos.y, 3.6 + (L - ok) * .45); } }
function slow(t) { G.slowT = t; } function flash(v) { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = v; requestAnimationFrame(() => { f.style.transition = 'opacity .6s'; f.style.opacity = 0; }); }

/* ================= FLOW ================= */
function setStars(n) { [...$('eStars').children].forEach((e, k) => { e.classList.toggle('on', k < n); e.style.animationDelay = k * .25 + 's'; }); }
function begin() { const side = S.side, lvl = S.lvl[side] || 0; startRound(side, lvl); $('title').hidden = true; ['hud', 'mini', 'spd', 'cL', 'cR', 'bNit'].forEach(id => $(id).hidden = false); $('endSheet').hidden = $('pauseSheet').hidden = true;
  G.state = 'count'; let n = 3; camPos.set(G.me.x, 14, G.me.z - 26); camYaw = G.me.a; A.loopTone('eng', 'sawtooth', 55, .035); A.loopTone('eng2', 'square', 28, .018); A.loopOn('skid', 'bandpass', 2400, 7, 0); A.loopTone('sir', 'triangle', 720, 0);
  A.startMusic({ chords: [[45, 52, 57], [41, 48, 53], [43, 50, 55], [40, 47, 52]], bpm: 150, lead: false, kick: true, vol: .5 });
  pop(G.side === 'rob' ? T(`אספו ${G.need} שקי כסף לפני שהזמן נגמר!`, `Grab ${G.need} money bags before time runs out!`) : T(`עצרו ${G.need === 1 ? 'את הגנב' : G.need + ' גנבים'}! נגחו בהם עד שייעצרו`, (G.need > 1 ? `Bust ${G.need} robbers! Ram them until they stop` : 'Bust the robber! Ram them until they stop')), 'sm');
  const tick = () => { if (G.state !== 'count') return; if (n > 0) { $('cd').innerHTML = `<b>${n}</b>`; A.tone(440, .15, 'square', .06); n--; setTimeout(tick, 800); } else { $('cd').innerHTML = `<b>GO!</b>`; A.tone(880, .4, 'square', .07); G.state = 'play'; setTimeout(() => $('cd').innerHTML = '', 800);
    if (!S.tut) { S.tut = 1; S.save(); setTimeout(() => toast(isTouch ? T('⏩ גז · ◀ ▶ היגוי · ⏪ בלם/רוורס · ⚡ ניטרו', '⏩ gas · ◀ ▶ steer · ⏪ brake/reverse · ⚡ nitro') : T('חיצים/WASD · רווח = ניטרו · Shift = החלקה' + (G.side === 'cop' ? ' · E = קוצים' : ''), 'Arrows/WASD · Space = nitro · Shift = drift' + (G.side === 'cop' ? ' · E = spikes' : '')), 4500), 600); } } }; setTimeout(tick, 600); }
function win() { if (G.state !== 'play') return; G.state = 'end'; G.endOrbit = 1; slow(1.6); flash(.8); const tl = G.timeL / G.cfg.time, hp = G.me.hp / G.me.maxHp; const stars = tl > .33 && hp > .4 ? 3 : tl > .15 ? 2 : 1; const k = G.side + G.lvl; if ((S.stars[k] || 0) < stars) S.stars[k] = stars; if (G.lvl < 5 && (S.lvl[G.side] || 0) <= G.lvl) S.lvl[G.side] = G.lvl + 1; S.save();
  pop(G.side === 'rob' ? T('💰 בריחה מושלמת!', '💰 CLEAN GETAWAY!') : T('🚔 העיר בטוחה!', '🚔 CITY SAFE!'), 'gold'); [0, 4, 7, 12, 16].forEach((k2, i) => A.tone(523 * Math.pow(2, k2 / 12), .3, 'triangle', .08, i * .1)); A.voice('yay', 1.2);
  setTimeout(() => endSheet(true, stars), 2200); }
function lose(msg, busted) { if (G.state !== 'play') return; G.state = 'end'; G.endOrbit = 1; slow(1.6); flash(.5); pop(msg, busted ? '' : 'sm'); A.tone(300, .5, 'sawtooth', .08, 0, 120); A.voice('aww', .9); if (busted) { for (const c of G.cops) { c.ctl.gas = 0; } } setTimeout(() => endSheet(false, 0), 2200); }
function endSheet(ok, stars) { if (G.state !== 'end') return; A.loopOff('sir'); A.loopOff('skid'); $('eT').textContent = ok ? (G.side === 'rob' ? T('בריחה מושלמת! 💰', 'Clean getaway! 💰') : T('כל הגנבים נעצרו! 🚔', 'All robbers busted! 🚔')) : (G.side === 'rob' ? T('נתפסתם… 🚔', 'Busted… 🚔') : T('הגנבים ברחו… ⏰', 'They got away… ⏰')); setStars(stars);
  $('eP').textContent = ok ? T(`שלב ${G.lvl + 1} הושלם!`, `Level ${G.lvl + 1} complete!`) : T('נסו שוב – אתם יכולים!', 'Try again – you’ve got this!');
  const rows = G.side === 'rob' ? [[T('כסף שנאסף', 'Money grabbed'), `${G.got}/${G.need}`], [T('זמן שנשאר', 'Time left'), fmt(Math.max(0, G.timeL))], [T('התחמקויות', 'Escapes'), G.lostCount], [T('מצב הרכב', 'Car condition'), Math.round(G.me.hp / G.me.maxHp * 100) + '%']] : [[T('גנבים שנעצרו', 'Robbers busted'), `${G.caught}/${G.need}`], [T('זמן שנשאר', 'Time left'), fmt(Math.max(0, G.timeL))]];
  $('eRes').innerHTML = rows.map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join(''); $('eNext').hidden = !ok || G.lvl >= 5; $('endSheet').hidden = false; }
$('eAgain').onclick = () => { $('endSheet').hidden = true; begin(); }; $('eNext').onclick = () => { S.lvl[G.side] = Math.min(5, G.lvl + 1); S.save(); $('endSheet').hidden = true; begin(); }; $('eMap').onclick = () => showTitle();
function pause() { if (G.state !== 'play' && G.state !== 'count') return; G.prev = G.state; G.state = 'pause'; $('pauseSheet').hidden = false; A.allOff(); }
$('pauseBtn').onclick = pause; $('pGo').onclick = () => { $('pauseSheet').hidden = true; G.state = G.prev === 'count' ? 'play' : G.prev; A.loopTone('eng', 'sawtooth', 55, .035); A.loopTone('eng2', 'square', 28, .018); A.loopOn('skid', 'bandpass', 2400, 7, 0); A.loopTone('sir', 'triangle', 720, 0); };
$('pRestart').onclick = () => { $('pauseSheet').hidden = true; begin(); }; $('pMap').onclick = () => { $('pauseSheet').hidden = true; showTitle(); };
function renderTitle() { const side = S.side; $('sides').innerHTML = [['rob', '🦹', T('גנבים', 'Robbers'), T('אוספים כסף ובורחים', 'Grab cash & escape')], ['cop', '🚓', T('שוטרים', 'Cops'), T('רודפים ועוצרים', 'Chase & bust')]].map(([k, ic, n, d]) => `<button class="${k}${side === k ? ' on' : ''}" data-s="${k}"><i>${ic}</i>${n}<small>${d}</small></button>`).join('');
  $('brief').textContent = side === 'rob' ? T('אספו את כל שקי הכסף לפני שהזמן נגמר. החץ הצהוב והקו במפה מראים את הדרך. 🚔 נתפסים אם ניידת צמודה אליכם כשאתם כמעט עומדים – אז אל תעצרו!', 'Grab every money bag before time runs out. The yellow arrow and the map line show the way. 🚔 You get busted if a cop car is on you while you are almost stopped – so keep moving!') : T('רדפו אחרי הגנבים ונגחו בהם עד שייעצרו. יש לכם מסוק עם זרקור וקוצים להניח לפניהם!', 'Chase the robbers and ram them until they stop. You have a searchlight chopper and spike strips!');
  const un = S.lvl[side] || 0; $('lvls').innerHTML = LV[side].map((l, i) => { const st = S.stars[side + i] || 0, lock = i > Math.max(un, ...Object.keys(S.stars).filter(k => k.startsWith(side) && S.stars[k]).map(k => +k.slice(3) + 1)); return `<button class="${i === un ? 'on' : ''}${lock ? ' lock' : ''}" data-l="${i}">${lock ? '🔒' : i + 1}<small>${'★'.repeat(st)}${'☆'.repeat(3 - st)}</small></button>`; }).join('');
  const cs = CARS[side][S.car[side] || 0]; $('vName').textContent = cs.n; $('vDesc').textContent = cs.d; const bars = [[T('מהירות', 'Speed'), (cs.max - 30) / 9], [T('תאוצה', 'Accel'), (cs.acc - 11) / 6.5], [T('אחיזה', 'Grip'), (cs.grip - 4) / 4.5], [T('חוזק', 'Toughness'), cs.hp / 220]]; $('vBars').innerHTML = bars.map(([n, v]) => `<span>${n}</span><i><b style="width:${Math.round(clamp(v, .08, 1) * 100)}%"></b></i>`).join('');
  $('goBtn').textContent = side === 'rob' ? T('💰 יאללה לשוד!', '💰 Start the heist!') : T('🚨 יוצאים למרדף!', '🚨 Start the chase!'); }
$('sides').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; A.ac(); S.side = b.dataset.s; S.save(); A.tone(S.side === 'cop' ? 900 : 500, .1, 'square', .05); renderTitle(); attract(); };
$('lvls').onclick = e => { const b = e.target.closest('[data-l]'); if (!b || b.classList.contains('lock')) return; S.lvl[S.side] = +b.dataset.l; S.save(); A.tone(700, .08, 'triangle', .05); renderTitle(); };
$('vPrev').onclick = () => { const n = CARS[S.side].length; S.car[S.side] = ((S.car[S.side] || 0) + n - 1) % n; S.save(); renderTitle(); attract(); }; $('vNext').onclick = () => { const n = CARS[S.side].length; S.car[S.side] = ((S.car[S.side] || 0) + 1) % n; S.save(); renderTitle(); attract(); };
$('goBtn').onclick = () => { A.ac(); begin(); };
function attract() { clearRound(); G.side = 'cop'; G.cfg = LV.cop[1]; G.heat = 2; const side = S.side, cs = CARS[side][S.car[side] || 0]; const [sx, sz] = nodeP(4, 4);
  const hero = makeCar(cs.k, cs.c, 'me', cs); G.me = hero; place(hero, sx - LANE, sz + 10, 0); hero.hp = 999; for (let i = 0; i < (LOW ? 10 : 18); i++) spawnCiv([sx, sz]);
  if (side === 'rob') { const r = G.me; r.role = 'rob'; G.robs = [r]; r.st.max = 26; assignPath(r); for (let i = 0; i < 2; i++) { const c = spawnCop([r.x, r.z], [16, 40]); c.st.max = 25; } }
  else { const r = makeCar('muscle', '#ff3a2a', 'rob', { max: 26, acc: 13, grip: 7, turn: 2.3, mass: 1.1, hp: 999 }); place(r, sx - LANE, sz + 26, 0); assignPath(r); G.robs = [r]; G.cops = [hero]; hero.mode = 'chase'; hero.stuck = 0; }
  heliShow(true); heli.x = sx; heli.z = sz; }
function showTitle() { G.state = 'title'; A.allOff(); A.stopMusic(); $('title').hidden = false; ['hud', 'mini', 'spd', 'cL', 'cR', 'bNit', 'bSpk', 'endSheet', 'pauseSheet', 'bustW'].forEach(id => $(id).hidden = true); $('cd').innerHTML = ''; $('msg').innerHTML = ''; G.endOrbit = 0; renderTitle(); attract(); }
function titleSim(dt) { // attract mode: hero is AI too
  const me = G.me; const r = G.robs[0]; if (S.side === 'rob') { aiRob(me, dt, G.cops[0] || me); for (const c of G.cops) aiCop(c, dt, me); } else { aiRob(r, dt, me); aiCop(me, dt, r); }
  me.ctl.nit = 0; }
$('pauseBtn').innerHTML = ICO.pause('#ffffff'); $('homeT').innerHTML = ICO.home('#ffffff'); soundButton('sndBtn2', S, A, '#14162a'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('pT').textContent = T('הפסקה', 'Paused'); $('pMap').textContent = T('תפריט', 'Menu'); $('pRestart').textContent = T('מהתחלה', 'Restart'); $('pGo').textContent = T('ממשיכים ▶', 'Resume ▶'); $('eMap').textContent = T('תפריט', 'Menu'); $('eAgain').textContent = T('שוב', 'Again'); $('eNext').textContent = T('השלב הבא ◀', 'Next level ▶');
let last = performance.now();
function loop(now) { requestAnimationFrame(loop); let dt = Math.min(.05, (now - last) / 1000) * (window.__fast || 1); last = now; A.tick(); if (G.state === 'pause') { E.render(); return; }
  if (G.slowT > 0) { G.slowT -= dt; dt *= .3; } const n = Math.ceil(dt / (1 / 60)); const h = dt / n;
  for (let i = 0; i < n; i++) { if (G.state === 'title') { titleSim(h); simTitle(h); } else sim(h); }
  if (G.state !== 'title') { hud(dt); drawMini(); } E.render(); }
function simTitle(dt) { gt += dt; const me = G.me; for (const c of G.civs) aiCiv(c, dt); for (const c of cars) drive(c, dt); hitCars(); for (const c of cars) hitWalls(c, dt); for (const c of cars) { c.g.position.set(c.x, 0, c.z); c.g.rotation.y = c.a; } for (const c of G.civs) if (Math.hypot(c.x - me.x, c.z - me.z) > 150) respawnCiv(c, [me.x, me.z]);
  const tg = G.robs[0] || me; heli.x = lerp(heli.x, tg.x, dt * .8); heli.z = lerp(heli.z, tg.z, dt * .8); const hy = 28; heli.g.position.set(heli.x - 6, hy, heli.z - 8); heli.rot.rotation.y = gt * 28; heli.rot2.rotation.y = gt * 28 + Math.PI / 2; heli.spot.position.set(tg.x, .02, tg.z); const top = heli.g.position.clone(); top.y -= 1.2; heli.cone.position.copy(top); heli.cone.scale.set(1, top.y, 1); heli.cone.lookAt(tg.x, 0, tg.z); heli.cone.rotateX(-Math.PI / 2); heli.L.position.copy(top); heli.L.target.position.set(tg.x, 0, tg.z);
  const ph = Math.floor(gt * 7) % 4; barR.color.setRGB(ph < 2 ? 3 : .25, 0, 0); barB.color.setRGB(0, .12, ph >= 2 ? 3 : .3); for (const c of cars) if (c.g.userData.pool) c.g.userData.pool.material.color.set(ph < 2 ? '#ff2020' : '#2050ff');
  const cl = cars.filter(c => c.pol); copL.forEach((l, i) => { const c = cl[i]; if (c) { l.position.set(c.x, 2.4, c.z); l.color.set(ph < 2 ? '#ff2020' : '#2050ff'); l.intensity = 14; } else l.intensity = 0; });
  moonL.position.set(me.x - 40, 110, me.z - 55); moonL.target.position.set(me.x, 0, me.z); headL.position.set(me.x, 1, me.z); headL.target.position.set(me.x + Math.sin(me.a) * 20, 0, me.z + Math.cos(me.a) * 20); FX.update(dt); FXA.update(dt); updCam(dt); E.sky.position.copy(camera.position); E.stars.position.copy(camera.position); $('edge').style.opacity = 0; }
setTimeout(() => { E.resize(); showTitle(); $('loading').hidden = true; requestAnimationFrame(loop); window.__chOK = true; }, 30);
window.__ch = { G, inp, cars, begin, S, showTitle, sim: (s) => { for (let i = 0; i < s * 60; i++) sim(1 / 60); } };
