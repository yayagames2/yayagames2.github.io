import { $, clamp, lerp, rng, T, EN, store, audio, toast, ICO, hubButtons, soundButton } from '../lib/kit.js';
const S = store('squishy-save', { toys: [], tut: 0, album: {}, pity: 0, made: 0 });
if (!S.album) S.album = {}; if (S.pity == null) S.pity = 0;
const A = audio(S);
const TAU = Math.PI * 2;
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const hx = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const toHex = a => '#' + a.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const mixC = (a, b, t) => { const A2 = hx(a), B = hx(b); return toHex(A2.map((v, i) => lerp(v, B[i], t))); };
const rgba = (c, a) => { const [r, g, b] = hx(c); return `rgba(${r},${g},${b},${a})`; };
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };
const pick = a => a[Math.floor(Math.random() * a.length)];
function blend(cols) { if (!cols.length) return '#f4f4fa'; const s = [0, 0, 0]; for (const c of cols) hx(c).forEach((v, i) => s[i] += v / cols.length); const g = (s[0] + s[1] + s[2]) / 3; return toHex(s.map(v => g + (v - g) * (cols.length > 1 ? 1.45 : 1))); }

/* ================= DATA ================= */
const COLORS = ['#ff7ac0', '#a87aff', '#5ac8ff', '#5ae0a0', '#ffe05a', '#ffa05a', '#ff5a6a', '#ffffff', '#5ae8e0', '#3a6aff', '#ffc8e4', '#c8f0a0', '#b0805a', '#3a3450'];
const GLITTER = [['none', '∅'], ['silver', '✨'], ['gold', '🌟'], ['holo', '🌈'], ['hearts', '💗'], ['stars', '⭐'], ['snow', '❄️'], ['moons', '🌙']];
const ADDINS = [['beads', '🔵'], ['fruit', '🍓'], ['candy', '🍬'], ['shells', '🐚'], ['clay', '🍩'], ['cookie', '🍪'], ['cherry', '🍒'], ['gummy', '🧸']];
const ADD_E = { beads: '🔵', fruit: '🍓', candy: '🍬', shells: '🐚', clay: '🍩', cookie: '🍪', cherry: '🍒', gummy: '🧸' };
const SHAPES = [['cat', T('חתלתול', 'Kitty')], ['bunny', T('ארנבון', 'Bunny')], ['bear', T('דובון', 'Bear')], ['star', T('כוכב', 'Star')], ['cloud', T('ענן', 'Cloud')], ['peach', T('אפרסק', 'Peach')], ['pear', T('אגס', 'Pear')], ['blob', T('בועה', 'Blob')], ['heart', T('לב', 'Heart')], ['frog', T('צפרדע', 'Froggy')], ['ghost', T('רוחי', 'Ghosty')], ['egg', T('ביצה', 'Egg')], ['flower', T('פרח', 'Flower')], ['mochi', T('מוצ׳י', 'Mochi')]];
const SHN = Object.fromEntries(SHAPES);
const TIERS = [
  { k: 'common', n: T('רגיל', 'Common'), c: '#b8b8cc', g: '⚪', w: 44, taps: 2 },
  { k: 'rare', n: T('נדיר', 'Rare'), c: '#4ab0ff', g: '🔵', w: 30, taps: 3 },
  { k: 'epic', n: T('אפי', 'Epic'), c: '#b05aff', g: '🟣', w: 17, taps: 3 },
  { k: 'legend', n: T('אגדי', 'Legendary'), c: '#ffc21a', g: '🟡', w: 7, taps: 4 },
  { k: 'mythic', n: T('מיתי', 'Mythic'), c: '#ff4ab0', g: '🌈', w: 2, taps: 5 }];
const PAT = { solid: T('קלאסי', 'Classic'), swirl: T('מסתחרר', 'Swirl'), layers: T('שכבות', 'Layers'), galaxy: T('גלקסיה', 'Galaxy'), spots: T('מנוקד', 'Spotty'), holo: T('הולוגרמה', 'Holo'), gold: T('זהב', 'Golden') };
const TIER_PATS = [['solid'], ['swirl', 'layers'], ['galaxy', 'spots'], ['holo'], ['gold']];
const FACES = ['happy', 'kawaii', 'wink', 'sleepy', 'surprise', 'tongue'];
const ACCS = [['none', '∅'], ['bow', '🎀'], ['flower', '🌸'], ['crown', '👑'], ['leaf', '🍃'], ['phones', '🎧'], ['sprinkles', '🍭'], ['hat', '🎩'], ['star', '⭐'], ['cherry', '🍒'], ['fly', '🦋']];
const RF = { cat: t => 1 + .5 * (Math.exp(-((t + Math.PI / 2 - .62) ** 2) / .02) + Math.exp(-((t + Math.PI / 2 + .62) ** 2) / .02)) - (Math.sin(t) > 0 ? .06 * Math.sin(t) : 0),
  bunny: t => { const e = 1 / Math.sqrt((Math.cos(t) / .85) ** 2 + (Math.sin(t) / .95) ** 2); return e + .85 * (Math.exp(-((t + Math.PI / 2 - .4) ** 2) / .011) + Math.exp(-((t + Math.PI / 2 + .4) ** 2) / .011)); },
  bear: t => 1 + .32 * (Math.exp(-((t + Math.PI / 2 - .78) ** 2) / .04) + Math.exp(-((t + Math.PI / 2 + .78) ** 2) / .04)),
  star: t => .78 + .3 * Math.cos(5 * (t + Math.PI / 2)), cloud: t => (1 + .09 * Math.cos(7 * t)) * (Math.sin(t) > 0 ? 1 - .2 * Math.sin(t) : 1),
  peach: t => 1 - .16 * Math.exp(-((t + Math.PI / 2) ** 2) / .03) + .06 * Math.sin(t), pear: t => 1 + .28 * Math.sin(t) - .05, blob: t => 1 + .04 * Math.cos(3 * t),
  frog: t => { const e = 1 / Math.sqrt((Math.cos(t) / 1.08) ** 2 + (Math.sin(t) / .86) ** 2); return e + .34 * (Math.exp(-((t + Math.PI / 2 - .55) ** 2) / .025) + Math.exp(-((t + Math.PI / 2 + .55) ** 2) / .025)); },
  ghost: t => Math.sin(t) > 0 ? 1.02 + .1 * Math.sin(t) * Math.cos(8 * t) : 1.05 - .05 * Math.sin(t), egg: t => 1 + .1 * Math.sin(t), flower: t => .9 + .14 * Math.cos(6 * (t + Math.PI / 2)),
  mochi: t => 1 / Math.sqrt((Math.cos(t) / 1.15) ** 2 + (Math.sin(t) / .8) ** 2) };

/* ================= STATE ================= */
let state = 'title', step = 0, toy = null, VW = 0, VH = 0, dpr = 1, panelH = 200; const cv = $('cv'), cx = cv.getContext('2d');
function layout() { dpr = Math.min(devicePixelRatio || 1, 2.5); VW = innerWidth; VH = innerHeight; cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr); cv.style.width = VW + 'px'; cv.style.height = VH + 'px'; panelH = $('panel').offsetHeight || panelH; if (body) body.relayout(); }

/* ================= SOFT BODY ================= */
const N = 60; let body = null, TH = 0;
function shapeQ(shape) { const q = []; for (let i = 0; i < N; i++) { if (shape === 'heart') { const s = i / N * TAU; q.push([16 * Math.sin(s) ** 3 / 15, -(13 * Math.cos(s) - 5 * Math.cos(2 * s) - 2 * Math.cos(3 * s) - Math.cos(4 * s)) / 15]); continue; } const t = -Math.PI / 2 + i / N * TAU; const r = RF[shape](((t + Math.PI) % TAU) - Math.PI); q.push([Math.cos(t) * r, Math.sin(t) * r]); }
  const cx0 = q.reduce((a, p) => a + p[0], 0) / N, cy0 = q.reduce((a, p) => a + p[1], 0) / N; q.forEach(p => { p[0] -= cx0; p[1] -= cy0; }); return q; }
function makeBody(spec, o = {}) { const flo = () => TH ? 186 : VH - panelH - 22, R = () => TH ? 66 : Math.min(VW * .34, (flo() - 110) * .33);
  const b = { spec, q: shapeQ(spec.shape), pts: [], vel: [], s: 0, R: R(), floor: 0, hands: new Map(), faceA: o.face ?? 1 };
  b.relayout = () => { const of = b.floor; b.R = R(); b.floor = flo(); if (of && b.pts.length) for (const p of b.pts) p[1] += b.floor - of; };
  b.relayout(); const maxY = Math.max(...b.q.map(p => p[1])); const sx = o.at ? o.at[0] : VW / 2, sy = o.at ? o.at[1] : b.floor - maxY * b.R, sc = o.at ? .35 : 1;
  for (const p of b.q) { b.pts.push([sx + p[0] * b.R * sc, sy + p[1] * b.R * sc]); b.vel.push([o.v ? o.v[0] + p[0] * 300 : 0, o.v ? o.v[1] + p[1] * 300 : 0]); }
  const r = rng(spec.seed); const inside = () => { for (; ;) { const x = (r() - .5) * 1.4, y = (r() - .5) * 1.4; if (Math.hypot(x, y) < .64) return [x, y + .05]; } };
  b.glit = Array.from({ length: spec.glitter === 'none' && spec.pattern !== 'galaxy' ? 0 : 50 }, () => ({ p: inside(), s: .02 + r() * .035, a: r() * TAU }));
  b.adds = []; for (const a of spec.addins) for (let k = 0; k < (a === 'beads' ? 12 : 3); k++) b.adds.push({ k: a, p: inside(), s: a === 'beads' ? .045 + r() * .03 : .1 + r() * .04, c: ['#ff8ac8', '#7ad8ff', '#ffe27a', '#7aeaa8', '#ffffff', '#b88aff'][Math.floor(r() * 6)], a: r() * TAU });
  const cl = spec.colors && spec.colors.length ? spec.colors : [spec.color]; b.blobs = Array.from({ length: 9 }, (_, i) => ({ p: inside(), r: .18 + r() * .22, c: cl[i % cl.length] }));
  const q = b.q; const topY = Math.min(...q.filter(p => Math.abs(p[0]) < .35).map(p => p[1])), botY = Math.max(...q.map(p => p[1])); b.face = [0, (topY + botY) * .5 + .1]; b.top = [0, topY];
  const EA = { cat: [.62, 1.28], bunny: [.4, 1.4], bear: [.78, 1.08] }[spec.shape]; if (EA) { const raw = []; for (let i = 0; i < N; i++) { const t = -Math.PI / 2 + i / N * TAU; const rr = RF[spec.shape](((t + Math.PI) % TAU) - Math.PI); raw.push([Math.cos(t) * rr, Math.sin(t) * rr]); } const c = [raw.reduce((a, p) => a + p[0], 0) / N, raw.reduce((a, p) => a + p[1], 0) / N]; b.ears = [-1, 1].map(sg => { const t = -Math.PI / 2 + sg * EA[0]; return [Math.cos(t) * EA[1] - c[0], Math.sin(t) * EA[1] - c[1]]; }); } else b.ears = [];
  return b; }
function stepBody(b, dt) { const { q, pts, vel } = b; let cxp = 0, cyp = 0; for (const p of pts) { cxp += p[0]; cyp += p[1]; } cxp /= N; cyp /= N;
  let sc = 0, ss = 0; for (let i = 0; i < N; i++) { const dx = pts[i][0] - cxp, dy = pts[i][1] - cyp; sc += q[i][0] * dx + q[i][1] * dy; ss += q[i][0] * dy - q[i][1] * dx; } const ang = Math.atan2(ss, sc) * .55; const ca = Math.cos(ang), sa = Math.sin(ang);
  const hands = [...b.hands.values()], drag = hands.filter(h => h.mode === 'drag'), press = hands.filter(h => h.mode === 'press');
  let pd = 0; for (const h of press) { h.depth = Math.min(1, h.depth + dt * 3); pd = Math.max(pd, h.depth); }
  if (press.length) b.s = Math.min(.4, b.s + dt * 1.7 * pd); else b.s = Math.max(0, b.s - dt * (b.s > .16 ? .3 : .55));
  const sx = 1 + b.s * .6, sy = 1 - b.s; const bottom = Math.max(...q.map(p => p[1])) * b.R; b.T = { cx: cxp, cy: Math.min(cyp, b.floor - bottom * sy), ca, sa, sx, sy };
  const k = drag.length ? 8 : press.length ? 46 : 60 - b.s * 30, R = b.R, sig2 = 2 * (R * .55) ** 2;
  for (let i = 0; i < N; i++) { const lx = q[i][0] * R * sx, ly = q[i][1] * R * sy; let gx = b.T.cx + lx * ca - ly * sa, gy = b.T.cy + lx * sa + ly * ca;
    for (const h of press) if (q[i][1] < .25) gy += h.depth * R * .22 * Math.exp(-((gx - h.x) ** 2) / sig2) * (.4 + .6 * Math.min(1, (.25 - q[i][1]) / .8));
    const a = pts[(i + N - 1) % N], c = pts[(i + 1) % N];
    vel[i][0] += ((gx - pts[i][0]) * k + ((a[0] + c[0]) / 2 - pts[i][0]) * 26) * dt; vel[i][1] += ((gy - pts[i][1]) * k + ((a[1] + c[1]) / 2 - pts[i][1]) * 26 + 900) * dt; }
  for (const h of drag) { const D = [h.x - h.x0, h.y - h.y0], L = Math.hypot(...D), Lm = R * 2.8, f = L > 1 ? Lm * (1 - Math.exp(-L / Lm)) / L : 0; h.stretch = L * f;
    for (let i = 0; i < N; i++) { const w = h.w[i], st = 160 * w + 140 * h.bt[i]; if (st < 3) continue; const tx = h.a[i][0] + D[0] * f * w, ty = Math.min(b.floor, h.a[i][1] + D[1] * f * w); vel[i][0] += (tx - pts[i][0]) * st * dt; vel[i][1] += (ty - pts[i][1]) * st * dt; } }
  if (!drag.length && !TH) { const pull = (VW / 2 - cxp) * 3 * dt; for (const v of vel) v[0] += pull; }
  const damp = Math.exp(-(press.length ? 8 : drag.length ? 6 : 3.6) * dt), dm = Math.exp(-.8 * dt); let vx = 0, vy = 0; for (const v of vel) { vx += v[0] / N; vy += v[1] / N; }
  for (let i = 0; i < N; i++) { vel[i][0] = vx * dm + (vel[i][0] - vx) * damp; vel[i][1] = vy * dm + (vel[i][1] - vy) * damp; pts[i][0] += vel[i][0] * dt; pts[i][1] += vel[i][1] * dt;
    if (pts[i][1] > b.floor) { pts[i][1] = b.floor; vel[i][1] = Math.min(0, vel[i][1]) * -.2; vel[i][0] *= drag.length ? .55 : .8; } pts[i][0] = clamp(pts[i][0], 6, VW - 6); } }
function mapF(b, p) { const T2 = b.T; if (!T2) return [VW / 2, VH / 2]; const lx = p[0] * b.R * T2.sx, ly = p[1] * b.R * T2.sy; const x = T2.cx + lx * T2.ca - ly * T2.sa, y = T2.cy + lx * T2.sa + ly * T2.ca; let wx = 0, wy = 0, ws = 0;
  for (let i = 0; i < N; i += 2) { const qx = b.q[i][0] - p[0], qy = b.q[i][1] - p[1], w = 1 / (qx * qx + qy * qy + .02) ** 1.2; const glx = b.q[i][0] * b.R * T2.sx, gly = b.q[i][1] * b.R * T2.sy; const gx = T2.cx + glx * T2.ca - gly * T2.sa, gy = T2.cy + glx * T2.sa + gly * T2.ca; wx += (b.pts[i][0] - gx) * w; wy += (b.pts[i][1] - gy) * w; ws += w; } return [x + wx / ws * .9, y + wy / ws * .9]; }
function bodyPath(b) { const p = new Path2D(), P = b.pts, m = (a, c) => [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2]; const s = m(P[N - 1], P[0]); p.moveTo(...s); for (let i = 0; i < N; i++) { const e = m(P[i], P[(i + 1) % N]); p.quadraticCurveTo(P[i][0], P[i][1], e[0], e[1]); } p.closePath(); return p; }
function mline(x, b, pts) { x.beginPath(); pts.forEach((p, i) => { const [X, Y] = mapF(b, p); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); }
function paint(x, b, path, t) { const sp = b.spec, R = b.R, T2 = b.T, col = sp.color, cols = sp.colors && sp.colors.length ? sp.colors : [col], pat = sp.pattern || 'solid';
  const rad = (c1, c2, c3) => { const g = x.createRadialGradient(T2.cx - R * .3, T2.cy - R * .45, R * .1, T2.cx, T2.cy, R * 1.3); g.addColorStop(0, c1); g.addColorStop(.55, c2); g.addColorStop(1, c3); return g; };
  if (pat === 'gold') { const g = x.createLinearGradient(T2.cx - R, T2.cy - R, T2.cx + R, T2.cy + R); g.addColorStop(0, '#fff6c0'); g.addColorStop(.35, '#ffd23a'); g.addColorStop(.6, '#e8a00a'); g.addColorStop(1, '#a86a00'); x.fillStyle = g; x.fill(path); }
  else if (pat === 'galaxy') { x.fillStyle = rad('#3a2a7a', '#1a1040', '#0a0620'); x.fill(path); }
  else if (pat === 'holo') { const g = x.createLinearGradient(T2.cx - R * 1.2, T2.cy - R, T2.cx + R * 1.2, T2.cy + R); for (let k = 0; k <= 6; k++) g.addColorStop(k / 6, `hsl(${(t * 50 + k * 60) % 360},95%,78%)`); x.fillStyle = g; x.fill(path); }
  else { const c0 = pat === 'layers' ? cols[0] : col; x.fillStyle = rad(mixC(c0, '#ffffff', .6), c0, mixC(c0, '#5a2a6a', .35)); x.fill(path); }
  x.save(); x.clip(path); x.lineCap = 'round'; x.lineJoin = 'round';
  if (pat === 'swirl') { cols.forEach((c, k) => { const pts = []; for (let i = 0; i <= 22; i++) { const s = i / 22, a = k * TAU / cols.length + s * 5.5, r = .08 + s * .62; pts.push([Math.cos(a) * r, Math.sin(a) * r * .95 + .05]); } x.strokeStyle = rgba(c, .9); x.lineWidth = R * .2; mline(x, b, pts); x.stroke(); x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = R * .04; x.stroke(); }); }
  if (pat === 'layers') { const nb = cols.length, y0 = -1.25, y1 = 1.1, hb = (y1 - y0) / nb; cols.forEach((c, k) => { if (!k) return; const yc = y0 + hb * (k + .5), pts = []; for (let i = 0; i <= 12; i++) { const xx = -1.4 + i / 12 * 2.8; pts.push([xx, yc + Math.sin(xx * 4 + k) * .06]); } x.strokeStyle = c; x.lineWidth = hb * R * 1.1; mline(x, b, pts); x.stroke(); }); }
  if (pat === 'galaxy' || pat === 'spots') for (const bl of b.blobs) { const [px, py] = mapF(b, bl.p); const rr = bl.r * R * (pat === 'spots' ? .55 : 1.3); if (pat === 'spots') { x.fillStyle = bl.c; x.beginPath(); x.arc(px, py, rr, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.4)'; x.beginPath(); x.arc(px - rr * .3, py - rr * .3, rr * .3, 0, TAU); x.fill(); } else { const g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, rgba(bl.c, .75)); g.addColorStop(1, rgba(bl.c, 0)); x.fillStyle = g; x.beginPath(); x.arc(px, py, rr, 0, TAU); x.fill(); } }
  if (pat === 'gold' || pat === 'holo') { const sh = ((t * .6) % 2) - .5; const g = x.createLinearGradient(T2.cx - R + sh * R * 2, T2.cy - R, T2.cx - R * .4 + sh * R * 2, T2.cy + R); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.65)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fill(path); }
  x.globalAlpha = .9; const gl = sp.glitter;
  for (const gp of b.glit) { const [px, py] = mapF(b, gp.p); const s = gp.s * R; const tw = .5 + .5 * Math.sin(t * 3 + gp.a * 5); if (pat === 'galaxy') { x.fillStyle = `rgba(255,255,255,${tw})`; x.beginPath(); x.arc(px, py, s * .45, 0, TAU); x.fill(); continue; } if (gl === 'hearts' || gl === 'stars' || gl === 'snow' || gl === 'moons') { x.fillStyle = { hearts: '#ff4a8a', stars: '#ffd23a', snow: '#ffffff', moons: '#ffe27a' }[gl]; x.font = `${s * 2.6}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText({ hearts: '♥', stars: '★', snow: '❄', moons: '☾' }[gl], px, py); } else { x.fillStyle = gl === 'gold' ? `rgba(255,215,80,${tw})` : gl === 'holo' ? `hsla(${(gp.a * 60 + t * 60) % 360},90%,70%,${tw})` : `rgba(255,255,255,${tw})`; x.save(); x.translate(px, py); x.rotate(gp.a + t * .2); x.fillRect(-s, -s * .35, s * 2, s * .7); x.restore(); } }
  for (const a of b.adds) { const [px, py] = mapF(b, a.p); const s = a.s * R; if (a.k === 'beads') { const gg = x.createRadialGradient(px - s * .3, py - s * .3, 0, px, py, s); gg.addColorStop(0, '#ffffff'); gg.addColorStop(1, a.c); x.fillStyle = gg; x.beginPath(); x.arc(px, py, s, 0, TAU); x.fill(); } else { x.save(); x.translate(px, py); x.rotate(Math.sin(a.a) * .6); x.font = `${s * 1.7}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText({ fruit: ['🍓', '🍋', '🍑'], candy: ['🍬', '🍭', '🧁'], shells: ['🐚', '⭐', '🦀'], clay: ['🍩', '🍪', '🧇'] }[a.k][Math.floor(a.a * 3 / TAU) % 3], 0, 0); x.restore(); } }
  x.globalAlpha = 1; const hl = x.createLinearGradient(0, T2.cy - R * 1.1, 0, T2.cy + R * .4); hl.addColorStop(0, 'rgba(255,255,255,.55)'); hl.addColorStop(.4, 'rgba(255,255,255,.05)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = hl; x.fill(path);
  for (const h of b.hands.values()) if (h.mode === 'press' && h.depth > .05) { const rr = R * (.25 + .2 * h.depth); const dg = x.createRadialGradient(h.x, h.y + rr * .15, 0, h.x, h.y, rr); dg.addColorStop(0, `rgba(60,20,80,${.28 * h.depth})`); dg.addColorStop(.6, `rgba(60,20,80,${.1 * h.depth})`); dg.addColorStop(.85, `rgba(255,255,255,${.35 * h.depth})`); dg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = dg; x.beginPath(); x.arc(h.x, h.y, rr, 0, TAU); x.fill(); }
  x.restore(); }
function drawToy(x, b, t) { const sp = b.spec, path = bodyPath(b), R = b.R; const T2 = b.T || { cx: VW / 2, cy: b.floor - R }; b.T = b.T || T2; const tier = sp.tier || 0, outline = sp.pattern === 'gold' ? '#8a5a00' : sp.pattern === 'galaxy' ? '#0a0620' : mixC(sp.color, '#3a1a4a', .55);
  x.save(); x.fillStyle = 'rgba(80,40,90,.18)'; x.beginPath(); x.ellipse(T2.cx, b.floor + 4, R * (1 + b.s * .6), R * .13, 0, 0, TAU); x.fill();
  if (tier >= 2) { x.save(); x.shadowColor = TIERS[tier].c; x.shadowBlur = 18 + 10 * Math.sin(t * 3); x.fillStyle = TIERS[tier].c; x.fill(path); x.restore(); }
  paint(x, b, path, t); x.strokeStyle = rgba(outline, .5); x.lineWidth = 3; x.stroke(path);
  if (b.faceA > .01) { x.globalAlpha = b.faceA; const dark = sp.pattern === 'galaxy';
    if (b.ears.length) { x.fillStyle = 'rgba(255,140,180,.55)'; for (const e of b.ears) { const [px, py] = mapF(b, e); x.beginPath(); x.ellipse(px, py, R * (sp.shape === 'bunny' ? .08 : .12), R * (sp.shape === 'bunny' ? .2 : .11), 0, 0, TAU); x.fill(); } }
    const f = b.face, sq = b.s, stretch = Math.max(0, ...[...b.hands.values()].map(h => h.stretch || 0)) / R; const E = (dx, dy) => mapF(b, [f[0] + dx, f[1] + dy]); const er = R * .085; const ink = dark ? '#ffffff' : '#2a1a2a', eyeHi = dark ? '#2a1a4a' : '#fff'; x.fillStyle = ink; x.strokeStyle = ink; x.lineCap = 'round'; x.lineWidth = R * .045;
    const squeeze = sq > .22; const blink = Math.sin(t * 1.4) > .97 || sp.face === 'sleepy';
    for (const s2 of [-1, 1]) { const [ex, ey] = E(s2 * .3, -.08); if (squeeze) { x.beginPath(); x.moveTo(ex - s2 * er, ey - er * .8); x.lineTo(ex + s2 * er * .6, ey); x.lineTo(ex - s2 * er, ey + er * .8); x.stroke(); } else if (stretch > .5) { x.beginPath(); x.arc(ex, ey, er * 1.25, 0, TAU); x.fill(); x.fillStyle = eyeHi; x.beginPath(); x.arc(ex - er * .3, ey - er * .4, er * .45, 0, TAU); x.fill(); x.fillStyle = ink; } else if (sp.face === 'wink' && s2 > 0 || blink && sp.face !== 'surprise') { x.beginPath(); x.arc(ex, ey, er, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); } else if (sp.face === 'kawaii') { x.beginPath(); x.ellipse(ex, ey, er * 1.1, er * 1.35, 0, 0, TAU); x.fill(); x.fillStyle = eyeHi; x.beginPath(); x.arc(ex - er * .35, ey - er * .45, er * .45, 0, TAU); x.fill(); x.beginPath(); x.arc(ex + er * .35, ey + er * .35, er * .2, 0, TAU); x.fill(); x.fillStyle = ink; } else { x.beginPath(); x.arc(ex, ey, sp.face === 'surprise' ? er * 1.2 : er * .85, 0, TAU); x.fill(); } }
    const [mx, my] = E(0, .14); x.beginPath(); if (sp.face === 'surprise' || squeeze || stretch > .5) { x.ellipse(mx, my + R * .02, R * (squeeze ? .1 : .06), R * (squeeze ? .05 : .09), 0, 0, TAU); x.fillStyle = '#c8304a'; x.fill(); } else { x.arc(mx - R * .06, my, R * .06, .1 * Math.PI, .9 * Math.PI); x.arc(mx + R * .06, my, R * .06, .1 * Math.PI, .9 * Math.PI); x.stroke(); if (sp.face === 'tongue') { x.fillStyle = '#ff6a8a'; x.beginPath(); x.ellipse(mx, my + R * .07, R * .05, R * .06, 0, 0, TAU); x.fill(); } }
    if (sp.cheeks) { x.fillStyle = `rgba(255,90,130,${squeeze ? .65 : .42})`; for (const s2 of [-1, 1]) { const [px, py] = E(s2 * .48, .08); x.beginPath(); x.ellipse(px, py, R * .11, R * .065, 0, 0, TAU); x.fill(); } }
    if (sp.acc && sp.acc !== 'none') { const [ax, ay] = mapF(b, [sp.acc === 'phones' || sp.acc === 'crown' || sp.acc === 'hat' ? 0 : .3, b.top[1] + .12]); const s = R * .5; x.font = `${s}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; if (sp.acc === 'sprinkles') { const r = rng(sp.seed); for (let i = 0; i < 16; i++) { const [px, py] = mapF(b, [(r() - .5) * 1.1, b.top[1] + .15 + r() * .3]); x.fillStyle = ['#ff4a8a', '#ffd23a', '#4ad8ff', '#7aff8a', '#fff'][i % 5]; x.save(); x.translate(px, py); x.rotate(r() * 3); x.fillRect(-R * .045, -R * .014, R * .09, R * .028); x.restore(); } } else x.fillText({ bow: '🎀', flower: '🌸', crown: '👑', leaf: '🍃', phones: '🎧', hat: '🎩', star: '⭐', cherry: '🍒', fly: '🦋' }[sp.acc], ax, ay); }
    x.globalAlpha = 1; }
  if (tier >= 3) { const n = tier === 4 ? 6 : 3; for (let i = 0; i < n; i++) { const a = t * 1.3 + i * TAU / n; const px = T2.cx + Math.cos(a) * R * 1.25, py = T2.cy - R * .1 + Math.sin(a) * R * .55; x.font = `${R * .2}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.globalAlpha = .6 + .4 * Math.sin(t * 4 + i); x.fillText(['✨', '💖', '⭐'][i % 3], px, py); } x.globalAlpha = 1; }
  x.restore(); }

/* ================= MOLD (pour + seal) ================= */
let layers = [], fill = 0, pouring = false, tilt = 0, sel = COLORS[0], sealed = 0, lidY = 0, mShake = 0, cracks = [], crackN = 0, phase = 'pour', roul = null, rayT = 0, bubbles = [], rTier = 0;
function moldG() { const w = Math.min(VW * .58, 290, (VH - panelH - 210) * .8), h = w * 1.1, bottom = VH - panelH - 26; return { x: VW / 2, w, h, top: bottom - h, bottom }; }
function moldPath(M, ins = 0) { const p = new Path2D(); p.roundRect(M.x - M.w / 2 + ins, M.top + ins, M.w - ins * 2, M.h - ins * 2, [M.w * .46, M.w * .46, M.w * .26, M.w * .26]); return p; }
function drawMold(t) { const x = cx; const M = moldG(); const sh = mShake > 0 ? Math.sin(t * 60) * mShake * 6 : 0; x.save(); x.translate(sh, 0);
  x.fillStyle = 'rgba(80,40,90,.18)'; x.beginPath(); x.ellipse(M.x, M.bottom + 8, M.w * .55, 14, 0, 0, TAU); x.fill();
  if (phase === 'crack' || phase === 'roul') { const tc = phase === 'crack' ? TIERS[rTier].c : '#ffffff'; x.save(); x.shadowColor = tc; x.shadowBlur = 30 + 25 * Math.sin(t * 6) + crackN * 12; x.fillStyle = rgba(tc, .25); x.fill(moldPath(M)); x.restore(); }
  const g = x.createLinearGradient(M.x - M.w / 2, 0, M.x + M.w / 2, 0); g.addColorStop(0, 'rgba(220,235,255,.75)'); g.addColorStop(.5, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(190,210,240,.75)'); x.fillStyle = g; x.fill(moldPath(M));
  const inner = moldPath(M, 9); x.save(); x.clip(inner); const ih = M.h - 18, base = M.bottom - 9; let y = base; const tot = layers.reduce((a, l) => a + l.a, 0) || 1;
  layers.forEach((l, i) => { const hgt = l.a / tot * fill * ih * .97, yTop = y - hgt; const wob = k => Math.sin(k * .045 + t * 2.2 + i * 1.7) * (pouring && i === layers.length - 1 ? 6 : 3);
    const lg = x.createLinearGradient(0, yTop, 0, y); lg.addColorStop(0, mixC(l.c, '#ffffff', .35)); lg.addColorStop(1, l.c); x.fillStyle = lg; x.beginPath(); x.moveTo(M.x - M.w, y + 4); for (let k = -M.w; k <= M.w; k += 10) x.lineTo(M.x + k, yTop + wob(k)); x.lineTo(M.x + M.w, y + 4); x.closePath(); x.fill(); y = yTop; });
  if (pouring && layers.length && fill < 1) { const top = layers[layers.length - 1]; for (let k = 0; k < 3; k++) { const a = t * 4 + k * 2.1, r = 14 + k * 9; x.strokeStyle = rgba(top.c, .7); x.lineWidth = 6; x.beginPath(); x.arc(M.x + Math.cos(a) * 10, y + 30 + k * 12, r, a, a + 2.4); x.stroke(); } }
  for (const bu of bubbles) { x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 1.5; x.beginPath(); x.arc(bu.x, bu.y, bu.r, 0, TAU); x.stroke(); }
  if (fill > 0) { const r = rng(7); if (toy.glitter !== 'none') for (let i = 0; i < 60; i++) { const px = M.x + (r() - .5) * M.w * .85, py = base - r() * fill * ih; x.fillStyle = toy.glitter === 'gold' ? '#ffd860' : toy.glitter === 'holo' ? `hsl(${i * 40 + t * 80},90%,72%)` : toy.glitter === 'hearts' ? '#ff4a8a' : toy.glitter === 'stars' ? '#ffd23a' : toy.glitter === 'moons' ? '#ffe27a' : '#ffffff'; x.globalAlpha = .5 + .5 * Math.sin(t * 4 + i); x.fillRect(px, py, 3.5, 3.5); } x.globalAlpha = 1;
    for (const a of toy.addins) for (let i = 0; i < 4; i++) { const px = M.x + (r() - .5) * M.w * .7, py = base - (.1 + r() * .8) * fill * ih + Math.sin(t * 1.5 + i) * 4; x.font = `${M.w * .1}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ADD_E[a], px, py); } }
  x.restore();
  x.strokeStyle = 'rgba(150,130,200,.6)'; x.lineWidth = 4; x.stroke(moldPath(M)); x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.ellipse(M.x - M.w * .3, M.top + M.h * .35, M.w * .06, M.h * .2, -.1, 0, TAU); x.fill();
  x.save(); x.font = `900 ${M.w * .32}px system-ui`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(255,255,255,.8)'; x.strokeStyle = 'rgba(168,58,138,.55)'; x.lineWidth = 5; x.strokeText('?', M.x + M.w * .2, M.top + M.h * .58); x.fillText('?', M.x + M.w * .2, M.top + M.h * .58); x.restore();
  if (!sealed) { x.fillStyle = 'rgba(255,255,255,.85)'; x.strokeStyle = 'rgba(150,130,200,.7)'; x.lineWidth = 3; x.beginPath(); x.moveTo(M.x - 40, M.top - 30); x.lineTo(M.x + 40, M.top - 30); x.lineTo(M.x + 12, M.top + 8); x.lineTo(M.x - 12, M.top + 8); x.closePath(); x.fill(); x.stroke(); }
  else { lidY = lerp(lidY, 0, .25); const ly = M.top - 4 + lidY; const lg = x.createLinearGradient(0, ly - 30, 0, ly + 10); lg.addColorStop(0, '#ff9ad0'); lg.addColorStop(1, '#e8409a'); x.fillStyle = lg; x.beginPath(); x.roundRect(M.x - M.w * .36, ly - 24, M.w * .72, 34, 17); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(M.x, ly - 28, 9, 0, TAU); x.fill(); }
  if (cracks.length) { x.save(); x.shadowColor = TIERS[rTier].c; x.shadowBlur = 16; x.strokeStyle = mixC(TIERS[rTier].c, '#ffffff', .5); x.lineWidth = 3.5; x.lineCap = 'round'; for (const c of cracks) { x.beginPath(); c.forEach(([px, py], i) => i ? x.lineTo(M.x + px * M.w, M.top + py * M.h) : x.moveTo(M.x + px * M.w, M.top + py * M.h)); x.stroke(); } x.restore(); }
  if (!sealed) { const bx = M.x + 30, by = M.top - 86, s = .62, a = -tilt * 2.0; x.save(); x.translate(bx, by); x.rotate(a); x.scale(s, s); x.fillStyle = '#ffffff'; x.strokeStyle = '#b8a8d8'; x.lineWidth = 4; x.beginPath(); x.roundRect(-34, -40, 68, 110, 18); x.fill(); x.stroke(); x.fillStyle = sel; x.beginPath(); x.roundRect(-28, -2, 56, 66, 10); x.fill(); x.fillStyle = 'rgba(255,255,255,.45)'; x.fillRect(-22, 2, 8, 56); x.fillStyle = '#ffd23a'; x.beginPath(); x.moveTo(-14, -40); x.lineTo(14, -40); x.lineTo(5, -66); x.lineTo(-5, -66); x.closePath(); x.fill(); x.stroke(); x.restore();
    if (pouring && fill < 1 && tilt > .5) { const nx = bx + Math.sin(-a) * 66 * s * -1 * -1, ny = by - Math.cos(a) * 66 * s; const lvl = M.bottom - 9 - fill * (M.h - 18), w = 8 + Math.sin(t * 25) * 1.5; x.fillStyle = sel; x.beginPath(); x.moveTo(nx - 3, ny); x.quadraticCurveTo(M.x, ny, M.x - w / 2, M.top + 10); x.lineTo(M.x - w / 2, lvl); x.lineTo(M.x + w / 2, lvl); x.lineTo(M.x + w / 2, M.top + 10); x.quadraticCurveTo(M.x + 6, ny + 4, nx + 3, ny); x.fill(); } }
  x.restore(); }
function pourTick(dt) { tilt = lerp(tilt, pouring && fill < 1 && !sealed ? 1 : 0, Math.min(1, dt * 8)); const M = moldG();
  if (pouring && tilt > .75 && fill < 1 && !sealed) { const top = layers[layers.length - 1]; if (!top || top.c !== sel) layers.push({ c: sel, a: 0 }); layers[layers.length - 1].a += dt; fill = Math.min(1, fill + dt * .2);
    if (Math.random() < dt * 8) A.tone(160 + Math.random() * 140, .1, 'sine', .07, 0, 90 + Math.random() * 60); if (Math.random() < dt * 14) bubbles.push({ x: M.x + (Math.random() - .5) * M.w * .6, y: M.bottom - 12, r: 2 + Math.random() * 4, v: 30 + Math.random() * 40 });
    upFill(); if (fill >= 1) { pouring = false; A.voice('yay', 1.4); toast(T('התבנית מלאה! סגרו אותה 🔒', 'The mold is full! Seal it 🔒'), 1500); renderPanel(); } }
  for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; b.y -= b.v * dt; if (b.y < M.bottom - 9 - fill * (M.h - 18)) bubbles.splice(i, 1); }
  if (mShake > 0) mShake = Math.max(0, mShake - dt * 2.5); }
function upFill() { const f = $('fillI'); if (f) f.style.width = Math.round(fill * 100) + '%';  }

/* ================= ROULETTE & CRACK ================= */
function rollTier() { const tot = TIERS.reduce((a, t) => a + t.w, 0); let r = Math.random() * tot, k = 0; for (; k < 4; k++) { r -= TIERS[k].w; if (r < 0) break; }
  if (S.pity >= 7 && k < 3) k = 3; if (!S.made && k < 1) k = 1; S.pity = k >= 3 ? 0 : S.pity + 1; return k; }
let forceTier = -1;
function seal() { if (fill < .97 || sealed) return; sealed = 1; lidY = -120; A.noise(.2, 'lowpass', 400, 2, .2, .15); A.tone(140, .2, 'sine', .15, .15); buzz(30); mShake = .5; phase = 'roul'; step = 1; renderPanel();
  rTier = forceTier >= 0 ? forceTier : rollTier(); let n = 26 + Math.floor(Math.random() * 5); while (n % 5 !== rTier) n++; roul = { i: 0, n, idx: 0, next: .35, t: 0, done: 0 }; A.loopOn('roll', 'bandpass', 300, 3, 0); }
function roulTick(dt) { if (!roul || roul.done) return; roul.t += dt; const L = A.loop('roll'); if (L) { L.g.gain.value = .05 + .1 * roul.i / roul.n; L.fl.frequency.value = 300 + roul.i * 30; } if (roul.t < roul.next) return;
  roul.t = 0; roul.i++; roul.idx = roul.i % 5; const p = roul.i / roul.n; roul.next = .045 + .5 * p ** 3.2; A.tone(520 + roul.idx * 130, .06, 'square', .05); buzz(6); if (roul.idx >= 3 && p > .7) A.tone(1200 + roul.idx * 100, .1, 'triangle', .04);
  if (roul.i >= roul.n) { roul.done = 1; A.loopOff('roll'); flash(.3); [0, 4, 7, 12, 16, 19].slice(0, 2 + rTier).forEach((k, j) => A.tone(523 * Math.pow(2, k / 12), .25, 'triangle', .08, j * .09)); if (rTier >= 3) A.voice('wow', 1.2); buzz(rTier >= 3 ? 120 : 40);
    const T0 = TIERS[rTier]; const el = $('tierB'); el.innerHTML = `<b style="--c:${T0.c}">${T0.g} ${T0.n}${rTier >= 3 ? '!!' : '!'}</b>`; el.className = 'tierB on t' + rTier; setTimeout(() => { phase = 'crack'; crackN = 0; renderPanel(); }, 1100); } }
function drawRoulette(t) { if (phase !== 'roul' && phase !== 'crack') return; const M = moldG(); const span = Math.min(VW - 36, 440), cy = Math.max(118, M.top - 78); const x = cx; x.save(); x.shadowColor = 'rgba(168,58,138,.35)'; x.shadowBlur = 18; x.shadowOffsetY = 6; x.fillStyle = '#fff'; x.beginPath(); x.roundRect(VW / 2 - span / 2 - 8, cy - 40, span + 16, 96, 26); x.fill(); x.shadowColor = 'transparent'; x.strokeStyle = '#ffb8e0'; x.lineWidth = 3; x.stroke(); x.restore();
  for (let k = 0; k < 5; k++) { const px = VW / 2 + (EN ? (k - 2) : (2 - k)) * span / 5, py = cy; const lit = (phase === 'roul' && roul && roul.idx === k) || (phase === 'crack' && k === rTier); const T0 = TIERS[k];
    x.save(); x.globalAlpha = lit ? 1 : .35; if (lit) { x.shadowColor = T0.c; x.shadowBlur = 30; } x.fillStyle = k === 4 ? `hsl(${t * 120 % 360},90%,70%)` : T0.c; x.beginPath(); x.arc(px, py, lit ? 26 : 18, 0, TAU); x.fill(); x.shadowBlur = 0; x.fillStyle = '#fff'; x.beginPath(); x.arc(px - 6, py - 6, lit ? 7 : 5, 0, TAU); x.fill();
    x.font = `900 ${lit ? 15 : 12}px system-ui`; x.textAlign = 'center'; x.fillStyle = lit ? '#5a1a5a' : 'rgba(90,26,90,.6)'; x.fillText(T0.n, px, py + 44); x.restore(); }
  if (phase === 'roul' && roul) { const px = VW / 2 + (EN ? (roul.idx - 2) : (2 - roul.idx)) * span / 5; x.fillStyle = '#ff3a8a'; x.beginPath(); x.moveTo(px, cy - 30); x.lineTo(px - 10, cy - 48); x.lineTo(px + 10, cy - 48); x.closePath(); x.fill(); } }
function crackTap(px, py) { const M = moldG(); const need = TIERS[rTier].taps; crackN++; mShake = .8; buzz(25 + crackN * 10); A.noise(.18, 'highpass', 2500 + crackN * 600, 1, .2); A.tone(300 + crackN * 120, .2, 'triangle', .08); burstAt(px, py, 4 + crackN * 2, ['✨', '💥']);
  const sx = clamp((px - M.x) / M.w, -.4, .4), sy = clamp((py - M.top) / M.h, .15, .9); for (let k = 0; k < 2 + crackN; k++) { let a = sx, b = sy; const c = [[a, b]], a0 = Math.random() * TAU; for (let s = 0; s < 4; s++) { a += Math.cos(a0 + (Math.random() - .5)) * .09; b += Math.sin(a0 + (Math.random() - .5)) * .1; c.push([a, b]); } cracks.push(c); }
  if (crackN < need) { toast(T(`עוד ${need - crackN}! 👊`, `${need - crackN} more! 👊`), 600); return; } reveal(); }
function reveal() { const M = moldG(); phase = 'reveal'; flash(1); buzz([40, 30, 80]); A.noise(.6, 'lowpass', 1200, 1, .3); A.tone(200, .5, 'sine', .15, 0, 800); const T0 = TIERS[rTier];
  const fan = [[0, 4, 7, 12], [0, 4, 7, 12, 16], [0, 4, 7, 11, 14, 19], [0, 4, 7, 12, 16, 19, 24], [0, 4, 7, 12, 16, 19, 24, 28]][rTier]; fan.forEach((k, j) => A.tone(523 * Math.pow(2, k / 12), .35, 'triangle', .08, .15 + j * .1)); setTimeout(() => A.voice(rTier >= 2 ? 'wow' : 'yay', 1.3), 500);
  const cols = layers.map(l => l.c).filter((c, i, a) => a.indexOf(c) === i).slice(0, 4); toy.colors = cols.length ? cols : [sel]; const dom = layers.reduce((m, l) => l.a > m.a ? l : m, layers[0] || { c: sel, a: 0 }).c; toy.color = mixC(dom, blend(toy.colors), .3); toy.tier = rTier; toy.pattern = pick(TIER_PATS[rTier]);
  if (toy.colors.length < 2 && (toy.pattern === 'swirl' || toy.pattern === 'layers' || toy.pattern === 'spots')) toy.colors = [toy.colors[0], mixC(toy.colors[0], '#ffffff', .65), mixC(toy.colors[0], '#5a2a8a', .35)];
  toy.shape = pick(SHAPES)[0]; toy.face = pick(FACES); toy.acc = rTier === 4 ? 'crown' : rTier === 3 ? pick(['bow', 'flower', 'phones', 'sprinkles', 'hat', 'star', 'cherry', 'fly']) : 'none'; toy.cheeks = 1; toy.id = Date.now();
  const key = toy.shape + '|' + rTier, isNew = !S.album[key]; S.album[key] = JSON.parse(JSON.stringify(toy)); S.made = (S.made || 0) + 1; S.toys.unshift(JSON.parse(JSON.stringify(toy))); S.toys = S.toys.slice(0, 40); S.save();
  sealed = 0; fill = 0; layers = []; cracks = []; step = 2; state = 'play'; rayT = 4; renderPanel();
  body = makeBody(toy, { at: [M.x, M.top + M.h * .5], v: [0, -1100] }); for (let i = 0; i < 18 + rTier * 6; i++) setTimeout(() => burstAt(VW / 2 + (Math.random() - .5) * VW * .8, VH * .45, 1, rTier >= 3 ? ['⭐', '✨', '💖', '🌟'] : ['✨', '💗', '🫧']), i * 40);
  const el = $('tierB'); el.innerHTML = `<b style="--c:${T0.c}">${T0.g} ${T0.n}</b><span>${SHN[toy.shape]} ${PAT[toy.pattern]}</span>${isNew ? `<i>${T('חדש באוסף!', 'NEW in your album!')}</i>` : ''}`; el.className = 'tierB on big t' + rTier; setTimeout(() => el.classList.remove('on'), 3800); }
function flash(v) { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = v; requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'opacity .7s'; f.style.opacity = 0; })); }
function drawRays(t) { if (rayT <= 0 || !body || !body.T) return; const c = TIERS[rTier].c, a = Math.min(1, rayT / 1.5), X = body.T.cx, Y = body.T.cy; const x = cx; x.save(); x.globalAlpha = a * .5; x.translate(X, Y); x.rotate(t * .6); for (let i = 0; i < 14; i++) { x.rotate(TAU / 14); const g = x.createLinearGradient(0, 0, 0, -VH); g.addColorStop(0, rgba(c, .9)); g.addColorStop(1, rgba(c, 0)); x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.lineTo(-VW * .09, -VH); x.lineTo(VW * .09, -VH); x.fill(); } x.restore(); }

/* ================= PANEL ================= */
const STEPT = [T('🧪 שופכים לתבנית ההפתעה', '🧪 Pour into the surprise mold'), T('🎰 מה יצא?!', '🎰 What will it be?!'), T('🫧 הסקווישי שלכם!', '🫧 Your squishy!')];
function renderPanel() { $('stepT').textContent = STEPT[step]; let h = '';
  if (step === 0) { h += `<div class="lbl">${T('בחרו צבע ולחצו־החזיקו על המסך כדי לשפוך (אפשר כמה צבעים!)', 'Pick a color, press & hold to pour (mix several!)')}</div><div class="row2">${COLORS.map(c => `<button class="sw${sel === c ? ' on' : ''}" data-col="${c}" style="background:${c}"></button>`).join('')}</div>`;
    h += `<div class="row2">${GLITTER.map(([k, ic]) => `<button class="ch${toy.glitter === k ? ' on' : ''}" data-gl="${k}">${ic}</button>`).join('')}<span class="sep"></span>${ADDINS.map(([k, ic]) => `<button class="ch${toy.addins.includes(k) ? ' on' : ''}" data-ad="${k}">${ic}</button>`).join('')}</div>`;
    h += `<div class="mixbar"><i id="fillI" style="width:${Math.round(fill * 100)}%"></i><span>${T('מילוי התבנית', 'Mold fill')}</span></div><div class="nav1">${fill < .97 ? `<button class="btn pri big pour" id="pourB">🫗 ${T('החזיקו כדי לשפוך', 'Hold to pour')}</button>` : `<button class="btn pri big ready" id="sealB">🔒 ${T('לסגור ולגלות מה יצא!', 'Seal it & find out!')}</button>`}</div>`; }
  else if (step === 1) h += `<div class="hint big">${phase === 'crack' ? T('👊 הקישו על התבנית כדי לפצח אותה!', '👊 Tap the mold to crack it open!') : T('🥁 מגרילים את הנדירות…', '🥁 Rolling the rarity…')}</div>`;
  else { h += `<div class="hint">${T('מתחו · לחצו־החזיקו למעיכה · הקישו להקפצה', 'Stretch · hold to squish · tap to bounce')}</div><div class="row2">${FACES.map(f => `<button class="ch${toy.face === f ? ' on' : ''}" data-fa="${f}">${{ happy: '😊', kawaii: '🥺', wink: '😉', sleepy: '😌', surprise: '😮', tongue: '😛' }[f]}</button>`).join('')}<span class="sep"></span>${ACCS.map(([k, ic]) => `<button class="ch${toy.acc === k ? ' on' : ''}" data-ac="${k}">${ic}</button>`).join('')}</div><div class="nav1"><button class="btn pri big ready" id="againB">🎁 ${T('עוד תבנית הפתעה!', 'Another surprise mold!')}</button></div>`; }
  $('opts').innerHTML = h; const sb = $('sealB'); if (sb) sb.onclick = () => { A.ac(); seal(); }; const pb = $('pourB'); if (pb) { pb.addEventListener('pointerdown', e => { e.preventDefault(); A.ac(); try { pb.setPointerCapture(e.pointerId); } catch (er) { } pouring = true; pb.classList.add('on'); }); const off = () => { pouring = false; pb.classList.remove('on'); }; pb.addEventListener('pointerup', off); pb.addEventListener('pointercancel', off); } const ab = $('againB'); if (ab) ab.onclick = () => { A.ac(); saveCur(); startMake(null); };
  panelH = $('panel').offsetHeight || panelH; if (body) body.relayout(); }
function saveCur() { if (!toy || !toy.id) return; const i = S.toys.findIndex(z => z.id === toy.id); if (i >= 0) S.toys[i] = JSON.parse(JSON.stringify(toy)); const key = toy.shape + '|' + (toy.tier || 0); if (S.album[key] && S.album[key].id === toy.id) S.album[key] = JSON.parse(JSON.stringify(toy)); S.save(); }
const shapeCache = {}; function shapeIcon(k, col = '#ffb8e0', line = '#a85a8a') { const key = k + col; if (shapeCache[key]) return shapeCache[key]; const c = cnv(80, 80), x = c.getContext('2d'); const q = shapeQ(k); x.translate(40, 42); x.beginPath(); q.forEach(([a, b], i) => i ? x.lineTo(a * 24, b * 24) : x.moveTo(a * 24, b * 24)); x.closePath(); x.fillStyle = col; x.fill(); x.strokeStyle = line; x.lineWidth = 2.5; x.stroke(); return shapeCache[key] = c.toDataURL(); }
$('opts').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.id) return; A.ac(); const d = b.dataset;
  if (d.col) { sel = d.col; A.tone(500 + COLORS.indexOf(d.col) * 60, .1, 'sine', .06); document.querySelectorAll('.sw').forEach(s => s.classList.toggle('on', s.dataset.col === sel)); return; }
  if (d.gl) { toy.glitter = d.gl; if (d.gl !== 'none') { for (let i = 0; i < 5; i++) A.noise(.08, 'highpass', 5000 + i * 500, 1, .04, i * .08); mShake = .3; } }
  if (d.ad) { const i = toy.addins.indexOf(d.ad); if (i >= 0) toy.addins.splice(i, 1); else if (toy.addins.length < 3) { toy.addins.push(d.ad); A.tone(300, .12, 'sine', .08, 0, 160); mShake = .3; } }
  if (d.fa) { toy.face = d.fa; A.voice('yay', 1.6); saveCur(); }
  if (d.ac) { toy.acc = d.ac; A.tone(1200, .08, 'triangle', .05); saveCur(); }
  renderPanel(); });

/* ================= INPUT ================= */
const fx = []; function puff(n) { const T2 = body && body.T; if (!T2) return; for (let i = 0; i < n; i++) fx.push({ x: T2.cx + (Math.random() - .5) * body.R * 1.6, y: T2.cy - body.R * .3, vx: (Math.random() - .5) * 80, vy: -90 - Math.random() * 120, l: 1.2 + Math.random() * .6, e: pick(['💗', '✨', '💜', '⭐', '🫧']), s: 16 + Math.random() * 14 }); }
function burstAt(x, y, n, em) { for (let i = 0; i < n; i++) fx.push({ x: x + (Math.random() - .5) * 40, y, vx: (Math.random() - .5) * 260, vy: -150 - Math.random() * 260, l: 1.1 + Math.random() * .8, e: pick(em), s: 18 + Math.random() * 18, g: 1 }); }
function hitBody(x, y) { if (!body || !body.T) return false; if (cx.isPointInPath(bodyPath(body), x * dpr, y * dpr)) return true; return Math.hypot(x - body.T.cx, y - body.T.cy) < body.R * 1.15; }
cv.addEventListener('pointerdown', e => { if (state === 'title') return; A.ac(); try { cv.setPointerCapture(e.pointerId); } catch (er) { } const x = e.clientX, y = e.clientY;
  if (step === 0) { if (fill < 1) pouring = true; return; }
  if (step === 1) { if (phase === 'crack') crackTap(x, y); return; }
  if (!hitBody(x, y)) return; const R = body.R, w = [], a = [], bt = []; let mx = 0; const maxY = Math.max(...body.q.map(p => p[1])); for (let i = 0; i < N; i++) { const d = Math.hypot(body.pts[i][0] - x, body.pts[i][1] - y); const bottomness = clamp((body.q[i][1] - (maxY - .45)) / .45, 0, 1); const wi = Math.exp(-(d * d) / (2 * (R * .85) ** 2)) * (1 - .8 * bottomness); w.push(wi); bt.push(bottomness); mx = Math.max(mx, wi); a.push([body.pts[i][0], body.pts[i][1]]); }
  for (let i = 0; i < N; i++) w[i] /= mx || 1;
  body.hands.set(e.pointerId, { x0: x, y0: y, x, y, t0: performance.now(), mode: 'press', depth: 0, w, a, bt, stretch: 0, max: 0 }); squishSnd(); buzz(12); });
cv.addEventListener('pointermove', e => { const x = e.clientX, y = e.clientY; const h = body && body.hands.get(e.pointerId); if (!h) return; h.x = x; h.y = y; if (h.mode === 'press' && Math.hypot(x - h.x0, y - h.y0) > 10) { h.mode = 'drag'; h.depth = 0; stretchSnd(); }
  if (h.mode === 'drag') { h.max = Math.max(h.max, h.stretch); if (Math.random() < .12) A.tone(160 + h.stretch * .8, .12, 'sine', .04, 0, 200 + h.stretch); } });
const up = e => { pouring = false; const h = body && body.hands.get(e.pointerId); if (!h) return; body.hands.delete(e.pointerId); const held = performance.now() - h.t0;
  if (h.mode === 'drag') { const st = h.max / body.R; A.tone(140 + st * 60, .35, 'sine', .1, 0, 420 + st * 120); A.noise(.15, 'bandpass', 600, 3, .05); buzz(15); if (st > .6) puff(2); }
  else if (held < 200) { for (const v of body.vel) v[1] -= 420; puff(3); A.tone(260, .18, 'sine', .1, 0, 520); } else { releaseSnd(); puff(5); } };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
function squishSnd() { A.noise(.35, 'lowpass', 500, 3, .18, 0, 160); A.tone(180, .3, 'sine', .08, 0, 90); }
function stretchSnd() { A.tone(220, .4, 'sine', .05, 0, 520); A.noise(.3, 'bandpass', 700, 4, .05); }
function releaseSnd() { A.noise(.9, 'lowpass', 220, 2, .06, 0, 500); A.tone(120, .8, 'sine', .04, 0, 240); }

/* ================= FLOW ================= */
function startMake(spec) { $('tierB').className = 'tierB'; fx.length = 0; rayT = 0; cracks = []; crackN = 0; roul = null; A.loopOff('roll');
  $('title').hidden = true; $('album').hidden = true; $('panel').hidden = false; $('hud').hidden = false; panelH = $('panel').offsetHeight || 200;
  if (spec) { toy = JSON.parse(JSON.stringify(spec)); toy.colors = toy.colors || [toy.color]; step = 2; state = 'play'; phase = 'reveal'; rTier = toy.tier || 0; renderPanel(); body = makeBody(toy); }
  else { toy = { colors: [], color: '#f4f4fa', glitter: 'none', addins: [], shape: 'blob', face: 'kawaii', cheeks: 1, acc: 'none', seed: Math.floor(Math.random() * 1e6) }; body = null; step = 0; state = 'make'; phase = 'pour'; fill = 0; layers = []; sealed = 0; sel = pick(COLORS.slice(0, 7)); renderPanel();
    if (!S.tut) { S.tut = 1; S.save(); setTimeout(() => toast(T('בחרו צבע ולחצו־החזיקו כדי לשפוך. מה ייצא? אף אחד לא יודע! 🎁', 'Pick a color and hold to pour. What will come out? Nobody knows! 🎁'), 4200), 500); } }
  A.startMusic({ chords: [[60, 64, 67, 71], [65, 69, 72, 76], [62, 65, 69, 72], [67, 71, 74, 77]], bpm: 84, lead: true, vol: .4 }); }
function showTitle() { saveCur(); state = 'title'; A.stopMusic(); A.loopOff('roll'); body = null; $('title').hidden = false; $('panel').hidden = true; $('hud').hidden = true; $('album').hidden = true; $('tierB').className = 'tierB';
  $('shelf').innerHTML = S.toys.length ? S.toys.slice(0, 12).map((t2, i) => `<button class="tc t${t2.tier || 0}" data-i="${i}"><img src="${thumb(t2)}" alt=""></button>`).join('') : `<p class="empty">${T('עוד אין צעצועים – בואו נגלה את הראשון! 🎁', 'No toys yet – let’s discover the first! 🎁')}</p>`; $('shelfT').textContent = T('🧸 המדף שלי', '🧸 My shelf');
  const tot = SHAPES.length * TIERS.length, got = Object.keys(S.album).length; $('albumBtn').textContent = `📖 ${T('האוסף שלי', 'My album')} ${got}/${tot}`;
  if (!$('demo').src) $('demo').src = thumb({ colors: ['#ff7ac0', '#a87aff', '#5ac8ff'], color: '#ff8ac8', glitter: 'holo', addins: ['beads'], shape: 'cat', face: 'kawaii', cheeks: 1, acc: 'bow', seed: 7, tier: 2, pattern: 'swirl' }, 360); }
function openAlbum() { $('album').hidden = false; const got = Object.keys(S.album).length; let h = `<div class="ahead"><button class="btn" id="aClose">✕</button><h3>📖 ${T('האוסף שלי', 'My album')} · ${got}/${SHAPES.length * TIERS.length}</h3></div><div class="agrid">`;
  for (let k = TIERS.length - 1; k >= 0; k--) { h += `<div class="arow"><span class="tl t${k}">${TIERS[k].g} ${TIERS[k].n}</span><div class="acs">`; for (const [s] of SHAPES) { const sp = S.album[s + '|' + k]; h += sp ? `<button class="ac t${k}" data-k="${s}|${k}"><img src="${thumb(sp, 120)}" alt=""></button>` : `<span class="ac lock"><img src="${shapeIcon(s, 'rgba(120,90,140,.22)', 'rgba(120,90,140,.35)')}" alt=""><i>?</i></span>`; } h += '</div></div>'; }
  $('album').innerHTML = h + '</div>'; $('aClose').onclick = () => { $('album').hidden = true; }; }
$('album').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; A.ac(); startMake(S.album[b.dataset.k]); });
function thumb(spec, sz = 200) { const sv = [VW, VH]; VW = 200; VH = 200; TH = 1; const b = makeBody({ ...spec, colors: spec.colors || [spec.color], addins: spec.addins || [] }, { face: 1 }); for (let k = 0; k < 160; k++) stepBody(b, 1 / 60); const c = cnv(sz, sz), x = c.getContext('2d'); x.scale(sz / 200, sz / 200); drawToy(x, b, 0); [VW, VH] = sv; TH = 0; return c.toDataURL(); }
$('shelf').onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; A.ac(); startMake(S.toys[+b.dataset.i]); };
$('albumBtn').onclick = () => { A.ac(); openAlbum(); };
$('newBtn').onclick = () => { A.ac(); startMake(null); }; $('backBtn').onclick = () => showTitle();
$('backBtn').innerHTML = ICO.home('#a83a8a'); $('homeT').innerHTML = ICO.home('#a83a8a'); soundButton('sndBtn', S, A, '#a83a8a'); hubButtons(['homeT'], A); $('newBtn').textContent = T('🎁 תבנית הפתעה!', '🎁 Surprise mold!');
$('tSub').textContent = T('שופכים סליים צבעוני לתבנית סודית, סוגרים… ומגלים מה יצא! רגיל, נדיר, אפי, אגדי – או מיתי?!', 'Pour colorful slime into a secret mold, seal it… and find out what comes out! Common, rare, epic, legendary – or mythic?!');
addEventListener('resize', layout);
let last = performance.now();
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(1 / 30, (now - last) / 1000) * (window.__fast || 1); last = now; const t = now / 1000; A.tick(); cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, VW, VH); if (state === 'title') return;
  if (step <= 1) { pourTick(dt); roulTick(dt); drawMold(t); drawRoulette(t); }
  if (body) { if (rayT > 0) { rayT -= dt; drawRays(t); } for (let k = 0; k < 3; k++) stepBody(body, dt / 3); drawToy(cx, body, t); }
  for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.l -= dt; if (f.l <= 0) { fx.splice(i, 1); continue; } f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.g ? 380 : 40) * dt; cx.globalAlpha = Math.min(1, f.l); cx.font = `${f.s}px serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(f.e, f.x, f.y); } cx.globalAlpha = 1; }
setTimeout(() => { layout(); showTitle(); $('loading').hidden = true; requestAnimationFrame(frame); window.__sqOK = true; }, 20);
window.__sq = { startMake, thumb, get toy() { return toy; }, get body() { return body; }, get step() { return step; }, get phase() { return phase; }, get fill() { return fill; }, setFill(v) { fill = v; layers = [{ c: '#ff7ac0', a: 1 }, { c: '#5ac8ff', a: 1 }, { c: '#ffe05a', a: .6 }]; renderPanel(); }, seal, crack: () => crackTap(VW / 2, VH / 2), force(k) { forceTier = k; }, openAlbum, S, get state() { return state; } };
