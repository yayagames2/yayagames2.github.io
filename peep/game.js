import { $, clamp, lerp, rnd, rng, T, EN, store, audio, toast, ICO, hubButtons, soundButton, starsHTML } from '../lib/kit.js';
import { DRAW, BB, TOP, chick, mkPersonV, PAL, TAU } from './art.js';

const S = store('peep-save', { stars: {}, best: {}, tut: 0 });
const A = audio(S);
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/* ================= THEMES ================= */
const THEMES = [
  { id: 'farm', ic: '🐄', n: T('החווה', 'The Farm'), g: '#8ccc5c', g2: '#7aba4c', tuft: '#5a9a3a', path: '#dcb47e', water: '#5ab8ea', pond: 1, paths: 2, fields: 1,
    w: [['person', 4], ['child', 2], ['tree', 3], ['bush', 3], ['flowers', 4], ['cow', 2], ['sheep', 3], ['pig', 2], ['hen', 4], ['dog', 1], ['cat', .7], ['fence', 2], ['hay', 2], ['house', .45], ['barn', .3], ['tractor', .35], ['sunflower', 1], ['rock', .7]], wat: [['duck', 3], ['rduck', .4]], ppl: { hats: ['', '', 'cap', 'straw', 'straw', 'sun'] }, dec: ['sunflower', 'hen', 'rduck', 'hay'] },
  { id: 'beach', ic: '🏖️', n: T('חוף הים', 'The Beach'), g: '#f4dc9a', g2: '#eccf88', tuft: '#d8bc78', water: '#3aaee8', sea: 1,
    w: [['person', 7], ['child', 3], ['umbrella', 3], ['towel', 4], ['castle', 2], ['bucket', 2], ['ball', 2], ['palm', 1.3], ['surf', 1.3], ['cart', .5], ['rock', .6], ['dog', .6], ['rduck', .3]], wat: [['boat', 1.2], ['person', 1.4], ['child', .6], ['rduck', .4], ['ball', .5]], ppl: { hats: ['', '', 'sun', 'cap', 'straw'], holds: ['', '', '', 'ice', 'ice', 'balloon', 'bag'] }, dec: ['rduck', 'ball', 'bucket'] },
  { id: 'park', ic: '🎈', n: T('הפארק', 'The Park'), g: '#82cc62', g2: '#72bc52', tuft: '#4a9a3a', path: '#e0d2b4', water: '#62bff0', pond: 1, paths: 3,
    w: [['person', 8], ['child', 4], ['tree', 3], ['bush', 3], ['flowers', 3], ['bench', 1.4], ['lamp', 1], ['dog', 1.5], ['bike', 1], ['balloons', .5], ['cart', .5], ['fountain', .12], ['cat', .4]], wat: [['duck', 3], ['rduck', .5]], ppl: { holds: ['', '', 'balloon', 'balloon', 'ice', 'flag', 'bag'] }, dec: ['rduck', 'balloons', 'flowers'] },
  { id: 'market', ic: '🍋', n: T('השוק', 'The Market'), g: '#e2d6c6', g2: '#d6c8b6', tuft: '#c4b4a0', path: '#cfc2b0', tiles: 1, paths: 2,
    w: [['person', 11], ['child', 3], ['stall', 3], ['crate', 3], ['car', .6], ['bike', .8], ['lamp', .6], ['shop', .7], ['cat', .8], ['dog', .5], ['balloons', .25], ['cart', .3]], wat: [], ppl: { holds: ['', '', 'bag', 'bag', 'balloon', 'ice'] }, dec: ['crate', 'stall'] },
  { id: 'snow', ic: '⛄', n: T('כפר השלג', 'Snow Village'), g: '#eef4fb', g2: '#e0eaf6', tuft: '#cad8ea', path: '#d4e0ee', water: '#c4e6fa', pond: 1, paths: 2, ice: 1,
    w: [['person', 5], ['child', 3], ['pine', 5], ['snowman', 2], ['cabin', .55], ['sled', 2], ['penguin', 1.6], ['fence', 1], ['rock', .5], ['dog', .5]], wat: [['person', 2.2], ['child', 1.2], ['penguin', 1]], ppl: { hats: ['beanie', 'beanie', 'beanie', ''], scarf: 1 }, dec: ['snowman'] },
];
const NL = THEMES.length * 5;
const BIG = new Set(['house', 'barn', 'cabin', 'shop', 'stall', 'fountain', 'tractor', 'tree', 'pine', 'palm', 'umbrella', 'car']);
const TALL = ['tree', 'pine', 'bush', 'house', 'barn', 'cabin', 'shop', 'stall', 'car', 'hay', 'cow', 'person', 'snowman', 'umbrella', 'tractor', 'castle', 'fountain', 'balloons', 'cart', 'boat'];

/* ================= LEVEL GEN ================= */
let LV = null;
const BL = (pts) => { const p = new Path2D(), n = pts.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; let s = m(pts[n - 1], pts[0]); p.moveTo(...s); for (let i = 0; i < n; i++) { const c = pts[i], e = m(c, pts[(i + 1) % n]); p.quadraticCurveTo(c[0], c[1], e[0], e[1]); } p.closePath(); return p; };
const tc = cnv(1, 1).getContext('2d');
function gen(L, port) { const th = THEMES[Math.floor(L / 5)], d = L / (NL - 1), k = L % 5; const r = rng(1009 + L * 7919); const R = (a, b) => a + r() * (b - a), pick = a => a[Math.floor(r() * a.length)];
  let W = Math.round(1250 + d * 1650 + k * 40), H = Math.round(W * .68); if (port) [W, H] = [H, W]; const sp = 72 - d * 16; const nCh = 5 + Math.round(d * 7); const cR = 10 - d * 4.3; const decP = .05 + d * .16;
  const lv = { L, th, W, H, d, objs: [], chicks: [], found: 0, ponds: [], paths: [], fields: [], seaY: null };
  // ground features
  if (th.sea) { const amp = H * .03; lv.seaY = x => H * .2 + Math.sin(x / 140) * amp + Math.sin(x / 47 + 2) * amp * .35; }
  if (th.pond) { const n = W > 2200 ? 2 : 1; for (let i = 0; i < n; i++) { const cx = R(W * .2, W * .8), cy = R(H * .25, H * .75), rr = R(110, 170) * (1 + d * .4); const pts = []; for (let a = 0; a < 12; a++) { const t = a / 12 * TAU, q = rr * R(.75, 1.15); pts.push([cx + Math.cos(t) * q * 1.4, cy + Math.sin(t) * q * .8]); } lv.ponds.push(BL(pts)); } }
  for (let i = 0; i < (th.paths || 0); i++) { const p = new Path2D(); const a = [R(0, W), -40], b = [R(0, W), H + 40]; if (i % 2) { a[0] = -40; a[1] = R(0, H); b[0] = W + 40; b[1] = R(0, H); } p.moveTo(...a); p.bezierCurveTo(R(0, W), R(0, H), R(0, W), R(0, H), ...b); lv.paths.push(p); }
  if (th.fields) for (let i = 0; i < 2 + Math.round(d * 2); i++) lv.fields.push([R(0, W - 260), R(H * .1, H - 200), R(160, 260), R(110, 170)]);
  const onW = (x, y) => (lv.seaY && y < lv.seaY(x) + 8) || lv.ponds.some(p => tc.isPointInPath(p, x, y));
  const onP = (x, y) => { tc.lineWidth = 60; return lv.paths.some(p => tc.isPointInStroke(p, x, y)); };
  const inField = (x, y) => lv.fields.some(([fx, fy, fw, fh]) => x > fx && x < fx + fw && y > fy && y < fy + fh);
  lv.onW = onW;
  const wsum = th.w.reduce((a, b) => a + b[1], 0), wpick = list => { let q = r() * list.reduce((a, b) => a + b[1], 0); for (const [t, w] of list) { q -= w; if (q <= 0) return t; } return list[0][0]; };
  const bigs = [];
  const mkV = t => { const g = ['#4aa84a', '#3a9a4a', '#5ab84a', '#2e8a3e', '#6ac04a']; switch (t) {
    case 'person': case 'child': return mkPersonV(r, th.ppl);
    case 'tree': return { c: pick(g), fruit: r() < .25 ? pick(['#e8302a', '#ff8a1a', '#ff5a8a']) : '' };
    case 'pine': return { c: pick(['#2e7a4a', '#3a8a52', '#266a42']), snow: th.ice ? 1 : 0 };
    case 'bush': return { c: pick(g), fl: r() < .4 ? pick(['#ff5a8a', '#ffffff', '#b87aff', '#ff8a1a']) : '' };
    case 'flowers': return { cols: [pick(['#ff5a8a', '#ffffff', '#b87aff', '#ff3a3a', '#5ac8ff']), pick(['#ff5a8a', '#ffffff', '#b87aff', '#ff8a1a'])] };
    case 'house': case 'cabin': return { wall: pick(['#ffe8c8', '#c8e8ff', '#ffd8e0', '#e8f8d8', '#f8f0e0', '#ffe0b0']), roof: pick(['#c8402a', '#3a5ab8', '#6a3a2a', '#2a8a6a', '#8a3a6a']), door: pick(['#8a5a32', '#3a5a8a', '#a83a3a']), flower: r() < .5 ? pick(['#ff5a8a', '#ff3a3a', '#ffffff']) : '', snow: th.ice };
    case 'shop': return { wall: pick(['#ffe8c8', '#c8e8ff', '#ffd8e0', '#f8f0e0']), roof: pick(['#e8302a', '#2a7aff', '#2ab06a', '#9a5aff']), sign: pick(['BAKERY', 'CAFE', 'TOYS', 'FRUIT', 'BOOKS', 'SHOES']) };
    case 'fence': return { c: pick(['#ffffff', '#c8904a', '#e8e0d0']) };
    case 'dog': return { c: pick(['#c8843a', '#f4e8d8', '#5a3a22', '#2a2a2a']) };
    case 'cat': return { c: pick(['#ff9a3a', '#3a3a3a', '#d8d0c8', '#8a8a9a']) };
    case 'hen': return { c: pick(['#ffffff', '#c8783a', '#f4f0e8']) };
    case 'duck': return { c: pick(['#2a8a4a', '#8a6a4a']) };
    case 'car': return { c: pick(['#e8302a', '#3a7aff', '#2ab06a', '#ffffff', '#9a5aff', '#ff8a1a']) };
    case 'bike': return { c: pick(['#e8302a', '#3a7aff', '#2ab06a', '#ff6ab0']) };
    case 'stall': return { c: pick(['#e8302a', '#2a7aff', '#2ab06a', '#ff8a1a', '#9a5aff']), goods: [pick(['#e8302a', '#ff8a1a', '#5ab83a', '#8a2a6a']), pick(['#e8302a', 'lemon', 'banana', '#ff8a1a']), pick(['#5ab83a', '#ff6a3a', '#8a2a6a'])] };
    case 'crate': return { g: pick(['#e8302a', '#ff8a1a', '#5ab83a', '#8a2a6a', 'lemon']) };
    case 'umbrella': return { c: pick(['#e8302a', '#3a7aff', '#2ab06a', '#ff6ab0', '#9a5aff']), c2: '#ffffff' };
    case 'towel': return { c: pick(['#e8302a', '#3a7aff', '#2ab06a', '#ff6ab0', '#9a5aff', '#2ac8d8']), c2: '#ffffff' };
    case 'bucket': return { c: pick(['#e8302a', '#3a7aff', '#2ab06a', '#ff6ab0']) };
    case 'boat': return { c: pick(['#e8302a', '#3a7aff', '#ffffff']), sail: pick(['#ffffff', '#ff6a5a', '#5ac8ff']) };
    case 'surf': return { c: pick(['#ff6a5a', '#3ac8ff', '#5ae88a', '#ff8ad8']) };
    case 'snowman': return { scarf: pick(['#e8302a', '#3a7aff', '#2ab06a']) };
    case 'sled': return { c: pick(['#e8302a', '#c8904a', '#3a7aff']) };
    case 'tent': return { c: pick(['#e8302a', '#3a7aff', '#2ab06a']) };
    case 'rock': return { c: th.ice ? '#b8c4d4' : '#9a9aa8' };
    default: return {}; } };
  const add = (t, x, y, s = 1) => { const v = mkV(t); const o = { t, x, y, s: t === 'child' ? s * .72 : s, f: r() < .5, v, seed: Math.floor(r() * 1e6) }; lv.objs.push(o); return o; };
  for (let gy = 0; gy < H + sp; gy += sp) for (let gx = 0; gx < W; gx += sp) { const x = gx + R(-sp * .45, sp * .45), y = gy + R(-sp * .45, sp * .45); if (x < 10 || x > W - 10 || y < 30 || y > H - 4) continue;
    if (onW(x, y)) { if (th.wat.length && r() < .4) { const o = add(wpick(th.wat), x, y, R(.9, 1.1)); o.wet = !th.ice && (o.t === 'person' || o.t === 'child'); } continue; }
    let t = wpick(th.w); if (BIG.has(t)) { if (onP(x, y) || inField(x, y)) { t = pick(['person', 'flowers', 'bush']); if (th.id === 'market' || th.id === 'beach') t = 'person'; }
      else { const b = BB[t]; const box = [x + b[0] - 6, y + b[1], x + b[2] + 6, y + 6]; if (bigs.some(q => q[0] < box[2] && q[2] > box[0] && q[1] < box[3] && q[3] > box[1])) t = th.id === 'snow' ? 'person' : 'flowers'; else bigs.push(box); } }
    if (inField(x, y) && !['person', 'child', 'hen', 'cow', 'sheep'].includes(t)) continue; add(t, x, y, R(.9, 1.1)); }
  // extra crowd on paths
  for (let i = 0; i < W * H / 26000 * (1 + d); i++) { const x = R(20, W - 20), y = R(40, H - 10); if (!onW(x, y) && onP(x, y)) add(r() < .7 ? 'person' : r() < .5 ? 'child' : 'dog', x, y, R(.9, 1.05)); }
  // decoys
  const nDec = Math.round(nCh * (1 + d * 4)); for (let i = 0; i < nDec; i++) { const x = R(30, W - 30), y = R(60, H - 10); const wet = onW(x, y); const t = wet ? (th.wat.some(q => q[0] === 'rduck') ? 'rduck' : null) : pick(th.dec); if (!t) continue; const o = add(t, x, y, R(.9, 1.1)); if (t === 'crate') o.v.g = 'lemon'; if (t === 'stall') o.v.goods = ['lemon', 'banana', 'lemon']; if (t === 'flowers') o.v.cols = ['#ffd23a', '#ffe03a']; }
  for (const o of lv.objs) if ((o.t === 'person' || o.t === 'child') && r() < decP) { const k2 = Math.floor(r() * 4); if (k2 === 0) o.v.top = '#ffd23a'; else if (k2 === 1) { o.v.hat = o.v.hat || 'beanie'; o.v.hatc = '#ffd23a'; } else if (k2 === 2) { o.v.hold = 'balloon'; o.v.holdc = '#ffd23a'; } else o.v.scarf = '#ffd23a'; }
  // chicks
  const modes = [['open', 1 - d * .75], ['behind', .15 + d * .55], ['on', .15 + d * .15], ['among', .05 + d * .35], ['nest', .12]]; const minD = Math.max(130, Math.sqrt(W * H / nCh) * .45);
  for (let i = 0; i < nCh; i++) { let ok = null; for (let tr = 0; tr < 80 && !ok; tr++) { const m = wpick(modes); const c = { r: cR * R(.88, 1.1), f: r() < .5, c: pick(['#ffd83a', '#ffe04a', '#ffd02a', '#ffe468']), lift: 0, nest: m === 'nest' };
      if (m === 'open' || m === 'nest') { c.x = R(40, W - 40); c.y = R(80, H - 20); }
      else if (m === 'behind') { const cand = lv.objs.filter(o => TALL.includes(o.t)); if (!cand.length) continue; const o = pick(cand), b = BB[o.t], side = r() < .5 ? -1 : 1, half = (side < 0 ? -b[0] : b[2]) * o.s; c.x = o.x + side * half * R(.35, .85); c.y = o.y - R(2, 6); }
      else if (m === 'on') { const cand = lv.objs.filter(o => TOP[o.t]); if (!cand.length) continue; const o = pick(cand), b = BB[o.t]; c.x = o.x + R(b[0] * .5, b[2] * .5) * o.s; c.y = o.y + .5; c.lift = TOP[o.t] * o.s; }
      else { const cand = lv.objs.filter(o => th.dec.includes(o.t) || (o.v && (o.v.top === '#ffd23a' || o.v.holdc === '#ffd23a'))); if (!cand.length) continue; const o = pick(cand); c.x = o.x + R(-34, 34); c.y = o.y + R(-14, 14); }
      if (c.x < 30 || c.x > W - 30 || c.y < 60 || c.y > H - 6) continue; if (!c.lift && onW(c.x, c.y)) continue; if (lv.chicks.some(q => Math.hypot(q.x - c.x, q.y - c.y) < minD)) continue; ok = c; }
    if (ok) { ok.t = 'chick'; lv.chicks.push(ok); lv.objs.push(ok); } }
  lv.objs.sort((a, b) => (a.t === 'towel' ? a.y - 1e4 : a.y) - (b.t === 'towel' ? b.y - 1e4 : b.y)); lv.objs.forEach((o, i) => o.ord = i);
  // spatial buckets
  lv.B = new Map(); const BK = 128; for (const o of lv.objs) { const b = o.t === 'chick' ? [-o.r * 1.6, -o.r * 2.8 - o.lift, o.r * 1.6, o.r * .6] : BB[o.t].map(v => v * o.s); o.bb = [o.x + b[0] - 3, o.y + b[1] - 3, o.x + b[2] + 3, o.y + b[3] + 3]; for (let bx = Math.floor(o.bb[0] / BK); bx <= Math.floor(o.bb[2] / BK); bx++) for (let by = Math.floor(o.bb[1] / BK); by <= Math.floor(o.bb[3] / BK); by++) { const key = bx + ',' + by; (lv.B.get(key) || lv.B.set(key, []).get(key)).push(o); } }
  return lv; }

/* ================= RENDER WORLD ================= */
function drawGround(x, rx, ry, rw, rh) { const lv = LV, th = lv.th; x.fillStyle = th.g; x.fillRect(rx, ry, rw, rh);
  const C = 64; for (let cx = Math.floor(rx / C); cx <= Math.floor((rx + rw) / C); cx++) for (let cy = Math.floor(ry / C); cy <= Math.floor((ry + rh) / C); cy++) { const r = rng((cx * 73856093) ^ (cy * 19349663) ^ lv.L); x.fillStyle = th.g2; x.beginPath(); x.ellipse(cx * C + r() * C, cy * C + r() * C, 14 + r() * 20, 8 + r() * 10, 0, 0, TAU); x.fill();
    x.strokeStyle = th.tuft; x.lineWidth = 1.3; x.lineCap = 'round'; for (let k = 0; k < 5; k++) { const px = cx * C + r() * C, py = cy * C + r() * C; if (th.tiles || th.sea) { x.fillStyle = th.tuft; x.beginPath(); x.arc(px, py, 1 + r() * 1.2, 0, TAU); x.fill(); } else { x.beginPath(); x.moveTo(px - 3, py - 4); x.lineTo(px, py); x.lineTo(px + 3, py - 5); x.moveTo(px, py); x.lineTo(px, py - 6); x.stroke(); } } }
  if (th.tiles) { x.strokeStyle = 'rgba(120,100,80,.25)'; x.lineWidth = 1.2; x.beginPath(); for (let gx = Math.floor(rx / 40) * 40; gx < rx + rw; gx += 40) { x.moveTo(gx, ry); x.lineTo(gx, ry + rh); } for (let gy = Math.floor(ry / 40) * 40; gy < ry + rh; gy += 40) { x.moveTo(rx, gy); x.lineTo(rx + rw, gy); } x.stroke(); }
  for (const [fx, fy, fw, fh] of lv.fields) { x.fillStyle = '#a8784a'; x.fillRect(fx, fy, fw, fh); x.strokeStyle = '#5aa83a'; x.lineWidth = 6; x.setLineDash([8, 6]); x.beginPath(); for (let yy = fy + 10; yy < fy + fh; yy += 18) { x.moveTo(fx + 6, yy); x.lineTo(fx + fw - 6, yy); } x.stroke(); x.setLineDash([]); x.strokeStyle = '#7a5a32'; x.lineWidth = 2; x.strokeRect(fx, fy, fw, fh); }
  for (const p of lv.paths) { x.strokeStyle = th.tiles ? '#8a8a92' : 'rgba(0,0,0,.08)'; x.lineWidth = th.tiles ? 70 : 58; x.lineCap = 'round'; x.stroke(p); x.strokeStyle = th.path; x.lineWidth = th.tiles ? 62 : 50; x.stroke(p); if (th.tiles) { x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 2; x.setLineDash([16, 14]); x.stroke(p); x.setLineDash([]); } }
  for (const p of lv.ponds) { x.fillStyle = th.ice ? '#a8d0ea' : '#3a8ac8'; x.lineWidth = 10; x.strokeStyle = th.ice ? '#ffffff' : '#c8a878'; x.stroke(p); x.fill(p); x.save(); x.clip(p); x.fillStyle = th.water; x.translate(0, -5); x.fill(p); x.restore(); x.save(); x.clip(p); x.strokeStyle = th.ice ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.45)'; x.lineWidth = 1.5; const r = rng(4); for (let k = 0; k < 40; k++) { const px = r() * lv.W, py = r() * lv.H; x.beginPath(); if (th.ice) { x.moveTo(px - 12, py); x.lineTo(px + 12, py - 4); } else x.arc(px, py, 6 + r() * 6, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); } x.restore(); }
  if (lv.seaY) { const sy = lv.seaY; x.beginPath(); x.moveTo(rx - 5, ry - 5); for (let xx = rx - 5; xx <= rx + rw + 10; xx += 10) x.lineTo(xx, sy(xx) + 14); x.lineTo(rx + rw + 10, ry - 5); x.closePath(); x.fillStyle = '#e4c880'; x.fill();
    x.beginPath(); x.moveTo(rx - 5, ry - 5); for (let xx = rx - 5; xx <= rx + rw + 10; xx += 10) x.lineTo(xx, sy(xx)); x.lineTo(rx + rw + 10, ry - 5); x.closePath(); x.fillStyle = '#3aaee8'; x.fill(); x.strokeStyle = '#ffffff'; x.lineWidth = 4; x.beginPath(); for (let xx = rx - 5; xx <= rx + rw + 10; xx += 10) xx === rx - 5 ? x.moveTo(xx, sy(xx)) : x.lineTo(xx, sy(xx)); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 2; for (let yy = Math.floor(ry / 34) * 34; yy < Math.min(ry + rh, lv.H * .25); yy += 34) for (let xx = Math.floor(rx / 60) * 60 + (yy / 34 % 2) * 30; xx < rx + rw; xx += 60) { if (yy > sy(xx) - 10) continue; x.beginPath(); x.arc(xx, yy, 8, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); } } }
function drawObj(x, o) { x.save(); x.translate(o.x, o.y); if (o.t === 'chick') { chick(x, o.r, o); x.restore(); return; } x.scale(o.f ? -o.s : o.s, o.s); if (o.wet) { x.save(); x.beginPath(); x.rect(-40, -120, 80, 104); x.clip(); DRAW[o.t](x, o); x.restore(); x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 2; x.beginPath(); x.ellipse(0, -16, 16, 4, 0, 0, TAU); x.stroke(); } else DRAW[o.t](x, o); x.restore(); }
function objsIn(rx, ry, rw, rh) { const BK = 128, set = new Set(); for (let bx = Math.floor(rx / BK); bx <= Math.floor((rx + rw) / BK); bx++) for (let by = Math.floor(ry / BK); by <= Math.floor((ry + rh) / BK); by++) { const L = LV.B.get(bx + ',' + by); if (L) for (const o of L) if (o.bb[0] < rx + rw && o.bb[2] > rx && o.bb[1] < ry + rh && o.bb[3] > ry) set.add(o); } return [...set].sort((a, b) => a.ord - b.ord); }
function renderRect(x, rx, ry, rw, rh) { drawGround(x, rx, ry, rw, rh); for (const o of objsIn(rx, ry, rw, rh)) drawObj(x, o); }
/* tiles */
const TP = 384; const cache = new Map(); let ov = null, ovS = 1;
function tileKey(k, tx, ty) { return k + ':' + tx + ':' + ty; }
function renderTile(k, tx, ty) { const ls = Math.pow(2, k), ts = TP / ls; const c = cnv(TP, TP), x = c.getContext('2d'); x.setTransform(ls, 0, 0, ls, -tx * ts * ls, -ty * ts * ls); renderRect(x, tx * ts, ty * ts, ts, ts); cache.set(tileKey(k, tx, ty), c); if (cache.size > 90) cache.delete(cache.keys().next().value); return c; }
function buildOverview() { ovS = Math.min(1, 1700 / LV.W); ov = cnv(Math.ceil(LV.W * ovS), Math.ceil(LV.H * ovS)); const x = ov.getContext('2d'); x.scale(ovS, ovS); renderRect(x, 0, 0, LV.W, LV.H); }

/* ================= VIEW ================= */
const cv = $('cv'), cx = cv.getContext('2d'); let VW = 0, VH = 0, dpr = 1, dirty = true;
const cam = { x: 0, y: 0, s: 1 }, tgt = { x: 0, y: 0, s: 1, on: false }; let minS = .2, maxS = 6, topH = 64;
function layout() { dpr = Math.min(devicePixelRatio || 1, 2.5); VW = innerWidth; VH = innerHeight; cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr); cv.style.width = VW + 'px'; cv.style.height = VH + 'px'; if (LV) { minS = Math.min(VW / LV.W, (VH - topH) / LV.H); maxS = Math.max(minS * 2, 5.2); clampCam(cam); } dirty = true; }
function clampCam(c) { c.s = clamp(c.s, minS, maxS); const hw = VW / 2 / c.s, hh = (VH - topH) / 2 / c.s; c.x = LV.W <= hw * 2 ? LV.W / 2 : clamp(c.x, hw, LV.W - hw); c.y = LV.H <= hh * 2 ? LV.H / 2 : clamp(c.y, hh, LV.H - hh); }
const w2s = (wx, wy) => [(wx - cam.x) * cam.s + VW / 2, (wy - cam.y) * cam.s + topH + (VH - topH) / 2];
const s2w = (sx, sy) => [(sx - VW / 2) / cam.s + cam.x, (sy - topH - (VH - topH) / 2) / cam.s + cam.y];
let queue = [];
function render(now) { cx.setTransform(1, 0, 0, 1, 0, 0); if (!LV) return false; cx.fillStyle = LV.th.g2; cx.fillRect(0, 0, cv.width, cv.height); const s = cam.s * dpr; const ox = (VW / 2 - cam.x * cam.s) * dpr, oy = (topH + (VH - topH) / 2 - cam.y * cam.s) * dpr;
  cx.imageSmoothingEnabled = true; cx.setTransform(s / ovS, 0, 0, s / ovS, ox, oy); cx.drawImage(ov, 0, 0); let pending = false;
  if (s > ovS * 1.15) { const k = clamp(Math.ceil(Math.log2(s)), -3, 3), ls = Math.pow(2, k), ts = TP / ls; const [x0, y0] = s2w(0, topH), [x1, y1] = s2w(VW, VH); const tx0 = Math.max(0, Math.floor(x0 / ts)), ty0 = Math.max(0, Math.floor(y0 / ts)), tx1 = Math.min(Math.floor(LV.W / ts), Math.floor(x1 / ts)), ty1 = Math.min(Math.floor(LV.H / ts), Math.floor(y1 / ts));
    const t0 = performance.now(); const need = []; for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { const key = tileKey(k, tx, ty); let c = cache.get(key); if (c) { cache.delete(key); cache.set(key, c); } else need.push([tx, ty]); if (c) { cx.setTransform(s / ls, 0, 0, s / ls, ox + tx * ts * s, oy + ty * ts * s); cx.drawImage(c, 0, 0); } }
    const mx = (tx0 + tx1) / 2, my = (ty0 + ty1) / 2; need.sort((a, b) => Math.hypot(a[0] - mx, a[1] - my) - Math.hypot(b[0] - mx, b[1] - my));
    for (const [tx, ty] of need) { if (performance.now() - t0 > 14) { pending = true; break; } const c = renderTile(k, tx, ty); cx.setTransform(s / ls, 0, 0, s / ls, ox + tx * ts * s, oy + ty * ts * s); cx.drawImage(c, 0, 0); } }
  // overlays (world space)
  cx.setTransform(s, 0, 0, s, ox, oy);
  for (const c of LV.chicks) if (c.found) { const ft = (now - c.ft) / 1000; const cy2 = c.y - c.lift - c.r * 1.3; if (ft < 1.6) { const hop = Math.abs(Math.sin(ft * 9)) * c.r * 1.6 * (1 - ft / 1.6); cx.save(); cx.translate(c.x, c.y - hop); const sq = 1 + Math.sin(ft * 18) * .08; cx.scale(1.25 / sq, 1.25 * sq); chick(cx, c.r, { ...c, lift: c.lift / 1.25 }); cx.restore(); pending = true;
      cx.save(); cx.globalAlpha = Math.min(1, (1.6 - ft) * 2); cx.font = `900 ${Math.max(14 / cam.s, c.r * 1.1)}px Arial`; cx.textAlign = 'center'; cx.lineWidth = Math.max(4 / cam.s, c.r * .25); cx.strokeStyle = '#fff'; cx.fillStyle = '#ff6a1a'; const ty2 = cy2 - c.r * 2.4 - ft * c.r; cx.strokeText(T('ציוץ!', 'PEEP!'), c.x, ty2); cx.fillText(T('ציוץ!', 'PEEP!'), c.x, ty2); cx.restore(); }
    cx.lineWidth = Math.max(3 / cam.s, c.r * .18); cx.strokeStyle = '#ff3a6a'; cx.beginPath(); cx.arc(c.x, cy2, c.r * 2.1 + Math.max(0, .5 - ft) * c.r * 3, 0, TAU); cx.stroke(); cx.strokeStyle = 'rgba(255,255,255,.8)'; cx.lineWidth *= .4; cx.stroke(); }
  if (hint) { const ht = (now - hint.t) / 1000; if (ht > 5 || hint.c.found) hint = null; else { const R = hint.R * (1 + Math.sin(ht * 6) * .05); cx.lineWidth = 6 / cam.s; cx.strokeStyle = `rgba(255,210,58,${.9 - ht * .12})`; cx.setLineDash([16 / cam.s, 10 / cam.s]); cx.beginPath(); cx.arc(hint.x, hint.y, R, 0, TAU); cx.stroke(); cx.setLineDash([]); pending = true; } }
  if (miss) { const mt = (now - miss.t) / 1000; if (mt > .5) miss = null; else { cx.strokeStyle = `rgba(255,255,255,${1 - mt * 2})`; cx.lineWidth = 3 / cam.s; cx.beginPath(); cx.arc(miss.x, miss.y, (10 + mt * 40) / cam.s, 0, TAU); cx.stroke(); pending = true; } }
  return pending; }

/* ================= INPUT ================= */
const ptr = new Map(); let gest = null, vel = [0, 0], lastMove = 0, hint = null, miss = null, lastTap = 0;
cv.addEventListener('pointerdown', e => { if (state !== 'play') return; A.ac(); cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() }); tgt.on = false; vel = [0, 0];
  if (ptr.size === 2) { const [a, b] = [...ptr.values()]; gest = { d: Math.hypot(a.x - b.x, a.y - b.y), s: cam.s, w: s2w((a.x + b.x) / 2, (a.y + b.y) / 2) }; } else gest = null; });
cv.addEventListener('pointermove', e => { const p = ptr.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptr.size >= 2 && gest) { const [a, b] = [...ptr.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); cam.s = clamp(gest.s * d / gest.d, minS, maxS); const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; cam.x = gest.w[0] - (mx - VW / 2) / cam.s; cam.y = gest.w[1] - (my - topH - (VH - topH) / 2) / cam.s; clampCam(cam); p.moved = true; dirty = true; return; }
  if (ptr.size === 1) { if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) > 8) p.moved = true; if (p.moved) { cam.x -= dx / cam.s; cam.y -= dy / cam.s; clampCam(cam); const now = performance.now(), dtm = Math.max(1, now - lastMove); vel = [lerp(vel[0], -dx / cam.s / dtm * 16, .5), lerp(vel[1], -dy / cam.s / dtm * 16, .5)]; lastMove = now; dirty = true; } } });
const up = e => { const p = ptr.get(e.pointerId); if (!p) return; ptr.delete(e.pointerId); if (ptr.size < 2) gest = null; if (ptr.size === 1) { const q = [...ptr.values()][0]; q.x0 = q.x; q.y0 = q.y; q.moved = true; }
  if (!p.moved && performance.now() - p.t0 < 450 && ptr.size === 0) { const now = performance.now(); if (now - lastTap < 300 && !tapHit(p.x, p.y, true)) { zoomAt(p.x, p.y, 2.2); lastTap = 0; } else { tapHit(p.x, p.y); lastTap = now; } }
  if (performance.now() - lastMove > 80) vel = [0, 0]; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', e => { if (state !== 'play') return; e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.18 : 1 / 1.18, true); }, { passive: false });
function zoomAt(sx, sy, f, instant) { const w = s2w(sx, sy); const ns = clamp(cam.s * f, minS, maxS); const nx = w[0] - (sx - VW / 2) / ns, ny = w[1] - (sy - topH - (VH - topH) / 2) / ns; if (instant) { cam.s = ns; cam.x = nx; cam.y = ny; clampCam(cam); } else { Object.assign(tgt, { x: nx, y: ny, s: ns, on: true }); clampCam(tgt); } dirty = true; }
function tapHit(sx, sy, probe) { const [wx, wy] = s2w(sx, sy); let best = null, bd = 1e9; for (const c of LV.chicks) { if (c.found) continue; const ccx = c.x + (c.f ? -.1 : .1) * c.r, ccy = c.y - c.lift - c.r * 1.25; const d = Math.hypot(wx - ccx, wy - ccy); if (d < c.r * 1.7 + 16 / cam.s && d < bd) { bd = d; best = c; } }
  if (probe) return !!best; if (best) found(best); else { miss = { x: wx, y: wy, t: performance.now() }; A.tone(240, .06, 'sine', .04); } dirty = true; return !!best; }
function found(c) { c.found = true; c.ft = performance.now(); LV.found++; peep(); setTimeout(peep, 260); buzz(30); updHud(); const [sx, sy] = w2s(c.x, c.y - c.lift - c.r); sparkle(sx, sy); if (LV.found >= LV.chicks.length) setTimeout(win, 1300); else if (LV.found === LV.chicks.length - 1) toast(T('נשאר עוד אפרוח אחד! 🐤', 'Just one chick left! 🐤'), 1600); }
function peep() { const f = 2500 + Math.random() * 600; A.tone(f, .07, 'sine', .12, 0, f * 1.35); A.tone(f * 1.06, .08, 'sine', .11, .1, f * 1.45); A.tone(f * .98, .05, 'triangle', .04, .2, f * 1.3); }
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };

/* ================= FX (DOM) ================= */
const fx = $('fx'), fxx = fx.getContext('2d'); const parts = [];
function sparkle(x, y) { for (let i = 0; i < 18; i++) { const a = Math.random() * TAU, v = 2 + Math.random() * 4; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: .9, c: ['#ffd23a', '#fff', '#ff8ac8', '#7ad8ff'][i % 4], s: 5 + Math.random() * 5 }); } }
function confetti() { for (let i = 0; i < 160; i++) parts.push({ x: VW / 2, y: VH * .4, vx: (Math.random() - .5) * 16, vy: -Math.random() * 14 - 3, life: 2.4, c: ['#ffd23a', '#ff5a8a', '#5ac8ff', '#5aff9a', '#b87aff'][i % 5], s: 6 + Math.random() * 5, g: 1 }); }
function drawFx(dt) { if (fx.width !== Math.round(VW * dpr)) { fx.width = Math.round(VW * dpr); fx.height = Math.round(VH * dpr); fx.style.width = VW + 'px'; fx.style.height = VH + 'px'; } fxx.setTransform(1, 0, 0, 1, 0, 0); fxx.clearRect(0, 0, fx.width, fx.height); fxx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.vy += p.g ? .35 : .12; p.x += p.vx; p.y += p.vy; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } fxx.globalAlpha = Math.min(1, p.life * 2); fxx.fillStyle = p.c; fxx.beginPath(); if (p.g) fxx.rect(p.x, p.y, p.s, p.s * .5); else { for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, q = k % 2 ? p.s * .3 : p.s; fxx.lineTo(p.x + Math.cos(a) * q, p.y + Math.sin(a) * q); } } fxx.fill(); } fxx.globalAlpha = 1; }

/* ================= FLOW ================= */
let state = 'title', L = 0, t0 = 0, hintsLeft = 3, hintsUsed = 0, elapsed = 0;
function updHud() { if (!LV) return; $('fTxt').textContent = LV.found + '/' + LV.chicks.length; $('strip').innerHTML = LV.chicks.map(c => `<i class="${c.found ? 'on' : ''}">🐤</i>`).join(''); $('hintN').textContent = hintsLeft; $('hintBtn').disabled = !hintsLeft; $('lvTxt').textContent = THEMES[Math.floor(L / 5)].ic + ' ' + (L % 5 + 1); }
function startLevel(i) { L = i; $('loading').hidden = false; setTimeout(() => { LV = gen(i, innerHeight > innerWidth * 1.1); cache.clear(); buildOverview(); state = 'play'; hintsLeft = 3; hintsUsed = 0; elapsed = 0; hint = null; $('title').hidden = true; $('endSheet').hidden = true; $('hud').hidden = false; $('zoomC').hidden = false; $('strip').hidden = false; layout(); cam.s = minS; cam.x = LV.W / 2; cam.y = LV.H / 2; tgt.on = false; updHud(); $('loading').hidden = true; dirty = true; ambience();
  toast(T(`מצאו ${LV.chicks.length} אפרוחים מתחבאים! 🐤`, `Find ${LV.chicks.length} hiding chicks! 🐤`), 2200); if (!S.tut) { S.tut = 1; S.save(); setTimeout(() => toast(T('צבטו בשתי אצבעות כדי להגדיל, גררו כדי לזוז, ולחצו על כל אפרוח שמצאתם 🔍', 'Pinch to zoom, drag to look around, and tap every chick you find 🔍'), 5200), 2400); } }, 30); }
function win() { state = 'done'; const stars = hintsUsed === 0 ? 3 : hintsUsed === 1 ? 2 : 1; if ((S.stars[L] || 0) < stars) S.stars[L] = stars; if (!S.best[L] || elapsed < S.best[L]) S.best[L] = elapsed; S.save(); confetti(); [0, 4, 7, 12].forEach((k, i) => A.tone(523 * Math.pow(2, k / 12), .25, 'triangle', .08, i * .1)); setTimeout(() => { for (let i = 0; i < 4; i++) setTimeout(peep, i * 140); }, 400);
  $('eT').textContent = T('מצאתם את כולם! 🐤🎉', 'You found them all! 🐤🎉'); [...$('eStars').children].forEach((e, k) => { e.classList.toggle('on', k < stars); e.style.animationDelay = k * .25 + 's'; }); $('eP').textContent = T(`זמן: ${fmt(elapsed)} · רמזים: ${hintsUsed}`, `Time: ${fmt(elapsed)} · Hints: ${hintsUsed}`) + (hintsUsed ? T(' · בלי רמזים = 3 כוכבים', ' · No hints = 3 stars') : ''); $('eNext').hidden = L >= NL - 1; setTimeout(() => $('endSheet').hidden = false, 900); }
const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function useHint() { if (!hintsLeft || state !== 'play') return; const left = LV.chicks.filter(c => !c.found); if (!left.length) return; const c = left[Math.floor(Math.random() * left.length)]; hintsLeft--; hintsUsed++; const R = Math.max(90, 150 - LV.d * 40); const a = Math.random() * TAU, off = R * .45 * Math.random(); hint = { c, x: c.x + Math.cos(a) * off, y: c.y - c.lift - c.r + Math.sin(a) * off, R, t: performance.now() };
  const s = Math.min(maxS, Math.min(VW, VH - topH) / (R * 2.6)); Object.assign(tgt, { x: hint.x, y: hint.y, s: Math.max(cam.s * .9, s), on: true }); clampCam(tgt); A.tone(880, .1, 'sine', .06); A.tone(1320, .14, 'sine', .05, .1); updHud(); dirty = true; }
function ambience() { A.allOff(); const id = LV.th.id; if (id === 'beach') A.loopOn('amb', 'lowpass', 500, .8, .05, .12); else if (id === 'snow') A.loopOn('amb', 'bandpass', 900, .6, .025, .2); else if (id === 'market') A.loopOn('amb', 'bandpass', 700, 1.2, .02, .5); A.startMusic({ chords: [[60, 64, 67], [65, 69, 72], [62, 65, 69], [67, 71, 74]], bpm: 96, lead: true, vol: .45 }); }
let birdT = 2;
function showTitle() { state = 'title'; A.stopMusic(); A.allOff(); $('title').hidden = false; ['hud', 'zoomC', 'strip', 'endSheet', 'pauseSheet'].forEach(k => $(k).hidden = true);
  let h = ''; THEMES.forEach((th, ti) => { h += `<div class="thm"><h3>${th.ic} ${th.n}</h3><div class="lgrid" style="grid-template-columns:repeat(5,1fr)">`; for (let k = 0; k < 5; k++) { const i = ti * 5 + k, un = i === 0 || (S.stars[i - 1] || 0) > 0, st = S.stars[i] || 0; h += `<button class="lb ${un ? '' : 'lock'}" data-i="${i}" ${un ? '' : 'disabled'}>${un ? i + 1 : '🔒'}<small>${un ? starsHTML(st) : ''}</small></button>`; } h += '</div></div>'; }); $('lv').innerHTML = h; }
$('lv').onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; A.ac(); A.tone(880, .06, 'triangle', .05); startLevel(+b.dataset.i); };
$('backBtn').onclick = () => { if (state === 'play') { state = 'pause'; $('pauseSheet').hidden = false; } }; $('pGo').onclick = () => { $('pauseSheet').hidden = true; state = 'play'; }; $('pMap').onclick = () => showTitle();
$('hintBtn').onclick = () => { A.ac(); useHint(); }; $('zIn').onclick = () => { A.ac(); zoomAt(VW / 2, topH + (VH - topH) / 2, 1.8); }; $('zOut').onclick = () => { A.ac(); zoomAt(VW / 2, topH + (VH - topH) / 2, 1 / 1.8); }; $('zFit').onclick = () => { A.ac(); Object.assign(tgt, { x: LV.W / 2, y: LV.H / 2, s: minS, on: true }); dirty = true; };
$('eMap').onclick = () => showTitle(); $('eAgain').onclick = () => startLevel(L); $('eNext').onclick = () => startLevel(L + 1);
$('backBtn').innerHTML = ICO.pause('#5a3a0a'); $('homeT').innerHTML = ICO.home('#5a3a0a'); soundButton('sndBtn', S, A, '#5a3a0a'); hubButtons(['homeT'], A);
$('tSub').textContent = T('בכל תמונה ענקית מתחבאים אפרוחים קטנים. הגדילו, חפשו היטב ולחצו על כל אפרוח! 🔍🐤', 'Tiny chicks are hiding in every giant picture. Zoom in, look closely and tap every chick! 🔍🐤');
$('pT').textContent = T('הפסקה', 'Paused'); $('pMap').textContent = T('רמות', 'Levels'); $('pGo').textContent = T('המשך ▶', 'Resume ▶'); $('eMap').textContent = T('רמות', 'Levels'); $('eAgain').textContent = T('שוב', 'Again'); $('eNext').textContent = T('הרמה הבאה ▶', 'Next level ▶');
addEventListener('resize', layout);

/* ================= LOOP ================= */
let last = performance.now();
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; A.tick();
  if (state === 'play') { elapsed += dt; $('tTxt').textContent = fmt(elapsed); birdT -= dt; if (birdT < 0 && (LV.th.id === 'farm' || LV.th.id === 'park')) { birdT = 2 + Math.random() * 5; const f = 3000 + Math.random() * 1500; for (let i = 0; i < 3; i++) A.tone(f + i * 200, .05, 'sine', .015, i * .08, f * 1.2); } }
  if (LV && state !== 'title') { if (tgt.on) { const k = Math.min(1, dt * 7); cam.x = lerp(cam.x, tgt.x, k); cam.y = lerp(cam.y, tgt.y, k); cam.s = lerp(cam.s, tgt.s, k); clampCam(cam); if (Math.abs(cam.s - tgt.s) < tgt.s * .002 && Math.hypot(cam.x - tgt.x, cam.y - tgt.y) < .5) tgt.on = false; dirty = true; }
    if (!ptr.size && (Math.abs(vel[0]) + Math.abs(vel[1]) > .05)) { cam.x += vel[0]; cam.y += vel[1]; vel[0] *= .9; vel[1] *= .9; clampCam(cam); dirty = true; }
    if (dirty) { dirty = render(now); } }
  drawFx(dt); }
setTimeout(() => { layout(); showTitle(); $('loading').hidden = true; requestAnimationFrame(frame); window.__peepOK = true; }, 20);
window.__pp = { startLevel, get LV() { return LV; }, get state() { return state; }, find(i) { found(LV.chicks[i]); }, look(i, s = 3) { const c = LV.chicks[i]; cam.x = c.x; cam.y = c.y - c.r; cam.s = s; clampCam(cam); dirty = true; }, set(s, x, y) { cam.s = s; cam.x = x; cam.y = y; clampCam(cam); dirty = true; }, w2s: (x, y) => w2s(x, y), hint: useHint,
  art() { const c = cnv(720, 491), x = c.getContext('2d'); const ch = LV.chicks[0]; const sc = 2.2; x.setTransform(sc, 0, 0, sc, 360 - ch.x * sc, 260 - (ch.y - ch.r) * sc); renderRect(x, ch.x - 170, ch.y - 130, 340, 240); x.setTransform(sc, 0, 0, sc, 360 - ch.x * sc, 260 - (ch.y - ch.r) * sc); x.lineWidth = 3; x.strokeStyle = '#ff3a6a'; x.beginPath(); x.arc(ch.x, ch.y - ch.lift - ch.r * 1.3, ch.r * 2.1, 0, TAU); x.stroke(); return c.toDataURL('image/jpeg', .88); } };
