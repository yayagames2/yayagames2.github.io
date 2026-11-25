import { THREE, $, C, V3, clamp, lerp, rnd, T, store, engine, studioEnv, ctex, particles, CONFETTI, audio, toast, ICO, hubButtons, soundButton } from '../lib/kit.js';

const S = store('case-save', { coins: 60, album: [], unl: [], ph: 0, pc: 0, made: 0, pity: 0, tut: 0, photoTip: 0 });
if (!Array.isArray(S.album)) S.album = []; if (!S.unl) S.unl = [];
const A = audio(S);
const TAU = Math.PI * 2;
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };
const hx = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgba = (c, a) => { const [r, g, b] = hx(c); return `rgba(${r},${g},${b},${a})`; };
const mixC = (a, b, t) => { const p = hx(a), q = hx(b); return '#' + p.map((v, i) => Math.round(lerp(v, q[i], t)).toString(16).padStart(2, '0')).join(''); };

/* ================= DATA ================= */
const DW = 512, DH = 1056; // design canvas (case back, seen from behind)
const PHONES = [
  { k: 'pro', n: 'Pro', W: .74, H: 1.52, R: .115, cam: { x: .05, y: .05, w: .34, h: .34, r: .09 }, lens: [[.28, .28, .062], [.28, .72, .062], [.72, .5, .062]], fl: [.74, .2] },
  { k: 'slim', n: 'Slim', W: .72, H: 1.5, R: .13, cam: { x: .06, y: .06, w: .17, h: .34, r: .085 }, lens: [[.5, .26, .058], [.5, .74, .058]], fl: null },
  { k: 'bar', n: 'Bar', W: .73, H: 1.54, R: .1, cam: { x: .045, y: .13, w: .64, h: .13, r: .065 }, lens: [[.2, .5, .045], [.42, .5, .045]], fl: [.64, .5] }];
const PCOL = [['#2a2c34', T('גרפיט', 'Graphite')], ['#e8e8ec', T('כסף', 'Silver')], ['#f0d8b8', T('זהב', 'Gold')], ['#9ac0e8', T('כחול', 'Blue')], ['#f8c8d8', T('ורוד', 'Pink')], ['#b8e8d0', T('מנטה', 'Mint')], ['#c8b0f0', T('סגול', 'Purple')], ['#d83a4a', T('אדום', 'Red')]];
const PAL = ['#ffffff', '#ffd0e8', '#ff7ac0', '#ff3a7a', '#e8203a', '#ff8a3a', '#ffd23a', '#fff2a0', '#b8f0a0', '#3ad88a', '#3ae0e0', '#8ad0ff', '#3a8aff', '#3a3ad8', '#b88aff', '#8a3ad8', '#c8a080', '#6a4030', '#8a8a9a', '#1a1a24'];
const BASES = [['solid', '🟪', T('חלק', 'Solid')], ['grad', '🌅', T('מעבר', 'Fade')], ['clear', '💧', T('שקוף', 'Clear')], ['jelly', '🍬', T('ג׳לי', 'Jelly')], ['polka', '🔵', T('נקודות', 'Dots')], ['stripe', '🦓', T('פסים', 'Stripes')], ['check', '🏁', T('משבצות', 'Checks')], ['marble', '🪨', T('שיש', 'Marble'), 40], ['tiedye', '🌀', T('טאי-דאי', 'Tie-dye'), 40], ['leopard', '🐆', T('נמר', 'Leopard'), 50]];
const BRUSH = [['pen', '🖊️', T('עט', 'Pen')], ['neon', '💡', T('ניאון', 'Neon')], ['rainbow', '🌈', T('קשת', 'Rainbow')], ['spray', '💨', T('ספריי', 'Spray')], ['gpen', '✨', T('עט נצנץ', 'Glitter pen')]];
const GLIT = [['fine', '✨', T('דק', 'Fine')], ['chunky', '🔷', T('גס', 'Chunky')], ['star', '⭐', T('כוכבים', 'Stars')], ['heart', '💗', T('לבבות', 'Hearts')]];
const GCOL = [['#e8eef8', 'silver'], ['#ffd23a', 'gold'], ['#ff8ac8', 'rose'], ['holo', 'holo'], ['#5ab0ff', 'blue'], ['#5ae8a0', 'green'], ['#b87aff', 'purple'], ['#ff4a5a', 'red'], ['#1a1a24', 'black']];
const GEMS = [['pearl', '⚪', T('פנינה', 'Pearl')], ['crystal', '💎', T('קריסטל', 'Crystal')], ['stud', '🟡', T('ניט זהב', 'Gold stud')], ['heart', '💖', T('לב', 'Heart')], ['star', '🌟', T('כוכב', 'Star')]];
const GEMC = ['#ffffff', '#ffc8e0', '#ff4aa0', '#b0d8ff', '#3a8aff', '#c8a0ff', '#8a3ad8', '#a8ffd0', '#ffd23a', '#ff3a3a'];
const PACKS = [
  { n: T('קלאסי', 'Classic'), p: 0, e: ['❤️', '⭐', '🌈', '🦄', '🌸', '🍓', '🐱', '🐶', '🦋', '🍦', '☁️', '🌙', '🎀', '🍩', '👑', '✌️'] },
  { n: T('קוואי', 'Kawaii'), p: 60, e: ['🐼', '🐰', '🐻', '🐸', '🍒', '🍉', '🧁', '🌷', '🍭', '🎈', '🪐', '🌻', '🐥', '🍑'] },
  { n: T('קוּל', 'Cool'), p: 80, e: ['😎', '🔥', '⚡', '🛹', '🎧', '🏀', '⚽', '🎮', '👾', '🚀', '💎', '🤖', '🦖', '🍕'] },
  { n: T('ים', 'Ocean'), p: 100, e: ['🐬', '🐙', '🐚', '🌊', '🐠', '🦈', '🏝️', '🦀', '🐳', '🪸', '⛵', '🌺'] }];
const SHAPES = [['full', '🖼️', T('כל המגן', 'Full')], ['circle', '⚪', T('עיגול', 'Circle')], ['heart', '❤️', T('לב', 'Heart')], ['square', '⬜', T('ריבוע', 'Square')], ['polaroid', '📸', T('פולארויד', 'Polaroid')]];
const FONTS = [['bubble', 'Aa', '900 {s}px "Arial Rounded MT Bold","Arial Black",Arial,sans-serif'], ['script', '𝒜', 'italic 700 {s}px "Brush Script MT","Segoe Script",cursive'], ['serif', '𝐀', '900 {s}px Georgia,"Times New Roman",serif'], ['mono', '𝙰', '900 {s}px "Courier New",monospace']];
const TIERS = [
  { k: 'gloss', n: T('רגיל', 'Common'), c: '#8a9aa8', w: 42, fx: T('גימור מבריק', 'Glossy finish'), coins: 10 },
  { k: 'pearl', n: T('נדיר', 'Rare'), c: '#3a9bff', w: 30, fx: T('ברק פנינה', 'Pearl shimmer'), coins: 20 },
  { k: 'holo', n: T('אפי', 'Epic'), c: '#a24bff', w: 18, fx: T('הולוגרמה צבעונית', 'Holographic'), coins: 35 },
  { k: 'glow', n: T('אגדי', 'Legendary'), c: '#ffb31a', w: 8, fx: T('זוהר בחושך + מסגרת זהב', 'Glow-in-the-dark + gold rim'), coins: 60 },
  { k: 'galaxy', n: T('מיתי', 'Mythic'), c: '#ff4ab0', w: 2.5, fx: T('גלקסיה נוצצת + כרום קשת', 'Sparkle galaxy + rainbow chrome'), coins: 100 }];
const TABS = [['base', '🎨', T('בסיס', 'Base')], ['paint', '🖌️', T('ציור', 'Paint')], ['glit', '✨', T('נצנצים', 'Glitter')], ['gem', '💎', T('אבנים', 'Gems')], ['stk', '⭐', T('מדבקות', 'Stickers')], ['photo', '📷', T('תמונה', 'Photo')], ['text', '🔤', T('טקסט', 'Text')]];

/* ================= 3D ================= */
const E = engine(S, { fov: 32, far: 60, bloom: [.35, .5, .92], exposure: 1.0, vignette: .18, sat: 1.06 });
const { scene, camera, renderer } = E; studioEnv(E, '#fff4fb', '#c8b8e8', .55);
const bgC = cnv(4, 256), bgx = bgC.getContext('2d'); function paintBg(dark) { const g = bgx.createLinearGradient(0, 0, 0, 256); if (dark) { g.addColorStop(0, '#2a1a40'); g.addColorStop(1, '#06030c'); } else { g.addColorStop(0, '#fff2fa'); g.addColorStop(.55, '#ffd8ee'); g.addColorStop(1, '#cdbaff'); } bgx.fillStyle = g; bgx.fillRect(0, 0, 4, 256); bgT.needsUpdate = true; }
const bgT = new THREE.CanvasTexture(bgC); bgT.colorSpace = THREE.SRGBColorSpace; scene.background = bgT; paintBg(false);
const hemi = new THREE.HemisphereLight('#ffffff', '#c8b0e0', .55); scene.add(hemi);
const key = new THREE.DirectionalLight('#ffffff', 1.6); key.position.set(2.5, 3, 4); scene.add(key);
const rimL = new THREE.DirectionalLight('#ffd0f0', 1.1); rimL.position.set(-3, 1, -3); scene.add(rimL);
const FX = particles(E, 900, true);
camera.position.set(0, 0, 4.2); camera.lookAt(0, 0, 0);

const rr = (s, x, y, w, h, r) => { s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
const rrShape = (w, h, r, cx = 0, cy = 0, hole = false) => rr(hole ? new THREE.Path() : new THREE.Shape(), cx - w / 2, cy - h / 2, w, h, r);
const TC = .02; // case wall thickness
// phone-space helpers (back-view coords bx,by: bx grows to the right when looking at the back)
function camRect(P, grow = 0) { const Wc = P.W, Hc = P.H, c = P.cam; return { cx: -Wc / 2 + c.x + c.w / 2, cy: Hc / 2 - c.y - c.h / 2, w: c.w + grow * 2, h: c.h + grow * 2, r: c.r + grow }; }

const world = new THREE.Group(); scene.add(world);
const spin = new THREE.Group(); world.add(spin);
let phone = null, caseG = null, twMats = [], gemMats = [], glowMat = null, finish = 'gloss', galaxyT = 0;
function makeScreenTex(col) { const c = cnv(256, 520), x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 256, 520); g.addColorStop(0, '#ff9ad0'); g.addColorStop(.5, '#a07aff'); g.addColorStop(1, '#3ac8ff'); x.fillStyle = g; x.fillRect(0, 0, 256, 520);
  for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(255,255,255,${rnd(.05, .18)})`; x.beginPath(); x.arc(rnd(0, 256), rnd(0, 520), rnd(10, 60), 0, TAU); x.fill(); }
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '200 76px Arial'; x.fillText('12:30', 128, 150); x.font = '600 18px Arial'; x.fillText('CASE CRAFT', 128, 182); x.fillStyle = 'rgba(0,0,0,.85)'; x.beginPath(); x.roundRect(98, 18, 60, 18, 9); x.fill(); const t = ctex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; }
const screenTex = makeScreenTex();
function buildPhone(P, colHex) { if (phone) spin.remove(phone); const g = new THREE.Group(); const D = .085, b = .012;
  const shp = rrShape(P.W - b * 2, P.H - b * 2, P.R - b); const geo = new THREE.ExtrudeGeometry(shp, { depth: D - b * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 18 }); geo.translate(0, 0, -(D - b * 2) / 2);
  const glass = new THREE.MeshPhysicalMaterial({ color: C(colHex), roughness: .32, clearcoat: 1, clearcoatRoughness: .1, metalness: .1 }), frame = new THREE.MeshPhysicalMaterial({ color: C(colHex).lerp(C('#ffffff'), .1), metalness: .9, roughness: .22 });
  g.add(new THREE.Mesh(geo, [glass, frame]));
  const scr = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(P.W - .03, P.H - .03, P.R - .015), 18), new THREE.MeshPhysicalMaterial({ map: screenTex, emissiveMap: screenTex, emissive: C('#ffffff'), emissiveIntensity: .55, roughness: .08, clearcoat: 1 }));
  { const pos = scr.geometry.attributes.position, uv = scr.geometry.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + P.W / 2) / P.W, (pos.getY(i) + P.H / 2) / P.H); }
  scr.position.z = D / 2 + .0015; g.add(scr);
  // camera module (phone space: x = -bx)
  const cr = camRect(P); const mod = new THREE.Group(); mod.position.set(-cr.cx, cr.cy, -D / 2); g.add(mod);
  const modG = new THREE.ExtrudeGeometry(rrShape(cr.w, cr.h, cr.r), { depth: .03, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 2, curveSegments: 14 }); modG.rotateY(Math.PI);
  mod.add(new THREE.Mesh(modG, new THREE.MeshPhysicalMaterial({ color: C(colHex).lerp(C('#000000'), .15), roughness: .25, clearcoat: 1, metalness: .2 })));
  const ringM = new THREE.MeshPhysicalMaterial({ color: '#c8ccd4', metalness: 1, roughness: .2 }), lensM = new THREE.MeshPhysicalMaterial({ color: '#05060a', roughness: .05, clearcoat: 1, iridescence: .6, iridescenceIOR: 1.8 });
  for (const [u, v, r] of P.lens) { const lx = -(-cr.w / 2 + u * P.cam.w), ly = cr.h / 2 - v * P.cam.h; const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .028, 32), ringM); ring.rotation.x = Math.PI / 2; ring.position.set(lx, ly, -.046); mod.add(ring);
    const l = new THREE.Mesh(new THREE.CircleGeometry(r * .78, 32), lensM); l.rotation.y = Math.PI; l.position.set(lx, ly, -.0605); mod.add(l); }
  if (P.fl) { const f = new THREE.Mesh(new THREE.CircleGeometry(.022, 20), new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: C('#fff0c8'), emissiveIntensity: .3 })); f.rotation.y = Math.PI; f.position.set(-(-cr.w / 2 + P.fl[0] * P.cam.w), cr.h / 2 - P.fl[1] * P.cam.h, -.0375); mod.add(f); }
  phone = g; spin.add(g); return g; }

// case geometry; tex = design canvas (DW x DH)
function uvFromBack(geo, Wc, Hc) { const pos = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + Wc / 2) / Wc, (pos.getY(i) + Hc / 2) / Hc); uv.needsUpdate = true; }
function backShape(P) { const Wc = P.W + TC * 2, Hc = P.H + TC * 2; const s = rrShape(Wc, Hc, P.R + TC); const cr = camRect(P, .016); s.holes.push(rrShape(cr.w, cr.h, cr.r, cr.cx, cr.cy, true)); return { s, Wc, Hc }; }
function buildCase(P, spec, tex, tw, tier) { if (caseG) spin.remove(caseG); const g = new THREE.Group(); const D = .085, back = D / 2 + .004, BT = .016; const { s, Wc, Hc } = backShape(P);
  const clear = spec.base.t === 'clear', jelly = spec.base.t === 'jelly'; finish = TIERS[tier].k;
  const map = new THREE.CanvasTexture(tex); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const dm = new THREE.MeshPhysicalMaterial({ map, transparent: clear || jelly, roughness: .3, clearcoat: 1, clearcoatRoughness: .05, side: THREE.FrontSide });
  if (finish === 'pearl') { dm.sheen = 1; dm.sheenColor = C('#ffe0f4'); dm.sheenRoughness = .35; dm.iridescence = .35; dm.iridescenceIOR = 1.4; }
  if (finish === 'holo' || finish === 'galaxy') { dm.iridescence = 1; dm.iridescenceIOR = 1.9; dm.iridescenceThicknessRange = [120, 900]; dm.roughness = .18; }
  if (finish === 'glow' || finish === 'galaxy') { dm.emissiveMap = map; dm.emissive = C('#ffffff'); dm.emissiveIntensity = .0; glowMat = dm; } else glowMat = null;
  const geo = new THREE.ExtrudeGeometry(s, { depth: BT, bevelEnabled: true, bevelThickness: .005, bevelSize: .005, bevelSegments: 2, curveSegments: 20 }); uvFromBack(geo, Wc, Hc); geo.rotateY(Math.PI); geo.translate(0, 0, -back);
  const c1 = spec.base.c1 || '#ffffff';
  const rim = new THREE.MeshPhysicalMaterial({ color: C(clear ? '#ffffff' : c1), roughness: .25, clearcoat: 1, transparent: clear || jelly, opacity: clear ? .28 : jelly ? .7 : 1 });
  if (finish === 'glow') { rim.color.set('#ffcf5a'); rim.metalness = 1; rim.roughness = .16; rim.transparent = false; rim.opacity = 1; }
  if (finish === 'galaxy') { rim.color.set('#f0f0ff'); rim.metalness = 1; rim.roughness = .1; rim.iridescence = 1; rim.iridescenceIOR = 2.2; rim.iridescenceThicknessRange = [200, 1100]; rim.transparent = false; rim.opacity = 1; }
  if (finish === 'holo') { rim.iridescence = 1; rim.iridescenceIOR = 1.8; }
  const bm = new THREE.Mesh(geo, [dm, rim]); bm.renderOrder = 2; g.add(bm);
  // inner (phone-facing) cap is also textured: hide inner by using a plain inner plate only for opaque bases
  // side walls ring
  const ring = rrShape(Wc, Hc, P.R + TC); ring.holes.push(rrShape(P.W + .004, P.H + .004, P.R + .002, 0, 0, true));
  const depth = D + .004 + .014; const rg = new THREE.ExtrudeGeometry(ring, { depth, bevelEnabled: true, bevelThickness: .004, bevelSize: .003, bevelSegments: 2, curveSegments: 20 }); rg.translate(0, 0, -back);
  const rm = new THREE.Mesh(rg, rim); rm.renderOrder = 3; g.add(rm);
  // glitter twinkle overlays (3 phases)
  twMats = []; const sg = new THREE.ShapeGeometry(s, 20); uvFromBack(sg, Wc, Hc); sg.rotateY(Math.PI);
  tw.forEach((tc, k) => { const t = new THREE.CanvasTexture(tc); const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: .5 }); const pl = new THREE.Mesh(sg, m); pl.position.z = -back - BT - .0062 - k * .0004; pl.renderOrder = 5; g.add(pl); twMats.push({ m, ph: k * 2.1 + rnd(0, 1) }); });
  // 3D gems
  gemMats = []; for (const it of spec.items) if (it.k === 'gem') g.add(gemMesh(it, Wc, Hc, -back - BT - .006));
  caseG = g; spin.add(g); return g; }
const gemGeo = {}; function gGeo(t) { if (gemGeo[t]) return gemGeo[t];
  let geo; if (t === 'pearl') { geo = new THREE.SphereGeometry(1, 24, 12, 0, TAU, 0, Math.PI / 2); geo.rotateX(-Math.PI / 2); geo.scale(1, 1, .8); }
  else if (t === 'crystal') { geo = new THREE.CylinderGeometry(.62, 1, .6, 8, 1); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, -.3); geo = geo.toNonIndexed(); geo.computeVertexNormals(); }
  else if (t === 'stud') { geo = new THREE.SphereGeometry(1, 20, 10, 0, TAU, 0, Math.PI / 2); geo.rotateX(-Math.PI / 2); geo.scale(1, 1, .45); }
  else { const s = new THREE.Shape(); if (t === 'heart') { s.moveTo(0, -.9); s.bezierCurveTo(-1.2, -.1, -1, .9, 0, .45); s.bezierCurveTo(1, .9, 1.2, -.1, 0, -.9); } else { for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + Math.PI / 2, r = i % 2 ? .45 : 1; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); }
    geo = new THREE.ExtrudeGeometry(s, { depth: .25, bevelEnabled: true, bevelThickness: .18, bevelSize: .12, bevelSegments: 3 }); geo.rotateY(Math.PI); geo.translate(0, 0, -.18); }
  return gemGeo[t] = geo; }
function gemMesh(it, Wc, Hc, z) { const t = it.t; const col = C(t === 'stud' ? '#ffcf5a' : it.c);
  const m = t === 'pearl' ? new THREE.MeshPhysicalMaterial({ color: col, roughness: .18, sheen: 1, sheenColor: C('#ffe8f4'), clearcoat: 1, iridescence: .5, iridescenceIOR: 1.3 })
    : t === 'stud' ? new THREE.MeshPhysicalMaterial({ color: col, metalness: 1, roughness: .15 })
    : new THREE.MeshPhysicalMaterial({ color: col, roughness: .02, metalness: .15, clearcoat: 1, iridescence: .7, iridescenceIOR: 2.1, emissive: col, emissiveIntensity: .06 });
  const me = new THREE.Mesh(gGeo(t), m); const r = it.s / DW * Wc * .5; me.scale.setScalar(r); const bx = -Wc / 2 + it.x / DW * Wc, by = Hc / 2 - it.y / DH * Hc;
  me.position.set(-bx, by, z); if (t === 'heart' || t === 'star') me.rotation.z = (it.r || 0); gemMats.push(m); return me; }

/* ================= DESIGN STATE ================= */
let P = PHONES[S.ph] || PHONES[0], pcol = S.pc || 0;
let D = null; // { base:{t,c1,c2}, items:[] }
const newDesign = () => ({ base: { t: 'solid', c1: '#ffd0e8', c2: '#b88aff' }, items: [] });
let tab = 'base', baseSlot = 1, brush = 'pen', bCol = '#ff3a7a', bSize = 14, gType = 'fine', gCol = '#e8eef8', gemT = 'pearl', gemC = '#ffffff', gemS = 34, stkPack = 0, stkE = '❤️', fontK = 'bubble', txtCol = '#ffffff', photoShape = 'circle', sel = null;
const work = cnv(DW, DH), wx = work.getContext('2d'); const under = cnv(DW, DH), ux = under.getContext('2d');
let mask = null, maskFor = null;
function caseMask() { if (maskFor === P) return mask; const c = cnv(DW, DH), x = c.getContext('2d'); const Wc = P.W + TC * 2, Hc = P.H + TC * 2, sx = DW / Wc, sy = DH / Hc;
  x.fillStyle = '#000'; x.beginPath(); x.roundRect(0, 0, DW, DH, (P.R + TC) * sx); x.fill(); const cr = camRect(P, .016); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.roundRect((cr.cx - cr.w / 2 + Wc / 2) * sx, (Hc / 2 - cr.cy - cr.h / 2) * sy, cr.w * sx, cr.h * sy, cr.r * sx); x.fill(); mask = c; maskFor = P; return c; }
const cr2px = () => { const Wc = P.W + TC * 2, Hc = P.H + TC * 2, sx = DW / Wc, sy = DH / Hc, cr = camRect(P, .016); return { x: (cr.cx - cr.w / 2 + Wc / 2) * sx, y: (Hc / 2 - cr.cy - cr.h / 2) * sy, w: cr.w * sx, h: cr.h * sy, r: cr.r * sx }; };

/* ---------- base patterns ---------- */
function rngS(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function drawBase(x, b) { const { t, c1, c2 } = b; x.clearRect(0, 0, DW, DH);
  if (t === 'clear') { x.fillStyle = 'rgba(255,255,255,.14)'; x.fillRect(0, 0, DW, DH); return; }
  if (t === 'jelly') { const g = x.createLinearGradient(0, 0, DW, DH); g.addColorStop(0, rgba(c1, .62)); g.addColorStop(1, rgba(mixC(c1, '#ffffff', .3), .5)); x.fillStyle = g; x.fillRect(0, 0, DW, DH); return; }
  if (t === 'grad') { const g = x.createLinearGradient(0, 0, 0, DH); g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.fillRect(0, 0, DW, DH); return; }
  x.fillStyle = c1; x.fillRect(0, 0, DW, DH); const r = rngS(77);
  if (t === 'polka') { x.fillStyle = c2; for (let j = 0; j < 22; j++) for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(i * 64 + (j % 2) * 32, j * 52, 13, 0, TAU); x.fill(); } }
  else if (t === 'stripe') { x.fillStyle = c2; x.save(); x.translate(DW / 2, DH / 2); x.rotate(-.5); for (let i = -20; i < 20; i++) x.fillRect(i * 56, -900, 26, 1800); x.restore(); }
  else if (t === 'check') { x.fillStyle = c2; for (let j = 0; j < 17; j++) for (let i = 0; i < 9; i++) if ((i + j) % 2) x.fillRect(i * 64, j * 64, 64, 64); }
  else if (t === 'marble') { x.lineCap = 'round'; for (let k = 0; k < 14; k++) { x.strokeStyle = rgba(c2, .25 + r() * .5); x.lineWidth = 2 + r() * 9; x.beginPath(); let px = r() * DW, py = -20; x.moveTo(px, py); while (py < DH + 20) { px += (r() - .5) * 90; py += 30 + r() * 60; x.lineTo(px, py); } x.stroke(); } }
  else if (t === 'tiedye') { const cols = [c1, c2, mixC(c2, '#ffffff', .5), mixC(c1, c2, .5)]; for (let i = 26; i > 0; i--) { x.fillStyle = cols[i % 4]; x.beginPath(); for (let a = 0; a <= 64; a++) { const an = a / 64 * TAU, rr2 = i * 26 * (1 + .12 * Math.sin(an * 5 + i * .6)); const px = DW / 2 + Math.cos(an) * rr2, py = DH * .55 + Math.sin(an) * rr2; a ? x.lineTo(px, py) : x.moveTo(px, py); } x.fill(); } }
  else if (t === 'leopard') { for (let i = 0; i < 90; i++) { const px = r() * DW, py = r() * DH, s = 10 + r() * 16; x.fillStyle = c2; x.beginPath(); x.ellipse(px, py, s, s * .75, r() * 3, 0, TAU); x.fill(); x.fillStyle = c1; x.beginPath(); x.ellipse(px + 2, py + 1, s * .5, s * .35, r() * 3, 0, TAU); x.fill(); x.strokeStyle = '#1a1210'; x.lineWidth = 4; x.beginPath(); x.ellipse(px, py, s, s * .75, r() * 3, .3, 2.6); x.stroke(); } } }

/* ---------- glitter flakes ---------- */
function flakeCol(it, f) { return it.c === 'holo' ? `hsl(${f[4]},95%,70%)` : it.c; }
function drawFlake(x, sh, px, py, s, rot, col, hi) { x.save(); x.translate(px, py); x.rotate(rot); x.fillStyle = col;
  if (sh === 'fine') { x.beginPath(); x.arc(0, 0, s, 0, TAU); x.fill(); }
  else if (sh === 'chunky') { x.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; i ? x.lineTo(Math.cos(a) * s, Math.sin(a) * s) : x.moveTo(Math.cos(a) * s, Math.sin(a) * s); } x.fill(); }
  else if (sh === 'star') { x.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? s * .42 : s; i ? x.lineTo(Math.cos(a) * r, Math.sin(a) * r) : x.moveTo(Math.cos(a) * r, Math.sin(a) * r); } x.fill(); }
  else { x.beginPath(); x.moveTo(0, s * .9); x.bezierCurveTo(-s * 1.3, 0, -s * .7, -s * 1.1, 0, -s * .4); x.bezierCurveTo(s * .7, -s * 1.1, s * 1.3, 0, 0, s * .9); x.fill(); }
  if (hi) { x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.arc(-s * .25, -s * .25, Math.max(.7, s * .3), 0, TAU); x.fill(); } x.restore(); }
function makeFlakes(px, py, rad, n, sh) { const out = []; for (let i = 0; i < n; i++) { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * rad; const s = sh === 'fine' ? rnd(1.4, 2.8) : sh === 'chunky' ? rnd(3.5, 7) : rnd(6, 11); out.push([Math.round(px + Math.cos(a) * d), Math.round(py + Math.sin(a) * d), +s.toFixed(1), +rnd(0, 6).toFixed(2), Math.floor(rnd(0, 360))]); } return out; }

/* ---------- emoji sticker cache (die-cut) ---------- */
const stkC = {}; function stkCanvas(e) { if (stkC[e]) return stkC[e]; const S2 = 160, c = cnv(S2, S2), x = c.getContext('2d'); const t = cnv(S2, S2), tx = t.getContext('2d'); tx.font = '112px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; tx.textAlign = 'center'; tx.textBaseline = 'middle'; tx.fillText(e, S2 / 2, S2 / 2 + 6);
  const w = cnv(S2, S2), wxx = w.getContext('2d'); wxx.drawImage(t, 0, 0); wxx.globalCompositeOperation = 'source-in'; wxx.fillStyle = '#fff'; wxx.fillRect(0, 0, S2, S2);
  x.shadowColor = 'rgba(80,20,90,.35)'; x.shadowBlur = 6; x.shadowOffsetY = 3; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; x.drawImage(w, Math.cos(a) * 7, Math.sin(a) * 7); } x.shadowColor = 'transparent'; x.drawImage(t, 0, 0); return stkC[e] = c; }

/* ---------- item drawing ---------- */
function heartPath(x, s) { x.beginPath(); x.moveTo(0, s * .42); x.bezierCurveTo(-s * .62, 0, -s * .5, -s * .52, 0, -s * .2); x.bezierCurveTo(s * .5, -s * .52, s * .62, 0, 0, s * .42); x.closePath(); }
function photoDims(it) { const im = it.img; const ar = im ? im.height / im.width : 1; return it.shape === 'full' ? { w: it.s, h: it.s * ar } : it.shape === 'polaroid' ? { w: it.s, h: it.s * 1.18 } : { w: it.s, h: it.s }; }
function textW(it) { wx.font = FONTS.find(f => f[0] === it.font)[2].replace('{s}', it.s); return wx.measureText(it.txt).width + it.s * .3; }
function drawItem(x, it, tw) {
  if (it.k === 'paint') { const p = it.pts; if (!p.length) return; x.save(); x.lineCap = x.lineJoin = 'round';
    if (it.b === 'spray') { x.fillStyle = it.c; for (const d of it.dots) { x.globalAlpha = d[3]; x.beginPath(); x.arc(d[0], d[1], d[2], 0, TAU); x.fill(); } x.restore(); return; }
    const path = () => { x.beginPath(); x.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length - 1; i++) { const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2; x.quadraticCurveTo(p[i][0], p[i][1], mx, my); } const l = p[p.length - 1]; x.lineTo(l[0] + .01, l[1]); };
    if (it.b === 'rainbow') { x.lineWidth = it.s; for (let i = 1; i < p.length; i++) { x.strokeStyle = `hsl(${(it.h0 + i * 7) % 360},95%,62%)`; x.beginPath(); x.moveTo(p[i - 1][0], p[i - 1][1]); x.lineTo(p[i][0], p[i][1]); x.stroke(); } }
    else if (it.b === 'neon') { x.shadowColor = it.c; x.shadowBlur = it.s * 1.4; x.strokeStyle = it.c; x.lineWidth = it.s; path(); x.stroke(); x.shadowBlur = 0; x.strokeStyle = mixC(it.c, '#ffffff', .75); x.lineWidth = it.s * .38; path(); x.stroke(); }
    else { x.strokeStyle = it.c; x.lineWidth = it.s; path(); x.stroke(); if (it.b === 'gpen') { x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = it.s * .3; path(); x.stroke(); for (const f of it.fl) { drawFlake(x, 'fine', f[0], f[1], f[2], 0, mixC(it.c, '#ffffff', .6), true); if (tw) drawFlake(tw[f[4] % 3], 'fine', f[0], f[1], f[2] * 1.1, 0, '#fff8e8', false); } } }
    x.restore(); return; }
  if (it.k === 'glit') { for (const f of it.fl) { drawFlake(x, it.sh, f[0], f[1], f[2], f[3], flakeCol(it, f), true); if (tw) drawFlake(tw[f[4] % 3], it.sh, f[0], f[1], f[2], f[3], it.c === '#1a1a24' ? '#8888aa' : '#ffffff', false); } return; }
  if (it.k === 'gem') { x.save(); x.translate(it.x, it.y); x.rotate(it.r || 0); const s = it.s / 2, c = it.t === 'stud' ? '#ffcf5a' : it.c;
    x.shadowColor = 'rgba(60,20,60,.35)'; x.shadowBlur = 5; x.shadowOffsetY = 3;
    if (it.t === 'heart') heartPath(x, s * 2.1); else if (it.t === 'star') { x.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? s * .48 : s * 1.05; i ? x.lineTo(Math.cos(a) * r, Math.sin(a) * r) : x.moveTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); }
    else if (it.t === 'crystal') { x.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; i ? x.lineTo(Math.cos(a) * s, Math.sin(a) * s) : x.moveTo(Math.cos(a) * s, Math.sin(a) * s); } x.closePath(); } else { x.beginPath(); x.arc(0, 0, s, 0, TAU); }
    const g = x.createRadialGradient(-s * .35, -s * .4, s * .1, 0, 0, s * 1.1); g.addColorStop(0, '#ffffff'); g.addColorStop(.35, mixC(c, '#ffffff', .4)); g.addColorStop(1, mixC(c, '#000000', it.t === 'pearl' ? .12 : .35)); x.fillStyle = g; x.fill(); x.shadowColor = 'transparent';
    if (it.t === 'crystal') { x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1.2; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * s, Math.sin(a) * s); x.stroke(); } }
    x.restore(); return; }
  if (it.k === 'stk') { x.save(); x.translate(it.x, it.y); x.rotate(it.r); x.drawImage(stkCanvas(it.e), -it.s / 2, -it.s / 2, it.s, it.s); x.restore(); return; }
  if (it.k === 'photo') { const im = it.img; if (!im) return; const { w, h } = photoDims(it); x.save(); x.translate(it.x, it.y); x.rotate(it.r);
    if (it.shape === 'polaroid') { x.shadowColor = 'rgba(60,20,60,.35)'; x.shadowBlur = 10; x.shadowOffsetY = 4; x.fillStyle = '#fffdf6'; x.fillRect(-w / 2, -h / 2, w, h); x.shadowColor = 'transparent'; const iw = w * .86; x.beginPath(); x.rect(-iw / 2, -h / 2 + w * .07, iw, iw); x.clip(); const sc = Math.max(iw / im.width, iw / im.height); x.drawImage(im, -im.width * sc / 2, -h / 2 + w * .07 + iw / 2 - im.height * sc / 2, im.width * sc, im.height * sc); x.restore(); return; }
    x.beginPath(); if (it.shape === 'circle') x.arc(0, 0, w / 2, 0, TAU); else if (it.shape === 'heart') heartPath(x, w * 1.15); else if (it.shape === 'square') x.roundRect(-w / 2, -h / 2, w, h, w * .08); else x.rect(-w / 2, -h / 2, w, h);
    x.clip(); const sc = Math.max(w / im.width, h / im.height); x.drawImage(im, -im.width * sc / 2, -im.height * sc / 2, im.width * sc, im.height * sc); x.restore();
    if (it.shape === 'circle' || it.shape === 'heart' || it.shape === 'square') { x.save(); x.translate(it.x, it.y); x.rotate(it.r); x.strokeStyle = '#fff'; x.lineWidth = w * .035; x.beginPath(); if (it.shape === 'circle') x.arc(0, 0, w / 2, 0, TAU); else if (it.shape === 'heart') heartPath(x, w * 1.15); else x.roundRect(-w / 2, -h / 2, w, h, w * .08); x.stroke(); x.restore(); } return; }
  if (it.k === 'text') { x.save(); x.translate(it.x, it.y); x.rotate(it.r); x.font = FONTS.find(f => f[0] === it.font)[2].replace('{s}', it.s); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.strokeStyle = it.c === '#ffffff' ? 'rgba(90,30,110,.85)' : '#ffffff'; x.lineWidth = it.s * .2; x.strokeText(it.txt, 0, 0); x.fillStyle = it.c; x.fillText(it.txt, 0, 0); x.restore(); }
}
function gemTw(tw, it) { const k = Math.floor(it.x * 7 + it.y) % 3; const x = tw[k]; const s = it.s / 2; const g = x.createRadialGradient(it.x - s * .3, it.y - s * .3, 0, it.x - s * .3, it.y - s * .3, s * .6); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(it.x - s, it.y - s, s * 2, s * 2); }

/* ---------- composite ---------- */
function rebuildUnder() { drawBase(ux, D.base); for (const it of D.items) if (it !== sel) drawItem(ux, it); }
function compose(x, extra) { x.clearRect(0, 0, DW, DH); x.globalCompositeOperation = 'source-over'; x.drawImage(under, 0, 0); if (sel) drawItem(x, sel); if (extra) drawItem(x, extra); x.globalCompositeOperation = 'destination-in'; x.drawImage(caseMask(), 0, 0); x.globalCompositeOperation = 'source-over'; }
function finalTextures() { const tex = cnv(DW, DH), tx = tex.getContext('2d'); const tw = [0, 1, 2].map(() => cnv(DW / 2, DH / 2)); const twx = tw.map(c => { const x = c.getContext('2d'); x.scale(.5, .5); return x; });
  drawBase(tx, D.base); for (const it of D.items) { drawItem(tx, it, twx); if (it.k === 'gem') gemTw(twx, it); } tx.globalCompositeOperation = 'destination-in'; tx.drawImage(caseMask(), 0, 0);
  for (const x of twx) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-in'; x.drawImage(caseMask(), 0, 0, DW / 2, DH / 2); }
  return { tex, tw }; }

/* ================= EDITOR VIEW ================= */
const ed = $('ed'), ex = ed.getContext('2d'); let EW = 0, EH = 0, dpr = 1, view = { x: 0, y: 0, s: 1 }, dirty = true, active = null;
function layoutEd() { dpr = Math.min(devicePixelRatio || 1, 2); EW = innerWidth; EH = innerHeight; ed.width = Math.round(EW * dpr); ed.height = Math.round(EH * dpr); ed.style.width = EW + 'px'; ed.style.height = EH + 'px';
  const land = EW > EH && EH < 560, pw = land ? $('panel').offsetWidth : 0; const top = land ? 58 : 64, bot = land ? EH - 10 : EH - ($('panel').hidden ? 0 : $('panel').offsetHeight) - 12; const aw = EW - pw; const h = Math.max(120, bot - top), s = Math.min(h / DH, (aw - 40) / DW); view = { s, x: aw / 2 - DW * s / 2, y: top + (h - DH * s) / 2 }; dirty = true; }
function drawEd() { if (!dirty) return; dirty = false; compose(wx, active); const x = ex; x.setTransform(dpr, 0, 0, dpr, 0, 0); { const g = x.createRadialGradient(EW / 2, EH * .3, 10, EW / 2, EH * .4, Math.max(EW, EH)); g.addColorStop(0, '#fff6fc'); g.addColorStop(.6, '#ffdcef'); g.addColorStop(1, '#d6c6ff'); x.fillStyle = g; x.fillRect(0, 0, EW, EH); x.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 40; i++) { x.beginPath(); x.arc((i * 97) % EW, (i * 61 + 40) % EH, 2 + i % 3, 0, TAU); x.fill(); } }
  const { x: ox, y: oy, s } = view, w = DW * s, h = DH * s, Wc = P.W + TC * 2; const rad = (P.R + TC) * DW / Wc * s;
  x.save(); x.shadowColor = 'rgba(90,30,120,.35)'; x.shadowBlur = 26; x.shadowOffsetY = 12; x.fillStyle = PCOL[pcol][0]; x.beginPath(); x.roundRect(ox + 4 * s, oy + 4 * s, w - 8 * s, h - 8 * s, rad); x.fill(); x.restore();
  // checker hint for clear parts
  x.drawImage(work, ox, oy, w, h);
  x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 2; x.beginPath(); x.roundRect(ox, oy, w, h, rad); x.stroke();
  // camera module preview
  const c = cr2px(); x.fillStyle = mixC(PCOL[pcol][0], '#000000', .25); x.beginPath(); x.roundRect(ox + (c.x + 8) * s, oy + (c.y + 8) * s, (c.w - 16) * s, (c.h - 16) * s, c.r * s * .8); x.fill();
  for (const [u, v, r] of P.lens) { const Wc2 = DW / Wc; const lx = ox + (c.x + 8 + u * (c.w - 16)) * s, ly = oy + (c.y + 8 + v * (c.h - 16)) * s, lr = r * Wc2 * s; x.fillStyle = '#c8ccd4'; x.beginPath(); x.arc(lx, ly, lr, 0, TAU); x.fill(); x.fillStyle = '#0a0c14'; x.beginPath(); x.arc(lx, ly, lr * .76, 0, TAU); x.fill(); x.fillStyle = 'rgba(120,140,255,.5)'; x.beginPath(); x.arc(lx - lr * .25, ly - lr * .25, lr * .2, 0, TAU); x.fill(); }
  if (sel && ['stk', 'photo', 'text'].includes(sel.k)) { const b = bbox(sel); x.save(); x.translate(ox + sel.x * s, oy + sel.y * s); x.rotate(sel.r); x.setLineDash([7, 5]); x.strokeStyle = '#c84aff'; x.lineWidth = 2.5; x.strokeRect(-b.w * s / 2 - 6, -b.h * s / 2 - 6, b.w * s + 12, b.h * s + 12); x.setLineDash([]); x.fillStyle = '#fff'; x.strokeStyle = '#c84aff';
    for (const [qx, qy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { x.beginPath(); x.arc(qx * (b.w * s / 2 + 6), qy * (b.h * s / 2 + 6), 6, 0, TAU); x.fill(); x.stroke(); } x.restore(); } }
function bbox(it) { if (it.k === 'stk') return { w: it.s * .9, h: it.s * .9 }; if (it.k === 'photo') return photoDims(it); if (it.k === 'text') return { w: textW(it), h: it.s * 1.15 }; return { w: it.s, h: it.s }; }
const toD = (cx, cy) => [(cx - view.x) / view.s, (cy - view.y) / view.s];
function hitItem(px, py) { for (let i = D.items.length - 1; i >= 0; i--) { const it = D.items[i]; if (!['stk', 'photo', 'text'].includes(it.k)) continue; const b = bbox(it); const dx = px - it.x, dy = py - it.y, c = Math.cos(-it.r), s2 = Math.sin(-it.r); const lx = dx * c - dy * s2, ly = dx * s2 + dy * c; if (Math.abs(lx) < b.w / 2 + 12 && Math.abs(ly) < b.h / 2 + 12) return it; } return null; }
function select(it) { if (it && it !== sel) { D.items.splice(D.items.indexOf(it), 1); D.items.push(it); } sel = it; rebuildUnder(); dirty = true; if (tab === 'stk' || tab === 'photo' || tab === 'text') renderOpts(); }

const ptr = new Map(); let pinch = null, stroke = null, lastSpray = 0;
ed.addEventListener('pointerdown', e => { A.ac(); ed.setPointerCapture(e.pointerId); const [px, py] = toD(e.clientX, e.clientY); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptr.size === 2 && sel && ['stk', 'photo', 'text'].includes(sel.k)) { const [a, b] = [...ptr.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), a: Math.atan2(b.y - a.y, b.x - a.x), s: sel.s, r: sel.r }; stroke = null; active = null; return; }
  if (ptr.size > 1) return;
  if (['paint', 'glit', 'gem'].includes(tab)) { if (sel) { sel = null; rebuildUnder(); }
    if (tab === 'paint') { active = { k: 'paint', b: brush, c: bCol, s: bSize, pts: [[px, py]], dots: [], fl: [], h0: Math.floor(rnd(0, 360)) }; if (brush === 'spray') sprayAt(active, px, py); A.noise(.06, 'bandpass', 3000, 2, .03); }
    else if (tab === 'glit') { active = { k: 'glit', sh: gType, c: gCol, fl: [] }; sprinkle(active, px, py); }
    else { active = { k: 'gem', t: gemT, c: gemC, s: gemS, x: px, y: py, r: rnd(-.3, .3) }; gemClick(); }
    stroke = { lx: px, ly: py }; dirty = true; return; }
  const hit = hitItem(px, py); if (hit) { select(hit); stroke = { drag: true, ox: px - hit.x, oy: py - hit.y }; A.tone(700, .05, 'triangle', .05); return; }
  if (tab === 'stk') { if (!stkOk()) { toast(T('הערכה הזו נעולה – פתחו אותה למטה 🔒', 'This pack is locked – unlock it below 🔒')); return; } const it = { k: 'stk', e: stkE, x: px, y: py, s: 120, r: rnd(-.25, .25) }; D.items.push(it); select(it); stroke = { drag: true, ox: 0, oy: 0 }; A.tone(880, .08, 'triangle', .06); A.tone(1320, .1, 'triangle', .05, .06); buzz(8); return; }
  if (sel) { sel = null; rebuildUnder(); dirty = true; renderOpts(); } });
ed.addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; ptr.get(e.pointerId).x = e.clientX; ptr.get(e.pointerId).y = e.clientY; const [px, py] = toD(e.clientX, e.clientY);
  if (pinch && ptr.size >= 2 && sel) { const [a, b] = [...ptr.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), an = Math.atan2(b.y - a.y, b.x - a.x); sel.s = clamp(pinch.s * d / pinch.d, 24, sel.k === 'photo' ? 1400 : 600); sel.r = pinch.r + an - pinch.a; dirty = true; return; }
  if (!stroke) return;
  if (stroke.drag && sel) { sel.x = px - stroke.ox; sel.y = py - stroke.oy; dirty = true; return; }
  if (!active) return; const dd = Math.hypot(px - stroke.lx, py - stroke.ly);
  if (active.k === 'paint') { if (dd < 3) return; active.pts.push([px, py]); if (active.b === 'spray') sprayAt(active, px, py); if (active.b === 'gpen' && Math.random() < .8) active.fl.push(...makeFlakes(px, py, active.s * .5, 2, 'fine')); stroke.lx = px; stroke.ly = py; dirty = true; }
  else if (active.k === 'glit') { if (dd < 8) return; sprinkle(active, px, py); stroke.lx = px; stroke.ly = py; dirty = true; }
  else if (active.k === 'gem') { if (dd < active.s * 1.05) return; commit(); active = { k: 'gem', t: gemT, c: gemC, s: gemS, x: px, y: py, r: rnd(-.3, .3) }; gemClick(); stroke.lx = px; stroke.ly = py; dirty = true; } });
const up = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null; if (ptr.size === 0) { if (active) commit(); stroke = null; } };
ed.addEventListener('pointerup', up); ed.addEventListener('pointercancel', up);
function commit() { if (!active) return; if (active.k === 'paint' && active.pts.length === 1) active.pts.push([active.pts[0][0] + .5, active.pts[0][1] + .5]); D.items.push(active); drawItem(ux, active); active = null; dirty = true; updUndo(); }
function sprayAt(it, px, py) { for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, d = Math.random() * it.s * 1.6; it.dots.push([Math.round(px + Math.cos(a) * d), Math.round(py + Math.sin(a) * d), +rnd(1, 2.6).toFixed(1), +rnd(.4, 1).toFixed(2)]); } }
function sprinkle(it, px, py) { const n = it.sh === 'fine' ? 46 : it.sh === 'chunky' ? 16 : 7; it.fl.push(...makeFlakes(px, py, it.sh === 'fine' ? 46 : 42, n, it.sh)); const t = A.ac(); if (t) A.noise(.05, 'highpass', 6000 + rnd(0, 3000), 1, .05); }
function gemClick() { A.tone(1500 + rnd(0, 400), .05, 'sine', .06); A.tone(2400, .04, 'sine', .03, .03); buzz(6); }
function updUndo() { $('undoBtn').hidden = !D.items.length; }
$('undoBtn').onclick = () => { if (!D.items.length) return; const it = D.items.pop(); if (it === sel) sel = null; rebuildUnder(); dirty = true; A.tone(400, .06, 'triangle', .05); updUndo(); renderOpts(); };
$('undoBtn').innerHTML = ICO.undo('#8a2a9a');

/* ---------- panel ---------- */
const btn = (cls, attrs, html) => `<button class="${cls}" ${attrs}>${html}</button>`;
const swatches = (list, cur, dk) => list.map(c => c === 'holo' ? btn('sw' + (cur === c ? ' on' : ''), `data-${dk}="holo" style="background:conic-gradient(#ff7ac0,#ffd23a,#5ae0a0,#5ab0ff,#b87aff,#ff7ac0)"`, '') : btn('sw' + (cur === c ? ' on' : ''), `data-${dk}="${c}" style="background:${c}"`, '')).join('');
const owned = k => S.unl.includes(k);
function stkOk() { return PACKS[stkPack].p === 0 || owned('pack' + stkPack); }
function renderTabs() { $('tabs').innerHTML = TABS.map(([k, ic, n]) => btn('tab' + (tab === k ? ' on' : ''), `data-tab="${k}"`, `${ic}<small>${n}</small>`)).join(''); }
function renderOpts() { let h = '';
  if (tab === 'base') { h = `<div class="row2">${BASES.map(([k, ic, n, p]) => btn('ch' + (D.base.t === k ? ' on' : '') + (p && !owned('b_' + k) ? ' lk' : ''), `data-base="${k}"`, `${ic}<small>${n}</small>${p && !owned('b_' + k) ? `<span class="pr">🪙${p}</span>` : ''}`)).join('')}</div>`;
    const two = !['solid', 'clear', 'jelly'].includes(D.base.t); if (D.base.t !== 'clear') h += `<div class="row2">${two ? btn('ch' + (baseSlot === 1 ? ' on' : ''), 'data-slot="1"', '1') + btn('ch' + (baseSlot === 2 ? ' on' : ''), 'data-slot="2"', '2') + '<span class="sep"></span>' : ''}${swatches(PAL, baseSlot === 2 && two ? D.base.c2 : D.base.c1, 'bc')}</div>`; else h += `<p class="lbl">${T('מגן שקוף – רואים דרכו את צבע הטלפון!', 'A clear case – the phone color shows through!')}</p>`; }
  else if (tab === 'paint') h = `<div class="row2">${BRUSH.map(([k, ic, n]) => btn('ch' + (brush === k ? ' on' : ''), `data-br="${k}"`, `${ic}<small>${n}</small>`)).join('')}<span class="sep"></span>${[6, 14, 26].map((s, i) => btn('ch' + (bSize === s ? ' on' : ''), `data-bs="${s}"`, `<i style="display:inline-block;width:${8 + i * 7}px;height:${8 + i * 7}px;border-radius:50%;background:currentColor"></i>`)).join('')}</div>` + (brush === 'rainbow' ? `<p class="lbl">${T('🌈 צובע את כל צבעי הקשת לבד!', '🌈 Paints every rainbow color by itself!')}</p>` : `<div class="row2">${swatches(PAL, bCol, 'pc')}</div>`);
  else if (tab === 'glit') h = `<div class="row2">${GLIT.map(([k, ic, n]) => btn('ch' + (gType === k ? ' on' : ''), `data-gt="${k}"`, `${ic}<small>${n}</small>`)).join('')}</div><div class="row2">${swatches(GCOL.map(g => g[0]), gCol, 'gc')}</div>`;
  else if (tab === 'gem') h = `<div class="row2">${GEMS.map(([k, ic, n]) => btn('ch' + (gemT === k ? ' on' : ''), `data-gm="${k}"`, `${ic}<small>${n}</small>`)).join('')}<span class="sep"></span>${[24, 34, 50].map((s, i) => btn('ch' + (gemS === s ? ' on' : ''), `data-gs="${s}"`, ['S', 'M', 'L'][i])).join('')}</div>` + (gemT === 'stud' ? `<p class="lbl">${T('💡 גוררים אצבע כדי ליצור שורה של אבנים', '💡 Drag a finger to make a row of gems')}</p>` : `<div class="row2">${swatches(GEMC, gemC, 'gmc')}</div>`);
  else if (tab === 'stk') { h = `<div class="row2">${PACKS.map((p, i) => btn('ch' + (stkPack === i ? ' on' : '') + (p.p && !owned('pack' + i) ? ' lk' : ''), `data-pk="${i}"`, `<small>${p.n}</small>${p.p && !owned('pack' + i) ? `<span class="pr">🪙${p.p}</span>` : ''}`)).join('')}</div>`;
    h += stkOk() ? `<div class="row2">${PACKS[stkPack].e.map(e => btn('ch' + (stkE === e ? ' on' : ''), `data-se="${e}"`, e)).join('')}</div>` : `<div class="row2">${btn('btn pri', `data-buy="pack${stkPack}"`, `🔓 ${T('לפתוח ב-', 'Unlock for ')}🪙${PACKS[stkPack].p}`)}</div>`;
    h += selTools(T('👆 נוגעים במגן כדי להדביק · שתי אצבעות = הגדלה וסיבוב', '👆 Tap the case to stick · two fingers = resize & rotate')); }
  else if (tab === 'photo') { h = `<div class="row2">${SHAPES.map(([k, ic, n]) => btn('ch' + (photoShape === k ? ' on' : ''), `data-ps="${k}"`, `${ic}<small>${n}</small>`)).join('')}</div><div class="row2">${btn('btn pri', 'id="addPhoto"', '📷 ' + T('בחירת תמונה', 'Choose a photo'))}</div>` + selTools(T('🔒 התמונה נשארת רק בטלפון שלכם', '🔒 Your photo stays only on your phone')); }
  else if (tab === 'text') h = `<div class="row2"><input class="tin" id="tin" maxlength="14" placeholder="${T('כתבו שם או מילה…', 'Type a name or word…')}">${btn('btn pri', 'id="addTxt"', '➕')}</div><div class="row2">${FONTS.map(([k, ic]) => btn('ch' + (fontK === k ? ' on' : ''), `data-fk="${k}"`, ic)).join('')}<span class="sep"></span>${swatches(PAL.slice(0, 16), txtCol, 'tc')}</div>` + selTools('');
  $('opts').innerHTML = h; const ti = $('tin'); if (ti) ti.onkeydown = e => { if (e.key === 'Enter') addText(); };
  requestAnimationFrame(layoutEd); }
function selTools(hint) { if (sel && sel.k === (tab === 'stk' ? 'stk' : tab)) return `<div class="row2">${btn('ch', 'data-act="smaller"', '➖')}${btn('ch', 'data-act="bigger"', '➕')}${btn('ch', 'data-act="rotl"', '↺')}${btn('ch', 'data-act="rotr"', '↻')}${btn('ch', 'data-act="del"', '🗑️')}${btn('ch', 'data-act="done"', '✔️')}</div>`; return hint ? `<p class="lbl">${hint}</p>` : ''; }
$('tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; if (sel && !['stk', 'photo', 'text'].includes(tab)) { sel = null; rebuildUnder(); dirty = true; } A.tone(760, .04, 'triangle', .04); renderTabs(); renderOpts(); };
$('opts').onclick = e => { const b = e.target.closest('button'); if (!b) return; const d = b.dataset; A.tone(820, .035, 'triangle', .04);
  if (d.base) { const bs = BASES.find(x => x[0] === d.base); if (bs[3] && !owned('b_' + bs[0])) { if (!buy('b_' + bs[0], bs[3])) return; } D.base.t = d.base; if (d.base === 'clear') { } baseSlot = 1; rebuildUnder(); }
  if (d.slot) baseSlot = +d.slot; if (d.bc) { if (baseSlot === 2 && !['solid', 'clear', 'jelly'].includes(D.base.t)) D.base.c2 = d.bc; else D.base.c1 = d.bc; rebuildUnder(); }
  if (d.br) brush = d.br; if (d.bs) bSize = +d.bs; if (d.pc) bCol = d.pc; if (d.gt) gType = d.gt; if (d.gc) gCol = d.gc; if (d.gm) gemT = d.gm; if (d.gs) gemS = +d.gs; if (d.gmc) gemC = d.gmc;
  if (d.pk) stkPack = +d.pk; if (d.se) { stkE = d.se; if (sel && sel.k === 'stk') { sel.e = d.se; } }
  if (d.buy) { const i = +d.buy.slice(4); if (!buy(d.buy, PACKS[i].p)) return; stkE = PACKS[i].e[0]; }
  if (d.ps) { photoShape = d.ps; if (sel && sel.k === 'photo') { sel.shape = d.ps; if (d.ps === 'full') fullPhoto(sel); } }
  if (d.fk) { fontK = d.fk; if (sel && sel.k === 'text') sel.font = d.fk; } if (d.tc) { txtCol = d.tc; if (sel && sel.k === 'text') sel.c = d.tc; }
  if (d.act && sel) { if (d.act === 'smaller') sel.s *= .85; if (d.act === 'bigger') sel.s *= 1.18; if (d.act === 'rotl') sel.r -= .2; if (d.act === 'rotr') sel.r += .2; if (d.act === 'del') { D.items.splice(D.items.indexOf(sel), 1); sel = null; rebuildUnder(); updUndo(); } if (d.act === 'done') { sel = null; rebuildUnder(); } }
  if (b.id === 'addPhoto') { $('fileIn').value = ''; $('fileIn').click(); }
  if (b.id === 'addTxt') addText();
  dirty = true; renderOpts(); };
function buy(k, p) { if (owned(k)) return true; if (S.coins < p) { toast(T('צריך עוד מטבעות 🪙 – אופים עוד מגנים!', 'Need more coins 🪙 – bake more cases!')); A.tone(200, .12, 'sine', .05); return false; } S.coins -= p; S.unl.push(k); S.save(); updCoins(); A.voice('yay', 1.3); toast(T('נפתח! 🎉', 'Unlocked! 🎉')); return true; }
function addText() { const ti = $('tin'); const v = (ti && ti.value || '').trim(); if (!v) { ti && ti.focus(); return; } const it = { k: 'text', txt: v, font: fontK, c: txtCol, x: DW / 2, y: DH * .62, s: Math.min(110, 760 / Math.max(3, v.length)), r: 0 }; D.items.push(it); select(it); ti.value = ''; ti.blur(); updUndo(); A.tone(990, .08, 'triangle', .06); }
function fullPhoto(it) { const im = it.img, ar = im.height / im.width; it.x = DW / 2; it.y = DH / 2; it.r = 0; it.s = Math.max(DW, DH / ar); }
$('fileIn').onchange = () => { const f = $('fileIn').files && $('fileIn').files[0]; if (!f) return; const url = URL.createObjectURL(f); const im = new Image(); im.onload = () => { const m = 900, sc = Math.min(1, m / Math.max(im.width, im.height)); const c = cnv(Math.round(im.width * sc), Math.round(im.height * sc)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    const it = { k: 'photo', img: c, shape: photoShape, x: DW / 2, y: DH * .55, s: 300, r: 0 }; if (photoShape === 'full') fullPhoto(it); D.items.push(it); select(it); updUndo(); A.voice('wow', 1.2); if (!S.photoTip) { S.photoTip = 1; S.save(); toast(T('🔒 התמונה נשארת רק בטלפון שלכם', '🔒 Your photo stays only on your phone'), 2600); } };
  im.onerror = () => toast(T('לא הצלחנו לפתוח את התמונה', 'Could not open that photo')); im.src = url; };

/* ================= FLOW ================= */
let state = 'title', yaw = Math.PI, pitch = 0, tYaw = Math.PI, tPitch = 0, zoom = 4.2, idle = 0, snap = null, cur = null; // cur = {tier, rec}
const updCoins = () => { $('coinC').textContent = '🪙 ' + S.coins; $('tCoin').textContent = '🪙 ' + S.coins; };
function show(id, on) { $(id).hidden = !on; }
function demoDesign() { const d = newDesign(); d.base = { t: pick(['grad', 'tiedye', 'polka', 'marble', 'jelly']), c1: pick(PAL.slice(1, 16)), c2: pick(PAL.slice(1, 16)) };
  d.items.push({ k: 'glit', sh: pick(['fine', 'star', 'heart']), c: pick(['holo', '#ffd23a', '#e8eef8']), fl: [].concat(...Array.from({ length: 8 }, () => makeFlakes(rnd(60, 450), rnd(450, 1000), 60, 30, 'fine'))) });
  for (let i = 0; i < 4; i++) d.items.push({ k: 'stk', e: pick(PACKS[0].e), x: rnd(120, 400), y: rnd(470, 960), s: rnd(90, 150), r: rnd(-.4, .4) });
  for (let i = 0; i < 9; i++) d.items.push({ k: 'gem', t: 'pearl', c: '#ffffff', s: 26, x: 90 + i * 42, y: 1000, r: 0 }); return d; }
function title() { state = 'title'; A.allOff(); A.stopMusic(); for (const id of ['hud', 'panel', 'pick', 'oven', 'rev', 'album', 'rotHint']) show(id, false); ed.hidden = true; show('title', true); document.body.classList.remove('dark'); paintBg(false);
  P = PHONES[S.ph] || PHONES[0]; pcol = S.pc || 0; buildPhone(P, PCOL[pcol][0]); const dd = D; D = demoDesign(); const ft = finalTextures(); buildCase(P, D, ft.tex, ft.tw, 2); D = dd; caseG.position.set(0, 0, 0); tYaw = Math.PI; zoom = 7.2; world.position.y = -.2; updCoins(); }
function pickPhone() { state = 'pick'; show('title', false); show('pick', true); show('hud', true); $('stepT').textContent = T('בוחרים טלפון', 'Pick a phone'); $('undoBtn').hidden = true; if (caseG) { spin.remove(caseG); caseG = null; } tYaw = Math.PI; zoom = 6.6; world.position.y = .62; renderPick(); }
function renderPick() { P = PHONES[S.ph] || PHONES[0]; pcol = S.pc || 0; buildPhone(P, PCOL[pcol][0]);
  $('pickIn').innerHTML = `<p class="lbl">${T('דגם', 'Model')}</p><div class="row2">${PHONES.map((p, i) => btn('ch' + (S.ph === i ? ' on' : ''), `data-ph="${i}"`, `📱<small>${p.n}</small>`)).join('')}</div><p class="lbl">${T('צבע הטלפון', 'Phone color')}</p><div class="row2">${PCOL.map(([c], i) => btn('sw' + (pcol === i ? ' on' : ''), `data-pcl="${i}" style="background:${c}"`, '')).join('')}</div><div class="go"><button class="btn pri ready" id="toDesign">${T('לעיצוב המגן! 🎨', 'Design the case! 🎨')}</button></div>`; }
$('pickIn').onclick = e => { const b = e.target.closest('button'); if (!b) return; A.tone(800, .04, 'triangle', .04); if (b.dataset.ph) { S.ph = +b.dataset.ph; S.save(); tYaw += TAU; } if (b.dataset.pcl) { S.pc = +b.dataset.pcl; S.save(); } if (b.id === 'toDesign') { startDesign(); return; } renderPick(); };
function startDesign() { state = 'design'; show('pick', false); show('hud', true); show('panel', true); ed.hidden = false; D = newDesign(); sel = null; tab = 'base'; $('stepT').textContent = T('מעצבים!', 'Design it!'); $('bakeBtn').textContent = T('🔥 לתנור!', '🔥 Into the oven!'); maskFor = null; rebuildUnder(); renderTabs(); renderOpts(); updUndo(); layoutEd(); A.startMusic({ bpm: 100, chords: [[60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74]], lead: true, vol: .6 });
  if (!S.tut) toast(T('בוחרים בסיס, מציירים, מפזרים נצנצים ומדביקים – ואז לתנור!', 'Pick a base, paint, sprinkle glitter and add stickers – then bake it!'), 3600); }
$('bakeBtn').onclick = () => { if (!D.items.length && D.base.t === 'solid' && D.base.c1 === '#ffd0e8') { toast(T('קודם מעצבים משהו 🎨', 'Design something first 🎨')); return; } sel = null; rebuildUnder(); oven(); };

/* ---------- oven ---------- */
let ov = null;
function oven() { state = 'oven'; S.tut = 1; S.save(); show('panel', false); ed.hidden = true; show('hud', false); show('oven', true); A.stopMusic();
  compose(wx, null); $('oimg').src = work.toDataURL('image/png'); $('oimg').style.filter = 'brightness(.8)'; $('heat').style.opacity = 0; $('gauge').hidden = false; $('ovBtn').hidden = false; $('ovBtn').textContent = T('🔥 עצור!', '🔥 STOP!'); $('ovHint').textContent = T('עצרו את המחוג באזור הירוק לאפייה מושלמת!', 'Stop the needle in the green for a perfect bake!'); $('odisp').textContent = '---°';
  ov = { t: 0, phase: 'gauge', ang: -80, dir: 1, sp: 150, luck: 0 }; A.loopTone('hum', 'sine', 110, .03); }
$('ovBtn').onclick = () => { if (!ov || ov.phase !== 'gauge') return; const off = Math.abs(ov.ang); ov.luck = off < 9 ? 2 : off < 22 ? 1 : 0; A.ac();
  $('ovHint').textContent = ov.luck === 2 ? T('מושלם!! 🔥 סיכוי גבוה למגן נדיר', 'PERFECT!! 🔥 Better odds for a rare case') : ov.luck === 1 ? T('יפה! 👍', 'Nice! 👍') : T('אופס – אופים בכל זאת 😅', 'Oops – baking anyway 😅');
  if (ov.luck === 2) { [784, 988, 1175, 1568].forEach((f, i) => A.tone(f, .15, 'triangle', .07, i * .07)); buzz(30); } else A.tone(ov.luck ? 660 : 300, .2, 'triangle', .07);
  $('ovBtn').hidden = true; ov.phase = 'bake'; ov.t = 0; $('ovBox').classList.add('shake'); A.loopOn('fire', 'lowpass', 600, 1, .08, 3); };
function stepOven(dt) { if (!ov) return; ov.t += dt;
  if (ov.phase === 'gauge') { ov.ang += ov.dir * ov.sp * dt; if (ov.ang > 85) { ov.ang = 85; ov.dir = -1; } if (ov.ang < -85) { ov.ang = -85; ov.dir = 1; } $('needle').style.transform = `rotate(${ov.ang}deg)`; return; }
  if (ov.phase === 'bake') { const p = clamp(ov.t / 4.2, 0, 1); $('heat').style.opacity = (.35 + .55 * p + .1 * Math.sin(ov.t * 9)).toFixed(2); $('oimg').style.filter = `brightness(${(.8 + p * .7).toFixed(2)}) saturate(${(1 + p).toFixed(2)}) hue-rotate(${Math.round(p * p * 200 * Math.sin(ov.t * 2))}deg)`; $('odisp').textContent = '00:0' + Math.max(0, Math.ceil(4.2 - ov.t));
    if (Math.floor(ov.t * 2) !== Math.floor((ov.t - dt) * 2)) A.tone(1200, .03, 'square', .03); if (ov.t > 4.2) { ov.phase = 'ding'; ov.t = 0; A.loopOff('fire'); A.loopOff('hum'); $('ovBox').classList.remove('shake'); [1568, 2093].forEach((f, i) => A.tone(f, .5, 'sine', .08, i * .12)); $('odisp').textContent = 'DING!'; $('gauge').hidden = true; $('ovHint').textContent = T('מה יצא לנו?…', 'What did we get?…'); } return; }
  if (ov.phase === 'ding' && ov.t > 1.1) { ov.phase = 'done'; rollTier(ov.luck); } }
function rollTier(luck) { const w = TIERS.map((t, i) => t.w * (i >= 2 ? 1 + luck * .6 : 1) * (i === 0 ? 1 - luck * .25 : 1)); S.pity = (S.pity || 0) + 1; let tier;
  if (S.pity >= 7) tier = 2 + (Math.random() < .3 ? 1 : 0); else { let r = Math.random() * w.reduce((a, b) => a + b, 0); tier = 0; for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) { tier = i; break; } } }
  if (tier >= 2) S.pity = 0; S.made++; const coins = TIERS[tier].coins + (luck === 2 ? 10 : 0); S.coins += coins; S.save(); cur = { tier, coins };
  const tb = $('tierB'); tb.className = 'tierB t' + tier; tb.style.setProperty('--c', TIERS[tier].c); tb.innerHTML = `<b>${TIERS[tier].n}</b><span>✨ ${TIERS[tier].fx}</span>`;
  const fl = $('flash'); fl.style.transition = 'none'; fl.style.opacity = tier >= 3 ? 1 : .8; requestAnimationFrame(() => { fl.style.transition = 'opacity .8s'; fl.style.opacity = 0; });
  setTimeout(() => tb.classList.add('on'), 60); [523, 659, 784, 1047, 1319].slice(0, 2 + tier).forEach((f, i) => A.tone(f, .18, 'square', .05, i * .09)); if (tier >= 3) { A.voice('wow', 1.4); buzz([30, 40, 30]); } else A.voice('yay', 1.2);
  setTimeout(() => { tb.classList.remove('on'); reveal(tier); }, 1900); }
function reveal(tier, rec) { state = 'reveal'; ov = null; show('oven', false); show('panel', false); show('pick', false); show('title', false); ed.hidden = true; show('hud', true); $('undoBtn').hidden = true; $('stepT').textContent = rec ? T('מהאוסף', 'From the collection') : T('המגן מוכן! 🎉', 'Your case is ready! 🎉'); updCoins();
  P = PHONES[rec ? rec.ph : S.ph] || PHONES[0]; pcol = rec ? rec.pc : S.pc; buildPhone(P, PCOL[pcol][0]);
  const go = (tex, tw, spec) => { buildCase(P, spec, tex, tw, tier); if (!rec) { caseG.position.set(0, -2.6, -.4); caseG.rotation.set(-1.2, 0, .6); snap = { t: 0 }; } else { caseG.position.set(0, 0, 0); snap = null; } tYaw = Math.PI + .5; yaw = Math.PI - .6; tPitch = .12; zoom = 5.6; world.position.y = .42; idle = 0;
    const dark = tier >= 3; document.body.classList.toggle('dark', dark); paintBg(dark); hemi.intensity = dark ? .18 : .55; key.intensity = dark ? .5 : 1.6;
    renderRev(tier, rec); show('rev', true); show('rotHint', true); $('rotHint').textContent = T('👆 גוררים כדי לסובב 360°', '👆 Drag to spin 360°'); $('rotHint').style.animation = 'none'; void $('rotHint').offsetWidth; $('rotHint').style.animation = '';
    if (!rec) setTimeout(() => saveRec(tier, tex, spec), 1600); };
  if (rec) { const im = new Image(); im.onload = () => { const tex = cnv(DW, DH); tex.getContext('2d').drawImage(im, 0, 0, DW, DH); const tw = splitTw(rec); go(tex, tw, rec.spec); }; im.src = rec.d; }
  else { const ft = finalTextures(); go(ft.tex, ft.tw, D); A.startMusic({ bpm: 112, chords: [[60, 64, 67], [65, 69, 72], [57, 60, 64], [67, 71, 74]], lead: true, vol: .55 }); } }
function renderRev(tier, rec) { $('revInfo').innerHTML = `<span style="color:${TIERS[tier].c}">● ${TIERS[tier].n}</span> · ${TIERS[tier].fx}${rec ? '' : `<small>🪙 +${cur ? cur.coins : 0}</small>`}`;
  $('revBtns').innerHTML = `${btn('btn wh', 'id="lightB"', tier >= 3 ? '💡 ' + T('אורות', 'Lights') : '🌙 ' + T('חושך', 'Dark'))}${btn('btn wh', 'id="photoB"', '📸 ' + T('שמירת תמונה', 'Save picture'))}${btn('btn wh', 'id="albB2"', '📖 ' + T('אוסף', 'Collection'))}${btn('btn pri', 'id="againB"', '✨ ' + T('מגן חדש', 'New case'))}`; }
$('revBtns').onclick = e => { const b = e.target.closest('button'); if (!b) return; A.tone(800, .04, 'triangle', .04);
  if (b.id === 'lightB') { const dark = !document.body.classList.contains('dark'); document.body.classList.toggle('dark', dark); paintBg(dark); hemi.intensity = dark ? .18 : .55; key.intensity = dark ? .5 : 1.6; b.innerHTML = dark ? '💡 ' + T('אורות', 'Lights') : '🌙 ' + T('חושך', 'Dark'); }
  if (b.id === 'photoB') savePic(); if (b.id === 'albB2') openAlbum(); if (b.id === 'againB') { A.stopMusic(); pickPhone(); } };
function savePic() { E.render(); try { const a = document.createElement('a'); a.download = 'case-craft.png'; a.href = renderer.domElement.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove(); toast(T('נשמר! 📸', 'Saved! 📸')); } catch (e) { toast(T('לא הצלחנו לשמור', 'Could not save')); } }
function splitTw(rec) { const tw = [0, 1, 2].map(() => cnv(DW / 2, DH / 2)); if (!rec.twI) return tw; const src = rec.twI; const s = cnv(DW / 2, DH / 2), sx = s.getContext('2d'); sx.drawImage(src, 0, 0, DW / 2, DH / 2); const id = sx.getImageData(0, 0, DW / 2, DH / 2).data;
  tw.forEach((c, k) => { const x = c.getContext('2d'), o = x.createImageData(DW / 2, DH / 2), od = o.data; for (let i = 0; i < id.length; i += 4) { const v = id[i + k]; od[i] = od[i + 1] = od[i + 2] = 255; od[i + 3] = v; } x.putImageData(o, 0, 0); }); return tw; }
function packTw(tw) { const c = cnv(DW / 4, DH / 4), x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height); const tmp = cnv(DW / 4, DH / 4), tx = tmp.getContext('2d');
  ['#ff0000', '#00ff00', '#0000ff'].forEach((col, k) => { tx.clearRect(0, 0, tmp.width, tmp.height); tx.globalCompositeOperation = 'source-over'; tx.drawImage(tw[k], 0, 0, tmp.width, tmp.height); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = col; tx.fillRect(0, 0, tmp.width, tmp.height); x.globalCompositeOperation = 'lighter'; x.drawImage(tmp, 0, 0); }); return c.toDataURL('image/png'); }
function saveRec(tier, tex, spec) { try { E.render(); const src = renderer.domElement, w = src.width, h = src.height, th = cnv(200, 300), tx = th.getContext('2d'); const cw = Math.min(w, h * 2 / 3), ch = cw * 1.5; tx.drawImage(src, (w - cw) / 2, (h - ch) / 2, cw, ch, 0, 0, 200, 300);
    const small = cnv(256, 528); small.getContext('2d').drawImage(tex, 0, 0, 256, 528); const gems = spec.items.filter(i => i.k === 'gem').map(({ k, t, c, s, x, y, r }) => ({ k, t, c, s, x, y, r }));
    const rec = { id: Date.now(), tier, ph: S.ph, pc: S.pc, thumb: th.toDataURL('image/webp', .75), d: small.toDataURL('image/webp', .82), tw: packTw(twMats.map(m => m.m.map.image)), spec: { base: { t: spec.base.t, c1: spec.base.c1, c2: spec.base.c2 }, items: gems } };
    S.album.unshift(rec); while (S.album.length > 30) S.album.pop(); let size = JSON.stringify(S.album).length; while (size > 3.2e6 && S.album.length > 1) { S.album.pop(); size = JSON.stringify(S.album).length; } S.save(); } catch (e) { } }

/* ---------- album ---------- */
function openAlbum() { show('album', true); const L = S.album; $('album').innerHTML = `<div class="ahead"><button class="rb" id="albClose">✕</button><h3>📖 ${T('האוסף שלי', 'My collection')} (${L.length})</h3><span style="width:46px"></span></div><div class="agrid">${L.length ? L.map((r, i) => `<button class="ac" data-i="${i}"><img src="${r.thumb}" alt=""><i>${['⚪', '🔵', '🟣', '🟡', '🌈'][r.tier]}</i></button>`).join('') : `<div class="empty">${T('עוד אין מגנים – בואו נאפה את הראשון! 🔥', 'No cases yet – let’s bake the first one! 🔥')}</div>`}</div>`; }
$('album').onclick = e => { if (e.target.closest('#albClose')) { show('album', false); return; } const b = e.target.closest('[data-i]'); if (!b) return; const r = S.album[+b.dataset.i]; show('album', false); show('title', false); cur = null;
  const im = new Image(); im.onload = () => reveal(r.tier, Object.assign({}, r, { twI: im })); im.onerror = () => reveal(r.tier, r); im.src = r.tw || ''; };

/* ---------- 3D drag ---------- */
const st = $('stage'); const dp = new Map(); let dLast = null, pz = null;
st.addEventListener('pointerdown', e => { if (state !== 'reveal' && state !== 'title' && state !== 'pick') return; A.ac(); dp.set(e.pointerId, { x: e.clientX, y: e.clientY }); dLast = { x: e.clientX, y: e.clientY, t: performance.now() }; idle = 0; if (dp.size === 2) { const [a, b] = [...dp.values()]; pz = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom }; } });
addEventListener('pointermove', e => { if (!dp.has(e.pointerId)) return; const p = dp.get(e.pointerId); if (dp.size >= 2 && pz) { p.x = e.clientX; p.y = e.clientY; const [a, b] = [...dp.values()]; zoom = clamp(pz.z * pz.d / Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), 2.8, 8); return; }
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; tYaw += dx * .012; tPitch = clamp(tPitch + dy * .006, -.7, .7); idle = 0; if (Math.abs(dx) > 2 && Math.random() < .15) A.noise(.04, 'bandpass', 1800, 3, .02); });
const dUp = e => { dp.delete(e.pointerId); if (dp.size < 2) pz = null; }; addEventListener('pointerup', dUp); addEventListener('pointercancel', dUp);
st.addEventListener('wheel', e => { zoom = clamp(zoom + e.deltaY * .002, 2.8, 8); }, { passive: true });

/* ================= LOOP ================= */
let last = performance.now();
function loop(now) { requestAnimationFrame(loop); const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000; A.tick();
  if (state === 'design') { drawEd(); return; }
  if (state === 'oven') { stepOven(dt); return; }
  idle += dt; if ((state === 'title' || state === 'pick') && dp.size === 0) tYaw += dt * .45; if (state === 'reveal' && idle > 3.5 && dp.size === 0) tYaw += dt * .35;
  yaw = lerp(yaw, tYaw, Math.min(1, dt * 8)); pitch = lerp(pitch, tPitch, Math.min(1, dt * 8)); spin.rotation.set(pitch, yaw, 0); spin.position.y = Math.sin(t * 1.3) * .03;
  const land = innerWidth > innerHeight && innerHeight < 560, lz = land ? .62 : 1, lx = land ? (state === 'pick' || state === 'reveal' ? .55 : state === 'title' ? .75 : 0) : 0; camera.position.set(lx, land ? world.position.y * .9 : 0, lerp(camera.position.z, zoom * lz, Math.min(1, dt * 5))); camera.lookAt(lx, land ? world.position.y * .9 : 0, 0);
  if (snap && caseG) { snap.t += dt; const p = clamp(snap.t / 1.1, 0, 1), e2 = 1 - Math.pow(1 - p, 3); caseG.position.set(0, lerp(-2.6, 0, e2), lerp(-.4, 0, e2)); caseG.rotation.set(lerp(-1.2, 0, e2), 0, lerp(.6, 0, e2));
    if (p >= 1) { snap = null; caseG.position.set(0, 0, 0); caseG.rotation.set(0, 0, 0); A.noise(.08, 'bandpass', 2600, 2, .25); A.tone(180, .08, 'square', .08); buzz(25); E.grade.uniforms.uFlash.value = .22;
      const cols = cur && cur.tier >= 3 ? [[3, 2.4, .6], [3, 1.2, 2.4], [1.2, 2.4, 3]] : CONFETTI; FX.burst(V3(0, 0, 0), 90, cols, 2.4, .05, 1.3, 1.5); } }
  E.grade.uniforms.uFlash.value = Math.max(0, E.grade.uniforms.uFlash.value - dt * 1.6);
  // glitter twinkle depends on view angle
  for (const w of twMats) w.m.opacity = clamp(.12 + 1.4 * Math.pow(.5 + .5 * Math.sin(w.ph + yaw * 6 + pitch * 4 + t * 1.3), 7), 0, 1.4);
  if (glowMat) glowMat.emissiveIntensity = document.body.classList.contains('dark') ? .3 + .14 * Math.sin(t * 2) : .05;
  if (finish === 'galaxy' && caseG && Math.random() < dt * 30) { const a = Math.random() * TAU; FX.emit(V3(Math.cos(a) * .55, Math.sin(a) * .95, rnd(-.2, .2)).applyEuler(spin.rotation).add(spin.position).add(world.position), V3(0, rnd(.05, .2), 0), [rnd(1.5, 3), rnd(1.5, 3), 3], rnd(.02, .045), rnd(.5, 1), 0, .9); }
  FX.update(dt, 0); E.render(); }

/* ================= UI WIRING ================= */
$('newBtn').textContent = T('✨ עיצוב מגן חדש', '✨ Design a new case'); $('albBtn').textContent = '📖 ' + T('האוסף שלי', 'My collection'); $('tSub').textContent = T('מעצבים מגן לטלפון עם נצנצים, מדבקות, אבנים ואפילו תמונה שלכם – אופים בתנור ומגלים כמה הוא נדיר!', 'Design a phone case with glitter, stickers, gems and even your own photo – bake it and see how rare it comes out!');
$('newBtn').onclick = () => { A.ac(); pickPhone(); }; $('albBtn').onclick = () => { A.ac(); openAlbum(); };
$('backBtn').innerHTML = ICO.home('#8a2a9a'); $('backBtn').onclick = () => { A.tone(500, .05, 'triangle', .04); if (state === 'design' && D && D.items.length && !confirmBack()) return; title(); };
let backArm = 0; function confirmBack() { const n = performance.now(); if (n - backArm < 2500) return true; backArm = n; toast(T('לחצו שוב כדי לצאת (העיצוב יימחק)', 'Tap again to leave (the design will be lost)')); return false; }
$('homeT').innerHTML = ICO.home('#8a2a9a'); soundButton('sndBtn', S, A, '#8a2a9a'); hubButtons(['homeT'], A);
E.onResize.push(() => { if (state === 'design') layoutEd(); }); addEventListener('resize', () => { if (state === 'design') layoutEd(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { A.stopMusic(); A.allOff(); } });
setTimeout(() => { E.resize(); title(); $('loading').hidden = true; requestAnimationFrame(loop); window.__caseOK = true; }, 30);
window.__cs = { world, spin, get D() { return D; }, set D(v) { D = v; }, get state() { return state; }, S, E, camera, startDesign, pickPhone, oven, rollTier, reveal, finalTextures, rebuildUnder, renderOpts, select, PHONES, get ov() { return ov; }, makeFlakes, title, openAlbum, set tYaw(v) { tYaw = v; }, set tPitch(v) { tPitch = v; }, set zoom(v) { zoom = v; }, layoutEd, get view() { return view; } };
