import { THREE, $, V3, C, clamp, lerp, rnd, T, EN, store, engine, studioEnv, std, shadowAll, cnv, ctex, particles, CONFETTI, audio, toast, ICO, hubButtons, soundButton, qualityButton, starsHTML, cutie, isTouch } from '../lib/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const S = store('brawl-save', { stars: {}, hero: 0, best: 0, tut: 0, coins: 0, up: { pw: 0, hp: 0, sp: 0, spd: 0 }, fit: [0, 0], ofo: ['0-0', '1-0'], surv: 0 });
const E = engine(S, { fov: 34, bloom: [.35, .5, 1.05], exposure: 1.05, bg: '#ff9a6a', vignette: .3 });
const { scene, camera, renderer } = E; studioEnv(E, '#fff0e0', '#5a4a6a', .45);
const A = audio(S); const FX = particles(E, 1400);
const ZMIN = -1.9, ZMAX = 3.0, GRAV = 22;

/* ================= DATA (all original) ================= */
const HEROES = [
  { id: 'rio', n: 'Rio', d: T('מהיר וזריז – קומבו של 4 מכות', 'Fast and nimble – 4-hit combo'), spd: 4.1, hp: 22, dmg: 1, combo: 4, jump: 8, look: { skin: '#f2c3a0', shirt: '#e8302a', hair: '#2a1a10', pants: '#2a3a6a', shoe: '#ffffff', cap: '#1a1a22', gloves: '#f4f4f4', stripe: '#ffffff' }, stat: [T('מהירות', 'Speed') + ' ★★★', T('כוח', 'Power') + ' ★★'] },
  { id: 'tex', n: 'Tex', d: T('חזק ועמיד – מכות כבדות', 'Strong and tough – heavy hits'), spd: 3.3, hp: 30, dmg: 1.5, combo: 3, jump: 7.4, look: { skin: '#c98e6a', shirt: '#2a7aff', hair: '#111111', pants: '#3a3030', shoe: '#ffd23a', beard: null, glasses: null, gloves: '#ffd23a', vest: '#1a1a22' }, stat: [T('מהירות', 'Speed') + ' ★★', T('כוח', 'Power') + ' ★★★'] },
];
const FOES = {
  punk: { hp: 6, spd: 2.4, dmg: 1.5, cd: 1.1, reach: .95, sc: 1, cols: ['#8a3aff', '#2fd36a', '#ff8a1f'], hair: '#ff3ab0', chain: .45 },
  runner: { hp: 4, spd: 3.9, dmg: 1.3, cd: .9, reach: .9, sc: .92, cols: ['#ffd23a', '#3ae8ff'], hair: '#3a2a1a', leap: 1 },
  tosser: { hp: 5, spd: 2.5, dmg: 1.6, cd: 2.1, reach: .9, sc: .96, cols: ['#ff5a8a', '#5affc8'], hair: '#5a3aff', ranged: 1 },
  brute: { hp: 13, spd: 1.6, dmg: 3, cd: 1.6, reach: 1.15, sc: 1.18, cols: ['#5a5a6a', '#6a3a2a'], hair: '#111', knock: 1 },
  boss: { hp: 36, spd: 2.2, dmg: 3, cd: 1.2, reach: 1.3, sc: 1.36, cols: ['#a03a3a'], hair: '#eeeeee', knock: 1, boss: 1, chain: .5 },
};
const STAGES = [
  { id: 'street', n: T('רחוב השוק', 'Market Street'), sky: ['#ffb07a', '#6a2a7a'], len: 70, boss: 'Big Moe', waves: [[8, 'punk punk'], [20, 'punk runner;punk tosser'], [33, 'brute punk;runner runner'], [46, 'tosser punk punk;brute runner'], [62, 'boss punk;runner tosser']] },
  { id: 'subway', n: T('תחנת הרכבת', 'Subway Station'), sky: ['#2a3a4a', '#10161e'], len: 76, boss: 'Rail King', waves: [[8, 'punk runner tosser'], [20, 'brute punk;punk runner runner'], [34, 'runner runner tosser;brute punk'], [48, 'brute brute;tosser tosser punk'], [68, 'boss runner;punk tosser brute']] },
  { id: 'beach', n: T('טיילת החוף', 'Beach Boardwalk'), sky: ['#7ad0ff', '#ffe0b0'], len: 78, boss: 'Sandy Sam', waves: [[8, 'runner runner punk'], [21, 'tosser punk;brute runner runner'], [35, 'punk punk tosser;runner brute'], [50, 'brute tosser runner;punk punk runner'], [70, 'boss runner;tosser punk brute']] },
  { id: 'roof', n: T('הגגות', 'Rooftops'), sky: ['#1a1450', '#05030f'], len: 80, boss: 'Sky Duke', waves: [[8, 'punk punk runner tosser'], [22, 'brute runner;tosser punk punk'], [36, 'runner runner runner;brute tosser'], [52, 'brute brute runner;punk punk tosser'], [72, 'boss brute;runner tosser punk']] },
  { id: 'dock', n: T('הנמל', 'Harbor Docks'), sky: ['#ff8a5a', '#3a1a4a'], len: 82, boss: 'Captain Crane', waves: [[8, 'punk brute runner'], [22, 'tosser tosser runner;brute punk punk'], [37, 'runner runner brute;tosser punk'], [53, 'brute brute tosser;runner runner punk'], [74, 'boss tosser;brute runner punk']] },
  { id: 'ware', n: T('המחסן של הכנופיה', 'Gang Warehouse'), sky: ['#2a1a12', '#0a0606'], len: 84, boss: 'The Chief', waves: [[8, 'punk brute runner tosser'], [22, 'runner runner punk;brute tosser tosser'], [38, 'brute brute punk;runner runner'], [54, 'punk punk runner runner;brute brute tosser'], [76, 'boss brute;runner runner tosser;punk punk']] },
];
const STAGE_ICO = ['🏙️', '🚇', '🏖️', '🌃', '⚓', '🏭'];
const world = new THREE.Group(); scene.add(world);
const hemi = new THREE.HemisphereLight('#ffffff', '#4a3a5a', .75); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0dc', 2.2); sun.position.set(4, 12, 9); sun.castShadow = renderer.shadowMap.enabled; sun.shadow.mapSize.set(2048, 1024); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 8, bottom: -8, near: 1, far: 40 }); sun.shadow.bias = -.0006; scene.add(sun, sun.target);
const rim = new THREE.DirectionalLight('#9ac8ff', .7); rim.position.set(-6, 5, -8); scene.add(rim);
const SIGNS = ['PIZZA', 'ARCADE', 'DINER', 'GYM', 'CAFE', 'TOYS', 'BOOKS', 'HOTEL', 'RADIO', 'DONUTS', 'VIDEO', 'TACOS'];
const ADS = ['scoot', 'puck', 'bowl', 'drift', 'ski', 'robo', 'chase', 'helix', 'goal', 'rise', 'jeti', 'pet', 'mud', 'sky'];
let adI = 0; const texL = new THREE.TextureLoader(), adMats = {};
function adMat(id) { if (adMats[id]) return adMats[id]; const m = new THREE.MeshBasicMaterial({ color: '#dddddd' }); adMats[id] = m; texL.load('art/p/' + id + '.jpg', t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; m.map = t; m.color.set('#ffffff'); m.needsUpdate = true; }); return m; }
function canvasTex(w, h, f, rx = 1, ry = 1) { const c = cnv(w, h); f(c.getContext('2d'), w, h); return ctex(c, rx, ry); }
function windowsTex(col, lit = .35) { return canvasTex(128, 256, (x, w, h) => { x.fillStyle = col; x.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * .06})`; x.fillRect(Math.random() * w, Math.random() * h, 3, 2); }
  x.fillStyle = 'rgba(0,0,0,.08)'; for (let j = 0; j < h; j += 6) x.fillRect(0, j, w, 1);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { const X = 9 + i * 30, Y = 10 + j * 30, on = Math.random() < lit; x.fillStyle = '#f2ece0'; x.fillRect(X - 2, Y - 2, 22, 25); x.fillStyle = on ? '#ffe2a0' : '#2c3a52'; x.fillRect(X, Y, 18, 21); if (!on) { const gr = x.createLinearGradient(X, Y, X + 18, Y + 21); gr.addColorStop(0, 'rgba(160,200,255,.45)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(X, Y, 18, 21); }
    if (Math.random() < .4) { x.fillStyle = ['#e85a5a', '#5a8ae8', '#e8c85a', '#8ae85a'][Math.floor(Math.random() * 4)]; x.globalAlpha = .7; x.fillRect(X, Y, 6, 21); x.fillRect(X + 12, Y, 6, 21); x.globalAlpha = 1; }
    x.fillStyle = '#f2ece0'; x.fillRect(X + 8, Y, 2, 21); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(X - 4, Y + 23, 26, 4); x.fillStyle = '#d8d0c0'; x.fillRect(X - 4, Y + 22, 26, 2); } }); }
function signTex(t, a, b) { return canvasTex(256, 64, (x, w, h) => { x.fillStyle = a; x.fillRect(0, 0, w, h); x.font = '900 44px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = b; x.shadowBlur = 14; x.fillStyle = b; x.fillText(t, w / 2, h / 2 + 2); }); }
let stageObj = null;
/* ---------- props library (all built from simple shapes) ---------- */
const PM = {}; const pm = (k, c, o) => PM[k] || (PM[k] = std(c, o));
function box(w, h, d, m, x, y, z, g) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; (g || world).add(o); return o; }
function cyl(rt, rb, h, m, x, y, z, g, seg = 14) { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; (g || world).add(o); return o; }
function hydrant(x, z) { const g = new THREE.Group(); const m = pm('hyd', '#e8302a', { roughness: .45 }); cyl(.13, .15, .55, m, 0, .28, 0, g); cyl(.15, .13, .08, m, 0, .6, 0, g); const c = cyl(.06, .06, .34, m, 0, .38, 0, g); c.rotation.z = Math.PI / 2; g.position.set(x, 0, z); world.add(g); }
function bin(x, z) { const g = new THREE.Group(); const m = pm('bin', '#3a7a4a', { roughness: .6, metalness: .2 }); cyl(.3, .26, .8, m, 0, .4, 0, g, 16); cyl(.33, .33, .06, pm('binl', '#2a5a34'), 0, .83, 0, g, 16); g.position.set(x, 0, z); world.add(g); }
function bench(x, z) { const g = new THREE.Group(); const w = pm('wood', '#a8743a', { roughness: .75 }), m = pm('iron', '#2a2a30', { metalness: .6, roughness: .4 }); for (let i = 0; i < 3; i++) box(1.5, .05, .12, w, 0, .45, -.12 + i * .13, g); for (let i = 0; i < 2; i++) box(1.5, .1, .04, w, 0, .7 + i * .14, -.2, g); for (const s of [-.65, .65]) box(.06, .45, .4, m, s, .22, 0, g); g.position.set(x, 0, z); world.add(g); }
function planter(x, z, palm) { const g = new THREE.Group(); box(.8, .45, .8, pm('pl', '#8a8680', { roughness: .9 }), 0, .22, 0, g); const tr = cyl(.07, .1, palm ? 3.2 : 1.6, pm('trunk', '#6a4a2a', { roughness: .9 }), 0, palm ? 1.9 : 1.2, 0, g, 8);
  if (palm) { for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.ConeGeometry(.18, 1.6, 4), pm('palm', '#3a9a3a', { roughness: .8, flatShading: true })); l.position.set(0, 3.5, 0); l.rotation.set(1.25, i / 7 * Math.PI * 2, 0); l.translateY(.75); l.castShadow = true; g.add(l); } }
  else for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(.55 + Math.random() * .2, 1), pm('leaf', '#4a9a3a', { roughness: .9, flatShading: true })); f.position.set(rnd(-.25, .25), 2.1 + i * .3, rnd(-.25, .25)); f.castShadow = true; g.add(f); }
  g.position.set(x, 0, z); world.add(g); }
function parkedCar(x, z, col) { const g = new THREE.Group(); const b = pm('car' + col, col, { roughness: .3, metalness: .4 }), gl = pm('glass', '#2a3a5a', { roughness: .1, metalness: .6 }), t = pm('tire', '#1a1a1a', { roughness: .9 });
  box(3.6, .55, 1.6, b, 0, .55, 0, g); box(2, .5, 1.45, b, -.1, 1.05, 0, g); box(1.85, .38, 1.5, gl, -.1, 1.05, 0, g); for (const sx of [-1.15, 1.15]) for (const sz of [-.72, .72]) { const w = cyl(.3, .3, .2, t, sx, .3, sz, g, 14); w.rotation.x = Math.PI / 2; }
  box(.08, .14, .3, pm('hl', '#fff6c8', { emissive: C('#fff0a0'), emissiveIntensity: .6 }), 1.8, .65, .5, g); box(.08, .14, .3, PM.hl, 1.8, .65, -.5, g); g.position.set(x, 0, z); world.add(g); return g; }
function fireEscape(x, h, z) { const m = pm('fe', '#2a2a30', { metalness: .6, roughness: .5 }); for (let y = 3.4; y < h - 1; y += 2.2) { box(1.8, .06, .6, m, x, y, z + .3); box(1.8, .5, .03, m, x, y + .28, z + .6); } }
function poster(x, y, z, w = 1.6, ry = 0) { const g = new THREE.Group(); box(w + .12, w / 1.6 + .12, .06, pm('frame', '#1a1a22'), 0, 0, 0, g); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 1.6), adMat(ADS[adI++ % ADS.length])); p.position.z = .035; g.add(p); g.position.set(x, y, z); g.rotation.y = ry; world.add(g); }
function pedestrian(x, z, look) { const P = cutie(look); P.g.scale.setScalar(.95); P.g.position.set(x, 0, z); world.add(P.g); stageObj.peds.push({ P, x, z, v: (Math.random() < .5 ? -1 : 1) * rnd(.8, 1.3), t: Math.random() * 6 }); }
function water(z0, depth, col) { const tex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = col; x.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { x.strokeStyle = `rgba(255,255,255,${rnd(.08, .3)})`; x.lineWidth = rnd(1, 3); const yy = rnd(0, h), xx = rnd(0, w); x.beginPath(); x.moveTo(xx, yy); x.quadraticCurveTo(xx + 12, yy - 4, xx + 26, yy); x.stroke(); } }, 30, 6);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(400, depth), new THREE.MeshStandardMaterial({ map: tex, roughness: .15, metalness: .3 })); m.rotation.x = -Math.PI / 2; m.position.set(60, -.25, z0 - depth / 2); world.add(m); stageObj.water = tex; return m; }
function buildStage(st) {
  world.clear(); const [sa, sb] = st.sky; scene.background = C(sb); stageObj = { movers: [], peds: [], water: null }; adI = STAGES.indexOf(st) * 3;
  const L = st.len + 30;
  const skyM = new THREE.ShaderMaterial({ depthWrite: false, uniforms: { a: { value: C(sa) }, b: { value: C(sb) } }, vertexShader: `varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`, fragmentShader: `uniform vec3 a; uniform vec3 b; varying vec2 vU; void main(){ gl_FragColor=vec4(mix(a,b,smoothstep(.15,.95,vU.y)),1.0); }` });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(L * 3, 90), skyM); sky.position.set(st.len / 2, 18, -60); world.add(sky);
  const indoor = st.id === 'subway' || st.id === 'ware';
  // ground (the fighting lane)
  const gTex = canvasTex(256, 256, (x, w, h) => { const base = { ware: '#5a4a3e', subway: '#8a8a92', roof: '#5a5a66', beach: '#b8875a', dock: '#6a6a72' }[st.id] || '#4a4a58'; x.fillStyle = base; x.fillRect(0, 0, w, h);
    if (st.id === 'beach') { for (let j = 0; j < h; j += 32) { x.fillStyle = `rgba(0,0,0,.18)`; x.fillRect(0, j, w, 3); for (let i = (j / 32 % 2) * 64; i < w; i += 128) x.fillRect(i, j, 3, 32); for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(90,50,20,${Math.random() * .15})`; x.fillRect(Math.random() * w, j + Math.random() * 30, rnd(10, 40), 1); } } }
    for (let i = 0; i < 1500; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * .1})`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    if (st.id === 'street') { x.fillStyle = '#f2e6a0'; x.fillRect(0, 150, 90, 10); x.strokeStyle = 'rgba(20,20,26,.5)'; x.lineWidth = 1.5; for (let i = 0; i < 6; i++) { let cx = Math.random() * w, cy = Math.random() * h; x.beginPath(); x.moveTo(cx, cy); for (let k = 0; k < 6; k++) { cx += rnd(-14, 14); cy += rnd(-10, 10); x.lineTo(cx, cy); } x.stroke(); } for (let i = 0; i < 3; i++) { x.fillStyle = 'rgba(30,30,36,.35)'; x.fillRect(Math.random() * w, Math.random() * h, rnd(30, 70), rnd(20, 40)); } x.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, rnd(6, 16), rnd(3, 8), 0, 0, 7); x.fill(); } } if (st.id === 'dock') { x.fillStyle = '#ffd21f'; x.fillRect(0, 200, w, 8); for (let i = 0; i < w; i += 64) { x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(i, 0, 2, h); } }
    if (st.id === 'subway') { x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 3; for (let i = 0; i <= 256; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); } } }, L / 4, 6);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(L, 24), std('#ffffff', { map: gTex, roughness: .9 })); ground.rotation.x = -Math.PI / 2; ground.position.set(st.len / 2, 0, 7.8); ground.receiveShadow = true; world.add(ground);
  const walkCol = indoor ? '#6a6a74' : st.id === 'beach' ? '#c89a62' : st.id === 'dock' ? '#8a8a90' : '#a89a8a';
  const walk = new THREE.Mesh(new THREE.BoxGeometry(L, .18, 1.6), std(walkCol, { roughness: .85 })); walk.position.set(st.len / 2, .09, -3.0); walk.receiveShadow = true; world.add(walk);
  if (st.id !== 'roof') { const nc = indoor ? '#5a5a62' : walkCol; const near = new THREE.Mesh(new THREE.BoxGeometry(L, .16, 4), std(nc, { roughness: .85 })); near.position.set(st.len / 2, .08, ZMAX + 2.35); near.receiveShadow = true; world.add(near); if (!indoor) { const curb = box(L, .2, .16, pm('curb', '#d8d2c8'), st.len / 2, .1, ZMAX + .38); curb.castShadow = false; } }
  const PAL = { street: ['#b84a3a', '#d88a4a', '#8a5a7a', '#4a7aa8', '#c8a05a', '#6a8a4a'], roof: ['#3a3a5a', '#4a3a4a', '#2a4a5a'] }[st.id];
  const CARS = ['#e8302a', '#2a6aff', '#ffd23a', '#f4f4f4', '#2a2a30', '#3aa86a'];
  if (st.id === 'street' || st.id === 'roof') {
    let x = -12; let si = 0;
    while (x < st.len + 18) { const w = rnd(3.6, 6), h = st.id === 'roof' ? rnd(.8, 2.2) : rnd(6, 11), col = PAL[Math.floor(Math.random() * PAL.length)];
      if (st.id === 'street') { const b = new THREE.Mesh(new THREE.BoxGeometry(w - .1, h, 2), [std(col), std(col), std(col), std(col), new THREE.MeshStandardMaterial({ color: '#ffffff', map: windowsTex(col, .3), emissiveMap: windowsTex('#000', .3), emissive: C('#ffd88a'), emissiveIntensity: .5, roughness: .8 }), std(col)]); b.position.set(x + w / 2, h / 2, -4.8); b.receiveShadow = true; world.add(b);
        box(w - .02, .25, 2.3, pm('corn' + col, C(col).multiplyScalar(.75).getStyle()), x + w / 2, h + .05, -4.75); box(w - .1, .3, .14, pm('base', '#3a3036'), x + w / 2, .15, -3.78);
        const aw = new THREE.Mesh(new THREE.BoxGeometry(w * .8, .12, .9), std(['#e8302a', '#2a8a4a', '#2a6aff', '#ffb21f'][si % 4])); aw.position.set(x + w / 2, 2.6, -3.5); aw.rotation.x = .25; world.add(aw);
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(w * .6, w * .15), new THREE.MeshBasicMaterial({ map: signTex(SIGNS[si % SIGNS.length], '#1a1020', ['#ff5ad0', '#5af0ff', '#ffd23a', '#7dff5a'][si % 4]), color: C('#ffffff').multiplyScalar(1.4) })); sg.position.set(x + w / 2, 3.4, -3.79); world.add(sg);
        const door = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.9), std('#3a2a20')); door.position.set(x + w * .3, .95, -3.79); world.add(door);
        const shop = new THREE.Mesh(new THREE.PlaneGeometry(w * .35, 1.3), new THREE.MeshStandardMaterial({ color: '#2a3a5a', emissive: C('#ffd88a'), emissiveIntensity: .35, roughness: .1, metalness: .4 })); shop.position.set(x + w * .68, 1.2, -3.785); world.add(shop);
        if (si % 3 === 1 && h > 7) fireEscape(x + w / 2, h, -3.8); if (si % 4 === 2) poster(x + w * .68, 4.6, -3.74, 1.5); if (si % 2 === 0) box(.6, .4, .4, pm('ac', '#c8ccd2', { metalness: .3 }), x + w * .2, 4.2 + (si % 3), -3.6);
        si++; }
      else { const b = new THREE.Mesh(new THREE.BoxGeometry(w - .2, h, 1.6), std(col, { roughness: .9 })); b.position.set(x + w / 2, h / 2, -4.3); world.add(b); if (Math.random() < .5) { const tank = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(.7, .7, 1.4, 14), std('#6a4a3a')); c.position.y = 2.1; tank.add(c); const r = new THREE.Mesh(new THREE.ConeGeometry(.8, .5, 14), std('#4a3a30')); r.position.y = 3; tank.add(r); for (const s of [-1, 1]) for (const q of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.4, .08), std('#2a2a2a')); l.position.set(s * .5, .7, q * .5); tank.add(l); } tank.position.set(x + w / 2, h, -4.3); world.add(tank); }
        else { cyl(.03, .03, 2.4, pm('ant', '#8a8a92', { metalness: .7 }), x + w / 2, h + 1.2, -4.3); const dish = new THREE.Mesh(new THREE.SphereGeometry(.4, 14, 8, 0, Math.PI * 2, 0, Math.PI * .4), pm('dish', '#e8e8ec', { side: THREE.DoubleSide })); dish.position.set(x + w * .25, h + .3, -4); dish.rotation.x = -1; world.add(dish); } }
      x += w; }
    if (st.id === 'street') { // second row of taller buildings for depth + sidewalk life
      for (let x2 = -16; x2 < st.len + 20; x2 += rnd(5, 8)) { const w = rnd(4, 7), h = rnd(12, 22), col = PAL[Math.floor(Math.random() * PAL.length)]; const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 3), new THREE.MeshStandardMaterial({ color: C(col).multiplyScalar(.7), map: windowsTex(C(col).multiplyScalar(.7).getStyle(), .3), roughness: .85 })); b.position.set(x2, h / 2, -10); world.add(b); }
      for (let x2 = 3; x2 < st.len + 8; x2 += rnd(3.5, 6)) { const r = Math.random(); if (r < .25) hydrant(x2, -2.6); else if (r < .5) bin(x2, -2.7); else if (r < .7) bench(x2, -3.3); else planter(x2, -2.9); }
      for (let x2 = 8; x2 < st.len; x2 += rnd(14, 20)) parkedCar(x2, -6.6, CARS[Math.floor(Math.random() * CARS.length)]); }
    if (st.id === 'roof') { for (let i = 0; i < 40; i++) { const w = rnd(3, 7), h = rnd(8, 30); const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 3), new THREE.MeshStandardMaterial({ color: '#0a0a1a', map: windowsTex('#14142a', .25), emissiveMap: windowsTex('#000', .25), emissive: C('#ffd88a'), emissiveIntensity: .6 })); b.position.set(-30 + i * 4.5, h / 2 - 6, -24 - Math.random() * 6); world.add(b); }
      const moon = new THREE.Mesh(new THREE.CircleGeometry(3, 32), new THREE.MeshBasicMaterial({ color: C('#fff6c8').multiplyScalar(1.4) })); moon.position.set(st.len * .6, 14, -38); world.add(moon);
      for (let x2 = 0; x2 < st.len + 10; x2 += 7) { const ac = new THREE.Mesh(new THREE.BoxGeometry(1.4, .9, .9), std('#a8aab0', { metalness: .4, roughness: .5 })); ac.position.set(x2 + rnd(0, 3), .45, -2.9); ac.castShadow = true; world.add(ac); }
      for (let x2 = 10; x2 < st.len; x2 += 22) { const g = new THREE.Group(); box(5.2, 2.6, .12, pm('bbf', '#1a1a22'), 0, 0, 0, g); const p = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.4), adMat(ADS[adI++ % ADS.length])); p.position.z = .07; g.add(p); for (const s of [-2, 2]) box(.12, 2.4, .12, PM.frame || pm('frame', '#1a1a22'), s, -2.4, 0, g); g.position.set(x2, 5.2, -5.6); world.add(g); }
      const rail = pm('rail', '#8a8a92', { metalness: .6, roughness: .4 }); box(L, .06, .06, rail, st.len / 2, 1, ZMAX + .5); for (let x2 = -10; x2 < st.len + 10; x2 += 2) box(.05, 1, .05, rail, x2, .5, ZMAX + .5); }
    for (let x2 = 2; x2 < st.len + 10; x2 += 9) { const lp = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 3.6, 8), std('#2a2a34', { metalness: .6 })); p.position.y = 1.8; lp.add(p); const h2 = new THREE.Mesh(new THREE.BoxGeometry(.6, .14, .3), new THREE.MeshBasicMaterial({ color: C('#fff2c8').multiplyScalar(2) })); h2.position.set(.25, 3.6, 0); lp.add(h2); lp.position.set(x2, 0, -2.4); world.add(lp); }
  }
  if (st.id === 'beach') {
    water(-6, 70, '#2a8ad8'); const sand = new THREE.Mesh(new THREE.PlaneGeometry(L, 3.2), std('#f0d8a0', { roughness: 1 })); sand.rotation.x = -Math.PI / 2; sand.position.set(st.len / 2, -.05, -5.2); world.add(sand);
    const rail = pm('brail', '#f4f0e8', { roughness: .6 }); box(L, .08, .08, rail, st.len / 2, 1, -3.7); for (let x2 = -10; x2 < st.len + 10; x2 += 1.6) box(.07, 1, .07, rail, x2, .5, -3.7);
    for (let x2 = 0; x2 < st.len + 10; x2 += rnd(6, 10)) planter(x2, -2.9, true);
    for (let x2 = 8; x2 < st.len; x2 += 18) { const g = new THREE.Group(); box(2.4, 1.6, 1.4, pm('kiosk', '#ff7aa8'), 0, .8, 0, g); box(2.8, .1, 1.8, pm('kroof', '#fff4e0'), 0, 1.9, 0, g); for (let i = 0; i < 5; i++) box(.5, .3, 1.8, pm('stripe' + i % 2, i % 2 ? '#ff4a6a' : '#ffffff'), -1.1 + i * .55, 2.05, 0, g); const s = new THREE.Mesh(new THREE.PlaneGeometry(1.8, .45), new THREE.MeshBasicMaterial({ map: signTex('ICE CREAM', '#fff4e0', '#ff4a8a') })); s.position.set(0, 1.35, .71); g.add(s); g.position.set(x2, 0, -3.1); world.add(g); }
    for (let x2 = 4; x2 < st.len + 10; x2 += rnd(5, 9)) { const g = new THREE.Group(); cyl(.03, .03, 2.2, pm('pole', '#eeeeee'), 0, 1.1, 0, g); const u = new THREE.Mesh(new THREE.ConeGeometry(1.1, .5, 12, 1, true), pm('umb' + (x2 | 0) % 3, ['#ff4a6a', '#3aa8ff', '#ffd23a'][(x2 | 0) % 3], { side: THREE.DoubleSide })); u.position.y = 2.2; g.add(u); g.position.set(x2, -.05, -5 - rnd(0, 1)); world.add(g); }
    const tower = new THREE.Group(); for (const s of [-.6, .6]) for (const q of [-.5, .5]) box(.1, 2.4, .1, pm('wood', '#a8743a'), s, 1.2, q, tower); box(1.6, .12, 1.3, PM.wood, 0, 2.4, 0, tower); box(1.6, 1, .06, pm('red', '#e8302a'), 0, 2.95, .62, tower); tower.position.set(st.len * .45, -.05, -5.4); world.add(tower);
    for (let i = 0; i < 3; i++) { const sb = new THREE.Group(); box(1.8, .35, .5, pm('hull', '#ffffff'), 0, .2, 0, sb); const sail = new THREE.Mesh(new THREE.ConeGeometry(.7, 2.2, 3), pm('sail', '#fffaf0')); sail.position.y = 1.4; sail.scale.z = .1; sb.add(sail); sb.position.set(rnd(0, st.len), -.1, -18 - i * 8); world.add(sb); stageObj.movers.push({ o: sb, v: rnd(.4, .9), min: -30, max: st.len + 30 }); }
  }
  if (st.id === 'dock') {
    water(-9, 80, '#1a5a8a');
    const CC = ['#c83a2a', '#2a6ab8', '#e89a1a', '#2a8a5a', '#8a3ab8', '#d8d8d8'];
    const ctex2 = c => canvasTex(128, 64, (x, w, h) => { x.fillStyle = c; x.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 8) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(i, 0, 3, h); } x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 4; x.strokeRect(2, 2, w - 4, h - 4); });
    for (let x2 = -10; x2 < st.len + 12; x2 += 6.2) { const stack = 1 + Math.floor(Math.random() * 3); for (let k = 0; k < stack; k++) { const c = CC[Math.floor(Math.random() * CC.length)]; const m = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 2.4), new THREE.MeshStandardMaterial({ map: ctex2(c), roughness: .7, metalness: .3 })); m.position.set(x2, 1.25 + k * 2.55, -5 - (k % 2) * .1); m.castShadow = m.receiveShadow = true; world.add(m); } }
    for (let x2 = 12; x2 < st.len; x2 += 30) { const cr = new THREE.Group(); const y = pm('crane', '#ffb21f', { metalness: .4, roughness: .5 }); for (const s of [-1.4, 1.4]) box(.4, 16, .4, y, s, 8, 0, cr); box(3.4, .5, .5, y, 0, 16, 0, cr); box(16, .6, .6, y, -4, 16.6, 0, cr); cyl(.02, .02, 8, pm('cable', '#222'), -9, 12.5, 0, cr, 6); cr.position.set(x2, 0, -12); world.add(cr); }
    for (let x2 = 2; x2 < st.len + 8; x2 += rnd(4, 7)) { const r = Math.random(); if (r < .45) { cyl(.18, .22, .5, pm('boll', '#2a2a30', { metalness: .6 }), x2, .25, -2.6); } else { const g = new THREE.Group(); for (let i = 0; i < (r < .75 ? 1 : 2); i++) cyl(.3, .3, .9, pm('barrel' + i, i ? '#2a6ab8' : '#c83a2a', { metalness: .4, roughness: .5 }), i * .65, .45, 0, g, 16); g.position.set(x2, 0, -2.9); world.add(g); } }
    const ship = new THREE.Group(); box(26, 3, 5, pm('ship', '#2a3a5a'), 0, 1, 0, ship); box(8, 3, 4, pm('bridge', '#f4f4f4'), 8, 4, 0, ship); for (let i = 0; i < 4; i++) box(4.5, 2, 4.4, pm('sc' + i, CC[i]), -8 + i * 4.8, 3.5, 0, ship); ship.position.set(0, -.5, -28); world.add(ship); stageObj.movers.push({ o: ship, v: .8, min: -60, max: st.len + 60 });
    for (let x2 = 2; x2 < st.len + 10; x2 += 11) { const lp = new THREE.Group(); cyl(.08, .1, 5, pm('lpost', '#3a3a40', { metalness: .6 }), 0, 2.5, 0, lp); const h2 = new THREE.Mesh(new THREE.BoxGeometry(.8, .2, .5), new THREE.MeshBasicMaterial({ color: C('#ffd8a0').multiplyScalar(2) })); h2.position.set(.3, 5, 0); lp.add(h2); lp.position.set(x2, 0, -2.2); world.add(lp); }
  }
  if (st.id === 'subway') {
    const tile = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#e8ece8'; x.fillRect(0, 0, w, h); x.strokeStyle = '#b8c0bc'; x.lineWidth = 3; for (let i = 0; i <= w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } for (let j = 0; j <= h; j += 16) { x.beginPath(); x.moveTo(0, j); x.lineTo(w, j); x.stroke(); } x.fillStyle = '#2a8a5a'; x.fillRect(0, 120, w, 20); }, L / 4, 2);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(L, 8), std('#ffffff', { map: tile, roughness: .4 })); wall.position.set(st.len / 2, 4, -6.5); world.add(wall);
    const tc = new THREE.Group(); for (let k = 0; k < 4; k++) { const car = new THREE.Mesh(new THREE.BoxGeometry(11, 2.6, 2.4), [std('#b8bcc4'), std('#b8bcc4'), std('#9aa0a8'), std('#9aa0a8'), new THREE.MeshStandardMaterial({ color: '#ffffff', map: canvasTex(512, 128, (x, w, h) => { x.fillStyle = '#c8ccd4'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8302a'; x.fillRect(0, 96, w, 10); for (let i = 0; i < 6; i++) { x.fillStyle = '#ffeaa8'; x.fillRect(20 + i * 82, 26, 60, 44); } }), emissive: C('#ffe0a0'), emissiveIntensity: .15 }), std('#b8bcc4')]); car.position.set(k * 11.3, 1.6, 0); tc.add(car); }
    tc.position.set(-20, 0, -5); world.add(tc); stageObj.movers.push({ o: tc, v: 3, min: -50, max: st.len + 10 });
    const plat = new THREE.Mesh(new THREE.BoxGeometry(L, .2, .3), std('#ffd21f')); plat.position.set(st.len / 2, .2, -3.75); world.add(plat);
    for (let x2 = 3; x2 < st.len + 10; x2 += 8) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 6, 16), std('#d8dcd8', { roughness: .5 })); p.position.set(x2, 3, -2.6); p.castShadow = true; world.add(p); const l = new THREE.Mesh(new THREE.BoxGeometry(2.6, .1, .4), new THREE.MeshBasicMaterial({ color: C('#ffffff').multiplyScalar(2) })); l.position.set(x2 + 4, 5.8, -1); world.add(l);
      poster(x2 + 4, 3.2, -6.45, 2.2); if (x2 % 16 === 3) bench(x2 + 2, -3.3); else bin(x2 + 1.6, -3.1); }
    for (let x2 = 14; x2 < st.len; x2 += 26) { const vm = new THREE.Group(); box(1.1, 2, .8, pm('vend', '#e8302a'), 0, 1, 0, vm); const f = new THREE.Mesh(new THREE.PlaneGeometry(.8, 1.2), new THREE.MeshStandardMaterial({ color: '#8ad8ff', emissive: C('#8ad8ff'), emissiveIntensity: .6 })); f.position.set(-.05, 1.2, .41); vm.add(f); vm.position.set(x2, 0, -3.4); world.add(vm); }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(L, 9), std('#3a3e44')); ceil.rotation.x = Math.PI / 2; ceil.position.set(st.len / 2, 6, -2); world.add(ceil);
  }
  if (st.id === 'ware') {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(L, 10), std('#4a3a32', { map: canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#5a4438'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,.25)'; for (let j = 0; j < h; j += 16) for (let i = (j / 16 % 2) * 16; i < w; i += 32) x.fillRect(i, j, 30, 14); }, L / 6, 2) })); wall.position.set(st.len / 2, 5, -6); world.add(wall);
    for (let x2 = 0; x2 < st.len + 10; x2 += 6) { const sh = new THREE.Group(); for (let r = 0; r < 3; r++) { const b = new THREE.Mesh(new THREE.BoxGeometry(4, .12, 1.2), std('#2a5aa8', { metalness: .4 })); b.position.y = .4 + r * 1.4; sh.add(b); for (let c = 0; c < 3; c++) if (Math.random() < .75) { const cr = new THREE.Mesh(new THREE.BoxGeometry(1, 1, .9), std('#b8844a', { roughness: .9 })); cr.position.set(-1.3 + c * 1.3, .95 + r * 1.4, 0); sh.add(cr); } } sh.position.set(x2, 0, -4.6); world.add(sh);
      const lamp = new THREE.Mesh(new THREE.ConeGeometry(.5, .4, 16, 1, true), std('#2a2a2a', { side: THREE.DoubleSide })); lamp.position.set(x2 + 3, 6.5, -1); world.add(lamp); const bulb = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), new THREE.MeshBasicMaterial({ color: C('#ffe2a0').multiplyScalar(2.5) })); bulb.position.set(x2 + 3, 6.35, -1); world.add(bulb); cyl(.015, .015, 3, pm('chain', '#555', { metalness: .7 }), x2 + 3, 8, -1, world, 4); }
    for (let x2 = 9; x2 < st.len; x2 += 21) { const fl = new THREE.Group(); box(1.4, .8, 1, pm('fork', '#ffb21f'), 0, .6, 0, fl); box(.9, .9, .9, pm('cab', '#2a2a30'), -.2, 1.45, 0, fl); for (const s of [-.4, .4]) box(.08, 1.8, .08, PM.cab, .75, .9, s, fl); for (const sx of [-.5, .5]) for (const sz of [-.52, .52]) { const w = cyl(.22, .22, .16, pm('tire', '#1a1a1a'), sx, .22, sz, fl); w.rotation.x = Math.PI / 2; } fl.position.set(x2, 0, -3.1); world.add(fl); }
    for (let x2 = 4; x2 < st.len; x2 += 13) { const g = new THREE.Group(); for (let i = 0; i < 3; i++) cyl(.3, .3, .9, pm('drum' + i % 2, i % 2 ? '#2a6ab8' : '#5a8a3a', { metalness: .4 }), i * .62, .45, (i % 2) * .3, g, 16); g.position.set(x2, 0, -3.2); world.add(g); poster(x2 + 6, 4, -5.95, 2); }
  }
  if (st.id === 'street' || st.id === 'beach' || st.id === 'dock') { for (let x2 = 18; x2 < st.len; x2 += 26) { for (let k = 0; k < 7; k++) { const z = ZMIN + .1 + k * .58; const c = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .3), std(st.id === 'street' ? '#ecebe4' : '#e8d8a0', { roughness: .8, transparent: true, opacity: .85 })); c.rotation.x = -Math.PI / 2; c.position.set(x2, .012, z); c.receiveShadow = true; world.add(c); } }
    for (let x2 = 9; x2 < st.len; x2 += 17) { const mh = new THREE.Mesh(new THREE.CircleGeometry(.34, 24), std('#3a3a40', { metalness: .6, roughness: .5, map: canvasTex(64, 64, (x, w, h) => { x.fillStyle = '#4a4a52'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2a2a30'; x.lineWidth = 3; for (let i = 6; i < 64; i += 9) { x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke(); } }) })); mh.rotation.x = -Math.PI / 2; mh.position.set(x2 + 4, .011, rnd(-1, 1.4)); world.add(mh); } }
  scene.fog = indoor ? null : new THREE.Fog(C(st.id === 'roof' ? '#140c30' : sa).lerp(C(sb), .35), 26, 90);
  shadowAll(world, true, true); sky.castShadow = sky.receiveShadow = false; ground.castShadow = false;
  const tune = { street: [.75, 2.2, '#fff0dc'], subway: [.75, 2.2, '#fff0dc'], beach: [.85, 2.6, '#fff4e0'], roof: [.45, 1.2, '#a8b8ff'], dock: [.6, 2.0, '#ffb07a'], ware: [.55, 1.5, '#fff0dc'] }[st.id];
  hemi.intensity = tune[0]; sun.intensity = tune[1]; sun.color.set(tune[2]);
}

/* ================= FIGHTERS ================= */
const fighters = [], items = [], shots = [];
/* ================= CHARACTERS (stylized athletes – longer limbs, real elbows & knees) ================= */
function toon(o = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); body.scale.setScalar(.9); g.add(body);
  const skin = new THREE.MeshPhysicalMaterial({ color: o.skin || '#f2c3a0', roughness: .55, sheen: .5, sheenColor: C(o.skin || '#f2c3a0').lerp(C('#ffffff'), .4) });
  const shirt = std(o.shirt || '#5fa8ff', { roughness: .78 }), shirtD = std(C(o.shirt || '#5fa8ff').multiplyScalar(.72).getStyle(), { roughness: .8 }), pants = std(o.pants || '#3b4b6b', { roughness: .85 });
  const shoeM = new THREE.MeshPhysicalMaterial({ color: o.shoe || '#ffffff', roughness: .35, clearcoat: .6 }), sole = std('#f4f4f4', { roughness: .6 }), dark = std('#18141c', { roughness: .3 });
  const cap = (r, h, m) => new THREE.Mesh(new THREE.CapsuleGeometry(r, h, 5, 14), m);
  const at = (o3, x, y, z, p) => { o3.position.set(x, y, z); o3.castShadow = true; p.add(o3); return o3; };
  // hips & torso
  at(new THREE.Mesh(new RoundedBoxGeometry(.36, .22, .24, 3, .08), pants), 0, .93, 0, body);
  at(new THREE.Mesh(new THREE.BoxGeometry(.33, .05, .23), dark), 0, 1.02, 0, body);
  const chest = at(cap(.19, .24, shirt), 0, 1.26, 0, body); chest.scale.set(1.3, 1, .85);
  const tri = at(new THREE.Mesh(new THREE.CylinderGeometry(.2, .13, .34, 14), shirt), 0, 1.2, 0, body); tri.scale.z = .75;
  if (o.vest) { const v = at(cap(.175, .25, std(o.vest, { roughness: .6 })), 0, 1.27, 0, body); v.scale.set(1.32, 1.02, .86); }
  if (o.stripe) { const s2 = at(new THREE.Mesh(new THREE.TorusGeometry(.2, .025, 6, 22), std(o.stripe)), 0, 1.3, 0, body); s2.rotation.x = Math.PI / 2; s2.scale.set(1.08, .82, 1); }
  at(new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, .1, 12), skin), 0, 1.53, 0, body);
  // head
  const head = new THREE.Group(); head.position.set(0, 1.56, .01); head.scale.setScalar(1.22); body.add(head); const hr = .16;
  const skull = at(new THREE.Mesh(new THREE.SphereGeometry(hr, 30, 22), skin), 0, .14, 0, head); skull.scale.set(.96, 1.08, 1);
  const jaw = at(new THREE.Mesh(new THREE.SphereGeometry(hr * .82, 24, 16), skin), 0, .07, .03, head); jaw.scale.set(.92, .8, .92);
  for (const s of [-1, 1]) at(new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), skin), s * .152, .13, 0, head).scale.set(.5, 1, .8);
  const eyes = []; for (const s of [-1, 1]) { const e = new THREE.Group(); e.position.set(s * .056, .155, .135); head.add(e); const w = new THREE.Mesh(new THREE.SphereGeometry(.033, 16, 12), std('#ffffff', { roughness: .15 })); w.scale.set(1, 1.2, .55); e.add(w); const p = new THREE.Mesh(new THREE.SphereGeometry(.019, 12, 10), std(o.eye || '#1a1420', { roughness: .1 })); p.position.z = .016; e.add(p); const h = new THREE.Mesh(new THREE.SphereGeometry(.006, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' })); h.position.set(.008, .01, .03); e.add(h); eyes.push(e); }
  const brows = []; for (const s of [-1, 1]) { const b = at(new THREE.Mesh(new THREE.CapsuleGeometry(.009, .045, 4, 6), std(o.hair || '#2a1a10')), s * .058, .205, .14, head); b.rotation.z = Math.PI / 2; brows.push(b); }
  at(new THREE.Mesh(new THREE.SphereGeometry(.024, 10, 8), std(C(o.skin || '#f2c3a0').lerp(C('#ff9a8a'), .2).getStyle())), 0, .105, .158, head).scale.set(.9, 1, 1.1);
  const mD = std('#6a1a2a', { roughness: .4 });
  const smile = at(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V3(-.04, .008, 0), V3(0, -.018, 0), V3(.04, .008, 0)), 10, .007, 5), mD), 0, .06, .145, head);
  const frown = at(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V3(-.035, -.008, 0), V3(0, .014, 0), V3(.035, -.008, 0)), 10, .007, 5), mD), 0, .055, .145, head); frown.visible = false;
  const open = at(new THREE.Mesh(new THREE.SphereGeometry(.028, 14, 10), mD), 0, .055, .14, head); open.scale.set(1.2, .9, .5); open.visible = false;
  if (o.hair && !o.bald) { const hm = std(o.hair, { roughness: .75, side: THREE.DoubleSide });
    if (o.mohawk) { for (let i = 0; i < 6; i++) { const c = at(new THREE.Mesh(new THREE.ConeGeometry(.035, .14, 8), hm), 0, .27 - Math.abs(i - 2.5) * .012, .1 - i * .045, head); c.rotation.x = -.5 + i * .18; } const sh = at(new THREE.Mesh(new THREE.SphereGeometry(hr * 1.03, 24, 14, 0, Math.PI * 2, 0, Math.PI * .42), std(C(o.skin || '#f2c3a0').lerp(C(o.hair), .25).getStyle())), 0, .15, -.005, head); sh.rotation.x = -.35; }
    else { const h = at(new THREE.Mesh(new THREE.SphereGeometry(hr * 1.05, 26, 16, 0, Math.PI * 2, 0, Math.PI * (o.long ? .66 : .48)), hm), 0, .15, -.008, head); h.rotation.x = -.4; h.scale.set(1, 1.08, 1.04);
      if (o.long) { const b = at(cap(.1, .16, hm), 0, .02, -.1, head); b.scale.set(1.35, 1, .7); } else { const fr = at(new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), hm), .03, .265, .1, head); fr.scale.set(2.2, .7, 1); } } }
  if (o.cap) { const cm = std(o.cap, { roughness: .6 }); const c = at(new THREE.Mesh(new THREE.SphereGeometry(hr * 1.08, 24, 14, 0, Math.PI * 2, 0, Math.PI * .5), cm), 0, .17, 0, head); c.rotation.x = -.15; const v = at(new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .016, 20, 1, false, -Math.PI / 2, Math.PI), cm), 0, .2, .1, head); v.rotation.x = .1; }
  if (o.glasses) for (const s of [-1, 1]) { const r = at(new THREE.Mesh(new THREE.TorusGeometry(.03, .006, 6, 16), std(o.glasses)), s * .056, .155, .158, head); }
  if (o.beard) { const bd = at(new THREE.Mesh(new THREE.SphereGeometry(hr * .86, 20, 14, 0, Math.PI * 2, Math.PI * .5, Math.PI * .5), std(o.beard, { roughness: .9 })), 0, .1, .025, head); bd.scale.set(.95, 1, 1); }
  // arms: shoulder group -> upper arm, elbow group -> forearm + fist
  const arms = [], elbows = []; for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.set(s * .28, 1.42, 0); body.add(a);
    at(new THREE.Mesh(new THREE.SphereGeometry(.09, 14, 10), shirt), 0, 0, 0, a); at(cap(.07, .18, o.sleeves === 'long' ? shirt : skin), 0, -.15, 0, a); if (o.sleeves !== 'long') at(cap(.08, .07, shirt), 0, -.06, 0, a);
    const el = new THREE.Group(); el.position.y = -.29; a.add(el); at(new THREE.Mesh(new THREE.SphereGeometry(.068, 12, 10), o.sleeves === 'long' ? shirt : skin), 0, 0, 0, el); at(cap(.062, .17, o.sleeves === 'long' ? shirtD : skin), 0, -.12, 0, el);
    const fist = at(new THREE.Mesh(new RoundedBoxGeometry(.12, .13, .12, 2, .04), o.gloves ? std(o.gloves, { roughness: .4 }) : skin), 0, -.27, 0, el); if (o.gloves) fist.scale.setScalar(1.15);
    arms.push(a); elbows.push(el); }
  // legs: hip group -> thigh, knee group -> shin + shoe
  const legs = [], knees = []; for (const s of [-1, 1]) { const l = new THREE.Group(); l.position.set(s * .11, .9, 0); body.add(l); at(cap(.092, .24, pants), 0, -.2, 0, l);
    const kn = new THREE.Group(); kn.position.y = -.41; l.add(kn); at(new THREE.Mesh(new THREE.SphereGeometry(.088, 12, 10), pants), 0, 0, 0, kn); at(cap(.078, .24, pants), 0, -.18, 0, kn);
    const sh = at(new THREE.Mesh(new RoundedBoxGeometry(.15, .11, .29, 2, .045), shoeM), 0, -.4, .05, kn); at(new THREE.Mesh(new THREE.BoxGeometry(.155, .035, .29), sole), 0, -.448, .05, kn);
    legs.push(l); knees.push(kn); }
  shadowAll(g, true, false);
  const P = { g, head, eyes, brows, smile, frown, open, arms, legs, elbows, knees, body, mood: 'smile' };
  P.setMood = m => { P.mood = m; smile.visible = m === 'smile'; frown.visible = m === 'sad' || m === 'angry'; open.visible = m === 'happy' || m === 'wow'; brows.forEach((b, i) => b.rotation.z = Math.PI / 2 + (m === 'angry' ? (i ? .45 : -.45) : m === 'sad' ? (i ? -.35 : .35) : 0)); };
  return P;
}
function mkFighter(o) { const O = new THREE.Group(); const P = toon(o.look); O.add(P.g); P.g.scale.setScalar(o.sc || 1); world.add(O);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(.42 * (o.sc || 1), 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .3, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = .02; world.add(sh);
  const f = Object.assign({ O, P, sh, x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, face: 1, st: 'idle', t: 0, combo: 0, hold: null, inv: 0, hitIds: new Set(), cd: 0, stun: 0, hits: 0, blink: 0 }, o); fighters.push(f); return f; }
function heroLook(h) { const hi = HEROES.indexOf(h), o = OUTFITS[hi][(S.fit || [0, 0])[hi] || 0] || {}; const L = Object.assign({}, h.look); for (const k of ['shirt', 'pants', 'cap', 'shoe', 'glasses']) if (o[k]) L[k] = o[k]; return L; }
function mkHero(x) { H = HEROES[S.hero || 0]; const u = U(), hp = H.hp + 4 * u.hp; const f = mkFighter({ team: 0, look: heroLook(H), sc: 1, hp, maxhp: hp, dmg: H.dmg * (1 + .12 * u.pw), reach: 1.0, x, z: 0, face: 1 }); f.maxhp = hp; return f; }
let hero = null, H = HEROES[0];
const LV = () => surv ? Math.min(6, survW / 3) : stageIdx;
function spawnFoe(kind, x, z) { const F = FOES[kind]; const c = F.cols[Math.floor(Math.random() * F.cols.length)];
  const look = kind === 'boss' ? { skin: '#e0ac82', shirt: c, hair: F.hair, pants: '#1a1a22', shoe: '#2a2a2a', beard: '#5a3a24', glasses: '#111', cap: null, vest: '#1a1a1a', gloves: '#2a2a2a' } : { skin: ['#f2c3a0', '#c98e6a', '#8a5a3c', '#e0ac82'][Math.floor(Math.random() * 4)], shirt: c, hair: F.hair, pants: kind === 'brute' ? '#2a2a3a' : '#3b3b4b', shoe: '#222', cap: kind === 'runner' && Math.random() < .6 ? '#ffd23a' : null, glasses: kind === 'brute' && Math.random() < .5 ? '#111' : null, long: kind === 'tosser', mohawk: kind === 'punk', bald: kind === 'brute' && Math.random() < .5, beard: kind === 'brute' && Math.random() < .5 ? '#2a1a10' : null, vest: kind === 'brute' ? '#2a2a30' : kind === 'punk' && Math.random() < .5 ? '#1a1a22' : null, sleeves: kind === 'tosser' ? 'long' : null };
  const f = mkFighter({ team: 1, kind, look, sc: F.sc, hp: F.hp + (kind === 'boss' ? LV() * 6 : Math.round(LV() * .7 * (kind === 'brute' ? 2 : 1))), spd: F.spd * (1 + LV() * .045), dmg: F.dmg, reach: F.reach, cdMax: F.cd, knockAtk: !!F.knock, boss: !!F.boss, x, z, face: x < hero.x ? 1 : -1, role: 'wait', think: rnd(0, .4), cd: rnd(.6, 1.6) });
  f.bang = new THREE.Sprite(new THREE.SpriteMaterial({ map: bangTex, depthTest: false, transparent: true })); f.bang.scale.setScalar(.5); f.bang.position.y = 2.35; f.bang.renderOrder = 9; f.bang.visible = false; f.O.add(f.bang);
  f.maxhp = f.hp; if (kind === 'punk' && stageIdx >= 1 && Math.random() < .3) giveWeapon(f, Math.random() < .5 ? 'bat' : 'pipe'); if (f.boss) { MUS.boss = true; $('bossUI').hidden = false; $('bossI').style.width = '100%'; $('bossName').textContent = '👑 ' + STAGES[surv ? (survW / 5 - 1) % STAGES.length : stageIdx].boss; } return f; }

/* ---------- items & weapons ---------- */
const WEAP = { bat: { c: '#c8904a', len: .95, r: .06, dmg: 2.2, dur: 8 }, pipe: { c: '#a8aab0', len: 1.05, r: .05, dmg: 2.6, dur: 10 } };
function weaponMesh(k) { const W = WEAP[k]; const m = new THREE.Mesh(new THREE.CylinderGeometry(W.r * (k === 'bat' ? 1.5 : 1), W.r, W.len, 10), std(W.c, { metalness: k === 'pipe' ? .8 : 0, roughness: k === 'pipe' ? .3 : .6 })); m.castShadow = true; return m; }
function throwMesh(k) { if (k === 'crate') { const g = new THREE.Mesh(new THREE.BoxGeometry(.6, .5, .5), std('#c08a4a', { roughness: .9 })); g.castShadow = true; return g; } const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(.28, .24, .62, 16), std('#8a9aa8', { metalness: .6, roughness: .4 })); g.add(c); const l = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .05, 16), std('#6a7a88', { metalness: .6 })); l.position.y = .32; g.add(l); g.traverse(m => m.castShadow = true); return g; }
const FOOD = { pizza: { hp: 8 }, burger: { hp: 14 }, apple: { hp: 5 }, chili: { pow: 12 }, drink: { nrg: 1 } };
function foodMesh(k) { const g = new THREE.Group(); const add = (geo, c, x, y, z, o) => { const m = new THREE.Mesh(geo, std(c, o)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  if (k === 'pizza') { const p = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .05, 3), std('#ffcf5a')); p.rotation.y = .5; g.add(p); for (let i = 0; i < 3; i++) { const s2 = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .02, 10), std('#e8302a')); s2.position.set(Math.cos(i * 2) * .1, .04, Math.sin(i * 2) * .1); g.add(s2); } }
  else if (k === 'burger') { add(new THREE.SphereGeometry(.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#e0a050', 0, .08, 0); add(new THREE.CylinderGeometry(.2, .2, .07, 18), '#6a3a1a', 0, .03, 0); add(new THREE.CylinderGeometry(.22, .22, .02, 18), '#5ac83a', 0, .075, 0); add(new THREE.CylinderGeometry(.19, .19, .06, 18), '#e0a050', 0, -.04, 0); add(new THREE.CylinderGeometry(.21, .21, .02, 4), '#ffd23a', 0, .0, 0); }
  else if (k === 'apple') { add(new THREE.SphereGeometry(.15, 18, 14), '#e8302a', 0, 0, 0, { roughness: .3 }).scale.set(1, .92, 1); add(new THREE.CylinderGeometry(.012, .012, .08, 6), '#5a3a1a', 0, .16, 0); add(new THREE.SphereGeometry(.05, 8, 6), '#4ab83a', .05, .17, 0).scale.set(1.4, .4, .8); }
  else if (k === 'chili') { const c = add(new THREE.ConeGeometry(.07, .4, 12), '#ff2a1a', 0, 0, 0, { roughness: .25, emissive: C('#ff2a00'), emissiveIntensity: .35 }); c.rotation.z = Math.PI / 2 + .3; add(new THREE.SphereGeometry(.07, 10, 8), '#3ab83a', -.2, .07, 0); }
  else if (k === 'drink') { add(new THREE.CylinderGeometry(.1, .1, .3, 16), '#2a6aff', 0, 0, 0, { metalness: .7, roughness: .25 }); add(new THREE.CylinderGeometry(.101, .101, .1, 16), '#ffd23a', 0, .02, 0, { emissive: C('#ffb21f'), emissiveIntensity: .3 }); add(new THREE.CylinderGeometry(.08, .1, .03, 16), '#c8ccd2', 0, .165, 0, { metalness: .9 }); }
  else if (k === 'letter') { }
  else { const c = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .05, 20), new THREE.MeshStandardMaterial({ color: '#ffd23a', metalness: .9, roughness: .2, emissive: C('#ffb21f'), emissiveIntensity: .3 })); c.rotation.x = Math.PI / 2; g.add(c); } return g; }
function letterSprite(ch) { const c = cnv(128, 128), x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 10, 64, 64, 62); gr.addColorStop(0, 'rgba(255,230,120,.95)'); gr.addColorStop(.6, 'rgba(255,170,40,.75)'); gr.addColorStop(1, 'rgba(255,140,20,0)'); x.fillStyle = gr; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill();
  x.font = '900 78px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 8; x.strokeStyle = '#7a2a00'; x.strokeText(ch, 64, 68); x.fillStyle = '#ffffff'; x.fillText(ch, 64, 68); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctex(c), depthWrite: false, fog: false })); sp.scale.set(.72, .72, 1); return sp; }
function addItem(k, x, z, ch, ly) { const m = k === 'letter' ? letterSprite(ch) : WEAP[k] ? weaponMesh(k) : k === 'crate' || k === 'can' ? throwMesh(k) : foodMesh(k); if (WEAP[k]) { m.rotation.z = Math.PI / 2; m.position.y = .08; } else if (k === 'letter') m.position.y = ly || .9; else if (FOOD[k] || k === 'coin') m.position.y = .3; else m.position.y = k === 'crate' ? .25 : .31; const g = new THREE.Group(); g.add(m); g.position.set(x, 0, z); world.add(g); const it = { k, x, z, g, m, dur: WEAP[k] ? WEAP[k].dur : 0, t: 0, ch, ly: ly || .9 }; items.push(it); return it; }
const randFood = () => { const r = Math.random(); return r < .3 ? 'pizza' : r < .5 ? 'burger' : r < .65 ? 'apple' : r < .83 ? 'chili' : 'drink'; };
function giveWeapon(f, k, dur) { dropHold(f, false); const m = weaponMesh(k); if (f.P.elbows) { m.position.set(0, -.27 - WEAP[k].len / 2 + .1, .02); f.P.elbows[1].add(m); } else { m.position.set(0, -.42 - WEAP[k].len / 2 + .08, 0); f.P.arms[1].add(m); } if (f === hero && !S.seenWT) { S.seenWT = 1; S.save(); setTimeout(() => toast(T('👊 = מכה עם הנשק · 🦶 = לזרוק אותו', '👊 = hit with it · 🦶 = throw it'), 2600), 300); } f.hold = { k, m, dur: dur ?? WEAP[k].dur, weapon: true }; }
function giveThrow(f, k) { dropHold(f, false); const m = throwMesh(k); m.position.set(0, 1.85, 0); f.P.g.add(m); f.hold = { k, m, weapon: false }; }
function dropHold(f, toGround = true) { if (!f.hold) return; const h = f.hold; h.m.parent && h.m.parent.remove(h.m); if (toGround && h.weapon && h.dur > 0) addItem(h.k, f.x + rnd(-.3, .3), clamp(f.z + rnd(-.3, .3), ZMIN, ZMAX)); f.hold = null; }



/* ================= MUSIC – punchy beat (kick, snare, hats, bass, stabs) ================= */
const MUS = { on: false, t: 0, step: 0, bus: null, nb: null, root: 45, boss: false, pause: false };
const KEYS = { street: 45, subway: 43, beach: 48, roof: 41, dock: 46, ware: 40 };
function musStart(root) { const AC = A.ac(); if (!AC) return; if (!MUS.bus) { MUS.bus = AC.createGain(); const cp = AC.createDynamicsCompressor(); cp.threshold.value = -14; cp.ratio.value = 4; MUS.bus.connect(cp).connect(AC.destination); MUS.nb = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = MUS.nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  MUS.root = root; MUS.boss = false; if (!MUS.on) { MUS.on = true; MUS.t = AC.currentTime + .08; MUS.step = 0; } }
function musStop() { MUS.on = false; }
function musTick() { if (!MUS.on || !MUS.bus) return; const AC = A.ac(); MUS.bus.gain.value = S.mute || state === 'pause' ? 0 : .5; if (MUS.t < AC.currentTime - .2) MUS.t = AC.currentTime + .05; const bpm = MUS.boss ? 138 : 126, sp = 60 / bpm / 4, mf = n => 440 * Math.pow(2, (n - 69) / 12);
  const osc = (type, f, t, d, v, f2) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d * .6); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(MUS.bus); o.start(t); o.stop(t + d + .02); return o; };
  const noise = (t, d, type, f, v) => { const b = AC.createBufferSource(); b.buffer = MUS.nb; const fl = AC.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = AC.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); b.connect(fl).connect(g).connect(MUS.bus); b.start(t, Math.random() * .5); b.stop(t + d + .02); };
  const bassF = (n, t, d, v) => { const o = AC.createOscillator(), o2 = AC.createOscillator(), fl = AC.createBiquadFilter(), g = AC.createGain(); o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = mf(n); o2.frequency.value = mf(n) * .5; fl.type = 'lowpass'; fl.frequency.setValueAtTime(900, t); fl.frequency.exponentialRampToValueAtTime(180, t + d); fl.Q.value = 6; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(fl); o2.connect(fl); fl.connect(g).connect(MUS.bus); o.start(t); o2.start(t); o.stop(t + d + .02); o2.stop(t + d + .02); };
  const PROG = [0, -4, 3, -2], BASS = [0, null, 0, 12, null, 0, 7, null, 0, null, 0, 12, 10, null, 7, 5], ARP = [12, 15, 19, 24, 19, 15, 12, 15];
  while (MUS.t < AC.currentTime + .15) { const t = MUS.t, s16 = MUS.step % 16, bar = Math.floor(MUS.step / 16) % 4, sec = Math.floor(MUS.step / 64) % 2, rt = MUS.root + PROG[bar];
    if (s16 % 4 === 0 || (bar === 3 && s16 === 14)) { osc('sine', 150, t, .32, .9, 42); noise(t, .02, 'highpass', 3000, .18); }
    if (s16 === 4 || s16 === 12) { noise(t, .18, 'bandpass', 1900, .55); osc('triangle', 210, t, .09, .3, 140); if (MUS.boss || sec) noise(t + .012, .12, 'highpass', 1200, .25); }
    if (s16 % 2 === 0) noise(t, s16 % 4 === 2 ? .09 : .035, 'highpass', 8000, s16 % 4 === 2 ? .16 : .09); else if (MUS.boss) noise(t, .03, 'highpass', 9000, .06);
    const bn = BASS[s16]; if (bn !== null) bassF(rt - 12 + bn, t, sp * 1.7, .34);
    if (s16 === 0 || s16 === 6 || s16 === 10) for (const iv of [0, 3, 7]) osc('square', mf(rt + 12 + iv), t, .16, .045);
    if (sec === 1 || MUS.boss) osc('triangle', mf(rt + 12 + ARP[s16 % 8] + (bar === 3 ? 2 : 0)), t, .12, .06);
    if (MUS.step % 64 === 60) noise(t, .5, 'bandpass', 600, .12);
    MUS.t += sp; MUS.step++; } }

/* ================= PROGRESSION ================= */
const UPG = [{ k: 'pw', ico: '👊', n: T('כוח', 'Power'), d: T('+12% נזק לכל רמה', '+12% damage per level') }, { k: 'hp', ico: '❤️', n: T('חיים', 'Health'), d: T('+4 חיים לכל רמה', '+4 health per level') }, { k: 'sp', ico: '⚡', n: T('מד־על', 'Super meter'), d: T('המד מתמלא מהר יותר', 'Meter fills faster') }, { k: 'spd', ico: '👟', n: T('מהירות', 'Speed'), d: T('+5% מהירות לכל רמה', '+5% speed per level') }];
const UPC = [120, 250, 450, 700, 1000];
const OUTFITS = [[{ n: T('קלאסי', 'Classic'), p: 0 }, { n: T('ג׳ינס', 'Denim'), p: 150, shirt: '#2a5aa8', pants: '#1a2a4a', cap: '#e8302a' }, { n: T('ניאון', 'Neon'), p: 250, shirt: '#3aff8a', pants: '#1a1a22', cap: '#3ae8ff', shoe: '#3ae8ff' }, { n: T('זהב', 'Gold'), p: 450, shirt: '#ffcf3a', pants: '#1a1a1a', cap: '#ffffff', shoe: '#ffcf3a' }],
  [{ n: T('קלאסי', 'Classic'), p: 0 }, { n: T('לוחם', 'Fighter'), p: 150, shirt: '#e8302a', pants: '#1a1a1a', shoe: '#ffffff' }, { n: T('ספורט', 'Sport'), p: 250, shirt: '#ffffff', pants: '#2a7aff', shoe: '#ff4a6a', glasses: '#111' }, { n: T('לילה', 'Midnight'), p: 450, shirt: '#2a1a4a', pants: '#0a0a14', shoe: '#b05aff', glasses: '#b05aff' }]];
const U = () => S.up || (S.up = { pw: 0, hp: 0, sp: 0, spd: 0 });
const gainM = v => { meter = Math.min(1, meter + v * (1 + .2 * U().sp)); updMeter(); };
function coinsAdd(n) { S.coins = (S.coins || 0) + n; S.save(); }
/* ---------- breakable props in the lane ---------- */
const props = [], debris = [];
function addProp(kind, x, z) { const g = new THREE.Group(); if (kind === 'tbin') { cyl(.28, .24, .75, pm('tbin', '#8a9aa8', { metalness: .6, roughness: .4 }), 0, .375, 0, g, 16); cyl(.3, .3, .05, pm('tbinl', '#6a7a88', { metalness: .6 }), 0, .77, 0, g, 16); } else { box(.7, .6, .6, pm('cbox', '#c8945a', { roughness: .9 }), 0, .3, 0, g); box(.72, .04, .2, pm('tape', '#e8d8a0'), 0, .61, 0, g); } g.position.set(x, 0, z); world.add(g); props.push({ kind, x, z, g, hp: kind === 'tbin' ? 3 : 2, wob: 0 }); }
function hitProp(q, dir, dm) { q.hp -= dm; q.wob = .25; q.dir = dir; shake = Math.max(shake, .1); A.noise(.12, 'bandpass', q.kind === 'tbin' ? 2400 : 500, 2, .22); if (q.hp <= 0) breakProp(q, dir); }
function breakProp(q, dir) { if (!props.includes(q)) return; world.remove(q.g); props.splice(props.indexOf(q), 1); const m = q.kind === 'tbin' ? PM.tbin : PM.cbox;
  for (let i = 0; i < 8; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(rnd(.08, .22), rnd(.06, .18), rnd(.08, .2)), m); d.position.set(q.x, rnd(.2, .6), q.z); d.castShadow = true; world.add(d); debris.push({ m: d, vx: dir * rnd(1, 4) + rnd(-1, 1), vy: rnd(2, 5), vz: rnd(-1.5, 1.5), life: rnd(1, 1.6), rx: rnd(-10, 10) }); }
  A.noise(.3, 'lowpass', q.kind === 'tbin' ? 1600 : 500, 1, .3); score += 30; run.breaks++; if (q.letter) addItem('letter', q.x, q.z, q.letter, .9); const r = Math.random(); addItem(r < .35 ? randFood() : r < .8 ? 'coin' : Math.random() < .5 ? 'bat' : 'pipe', q.x + dir * .4, q.z); }
function stepDebris(dt) { for (let i = debris.length - 1; i >= 0; i--) { const d = debris[i]; d.vy -= GRAV * dt; d.m.position.x += d.vx * dt; d.m.position.y = Math.max(.04, d.m.position.y + d.vy * dt); d.m.position.z += d.vz * dt; if (d.m.position.y <= .04) { d.vy = Math.abs(d.vy) * .3; d.vx *= .6; d.vz *= .6; } d.m.rotation.x += d.rx * dt; d.life -= dt; if (d.life <= 0) { world.remove(d.m); debris.splice(i, 1); } }
  for (const q of props) if (q.wob > 0) { q.wob -= dt; q.g.rotation.z = Math.sin(q.wob * 50) * q.wob * .6; } }
function propsInReach(f, reach, dm) { for (const q of props.slice()) { if (f.hitIds.has(q)) continue; const dx = (q.x - f.x) * f.face; if (dx < -.15 || dx > reach + .2 || Math.abs(q.z - f.z) > .55 || f.y > 1.2) continue; f.hitIds.add(q); hitProp(q, f.face, dm); } }
/* ---------- Pixel the dog ---------- */
function makeDog() { const g = new THREE.Group(), fur = std('#e0a868', { roughness: .8 }), wh = std('#fff4e0', { roughness: .8 }), dk = std('#2a1a10', { roughness: .4 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.2, .42, 6, 12), fur); body.rotation.z = Math.PI / 2; body.position.y = .42; g.add(body);
  const head = new THREE.Group(); head.position.set(.38, .7, 0); g.add(head); head.add(new THREE.Mesh(new THREE.SphereGeometry(.2, 18, 14), fur)); const sn = new THREE.Mesh(new THREE.SphereGeometry(.11, 14, 10), wh); sn.position.set(.16, -.05, 0); sn.scale.set(1.2, .9, 1); head.add(sn);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.04, 10, 8), dk); nose.position.set(.29, -.02, 0); head.add(nose); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), dk); e.position.set(.14, .07, s * .1); head.add(e); const ear = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), std('#8a5a30')); ear.scale.set(.5, 1.3, .9); ear.position.set(-.02, .1, s * .19); ear.rotation.x = s * .5; head.add(ear); }
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(.04, .22, 4, 8), fur); tail.position.set(-.42, .6, 0); tail.rotation.z = -.8; g.add(tail);
  const legs = []; for (const sx of [-.2, .2]) for (const sz of [-.1, .1]) { const l = new THREE.Mesh(new THREE.CapsuleGeometry(.05, .2, 4, 8), fur); l.position.set(sx, .17, sz); g.add(l); legs.push(l); }
  const col = new THREE.Mesh(new THREE.TorusGeometry(.15, .025, 6, 18), std('#e8302a')); col.position.set(.3, .55, 0); col.rotation.y = Math.PI / 2; g.add(col);
  g.traverse(o => o.castShadow = true); return { g, tail, legs, head }; }
let dog = null;

/* ---------- combat ---------- */
let shake = 0, hitStop = 0, combo = 0, comboT = 0, score = 0, lives = 3, deaths = 0, meter = 0, slowT = 0;
// every move: duration, active window, reach, damage, effects
const MOVES = {
  p1: { d: .2, a: .07, e: .14, r: 1, m: 1 }, p2: { d: .2, a: .07, e: .14, r: 1, m: 1 }, p3: { d: .22, a: .08, e: .15, r: 1, m: 1.1 }, p4: { d: .3, a: .1, e: .18, r: 1.05, m: 1.5, kn: 1 },
  upper: { d: .36, a: .1, e: .2, r: 1, m: 1.9, kn: 1, launch: 8.5 }, lowp: { d: .2, a: .07, e: .14, r: 1, m: 1.1, stun: .5 },
  lowk: { d: .24, a: .08, e: .16, r: 1.15, m: 1.1 }, hik: { d: .3, a: .1, e: .2, r: 1.2, m: 1.5 }, spin: { d: .44, a: .12, e: .32, r: 1.3, m: 2, kn: 1, both: 1 },
  sweep: { d: .38, a: .1, e: .26, r: 1.4, m: 1.3, kn: 1, trip: 1 }, jkick: { d: .55, a: .03, e: .5, r: 1.2, m: 2, kn: 1, air: 1 }, dpunch: { d: .45, a: .03, e: .42, r: 1, m: 1.8, kn: 1, air: 1 },
  flip: { d: .5 }, axe: { d: .9, air: 1 }, dash: { d: .34, a: .05, e: .26, r: 1.15, m: 1.9, kn: 1 }, tornado: { d: 1.1, a: 0, e: 1.1, r: 2.1, m: .7, stun: .3, both: 1, multi: .16 },
  swing: { d: .36, a: .14, e: .22, r: 1.45, m: 0, wpn: 1 }, throw: { d: .3 }, roll: { d: .4 }, quake: { d: 1.1, air: 1 }, ehop: { d: .5, air: 1 }, bslam: { d: 1.4, air: 1 },
  eatk: { d: .55, a: .36, e: .44 }, eatk2: { d: .36, a: .16, e: .24, m: .8 }, ejump: { d: .9, a: .25, e: .8, air: 1 }, etoss: { d: .7 }, charge: { d: 1.1, a: .2, e: 1.0, m: 1.6 },
};
const WORDS = ['POW!', 'BAM!', 'WHAM!', 'BOOM!', 'KAPOW!', 'SMASH!'];
function startAtk(f, kind) { f.st = kind; f.t = 0; f.hitIds.clear(); const M = MOVES[kind] || { d: .3 }; f.dur = M.d; f.hitAt = M.a ?? null; f.hitEnd = M.e ?? f.hitAt + .08; f.mv = M; f.multiT = 0; f.spinYaw = 0; }
function hitTargets(f) { const M = f.mv || {}; const reach = (M.r || 1) * (f.reach || 1); let dm = (f.dmg || 1) * (M.wpn ? WEAP[f.hold.k].dmg : M.m || 1);
  let any = false; for (const o of fighters) { if (o.team === f.team || o.team === 2 || o.dead || o.inv > 0 || o.st === 'down' || f.hitIds.has(o)) continue; const dx = (o.x - f.x) * f.face;
    if (M.both ? Math.abs(o.x - f.x) > reach : (dx < -.15 || dx > reach * (o.sc || 1) ** .3)) continue; if (Math.abs(o.z - f.z) > .5 + (f.boss ? .2 : 0) + (M.both ? .25 : 0)) continue; if (Math.abs(o.y - f.y) > (M.trip ? .5 : 1.2)) continue;
    f.hitIds.add(o); any = true; const knock = !!M.kn || (f.team === 1 && (f.knockAtk || f.st === 'ejump')) || (M.wpn && Math.random() < .45);
    if (f.team === 0 && f.perfT > 0) { dm *= 1.5; f.perfT = 0; } if (f.team === 0 && f.powT > 0) dm *= 1.5; damage(o, dm, knock, M.both ? Math.sign(o.x - f.x) || f.face : f.face, f, M); if (M.wpn && f.hold) { f.hold.dur--; if (f.hold.dur <= 0) { FX.burst(V3(f.x + f.face * .8, 1, f.z), 14, [[1, .8, .5]], 2, .06, .5, 4); if (f.team === 0) toast(T('הנשק נשבר!', 'Weapon broke!')); dropHold(f, false); } } }
  if (f.team === 0) propsInReach(f, reach, dm); return any; }
function aoe(f, r, dm) { for (const q of props.slice()) if (Math.hypot(q.x - f.x, (q.z - f.z) * 1.6) < r) breakProp(q, Math.sign(q.x - f.x) || 1); for (const o of fighters) { if (o.team === f.team || o.team === 2 || o.dead || o.inv > 0 || o.st === 'down') continue; if (Math.hypot(o.x - f.x, (o.z - f.z) * 1.6) < r) damage(o, dm, true, Math.sign(o.x - f.x) || 1, f, { kn: 1 }); }
  shake = .45; E.grade.uniforms.uFlash.value = .25; FX.burst(V3(f.x, .15, f.z), 50, [[2.6, 2.2, 1.2], [1.6, 1.6, 1.8]], 5, .1, .6, 6); A.noise(.4, 'lowpass', 500, 1, .5); A.tone(70, .4, 'sine', .25, 0, 40); }
function damage(o, dmg, knock, dir, src, M = {}) {
  if (o.kind === 'brute' && src && src.team === 0 && o.st === 'idle' && !M.kn && !M.trip && !M.wpn && !M.air && !M.both && Math.random() < .45) { o.guardT = .35; o.vx = dir * 1.6; popText(V3(o.x, 1.9 * (o.sc || 1), o.z), 'BLOCK', '#9ad8ff'); A.tone(900, .06, 'square', .05); A.noise(.06, 'highpass', 4000, 1, .12); hitStop = .04; return; }
  if (o.st === 'grabbed' && src && src !== hero) return; o.hp -= dmg; o.hits++; const p = V3(o.x, 1.1 * (o.sc || 1), o.z + .2); o.flash = .12; o.snap = 1; impact(V3(o.x - dir * .25, (M.trip ? .4 : 1.15) * (o.sc || 1), o.z + .3), knock); if (src && src.team === 0) A.noise(.07, 'highpass', 2500, 1, .18); FX.burst(p, 14, [[2.6, 2.4, .8], [2.6, 1.2, .4]], 3, .08, .3, 0); A.noise(.12, 'lowpass', 900, 1, .35); A.tone(110 + Math.random() * 40, .1, 'square', .08, 0, 60); hitStop = knock ? .09 : .05; shake = Math.max(shake, o.team === 0 ? .3 : knock ? .22 : .1);
  if (src && src.team === 0) { combo++; run.maxCombo = Math.max(run.maxCombo, combo); comboT = 1.4; gainM(.055); score += Math.round(10 * dmg) + combo * 2; if (combo >= 3) $('comboUI').textContent = combo + ' HITS!'; $('scoreTxt').textContent = score; updMeter(); if (knock) popText(p, WORDS[Math.floor(Math.random() * WORDS.length)], ['#ffd23a', '#ff5a8a', '#5af0ff', '#7dff5a'][Math.floor(Math.random() * 4)]); }
  if (o.team === 0) { combo = 0; $('comboUI').textContent = ''; buzz(50); gainM(.03); E.grade.uniforms.uFlash.value = .12; }
  if (o.team === 1) dropHold(o); if (o.team === 0 && o.hold && !o.hold.weapon) dropHold(o, false);
  if (o.st === 'grabbed' && o.grabber) { o.grabber.grabbed = null; o.grabber.st = 'idle'; } if (o.team === 0 && o.grabbed) { o.grabbed.st = 'hurt'; o.grabbed.stun = .3; o.grabbed = null; }
  o.face = -dir; if (o.hp <= 0 || knock || o.hits >= 4) { const big = o.team === 1; o.st = 'down'; o.t = 0; o.vx = dir * (M.trip ? 1.5 : big ? 6 : 4.4); o.vy = M.launch || (M.trip ? 3 : big ? 5.8 : 4.8); o.hits = 0; o.tumble = 0; o.bounced = false; o.flying = big && !M.trip; if (big && src && src.team === 0) { camKick = Math.max(camKick, o.hp <= 0 ? 1 : .6); hitStop = o.hp <= 0 ? .14 : .1; } A.voice(o.team === 0 ? 'aww' : 'grr', o.team === 0 ? 1 : .7); if (o.hp <= 0) o.dead = true; }
  else { o.st = 'hurt'; o.t = 0; o.vx = dir * 2.4; o.stun = M.stun || .35; }
  if (o.boss && !o.enraged && o.hp > 0 && o.hp < o.maxhp * .5) { o.enraged = true; o.spd *= 1.3; o.cdMax *= .7; o.P.g.scale.multiplyScalar(1.08); toast(T('😡 הבוס התעצבן! זהירות מקפיצת ההדף – קפצו מעליה!', '😡 The boss is furious! Jump over the shockwave!'), 2200); shake = .6; A.voice('grr', .5); if (lock) { spawnBatch(['punk', 'runner']); } }
  if (o.boss) $('bossI').style.width = Math.max(0, o.hp / o.maxhp * 100) + '%'; if (o.team === 0) updHud(); }
const ringTex = (() => { const c = cnv(128, 128), x = c.getContext('2d'); x.strokeStyle = '#fff'; x.lineWidth = 10; x.beginPath(); x.arc(64, 64, 52, 0, 7); x.stroke(); x.fillStyle = '#fff'; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; x.save(); x.translate(64, 64); x.rotate(a); x.beginPath(); x.moveTo(-6, -30); x.lineTo(0, -62); x.lineTo(6, -30); x.fill(); x.restore(); } return ctex(c); })();
const starTex = (() => { const c = cnv(128, 128), x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 4, 64, 64, 60); g.addColorStop(0, '#fff'); g.addColorStop(.35, '#ffe24a'); g.addColorStop(1, 'rgba(255,120,0,0)'); x.fillStyle = g; x.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, r = i % 2 ? 22 : 62; x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } x.fill(); return ctex(c); })();
const impacts = []; function impact(p, big) { for (const [tx, s0, s1, life] of [[starTex, .5, big ? 1.9 : 1.3, .16], [ringTex, .3, big ? 2.6 : 1.8, .24]]) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, rotation: Math.random() * 6 })); m.position.copy(p); m.scale.setScalar(s0); m.renderOrder = 20; scene.add(m); impacts.push({ m, s0, s1, life, max: life }); } }
function stepImpacts(dt) { for (let i = impacts.length - 1; i >= 0; i--) { const q = impacts[i]; q.life -= dt; const k = 1 - q.life / q.max; if (q.life <= 0) { scene.remove(q.m); q.m.material.dispose(); impacts.splice(i, 1); continue; } q.m.scale.setScalar(lerp(q.s0, q.s1, Math.sqrt(k))); q.m.material.opacity = 1 - k * k; } }
function updMeter() { $('spI').style.width = meter * 100 + '%'; $('bSp').classList.toggle('ready', meter >= 1); }
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };
const bangTex = (() => { const c = cnv(64, 64), x = c.getContext('2d'); x.fillStyle = '#ff2a2a'; x.beginPath(); x.arc(32, 32, 28, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '900 46px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('!', 32, 35); return ctex(c); })();
function popText(p, txt, col) { const v = p.clone().project(camera); const d = document.createElement('div'); d.className = /!$/.test(txt) ? 'pop big' : 'pop'; d.textContent = txt; if (col) d.style.color = col; d.style.left = (v.x * .5 + .5) * innerWidth + 'px'; d.style.top = (bandH ? bandTop + (1 - (v.y * .5 + .5)) * bandH : (1 - (v.y * .5 + .5)) * innerHeight) + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 900); }

/* ---------- animation ---------- */
const lr = (o, k, v, s) => o[k] = lerp(o[k], v, s);
function pose(f, dt, t) { const P = f.P, s = Math.min(1, dt * 20), A0 = P.arms[0], A1 = P.arms[1], L0 = P.legs[0], L1 = P.legs[1], k = f.dur ? clamp(f.t / f.dur, 0, 1) : 0; const ext = Math.sin(Math.min(1, k * 1.6) * Math.PI);
  let a0 = -1.0, a1 = -1.0, l0 = 0, l1 = 0, lean = 0, by = 0, z0 = -.25, z1 = .25, roll = 0, spin = 0; const st = f.st;
  const walking = Math.hypot(f.vx, f.vz) > .4 && f.y < .01;
  if (walking && st === 'idle') { const w = Math.sin(t * (f.run ? 18 : 13)); l0 = w * (f.run ? 1 : .7); l1 = -w * (f.run ? 1 : .7); a0 = -1 - w * .3; a1 = -1 + w * .3; by = Math.abs(w) * .04; if (f.run) lean = .25; }
  if (st === 'idle' && !walking) by = Math.sin(t * 4 + f.x) * .02;
  let pa = -1, pl = -1; const snapE = k < .3 ? -.35 * (k / .3) : Math.sin(Math.min(1, (k - .3) / .45) * Math.PI); // wind-up then snap
  if (st === 'p1' || st === 'p3') { a1 = lerp(-1, -1.62, Math.max(0, snapE)) + Math.min(0, snapE) * -.6; z1 = lerp(.25, -.05, Math.max(0, snapE)); lean = .07 * Math.max(0, snapE); pa = 1; }
  if (st === 'p2') { a0 = lerp(-1, -1.62, Math.max(0, snapE)) + Math.min(0, snapE) * -.6; z0 = lerp(-.25, .05, Math.max(0, snapE)); lean = .07 * Math.max(0, snapE); pa = 0; }
  if (st === 'p4') { a0 = lerp(-1, -1.65, Math.max(0, snapE)) + Math.min(0, snapE) * -.8; z0 = lerp(-.25, .1, Math.max(0, snapE)); lean = .1 * Math.max(0, snapE); spin = -.5 * snapE; pa = 0; }
  if (st === 'dpunch') pa = 0; if (st === 'upper') pa = 1; if (st === 'lowp') pa = 1; if (st === 'lowk' || st === 'hik' || st === 'kick' || st === 'jkick') pl = 1;
  if (st === 'upper') { a1 = k < .3 ? lerp(-1, -.2, k / .3) : lerp(-.2, -3.0, Math.min(1, (k - .3) / .25)); lean = k < .3 ? .25 : -.2; by = k > .3 ? Math.sin((k - .3) / .7 * Math.PI) * .35 : -.12; }
  if (st === 'lowp') { a1 = lerp(-1, -1.25, ext); by = -.18 * ext; lean = .4 * ext; }
  if (st === 'lowk') { l1 = -.85 * ext; lean = -.1 * ext; a0 = -.6; a1 = -.6; }
  if (st === 'hik') { l1 = -2.1 * ext; lean = -.45 * ext; a0 = -.4; a1 = -.4; }
  if (st === 'spin') { l1 = -1.6; lean = -.3; a0 = -.3; a1 = -.3; spin = k * Math.PI * 2; }
  if (st === 'sweep') { by = -.32; lean = .2; l1 = -1.6; l0 = .9; spin = k * Math.PI * 2; a0 = -.2; a1 = -.2; }
  if (st === 'dash') { a1 = -1.75; lean = .4; l0 = .6; l1 = -.6; }
  if (st === 'eatk' || st === 'eatk2') { const w = st === 'eatk' ? .55 : .35; if (k < w) { a1 = lerp(-1, .5, k / w); lean = -.18 * (k / w); } else { a1 = lerp(.5, -1.8, Math.min(1, (k - w) / .2)); lean = .2; } }
  if (st === 'etoss') { a1 = k < .5 ? lerp(-1, .9, k * 2) : lerp(.9, -2.6, Math.min(1, (k - .5) * 4)); lean = k < .5 ? -.2 : .2; }
  if (st === 'ejump') { l1 = -1.5; l0 = .7; lean = -.3; a0 = -.4; a1 = .2; if (f.t < f.hitAt) { by = -.15; lean = .3; l1 = .5; } }
  if (st === 'kick') { l1 = -1.45 * ext; lean = -.25 * ext; a0 = -.3; a1 = -.3; }
  if (st === 'jkick' || (f.y > .05 && st === 'idle')) { if (st === 'jkick') { l1 = -1.5; l0 = .7; lean = -.3; a0 = -.4; a1 = .2; } else { l0 = .6; l1 = -.5; a0 = -1.6; a1 = -1.6; } }
  if (st === 'dpunch') { a1 = -1.1; a0 = -2.4; lean = .5; l0 = .6; l1 = .3; }
  if (st === 'flip') { roll = -k * Math.PI * 2; l0 = l1 = 1.1; a0 = a1 = -1.4; by = .1; }
  if (st === 'axe') { if (f.y > .05) { l1 = -2.8; l0 = .4; lean = -.2; a0 = a1 = -2.2; } else { l1 = -.4; lean = .3; by = -.2; } }
  if (st === 'tornado') { a0 = a1 = -1.55; z0 = -1.5; z1 = 1.5; spin = f.t * 26; by = .15 + Math.sin(f.t * 30) * .05; l0 = .3; l1 = -.3; }
  if (st === 'swing') { a1 = k < .35 ? lerp(-1, -2.9, k / .35) : lerp(-2.9, -.7, Math.min(1, (k - .35) / .25)); lean = k > .35 ? .18 : -.08; a0 = -.8; }
  if (f.hold && !f.hold.weapon) { a0 = a1 = -2.95; z0 = -.05; z1 = .05; }
  if (st === 'throw') { a0 = a1 = lerp(-2.95, -1.2, k); lean = .2 * k; }
  if (st === 'charge') { a0 = a1 = -1.5; lean = .35; const w = Math.sin(t * 20); l0 = w; l1 = -w; }
  if (st === 'hurt') { lean = -.4; a0 = -.4; a1 = -.4; }
  if (st === 'grab') { a0 = a1 = -1.45; z0 = .2; z1 = -.2; lean = .1; }
  if (st === 'knee') { a0 = a1 = -1.3; l1 = -1.7 * Math.sin(Math.min(1, k * 1.8) * Math.PI); lean = .15; }
  if (st === 'grabbed') { lean = -.35; a0 = a1 = -.2; by = .05; }
  if (st === 'ehop') { l0 = .7; l1 = -.5; lean = -.3; a0 = a1 = -1.6; }
  if (st === 'bslam' || st === 'quake') { if (f.y > .1) { a0 = a1 = -2.9; l0 = l1 = .9; lean = .2; } else { a0 = a1 = -.6; by = -.25; lean = .5; } }
  if (f.guardT > 0 && st === 'idle') { a0 = a1 = -2.1; z0 = .55; z1 = -.55; }
  if (st === 'down') { lean = -1.52; a0 = -2.5; a1 = -2.2; z0 = -.7; z1 = .7; l0 = -.35; l1 = -.75; }
  if (st === 'getup') { lean = lerp(-1.52, 0, k); a0 = a1 = lerp(-2.2, -1, k); by = -.25 * Math.sin(k * Math.PI); }
  if (st === 'win') { a0 = a1 = -2.8; by = Math.abs(Math.sin(t * 8)) * .3; }
  const ps = Math.min(1, dt * 34); const reachE = pa >= 0 ? Math.max(0, st === 'upper' || st === 'dpunch' ? ext : snapE) : 0; A0.scale.y = lerp(A0.scale.y, pa === 0 ? 1 + .1 * reachE : 1, ps); A1.scale.y = lerp(A1.scale.y, pa === 1 ? 1 + .1 * reachE : 1, ps); const legE = pl >= 0 ? ext : 0; L1.scale.y = lerp(L1.scale.y, 1 + .06 * legE, ps);
  if (P.elbows) { const ar = [a0, a1]; for (let i = 0; i < 2; i++) { let b = ar[i] < -2.3 ? .2 : ar[i] > -.6 ? .35 : 1.65; if (pa === i) b = 1.65 * (1 - reachE); if (st === 'tornado' || st === 'swing' || st === 'throw' || st === 'grab' || (f.hold && !f.hold.weapon)) b = .15; if (st === 'down' || st === 'hurt') b = .5; lr(P.elbows[i].rotation, 'x', -b, ps); }
    const lg = [l0, l1]; for (let i = 0; i < 2; i++) { let b = .2 + Math.max(0, lg[i]) * .9 + (by < -.1 ? 1.1 : 0) + (f.y > .05 && st === 'idle' ? .9 : 0); if (pl === i) b = 1.3 * (1 - legE); if (st === 'knee' && i === 1) b = 2; if (st === 'down' || st === 'getup') b = .95; if (st === 'flip') b = 2; if (st === 'roll') b = .9; lr(P.knees[i].rotation, 'x', b, ps); } }
  P.g.position.z = lerp(P.g.position.z, (pa >= 0 ? .16 * reachE : 0) + (pl >= 0 ? .1 * legE : 0) - (st === 'hurt' ? .2 : 0), ps); if (!spin && pa >= 0) P.g.rotation.y = lerp(P.g.rotation.y, (pa ? -.4 : .4) * reachE, ps); else if (!spin) P.g.rotation.y = lerp(P.g.rotation.y, 0, s);
  if (P.head) { f.snap = Math.max(0, (f.snap || 0) - dt * 5); P.head.rotation.x = -.5 * Math.sin((f.snap || 0) * Math.PI); }
  if (f.flash > 0 || f.flashOn) { f.flash = (f.flash || 0) - dt; const on = f.flash > 0; if (!f.mats) { f.mats = []; P.g.traverse(m => { if (m.isMesh && m.material && m.material.emissive) f.mats.push(m.material); }); } if (on !== !!f.flashOn) { f.flashOn = on; for (const m of f.mats) { m.emissive.setRGB(on ? .55 : 0, on ? .55 : 0, on ? .55 : 0); } } }
  lr(A0.rotation, 'x', a0, s); lr(A1.rotation, 'x', a1, s); lr(A0.rotation, 'z', z0, s); lr(A1.rotation, 'z', z1, s); lr(L0.rotation, 'x', l0, s); lr(L1.rotation, 'x', l1, s);
  if (st === 'roll') { by = -.12; lean = .38; a0 = a1 = -1.3; z0 = .3; z1 = -.3; l0 = .7 - k * .5; l1 = -.6 + k * .5; }
  if (st === 'flip') P.g.rotation.x = roll; else if (st === 'down' && f.flying && f.y > .05) P.g.rotation.x = -1.52 - (f.tumble || 0); else lr(P.g.rotation, 'x', lean, st === 'down' ? Math.min(1, dt * 10) : s);
  { const sc = f.sc || 1, CC = .78; f.byS = lerp(f.byS || 0, by, s); const rx = P.g.rotation.x; if (P.body) { P.body.position.y = -CC; P.g.position.y = (.17 + (CC - .17) * Math.abs(Math.cos(rx))) * sc + f.byS + (st === 'flip' ? .45 * Math.sin(k * Math.PI) : 0); } else P.g.position.y = f.byS + (st === 'down' ? .22 * sc : 0); }
  
  for (const e of P.eyes) e.scale.y = st === 'hurt' || st === 'down' ? .2 : (Math.sin(t * 1.3 + f.x) > .985 ? .1 : 1);
  P.setMood && (st === 'hurt' || st === 'down' ? P.mood !== 'sad' && P.setMood('sad') : f.team === 1 ? P.mood !== 'angry' && P.setMood('angry') : P.mood !== 'smile' && st !== 'win' && P.setMood('smile'));
  f.O.position.set(f.x, f.y, f.z); const yaw = f.face > 0 ? Math.PI / 2 : -Math.PI / 2; if (spin) f.O.rotation.y = yaw + spin * f.face; else f.O.rotation.y = lerp(f.O.rotation.y, yaw, Math.min(1, dt * 20)); f.sh.position.set(f.x, .02, f.z); f.sh.scale.setScalar(1 - Math.min(.6, f.y * .2));
  if (f.bang) f.bang.visible = f.team === 1 && (st === 'eatk' || st === 'eatk2' || st === 'ejump' || st === 'etoss' || st === 'charge') && f.t < (f.hitAt || .3);
  f.O.visible = f.inv > 0 && f.team === 0 && st !== 'tornado' && st !== 'roll' ? Math.sin(t * 30) > -.3 : f.dead && st === 'down' && f.t > .9 ? Math.sin(t * 40) > 0 : true; }
/* ---------- player control ---------- */
const inp = { x: 0, z: 0, atk: false, kick: false, jmp: false, sp: false, dodge: false };
const keys = {};
addEventListener('keydown', e => { if (e.repeat) return; keys[e.code] = true; if (e.code === 'KeyJ' || e.code === 'KeyX' || e.code === 'Enter') inp.atk = true; if (e.code === 'KeyK' || e.code === 'KeyC') inp.kick = true; if (e.code === 'Space' || e.code === 'KeyZ') { inp.jmp = true; e.preventDefault(); } if (e.code === 'KeyL' || e.code === 'KeyV') inp.sp = true; if (e.code === 'KeyI' || e.code === 'ShiftLeft' || e.code === 'KeyB') inp.dodge = true; });
addEventListener('keyup', e => keys[e.code] = false);
function stepHero(f, dt) { f.perfT = Math.max(0, (f.perfT || 0) - dt); f.powT = Math.max(0, (f.powT || 0) - dt); f.spdT = Math.max(0, (f.spdT || 0) - dt); const SPD = H.spd * (1 + .05 * U().spd) * (f.spdT > 0 ? 1.3 : 1);
  if (f.powT > 0 && Math.random() < dt * 30) { const a = f.P.elbows ? f.P.elbows[Math.random() < .5 ? 0 : 1] : f.P.arms[0]; const wp = V3(0, -.27, 0); a.localToWorld(wp); FX.emit(wp, V3(rnd(-.3, .3), rnd(.4, 1.2), rnd(-.3, .3)), [3, 1, .3], rnd(.05, .09), rnd(.25, .45), -1, .9); }
  if (f.spdT > 0 && Math.abs(f.vx) > 1 && Math.random() < dt * 25) FX.emit(V3(f.x - Math.sign(f.vx) * .3, rnd(.2, 1.2), f.z), V3(-f.vx * .3, 0, 0), [1.2, 2.4, 3], .06, .3, 0, .9);
  if (f.st === 'grab' || f.st === 'knee') { stepGrab(f, dt); return; } let ix = inp.x + ((keys.ArrowRight || keys.KeyD) ? 1 : 0) - ((keys.ArrowLeft || keys.KeyA) ? 1 : 0), iz = inp.z + ((keys.ArrowDown || keys.KeyS) ? 1 : 0) - ((keys.ArrowUp || keys.KeyW) ? 1 : 0); const im = Math.hypot(ix, iz); if (im > 1) { ix /= im; iz /= im; }
  const air = f.y > .01; if (!air) f.jumps = 0;
  f.runT = Math.abs(ix) > .85 && Math.abs(iz) < .5 ? (f.runT || 0) + dt : 0; f.run = f.runT > .35 && f.st === 'idle' && !air;
  if (f.st === 'idle' && !air) { const sp = SPD * (f.run ? 1.65 : 1); f.vx = ix * sp; f.vz = iz * SPD * .7; if (Math.abs(ix) > .2) f.face = Math.sign(ix); }
  if (air && (f.st === 'idle' || f.st === 'flip' || f.st === 'jkick' || f.st === 'dpunch')) f.vx = lerp(f.vx, ix * SPD * 1.1, Math.min(1, dt * 3));
  if (inp.sp) { inp.sp = false; if (meter >= 1 && f.st !== 'down' && f.st !== 'hurt') { meter = 0; updMeter(); if (H.id === 'tex') { startAtk(f, 'quake'); f.slammed = false; f.vy = 9; f.inv = 1.4; f.vx = f.vz = 0; A.tone(120, .8, 'sawtooth', .08, 0, 600); toast(T('⚡ רעידת אדמה!', '⚡ Earthquake slam!'), 1200); } else { startAtk(f, 'tornado'); f.inv = 1.2; f.vx = f.vz = 0; A.tone(200, 1, 'sawtooth', .08, 0, 900); A.noise(1, 'bandpass', 800, .7, .2, 0, 3000); toast(T('⚡ סופר טורנדו!', '⚡ Super tornado!'), 1200); } slowT = .25; } }
  if (inp.dodge) { inp.dodge = false; if (!air && (f.st === 'idle' || (MOVES[f.st] && !MOVES[f.st].air && f.t > f.dur * .4 && f.st !== 'tornado' && f.st !== 'quake'))) { const dir = Math.abs(ix) > .2 ? Math.sign(ix) : f.face; f.face = dir; startAtk(f, 'roll'); f.vx = dir * 8.5; f.vz = iz * 3; f.inv = .38; for (let i = 0; i < 14; i++) FX.emit(V3(f.x - dir * rnd(0, .5), rnd(.05, .9), f.z + rnd(-.2, .2)), V3(-dir * rnd(1, 3), rnd(0, .8), 0), [1.6, 1.8, 2], rnd(.05, .1), rnd(.25, .45), 0, .9); A.noise(.22, 'bandpass', 700, 1, .12, 0, 1500);
      const perfect = fighters.some(o => o.team === 1 && !o.dead && ['eatk', 'eatk2', 'charge', 'ejump', 'bslam'].includes(o.st) && o.t < (o.hitAt || .3) + .05 && Math.abs(o.x - f.x) < 2.6 && Math.abs(o.z - f.z) < .8);
      if (perfect) { slowT = .7; f.perfT = 2; gainM(.2); popText(V3(f.x, 2.2, f.z), 'PERFECT!', '#5af0ff'); A.tone(1320, .12, 'triangle', .07); A.tone(1760, .2, 'triangle', .06, .08); buzz(25); } } }
  if (inp.jmp) { inp.jmp = false;
    if (f.st === 'idle' && !air) { f.vy = H.jump; f.jumps = 1; A.tone(380, .12, 'triangle', .06, 0, 700); }
    else if (air && f.jumps === 1 && (f.st === 'idle' || f.st === 'jkick')) { f.jumps = 2; f.vy = H.jump * 1.05; startAtk(f, 'flip'); A.tone(520, .2, 'triangle', .07, 0, 1200); A.noise(.3, 'bandpass', 1600, 1, .08); } }
  const canChain = f.st === 'idle' || (MOVES[f.st] && !MOVES[f.st].air && f.st !== 'tornado' && f.st !== 'flip' && f.t > f.dur * .5 && f.st !== 'swing' && f.st !== 'throw');
  if (inp.atk || inp.kick) { const isKick = inp.kick && !inp.atk; inp.atk = inp.kick = false;
    if (air) { if (f.st === 'flip' && isKick) { startAtk(f, 'axe'); f.vy = -14; A.noise(.2, 'bandpass', 1200, 1, .1); } else if (f.st === 'idle' || f.st === 'flip') { startAtk(f, isKick ? 'jkick' : 'dpunch'); if (!isKick) f.vy = Math.min(f.vy, -3); A.noise(.15, 'bandpass', 1500, 1, .1); } }
    else if (canChain) {
      const it = !isKick && items.find(q => (WEAP[q.k] || q.k === 'crate' || q.k === 'can') && Math.abs(q.x - f.x) < .75 && Math.abs(q.z - f.z) < .5);
      const foeNear = fighters.some(o => o.team === 1 && !o.dead && Math.abs(o.x - f.x) < 1.7 && Math.abs(o.z - f.z) < .7);
      if (it && f.st === 'idle' && (!f.hold || !foeNear)) { if (f.hold) { const h = f.hold; dropHold(f, false); const bx = clamp(f.x - f.face * .7, -1e9, 1e9); if (!h.weapon || h.dur > 0) addItem(h.k, bx, f.z); if (h.weapon && items.length) items[items.length - 1].dur = h.dur; } pickItem(f, it); }
      else if (!isKick && !f.hold && f.st === 'idle' && (() => { const o = fighters.find(o => o.team === 1 && !o.dead && !o.boss && o.st === 'hurt' && Math.abs(o.x - f.x) < .95 && Math.abs(o.z - f.z) < .45 && Math.sign(o.x - f.x) === f.face); if (!o) return false; f.st = 'grab'; f.t = 0; f.grabbed = o; f.grabN = 0; o.st = 'grabbed'; o.grabber = f; o.t = 0; f.vx = f.vz = 0; A.tone(300, .08, 'triangle', .08); if (!S.seenG) { S.seenG = 1; S.save(); toast(T('תפסתם אותו! 👊 = ברך · 🦶 = זריקה', 'Grabbed! 👊 = knee · 🦶 = throw'), 2500); } return true; })()) { }
      else if (f.hold && f.hold.weapon && isKick) { const h = f.hold; h.m.parent && h.m.parent.remove(h.m); f.hold = null; const m = weaponMesh(h.k); m.position.set(f.x + f.face * .5, 1.2, f.z); world.add(m); shots.push({ m, k: h.k, x: f.x + f.face * .5, y: 1.2, z: f.z, vx: f.face * 12, vy: 1.2, team: 0, life: 1.4, dmg: 2.2 * WEAP[h.k].dmg * (f.dmg || 1), wpn: 1 }); startAtk(f, 'throw'); f.t = .12; A.noise(.25, 'bandpass', 900, 1, .14, 0, 2200); }
      else if (f.hold && !f.hold.weapon && !isKick) startAtk(f, 'throw');
      else if (f.hold && !isKick) { startAtk(f, 'swing'); A.noise(.2, 'bandpass', 900, 1, .1, 0, 300); }
      else if (f.run && !isKick) { startAtk(f, 'dash'); f.vx = f.face * 7; A.noise(.2, 'bandpass', 1200, 1, .12, 0, 400); }
      else { const up = iz < -.55, dn = iz > .55; let mv;
        if (isKick) mv = dn ? 'sweep' : up ? 'hik' : chainStep(f, 'k', ['lowk', 'hik', 'spin']); else mv = up ? 'upper' : dn ? 'lowp' : chainStep(f, 'p', H.combo === 4 ? ['p1', 'p2', 'p3', 'p4'] : ['p1', 'p2', 'p4']);
        if (Math.abs(ix) > .3) f.face = Math.sign(ix); startAtk(f, mv); f.vx = f.face * (mv === 'spin' ? 1.5 : .8); A.noise(.08, 'bandpass', isKick ? 1500 : 2200, 1, .08); } } }
  if (!(f.st === 'idle' || air || f.st === 'dash' || f.st === 'roll')) { f.vx *= Math.pow(.02, dt); f.vz *= Math.pow(.02, dt); }
  if (f.st === 'dash') f.vx *= Math.pow(.08, dt);
  for (let i = items.length - 1; i >= 0; i--) { const q = items[i]; if (q.k === 'letter' && Math.abs(q.x - f.x) < .6 && Math.abs(q.z - f.z) < .55 && (q.ly < 1.2 || f.y > q.ly - 1.25)) { world.remove(q.g); items.splice(i, 1); gotLetter(q.ch); continue; }
    if ((FOOD[q.k] || q.k === 'coin') && Math.abs(q.x - f.x) < .6 && Math.abs(q.z - f.z) < .5 && !air) { world.remove(q.g); items.splice(i, 1); const F2 = FOOD[q.k]; if (F2) { if (F2.hp) { f.hp = Math.min(f.maxhp, f.hp + F2.hp); popText(V3(f.x, 2, f.z), '+❤️ ' + F2.hp, '#ff7a7a'); } if (F2.pow) { f.powT = F2.pow; popText(V3(f.x, 2.2, f.z), T('🌶️ כוח כפול!', '🌶️ POWER UP!'), '#ff5a3a'); toast(T('🌶️ צ׳ילי! מכות חזקות פי 1.5 למשך 12 שניות', '🌶️ Chili! 1.5× power for 12 seconds'), 1600); } if (F2.nrg) { f.spdT = 8; gainM(.5); popText(V3(f.x, 2.2, f.z), T('⚡ אנרגיה!', '⚡ ENERGY!'), '#5af0ff'); } A.tone(660, .1, 'triangle', .08); A.tone(990, .15, 'triangle', .08, .1); } else { score += 50; coinsAdd(5); popText(V3(f.x, 2, f.z), '+🪙'); A.tone(1320, .08, 'square', .04); A.tone(1980, .12, 'sine', .05, .05); } updHud(); } } }
function stepGrab(f, dt) { const o = f.grabbed; f.vx = f.vz = 0; if (!o || o.dead || o.st !== 'grabbed') { f.st = 'idle'; f.t = 0; f.grabbed = null; return; }
  if (f.st === 'knee' && f.t > .26) { f.st = 'grab'; }
  const away = (inp.x + ((keys.ArrowRight || keys.KeyD) ? 1 : 0) - ((keys.ArrowLeft || keys.KeyA) ? 1 : 0)) * f.face < -.6;
  if (inp.kick || inp.jmp || away || f.grabN >= 3 || f.t > 2.2) { inp.kick = inp.jmp = inp.atk = false; const dm = 2 * (f.dmg || 1); o.st = 'idle'; o.grabber = null; f.grabbed = null; damage(o, dm, true, f.face, f, { launch: 5.5, m: 2, kn: 1 }); o.vx = f.face * 9.5; o.thrown = true; o.flying = true; f.st = 'throw'; f.t = 0; f.dur = .3; f.mv = MOVES.throw; popText(V3(o.x, 2, o.z), 'THROW!', '#ffd23a'); A.noise(.3, 'bandpass', 500, 1, .2, 0, 1400); return; }
  if (inp.atk && f.st === 'grab') { inp.atk = false; f.st = 'knee'; f.t = 0; f.dur = .26; f.grabN++; f.hitIds.clear(); const dm = 1.3 * (f.dmg || 1); o.hp -= dm; o.flash = .12; o.snap = 1; impact(V3(o.x, .9, o.z + .2), false); A.noise(.1, 'lowpass', 800, 1, .35); A.tone(120, .1, 'square', .08, 0, 60); hitStop = .06; shake = .15; combo++; comboT = 1.4; gainM(.06); score += 15 + combo * 2; if (combo >= 3) $('comboUI').textContent = combo + ' HITS!'; updHud();
    if (o.hp <= 0) { o.st = 'idle'; o.grabber = null; f.grabbed = null; f.st = 'idle'; damage(o, 0.01, true, f.face, f, { launch: 5, kn: 1 }); } }
  inp.atk = false; }
function chainStep(f, key, seq) { const now = performance.now(); f.ch = f.ch || {}; const c = f.ch[key] || { i: 0, t: 0 }; if (now - c.t > 700) c.i = 0; const s = seq[c.i % seq.length]; c.i = (c.i + 1) % seq.length; c.t = now; f.ch[key] = c; return s; }
function pickItem(f, it) { world.remove(it.g); items.splice(items.indexOf(it), 1); if (WEAP[it.k]) giveWeapon(f, it.k, it.dur); else giveThrow(f, it.k); A.tone(520, .08, 'triangle', .07); A.tone(780, .1, 'triangle', .06, .06); if (!S.seenW) { S.seenW = 1; S.save(); toast(WEAP[it.k] ? T('יש לכם נשק! 💪 ליד נשק אחר – לחצו 👊 כדי להחליף', 'You got a weapon! 💪 Near another one – tap 👊 to swap') : T('לחצו 👊 כדי לזרוק!', 'Tap 👊 to throw!')); } }
function doThrow(f) { const h = f.hold; if (!h) return; h.m.parent.remove(h.m); f.hold = null; const m = throwMesh(h.k); m.position.set(f.x + f.face * .5, 1.7, f.z); world.add(m); shots.push({ m, k: h.k, x: f.x + f.face * .5, y: 1.7, z: f.z, vx: f.face * 10, vy: 1.5, team: f.team, life: 1.6 }); A.noise(.25, 'bandpass', 700, 1, .12, 0, 1800); }
function tossBottle(f) { const m = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, .32, 10), new THREE.MeshPhysicalMaterial({ color: '#3aff8a', roughness: .1, transmission: 0, transparent: true, opacity: .85 })); b.rotation.z = Math.PI / 2; m.add(b); m.position.set(f.x + f.face * .5, 1.5, f.z); world.add(m);
  const dx = hero.x - f.x, tt = clamp(Math.abs(dx) / 7, .35, .9); shots.push({ m, k: 'bottle', x: f.x + f.face * .5, y: 1.5, z: f.z, vx: dx / tt, vy: 3.2, vz: (hero.z - f.z) / tt, team: 1, life: 2, dmg: f.dmg }); A.tone(700, .15, 'triangle', .04, 0, 300); }

/* ---------- enemy AI ---------- */
function stepFoe(f, dt) { f.guardT = Math.max(0, (f.guardT || 0) - dt); if (f.st === 'grabbed') return; if (f.st !== 'idle') { if (f.st !== 'ejump' && f.st !== 'charge' && f.st !== 'bslam' && f.st !== 'ehop') { f.vx *= Math.pow(.02, dt); f.vz *= Math.pow(.02, dt); } return; } if (!hero || hero.dead || hero.st === 'down') { f.vx = f.vz = 0; return; }
  f.think -= dt; f.cd -= dt; const F = FOES[f.kind];
  if (f.think <= 0) { f.think = rnd(.3, .55); const att = fighters.filter(o => o.team === 1 && !o.dead && o.role === 'attack').length; const cap = [2, 3, 3, 3, 4, 4][stageIdx] || 4;
    if (f.role !== 'attack' && att < cap && Math.random() < .8) f.role = 'attack'; else if (f.role === 'attack' && Math.random() < .08) f.role = 'wait'; f.side = Math.sign(f.x - hero.x) || 1; f.wz = clamp(hero.z + rnd(-1, 1), ZMIN, ZMAX); }
  const range = (f.reach || 1) * .85; let tx, tz;
  if (F.ranged) { tx = hero.x + f.side * 4.2; tz = hero.z + (Math.sin(f.t * .8 + f.x) * .3); }
  else if (f.role === 'attack') { tx = hero.x + f.side * range; tz = hero.z; } else { tx = hero.x + f.side * (2.4 + (f.sc || 1)); tz = f.wz; }
  tx = clamp(tx, camX - halfW + .4, camX + halfW - .4); if (!onScreen(f)) tx = clamp(tx, camX - halfW + 1.2, camX + halfW - 1.2);
  const dx = tx - f.x, dz = tz - f.z, d = Math.hypot(dx, dz); const sp = f.spd * (f.role === 'attack' || F.ranged ? 1 : .6);
  if (d > .12) { f.vx = dx / d * Math.min(sp, d * 4); f.vz = dz / d * Math.min(sp * .75, d * 4); } else { f.vx = f.vz = 0; }
  f.face = Math.sign(hero.x - f.x) || f.face;
  const adx = Math.abs(hero.x - f.x), adz = Math.abs(hero.z - f.z);
  if (F.ranged && f.cd <= 0 && adx > 2.2 && adx < 6.5 && adz < .6 && onScreen(f)) { f.cd = f.cdMax * rnd(.8, 1.2); startAtk(f, 'etoss'); f.vx = f.vz = 0; return; }
  if (F.leap && adx < 1.5 && adz < .5 && hero.mv && MOVES[hero.st] && hero.t < .1 && Math.random() < .3) { startAtk(f, 'ehop'); f.vx = -f.face * 5.5; f.vy = 4.2; return; }
  if (f.boss && f.enraged && f.cd <= 0 && adx < 4.5 && adx > 1 && Math.random() < dt * 1.4) { startAtk(f, 'bslam'); f.slammed = false; f.vy = 9.5; f.vx = (hero.x - f.x) * 1.05; f.cd = f.cdMax * 1.6; return; }
  if (F.leap && f.cd <= 0 && adx > 1.8 && adx < 3.4 && adz < .4 && Math.random() < .5) { f.cd = f.cdMax * 1.4; startAtk(f, 'ejump'); f.vx = 0; f.vz = 0; return; }
  if (f.boss && f.cd <= 0 && adz < .4 && adx > 2.5 && Math.random() < dt * 1.5) { startAtk(f, 'charge'); f.vx = f.face * 7.5; f.cd = f.cdMax * 1.5; toast(T('זהירות! הבוס מסתער!', 'Watch out! The boss charges!'), 1200); return; }
  const inRange = adx < (f.reach || 1) * 1.05 && adz < .35;
  if (f.role === 'attack' && inRange && f.cd <= 0) { f.cd = f.cdMax * rnd(.75, 1.15); if (f.hold && f.hold.weapon) startAtk(f, 'swing'); else startAtk(f, 'eatk'); f.vx = 0; f.vz = 0; } }
const onScreen = f => f.x > camX - halfW + .3 && f.x < camX + halfW - .3;

/* ---------- state machine for everyone ---------- */
function stepFighter(f, dt) { f.inv = Math.max(0, f.inv - dt);
  if (f.team === 0 && !f.dead) stepHero(f, dt); else if (f.team === 1 && !f.dead) stepFoe(f, dt);
  f.t += dt; const M = f.mv;
  if (M && f.st !== 'idle' && MOVES[f.st] === M) {
    if (M.multi) { f.multiT -= dt; if (f.multiT <= 0) { f.multiT = M.multi; f.hitIds.clear(); } FX.emit(V3(f.x + rnd(-1, 1), rnd(.3, 1.6), f.z + rnd(-.4, .4)), V3(rnd(-2, 2), 1, 0), [1.6, 1.4, 2.6], .12, .4, 0, .8); }
    if (f.hitAt != null && f.t >= f.hitAt && f.t < f.hitEnd) hitTargets(f);
    if (f.st === 'charge') { f.vx = f.face * 7.5; if (Math.abs(f.x - (camX + f.face * halfW)) < .8) f.t = f.dur; }
    if (f.st === 'ejump' && f.t >= f.hitAt && !f.leapt) { f.leapt = true; f.vy = 6.5; f.vx = f.face * 5.5; }
    if (f.st === 'etoss' && f.t >= .4 && !f.tossed) { f.tossed = true; tossBottle(f); }
    if (f.st === 'axe' && ((f.y <= 0 && f.t > .05) || f.t > 1.6)) { aoe(f, 1.9, 2.6 * (f.dmg || 1)); f.st = 'idle'; f.t = 0; }
    const airMove = M.air && f.y > .01;
    if (f.t >= f.dur && !airMove && f.st !== 'axe') { const was = f.st; if (was === 'tornado') aoe(f, 2.3, 1.4 * (f.dmg || 1)); f.st = 'idle'; f.t = 0; f.leapt = f.tossed = false;
      if (f.team === 1 && was === 'eatk' && FOES[f.kind].chain && Math.random() < FOES[f.kind].chain && Math.abs(hero.x - f.x) < (f.reach || 1) * 1.2) startAtk(f, 'eatk2'); } }
  if (f.st === 'flip' && f.y <= 0 && f.t > .1) { f.st = 'idle'; f.t = 0; }
  if (f.st === 'roll') { f.vx *= Math.pow(.25, dt); if (f.t >= .4) { f.st = 'idle'; f.t = 0; } }
  if (f.st === 'bslam' && f.slammed && f.t >= f.dur) { f.st = 'idle'; f.t = 0; f.slammed = false; } 
  if (f.st === 'throw' && f.t >= .12 && f.hold) doThrow(f); if (f.st === 'throw' && f.t >= f.dur) { f.st = 'idle'; f.t = 0; }
  if (f.st === 'hurt') { f.stun -= dt; f.vx *= Math.pow(.01, dt); if (f.stun <= 0) { f.st = 'idle'; f.t = 0; } }
  if (f.st === 'down' && f.flying && f.team === 1) { f.tumble = (f.tumble || 0) + dt * 11; for (const o of fighters) { if (o === f || o.team !== 1 || o.dead || o.st === 'down' || o.st === 'grabbed') continue; if (Math.abs(o.x - f.x) < .75 && Math.abs(o.z - f.z) < .5 && Math.abs(f.vx) > 2.5) { damage(o, f.thrown ? 2.4 : 1.2, true, Math.sign(f.vx), hero || { team: 0 }, { kn: 1 }); popText(V3(o.x, 2, o.z), f.thrown ? 'STRIKE!' : 'BONK!', '#7dff5a'); } }
    for (const q of props.slice()) if (Math.abs(q.x - f.x) < .6 && Math.abs(q.z - f.z) < .5 && Math.abs(f.vx) > 2) breakProp(q, Math.sign(f.vx)); }
  if (f.st === 'down') { f.vx *= Math.pow(f.flying && f.y > .05 ? .6 : .15, dt); if (f.y <= 0 && f.t > .1 && f.vy <= 0 && !f.landed) { f.landed = true; A.noise(.15, 'lowpass', 300, 1, .25); shake = Math.max(shake, .15); }
    if (f.t > (f.dead ? 1.4 : f.team === 0 ? .9 : 1.1) && f.y <= 0) { f.landed = false; if (f.dead) return kill(f); f.st = 'getup'; f.t = 0; f.dur = .35; } }
  if (f.st === 'getup' && f.t >= f.dur) { f.st = 'idle'; f.t = 0; f.inv = f.team === 0 ? 1 : .5; }
  if (f.st === 'grabbed') { const g = f.grabber; if (!g || g.dead || g.st !== 'grab' && g.st !== 'knee') { f.st = 'hurt'; f.stun = .3; f.t = 0; f.grabber = null; } else { f.x = g.x + g.face * .62; f.z = g.z; f.y = 0; f.vx = f.vz = f.vy = 0; f.face = -g.face; return; } }
  f.vy -= GRAV * dt; f.y += f.vy * dt; if (f.y <= 0 && f.st === 'down' && f.vy < -4 && !f.bounced) { f.bounced = true; f.vy = -f.vy * .38; f.y = .01; FX.burst(V3(f.x, .1, f.z), 18, [[.8, .75, .7]], 2.4, .09, .5, 3); A.noise(.18, 'lowpass', 260, 1, .3); shake = Math.max(shake, .22); }
  if (f.y <= 0) { if (f.st === 'down' && f.flying) { f.flying = false; f.thrown = false; f.P.g.rotation.x = -1.52; } f.y = 0; f.vy = 0; if (f.st === 'jkick' || f.st === 'dpunch' || f.st === 'ehop' || (f.st === 'ejump' && f.leapt)) { f.st = 'idle'; f.t = 0; f.leapt = false; }
    if (f.st === 'bslam' && f.t > .2 && !f.slammed) { f.slammed = true; shake = .7; camKick = 1; FX.burst(V3(f.x, .1, f.z), 60, [[1, .8, .6], [1.6, 1.2, .8]], 6, .12, .7, 5); A.noise(.5, 'lowpass', 300, 1, .5); A.tone(60, .4, 'sine', .3, 0, 30); impact(V3(f.x, .2, f.z), true); if (hero && !hero.dead && hero.y < .35 && hero.inv <= 0 && Math.abs(hero.x - f.x) < 3.4 && Math.abs(hero.z - f.z) < 1.6) damage(hero, 2.6 * (f.dmg || 1) / 1.5, true, Math.sign(hero.x - f.x) || 1, f); }
    if (f.st === 'quake' && f.t > .15 && !f.slammed) { f.slammed = true; aoe(f, 3.3, 3.2 * (f.dmg || 1)); camKick = 1.2; impact(V3(f.x, .2, f.z), true); FX.burst(V3(f.x, .1, f.z), 80, [[2.6, 2, .8], [1.6, 1.6, 2.4]], 7, .12, .8, 5); f.st = 'idle'; f.t = 0; } }
  f.x += f.vx * dt; f.z = clamp(f.z + f.vz * dt, ZMIN, ZMAX);
  if (f.team === 0) f.x = clamp(f.x, camX - halfW + .5, camX + halfW - .5); else if (onScreen(f)) f.x = clamp(f.x, camX - halfW - 1, camX + halfW + 1); }
function kill(f) { const p = V3(f.x, .6, f.z); FX.burst(p, 40, CONFETTI, 3.2, .09, 1, 4); for (let i = 0; i < 8; i++) FX.emit(p.clone().add(V3(rnd(-.4, .4), rnd(0, .8), 0)), V3(rnd(-1, 1), rnd(1, 3), 0), [2.6, 2.4, .6], .14, .8, 2, 1);
  world.remove(f.O); world.remove(f.sh); fighters.splice(fighters.indexOf(f), 1);
  if (f.team === 1) { score += f.boss ? 1000 : f.kind === 'brute' ? 150 : f.kind === 'tosser' ? 100 : 80; gainM(.08); if (f.boss) coinsAdd(60); A.tone(880, .08, 'square', .04); A.tone(1320, .1, 'square', .04, .06); const r = Math.random(); if (r < .42) addItem('coin', f.x, f.z); else if (r < .56) addItem(randFood(), f.x, f.z); if (f.boss) { $('bossUI').hidden = true; } updHud(); checkWave(); }
  else heroDown(); }

/* ================= STAGE FLOW ================= */
let state = 'title', stageIdx = 0, camX = 0, halfW = 6, wave = 0, lock = null, maxX = 0, goT = 0, startT = 0, surv = false, survW = 0, survNext = 0;

/* ---------- letters, road hazard, side challenges ---------- */
const WORD = 'PIXEL', CAR_ST = ['street', 'beach', 'dock'];
let run = { lets: '', breaks: 0, maxCombo: 0, carHits: 0 }, car = null, carNext = 12;
function placeLetters(st) { if (surv) return; const L = st.len, xs = [.16, .34, .52, .7, .86].map(f => f * L + rnd(-1.5, 1.5)); const inBox = [1, 3]; [...WORD].forEach((ch, i) => { const x = xs[i];
    if (inBox.includes(i)) { let best = null, bd = 1e9; for (const q of props) { const d = Math.abs(q.x - x); if (!q.letter && d < bd) { bd = d; best = q; } } if (best) { best.letter = ch; const gl = letterSprite(ch); gl.scale.set(.42, .42, 1); gl.position.y = best.kind === 'tbin' ? 1.05 : .9; gl.material.opacity = .55; gl.material.transparent = true; best.g.add(gl); return; } }
    addItem('letter', x, rnd(ZMIN + .4, ZMAX - .4), ch, i % 2 === 0 && i ? 2.1 : .9); }); updLetters(); }
function updLetters() { const el = $('letUI'); if (!el) return; el.hidden = surv || state !== 'play'; el.innerHTML = [...WORD].map(c => `<i class="${run.lets.includes(c) ? 'on' : ''}">${c}</i>`).join(''); }
function gotLetter(ch) { if (run.lets.includes(ch)) return; run.lets += ch; score += 100; [784, 988, 1175].forEach((f, k) => A.tone(f, .12, 'triangle', .08, k * .06)); FX.burst(V3(hero.x, 1.6, hero.z), 30, [[3, 2.4, .6], [3, 1.4, .3]], 3, .08, .8, 4); popText(V3(hero.x, 2.3, hero.z), ch + '!', '#ffd23a', true); updLetters();
  if (run.lets.length === WORD.length) { score += 500; coinsAdd(50); setTimeout(() => toast(T('🐶 מצאתם את כל האותיות P-I-X-E-L! +500 · 🪙 +50', '🐶 You found all of P-I-X-E-L! +500 · 🪙 +50'), 2200), 300); } }
function challenges(i) { const id = STAGES[i].id; return [{ k: 'let', n: T('🔤 מצאו את כל האותיות P-I-X-E-L', '🔤 Find all letters P-I-X-E-L'), ok: () => run.lets.length === WORD.length },
  { k: 'brk', n: T('📦 שברו 6 חפצים', '📦 Break 6 objects'), ok: () => run.breaks >= 6 },
  CAR_ST.includes(id) ? { k: 'car', n: T('🚗 תנו למכונית להפיל 2 אויבים', '🚗 Let the car knock down 2 foes'), ok: () => run.carHits >= 2 } : { k: 'cmb', n: T('🔥 קומבו של 12 מכות', '🔥 A 12-hit combo'), ok: () => run.maxCombo >= 12 }]; }
function chHTML(i) { const L = challenges(i), done = (S.ch && S.ch[i]) || {}; let gain = 0; const h = L.map(c => { const ok = c.ok(); if (ok && !done[c.k]) { done[c.k] = 1; gain += 30; } return `<li class="${ok ? 'ok' : done[c.k] ? 'old' : ''}">${ok ? '✅' : done[c.k] ? '☑️' : '⬜'} ${c.n}</li>`; }).join(''); S.ch = S.ch || {}; S.ch[i] = done; if (gain) coinsAdd(gain); return { h, gain }; }
function carWarn() { const st = STAGES[stageIdx]; if (!CAR_ST.includes(st.id) || surv) return; const lane = clamp((hero ? hero.z : 0) + rnd(-.6, .6), ZMIN + .5, ZMAX - .5), dir = Math.random() < .5 ? 1 : -1;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2 + 6, 1.2), new THREE.MeshBasicMaterial({ color: '#ff2a2a', transparent: true, opacity: .0, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(camX, .03, lane); world.add(m);
  car = { lane, dir, warn: 1.6, m, g: null, x: 0, hit: new Set() }; A.tone(392, .35, 'square', .07); A.tone(330, .35, 'square', .07, .4); toast(T('🚗 מכונית מגיעה! זוזו מהנתיב', '🚗 Car coming! Get out of the lane'), 1200); }
function stepCar(dt) { if (!CAR_ST.includes(STAGES[stageIdx].id) || surv) return; if (!car) { if (lock || goT > 0 || (fighters.some(f => f.boss))) carNext -= dt * .6; else carNext -= dt; if (carNext <= 0) { carNext = rnd(14, 22); carWarn(); } return; }
  if (car.warn > 0) { car.warn -= dt; car.m.position.x = camX; car.m.material.opacity = .18 + .22 * (Math.sin(car.warn * 18) > 0 ? 1 : 0); if (car.warn <= 0) { car.g = parkedCar(camX - car.dir * (halfW + 6), car.lane, ['#ff3a3a', '#2a7aff', '#ffd23a', '#3aff8a'][Math.floor(Math.random() * 4)]); car.g.rotation.y = car.dir > 0 ? 0 : Math.PI; car.g.scale.setScalar(.8); car.x = car.g.position.x; A.tone(440, .25, 'sawtooth', .06); A.tone(554, .3, 'sawtooth', .06, .05); A.noise(1.4, 'lowpass', 300, 1, .25, 0, 900); } return; }
  car.x += car.dir * 17 * dt; car.g.position.x = car.x; car.m.material.opacity *= Math.pow(.1, dt);
  for (const f of fighters) { if (f.dead || f.team === 2 || car.hit.has(f) || f.st === 'grabbed') continue; if (Math.abs(f.x - car.x) < 1.6 && Math.abs(f.z - car.lane) < .75 && f.y < 1) { car.hit.add(f); if (f === hero) { if (hero.inv <= 0) damage(hero, 4, true, car.dir); } else { run.carHits++; damage(f, f.boss ? 4 : 7, true, car.dir); popText(V3(f.x, 2, f.z), T('בום!', 'BOOM!'), '#ff5a3a', true); } shake = Math.max(shake, .3); A.noise(.3, 'lowpass', 500, 1, .35); } }
  if (Math.abs(car.x - camX) > halfW + 9) { world.remove(car.g); world.remove(car.m); car = null; } }
function placeProps(st) { const r = (a, b) => rnd(a, b); props.length = 0; debris.length = 0; for (let x = 7; x < st.len - 4; x += r(6, 10)) addProp(Math.random() < .5 ? 'tbin' : 'cbox', x, r(ZMIN + .3, ZMAX - .3)); for (let x = 5; x < st.len - 4; x += r(7, 12)) { const k = Math.random() < .45 ? 'crate' : Math.random() < .5 ? 'can' : Math.random() < .5 ? 'bat' : 'pipe'; addItem(k, x, r(ZMIN + .3, ZMAX - .3)); } }
function startStage(i, demo, sv) { if (dog) { world.remove(dog.g); dog = null; } surv = !!sv && !demo; survW = 0; survNext = 1.5; stageIdx = i; const st = STAGES[i]; fighters.slice().forEach(f => { world.remove(f.O); world.remove(f.sh); }); fighters.length = 0; items.length = 0; shots.length = 0; buildStage(st);
  hero = mkHero(1.5);
  camX = halfW = 6; wave = 0; lock = null; maxX = 0; combo = 0; deaths = 0; if (!demo) { score = 0; lives = 3; meter = 0; updMeter(); } placeProps(st); run = { lets: '', breaks: 0, maxCombo: 0, carHits: 0 }; if (car) { if (car.g) world.remove(car.g); world.remove(car.m); car = null; } carNext = rnd(9, 13); if (!demo) placeLetters(st); fit(); updHud();
  if (demo) return; state = 'play'; startT = performance.now(); $('title').hidden = true; $('endSheet').hidden = $('pauseSheet').hidden = true; $('hud').hidden = false; $('stick').hidden = $('btns').hidden = !isTouch && !window.__forceTouch; $('bossUI').hidden = true; $('goUI').hidden = false; goT = 3; updLetters(); if (!surv) setTimeout(() => { if (state === 'play') toast(T('אתגרים: ', 'Challenges: ') + challenges(stageIdx).map(c => c.n).join(' · '), 3200); }, (S.tut || 0) < 3 ? 9800 : 2200);
  musStart(KEYS[STAGES[stageIdx].id] || 45);
  toast(surv ? T('∞ שרידות – כמה גלים תשרדו?', '∞ Survival – how many waves can you last?') : st.n + ' – ' + T('קדימה!', 'Let’s go!'), 1800); $('waveUI').hidden = !surv; if (surv) { $('goUI').hidden = true; goT = 0; updWave(); } if ((S.tut || 0) < 3 && !surv) { S.tut = 3; S.save(); setTimeout(() => toast(isTouch ? T('👊 אגרוף · 🦶 בעיטה · 💨 התחמקות (בדיוק בזמן = PERFECT!) · 👊 על אויב מסוחרר = תפיסה, ואז 🦶 = זריקה · ⚡ כשהמד מלא', '👊 punch · 🦶 kick · 💨 dodge (just in time = PERFECT!) · 👊 a dizzy foe = grab, then 🦶 = throw · ⚡ when the meter is full') : T('J אגרוף · K בעיטה · רווח קפיצה · I התחמקות · L מיוחד · J על אויב מסוחרר = תפיסה, K = זריקה', 'J punch · K kick · Space jump · I dodge · L special · J on a dizzy foe = grab, K = throw'), 7500), 1900); } }
function spawnBatch(kinds) { kinds.forEach((k, i) => { lock.pending++; setTimeout(() => { if (state !== 'play' || !lock) return; const side = i % 2 ? -1 : 1; spawnFoe(k, lock.x + side * (halfW + 1.2 + i * .4), rnd(ZMIN + .2, ZMAX - .2)); lock.pending--; }, 250 + i * 550); }); }
function updWave() { $('waveUI').textContent = T('גל ', 'Wave ') + survW + (S.surv ? ' · ' + T('שיא ', 'Best ') + S.surv : ''); }
function startSurvWave() { survW++; updWave(); const pool = ['punk', 'runner']; if (survW >= 3) pool.push('tosser'); if (survW >= 5) pool.push('brute'); const n = Math.min(9, 2 + Math.floor(survW * .7)); const ks = []; for (let i = 0; i < n; i++) ks.push(pool[Math.floor(Math.random() * pool.length)]); if (survW % 5 === 0) ks.unshift('boss');
  const b = []; for (let i = 0; i < ks.length; i += 3) b.push(ks.slice(i, i + 3)); lock = { x: camX, pending: 0, batches: b.slice(1).map(a => a.join(' ')) }; spawnBatch(b[0]); toast((survW % 5 === 0 ? '👑 ' : '') + T('גל ', 'Wave ') + survW, 1200); A.tone(520, .12, 'triangle', .06); A.tone(780, .15, 'triangle', .06, .1); if (hero && hero.hp < hero.maxhp * .5 && survW > 1) addItem(Math.random() < .5 ? 'burger' : 'pizza', camX + rnd(-2, 2), rnd(-1, 1)); }
function checkWave() { if (!lock) return; const left = fighters.filter(f => f.team === 1).length;
  if (lock.batches.length && left <= 1 && !lock.pending) { spawnBatch(lock.batches.shift().split(' ')); toast(T('עוד מהכנופיה מגיעים!', 'More of the gang incoming!'), 1200); return; }
  if (left === 0 && !lock.pending && surv) { lock = null; slowT = .5; survNext = 1.8; score += survW * 100; coinsAdd(8); return; }
  if (left === 0 && !lock.pending) { lock = null; slowT = .5; if (wave >= STAGES[stageIdx].waves.length) { stageClear(); return; } $('goUI').hidden = false; goT = 2.5; A.tone(660, .15, 'triangle', .06); A.tone(880, .2, 'triangle', .06, .12); } }
function stepFlow(dt) { const st = STAGES[stageIdx]; if (surv) { camX = lerp(camX, 9, Math.min(1, dt * 4)); maxX = camX; if (!lock) { survNext -= dt; if (survNext <= 0) startSurvWave(); } return; } const W2 = st.waves[wave];
  if (!lock && W2 && hero.x > W2[0] - 1) { const batches = W2[1].split(';'); lock = { x: Math.max(camX, W2[0]), pending: 0, batches: batches.slice(1) }; wave++; spawnBatch(batches[0].split(' ')); $('goUI').hidden = true; }
  const target = lock ? lock.x : clamp(hero.x, halfW, st.len - halfW + 2); camX = lerp(camX, Math.max(target, maxX - 1), Math.min(1, dt * 4)); maxX = Math.max(maxX, camX); if (goT > 0) { goT -= dt; if (goT <= 0) $('goUI').hidden = true; } }
function heroDown() { lives--; deaths++; updHud(); if (lives <= 0) { state = 'over'; setTimeout(gameOver, 900); return; }
  setTimeout(() => { if (state !== 'play') return; hero = mkHero(camX - halfW + 1); hero.inv = 2.2; hero.y = 6; for (const f of fighters) if (f.team === 1 && Math.abs(f.x - hero.x) < 2.5) { damage(f, 0, true, Math.sign(f.x - hero.x) || 1); } updHud(); toast(T('חזרתם לקרב! ❤️', 'Back in the fight! ❤️')); }, 1200); }
function stageClear() { state = 'clear'; A.allOff(); musStop(); hero.st = 'win'; $('stick').hidden = $('btns').hidden = true; $('bossUI').hidden = true; const secs = (performance.now() - startT) / 1000; const stars = deaths === 0 ? 3 : deaths === 1 ? 2 : 1; const cw = 40 + stars * 20 + Math.round(score / 100); coinsAdd(cw); const fin = stageIdx === STAGES.length - 1; if (fin) { dog = makeDog(); dog.g.position.set(camX + halfW + 1, 0, hero.z); world.add(dog.g); dog.t = 0; } if ((S.stars[stageIdx] || 0) < stars) S.stars[stageIdx] = stars; if (score > S.best) S.best = score; S.save();
  [0, 4, 7, 12].forEach((n, k) => A.tone(523 * Math.pow(2, n / 12), .25, 'triangle', .09, k * .1)); A.voice('yay', 1.1); FX.burst(V3(hero.x, 2, hero.z), 120, CONFETTI, 6, .1, 1.8, 5);
  setTimeout(() => { $('eT').textContent = stageIdx === STAGES.length - 1 ? T('ניצחתם את הכנופיה! 🏆', 'You beat the gang! 🏆') : T('השלב נוקה! 💥', 'Stage cleared! 💥'); [...$('eStars').children].forEach((e, k) => { e.classList.toggle('on', k < stars); e.style.animationDelay = k * .25 + 's'; });
    $('eP').textContent = T(`${score} נקודות · ${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`, `${score} points · ${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`) + ` · 🪙 +${cw}` + (stageIdx === STAGES.length - 1 ? T(' · הכלב פיקסל חזר הביתה! 🐶', ' · Pixel the dog is home! 🐶') : ''); $('eNext').hidden = stageIdx >= STAGES.length - 1; const ch = chHTML(stageIdx); $('eCh').innerHTML = ch.h + (ch.gain ? `<li class="gain">🪙 +${ch.gain} ${T('על אתגרים', 'for challenges')}</li>` : ''); $('eCh').hidden = false; S.save(); $('letUI').hidden = true; $('eAgain').textContent = T('שוב', 'Again'); $('endSheet').hidden = false; $('stick').hidden = $('btns').hidden = true; }, fin ? 4200 : 1600); }
function gameOver() { A.allOff(); musStop(); $('waveUI').hidden = true; $('eCh').hidden = true; $('letUI').hidden = true; if (surv) { const nb = survW > (S.surv || 0); if (nb) S.surv = survW; const c = survW * 8; coinsAdd(c); $('eT').textContent = nb ? T('שיא חדש! 🔥', 'New record! 🔥') : T('נוקאאוט! 😵', 'Knocked out! 😵'); [...$('eStars').children].forEach(e => e.classList.remove('on')); $('eP').textContent = T('שרדתם ', 'You survived ') + (survW - 1) + T(' גלים', ' waves') + ` · ${score} · 🪙 +${c}`; $('eNext').hidden = true; $('eAgain').textContent = T('שוב', 'Again'); $('endSheet').hidden = false; $('stick').hidden = $('btns').hidden = true; if (score > S.best) S.best = score; S.save(); return; }
  $('eT').textContent = T('נוקאאוט! 😵', 'Knocked out! 😵'); [...$('eStars').children].forEach(e => e.classList.remove('on')); $('eP').textContent = T('נגמרו החיים. עוד ניסיון?', 'Out of lives. One more try?') + ` · ${score}`; coinsAdd(Math.round(score / 100)); $('eNext').hidden = true; $('eAgain').textContent = T('נסו שוב', 'Try again'); $('endSheet').hidden = false; $('stick').hidden = $('btns').hidden = true; if (score > S.best) { S.best = score; S.save(); } }
function updHud() { if (!hero) return; $('hpI').style.width = Math.max(0, hero.hp / hero.maxhp * 100) + '%'; $('scoreTxt').textContent = score; $('livesTxt').textContent = '❤️'.repeat(Math.max(0, lives)); $('pName').textContent = H.n; }
let bandTop = 0, bandH = 0;
function fit() { const w = innerWidth, h = innerHeight, port = w < h * 1.05; bandH = h; bandTop = 0;
  const pr = renderer.getPixelRatio(); renderer.setSize(w, bandH, false); E.composer.setSize(w, bandH); E.fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (bandH * pr)); const cv = renderer.domElement; cv.style.position = 'absolute'; cv.style.top = bandTop + 'px'; cv.style.height = bandH + 'px'; cv.style.width = w + 'px';
  camera.aspect = w / bandH; camera.clearViewOffset(); camera.fov = port ? 60 : 34; const a = camera.aspect, fovR = THREE.MathUtils.degToRad(camera.fov / 2); const viewW = port ? 5.3 : clamp(a * 4.4, 7.6, 10.5); camera.userData.d = viewW / (2 * Math.tan(fovR) * a); halfW = viewW / 2; camera.updateProjectionMatrix(); }
E.onResize.push(fit);

/* ---------- touch controls ---------- */
const stick = $('stick'), knob = $('knob'); let sid = null, sc0 = null;
stick.addEventListener('pointerdown', e => { A.ac(); sid = e.pointerId; stick.setPointerCapture(sid); const r = stick.getBoundingClientRect(); sc0 = [r.left + r.width / 2, r.top + r.height / 2]; mv(e); });
const mv = e => { if (e.pointerId !== sid) return; let dx = e.clientX - sc0[0], dy = e.clientY - sc0[1]; const l = Math.hypot(dx, dy), m = 52; if (l > m) { dx *= m / l; dy *= m / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; inp.x = Math.abs(dx) > 8 ? dx / m : 0; inp.z = Math.abs(dy) > 8 ? dy / m : 0; };
stick.addEventListener('pointermove', mv); const su = e => { if (e.pointerId !== sid) return; sid = null; knob.style.transform = ''; inp.x = inp.z = 0; }; stick.addEventListener('pointerup', su); stick.addEventListener('pointercancel', su);
for (const [id, k] of [['bAtk', 'atk'], ['bJmp', 'jmp'], ['bKick', 'kick'], ['bSp', 'sp'], ['bDodge', 'dodge']]) { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); A.ac(); inp[k] = true; b.classList.add('on'); }); const off = () => b.classList.remove('on'); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); }

/* ---------- screens ---------- */
const unlocked = i => i === 0 || (S.stars[i - 1] || 0) > 0 || (S.stars[i] || 0) > 0;
if (!S.v2) { const o = S.stars || {}, n = {}; if (o[0]) n[0] = o[0]; if (o[1]) n[1] = o[1]; if (o[2]) n[3] = o[2]; if (o[3]) n[5] = o[3]; S.stars = n; S.v2 = 1; S.save(); }
function showTitle() { surv = false; $('waveUI').hidden = true; state = 'title'; A.allOff(); A.stopMusic(); musStop(); $('title').hidden = false; $('hud').hidden = $('stick').hidden = $('btns').hidden = $('bossUI').hidden = $('goUI').hidden = true; $('endSheet').hidden = $('pauseSheet').hidden = true; $('comboUI').textContent = ''; $('letUI').hidden = true;
  $('pick').innerHTML = HEROES.map((h, i) => `<button class="pk" data-h="${i}" aria-pressed="${i === (S.hero || 0)}"><b>${h.n}</b><small>${h.d}</small><div class="st">${h.stat.map(x => `<span>${x}</span>`).join('')}</div></button>`).join('');
  let g = ''; for (let i = 0; i < STAGES.length; i++) { const un = unlocked(i), st = S.stars[i] || 0; g += `<button class="lb ${un ? '' : 'lock'}" data-i="${i}" ${un ? '' : 'disabled'} style="font-size:15px">${un ? STAGE_ICO[i] : '🔒'}<small>${un ? starsHTML(st) : ''}</small></button>`; } g += `<button class="lb surv" data-s="1" style="font-size:15px">♾️<small>${T('שרידות', 'Survival')}${S.surv ? ' · ' + S.surv : ''}</small></button>`; $('lgrid').innerHTML = g; $('tCoins').textContent = S.coins || 0;
  startStage(0, true); hero.x = camX - 1.2; hero.face = 1; titleDemo(); }
function titleDemo() { const other = HEROES[1 - (S.hero || 0)]; const f = mkFighter({ team: 2, look: heroLook(other), x: camX + 1.2, z: 0, face: -1, hp: 1, maxhp: 1 }); f.demo = true; }
$('pick').onclick = e => { const b = e.target.closest('[data-h]'); if (!b) return; A.ac(); S.hero = +b.dataset.h; S.save(); A.tone(600, .06, 'triangle', .06); showTitle(); };
$('lgrid').onclick = e => { const sb = e.target.closest('[data-s]'); if (sb) { A.ac(); startStage(0, false, true); return; } const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; A.ac(); startStage(+b.dataset.i); };
function renderShop() { const u = U(), hi = S.hero || 0; $('shopCoins').textContent = S.coins || 0;
  $('upList').innerHTML = UPG.map(g => { const l = u[g.k] || 0, c = UPC[l]; return `<div class="up"><span class="ic">${g.ico}</span><div class="tx"><b>${g.n}</b><small>${g.d}</small><i>${'●'.repeat(l)}${'○'.repeat(5 - l)}</i></div><button class="btn ${l < 5 && (S.coins || 0) >= c ? 'pri' : ''}" data-u="${g.k}" ${l >= 5 ? 'disabled' : ''}>${l >= 5 ? 'MAX' : '🪙 ' + c}</button></div>`; }).join('');
  $('fitList').innerHTML = OUTFITS[hi].map((o, i) => { const own = (S.ofo || []).includes(hi + '-' + i), on = (S.fit || [0, 0])[hi] === i, L = Object.assign({}, HEROES[hi].look, o); return `<button class="fit ${on ? 'on' : ''}" data-f="${i}"><i style="background:linear-gradient(180deg,${L.cap || L.hair} 0 22%,${L.skin} 22% 42%,${L.shirt} 42% 72%,${L.pants} 72%)"></i><b>${o.n}</b><small>${on ? T('לבוש ✔', 'Wearing ✔') : own ? T('ללבוש', 'Wear') : '🪙 ' + o.p}</small></button>`; }).join('');
  $('fitT').textContent = T('תלבושות של ', 'Outfits for ') + HEROES[hi].n; }
$('upList').onclick = e => { const b = e.target.closest('[data-u]'); if (!b) return; const u = U(), k = b.dataset.u, l = u[k] || 0; if (l >= 5) return; if ((S.coins || 0) < UPC[l]) { toast(T('צריך עוד מטבעות 🪙', 'Need more coins 🪙')); return; } S.coins -= UPC[l]; u[k] = l + 1; S.save(); A.tone(660, .1, 'triangle', .07); A.tone(990, .14, 'triangle', .07, .08); renderShop(); };
$('fitList').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; const hi = S.hero || 0, i = +b.dataset.f, key = hi + '-' + i, o = OUTFITS[hi][i]; S.ofo = S.ofo || ['0-0', '1-0']; if (!S.ofo.includes(key)) { if ((S.coins || 0) < o.p) { toast(T('צריך עוד מטבעות 🪙', 'Need more coins 🪙')); return; } S.coins -= o.p; S.ofo.push(key); A.voice('yay', 1.3); } S.fit = S.fit || [0, 0]; S.fit[hi] = i; S.save(); renderShop(); };
$('shopBtn').onclick = () => { A.ac(); renderShop(); $('shopSheet').hidden = false; }; $('shopClose').onclick = () => { $('shopSheet').hidden = true; showTitle(); };
$('shopBtn').textContent = T('🛒 חנות שדרוגים', '🛒 Upgrade shop'); $('bDodge').innerHTML = `💨<small>${T('התחמקות', 'Dodge')}</small>`; $('shopT').textContent = T('חנות', 'Shop'); $('upT').textContent = T('שדרוגים (לשני האחים)', 'Upgrades (both brothers)'); $('shopClose').textContent = T('סגירה', 'Close');
$('eMap').onclick = () => showTitle(); $('eAgain').onclick = () => startStage(stageIdx, false, surv); $('eNext').onclick = () => startStage(stageIdx + 1);
$('pauseBtn').onclick = () => { if (state !== 'play') return; state = 'pause'; $('pauseSheet').hidden = false; }; $('pGo').onclick = () => { $('pauseSheet').hidden = true; state = 'play'; }; $('pMap').onclick = () => showTitle();
$('pauseBtn').innerHTML = ICO.pause('#ffffff'); $('homeT').innerHTML = ICO.home('#ffffff'); soundButton('sndBtn', S, A, '#ffffff'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('tSub').textContent = T('כנופיית "פחיות הספריי" חטפה את פיקסל, הכלב של האחים! בחרו אח, צאו לרחובות והחזירו אותו הביתה 🐶', 'The Spray Can gang kidnapped Pixel, the brothers’ dog! Pick a brother, hit the streets and bring him home 🐶');
$('pT').textContent = T('הפסקה', 'Paused'); $('pMap').textContent = T('תפריט', 'Menu'); $('pGo').textContent = T('המשך ▶', 'Resume ▶'); $('eMap').textContent = T('תפריט', 'Menu'); $('eNext').textContent = T('השלב הבא ▶', 'Next stage ▶');

/* ---------- loop ---------- */
let last = performance.now(), camKick = 0;
function loop(now) { requestAnimationFrame(loop); let dt = Math.min(.05, (now - last) / 1000) * (window.__fast || 1); last = now; const t = now / 1000; musTick(); A.tick();
  if (hitStop > 0) { hitStop -= dt; dt *= .15; } if (slowT > 0) { slowT -= dt; dt *= .35; }
  if (state === 'play' && hero) { for (const f of fighters.slice()) stepFighter(f, dt); stepFlow(dt); stepCar(dt);
    for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; s.vy -= (s.k === 'bottle' ? 9 : 6) * dt; s.x += s.vx * dt; s.z += (s.vz || 0) * dt; s.y = Math.max(s.k === 'bottle' ? 0 : .3, s.y + s.vy * dt); s.m.position.set(s.x, s.y, s.z); s.m.rotation.z -= dt * (s.wpn ? 22 : 10); s.life -= dt; let hit = null;
      for (const o of fighters) if (o.team !== s.team && o.team !== 2 && !o.dead && o.inv <= 0 && o.st !== 'down' && Math.abs(o.y + 1 - s.y) < 1.3 && Math.abs(o.x - s.x) < .6 && Math.abs(o.z - s.z) < .55) { hit = o; break; }
      if (hit || s.life <= 0 || (s.k === 'bottle' && s.y <= 0) || !onScreen({ x: s.x })) { if (hit) damage(hit, s.dmg || 3.2, s.k !== 'bottle', Math.sign(s.vx), { team: s.team }); if (s.k === 'bottle') A.noise(.25, 'highpass', 3000, 1, .2); FX.burst(V3(s.x, s.y, s.z), 24, [[1.4, 1, .6], [.8, .8, .9]], 3, .08, .6, 6); A.noise(.3, 'lowpass', 700, 1, .3); world.remove(s.m); shots.splice(i, 1); if (s.k === 'crate' && Math.random() < .5) addItem(Math.random() < .5 ? 'pizza' : 'coin', s.x, s.z); } }
    comboT -= dt; if (comboT <= 0 && combo) { combo = 0; $('comboUI').textContent = ''; } }
  else if (state === 'clear' || state === 'over') { for (const f of fighters) { if (f.st === 'down') stepFighter(f, dt * .5); } }
  for (const f of fighters) pose(f, dt, t); stepDebris(dt);
  if (dog && dog.g.parent) { dog.t += dt; const tx = hero ? hero.x + .9 : camX; const g = dog.g; if (g.position.x > tx + .05) { g.position.x -= dt * 4.5; g.rotation.y = Math.PI; const w = Math.sin(dog.t * 22); dog.legs.forEach((l, i) => l.rotation.z = (i % 2 ? w : -w) * .7); g.position.y = Math.abs(w) * .06; } else { g.rotation.y = Math.PI; g.position.y = Math.abs(Math.sin(dog.t * 7)) * .5; if (Math.random() < dt * 6) FX.emit(V3(g.position.x, 1.3, g.position.z), V3(rnd(-.5, .5), 1.5, 0), [2.6, .8, 1.2], .14, 1, 0, 1); if (!dog.said) { dog.said = 1; popText(V3(g.position.x, 1.6, g.position.z), '🐶❤️'); A.voice('yay', 1.6); } } dog.tail.rotation.x = Math.sin(dog.t * 24) * .6; }
  for (const it of items) { it.t += dt; if (it.k === 'coin') it.m.rotation.y += dt * 4; if (FOOD[it.k] || it.k === 'coin') { it.m.position.y = .3 + Math.sin(it.t * 4) * .06; if (it.k !== 'coin' && it.k !== 'pizza') it.m.rotation.y += dt * 2; } if (it.k === 'letter') it.m.position.y = it.ly + Math.sin(it.t * 3) * .08; }
  if (stageObj) { for (const m of stageObj.movers) { m.o.position.x += m.v * dt; if (m.o.position.x > m.max) m.o.position.x = m.min; } if (stageObj.water) stageObj.water.offset.x += dt * .02;
    for (const q of stageObj.peds) { q.t += dt; q.x += q.v * dt; const len = STAGES[stageIdx].len; if (q.x > len + 6 || q.x < -6) q.v = -q.v; const w = Math.sin(q.t * 9); q.P.legs[0].rotation.x = w * .6; q.P.legs[1].rotation.x = -w * .6; q.P.arms[0].rotation.x = -w * .4; q.P.arms[1].rotation.x = w * .4; q.P.g.position.set(q.x, Math.abs(w) * .03, q.z); q.P.g.rotation.y = q.v > 0 ? Math.PI / 2 : -Math.PI / 2; } }
  shake = Math.max(0, shake - dt * 1.5); const port = innerWidth < innerHeight; const d = camera.userData.d || 14;
  camKick = Math.max(0, camKick - dt * 3); const dd = d * (port ? 1 : 1.1) * (1 - camKick * .05); if (!window.__noCam) camera.position.set(camX + (Math.random() - .5) * shake, (port ? 4 : 5) + (Math.random() - .5) * shake, dd); if (!window.__noCam) camera.lookAt(camX, port ? 0 : -.3, -.4); sun.position.set(camX + 4, 12, 9); sun.target.position.set(camX, 0, 0);
  stepImpacts(dt); FX.update(dt, 0); E.grade.uniforms.uFlash.value *= Math.pow(.05, dt); E.render(); }
setTimeout(() => { E.resize(); showTitle(); $('loading').hidden = true; requestAnimationFrame(loop); window.__brawlOK = true; }, 20);
window.__br = { MOVES, props, damage, camera, get S() { return S; }, makeDog, get meter() { return meter; }, set meter(v) { meter = v; updMeter(); }, spawnFoe, startAtk, addItem, startStage, get hero() { return hero; }, get fighters() { return fighters; }, inp, get state() { return state; }, get camX() { return camX; }, items, get run() { return run; }, carWarn, get car() { return car; }, stageClear, gotLetter, set god(v) { if (hero) hero.inv = v; } };
