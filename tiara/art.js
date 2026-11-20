// Tiara Glow – procedural princess art (original designs, 1000-unit world, figure ~1600 tall)
import { clamp, lerp, rng } from '../lib/kit.js';
export const PI = Math.PI, TAU = PI * 2;
/* ---------- color ---------- */
export const hx = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const toH = (r, g, b) => '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toH(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); };
export const sh = (c, t) => t > 0 ? mix(c, '#ffffff', t) : mix(c, '#000000', -t);
export const rgba = (c, a) => { const [r, g, b] = hx(c); return `rgba(${r},${g},${b},${a})`; };
const skd = (c, t) => mix(c, '#5a2418', t);
const skl = (c, t) => mix(c, '#fff4ee', t);
/* ---------- paths ---------- */
export const P = () => new Path2D();
export const E = (cx, cy, rx, ry, r = 0) => { const p = P(); p.ellipse(cx, cy, rx, ry, r, 0, TAU); return p; };
export const BL = pts => { const p = P(), n = pts.length; const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; let s = m(pts[n - 1], pts[0]); p.moveTo(s[0], s[1]); for (let i = 0; i < n; i++) { const c = pts[i], e = m(c, pts[(i + 1) % n]); p.quadraticCurveTo(c[0], c[1], e[0], e[1]); } p.closePath(); return p; };
const mir = pts => pts.map(([x, y]) => [1000 - x, y]);
export const sym = pts => BL([...pts, ...mir(pts.slice(1, -1)).reverse()]);
const PL = pts => { const p = P(); pts.forEach(([a, b], i) => i ? p.lineTo(a, b) : p.moveTo(a, b)); p.closePath(); return p; };
export function limb(pts, ws) { const L = [], R = []; for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; L.push([pts[i][0] + nx * ws[i], pts[i][1] + ny * ws[i]]); R.push([pts[i][0] - nx * ws[i], pts[i][1] - ny * ws[i]]); } return BL([...L, ...R.reverse()]); }
export const STAR = (cx, cy, R, r, n = 5, rot = 0) => { const pts = []; for (let i = 0; i < n * 2; i++) { const a = -PI / 2 + rot + i * PI / n, q = i % 2 ? r : R; pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } return PL(pts); };
export const HEART = (cx, cy, s) => { const p = P(); p.moveTo(cx, cy + s * .9); p.bezierCurveTo(cx - s * 1.5, cy - s * .1, cx - s * .8, cy - s * 1.25, cx, cy - s * .45); p.bezierCurveTo(cx + s * .8, cy - s * 1.25, cx + s * 1.5, cy - s * .1, cx, cy + s * .9); p.closePath(); return p; };
const bz = (a, b, c, d, t) => { const u = 1 - t; return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]; };
const lin = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const rad = (x, cx, cy, r0, r1, stops, cx1 = cx, cy1 = cy) => { const g = x.createRadialGradient(cx, cy, r0, cx1, cy1, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };

/* ---------- face geometry ---------- */
export const FACE = (() => { const p = P(); p.moveTo(500, 220); p.bezierCurveTo(592, 220, 654, 272, 653, 362); p.bezierCurveTo(654, 448, 628, 508, 574, 546); p.bezierCurveTo(546, 566, 524, 575, 500, 575); p.bezierCurveTo(476, 575, 454, 566, 426, 546); p.bezierCurveTo(372, 508, 346, 448, 347, 362); p.bezierCurveTo(346, 272, 408, 220, 500, 220); p.closePath(); return p; })();
function eyeG(s) { const cx = 500 + s * 72, cy = 410, k = 1.13, Q = (a, b) => [cx + s * a * k, cy + b * k]; const inner = Q(-38, 4), outer = Q(45, -9);
  const up = [inner, Q(-28, -32), Q(24, -40), outer], lo = [outer, Q(31, 17), Q(-20, 25), inner];
  const p = P(); p.moveTo(...inner); p.bezierCurveTo(...up[1], ...up[2], ...up[3]); p.bezierCurveTo(...lo[1], ...lo[2], ...lo[3]); p.closePath(); return { s, cx, cy, inner, outer, up, lo, path: p }; }
export const EYES = [eyeG(-1), eyeG(1)];
export const lidPt = (e, t) => bz(...e.up, t);
export const loPt = (e, t) => bz(...e.lo, t);
export function lidN(e, t, lower) { const f = lower ? loPt : lidPt; const a = f(e, Math.max(0, t - .02)), b = f(e, Math.min(1, t + .02)); let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; if (lower ? ny < 0 : ny > 0) { nx = -nx; ny = -ny; } return [nx, ny]; }
const LIPS0 = (() => { const p = P(); p.moveTo(461, 527); p.bezierCurveTo(471, 520, 480, 510, 489, 510); p.bezierCurveTo(494, 510, 497, 514, 500, 516); p.bezierCurveTo(503, 514, 506, 510, 511, 510); p.bezierCurveTo(520, 510, 529, 520, 539, 527); p.bezierCurveTo(530, 550, 516, 557, 500, 557); p.bezierCurveTo(484, 557, 470, 550, 461, 527); p.closePath(); return p; })();
const UPLIP0 = (() => { const p = P(); p.moveTo(461, 527); p.bezierCurveTo(471, 520, 480, 510, 489, 510); p.bezierCurveTo(494, 510, 497, 514, 500, 516); p.bezierCurveTo(503, 514, 506, 510, 511, 510); p.bezierCurveTo(520, 510, 529, 520, 539, 527); p.quadraticCurveTo(500, 536, 461, 527); p.closePath(); return p; })();
const shiftP = (p, dy) => { const q = P(); q.addPath(p, new DOMMatrix().translate(500, 520 + dy).scale(.94, 1.04).translate(-500, -520)); return q; };
export const LIPS = shiftP(LIPS0, -14), UPLIP = shiftP(UPLIP0, -14);
export function browPath(e, style = 'soft') { const s = e.s, cx = e.cx, cy = e.cy; const pk = style === 'arch' ? -78 : -71; const k = style === 'bold' ? 1.35 : style === 'soft' ? .85 : 1;
  return limb([[cx - s * 40, cy - 58], [cx - s * 15, cy - 71], [cx + s * 20, cy + pk - 7], [cx + s * 42, cy - 73], [cx + s * 56, cy - 62]], [5.5 * k, 5.2 * k, 4.4 * k, 2.8 * k, 1.1]); }
export function linerPath(e, style) { const W = { base: [1.4, 2.6], thin: [2, 3.6], wing: [2.4, 6], cat: [3.2, 8.5], glam: [4.5, 9.5] }[style] || [2, 3]; const tip = { wing: [24, -13], cat: [36, -21], glam: [32, -19] }[style];
  const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16, p = lidPt(e, t), n = lidN(e, t), w = W[0] + W[1] * Math.pow(t, 1.3); pts.push([p[0] + n[0] * w, p[1] + n[1] * w]); }
  if (tip) pts.push([e.outer[0] + e.s * tip[0], e.outer[1] + tip[1]]);
  for (let i = 16; i >= 0; i--) { const t = i / 16, p = lidPt(e, t); pts.push([p[0], p[1] + .8]); }
  const p = PL(pts); if (style === 'glam') { const q = []; for (let i = 0; i <= 10; i++) { const t = i / 10 * .55, a = loPt(e, t), n = lidN(e, t, true), w = 2.6 * (1 - t / .55) + .5; q.push([a[0] + n[0] * w, a[1] + n[1] * w]); } for (let i = 10; i >= 0; i--) { const a = loPt(e, i / 10 * .55); q.push([a[0], a[1] - .5]); } p.addPath(PL(q)); } return p; }
export function lashes(e, style) { const S = { base: [7, 5, 6, .12], natural: [10, 9, 8, .28], long: [13, 13, 13, .2], drama: [18, 18, 18, .15], doll: [14, 12, 10, .2] }[style] || [10, 9, 8, .3]; const [n, l0, l1, t0] = S; const p = P();
  const one = (b, d, len, w, curl) => { const px = -d[1], py = d[0]; const tip = [b[0] + d[0] * len + px * curl, b[1] + d[1] * len + py * curl], c = [b[0] + d[0] * len * .55, b[1] + d[1] * len * .55]; p.moveTo(b[0] + px * w, b[1] + py * w); p.quadraticCurveTo(c[0], c[1], tip[0], tip[1]); p.quadraticCurveTo(c[0], c[1], b[0] - px * w, b[1] - py * w); p.closePath(); };
  for (let i = 0; i < n; i++) { const t = t0 + (1 - t0) * (i / (n - 1)); const b = lidPt(e, t), nn = lidN(e, t); let dx = nn[0] + e.s * (.15 + t * 1.1), dy = nn[1]; const l = Math.hypot(dx, dy); dx /= l; dy /= l; one(b, [dx, dy], l0 * .6 + (l1 + l0 * .4) * t, 1.5 + (style === 'drama' ? .9 : .4), -e.s * (3 + t * 4) * (dy < 0 ? 1 : 1)); }
  if (style === 'doll' || style === 'drama' || style === 'long') { const m = style === 'doll' ? 9 : 6; for (let i = 0; i < m; i++) { const t = .05 + .6 * (i / (m - 1)); const b = loPt(e, t), nn = lidN(e, t, true); let dx = nn[0] + e.s * .35 * (1 - t), dy = nn[1]; const l = Math.hypot(dx, dy); one(b, [dx / l, dy / l], (style === 'doll' ? 7 : 5) * (1.1 - t * .6), 1, 0); } }
  return p; }

/* ---------- metals & gems ---------- */
export const METAL = { gold: ['#fff7c8', '#ffd84a', '#c98c12', '#7a4a06'], silver: ['#ffffff', '#dfe4ee', '#9ea6b8', '#5a6074'], rose: ['#fff0ea', '#f6b8a4', '#c47866', '#7a3a30'] };
const metalG = (x, x0, y0, x1, y1, m) => { const M = METAL[m] || METAL.gold; return lin(x, x0, y0, x1, y1, [[0, M[0]], [.3, M[1]], [.65, M[2]], [.85, M[1]], [1, M[0]]]); };
export function gem(x, cx, cy, r, c, shape = 'round') { x.save(); let p; if (shape === 'drop') { p = P(); p.moveTo(cx, cy - r * 1.4); p.bezierCurveTo(cx + r * 1.1, cy - r * .2, cx + r, cy + r, cx, cy + r); p.bezierCurveTo(cx - r, cy + r, cx - r * 1.1, cy - r * .2, cx, cy - r * 1.4); } else if (shape === 'heart') p = HEART(cx, cy, r * .85); else if (shape === 'star') p = STAR(cx, cy, r * 1.2, r * .55); else p = E(cx, cy, r, r);
  x.fillStyle = rad(x, cx - r * .3, cy - r * .35, 0, r * 1.3, [[0, sh(c, .75)], [.35, sh(c, .15)], [.8, c], [1, sh(c, -.45)]]); x.fill(p); x.clip(p);
  x.strokeStyle = rgba('#ffffff', .35); x.lineWidth = Math.max(.6, r * .08); x.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * r * 1.5, cy + Math.sin(a) * r * 1.5); } x.stroke();
  x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.ellipse(cx - r * .35, cy - r * .4, r * .32, r * .2, -.6, 0, TAU); x.fill(); x.restore(); x.strokeStyle = rgba(sh(c, -.55), .7); x.lineWidth = Math.max(.5, r * .1); x.stroke(p); }
export function pearl(x, cx, cy, r, c = '#fff8f0') { x.fillStyle = rad(x, cx - r * .35, cy - r * .4, 0, r * 1.2, [[0, '#ffffff'], [.4, c], [.85, mix(c, '#c8b8c8', .5)], [1, mix(c, '#8a7a8a', .6)]]); x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); }
export function sparkle(x, cx, cy, r, c = '#ffffff', a = 1) { x.fillStyle = rgba(c, a); x.fill(STAR(cx, cy, r, r * .22, 4)); }

/* ---------- body ---------- */
const TORSO = (() => { const p = P(); p.moveTo(466, 590); p.lineTo(466, 640); p.bezierCurveTo(440, 652, 382, 655, 354, 672); p.bezierCurveTo(336, 684, 336, 712, 356, 726); p.lineTo(374, 800); p.lineTo(626, 800); p.lineTo(644, 726); p.bezierCurveTo(664, 712, 664, 684, 646, 672); p.bezierCurveTo(618, 655, 560, 652, 534, 640); p.lineTo(534, 590); p.closePath(); return p; })();
const ARM = [[356, 686], [332, 762], [316, 842], [304, 916], [298, 960]], ARMW = [21, 18, 14.5, 12, 10];
function drawArms(x, skin) { for (const s of [-1, 1]) { const pts = s < 0 ? ARM : mir(ARM); const p = limb(pts, ARMW); x.fillStyle = lin(x, 500 + s * 290, 0, 500 + s * 205, 0, [[0, skd(skin, .18)], [.6, skin], [1, skl(skin, .12)]]); x.fill(p); x.strokeStyle = rgba(skd(skin, .35), .35); x.lineWidth = 1.5; x.stroke(p);
    const hx0 = 500 + s * 202, hand = E(hx0, 982, 13, 20, -s * .12); x.fillStyle = rad(x, hx0 - s * 3, 975, 2, 24, [[0, skl(skin, .1)], [1, skd(skin, .12)]]); x.fill(hand); x.stroke(hand); const th = E(hx0 - s * 11, 972, 5, 10, s * .5); x.fill(th); x.stroke(th); } }
function drawTorso(x, skin) { x.fillStyle = lin(x, 0, 600, 0, 800, [[0, skd(skin, .2)], [.25, skin], [1, skl(skin, .08)]]); x.fill(TORSO); x.save(); x.clip(TORSO); x.fillStyle = lin(x, 340, 0, 660, 0, [[0, rgba(skd(skin, .5), .25)], [.22, rgba(skin, 0)], [.78, rgba(skin, 0)], [1, rgba(skd(skin, .5), .25)]]); x.fillRect(330, 590, 340, 220);
  x.fillStyle = rad(x, 500, 588, 0, 70, [[0, rgba(skd(skin, .6), .35)], [1, rgba(skd(skin, .6), 0)]]); x.fillRect(430, 580, 140, 90); x.strokeStyle = rgba(skd(skin, .5), .18); x.lineWidth = 2.5; x.lineCap = 'round'; x.beginPath(); x.moveTo(478, 664); x.quadraticCurveTo(440, 670, 404, 668); x.moveTo(522, 664); x.quadraticCurveTo(560, 670, 596, 668); x.stroke();
  x.fillStyle = rgba(skl(skin, .6), .22); x.beginPath(); x.ellipse(430, 690, 40, 10, -.1, 0, TAU); x.ellipse(570, 690, 40, 10, .1, 0, TAU); x.fill(); x.restore(); }

/* ---------- face ---------- */
export function drawHeadBase(x, L) { const skin = L.skin;
  for (const s of [-1, 1]) { const ex = 500 + s * 152, ear = E(ex, 430, 14, 26, s * .15); x.fillStyle = rad(x, ex, 430, 2, 26, [[0, skd(skin, .22)], [1, skin]]); x.fill(ear); x.strokeStyle = rgba(skd(skin, .4), .4); x.lineWidth = 1.5; x.stroke(ear); }
  x.fillStyle = rad(x, 500, 360, 20, 260, [[0, skl(skin, .14)], [.55, skin], [1, skd(skin, .2)]], 500, 400); x.fill(FACE);
  x.save(); x.clip(FACE);
  x.fillStyle = rad(x, 500, 590, 10, 110, [[0, rgba(skd(skin, .4), .2)], [1, rgba(skin, 0)]]); x.fillRect(380, 490, 240, 100);
  for (const s of [-1, 1]) { x.fillStyle = rad(x, 500 + s * 92, 482, 0, 50, [[0, rgba('#ff6a8a', .13)], [1, 'rgba(255,106,138,0)']]); x.fillRect(500 + s * 92 - 55, 430, 110, 110); }
  x.fillStyle = rad(x, 500, 300, 0, 80, [[0, rgba('#ffffff', .12)], [1, 'rgba(255,255,255,0)']]); x.fillRect(400, 220, 200, 160);
  x.restore(); x.strokeStyle = rgba(skd(skin, .45), .45); x.lineWidth = 1.6; x.stroke(FACE);
  // nose
  x.strokeStyle = rgba(skd(skin, .5), .32); x.lineWidth = 2.2; x.lineCap = 'round'; x.beginPath(); x.moveTo(508, 436); x.quadraticCurveTo(511, 462, 505, 472); x.stroke();
  x.strokeStyle = rgba(skd(skin, .55), .5); x.lineWidth = 2; x.beginPath(); x.moveTo(489, 474); x.quadraticCurveTo(493, 480, 497, 478); x.moveTo(511, 474); x.quadraticCurveTo(507, 480, 503, 478); x.stroke();
  x.fillStyle = rgba('#ffffff', .4); x.beginPath(); x.ellipse(499, 465, 6, 4, 0, 0, TAU); x.fill();
  // natural lips
  const lc = mix(skin, '#e05a74', .5); x.fillStyle = lin(x, 0, 496, 0, 545, [[0, sh(lc, -.1)], [.45, lc], [1, sh(lc, .12)]]); x.fill(LIPS); x.fillStyle = rgba(sh(lc, -.25), .5); x.fill(UPLIP);
  // eyes
  for (const e of EYES) drawEyeBall(x, e, L.lens);
  for (const e of EYES) { x.fillStyle = rgba(L.browC || browOf(L.hc), .5); x.fill(browPath(e, 'soft')); }
}
export const browOf = hc => { const [r, g, b] = hx(hc); const sat = Math.max(r, g, b) - Math.min(r, g, b); return sat > 90 && (b > r * .8 || r > 200) ? '#6a4a3a' : sh(hc, -.25); };
function drawEyeBall(x, e, lens) { x.save(); x.fillStyle = '#fffdfb'; x.fill(e.path); x.clip(e.path);
  x.fillStyle = lin(x, 0, e.cy - 38, 0, e.cy + 24, [[0, 'rgba(110,60,80,.4)'], [.45, 'rgba(110,60,80,0)']]); x.fillRect(e.cx - 60, e.cy - 45, 120, 80);
  const ix = e.cx + e.s * 1.5, iy = e.cy - 4, r = 25; x.fillStyle = rad(x, ix, iy + 4, 2, r, [[0, sh(lens, .45)], [.45, sh(lens, .05)], [.8, sh(lens, -.3)], [1, sh(lens, -.62)]]); x.beginPath(); x.arc(ix, iy, r, 0, TAU); x.fill();
  x.strokeStyle = rgba(sh(lens, .6), .28); x.lineWidth = 1.1; x.beginPath(); for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; x.moveTo(ix + Math.cos(a) * 11, iy + Math.sin(a) * 11); x.lineTo(ix + Math.cos(a) * 22.5, iy + Math.sin(a) * 22.5); } x.stroke();
  x.fillStyle = '#140a16'; x.beginPath(); x.arc(ix, iy, 10.5, 0, TAU); x.fill();
  x.save(); x.beginPath(); x.arc(ix, iy, r, 0, TAU); x.clip(); x.fillStyle = lin(x, 0, iy - r, 0, iy + 2, [[0, 'rgba(30,10,30,.55)'], [1, 'rgba(30,10,30,0)']]); x.fillRect(ix - r, iy - r - 3, r * 2, r + 4); x.restore();
  x.fillStyle = 'rgba(255,255,255,.96)'; x.beginPath(); x.ellipse(ix - 8, iy - 10, 8, 6, -.5, 0, TAU); x.fill(); x.beginPath(); x.arc(ix + 7, iy + 8, 3, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.arc(ix + 10, iy - 6, 2, 0, TAU); x.fill();
  x.restore();
  x.fillStyle = '#2a1418'; x.fill(linerPath(e, 'base')); x.fill(lashes(e, 'base'));
  x.strokeStyle = 'rgba(90,40,50,.35)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(...e.lo[0]); x.bezierCurveTo(...e.lo[1], ...e.lo[2], ...e.lo[3]); x.stroke();
  x.strokeStyle = 'rgba(90,40,50,.22)'; x.lineWidth = 1.6; x.beginPath(); const c0 = lidPt(e, .12), c3 = lidPt(e, .92); x.moveTo(c0[0], c0[1] - 8); x.quadraticCurveTo(e.cx, e.cy - 62, c3[0], c3[1] - 10); x.stroke(); }
export function mouthLine(x, skin) { x.strokeStyle = rgba(mix(skin, '#5a1a2a', .7), .55); x.lineWidth = 1.6; x.lineCap = 'round'; x.beginPath(); x.moveTo(465, 513); x.quadraticCurveTo(500, 524, 535, 513); x.stroke(); x.lineWidth = 1.2; x.beginPath(); x.moveTo(463, 511); x.quadraticCurveTo(460, 509, 458, 506); x.moveTo(537, 511); x.quadraticCurveTo(540, 509, 542, 506); x.stroke(); }

/* ---------- hair ---------- */
function hairFill(x, p, hc, y0, y1, seed, flow = 'down', bb = [300, 150, 400, 900], noStroke) { x.save(); x.fillStyle = lin(x, 0, y0, 0, y1, [[0, sh(hc, .14)], [.45, hc], [1, sh(hc, -.3)]]); x.fill(p); x.clip(p);
  const r = rng(seed); const dk = sh(hc, -.38), lt = sh(hc, .4); SHC = sh(hc, .55); x.lineCap = 'round'; const lum = hx(hc).reduce((a, b) => a + b) / 765;
  for (let i = 0; i < 46; i++) { x.strokeStyle = rgba(i % 3 ? dk : lt, i % 3 ? .22 : .12 + lum * .25); x.lineWidth = 1 + r() * 2.2; x.beginPath();
    if (flow === 'rad') { const a = PI + r() * PI, x0 = 500 + (r() - .5) * 40; x.moveTo(x0, 175); x.quadraticCurveTo(500 + Math.cos(a) * 120, 260 + Math.sin(a) * 40 + 60, 500 + Math.cos(a) * 200, 380 + r() * 60); }
    else { const xx = bb[0] + r() * bb[2], w = (r() - .5) * 30; x.moveTo(xx, bb[1]); x.bezierCurveTo(xx + w, bb[1] + bb[3] * .33, xx - w, bb[1] + bb[3] * .66, xx + w * .5, bb[1] + bb[3]); } x.stroke(); }
  x.restore(); if (noStroke) return; x.strokeStyle = rgba(sh(hc, -.55), .5); x.lineWidth = 1.8; x.stroke(p); }
let SHC = '#ffffff';
function shine(x, p, cx = 500, cy = 330, R = 150, a0 = 1.2, a1 = 1.8) { x.save(); x.clip(p); x.strokeStyle = rgba(SHC, .3); x.lineWidth = 16; x.lineCap = 'round'; x.beginPath(); x.arc(cx, cy, R, PI * a0, PI * a1); x.stroke(); x.strokeStyle = rgba(SHC, .2); x.lineWidth = 6; x.beginPath(); x.arc(cx, cy, R - 16, PI * (a0 + .05), PI * (a1 - .1)); x.stroke(); x.restore(); }
const CAP = E(500, 335, 174, 172);
const BANGS_SWEPT = (() => { const p = P(); p.moveTo(349, 400); p.bezierCurveTo(336, 270, 410, 184, 505, 184); p.bezierCurveTo(600, 184, 664, 262, 652, 400); p.bezierCurveTo(644, 340, 624, 312, 598, 304); p.bezierCurveTo(574, 306, 552, 294, 538, 272); p.bezierCurveTo(506, 318, 440, 342, 384, 332); p.bezierCurveTo(368, 348, 356, 372, 349, 400); p.closePath(); return p; })();
const BANGS_CURT = (() => { const p = P(); p.moveTo(348, 400); p.bezierCurveTo(338, 262, 410, 184, 500, 184); p.bezierCurveTo(590, 184, 662, 262, 652, 400); p.bezierCurveTo(645, 340, 614, 304, 566, 298); p.bezierCurveTo(532, 292, 512, 268, 500, 240); p.bezierCurveTo(488, 268, 468, 292, 434, 298); p.bezierCurveTo(386, 304, 355, 340, 348, 400); p.closePath(); return p; })();
const SLEEK = (() => { const p = P(); p.moveTo(347, 398); p.bezierCurveTo(338, 262, 410, 182, 500, 182); p.bezierCurveTo(590, 182, 662, 262, 653, 398); p.bezierCurveTo(646, 322, 600, 252, 500, 248); p.bezierCurveTo(400, 252, 354, 322, 347, 398); p.closePath(); return p; })();
function scrunchie(x, cx, cy, r, c, rot = 0) { x.save(); x.translate(cx, cy); x.rotate(rot); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, px = Math.cos(a) * r, py = Math.sin(a) * r * .45; x.fillStyle = rad(x, px - 2, py - 3, 0, r * .55, [[0, sh(c, .45)], [.6, c], [1, sh(c, -.35)]]); x.beginPath(); x.ellipse(px, py, r * .45, r * .36, a, 0, TAU); x.fill(); } x.restore(); }
function lock(pts) { return BL(pts); }
const LOCK_L = [[346, 392], [326, 470], [332, 560], [352, 650], [336, 760], [350, 860], [382, 905], [376, 800], [388, 700], [372, 600], [360, 500], [360, 420]];
export const HAIR = {
  long: { top: 184, back(x, hc) { const p = sym([[500, 158], [410, 168], [338, 232], [314, 330], [318, 450], [298, 560], [288, 680], [300, 800], [278, 900], [298, 1000], [350, 1042], [420, 1012], [470, 1035], [500, 1020]]); hairFill(x, p, hc, 160, 1040, 11, 'down', [280, 300, 440, 740]); shine(x, CAP, 500, 340, 160); },
    front(x, hc) { hairFill(x, BANGS_SWEPT, hc, 184, 400, 3, 'rad'); shine(x, BANGS_SWEPT, 500, 350, 150, 1.15, 1.7); for (const pts of [LOCK_L, mir(LOCK_L)]) { const p = lock(pts); hairFill(x, p, hc, 390, 905, 5, 'down', [330, 380, 340, 530]); } } },
  pony: { top: 182, back(x, hc) { hairFill(x, CAP, hc, 160, 500, 2, 'rad'); const t = BL([[560, 182], [630, 130], [712, 160], [742, 262], [728, 400], [706, 520], [728, 640], [700, 760], [656, 806], [666, 700], [646, 580], [656, 452], [644, 322], [600, 236]]); hairFill(x, t, hc, 130, 800, 21, 'down', [600, 150, 160, 650]); shine(x, t, 640, 360, 110, 1.6, 2.1); },
    front(x, hc, L) { const b = P(); b.addPath(BANGS_SWEPT, new DOMMatrix().translate(1000, 0).scale(-1, 1)); hairFill(x, b, hc, 182, 398, 4, 'rad'); shine(x, b, 500, 345, 150, 1.3, 1.85); scrunchie(x, 586, 186, 26, L.cc, -.6); } },
  pig: { top: 184, back(x, hc) { hairFill(x, CAP, hc, 160, 500, 6, 'rad'); for (const s of [-1, 1]) { const pts = [[352, 312], [290, 300], [246, 360], [250, 470], [228, 580], [244, 690], [276, 760], [296, 690], [290, 590], [318, 480], [330, 380]]; const t = BL(s < 0 ? pts : mir(pts)); hairFill(x, t, hc, 300, 760, 30 + s, 'down', [s < 0 ? 220 : 650, 300, 130, 460]); shine(x, t, 500 + s * 210, 420, 70, s < 0 ? 1.1 : 1.6, s < 0 ? 1.45 : 1.9); } shine(x, CAP, 500, 340, 160); },
    front(x, hc, L) { hairFill(x, BANGS_CURT, hc, 184, 400, 8, 'rad'); shine(x, BANGS_CURT, 500, 345, 150); scrunchie(x, 344, 316, 24, L.cc, .9); scrunchie(x, 656, 316, 24, L.cc, -.9); } },
  bun: { top: 182, back(x, hc) { hairFill(x, CAP, hc, 160, 500, 9, 'rad'); },
    front(x, hc, L) { const b = E(500, 146, 74, 62); hairFill(x, b, hc, 84, 210, 14, 'down', [420, 84, 160, 130]); x.save(); x.clip(b); x.strokeStyle = rgba(sh(hc, -.4), .5); x.lineWidth = 3; for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(500, 150, 60 - i * 14, 46 - i * 11, .2, PI * .9, PI * 2.4); x.stroke(); } x.restore(); shine(x, b, 500, 160, 52, 1.15, 1.7);
      hairFill(x, SLEEK, hc, 182, 398, 7, 'rad'); shine(x, SLEEK, 500, 340, 150); x.strokeStyle = rgba(L.cc, 1); x.lineWidth = 9; x.lineCap = 'round'; x.beginPath(); x.ellipse(500, 196, 70, 14, 0, PI * 1.08, PI * 1.92); x.stroke();
      x.lineCap = 'round'; for (const [c, w] of [[sh(hc, -.35), 7], [hc, 4.5], [sh(hc, .35), 1.6]]) { x.strokeStyle = c; x.lineWidth = w; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(500 + s * 140, 300); for (let k = 0; k < 4; k++) x.quadraticCurveTo(500 + s * (162 - (k % 2) * 30), 330 + k * 38, 500 + s * 146, 350 + k * 38); x.stroke(); } } } },
  braid: { top: 184, back(x, hc) { const p = sym([[500, 160], [410, 168], [340, 232], [316, 330], [322, 450], [340, 520], [420, 540], [500, 530]]); hairFill(x, p, hc, 160, 540, 17, 'rad'); shine(x, CAP, 500, 340, 160); },
    front(x, hc, L) { hairFill(x, BANGS_SWEPT, hc, 184, 400, 19, 'rad'); shine(x, BANGS_SWEPT, 500, 350, 150, 1.15, 1.7);
      const n = 11; for (let i = 0; i < n; i++) { const t = i / (n - 1), cx = lerp(366, 412, t) + Math.sin(t * 3) * 8, cy = lerp(430, 930, t), w = lerp(40, 22, t); for (const s of [-1, 1]) { const p = E(cx + s * w * .32, cy, w * .55, 30, s * .55); x.fillStyle = lin(x, 0, cy - 30, 0, cy + 30, [[0, sh(hc, .18)], [1, sh(hc, -.32)]]); x.fill(p); x.strokeStyle = rgba(sh(hc, -.55), .55); x.lineWidth = 1.6; x.stroke(p); x.save(); x.clip(p); x.strokeStyle = 'rgba(255,255,255,.2)'; x.lineWidth = 4; x.beginPath(); x.ellipse(cx + s * w * .32, cy - 6, w * .3, 16, s * .55, PI * 1.1, PI * 1.6); x.stroke(); x.restore(); } }
      scrunchie(x, 412, 952, 20, L.cc, 0); const tuft = BL([[404, 962], [390, 1010], [400, 1050], [414, 1020], [428, 1050], [432, 1004], [420, 962]]); hairFill(x, tuft, hc, 960, 1050, 23, 'down', [388, 962, 46, 90]); } },
  curls: { top: 176, back(x, hc) { const pts = [[500, 140], [400, 150], [318, 214], [286, 320], [282, 450], [262, 560], [258, 680], [276, 790], [330, 840], [420, 820], [500, 830]]; const base = sym(pts); const r = rng(41); const all = P(); all.addPath(base); const cs = [];
      const full = [...pts, ...mir(pts.slice(1, -1)).reverse()]; for (let i = 0; i < full.length; i++) { const a = full[i], b = full[(i + 1) % full.length]; for (let k = 0; k < 2; k++) { const t = k / 2, rr = 40 + r() * 14; cs.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t), rr]); } } cs.forEach(([cx, cy, rr]) => all.addPath(E(cx, cy, rr, rr)));
      hairFill(x, all, hc, 130, 860, 41, 'down', [240, 200, 520, 660], 1); x.save(); x.clip(all); for (let i = 0; i < 70; i++) { const cx = 250 + r() * 500, cy = 140 + r() * 700, rr = 12 + r() * 16; x.strokeStyle = rgba(sh(hc, .5), .28); x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, rr, PI * (1 + r() * .3), PI * (1.8 + r() * .3)); x.stroke(); x.strokeStyle = rgba(sh(hc, -.5), .35); x.beginPath(); x.arc(cx + 2, cy + 3, rr, PI * .1, PI * .8); x.stroke(); } x.restore(); shine(x, all, 500, 330, 170); },
    front(x, hc) { const p = P(); p.addPath(BANGS_CURT); const r = rng(5), cs = []; for (let i = 0; i < 13; i++) { const t = i / 12, a = PI * (1.06 + t * .88), cx = 500 + Math.cos(a) * 154, cy = 336 + Math.sin(a) * 146, rr = 22 + r() * 9; cs.push([cx, cy, rr]); p.addPath(E(cx, cy, rr, rr)); }
      hairFill(x, p, hc, 176, 400, 27, 'rad', undefined, 1); x.save(); x.clip(p); cs.forEach(([cx, cy, rr]) => { x.strokeStyle = rgba(sh(hc, .5), .35); x.lineWidth = 2.5; x.beginPath(); x.arc(cx, cy, rr * .6, PI * 1.1, PI * 1.9); x.stroke(); x.strokeStyle = rgba(sh(hc, -.5), .4); x.beginPath(); x.arc(cx, cy + 2, rr * .85, PI * .15, PI * .85); x.stroke(); }); x.restore(); shine(x, p, 500, 345, 150); } },
};

/* ---------- accessories ---------- */
export function drawCrown(x, L, top) { const k = L.crown; if (!k || k === 'none') return; const m = L.metal, g = L.gem, y = top + 18; x.save(); x.lineJoin = 'round';
  if (k === 'classic') { const p = P(); p.moveTo(418, y + 14); [[418, y - 26], [440, y - 4], [462, y - 44], [482, y - 10], [500, y - 62], [518, y - 10], [538, y - 44], [560, y - 4], [582, y - 26], [582, y + 14]].forEach(q => p.lineTo(...q)); p.quadraticCurveTo(500, y + 30, 418, y + 14); p.closePath(); x.fillStyle = metalG(x, 418, y - 60, 582, y + 20, m); x.fill(p); x.strokeStyle = METAL[m][3]; x.lineWidth = 2; x.stroke(p);
    x.fillStyle = metalG(x, 0, y, 0, y + 26, m); const b = P(); b.moveTo(414, y + 4); b.quadraticCurveTo(500, y + 22, 586, y + 4); b.lineTo(586, y + 18); b.quadraticCurveTo(500, y + 36, 414, y + 18); b.closePath(); x.fill(b); x.stroke(b);
    for (const [px, py] of [[418, y - 26], [462, y - 44], [500, y - 62], [538, y - 44], [582, y - 26]]) pearl(x, px, py, 6); gem(x, 500, y + 2, 11, g, 'drop'); gem(x, 460, y + 14, 6, mix(g, '#3ac8ff', .5)); gem(x, 540, y + 14, 6, mix(g, '#3ac8ff', .5)); }
  else if (k === 'tiara' || k === 'heart' || k === 'star') { x.strokeStyle = metalG(x, 400, y - 40, 600, y + 20, m); x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(404, y + 26); x.bezierCurveTo(430, y - 20, 570, y - 20, 596, y + 26); x.stroke();
    x.lineWidth = 3; for (let i = 0; i < 6; i++) { const t = (i + .5) / 6, px = lerp(420, 580, t), py = y + 8 - Math.sin(t * PI) * 26; if (Math.abs(px - 500) < 25) continue; x.beginPath(); x.ellipse(px, py - 10, 7, 12, (px - 500) / 300, 0, TAU); x.stroke(); pearl(x, px, py - 24, 3.5); }
    x.lineWidth = 3.5; x.beginPath(); x.moveTo(470, y - 6); x.quadraticCurveTo(500, y - 70, 530, y - 6); x.stroke();
    if (k === 'heart') gem(x, 500, y - 34, 18, g, 'heart'); else if (k === 'star') { gem(x, 500, y - 36, 17, g, 'star'); sparkle(x, 452, y - 26, 8, METAL[m][0]); sparkle(x, 548, y - 26, 8, METAL[m][0]); } else gem(x, 500, y - 32, 12, g, 'drop'); }
  else if (k === 'flower') { const r = rng(3); for (let i = 0; i < 9; i++) { const t = i / 8, a = PI * (1.12 + t * .76), cx = 500 + Math.cos(a) * 170, cy = 330 + Math.sin(a) * 150; for (const s of [-1, 1]) { x.fillStyle = lin(x, cx, cy, cx + s * 20, cy + 10, [[0, '#5ac86a'], [1, '#2a8a4a']]); x.beginPath(); x.ellipse(cx + s * 18, cy + 6, 14, 6, s * .5 + a, 0, TAU); x.fill(); } const c = i % 2 ? g : mix(g, '#ffffff', .55), rr = 15 + r() * 4; for (let j = 0; j < 5; j++) { const b = j / 5 * TAU + i; x.fillStyle = rad(x, cx, cy, 2, rr, [[0, sh(c, .6)], [1, c]]); x.beginPath(); x.ellipse(cx + Math.cos(b) * rr * .6, cy + Math.sin(b) * rr * .6, rr * .55, rr * .42, b, 0, TAU); x.fill(); } x.fillStyle = metalG(x, cx - 5, cy - 5, cx + 5, cy + 5, m); x.beginPath(); x.arc(cx, cy, 5, 0, TAU); x.fill(); } }
  else if (k === 'ice') { const sp = [[430, 26], [452, 44], [476, 62], [500, 80], [524, 62], [548, 44], [570, 26]]; for (const [px, h] of sp) { const p = PL([[px - 11, y + 12], [px, y + 12 - h], [px + 11, y + 12]]); x.fillStyle = lin(x, px - 11, y - h, px + 11, y, [[0, 'rgba(255,255,255,.95)'], [.5, rgba(mix(g, '#ffffff', .5), .85)], [1, rgba(g, .7)]]); x.fill(p); x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 1.5; x.stroke(p); x.strokeStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.moveTo(px, y + 12 - h); x.lineTo(px, y + 10); x.stroke(); }
    x.strokeStyle = metalG(x, 410, y, 590, y + 20, m); x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); x.moveTo(412, y + 22); x.quadraticCurveTo(500, y + 2, 588, y + 22); x.stroke(); gem(x, 500, y + 10, 9, g); sparkle(x, 500, y - 72, 10); }
  x.restore(); }
export function drawEarrings(x, L) { const k = L.ear; if (!k || k === 'none') return; for (const s of [-1, 1]) { const ex = 500 + s * 152, ey = 452; x.save();
  if (k === 'stud') gem(x, ex, ey, 6.5, L.gem); else if (k === 'pearl') { pearl(x, ex, ey, 6); pearl(x, ex, ey + 18, 9); }
  else if (k === 'hoop') { x.strokeStyle = metalG(x, ex - 16, ey, ex + 16, ey + 30, L.metal); x.lineWidth = 3.5; x.beginPath(); x.arc(ex, ey + 16, 16, 0, TAU); x.stroke(); }
  else if (k === 'drop') { gem(x, ex, ey, 4, L.gem); x.strokeStyle = metalG(x, ex, ey, ex, ey + 20, L.metal); x.lineWidth = 2; x.beginPath(); x.moveTo(ex, ey); x.lineTo(ex, ey + 16); x.stroke(); gem(x, ex, ey + 30, 9, L.gem, 'drop'); }
  else if (k === 'star') { x.fillStyle = metalG(x, ex - 10, ey, ex + 10, ey + 30, L.metal); x.fill(STAR(ex, ey + 16, 13, 6)); gem(x, ex, ey + 16, 4, L.gem); }
  x.restore(); } }
export function drawNecklace(x, L) { const k = L.neck; if (!k || k === 'none') return; x.save();
  const arc = t => [lerp(462, 538, t), 640 + Math.sin(t * PI) * 52];
  if (k === 'choker') { x.fillStyle = L.metal === 'silver' ? '#2a2a3a' : sh(L.gem, -.45); x.beginPath(); x.moveTo(464, 600); x.quadraticCurveTo(500, 616, 536, 600); x.lineTo(536, 612); x.quadraticCurveTo(500, 628, 464, 612); x.closePath(); x.fill(); gem(x, 500, 622, 9, L.gem, 'drop'); }
  else if (k === 'pearls') { for (let i = 0; i <= 16; i++) { const [px, py] = arc(i / 16); pearl(x, px, py, 5.5); } }
  else { x.strokeStyle = metalG(x, 460, 640, 540, 700, L.metal); x.lineWidth = 2.4; x.beginPath(); for (let i = 0; i <= 20; i++) { const [px, py] = arc(i / 20); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
    if (k === 'heart') gem(x, 500, 708, 14, L.gem, 'heart'); else { gem(x, 500, 704, 11, L.gem, 'drop'); const [a1, b1] = arc(.28), [a2, b2] = arc(.72); gem(x, a1, b1 + 6, 6, mix(L.gem, '#ffffff', .3)); gem(x, a2, b2 + 6, 6, mix(L.gem, '#ffffff', .3)); } }
  x.restore(); }
export function drawClip(x, L) { const k = L.clip; if (!k || k === 'none') return; const cx = 616, cy = 238, c = L.cc; x.save();
  if (k === 'bow') { for (const s of [-1, 1]) { const p = P(); p.moveTo(cx, cy); p.bezierCurveTo(cx + s * 20, cy - 40, cx + s * 58, cy - 26, cx + s * 52, cy + 4); p.bezierCurveTo(cx + s * 50, cy + 26, cx + s * 20, cy + 20, cx, cy); x.fillStyle = lin(x, cx, cy - 30, cx + s * 50, cy + 20, [[0, sh(c, .35)], [.5, c], [1, sh(c, -.35)]]); x.fill(p); x.strokeStyle = rgba(sh(c, -.5), .6); x.lineWidth = 1.5; x.stroke(p); const tl = PL([[cx, cy + 4], [cx + s * 22, cy + 50], [cx + s * 10, cy + 46], [cx + s * 4, cy + 56]]); x.fillStyle = sh(c, -.15); x.fill(tl); } x.fillStyle = rad(x, cx - 3, cy - 3, 0, 14, [[0, sh(c, .5)], [1, sh(c, -.2)]]); x.beginPath(); x.ellipse(cx, cy, 11, 13, 0, 0, TAU); x.fill(); }
  else if (k === 'flower') { for (let j = 0; j < 6; j++) { const b = j / 6 * TAU; x.fillStyle = rad(x, cx, cy, 2, 26, [[0, sh(c, .7)], [1, c]]); x.beginPath(); x.ellipse(cx + Math.cos(b) * 15, cy + Math.sin(b) * 15, 15, 10, b, 0, TAU); x.fill(); } gem(x, cx, cy, 8, '#ffd23a'); }
  else if (k === 'butterfly') { for (const s of [-1, 1]) { x.fillStyle = rad(x, cx + s * 14, cy - 10, 2, 26, [[0, sh(c, .6)], [.7, c], [1, sh(c, -.4)]]); x.beginPath(); x.ellipse(cx + s * 16, cy - 10, 18, 14, s * -.5, 0, TAU); x.fill(); x.beginPath(); x.ellipse(cx + s * 12, cy + 12, 11, 9, s * .5, 0, TAU); x.fill(); sparkle(x, cx + s * 18, cy - 12, 4); } x.fillStyle = '#3a2a4a'; x.beginPath(); x.ellipse(cx, cy, 3.5, 16, 0, 0, TAU); x.fill(); }
  else if (k === 'stars') { for (const [dx, dy, r] of [[0, 0, 15], [-26, 22, 10], [22, 30, 9]]) { x.fillStyle = metalG(x, cx + dx - r, cy + dy - r, cx + dx + r, cy + dy + r, L.metal); x.fill(STAR(cx + dx, cy + dy, r, r * .48)); } }
  x.restore(); }

/* ---------- dresses ---------- */
const BODICE = (() => { const p = P(); p.moveTo(372, 714); p.bezierCurveTo(400, 690, 456, 700, 500, 742); p.bezierCurveTo(544, 700, 600, 690, 628, 714); p.bezierCurveTo(632, 782, 592, 842, 566, 890); p.lineTo(500, 908); p.lineTo(434, 890); p.bezierCurveTo(408, 842, 368, 782, 372, 714); p.closePath(); return p; })();
export const DRESS = {
  ball: { sk: [[500, 870], [442, 872], [400, 930], [338, 1040], [268, 1190], [204, 1350], [160, 1490], [172, 1560], [262, 1588], [362, 1576], [440, 1594], [500, 1582]], hem: [175, 825, 1570], puff: 1, sash: 'metal', ruffle: 1 },
  mermaid: { sk: [[500, 870], [444, 872], [430, 960], [428, 1080], [440, 1200], [430, 1280], [380, 1380], [300, 1500], [240, 1578], [330, 1598], [420, 1584], [500, 1598]], hem: [250, 750, 1580], sash: 'gem', flare: 1 },
  tulle: { sk: [[500, 870], [442, 872], [404, 940], [350, 1060], [288, 1220], [232, 1390], [204, 1540], [280, 1580], [380, 1570], [450, 1586], [500, 1576]], hem: [215, 785, 1565], straps: 1, sash: 'white', tiers: 1 },
  cape: { sk: [[500, 870], [442, 872], [412, 950], [362, 1100], [312, 1280], [272, 1450], [252, 1560], [352, 1586], [440, 1576], [500, 1588]], hem: [260, 740, 1570], cape: 1, sash: 'metal' },
  aline: { sk: [[500, 870], [442, 872], [406, 960], [352, 1120], [302, 1300], [264, 1470], [262, 1560], [362, 1582], [440, 1572], [500, 1584]], hem: [270, 730, 1568], sleeves: 1, sash: 'bow' },
  petal: { sk: [[500, 870], [442, 872], [402, 950], [344, 1080], [292, 1240], [248, 1400], [226, 1530], [300, 1570], [400, 1560], [500, 1574]], hem: [235, 765, 1555], petals: 1, sash: 'gem', petalSl: 1 },
};
const dTop = dc => Array.isArray(dc) ? dc[0] : dc, dBot = dc => Array.isArray(dc) ? dc[1] : dc;
function fabric(x, p, dc, y0, y1, xl = 160, xr = 840) { x.fillStyle = lin(x, 0, y0, 0, y1, [[0, sh(dTop(dc), .1)], [.5, mix(dTop(dc), dBot(dc), .5)], [1, sh(dBot(dc), -.08)]]); x.fill(p); x.save(); x.clip(p);
  x.fillStyle = lin(x, xl, 0, xr, 0, [[0, 'rgba(40,0,40,.32)'], [.3, 'rgba(40,0,40,0)'], [.42, 'rgba(255,255,255,.16)'], [.6, 'rgba(255,255,255,0)'], [1, 'rgba(40,0,40,.34)']]); x.fillRect(xl - 40, y0 - 10, xr - xl + 80, y1 - y0 + 20); x.restore(); }
function folds(x, p, sk, hem, n = 14) { x.save(); x.clip(p); x.lineCap = 'round'; for (let i = 0; i <= n; i++) { const t = i / n, x0 = lerp(446, 554, t), x1 = lerp(hem[0], hem[1], t), dk = i % 2; x.strokeStyle = dk ? 'rgba(40,0,40,.13)' : 'rgba(255,255,255,.13)'; x.lineWidth = dk ? 16 : 9; x.beginPath(); x.moveTo(x0, 880); x.bezierCurveTo(x0 + (x1 - x0) * .2, 1050, x1 - (x1 - x0) * .15, hem[2] - 260, x1, hem[2] + 30); x.stroke(); } x.restore(); }
function deco(x, L, p, D) { const k = L.deco, r = rng(77); if (!k || k === 'none') return; x.save(); x.clip(p); const [h0, h1, hy] = D.hem;
  if (k === 'sparkle') { for (let i = 0; i < 120; i++) { const px = lerp(h0, h1, r()), py = 880 + Math.pow(r(), .8) * (hy - 880); sparkle(x, px, py, 2 + r() * 5, '#ffffff', .5 + r() * .5); } }
  else if (k === 'stars') { for (let i = 0; i < 26; i++) { const px = lerp(h0, h1, r()), py = 940 + r() * (hy - 960), s = 8 + r() * 9; x.fillStyle = metalG(x, px - s, py - s, px + s, py + s, L.metal); x.fill(STAR(px, py, s, s * .45, 5, r())); } }
  else if (k === 'roses') { for (let i = 0; i < 11; i++) { const t = i / 10, px = lerp(h0 + 20, h1 - 20, t), py = hy - 30 - Math.sin(t * PI) * 10; rose(x, px, py, 22, sh(dBot(L.dc), -.25)); } }
  else if (k === 'pearls') { for (let i = 0; i < 26; i++) { const t = i / 25; pearl(x, lerp(h0 + 10, h1 - 10, t), hy - 12 - Math.sin(t * PI) * 6, 7); } }
  else if (k === 'lace') { x.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 24; i++) { const t = i / 23, px = lerp(h0, h1, t); x.beginPath(); x.arc(px, hy - 6, 16, 0, PI); x.fill(); x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 2; x.beginPath(); x.arc(px, hy - 30, 9, 0, TAU); x.stroke(); } }
  x.restore(); }
function rose(x, cx, cy, r, c) { x.fillStyle = rad(x, cx, cy, 2, r, [[0, sh(c, -.3)], [.6, c], [1, sh(c, .25)]]); x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); x.strokeStyle = rgba(sh(c, -.5), .7); x.lineWidth = 2; x.beginPath(); for (let a = 0; a < TAU * 2.2; a += .2) { const q = r * (1 - a / (TAU * 2.4)); x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } x.stroke(); }
export function drawCape(x, L) { const D = DRESS[L.dress]; if (!D.cape) return; const p = sym([[500, 640], [384, 662], [300, 760], [222, 1050], [150, 1350], [104, 1610], [300, 1640], [500, 1628]]); const c = mix(dBot(L.dc), '#ffffff', .25); fabric(x, p, [sh(c, -.1), sh(c, -.3)], 640, 1640, 100, 900); folds(x, p, 0, [110, 890, 1600], 10); x.strokeStyle = rgba(sh(c, -.5), .4); x.lineWidth = 2; x.stroke(p); }
export function drawDress(x, L) { const D = DRESS[L.dress], dc = L.dc, top = dTop(dc); const sk = sym(D.sk);
  fabric(x, sk, dc, 870, D.hem[2] + 30, D.hem[0], D.hem[1]); if (!D.petals) folds(x, sk, D.sk, D.hem);
  if (D.tiers) { for (let j = 0; j < 3; j++) { const yb = 1080 + j * 170; const t = BL([[440, 880], [560, 880], [lerp(560, D.hem[1], (yb - 880) / (D.hem[2] - 880)) + 18, yb], [500, yb + 22], [lerp(440, D.hem[0], (yb - 880) / (D.hem[2] - 880)) - 18, yb]]); x.save(); x.clip(sk); x.fillStyle = rgba(sh(mix(top, dBot(dc), j / 3), .4), .28); x.fill(t); x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 2; x.stroke(t); x.restore(); } }
  if (D.petals) { x.save(); x.clip(sk); for (let row = 5; row >= 0; row--) { const y = 920 + row * 120, w = lerp(130, 300, row / 5), n = 4 + row; for (let i = 0; i < n; i++) { const px = lerp(500 - w, 500 + w, (i + .5) / n), c = mix(top, dBot(dc), row / 5); const pp = E(px, y + 60, (w * 2 / n) * .62, 120, (px - 500) / 900); x.fillStyle = lin(x, 0, y - 40, 0, y + 180, [[0, sh(c, -.2)], [.5, c], [1, sh(c, .3)]]); x.fill(pp); x.strokeStyle = rgba(sh(c, -.4), .45); x.lineWidth = 2; x.stroke(pp); } } x.restore(); }
  if (D.ruffle) { x.save(); x.clip(sk); const [h0, h1, hy] = D.hem; for (let i = 0; i < 20; i++) { const t = i / 19, px = lerp(h0 - 10, h1 + 10, t), py = hy - 22 - Math.sin(t * PI) * 8; x.fillStyle = rad(x, px, py - 6, 2, 36, [[0, sh(dBot(dc), .35)], [1, sh(dBot(dc), -.15)]]); x.beginPath(); x.ellipse(px, py, 26, 30, 0, 0, TAU); x.fill(); } x.restore(); }
  deco(x, L, sk, D); x.strokeStyle = rgba(sh(dBot(dc), -.55), .45); x.lineWidth = 2; x.stroke(sk);
  // bodice
  x.fillStyle = lin(x, 0, 690, 0, 908, [[0, sh(top, .18)], [1, sh(top, -.12)]]); x.fill(BODICE); x.save(); x.clip(BODICE); x.fillStyle = lin(x, 370, 0, 630, 0, [[0, 'rgba(40,0,40,.35)'], [.35, 'rgba(255,255,255,.05)'], [.45, 'rgba(255,255,255,.22)'], [.6, 'rgba(255,255,255,0)'], [1, 'rgba(40,0,40,.35)']]); x.fillRect(360, 680, 280, 240);
  x.strokeStyle = rgba(sh(top, -.35), .4); x.lineWidth = 2; for (const xx of [450, 500, 550]) { x.beginPath(); x.moveTo(xx, xx === 500 ? 742 : 716); x.quadraticCurveTo(xx + (xx - 500) * .15, 820, 500 + (xx - 500) * .6, 905); x.stroke(); }
  if (L.deco === 'sparkle') { const r = rng(9); for (let i = 0; i < 26; i++) sparkle(x, 380 + r() * 240, 710 + r() * 190, 2 + r() * 3.5, '#fff', .7); } x.restore(); x.strokeStyle = rgba(sh(top, -.5), .5); x.lineWidth = 2; x.stroke(BODICE);
  if (L.deco === 'pearls' || L.deco === 'lace') { for (let i = 0; i <= 14; i++) { const t = i / 14, q = t < .5 ? bz([372, 714], [400, 690], [456, 700], [500, 742], t * 2) : bz([500, 742], [544, 700], [600, 690], [628, 714], t * 2 - 1); pearl(x, q[0], q[1], 4.5); } }
  // sash
  const sb = P(); sb.moveTo(432, 872); sb.quadraticCurveTo(500, 892, 568, 872); sb.lineTo(566, 892); sb.quadraticCurveTo(500, 914, 434, 892); sb.closePath();
  if (D.sash === 'metal') { x.fillStyle = metalG(x, 430, 870, 570, 910, L.metal); x.fill(sb); gem(x, 500, 896, 10, L.gem); }
  else if (D.sash === 'white') { x.fillStyle = 'rgba(255,255,255,.92)'; x.fill(sb); }
  else if (D.sash === 'gem') { x.fillStyle = sh(top, -.25); x.fill(sb); for (let i = 0; i < 7; i++) gem(x, lerp(446, 554, i / 6), 886 + Math.sin(i / 6 * PI) * 9, 5, L.gem); }
  else if (D.sash === 'bow') { x.fillStyle = sh(top, -.28); x.fill(sb); const c = sh(top, -.12); for (const s of [-1, 1]) { const p = P(); p.moveTo(500, 896); p.bezierCurveTo(500 + s * 30, 850, 500 + s * 78, 866, 500 + s * 64, 900); p.bezierCurveTo(500 + s * 56, 930, 500 + s * 26, 920, 500, 896); x.fillStyle = lin(x, 500, 860, 500 + s * 70, 930, [[0, sh(c, .3)], [1, sh(c, -.25)]]); x.fill(p); const tl = PL([[500, 900], [500 + s * 34, 990], [500 + s * 18, 984], [500 + s * 8, 1000]]); x.fill(tl); } x.fillStyle = sh(c, .15); x.beginPath(); x.ellipse(500, 896, 13, 15, 0, 0, TAU); x.fill(); }
  // sleeves / straps
  if (D.puff || D.sleeves) { for (const s of [-1, 1]) { const cx = 500 + s * (D.puff ? 144 : 148), cy = D.puff ? 712 : 694, p = E(cx, cy, D.puff ? 36 : 33, D.puff ? 28 : 29, s * .3); x.fillStyle = rad(x, cx - s * 8, cy - 10, 4, 44, [[0, sh(top, .45)], [.6, top], [1, sh(top, -.3)]]); x.fill(p); x.strokeStyle = rgba(sh(top, -.45), .5); x.lineWidth = 1.8; x.stroke(p); x.save(); x.clip(p); x.strokeStyle = rgba(sh(top, -.4), .35); for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(cx + i * 12, cy - 40); x.quadraticCurveTo(cx + i * 16, cy, cx + i * 12, cy + 40); x.stroke(); } x.restore(); }
    if (D.puff) { x.strokeStyle = sh(top, .1); x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); x.moveTo(382, 712); x.quadraticCurveTo(500, 740, 618, 712); x.globalAlpha = 0; x.stroke(); x.globalAlpha = 1; } }
  if (D.straps) { x.strokeStyle = sh(top, -.05); x.lineWidth = 7; x.lineCap = 'round'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(500 + s * 104, 708); x.quadraticCurveTo(500 + s * 100, 680, 500 + s * 96, 650); x.stroke(); } }
  if (D.petalSl) { for (const s of [-1, 1]) for (let j = 0; j < 3; j++) { const p = E(500 + s * (128 + j * 12), 700 + j * 8, 18, 30, s * (1.1 + j * .3)); x.fillStyle = lin(x, 0, 670, 0, 740, [[0, sh(top, .35)], [1, sh(top, -.15)]]); x.fill(p); x.strokeStyle = rgba(sh(top, -.4), .45); x.lineWidth = 1.5; x.stroke(p); } } }

/* ---------- full figure ---------- */
export const HEADM = new DOMMatrix().translate(500, 622).scale(1.1).translate(-500, -600);
export function drawFigure(x, L, mk) { const H = HAIR[L.hair];
  drawCape(x, L); x.save(); x.transform(HEADM.a, HEADM.b, HEADM.c, HEADM.d, HEADM.e, HEADM.f); H.back(x, L.hc, L); x.restore(); drawArms(x, L.skin); drawTorso(x, L.skin);
  const skin = L.skin; const nk = P(); nk.rect(469, 560, 62, 92); x.fillStyle = lin(x, 468, 0, 532, 0, [[0, skd(skin, .22)], [.5, skin], [1, skd(skin, .22)]]); x.fill(nk); x.fillStyle = lin(x, 0, 560, 0, 620, [[0, rgba(skd(skin, .55), .4)], [1, rgba(skd(skin, .55), 0)]]); x.fill(nk);
  drawDress(x, L); drawNecklace(x, L); x.save(); x.transform(HEADM.a, HEADM.b, HEADM.c, HEADM.d, HEADM.e, HEADM.f); drawHeadBase(x, L); if (mk) mk(x); else mouthLine(x, L.skin);
  H.front(x, L.hc, L); drawClip(x, L); drawCrown(x, L, H.top); drawEarrings(x, L); x.restore(); }

/* ---------- ballroom ---------- */
export function ballroom(x, w, h) { x.fillStyle = lin(x, 0, 0, 0, h, [[0, '#2a0f4a'], [.55, '#7a2a8a'], [.62, '#c86aa8'], [1, '#5a1a5a']]); x.fillRect(0, 0, w, h);
  const r = rng(4); for (let i = 0; i < 5; i++) { const cx = w * (i + .5) / 5, aw = w / 7, top = h * .12, bot = h * .58; x.fillStyle = lin(x, 0, top, 0, bot, [[0, 'rgba(255,220,255,.26)'], [1, 'rgba(255,180,240,.06)']]); x.beginPath(); x.moveTo(cx - aw / 2, bot); x.lineTo(cx - aw / 2, top + aw / 2); x.arc(cx, top + aw / 2, aw / 2, PI, 0); x.lineTo(cx + aw / 2, bot); x.closePath(); x.fill(); x.strokeStyle = 'rgba(255,230,160,.35)'; x.lineWidth = Math.max(2, w / 300); x.stroke(); }
  x.fillStyle = lin(x, 0, h * .6, 0, h, [[0, 'rgba(255,200,240,.35)'], [1, 'rgba(90,20,90,.2)']]); x.fillRect(0, h * .6, w, h * .4);
  x.fillStyle = rad(x, w / 2, h * .45, 0, h * .55, [[0, 'rgba(255,240,255,.45)'], [1, 'rgba(255,240,255,0)']]); x.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) sparkle(x, r() * w, r() * h * .6, 1 + r() * w / 160, '#fff3c8', .3 + r() * .6);
  x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.ellipse(w / 2, h * .9, w * .36, h * .05, 0, 0, TAU); x.fill(); }
