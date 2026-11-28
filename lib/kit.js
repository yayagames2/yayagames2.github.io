// Shared lightweight engine for Offline Arcade games
import * as THREE from 'three';
import { EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass, FXAAShader } from './postfx.js';
export { THREE };
export const $ = id => document.getElementById(id);
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const C = h => new THREE.Color(h);
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const rnd = (a, b) => a + Math.random() * (b - a);
export const isTouch = matchMedia('(pointer:coarse)').matches;
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let lang = window.OA_LANG; if (!lang) { try { lang = localStorage.getItem('oa-lang'); } catch (e) { } if (lang !== 'he' && lang !== 'en') lang = /^he|^iw/i.test(navigator.language || '') ? 'he' : 'en'; }
// EN = "not Hebrew": every non-Hebrew language uses the English branch, translated at runtime by lib/i18n.js
export const LANG = lang, EN = lang !== 'he', RTL = lang === 'he' || lang === 'ar';
document.documentElement.lang = LANG; document.documentElement.dir = RTL ? 'rtl' : 'ltr';
export const T = (he, en) => !EN ? he : (window.OA_TR ? window.OA_TR(en) : en);

export function store(key, defaults) {
  const d = Object.assign({ q: isTouch ? 'high' : 'ultra', mute: false }, defaults);
  try { Object.assign(d, JSON.parse(localStorage.getItem(key) || '{}')); } catch (e) { }
  d.save = () => { try { const o = Object.assign({}, d); delete o.save; localStorage.setItem(key, JSON.stringify(o)); } catch (e) { } };
  return d;
}

/* ---------- engine ---------- */
export function engine(S, o = {}) {
  const q = S.q;
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!o.preserve });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = o.exposure || 1;
  renderer.shadowMap.enabled = o.shadows !== false && q !== 'low'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  (o.mount || $('stage')).appendChild(renderer.domElement);
  const scene = new THREE.Scene(); if (o.bg) scene.background = C(o.bg);
  const camera = new THREE.PerspectiveCamera(o.fov || 45, 1, .1, o.far || 200);
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: q === 'ultra' ? 4 : 0 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const b = o.bloom || [.3, .45, 1.2];
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), b[0], b[1], b[2]); bloom.enabled = q !== 'low'; composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uVig: { value: o.vignette ?? .25 }, uSat: { value: o.sat ?? 1.08 }, uFlash: { value: 0 } },
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig; uniform float uSat; uniform float uFlash; varying vec2 vUv; void main(){ vec3 c=texture2D(tDiffuse,vUv).rgb; float l=dot(c,vec3(.299,.587,.114)); c=mix(vec3(l),c,uSat); c*=1.0-smoothstep(.5,1.0,length(vUv-.5))*uVig; c+=vec3(uFlash); gl_FragColor=vec4(c,1.0);} ` });
  composer.addPass(grade);
  const fxaa = new ShaderPass(FXAAShader); composer.addPass(fxaa);
  const dpr = devicePixelRatio || 1, basePr = q === 'ultra' ? Math.min(dpr, 2) : q === 'high' ? Math.min(dpr, 1.5) : 1;
  // adaptive performance (shared across games on this device): pixel scale + lite mode
  const PK = 'oa-perf'; try { if (!localStorage.getItem('oa-perf-r2')) { localStorage.removeItem(PK); localStorage.setItem('oa-perf-r2', '1'); } } catch (e) { } let pf = { s: 1, lite: 0 }; try { Object.assign(pf, JSON.parse(localStorage.getItem(PK) || '{}')); } catch (e) { }
  if (q === 'ultra') pf = { s: 1, lite: 0 };
  let pr = Math.max(.6, basePr * pf.s); renderer.setPixelRatio(pr); composer.setPixelRatio(pr);
  const E = { renderer, scene, camera, composer, bloom, grade, fxaa, q, onResize: [] };
  E.resize = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h); fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr)); camera.aspect = w / h; camera.updateProjectionMatrix(); E.onResize.forEach(f => f(w, h)); };
  addEventListener('resize', E.resize);
  const NP = composer.passes.length;
  const savePf = () => { try { localStorage.setItem(PK, JSON.stringify(pf)); } catch (e) { } };
  const setLite = on => { pf.lite = on ? 1 : 0; bloom.enabled = !on && q !== 'low'; if (on && renderer.shadowMap.enabled) { renderer.shadowMap.enabled = false; scene.traverse(m => { if (m.material) [].concat(m.material).forEach(x => x.needsUpdate = true); }); } };
  if (pf.lite && q !== 'ultra') setLite(1);
  let last = 0, acc = 0, n = 0, good = 0, warm = 0;
  const adapt = () => {
    const t = performance.now(), dt = t - last; last = t;
    if (q === 'ultra' || document.hidden || dt <= 0 || dt > 600) return;
    warm += dt; if (warm < 2500) return; acc += dt; n++;
    if (acc < 1500 || n < 8) return;
    const fps = 1000 * n / acc; acc = 0; n = 0;
    if (fps < 45) {
      good = 0;
      if (pr > .62) { pf.s = Math.max(.6 / basePr, pf.s * .8); pr = Math.max(.6, basePr * pf.s); renderer.setPixelRatio(pr); composer.setPixelRatio(pr); E.resize(); }
      else if (!pf.lite) setLite(1);
      savePf();
    } else if (fps > 58 && pf.s < 1 && ++good >= 4) { good = 0; pf.s = Math.min(1, pf.s * 1.12); pr = Math.max(.6, basePr * pf.s); renderer.setPixelRatio(pr); composer.setPixelRatio(pr); E.resize(); savePf(); }
  };
  // lite / saver: skip the post-processing chain (4 full-screen passes) when the game added no passes of its own
  E.render = () => { if (window.__artCam) window.__artCam(camera, scene, E); adapt(); if ((pf.lite || q === 'low') && composer.passes.length === NP) renderer.render(scene, camera); else composer.render(); };
  return E;
}
export function studioEnv(E, top = '#f4fbff', bot = '#a9c2d6', mult = .35, panels = [[-6, 6, 5, 6, 4, 2.4], [7, 5, -3, 5, 5, 1.2], [0, 6.9, 0, 10, 10, .8]]) {
  const es = new THREE.Scene(); const bx = new THREE.BoxGeometry(30, 14, 30); const cols = []; const p = bx.attributes.position;
  for (let i = 0; i < p.count; i++) { const c = C(p.getY(i) > 0 ? top : bot).multiplyScalar(mult); cols.push(c.r, c.g, c.b); }
  bx.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); es.add(new THREE.Mesh(bx, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  for (const [x, y, z, w, h, i] of panels) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: C('#ffffff').multiplyScalar(i), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); }
  const pm = new THREE.PMREMGenerator(E.renderer); E.scene.environment = pm.fromScene(es, .03).texture; pm.dispose();
}
export const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: C(c), roughness: .55 }, o));
export function shadowAll(o, cast = true, recv = true) { o.traverse(m => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = recv; } }); return o; }
export const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export const ctex = (c, rx = 1, ry = 1, srgb = true) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

/* ---------- particles ---------- */
export function particles(E, max = 1500, additive = false) {
  const g = new THREE.BufferGeometry(); const P = new Float32Array(max * 3), Cc = new Float32Array(max * 3), Sz = new Float32Array(max), A = new Float32Array(max);
  for (const [n, a, k] of [['position', P, 3], ['aCol', Cc, 3], ['aSize', Sz, 1], ['aA', A, 1]]) g.setAttribute(n, new THREE.BufferAttribute(a, k).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { uPx: { value: 800 } },
    vertexShader: `attribute vec3 aCol; attribute float aSize; attribute float aA; uniform float uPx; varying vec3 vC; varying float vA; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=aSize*uPx/max(.1,-mv.z); vC=aCol; vA=aA; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 d=gl_PointCoord-.5; float r=length(d); if(r>.5) discard; gl_FragColor=vec4(vC*(1.0+0.4*smoothstep(.3,0.,length(d+.12))), smoothstep(.5,.2,r)*vA); }` });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 9; E.scene.add(pts);
  const list = [];
  E.onResize.push((w, h) => { mat.uniforms.uPx.value = h * E.renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(E.camera.fov / 2))); });
  return {
    list, pts,
    emit(p, v, c, size, life, grav = 0, alpha = 1, drag = 1) { if (list.length >= max) list.shift(); list.push({ p: p.clone(), v: v.clone(), c, size, life, max: life, grav, alpha, drag }); },
    update(dt, floor = -1e9) { let n = 0; for (let i = list.length - 1; i >= 0; i--) { const q = list[i]; q.life -= dt; if (q.life <= 0 || q.p.y < floor) { list.splice(i, 1); continue; } q.v.y -= q.grav * dt; if (q.drag !== 1) q.v.multiplyScalar(Math.pow(q.drag, dt * 60)); q.p.addScaledVector(q.v, dt); }
      for (const q of list) { P[n * 3] = q.p.x; P[n * 3 + 1] = q.p.y; P[n * 3 + 2] = q.p.z; Cc[n * 3] = q.c[0]; Cc[n * 3 + 1] = q.c[1]; Cc[n * 3 + 2] = q.c[2]; Sz[n] = q.size; A[n] = q.alpha * Math.min(1, q.life / q.max * 3); n++; }
      g.setDrawRange(0, n); for (const k of ['position', 'aCol', 'aSize', 'aA']) g.attributes[k].needsUpdate = true; },
    burst(p, n, cols, speed = 3, size = .08, life = 1.2, grav = 6) { for (let i = 0; i < n; i++) { const c = cols[Math.floor(Math.random() * cols.length)]; this.emit(p, V3(rnd(-1, 1), rnd(.3, 1.4), rnd(-1, 1)).multiplyScalar(speed), c, size * rnd(.7, 1.3), life * rnd(.7, 1.2), grav); } },
  };
}
export const CONFETTI = [[2.4, .6, 1], [.4, 1.6, 2.6], [2.6, 2.2, .4], [.5, 2.4, 1.2], [1.8, .6, 2.4]];

/* ---------- audio ---------- */
export function audio(S) {
  let AC = null, master = null, noiseBuf = null, musicBus = null; const loops = {};
  const A = {
    get ctx() { return AC; },
    ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = S.mute ? 0 : .9; master.connect(AC.destination); noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; musicBus = AC.createGain(); musicBus.gain.value = .7; musicBus.connect(master); } catch (e) { } } if (AC && AC.state === 'suspended') AC.resume(); return AC; },
    setMute(m) { S.mute = m; if (master) master.gain.value = m ? 0 : .9; },
    tone(f, d, type = 'sine', v = .1, t0 = 0, f2 = 0, bus) { const a = A.ac(); if (!a) return; const t = a.currentTime + t0, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(bus || master); o.start(t); o.stop(t + d + .05); },
    noise(d, type, f, q, v, t0 = 0, f2 = 0) { const a = A.ac(); if (!a) return; const t = a.currentTime + t0, s = a.createBufferSource(); s.buffer = noiseBuf; const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d); fl.Q.value = q; const g = a.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + d + .05); },
    loopOn(n, type, f, q, v, lfo = 0) { const a = A.ac(); if (!a || loops[n]) return; const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = a.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(v, a.currentTime + .15); s.connect(fl).connect(g).connect(master); s.start(); const ns = [s];
      if (lfo) { const o = a.createOscillator(); o.frequency.value = lfo; const og = a.createGain(); og.gain.value = f * .3; o.connect(og).connect(fl.frequency); o.start(); ns.push(o); } loops[n] = { g, ns, fl }; return loops[n]; },
    loopTone(n, type, f, v) { const a = A.ac(); if (!a || loops[n]) return; const o = a.createOscillator(); o.type = type; o.frequency.value = f; const g = a.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(v, a.currentTime + .1); o.connect(g).connect(master); o.start(); loops[n] = { g, ns: [o], osc: o }; return loops[n]; },
    loop(n) { return loops[n]; },
    loopOff(n) { const l = loops[n]; if (!l || !AC) return; delete loops[n]; l.g.gain.cancelScheduledValues(AC.currentTime); l.g.gain.setValueAtTime(l.g.gain.value, AC.currentTime); l.g.gain.linearRampToValueAtTime(0, AC.currentTime + .2); setTimeout(() => l.ns.forEach(x => { try { x.stop(); } catch (e) { } }), 300); },
    allOff() { Object.keys(loops).forEach(A.loopOff); },
    voice(kind, pitch = 1) { const a = A.ac(); if (!a) return; let tt = a.currentTime; const seq = { yay: [[1, .12], [1.3, .12], [1.6, .3]], aww: [[1.1, .2], [.8, .4]], hm: [[1, .15], [1.05, .2]], huh: [[1, .12], [1.4, .25]], grr: [[.8, .3]], wow: [[1.1, .1], [1.6, .32]] }[kind] || [[1, .2]];
      for (const [m, d] of seq) { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(200 * pitch * m, tt); o.frequency.linearRampToValueAtTime(200 * pitch * m * (kind === 'aww' ? .9 : 1.1), tt + d);
        const f1 = a.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 750 * Math.sqrt(pitch); f1.Q.value = 3; const f2 = a.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1800 * Math.sqrt(pitch); f2.Q.value = 4; const g = a.createGain();
        g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(.11, tt + .02); g.gain.exponentialRampToValueAtTime(.0001, tt + d); o.connect(f1).connect(g); o.connect(f2).connect(g); g.connect(master); o.start(tt); o.stop(tt + d + .02); tt += d * .9; } },
    // simple music: chords [[root,...]], bpm, style
    music: { on: false, t: 0, step: 0, chords: [[48, 52, 55], [53, 57, 60], [55, 59, 62], [53, 57, 60]], bpm: 104, lead: true, vol: 1 },
    startMusic(cfg) { if (!A.ac()) return; Object.assign(A.music, cfg || {}); if (A.music.on) return; A.music.on = true; A.music.t = AC.currentTime + .1; },
    stopMusic() { A.music.on = false; },
    tick() { const M = A.music; if (!AC || !M.on) return; const sp = 60 / M.bpm / 2; const mf = n => 440 * Math.pow(2, (n - 69) / 12);
      while (M.t < AC.currentTime + .25) { const s = M.step % 32, bar = Math.floor(M.step / 8) % M.chords.length, ch = M.chords[bar];
        const pl = (f, d, ty, v) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = ty; o.frequency.value = f; g.gain.setValueAtTime(0, M.t); g.gain.linearRampToValueAtTime(v * M.vol, M.t + .01); g.gain.exponentialRampToValueAtTime(.0001, M.t + d); o.connect(g).connect(musicBus); o.start(M.t); o.stop(M.t + d + .05); };
        if (s % 8 === 0) ch.forEach(n => pl(mf(n + 12), sp * 7, 'triangle', .018));
        if (s % 4 === 0 || s % 8 === 6) pl(mf(ch[0] - 12 + (s % 8 === 6 ? 7 : 0)), sp * 1.8, 'triangle', .09);
        if (M.lead && s % 2 === 0 && (s * 7 + bar) % 5 !== 0) { const n = ch[(M.step * 3 + bar) % ch.length] + 24 + ((M.step % 8) > 5 ? 2 : 0); pl(mf(n), sp * .9, 'sine', .03); }
        if (s % 4 === 2) { const b = AC.createBufferSource(); b.buffer = noiseBuf; const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = AC.createGain(); g.gain.setValueAtTime(.028 * M.vol, M.t); g.gain.exponentialRampToValueAtTime(.0001, M.t + .06); b.connect(f).connect(g).connect(musicBus); b.start(M.t, Math.random()); b.stop(M.t + .07); }
        if (M.kick && s % 8 === 0) pl(110, .18, 'sine', .12);
        M.t += sp; M.step++; } },
  };
  return A;
}

/* ---------- UI helpers ---------- */
let toastT = 0;
export function toast(s, ms = 2200) { const el = $('toast'); if (!el) return; el.textContent = s; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms); }
export const SND_ON = c => `<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="${c}"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/></svg>`;
export const SND_OFF = c => `<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="${c}"/><path d="M17 9l5 6M22 9l-5 6" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/></svg>`;
export const ICO = {
  home: c => `<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" fill="${c}"/></svg>`,
  grid: c => `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7.5" height="7.5" rx="2" fill="${c}"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill="${c}"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill="${c}"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" fill="${c}"/></svg>`,
  reset: c => `<svg viewBox="0 0 24 24"><path d="M5 12a7 7 0 1 0 2.1-5" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/><path d="M4 3.5v5h5" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  undo: c => `<svg viewBox="0 0 24 24"><path d="M9 7 4 12l5 5" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 12h10a6 6 0 0 1 0 12h-2" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" transform="translate(0 -4)"/></svg>`,
  pause: c => `<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="${c}"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="${c}"/></svg>`,
};
export function hubButtons(ids, A) { if (window.parent === window) return; const go = () => { try { A && A.ctx && A.ctx.suspend(); } catch (e) { } window.parent.postMessage('skyplay-home', '*'); };
  for (const id of ids) { const el = $(id); if (!el) continue; el.hidden = false; el.onclick = go; }
  const hud = document.querySelector('.top#hud'), src = $(ids[0]); if (hud && !$('hubHome')) { const b = document.createElement('button'); b.className = 'rb'; b.id = 'hubHome'; b.setAttribute('aria-label', 'home'); b.innerHTML = src ? src.innerHTML : ICO.home('#1c2240'); b.onclick = go; hud.prepend(b); } }
export function soundButton(id, S, A, col) { const el = $(id); const sync = () => el.innerHTML = S.mute ? SND_OFF(col) : SND_ON(col); sync(); el.onclick = () => { A.setMute(!S.mute); S.save(); sync(); }; }
export function qualityButton(id, S) { const el = $(id); if (!el) return; const QN = { ultra: T('אולטרה', 'Ultra'), high: T('גבוהה', 'High'), low: T('חסכונית', 'Saver') }; el.textContent = '✨ ' + T('גרפיקה: ', 'Graphics: ') + QN[S.q]; el.onclick = () => { S.q = { ultra: 'high', high: 'low', low: 'ultra' }[S.q]; S.save(); location.reload(); }; }
export function starsHTML(n, max = 3) { return '★'.repeat(n) + '☆'.repeat(max - n); }

/* ---------- cute character builder (shared) ---------- */
export function cutie(o = {}) {
  const g = new THREE.Group(); const hr = o.hr || .3; const skinM = new THREE.MeshPhysicalMaterial({ color: o.skin || '#f2c3a0', roughness: .55, sheen: .4, sheenColor: C(o.skin || '#f2c3a0').lerp(C('#fff'), .5) });
  const bodyM = std(o.shirt || '#5fa8ff', { roughness: .7 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.23, .32, 6, 16), bodyM); body.position.y = .6; g.add(body);
  const head = new THREE.Group(); head.position.y = 1.14; g.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(hr, 32, 24), skinM));
  if (o.hair) { const h = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.06, 28, 18, 0, Math.PI * 2, 0, Math.PI * (o.long ? .62 : .5)), std(o.hair, { roughness: .8, side: THREE.DoubleSide })); h.rotation.x = -.25; head.add(h); if (o.bun) { const b = new THREE.Mesh(new THREE.SphereGeometry(hr * .38, 16, 12), h.material); b.position.set(0, hr * 1.05, -hr * .25); head.add(b); } }
  if (o.hat) { const c = new THREE.Mesh(new THREE.CylinderGeometry(hr * .75, hr * .85, hr * .5, 24), std(o.hat, { roughness: .6 })); c.position.y = hr * .95; head.add(c); const br = new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.25, hr * 1.25, .03, 28), c.material); br.position.y = hr * .72; head.add(br); }
  if (o.cap) { const c = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.08, 24, 14, 0, Math.PI * 2, 0, Math.PI * .5), std(o.cap)); c.rotation.x = -.2; head.add(c); const v = new THREE.Mesh(new THREE.CylinderGeometry(hr * .7, hr * .7, .025, 20, 1, false, -Math.PI / 2, Math.PI), c.material); v.position.set(0, hr * .32, hr * .55); head.add(v); }
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(hr * .2, 12, 10), skinM); e.scale.set(.5, 1, .8); e.position.set(s * hr * .98, 0, 0); head.add(e); }
  const eyes = []; for (const s of [-1, 1]) { const e = new THREE.Group(); e.position.set(s * hr * .36, hr * .12, hr * .88); const w = new THREE.Mesh(new THREE.SphereGeometry(hr * .2, 20, 14), std('#ffffff', { roughness: .15 })); w.scale.set(1, 1.15, .6); e.add(w);
    const p = new THREE.Mesh(new THREE.SphereGeometry(hr * .11, 16, 12), std(o.eye || '#15131a', { roughness: .1 })); p.position.z = hr * .1; e.add(p); const h = new THREE.Mesh(new THREE.SphereGeometry(hr * .035, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); h.position.set(hr * .04, hr * .05, hr * .2); e.add(h); head.add(e); eyes.push(e); }
  if (o.glasses) { for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(hr * .26, hr * .04, 8, 24), std(o.glasses)); r.position.set(s * hr * .36, hr * .12, hr * .98); head.add(r); } }
  const brows = []; for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(hr * .04, hr * .22, 4, 8), std(o.hair || '#3a2418')); b.rotation.z = Math.PI / 2; b.position.set(s * hr * .36, hr * .44, hr * .86); head.add(b); brows.push(b); }
  if (o.beard) { const bd = new THREE.Mesh(new THREE.SphereGeometry(hr * .8, 20, 14, 0, Math.PI * 2, Math.PI * .45, Math.PI * .55), std(o.beard, { roughness: .9 })); bd.position.set(0, -hr * .13, hr * .26); head.add(bd); }
  const mDark = std('#5e1a2c', { roughness: .4 });
  const smile = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V3(-hr * .25, hr * .05, 0), V3(0, -hr * .14, 0), V3(hr * .25, hr * .05, 0)), 12, hr * .035, 6), mDark); smile.position.set(0, -hr * .34, hr * .93); head.add(smile);
  const frown = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V3(-hr * .22, -hr * .05, 0), V3(0, hr * .1, 0), V3(hr * .22, -hr * .05, 0)), 12, hr * .035, 6), mDark); frown.position.set(0, -hr * .38, hr * .93); frown.visible = false; head.add(frown);
  const open = new THREE.Mesh(new THREE.SphereGeometry(hr * .2, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mDark); open.scale.set(1.1, 1, .45); open.position.set(0, -hr * .3, hr * .9); open.visible = false; head.add(open);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(hr * .13, 16, 12), std(C(o.skin || '#f2c3a0').lerp(C('#ff8a80'), .25).getStyle())); nose.position.set(0, -hr * .06, hr * .98); head.add(nose);
  for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.CircleGeometry(hr * .14, 16), new THREE.MeshBasicMaterial({ color: '#ff7a8a', transparent: true, opacity: .35, depthWrite: false })); ch.position.set(s * hr * .58, -hr * .18, hr * .8); ch.lookAt(s * hr * 1.6, -hr * .4, hr * 2.4); head.add(ch); }
  const arms = []; for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.set(s * .26, .84, 0); const m = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .28, 4, 10), bodyM); m.position.y = -.19; a.add(m); const hd = new THREE.Mesh(new THREE.SphereGeometry(.08, 12, 10), skinM); hd.position.y = -.4; a.add(hd); a.rotation.z = s * .22; g.add(a); arms.push(a); }
  const legs = []; for (const s of [-1, 1]) { const l = new THREE.Group(); l.position.set(s * .11, .37, 0); const m = new THREE.Mesh(new THREE.CapsuleGeometry(.08, .24, 4, 10), std(o.pants || '#3b4b6b', { roughness: .8 })); m.position.y = -.16; l.add(m); const sh = new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 10), std(o.shoe || '#ffffff', { roughness: .4 })); sh.scale.set(1, .6, 1.4); sh.position.set(0, -.34, .04); l.add(sh); g.add(l); legs.push(l); }
  shadowAll(g, true, false);
  const P = { g, head, eyes, brows, smile, frown, open, arms, legs, body, mood: 'smile', ph: Math.random() * 6, jump: 0, baseY: 0 };
  P.setMood = m => { P.mood = m; smile.visible = m === 'smile'; frown.visible = m === 'sad' || m === 'angry'; open.visible = m === 'happy' || m === 'wow'; brows.forEach((b, i) => b.rotation.z = Math.PI / 2 + (m === 'angry' ? (i ? .4 : -.4) : m === 'sad' ? (i ? -.35 : .35) : 0)); };
  P.update = (t, dt) => { dt = Math.min(dt, .1); const happy = P.mood === 'happy'; if (happy) { P.jump += dt; P.g.position.y = P.baseY + Math.abs(Math.sin(P.jump * 6 + P.ph)) * .35; arms.forEach((a, i) => a.rotation.z = lerp(a.rotation.z, (i ? 1 : -1) * 2.6, dt * 10)); }
    else { P.g.position.y = lerp(P.g.position.y, P.baseY + Math.sin(t * 1.6 + P.ph) * .01, dt * 8); arms.forEach((a, i) => a.rotation.z = lerp(a.rotation.z, (i ? 1 : -1) * .22, dt * 6)); }
    for (const e of eyes) e.scale.y = Math.sin(t * 1.3 + P.ph) > .985 ? .1 : 1; };
  return P;
}
