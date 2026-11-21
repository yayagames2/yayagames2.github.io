import { $, clamp, lerp, rng, T, EN, store, audio, toast, ICO, hubButtons, soundButton } from '../lib/kit.js';
const S = store('cake-save', { cakes: [], tut: 0, album: {}, pity: 0, made: 0 });
if (!S.album) S.album = {}; if (S.pity == null) S.pity = 0; if (!S.cakes) S.cakes = [];
const A = audio(S);
const TAU = Math.PI * 2;
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const hx = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const toHex = a => '#' + a.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const mixC = (a, b, t) => { const A2 = hx(a), B = hx(b); return toHex(A2.map((v, i) => lerp(v, B[i], t))); };
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };
const pick = a => a[Math.floor(Math.random() * a.length)];
const ease = p => 1 - Math.pow(1 - clamp(p, 0, 1), 3);

/* ================= DATA ================= */
const FLAVORS = [['van', '#fff0c8', '🍦', T('וניל', 'Vanilla')], ['choc', '#7a4a2a', '🍫', T('שוקולד', 'Chocolate')], ['straw', '#ff9ac0', '🍓', T('תות', 'Strawberry')], ['mint', '#a8f0c8', '🌿', T('מנטה', 'Mint')],
  ['blue', '#a8b8ff', '🫐', T('אוכמניות', 'Blueberry')], ['lemon', '#fff07a', '🍋', T('לימון', 'Lemon')], ['red', '#d0303a', '❤️', T('רד ולווט', 'Red Velvet')]];
const FL = Object.fromEntries(FLAVORS.map(f => [f[0], f]));
const FROST = ['#ffffff', '#ffd0e4', '#c8e8ff', '#d8ffe0', '#fff2b0', '#e0d0ff', '#6a3a20', '#ff8ab0'];
const TOPS = ['🍓', '🍒', '🕯️', '⭐', '🫐', '🍫', '🌸', '🍬', '🦄', '👑'];
const SPRINK = [['none', '∅'], ['rain', '🌈'], ['dots', '🔵'], ['gold', '🌟'], ['hearts', '💗']];
const TIERS = [
  { n: T('רגיל', 'Common'), c: '#8a9aa8', g: '⚪', w: 40, fx: T('שכבות קלאסיות', 'Classic layers') },
  { n: T('נדיר', 'Rare'), c: '#3a9bff', g: '🔵', w: 28, fx: T('נקודות הפתעה', 'Polka-dot surprise') },
  { n: T('אפי', 'Epic'), c: '#a24bff', g: '🟣', w: 18, fx: T('לב מוסתר', 'Hidden heart') },
  { n: T('אגדי', 'Legendary'), c: '#ffb31a', g: '🟡', w: 10, fx: T('עוגת קשת', 'Rainbow cake') },
  { n: T('מיתי', 'Mythic'), c: '#ff4ab0', g: '🌈', w: 4, fx: T('פיניאטה של ממתקים!', 'Candy piñata!') }];

/* ================= STATE ================= */
let state = 'title', step = 0, sp = null, VW = 0, VH = 0, dpr = 1, panelH = 220, rTier = 0, wheel = null, bake = 0, baking = false, cutLine = null, cutT = -1, pours = [], candies = [], hop = 0;
const cv = $('cv'), cx = cv.getContext('2d');
function layout() { dpr = Math.min(devicePixelRatio || 1, 2.5); VW = innerWidth; VH = innerHeight; cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr); cv.style.width = VW + 'px'; cv.style.height = VH + 'px'; panelH = $('panel').hidden ? 0 : ($('panel').offsetHeight || panelH); }
const area = () => { const top = 70, bot = VH - panelH - 10; return { x: VW / 2, y: (top + bot) / 2 + 10, h: bot - top, w: VW }; };
function cakeG() { const ar = area(); const w = Math.min(ar.w * .66, 300, ar.h * .9), h = w * .52; return { x: ar.x, y: ar.y + ar.h * .5 - h * .45 - 30, w, h, ry: w * .16 }; }

/* ================= DRAWING ================= */
function drips(x, G, col, t) { x.fillStyle = col; x.beginPath(); x.moveTo(G.x - G.w / 2, G.y - G.h); for (let i = 0; i <= 24; i++) { const u = i / 24, px = G.x - G.w / 2 + u * G.w; const dy = Math.sin(u * Math.PI) * G.ry * .9 + (i % 3 === 0 ? G.h * (.22 + .1 * Math.sin(i * 7)) : G.h * .1); x.lineTo(px, G.y - G.h + dy); } x.lineTo(G.x + G.w / 2, G.y - G.h); x.closePath(); x.fill();
  for (let i = 0; i <= 24; i += 3) { const u = i / 24, px = G.x - G.w / 2 + u * G.w; const dy = Math.sin(u * Math.PI) * G.ry * .9 + G.h * (.22 + .1 * Math.sin(i * 7)); x.beginPath(); x.arc(px, G.y - G.h + dy, G.w * .018, 0, TAU); x.fill(); } }
function drawStand(x, G) { x.fillStyle = 'rgba(120,40,40,.14)'; x.beginPath(); x.ellipse(G.x, G.y + G.ry * 1.6, G.w * .62, G.ry * .55, 0, 0, TAU); x.fill();
  x.fillStyle = '#fff'; x.strokeStyle = '#f2d2d2'; x.lineWidth = 3; x.beginPath(); x.ellipse(G.x, G.y + 8, G.w * .66, G.ry * 1.25, 0, 0, TAU); x.fill(); x.stroke(); x.fillStyle = '#ffeef2'; x.beginPath(); x.ellipse(G.x, G.y + 4, G.w * .6, G.ry * 1.05, 0, 0, TAU); x.fill(); }
function drawCake(x, G, spec, t, opts = {}) { const fr = spec.frost; const layers = spec.layers.length ? spec.layers : ['van'];
  x.save(); if (!fr || opts.raw) { const lh = G.h / layers.length; layers.forEach((k, i) => { const col = FL[k][1]; const y0 = G.y - (i + 1) * lh; x.fillStyle = col; x.fillRect(G.x - G.w / 2, y0, G.w, lh + 1); x.fillStyle = 'rgba(0,0,0,.06)'; x.fillRect(G.x - G.w / 2, y0 + lh - 3, G.w, 3); });
      x.fillStyle = mixC(FL[layers[0]][1], '#000000', .12); x.beginPath(); x.ellipse(G.x, G.y, G.w / 2, G.ry, 0, 0, Math.PI); x.fill();
      x.fillStyle = mixC(FL[layers[layers.length - 1]][1], '#ffffff', .15); x.beginPath(); x.ellipse(G.x, G.y - G.h, G.w / 2, G.ry, 0, 0, TAU); x.fill(); x.restore(); return; }
  const side = x.createLinearGradient(G.x - G.w / 2, 0, G.x + G.w / 2, 0); side.addColorStop(0, mixC(fr, '#000000', .1)); side.addColorStop(.35, mixC(fr, '#ffffff', .25)); side.addColorStop(1, mixC(fr, '#000000', .14));
  x.fillStyle = side; x.beginPath(); x.moveTo(G.x - G.w / 2, G.y - G.h); x.lineTo(G.x - G.w / 2, G.y); x.ellipse(G.x, G.y, G.w / 2, G.ry, 0, Math.PI, 0, true); x.lineTo(G.x + G.w / 2, G.y - G.h); x.closePath(); x.fill();
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI; x.fillStyle = mixC(fr, '#ffffff', .35); x.beginPath(); x.arc(G.x - Math.cos(a) * G.w * .49, G.y + Math.sin(a) * G.ry - 2, G.w * .028, 0, TAU); x.fill(); }
  drips(x, G, mixC(fr, '#ffffff', .1), t);
  x.fillStyle = mixC(fr, '#ffffff', .3); x.beginPath(); x.ellipse(G.x, G.y - G.h, G.w / 2, G.ry, 0, 0, TAU); x.fill();
  const r = rng(spec.seed); if (spec.sprink !== 'none') for (let i = 0; i < 60; i++) { const a = r() * TAU, f = Math.sqrt(r()) * .92; const px = G.x + Math.cos(a) * G.w / 2 * f, py = G.y - G.h + Math.sin(a) * G.ry * f; x.save(); x.translate(px, py); x.rotate(r() * 3);
    if (spec.sprink === 'hearts') { x.fillStyle = '#ff4a8a'; x.font = `${G.w * .04}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('♥', 0, 0); } else { x.fillStyle = spec.sprink === 'gold' ? '#ffd23a' : spec.sprink === 'dots' ? pick(['#4ab0ff', '#ff6ab0', '#5ae08a']) : ['#ff4a5a', '#ffa040', '#ffe04a', '#5ae08a', '#4ab0ff', '#a86aff'][i % 6]; if (spec.sprink === 'dots' || spec.sprink === 'gold') { x.beginPath(); x.arc(0, 0, G.w * .009, 0, TAU); x.fill(); } else x.fillRect(-G.w * .016, -G.w * .005, G.w * .032, G.w * .01); } x.restore(); }
  const tops = spec.tops || []; tops.forEach((e, i) => { const a = (i / Math.max(1, tops.length)) * TAU + .4, f = tops.length === 1 ? 0 : .58; const px = G.x + Math.cos(a) * G.w / 2 * f, py = G.y - G.h + Math.sin(a) * G.ry * f; x.font = `${G.w * .14}px serif`; x.textAlign = 'center'; x.textBaseline = 'bottom'; x.fillText(e, px, py + G.w * .03);
    if (e === '🕯️' && !opts.thumb) { x.fillStyle = `rgba(255,220,120,${.3 + .2 * Math.sin(t * 9 + i)})`; x.beginPath(); x.arc(px, py - G.w * .12, G.w * .05, 0, TAU); x.fill(); } });
  x.restore(); }
function drawInside(x, R, spec, t) { const layers = spec.layers.length ? spec.layers : ['van']; const tier = spec.tier; x.save(); x.beginPath(); x.rect(R.x, R.y, R.w, R.h); x.clip();
  if (tier === 3) { const rb = ['#ff4a5a', '#ffa040', '#ffe04a', '#5ae08a', '#4ab0ff', '#a86aff']; rb.forEach((c, i) => { x.fillStyle = c; x.fillRect(R.x, R.y + R.h - (i + 1) * R.h / 6, R.w, R.h / 6 + 1); }); }
  else { const lh = R.h / layers.length; layers.forEach((k, i) => { x.fillStyle = FL[k][1]; x.fillRect(R.x, R.y + R.h - (i + 1) * lh, R.w, lh + 1); if (i) { x.fillStyle = mixC(spec.frost || '#ffffff', '#ffffff', .4); x.fillRect(R.x, R.y + R.h - i * lh - 3, R.w, 6); } }); }
  const r = rng(spec.seed + 3); x.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 80; i++) { x.beginPath(); x.arc(R.x + r() * R.w, R.y + r() * R.h, 1 + r() * 2, 0, TAU); x.fill(); }
  if (tier === 1) { for (let i = 0; i < 26; i++) { x.fillStyle = ['#ff6ab0', '#4ab0ff', '#ffe04a', '#5ae08a', '#a86aff'][i % 5]; x.beginPath(); x.arc(R.x + (.08 + r() * .84) * R.w, R.y + (.1 + r() * .8) * R.h, R.w * (.035 + r() * .025), 0, TAU); x.fill(); } }
  if (tier === 2) { const s = Math.min(R.w, R.h) * .022, cx0 = R.x + R.w / 2, cy0 = R.y + R.h * .52; x.fillStyle = spec.layers[0] === 'red' ? '#ff9ac0' : '#ff3a6a'; x.beginPath(); for (let i = 0; i <= 60; i++) { const a = i / 60 * TAU; const hxp = 16 * Math.sin(a) ** 3, hyp = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); i ? x.lineTo(cx0 + hxp * s, cy0 + hyp * s) : x.moveTo(cx0 + hxp * s, cy0 + hyp * s); } x.fill(); x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.arc(cx0 - 6 * s, cy0 - 5 * s, 3 * s, 0, TAU); x.fill(); }
  if (tier === 3) { for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(255,255,255,${.5 + .5 * Math.sin(t * 4 + i)})`; x.fillRect(R.x + r() * R.w, R.y + r() * R.h, 3, 3); } }
  if (tier === 4) { const g = x.createRadialGradient(R.x + R.w / 2, R.y + R.h / 2, 0, R.x + R.w / 2, R.y + R.h / 2, R.h * .42); g.addColorStop(0, '#3a1a10'); g.addColorStop(1, '#5a2a18'); x.fillStyle = g; x.beginPath(); x.ellipse(R.x + R.w / 2, R.y + R.h / 2, R.w * .32, R.h * .34, 0, 0, TAU); x.fill();
    const em = ['🍬', '🍭', '🍫', '⭐', '💎', '🍬']; for (let i = 0; i < 9; i++) { x.font = `${R.h * .14}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(em[i % em.length], R.x + R.w / 2 + Math.cos(i * 2.4) * R.w * .2, R.y + R.h / 2 + Math.sin(i * 2.4) * R.h * .2); } }
  x.restore(); x.fillStyle = spec.frost || '#fff'; x.fillRect(R.x - 4, R.y - R.h * .1, R.w + 8, R.h * .12); x.fillRect(R.x - R.w * .05, R.y, R.w * .05, R.h); x.fillRect(R.x + R.w, R.y, R.w * .05, R.h); }
function drawPan(x, G, t) { const layers = sp.layers; const fill = Math.min(1, layers.length / 4) * .9; x.save();
  x.fillStyle = 'rgba(120,40,40,.14)'; x.beginPath(); x.ellipse(G.x, G.y + G.ry * 1.3, G.w * .56, G.ry * .5, 0, 0, TAU); x.fill();
  const ph = G.h * 1.0, lh = ph * .9 / 4; layers.forEach((k, i) => { x.fillStyle = FL[k][1]; const yb = G.y - i * lh; x.beginPath(); x.moveTo(G.x - G.w / 2 + 6, yb - lh); x.lineTo(G.x - G.w / 2 + 6, yb); x.ellipse(G.x, yb, G.w / 2 - 6, G.ry * .9, 0, Math.PI, 0, true); x.lineTo(G.x + G.w / 2 - 6, yb - lh); x.closePath(); x.fill(); });
  if (layers.length) { const k = layers[layers.length - 1]; x.fillStyle = mixC(FL[k][1], '#ffffff', .2); x.beginPath(); x.ellipse(G.x, G.y - layers.length * lh, G.w / 2 - 6, G.ry * .9, 0, 0, TAU); x.fill(); }
  x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 4; x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.moveTo(G.x - G.w / 2, G.y - ph); x.lineTo(G.x - G.w / 2, G.y); x.ellipse(G.x, G.y, G.w / 2, G.ry, 0, Math.PI, 0, true); x.lineTo(G.x + G.w / 2, G.y - ph); x.fill(); x.stroke();
  x.beginPath(); x.ellipse(G.x, G.y - ph, G.w / 2, G.ry, 0, 0, TAU); x.stroke(); x.fillStyle = 'rgba(255,255,255,.4)'; x.fillRect(G.x - G.w / 2 + 12, G.y - ph + 12, 8, ph * .8); x.restore();
  for (const p of pours) { x.fillStyle = p.c; x.beginPath(); x.roundRect(p.x - 10, p.y0, 20, p.y - p.y0, 10); x.fill(); } }
function drawOven(t) { const x = cx, ar = area(); const w = Math.min(ar.w * .82, 340), h = w * .82, ox = ar.x - w / 2, oy = ar.y - h / 2 - 10; x.save();
  x.fillStyle = '#f4f0f4'; x.beginPath(); x.roundRect(ox, oy, w, h, 24); x.fill(); x.strokeStyle = '#d8d0d8'; x.lineWidth = 3; x.stroke();
  x.fillStyle = '#e8e0e8'; x.beginPath(); x.roundRect(ox + 14, oy + 12, w - 28, h * .14, 12); x.fill();
  for (let i = 0; i < 3; i++) { const kx = ox + w * (.22 + i * .2), ky = oy + 12 + h * .07; x.fillStyle = '#fff'; x.beginPath(); x.arc(kx, ky, h * .045, 0, TAU); x.fill(); x.strokeStyle = '#b8a8b8'; x.lineWidth = 3; x.beginPath(); x.moveTo(kx, ky); const a = i === 1 ? -Math.PI / 2 + bake * TAU : -Math.PI / 4; x.lineTo(kx + Math.cos(a) * h * .035, ky + Math.sin(a) * h * .035); x.stroke(); }
  x.fillStyle = '#ff6a6a'; x.font = `900 ${h * .07}px system-ui`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(baking ? `${Math.ceil((1 - bake) * 9)}:00`.slice(0, 4) : '0:00', ox + w * .8, oy + 12 + h * .07);
  const wx = ox + w * .1, wy = oy + h * .26, ww = w * .8, wh = h * .62; const gl = x.createLinearGradient(0, wy, 0, wy + wh); gl.addColorStop(0, baking ? '#ffb070' : '#3a2a30'); gl.addColorStop(1, baking ? '#ff7a3a' : '#2a1a20'); x.fillStyle = gl; x.beginPath(); x.roundRect(wx, wy, ww, wh, 16); x.fill();
  x.save(); x.beginPath(); x.roundRect(wx, wy, ww, wh, 16); x.clip(); const G = { x: wx + ww / 2, y: wy + wh * .86, w: ww * .62, h: ww * .62 * .52 * (.45 + .55 * ease(bake)), ry: ww * .62 * .16 }; const rise = { ...sp, frost: null }; drawCake(x, G, rise, t, { raw: 1 });
  x.fillStyle = `rgba(255,${180 + 40 * Math.sin(t * 6)},100,${baking ? .18 : 0})`; x.fillRect(wx, wy, ww, wh); x.strokeStyle = 'rgba(80,60,60,.6)'; x.lineWidth = 3; x.beginPath(); x.moveTo(wx, wy + wh * .9); x.lineTo(wx + ww, wy + wh * .9); x.stroke(); x.restore();
  x.strokeStyle = '#c8b8c8'; x.lineWidth = 6; x.beginPath(); x.roundRect(wx, wy, ww, wh, 16); x.stroke(); x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.moveTo(wx + 20, wy + 10); x.lineTo(wx + 60, wy + 10); x.lineTo(wx + 20, wy + wh - 10); x.closePath(); x.fill(); x.restore(); }
function wheelG() { const G = cakeG(); const R = Math.min(VW * .38, (G.y - G.h - G.ry - 90) * .5, 140); return { x: VW / 2, y: G.y - G.h - G.ry - R - 30, R }; }
function drawWheel(t) { if (!wheel) return; const x = cx, Wg = wheelG(); if (Wg.R < 36) return; const tot = TIERS.reduce((s, q) => s + q.w, 0); x.save(); x.translate(Wg.x, Wg.y);
  for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; x.fillStyle = '#fff'; x.beginPath(); x.arc(Math.cos(a) * (Wg.R + 8), Math.sin(a) * (Wg.R + 8), 9, 0, TAU); x.fill(); }
  x.fillStyle = '#fff'; x.beginPath(); x.arc(0, 0, Wg.R + 6, 0, TAU); x.fill();
  let a = wheel.a - Math.PI / 2; TIERS.forEach((q, k) => { const sw = q.w / tot * TAU; x.fillStyle = k === 4 ? `hsl(${t * 120 % 360},85%,65%)` : mixC(q.c, '#ffffff', .15); x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, Wg.R, a, a + sw); x.closePath(); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 3; x.stroke();
    x.save(); x.rotate(a + sw / 2); x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `${Math.max(13, Math.min(26, sw * Wg.R * .3))}px serif`; x.fillText(['🍰', '🔵', '💗', '🌈', '🍬'][k], Wg.R * .7, 0); x.restore(); a += sw; });
  x.fillStyle = '#fff'; x.beginPath(); x.arc(0, 0, Wg.R * .18, 0, TAU); x.fill(); x.font = `${Wg.R * .17}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🎂', 0, 1); x.restore();
  x.fillStyle = '#ff3a6a'; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(Wg.x, Wg.y - Wg.R + 12); x.lineTo(Wg.x - 13, Wg.y - Wg.R - 20); x.lineTo(Wg.x + 13, Wg.y - Wg.R - 20); x.closePath(); x.fill(); x.stroke(); }
function tierAt(a) { const tot = TIERS.reduce((s, q) => s + q.w, 0); let u = ((-a) % TAU + TAU) % TAU / TAU * tot; for (let k = 0; k < TIERS.length; k++) { if (u < TIERS[k].w) return k; u -= TIERS[k].w; } return 0; }
function rollTier() { if (!S.made) return 1 + Math.floor(Math.random() * 2); if (S.pity >= 8) return 3 + (Math.random() < .25 ? 1 : 0); const tot = TIERS.reduce((s, q) => s + q.w, 0); let r = Math.random() * tot; for (let k = 0; k < TIERS.length; k++) { if (r < TIERS[k].w) return k; r -= TIERS[k].w; } return 0; }
function spinWheel() { rTier = window.__forceTier ?? rollTier(); const tot = TIERS.reduce((s, q) => s + q.w, 0); let st = 0; for (let k = 0; k < rTier; k++) st += TIERS[k].w; const w = TIERS[rTier].w;
  const nearMiss = rTier < 3 && Math.random() < .55; const u = nearMiss ? (rTier === 2 ? st + w * .93 : st + w * .07) : st + w * (.2 + Math.random() * .6); const target = -(u / tot) * TAU; const turns = 5 + Math.floor(Math.random() * 2);
  const a0 = wheel ? wheel.a : 0; wheel = { a: a0, a0, end: a0 - (((a0 - target) % TAU + TAU) % TAU) - turns * TAU, t: 0, d: 5.2 + Math.random() * .8, last: tierAt(a0), done: false }; A.loopTone('roll', 'triangle', 220, .02); }
function wheelTick(dt) { if (!wheel || wheel.done) return; wheel.t += dt; const p = Math.min(1, wheel.t / wheel.d); const e = 1 - Math.pow(1 - p, 3.4); wheel.a = lerp(wheel.a0, wheel.end, e);
  const seg = Math.floor(-wheel.a / (TAU / 36)); if (seg !== wheel.seg) { wheel.seg = seg; A.tone(900 + p * 400, .03, 'square', .035); buzz(4); } const tk = tierAt(wheel.a); if (tk !== wheel.last) { wheel.last = tk; if (tk >= 3 && p > .6) A.tone(1400, .12, 'triangle', .05); }
  if (p >= 1) { wheel.done = true; A.loopOff('roll'); landed(); } }
function landed() { const q = TIERS[rTier]; flash(.35); [0, 4, 7, 12, 16, 19].slice(0, 2 + rTier).forEach((k, j) => A.tone(523 * Math.pow(2, k / 12), .25, 'triangle', .08, j * .09)); if (rTier >= 3) A.voice('wow', 1.2); buzz(rTier >= 3 ? 120 : 40);
  const el = $('tierB'); el.innerHTML = `<b style="--c:${q.c}">${q.g} ${q.n}${rTier >= 3 ? '!!' : '!'}</b><span>${T('מה מסתתר בפנים…?', 'What’s hiding inside…?')}</span>`; el.className = 'tierB on t' + rTier; setTimeout(() => { el.className = 'tierB'; step = 4; wheel = null; renderPanel(); }, 1700); }

/* ================= PANEL ================= */
const STEPT = [T('🥣 שופכים שכבות', '🥣 Pour the layers'), T('🔥 אופים!', '🔥 Baking!'), T('🎨 מקשטים', '🎨 Decorate'), T('🎡 מה בפנים?!', '🎡 What’s inside?!'), T('🔪 חותכים!', '🔪 Cut it!'), T('🎂 העוגה שלכם!', '🎂 Your cake!')];
function renderPanel() { $('stepT').textContent = STEPT[step]; let h = '';
  if (step === 0) { h += `<div class="lbl">${T('בחרו טעמים לשכבות (עד 4) – כל לחיצה שופכת שכבה', 'Pick flavors for the layers (up to 4) – each tap pours one')}</div><div class="row2">${FLAVORS.map(([k, c, ic, n]) => `<button class="ch" data-fl="${k}" style="background:${c};color:${k === 'choc' || k === 'red' ? '#fff' : '#7a2a2a'}">${ic}<small>${n}</small></button>`).join('')}</div>`;
    h += `<div class="lbl">${sp.layers.length ? sp.layers.map(k => FL[k][2]).join(' ') : '…'}</div><div class="nav1">${sp.layers.length ? `<button class="btn" id="undoB" style="margin-inline-end:8px">↩️</button>` : ''}<button class="btn pri big${sp.layers.length >= 2 ? ' ready' : ''}" id="bakeB" ${sp.layers.length ? '' : 'disabled'}>🔥 ${T('לתנור!', 'Into the oven!')}</button></div>`; }
  else if (step === 1) h += `<div class="hint hb">${bake < 1 ? T('⏳ העוגה תופחת…', '⏳ The cake is rising…') : T('🔔 דינג! מוכן!', '🔔 Ding! Ready!')}</div><div class="nav1"><button class="btn pri big ready" id="outB" ${bake < 1 ? 'disabled' : ''}>🧤 ${T('להוציא מהתנור', 'Take it out')}</button></div>`;
  else if (step === 2) { h += `<div class="lbl">${T('ציפוי', 'Frosting')}</div><div class="row2">${FROST.map(c => `<button class="sw${sp.frost === c ? ' on' : ''}" data-fr="${c}" style="background:${c}"></button>`).join('')}<span class="sep"></span>${SPRINK.map(([k, ic]) => `<button class="ch${sp.sprink === k ? ' on' : ''}" data-spk="${k}">${ic}</button>`).join('')}</div>`;
    h += `<div class="lbl">${T('קישוטים למעלה (עד 5)', 'Toppings (up to 5)')}</div><div class="row2">${TOPS.map(e => `<button class="ch${sp.tops.includes(e) ? ' on' : ''}" data-tp="${e}">${e}</button>`).join('')}</div>`;
    h += `<div class="nav1"><button class="btn pri big ready" id="spinB">🎡 ${T('מה מסתתר בפנים?', 'What’s inside?')}</button></div>`; }
  else if (step === 3) h += `<div class="hint hb">${T('🥁 הגלגל מסתובב…', '🥁 The wheel is spinning…')}</div>`;
  else if (step === 4) h += `<div class="hint hb">${T('🔪 החליקו את האצבע לאורך העוגה כדי לחתוך!', '🔪 Swipe down across the cake to slice it!')}</div>`;
  else h += `<div class="hint">${T('🎉 הקישו על העוגה לחגוג שוב', '🎉 Tap the cake to celebrate again')}</div><div class="nav1"><button class="btn pri big ready" id="againB">🎂 ${T('עוד עוגה!', 'Bake another!')}</button></div>`;
  $('opts').innerHTML = h; requestAnimationFrame(() => { const ph = $('panel').offsetHeight; if (Math.abs(ph - panelH) > 4) panelH = ph; }); }
$('opts').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; A.ac(); const d = b.dataset;
  if (d.fl) { if (sp.layers.length >= 4) { toast(T('מקסימום 4 שכבות 🎂', 'Max 4 layers 🎂'), 1200); return; } const G = cakeG(); pours.push({ x: G.x + (Math.random() - .5) * 30, y0: 60, y: 60, c: FL[d.fl][1], k: d.fl }); A.noise(.6, 'lowpass', 500, 2, .1, 0, 200); return; }
  if (b.id === 'undoB') { sp.layers.pop(); A.tone(300, .1, 'sine', .06); }
  if (b.id === 'bakeB') { step = 1; bake = 0; baking = true; A.tone(200, .3, 'square', .04); A.loopTone('oven', 'sawtooth', 70, .012); }
  if (b.id === 'outB') { step = 2; sp.frost = sp.frost || FROST[1]; A.tone(660, .15, 'triangle', .07); }
  if (d.fr) { sp.frost = d.fr; A.noise(.3, 'lowpass', 900, 2, .06, 0, 300); }
  if (d.spk) { sp.sprink = d.spk; if (d.spk !== 'none') for (let i = 0; i < 6; i++) A.tone(1600 + i * 120, .04, 'sine', .04, i * .05); }
  if (d.tp) { const i = sp.tops.indexOf(d.tp); if (i >= 0) sp.tops.splice(i, 1); else if (sp.tops.length < 5) { sp.tops.push(d.tp); hop = 1; A.tone(880, .1, 'triangle', .06); A.tone(1320, .12, 'triangle', .05, .06); } }
  if (b.id === 'spinB') { step = 3; spinWheel(); A.tone(200, .4, 'sawtooth', .04, 0, 800); }
  if (b.id === 'againB') { saveCur(); startMake(null); return; }
  renderPanel(); });

/* ================= FLOW ================= */
function newSpec() { return { layers: [], frost: null, sprink: 'rain', tops: [], seed: Math.floor(Math.random() * 1e6), tier: 0 }; }
function startMake(spec) { $('tierB').className = 'tierB'; fx.length = 0; wheel = null; cutLine = null; cutT = -1; pours = []; candies = []; A.loopOff('roll'); A.loopOff('oven');
  $('title').hidden = true; $('album').hidden = true; $('panel').hidden = false; $('hud').hidden = false; state = 'make';
  if (spec) { sp = JSON.parse(JSON.stringify(spec)); step = 5; cutT = 1; rTier = sp.tier; }
  else { sp = newSpec(); step = 0; if (!S.tut) { S.tut = 1; S.save(); setTimeout(() => toast(T('שופכים שכבות, אופים, מקשטים – ומגלים מה מסתתר בפנים! 🎂', 'Pour layers, bake, decorate – and discover what’s hiding inside! 🎂'), 4200), 500); } }
  renderPanel(); panelH = $('panel').offsetHeight || panelH;
  A.startMusic({ chords: [[60, 64, 67, 72], [65, 69, 72, 76], [67, 71, 74, 77], [60, 64, 67, 72]], bpm: 96, lead: true, vol: .35 }); }
function doCut() { if (cutT >= 0) return; cutT = 0; A.noise(.5, 'bandpass', 2400, 2, .15, 0, 900); A.tone(300, .3, 'sine', .06, 0, 120); buzz(30);
  setTimeout(() => { sp.tier = rTier; S.pity = rTier >= 3 ? 0 : S.pity + 1; S.made++; const key = sp.layers[0] + '|' + rTier, isNew = !S.album[key]; S.album[key] = JSON.parse(JSON.stringify(sp)); sp.id = Date.now(); S.cakes.unshift(JSON.parse(JSON.stringify(sp))); S.cakes = S.cakes.slice(0, 30); S.save();
    step = 5; renderPanel(); flash(.7); [0, 4, 7, 12, 16, 19, 24].slice(0, 3 + rTier).forEach((k, j) => A.tone(523 * Math.pow(2, k / 12), .3, 'triangle', .08, .2 + j * .1)); setTimeout(() => A.voice(rTier >= 3 ? 'wow' : 'yay', 1.3), 300);
    if (rTier === 4) { A.noise(1.2, 'highpass', 3000, 1, .1); for (let i = 0; i < 40; i++) setTimeout(() => candies.push({ x: VW / 2 + (Math.random() - .5) * 60, y: cakeG().y - cakeG().h * .5, vx: (Math.random() - .5) * 420, vy: -300 - Math.random() * 400, e: pick(['🍬', '🍭', '🍫', '⭐', '💎', '🍩']), r: Math.random() * 6, l: 3 }), i * 40); }
    celebrate(); const q = TIERS[rTier], el = $('tierB'); el.innerHTML = `<b style="--c:${q.c}">${q.g} ${q.n}</b><span>${FL[sp.layers[0]][3]} · ${q.fx}</span>${isNew ? `<i>${T('חדש באוסף!', 'NEW in your album!')}</i>` : ''}`; el.className = 'tierB on t' + rTier; setTimeout(() => el.className = 'tierB', 3400); }, 900); }
function celebrate() { for (let i = 0; i < 16 + rTier * 6; i++) setTimeout(() => burst(VW / 2 + (Math.random() - .5) * VW * .7, VH * .35, 1, rTier >= 3 ? ['⭐', '✨', '💖', '🌟', '🎉'] : ['✨', '🎉', '💗']), i * 40); }
function saveCur() { if (!sp || !sp.id) return; const i = S.cakes.findIndex(z => z.id === sp.id); if (i >= 0) S.cakes[i] = JSON.parse(JSON.stringify(sp)); S.save(); }
function flash(v) { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = v; requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'opacity .7s'; f.style.opacity = 0; })); }
function showTitle() { saveCur(); state = 'title'; A.stopMusic(); A.loopOff('roll'); A.loopOff('oven'); $('title').hidden = false; $('panel').hidden = true; $('hud').hidden = true; $('album').hidden = true; $('tierB').className = 'tierB';
  $('shelf').innerHTML = S.cakes.length ? S.cakes.slice(0, 12).map((c, i) => `<button class="tc" data-i="${i}"><img src="${thumb(c)}" alt=""></button>`).join('') : `<p class="empty">${T('עוד אין עוגות – בואו נאפה את הראשונה! 🎂', 'No cakes yet – let’s bake the first! 🎂')}</p>`; $('shelfT').textContent = T('🍰 העוגות שלי', '🍰 My cakes');
  $('albumBtn').textContent = `📖 ${T('האוסף שלי', 'My album')} ${Object.keys(S.album).length}/${FLAVORS.length * TIERS.length}`;
  if (!$('demo').src) $('demo').src = thumb({ layers: ['straw', 'van', 'choc'], frost: '#ffd0e4', sprink: 'rain', tops: ['🍓', '🕯️', '🍒'], seed: 3, tier: 3 }, 240, 204); }
function openAlbum() { $('album').hidden = false; let h = `<div class="ahead"><button class="btn" id="aClose">✕</button><h3>📖 ${T('האוסף שלי', 'My album')} · ${Object.keys(S.album).length}/${FLAVORS.length * TIERS.length}</h3></div><div class="agrid">`;
  for (let k = TIERS.length - 1; k >= 0; k--) { h += `<div class="arow"><span class="tl">${TIERS[k].g} ${TIERS[k].n} · ${TIERS[k].fx}</span><div class="acs" style="grid-template-columns:repeat(7,1fr)">`; for (const [fk, c, ic, n] of FLAVORS) { const s2 = S.album[fk + '|' + k]; h += s2 ? `<button class="ac" data-k="${fk}|${k}"><img src="${thumb(s2, 110)}" alt=""></button>` : `<span class="ac lock">${ic}<small>?</small></span>`; } h += '</div></div>'; }
  $('album').innerHTML = h + '</div>'; $('aClose').onclick = () => { $('album').hidden = true; }; }
$('album').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; A.ac(); startMake(S.album[b.dataset.k]); });
function thumb(spec, w = 200, h = w) { const c = cnv(w * 2, h * 2), x = c.getContext('2d'); x.scale(2, 2); const G = { x: w * .38, y: h * .78, w: w * .58, h: w * .58 * .5, ry: w * .58 * .16 }; drawCake(x, G, spec, 0, { thumb: 1 });
  const R = { x: w * .62, y: h * .4, w: w * .3, h: h * .38 }; x.save(); x.shadowColor = 'rgba(0,0,0,.2)'; x.shadowBlur = 8; x.fillStyle = '#fff'; x.fillRect(R.x - 6, R.y - 10, R.w + 12, R.h + 16); x.restore(); drawInside(x, R, spec, 0); return c.toDataURL(); }
$('shelf').onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; A.ac(); startMake(S.cakes[+b.dataset.i]); };
$('albumBtn').onclick = () => { A.ac(); openAlbum(); };
$('newBtn').onclick = () => { A.ac(); startMake(null); }; $('backBtn').onclick = () => showTitle();

/* ================= INPUT ================= */
const fx = []; function burst(x, y, n, em) { for (let i = 0; i < n; i++) fx.push({ x: x + (Math.random() - .5) * 40, y, vx: (Math.random() - .5) * 260, vy: -150 - Math.random() * 260, l: 1.1 + Math.random() * .8, e: pick(em), s: 18 + Math.random() * 18 }); }
cv.addEventListener('pointerdown', e => { if (state === 'title') return; A.ac(); try { cv.setPointerCapture(e.pointerId); } catch (er) { } const x = e.clientX, y = e.clientY; const G = cakeG();
  if (step === 4 && cutT < 0) { cutLine = { x0: x, y0: y, x, y }; A.tone(1800, .06, 'sine', .04); return; }
  if (step === 5 && Math.abs(x - G.x) < G.w * .8 && y > G.y - G.h * 2.2 && y < G.y + G.ry * 2) { hop = 1; celebrate(); A.voice('yay', 1.4); } });
cv.addEventListener('pointermove', e => { if (!cutLine) return; cutLine.x = e.clientX; cutLine.y = e.clientY; const G = cakeG(); if (Math.abs(cutLine.y - cutLine.y0) > G.h * .7 && Math.abs(cutLine.x0 - G.x) < G.w * .6) { cutLine = null; doCut(); } });
const up = () => { if (cutLine) { const G = cakeG(); if (Math.abs(cutLine.y - cutLine.y0) > 40) { cutLine = null; doCut(); } else { cutLine = null; toast(T('החליקו למטה לאורך העוגה 👇', 'Swipe down across the cake 👇'), 1200); } } };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

/* ================= LOOP ================= */
$('backBtn').innerHTML = ICO.home('#a8303a'); $('homeT').innerHTML = ICO.home('#a8303a'); soundButton('sndBtn', S, A, '#a8303a'); hubButtons(['homeT'], A); $('newBtn').textContent = T('🎂 עוגה חדשה!', '🎂 New cake!');
$('tSub').textContent = T('שופכים שכבות צבעוניות, אופים, מקשטים, מסובבים את הגלגל… וחותכים! מה מסתתר בפנים? לב? קשת? פיניאטה של ממתקים?!', 'Pour colorful layers, bake, decorate, spin the wheel… and slice! What’s inside? A heart? A rainbow? A candy piñata?!');
addEventListener('resize', layout);
let last = performance.now();
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(1 / 30, (now - last) / 1000) * (window.__fast || 1); last = now; const t = now / 1000; A.tick(); cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, VW, VH); if (state === 'title') return;
  const G = cakeG(); hop = Math.max(0, hop - dt * 3); const hy = -Math.sin(hop * Math.PI) * 14; const Gh = { ...G, y: G.y + hy };
  if (step === 0) { for (const p of pours) { p.y += 900 * dt; const surf = G.y - sp.layers.length * G.h * .9 / 4 - 10; if (p.y >= surf) { p.done = 1; sp.layers.push(p.k); renderPanel(); A.noise(.25, 'lowpass', 400, 2, .1); A.tone(180, .25, 'sine', .07, 0, 110); buzz(15); } } pours = pours.filter(p => !p.done); drawPan(cx, G, t); }
  if (step === 1) { if (baking) { bake = Math.min(1, bake + dt / 4); if (bake >= 1) { baking = false; A.loopOff('oven'); A.tone(1568, .6, 'sine', .12); A.tone(2093, .8, 'sine', .08, .15); buzz([40, 40, 40]); renderPanel(); } } drawOven(t); }
  if (step === 2 || step === 3) { drawStand(cx, G); drawCake(cx, Gh, sp, t); if (step === 3) { wheelTick(dt); drawWheel(t); } }
  if (step === 4 && cutT < 0) { drawStand(cx, G); drawCake(cx, G, sp, t); const pulse = .5 + .5 * Math.sin(t * 5); cx.strokeStyle = `rgba(255,255,255,${.5 + .4 * pulse})`; cx.setLineDash([10, 10]); cx.lineWidth = 4; cx.beginPath(); cx.moveTo(G.x, G.y - G.h - G.ry - 30); cx.lineTo(G.x, G.y + G.ry + 10); cx.stroke(); cx.setLineDash([]);
    cx.font = '44px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('🔪', G.x + 34, G.y - G.h - G.ry - 30 + ((t * 70) % (G.h + G.ry + 60)));
    if (cutLine) { cx.strokeStyle = '#fff'; cx.lineWidth = 6; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(cutLine.x0, cutLine.y0); cx.lineTo(cutLine.x, cutLine.y); cx.stroke(); } }
  if (step === 5 || (step === 4 && cutT >= 0)) { if (cutT < 1) cutT = Math.min(1, cutT + dt * 1.3); const p = ease(cutT); drawStand(cx, G);
    const gap = G.w * .08 * p; cx.save(); cx.beginPath(); cx.rect(0, 0, G.x - gap, VH); cx.clip(); drawCake(cx, { ...Gh, x: Gh.x - gap }, sp, t); cx.restore(); cx.save(); cx.beginPath(); cx.rect(G.x + gap, 0, VW, VH); cx.clip(); drawCake(cx, { ...Gh, x: Gh.x + gap }, sp, t); cx.restore();
    if (p > .05) { const sc = lerp(.4, 1, p), sw = G.w * .42 * sc, sh = G.h * 1.15 * sc; const R = { x: G.x - sw / 2, y: lerp(G.y - G.h, G.y + G.ry * 1.9 - sh, p) + hy, w: sw, h: sh };
      const sl = { ...sp, tier: rTier }; cx.save(); cx.shadowColor = 'rgba(80,20,20,.35)'; cx.shadowBlur = 20; cx.fillStyle = '#fff'; cx.beginPath(); cx.ellipse(R.x + R.w / 2, R.y + R.h + 8, R.w * .8, 14, 0, 0, TAU); cx.fill(); cx.restore(); drawInside(cx, R, sl, t); } }
  for (let i = candies.length - 1; i >= 0; i--) { const c = candies[i]; c.vy += 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += dt * 4; c.l -= dt; const floor = VH - panelH - 20; if (c.y > floor) { c.y = floor; c.vy *= -.35; c.vx *= .7; } if (c.l <= 0) { candies.splice(i, 1); continue; } cx.save(); cx.globalAlpha = Math.min(1, c.l); cx.translate(c.x, c.y); cx.rotate(c.r); cx.font = '30px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(c.e, 0, 0); cx.restore(); }
  for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.vy += 600 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.l -= dt; if (f.l <= 0) { fx.splice(i, 1); continue; } cx.globalAlpha = Math.min(1, f.l * 1.5); cx.font = `${f.s}px serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(f.e, f.x, f.y); cx.globalAlpha = 1; } }
layout(); showTitle(); $('loading').hidden = true; requestAnimationFrame(frame); window.__ckOK = true;
window.__ck = { thumb, startMake, get step() { return step; }, set step(v) { step = v; renderPanel(); }, get sp() { return sp; }, force(k) { window.__forceTier = k; }, cut: doCut, spin() { step = 3; spinWheel(); renderPanel(); }, S };
