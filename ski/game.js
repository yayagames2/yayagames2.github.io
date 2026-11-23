import { THREE, $, V3, C, clamp, lerp, rnd, rng, T, EN, store, engine, std, particles, audio, toast, ICO, hubButtons, qualityButton, isTouch } from '../lib/kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const DEF_OUT = [{ jacket: 0, pants: 4, head: 0, eyes: 1, hair: 0, gear: 0 }, { jacket: 4, pants: 2, head: 1, eyes: 3, hair: 0, gear: 5 }];
const S = store('ski-save', { who: 0, gear: 'board', mode: 'free', mt: 0, stars: {}, best: {}, out: DEF_OUT.map(o => Object.assign({}, o)), tut: 0 });
if (!Array.isArray(S.out) || S.out.length < 2) S.out = DEF_OUT.map(o => Object.assign({}, o));
const E = engine(S, { fov: 60, far: 1400, bloom: [.18, .4, 1.2], exposure: 1.05, vignette: .2, sat: 1.1 });
const { scene, camera, renderer } = E;
const A = audio(S); const FX = particles(E, 1600);
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };

/* ================= MOUNTAINS ================= */
const MTS = [
  { n: T('גבעת הארנבים', 'Bunny Hill'), ic: '🐰', slope: .2, W: 34, amp: 10, bump: .7, trees: .5, obs: .45, ramp: 1, vMax: 22, sky: ['#3a8ae8', '#d8f0ff'], fog: '#e2f2ff', fogN: 70, fogF: 330, sun: '#fff6e0', sunI: 2.6, sunDir: [.5, .6, .45], hemi: ['#e8f4ff', '#8aa8c8', 1.1], snow: '#f6fbff', shade: '#a8c4e8', peak: ['#7a8aa8', '#ffffff'], seed: 3, night: 0 },
  { n: T('עמק האורנים', 'Pine Valley'), ic: '🌲', slope: .25, W: 28, amp: 16, bump: .9, trees: 1.2, obs: .8, ramp: 1, vMax: 25, sky: ['#2a78d8', '#cfe8ff'], fog: '#d4e8f8', fogN: 55, fogF: 280, sun: '#ffffff', sunI: 2.4, sunDir: [-.4, .65, .5], hemi: ['#dcecff', '#6a8a6a', 1], snow: '#f2f8ff', shade: '#98b4d8', peak: ['#5a6a7a', '#f4f8ff'], seed: 17, night: 0 },
  { n: T('רכס השקיעה', 'Sunset Ridge'), ic: '🌅', slope: .29, W: 30, amp: 14, bump: 1.2, trees: .7, obs: .9, ramp: 1.6, vMax: 28, sky: ['#5a3aa8', '#ffb070'], fog: '#f8c8a8', fogN: 60, fogF: 300, sun: '#ffc890', sunI: 2.5, sunDir: [-.7, .22, .7], hemi: ['#ffd8c0', '#7a5a8a', 1], snow: '#fff2ea', shade: '#c8a0c8', peak: ['#6a4a7a', '#ffe0d0'], seed: 29, night: 0 },
  { n: T('פסגת הלילה', 'Night Peak'), ic: '🌌', slope: .32, W: 30, amp: 13, bump: 1.1, trees: .9, obs: 1, ramp: 1.3, vMax: 30, sky: ['#060a24', '#1a3a6a'], fog: '#142a50', fogN: 50, fogF: 240, sun: '#b8d0ff', sunI: 1.3, sunDir: [.3, .7, .4], hemi: ['#6a8ad8', '#141a3a', 1.1], snow: '#dbe8ff', shade: '#5a6aa8', peak: ['#1a2448', '#8aa0d0'], seed: 41, night: 1 }];
let M = MTS[0], PH1 = 0, PH2 = 0;
const cxAt = z => M.amp * (Math.sin(z * .011 + PH1) + .55 * Math.sin(z * .027 + PH2)) * Math.min(1, Math.max(0, z) / 60);
function hAt(x, z) { const c = cxAt(z); let h = -z * M.slope + M.bump * (Math.sin(x * .13 + z * .045) * Math.sin(z * .07 + 1.1) * .8 + Math.sin(z * .19 + x * .05) * .3) * Math.min(1, Math.max(0, z) / 40);
  const d = Math.abs(x - c) - M.W / 2; if (d > 0) h += d * d * .026 + d * .25; return h; }

/* ================= SKY / LIGHT ================= */
const skyU = { a: { value: C('#3a8ae8') }, b: { value: C('#d8f0ff') }, sd: { value: V3(.5, .6, .45).normalize() }, sc: { value: C('#fff6e0') }, night: { value: 0 }, t: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; }',
  fragmentShader: `uniform vec3 a,b,sd,sc; uniform float night,t; varying vec3 vD; float hs(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
  void main(){ float y=clamp(vD.y,0.,1.); vec3 c=mix(b,a,pow(y,.6)); float s=max(dot(vD,sd),0.); c+=sc*(pow(s,900.)*8.+pow(s,14.)*.3*(1.-night*.6));
   if(night>.5){ vec3 q=floor(vD*260.); float st=step(.996,hs(q))*smoothstep(.02,.3,vD.y); c+=vec3(st)*(.6+.4*sin(t*3.+hs(q)*40.));
     float au=smoothstep(.12,.3,vD.y)*smoothstep(.62,.32,vD.y)*(.5+.5*sin(vD.x*9.+t*.4+sin(vD.z*7.+t*.3)*2.)); c+=vec3(.15,.9,.55)*au*.35+vec3(.5,.2,.8)*au*au*.2; }
   gl_FragColor=vec4(c,1.); }` }));
sky.frustumCulled = false; scene.add(sky);
scene.fog = new THREE.Fog('#e2f2ff', 70, 330);
const hemi = new THREE.HemisphereLight('#e8f4ff', '#8aa8c8', .8); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff6e0', 2.6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); const sc0 = sun.shadow.camera; sc0.left = sc0.bottom = -22; sc0.right = sc0.top = 22; sc0.near = 1; sc0.far = 120; sun.shadow.bias = -.0008; sun.shadow.normalBias = .03; scene.add(sun, sun.target);
const pm = new THREE.PMREMGenerator(renderer); const envS = new THREE.Scene(); const envBox = new THREE.Mesh(new THREE.SphereGeometry(20, 16, 8), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
envS.add(envBox);
function setEnv() { const g = envBox.geometry, p = g.attributes.position, cols = []; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 20; const c = y > 0 ? C(M.sky[1]).lerp(C(M.sky[0]), y) : C(M.snow).multiplyScalar(.9); cols.push(c.r, c.g, c.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); scene.environment = pm.fromScene(envS, .02).texture; }

/* ================= TERRAIN ================= */
const GW = 200, GL = 260, NX = 80, NZ = 130;
const tGeo = new THREE.PlaneGeometry(GW, GL, NX, NZ).rotateX(-Math.PI / 2); const tPos = tGeo.attributes.position; const base = Float32Array.from(tPos.array);
tGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(tPos.count * 3), 3));
const snowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 900; i++) { const v = 225 + Math.random() * 30; x.fillStyle = `rgb(${v},${v},${Math.min(255, v + 12)})`; x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 52); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const terrain = new THREE.Mesh(tGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, metalness: 0, map: snowTex, envMapIntensity: .25 })); terrain.receiveShadow = true; terrain.frustumCulled = false; scene.add(terrain);
let tOX = 1e9, tOZ = 1e9;
function updTerrain(z, force) { const oz = Math.round(z / 6) * 6 + 90, ox = Math.round(cxAt(z + 60) / 10) * 10; if (!force && oz === tOZ && ox === tOX) return; tOX = ox; tOZ = oz;
  const a = tPos.array, col = tGeo.attributes.color.array, cS = C(M.snow), cH = C(M.shade);
  for (let i = 0; i < tPos.count; i++) { const x = base[i * 3] + ox, zz = base[i * 3 + 2] + oz; a[i * 3] = x; a[i * 3 + 2] = zz; a[i * 3 + 1] = hAt(x, zz); }
  tPos.needsUpdate = true; tGeo.computeVertexNormals(); const nr = tGeo.attributes.normal.array;
  for (let i = 0; i < tPos.count; i++) { const xx = a[i * 3], zz2 = a[i * 3 + 2]; const k = clamp(clamp((1 - nr[i * 3 + 1]) * 3.6, 0, 1) * .85 + (Math.sin(xx * .08 + zz2 * .03) * Math.sin(zz2 * .05)) * .12 + .06 + (Math.sin(xx * .9) * Math.sin(zz2 * .7)) * .03, 0, 1); col[i * 3] = lerp(cS.r, cH.r, k); col[i * 3 + 1] = lerp(cS.g, cH.g, k); col[i * 3 + 2] = lerp(cS.b, cH.b, k); }
  tGeo.attributes.color.needsUpdate = true; tGeo.computeBoundingSphere(); }

/* ================= FAR PEAKS ================= */
const peaks = new THREE.Group(); scene.add(peaks);
function buildPeaks() { peaks.clear(); const r = rng(M.seed + 9); const fogC = C(M.fog);
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + r() * .3, R = 700 + r() * 250, rad = 140 + r() * 160, hh = 180 + r() * 230; const g = new THREE.ConeGeometry(rad, hh, 7 + Math.floor(r() * 4), 6); const p = g.attributes.position, cols = [];
    for (let k = 0; k < p.count; k++) { const y = (p.getY(k) + hh / 2) / hh; const jit = (Math.sin(p.getX(k) * .05) + Math.cos(p.getZ(k) * .07)) * .06; const c = y + jit > .55 ? C(M.peak[1]) : C(M.peak[0]).lerp(C(M.peak[1]), y * .5); c.lerp(fogC, .35 + (1 - y) * .35); cols.push(c.r, c.g, c.b);
      p.setX(k, p.getX(k) * (1 + (r() - .5) * .25)); p.setZ(k, p.getZ(k) * (1 + (r() - .5) * .25)); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })); m.position.set(Math.sin(a) * R, hh / 2 - 260, Math.cos(a) * R); peaks.add(m); } }

/* ================= PROPS (instanced) ================= */
function colorize(g, c) { const n = g.attributes.position.count, a = new Float32Array(n * 3), cc = C(c); for (let i = 0; i < n; i++) { a[i * 3] = cc.r; a[i * 3 + 1] = cc.g; a[i * 3 + 2] = cc.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
const strip = g => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g; };
function treeGeo() { const parts = [colorize(new THREE.CylinderGeometry(.18, .26, 1.4, 6).translate(0, .7, 0), '#6a4224')];
  [[1.9, 2.2, 1.1], [1.5, 1.9, 2.3], [1.05, 1.6, 3.4], [.6, 1.2, 4.4]].forEach(([r, h, y]) => { parts.push(colorize(new THREE.ConeGeometry(r, h, 8).translate(0, y, 0), '#1f5a3a')); parts.push(colorize(new THREE.ConeGeometry(r * .82, h * .35, 8).translate(0, y + h * .34, 0), '#f4f8ff')); });
  return mergeGeometries(parts.map(strip)); }
function rockGeo() { const g = new THREE.DodecahedronGeometry(1, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (1 + Math.sin(i * 1.7) * .12), p.getY(i) * .75, p.getZ(i) * (1 + Math.cos(i * 2.3) * .12)); g.computeVertexNormals(); const n = g.attributes.normal, cols = [];
  for (let i = 0; i < p.count; i++) { const c = n.getY(i) > .55 ? C('#f4f8ff') : C('#6a7280'); cols.push(c.r, c.g, c.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); return strip(g); }
function snowmanGeo() { const W = '#fbfdff'; const parts = [colorize(new THREE.SphereGeometry(.75, 16, 12).translate(0, .65, 0), W), colorize(new THREE.SphereGeometry(.55, 16, 12).translate(0, 1.6, 0), W), colorize(new THREE.SphereGeometry(.4, 16, 12).translate(0, 2.35, 0), W),
  colorize(new THREE.ConeGeometry(.08, .45, 8).rotateX(Math.PI / 2).translate(0, 2.35, .55), '#ff7a1a'), colorize(new THREE.CylinderGeometry(.3, .3, .45, 12).translate(0, 2.85, 0), '#1a1a22'), colorize(new THREE.CylinderGeometry(.45, .45, .05, 16).translate(0, 2.63, 0), '#1a1a22'),
  colorize(new THREE.TorusGeometry(.42, .08, 6, 16).rotateX(Math.PI / 2).translate(0, 2.0, 0), '#e0303a')];
  for (const s of [-1, 1]) parts.push(colorize(new THREE.SphereGeometry(.05, 6, 4).translate(s * .14, 2.45, .35), '#111'));
  for (let k = 0; k < 3; k++) parts.push(colorize(new THREE.SphereGeometry(.06, 6, 4).translate(0, 1.4 + k * .2, .52), '#111'));
  return mergeGeometries(parts.map(strip)); }
function gemGeo() { return strip(colorize(new THREE.OctahedronGeometry(.55, 0).scale(.8, 1.15, .8), '#ffffff')); }
const propMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .75 });
function pool(geo, n, mat = propMat, shadow = true) { const m = new THREE.InstancedMesh(geo, mat, n); m.castShadow = shadow; m.receiveShadow = false; m.frustumCulled = false; const z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < n; i++) m.setMatrixAt(i, z); scene.add(m); return { m, free: Array.from({ length: n }, (_, i) => n - 1 - i), n }; }
const P_TREE = pool(treeGeo(), 700), P_ROCK = pool(rockGeo(), 90), P_SNOW = pool(snowmanGeo(), 40);
const gemMat = new THREE.MeshStandardMaterial({ color: '#7ae8ff', emissive: '#2ab8ff', emissiveIntensity: .9, roughness: .15, metalness: .3 });
const P_GEM = pool(gemGeo(), 160, gemMat, false);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = V3(), _p = V3(), _e = new THREE.Euler();
function place(P, x, y, z, s = 1, ry = 0) { const i = P.free.pop(); if (i == null) return -1; _q.setFromEuler(_e.set(0, ry, 0)); _m.compose(_p.set(x, y, z), _q, _s.set(s, s, s)); P.m.setMatrixAt(i, _m); P.m.instanceMatrix.needsUpdate = true; return i; }
function unplace(P, i) { if (i < 0) return; _m.makeScale(0, 0, 0); P.m.setMatrixAt(i, _m); P.m.instanceMatrix.needsUpdate = true; P.free.push(i); }

// gates, ramps, finish, lamps (small pools of groups)
function flagTex(col) { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d'); x.fillStyle = col; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(255,255,255,.85)'; x.fillRect(0, 26, 64, 12); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const GATE_M = { r: [std('#e8202a', { roughness: .4 }), new THREE.MeshStandardMaterial({ map: flagTex('#e8202a'), side: THREE.DoubleSide, roughness: .6 })], b: [std('#1a5ae8', { roughness: .4 }), new THREE.MeshStandardMaterial({ map: flagTex('#1a5ae8'), side: THREE.DoubleSide, roughness: .6 })] };
const gates = []; for (let i = 0; i < 10; i++) { const g = new THREE.Group(); const poles = []; for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.4, 8), GATE_M.r[0]); p.position.set(s * 3.6, 1.2, 0); p.castShadow = true; g.add(p); const f = new THREE.Mesh(new THREE.PlaneGeometry(.9, .7), GATE_M.r[1]); f.position.set(s * 3.6 - s * .48, 1.95, 0); g.add(f); poles.push(p, f); } g.visible = false; scene.add(g); gates.push({ g, poles, used: false }); }
function setGateCol(G, k) { const M2 = GATE_M[k]; G.poles.forEach((m, i) => m.material = M2[i % 2]); }
function rampGeo() { const L = 7, Wd = 5.4, H = 1.7, n = 10; const pos = [], idx = [];
  for (let i = 0; i <= n; i++) { const t = i / n, z = t * L, y = H * t * t; pos.push(-Wd / 2, y, z, Wd / 2, y, z, -Wd / 2, -1.2, z, Wd / 2, -1.2, z); }
  for (let i = 0; i < n; i++) { const a = i * 4, b = a + 4; idx.push(a, b, a + 1, a + 1, b, b + 1, a + 2, a, b + 2, a, b, b + 2, a + 1, b + 1, a + 3, b + 1, b + 3, a + 3); }
  const e = n * 4; idx.push(e, e + 2, e + 1, e + 1, e + 2, e + 3); const uv = []; for (let i = 0; i <= n; i++) { const t = i / n; uv.push(0, t, 1, t, 0, t, 1, t); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; }
const RAMP_G = rampGeo(); const rampTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#f4f9ff'; x.fillRect(0, 0, 128, 256); x.strokeStyle = '#2ab8ff'; x.lineWidth = 14; x.lineCap = 'round'; x.lineJoin = 'round'; for (let k = 0; k < 3; k++) { const y = 200 - k * 70; x.beginPath(); x.moveTo(24, y); x.lineTo(64, y - 40); x.lineTo(104, y); x.stroke(); } x.fillStyle = '#ff5a8a'; x.fillRect(0, 0, 128, 10); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(); const rampM = new THREE.MeshStandardMaterial({ map: rampTex, roughness: .6 }), rampEdge = std('#2ab8ff', { roughness: .4, emissive: '#0a4a8a', emissiveIntensity: .3 });
const ramps = []; for (let i = 0; i < 8; i++) { const g = new THREE.Group(); const m = new THREE.Mesh(RAMP_G, rampM); m.castShadow = m.receiveShadow = true; g.add(m); for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.18, .18, 7.3), rampEdge); b.position.set(s * 2.75, .55, 3.5); b.rotation.x = -.24; g.add(b); } const lip = new THREE.Mesh(new THREE.BoxGeometry(5.6, .12, .25), rampEdge); lip.position.set(0, 1.72, 7); g.add(lip); g.visible = false; scene.add(g); ramps.push({ g, used: false }); }
const finish = new THREE.Group(); { const ck = document.createElement('canvas'); ck.width = 256; ck.height = 64; const x = ck.getContext('2d'); for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#111' : '#fff'; x.fillRect(i * 16, j * 16, 16, 16); } const t = new THREE.CanvasTexture(ck); t.colorSpace = THREE.SRGBColorSpace;
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, 7, 10), std('#ff3a6a')); p.position.set(s * 9, 3.5, 0); finish.add(p); } const b = new THREE.Mesh(new THREE.BoxGeometry(18.5, 1.4, .2), new THREE.MeshStandardMaterial({ map: t })); b.position.y = 6.6; finish.add(b); finish.visible = false; scene.add(finish); }
const lampGeo = mergeGeometries([colorize(new THREE.CylinderGeometry(.08, .1, 4, 6).translate(0, 2, 0), '#2a2a38'), colorize(new THREE.SphereGeometry(.32, 10, 8).translate(0, 4.1, 0), '#ffe8a0')].map(strip));
const P_LAMP = pool(lampGeo, 60, new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#ffd27a', emissiveIntensity: .0, roughness: .5 }), false);
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,230,160,1)'); g.addColorStop(.3, 'rgba(255,200,110,.45)'); g.addColorStop(1, 'rgba(255,180,80,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const glows = []; for (let i = 0; i < 30; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(4); s.visible = false; scene.add(s); glows.push(s); }

/* ================= FALLING SNOW (light – never blocks the view) ================= */
const FL = 260; const flGeo = new THREE.BufferGeometry(); const flP = new Float32Array(FL * 3); for (let i = 0; i < FL; i++) { flP[i * 3] = rnd(-30, 30); flP[i * 3 + 1] = rnd(-5, 25); flP[i * 3 + 2] = rnd(-10, 60); } flGeo.setAttribute('position', new THREE.BufferAttribute(flP, 3));
const flakes = new THREE.Points(flGeo, new THREE.PointsMaterial({ color: '#ffffff', size: .09, transparent: true, opacity: .75, depthWrite: false, fog: true })); flakes.frustumCulled = false; scene.add(flakes);
sky.renderOrder = -10;

/* ================= RIDERS & WARDROBE ================= */
const JACKETS = [['#16161e', '#9aff2a', T('ניאון פאנק', 'Neon Punk')], ['#ff5ab0', '#ffffff', T('מסטיק', 'Bubblegum')], ['#16b8b0', '#ffd21a', T('אוקיינוס', 'Ocean')], ['#ff7a1a', '#7a2ad8', T('שקיעה', 'Sunset')], ['#f6f6ff', '#b48aff', T('מלכת השלג', 'Snow Queen')], ['#e0202a', '#16161e', T('אש', 'Fire')], ['#1a2a6a', '#ff3ad8', T('גלקסיה', 'Galaxy')], ['#6a7a3a', '#e8d8a0', T('הסוואה', 'Camo')], ['#ffe14a', '#1a1a22', T('דבורה', 'Bumblebee')]];
const PANTS = [['#16161e', T('שחור', 'Black')], ['#f2f2f8', T('לבן', 'White')], ['#b8a0f0', T('לילך', 'Lilac')], ['#7ae0c0', T('מנטה', 'Mint')], ['tartan', T('משבצות', 'Tartan')], ['#3a5aa8', T('ג׳ינס', 'Denim')], ['#ff6a8a', T('ורוד', 'Pink')], ['#e8c87a', T('חאקי', 'Khaki')]];
const HEADS = [['none', '', T('בלי כובע', 'No hat'), '💇'], ['beanie', '#ff4aa8', T('גרב ורוד', 'Pink beanie'), '🧶'], ['beanie', '#16161e', T('גרב שחור', 'Black beanie'), '🧶'], ['beanie', 'rainbow', T('גרב צבעוני', 'Rainbow beanie'), '🌈'], ['helmet', '#ffffff', T('קסדה לבנה', 'White helmet'), '⛑️'], ['helmet', '#16161e', T('קסדה שחורה', 'Black helmet'), '⛑️'], ['helmet', '#ffc21a', T('קסדת זהב', 'Gold helmet'), '⛑️'], ['cap', '#e0202a', T('כובע הפוך', 'Backwards cap'), '🧢']];
const EYES = [['none', '', T('בלי', 'None'), '👀'], ['gog', '#ff8a1a', T('כתום', 'Orange'), '🥽'], ['gog', '#2a8aff', T('כחול', 'Blue'), '🥽'], ['gog', '#b03aff', T('סגול', 'Purple'), '🥽'], ['gog', '#2ad870', T('ירוק', 'Green'), '🥽'], ['gog', '#ffd21a', T('זהב', 'Gold'), '🥽'], ['sun', '#16161e', T('משקפי שמש', 'Sunglasses'), '🕶️'], ['heart', '#ff3a8a', T('לבבות', 'Hearts'), '💖']];
const HAIRS = [[['#ff3aa8', '#ffe14a'], T('ורוד / בלונד', 'Pink / Blonde')], [['#3aff8a', '#2a1a12'], T('ירוק / שחור', 'Green / Black')], [['#3ab8ff', '#b8541a'], T('כחול / ג׳ינג׳י', 'Blue / Auburn')], [['#ffffff', '#b07aff'], T('לבן / סגול', 'White / Purple')], [['#ff3a2a', '#ff8ac8'], T('אדום / ורוד', 'Red / Pink')], [['#1a1a22', '#f0e0c0'], T('שחור / פלטינה', 'Black / Platinum')]];
const GEARS = [['#16161e', '#9aff2a', T('ניאון', 'Neon')], ['#1a4ae8', '#9ae8ff', T('קרח', 'Ice')], ['#e0202a', '#ffb21a', T('אש', 'Fire')], ['#2a1a5a', '#ff3ad8', T('גלקסיה', 'Galaxy')], ['rainbow', '', T('קשת', 'Rainbow')], ['#ffffff', '#ff5ab0', T('ורוד', 'Pink')], ['#16161e', '#ffc21a', T('זהב', 'Gold')]];
const CHARS = [{ n: 'KAI', skin: '#e8b08a', girl: false }, { n: 'LUNA', skin: '#f6d2b8', girl: true }];
const texCache = {};
function patTex(kind, a, b) { const k = kind + a + b; if (texCache[k]) return texCache[k]; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  if (kind === 'tartan') { x.fillStyle = '#b8101a'; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(0,0,0,.45)'; for (let i = 0; i < 64; i += 16) { x.fillRect(i, 0, 6, 64); x.fillRect(0, i, 64, 6); } x.fillStyle = 'rgba(255,220,60,.6)'; for (let i = 8; i < 64; i += 16) { x.fillRect(i, 0, 1.5, 64); x.fillRect(0, i, 64, 1.5); } }
  else if (kind === 'rainbow') { const cs = ['#ff3a3a', '#ff9a1a', '#ffe14a', '#3ad86a', '#2a8aff', '#9a3aff']; cs.forEach((cc, i) => { x.fillStyle = cc; x.fillRect(0, i * 64 / 6, 64, 64 / 6 + 1); }); }
  else if (kind === 'board') { const g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, a); g.addColorStop(.5, b); g.addColorStop(1, a); x.fillStyle = g; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(255,255,255,.35)'; for (let i = -64; i < 64; i += 14) { x.beginPath(); x.moveTo(i, 64); x.lineTo(i + 8, 64); x.lineTo(i + 72, 0); x.lineTo(i + 64, 0); x.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; texCache[k] = t; return t; }
function buildRider(ci, o, gear) {
  const ch = CHARS[ci], [jc, ja] = JACKETS[o.jacket % JACKETS.length], pc = PANTS[o.pants % PANTS.length][0], hd = HEADS[o.head % HEADS.length], ey = EYES[o.eyes % EYES.length], hairC = HAIRS[o.hair % HAIRS.length][0][ch.girl ? 1 : 0], gr = GEARS[o.gear % GEARS.length];
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const J = new THREE.MeshPhysicalMaterial({ color: C(jc), roughness: .55, clearcoat: .3, sheen: .3 }), JA = std(ja, { roughness: .5 }), SK = std(ch.skin, { roughness: .6 });
  const PM = pc === 'tartan' ? new THREE.MeshStandardMaterial({ map: patTex('tartan'), roughness: .8 }) : std(pc, { roughness: .75 }); if (pc === 'tartan') PM.map.repeat.set(2, 2);
  const HAIR = std(hairC, { roughness: .55 }), BOOT = std(ch.girl ? '#ffffff' : '#16161e', { roughness: .4 }), GLOVE = std(ja, { roughness: .6 });
  const hips = new THREE.Group(); hips.position.y = .86; body.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(.23, .34, 6, 16), J); chest.position.y = .3; chest.scale.set(1, 1, .82); torso.add(chest);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.235, .235, .07, 18, 1, true), JA); band.position.y = .36; band.scale.set(1, 1, .82); torso.add(band);
  const zip = new THREE.Mesh(new THREE.BoxGeometry(.03, .48, .02), std('#d8d8e0', { metalness: .8, roughness: .3 })); zip.position.set(0, .28, .2); torso.add(zip);
  const coll = new THREE.Mesh(new THREE.TorusGeometry(.16, .06, 8, 18), JA); coll.rotation.x = Math.PI / 2; coll.position.y = .6; torso.add(coll);
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(.25, .24, .1, 18), JA); hem.position.y = .04; hem.scale.set(1, 1, .84); torso.add(hem);
  // head
  const neck = new THREE.Group(); neck.position.y = .66; torso.add(neck); const head = new THREE.Group(); head.position.y = .2; neck.add(head); const HR = .21;
  head.add(new THREE.Mesh(new THREE.SphereGeometry(HR, 28, 20), SK));
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), SK); e.scale.set(.5, 1, .8); e.position.set(s * HR, 0, 0); head.add(e); }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), std(C(ch.skin).lerp(C('#ff8a80'), .25).getStyle())); nose.position.set(0, -.03, HR * .98); head.add(nose);
  const mouthM = std('#7a1a2c', { roughness: .4 });
  const smile = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V3(-.06, ch.girl ? .01 : 0, 0), V3(0, -.035, 0), V3(.06, ch.girl ? .01 : .025, 0)), 10, .009, 5), mouthM); smile.position.set(0, -.1, HR * .94); head.add(smile);
  const showEyes = ey[0] === 'none' || ey[0] === 'gog' && false;
  if (ey[0] === 'none') { for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.SphereGeometry(.042, 14, 10), std('#ffffff', { roughness: .15 })); w.scale.set(1, 1.15, .6); w.position.set(s * .075, .03, HR * .86); head.add(w); const p = new THREE.Mesh(new THREE.SphereGeometry(.024, 10, 8), std('#1a1410', { roughness: .1 })); p.position.set(s * .075, .03, HR * .9 + .012); head.add(p);
      const br = new THREE.Mesh(new THREE.CapsuleGeometry(.008, .05, 3, 6), HAIR); br.rotation.z = Math.PI / 2 + (ch.girl ? 0 : s * .25); br.position.set(s * .075, .095, HR * .86); head.add(br); } }
  void showEyes;
  // hair
  const hatOn = hd[0] !== 'none';
  if (ch.girl) { const cap = new THREE.Mesh(new THREE.SphereGeometry(HR * 1.07, 24, 16, 0, TAU, 0, Math.PI * .58), HAIR); cap.rotation.x = -.35; head.add(cap);
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(.12, .28, 6, 12), HAIR); back.position.set(0, -.14, -.12); back.scale.set(1.35, 1, .7); head.add(back);
    for (const s of [-1, 1]) { const lk = new THREE.Mesh(new THREE.CapsuleGeometry(.045, .2, 4, 8), HAIR); lk.position.set(s * .19, -.1, .05); lk.rotation.z = s * .12; head.add(lk); }
    const pony = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .3, 6, 10), HAIR); pony.position.set(0, -.08, -.28); pony.rotation.x = .5; head.add(pony); root.userData.pony = pony;
    for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.035, .008, .01), std('#1a1410')); l.position.set(s * .1, .06, HR * .9); l.rotation.z = s * -.3; head.add(l); } }
  else { const side = new THREE.Mesh(new THREE.SphereGeometry(HR * 1.015, 24, 16, 0, TAU, 0, Math.PI * .52), std(C(hairC).lerp(C('#2a1a12'), .65).lerp(C(ch.skin), .3).getStyle(), { roughness: .95 })); side.rotation.x = -.15; head.add(side);
    if (!hatOn || hd[0] === 'cap') { for (let k = 0; k < 6; k++) { const a = -.65 + k * .32; const sp = new THREE.Mesh(new THREE.ConeGeometry(.045, .16 + Math.sin(k * 1.3) * .03 + (k > 1 && k < 4 ? .05 : 0), 6), HAIR); const r = HR * .98; sp.position.set(0, Math.cos(a) * r, Math.sin(a) * r); sp.rotation.x = a; head.add(sp); } }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.018, .005, 6, 12), std('#ffd23a', { metalness: 1, roughness: .2 })); ring.position.set(-HR - .005, -.05, .02); ring.rotation.y = Math.PI / 2; head.add(ring); }
  // headwear
  if (hd[0] === 'beanie') { const bm = hd[1] === 'rainbow' ? new THREE.MeshStandardMaterial({ map: patTex('rainbow'), roughness: .9 }) : std(hd[1], { roughness: .9 }); const bn = new THREE.Mesh(new THREE.SphereGeometry(HR * 1.1, 24, 14, 0, TAU, 0, Math.PI * .52), bm); bn.rotation.x = -.12; bn.position.y = .01; head.add(bn);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(HR * 1.05, .035, 8, 24), bm); rim.rotation.x = Math.PI / 2 - .12; rim.position.y = .02; head.add(rim); const pom = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 10), std('#ffffff', { roughness: 1 })); pom.position.set(0, HR * 1.12, -.03); head.add(pom); }
  else if (hd[0] === 'helmet') { const hm = new THREE.MeshPhysicalMaterial({ color: C(hd[1]), roughness: .2, clearcoat: 1, metalness: hd[1] === '#ffc21a' ? .6 : 0 }); const h = new THREE.Mesh(new THREE.SphereGeometry(HR * 1.16, 26, 16, 0, TAU, 0, Math.PI * .56), hm); h.rotation.x = -.18; h.position.y = .015; head.add(h);
    for (const s of [-1, 0, 1]) { const v = new THREE.Mesh(new THREE.BoxGeometry(.025, .02, .2), std('#333')); v.position.set(s * .07, HR * 1.13, -.02); head.add(v); } }
  else if (hd[0] === 'cap') { const cm = std(hd[1]); const c = new THREE.Mesh(new THREE.SphereGeometry(HR * 1.08, 22, 12, 0, TAU, 0, Math.PI * .5), cm); c.rotation.x = -.1; head.add(c); const v = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .02, 18, 1, false, 0, Math.PI), cm); v.position.set(0, .1, -.2); v.rotation.y = Math.PI / 2; head.add(v); }
  // eyewear
  if (ey[0] === 'gog') { const strap = new THREE.Mesh(new THREE.TorusGeometry(HR * 1.035, .016, 6, 28), std(ch.girl ? ja : '#16161e')); strap.rotation.x = Math.PI / 2 + .12; strap.position.y = .035; head.add(strap);
    const fr = new THREE.Mesh(new THREE.SphereGeometry(HR * 1.08, 24, 10, -.95 + Math.PI / 2, 1.9, Math.PI * .4, Math.PI * .2), std('#16161e', { side: THREE.DoubleSide })); fr.position.y = .015; head.add(fr);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(HR * 1.1, 24, 10, -.85 + Math.PI / 2, 1.7, Math.PI * .415, Math.PI * .17), new THREE.MeshPhysicalMaterial({ color: C(ey[1]), metalness: .9, roughness: .08, clearcoat: 1, iridescence: .6, emissive: C(ey[1]).multiplyScalar(.25), side: THREE.DoubleSide })); lens.position.y = .015; head.add(lens); }
  else if (ey[0] === 'sun' || ey[0] === 'heart') { const lm = new THREE.MeshPhysicalMaterial({ color: C(ey[1]), metalness: .6, roughness: .1, clearcoat: 1 });
    for (const s of [-1, 1]) { let l; if (ey[0] === 'heart') { const sh = new THREE.Shape(); sh.moveTo(0, -.04); sh.bezierCurveTo(-.07, .01, -.04, .06, 0, .03); sh.bezierCurveTo(.04, .06, .07, .01, 0, -.04); l = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .01, bevelEnabled: false }), lm); l.scale.setScalar(1.05); } else l = new THREE.Mesh(new THREE.CylinderGeometry(.052, .046, .012, 18).rotateX(Math.PI / 2), lm); l.position.set(s * .078, .035, HR * .96); head.add(l); }
    const br = new THREE.Mesh(new THREE.BoxGeometry(.06, .01, .01), std('#16161e')); br.position.set(0, .05, HR * .99); head.add(br); }
  // arms
  const arms = []; for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.set(s * .27, .52, 0); torso.add(a); const u = new THREE.Mesh(new THREE.CapsuleGeometry(.075, .42, 4, 10), J); u.position.y = -.24; a.add(u); const cf = new THREE.Mesh(new THREE.CylinderGeometry(.085, .085, .07, 12), JA); cf.position.y = -.43; a.add(cf); const gl = new THREE.Mesh(new THREE.SphereGeometry(.085, 12, 10), GLOVE); gl.scale.set(1, 1.1, .9); gl.position.y = -.52; a.add(gl); arms.push(a); }
  // legs
  const legs = []; for (const s of [-1, 1]) { const l = new THREE.Group(); l.position.set(s * .11, 0, 0); hips.add(l); const m = new THREE.Mesh(new THREE.CapsuleGeometry(.1, .5, 4, 10), PM); m.position.y = -.38; l.add(m); const bt = new THREE.Mesh(new THREE.BoxGeometry(.17, .16, .3), BOOT); bt.position.set(0, -.75, .04); l.add(bt); legs.push(l); }
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(.2, 14, 10), PM); pelvis.scale.set(1.15, .7, .9); hips.add(pelvis);
  // gear
  const gearG = new THREE.Group(); root.add(gearG); const gtex = gr[0] === 'rainbow' ? patTex('rainbow') : patTex('board', gr[0], gr[1]); const GM = new THREE.MeshPhysicalMaterial({ map: gtex, roughness: .3, clearcoat: .8 }), BASE = std('#16161e', { roughness: .4 });
  let poles = [];
  if (gear === 'board') { const sh = new THREE.Shape(); const L = .8, Wd = .15; sh.moveTo(-Wd, -L + .12); sh.lineTo(-Wd, L - .12); sh.quadraticCurveTo(-Wd, L, 0, L + .02); sh.quadraticCurveTo(Wd, L, Wd, L - .12); sh.lineTo(Wd, -L + .12); sh.quadraticCurveTo(Wd, -L, 0, -L - .02); sh.quadraticCurveTo(-Wd, -L, -Wd, -L + .12);
    const bg = new THREE.ExtrudeGeometry(sh, { depth: .035, bevelEnabled: true, bevelSize: .012, bevelThickness: .01, bevelSegments: 2, curveSegments: 10 }); bg.rotateX(-Math.PI / 2); const uv = bg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + Wd) / (2 * Wd), (uv.getY(i) + L) / (2 * L));
    const b = new THREE.Mesh(bg, [GM, BASE]); b.position.y = .02; b.castShadow = true; gearG.add(b); for (const s of [-1, 1]) { const bi = new THREE.Mesh(new THREE.BoxGeometry(.26, .07, .17), BASE); bi.position.set(0, .07, s * .25); gearG.add(bi); }
    body.rotation.y = Math.PI / 2; legs[0].position.x = -.2; legs[1].position.x = .2; }
  else { for (const s of [-1, 1]) { const sk = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(.11, .03, 1.65), GM); b.position.z = .05; sk.add(b); const tip = new THREE.Mesh(new THREE.BoxGeometry(.11, .03, .22), GM); tip.position.set(0, .05, .93); tip.rotation.x = -.45; sk.add(tip); const bi = new THREE.Mesh(new THREE.BoxGeometry(.13, .06, .28), BASE); bi.position.y = .04; sk.add(bi); sk.position.set(s * .13, .02, 0); sk.traverse(m => m.castShadow = true); gearG.add(sk); }
    for (const a of arms) { const pole = new THREE.Group(); const sh2 = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, 1.15, 6), std('#c8c8d8', { metalness: .8, roughness: .3 })); sh2.position.y = -.5; pole.add(sh2); const bk = new THREE.Mesh(new THREE.TorusGeometry(.05, .01, 4, 10), BASE); bk.rotation.x = Math.PI / 2; bk.position.y = -.98; pole.add(bk); pole.position.y = -.52; pole.rotation.x = .5; a.add(pole); poles.push(pole); } }
  root.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return { root, body, hips, torso, head, neck, arms, legs, gear: gearG, poles, board: gear === 'board', girl: ch.girl };
}
function poseRider(R, st, dt) { const k = Math.min(1, dt * 12); const bd = R.board;
  const crouch = st.crouch || 0, grab = st.grab ? 1 : 0, fall = st.fall || 0, t = st.t || 0;
  R.hips.position.y = lerp(R.hips.position.y, .86 - crouch * .2 - grab * .18, k);
  if (bd) { R.torso.rotation.x = lerp(R.torso.rotation.x, .15 + crouch * .25 + grab * .45, k); R.torso.rotation.z = lerp(R.torso.rotation.z, st.lean * .3, k); R.neck.rotation.y = lerp(R.neck.rotation.y, -1.2, k);
    R.arms[0].rotation.z = lerp(R.arms[0].rotation.z, fall ? -2.5 + Math.sin(t * 18) * .6 : grab ? -.4 : -1.05 + st.lean * .3, k); R.arms[1].rotation.z = lerp(R.arms[1].rotation.z, fall ? 2.5 + Math.cos(t * 17) * .6 : 1.05 + st.lean * .3, k);
    R.arms[0].rotation.x = lerp(R.arms[0].rotation.x, grab ? -1.1 : 0, k); R.arms[1].rotation.x = lerp(R.arms[1].rotation.x, 0, k);
    R.legs.forEach((l, i) => { l.rotation.z = lerp(l.rotation.z, (i ? -1 : 1) * (.12 + crouch * .2 + grab * .35), k); l.rotation.x = 0; }); }
  else { R.torso.rotation.x = lerp(R.torso.rotation.x, .35 + crouch * .3 + grab * .5, k); R.torso.rotation.z = lerp(R.torso.rotation.z, 0, k); R.neck.rotation.y = 0; R.neck.rotation.x = lerp(R.neck.rotation.x, -.3 - crouch * .2, k);
    R.arms.forEach((a, i) => { const s = i ? 1 : -1; a.rotation.x = lerp(a.rotation.x, fall ? -2.6 + Math.sin(t * 16 + i) * .8 : grab && i === 1 ? .9 : -.55 - crouch * .2, k); a.rotation.z = lerp(a.rotation.z, s * (fall ? 1.2 : .28 + Math.abs(st.lean) * .1), k); });
    R.legs.forEach((l, i) => { l.rotation.x = lerp(l.rotation.x, -.28 - crouch * .25 - grab * .7, k); l.rotation.z = lerp(l.rotation.z, (i ? -1 : 1) * (st.air ? .06 : .02), k); }); }
  if (R.root.userData.pony) R.root.userData.pony.rotation.x = .5 + Math.sin(t * 7) * .15 + (st.speed || 0) * .02;
}

/* ================= WORLD BUILD + SPAWNER ================= */
const MODES = { slalom: { n: T('מסלול שערים', 'Slalom'), ic: '🚩', sub: T('עוברים בין הדגלים', 'Pass the flags'), len: 1050 }, free: { n: T('גלישה חופשית', 'Free ride'), ic: '🏂', sub: T('בלי לחץ – רק כיף', 'No pressure – just fun') }, nofall: { n: T('אתגר: בלי ליפול', 'No-fall challenge'), ic: '💪', sub: T('נפילה אחת וזהו', 'One fall and you’re out') } };
let obs = [], spawnZ = 0, gateN = 0, rampN = 0, R = null, RS = null, mode = 'free', mi = 0, state = 'title';
function clearWorld() { for (const o of obs) release(o); obs = []; gates.forEach(g => { g.used = false; g.g.visible = false; }); ramps.forEach(r => { r.used = false; r.g.visible = false; }); finish.visible = false; glows.forEach(g => g.visible = false); }
function release(o) { if (o.P) unplace(o.P, o.i); if (o.gate) { o.gate.used = false; o.gate.g.visible = false; } if (o.ramp) { o.ramp.used = false; o.ramp.g.visible = false; } if (o.glow) o.glow.visible = false; }
function buildWorld(k, preview) { mi = k; M = MTS[k]; const r = rng(M.seed); PH1 = r() * 6; PH2 = r() * 6; clearWorld();
  skyU.a.value.set(M.sky[0]); skyU.b.value.set(M.sky[1]); skyU.sc.value.set(M.sun); skyU.sd.value.set(...M.sunDir).normalize(); skyU.night.value = M.night;
  scene.fog.color.set(M.fog); scene.fog.near = M.fogN; scene.fog.far = M.fogF; hemi.color.set(M.hemi[0]); hemi.groundColor.set(M.hemi[1]); hemi.intensity = M.hemi[2] * .72; sun.color.set(M.sun); sun.intensity = M.sunI * .85;
  P_LAMP.m.material.emissiveIntensity = M.night ? 2.2 : 0; flakes.material.opacity = M.night ? .9 : .7; setEnv(); buildPeaks(); updTerrain(0, true); spawnZ = 14; gateN = 0; rampN = 0; spawnUntil(260, preview); }
function spawnUntil(zMax, preview) { const len = mode === 'slalom' ? MODES.slalom.len : 1e9;
  while (spawnZ < zMax) { const z = spawnZ, c = cxAt(z), W2 = M.W / 2; spawnZ += 5;
    // forest outside the course (both sides)
    for (let s of [-1, 1]) { const n = Math.random() < .5 + M.trees * .3 ? 2 : 1; for (let q = 0; q < n; q++) { const x = c + s * (W2 + 2.5 + Math.pow(Math.random(), 1.6) * 30), zz = z + rnd(0, 5); const sz = rnd(.8, 1.5); const i = place(P_TREE, x, hAt(x, zz) - .2, zz, sz, rnd(0, 6)); if (i >= 0) obs.push({ P: P_TREE, i, x, z: zz, r: .9 * sz, hgt: 6, deco: Math.abs(x - c) > W2 + 1 }); } }
    if (M.night && Math.floor(z) % 40 === 14) for (const s of [-1, 1]) { const x = c + s * (W2 + 1.5); const i = place(P_LAMP, x, hAt(x, z), z, 1, 0); const gl = glows.find(g => !g.visible); if (gl) { gl.visible = true; gl.position.set(x, hAt(x, z) + 4.1, z); } obs.push({ P: P_LAMP, i, x, z, r: .3, hgt: 4, deco: true, glow: gl }); }
    if (preview || z < 40 || z > len - 30) { if (mode === 'slalom' && z > len - 6 && z <= len - 1 && !finish.visible) { finish.visible = true; finish.position.set(cxAt(len), hAt(cxAt(len), len), len); } continue; }
    const prog = mode === 'nofall' ? Math.min(1, z / 2500) : 0;
    if (mode === 'slalom') { if (z % 40 < 5 && z > 50) { const G = gates.find(g => !g.used); if (G) { G.used = true; const side = gateN % 2 ? 1 : -1; const gx = c + side * (W2 * .35); G.g.visible = true; G.g.position.set(gx, hAt(gx, z) - .1, z); G.g.rotation.y = 0; setGateCol(G, side > 0 ? 'b' : 'r'); obs.push({ gate: G, x: gx, z, r: 0, hgt: 0, deco: true, kind: 'gate', side }); gateN++; } }
      else if (Math.random() < .07 * M.obs) addObstacle(z, c, W2, true); continue; }
    // free / nofall
    const rampEvery = mode === 'free' ? 75 / M.ramp : 110 / M.ramp;
    if (z - rampN > rampEvery && Math.random() < .5) { const Rp = ramps.find(r2 => !r2.used); if (Rp) { rampN = z; Rp.used = true; const x = c + rnd(-W2 * .45, W2 * .45); Rp.g.visible = true; Rp.g.position.set(x, hAt(x, z), z); obs.push({ ramp: Rp, x, z, r: 0, hgt: 0, kind: 'ramp' });
        for (let q = 0; q < 4; q++) { const zz = z + 12 + q * 3.2; const i = place(P_GEM, x, hAt(x, zz) + 3.2 + Math.sin(q / 3 * Math.PI) * 1.8, zz, 1); if (i >= 0) obs.push({ P: P_GEM, i, x, z: zz, kind: 'gem', y: hAt(x, zz) + 3.2 + Math.sin(q / 3 * Math.PI) * 1.8 }); } continue; } }
    if (Math.random() < .12) { const off = rnd(-W2 * .6, W2 * .6); for (let q = 0; q < 5; q++) { const zz = z + q * 3; const x = cxAt(zz) + off + Math.sin(q * .8) * 1.5; const i = place(P_GEM, x, hAt(x, zz) + 1, zz, 1); if (i >= 0) obs.push({ P: P_GEM, i, x, z: zz, kind: 'gem', y: hAt(x, zz) + 1 }); } spawnZ += 12; continue; }
    if (Math.random() < (mode === 'nofall' ? .16 + prog * .22 : .13) * M.obs) addObstacle(z, c, W2, false);
  } }
function addObstacle(z, c, W2, slalom) { const roll = Math.random(); const x = c + rnd(-W2 * .8, W2 * .8);
  if (slalom) { // keep the gate line clear
    if (Math.abs(x - c) < W2 * .55) return; }
  if (roll < .45) { const s = rnd(.7, 1.1); const i = place(P_TREE, x, hAt(x, z) - .2, z, s, rnd(0, 6)); if (i >= 0) obs.push({ P: P_TREE, i, x, z, r: .85 * s, hgt: 6, kind: 'tree' }); }
  else if (roll < .78) { const s = rnd(.55, 1); const i = place(P_ROCK, x, hAt(x, z) - .1, z, s, rnd(0, 6)); if (i >= 0) obs.push({ P: P_ROCK, i, x, z, r: .95 * s, hgt: .75 * s, kind: 'rock' }); }
  else { const i = place(P_SNOW, x, hAt(x, z) - .1, z, 1, rnd(-.6, .6) + Math.PI); if (i >= 0) obs.push({ P: P_SNOW, i, x, z, r: .75, hgt: 3, kind: 'snowman' }); } }
function cullBehind(z) { obs = obs.filter(o => { if (o.z < z - 25) { release(o); return false; } return true; }); }

/* ================= RIDER STATE ================= */
let rider = null;
function makeRider(preview) { if (rider) scene.remove(rider.root); rider = buildRider(S.who, S.out[S.who], S.gear); scene.add(rider.root); return rider; }
function resetRS() { RS = { x: cxAt(6), z: 6, y: hAt(cxAt(6), 6), yaw: 0, v: 8, vy: 0, gv: 0, air: false, spin: 0, flip: 0, spinV: 0, flipV: 0, grabT: 0, airT: 0, lean: 0, crash: 0, inv: 0, score: 0, gems: 0, combo: 0, comboT: 0, time: 0, gates: 0, missed: 0, best: '', bestP: 0, ramp: null, crouch: 0, fin: 0, dist: 0, falls: 0, tricks: 0, onRamp: null }; }

/* ================= INPUT ================= */
const inp = { l: 0, r: 0, jump: 0, flip: 0, grab: 0 }; const keys = {};
addEventListener('keydown', e => { keys[e.code] = 1; if (e.code === 'Space') { e.preventDefault(); doJump(); } if (e.code === 'Escape' || e.code === 'KeyP') pause(); });
addEventListener('keyup', e => { keys[e.code] = 0; });
function zone(id, k) { const el = $(id); const on = e => { e.preventDefault(); A.ac(); inp[k] = 1; el.classList.add('on'); }; const off = () => { inp[k] = 0; el.classList.remove('on'); }; el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off); }
// in RTL the flex order flips: make sure the LEFT half of the screen always steers left
$('zones').style.direction = 'ltr'; zone('zL', 'l'); zone('zR', 'r');
function hold(id, k, tap) { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); A.ac(); inp[k] = 1; b.classList.add('on'); tap && tap(); }); const off = () => { inp[k] = 0; b.classList.remove('on'); }; b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off); }
hold('bJump', 'jump', () => doJump()); hold('bFlip', 'flip'); hold('bGrab', 'grab');
// camera looks down +z, so screen-right is world -x: pressing right must lower x
const steerIn = () => (inp.l || keys.ArrowLeft || keys.KeyA ? 1 : 0) - (inp.r || keys.ArrowRight || keys.KeyD ? 1 : 0);
const flipIn = () => inp.flip || keys.ArrowUp || keys.KeyW;
const grabIn = () => inp.grab || keys.ArrowDown || keys.KeyS;

/* ================= PHYSICS ================= */
const G = 17;
function doJump() { if (state !== 'play' || !RS || RS.air || RS.crash > 0) return; launch(6.6 + RS.v * .04); A.tone(520, .12, 'triangle', .06, 0, 820); }
function launch(vy) { RS.air = true; RS.vy = vy; RS.airT = 0; RS.spin0 = RS.spin; RS.flip0 = RS.flip; RS.grabT = 0; RS.spinTot = 0; RS.flipTot = 0; RS.onRamp = null; if (vy > 5) { document.body.classList.add('air'); A.noise(.25, 'highpass', 2500, 1, .06); } }
const nearest = (a, step) => Math.round(a / step) * step;
function step(dt) { const s = RS; const st = s.crash > 0 ? 0 : steerIn(); s.time += dt;
  if (s.crash > 0) { s.crash -= dt; s.v *= Math.pow(.25, dt); s.x += Math.sin(s.yaw) * s.v * dt; s.z += Math.cos(s.yaw) * s.v * dt; s.y = hAt(s.x, s.z); if (s.crash <= 0) { s.inv = 1.6; s.spin = nearest(s.spin, TAU); s.flip = 0; s.yaw = 0; s.v = Math.max(s.v, 7); } return; }
  if (s.inv > 0) s.inv -= dt;
  if (!s.air) {
    s.yaw += st * 2.3 * dt; s.yaw -= s.yaw * (st ? .2 : 1.1) * dt; s.yaw = clamp(s.yaw, -1.2, 1.2);
    const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw); const slope = hAt(s.x + fx, s.z + fz) - hAt(s.x, s.z);
    let a = -slope * G * .95 - s.v * s.v * .0062 - Math.abs(st) * s.v * .07 - .3; s.v = clamp(s.v + a * dt, 5, M.vMax * (mode === 'nofall' ? 1 + Math.min(.35, s.z / 6000) : 1));
    s.x += fx * s.v * dt; s.z += fz * s.v * dt;
    const c = cxAt(s.z), lim = M.W / 2 + 2.5; if (Math.abs(s.x - c) > lim) { const sg = Math.sign(s.x - c); s.x = c + sg * lim; s.yaw = lerp(s.yaw, -sg * .5, dt * 4); s.v *= Math.pow(.6, dt); }
    let gy = hAt(s.x, s.z);
    // ramps
    let onR = null; for (const o of obs) if (o.kind === 'ramp' && s.z > o.z - .2 && s.z < o.z + 7.6 && Math.abs(s.x - o.x) < 2.8) { onR = o; break; }
    if (onR) { const t = clamp((s.z - onR.z) / 7, 0, 1); gy = hAt(onR.x, onR.z) + (onR.ramp.g.position.y - hAt(onR.x, onR.z)) + 1.7 * t * t; s.onRamp = onR; if (t >= .999) { s.y = gy; launch(5.5 + s.v * .33); A.voice('wow', 1.4); return; } }
    else if (s.onRamp) { const o = s.onRamp; s.onRamp = null; if (s.z >= o.z + 6.5) { launch(5.5 + s.v * .33); return; } }
    const ngv = (gy - s.y) / Math.max(dt, .001); if (!onR && ngv < s.gv - G * dt * 3.4 && s.v > 16 && s.gv > -s.v) { launch(s.gv * .9); return; } s.gv = ngv; s.y = gy;
    s.lean = lerp(s.lean, st * (.35 + s.v * .012), dt * 6); s.crouch = lerp(s.crouch, Math.abs(st) * .4 + Math.min(1, s.v / 30) * .3, dt * 4);
    s.spin = lerp(s.spin, nearest(s.spin, S.gear === 'board' ? Math.PI : TAU), dt * 10); s.flip = lerp(s.flip, 0, dt * 10);
    // spray + tracks
    if (s.v > 8 && Math.random() < .5 + Math.abs(st) * .4) { const side = st || (Math.random() - .5); FX.emit(V3(s.x - fx * .6 + fz * side * .4, s.y + .1, s.z - fz * .6 - fx * side * .4), V3(fz * side * 2.5 - fx * 2, 1 + Math.abs(st) * 2 + Math.random(), -fx * side * 2.5 - fz * 2), [.95, .97, 1], .12 + Math.abs(st) * .06, .45, 7, .65); }
    track(s); A.loop('carve') && (A.loop('carve').g.gain.value = Math.min(.09, Math.abs(st) * s.v * .004 + s.v * .0012));
  } else {
    s.airT += dt; if (s.airT > .14) document.body.classList.add('air'); s.vy -= G * dt; s.y += s.vy * dt; s.x += Math.sin(s.yaw) * s.v * dt; s.z += Math.cos(s.yaw) * s.v * dt; s.v = Math.max(5, s.v - s.v * s.v * .002 * dt);
    const gy = hAt(s.x, s.z); const tl = s.vy < 0 ? (s.y - gy) / Math.max(1, -s.vy) : 9;
    const spinning = st !== 0, flipping = flipIn();
    s.spinV = spinning ? st * 7.2 : lerp(s.spinV, 0, dt * 10); s.flipV = flipping ? -7.4 : lerp(s.flipV, 0, dt * 10);
    s.spin += s.spinV * dt; s.flip += s.flipV * dt; s.spinTot += Math.abs(s.spinV * dt); s.flipTot += Math.abs(s.flipV * dt);
    if (grabIn()) s.grabT += dt;
    if (tl < .45 && !spinning && !flipping) { const tsp = nearest(s.spin, S.gear === 'board' ? Math.PI : TAU), tfl = nearest(s.flip, TAU); s.spin = lerp(s.spin, tsp, dt * 7); s.flip = lerp(s.flip, tfl, dt * 7); }
    s.lean = lerp(s.lean, 0, dt * 4); s.crouch = lerp(s.crouch, grabIn() ? 1 : .55, dt * 6);
    if (s.y <= gy && s.vy < 0) land(gy);
  }
  s.dist = Math.max(s.dist, s.z);
  collide(); }
function land(gy) { const s = RS; s.air = false; s.y = gy; s.gv = 0; document.body.classList.remove('air'); const spinStep = S.gear === 'board' ? Math.PI : TAU;
  const es = Math.abs(s.spin - nearest(s.spin, spinStep)), ef = Math.abs(s.flip - nearest(s.flip, TAU));
  for (let q = 0; q < 18; q++) FX.emit(V3(s.x + rnd(-.8, .8), gy + .15, s.z + rnd(-.8, .8)), V3(rnd(-3, 3), rnd(1.5, 4.5), rnd(-3, 3)), [.95, .97, 1], .17, .7, 9, .7);
  if (es > 1.15 || ef > 1.05) { crash(T('נחיתה עקומה!', 'Bad landing!')); return; }
  s.spin = nearest(s.spin, spinStep); s.flip = nearest(s.flip, TAU); s.crouch = 1; A.noise(.18, 'lowpass', 600, 1, .14); buzz(20);
  const spins = Math.round(s.spinTot / Math.PI), flips = Math.round(s.flipTot / TAU), grab = s.grabT > .3; let pts = 0; const parts = [];
  if (flips) { parts.push((flips > 1 ? (flips === 2 ? 'DOUBLE ' : 'TRIPLE ') : '') + 'BACKFLIP'); pts += flips * 320; }
  if (spins) { parts.push(spins * 180 + ''); pts += spins * 90; }
  if (grab) { parts.push('GRAB'); pts += Math.round(s.grabT * 160); }
  if (s.airT > 1.1) { pts += Math.round(s.airT * 50); if (!parts.length) parts.push('BIG AIR'); }
  if (pts) { s.combo = s.comboT > 0 ? Math.min(5, s.combo + 1) : 1; s.comboT = 4; pts *= s.combo; s.score += pts; s.tricks++; if (pts > s.bestP) { s.bestP = pts; s.best = parts.join(' + '); }
    trickTxt(`${parts.join(' + ')}<small>+${pts}${s.combo > 1 ? '  ×' + s.combo : ''}</small>`); A.tone(880, .1, 'triangle', .07); A.tone(1320, .14, 'triangle', .06, .08); if (flips || spins >= 2) A.voice('yay', S.who ? 1.5 : 1.1); }
  else if (s.airT > .5) A.tone(660, .08, 'triangle', .04); }
function crash(msg) { const s = RS; if (s.crash > 0 || s.inv > 0) return; s.crash = 1.3; s.air = false; s.combo = 0; s.falls++; document.body.classList.remove('air'); trickTxt(msg, true); A.noise(.7, 'lowpass', 420, 1, .32); A.voice('aww', S.who ? 1.45 : 1.05); buzz([70, 40, 70]); shake = .7;
  for (let q = 0; q < 40; q++) FX.emit(V3(s.x + rnd(-1, 1), s.y + .4, s.z + rnd(-1, 1)), V3(rnd(-4, 4), rnd(2, 7), rnd(-1, 5)), [.95, .97, 1], .2, 1, 10, .8);
  if (mode === 'nofall') setTimeout(() => endRun(), 1300); }
function collide() { const s = RS; if (s.crash > 0) return;
  for (const o of obs) { const dz = o.z - s.z; if (dz < -3 || dz > 3) continue;
    if (o.kind === 'gem') { if ((o.x - s.x) ** 2 + dz * dz < 2.6 && Math.abs(o.y - (s.y + .9)) < 1.8) { unplace(o.P, o.i); o.P = null; o.kind = 'x'; s.gems++; s.score += 25; A.tone(1500 + (s.gems % 6) * 110, .1, 'triangle', .06); A.tone(2200, .08, 'sine', .04, .05); FX.burst(V3(o.x, o.y, o.z), 8, [[1.2, 2.6, 3]], 3, .12, .5, 3); } continue; }
    if (o.kind === 'gate' && !o.done && dz < 0) { o.done = true; const ok = Math.abs(s.x - o.x) < 3.6; if (ok) { s.gates++; A.tone(1046, .1, 'triangle', .07); A.tone(1568, .12, 'triangle', .05, .07); gmsg('✔', '#7aff8a'); } else { s.missed++; s.time += 3; A.tone(220, .25, 'sawtooth', .05); gmsg(T('פספסת שער +3 שנ׳', 'Missed gate +3s'), '#ff8a7a'); } continue; }
    if (!o.r || o.deco || s.inv > 0) continue;
    const d2 = (o.x - s.x) ** 2 + dz * dz; if (d2 < (o.r + .45) ** 2 && s.y - hAt(o.x, o.z) < o.hgt) { crash(o.kind === 'snowman' ? T('בום! איש שלג ☃️', 'Boom! Snowman ☃️') : o.kind === 'rock' ? T('אאוץ׳! סלע', 'Ouch! A rock') : T('אאוץ׳! עץ', 'Ouch! A tree')); return; } } }
// ski / board tracks in the snow
const TRK = 260, trkMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#8aa8d8', transparent: true, opacity: .28, depthWrite: false }), TRK); trkMesh.frustumCulled = false; scene.add(trkMesh); let trkI = 0, trkZ = 0;
function clearTracks() { _m.makeScale(0, 0, 0); for (let i = 0; i < TRK; i++) trkMesh.setMatrixAt(i, _m); trkMesh.instanceMatrix.needsUpdate = true; }
clearTracks();
function track(s) { if (s.z - trkZ < .45) return; trkZ = s.z; const w = S.gear === 'board' ? .34 : .1; const off = S.gear === 'board' ? [0] : [-.13, .13];
  for (const o of off) { const x = s.x + Math.cos(s.yaw) * o, z = s.z - Math.sin(s.yaw) * o; _q.setFromEuler(_e.set(0, s.yaw, 0)); _m.compose(_p.set(x, hAt(x, z) + .03, z), _q, _s.set(w, 1, .7)); trkMesh.setMatrixAt(trkI, _m); trkI = (trkI + 1) % TRK; } trkMesh.instanceMatrix.needsUpdate = true; }

/* ================= CAMERA ================= */
let shake = 0; const camP = V3(), camL = V3(); let camYaw = 0;
function camUpdate(dt, snap) { const s = RS; if (camLock) { sky.position.copy(camera.position); peaks.position.set(camera.position.x, camera.position.y * .9, camera.position.z); return; } camYaw = lerp(camYaw, s.yaw * .55, Math.min(1, dt * 2.5)); const back = s.air ? 6.4 : 5.4, up = s.air ? 3.2 : 2.7;
  const tx = s.x - Math.sin(camYaw) * back, tz = s.z - Math.cos(camYaw) * back, ty = Math.max(s.y, hAt(s.x, s.z)) + up + Math.max(0, hAt(tx, tz) - (s.y - 1.5)) * .5;
  if (snap) camP.set(tx, ty, tz); else { camP.x = lerp(camP.x, tx, Math.min(1, dt * 6)); camP.z = lerp(camP.z, tz, Math.min(1, dt * 8)); camP.y = lerp(camP.y, ty, Math.min(1, dt * (s.air ? 3 : 6))); }
  camL.set(s.x + Math.sin(camYaw) * 7, s.y + .9 - 1.2, s.z + Math.cos(camYaw) * 7);
  camera.position.copy(camP); if (shake > 0) { shake -= dt; camera.position.x += rnd(-.15, .15) * shake; camera.position.y += rnd(-.15, .15) * shake; } camera.lookAt(camL);
  camera.fov = lerp(camera.fov, 58 + Math.min(14, s.v * .4), dt * 2); camera.updateProjectionMatrix();
  sun.position.set(s.x + M.sunDir[0] * 40, s.y + M.sunDir[1] * 40 + 10, s.z + M.sunDir[2] * 40); sun.target.position.set(s.x, s.y, s.z + 4);
  sky.position.copy(camera.position); peaks.position.set(camera.position.x, camera.position.y * .9, camera.position.z); }
function poseWorld(dt) { const s = RS, r = rider; r.root.position.set(s.x, s.y, s.z); const crashing = s.crash > 0;
  const tilt = s.air ? 0 : Math.atan2(hAt(s.x, s.z - 1) - hAt(s.x, s.z + 1), 2) * .9;
  r.root.rotation.set(0, 0, 0); r.root.rotateY(s.yaw + s.spin); r.root.rotateX(-tilt + s.flip + (crashing ? Math.sin(s.crash * 9) * .9 : 0)); r.root.rotateZ(-s.lean + (crashing ? Math.PI * .45 * Math.min(1, (1.3 - s.crash) * 3) : 0));
  if (crashing) r.root.position.y -= .25; r.root.visible = !(s.inv > 0 && Math.floor(s.inv * 10) % 2);
  poseRider(r, { lean: s.lean, crouch: s.crouch, grab: s.air && grabIn(), air: s.air, fall: crashing, t: performance.now() / 1000, speed: s.v }, dt); }

/* ================= HUD + FLOW ================= */
const fmt = t => { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };
function trickTxt(h, bad) { const d = document.createElement('div'); d.innerHTML = h; if (bad) d.className = 'bad'; $('trick').innerHTML = ''; $('trick').appendChild(d); }
let gmT = 0; function gmsg(t, col) { const g = $('gmsg'); g.textContent = t; g.style.color = col || '#fff'; gmT = 1.1; }
function hud() { const s = RS; $('spdTxt').textContent = Math.round(s.v * 3.3);
  if (mode === 'slalom') { $('h1').textContent = fmt(s.time); $('h1s').textContent = T('זמן', 'time'); $('h2').textContent = `${s.gates}/${Math.max(gateN, 1)}`; $('h2s').textContent = T('שערים', 'gates'); $('prog').firstChild.style.width = clamp(s.z / MODES.slalom.len, 0, 1) * 100 + '%'; }
  else { $('h1').textContent = s.score; $('h1s').textContent = T('נקודות', 'points'); $('h2').textContent = Math.floor(s.z) + 'm'; $('h2s').textContent = mode === 'nofall' ? `${T('שיא', 'best')}: ${S.best[mi + mode] || 0}` : `❄️ ${s.gems}`; } }
function setupRun(preview) { mode = preview ? 'free' : S.mode; resetRS(); buildWorld(S.mt, preview); makeRider(); trkZ = 0; trkI = 0; clearTracks(); camYaw = 0; RS.yaw = 0; camUpdate(0, true); poseWorld(.1); }
let cdT = 0;
function start() { A.ac(); $('loading').hidden = false; setTimeout(() => { setupRun(false); $('loading').hidden = true; $('title').hidden = true; $('wardS').hidden = true; document.body.classList.remove('ward');
  $('hud').hidden = $('spd').hidden = $('zones').hidden = false; $('bJump').hidden = $('bFlip').hidden = $('bGrab').hidden = false; $('prog').hidden = mode !== 'slalom'; $('endSheet').hidden = true; $('trick').innerHTML = '';
  state = 'count'; cdT = 3.2; hud(); A.loopOn('wind', 'bandpass', 700, .6, .03, .15); A.loopOn('carve', 'highpass', 2800, .8, .0); A.startMusic({ chords: M.night ? [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 43, 47]] : [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]], bpm: 112, lead: true, kick: true, vol: .8 });
  if (!S.tut) { S.tut = 1; S.save(); setTimeout(() => toast(isTouch ? T('גע בצד שמאל/ימין כדי לפנות • ⤴ קפיצה • באוויר: החזיקו צד = סיבוב, 🔄 = סלטה, ✋ = גראב', 'Touch left/right to turn • ⤴ jump • In the air: hold a side = spin, 🔄 = flip, ✋ = grab') : T('חיצים לפנייה • רווח לקפיצה • באוויר: ←/→ סיבוב, ↑ סלטה, ↓ גראב', 'Arrows to turn • Space to jump • In the air: ←/→ spin, ↑ flip, ↓ grab'), 6000), 3400); } }, 30); }
function cdTick(dt) { const b = Math.ceil(cdT); cdT -= dt; const a = Math.ceil(cdT); if (a !== b && a >= 0 && a <= 3) { $('cd').innerHTML = `<b>${a > 0 ? a : 'GO!'}</b>`; A.tone(a > 0 ? 440 : 880, a > 0 ? .15 : .4, 'square', .06); } if (cdT <= 0) { state = 'play'; setTimeout(() => $('cd').innerHTML = '', 700); } }
function endRun() { if (state === 'done') return; state = 'done'; A.loopOff('wind'); A.loopOff('carve'); A.stopMusic(); const s = RS; const key = mi + mode; let st = 0, rows = [], title = '', emo = '';
  if (mode === 'slalom') { const total = s.time; const par = MODES.slalom.len / (M.vMax * .62); st = s.missed === 0 && total < par * 1.12 ? 3 : s.missed <= 2 ? 2 : 1; if ((S.stars[mi] || 0) < st) S.stars[mi] = st; const nb = !S.best[key] || total < S.best[key]; if (nb) S.best[key] = +total.toFixed(1);
    title = T('הגעתם לסיום!', 'Finished!'); emo = '🏁'; rows = [[T('זמן', 'Time'), fmt(total)], [T('שערים', 'Gates'), `${s.gates}/${gateN}`], [T('שיא', 'Best'), fmt(S.best[key]) + (nb ? ' 🆕' : '')], [T('טריקים', 'Tricks'), s.score]]; }
  else if (mode === 'nofall') { const sc = Math.floor(s.z) + s.score; const nb = sc > (S.best[key] || 0); if (nb) S.best[key] = sc; st = sc > 3000 ? 3 : sc > 1500 ? 2 : sc > 600 ? 1 : 0; title = nb ? T('שיא חדש! 🎉', 'New record! 🎉') : T('נפלתם!', 'Wipeout!'); emo = nb ? '🏆' : '😵';
    rows = [[T('מרחק', 'Distance'), Math.floor(s.z) + 'm'], [T('נקודות טריקים', 'Trick points'), s.score], [T('סה״כ', 'Total'), sc], [T('שיא', 'Best'), S.best[key]]]; }
  else { const sc = s.score; if (sc > (S.best[key] || 0)) S.best[key] = sc; st = sc > 4000 ? 3 : sc > 1800 ? 2 : sc > 500 ? 1 : 0; title = T('איזו גלישה!', 'What a ride!'); emo = '🏂'; rows = [[T('נקודות', 'Points'), sc], [T('מרחק', 'Distance'), Math.floor(s.z) + 'm'], [T('קריסטלים', 'Crystals'), s.gems], [T('הטריק הכי טוב', 'Best trick'), s.best || '—']]; }
  S.save(); $('eE').textContent = emo; $('eT').textContent = title; $('eStars').querySelectorAll('i').forEach((e, i) => { e.className = i < st ? 'on' : ''; e.style.animationDelay = i * .2 + 's'; });
  $('eRes').innerHTML = rows.map(r => `<li><span>${r[0]}</span><b>${r[1]}</b></li>`).join(''); setTimeout(() => { $('endSheet').hidden = false; if (st >= 2) { A.voice('yay', S.who ? 1.5 : 1.1); FX.burst(V3(RS.x, RS.y + 2, RS.z + 3), 60, [[2.4, .6, 1], [.4, 1.6, 2.6], [2.6, 2.2, .4]], 6, .14, 2, 5); } }, 600); }
function pause() { if (state !== 'play' && state !== 'count') return; state = 'pause'; $('pauseSheet').hidden = false; A.loopOff('wind'); A.loopOff('carve'); A.stopMusic(); }
function resume() { $('pauseSheet').hidden = true; state = cdT > 0 ? 'count' : 'play'; A.loopOn('wind', 'bandpass', 700, .6, .03, .15); A.loopOn('carve', 'highpass', 2800, .8, .0); A.startMusic(); }
$('pauseBtn').onclick = () => pause(); $('pGo').onclick = () => resume(); $('pMenu').onclick = () => { if (mode === 'free' && RS && RS.score > 0) { $('pauseSheet').hidden = true; endRun(); } else showTitle(); };
$('eMenu').onclick = () => showTitle(); $('eAgain').onclick = () => start();

/* ================= TITLE / WARDROBE ================= */
let tAng = 0, camLock = false;
function renderTitle() {
  $('who').innerHTML = CHARS.map((c, k) => `<button class="${S.who === k ? 'on' : ''}" data-k="${k}">${k ? '👩‍🎤' : '🧑‍🎤'} ${c.n}</button>`).join('') + `<button class="wd" id="wdBtn">👕 ${T('בגדים', 'Outfit')}</button>`;
  $('gearSeg').innerHTML = [['ski', '⛷️', T('סקי', 'Skis')], ['board', '🏂', T('סנובורד', 'Snowboard')]].map(g => `<button class="${S.gear === g[0] ? 'on' : ''}" data-g="${g[0]}"><span>${g[1]}</span>${g[2]}</button>`).join('');
  $('modeSeg').innerHTML = Object.entries(MODES).map(([k, m]) => `<button class="${S.mode === k ? 'on' : ''}" data-m="${k}"><span>${m.ic}</span>${m.n}<small>${m.sub}</small></button>`).join('');
  $('mts').innerHTML = MTS.map((m, k) => { const b = S.best[k + S.mode]; const sub = S.mode === 'slalom' ? '★'.repeat(S.stars[k] || 0) + '☆'.repeat(3 - (S.stars[k] || 0)) : b ? '🏆 ' + b : ''; return `<button class="${S.mt === k ? 'on' : ''}" data-k="${k}"><i>${m.ic}</i>${m.n}<small>${sub || '&nbsp;'}</small></button>`; }).join('');
  $('tHint').textContent = S.mode === 'slalom' ? T('עוברים בין כל זוג דגלים – שער שפספסתם = 3 שניות קנס', 'Ski between every pair of flags – a missed gate costs 3 seconds') : S.mode === 'nofall' ? T('כמה רחוק תגיעו בלי ליפול? המהירות עולה ככל שמתקדמים', 'How far can you go without falling? Speed rises as you go') : T('קופצים מרמפות, עושים סלטות וסיבובים ואוספים קריסטלים ❄️', 'Hit ramps, do flips and spins and collect crystals ❄️');
  $('goBtn').textContent = T('▶ יוצאים לגלוש!', '▶ Let’s ride!');
  $('who').querySelectorAll('[data-k]').forEach(b => b.onclick = () => { S.who = +b.dataset.k; S.save(); A.ac(); A.tone(700, .06, 'triangle', .05); previewRider(); renderTitle(); });
  $('wdBtn').onclick = () => openWard();
  $('gearSeg').querySelectorAll('button').forEach(b => b.onclick = () => { S.gear = b.dataset.g; S.save(); A.tone(760, .06, 'triangle', .05); previewRider(); renderTitle(); });
  $('modeSeg').querySelectorAll('button').forEach(b => b.onclick = () => { S.mode = b.dataset.m; S.save(); A.tone(820, .06, 'triangle', .05); renderTitle(); });
  $('mts').querySelectorAll('button').forEach(b => b.onclick = () => { S.mt = +b.dataset.k; S.save(); A.tone(900, .06, 'triangle', .05); setupPreview(); renderTitle(); }); }
function setupPreview() { mode = 'free'; resetRS(); RS.z = 30; RS.x = cxAt(30); buildWorld(S.mt, true); RS.y = hAt(RS.x, RS.z); previewRider(); }
function previewRider() { makeRider(); RS.y = hAt(RS.x, RS.z); poseWorld(1); }
const WTABS = [['jacket', '🧥', T('מעיל', 'Jacket')], ['pants', '👖', T('מכנסיים', 'Pants')], ['head', '🧢', T('ראש', 'Head')], ['eyes', '🥽', T('משקפיים', 'Goggles')], ['hair', '💇', T('שיער', 'Hair')], ['gear', '🎨', T('עיצוב ציוד', 'Gear art')]];
let wTab = 'jacket';
function openWard() { A.ac(); $('wardS').hidden = false; document.body.classList.add('ward'); renderWard(); }
function renderWard() { const o = S.out[S.who]; $('wT').textContent = `👕 ${T('הארון של', 'Closet:')} ${CHARS[S.who].n}`;
  $('wtabs').innerHTML = WTABS.map(t => `<button class="${wTab === t[0] ? 'on' : ''}" data-t="${t[0]}">${t[1]} ${t[2]}</button>`).join('');
  const sw = (bg, ic) => `<span class="sw" style="background:${bg}">${ic || ''}</span>`;
  let items = [];
  if (wTab === 'jacket') items = JACKETS.map(j => [sw(`linear-gradient(135deg,${j[0]} 55%,${j[1]} 55%)`), j[2]]);
  if (wTab === 'pants') items = PANTS.map(p => [sw(p[0] === 'tartan' ? 'repeating-linear-gradient(0deg,#b8101a 0 6px,#5a0a0e 6px 9px),#b8101a' : p[0]), p[1]]);
  if (wTab === 'head') items = HEADS.map(h => [sw(h[1] === 'rainbow' ? 'linear-gradient(#ff3a3a,#ffe14a,#3ad86a,#2a8aff,#9a3aff)' : h[1] || 'rgba(255,255,255,.15)', h[3]), h[2]]);
  if (wTab === 'eyes') items = EYES.map(e => [sw(e[1] || 'rgba(255,255,255,.15)', e[3]), e[2]]);
  if (wTab === 'hair') items = HAIRS.map(h => [sw(h[0][S.who ? 1 : 0]), h[1].split(' / ')[S.who ? 1 : 0]]);
  if (wTab === 'gear') items = GEARS.map(g => [sw(g[0] === 'rainbow' ? 'linear-gradient(90deg,#ff3a3a,#ffe14a,#3ad86a,#2a8aff,#9a3aff)' : `linear-gradient(90deg,${g[0]},${g[1]},${g[0]})`), g[2]]);
  $('wgrid').innerHTML = items.map((it, k) => `<button class="${o[wTab] === k ? 'on' : ''}" data-k="${k}">${it[0]}${it[1]}</button>`).join('');
  $('wtabs').querySelectorAll('button').forEach(b => b.onclick = () => { wTab = b.dataset.t; renderWard(); });
  $('wgrid').querySelectorAll('button').forEach(b => b.onclick = () => { o[wTab] = +b.dataset.k; S.save(); A.tone(880 + Math.random() * 200, .06, 'triangle', .05); previewRider(); renderWard(); }); }
$('wX').onclick = () => { $('wardS').hidden = true; document.body.classList.remove('ward'); A.tone(990, .08, 'triangle', .05); };
function showTitle() { state = 'title'; A.loopOff('wind'); A.loopOff('carve'); A.stopMusic(); $('title').hidden = false; $('hud').hidden = $('spd').hidden = $('zones').hidden = $('prog').hidden = true; $('bJump').hidden = $('bFlip').hidden = $('bGrab').hidden = true; $('endSheet').hidden = $('pauseSheet').hidden = true; $('trick').innerHTML = ''; document.body.classList.remove('air'); setupPreview(); renderTitle(); }
$('goBtn').onclick = () => start();
$('helpBtn').textContent = '❓ ' + T('איך משחקים', 'How to play'); $('hT').textContent = T('איך גולשים', 'How to ride'); $('hX').textContent = T('יאללה לגלוש!', 'Let’s ride!');
$('hB').innerHTML = T(`🏔️ <b>גולשים לבד במורד ההר</b> – אין גז ואין ברקס, ההר עושה את העבודה.<br>👆 <b>פנייה:</b> לוחצים ומחזיקים בצד שמאל או ימין של המסך.<br>⤴ <b>קפיצה:</b> הכפתור הירוק. רמפות כחולות מעיפות גבוה!<br>🌀 <b>באוויר:</b> מחזיקים צד = סיבוב 360°, 🔄 = סלטה אחורה, ✋ = גראב.<br>🛬 <b>נחיתה:</b> צריך לנחות ישר – אם עוזבים את הכפתורים לפני הנחיתה, הגולש מתיישר לבד.<br>❄️ <b>קריסטלים</b> נותנים נקודות, ו<b>קומבו</b> של טריקים ברצף מכפיל!<br>🌲 נזהרים מעצים, סלעים ואנשי שלג.<br>🚩 <b>מסלול שערים:</b> עוברים בין הדגלים. 💪 <b>בלי ליפול:</b> נפילה אחת וזהו.`, `🏔️ <b>You ride down the mountain by yourself</b> – no gas, no brakes, gravity does the work.<br>👆 <b>Turn:</b> press and hold the left or right side of the screen.<br>⤴ <b>Jump:</b> the green button. Blue ramps launch you high!<br>🌀 <b>In the air:</b> hold a side = 360° spin, 🔄 = backflip, ✋ = grab.<br>🛬 <b>Landing:</b> land straight – let go of the buttons before landing and your rider straightens out.<br>❄️ <b>Crystals</b> give points, and a <b>combo</b> of tricks in a row multiplies them!<br>🌲 Watch out for trees, rocks and snowmen.<br>🚩 <b>Slalom:</b> ski between the flags. 💪 <b>No-fall:</b> one fall and you’re out.`);
$('helpBtn').onclick = () => { $('helpSheet').hidden = false; }; $('hX').onclick = () => { $('helpSheet').hidden = true; };
$('pT').textContent = T('הפסקה', 'Paused'); $('pMenu').textContent = T('תפריט', 'Menu'); $('pGo').textContent = T('המשך ▶', 'Resume ▶'); $('eMenu').textContent = T('תפריט', 'Menu'); $('eAgain').textContent = T('🔁 שוב', '🔁 Again');
$('homeT').innerHTML = ICO.home('#ffffff'); hubButtons(['homeT'], A); qualityButton('qBtn', S);
const sndSync = () => $('sndChip').textContent = S.mute ? T('🔇 צליל כבוי', '🔇 Sound off') : T('🔊 צליל', '🔊 Sound'); sndSync(); $('sndChip').onclick = () => { A.setMute(!S.mute); S.save(); sndSync(); };
$('bJump').querySelector('small').textContent = T('קפיצה', 'jump');

/* ================= LOOP ================= */
let last = performance.now(), flT = 0;
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.04, (now - last) / 1000); last = now; A.tick(); skyU.t.value = now / 1000;
  if (state === 'title') { tAng += dt * .25; const s = RS; const r = innerWidth < innerHeight ? 5.6 : 4.4, ph = Math.sin(tAng) * .5 + (S.gear === 'board' ? .8 : .35); if (!camLock) { camera.position.set(s.x + Math.sin(ph) * r, s.y + 1.7, s.z + Math.cos(ph) * r); camera.lookAt(s.x, s.y + (innerWidth < innerHeight ? -.12 : .7), s.z); } camera.fov = 50; camera.updateProjectionMatrix();
    sky.position.copy(camera.position); peaks.position.set(camera.position.x, camera.position.y * .9, camera.position.z); sun.position.set(s.x + M.sunDir[0] * 40, s.y + 40, s.z + M.sunDir[2] * 40); sun.target.position.set(s.x, s.y, s.z); poseRider(rider, { lean: Math.sin(now / 900) * .15, crouch: .25, t: now / 1000 }, dt); }
  else if (RS) { if (state === 'count') { cdTick(dt); RS.lean = 0; }
    if (state === 'play') { step(dt); if (RS.comboT > 0) RS.comboT -= dt; spawnUntil(RS.z + 240); cullBehind(RS.z); updTerrain(RS.z); hud();
      if (mode === 'slalom' && RS.z >= MODES.slalom.len && !RS.fin) { RS.fin = 1; A.tone(784, .2, 'triangle', .08); A.tone(1046, .3, 'triangle', .08, .15); A.tone(1568, .4, 'triangle', .07, .3); endRun(); } }
    if (state === 'done') { RS.v *= Math.pow(.4, dt); RS.z += RS.v * dt * Math.cos(RS.yaw); RS.x += RS.v * dt * Math.sin(RS.yaw); if (!RS.air && RS.crash <= 0) RS.y = hAt(RS.x, RS.z); else if (RS.air) step(dt); }
    camUpdate(dt); poseWorld(dt); }
  if (gmT > 0) { gmT -= dt; if (gmT <= 0) $('gmsg').textContent = ''; }
  // gems spin
  const t = now / 1000; for (const o of obs) if (o.kind === 'gem' && o.P && o.z > (RS ? RS.z - 5 : 0) && o.z < (RS ? RS.z + 70 : 80)) { _q.setFromEuler(_e.set(0, t * 2.5 + o.x, 0)); _m.compose(_p.set(o.x, o.y + Math.sin(t * 2.4 + o.z) * .15, o.z), _q, _s.set(1, 1, 1)); o.P.m.setMatrixAt(o.i, _m); o.P.m.instanceMatrix.needsUpdate = true; }
  // gentle snowfall around the camera (kept thin so it never hides the slope)
  const fp = flGeo.attributes.position.array; const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z; const sp = RS ? RS.v : 0;
  for (let i = 0; i < FL; i++) { let y = fp[i * 3 + 1] - dt * 1.6, z = fp[i * 3 + 2] - dt * sp * .25, x = fp[i * 3] + Math.sin(t + i) * dt * .4; if (y < -6) y += 30; if (z < -8) z += 70; fp[i * 3] = x; fp[i * 3 + 1] = y; fp[i * 3 + 2] = z; }
  flakes.position.set(cx, cy, cz); flGeo.attributes.position.needsUpdate = true;
  FX.update(dt); E.render(); }
addEventListener('resize', () => E.resize());
E.resize(); setupPreview(); showTitle(); setTimeout(() => { $('loading').hidden = true; requestAnimationFrame(frame); window.__skiOK = true; }, 30);
window.__ski = { lockCam(v) { camLock = v; }, camera, freeze() { state = 'pause'; }, crash, pause, resume, sim(n, dt, f) { state = 'play'; for (let k = 0; k < n; k++) { if (f) f(inp, k); if (state !== 'play') break; step(dt); if (RS.comboT > 0) RS.comboT -= dt; spawnUntil(RS.z + 240); cullBehind(RS.z); updTerrain(RS.z); if (mode === 'slalom' && RS.z >= MODES.slalom.len && !RS.fin) { RS.fin = 1; endRun(); } } camUpdate(.016, true); poseWorld(.1); hud(); return { z: RS.z, x: RS.x, y: RS.y, v: RS.v, air: RS.air, score: RS.score, falls: RS.falls, gems: RS.gates, tricks: RS.tricks, best: RS.best, gates: RS.gates, missed: RS.missed, time: RS.time, state }; }, doJump, get RS() { return RS; }, get state() { return state; }, start, setupRun, S, step, launch, land, obs: () => obs, endRun, renderTitle, openWard, previewRider, hAt, cxAt };
