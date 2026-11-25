import { $, clamp, lerp, rng, T, EN, store, audio, toast, ICO, hubButtons, soundButton } from '../lib/kit.js';
import { PI, TAU, mix, sh, rgba, P, E, STAR, HEART, FACE, EYES, LIPS, browPath, linerPath, lashes, lidPt, loPt, gem, pearl, sparkle, HAIR, DRESS, drawFigure, mouthLine, ballroom, HEADM, browOf, METAL, drawCrown, drawEarrings, drawNecklace, drawClip, drawDress, drawHeadBase } from './art.js';

const S = store('tiara-save', { p: {}, tut: 0, size: 1 });
const A = audio(S);
const HI = HEADM.inverse();
const idb = (() => { let dbp; const open = () => dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open('tiara-glow', 1); r.onupgradeneeded = () => r.result.createObjectStore('d'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  return { get: k => open().then(db => new Promise(res => { const t = db.transaction('d').objectStore('d').get(k); t.onsuccess = () => res(t.result); t.onerror = () => res(null); })).catch(() => null),
    set: (k, v) => open().then(db => new Promise(res => { const t = db.transaction('d', 'readwrite'); t.objectStore('d').put(v, k); t.oncomplete = res; t.onerror = res; })).catch(() => { }) }; })();

/* ================= DATA ================= */
const PR = [
  { id: 'lilia', n: T('ליליה', 'Lilia'), skin: '#ffe1cf', lens: '#3a8cff', hair: 'long', hc: '#f7d57c', dress: 'ball', dc: '#ff8ac8', crown: 'classic', metal: 'gold', gem: '#ff3a8a', ear: 'stud', neck: 'pearls', clip: 'none', cc: '#ff6ab0', deco: 'sparkle' },
  { id: 'amara', n: T('אמארה', 'Amara'), skin: '#8d5b3e', lens: '#a8642a', hair: 'curls', hc: '#2a1a16', dress: 'mermaid', dc: '#ffd23a', crown: 'tiara', metal: 'gold', gem: '#3ac8ff', ear: 'hoop', neck: 'heart', clip: 'none', cc: '#ffd23a', deco: 'stars' },
  { id: 'sora', n: T('סורה', 'Sora'), skin: '#f7d6b8', lens: '#5a3a2a', hair: 'bun', hc: '#1e1618', dress: 'tulle', dc: ['#a8d8ff', '#d8b8ff'], crown: 'flower', metal: 'silver', gem: '#ff8ac8', ear: 'pearl', neck: 'none', clip: 'none', cc: '#ff8ac8', deco: 'sparkle' },
  { id: 'mira', n: T('מירה', 'Mira'), skin: '#eec29c', lens: '#2aa86a', hair: 'braid', hc: '#b4502a', dress: 'cape', dc: '#2ab08a', crown: 'ice', metal: 'silver', gem: '#5ae8ff', ear: 'drop', neck: 'choker', clip: 'none', cc: '#ffffff', deco: 'pearls' },
  { id: 'elina', n: T('אלינה', 'Elina'), skin: '#c98d68', lens: '#8a6a3a', hair: 'pony', hc: '#6a3a22', dress: 'aline', dc: '#ff5a6a', crown: 'heart', metal: 'rose', gem: '#ff3a5a', ear: 'star', neck: 'gems', clip: 'bow', cc: '#ff3a6a', deco: 'roses' },
  { id: 'zuri', n: T('זורי', 'Zuri'), skin: '#a86e4c', lens: '#9a5aff', hair: 'pig', hc: '#c8a8ff', dress: 'petal', dc: '#ff9ad8', crown: 'star', metal: 'gold', gem: '#b87aff', ear: 'stud', neck: 'pearls', clip: 'butterfly', cc: '#ffd23a', deco: 'sparkle' },
];
const LIPC = ['#e8203a', '#b8001a', '#ff4a6a', '#ff7aa8', '#ff9ad0', '#d42a7a', '#a01a4a', '#ff7a5a', '#c87a6a', '#e08aa0', '#8a2aa8', '#5a1a3a'];
const BLUSHC = ['#ff7a9a', '#ff9a8a', '#ff5a7a', '#e8708a', '#ffb08a', '#d86aa8', '#c8705a', '#ff8ad8'];
const SHADC = ['#ff8ad0', '#b88aff', '#7ac8ff', '#5ae8c8', '#ffd84a', '#ffb07a', '#c8a08a', '#8a5a4a', '#ff5a8a', '#3a3a8a', '#2ab06a', '#e8c070*', '#d8d8f0*', '#ff9ad8*', '#9ad8ff*'];
const LINERC = ['#141018', '#5a3424', '#1a2a6a', '#6a2a9a', '#0a7a8a', '#e83a8a', '#ffffff', '#e8b84a*'];
const LASHC = ['#141018', '#4a2a1a', '#2a4aca', '#8a3ac8', '#e83a9a', '#2a9a7a'];
const BROWC = ['#2a1a14', '#4a3022', '#6a4a32', '#a8784a', '#d8b070', '#8a3a22'];
const GLOWC = ['#fff4e0', '#ffe08a', '#ffc8d8', '#d8e8ff', 'rainbow'];
const LENSC = ['#3a8cff', '#7ac8ff', '#2aa86a', '#8a6a3a', '#5a3a2a', '#9a5aff', '#7a8a9a', '#2ac8c8', '#ff7ab8', '#d8a020'];
const GEMC = ['#ff3a8a', '#3ac8ff', '#b87aff', '#ffd23a', '#5aff9a', '#ffffff', '#ff5a3a'];
const HAIRC = ['#fbe8a8', '#f7d57c', '#e8b04a', '#b4502a', '#8a4a2a', '#6a3a22', '#2a1a16', '#1e1618', '#ff8ac8', '#c8a8ff', '#6ab8ff', '#7ae8c8', '#f4f0ea', '#ff6a5a'];
const CCC = ['#ff6ab0', '#ff3a6a', '#ffd23a', '#ffffff', '#5ac8ff', '#b87aff', '#5ae88a', '#1a1a2a'];
const DRESSC = ['#ff8ac8', '#ff5a6a', '#ffd23a', '#a8d8ff', '#5a8aff', '#b88aff', '#2ab08a', '#ffffff', '#f4e0c8', '#ff9a5a', '#e8305a', '#3a2a6a', ['#ffc8e8', '#b88aff'], ['#a8f0ff', '#5a8aff'], ['#fff0a8', '#ff8a5a'], ['#c8ffe8', '#2ab08a'], ['#ffffff', '#ff8ac8']];
const N = (he, en) => T(he, en);
const STY = {
  lips: [['matte', N('מט', 'Matte')], ['gloss', N('גלוס', 'Gloss')], ['glitter', N('נצנצים', 'Glitter')], ['ombre', N('אומברה', 'Ombré')]],
  liner: [['thin', N('עדין', 'Thin')], ['wing', N('כנף', 'Wing')], ['cat', N('חתולה', 'Cat eye')], ['glam', N('זוהר', 'Glam')]],
  lash: [['natural', N('טבעי', 'Natural')], ['long', N('ארוך', 'Long')], ['drama', N('דרמטי', 'Drama')], ['doll', N('בובה', 'Doll')]],
  brow: [['soft', N('רך', 'Soft')], ['arch', N('קשת', 'Arched')], ['bold', N('מודגש', 'Bold')]],
  gems: [['gem', '💎'], ['heart', '💗'], ['star', '⭐'], ['pearl', '⚪'], ['freckle', N('נמשים', 'Freckles')], ['fly', '🦋']],
};
const TOOLS = [
  { k: 'lips', n: N('שפתון', 'Lipstick'), lay: 'lips', cols: LIPC, r: 7 },
  { k: 'blush', n: N('סומק', 'Blush'), lay: 'blush', cols: BLUSHC, r: 26 },
  { k: 'shadow', n: N('צללית', 'Shadow'), lay: 'shadow', cols: SHADC, r: 11 },
  { k: 'liner', n: N('אייליינר', 'Eyeliner'), lay: 'liner', cols: LINERC, r: 9 },
  { k: 'lash', n: N('מסקרה', 'Mascara'), lay: 'lash', cols: LASHC, r: 12 },
  { k: 'brow', n: N('גבות', 'Brows'), lay: 'brow', cols: BROWC, r: 10 },
  { k: 'glow', n: N('היילייטר', 'Glow'), lay: 'glow', cols: GLOWC, r: 14 },
  { k: 'gems', n: N('קישוטים', 'Face gems'), cols: GEMC, r: 1 },
  { k: 'lens', n: N('עדשות', 'Eye color'), cols: LENSC },
  { k: 'erase', n: N('מגבון', 'Remover'), r: 14 },
];
const TK = Object.fromEntries(TOOLS.map(t => [t.k, t]));
const LAY = {
  blush: { kind: 'paint', bb: [340, 300, 320, 285], a: .045 },
  glow: { kind: 'paint', bb: [340, 300, 320, 285], a: .07, comp: 'screen' },
  shadow: { kind: 'paint', bb: [340, 335, 320, 110], a: .18 },
  brow: { kind: 'rev', bb: [350, 310, 300, 65] },
  liner: { kind: 'rev', bb: [320, 340, 360, 70] },
  lash: { kind: 'rev', bb: [315, 290, 370, 165] },
  lips: { kind: 'rev', bb: [450, 486, 100, 64] },
};
const ORDER = ['blush', 'glow', 'shadow', 'brow', 'liner', 'lash', 'lips'];
const K = 3;
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/* ================= STATE ================= */
let pr = null, L = null, M = null, state = 'title', tab = 'makeup', tool = 'lips', accCat = 'crown', dirty = true;
const sel = { lips: { c: LIPC[0], st: 'gloss' }, blush: { c: BLUSHC[0] }, shadow: { c: SHADC[0] }, liner: { c: LINERC[0], st: 'wing' }, lash: { c: LASHC[0], st: 'long' }, brow: { c: BROWC[1], st: 'soft' }, glow: { c: GLOWC[0] }, gems: { c: GEMC[0], st: 'gem' }, lens: {}, erase: {} };
const look = p => Object.assign({}, p, S.p[p.id] && S.p[p.id].L || {});
function newMakeup() { const m = { lay: {}, gems: [], used: {}, undo: [] };
  for (const k of ORDER) { const D = LAY[k], w = Math.round(D.bb[2] * K), h = Math.round(D.bb[3] * K); const o = { k, D, c: cnv(w, h), m: cnv(w, h), col: null, st: null }; if (D.kind === 'rev') { o.sty = cnv(w, h); o.out = cnv(w, h); } m.lay[k] = o; buildMask(o); }
  return m; }
function lctx(o) { const x = o.getContext('2d'); return x; }
function toLay(x, o) { x.setTransform(K, 0, 0, K, -o.D.bb[0] * K, -o.D.bb[1] * K); }
function buildMask(o) { const x = lctx(o.m); toLay(x, o); x.fillStyle = '#fff';
  if (o.k === 'blush' || o.k === 'glow') { x.fill(FACE); x.globalCompositeOperation = 'destination-out'; x.lineWidth = 5; for (const e of EYES) { x.fill(e.path); x.stroke(e.path); } x.fill(LIPS); }
  else if (o.k === 'shadow') { for (const e of EYES) x.fill(E(e.cx + e.s * 6, e.cy - 14, 66, 38)); x.globalCompositeOperation = 'destination-out'; x.lineWidth = 2; for (const e of EYES) { x.fill(e.path); x.stroke(e.path); } x.globalCompositeOperation = 'destination-in'; x.fill(FACE); }
  else if (o.k === 'lips') x.fill(LIPS);
  else { x.setTransform(1, 0, 0, 1, 0, 0); x.fillRect(0, 0, o.m.width, o.m.height); } x.globalCompositeOperation = 'source-over'; }
function styled(o) { const x = lctx(o.sty); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, o.sty.width, o.sty.height); toLay(x, o); const c = (o.col || '#000').replace('*', ''), shim = (o.col || '').endsWith('*');
  const paintC = (b) => { if (shim) { const g = x.createLinearGradient(b[0], b[1], b[0] + b[2], b[1] + b[3]); g.addColorStop(0, sh(c, .5)); g.addColorStop(.5, c); g.addColorStop(1, sh(c, -.3)); return g; } return c; };
  if (o.k === 'liner') { x.fillStyle = paintC(o.D.bb); for (const e of EYES) x.fill(linerPath(e, o.st)); }
  else if (o.k === 'lash') { x.fillStyle = c; for (const e of EYES) x.fill(lashes(e, o.st)); }
  else if (o.k === 'brow') { x.fillStyle = rgba(c, .92); for (const e of EYES) x.fill(browPath(e, o.st)); x.strokeStyle = rgba(sh(c, -.3), .7); x.lineWidth = 1; const r = rng(3); for (const e of EYES) { x.save(); x.clip(browPath(e, o.st)); for (let i = 0; i < 30; i++) { const px = e.cx - e.s * 40 + e.s * r() * 96, py = e.cy - 80 + r() * 30; x.beginPath(); x.moveTo(px, py + 6); x.lineTo(px + e.s * 6, py - 2); x.stroke(); } x.restore(); } }
  else if (o.k === 'lips') lipstick(x, c, o.st); }
function lipstick(x, c, st) { const g = x.createLinearGradient(0, 494, 0, 545); g.addColorStop(0, sh(c, -.12)); g.addColorStop(.45, c); g.addColorStop(1, sh(c, .1)); x.fillStyle = g; x.fill(LIPS); x.save(); x.clip(LIPS);
  x.fillStyle = rgba(sh(c, -.35), .35); x.fillRect(450, 490, 100, 20);
  if (st === 'ombre') { const r = x.createRadialGradient(500, 516, 2, 500, 516, 30); r.addColorStop(0, rgba(sh(c, .55), .95)); r.addColorStop(1, rgba(c, 0)); x.fillStyle = r; x.fillRect(450, 490, 100, 60); }
  if (st === 'gloss' || st === 'glitter') { const r = x.createRadialGradient(498, 530, 1, 498, 530, 18); r.addColorStop(0, 'rgba(255,255,255,.62)'); r.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = r; x.beginPath(); x.ellipse(498, 530, 17, 5.5, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.ellipse(486, 503, 6, 2.2, -.3, 0, TAU); x.fill(); x.beginPath(); x.ellipse(514, 503, 6, 2.2, .3, 0, TAU); x.fill(); }
  if (st === 'glitter') { const r = rng(8); for (let i = 0; i < 70; i++) { x.fillStyle = r() < .5 ? 'rgba(255,255,255,.9)' : rgba(sh(c, .6), .9); x.beginPath(); x.arc(458 + r() * 84, 494 + r() * 50, .5 + r() * 1.1, 0, TAU); x.fill(); } }
  if (st === 'matte') { x.fillStyle = rgba(sh(c, .25), .18); x.fillRect(450, 520, 100, 30); }
  x.restore(); }
function compOut(o) { if (o.D.kind !== 'rev') return; const x = lctx(o.out); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, o.out.width, o.out.height); x.drawImage(o.sty, 0, 0); x.globalCompositeOperation = 'destination-in'; x.drawImage(o.c, 0, 0); x.globalCompositeOperation = 'source-over'; }
function setLayStyle(k) { const o = M.lay[k], s = sel[TOOLS.find(t => t.lay === k).k]; if (o.col === s.c && o.st === s.st) return; o.col = s.c; o.st = s.st; styled(o); compOut(o); }
function drawMakeup(x) { for (const k of ORDER) { const o = M.lay[k]; const [bx, by, bw, bh] = o.D.bb; if (o.D.comp) x.globalCompositeOperation = o.D.comp; x.drawImage(o.D.kind === 'rev' ? o.out : o.c, bx, by, bw, bh); x.globalCompositeOperation = 'source-over'; if (k === 'lash') { } }
  mouthLine(x, L.skin); for (const g of M.gems) drawGem(x, g); }
function drawGem(x, g) { const { k, c, x: gx, y: gy } = g, s = g.s || 1;
  if (k === 'heart') gem(x, gx, gy, 7.5 * s, c, 'heart'); else if (k === 'star') gem(x, gx, gy, 6.5 * s, c, 'star'); else if (k === 'gem') gem(x, gx, gy, 4.6 * s, c); else if (k === 'pearl') pearl(x, gx, gy, 4.2 * s);
  else if (k === 'freckle') { const r = rng(Math.round(gx * 7 + gy * 13)); x.fillStyle = rgba(mix(L.skin, '#5a2a14', .55), .55); for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(gx + (r() - .5) * 40 * s, gy + (r() - .5) * 18 * s, 1.3 + r() * 1.3, 0, TAU); x.fill(); } }
  else if (k === 'fly') { x.save(); x.globalAlpha = .9; for (const d of [-1, 1]) { const g2 = x.createRadialGradient(gx + d * 8 * s, gy - 5 * s, 1, gx + d * 8 * s, gy - 5 * s, 12 * s); g2.addColorStop(0, sh(c, .6)); g2.addColorStop(1, c); x.fillStyle = g2; x.beginPath(); x.ellipse(gx + d * 8 * s, gy - 5 * s, 9 * s, 7 * s, d * -.5, 0, TAU); x.fill(); x.beginPath(); x.ellipse(gx + d * 6 * s, gy + 6 * s, 6 * s, 5 * s, d * .5, 0, TAU); x.fill(); } x.fillStyle = '#3a2a4a'; x.beginPath(); x.ellipse(gx, gy, 1.6 * s, 9 * s, 0, 0, TAU); x.fill(); sparkle(x, gx - 9 * s, gy - 6 * s, 3 * s); x.restore(); } }

/* ================= VIEW ================= */
const cv = $('cv'), cx = cv.getContext('2d'), fx = $('fx'), fxx = fx.getContext('2d');
let VW = 0, VH = 0, dpr = 1, land = false, avail = { x: 0, y: 0, w: 1, h: 1 }, bg = null;
const VIEWS = { makeup: [300, 228, 400, 420], hair: [150, 40, 700, 820], acc: [150, 40, 700, 820], dress: [60, 30, 880, 1610], show: [-120, 0, 1240, 1650] };
const cam = { x: 300, y: 228, w: 400, h: 420 }; let zoom = 1, pan = [0, 0];
function target() { const v = VIEWS[state === 'show' ? 'show' : tab]; const z = state === 'show' ? 1 : zoom; const cxw = v[0] + v[2] / 2 + pan[0], cyw = v[1] + v[3] / 2 + pan[1]; return { x: cxw - v[2] / z / 2, y: cyw - v[3] / z / 2, w: v[2] / z, h: v[3] / z }; }
function camXf(c = cam) { const s = Math.min(avail.w / c.w, avail.h / c.h); return { s, ox: avail.x + (avail.w - c.w * s) / 2 - c.x * s, oy: avail.y + (avail.h - c.h * s) / 2 - c.y * s }; }
function layout() { dpr = Math.min(devicePixelRatio || 1, 2.5); VW = innerWidth; VH = innerHeight; land = VW > VH * 1.1; document.body.classList.toggle('land', land);
  for (const c of [cv, fx]) { c.width = Math.round(VW * dpr); c.height = Math.round(VH * dpr); c.style.width = VW + 'px'; c.style.height = VH + 'px'; }
  const pn = $('panel'); const r = pn.hidden ? { width: 0, height: 0 } : pn.getBoundingClientRect();
  avail = state === 'show' ? { x: 0, y: 30, w: VW, h: VH - 120 } : land ? { x: 0, y: 60, w: VW - r.width - 8, h: VH - 64 } : { x: 0, y: 60, w: VW, h: VH - 60 - r.height - 4 };
  bg = cnv(Math.round(VW * dpr), Math.round(VH * dpr)); const b = bg.getContext('2d'); b.scale(dpr, dpr); paintBg(b); dirty = true; }
function paintBg(b) { const g = b.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#ffe6f4'); g.addColorStop(1, '#f2dcff'); b.fillStyle = g; b.fillRect(0, 0, VW, VH); const r = rng(9);
  for (let i = 0; i < 26; i++) { const x = r() * VW, y = r() * VH, rr = 20 + r() * 70; const q = b.createRadialGradient(x, y, 0, x, y, rr); q.addColorStop(0, `rgba(255,255,255,${.25 + r() * .3})`); q.addColorStop(1, 'rgba(255,255,255,0)'); b.fillStyle = q; b.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  b.strokeStyle = 'rgba(255,255,255,.7)'; b.lineWidth = 8; const cxm = avail.x + avail.w / 2, cym = avail.y + avail.h / 2; b.beginPath(); b.ellipse(cxm, cym, avail.w * .46, avail.h * .48, 0, 0, TAU); b.stroke(); b.strokeStyle = 'rgba(255,190,225,.6)'; b.lineWidth = 3; b.beginPath(); b.ellipse(cxm, cym, avail.w * .46 - 9, avail.h * .48 - 9, 0, 0, TAU); b.stroke();
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; const x = cxm + Math.cos(a) * avail.w * .46, y = cym + Math.sin(a) * avail.h * .48; const q = b.createRadialGradient(x, y, 0, x, y, 14); q.addColorStop(0, 'rgba(255,250,220,1)'); q.addColorStop(.4, 'rgba(255,240,180,.8)'); q.addColorStop(1, 'rgba(255,240,180,0)'); b.fillStyle = q; b.fillRect(x - 14, y - 14, 28, 28); } }
let showBg = null, figC = null, figDirty = true, showT0 = 0;
const GUESTS = (() => { const r = (a => () => (a = (a * 16807) % 2147483647) / 2147483647)(7), out = [], skins = ['#ffd9c2', '#f2c09c', '#c98a5e', '#8a5a3a', '#ffe6d6'], hairs = ['#3a2416', '#1c1410', '#d9a64a', '#8a3a1a', '#ece2d0', '#5a3a2a'], cloth = ['#6a2a8a', '#2a3a8a', '#8a1a4a', '#1a5a6a', '#3a1a5a', '#7a4a1a', '#2a2a3a', '#8a2a6a', '#1a3a5a'];
  for (let row = 0; row < 2; row++) { const n = row ? 9 : 8; for (let i = 0; i < n; i++) { const x = (i + .5 + (row ? 0 : .5) - (row ? 0 : .5) + (r() - .5) * .35) / n; out.push({ x, row, sk: skins[(r() * skins.length) | 0], hc: hairs[(r() * hairs.length) | 0], cc: cloth[(r() * cloth.length) | 0], gown: r() < .5, ph: r() * 6, sp: 9 + r() * 5, h: .9 + r() * .2, bun: r() < .4, wave: r() < .15 }); } }
  return out.sort((a, b) => a.row - b.row); })();
function drawCrowd(x, w, h, t) { const base = Math.min(w, h * .62);
  for (const g of GUESTS) { const far = g.row === 0, sc = base * (far ? .085 : .11) * g.h, gx = g.x * w, gy = h * (far ? .64 : .74), dark = far ? .55 : .8;
    x.save(); x.translate(gx, gy); x.scale(sc / 10, sc / 10); x.globalAlpha = dark; const bob = Math.abs(Math.sin(t * g.sp * .5 + g.ph)) * 1.2; x.translate(0, -bob);
    x.fillStyle = g.cc; x.beginPath(); if (g.gown) { x.moveTo(-6, 0); x.lineTo(6, 0); x.lineTo(3, -16); x.lineTo(-3, -16); } else { x.moveTo(-5.5, 0); x.lineTo(5.5, 0); x.lineTo(5, -17); x.lineTo(-5, -17); } x.closePath(); x.fill();
    if (!g.gown) { x.fillStyle = '#fff'; x.beginPath(); x.moveTo(-1.5, -17); x.lineTo(1.5, -17); x.lineTo(0, -12); x.fill(); }
    x.fillStyle = g.sk; x.beginPath(); x.arc(0, -21, 3.6, 0, TAU); x.fill();
    x.fillStyle = g.hc; x.beginPath(); x.arc(0, -22, 3.8, PI, 0); x.fill(); if (g.gown) { x.fillRect(-3.8, -22, 1.6, 6); x.fillRect(2.2, -22, 1.6, 6); } if (g.bun) { x.beginPath(); x.arc(0, -26, 2, 0, TAU); x.fill(); }
    const c = Math.sin(t * g.sp + g.ph), gap = 1 + Math.max(0, c) * 3.2, hy = -13 - (g.wave ? 8 + Math.sin(t * 6 + g.ph) * 2 : 0);
    x.strokeStyle = g.gown ? g.sk : g.cc; x.lineWidth = 1.8; x.lineCap = 'round';
    x.beginPath(); x.moveTo(-4.5, -15); x.lineTo(-gap, hy); x.moveTo(4.5, -15); x.lineTo(gap, hy); x.stroke();
    x.fillStyle = g.sk; x.beginPath(); x.arc(-gap, hy, 1.4, 0, TAU); x.arc(gap, hy, 1.4, 0, TAU); x.fill();
    if (c > .92) { x.globalAlpha = .9; x.strokeStyle = '#fff6c8'; x.lineWidth = .7; for (let k = 0; k < 3; k++) { const a = -PI / 2 + (k - 1) * .6; x.beginPath(); x.moveTo(Math.cos(a) * 2.5, hy + Math.sin(a) * 2.5); x.lineTo(Math.cos(a) * 4.5, hy + Math.sin(a) * 4.5); x.stroke(); } }
    x.restore(); } }
function applause(sec) { for (let i = 0; i < sec * 22; i++) A.noise(.045, 'bandpass', 1100 + Math.random() * 1800, 1.2, .025 + Math.random() * .03, Math.random() * sec); }
function render() { cx.setTransform(1, 0, 0, 1, 0, 0);
  if (state === 'show') { if (!showBg || showBg.width !== cv.width) { showBg = cnv(cv.width, cv.height); ballroom(showBg.getContext('2d'), cv.width, cv.height); } cx.drawImage(showBg, 0, 0); drawCrowd(cx, cv.width, cv.height, performance.now() / 1000);
    if (L) { if (!figC || figC.width !== cv.width || figC.height !== cv.height || figDirty) { figC = cnv(cv.width, cv.height); const f = figC.getContext('2d'); const { s, ox, oy } = camXf(); f.setTransform(s * dpr, 0, 0, s * dpr, ox * dpr, oy * dpr); f.fillStyle = 'rgba(40,0,40,.25)'; f.beginPath(); f.ellipse(500, 1590, 420, 50, 0, 0, TAU); f.fill(); drawFigure(f, L, drawMakeup); figDirty = false; } cx.drawImage(figC, 0, 0); } return; }
  cx.drawImage(bg, 0, 0);
  if (!L) return; const { s, ox, oy } = camXf(); cx.setTransform(s * dpr, 0, 0, s * dpr, ox * dpr, oy * dpr); drawFigure(cx, L, drawMakeup); }
const toWorld = (sx, sy) => { const { s, ox, oy } = camXf(); return [(sx - ox) / s, (sy - oy) / s]; };
const toHead = (wx, wy) => { const p = HI.transformPoint({ x: wx, y: wy }); return [p.x, p.y]; };
const headToScreen = (hx2, hy2) => { const p = HEADM.transformPoint({ x: hx2, y: hy2 }); const { s, ox, oy } = camXf(); return [p.x * s + ox, p.y * s + oy]; };

/* ================= PAINTING ================= */
const sizeK = () => [.55, 1, 1.6][S.size ?? 1];
function dab(x, px, py, r, col, a, hard) { const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, rgba(col, a)); if (hard) g.addColorStop(.55, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
let hue = 0;
function paintSeg(a, b) { const t = TK[tool]; if (tool === 'erase') { eraseSeg(a, b); return; } const o = M.lay[t.lay]; const x = lctx(o.c); x.setTransform(1, 0, 0, 1, 0, 0); const r = t.r * sizeK() * K, d = Math.hypot(b[0] - a[0], b[1] - a[1]) * K, n = Math.max(1, Math.ceil(d / (r * .3)));
  const P0 = [(a[0] - o.D.bb[0]) * K, (a[1] - o.D.bb[1]) * K], P1 = [(b[0] - o.D.bb[0]) * K, (b[1] - o.D.bb[1]) * K]; let col = sel[tool].c || '#000'; const shim = col.endsWith('*'); col = col.replace('*', '');
  for (let i = 1; i <= n; i++) { const t2 = i / n, px = lerp(P0[0], P1[0], t2), py = lerp(P0[1], P1[1], t2);
    if (o.D.kind === 'rev') dab(x, px, py, r, '#ffffff', .55, true);
    else { let c2 = col; if (col === 'rainbow') { hue = (hue + 4) % 360; c2 = hsl(hue); } dab(x, px, py, r, c2, o.D.a * (tool === 'blush' ? 1 : 1));
      if (shim || tool === 'glow') { const rr = rng((px * 31 + py * 17) | 0); for (let k = 0; k < (tool === 'glow' ? 2 : 3); k++) { const q = rr() * TAU, dd = rr() * r * .8; x.fillStyle = rgba(tool === 'glow' ? '#ffffff' : sh(col, .6), .55 + rr() * .4); x.beginPath(); x.arc(px + Math.cos(q) * dd, py + Math.sin(q) * dd, .6 + rr() * 1.4, 0, TAU); x.fill(); } } } }
  x.globalCompositeOperation = 'destination-in'; x.drawImage(o.m, 0, 0); x.globalCompositeOperation = 'source-over'; if (o.D.kind === 'rev') { setLayStyle(o.k); compOut(o); } M.used[tool] = 1; dirty = true; }
const hsl = h => { const f = n => { const k = (n + h / 30) % 12, v = .8 - .42 * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); };
function eraseSeg(a, b) { for (const k of ORDER) { const o = M.lay[k]; const x = lctx(o.c); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-out'; const r = 14 * sizeK() * K, d = Math.hypot(b[0] - a[0], b[1] - a[1]) * K, n = Math.max(1, Math.ceil(d / (r * .3)));
  for (let i = 1; i <= n; i++) { const t2 = i / n; dab(x, (lerp(a[0], b[0], t2) - o.D.bb[0]) * K, (lerp(a[1], b[1], t2) - o.D.bb[1]) * K, r, '#000000', .35); } x.globalCompositeOperation = 'source-over'; compOut(o); }
  M.gems = M.gems.filter(g => Math.hypot(g.x - b[0], g.y - b[1]) > 14 * sizeK()); dirty = true; }
function snap(keys) { const u = { lay: keys.map(k => { const c = cnv(M.lay[k].c.width, M.lay[k].c.height); c.getContext('2d').drawImage(M.lay[k].c, 0, 0); return [k, c, M.lay[k].col, M.lay[k].st]; }), gems: M.gems.slice(), L: JSON.stringify(L), used: { ...M.used } }; M.undo.push(u); if (M.undo.length > 14) M.undo.shift(); $('undoBtn').disabled = false; }
function undo() { const u = M.undo.pop(); if (!u) return; for (const [k, c, col, st] of u.lay) { const o = M.lay[k], x = lctx(o.c); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, o.c.width, o.c.height); x.drawImage(c, 0, 0); if (o.D.kind === 'rev') { o.col = col; o.st = st; if (col) styled(o); compOut(o); } } M.gems = u.gems; L = JSON.parse(u.L); M.used = u.used; A.tone(420, .08, 'triangle', .05); $('undoBtn').disabled = !M.undo.length; renderPanel(); dirty = true; }
function autoApply(k) { const t = TK[k]; if (!t) return; if (k === 'lens' || k === 'erase') return; if (k === 'gems') { snap([]); const s2 = sel.gems.st; for (const e of EYES) M.gems.push({ k: s2, c: sel.gems.c, x: e.cx + e.s * 34, y: e.cy + 36, s: .9 }); M.used.gems = 1; dirty = true; return; }
  const o = M.lay[t.lay]; snap([o.k]); const x = lctx(o.c); x.setTransform(1, 0, 0, 1, 0, 0);
  if (o.D.kind === 'rev') { x.fillStyle = '#fff'; x.fillRect(0, 0, o.c.width, o.c.height); setLayStyle(o.k); compOut(o); }
  else { const pts = k === 'blush' ? EYES.flatMap(e => Array.from({ length: 18 }, (_, i) => [e.cx + e.s * 22 + Math.cos(i * 2.4) * 18, 476 + Math.sin(i * 2.4) * 10])) : k === 'shadow' ? EYES.flatMap(e => Array.from({ length: 22 }, (_, i) => { const tt = .1 + (i % 11) / 11 * .85, p = lidPt(e, tt); return [p[0], p[1] - 9 - (i > 10 ? 9 : 0)]; })) : [...EYES.flatMap(e => [[e.cx + e.s * 26, 452], [e.cx + e.s * 34, 446], [e.cx + e.s * 18, 456]]), [500, 440], [500, 455], [500, 498]];
    const save = S.size; S.size = k === 'blush' ? 1 : 0; for (const p of pts) paintSeg(p, p); S.size = save; }
  M.used[k] = 1; dirty = true; sparkleAt(...headToScreen(500, 430), 18); A.tone(1320, .12, 'sine', .05); A.tone(1760, .16, 'sine', .04, .08); }

/* ================= INPUT ================= */
const ptrs = new Map(); let stroke = null, pinch = null, cursor = null;
cv.addEventListener('pointerdown', e => { if (state !== 'edit') return; A.ac(); cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 2) { stroke = null; A.loopOff('br'); const [p1, p2] = [...ptrs.values()]; pinch = { d: Math.hypot(p1[0] - p2[0], p1[1] - p2[1]), z: zoom, c: [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2], pan: [...pan] }; return; }
  if (tab !== 'makeup') { // tap on figure in other tabs → quick hint
    return; }
  const w = toWorld(e.clientX, e.clientY), h = toHead(...w); cursor = [e.clientX, e.clientY];
  if (tool === 'lens') { const e2 = EYES.find(q => Math.hypot(q.cx - h[0], q.cy - h[1]) < 60); if (e2) { toast(T('בחרו צבע עדשות למטה 👇', 'Pick a lens color below 👇')); } return; }
  if (tool === 'gems') { if (!FACE_HIT(h)) return; snap([]); M.gems.push({ k: sel.gems.st, c: sel.gems.c, x: h[0], y: h[1], s: sizeK() }); M.used.gems = 1; A.tone(1500 + Math.random() * 300, .08, 'sine', .05); A.tone(2200, .1, 'sine', .03, .04); sparkleAt(e.clientX, e.clientY, 8); dirty = true; return; }
  snap(tool === 'erase' ? ORDER : [TK[tool].lay]); stroke = { last: h }; paintSeg(h, h); A.loopOn('br', 'bandpass', tool === 'lips' ? 900 : 2600, 1.4, .035); });
const FACE_HIT = h => { const t = cnv(1, 1).getContext('2d'); return t.isPointInPath(FACE, h[0], h[1]) || h[1] > 560; };
cv.addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (pinch && ptrs.size >= 2) { const [p1, p2] = [...ptrs.values()]; const d = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]); zoom = clamp(pinch.z * d / pinch.d, 1, 3.2); const c = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]; const { s } = camXf(); pan = [pinch.pan[0] - (c[0] - pinch.c[0]) / s, pinch.pan[1] - (c[1] - pinch.c[1]) / s]; clampPan(); Object.assign(cam, target()); dirty = true; return; }
  if (!stroke) return; const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; for (const ev of evs) { const h = toHead(...toWorld(ev.clientX, ev.clientY)); paintSeg(stroke.last, h); stroke.last = h; } cursor = [e.clientX, e.clientY]; });
const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (stroke) { stroke = null; A.loopOff('br'); } cursor = null; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', e => { if (state !== 'edit') return; e.preventDefault(); zoom = clamp(zoom * (e.deltaY < 0 ? 1.12 : .89), 1, 3.2); if (zoom === 1) pan = [0, 0]; clampPan(); Object.assign(cam, target()); dirty = true; }, { passive: false });
function clampPan() { const v = VIEWS[tab]; const m = [v[2] * (1 - 1 / zoom) / 2, v[3] * (1 - 1 / zoom) / 2]; pan = [clamp(pan[0], -m[0], m[0]), clamp(pan[1], -m[1], m[1])]; }

/* ================= TOOL ART ================= */
function toolArt(x, k, col) { col = (col || '#ff4a6a').replace('*', ''); if (col === 'rainbow') col = '#ff9ad8'; x.save(); x.translate(24, 76); x.rotate(PI / 4); x.lineJoin = 'round';
  const tube = (y0, y1, w, c1, c2) => { const g = x.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, c2); g.addColorStop(.4, c1); g.addColorStop(.6, sh(c1, .3)); g.addColorStop(1, c2); x.fillStyle = g; x.beginPath(); x.roundRect(-w, y1, w * 2, y0 - y1, 3); x.fill(); };
  const gold = (y0, y1, w) => tube(y0, y1, w, '#ffe08a', '#b07a1a');
  if (k === 'lips') { x.fillStyle = col; x.beginPath(); x.moveTo(-9, -26); x.lineTo(-9, -2); x.quadraticCurveTo(0, -4, 9, -14); x.lineTo(9, -26); x.closePath(); x.fill(); x.fillStyle = 'rgba(255,255,255,.4)'; x.fillRect(-6, -24, 3, 18); gold(-26, -40, 11); tube(-40, -86, 12, '#3a2a3a', '#140a14'); x.fillStyle = col; x.fillRect(-12, -52, 24, 4); }
  else if (k === 'blush' || k === 'glow') { const g = x.createRadialGradient(-3, -14, 2, 0, -10, 20); g.addColorStop(0, sh(col, .4)); g.addColorStop(1, col); x.fillStyle = g; x.beginPath(); x.ellipse(0, -12, 15, 20, 0, 0, TAU); x.fill(); tube(-28, -40, 8, '#e8e8f0', '#8a8aa0'); tube(-40, -90, 6, k === 'glow' ? '#ffd8ea' : '#ff8ac0', k === 'glow' ? '#c88aa8' : '#c84a8a'); if (k === 'glow') { sparkle(x, 16, -22, 6); sparkle(x, -14, -30, 4); } }
  else if (k === 'shadow') { x.fillStyle = col; x.beginPath(); x.ellipse(0, -8, 7, 11, 0, 0, TAU); x.fill(); tube(-16, -28, 6, '#e8e8f0', '#8a8aa0'); tube(-28, -88, 4.5, '#2a2a3a', '#0a0a14'); }
  else if (k === 'liner' || k === 'brow') { x.fillStyle = col; x.beginPath(); x.moveTo(0, 0); x.lineTo(-6, -18); x.lineTo(6, -18); x.closePath(); x.fill(); if (k === 'brow') { x.fillStyle = '#f0c890'; x.beginPath(); x.moveTo(-3, -9); x.lineTo(-7, -22); x.lineTo(7, -22); x.lineTo(3, -9); x.fill(); tube(-22, -86, 7, sh(col, .25), sh(col, -.3)); } else { tube(-18, -84, 7, '#2a2a3a', '#0a0a14'); x.fillStyle = col; x.fillRect(-7, -70, 14, 5); } }
  else if (k === 'lash') { x.fillStyle = col; x.beginPath(); x.roundRect(-5, -26, 10, 26, 5); x.fill(); x.strokeStyle = sh(col, .4); x.lineWidth = 1; for (let i = 2; i < 25; i += 3) { x.beginPath(); x.moveTo(-6, -i); x.lineTo(6, -i - 1); x.stroke(); } x.fillStyle = '#c8c8d8'; x.fillRect(-1.5, -48, 3, 22); tube(-48, -90, 7, '#ff8ac8', '#b8407a'); }
  else if (k === 'gems') { x.rotate(-PI / 4); gem(x, 0, -6, 13, col); x.restore(); return; }
  else if (k === 'erase') { x.rotate(-PI / 4); x.fillStyle = '#fff'; x.strokeStyle = '#ffb8d8'; x.lineWidth = 2; x.beginPath(); x.arc(4, -14, 20, 0, TAU); x.fill(); x.stroke(); x.strokeStyle = '#ffd8ea'; for (let i = -12; i <= 12; i += 8) { x.beginPath(); x.moveTo(4 + i, -34); x.lineTo(4 + i, 6); x.moveTo(-16, -14 + i); x.lineTo(24, -14 + i); x.stroke(); } x.restore(); return; }
  else if (k === 'lens') { x.rotate(-PI / 4); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(26, -26, 30, 18, 0, 0, TAU); x.fill(); x.strokeStyle = '#2a1418'; x.lineWidth = 3; x.stroke(); const g = x.createRadialGradient(26, -26, 2, 26, -26, 14); g.addColorStop(0, sh(col, .4)); g.addColorStop(1, sh(col, -.4)); x.fillStyle = g; x.beginPath(); x.arc(26, -26, 14, 0, TAU); x.fill(); x.fillStyle = '#140a16'; x.beginPath(); x.arc(26, -26, 6, 0, TAU); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(21, -31, 3.5, 0, TAU); x.fill(); x.restore(); return; }
  x.restore(); }
const iconCache = {};
function icon(k, col) { const key = k + col; if (iconCache[key]) return iconCache[key]; const c = cnv(100, 100); toolArt(c.getContext('2d'), k, col); return iconCache[key] = c.toDataURL(); }

/* ================= THUMBS ================= */
const thCache = {};
function thumb(key, view, fn, w = 96, h = 96) { if (thCache[key]) return thCache[key]; const c = cnv(w, h), x = c.getContext('2d'); const s = Math.min(w / view[2], h / view[3]); x.setTransform(s, 0, 0, s, (w - view[2] * s) / 2 - view[0] * s, (h - view[3] * s) / 2 - view[1] * s); fn(x); return thCache[key] = c.toDataURL(); }
const headXf = x => x.transform(HEADM.a, HEADM.b, HEADM.c, HEADM.d, HEADM.e, HEADM.f);
const thHair = k => thumb('h' + k + L.hc + L.skin + L.cc, [210, 60, 580, 640], x => { const L2 = { ...L, hair: k }; headXf(x); HAIR[k].back(x, L2.hc, L2); drawHeadBase(x, L2); mouthLine(x, L2.skin); HAIR[k].front(x, L2.hc, L2); });
const thAcc = (cat, k) => thumb('a' + cat + k + L.metal + L.gem + L.cc, cat === 'crown' ? [370, 80, 260, 190] : cat === 'ear' ? [610, 410, 80, 120] : cat === 'neck' ? [430, 580, 140, 160] : [560, 180, 120, 130], x => { const L2 = { ...L, [cat]: k }; if (cat !== 'neck') headXf(x); if (cat === 'crown') drawCrown(x, L2, HAIR[L.hair].top); else if (cat === 'ear') drawEarrings(x, L2); else if (cat === 'neck') drawNecklace(x, L2); else drawClip(x, L2); });
const thDress = k => thumb('d' + k + JSON.stringify(L.dc) + L.deco + L.metal, [120, 660, 760, 960], x => drawDress(x, { ...L, dress: k }));

/* ================= PANEL ================= */
const TABS = [['makeup', '💄', N('איפור', 'Makeup')], ['hair', '💇‍♀️', N('שיער', 'Hair')], ['acc', '👑', N('אביזרים', 'Jewels')], ['dress', '👗', N('שמלות', 'Gowns')]];
const ACC = { crown: [['none', '∅'], ['classic'], ['tiara'], ['heart'], ['star'], ['flower'], ['ice']], ear: [['none', '∅'], ['stud'], ['pearl'], ['hoop'], ['drop'], ['star']], neck: [['none', '∅'], ['pearls'], ['heart'], ['gems'], ['choker']], clip: [['none', '∅'], ['bow'], ['flower'], ['butterfly'], ['stars']] };
const ACCN = [['crown', '👑', N('כתר', 'Crown')], ['ear', '✨', N('עגילים', 'Earrings')], ['neck', '📿', N('שרשרת', 'Necklace')], ['clip', '🎀', N('סיכה', 'Hair clip')]];
const DECO = [['none', '∅'], ['sparkle', '✨'], ['stars', '⭐'], ['roses', '🌹'], ['pearls', '⚪'], ['lace', '🤍']];
const swHTML = (c, on, data) => { const bgc = Array.isArray(c) ? `linear-gradient(180deg,${c[0]},${c[1]})` : c === 'rainbow' ? 'conic-gradient(#ff5a8a,#ffd23a,#5aff9a,#5ac8ff,#b87aff,#ff5a8a)' : c.endsWith('*') ? `radial-gradient(circle at 35% 30%,#fff,${c.slice(0, -1)} 45%,${sh(c.slice(0, -1), -.3)})` : c; return `<button class="sw${on ? ' on' : ''}" ${data} style="background:${bgc}"></button>`; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function renderPanel() { $('tabs').innerHTML = TABS.map(([k, ic, n]) => `<button class="tab${k === tab ? ' on' : ''}" data-tab="${k}"><span>${ic}</span>${n}</button>`).join('');
  let tl = '', op = '';
  if (tab === 'makeup') { tl = TOOLS.map(t => `<button class="tl${t.k === tool ? ' on' : ''}" data-tool="${t.k}"><img src="${icon(t.k, sel[t.k].c || (t.k === 'lens' ? L.lens : '#fff'))}" alt=""><small>${t.n}</small>${M.used[t.k] ? '<i></i>' : ''}</button>`).join('');
    const t = TK[tool]; if (tool !== 'lens') op += `<div class="szs">${[0, 1, 2].map(i => `<button class="sz${(S.size ?? 1) === i ? ' on' : ''}" data-size="${i}"><b style="width:${6 + i * 5}px;height:${6 + i * 5}px"></b></button>`).join('')}</div>`;
    if (STY[tool]) op += STY[tool].map(([k, n]) => `<button class="ch${sel[tool].st === k ? ' on' : ''}" data-st="${k}">${n}</button>`).join('') + '<span class="dv"></span>';
    if (t.cols) op += t.cols.map(c => swHTML(c, tool === 'lens' ? L.lens === c : sel[tool].c === c, `data-c="${c}"`)).join('');
    if (tool !== 'lens' && tool !== 'erase') op += `<button class="ch magic" data-magic="1">🪄 ${T('אוטומטי', 'Auto')}</button>`;
    if (tool === 'erase') op += `<button class="ch" data-clear="1">🗑️ ${T('הסירו הכול', 'Remove all')}</button>`; }
  else if (tab === 'hair') { tl = Object.keys(HAIR).map(k => `<button class="tl th${L.hair === k ? ' on' : ''}" data-hair="${k}"><img src="${thHair(k)}" alt=""></button>`).join('');
    op = HAIRC.map(c => swHTML(c, L.hc === c, `data-hc="${c}"`)).join('') + `<span class="dv"></span><span class="lb">🎀</span>` + CCC.map(c => swHTML(c, L.cc === c, `data-cc="${c}"`)).join(''); }
  else if (tab === 'acc') { tl = ACCN.map(([k, ic, n]) => `<button class="tl${accCat === k ? ' on' : ''}" data-cat="${k}"><span class="em">${ic}</span><small>${n}</small></button>`).join('');
    op = ACC[accCat].map(([k, t]) => t ? `<button class="it${L[accCat] === k ? ' on' : ''}" data-acc="${k}"><span class="em">${t}</span></button>` : `<button class="it${L[accCat] === k ? ' on' : ''}" data-acc="${k}"><img src="${thAcc(accCat, k)}" alt=""></button>`).join('') + '<span class="dv"></span>';
    op += (accCat === 'clip' ? CCC.map(c => swHTML(c, L.cc === c, `data-cc="${c}"`)).join('') : Object.keys(METAL).map(m => `<button class="sw metal${L.metal === m ? ' on' : ''}" data-metal="${m}" style="background:linear-gradient(135deg,${METAL[m][0]},${METAL[m][1]} 40%,${METAL[m][2]})"></button>`).join('')) + '<span class="dv"></span>' + GEMC.map(c => swHTML(c, L.gem === c, `data-gem="${c}"`)).join(''); }
  else { tl = Object.keys(DRESS).map(k => `<button class="tl th${L.dress === k ? ' on' : ''}" data-dress="${k}"><img src="${thDress(k)}" alt=""></button>`).join('');
    op = DRESSC.map(c => swHTML(c, same(L.dc, c), `data-dc='${JSON.stringify(c)}'`)).join('') + '<span class="dv"></span>' + DECO.map(([k, ic]) => `<button class="ch${L.deco === k ? ' on' : ''}" data-deco="${k}">${ic}</button>`).join(''); }
  $('tools').innerHTML = tl; $('opts').innerHTML = op; $('magicBtn').hidden = tab !== 'makeup'; }
$('panel').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; A.ac(); const d = b.dataset; let changeL = false;
  if (d.tab) { tab = d.tab; zoom = 1; pan = [0, 0]; A.tone(700, .05, 'triangle', .05); A.noise(.15, 'bandpass', 3000, 1, .03); }
  else if (d.tool) { tool = d.tool; A.tone(880, .05, 'triangle', .05); if (!S.tip || !S.tip[tool]) { S.tip = S.tip || {}; S.tip[tool] = 1; S.save(); toast(TIPS[tool](), 2600); } }
  else if (d.size) { S.size = +d.size; S.save(); }
  else if (d.st) { sel[tool].st = d.st; if (TK[tool].lay) { snap([TK[tool].lay]); setLayStyle(TK[tool].lay); } A.tone(1100, .05, 'sine', .04); }
  else if (d.c) { if (tool === 'lens') { snap([]); L.lens = d.c; changeL = true; sparkleAt(...headToScreen(428, 406), 8); sparkleAt(...headToScreen(572, 406), 8); A.tone(1400, .1, 'sine', .05); } else { sel[tool].c = d.c; if (TK[tool].lay && M.lay[TK[tool].lay].D.kind === 'rev' && M.used[tool]) { snap([TK[tool].lay]); setLayStyle(TK[tool].lay); } A.tone(1000 + Math.random() * 200, .05, 'sine', .04); } }
  else if (d.magic) autoApply(tool);
  else if (d.clear) { snap(ORDER); for (const k of ORDER) { const o = M.lay[k]; lctx(o.c).clearRect(0, 0, o.c.width, o.c.height); compOut(o); } M.gems = []; M.used = {}; A.noise(.4, 'bandpass', 2000, 1, .06, 0, 500); }
  else { snap([]); changeL = true; if (d.hair) L.hair = d.hair; if (d.hc) L.hc = d.hc; if (d.cc) L.cc = d.cc; if (d.cat) { accCat = d.cat; changeL = false; } if (d.acc) { L[accCat] = d.acc; sparkleAt(VW / 2, VH * .3, 10); } if (d.metal) L.metal = d.metal; if (d.gem) L.gem = d.gem; if (d.dress) L.dress = d.dress; if (d.dc) L.dc = JSON.parse(d.dc); if (d.deco) L.deco = d.deco;
    A.tone(900 + Math.random() * 300, .07, 'triangle', .05); A.tone(1500, .08, 'sine', .03, .05); if (d.dress || d.hair) A.noise(.3, 'bandpass', 2500, 1, .05, 0, 800); }
  if (changeL) saveLook(); renderPanel(); requestAnimationFrame(layout); dirty = true; });
const TIPS = { lips: () => T('מרחו באצבע על השפתיים 💋', 'Rub your finger over the lips 💋'), blush: () => T('מרחו בעדינות על הלחיים 🌸', 'Gently brush the cheeks 🌸'), shadow: () => T('מרחו על העפעפיים מעל העיניים 👁️', 'Brush over the eyelids 👁️'), liner: () => T('העבירו אצבע לאורך קו הריסים ✒️', 'Trace along the lash line ✒️'), lash: () => T('העבירו על הריסים כדי להאריך אותם', 'Brush over the lashes to lengthen them'), brow: () => T('העבירו על הגבות', 'Brush over the brows'), glow: () => T('קצת נצנוץ על עצמות הלחיים והאף ✨', 'A little glow on cheekbones and nose ✨'), gems: () => T('הקישו על הפנים כדי להדביק קישוט', 'Tap the face to stick a gem'), lens: () => T('בחרו צבע עיניים 👇', 'Pick an eye color 👇'), erase: () => T('מרחו כדי למחוק איפור', 'Rub to remove makeup') };

/* ================= FLOW ================= */
function saveLook() { const p = S.p[pr.id] = S.p[pr.id] || {}; const { n, id, ...rest } = L; p.L = rest; S.save(); }
async function open(i) { pr = PR[i]; L = look(pr); M = newMakeup(); state = 'edit'; tab = 'makeup'; zoom = 1; pan = [0, 0];
  for (const t of TOOLS) if (t.lay) { const o = M.lay[t.lay]; o.col = sel[t.k].c; o.st = sel[t.k].st; if (o.D.kind === 'rev') styled(o); }
  $('title').hidden = true; $('hud').hidden = false; $('panel').hidden = false; $('showBar').hidden = true; renderPanel(); layout(); Object.assign(cam, target()); dirty = true;
  const sv = await idb.get('mk:' + pr.id); if (sv && M) { M.gems = sv.gems || []; M.used = sv.used || {}; for (const k of ORDER) { const d = sv.lay && sv.lay[k]; if (!d) continue; const o = M.lay[k]; try { const bm = await createImageBitmap(d.c); lctx(o.c).drawImage(bm, 0, 0); } catch (e) { } if (o.D.kind === 'rev' && d.col) { o.col = d.col; o.st = d.st; styled(o); compOut(o); } } renderPanel(); dirty = true; }
  A.startMusic({ chords: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]], bpm: 88, lead: true, vol: .55 });
  if (!S.tut) { S.tut = 1; S.save(); setTimeout(() => toast(T('בחרו כלי איפור ומרחו באצבע על הפנים ✨ אפשר לצבוט בשתי אצבעות כדי להגדיל', 'Pick a makeup tool and rub with your finger ✨ Pinch with two fingers to zoom'), 5200), 600); } }
async function persist() { if (!M || !pr) return; saveLook(); const lay = {}; for (const k of ORDER) { const o = M.lay[k]; const b = await new Promise(r => o.c.toBlob(r, 'image/png')); lay[k] = { c: b, col: o.col, st: o.st }; } await idb.set('mk:' + pr.id, { lay, gems: M.gems, used: M.used });
  const c = portrait(240, 300); S.p[pr.id].th = c.toDataURL('image/jpeg', .82); S.save(); }
function portrait(w, h, view = [140, 30, 720, 900], ball, Lp = L, mk = M ? drawMakeup : null) { const c = cnv(w, h), x = c.getContext('2d'); if (ball) ballroom(x, w, h); else { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffe6f4'); g.addColorStop(1, '#f2dcff'); x.fillStyle = g; x.fillRect(0, 0, w, h); } const s = Math.min(w / view[2], h / view[3]); x.setTransform(s, 0, 0, s, (w - view[2] * s) / 2 - view[0] * s, (h - view[3] * s) / 2 - view[1] * s); drawFigure(x, Lp, mk); return c; }
async function back() { await persist(); showTitle(); }
function score() { const mk = ['lips', 'blush', 'shadow', 'liner', 'lash', 'brow', 'glow', 'gems'].filter(k => M.used[k]).length; const acc = ['crown', 'ear', 'neck', 'clip'].filter(k => L[k] && L[k] !== 'none').length; return Math.min(5, Math.round(mk * .55 + acc * .5 + (L.deco !== 'none' ? .5 : 0))); }
function show() { state = 'show'; $('hud').hidden = true; $('panel').hidden = true; $('showBar').hidden = false; layout(); A.stopMusic(); const n = Math.max(1, score());
  $('showT').textContent = [T('יפהפייה!', 'Beautiful!'), T('מקסימה!', 'Lovely!'), T('מהממת!', 'Stunning!'), T('מלכותית!', 'Royal!'), T('מלכת הנשף! 👑', 'Queen of the ball! 👑')][n - 1]; $('showS').textContent = '⭐'.repeat(n) + '☆'.repeat(5 - n);
  [0, 4, 7, 12, 16].forEach((k, i) => A.tone(523 * Math.pow(2, k / 12), .35, 'triangle', .07, i * .12)); setTimeout(() => A.voice('wow', 1.5), 500); A.noise(1.6, 'bandpass', 1800, .6, .05, .3, 900); applause(4); confetti(); }
async function savePhoto() { const c = portrait(600, 840, [-60, 0, 1120, 1650], true); const url = c.toDataURL('image/jpeg', .85); const alb = (await idb.get('album')) || []; alb.unshift({ id: Date.now(), url, n: pr.id }); await idb.set('album', alb.slice(0, 40)); toast(T('נשמר באלבום המלכותי 📸', 'Saved to the royal album 📸')); A.tone(1800, .05, 'square', .03); A.noise(.12, 'highpass', 4000, 1, .2); flash = 1; }
async function showTitle() { state = 'title'; A.stopMusic(); A.allOff(); $('title').hidden = false; $('hud').hidden = $('panel').hidden = $('showBar').hidden = true; L = null; M = null; dirty = true;
  $('prs').innerHTML = PR.map((p, i) => `<button class="pc" data-i="${i}"><img data-p="${i}" src="${S.p[p.id] && S.p[p.id].th || ''}" alt=""><b>${p.n}</b></button>`).join(''); const ims = [...$('prs').querySelectorAll('img')].filter(im => !im.getAttribute('src'));
  let k = 0; const step = () => { const im = ims[k++]; if (!im) return; if (state !== 'title') return; const p = PR[+im.dataset.p]; im.src = portrait(240, 300, undefined, false, look(p), null).toDataURL('image/jpeg', .85); setTimeout(step, 0); }; setTimeout(step, 30);
  const alb = (await idb.get('album')) || []; $('albW').hidden = !alb.length; $('alb').innerHTML = alb.map(a => `<button class="ab" data-id="${a.id}"><img src="${a.url}" alt=""></button>`).join(''); }
$('prs').onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; A.ac(); A.tone(880, .08, 'triangle', .06); A.tone(1320, .1, 'triangle', .05, .07); open(+b.dataset.i); };
$('alb').onclick = async e => { const b = e.target.closest('[data-id]'); if (!b) return; const alb = (await idb.get('album')) || []; const a = alb.find(q => q.id === +b.dataset.id); if (!a) return; $('pvImg').src = a.url; $('pvSheet').hidden = false; $('pvDel').onclick = async () => { await idb.set('album', alb.filter(q => q !== a)); $('pvSheet').hidden = true; showTitle(); }; };
$('pvClose').onclick = () => $('pvSheet').hidden = true;
let rstArm = 0; function resetAll(force) { if (!pr) return; const n = performance.now(); if (!force && n - rstArm > 2500) { rstArm = n; toast(T('🔄 לחצו שוב כדי למחוק הכול ולהתחיל מחדש', '🔄 Tap again to wipe everything and start over')); return; } rstArm = 0;
  L = Object.assign({}, pr); M = newMakeup(); for (const t of TOOLS) if (t.lay) { const o = M.lay[t.lay]; o.col = sel[t.k].c; o.st = sel[t.k].st; if (o.D.kind === 'rev') styled(o); }
  if (S.p[pr.id]) { delete S.p[pr.id].L; S.save(); } state = 'edit'; $('showBar').hidden = true; $('hud').hidden = false; $('panel').hidden = false; $('undoBtn').disabled = true; renderPanel(); layout(); dirty = true; A.noise(.35, 'highpass', 2500, 1, .08); A.tone(880, .12, 'triangle', .06); toast(T('✨ פנים נקיות – מתחילים מחדש!', '✨ A fresh face – start again!')); }
$('resetBtn').onclick = () => { A.ac(); resetAll(); }; $('shNew').onclick = () => { A.ac(); resetAll(true); };
$('galBtn').onclick = () => back(); $('undoBtn').onclick = () => undo(); $('doneBtn').onclick = () => { A.ac(); show(); }; $('magicBtn').onclick = () => { A.ac(); autoApply(tool); renderPanel(); };
$('shSave').onclick = () => savePhoto(); $('shEdit').onclick = () => { state = 'edit'; $('showBar').hidden = true; $('hud').hidden = false; $('panel').hidden = false; layout(); A.startMusic(); dirty = true; }; $('shHome').onclick = () => back();

/* ================= FX ================= */
const parts = []; let flash = 0;
function sparkleAt(x, y, n = 10) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 1 + Math.random() * 3; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: .7 + Math.random() * .5, s: 4 + Math.random() * 6, st: 1, c: ['#fff', '#ffe08a', '#ffc8e8'][i % 3], g: .03 }); } }
function confetti() { const cols = ['#ff5a8a', '#ffd23a', '#5ac8ff', '#b87aff', '#5aff9a', '#fff']; for (let i = 0; i < 160; i++) parts.push({ x: VW / 2 + (Math.random() - .5) * 80, y: VH * .35, vx: (Math.random() - .5) * 16, vy: -Math.random() * 14 - 3, life: 2.5 + Math.random(), s: 5 + Math.random() * 6, c: cols[i % 6], g: .32, r: Math.random() * 6, vr: (Math.random() - .5) * .3, st: Math.random() < .3 }); }
function hints(t) { if (state !== 'edit' || tab !== 'makeup' || !M || M.used[tool] || stroke) return; const { s, ox, oy } = camXf(); const x = fxx; x.save(); x.setTransform(s * dpr, 0, 0, s * dpr, ox * dpr, oy * dpr); x.transform(HEADM.a, HEADM.b, HEADM.c, HEADM.d, HEADM.e, HEADM.f); x.strokeStyle = `rgba(255,255,255,${.55 + Math.sin(t * 5) * .35})`; x.lineWidth = 2.2 / s; x.setLineDash([5 / s, 5 / s]); x.lineDashOffset = -t * 20 / s;
  const st = p => x.stroke(p); if (tool === 'lips') st(LIPS); else if (tool === 'blush') for (const e of EYES) st(E(e.cx + e.s * 22, 476, 40, 26)); else if (tool === 'shadow') for (const e of EYES) st(E(e.cx + e.s * 6, e.cy - 22, 52, 20)); else if (tool === 'liner' || tool === 'lash') for (const e of EYES) { x.beginPath(); x.moveTo(...e.up[0]); x.bezierCurveTo(...e.up[1], ...e.up[2], ...e.up[3]); x.stroke(); } else if (tool === 'brow') for (const e of EYES) st(browPath(e, 'bold')); else if (tool === 'glow') { for (const e of EYES) st(E(e.cx + e.s * 28, 450, 24, 10)); st(E(500, 448, 7, 18)); }
  x.restore(); }
let last = performance.now();
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000; A.tick();
  if (L) { const tg = target(); for (const k of ['x', 'y', 'w', 'h']) { const d = tg[k] - cam[k]; if (Math.abs(d) > .05) { cam[k] += d * Math.min(1, dt * 7); dirty = true; } else cam[k] = tg[k]; } }
  if (dirty) { dirty = false; figDirty = true; render(); } else if (state === 'show') render();
  fxx.setTransform(1, 0, 0, 1, 0, 0); fxx.clearRect(0, 0, fx.width, fx.height); hints(t); fxx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (state === 'show' && Math.random() < dt * 6) sparkleAt(VW * (.3 + Math.random() * .4), VH * (.15 + Math.random() * .5), 3);
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= .985; p.life -= dt; if (p.r != null) p.r += p.vr; if (p.life <= 0) { parts.splice(i, 1); continue; } fxx.save(); fxx.globalAlpha = Math.min(1, p.life * 2); fxx.translate(p.x, p.y); fxx.rotate(p.r || 0); fxx.fillStyle = p.c; if (p.st) fxx.fill(STAR(0, 0, p.s, p.s * .3, 4)); else fxx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); fxx.restore(); }
  if (cursor && stroke && TK[tool]) { const c = cnv; fxx.save(); fxx.translate(cursor[0], cursor[1]); const sc = .62; fxx.scale(sc, sc); fxx.translate(-24, -76); toolArt(fxx, tool, sel[tool].c); fxx.restore(); }
  if (flash > 0) { flash -= dt * 3; fxx.fillStyle = `rgba(255,255,255,${Math.max(0, flash)})`; fxx.fillRect(0, 0, VW, VH); } }
addEventListener('resize', () => { layout(); Object.assign(cam, target()); });

/* ================= BOOT ================= */
$('galBtn').innerHTML = ICO.grid('#c8407a'); $('undoBtn').innerHTML = ICO.undo('#c8407a'); $('resetBtn').innerHTML = ICO.reset('#c8407a'); $('shNew').textContent = T('🔄 מתחילים מחדש', '🔄 Start over'); $('homeT').innerHTML = ICO.home('#c8407a'); soundButton('sndBtn', S, A, '#c8407a'); hubButtons(['homeT'], A);
$('tSub').textContent = T('בחרו נסיכה, אפרו אותה לפרטי פרטים, סדרו לה תסרוקת, כתר ושמלה – ושלחו אותה לנשף המלכותי ✨', 'Pick a princess, do her makeup in every detail, style her hair, add a crown and gown – then send her to the royal ball ✨');
$('albT').textContent = T('📸 האלבום המלכותי', '📸 Royal album'); $('shSave').textContent = T('📸 שמרו תמונה', '📸 Save photo'); $('shEdit').textContent = T('✏️ המשך', '✏️ Keep styling'); $('shHome').textContent = T('👸 נסיכות', '👸 Princesses'); $('pvDel').textContent = T('🗑️ מחיקה', '🗑️ Delete'); $('pvClose').textContent = T('סגירה', 'Close'); $('doneBtn').textContent = T('לנשף ✨', 'To the ball ✨'); $('magicBtn').textContent = '🪄';
setTimeout(() => { layout(); showTitle(); $('loading').hidden = true; requestAnimationFrame(frame); window.__tgOK = true; }, 20);
window.__tg = { h2s: (a, b) => headToScreen(a, b), open, autoApply, show, back, get state() { return state; }, get L() { return L; }, set tab(v) { tab = v; renderPanel(); layout(); }, set tool(v) { tool = v; renderPanel(); }, sel, PR, setL(o) { Object.assign(L, o); dirty = true; renderPanel(); },
  art() { const c = cnv(720, 491), x = c.getContext('2d'); ballroom(x, 720, 491); const sv = [L, M, tool, pr]; [[2, 130, '#b8001a', 'cat'], [0, 360, '#ff4a6a', 'wing'], [4, 590, '#d42a7a', 'glam']].forEach(([i, cxp, lc, ls]) => { pr = PR[i]; L = look(pr); M = newMakeup(); sel.lips.c = lc; sel.liner.st = ls; for (const t of ['shadow', 'blush', 'liner', 'lash', 'lips', 'glow']) { tool = t; autoApply(t); } const s = 491 / 700; x.setTransform(s, 0, 0, s, cxp - 500 * s, -40 * s); drawFigure(x, L, drawMakeup); }); [L, M, tool, pr] = sv; parts.length = 0; return c.toDataURL('image/jpeg', .9); }
};
