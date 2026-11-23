import { loadMix, MixRig } from '../lib/mixchar.js';
import { THREE, $, V3, C, clamp, lerp, rnd, rng, T, EN, store, engine, studioEnv, std, particles, audio, toast, ICO, hubButtons, qualityButton, isTouch } from '../lib/kit.js';
const S = store('wave-save', { stars: {}, best: {}, track: 0, tut: 0, q: 'high' });
const E = engine(S, { fov: 62, far: 900, bloom: [.22, .45, 1.15], exposure: 1.05, vignette: .22, sat: 1.12 });
const { scene, camera, renderer } = E; studioEnv(E, '#e6f4ff', '#3a6a8a', .5);
const A = audio(S); const FX = particles(E, 2600);
const TAU = Math.PI * 2; const wrapPi = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };

/* ================= TRACKS ================= */
const TRACKS = [
  { n: T('לגונה טרופית', 'Tropical Lagoon'), ic: '🏝️', amp: .55, sky: ['#3a9aff', '#cdeeff'], sun: '#fff4dc', sunI: 2.8, sunDir: [.4, .75, -.5], deep: '#0a6a8a', shallow: '#3ae0d0', fog: '#bfe8f8', fogN: 90, fogF: 420, foam: .78, seed: 11, R: 120, wob: [.22, .12], shark: 0, rain: 0 },
  { n: T('מפרץ השקיעה', 'Sunset Bay'), ic: '🌅', amp: .9, sky: ['#5a3a9a', '#ffa860'], sun: '#ffc890', sunI: 2.4, sunDir: [-.6, .22, -.75], deep: '#1a3a6a', shallow: '#3a8aa8', fog: '#f0a880', fogN: 80, fogF: 380, foam: 1.0, seed: 23, R: 135, wob: [.28, .15], shark: 0, rain: 0 },
  { n: T('שונית הכרישים', 'Shark Reef'), ic: '🦈', amp: .8, sky: ['#2a7ae0', '#bfe4ff'], sun: '#ffffff', sunI: 2.7, sunDir: [-.3, .7, .6], deep: '#0a4a7a', shallow: '#2ab8c8', fog: '#a8d8f0', fogN: 80, fogF: 400, foam: .95, seed: 37, R: 140, wob: [.3, .18], shark: 3, rain: 0 },
  { n: T('ים סוער', 'Storm Sea'), ic: '⛈️', amp: 1.55, sky: ['#28323e', '#7a8a98'], sun: '#cfd8e8', sunI: 1.2, sunDir: [.2, .8, .4], deep: '#0e2a3a', shallow: '#2a5a6a', fog: '#5a6a78', fogN: 50, fogF: 260, foam: 1.35, seed: 51, R: 130, wob: [.34, .2], shark: 2, rain: 1 }];
const WAVES = [[.3, 26, .55], [1.5, 15, .34], [-.8, 9, .2], [2.4, 5.5, .07]];
let TR = TRACKS[0], AMP = .5; const WU = WAVES.map(() => new THREE.Vector4());
function setWaves(amp) { AMP = amp; WAVES.forEach(([a, L, h], i) => { const k = TAU / L; WU[i].set(Math.cos(a), Math.sin(a), k, h * amp); }); }
let WT = 0; // wave time
function waveH(x, z, t = WT) { let h = 0; for (const w of WU) h += w.w * Math.sin((w.x * x + w.y * z) * w.z + t * Math.sqrt(9.8 * w.z) * .9); return h; }
function waveN(x, z) { const e = .8; return V3(waveH(x - e, z) - waveH(x + e, z), 2 * e, waveH(x, z - e) - waveH(x, z + e)).normalize(); }

/* ================= SKY + OCEAN ================= */
const skyM = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { a: { value: C('#3a9aff') }, b: { value: C('#cdeeff') }, sd: { value: V3(.4, .7, -.5).normalize() }, sc: { value: C('#fff4dc') } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'uniform vec3 a; uniform vec3 b; uniform vec3 sd; uniform vec3 sc; varying vec3 vD; void main(){ float t=clamp(vD.y*1.6,0.,1.); vec3 c=mix(b,a,pow(t,.7)); float s=max(dot(vD,sd),0.); c+=sc*(pow(s,600.)*6.+pow(s,12.)*.35); gl_FragColor=vec4(c,1.); }' });
const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), skyM); scene.add(sky);
const oceanU = { uT: { value: 0 }, uW: { value: WU }, uDeep: { value: C('#0a6a8a') }, uShallow: { value: C('#3ae0d0') }, uSky: { value: C('#3a9aff') }, uHor: { value: C('#cdeeff') }, uSun: { value: C('#fff4dc') }, uSunDir: { value: V3() }, uFog: { value: C('#bfe8f8') }, uFogN: { value: 90 }, uFogF: { value: 420 }, uCam: { value: V3() }, uFoam: { value: .55 } };
const OVS = `uniform float uT; uniform vec4 uW[4]; varying vec3 vP; varying vec3 vN; varying float vH;
void main(){ vec3 p=(modelMatrix*vec4(position,1.)).xyz; float h=0., dx=0., dz=0.; for(int i=0;i<4;i++){ vec4 w=uW[i]; float ph=dot(w.xy,p.xz)*w.z+uT*sqrt(9.8*w.z)*.9; h+=w.w*sin(ph); float c=w.w*w.z*cos(ph); dx+=c*w.x; dz+=c*w.y; }
 p.y=h; vH=h; vN=normalize(vec3(-dx,1.,-dz)); vP=p; gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`;
const OFS = `uniform float uT; uniform vec3 uDeep, uShallow, uSky, uHor, uSun, uSunDir, uFog, uCam; uniform float uFogN, uFogF, uFoam; varying vec3 vP; varying vec3 vN; varying float vH;
void main(){ vec3 rp=vec3(sin(vP.x*1.7+uT*2.1)*.05+sin(vP.z*3.3-uT*1.7)*.035+sin((vP.x+vP.z)*5.1+uT*3.)*.02, 0., cos(vP.x*2.1-uT*1.3)*.05+sin(vP.z*1.3+uT*1.1)*.04+cos((vP.x-vP.z)*4.7-uT*2.6)*.02);
 vec3 n=normalize(vN+rp); vec3 v=normalize(uCam-vP); float fr=.04+.96*pow(1.-max(dot(n,v),0.),5.); vec3 r=reflect(-v,n); vec3 sk=mix(uHor,uSky,clamp(r.y*1.4,0.,1.));
 float sss=clamp(vH*.55+.35,0.,1.); vec3 base=mix(uDeep,uShallow,sss*.75+.1); vec3 col=mix(base,sk,clamp(fr*1.1,0.,.9)); float sp=pow(max(dot(r,uSunDir),0.),220.)*5.+pow(max(dot(r,uSunDir),0.),24.)*.25; col+=uSun*sp;
 float fn=sin(vP.x*3.1+uT)*sin(vP.z*2.7-uT*.8)*.5+sin(vP.x*7.3-vP.z*6.1)*.25; float foam=smoothstep(uFoam,uFoam+.4,vH+fn*.25); col=mix(col,vec3(.92,.96,1.),foam*.75);
 float d=length(uCam-vP); col=mix(col,uFog,smoothstep(uFogN,uFogF,d)); gl_FragColor=vec4(col,1.); }`;
const oceanM = new THREE.ShaderMaterial({ uniforms: oceanU, vertexShader: OVS, fragmentShader: OFS });
const SEG = 180, OS = 260; const ocean = new THREE.Mesh(new THREE.PlaneGeometry(OS, OS, SEG, SEG).rotateX(-Math.PI / 2), oceanM); ocean.frustumCulled = false; scene.add(ocean);
const farM = new THREE.ShaderMaterial({ uniforms: oceanU, vertexShader: 'varying vec3 vP; varying vec3 vN; varying float vH; void main(){ vec3 p=(modelMatrix*vec4(position,1.)).xyz; p.y=-.05; vP=p; vN=vec3(0.,1.,0.); vH=0.; gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }', fragmentShader: OFS });
const far = new THREE.Mesh(new THREE.RingGeometry(OS * .45, 1600, 64, 1).rotateX(-Math.PI / 2), farM); far.frustumCulled = false; scene.add(far);
const hemi = new THREE.HemisphereLight('#dff0ff', '#2a5a7a', .9); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e0', 2.6); sun.castShadow = renderer.shadowMap.enabled; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 120 }); sun.shadow.bias = -.0005; scene.add(sun); scene.add(sun.target);

/* ================= WORLD ================= */
const world = new THREE.Group(); scene.add(world);
let PATH = null; // {P:[], tan:[], N, cps:[]}
function buildPath(tr) { const r = rng(tr.seed); const n = 10, pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; const rr = tr.R * (1 + (r() - .5) * .28) + Math.sin(a * 2 + r() * 3) * tr.R * tr.wob[0] * .55; pts.push(V3(Math.cos(a) * rr * 1.25, 0, Math.sin(a) * rr)); }
  const cur = new THREE.CatmullRomCurve3(pts, true, 'centripetal'); const L = cur.getLength(); const N = Math.floor(L / 2); const P = cur.getSpacedPoints(N).slice(0, N); const tan = P.map((p, i) => P[(i + 1) % N].clone().sub(P[(i - 1 + N) % N]).setY(0).normalize()); return { P, tan, N, L, cps: [0, 1, 2, 3, 4, 5].map(k => Math.floor(k * N / 6)) }; }
const BUOY = [std('#ff3a2a', { roughness: .4 }), std('#ffd21a', { roughness: .4 })];
const buoys = [], arches = [], ramps = [], items = [], decor = [], brings = [], laneF = [];
function buildWorld(ti) { world.clear(); laneF.length = 0; buoys.length = arches.length = ramps.length = items.length = decor.length = 0; TR = TRACKS[ti]; setWaves(TR.amp); PATH = buildPath(TR); const { P, tan, N } = PATH; const r = rng(TR.seed + 5);
  skyM.uniforms.a.value.set(TR.sky[0]); skyM.uniforms.b.value.set(TR.sky[1]); skyM.uniforms.sc.value.set(TR.sun); const sd = V3(...TR.sunDir).normalize(); skyM.uniforms.sd.value.copy(sd);
  oceanU.uDeep.value.set(TR.deep); oceanU.uShallow.value.set(TR.shallow); oceanU.uSky.value.set(TR.sky[0]); oceanU.uHor.value.set(TR.sky[1]); oceanU.uSun.value.set(TR.sun); oceanU.uSunDir.value.copy(sd); oceanU.uFog.value.set(TR.fog); oceanU.uFogN.value = TR.fogN; oceanU.uFogF.value = TR.fogF; oceanU.uFoam.value = TR.foam;
  scene.fog = new THREE.Fog(TR.fog, TR.fogN, TR.fogF * 1.6); sun.color.set(TR.sun); sun.intensity = TR.sunI; hemi.intensity = TR.rain ? .7 : .95; sunDir.copy(sd);
  const bg = new THREE.SphereGeometry(.45, 14, 10); for (let i = 0; i < N; i += 7) for (const s of [-1, 1]) { const p = P[i], t = tan[i]; const m = new THREE.Mesh(bg, BUOY[s > 0 ? 0 : 1]); m.castShadow = true; const x = p.x + t.z * s * 13, z = p.z - t.x * s * 13; m.position.set(x, 0, z); world.add(m); buoys.push({ m, x, z, ph: r() * 6 }); }
  { const fl = []; for (let i = 0; i < N; i += 2) for (const s of [-1, 1]) { const p = P[i], t = tan[i]; fl.push([p.x + t.z * s * 13, p.z - t.x * s * 13, (i / 2) % 2]); } const fg = new THREE.SphereGeometry(.38, 10, 8); for (const c of [0, 1]) { const L = fl.filter(f => f[2] === c); const im = new THREE.InstancedMesh(fg, std(c ? '#ffffff' : '#ff6a1a', { roughness: .4, emissive: C(c ? '#666' : '#a02a00') }), L.length); im.frustumCulled = false; world.add(im); laneF.push({ im, L }); } }
  { const chevT = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d'); x.fillStyle = '#ffd21a'; x.fillRect(0, 0, 256, 96); x.fillStyle = '#111'; for (let k = 0; k < 3; k++) { const ox = 30 + k * 72; x.beginPath(); x.moveTo(ox, 10); x.lineTo(ox + 40, 48); x.lineTo(ox, 86); x.lineTo(ox + 22, 86); x.lineTo(ox + 62, 48); x.lineTo(ox + 22, 10); x.fill(); } const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; })();
    const cm = new THREE.MeshStandardMaterial({ map: chevT, emissive: C('#fff'), emissiveMap: chevT, emissiveIntensity: .35, side: THREE.DoubleSide }); const pm = std('#333');
    for (let i = 0; i < N; i += 6) { const a = tan[(i - 6 + N) % N], b = tan[(i + 6) % N]; const turn = a.x * b.z - a.z * b.x; if (Math.abs(turn) < .22) continue; const s = turn > 0 ? 1 : -1; const p = P[i], t = tan[i]; const g = new THREE.Group(); const bd = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.6), cm); bd.position.y = 3.2; bd.scale.x = s; g.add(bd); for (const q of [-2.8, 2.8]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 3.4, 6), pm); pl.position.set(q, 1.5, 0); g.add(pl); } g.position.set(p.x + t.z * s * 17, 0, p.z - t.x * s * 17); g.rotation.y = Math.atan2(-t.x, -t.z); world.add(g); i += 6; } }
  const archM = [std('#ff5a1a', { roughness: .5 }), std('#ffffff', { roughness: .5 })];
  PATH.cps.forEach((ci, k) => { const p = P[ci], t = tan[ci]; const g = new THREE.Group(); const arc = new THREE.Mesh(new THREE.TorusGeometry(12.5, .55, 10, 40, Math.PI), archM[k === 0 ? 1 : 0]); g.add(arc); for (let j = 0; j < 9; j++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.62, .12, 6, 16), archM[k === 0 ? 0 : 1]); const a = (j + .5) / 9 * Math.PI; ring.position.set(Math.cos(a) * 12.5, Math.sin(a) * 12.5, 0); ring.rotation.y = Math.PI / 2; ring.rotation.z = a; g.add(ring); }
    if (k === 0) { const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d'); for (let i = 0; i < 16; i++) for (let j = 0; j < 3; j++) { x.fillStyle = (i + j) % 2 ? '#111' : '#fff'; x.fillRect(i * 32, j * 32, 32, 32); } const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const ban = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.6), new THREE.MeshStandardMaterial({ map: tx, side: THREE.DoubleSide })); ban.position.y = 11.2; g.add(ban); }
    g.position.set(p.x, 0, p.z); g.rotation.y = Math.atan2(t.x, t.z); world.add(g); arches.push({ g, i: ci }); });
  const rampM = std('#9a6a3a', { roughness: .8 }), stripe = std('#ffd21a', { roughness: .5 });
  for (let k = 0; k < 8; k++) { const ci = Math.floor((k + .55) * N / 8); const p = P[ci], t = tan[ci]; const off = (r() - .5) * 8; const g = new THREE.Group(); const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(6, 0); shape.lineTo(6, 2.1); shape.closePath(); const geo = new THREE.ExtrudeGeometry(shape, { depth: 4.5, bevelEnabled: false }); geo.translate(-3, 0, -2.25); geo.rotateY(-Math.PI / 2);
    const m = new THREE.Mesh(geo, rampM); m.castShadow = m.receiveShadow = true; g.add(m); const st = new THREE.Mesh(new THREE.BoxGeometry(4.6, .05, .4), stripe); st.position.set(0, 2.12, 3); g.add(st); for (const sx of [-1, 1]) { const fl = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 6.2, 10), std('#ff5a1a')); fl.rotation.x = Math.PI / 2; fl.position.set(sx * 2.4, .1, 0); g.add(fl); }
    const x = p.x + t.z * off, z = p.z - t.x * off; g.position.set(x, 0, z); g.rotation.y = Math.atan2(t.x, t.z); world.add(g); ramps.push({ g, x, z, yaw: Math.atan2(t.x, t.z), i: ci });
    for (let j = 0; j < 5; j++) addItem('star', ci + 5 + j * 2, off * (1 - j * .15), 5 + Math.sin(j / 4 * Math.PI) * 3.2); }
  brings.length = 0; const ringM = new THREE.MeshStandardMaterial({ color: '#2ad8ff', emissive: C('#0aa8ff'), emissiveIntensity: 1.6, metalness: .3, roughness: .3 }); for (let k = 0; k < 7; k++) { const ci = Math.floor((k + .2) * N / 7); const p = P[ci], t = tan[ci]; const off = (r() - .5) * 10; const x = p.x + t.z * off, z = p.z - t.x * off; const g = new THREE.Mesh(new THREE.TorusGeometry(2.6, .28, 10, 32), ringM); g.position.set(x, 2.2, z); g.rotation.y = Math.atan2(t.x, t.z); world.add(g); brings.push({ m: g, x, z, cd: 0 }); }
  for (let i = 20; i < N; i += 34) { const off = (r() - .5) * 14; for (let j = 0; j < 5; j++) addItem('star', i + j * 3, off + Math.sin(j) * 1.5, 1.2); } for (let i = 60; i < N; i += 95) addItem('turbo', i, (r() - .5) * 10, 1.3);
  const sandM = std('#f2dca0', { roughness: .95 }), grassM = std('#3a9a3a', { roughness: .9 }), rockM = std('#6a6a70', { roughness: .9, flatShading: true }), trunkM = std('#7a5a3a', { roughness: .9 }), leafM = std('#2a8a3a', { roughness: .8, side: THREE.DoubleSide });
  for (let k = 0; k < 9; k++) { const a = k / 9 * TAU + r(); const d = TR.R * (k % 2 ? .45 : 2.05) + r() * 30; const x = Math.cos(a) * d * 1.2, z = Math.sin(a) * d; let ok = true; for (let i = 0; i < N; i += 4) if (Math.hypot(P[i].x - x, P[i].z - z) < 34) { ok = false; break; } if (!ok) continue;
    const g = new THREE.Group(); const R0 = 10 + r() * 14; const isl = new THREE.Mesh(new THREE.SphereGeometry(R0, 24, 10, 0, TAU, 0, Math.PI / 2), sandM); isl.scale.y = .22; isl.receiveShadow = true; g.add(isl); const top = new THREE.Mesh(new THREE.SphereGeometry(R0 * .7, 20, 8, 0, TAU, 0, Math.PI / 2), TR.rain ? rockM : grassM); top.scale.y = .32; top.position.y = .4; g.add(top);
    for (let j = 0; j < 3 + r() * 4; j++) { const pg = new THREE.Group(); const h = 5 + r() * 4; const tr2 = new THREE.Mesh(new THREE.CylinderGeometry(.18, .3, h, 6), trunkM); tr2.position.y = h / 2; tr2.rotation.z = (r() - .5) * .4; pg.add(tr2); for (let l = 0; l < 7; l++) { const lf = new THREE.Mesh(new THREE.PlaneGeometry(.9, 3.6), leafM); lf.position.set(0, h, 0); lf.rotation.set(-1.1, l / 7 * TAU, 0); lf.translateY(1.5); pg.add(lf); } const a2 = r() * TAU, d2 = r() * R0 * .5; pg.position.set(Math.cos(a2) * d2, 1.5, Math.sin(a2) * d2); pg.traverse(m => { if (m.isMesh) m.castShadow = true; }); g.add(pg); }
    g.position.set(x, -.6, z); world.add(g); }
  for (let k = 0; k < 14; k++) { const i = Math.floor(r() * N); const s = r() < .5 ? -1 : 1; const p = P[i], t = tan[i]; const x = p.x + t.z * s * (19 + r() * 20), z = p.z - t.x * s * (19 + r() * 20); const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2 + r() * 2.2, 0), rockM); m.position.set(x, -.3, z); m.rotation.set(r(), r(), r()); m.castShadow = true; world.add(m); }
  buildWildlife(); }
const ITM = { star: { geo: (() => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, rr = i % 2 ? .3 : .7; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } return new THREE.ExtrudeGeometry(s, { depth: .18, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 2 }).center(); })(), mat: new THREE.MeshStandardMaterial({ color: '#ffd21a', emissive: C('#ffb000'), emissiveIntensity: .7, metalness: .6, roughness: .3 }) },
  turbo: { geo: new THREE.CylinderGeometry(.42, .42, 1.1, 14), mat: new THREE.MeshStandardMaterial({ color: '#2ad8ff', emissive: C('#0a8aff'), emissiveIntensity: 1.1, metalness: .4, roughness: .3 }) } };
function addItem(k, i, off, y) { const { P, tan, N } = PATH; i = ((i % N) + N) % N; const p = P[i], t = tan[i]; const m = new THREE.Mesh(ITM[k].geo, ITM[k].mat); const x = p.x + t.z * off, z = p.z - t.x * off; m.position.set(x, y, z); world.add(m); items.push({ k, m, x, z, y, on: 1, t: 0 }); }

/* ================= WILDLIFE ================= */
const dolphins = [], sharks = [];
function dolphinMesh() { const g = new THREE.Group(); const M = new THREE.MeshPhysicalMaterial({ color: '#6a8aa8', roughness: .35, clearcoat: .6 }), B = std('#d8e4ee', { roughness: .4 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.42, 18, 12), M); body.scale.set(1, .85, 3.1); g.add(body); const belly = new THREE.Mesh(new THREE.SphereGeometry(.36, 14, 10), B); belly.scale.set(.9, .6, 2.8); belly.position.y = -.12; g.add(belly);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.12, .5, 10), M); beak.rotation.x = Math.PI / 2; beak.position.set(0, -.08, 1.5); g.add(beak); const fin = new THREE.Mesh(new THREE.ConeGeometry(.22, .55, 4), M); fin.position.set(0, .45, -.1); fin.rotation.x = -.5; fin.scale.z = .3; g.add(fin);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1, .05, .35), M); tail.position.set(0, 0, -1.35); g.add(tail); for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(.5, .04, .2), M); f.position.set(s * .38, -.18, .5); f.rotation.z = s * .5; g.add(f); } for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.04, 6, 6), std('#111')); e.position.set(s * .22, .05, 1.0); g.add(e); }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; }); return g; }
function sharkMesh() { const g = new THREE.Group(); const M = std('#4a5a68', { roughness: .5 }); const body = new THREE.Mesh(new THREE.SphereGeometry(.55, 16, 12), M); body.scale.set(1, .8, 3.6); body.position.y = -.9; g.add(body);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(.5, 1.3, 3), std('#2a3640', { roughness: .5 })); fin.scale.z = .25; fin.position.set(0, .2, 0); fin.rotation.x = -.2; g.add(fin); const tl = new THREE.Mesh(new THREE.ConeGeometry(.35, 1, 3), M); tl.scale.z = .2; tl.position.set(0, -.5, -2); tl.rotation.x = -.6; g.add(tl); g.traverse(m => { if (m.isMesh) m.castShadow = true; }); return g; }
function buildWildlife() { dolphins.length = sharks.length = 0; for (let k = 0; k < 3; k++) { const m = dolphinMesh(); m.visible = false; world.add(m); dolphins.push({ m, t: -1, ph: k * .45 }); }
  const { P, N } = PATH; for (let k = 0; k < TR.shark; k++) { const ci = Math.floor((k + .3) * N / Math.max(1, TR.shark)); const m = sharkMesh(); world.add(m); sharks.push({ m, c: P[ci].clone(), a: Math.random() * TAU, r: 7 + Math.random() * 3, cd: 0, breach: -1 }); } }
let podT = 4, pod = null;
function wildlife(dt) { podT -= dt; if (podT <= 0 && me && me.sp > 8) { podT = 9 + Math.random() * 6; const s = Math.random() < .5 ? -1 : 1; const fx = Math.sin(me.yaw), fz = Math.cos(me.yaw); pod = { x: me.pos.x + fx * 26 + fz * s * 9, z: me.pos.z + fz * 26 - fx * s * 9, yaw: me.yaw, t: 0 }; dolphins.forEach((d, k) => { d.t = -d.ph; d.m.visible = true; }); A.tone(2400, .25, 'sine', .04, 0, 3200); A.tone(2800, .2, 'sine', .035, .3, 3600); }
  if (pod) { pod.t += dt; pod.x += Math.sin(pod.yaw) * 11 * dt; pod.z += Math.cos(pod.yaw) * 11 * dt; let any = false;
    dolphins.forEach((d, k) => { d.t += dt; if (d.t < 0) return; const cyc = 1.3, u = (d.t % cyc) / cyc; const n = Math.floor(d.t / cyc); if (n >= 3) { d.m.visible = false; return; } any = true; const x = pod.x + Math.cos(k * 2.1) * 2.2 + Math.sin(pod.yaw) * u * 6, z = pod.z + Math.sin(k * 2.1) * 2.2 + Math.cos(pod.yaw) * u * 6; const y = Math.sin(u * Math.PI) * 2.6 - .6 + waveH(x, z);
      d.m.position.set(x, y, z); d.m.rotation.set(-Math.cos(u * Math.PI) * 1.0, pod.yaw, 0); d.m.visible = true; if (u < .06 || (u > .93 && u < .99)) for (let q = 0; q < 3; q++) FX.emit(V3(x, waveH(x, z) + .2, z), V3(rnd(-2, 2), rnd(2, 4), rnd(-2, 2)), [.9, .95, 1], .25, .7, 9); });
    if (!any) pod = null; }
  for (const s of sharks) { s.a += dt * .6; const x = s.c.x + Math.cos(s.a) * s.r, z = s.c.z + Math.sin(s.a) * s.r; s.x = x; s.z = z; const h = waveH(x, z); s.cd -= dt;
    if (s.breach >= 0) { s.breach += dt; const u = s.breach / 1.4; s.m.position.set(x, h - .4 + Math.sin(Math.min(1, u) * Math.PI) * 3.4, z); s.m.rotation.set(-Math.cos(Math.min(1, u) * Math.PI) * .9, -s.a, 0); if (u > 1) { s.breach = -1; for (let q = 0; q < 20; q++) FX.emit(V3(x, h + .3, z), V3(rnd(-3, 3), rnd(3, 7), rnd(-3, 3)), [.9, .95, 1], .35, 1, 9); A.noise(.8, 'lowpass', 500, 1, .25); } }
    else { s.m.position.set(x, h - .1, z); s.m.rotation.set(0, -s.a, 0); if (Math.random() < dt * 2) FX.emit(V3(x, h + .1, z), V3(rnd(-.5, .5), .6, rnd(-.5, .5)), [.92, .96, 1], .2, .8, 2); }
    if (me && !me.air && s.cd <= 0 && Math.hypot(me.pos.x - x, me.pos.z - z) < 12 && s.breach < 0 && Math.random() < dt * .7) { s.breach = 0; s.cd = 6; A.tone(110, .6, 'sawtooth', .05, 0, 70); }
    for (const r of racers) if (!r.air && r.spinT <= 0 && Math.hypot(r.pos.x - x, r.pos.z - z) < 2.6) { r.spinT = 1.1; r.sp *= .3; if (r === me) { trickTxt('🦈 ' + T('כריש!', 'SHARK!'), true); buzz([60, 40, 60]); A.noise(.6, 'lowpass', 400, 1, .3); shake = .6; } } } }

/* ================= JET SKI + RIDER ================= */
function buildSki(col, col2) { const g = new THREE.Group(); const sh = new THREE.Shape(); sh.moveTo(0, 1.55); sh.bezierCurveTo(.55, 1.2, .62, .4, .6, -1.1); sh.lineTo(.52, -1.35); sh.lineTo(-.52, -1.35); sh.lineTo(-.6, -1.1); sh.bezierCurveTo(-.62, .4, -.55, 1.2, 0, 1.55);
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .38, bevelEnabled: true, bevelSize: .1, bevelThickness: .12, bevelSegments: 3, curveSegments: 16 }), new THREE.MeshPhysicalMaterial({ color: C(col), roughness: .25, clearcoat: 1, clearcoatRoughness: .1 }));
  hull.geometry.rotateZ(Math.PI); hull.rotation.x = -Math.PI / 2; hull.position.y = .05; g.add(hull); const low = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .14, bevelEnabled: true, bevelSize: .1, bevelThickness: .05, bevelSegments: 2 }), std('#f4f4f4', { roughness: .4 })); low.geometry.rotateZ(Math.PI); low.rotation.x = -Math.PI / 2; low.position.y = -.12; low.scale.set(1.02, 1.02, 1); g.add(low);
  const seat = new THREE.Mesh(new THREE.CapsuleGeometry(.24, .9, 4, 10), std('#1a1a22', { roughness: .7 })); seat.rotation.x = Math.PI / 2; seat.position.set(0, .58, -.45); seat.scale.set(1, 1, .55); g.add(seat);
  const cowl = new THREE.Mesh(new THREE.SphereGeometry(.42, 16, 10, 0, TAU, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: C(col2), roughness: .3, clearcoat: 1 })); cowl.scale.set(1.1, .7, 1.3); cowl.position.set(0, .5, .55); g.add(cowl);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .85, 8), std('#222', { metalness: .7, roughness: .3 })); bar.rotation.z = Math.PI / 2; bar.position.set(0, .95, .32); g.add(bar); const stem = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, .4, 8), std('#222')); stem.position.set(0, .78, .38); stem.rotation.x = -.4; g.add(stem);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.24, .1, 1.9), std(col2, { roughness: .4 })); stripe.position.set(0, .3, .1); g.add(stripe);
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; } }); return g; }
function buildRider(vest, helm, skin) { const g = new THREE.Group(); const V = std(vest, { roughness: .6 }), Sk = std(skin, { roughness: .6 }), Su = std('#1a2230', { roughness: .7 }), H = new THREE.MeshPhysicalMaterial({ color: C(helm), roughness: .2, clearcoat: 1 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.2, .36, 4, 10), V); torso.position.set(0, 1.18, -.25); torso.rotation.x = .45; torso.scale.set(1.15, 1, .85); g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.16, 16, 12), H); head.position.set(0, 1.62, -.05); g.add(head); const vis = new THREE.Mesh(new THREE.SphereGeometry(.15, 14, 10, 0, TAU, Math.PI * .3, Math.PI * .3), std('#111', { roughness: .1, metalness: .6 })); vis.position.copy(head.position).add(V3(0, -.01, .03)); g.add(vis);
  const arms = []; for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.CapsuleGeometry(.055, .5, 4, 8), Su); a.position.set(s * .26, 1.17, .07); a.rotation.set(1.05, 0, s * .25); g.add(a); arms.push(a); const hand = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), Sk); hand.position.set(s * .38, .97, .32); g.add(hand);
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(.085, .42, 4, 8), Su); th.position.set(s * .17, .78, -.25); th.rotation.x = 1.2; g.add(th); const sh2 = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .4, 4, 8), Su); sh2.position.set(s * .22, .5, .02); sh2.rotation.x = -.25; g.add(sh2); }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; }); return g; }

/* ================= REAL RIDERS (Mixamo) ================= */
const RIDERS = ['lib/chars/remy.glb', 'lib/chars/kai.glb', 'lib/chars/zori.glb', 'lib/chars/rio.glb'], RSRC = {};
const _rq = new THREE.Quaternion(), AX = new THREE.Vector3(1, 0, 0);
function seatPose(M) { // static seated pose on the jet ski (faces +z)
  M.hips(V3(0, .8, -.42).sub(M.restP.Hips)); M.set('Hips', _rq.setFromAxisAngle(AX, .1).clone().multiply(M.restW.Hips)); M.set('Spine', _rq.setFromAxisAngle(AX, .42).clone().multiply(M.restW.Spine));
  M.set('Head', _rq.setFromAxisAngle(AX, .05).clone().multiply(M.restW.Head)); M.apply();
  for (const [sd, s] of [['Left', 1], ['Right', -1]]) { M.limbIK(sd + 'Arm', sd + 'ForeArm', sd + 'Hand', M.pos(sd + 'Arm'), V3(s * .36, .98, .3), V3(s, -.6, 0).normalize());
    M.limbIK(sd + 'UpLeg', sd + 'Leg', sd + 'Foot', M.pos(sd + 'UpLeg'), V3(s * .24, .3 + M.ankleH * .6, -.02), V3(0, 0, 1)); M.set(sd + 'Foot', M.restW[sd + 'Foot']); }
  M.apply(['LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot']); }
function dressRider(r) { const src = RSRC[RIDERS[r.k]]; if (!src || r.mx) return; const M = new MixRig(src, 1.74); seatPose(M); r.rd.traverse(o => { if (o.isMesh) o.visible = false; }); r.rd.add(M.holder); r.mx = M; }
RIDERS.forEach(u => loadMix(u).then(src => { if (!src) return; RSRC[u] = src; racers.forEach(dressRider); }));

/* ================= RACERS ================= */
const RCOL = [['#ff3a2a', '#ffffff', '#ffd21a'], ['#2a8aff', '#ffd21a', '#ffffff'], ['#22c86a', '#1a1a22', '#ff8a1a'], ['#b04aff', '#ffffff', '#2ad8ff']];
const ANAMES = ['Kai', 'Luna', 'Rio'];
const racers = []; let me = null; const sunDir = V3();
function mkRacer(k) { const [c, c2, h] = RCOL[k]; const g = new THREE.Group(); const ski = buildSki(c, c2); g.add(ski); const rd = buildRider(k ? c : '#ff8a1a', h, ['#f2c3a0', '#c98a5a', '#8a5a3a', '#f2d0b0'][k]); g.add(rd); world.add(g);
  const r = { k, g, ski, rd, pos: V3(), vel: V3(), yaw: 0, sp: 0, vy: 0, air: false, pitch: 0, roll: 0, spin: 0, flip: 0, idx: 0, lap: 0, cp: 0, prog: 0, fin: 0, turbo: 0, boost: 0, crash: 0, spinT: 0, name: k ? ANAMES[k - 1] : T('אתה', 'You'), ai: k > 0, stars: 0, tricks: 0, last: 0, lean: 0 }; racers.push(r); dressRider(r); return r; }
function placeAt(r, i, off) { const { P, tan, N } = PATH; i = ((i % N) + N) % N; const p = P[i], t = tan[i]; r.pos.set(p.x + t.z * off, 0, p.z - t.x * off); r.yaw = Math.atan2(t.x, t.z); r.sp = 0; r.vy = 0; r.air = false; r.pitch = r.roll = r.flip = r.spin = 0; r.idx = i; }
function nearestIdx(r) { const { P, N } = PATH; let best = r.idx, bd = 1e9; for (let k = -12; k <= 40; k++) { const i = (r.idx + k + N) % N; const d = (P[i].x - r.pos.x) ** 2 + (P[i].z - r.pos.z) ** 2; if (d < bd) { bd = d; best = i; } }
  if (bd > 400) { for (let k = -Math.floor(N / 4); k <= Math.floor(N / 4); k++) { const i = (r.idx + k + N) % N; const d = (P[i].x - r.pos.x) ** 2 + (P[i].z - r.pos.z) ** 2; if (d < bd) { bd = d; best = i; } } } return [best, Math.sqrt(bd)]; }

/* ================= INPUT ================= */
const inp = { l: 0, r: 0, gas: 0, brk: 0 }; const keys = {};
function hold(id, k) { const b = $(id); const on = e => { e.preventDefault(); A.ac(); inp[k] = 1; b.classList.add('on'); }; const off = () => { inp[k] = 0; b.classList.remove('on'); }; b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off); }
hold('bL', 'l'); hold('bR', 'r'); hold('bGas', 'gas'); hold('bBrk', 'brk');
$('bTrk').addEventListener('pointerdown', e => { e.preventDefault(); A.ac(); useTurbo(me); });
addEventListener('keydown', e => { keys[e.code] = 1; if (e.code === 'Space' && me) useTurbo(me); if (e.code === 'Escape') pause(); }); addEventListener('keyup', e => keys[e.code] = 0);
function ctrl() { const st = (inp.r || keys.ArrowRight || keys.KeyD ? 1 : 0) - (inp.l || keys.ArrowLeft || keys.KeyA ? 1 : 0); const gas = inp.gas || keys.ArrowUp || keys.KeyW ? 1 : 0, brk = inp.brk || keys.ArrowDown || keys.KeyS ? 1 : 0; return { st, gas: isTouch ? gas : (gas || (!brk && S.autoGas !== 0 ? 0 : 0)), brk }; }
function useTurbo(r) { if (!r || r.turbo <= 0 || r.boost > 0 || state !== 'play') return; r.turbo--; r.boost = 2.2; if (r === me) { A.noise(1, 'bandpass', 900, 1, .14, 0, 2400); trickTxt('🚀 TURBO!'); updTurbo(); } }

/* ================= PHYSICS ================= */
const MAXS = 33;
function stepRacer(r, dt, c) { const prevAir = r.air;
  if (r.crash > 0) { r.crash -= dt; if (r.crash <= 0) respawn(r); return; }
  r.boost = Math.max(0, r.boost - dt); const top = MAXS * (r.boost > 0 ? 1.45 : 1) * (r.ai ? r.aiS : 1);
  if (!r.air) { const acc = c.gas ? 16 * (1 - r.sp / top) + 2 + (r.boost > 0 ? 12 : 0) : 0; r.sp += acc * dt; if (c.brk) r.sp -= (r.sp > 0 ? 14 : 4) * dt; r.sp -= r.sp * (c.gas ? .06 : .45) * dt; r.sp = clamp(r.sp, -5, top * 1.05);
    if (r.spinT > 0) { r.spinT -= dt; r.spin += dt * 9; } else r.spin = lerp(r.spin, Math.round(r.spin / TAU) * TAU, dt * 6);
    const turn = c.st * (1.45 - Math.min(.5, r.sp / 70)) * (r.sp < 0 ? -1 : 1); r.yaw -= turn * dt * Math.min(1, Math.abs(r.sp) / 4 + .2); r.lean = lerp(r.lean, -c.st * Math.min(1, r.sp / 14) * .45, dt * 5);
    const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); r.pos.x += fx * r.sp * dt; r.pos.z += fz * r.sp * dt; const h = waveH(r.pos.x, r.pos.z); const hA = waveH(r.pos.x + fx * 1.2, r.pos.z + fz * 1.2), hB = waveH(r.pos.x - fx * 1.2, r.pos.z - fz * 1.2);
    const slope = (hA - hB) / 2.4; const targetP = -Math.atan(slope); r.pitch = lerp(r.pitch, targetP, dt * 8); const hvel = (h - r.pos.y) / Math.max(dt, 1e-3); r.pos.y = lerp(r.pos.y, h, Math.min(1, dt * 14));
    if (r.sp > 18 && hvel > 3.4 && slope < -.04 && Math.random() < .5) launch(r, hvel * .5 + r.sp * .04, false);
    for (const rp of ramps) { const dx = r.pos.x - rp.x, dz = r.pos.z - rp.z; const ax = Math.sin(rp.yaw), az = Math.cos(rp.yaw); const along = dx * ax + dz * az, side = dx * az - dz * ax; if (Math.abs(side) < 2.4 && along > -3 && along < 3 && r.sp > 6) { const rh = (along + 3) / 6 * 2.1; r.pos.y = Math.max(r.pos.y, rh + waveH(rp.x, rp.z) * .5); r.pitch = -.34; if (along > 2.5) launch(r, 7 + r.sp * .3, true); } }
    for (const br of brings) { if (Math.hypot(r.pos.x - br.x, r.pos.z - br.z) < 3.2 && br.cd <= 0) { r.boost = Math.max(r.boost, 1.4); if (r === me) { br.cd = 1.5; A.noise(.8, 'bandpass', 1200, 1, .14, 0, 2600); trickTxt('⚡ BOOST!'); shake = .25; } } }
    if (r === me && r.sp > 22 && Math.random() < .7) { const fx2 = Math.sin(r.yaw), fz2 = Math.cos(r.yaw); const sd = rnd(-1, 1) > 0 ? 1 : -1; FX.emit(V3(camera.position.x + fz2 * sd * rnd(2, 4) + fx2 * 6, camera.position.y + rnd(-1.5, 1.5), camera.position.z - fx2 * sd * rnd(2, 4) + fz2 * 6), V3(-fx2 * 40, 0, -fz2 * 40), [1, 1, 1], .05, .3, 0, .5); }
    if (r.sp > 6 && !r.ai || (r.ai && r.sp > 6 && Math.random() < .5)) { const back = V3(r.pos.x - fx * 1.4, h + .1, r.pos.z - fz * 1.4); if (Math.random() < .55) FX.emit(back, V3(-fx * 2.5 + rnd(-.6, .6), .8 + r.sp * .06 + rnd(0, .6), -fz * 2.5 + rnd(-.6, .6)), [.92, .96, 1], .16 + r.sp * .005, .42, 9, .55); if (Math.abs(c.st) > .3 && r.sp > 12 && Math.random() < .35) FX.emit(V3(r.pos.x + fz * c.st * .7, h + .05, r.pos.z - fx * c.st * .7), V3(fz * c.st * 3.5, 1.2, -fx * c.st * 3.5), [.95, .98, 1], .15, .35, 9, .5); if (Math.random() < .6) FX.emit(V3(r.pos.x - fx * 2.2, h + .02, r.pos.z - fz * 2.2), V3(0, 0, 0), [.9, .95, 1], .34, .9, 0, .3); } }
  else { r.vy -= 16 * dt; r.pos.x += Math.sin(r.yaw) * r.sp * dt; r.pos.z += Math.cos(r.yaw) * r.sp * dt; r.pos.y += r.vy * dt; r.airT += dt;
    if (!r.ai && r.big) { if (c.brk) r.flip += dt * 6; else r.flip = lerp(r.flip, Math.round(r.flip / TAU) * TAU, dt * 3.5); if (c.st) r.spin += c.st * dt * 7.5; else r.spin = lerp(r.spin, Math.round(r.spin / TAU) * TAU, dt * 3.5); } else { r.pitch = lerp(r.pitch, -.15, dt * 2); if (!r.ai) r.yaw -= c.st * dt * .9; }
    const h = waveH(r.pos.x, r.pos.z); if (r.pos.y <= h && r.vy < 0) land(r, h); }
  // track keeping
  const [idx, dist] = nearestIdx(r); const N = PATH.N; const prevIdx = r.idx; r.idx = idx; const nxt = PATH.cps[(r.cp + 1) % 6]; const d1 = (idx - nxt + N) % N; if (d1 < 20 && (r.cp + 1) % 6 !== r.cp) { r.cp = (r.cp + 1) % 6; if (r.cp === 0) { r.lap++; if (r === me && r.lap < LAPS) { trickTxt(T('הקפה ', 'LAP ') + (r.lap + 1) + '/' + LAPS); A.tone(880, .2, 'triangle', .07); A.tone(1320, .3, 'triangle', .06, .12); } if (r.lap >= LAPS && !r.fin) { r.fin = ++finCount; } } else if (r === me) { A.tone(1200, .1, 'sine', .05); } }
  r.prog = r.lap * N + ((idx - PATH.cps[0] + N) % N) + (r.cp === 0 && (idx - PATH.cps[0] + N) % N > N * .8 ? -N : 0);
  if (r === me) { const t = PATH.tan[idx]; const fdot = Math.sin(r.yaw) * t.x + Math.cos(r.yaw) * t.z; const wrong = dist > 34 || (fdot < -.35 && r.sp > 4); const ww = $('ww'); if (wrong) { const tgt = PATH.P[(idx + 12) % N]; const a = Math.atan2(tgt.x - r.pos.x, tgt.z - r.pos.z) - r.yaw; const sa = Math.sin(a); ww.hidden = false; ww.textContent = (sa > 0 ? '⬅️ ' : '') + (fdot < -.35 ? T('כיוון הפוך! תסתובבו', 'Wrong way! Turn around') : T('חזרה למסלול', 'Back to the course')) + (sa > 0 ? '' : ' ➡️'); } else ww.hidden = true;
    r.offT = dist > 70 && !r.air ? (r.offT || 0) + 1 / 60 : 0; if (r.offT > 2.5) { r.offT = 0; trickTxt(T('חזרה למסלול', 'Back to course'), true); respawn(r); } }
  if (r === me && !prevAir && r.air) { r.airT = 0; } }
function launch(r, vy, big = true) { if (r.air) return; r.air = true; r.big = big; r.vy = vy; r.airT = 0; r.flip = 0; r.spin = Math.round(r.spin / TAU) * TAU; r.flip0 = 0; if (r === me) { A.noise(.3, 'highpass', 2000, 1, .08); } }
function land(r, h) { r.air = false; r.pos.y = h; const fl = r.flip, sp2 = r.spin; const fr = Math.round(fl / TAU), sr = Math.round(sp2 / TAU); const ef = Math.abs(fl - fr * TAU), es = Math.abs(sp2 - sr * TAU); const ok = ef < 1.9 && es < 1.9; const wobbly = ok && (ef > .8 || es > .8);
  for (let q = 0; q < 26; q++) FX.emit(V3(r.pos.x + rnd(-1, 1), h + .2, r.pos.z + rnd(-1, 1)), V3(rnd(-4, 4), rnd(2, 7), rnd(-4, 4)), [.92, .96, 1], .35, 1, 12);
  if (!ok) { crash(r); return; } r.flip = 0; r.spin = sr * TAU; r.vy = 0; if (wobbly) { r.sp *= .7; if (r === me) trickTxt(T('😅 כמעט!', '😅 Close one!'), true); }
  if (r === me) { A.noise(.5, 'lowpass', 600, 1, .22); shake = .35; buzz(30); const nf = Math.abs(fr), ns = Math.abs(sr); if (nf || ns) { const name = (nf ? (fl < 0 ? T('סלטה קדימה', 'FRONT FLIP') : T('סלטה אחורה', 'BACKFLIP')) + (nf > 1 ? ' x' + nf : '') : '') + (ns ? (nf ? ' + ' : '') + (ns * 360) + '°' : ''); r.tricks += (nf + ns); r.turbo = Math.min(3, r.turbo + 1); updTurbo(); trickTxt('🤸 ' + name + '!'); A.voice('yay', 1.3); [0, 4, 7, 12].forEach((k, i) => A.tone(660 * Math.pow(2, k / 12), .15, 'triangle', .06, i * .07)); } else if (r.airT > .6) trickTxt(T('נחיתה נקייה!', 'Clean landing!')); } }
function crash(r) { r.crash = 1.6; r.sp = 0; if (r === me) { trickTxt(T('💦 נפילה!', '💦 WIPEOUT!'), true); A.noise(1, 'lowpass', 400, 1, .3); A.voice('aww', 1.2); shake = .8; buzz([80, 40, 80]); } }
function respawn(r) { const i = PATH.cps[r.cp]; placeAt(r, i + 2, r.ai ? (r.k - 2) * 3 : 0); r.pos.y = waveH(r.pos.x, r.pos.z); r.crash = 0; r.boost = 0; }
function aiCtrl(r) { const { P, N } = PATH; const look = 9 + Math.round(Math.max(0, r.sp) * .45); const p = P[(r.idx + look) % N]; const tx = p.x + PATH.tan[(r.idx + look) % N].z * r.lane, tz = p.z - PATH.tan[(r.idx + look) % N].x * r.lane; const want = Math.atan2(tx - r.pos.x, tz - r.pos.z); const d = wrapPi(want - r.yaw);
  if (Math.random() < .002 && r.turbo > 0) useTurbo(r); return { st: clamp(-d * 2.4, -1, 1), gas: 1, brk: 0 }; }

/* ================= ITEMS ================= */
function itemsUpdate(dt) { const t = performance.now() / 1000; for (const it of items) { if (!it.on) { it.t -= dt; if (it.t <= 0) { it.on = 1; it.m.visible = true; } continue; } it.m.rotation.y = t * 2.4; it.m.position.y = it.y + waveH(it.x, it.z) * (it.y < 2 ? 1 : 0) + Math.sin(t * 2 + it.x) * .15;
    for (const r of racers) { if (r.crash > 0) continue; if (Math.abs(r.pos.x - it.x) < 2 && Math.abs(r.pos.z - it.z) < 2 && Math.abs(r.pos.y + .8 - it.m.position.y) < 2.2) { it.on = 0; it.m.visible = false; it.t = 8;
        if (it.k === 'star') { r.stars++; if (r === me) { $('starTxt').textContent = '⭐ ' + r.stars; A.tone(1320 + (r.stars % 5) * 120, .12, 'triangle', .06); A.tone(1980, .1, 'sine', .04, .05); FX.burst(it.m.position.clone(), 10, [[3, 2.4, .5]], 3, .12, .6, 4); } }
        else { r.turbo = Math.min(3, r.turbo + 1); if (r === me) { updTurbo(); A.tone(600, .3, 'sine', .07, 0, 1400); trickTxt('🚀 +1'); } } break; } } }
  for (const br of brings) { br.cd -= dt; br.m.position.y = 2.1 + waveH(br.x, br.z) * .6; br.m.rotation.z = t * 1.5; } { const m4 = new THREE.Matrix4(); for (const lf of laneF) { lf.L.forEach((f, i) => { m4.makeTranslation(f[0], waveH(f[0], f[1]) + .1, f[1]); lf.im.setMatrixAt(i, m4); }); lf.im.instanceMatrix.needsUpdate = true; } } for (const b of buoys) { b.m.position.y = waveH(b.x, b.z) + .15; b.m.rotation.z = Math.sin(t * 1.3 + b.ph) * .2; }
  for (const rp of ramps) rp.g.position.y = waveH(rp.x, rp.z) * .5 - .1; for (const a of arches) a.g.position.y = waveH(a.g.position.x, a.g.position.z) * .3 - .4; }
function updTurbo() { const b = $('bTrk'); b.textContent = me && me.turbo ? '🚀' + me.turbo : '🚀'; b.classList.toggle('live', !!(me && me.turbo)); }

/* ================= RACE FLOW ================= */
let state = 'title', ti = S.track, LAPS = 3, finCount = 0, cdT = 0, raceT = 0, shake = 0; const camP = V3(), camL = V3();
function clearRacers() { racers.length = 0; me = null; }
function setup(preview) { clearRacers(); buildWorld(ti); for (let k = 0; k < 4; k++) mkRacer(k); me = racers[0]; racers.forEach((r, k) => { placeAt(r, PATH.cps[0] - 8 - Math.floor(k / 2) * 6, (k % 2 ? 3.5 : -3.5)); r.pos.y = waveH(r.pos.x, r.pos.z); r.lap = 0; r.cp = 0; r.fin = 0; r.turbo = 1; r.stars = 0; r.tricks = 0; r.lane = rnd(-5, 5); r.aiS = [1, .88, .92, .95][k] * [1, 1, 1.03, 1.05][ti]; });
  finCount = 0; raceT = 0; const f = V3(Math.sin(me.yaw), 0, Math.cos(me.yaw)); camP.copy(me.pos).addScaledVector(f, -8).setY(4); camL.copy(me.pos); }
function start() { A.ac(); S.track = ti; S.save(); $('loading').hidden = false; setTimeout(() => { setup(false); $('loading').hidden = true; $('title').hidden = true; $('hud').hidden = false; $('spd').hidden = false; $('mini').hidden = false; $('cL').hidden = $('cR').hidden = false; $('endSheet').hidden = true; updTurbo(); $('starTxt').textContent = '⭐ 0';
  state = 'count'; cdT = 3.2; A.loopTone('eng', 'sawtooth', 70, .03); A.loopTone('eng2', 'square', 140, .008); A.loopOn('sea', 'lowpass', 600, .5, .05, .2); if (!S.tut) { S.tut = 1; S.save(); setTimeout(() => toast(T('⏩ גז, ◀▶ היגוי. מעל רמפה: החזיקו ⏪ לסלטה ו־◀▶ לסיבוב! נחיתה ישרה = טורבו 🚀', '⏩ gas, ◀▶ steer. Off a ramp: hold ⏪ to flip, ◀▶ to spin! Land straight = turbo 🚀'), 5200), 3400); } }, 40); }
function cdTick(dt) { const b = Math.ceil(cdT); cdT -= dt; const a = Math.ceil(cdT); if (a !== b && a >= 0) { $('cd').innerHTML = `<b>${a > 0 ? a : 'GO!'}</b>`; A.tone(a > 0 ? 440 : 880, a > 0 ? .15 : .4, 'square', .06); } if (cdT <= 0) { state = 'play'; setTimeout(() => $('cd').innerHTML = '', 700); } }
function updHud() { const ord = racers.slice().sort((a, b) => (b.fin ? 1e9 - b.fin : b.prog) - (a.fin ? 1e9 - a.fin : a.prog)); const pos = ord.indexOf(me) + 1; $('posTxt').textContent = pos + '/4'; $('posSub').textContent = T('מקום', 'place'); $('lapTxt').textContent = Math.min(LAPS, me.lap + 1) + '/' + LAPS; $('lapSub').textContent = T('הקפה', 'lap');
  $('timeTxt').textContent = fmt(raceT); $('spdTxt').textContent = Math.round(Math.abs(me.sp) * 3.6); return ord; }
const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function finish() { state = 'done'; A.loopOff('eng'); A.loopOff('eng2'); A.loopOff('sea'); const ord = updHud(); const p = me.fin || 4; const st = p === 1 ? 3 : p === 2 ? 2 : p === 3 ? 1 : 0; if ((S.stars[ti] || 0) < st) S.stars[ti] = st; S.save();
  $('eT').textContent = p === 1 ? T('🏆 ניצחת!', '🏆 You win!') : T(`סיימת במקום ${p}`, `You finished #${p}`); [...$('eStars').children].forEach((e, k) => e.classList.toggle('on', k < st));
  $('eRes').innerHTML = ord.map((r, i) => `<li class="${r === me ? 'me' : ''}"><b>${i + 1}</b>${r.name}</li>`).join(''); $('eP').textContent = `⭐ ${me.stars} · 🤸 ${me.tricks} · ⏱️ ${fmt(raceT)}`;
  if (st) [0, 4, 7, 12].forEach((k, i) => A.tone(523 * Math.pow(2, k / 12), .3, 'triangle', .08, i * .12)); setTimeout(() => { $('endSheet').hidden = false; $('cL').hidden = $('cR').hidden = true; }, 1400); }
function pause() { if (state !== 'play' && state !== 'count') return; state = 'pause'; $('pauseSheet').hidden = false; A.loopOff('eng'); A.loopOff('eng2'); A.loopOff('sea'); }
function resume() { $('pauseSheet').hidden = true; state = cdT > 0 ? 'count' : 'play'; A.loopTone('eng', 'sawtooth', 70, .03); A.loopTone('eng2', 'square', 140, .008); A.loopOn('sea', 'lowpass', 600, .5, .05, .2); }
function trickTxt(s, bad) { const d = document.createElement('div'); d.textContent = s; if (bad) d.className = 'bad'; $('trick').innerHTML = ''; $('trick').appendChild(d); }
let rainT = 0;
function weather(dt) { if (!TR.rain || !me) return; for (let k = 0; k < 6; k++) FX.emit(V3(me.pos.x + rnd(-25, 25), me.pos.y + rnd(10, 16), me.pos.z + rnd(-25, 25)), V3(-2, -26, 0), [.75, .8, .9], .06, .7, 0, .6); rainT -= dt; if (rainT <= 0) { rainT = 6 + Math.random() * 9; E.grade.uniforms.uFlash.value = .8; A.noise(2.5, 'lowpass', 200, 1, .3, .3); } E.grade.uniforms.uFlash.value *= Math.pow(.02, dt); }

/* ================= MINIMAP ================= */
const mini = $('mini'), mx = mini.getContext('2d'); let miniBg = null;
function drawMini() { if (!PATH) return; const W = 208; if (!miniBg) { miniBg = document.createElement('canvas'); miniBg.width = miniBg.height = W; } const { P, N } = PATH; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of P) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); } const s = (W - 30) / Math.max(x1 - x0, z1 - z0); const tx = x => 15 + (x - x0) * s, tz = z => 15 + (z - z0) * s;
  mx.clearRect(0, 0, W, W); mx.strokeStyle = 'rgba(255,255,255,.75)'; mx.lineWidth = 6; mx.beginPath(); P.forEach((p, i) => i ? mx.lineTo(tx(p.x), tz(p.z)) : mx.moveTo(tx(p.x), tz(p.z))); mx.closePath(); mx.stroke();
  for (const r of racers) { mx.fillStyle = RCOL[r.k][0]; mx.beginPath(); mx.arc(tx(r.pos.x), tz(r.pos.z), r === me ? 9 : 6, 0, TAU); mx.fill(); if (r === me) { mx.strokeStyle = '#fff'; mx.lineWidth = 3; mx.stroke(); } } }

/* ================= LOOP ================= */
let last = performance.now(), hudT = 0;
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.04, (now - last) / 1000); last = now; A.tick(); WT += dt; oceanU.uT.value = WT;
  if (PATH) { if (state === 'count') { cdTick(dt); for (const r of racers) { r.pos.y = waveH(r.pos.x, r.pos.z); } }
    if (state === 'play') { raceT += dt; const c = ctrl(); for (const r of racers) stepRacer(r, dt, r === me ? c : aiCtrl(r)); for (let i = 0; i < racers.length; i++) for (let j = i + 1; j < racers.length; j++) { const a = racers[i], b = racers[j]; const d = Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z); if (d < 1.6 && d > 0) { const nx = (a.pos.x - b.pos.x) / d, nz = (a.pos.z - b.pos.z) / d; a.pos.x += nx * (1.6 - d) / 2; a.pos.z += nz * (1.6 - d) / 2; b.pos.x -= nx * (1.6 - d) / 2; b.pos.z -= nz * (1.6 - d) / 2; } }
      itemsUpdate(dt); wildlife(dt); weather(dt); if (me.fin && state === 'play') finish(); if (raceT > 600) finish();
      try { const e = A.loop('eng'); if (e && e.o) e.o.frequency.setTargetAtTime(60 + Math.abs(me.sp) * 5.5 + (me.air ? 60 : 0), 0, .05); } catch (er) { } hudT -= dt; if (hudT <= 0) { hudT = .15; updHud(); drawMini(); } }
    else if (state !== 'title') { itemsUpdate(0); }
    if (state === 'title') { const t = now / 1000; const p = PATH.P[Math.floor(t * 6) % PATH.N]; camL.lerp(p, .02); camera.position.set(camL.x + Math.cos(t * .1) * 30, 9, camL.z + Math.sin(t * .1) * 30); camera.lookAt(camL.x, 1, camL.z); itemsUpdate(dt); wildlifeIdle(dt); }
    for (const r of racers) poseRacer(r, dt);
    if (me && state !== 'title') { const f = V3(Math.sin(me.yaw), 0, Math.cos(me.yaw)); const dist = 6.4 + Math.abs(me.sp) * .06 + (me.air ? 2 : 0); const want = me.pos.clone().addScaledVector(f, -dist); want.y = Math.max(waveH(want.x, want.z) + 1.5, me.pos.y + 2.6 + (me.air ? 1.2 : 0)); camP.lerp(want, Math.min(1, dt * 4)); camL.lerp(me.pos.clone().addScaledVector(f, 5).setY(me.pos.y + 1), Math.min(1, dt * 6)); camera.position.copy(camP); if (shake > 0) { shake = Math.max(0, shake - dt * 1.5); camera.position.add(V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(shake * .4)); } camera.lookAt(camL); const fv = 64 + (me.boost > 0 ? 12 : 0) + Math.abs(me.sp) * .4; if (Math.abs(camera.fov - fv) > .3) { camera.fov = lerp(camera.fov, fv, dt * 3); camera.updateProjectionMatrix(); } }
    const cx0 = Math.round(camera.position.x / 4) * 4, cz0 = Math.round(camera.position.z / 4) * 4; ocean.position.set(cx0, 0, cz0); far.position.set(cx0, 0, cz0); sky.position.copy(camera.position); oceanU.uCam.value.copy(camera.position);
    sun.position.copy(camera.position).addScaledVector(sunDir, 60); sun.target.position.copy(me ? me.pos : camL); }
  FX.update(dt, -3); E.render(); }
function poseRacer(r, dt) { r.g.position.copy(r.pos); const q = new THREE.Euler(r.pitch + (r.air ? r.flip : 0), r.yaw + r.spin, r.lean + (r.air ? 0 : waveRoll(r)), 'YXZ'); if (r.crash > 0) { q.z = Math.PI * .5; q.x = .3; r.g.position.y = waveH(r.pos.x, r.pos.z) - .3; } r.g.rotation.copy(q);
  r.rd.rotation.x = r.air ? -.15 : r.sp > 14 ? .08 : 0; }
function waveRoll(r) { const sx = Math.cos(r.yaw), sz = -Math.sin(r.yaw); return Math.atan((waveH(r.pos.x + sx, r.pos.z + sz) - waveH(r.pos.x - sx, r.pos.z - sz)) / 2) * .8; }
function wildlifeIdle(dt) { for (const s of sharks) { s.a += dt * .6; const x = s.c.x + Math.cos(s.a) * s.r, z = s.c.z + Math.sin(s.a) * s.r; s.m.position.set(x, waveH(x, z) - .1, z); s.m.rotation.set(0, -s.a, 0); } }

/* ================= TITLE ================= */
const unlocked = k => k === 0 || (S.stars[k - 1] || 0) > 0;
function renderTitle() { $('trks').innerHTML = TRACKS.map((t, k) => `<button class="${k === ti ? 'on' : ''}" data-k="${k}" ${unlocked(k) ? '' : 'disabled style="opacity:.45"'}><i>${unlocked(k) ? t.ic : '🔒'}</i>${t.n}<small>${'★'.repeat(S.stars[k] || 0)}${'☆'.repeat(3 - (S.stars[k] || 0))}</small></button>`).join('');
  $('tHint').textContent = unlocked(ti + 1) || ti === TRACKS.length - 1 ? T('🐬 דולפינים, 🦈 כרישים, רמפות וסלטות!', '🐬 Dolphins, 🦈 sharks, ramps and flips!') : T('🔓 הגיעו למקום 3 ומעלה כדי לפתוח את המסלול הבא', '🔓 Finish top 3 to unlock the next course'); $('sndChip').textContent = S.mute ? T('🔇 צלילים', '🔇 Sound') : T('🔊 צלילים', '🔊 Sound'); }
$('trks').onclick = e => { const b = e.target.closest('[data-k]'); if (!b || b.disabled) return; A.ac(); ti = +b.dataset.k; A.tone(800, .06, 'triangle', .05); setup(true); renderTitle(); };
$('goBtn').onclick = () => start(); $('sndChip').onclick = () => { A.setMute(!S.mute); S.save(); renderTitle(); };
function showTitle() { state = 'title'; A.loopOff('eng'); A.loopOff('eng2'); A.loopOff('sea'); $('title').hidden = false; $('hud').hidden = true; $('spd').hidden = true; $('mini').hidden = true; $('cL').hidden = $('cR').hidden = true; $('endSheet').hidden = $('pauseSheet').hidden = true; setup(true); me = null; renderTitle(); }
$('pauseBtn').onclick = pause; $('pGo').onclick = resume; $('pMenu').onclick = showTitle; $('eMenu').onclick = showTitle; $('eAgain').onclick = start;
$('pauseBtn').innerHTML = ICO.pause('#fff'); $('homeT').innerHTML = ICO.home('#fff'); hubButtons(['homeT'], A); qualityButton('qBtn', S);
$('goBtn').textContent = T('🌊 יוצאים למים!', '🌊 Hit the waves!'); $('pT').textContent = T('הפסקה', 'Paused'); $('pMenu').textContent = T('תפריט', 'Menu'); $('pGo').textContent = T('המשך ▶', 'Resume ▶'); $('eMenu').textContent = T('תפריט', 'Menu'); $('eAgain').textContent = T('🔁 שוב', '🔁 Again');
E.resize(); showTitle(); setTimeout(() => { $('loading').hidden = true; requestAnimationFrame(frame); window.__waveOK = true; }, 30);
window.__wv = { get me() { return me; }, get state() { return state; }, start, inp, racers, get PATH() { return PATH; }, launch, waveH };
