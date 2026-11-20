import { THREE, $, V3, C, clamp, lerp, rnd, T, store, engine, std, particles, audio, toast, ICO, hubButtons, soundButton, qualityButton } from '../lib/kit.js';

const S = store('sky-save', { best: 0, coins: 0, skin: 'comet', owned: ['comet'] });
const E = engine(S, { fov: 62, bloom: [.6, .5, .62], exposure: 1.05, shadows: false, vignette: .45, sat: 1.15, far: 400 });
const { scene, camera, renderer } = E;
const A = audio(S);
const FX = particles(E, 1600, true);
const LANE = 3.2, PY = 1.25;

/* ---------- palettes ---------- */
const PAL = [
  { grid: '#ff3fd0', obj: '#2ff3ff', s1: '#07051a', s2: '#3a0b5a', sunA: '#ffd84a', sunB: '#ff2fb0' },
  { grid: '#ff8a1f', obj: '#ffe14a', s1: '#12061a', s2: '#5a1530', sunA: '#fff08a', sunB: '#ff4a1f' },
  { grid: '#2fffa0', obj: '#5fd0ff', s1: '#02120e', s2: '#063a3a', sunA: '#d8ff8a', sunB: '#20c890' },
  { grid: '#ff2a4a', obj: '#ffd84a', s1: '#12030a', s2: '#3e0a1c', sunA: '#ffe08a', sunB: '#ff2a4a' },
  { grid: '#8a7aff', obj: '#ff6fd0', s1: '#06061e', s2: '#1c1a5a', sunA: '#ffc0f0', sunB: '#7a5aff' },
];
const cur = { grid: C(PAL[0].grid), obj: C(PAL[0].obj), s1: C(PAL[0].s1), s2: C(PAL[0].s2), sunA: C(PAL[0].sunA), sunB: C(PAL[0].sunB) };

/* ---------- sky, sun, grid, mountains ---------- */
const skyM = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { c1: { value: cur.s1 }, c2: { value: cur.s2 } },
  vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 c1; uniform vec3 c2; varying vec3 vP; void main(){ float h=normalize(vP).y; vec3 c=mix(c2,c1,smoothstep(-.02,.45,h)); gl_FragColor=vec4(c,1.0); }` });
const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyM); scene.add(sky);
const stars = new THREE.Points((() => { const g = new THREE.BufferGeometry(); const p = []; for (let i = 0; i < 700; i++) { const a = Math.random() * Math.PI - Math.PI / 2 - Math.PI / 2, e = Math.random() * .9 + .08; p.push(Math.cos(e) * Math.sin(a) * 250, Math.sin(e) * 250, -Math.cos(e) * Math.cos(a) * 250 * Math.sign(Math.random() - .3)); } g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return g; })(), new THREE.PointsMaterial({ color: '#ffffff', size: 1.3, sizeAttenuation: false, transparent: true, opacity: .8 }));
scene.add(stars);
const sunM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { a: { value: cur.sunA }, b: { value: cur.sunB }, t: { value: 0 } },
  vertexShader: `varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 a; uniform vec3 b; uniform float t; varying vec2 vU; void main(){ vec2 d=vU-.5; float r=length(d); if(r>.5) discard; float y=vU.y; vec3 c=mix(b,a,y);
    float band=step(.5, fract(y*14.0 - t*.4)); float cut = y<.45 ? band : 1.0; float glow=smoothstep(.5,.35,r); gl_FragColor=vec4(c*1.05, cut*glow); }` });
const sunMesh = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), sunM); sunMesh.position.set(0, 20, -260); scene.add(sunMesh);
const gridM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { off: { value: 0 }, col: { value: cur.grid }, fogc: { value: cur.s2 } }, extensions: { derivatives: true },
  vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform float off; uniform vec3 col; uniform vec3 fogc; varying vec3 vW; void main(){ vec2 p=vec2(vW.x*.5, (vW.z-off)*.5); vec2 g=abs(fract(p-.5)-.5)/fwidth(p); float l=1.0-min(min(g.x,g.y),1.0);
    float d=clamp(-vW.z/220.0,0.0,1.0); vec3 base=fogc*.25; vec3 c=mix(base, col*2.2, l*(1.0-d*.85)); c=mix(c, fogc*.6, smoothstep(.4,1.0,d)); gl_FragColor=vec4(c,1.0); }` });
const grid = new THREE.Mesh(new THREE.PlaneGeometry(400, 300), gridM); grid.rotation.x = -Math.PI / 2; grid.position.set(0, 0, -140); scene.add(grid);
const mountains = new THREE.Group(); scene.add(mountains);
{ const fillM = new THREE.MeshBasicMaterial({ color: '#05030f' }); const lineM = new THREE.LineBasicMaterial({ color: cur.grid, transparent: true, opacity: .8 }); mountains.userData.lineM = lineM;
  for (const side of [-1, 1]) { const pts = []; let x = side * 9; const tris = []; for (let i = 0; i < 26; i++) { const w = rnd(5, 12), h = rnd(5, 22); const x0 = x, x1 = x + side * w; pts.push(V3(x0, 0, 0), V3((x0 + x1) / 2, h, 0), V3((x0 + x1) / 2, h, 0), V3(x1, 0, 0)); tris.push(x0, 0, 0, (x0 + x1) / 2, h, 0, x1, 0, 0); x = x1 - side * w * .4; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3)); const fm = new THREE.Mesh(g, fillM); fm.position.z = -200; mountains.add(fm);
    const lg = new THREE.BufferGeometry().setFromPoints(pts); const ln = new THREE.LineSegments(lg, lineM); ln.position.z = -199.8; mountains.add(ln); } }
scene.fog = new THREE.Fog(cur.s2, 60, 210);

/* ---------- plane ---------- */
const SKINS = [
  { id: 'comet', n: 'Comet', c: '#2ff3ff', p: 0 }, { id: 'ruby', n: 'Ruby', c: '#ff3f6a', p: 150 }, { id: 'gold', n: 'Gold', c: '#ffd84a', p: 400 },
  { id: 'lime', n: 'Lime', c: '#7aff3a', p: 700 }, { id: 'ghost', n: 'Ghost', c: '#ffffff', p: 1000 }, { id: 'rainbow', n: 'Rainbow', c: 'rainbow', p: 1600 },
];
const plane = new THREE.Group(); scene.add(plane);
const hullM = new THREE.MeshStandardMaterial({ color: '#141826', roughness: .35, metalness: .7 });
const glowM = new THREE.MeshBasicMaterial({ color: '#2ff3ff' }); const edgeM = new THREE.LineBasicMaterial({ color: '#2ff3ff' });
function edges(mesh) { const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20), edgeM); l.position.copy(mesh.position); l.rotation.copy(mesh.rotation); l.scale.copy(mesh.scale); return l; }
{ const body = new THREE.Mesh(new THREE.ConeGeometry(.16, 1.3, 6), hullM); body.rotation.x = -Math.PI / 2; plane.add(body, edges(body));
  const back = new THREE.Mesh(new THREE.CylinderGeometry(.16, .12, .35, 6), hullM); back.rotation.x = Math.PI / 2; back.position.z = .82; plane.add(back, edges(back));
  const ws = new THREE.Shape(); ws.moveTo(0, -.2); ws.lineTo(.95, .45); ws.lineTo(.95, .58); ws.lineTo(0, .42); ws.lineTo(-.95, .58); ws.lineTo(-.95, .45); ws.lineTo(0, -.2);
  const wg = new THREE.ExtrudeGeometry(ws, { depth: .04, bevelEnabled: false }); wg.rotateX(Math.PI / 2); wg.translate(0, 0, 0); const wing = new THREE.Mesh(wg, hullM); wing.position.set(0, .02, 0); plane.add(wing, edges(wing));
  const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(.42, 0); fs.lineTo(.42, .06); fs.lineTo(.12, .34); fs.lineTo(0, .34); const fg = new THREE.ExtrudeGeometry(fs, { depth: .03, bevelEnabled: false }); fg.rotateY(-Math.PI / 2); const fin = new THREE.Mesh(fg, hullM); fin.position.set(.015, .05, .55); plane.add(fin, edges(fin));
  const eng = new THREE.Mesh(new THREE.SphereGeometry(.08, 12, 8), glowM); eng.position.z = 1.02; eng.scale.z = .6; plane.add(eng);
  for (const s of [-1, 1]) { const tip = new THREE.Mesh(new THREE.SphereGeometry(.04, 8, 6), glowM); tip.position.set(s * .95, .02, .52); plane.add(tip); }
  const shield = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 2), new THREE.MeshBasicMaterial({ color: '#5fd0ff', transparent: true, opacity: .18, wireframe: true, blending: THREE.AdditiveBlending, depthWrite: false })); shield.scale.set(1.1, .55, 1.1); shield.visible = false; plane.add(shield); plane.userData.shield = shield; }
plane.position.set(0, PY, 0); plane.scale.setScalar(.85);
E.onResize.push((w, h) => { camera.fov = w / h < 1 ? 72 : 60; camera.updateProjectionMatrix(); });
function applySkin() { const s = SKINS.find(k => k.id === S.skin) || SKINS[0]; if (s.c !== 'rainbow') { glowM.color.set(s.c); edgeM.color.set(s.c); } hullM.opacity = s.id === 'ghost' ? .35 : 1; hullM.transparent = s.id === 'ghost'; }
applySkin();

/* ---------- obstacles: free-floating hazards that keep growing ---------- */
const objFill = new THREE.MeshStandardMaterial({ color: '#0d0b22', roughness: .3, metalness: .6, emissive: C('#000'), transparent: true, opacity: .92 });
const objLine = new THREE.LineBasicMaterial({ color: cur.obj });
const ringGeo = new THREE.TorusGeometry(.32, .07, 8, 24); const coinM = new THREE.MeshBasicMaterial({ color: C('#ffd84a').multiplyScalar(1.6) });
const obs = [], coins = [], pows = [];
const ROCK = [new THREE.IcosahedronGeometry(1, 0), new THREE.OctahedronGeometry(1, 0), new THREE.DodecahedronGeometry(1, 0)].map(g => ({ g, e: new THREE.EdgesGeometry(g) }));
const pylG = new THREE.CylinderGeometry(1, 1, 1, 6), pylE = new THREE.EdgesGeometry(pylG);
const spikeG = new THREE.IcosahedronGeometry(1, 0), spikeE = new THREE.EdgesGeometry(spikeG), coneG = new THREE.ConeGeometry(.2, .65, 6);
const mineM = new THREE.MeshBasicMaterial({ color: C('#ff2a4a').multiplyScalar(2.2) });
let gapX = 0;
function mkObs(z, kind, x, r, diff) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); const h = new THREE.Group(); g.add(h);
  const o = { g, body: h, kind, x, r, hp: 1, t: rnd(0, 6), vx: 0, spin: V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(.9), flash: 0 };
  if (kind === 'rock') { const R = ROCK[Math.floor(Math.random() * 3)]; h.add(new THREE.Mesh(R.g, objFill), new THREE.LineSegments(R.e, objLine)); h.scale.setScalar(r); h.position.y = PY + rnd(-.1, .3); o.hp = Math.max(1, Math.round(r * 2.4)); }
  if (kind === 'pylon') { const H = 3.4; h.add(new THREE.Mesh(pylG, objFill), new THREE.LineSegments(pylE, objLine)); h.scale.set(r, H, r); h.position.y = H / 2; o.hp = 1e9; const cap = new THREE.Mesh(new THREE.SphereGeometry(r * .55, 12, 8), new THREE.MeshBasicMaterial({ color: cur.obj.clone().multiplyScalar(2.5) })); cap.position.y = H + .1; g.add(cap); }
  if (kind === 'mine') { h.add(new THREE.Mesh(spikeG, objFill), new THREE.LineSegments(spikeE, objLine)); for (let i = 0; i < 10; i++) { const s2 = new THREE.Mesh(coneG, mineM); const d = V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize(); s2.position.copy(d).multiplyScalar(1.05); s2.quaternion.setFromUnitVectors(V3(0, 1, 0), d); h.add(s2); }
    h.scale.setScalar(r); h.position.y = PY; o.hp = 2; o.vx = rnd(.7, 1.5) * (Math.random() < .5 ? -1 : 1) * lerp(.7, 1.7, diff); }
  obs.push(o); return o;
}
function spawnRow(z, diff) {
  gapX = clamp(gapX + rnd(-1.7, 1.7), -LANE + .9, LANE - .9);            // a safe corridor that wanders, so there is always a way through
  const gw = lerp(1.75, 1.05, diff) + .45, grow = lerp(.42, 1.5, diff);   // hazards grow as you fly further
  const n = 1 + Math.floor(rnd(0, 1.2 + diff * 2.6)); const kinds = ['rock', 'rock', 'pylon', dist > 300 ? 'mine' : 'rock'];
  for (let k = 0; k < n; k++) { const kind = kinds[Math.floor(Math.random() * kinds.length)]; let r = grow * rnd(.75, 1.25) * (kind === 'pylon' ? .5 : 1); if (kind === 'mine') r = lerp(.35, .62, diff);
    for (let tt = 0; tt < 14; tt++) { const x = rnd(-LANE - .3, LANE + .3); if (kind === 'mine' || Math.abs(x - gapX) - r * .9 > gw) { mkObs(z + rnd(-2.5, 2.5), kind, x, r, diff); break; } } }
  if (diff > .3 && Math.random() < diff * .55) { const side = gapX > 0 ? -1 : 1, r = lerp(1.5, 2.7, diff); const x = gapX + side * (gw + r * .9 + .2); if (Math.abs(x) < LANE + r * .6) mkObs(z + rnd(-3, 3), 'rock', x, r, diff); }
  if (Math.random() < .7) { const n2 = 4 + Math.floor(Math.random() * 3); for (let k = 0; k < n2; k++) { const m = new THREE.Mesh(ringGeo, coinM); m.position.set(gapX, PY, z + 2.2 + k * 1.1); scene.add(m); coins.push({ m, x: gapX }); } }
}
const POW = { shield: { c: '#5fd0ff', n: T('מגן', 'Shield'), d: 0 }, magnet: { c: '#ff6fd0', n: T('מגנט', 'Magnet'), d: 8 }, x2: { c: '#ffd84a', n: 'x2', d: 10 }, slow: { c: '#7aff3a', n: T('האטה', 'Slow-mo'), d: 5 } };
function spawnPow(z) { const k = Object.keys(POW)[Math.floor(Math.random() * 4)]; const m = new THREE.Mesh(new THREE.IcosahedronGeometry(.36, 0), new THREE.MeshBasicMaterial({ color: C(POW[k].c).multiplyScalar(2), wireframe: true })); const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.2, 0), new THREE.MeshBasicMaterial({ color: C(POW[k].c).multiplyScalar(1.5) })); m.add(core);
  m.position.set(rnd(-LANE + .6, LANE - .6), PY, z); scene.add(m); pows.push({ m, k }); }


/* ---------- weapons & enemies ---------- */
const boltGeo = new THREE.CylinderGeometry(.05, .05, .9, 6); boltGeo.rotateX(Math.PI / 2);
const boltM = new THREE.MeshBasicMaterial({ color: C('#7affff').multiplyScalar(2.5) });
const ebM = new THREE.MeshBasicMaterial({ color: C('#ff3a5a').multiplyScalar(2.6) }); const ebGeo = new THREE.SphereGeometry(.16, 10, 8);
const enGeo = new THREE.OctahedronGeometry(.5, 0); const enEdge = new THREE.EdgesGeometry(enGeo);
const enFill = new THREE.MeshStandardMaterial({ color: '#1a0612', roughness: .3, metalness: .7, emissive: C('#ff2a4a'), emissiveIntensity: .25 });
const bolts = [], enemies = [], ebs = []; let heat = 0, overheat = 0, fireCd = 0, firing = false, kills = 0, enemyT = 6, warned = {};
const redGlow = new THREE.MeshBasicMaterial({ color: C('#ff4a3a').multiplyScalar(2.6) }), redLine = new THREE.LineBasicMaterial({ color: C('#ff4a6a').multiplyScalar(2) });
const ex = m => new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 20), redLine);
function addE(m, g) { const l = ex(m); l.position.copy(m.position); l.rotation.copy(m.rotation); l.scale.copy(m.scale); g.add(m, l); }
const REWARD = { drone: 8, missile: 5, jet: 12, tank: 15 };
function spawnEnemy(diff) { const pool = ['drone', 'drone']; if (dist > 250) pool.push('missile', 'missile'); if (dist > 450) pool.push('jet', 'jet'); if (dist > 700) pool.push('tank'); const kind = pool[Math.floor(Math.random() * pool.length)];
  const g = new THREE.Group(); const e = { g, kind, t: rnd(0, 6), hit: 0, x0: rnd(-LANE + .5, LANE - .5), hp: 1 };
  if (kind === 'drone') { const body = new THREE.Mesh(enGeo, enFill); body.scale.set(1.3, .55, 1); addE(body, g); for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(.7, .04, .3), enFill); w.position.x = sx * .75; g.add(w); const q = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), ebM); q.position.set(sx * 1.05, 0, 0); g.add(q); }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8), new THREE.MeshBasicMaterial({ color: C('#ffd84a').multiplyScalar(2) })); eye.position.set(0, .05, .4); g.add(eye); g.position.set(e.x0, PY + .1, -95); e.hp = diff > .4 ? 3 : 2; e.shootT = rnd(1.2, 2.4); e.amp = rnd(.8, 1.8); }
  if (kind === 'missile') { const b = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .9, 8), enFill); b.rotation.x = Math.PI / 2; addE(b, g); const n = new THREE.Mesh(new THREE.ConeGeometry(.12, .35, 8), redGlow); n.rotation.x = Math.PI / 2; n.position.z = .62; g.add(n);
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(.02, .26, .22), enFill); f.position.z = -.35; f.rotation.z = i * Math.PI / 2; f.position.x = Math.cos(i * Math.PI / 2) * .14; f.position.y = Math.sin(i * Math.PI / 2) * .14; g.add(f); }
    e.blink = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), redGlow); e.blink.position.z = -.5; g.add(e.blink); g.position.set(e.x0, PY, -100); e.turn = lerp(.9, 2.2, diff); if (!warned.m) { warned.m = 1; toast(T('⚠️ טילים בדרך! התחמקו או ירו בהם', '⚠️ Missiles incoming! Dodge or shoot them')); } A.tone(900, .1, 'square', .03); A.tone(900, .1, 'square', .03, .18); }
  if (kind === 'jet') { const b = new THREE.Mesh(new THREE.ConeGeometry(.22, 1.6, 6), enFill); b.rotation.x = Math.PI / 2; addE(b, g); const w = new THREE.Mesh(new THREE.BoxGeometry(2.2, .05, .6), enFill); w.position.z = -.25; addE(w, g); const t2 = new THREE.Mesh(new THREE.BoxGeometry(.05, .4, .4), enFill); t2.position.set(0, .2, -.6); addE(t2, g);
    for (const sx of [-1.1, 1.1]) { const q = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), redGlow); q.position.set(sx, 0, -.25); g.add(q); } const side = Math.random() < .5 ? -1 : 1; e.x0 = side * (LANE + 1); e.x1 = -side * rnd(0, LANE); g.position.set(e.x0, PY + .05, -100); e.hp = 2; if (!warned.j) { warned.j = 1; toast(T('✈️ מטוסי אויב!', '✈️ Enemy jets!')); } }
  if (kind === 'tank') { const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, .4, 1.1), enFill); hull.position.y = .25; addE(hull, g); const tur = new THREE.Mesh(new THREE.CylinderGeometry(.36, .42, .3, 10), enFill); tur.position.y = .6; addE(tur, g);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .9, 8), enFill); bar.rotation.x = Math.PI / 2 - .5; bar.position.set(0, .82, .4); g.add(bar); const q = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), redGlow); q.position.set(0, 1.05, .8); g.add(q);
    for (const sx of [-1, 1]) { const tr = new THREE.Mesh(new THREE.BoxGeometry(.25, .3, 1.2), new THREE.MeshStandardMaterial({ color: '#05040c', metalness: .5, roughness: .6 })); tr.position.set(sx * .8, .15, 0); g.add(tr); }
    g.position.set(e.x0, 0, -100); e.hp = 3; e.shootT = rnd(.8, 1.6); if (!warned.t) { warned.t = 1; toast(T('🛡️ טנקים יורים מלמטה!', '🛡️ Tanks firing from the ground!')); } }
  scene.add(g); enemies.push(e); }
function fireBolt() { for (const sx of [-.32, .32]) { const m = new THREE.Mesh(boltGeo, boltM); m.position.set(plane.position.x + sx, plane.position.y, -.6); scene.add(m); bolts.push(m); } A.tone(1500, .06, 'square', .025, 0, 600); A.noise(.04, 'highpass', 4000, 1, .05); }
function boom(p, cols, n = 50) { for (const c of cols) FX.burst(p, n, [c], 6, .12, .9, 1); A.noise(.5, 'lowpass', 1200, 1, .35, 0, 100); A.tone(140, .4, 'sawtooth', .07, 0, 40); }
function clearWeapons() { for (const a of [bolts, ebs]) { a.forEach(m => scene.remove(m.m || m)); a.length = 0; } enemies.forEach(e => scene.remove(e.g)); enemies.length = 0; heat = 0; overheat = 0; kills = 0; enemyT = 6; }
function enemyShot(from) { const m = new THREE.Mesh(ebGeo, ebM); m.position.set(from.x, PY, from.z); const dir = V3(plane.position.x - from.x, 0, -from.z).normalize(); scene.add(m); ebs.push({ m, d: dir }); A.tone(500, .12, 'sawtooth', .03, 0, 250); }
function updWeapons(dt, v) {
  fireCd -= dt; overheat = Math.max(0, overheat - dt); if (!firing || overheat) heat = Math.max(0, heat - dt * .45);
  if (state === 'play' && (firing || keys[' ']) && !overheat && fireCd <= 0) { fireBolt(); fireCd = .16; heat += .07; if (heat >= 1) { overheat = 1.6; heat = 1; A.tone(300, .4, 'square', .05, 0, 120); toast(T('הרובה התחמם! 🔥', 'Gun overheated! 🔥')); } }
  $('heatI').style.width = (overheat ? 100 : heat * 100) + '%'; $('heatI').style.background = overheat ? '#ff3b4e' : heat > .7 ? '#ffb31a' : '#2ff3ff'; $('fireBtn').classList.toggle('hot', !!overheat);
  if (state === 'play' && dist > 60) { enemyT -= dt; if (enemyT <= 0) { const diff = clamp(dist / 2500, 0, 1); spawnEnemy(diff); if (diff > .5 && Math.random() < .45) spawnEnemy(diff); enemyT = lerp(6, 2.3, diff) * rnd(.8, 1.2); } }
  for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i]; b.position.z -= 70 * dt; let hit = false;
    for (const e of enemies) { const w = e.kind === 'missile' ? .55 : e.kind === 'tank' ? .95 : 1.15; if (Math.abs(b.position.z - e.g.position.z) < 1 && Math.abs(b.position.x - e.g.position.x) < w) { e.hp--; e.hit = .12; hit = true; A.tone(400, .05, 'square', .04); if (e.hp <= 0) e.dead = true; break; } }
    if (!hit) for (const o of obs) { if (o.dead || Math.abs(o.g.position.z - b.position.z) > Math.max(.7, o.r)) continue; if (Math.abs(b.position.x - o.x) < (o.kind === 'pylon' ? o.r : o.r * .85)) { hit = true; FX.burst(b.position, 5, [[.8, 2.4, 2.6]], 2, .05, .25, 0);
      if (o.kind !== 'pylon') { o.hp--; o.flash = .1; A.tone(260, .05, 'square', .03); if (o.hp <= 0) { o.dead = true; const p = V3(o.x, PY, o.g.position.z); boom(p, [[cur.obj.r * 2.4, cur.obj.g * 2.4, cur.obj.b * 2.4], [2.6, 2.2, .6]], 24 + o.r * 20); const bb = Math.ceil(o.r * 3) * (act.x2 ? 2 : 1); runCoins += bb; const [sx, sy] = screenOf(p); popText('💥 +' + bb, sx, sy); } } break; } }
    if (hit || b.position.z < -100) { scene.remove(b); bolts.splice(i, 1); } }
  for (let i = enemies.length - 1; i >= 0; i--) { const e = enemies[i]; e.t += dt; const P = e.g.position; e.hit = Math.max(0, e.hit - dt);
    if (e.kind === 'drone') { P.z += v * dt * .55; P.x = clamp(e.x0 + Math.sin(e.t * 1.3) * e.amp, -LANE, LANE); e.g.rotation.z = Math.cos(e.t * 1.3) * .4; e.g.children[0].material = e.hit ? boltM : enFill; }
    if (e.kind === 'missile') { P.z += (v * .55 + 17) * dt; if (P.z < -10 && state === 'play') P.x += clamp(plane.position.x - P.x, -1, 1) * e.turn * dt; e.g.rotation.z += dt * 6; e.blink.visible = Math.sin(e.t * 18) > 0; FX.emit(V3(P.x, P.y, P.z - .55), V3(rnd(-.3, .3), rnd(-.3, .3), -2), [2.6, 1.2, .3], .1, .3, 0, .8); }
    if (e.kind === 'jet') { P.z += (v * .55 + 9) * dt; const k = clamp((P.z + 100) / 100, 0, 1); P.x = lerp(e.x0, e.x1, Math.sin(k * Math.PI / 2)); e.g.rotation.z = (e.x1 - e.x0) * .06 * (1 - k); }
    if (e.kind === 'tank') { P.z += v * dt; e.g.children[2].rotation.y = Math.atan2(plane.position.x - P.x, -P.z) * .5; }
    if (e.dead) { boom(V3(P.x, Math.max(P.y, .6), P.z), [[2.6, .6, 1], [2.6, 2.2, .5]], 40); const b = REWARD[e.kind] * (act.x2 ? 2 : 1); runCoins += b; kills++; const [sx, sy] = screenOf(V3(P.x, Math.max(P.y, .6), P.z)); popText('💥 +' + b, sx, sy); scene.remove(e.g); enemies.splice(i, 1); continue; }
    if (state === 'play') { if (e.shootT != null) { e.shootT -= dt; if (e.shootT <= 0 && P.z > -70 && P.z < -10) { e.shootT = e.kind === 'tank' ? rnd(1.1, 1.8) : rnd(1.4, 2.6); enemyShot(P); } }
      const hw = e.kind === 'missile' ? .55 : e.kind === 'jet' ? 1.25 : 1.15; if (e.kind !== 'tank' && Math.abs(P.z) < .9 && Math.abs(P.x - plane.position.x) < hw) { boom(P, [[2.6, .6, 1]], 30); scene.remove(e.g); enemies.splice(i, 1); if (crash()) return true; continue; } }
    if (P.z > 8) { scene.remove(e.g); enemies.splice(i, 1); } }
  for (let i = ebs.length - 1; i >= 0; i--) { const b = ebs[i]; const sp = v * .55 + 12; b.m.position.addScaledVector(b.d, sp * dt); b.m.scale.setScalar(1 + Math.sin(performance.now() / 60) * .15);
    if (state === 'play' && Math.abs(b.m.position.z) < .5 && Math.abs(b.m.position.x - plane.position.x) < .55) { scene.remove(b.m); ebs.splice(i, 1); if (crash()) return true; continue; }
    if (b.m.position.z > 6) { scene.remove(b.m); ebs.splice(i, 1); } }
  return false;
}

/* ---------- state ---------- */
let state = 'title', dist = 0, runCoins = 0, speed = 14, nextZ = -40, tx = 0, vx = 0, shake = 0, deadT = 0, powT = 30, palIdx = 0;
const act = { shield: false, magnet: 0, x2: 0, slow: 0 };
function clearWorld() { for (const o of obs) scene.remove(o.g); obs.length = 0; for (const c of coins) scene.remove(c.m); coins.length = 0; for (const p of pows) scene.remove(p.m); pows.length = 0; }
function start() { clearWorld(); clearWeapons(); gapX = 0; warned = {}; dist = 0; runCoins = 0; speed = 14; nextZ = -36; tx = 0; vx = 0; plane.position.set(0, PY, 0); plane.visible = true; deadT = 0; powT = 18; Object.assign(act, { shield: false, magnet: 0, x2: 0, slow: 0 }); plane.userData.shield.visible = false;
  state = 'play'; $('title').hidden = true; $('overSheet').hidden = true; $('hud').hidden = $('score').hidden = $('fireWrap').hidden = false; A.ac(); A.startMusic({ chords: [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 44, 47]], bpm: 120, kick: true, lead: true, vol: 1.1 }); A.loopOn('eng', 'lowpass', 380, 1, .12, 3); A.loopTone('hum', 'sawtooth', 62, .018); updHud(); }
function updHud() { $('dist').textContent = Math.floor(dist) + 'm'; $('coinsTxt').textContent = '🪙 ' + runCoins + (kills ? '  💥 ' + kills : '');
  $('pw').innerHTML = Object.entries(act).filter(([k, v]) => v).map(([k, v]) => `<span style="border-color:${POW[k].c};color:${POW[k].c}">${POW[k].n}${typeof v === 'number' ? ' ' + Math.ceil(v) : ''}</span>`).join(''); }
function popText(s, x, y) { const d = document.createElement('div'); d.className = 'pop'; d.textContent = s; d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 1000); }
function screenOf(v) { const p = v.clone().project(camera); return [(p.x * .5 + .5) * innerWidth, (1 - (p.y * .5 + .5)) * innerHeight]; }
function crash() {
  if (act.shield) { act.shield = false; plane.userData.shield.visible = false; A.tone(300, .3, 'square', .08, 0, 900); shake = .3; FX.burst(plane.position, 40, [[.6, 1.6, 2.6]], 5, .12, .6, 0); toast(T('המגן הציל אותך!', 'The shield saved you!')); return false; }
  state = 'dead'; deadT = 0; shake = .8; plane.visible = false; A.loopOff('eng'); A.loopOff('hum'); A.noise(1.2, 'lowpass', 900, 1, .6, 0, 80); A.tone(120, .8, 'sawtooth', .12, 0, 30);
  const c = glowM.color; for (const col of [[c.r * 2, c.g * 2, c.b * 2], [2.6, 1.6, .5], [2.6, .6, 1.4]]) FX.burst(plane.position, 60, [col], 7, .14, 1.3, 2);
  S.coins += runCoins; const best = Math.floor(dist) > S.best; if (best) S.best = Math.floor(dist); S.save();
  setTimeout(() => { A.stopMusic(); $('oT').textContent = best ? T('שיא חדש! 🏆', 'New record! 🏆') : T('בום! 💥', 'Boom! 💥'); $('oDist').textContent = Math.floor(dist) + 'm'; $('oCoins').textContent = '+' + runCoins; $('oBest').textContent = S.best + 'm';
    $('oP').textContent = (kills ? T('💥 הפלתם ', '💥 Downed ') + kills + T(' אויבים · ', ' enemies · ') : '') + T('סה״כ מטבעות: ', 'Total coins: ') + S.coins; $('overSheet').hidden = false; $('hud').hidden = true; $('fireWrap').hidden = true; }, 1300);
  return true;
}
function hitBox(p, ox, oy, oz) { return Math.abs(plane.position.x - (p.wx ?? (p.x))) < p.hx + .45 && Math.abs(plane.position.y - p.y) < p.hy + .14 && Math.abs(oz) < p.hz + .5; }
function segDist(px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay; const t = clamp(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy), 0, 1); return Math.hypot(px - ax - vx * t, py - ay - vy * t); }

/* ---------- input ---------- */
let drag = null; const keys = {};
renderer.domElement.addEventListener('pointerdown', e => { if (state !== 'play') return; drag = { x: e.clientX, tx }; });
addEventListener('pointermove', e => { if (!drag) return; tx = clamp(drag.tx + (e.clientX - drag.x) / Math.min(innerWidth, 700) * LANE * 2.6, -LANE, LANE); });
addEventListener('pointerup', () => drag = null); addEventListener('pointercancel', () => drag = null);
addEventListener('keydown', e => { if (e.key === ' ') e.preventDefault(); keys[e.key] = true; if (e.key === 'Enter' && state === 'title') start(); });
addEventListener('keyup', e => keys[e.key] = false);

/* ---------- loop ---------- */
let last = performance.now(), hue = 0; const camLook = V3(0, 1, -8);
function frame(now) {
  requestAnimationFrame(frame); let dt = Math.min(.05, (now - last) / 1000) * (window.__fast || 1); last = now; const t = now / 1000;
  if (state === 'dead') { deadT += dt; dt *= Math.max(.15, 1 - deadT * 1.5); }
  if (state === 'pause') dt = 0;
  const slowF = act.slow ? .6 : 1; const v = (state === 'play' ? speed : state === 'title' ? 10 : speed * .3) * slowF;
  gridM.uniforms.off.value += v * dt * (state === 'title' ? 1 : 1); sunM.uniforms.t.value = t;
  if (state === 'play') {
    dist += v * dt * .5; speed = Math.min(34, 14 + dist * .011);
    if (keys.ArrowLeft || keys.a) tx = Math.max(-LANE, tx - dt * 7); if (keys.ArrowRight || keys.d) tx = Math.min(LANE, tx + dt * 7);
    const nx = lerp(plane.position.x, tx, Math.min(1, dt * 12)); vx = (nx - plane.position.x) / Math.max(dt, 1e-4); plane.position.x = nx;
    plane.rotation.z = lerp(plane.rotation.z, clamp(-vx * .07, -.7, .7), dt * 10); plane.rotation.x = Math.sin(t * 3) * .03; plane.position.y = PY + Math.sin(t * 2.2) * .05;
    // spawn
    nextZ += v * dt; while (nextZ > -95) { const diff = clamp(dist / 2500, 0, 1); spawnRow(nextZ - 60, diff); nextZ -= lerp(15, 8.5, diff); }
    powT -= dt; if (powT <= 0) { spawnPow(-90); powT = rnd(16, 26); }
    for (const k of ['magnet', 'x2', 'slow']) if (act[k]) { act[k] = Math.max(0, act[k] - dt); }
    // palette
    const pi = Math.floor(dist / 700) % PAL.length; if (pi !== palIdx) { palIdx = pi; toast(['🌌', '🌅', '🌿', '🔥', '💜'][pi] + ' ' + T('אזור חדש!', 'New zone!')); A.tone(660, .3, 'triangle', .06); A.tone(990, .4, 'triangle', .05, .12); }
  }
  const P = PAL[palIdx]; const kk = Math.min(1, dt * 1.5); cur.grid.lerp(C(P.grid), kk); cur.obj.lerp(C(P.obj), kk); cur.s1.lerp(C(P.s1), kk); cur.s2.lerp(C(P.s2), kk); cur.sunA.lerp(C(P.sunA), kk); cur.sunB.lerp(C(P.sunB), kk);
  objLine.color.copy(cur.obj).multiplyScalar(2.2); mountains.userData.lineM.color.copy(cur.grid).multiplyScalar(1.6); scene.fog.color.copy(cur.s2);
  if (S.skin === 'rainbow') { hue = (hue + dt * .3) % 1; glowM.color.setHSL(hue, 1, .6); edgeM.color.setHSL(hue, 1, .6); }
  // move obstacles
  for (let i = obs.length - 1; i >= 0; i--) { const o = obs[i]; const z0 = o.g.position.z; o.g.position.z += v * dt; o.t += dt; const z = o.g.position.z;
    if (o.dead) { scene.remove(o.g); obs.splice(i, 1); continue; }
    if (o.kind !== 'pylon') { o.body.rotation.x += o.spin.x * dt; o.body.rotation.y += o.spin.y * dt; }
    if (o.vx) { o.x += o.vx * dt; if (Math.abs(o.x) > LANE) { o.vx *= -1; o.x = clamp(o.x, -LANE, LANE); } o.g.position.x = o.x; o.body.scale.setScalar(o.r * (1 + Math.sin(o.t * 9) * .07)); }
    if (o.flash > 0) { o.flash -= dt; o.body.children[0].material = o.flash > 0 ? boltM : objFill; }
    const hr = o.kind === 'pylon' ? o.r : o.r * .8;
    if (state === 'play' && !o.hit && Math.abs(z) < hr + .45 && Math.abs(plane.position.x - o.x) < hr + .36) { o.hit = true; if (crash()) return; }
    if (state === 'play' && z0 < 0 && z >= 0 && !o.hit) { const near = Math.abs(plane.position.x - o.x) - hr - .36; if (near < .4 && near > 0) { const b = 5 * (act.x2 ? 2 : 1); runCoins += b; A.noise(.25, 'bandpass', 1800, 1, .25, 0, 4000); const [sx, sy] = screenOf(plane.position); popText(T('ממש קרוב! +', 'Close call! +') + b, sx, sy - 60); } }
    if (z > 10) { scene.remove(o.g); obs.splice(i, 1); } }
  for (let i = coins.length - 1; i >= 0; i--) { const c = coins[i]; c.m.position.z += v * dt; c.m.rotation.y += dt * 4;
    if (state === 'play') { const dx = plane.position.x - c.m.position.x, dz = c.m.position.z; if (act.magnet && Math.abs(dz) < 9) { c.m.position.x += dx * Math.min(1, dt * 6); }
      if (Math.abs(dx) < .65 && Math.abs(dz) < .6) { runCoins += act.x2 ? 2 : 1; A.tone(1320, .08, 'square', .03); A.tone(1980, .12, 'sine', .04, .04); FX.burst(c.m.position, 8, [[2.6, 2.2, .6]], 2, .07, .4, 0); scene.remove(c.m); coins.splice(i, 1); continue; } }
    if (c.m.position.z > 8) { scene.remove(c.m); coins.splice(i, 1); } }
  for (let i = pows.length - 1; i >= 0; i--) { const p = pows[i]; p.m.position.z += v * dt; p.m.rotation.x += dt * 2; p.m.rotation.y += dt * 3;
    if (state === 'play' && Math.abs(plane.position.x - p.m.position.x) < .8 && Math.abs(p.m.position.z) < .8) { if (p.k === 'shield') { act.shield = true; plane.userData.shield.visible = true; } else act[p.k] = POW[p.k].d;
      A.tone(523, .12, 'triangle', .08); A.tone(784, .12, 'triangle', .08, .1); A.tone(1046, .2, 'triangle', .08, .2); toast(POW[p.k].n + '!'); scene.remove(p.m); pows.splice(i, 1); continue; }
    if (p.m.position.z > 8) { scene.remove(p.m); pows.splice(i, 1); } }
  if (updWeapons(dt, v)) return;
  // trail
  if (plane.visible) { const c = glowM.color; for (let k = 0; k < 2; k++) FX.emit(V3(plane.position.x + rnd(-.04, .04), plane.position.y + rnd(-.03, .03), 1.05), V3(rnd(-.15, .15), rnd(-.08, .08), v * .5 + 2), [c.r * 1.3, c.g * 1.3, c.b * 1.3], .055, .28, 0, .7); }
  plane.userData.shield.rotation.y += dt;
  // camera
  shake = Math.max(0, shake - dt); const sx = (Math.random() - .5) * shake * .6, sy = (Math.random() - .5) * shake * .6;
  const port = innerWidth / innerHeight < 1; camera.position.set(plane.position.x * (port ? .8 : .45) + sx, (port ? 3.3 : 2.7) + sy, port ? 6.6 : 5.8); camLook.set(plane.position.x * (port ? .85 : .7), 1.0, -9); camera.lookAt(camLook);
  if (state === 'title') { plane.position.x = Math.sin(t * .8) * 1.5; plane.rotation.z = -Math.cos(t * .8) * .35; plane.position.y = PY + Math.sin(t * 2) * .08; }
  if (state === 'play') updHud();
  FX.update(dt); A.tick(); E.render();
}

/* ---------- screens ---------- */
function showTitle() { state = 'title'; clearWorld(); clearWeapons(); plane.visible = true; $('title').hidden = false; $('hud').hidden = $('score').hidden = $('fireWrap').hidden = true; $('overSheet').hidden = true; $('pw').innerHTML = ''; $('vBest').textContent = S.best + 'm'; $('vCoins').textContent = '🪙 ' + S.coins; A.allOff(); A.stopMusic(); }
function renderHangar() { $('hP').textContent = T('יש לך ', 'You have ') + '🪙 ' + S.coins;
  $('hangar').innerHTML = SKINS.map(s => { const own = S.owned.includes(s.id); const bg = s.c === 'rainbow' ? 'linear-gradient(90deg,#ff3f6a,#ffd84a,#7aff3a,#2ff3ff,#a46bff)' : s.c;
    return `<button class="sk ${own || S.coins >= s.p ? '' : 'lock'}" data-s="${s.id}" aria-pressed="${S.skin === s.id}"><i style="background:${bg};box-shadow:0 0 14px ${s.c === 'rainbow' ? '#ff3fd0' : s.c}"></i>${s.n}<small>${own ? (S.skin === s.id ? T('בשימוש', 'In use') : T('בחר', 'Pick')) : '🪙 ' + s.p}</small></button>`; }).join(''); }
$('hangar').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; A.ac(); const s = SKINS.find(k => k.id === b.dataset.s); if (!S.owned.includes(s.id)) { if (S.coins < s.p) { A.tone(160, .2, 'square', .05); toast(T('חסרים מטבעות', 'Not enough coins')); return; } S.coins -= s.p; S.owned.push(s.id); A.tone(880, .2, 'triangle', .08); A.tone(1320, .3, 'triangle', .06, .1); }
  S.skin = s.id; S.save(); applySkin(); renderHangar(); $('vCoins').textContent = '🪙 ' + S.coins; };
const fb = $('fireBtn'); const fOn = e => { e.preventDefault(); e.stopPropagation(); firing = true; A.ac(); }, fOff = () => firing = false; fb.addEventListener('pointerdown', fOn); fb.addEventListener('pointerup', fOff); fb.addEventListener('pointerleave', fOff); fb.addEventListener('pointercancel', fOff);
$('playBtn').onclick = start; $('oAgain').onclick = start; $('oMenu').onclick = showTitle;
$('hangarBtn').onclick = () => { A.ac(); renderHangar(); $('hangarSheet').hidden = false; }; $('hClose').onclick = () => $('hangarSheet').hidden = true;
$('pauseBtn').onclick = () => { if (state !== 'play') return; state = 'pause'; $('pauseSheet').hidden = false; A.loopOff('eng'); A.loopOff('hum'); };
$('pGo').onclick = () => { $('pauseSheet').hidden = true; state = 'play'; last = performance.now(); A.loopOn('eng', 'lowpass', 380, 1, .12, 3); A.loopTone('hum', 'sawtooth', 62, .018); };
$('pMenu').onclick = () => { $('pauseSheet').hidden = true; showTitle(); };
$('pauseBtn').innerHTML = ICO.pause('#2ff3ff'); $('homeT').innerHTML = ICO.home('#7a1bff');
soundButton('sndBtn', S, A, '#2ff3ff'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('tSub').textContent = T('גררו ימינה ושמאלה, התחמקו מסלעים שהולכים וגדלים, ירו ברחפנים, טילים, מטוסים וטנקים ואספו מטבעות. כמה רחוק תגיעו?', 'Drag left and right, dodge ever-growing rocks, shoot drones, missiles, jets and tanks, and grab coins. How far can you fly?');
$('lBest').textContent = T('שיא', 'Best'); $('lCoins').textContent = T('מטבעות', 'Coins'); $('playBtn').textContent = T('המראה! ✈', 'Take off! ✈'); $('hangarBtn').textContent = '🛩 ' + T('האנגר', 'Hangar');
$('oL1').textContent = T('מרחק', 'Distance'); $('oL2').textContent = T('מטבעות', 'Coins'); $('oL3').textContent = T('שיא', 'Best'); $('oMenu').textContent = T('תפריט', 'Menu'); $('oAgain').textContent = T('שוב! ✈', 'Again! ✈');
$('hT').textContent = T('האנגר', 'Hangar'); $('hClose').textContent = T('סגור', 'Close'); $('pT').textContent = T('הפסקה', 'Paused'); $('pMenu').textContent = T('תפריט', 'Menu'); $('pGo').textContent = T('המשך', 'Resume');
setTimeout(() => { E.resize(); showTitle(); $('loading').hidden = true; requestAnimationFrame(frame); window.__skyOK = true; }, 20);
window.__k = { get en() { return enemies; }, get kills() { return kills; }, setDist(v) { dist = v; enemyT = 0.5; }, start, get state() { return state; }, get dist() { return dist; }, set tx(v) { tx = v; }, obs, plane, act };
