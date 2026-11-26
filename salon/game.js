import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass, FXAAShader } from '../lib/postfx.js';

/* ================= helpers / i18n / save ================= */
const $ = id => document.getElementById(id);
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = h => new THREE.Color(h);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const isTouch = matchMedia('(pointer:coarse)').matches;
let LANG = window.OA_LANG; if (!LANG) { try { LANG = localStorage.getItem('oa-lang'); } catch (e) { } if (LANG !== 'he' && LANG !== 'en') LANG = /^he|^iw/i.test(navigator.language || '') ? 'he' : 'en'; }
const EN = LANG !== 'he'; document.documentElement.lang = LANG; document.documentElement.dir = (LANG === 'he' || LANG === 'ar') ? 'rtl' : 'ltr';
const T = (he, en) => !EN ? he : (window.OA_TR ? window.OA_TR(en) : en);
let SAVE = { q: isTouch ? 'high' : 'ultra', mute: false, music: true, seen: {} };
try { Object.assign(SAVE, JSON.parse(localStorage.getItem('salon-save') || '{}')); } catch (e) { }
const store = () => { try { localStorage.setItem('salon-save', JSON.stringify(SAVE)); } catch (e) { } };
const QF = { ultra: 1, high: .72, low: .48 }[SAVE.q] || .72;

/* ================= renderer ================= */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = SAVE.q !== 'low'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = C('#ffd9c9');
const camera = new THREE.PerspectiveCamera(38, 1, .1, 60); scene.add(camera);
const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: renderer.capabilities.isWebGL2 && SAVE.q === 'ultra' ? 4 : 0 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .32, .5, .96); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uFlash: { value: 0 } },
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uFlash; varying vec2 vUv;
  void main(){ vec3 c=texture2D(tDiffuse,vUv).rgb; vec2 d=vUv-.5; float r=length(d);
    float l=dot(c,vec3(.299,.587,.114)); c=mix(vec3(l),c,1.08); c*=1.0-smoothstep(.45,1.0,r)*.28; c+=vec3(uFlash); gl_FragColor=vec4(c,1.0); }` });
composer.addPass(grade);
const fxaa = new ShaderPass(FXAAShader); composer.addPass(fxaa);
bloom.enabled = SAVE.q !== 'low';

/* environment map (soft studio) */
{
  const es = new THREE.Scene();
  const bx = new THREE.BoxGeometry(20, 12, 20); const cols = []; const p = bx.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); const c = (y > 0 ? C('#fff6f2') : C('#ffb9a8')).multiplyScalar(.32); cols.push(c.r, c.g, c.b); }
  bx.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  es.add(new THREE.Mesh(bx, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const panel = (x, y, z, w, h, c, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: C(c).multiplyScalar(i), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
  panel(-5, 4, 4, 5, 3, '#ffffff', 2.2); panel(6, 3, -2, 4, 4, '#ffe2f0', 1); panel(0, 5.8, 0, 8, 8, '#fff8ee', .7); panel(0, 2, -9, 10, 3, '#b8fff0', .5);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, .03).texture; pm.dispose();
}

/* lights */
const hemi = new THREE.HemisphereLight(C('#fff3ee'), C('#c98a90'), .45); scene.add(hemi);
const key = new THREE.DirectionalLight(C('#fff1e0'), 2.1); key.position.set(-2.4, 4.2, 3.4); key.castShadow = true;
Object.assign(key.shadow.camera, { left: -2.6, right: 2.6, top: 3.2, bottom: -1, near: .5, far: 14 });
key.shadow.mapSize.set(SAVE.q === 'ultra' ? 2048 : 1024, SAVE.q === 'ultra' ? 2048 : 1024); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
scene.add(key, key.target); key.target.position.set(0, 1, 0);
const fill = new THREE.DirectionalLight(C('#e6f0ff'), .7); fill.position.set(3, 2, 2.5); scene.add(fill);
const rimL = new THREE.DirectionalLight(C('#ffd6f0'), 1.6); rimL.position.set(.5, 3.5, -4); scene.add(rimL);

/* ================= canvas textures ================= */
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c, rep = 1, srgb = true) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
function floorTex() { const c = cnv(256, 256), g = c.getContext('2d'); for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? '#f9c6d6' : '#fff3f6'; g.fillRect(x * 128, y * 128, 128, 128); } g.strokeStyle = 'rgba(160,80,110,.18)'; g.lineWidth = 3; g.strokeRect(0, 0, 256, 256); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke(); return tex(c, 7); }
function wallTex() { const c = cnv(256, 256), g = c.getContext('2d'); g.fillStyle = '#ffd7c4'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#ffcbb4'; for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 32, 256);
  g.fillStyle = 'rgba(255,255,255,.55)'; for (let y = 16; y < 256; y += 64) for (let x = 16; x < 256; x += 64) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.beginPath(); g.arc(x + 32, y + 32, 3, 0, 7); g.fill(); } const t = tex(c, 1); t.repeat.set(6, 2.5); return t; }
function stripeTex(a, b) { const c = cnv(128, 32), g = c.getContext('2d'); g.fillStyle = a; g.fillRect(0, 0, 128, 32); g.fillStyle = b; for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 16, 32); const t = tex(c, 1); t.repeat.set(5, 1); return t; }
function neonTex() { const c = cnv(1024, 256), g = c.getContext('2d'); g.clearRect(0, 0, 1024, 256); g.font = '900 150px Rubik, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#ff4fa8'; g.shadowBlur = 30; g.fillStyle = '#ffe6f4'; g.fillText('Snip Snap ✂', 512, 132); g.shadowBlur = 8; g.fillText('Snip Snap ✂', 512, 132); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

/* ================= salon room ================= */
const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: C(c), roughness: .55 }, o));
const chrome = std('#f2f4f8', { metalness: 1, roughness: .12 });
const gold = std('#ffcf5a', { metalness: 1, roughness: .22 });
function shadowAll(o, cast = true, recv = true) { o.traverse(m => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = recv; } }); return o; }
function buildRoom() {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), std('#ffffff', { map: floorTex(), roughness: .32 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 7), std('#ffffff', { map: wallTex(), roughness: .9 })); wall.position.set(0, 3.5, -3.2); wall.receiveShadow = true; scene.add(wall);
  const wains = new THREE.Mesh(new THREE.BoxGeometry(16, 1.15, .08), std('#8fe0cc', { roughness: .6 })); wains.position.set(0, .575, -3.15); wains.receiveShadow = true; scene.add(wains);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(16, .07, .14), std('#ffffff', { roughness: .4 })); rail.position.set(0, 1.17, -3.12); scene.add(rail);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.35, 64), std('#c9a6ff', { roughness: .95 })); rug.rotation.x = -Math.PI / 2; rug.position.y = .006; rug.receiveShadow = true; scene.add(rug);
  const rug2 = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.25, 64), std('#ffffff', { roughness: .95 })); rug2.rotation.x = -Math.PI / 2; rug2.position.y = .008; scene.add(rug2);
  // mirror
  const mir = new THREE.Group(); mir.position.set(-2.5, 2.25, -3.12);
  mir.add(new THREE.Mesh(new THREE.CircleGeometry(.82, 64), std('#e8f4ff', { metalness: 1, roughness: .03, envMapIntensity: 1.2 })));
  const fr = new THREE.Mesh(new THREE.TorusGeometry(.84, .07, 16, 80), gold); mir.add(fr);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 12), std('#fff8e8', { emissive: C('#fff1c8'), emissiveIntensity: 2.2 })); b.position.set(Math.cos(a) * .96, Math.sin(a) * .96, .04); mir.add(b); }
  scene.add(mir);
  // neon sign
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .65), new THREE.MeshBasicMaterial({ map: neonTex(), transparent: true, color: C('#ffffff').multiplyScalar(2.4), depthWrite: false })); neon.position.set(.2, 3.25, -3.15); scene.add(neon);
  // shelves
  const sh = new THREE.Group(); sh.position.set(2.55, 0, -3.0);
  const wood = std('#e9b98a', { roughness: .7 });
  const bcols = ['#ff7ab8', '#4fd1c5', '#ffc94a', '#a98bff', '#ff8f6b', '#6fb8ff'];
  [1.55, 2.25].forEach((y, k) => { const b = new THREE.Mesh(new RoundedBoxGeometry(1.5, .07, .34, 2, .02), wood); b.position.set(0, y, 0); sh.add(b);
    for (let i = 0; i < 5; i++) { const h = rnd(.2, .36), r = rnd(.06, .09); const bc = bcols[(i + k * 2) % bcols.length];
      const bo = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), std(bc, { roughness: .18, metalness: .05 })); bo.position.set(-.6 + i * .3, y + .035 + h / 2, rnd(-.04, .05)); sh.add(bo);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * .55, r * .6, .07, 16), i % 2 ? gold : std('#ffffff')); cap.position.set(bo.position.x, y + .035 + h + .035, bo.position.z); sh.add(cap); } });
  for (let i = 0; i < 3; i++) { const tw = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .34, 20), std(['#ffffff', '#ffd0e4', '#bff0e4'][i], { roughness: 1 })); tw.rotation.x = Math.PI / 2; tw.position.set(-.35 + i * .2, 1.2 + .1 + .19 * 0, .02); }
  scene.add(shadowAll(sh, true, true));
  // plant
  const pl = new THREE.Group(); pl.position.set(-3.6, 0, -2.3);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.34, .26, .6, 28), std('#ffffff', { roughness: .35 })); pot.position.y = .3; pl.add(pot);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.345, .33, .1, 28), std('#ff7ab8')); band.position.y = .5; pl.add(band);
  const leafM = std('#3fbf7f', { roughness: .5, side: THREE.DoubleSide });
  for (let i = 0; i < 11; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(.26, 16, 10), leafM); const a = i / 11 * Math.PI * 2, h = rnd(.9, 1.6);
    lf.scale.set(.55, .12, 1); lf.position.set(Math.cos(a) * .3, h, Math.sin(a) * .3); lf.rotation.set(rnd(-.5, -.2), -a + Math.PI / 2, rnd(-.4, .4)); pl.add(lf);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(.012, .015, h - .5, 6), leafM); st.position.set(Math.cos(a) * .15, .5 + (h - .5) / 2, Math.sin(a) * .15); st.rotation.z = Math.cos(a) * .25; st.rotation.x = -Math.sin(a) * .25; pl.add(st); }
  scene.add(shadowAll(pl));
  // lamps
  [-1.7, 1.9].forEach((x, i) => { const g = new THREE.Group(); g.position.set(x, 3.6, -1.4);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, 2, 6), std('#333')); cord.position.y = 1; g.add(cord);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(.32, .36, 32, 1, true), std(i ? '#4fd1c5' : '#ff7ab8', { side: THREE.DoubleSide, roughness: .4 })); g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.1, 20, 14), new THREE.MeshBasicMaterial({ color: C('#fff1d0').multiplyScalar(4) })); bulb.position.y = -.16; g.add(bulb); scene.add(g); });
  // trolley
  const tr = new THREE.Group(); tr.position.set(1.55, 0, -.9);
  const top = new THREE.Mesh(new RoundedBoxGeometry(.7, .06, .45, 2, .02), std('#ffffff', { roughness: .3 })); top.position.y = .82; tr.add(top);
  const low = top.clone(); low.position.y = .35; tr.add(low);
  for (const [x, z] of [[-.3, -.18], [.3, -.18], [-.3, .18], [.3, .18]]) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .82, 8), chrome); lg.position.set(x, .41, z); tr.add(lg); }
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.055, .065, .22, 18), std(bcols[i + 1], { roughness: .2 })); b.position.set(-.2 + i * .18, .96, 0); tr.add(b);
    const n = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .06), std('#ffffff')); n.position.set(b.position.x, 1.1, .02); tr.add(n); }
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(.14, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std('#ffd0e4', { side: THREE.DoubleSide })); bowl.position.set(.15, .52, 0); tr.add(bowl);
  scene.add(shadowAll(tr));
}
buildRoom();

/* ================= chair + character body ================= */
const HEADY = 1.56, R = .5;
const chairG = new THREE.Group(); scene.add(chairG);
const CAPE = [[.11, 1.22], [.3, 1.16], [.47, 1.06], [.57, .9], [.62, .68], [.64, .5], [.62, .46]];
function capeR(yw) { if (yw >= CAPE[0][1]) return .11; for (let i = 1; i < CAPE.length; i++) { const [r1, y1] = CAPE[i - 1], [r2, y2] = CAPE[i]; if (yw >= y2) return lerp(r1, r2, (y1 - yw) / (y1 - y2)); } return .62; }
{
  const leather = new THREE.MeshPhysicalMaterial({ color: C('#ff6f91'), roughness: .35, clearcoat: 1, clearcoatRoughness: .2 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.42, .48, .06, 40), chrome); base.position.y = .03; chairG.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .4, 20), chrome); pole.position.y = .25; chairG.add(pole);
  const seat = new THREE.Mesh(new RoundedBoxGeometry(.86, .16, .74, 3, .07), leather); seat.position.set(0, .5, .02); chairG.add(seat);
  const back = new THREE.Mesh(new RoundedBoxGeometry(.8, .58, .14, 3, .07), leather); back.position.set(0, .86, -.42); back.rotation.x = -.08; chairG.add(back);
  for (const s of [-1, 1]) { const arm = new THREE.Mesh(new RoundedBoxGeometry(.12, .07, .6, 2, .03), leather); arm.position.set(s * .5, .74, .04); chairG.add(arm);
    const sup = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .2, 8), chrome); sup.position.set(s * .5, .64, .2); chairG.add(sup); }
  const fr = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .6, 10), chrome); fr.rotation.z = Math.PI / 2; fr.position.set(0, .16, .52); chairG.add(fr);
  shadowAll(chairG);
}
const bodyG = new THREE.Group(); chairG.add(bodyG);
const headG = new THREE.Group(); headG.position.y = HEADY; bodyG.add(headG);

/* ================= hair system ================= */
const NP = 11, NS1 = NP - 1;
const hairMat = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: { uHeadC: { value: V3() }, uL1: { value: V3() }, uC1: { value: C('#fff1e0').multiplyScalar(2.2) }, uL2: { value: V3() }, uC2: { value: C('#e6f0ff').multiplyScalar(.7) },
    uL3: { value: V3() }, uC3: { value: C('#ffd6f0').multiplyScalar(1.4) }, uAmb: { value: C('#ffe6ee').multiplyScalar(.5) } },
  vertexShader: `attribute vec3 aTan; attribute float aSide; attribute float aV; attribute float aW; attribute float aWet; attribute float aRand; attribute vec3 color;
  uniform vec3 uHeadC; varying vec3 vCol; varying vec3 vT; varying float vV; varying float vWet; varying float vSide; varying vec3 vWP; varying vec3 vN;
  void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vec3 t=normalize(mat3(modelMatrix)*aTan); vec3 vd=normalize(cameraPosition-wp.xyz);
    vec3 s=cross(t,vd); float sl=length(s); s= sl>1e-4 ? s/sl : vec3(1.0,0.0,0.0);
    float w=aW*(1.0-0.8*pow(aV,1.5)); wp.xyz+=s*w*aSide;
    vN=normalize(wp.xyz-uHeadC); vCol=color*(0.9+0.2*aRand); vT=t; vV=aV; vWet=aWet; vSide=aSide; vWP=wp.xyz;
    gl_Position=projectionMatrix*viewMatrix*wp; }`,
  fragmentShader: `uniform vec3 uL1; uniform vec3 uC1; uniform vec3 uL2; uniform vec3 uC2; uniform vec3 uL3; uniform vec3 uC3; uniform vec3 uAmb;
  varying vec3 vCol; varying vec3 vT; varying float vV; varying float vWet; varying float vSide; varying vec3 vWP; varying vec3 vN;
  float kd(vec3 T,vec3 L){ float a=dot(T,L); return sqrt(max(0.0,1.0-a*a)); }
  float ks(vec3 T,vec3 H,float e){ float a=dot(T,H); return pow(sqrt(max(0.0,1.0-a*a)),e); }
  void main(){ vec3 Tn=normalize(vT); vec3 V=normalize(cameraPosition-vWP);
    vec3 base=vCol*(1.0-0.45*vWet);
    float ao=mix(0.42,1.0,smoothstep(0.0,0.5,vV)); float rd=0.7+0.3*sqrt(max(0.0,1.0-vSide*vSide));
    float s1=clamp(dot(vN,uL1)*0.75+0.5,0.18,1.0); float s2=clamp(dot(vN,uL2)*0.75+0.5,0.18,1.0);
    vec3 c=uAmb*base;
    c+=base*uC1*(kd(Tn,uL1)*0.7+0.3)*s1;
    c+=uC1*ks(Tn,normalize(uL1+V),110.0)*(0.16+0.4*vWet)*s1;
    c+=base*uC1*ks(Tn,normalize(uL1+V-Tn*0.18),24.0)*0.3*s1;
    c+=base*uC2*kd(Tn,uL2)*s2*0.7;
    float rim=pow(1.0-abs(dot(vN,V)),2.0)*clamp(dot(vN,uL3)*0.6+0.4,0.0,1.0);
    c+=uC3*rim*0.45*mix(base,vec3(1.0),0.35);
    c*=ao*rd; gl_FragColor=vec4(c,1.0); }`
});
const lin = new THREE.Color();
function hexLin(h) { lin.set(h); return [lin.r, lin.g, lin.b]; }

function region(n) {
  const face = n.z > .4 && n.y < .44 && Math.abs(n.x) < .8;
  const ear = Math.abs(n.x) > .78 && n.y < .2 && n.y > -.42;
  if (!face && !ear) {
    if (n.y > .16) return 1;
    if (n.y > -.42 && n.z < -.12) return 1;
    if (n.y > -.08 && Math.abs(n.x) > .55 && n.z < .4) return 1;
  }
  if (n.z > .18 && n.y < -.16 && n.y > -.88 && Math.abs(n.x) < .84) {
    const mouth = Math.abs(n.x) < .3 && n.y < -.255 && n.y > -.49;
    if (!mouth && !(n.z > .95 && n.y > -.2)) return 2;
  }
  return 0;
}

function makeHair(ch) {
  const N = Math.round(3600 * QF), pts = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) { const y = 1 - (i + .5) / N * 2, r = Math.sqrt(1 - y * y), a = i * ga; const n = V3(Math.cos(a) * r, y, Math.sin(a) * r); const k = region(n); if (k) pts.push([n, k]); }
  const S = pts.length;
  const H = { S, ch, root: new Float32Array(S * 3), nrm: new Float32Array(S * 3), L: new Float32Array(S), Lmax: new Float32Array(S), stiff: new Float32Array(S), curl: new Float32Array(S), phase: new Float32Array(S),
    wet: new Float32Array(S), kind: new Uint8Array(S), rd: new Float32Array(S * NS1 * 3), pos: new Float32Array(S * NP * 3), prev: new Float32Array(S * NP * 3), col: new Float32Array(S * NP * 3), rand: new Float32Array(S),
    colDirty: true, wDirty: true, wetDirty: true };
  const baseC = hexLin(ch.hair);
  const down = V3(0, -1, 0);
  pts.forEach(([n, k], s) => {
    H.root.set([n.x * R * .985, n.y * R * .985, n.z * R * .985], s * 3); H.nrm.set([n.x, n.y, n.z], s * 3);
    H.kind[s] = k; H.phase[s] = Math.random() * 6.28; H.rand[s] = Math.random();
    const st = ch.style(n, k);
    H.L[s] = st.L * rnd(.9, 1.08); H.Lmax[s] = k === 2 ? 1.05 : 2.1; H.stiff[s] = st.stiff; H.curl[s] = st.curl || 0;
    for (let i = 0; i < NS1; i++) { const t = i / (NS1 - 1); const d = st.dir(n, t).normalize(); H.rd.set([d.x, d.y, d.z], (s * NS1 + i) * 3); }
    const jit = rnd(-.06, .06);
    for (let i = 0; i < NP; i++) H.col.set([baseC[0] * (1 + jit), baseC[1] * (1 + jit), baseC[2] * (1 + jit)], (s * NP + i) * 3);
  });
  restPose(H);
  // geometry
  const VN = S * NP * 2;
  const g = new THREE.BufferGeometry();
  H.gPos = new Float32Array(VN * 3); H.gTan = new Float32Array(VN * 3); H.gCol = new Float32Array(VN * 3); H.gW = new Float32Array(VN); H.gWet = new Float32Array(VN);
  const side = new Float32Array(VN), vv = new Float32Array(VN), rr = new Float32Array(VN);
  for (let s = 0; s < S; s++) for (let i = 0; i < NP; i++) { const b = (s * NP + i) * 2; side[b] = -1; side[b + 1] = 1; vv[b] = vv[b + 1] = i / NS1; rr[b] = rr[b + 1] = H.rand[s]; }
  const idx = new Uint32Array(S * NS1 * 6); let o = 0;
  for (let s = 0; s < S; s++) for (let i = 0; i < NS1; i++) { const a = (s * NP + i) * 2; idx[o++] = a; idx[o++] = a + 1; idx[o++] = a + 2; idx[o++] = a + 1; idx[o++] = a + 3; idx[o++] = a + 2; }
  const dyn = (arr, n) => { const at = new THREE.BufferAttribute(arr, n); at.setUsage(THREE.DynamicDrawUsage); return at; };
  g.setAttribute('position', dyn(H.gPos, 3)); g.setAttribute('aTan', dyn(H.gTan, 3)); g.setAttribute('color', dyn(H.gCol, 3)); g.setAttribute('aW', dyn(H.gW, 1)); g.setAttribute('aWet', dyn(H.gWet, 1));
  g.setAttribute('aSide', new THREE.BufferAttribute(side, 1)); g.setAttribute('aV', new THREE.BufferAttribute(vv, 1)); g.setAttribute('aRand', new THREE.BufferAttribute(rr, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.boundingSphere = new THREE.Sphere(V3(0, -.4, 0), 3.2);
  H.mesh = new THREE.Mesh(g, hairMat); H.mesh.frustumCulled = false;
  H.baseW = .032 / Math.sqrt(QF);
  H.snap = { L: H.L.slice(), rd: H.rd.slice(), col: H.col.slice(), curl: H.curl.slice(), stiff: H.stiff.slice() };
  for (let k = 0; k < 90; k++) stepHair(H, 1 / 60, V3(0, -1, 0));
  return H;
}
function restPose(H) {
  const { S, root, rd, L, pos, prev } = H;
  for (let s = 0; s < S; s++) { let x = root[s * 3], y = root[s * 3 + 1], z = root[s * 3 + 2]; const seg = L[s] / NS1; const o = s * NP * 3;
    pos[o] = prev[o] = x; pos[o + 1] = prev[o + 1] = y; pos[o + 2] = prev[o + 2] = z;
    for (let i = 1; i < NP; i++) { const r = (s * NS1 + i - 1) * 3; x += rd[r] * seg; y += rd[r + 1] * seg; z += rd[r + 2] * seg; const j = o + i * 3; pos[j] = prev[j] = x; pos[j + 1] = prev[j + 1] = y; pos[j + 2] = prev[j + 2] = z; } }
}
function resetHair(H) { H.wake = 1.6; H.L.set(H.snap.L); H.rd.set(H.snap.rd); H.col.set(H.snap.col); H.curl.set(H.snap.curl); H.stiff.set(H.snap.stiff); H.wet.fill(0); restPose(H); H.colDirty = H.wDirty = H.wetDirty = true; for (let k = 0; k < 60; k++) stepHair(H, 1 / 60, V3(0, -1, 0)); }

const HR = R + .014;
function stepHair(H, dt, g) {
  const { S, pos, prev, root, rd, L, stiff, curl, phase, wet, kind } = H;
  const dt2 = dt * dt, damp = H.wake != null ? lerp(.55, .9, clamp(H.wake, 0, 1)) : .9;
  for (let s = 0; s < S; s++) {
    const o = s * NP * 3, l = L[s];
    const rx = root[s * 3], ry = root[s * 3 + 1], rz = root[s * 3 + 2];
    if (l < .003) { for (let i = 0; i < NP; i++) { const j = o + i * 3; pos[j] = prev[j] = rx; pos[j + 1] = prev[j + 1] = ry; pos[j + 2] = prev[j + 2] = rz; } continue; }
    const seg = l / NS1, w = wet[s];
    const k0 = stiff[s] * clamp(.42 / l, .1, 1) * (1 - .62 * w);
    const gs = 5.4 * (1 + .6 * w) * dt2;
    let cx = rx, cy = ry, cz = rz, px = rx, py = ry, pz = rz;
    const cu = curl[s] * (1 - .45 * w), ph = phase[s];
    for (let i = 1; i < NP; i++) {
      const r = (s * NS1 + i - 1) * 3; let dx = rd[r], dy = rd[r + 1], dz = rd[r + 2];
      if (cu > .01) {
        let ux = dz, uz = -dx, ul = Math.sqrt(ux * ux + uz * uz); if (ul < 1e-3) { ux = 1; uz = 0; ul = 1; } ux /= ul; uz /= ul;
        const wx = dy * uz, wy = dz * ux - dx * uz, wz = -dy * ux;
        const a = i * 1.3 + ph, c = Math.cos(a) * cu * 1.25, sn = Math.sin(a) * cu * 1.25;
        dx += ux * c + wx * sn; dy += wy * sn; dz += uz * c + wz * sn; const dl = Math.sqrt(dx * dx + dy * dy + dz * dz); dx /= dl; dy /= dl; dz /= dl;
      }
      cx += dx * seg; cy += dy * seg; cz += dz * seg;
      const j = o + i * 3;
      let x = pos[j], y = pos[j + 1], z = pos[j + 2];
      const ox = x, oy = y, oz = z;
      x += (x - prev[j]) * damp + g.x * gs; y += (y - prev[j + 1]) * damp + g.y * gs; z += (z - prev[j + 2]) * damp + g.z * gs;
      const k = k0 * (1.3 - .75 * i / NS1);
      x += (cx - x) * k; y += (cy - y) * k; z += (cz - z) * k;
      let ex = x - px, ey = y - py, ez = z - pz; const el = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1e-6, f = seg / el;
      x = px + ex * f; y = py + ey * f; z = pz + ez * f;
      const d = Math.sqrt(x * x + y * y + z * z); if (d < HR) { const m = HR / d; x *= m; y *= m; z *= m; }
      const yw = y + HEADY;
      if (yw < 1.24) { const cr = capeR(yw) + .018, hd = Math.sqrt(x * x + z * z); if (hd < cr) { const m = cr / (hd || 1e-4); x *= m; z *= m; } }
      if (kind[s] === 1 && z > .08 && y > -.62 && y < .12 && x > -.37 && x < .37) x = rx < 0 ? -.37 : .37;
      prev[j] = ox; prev[j + 1] = oy; prev[j + 2] = oz;
      pos[j] = x; pos[j + 1] = y; pos[j + 2] = z;
      px = x; py = y; pz = z;
    }
  }
}
function writeHair(H) {
  const { S, pos, gPos, gTan } = H;
  for (let s = 0; s < S; s++) { const o = s * NP * 3;
    for (let i = 0; i < NP; i++) { const j = o + i * 3; const a = i > 0 ? j - 3 : j, b = i < NS1 ? j + 3 : j;
      let tx = pos[b] - pos[a], ty = pos[b + 1] - pos[a + 1], tz = pos[b + 2] - pos[a + 2]; const tl = Math.sqrt(tx * tx + ty * ty + tz * tz);
      if (tl < 1e-6) { tx = H.nrm[s * 3]; ty = H.nrm[s * 3 + 1]; tz = H.nrm[s * 3 + 2]; } else { tx /= tl; ty /= tl; tz /= tl; }
      const v = (s * NP + i) * 6;
      gPos[v] = gPos[v + 3] = pos[j]; gPos[v + 1] = gPos[v + 4] = pos[j + 1]; gPos[v + 2] = gPos[v + 5] = pos[j + 2];
      gTan[v] = gTan[v + 3] = tx; gTan[v + 1] = gTan[v + 4] = ty; gTan[v + 2] = gTan[v + 5] = tz; } }
  const ga = H.mesh.geometry.attributes; ga.position.needsUpdate = true; ga.aTan.needsUpdate = true;
  if (H.colDirty) { const { col, gCol } = H; for (let p = 0; p < S * NP; p++) { gCol[p * 6] = gCol[p * 6 + 3] = col[p * 3]; gCol[p * 6 + 1] = gCol[p * 6 + 4] = col[p * 3 + 1]; gCol[p * 6 + 2] = gCol[p * 6 + 5] = col[p * 3 + 2]; } ga.color.needsUpdate = true; H.colDirty = false; H.scalpDirty = true; }
  if (H.wDirty) { for (let s = 0; s < S; s++) { const w = H.baseW * clamp((H.L[s] - .002) / .012, 0, 1) * (H.kind[s] === 2 ? .85 : 1); for (let i = 0; i < NP * 2; i++) H.gW[s * NP * 2 + i] = w; } ga.aW.needsUpdate = true; H.wDirty = false; H.scalpDirty = true; }
  if (H.wetDirty) { for (let s = 0; s < S; s++) { const w = H.wet[s]; for (let i = 0; i < NP * 2; i++) H.gWet[s * NP * 2 + i] = w; } ga.aWet.needsUpdate = true; H.wetDirty = false; }
}
function resample(H, s, oldL, newL) {
  if (oldL < 1e-4) return; const c = H.col, o = s * NP * 3, tmp = [];
  for (let i = 0; i < NP; i++) tmp.push(c[o + i * 3], c[o + i * 3 + 1], c[o + i * 3 + 2]);
  for (let i = 0; i < NP; i++) { const f = clamp(i * newL / oldL, 0, NS1), a = Math.floor(f), b = Math.min(NS1, a + 1), t = f - a;
    for (let k = 0; k < 3; k++) c[o + i * 3 + k] = lerp(tmp[a * 3 + k], tmp[b * 3 + k], t); }
  H.colDirty = true;
}

/* ================= characters ================= */
const CHARS = [
  { id: 'mila', name: T('מילה', 'Mila'), desc: T('שיער ארוך וחלק', 'Long silky hair'), skin: '#f5c9a8', hair: '#7a3c1a', eye: '#5a3720', pants: '#5b7cff', shoe: '#ff6f91', voice: 1.35, freckles: true, lash: true, noBeard: true,
    style(n, k) { if (k === 2) return { L: 0, stiff: .35, dir: (n, t) => n.clone().multiplyScalar(.7).add(V3(0, -1, .15).multiplyScalar(.4 + t)) };
      if (n.z > .35 && n.y > .36 && n.y < .86 && Math.abs(n.x) < .48) { const sd = n.x > .02 ? 1 : n.x < -.02 ? -1 : (Math.random() < .5 ? -1 : 1); return { L: 1.02 + Math.random() * .12, stiff: .05, dir: (n, t) => n.clone().multiplyScalar(.75 * (1 - t) * (1 - t) + .05).add(V3(sd * (.55 + t * .9) * (1 - t * .3), -Math.min(1.5, .05 + t * 2.2), -.35 * t)) }; }
      const side = Math.abs(n.x) > .04 ? Math.sign(n.x) : (Math.random() < .5 ? -1 : 1), fz = clamp(n.z + .15, 0, 1);
      return { L: 1.22 + (n.z < 0 ? .14 : 0), stiff: .03, dir: (n, t) => n.clone().multiplyScalar(1.0 * (1 - t) * (1 - t) + .05).add(V3(side * (.35 + fz) * (1 - t) * 1.1, 0, -fz * .45 * (1 - t))).add(V3(0, -Math.min(1.6, .2 + t * 2.4), 0)) }; } },
  { id: 'rafi', name: T('רפי', 'Rafi'), desc: T('זקן מלא ושיער קצר', 'Full beard, short hair'), skin: '#c78a60', hair: '#2b1d16', eye: '#2c1d14', pants: '#3a3f58', shoe: '#7a4a2a', voice: .78, bigNose: true, thickBrow: true,
    style(n, k) { if (k === 2) return { L: .27, stiff: .32, curl: .15, dir: (n, t) => n.clone().multiplyScalar(.75).add(V3(0, -1, .2).multiplyScalar(.35 + t * .9)) };
      return { L: .2, stiff: .3, curl: .1, dir: (n, t) => n.clone().add(V3(0, -.15, -.45).multiplyScalar(t)) }; } },
  { id: 'pom', name: T('פום', 'Pom'), desc: T('מפלצת פרוותית ומתולתלת', 'A fluffy curly monster'), skin: '#b6a0ff', hair: '#ff5fb0', eye: '#3a2a8a', pants: '#ffc94a', shoe: '#4fd1c5', voice: 1.85, horns: true, monster: true,
    style(n, k) { if (k === 2) return { L: 0, stiff: .35, curl: .5, dir: (n, t) => n.clone().multiplyScalar(.7).add(V3(0, -1, .15).multiplyScalar(.4 + t)) };
      return { L: .5, stiff: .16, curl: .75, dir: (n, t) => n.clone().add(V3(0, -.35 * t, 0)) }; } },
];
const onHead = (x, y, r = R) => { const z = Math.sqrt(Math.max(0, 1 - x * x - y * y)); return V3(x * r, y * r, z * r); };
const qFromN = n => new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), n.clone().normalize());
function buildChar(ch) {
  const G = { ch, body: new THREE.Group(), head: new THREE.Group() };
  const skin = C(ch.skin);
  const skinM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: .55, sheen: .5, sheenColor: skin.clone().lerp(C('#ffffff'), .5), sheenRoughness: .5 });
  const skinPlain = new THREE.MeshPhysicalMaterial({ color: skin, roughness: .55, sheen: .5, sheenColor: skin.clone().lerp(C('#ffffff'), .5), sheenRoughness: .5 });
  // head with vertex colors (scalp tint)
  const hg = new THREE.SphereGeometry(R, 72, 54); const hp = hg.attributes.position; const hc = new Float32Array(hp.count * 3);
  for (let i = 0; i < hp.count; i++) { hc[i * 3] = skin.r; hc[i * 3 + 1] = skin.g; hc[i * 3 + 2] = skin.b; }
  hg.setAttribute('color', new THREE.BufferAttribute(hc, 3));
  const head = new THREE.Mesh(hg, skinM); head.castShadow = true; head.receiveShadow = true; G.head.add(head); G.headGeo = hg; G.skinLin = [skin.r, skin.g, skin.b];
  // ears / horns
  if (ch.horns) { for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.ConeGeometry(.07, .26, 20), std('#fff3d6', { roughness: .4 })); const p = onHead(s * .42, .84, R * .96); h.position.copy(p); h.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(s * .45, 1, 0).normalize()); h.castShadow = true; G.head.add(h); } }
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.1, 24, 16), skinPlain); e.scale.set(.45, ch.monster ? 1.25 : 1, .8); const p = onHead(s * .975, -.05); e.position.copy(p).multiplyScalar(1.02); e.castShadow = true; G.head.add(e);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(.06, 16, 12), std(C(ch.skin).multiplyScalar(.8).getStyle(), { roughness: .7 })); inner.scale.set(.3, .9, .6); inner.position.copy(p).multiplyScalar(1.07); G.head.add(inner); }
  // nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(ch.bigNose ? .078 : .05, 24, 16), new THREE.MeshPhysicalMaterial({ color: skin.clone().lerp(C('#ff8a80'), .18), roughness: .5, sheen: .4 }));
  nose.position.copy(onHead(0, -.07, R * 1.035)); nose.scale.set(1, .9, ch.bigNose ? 1 : .9); nose.castShadow = true; G.head.add(nose);
  // eyes
  G.eyes = [];
  for (const s of [-1, 1]) { const p = onHead(s * .33, .1, R * .955); const eg = new THREE.Group(); eg.position.copy(p); eg.quaternion.copy(qFromN(p));
    const white = new THREE.Mesh(new THREE.SphereGeometry(.088, 28, 20), std('#ffffff', { roughness: .15 })); white.scale.set(1, 1.15, .55); eg.add(white);
    const iris = new THREE.Group(); iris.position.z = .045; eg.add(iris);
    const ir = new THREE.Mesh(new THREE.CircleGeometry(.052, 32), std(ch.eye, { roughness: .2 })); iris.add(ir);
    const pu = new THREE.Mesh(new THREE.CircleGeometry(.029, 24), std('#120a10', { roughness: .1 })); pu.position.z = .001; iris.add(pu);
    const hl = new THREE.Mesh(new THREE.CircleGeometry(.013, 12), new THREE.MeshBasicMaterial({ color: C('#ffffff').multiplyScalar(1.6) })); hl.position.set(.016, .02, .002); iris.add(hl);
    if (ch.lash) { const lash = new THREE.Mesh(new THREE.TorusGeometry(.085, .009, 6, 20, Math.PI * .8), std('#2a1610')); lash.rotation.z = Math.PI * .1; lash.position.z = .01; lash.scale.set(1, 1.1, 1); eg.add(lash); }
    G.head.add(eg); G.eyes.push({ g: eg, iris }); }
  // brows
  G.brows = [];
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(ch.thickBrow ? .022 : .015, .09, 4, 10), std(C(ch.hair).multiplyScalar(.8).getStyle(), { roughness: .8 }));
    const p = onHead(s * .33, .3, R * 1.0); b.position.copy(p); b.quaternion.copy(qFromN(p)); b.rotateZ(Math.PI / 2 - s * .12); G.head.add(b); G.brows.push({ m: b, base: p.clone(), s, q0: b.quaternion.clone() }); }
  // mouth
  const mp = onHead(0, -.36, R * .995); const mg = new THREE.Group(); mg.position.copy(mp); mg.quaternion.copy(qFromN(mp)); G.head.add(mg);
  const mDark = std('#6b1a33', { roughness: .4 });
  const smile = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V3(-.1, .025, 0), V3(0, -.07, 0), V3(.1, .025, 0)), 20, .014, 8), mDark); mg.add(smile);
  const open = new THREE.Group(); const om = new THREE.Mesh(new THREE.SphereGeometry(.07, 24, 16), mDark); om.scale.set(1, .75, .3); open.add(om);
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(.04, 16, 12), std('#ff7c94')); tongue.scale.set(1, .6, .3); tongue.position.set(0, -.025, .01); open.add(tongue);
  const teeth = new THREE.Mesh(new THREE.BoxGeometry(.08, .018, .01), std('#ffffff')); teeth.position.set(0, .035, .018); open.add(teeth);
  mg.add(open); open.visible = false;
  const frown = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V3(-.075, -.03, 0), V3(0, .045, 0), V3(.075, -.03, 0)), 20, .014, 8), mDark); frown.visible = false; mg.add(frown);
  G.mouth = { smile, open, frown, g: mg };
  // cheeks + freckles
  for (const s of [-1, 1]) { const p = onHead(s * .55, -.15, R * 1.004); const c = new THREE.Mesh(new THREE.CircleGeometry(.07, 24), new THREE.MeshBasicMaterial({ color: C('#ff6f91'), transparent: true, opacity: .32, depthWrite: false })); c.position.copy(p); c.quaternion.copy(qFromN(p)); G.head.add(c); (G.cheeks = G.cheeks || []).push(c); }
  if (ch.freckles) { for (let i = 0; i < 14; i++) { const s = i % 2 ? 1 : -1; const p = onHead(s * rnd(.14, .36), rnd(-.2, -.06), R * 1.003); const f = new THREE.Mesh(new THREE.CircleGeometry(.008, 8), new THREE.MeshBasicMaterial({ color: C('#a0603a') })); f.position.copy(p); f.quaternion.copy(qFromN(p)); G.head.add(f); } }
  // body: neck, cape, legs
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.12, .13, .3, 20), skinPlain); neck.position.y = 1.3; G.body.add(neck);
  const cape = new THREE.Mesh(new THREE.LatheGeometry(CAPE.map(([r, y]) => new THREE.Vector2(r, y)), 64), std('#ffffff', { map: stripeTex('#ffffff', '#ffb3d1'), roughness: .65, side: THREE.DoubleSide })); G.body.add(cape);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.12, .035, 12, 32), std('#ff5fa2')); collar.rotation.x = Math.PI / 2; collar.position.y = 1.21; G.body.add(collar);
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.085, .32, 6, 14), std(ch.pants, { roughness: .8 })); leg.position.set(s * .15, .32, .5); leg.rotation.x = -.15; G.body.add(leg);
    const shoe = new THREE.Mesh(new RoundedBoxGeometry(.17, .11, .27, 3, .05), std(ch.shoe, { roughness: .4 })); shoe.position.set(s * .15, .1, .6); G.body.add(shoe); }
  shadowAll(G.body);
  // accessories
  G.acc = {};
  const bow = new THREE.Group(); { const m = std('#ff3d8b', { roughness: .35 }); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.ConeGeometry(.09, .17, 20), m); w.rotation.z = s * Math.PI / 2; w.position.x = s * .09; bow.add(w); } bow.add(new THREE.Mesh(new THREE.SphereGeometry(.045, 16, 12), m)); }
  const bp = onHead(-.5, .74, R * 1.22); bow.userData.n = bp.clone().normalize(); bow.userData.base = .08; bow.position.copy(bp); bow.quaternion.copy(qFromN(bp)); G.acc.bow = bow;
  const gl = new THREE.Group(); { const fm = std('#1c1c2a', { roughness: .2 }), lm = std('#3a2a6e', { roughness: .05, metalness: .4, transparent: true, opacity: .88 });
    for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .02, 32), lm); l.rotation.x = Math.PI / 2; l.position.x = s * .17; gl.add(l); const f = new THREE.Mesh(new THREE.TorusGeometry(.1, .014, 8, 32), fm); f.position.x = s * .17; gl.add(f);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(.015, .015, .36), fm); arm.position.set(s * .28, .02, -.18); gl.add(arm); }
    const br = new THREE.Mesh(new THREE.BoxGeometry(.08, .016, .016), fm); br.position.y = .03; gl.add(br); }
  gl.position.set(0, .07, R * .99 + .02); G.acc.glasses = gl;
  const crown = new THREE.Group(); { const band = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .1, 32, 1, true), std('#ffcf5a', { metalness: 1, roughness: .2, side: THREE.DoubleSide })); crown.add(band);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const sp = new THREE.Mesh(new THREE.ConeGeometry(.035, .1, 8), gold); sp.position.set(Math.cos(a) * .2, .09, Math.sin(a) * .2); crown.add(sp);
      const gem = new THREE.Mesh(new THREE.SphereGeometry(.02, 12, 8), new THREE.MeshStandardMaterial({ color: ['#ff3d8b', '#4fd1c5', '#a98bff'][i % 3], emissive: C(['#ff3d8b', '#4fd1c5', '#a98bff'][i % 3]), emissiveIntensity: 1.5 })); gem.position.set(Math.cos(a) * .205, 0, Math.sin(a) * .205); crown.add(gem); } }
  crown.position.set(0, R + .12, -.02); crown.rotation.x = -.12; crown.userData.n = V3(0, 1, -.04).normalize(); crown.userData.base = 0; G.acc.crown = crown;
  const flower = new THREE.Group(); { const pm = std('#ffe14d', { roughness: .4 }); for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 10), std(['#ffffff', '#ffd0e4'][i % 2], { roughness: .5 })); const a = i / 6 * Math.PI * 2; p.scale.set(1, .6, .4); p.position.set(Math.cos(a) * .06, Math.sin(a) * .06, 0); flower.add(p); } flower.add(new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 10), pm)); }
  const fp = onHead(.6, .6, R * 1.2); flower.userData.n = fp.clone().normalize(); flower.position.copy(fp); flower.quaternion.copy(qFromN(fp)); G.acc.flower = flower;
  const ear = new THREE.Group(); for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.04, .009, 8, 24), gold); const p = onHead(s * .97, -.2); r.position.copy(p).multiplyScalar(1.03); r.position.y -= .05; r.rotation.y = Math.PI / 2; ear.add(r); } G.acc.earrings = ear;
  for (const k in G.acc) { shadowAll(G.acc[k], true, false); G.acc[k].visible = false; G.head.add(G.acc[k]); }
  // hair
  G.hair = makeHair(ch); G.head.add(G.hair.mesh);
  // scalp map: nearest strand per head vertex within hair region
  const map = new Int32Array(hp.count).fill(-1); const H = G.hair; const nv = V3();
  for (let i = 0; i < hp.count; i++) { nv.set(hp.getX(i), hp.getY(i), hp.getZ(i)).normalize(); if (!region(nv)) continue; let best = -1, bd = 1e9;
    for (let s = 0; s < H.S; s++) { const dx = H.nrm[s * 3] - nv.x, dy = H.nrm[s * 3 + 1] - nv.y, dz = H.nrm[s * 3 + 2] - nv.z, d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = s; } } map[i] = best; }
  G.scalpMap = map; H.scalpDirty = true;
  G.face = { mood: 'smile', until: 0, blink: 2, look: V3(), brow: 0 };
  G.bubbles = []; return G;
}
function updateScalp(G) {
  const H = G.hair; if (!H.scalpDirty) return; H.scalpDirty = false;
  const col = G.headGeo.attributes.color.array, sk = G.skinLin, map = G.scalpMap;
  for (let i = 0; i < map.length; i++) { const s = map[i]; if (s < 0) continue; const l = H.L[s];
    const cov = l < .004 ? 0 : l < .05 ? .4 : clamp(l / .14, .4, 1) * (H.kind[s] === 2 ? .55 : .88); const o = s * NP * 3;
    col[i * 3] = lerp(sk[0], H.col[o] * .7, cov); col[i * 3 + 1] = lerp(sk[1], H.col[o + 1] * .7, cov); col[i * 3 + 2] = lerp(sk[2], H.col[o + 2] * .7, cov); }
  G.headGeo.attributes.color.needsUpdate = true;
}

/* ================= bubbles / debris / particles ================= */
const bubM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .08, metalness: 0, transparent: true, opacity: .72, iridescence: 1, iridescenceIOR: 1.35, envMapIntensity: 1.6 });
const BUBMAX = 380; const bubMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 12), bubM, BUBMAX); bubMesh.count = 0; bubMesh.frustumCulled = false; headG.add(bubMesh);
const DEBMAX = 700; const debMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std('#ffffff', { roughness: .7 }), DEBMAX); debMesh.count = 0; debMesh.castShadow = false; debMesh.receiveShadow = true; debMesh.frustumCulled = false; scene.add(debMesh);
debMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(DEBMAX * 3), 3);
const debris = []; let debHead = 0;
function spawnDebris(wp, len, c) {
  const d = { p: wp.clone(), v: V3(rnd(-.3, .3), rnd(-.2, .3), rnd(-.1, .4)), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(0, 6), rnd(0, 6), rnd(0, 6))), sp: V3(rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)), len: clamp(len, .04, .42), rest: false, ph: Math.random() * 6 };
  if (debris.length < DEBMAX) { debris.push(d); debMesh.count = debris.length; d.i = debris.length - 1; } else { d.i = debHead; debris[debHead] = d; debHead = (debHead + 1) % DEBMAX; }
  debMesh.instanceColor.setXYZ(d.i, c[0], c[1], c[2]); debMesh.instanceColor.needsUpdate = true;
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = V3(), _e = new THREE.Euler();
function updateDebris(dt, t) {
  let any = false;
  for (const d of debris) { if (d.rest) continue; any = true; d.v.y -= 5.5 * dt; d.v.multiplyScalar(.985); d.p.addScaledVector(d.v, dt); d.p.x += Math.sin(t * 6 + d.ph) * .003;
    _q.setFromEuler(_e.set(d.sp.x * dt, d.sp.y * dt, d.sp.z * dt)); d.q.multiply(_q);
    if (d.p.y < .02) { d.p.y = .012 + Math.random() * .006; d.rest = true; d.q.setFromEuler(_e.set(0, rnd(0, 6.28), Math.PI / 2)); }
    _m4.compose(d.p, d.q, _s.set(.012, d.len, .012)); debMesh.setMatrixAt(d.i, _m4); }
  if (any) debMesh.instanceMatrix.needsUpdate = true;
}
function clearDebris() { debris.length = 0; debHead = 0; debMesh.count = 0; }

const PMAX = 1400;
const pGeo = new THREE.BufferGeometry(); const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3), pSize = new Float32Array(PMAX), pA = new Float32Array(PMAX);
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage)); pGeo.setAttribute('aCol', new THREE.BufferAttribute(pCol, 3).setUsage(THREE.DynamicDrawUsage));
pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1).setUsage(THREE.DynamicDrawUsage)); pGeo.setAttribute('aA', new THREE.BufferAttribute(pA, 1).setUsage(THREE.DynamicDrawUsage));
const pMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uPx: { value: 800 } },
  vertexShader: `attribute vec3 aCol; attribute float aSize; attribute float aA; uniform float uPx; varying vec3 vC; varying float vA;
  void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=aSize*uPx/max(0.1,-mv.z); vC=aCol; vA=aA; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 d=gl_PointCoord-0.5; float r=length(d); if(r>0.5) discard; float a=smoothstep(0.5,0.18,r)*vA; vec3 c=vC*(1.0+0.35*smoothstep(0.3,0.0,length(d-vec2(-0.12,-0.12)))); gl_FragColor=vec4(c,a); }` });
const pts = new THREE.Points(pGeo, pMat); pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts);
const parts = [];
function emit(p, v, c, size, life, grav = 0, drag = 1, alpha = 1, grow = 0) { if (parts.length >= PMAX) parts.shift(); parts.push({ p: p.clone(), v: v.clone(), c, size, life, max: life, grav, drag, alpha, grow }); }
function updateParts(dt) {
  let n = 0;
  for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life -= dt; if (q.life <= 0 || q.p.y < .01) { parts.splice(i, 1); continue; } q.v.y -= q.grav * dt; q.v.multiplyScalar(Math.pow(q.drag, dt * 60)); q.p.addScaledVector(q.v, dt); q.size += q.grow * dt; }
  for (const q of parts) { pPos[n * 3] = q.p.x; pPos[n * 3 + 1] = q.p.y; pPos[n * 3 + 2] = q.p.z; pCol[n * 3] = q.c[0]; pCol[n * 3 + 1] = q.c[1]; pCol[n * 3 + 2] = q.c[2]; pSize[n] = q.size; pA[n] = q.alpha * Math.min(1, q.life / q.max * 2.5); n++; }
  pGeo.setDrawRange(0, n); for (const k of ['position', 'aCol', 'aSize', 'aA']) pGeo.attributes[k].needsUpdate = true;
}

/* ================= audio ================= */
let AC = null, master = null, noiseBuf = null;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = SAVE.mute ? 0 : .9; master.connect(AC.destination);
  noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } catch (e) { } } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
function noise(dur, type, f, q, vol, t0 = 0) { const a = ac(); if (!a) return; const t = a.currentTime + t0; const s = a.createBufferSource(); s.buffer = noiseBuf; const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = a.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(fl).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + dur + .05); }
function tone(f, dur, type = 'sine', vol = .1, t0 = 0, f2 = 0) { const a = ac(); if (!a) return; const t = a.currentTime + t0; const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + .05); }
const sfx = {
  snip() { noise(.05, 'bandpass', 5200, 2, .35); noise(.04, 'highpass', 7000, 1, .25, .06); tone(2400, .03, 'square', .03, .06); },
  pop() { tone(rnd(500, 900), .07, 'sine', .08, 0, rnd(1200, 1800)); },
  sparkle() { tone(rnd(1400, 2600), .18, 'sine', .05); },
  click() { tone(900, .04, 'triangle', .06); },
  shutter() { noise(.08, 'highpass', 3000, 1, .5); noise(.12, 'bandpass', 1200, 3, .3, .09); },
  swish() { noise(.18, 'bandpass', 1800, 1.5, .12); },
  spray() { noise(.16, 'highpass', 5000, .7, .18); },
};
const loops = {};
function loopOn(name, build) { const a = ac(); if (!a || loops[name]) return; const g = a.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(1, a.currentTime + .08); g.connect(master); const nodes = build(a, g); loops[name] = { g, nodes }; }
function loopOff(name) { const l = loops[name]; if (!l || !AC) return; delete loops[name]; l.g.gain.cancelScheduledValues(AC.currentTime); l.g.gain.setValueAtTime(l.g.gain.value, AC.currentTime); l.g.gain.linearRampToValueAtTime(0, AC.currentTime + .12); setTimeout(() => l.nodes.forEach(n => { try { n.stop(); } catch (e) { } }), 200); }
const noiseLoop = (a, g, type, f, q, vol, lfo = 0) => { const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const v = a.createGain(); v.gain.value = vol; s.connect(fl).connect(v).connect(g); s.start(); const out = [s];
  if (lfo) { const o = a.createOscillator(); o.frequency.value = lfo; const og = a.createGain(); og.gain.value = f * .25; o.connect(og).connect(fl.frequency); o.start(); out.push(o); } return out; };
const LOOPS = {
  clipper: (a, g) => { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 118; const o2 = a.createOscillator(); o2.type = 'square'; o2.frequency.value = 236; const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; const v = a.createGain(); v.gain.value = .06;
    const am = a.createOscillator(); am.frequency.value = 55; const amg = a.createGain(); amg.gain.value = .03; am.connect(amg).connect(v.gain); o.connect(f); o2.connect(f); f.connect(v).connect(g); o.start(); o2.start(); am.start(); return [o, o2, am, ...noiseLoop(a, g, 'bandpass', 3000, 2, .05)]; },
  dryer: (a, g) => noiseLoop(a, g, 'bandpass', 900, .7, .3, 3.3),
  shower: (a, g) => noiseLoop(a, g, 'highpass', 2500, .5, .22, 7),
  spray: (a, g) => noiseLoop(a, g, 'highpass', 5200, .6, .2),
  sizzle: (a, g) => noiseLoop(a, g, 'highpass', 7000, .6, .1, 9),
  scrub: (a, g) => noiseLoop(a, g, 'bandpass', 1400, 1.2, .14, 5),
};
function voice(kind) {
  const a = ac(); if (!a || !CUR) return; const p = CUR.ch.voice; const t = a.currentTime;
  const seq = { happy: [[1, .12], [1.25, .12], [1.5, .22]], wow: [[1.1, .1], [1.6, .32]], giggle: [[1.4, .07], [1.2, .07], [1.45, .07], [1.25, .07], [1.5, .1]], ouch: [[1.3, .08], [.9, .25]], hmm: [[1, .14], [.92, .22]], sad: [[1, .18], [.85, .2], [.72, .34]], scared: [[1.5, .07], [1.6, .07], [1.95, .3]], love: [[1.2, .1], [1.45, .1], [1.8, .28]] }[kind] || [[1, .2]];
  let tt = t;
  for (const [m, d] of seq) { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(220 * p * m, tt); o.frequency.linearRampToValueAtTime(220 * p * m * 1.08, tt + d);
    const f1 = a.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 800 * Math.sqrt(p); f1.Q.value = 3; const f2 = a.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1900 * Math.sqrt(p); f2.Q.value = 4;
    const g = a.createGain(); g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(.12, tt + .02); g.gain.exponentialRampToValueAtTime(.0001, tt + d);
    o.connect(f1).connect(g); o.connect(f2).connect(g); g.connect(master); o.start(tt); o.stop(tt + d + .02); tt += d * .9; }
}
let musicOn = false, musicTimer = 0, musicStep = 0;
function musicTick() {
  if (!AC || !musicOn) return; const a = AC; const bpm = 92, sp = 60 / bpm / 2; const now = a.currentTime;
  while (musicTimer < now + .25) { const st = musicStep % 32; const bar = Math.floor(musicStep / 8) % 4;
    const ch = [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]][bar]; const mf = n => 440 * Math.pow(2, (n - 69) / 12);
    const play = (f, d, type, vol) => { const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, musicTimer); g.gain.linearRampToValueAtTime(vol, musicTimer + .02); g.gain.exponentialRampToValueAtTime(.0001, musicTimer + d); o.connect(g).connect(musicBus); o.start(musicTimer); o.stop(musicTimer + d + .05); };
    if (st % 8 === 0) ch.forEach(n => play(mf(n), sp * 7.5, 'triangle', .022));
    if (st % 4 === 0) play(mf(ch[0] - 24), sp * 3, 'sine', .09);
    if (st % 2 === 1) { const s = a.createBufferSource(); s.buffer = noiseBuf; const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8000; const g = a.createGain(); g.gain.setValueAtTime(.025, musicTimer); g.gain.exponentialRampToValueAtTime(.0001, musicTimer + .05); s.connect(f).connect(g).connect(musicBus); s.start(musicTimer, Math.random()); s.stop(musicTimer + .06); }
    if ([0, 3, 6, 10, 12, 14].includes(st % 16) && Math.random() < .7) play(mf(ch[Math.floor(Math.random() * 4)] + 12), sp * 1.6, 'sine', .028);
    musicTimer += sp; musicStep++; }
}
let musicBus = null;
function startMusic() { if (!ac() || musicOn || !SAVE.music) return; if (!musicBus) { musicBus = AC.createGain(); musicBus.gain.value = .8; musicBus.connect(master); } musicOn = true; musicTimer = AC.currentTime + .1; }
function stopMusic() { musicOn = false; }

/* ================= state & UI ================= */
const chars = {}; let CUR = null;
function setChar(id) {
  if (CUR) { bodyG.remove(CUR.body); headG.remove(CUR.head); }
  if (!chars[id]) { const ch = CHARS.find(c => c.id === id); chars[id] = buildChar(ch); }
  CUR = chars[id]; bodyG.add(CUR.body); headG.add(CUR.head); updateScalp(CUR); syncBubbles();
  $('custName').textContent = CUR.ch.name; if (THUMB[id]) $('custImg').src = THUMB[id];
  SAVE.last = id; store();
}
const TOOLS = [
  { id: 'cut', n: T('מספריים', 'Scissors'), hint: T('גררו על השיער כדי לגזור', 'Drag over the hair to cut it') },
  { id: 'clip', n: T('מכונה', 'Clippers'), hint: T('מכונת תספורת – מגלחת עד הסוף', 'Clippers shave it right down') },
  { id: 'comb', n: T('מסרק', 'Comb'), hint: T('גררו כדי לסרק ולעצב', 'Drag to comb and style') },
  { id: 'grow', n: T('צמיחה', 'Grow'), hint: T('שיקוי צמיחה – גם לזקן!', 'Grow potion – works on beards too!') },
  { id: 'color', n: T('צבע', 'Color'), hint: T('בחרו צבע וצבעו את השיער', 'Pick a color and spray the hair') },
  { id: 'shampoo', n: T('שמפו', 'Shampoo'), hint: T('שפשפו כדי לעשות קצף', 'Rub to make foam') },
  { id: 'shower', n: T('מים', 'Water'), hint: T('שוטפים את הקצף ומרטיבים', 'Rinse the foam and wet the hair') },
  { id: 'dryer', n: T('פן', 'Dryer'), hint: T('מייבש ונותן נפח', 'Dries and adds volume') },
  { id: 'curl', n: T('סלסול', 'Curl'), hint: T('מסלסל את השיער', 'Makes the hair curly') },
  { id: 'straight', n: T('החלקה', 'Straighten'), hint: T('מחליק תלתלים', 'Straightens curls') },
  { id: 'acc', n: T('אביזרים', 'Extras'), hint: '' },
];
const ICON = {
  cut: `<svg viewBox="0 0 48 48"><circle cx="14" cy="34" r="7" fill="none" stroke="#ff5fa2" stroke-width="4.5"/><circle cx="34" cy="34" r="7" fill="none" stroke="#ff5fa2" stroke-width="4.5"/><path d="M18 29 36 6" stroke="#9aa6b8" stroke-width="5" stroke-linecap="round"/><path d="M30 29 12 6" stroke="#c7d0dd" stroke-width="5" stroke-linecap="round"/><circle cx="24" cy="19" r="2.2" fill="#5b6475"/></svg>`,
  clip: `<svg viewBox="0 0 48 48"><rect x="15" y="12" width="18" height="32" rx="7" fill="#4fd1c5"/><rect x="13" y="5" width="22" height="9" rx="3" fill="#9aa6b8"/><path d="M15 5v-2M19 5v-2M23 5v-2M27 5v-2M31 5v-2" stroke="#9aa6b8" stroke-width="2"/><circle cx="24" cy="26" r="3.5" fill="#fff"/><rect x="20" y="34" width="8" height="3" rx="1.5" fill="#2f8f86"/></svg>`,
  comb: `<svg viewBox="0 0 48 48"><rect x="6" y="14" width="36" height="9" rx="4" fill="#a98bff"/><path d="M9 23v14M13 23v14M17 23v14M21 23v14M25 23v14M29 23v14M33 23v14M37 23v14" stroke="#a98bff" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  grow: `<svg viewBox="0 0 48 48"><path d="M19 6h10v8l7 10v14a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5V24l7-10z" fill="#3fd6b0"/><path d="M12 30h24v8a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5z" fill="#1fa889"/><rect x="18" y="3" width="12" height="5" rx="2" fill="#ffc94a"/><path d="M38 6l1.5 3.5L43 11l-3.5 1.5L38 16l-1.5-3.5L33 11l3.5-1.5z" fill="#ffc94a"/></svg>`,
  color: `<svg viewBox="0 0 48 48"><rect x="13" y="16" width="20" height="28" rx="5" fill="#ff5fa2"/><rect x="17" y="9" width="12" height="8" rx="2" fill="#9aa6b8"/><rect x="20" y="5" width="9" height="5" rx="2" fill="#5b6475"/><circle cx="38" cy="7" r="2.4" fill="#ffc94a"/><circle cx="42" cy="13" r="2" fill="#4fd1c5"/><circle cx="36" cy="14" r="1.6" fill="#a98bff"/><rect x="13" y="26" width="20" height="6" fill="#fff" opacity=".5"/></svg>`,
  shampoo: `<svg viewBox="0 0 48 48"><path d="M16 16h16l2 6v18a5 5 0 0 1-5 5H19a5 5 0 0 1-5-5V22z" fill="#ffc94a"/><rect x="20" y="8" width="8" height="8" fill="#ff8f6b"/><path d="M28 9h8" stroke="#ff8f6b" stroke-width="3" stroke-linecap="round"/><circle cx="36" cy="22" r="4" fill="#cfefff" stroke="#9fd8ff" stroke-width="1.5"/><circle cx="41" cy="31" r="3" fill="#cfefff" stroke="#9fd8ff" stroke-width="1.5"/><circle cx="24" cy="31" r="5" fill="#fff" opacity=".7"/></svg>`,
  shower: `<svg viewBox="0 0 48 48"><path d="M8 20a16 9 0 0 1 32 0z" fill="#9aa6b8"/><rect x="21" y="4" width="6" height="10" rx="3" fill="#c7d0dd"/><g fill="#5fc8ff"><circle cx="13" cy="27" r="2.4"/><circle cx="20" cy="31" r="2.4"/><circle cx="28" cy="31" r="2.4"/><circle cx="35" cy="27" r="2.4"/><circle cx="16" cy="38" r="2.4"/><circle cx="24" cy="41" r="2.4"/><circle cx="32" cy="38" r="2.4"/></g></svg>`,
  dryer: `<svg viewBox="0 0 48 48"><path d="M6 14a10 10 0 0 1 10-10h16l8 4v12l-8 4H16A10 10 0 0 1 6 14z" fill="#ff8f6b"/><circle cx="17" cy="14" r="5" fill="#fff" opacity=".85"/><path d="M18 24h9l-3 20h-6z" fill="#e26a4a"/><path d="M42 10h4M42 15h5M42 20h4" stroke="#9fd8ff" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  curl: `<svg viewBox="0 0 48 48"><rect x="20" y="28" width="8" height="16" rx="3" fill="#5b6475"/><rect x="19" y="4" width="10" height="26" rx="5" fill="#c7d0dd"/><path d="M14 8c8 0 12 3 12 6s-12 3-12 6 12 3 12 6-4 6-12 6" fill="none" stroke="#ff5fa2" stroke-width="3.4" stroke-linecap="round"/></svg>`,
  straight: `<svg viewBox="0 0 48 48"><rect x="12" y="4" width="8" height="34" rx="4" fill="#a98bff"/><rect x="28" y="4" width="8" height="34" rx="4" fill="#a98bff"/><rect x="14" y="4" width="4" height="20" rx="2" fill="#ffd0e4"/><rect x="30" y="4" width="4" height="20" rx="2" fill="#ffd0e4"/><path d="M20 38 24 44l4-6" fill="#7a5cdb"/></svg>`,
  acc: `<svg viewBox="0 0 48 48"><path d="M24 24 8 14v20zM24 24l16-10v20z" fill="#ff3d8b"/><circle cx="24" cy="24" r="6" fill="#ff7ab8"/><path d="M30 34l4 10M18 34l-4 10" stroke="#ff3d8b" stroke-width="4" stroke-linecap="round"/></svg>`,
};
const PALETTE = ['#2b1d16', '#7a3c1a', '#c06a2a', '#f2c46a', '#fff1b8', '#ff3d6e', '#ff5fb0', '#b26bff', '#3f8cff', '#2fd3c0', '#57d65b', '#ffffff', 'rainbow'];
const ACCS = [['bow', T('פפיון', 'Bow'), '🎀'], ['glasses', T('משקפיים', 'Shades'), '🕶️'], ['crown', T('כתר', 'Crown'), '👑'], ['flower', T('פרח', 'Flower'), '🌼'], ['earrings', T('עגילים', 'Earrings'), '💫']];
let tool = 'cut', paint = '#ff5fb0';
function renderTools() {
  $('tools').innerHTML = TOOLS.map(t => `<button class="tl" data-t="${t.id}" aria-pressed="${t.id === tool}"><span class="ic">${ICON[t.id]}</span><span>${t.n}</span></button>`).join('');
  const tr = $('tray');
  if (tool === 'color') { tr.hidden = false; tr.innerHTML = PALETTE.map(c => `<button class="sw" data-c="${c}" aria-pressed="${c === paint}" style="background:${c === 'rainbow' ? 'conic-gradient(#ff3d6e,#ffc94a,#57d65b,#2fd3c0,#3f8cff,#b26bff,#ff3d6e)' : c}"></button>`).join(''); }
  else if (tool === 'acc') { tr.hidden = false; tr.innerHTML = ACCS.map(([k, n, e]) => `<button class="acc" data-a="${k}" aria-pressed="${!!(CUR && CUR.acc[k].visible)}">${e} ${n}</button>`).join(''); }
  else tr.hidden = true;
  $('cur').innerHTML = ICON[tool] || '';
}
$('tools').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; ac(); sfx.click(); tool = b.dataset.t; renderTools(); const t = TOOLS.find(x => x.id === tool); if (t.hint && !SAVE.seen[tool]) { toast(t.hint); SAVE.seen[tool] = 1; store(); } };
$('tray').onclick = e => { const s = e.target.closest('[data-c]'); if (s) { paint = s.dataset.c; sfx.click(); renderTools(); return; }
  const a = e.target.closest('[data-a]'); if (a && CUR) { const m = CUR.acc[a.dataset.a]; m.visible = !m.visible; if (m.visible) placeAcc(m); sfx.pop(); if (m.visible) { const P = pers(), e2 = P && P.acc[a.dataset.a]; if (e2) say(e2[1], e2[0], 2.2, e2[0] === 'hmm' || e2[0] === 'wow' ? 'hmm' : 'happy'); else { react('happy', 1.6); voice('happy'); } wantDone('acc', a.dataset.a); for (let i = 0; i < 14; i++) emit(m.getWorldPosition(V3()), V3(rnd(-1, 1), rnd(0, 1.5), rnd(-1, 1)).multiplyScalar(.8), [3, 2.6, 1.2], .05, .7, 0, .92); } renderTools(); } };
function placeAcc(m) { const n = m.userData.n; if (!n || !CUR) return; const H = CUR.hair; let mx = 0;
  for (let s = 0; s < H.S; s++) { if (H.kind[s] !== 1) continue; const d = H.nrm[s * 3] * n.x + H.nrm[s * 3 + 1] * n.y + H.nrm[s * 3 + 2] * n.z; if (d > .9) mx = Math.max(mx, H.L[s]); }
  const cu = CUR.hair.curl.reduce((x, y) => x + y, 0) / CUR.hair.S; const off = (mx > .02 ? .03 + Math.min(mx, .3) * (.2 + cu * .9) : .006) + (m.userData.base ?? .03); m.position.copy(n).multiplyScalar(R + off); }
let toastT = 0; function toast(s) { $('toast').textContent = s; $('toast').classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => $('toast').classList.remove('on'), 2200); }

/* ================= input ================= */
const ptr = { down: false, x: 0, y: 0, lx: 0, ly: 0, id: -1, moved: 0 };
const touches = new Map(); let pinch0 = 0, zoom = 1, zoom0 = 1;
const cv = renderer.domElement;
cv.addEventListener('pointerdown', e => { ac(); startMusic(); touches.set(e.pointerId, [e.clientX, e.clientY]);
  if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = zoom; endTool(); ptr.down = false; return; }
  if (tool === 'acc') return; ptr.down = true; ptr.id = e.pointerId; ptr.x = ptr.lx = e.clientX; ptr.y = ptr.ly = e.clientY; ptr.moved = 0; startTool(); cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => { if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
  if (touches.size === 2 && pinch0) { const [a, b] = [...touches.values()]; zoom = clamp(zoom0 * pinch0 / Math.hypot(a[0] - b[0], a[1] - b[1]), .55, 1.35); return; }
  if (!isTouch || ptr.down) { ptr.x = e.clientX; ptr.y = e.clientY; } });
const up = e => { touches.delete(e.pointerId); if (touches.size < 2) pinch0 = 0; if (e.pointerId === ptr.id) { ptr.down = false; ptr.id = -1; endTool(); } };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', e => { if (!isTouch) { $('cur').classList.remove('on'); $('ring').classList.remove('on'); } });
cv.addEventListener('pointerenter', () => { if (!isTouch && tool !== 'acc') $('cur').classList.add('on'); });
cv.addEventListener('wheel', e => { e.preventDefault(); zoom = clamp(zoom * (1 + Math.sign(e.deltaY) * .08), .55, 1.35); }, { passive: false });
let rotT = 0, rotV = 0;
const rot = d => { ac(); rotT += d * Math.PI / 4; sfx.swish(); const n = performance.now(); rotHist = rotHist.filter(x => n - x < 2600); rotHist.push(n); if (rotHist.length >= 5 && CUR && state === 'play') { rotHist = []; const P = pers(); if (P) say(P.dizzy[2], P.dizzy[0], 2.4, P.dizzy[1]); } };
$('rotL').onclick = () => rot(-1); $('rotR').onclick = () => rot(1);
addEventListener('keydown', e => { if (e.key === 'ArrowLeft') rot(-1); if (e.key === 'ArrowRight') rot(1); const k = parseInt(e.key); if (k >= 1 && k <= 9) { tool = TOOLS[k - 1].id; renderTools(); } if (e.key === '0') { tool = 'straight'; renderTools(); } });

/* ================= personality: likes, dislikes, fears + speech bubbles ================= */
// [mood, voice, line] per tool. Lines are short so kids can read them in a second.
const PERS = {
  mila: {
    hi: T('היי! 💇‍♀️ מה עושים לי היום?', 'Hi! 💇‍♀️ What are we doing today?'),
    tools: { cut: ['hmm', 'hmm', T('✂️ רק את הקצוות, טוב?', '✂️ Just the tips, okay?')], clip: ['scared', 'scared', T('😱 לא את המכונה!', '😱 Not the clippers!')], comb: ['happy', 'happy', T('☺️ נעים…', '☺️ Ahh, nice…')],
      grow: ['love', 'love', T('🤩 עוד יותר ארוך!', '🤩 Even longer!')], shampoo: ['laugh', 'giggle', T('😂 מדגדג!', '😂 That tickles!')], shower: ['squint', 'ouch', T('🥶 קר! קר!', '🥶 Cold! Cold!')],
      dryer: ['happy', 'happy', T('😊 חם ונעים!', '😊 Warm and cozy!')], curl: ['love', 'love', T('🥰 תלתלים!', '🥰 Curls!')], straight: ['happy', 'happy', T('✨ חלק ומבריק', '✨ Smooth and shiny')], color: ['happy', 'happy', null] },
    cLove: ['#ff5fb0', '#b26bff', 'rainbow', '#ff3d6e', '#fff1b8'], cLoveL: T('💖 הצבע האהוב עליי!', '💖 My favorite color!'), cHate: ['#2b1d16', '#57d65b'], cHateL: T('🤨 הממ… לא בטוחה', '🤨 Hmm… not sure'),
    cut1: ['wow', 'wow', T('😮 וואו, זה מתקצר!', '😮 Whoa, it is getting short!')], cut2: ['sad', 'sad', T('😢 השיער הארוך שלי…', '😢 My long hair…')],
    acc: { bow: ['love', T('🎀 איזה מתוק!', '🎀 So cute!')], crown: ['love', T('👑 אני נסיכה!', '👑 I am a princess!')], flower: ['love', T('🌼 איזה יפה!', '🌼 So pretty!')], glasses: ['proud', T('😎 סטייל!', '😎 So stylish!')], earrings: ['love', T('💫 נוצץ!', '💫 Sparkly!')] },
    proud: T('😍 אני נראית מדהים!', '😍 I look amazing!'), dizzy: ['dizzy', 'wow', T('🌀 מסתובב לי הראש!', '🌀 I am so dizzy!')], thanks: T('🥰 תודה! בדיוק מה שרציתי', '🥰 Thank you! Just what I wanted'),
    wants: [{ tool: 'color', paint: '#ff5fb0', line: T('💖 אפשר צבע ורוד?', '💖 Can I have pink hair?') }, { tool: 'curl', line: T('🥰 אפשר תלתלים?', '🥰 Can I have curls?') }, { acc: 'crown', line: T('👑 אני רוצה כתר!', '👑 I want a crown!') }, { tool: 'dryer', line: T('💨 תעשו לי פן?', '💨 A blow-dry, please?') }] },
  rafi: {
    hi: T('שלום! 😄 רק בלי ורוד, טוב?', 'Hello! 😄 Just no pink, okay?'),
    tools: { cut: ['happy', 'happy', T('✂️ קצר ומסודר, בבקשה', '✂️ Short and neat, please')], clip: ['proud', 'happy', T('💪 יאללה, מכונה!', '💪 Clippers, let us go!')], comb: ['happy', 'happy', T('😌 ככה אני אוהב', '😌 Just how I like it')],
      grow: ['wow', 'wow', T('🧔 זקן של מלך!', '🧔 A king-size beard!')], shampoo: ['laugh', 'giggle', T('😂 חחח, מדגדג!', '😂 Haha, it tickles!')], shower: ['ouch', 'ouch', T('🥶 אוי, קר!', '🥶 Oof, cold!')],
      dryer: ['happy', 'happy', T('😄 חם!', '😄 Toasty!')], curl: ['hmm', 'hmm', T('🤔 תלתלים? מעניין…', '🤔 Curls? Interesting…')], straight: ['smile', 'hmm', null], color: ['happy', 'happy', null] },
    cLove: ['#2b1d16', '#7a3c1a', '#3f8cff', '#f2c46a'], cLoveL: T('👍 קלאסי!', '👍 Classic!'), cHate: ['#ff5fb0', '#ff3d6e', 'rainbow', '#b26bff'], cHateL: T('😳 ורוד?! …טוב, למה לא', '😳 Pink?! …okay, why not'),
    cut1: ['proud', 'happy', T('😎 מרענן!', '😎 So fresh!')], cut2: ['wow', 'wow', T('😮 קרחת? אמיץ!', '😮 Bald? Brave!')],
    acc: { bow: ['wow', T('😳 פפיון?!', '😳 A bow?!')], crown: ['proud', T('👑 המלך הגיע!', '👑 The king is here!')], flower: ['laugh', T('😂 חחח, פרח!', '😂 Haha, a flower!')], glasses: ['proud', T('😎 סטייל!', '😎 So cool!')], earrings: ['hmm', T('🤔 עגילים? נו טוב', '🤔 Earrings? Oh well')] },
    proud: T('😎 נראה מעולה!', '😎 Looking sharp!'), dizzy: ['dizzy', 'wow', T('🌀 וואו, מסתובב לי!', '🌀 Whoa, the room is spinning!')], thanks: T('😄 תודה, אלופים!', '😄 Thanks, champs!'),
    wants: [{ tool: 'grow', line: T('🧔 תגדלו לי זקן?', '🧔 Grow my beard?') }, { tool: 'clip', line: T('✂️ אפשר תספורת קצרה?', '✂️ A short buzz cut, please?') }, { acc: 'glasses', line: T('😎 יש משקפי שמש?', '😎 Got any sunglasses?') }, { tool: 'comb', line: T('🪮 תסרקו אותי יפה?', '🪮 Comb me nicely?') }] },
  pom: {
    hi: T('גררר! 👾 תעשו אותי יפה!', 'Grrr! 👾 Make me pretty!'),
    tools: { cut: ['laugh', 'giggle', T('😝 גזרו! גזרו!', '😝 Snip! Snip!')], clip: ['scared', 'scared', T('😱 קרחת?! לאאא!', '😱 Bald?! Nooo!')], comb: ['hmm', 'hmm', T('🤪 אני אוהב כשזה פרוע…', '🤪 I like it messy…')],
      grow: ['love', 'love', T('🤩 עוד פרווה!', '🤩 More fluff!')], shampoo: ['love', 'giggle', T('🫧 בועות!!', '🫧 Bubbles!!')], shower: ['scared', 'scared', T('😱 מים?! מפלצות שונאות מים!', '😱 Water?! Monsters hate water!')],
      dryer: ['wow', 'wow', T('🌪️ ווווש! איזה פרוותי!', '🌪️ Whoosh! So fluffy!')], curl: ['love', 'love', T('🥰 עוד תלתלים!', '🥰 More curls!')], straight: ['sad', 'sad', T('😕 איפה התלתלים שלי?', '😕 Where did my curls go?')], color: ['happy', 'happy', T('🎨 יאמי, צבע!', '🎨 Yummy, paint!')] },
    cLove: ['rainbow', '#57d65b', '#2fd3c0', '#b26bff', '#ff5fb0'], cLoveL: T('🌈 עוד צבעים!', '🌈 More colors!'), cHate: ['#2b1d16', '#7a3c1a', '#ffffff'], cHateL: T('😴 משעמם…', '😴 Boring…'),
    cut1: ['wow', 'wow', T('🙀 קריר לי בראש!', '🙀 My head feels breezy!')], cut2: ['sad', 'sad', T('🥺 הפרווה שלי…', '🥺 My fluff…')],
    acc: { crown: ['proud', T('👑 מלך המפלצות!', '👑 King of the monsters!')], bow: ['laugh', T('😂 חחח!', '😂 Hahaha!')], flower: ['love', T('🌼 יאמי… אפשר לאכול?', '🌼 Yum… can I eat it?')], glasses: ['proud', T('😎 מפלצת מגניבה!', '😎 Cool monster!')], earrings: ['laugh', T('💫 נוצץ!', '💫 Shiny!')] },
    proud: T('🤩 אני המפלצת הכי יפה!', '🤩 I am the prettiest monster!'), dizzy: ['laugh', 'giggle', T('🎢 יאאא! עוד פעם!', '🎢 Wheee! Again!')], thanks: T('🤗 תודה! אני אוהב אתכם!', '🤗 Thank you! I love you!'),
    wants: [{ tool: 'shampoo', line: T('🫧 אפשר בועות?', '🫧 Bubbles, please?') }, { tool: 'color', paint: 'rainbow', line: T('🌈 אני רוצה שיער קשת!', '🌈 I want rainbow hair!') }, { tool: 'curl', line: T('🌀 עוד תלתלים?', '🌀 More curls?') }, { acc: 'crown', line: T('👑 אפשר כתר?', '👑 Can I have a crown?') }] },
};
const MOODFX = { love: ['💖', '💕', '✨'], scared: ['💦'], sad: ['💧'], dizzy: ['🌀', '⭐', '💫'], proud: ['✨', '⭐'], wow: ['❗'], laugh: ['🎵'], squint: ['💦'] };
const pers = () => CUR && PERS[CUR.ch.id];
let bubT = 0, bubOn = false, bubCd = 0;
function headScreen(y) { const w = headG.localToWorld(V3(0, y, 0)).project(camera); return [(w.x * .5 + .5) * innerWidth, (1 - (w.y * .5 + .5)) * innerHeight]; }
function placeBub() { if (!bubOn) return; const b = $('bub'); const [x, y] = headScreen(R * 1.75); const w = b.offsetWidth, h = b.offsetHeight; b.style.left = clamp(x - w / 2, 8, innerWidth - w - 8) + 'px'; b.style.top = clamp(y - h, 70, innerHeight - h - 160) + 'px'; }
function say(line, mood, dur = 2.4, vk) { if (!CUR || !line) { if (mood) react(mood, dur); return; } $('bubT').textContent = line; const b = $('bub'); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); bubOn = true; bubT = dur; bubCd = 1.2; placeBub();
  if (mood) { react(mood, dur); emo(mood); } if (vk) voice(vk); }
function emo(mood, n = 4) { const L2 = MOODFX[mood]; if (!L2 || !CUR) return; const [x, y] = headScreen(R * .6); const box = $('emofx');
  for (let i = 0; i < n; i++) { const e = document.createElement('span'); e.textContent = L2[i % L2.length]; const a = (i / n - .5) * 2.2 + rnd(-.25, .25); e.style.left = x + Math.sin(a) * 110 + 'px'; e.style.top = y - Math.cos(a) * 70 + 'px'; e.style.animationDelay = (i * .09) + 's'; e.style.fontSize = rnd(22, 34) + 'px'; box.appendChild(e); setTimeout(() => e.remove(), 1700); } }
function sumL() { const H = CUR.hair; let s = 0; for (let i = 0; i < H.S; i++) s += H.L[i]; return s; }
function personaStart() { const P = pers(); if (!P) return false; let e = P.tools[tool]; if (!e) return false;
  if (tool === 'color') { if (P.cLove.includes(paint)) e = ['love', 'love', P.cLoveL]; else if (P.cHate.includes(paint)) e = ['hmm', 'hmm', P.cHateL]; }
  CUR.seenT = CUR.seenT || {}; const key = tool + (tool === 'color' ? paint : ''); const first = !CUR.seenT[key]; CUR.seenT[key] = 1;
  if (e[2] && (first || bubCd <= 0 && Math.random() < .3)) say(e[2], e[0], 99, e[1]); else { react(e[0], 99); emo(e[0], 2); if (Math.random() < .5) voice(e[1]); }
  return true; }
function wantDone(kind, v) { const w = CUR && CUR.want; if (!w) return; const ok = kind === 'acc' ? w.acc === v : w.tool === v && (!w.paint || w.paint === paint); if (!ok) return; CUR.want = null; CUR.idle = -4;
  setTimeout(() => { const P = pers(); if (P) { say(P.thanks, 'love', 2.6, 'love'); emo('love', 7); sfx.sparkle(); } }, 350); }
let rotHist = [];
function personaTick(dt) { if (!CUR || state !== 'play') return; bubCd -= dt; if (bubOn) { bubT -= dt; if (bubT <= 0 && !(ptr.down && CUR.face.until > 50)) { $('bub').classList.remove('on'); bubOn = false; } else placeBub(); }
  const P = pers(); if (!P) return;
  if (ptr.down && (tool === 'cut' || tool === 'clip')) { CUR.cutChk = (CUR.cutChk || 0) - dt; if (CUR.cutChk <= 0) { CUR.cutChk = .35; if (!CUR.L0) CUR.L0 = sumL(); const r = sumL() / CUR.L0; const st = CUR.cutSt || 0;
      if (st < 2 && r < .38) { CUR.cutSt = 2; say(P.cut2[2], P.cut2[0], 99, P.cut2[1]); } else if (st < 1 && r < .72) { CUR.cutSt = 1; say(P.cut1[2], P.cut1[0], 99, P.cut1[1]); } } }
  if (tool === 'grow' && ptr.down && CUR.L0 && CUR.cutSt && sumL() / CUR.L0 > .85) CUR.cutSt = 0;
  if (ptr.down) { CUR.idle = 0; return; } CUR.idle = (CUR.idle || 0) + dt;
  if (CUR.idle > 9 && !bubOn) { CUR.idle = 0; if (!CUR.want) { CUR.wi = ((CUR.wi ?? -1) + 1) % P.wants.length; CUR.want = P.wants[CUR.wi]; } say(CUR.want.line, 'happy', 3.2, 'hmm'); } }
function startTool() {
  if (!CUR) return; $('cur').classList.add('on');
  const r = { cut: ['wow', 'hmm'], clip: ['wow', 'ouch'], comb: ['smile', 'hmm'], grow: ['wow', 'wow'], color: ['happy', 'happy'], shampoo: ['laugh', 'giggle'], shower: ['squint', 'ouch'], dryer: ['happy', 'happy'], curl: ['happy', 'hmm'], straight: ['smile', 'hmm'] }[tool];
  ptr.t0 = performance.now(); if (!personaStart() && r) { react(r[0], 99); if (Math.random() < .55) voice(r[1]); }
  const L = { clip: 'clipper', dryer: 'dryer', shower: 'shower', color: 'spray', curl: 'sizzle', straight: 'sizzle', shampoo: 'scrub' }[tool]; if (L) loopOn(L, LOOPS[L]);
}
function endTool() { for (const k of Object.keys(loops)) loopOff(k); if (CUR && CUR.face.until > 50) { CUR.face.until = 1.2; if (bubOn) bubT = Math.min(bubT, 1.2); }
  if (CUR && ptr.t0 && performance.now() - ptr.t0 > 700 && state === 'play') { wantDone('tool', tool); CUR.work = (CUR.work || 0) + 1; if (CUR.work % 5 === 0 && !CUR.want) { const P = pers(); setTimeout(() => { if (!ptr.down && P) say(P.proud, 'proud', 2.4, 'happy'); }, 900); } } ptr.t0 = 0; if (isTouch) { $('cur').classList.remove('on'); $('ring').classList.remove('on'); } }
function react(m, d) { if (!CUR) return; CUR.face.mood = m; CUR.face.until = d; }

/* projection of hair points (head local → screen) */
let SX = new Float32Array(0), SY = new Float32Array(0), FR = new Uint8Array(0);
const _pm = new THREE.Matrix4(), camL = V3(), _v = V3(), _w = V3();
function project(H) {
  const n = H.S * NP; if (SX.length < n) { SX = new Float32Array(n); SY = new Float32Array(n); FR = new Uint8Array(n); }
  _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(headG.matrixWorld); const e = _pm.elements;
  camL.copy(camera.position); headG.worldToLocal(camL); camL.normalize();
  const W = innerWidth, Hh = innerHeight, p = H.pos;
  for (let k = 0; k < n; k++) { const x = p[k * 3], y = p[k * 3 + 1], z = p[k * 3 + 2]; const w = e[3] * x + e[7] * y + e[11] * z + e[15];
    SX[k] = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / w * .5 + .5) * W; SY[k] = (1 - ((e[1] * x + e[5] * y + e[9] * z + e[13]) / w * .5 + .5)) * Hh;
    FR[k] = (x * camL.x + y * camL.y + z * camL.z) > -.1 ? 1 : 0; }
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pointerLocalOnPlane(out) { ndc.set(ptr.x / innerWidth * 2 - 1, -(ptr.y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const c = headG.getWorldPosition(_w); const nrm = camera.getWorldDirection(_v).negate(); const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(nrm, c); const hit = V3(); if (!ray.ray.intersectPlane(pl, hit)) return null; return headG.worldToLocal(out.copy(hit)); }
function pointerHeadHit() { ndc.set(ptr.x / innerWidth * 2 - 1, -(ptr.y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); const o = headG.worldToLocal(ray.ray.origin.clone()); const q = headG.getWorldQuaternion(new THREE.Quaternion()).invert(); const d = ray.ray.direction.clone().applyQuaternion(q);
  const b = o.dot(d), c = o.lengthSq() - (R + .03) * (R + .03), disc = b * b - c; if (disc < 0) return null; const t = -b - Math.sqrt(disc); return o.addScaledVector(d, t); }
const lastLocal = V3(), curLocal = V3(); let haveLast = false, snipCd = 0, sparkCd = 0;
function toolRadius() { return clamp(Math.min(innerWidth, innerHeight) / 700, .75, 1.35) * 40 / Math.max(.6, zoom); }

function applyTool(dt, t) {
  const G = CUR, H = G.hair; project(H);
  const rad = toolRadius(), r2 = rad * rad, px = ptr.x, py = ptr.y; const S = H.S;
  const moved = Math.hypot(ptr.x - ptr.lx, ptr.y - ptr.ly); ptr.moved += moved; ptr.lx = ptr.x; ptr.ly = ptr.y;
  const hitPt = () => { let best = -1, bd = r2 * 1.6; for (let k = 0; k < S * NP; k++) { if (!FR[k]) continue; const dx = SX[k] - px, dy = SY[k] - py, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = k; } }
    if (best >= 0) return V3(H.pos[best * 3], H.pos[best * 3 + 1], H.pos[best * 3 + 2]); return pointerHeadHit(); };
  const near = (s, rr) => { let m = -1; for (let i = 0; i < NP; i++) { const k = s * NP + i; if (!FR[k]) continue; const dx = SX[k] - px, dy = SY[k] - py; if (dx * dx + dy * dy < rr) { m = i; break; } } return m; };
  const toW = p => headG.localToWorld(p.clone());
  if (tool === 'cut' || tool === 'clip') {
    let cuts = 0, spawned = 0;
    for (let s = 0; s < S; s++) { const l = H.L[s]; if (l < (tool === 'clip' ? .004 : .015)) continue; const i = near(s, tool === 'clip' ? r2 * 1.25 : r2); if (i < 0) continue;
      const nl = tool === 'clip' ? .002 : Math.max(.012, l * Math.max(0, i - .5) / NS1); if (nl > l - .01) continue;
      if (spawned < (tool === 'clip' ? 14 : 22)) { const o = s * NP * 3, k = Math.max(1, i); const a = V3(H.pos[o + k * 3], H.pos[o + k * 3 + 1], H.pos[o + k * 3 + 2]), b = V3(H.pos[o + NS1 * 3], H.pos[o + NS1 * 3 + 1], H.pos[o + NS1 * 3 + 2]);
        spawnDebris(toW(a.add(b).multiplyScalar(.5)), (l - nl) * .7, [H.col[o + NS1 * 3], H.col[o + NS1 * 3 + 1], H.col[o + NS1 * 3 + 2]]); spawned++; }
      resample(H, s, l, nl); H.L[s] = nl; cuts++; }
    if (cuts) { H.wDirty = true; if (tool === 'cut' && snipCd <= 0) { sfx.snip(); snipCd = .13; } }
  } else if (tool === 'grow') {
    let g = 0;
    for (let s = 0; s < S; s++) { if (H.kind[s] === 2 && G.ch.noBeard) continue; const rootK = s * NP; let hit = false; if (FR[rootK]) { const dx = SX[rootK] - px, dy = SY[rootK] - py; hit = dx * dx + dy * dy < r2 * 1.6; } if (!hit && H.L[s] > .05) hit = near(s, r2 * 1.3) >= 0; if (!hit) continue;
      const l = H.L[s]; if (l >= H.Lmax[s]) continue; const nl = Math.min(H.Lmax[s], Math.max(l, .02) + dt * .62); if (l > .02) resample(H, s, l, nl); H.L[s] = nl; g++;
      if (nl > .5) for (let i = 1; i < NS1; i++) { const r = (s * NS1 + i) * 3; H.rd[r + 1] -= dt * .5 * (i / NS1); const dl = Math.hypot(H.rd[r], H.rd[r + 1], H.rd[r + 2]); H.rd[r] /= dl; H.rd[r + 1] /= dl; H.rd[r + 2] /= dl; } }
    if (g) { H.wDirty = true; if (sparkCd <= 0) { sfx.sparkle(); sparkCd = .09; } const hp = hitPt(); if (hp) for (let i = 0; i < 3; i++) emit(toW(hp), V3(rnd(-.4, .4), rnd(.2, .9), rnd(-.2, .5)), Math.random() < .5 ? [3.2, 2.6, 1] : [1.4, 3, 2.4], rnd(.03, .06), .8, -.2, .95); }
  } else if (tool === 'color') {
    const c = paint === 'rainbow' ? (() => { lin.setHSL((t * .25) % 1, .9, .55); return [lin.r, lin.g, lin.b]; })() : hexLin(paint);
    const k = Math.min(1, dt * 7); let any = 0;
    for (let s = 0; s < S; s++) { if (H.L[s] < .01) continue; for (let i = 0; i < NP; i++) { const q = s * NP + i; if (!FR[q]) continue; const dx = SX[q] - px, dy = SY[q] - py, d = dx * dx + dy * dy; if (d > r2 * 1.2) continue;
      const f = k * (1 - d / (r2 * 1.2)) * 1.4; const o = q * 3; H.col[o] = lerp(H.col[o], c[0], f); H.col[o + 1] = lerp(H.col[o + 1], c[1], f); H.col[o + 2] = lerp(H.col[o + 2], c[2], f); any = 1; } }
    if (any) H.colDirty = true;
    const hp = hitPt(); if (hp) { const wp = toW(hp), dir = camera.position.clone().sub(wp).normalize(); for (let i = 0; i < 3; i++) emit(wp.clone().addScaledVector(dir, .25), dir.clone().multiplyScalar(-1.2).add(V3(rnd(-.3, .3), rnd(-.3, .3), rnd(-.3, .3))), [c[0] * 1.2, c[1] * 1.2, c[2] * 1.2], rnd(.05, .1), .35, 0, .9, .6, .25); }
  } else if (tool === 'shampoo') {
    if (moved > 2 && G.bubbles.length < BUBMAX) { const hp = hitPt(); if (hp) { for (let i = 0; i < (moved > 8 ? 2 : 1); i++) { const p = hp.clone().add(V3(rnd(-.05, .05), rnd(-.05, .05), rnd(-.05, .05))); const n = p.clone().normalize(); p.addScaledVector(n, .02); G.bubbles.push({ p, s: .002, ts: rnd(.035, .08), ph: Math.random() * 6 }); } if (Math.random() < .25) sfx.pop(); } }
    for (let s = 0; s < S; s++) { if (near(s, r2) >= 0) { H.wet[s] = Math.min(.5, H.wet[s] + dt); H.wetDirty = true; } }
  } else if (tool === 'shower') {
    for (let s = 0; s < S; s++) { if (H.wet[s] >= 1) continue; if (near(s, r2 * 2) >= 0) { H.wet[s] = Math.min(1, H.wet[s] + dt * 1.8); H.wetDirty = true; } }
    const hp = hitPt(); const wp = hp ? toW(hp) : null;
    if (wp) { const src = wp.clone().add(V3(0, .55, .35)); for (let i = 0; i < 5; i++) emit(src.clone().add(V3(rnd(-.08, .08), 0, rnd(-.08, .08))), wp.clone().sub(src).multiplyScalar(2.2).add(V3(rnd(-.3, .3), 0, rnd(-.3, .3))), [.7, .9, 1.25], rnd(.025, .045), .9, 6, .99, .85);
      // rinse bubbles near pointer
      for (let i = G.bubbles.length - 1; i >= 0; i--) { const b = G.bubbles[i]; const w = toW(b.p).project(camera); const bx = (w.x * .5 + .5) * innerWidth, by = (1 - (w.y * .5 + .5)) * innerHeight; if ((bx - px) ** 2 + (by - py) ** 2 < r2 * 2.2) { b.pop = true; } } }
  } else if (tool === 'dryer') {
    const wind = camera.getWorldDirection(_v).clone(); const q = headG.getWorldQuaternion(new THREE.Quaternion()).invert(); wind.applyQuaternion(q);
    for (let s = 0; s < S; s++) { const i0 = near(s, r2 * 2); if (i0 < 0) continue; if (H.wet[s] > 0) { H.wet[s] = Math.max(0, H.wet[s] - dt * .9); H.wetDirty = true; }
      const nx = H.nrm[s * 3], ny = H.nrm[s * 3 + 1], nz = H.nrm[s * 3 + 2]; const o = s * NP * 3;
      for (let i = 1; i < NP; i++) { const j = o + i * 3, f = dt * 1.1 * (i / NS1) * (1 + Math.sin(t * 30 + s) * .5); H.pos[j] += (wind.x * .5 + nx * .6) * f; H.pos[j + 1] += (wind.y * .5 + ny * .6) * f; H.pos[j + 2] += (wind.z * .5 + nz * .6) * f; }
      for (let i = 0; i < NS1; i++) { const r = (s * NS1 + i) * 3; const f = dt * .35; H.rd[r] += nx * f; H.rd[r + 1] += ny * f; H.rd[r + 2] += nz * f; const dl = Math.hypot(H.rd[r], H.rd[r + 1], H.rd[r + 2]); H.rd[r] /= dl; H.rd[r + 1] /= dl; H.rd[r + 2] /= dl; } }
    const hp = hitPt(); if (hp) { const wp = toW(hp); const src = wp.clone().add(camera.position.clone().sub(wp).normalize().multiplyScalar(.45)); emit(src, wp.clone().sub(src).multiplyScalar(2.5).add(V3(rnd(-.2, .2), rnd(-.2, .2), 0)), [1.4, 1.4, 1.5], .06, .45, 0, .95, .22, .5); }
  } else if (tool === 'curl' || tool === 'straight') {
    for (let s = 0; s < S; s++) { if (H.L[s] < .05 || near(s, r2 * 1.4) < 0) continue;
      if (tool === 'curl') H.curl[s] = Math.min(1.25, H.curl[s] + dt * 1.3);
      else { H.curl[s] = Math.max(0, H.curl[s] - dt * 1.6); for (let i = 0; i < NS1; i++) { const r = (s * NS1 + i) * 3, f = dt * 1.2 * (i / NS1); H.rd[r + 1] -= f; const dl = Math.hypot(H.rd[r], H.rd[r + 1], H.rd[r + 2]); H.rd[r] /= dl; H.rd[r + 1] /= dl; H.rd[r + 2] /= dl; } } }
    const hp = hitPt(); if (hp && Math.random() < .5) emit(toW(hp), V3(rnd(-.1, .1), rnd(.3, .6), rnd(-.1, .1)), [1.3, 1.3, 1.3], .08, .8, -.1, .97, .25, .3);
  } else if (tool === 'comb') {
    if (pointerLocalOnPlane(curLocal)) {
      if (haveLast) { let dx = curLocal.x - lastLocal.x, dy = curLocal.y - lastLocal.y, dz = curLocal.z - lastLocal.z; const dm = Math.hypot(dx, dy, dz);
        if (dm > 1e-4) { dx /= dm; dy /= dm; dz /= dm; let touched = 0; const k = clamp(dm * 22, .06, .45);
          for (let s = 0; s < S; s++) { const i0 = near(s, r2 * 1.3); if (i0 < 0 || H.L[s] < .03) continue; const o = s * NP * 3;
            for (let i = Math.max(0, i0 - 1); i < NS1; i++) { const r = (s * NS1 + i) * 3, j = o + i * 3; const px0 = H.pos[j], py0 = H.pos[j + 1], pz0 = H.pos[j + 2]; const pl = Math.hypot(px0, py0, pz0) || 1; const nx = px0 / pl, ny = py0 / pl, nz = pz0 / pl;
              let cx = dx, cy = dy - .45, cz = dz; if (pz0 > -.05 && cx * px0 < 0) cx *= .25; { const cl = Math.hypot(cx, cy, cz) || 1; cx /= cl; cy /= cl; cz /= cl; } const dn = cx * nx + cy * ny + cz * nz; if (dn < .08) { cx += nx * (.08 - dn); cy += ny * (.08 - dn); cz += nz * (.08 - dn); }
              const f = k * clamp(1 - (i - i0) * .05, .45, 1); let tx = lerp(H.rd[r], cx, f), ty = lerp(H.rd[r + 1], cy, f), tz = lerp(H.rd[r + 2], cz, f); const tl = Math.hypot(tx, ty, tz) || 1; H.rd[r] = tx / tl; H.rd[r + 1] = ty / tl; H.rd[r + 2] = tz / tl; }
            for (let i = Math.max(1, i0); i < NP; i++) { const j = o + i * 3, f = dm * .55 * clamp(1 - (i - i0) * .06, .3, 1); H.pos[j] += dx * f; H.pos[j + 1] += dy * f; H.pos[j + 2] += dz * f; }
            H.curl[s] *= .97; H.stiff[s] = Math.max(H.stiff[s], .14); touched++; }
          if (touched && Math.random() < dm * 8) sfx.swish(); } }
      lastLocal.copy(curLocal); haveLast = true; }
  }
}
function settleComb(H) { }

/* bubbles */
const _bm = new THREE.Matrix4(), _bq = new THREE.Quaternion();
function syncBubbles() { bubMesh.count = CUR ? Math.min(BUBMAX, CUR.bubbles.length) : 0; }
function updateBubbles(dt, t) {
  const G = CUR; if (!G) return; const B = G.bubbles;
  for (let i = B.length - 1; i >= 0; i--) { const b = B[i];
    if (b.pop) { b.s -= dt * .5; if (b.s <= .003) { const w = headG.localToWorld(b.p.clone()); for (let k = 0; k < 2; k++) emit(w, V3(rnd(-.3, .3), rnd(-.5, .1), rnd(-.2, .3)), [.75, .9, 1.2], .03, .5, 5, .99, .8); if (Math.random() < .3) sfx.pop(); B.splice(i, 1); continue; } }
    else { b.s = Math.min(b.ts, b.s + dt * .12); b.p.y -= dt * .004; if (b.p.y < -.9) { b.pop = true; } } }
  for (let i = 0; i < B.length && i < BUBMAX; i++) { const b = B[i]; const w = 1 + Math.sin(t * 5 + b.ph) * .06; _bm.compose(b.p, _bq, _s.set(b.s * w, b.s / w, b.s)); bubMesh.setMatrixAt(i, _bm); }
  bubMesh.count = Math.min(BUBMAX, B.length); bubMesh.instanceMatrix.needsUpdate = true;
}

/* ================= face animation ================= */
const _look = V3(), _brq = new THREE.Quaternion(), _zAx = V3(0, 0, 1);
function updateFace(dt, t) {
  const G = CUR; if (!G) return; const F = G.face;
  F.until -= dt; if (F.until <= 0 && F.mood !== 'smile') F.mood = 'smile';
  const anyWet = tool === 'shower' && ptr.down;
  F.blink -= dt; let lid = 1; if (F.blink < 0) { lid = Math.abs(F.blink + .07) / .07; if (F.blink < -.14) F.blink = rnd(2, 5); }
  const M = F.mood;
  if (M === 'squint' || anyWet) lid = .12; if (M === 'laugh') lid = .35; if (M === 'love') lid = Math.min(lid, .45); if (M === 'proud') lid = Math.min(lid, .3); if (M === 'sad') lid = Math.min(lid, .62); if (M === 'hmm') lid = Math.min(lid, .7);
  // look at pointer / camera
  ndc.set(ptr.x / innerWidth * 2 - 1, -(ptr.y / innerHeight) * 2 + 1);
  let tx = (ptr.down || !isTouch) ? clamp(ndc.x * 1.4, -1, 1) : Math.sin(t * .4) * .3, ty = (ptr.down || !isTouch) ? clamp(ndc.y * 1.4 + .2, -1, 1) : 0;
  if (M === 'dizzy') { tx = Math.cos(t * 9) * .9; ty = Math.sin(t * 9) * .9; } else if (M === 'sad') ty = -.8; else if (M === 'hmm') tx = .9;
  F.look.x = lerp(F.look.x, tx, dt * (M === 'dizzy' ? 30 : 8)); F.look.y = lerp(F.look.y, ty, dt * (M === 'dizzy' ? 30 : 8));
  const lk = rotNow % (Math.PI * 2); const front = Math.cos(lk) > .3 ? 1 : 0;
  const big = M === 'scared' || M === 'wow' ? 1.16 : 1;
  for (const e of G.eyes) { e.g.scale.y = lerp(e.g.scale.y, Math.max(.08, lid) * big, dt * 25); e.g.scale.x = lerp(e.g.scale.x, big, dt * 12); e.iris.position.x = F.look.x * .022 * front; e.iris.position.y = F.look.y * .02 * front; }
  const wow = M === 'wow' || M === 'ouch' || M === 'scared';
  for (const b of G.brows) { const lift = wow ? .04 : M === 'squint' ? -.012 : M === 'sad' ? .012 : M === 'hmm' ? (b.s > 0 ? .035 : -.008) : M === 'love' ? .015 : 0;
    const tilt = M === 'sad' || M === 'scared' ? -b.s * .38 : M === 'hmm' ? (b.s > 0 ? .25 : -.1) : 0;
    b.m.position.y = lerp(b.m.position.y, b.base.y + lift, dt * 10); b.tl = lerp(b.tl || 0, tilt, dt * 10); b.m.quaternion.copy(b.q0).multiply(_brq.setFromAxisAngle(_zAx, b.tl)); }
  const open = M === 'wow' || M === 'laugh' || M === 'happy' && Math.sin(t * 9) > .6 || M === 'ouch' || M === 'scared' || M === 'dizzy' || M === 'love' && Math.sin(t * 7) > .7;
  const frown = !open && (M === 'sad' || M === 'hmm');
  G.mouth.smile.visible = !open && !frown; G.mouth.open.visible = open; G.mouth.frown.visible = frown;
  const sc = M === 'laugh' ? [1.3, .9] : M === 'wow' ? [.75, 1.1] : M === 'ouch' ? [.6, .8] : M === 'scared' ? [.62 + Math.sin(t * 40) * .04, 1] : M === 'dizzy' ? [.7, .7 + Math.sin(t * 6) * .2] : [1, .8];
  G.mouth.open.scale.set(lerp(G.mouth.open.scale.x, sc[0], dt * 12), lerp(G.mouth.open.scale.y, sc[1], dt * 12), 1);
  G.mouth.smile.scale.setScalar(M === 'happy' ? 1.2 : M === 'love' || M === 'proud' ? 1.35 : 1);
  G.mouth.frown.scale.setScalar(M === 'hmm' ? .7 : 1); G.mouth.frown.position.x = M === 'hmm' ? .03 : 0; G.mouth.frown.rotation.z = M === 'hmm' ? .25 : 0;
  if (G.cheeks) for (const c of G.cheeks) c.material.opacity = lerp(c.material.opacity, M === 'love' ? .75 : M === 'proud' || M === 'laugh' ? .5 : M === 'scared' ? .12 : .32, dt * 6);
  // head motion
  const wig = M === 'laugh' ? Math.sin(t * 18) * .05 : M === 'happy' || M === 'love' ? Math.sin(t * 6) * .035 : M === 'hmm' ? .13 : M === 'dizzy' ? Math.sin(t * 5) * .12 : 0;
  headG.rotation.z = lerp(headG.rotation.z, wig, dt * 6);
  headG.rotation.y = M === 'scared' ? Math.sin(t * 46) * .035 : M === 'sad' ? lerp(headG.rotation.y, 0, dt * 4) : lerp(headG.rotation.y, 0, dt * 6);
  headG.rotation.x = lerp(headG.rotation.x, anyWet ? .12 : M === 'sad' ? .16 : M === 'proud' ? -.13 : M === 'dizzy' ? Math.cos(t * 5) * .08 : 0, dt * 4);
}

/* ================= camera / loop ================= */
let rotNow = 0;
const camTarget = V3(0, 1.4, 0);
function placeCamera(dt, t) {
  const a = innerWidth / innerHeight, th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const needH = a < .8 ? 2.6 : 3.05, needW = a < .8 ? 2.15 : 1.8; let d = Math.max(needH / (2 * th), needW / (2 * th * a)); d *= zoom;
  const ty = a < .8 ? 1.36 : 1.5;
  camTarget.set(0, ty, 0);
  camera.position.set(0, ty + .12, d); camera.lookAt(camTarget);
}
const gLocal = V3(); let acc = 0, last = performance.now(), frameN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000; frameN++;
  rotNow = lerp(rotNow, rotT, Math.min(1, dt * 7)); chairG.rotation.y = rotNow;
  placeCamera(dt, t); camera.updateMatrixWorld(); chairG.updateMatrixWorld(true);
  if (CUR && state === 'play') {
    snipCd -= dt; sparkCd -= dt;
    if (ptr.down) applyTool(dt, t); else haveLast = false;
    const H = CUR.hair; headG.getWorldQuaternion(_bq); gLocal.set(0, -1, 0).applyQuaternion(_bq.invert());
    if (ptr.down && tool !== 'acc') H.wake = 1.6; else H.wake = (H.wake ?? 1.6) - dt;
    if (H.wake > 0) { acc += dt; let steps = 0; while (acc > 1 / 60 && steps < 2) { stepHair(H, 1 / 60, gLocal); acc -= 1 / 60; steps++; } if (acc > .05) acc = 0; if (H.wake - dt <= 0) H.prev.set(H.pos); } else acc = 0;
    if (!ptr.down || tool !== 'comb') settleComb(H);
    H.calm = !ptr.down && Math.abs(rotT - rotNow) < .01 && CUR.face.mood === 'smile';
    // drips from wet tips
    if (Math.random() < .35) { const s = Math.floor(Math.random() * H.S); if (H.wet[s] > .3 && H.L[s] > .1) { const o = (s * NP + NS1) * 3; emit(headG.localToWorld(V3(H.pos[o], H.pos[o + 1], H.pos[o + 2])), V3(0, -.1, 0), [.7, .9, 1.25], .028, 1.2, 5, .99, .8); } }
    writeHair(H); if (frameN % 6 === 0) updateScalp(CUR); if (frameN % 15 === 0) for (const k in CUR.acc) { const m = CUR.acc[k]; if (m.visible && m.userData.n) placeAcc(m); }
    updateBubbles(dt, t); updateFace(dt, t); personaTick(dt);
  } else if (CUR) { const H = CUR.hair; headG.getWorldQuaternion(_bq); gLocal.set(0, -1, 0).applyQuaternion(_bq.invert()); H.wake = (H.wake ?? 1.6) - dt; if (H.wake > 0) stepHair(H, 1 / 60, gLocal); writeHair(H); updateScalp(CUR); updateFace(dt, t); updateBubbles(dt, t); }
  updateDebris(dt, t); updateParts(dt); musicTick();
  // cursor
  if (CUR) { const c = $('cur'); c.style.transform = `translate(${ptr.x}px,${ptr.y}px)` + (ptr.down && tool === 'cut' ? ` rotate(${Math.sin(t * 30) * 8}deg)` : ''); const rr = toolRadius() * (tool === 'shower' || tool === 'dryer' ? 1.41 : 1); const g = $('ring'); g.style.width = g.style.height = rr * 2 + 'px'; g.style.transform = `translate(${ptr.x - rr}px,${ptr.y - rr}px)`; g.classList.toggle('on', ptr.down || (!isTouch && tool !== 'acc')); if (tool === 'acc') c.classList.remove('on'); }
  const hc = headG.getWorldPosition(_w); hairMat.uniforms.uHeadC.value.copy(hc);
  hairMat.uniforms.uL1.value.copy(key.position).sub(key.target.position).normalize(); hairMat.uniforms.uL2.value.copy(fill.position).normalize(); hairMat.uniforms.uL3.value.copy(rimL.position).normalize();
  grade.uniforms.uFlash.value = Math.max(0, grade.uniforms.uFlash.value - dt * 3);
  composer.render();
}
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h); const pr = renderer.getPixelRatio(); fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr)); camera.aspect = w / h; camera.updateProjectionMatrix();
  pMat.uniforms.uPx.value = h * pr / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))); }
{ const dpr = devicePixelRatio || 1, pr = SAVE.q === 'ultra' ? Math.min(dpr, 2) : SAVE.q === 'high' ? Math.min(dpr, 1.5) : Math.min(dpr, 1); renderer.setPixelRatio(pr); composer.setPixelRatio(pr); }
addEventListener('resize', resize); resize();

/* ================= screens ================= */
let state = 'title';
const THUMB = {};
function pickHTML(sel) { return CHARS.map(c => `<button class="pc" data-c="${c.id}" aria-pressed="${c.id === sel}"><img src="${THUMB[c.id] || ''}" alt=""><b>${c.name}</b><small>${c.desc}</small></button>`).join(''); }
function showTitle() { state = 'title'; $('title').hidden = false; $('hud').hidden = $('dock').hidden = $('rotL').hidden = $('rotR').hidden = true; $('pick').innerHTML = pickHTML(CUR ? CUR.ch.id : 'mila'); }
function play() { ac(); startMusic(); state = 'play'; $('title').hidden = true; $('hud').hidden = $('dock').hidden = $('rotL').hidden = $('rotR').hidden = false; renderTools(); if (!SAVE.seen.cut) { toast(TOOLS[0].hint); SAVE.seen.cut = 1; store(); } voice('happy'); react('happy', 1.5); setTimeout(() => { const P = pers(); if (P && state === 'play') say(P.hi, 'happy', 2.8); }, 700); }
$('pick').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; ac(); sfx.click(); setChar(b.dataset.c); $('pick').innerHTML = pickHTML(b.dataset.c); voice('hmm'); };
$('playBtn').onclick = play;
$('custBtn').onclick = () => { $('pick2').innerHTML = pickHTML(CUR.ch.id); $('custSheet').hidden = false; sfx.click(); };
$('pick2').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; sfx.click(); setChar(b.dataset.c); clearDebris(); $('custSheet').hidden = true; rotT = Math.round(rotT / (Math.PI * 2)) * Math.PI * 2; voice('happy'); react('happy', 1.4); renderTools(); setTimeout(() => { const P = pers(); if (P) say(P.hi, 'happy', 2.6); }, 500); };
$('csClose').onclick = () => $('custSheet').hidden = true;
$('undoBtn').onclick = () => { if (!CUR) return; resetHair(CUR.hair); CUR.bubbles.length = 0; CUR.cutSt = 0; for (const k in CUR.acc) CUR.acc[k].visible = false; clearDebris(); sfx.swish(); toast(T('השיער חזר להתחלה', 'Hair is back to the start')); renderTools(); };
function syncSnd() { $('sndBtn').innerHTML = SAVE.mute ? '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#c2338a"/><path d="M17 9l5 6M22 9l-5 6" stroke="#c2338a" stroke-width="2.4" stroke-linecap="round"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#c2338a"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="#c2338a" stroke-width="2.2" stroke-linecap="round"/></svg>'; }
$('sndBtn').onclick = () => { SAVE.mute = !SAVE.mute; store(); syncSnd(); if (master) master.gain.value = SAVE.mute ? 0 : .9; };
const QN = { ultra: T('אולטרה', 'Ultra'), high: T('גבוהה', 'High'), low: T('חסכונית', 'Saver') };
$('qBtn').textContent = '✨ ' + T('גרפיקה: ', 'Graphics: ') + QN[SAVE.q];
$('qBtn').onclick = () => { SAVE.q = { ultra: 'high', high: 'low', low: 'ultra' }[SAVE.q]; store(); location.reload(); };
$('photoBtn').onclick = () => { ac(); sfx.shutter(); $('cur').classList.remove('on'); $('ring').classList.remove('on'); grade.uniforms.uFlash.value = 0; voice('giggle'); react('laugh', 1.4);
  setTimeout(() => { updateFace(.016, performance.now() / 1000); composer.render(); const src = renderer.domElement; const w = src.width, h = src.height; const side = Math.min(w, h * .78); const c = cnv(720, 720); const g = c.getContext('2d');
    const cx = w / 2, cy = h * (innerWidth / innerHeight < .8 ? .44 : .4); g.drawImage(src, cx - side / 2, cy - side / 2, side, side, 0, 0, 720, 720); const url = c.toDataURL('image/png');
    $('photoImg').src = url; $('photoSave').href = url; $('photoCap').textContent = 'Snip Snap Salon · ' + CUR.ch.name; $('photoSheet').hidden = false; grade.uniforms.uFlash.value = .9; }, 60); };
$('photoClose').onclick = () => $('photoSheet').hidden = true;
$('photoSave').textContent = '⬇ ' + T('שמירת תמונה', 'Save photo'); $('photoClose').textContent = T('סגור', 'Close');
$('csT').textContent = T('מי הלקוח הבא?', 'Who’s next?'); $('csClose').textContent = T('סגור', 'Close');
$('tSub').textContent = T('בחרו לקוח ותנו לו לוק חדש ומשוגע!', 'Pick a customer and give them a wild new look!'); $('playBtn').textContent = T('פותחים את המספרה ✂', 'Open the salon ✂');
$('loadTxt').textContent = T('פותחים את המספרה…', 'Opening the salon…');
syncSnd();
if (window.parent !== window) { for (const id of ['homeT', 'homeP']) { $(id).hidden = false; $(id).onclick = () => { try { if (AC) AC.suspend(); } catch (e) { } window.parent.postMessage('skyplay-home', '*'); }; } }

/* ================= boot ================= */
function makeThumbs() {
  const saveZ = zoom; zoom = .5; state = 'thumb';
  for (const c of CHARS) { setChar(c.id); placeCamera(0, 0); camera.position.set(0, HEADY + .02, Math.max(1.95, .62 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect))); camera.lookAt(0, HEADY - .05, 0); camera.updateMatrixWorld(); chairG.updateMatrixWorld(true);
    writeHair(CUR.hair); updateScalp(CUR); updateFace(.016, 0); composer.render(); const src = renderer.domElement, w = src.width, h = src.height; const sd = Math.min(w, h); const cc = cnv(220, 220);
    cc.getContext('2d').drawImage(src, (w - sd) / 2, (h - sd) / 2, sd, sd, 0, 0, 220, 220); THUMB[c.id] = cc.toDataURL('image/jpeg', .85); }
  zoom = saveZ; resize();
}
setTimeout(() => {
  makeThumbs();
  setChar(CHARS.some(c => c.id === SAVE.last) ? SAVE.last : 'mila');
  showTitle(); $('loading').hidden = true; requestAnimationFrame(frame);
  window.__salonOK = true;
}, 30);
window.__s = { proj(x, y, z) { const v = headG.localToWorld(V3(x, y, z)).project(camera); return [(v.x * .5 + .5) * innerWidth, (1 - (v.y * .5 + .5)) * innerHeight]; }, get CUR() { return CUR; }, ptr, setTool: t => { tool = t; renderTools(); }, startTool, endTool, play, setChar, get state() { return state; }, rot, applyTool, get paint() { return paint; }, set paint(v) { paint = v; } };
