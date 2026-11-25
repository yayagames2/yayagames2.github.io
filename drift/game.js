import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { carModel } from '../lib/carkit.js';
import { THREE, $, V3, C, clamp, lerp, rnd, rng, T, EN, store, engine, studioEnv, std, particles, audio, toast, ICO, hubButtons, qualityButton, isTouch, CONFETTI, SND_ON, SND_OFF } from '../lib/kit.js';
const S = store('drift-save', { coins: 0, stars: {}, best: {}, car: 0, owned: [0], paint: {}, smoke: 0, smokes: [0], ev: 0, assist: 1, tut: 0 });
const E = engine(S, { fov: 60, far: 1400, bloom: [.28, .5, 1.05], exposure: 1.0, vignette: .28, sat: 1.12 });
const { scene, camera, renderer } = E; studioEnv(E, '#f4f0ff', '#4a4060', .45);
const A = audio(S); const SP = particles(E, 600, true); const CF = particles(E, 500);
const TAU = Math.PI * 2; const wrapPi = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };
const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
const fmtN = n => Math.round(n).toLocaleString('en-US');

/* ================= DATA ================= */
const TRACKS = [
  { n: T('נמל השקיעה', 'Sunset Docks'), ic: '🌅', pts: [[0, 0], [90, -6], [140, 22], [150, 80], [112, 118], [70, 98], [34, 128], [-22, 140], [-76, 108], [-88, 52], [-56, 14]], sky: ['#3a2a6a', '#ff9a5a'], sun: '#ffb070', sunI: 2.0, sunDir: [-.7, .25, -.6], cloud: '#ffd0c0', fog: '#e8907a', fogN: 120, fogF: 640, ground: 'concrete', night: 0, hemi: ['#ffd0b0', '#4a3a5a', .9] },
  { n: T('מעבר ההרים', 'Mountain Pass'), ic: '🏔️', pts: [[0, 0], [100, -10], [152, 38], [126, 90], [166, 140], [116, 192], [32, 172], [4, 122], [-58, 150], [-112, 104], [-94, 32], [-44, 8]], sky: ['#2a7ae0', '#cfe8ff'], sun: '#fff6e4', sunI: 3.0, sunDir: [.5, .75, .35], fog: '#bcd8f0', fogN: 140, fogF: 720, ground: 'grass', night: 0, hemi: ['#dff0ff', '#4a6a3a', 1.0] },
  { n: T('עיר הניאון', 'Neon City'), ic: '🌃', pts: [[0, 0], [118, 0], [142, 24], [142, 98], [120, 120], [64, 120], [42, 142], [42, 188], [20, 210], [-62, 210], [-84, 188], [-84, 22], [-62, 0]], sky: ['#06041a', '#3a1a5a'], sun: '#9ab0ff', sunI: .55, sunDir: [.3, .8, .4], fog: '#1a0e30', fogN: 90, fogF: 520, ground: 'city', night: 1, hemi: ['#6a5aaa', '#1a1028', .3] }];
const EVENTS = [
  { t: 0, laps: 2, need: 0 }, { t: 1, laps: 2, need: 2 }, { t: 2, laps: 2, need: 4 }, { t: 0, laps: 2, rev: 1, need: 6 },
  { t: 1, laps: 2, rev: 1, need: 9 }, { t: 2, laps: 2, rev: 1, need: 12 }, { t: 0, laps: 3, need: 15, hard: 1 }, { t: 2, laps: 3, rev: 1, need: 18, hard: 1 }];
const STARQ = [4000, 12000, 26000];
const CARS = [
  { n: 'ROOKIE', m: 'hatchback-sports', d: T('האצ׳בק ספורט קליל – קל לשליטה', 'Light sport hatch – easy to handle'), max: 34, acc: 15, grip: 8.5, dg: 1.7, kick: 1.25, price: 0 },
  { n: 'KAZE 86', m: 'sedan-sports', d: T('קופה יפנית קלאסית – נולדה לדריפט', 'Classic Japanese coupe – born to drift'), max: 40, acc: 17, grip: 8.2, dg: 1.45, kick: 1.45, price: 600 },
  { n: 'TAXI', m: 'taxi', d: T('מונית צהובה משוגעת – הרבה כוח', 'A crazy yellow cab – lots of power'), max: 44, acc: 20, grip: 7.6, dg: 1.3, kick: 1.6, price: 1500 },
  { n: 'POLICE', m: 'police', d: T('ניידת עם אורות מהבהבים – הכי מהירה', 'Cop car with flashing lights – the fastest'), max: 50, acc: 24, grip: 8.8, dg: 1.5, kick: 1.5, price: 3200, siren: 1 }];
const PAINTS = ['orig', '#f0f2f6', '#e8202a', '#1a1c22', '#ffb21a', '#1a6aff', '#2ad86a', '#ff5ab8', '#8a3aff', '#2ae0e0', '#ff7a1a'];
const SMOKES = [[.92, .92, .95], [1, .35, .55], [.35, .6, 1], [.45, 1, .5], [1, .85, .3], [.75, .45, 1]];
const SMOKEP = [0, 150, 150, 200, 200, 300];

/* ================= SKY / LIGHTS ================= */
const skyM = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { a: { value: C('#3a9aff') }, b: { value: C('#cdeeff') }, sd: { value: V3(.4, .7, -.5).normalize() }, sc: { value: C('#fff4dc') }, st: { value: 0 }, cl: { value: 1 }, cc: { value: C('#ffffff') } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'uniform vec3 a; uniform vec3 b; uniform vec3 sd; uniform vec3 sc; uniform float st; uniform float cl; uniform vec3 cc; varying vec3 vD; float h(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453); } float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); } float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y); } float fbm(vec2 p){ float v=0., m=.5; for(int i=0;i<5;i++){ v+=vn(p)*m; p*=2.03; m*=.5; } return v; } void main(){ float t=clamp(vD.y*1.5,0.,1.); vec3 c=mix(b,a,pow(t,.6)); float s=max(dot(vD,sd),0.); c+=sc*(pow(s,700.)*5.+pow(s,10.)*.3); if(cl>0. && vD.y>0.){ vec2 cp=vD.xz/(vD.y+.12)*1.6; float n=fbm(cp); float k=smoothstep(.5,.78,n)*smoothstep(.0,.2,vD.y)*cl; vec3 ccol=mix(cc*.8,cc,smoothstep(.5,.9,n))+sc*pow(s,6.)*.4; c=mix(c,ccol,k*.85); } if(st>0.){ vec3 q=floor(vD*260.); float r=h(q); c+=vec3(step(.996,r)*smoothstep(0.,.3,vD.y))*st; } gl_FragColor=vec4(c,1.); }' });
scene.add(new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), skyM));
const hemi = new THREE.HemisphereLight('#fff', '#444', 1); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff', 3); sun.castShadow = true; const sm = E.q === 'ultra' ? 2048 : 1024; sun.shadow.mapSize.set(sm, sm); const sc = sun.shadow.camera; sc.left = sc.bottom = -26; sc.right = sc.top = 26; sc.near = 1; sc.far = 160; sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; scene.add(sun); scene.add(sun.target);
scene.fog = new THREE.Fog('#fff', 100, 600);

/* ================= TEXTURES ================= */
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c, rx = 1, ry = 1) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
function asphaltTex(night) { const c = cnv(512, 512), g = c.getContext('2d'); g.fillStyle = night ? '#202026' : '#34343a'; g.fillRect(0, 0, 512, 512); const r = rng(5);
  for (let i = 0; i < 26000; i++) { const v = r(); g.fillStyle = v < .5 ? `rgba(0,0,0,${r() * .22})` : `rgba(255,255,255,${r() * .09})`; g.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1 + r() * 2); }
  for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1 + r() * 2; g.beginPath(); let x = r() * 512, y = r() * 512; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += rnd(-30, 30); y += rnd(10, 40); g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(0,0,0,.07)'; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 40, 8 + r() * 20, r() * 3, 0, TAU); g.fill(); }
  for (let i = 0; i < 9; i++) { g.strokeStyle = 'rgba(10,10,12,.22)'; g.lineWidth = 6 + r() * 6; g.beginPath(); let x = 120 + r() * 270; g.moveTo(x, 0); g.bezierCurveTo(x + rnd(-60, 60), 170, x + rnd(-60, 60), 340, x + rnd(-30, 30), 512); g.stroke(); }
  g.fillStyle = night ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.88)'; g.fillRect(14, 0, 9, 512); g.fillRect(489, 0, 9, 512); return tex(c); }
function curbTex() { const c = cnv(64, 128), g = c.getContext('2d'); g.fillStyle = '#e8202a'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#f4f4f4'; g.fillRect(0, 64, 64, 64); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 0, 6, 128); return tex(c); }
function wallTex(kind) { const c = cnv(256, 64), g = c.getContext('2d');
  if (kind === 'tires') { g.fillStyle = '#1a1a1e'; g.fillRect(0, 0, 256, 64); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const x = i * 64 + 32 + (j ? 16 : 0) % 64, y = j * 32 + 16; g.fillStyle = (i + j) % 2 ? '#e8202a' : '#f4f4f4'; g.beginPath(); g.ellipse(x, y, 30, 15, 0, 0, TAU); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.ellipse(x, y, 13, 7, 0, 0, TAU); g.fill(); } }
  else { g.fillStyle = '#d8d8dc'; g.fillRect(0, 0, 256, 64); for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#e8202a' : '#f4f4f4'; g.fillRect(i * 64, 0, 64, 64); } g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 56, 256, 8); if (kind === 'neon') { g.fillStyle = '#1a1028'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#ff3aa8'; g.fillRect(0, 8, 256, 6); g.fillStyle = '#3ad8ff'; g.fillRect(0, 48, 256, 6); } }
  return tex(c); }
function groundTex(kind) { const c = cnv(512, 512), g = c.getContext('2d'); const r = rng(9);
  const base = { concrete: '#9a948a', grass: '#4a8a32', city: '#1e1a26' }[kind]; g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 20000; i++) { const v = r(); if (kind === 'grass') g.fillStyle = v < .5 ? `rgba(20,60,10,${r() * .35})` : `rgba(160,220,90,${r() * .25})`; else g.fillStyle = v < .5 ? `rgba(0,0,0,${r() * .15})` : `rgba(255,255,255,${r() * .08})`; g.fillRect(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 3); }
  if (kind !== 'grass') { g.strokeStyle = kind === 'city' ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.12)'; g.lineWidth = 2; for (let i = 0; i <= 512; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); } }
  return tex(c, 60, 60); }
function winTex() { const c = cnv(128, 256), g = c.getContext('2d'); g.fillStyle = '#0a0a14'; g.fillRect(0, 0, 128, 256); const r = rng(3); for (let y = 6; y < 256; y += 14) for (let x = 6; x < 128; x += 14) { const v = r(); g.fillStyle = v < .45 ? ['#ffe0a0', '#a0e0ff', '#ffb0e0'][(v * 7 | 0) % 3] : '#141420'; g.fillRect(x, y, 8, 9); } return tex(c); }
function zoneTex() { const c = cnv(128, 128), g = c.getContext('2d'); g.clearRect(0, 0, 128, 128); g.fillStyle = 'rgba(255,90,40,.06)'; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(255,80,40,.75)'; g.fillRect(0, 0, 10, 128); g.fillRect(118, 0, 10, 128); g.fillStyle = 'rgba(255,220,80,.45)'; for (const y of [10, 70]) { g.beginPath(); g.moveTo(24, y + 40); g.lineTo(64, y); g.lineTo(104, y + 40); g.lineTo(104, y + 52); g.lineTo(64, y + 14); g.lineTo(24, y + 52); g.fill(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; }
function checkerTex() { const c = cnv(128, 32), g = c.getContext('2d'); for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#111' : '#fff'; g.fillRect(i * 8, j * 8, 8, 8); } return tex(c); }
function bannerTex(txt, bg, fg) { const c = cnv(512, 64), g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 512, 64); g.fillStyle = fg; g.font = '900 42px Rubik,Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 256, 34); return tex(c); }
function barrierTex(night) { const c = cnv(64, 256), g = c.getContext('2d'); const r = rng(12); g.fillStyle = night ? '#2a2834' : '#d6d4ce'; g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${r() * .1})`; g.fillRect(r() * 64, r() * 256, 2, 2); }
  if (night) { g.fillStyle = '#ff3aa8'; g.fillRect(16, 0, 4, 256); g.fillStyle = '#3ad8ff'; g.fillRect(44, 0, 4, 256); } else { g.fillStyle = '#d8202a'; g.fillRect(12, 0, 40, 128); g.fillStyle = '#f6f6f6'; g.fillRect(12, 128, 40, 128); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, 64, 3); g.fillRect(0, 128, 64, 2); }
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, 6, 256); g.fillRect(58, 0, 6, 256); return tex(c); }
const FENCET = (() => { const c = cnv(64, 64), g = c.getContext('2d'); g.clearRect(0, 0, 64, 64); g.strokeStyle = '#fff'; g.lineWidth = 2.2; for (let i = -64; i < 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke(); g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 64, 0); g.stroke(); } g.fillRect(0, 0, 64, 3); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.4, 1); return t; })();
const asphalt = [asphaltTex(0), asphaltTex(1)], CURB = curbTex(), ZT = zoneTex();
const BEAMT = (() => { const c = cnv(64, 128), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(26, 128); g.lineTo(38, 128); g.lineTo(64, 0); g.lineTo(0, 0); g.fill(); return new THREE.CanvasTexture(c); })();
const GLOWT = (() => { const c = cnv(64, 64), g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();

/* ================= SMOKE (near-camera fade) ================= */
function smokeSys(max) { const g = new THREE.BufferGeometry(); const P = new Float32Array(max * 3), Cc = new Float32Array(max * 3), Sz = new Float32Array(max), Al = new Float32Array(max);
  for (const [n, a, k] of [['position', P, 3], ['aCol', Cc, 3], ['aSize', Sz, 1], ['aA', Al, 1]]) g.setAttribute(n, new THREE.BufferAttribute(a, k).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uPx: { value: 800 } },
    vertexShader: `attribute vec3 aCol; attribute float aSize; attribute float aA; uniform float uPx; varying vec3 vC; varying float vA; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); float d=-mv.z; gl_PointSize=min(aSize*uPx/max(.1,d), 260.); vC=aCol; vA=aA*smoothstep(3.5,10.,d); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 d=gl_PointCoord-.5; float r=length(d); if(r>.5) discard; float a=smoothstep(.5,.0,r); gl_FragColor=vec4(vC*(.85+.25*(1.-r*2.)), a*a*vA); }` });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 8; scene.add(pts); const L = [];
  E.onResize.push((w, h) => { mat.uniforms.uPx.value = h * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))); });
  return { L, emit(p, v, c, s0, s1, life, a) { if (L.length >= max) L.shift(); L.push({ p: p.clone(), v: v.clone(), c, s0, s1, life, max: life, a }); },
    update(dt) { let n = 0; for (let i = L.length - 1; i >= 0; i--) { const q = L[i]; q.life -= dt; if (q.life <= 0) { L.splice(i, 1); continue; } q.v.multiplyScalar(Math.pow(.2, dt)); q.v.y += .5 * dt; q.p.addScaledVector(q.v, dt); }
      for (const q of L) { const k = 1 - q.life / q.max; P[n * 3] = q.p.x; P[n * 3 + 1] = q.p.y; P[n * 3 + 2] = q.p.z; Cc[n * 3] = q.c[0]; Cc[n * 3 + 1] = q.c[1]; Cc[n * 3 + 2] = q.c[2]; Sz[n] = lerp(q.s0, q.s1, Math.sqrt(k)); Al[n] = q.a * Math.min(1, k * 6) * (1 - k); n++; }
      g.setDrawRange(0, n); for (const k of ['position', 'aCol', 'aSize', 'aA']) g.attributes[k].needsUpdate = true; } }; }
const SMK = smokeSys(E.q === 'low' ? 260 : 520);

/* ================= SKID MARKS ================= */
const SKN = 1800; const skidM = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const skid = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), skidM, SKN); skid.frustumCulled = false; skid.count = 0; scene.add(skid); let skI = 0;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = V3(), _p = V3();
function addSkid(a, b) { const d = b.clone().sub(a); const L = Math.hypot(d.x, d.z); if (L < .05 || L > 3) return; _p.copy(a).add(b).multiplyScalar(.5); _p.y = .025; _q.setFromAxisAngle(V3(0, 1, 0), Math.atan2(d.x, d.z)); _s.set(.26, 1, L + .04); _m.compose(_p, _q, _s); skid.setMatrixAt(skI, _m); skI = (skI + 1) % SKN; skid.count = Math.max(skid.count, skI === 0 ? SKN : skI); skid.instanceMatrix.needsUpdate = true; }
function clearSkids() { skid.count = 0; skI = 0; }

/* ================= TRACK ================= */
const HW = 7.5, WALL = HW + 3.4; let TRK = null, world = null;
function buildTrack(ev) { if (world) { scene.remove(world); world.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } world = new THREE.Group(); scene.add(world); clearSkids();
  const td = TRACKS[ev.t]; let pts = td.pts.map(([x, z]) => V3(x * 1.15, 0, z * 1.15)); if (ev.rev) pts = pts.reverse();
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal'); const len = curve.getLength(); const N = Math.round(len / 2); const P = curve.getSpacedPoints(N).slice(0, N);
  const Tn = [], Nn = []; for (let i = 0; i < N; i++) { const a = P[(i - 1 + N) % N], b = P[(i + 1) % N]; const t = b.clone().sub(a).normalize(); Tn.push(t); Nn.push(V3(-t.z, 0, t.x)); }
  const K = []; for (let i = 0; i < N; i++) { const a = Tn[(i - 5 + N) % N], b = Tn[(i + 5) % N]; K.push(Math.abs(wrapPi(Math.atan2(b.x, b.z) - Math.atan2(a.x, a.z)))); }
  // zones = sharpest corners
  const zones = []; const ord = [...K.keys()].sort((a, b) => K[b] - K[a]); for (const i of ord) { if (zones.length >= 3) break; if (zones.every(z => Math.min(Math.abs(z.c - i), N - Math.abs(z.c - i)) > 55) && i > 20 && i < N - 20) zones.push({ c: i, a: i - 14, b: i + 14 }); }
  const inZone = new Uint8Array(N); for (const z of zones) for (let i = z.a; i <= z.b; i++) inZone[(i + N) % N] = 1;
  TRK = { td, ev, P, T: Tn, N: Nn, n: N, len, zones, inZone };
  // fog/sky/light
  skyM.uniforms.a.value.set(td.sky[0]); skyM.uniforms.b.value.set(td.sky[1]); skyM.uniforms.sc.value.set(td.sun); skyM.uniforms.sd.value.set(...td.sunDir).normalize(); skyM.uniforms.st.value = td.night ? 1 : 0; skyM.uniforms.cl.value = td.night ? 0 : 1; skyM.uniforms.cc.value.set(td.cloud || '#ffffff');
  scene.fog.color.set(td.fog); scene.fog.near = td.fogN; scene.fog.far = td.fogF; hemi.color.set(td.hemi[0]); hemi.groundColor.set(td.hemi[1]); hemi.intensity = td.hemi[2]; sun.color.set(td.sun); sun.intensity = td.sunI;
  E.renderer.toneMappingExposure = 1.0;
  const ribbon = (o0, o1, y0, y1, uScale, mat, vScale = 1) => { const pos = [], uv = [], idx = []; let dist = 0; for (let i = 0; i <= N; i++) { const k = i % N; if (i > 0) dist += P[k].distanceTo(P[i - 1]); const p = P[k], n = Nn[k]; pos.push(p.x + n.x * o0, y0, p.z + n.z * o0, p.x + n.x * o1, y1, p.z + n.z * o1); uv.push(0, dist / uScale * vScale, 1, dist / uScale * vScale); if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.receiveShadow = true; world.add(m); return m; };
  const night = td.night; const road = new THREE.MeshPhysicalMaterial({ map: asphalt[night], roughness: night ? .5 : .82, metalness: 0, clearcoat: night ? .35 : 0, clearcoatRoughness: .3, envMapIntensity: night ? .25 : .4 });
  ribbon(HW, -HW, .01, .01, HW * 2, road).material.side = THREE.DoubleSide;
  const cm = std('#fff', { map: CURB, roughness: .6 }); ribbon(HW + 1.3, HW, .05, .05, 2.6, cm); ribbon(-HW, -HW - 1.3, .05, .05, 2.6, cm);
  // zones overlay
  for (const z of zones) { const pos = [], uv = [], idx = []; for (let i = z.a, j = 0; i <= z.b; i++, j++) { const k = (i + N) % N, p = P[k], n = Nn[k]; pos.push(p.x + n.x * HW, .03, p.z + n.z * HW, p.x - n.x * HW, .03, p.z - n.z * HW); uv.push(0, -j * .5, 3, -j * .5); if (i < z.b) { const a = j * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: ZT, transparent: true, opacity: .7, depthWrite: false, side: THREE.DoubleSide })); m.renderOrder = 2; world.add(m); z.mesh = m;
    for (const e of [z.a, z.b]) { const k = (e + N) % N; gate(P[k], Tn[k], Nn[k], bannerTex('DRIFT ZONE ×2', '#ff3a1a', '#ffe24a'), '#ff6a1a'); } }
  // walls
  const wk = night ? 'neon' : td.ground === 'grass' ? 'tires' : 'blocks'; const wm = std('#fff', { map: wallTex(wk), roughness: .7 }); if (night) { wm.emissive = C('#fff'); wm.emissiveMap = wm.map; wm.emissiveIntensity = .55; }
  const wallR = (o) => { const pos = [], uv = [], idx = []; let dist = 0; for (let i = 0; i <= N; i++) { const k = i % N; if (i > 0) dist += P[k].distanceTo(P[i - 1]); const p = P[k], n = Nn[k]; for (const y of [0, 1.05]) pos.push(p.x + n.x * o, y, p.z + n.z * o); uv.push(dist / 8, 0, dist / 8, 1); if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); const m = new THREE.Mesh(g, wm); m.material.side = THREE.DoubleSide; m.castShadow = m.receiveShadow = true; world.add(m); };
  const sweep = (prof, side, mat, vLen) => { const pos = [], uv = [], idx = []; const np = prof.length; let dist = 0;
    for (let i = 0; i <= N; i++) { const k = i % N; if (i > 0) dist += P[k].distanceTo(P[i - 1]); const p = P[k], n = Nn[k]; prof.forEach(([a, y], j) => { pos.push(p.x + n.x * side * a, y, p.z + n.z * side * a); uv.push(j / (np - 1), dist / vLen); });
      if (i < N) for (let j = 0; j < np - 1; j++) { const a = i * np + j, b = a + np; if (side > 0) idx.push(a, b, a + 1, a + 1, b, b + 1); else idx.push(a, a + 1, b, a + 1, b + 1, b); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; world.add(m); return m; };
  const D = WALL + .05; const jersey = [[D, 0], [D + .07, .08], [D + .2, .34], [D + .25, 1.0], [D + .47, 1.0], [D + .52, .34], [D + .65, .08], [D + .72, 0]];
  const jm = new THREE.MeshStandardMaterial({ map: barrierTex(night), roughness: .75 }); if (night) { jm.emissive = C('#fff'); jm.emissiveMap = jm.map; jm.emissiveIntensity = .5; }
  for (const sd of [1, -1]) sweep(jersey, sd, jm, 6);
  // catch fence behind barriers
  const fenceM = new THREE.MeshStandardMaterial({ map: FENCET, alphaTest: .45, side: THREE.DoubleSide, roughness: .5, metalness: .6, color: night ? '#8a8aa8' : '#c8ccd4' });
  for (const sd of [1, -1]) sweep([[D + 1.1, .9], [D + 1.1, 4.2]], sd, fenceM, 3);
  { const poles = []; for (let i = 0; i < N; i += 3) for (const sd of [1, -1]) { const p = P[i], n = Nn[i]; poles.push(new THREE.Matrix4().makeTranslation(p.x + n.x * sd * (D + 1.1), 2.1, p.z + n.z * sd * (D + 1.1))); }
    const pm = new THREE.InstancedMesh(new THREE.CylinderGeometry(.06, .06, 4.2, 6), std('#6a6e78', { metalness: .7, roughness: .4 }), poles.length); poles.forEach((m, i) => pm.setMatrixAt(i, m)); world.add(pm); }
  // ground
  const gm = std('#fff', { map: groundTex(td.ground), roughness: td.ground === 'city' ? .5 : .95 }); const gp = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2), gm); gp.position.y = -.05; gm.polygonOffset = true; gm.polygonOffsetFactor = 4; gm.polygonOffsetUnits = 8; gp.receiveShadow = true; world.add(gp);
  // start gantry
  const p0 = P[0], t0 = Tn[0], n0 = Nn[0]; const ck = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, 2.2).rotateX(-Math.PI / 2), std('#fff', { map: checkerTex(), roughness: .7 })); ck.position.set(p0.x, .035, p0.z); ck.rotation.y = Math.atan2(n0.x, n0.z) + Math.PI / 2; ck.material.map.repeat.set(2, 1); world.add(ck);
  gate(p0, t0, n0, bannerTex('DRIFT KING', '#111', '#ff3a6a'), '#ff3a6a', 1);
  scenery(td);
  // gifts
  GIFTS.length = 0; const r = rng(77 + ev.t * 7 + (ev.rev ? 3 : 0)); const GN = 10; for (let k = 0; k < GN; k++) { const i = Math.floor((k + .5) / GN * N) % N; const off = rnd(-4.5, 4.5) * (r() < .5 ? 1 : .6); const p = P[i].clone().addScaledVector(Nn[i], off); const g = giftMesh(k); g.position.copy(p).setY(1); world.add(g); GIFTS.push({ g, p, i, got: 0, ph: k }); }
  // minimap bg
  miniBg = null; return TRK; }
function gate(p, t, n, btex, col, big) { const g = new THREE.Group(); const pm = std('#2a2a32', { roughness: .4, metalness: .6 }); const w = WALL + .4;
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(.6, big ? 7 : 5.5, .6), pm); m.position.set(s * w, (big ? 7 : 5.5) / 2, 0); m.castShadow = true; g.add(m); }
  const bm = new THREE.MeshStandardMaterial({ map: btex, emissive: C('#fff'), emissiveMap: btex, emissiveIntensity: .7, roughness: .5 }); btex.repeat.set(1, 1); const b = new THREE.Mesh(new THREE.BoxGeometry(w * 2 + .6, big ? 1.6 : 1.1, .4), [pm, pm, pm, pm, bm, bm]); b.position.y = big ? 6.4 : 5; g.add(b);
  const lm = new THREE.MeshBasicMaterial({ color: col }); for (let i = -3; i <= 3; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 6), lm); l.position.set(i * w / 3.4, (big ? 6.4 : 5) - (big ? .95 : .7), .25); g.add(l); }
  g.position.set(p.x, 0, p.z); g.rotation.y = Math.atan2(t.x, t.z); world.add(g); }
function clearOf(x, z, m) { const P = TRK.P; for (let i = 0; i < P.length; i += 2) { const dx = P[i].x - x, dz = P[i].z - z; if (dx * dx + dz * dz < m * m) return false; } return true; }
function scenery(td) { const r = rng(31 + TRACKS.indexOf(td)); const P = TRK.P; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of P) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  const rp = (pad) => V3(rnd(x0 - pad, x1 + pad), 0, rnd(z0 - pad, z1 + pad));
  const inst = (geo, mat, list, shadow = true) => { const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((m, i) => im.setMatrixAt(i, m)); im.castShadow = shadow; im.receiveShadow = true; world.add(im); return im; };
  const mk = (p, ry, sx, sy, sz) => new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), ry), V3(sx, sy, sz));
  // lamp posts along track (both)
  const lampP = [], lampH = []; const lampEvery = td.night ? 9 : 18; for (let i = 0; i < P.length; i += lampEvery) { const s = (i / lampEvery) % 2 ? 1 : -1; const p = P[i].clone().addScaledVector(TRK.N[i], s * (WALL + 1.6)); lampP.push(mk(p.clone().setY(4), 0, 1, 1, 1)); lampH.push(mk(p.clone().addScaledVector(TRK.N[i], -s * 1.2).setY(8), 0, 1, 1, 1)); }
  inst(new THREE.CylinderGeometry(.12, .16, 8, 8), std('#3a3a44', { metalness: .6, roughness: .4 }), lampP);
  inst(new THREE.BoxGeometry(.5, .25, 1.4), new THREE.MeshBasicMaterial({ color: td.night ? '#ffe8c0' : '#f8f8ff' }), lampH, false);
  if (td.ground === 'grass') { // pines + mountains
    const pine = [], oak = []; for (let k = 0; k < 700; k++) { const p = rp(140); if (!clearOf(p.x, p.z, WALL + 6)) continue; const s = rnd(3.2, 5.5); (r() < .75 ? pine : oak).push(mk(p, r() * 6, s, s * rnd(.9, 1.25), s)); }
    instGLB('tree-pine-large', pine); instGLB('tree-park-large', oak);
    const rocks = []; for (let k = 0; k < 160; k++) { const p = rp(60); if (!clearOf(p.x, p.z, WALL + 3)) continue; const s = rnd(.5, 1.8); rocks.push(mk(p.clone().setY(s * .3), r() * 6, s * rnd(1, 1.6), s, s)); } inst(new THREE.DodecahedronGeometry(1, 0), std('#8a8a84', { roughness: .95, flatShading: true }), rocks);
    const mm = std('#6a7a8a', { roughness: 1, flatShading: true }), snow = std('#ffffff', { roughness: .8, flatShading: true }); for (let k = 0; k < 14; k++) { const a = k / 14 * TAU, R = 520 + rnd(0, 150); const h = rnd(130, 240); const m = new THREE.Mesh(new THREE.ConeGeometry(rnd(140, 220), h, 7), mm); m.position.set(Math.cos(a) * R + (x0 + x1) / 2, h / 2 - 5, Math.sin(a) * R + (z0 + z1) / 2); world.add(m); const s2 = new THREE.Mesh(new THREE.ConeGeometry(m.geometry.parameters.radius * .32, h * .32, 7), snow); s2.position.copy(m.position).setY(h - 5 - h * .16 + .5); world.add(s2); } }
  else if (td.ground === 'concrete') { // containers + cranes + water
    const cols = ['#c8402a', '#2a6ab8', '#e8a020', '#3a9a5a', '#8a3a8a', '#d8d8d8']; const byC = cols.map(() => []); for (let k = 0; k < 260; k++) { const p = rp(70); if (!clearOf(p.x, p.z, WALL + 9)) continue; const ry = r() < .5 ? 0 : Math.PI / 2; const st = 1 + Math.floor(r() * 3); for (let s = 0; s < st; s++) byC[Math.floor(r() * cols.length)].push(mk(p.clone().setY(1.3 + s * 2.6), ry + (s ? rnd(-.05, .05) : 0), 1, 1, 1)); }
    const cg = new THREE.BoxGeometry(2.5, 2.6, 6.1); byC.forEach((l, i) => l.length && inst(cg, std(cols[i], { roughness: .6, metalness: .3 }), l));
    for (let k = 0; k < 4; k++) { const p = rp(40); if (!clearOf(p.x, p.z, WALL + 14)) continue; const cm = std('#e8b020', { metalness: .5, roughness: .45 }); const cr = new THREE.Group(); for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.8, 26, .8), cm); l.position.set(x, 13, z); cr.add(l); } const b = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 46), cm); b.position.set(0, 27, 8); cr.add(b); cr.position.copy(p); cr.rotation.y = r() * 6; shadowAll(cr); world.add(cr); }
    const tl = []; for (let k = 0; k < 120; k++) { const p = rp(50); if (!clearOf(p.x, p.z, WALL + 5)) continue; const s = rnd(3, 4.5); tl.push(mk(p, r() * 6, s, s, s)); } instGLB('tree-large', tl);
    const wm = new THREE.MeshPhysicalMaterial({ color: '#2a4a7a', roughness: .08, metalness: .1, clearcoat: 1 }); const w = new THREE.Mesh(new THREE.PlaneGeometry(3000, 900).rotateX(-Math.PI / 2), wm); w.position.set((x0 + x1) / 2, .01, z1 + 140 + 450); world.add(w); }
  else { // neon city buildings
    const wt = winTex(); const bm = new THREE.MeshStandardMaterial({ color: '#2a2838', map: wt, emissive: C('#fff'), emissiveMap: wt, emissiveIntensity: 1.1, roughness: .6 }); const L = []; for (let k = 0; k < 220; k++) { const p = rp(160); if (!clearOf(p.x, p.z, WALL + 12)) continue; const w = rnd(10, 22), h = rnd(18, 90), d = rnd(10, 22); L.push(mk(p.clone().setY(h / 2), 0, w, h, d)); }
    inst(new THREE.BoxGeometry(1, 1, 1), bm, L, false);
    const neon = ['#ff3aa8', '#3ad8ff', '#ffe24a', '#8a5aff']; for (let k = 0; k < 40; k++) { const p = rp(60); if (!clearOf(p.x, p.z, WALL + 5)) continue; const s = new THREE.Mesh(new THREE.BoxGeometry(rnd(4, 9), rnd(1, 2.4), .3), new THREE.MeshBasicMaterial({ color: neon[k % 4] })); s.position.copy(p).setY(rnd(4, 14)); s.rotation.y = r() * 6; world.add(s); } }
  const BB = [['YA YA GAMES', ['#ff3a6a', '#8a1aff'], '#fff'], ['DRIFT KING', ['#111', '#3a3a44'], '#ffd23a'], ['OFFLINE ARCADE', ['#1a8aff', '#2ae0c0'], '#fff'], ['🎁 GIFTS!', ['#ffb21a', '#ff5a1a'], '#fff'], ['NO WIFI? NO PROBLEM', ['#2ad86a', '#0a8a4a'], '#fff']];
  { const step = Math.floor(P.length / 7); for (let k = 1; k < 7; k++) { const i = k * step + 5; const n = TRK.N[i]; const sd = k % 2 ? 1 : -1; const pos = P[i].clone().addScaledVector(n, sd * (WALL + 3.5)); if (!clearOf(pos.x, pos.z, WALL + 2.5)) continue; const b = BB[k % BB.length]; billboard(pos, V3(-n.x * sd, 0, -n.z * sd), b[0], b[1], b[2], td.night); } }
  // grandstand at start
  const p0 = P[6], n0 = TRK.N[6]; const gs = new THREE.Group(); for (let s = 0; s < 5; s++) { const st = new THREE.Mesh(new THREE.BoxGeometry(30, .8, 1.6), std(s % 2 ? '#d8d8e0' : '#b8b8c4')); st.position.set(0, .4 + s * .8, s * 1.6); gs.add(st); }
  const crowdC = ['#e8202a', '#1a6aff', '#ffd23a', '#2ad86a', '#ffffff', '#ff5ab8']; const cg = new THREE.CapsuleGeometry(.22, .4, 3, 6); for (let s = 0; s < 5; s++) for (let i = 0; i < 26; i++) { if (r() < .25) continue; const c = new THREE.Mesh(cg, std(crowdC[(i * 3 + s) % 6])); c.position.set(-14 + i * 1.12 + rnd(-.2, .2), 1.2 + s * .8, s * 1.6); gs.add(c); }
  gs.position.copy(p0).addScaledVector(n0, -(WALL + 5)); gs.rotation.y = Math.atan2(-n0.x, -n0.z); shadowAll(gs); world.add(gs); }
function shadowAll(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); }
function instGLB(name, mats, shadow = true) { const src = GLB[name]; if (!src || !mats.length) return; src.updateMatrixWorld(true); src.traverse(m => { if (!m.isMesh) return; const mt = m.material.clone(); mt.alphaTest = .5; mt.transparent = false; mt.side = THREE.DoubleSide; const im = new THREE.InstancedMesh(m.geometry, mt, mats.length); const t = new THREE.Matrix4(); mats.forEach((M, i) => { t.multiplyMatrices(M, m.matrixWorld); im.setMatrixAt(i, t); }); im.castShadow = shadow; im.receiveShadow = true; world.add(im); }); }
function billboard(p, n, txt, bg, fg, night) { const g = new THREE.Group(); const c = cnv(512, 160), x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 512, 160); gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]); x.fillStyle = gr; x.fillRect(0, 0, 512, 160); x.fillStyle = fg; x.font = '900 72px Rubik,Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 256, 84); x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 8; x.strokeRect(4, 4, 504, 152);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const fm = new THREE.MeshStandardMaterial({ map: t, emissive: C('#fff'), emissiveMap: t, emissiveIntensity: night ? .9 : .15, roughness: .5 }); const bk = std('#2a2c34', { metalness: .5 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(12, 3.75, .3), [bk, bk, bk, bk, fm, bk]); b.position.y = 6; g.add(b); for (const s of [-4, 4]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, 6, 8), bk); pl.position.set(s, 3, -.2); g.add(pl); }
  g.position.copy(p); g.rotation.y = Math.atan2(n.x, n.z); shadowAll(g); world.add(g); }

/* ================= GIFTS ================= */
const GIFTS = []; const GCOL = [['#ff3a6a', '#ffe24a'], ['#3a8aff', '#ffffff'], ['#2ad86a', '#ff3a6a'], ['#ffb21a', '#8a3aff'], ['#8a3aff', '#ffe24a']];
function giftMesh(k) { const [a, b] = GCOL[k % GCOL.length]; const g = new THREE.Group(); const bx = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), new THREE.MeshPhysicalMaterial({ color: a, roughness: .3, clearcoat: .8, emissive: C(a), emissiveIntensity: .25 })); g.add(bx);
  const rm = new THREE.MeshPhysicalMaterial({ color: b, roughness: .25, metalness: .3, emissive: C(b), emissiveIntensity: .3 }); for (const r of [0, 1]) { const s = new THREE.Mesh(new THREE.BoxGeometry(r ? 1.14 : .2, 1.14, r ? .2 : 1.14), rm); g.add(s); }
  for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.TorusGeometry(.2, .07, 8, 16), rm); t.position.set(s * .17, .66, 0); t.rotation.set(0, Math.PI / 2, s * .5); g.add(t); }
  const glow = new THREE.Mesh(new THREE.RingGeometry(.6, 1.3, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: a, transparent: true, opacity: .45, depthWrite: false, blending: THREE.AdditiveBlending })); glow.position.y = -.95; g.add(glow); g.userData.glow = glow;
  bx.castShadow = true; return g; }

/* ================= CAR ================= */
const GLB = {}, LOADER = new GLTFLoader(); let PAL = null;
let MODS = null; async function loadGLB(n) { if (!MODS) MODS = (await import('./m/models.js')).M; const b64 = MODS[n]; if (!b64) return; const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); await new Promise(res => LOADER.parse(bin.buffer, 'drift/m/', g => { GLB[n] = g.scene; res(); }, () => res())); }
const ASSETS = Promise.all(['tree-large', 'tree-pine-large', 'tree-park-large', 'cone'].map(loadGLB)).then(() => new Promise(res => { const im = new Image(); im.onload = () => { const c = cnv(im.width, im.height); c.getContext('2d').drawImage(im, 0, 0); PAL = c; res(); }; im.onerror = () => res(); im.src = 'drift/m/Textures/colormap.png'; }));
const palCache = {};
function bodyColor(obj) { const g = PAL.getContext('2d').getImageData(0, 0, PAL.width, PAL.height).data; const cnt = {}; obj.traverse(m => { if (!m.isMesh || /wheel/i.test(m.name) || /wheel/i.test(m.parent && m.parent.name)) return; const uv = m.geometry.attributes.uv; if (!uv) return; for (let i = 0; i < uv.count; i += 3) { const x = Math.floor(uv.getX(i) * PAL.width) % PAL.width, y = Math.floor(uv.getY(i) * PAL.height) % PAL.height; const k = (y * PAL.width + x) * 4; const r = g[k], gg = g[k + 1], b = g[k + 2]; const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); if (mx - mn < 50) continue; const key = (r >> 4) + ',' + (gg >> 4) + ',' + (b >> 4); cnt[key] = (cnt[key] || 0) + 1; } }); let best = null, bv = 0; for (const k in cnt) if (cnt[k] > bv) { bv = cnt[k]; best = k; } return best ? best.split(',').map(v => +v * 16 + 8) : null; }
function paintTex(model, paint) { const key = model + paint; if (palCache[key]) return palCache[key]; const src = GLB[model]; const bc = bodyColor(src); const c = cnv(PAL.width, PAL.height), x = c.getContext('2d'); x.drawImage(PAL, 0, 0);
  if (bc && paint !== 'orig') { const d = x.getImageData(0, 0, c.width, c.height), a = d.data; const pc = C(paint); const pr = pc.r * 255, pg = pc.g * 255, pb = pc.b * 255; const bl = (bc[0] + bc[1] + bc[2]) / 3;
    for (let i = 0; i < a.length; i += 4) { const dr = a[i] - bc[0], dg = a[i + 1] - bc[1], db = a[i + 2] - bc[2]; if (dr * dr + dg * dg + db * db < 2600) { const l = ((a[i] + a[i + 1] + a[i + 2]) / 3) / bl; a[i] = Math.min(255, pr * l); a[i + 1] = Math.min(255, pg * l); a[i + 2] = Math.min(255, pb * l); } } x.putImageData(d, 0, 0); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.magFilter = THREE.NearestFilter; return palCache[key] = t; }
const CMOD = { 'hatchback-sports': ['kaze', '#2ad8c8'], 'sedan-sports': ['corsa', '#f0f2f6'], taxi: ['sedan', '#ffc21a', { taxi: 1 }], police: ['sedan', '#f0f2f6', { roof: 'black' }] };
function carMesh(ci, paint, forceCol) { const cd = CARS[ci]; const [mk, oc, xo] = CMOD[cd.m]; const col = forceCol || (paint && paint !== 'orig' ? paint : oc);
  const md = carModel(mk, Object.assign({ paint: col, spoiler: ci === 1 }, xo || {})); const root = new THREE.Group(), tilt = new THREE.Group(); root.add(tilt); tilt.add(md.root); const body = md.root;
  const wheels = md.wheels; for (const w of wheels) root.add(w.piv);
  const L = md.L, W = md.W, H = md.H, wb = md.M.fa, wr = md.wr;
  // brake / tail glow
  const glowM = new THREE.MeshBasicMaterial({ color: '#ff2030', map: GLOWT, transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const s of [-1, 1]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(.7, .45), glowM); g.position.set(s * W * .3, md.M.tailY - .05, -L / 2 - .08); g.rotation.y = Math.PI; tilt.add(g); }
  const tl = { set emissiveIntensity(v) { glowM.opacity = v > 2 ? .95 : .3; } };
  const hlM = new THREE.MeshBasicMaterial({ color: '#fff4d8', map: BEAMT, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }); const beam = new THREE.Mesh(new THREE.PlaneGeometry(6, 16).rotateX(-Math.PI / 2), hlM); beam.position.set(0, .05, L / 2 + 7.6); root.add(beam);
  const ug = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.8, L * 1.3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: paint && paint !== 'orig' ? paint : '#7ad8ff', map: GLOWT, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); ug.position.y = .04; root.add(ug);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.35, L * 1.15).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#000', map: GLOWT, transparent: true, opacity: .55, depthWrite: false })); blob.position.y = .03; root.add(blob);
  let siren = null; if (cd.siren) { siren = []; for (const [s, c] of [[-1, '#ff2030'], [1, '#2060ff']]) { const m = new THREE.Mesh(new THREE.BoxGeometry(.5, .14, .26), new THREE.MeshBasicMaterial({ color: c })); m.position.set(s * .3, H + .14, -(md.M.rf + md.M.rr) / 2 * -1); tilt.add(m); const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ color: c, map: GLOWT, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending })); gl.position.copy(m.position); tilt.add(gl); siren.push({ m, gl }); } }
  return { root, tilt, body, wheels, tl, ug, hl: hlM, siren, L, W, wb, wr, H }; }

/* ================= STATE ================= */
let state = 'title', car = null, CM = null, ev = 0, raceT = 0, cdT = 0, lap = 0, score = 0, gifts = 0, last = performance.now(), miniBg = null;
const inp = { l: 0, r: 0, gas: 0, brk: 0, hb: 0 }; const keys = {};
function newCar() { if (CM) scene.remove(CM.root); const ci = S.car; CM = carMesh(ci, S.paint[ci] || 'orig'); scene.add(CM.root); const P = TRK.P, Tn = TRK.T;
  car = { pos: P[2].clone(), h: Math.atan2(Tn[2].x, Tn[2].z), vx: 0, vz: 0, yr: 0, steer: 0, drift: 0, driftOff: 0, slip: 0, idx: 2, prog: 0, chain: 0, chainT: 0, mult: 1, noDrift: 9, zone: 0, close: 0, roll: 0, pitch: 0, wheelA: 0, lastSk: [null, null], spin: 0, hit: 0, hbT: 0, steerT: 0, off: 0 };
  CM.root.position.copy(car.pos); CM.root.rotation.y = car.h; }
/* ================= RIVALS ================= */
const RIVN = ['TAKU', 'NIKO', 'MAYA'], RIVC = [[1, '#e8202a'], [0, '#1a6aff'], [1, '#ffb21a']]; let RIV = [];
function nameTag(txt, col) { const c = cnv(256, 80), x = c.getContext('2d'); x.fillStyle = 'rgba(10,10,20,.72)'; x.beginPath(); x.roundRect(8, 10, 240, 60, 30); x.fill(); x.fillStyle = col; x.beginPath(); x.arc(42, 40, 14, 0, TAU); x.fill(); x.fillStyle = '#fff'; x.font = '900 34px Arial'; x.textBaseline = 'middle'; x.fillText(txt, 66, 42);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, transparent: true })); sp.scale.set(2.6, .8, 1); return sp; }
function clearRivals() { RIV.forEach(r => scene.remove(r.cm.root)); RIV = []; if ($('posPill')) $('posPill').hidden = true; }
const turnK = (a, b) => wrapPi(Math.atan2(b.x, b.z) - Math.atan2(a.x, a.z));
function makeRivals() { clearRivals(); const e = EVENTS[ev]; const base = 25.5 + ev * 1.6 + (e.hard ? 2.5 : 0);
  [[8, 2.8], [5, -2.8], [1, 3.8]].forEach(([di, lat], k) => { const cm = carMesh(RIVC[k][0], 'orig', RIVC[k][1]); scene.add(cm.root); const tag = nameTag(RIVN[k], RIVC[k][1]); tag.position.y = cm.H + 1.3; cm.root.add(tag);
    RIV.push({ cm, tag, s: 2 + di, lat, lat0: lat, v: 0, vmax: base * [1.04, 1, .96][k], yaw: 0, wa: 0, done: 0, bt: 0, k }); }); placeRivals(0); $('posPill').hidden = false; }
function placeRivals(dt) { const n = TRK.n, P = TRK.P, Tn = TRK.T, Nn = TRK.N;
  for (const r of RIV) { const a = ((Math.floor(r.s) % n) + n) % n, b = (a + 1) % n, f = r.s - Math.floor(r.s);
    const x = lerp(P[a].x, P[b].x, f) + Nn[a].x * r.lat, z = lerp(P[a].z, P[b].z, f) + Nn[a].z * r.lat; r.cm.root.position.set(x, 0, z); r.cm.root.rotation.y = Math.atan2(Tn[a].x, Tn[a].z) + r.yaw;
    r.wa += r.v * dt / r.cm.wr; for (const w of r.cm.wheels) { w.sp.rotation.x = r.wa; w.piv.rotation.y = w.front ? -r.yaw * .8 : 0; }
    r.cm.tilt.rotation.z = lerp(r.cm.tilt.rotation.z, -r.yaw * .12, Math.min(1, dt * 4)); r.tag.visible = camera.position.distanceTo(r.cm.root.position) > 9; } }
function stepRivals(dt) { if (!RIV.length) return; const n = TRK.n, Tn = TRK.T, seg = TRK.len / n, c = car;
  for (const r of RIV) { const i = ((Math.floor(r.s) % n) + n) % n;
    if (state === 'play' || r.done) { let k = 0, sg = 0; for (let j = 4; j <= 28; j += 4) { const t = turnK(Tn[i], Tn[(i + j) % n]); if (Math.abs(t) > k) { k = Math.abs(t); sg = Math.sign(t); } }
      let vt = r.done ? 10 : r.vmax * (1 - .48 * Math.min(1, k / 1.1)); const gap = (r.s - 2) - c.prog; if (!r.done) vt *= gap > 30 ? .86 : gap > 12 ? .95 : gap < -30 ? 1.14 : gap < -12 ? 1.05 : 1;
      r.v = lerp(r.v, vt, dt * (vt > r.v ? .55 : 1.6)); r.s += r.v * dt / seg;
      r.lat = lerp(r.lat, clamp(r.lat0 * .45 + Math.sin(r.s * .045 + r.k * 2) * 2.2, -4.5, 4.5), dt * .6);
      const dr = k > .35 && r.v > 14 ? sg * Math.min(.5, k * .55) : 0; r.yaw = lerp(r.yaw, dr, Math.min(1, dt * 2.5));
      if (dr && Math.random() < (E.q === 'low' ? .3 : .7)) { const p = r.cm.root.position, h = r.cm.root.rotation.y; SMK.emit(V3(p.x - Math.sin(h) * 1.6 + rnd(-.5, .5), .35, p.z - Math.cos(h) * 1.6 + rnd(-.5, .5)), V3(rnd(-.6, .6), rnd(.2, .9), rnd(-.6, .6)), [.9, .9, .92], .7, 3.4, rnd(1, 1.6), .3); }
      if (!r.done && (r.s - 2) / n >= TRK.ev.laps) { r.done = 1; r.ft = raceT; } }
    // bump with the player
    const p = r.cm.root.position, dx = c.pos.x - p.x, dz = c.pos.z - p.z, d = Math.hypot(dx, dz);
    if (d < 2.4 && d > .01) { const nx = dx / d, nz = dz / d, push = (2.4 - d); c.pos.x += nx * push * .7; c.pos.z += nz * push * .7; r.lat -= (nx * TRK.N[i].x + nz * TRK.N[i].z) * push * .3; const vn = c.vx * nx + c.vz * nz; if (vn < 0) { c.vx -= vn * nx * 1.2; c.vz -= vn * nz * 1.2; }
      r.bt -= dt; if (r.bt <= 0 && state === 'play') { r.bt = .6; A.noise(.18, 'lowpass', 500, 1, .12); buzz(30); r.v *= .92; } } }
  placeRivals(dt); }
const myPlace = () => 1 + RIV.filter(r => r.done || (r.s - 2) > car.prog).length;
function start() { A.ac(); camera.clearViewOffset(); S.ev = ev; S.save(); $('loading').hidden = false; setTimeout(() => { buildTrack(EVENTS[ev]); newCar(); makeRivals(); for (const gg of GIFTS) { gg.got = 0; gg.g.visible = true; }
  raceT = 0; lap = 0; score = 0; gifts = 0; $('loading').hidden = true; $('title').hidden = true; $('hud').hidden = false; $('spd').hidden = false; $('mini').hidden = false; $('cL').hidden = $('cR').hidden = false; $('bGas').hidden = !!S.assist; $('endSheet').hidden = true; updHud();
  state = 'count'; cdT = 3.2; A.loopTone('eng', 'sawtooth', 60, .028); A.loopTone('eng2', 'square', 120, .007); A.loopOn('scr', 'bandpass', 1900, 3, .0001); A.startMusic({ chords: [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 43, 47]], bpm: 122, kick: true, vol: .55, lead: true });
  if (!S.tut) { S.tut = 1; S.save(); setTimeout(() => toast(T('◀▶ היגוי · לחצו DRIFT בתוך הפנייה והחזיקו ◀▶ – ככה מחליקים! 🔥', '◀▶ steer · tap DRIFT in a corner and hold ◀▶ to slide! 🔥'), 5200), 3300); } }, 40); }
function cdTick(dt) { const b = Math.ceil(cdT); cdT -= dt; const a = Math.ceil(cdT); if (a !== b && a >= 0) { $('cd').innerHTML = `<b>${a > 0 ? a : 'GO!'}</b>`; A.tone(a > 0 ? 440 : 880, a > 0 ? .15 : .4, 'square', .06); } if (cdT <= 0) { state = 'play'; setTimeout(() => $('cd').innerHTML = '', 700); } }

/* ================= PHYSICS ================= */
function nearest(c) { const P = TRK.P, n = P.length; let best = 1e9, bi = c.idx; for (let k = -18; k <= 18; k++) { const i = (c.idx + k + n) % n; const dx = P[i].x - c.pos.x, dz = P[i].z - c.pos.z, d = dx * dx + dz * dz; if (d < best) { best = d; bi = i; } } return bi; }
function step(dt) { const c = car, cd = CARS[S.car]; const assist = !!S.assist; const steerIn = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
  c.steer = lerp(c.steer, steerIn, Math.min(1, dt * (steerIn ? 7 : 9)));
  const fx = Math.sin(c.h), fz = Math.cos(c.h), rx = -fz, rz = fx; let vF = c.vx * fx + c.vz * fz, vR = c.vx * rx + c.vz * rz; const sp = Math.hypot(c.vx, c.vz);
  const gas = state === 'play' && (assist ? !inp.brk : inp.gas); const off = c.off;
  if (gas) vF += cd.acc * (1 - clamp(vF / (cd.max * (off ? .55 : 1)), 0, 1.2)) * dt * (c.drift ? .92 : 1);
  if (inp.brk && state === 'play') vF -= (vF > 0 ? 26 : 7) * dt; if (vF < -8) vF = -8;
  vF -= vF * (.12 + (off ? 1.3 : 0)) * dt; if (!gas && !inp.brk) vF -= Math.sign(vF) * Math.min(Math.abs(vF), 2.5 * dt);
  if (inp.hb) { vF -= vF * .5 * dt; }
  // drift entry
  c.hbT -= dt; if (inp.hb && !c.prevHb && sp > 8) { c.hbT = .35; const dir = steerIn || Math.sign(c.yr) || 1; c.yr += -dir * cd.kick; c.drift = 1; A.noise(.25, 'bandpass', 1500, 2, .05); }
  c.prevHb = inp.hb;
  if (steerIn) c.steerT += dt; else c.steerT = 0;
  if (assist && !c.drift && sp > 19 && c.steerT > .3) { c.drift = 1; c.yr += -steerIn * cd.kick * .6; }
  const sf = clamp(sp / 9, 0, 1) * (1 - clamp((sp - 30) / 50, 0, .3)) * (vF < 0 ? -1 : 1);
  const target = -c.steer * (c.drift ? 2.6 : 1.75) * sf; c.yr += (target - c.yr) * Math.min(1, dt * (c.drift ? 2.6 : 7));
  c.h += c.yr * dt;
  const grip = c.drift ? (inp.hb ? cd.dg * .6 : cd.dg) : cd.grip; const kept = Math.exp(-grip * dt); const lost = Math.abs(vR) * (1 - kept); vR *= kept; if (c.drift && gas) vF += lost * .6;
  const nfx = Math.sin(c.h), nfz = Math.cos(c.h); // re-project velocity with new heading
  c.vx = fx * vF + rx * vR; c.vz = fz * vF + rz * vR;
  // slip relative to new heading
  const va = Math.atan2(c.vx, c.vz); let slip = sp > 2 ? wrapPi(c.h - va) : 0; if (vF < 0) slip = 0;
  const maxS = assist ? .95 : 1.3; if (Math.abs(slip) > maxS) { if (assist || Math.abs(slip) < 1.6) { c.h = va + Math.sign(slip) * maxS; c.yr *= .6; slip = Math.sign(slip) * maxS; } else { spinOut(); slip = 0; } }
  c.slip = slip;
  if (c.drift && Math.abs(slip) < .1 && !inp.hb) { c.driftOff += dt; if (c.driftOff > .25) c.drift = 0; } else c.driftOff = 0; if (sp < 6) c.drift = 0;
  c.pos.x += c.vx * dt; c.pos.z += c.vz * dt;
  // track
  const pi = c.idx; c.idx = nearest(c); let di = c.idx - pi; const n = TRK.n; if (di > n / 2) di -= n; if (di < -n / 2) di += n; c.prog += di;
  const P = TRK.P[c.idx], N = TRK.N[c.idx]; const d = (c.pos.x - P.x) * N.x + (c.pos.z - P.z) * N.z; c.off = Math.abs(d) > HW + 1.3; c.zone = TRK.inZone[c.idx]; c.close = Math.abs(d) > HW - 1.6 && Math.abs(d) < WALL - .2;
  const lim = WALL - CM.W * .5; if (Math.abs(d) > lim) { const s = Math.sign(d); c.pos.x -= N.x * (Math.abs(d) - lim) * s; c.pos.z -= N.z * (Math.abs(d) - lim) * s; const vn = c.vx * N.x + c.vz * N.z; if (vn * s > 0) { c.vx -= N.x * vn * 1.35; c.vz -= N.z * vn * 1.35; c.vx *= .8; c.vz *= .8; if (Math.abs(vn) > 3.5) wallHit(Math.abs(vn), c.pos.clone().addScaledVector(N, s * CM.W * .5)); } }
  return { sp, slip, vF }; }
function spinOut() { const c = car; c.vx *= .45; c.vz *= .45; c.yr *= .3; c.drift = 0; loseChain(T('סחרור!', 'SPIN OUT!')); A.noise(.6, 'bandpass', 900, 1, .08, 0, 300); }
function wallHit(v, p) { const c = car; if (c.hit > 0) return; c.hit = .5; buzz(70); A.noise(.3, 'lowpass', 600, 1, .14); A.tone(90, .25, 'sawtooth', .07, 0, 50); for (let i = 0; i < 18; i++) SP.emit(p.clone().setY(.6), V3(rnd(-4, 4), rnd(1, 5), rnd(-4, 4)), [3, 1.8, .6], .12, .5, 12); if (v > 5) loseChain(T('אאוץ׳! הקיר', 'OUCH! WALL')); }
function loseChain(msg) { const c = car; if (c.chain > 200) pop(msg, '-' + fmtN(c.chain), 'bad'); c.chain = 0; c.chainT = 0; c.mult = 1; updCombo(); }
function bank() { const c = car; const v = c.chain; if (v < 50) { c.chain = 0; c.chainT = 0; c.mult = 1; return; } score += v; const lbl = v > 30000 ? T('אגדי!!', 'LEGENDARY!!') : v > 15000 ? T('מטורף!', 'INSANE!') : v > 6000 ? T('אדיר!', 'GREAT DRIFT!') : v > 1800 ? T('יפה!', 'NICE DRIFT!') : T('דריפט', 'DRIFT');
  pop(lbl, '+' + fmtN(v)); A.tone(660, .1, 'triangle', .07); A.tone(990, .2, 'triangle', .07, .08); if (v > 6000) A.tone(1320, .3, 'triangle', .06, .18); c.chain = 0; c.chainT = 0; c.mult = 1; updHud(); }

/* ================= FRAME ================= */
const camP = V3(0, 6, -10), camT = V3(); let camInit = false, showA = 0;
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.04, (now - last) / 1000); last = now; A.tick(); update(dt, now); E.render(); }
function update(dt, now) {
  if (state === 'count') cdTick(dt);
  if (TRK && car && (state === 'play' || state === 'count' || state === 'end')) { const h = dt / 2; let r; for (let k = 0; k < 2; k++) r = step(h); if (state === 'play') raceT += dt; post(dt, r); stepRivals(dt); }
  if (state === 'title' && CM) { showA += dt * .25; const p = car.pos; const port = innerHeight > innerWidth, R = port ? 13 : 8.5; camera.position.set(p.x + Math.sin(showA) * R, port ? 3.2 : 2.4, p.z + Math.cos(showA) * R); camera.lookAt(p.x, port ? -1.2 : .7, p.z); if (!port) { camera.setViewOffset(innerWidth, innerHeight, innerWidth * (EN ? .22 : -.22), 0, innerWidth, innerHeight); } else camera.clearViewOffset(); camera.fov = 50; camera.updateProjectionMatrix(); for (const w of CM.wheels) { w.piv.rotation.y = w.front ? Math.sin(showA * 2) * .3 : 0; } CM.tilt.rotation.set(0, 0, 0); }
  for (const g of GIFTS) if (!g.got) { g.g.rotation.y += dt * 1.6; g.g.position.y = 1.1 + Math.sin(now / 400 + g.ph) * .25; g.g.userData.glow.position.y = -g.g.position.y + .06; }
  if (car) { sun.position.set(car.pos.x + skyM.uniforms.sd.value.x * 60, skyM.uniforms.sd.value.y * 60 + 25, car.pos.z + skyM.uniforms.sd.value.z * 60); sun.target.position.copy(car.pos); }
  SMK.update(dt); SP.update(dt, 0); CF.update(dt, 0); drawMini(); }
function post(dt, r) { const c = car, cd = CARS[S.car]; const { sp, slip, vF } = r; c.hit -= dt;
  CM.root.position.copy(c.pos); CM.root.rotation.y = c.h;
  // body roll/pitch
  const latA = c.yr * sp; c.roll = lerp(c.roll, clamp(latA * .012, -.12, .12), dt * 6); c.pitch = lerp(c.pitch, clamp((inp.brk ? .05 : 0) - (state === 'play' && (S.assist || inp.gas) && sp < cd.max * .7 ? .025 : 0), -.06, .06), dt * 5); CM.tilt.rotation.set(c.pitch, 0, c.roll); CM.tilt.position.y = Math.abs(c.roll) * .4;
  c.wheelA += vF * dt / CM.wr; for (const w of CM.wheels) { w.sp.rotation.x = c.wheelA; w.piv.rotation.y = w.front ? (c.drift ? clamp(slip * .9, -.6, .6) : -c.steer * .45) : 0; }
  CM.tl.emissiveIntensity = inp.brk || inp.hb ? 4 : 1.2; CM.ug.material.opacity = TRK.td.night ? .5 : 0; CM.hl.opacity = TRK.td.night ? .32 : 0; if (CM.siren) { const ph = Math.floor(performance.now() / 160) % 2; CM.siren.forEach((s, i) => { s.gl.visible = (i === ph); s.gl.quaternion.copy(camera.quaternion); }); }
  // drifting effects + scoring
  const drifting = c.drift && sp > 7 && Math.abs(slip) > .16;
  const fx = Math.sin(c.h), fz = Math.cos(c.h), rx = -fz, rz = fx;
  const rear = [-1, 1].map(s => c.pos.clone().addScaledVector(V3(fx, 0, fz), -CM.wb).addScaledVector(V3(rx, 0, rz), s * (CM.W / 2 - .12)));
  if (drifting || (inp.brk && sp > 12) || (c.off && sp > 6)) { rear.forEach((p, i) => { if (c.lastSk[i]) addSkid(c.lastSk[i], p); c.lastSk[i] = p; });
    const amt = c.off ? .5 : Math.min(1, Math.abs(slip) * 1.4) * Math.min(1, sp / 25); const sc = c.off ? [.62, .52, .4] : SMOKES[S.smoke];
    for (const p of rear) if (Math.random() < amt * (E.q === 'low' ? .5 : .85)) SMK.emit(p.clone().setY(.35), V3(-c.vx * .12 + rnd(-.6, .6), rnd(.2, .9), -c.vz * .12 + rnd(-.6, .6)), sc, .8, 3.6 + amt * 1.6, rnd(1.1, 1.8), .32 + amt * .2); }
  else c.lastSk = [null, null];
  const scr = A.loop('scr'); if (scr && A.ctx) scr.g.gain.setTargetAtTime(drifting ? .03 + Math.min(.06, Math.abs(slip) * .06) : (inp.brk && sp > 12 ? .03 : 0), A.ctx.currentTime, .05);
  const eng = A.loop('eng'), eng2 = A.loop('eng2'); if (eng && A.ctx) { const g = Math.floor(sp / 11), rpm = (sp % 11) / 11; const f = 55 + rpm * 70 + g * 12 + (c.drift ? 18 : 0); eng.osc.frequency.setTargetAtTime(f, A.ctx.currentTime, .04); eng2 && eng2.osc.frequency.setTargetAtTime(f * 2, A.ctx.currentTime, .04); }
  if (state === 'play') {
    if (drifting) { c.noDrift = 0; c.chainT += dt; const m = 1 + Math.min(4, Math.floor(c.chainT / 3)); if (m > c.mult) { c.mult = m; pop('x' + m, '', 'g'); A.tone(500 + m * 120, .15, 'square', .05); } const ang = Math.abs(slip) * 57.3;
      c.chain += sp * ang * .55 * dt * c.mult * (c.zone ? 2 : 1) * (c.close ? 1.5 : 1); }
    else { c.noDrift += dt; if (c.chain > 0 && c.noDrift > 1.1) bank(); }
    updCombo(drifting);
    // gifts
    for (const g of GIFTS) if (!g.got && Math.hypot(g.p.x - c.pos.x, g.p.z - c.pos.z) < 2.4) { g.got = 1; g.g.visible = false; gifts++; score += 250; CF.burst(g.p.clone().setY(1.2), 26, CONFETTI, 5, .14, 1.2, 9); A.tone(880, .08, 'square', .06); A.tone(1320, .14, 'square', .05, .07); A.tone(1760, .2, 'triangle', .05, .14); pop('🎁 +250', '', 'g'); buzz(25); updHud(); }
    // lap
    const lp = Math.floor(c.prog / TRK.n); if (lp > lap) { lap = lp; if (lap >= TRK.ev.laps) finish(); else { pop(T('הקפה ', 'LAP ') + (lap + 1), T('המתנות חזרו!', 'Gifts are back!')); for (const g of GIFTS) { g.got = 0; g.g.visible = true; } A.tone(700, .2, 'triangle', .07); } }
    if (Math.floor(raceT * 4) !== Math.floor((raceT - dt) * 4)) updHud(); }
  // camera
  const vd = sp > 3 ? V3(c.vx / sp, 0, c.vz / sp) : V3(fx, 0, fz); const dir = V3(fx, 0, fz).lerp(vd, .55).normalize(); const port = innerHeight > innerWidth; const dist = (5.9 + sp * .04) * (port ? 1.3 : 1), hgt = (2.3 + sp * .018) * (port ? 1.35 : 1);
  const want = c.pos.clone().addScaledVector(dir, -dist).setY(hgt); if (!camInit || state === 'count' && cdT > 3) { camP.copy(want); camInit = true; } camP.lerp(want, Math.min(1, dt * 5)); camT.lerp(c.pos.clone().addScaledVector(dir, 4).setY(.9), Math.min(1, dt * 8));
  camera.position.copy(camP); if (c.hit > .3) camera.position.add(V3(rnd(-.12, .12), rnd(-.1, .1), 0)); camera.lookAt(camT); const fov = (port ? 70 : 60) + sp * .32; if (Math.abs(camera.fov - fov) > .2) { camera.fov = lerp(camera.fov, fov, dt * 3); camera.updateProjectionMatrix(); }
  $('spdTxt').textContent = Math.round(sp * 3.6); }

/* ================= HUD ================= */
let comboOn = 0; function updCombo(on) { const c = car; const show = c.chain > 30; if (show !== !!comboOn) { comboOn = show; $('combo').classList.toggle('on', show); } if (!show) return; $('cPts').textContent = fmtN(c.chain); $('cMul').textContent = 'x' + c.mult;
  const tag = c.zone && on ? 'ZONE ×2' : c.close && on ? T('קרוב! ×1.5', 'CLOSE! ×1.5') : ''; $('cTag').hidden = !tag; $('cTag').textContent = tag; $('cBar').style.width = (c.mult >= 5 ? 100 : (c.chainT % 3) / 3 * 100) + '%'; $('combo').style.opacity = on ? 1 : .55; }
function pop(a, b, cls = '') { const d = document.createElement('div'); d.className = cls; d.innerHTML = a + (b ? `<small>${b}</small>` : ''); $('pops').appendChild(d); setTimeout(() => d.remove(), 1400); }
function updHud() { $('scTxt').textContent = fmtN(score); $('scSub').textContent = T('נקודות', 'points'); $('lapTxt').textContent = Math.min(TRK.ev.laps, lap + 1) + '/' + TRK.ev.laps; $('lapSub').textContent = T('הקפה', 'lap'); $('giftTxt').textContent = '🎁 ' + gifts; $('timeTxt').textContent = fmt(raceT); if (RIV.length) { $('posTxt').textContent = myPlace() + '/' + (RIV.length + 1); $('posSub').textContent = T('מקום', 'place'); } }
function drawMini() { if (!TRK || $('mini').hidden) return; const W = 200, cv = $('mini'), g = cv.getContext('2d'); const P = TRK.P;
  if (!miniBg) { miniBg = cnv(W, W); const b = miniBg.getContext('2d'); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of P) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); } const s = (W - 30) / Math.max(x1 - x0, z1 - z0); const ox = (W - (x1 - x0) * s) / 2, oz = (W - (z1 - z0) * s) / 2;
    TRK.mp = p => [W - (ox + (p.x - x0) * s), oz + (p.z - z0) * s]; b.lineWidth = 11; b.lineCap = b.lineJoin = 'round'; b.strokeStyle = 'rgba(255,255,255,.85)'; b.beginPath(); P.forEach((p, i) => { const [x, y] = TRK.mp(p); i ? b.lineTo(x, y) : b.moveTo(x, y); }); b.closePath(); b.stroke();
    b.lineWidth = 7; b.strokeStyle = '#ff6a1a'; for (const z of TRK.zones) { b.beginPath(); for (let i = z.a; i <= z.b; i++) { const [x, y] = TRK.mp(P[(i + P.length) % P.length]); i === z.a ? b.moveTo(x, y) : b.lineTo(x, y); } b.stroke(); } }
  g.clearRect(0, 0, W, W); g.drawImage(miniBg, 0, 0); g.fillStyle = '#ffe24a'; for (const gg of GIFTS) if (!gg.got) { const [x, y] = TRK.mp(gg.p); g.fillRect(x - 3, y - 3, 6, 6); }
  for (const r of RIV) { const [x, y] = TRK.mp(r.cm.root.position); g.fillStyle = RIVC[r.k][1]; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); }
  if (car) { const [x, y] = TRK.mp(car.pos); g.fillStyle = '#ff3a6a'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill(); g.stroke(); } }

/* ================= END ================= */
function finish() { state = 'end'; bank(); inp.l = inp.r = inp.hb = 0; inp.brk = 1; A.loopOff('scr'); A.stopMusic(); const e = EVENTS[ev]; const L = e.laps; const st = score >= STARQ[2] * L ? 3 : score >= STARQ[1] * L ? 2 : score >= STARQ[0] * L ? 1 : 0;
  const old = S.stars[ev] || 0, ob = S.best[ev] || 0; const nr = score > ob; if (st > old) S.stars[ev] = st; if (nr) S.best[ev] = Math.round(score); const place = 1 + RIV.filter(r => r.done).length, pb = RIV.length ? [150, 80, 40, 0][place - 1] || 0 : 0; const coins = Math.round(score / 120) + gifts * 5 + st * 25 + (st > old ? (st - old) * 60 : 0) + pb; S.coins += coins; S.save();
  A.tone(523, .15, 'triangle', .08); A.tone(659, .15, 'triangle', .08, .15); A.tone(784, .35, 'triangle', .08, .3);
  setTimeout(() => { A.allOff(); $('eT').textContent = place === 1 ? T('ניצחת במרוץ! 🏆', 'You won the race! 🏆') : st ? T('סיום מדהים! 🏁', 'Great finish! 🏁') : T('כמעט! 🏁', 'So close! 🏁'); [...$('eStars').children].forEach((s, i) => { s.className = i < st ? 'on' : ''; s.style.animationDelay = i * .2 + 's'; });
    $('eNR').innerHTML = nr ? `<span class="nr">🏆 ${T('שיא חדש!', 'NEW RECORD!')}</span>` : '';
    const nx = st < 3 ? T(`עוד ${fmtN(STARQ[st] * L - score)} נקודות לכוכב הבא`, `${fmtN(STARQ[st] * L - score)} more points for the next star`) : T('שלושה כוכבים! מלך הדריפט 👑', '3 stars! Drift King 👑');
    $('eRes').innerHTML = (RIV.length ? `<li><span>${T('מקום במרוץ', 'Race place')}</span><b>${['🥇', '🥈', '🥉', '4️⃣'][place - 1]} ${place}/${RIV.length + 1}${pb ? ' · 🪙+' + pb : ''}</b></li>` : '') + `<li><span>${T('נקודות דריפט', 'Drift points')}</span><b>${fmtN(score)}</b></li><li><span>${T('מתנות', 'Gifts')}</span><b>🎁 ${gifts}</b></li><li><span>${T('זמן', 'Time')}</span><b>${fmt(raceT)}</b></li><li><span>${T('מטבעות שהרווחת', 'Coins earned')}</span><b>🪙 +${coins}</b></li><li style="background:#fff2d8"><span>${nx}</span></li>`;
    $('endSheet').hidden = false; $('hud').hidden = $('cL').hidden = $('cR').hidden = $('spd').hidden = true; $('combo').classList.remove('on'); }, 1400); }

/* ================= INPUT ================= */
function hold(id, k) { const b = $(id); const dn = e => { e.preventDefault(); A.ac(); inp[k] = 1; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (er) { } }; const up = e => { inp[k] = 0; b.classList.remove('on'); }; b.addEventListener('pointerdown', dn); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('contextmenu', e => e.preventDefault()); }
hold('bL', 'l'); hold('bR', 'r'); hold('bHb', 'hb'); hold('bBrk', 'brk'); hold('bGas', 'gas');
const KM = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brk', KeyS: 'brk', Space: 'hb', ShiftLeft: 'hb' };
addEventListener('keydown', e => { const k = KM[e.code]; if (k && state !== 'title') { inp[k] = 1; e.preventDefault(); } if (e.code === 'Escape') pause(); });
addEventListener('keyup', e => { const k = KM[e.code]; if (k) inp[k] = 0; });
function pause() { if (state !== 'play' && state !== 'count') return; state = 'pause'; $('pauseSheet').hidden = false; A.allOff(); A.stopMusic(); }
function resume() { $('pauseSheet').hidden = true; state = cdT > 0 ? 'count' : 'play'; A.loopTone('eng', 'sawtooth', 60, .028); A.loopTone('eng2', 'square', 120, .007); A.loopOn('scr', 'bandpass', 1900, 3, .0001); A.startMusic(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

/* ================= TITLE ================= */
let tab = 'E', gi = S.car;
const unlocked = i => totalStars() >= EVENTS[i].need; const totalStars = () => Object.values(S.stars).reduce((a, b) => a + b, 0);
function renderTitle() { $('coinN').textContent = fmtN(S.coins); $('tabE').textContent = '🏁 ' + T('אירועים', 'Events'); $('tabG').textContent = '🚗 ' + T('מוסך', 'Garage'); $('tabE').classList.toggle('on', tab === 'E'); $('tabG').classList.toggle('on', tab === 'G'); $('pE').hidden = tab !== 'E'; $('pG').hidden = tab !== 'G';
  $('evs').innerHTML = EVENTS.map((e, i) => { const lk = !unlocked(i), s = S.stars[i] || 0; return `<button data-i="${i}" class="${i === ev ? 'on' : ''} ${lk ? 'lock' : ''}">${e.rev ? '<span class="rev">⇄</span>' : ''}<i>${lk ? '🔒' : TRACKS[e.t].ic}</i>${TRACKS[e.t].n}<small>${lk ? '⭐' + e.need : '★'.repeat(s) + '☆'.repeat(3 - s)}</small></button>`; }).join('');
  const e = EVENTS[ev]; $('evInfo').textContent = unlocked(ev) ? `${e.laps} ${T('הקפות', 'laps')} · ${T('שיא', 'Best')}: ${fmtN(S.best[ev] || 0)} · ⭐ ${fmtN(STARQ[0] * e.laps)} / ${fmtN(STARQ[1] * e.laps)} / ${fmtN(STARQ[2] * e.laps)}` : T(`🔒 צריך ${e.need} כוכבים כדי לפתוח (יש לך ${totalStars()})`, `🔒 Need ${e.need} stars to unlock (you have ${totalStars()})`);
  const cd = CARS[gi], own = S.owned.includes(gi); $('carN').textContent = cd.n + (own ? '' : ' 🔒'); $('carD').textContent = cd.d;
  $('carB').innerHTML = [[T('מהירות', 'Speed'), cd.max / 50], [T('תאוצה', 'Accel'), cd.acc / 24], [T('אחיזה', 'Grip'), cd.grip / 9], [T('דריפט', 'Drift'), (cd.kick - .8) / .9]].map(([n, v]) => `<span>${n}</span><i><b style="width:${Math.round(v * 100)}%"></b></i>`).join('');
  const pc = S.paint[gi] || 'orig'; $('paints').innerHTML = `<span>🎨</span>` + PAINTS.map(c => `<button data-c="${c}" style="background:${c === 'orig' ? 'conic-gradient(#ff5a5a,#ffd23a,#5ae08a,#5ab8ff,#c07aff,#ff5a5a)' : c}" class="${c === pc ? 'on' : ''}"></button>`).join('');
  $('smokes').innerHTML = `<span>💨</span>` + SMOKES.map((c, i) => `<button data-s="${i}" style="background:rgb(${c.map(v => Math.min(255, v * 255 | 0))})" class="${i === S.smoke ? 'on' : ''} ${S.smokes.includes(i) ? '' : 'lk'}"></button>`).join('');
  $('buyBtn').hidden = own; $('buyBtn').textContent = T(`קנה ב־🪙 ${cd.price}`, `Buy for 🪙 ${cd.price}`); $('buyBtn').disabled = S.coins < cd.price;
  $('goBtn').textContent = tab === 'G' && !own ? T('🔒 הרכב נעול', '🔒 Car locked') : unlocked(ev) ? T('🏁 יוצאים לדריפט!', '🏁 Let’s drift!') : T('🔒 נעול', '🔒 Locked'); $('goBtn').disabled = !unlocked(ev) || (tab === 'G' && !own);
  $('asBtn').textContent = (S.assist ? '🟢 ' : '⚪ ') + T('עזרה בדריפט: ', 'Drift assist: ') + (S.assist ? T('פועל (קל)', 'ON (easy)') : T('כבוי (מקצוען)', 'OFF (pro)'));
  $('sndChip').innerHTML = S.mute ? SND_OFF('#1c2240') : SND_ON('#1c2240'); }
$('tabE').onclick = () => { tab = 'E'; if (!S.owned.includes(gi)) { gi = S.car; showCar(); } renderTitle(); }; $('tabG').onclick = () => { tab = 'G'; renderTitle(); };
$('evs').onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; A.ac(); ev = +b.dataset.i; A.tone(600, .06, 'triangle', .05); if (unlocked(ev)) { buildTrack(EVENTS[ev]); newCar(); } renderTitle(); };
const showCar = () => { if (S.owned.includes(gi)) { S.car = gi; S.save(); } const keep = S.car; S.car = gi; newCar(); S.car = keep; };
$('cPrev').onclick = () => { gi = (gi + CARS.length - 1) % CARS.length; showCar(); renderTitle(); }; $('cNext').onclick = () => { gi = (gi + 1) % CARS.length; showCar(); renderTitle(); };
$('paints').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; S.paint[gi] = b.dataset.c; S.save(); showCar(); renderTitle(); };
$('smokes').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; const i = +b.dataset.s; if (!S.smokes.includes(i)) { if (S.coins < SMOKEP[i]) { toast(T(`צבע עשן עולה 🪙 ${SMOKEP[i]}`, `Smoke color costs 🪙 ${SMOKEP[i]}`)); return; } S.coins -= SMOKEP[i]; S.smokes.push(i); A.tone(880, .2, 'triangle', .07); } S.smoke = i; S.save(); for (let k = 0; k < 14; k++) SMK.emit(car.pos.clone().add(V3(rnd(-1, 1), .4, -2)), V3(rnd(-1, 1), rnd(.5, 1.5), rnd(-1, 1)), SMOKES[i], .8, 4, 1.6, .5); renderTitle(); };
$('buyBtn').onclick = () => { const cd = CARS[gi]; if (S.coins < cd.price) return; S.coins -= cd.price; S.owned.push(gi); S.car = gi; S.save(); A.tone(523, .1, 'triangle', .08); A.tone(784, .3, 'triangle', .08, .1); CF.burst(car.pos.clone().setY(1.5), 40, CONFETTI, 5, .14, 1.4, 8); renderTitle(); };
$('asBtn').onclick = () => { S.assist = S.assist ? 0 : 1; S.save(); renderTitle(); };
$('goBtn').onclick = () => { if (!S.owned.includes(gi)) return; S.car = gi; start(); }; $('sndChip').onclick = () => { A.setMute(!S.mute); S.save(); renderTitle(); };
function showTitle() { clearRivals(); state = 'title'; A.allOff(); A.stopMusic(); $('title').hidden = false; $('hud').hidden = true; $('spd').hidden = true; $('mini').hidden = true; $('cL').hidden = $('cR').hidden = true; $('endSheet').hidden = $('pauseSheet').hidden = true; $('combo').classList.remove('on'); for (const k in inp) inp[k] = 0;
  if (!unlocked(ev)) ev = 0; gi = S.car; buildTrack(EVENTS[ev]); newCar(); renderTitle(); }
$('eMenu').onclick = showTitle; $('eAgain').onclick = () => start(); $('pMenu').onclick = showTitle; $('pGo').onclick = resume; $('pauseBtn').onclick = pause;
$('eMenu').textContent = T('☰ תפריט', '☰ Menu'); $('eAgain').textContent = T('🔁 שוב', '🔁 Again'); $('pT').textContent = T('הפסקה', 'Paused'); $('pMenu').textContent = T('☰ תפריט', '☰ Menu'); $('pGo').textContent = T('▶ המשך', '▶ Resume');
$('pauseBtn').innerHTML = ICO.pause('#fff'); $('homeT').innerHTML = ICO.home('#fff'); hubButtons(['homeT'], A); qualityButton('qBtn', S);
if (EN) { document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr'; }
ev = S.ev || 0; E.resize(); ASSETS.then(() => { showTitle(); setTimeout(() => { $('loading').hidden = true; requestAnimationFrame(frame); window.__driftOK = true; }, 30); });
window.__dr = { camera, get CM() { return CM; }, get trk() { return TRK; }, get riv() { return RIV; }, get car() { return car; }, finish: () => finish(), set state(v) { state = v; }, get car() { return car; }, get state() { return state; }, get TRK() { return TRK; }, get score() { return score; }, start, inp, S, get lap() { return lap; }, sim(sec, cb) { let t = performance.now(); for (let i = 0; i < sec * 30; i++) { cb && cb(); t += 33; update(1 / 30, t); } } };
