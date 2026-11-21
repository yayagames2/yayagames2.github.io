import { THREE, $, V3, C, clamp, lerp, rnd, rng, T, EN, store, engine, studioEnv, std, particles, audio, toast, ICO, hubButtons, qualityButton, isTouch, CONFETTI, SND_ON, SND_OFF } from '../lib/kit.js';
const S = store('pet-save', { cur: '', pets: {}, coins: 30, owned: ['none', 'party', 'bow', 'collar'], tut: 0 });
const E = engine(S, { fov: 40, far: 80, bloom: [.12, .4, 1.1], exposure: 1.05, vignette: .16, sat: 1.06 });
const { scene, camera, renderer } = E; studioEnv(E, '#fff6fa', '#d8c0d0', .6);
const A = audio(S); const FX = particles(E, 900); const GL = particles(E, 400, true);
const TAU = Math.PI * 2; const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };

/* ================= DATA ================= */
const SPEC = {
  puppy: { n: T('כלבלב', 'Puppy'), nm: T('בובי', 'Bobby'), ic: '🐶', c: '#dea56a', c2: '#fff3e2', c3: '#8a5530', ear: 'flop', tail: 'wag', snout: 1, nose: '#2a1a14', fav: '🍖', pitch: 1.15 },
  kitty: { n: T('חתלתולה', 'Kitty'), nm: T('מיצי', 'Mitzi'), ic: '🐱', c: '#f3a45c', c2: '#fff6ea', c3: '#c8662a', ear: 'cat', tail: 'long', snout: 1, nose: '#ff8aa0', whisk: 1, stripes: 1, fav: '🐟', pitch: 1.55 },
  bunny: { n: T('ארנבון', 'Bunny'), nm: T('שלגי', 'Snowy'), ic: '🐰', c: '#f7f2f4', c2: '#ffffff', c3: '#ffb4cc', ear: 'bun', tail: 'puff', nose: '#ff8aa8', teeth: 1, fav: '🥕', pitch: 1.75 },
  panda: { n: T('פנדה', 'Panda'), nm: T('פופו', 'Popo'), ic: '🐼', c: '#fafafa', c2: '#ffffff', c3: '#202024', ear: 'round', tail: 'nub', snout: 1, nose: '#1a1a1e', patches: 1, dark: 1, fav: '🎋', pitch: .95 },
  alien: { n: T('חייזר ידידותי', 'Friendly Alien'), nm: T('זיבי', 'Zibi'), ic: '👽', c: '#7ae8b4', c2: '#d4fff0', c3: '#b46aff', ear: 'ant', tail: 0, nose: 0, fav: '🌟', pitch: 2.1, float: 1, gloss: 1, eyeS: 1.3 } };
const SPK = Object.keys(SPEC);
const FOODS = [{ e: '🍎', h: 14, f: 2 }, { e: '🥕', h: 14, f: 1 }, { e: '🍖', h: 26, f: 3 }, { e: '🐟', h: 24, f: 3 }, { e: '🎋', h: 22, f: 2 }, { e: '🌟', h: 22, f: 4 }, { e: '🥛', h: 12, f: 2 }, { e: '🍪', h: 7, f: 8 }, { e: '🧁', h: 8, f: 10 }];
const ACC = { hat: [['none', '🚫', 0], ['party', '🥳', 0], ['bow', '🎀', 0], ['flower', '🌸', 40], ['cap', '🧢', 50], ['crown', '👑', 90], ['wizard', '🧙', 120]], glass: [['none', '🚫', 0], ['round', '👓', 30], ['star', '⭐', 50], ['heart', '💗', 60]], neck: [['none', '🚫', 0], ['collar', '📿', 0], ['bowtie', '🎩', 30], ['bell', '🔔', 40], ['scarf', '🧣', 55]] };
const NEEDS = [['h', '🍖', '#ff9a3a', 'feed'], ['c', '🛁', '#3ab8ff', 'bath'], ['f', '⚽', '#3ad86a', 'play'], ['e', '⚡', '#ffd23a', 'sleep'], ['l', '❤️', '#ff4a8a', 'pet']];
const DECAY = { h: 1.3, c: .8, f: 1.6, e: .7, l: 1.1 }; // per minute

/* ================= ROOM ================= */
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c, rx = 1, ry = 1) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
function woodTex() { const c = cnv(512, 512), g = c.getContext('2d'); const r = rng(4); const cols = ['#d9a877', '#d0a070', '#e0b483', '#c99a68']; for (let i = 0; i < 8; i++) { g.fillStyle = cols[i % 4]; g.fillRect(0, i * 64, 512, 64); for (let k = 0; k < 40; k++) { g.strokeStyle = `rgba(120,70,30,${r() * .12})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const y = i * 64 + r() * 64; g.moveTo(0, y); g.bezierCurveTo(170, y + rnd(-6, 6), 340, y + rnd(-6, 6), 512, y + rnd(-4, 4)); g.stroke(); } g.fillStyle = 'rgba(90,50,20,.35)'; g.fillRect(0, i * 64, 512, 2); const x = (i * 197) % 512; g.fillRect(x, i * 64, 2, 64); } return tex(c, 3, 2); }
function wallTex() { const c = cnv(512, 512), g = c.getContext('2d'); g.fillStyle = '#ffd6e6'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 512; i += 64) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(i, 0, 26, 512); }
  g.font = '28px serif'; g.textAlign = 'center'; g.globalAlpha = .4; for (let y = 32; y < 512; y += 96) for (let x = 45; x < 512; x += 128) g.fillText(['⭐', '🌙', '💗', '☁️'][((x + y) / 32 | 0) % 4], x + ((y / 96 | 0) % 2) * 64, y); g.globalAlpha = 1; return tex(c, 3, 2); }
function skyTex(night) { const c = cnv(256, 256), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256); if (night) { gr.addColorStop(0, '#0a0a30'); gr.addColorStop(1, '#3a2a6a'); } else { gr.addColorStop(0, '#5ab8ff'); gr.addColorStop(1, '#cdefff'); } g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  if (night) { for (let i = 0; i < 60; i++) { g.fillStyle = '#fff'; g.fillRect(Math.random() * 256, Math.random() * 200, 2, 2); } g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(180, 70, 30, 0, TAU); g.fill(); g.fillStyle = '#0e0e36'; g.beginPath(); g.arc(194, 60, 26, 0, TAU); g.fill(); }
  else { g.fillStyle = '#fff'; for (const [x, y, s] of [[60, 80, 1], [180, 140, 1.3], [110, 200, .8]]) { for (const [dx, dy, r] of [[0, 0, 22], [22, 4, 18], [-22, 6, 16], [8, -12, 18]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill(); } } g.fillStyle = '#ffe24a'; g.beginPath(); g.arc(210, 40, 22, 0, TAU); g.fill(); } return tex(c); }
function rugTex() { const c = cnv(256, 256), g = c.getContext('2d'); for (let r = 128; r > 0; r -= 16) { g.fillStyle = (r / 16) % 2 ? '#a8d8ff' : '#ffffff'; g.beginPath(); g.arc(128, 128, r, 0, TAU); g.fill(); } return tex(c); }
const room = new THREE.Group(); scene.add(room);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 12).rotateX(-Math.PI / 2), std('#fff', { map: woodTex(), roughness: .55 })); floor.receiveShadow = true; floor.position.z = 2; room.add(floor);
const wallM = std('#fff', { map: wallTex(), roughness: .9 }); const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), wallM); wall.position.set(0, 4.5, -3); wall.receiveShadow = true; room.add(wall);
for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(12, 9), wallM); w.position.set(s * 6, 4.5, 2); w.rotation.y = -s * Math.PI / 2; room.add(w); }
const skirt = new THREE.Mesh(new THREE.BoxGeometry(16, .9, .08), std('#ffffff', { roughness: .5 })); skirt.position.set(0, .45, -2.96); room.add(skirt);
const winG = new THREE.Group(); winG.position.set(-1.9, 3.3, -2.94); room.add(winG); const SKY = [skyTex(0), skyTex(1)]; const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.9), new THREE.MeshBasicMaterial({ map: SKY[0] })); winG.add(glass);
const frM = std('#ffffff', { roughness: .4 }); for (const [w, h, x, y] of [[2.5, .14, 0, 1.02], [2.5, .14, 0, -1.02], [.14, 2.2, -1.18, 0], [.14, 2.2, 1.18, 0], [.08, 1.9, 0, 0], [2.2, .08, 0, 0]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, .14), frM); b.position.set(x, y, .05); b.castShadow = true; winG.add(b); }
const sill = new THREE.Mesh(new THREE.BoxGeometry(2.8, .1, .4), frM); sill.position.set(0, -1.12, .18); winG.add(sill);
for (const s of [-1, 1]) { const cu = new THREE.Mesh(new THREE.CylinderGeometry(.28, .4, 2.5, 12, 1, true), std('#ff9ac0', { roughness: .9, side: THREE.DoubleSide })); cu.scale.z = .35; cu.position.set(s * 1.5, -.1, .2); winG.add(cu); }
const pic = new THREE.Group(); pic.position.set(2.1, 3.6, -2.95); room.add(pic); const pf = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1, .08), std('#ffd23a', { metalness: .4, roughness: .35 })); pic.add(pf);
const pc = cnv(128, 100), pg = pc.getContext('2d'); pg.fillStyle = '#fff8e8'; pg.fillRect(0, 0, 128, 100); pg.font = '64px serif'; pg.textAlign = 'center'; pg.textBaseline = 'middle'; pg.fillText('🐾', 64, 52); const pi = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .82), new THREE.MeshBasicMaterial({ map: tex(pc) })); pi.position.z = .05; pic.add(pi);
const rug = new THREE.Mesh(new THREE.CircleGeometry(2.1, 48).rotateX(-Math.PI / 2), std('#fff', { map: rugTex(), roughness: 1 })); rug.position.set(0, .006, .4); rug.receiveShadow = true; room.add(rug);
const bed = new THREE.Group(); bed.position.set(2.9, 0, -1.5); room.add(bed); const bt = new THREE.Mesh(new THREE.TorusGeometry(.75, .28, 16, 32).rotateX(Math.PI / 2), std('#8ac8ff', { roughness: .9 })); bt.position.y = .28; bed.add(bt); const bc = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, .18, 32), std('#fff0f6', { roughness: 1 })); bc.position.y = .12; bed.add(bc); shadowAll(bed);
const plant = new THREE.Group(); plant.position.set(-3.2, 0, -1.9); room.add(plant); const pot = new THREE.Mesh(new THREE.CylinderGeometry(.42, .32, .8, 20), std('#e8805a', { roughness: .7 })); pot.position.y = .4; plant.add(pot); for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.3, 12, 8), std(i % 2 ? '#4ab05a' : '#3a9a4a', { roughness: .8 })); l.scale.set(.6, 1.3, .6); const a = i / 9 * TAU; l.position.set(Math.cos(a) * .25, 1.1 + (i % 3) * .2, Math.sin(a) * .25); l.rotation.set(Math.sin(a) * .5, 0, Math.cos(a) * .5); plant.add(l); } shadowAll(plant);
const lampG = new THREE.Group(); lampG.position.set(3.7, 0, -2.3); room.add(lampG); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 2.6, 8), std('#3a3a44', { metalness: .6, roughness: .3 })); pole.position.y = 1.3; lampG.add(pole); const shade = new THREE.Mesh(new THREE.CylinderGeometry(.3, .5, .55, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#fff2c8', emissive: C('#ffcf7a'), emissiveIntensity: .7, side: THREE.DoubleSide })); shade.position.y = 2.7; lampG.add(shade);
const hemi = new THREE.HemisphereLight('#fff8f0', '#e8c8b8', 1.1); scene.add(hemi);
const key = new THREE.DirectionalLight('#fff4e8', 2.2); key.position.set(-3, 7, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); const kc = key.shadow.camera; kc.left = kc.bottom = -5; kc.right = kc.top = 5; kc.near = 1; kc.far = 20; key.shadow.bias = -.0005; key.shadow.normalBias = .02; key.shadow.radius = 4; scene.add(key);
const warm = new THREE.PointLight('#ffc070', 0, 9, 1.6); warm.position.set(3.5, 2.6, -1.9); scene.add(warm);
function shadowAll(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); }

/* ================= PET BUILDER ================= */
function furM(c, D) { const col = C(c); if (D.gloss) return new THREE.MeshPhysicalMaterial({ color: col, roughness: .28, clearcoat: 1, clearcoatRoughness: .15, emissive: col.clone().multiplyScalar(.12), sheen: .3, sheenColor: C('#ffffff') });
  return new THREE.MeshPhysicalMaterial({ color: col, roughness: .82, sheen: 1, sheenRoughness: .45, sheenColor: col.clone().lerp(C('#ffffff'), .55) }); }
function tube(pts, r, m) { return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V3(...p))), 16, r, 8), m); }
function buildPet(sp, acc) { const D = SPEC[sp]; const g = new THREE.Group(); const R = {};
  const m1 = furM(D.c, D), m2 = furM(D.c2, D), m3 = furM(D.c3, D), dk = D.dark ? m3 : m1; const blk = new THREE.MeshPhysicalMaterial({ color: '#120a14', roughness: .08, clearcoat: 1 }); const wht = new THREE.MeshBasicMaterial({ color: '#ffffff' }); const pink = std('#ff8ab0', { roughness: .6 }); const mouthM = std('#5a1a2a', { roughness: .5 });
  const root = new THREE.Group(); g.add(root); R.root = root;
  const body = new THREE.Group(); body.position.y = .62; root.add(body); R.body = body; const bm = new THREE.Mesh(new THREE.SphereGeometry(.56, 36, 26), m1); bm.scale.set(1, .92, 1.02); body.add(bm);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(.42, 28, 20), m2); belly.scale.set(1, 1.05, .5); belly.position.set(0, -.04, .41); body.add(belly);
  if (D.stripes) for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.TorusGeometry(.5, .035, 6, 24, Math.PI * .6), m3); s.rotation.set(0, Math.PI / 2, Math.PI * .2); s.position.set(0, .12, -.12 - i * .14); s.scale.set(1, 1, 1); body.add(s); }
  const head = new THREE.Group(); head.position.set(0, 1.42, .04); root.add(head); R.head = head; const hs = D.float ? 1.14 : 1; const hm = new THREE.Mesh(new THREE.SphereGeometry(.52, 40, 30), m1); hm.scale.set(1.08 * hs, .96 * hs, 1 * hs); head.add(hm);
  const fz = .5 * hs;
  if (D.patches) for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.SphereGeometry(.13, 20, 14), m3); p.scale.set(1, 1.35, .45); p.position.set(s * .21, .02, fz - .08); p.rotation.z = s * .55; head.add(p); }
  const eyes = [], happy = [], sleepE = []; const es = D.eyeS || 1;
  for (const s of [-1, 1]) { const eg = new THREE.Group(); eg.position.set(s * .2 * (D.float ? 1.15 : 1), .05, fz - .06); head.add(eg); const e = new THREE.Mesh(new THREE.SphereGeometry(.1 * es, 24, 18), blk); e.scale.set(1, 1.2, .55); eg.add(e);
    if (D.float) { const ir = new THREE.Mesh(new THREE.TorusGeometry(.065 * es, .018, 8, 24), new THREE.MeshBasicMaterial({ color: '#b46aff' })); ir.position.z = .045; eg.add(ir); }
    for (const [x, y, r] of [[.035, .045, .032], [-.03, -.04, .015]]) { const h = new THREE.Mesh(new THREE.SphereGeometry(r * es, 10, 8), wht); h.position.set(x * es, y * es, .05); eg.add(h); }
    eyes.push(eg); const hp = tube([[-.08, -.02, 0], [0, .05, 0], [.08, -.02, 0]].map(([x, y, z]) => [x * es, y * es, z]), .018, blk); hp.position.set(s * .2 * (D.float ? 1.15 : 1), .05, fz - .01); hp.visible = false; head.add(hp); happy.push(hp);
    const sl = tube([[-.08, .02, 0], [0, -.03, 0], [.08, .02, 0]].map(([x, y, z]) => [x * es, y * es, z]), .016, blk); sl.position.copy(hp.position); sl.visible = false; head.add(sl); sleepE.push(sl); }
  R.eyes = eyes; R.happyE = happy; R.sleepE = sleepE;
  for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.CircleGeometry(.075, 20), new THREE.MeshBasicMaterial({ color: '#ff7aa0', transparent: true, opacity: .45, depthWrite: false })); ch.position.set(s * .33 * hs, -.1, fz - .12); ch.lookAt(s * 1.6, -.4, 2.5); head.add(ch); }
  let mz = fz - .01, my = -.2;
  if (D.snout) { const sn = new THREE.Mesh(new THREE.SphereGeometry(.19, 24, 16), m2); sn.scale.set(1.2, .82, .7); sn.position.set(0, -.13, fz - .1); head.add(sn); mz = fz + .03; my = -.21; }
  if (D.nose) { const no = new THREE.Mesh(new THREE.SphereGeometry(sp === 'puppy' || sp === 'panda' ? .06 : .04, 16, 12), new THREE.MeshPhysicalMaterial({ color: D.nose, roughness: .2, clearcoat: 1 })); no.scale.set(1.35, 1, .9); no.position.set(0, D.snout ? -.07 : -.07, D.snout ? fz + .02 : fz - .01); head.add(no); }
  if (D.teeth) for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.BoxGeometry(.045, .06, .02), std('#ffffff', { roughness: .3 })); t.position.set(s * .025, -.21, fz - .03); head.add(t); }
  const smile = tube([[-.07, .02, 0], [-.035, -.025, 0], [0, 0, 0], [.035, -.025, 0], [.07, .02, 0]], .014, mouthM); smile.position.set(0, my + .03, mz); head.add(smile); R.smile = smile;
  const sad = tube([[-.06, -.02, 0], [0, .025, 0], [.06, -.02, 0]], .014, mouthM); sad.position.set(0, my + .01, mz); sad.visible = false; head.add(sad); R.sad = sad;
  const om = new THREE.Group(); om.position.set(0, my, mz - .02); om.visible = false; head.add(om); const o1 = new THREE.Mesh(new THREE.SphereGeometry(.075, 18, 12, 0, TAU, Math.PI / 2, Math.PI / 2), mouthM); o1.scale.set(1.15, 1.2, .5); o1.rotation.x = Math.PI; om.add(o1); const tg = new THREE.Mesh(new THREE.SphereGeometry(.045, 12, 10), pink); tg.scale.set(1.2, .6, .6); tg.position.set(0, -.04, .01); om.add(tg); R.openM = om;
  if (D.whisk) for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .3, 4), std('#5a3a2a')); w.rotation.z = Math.PI / 2 + k * .18 * s; w.position.set(s * .27, -.12 + k * .03, fz - .02); head.add(w); }
  // ears
  const ears = [];
  for (const s of [-1, 1]) { const ep = new THREE.Group(); head.add(ep); ears.push(ep);
    if (D.ear === 'flop') { ep.position.set(s * .42, .26, -.02); const e = new THREE.Mesh(new THREE.SphereGeometry(.2, 20, 14), m3); e.scale.set(.55, 1.25, .32); e.position.y = -.22; ep.add(e); ep.rotation.z = s * .35; }
    if (D.ear === 'cat') { ep.position.set(s * .3, .4, -.02); ep.rotation.z = -s * .32; const e = new THREE.Mesh(new THREE.ConeGeometry(.17, .34, 18), m1); e.position.y = .1; ep.add(e); const i = new THREE.Mesh(new THREE.ConeGeometry(.1, .22, 14), pink); i.position.set(0, .06, .06); ep.add(i); }
    if (D.ear === 'bun') { ep.position.set(s * .17, .4, -.04); ep.rotation.z = -s * .15; const e = new THREE.Mesh(new THREE.SphereGeometry(.2, 20, 14), m1); e.scale.set(.5, 1.6, .3); e.position.y = .3; ep.add(e); const i = new THREE.Mesh(new THREE.SphereGeometry(.14, 16, 12), pink); i.scale.set(.45, 1.55, .2); i.position.set(0, .3, .045); ep.add(i); }
    if (D.ear === 'round') { ep.position.set(s * .36, .38, -.04); const e = new THREE.Mesh(new THREE.SphereGeometry(.15, 20, 14), m3); e.scale.z = .7; ep.add(e); }
    if (D.ear === 'ant') { ep.position.set(s * .16, .55, 0); ep.rotation.z = -s * .3; const st = new THREE.Mesh(new THREE.CylinderGeometry(.022, .028, .36, 8), m1); st.position.y = .16; ep.add(st); const b = new THREE.Mesh(new THREE.SphereGeometry(.08, 16, 12), new THREE.MeshStandardMaterial({ color: '#ff8ae0', emissive: C('#ff5ad0'), emissiveIntensity: 1.4 })); b.position.y = .38; ep.add(b); } }
  R.ears = ears;
  // legs
  const legs = []; const lm = D.dark ? m3 : m1;
  for (const [x, z] of D.float ? [[-.2, .15], [.2, .15]] : [[-.27, .24], [.27, .24], [-.27, -.22], [.27, -.22]]) { const lg = new THREE.Group(); lg.position.set(x, .34, z); root.add(lg); const l = new THREE.Mesh(new THREE.CapsuleGeometry(.12, .16, 6, 14), lm); l.position.y = -.14; lg.add(l); const f = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 12), D.dark ? m3 : m2); f.scale.set(1, .6, 1.2); f.position.set(0, -.28, .03); lg.add(f); legs.push(lg); }
  if (D.float) for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.set(s * .5, .72, .05); root.add(a); const m = new THREE.Mesh(new THREE.CapsuleGeometry(.08, .18, 4, 10), m1); m.position.y = -.12; a.add(m); a.rotation.z = s * .5; legs.push(a); }
  R.legs = legs;
  // tail
  const tail = new THREE.Group(); tail.position.set(0, .52, -.5); root.add(tail); R.tail = tail;
  if (D.tail === 'wag') { const t = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .3, 6, 10), m1); t.position.y = .2; tail.add(t); const tip = new THREE.Mesh(new THREE.SphereGeometry(.075, 12, 10), m2); tip.position.y = .4; tail.add(tip); tail.rotation.x = -.7; }
  if (D.tail === 'long') { const t = tube([[0, 0, 0], [0, .15, -.18], [0, .45, -.22], [0, .65, -.08]], .06, m1); tail.add(t); const tip = new THREE.Mesh(new THREE.SphereGeometry(.065, 12, 10), m3); tip.position.set(0, .65, -.08); tail.add(tip); }
  if (D.tail === 'puff') { const t = new THREE.Mesh(new THREE.SphereGeometry(.17, 18, 14), m2); tail.add(t); }
  if (D.tail === 'nub') { const t = new THREE.Mesh(new THREE.SphereGeometry(.11, 14, 10), m3); tail.add(t); }
  if (D.float) { const ring = new THREE.Mesh(new THREE.RingGeometry(.3, .75, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#7affd0', transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending })); ring.position.y = .02; g.add(ring); R.ring = ring;
    for (let i = 0; i < 6; i++) { const sp2 = new THREE.Mesh(new THREE.SphereGeometry(.05 + (i % 3) * .02, 10, 8), m3); const a = i * 1.7, b = .4 + (i % 3) * .5; const p = V3(Math.cos(a) * Math.sin(b), Math.cos(b), Math.sin(a) * Math.sin(b)).multiplyScalar(.5); if (p.z > .2 && p.y > -.1) p.z = -p.z; sp2.position.copy(p); (i < 3 ? head : body).add(sp2); } }
  shadowAll(root); for (const e of eyes) e.traverse(m => m.castShadow = false);
  // accessory slots
  R.hatS = new THREE.Group(); R.hatS.position.set(0, .46 * hs, 0); head.add(R.hatS); R.glassS = new THREE.Group(); R.glassS.position.set(0, .05, fz); head.add(R.glassS); R.neckS = new THREE.Group(); R.neckS.position.set(0, 1.0, .02); root.add(R.neckS);
  R.g = g; R.D = D; R.sp = sp; R.hs = hs; R.mouthLocal = V3(0, my, mz + .1);
  R.hitMeshes = []; root.traverse(m => { if (m.isMesh) R.hitMeshes.push(m); });
  const lv = (S.pets[sp] && S.pets[sp].lvl) || 1; const stg = stageOf(lv); R.stage = stg; const ST = [[.62, 1.2, 1.18], [.8, 1.1, 1.08], [1, 1, 1]][stg]; g.scale.setScalar(ST[0]); head.scale.setScalar(ST[1]); eyes.forEach(e => e.scale.setScalar(ST[2])); happy.forEach(e => e.scale.setScalar(ST[2])); sleepE.forEach(e => e.scale.setScalar(ST[2]));
  setAcc(R, acc); return R; }
function stageOf(lv) { return lv < 3 ? 0 : lv < 6 ? 1 : 2; }
const STN = [T('תינוק', 'Baby'), T('צעיר', 'Young'), T('גדול', 'Grown-up')];
function accMesh(slot, id, R) { const g = new THREE.Group(); const gold = std('#ffcf3a', { metalness: .8, roughness: .25 });
  if (slot === 'hat') {
    if (id === 'party') { const c = new THREE.Mesh(new THREE.ConeGeometry(.2, .45, 24), std('#ff5aa8', { roughness: .5 })); c.position.y = .2; g.add(c); for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.16 - i * .05, .018, 6, 20).rotateX(Math.PI / 2), std('#ffe24a')); r.position.y = .07 + i * .13; g.add(r); } const p = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), std('#3ad8ff')); p.position.y = .45; g.add(p); g.rotation.z = .2; g.position.x = -.08; }
    if (id === 'bow') { for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(.12, .22, 16), std('#ff3a7a', { roughness: .4 })); c.rotation.z = s * Math.PI / 2; c.position.x = s * .12; g.add(c); } const k = new THREE.Mesh(new THREE.SphereGeometry(.06, 12, 10), std('#ff3a7a')); g.add(k); g.position.set(.2, -.02, .12); g.rotation.z = -.3; }
    if (id === 'flower') { for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), std('#ffb0d8')); const a = i / 6 * TAU; p.scale.z = .4; p.position.set(Math.cos(a) * .09, Math.sin(a) * .09, 0); g.add(p); } const c = new THREE.Mesh(new THREE.SphereGeometry(.06, 12, 8), std('#ffd23a')); c.position.z = .03; g.add(c); g.position.set(-.24, -.05, .2); g.rotation.y = -.4; }
    if (id === 'cap') { const c = new THREE.Mesh(new THREE.SphereGeometry(.34, 24, 14, 0, TAU, 0, Math.PI / 2), std('#2a7aff', { roughness: .6 })); c.scale.y = .7; c.position.y = -.06; g.add(c); const v = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .03, 20, 1, false, -Math.PI / 2, Math.PI), std('#2a7aff')); v.position.set(0, -.05, .2); v.scale.z = .9; g.add(v); const b = new THREE.Mesh(new THREE.SphereGeometry(.04, 8, 6), std('#ffffff')); b.position.y = .18; g.add(b); }
    if (id === 'crown') { const b = new THREE.Mesh(new THREE.CylinderGeometry(.22, .24, .14, 24, 1, true), gold); b.material.side = THREE.DoubleSide; b.position.y = .05; g.add(b); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; const s = new THREE.Mesh(new THREE.ConeGeometry(.05, .14, 8), gold); s.position.set(Math.cos(a) * .22, .18, Math.sin(a) * .22); g.add(s); const j = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), std(['#ff3a5a', '#3a8aff', '#3ad86a'][i % 3], { roughness: .1 })); j.position.set(Math.cos(a) * .235, .06, Math.sin(a) * .235); g.add(j); } }
    if (id === 'wizard') { const c = new THREE.Mesh(new THREE.ConeGeometry(.26, .6, 24), std('#5a3aca', { roughness: .6 })); c.position.y = .28; c.rotation.x = -.15; g.add(c); const br = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .03, 28), c.material); g.add(br); for (let i = 0; i < 4; i++) { const st = new THREE.Mesh(new THREE.OctahedronGeometry(.04), std('#ffe24a', { emissive: C('#ffcf3a'), emissiveIntensity: .8 })); st.position.set(Math.cos(i * 1.7) * .16, .15 + i * .08, Math.sin(i * 1.7) * .16 + .05); g.add(st); } } }
  if (slot === 'glass') { const col = id === 'round' ? '#1a1a2a' : id === 'star' ? '#ffcf3a' : '#ff4a8a'; const fm = std(col, { roughness: .3, metalness: .3 }); const es = R.D.float ? 1.15 : 1;
    for (const s of [-1, 1]) { let r; if (id === 'round') r = new THREE.Mesh(new THREE.TorusGeometry(.12, .018, 8, 24), fm); else { const sh = new THREE.Shape(); if (id === 'star') { for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + Math.PI / 2, rr = i % 2 ? .07 : .16; i ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } } else { sh.moveTo(0, -.12); sh.bezierCurveTo(-.2, 0, -.12, .14, 0, .05); sh.bezierCurveTo(.12, .14, .2, 0, 0, -.12); } r = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .02, bevelEnabled: false }), new THREE.MeshPhysicalMaterial({ color: col, transparent: true, opacity: .55, roughness: .1 })); }
      r.position.set(s * .2 * es, .05, .02); g.add(r); }
    const br = new THREE.Mesh(new THREE.BoxGeometry(.12, .02, .02), fm); br.position.set(0, .08, .02); g.add(br); }
  if (slot === 'neck') { if (id === 'collar' || id === 'bell') { const c = new THREE.Mesh(new THREE.TorusGeometry(.33, .045, 10, 32).rotateX(Math.PI / 2), std(id === 'bell' ? '#e8202a' : '#3a8aff', { roughness: .5 })); g.add(c); const t = id === 'bell' ? new THREE.Mesh(new THREE.SphereGeometry(.07, 14, 10), gold) : new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .02, 16).rotateX(Math.PI / 2), gold); t.position.set(0, -.07, .35); g.add(t); }
    if (id === 'bowtie') { for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(.09, .16, 4), std('#e8202a', { roughness: .4 })); c.rotation.z = s * Math.PI / 2; c.position.set(s * .08, 0, .36); g.add(c); } const k = new THREE.Mesh(new THREE.SphereGeometry(.04, 8, 6), std('#a8101a')); k.position.z = .37; g.add(k); }
    if (id === 'scarf') { const c = new THREE.Mesh(new THREE.TorusGeometry(.32, .08, 10, 32).rotateX(Math.PI / 2), std('#ff7a2a', { roughness: .9 })); g.add(c); const e = new THREE.Mesh(new THREE.BoxGeometry(.14, .34, .06), c.material); e.position.set(.16, -.17, .3); e.rotation.z = .2; g.add(e); } }
  shadowAll(g); return g; }
function setAcc(R, acc) { for (const [k, sl] of [['hat', R.hatS], ['glass', R.glassS], ['neck', R.neckS]]) { while (sl.children.length) sl.remove(sl.children[0]); const id = acc && acc[k]; if (id && id !== 'none') sl.add(accMesh(k, id, R)); } }

/* ================= STATE ================= */
let mode = 'title', pet = null, P = null, last = performance.now(), sel = S.cur || 'puppy';
const AN = { mood: 'idle', jump: 0, jumpV: 0, look: V3(0, 1.3, 4), eat: 0, purr: 0, walk: 0, target: null, carry: 0, sleep: 0, shake: 0, giggle: 0, blinkT: 2, tPet: 0 };
function petData(sp) { if (!S.pets[sp]) S.pets[sp] = { name: SPEC[sp].nm, n: { h: 70, c: 75, f: 65, e: 80, l: 60 }, lvl: 1, xp: 0, acc: { hat: 'none', glass: 'none', neck: 'collar' }, t: Date.now(), dirt: 0 }; return S.pets[sp]; }
function applyOffline(p) { const mins = Math.min(240, (Date.now() - (p.t || Date.now())) / 60000); for (const k in DECAY) p.n[k] = Math.max(Math.min(p.n[k], 15), p.n[k] - DECAY[k] * mins * .5); p.t = Date.now(); }
function setNeed(k, v) { P.n[k] = clamp(v, 0, 100); }
let xpBud = 20; function addXp(v) { v = Math.min(v, xpBud); if (v <= 0) return; xpBud -= v; P.xp += v; const need = 40 + P.lvl * 30; if (P.xp >= need) { P.xp -= need; P.lvl++; S.coins += 20; lvlUp(); } S.save(); updTop(); }
function coins(v, at) { S.coins += v; S.save(); updTop(); if (at) popAt('🪙 +' + v, at[0], at[1] - 30, '#d89a00'); A.tone(1320, .08, 'square', .04); A.tone(1760, .12, 'square', .04, .06); }
function lvlUp() { const before = pet.stage; if (stageOf(P.lvl) !== before) setTimeout(() => { const acc = P.acc; scene.remove(pet.g); pet = buildPet(pet.sp, acc); scene.add(pet.g); dirt = []; if (P.n.c < 60) makeDirt(); confetti(); A.voice('wow', pet.D.pitch); $('lvl').innerHTML = `<div><b>🌱 ${P.name} ${T('גדל/ה!', 'grew up!')}</b><p>${STN[pet.stage]} – ${T('עדיין הכי חמוד/ה בעולם 💕', 'still the cutest ever 💕')}</p></div>`; $('lvl').hidden = false; setTimeout(() => $('lvl').hidden = true, 2600); }, 2400); $('lvl').innerHTML = `<div><b>⭐ ${T('רמה', 'Level')} ${P.lvl}!</b><p>${T('החבר שלך גדל! +20 🪙', 'Your pal grew up! +20 🪙')}</p></div>`; $('lvl').hidden = false; A.tone(523, .15, 'triangle', .08); A.tone(659, .15, 'triangle', .08, .12); A.tone(784, .15, 'triangle', .08, .24); A.tone(1047, .4, 'triangle', .08, .36); confetti(); happyJump(); setTimeout(() => $('lvl').hidden = true, 2200); }
function confetti() { FX.burst(V3(0, 2.2, .5), 60, CONFETTI, 4, .07, 1.6, 6); }

/* ================= UI ================= */
const ACTIONS = [['feed', '🍖', T('אוכל', 'Food')], ['bath', '🛁', T('מקלחת', 'Bath')], ['play', '⚽', T('משחק', 'Play')], ['sleep', '💤', T('שינה', 'Sleep')], ['style', '🎀', T('סטייל', 'Style')]];
$('dock').innerHTML = ACTIONS.map(([k, e, n]) => `<button data-a="${k}">${e}<small>${n}</small></button>`).join('');
$('needs').innerHTML = NEEDS.map(([k, e, c]) => `<div class="nd" id="nd_${k}" style="--c:${c};--v:50"><span>${e}</span></div>`).join('');
function updTop() { if (!P) return; $('pName').textContent = `${P.name} · ${STN[stageOf(P.lvl)]} · ${T('רמה', 'Lv')} ${P.lvl}`; $('xpBar').style.width = (P.xp / (40 + P.lvl * 30) * 100) + '%'; $('coinN').textContent = S.coins; }
function updNeeds() { if (!P) return; let low = null, lv = 101; for (const [k] of NEEDS) { const v = P.n[k]; const el = $('nd_' + k); el.style.setProperty('--v', v.toFixed(0)); el.classList.toggle('low', v < 30); if (v < lv) { lv = v; low = k; } }
  const act = lv < 40 ? NEEDS.find(n => n[0] === low)[3] : null; for (const b of $('dock').children) b.classList.toggle('blink', mode === 'home' && b.dataset.a === act);
  AN.want = mess.length && lv >= 25 ? (mess.some(m => m.k === 'poop') ? '💩' : '💦') : lv < 40 ? NEEDS.find(n => n[0] === low)[1] : null; updTask(); }
function popAt(txt, x, y, col) { const d = document.createElement('div'); d.textContent = txt; d.style.left = x + 'px'; d.style.top = y + 'px'; if (col) d.style.color = col; $('pops').appendChild(d); setTimeout(() => d.remove(), 1200); }
function scr(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight]; }
function headW() { return pet.head.getWorldPosition(V3()); }
function mouthW() { return pet.head.localToWorld(pet.mouthLocal.clone()); }
function hint(t) { $('hint').textContent = t || ''; }

/* ================= MODES ================= */
function setMode(m) { if (m === 'sleep' && mode !== 'sleep' && P && P.n.e > 85) { notNow(T('אני לא עייף/ה! 😝', 'I’m not tired! 😝')); return; } if (m === 'bath' && mode !== 'bath' && P && P.n.c > 92 && !mess.length) { notNow(T('אני כבר נקי/ה! ✨', 'I’m already clean! ✨')); return; } const prev = mode; if (prev === 'sleep' && m !== 'sleep') wake(); if (prev === 'bath' && m !== 'bath') endBath(false); if (prev === 'play' && m !== 'play') endPlay();
  mode = m; for (const b of $('dock').children) b.classList.toggle('on', b.dataset.a === m); $('tray').hidden = true; $('wd').hidden = true; hint('');
  if (m === 'feed') { showTray(FOODS.filter(f => !['🎋', '🌟', '🐟', '🍖', '🥕'].includes(f.e) || f.e === pet.D.fav || (f.e === '🥕' && pet.sp !== 'alien')).map(f => ({ e: f.e, k: f.e })), 'feed'); hint(T('גררו אוכל לפה של ' + P.name + ' 😋', 'Drag food to ' + P.name + '’s mouth 😋')); }
  if (m === 'bath') startBath(); if (m === 'play') startPlay(); if (m === 'sleep') goSleep(); if (m === 'style') showWardrobe(); updNeeds(); }
let trayKind = '', tool = null;
function showTray(items, kind) { trayKind = kind; $('tray').innerHTML = items.map(it => `<div class="it ${it.on ? 'on' : ''} ${it.blink ? 'blink' : ''}" data-k="${it.k}">${it.e}${it.badge ? `<small>${it.badge}</small>` : ''}</div>`).join(''); $('tray').hidden = false; }
$('dock').onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; A.ac(); A.tone(700, .05, 'triangle', .05); const a = b.dataset.a; setMode(mode === a ? 'home' : a); };

/* ---- feed ---- */
let drag = null;
$('tray').addEventListener('pointerdown', e => { const it = e.target.closest('.it'); if (!it) return; A.ac(); const k = it.dataset.k;
  if (trayKind === 'feed') { drag = { k, e: k }; $('ghost').textContent = k; $('ghost').hidden = false; moveGhost(e); e.preventDefault(); }
  if (trayKind === 'bath') { tool = k; renderBathTray(); }
  if (trayKind === 'play') { if (k === '🪶') { drag = { k, e: k, feather: 1 }; $('ghost').textContent = k; $('ghost').hidden = false; moveGhost(e); e.preventDefault(); } else { tool = k; renderPlayTray(); if (k === '⚽') placeBall(); } } });
function moveGhost(e) { $('ghost').style.left = e.clientX + 'px'; $('ghost').style.top = e.clientY + 'px'; if (drag) { drag.x = e.clientX; drag.y = e.clientY; } }
addEventListener('pointermove', e => { if (drag) { moveGhost(e); const w = unproj(e.clientX, e.clientY, 2.2); AN.look.copy(w); if (drag.feather) featherMove(e); else { const [mx, my] = scr(mouthW()); const d = Math.hypot(mx - e.clientX, my - e.clientY); AN.mood = d < 140 ? 'open' : 'idle'; } } });
addEventListener('pointerup', e => { if (!drag) return; const d0 = drag; drag = null; $('ghost').hidden = true; if (d0.feather) { AN.mood = 'idle'; return; } const [mx, my] = scr(mouthW()); if (Math.hypot(mx - e.clientX, my - e.clientY) < 110 * Math.max(.8, innerHeight / 900)) eat(d0.k); else AN.mood = 'idle'; });
function eat(k) { const f = FOODS.find(x => x.e === k); if (P.n.h > 94 && f.h > 10) { AN.shake = 1; AN.mood = 'idle'; A.voice('hm', pet.D.pitch); const [x, y] = scr(headW()); popAt(T('אני מלא! 😮‍💨', 'I’m full! 😮‍💨'), x, y - 90); return; }
  AN.eat = 1.2; AN.mood = 'eat'; P.gut = (P.gut || 0) + 1; if (P.gut >= 3 && !pooT) pooT = rnd(12, 22); const fav = k === pet.D.fav; setNeed('h', P.n.h + f.h * (fav ? 1.3 : 1)); setNeed('f', P.n.f + f.f); setNeed('l', P.n.l + (fav ? 6 : 2)); addXp(fav ? 6 : 3);
  for (let i = 0; i < 3; i++) setTimeout(() => { A.noise(.08, 'bandpass', 1800 + Math.random() * 800, 2, .1); FX.burst(mouthW(), 6, [[1, .8, .5], [.9, .6, .3]], 1.2, .035, .6, 6); }, i * 320);
  setTimeout(() => { A.voice(fav ? 'yay' : 'hm', pet.D.pitch); const [x, y] = scr(headW()); if (fav) { popAt('💖 ' + T('האהוב עליי!', 'My favorite!'), x, y - 100); happyJump(); } else popAt('😋', x, y - 90); if (Math.random() < .5) coins(1, [x, y - 40]); }, 1100); updNeeds(); }

/* ---- bath ---- */
let tub = null, foam = [], dirt = [], bathStep = 0, dryAmt = 0;
const foamGeo = new THREE.IcosahedronGeometry(1, 2), foamM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .35, transparent: true, opacity: .92, sheen: 1, sheenColor: C('#cfe8ff') }); const dirtM = std('#6a4a2a', { roughness: 1 });
function makeDirt() { for (const d of dirt) d.parent && d.parent.remove(d); dirt = []; const n = Math.round((100 - P.n.c) / 12); const r = rng(Date.now() & 255); for (let i = 0; i < n; i++) { const onHead = r() < .35; const par = onHead ? pet.head : pet.body; const rad = onHead ? .5 : .55; const a = r() * TAU, b = .5 + r() * 1.5; const p = V3(Math.cos(a) * Math.sin(b), Math.cos(b), Math.sin(a) * Math.sin(b)); if (onHead) { p.y = Math.abs(p.y) + .35; p.z = Math.min(p.z, .3); } else { p.z = Math.abs(p.z) * .8 + .2; } p.normalize(); const m = new THREE.Mesh(foamGeo, dirtM); m.scale.set(.09 + r() * .05, .09 + r() * .05, .025); m.position.copy(p.multiplyScalar(rad * .98)); m.lookAt(p.clone().multiplyScalar(3)); par.add(m); dirt.push(m); } }
function startBath() { if (!tub) { tub = new THREE.Group(); const prof = []; for (let i = 0; i <= 12; i++) { const t = i / 12; prof.push(new THREE.Vector2(1.05 + Math.sin(t * Math.PI * .5) * .25 - (t < .1 ? (1 - t * 10) * .7 : 0), t * .95)); } const tm = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .12, clearcoat: 1, side: THREE.DoubleSide })); tm.castShadow = true; tm.receiveShadow = true; tub.add(tm); const rim = new THREE.Mesh(new THREE.TorusGeometry(1.31, .07, 12, 48).rotateX(Math.PI / 2), tm.material); rim.position.y = .95; tub.add(rim);
    const wtr = new THREE.Mesh(new THREE.CircleGeometry(1.22, 40).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#8ad8ff', roughness: .05, transparent: true, opacity: .7, clearcoat: 1 })); wtr.position.y = .6; tub.add(wtr); for (const s of [-1, 1]) { const ft = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 10), std('#ffcf3a', { metalness: .7, roughness: .3 })); ft.position.set(s * .8, .02, .7); tub.add(ft); }
    for (let i = 0; i < 10; i++) { const b = new THREE.Mesh(foamGeo, foamM); const a = i / 10 * TAU; b.position.set(Math.cos(a) * 1.05, .65, Math.sin(a) * 1.05); b.scale.setScalar(rnd(.12, .2)); tub.add(b); }
    const duck = new THREE.Group(); const dm = std('#ffd21a', { roughness: .4 }); const db = new THREE.Mesh(new THREE.SphereGeometry(.16, 16, 12), dm); db.scale.set(1.2, .8, 1); duck.add(db); const dh = new THREE.Mesh(new THREE.SphereGeometry(.1, 14, 10), dm); dh.position.set(.12, .14, 0); duck.add(dh); const bk = new THREE.Mesh(new THREE.ConeGeometry(.04, .1, 8), std('#ff8a1a')); bk.rotation.z = -Math.PI / 2; bk.position.set(.25, .13, 0); duck.add(bk); duck.position.set(.75, .66, .5); tub.add(duck); tub.userData.duck = duck; }
  scene.add(tub); tub.position.set(0, 0, .2); tub.scale.set(1, .68, 1); tub.userData.duck.scale.y = 1 / .68; pet.g.position.set(0, .12, .2); AN.home = V3(0, .12, .2); foam.forEach(f => f.parent && f.parent.remove(f)); foam = []; bathStep = 0; dryAmt = 0; tool = '🧽'; if (!dirt.length) makeDirt(); renderBathTray(); A.noise(.6, 'lowpass', 900, 1, .06); }
function renderBathTray() { const steps = ['🧽', '🚿', '💨']; showTray(steps.map((k, i) => ({ e: k, k, on: tool === k, blink: i === bathStep && tool !== k })), 'bath'); hint([T('🧽 שפשפו את ' + P.name + ' עם הספוג – עד שיהיה מלא קצף!', '🧽 Scrub ' + P.name + ' with the sponge – lots of foam!'), T('🚿 עכשיו שטפו את כל הקצף!', '🚿 Now rinse off all the foam!'), T('💨 ייבשו עם המייבש!', '💨 Dry with the blow dryer!')][bathStep]); }
function bathRub(hit, e) { if (!hit) return; const p = hit.point; const local = hit.object.parent === pet.head || hit.object === pet.head ? pet.head : null;
  if (tool === '🧽') { if (bathStep !== 0) { if (bathStep > 0 && foam.length === 0 && bathStep < 2) { } } const par = isHead(hit.object) ? pet.head : pet.body; const lp = par.worldToLocal(p.clone()); if (foam.length < 70 && !foam.some(f => f.parent === par && f.position.distanceTo(lp) < .09)) { const f = new THREE.Mesh(foamGeo, foamM); f.scale.setScalar(rnd(.06, .11)); f.position.copy(lp); par.add(f); foam.push(f); if (Math.random() < .5) A.tone(1200 + Math.random() * 900, .05, 'sine', .025); }
    for (let i = dirt.length - 1; i >= 0; i--) { const d = dirt[i]; if (d.getWorldPosition(V3()).distanceTo(p) < .28) { d.parent.remove(d); dirt.splice(i, 1); } }
    if (bathStep === 0 && foam.length >= 28 && !dirt.length) { bathStep = 1; tool = '🚿'; renderBathTray(); A.voice('wow', pet.D.pitch); } AN.mood = 'happy'; AN.tPet = .4; }
  if (tool === '🚿') { for (let i = foam.length - 1; i >= 0; i--) { const f = foam[i]; if (f.getWorldPosition(V3()).distanceTo(p) < .35) { f.parent.remove(f); foam.splice(i, 1); FX.emit(p, V3(rnd(-.5, .5), -1, rnd(-.5, .5)), [.8, .9, 1], .06, .5, 4); } } if (bathStep === 1 && foam.length === 0) { bathStep = 2; tool = '💨'; renderBathTray(); } }
  if (tool === '💨') { if (bathStep === 2) { dryAmt += 1.6; GL.emit(p, V3(rnd(-1, 1), rnd(0, 1), rnd(-1, 1)), [1.6, 1.6, 2], .05, .5, 0); AN.ears = 1; if (dryAmt >= 100) bathDone(); } } }
function isHead(o) { while (o) { if (o === pet.head) return true; o = o.parent; } return false; }
function bathDone() { bathStep = 3; setNeed('c', 100); setNeed('l', P.n.l + 10); setNeed('f', P.n.f + 6); addXp(14); confetti(); happyJump(); A.voice('yay', pet.D.pitch); const [x, y] = scr(headW()); popAt('✨ ' + T('נקי ומבריק!', 'Squeaky clean!') + ' ✨', x, y - 100); coins(8, [x, y - 50]); for (let i = 0; i < 30; i++) GL.emit(V3(rnd(-.8, .8), rnd(.4, 2.2), rnd(-.3, .8)), V3(0, .4, 0), [2, 2, 1.6], .06, 1.2, 0); setTimeout(() => { if (mode === 'bath') setMode('home'); }, 1600); }
function endBath(force) { if (tub) scene.remove(tub); foam.forEach(f => f.parent && f.parent.remove(f)); foam = []; pet.g.position.set(0, 0, 0); AN.home = V3(0, 0, 0); if (P.n.c < 60) makeDirt(); else { for (const d of dirt) d.parent && d.parent.remove(d); dirt = []; } }

/* ---- play ---- */
let ball = null, bubbles = [], fetchState = 0;
const bubM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0, transparent: true, opacity: .3, iridescence: 1, iridescenceIOR: 1.3, clearcoat: 1, depthWrite: false });
function startPlay() { tool = '⚽'; renderPlayTray(); placeBall(); }
function renderPlayTray() { showTray([['⚽', T('כדור', 'Ball')], ['🫧', ''], ['🪶', '']].map(([k]) => ({ e: k, k, on: tool === k })), 'play'); hint({ '⚽': T('⚽ הקישו על הרצפה כדי לזרוק את הכדור!', '⚽ Tap the floor to throw the ball!'), '🫧': T('🫧 הקישו כדי לנפוח בועות!', '🫧 Tap to blow bubbles!'), '🪶': T('🪶 גררו את הנוצה ליד ' + P.name + '!', '🪶 Drag the feather near ' + P.name + '!') }[tool] || ''); }
function placeBall() { if (!ball) { const c = cnv(128, 64), g = c.getContext('2d'); g.fillStyle = '#ff3a5a'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#ffffff'; g.fillRect(0, 26, 128, 12); g.fillStyle = '#ffd23a'; g.fillRect(60, 0, 8, 64); ball = new THREE.Mesh(new THREE.SphereGeometry(.2, 24, 16), new THREE.MeshPhysicalMaterial({ map: tex(c), roughness: .35, clearcoat: .8 })); ball.castShadow = true; ball.userData.v = V3(); }
  if (tool !== '⚽') return; scene.add(ball); ball.position.set(.7, .2, 1.1); ball.userData.v.set(0, 0, 0); fetchState = 0; AN.carry = 0; }
function throwBall(to) { if (!ball || fetchState === 2 || fetchState === 3) return; const from = V3(0, .7, 1.2); ball.position.copy(from); const d = to.clone().sub(from); d.y = 0; const L = clamp(d.length(), .5, 4.5); d.normalize(); ball.userData.v.set(d.x * L * 1.6, 4.2, d.z * L * 1.6); fetchState = 1; AN.target = null; AN.carry = 0; A.noise(.15, 'bandpass', 600, 2, .08); AN.mood = 'happy'; setTimeout(() => AN.mood = 'idle', 500); }
function stepBall(dt) { if (!ball || !ball.parent) return; if (AN.carry) { ball.position.copy(mouthW()).add(V3(0, -.1, .08)); return; } const v = ball.userData.v; v.y -= 12 * dt; ball.position.addScaledVector(v, dt); if (ball.position.y < .2) { ball.position.y = .2; if (Math.abs(v.y) > 1) A.tone(160, .08, 'sine', .07); v.y = -v.y * .55; v.x *= .86; v.z *= .86; }
  for (const [ax, lo, hi] of [['x', -4.2, 4.2], ['z', -2.3, 3]]) { if (ball.position[ax] < lo) { ball.position[ax] = lo; v[ax] = -v[ax] * .6; } if (ball.position[ax] > hi) { ball.position[ax] = hi; v[ax] = -v[ax] * .6; } }
  ball.rotation.x += v.z * dt * 4; ball.rotation.z -= v.x * dt * 4;
  if (fetchState === 1 && Math.hypot(v.x, v.z) < 3) { fetchState = 2; AN.target = ball.position.clone().setY(0); A.voice('huh', pet.D.pitch); } }
function bubbleTap(x, y) { const w = unproj(x, y, .9); for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), bubM); b.scale.setScalar(rnd(.1, .2)); b.position.copy(w).add(V3(rnd(-.3, .3), rnd(-.2, .2), rnd(-.2, .2))); b.userData.v = V3(rnd(-.3, .3), rnd(.2, .5), rnd(-.2, .1)); b.userData.ph = Math.random() * 6; scene.add(b); bubbles.push(b); } A.tone(900, .1, 'sine', .04, 0, 1400); }
function popBubble(b, byPet) { scene.remove(b); bubbles.splice(bubbles.indexOf(b), 1); A.tone(1500 + Math.random() * 600, .05, 'sine', .06); GL.burst(b.position, 8, [[1.5, 1.8, 2.2], [2, 1.4, 2]], 1.2, .04, .4, 0); setNeed('f', P.n.f + (byPet ? 3 : 1.5)); setNeed('l', P.n.l + .5); addXp(1); if (Math.random() < .15) { const [x, y] = scr(b.position); coins(1, [x, y]); } }
function stepBubbles(dt, t) { const hp = headW(); for (const b of bubbles.slice()) { const v = b.userData.v; b.position.addScaledVector(v, dt); b.position.x += Math.sin(t * 2 + b.userData.ph) * .004; if (b.position.y > 4.5) { scene.remove(b); bubbles.splice(bubbles.indexOf(b), 1); continue; } if (b.position.distanceTo(hp) < .75 && AN.jump <= 0 && mode === 'play') { happyJump(.6); setTimeout(() => bubbles.includes(b) && popBubble(b, 1), 180); } }
  if (bubbles.length && mode === 'play') { let best = null, bd = 1e9; for (const b of bubbles) { const d = b.position.distanceTo(hp); if (d < bd) { bd = d; best = b; } } AN.look.copy(best.position); } }
let featherT = 0; function featherMove(e) { const [hx, hy] = scr(headW()); const d = Math.hypot(hx - e.clientX, hy - e.clientY); if (d < 160) { AN.mood = 'happy'; featherT += .016; setNeed('f', P.n.f + .25); setNeed('l', P.n.l + .08); if (AN.jump <= 0 && Math.random() < .05) { happyJump(.5); A.voice('huh', pet.D.pitch * 1.1); } if (featherT > 1.5) { featherT = 0; addXp(2); popAt('😆', hx + rnd(-40, 40), hy - 80); } } else AN.mood = 'idle'; }
function endPlay() { if (ball) scene.remove(ball); for (const b of bubbles) scene.remove(b); bubbles = []; AN.target = null; AN.carry = 0; fetchState = 0; }

/* ---- sleep ---- */
let zT = 0; function goSleep() { AN.sleep = 1; glass.material.map = SKY[1]; glass.material.needsUpdate = true; hint(T('ששש... ' + P.name + ' ישן/ה 😴 (לחצו 💤 כדי להעיר)', 'Shhh... ' + P.name + ' is sleeping 😴 (tap 💤 to wake)')); A.stopMusic(); }
function wake() { AN.sleep = 0; glass.material.map = SKY[0]; glass.material.needsUpdate = true; A.voice('yay', pet.D.pitch); happyJump(); startMusic(); }

/* ---- style ---- */
let wTab = 'hat'; function showWardrobe() { $('wd').hidden = false; $('wTabs').innerHTML = [['hat', '🎩'], ['glass', '👓'], ['neck', '🎀']].map(([k, e]) => `<button data-t="${k}" class="${wTab === k ? 'on' : ''}">${e} ${{ hat: T('כובע', 'Hat'), glass: T('משקפיים', 'Glasses'), neck: T('צוואר', 'Neck') }[k]}</button>`).join('');
  $('wList').innerHTML = ACC[wTab].map(([id, e, price]) => { const own = S.owned.includes(id) || !price; return `<div class="it ${P.acc[wTab] === id ? 'on' : ''} ${own ? '' : 'lk'}" data-w="${id}">${e}${own ? '' : `<small>🪙${price}</small>`}</div>`; }).join(''); hint(T('בחרו בגדים ואביזרים 💅', 'Pick outfits & accessories 💅')); }
$('wTabs').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; wTab = b.dataset.t; showWardrobe(); };
$('wList').onclick = e => { const b = e.target.closest('[data-w]'); if (!b) return; A.ac(); const id = b.dataset.w; const it = ACC[wTab].find(x => x[0] === id); const own = S.owned.includes(id) || !it[2];
  if (!own) { if (S.coins < it[2]) { toast(T(`צריך עוד ${it[2] - S.coins} 🪙 – שחקו וטפלו כדי להרוויח!`, `Need ${it[2] - S.coins} more 🪙 – play & care to earn!`)); A.tone(200, .15, 'sawtooth', .04); return; } S.coins -= it[2]; S.owned.push(id); A.tone(880, .1, 'triangle', .07); A.tone(1320, .2, 'triangle', .07, .1); confetti(); }
  P.acc[wTab] = id; setAcc(pet, P.acc); S.save(); updTop(); showWardrobe(); happyJump(.5); A.voice('wow', pet.D.pitch); setNeed('l', P.n.l + 2); };

/* ================= POINTER ON STAGE ================= */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function hitPet(x, y) { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(pet.hitMeshes, false); return h[0] || null; }
function unproj(x, y, zp = 2) { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); const r = ray.ray; const t = (zp - r.origin.z) / (r.direction.z || -1e-3); return r.origin.clone().addScaledVector(r.direction, Math.max(.5, t)); }
function floorAt(x, y) { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); const r = ray.ray; if (r.direction.y >= -.01) return null; const t = -r.origin.y / r.direction.y; return r.origin.clone().addScaledVector(r.direction, t); }
let down = null, strokeD = 0;
$('stage').addEventListener('pointerdown', e => { if (mode === 'title') return; A.ac(); down = { x: e.clientX, y: e.clientY, t: performance.now(), hit: hitPet(e.clientX, e.clientY) }; strokeD = 0; try { $('stage').setPointerCapture(e.pointerId); } catch (er) { }
  if (mode !== 'bath' && !AN.sleep) { const m = messAt(e.clientX, e.clientY); if (m) { down.hit = null; if (m.k === 'poop') { scoop(m); down = null; return; } down.mop = m; $('ghost').textContent = '🧽'; $('ghost').hidden = false; moveGhost(e); return; } }
  if (mode === 'bath') { $('ghost').textContent = tool; $('ghost').hidden = false; moveGhost(e); bathRub(down.hit, e); }
  if (mode === 'play' && tool === '🫧') { const b = pickBubble(e.clientX, e.clientY); if (b) popBubble(b); else bubbleTap(e.clientX, e.clientY); } });
$('stage').addEventListener('pointermove', e => { if (mode === 'title' || !pet) return; if (down && down.mop) { moveGhost(e); mopAt(down.mop, e); return; } if (!down) { if (mode === 'home' || mode === 'feed' || mode === 'style') AN.look.copy(unproj(e.clientX, e.clientY, 2.2)); return; }
  const h = hitPet(e.clientX, e.clientY); const mv = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  if (mode === 'bath') { moveGhost(e); bathRub(h, e); if (tool === '🚿') { const w = unproj(e.clientX, e.clientY, 1.0); for (let i = 0; i < 3; i++) FX.emit(w, V3(rnd(-.3, .3), -4, rnd(-.3, .3)), [.6, .85, 1], .05, .5, 8, .8); if (Math.random() < .3) A.noise(.08, 'highpass', 3000, 1, .03); } if (tool === '💨' && Math.random() < .3) A.noise(.1, 'bandpass', 900, 1, .04); return; }
  if ((mode === 'home' || mode === 'feed' || mode === 'style' || mode === 'play') && h && down.hit && mv > 8 && !AN.sleep) { strokeD += Math.hypot(e.movementX || 4, e.movementY || 4); AN.tPet = .6; AN.mood = 'happy'; setNeed('l', P.n.l + .35); if (strokeD > 60) { strokeD = 0; popAt(['💗', '💕', '💖', '✨'][Math.random() * 4 | 0], e.clientX + rnd(-20, 20), e.clientY - 30); addXp(1); } } });
$('stage').addEventListener('pointerup', e => { if (down && down.mop) { $('ghost').hidden = true; down = null; return; } if (!down || !pet) { down = null; return; } const quick = performance.now() - down.t < 280 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12; $('ghost').hidden = mode !== 'bath' ? true : true;
  if (quick && mode === 'play' && tool === '⚽') { const f = floorAt(e.clientX, e.clientY); if (f) throwBall(f); }
  else if (quick && down.hit && !AN.sleep && (mode === 'home' || mode === 'style' || mode === 'feed')) { AN.giggle = .8; happyJump(.55); A.voice(Math.random() < .5 ? 'huh' : 'yay', pet.D.pitch * 1.1); setNeed('f', P.n.f + 1); setNeed('l', P.n.l + 1); popAt(['😆', '🤭', '💕'][Math.random() * 3 | 0], e.clientX, e.clientY - 40); }
  if (AN.mood === 'happy' && mode !== 'bath') setTimeout(() => { if (AN.tPet <= 0) AN.mood = 'idle'; }, 400); down = null; });
function pickBubble(x, y) { let best = null, bd = 50; for (const b of bubbles) { const [bx, by] = scr(b.position); const d = Math.hypot(bx - x, by - y); if (d < bd) { bd = d; best = b; } } return best; }
function happyJump(s = 1) { if (AN.jump > 0) return; AN.jump = .001; AN.jumpV = 3.2 * s; }


/* ================= POOP & PEE ================= */
let mess = [], pooT = 0, peeT = 70, stinkT = 0;
const pooM = std('#7a4a22', { roughness: .45 }), pooHi = std('#9a6232', { roughness: .4 });
function notNow(txt) { AN.shake = .6; A.voice('hm', pet.D.pitch); const [x, y] = scr(headW()); popAt(txt, x, y - 90); A.tone(260, .12, 'triangle', .05); }
function pooMesh() { const g = new THREE.Group(); const tiers = [[.2, .075, 0], [.15, .065, .1], [.1, .055, .19]]; for (const [r, tb, y] of tiers) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, tb, 12, 28).rotateX(Math.PI / 2), pooM); t.position.y = y + .06; t.scale.y = 1.25; g.add(t); } const c = new THREE.Mesh(new THREE.SphereGeometry(.1, 14, 10), pooM); c.position.y = .08; c.scale.set(1.6, .8, 1.6); g.add(c); const tip = new THREE.Mesh(new THREE.ConeGeometry(.07, .16, 14), pooHi); tip.position.y = .3; tip.rotation.z = .3; g.add(tip);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.SphereGeometry(.048, 12, 10), std('#ffffff', { roughness: .2 })); w.position.set(s * .075, .25, .2); g.add(w); const b = new THREE.Mesh(new THREE.SphereGeometry(.024, 10, 8), std('#1a1010')); b.position.set(s * .075, .25, .245); g.add(b); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(.9); return g; }
function peeMesh() { const sh = new THREE.Shape(); const n = 14, r0 = rng(Date.now() & 1023); for (let i = 0; i <= n; i++) { const a = i / n * TAU, r = .32 + r0() * .1; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r * .75) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r * .75); } const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 6).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#f2c200', roughness: .05, clearcoat: 1, transparent: true, opacity: .82, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); m.position.y = .012; m.renderOrder = 2; return m; }
function addMessMesh(m) { m.mesh = m.k === 'poop' ? pooMesh() : peeMesh(); m.mesh.position.set(m.x, m.k === 'poop' ? 0 : .012, m.z); m.amt = m.amt == null ? 1 : m.amt; if (m.k === 'pee') m.mesh.scale.setScalar(.4 + m.amt * .6); scene.add(m.mesh); }
function clearMessMeshes() { for (const m of mess) m.mesh && scene.remove(m.mesh); mess = []; }
function loadMess() { clearMessMeshes(); P.mess = (P.mess || []).slice(0, 5); mess = P.mess.map(o => ({ ...o })); mess.forEach(addMessMesh); if ((P.gut || 0) >= 3) pooT = rnd(6, 12); }
function saveMess() { P.mess = mess.map(m => ({ k: m.k, x: m.x, z: m.z, amt: m.amt })); S.save(); }
function messSpot() { for (let i = 0; i < 20; i++) { const s = Math.random() < .5 ? -1 : 1; const x = s * rnd(.65, 1.05), z = rnd(.35, 1.05); if (!mess.some(m => Math.hypot(m.x - x, m.z - z) < .5)) return [x, z]; } return [rnd(-1, 1), rnd(.4, 1)]; }
function doMess(k) { if (mess.length >= 5) return; const [x, z] = messSpot(); const m = { k, x, z, amt: 1 }; mess.push(m); addMessMesh(m); m.mesh.scale.setScalar(.01); m.pop = 0;
  AN.shake = .5; A.voice('huh', pet.D.pitch * .9); const [sx, sy] = scr(headW()); popAt(k === 'poop' ? T('💩 אופס! עשיתי קקי', '💩 Oops! I pooped') : T('💦 אופס! עשיתי פיפי', '💦 Oops! I peed'), sx, sy - 100);
  if (k === 'poop') { A.tone(140, .18, 'sawtooth', .06); A.tone(90, .25, 'sine', .07, .12); P.gut = 0; setNeed('c', P.n.c - 6); } else { A.noise(.7, 'bandpass', 2400, 3, .05); setNeed('c', P.n.c - 4); } saveMess(); updNeeds(); }
function messAt(x, y) { let best = null, bd = 1e9; for (const m of mess) { const [mx, my] = scr(m.mesh.position.clone().setY(m.k === 'poop' ? .15 : 0)); const d = Math.hypot(mx - x, my - y); const r = (m.k === 'poop' ? 55 : 75) * Math.max(.8, innerHeight / 900); if (d < r && d < bd) { bd = d; best = m; } } return best; }
function scoop(m) { const p = m.mesh.position.clone(); m.gone = 1; m.shrink = 1; mess.splice(mess.indexOf(m), 1); A.tone(660, .08, 'triangle', .06); A.tone(990, .14, 'triangle', .06, .08); GL.burst(p.clone().setY(.2), 14, [[2, 2, 1.6], [1.6, 2, 2]], 1.4, .05, .6, 0); const [x, y] = scr(p); popAt('🧻 ' + T('נקי!', 'Clean!'), x, y - 40); messReward(x, y); fading.push(m); saveMess(); updNeeds(); }
function mopAt(m, e) { if (!mess.includes(m)) return; const [mx, my] = scr(m.mesh.position); if (Math.hypot(mx - e.clientX, my - e.clientY) > 110 * Math.max(.8, innerHeight / 900)) return; m.amt -= .012 * Math.min(4, Math.hypot(e.movementX || 3, e.movementY || 3) / 3); if (Math.random() < .25) { A.noise(.06, 'bandpass', 3200, 2, .03); FX.emit(m.mesh.position.clone().setY(.05), V3(rnd(-.6, .6), rnd(.3, .9), rnd(-.6, .6)), [1, .95, .6], .04, .4, 6); }
  m.mesh.scale.setScalar(Math.max(.05, .4 + m.amt * .6)); m.mesh.material.opacity = .82 * Math.max(.1, m.amt); if (m.amt <= 0) { scene.remove(m.mesh); mess.splice(mess.indexOf(m), 1); const [x, y] = scr(m.mesh.position); popAt('✨ ' + T('ניגבתי!', 'Mopped!'), x, y - 40); A.tone(880, .1, 'triangle', .06); A.tone(1320, .18, 'triangle', .06, .1); messReward(x, y); saveMess(); updNeeds(); } }
const fading = [];
function messReward(x, y) { setNeed('c', P.n.c + 8); setNeed('l', P.n.l + 4); addXp(4); coins(2, [x, y]); if (!mess.length) { happyJump(.8); A.voice('yay', pet.D.pitch); const [hx, hy] = scr(headW()); popAt(T('תודה! 💕', 'Thank you! 💕'), hx, hy - 100); } }
function stepMess(dt, t) { for (let i = fading.length - 1; i >= 0; i--) { const m = fading[i]; m.shrink -= dt * 4; m.mesh.scale.setScalar(Math.max(.001, m.shrink * .9)); m.mesh.position.y += dt * .8; if (m.shrink <= 0) { scene.remove(m.mesh); fading.splice(i, 1); } }
  for (const m of mess) { if (m.pop != null && m.pop < 1) { m.pop = Math.min(1, m.pop + dt * 3); const k = m.k === 'poop' ? .9 : .4 + m.amt * .6; m.mesh.scale.setScalar(k * (m.pop < 1 ? 1 + Math.sin(m.pop * Math.PI) * .25 : 1)); } if (m.k === 'poop') m.mesh.rotation.y = Math.sin(t * 1.5 + m.x * 5) * .15; }
  if (mode === 'title' || AN.sleep || mode === 'bath') return;
  stinkT -= dt; if (stinkT < 0) { stinkT = .35; for (const m of mess) if (m.k === 'poop') FX.emit(m.mesh.position.clone().add(V3(rnd(-.08, .08), .35, 0)), V3(rnd(-.1, .1), .5, 0), [.55, .75, .3], .05, 1.1, 0); }
  if (mess.length && Math.random() < dt * .25) { setNeed('c', P.n.c - .4); setNeed('l', P.n.l - .2); }
  if (pooT > 0) { pooT -= dt; if (pooT <= 0) { pooT = 0; if (AN.eat <= 0 && !AN.target) doMess('poop'); else pooT = 3; } }
  peeT -= dt; if (peeT <= 0) { peeT = rnd(80, 140); if (mode === 'home' && mess.length < 4 && !AN.target) doMess('pee'); } }
function updTask() { const el = $('task'); if (!el) return; const pc = mess.filter(m => m.k === 'poop').length, wc = mess.length - pc; el.hidden = !mess.length || mode === 'title'; if (mess.length) el.innerHTML = `🧹 ${T('משימה', 'Task')}: ${pc ? `💩×${pc} <small>${T('הקישו', 'tap')}</small>` : ''} ${wc ? `💦×${wc} <small>${T('נגבו באצבע', 'wipe')}</small>` : ''}`; }

/* ================= ANIMATE ================= */
let purrOn = 0;
const DUMMY = { n: { h: 90, c: 90, f: 90, e: 90, l: 90 } };
function animate(dt, t) { const R = pet; if (!R) return; const D = R.D; const P = window.__P || DUMMY;
  const sad = Math.min(P.n.h, P.n.c, P.n.f, P.n.e, P.n.l) < 20 && !AN.sleep;
  // walking toward target (fetch)
  let walking = false; if (AN.target) { const to = AN.target.clone().sub(R.g.position); to.y = 0; const d = to.length(); if (d > .45) { walking = true; to.normalize(); R.g.position.addScaledVector(to, Math.min(d, 2.6 * dt)); R.g.rotation.y = lerp(R.g.rotation.y, Math.atan2(to.x, to.z), Math.min(1, dt * 10)); }
    else { if (fetchState === 2) { AN.carry = 1; fetchState = 3; AN.target = V3(0, 0, .9); A.voice('yay', D.pitch); } else if (fetchState === 3) { fetchState = 0; AN.carry = 0; AN.target = null; ball.position.set(0, .2, 1.5); ball.userData.v.set(rnd(-.5, .5), 1.5, 1.2); setNeed('f', P.n.f + 12); setNeed('l', P.n.l + 3); setNeed('e', P.n.e - 2); addXp(6); const [x, y] = scr(headW()); popAt('🐾 ' + T('הבאתי!', 'Got it!'), x, y - 90); coins(2, [x, y - 50]); happyJump(.7); } } }
  if (!walking && !AN.target) { const home = AN.home || V3(); R.g.position.x = lerp(R.g.position.x, home.x, dt * 3); R.g.position.z = lerp(R.g.position.z, home.z, dt * 3); R.g.rotation.y = lerp(R.g.rotation.y, 0, Math.min(1, dt * 5)); }
  // jump
  let y = 0; if (AN.jump > 0) { AN.jump += dt; AN.jumpV -= 14 * dt; R.root.position.y += AN.jumpV * dt; if (R.root.position.y <= 0) { R.root.position.y = 0; AN.jump = 0; } } y = R.root.position.y;
  if (D.float && !AN.sleep) { R.root.position.y = Math.max(y, 0) + (AN.jump > 0 ? 0 : 0); R.g.position.y = (AN.home ? AN.home.y : 0) + .22 + Math.sin(t * 2) * .07; if (R.ring) { R.ring.position.y = -R.g.position.y + .02; R.ring.material.opacity = .25 + Math.sin(t * 2) * .08; } }
  // breathing & body
  const br = Math.sin(t * (AN.sleep ? 1.4 : 2.2)); R.body.scale.set(1 + br * .012, 1 + br * .02, 1 + br * .012);
  // sleep pose
  const sl = AN.sleep ? 1 : 0; R.root.rotation.x = lerp(R.root.rotation.x, 0, dt * 4); R.head.position.y = lerp(R.head.position.y, 1.42 - sl * .2, dt * 3); R.head.rotation.z = lerp(R.head.rotation.z, sl * .35 + (AN.shake ? Math.sin(t * 30) * .25 : 0), dt * 6);
  for (let i = 0; i < R.legs.length; i++) { const lg = R.legs[i]; if (walking) lg.rotation.x = Math.sin(t * 14 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * .6; else lg.rotation.x = lerp(lg.rotation.x, sl * (i < 2 ? -1.2 : 0), dt * 6); }
  if (walking) R.root.position.y = Math.abs(Math.sin(t * 14)) * .06;
  if (AN.shake) { AN.shake -= dt; if (AN.shake < 0) AN.shake = 0; }
  // head look
  const hp = R.head.getWorldPosition(V3()); const lk = AN.look.clone(); const dir = lk.sub(hp); const yaw = clamp(Math.atan2(dir.x, dir.z) - R.g.rotation.y, -.7, .7), pitch = clamp(-Math.atan2(dir.y, Math.hypot(dir.x, dir.z)), -.45, .45);
  R.head.rotation.y = lerp(R.head.rotation.y, AN.sleep ? 0 : yaw, dt * 6); R.head.rotation.x = lerp(R.head.rotation.x, AN.sleep ? .3 : pitch + (AN.eat > 0 ? Math.sin(t * 20) * .08 : 0), dt * 6);
  // expressions
  AN.blinkT -= dt; const blink = AN.blinkT < .12; if (AN.blinkT < 0) AN.blinkT = rnd(2, 4.5); AN.tPet -= dt; if (AN.eat > 0) { AN.eat -= dt; if (AN.eat <= 0) AN.mood = 'idle'; }
  const m = AN.sleep ? 'sleep' : AN.eat > 0 ? 'eat' : AN.mood === 'happy' || AN.tPet > 0 || AN.jump > 0 ? 'happy' : AN.mood === 'open' ? 'open' : sad ? 'sad' : 'idle';
  const eOpen = m === 'idle' || m === 'open' || m === 'sad' || m === 'eat'; const es0 = [1.18, 1.08, 1][R.stage || 0]; R.eyes.forEach(e => { e.visible = eOpen; e.scale.y = es0 * (blink ? .12 : (m === 'sad' ? .8 : 1)); }); R.happyE.forEach(e => e.visible = m === 'happy'); R.sleepE.forEach(e => e.visible = m === 'sleep');
  R.smile.visible = m === 'idle'; R.sad.visible = m === 'sad'; R.openM.visible = m === 'happy' || m === 'open' || (m === 'eat' && Math.sin(t * 22) > 0); R.openM.scale.setScalar(m === 'open' ? 1.3 : 1);
  // ears & tail
  const happyLv = (P.n.l + P.n.f) / 200; R.ears.forEach((ep, i) => { const s = i ? 1 : -1; if (D.ear === 'flop') ep.rotation.z = s * (.35 + (sad ? .4 : 0)) + Math.sin(t * 3 + i) * .05 + (AN.jump > 0 ? s * -.4 : 0); if (D.ear === 'bun') ep.rotation.z = -s * .15 + (sad ? s * .9 : 0) + Math.sin(t * 2.3 + i * 2) * .06; if (D.ear === 'cat') ep.rotation.x = Math.max(0, Math.sin(t * 1.7 + i * 3)) > .97 ? -.3 : 0; if (D.ear === 'ant') ep.rotation.x = Math.sin(t * 3 + i) * .15; });
  if (D.tail) { const sp = AN.tPet > 0 || AN.jump > 0 || AN.carry ? 16 : 4 + happyLv * 6; R.tail.rotation.y = Math.sin(t * sp) * (D.tail === 'wag' ? .7 : .25); }
  // purr sound while petting
  if (AN.tPet > 0 && !purrOn) { purrOn = 1; A.loopTone('purr', 'sawtooth', D.pitch * 38, .02); } else if (AN.tPet <= 0 && purrOn) { purrOn = 0; A.loopOff('purr'); }
  // zzz
  if (AN.sleep) { zT -= dt; if (zT < 0) { zT = 1.2; const [x, yy] = scr(headW()); popAt('💤', x + 40, yy - 60, '#6a6aff'); } setNeed('e', P.n.e + dt * 6); if (P.n.e >= 100) { setMode('home'); const [x, yy] = scr(headW()); popAt(T('בוקר טוב! ☀️', 'Good morning! ☀️'), x, yy - 100); addXp(5); } }
  // lights
  const night = AN.sleep ? 1 : 0; hemi.intensity = lerp(hemi.intensity, night ? .25 : 1.1, dt * 2); key.intensity = lerp(key.intensity, night ? .2 : 2.2, dt * 2); warm.intensity = lerp(warm.intensity, night ? 6 : 1.5, dt * 2); shade.material.emissiveIntensity = night ? 1.6 : .7;
  // thought bubble
  const showB = AN.want && mode === 'home' && !AN.sleep; const bub = $('bub'); if (showB) { const [x, yy] = scr(headW().add(V3(.55, .55, 0))); bub.style.left = x + 'px'; bub.style.top = yy + 'px'; if (bub.textContent !== AN.want) bub.textContent = AN.want; } bub.classList.toggle('on', !!showB); }
let decayT = 0;
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; A.tick(); const t = now / 1000; update(dt, t); E.render(); }
function update(dt, t) { xpBud = Math.min(20, xpBud + dt * .6); if (pet && mode !== 'title') { animate(dt, t); stepBall(dt); stepBubbles(dt, t); stepMess(dt, t);
    decayT += dt; if (decayT > 1) { decayT = 0; for (const k in DECAY) if (!(k === 'e' && AN.sleep)) P.n[k] = Math.max(0, P.n[k] - DECAY[k] / 60 * (k === 'c' && mode === 'bath' ? 0 : 1)); P.t = Date.now(); updNeeds(); if (P.n.c < 60 && !dirt.length && mode === 'home') makeDirt(); if (Math.random() < .1) S.save(); } }
  else if (pet) { animate(dt, t); }
  if (tub && tub.parent) tub.userData.duck.position.y = .63 + Math.sin(t * 3) * .04;
  FX.update(dt, .02); GL.update(dt); fit(); }
let lastAsp = 0; function fit() { const asp = innerWidth / innerHeight; if (asp === lastAsp) return; lastAsp = asp; const port = asp < 1; camera.fov = port ? 46 : 36; const hw = mode === 'title' ? 1.45 : 1.25; const d = clamp(hw / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * asp), 3.8, 8); camera.position.set(0, port ? 1.75 : 1.6, d); camera.lookAt(0, port ? (mode === 'title' ? 1.55 : .9) : 1.05, 0); camera.updateProjectionMatrix(); }
addEventListener('resize', () => { lastAsp = 0; });
function startMusic() { A.startMusic({ chords: [[60, 64, 67], [65, 69, 72], [62, 65, 69], [67, 71, 74]], bpm: 96, lead: true, vol: .45 }); }

/* ================= TITLE / FLOW ================= */
function renderTitle() { $('tSub').textContent = T('בחרו חבר לגדל – האכילו, רחצו, שחקו, ליטפו והלבישו! 💕', 'Pick a pal to raise – feed, bathe, play, cuddle and dress up! 💕');
  $('pets').innerHTML = SPK.map(k => { const D = SPEC[k], p = S.pets[k]; return `<button class="pc ${k === sel ? 'on' : ''} ${k === 'alien' ? 'alien' : ''}" data-p="${k}"><i>${D.ic}</i>${p ? p.name : D.n}<small>${p ? T('רמה ', 'Lv ') + p.lvl : T('חדש!', 'New!')}</small></button>`; }).join('');
  $('nameIn').value = (S.pets[sel] && S.pets[sel].name) || SPEC[sel].nm; $('nameIn').placeholder = T('שם', 'Name'); $('goBtn').textContent = S.pets[sel] ? T('💕 לשחק עם ', '💕 Play with ') + S.pets[sel].name : T('🏠 לאמץ את ', '🏠 Adopt ') + ($('nameIn').value || SPEC[sel].nm); showPet(sel); }
$('pets').onclick = e => { const b = e.target.closest('[data-p]'); if (!b) return; A.ac(); sel = b.dataset.p; A.voice('yay', SPEC[sel].pitch); renderTitle(); happyJump(.6); };
$('nameIn').oninput = () => { if (!S.pets[sel]) $('goBtn').textContent = T('🏠 לאמץ את ', '🏠 Adopt ') + ($('nameIn').value || SPEC[sel].nm); };
function showPet(sp) { if (pet) scene.remove(pet.g); const p = S.pets[sp]; pet = buildPet(sp, p ? p.acc : { neck: 'collar' }); scene.add(pet.g); AN.home = V3(); AN.look.set(0, 1.3, 5); dirt = []; }
$('goBtn').onclick = () => { A.ac(); lastAsp = 0; const fresh = !S.pets[sel]; P = petData(sel); window.__P = P; const nm = $('nameIn').value.trim(); if (nm) P.name = nm; applyOffline(P); S.cur = sel; S.save(); showPet(sel); $('title').hidden = true; ['top', 'needs', 'dock'].forEach(id => $(id).hidden = false); mode = 'home'; loadMess(); updTop(); updNeeds(); if (P.n.c < 60) makeDirt(); startMusic();
  if (fresh) { confetti(); A.voice('yay', pet.D.pitch); setTimeout(() => toast(T('ליטפו את ' + P.name + ' באצבע, ותטפלו בכל מה שצריך 💕', 'Stroke ' + P.name + ' with your finger and take care of every need 💕'), 4200), 600); } happyJump(); };
$('backBtn').onclick = () => { setMode('home'); clearMessMeshes(); mode = 'title'; window.__P = null; S.save(); ['top', 'needs', 'dock', 'tray', 'wd', 'task'].forEach(id => $(id).hidden = true); $('bub').classList.remove('on'); hint(''); A.stopMusic(); A.allOff(); purrOn = 0; $('title').hidden = false; lastAsp = 0; renderTitle(); };
$('sndBtn').innerHTML = S.mute ? SND_OFF('#8a2a5a') : SND_ON('#8a2a5a'); $('sndBtn').onclick = () => { A.setMute(!S.mute); S.save(); $('sndBtn').innerHTML = S.mute ? SND_OFF('#8a2a5a') : SND_ON('#8a2a5a'); };
document.addEventListener('visibilitychange', () => { if (document.hidden) { S.save(); A.allOff(); purrOn = 0; } });
$('homeT').innerHTML = ICO.home('#8a2a5a'); hubButtons(['homeT'], A); qualityButton('qBtn', S);
if (EN) { document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr'; }
E.resize(); $('title').hidden = false; renderTitle(); setTimeout(() => { $('loading').hidden = true; requestAnimationFrame(frame); window.__petOK = true; }, 30);
window.__pt = { doMess, get mess() { return mess; }, get xpBud() { return xpBud; }, scene, get tub() { return tub; }, get pet() { return pet; }, get P() { return P; }, get mode() { return mode; }, setMode, S, AN, eat, scr, headW, mouthW, throwBall, get foam() { return foam; }, get bathStep() { return bathStep; }, update };
