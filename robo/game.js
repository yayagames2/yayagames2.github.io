import { THREE, $, V3, C, clamp, lerp, rnd, rng, T, EN, store, engine, studioEnv, std, particles, audio, toast, ICO, hubButtons, qualityButton, isTouch, CONFETTI } from '../lib/kit.js';
const S = store('robo-save', { tro: 0, gears: 60, lv: {}, mode: 'cpu', diff: 'normal', wins: 0, tut: 0 });
const E = engine(S, { fov: 42, far: 300, bloom: [.45, .5, .9], exposure: 1.0, vignette: .3, sat: 1.12, bg: '#070b18' });
const { scene, camera, renderer } = E; studioEnv(E, '#cfe4ff', '#2a3448', .5);
const A = audio(S); const FX = particles(E, 1600, true); const SM = particles(E, 600);
const TAU = Math.PI * 2; const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };
const HX = 9, HZ = 16, RIV = 1.3, BX = 5.2, US = 1.55;

/* ================= DATA ================= */
const CARDS = {
  scout: { n: T('סקאוט', 'Scout'), cost: 2, hp: 300, spd: 3.4, dmg: 60, rate: .75, range: .95, aggro: 5.5, size: .42, tgt: 'ground', hit: 'any', d: T('קטן ומהיר, תוקף מקרוב', 'Small & fast melee bot') },
  blaster: { n: T('בלאסטר', 'Blaster'), cost: 3, hp: 480, spd: 2.3, dmg: 85, rate: 1.05, range: 4.6, aggro: 6, size: .55, hit: 'any', air: 1, proj: 'laser', d: T('יורה לייזר, פוגע גם בדרונים', 'Laser shooter, hits drones too') },
  tank: { n: T('טנק', 'Tank'), cost: 5, hp: 2400, spd: 1.3, dmg: 170, rate: 1.5, range: 1.4, aggro: 0, size: 1.0, hit: 'build', d: T('ענק – הולך רק על מגדלים', 'Huge – only attacks towers') },
  drones: { n: T('דרונים', 'Drones'), cost: 3, hp: 170, spd: 3.1, dmg: 42, rate: .7, range: 3.2, aggro: 5.5, size: .38, fly: 1, n2: 3, hit: 'any', air: 1, proj: 'laser', d: T('3 דרונים מעופפים', '3 flying drones') },
  sniper: { n: T('צלף', 'Sniper'), cost: 4, hp: 420, spd: 1.8, dmg: 290, rate: 2.4, range: 6.2, aggro: 7, size: .55, hit: 'any', air: 1, proj: 'rail', d: T('טווח ענק, פגיעה חזקה', 'Huge range, heavy hit') },
  boom: { n: T('בום־בוט', 'Boom Bot'), cost: 2, hp: 320, spd: 3.7, dmg: 520, rate: .1, range: .9, aggro: 4, size: .45, hit: 'any', boom: 2.3, d: T('רץ ומתפוצץ!', 'Runs in and explodes!') },
  rocket: { n: T('מטח טילים', 'Rockets'), cost: 4, spell: 1, dmg: 420, rad: 2.6, d: T('פגיעה באזור', 'Area strike') },
  emp: { n: T('הלם EMP', 'EMP'), cost: 2, spell: 1, dmg: 70, rad: 3, stun: 2.6, d: T('משתק לכמה שניות', 'Stuns for a few seconds') },
  medic: { n: T('מדיק', 'Medic'), cost: 3, hp: 420, spd: 2.2, dmg: 0, heal: 70, rate: 1, range: 3.4, aggro: 6, size: .45, fly: 1, hit: 'heal', unlock: 150, d: T('מרחף ומתקן חברים', 'Hovers and repairs allies') },
  turret: { n: T('צריח לייזר', 'Laser Turret'), cost: 4, hp: 900, dmg: 75, rate: .55, range: 6, aggro: 6, size: .8, build: 1, life: 32, hit: 'any', air: 1, proj: 'laser', unlock: 300, d: T('מבנה הגנה ל־30 שניות', 'Defense for 30 seconds') },
  titan: { n: T('טיטאן', 'Titan'), cost: 7, hp: 3600, spd: 1.15, dmg: 330, rate: 1.7, range: 1.8, aggro: 4, size: 1.25, hit: 'any', splash: 1.8, unlock: 500, d: T('מכה ענקית ששוברת הכול', 'Giant smash that breaks everything') } };
const BASE = ['scout', 'blaster', 'tank', 'drones', 'sniper', 'boom', 'rocket', 'emp'];
const ARENAS = [{ t: 0, n: T('המפעל', 'The Factory'), ic: '🏭', floor: '#3a4050', floor2: '#323846', lane: '#ffd23a', riv: '#3ad8ff', bg: '#0a0f1c', light: 1 },
  { t: 200, n: T('מאדים', 'Mars Base'), ic: '🪐', floor: '#7a3a24', floor2: '#6a3220', lane: '#ffb070', riv: '#ff7a2a', bg: '#1a0a08', light: 1.05 },
  { t: 450, n: T('עיר הניאון', 'Neon City'), ic: '🌃', floor: '#141428', floor2: '#101022', lane: '#ff3aa8', riv: '#3affd8', bg: '#05030f', light: .8 },
  { t: 800, n: T('תחנת חלל', 'Space Station'), ic: '🛰️', floor: '#1e2a40', floor2: '#18233a', lane: '#8ae0ff', riv: '#c06aff', bg: '#02040c', light: .95 }];
const arenaOf = t => { let a = 0; ARENAS.forEach((q, i) => { if (t >= q.t) a = i; }); return a; };
const lvl = k => S.lv[k] || 1; const mult = k => 1 + (lvl(k) - 1) * .1;
const unlocked = k => !CARDS[k].unlock || S.tro >= CARDS[k].unlock;
const TEAMC = ['#2a8aff', '#ff3a4a'];

/* ================= MATERIALS / MODELS ================= */
const metal = std('#9aa6b8', { metalness: .85, roughness: .32 }), dark = std('#2a3040', { metalness: .7, roughness: .45 }), gold = std('#ffcf3a', { metalness: .9, roughness: .25 });
const teamM = TEAMC.map(c => new THREE.MeshStandardMaterial({ color: C(c), metalness: .5, roughness: .35, emissive: C(c), emissiveIntensity: .35 }));
const glowM = TEAMC.map(c => new THREE.MeshBasicMaterial({ color: C(c).multiplyScalar(2.2) }));
const B = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), Cy = (r1, r2, h, m, s = 14) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, s), m), Sp = (r, m, a = 16, b = 12) => new THREE.Mesh(new THREE.SphereGeometry(r, a, b), m);
const put = (p, o, x, y, z) => { o.position.set(x, y, z); p.add(o); return o; };
function legs(g, tm, h = .45, sp = .18) { const L = []; for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(s * sp, h, 0); g.add(piv); put(piv, B(.1, h, .12, dark), 0, -h / 2, 0); put(piv, B(.16, .07, .26, tm), 0, -h + .02, .05); L.push(piv); } return L; }
function model(k, team) { const g = new THREE.Group(), tm = teamM[team], gl = glowM[team]; const R = { g, legs: [], spin: [], head: null };
  if (k === 'scout') { R.legs = legs(g, tm, .35, .14); const b = put(g, Sp(.26, metal), 0, .55, 0); b.scale.set(1, .9, 1); put(g, B(.3, .09, .1, gl), 0, .6, .22); put(g, Cy(.02, .02, .25, dark, 6), .12, .82, 0); put(g, Sp(.05, gl), .12, .95, 0); R.head = b; put(g, B(.08, .08, .3, tm), -.27, .5, .08); put(g, B(.08, .08, .3, tm), .27, .5, .08); }
  if (k === 'blaster') { R.legs = legs(g, tm, .5, .2); put(g, B(.55, .5, .4, metal), 0, .78, 0); put(g, B(.42, .14, .05, gl), 0, .9, .21); put(g, B(.5, .1, .42, tm), 0, 1.06, 0); for (const s of [-1, 1]) { put(g, B(.14, .14, .5, dark), s * .36, .8, .15); put(g, Cy(.05, .05, .12, gl, 8), s * .36, .8, .42).rotation.x = Math.PI / 2; } }
  if (k === 'tank') { for (const s of [-1, 1]) { const tr = put(g, B(.32, .32, 1.5, dark), s * .55, .2, 0); for (let i = 0; i < 5; i++) put(g, Cy(.13, .13, .34, metal, 10), s * .55, .17, -.6 + i * .3).rotation.z = Math.PI / 2; } put(g, B(.9, .4, 1.3, metal), 0, .55, 0); put(g, B(.92, .08, 1.32, tm), 0, .78, 0); const tu = new THREE.Group(); tu.position.y = .95; g.add(tu); put(tu, Cy(.38, .42, .3, metal, 16), 0, 0, 0); const br = put(tu, Cy(.07, .09, 1.1, dark, 10), 0, 0, .6); br.rotation.x = Math.PI / 2; put(tu, Sp(.08, gl), 0, .18, .2); R.head = tu; }
  if (k === 'drones') { const b = put(g, Cy(.22, .26, .12, metal, 16), 0, 0, 0); put(g, Sp(.11, gl), 0, -.05, .12); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; put(g, B(.36, .04, .05, dark), Math.cos(a) * .2, .02, Math.sin(a) * .2).rotation.y = -a; const r = put(g, Cy(.14, .14, .015, new THREE.MeshBasicMaterial({ color: '#ccd', transparent: true, opacity: .35 }), 12), Math.cos(a) * .36, .06, Math.sin(a) * .36); R.spin.push(r); put(g, Cy(.03, .03, .05, tm, 6), Math.cos(a) * .36, .04, Math.sin(a) * .36); } }
  if (k === 'sniper') { R.legs = legs(g, tm, .7, .16); put(g, B(.34, .42, .3, metal), 0, .95, 0); put(g, Sp(.14, metal), 0, 1.25, 0); put(g, B(.22, .05, .05, gl), 0, 1.27, .12); const br = put(g, Cy(.035, .045, 1.3, dark, 8), .2, 1.05, .4); br.rotation.x = Math.PI / 2; put(g, Cy(.06, .06, .2, tm, 8), .2, 1.05, -.1).rotation.x = Math.PI / 2; }
  if (k === 'boom') { const b = put(g, Sp(.32, dark), 0, .42, 0); put(g, Cy(.33, .33, .08, tm, 18), 0, .42, 0); const f = put(g, Sp(.08, new THREE.MeshBasicMaterial({ color: '#ff3a1a' })), 0, .8, 0); R.fuse = f; put(g, Cy(.02, .02, .14, metal, 6), 0, .72, 0); for (const s of [-1, 1]) put(g, Cy(.14, .14, .08, metal, 12), s * .32, .14, 0).rotation.z = Math.PI / 2; R.head = b; }
  if (k === 'medic') { put(g, Sp(.28, std('#e8eef6', { metalness: .4, roughness: .3 })), 0, 0, 0); const cr = new THREE.MeshBasicMaterial({ color: '#3aff7a' }); put(g, B(.3, .09, .02, cr), 0, 0, .28); put(g, B(.09, .3, .02, cr), 0, 0, .28); put(g, Cy(.36, .36, .04, tm, 20), 0, 0, 0); }
  if (k === 'turret') { put(g, Cy(.55, .7, .5, dark, 8), 0, .25, 0); put(g, Cy(.5, .5, .08, tm, 8), 0, .52, 0); const h = new THREE.Group(); h.position.y = .85; g.add(h); put(h, B(.5, .4, .5, metal), 0, 0, 0); for (const s of [-1, 1]) put(h, Cy(.05, .05, .6, dark, 8), s * .13, 0, .4).rotation.x = Math.PI / 2; put(h, B(.3, .06, .02, gl), 0, .08, .26); R.head = h; }
  if (k === 'titan') { R.legs = legs(g, tm, .9, .35); for (const L of R.legs) L.scale.set(1.8, 1, 1.8); put(g, B(1.0, .8, .7, metal), 0, 1.3, 0); put(g, B(1.02, .14, .72, tm), 0, 1.68, 0); put(g, B(.4, .3, .35, metal), 0, 1.9, .05); put(g, B(.3, .07, .05, gl), 0, 1.93, .23); for (const s of [-1, 1]) { put(g, Sp(.26, tm), s * .66, 1.55, 0); put(g, B(.3, .8, .3, metal), s * .7, 1.05, .1); put(g, B(.42, .38, .42, dark), s * .7, .62, .15); } }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; }); return R; }
function towerModel(core, team) { const g = new THREE.Group(); const tm = teamM[team], gl = glowM[team]; const s = core ? 1.35 : 1;
  put(g, Cy(1.2 * s, 1.45 * s, .5, dark, 8), 0, .25, 0); put(g, Cy(1.0 * s, 1.15 * s, 1.6 * s, metal, 8), 0, 1.3 * s, 0); put(g, Cy(1.08 * s, 1.08 * s, .14, tm, 8), 0, 2.05 * s, 0);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; put(g, B(.12, 1.4 * s, .08, gl), Math.cos(a) * 1.02 * s, 1.3 * s, Math.sin(a) * 1.02 * s).rotation.y = -a; }
  const head = new THREE.Group(); head.position.y = 2.3 * s; g.add(head); put(head, Cy(.55 * s, .65 * s, .45, metal, 12), 0, 0, 0); const orb = put(head, Sp(.38 * s, gl), 0, .45 * s, 0); const br = put(head, Cy(.1, .12, 1.1 * s, dark, 10), 0, .1, .7 * s); br.rotation.x = Math.PI / 2;
  if (core) { put(g, Cy(.3, .5, 1.2, metal, 8), 0, 3.7, 0); put(g, Sp(.5, gl), 0, 4.4, 0); }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return { g, head, orb }; }

/* ================= ARENA ================= */
const world = new THREE.Group(); scene.add(world);
const hemi = new THREE.HemisphereLight('#cfe0ff', '#1a2030', .7); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e8', 2.2); sun.position.set(-8, 26, 12); sun.castShadow = renderer.shadowMap.enabled; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 20, bottom: -20, near: 2, far: 70 }); sun.shadow.bias = -.0005; scene.add(sun);
let rivM = null, rivT = null;
function floorTex(a) { const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d'); for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? a.floor : a.floor2; x.fillRect(i * 64, j * 64, 64, 64); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; x.strokeRect(i * 64 + 1, j * 64 + 1, 62, 62); x.fillStyle = 'rgba(255,255,255,.06)'; for (const [u, v] of [[6, 6], [56, 6], [6, 56], [56, 56]]) { x.beginPath(); x.arc(i * 64 + u, j * 64 + v, 2.5, 0, TAU); x.fill(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(HX * 2 / 4, HZ * 2 / 4); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function buildArena(ai) { const a = ARENAS[ai]; world.clear(); scene.background = C(a.bg); scene.fog = new THREE.Fog(a.bg, 40, 90); hemi.intensity = .7 * a.light; sun.intensity = 2.2 * a.light;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2).rotateX(-Math.PI / 2), std('#fff', { map: floorTex(a), metalness: .3, roughness: .6 })); fl.receiveShadow = true; world.add(fl);
  const lm = new THREE.MeshBasicMaterial({ color: C(a.lane).multiplyScalar(1.3), transparent: true, opacity: .55 }); for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(.12, HZ * 2 - 2).rotateX(-Math.PI / 2), lm); l.position.set(s * BX, .01, 0); world.add(l); }
  // half-line markers
  for (const s of [-1, 1]) { const ln = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, .08).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: TEAMC[s > 0 ? 0 : 1], transparent: true, opacity: .5 })); ln.position.set(0, .012, s * (RIV + .3)); world.add(ln); }
  // energy river
  const rc = document.createElement('canvas'); rc.width = 64; rc.height = 256; const rx = rc.getContext('2d'); const gr = rx.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(255,255,255,.0)'); gr.addColorStop(.5, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); for (let i = 0; i < 256; i += 32) { rx.fillStyle = gr; rx.fillRect(0, i, 64, 10); } rivT = new THREE.CanvasTexture(rc); rivT.wrapS = rivT.wrapT = THREE.RepeatWrapping; rivT.repeat.set(1, 3);
  const pit = new THREE.Mesh(new THREE.BoxGeometry(HX * 2, .6, RIV * 2), std('#05060a')); pit.position.y = -.29; world.add(pit);
  rivM = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, RIV * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: C(a.riv).multiplyScalar(1.6), map: rivT, transparent: true, opacity: .85 })); rivM.position.y = .02; world.add(rivM);
  for (const s of [-1, 1]) { const br = new THREE.Group(); br.position.set(s * BX, 0, 0); put(br, B(2.6, .2, RIV * 2 + .8, metal), 0, .06, 0); for (const q of [-1, 1]) { put(br, B(.12, .4, RIV * 2 + .8, std(a.lane, { emissive: C(a.lane), emissiveIntensity: .6 })), q * 1.3, .3, 0); } br.traverse(m => { if (m.isMesh) m.receiveShadow = true; }); world.add(br); }
  // walls + decor
  const wm = std('#2a3244', { metalness: .6, roughness: .5 }); for (const s of [-1, 1]) { put(world, B(.5, 1, HZ * 2 + 1, wm), s * (HX + .25), .5, 0); put(world, B(HX * 2 + 1, 1, .5, wm), 0, .5, s * (HZ + .25)); put(world, B(.1, .1, HZ * 2, new THREE.MeshBasicMaterial({ color: C(a.lane).multiplyScalar(1.4) })), s * (HX + .02), 1.02, 0); }
  const r = rng(ai + 3); const decoM = [std('#4a5468', { metalness: .6, roughness: .5 }), std('#3a4458', { metalness: .6, roughness: .5 })]; for (let k = 0; k < 40; k++) { const s = r() < .5 ? -1 : 1; const x = s * (HX + 2 + r() * 10), z = rnd(-HZ - 6, HZ + 6); const h = 1 + r() * 6; const b = B(1.5 + r() * 3, h, 1.5 + r() * 3, decoM[k % 2]); b.position.set(x, h / 2, z); world.add(b); if (r() < .5) { const l = B(.3, .3, .3, new THREE.MeshBasicMaterial({ color: C(a.lane).multiplyScalar(2) })); l.position.set(x, h + .2, z); world.add(l); } }
  if (ai >= 2) for (let k = 0; k < 120; k++) { const st = Sp(.05 + Math.random() * .08, new THREE.MeshBasicMaterial({ color: '#fff' }), 4, 3); st.position.set(rnd(-60, 60), rnd(-20, -5), rnd(-80, 20)); world.add(st); } }

/* ================= ENTITIES ================= */
let units = [], towers = [], shots = [], G = null, state = 'title', last = performance.now(), sel = [null, null];
const barG = new THREE.PlaneGeometry(1, .12); const barBg = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .6, depthTest: false }); const barM = TEAMC.map(c => new THREE.MeshBasicMaterial({ color: c, depthTest: false }));
function hpBar(o, w, y) { const g = new THREE.Group(); const bg = new THREE.Mesh(barG, barBg); bg.scale.x = w; bg.renderOrder = 10; const fg = new THREE.Mesh(barG, barM[o.team]); fg.scale.x = w; fg.position.z = .001; fg.renderOrder = 11; g.add(bg, fg); g.position.y = y; o.obj.add(g); o.bar = { g, fg, w }; g.visible = false; }
function mkTower(team, x, z, core) { const m = towerModel(core, team); m.g.position.set(x, 0, z); scene.add(m.g); const t = { team, x, z, core, hp: core ? 3000 : 1500, max: core ? 3000 : 1500, dmg: core ? 110 : 90, rate: .8, range: core ? 7.6 : 7.2, cd: 0, r: core ? 1.6 : 1.25, obj: m.g, m, build: 1, tower: 1, dead: 0, active: !core };
  hpBar(t, core ? 2.4 : 1.9, core ? 5.4 : 3.6); t.bar.g.visible = true; towers.push(t); return t; }
function spawn(k, team, x, z) { const D = CARDS[k]; const n = D.n2 || 1; const mu = team === 0 || G.mode === '2p' ? mult(k) : cpuMult(); const out = [];
  for (let i = 0; i < n; i++) { const R = model(k, team); const ox = n > 1 ? Math.cos(i / n * TAU) * .6 : 0, oz = n > 1 ? Math.sin(i / n * TAU) * .6 : 0; const u = { k, D, team, x: clamp(x + ox, -HX + .5, HX - .5), z: z + oz, y: D.fly ? 2 : 0, hp: D.hp * mu, max: D.hp * mu, dmg: D.dmg * mu, cd: .6 + Math.random() * .3, tgt: null, think: 0, stun: 0, dead: 0, R, obj: R.g, born: 0, life: D.life || 0, ph: Math.random() * 6, face: team === 0 ? Math.PI : 0, fly: !!D.fly, build: !!D.build, r: D.size * 1.3 };
    R.g.position.set(u.x, u.y, u.z); R.g.rotation.y = u.face; R.g.scale.setScalar(.01); scene.add(R.g); hpBar(u, Math.max(.7, D.size * 1.3), (k === 'titan' ? 2.4 : k === 'tank' ? 1.5 : D.fly ? .6 : 1.3) / (1)); units.push(u); out.push(u); }
  for (let q = 0; q < 16; q++) FX.emit(V3(x + rnd(-.6, .6), .2, z + rnd(-.6, .6)), V3(rnd(-1, 1), rnd(1, 3), rnd(-1, 1)), team ? [2.4, .6, .6] : [.6, 1.4, 2.6], .12, .6, 3);
  A.tone(team ? 300 : 420, .12, 'square', .04); A.tone(team ? 600 : 840, .14, 'triangle', .04, .06); return out; }
const cpuMult = () => 1 + (({ easy: 0, normal: 1, hard: 2 })[S.diff] + arenaOf(S.tro)) * .07;
const alive = () => units.filter(u => !u.dead);
function enemiesOf(team) { return [...units.filter(u => !u.dead && u.team !== team), ...towers.filter(t => !t.dead && t.team !== team)]; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function laneTarget(u) { const ts = towers.filter(t => !t.dead && t.team !== u.team); const side = u.x < 0 ? -1 : 1; const st = ts.find(t => !t.core && Math.sign(t.x) === side); return st || ts.find(t => t.core) || ts[0]; }
function pickTarget(u) { const D = u.D; if (D.hit === 'heal') { let best = null, bd = 1e9; for (const o of units) if (!o.dead && o.team === u.team && o !== u && o.hp < o.max) { const d = dist(u, o); if (d < bd) { bd = d; best = o; } } return best || units.find(o => !o.dead && o.team === u.team && o !== u && !o.build) || null; }
  if (D.hit === 'build') return laneTarget(u);
  let best = null, bd = 1e9; for (const o of enemiesOf(u.team)) { if (o.fly && !D.air && !o.tower) continue; const d = dist(u, o) - (o.r || .4); if (o.tower ? d < Math.max(D.range + .5, 2.5) || false : d < (D.aggro || 5) && d < bd) { if (d < bd) { bd = d; best = o; } } }
  if (!best && u.build) { for (const o of enemiesOf(u.team)) { if (o.tower) continue; if (o.fly && !D.air) continue; const d = dist(u, o); if (d < D.range && d < bd) { bd = d; best = o; } } return best; }
  return best || laneTarget(u); }
function damage(o, v, src) { if (o.dead) return; o.hp -= v; if (o.bar) o.bar.g.visible = true; o.hitT = .12;
  if (o.hp <= 0) { o.dead = 1; o.hp = 0; boomFX(V3(o.x, (o.y || 0) + .6, o.z), o.tower ? 3 : o.k === 'tank' || o.k === 'titan' ? 1.8 : 1, o.team);
    if (o.tower) { G.crowns[1 - o.team] += o.core ? 3 : 1; if (o.core) G.crowns[1 - o.team] = 3; updTop(); bigText(o.core ? '💥 ' + T('הליבה הושמדה!', 'CORE DESTROYED!') : '👑 ' + T('מגדל נפל!', 'Tower down!'), '', 1600); shake = 1; buzz([60, 40, 60]); const core = towers.find(t => t.core && t.team === o.team); if (core) core.active = true; o.m.g.visible = false; const ruin = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, .5, 8), std('#2a2a30', { roughness: .9 })); ruin.position.set(o.x, .25, o.z); scene.add(ruin); G.ruins.push(ruin); if (o.core) endMatch(); }
    else { scene.remove(o.obj); } } }
function boomFX(p, s, team) { for (let i = 0; i < 30 * s; i++) FX.emit(p, V3(rnd(-1, 1), rnd(.5, 2), rnd(-1, 1)).multiplyScalar(4 * s), [[3, 1.6, .4], [3, 2.6, 1], [2, .8, .2]][i % 3], .14 * s, .7, 6); for (let i = 0; i < 10 * s; i++) SM.emit(p, V3(rnd(-1, 1), rnd(.5, 1.5), rnd(-1, 1)), [.25, .25, .3], .5 * s, 1.4, -1, .5);
  A.noise(.5 * s, 'lowpass', 500, 1, .18 * Math.min(1.5, s)); A.tone(80, .4, 'sine', .14, 0, 40); }
function beam(a, b, col, w = .06, life = .1) { const d = b.clone().sub(a); const L = d.length(); const m = new THREE.Mesh(new THREE.CylinderGeometry(w, w, L, 6), new THREE.MeshBasicMaterial({ color: C(col).multiplyScalar(2.4), transparent: true })); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); scene.add(m); shots.push({ m, life, max: life }); }
function attack(u, o) { const D = u.D; const from = V3(u.x, (u.y || 0) + (u.tower ? (u.core ? 3.4 : 2.6) : D.size * 1.4 + .3), u.z), to = V3(o.x, (o.y || 0) + (o.tower ? 2 : .6), o.z);
  if (u.tower) { beam(from, to, TEAMC[u.team], .09, .12); damage(o, u.dmg, u); A.tone(u.team ? 700 : 900, .07, 'square', .025, 0, 300); return; }
  if (D.hit === 'heal') { beam(from, to, '#3aff7a', .05, .2); o.hp = Math.min(o.max, o.hp + D.heal * mult(u.k)); for (let i = 0; i < 4; i++) FX.emit(to, V3(rnd(-.5, .5), 1.5, rnd(-.5, .5)), [.4, 2.6, .8], .1, .6, 0); return; }
  if (D.boom) { damage(u, 99999); aoe(u.x, u.z, D.boom, u.dmg, u.team, false); boomFX(V3(u.x, .6, u.z), 1.6, u.team); shake = Math.max(shake, .6); return; }
  if (D.proj === 'laser') { beam(from, to, TEAMC[u.team], .045, .08); A.tone(1200 + Math.random() * 300, .05, 'sawtooth', .02, 0, 600); }
  else if (D.proj === 'rail') { beam(from, to, '#ffffff', .07, .25); beam(from, to, TEAMC[u.team], .16, .18); A.noise(.15, 'highpass', 2000, 1, .08); A.tone(220, .25, 'sawtooth', .05, 0, 80); }
  else { A.noise(.08, 'lowpass', 700, 1, .1); for (let i = 0; i < 6; i++) FX.emit(to, V3(rnd(-2, 2), rnd(1, 3), rnd(-2, 2)), [3, 2.2, 1], .07, .3, 6); u.punch = .2; }
  if (D.splash) { aoe(o.x, o.z, D.splash, u.dmg, u.team, true); shake = Math.max(shake, .35); } else damage(o, u.dmg, u);
  for (let i = 0; i < 5; i++) FX.emit(to, V3(rnd(-2, 2), rnd(.5, 2.5), rnd(-2, 2)), [3, 2.4, 1.2], .06, .25, 4); }
function aoe(x, z, r, dmg, team, ground, stun = 0, towerMul = .4) { for (const o of enemiesOf(team)) { const d = Math.hypot(o.x - x, o.z - z) - (o.r || .3) * .5; if (d < r) { if (stun && !o.tower) o.stun = Math.max(o.stun, stun); damage(o, o.tower ? dmg * towerMul : dmg); } } }

/* ================= SPELLS ================= */
const pend = [];
function castSpell(k, team, x, z) { const D = CARDS[k]; const mu = team === 0 || G.mode === '2p' ? mult(k) : cpuMult();
  if (k === 'rocket') { for (let i = 0; i < 5; i++) { const tx = x + rnd(-1, 1) * D.rad * .6, tz = z + rnd(-1, 1) * D.rad * .6; const m = new THREE.Group(); put(m, Cy(.08, .12, .7, metal, 8), 0, 0, 0); put(m, Sp(.12, glowM[team]), 0, -.35, 0); const sy = 18 + i * 1.5; m.position.set(tx + (team ? 4 : -4), sy, tz + (team ? -6 : 6)); scene.add(m); pend.push({ t: .7 + i * .08, m, from: m.position.clone(), to: V3(tx, 0, tz), dur: .7 + i * .08, cb: i === 4 ? () => { aoe(x, z, D.rad, D.dmg * mu, team, true); boomFX(V3(x, .5, z), 2, team); shake = .7; } : () => boomFX(V3(tx, .4, tz), .8, team) }); } A.noise(1, 'bandpass', 900, 1, .1, 0, 300); }
  if (k === 'emp') { aoe(x, z, D.rad, D.dmg * mu, team, true, D.stun, 1); const ring = new THREE.Mesh(new THREE.RingGeometry(.2, .5, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#8ae0ff', transparent: true, side: THREE.DoubleSide })); ring.position.set(x, .3, z); scene.add(ring); pend.push({ t: .5, dur: .5, ring, r: D.rad }); for (let i = 0; i < 40; i++) FX.emit(V3(x, .5, z), V3(rnd(-1, 1), rnd(0, .5), rnd(-1, 1)).normalize().multiplyScalar(7), [1.2, 2.4, 3], .08, .4, 0); A.tone(140, .5, 'square', .06, 0, 1800); A.noise(.4, 'highpass', 3000, 1, .08); } }

/* ================= MATCH ================= */
const P = [0, 1].map(() => ({ en: 5, deck: [], hand: [], next: null }));
function newDeck(team) { let d = team === 1 && G.mode === 'cpu' ? [...BASE, ...['medic', 'turret', 'titan'].filter(k => S.tro >= CARDS[k].unlock - 100)] : [...BASE, ...['medic', 'turret', 'titan'].filter(unlocked)]; d = d.sort(() => Math.random() - .5); return d; }
function drawCard(p) { const k = p.deck.shift(); p.deck.push(k); return k; }
let shake = 0;
function start() { A.ac(); clearMatch(); const ai = arenaOf(S.tro); buildArena(ai); G = { mode: S.mode, t: 180, over: 0, crowns: [0, 0], ot: 0, ruins: [], cpuT: 2, x2: false };
  for (const [team, s] of [[0, 1], [1, -1]]) { mkTower(team, -BX, s * 11, 0); mkTower(team, BX, s * 11, 0); mkTower(team, 0, s * 14, 1); }
  for (const t of [0, 1]) { const p = P[t]; p.en = 5; p.deck = newDeck(t); p.hand = [drawCard(p), drawCard(p), drawCard(p), drawCard(p)]; p.next = drawCard(p); } sel = [null, null];
  $('title').hidden = true; $('endS').hidden = true; $('top').hidden = false; $('quit').hidden = false; $('h0').hidden = false; $('h1').hidden = G.mode !== '2p'; renderHands(); updTop(); fit(); state = 'play';
  A.startMusic({ chords: [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 43, 47]], bpm: 128, kick: true, lead: true, vol: .45 }); bigText('⚔️ ' + T('קרב!', 'FIGHT!'), ARENAS[ai].n, 1500);
  if (!S.tut) { S.tut = 1; S.save(); setTimeout(() => tip(T('גררו קלף לחצי שלכם כדי לשלוח רובוט! המטרה: להפיל את המגדלים האדומים 👑', 'Drag a card onto your half to deploy a robot! Goal: knock down the red towers 👑')), 1600); } }
function clearMatch() { for (const u of units) scene.remove(u.obj); for (const t of towers) scene.remove(t.obj); for (const s of shots) scene.remove(s.m); for (const p of pend) { p.m && scene.remove(p.m); p.ring && scene.remove(p.ring); } if (G) for (const r of G.ruins) scene.remove(r); units = []; towers = []; shots = []; pend.length = 0; }
function endMatch() { if (G.over) return; G.over = 1; state = 'end'; const c = G.crowns; const w = c[0] > c[1] ? 0 : c[1] > c[0] ? 1 : -1; A.stopMusic();
  setTimeout(() => { let msg = ''; if (G.mode === 'cpu') { const dt = w === 0 ? 30 : w === 1 ? -15 : 5; const gears = w === 0 ? 40 + c[0] * 10 : w < 0 ? 20 : 10; const before = arenaOf(S.tro); S.tro = Math.max(0, S.tro + dt); S.gears += gears; if (w === 0) S.wins++; S.save(); const after = arenaOf(S.tro);
      msg = `🏆 ${dt >= 0 ? '+' : ''}${dt} · ⚙️ +${gears}` + (after > before ? `<br>🎉 ${T('זירה חדשה נפתחה:', 'New arena unlocked:')} ${ARENAS[after].ic} ${ARENAS[after].n}!` : '');
      const nu = ['medic', 'turret', 'titan'].find(k => CARDS[k].unlock > S.tro - dt && CARDS[k].unlock <= S.tro); if (nu) msg += `<br>🆕 ${T('קלף חדש:', 'New card:')} ${CARDS[nu].n}!`; }
    $('eT').textContent = w < 0 ? T('🤝 תיקו!', '🤝 Draw!') : G.mode === 'cpu' ? (w === 0 ? T('🏆 ניצחון!', '🏆 Victory!') : T('😬 הפסד', '😬 Defeat')) : (w === 0 ? T('🔵 הכחולים ניצחו!', '🔵 Blue wins!') : T('🔴 האדומים ניצחו!', '🔴 Red wins!'));
    $('eC').innerHTML = `<span style="color:#5ab8ff">${'👑'.repeat(c[0]) || '–'}</span> : <span style="color:#ff6a7a">${'👑'.repeat(c[1]) || '–'}</span>`; $('eP').innerHTML = msg; $('endS').hidden = false; $('h0').hidden = $('h1').hidden = true;
    if (w === 0 || G.mode === '2p') { for (let i = 0; i < 6; i++) setTimeout(() => FX.burst(V3(rnd(-5, 5), 4, rnd(-8, 8)), 40, CONFETTI, 6, .14, 1.6, 6), i * 200); A.voice('yay', 1.2); } else A.voice('aww', 1); }, 1500); }
function updTop() { $('cr0').textContent = '👑 ' + G.crowns[0]; $('cr1').textContent = G.crowns[1] + ' 👑'; const t = Math.max(0, Math.ceil(G.t)); $('tm').textContent = (G.ot ? '⏱️ ' : '') + Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); $('tm').classList.toggle('x2', G.x2); }
let bigT = 0; function bigText(a, b, ms = 1800) { const el = $('big'); el.innerHTML = a + (b ? `<small>${b}</small>` : ''); el.className = ''; void el.offsetWidth; el.className = 'on'; clearTimeout(bigT); bigT = setTimeout(() => el.className = '', ms); }
let tipT = 0; function tip(s) { $('tip').textContent = s; clearTimeout(tipT); tipT = setTimeout(() => $('tip').textContent = '', 5000); }

/* ================= HAND UI ================= */
const ICON = {}; const SPELLIC = { rocket: '🚀', emp: '⚡' };
function cardHTML(k, i, p, nx) { const D = CARDS[k]; const poor = !nx && p.en < D.cost; return `<div class="cd${nx ? ' nx' : ''}${poor ? ' poor' : ''}${!nx && sel[P.indexOf(p)] === i ? ' sel' : ''}" data-i="${nx ? '' : i}">${ICON[k] ? `<img src="${ICON[k]}">` : `<span class="ic">${SPELLIC[k] || '🤖'}</span>`}<i>${D.cost}</i><b>${D.n}</b>${P.indexOf(p) === 0 || G && G.mode === '2p' ? `<span class="lv">L${lvl(k)}</span>` : ''}</div>`; }
function renderHands() { for (const t of [0, 1]) { const p = P[t]; $('cards' + t).innerHTML = p.hand.map((k, i) => cardHTML(k, i, p)).join('') + cardHTML(p.next, -1, p, 1); } updEnergy(); }
function updEnergy() { for (const t of [0, 1]) { const p = P[t]; const el = $('en' + t); el.querySelector('i').style.width = (p.en / 10 * 100) + '%'; el.querySelector('span').textContent = '⚡ ' + Math.floor(p.en); if (!el.querySelector('.tk')) for (let k = 1; k < 10; k++) { const d = document.createElement('b'); d.className = 'tk'; d.style.left = k * 10 + '%'; el.appendChild(d); }
    $('cards' + t).querySelectorAll('.cd[data-i]').forEach(c => { const i = c.dataset.i; if (i === '') return; c.classList.toggle('poor', p.en < CARDS[p.hand[+i]].cost); }); } }
function play(team, i, x, z) { const p = P[team]; const k = p.hand[i]; const D = CARDS[k]; if (p.en < D.cost) { if (team === 0 || G.mode === '2p') toast(T('אין מספיק אנרגיה ⚡', 'Not enough energy ⚡'), 900); return false; }
  const own = team === 0 ? z > RIV + .4 : z < -RIV - .4; if (!D.spell && !own) return false; x = clamp(x, -HX + .6, HX - .6); z = clamp(z, -HZ + 1, HZ - 1);
  p.en -= D.cost; p.hand[i] = p.next; p.next = drawCard(p); if (D.spell) castSpell(k, team, x, z); else spawn(k, team, x, z); sel[team] = null; renderHands(); return true; }
// drag from cards
const ray = new THREE.Raycaster(), nd = new THREE.Vector2(), plane = new THREE.Plane(V3(0, 1, 0), 0);
function fieldAt(cx, cy) { nd.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(nd, camera); const p = V3(); return ray.ray.intersectPlane(plane, p) ? p : null; }
let drag = null;
for (const t of [0, 1]) { $('cards' + t).addEventListener('pointerdown', e => { const c = e.target.closest('.cd[data-i]'); if (!c || c.dataset.i === '' || state !== 'play') return; A.ac(); const i = +c.dataset.i; sel[t] = sel[t] === i ? null : i; drag = { t, i, id: e.pointerId, moved: false }; renderHands(); e.preventDefault(); }); }
addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; drag.moved = true; const g = $('ghost'); const k = P[drag.t].hand[drag.i]; g.hidden = false; g.style.left = e.clientX + 'px'; g.style.top = e.clientY + 'px'; g.textContent = SPELLIC[k] || '🤖'; const f = fieldAt(e.clientX, e.clientY); const ok = f && (CARDS[k].spell || (drag.t === 0 ? f.z > RIV + .4 : f.z < -RIV - .4)); g.classList.toggle('bad', !ok); });
addEventListener('pointerup', e => { if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null; $('ghost').hidden = true; if (!d.moved) return; const f = fieldAt(e.clientX, e.clientY); if (f && Math.abs(f.x) < HX && Math.abs(f.z) < HZ) play(d.t, d.i, f.x, f.z); });
$('stage').addEventListener('pointerdown', e => { if (state !== 'play') return; const f = fieldAt(e.clientX, e.clientY); if (!f) return; const team = G.mode === '2p' && f.z < 0 && sel[1] != null ? 1 : sel[0] != null ? 0 : sel[1] != null ? 1 : -1; if (team < 0) { tip(T('בחרו קלף למטה ואז הקישו על המגרש 👇', 'Pick a card below, then tap the field 👇')); return; } if (!play(team, sel[team], f.x, f.z) && !CARDS[P[team].hand[sel[team]]].spell) tip(T('אפשר לשלוח רובוטים רק לחצי שלכם', 'Robots can only be deployed on your half')); });

/* ================= CPU ================= */
function cpu(dt) { const p = P[1]; G.cpuT -= dt; if (G.cpuT > 0) return; const L = ({ easy: [2.6, .5], normal: [1.6, .8], hard: [1.0, 1] })[S.diff]; G.cpuT = L[0] * rnd(.7, 1.3);
  const threats = units.filter(u => !u.dead && u.team === 0 && u.z < 4); const cards = p.hand.map((k, i) => [k, i]).filter(([k]) => CARDS[k].cost <= p.en);
  if (!cards.length) return;
  if (threats.length && Math.random() < L[1]) { const t = threats.sort((a, b) => a.z - b.z)[0]; const grp = threats.filter(u => dist(u, t) < 2.6).length;
    const spell = cards.find(([k]) => k === 'rocket' && grp >= 2) || cards.find(([k]) => k === 'emp' && grp >= 2); if (spell) { play(1, spell[1], t.x, t.z + 1); return; }
    const def = cards.filter(([k]) => !CARDS[k].spell && CARDS[k].hit !== 'build').sort((a, b) => (t.fly && !CARDS[b[0]].air ? -1 : 0) || CARDS[b[0]].cost - CARDS[a[0]].cost)[0]; if (def) { play(1, def[1], clamp(t.x + rnd(-1, 1), -HX + 1, HX - 1), Math.min(-RIV - 1, t.z - 3)); return; } }
  if (p.en >= 7 || G.t < 60 && p.en >= 4 || Math.random() < .25) { const att = cards.filter(([k]) => !CARDS[k].spell).sort(() => Math.random() - .5)[0]; if (att) { const lane = Math.random() < .5 ? -BX : BX; const weak = towers.filter(t => !t.dead && t.team === 0 && !t.core).sort((a, b) => a.hp - b.hp)[0]; const x = weak ? weak.x : lane; play(1, att[1], x + rnd(-1, 1), CARDS[att[0]].hit === 'build' ? -RIV - 1.2 : rnd(-12, -6)); } } }

/* ================= LOOP ================= */
function step(dt) { if (!G || G.over) return; G.t -= dt; const was = G.x2; G.x2 = G.t < 60; if (G.x2 && !was) { bigText('⚡ ' + T('אנרגיה כפולה!', 'DOUBLE ENERGY!'), '', 1500); A.tone(880, .3, 'square', .05); }
  if (G.t <= 0) { if (!G.ot && G.crowns[0] === G.crowns[1]) { G.ot = 1; G.t = 60; bigText('⏱️ ' + T('הארכה!', 'OVERTIME!'), T('הכתר הבא מנצח', 'Next crown wins'), 1600); } else { G.t = 0; updTop(); endMatch(); return; } }
  if (G.ot && G.crowns[0] !== G.crowns[1]) { endMatch(); return; }
  if (Math.floor(G.t * 2) !== Math.floor((G.t + dt) * 2)) updTop();
  const rate = (G.x2 ? 2 : 1) / 2.8; for (const t of [0, 1]) P[t].en = Math.min(10, P[t].en + dt * rate); updEnergyThrottled(dt);
  if (G.mode === 'cpu') cpu(dt);
  for (const u of units) { if (u.dead) continue; const D = u.D; u.born += dt; const s = Math.min(1, u.born * 4) * US; u.R.g.scale.setScalar(s);
    if (u.life) { u.life -= dt; u.hp -= u.max / D.life * dt; if (u.hp <= 0) { damage(u, 1); continue; } }
    if (u.stun > 0) { u.stun -= dt; if (Math.random() < .3) FX.emit(V3(u.x, (u.y || 0) + 1, u.z), V3(rnd(-1, 1), 1, rnd(-1, 1)), [1, 2, 3], .06, .3, 0); continue; }
    u.think -= dt; if (u.think <= 0 || !u.tgt || u.tgt.dead) { u.think = .35; u.tgt = pickTarget(u); }
    const o = u.tgt; u.cd -= dt; if (!o) continue; const d = dist(u, o) - (o.r || .3) - u.r * .5;
    if (d <= D.range) { const ang = Math.atan2(o.x - u.x, o.z - u.z); u.face = ang; if (u.cd <= 0) { u.cd = D.rate; attack(u, o); } u.moving = false; }
    else if (!u.build) { let tx = o.x, tz = o.z; if (!u.fly) { const myS = Math.sign(u.z) || (u.team ? -1 : 1), oS = Math.sign(o.z) || myS; const inMid = Math.abs(u.z) < RIV + .6; const bx = Math.abs(u.x - BX) < Math.abs(u.x + BX) ? BX : -BX; const onBridge = inMid && Math.abs(u.x - bx) < 1.1;
        if (myS !== oS || inMid) { if (!onBridge && !inMid) { tx = bx; tz = myS * (RIV + .5); } else { tx = bx; tz = oS * (RIV + 1.0); } } }
      const dx = tx - u.x, dz = tz - u.z, dl = Math.hypot(dx, dz) || 1; const sp = D.spd * dt; u.x += dx / dl * sp; u.z += dz / dl * sp; u.face = Math.atan2(dx, dz); u.moving = true; } }
  // separation
  const al = alive(); for (let i = 0; i < al.length; i++) for (let j = i + 1; j < al.length; j++) { const a = al[i], b = al[j]; if (a.fly !== b.fly || a.build || b.build) continue; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = (a.r + b.r) * .6; if (d < m && d > .001) { const p = (m - d) / 2 / d; a.x -= dx * p; a.z -= dz * p; b.x += dx * p; b.z += dz * p; } }
  for (const u of al) { u.x = clamp(u.x, -HX + .4, HX - .4); u.z = clamp(u.z, -HZ + .4, HZ - .4); if (!u.fly && !u.build && Math.abs(u.z) < RIV && Math.abs(Math.abs(u.x) - BX) > 1.25) u.z = Math.sign(u.z || 1) * RIV; }
  for (const t of towers) { if (t.dead) continue; if (!t.active) { if (t.hp < t.max) t.active = true; else continue; } t.cd -= dt; let best = null, bd = 1e9; for (const o of units) if (!o.dead && o.team !== t.team) { const d = dist(t, o); if (d < t.range && d < bd) { bd = d; best = o; } } if (best) { t.m.head.rotation.y = lerp(t.m.head.rotation.y, Math.atan2(best.x - t.x, best.z - t.z), Math.min(1, dt * 10)); if (t.cd <= 0) { t.cd = t.rate; attack(t, best); } } }
  units = units.filter(u => !u.dead || (scene.remove(u.obj), false)); }
let enT = 0; function updEnergyThrottled(dt) { enT -= dt; if (enT <= 0) { enT = .1; updEnergy(); } }
function animate(dt, t) { for (const u of units) { const R = u.R; R.g.position.set(u.x, u.fly ? 2 + Math.sin(t * 3 + u.ph) * .15 : 0, u.z); const yaw = u.face; let dyaw = yaw - R.g.rotation.y; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw)); R.g.rotation.y += dyaw * Math.min(1, dt * 10);
    const w = u.moving && !u.stun ? Math.sin(t * 12 * (u.D.spd || 1) / 2 + u.ph) : 0; R.legs.forEach((l, i) => l.rotation.x = (i ? w : -w) * .6); R.spin.forEach(s => s.rotation.y += dt * 40); if (R.fuse) R.fuse.visible = Math.sin(t * 20) > 0;
    if (u.punch > 0) { u.punch -= dt; R.g.position.x += Math.sin(u.face) * u.punch; R.g.position.z += Math.cos(u.face) * u.punch; }
    if (u.bar) { u.bar.fg.scale.x = u.bar.w * Math.max(0, u.hp / u.max); u.bar.fg.position.x = -u.bar.w * (1 - u.hp / u.max) / 2; u.bar.g.quaternion.copy(camera.quaternion).premultiply(R.g.quaternion.clone().invert()); } }
  for (const tw of towers) { if (tw.dead) continue; tw.bar.fg.scale.x = tw.bar.w * tw.hp / tw.max; tw.bar.fg.position.x = -tw.bar.w * (1 - tw.hp / tw.max) / 2; tw.bar.g.quaternion.copy(camera.quaternion); tw.m.orb.scale.setScalar(1 + Math.sin(t * 3 + tw.x) * .08); if (!tw.active && tw.core) tw.m.orb.material = glowM[tw.team]; }
  for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; s.life -= dt; s.m.material.opacity = Math.max(0, s.life / s.max); if (s.life <= 0) { scene.remove(s.m); s.m.geometry.dispose(); shots.splice(i, 1); } }
  for (let i = pend.length - 1; i >= 0; i--) { const q = pend[i]; q.t -= dt; const k = 1 - Math.max(0, q.t) / q.dur; if (q.m) { q.m.position.lerpVectors(q.from, q.to, k * k); q.m.lookAt(q.to); q.m.rotateX(Math.PI / 2); if (Math.random() < .6) SM.emit(q.m.position, V3(0, .5, 0), [.6, .6, .65], .3, .6, -1, .4); }
    if (q.ring) { q.ring.scale.setScalar(1 + k * q.r * 2); q.ring.material.opacity = 1 - k; }
    if (q.t <= 0) { if (q.m) scene.remove(q.m); if (q.ring) scene.remove(q.ring); q.cb && q.cb(); pend.splice(i, 1); } }
  if (rivT) rivT.offset.y -= dt * .4; }
let camBase = V3(), camLook = V3();
function fit() { const port = innerHeight > innerWidth, asp = innerWidth / innerHeight; const two = G && G.mode === '2p' && state !== 'title';
  if (two) { camera.fov = 50; camera.position.set(0, 44 / Math.min(1, asp * 1.9), .01); camLook.set(0, 0, 0); }
  else if (port) { camera.fov = 46; const need = (HX + 1.2) / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * asp); camera.position.set(0, need * .86, need * .52 + 4); camLook.set(0, 0, 2.2); }
  else { camera.fov = 40; camera.position.set(0, 30, 18); camLook.set(0, 0, 1); }
  camBase.copy(camera.position); camera.lookAt(camLook); camera.updateProjectionMatrix(); }
E.onResize.push(() => fit());
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; A.tick(); const t = now / 1000;
  if (state === 'play') step(dt); if (state === 'title') { titleSpin += dt * .15; camera.position.set(Math.sin(titleSpin) * 26, 20, Math.cos(titleSpin) * 26); camera.lookAt(0, 0, 0); demo(dt); }
  else { camera.position.copy(camBase); if (shake > 0) { shake = Math.max(0, shake - dt * 2); camera.position.add(V3(rnd(-1, 1), 0, rnd(-1, 1)).multiplyScalar(shake * .35)); } camera.lookAt(camLook); }
  animate(dt, t); FX.update(dt, -1); SM.update(dt, -1); E.render(); }
let titleSpin = 0, demoT = 0; function demo(dt) { demoT -= dt; if (demoT <= 0 && G) { demoT = 2.2; const ks = ['scout', 'blaster', 'tank', 'drones', 'sniper', 'boom']; spawn(ks[Math.floor(Math.random() * ks.length)], Math.random() < .5 ? 0 : 1, rnd(-6, 6), 0); } if (G && G.demo) { stepDemo(dt); } }
function stepDemo(dt) { for (const u of units) { if (u.dead) continue; u.born += dt; u.R.g.scale.setScalar(Math.min(1, u.born * 4) * US); u.z += (u.team ? 1 : -1) * u.D.spd * dt * .5; u.face = u.team ? 0 : Math.PI; u.moving = true; if (Math.abs(u.z) > 13) { u.dead = 1; boomFX(V3(u.x, .5, u.z), .6, u.team); } } units = units.filter(u => !u.dead || (scene.remove(u.obj), false)); }

/* ================= ICONS ================= */
function makeIcons() { const r2 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r2.setSize(160, 160); r2.outputColorSpace = THREE.SRGBColorSpace; r2.toneMapping = THREE.ACESFilmicToneMapping; const sc = new THREE.Scene(); sc.environment = scene.environment; sc.add(new THREE.HemisphereLight('#fff', '#556', 1.6)); const dl = new THREE.DirectionalLight('#fff', 2.5); dl.position.set(2, 4, 3); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 50); for (const k of Object.keys(CARDS)) { if (CARDS[k].spell) continue; const R = model(k, 0); const g = R.g; g.rotation.y = .6; sc.add(g); const bb = new THREE.Box3().setFromObject(g); const c = bb.getCenter(V3()), s = bb.getSize(V3()); const m = Math.max(s.x, s.y, s.z); cam.position.set(c.x, c.y + m * .5, c.z + m * 2.3); cam.lookAt(c); r2.render(sc, cam); ICON[k] = r2.domElement.toDataURL(); sc.remove(g); } r2.dispose(); }

/* ================= TITLE ================= */
function renderTitle() { const ai = arenaOf(S.tro), a = ARENAS[ai]; $('arIc').textContent = a.ic; $('arN').textContent = a.n; const nx = ARENAS[ai + 1]; $('arS').textContent = nx ? T(`הזירה הבאה ב־🏆 ${nx.t}`, `Next arena at 🏆 ${nx.t}`) : T('הזירה האחרונה!', 'Final arena!'); $('troT').textContent = '🏆 ' + S.tro; $('gearT').textContent = '⚙️ ' + S.gears;
  document.querySelectorAll('#modeSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === S.mode)); document.querySelectorAll('#diffSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.d === S.diff)); $('diffSeg').hidden = S.mode !== 'cpu';
  $('deck').innerHTML = Object.keys(CARDS).map(k => { const D = CARDS[k], ul = unlocked(k), L = lvl(k), cost = 40 * L; return `<div class="cd${ul ? '' : ' lock'}" data-k="${k}">${ICON[k] ? `<img src="${ICON[k]}">` : `<span class="ic">${SPELLIC[k]}</span>`}<i>${D.cost}</i>${ul ? `<span class="lv">L${L}</span>${L < 5 ? `<span class="up">⚙️${cost} ⬆</span>` : ''}` : ''}<b>${ul ? D.n : '🔒 🏆' + D.unlock}</b></div>`; }).join('');
  $('sndChip').textContent = S.mute ? T('🔇 צלילים', '🔇 Sound') : T('🔊 צלילים', '🔊 Sound'); }
$('deck').onclick = e => { const c = e.target.closest('[data-k]'); if (!c) return; A.ac(); const k = c.dataset.k, D = CARDS[k]; if (!unlocked(k)) { toast(T(`נפתח ב־🏆 ${D.unlock}`, `Unlocks at 🏆 ${D.unlock}`)); return; } const L = lvl(k), cost = 40 * L;
  if (L >= 5) { toast(D.n + ' – ' + D.d + ' · ' + T('רמה מקסימלית!', 'Max level!')); return; } if (S.gears < cost) { toast(`${D.n}: ${D.d} · ${T('צריך', 'Need')} ⚙️${cost}`, 2400); return; } S.gears -= cost; S.lv[k] = L + 1; S.save(); A.tone(660, .1, 'triangle', .07); A.tone(990, .2, 'triangle', .07, .1); toast(`⬆ ${D.n} ${T('שודרג לרמה', 'upgraded to level')} ${L + 1}! (+10%)`); renderTitle(); };
$('modeSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.mode = b.dataset.m; S.save(); renderTitle(); }; $('diffSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.diff = b.dataset.d; S.save(); renderTitle(); };
$('sndChip').onclick = () => { A.setMute(!S.mute); S.save(); renderTitle(); };
function showTitle() { state = 'title'; clearMatch(); G = { demo: 1, mode: 'cpu', crowns: [0, 0], ruins: [] }; buildArena(arenaOf(S.tro)); for (const [team, s] of [[0, 1], [1, -1]]) { mkTower(team, -BX, s * 11, 0); mkTower(team, BX, s * 11, 0); mkTower(team, 0, s * 14, 1); } towers.forEach(t => t.bar.g.visible = false);
  $('title').hidden = false; $('top').hidden = true; $('quit').hidden = true; $('h0').hidden = $('h1').hidden = true; $('endS').hidden = true; A.stopMusic(); renderTitle(); fit(); }
$('goBtn').onclick = () => start(); $('eAgain').onclick = () => start(); $('eMenu').onclick = () => showTitle(); $('quit').onclick = () => { A.ac(); showTitle(); };
$('goBtn').textContent = T('⚔️ לקרב!', '⚔️ Battle!'); $('eMenu').textContent = T('☰ תפריט', '☰ Menu'); $('eAgain').textContent = T('🔁 שוב', '🔁 Again'); $('deckT').textContent = T('🃏 הקלפים שלי – הקישו כדי לשדרג עם ⚙️', '🃏 My cards – tap to upgrade with ⚙️');
const mb = document.querySelectorAll('#modeSeg button'); mb[0].textContent = T('🤖 נגד המחשב', '🤖 vs CPU'); mb[1].textContent = T('👥 2 שחקנים', '👥 2 players'); const db = document.querySelectorAll('#diffSeg button'); db[0].textContent = T('😊 קל', '😊 Easy'); db[1].textContent = T('🙂 רגיל', '🙂 Normal'); db[2].textContent = T('🔥 קשה', '🔥 Hard');
$('quit').innerHTML = ICO.home('#fff'); $('homeT').innerHTML = ICO.home('#fff'); hubButtons(['homeT'], A); qualityButton('qBtn', S);
document.addEventListener('visibilitychange', () => { if (document.hidden) A.stopMusic(); });
if (EN) { document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr'; }
E.resize(); try { makeIcons(); } catch (e) { } showTitle(); setTimeout(() => { $('loading').hidden = true; requestAnimationFrame(frame); window.__roboOK = true; }, 30);
window.__rb = { camBase, camLook, get G() { return G; }, P, get units() { return units; }, towers: () => towers, play, start, S, step, spawn };
