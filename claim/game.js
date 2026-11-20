import { THREE, $, V3, C, clamp, lerp, rnd, T, EN, store, engine, studioEnv, std, shadowAll, cnv, ctex, particles, CONFETTI, audio, toast, ICO, hubButtons, soundButton, qualityButton, starsHTML } from '../lib/kit.js';

const S = store('claim-save', { stars: {}, best: 0, tut: 0 });
const E = engine(S, { fov: 38, bloom: [.35, .45, 1.1], exposure: 1.05, bg: '#0e2a3a', vignette: .35 });
const { scene, camera, renderer } = E; studioEnv(E, '#eaf6ff', '#36506a', .5);
const A = audio(S); const FX = particles(E, 1500);
const OPEN = 0, LAND = 1, TRAIL = 2, PX = 14;

/* ---------- themes ---------- */
const THEMES = [
  { land: ['#6fcf5a', '#5ebf4c'], edge: '#3a8a32', water: ['#1a6aa8', '#3ab0e8'], frame: '#c07a3a', sky: '#0e2a3a', ball: ['#ff4a6a', '#ffd23a', '#4ae0ff', '#a46bff'] },
  { land: ['#f2d48a', '#e8c472'], edge: '#b08a3a', water: ['#0a7a8a', '#2ad0c8'], frame: '#8a5a3a', sky: '#123a3a', ball: ['#ff6a2a', '#ff3ab0', '#3a8aff', '#5aff8a'] },
  { land: ['#e8f4ff', '#d4e8f8'], edge: '#8ab0d0', water: ['#1a2a6a', '#4a6ae0'], frame: '#6a7a9a', sky: '#0a1430', ball: ['#ff3a5a', '#ffb21f', '#5ad8ff', '#d07aff'] },
  { land: ['#b48aff', '#a478f0'], edge: '#6a4ab0', water: ['#3a0a4a', '#ff3ab0'], frame: '#4a2a6a', sky: '#1a0828', ball: ['#ffd23a', '#5aff8a', '#4ae0ff', '#ff7a3a'] },
  { land: ['#5a4a42', '#4e403a'], edge: '#2a2020', water: ['#8a1a0a', '#ffa21a'], frame: '#3a2a22', sky: '#1a0a06', ball: ['#ffe14a', '#ffffff', '#ff5a2a', '#ffb0a0'] },
];
const LEVELS = Array.from({ length: 20 }, (_, i) => { const L = i + 1; return { L, balls: Math.min(7, 1 + Math.floor(L / 2)), speed: Math.min(8.2, 3.8 + L * .22), crawl: L >= 5 ? Math.min(3, Math.floor((L - 1) / 4)) : 0, goal: L <= 4 ? 70 : 75, items: L >= 2, theme: Math.floor(i / 4) % THEMES.length }; });

/* ---------- world ---------- */
const hemi = new THREE.HemisphereLight('#ffffff', '#40506a', .7); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e0', 2.2); sun.position.set(-8, 22, 12); sun.castShadow = renderer.shadowMap.enabled; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 70 }); sun.shadow.bias = -.0006; scene.add(sun);
const world = new THREE.Group(); scene.add(world);
let W = 28, H = 40, grid = null, landTex = null, landCtx = null, landCanvas = null, waterM = null, beads = null, frame = null;
const waterMat = () => new THREE.ShaderMaterial({ uniforms: { t: { value: 0 }, a: { value: C('#1a6aa8') }, b: { value: C('#3ab0e8') } },
  vertexShader: `varying vec2 vU; varying vec3 vW; void main(){ vU=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform float t; uniform vec3 a; uniform vec3 b; varying vec3 vW; void main(){ vec2 p=vW.xz*.35; float w=sin(p.x*2.1+t*1.3)*.5+sin(p.y*2.7-t*1.1)*.5+sin((p.x+p.y)*1.4+t*.7)*.5; float c=smoothstep(-1.0,1.5,w);
    float sp=pow(max(0.0,sin(p.x*6.0+t*2.0)*sin(p.y*5.0-t*1.6)),18.0); vec3 col=mix(a,b,c*.7)+sp*.6; gl_FragColor=vec4(col,1.0); }` });
function buildBoard(th) {
  world.clear(); scene.background = C(th.sky);
  // water under the board
  waterM = waterMat(); waterM.uniforms.a.value = C(th.water[0]); waterM.uniforms.b.value = C(th.water[1]);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(W, H), waterM); water.rotation.x = -Math.PI / 2; water.position.y = -.32; world.add(water);
  // land layer drawn on a canvas, cells cut out where the area is still open
  landCanvas = cnv(W * PX, H * PX); landCtx = landCanvas.getContext('2d'); landTex = new THREE.CanvasTexture(landCanvas); landTex.colorSpace = THREE.SRGBColorSpace; landTex.anisotropy = 8;
  const land = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: landTex, transparent: true, alphaTest: .5, roughness: .75 })); land.rotation.x = -Math.PI / 2; land.receiveShadow = true; world.add(land);
  // a dark underside so captured land looks thick
  const under = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: landTex, transparent: true, alphaTest: .5, color: C(th.edge).multiplyScalar(.6) })); under.rotation.x = -Math.PI / 2; under.position.y = -.12; world.add(under);
  // wooden frame
  const fm = std(th.frame, { roughness: .6 }); const t = .9, h = .8; frame = new THREE.Group();
  for (const [x, z, w, d] of [[0, -H / 2 - t / 2, W + t * 2, t], [0, H / 2 + t / 2, W + t * 2, t], [-W / 2 - t / 2, 0, t, H], [W / 2 + t / 2, 0, t, H]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fm); b.position.set(x, h / 2 - .35, z); b.castShadow = b.receiveShadow = true; frame.add(b); }
  world.add(frame);
  const base = new THREE.Mesh(new THREE.BoxGeometry(W + 6, .4, H + 6), std(C(th.sky).lerp(C('#000'), .2).getStyle(), { roughness: .9 })); base.position.y = -.9; world.add(base);
  beads = new THREE.InstancedMesh(new THREE.SphereGeometry(.26, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff2c8', emissive: C('#ffcf6a'), emissiveIntensity: .45, roughness: .3 }), W * H); beads.count = 0; beads.castShadow = true; world.add(beads);
  world.add(player.g, ...balls.map(b => b.m));
}
const cx = i => i - W / 2 + .5, cz = j => j - H / 2 + .5;
function drawCell(i, j, flash = 0) { const s = grid[j * W + i], x = i * PX, y = j * PX; const g = landCtx;
  if (s !== LAND) { g.clearRect(x, y, PX, PX); return; }
  const th = THEMES[LV.theme]; g.fillStyle = flash > 0 ? '#ffffff' : th.land[(i + j) & 1]; g.fillRect(x, y, PX, PX);
  if (flash > 0) { g.globalAlpha = 1 - flash; g.fillStyle = th.land[(i + j) & 1]; g.fillRect(x, y, PX, PX); g.globalAlpha = 1; }
  const o = (a, b) => { const q = grid[b * W + a]; return a < 0 || b < 0 || a >= W || b >= H || q === LAND; };
  g.fillStyle = th.edge; if (!o(i, j + 1)) g.fillRect(x, y + PX - 3, PX, 3); if (!o(i, j - 1)) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y, PX, 2); } g.fillStyle = 'rgba(0,0,0,.12)'; if (!o(i - 1, j)) g.fillRect(x, y, 2, PX); if (!o(i + 1, j)) g.fillRect(x + PX - 2, y, 2, PX); }
function redrawAll() { landCtx.clearRect(0, 0, W * PX, H * PX); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) drawCell(i, j); landTex.needsUpdate = true; }
const dirty = new Set(); function touch(i, j) { for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < W && b < H) dirty.add(b * W + a); } }

/* ---------- actors ---------- */
const player = (() => { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(.46, 28, 20), new THREE.MeshPhysicalMaterial({ color: '#1f6f9a', roughness: .25, clearcoat: 1 })); body.scale.y = .85; g.add(body);
  const band = new THREE.Mesh(new THREE.TorusGeometry(.42, .07, 10, 32), std('#ff4a3a', { roughness: .3 })); band.rotation.x = Math.PI / 2; band.position.y = -.08; g.add(band);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 10), new THREE.MeshBasicMaterial({ color: C('#ffffff').multiplyScalar(1.6) })); e.position.set(s * .16, .02, .4); g.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(.045, 8, 6), new THREE.MeshBasicMaterial({ color: '#111' })); p.position.set(s * .16, .02, .48); g.add(p); }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .22, 8), std('#ddd')); mast.position.y = .47; g.add(mast);
  const prop = new THREE.Group(); prop.position.y = .58; for (let k = 0; k < 2; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, .03, .14), std(k ? '#ffffff' : '#4ab0ff', { roughness: .4 })); b.rotation.y = k * Math.PI / 2; prop.add(b); } g.add(prop);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(.5, 24), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .25, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = -.5; g.add(sh);
  shadowAll(g, true, false); sh.castShadow = false; g.scale.setScalar(1.35); return { g, prop, sh, i: 0, j: 0, ti: 0, tj: 0, t: 1, dir: null, next: null, inv: 0 }; })();
let balls = [], crawlers = [], items = [];
function mkBall(i, j, sp, land) { const th = THEMES[LV.theme]; let m;
  if (land) { m = new THREE.Group(); const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.36, 0), std('#20202a', { roughness: .4, metalness: .5 })); m.add(core); for (let k = 0; k < 12; k++) { const sp2 = new THREE.Mesh(new THREE.ConeGeometry(.1, .4, 6), std('#2a2a34', { metalness: .6, roughness: .3 })); const d = V3(rnd(-1, 1), rnd(-.3, 1), rnd(-1, 1)).normalize(); sp2.position.copy(d).multiplyScalar(.38); sp2.quaternion.setFromUnitVectors(V3(0, 1, 0), d); m.add(sp2); }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.1, 10, 8), new THREE.MeshBasicMaterial({ color: C('#ff2a2a').multiplyScalar(2) })); eye.position.set(0, .15, .3); m.add(eye); }
  else { const c = document.createElement('canvas'); c.width = 64; c.height = 32; const g = c.getContext('2d'); const cs = th.ball; for (let k = 0; k < 4; k++) { g.fillStyle = cs[(k + balls.length) % 4]; g.fillRect(k * 16, 0, 16, 32); } const tx = ctex(c); m = new THREE.Mesh(new THREE.SphereGeometry(.56, 24, 16), new THREE.MeshPhysicalMaterial({ map: tx, roughness: .15, clearcoat: 1 })); }
  m.castShadow = true; world.add(m); const a = rnd(0, Math.PI * 2); const q = { m, x: i + .5, y: j + .5, vx: Math.sign(Math.cos(a) || 1) * sp, vy: Math.sign(Math.sin(a) || 1) * sp, land }; m.position.set(cx(i), land ? .38 : .05, cz(j)); return q; }

/* ---------- state ---------- */
let LV = LEVELS[0], state = 'title', lives = 3, score = 0, trail = [], lastLand = [0, 0], pct = 0, fills = [], freeze = 0, slow = 0, itemT = 8, deaths = 0, levelScore = 0, interior = 1;
const cell = (i, j) => (i < 0 || j < 0 || i >= W || j >= H) ? LAND : grid[j * W + i];
function setCell(i, j, v) { grid[j * W + i] = v; touch(i, j); }
function startLevel(n, demo) {
  LV = LEVELS[n]; const port = innerWidth < innerHeight * .95; W = port ? 20 : 32; H = port ? 30 : 20; grid = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (i < 2 || j < 2 || i >= W - 2 || j >= H - 2) grid[j * W + i] = LAND; interior = (W - 4) * (H - 4);
  balls.forEach(b => world.remove(b.m)); crawlers.forEach(b => world.remove(b.m)); items.forEach(it => world.remove(it.m)); balls = []; crawlers = []; items = []; trail = []; fills = []; freeze = slow = 0; itemT = 9; deaths = 0; levelScore = 0;
  buildBoard(THEMES[LV.theme]); redrawAll();
  for (let k = 0; k < LV.balls; k++) { let i, j; do { i = 4 + Math.floor(Math.random() * (W - 8)); j = 4 + Math.floor(Math.random() * (H - 8)); } while (Math.abs(i - W / 2) < 3 && j > H - 10); const b = mkBall(i, j, LV.speed * rnd(.9, 1.1), false); balls.push(b); }
  for (let k = 0; k < LV.crawl; k++) { const c = mkBall(k % 2 ? W - 2 : 1, k % 2 ? 1 : 1, LV.speed * .55, true); crawlers.push(c); }
  Object.assign(player, { i: W >> 1, j: H - 1, ti: W >> 1, tj: H - 1, t: 1, dir: null, next: null, inv: 1.5 }); lastLand = [player.i, player.j]; player.g.position.set(cx(player.i), .55, cz(player.j));
  pct = 0; updHud(); fit(); state = 'play'; $('title').hidden = true; $('endSheet').hidden = $('pauseSheet').hidden = true; $('hud').hidden = $('bar').hidden = false; $('lvTxt').textContent = T('שלב ', 'Level ') + LV.L;
  $('barG').style.left = LV.goal + '%'; const h = $('hint'); h.hidden = !!demo; h.textContent = T('החליקו כדי לזוז · יוצאים לים, סוגרים שטח וחוזרים ליבשה', 'Swipe to move · head into the water, close off an area and get back to land'); setTimeout(() => h.hidden = true, 5000);
  if (demo) return; A.startMusic({ chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], bpm: 112, lead: true, kick: true, vol: .7 });
  if (!S.tut) { S.tut = 1; S.save(); setTimeout(() => toast(T('צאו מהיבשה לים, ציירו קו וחזרו ליבשה – השטח שבלי כדורים נסגר! אל תתנו לכדורים לגעת בקו', 'Leave land, draw a line and return – the area without balls is captured! Don’t let balls touch your line'), 6000), 600); } }
function updHud() { $('scoreTxt').textContent = score; $('livesTxt').textContent = '❤️'.repeat(Math.max(0, lives)); $('barI').style.width = Math.min(100, pct / LV.goal * LV.goal) + '%'; $('barT').textContent = Math.floor(pct) + '% / ' + LV.goal + '%';
  $('pw').innerHTML = (freeze > 0 ? `<span>❄️ ${Math.ceil(freeze)}</span>` : '') + (slow > 0 ? `<span>🐢 ${Math.ceil(slow)}</span>` : ''); }
function fit() { const a = innerWidth / innerHeight, fovR = THREE.MathUtils.degToRad(camera.fov / 2), tilt = .95; const needW = W + 3, needH = (H + 3) * Math.cos(tilt * .55);
  const d = Math.max(needW / (2 * Math.tan(fovR) * a), needH / (2 * Math.tan(fovR) * .8)) * 1.02; camera.position.set(0, d * Math.sin(tilt), d * Math.cos(tilt) + H * .04); camera.lookAt(0, 0, H * .03);
  camera.setViewOffset(innerWidth, innerHeight, 0, -innerHeight * .03, innerWidth, innerHeight); camera.updateProjectionMatrix(); }
E.onResize.push(() => { if (grid) fit(); });

/* ---------- capture ---------- */
function capture() {
  for (const [i, j] of trail) setCell(i, j, LAND); trail = []; beads.count = 0; beads.instanceMatrix.needsUpdate = true;
  const seen = new Uint8Array(W * H), st = [];
  for (const b of balls) { const i = Math.floor(b.x), j = Math.floor(b.y), k = j * W + i; if (grid[k] === OPEN && !seen[k]) { seen[k] = 1; st.push(k); } }
  while (st.length) { const k = st.pop(), i = k % W, j = (k / W) | 0; for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) { if (a < 0 || b < 0 || a >= W || b >= H) continue; const q = b * W + a; if (!seen[q] && grid[q] === OPEN) { seen[q] = 1; st.push(q); } } }
  let n = 0; const pi = player.i, pj = player.j;
  for (let k = 0; k < W * H; k++) if (grid[k] === OPEN && !seen[k]) { grid[k] = LAND; n++; const i = k % W, j = (k / W) | 0; fills.push({ i, j, t: -Math.hypot(i - pi, j - pj) * .018 }); }
  for (let k = 0; k < W * H; k++) if (grid[k] === LAND) { } // keep
  const gain = n * 10 + (n > interior * .15 ? n * 5 : 0); score += gain; levelScore += gain;
  if (n) { A.tone(400, .25, 'triangle', .07, 0, 1200); A.noise(.4, 'bandpass', 1600, 1, .08, 0, 5000); popAt(player.g.position, '+' + gain); if (n > interior * .15) toast(T('איזה שטח ענק! 🎉', 'Huge area! 🎉')); }
  else A.tone(660, .1, 'triangle', .06);
  for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (grid[it.j * W + it.i] === LAND) takeItem(it, i); }
  recount(); }
function recount() { let c = 0; for (let j = 2; j < H - 2; j++) for (let i = 2; i < W - 2; i++) if (grid[j * W + i] === LAND) c++; pct = c / interior * 100; updHud();
  if (pct >= LV.goal && state === 'play') { state = 'won'; setTimeout(winLevel, 900); } }
function popAt(p, txt) { const v = p.clone().project(camera); const d = document.createElement('div'); d.className = 'pop'; d.textContent = txt; d.style.left = (v.x * .5 + .5) * innerWidth + 'px'; d.style.top = (1 - (v.y * .5 + .5)) * innerHeight - 30 + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 1200); }

/* ---------- items ---------- */
const ITEMS = { freeze: '❄️', slow: '🐢', life: '❤️', star: '⭐' };
const itemTex = {}; function emojiTex(e) { if (itemTex[e]) return itemTex[e]; const c = cnv(128, 128), g = c.getContext('2d'); g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fillStyle = 'rgba(255,255,255,.92)'; g.fill(); g.font = '76px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, 64, 70); return itemTex[e] = ctex(c); }
function spawnItem() { const keys = Object.keys(ITEMS); let k = keys[Math.floor(Math.random() * keys.length)]; if (k === 'life' && (lives >= 5 || Math.random() < .5)) k = 'star';
  for (let tt = 0; tt < 40; tt++) { const i = 3 + Math.floor(Math.random() * (W - 6)), j = 3 + Math.floor(Math.random() * (H - 6)); if (grid[j * W + i] !== OPEN) continue; if (balls.some(b => Math.hypot(b.x - i, b.y - j) < 4)) continue;
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(ITEMS[k]), depthWrite: false })); m.scale.setScalar(1.3); m.position.set(cx(i), .8, cz(j)); world.add(m); items.push({ k, i, j, m, life: 14 }); A.tone(1200, .1, 'sine', .04); return; } }
function takeItem(it, idx) { world.remove(it.m); items.splice(idx, 1); A.tone(880, .1, 'triangle', .07); A.tone(1320, .15, 'triangle', .06, .08); FX.burst(V3(cx(it.i), .8, cz(it.j)), 30, CONFETTI, 3, .08, .9, 4);
  if (it.k === 'freeze') { freeze = 5; toast(T('❄️ הכדורים קפאו!', '❄️ Balls frozen!')); } if (it.k === 'slow') { slow = 8; toast(T('🐢 הכדורים האטו!', '🐢 Balls slowed down!')); }
  if (it.k === 'life') { lives = Math.min(5, lives + 1); toast(T('❤️ חיים נוספים!', '❤️ Extra life!')); } if (it.k === 'star') { score += 500; levelScore += 500; popAt(it.m.position, '+500'); } updHud(); }

/* ---------- player ---------- */
const DIRS = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
function die() { if (state !== 'play' || player.inv > 0) return; lives--; deaths++; A.noise(.6, 'lowpass', 900, 1, .4, 0, 80); A.tone(160, .6, 'sawtooth', .1, 0, 40); A.voice('aww', 1); E.grade.uniforms.uFlash.value = .4;
  FX.burst(player.g.position.clone(), 60, [[2.6, .8, .4], [2.6, 2.2, .6], [1, 1, 1]], 5, .1, 1, 4);
  for (const [i, j] of trail) setCell(i, j, OPEN); trail = []; beads.count = 0; beads.instanceMatrix.needsUpdate = true;
  Object.assign(player, { i: lastLand[0], j: lastLand[1], ti: lastLand[0], tj: lastLand[1], t: 1, dir: null, next: null, inv: 2 }); updHud();
  if (lives <= 0) { state = 'lost'; setTimeout(loseLevel, 900); } else toast(T('אאוץ׳! נשארו ', 'Ouch! Lives left: ') + lives + ' ❤️'); }
function enterCell(i, j) { const s = cell(i, j);
  if (s === TRAIL) { die(); return false; }
  if (s === OPEN) { if (!trail.length) lastLand = [player.i, player.j]; setCell(i, j, TRAIL); trail.push([i, j]); const m = new THREE.Matrix4().makeTranslation(cx(i), .05, cz(j)); beads.setMatrixAt(trail.length - 1, m); beads.count = trail.length; beads.instanceMatrix.needsUpdate = true; A.tone(520 + (trail.length % 8) * 30, .03, 'sine', .025);
    const it = items.findIndex(q => q.i === i && q.j === j); if (it >= 0) takeItem(items[it], it); }
  else if (s === LAND && trail.length) capture();
  return true; }
function stepPlayer(dt) { const sp = 9.5; player.inv = Math.max(0, player.inv - dt);
  if (player.t < 1) { player.t = Math.min(1, player.t + dt * sp); }
  if (player.t >= 1) { player.i = player.ti; player.j = player.tj; // at a cell centre: decide where to go next
    const inSea = cell(player.i, player.j) !== LAND;
    if (player.next) { const nd = DIRS[player.next], cd = player.dir && DIRS[player.dir]; if (!(inSea && cd && nd[0] === -cd[0] && nd[1] === -cd[1])) player.dir = player.next; player.next = null; }
    if (player.dir) { const [di, dj] = DIRS[player.dir]; const ni = player.i + di, nj = player.j + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) { if (!inSea) player.dir = null; } else { player.ti = ni; player.tj = nj; player.t = 0; if (!enterCell(ni, nj)) return; } } }
  const k = player.t, x = lerp(cx(player.i), cx(player.ti), k), z = lerp(cz(player.j), cz(player.tj), k);
  player.g.position.set(x, .55 + Math.sin(performance.now() / 180) * .05, z); const d = player.dir && DIRS[player.dir]; if (d) { const ry = Math.atan2(d[0], d[1]); player.g.rotation.y = lerp(player.g.rotation.y, ry, Math.min(1, dt * 14)); }
  player.prop.rotation.y += dt * 30; player.g.visible = player.inv > 0 ? Math.sin(performance.now() / 60) > 0 : true; }
function stepBall(b, dt) { const sp = freeze > 0 ? 0 : slow > 0 ? .5 : 1; if (!sp) return; let n = Math.ceil(Math.max(Math.abs(b.vx), Math.abs(b.vy)) * dt * sp / .3);
  const free = (x, y) => { const s = cell(Math.floor(x), Math.floor(y)); return b.land ? s === LAND && Math.floor(x) >= 0 && Math.floor(y) >= 0 && Math.floor(x) < W && Math.floor(y) < H : s !== LAND; };
  for (let s = 0; s < n; s++) { const h = dt * sp / n, r = .45; let nx = b.x + b.vx * h, ny = b.y + b.vy * h;
    if (!free(nx + Math.sign(b.vx) * r, b.y)) { b.vx = -b.vx; nx = b.x; tick(b); } if (!free(b.x, ny + Math.sign(b.vy) * r)) { b.vy = -b.vy; ny = b.y; tick(b); }
    if (!free(nx + Math.sign(b.vx) * r, ny + Math.sign(b.vy) * r)) { b.vx = -b.vx; b.vy = -b.vy; nx = b.x; ny = b.y; tick(b); }
    b.x = nx; b.y = ny;
    if (!b.land && cell(Math.floor(b.x), Math.floor(b.y)) === TRAIL) { die(); return; }
    const px = player.i + .5 + (player.ti - player.i) * player.t, py = player.j + .5 + (player.tj - player.j) * player.t;
    if (Math.hypot(b.x - px, b.y - py) < .8) { const onLand = cell(player.i, player.j) === LAND && cell(player.ti, player.tj) === LAND; if (b.land ? onLand : !onLand) { die(); return; } } }
  b.m.position.set(b.x - W / 2, b.land ? .38 : .12, b.y - H / 2); b.m.rotation.x += b.vy * dt * sp * 1.5; b.m.rotation.z -= b.vx * dt * sp * 1.5; }
function tick(b) { if (Math.random() < .3) A.tone(b.land ? 220 : 700 + Math.random() * 200, .03, 'sine', .02); }

/* ---------- input ---------- */
let sw = null; const stage = $('stage');
stage.addEventListener('pointerdown', e => { if (state !== 'play') return; A.ac(); sw = { x: e.clientX, y: e.clientY, used: false }; });
addEventListener('pointermove', e => { if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y; if (Math.hypot(dx, dy) < 22) return; setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u')); sw.x = e.clientX; sw.y = e.clientY; sw.used = true; });
addEventListener('pointerup', () => { if (sw && !sw.used && state === 'play' && cell(player.i, player.j) === LAND && player.t >= 1) player.dir = null; sw = null; });
addEventListener('keydown', e => { const m = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r' }[e.key]; if (m && state === 'play') { e.preventDefault(); setDir(m); } if (e.key === ' ' && state === 'play' && cell(player.i, player.j) === LAND) player.dir = null; });
function setDir(d) { if (!player.dir && player.t >= 1) { player.dir = d; return; } player.next = d; }

/* ---------- end of level ---------- */
function winLevel() { A.allOff(); const stars = 1 + (pct >= LV.goal + 8 ? 1 : 0) + (deaths === 0 ? 1 : 0); const id = LV.L - 1; if ((S.stars[id] || 0) < stars) S.stars[id] = stars; if (score > S.best) S.best = score; S.save();
  [0, 4, 7, 12].forEach((n, k) => A.tone(523 * Math.pow(2, n / 12), .25, 'triangle', .09, k * .1)); A.voice('yay', 1.2); FX.burst(V3(0, 2, 0), 120, CONFETTI, 7, .1, 1.8, 5);
  $('eT').textContent = [T('השלב הושלם!', 'Level complete!'), T('מעולה!', 'Great!'), T('מושלם! 🏆', 'Perfect! 🏆')][stars - 1]; [...$('eStars').children].forEach((e, k) => { e.classList.toggle('on', k < stars); e.style.animationDelay = k * .25 + 's'; });
  $('eP').textContent = T(`נסגר ${Math.floor(pct)}% מהשטח · ${levelScore} נקודות`, `Captured ${Math.floor(pct)}% · ${levelScore} points`) + (deaths === 0 ? T(' · בלי לפסול!', ' · no lives lost!') : ''); $('eNext').hidden = LV.L >= 20; $('eAgain').textContent = T('שוב', 'Again'); $('endSheet').hidden = false; }
function loseLevel() { A.allOff(); $('eT').textContent = T('נגמרו החיים 😢', 'Out of lives 😢'); [...$('eStars').children].forEach(e => e.classList.remove('on')); $('eP').textContent = T(`הגעתם ל־${Math.floor(pct)}% (צריך ${LV.goal}%)`, `You reached ${Math.floor(pct)}% (need ${LV.goal}%)`); $('eNext').hidden = true; $('eAgain').textContent = T('נסו שוב', 'Try again'); $('endSheet').hidden = false; if (score > S.best) { S.best = score; S.save(); } }
const unlocked = i => i === 0 || (S.stars[i - 1] || 0) > 0;
function showTitle() { state = 'title'; A.allOff(); A.stopMusic(); $('title').hidden = false; $('hud').hidden = $('bar').hidden = $('hint').hidden = true; $('endSheet').hidden = $('pauseSheet').hidden = true; $('pw').innerHTML = '';
  let h = ''; for (let i = 0; i < 20; i++) { const un = unlocked(i), st = S.stars[i] || 0; h += `<button class="lb ${un ? '' : 'lock'}" data-i="${i}" ${un ? '' : 'disabled'}>${un ? i + 1 : '🔒'}<small>${un ? starsHTML(st) : ''}</small></button>`; } $('lgrid').innerHTML = h;
  const nx = LEVELS.findIndex((_, i) => unlocked(i) && !S.stars[i]); $('playBtn').textContent = '▶ ' + T('שלב ', 'Level ') + ((nx < 0 ? 19 : nx) + 1); $('playBtn').dataset.i = nx < 0 ? 19 : nx; }
$('lgrid').onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; A.ac(); lives = 3; score = 0; startLevel(+b.dataset.i); };
$('playBtn').onclick = () => { A.ac(); lives = 3; score = 0; startLevel(+$('playBtn').dataset.i); };
$('eMap').onclick = () => showTitle(); $('eAgain').onclick = () => { lives = Math.max(3, lives); startLevel(LV.L - 1); }; $('eNext').onclick = () => { lives = Math.max(lives, 3); startLevel(LV.L); };
$('mapBtn').onclick = () => { if (state !== 'play') return; state = 'pause'; $('pauseSheet').hidden = false; };
$('pGo').onclick = () => { $('pauseSheet').hidden = true; state = 'play'; }; $('pMap').onclick = () => showTitle();
$('mapBtn').innerHTML = ICO.pause('#ffffff'); $('homeT').innerHTML = ICO.home('#ffffff'); soundButton('sndBtn', S, A, '#ffffff'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('tSub').textContent = T('יוצאים מהיבשה, מציירים קו וסוגרים שטחים – בלי שהכדורים יפגעו בקו. סגרו 75% מהשטח כדי לעבור שלב!', 'Leave land, draw a line and close off areas – don’t let the balls hit it. Capture 75% to clear the level!');
$('lScore').textContent = T('ניקוד', 'Score'); $('pT').textContent = T('הפסקה', 'Paused'); $('pMap').textContent = T('שלבים', 'Levels'); $('pGo').textContent = T('המשך ▶', 'Resume ▶'); $('eMap').textContent = T('שלבים', 'Levels'); $('eNext').textContent = T('הבא ▶', 'Next ▶');

/* ---------- loop ---------- */
let last = performance.now();
function loop(now) { requestAnimationFrame(loop); const dt = Math.min(.05, (now - last) / 1000) * (window.__fast || 1); last = now; A.tick();
  if (waterM) waterM.uniforms.t.value = now / 1000;
  if (state === 'play') { stepPlayer(dt); for (const b of balls) { if (state !== 'play') break; stepBall(b, dt); } for (const c of crawlers) { if (state !== 'play') break; stepBall(c, dt); }
    freeze = Math.max(0, freeze - dt); slow = Math.max(0, slow - dt); if (LV.items) { itemT -= dt; if (itemT <= 0) { spawnItem(); itemT = rnd(9, 14); } }
    for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; it.life -= dt; it.m.position.y = .8 + Math.sin(now / 300 + i) * .12; if (it.life <= 0 || grid[it.j * W + it.i] === LAND) { if (it.life <= 0) { world.remove(it.m); items.splice(i, 1); } } }
    if ((now | 0) % 6 === 0) updHud(); }
  else if (state === 'won' || state === 'lost') { for (const b of balls) b.m.rotation.y += dt; }
  if (fills.length) { for (let k = fills.length - 1; k >= 0; k--) { const f = fills[k]; f.t += dt; if (f.t < 0) continue; touch(f.i, f.j); if (f.t > .35) fills.splice(k, 1); } }
  if (dirty.size) { const fm = new Map(fills.map(f => [f.j * W + f.i, f])); for (const k of dirty) { const i = k % W, j = (k / W) | 0, f = fm.get(k); if (f && f.t < 0) { landCtx.clearRect(i * PX, j * PX, PX, PX); continue; } drawCell(i, j, f ? 1 - f.t / .35 : 0); } dirty.clear(); landTex.needsUpdate = true; }
  FX.update(dt, -1); E.grade.uniforms.uFlash.value *= Math.pow(.05, dt); E.render(); }
setTimeout(() => { E.resize(); startLevel(0, true); state = 'title'; showTitle(); $('loading').hidden = true; requestAnimationFrame(loop); window.__claimOK = true; }, 20);
window.__zc = { startLevel, get state() { return state; }, get pct() { return pct; }, player, setDir, get grid() { return grid; }, get W() { return W; }, get H() { return H; }, get balls() { return balls; }, capture, set inv(v) { player.inv = v; } };
