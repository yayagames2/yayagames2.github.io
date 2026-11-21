import { $, clamp, lerp, rng, T, EN, store, audio, toast, ICO, hubButtons, soundButton } from '../lib/kit.js';
const S = store('slime-save', { jars: [], tut: 0, album: {}, pity: 0, made: 0 });
if (!S.album) S.album = {}; if (S.pity == null) S.pity = 0; if (!S.jars) S.jars = [];
const A = audio(S);
const TAU = Math.PI * 2;
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const hx = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const toHex = a => '#' + a.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const mixC = (a, b, t) => { const A2 = hx(a), B = hx(b); return toHex(A2.map((v, i) => lerp(v, B[i], t))); };
const rgba = (c, a) => { const [r, g, b] = hx(c); return `rgba(${r},${g},${b},${a})`; };
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };
const pick = a => a[Math.floor(Math.random() * a.length)];
function hueShift(c, deg) { let [r, g, b] = hx(c).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; const d = mx - mn;
  if (d) { s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } h = (h + deg / 360) % 1; if (h < 0) h += 1;
  const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; return toHex([f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)].map(v => v * 255)); }

/* ================= DATA ================= */
const COLORS = ['#ff6ab8', '#b07aff', '#5ab8ff', '#4ae0b0', '#ffe04a', '#ff9a4a', '#ff4a6a', '#ffffff', '#4ae8e8', '#3a6aff', '#ffb8dc', '#b8f07a'];
const TYPES = [['clear', '💧', T('שקוף', 'Clear')], ['milky', '🥛', T('חלבי', 'Milky')], ['cloud', '☁️', T('ענן', 'Cloud')], ['butter', '🧈', T('חמאה', 'Butter')], ['crunchy', '🫧', T('קראנצ׳י', 'Crunchy')], ['jelly', '🍮', T('ג׳לי', 'Jelly')]];
const TYN = Object.fromEntries(TYPES.map(t => [t[0], t[2]]));
const GLITTER = [['none', '∅'], ['silver', '✨'], ['gold', '🌟'], ['holo', '🌈'], ['hearts', '💗'], ['stars', '⭐']];
const BEADS = [['foam', '🔵', T('כדורי קצף', 'Foam beads')], ['pearl', '⚪', T('פנינים', 'Pearls')], ['sprink', '🍭', T('סוכריות', 'Sprinkles')], ['fish', '🐟', T('דגיגים', 'Fishbowl')]];
const CHARMS = ['🍓', '🦄', '🍩', '⭐', '💎', '🐻', '🌸', '🍒', '🦋', '🍉'];
const SCENTS = [['none', '∅'], ['berry', '🍓'], ['lemon', '🍋'], ['choco', '🍫'], ['candy', '🍬'], ['flower', '🌸']];
const TIERS = [
  { n: T('רגיל', 'Common'), c: '#8a9aa8', g: '⚪', w: 40, fx: T('קלאסי', 'Classic') },
  { n: T('נדיר', 'Rare'), c: '#3a9bff', g: '🔵', w: 28, fx: T('פנינה מנצנצת', 'Pearly shimmer') },
  { n: T('אפי', 'Epic'), c: '#a24bff', g: '🟣', w: 18, fx: T('זוהר בחושך', 'Glow in the dark') },
  { n: T('אגדי', 'Legendary'), c: '#ffb31a', g: '🟡', w: 10, fx: T('משנה צבעים', 'Color-changing') },
  { n: T('מיתי', 'Mythic'), c: '#ff4ab0', g: '🌈', w: 4, fx: T('גלקסיה', 'Galaxy') }];

/* ================= STATE ================= */
let state = 'title', step = 0, sp = null, VW = 0, VH = 0, dpr = 1, panelH = 220, rTier = 0, drops = [], wheel = null, lidT = 0, glue = 0, squeezing = false, cons = 0, folds = 0, swipe = null, tool = 'hand', infl = null, cut = null, cuts = [];
const ST = { GLUE: 0, ACT: 1, KNEAD: 2, ADD: 3, WHEEL: 4, JAR: 5, PLAY: 6 };
const cv = $('cv'), cx = cv.getContext('2d');
function layout() { dpr = Math.min(devicePixelRatio || 1, 2.5); VW = innerWidth; VH = innerHeight; cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr); cv.style.width = VW + 'px'; cv.style.height = VH + 'px'; panelH = $('panel').hidden ? 0 : ($('panel').offsetHeight || panelH); if (blob) relayBlob(); }
const area = () => { const top = 70, bot = VH - panelH - 10; return { x: VW / 2, y: (top + bot) / 2 + 10, h: bot - top, w: VW }; };

/* ================= SLIME BLOB ================= */
const N = 64; let blob = null;
function restShape(seed) { const r = rng(seed); const a = [r() * TAU, r() * TAU, r() * TAU]; return i => { const th = i / N * TAU; return 1 + .05 * Math.sin(3 * th + a[0]) + .035 * Math.sin(5 * th + a[1]) + .02 * Math.sin(7 * th + a[2]); }; }
function makeBlob(spec, at) { const ar = area(); const R = Math.min(ar.w * .34, ar.h * .36, 170); const C = at || [ar.x, ar.y + R * .15]; const rf = restShape(spec.seed);
  const b = { R, C: [...C], rest: [], p: [], v: [], hands: new Map(), dents: [], bubbles: [], spec, rf, born: performance.now() };
  for (let i = 0; i < N; i++) { const th = i / N * TAU, k = rf(i); b.rest.push([C[0] + Math.cos(th) * R * 1.22 * k, C[1] + Math.sin(th) * R * .78 * k]); }
  for (let i = 0; i < N; i++) { b.p.push([C[0] + (b.rest[i][0] - C[0]) * .3, C[1] - R * .6 + (b.rest[i][1] - C[1]) * .3]); b.v.push([0, 0]); }
  const r = rng(spec.seed + 9); b.glit = Array.from({ length: spec.glitter === 'none' && spec.tier !== 4 ? 0 : 70 }, () => ({ th: r() * TAU, f: Math.sqrt(r()) * .9, s: 1.5 + r() * 3, a: r() * TAU }));
  b.beads = []; for (const k of spec.beads || []) for (let i = 0; i < (k === 'fish' ? 5 : 22); i++) b.beads.push({ k, th: r() * TAU, f: Math.sqrt(r()) * .88, s: k === 'fish' ? 14 + r() * 6 : 4 + r() * 4, c: ['#ff8ac8', '#7ad8ff', '#ffe27a', '#7aeaa8', '#ffffff', '#b88aff'][Math.floor(r() * 6)], a: r() * TAU });
  if (spec.type === 'crunchy') for (let i = 0; i < 40; i++) b.beads.push({ k: 'foam', th: r() * TAU, f: Math.sqrt(r()) * .9, s: 3 + r() * 3, c: ['#ffffff', '#ffe0f0', '#e0f0ff'][i % 3], a: 0 });
  b.charms = (spec.charms || []).map((e, i) => ({ e, th: (i / Math.max(1, spec.charms.length)) * TAU + r(), f: .45 + r() * .3 }));
  b.stars = Array.from({ length: spec.tier === 4 ? 40 : 0 }, () => ({ th: r() * TAU, f: Math.sqrt(r()) * .92, s: .8 + r() * 1.8, a: r() * TAU }));
  for (let i = 0; i < 7; i++) b.bubbles.push(newBubble(r)); return b; }
function newBubble(r = Math.random) { return { th: r() * TAU, f: .2 + r() * .65, s: 5 + r() * 9, life: 0 }; }
function relayBlob() { const ar = area(); const R = Math.min(ar.w * .34, ar.h * .36, 170); const C = [ar.x, ar.y + R * .15]; const dx = C[0] - blob.C[0], dy = C[1] - blob.C[1], k = R / blob.R;
  for (let i = 0; i < N; i++) { const th = i / N * TAU, f = blob.rf(i); blob.rest[i] = [C[0] + Math.cos(th) * R * 1.22 * f, C[1] + Math.sin(th) * R * .78 * f]; blob.p[i][0] = C[0] + (blob.p[i][0] - blob.C[0]) * k; blob.p[i][1] = C[1] + (blob.p[i][1] - blob.C[1]) * k; } blob.C = C; blob.R = R; }
function centroid(b) { let x = 0, y = 0; for (const q of b.p) { x += q[0]; y += q[1]; } return [x / N, y / N]; }
function mapPt(b, th, f, c) { const i = ((Math.round(th / TAU * N) % N) + N) % N; const q = b.p[i]; return [c[0] + (q[0] - c[0]) * f, c[1] + (q[1] - c[1]) * f]; }
function stepBlob(b, dt) { const t = performance.now() / 1000; const visc = b.spec.type === 'jelly' ? 2.2 : b.spec.type === 'butter' ? 5 : 3.4, k = b.spec.type === 'jelly' ? 22 : 7;
  const hw = new Array(N).fill(0), ht = new Array(N).fill(null);
  for (const h of b.hands.values()) if (h.mode === 'drag') for (let i = 0; i < N; i++) if (h.w[i] > hw[i]) { hw[i] = h.w[i]; ht[i] = [b.rest[i][0] + h.w[i] * (h.x - h.x0) * 1.05, b.rest[i][1] + h.w[i] * (h.y - h.y0) * 1.05]; }
  for (let i = 0; i < N; i++) { const p = b.p[i], v = b.v[i], r = b.rest[i]; const br = 1 + .012 * Math.sin(t * 1.3 + i * .3);
    const tx = b.C[0] + (r[0] - b.C[0]) * br, ty = b.C[1] + (r[1] - b.C[1]) * br; let fx = (tx - p[0]) * k, fy = (ty - p[1]) * k;
    if (ht[i]) { fx = fx * (1 - hw[i]) + (ht[i][0] - p[0]) * 60 * hw[i]; fy = fy * (1 - hw[i]) + (ht[i][1] - p[1]) * 60 * hw[i]; }
    const a = b.p[(i + N - 1) % N], c = b.p[(i + 1) % N]; fx += ((a[0] + c[0]) / 2 - p[0]) * 90; fy += ((a[1] + c[1]) / 2 - p[1]) * 90;
    v[0] += fx * dt; v[1] += fy * dt; const dm = Math.exp(-visc * dt); v[0] *= dm; v[1] *= dm; }
  for (let i = 0; i < N; i++) { b.p[i][0] += b.v[i][0] * dt; b.p[i][1] += b.v[i][1] * dt; }
  for (const d of b.dents) { d.r = d.held ? Math.min(d.max, d.r + dt * d.max * 3) : d.r; if (!d.held) d.a -= dt * .5; } b.dents = b.dents.filter(d => d.a > 0);
  for (const bb of b.bubbles) bb.life = Math.min(1, bb.life + dt * 1.5); }
function blobPath(b) { const p = b.p; const P = new Path2D(); const m = (i) => [(p[i][0] + p[(i + 1) % N][0]) / 2, (p[i][1] + p[(i + 1) % N][1]) / 2]; let s = m(N - 1); P.moveTo(s[0], s[1]); for (let i = 0; i < N; i++) { const e = m(i); P.quadraticCurveTo(p[i][0], p[i][1], e[0], e[1]); } P.closePath(); return P; }
function slimeCols(spec, t) { let cols = (spec.colors && spec.colors.length ? spec.colors : ['#7ae8c8']).slice(); if (spec.type === 'butter') cols = cols.map(c => mixC(c, '#fff4dc', .4)); if (spec.type === 'cloud') cols = cols.map(c => mixC(c, '#ffffff', .3));
  if (spec.tier === 3) cols = cols.map((c, i) => hueShift(c, t * 50 + i * 40)); if (spec.tier === 4) cols = ['#2a1a6a', '#6a2aa8', '#1a3a8a']; return cols; }
function drawSlime(x, b, t, thumb) { const sp2 = b.spec, c = centroid(b), R = b.R, P = blobPath(b); const cols = slimeCols(sp2, t); const base = cols[0];
  const clear = sp2.type === 'clear' || sp2.type === 'crunchy', alpha = clear ? .62 : 1;
  let minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9; for (const q of b.p) { minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]); minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); }
  x.save(); x.fillStyle = 'rgba(20,60,50,.16)'; x.beginPath(); x.ellipse(c[0], maxY + 4, (maxX - minX) * .52, R * .14, 0, 0, TAU); x.fill(); x.restore();
  x.save(); if (sp2.tier === 2 || sp2.tier === 4) { x.shadowColor = sp2.tier === 4 ? '#b88aff' : base; x.shadowBlur = R * (.35 + .1 * Math.sin(t * 2)); }
  const g = x.createRadialGradient(c[0] - R * .3, minY + (maxY - minY) * .3, R * .1, c[0], c[1], R * 1.3); g.addColorStop(0, rgba(mixC(base, '#ffffff', sp2.type === 'jelly' ? .25 : .4), alpha)); g.addColorStop(.6, rgba(base, alpha)); g.addColorStop(1, rgba(mixC(base, '#000000', .18), alpha));
  x.fillStyle = sp2.tier === 2 ? rgba(mixC(base, '#ffffff', .35), 1) : g; x.fill(P); x.restore();
  x.save(); x.clip(P);
  if (cols.length > 1) { const mixA = sp2.mix == null ? .5 : sp2.mix; x.globalAlpha = (1 - mixA * .6) * (clear ? .6 : .85); for (let k = 0; k < 9; k++) { const col = cols[(k % (cols.length - 1)) + 1]; x.strokeStyle = col; x.lineWidth = R * (.16 + .06 * Math.sin(k)); x.lineCap = 'round'; x.beginPath(); const rr = R * (.15 + k * .11); const a0 = k * 1.3 + t * .08 + (sp2.seed % 7); x.ellipse(c[0], c[1], rr * 1.35, rr * .8, 0, a0, a0 + 2.2 + (k % 3) * .6); x.stroke(); } x.globalAlpha = 1; }
  if (sp2.tier === 4) { for (const s of b.stars) { const [px, py] = mapPt(b, s.th, s.f, c); x.fillStyle = `rgba(255,255,255,${.4 + .6 * Math.abs(Math.sin(t * 2 + s.a))})`; x.beginPath(); x.arc(px, py, s.s, 0, TAU); x.fill(); } const neb = x.createRadialGradient(c[0] + R * .3, c[1], 0, c[0] + R * .3, c[1], R); neb.addColorStop(0, 'rgba(255,90,200,.35)'); neb.addColorStop(1, 'rgba(255,90,200,0)'); x.fillStyle = neb; x.fillRect(c[0] - R * 2, c[1] - R * 2, R * 4, R * 4); }
  if (sp2.type === 'cloud') { const r = rng(sp2.seed); x.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 60; i++) { const [px, py] = mapPt(b, r() * TAU, Math.sqrt(r()) * .9, c); x.beginPath(); x.arc(px, py, 3 + r() * 6, 0, TAU); x.fill(); } }
  for (const d of b.dents) { const gg = x.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r); gg.addColorStop(0, `rgba(0,0,0,${.22 * d.a})`); gg.addColorStop(.7, `rgba(0,0,0,${.08 * d.a})`); gg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gg; x.beginPath(); x.arc(d.x, d.y, d.r, 0, TAU); x.fill(); x.strokeStyle = `rgba(255,255,255,${.4 * d.a})`; x.lineWidth = 2; x.beginPath(); x.arc(d.x - d.r * .1, d.y - d.r * .15, d.r * .75, Math.PI * 1.1, Math.PI * 1.6); x.stroke(); }
  for (const bd of b.beads) { const [px, py] = mapPt(b, bd.th, bd.f, c); if (bd.k === 'fish') { x.save(); x.translate(px, py); x.rotate(Math.sin(t + bd.a) * .4); x.font = `${bd.s}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🐟', 0, 0); x.restore(); continue; }
    if (bd.k === 'sprink') { x.save(); x.translate(px, py); x.rotate(bd.a); x.fillStyle = bd.c === '#ffffff' ? '#ff4a8a' : bd.c; x.fillRect(-bd.s, -bd.s * .3, bd.s * 2, bd.s * .6); x.restore(); continue; }
    const gb = x.createRadialGradient(px - bd.s * .3, py - bd.s * .3, 0, px, py, bd.s); gb.addColorStop(0, '#ffffff'); gb.addColorStop(1, bd.k === 'pearl' ? '#e8e0f0' : bd.c); x.fillStyle = gb; x.beginPath(); x.arc(px, py, bd.s, 0, TAU); x.fill(); }
  const gl = sp2.glitter; for (const gp of b.glit) { const [px, py] = mapPt(b, gp.th, gp.f, c); const tw = .45 + .55 * Math.sin(t * 3 + gp.a * 5); if (gl === 'hearts' || gl === 'stars') { x.fillStyle = gl === 'hearts' ? '#ff4a8a' : '#ffd23a'; x.font = `${gp.s * 3.4}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(gl === 'hearts' ? '♥' : '★', px, py); continue; }
    x.fillStyle = gl === 'gold' || sp2.tier === 4 ? `rgba(255,215,80,${tw})` : gl === 'holo' ? `hsla(${(gp.a * 60 + t * 60) % 360},90%,70%,${tw})` : `rgba(255,255,255,${tw})`; x.save(); x.translate(px, py); x.rotate(gp.a + t * .2); x.fillRect(-gp.s, -gp.s * .35, gp.s * 2, gp.s * .7); x.restore(); }
  for (const ch of b.charms) { const [px, py] = mapPt(b, ch.th, ch.f, c); x.font = `${R * .26}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch.e, px, py); }
  if (!thumb) for (const bb of b.bubbles) { const [px, py] = mapPt(b, bb.th, bb.f, c); const s = bb.s * bb.life; x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 1.5; x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.arc(px, py, s, 0, TAU); x.fill(); x.stroke(); x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(px - s * .35, py - s * .35, s * .25, 0, TAU); x.fill(); }
  if (sp2.tier === 1) { const sx = c[0] + Math.sin(t * .9) * R * 1.3; const sh = x.createLinearGradient(sx - R * .5, minY, sx + R * .5, maxY); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(.5, 'rgba(255,240,255,.55)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = sh; x.fillRect(minX, minY, maxX - minX, maxY - minY); }
  const gloss = sp2.type === 'cloud' || sp2.type === 'butter' ? .25 : sp2.type === 'jelly' ? .85 : .6; x.fillStyle = `rgba(255,255,255,${gloss})`; x.beginPath(); x.ellipse(c[0] - (maxX - minX) * .18, minY + (maxY - minY) * .22, (maxX - minX) * .16, (maxY - minY) * .07, -.2, 0, TAU); x.fill();
  x.beginPath(); x.arc(c[0] + (maxX - minX) * .2, minY + (maxY - minY) * .25, R * .04, 0, TAU); x.fill();
  x.restore(); x.save(); x.strokeStyle = rgba(mixC(base, '#ffffff', .5), sp2.type === 'cloud' ? .2 : .5); x.lineWidth = 2; x.stroke(P); x.restore(); }

function blendCols(cols) { if (!cols.length) return '#cfeee4'; const s = [0, 0, 0]; for (const c of cols) hx(c).forEach((v, i) => s[i] += v / cols.length); return toHex(s); }
function jarG() { const ar = area(); const w = Math.min(ar.w * .42, 190), h = w * 1.05; return { x: ar.x, y: ar.y + ar.h * .5 - h * .55 - 6, w, h }; }
function drawJar(t) { const x = cx, J = jarG(); const shake = wheel && !wheel.done ? Math.sin(t * 40) * 1.2 : lidT > 0 ? Math.sin(t * 60) * 3 * lidT : 0; x.save(); x.translate(J.x + shake, J.y);
  x.fillStyle = 'rgba(20,60,50,.15)'; x.beginPath(); x.ellipse(0, J.h / 2 + 8, J.w * .5, 12, 0, 0, TAU); x.fill();
  x.fillStyle = blendCols(sp.colors); x.beginPath(); x.roundRect(-J.w / 2 + 10, -J.h * .2, J.w - 20, J.h * .68, 26); x.fill();
  x.fillStyle = 'rgba(255,255,255,.3)'; x.beginPath(); x.roundRect(-J.w / 2 + 10, -J.h * .2, J.w - 20, J.h * .68, 26); x.fill();
  x.font = `900 ${J.w * .42}px system-ui`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(255,255,255,.9)'; x.fillText('?', 0, J.h * .14);
  x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 5; x.fillStyle = 'rgba(220,250,240,.25)'; x.beginPath(); x.roundRect(-J.w / 2, -J.h * .32, J.w, J.h * .84, 32); x.fill(); x.stroke();
  x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(-J.w / 2 + 16, -J.h * .2, 10, J.h * .55);
  const lid = lidT > 0 ? -lidT * 14 : 0; x.fillStyle = '#ff6ab8'; x.beginPath(); x.roundRect(-J.w * .42, -J.h * .44 + lid, J.w * .84, J.h * .16, 12); x.fill(); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(-J.w * .38, -J.h * .42 + lid, J.w * .76, 5); x.restore(); }
function wheelG() { const J = jarG(); const R = Math.min(VW * .4, (J.y - J.h * .5 - 80) * .5, 150); return { x: VW / 2, y: J.y - J.h * .5 - R - 26, R }; }
function drawWheel(t) { if (!wheel) return; const x = cx, Wg = wheelG(); if (Wg.R < 40) return; const tot = TIERS.reduce((s, q) => s + q.w, 0); x.save(); x.translate(Wg.x, Wg.y);
  x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = 16; x.fillStyle = '#fff'; x.beginPath(); x.arc(0, 0, Wg.R + 10, 0, TAU); x.fill(); x.shadowBlur = 0;
  let a = wheel.a - Math.PI / 2; TIERS.forEach((q, k) => { const sw = q.w / tot * TAU; x.fillStyle = k === 4 ? `hsl(${t * 120 % 360},85%,62%)` : q.c; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, Wg.R, a, a + sw); x.closePath(); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 3; x.stroke();
    x.save(); x.rotate(a + sw / 2); x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `${Math.max(14, Math.min(26, sw * Wg.R * .32))}px serif`; x.fillText(q.g, Wg.R * .7, 0); if (sw > .5) { x.font = `900 ${Math.min(14, Wg.R * .11)}px system-ui`; x.fillStyle = '#fff'; x.rotate(Math.PI / 2); x.fillText(q.n, 0, -Wg.R * .45); } x.restore(); a += sw; });
  for (let i = 0; i < 24; i++) { const aa = i / 24 * TAU; x.fillStyle = (i + Math.floor(t * 8)) % 3 === 0 ? '#fff6a8' : '#ffffff'; x.beginPath(); x.arc(Math.cos(aa) * (Wg.R + 5), Math.sin(aa) * (Wg.R + 5), 3, 0, TAU); x.fill(); }
  x.fillStyle = '#fff'; x.beginPath(); x.arc(0, 0, Wg.R * .16, 0, TAU); x.fill(); x.fillStyle = '#2fc39a'; x.font = `${Wg.R * .16}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🧪', 0, 1); x.restore();
  x.fillStyle = '#ff3a6a'; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(Wg.x, Wg.y - Wg.R + 14); x.lineTo(Wg.x - 13, Wg.y - Wg.R - 18); x.lineTo(Wg.x + 13, Wg.y - Wg.R - 18); x.closePath(); x.fill(); x.stroke(); }
function tierAt(a) { const tot = TIERS.reduce((s, q) => s + q.w, 0); let u = ((-a) % TAU + TAU) % TAU / TAU * tot; for (let k = 0; k < TIERS.length; k++) { if (u < TIERS[k].w) return k; u -= TIERS[k].w; } return 0; }
function rollTier() { if (!S.made) return 1 + Math.floor(Math.random() * 2); if (S.pity >= 8) return 3 + (Math.random() < .25 ? 1 : 0); const tot = TIERS.reduce((s, q) => s + q.w, 0); let r = Math.random() * tot; for (let k = 0; k < TIERS.length; k++) { if (r < TIERS[k].w) return k; r -= TIERS[k].w; } return 0; }
function spinWheel() { rTier = window.__forceTier ?? (sp && sp.perfect ? Math.max(rollTier(), rollTier()) : rollTier()); const tot = TIERS.reduce((s, q) => s + q.w, 0); let st = 0; for (let k = 0; k < rTier; k++) st += TIERS[k].w; const w = TIERS[rTier].w;
  const nearMiss = rTier < 3 && Math.random() < .55; const u = nearMiss ? (rTier === 2 ? st + w * .93 : st + w * .07) : st + w * (.2 + Math.random() * .6); const target = -(u / tot) * TAU;
  const turns = 5 + Math.floor(Math.random() * 2); const a0 = wheel ? wheel.a : 0; const end = target - turns * TAU - ((a0 % TAU) + TAU) % TAU * 0; wheel = { a: a0, a0, end: end - Math.ceil((a0 - end) / TAU) * 0, t: 0, d: 5.2 + Math.random() * .8, last: tierAt(a0), done: false };
  wheel.end = a0 - (((a0 - target) % TAU + TAU) % TAU) - turns * TAU; A.loopTone('roll', 'triangle', 220, .02); }
function wheelTick(dt) { if (!wheel || wheel.done) return; wheel.t += dt; const p = Math.min(1, wheel.t / wheel.d); const e = 1 - Math.pow(1 - p, 3.4); wheel.a = lerp(wheel.a0, wheel.end, e);
  const seg = Math.floor(-wheel.a / (TAU / 40)); if (seg !== wheel.seg) { wheel.seg = seg; A.tone(900 + (p * 400), .03, 'square', .035); buzz(4); } const tk = tierAt(wheel.a); if (tk !== wheel.last) { wheel.last = tk; if (tk >= 3 && p > .6) { A.tone(1400, .12, 'triangle', .05); } }
  if (p >= 1) { wheel.done = true; A.loopOff('roll'); landed(); } }
function landed() { const q = TIERS[rTier]; flash(.35); [0, 4, 7, 12, 16, 19].slice(0, 2 + rTier).forEach((k, j) => A.tone(523 * Math.pow(2, k / 12), .25, 'triangle', .08, j * .09)); if (rTier >= 3) A.voice('wow', 1.2); buzz(rTier >= 3 ? 120 : 40);
  const el = $('tierB'); el.innerHTML = `<b style="--c:${q.c}">${q.g} ${q.n}${rTier >= 3 ? '!!' : '!'}</b><span>${q.fx}</span>`; el.className = 'tierB on t' + rTier; setTimeout(() => { el.className = 'tierB'; step = ST.JAR; renderPanel(); }, 1700); }


/* ================= BOWL (glue + activator) ================= */
const isClear = t => t === 'clear' || t === 'crunchy' || t === 'jelly';
function bowlG() { const ar = area(); const w = Math.min(ar.w * .78, 340), h = w * .5; return { x: ar.x, y: ar.y + h * .45, w, h }; }
function drawBottle(x, bx, by, ang, col, label, squeeze) { x.save(); x.translate(bx, by); x.rotate(ang); const sq = squeeze ? .9 : 1; x.scale(sq, 1);
  x.fillStyle = col; x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 3; x.beginPath(); x.roundRect(-34, -90, 68, 120, 20); x.fill(); x.stroke();
  x.fillStyle = '#ff6ab8'; x.beginPath(); x.moveTo(-14, 30); x.lineTo(14, 30); x.lineTo(5, 62); x.lineTo(-5, 62); x.closePath(); x.fill();
  x.fillStyle = '#fff'; x.beginPath(); x.roundRect(-26, -60, 52, 46, 10); x.fill(); x.save(); x.translate(0, -37); x.rotate(-ang); x.fillStyle = '#1f5a4a'; x.font = '900 13px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 0, 0); x.restore();
  x.fillStyle = 'rgba(255,255,255,.45)'; x.fillRect(-26, -84, 8, 100); x.restore(); }
function bowlLiquid(x, B, t) { const lvl = glue; if (lvl <= 0) return; const clear = isClear(sp.type); const base = sp.colors.length ? blendCols(sp.colors) : clear ? '#cfeefa' : '#fbfbf6';
  x.save(); x.beginPath(); x.ellipse(B.x, B.y - B.h * .35, B.w / 2 - 6, B.h * .2 - 3, 0, 0, Math.PI); x.ellipse(B.x, B.y + B.h * .25, B.w * .42, B.h * .32, 0, Math.PI, 0, true); x.closePath(); x.clip();
  const sy = B.y + B.h * .5 - lvl * B.h * .78; x.globalAlpha = clear ? .8 : 1; x.fillStyle = base; x.fillRect(B.x - B.w, sy, B.w * 2, B.h * 2);
  sp.colors.forEach((c, i) => { x.strokeStyle = c; x.lineWidth = 14; x.lineCap = 'round'; x.globalAlpha = .9 - cons * .5; for (let k = 0; k < 3; k++) { x.beginPath(); const rr = 30 + k * 34 + i * 10; x.ellipse(B.x, sy + B.h * .22, rr * 1.4, rr * .32, 0, t * .3 + i * 2 + k, t * .3 + i * 2 + k + 1.4); x.stroke(); } }); x.globalAlpha = 1;
  if (cons > .15) { const k = Math.min(1, cons); x.fillStyle = mixC(base, '#ffffff', .2); x.beginPath(); x.ellipse(B.x, sy + 4, B.w * .3 * k + 10, B.h * .2 * k, 0, Math.PI, 0); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.ellipse(B.x - B.w * .1 * k, sy - B.h * .1 * k, B.w * .07 * k, 5, -.2, 0, TAU); x.fill(); }
  x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(B.x - B.w * .14, sy + 6, B.w * .12, 4, 0, 0, TAU); x.fill(); x.restore(); }
function drawBowl(t) { const x = cx, B = bowlG();
  x.save(); x.fillStyle = 'rgba(20,60,50,.15)'; x.beginPath(); x.ellipse(B.x, B.y + B.h * .62, B.w * .45, B.h * .12, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(B.x, B.y - B.h * .35, B.w / 2, B.h * .2, 0, 0, TAU); x.fill(); x.restore();
  bowlLiquid(x, B, t);
  x.save(); const g = x.createLinearGradient(B.x - B.w / 2, 0, B.x + B.w / 2, 0); g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(.5, 'rgba(220,250,240,.45)'); g.addColorStop(1, 'rgba(255,255,255,.75)');
  x.fillStyle = g; x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 4; x.beginPath(); x.ellipse(B.x, B.y - B.h * .35, B.w / 2, B.h * .2, 0, 0, Math.PI); x.ellipse(B.x, B.y + B.h * .25, B.w * .44, B.h * .34, 0, Math.PI, 0, true); x.closePath(); x.globalAlpha = .22; x.fill(); x.globalAlpha = 1; x.stroke();
  x.beginPath(); x.ellipse(B.x, B.y - B.h * .35, B.w / 2, B.h * .2, 0, 0, TAU); x.stroke(); x.restore();
  if (step === ST.GLUE) { const bx = B.x + B.w * .28, by = B.y - B.h * 1.45; drawBottle(x, bx, by, 2.5, isClear(sp.type) ? '#d8f4ff' : '#ffffff', T('דבק', 'GLUE'), squeezing);
    if (squeezing && glue < 1) { const nx = bx + Math.cos(2.5 + Math.PI / 2) * 62, ny = by + Math.sin(2.5 + Math.PI / 2) * 62; const sy = B.y + B.h * .5 - glue * B.h * .78; x.strokeStyle = isClear(sp.type) ? 'rgba(190,235,255,.9)' : '#ffffff'; x.lineWidth = 9 + Math.sin(t * 30) * 1.5; x.lineCap = 'round'; x.beginPath(); x.moveTo(nx, ny); x.quadraticCurveTo(nx - 10, (ny + sy) / 2, B.x + 10, sy); x.stroke(); x.strokeStyle = 'rgba(0,0,0,.06)'; x.lineWidth = 2; x.stroke(); } }
  if (step === ST.ACT) drawBottle(x, B.x - B.w * .32, B.y - B.h * 1.35, -2.6, '#c8f0ff', T('מפעיל', 'ACTIVATOR'), false);
  for (const d of drops) { x.fillStyle = d.c; x.beginPath(); x.ellipse(d.x, d.y, d.r || 9, (d.r || 9) * 1.4, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.arc(d.x - 3, d.y - 4, 3, 0, TAU); x.fill(); } }
function drawGauge(t) { const B = bowlG(), x = cx; const w = Math.min(VW - 60, 300), gx = VW / 2 - w / 2, gy = B.y - B.h * 1.9; if (gy < 80) return; x.save();
  const zones = [[0, .7, '#ffd0a0', T('נוזלי', 'Runny')], [.7, .95, '#7aeaa8', T('מושלם!', 'Perfect!')], [.95, 1.25, '#ff9aa8', T('גומי', 'Rubbery')]];
  for (const [a, b, c, n] of zones) { x.fillStyle = c; x.beginPath(); x.roundRect(gx + a / 1.25 * w, gy, (b - a) / 1.25 * w, 24, 6); x.fill(); x.fillStyle = '#1f5a4a'; x.font = '900 12px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, gx + (a + b) / 2 / 1.25 * w, gy + 12); }
  const px = gx + Math.min(1.25, cons) / 1.25 * w; x.fillStyle = '#1f5a4a'; x.beginPath(); x.moveTo(px, gy - 2); x.lineTo(px - 9, gy - 16); x.lineTo(px + 9, gy - 16); x.closePath(); x.fill(); x.restore(); }

function tapHint(x0, y0, t, label) { const x = cx, p = .5 + .5 * Math.sin(t * 6); x.save(); x.globalAlpha = .55 + .45 * p; x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.arc(x0, y0, 30 + p * 16, 0, TAU); x.fill(); x.font = '54px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.globalAlpha = 1; x.fillText('👆', x0 + 6, y0 + 28 - p * 10);
  x.font = '900 18px system-ui'; x.lineWidth = 5; x.strokeStyle = '#1f7a5a'; x.fillStyle = '#fff'; x.strokeText(label, x0, y0 + 74); x.fillText(label, x0, y0 + 74); x.restore(); }
/* ================= STICKY STRANDS (knead) ================= */
function drawSticky(b, a, t) { if (a <= 0) return; const c = centroid(b), x = cx; const r = rng(77); x.save(); x.globalAlpha = a; x.strokeStyle = 'rgba(255,255,255,.65)'; x.lineWidth = 2;
  for (let i = 0; i < 18; i++) { const i0 = Math.floor(r() * N), q = b.p[i0]; const dx = q[0] - c[0], dy = q[1] - c[1]; const L = 14 + r() * 26 + Math.sin(t * 2 + i) * 6; x.beginPath(); x.moveTo(q[0], q[1]); x.quadraticCurveTo(q[0] + dx * .15 + 6, q[1] + dy * .15 + L * .6, q[0] + dx * .12, q[1] + dy * .12 + L); x.stroke(); }
  x.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 26; i++) { const [px, py] = mapPt(b, r() * TAU, Math.sqrt(r()) * .9, c); x.beginPath(); x.ellipse(px, py, 4 + r() * 8, 2 + r() * 3, r() * 3, 0, TAU); x.fill(); } x.restore(); }
function fold(dir) { if (folds >= 8) return; folds++; const c = centroid(blob); for (let i = 0; i < N; i++) { const q = blob.p[i]; const side = Math.sign(q[0] - c[0]) === -dir ? 1 : 0; blob.v[i][0] += dir * (side ? 420 : 90); blob.v[i][1] -= side ? 170 : 40; }
  sp.mix = Math.min(.95, .2 + folds * .1); A.noise(.4, 'lowpass', 300 + folds * 40, 3, .2, 0, 120); A.tone(140 + folds * 15, .3, 'sine', .08, 0, 80); buzz(18); for (let k = 0; k < 2; k++) setTimeout(() => popAt(c[0] + (Math.random() - .5) * blob.R, c[1] + (Math.random() - .5) * blob.R * .5), 120 + k * 90);
  if (folds >= 8) { A.tone(660, .2, 'triangle', .08); A.tone(990, .3, 'triangle', .07, .1); toast(T('✨ חלק ומבריק!', '✨ Smooth & glossy!'), 1400); } renderPanel(); }

/* ================= PANEL ================= */
const STEPT = [T('🧴 סוחטים דבק', '🧴 Squeeze the glue'), T('🎨 צבע ומפעיל', '🎨 Color & activator'), T('👐 לשים את הסליים', '👐 Knead the slime'), T('✨ תוספות', '✨ Add-ins'), T('🎡 גלגל הכוחות', '🎡 Power wheel'), T('🫙 פותחים את הצנצנת', '🫙 Open the jar'), T('🟢 משחקים!', '🟢 Play time!')];
function renderPanel() { $('stepT').textContent = STEPT[step]; let h = '';
  if (step === ST.GLUE) { h += `<div class="lbl">${T('בחרו סוג סליים', 'Pick a slime type')}</div><div class="row2">${TYPES.map(([k, ic, n]) => `<button class="ch${sp.type === k ? ' on' : ''}" data-ty="${k}">${ic}<small>${n}</small></button>`).join('')}</div>`;
    h += `<div class="meter"><i style="width:${Math.round(glue * 100)}%"></i><span>${glue < 1 ? T('🧴 לחצו והחזיקו על המסך כדי לסחוט דבק', '🧴 Press & hold the screen to squeeze glue') : T('✅ מלא!', '✅ Full!')}</span></div>`;
    h += `<div class="nav1"><button class="btn pri big${glue >= 1 ? ' ready' : ''}" id="nextB" ${glue >= 1 ? '' : 'disabled'}>${T('לצבע ✨', 'Add color ✨')}</button></div>`; }
  else if (step === ST.ACT) { h += `<div class="lbl">${T('טפטפו צבעים (עד 3)', 'Drip colors (up to 3)')}</div><div class="row2">${COLORS.map(c => `<button class="sw${sp.colors.includes(c) ? ' on' : ''}" data-col="${c}" style="background:${c}"></button>`).join('')}</div>`;
    const zone = cons < .7 ? 0 : cons <= .95 ? 1 : 2; h += `<div class="lbl">${[T('💧 הוסיפו מפעיל טיפה־טיפה – עצרו באזור הירוק!', '💧 Add activator drop by drop – stop in the green zone!'), T('🎯 מושלם! עכשיו ללוש', '🎯 Perfect! Time to knead'), T('😬 יצא גומי! קצת קרם ידיים יעזור', '😬 Too rubbery! A little lotion will help')][zone]}</div>`;
    h += `<div class="nav1" style="gap:8px"><button class="btn" id="actB" style="flex:1">💧 ${T('טפטפו מפעיל', 'Add activator')}</button>${zone === 2 ? `<button class="btn" id="lotB">🧴 ${T('קרם', 'Lotion')}</button>` : ''}<button class="btn pri${cons >= .7 ? ' ready' : ''}" id="kneadB" style="flex:1" ${cons >= .7 && sp.colors.length ? '' : 'disabled'}>👐 ${T('ללוש!', 'Knead!')}</button></div>`; }
  else if (step === ST.KNEAD) { h += `<div class="meter"><i style="width:${folds / 8 * 100}%"></i><span>${folds < 8 ? T(`👉 החליקו ימינה ושמאלה כדי לקפל (${folds}/8)`, `👉 Swipe left & right to fold it (${folds}/8)`) : T('✅ חלק ומבריק!', '✅ Smooth & glossy!')}</span></div>`;
    h += `<div class="nav1"><button class="btn pri big${folds >= 8 ? ' ready' : ''}" id="addB" ${folds >= 8 ? '' : 'disabled'}>${T('לתוספות ✨', 'Add-ins ✨')}</button></div>`; }
  else if (step === ST.ADD) { h += `<div class="lbl">${T('נצנצים וחרוזים', 'Glitter & beads')}</div><div class="row2">${GLITTER.map(([k, ic]) => `<button class="ch${sp.glitter === k ? ' on' : ''}" data-gl="${k}">${ic}</button>`).join('')}<span class="sep"></span>${BEADS.map(([k, ic]) => `<button class="ch${sp.beads.includes(k) ? ' on' : ''}" data-bd="${k}">${ic}</button>`).join('')}</div>`;
    h += `<div class="lbl">${T('קישוטים (עד 3) וריח', 'Charms (up to 3) & scent')}</div><div class="row2">${CHARMS.map(e => `<button class="ch${sp.charms.includes(e) ? ' on' : ''}" data-chm="${e}">${e}</button>`).join('')}<span class="sep"></span>${SCENTS.map(([k, ic]) => `<button class="ch${sp.scent === k ? ' on' : ''}" data-sc="${k}">${ic}</button>`).join('')}</div>`;
    h += `<div class="nav1"><button class="btn pri big ready" id="jarB">🎡 ${T('לגלגל הכוחות!', 'Spin the power wheel!')}</button></div>`; }
  else if (step === ST.WHEEL) h += `<div class="hint hb">${wheel ? T('🥁 הגלגל מסתובב…', '🥁 The wheel is spinning…') : T('איזה כוח־על יקבל הסליים?', 'Which superpower will your slime get?')}</div><div class="nav1"><button class="btn pri big ready" id="spinB" ${wheel ? 'disabled' : ''}>🎡 ${T('סובבו!', 'SPIN!')}</button></div>`;
  else if (step === ST.JAR) h += `<div class="hint hb">${T('👆 הקישו על הצנצנת כדי לפתוח!', '👆 Tap the jar to open it!')}</div>`;
  else { const tools = [['hand', '✋', T('מתיחה', 'Stretch')], ['straw', '🥤', T('בועה ענקית', 'Big bubble')], ['knife', '🔪', T('חיתוך', 'Slice')]];
    h += `<div class="row2" style="justify-content:center">${tools.map(([k, ic, n]) => `<button class="ch${tool === k ? ' on' : ''}" data-tool="${k}" style="min-width:86px">${ic}<small>${n}</small></button>`).join('')}</div>`;
    h += `<div class="hint">${{ hand: T('מתחו · לחצו־החזיקו לגומה · פוצצו בועות 🫧', 'Stretch · press & hold to poke · pop bubbles 🫧'), straw: T('לחצו והחזיקו על הסליים כדי לנפח בועה… עד הפיצוץ! 💥', 'Press & hold on the slime to blow a bubble… until it POPS! 💥'), knife: T('החליקו לאורך הסליים כדי לחתוך – קראנץ׳! 🔪', 'Swipe across the slime to slice it – crunch! 🔪') }[tool]}</div><div class="nav1"><button class="btn pri big" id="againB">🧪 ${T('עוד סליים!', 'Make another!')}</button></div>`; }
  $('opts').innerHTML = h; applyBlink(); requestAnimationFrame(() => { const ph = $('panel').offsetHeight; if (Math.abs(ph - panelH) > 4) { panelH = ph; if (blob) relayBlob(); } }); }
function applyBlink() { const q = s2 => $('opts').querySelector(s2); let el = null;
  if (step === ST.GLUE && glue >= 1) el = q('#nextB');
  else if (step === ST.ACT) { if (!sp.colors.length) { $('opts').querySelectorAll('.sw').forEach((b, i) => { b.classList.add('blink'); b.style.animationDelay = (i * .08) + 's'; }); return; } el = cons < .7 ? q('#actB') : cons > .95 ? q('#lotB') : q('#kneadB'); }
  else if (step === ST.KNEAD && folds >= 8) el = q('#addB'); else if (step === ST.ADD) el = q('#jarB'); else if (step === ST.WHEEL && !wheel) el = q('#spinB');
  if (el) el.classList.add('blink'); }
function updMeter() { const m = $('opts').querySelector('.meter i'); if (m) m.style.width = Math.round((step === ST.GLUE ? glue : folds / 8) * 100) + '%'; }
$('opts').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled) return; A.ac(); const d = b.dataset;
  if (d.ty) { sp.type = d.ty; A.tone(400, .1, 'sine', .07, 0, 600); }
  if (d.col) { const i = sp.colors.indexOf(d.col); if (i >= 0) sp.colors.splice(i, 1); else if (sp.colors.length < 3) { const B = bowlG(); drops.push({ x: B.x + (Math.random() - .5) * 80, y: 70, vy: 0, c: d.col, kind: 'col' }); A.tone(900, .08, 'sine', .06, 0, 500); } else toast(T('מקסימום 3 צבעים 🎨', 'Max 3 colors 🎨'), 1200); }
  if (b.id === 'actB') { const B = bowlG(); drops.push({ x: B.x - B.w * .32 + 30, y: B.y - B.h * 1.0, vy: 0, c: '#bfe8ff', kind: 'act', r: 7 }); A.tone(1200, .06, 'sine', .05, 0, 700); return; }
  if (b.id === 'lotB') { cons = Math.max(.75, cons - .2); A.noise(.3, 'lowpass', 600, 2, .08); toast(T('🧴 רך יותר!', '🧴 Softer!'), 900); }
  if (b.id === 'nextB') { step = ST.ACT; A.tone(660, .15, 'triangle', .07); }
  if (b.id === 'kneadB') { step = ST.KNEAD; folds = 0; sp.perfect = cons >= .7 && cons <= .95 ? 1 : 0; sp.mix = .2; renderPanel(); panelH = $('panel').offsetHeight || panelH; blob = makeBlob(sp); blob.sticky = 1; A.noise(.6, 'lowpass', 250, 2, .2, 0, 100); if (sp.perfect) toast(T('🎯 מרקם מושלם! +בונוס בגלגל', '🎯 Perfect texture! +wheel bonus'), 1600); return; }
  if (b.id === 'addB') { step = ST.ADD; }
  if (d.gl) { sp.glitter = d.gl; redecorate(); if (d.gl !== 'none') for (let i = 0; i < 5; i++) A.noise(.08, 'highpass', 5000 + i * 500, 1, .04, i * .08); }
  if (d.bd) { const i = sp.beads.indexOf(d.bd); if (i >= 0) sp.beads.splice(i, 1); else if (sp.beads.length < 2) { sp.beads.push(d.bd); A.tone(300, .12, 'sine', .08, 0, 160); } else toast(T('עד 2 סוגים 🙂', 'Up to 2 kinds 🙂'), 1200); redecorate(); }
  if (d.chm) { const i = sp.charms.indexOf(d.chm); if (i >= 0) sp.charms.splice(i, 1); else if (sp.charms.length < 3) { sp.charms.push(d.chm); A.tone(880, .1, 'triangle', .06); A.tone(1320, .12, 'triangle', .05, .06); } redecorate(); }
  if (d.sc) { sp.scent = d.sc; if (d.sc !== 'none') { A.tone(660, .2, 'sine', .05, 0, 990); toast({ berry: '🍓', lemon: '🍋', choco: '🍫', candy: '🍬', flower: '🌸' }[d.sc] + ' ' + T('מריח מדהים!', 'Smells amazing!'), 1000); } }
  if (b.id === 'jarB') { step = ST.WHEEL; wheel = null; blob = null; A.tone(300, .3, 'sine', .08, 0, 120); A.noise(.3, 'lowpass', 400, 1, .1, .1); }
  if (b.id === 'spinB') { if (!wheel) { spinWheel(); A.tone(200, .4, 'sawtooth', .04, 0, 800); } }
  if (d.tool) { tool = d.tool; A.tone(700, .06, 'triangle', .05); }
  if (b.id === 'againB') { saveCur(); startMake(null); return; }
  renderPanel(); });
function redecorate() { if (!blob) return; const nb = makeBlob(blob.spec); blob.glit = nb.glit; blob.beads = nb.beads; blob.charms = nb.charms; blob.stars = nb.stars; for (let i = 0; i < 6; i++) fx.push({ x: VW / 2 + (Math.random() - .5) * 120, y: 90, vx: (Math.random() - .5) * 60, vy: 100, l: .8, e: '✨', s: 18 }); }

/* ================= FLOW ================= */
function newSpec() { return { type: 'milky', colors: [], glitter: 'none', beads: [], charms: [], scent: 'none', seed: Math.floor(Math.random() * 1e6), tier: 0, mix: .5, perfect: 0 }; }
function startMake(spec) { $('tierB').className = 'tierB'; fx.length = 0; wheel = null; lidT = 0; drops = []; infl = null; cut = null; cuts = []; tool = 'hand'; document.body.classList.remove('dark'); A.loopOff('roll'); A.loopOff('glue'); A.loopOff('infl');
  $('title').hidden = true; $('album').hidden = true; $('panel').hidden = false; $('hud').hidden = false; state = 'make';
  if (spec) { sp = JSON.parse(JSON.stringify(spec)); step = ST.PLAY; rTier = sp.tier; renderPanel(); panelH = $('panel').offsetHeight || panelH; blob = makeBlob(sp); if (sp.tier === 2) document.body.classList.add('dark'); }
  else { sp = newSpec(); blob = null; step = ST.GLUE; glue = 0; cons = 0; folds = 0; renderPanel(); panelH = $('panel').offsetHeight || panelH; if (!S.tut) { S.tut = 1; S.save(); setTimeout(() => toast(T('סוחטים דבק, מטפטפים צבע ומפעיל, לשים – ומסובבים את גלגל הכוחות! 🧪', 'Squeeze glue, drip color & activator, knead – then spin the power wheel! 🧪'), 4200), 500); } }
  A.startMusic({ chords: [[60, 64, 67, 72], [57, 60, 64, 69], [65, 69, 72, 77], [67, 71, 74, 79]], bpm: 90, lead: true, vol: .35 }); }
function openJar() { if (lidT > 0 || step !== ST.JAR) return; lidT = 1; A.tone(500, .1, 'square', .05); A.noise(.4, 'highpass', 3000, 1, .15); buzz(30);
  setTimeout(() => { sp.tier = rTier; S.pity = rTier >= 3 ? 0 : S.pity + 1; S.made++; const key = sp.type + '|' + rTier, isNew = !S.album[key]; S.album[key] = JSON.parse(JSON.stringify(sp)); sp.id = Date.now(); S.jars.unshift(JSON.parse(JSON.stringify(sp))); S.jars = S.jars.slice(0, 30); S.save();
    const J = jarG(); blob = makeBlob(sp, [J.x, J.y + J.h * .1]); for (const v of blob.v) v[1] -= 300; step = ST.PLAY; tool = 'hand'; renderPanel(); lidT = 0; flash(.8); document.body.classList.toggle('dark', rTier === 2);
    A.noise(.8, 'lowpass', 300, 1, .25, 0, 120); A.tone(140, .6, 'sine', .12, 0, 60); [0, 4, 7, 12, 16, 19, 24].slice(0, 3 + rTier).forEach((k, j) => A.tone(523 * Math.pow(2, k / 12), .3, 'triangle', .08, .2 + j * .1)); setTimeout(() => A.voice(rTier >= 3 ? 'wow' : 'yay', 1.3), 300);
    for (let i = 0; i < 16 + rTier * 6; i++) setTimeout(() => burst(VW / 2 + (Math.random() - .5) * VW * .7, VH * .4, 1, rTier >= 3 ? ['⭐', '✨', '💖', '🌟'] : ['✨', '💚', '🫧']), i * 40);
    const q = TIERS[rTier], el = $('tierB'); el.innerHTML = `<b style="--c:${q.c}">${q.g} ${q.n}</b><span>${TYN[sp.type]} · ${q.fx}</span>${isNew ? `<i>${T('חדש באוסף!', 'NEW in your album!')}</i>` : ''}`; el.className = 'tierB on t' + rTier; setTimeout(() => el.className = 'tierB', 3200); }, 600); }
function saveCur() { if (!sp || !sp.id) return; const i = S.jars.findIndex(z => z.id === sp.id); if (i >= 0) S.jars[i] = JSON.parse(JSON.stringify(sp)); S.save(); }
function flash(v) { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = v; requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'opacity .7s'; f.style.opacity = 0; })); }
function showTitle() { saveCur(); state = 'title'; A.stopMusic(); A.loopOff('roll'); A.loopOff('glue'); A.loopOff('infl'); blob = null; document.body.classList.remove('dark'); $('title').hidden = false; $('panel').hidden = true; $('hud').hidden = true; $('album').hidden = true; $('tierB').className = 'tierB';
  $('shelf').innerHTML = S.jars.length ? S.jars.slice(0, 12).map((j, i) => `<button class="tc" data-i="${i}"><img src="${thumb(j)}" alt=""></button>`).join('') : `<p class="empty">${T('עוד אין סליימים – בואו נכין את הראשון! 🧪', 'No slimes yet – let’s make the first! 🧪')}</p>`; $('shelfT').textContent = T('🫙 הצנצנות שלי', '🫙 My jars');
  $('albumBtn').textContent = `📖 ${T('האוסף שלי', 'My album')} ${Object.keys(S.album).length}/${TYPES.length * TIERS.length}`;
  if (!$('demo').src) $('demo').src = thumb({ type: 'jelly', colors: ['#4ae0b0', '#b07aff', '#5ab8ff'], glitter: 'holo', beads: ['foam'], charms: ['🦄'], seed: 7, tier: 1, mix: .4 }, 300, 240); }
function openAlbum() { $('album').hidden = false; let h = `<div class="ahead"><button class="btn" id="aClose">✕</button><h3>📖 ${T('האוסף שלי', 'My album')} · ${Object.keys(S.album).length}/${TYPES.length * TIERS.length}</h3></div><div class="agrid">`;
  for (let k = TIERS.length - 1; k >= 0; k--) { h += `<div class="arow"><span class="tl">${TIERS[k].g} ${TIERS[k].n} · ${TIERS[k].fx}</span><div class="acs">`; for (const [ty, ic, n] of TYPES) { const s2 = S.album[ty + '|' + k]; h += s2 ? `<button class="ac" data-k="${ty}|${k}"><img src="${thumb(s2, 120)}" alt=""><small>${n}</small></button>` : `<span class="ac lock">?<small>${n}</small></span>`; } h += '</div></div>'; }
  $('album').innerHTML = h + '</div>'; $('aClose').onclick = () => { $('album').hidden = true; }; }
$('album').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; A.ac(); startMake(S.album[b.dataset.k]); });
function thumb(spec, w = 200, h = w) { const sv = [VW, VH, panelH]; VW = w; VH = h + 80; panelH = 0; const b = makeBlob({ ...spec, colors: spec.colors || [] }); b.C = [w / 2, h / 2]; b.R = Math.min(w, h) * .33;
  for (let i = 0; i < N; i++) { const th = i / N * TAU, k = b.rf(i); b.p[i] = [w / 2 + Math.cos(th) * b.R * 1.22 * k, h / 2 + Math.sin(th) * b.R * .78 * k]; }
  const c = cnv(w * 2, h * 2), x = c.getContext('2d'); x.scale(2, 2); if (spec.tier === 2 || spec.tier === 4) { x.fillStyle = '#1a1438'; x.fillRect(0, 0, w, h); } drawSlime(x, b, 1, true); [VW, VH, panelH] = sv; return c.toDataURL(); }
$('shelf').onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; A.ac(); startMake(S.jars[+b.dataset.i]); };
$('albumBtn').onclick = () => { A.ac(); openAlbum(); };
$('newBtn').onclick = () => { A.ac(); startMake(null); }; $('backBtn').onclick = () => showTitle();

/* ================= INPUT ================= */
const fx = []; function burst(x, y, n, em) { for (let i = 0; i < n; i++) fx.push({ x: x + (Math.random() - .5) * 40, y, vx: (Math.random() - .5) * 260, vy: -150 - Math.random() * 260, l: 1.1 + Math.random() * .8, e: pick(em), s: 18 + Math.random() * 18 }); }
function popAt(x, y, big) { A.tone((big ? 300 : 1200) + Math.random() * 600, big ? .2 : .05, 'sine', big ? .2 : .08, 0, big ? 60 : 300); A.noise(big ? .5 : .05, big ? 'lowpass' : 'highpass', big ? 900 : 4000, 1, big ? .35 : .12); buzz(big ? 80 : 8); for (let i = 0; i < (big ? 22 : 6); i++) fx.push({ x, y, vx: (Math.random() - .5) * (big ? 700 : 160), vy: (Math.random() - .5) * (big ? 700 : 160), l: big ? .7 : .4, e: '·', s: 22, dot: 1, c: big ? blendCols(sp.colors) : '#fff' }); }
function inBlob(x, y) { return blob && cx.isPointInPath(blobPath(blob), x * dpr, y * dpr) || (blob && Math.hypot(x - centroid(blob)[0], y - centroid(blob)[1]) < blob.R * .9); }
function nearBlob(x, y) { if (inBlob(x, y)) return true; let best = 1e9; for (const q of blob.p) best = Math.min(best, Math.hypot(q[0] - x, q[1] - y)); return best < 40; }
function doPopInfl() { if (!infl) return; const { x, y, r } = infl; infl = null; A.loopOff('infl'); popAt(x, y, true); flash(.15); for (let i = 0; i < N; i++) { const q = blob.p[i]; const dx = q[0] - x, dy = q[1] - y, d = Math.hypot(dx, dy) || 1; const f = Math.max(0, 1 - d / (blob.R * 2)) * 1400 * (r / blob.R); blob.v[i][0] += dx / d * f; blob.v[i][1] += dy / d * f; } blob.dents.push({ x, y, r: r * .9, max: r, a: 1, held: false }); }
function doCut(c) { const L = Math.hypot(c.x - c.x0, c.y - c.y0); if (L < 40) return; const nx = -(c.y - c.y0) / L, ny = (c.x - c.x0) / L; for (let i = 0; i < N; i++) { const q = blob.p[i]; const s = Math.sign((q[0] - c.x0) * nx + (q[1] - c.y0) * ny) || 1; blob.v[i][0] += nx * s * 520; blob.v[i][1] += ny * s * 520; }
  cuts.push({ ...c, a: 1 }); const n = Math.round(L / 18) + (sp.type === 'crunchy' ? 8 : 0); for (let k = 0; k < n; k++) A.noise(.035, 'highpass', 2500 + Math.random() * 3000, 1, sp.type === 'crunchy' ? .16 : .09, k * .022); A.tone(180, .3, 'sine', .06, 0, 90); buzz(25);
  if (sp.type === 'crunchy' || sp.beads.includes('foam')) for (let k = 0; k < 14; k++) { const t2 = Math.random(); fx.push({ x: lerp(c.x0, c.x, t2), y: lerp(c.y0, c.y, t2), vx: (Math.random() - .5) * 200, vy: -100 - Math.random() * 200, l: .7, e: '·', s: 20, dot: 1, c: '#fff' }); } }
cv.addEventListener('pointerdown', e => { if (state === 'title') return; A.ac(); try { cv.setPointerCapture(e.pointerId); } catch (er) { } const x = e.clientX, y = e.clientY;
  if (step === ST.GLUE) { if (glue < 1) { squeezing = true; A.loopTone('glue', 'sine', 110, .04); } return; }
  if (step === ST.KNEAD) { swipe = { x0: x, y0: y, done: false }; return; }
  if (step === ST.JAR) { const J = jarG(); if (Math.abs(x - J.x) < J.w * .8 && Math.abs(y - J.y) < J.h * .9) openJar(); return; }
  if (!blob || (step !== ST.PLAY && step !== ST.ADD)) return; if (step === ST.ADD) { if (inBlob(x, y)) { for (const v of blob.v) v[1] -= 120; A.noise(.3, 'lowpass', 400, 3, .12, 0, 150); } return; }
  const c = centroid(blob);
  if (tool === 'straw') { if (nearBlob(x, y)) { infl = { x, y, r: 6 }; A.loopTone('infl', 'sine', 180, .05); } return; }
  if (tool === 'knife') { cut = { x0: x, y0: y, x, y }; A.tone(2400, .05, 'sine', .04); return; }
  for (let i = blob.bubbles.length - 1; i >= 0; i--) { const bb = blob.bubbles[i]; const [px, py] = mapPt(blob, bb.th, bb.f, c); if (Math.hypot(px - x, py - y) < bb.s + 12 && bb.life > .6) { popAt(px, py); blob.bubbles.splice(i, 1); setTimeout(() => blob && blob.bubbles.push(newBubble()), 1200 + Math.random() * 1500); return; } }
  if (!nearBlob(x, y)) return;
  const w = []; let mx = 0; for (let i = 0; i < N; i++) { const d = Math.hypot(blob.p[i][0] - x, blob.p[i][1] - y); const wi = Math.exp(-(d * d) / (2 * (blob.R * .55) ** 2)); w.push(wi); mx = Math.max(mx, wi); } for (let i = 0; i < N; i++) w[i] /= mx || 1;
  const dent = { x, y, r: 4, max: blob.R * .32, a: 1, held: true }; blob.dents.push(dent);
  blob.hands.set(e.pointerId, { x0: x, y0: y, x, y, t0: performance.now(), mode: 'press', w, dent }); A.noise(.3, 'lowpass', 400, 3, .15, 0, 150); A.tone(160, .25, 'sine', .07, 0, 90); buzz(10); });
cv.addEventListener('pointermove', e => { const x = e.clientX, y = e.clientY;
  if (step === ST.KNEAD && swipe && blob) { const dx = x - swipe.x0; if (Math.abs(dx) > 55 && folds < 8) { fold(Math.sign(dx)); blob.sticky = Math.max(0, 1 - folds / 8); swipe.x0 = x; } return; }
  if (cut) { cut.x = x; cut.y = y; return; }
  if (infl) { infl.x = x; infl.y = y; return; }
  const h = blob && blob.hands.get(e.pointerId); if (!h) return; h.x = x; h.y = y; if (h.mode === 'press' && Math.hypot(x - h.x0, y - h.y0) > 12) { h.mode = 'drag'; h.dent.held = false; h.dent.a = .5; A.tone(200, .4, 'sine', .05, 0, 480); }
  if (h.mode === 'drag' && Math.random() < .14) { const st = Math.hypot(x - h.x0, y - h.y0); A.noise(.1, 'bandpass', 500 + st, 4, .04); } });
const up = e => { if (squeezing) { squeezing = false; A.loopOff('glue'); } swipe = null; if (infl) doPopInfl(); if (cut) { doCut(cut); cut = null; }
  const h = blob && blob.hands.get(e.pointerId); if (!h) return; blob.hands.delete(e.pointerId); const held = performance.now() - h.t0;
  if (h.mode === 'drag') { const st = Math.hypot(h.x - h.x0, h.y - h.y0) / blob.R; A.tone(120 + st * 40, .5, 'sine', .1, 0, 300 + st * 100); A.noise(.4, 'lowpass', 500, 2, .08, 0, 200); buzz(15); }
  else { h.dent.held = false; for (let k = 0; k < 3 + Math.min(4, held / 200); k++) setTimeout(() => popAt(h.x + (Math.random() - .5) * 30, h.y + (Math.random() - .5) * 30), k * 70); } };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

/* ================= LOOP ================= */
$('backBtn').innerHTML = ICO.home('#1f7a5a'); $('homeT').innerHTML = ICO.home('#1f7a5a'); soundButton('sndBtn', S, A, '#1f7a5a'); hubButtons(['homeT'], A); $('newBtn').textContent = T('🧪 סליים חדש!', '🧪 New slime!');
$('tSub').textContent = T('סוחטים דבק, מטפטפים צבע ומפעיל עד המרקם המושלם, לשים, מסובבים את גלגל הכוחות – ואז מנפחים בועות ענק, חותכים ומותחים!', 'Squeeze glue, drip color and activator to the perfect texture, knead, spin the power wheel – then blow giant bubbles, slice and stretch!');
addEventListener('resize', layout);
let last = performance.now();
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(1 / 30, (now - last) / 1000) * (window.__fast || 1); last = now; const t = now / 1000; A.tick(); cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, VW, VH); if (state === 'title') return;
  if (step === ST.GLUE || step === ST.ACT) { if (squeezing && glue < 1) { glue = Math.min(1, glue + dt * .32); updMeter(); if (Math.random() < .3) A.noise(.08, 'lowpass', 300, 2, .05); if (glue >= 1) { squeezing = false; A.loopOff('glue'); A.tone(660, .15, 'triangle', .07); renderPanel(); } }
    const B = bowlG(); for (const d of drops) { d.vy += 1600 * dt; d.y += d.vy * dt; const sy = B.y + B.h * .5 - glue * B.h * .78; if (d.y > sy) { d.done = 1; if (d.kind === 'col') { if (!sp.colors.includes(d.c) && sp.colors.length < 3) sp.colors.push(d.c); A.noise(.12, 'lowpass', 600, 2, .07); }
        else { cons += .09 + Math.random() * .06; A.tone(320 - cons * 100, .2, 'sine', .07, 0, 160); A.noise(.15, 'lowpass', 400, 3, .08); if (cons > 1.25) cons = 1.25; } renderPanel(); } } drops = drops.filter(d => !d.done); drawBowl(t); if (step === ST.ACT) drawGauge(t); }
  if (step === ST.WHEEL || step === ST.JAR) { wheelTick(dt); drawWheel(t); drawJar(t); if (lidT > 0) lidT = Math.max(0, lidT - dt * .6); if (step === ST.JAR && lidT <= 0) { const J = jarG(); tapHint(J.x + J.w * .3, J.y + J.h * .2, t, T('הקישו!', 'Tap!')); } }
  if (step === ST.GLUE && glue < 1 && !squeezing) { const B = bowlG(); tapHint(B.x, B.y - B.h * .2, t, T('לחצו והחזיקו!', 'Press & hold!')); }
  if ((step === ST.KNEAD || step === ST.ADD || step === ST.PLAY) && blob) { for (let k = 0; k < 4; k++) stepBlob(blob, dt / 4); drawSlime(cx, blob, t); if (step === ST.KNEAD) drawSticky(blob, blob.sticky || 0, t);
    if (step === ST.KNEAD && folds < 8) { const c = centroid(blob); cx.font = '40px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.globalAlpha = .85; cx.fillText('👉', c[0] + Math.sin(t * 4) * blob.R * .6, c[1] - blob.R * .9); cx.globalAlpha = 1; }
    if (infl) { infl.r = Math.min(blob.R * .85, infl.r + dt * blob.R * .45); try { A.loop('infl') && A.loop('infl').o && A.loop('infl').o.frequency.setTargetAtTime(180 + infl.r * 4, 0, .05); } catch (er) { }
      const col = blendCols(sp.colors); const g = cx.createRadialGradient(infl.x - infl.r * .35, infl.y - infl.r * .4, infl.r * .1, infl.x, infl.y, infl.r); g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(.6, rgba(mixC(col, '#ffffff', .4), .45)); g.addColorStop(1, rgba(col, .7)); cx.fillStyle = g; cx.beginPath(); cx.arc(infl.x, infl.y - infl.r * .4, infl.r, 0, TAU); cx.fill(); cx.strokeStyle = 'rgba(255,255,255,.8)'; cx.lineWidth = 2; cx.stroke();
      cx.fillStyle = 'rgba(255,255,255,.9)'; cx.beginPath(); cx.ellipse(infl.x - infl.r * .4, infl.y - infl.r * .85, infl.r * .18, infl.r * .1, -.5, 0, TAU); cx.fill(); cx.font = '30px serif'; cx.fillText('🥤', infl.x + infl.r * .2, infl.y + infl.r * .5);
      if (infl.r >= blob.R * .85) doPopInfl(); }
    if (cut) { cx.strokeStyle = '#fff'; cx.lineWidth = 5; cx.lineCap = 'round'; cx.setLineDash([2, 10]); cx.beginPath(); cx.moveTo(cut.x0, cut.y0); cx.lineTo(cut.x, cut.y); cx.stroke(); cx.setLineDash([]); cx.font = '34px serif'; cx.fillText('🔪', cut.x + 10, cut.y - 16); }
    for (const c of cuts) { c.a -= dt * .8; cx.save(); cx.clip(blobPath(blob)); cx.strokeStyle = `rgba(0,0,0,${.25 * c.a})`; cx.lineWidth = 8 * c.a; cx.beginPath(); cx.moveTo(c.x0, c.y0); cx.lineTo(c.x, c.y); cx.stroke(); cx.strokeStyle = `rgba(255,255,255,${.6 * c.a})`; cx.lineWidth = 2; cx.stroke(); cx.restore(); } cuts = cuts.filter(c => c.a > 0); }
  for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.vy += 600 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.l -= dt; if (f.l <= 0) { fx.splice(i, 1); continue; } cx.globalAlpha = Math.min(1, f.l * 1.5); if (f.dot) { cx.fillStyle = f.c || '#fff'; cx.beginPath(); cx.arc(f.x, f.y, 4, 0, TAU); cx.fill(); } else { cx.font = `${f.s}px serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(f.e, f.x, f.y); } cx.globalAlpha = 1; } }
layout(); showTitle(); $('loading').hidden = true; requestAnimationFrame(frame); window.__slOK = true;
window.__sl = { thumb, startMake, get step() { return step; }, set step(v) { step = v; renderPanel(); }, get sp() { return sp; }, setColors(c) { sp.colors = c; glue = 1; cons = .8; renderPanel(); }, knead() { glue = 1; cons = .8; if (!sp.colors.length) sp.colors = ['#ff6ab8', '#5ab8ff']; document.getElementById('opts').innerHTML = '<button id="kneadB"></button>'; document.getElementById('kneadB').click(); }, fold, spin() { step = ST.WHEEL; renderPanel(); spinWheel(); }, force(k) { window.__forceTier = k; }, openJar, get wheel() { return wheel; }, set tool(v) { tool = v; renderPanel(); }, S };
