import { THREE, $, V3, C, clamp, lerp, rnd, rng, T, isTouch, store, engine, studioEnv, std, shadowAll, cnv, ctex, particles, audio, toast, ICO, hubButtons, soundButton, qualityButton, cutie } from '../lib/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const S = store('dash-save', { best: 0, coins: 0, char: 0, owned: [0], up: { mag: 0, jet: 0, x2: 0, shield: 0 }, tut: 0, runs: 0 });
const E = engine(S, { fov: 64, far: 260, bloom: [.22, .45, 1.1], exposure: 1.08, vignette: .2, sat: 1.15 });
const { scene, camera, renderer } = E; studioEnv(E, '#eaf4ff', '#8a8a7a', .55);
const A = audio(S); const FX = particles(E, 1200);
const LW = 2.3, CH = 64, G = 34;
const LANES = [-LW, 0, LW];

/* ================= CHARACTERS ================= */
const CHARS = [
  { n: 'Rex', price: 0, look: { skin: '#f2c3a0', shirt: '#ff5a1f', pants: '#2a3a6a', hair: '#5a3a1a', cap: '#ffd23a' } },
  { n: 'Nova', price: 400, look: { skin: '#c98e6a', shirt: '#8a3aff', pants: '#2a2a3a', hair: '#1a1a1a', long: true } },
  { n: 'Kai', price: 900, look: { skin: '#8a5a3c', shirt: '#1aa88a', pants: '#e8e8f0', hair: '#1a1a1a', cap: '#ff3a6a' } },
  { n: 'Luna', price: 1800, look: { skin: '#ffd8c0', shirt: '#ff6ab0', pants: '#3a6aff', hair: '#ffd23a', long: true, glasses: '#1a1a2a' } },
  { n: 'Bolt', price: 3500, look: { skin: '#e0ac82', shirt: '#ffd23a', pants: '#1a1a1a', hair: '#ff3a1a', cap: '#1a1a1a', glasses: '#ff3a3a' } },
];
const UPS = [['mag', '🧲', T('מגנט', 'Magnet')], ['jet', '👟', T('נעלי קפיץ', 'Spring shoes')], ['x2', '✖️2', T('כפול מטבעות', 'Double coins')], ['shield', '🫧', T('בועת מגן', 'Shield bubble')]];
const upDur = k => 8 + (S.up[k] || 0) * 3, upCost = k => 300 * Math.pow(2, S.up[k] || 0);

/* ================= WORLD ================= */
scene.fog = new THREE.Fog('#bfe4ff', 70, 200); renderer.setClearColor('#bfe4ff');
const skyM = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { a: { value: C('#5ab4ff') }, b: { value: C('#e8f6ff') } }, vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }', fragmentShader: 'uniform vec3 a; uniform vec3 b; varying vec3 vP; void main(){ float h = normalize(vP).y; gl_FragColor = vec4(mix(b, a, smoothstep(0., .5, h)), 1.); }' });
const sky = new THREE.Mesh(new THREE.SphereGeometry(240, 20, 10), skyM); scene.add(sky);
scene.add(new THREE.HemisphereLight('#ffffff', '#8a7a6a', .9)); const sun = new THREE.DirectionalLight('#fff4e0', 2.4); sun.castShadow = renderer.shadowMap.enabled; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 }); sun.shadow.bias = -.0005; scene.add(sun, sun.target);
const road = (() => { const c = cnv(256, 512), x = c.getContext('2d'); x.fillStyle = '#4a4a56'; x.fillRect(0, 0, 256, 512); for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? 255 : 0},${Math.random() < .5 ? 255 : 0},255,${Math.random() * .05})`; x.fillRect(Math.random() * 256, Math.random() * 512, 2, 2); } x.fillStyle = '#f4f4f4'; for (const lx of [85, 171]) for (let y = 0; y < 512; y += 128) x.fillRect(lx - 3, y + 20, 6, 70); x.fillStyle = '#ffd23a'; x.fillRect(4, 0, 6, 512); x.fillRect(246, 0, 6, 512); return ctex(c, 1, CH / 16); })();
const walk = (() => { const c = cnv(128, 128), x = c.getContext('2d'); x.fillStyle = '#d8cfc4'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#b8ada0'; x.lineWidth = 3; for (let i = 0; i <= 128; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); } return ctex(c, 2, CH / 4); })();
const winT = (() => { const c = cnv(128, 256), x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 256); for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { x.fillStyle = Math.random() < .3 ? '#ffe9a8' : '#3a4a6a'; x.fillRect(10 + i * 30, 12 + j * 30, 18, 20); x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(10 + i * 30, 30 + j * 30, 18, 3); } return ctex(c, 1, 1); })();
const BCOL = ['#ff8a7a', '#ffd27a', '#8ad0ff', '#b8a0ff', '#8ae0a8', '#ffb0d8', '#f4e0c8', '#a8c8e8'].map(c => new THREE.MeshStandardMaterial({ color: c, map: winT, roughness: .8 }));
const roofM = std('#5a5a6a', { roughness: .9 });
const coinG = new THREE.CylinderGeometry(.34, .34, .09, 18); coinG.rotateX(Math.PI / 2); const coinM = new THREE.MeshStandardMaterial({ color: '#ffd23a', metalness: .85, roughness: .25, emissive: C('#a86a00'), emissiveIntensity: .35 });
const truckBody = new RoundedBoxGeometry(1.9, 2.4, 1, 3, .18); const ramp = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(4, 0); s.lineTo(4, 2.45); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 1.8, bevelEnabled: false }); g.translate(-4, 0, -.9); g.rotateY(Math.PI / 2); return g; })();
const TRUCKC = ['#e8302a', '#2a7aff', '#2ab06a', '#ff8a1a', '#9a5aff', '#ffffff'].map(c => std(c, { roughness: .35, metalness: .1 }));
const darkM = std('#2a2a32'), glassM = new THREE.MeshStandardMaterial({ color: '#9ad8ff', metalness: .5, roughness: .1 }), whiteM = std('#f4f4f4'), stripeM = (() => { const c = cnv(64, 16), x = c.getContext('2d'); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#ff3a2a'; x.fillRect(i * 8, 0, 8, 16); } return new THREE.MeshStandardMaterial({ map: ctex(c, 3, 1), roughness: .5 }); })();
const chunks = []; let nextZ = 0;
function mkTruck(len, col, rampOn) { const g = new THREE.Group(); const b = new THREE.Mesh(truckBody, TRUCKC[col]); b.scale.z = len; b.position.y = 1.4; g.add(b); const cab = new THREE.Mesh(new RoundedBoxGeometry(1.9, 1.6, 1.6, 2, .2), TRUCKC[col]); cab.position.set(0, 1, len / 2 + .9); g.add(cab); const w = new THREE.Mesh(new THREE.BoxGeometry(1.7, .6, .1), glassM); w.position.set(0, 1.4, len / 2 + 1.71); g.add(w);
  for (const zz of [-len / 2 + 1, len / 2 - 1, len / 2 + 1]) for (const s of [-1, 1]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .3, 14), darkM); wh.rotation.z = Math.PI / 2; wh.position.set(s * .9, .42, zz); g.add(wh); }
  if (rampOn) { const r = new THREE.Mesh(ramp, std('#c8c8d0', { metalness: .6, roughness: .4 })); r.position.set(0, 0, -len / 2); r.rotation.y = Math.PI; g.add(r); } return shadowAll(g, true, true); }
function buildChunk(z0, diff) { const g = new THREE.Group(); g.position.z = z0; scene.add(g); const r = rng((Math.floor(-z0 * 13) + runSeed) | 0); const ch = { g, z0, obs: [], coins: [], pows: [] };
  const rd = new THREE.Mesh(new THREE.PlaneGeometry(LW * 3 + 1.2, CH), new THREE.MeshStandardMaterial({ map: road, roughness: .85 })); rd.rotation.x = -Math.PI / 2; rd.position.z = -CH / 2; rd.receiveShadow = true; g.add(rd);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(5, .3, CH), new THREE.MeshStandardMaterial({ map: walk, roughness: .9 })); w.position.set(s * (LW * 1.5 + .6 + 2.5), .15, -CH / 2); w.receiveShadow = true; g.add(w);
    for (let z = 0; z < CH;) { const wd = 6 + r() * 6, h = 6 + r() * 16, dp = 6 + r() * 4; const b = new THREE.Mesh(new THREE.BoxGeometry(dp, h, wd), BCOL[Math.floor(r() * BCOL.length)]); b.position.set(s * (LW * 1.5 + 5.6 + dp / 2), h / 2, -z - wd / 2); b.castShadow = b.receiveShadow = true; g.add(b); const rf = new THREE.Mesh(new THREE.BoxGeometry(dp + .4, .4, wd + .4), roofM); rf.position.set(b.position.x, h + .2, b.position.z); g.add(rf);
      if (r() < .45) { const aw = new THREE.Mesh(new THREE.BoxGeometry(1.2, .12, wd * .7), stripeM); aw.position.set(s * (LW * 1.5 + 5.1), 3, -z - wd / 2); aw.rotation.z = s * .35; g.add(aw); } z += wd + .2; }
    for (let z = 4; z < CH; z += 16) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 5, 6), darkM); p.position.set(s * (LW * 1.5 + 1.4), 2.5, -z); g.add(p); const l = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff', emissive: C('#ffe8a0'), emissiveIntensity: 1.2 })); l.position.set(s * (LW * 1.5 + 1.0), 5, -z); g.add(l); const t = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), std('#4ab84a', { flatShading: true })); t.position.set(s * (LW * 1.5 + 2.6), 3.2, -z - 8); t.castShadow = true; g.add(t); const tk = new THREE.Mesh(new THREE.CylinderGeometry(.15, .2, 2.4, 6), std('#7a4a2a')); tk.position.set(s * (LW * 1.5 + 2.6), 1.4, -z - 8); g.add(tk); } }
  if (z0 > -40) { chunks.push(ch); return ch; }
  // obstacles: rows
  const gap = lerp(15, 9.5, diff); let z = 6 + r() * 4; const lastFree = [];
  while (z < CH - 6) { const kinds = [0, 0, 0]; const roll = r();
    if (roll < .22 + diff * .12) { // trucks row
      const n = r() < .3 + diff * .3 ? 2 : 1; const lanes = [0, 1, 2].sort(() => r() - .5).slice(0, n); const len = 8 + Math.floor(r() * 8); for (const ln of lanes) { const rampOn = r() < .45; const t = mkTruck(len, Math.floor(r() * TRUCKC.length), rampOn); t.position.set(LANES[ln], 0, -(z + len / 2)); g.add(t); ch.obs.push({ k: 'truck', lane: ln, z0: z0 - z - len - 1.8, z1: z0 - z + (rampOn ? 4 : 0), top: 2.6, rampZ: rampOn ? z0 - z : null, len });
        if (rampOn || r() < .4) for (let k = 0; k < Math.floor(len / 2); k++) addCoin(ch, ln, z + 1 + k * 2, 3.2); } z += len + gap * .7; continue; }
    let free = Math.floor(r() * 3); for (let ln = 0; ln < 3; ln++) { if (ln === free && r() < .8) continue; const q = r(); kinds[ln] = q < .45 ? 'hurdle' : q < .78 ? 'bar' : 'cone'; }
    for (let ln = 0; ln < 3; ln++) { const k = kinds[ln]; if (!k) continue; const x = LANES[ln], o = new THREE.Group(); o.position.set(x, 0, -z); g.add(o);
      if (k === 'hurdle') { const b = new THREE.Mesh(new THREE.BoxGeometry(2, .32, .25), stripeM); b.position.y = .85; o.add(b); for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.14, .9, .2), whiteM); p.position.set(s * .9, .45, 0); o.add(p); } ch.obs.push({ k, lane: ln, z0: z0 - z - .25, z1: z0 - z + .25, top: 1.0 }); if (r() < .5) for (let c = -2; c <= 2; c++) addCoin(ch, ln, z + c * 1.4, 1.2 + (2.2 - Math.abs(c) * .5)); }
      else if (k === 'bar') { const b = new THREE.Mesh(new THREE.BoxGeometry(2.1, .5, .4), stripeM); b.position.y = 1.55; o.add(b); for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.16, 2.1, .2), darkM); p.position.set(s * 1, 1.05, 0); o.add(p); } const sg = new THREE.Mesh(new THREE.BoxGeometry(.8, .4, .05), std('#ffd23a', { emissive: C('#5a4000') })); sg.position.set(0, 1.55, .21); o.add(sg); ch.obs.push({ k, lane: ln, z0: z0 - z - .25, z1: z0 - z + .25, low: 1.3 }); }
      else { for (const dz of [0]) { const c = new THREE.Mesh(new THREE.ConeGeometry(.35, .9, 12), std('#ff6a1a', { roughness: .5 })); c.position.y = .45; o.add(c); const s2 = new THREE.Mesh(new THREE.CylinderGeometry(.22, .26, .14, 12), whiteM); s2.position.y = .5; o.add(s2); } const bx = new THREE.Mesh(new THREE.BoxGeometry(1.4, .9, .9), std('#c8904a', { roughness: .9 })); bx.position.set(.5 * (ln === 1 ? 1 : -Math.sign(LANES[ln])), .45, .3); o.add(bx); ch.obs.push({ k: 'block', lane: ln, z0: z0 - z - .8, z1: z0 - z + .8, top: 1.0 }); }
      shadowAll(o, true, false); }
    for (let ln = 0; ln < 3; ln++) if (!kinds[ln] && r() < .55) for (let c = 0; c < 5; c++) addCoin(ch, ln, z - 6 + c * 1.6, 1);
    if (r() < .07 + diff * .03) { const ln = [0, 1, 2].find(l => !kinds[l]) ?? 1; addPow(ch, ln, z - 9); }
    z += gap * (.8 + r() * .5); }
  chunks.push(ch); return ch; }
function addCoin(ch, ln, z, y) { const m = new THREE.Mesh(coinG, coinM); m.position.set(LANES[ln], y, -z); ch.g.add(m); ch.coins.push({ m, lane: ln, z: ch.z0 - z, y, got: 0 }); }
const POWS = ['mag', 'jet', 'x2', 'shield'];
const powTex = {}; function pTex(k) { if (powTex[k]) return powTex[k]; const c = cnv(128, 128), x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 10, 64, 64, 62); g.addColorStop(0, '#ffffff'); g.addColorStop(.7, '#8ad8ff'); g.addColorStop(1, 'rgba(90,180,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.font = '64px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText({ mag: '🧲', jet: '👟', x2: '💰', shield: '🫧' }[k], 64, 70); return powTex[k] = ctex(c); }
function addPow(ch, ln, z) { const k = POWS[Math.floor(Math.random() * 4)]; const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: pTex(k), depthWrite: false })); m.scale.setScalar(1.3); m.position.set(LANES[ln], 1.3, -z); ch.g.add(m); ch.pows.push({ m, k, lane: ln, z: ch.z0 - z, got: 0 }); }
function dropChunk(ch) { scene.remove(ch.g); ch.g.traverse(o => { if (o.geometry && ![coinG, truckBody, ramp].includes(o.geometry)) o.geometry.dispose(); }); }

/* ================= PLAYER ================= */
let P = null, pg = null; const pl = { z: 0, lane: 1, x: 0, y: 0, vy: 0, slide: 0, air: false, sp: 12, dist: 0, coins: 0, dead: false, stumble: 0, pw: {}, ground: 0, lastLaneT: 0, prevLane: 1 };
function mkHero() { if (pg) scene.remove(pg); pg = new THREE.Group(); P = cutie(CHARS[S.char].look); P.g.scale.setScalar(1.05); P.g.rotation.y = Math.PI; pg.add(P.g); scene.add(pg); const bub = new THREE.Mesh(new THREE.SphereGeometry(1.1, 20, 14), new THREE.MeshStandardMaterial({ color: '#7ad8ff', transparent: true, opacity: .25, emissive: C('#3a8aff'), emissiveIntensity: .5, depthWrite: false })); bub.position.y = .8; bub.visible = false; pg.add(bub); pg.userData.bub = bub; }
const dog = (() => { const g = new THREE.Group(); const b = std('#c8843a'), d = std('#5a3a1a'); const body = new THREE.Mesh(new THREE.CapsuleGeometry(.28, .6, 4, 10), b); body.rotation.x = Math.PI / 2; body.position.y = .55; g.add(body); const h = new THREE.Mesh(new THREE.SphereGeometry(.3, 14, 10), b); h.position.set(0, .85, -.5); g.add(h); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 6), d); e.scale.set(.6, 1.4, .6); e.position.set(s * .22, .95, -.42); g.add(e); } const n = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), d); n.position.set(0, .82, -.8); g.add(n); const legs = []; for (const [x, z] of [[-.15, -.3], [.15, -.3], [-.15, .3], [.15, .3]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .4, 6), b); l.position.set(x, .22, z); g.add(l); legs.push(l); } g.userData.legs = legs; shadowAll(g); g.visible = false; scene.add(g); return g; })();


/* ================= INTRO PRANK ================= */
const emoT = {}; function emo(e, sc = .7) { if (!emoT[e]) { const c = cnv(128, 128), x = c.getContext('2d'); x.font = '100px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, 64, 70); emoT[e] = ctex(c); } const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emoT[e], depthWrite: false })); sp.scale.setScalar(sc); return sp; }
const PRANKS = [
  { e: '🍩', col: '#ff9ad0', v: { shirt: '#ffffff', hat: '#ffffff', hair: '#3a2a1a', pants: '#3a3a4a' }, he: 'חטף סופגנייה מהמאפייה!', hf: 'חטפה סופגנייה מהמאפייה!', en: 'snatched a donut from the bakery!' },
  { e: '🍦', col: '#8ad0ff', v: { shirt: '#5ab4ff', cap: '#ffffff', hair: '#1a1a1a', pants: '#2a3a6a' }, he: 'לקח גלידה מהעגלה בלי לשלם!', hf: 'לקחה גלידה מהעגלה בלי לשלם!', en: 'grabbed an ice cream without paying!' },
  { e: '🍉', col: '#8ae0a8', v: { shirt: '#2ab06a', cap: '#ff3a6a', hair: '#5a3a1a', pants: '#3a3a4a' }, he: 'סחב אבטיח מהדוכן!', hf: 'סחבה אבטיח מהדוכן!', en: 'swiped a watermelon from the stand!' },
  { e: '🧁', col: '#ffd27a', v: { shirt: '#ff8a1a', hat: '#ffffff', hair: '#ffd23a', pants: '#2a2a3a', long: true }, he: 'גנב קאפקייק מהקונדיטוריה!', hf: 'גנבה קאפקייק מהקונדיטוריה!', en: 'nabbed a cupcake from the sweet shop!' },
];
let IG = null, intro = null, introT = 0;
function clearIntro() { $('icap').hidden = $('iskip').hidden = true; if (IG) { scene.remove(IG); IG = null; } if (intro && intro.loot && intro.loot.parent) intro.loot.parent.remove(intro.loot); intro = null; }
function buildIntro() { clearIntro(); const pr = PRANKS[Math.floor(Math.random() * PRANKS.length)]; const g = new THREE.Group(); IG = g; scene.add(g);
  { const rt = road.clone(); rt.repeat.set(1, 16 / 16); rt.needsUpdate = true; const rd = new THREE.Mesh(new THREE.PlaneGeometry(LW * 3 + 1.2, 16), new THREE.MeshStandardMaterial({ map: rt, roughness: .85 })); rd.rotation.x = -Math.PI / 2; rd.position.z = 8; rd.receiveShadow = true; g.add(rd);
    const wt = walk.clone(); wt.repeat.set(2, 4); wt.needsUpdate = true; for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(5, .3, 16), new THREE.MeshStandardMaterial({ map: wt, roughness: .9 })); w.position.set(sd * (LW * 1.5 + .6 + 2.5), .15, 8); w.receiveShadow = true; g.add(w); const b = new THREE.Mesh(new THREE.BoxGeometry(8, 14, 16), BCOL[sd > 0 ? 2 : 5]); b.position.set(sd * (LW * 1.5 + 5.6 + 4), 7, 8); g.add(b); } }
  const cx = -1.75, cz = .2; const tM = std(pr.col, { roughness: .5 });
  const tbl = new THREE.Mesh(new RoundedBoxGeometry(.9, .95, 1.7, 3, .08), tM); tbl.position.set(cx, .48, cz); g.add(tbl);
  const top = new THREE.Mesh(new RoundedBoxGeometry(1.05, .08, 1.85, 2, .03), whiteM); top.position.set(cx, .99, cz); g.add(top);
  for (const z of [-.8, .8]) { const po = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1.4, 8), whiteM); po.position.set(cx - .38, 1.7, cz + z); g.add(po); }
  const aw = new THREE.Mesh(new THREE.BoxGeometry(1.25, .1, 2.1), stripeM); aw.position.set(cx - .1, 2.42, cz); aw.rotation.z = -.22; g.add(aw);
  const goods = []; for (let i = 0; i < 4; i++) { const sp = emo(pr.e, .42); sp.position.set(cx + .12, 1.2, cz - .6 + i * .4); g.add(sp); goods.push(sp); }
  const sign = emo(pr.e, .7); sign.position.set(cx - .3, 2.85, cz); g.add(sign);
  const vend = cutie({ skin: '#f2c3a0', ...pr.v }); vend.g.position.set(cx - .85, -1.25, cz); vend.g.rotation.y = Math.PI / 2; g.add(vend.g);
  const mad = emo('😠', .55); mad.position.set(cx - .85, 2.15, cz); mad.visible = false; g.add(mad);
  shadowAll(g); intro = { pr, goods, vend, mad, loot: null, flags: {}, cz };
}
function beginRun() { $('icap').hidden = $('iskip').hidden = true; state = 'run'; runT = 0; $('hud').hidden = false; A.startMusic({ chords: [[45, 52, 57], [41, 48, 53], [43, 50, 55], [40, 47, 52]], bpm: 132, lead: true, kick: true, vol: .55 });
  if (!S.tut) { S.tut = 1; S.save(); toast(isTouch ? T('החליקו ימינה/שמאלה להחליף מסלול · למעלה לקפוץ · למטה להתגלגל', 'Swipe left/right to switch lanes · up to jump · down to roll') : T('חצים: ימין/שמאל, למעלה לקפוץ, למטה להתגלגל', 'Arrows: left/right, up to jump, down to roll'), 4500); } }
const IEND = 2.7;
function stepIntro(t, dt) { introT += dt; const k = introT, I = intro, f = I.flags, s = Math.min(1, dt * 12);
  const sneak = clamp(k / .7, 0, 1), turn = clamp((k - 1.75) / .4, 0, 1);
  pg.position.set(pl.x - .55 * sneak * (1 - turn), pl.y, pl.z + .2 * (1 - turn)); pg.rotation.y = lerp(Math.PI / 2, 0, turn * turn * (3 - 2 * turn)); pg.rotation.z = 0;
  const tip = k < .7 ? Math.sin(k * 22) : 0;
  P.legs.forEach((l, i) => l.rotation.x = k < .7 ? (i ? tip : -tip) * .55 : k < 1.75 ? 0 : (i ? 1 : -1) * Math.sin(t * 16) * .9);
  P.arms.forEach((a, i) => { const reach = i === 0 && k > .7 && k < 1.35; a.rotation.x = lerp(a.rotation.x, reach ? -1.55 : k < .7 ? -.9 : k < 1.75 ? -2.7 : (i ? -1 : 1) * Math.sin(t * 16) * 1.1, s); a.rotation.z = lerp(a.rotation.z, (i ? 1 : -1) * .25, s); });
  P.g.rotation.x = lerp(P.g.rotation.x, k < .7 ? .28 : 0, s); P.g.position.z = 0;
  const hop = k > 1.4 && k < 1.75 ? Math.sin((k - 1.4) / .35 * Math.PI) * .55 : 0; P.g.position.y = hop + (k < .7 ? Math.abs(tip) * .05 : 0); P.update(t, dt);
  if (k < .7 && Math.floor(k * 7) !== f.tp) { f.tp = Math.floor(k * 7); A.tone(f.tp % 2 ? 660 : 880, .05, 'triangle', .035); }
  if (k > .8 && !f.grab) { f.grab = 1; const gd = I.goods.pop(); IG.remove(gd); const l = emo(I.pr.e, .42); l.position.set(0, -.52, .06); P.arms[0].add(l); I.loot = l; A.tone(1200, .06, 'sine', .07); A.tone(1700, .08, 'sine', .06, .06); FX.burst(V3(pl.x - 1.1, 1.2, pl.z + .2), 12, [[1.6, 1.4, .6], [1.6, .8, 1.4]], 3, .08, .4, 1); $('icapT').textContent = `${I.pr.e} ${CHARS[S.char].n} ${T(CHARS[S.char].look.long ? I.pr.hf : I.pr.he, I.pr.en)}`; $('icap').hidden = false; }
  if (k > 1.15) { I.vend.g.position.y = lerp(I.vend.g.position.y, 0, Math.min(1, dt * 14)); I.vend.update(t, dt); }
  if (k > 1.25 && !f.wh) { f.wh = 1; I.mad.visible = true; A.tone(2600, .22, 'square', .045, 0, 2300); A.tone(2600, .3, 'square', .045, .28, 2200); A.voice('aww', .7); }
  if (I.mad.visible) { I.mad.scale.setScalar(.55 + Math.sin(t * 14) * .06); I.vend.arms[0].rotation.x = -2.6 + Math.sin(t * 18) * .4; }
  if (k > 1.4 && !f.hop) { f.hop = 1; const h = emo('😜', .5); h.position.set(0, 1.85, 0); pg.add(h); f.hEmo = h; A.tone(500, .12, 'triangle', .06, 0, 900); }
  if (f.hEmo && k > 2.1) { pg.remove(f.hEmo); f.hEmo = null; }
  if (k >= IEND) { if (f.hEmo) { pg.remove(f.hEmo); f.hEmo = null; } I.chase = 0; beginRun(); } }
function stepChase(t, dt) { const I = intro; if (!I || !IG) return; if (I.loot && runT > 3.5) { I.loot.parent && I.loot.parent.remove(I.loot); I.loot = null; } I.chase += dt; const v = I.vend.g;
  if (I.chase < 2.4) { v.rotation.y = lerp(v.rotation.y, Math.PI, Math.min(1, dt * 6)); v.position.x = lerp(v.position.x, -1.2, dt * 2); v.position.z -= 9 * dt; I.vend.legs.forEach((l, i) => l.rotation.x = Math.sin(t * 15 + i * Math.PI) * .9); I.mad.position.set(v.position.x, 2.15, v.position.z); }
  else { I.vend.legs.forEach(l => l.rotation.x = 0); v.position.y = Math.abs(Math.sin(t * 10)) * .15; I.mad.position.set(v.position.x, 2.15 + v.position.y, v.position.z); }
  if (pl.z < -90) clearIntro(); }

/* ================= INPUT ================= */
const keys = {}; let tq = null;
addEventListener('keydown', e => { if (state === 'intro') { introT = Math.max(introT, IEND - .35); return; } if (state !== 'run') return; if (['ArrowLeft', 'KeyA'].includes(e.code)) act('l'); if (['ArrowRight', 'KeyD'].includes(e.code)) act('r'); if (['ArrowUp', 'KeyW', 'Space'].includes(e.code)) { act('u'); e.preventDefault(); } if (['ArrowDown', 'KeyS'].includes(e.code)) act('d'); if (e.code === 'Escape') pause(); });
const stage = $('stage');
addEventListener('pointerdown', e => { if (state === 'intro' && !e.target.closest('button')) { introT = Math.max(introT, IEND - .35); return; } if (state !== 'run' || e.target.closest('button')) return; A.ac(); tq = { x: e.clientX, y: e.clientY, done: false }; });
addEventListener('pointermove', e => { if (!tq || tq.done) return; const dx = e.clientX - tq.x, dy = e.clientY - tq.y; if (Math.hypot(dx, dy) > 28) { tq.done = true; if (Math.abs(dx) > Math.abs(dy)) act(dx > 0 ? 'r' : 'l'); else act(dy < 0 ? 'u' : 'd'); } });
addEventListener('pointerup', e => { if (tq && !tq.done && state === 'run') act('u'); tq = null; });
function act(k) { if (pl.dead) return; if (k === 'l' || k === 'r') { const nl = clamp(pl.lane + (k === 'l' ? -1 : 1), 0, 2); if (nl !== pl.lane) { pl.prevLane = pl.lane; pl.lane = nl; pl.lastLaneT = 0; A.noise(.12, 'bandpass', 2400, 1, .04, 0, 900); } }
  else if (k === 'u') { if (!pl.air) { pl.vy = pl.pw.jet > 0 ? 17 : 11.5; pl.air = true; pl.slide = 0; A.tone(400, .14, 'triangle', .07, 0, 820); } }
  else if (k === 'd') { if (pl.air) pl.vy = Math.min(pl.vy, -16); pl.slide = .75; A.noise(.3, 'lowpass', 900, 1, .08); } }

/* ================= GAME ================= */
let runSeed = 1; let state = 'title', mult = 1, camZ = 0, shake = 0, runT = 0;
function groundAt(x, z, lane) { let gnd = 0; for (const ch of chunks) for (const o of ch.obs) if (o.k === 'truck' && o.lane === lane && z < o.z1 && z > o.z0) { const tz = o.rampZ; if (tz != null && z > tz - 0) { const k = (o.z1 - z) / 4; gnd = Math.max(gnd, clamp(k, 0, 1) * 2.6); } else if (z <= (o.rampZ ?? o.z1)) gnd = Math.max(gnd, 2.6); } return gnd; }
function reset() { for (const ch of chunks) dropChunk(ch); chunks.length = 0; nextZ = 0; Object.assign(pl, { z: 0, lane: 1, x: 0, y: 0, vy: 0, slide: 0, air: false, sp: 12, dist: 0, coins: 0, dead: false, stumble: 0, pw: {}, ground: 0, prevLane: 1 }); mult = 1 + Math.floor((S.runs || 0) / 10) * 0; while (nextZ > -CH * 4) { buildChunk(nextZ, 0); nextZ -= CH; } mkHero(); dog.visible = false; camZ = 4; clearIntro(); }
function start(skip) { A.ac(); runSeed = Math.floor(Math.random() * 1e6); reset(); $('title').hidden = true; $('endSheet').hidden = true; $('pows').innerHTML = ''; updHud(); A.stopMusic();
  if (skip === true) { beginRun(); return; } buildIntro(); introT = 0; state = 'intro'; $('hud').hidden = true; $('iskip').textContent = T('הקישו כדי לדלג ⏩', 'Tap to skip ⏩'); $('iskip').hidden = false; }
function updHud() { $('scoreTxt').textContent = Math.floor(pl.dist * mult + pl.coins * 10); $('coinTxt').textContent = pl.coins; $('multTxt').textContent = 'x' + mult; }
function crash(why) { if (pl.pw.shield > 0) { pl.pw.shield = 0; pl.inv = 1.2; FX.burst(V3(pl.x, 1, pl.z), 30, [[.5, 1.6, 2.6], [1.6, 2.2, 2.6]], 5, .14, .6, 2); A.tone(900, .15, 'square', .05, 0, 300); toast(T('הבועה הצילה אתכם! 🫧', 'The bubble saved you! 🫧'), 1100); return false; }
  pl.dead = true; state = 'over'; A.stopMusic(); A.noise(.5, 'lowpass', 500, 1, .45); A.tone(120, .4, 'sawtooth', .07, 0, 50); A.voice('aww', 1.1); shake = .6; try { navigator.vibrate && navigator.vibrate(150); } catch (e) { }
  dog.visible = true; dog.position.set(pl.x + .8, 0, pl.z + 6);
  const score = Math.floor(pl.dist * mult + pl.coins * 10); const nb = score > S.best; if (nb) S.best = score; S.coins += pl.coins * (pl.x2 ? 1 : 1); S.runs = (S.runs || 0) + 1; S.save();
  const rs = runSeed; setTimeout(() => { if (state !== 'over' || rs !== runSeed) return; $('eT').textContent = nb ? T('שיא חדש! 🏆', 'New record! 🏆') : T('אוי! נתקלתם 😵', 'Oops! You crashed 😵'); $('eP').innerHTML = T(`ניקוד: <b>${score}</b> · שיא: ${S.best}<br>🪙 +${pl.coins} (יש לכם ${S.coins})`, `Score: <b>${score}</b> · Best: ${S.best}<br>🪙 +${pl.coins} (you have ${S.coins})`); $('endSheet').hidden = false; if (nb) A.voice('yay', 1.2); }, 1200); return true; }
function step(dt) { if (state !== 'run') return; runT += dt; const d = Math.min(1, pl.dist / 3000); pl.sp = 17.5 + 20 * (1 - Math.exp(-pl.dist / 1300)); const v = pl.sp * dt; pl.z -= v; pl.dist += v; pl.inv = Math.max(0, (pl.inv || 0) - dt); for (const k in pl.pw) pl.pw[k] = Math.max(0, pl.pw[k] - dt);
  while (nextZ > pl.z - CH * 3.5) { buildChunk(nextZ, Math.min(1, pl.dist / 2500)); nextZ -= CH; } while (chunks.length && chunks[0].z0 - CH > pl.z + 20) dropChunk(chunks.shift());
  const tx = LANES[pl.lane]; const ox = pl.x; pl.x = lerp(pl.x, tx, Math.min(1, dt * 14)); pl.lastLaneT += dt;
  const gnd = groundAt(pl.x, pl.z, pl.lane); pl.vy -= G * dt; pl.y += pl.vy * dt; if (pl.y <= gnd) { if (pl.air && pl.vy < -6) { FX.burst(V3(pl.x, gnd + .1, pl.z), 8, [[.8, .8, .8]], 2, .1, .4, 4); } pl.y = gnd; pl.vy = 0; pl.air = false; } else if (pl.y > gnd + .05 && !pl.air) { if (gnd < pl.y - .4) pl.air = true; else pl.y = gnd; }
  pl.slide = Math.max(0, pl.slide - dt);
  // collisions
  const h = pl.slide > 0 ? .7 : 1.6; for (const ch of chunks) { for (const o of ch.obs) { if (pl.z > o.z1 + .5 || pl.z < o.z0 - .5) continue; const ox2 = LANES[o.lane]; if (Math.abs(ox2 - pl.x) > 1.25) continue; if (pl.z > o.z1 || pl.z < o.z0) continue; let hit = false;
      if (o.k === 'bar') hit = pl.y + h > o.low && pl.y < o.low + .5;
      else if (o.k === 'truck') { const top = groundAt(pl.x, pl.z, o.lane); hit = pl.y < (o.rampZ != null && pl.z > o.rampZ ? top - .5 : 2.6 - .5); }
      else hit = pl.y < o.top - .15;
      if (hit && !(pl.inv > 0)) { if (Math.abs(ox2 - pl.x) > .55 && pl.lastLaneT < .35 && o.lane === pl.lane) { pl.lane = pl.prevLane; pl.stumble = 1.2; shake = .25; A.noise(.2, 'lowpass', 700, 1, .25); dog.visible = true; dog.position.set(pl.x, 0, pl.z + 7); if (pl.stumbleT > 0) { if (crash()) return; } pl.stumbleT = 6; pl.inv = .4; } else { pl.why = o.k + ' y' + pl.y.toFixed(2) + ' sl' + pl.slide.toFixed(2) + ' dz' + (pl.z - o.z1).toFixed(2); if (crash()) return; } } }
    for (const c of ch.coins) { if (c.got) continue; const near = pl.pw.mag > 0 && Math.abs(c.z - pl.z) < 9; if (near) { c.m.position.x = lerp(c.m.position.x, pl.x, dt * 8); c.m.position.y = lerp(c.m.position.y, pl.y + 1, dt * 8); c.m.position.z = lerp(c.m.position.z, pl.z - ch.z0, dt * 8); }
      const wx = c.m.position.x, wz = ch.z0 + c.m.position.z, wy = c.m.position.y; if (Math.abs(wz - pl.z) < .9 && Math.abs(wx - pl.x) < 1 && Math.abs(wy - (pl.y + .8)) < 1.4) { c.got = 1; c.m.visible = false; pl.coins += pl.pw.x2 > 0 ? 2 : 1; A.tone(1320 + (pl.coins % 5) * 80, .06, 'square', .035); A.tone(1980, .08, 'sine', .04, .04); FX.burst(V3(wx, wy, wz), 5, [[2.6, 2.2, .6]], 2, .07, .3, 3); } }
    for (const p of ch.pows) { if (p.got) continue; if (Math.abs(p.z - pl.z) < 1 && Math.abs(LANES[p.lane] - pl.x) < 1 && pl.y < 2.5) { p.got = 1; p.m.visible = false; pl.pw[p.k] = upDur(p.k); A.tone(660, .1, 'triangle', .07); A.tone(990, .15, 'triangle', .07, .08); A.tone(1320, .2, 'triangle', .06, .16); toast({ mag: T('🧲 מגנט מטבעות!', '🧲 Coin magnet!'), jet: T('👟 נעלי קפיץ – קפיצות ענק!', '👟 Spring shoes – mega jumps!'), x2: T('💰 מטבעות כפולים!', '💰 Double coins!'), shield: T('🫧 בועת מגן!', '🫧 Shield bubble!') }[p.k], 1200); } } }
  pl.stumbleT = Math.max(0, (pl.stumbleT || 0) - dt); if (pl.stumbleT <= 0) dog.visible = false;
  if (Math.floor(pl.dist / 500) + 1 > mult && mult < 9) { mult = Math.floor(pl.dist / 500) + 1; toast('✖️' + mult + ' ' + T('מכפיל ניקוד!', 'score multiplier!'), 1000); A.tone(880, .2, 'square', .04); }
  updHud(); const pw = Object.entries(pl.pw).filter(([k, v]) => v > 0); $('pows').innerHTML = pw.map(([k, v]) => `<span><i style="width:${v / upDur(k) * 100}%"></i>${{ mag: '🧲', jet: '👟', x2: '💰', shield: '🫧' }[k]}</span>`).join(''); }
function pose(t, dt) { if (!P) return; if (state === 'intro') return stepIntro(t, dt); if (intro && state === 'run') stepChase(t, dt); pg.position.set(pl.x, pl.y, pl.z); pg.userData.bub.visible = pl.pw.shield > 0; const run = state === 'run' && !pl.air && pl.slide <= 0; const w = Math.sin(t * pl.sp * .9); const s = Math.min(1, dt * 16);
  P.legs.forEach((l, i) => l.rotation.x = lerp(l.rotation.x, run ? (i ? w : -w) * 1.0 : pl.air ? (i ? -.9 : .4) : state === 'title' ? 0 : -1.2, s)); P.arms.forEach((a, i) => { a.rotation.x = lerp(a.rotation.x, run ? (i ? -w : w) * 1.1 : pl.air ? -2.6 : state === 'title' ? 0 : -.5, s); a.rotation.z = lerp(a.rotation.z, (i ? 1 : -1) * (pl.air ? .5 : .2), s); });
  P.g.rotation.x = lerp(P.g.rotation.x, pl.slide > 0 ? -1.2 : pl.air ? -.15 : run ? .12 : 0, s); P.g.position.y = lerp(P.g.position.y, pl.slide > 0 ? .25 : run ? Math.abs(w) * .08 : 0, s); P.g.position.z = pl.slide > 0 ? -.2 : 0; pg.rotation.z = lerp(pg.rotation.z, (LANES[pl.lane] - pl.x) * -.12, s);
  if (state === 'title') { pg.rotation.y += dt * .8; P.update(t, dt); } else pg.rotation.y = 0;
  if (dog.visible) { dog.position.x = lerp(dog.position.x, pl.x, dt * 4); dog.position.z = lerp(dog.position.z, pl.z + (state === 'over' ? 1.6 : 3.2), dt * 2.5); dog.userData.legs.forEach((l, i) => l.rotation.x = Math.sin(t * 18 + i * 1.6) * .8); dog.position.y = Math.abs(Math.sin(t * 18)) * .1; } }
function pause() { if (state !== 'run') return; state = 'pause'; $('pauseSheet').hidden = false; }
function showTitle() { state = 'title'; A.stopMusic(); reset(); $('title').hidden = false; $('hud').hidden = true; $('endSheet').hidden = $('pauseSheet').hidden = $('shopSheet').hidden = true; $('tBest').textContent = S.best; $('tCoins').textContent = S.coins; }
function renderShop() { $('chars').innerHTML = CHARS.map((c, i) => { const own = S.owned.includes(i); return `<button class="ci${S.char === i ? ' on' : ''}" data-c="${i}"><span class="dot" style="background:${c.look.shirt}"></span><b>${c.n}</b><small>${own ? (S.char === i ? T('נבחר ✔', 'Selected ✔') : T('בחרו', 'Select')) : '🪙 ' + c.price}</small></button>`; }).join('');
  $('ups').innerHTML = UPS.map(([k, ic, n]) => `<button class="ui" data-u="${k}"><b>${ic} ${n}</b><small>${T('רמה', 'Lvl')} ${S.up[k] || 0}/5 · ${upDur(k)}${T('ש׳', 's')}</small><span>${(S.up[k] || 0) >= 5 ? 'MAX' : '🪙 ' + upCost(k)}</span></button>`).join(''); $('shopCoins').textContent = S.coins; }
$('chars').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; const i = +b.dataset.c, c = CHARS[i]; if (!S.owned.includes(i)) { if (S.coins < c.price) { toast(T('צריך עוד מטבעות 🪙', 'Need more coins 🪙')); A.tone(200, .1, 'sine', .05); return; } S.coins -= c.price; S.owned.push(i); A.voice('yay', 1.3); } S.char = i; S.save(); renderShop(); mkHero(); $('tCoins').textContent = S.coins; };
$('ups').onclick = e => { const b = e.target.closest('[data-u]'); if (!b) return; const k = b.dataset.u; if ((S.up[k] || 0) >= 5) return; const cst = upCost(k); if (S.coins < cst) { toast(T('צריך עוד מטבעות 🪙', 'Need more coins 🪙')); return; } S.coins -= cst; S.up[k] = (S.up[k] || 0) + 1; S.save(); A.tone(880, .1, 'triangle', .06); A.tone(1320, .14, 'triangle', .06, .08); renderShop(); $('tCoins').textContent = S.coins; };
$('goBtn').onclick = () => start(); $('shopBtn').onclick = () => { A.ac(); renderShop(); $('shopSheet').hidden = false; }; $('shopClose').onclick = () => $('shopSheet').hidden = true;
$('eAgain').onclick = () => start(); $('eMenu').onclick = () => showTitle(); $('pauseBtn').onclick = () => pause(); $('pGo').onclick = () => { $('pauseSheet').hidden = true; state = 'run'; }; $('pMenu').onclick = () => showTitle();
$('pauseBtn').innerHTML = ICO.pause('#ffffff'); $('homeT').innerHTML = ICO.home('#ffffff'); soundButton('sndBtn', S, A, '#1c2240'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('goBtn').textContent = T('לרוץ! 🏃', 'RUN! 🏃'); $('shopBtn').textContent = T('🛍️ חנות ודמויות', '🛍️ Shop & characters'); $('shopT').textContent = T('חנות', 'Shop'); $('charsT').textContent = T('דמויות', 'Characters'); $('upsT').textContent = T('שדרוגים', 'Upgrades'); $('shopClose').textContent = T('סגירה', 'Close'); $('eAgain').textContent = T('שוב! 🏃', 'Again! 🏃'); $('eMenu').textContent = T('תפריט', 'Menu'); $('pT').textContent = T('הפסקה', 'Paused'); $('pGo').textContent = T('המשך ▶', 'Resume ▶'); $('pMenu').textContent = T('תפריט', 'Menu'); $('bestL').textContent = T('שיא', 'Best');
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
let last = performance.now();
function loop(now) { requestAnimationFrame(loop); const dt = Math.min(.04, (now - last) / 1000) * (window.__fast || 1); last = now; const t = now / 1000; A.tick(); step(dt); pose(t, dt);
  for (const ch of chunks) { for (const c of ch.coins) if (!c.got) c.m.rotation.y += dt * 4; for (const p of ch.pows) if (!p.got) p.m.position.y = 1.3 + Math.sin(t * 3) * .15; }
  shake = Math.max(0, shake - dt * 2); const camTX = pl.x * .7; if (state === 'title') { camera.position.set(pl.x + 2.6, 2.3, pl.z + 4.2); camera.lookAt(pl.x - .3, 1.3, pl.z - 3); } else if (state === 'intro') { const m = clamp((introT - 1.8) / (IEND - 1.8), 0, 1), q = m * m * (3 - 2 * m); camera.fov = 58; camera.updateProjectionMatrix(); camera.position.set(lerp(pl.x + 2.5, pl.x * .7, q), lerp(2.0, 3.4, q), lerp(pl.z + 3.9, pl.z + 6.2, q)); camera.lookAt(lerp(-.85, 0, q), lerp(1.05, 1.2, q), lerp(pl.z + .1, pl.z - 6, q)); } else { camera.fov = lerp(camera.fov, 64 + (pl.sp - 17.5) * .55 + (pl.pw && pl.pw.jet > 0 ? 8 : 0), Math.min(1, dt * 3)); camera.updateProjectionMatrix(); camZ = pl.z + 6.2; camera.position.set(lerp(camera.position.x, camTX, Math.min(1, dt * 6)) + (Math.random() - .5) * shake, lerp(camera.position.y, 3.4 + pl.y * .6, Math.min(1, dt * 5)), camZ); camera.lookAt(camTX * .6, 1.2 + pl.y * .5, pl.z - 6); const fov = 64 + (pl.sp - 12) * .45; if (Math.abs(camera.fov - fov) > .2) { camera.fov = fov; camera.updateProjectionMatrix(); } }
  sun.position.set(pl.x + 6, 14, pl.z + 6); sun.target.position.set(pl.x, 0, pl.z - 4); sky.position.copy(camera.position); FX.update(dt); E.render(); }
setTimeout(() => { E.resize(); showTitle(); $('loading').hidden = true; requestAnimationFrame(loop); window.__dashOK = true; }, 30);
window.__da = { sim(sec, useBot = 1) { for (let t = 0; t < sec && state === 'run'; t += 1 / 60) { if (useBot) this.bot(); step(1 / 60); } return [state, Math.round(pl.dist), pl.coins, pl.why]; }, bot() { if (state !== 'run') return; for (const ch of chunks) for (const o of ch.obs) { if (o.lane !== pl.lane) continue; const dz = pl.z - o.z1; if (dz < 0 || dz > (o.k === 'truck' ? 9 : 4.5) * pl.sp / 12) continue; if (o.k === 'truck' && o.rampZ == null || o.k === 'truck' && pl.y < .1 && false) { const free = [0, 1, 2].filter(l => l !== pl.lane && !ch.obs.some(q => q.lane === l && Math.abs(q.z1 - o.z1) < 14)); if (free.length) act(free[0] < pl.lane ? 'l' : 'r'); } else if (o.k === 'bar') act('d'); else if (o.k !== 'truck') act('u'); } }, start, get pl() { return pl; }, get state() { return state; }, act, get chunks() { return chunks; }, showTitle, get introT() { return introT; }, set introT(v) { introT = v; }, get intro() { return intro; } };
