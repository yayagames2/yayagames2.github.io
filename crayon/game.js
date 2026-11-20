import { $, clamp, lerp, rng, T, EN, store, audio, toast, ICO, hubButtons, soundButton } from '../lib/kit.js';

const S = store('crayon-save', { th: {}, tut: 0, tool: 'crayon', col: 0, size: 1 });
const A = audio(S);
const W = 1024, U = W / 1000, PI = Math.PI;

/* ================= PAGE ART (original line art, 1000-unit space) ================= */
const P = () => new Path2D();
const E = (cx, cy, rx, ry, r = 0) => { const p = P(); p.ellipse(cx, cy, rx, ry, r, 0, PI * 2); return p; };
const Ci = (cx, cy, r) => E(cx, cy, r, r);
const RR = (x, y, w, h, r) => { const p = P(); p.roundRect(x, y, w, h, r); return p; };
const PL = pts => { const p = P(); pts.forEach(([a, b], i) => i ? p.lineTo(a, b) : p.moveTo(a, b)); p.closePath(); return p; };
const BL = pts => { const p = P(), n = pts.length; const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; let s = m(pts[n - 1], pts[0]); p.moveTo(s[0], s[1]); for (let i = 0; i < n; i++) { const c = pts[i], e = m(c, pts[(i + 1) % n]); p.quadraticCurveTo(c[0], c[1], e[0], e[1]); } p.closePath(); return p; };
const UN = (...ps) => { const p = P(); ps.forEach(q => p.addPath(q)); return p; };
const STAR = (cx, cy, R, r, n = 5) => { const pts = []; for (let i = 0; i < n * 2; i++) { const a = -PI / 2 + i * PI / n, q = i % 2 ? r : R; pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } return PL(pts); };
const HEART = (cx, cy, s) => { const p = P(); p.moveTo(cx, cy + s * .35); p.bezierCurveTo(cx - s * 1.1, cy - s * .35, cx - s * .45, cy - s * 1.05, cx, cy - s * .45); p.bezierCurveTo(cx + s * .45, cy - s * 1.05, cx + s * 1.1, cy - s * .35, cx, cy + s * .35); return p; };
const ring = (cx, cy, R, r, n) => UN(Ci(cx, cy, R), ...Array.from({ length: n }, (_, i) => Ci(cx + Math.cos(i / n * PI * 2) * R, cy + Math.sin(i / n * PI * 2) * R, r)));
const cloud = (x, y, s = 1) => UN(E(x, y, 80 * s, 38 * s), Ci(x - 35 * s, y - 20 * s, 38 * s), Ci(x + 20 * s, y - 32 * s, 46 * s));
const grass = y => RR(-30, y, 1060, 1100 - y, 0);
function eye(x, cx, cy, rx = 18, ry = 24) { x.fillStyle = '#1e1b2e'; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, PI * 2); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(cx - rx * .3, cy - ry * .35, rx * .38, 0, PI * 2); x.fill(); }
function smile(x, cx, cy, w, h = w * .55) { x.beginPath(); x.moveTo(cx - w, cy); x.quadraticCurveTo(cx, cy + h * 2, cx + w, cy); x.stroke(); }
const PAGES = [
  { id: 'lion', n: T('אריה', 'Lion'), parts: () => [grass(800), Ci(860, 140, 75), cloud(200, 160), E(770, 560, 120, 28, -.75), Ci(845, 470, 42), E(560, 620, 190, 130), RR(430, 650, 74, 150, 37), RR(610, 650, 74, 150, 37), ring(430, 390, 190, 72, 12), Ci(335, 255, 48), Ci(525, 255, 48), Ci(430, 395, 150), E(430, 455, 78, 56)],
    det(x) { eye(x, 380, 370); eye(x, 480, 370); x.fillStyle = '#1e1b2e'; x.beginPath(); x.moveTo(405, 425); x.quadraticCurveTo(430, 405, 455, 425); x.quadraticCurveTo(430, 455, 405, 425); x.fill(); smile(x, 430, 465, 34, 18); for (const [a, b] of [[385, 455], [372, 472], [475, 455], [488, 472]]) { x.beginPath(); x.arc(a, b, 5, 0, 7); x.fill(); } } },
  { id: 'cat', n: T('חתולה', 'Kitty'), parts: () => [grass(840), Ci(200, 790, 85), E(740, 690, 40, 150, .55), E(520, 660, 170, 185), E(520, 710, 92, 118), E(445, 840, 60, 36), E(595, 840, 60, 36), PL([[355, 300], [380, 140], [470, 240]]), PL([[645, 300], [620, 140], [530, 240]]), Ci(500, 380, 170), PL([[385, 255], [395, 190], [440, 240]]), PL([[615, 255], [605, 190], [560, 240]])],
    det(x) { eye(x, 440, 370, 22, 30); eye(x, 560, 370, 22, 30); x.fillStyle = '#ff6a9a'; x.beginPath(); x.moveTo(485, 420); x.lineTo(515, 420); x.lineTo(500, 438); x.closePath(); x.fill(); x.fillStyle = '#1e1b2e'; smile(x, 485, 445, 15, 10); smile(x, 515, 445, 15, 10); for (const s of [-1, 1]) for (const k of [-1, 0, 1]) { x.beginPath(); x.moveTo(500 + s * 60, 430 + k * 14); x.lineTo(500 + s * 140, 420 + k * 24); x.stroke(); }
      x.beginPath(); x.moveTo(140, 760); x.quadraticCurveTo(200, 720, 260, 770); x.moveTo(130, 810); x.quadraticCurveTo(200, 770, 275, 820); x.moveTo(170, 860); x.quadraticCurveTo(220, 820, 270, 840); x.stroke(); } },
  { id: 'puppy', n: T('כלבלב', 'Puppy'), parts: () => [grass(830), UN(RR(80, 705, 230, 50, 25), Ci(80, 700, 36), Ci(80, 760, 36), Ci(310, 700, 36), Ci(310, 760, 36)), E(500, 690, 165, 150), RR(400, 760, 80, 110, 40), RR(520, 760, 80, 110, 40), Ci(500, 390, 175), E(565, 355, 62, 58), E(500, 480, 92, 66), E(330, 420, 58, 135, .3), E(670, 420, 58, 135, -.3), RR(395, 552, 210, 42, 21), Ci(500, 610, 26)],
    det(x) { eye(x, 440, 360); eye(x, 565, 360); x.fillStyle = '#1e1b2e'; x.beginPath(); x.ellipse(500, 448, 32, 22, 0, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(490, 442, 7, 0, 7); x.fill(); x.fillStyle = '#1e1b2e'; smile(x, 500, 490, 34, 18); x.fillStyle = '#ff6a8a'; x.beginPath(); x.ellipse(500, 512, 18, 22, 0, 0, PI); x.fill(); x.stroke(); } },
  { id: 'fish', n: T('דגיגים', 'Fishy'), parts: () => [RR(-30, 850, 1060, 300, 0), BL([[90, 860], [60, 700], [110, 560], [80, 430], [130, 560], [150, 700], [130, 860]]), BL([[860, 860], [840, 720], [900, 620], [880, 520], [930, 620], [920, 740], [900, 860]]), PL([[700, 480], [890, 330], [860, 480], [890, 630]]), PL([[380, 330], [470, 220], [580, 335]]), PL([[420, 625], [490, 720], [560, 625]]), E(470, 480, 250, 165), E(380, 480, 38, 150), E(540, 480, 38, 158), Ci(290, 440, 40), Ci(230, 250, 30), Ci(190, 160, 20), Ci(780, 180, 36), E(600, 860, 70, 28), STAR(330, 870, 40, 18)],
    det(x) { eye(x, 290, 440, 18, 18); x.fillStyle = '#1e1b2e'; smile(x, 255, 510, 18, 6); x.beginPath(); x.arc(240, 245, 10, PI, PI * 1.5); x.stroke(); } },
  { id: 'fly', n: T('פרפר', 'Butterfly'), parts: () => [grass(860), ...[[150, 880], [850, 880], [500, 900]].flatMap(([a, b]) => [ring(a, b, 40, 30, 6), Ci(a, b, 22)]), E(320, 370, 210, 150, -.5), E(680, 370, 210, 150, .5), E(370, 600, 140, 110, .4), E(630, 600, 140, 110, -.4), Ci(270, 340, 65), Ci(730, 340, 65), Ci(360, 620, 48), Ci(640, 620, 48), E(500, 500, 38, 200), Ci(500, 270, 50)],
    det(x) { eye(x, 482, 262, 9, 12); eye(x, 518, 262, 9, 12); x.fillStyle = '#1e1b2e'; smile(x, 500, 285, 14, 8); x.beginPath(); x.moveTo(480, 228); x.quadraticCurveTo(440, 150, 400, 140); x.moveTo(520, 228); x.quadraticCurveTo(560, 150, 600, 140); x.stroke(); x.beginPath(); x.arc(400, 140, 14, 0, 7); x.arc(600, 140, 14, 0, 7); x.fill(); } },
  { id: 'turtle', n: T('צב', 'Turtle'), parts: () => { const hex = (cx, cy, r) => PL(Array.from({ length: 6 }, (_, i) => [cx + Math.cos(i * PI / 3) * r, cy + Math.sin(i * PI / 3) * r]));
      return [grass(780), Ci(150, 150, 70), cloud(700, 160, 1.1), E(780, 640, 70, 30, -.3), Ci(800, 560, 72), E(330, 740, 60, 45), E(630, 740, 60, 45), PL([[200, 650], [150, 620], [210, 615]]), (() => { const p = P(); p.ellipse(480, 640, 300, 250, 0, PI, PI * 2); p.closePath(); return p; })(), RR(170, 630, 620, 50, 25), hex(480, 520, 70), hex(350, 580, 55), hex(610, 580, 55), hex(480, 400, 45)]; },
    det(x) { eye(x, 820, 545, 14, 18); x.fillStyle = '#1e1b2e'; smile(x, 805, 585, 20, 12); } },
  { id: 'dino', n: T('דינוזאור', 'Dino'), parts: () => [grass(820), (() => { const p = P(); p.moveTo(720, 820); p.lineTo(760, 560); p.lineTo(800, 820); p.closePath(); return p; })(), UN(E(760, 520, 90, 30, .3), E(760, 520, 90, 30, -.5), E(760, 520, 30, 90)), ...[[300, 400], [370, 345], [450, 330], [530, 345], [600, 395]].map(([a, b]) => PL([[a - 40, b + 30], [a, b - 40], [a + 40, b + 30]])), BL([[180, 640], [250, 430], [450, 380], [620, 450], [690, 600], [640, 700], [400, 720], [120, 780], [60, 760]]), RR(300, 650, 80, 150, 40), RR(520, 650, 80, 150, 40), E(470, 600, 130, 75), BL([[600, 470], [640, 300], [700, 210], [820, 200], [860, 260], [800, 320], [700, 330], [690, 470]])],
    det(x) { eye(x, 770, 245, 15, 20); x.fillStyle = '#1e1b2e'; smile(x, 820, 285, 30, 10); x.beginPath(); x.arc(845, 240, 5, 0, 7); x.fill(); } },
  { id: 'car', n: T('מכונית', 'Race car'), parts: () => [RR(-30, 760, 1060, 400, 0), Ci(840, 150, 80), cloud(220, 170), BL([[100, 640], [120, 520], [300, 490], [400, 360], [640, 360], [750, 490], [900, 520], [920, 650], [860, 690], [140, 690]]), PL([[430, 390], [520, 390], [520, 485], [350, 485]]), PL([[550, 390], [630, 390], [710, 485], [550, 485]]), Ci(880, 570, 30), RR(110, 560, 50, 40, 12), Ci(280, 690, 95), Ci(720, 690, 95), Ci(280, 690, 45), Ci(720, 690, 45), STAR(500, 580, 50, 22)],
    det(x) { x.beginPath(); x.moveTo(535, 395); x.lineTo(535, 660); x.stroke(); x.beginPath(); x.moveTo(570, 520); x.lineTo(610, 520); x.stroke(); for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(60 + i * 170, 870); x.lineTo(140 + i * 170, 870); x.stroke(); } } },
  { id: 'rocket', n: T('טיל', 'Rocket'), parts: () => [...[[150, 180], [820, 120], [880, 520], [120, 600], [300, 880], [760, 860]].map(([a, b]) => STAR(a, b, 45, 20)), E(800, 780, 190, 45, -.35), Ci(800, 780, 110), PL([[440, 720], [500, 900], [560, 720]]), PL([[400, 520], [300, 720], [410, 680]]), PL([[600, 520], [700, 720], [590, 680]]), (() => { const p = P(); p.moveTo(400, 720); p.lineTo(400, 400); p.quadraticCurveTo(410, 200, 500, 100); p.quadraticCurveTo(590, 200, 600, 400); p.lineTo(600, 720); p.closePath(); return p; })(), (() => { const p = P(); p.moveTo(430, 250); p.quadraticCurveTo(460, 160, 500, 100); p.quadraticCurveTo(540, 160, 570, 250); p.closePath(); return p; })(), Ci(500, 400, 70), Ci(500, 400, 45), RR(400, 600, 200, 45, 10)],
    det(x) { } },
  { id: 'cake', n: T('קאפקייק', 'Cupcake'), parts: () => [RR(-30, 870, 1060, 300, 0), PL([[280, 560], [720, 560], [650, 860], [350, 860]]), ...[0, 1, 2, 3].map(i => PL([[330 + i * 110, 570], [370 + i * 110, 570], [345 + i * 85 + 50, 850], [315 + i * 85 + 50, 850]])), BL([[250, 580], [230, 470], [320, 400], [380, 300], [500, 250], [620, 300], [680, 400], [770, 470], [750, 580], [500, 610]]), Ci(500, 220, 55), ...[[360, 450, .5], [450, 360, -.4], [560, 420, .9], [640, 500, -.2], [420, 520, .1], [520, 330, .3]].map(([a, b, r]) => E(a, b, 26, 9, r)), HEART(150, 300, 60), HEART(850, 320, 55)],
    det(x) { x.beginPath(); x.moveTo(500, 168); x.quadraticCurveTo(520, 110, 560, 95); x.stroke(); eye(x, 460, 700, 14, 18); eye(x, 540, 700, 14, 18); x.fillStyle = '#1e1b2e'; smile(x, 500, 740, 30, 16); } },
  { id: 'free', n: T('דף חלק', 'Blank page'), parts: () => [], det() { } },
];

/* ================= BUILD PAGE ================= */
const LINE = '#262236';
function buildPage(pg, w = W) { const u = w / 1000; const parts = pg.parts();
  const lab = document.createElement('canvas'); lab.width = lab.height = w; const lx = lab.getContext('2d', { willReadFrequently: true }); lx.fillStyle = 'rgb(0,0,0)'; lx.fillRect(0, 0, w, w); lx.setTransform(u, 0, 0, u, 0, 0);
  parts.forEach((p, i) => { lx.fillStyle = `rgb(${i + 1},0,0)`; lx.fill(p); });
  const line = document.createElement('canvas'); line.width = line.height = w; const L = line.getContext('2d'); L.setTransform(u, 0, 0, u, 0, 0);
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = w; const tx = tmp.getContext('2d'); tx.setTransform(u, 0, 0, u, 0, 0); tx.lineJoin = 'round'; tx.lineWidth = 19; tx.strokeStyle = LINE;
  for (const p of parts) { tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, w, w); tx.setTransform(u, 0, 0, u, 0, 0); tx.globalCompositeOperation = 'source-over'; tx.stroke(p); tx.globalCompositeOperation = 'destination-out'; tx.fill(p); tx.globalCompositeOperation = 'source-over';
    L.globalCompositeOperation = 'destination-out'; L.fill(p); L.globalCompositeOperation = 'source-over'; L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(tmp, 0, 0); L.setTransform(u, 0, 0, u, 0, 0); }
  L.strokeStyle = LINE; L.fillStyle = LINE; L.lineWidth = 9; L.lineCap = 'round'; L.lineJoin = 'round'; pg.det(L);
  if (w < W) return { line, lab };
  const d = lx.getImageData(0, 0, w, w).data, N = w * w, label = new Uint8Array(N); for (let i = 0; i < N; i++) label[i] = d[i * 4];
  // clean anti-alias seams: replace pixels that disagree with both horizontal or both vertical neighbours
  const out = label.slice(); for (let y = 1; y < w - 1; y++) for (let X = 1; X < w - 1; X++) { const i = y * w + X, v = label[i]; const l = label[i - 1], r = label[i + 1], t = label[i - w], b = label[i + w]; if ((v !== l && v !== r) || (v !== t && v !== b)) { const c = {}; let best = v, bc = 0; for (const q of [l, r, t, b, label[i - w - 1], label[i - w + 1], label[i + w - 1], label[i + w + 1]]) { c[q] = (c[q] || 0) + 1; if (c[q] > bc) { bc = c[q]; best = q; } } out[i] = best; } }
  return { line, label: out, n: parts.length + 1, masks: {} };
}
function maskOf(B, id) { if (B.masks[id]) return B.masks[id]; const c = document.createElement('canvas'); c.width = c.height = W; const x = c.getContext('2d'); const im = x.createImageData(W, W); let x0 = W, y0 = W, x1 = 0, y1 = 0;
  for (let i = 0; i < W * W; i++) if (B.label[i] === id) { im.data[i * 4 + 3] = 255; const X = i % W, Y = (i / W) | 0; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; }
  x.putImageData(im, 0, 0); c.bb = [x0, y0, x1 + 1, y1 + 1]; return B.masks[id] = c; }

/* ================= COLORS, PATTERNS, STICKERS ================= */
const COLS = ['#ff3b3b', '#ff8a1f', '#ffd21f', '#9be22a', '#22b84a', '#14c8b4', '#45c4ff', '#2a6aff', '#7a4aff', '#c44aff', '#ff5fb0', '#ffb0d0', '#8a5230', '#d9a06a', '#ffd9b8', '#9aa0aa', '#1e1b2e', '#ffffff', 'rainbow'];
const grainCache = {};
function grain(hex) { if (grainCache[hex]) return grainCache[hex]; const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'); x.fillStyle = hex; x.fillRect(0, 0, 96, 96); const r = rng(hex.length * 7 + parseInt(hex.slice(1), 16) % 997);
  for (let i = 0; i < 900; i++) { const v = r(); x.fillStyle = v < .5 ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.08)'; x.fillRect(r() * 96, r() * 96, 1 + r() * 2, 1); }
  x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 260; i++) { x.fillStyle = '#000'; x.fillRect(Math.floor(r() * 96), Math.floor(r() * 96), 1 + Math.floor(r() * 2), 1); }
  return grainCache[hex] = c; }
const PATS = ['rainbow', 'dots', 'stars', 'stripes', 'hearts', 'glitter', 'checks'];
function drawPattern(x, k, base, w, h) { const r = rng(7); x.fillStyle = base; x.fillRect(0, 0, w, h);
  if (k === 'rainbow') { const cs = ['#ff3b3b', '#ff8a1f', '#ffd21f', '#4fdc5a', '#45c4ff', '#7a4aff']; const bh = Math.max(14, h / 6); for (let i = 0; i * bh < h + bh; i++) { x.fillStyle = cs[i % 6]; x.fillRect(0, i * bh, w, bh + 1); } }
  if (k === 'dots') { x.fillStyle = '#ffffff'; for (let y = 0, j = 0; y < h + 30; y += 34, j++) for (let X = (j % 2) * 17; X < w + 30; X += 34) { x.beginPath(); x.arc(X, y, 9, 0, 7); x.fill(); } }
  if (k === 'stripes') { x.fillStyle = 'rgba(255,255,255,.85)'; for (let i = -h; i < w; i += 40) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 18, 0); x.lineTo(i + 18 + h, h); x.lineTo(i + h, h); x.fill(); } }
  if (k === 'checks') { x.fillStyle = 'rgba(255,255,255,.8)'; for (let y = 0; y < h; y += 28) for (let X = ((y / 28) % 2) * 28; X < w; X += 56) x.fillRect(X, y, 28, 28); }
  if (k === 'stars' || k === 'hearts') { x.fillStyle = k === 'stars' ? '#ffe14a' : '#ffffff'; for (let y = 0, j = 0; y < h + 40; y += 52, j++) for (let X = (j % 2) * 26; X < w + 40; X += 52) { x.save(); x.translate(X, y); x.rotate((r() - .5) * .6); x.fill(k === 'stars' ? STAR(0, 0, 15, 6.5) : HEART(0, 4, 15)); x.restore(); } }
  if (k === 'glitter') { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, base); g.addColorStop(.5, '#ffffff'); g.addColorStop(1, base); x.globalAlpha = .35; x.fillStyle = g; x.fillRect(0, 0, w, h); x.globalAlpha = 1; for (let i = 0; i < w * h / 90; i++) { x.fillStyle = ['#fff', '#ffe14a', '#ffffffaa', '#ffd0f0'][i % 4]; const s = r() < .1 ? 4 : 2; x.fillRect(r() * w, r() * h, s, s); } for (let i = 0; i < w * h / 2500; i++) { x.save(); x.translate(r() * w, r() * h); x.fillStyle = '#fff'; x.fill(STAR(0, 0, 9, 2, 4)); x.restore(); } } }
const STK = ['star', 'heart', 'flower', 'sun', 'rainbow', 'crown', 'smile', 'gem', 'note', 'paw'];
const stkCache = {};
function sticker(k) { if (stkCache[k]) return stkCache[k]; const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'); x.translate(80, 80); x.lineJoin = 'round'; x.lineWidth = 7; x.strokeStyle = '#fff';
  const sf = (p, f) => { x.save(); x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = 8; x.shadowOffsetY = 3; x.lineWidth = 12; x.stroke(p); x.restore(); x.fillStyle = f; x.fill(p); };
  const face = (y = 6) => { x.fillStyle = '#1e1b2e'; x.beginPath(); x.arc(-14, y - 6, 5, 0, 7); x.arc(14, y - 6, 5, 0, 7); x.fill(); x.lineWidth = 4; x.strokeStyle = '#1e1b2e'; x.beginPath(); x.arc(0, y, 12, .2, PI - .2); x.stroke(); };
  if (k === 'star') { sf(STAR(0, 4, 64, 28), '#ffd21f'); face(10); }
  if (k === 'heart') { sf(HEART(0, 18, 62), '#ff4f8a'); face(4); }
  if (k === 'flower') { const p = UN(...Array.from({ length: 6 }, (_, i) => Ci(Math.cos(i * PI / 3) * 36, Math.sin(i * PI / 3) * 36, 28))); sf(p, '#ff8ad0'); x.fillStyle = '#ffd21f'; x.fill(Ci(0, 0, 26)); }
  if (k === 'sun') { const p = STAR(0, 0, 70, 50, 12); sf(p, '#ffb21f'); x.fillStyle = '#ffd94a'; x.fill(Ci(0, 0, 44)); face(8); }
  if (k === 'rainbow') { const cs = ['#ff3b3b', '#ff8a1f', '#ffd21f', '#4fdc5a', '#45c4ff', '#7a4aff']; x.save(); x.shadowColor = 'rgba(0,0,0,.2)'; x.shadowBlur = 8; cs.forEach((c, i) => { x.strokeStyle = c; x.lineWidth = 11; x.beginPath(); x.arc(0, 40, 66 - i * 10, PI, 0); x.stroke(); }); x.restore(); x.fillStyle = '#fff'; x.fill(UN(Ci(-56, 44, 20), Ci(-36, 48, 16))); x.fill(UN(Ci(56, 44, 20), Ci(36, 48, 16))); }
  if (k === 'crown') { sf(PL([[-60, 40], [-66, -30], [-30, 0], [0, -50], [30, 0], [66, -30], [60, 40]]), '#ffc61f'); x.fillStyle = '#ff3b6a'; x.fill(Ci(0, 15, 11)); x.fillStyle = '#45c4ff'; x.fill(Ci(-35, 20, 8)); x.fill(Ci(35, 20, 8)); }
  if (k === 'smile') { sf(Ci(0, 0, 62), '#ffd94a'); face(10); x.fillStyle = '#ff9ab0'; x.fill(Ci(-34, 18, 9)); x.fill(Ci(34, 18, 9)); }
  if (k === 'gem') { sf(PL([[-50, -20], [-25, -50], [25, -50], [50, -20], [0, 55]]), '#4fd8ff'); x.fillStyle = 'rgba(255,255,255,.55)'; x.fill(PL([[-25, -50], [0, -20], [-50, -20]])); }
  if (k === 'note') { const p = UN(E(-24, 34, 26, 20, -.4), RR(-4, -54, 12, 90, 4), PL([[-4, -54], [44, -38], [44, -18], [-4, -32]])); sf(p, '#7a4aff'); }
  if (k === 'paw') { const p = UN(E(0, 20, 34, 28), Ci(-38, -14, 15), Ci(-14, -38, 15), Ci(14, -38, 15), Ci(38, -14, 15)); sf(p, '#8a5230'); }
  return stkCache[k] = c; }

/* ================= STORAGE (IndexedDB for paintings) ================= */
const idb = (() => { let dbp; const open = () => dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open('crayon-pals', 1); r.onupgradeneeded = () => r.result.createObjectStore('art'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  return { get: k => open().then(db => new Promise(res => { const t = db.transaction('art').objectStore('art').get(k); t.onsuccess = () => res(t.result); t.onerror = () => res(null); })).catch(() => null),
    set: (k, v) => open().then(db => new Promise(res => { const t = db.transaction('art', 'readwrite'); t.objectStore('art').put(v, k); t.oncomplete = res; t.onerror = res; })).catch(() => { }) }; })();

/* ================= STATE ================= */
const cv = $('cv'), cx = cv.getContext('2d'); let dpr = 1, VW = 0, VH = 0, land = false;
let B = null, page = null, paint = null, px = null, stickers = [], undo = [], dirty = true, state = 'title', rect = { x: 0, y: 0, s: 1 }, changed = false;
const tmp = document.createElement('canvas'); tmp.width = tmp.height = W; const tx = tmp.getContext('2d');
let tool = S.tool || 'crayon', col = S.col || 0, size = S.size ?? 1, pat = 'dots', stk = 'star', hue = 0;
const SIZES = [12, 26, 48];
const TOOLS = [['crayon', '🖍️'], ['brush', '🖌️'], ['fill', '🪣'], ['pattern', '🌈'], ['sticker', '⭐'], ['eraser', '🧽']];
function layout() { dpr = Math.min(devicePixelRatio || 1, 2.5); VW = innerWidth; VH = innerHeight; land = VW > VH * 1.15; document.body.classList.toggle('land', land); cv.width = VW * dpr; cv.height = VH * dpr; cv.style.width = VW + 'px'; cv.style.height = VH + 'px'; $('fin').width = VW; $('fin').height = VH;
  const box = $('box'), tl = $('tools'); const top = 64;
  if (land) { Object.assign(box.style, { top: '0', bottom: '0', right: '0', left: 'auto', width: '84px', height: 'auto' }); Object.assign(tl.style, { top: top + 'px', right: '88px', left: 'auto', bottom: '8px', width: 'auto' }); }
  else { Object.assign(box.style, { left: '0', right: '0', bottom: '0', top: 'auto', height: 'calc(84px + env(safe-area-inset-bottom))', width: 'auto' }); Object.assign(tl.style, { left: '0', right: '0', bottom: 'calc(88px + env(safe-area-inset-bottom))', top: 'auto' }); }
  const tw = land ? tl.offsetWidth + 92 : 0, th = land ? 0 : tl.offsetHeight + 92; const aw = VW - tw - 16, ah = VH - top - th - 12; const s = Math.min(aw, ah) / W; rect = { s, x: 8 + (aw - W * s) / 2, y: top + (ah - W * s) / 2 }; dirty = true; }
addEventListener('resize', layout);
function renderTools() { $('tools').innerHTML = TOOLS.map(([k, ic]) => `<button class="tb" data-t="${k}" aria-pressed="${k === tool}">${ic}</button>`).join('') + (tool === 'crayon' || tool === 'brush' || tool === 'eraser' || tool === 'sticker' ? `<div class="sz">${SIZES.map((s, i) => `<button data-s="${i}" aria-pressed="${i === size}"><i style="width:${8 + i * 7}px;height:${8 + i * 7}px"></i></button>`).join('')}</div>` : '');
  const bx = $('box'); if (tool === 'pattern') bx.innerHTML = PATS.map(k => `<button class="sw2${k === pat ? ' sel' : ''}" data-p="${k}"><canvas width="62" height="62" data-pc="${k}"></canvas></button>`).join('');
  else if (tool === 'sticker') bx.innerHTML = STK.map(k => `<button class="sw2${k === stk ? ' sel' : ''}" data-k="${k}"><canvas width="62" height="62" data-sc="${k}"></canvas></button>`).join('');
  else bx.innerHTML = COLS.map((c, i) => `<button class="cr${i === col ? ' sel' : ''}${c === 'rainbow' ? ' rb2' : ''}" data-c="${i}" style="--c:${c}"></button>`).join('');
  bx.querySelectorAll('[data-pc]').forEach(c => { const x = c.getContext('2d'); drawPattern(x, c.dataset.pc, baseCol(), 62, 62); });
  bx.querySelectorAll('[data-sc]').forEach(c => c.getContext('2d').drawImage(sticker(c.dataset.sc), 2, 2, 58, 58));
  requestAnimationFrame(layout); }
const baseCol = () => COLS[col] === 'rainbow' ? '#ff5fb0' : COLS[col];
$('tools').onclick = e => { const b = e.target.closest('[data-t]'), s = e.target.closest('[data-s]'); A.ac(); if (b) { tool = b.dataset.t; S.tool = tool; A.tone(700, .05, 'triangle', .05); } if (s) { size = +s.dataset.s; S.size = size; A.tone(500 + size * 150, .05, 'sine', .05); } S.save(); renderTools(); };
$('box').onclick = e => { const c = e.target.closest('[data-c]'), p = e.target.closest('[data-p]'), k = e.target.closest('[data-k]'); A.ac(); if (c) { col = +c.dataset.c; S.col = col; S.save(); A.tone(520 + col * 25, .06, 'sine', .05); if (tool === 'fill' || tool === 'eraser') { } } if (p) { pat = p.dataset.p; A.tone(800, .06, 'triangle', .05); } if (k) { stk = k.dataset.k; A.tone(900, .06, 'triangle', .05); } renderTools(); };

/* ---------- open page ---------- */
async function openPage(i) { page = PAGES[i]; $('loading').hidden = false; await new Promise(r => setTimeout(r, 20)); B = buildPage(page); paint = document.createElement('canvas'); paint.width = paint.height = W; px = paint.getContext('2d'); stickers = []; undo = []; changed = false;
  const saved = await idb.get(page.id); if (saved && saved.paint) { try { const bm = await createImageBitmap(saved.paint); px.drawImage(bm, 0, 0); } catch (e) { } stickers = saved.stk || []; }
  state = 'play'; $('title').hidden = true; $('hud').hidden = $('tools').hidden = $('box').hidden = false; renderTools(); layout(); $('loading').hidden = true; dirty = true;
  A.startMusic({ chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], bpm: 92, lead: true, kick: false, vol: .5 });
  if (!S.tut) { S.tut = 1; S.save(); toast(T('בחרו צבע וצבעו! הצבע תמיד נשאר בתוך הקווים 🖍️', 'Pick a color and color! It always stays inside the lines 🖍️'), 5000); } }
function snapshot() { const c = document.createElement('canvas'); c.width = c.height = W; c.getContext('2d').drawImage(paint, 0, 0); undo.push({ c, stk: stickers.slice() }); if (undo.length > 10) undo.shift(); changed = true; }
$('undoBtn').onclick = () => { const u = undo.pop(); if (!u) { A.tone(200, .1, 'square', .03); return; } px.globalCompositeOperation = 'copy'; px.drawImage(u.c, 0, 0); px.globalCompositeOperation = 'source-over'; stickers = u.stk; dirty = true; A.tone(400, .08, 'triangle', .05); };
$('clrBtn').onclick = () => { $('cfT').textContent = T('למחוק את כל הציור?', 'Erase the whole picture?'); $('cfNo').textContent = T('לא', 'No'); $('cfYes').textContent = T('כן, למחוק', 'Yes, erase'); $('cfSheet').hidden = false; };
$('cfNo').onclick = () => $('cfSheet').hidden = true;
$('cfYes').onclick = () => { $('cfSheet').hidden = true; snapshot(); px.clearRect(0, 0, W, W); stickers = []; dirty = true; A.noise(.5, 'highpass', 2000, .7, .1); };

/* ---------- painting ---------- */
const toPage = (x, y) => [(x - rect.x) / rect.s, (y - rect.y) / rect.s];
const labAt = (X, Y) => { X = Math.round(X); Y = Math.round(Y); if (X < 0 || Y < 0 || X >= W || Y >= W) return -1; return B.label[Y * W + X]; };
let stroke = null;
function strokeStyleFor() { if (tool === 'eraser') return '#000'; const c = COLS[col]; if (c === 'rainbow') { hue = (hue + 3) % 360; return `hsl(${hue},95%,58%)`; } if (tool === 'crayon') return tx.createPattern(grain(c), 'repeat'); return c; }
function seg(a, b) { const m = maskOf(B, stroke.id); const w = SIZES[size] * (tool === 'eraser' ? 1.4 : 1); const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0]) - w)), y0 = Math.max(0, Math.floor(Math.min(a[1], b[1]) - w)), x1 = Math.min(W, Math.ceil(Math.max(a[0], b[0]) + w)), y1 = Math.min(W, Math.ceil(Math.max(a[1], b[1]) + w)); if (x1 <= x0 || y1 <= y0) return;
  tx.globalCompositeOperation = 'source-over'; tx.clearRect(x0, y0, x1 - x0, y1 - y0); tx.lineCap = 'round'; tx.lineJoin = 'round'; tx.lineWidth = w; tx.strokeStyle = strokeStyleFor(); tx.beginPath(); tx.moveTo(a[0], a[1]); tx.lineTo(b[0] + .01, b[1]); tx.stroke();
  tx.globalCompositeOperation = 'destination-in'; tx.drawImage(m, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0); tx.globalCompositeOperation = 'source-over';
  px.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'; px.drawImage(tmp, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0); px.globalCompositeOperation = 'source-over'; dirty = true; }
function fillRegion(id, k) { const m = maskOf(B, id), [x0, y0, x1, y1] = m.bb; const w = x1 - x0, h = y1 - y0; if (w <= 0) return; snapshot(); tx.clearRect(x0, y0, w, h); tx.save(); tx.translate(x0, y0);
  if (k) drawPattern(tx, k, baseCol(), w, h); else { const c = COLS[col]; if (c === 'rainbow') { const g = tx.createLinearGradient(0, 0, w, h); ['#ff3b3b', '#ff8a1f', '#ffd21f', '#4fdc5a', '#45c4ff', '#7a4aff'].forEach((q, i) => g.addColorStop(i / 5, q)); tx.fillStyle = g; } else tx.fillStyle = c; tx.fillRect(0, 0, w, h); } tx.restore();
  tx.globalCompositeOperation = 'destination-in'; tx.drawImage(m, x0, y0, w, h, x0, y0, w, h); tx.globalCompositeOperation = 'source-over'; fillAnim = { x0, y0, w, h, t: 0 }; dirty = true; }
let fillAnim = null;
const ptrs = new Map();
cv.addEventListener('pointerdown', e => { if (state !== 'play') return; A.ac(); cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, 1); if (ptrs.size > 1) { stroke = null; A.loopOff('scr'); return; } const p = toPage(e.clientX, e.clientY); const id = labAt(p[0], p[1]); if (id < 0) return;
  if (tool === 'fill' || tool === 'pattern') { if (fillAnim) commitFill(); fillRegion(id, tool === 'pattern' ? pat : null); A.tone(300, .25, 'sine', .08, 0, 900); A.noise(.25, 'bandpass', 1500, 1, .05); sparkle(e.clientX, e.clientY); return; }
  if (tool === 'sticker') { snapshot(); stickers.push({ k: stk, x: p[0], y: p[1], s: [.6, .9, 1.3][size], r: (Math.random() - .5) * .5 }); dirty = true; A.tone(880, .08, 'triangle', .07); A.tone(1320, .12, 'triangle', .05, .06); sparkle(e.clientX, e.clientY); return; }
  snapshot(); stroke = { id, last: p }; seg(p, p); A.loopOn('scr', 'bandpass', tool === 'crayon' ? 2600 : 1200, .9, tool === 'crayon' ? .045 : .02); });
cv.addEventListener('pointermove', e => { if (!stroke || !ptrs.has(e.pointerId)) return; const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; for (const ev of evs.length ? evs : [e]) { const p = toPage(ev.clientX, ev.clientY); seg(stroke.last, p); stroke.last = p; } const l = A.loop('scr'); if (l && l.fl) l.fl.frequency.value = (tool === 'crayon' ? 2200 : 1000) + Math.random() * 600; });
const up = e => { ptrs.delete(e.pointerId); if (stroke) { stroke = null; A.loopOff('scr'); } }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
function commitFill() { const f = fillAnim; if (!f) return; px.drawImage(tmp, f.x0, f.y0, f.w, f.h, f.x0, f.y0, f.w, f.h); fillAnim = null; dirty = true; }

/* ---------- done / save ---------- */
async function save() { if (!page || !paint) return; commitFill(); const blob = await new Promise(r => paint.toBlob(r, 'image/png')); await idb.set(page.id, { paint: blob, stk: stickers }); const c = document.createElement('canvas'); c.width = c.height = 220; const x = c.getContext('2d'); compose(x, 220 / W); try { S.th[page.id] = c.toDataURL('image/jpeg', .82); } catch (e) { } S.save(); changed = false; }
$('doneBtn').onclick = async () => { A.ac(); A.voice('yay', 1.3); [523, 659, 784, 1047, 1319].forEach((f, i) => A.tone(f, .25, 'triangle', .07, i * .1)); confetti(); await save(); toast(T('איזה יופי! הציור נשמר בגלריה ⭐', 'Beautiful! Saved to your gallery ⭐'), 2600); };
$('galBtn').onclick = async () => { if (changed) await save(); showTitle(); };
document.addEventListener('visibilitychange', () => { if (document.hidden && changed) save(); });

/* ---------- rendering ---------- */
function compose(x, k) { x.save(); x.scale(k, k); x.fillStyle = '#fff'; x.fillRect(0, 0, W, W); x.drawImage(paint, 0, 0); if (fillAnim) { const f = fillAnim, t = Math.min(1, f.t); x.save(); x.beginPath(); const cx0 = f.x0 + f.w / 2, cy0 = f.y0 + f.h / 2; x.arc(cx0, cy0, Math.hypot(f.w, f.h) * .55 * t, 0, 7); x.clip(); x.drawImage(tmp, f.x0, f.y0, f.w, f.h, f.x0, f.y0, f.w, f.h); x.restore(); }
  for (const s of stickers) { x.save(); x.translate(s.x, s.y); x.rotate(s.r); const z = 120 * s.s; x.drawImage(sticker(s.k), -z / 2, -z / 2, z, z); x.restore(); } x.drawImage(B.line, 0, 0); x.restore(); }
function draw() { cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.fillStyle = '#fff6e8'; cx.fillRect(0, 0, VW, VH); if (state !== 'play' || !B) return;
  cx.save(); cx.shadowColor = 'rgba(60,40,80,.18)'; cx.shadowBlur = 24; cx.shadowOffsetY = 6; cx.fillStyle = '#fff'; cx.beginPath(); cx.roundRect(rect.x - 6, rect.y - 6, W * rect.s + 12, W * rect.s + 12, 22); cx.fill(); cx.restore();
  cx.save(); cx.beginPath(); cx.roundRect(rect.x, rect.y, W * rect.s, W * rect.s, 16); cx.clip(); cx.translate(rect.x, rect.y); compose(cx, rect.s); cx.restore(); }
const fin = $('fin'), fx = fin.getContext('2d'); let conf = [];
function confetti() { const cols = ['#ff3b3b', '#ffd21f', '#45c4ff', '#4fdc5a', '#c44aff', '#ff8a1f']; for (let i = 0; i < 150; i++) conf.push({ x: VW / 2, y: VH * .4, vx: (Math.random() - .5) * 15, vy: -Math.random() * 14 - 4, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[i % 6], s: 7 + Math.random() * 6, life: 3, st: i % 3 === 0 }); }
function sparkle(x, y) { for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; conf.push({ x, y, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4 - 1, r: 0, vr: .2, c: ['#ffd21f', '#fff', '#ff8ad0'][i % 3], s: 8, life: .6, st: 1, ng: 1 }); } }
let last = performance.now();
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; A.tick();
  if (fillAnim) { fillAnim.t += dt / .35; dirty = true; if (fillAnim.t >= 1) commitFill(); }
  if (dirty) { dirty = false; draw(); }
  fx.clearRect(0, 0, VW, VH); for (let i = conf.length - 1; i >= 0; i--) { const c = conf[i]; if (!c.ng) c.vy += .35; c.x += c.vx; c.y += c.vy; c.r += c.vr; c.life -= dt; if (c.life <= 0) { conf.splice(i, 1); continue; } fx.save(); fx.globalAlpha = Math.min(1, c.life * 2); fx.translate(c.x, c.y); fx.rotate(c.r); fx.fillStyle = c.c; if (c.st) fx.fill(STAR(0, 0, c.s, c.s * .45)); else fx.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2); fx.restore(); } }

/* ---------- gallery ---------- */
const prevCache = {};
function previewOf(pg) { if (prevCache[pg.id]) return prevCache[pg.id]; const { line } = buildPage(pg, 220); const c = document.createElement('canvas'); c.width = c.height = 220; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 220, 220); x.drawImage(line, 0, 0); if (pg.id === 'free') { x.font = '80px serif'; x.textAlign = 'center'; x.fillText('✏️', 110, 140); } return prevCache[pg.id] = c.toDataURL(); }
function renderGal() { $('gal').innerHTML = PAGES.map((pg, i) => `<button class="pc" data-i="${i}"><img src="${S.th[pg.id] || ''}" data-p="${i}" alt=""><b>${pg.n}</b>${S.th[pg.id] ? '<span class="ok">⭐</span>' : ''}</button>`).join('');
  const imgs = [...$('gal').querySelectorAll('img')].filter(im => !im.getAttribute('src')); let k = 0; const step = () => { const im = imgs[k++]; if (!im) return; im.src = previewOf(PAGES[+im.dataset.p]); setTimeout(step, 0); }; setTimeout(step, 20); }
$('gal').onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; A.ac(); A.tone(660, .06, 'triangle', .05); openPage(+b.dataset.i); };
function showTitle() { state = 'title'; A.allOff(); A.stopMusic(); $('title').hidden = false; $('hud').hidden = $('tools').hidden = $('box').hidden = true; renderGal(); dirty = true; }
$('galBtn').innerHTML = ICO.grid('#3a5ad8'); $('undoBtn').innerHTML = ICO.undo('#3a5ad8'); $('homeT').innerHTML = ICO.home('#3a5ad8'); soundButton('sndBtn', S, A, '#3a5ad8'); hubButtons(['homeT'], A);
$('tSub').textContent = T('בחרו ציור, קחו צבע וצבעו – הצבע תמיד נשאר בפנים! אפשר גם דפוסים ומדבקות ✨', 'Pick a picture, grab a crayon and color – it always stays inside the lines! Patterns and stickers too ✨');
setTimeout(() => { layout(); showTitle(); $('loading').hidden = true; requestAnimationFrame(frame); window.__crOK = true; }, 20);
window.__cr = { fillId(id, c, k) { col = c; fillRegion(id, k || null); commitFill(); }, addStk(k, x, y, sz) { stickers.push({ k, x, y, s: sz, r: 0 }); dirty = true; }, art() { const c = document.createElement('canvas'); c.width = 720; c.height = 491; const x = c.getContext('2d'); x.translate(0, -(720 - 491) / 2 - 20); compose(x, 720 / W); return c.toDataURL('image/jpeg', .85); }, openPage, get B() { return B; }, PAGES, setTool(t) { tool = t; renderTools(); }, setCol(c) { col = c; renderTools(); }, set pat(v) { pat = v; }, set stk(v) { stk = v; }, get state() { return state; }, rect: () => rect };
