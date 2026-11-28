import { THREE, $, V3, C, clamp, lerp, rnd, rng, T, EN, store, engine, std, particles, audio, toast, ICO, hubButtons, qualityButton, isTouch } from '../lib/kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loadMix, MixRig } from '../lib/mixchar.js';
import { openChest } from '../lib/chest.js';

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
const railM = std('#e8eef8', { metalness: .85, roughness: .25 }), railM2 = std('#ff3a8a', { roughness: .4 }), boxM = std('#ffd23a', { roughness: .5 }), boxM2 = std('#2ab8ff', { roughness: .5 }), postM = std('#3a3a48', { roughness: .6 });
const rails = []; for (let i = 0; i < 8; i++) { const g = new THREE.Group(); g.visible = false; scene.add(g); rails.push({ g, used: false }); }
function setRail(Rr, x, z0, L, box) { const g = Rr.g; g.clear(); const y0 = hAt(x, z0) + (box ? .55 : .8), y1 = hAt(x, z0 + L) + (box ? .55 : .8); g.position.set(x, y0, z0); const ang = Math.atan2(y0 - y1, L);
  const bar = new THREE.Mesh(box ? new THREE.BoxGeometry(1.1, .12, L) : new THREE.CylinderGeometry(.07, .07, L, 10).rotateX(Math.PI / 2), box ? boxM : railM); bar.position.set(0, 0, L / 2); bar.rotation.x = ang; bar.position.y = -(y0 - y1) / 2; bar.castShadow = true; g.add(bar);
  if (box) { const side = new THREE.Mesh(new THREE.BoxGeometry(1.0, .5, L), boxM2); side.position.set(0, -(y0 - y1) / 2 - .3, L / 2); side.rotation.x = ang; side.castShadow = true; g.add(side); }
  else for (let k = 0; k <= Math.floor(L / 3.5); k++) { const zz = Math.min(L, k * 3.5 + .2), yy = -(y0 - y1) * zz / L; const p = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .8, 6), postM); p.position.set(0, yy - .4, zz); g.add(p); }
  if (!box) for (let k = 0; k < L; k += 1) { const st = new THREE.Mesh(new THREE.CylinderGeometry(.072, .072, .45, 10).rotateX(Math.PI / 2), railM2); st.position.set(0, -(y0 - y1) * (k + .25) / L, k + .25); g.add(st); k += 1; }
  g.visible = true; Rr.used = true; return { y0, y1 }; }
const iceM = new THREE.MeshStandardMaterial({ color: '#9ae8ff', emissive: '#2a8ab8', emissiveIntensity: .35, transparent: true, opacity: .72, roughness: .15, metalness: .1 });
const arches = []; for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(3.4, .55, 8, 18, Math.PI), iceM); m.visible = false; scene.add(m); arches.push({ g: m, used: false }); }
function signTex() { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#7a4a2a'; x.fillRect(0, 0, 512, 256); x.strokeStyle = '#4a2a14'; x.lineWidth = 10; x.strokeRect(5, 5, 502, 246); x.font = '900 52px system-ui,sans-serif'; x.textAlign = 'center'; x.fillStyle = '#fff';
  x.fillText('◀ ' + T('מערת קרח', 'Ice cave') + ' ❄️', 256, 95); x.fillText(T('קפיצת צוק', 'Cliff jump') + ' 🏔️ ▶', 256, 190); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
let signG = null; function mkSign() { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(4, 2, .15), [std('#7a4a2a'), std('#7a4a2a'), std('#7a4a2a'), std('#7a4a2a'), new THREE.MeshStandardMaterial({ map: signTex(), roughness: .8 }), std('#7a4a2a')]); b.position.y = 3; b.rotation.y = Math.PI; g.add(b); const p = new THREE.Mesh(new THREE.CylinderGeometry(.12, .14, 3, 8), std('#5a3a1a')); p.position.y = 1.5; g.add(p); g.visible = false; scene.add(g); return g; }
function mkYeti() { const g = new THREE.Group(), fur = std('#eef4ff', { roughness: 1 }), fur2 = std('#d4e0f4', { roughness: 1 }), skin = std('#7a8aa8', { roughness: .8 }), dk = std('#1a1a2a');
  const bd = new THREE.Mesh(new THREE.SphereGeometry(.95, 18, 14), fur); bd.scale.set(1, 1.25, .85); bd.position.y = 1.75; g.add(bd); for (let i = 0; i < 18; i++) { const t = new THREE.Mesh(new THREE.SphereGeometry(rnd(.25, .4), 8, 6), i % 3 ? fur : fur2); const a = rnd(0, TAU), e = rnd(-.9, .9); t.position.set(Math.cos(a) * Math.cos(e) * .92, 1.75 + Math.sin(e) * 1.1, Math.sin(a) * Math.cos(e) * .78); g.add(t); }
  const hd = new THREE.Group(); hd.position.set(0, 3.05, .1); g.add(hd); const h = new THREE.Mesh(new THREE.SphereGeometry(.62, 16, 12), fur); hd.add(h); const face = new THREE.Mesh(new THREE.SphereGeometry(.42, 14, 10), skin); face.scale.set(1, .9, .5); face.position.set(0, -.08, .42); hd.add(face);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), std('#ff3a2a', { emissive: '#ff2010', emissiveIntensity: 1.2 })); e.position.set(sx * .16, .04, .62); hd.add(e); const hn = new THREE.Mesh(new THREE.ConeGeometry(.12, .45, 8), std('#e8d8b0')); hn.position.set(sx * .45, .45, 0); hn.rotation.z = -sx * .6; hd.add(hn); }
  const mo = new THREE.Mesh(new THREE.BoxGeometry(.34, .12, .1), dk); mo.position.set(0, -.25, .62); hd.add(mo); for (const sx of [-1, 1]) { const tt = new THREE.Mesh(new THREE.ConeGeometry(.04, .12, 4), std('#ffffff')); tt.position.set(sx * .1, -.2, .66); tt.rotation.x = Math.PI; hd.add(tt); }
  const arms = []; for (const sx of [-1, 1]) { const a = new THREE.Group(); a.position.set(sx * .95, 2.45, 0); const m = new THREE.Mesh(new THREE.CapsuleGeometry(.26, 1.2, 4, 8), fur); m.position.y = -.7; a.add(m); const hnd = new THREE.Mesh(new THREE.SphereGeometry(.24, 8, 6), skin); hnd.position.y = -1.45; a.add(hnd); g.add(a); arms.push(a); }
  const legs = []; for (const sx of [-1, 1]) { const l = new THREE.Group(); l.position.set(sx * .45, .95, 0); const m = new THREE.Mesh(new THREE.CapsuleGeometry(.3, .6, 4, 8), fur); m.position.y = -.45; l.add(m); const f = new THREE.Mesh(new THREE.BoxGeometry(.45, .2, .7), skin); f.position.set(0, -.92, .15); l.add(f); g.add(l); legs.push(l); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.userData = { arms, legs, hd }; g.visible = false; scene.add(g); return g; }
let yetiG = null, avalG = null;
function mkAval() { const g = new THREE.Group(); const geo = new THREE.PlaneGeometry(80, 26, 40, 13); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, Math.sin(p.getX(i) * .3) * 2 + Math.sin(p.getX(i) * .11 + y) * 2.5 + (y + 13) * .25); p.setY(i, y + Math.sin(p.getX(i) * .5) * 1.2); } geo.computeVertexNormals(); const w = new THREE.Mesh(geo, std('#f4f8ff', { roughness: 1, side: THREE.DoubleSide })); w.position.y = 11; g.add(w);
  const puff = new THREE.SphereGeometry(1, 10, 8); for (let i = 0; i < 40; i++) { const b = new THREE.Mesh(puff, std(i % 2 ? '#ffffff' : '#e4ecf8', { roughness: 1 })); const s2 = rnd(2.5, 5.5); b.scale.set(s2, s2 * .8, s2); b.position.set(rnd(-38, 38), rnd(0, 22), rnd(-2, 5)); g.add(b); } g.visible = false; scene.add(g); return g; }
// aurora ribbons for night skies
const aurora = new THREE.Group(); { const mk = (col1, col2, i) => { const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { t: { value: 0 }, a: { value: C(col1) }, b: { value: C(col2) }, k: { value: i } },
    vertexShader: 'varying vec2 vU; uniform float t; uniform float k; void main(){ vU=uv; vec3 p=position; p.z+=sin(p.x*.012+t*.4+k)*40.; p.y+=sin(p.x*.02+t*.6+k*2.)*14.; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }',
    fragmentShader: 'varying vec2 vU; uniform float t; uniform vec3 a; uniform vec3 b; uniform float k; void main(){ float band=smoothstep(0.,.35,vU.y)*(1.-smoothstep(.35,1.,vU.y)); float rays=.55+.45*sin(vU.x*90.+t*1.5+k*3.); float al=band*rays*(.55+.45*sin(vU.x*9.+t*.3+k)); gl_FragColor=vec4(mix(a,b,vU.y)*al*.9,al*.85); }' });
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(1400, 220, 60, 1), m); pl.position.set(i * 120 - 120, 330 + i * 40, 650 - i * 60); pl.rotation.x = -.25; aurora.add(pl); }; mk('#3affa0', '#a05aff', 0); mk('#5affd0', '#ff5ad8', 1); mk('#3ad8ff', '#7aff8a', 2); aurora.visible = false; scene.add(aurora); }
function setWeather() { const r = Math.random(); WX = M.night ? (r < .7 ? 'aurora' : 'snow') : r < .45 ? 'clear' : r < .75 ? 'snow' : 'blizzard'; aurora.visible = WX === 'aurora';
  const bz = WX === 'blizzard'; scene.fog.near = M.fogN * (bz ? .35 : 1); scene.fog.far = M.fogF * (bz ? .42 : 1); scene.fog.color.set(bz ? '#e8eef6' : M.fog); flakes.material.size = WX === 'clear' || WX === 'aurora' ? .09 : bz ? .17 : .13; flakes.material.opacity = WX === 'clear' ? .6 : .95; sun.intensity = M.sunI * .85 * (bz ? .55 : 1); hemi.intensity = M.hemi[2] * .72 * (bz ? 1.15 : 1); }
// chairlift used for the intro ride up
const lift = new THREE.Group(); { const cab = std('#2a2a34', { roughness: .5 }); const chair = new THREE.Group(); chair.name = 'chair'; const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, .12, .6), std('#ff3a5a', { roughness: .5 })); seat.position.y = 0; chair.add(seat); const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, .7, .1), std('#ff3a5a')); back.position.set(0, .35, -.3); chair.add(back);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 2.6, 6), cab); rod.position.set(0, 1.6, -.3); chair.add(rod); const bar = new THREE.Mesh(new THREE.BoxGeometry(1.6, .05, .05), cab); bar.position.set(0, .55, .45); chair.add(bar); lift.add(chair);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 120, 6).rotateX(Math.PI / 2), cab); cable.name = 'cable'; lift.add(cable); for (let i = 0; i < 3; i++) { const tw = new THREE.Mesh(new THREE.CylinderGeometry(.25, .35, 12, 8), std('#8a8a98', { metalness: .6, roughness: .4 })); tw.name = 'tw' + i; lift.add(tw); } lift.visible = false; scene.add(lift); }
let LIFT = null;
function startLift() { const s = RS; const x = cxAt(30) - M.W / 2 - 4; LIFT = { t: 0, dur: 3.4, x }; lift.visible = true; const cab = lift.getObjectByName('cable'); const z0 = 62, z1 = 6; const y0 = hAt(x, z0) + 9, y1 = hAt(x, z1) + 9; cab.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2); cab.lookAt(x, y1, z1); cab.rotateX(0); LIFT.z0 = z0; LIFT.z1 = z1; LIFT.y0 = y0; LIFT.y1 = y1;
  for (let i = 0; i < 3; i++) { const tw = lift.getObjectByName('tw' + i), z = [z0 + 12, z1 - 6, 34][i], y = hAt(x, z) + 6; tw.position.set(x, y, z); } s.sit = 1; $('cd').innerHTML = `<small class="skip">${T('👆 הקישו לדילוג', '👆 Tap to skip')}</small>`; A.tone(330, .3, 'sine', .04); }
function liftTick(dt) { const L = LIFT, s = RS; L.t += dt; const k = clamp(L.t / L.dur, 0, 1), e = k * k * (3 - 2 * k); const z = lerp(L.z0, L.z1, e), y = lerp(L.y0, L.y1, e); const ch = lift.getObjectByName('chair'); ch.position.set(L.x, y - 2.9, z); ch.rotation.set(0, Math.PI, Math.sin(L.t * 2) * .05);
  s.x = L.x; s.z = z; s.y = y - 2.85; s.yaw = Math.PI; s.spin = 0; camera.position.set(L.x - 5.5 + k * 1.5, y - 1 + k * 1.2, z - 6.5 - k * 1.5); camera.lookAt(L.x, y - 2.6, z); sky.position.copy(camera.position); peaks.position.set(camera.position.x, camera.position.y * .9, camera.position.z);
  if (L.t >= L.dur) endLift(); }
function endLift() { if (!LIFT) return; LIFT = null; lift.visible = false; const s = RS; s.sit = 0; s.x = cxAt(6); s.z = 6; s.y = hAt(s.x, 6); s.yaw = 0; camUpdate(0, true); state = 'count'; cdT = 3.2; $('cd').innerHTML = ''; }
$('stage').addEventListener('pointerdown', () => { if (state === 'lift') endLift(); }); $('zones').addEventListener('pointerdown', () => { if (state === 'lift') endLift(); else if (state === 'replay') endReplay(); }, true); $('tpad').addEventListener('pointerdown', () => { if (state === 'lift') endLift(); });
// slow-motion replay of big tricks
const REC = []; let RP = null, rpCool = 0;
function recFrame() { const s = RS; REC.push({ x: s.x, y: s.y, z: s.z, yaw: s.yaw, spin: s.spin, flip: s.flip, lean: s.lean, crouch: s.crouch, air: s.air, g: s.air && grabIn(), v: s.v }); if (REC.length > 260) REC.shift(); }
function startReplay() { const from = Math.max(0, REC.length - 1 - (RS.lastAirN || 60) - 20); RP = { fr: REC.slice(from), i: 0, save: { ...RS } }; state = 'replay'; $('cd').innerHTML = `<b class="rp">🎬 REPLAY</b><small class="skip">${T('👆 הקישו לדילוג', '👆 Tap to skip')}</small>`; }
function replayTick(dt) { const P2 = RP, s = RS; P2.i += dt * 60 * .42; const f = P2.fr[Math.min(P2.fr.length - 1, Math.floor(P2.i))]; Object.assign(s, { x: f.x, y: f.y, z: f.z, yaw: f.yaw, spin: f.spin, flip: f.flip, lean: f.lean, crouch: f.crouch, air: f.air, rgrab: f.g, crash: 0, inv: 0 });
  const a = P2.i * .018; camera.position.set(f.x + Math.sin(a + 1.2) * 6.5, f.y + 2.2, f.z + Math.cos(a + 1.2) * 6.5); camera.lookAt(f.x, f.y + 1, f.z); camera.fov = 52; camera.updateProjectionMatrix(); sky.position.copy(camera.position); peaks.position.set(camera.position.x, camera.position.y * .9, camera.position.z);
  if (P2.i >= P2.fr.length - 1) endReplay(); }
function endReplay() { if (!RP) return; Object.assign(RS, RP.save); delete RS.rgrab; RP = null; rpCool = 25; state = 'play'; $('cd').innerHTML = ''; camUpdate(0, true); }
$('stage').addEventListener('pointerdown', () => { if (state === 'replay') endReplay(); }); $('tpad').addEventListener('pointerdown', () => { if (state === 'replay') endReplay(); });
const finish = new THREE.Group(); { const ck = document.createElement('canvas'); ck.width = 256; ck.height = 64; const x = ck.getContext('2d'); for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#111' : '#fff'; x.fillRect(i * 16, j * 16, 16, 16); } const t = new THREE.CanvasTexture(ck); t.colorSpace = THREE.SRGBColorSpace;
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, 7, 10), std('#ff3a6a')); p.position.set(s * 9, 3.5, 0); finish.add(p); } const b = new THREE.Mesh(new THREE.BoxGeometry(18.5, 1.4, .2), new THREE.MeshStandardMaterial({ map: t })); b.position.y = 6.6; finish.add(b); finish.visible = false; scene.add(finish); }
function logoTex(w, h, sub) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#1aa8ff'); g.addColorStop(1, '#7a3aff'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.strokeStyle = '#ffd23a'; x.lineWidth = h * .06; x.strokeRect(0, 0, w, h); x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `900 ${h * .5}px system-ui,Arial Black,sans-serif`; x.lineWidth = h * .08; x.strokeStyle = '#0a2a6a'; const ty = sub ? h * .4 : h * .52; x.strokeText('YAYA GAMES', w / 2, ty); x.fillStyle = '#ffd23a'; x.fillText('YAYA GAMES', w / 2, ty); if (sub) { x.font = `800 ${h * .2}px system-ui,sans-serif`; x.fillStyle = '#fff'; x.fillText(sub, w / 2, h * .8); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const FC = { M: [], built: 0 };
function recolor(Mr, i) { const hue = (i * 2.399) % TAU, sat = rnd(.8, 1.35), tint = C(['#ff4a5a', '#3a8aff', '#ffd23a', '#3ae08a', '#ff8ad8', '#9a6aff', '#ff9a3a', '#3ad8e0'][i % 8]);
  for (const mesh of Mr.meshes) { const one = m0 => { const m = m0.clone(); m.onBeforeCompile = sh => { sh.uniforms.uHue = { value: hue }; sh.uniforms.uSat = { value: sat }; sh.uniforms.uTint = { value: tint }; sh.fragmentShader = 'uniform float uHue; uniform float uSat; uniform vec3 uTint;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  { vec3 c = diffuseColor.rgb; float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)); float sat = mx > .001 ? (mx - mn) / mx : 0.; float skin = step(c.b, c.g) * step(c.g, c.r) * step(.12, sat) * step(sat, .66) * step(.16, mx) * step(c.r - c.g, .55 * c.r) * step(c.r - c.b, .8 * c.r); float k = (1. - skin) * smoothstep(.07, .22, sat);
    float Y = dot(c, vec3(.299, .587, .114)), I = dot(c, vec3(.596, -.274, -.322)), Q = dot(c, vec3(.211, -.523, .312)); float h = atan(Q, I) + uHue, ch = sqrt(I * I + Q * Q) * uSat; vec3 r = vec3(Y + .956 * ch * cos(h) + .621 * ch * sin(h), Y - .272 * ch * cos(h) - .647 * ch * sin(h), Y - 1.106 * ch * cos(h) + 1.703 * ch * sin(h));
    float g = (1. - skin) * (1. - smoothstep(.07, .22, sat)) * smoothstep(.08, .3, mx) * (1. - smoothstep(.75, .95, mx)); diffuseColor.rgb = mix(mix(c, clamp(r, 0., 1.), k), c * uTint * 1.5, g * .75); }`); }; m.customProgramCacheKey = () => 'crowdtint'; return m; }; mesh.material = Array.isArray(mesh.material) ? mesh.material.map(one) : one(mesh.material); } }
function buildFinishCrowd() { if (FC.built) return; FC.built = 1; const bt = logoTex(512, 128, T('הספונסר הרשמי', 'Official sponsor')); const bm = new THREE.MeshStandardMaterial({ map: bt, roughness: .6 });
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.4, 5), [bm, bm, std('#ffd23a'), std('#ffd23a'), std('#ffd23a'), std('#ffd23a')]); b.position.set(sd * 9.6, .9, -14 + k * 6.5); finish.add(b); }
  const ab = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75), new THREE.MeshStandardMaterial({ map: logoTex(512, 128), side: THREE.DoubleSide })); ab.position.set(0, 8.35, 0); ab.rotation.y = Math.PI; finish.add(ab);
  const NC = S.q === 'low' ? 5 : S.q === 'ultra' ? 12 : 8, files = ['remy', 'luna', 'kai', 'rio', 'zori']; Promise.all(files.map(f => loadMix('lib/chars/' + f + '.glb'))).then(srcs => { for (let i = 0; i < NC; i++) { const src = srcs[(i * 3 + 1) % srcs.length]; if (!src) continue; const Mr = new MixRig(src, rnd(1.58, 1.84)); recolor(Mr, i); const sd = i % 2 ? 1 : -1, row = Math.floor(i / 2) % 2; Mr.holder.position.set(sd * (11 + row * 1.4 + rnd(-.3, .3)), 0, -16 + Math.floor(i / 4) * 5.2 + rnd(-.8, .8)); Mr.holder.rotation.y = -sd * Math.PI / 2 + rnd(-.3, .3) + Math.PI * 0; const m = { M: Mr, ph: rnd(0, TAU), sp: rnd(6, 9), st: i % 3 }; fanPose(m, 0); Mr.apply(); finish.add(Mr.holder); FC.M.push(m); } }); }
const _fd = V3();
function fanPose(m, t) { const Mr = m.M, w = Math.sin(t * m.sp + m.ph); for (const [sd, sx] of [['Left', 1], ['Right', -1]]) { if (m.st === 0) { _fd.set(sx * (.45 + w * sx * .25), 1, .15).normalize(); Mr.aim(sd + 'Arm', sd + 'ForeArm', _fd); Mr.aim(sd + 'ForeArm', sd + 'Hand', _fd); } else if (m.st === 1) { const c = Math.abs(Math.sin(t * 7 + m.ph)); _fd.set(sx * (.12 + c * .3), .35, 1).normalize(); Mr.aim(sd + 'Arm', sd + 'ForeArm', _fd); _fd.set(-sx * .5, .4, .8).normalize(); Mr.aim(sd + 'ForeArm', sd + 'Hand', _fd); } else { if (sd === 'Left') { _fd.set(.3, 1, .1 + w * .2).normalize(); Mr.aim('LeftArm', 'LeftForeArm', _fd); _fd.set(.15 + w * .35, 1, .2).normalize(); Mr.aim('LeftForeArm', 'LeftHand', _fd); } else { _fd.set(-.25, -1, .08).normalize(); Mr.aim('RightArm', 'RightForeArm', _fd); Mr.aim('RightForeArm', 'RightHand', _fd); } } } }
function crowdTick(t) { if (!finish.visible || !RS || Math.abs(finish.position.z - RS.z) > 90) return; buildFinishCrowd(); for (const m of FC.M) { m.M.holder.position.y = hAt(finish.position.x + m.M.holder.position.x, finish.position.z + m.M.holder.position.z) - finish.position.y + Math.max(0, Math.sin(t * m.sp * .9 + m.ph)) * (m.st === 0 ? .35 : .12); fanPose(m, t); m.M.apply(); } }
const lampGeo = mergeGeometries([colorize(new THREE.CylinderGeometry(.08, .1, 4, 6).translate(0, 2, 0), '#2a2a38'), colorize(new THREE.SphereGeometry(.32, 10, 8).translate(0, 4.1, 0), '#ffe8a0')].map(strip));
const P_LAMP = pool(lampGeo, 60, new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#ffd27a', emissiveIntensity: .0, roughness: .5 }), false);
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,230,160,1)'); g.addColorStop(.3, 'rgba(255,200,110,.45)'); g.addColorStop(1, 'rgba(255,180,80,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const glows = []; for (let i = 0; i < 30; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(4); s.visible = false; scene.add(s); glows.push(s); }

/* ================= FALLING SNOW (light – never blocks the view) ================= */
const FL = 260; const flGeo = new THREE.BufferGeometry(); const flP = new Float32Array(FL * 3); for (let i = 0; i < FL; i++) { flP[i * 3] = rnd(-30, 30); flP[i * 3 + 1] = rnd(-5, 25); flP[i * 3 + 2] = rnd(-10, 60); } flGeo.setAttribute('position', new THREE.BufferAttribute(flP, 3));
let WX = 'clear';
const flakes = new THREE.Points(flGeo, new THREE.PointsMaterial({ color: '#ffffff', size: .09, transparent: true, opacity: .75, depthWrite: false, fog: true })); flakes.frustumCulled = false; scene.add(flakes);
sky.renderOrder = -10;

/* ================= RIDERS & WARDROBE ================= */
const JACKETS = [['#16161e', '#9aff2a', T('ניאון פאנק', 'Neon Punk')], ['#ff5ab0', '#ffffff', T('מסטיק', 'Bubblegum')], ['#16b8b0', '#ffd21a', T('אוקיינוס', 'Ocean')], ['#ff7a1a', '#7a2ad8', T('שקיעה', 'Sunset')], ['#f6f6ff', '#b48aff', T('מלכת השלג', 'Snow Queen')], ['#e0202a', '#16161e', T('אש', 'Fire')], ['#1a2a6a', '#ff3ad8', T('גלקסיה', 'Galaxy')], ['#6a7a3a', '#e8d8a0', T('הסוואה', 'Camo')], ['#ffe14a', '#1a1a22', T('דבורה', 'Bumblebee')]];
const PANTS = [['#16161e', T('שחור', 'Black')], ['#f2f2f8', T('לבן', 'White')], ['#b8a0f0', T('לילך', 'Lilac')], ['#7ae0c0', T('מנטה', 'Mint')], ['tartan', T('משבצות', 'Tartan')], ['#3a5aa8', T('ג׳ינס', 'Denim')], ['#ff6a8a', T('ורוד', 'Pink')], ['#e8c87a', T('חאקי', 'Khaki')]];
const HEADS = [['none', '', T('בלי כובע', 'No hat'), '💇'], ['beanie', '#ff4aa8', T('גרב ורוד', 'Pink beanie'), '🧶'], ['beanie', '#16161e', T('גרב שחור', 'Black beanie'), '🧶'], ['beanie', 'rainbow', T('גרב צבעוני', 'Rainbow beanie'), '🌈'], ['helmet', '#ffffff', T('קסדה לבנה', 'White helmet'), '⛑️'], ['helmet', '#16161e', T('קסדה שחורה', 'Black helmet'), '⛑️'], ['helmet', '#ffc21a', T('קסדת זהב', 'Gold helmet'), '⛑️'], ['cap', '#e0202a', T('כובע הפוך', 'Backwards cap'), '🧢']];
const EYES = [['none', '', T('בלי', 'None'), '👀'], ['gog', '#ff8a1a', T('כתום', 'Orange'), '🥽'], ['gog', '#2a8aff', T('כחול', 'Blue'), '🥽'], ['gog', '#b03aff', T('סגול', 'Purple'), '🥽'], ['gog', '#2ad870', T('ירוק', 'Green'), '🥽'], ['gog', '#ffd21a', T('זהב', 'Gold'), '🥽'], ['sun', '#16161e', T('משקפי שמש', 'Sunglasses'), '🕶️'], ['heart', '#ff3a8a', T('לבבות', 'Hearts'), '💖']];
const HAIRS = [[['#ff3aa8', '#ffe14a'], T('ורוד / בלונד', 'Pink / Blonde')], [['#3aff8a', '#2a1a12'], T('ירוק / שחור', 'Green / Black')], [['#3ab8ff', '#b8541a'], T('כחול / ג׳ינג׳י', 'Blue / Auburn')], [['#ffffff', '#b07aff'], T('לבן / סגול', 'White / Purple')], [['#ff3a2a', '#ff8ac8'], T('אדום / ורוד', 'Red / Pink')], [['#1a1a22', '#f0e0c0'], T('שחור / פלטינה', 'Black / Platinum')]];
const GEARS = [['#16161e', '#9aff2a', T('ניאון', 'Neon')], ['#1a4ae8', '#9ae8ff', T('קרח', 'Ice')], ['#e0202a', '#ffb21a', T('אש', 'Fire')], ['#2a1a5a', '#ff3ad8', T('גלקסיה', 'Galaxy')], ['rainbow', '', T('קשת', 'Rainbow')], ['#ffffff', '#ff5ab0', T('ורוד', 'Pink')], ['#16161e', '#ffc21a', T('זהב', 'Gold')]];
const CHARS = [{ n: 'REMY', skin: '#e8b08a', girl: false, mix: 'lib/chars/remy.glb', h: 1.76 }, { n: 'LUNA', skin: '#f6d2b8', girl: true, mix: 'lib/chars/luna.glb', h: 1.68, hk: 1 }];
const texCache = {};
function patTex(kind, a, b) { const k = kind + a + b; if (texCache[k]) return texCache[k]; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  if (kind === 'tartan') { x.fillStyle = '#b8101a'; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(0,0,0,.45)'; for (let i = 0; i < 64; i += 16) { x.fillRect(i, 0, 6, 64); x.fillRect(0, i, 64, 6); } x.fillStyle = 'rgba(255,220,60,.6)'; for (let i = 8; i < 64; i += 16) { x.fillRect(i, 0, 1.5, 64); x.fillRect(0, i, 64, 1.5); } }
  else if (kind === 'rainbow') { const cs = ['#ff3a3a', '#ff9a1a', '#ffe14a', '#3ad86a', '#2a8aff', '#9a3aff']; cs.forEach((cc, i) => { x.fillStyle = cc; x.fillRect(0, i * 64 / 6, 64, 64 / 6 + 1); }); }
  else if (kind === 'board') { const g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, a); g.addColorStop(.5, b); g.addColorStop(1, a); x.fillStyle = g; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(255,255,255,.35)'; for (let i = -64; i < 64; i += 14) { x.beginPath(); x.moveTo(i, 64); x.lineTo(i + 8, 64); x.lineTo(i + 72, 0); x.lineTo(i + 64, 0); x.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; texCache[k] = t; return t; }
// Outfit on the real (Mixamo) characters: recolor clothes textures + put hats/goggles on the head bone
const tintCache = {}; const HSL = { h: 0, s: 0, l: 0 }, _tc = new THREE.Color();
function tintTex(src, key, fn) { if (tintCache[key]) return tintCache[key]; const img = src.image; const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const x = cv.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, cv.width, cv.height), a = d.data; fn(a); x.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(cv); t.flipY = src.flipY; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = src.wrapS; t.wrapT = src.wrapT; return tintCache[key] = t; }
const colOf = c => c === 'tartan' ? '#b8101a' : c;
function tintAll(col, a) { const c = C(colOf(col)); let sum = 0, n = 0; for (let i = 0; i < a.length; i += 4) { if (a[i + 3] < 20) continue; sum += a[i] * .3 + a[i + 1] * .59 + a[i + 2] * .11; n++; } const m = Math.max(1, sum / Math.max(1, n));
  const R = c.r * 255, G = c.g * 255, B = c.b * 255; for (let i = 0; i < a.length; i += 4) { const k = Math.min(1.6, (a[i] * .3 + a[i + 1] * .59 + a[i + 2] * .11) / m); a[i] = Math.min(255, R * k); a[i + 1] = Math.min(255, G * k); a[i + 2] = Math.min(255, B * k); } }
function dressMix(mx, ci, o, acc, HR) { const ch = CHARS[ci], jc = JACKETS[o.jacket % JACKETS.length][0], pc = PANTS[o.pants % PANTS.length][0], hairC = HAIRS[o.hair % HAIRS.length][0][ch.girl ? 1 : 0];
  for (const me of mx.meshes) { const mats = Array.isArray(me.material) ? me.material : [me.material]; const out = mats.map(mt => { if (!mt.map) return mt; const nm = mt.name || ''; let t = null;
      if (nm === 'Topmat') t = tintTex(mt.map, 'top' + jc, a => tintAll(jc, a)); else if (nm === 'Bottommat') t = tintTex(mt.map, 'bot' + pc, a => tintAll(pc, a)); else if (nm === 'Hairmat') t = tintTex(mt.map, 'hair' + hairC, a => tintAll(hairC, a));
      else if (nm === 'Ch29_Body') { const J = C(jc), P = C(colOf(pc)); const W = mt.map.image.width; t = tintTex(mt.map, 'luna' + jc + pc, a => { for (let i = 0; i < a.length; i += 4) { if ((i >> 2) % W > W * .72) continue; _tc.setRGB(a[i] / 255, a[i + 1] / 255, a[i + 2] / 255); _tc.getHSL(HSL); const h = HSL.h * 360; let c = null, k = 0;
            if ((h > 345 || h < 14) && HSL.s > .3 && HSL.l > .3 && HSL.l < .85) { c = J; k = HSL.l / .62; } else if (h > 225 && h < 295 && HSL.s > .2 && HSL.l > .15) { c = P; k = HSL.l / .55; }
            if (c) { k = Math.min(1.5, k); a[i] = Math.min(255, c.r * 255 * k); a[i + 1] = Math.min(255, c.g * 255 * k); a[i + 2] = Math.min(255, c.b * 255 * k); } } }); }
      if (!t) return mt; const m2 = mt.clone(); m2.map = t; m2.color.set('#ffffff'); return m2; }); me.material = Array.isArray(me.material) ? out : out[0]; }
  const hb = mx.B.Head; let tb = mx.B.HeadTop_End; if (!tb && hb) hb.traverse(q => { if (!tb && q !== hb && /HeadTop/.test(q.name)) tb = q; }); if (!acc.length || !hb || !tb) return; mx.holder.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(mx.holder.matrixWorld).invert();
  const hp = new THREE.Vector3().setFromMatrixPosition(hb.matrixWorld).applyMatrix4(inv), tp = new THREE.Vector3().setFromMatrixPosition(tb.matrixWorld).applyMatrix4(inv); const len = hp.distanceTo(tp), sc = len * .56 * (ch.hk || 1) / HR;
  const want = new THREE.Matrix4().compose(hp.clone().lerp(tp, ch.girl ? .6 : .45).add(new THREE.Vector3(0, 0, -len * (ch.girl ? .16 : .06))), new THREE.Quaternion(), new THREE.Vector3(sc, sc, sc)); const loc = inv.clone().multiply(hb.matrixWorld).invert().multiply(want);
  const g = new THREE.Group(); loc.decompose(g.position, g.quaternion, g.scale); acc.forEach(m => { g.add(m); m.traverse(q => { if (q.isMesh) { q.visible = true; q.castShadow = true; } }); }); hb.add(g); }
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
  const accStart = head.children.length;
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
  let mx = null; if (ch.mix && MIXSRC[ch.mix]) { mx = new MixRig(MIXSRC[ch.mix], ch.h); body.add(mx.holder); const keep = new Set(); gearG.traverse(m => keep.add(m)); poles.forEach(pl => pl.traverse(m => keep.add(m))); body.traverse(m => { if (m.isMesh && !keep.has(m) && !mx.meshes.includes(m)) m.visible = false; });
    dressMix(mx, ci, o, head.children.slice(accStart), HR); }
  return { root, body, hips, torso, head, neck, arms, legs, gear: gearG, poles, board: gear === 'board', girl: ch.girl, mx };
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
  if (st.sit) { R.hips.position.y = .55; R.torso.rotation.x = -.05; R.legs.forEach(l => { l.rotation.x = -1.45; l.rotation.z = 0; }); R.arms.forEach((a, i) => { a.rotation.x = -.4; a.rotation.z = (i ? 1 : -1) * .25; }); }
  if (R.mx) driveMix(R, st);
  if (R.root.userData.pony) R.root.userData.pony.rotation.x = .5 + Math.sin(t * 7) * .15 + (st.speed || 0) * .02;
}

// Mixamo rider (Remy): follows the procedural rig; knees solved with IK so the boots stay on the skis/board
const MIXSRC = {}; CHARS.forEach((c, k) => loadMix(c.mix).then(src => { if (!src) return; MIXSRC[c.mix] = src; if (rider && S.who === k) { if (state === 'title') previewRider(); else makeRider(); } }));
const _mq = new THREE.Quaternion(), _mv = V3(), _mh = V3(), _mf = V3(), FWD = V3(0, 0, 1);
function driveMix(R, st) { const M2 = R.mx; R.body.updateMatrixWorld(true); R.body.getWorldQuaternion(_mq).invert();
  M2.from('Hips', R.hips, _mq); M2.from('Spine', R.torso, _mq); M2.from('Neck', R.neck, _mq); M2.from('Head', R.head, _mq);
  [['Right', R.arms[0]], ['Left', R.arms[1]]].forEach(([sd, a]) => { M2.from(sd + 'Arm', a, _mq); M2.from(sd + 'ForeArm', a, _mq); M2.from(sd + 'Hand', a, _mq); });
  const lift = .07; M2.hips(_mv.set(0, R.hips.position.y - .86 + lift, 0)); M2.apply(); M2.holder.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(R.body.matrixWorld).invert();
  [['Right', R.legs[0]], ['Left', R.legs[1]]].forEach(([sd, l]) => { M2.B[sd + 'UpLeg'].getWorldPosition(_mh).applyMatrix4(inv);
    _mf.set(0, -.75, .04).applyMatrix4(l.matrixWorld).applyMatrix4(inv); const ground = M2.ankleH + lift; if (!st.fall) _mf.y = Math.max(_mf.y, ground); _mf.x = lerp(_mf.x, _mh.x, .35); if (!st.fall) _mf.z = R.board ? _mf.z : lerp(_mf.z, .02, .85);
    M2.legIK(sd, _mh, _mf, FWD); M2.set(sd + 'Foot', M2.restW[sd + 'Foot']); });
  M2.apply(LEGB); }
const LEGB = ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];

/* ================= WORLD BUILD + SPAWNER ================= */
const MODES = { career: { n: T('קריירה', 'Career'), ic: '🏅', sub: T('שלבים ואתגרים', 'Stages & challenges') }, daily: { n: T('מסלול יומי', 'Daily slope'), ic: '📅', sub: T('אתגר חדש כל יום', 'A new challenge every day') }, race: { n: T('מרוץ', 'Race'), ic: '🏆', sub: T('נגד 3 גולשים', 'vs 3 riders'), len: 1300 }, slalom: { n: T('מסלול שערים', 'Slalom'), ic: '🚩', sub: T('עוברים בין הדגלים', 'Pass the flags'), len: 1050 }, free: { n: T('גלישה חופשית', 'Free ride'), ic: '🏂', sub: T('בלי לחץ – רק כיף', 'No pressure – just fun') }, nofall: { n: T('אתגר: בלי ליפול', 'No-fall challenge'), ic: '💪', sub: T('נפילה אחת וזהו', 'One fall and you’re out') } };
let parkZ = 0, forkZ = 0, obs = [], spawnZ = 0, gateN = 0, rampN = 0, R = null, RS = null, mode = 'free', mi = 0, state = 'title';
// career: stages that unlock one by one · daily: a 90-second free ride on today's mountain
const STAGES = [[0, 'free', 'score', 500], [0, 'slalom', 'miss', 2], [0, 'free', 'trick', '360'], [1, 'free', 'score', 1200], [1, 'nofall', 'dist', 800], [1, 'free', 'trick', 'BACKFLIP'], [2, 'slalom', 'miss', 1], [2, 'free', 'score', 2500], [2, 'free', 'trick', 'RODEO'], [3, 'nofall', 'dist', 1500], [3, 'slalom', 'miss', 0], [3, 'free', 'score', 5000]];
const goalTxt = g => g[2] === 'score' ? T(`צברו ${g[3]} נקודות`, `Score ${g[3]} points`) : g[2] === 'miss' ? (g[3] ? T(`סיימו את השערים – עד ${g[3]} פספוסים`, `Finish the slalom – max ${g[3]} missed`) : T('סיימו את השערים בלי לפספס אף אחד', 'Finish the slalom without missing a gate')) : g[2] === 'dist' ? T(`גלשו ${g[3]} מטר בלי ליפול`, `Ride ${g[3]} m without falling`) : T(`בצעו טריק: ${g[3]}`, `Land a trick: ${g[3]}`);
const today = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }; const dayN = () => Math.floor(Date.now() / 864e5);
const DAILY = () => { const n = dayN(); return { mt: n % 4, goal: 1500 + (n % 5) * 400 }; };
let RUN = { kind: 'normal' };
function clearWorld() { for (const o of obs) release(o); obs = []; rails.forEach(r => { r.used = false; r.g.visible = false; }); arches.forEach(a => { a.used = false; a.g.visible = false; }); if (signG) signG.visible = false; ramps.forEach(r => r.g.scale.set(1, 1, 1)); gates.forEach(g => { g.used = false; g.g.visible = false; }); ramps.forEach(r => { r.used = false; r.g.visible = false; }); finish.visible = false; glows.forEach(g => g.visible = false); }
function release(o) { if (o.arch) { o.arch.used = false; o.arch.g.visible = false; } if (o.sign && signG) signG.visible = false;  if (o.rail) { o.rail.used = false; o.rail.g.visible = false; } if (o.mega) o.ramp && o.ramp.g.scale.set(1, 1, 1); if (o.P) unplace(o.P, o.i); if (o.gate) { o.gate.used = false; o.gate.g.visible = false; } if (o.ramp) { o.ramp.used = false; o.ramp.g.visible = false; } if (o.glow) o.glow.visible = false; }
function buildWorld(k, preview) { mi = k; M = MTS[k]; const r = rng(M.seed); PH1 = r() * 6; PH2 = r() * 6; clearWorld();
  skyU.a.value.set(M.sky[0]); skyU.b.value.set(M.sky[1]); skyU.sc.value.set(M.sun); skyU.sd.value.set(...M.sunDir).normalize(); skyU.night.value = M.night;
  scene.fog.color.set(M.fog); scene.fog.near = M.fogN; scene.fog.far = M.fogF; hemi.color.set(M.hemi[0]); hemi.groundColor.set(M.hemi[1]); hemi.intensity = M.hemi[2] * .72; sun.color.set(M.sun); sun.intensity = M.sunI * .85;
  P_LAMP.m.material.emissiveIntensity = M.night ? 2.2 : 0; flakes.material.opacity = M.night ? .9 : .7; setEnv(); buildPeaks(); updTerrain(0, true); spawnZ = 14; gateN = 0; rampN = 0; parkZ = 120; forkZ = 260; spawnUntil(260, preview); }
function spawnUntil(zMax, preview) { const len = mode === 'slalom' || mode === 'race' ? MODES[mode].len : 1e9;
  while (spawnZ < zMax) { const z = spawnZ, c = cxAt(z), W2 = M.W / 2; spawnZ += 5;
    // forest outside the course (both sides)
    for (let s of [-1, 1]) { const n = Math.random() < .5 + M.trees * .3 ? 2 : 1; for (let q = 0; q < n; q++) { const x = c + s * (W2 + 2.5 + Math.pow(Math.random(), 1.6) * 30), zz = z + rnd(0, 5); const sz = rnd(.8, 1.5); const i = place(P_TREE, x, hAt(x, zz) - .2, zz, sz, rnd(0, 6)); if (i >= 0) obs.push({ P: P_TREE, i, x, z: zz, r: .9 * sz, hgt: 6, deco: Math.abs(x - c) > W2 + 1 }); } }
    if (M.night && Math.floor(z) % 40 === 14) for (const s of [-1, 1]) { const x = c + s * (W2 + 1.5); const i = place(P_LAMP, x, hAt(x, z), z, 1, 0); const gl = glows.find(g => !g.visible); if (gl) { gl.visible = true; gl.position.set(x, hAt(x, z) + 4.1, z); } obs.push({ P: P_LAMP, i, x, z, r: .3, hgt: 4, deco: true, glow: gl }); }
    if (preview || z < 40 || z > len - 30) { if ((mode === 'slalom' || mode === 'race') && z > len - 6 && z <= len - 1 && !finish.visible) { finish.visible = true; finish.position.set(cxAt(len), hAt(cxAt(len), len), len); } continue; }
    const prog = mode === 'nofall' ? Math.min(1, z / 2500) : 0;
    if (mode === 'slalom') { if (z % 40 < 5 && z > 50) { const G = gates.find(g => !g.used); if (G) { G.used = true; const side = gateN % 2 ? 1 : -1; const gx = c + side * (W2 * .35); G.g.visible = true; G.g.position.set(gx, hAt(gx, z) - .1, z); G.g.rotation.y = 0; setGateCol(G, side > 0 ? 'b' : 'r'); obs.push({ gate: G, x: gx, z, r: 0, hgt: 0, deco: true, kind: 'gate', side }); gateN++; } }
      else if (Math.random() < .07 * M.obs) addObstacle(z, c, W2, true); continue; }
    // free / nofall
    if (mode !== 'race' && z - parkZ > 380 && z > 150) { parkZ = z; spawnPark(z); continue; }
    if (mode !== 'race' && z - forkZ > 560 && z > 320 && z - parkZ > 140) { forkZ = z; spawnFork(z); continue; }
    const rampEvery = mode === 'free' ? 75 / M.ramp : 110 / M.ramp;
    if (z - rampN > rampEvery && Math.random() < .5) { const Rp = ramps.find(r2 => !r2.used); if (Rp) { rampN = z; Rp.used = true; const x = c + rnd(-W2 * .45, W2 * .45); Rp.g.visible = true; Rp.g.position.set(x, hAt(x, z), z); obs.push({ ramp: Rp, x, z, r: 0, hgt: 0, kind: 'ramp' });
        for (let q = 0; q < 4; q++) { const zz = z + 12 + q * 3.2; const i = place(P_GEM, x, hAt(x, zz) + 3.2 + Math.sin(q / 3 * Math.PI) * 1.8, zz, 1); if (i >= 0) obs.push({ P: P_GEM, i, x, z: zz, kind: 'gem', y: hAt(x, zz) + 3.2 + Math.sin(q / 3 * Math.PI) * 1.8 }); } continue; } }
    if (Math.random() < .12) { const off = rnd(-W2 * .6, W2 * .6); for (let q = 0; q < 5; q++) { const zz = z + q * 3; const x = cxAt(zz) + off + Math.sin(q * .8) * 1.5; const i = place(P_GEM, x, hAt(x, zz) + 1, zz, 1); if (i >= 0) obs.push({ P: P_GEM, i, x, z: zz, kind: 'gem', y: hAt(x, zz) + 1 }); } spawnZ += 12; continue; }
    if (Math.random() < (mode === 'nofall' ? .16 + prog * .22 : .13) * M.obs) addObstacle(z, c, W2, false);
  } }
function addRail(x, z, L, box) { const Rr = rails.find(r => !r.used); if (!Rr) return; const { y0, y1 } = setRail(Rr, x, z, L, box); obs.push({ rail: Rr, kind: 'rail', box, x, z, z0: z, z1: z + L, y0, y1, w: box ? 1.1 : .2, r: 0, hgt: 0 }); }
function addMega(x, z) { const Rp = ramps.find(r2 => !r2.used); if (!Rp) return; Rp.used = true; Rp.g.visible = true; Rp.g.scale.set(1.15, 1.7, 1.5); Rp.g.position.set(x, hAt(x, z), z); obs.push({ ramp: Rp, mega: 1, sc: 1.5, sh: 1.7, sw: 1.15, x, z, r: 0, hgt: 0, kind: 'ramp' });
  for (let q = 0; q < 6; q++) { const zz = z + 16 + q * 3.4; const y = hAt(x, zz) + 5 + Math.sin(q / 5 * Math.PI) * 3.2; const i = place(P_GEM, x, y, zz, 1); if (i >= 0) obs.push({ P: P_GEM, i, x, z: zz, kind: 'gem', y }); } }
function spawnFork(z) { const c0 = cxAt(z), W2 = M.W / 2; if (!signG) signG = mkSign(); signG.visible = true; signG.position.set(c0, hAt(c0, z), z); obs.push({ sign: 1, kind: 'sign', x: c0, z, r: .4, hgt: 4 });
  obs.push({ kind: 'msg', x: c0, z: z - 14, txt: T('⬅️ מערת קרח עם קריסטלים  •  קפיצת צוק ענקית ➡️  – בחרו דרך!', '⬅️ Ice cave with crystals  •  Giant cliff jump ➡️  – pick a path!'), r: 0, hgt: 0 });
  for (let zz = z + 4; zz < z + 70; zz += 3.2) { const c = cxAt(zz); const x = c + rnd(-1.6, 1.6); const tr = Math.random() < .55; const P2 = tr ? P_TREE : P_ROCK, sc = tr ? rnd(.9, 1.3) : rnd(.9, 1.4); const i = place(P2, x, hAt(x, zz) - .15, zz, sc, rnd(0, 6)); if (i >= 0) obs.push({ P: P2, i, x, z: zz, r: (tr ? .85 : .95) * sc, hgt: tr ? 6 : .75 * sc, kind: tr ? 'tree' : 'rock' }); }
  for (let k = 0; k < 9; k++) { const zz = z + 10 + k * 6.5, x = cxAt(zz) + W2 * .5; const a = arches.find(q => !q.used); if (a) { a.used = true; a.g.visible = true; a.g.position.set(x, hAt(x, zz) - .3, zz); obs.push({ arch: a, kind: 'arch', x, z: zz, r: 0, hgt: 0 }); } const i = place(P_GEM, x, hAt(x, zz) + 1, zz, 1); if (i >= 0) obs.push({ P: P_GEM, i, x, z: zz, kind: 'gem', y: hAt(x, zz) + 1 }); }
  const xr = cxAt(z + 52) - W2 * .5; const Rp = ramps.find(r2 => !r2.used); if (Rp) { Rp.used = true; Rp.g.visible = true; Rp.g.scale.set(1.1, 2.3, 1.7); Rp.g.position.set(xr, hAt(xr, z + 52), z + 52); obs.push({ ramp: Rp, mega: 1, cliff: 1, sc: 1.7, sh: 2.3, sw: 1.1, x: xr, z: z + 52, r: 0, hgt: 0, kind: 'ramp' }); for (let q = 0; q < 7; q++) { const zz = z + 72 + q * 4; const y = hAt(xr, zz) + 7 + Math.sin(q / 6 * Math.PI) * 4.5; const i = place(P_GEM, xr, y, zz, 1); if (i >= 0) obs.push({ P: P_GEM, i, x: xr, z: zz, kind: 'gem', y }); } }
  spawnZ = z + 96; }
function spawnPark(z) { const c = cxAt(z + 40); obs.push({ kind: 'msg', x: c, z: z - 6, txt: T('🛹 פארק טריקים! החליקו על המעקות וקפצו מהרמפות הענקיות', '🛹 Trick park! Slide the rails and hit the giant kickers'), r: 0, hgt: 0 });
  addRail(cxAt(z + 4) - 3, z + 4, 12, false); addRail(cxAt(z + 4) + 3, z + 4, 10, true); addMega(cxAt(z + 36), z + 36); addRail(cxAt(z + 68) + 2.6, z + 68, 15, false); addRail(cxAt(z + 70) - 3, z + 70, 11, true); addMega(cxAt(z + 98) - 1.5, z + 98); spawnZ = z + 128; }
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
function resetRS() { REC.length = 0; RP = null; rpCool = 8; LIFT = null; lift.visible = false; evReset(); CH.cur = null; CH.next = 12; CH.done = 0; DUEL = null; if ($('chal')) $('chal').hidden = true; RS = { grind: null, grindT: 0, x: cxAt(6), z: 6, y: hAt(cxAt(6), 6), yaw: 0, v: 8, vy: 0, gv: 0, air: false, spin: 0, flip: 0, spinV: 0, flipV: 0, grabT: 0, airT: 0, lean: 0, crash: 0, inv: 0, score: 0, gems: 0, combo: 0, comboT: 0, time: 0, gates: 0, missed: 0, best: '', bestP: 0, ramp: null, crouch: 0, fin: 0, dist: 0, falls: 0, tricks: 0, onRamp: null }; }

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
const steerIn = () => clamp((inp.l || keys.ArrowLeft || keys.KeyA ? 1 : 0) - (inp.r || keys.ArrowRight || keys.KeyD ? 1 : 0) + TCH.st, -1, 1);
const flipIn = () => inp.flip || keys.ArrowUp || keys.KeyW || TCH.flipT > 0;
const grabIn = () => inp.grab || keys.ArrowDown || keys.KeyS || TCH.grabT > 0;
// finger mode: drag sideways to steer (and spin in the air), flick up to jump, swipe down in the air = flip, tap in the air = grab
const TCH = { st: 0, flipT: 0, grabT: 0, p: null };
const ctlTouch = () => S.ctl === 'touch';
function touchTick(dt) { TCH.flipT = Math.max(0, TCH.flipT - dt); TCH.grabT = Math.max(0, TCH.grabT - dt); if (!TCH.p) TCH.st = lerp(TCH.st, 0, Math.min(1, dt * 10)); }
{ const pad = $('tpad'); pad.addEventListener('pointerdown', e => { if (!ctlTouch()) return; e.preventDefault(); A.ac(); TCH.p = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t: performance.now(), ax: e.clientX, ay: e.clientY, moved: false, flick: 0 }; });
  pad.addEventListener('pointermove', e => { const p = TCH.p; if (!p || e.pointerId !== p.id) return; const now = performance.now(), mdt = Math.max(8, now - p.t), vy = -(e.clientY - p.y) / mdt; const dx = e.clientX - p.x0;
    if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) > 10) p.moved = true; TCH.st = clamp(-dx / (innerWidth * .2), -1, 1);
    if (RS && !RS.air && vy > 1 && !p.flick) { p.flick = 1; doJump(); p.ay = e.clientY; }
    if (RS && RS.air && e.clientY - p.ay > 45) { TCH.flipT = .85; p.ay = e.clientY; } if (RS && RS.air && e.clientY - p.ay < -60) p.ay = e.clientY;
    p.x = e.clientX; p.y = e.clientY; p.t = now; });
  const up = e => { const p = TCH.p; if (!p || e.pointerId !== p.id) return; if (!p.moved && RS && RS.air) TCH.grabT = .55; TCH.p = null; }; pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up); }

/* ================= PHYSICS ================= */
const G = 17;
function doJump() { if (state !== 'play' || !RS || RS.air || RS.crash > 0) return; launch(6.6 + RS.v * .04); A.tone(520, .12, 'triangle', .06, 0, 820); }
function launch(vy) { if (RS.grind) grindEnd(); RS.airN0 = REC.length; RS.air = true; RS.vy = vy; RS.airT = 0; RS.spin0 = RS.spin; RS.flip0 = RS.flip; RS.grabT = 0; RS.spinTot = 0; RS.flipTot = 0; RS.onRamp = null; if (vy > 5) { document.body.classList.add('air'); A.noise(.25, 'highpass', 2500, 1, .06); } }
const nearest = (a, step) => Math.round(a / step) * step;
const RBW = [[3, .6, .6], [3, 2.2, .4], [.6, 2.6, .8], [.6, 1.2, 3], [2.2, .6, 3]]; function trailFx(s) { const k = (S.out[S.who] || {}).trail || 0; if (!k || s.air || s.crash > 0 || s.v < 4) return; const t0 = TRAILS[k][0]; const c = t0 === 'rainbow' ? RBW[Math.floor(performance.now() / 120) % 5] : C(t0).toArray().map(v => v * 2.6); for (let i = 0; i < 2; i++) FX.emit(V3(s.x + rnd(-.3, .3), s.y + .15, s.z - .6), V3(rnd(-.6, .6), rnd(.5, 1.6), rnd(-.4, .2)), c, .12, .7, 0); }
function step(dt) { touchTick(dt); const s = RS; if (EV.cine > 0) { EV.cine -= dt; return; } if (s.grind || !s.air) s.vBoost = EV.aval ? 1.08 : 1; const st = s.crash > 0 ? 0 : steerIn(); s.time += dt; trailFx(s);
  if (s.crash > 0) { s.crash -= dt; s.v *= Math.pow(.25, dt); s.x += Math.sin(s.yaw) * s.v * dt; s.z += Math.cos(s.yaw) * s.v * dt; s.y = hAt(s.x, s.z); if (s.crash <= 0) { s.inv = 1.6; s.spin = nearest(s.spin, TAU); s.flip = 0; s.yaw = 0; s.v = Math.max(s.v, 7); } return; }
  if (s.inv > 0) s.inv -= dt;
  if (s.grind) { const o = s.grind, t = (s.z - o.z0) / (o.z1 - o.z0); s.grindT += dt; s.x = lerp(s.x, o.x, Math.min(1, dt * 14)); s.yaw = lerp(s.yaw, 0, dt * 10); s.v = clamp(s.v + (o.y0 - o.y1) / (o.z1 - o.z0) * G * .6 * dt, 8, M.vMax); s.z += s.v * dt; s.y = lerp(o.y0, o.y1, clamp(t, 0, 1)) + .06; s.lean = lerp(s.lean, Math.sin(s.grindT * 6) * .12, dt * 6); s.crouch = lerp(s.crouch, .7, dt * 6);
    s.spin = lerp(s.spin, nearest(s.spin, Math.PI) + (S.gear === 'board' ? Math.PI / 2 : 0) * 0, dt * 10); if (Math.random() < .8) FX.emit(V3(s.x + rnd(-.1, .1), s.y, s.z - .3), V3(rnd(-1.5, 1.5), rnd(1, 3), rnd(-3, -1)), o.box ? [2.2, 1.9, .9] : [3, 2.4, 1.2], rnd(.04, .08), .4, 8, 1);
    A.loop('carve') && (A.loop('carve').g.gain.value = .05); if (t >= 1) { grindEnd(); launch(4.6); } s.dist = Math.max(s.dist, s.z); return; }
  if (!s.grind) for (const o of obs) if (o.kind === 'rail' && s.z > o.z0 - .3 && s.z < o.z1 - 1.2 && Math.abs(s.x - o.x) < o.w / 2 + .5) { const ry = lerp(o.y0, o.y1, clamp((s.z - o.z0) / (o.z1 - o.z0), 0, 1)); if ((s.air && s.vy <= 1 && s.y > ry - .7 && s.y < ry + 1.1) || (!s.air && s.z < o.z0 + 1.6)) { grindStart(o); return; } }
  if (!s.air) {
    s.yaw += st * 2.3 * dt; s.yaw -= s.yaw * (st ? .2 : 1.1) * dt; s.yaw = clamp(s.yaw, -1.2, 1.2);
    const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw); const slope = hAt(s.x + fx, s.z + fz) - hAt(s.x, s.z);
    let a = -slope * G * .95 - s.v * s.v * .0062 - Math.abs(st) * s.v * .07 - .3; s.v = clamp(s.v + a * dt + (EV.aval ? 3 * dt : 0), 5, M.vMax * (EV.aval ? 1.08 : 1) * (mode === 'nofall' ? 1 + Math.min(.35, s.z / 6000) : 1));
    s.x += fx * s.v * dt; s.z += fz * s.v * dt;
    const c = cxAt(s.z), lim = M.W / 2 + 2.5; if (Math.abs(s.x - c) > lim) { const sg = Math.sign(s.x - c); s.x = c + sg * lim; s.yaw = lerp(s.yaw, -sg * .5, dt * 4); s.v *= Math.pow(.6, dt); }
    let gy = hAt(s.x, s.z);
    // ramps
    let onR = null; for (const o of obs) { const sc = o.sc || 1; if (o.kind === 'ramp' && s.z > o.z - .2 && s.z < o.z + 7.6 * sc && Math.abs(s.x - o.x) < 2.8 * (o.sw || 1)) { onR = o; break; } }
    if (onR) { const sc = onR.sc || 1, t = clamp((s.z - onR.z) / (7 * sc), 0, 1); gy = onR.ramp.g.position.y + 1.7 * (onR.sh || 1) * t * t; s.onRamp = onR; if (t >= .999) { s.y = gy; launch((5.5 + s.v * .33) * (onR.mega ? 1.2 : 1)); A.voice('wow', 1.4); return; } }
    else if (s.onRamp) { const o = s.onRamp; s.onRamp = null; if (s.z >= o.z + 6.5 * (o.sc || 1)) { launch((5.5 + s.v * .33) * (o.mega ? 1.2 : 1)); return; } }
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
function grindStart(o) { const s = RS; s.grind = o; s.grindT = 0; s.air = false; s.vy = 0; s.spin = nearest(s.spin, S.gear === 'board' ? Math.PI : TAU); s.flip = nearest(s.flip, TAU); document.body.classList.remove('air'); A.tone(320, .1, 'square', .04); A.loopOn('grind', 'bandpass', 3200, 6, .05); buzz(15); gmsg(o.box ? T('📦 החלקה על קופסה!', '📦 Box slide!') : T('🛤️ החלקה על מעקה!', '🛤️ Rail slide!'), '#ffd23a'); }
function grindEnd() { const s = RS, o = s.grind; if (!o) return; s.grind = null; A.loopOff('grind'); if (s.grindT < .2) return; const nm = o.box ? 'BOX SLIDE' : S.gear === 'board' ? (s.grindT > 1.6 ? 'LONG BOARDSLIDE' : 'BOARDSLIDE') : (s.grindT > 1.6 ? 'LONG RAIL SLIDE' : 'RAIL SLIDE'); scoreTrick([nm], Math.round(120 + s.grindT * 230)); if (typeof chalEv === 'function') chalEv('grind', s.grindT); }
const EV = { t: 22, aval: null, yeti: null, cine: 0, avDone: 0 };
function evReset() { EV.t = rnd(18, 30); EV.aval = null; EV.yeti = null; EV.cine = 0; EV.avDone = 0; if (yetiG) yetiG.visible = false; if (avalG) avalG.visible = false; A.loopOff('aval'); $('aval').hidden = true; }
function startYeti() { if (!yetiG) yetiG = mkYeti(); const s = RS, side = Math.random() < .5 ? -1 : 1, z = s.z + 48, x = cxAt(z) + side * (M.W / 2 + 5); EV.yeti = { x, z, side, ph: 'come', t: 0, passed: 0 }; yetiG.visible = true; yetiG.position.set(x, hAt(x, z), z); gmsg(T('👣 יטי!!! התחמקו ממנו!', '👣 YETI!!! Dodge him!'), '#bfe8ff'); A.noise(1.1, 'lowpass', 300, 1, .3, 0, 90); A.tone(110, .8, 'sawtooth', .07, 0, 70); buzz([60, 40, 60]); }
function yetiTick(dt) { const y = EV.yeti, s = RS; if (!y) return; y.t += dt; const g = yetiG.userData;
  if (y.ph === 'come') { const tx = s.x + Math.sin(s.yaw) * 6; y.x += clamp(tx - y.x, -1, 1) * 7.5 * dt; y.z += s.v * .5 * dt; if (s.z > y.z + 2) { y.ph = 'chase'; y.t = 0; gmsg(T('👣 היטי רודף אחריכם – סעו מהר!', '👣 The yeti is chasing you – go fast!'), '#bfe8ff'); } }
  else if (y.ph === 'chase') { y.z += (s.v + (y.t < 2.5 ? 2.2 : -6)) * dt; y.x = lerp(y.x, s.x, dt * 1.5); if (y.t > 4.5 || y.z < s.z - 25) { y.ph = 'gone'; if (s.crash <= 0) { scoreTrick([T('ברחתם מהיטי!', 'ESCAPED THE YETI')], 600); if (typeof chalEv === 'function') chalEv('yeti'); } } }
  else { y.z -= 3 * dt; if (y.t > 3 || y.z < s.z - 40) { EV.yeti = null; yetiG.visible = false; return; } }
  const gy = hAt(y.x, y.z), run = Math.sin(y.t * 11); yetiG.position.set(y.x, gy + Math.abs(run) * .25, y.z); yetiG.rotation.y = Math.atan2(s.x - y.x, s.z - y.z); g.arms.forEach((a, i) => a.rotation.x = (i ? 1 : -1) * run * .9 - .4); g.legs.forEach((l, i) => l.rotation.x = (i ? -1 : 1) * run * .8);
  if (Math.random() < .5) FX.emit(V3(y.x + rnd(-.6, .6), gy + .1, y.z), V3(rnd(-1, 1), rnd(1, 2.5), rnd(-1, 1)), [.95, .97, 1], .16, .5, 7, .7);
  if (y.ph !== 'gone' && s.crash <= 0 && s.inv <= 0 && Math.hypot(y.x - s.x, y.z - s.z) < 1.7 && s.y - gy < 2.4) { crash(T('היטי תפס אתכם! 👣', 'The yeti got you! 👣')); y.ph = 'gone'; y.t = 0; A.noise(.8, 'lowpass', 200, 1, .3); } }
function startAval() { if (!avalG) avalG = mkAval(); EV.aval = { d: 34, t: 0 }; EV.avDone = 1; EV.cine = 2; avalG.visible = true; $('aval').hidden = false; trickTxt(T('⚠️ מפולת שלגים!<small>ברחו מהר במורד ההר!</small>', '⚠️ AVALANCHE!<small>Race down the mountain!</small>'), true); A.loopOn('aval', 'lowpass', 140, .6, .14); A.noise(2.5, 'lowpass', 160, 1, .35, 0, 60); buzz([100, 50, 100, 50, 200]); }
function avalTick(dt) { const a = EV.aval, s = RS; if (!a) return; a.t += dt; const wallV = M.vMax * .82; if (EV.cine <= 0) a.d += (s.v - wallV) * dt + (a.t > 14 ? 9 * dt : 0); a.d = Math.min(a.d, 60); const z = s.z - a.d, c = cxAt(z); avalG.position.set(c, hAt(c, z) - 4, z); $('avalF').style.width = clamp(1 - a.d / 40, 0, 1) * 100 + '%';
  shake = Math.max(shake, clamp(1 - a.d / 30, 0, 1) * .5); if (a.d < 16) for (let i = 0; i < 4; i++) FX.emit(V3(s.x + rnd(-8, 8), s.y + rnd(0, 5), s.z - rnd(3, 9)), V3(rnd(-2, 2), rnd(-.5, 1.5), s.v + rnd(4, 9)), [.95, .97, 1], rnd(.15, .35), .9, 0, .7);
  if (a.d <= 0 && s.crash <= 0) { crash(T('נבלעתם במפולת! ❄️', 'Swallowed by the avalanche! ❄️')); a.d = 26; }
  if (a.t > 14 && a.d > 45) { EV.aval = null; avalG.visible = false; $('aval').hidden = true; A.loopOff('aval'); if (s.crash <= 0) scoreTrick([T('ברחתם מהמפולת!', 'OUTRAN THE AVALANCHE')], 900); if (typeof chalEv === 'function') chalEv('aval'); } }
function evTick(dt) { if (mode === 'race' || mode === 'slalom') return; yetiTick(dt); avalTick(dt); if (EV.yeti || EV.aval) return; EV.t -= dt; if (EV.t > 0 || RS.z < 150) return; EV.t = rnd(20, 34); const f = typeof forcedEv === 'function' ? forcedEv() : null; if (f === 'yeti' || (!f && (EV.avDone || Math.random() < .55))) startYeti(); else startAval(); }
function scoreTrick(parts, pts) { const s = RS; s.combo = s.comboT > 0 ? Math.min(5, s.combo + 1) : 1; chalEv('combo', s.combo); s.comboT = 4; pts *= s.combo; s.score += pts; s.tricks++; if (pts > s.bestP) { s.bestP = pts; s.best = parts.join(' + '); }
  const nm = parts.join(' '); if (!S.book) S.book = {}; const fresh = !S.book[nm]; if (fresh) { S.book[nm] = 1; S.save(); } trickTxt(`${fresh ? '📖 ' + T('טריק חדש!', 'NEW TRICK!') + '<br>' : ''}${nm}<small>+${pts}${s.combo > 1 ? '  ×' + s.combo : ''}</small>`); A.tone(880, .1, 'triangle', .07); A.tone(1320, .14, 'triangle', .06, .08); return nm; }
function land(gy) { const s = RS; s.air = false; s.y = gy; s.gv = 0; document.body.classList.remove('air'); const spinStep = S.gear === 'board' ? Math.PI : TAU;
  const es = Math.abs(s.spin - nearest(s.spin, spinStep)), ef = Math.abs(s.flip - nearest(s.flip, TAU));
  for (let q = 0; q < 18; q++) FX.emit(V3(s.x + rnd(-.8, .8), gy + .15, s.z + rnd(-.8, .8)), V3(rnd(-3, 3), rnd(1.5, 4.5), rnd(-3, 3)), [.95, .97, 1], .17, .7, 9, .7);
  if (es > 1.15 || ef > 1.05) { crash(T('נחיתה עקומה!', 'Bad landing!')); return; }
  s.spin = nearest(s.spin, spinStep); s.flip = nearest(s.flip, TAU); s.crouch = 1; A.noise(.18, 'lowpass', 600, 1, .14); buzz(20);
  const spins = Math.round(s.spinTot / Math.PI), flips = Math.round(s.flipTot / TAU), grab = s.grabT > .3; let pts = 0; const parts = []; const GR = ['INDY', 'MUTE', 'MELON', 'TAIL', 'NOSE']; const gn = GR[Math.floor(s.grabT * 7 + spins) % GR.length];
  if (flips && spins >= 2) { parts.push((flips > 1 ? 'DOUBLE ' : '') + 'RODEO ' + spins * 180); pts += flips * 320 + spins * 90 + 150; }
  else { if (flips) { parts.push((flips > 1 ? (flips === 2 ? 'DOUBLE ' : 'TRIPLE ') : '') + 'BACKFLIP'); pts += flips * 320; } if (spins) { parts.push(spins * 180 + ''); pts += spins * 90; } }
  if (grab) { parts.push(gn); pts += Math.round(s.grabT * 160) + (parts.length > 1 ? 100 : 0); }
  if (s.airT > 1.1) { pts += Math.round(s.airT * 50); if (!parts.length) parts.push('BIG AIR'); }
  s.lastAirN = REC.length - (s.airN0 || REC.length); if (rpCool <= 0 && state === 'play' && (flips >= 2 || spins >= 4 || (flips && spins >= 2) || s.airT > 2.2)) RP = { pending: .55 };
  chalEv('air', { spins, flips, grab, airT: s.airT, n: (flips ? 1 : 0) + (spins ? 1 : 0) + (grab ? 1 : 0) });
  if (pts) { s.combo = s.comboT > 0 ? Math.min(5, s.combo + 1) : 1; chalEv('combo', s.combo); s.comboT = 4; pts *= s.combo; s.score += pts; s.tricks++; if (pts > s.bestP) { s.bestP = pts; s.best = parts.join(' + '); }
    const nm = parts.join(' '); if (!S.book) S.book = {}; const fresh = !S.book[nm]; if (fresh) { S.book[nm] = 1; S.save(); }
    trickTxt(`${fresh ? '📖 ' + T('טריק חדש!', 'NEW TRICK!') + '<br>' : ''}${nm}<small>+${pts}${s.combo > 1 ? '  ×' + s.combo : ''}</small>`);
    if (RUN.kind === 'career' && !RUN.ok && RUN.g[2] === 'trick' && nm.includes(RUN.g[3])) { RUN.ok = 1; setTimeout(() => { if (state === 'play') endRun(); }, 900); } A.tone(880, .1, 'triangle', .07); A.tone(1320, .14, 'triangle', .06, .08); if (flips || spins >= 2) A.voice('yay', S.who ? 1.5 : 1.1); }
  else if (s.airT > .5) A.tone(660, .08, 'triangle', .04); }
function crash(msg) { const s = RS; if (s.crash > 0 || s.inv > 0) return; s.crash = 1.3; s.air = false; s.combo = 0; s.falls++; document.body.classList.remove('air'); trickTxt(msg, true); A.noise(.7, 'lowpass', 420, 1, .32); A.voice('aww', S.who ? 1.45 : 1.05); buzz([70, 40, 70]); shake = .7;
  for (let q = 0; q < 40; q++) FX.emit(V3(s.x + rnd(-1, 1), s.y + .4, s.z + rnd(-1, 1)), V3(rnd(-4, 4), rnd(2, 7), rnd(-1, 5)), [.95, .97, 1], .2, 1, 10, .8);
  if (mode === 'nofall') setTimeout(() => endRun(), 1300); }
function collide() { const s = RS; if (s.crash > 0) return;
  for (const o of obs) { const dz = o.z - s.z; if (dz < -3 || dz > 3) continue;
    if (o.kind === 'msg') { if (!o.done && dz < 0) { o.done = 1; toast(o.txt, 2600); } continue; }
    if (o.kind === 'gem') { if ((o.x - s.x) ** 2 + dz * dz < 2.6 && Math.abs(o.y - (s.y + .9)) < 1.8) { unplace(o.P, o.i); o.P = null; o.kind = 'x'; s.gems++; s.score += 25; chalEv('gem', 1); A.tone(1500 + (s.gems % 6) * 110, .1, 'triangle', .06); A.tone(2200, .08, 'sine', .04, .05); FX.burst(V3(o.x, o.y, o.z), 8, [[1.2, 2.6, 3]], 3, .12, .5, 3); } continue; }
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
function camUpdate(dt, snap) { const s = RS; if (EV.cine > 0 && EV.aval) { const z = s.z - EV.aval.d; camera.position.set(s.x + 6, s.y + 4.5, s.z + 14); camera.lookAt(s.x, s.y + 3 + (1 - EV.cine / 2) * 3, s.z - EV.aval.d * .45); camera.fov = 62; camera.updateProjectionMatrix(); sky.position.copy(camera.position); peaks.position.set(camera.position.x, camera.position.y * .9, camera.position.z); return; } if (camLock) { sky.position.copy(camera.position); peaks.position.set(camera.position.x, camera.position.y * .9, camera.position.z); return; } camYaw = lerp(camYaw, s.yaw * .55, Math.min(1, dt * 2.5)); const back = s.air ? 6.4 : 5.4, up = s.air ? 3.2 : 2.7;
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
  poseRider(r, { sit: s.sit, lean: s.lean, crouch: s.crouch, grab: s.air && (s.rgrab ?? grabIn()), air: s.air, fall: crashing, t: performance.now() / 1000, speed: s.v }, dt); }

/* ================= RACE RIVALS ================= */
let DUEL = null; const RIVN = [['KAI', '#2a8aff'], ['ZOE', '#ff5ab0'], ['RIO', '#ffb21a']]; let RIV = [];
function rivTag(txt, col) { const c = document.createElement('canvas'); c.width = 256; c.height = 80; const x = c.getContext('2d'); x.fillStyle = 'rgba(10,10,20,.7)'; x.beginPath(); x.roundRect(8, 10, 240, 60, 30); x.fill(); x.fillStyle = col; x.beginPath(); x.arc(42, 40, 14, 0, TAU); x.fill(); x.fillStyle = '#fff'; x.font = '900 34px Arial'; x.textBaseline = 'middle'; x.fillText(txt, 66, 42);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, transparent: true })); sp.scale.set(1.35, .42, 1); return sp; }
function clearRivals() { RIV.forEach(r => scene.remove(r.R.root)); RIV = []; }
function makeRivals() { clearRivals(); const lanes = [-3.6, 3.6, 0];
  RIVN.forEach(([n, col], k) => { const ci = k === 1 ? 1 : 0; const o = { jacket: (k * 3 + 2) % JACKETS.length, pants: (k * 2 + 1) % PANTS.length, head: [1, 4, 2][k] % HEADS.length, eyes: [1, 0, 2][k] % EYES.length, hair: k % HAIRS.length, gear: k + 1 };
    const gear = k === 2 ? 'board' : 'ski'; const R = buildRider(ci, o, gear); scene.add(R.root); const tag = rivTag(n, col); tag.position.y = 2.35; R.root.add(tag);
    const z = k === 2 ? 10 : 6.5, x = cxAt(z) + lanes[k]; RIV.push({ R, n, col, k, gear, x, z, y: hAt(x, z), v: 8, yaw: 0, lean: 0, crouch: .3, air: false, vy: 0, spin: 0, lane: lanes[k], f: [.95, .91, .87][k], fin: 0, bt: 0 }); });
  poseRivals(.016); }
function stepRivals(dt) { const len = DUEL ? DUEL.len : MODES.race.len;
  for (const r of RIV) {
    if (r.fin) { r.v *= Math.pow(.5, dt); }
    else { const gap = r.z - RS.z; let vt = M.vMax * r.f * (gap > 40 ? .84 : gap > 15 ? .93 : gap < -40 ? 1.12 : gap < -15 ? 1.05 : 1); r.v = lerp(r.v, vt, dt * (vt > r.v ? .35 : 1)); }
    // steer: follow the course, dodge obstacles ahead, weave a little
    let tx = cxAt(r.z + 12) + r.lane + Math.sin(r.z * .03 + r.k * 2) * 2.4;
    for (const o of obs) { if (o.deco || !o.r || o.kind === 'gem' || o.kind === 'ramp' || o.kind === 'gate') continue; if (o.z > r.z && o.z < r.z + 16 && Math.abs(tx - o.x) < o.r + 1.4) tx = o.x + (tx >= o.x ? 1 : -1) * (o.r + 1.8); }
    const want = clamp((tx - r.x) * .25, -.7, .7); r.yaw = lerp(r.yaw, want, dt * 2.2); r.lean = lerp(r.lean, -want * .9, dt * 4); r.crouch = lerp(r.crouch, .3 + Math.min(1, r.v / 30) * .3, dt * 3);
    r.x += Math.sin(r.yaw) * r.v * dt; r.z += Math.cos(r.yaw) * r.v * dt; const c = cxAt(r.z), lim = M.W / 2 + 1.5; r.x = clamp(r.x, c - lim, c + lim);
    if (!r.air) { r.y = hAt(r.x, r.z); for (const o of obs) if (o.kind === 'ramp' && r.z > o.z + 5.5 && r.z < o.z + 7.6 && Math.abs(r.x - o.x) < 2.6) { r.air = true; r.vy = 5.5 + r.v * .3; r.spinDir = Math.random() < .5 ? -1 : 1; r.y = hAt(o.x, o.z) + (o.ramp.g.position.y - hAt(o.x, o.z)) + 1.7; break; } }
    else { r.vy -= G * dt; r.y += r.vy * dt; r.spin += r.spinDir * 7 * dt; const gy = hAt(r.x, r.z); if (r.y <= gy && r.vy < 0) { r.air = false; r.y = gy; r.spin = Math.round(r.spin / (r.gear === 'board' ? Math.PI : TAU)) * (r.gear === 'board' ? Math.PI : TAU); FX.burst && FX.burst(V3(r.x, r.y + .2, r.z), 12, [[1, 1, 1]], 3, .1, .5, 2); } }
    if (!r.air) r.spin = lerp(r.spin, Math.round(r.spin / (r.gear === 'board' ? Math.PI : TAU)) * (r.gear === 'board' ? Math.PI : TAU), dt * 8);
    if (!r.fin && r.z >= len) { r.fin = 1; r.ft = RS.time; if (!RS.fin) gmsg('🏁 ' + r.n + ' ' + T('סיים!', 'finished!'), r.col); }
    // spray
    if (!r.air && r.v > 8 && Math.random() < .4) FX.emit(V3(r.x, r.y + .1, r.z - .5), V3(rnd(-1.5, 1.5), 1 + Math.random(), -2), [.95, .97, 1], .12, .45, 7, .65);
    // bump with the player
    const dx = RS.x - r.x, dz = RS.z - r.z, d = Math.hypot(dx, dz); if (d < 1.15 && d > .01 && !RS.air && !r.air) { const push = (1.15 - d) * .5; RS.x += dx / d * push; r.x -= dx / d * push; r.bt -= dt; if (r.bt <= 0) { r.bt = .7; A.noise(.12, 'lowpass', 700, 1, .08); } }
  }
  poseRivals(dt); }
function poseRivals(dt) { for (const r of RIV) { const R = r.R; R.root.position.set(r.x, r.y, r.z); const tilt = r.air ? 0 : Math.atan2(hAt(r.x, r.z - 1) - hAt(r.x, r.z + 1), 2) * .9;
  R.root.rotation.set(0, 0, 0); R.root.rotateY(r.yaw + r.spin); R.root.rotateX(-tilt); R.root.rotateZ(-r.lean);
  const near = Math.abs(r.z - RS.z) < 120; R.root.visible = near; if (near) poseRider(R, { lean: r.lean, crouch: r.crouch, air: r.air, grab: r.air && r.k === 1, t: performance.now() / 1000 + r.k, speed: r.v }, dt); } }
/* ================= FREE RIDE: pop-up challenges & duels ================= */
const CH = { cur: null, next: 12, done: 0 };
const CHALS = [
  { id: '720', t: () => T('נחתו סיבוב 720°', 'Land a 720° spin'), ev: 'air', ok: a => a.spins * 180 >= 720 }, { id: 'flip', t: () => T('נחתו סלטה אחורה', 'Land a backflip'), ev: 'air', ok: a => a.flips >= 1 },
  { id: 'grabspin', t: () => T('סיבוב + גראב באותה קפיצה', 'Spin + grab in one jump'), ev: 'air', ok: a => a.spins >= 2 && a.grab }, { id: 'bigair', t: () => T('הישארו באוויר 1.5 שניות', 'Stay in the air 1.5 seconds'), ev: 'air', ok: a => a.airT >= 1.5 },
  { id: 'grind', t: () => T('החליקו על מעקה 1.5 שניות', 'Slide a rail for 1.5 seconds'), ev: 'grind', ok: v => v >= 1.5, force: 'park' }, { id: 'gems', t: () => T('אספו 12 קריסטלים', 'Collect 12 crystals'), ev: 'gem', cnt: 12 },
  { id: 'combo', t: () => T('הגיעו לקומבו ×3', 'Reach a ×3 combo'), ev: 'combo', ok: v => v >= 3 }, { id: 'yeti', t: () => T('ברחו מהיטי', 'Escape the yeti'), ev: 'yeti', force: 'yeti' }, { id: 'aval', t: () => T('ברחו מהמפולת', 'Outrun the avalanche'), ev: 'aval', force: 'aval' }];
function chalHud() { const c = CH.cur, el = $('chal'); if (!c) { el.hidden = true; return; } el.hidden = false; el.innerHTML = `⚡ ${c.d.t()}` + (c.d.cnt ? ` <b>${c.prog}/${c.d.cnt}</b>` : '') + ` <i>${Math.ceil(c.left)}″</i>`; }
function chalEv(type, v) { const c = CH.cur; if (!c || c.done || c.d.ev !== type) return; let ok; if (c.d.cnt) { c.prog += v || 1; ok = c.prog >= c.d.cnt; } else ok = c.d.ok ? c.d.ok(v) : true; chalHud(); if (!ok) return;
  c.done = 1; CH.done++; RS.score += 300; trickTxt(T('✅ אתגר הושלם! +300', '✅ Challenge done! +300')); [784, 988, 1175, 1568].forEach((f, i) => A.tone(f, .16, 'triangle', .07, i * .08)); buzz([20, 30, 60]); $('chal').classList.add('ok');
  setTimeout(() => { $('chal').classList.remove('ok'); if (CH.cur === c) { CH.cur = null; chalHud(); } CH.next = 8; if (CH.done % 3 === 0 && state === 'play') { state = 'pause'; openChest({ kind: 'silver', title: T('🎁 תיבה על 3 אתגרים!', '🎁 Chest for 3 challenges!'), prizes: makePrizes('silver'), A, onDone: () => { state = 'play'; } }); } }, 1500); }
function forcedEv() { const c = CH.cur; if (!c || c.done || !c.d.force || c.forced) return null; if (c.d.force === 'park') { c.forced = 1; parkZ = -1e9; return null; } c.forced = 1; return c.d.force; }
function chalTick(dt) { if (mode !== 'free' || RUN.kind !== 'normal') return; const c = CH.cur; if (c && !c.done) { c.left -= dt; if (c.left <= 0) { CH.cur = null; gmsg(T('⏱️ האתגר נגמר', '⏱️ Challenge over'), '#ffb08a'); CH.next = 6; } chalHud(); return; }
  if (c || DUEL || EV.aval || EV.yeti) return; CH.next -= dt; if (CH.next > 0) return; if (!RIV.length && RS.z > 300 && Math.random() < .3) { duelInvite(); CH.next = 30; return; }
  const pool = CHALS.filter(d => !CH.last || d.id !== CH.last); const d = pool[Math.floor(Math.random() * pool.length)]; CH.last = d.id; CH.cur = { d, prog: 0, left: d.force ? 60 : 45 }; if (d.force && d.force !== 'park') EV.t = Math.min(EV.t, 4); chalHud(); trickTxt(T('⚡ אתגר חדש!', '⚡ New challenge!') + `<small>${d.t()}</small>`); A.tone(660, .15, 'triangle', .07); A.tone(990, .2, 'triangle', .07, .12); }
function duelInvite() { const k = Math.floor(Math.random() * RIVN.length); DUEL = { inv: k }; state = 'pause'; $('dT').textContent = `🆚 ${RIVN[k][0]} ${T('מזמין/ה אתכם למרוץ!', 'challenges you to a race!')}`; $('dP').textContent = T('מי שמגיע ראשון לדגל הסיום – 450 מטר למטה. הפרס: תיבת אוצר 🎁', 'First to the finish flag – 450 m down. Prize: a treasure chest 🎁'); $('duelSheet').hidden = false; A.tone(392, .2, 'square', .05); A.tone(523, .3, 'square', .05, .18); }
function duelStart() { $('duelSheet').hidden = true; const k = DUEL.inv, [n, col] = RIVN[k]; const o = { jacket: (k * 3 + 2) % JACKETS.length, pants: (k * 2 + 1) % PANTS.length, head: [1, 4, 2][k] % HEADS.length, eyes: [1, 0, 2][k] % EYES.length, hair: k % HAIRS.length, gear: k + 1 }; const gear = k === 2 ? 'board' : 'ski';
  const Rr = buildRider(k === 1 ? 1 : 0, o, gear); scene.add(Rr.root); const tag = rivTag(n, col); tag.position.y = 2.35; Rr.root.add(tag); const z = RS.z + 2, x = RS.x + (RS.x > cxAt(z) ? -3.4 : 3.4); RIV = [{ R: Rr, n, col, k, gear, x, z, y: hAt(x, z), v: RS.v, yaw: 0, lean: 0, crouch: .3, air: false, vy: 0, spin: 0, lane: x - cxAt(z), f: .97, fin: 0, bt: 0 }];
  DUEL.len = RS.z + 450; finish.visible = true; finish.position.set(cxAt(DUEL.len), hAt(cxAt(DUEL.len), DUEL.len), DUEL.len); state = 'play'; trickTxt(T('🔥 המרוץ התחיל!', '🔥 Race on!')); A.tone(880, .3, 'square', .06); }
function duelTick() { if (!DUEL || !DUEL.len) return; $('chal').hidden = false; const r = RIV[0], lead = RS.z >= (r ? r.z : 0); $('chal').innerHTML = `🆚 ${r ? r.n : ''} · ${Math.max(0, Math.ceil(DUEL.len - RS.z))}m · ${lead ? T('אתם מובילים! 🔥', 'You lead! 🔥') : T('הוא לפניכם!', 'Ahead of you!')}`;
  if (RS.z >= DUEL.len) { const win = !r || !r.fin; const done = () => { clearRivals(); DUEL = null; finish.visible = false; $('chal').hidden = true; state = 'play'; CH.next = 10; }; if (win) { RS.score += 800; trickTxt(T('🏆 ניצחתם במרוץ! +800', '🏆 You won the race! +800')); [523, 659, 784, 1047].forEach((f, i) => A.tone(f, .25, 'triangle', .08, i * .1)); state = 'pause'; setTimeout(() => openChest({ kind: 'gold', title: T('פרס על הניצחון!', 'Victory prize!'), prizes: makePrizes('gold'), A, onDone: done }), 900); } else { trickTxt(`${r.n} ${T('ניצח הפעם…', 'won this time…')}`, true); done(); } } }
const racePlace = () => 1 + RIV.filter(r => r.fin ? !RS.fin || r.ft <= (RS.finT ?? 1e9) : r.z > RS.z).length;

/* ================= HUD + FLOW ================= */
const fmt = t => { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };
function trickTxt(h, bad) { const d = document.createElement('div'); d.innerHTML = h; if (bad) d.className = 'bad'; $('trick').innerHTML = ''; $('trick').appendChild(d); }
let gmT = 0; function gmsg(t, col) { const g = $('gmsg'); g.textContent = t; g.style.color = col || '#fff'; gmT = 1.1; }
function hud() { const s = RS; $('spdTxt').textContent = Math.round(s.v * 3.3);
  if (mode === 'slalom') { $('h1').textContent = fmt(s.time); $('h1s').textContent = T('זמן', 'time'); $('h2').textContent = `${s.gates}/${Math.max(gateN, 1)}`; $('h2s').textContent = T('שערים', 'gates'); $('prog').firstChild.style.width = clamp(s.z / MODES.slalom.len, 0, 1) * 100 + '%'; }
  else if (mode === 'race') { const pl = racePlace(); $('h1').textContent = pl + '/' + (RIV.length + 1); $('h1s').textContent = T('מקום', 'place'); $('h2').textContent = Math.max(0, Math.ceil(MODES.race.len - s.z)) + 'm'; $('h2s').textContent = T('לסיום', 'to go'); $('prog').firstChild.style.width = clamp(s.z / MODES.race.len, 0, 1) * 100 + '%'; }
  else { $('h1').textContent = s.score; $('h1s').textContent = T('נקודות', 'points'); $('h2').textContent = Math.floor(s.z) + 'm'; $('h2s').textContent = mode === 'nofall' ? `${T('שיא', 'best')}: ${S.best[mi + mode] || 0}` : `❄️ ${s.gems}`; } }
function setupRun(preview) { let mt = S.mt; RUN = { kind: 'normal' }; mode = preview ? 'free' : S.mode; if (!preview && S.mode === 'career') { const st = STAGES[S.stage || 0]; RUN = { kind: 'career', i: S.stage || 0, g: st }; mode = st[1]; mt = st[0]; } else if (!preview && S.mode === 'daily') { const dd = DAILY(); RUN = { kind: 'daily', goal: dd.goal, T: 90 }; mode = 'free'; mt = dd.mt; } else if (mode === 'career' || mode === 'daily') mode = 'free'; resetRS(); buildWorld(mt, preview); makeRider(); if (mode === 'race' && !preview) makeRivals(); else clearRivals(); trkZ = 0; trkI = 0; clearTracks(); camYaw = 0; RS.yaw = 0; camUpdate(0, true); poseWorld(.1); }
let cdT = 0;
function start() { A.ac(); $('loading').hidden = false; setTimeout(() => { setupRun(false); $('loading').hidden = true; $('title').hidden = true; $('wardS').hidden = true; document.body.classList.remove('ward');
  $('hud').hidden = $('spd').hidden = false; const tc = ctlTouch(); $('zones').hidden = tc; $('tpad').hidden = !tc; $('bJump').hidden = $('bFlip').hidden = $('bGrab').hidden = tc; $('prog').hidden = mode !== 'slalom' && mode !== 'race'; $('endSheet').hidden = true; $('trick').innerHTML = ''; if (RUN.kind === 'career') setTimeout(() => toast('🏅 ' + T('שלב', 'Stage') + ' ' + (RUN.i + 1) + ': ' + goalTxt(RUN.g), 3800), 400); if (RUN.kind === 'daily') setTimeout(() => toast('📅 ' + T(`90 שניות – צברו ${RUN.goal} נקודות!`, `90 seconds – score ${RUN.goal} points!`), 3800), 400);
  setWeather(); if (WX === 'blizzard') setTimeout(() => toast(T('🌨️ סופת שלג! הראות נמוכה – שימו לב', '🌨️ Blizzard! Low visibility – watch out'), 2600), 3800); else if (WX === 'aurora') setTimeout(() => toast(T('🌌 זוהר צפוני בשמיים!', '🌌 Northern lights in the sky!'), 2600), 3800); state = 'lift'; cdT = 3.2; startLift(); hud(); A.loopOn('wind', 'bandpass', 700, .6, .03, .15); A.loopOn('carve', 'highpass', 2800, .8, .0); A.startMusic({ chords: M.night ? [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 43, 47]] : [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]], bpm: 112, lead: true, kick: true, vol: .8 });
  if (!S.tut) { S.tut = 1; S.save(); setTimeout(() => toast(isTouch ? T('גע בצד שמאל/ימין כדי לפנות • ⤴ קפיצה • באוויר: החזיקו צד = סיבוב, 🔄 = סלטה, ✋ = גראב', 'Touch left/right to turn • ⤴ jump • In the air: hold a side = spin, 🔄 = flip, ✋ = grab') : T('חיצים לפנייה • רווח לקפיצה • באוויר: ←/→ סיבוב, ↑ סלטה, ↓ גראב', 'Arrows to turn • Space to jump • In the air: ←/→ spin, ↑ flip, ↓ grab'), 6000), 3400); } }, 30); }
function cdTick(dt) { const b = Math.ceil(cdT); cdT -= dt; const a = Math.ceil(cdT); if (a !== b && a >= 0 && a <= 3) { $('cd').innerHTML = `<b>${a > 0 ? a : 'GO!'}</b>`; A.tone(a > 0 ? 440 : 880, a > 0 ? .15 : .4, 'square', .06); } if (cdT <= 0) { state = 'play'; setTimeout(() => $('cd').innerHTML = '', 700); } }
function endRun() { if (state === 'done') return; state = 'done'; A.loopOff('wind'); A.loopOff('carve'); A.stopMusic(); const s = RS; const key = mi + mode; let st = 0, rows = [], title = '', emo = '';
  if (mode === 'slalom') { const total = s.time; const par = MODES.slalom.len / (M.vMax * .62); st = s.missed === 0 && total < par * 1.12 ? 3 : s.missed <= 2 ? 2 : 1; if ((S.stars[mi] || 0) < st) S.stars[mi] = st; const nb = !S.best[key] || total < S.best[key]; if (nb) S.best[key] = +total.toFixed(1);
    title = T('הגעתם לסיום!', 'Finished!'); emo = '🏁'; rows = [[T('זמן', 'Time'), fmt(total)], [T('שערים', 'Gates'), `${s.gates}/${gateN}`], [T('שיא', 'Best'), fmt(S.best[key]) + (nb ? ' 🆕' : '')], [T('טריקים', 'Tricks'), s.score]]; }
  else if (mode === 'race') { const pl = RS.fin ? racePlace() : RIV.length + 1; st = [3, 2, 1, 0][pl - 1] || 0; const won = pl === 1; if ((S.stars['race' + mi] || 0) < st) S.stars['race' + mi] = st; const nb = won && (!S.best[key] || s.time < S.best[key]); if (nb) S.best[key] = +s.time.toFixed(1);
    title = won ? T('ניצחתם במרוץ! 🏆', 'You won the race! 🏆') : RS.fin ? T('סיימתם במקום ' + pl, 'You finished ' + ['1st', '2nd', '3rd', '4th'][pl - 1]) : T('המרוץ נגמר', 'Race over'); emo = ['🥇', '🥈', '🥉', '🏁'][pl - 1] || '🏁';
    rows = [[T('מקום', 'Place'), ['🥇', '🥈', '🥉', '4️⃣'][pl - 1] + ' ' + pl + '/' + (RIV.length + 1)], [T('זמן', 'Time'), fmt(s.time)], [T('שיא ניצחון', 'Best win'), S.best[key] ? fmt(S.best[key]) + (nb ? ' 🆕' : '') : '—'], [T('נקודות טריקים', 'Trick points'), s.score]]; }
  else if (mode === 'nofall') { const sc = Math.floor(s.z) + s.score; const nb = sc > (S.best[key] || 0); if (nb) S.best[key] = sc; st = sc > 3000 ? 3 : sc > 1500 ? 2 : sc > 600 ? 1 : 0; title = nb ? T('שיא חדש! 🎉', 'New record! 🎉') : T('נפלתם!', 'Wipeout!'); emo = nb ? '🏆' : '😵';
    rows = [[T('מרחק', 'Distance'), Math.floor(s.z) + 'm'], [T('נקודות טריקים', 'Trick points'), s.score], [T('סה״כ', 'Total'), sc], [T('שיא', 'Best'), S.best[key]]]; }
  else { const sc = s.score; if (sc > (S.best[key] || 0)) S.best[key] = sc; st = sc > 4000 ? 3 : sc > 1800 ? 2 : sc > 500 ? 1 : 0; title = T('איזו גלישה!', 'What a ride!'); emo = '🏂'; rows = [[T('נקודות', 'Points'), sc], [T('מרחק', 'Distance'), Math.floor(s.z) + 'm'], [T('קריסטלים', 'Crystals'), s.gems], [T('הטריק הכי טוב', 'Best trick'), s.best || '—']]; }
  if (RUN.kind === 'career') { const g = RUN.g; let ok = !!RUN.ok; if (g[2] === 'miss') ok = s.fin && s.missed <= g[3]; if (ok) { st = 3; title = T('השלב הושלם! 🎉', 'Stage clear! 🎉'); emo = '🏅'; S.stage = Math.min(STAGES.length - 1, Math.max(S.stage || 0, RUN.i + 1)); if (!S.cdone) S.cdone = {}; S.cdone[RUN.i] = 1; if (RUN.i === STAGES.length - 1) title = T('אלופי ההר! 🏆', 'Mountain champion! 🏆'); } else { st = 0; title = T('כמעט! נסו שוב', 'Almost! Try again'); emo = '💪'; } rows.unshift([T('שלב', 'Stage') + ' ' + (RUN.i + 1), goalTxt(g) + (ok ? ' ✅' : ' ❌')]); }
  if (RUN.kind === 'daily') { const sc = s.score, d = today(); if (!S.daily || S.daily.d !== d) S.daily = { d, best: 0 }; const nb = sc > S.daily.best; if (nb) S.daily.best = sc; st = sc >= RUN.goal * 1.5 ? 3 : sc >= RUN.goal ? 2 : sc >= RUN.goal * .5 ? 1 : 0; title = sc >= RUN.goal ? T('אתגר היום הושלם! 🎉', 'Daily challenge done! 🎉') : T('המסלול היומי', 'Daily slope'); emo = '📅'; rows = [[T('נקודות', 'Points'), sc], [T('יעד', 'Goal'), RUN.goal], [T('שיא היום', 'Today’s best'), S.daily.best + (nb ? ' 🆕' : '')], [T('הטריק הכי טוב', 'Best trick'), s.best || '—']]; }
  S.save(); $('eE').textContent = emo; $('eT').textContent = title; $('eStars').querySelectorAll('i').forEach((e, i) => { e.className = i < st ? 'on' : ''; e.style.animationDelay = i * .2 + 's'; });
  $('eRes').innerHTML = rows.map(r => `<li><span>${r[0]}</span><b>${r[1]}</b></li>`).join(''); { let cb = $('eChest'); if (!cb) { cb = document.createElement('button'); cb.id = 'eChest'; cb.className = 'btn pri'; cb.style.cssText = 'width:100%;margin:4px 0 8px;height:56px;font-size:20px;background:linear-gradient(180deg,#ffd23a,#ff8a1a);color:#3a1a00;box-shadow:0 5px 0 #8a4a00'; $('eRes').after(cb); } const kind = st >= 3 ? 'gold' : st >= 1 ? 'silver' : 'wood'; cb.hidden = false; cb.textContent = '🎁 ' + T('פתחו את התיבה!', 'Open the chest!'); cb.onclick = () => { cb.hidden = true; openChest({ kind, prizes: makePrizes(kind), A, onDone: () => { previewRider && 0; } }); }; } setTimeout(() => { $('endSheet').hidden = false; if (st >= 2) { A.voice('yay', S.who ? 1.5 : 1.1); FX.burst(V3(RS.x, RS.y + 2, RS.z + 3), 60, [[2.4, .6, 1], [.4, 1.6, 2.6], [2.6, 2.2, .4]], 6, .14, 2, 5); } }, 600); }
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
  if (S.mode === 'career') { const cur = S.stage || 0; $('mts').innerHTML = STAGES.map((g, k) => `<button class="${(S.stage || 0) === k ? 'on' : ''}${k > cur ? ' lk' : ''}" data-st="${k}"><i>${(S.cdone || {})[k] ? '✅' : k > cur ? '🔒' : MTS[g[0]].ic}</i>${T('שלב', 'Stage')} ${k + 1}<small>${g[2] === 'trick' ? '🤸' : g[2] === 'miss' ? '🚩' : g[2] === 'dist' ? '💪' : '⭐'}</small></button>`).join('');
    $('tHint').textContent = '🏅 ' + T('שלב', 'Stage') + ' ' + (cur + 1) + ': ' + goalTxt(STAGES[cur]) + ' · ' + T('טריקים שגיליתם:', 'Tricks discovered:') + ' 📖 ' + Object.keys(S.book || {}).length;
    $('mts').querySelectorAll('[data-st]').forEach(b => b.onclick = () => { const k = +b.dataset.st; if (k > (S.stage || 0) && !(S.cdone || {})[k]) { toast(T('סיימו קודם את השלב הקודם 🔒', 'Finish the previous stage first 🔒')); return; } S.stage = k; S.save(); A.tone(900, .06, 'triangle', .05); renderTitle(); }); }
  else if (S.mode === 'daily') { const dd = DAILY(); const b = S.daily && S.daily.d === today() ? S.daily.best : 0; $('mts').innerHTML = `<button class="on" style="grid-column:1/-1"><i>${MTS[dd.mt].ic}</i>${MTS[dd.mt].n}<small>🎯 ${dd.goal} · 🏆 ${b}</small></button>`; $('tHint').textContent = T('90 שניות על ההר של היום – כמה נקודות תצברו? מחר מסלול חדש!', '90 seconds on today’s mountain – how many points can you score? New slope tomorrow!'); }
  else $('mts').innerHTML = MTS.map((m, k) => { const b = S.best[k + S.mode]; const sub = S.mode === 'slalom' ? '★'.repeat(S.stars[k] || 0) + '☆'.repeat(3 - (S.stars[k] || 0)) : b ? '🏆 ' + b : ''; return `<button class="${S.mt === k ? 'on' : ''}" data-k="${k}"><i>${m.ic}</i>${m.n}<small>${sub || '&nbsp;'}</small></button>`; }).join('');
  if (S.mode !== 'career' && S.mode !== 'daily') $('tHint').textContent = S.mode === 'slalom' ? T('עוברים בין כל זוג דגלים – שער שפספסתם = 3 שניות קנס', 'Ski between every pair of flags – a missed gate costs 3 seconds') : S.mode === 'nofall' ? T('כמה רחוק תגיעו בלי ליפול? המהירות עולה ככל שמתקדמים', 'How far can you go without falling? Speed rises as you go') : T('קופצים מרמפות, עושים סלטות וסיבובים ואוספים קריסטלים ❄️', 'Hit ramps, do flips and spins and collect crystals ❄️');
  $('goBtn').textContent = T('▶ יוצאים לגלוש!', '▶ Let’s ride!');
  $('who').querySelectorAll('[data-k]').forEach(b => b.onclick = () => { S.who = +b.dataset.k; S.save(); A.ac(); A.tone(700, .06, 'triangle', .05); previewRider(); renderTitle(); });
  $('wdBtn').onclick = () => openWard();
  $('gearSeg').querySelectorAll('button').forEach(b => b.onclick = () => { S.gear = b.dataset.g; S.save(); A.tone(760, .06, 'triangle', .05); previewRider(); renderTitle(); });
  $('modeSeg').querySelectorAll('button').forEach(b => b.onclick = () => { S.mode = b.dataset.m; S.save(); A.tone(820, .06, 'triangle', .05); renderTitle(); });
  $('mts').querySelectorAll('[data-k]').forEach(b => b.onclick = () => { S.mt = +b.dataset.k; S.save(); A.tone(900, .06, 'triangle', .05); setupPreview(); renderTitle(); }); }
function setupPreview() { mode = 'free'; resetRS(); RS.z = 30; RS.x = cxAt(30); buildWorld(S.mt, true); RS.y = hAt(RS.x, RS.z); previewRider(); }
function previewRider() { makeRider(); RS.y = hAt(RS.x, RS.z); poseWorld(1); }
const TRAILS = [['none', T('בלי', 'None'), '🚫'], ['#ff5ab0', T('ורוד', 'Pink'), '💗'], ['#5ae8ff', T('קרח', 'Ice'), '❄️'], ['#ffd23a', T('זהב', 'Gold'), '⭐'], ['#7aff5a', T('ליים', 'Lime'), '🍀'], ['#b04aff', T('גלקסיה', 'Galaxy'), '🌌'], ['rainbow', T('קשת', 'Rainbow'), '🌈']];
if (!S.own) { S.own = {}; S.out.forEach(o => { if (o.gear >= 3) S.own['gear' + o.gear] = 1; }); }
const locked = (tab, k) => (tab === 'gear' && k >= 3 || tab === 'trail' && k >= 1) && !S.own[tab + k];
function makePrizes(kind) { const n = kind === 'gold' ? 3 : kind === 'silver' ? 2 : 1; const pool = []; GEARS.forEach((g, k) => { if (locked('gear', k)) pool.push(['gear', k]); }); TRAILS.forEach((t, k) => { if (locked('trail', k)) pool.push(['trail', k]); });
  const out = []; for (let i = 0; i < n && pool.length; i++) { const [tab, k] = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; S.own[tab + k] = 1; S.out[S.who][tab] = k;
    out.push(tab === 'gear' ? { ic: S.gear === 'board' ? '🏂' : '⛷️', name: GEARS[k][2], sub: T('עיצוב חדש לקרש ולמגלשיים', 'New board & ski design'), isNew: 1 } : { ic: TRAILS[k][2], name: TRAILS[k][1], sub: T('שובל קסם חדש מאחוריכם', 'New magic trail behind you'), isNew: 1 }); }
  if (!out.length) out.push({ ic: '🏆', name: T('אספתם הכול!', 'You collected everything!'), sub: T('אלופי האוסף', 'Collection champion') }); S.save(); return out; }
const WTABS = [['jacket', '🧥', T('מעיל', 'Jacket')], ['pants', '👖', T('מכנסיים', 'Pants')], ['head', '🧢', T('ראש', 'Head')], ['eyes', '🥽', T('משקפיים', 'Goggles')], ['hair', '💇', T('שיער', 'Hair')], ['gear', '🎨', T('עיצוב ציוד', 'Gear art')], ['trail', '✨', T('שובל', 'Trail')]];
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
  if (wTab === 'trail') items = TRAILS.map(t => [sw(t[0] === 'rainbow' ? 'linear-gradient(90deg,#ff3a3a,#ffe14a,#3ad86a,#2a8aff,#9a3aff)' : t[0] === 'none' ? 'rgba(255,255,255,.15)' : t[0], t[2]), t[1]]);
  if (wTab === 'gear') items = GEARS.map(g => [sw(g[0] === 'rainbow' ? 'linear-gradient(90deg,#ff3a3a,#ffe14a,#3ad86a,#2a8aff,#9a3aff)' : `linear-gradient(90deg,${g[0]},${g[1]},${g[0]})`), g[2]]);
  $('wgrid').innerHTML = items.map((it, k) => `<button class="${(o[wTab] || 0) === k ? 'on' : ''}" data-k="${k}" style="${locked(wTab, k) ? 'opacity:.45' : ''}">${it[0]}${locked(wTab, k) ? '🔒 ' : ''}${it[1]}</button>`).join('');
  $('wtabs').querySelectorAll('button').forEach(b => b.onclick = () => { wTab = b.dataset.t; renderWard(); });
  $('wgrid').querySelectorAll('button').forEach(b => b.onclick = () => { if (locked(wTab, +b.dataset.k)) { toast(T('🎁 זוכים בזה בתיבה אחרי גלישה!', '🎁 Win this from a chest after a run!')); return; } o[wTab] = +b.dataset.k; S.save(); A.tone(880 + Math.random() * 200, .06, 'triangle', .05); previewRider(); renderWard(); }); }
$('wX').onclick = () => { $('wardS').hidden = true; document.body.classList.remove('ward'); A.tone(990, .08, 'triangle', .05); };
function showTitle() { state = 'title'; A.loopOff('wind'); A.loopOff('carve'); A.stopMusic(); $('title').hidden = false; $('hud').hidden = $('spd').hidden = $('zones').hidden = $('prog').hidden = $('tpad').hidden = true; $('bJump').hidden = $('bFlip').hidden = $('bGrab').hidden = true; $('endSheet').hidden = $('pauseSheet').hidden = true; $('trick').innerHTML = ''; document.body.classList.remove('air'); setupPreview(); renderTitle(); }
$('goBtn').onclick = () => start();
$('helpBtn').textContent = '❓ ' + T('איך משחקים', 'How to play'); $('hT').textContent = T('איך גולשים', 'How to ride'); $('hX').textContent = T('יאללה לגלוש!', 'Let’s ride!');
$('hB').innerHTML = T(`🏔️ <b>גולשים לבד במורד ההר</b> – אין גז ואין ברקס, ההר עושה את העבודה.<br>👆 <b>פנייה:</b> לוחצים ומחזיקים בצד שמאל או ימין של המסך.<br>⤴ <b>קפיצה:</b> הכפתור הירוק. רמפות כחולות מעיפות גבוה!<br>🌀 <b>באוויר:</b> מחזיקים צד = סיבוב 360°, 🔄 = סלטה אחורה, ✋ = גראב.<br>🛬 <b>נחיתה:</b> צריך לנחות ישר – אם עוזבים את הכפתורים לפני הנחיתה, הגולש מתיישר לבד.<br>❄️ <b>קריסטלים</b> נותנים נקודות, ו<b>קומבו</b> של טריקים ברצף מכפיל!<br>🌲 נזהרים מעצים, סלעים ואנשי שלג.<br>🚩 <b>מסלול שערים:</b> עוברים בין הדגלים. 💪 <b>בלי ליפול:</b> נפילה אחת וזהו.`, `🏔️ <b>You ride down the mountain by yourself</b> – no gas, no brakes, gravity does the work.<br>👆 <b>Turn:</b> press and hold the left or right side of the screen.<br>⤴ <b>Jump:</b> the green button. Blue ramps launch you high!<br>🌀 <b>In the air:</b> hold a side = 360° spin, 🔄 = backflip, ✋ = grab.<br>🛬 <b>Landing:</b> land straight – let go of the buttons before landing and your rider straightens out.<br>❄️ <b>Crystals</b> give points, and a <b>combo</b> of tricks in a row multiplies them!<br>🌲 Watch out for trees, rocks and snowmen.<br>🚩 <b>Slalom:</b> ski between the flags. 💪 <b>No-fall:</b> one fall and you’re out.`);
$('hB').innerHTML += T('<br>👆 <b>שליטה במגע</b> (מחליפים בכפתור 🎮 בתפריט): גוררים לצדדים לפנייה, מעיפים למעלה לקפיצה, באוויר גרירה = סיבוב, החלקה למטה = סלטה, הקשה = גראב.<br>🛹 <b>פארק טריקים:</b> מחליקים על מעקות וקופסאות וקופצים מרמפות ענק.<br>⚠️ <b>מפולת ויטי:</b> לפעמים צריך לברוח! 🔀 בצומת בוחרים: מערת קרח או קפיצת צוק.<br>⚡ <b>אתגרים ומרוצים</b> קופצים תוך כדי גלישה חופשית – ומנצחים תיבות אוצר 🎁', '<br>👆 <b>Touch controls</b> (switch with the 🎮 button in the menu): drag sideways to turn, flick up to jump, in the air drag = spin, swipe down = flip, tap = grab.<br>🛹 <b>Trick park:</b> slide rails and boxes and hit giant kickers.<br>⚠️ <b>Avalanche & yeti:</b> sometimes you have to run! 🔀 At a fork pick: ice cave or cliff jump.<br>⚡ <b>Challenges and races</b> pop up during free ride – win treasure chests 🎁');
$('helpBtn').onclick = () => { $('helpSheet').hidden = false; }; $('hX').onclick = () => { $('helpSheet').hidden = true; };
$('pT').textContent = T('הפסקה', 'Paused'); $('pMenu').textContent = T('תפריט', 'Menu'); $('pGo').textContent = T('המשך ▶', 'Resume ▶'); $('eMenu').textContent = T('תפריט', 'Menu'); $('eAgain').textContent = T('🔁 שוב', '🔁 Again');
$('homeT').innerHTML = ICO.home('#ffffff'); hubButtons(['homeT'], A); qualityButton('qBtn', S);
$('dNo').onclick = () => { $('duelSheet').hidden = true; DUEL = null; state = 'play'; }; $('dYes').onclick = () => duelStart(); $('dNo').textContent = T('לא עכשיו', 'Not now'); $('dYes').textContent = T('יאללה! 🔥', 'Let\'s go! 🔥');
const ctlSync = () => $('ctlChip').textContent = ctlTouch() ? T('👆 שליטה: מגע', '👆 Controls: touch') : T('🎮 שליטה: כפתורים', '🎮 Controls: buttons'); ctlSync(); $('ctlChip').onclick = () => { S.ctl = ctlTouch() ? 'btn' : 'touch'; S.save(); ctlSync(); A.tone(820, .06, 'triangle', .05); toast(ctlTouch() ? T('👆 גוררים את האצבע לצדדים כדי לפנות • מעיפים למעלה = קפיצה • באוויר: גרירה לצד = סיבוב, החלקה למטה = סלטה, הקשה = גראב', '👆 Drag sideways to turn • flick up = jump • in the air: drag sideways = spin, swipe down = flip, tap = grab') : T('🎮 לוחצים על צד שמאל/ימין כדי לפנות, וכפתורים לקפיצה, סלטה וגראב', '🎮 Press left/right to turn, buttons for jump, flip and grab'), 4200); };
const sndSync = () => $('sndChip').textContent = S.mute ? T('🔇 צליל כבוי', '🔇 Sound off') : T('🔊 צליל', '🔊 Sound'); sndSync(); $('sndChip').onclick = () => { A.setMute(!S.mute); S.save(); sndSync(); };
$('bJump').querySelector('small').textContent = T('קפיצה', 'jump');

/* ================= LOOP ================= */
let last = performance.now(), flT = 0;
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.04, (now - last) / 1000); last = now; A.tick(); skyU.t.value = now / 1000; aurora.children.forEach(p => p.material.uniforms.t.value = now / 1000); aurora.position.set(camera.position.x, 0, camera.position.z);
  if (state === 'title') { tAng += dt * .25; const s = RS; const r = innerWidth < innerHeight ? 5.6 : 4.4, ph = Math.sin(tAng) * .5 + (S.gear === 'board' ? .8 : .35); if (!camLock) { camera.position.set(s.x + Math.sin(ph) * r, s.y + 1.7, s.z + Math.cos(ph) * r); camera.lookAt(s.x, s.y + (innerWidth < innerHeight ? -.12 : .7), s.z); } camera.fov = 50; camera.updateProjectionMatrix();
    sky.position.copy(camera.position); peaks.position.set(camera.position.x, camera.position.y * .9, camera.position.z); sun.position.set(s.x + M.sunDir[0] * 40, s.y + 40, s.z + M.sunDir[2] * 40); sun.target.position.set(s.x, s.y, s.z); poseRider(rider, { lean: Math.sin(now / 900) * .15, crouch: .25, t: now / 1000 }, dt); }
  else if (RS) { if (state === 'count') { cdTick(dt); RS.lean = 0; }
    if (state === 'lift') liftTick(dt); if (state === 'replay') replayTick(dt);
    if (state === 'play') { step(dt); evTick(dt); chalTick(dt); duelTick(); recFrame(); rpCool -= dt; if (RP && RP.pending != null) { RP.pending -= dt; if (RP.pending <= 0) { RP = null; startReplay(); } } if (RS.comboT > 0) RS.comboT -= dt; spawnUntil(RS.z + 240); cullBehind(RS.z); updTerrain(RS.z); hud();
      if (RUN.kind === 'career' && !RUN.ok) { const g = RUN.g; if ((g[2] === 'score' && RS.score >= g[3]) || (g[2] === 'dist' && RS.z >= g[3])) { RUN.ok = 1; endRun(); } }
      if (RUN.kind === 'daily') { const left = RUN.T - RS.time; if (left <= 0) endRun(); else if (Math.ceil(left) !== RUN.lastS) { RUN.lastS = Math.ceil(left); if ([30, 10, 5, 3, 2, 1].includes(RUN.lastS)) trickTxt('⏱️ ' + RUN.lastS); } }
      if (mode === 'race' && RS.z >= MODES.race.len && !RS.fin) { RS.fin = 1; RS.finT = RS.time; A.tone(784, .2, 'triangle', .08); A.tone(1046, .3, 'triangle', .08, .15); A.tone(1568, .4, 'triangle', .07, .3); endRun(); }
      if (mode === 'slalom' && RS.z >= MODES.slalom.len && !RS.fin) { RS.fin = 1; A.tone(784, .2, 'triangle', .08); A.tone(1046, .3, 'triangle', .08, .15); A.tone(1568, .4, 'triangle', .07, .3); endRun(); } }
    if (state === 'done') { RS.v *= Math.pow(.4, dt); RS.z += RS.v * dt * Math.cos(RS.yaw); RS.x += RS.v * dt * Math.sin(RS.yaw); if (!RS.air && RS.crash <= 0) RS.y = hAt(RS.x, RS.z); else if (RS.air) step(dt); }
    if (RIV.length) { if (state === 'play' || state === 'done') stepRivals(dt); else poseRivals(dt); }
    if (state !== 'lift' && state !== 'replay') camUpdate(dt); poseWorld(dt); }
  if (gmT > 0) { gmT -= dt; if (gmT <= 0) $('gmsg').textContent = ''; }
  // gems spin
  const t = now / 1000; for (const o of obs) if (o.kind === 'gem' && o.P && o.z > (RS ? RS.z - 5 : 0) && o.z < (RS ? RS.z + 70 : 80)) { _q.setFromEuler(_e.set(0, t * 2.5 + o.x, 0)); _m.compose(_p.set(o.x, o.y + Math.sin(t * 2.4 + o.z) * .15, o.z), _q, _s.set(1, 1, 1)); o.P.m.setMatrixAt(o.i, _m); o.P.m.instanceMatrix.needsUpdate = true; }
  // gentle snowfall around the camera (kept thin so it never hides the slope)
  const fp = flGeo.attributes.position.array; const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z; const sp = RS ? RS.v : 0;
  for (let i = 0; i < FL; i++) { let y = fp[i * 3 + 1] - dt * (WX === 'blizzard' ? 4.5 : WX === 'snow' ? 2.4 : 1.6), z = fp[i * 3 + 2] - dt * sp * .25, x = fp[i * 3] + Math.sin(t + i) * dt * .4 + (WX === 'blizzard' ? -dt * 9 : WX === 'snow' ? -dt * 1.5 : 0); if (x < -30) x += 60; if (y < -6) y += 30; if (z < -8) z += 70; fp[i * 3] = x; fp[i * 3 + 1] = y; fp[i * 3 + 2] = z; }
  flakes.position.set(cx, cy, cz); flGeo.attributes.position.needsUpdate = true;
  crowdTick(now / 1000); FX.update(dt); E.render(); }
addEventListener('resize', () => E.resize());
E.resize(); setupPreview(); showTitle(); setTimeout(() => { $('loading').hidden = true; requestAnimationFrame(frame); window.__skiOK = true; }, 30);
window.__ski = { renderer, get WX() { return WX; }, setWeather, endLift, startReplay, REC, get RPs() { return RP; }, CH, chalEv, duelInvite, duelStart, get DUEL() { return DUEL; }, finish, spawnFork, startYeti, startAval, EV, spawnPark, TCH, inp, cxAt, get obsL() { return obs; }, get riv() { return RIV; }, get rs() { return RS; }, get state() { return state; }, endRun: () => endRun(), get rider() { return rider; }, lockCam(v) { camLock = v; }, camera, freeze() { state = 'pause'; }, crash, pause, resume, sim(n, dt, f) { state = 'play'; for (let k = 0; k < n; k++) { if (f) f(inp, k); if (state !== 'play') break; step(dt); evTick(dt); chalTick(dt); duelTick(); recFrame(); rpCool -= dt; if (RS.comboT > 0) RS.comboT -= dt; spawnUntil(RS.z + 240); cullBehind(RS.z); updTerrain(RS.z); if (mode === 'slalom' && RS.z >= MODES.slalom.len && !RS.fin) { RS.fin = 1; endRun(); } if (RIV.length) stepRivals(dt); if (mode === 'race' && RS.z >= MODES.race.len && !RS.fin) { RS.fin = 1; RS.finT = RS.time; endRun(); } } camUpdate(.016, true); poseWorld(.1); hud(); return { z: RS.z, x: RS.x, y: RS.y, v: RS.v, air: RS.air, score: RS.score, falls: RS.falls, gems: RS.gates, tricks: RS.tricks, best: RS.best, gates: RS.gates, missed: RS.missed, time: RS.time, state }; }, doJump, get RS() { return RS; }, get state() { return state; }, start, setupRun, S, step, launch, land, obs: () => obs, endRun, renderTitle, openWard, previewRider, hAt, cxAt };
