import { THREE, $, V3, C, clamp, lerp, rnd, T, EN, store, engine, studioEnv, std, shadowAll, cnv, ctex, particles, CONFETTI, audio, toast, ICO, hubButtons, soundButton, qualityButton, starsHTML, cutie, isTouch } from '../lib/kit.js';

const S = store('brawl-save', { stars: {}, hero: 0, best: 0, tut: 0 });
const E = engine(S, { fov: 34, bloom: [.35, .5, 1.05], exposure: 1.05, bg: '#ff9a6a', vignette: .3 });
const { scene, camera, renderer } = E; studioEnv(E, '#fff0e0', '#5a4a6a', .45);
const A = audio(S); const FX = particles(E, 1400);
const ZMIN = -1.9, ZMAX = 1.5, GRAV = 22;

/* ================= DATA (all original) ================= */
const HEROES = [
  { id: 'rio', n: 'Rio', d: T('מהיר וזריז – קומבו של 4 מכות', 'Fast and nimble – 4-hit combo'), spd: 4.1, hp: 22, dmg: 1, combo: 4, jump: 8, look: { skin: '#f2c3a0', shirt: '#e8302a', hair: '#2a1a10', pants: '#2a3a6a', shoe: '#ffffff', cap: '#1a1a22' }, stat: [T('מהירות', 'Speed') + ' ★★★', T('כוח', 'Power') + ' ★★'] },
  { id: 'tex', n: 'Tex', d: T('חזק ועמיד – מכות כבדות', 'Strong and tough – heavy hits'), spd: 3.3, hp: 30, dmg: 1.5, combo: 3, jump: 7.4, look: { skin: '#c98e6a', shirt: '#2a7aff', hair: '#111111', pants: '#3a3030', shoe: '#ffd23a', beard: null, glasses: null }, stat: [T('מהירות', 'Speed') + ' ★★', T('כוח', 'Power') + ' ★★★'] },
];
const FOES = {
  punk: { hp: 6, spd: 2.4, dmg: 1.5, cd: 1.1, reach: .95, sc: 1, cols: ['#8a3aff', '#2fd36a', '#ff8a1f'], hair: '#ff3ab0', chain: .45 },
  runner: { hp: 4, spd: 3.9, dmg: 1.3, cd: .9, reach: .9, sc: .92, cols: ['#ffd23a', '#3ae8ff'], hair: '#3a2a1a', leap: 1 },
  tosser: { hp: 5, spd: 2.5, dmg: 1.6, cd: 2.1, reach: .9, sc: .96, cols: ['#ff5a8a', '#5affc8'], hair: '#5a3aff', ranged: 1 },
  brute: { hp: 13, spd: 1.6, dmg: 3, cd: 1.6, reach: 1.15, sc: 1.32, cols: ['#5a5a6a', '#6a3a2a'], hair: '#111', knock: 1 },
  boss: { hp: 36, spd: 2.2, dmg: 3, cd: 1.2, reach: 1.3, sc: 1.6, cols: ['#a03a3a'], hair: '#eeeeee', knock: 1, boss: 1, chain: .5 },
};
const STAGES = [
  { id: 'street', n: T('רחוב השוק', 'Market Street'), sky: ['#ffb07a', '#6a2a7a'], len: 70, boss: 'Big Moe', waves: [[8, 'punk punk'], [20, 'punk runner;punk tosser'], [33, 'brute punk;runner runner'], [46, 'tosser punk punk;brute runner'], [62, 'boss punk;runner tosser']] },
  { id: 'subway', n: T('תחנת הרכבת', 'Subway Station'), sky: ['#2a3a4a', '#10161e'], len: 76, boss: 'Rail King', waves: [[8, 'punk runner tosser'], [20, 'brute punk;punk runner runner'], [34, 'runner runner tosser;brute punk'], [48, 'brute brute;tosser tosser punk'], [68, 'boss runner;punk tosser brute']] },
  { id: 'roof', n: T('הגגות', 'Rooftops'), sky: ['#1a1450', '#05030f'], len: 80, boss: 'Sky Duke', waves: [[8, 'punk punk runner tosser'], [22, 'brute runner;tosser punk punk'], [36, 'runner runner runner;brute tosser'], [52, 'brute brute runner;punk punk tosser'], [72, 'boss brute;runner tosser punk']] },
  { id: 'ware', n: T('המחסן של הכנופיה', 'Gang Warehouse'), sky: ['#2a1a12', '#0a0606'], len: 84, boss: 'The Chief', waves: [[8, 'punk brute runner tosser'], [22, 'runner runner punk;brute tosser tosser'], [38, 'brute brute punk;runner runner'], [54, 'punk punk runner runner;brute brute tosser'], [76, 'boss brute;runner runner tosser;punk punk']] },
];
const world = new THREE.Group(); scene.add(world);
const hemi = new THREE.HemisphereLight('#ffffff', '#4a3a5a', .75); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0dc', 2.2); sun.position.set(4, 12, 9); sun.castShadow = renderer.shadowMap.enabled; sun.shadow.mapSize.set(2048, 1024); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 8, bottom: -8, near: 1, far: 40 }); sun.shadow.bias = -.0006; scene.add(sun, sun.target);
const SIGNS = ['PIZZA', 'ARCADE', 'DINER', 'GYM', 'CAFE', 'TOYS', 'BOOKS', 'HOTEL', 'RADIO', 'DONUTS', 'VIDEO', 'TACOS'];
function canvasTex(w, h, f, rx = 1, ry = 1) { const c = cnv(w, h); f(c.getContext('2d'), w, h); return ctex(c, rx, ry); }
function windowsTex(col, lit = .35) { return canvasTex(128, 256, (x, w, h) => { x.fillStyle = col; x.fillRect(0, 0, w, h); for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { x.fillStyle = Math.random() < lit ? '#ffe9a8' : '#2a3040'; x.fillRect(10 + i * 30, 12 + j * 30, 18, 20); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(10 + i * 30, 30 + j * 30, 18, 3); } }); }
function signTex(t, a, b) { return canvasTex(256, 64, (x, w, h) => { x.fillStyle = a; x.fillRect(0, 0, w, h); x.font = '900 44px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = b; x.shadowBlur = 14; x.fillStyle = b; x.fillText(t, w / 2, h / 2 + 2); }); }
let stageObj = null;
function buildStage(st) {
  world.clear(); const [sa, sb] = st.sky; scene.background = C(sb); stageObj = { movers: [] };
  const L = st.len + 30;
  const skyM = new THREE.ShaderMaterial({ depthWrite: false, uniforms: { a: { value: C(sa) }, b: { value: C(sb) } }, vertexShader: `varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`, fragmentShader: `uniform vec3 a; uniform vec3 b; varying vec2 vU; void main(){ gl_FragColor=vec4(mix(a,b,smoothstep(.15,.95,vU.y)),1.0); }` });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(L * 3, 60), skyM); sky.position.set(st.len / 2, 12, -40); world.add(sky);
  const indoor = st.id === 'subway' || st.id === 'ware';
  // ground
  const gTex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = indoor ? (st.id === 'ware' ? '#5a4a3e' : '#8a8a92') : st.id === 'roof' ? '#5a5a66' : '#4a4a58'; x.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * .1})`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    if (st.id === 'street') { x.fillStyle = '#f2e6a0'; x.fillRect(0, 150, 90, 10); } if (st.id === 'subway') { x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 3; for (let i = 0; i <= 256; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); } } }, L / 4, 6);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(L, 24), std('#ffffff', { map: gTex, roughness: .9 })); ground.rotation.x = -Math.PI / 2; ground.position.set(st.len / 2, 0, 7.8); ground.receiveShadow = true; world.add(ground);
  const walk = new THREE.Mesh(new THREE.BoxGeometry(L, .18, 1.6), std(indoor ? '#6a6a74' : '#a89a8a', { roughness: .85 })); walk.position.set(st.len / 2, .09, -3.0); walk.receiveShadow = true; world.add(walk);
  const PAL = { street: ['#b84a3a', '#d88a4a', '#8a5a7a', '#4a7aa8', '#c8a05a', '#6a8a4a'], roof: ['#3a3a5a', '#4a3a4a', '#2a4a5a'], subway: ['#e8e8e0'], ware: ['#4a3a30'] }[st.id];
  if (st.id === 'street' || st.id === 'roof') {
    let x = -12; let si = 0;
    while (x < st.len + 18) { const w = rnd(3.6, 6), h = st.id === 'roof' ? rnd(.8, 2.2) : rnd(6, 11), col = PAL[Math.floor(Math.random() * PAL.length)];
      if (st.id === 'street') { const b = new THREE.Mesh(new THREE.BoxGeometry(w - .1, h, 2), [std(col), std(col), std(col), std(col), new THREE.MeshStandardMaterial({ color: '#ffffff', map: windowsTex(col, .3), emissiveMap: windowsTex('#000', .3), emissive: C('#ffd88a'), emissiveIntensity: .5, roughness: .8 }), std(col)]); b.position.set(x + w / 2, h / 2, -4.8); b.receiveShadow = true; world.add(b);
        const aw = new THREE.Mesh(new THREE.BoxGeometry(w * .8, .12, .9), std(['#e8302a', '#2a8a4a', '#2a6aff', '#ffb21f'][si % 4])); aw.position.set(x + w / 2, 2.6, -3.5); aw.rotation.x = .25; world.add(aw);
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(w * .6, w * .15), new THREE.MeshBasicMaterial({ map: signTex(SIGNS[si % SIGNS.length], '#1a1020', ['#ff5ad0', '#5af0ff', '#ffd23a', '#7dff5a'][si % 4]), color: C('#ffffff').multiplyScalar(1.4) })); sg.position.set(x + w / 2, 3.4, -3.79); world.add(sg);
        const door = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.9), std('#3a2a20')); door.position.set(x + w * .3, .95, -3.79); world.add(door); si++; }
      else { const b = new THREE.Mesh(new THREE.BoxGeometry(w - .2, h, 1.6), std(col, { roughness: .9 })); b.position.set(x + w / 2, h / 2, -4.3); world.add(b); if (Math.random() < .5) { const tank = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(.7, .7, 1.4, 14), std('#6a4a3a')); c.position.y = 2.1; tank.add(c); const r = new THREE.Mesh(new THREE.ConeGeometry(.8, .5, 14), std('#4a3a30')); r.position.y = 3; tank.add(r); for (const s of [-1, 1]) for (const q of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.4, .08), std('#2a2a2a')); l.position.set(s * .5, .7, q * .5); tank.add(l); } tank.position.set(x + w / 2, h, -4.3); world.add(tank); } }
      x += w; }
    if (st.id === 'roof') { for (let i = 0; i < 40; i++) { const w = rnd(3, 7), h = rnd(8, 30); const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 3), new THREE.MeshStandardMaterial({ color: '#0a0a1a', map: windowsTex('#14142a', .25), emissiveMap: windowsTex('#000', .25), emissive: C('#ffd88a'), emissiveIntensity: .6 })); b.position.set(-30 + i * 4.5, h / 2 - 6, -24 - Math.random() * 6); world.add(b); }
      const moon = new THREE.Mesh(new THREE.CircleGeometry(3, 32), new THREE.MeshBasicMaterial({ color: C('#fff6c8').multiplyScalar(1.4) })); moon.position.set(st.len * .6, 14, -38); world.add(moon);
      for (let x2 = 0; x2 < st.len + 10; x2 += 7) { const ac = new THREE.Mesh(new THREE.BoxGeometry(1.4, .9, .9), std('#a8aab0', { metalness: .4, roughness: .5 })); ac.position.set(x2 + rnd(0, 3), .45, -2.9); ac.castShadow = true; world.add(ac); } }
    for (let x2 = 2; x2 < st.len + 10; x2 += 9) { const lp = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 3.6, 8), std('#2a2a34', { metalness: .6 })); p.position.y = 1.8; lp.add(p); const h2 = new THREE.Mesh(new THREE.BoxGeometry(.6, .14, .3), new THREE.MeshBasicMaterial({ color: C('#fff2c8').multiplyScalar(2) })); h2.position.set(.25, 3.6, 0); lp.add(h2); lp.position.set(x2, 0, -2.4); world.add(lp); }
  }
  if (st.id === 'subway') {
    const tile = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#e8ece8'; x.fillRect(0, 0, w, h); x.strokeStyle = '#b8c0bc'; x.lineWidth = 3; for (let i = 0; i <= w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } for (let j = 0; j <= h; j += 16) { x.beginPath(); x.moveTo(0, j); x.lineTo(w, j); x.stroke(); } x.fillStyle = '#2a8a5a'; x.fillRect(0, 120, w, 20); }, L / 4, 2);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(L, 8), std('#ffffff', { map: tile, roughness: .4 })); wall.position.set(st.len / 2, 4, -6.5); world.add(wall);
    const tc = new THREE.Group(); for (let k = 0; k < 4; k++) { const car = new THREE.Mesh(new THREE.BoxGeometry(11, 2.6, 2.4), [std('#b8bcc4'), std('#b8bcc4'), std('#9aa0a8'), std('#9aa0a8'), new THREE.MeshStandardMaterial({ color: '#ffffff', map: canvasTex(512, 128, (x, w, h) => { x.fillStyle = '#c8ccd4'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8302a'; x.fillRect(0, 96, w, 10); for (let i = 0; i < 6; i++) { x.fillStyle = '#ffeaa8'; x.fillRect(20 + i * 82, 26, 60, 44); } }), emissive: C('#ffe0a0'), emissiveIntensity: .15 }), std('#b8bcc4')]); car.position.set(k * 11.3, 1.6, 0); tc.add(car); }
    tc.position.set(-20, 0, -5); world.add(tc); stageObj.movers.push({ o: tc, v: 3, min: -50, max: st.len + 10 });
    const plat = new THREE.Mesh(new THREE.BoxGeometry(L, .2, .3), std('#ffd21f')); plat.position.set(st.len / 2, .2, -3.75); world.add(plat);
    for (let x2 = 3; x2 < st.len + 10; x2 += 8) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 6, 16), std('#d8dcd8', { roughness: .5 })); p.position.set(x2, 3, -2.6); p.castShadow = true; world.add(p); const l = new THREE.Mesh(new THREE.BoxGeometry(2.6, .1, .4), new THREE.MeshBasicMaterial({ color: C('#ffffff').multiplyScalar(2) })); l.position.set(x2 + 4, 5.8, -1); world.add(l); }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(L, 9), std('#3a3e44')); ceil.rotation.x = Math.PI / 2; ceil.position.set(st.len / 2, 6, -2); world.add(ceil);
  }
  if (st.id === 'ware') {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(L, 10), std('#4a3a32', { map: canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#5a4438'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,.25)'; for (let j = 0; j < h; j += 16) for (let i = (j / 16 % 2) * 16; i < w; i += 32) x.fillRect(i, j, 30, 14); }, L / 6, 2) })); wall.position.set(st.len / 2, 5, -6); world.add(wall);
    for (let x2 = 0; x2 < st.len + 10; x2 += 6) { const sh = new THREE.Group(); for (let r = 0; r < 3; r++) { const b = new THREE.Mesh(new THREE.BoxGeometry(4, .12, 1.2), std('#2a5aa8', { metalness: .4 })); b.position.y = .4 + r * 1.4; sh.add(b); for (let c = 0; c < 3; c++) if (Math.random() < .75) { const cr = new THREE.Mesh(new THREE.BoxGeometry(1, 1, .9), std('#b8844a', { roughness: .9 })); cr.position.set(-1.3 + c * 1.3, .95 + r * 1.4, 0); sh.add(cr); } } sh.position.set(x2, 0, -4.6); world.add(sh);
      const lamp = new THREE.Mesh(new THREE.ConeGeometry(.5, .4, 16, 1, true), std('#2a2a2a', { side: THREE.DoubleSide })); lamp.position.set(x2 + 3, 6.5, -1); world.add(lamp); const bulb = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), new THREE.MeshBasicMaterial({ color: C('#ffe2a0').multiplyScalar(2.5) })); bulb.position.set(x2 + 3, 6.35, -1); world.add(bulb); }
  }
  shadowAll(world, true, true); sky.castShadow = sky.receiveShadow = false; ground.castShadow = false;
  hemi.intensity = st.id === 'roof' ? .45 : st.id === 'ware' ? .55 : .75; sun.intensity = st.id === 'roof' ? 1.2 : st.id === 'ware' ? 1.5 : 2.2; sun.color.set(st.id === 'roof' ? '#a8b8ff' : '#fff0dc');
}

/* ================= FIGHTERS ================= */
const fighters = [], items = [], shots = [];
function mkFighter(o) { const O = new THREE.Group(); const P = cutie(o.look); O.add(P.g); P.g.scale.setScalar(o.sc || 1); world.add(O);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(.42 * (o.sc || 1), 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .3, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = .02; world.add(sh);
  const f = Object.assign({ O, P, sh, x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, face: 1, st: 'idle', t: 0, combo: 0, hold: null, inv: 0, hitIds: new Set(), cd: 0, stun: 0, hits: 0, blink: 0 }, o); fighters.push(f); return f; }
function heroLook(h) { return Object.assign({}, h.look); }
let hero = null, H = HEROES[0];
function spawnFoe(kind, x, z) { const F = FOES[kind]; const c = F.cols[Math.floor(Math.random() * F.cols.length)];
  const look = kind === 'boss' ? { skin: '#e0ac82', shirt: c, hair: F.hair, pants: '#1a1a22', shoe: '#2a2a2a', beard: '#5a3a24', glasses: '#111', cap: null } : { skin: ['#f2c3a0', '#c98e6a', '#8a5a3c', '#e0ac82'][Math.floor(Math.random() * 4)], shirt: c, hair: F.hair, pants: kind === 'brute' ? '#2a2a3a' : '#3b3b4b', shoe: '#222', cap: kind === 'runner' && Math.random() < .6 ? '#ffd23a' : null, glasses: kind === 'brute' && Math.random() < .5 ? '#111' : null, long: kind === 'punk' && Math.random() < .3 };
  const f = mkFighter({ team: 1, kind, look, sc: F.sc, hp: F.hp + (kind === 'boss' ? stageIdx * 8 : stageIdx * (kind === 'brute' ? 2 : 1)), spd: F.spd * (1 + stageIdx * .06), dmg: F.dmg, reach: F.reach, cdMax: F.cd, knockAtk: !!F.knock, boss: !!F.boss, x, z, face: x < hero.x ? 1 : -1, role: 'wait', think: rnd(0, .4), cd: rnd(.6, 1.6) });
  f.bang = new THREE.Sprite(new THREE.SpriteMaterial({ map: bangTex, depthTest: false, transparent: true })); f.bang.scale.setScalar(.5); f.bang.position.y = 2.35; f.bang.renderOrder = 9; f.bang.visible = false; f.O.add(f.bang);
  f.maxhp = f.hp; if (kind === 'punk' && stageIdx >= 1 && Math.random() < .3) giveWeapon(f, Math.random() < .5 ? 'bat' : 'pipe'); if (f.boss) { $('bossUI').hidden = false; $('bossName').textContent = '👑 ' + STAGES[stageIdx].boss; } return f; }

/* ---------- items & weapons ---------- */
const WEAP = { bat: { c: '#c8904a', len: .95, r: .06, dmg: 2.2, dur: 8 }, pipe: { c: '#a8aab0', len: 1.05, r: .05, dmg: 2.6, dur: 10 } };
function weaponMesh(k) { const W = WEAP[k]; const m = new THREE.Mesh(new THREE.CylinderGeometry(W.r * (k === 'bat' ? 1.5 : 1), W.r, W.len, 10), std(W.c, { metalness: k === 'pipe' ? .8 : 0, roughness: k === 'pipe' ? .3 : .6 })); m.castShadow = true; return m; }
function throwMesh(k) { if (k === 'crate') { const g = new THREE.Mesh(new THREE.BoxGeometry(.6, .5, .5), std('#c08a4a', { roughness: .9 })); g.castShadow = true; return g; } const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(.28, .24, .62, 16), std('#8a9aa8', { metalness: .6, roughness: .4 })); g.add(c); const l = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .05, 16), std('#6a7a88', { metalness: .6 })); l.position.y = .32; g.add(l); g.traverse(m => m.castShadow = true); return g; }
function foodMesh(k) { const g = new THREE.Group(); if (k === 'pizza') { const p = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .05, 3), std('#ffcf5a')); p.rotation.y = .5; g.add(p); for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .02, 10), std('#e8302a')); s.position.set(Math.cos(i * 2) * .1, .04, Math.sin(i * 2) * .1); g.add(s); } } else { const c = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .05, 20), new THREE.MeshStandardMaterial({ color: '#ffd23a', metalness: .9, roughness: .2, emissive: C('#ffb21f'), emissiveIntensity: .3 })); c.rotation.x = Math.PI / 2; g.add(c); } return g; }
function addItem(k, x, z) { const m = WEAP[k] ? weaponMesh(k) : k === 'crate' || k === 'can' ? throwMesh(k) : foodMesh(k); if (WEAP[k]) { m.rotation.z = Math.PI / 2; m.position.y = .08; } else if (k === 'pizza' || k === 'coin') m.position.y = .3; else m.position.y = k === 'crate' ? .25 : .31; const g = new THREE.Group(); g.add(m); g.position.set(x, 0, z); world.add(g); items.push({ k, x, z, g, m, dur: WEAP[k] ? WEAP[k].dur : 0, t: 0 }); }
function giveWeapon(f, k, dur) { dropHold(f, false); const m = weaponMesh(k); m.position.set(0, -.42 - WEAP[k].len / 2 + .08, 0); f.P.arms[1].add(m); f.hold = { k, m, dur: dur ?? WEAP[k].dur, weapon: true }; }
function giveThrow(f, k) { dropHold(f, false); const m = throwMesh(k); m.position.set(0, 1.85, 0); f.P.g.add(m); f.hold = { k, m, weapon: false }; }
function dropHold(f, toGround = true) { if (!f.hold) return; const h = f.hold; h.m.parent && h.m.parent.remove(h.m); if (toGround && h.weapon && h.dur > 0) addItem(h.k, f.x + rnd(-.3, .3), clamp(f.z + rnd(-.3, .3), ZMIN, ZMAX)); f.hold = null; }

/* ---------- combat ---------- */
let shake = 0, hitStop = 0, combo = 0, comboT = 0, score = 0, lives = 3, deaths = 0, meter = 0, slowT = 0;
// every move: duration, active window, reach, damage, effects
const MOVES = {
  p1: { d: .2, a: .07, e: .14, r: 1, m: 1 }, p2: { d: .2, a: .07, e: .14, r: 1, m: 1 }, p3: { d: .22, a: .08, e: .15, r: 1, m: 1.1 }, p4: { d: .3, a: .1, e: .18, r: 1.05, m: 1.5, kn: 1 },
  upper: { d: .36, a: .1, e: .2, r: 1, m: 1.9, kn: 1, launch: 8.5 }, lowp: { d: .2, a: .07, e: .14, r: 1, m: 1.1, stun: .5 },
  lowk: { d: .24, a: .08, e: .16, r: 1.15, m: 1.1 }, hik: { d: .3, a: .1, e: .2, r: 1.2, m: 1.5 }, spin: { d: .44, a: .12, e: .32, r: 1.3, m: 2, kn: 1, both: 1 },
  sweep: { d: .38, a: .1, e: .26, r: 1.4, m: 1.3, kn: 1, trip: 1 }, jkick: { d: .55, a: .03, e: .5, r: 1.2, m: 2, kn: 1, air: 1 }, dpunch: { d: .45, a: .03, e: .42, r: 1, m: 1.8, kn: 1, air: 1 },
  flip: { d: .5 }, axe: { d: .9, air: 1 }, dash: { d: .34, a: .05, e: .26, r: 1.15, m: 1.9, kn: 1 }, tornado: { d: 1.1, a: 0, e: 1.1, r: 2.1, m: .7, stun: .3, both: 1, multi: .16 },
  swing: { d: .36, a: .14, e: .22, r: 1.45, m: 0, wpn: 1 }, throw: { d: .3 },
  eatk: { d: .55, a: .36, e: .44 }, eatk2: { d: .36, a: .16, e: .24, m: .8 }, ejump: { d: .9, a: .25, e: .8, air: 1 }, etoss: { d: .7 }, charge: { d: 1.1, a: .2, e: 1.0, m: 1.6 },
};
const WORDS = ['POW!', 'BAM!', 'WHAM!', 'BOOM!', 'KAPOW!', 'SMASH!'];
function startAtk(f, kind) { f.st = kind; f.t = 0; f.hitIds.clear(); const M = MOVES[kind] || { d: .3 }; f.dur = M.d; f.hitAt = M.a ?? null; f.hitEnd = M.e ?? f.hitAt + .08; f.mv = M; f.multiT = 0; f.spinYaw = 0; }
function hitTargets(f) { const M = f.mv || {}; const reach = (M.r || 1) * (f.reach || 1); let dm = (f.dmg || 1) * (M.wpn ? WEAP[f.hold.k].dmg : M.m || 1);
  let any = false; for (const o of fighters) { if (o.team === f.team || o.team === 2 || o.dead || o.inv > 0 || o.st === 'down' || f.hitIds.has(o)) continue; const dx = (o.x - f.x) * f.face;
    if (M.both ? Math.abs(o.x - f.x) > reach : (dx < -.15 || dx > reach * (o.sc || 1) ** .3)) continue; if (Math.abs(o.z - f.z) > .5 + (f.boss ? .2 : 0) + (M.both ? .25 : 0)) continue; if (Math.abs(o.y - f.y) > (M.trip ? .5 : 1.2)) continue;
    f.hitIds.add(o); any = true; const knock = !!M.kn || (f.team === 1 && (f.knockAtk || f.st === 'ejump')) || (M.wpn && Math.random() < .45);
    damage(o, dm, knock, M.both ? Math.sign(o.x - f.x) || f.face : f.face, f, M); if (M.wpn && f.hold) { f.hold.dur--; if (f.hold.dur <= 0) { FX.burst(V3(f.x + f.face * .8, 1, f.z), 14, [[1, .8, .5]], 2, .06, .5, 4); if (f.team === 0) toast(T('הנשק נשבר!', 'Weapon broke!')); dropHold(f, false); } } }
  return any; }
function aoe(f, r, dm) { for (const o of fighters) { if (o.team === f.team || o.team === 2 || o.dead || o.inv > 0 || o.st === 'down') continue; if (Math.hypot(o.x - f.x, (o.z - f.z) * 1.6) < r) damage(o, dm, true, Math.sign(o.x - f.x) || 1, f, { kn: 1 }); }
  shake = .45; E.grade.uniforms.uFlash.value = .25; FX.burst(V3(f.x, .15, f.z), 50, [[2.6, 2.2, 1.2], [1.6, 1.6, 1.8]], 5, .1, .6, 6); A.noise(.4, 'lowpass', 500, 1, .5); A.tone(70, .4, 'sine', .25, 0, 40); }
function damage(o, dmg, knock, dir, src, M = {}) { o.hp -= dmg; o.hits++; const p = V3(o.x, 1.1 * (o.sc || 1), o.z + .2); FX.burst(p, 14, [[2.6, 2.4, .8], [2.6, 1.2, .4]], 3, .08, .3, 0); A.noise(.12, 'lowpass', 900, 1, .35); A.tone(110 + Math.random() * 40, .1, 'square', .08, 0, 60); hitStop = knock ? .09 : .05; shake = Math.max(shake, o.team === 0 ? .3 : knock ? .22 : .1);
  if (src && src.team === 0) { combo++; comboT = 1.4; meter = Math.min(1, meter + .055); score += Math.round(10 * dmg) + combo * 2; if (combo >= 3) $('comboUI').textContent = combo + ' HITS!'; $('scoreTxt').textContent = score; updMeter(); if (knock) popText(p, WORDS[Math.floor(Math.random() * WORDS.length)], ['#ffd23a', '#ff5a8a', '#5af0ff', '#7dff5a'][Math.floor(Math.random() * 4)]); }
  if (o.team === 0) { combo = 0; $('comboUI').textContent = ''; buzz(50); meter = Math.min(1, meter + .03); updMeter(); E.grade.uniforms.uFlash.value = .12; }
  if (o.team === 1) dropHold(o); if (o.team === 0 && o.hold && !o.hold.weapon) dropHold(o, false);
  o.face = -dir; if (o.hp <= 0 || knock || o.hits >= 4) { o.st = 'down'; o.t = 0; o.vx = dir * (M.trip ? 1.5 : 4.4); o.vy = M.launch || (M.trip ? 3 : 4.8); o.hits = 0; A.voice(o.team === 0 ? 'aww' : 'grr', o.team === 0 ? 1 : .7); if (o.hp <= 0) o.dead = true; }
  else { o.st = 'hurt'; o.t = 0; o.vx = dir * 2.4; o.stun = M.stun || .35; }
  if (o.boss) $('bossI').style.width = Math.max(0, o.hp / o.maxhp * 100) + '%'; if (o.team === 0) updHud(); }
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
  if (st === 'p1' || st === 'p3') { a1 = lerp(-1, -1.72, ext); lean = .12 * ext; }
  if (st === 'p2') { a0 = lerp(-1, -1.72, ext); lean = .12 * ext; }
  if (st === 'p4') { a0 = lerp(-1, -1.9, ext); a1 = lerp(-1, -1.5, ext); lean = .25 * ext; spin = -.6 * ext; }
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
  if (st === 'down') { lean = -1.45; a0 = a1 = .4; }
  if (st === 'getup') lean = lerp(-1.45, 0, k);
  if (st === 'win') { a0 = a1 = -2.8; by = Math.abs(Math.sin(t * 8)) * .3; }
  lr(A0.rotation, 'x', a0, s); lr(A1.rotation, 'x', a1, s); lr(A0.rotation, 'z', z0, s); lr(A1.rotation, 'z', z1, s); lr(L0.rotation, 'x', l0, s); lr(L1.rotation, 'x', l1, s);
  if (st === 'flip') P.g.rotation.x = roll; else lr(P.g.rotation, 'x', lean, st === 'down' ? Math.min(1, dt * 10) : s);
  P.g.position.y = lerp(P.g.position.y, by + (st === 'down' ? .22 * (f.sc || 1) : 0) + (st === 'flip' ? .75 * (f.sc || 1) * Math.sin(k * Math.PI) * 0 : 0), s);
  if (st === 'flip') { P.g.position.y = .75 * Math.sin(k * Math.PI) * .6; }
  for (const e of P.eyes) e.scale.y = st === 'hurt' || st === 'down' ? .2 : (Math.sin(t * 1.3 + f.x) > .985 ? .1 : 1);
  P.setMood && (st === 'hurt' || st === 'down' ? P.mood !== 'sad' && P.setMood('sad') : f.team === 1 ? P.mood !== 'angry' && P.setMood('angry') : P.mood !== 'smile' && st !== 'win' && P.setMood('smile'));
  f.O.position.set(f.x, f.y, f.z); const yaw = f.face > 0 ? Math.PI / 2 : -Math.PI / 2; if (spin) f.O.rotation.y = yaw + spin * f.face; else f.O.rotation.y = lerp(f.O.rotation.y, yaw, Math.min(1, dt * 20)); f.sh.position.set(f.x, .02, f.z); f.sh.scale.setScalar(1 - Math.min(.6, f.y * .2));
  if (f.bang) f.bang.visible = f.team === 1 && (st === 'eatk' || st === 'eatk2' || st === 'ejump' || st === 'etoss' || st === 'charge') && f.t < (f.hitAt || .3);
  f.O.visible = f.inv > 0 && f.team === 0 && st !== 'tornado' ? Math.sin(t * 30) > -.3 : f.dead && st === 'down' && f.t > .9 ? Math.sin(t * 40) > 0 : true; }
/* ---------- player control ---------- */
const inp = { x: 0, z: 0, atk: false, kick: false, jmp: false, sp: false };
const keys = {};
addEventListener('keydown', e => { if (e.repeat) return; keys[e.code] = true; if (e.code === 'KeyJ' || e.code === 'KeyX' || e.code === 'Enter') inp.atk = true; if (e.code === 'KeyK' || e.code === 'KeyC') inp.kick = true; if (e.code === 'Space' || e.code === 'KeyZ') { inp.jmp = true; e.preventDefault(); } if (e.code === 'KeyL' || e.code === 'KeyV') inp.sp = true; });
addEventListener('keyup', e => keys[e.code] = false);
function stepHero(f, dt) { let ix = inp.x + ((keys.ArrowRight || keys.KeyD) ? 1 : 0) - ((keys.ArrowLeft || keys.KeyA) ? 1 : 0), iz = inp.z + ((keys.ArrowDown || keys.KeyS) ? 1 : 0) - ((keys.ArrowUp || keys.KeyW) ? 1 : 0); const im = Math.hypot(ix, iz); if (im > 1) { ix /= im; iz /= im; }
  const air = f.y > .01; if (!air) f.jumps = 0;
  f.runT = Math.abs(ix) > .85 && Math.abs(iz) < .5 ? (f.runT || 0) + dt : 0; f.run = f.runT > .35 && f.st === 'idle' && !air;
  if (f.st === 'idle' && !air) { const sp = H.spd * (f.run ? 1.65 : 1); f.vx = ix * sp; f.vz = iz * H.spd * .7; if (Math.abs(ix) > .2) f.face = Math.sign(ix); }
  if (air && (f.st === 'idle' || f.st === 'flip' || f.st === 'jkick' || f.st === 'dpunch')) f.vx = lerp(f.vx, ix * H.spd * 1.1, Math.min(1, dt * 3));
  if (inp.sp) { inp.sp = false; if (meter >= 1 && f.st !== 'down' && f.st !== 'hurt') { meter = 0; updMeter(); startAtk(f, 'tornado'); f.inv = 1.2; f.vx = f.vz = 0; A.tone(200, 1, 'sawtooth', .08, 0, 900); A.noise(1, 'bandpass', 800, .7, .2, 0, 3000); toast(T('⚡ סופר טורנדו!', '⚡ Super tornado!'), 1200); slowT = .25; } }
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
      else if (f.hold && !f.hold.weapon && !isKick) startAtk(f, 'throw');
      else if (f.hold && !isKick) { startAtk(f, 'swing'); A.noise(.2, 'bandpass', 900, 1, .1, 0, 300); }
      else if (f.run && !isKick) { startAtk(f, 'dash'); f.vx = f.face * 7; A.noise(.2, 'bandpass', 1200, 1, .12, 0, 400); }
      else { const up = iz < -.55, dn = iz > .55; let mv;
        if (isKick) mv = dn ? 'sweep' : up ? 'hik' : chainStep(f, 'k', ['lowk', 'hik', 'spin']); else mv = up ? 'upper' : dn ? 'lowp' : chainStep(f, 'p', H.combo === 4 ? ['p1', 'p2', 'p3', 'p4'] : ['p1', 'p2', 'p4']);
        if (Math.abs(ix) > .3) f.face = Math.sign(ix); startAtk(f, mv); f.vx = f.face * (mv === 'spin' ? 1.5 : .8); A.noise(.08, 'bandpass', isKick ? 1500 : 2200, 1, .08); } } }
  if (!(f.st === 'idle' || air || f.st === 'dash')) { f.vx *= Math.pow(.02, dt); f.vz *= Math.pow(.02, dt); }
  if (f.st === 'dash') f.vx *= Math.pow(.08, dt);
  for (let i = items.length - 1; i >= 0; i--) { const q = items[i]; if ((q.k === 'pizza' || q.k === 'coin') && Math.abs(q.x - f.x) < .6 && Math.abs(q.z - f.z) < .5 && !air) { world.remove(q.g); items.splice(i, 1); if (q.k === 'pizza') { f.hp = Math.min(f.maxhp, f.hp + 8); popText(V3(f.x, 2, f.z), '+❤️', '#ff7a7a'); A.tone(660, .1, 'triangle', .08); A.tone(990, .15, 'triangle', .08, .1); } else { score += 50; popText(V3(f.x, 2, f.z), '+50'); A.tone(1320, .08, 'square', .04); A.tone(1980, .12, 'sine', .05, .05); } updHud(); } } }
function chainStep(f, key, seq) { const now = performance.now(); f.ch = f.ch || {}; const c = f.ch[key] || { i: 0, t: 0 }; if (now - c.t > 700) c.i = 0; const s = seq[c.i % seq.length]; c.i = (c.i + 1) % seq.length; c.t = now; f.ch[key] = c; return s; }
function pickItem(f, it) { world.remove(it.g); items.splice(items.indexOf(it), 1); if (WEAP[it.k]) giveWeapon(f, it.k, it.dur); else giveThrow(f, it.k); A.tone(520, .08, 'triangle', .07); A.tone(780, .1, 'triangle', .06, .06); if (!S.seenW) { S.seenW = 1; S.save(); toast(WEAP[it.k] ? T('יש לכם נשק! 💪 ליד נשק אחר – לחצו 👊 כדי להחליף', 'You got a weapon! 💪 Near another one – tap 👊 to swap') : T('לחצו 👊 כדי לזרוק!', 'Tap 👊 to throw!')); } }
function doThrow(f) { const h = f.hold; if (!h) return; h.m.parent.remove(h.m); f.hold = null; const m = throwMesh(h.k); m.position.set(f.x + f.face * .5, 1.7, f.z); world.add(m); shots.push({ m, k: h.k, x: f.x + f.face * .5, y: 1.7, z: f.z, vx: f.face * 10, vy: 1.5, team: f.team, life: 1.6 }); A.noise(.25, 'bandpass', 700, 1, .12, 0, 1800); }
function tossBottle(f) { const m = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, .32, 10), new THREE.MeshPhysicalMaterial({ color: '#3aff8a', roughness: .1, transmission: 0, transparent: true, opacity: .85 })); b.rotation.z = Math.PI / 2; m.add(b); m.position.set(f.x + f.face * .5, 1.5, f.z); world.add(m);
  const dx = hero.x - f.x, tt = clamp(Math.abs(dx) / 7, .35, .9); shots.push({ m, k: 'bottle', x: f.x + f.face * .5, y: 1.5, z: f.z, vx: dx / tt, vy: 3.2, vz: (hero.z - f.z) / tt, team: 1, life: 2, dmg: f.dmg }); A.tone(700, .15, 'triangle', .04, 0, 300); }

/* ---------- enemy AI ---------- */
function stepFoe(f, dt) { if (f.st !== 'idle') { if (f.st !== 'ejump' && f.st !== 'charge') { f.vx *= Math.pow(.02, dt); f.vz *= Math.pow(.02, dt); } return; } if (!hero || hero.dead || hero.st === 'down') { f.vx = f.vz = 0; return; }
  f.think -= dt; f.cd -= dt; const F = FOES[f.kind];
  if (f.think <= 0) { f.think = rnd(.3, .55); const att = fighters.filter(o => o.team === 1 && !o.dead && o.role === 'attack').length; const cap = [2, 3, 3, 4][stageIdx];
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
  if (f.st === 'throw' && f.t >= .12 && f.hold) doThrow(f); if (f.st === 'throw' && f.t >= f.dur) { f.st = 'idle'; f.t = 0; }
  if (f.st === 'hurt') { f.stun -= dt; f.vx *= Math.pow(.01, dt); if (f.stun <= 0) { f.st = 'idle'; f.t = 0; } }
  if (f.st === 'down') { f.vx *= Math.pow(.15, dt); if (f.y <= 0 && f.t > .1 && f.vy <= 0 && !f.landed) { f.landed = true; A.noise(.15, 'lowpass', 300, 1, .25); shake = Math.max(shake, .15); }
    if (f.t > (f.dead ? 1.4 : f.team === 0 ? .9 : 1.1) && f.y <= 0) { f.landed = false; if (f.dead) return kill(f); f.st = 'getup'; f.t = 0; f.dur = .35; } }
  if (f.st === 'getup' && f.t >= f.dur) { f.st = 'idle'; f.t = 0; f.inv = f.team === 0 ? 1 : .5; }
  f.vy -= GRAV * dt; f.y += f.vy * dt; if (f.y <= 0) { f.y = 0; f.vy = 0; if (f.st === 'jkick' || f.st === 'dpunch' || (f.st === 'ejump' && f.leapt)) { f.st = 'idle'; f.t = 0; f.leapt = false; } }
  f.x += f.vx * dt; f.z = clamp(f.z + f.vz * dt, ZMIN, ZMAX);
  if (f.team === 0) f.x = clamp(f.x, camX - halfW + .5, camX + halfW - .5); else if (onScreen(f)) f.x = clamp(f.x, camX - halfW - 1, camX + halfW + 1); }
function kill(f) { const p = V3(f.x, .6, f.z); FX.burst(p, 40, CONFETTI, 3.2, .09, 1, 4); for (let i = 0; i < 8; i++) FX.emit(p.clone().add(V3(rnd(-.4, .4), rnd(0, .8), 0)), V3(rnd(-1, 1), rnd(1, 3), 0), [2.6, 2.4, .6], .14, .8, 2, 1);
  world.remove(f.O); world.remove(f.sh); fighters.splice(fighters.indexOf(f), 1);
  if (f.team === 1) { score += f.boss ? 1000 : f.kind === 'brute' ? 150 : f.kind === 'tosser' ? 100 : 80; meter = Math.min(1, meter + .08); updMeter(); A.tone(880, .08, 'square', .04); A.tone(1320, .1, 'square', .04, .06); const r = Math.random(); if (r < .22) addItem('coin', f.x, f.z); else if (r < .3) addItem('pizza', f.x, f.z); if (f.boss) { $('bossUI').hidden = true; } updHud(); checkWave(); }
  else heroDown(); }

/* ================= STAGE FLOW ================= */
let state = 'title', stageIdx = 0, camX = 0, halfW = 6, wave = 0, lock = null, maxX = 0, goT = 0, startT = 0;
function placeProps(st) { const r = (a, b) => rnd(a, b); for (let x = 5; x < st.len - 4; x += r(7, 12)) { const k = Math.random() < .45 ? 'crate' : Math.random() < .5 ? 'can' : Math.random() < .5 ? 'bat' : 'pipe'; addItem(k, x, r(ZMIN + .3, ZMAX - .3)); } }
function startStage(i, demo) { stageIdx = i; const st = STAGES[i]; fighters.slice().forEach(f => { world.remove(f.O); world.remove(f.sh); }); fighters.length = 0; items.length = 0; shots.length = 0; buildStage(st);
  H = HEROES[S.hero || 0]; hero = mkFighter({ team: 0, look: heroLook(H), sc: 1, hp: H.hp, maxhp: H.hp, dmg: H.dmg, reach: 1.0, x: 1.5, z: 0, face: 1 }); hero.maxhp = H.hp;
  camX = halfW = 6; wave = 0; lock = null; maxX = 0; combo = 0; deaths = 0; if (!demo) { score = 0; lives = 3; meter = 0; updMeter(); } placeProps(st); fit(); updHud();
  if (demo) return; state = 'play'; startT = performance.now(); $('title').hidden = true; $('endSheet').hidden = $('pauseSheet').hidden = true; $('hud').hidden = false; $('stick').hidden = $('btns').hidden = !isTouch && !window.__forceTouch; $('bossUI').hidden = true; $('goUI').hidden = false; goT = 3;
  A.startMusic({ chords: [[45, 52, 57], [43, 50, 55], [41, 48, 53], [43, 50, 55]], bpm: 132, lead: true, kick: true, vol: .85 });
  toast(st.n + ' – ' + T('קדימה!', 'Let’s go!'), 1800); if ((S.tut || 0) < 2) { S.tut = 2; S.save(); setTimeout(() => toast(isTouch ? T('👊 אגרוף · 🦶 בעיטה (לחיצות רצופות = קומבו) · ג׳ויסטיק למעלה/למטה + מכה = אפרקאט / מכה נמוכה · ⤴⤴ קפיצה כפולה = סלטה · ⚡ כשהמד מלא', '👊 punch · 🦶 kick (tap again for combos) · stick up/down + hit = uppercut / low hit · ⤴⤴ double jump = flip · ⚡ when the meter is full') : T('J אגרוף · K בעיטה · רווח קפיצה (פעמיים = סלטה) · L מיוחד · חץ למעלה/למטה + מכה', 'J punch · K kick · Space jump (twice = flip) · L special · Up/Down + hit'), 7000), 1900); } }
function spawnBatch(kinds) { kinds.forEach((k, i) => { lock.pending++; setTimeout(() => { if (state !== 'play' || !lock) return; const side = i % 2 ? -1 : 1; spawnFoe(k, lock.x + side * (halfW + 1.2 + i * .4), rnd(ZMIN + .2, ZMAX - .2)); lock.pending--; }, 250 + i * 550); }); }
function checkWave() { if (!lock) return; const left = fighters.filter(f => f.team === 1).length;
  if (lock.batches.length && left <= 1 && !lock.pending) { spawnBatch(lock.batches.shift().split(' ')); toast(T('עוד מהכנופיה מגיעים!', 'More of the gang incoming!'), 1200); return; }
  if (left === 0 && !lock.pending) { lock = null; slowT = .5; if (wave >= STAGES[stageIdx].waves.length) { stageClear(); return; } $('goUI').hidden = false; goT = 2.5; A.tone(660, .15, 'triangle', .06); A.tone(880, .2, 'triangle', .06, .12); } }
function stepFlow(dt) { const st = STAGES[stageIdx]; const W2 = st.waves[wave];
  if (!lock && W2 && hero.x > W2[0] - 1) { const batches = W2[1].split(';'); lock = { x: Math.max(camX, W2[0]), pending: 0, batches: batches.slice(1) }; wave++; spawnBatch(batches[0].split(' ')); $('goUI').hidden = true; }
  const target = lock ? lock.x : clamp(hero.x, halfW, st.len - halfW + 2); camX = lerp(camX, Math.max(target, maxX - 1), Math.min(1, dt * 4)); maxX = Math.max(maxX, camX); if (goT > 0) { goT -= dt; if (goT <= 0) $('goUI').hidden = true; } }
function heroDown() { lives--; deaths++; updHud(); if (lives <= 0) { state = 'over'; setTimeout(gameOver, 900); return; }
  setTimeout(() => { if (state !== 'play') return; H = HEROES[S.hero || 0]; hero = mkFighter({ team: 0, look: heroLook(H), sc: 1, hp: H.hp, maxhp: H.hp, dmg: H.dmg, reach: 1.0, x: camX - halfW + 1, z: 0, face: 1 }); hero.maxhp = H.hp; hero.inv = 2.2; hero.y = 6; for (const f of fighters) if (f.team === 1 && Math.abs(f.x - hero.x) < 2.5) { damage(f, 0, true, Math.sign(f.x - hero.x) || 1); } updHud(); toast(T('חזרתם לקרב! ❤️', 'Back in the fight! ❤️')); }, 1200); }
function stageClear() { state = 'clear'; A.allOff(); hero.st = 'win'; const secs = (performance.now() - startT) / 1000; const stars = deaths === 0 ? 3 : deaths === 1 ? 2 : 1; if ((S.stars[stageIdx] || 0) < stars) S.stars[stageIdx] = stars; if (score > S.best) S.best = score; S.save();
  [0, 4, 7, 12].forEach((n, k) => A.tone(523 * Math.pow(2, n / 12), .25, 'triangle', .09, k * .1)); A.voice('yay', 1.1); FX.burst(V3(hero.x, 2, hero.z), 120, CONFETTI, 6, .1, 1.8, 5);
  setTimeout(() => { $('eT').textContent = stageIdx === 3 ? T('ניצחתם את הכנופיה! 🏆', 'You beat the gang! 🏆') : T('השלב נוקה! 💥', 'Stage cleared! 💥'); [...$('eStars').children].forEach((e, k) => { e.classList.toggle('on', k < stars); e.style.animationDelay = k * .25 + 's'; });
    $('eP').textContent = T(`${score} נקודות · ${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`, `${score} points · ${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`) + (stageIdx === 3 ? T(' · הכלב פיקסל חזר הביתה! 🐶', ' · Pixel the dog is home! 🐶') : ''); $('eNext').hidden = stageIdx >= 3; $('eAgain').textContent = T('שוב', 'Again'); $('endSheet').hidden = false; $('stick').hidden = $('btns').hidden = true; }, 1600); }
function gameOver() { A.allOff(); $('eT').textContent = T('נוקאאוט! 😵', 'Knocked out! 😵'); [...$('eStars').children].forEach(e => e.classList.remove('on')); $('eP').textContent = T('נגמרו החיים. עוד ניסיון?', 'Out of lives. One more try?') + ` · ${score}`; $('eNext').hidden = true; $('eAgain').textContent = T('נסו שוב', 'Try again'); $('endSheet').hidden = false; $('stick').hidden = $('btns').hidden = true; if (score > S.best) { S.best = score; S.save(); } }
function updHud() { if (!hero) return; $('hpI').style.width = Math.max(0, hero.hp / hero.maxhp * 100) + '%'; $('scoreTxt').textContent = score; $('livesTxt').textContent = '❤️'.repeat(Math.max(0, lives)); $('pName').textContent = H.n; }
let bandTop = 0, bandH = 0;
function fit() { const w = innerWidth, h = innerHeight, port = w < h * 1.05; bandH = port ? Math.round(Math.min(h - 70 - 230, w * .82)) : h; bandTop = port ? Math.max(64, Math.round((h - 230 - bandH) * .5) + 8) : 0;
  const pr = renderer.getPixelRatio(); renderer.setSize(w, bandH, false); E.composer.setSize(w, bandH); E.fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (bandH * pr)); const cv = renderer.domElement; cv.style.position = 'absolute'; cv.style.top = bandTop + 'px'; cv.style.height = bandH + 'px'; cv.style.width = w + 'px';
  camera.aspect = w / bandH; camera.clearViewOffset(); const a = camera.aspect, fovR = THREE.MathUtils.degToRad(camera.fov / 2); const viewW = port ? 6.2 : clamp(a * 5.4, 9, 13); camera.userData.d = viewW / (2 * Math.tan(fovR) * a); halfW = viewW / 2; camera.updateProjectionMatrix(); }
E.onResize.push(fit);

/* ---------- touch controls ---------- */
const stick = $('stick'), knob = $('knob'); let sid = null, sc0 = null;
stick.addEventListener('pointerdown', e => { A.ac(); sid = e.pointerId; stick.setPointerCapture(sid); const r = stick.getBoundingClientRect(); sc0 = [r.left + r.width / 2, r.top + r.height / 2]; mv(e); });
const mv = e => { if (e.pointerId !== sid) return; let dx = e.clientX - sc0[0], dy = e.clientY - sc0[1]; const l = Math.hypot(dx, dy), m = 52; if (l > m) { dx *= m / l; dy *= m / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; inp.x = Math.abs(dx) > 8 ? dx / m : 0; inp.z = Math.abs(dy) > 8 ? dy / m : 0; };
stick.addEventListener('pointermove', mv); const su = e => { if (e.pointerId !== sid) return; sid = null; knob.style.transform = ''; inp.x = inp.z = 0; }; stick.addEventListener('pointerup', su); stick.addEventListener('pointercancel', su);
for (const [id, k] of [['bAtk', 'atk'], ['bJmp', 'jmp'], ['bKick', 'kick'], ['bSp', 'sp']]) { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); A.ac(); inp[k] = true; b.classList.add('on'); }); const off = () => b.classList.remove('on'); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); }

/* ---------- screens ---------- */
const unlocked = i => i === 0 || (S.stars[i - 1] || 0) > 0;
function showTitle() { state = 'title'; A.allOff(); A.stopMusic(); $('title').hidden = false; $('hud').hidden = $('stick').hidden = $('btns').hidden = $('bossUI').hidden = $('goUI').hidden = true; $('endSheet').hidden = $('pauseSheet').hidden = true; $('comboUI').textContent = '';
  $('pick').innerHTML = HEROES.map((h, i) => `<button class="pk" data-h="${i}" aria-pressed="${i === (S.hero || 0)}"><b>${h.n}</b><small>${h.d}</small><div class="st">${h.stat.map(x => `<span>${x}</span>`).join('')}</div></button>`).join('');
  let g = ''; for (let i = 0; i < 4; i++) { const un = unlocked(i), st = S.stars[i] || 0; g += `<button class="lb ${un ? '' : 'lock'}" data-i="${i}" ${un ? '' : 'disabled'} style="font-size:15px">${un ? ['🏙️', '🚇', '🌃', '🏭'][i] : '🔒'}<small>${un ? starsHTML(st) : ''}</small></button>`; } $('lgrid').innerHTML = g;
  startStage(0, true); hero.x = camX - 1.2; hero.face = 1; titleDemo(); }
function titleDemo() { const other = HEROES[1 - (S.hero || 0)]; const f = mkFighter({ team: 2, look: heroLook(other), x: camX + 1.2, z: 0, face: -1, hp: 1, maxhp: 1 }); f.demo = true; }
$('pick').onclick = e => { const b = e.target.closest('[data-h]'); if (!b) return; A.ac(); S.hero = +b.dataset.h; S.save(); A.tone(600, .06, 'triangle', .06); showTitle(); };
$('lgrid').onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; A.ac(); startStage(+b.dataset.i); };
$('eMap').onclick = () => showTitle(); $('eAgain').onclick = () => startStage(stageIdx); $('eNext').onclick = () => startStage(stageIdx + 1);
$('pauseBtn').onclick = () => { if (state !== 'play') return; state = 'pause'; $('pauseSheet').hidden = false; }; $('pGo').onclick = () => { $('pauseSheet').hidden = true; state = 'play'; }; $('pMap').onclick = () => showTitle();
$('pauseBtn').innerHTML = ICO.pause('#ffffff'); $('homeT').innerHTML = ICO.home('#ffffff'); soundButton('sndBtn', S, A, '#ffffff'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('tSub').textContent = T('כנופיית "פחיות הספריי" חטפה את פיקסל, הכלב של האחים! בחרו אח, צאו לרחובות והחזירו אותו הביתה 🐶', 'The Spray Can gang kidnapped Pixel, the brothers’ dog! Pick a brother, hit the streets and bring him home 🐶');
$('pT').textContent = T('הפסקה', 'Paused'); $('pMap').textContent = T('תפריט', 'Menu'); $('pGo').textContent = T('המשך ▶', 'Resume ▶'); $('eMap').textContent = T('תפריט', 'Menu'); $('eNext').textContent = T('השלב הבא ▶', 'Next stage ▶');

/* ---------- loop ---------- */
let last = performance.now();
function loop(now) { requestAnimationFrame(loop); let dt = Math.min(.05, (now - last) / 1000) * (window.__fast || 1); last = now; const t = now / 1000; A.tick();
  if (hitStop > 0) { hitStop -= dt; dt *= .15; } if (slowT > 0) { slowT -= dt; dt *= .35; }
  if (state === 'play' && hero) { for (const f of fighters.slice()) stepFighter(f, dt); stepFlow(dt);
    for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; s.vy -= (s.k === 'bottle' ? 9 : 6) * dt; s.x += s.vx * dt; s.z += (s.vz || 0) * dt; s.y = Math.max(s.k === 'bottle' ? 0 : .3, s.y + s.vy * dt); s.m.position.set(s.x, s.y, s.z); s.m.rotation.z -= dt * 10; s.life -= dt; let hit = null;
      for (const o of fighters) if (o.team !== s.team && o.team !== 2 && !o.dead && o.inv <= 0 && o.st !== 'down' && Math.abs(o.y + 1 - s.y) < 1.3 && Math.abs(o.x - s.x) < .6 && Math.abs(o.z - s.z) < .55) { hit = o; break; }
      if (hit || s.life <= 0 || (s.k === 'bottle' && s.y <= 0) || !onScreen({ x: s.x })) { if (hit) damage(hit, s.dmg || 3.2, s.k !== 'bottle', Math.sign(s.vx), { team: s.team }); if (s.k === 'bottle') A.noise(.25, 'highpass', 3000, 1, .2); FX.burst(V3(s.x, s.y, s.z), 24, [[1.4, 1, .6], [.8, .8, .9]], 3, .08, .6, 6); A.noise(.3, 'lowpass', 700, 1, .3); world.remove(s.m); shots.splice(i, 1); if (s.k === 'crate' && Math.random() < .5) addItem(Math.random() < .5 ? 'pizza' : 'coin', s.x, s.z); } }
    comboT -= dt; if (comboT <= 0 && combo) { combo = 0; $('comboUI').textContent = ''; } }
  else if (state === 'clear' || state === 'over') { for (const f of fighters) { if (f.st === 'down') stepFighter(f, dt * .5); } }
  for (const f of fighters) pose(f, dt, t);
  for (const it of items) { it.t += dt; if (it.k === 'coin') it.m.rotation.y += dt * 4; if (it.k === 'pizza' || it.k === 'coin') it.m.position.y = .3 + Math.sin(it.t * 4) * .06; }
  if (stageObj) for (const m of stageObj.movers) { m.o.position.x += m.v * dt; if (m.o.position.x > m.max) m.o.position.x = m.min; }
  shake = Math.max(0, shake - dt * 1.5); const port = innerWidth < innerHeight; const d = camera.userData.d || 14;
  camera.position.set(camX + (Math.random() - .5) * shake, 2.9 + (Math.random() - .5) * shake, d); camera.lookAt(camX, 1.1, -.4); sun.position.set(camX + 4, 12, 9); sun.target.position.set(camX, 0, 0);
  FX.update(dt, 0); E.grade.uniforms.uFlash.value *= Math.pow(.05, dt); E.render(); }
setTimeout(() => { E.resize(); showTitle(); $('loading').hidden = true; requestAnimationFrame(loop); window.__brawlOK = true; }, 20);
window.__br = { MOVES, get meter() { return meter; }, set meter(v) { meter = v; updMeter(); }, spawnFoe, startAtk, addItem, startStage, get hero() { return hero; }, get fighters() { return fighters; }, inp, get state() { return state; }, get camX() { return camX; }, items, set god(v) { if (hero) hero.inv = v; } };

/* rotate-to-landscape suggestion */
(() => { const d = document.createElement('div'); d.id = 'rotHint'; d.innerHTML = `<div><div class="ph">📱</div><b>${T('סובבו את הטלפון לרוחב', 'Turn your phone sideways')}</b><span>${T('המשחק הכי כיפי במסך רחב 🔄', 'This game plays best in landscape 🔄')}</span><button class="btn pri">${T('לשחק ככה בכל זאת', 'Play like this anyway')}</button></div>`;
  const st = document.createElement('style'); st.textContent = `#rotHint{position:fixed;inset:0;z-index:60;background:rgba(10,6,24,.9);display:none;place-items:center;text-align:center;color:#fff;padding:24px}#rotHint>div{max-width:320px}#rotHint .ph{font-size:72px;animation:rotph 1.8s ease-in-out infinite;display:inline-block}@keyframes rotph{0%,20%{transform:rotate(0)}50%,80%{transform:rotate(-90deg)}100%{transform:rotate(0)}}#rotHint b{display:block;font-size:24px;margin:14px 0 6px}#rotHint span{display:block;opacity:.85;margin-bottom:18px}@media (orientation:portrait) and (max-width:820px){#rotHint.on{display:grid}}`;
  document.head.appendChild(st); document.body.appendChild(d); if (!sessionStorage.getItem('brawl-rot') && isTouch) d.classList.add('on');
  d.querySelector('button').onclick = () => { d.classList.remove('on'); try { sessionStorage.setItem('brawl-rot', '1'); } catch (e) {} };
  addEventListener('resize', () => { if (innerWidth > innerHeight) { d.classList.remove('on'); } }); })();
