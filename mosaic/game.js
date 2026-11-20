import { $, clamp, lerp, rng, T, EN, store, audio, toast, ICO, hubButtons, soundButton } from '../lib/kit.js';

const S = store('mosaic-save', { prog: {}, th: {}, done: {} });
const A = audio(S);
const SZ = 1200;
const hex2 = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/* ================= PICTURES (original, drawn in code; unit space 0..1) ================= */
const PI = Math.PI;
const fm = (c, cell, o = {}) => Object.assign({ c, cell }, o);
function ell(x, cx, cy, rx, ry, r = 0, a0 = 0, a1 = PI * 2) { x.beginPath(); x.ellipse(cx, cy, rx, ry, r, a0, a1); x.fill(); }
function cir(x, cx, cy, r) { ell(x, cx, cy, r, r); }
function poly(x, pts) { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill(); }
function rr(x, X, Y, w, h, r) { x.beginPath(); x.roundRect(X, Y, w, h, r); x.fill(); }
function star(x, cx, cy, R, r, n = 5, rot = -PI / 2) { const p = []; for (let i = 0; i < n * 2; i++) { const a = rot + i * PI / n, q = i % 2 ? r : R; p.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } poly(x, p); }
function heart(x, cx, cy, s) { x.beginPath(); x.moveTo(cx, cy + s * .35); x.bezierCurveTo(cx - s * 1.1, cy - s * .35, cx - s * .45, cy - s * 1.05, cx, cy - s * .45); x.bezierCurveTo(cx + s * .45, cy - s * 1.05, cx + s * 1.1, cy - s * .35, cx, cy + s * .35); x.fill(); }
const PICS = [
  { id: 'rose', n: T('ורד', 'Rose'), fam: [fm('#cfe8e0', .085), fm('#3f9a5a', .05), fm('#f06292', .042, { m: 'r' }), fm('#d81b60', .038, { m: 'r' }), fm('#8e0038', .03, { mono: 1 }), fm('#ffe0ea', .06)],
    draw(x, f) { f(0); x.fillRect(0, 0, 1, 1); f(5); for (let i = 0; i < 9; i++) cir(x, (i * .37) % 1, (i * .61 + .1) % 1, .05 + (i % 3) * .02); f(1); x.fillRect(.475, .55, .05, .45); ell(x, .3, .74, .2, .085, -.6); ell(x, .7, .76, .2, .085, .6);
      f(2); for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; cir(x, .5 + Math.cos(a) * .21, .42 + Math.sin(a) * .2, .1); } cir(x, .5, .42, .24); f(3); ell(x, .5, .42, .2, .18); f(2); ell(x, .49, .4, .15, .13, .4); f(3); ell(x, .51, .4, .1, .09, -.5); f(2); ell(x, .5, .41, .06, .055, .3); f(4); cir(x, .5, .41, .03); } },
  { id: 'fly', n: T('פרפר', 'Butterfly'), fam: [fm('#bfe6ff', .085, { m: 'y' }), fm('#ff8f1f', .042, { m: 'r' }), fm('#ffd23a', .035), fm('#5b2a86', .03, { mono: 1 }), fm('#ff5fa2', .035), fm('#6cc04a', .06)],
    draw(x, f) { f(0); x.fillRect(0, 0, 1, 1); f(5); x.fillRect(0, .86, 1, .14); f(4); for (const cx of [.12, .34, .66, .88]) { for (let i = 0; i < 5; i++) cir(x, cx + Math.cos(i * 1.26) * .035, .86 + Math.sin(i * 1.26) * .035, .028); } f(2); for (const cx of [.12, .34, .66, .88]) cir(x, cx, .86, .02);
      f(1); ell(x, .32, .37, .21, .15, -.5); ell(x, .68, .37, .21, .15, .5); ell(x, .37, .6, .14, .11, .4); ell(x, .63, .6, .14, .11, -.4);
      f(2); cir(x, .28, .34, .07); cir(x, .72, .34, .07); cir(x, .36, .62, .05); cir(x, .64, .62, .05); f(4); cir(x, .2, .42, .03); cir(x, .8, .42, .03);
      f(3); ell(x, .5, .5, .035, .2); cir(x, .5, .28, .045); x.save(); x.translate(.5, .26); for (const s of [-1, 1]) { x.save(); x.rotate(s * .45); x.fillRect(-.006, -.16, .012, .14); cir(x, 0, -.165, .018); x.restore(); } x.restore(); } },
  { id: 'balloon', n: T('כדור פורח', 'Hot-air balloon'), fam: [fm('#8fd3ff', .09, { m: 'y' }), fm('#f4f9ff', .05), fm('#7ccf5a', .07), fm('#2e8b57', .07), fm('#e8442a', .04, { m: 'r' }), fm('#ffc400', .04, { m: 'r' }), fm('#8a5a2c', .03, { mono: 1 }), fm('#3a7bd5', .04, { m: 'r' })],
    draw(x, f) { f(0); x.fillRect(0, 0, 1, 1); f(1); for (const [a, b, s] of [[.18, .2, 1], [.82, .14, .8], [.75, .55, .7]]) { ell(x, a, b, .12 * s, .05 * s); cir(x, a - .05 * s, b - .02 * s, .045 * s); cir(x, a + .04 * s, b - .03 * s, .055 * s); }
      f(2); ell(x, .25, 1.05, .6, .3); f(3); ell(x, .85, 1.1, .6, .34);
      x.save(); x.beginPath(); x.ellipse(.5, .37, .25, .27, 0, 0, PI * 2); x.moveTo(.27, .48); x.lineTo(.44, .7); x.lineTo(.56, .7); x.lineTo(.73, .48); x.closePath(); x.clip(); const cs = [4, 5, 7]; for (let i = 0; i < 7; i++) { f(cs[i % 3]); x.fillRect(.25 + i * .072, 0, .072, 1); } x.restore();
      f(6); x.fillRect(.445, .7, .006, .05); x.fillRect(.55, .7, .006, .05); rr(x, .44, .745, .12, .07, .015); } },
  { id: 'sunset', n: T('שקיעה בים', 'Sunset sail'), fam: [fm('#ff9a5a', .07, { m: 'y' }), fm('#ffe066', .04, { m: 'r' }), fm('#2a7fc0', .06, { m: 'y' }), fm('#f6f2e8', .04), fm('#8a3a1a', .03, { mono: 1 }), fm('#4a3a6a', .05), fm('#ff6f91', .06)],
    draw(x, f) { f(6); x.fillRect(0, 0, 1, .3); f(0); x.fillRect(0, .3, 1, .4); f(6); for (const [a, b] of [[.2, .18], [.75, .25]]) ell(x, a, b, .16, .03); f(1); cir(x, .5, .62, .17); f(2); x.fillRect(0, .62, 1, .38); f(1); for (let i = 0; i < 5; i++) x.fillRect(.5 - (.16 - i * .025), .66 + i * .05, (.16 - i * .025) * 2, .012);
      f(5); ell(x, .12, .63, .2, .05, 0, PI, PI * 2); f(4); poly(x, [[.56, .76], [.86, .76], [.81, .82], [.6, .82]]); x.fillRect(.705, .46, .01, .3); f(3); poly(x, [[.69, .48], [.69, .74], [.57, .74]]); poly(x, [[.725, .46], [.725, .74], [.85, .74]]); } },
  { id: 'fish', n: T('דג טרופי', 'Tropical fish'), fam: [fm('#3fa9f5', .085, { m: 'y' }), fm('#f3d08a', .06), fm('#3aa65a', .04), fm('#ff7a1a', .04, { m: 'r' }), fm('#fbfbfb', .035, { mono: 1 }), fm('#ff4a1a', .035), fm('#222831', .02, { mono: 1 }), fm('#cfefff', .03, { mono: 1 }), fm('#ff9ad5', .04)],
    draw(x, f) { f(0); x.fillRect(0, 0, 1, 1); f(1); ell(x, .5, 1.02, .7, .14); f(2); for (const [cx, h] of [[.1, .45], [.2, .32], [.86, .42], [.94, .3]]) { x.beginPath(); x.moveTo(cx - .03, .95); for (let i = 0; i <= 10; i++) x.lineTo(cx + Math.sin(i * .9) * .025 - .015, .95 - h * i / 10); for (let i = 10; i >= 0; i--) x.lineTo(cx + Math.sin(i * .9) * .025 + .015, .95 - h * i / 10); x.closePath(); x.fill(); }
      f(8); for (const [a, b] of [[.62, .9], [.7, .92], [.32, .92]]) { for (let i = 0; i < 6; i++) ell(x, a + Math.cos(i) * .02, b - .02 + Math.sin(i) * .01, .02, .045, i * .5); }
      f(5); poly(x, [[.7, .47], [.92, .29], [.88, .47], [.92, .65]]); poly(x, [[.4, .33], [.5, .22], [.62, .34]]); poly(x, [[.45, .6], [.52, .7], [.58, .6]]);
      f(3); ell(x, .47, .47, .27, .16); x.save(); x.beginPath(); x.ellipse(.47, .47, .27, .16, 0, 0, PI * 2); x.clip(); f(4); x.fillRect(.33, 0, .05, 1); x.fillRect(.52, 0, .05, 1); x.restore();
      f(4); cir(x, .3, .43, .035); f(6); cir(x, .3, .43, .018); f(7); for (const [a, b, r] of [[.22, .3, .025], [.18, .2, .018], [.24, .12, .013], [.8, .14, .02]]) cir(x, a, b, r); } },
  { id: 'cat', n: T('חתלתול', 'Kitty'), fam: [fm('#b39ddb', .085), fm('#ffb74d', .045, { m: 'r' }), fm('#f48fb1', .035), fm('#fff3e0', .035), fm('#66bb6a', .03, { m: 'r' }), fm('#263238', .02, { mono: 1 }), fm('#ec407a', .02, { mono: 1 }), fm('#f57c00', .035), fm('#ffd1e8', .05)],
    draw(x, f) { f(0); x.fillRect(0, 0, 1, 1); f(8); for (let i = 0; i < 8; i++) { heart(x, (i * .29 + .08) % 1, (i * .47 + .1) % .95, .05); }
      f(1); poly(x, [[.2, .45], [.25, .12], [.45, .32]]); poly(x, [[.8, .45], [.75, .12], [.55, .32]]); f(2); poly(x, [[.25, .38], [.27, .2], [.38, .32]]); poly(x, [[.75, .38], [.73, .2], [.62, .32]]);
      f(1); ell(x, .5, .55, .34, .29); f(7); poly(x, [[.47, .27], [.5, .37], [.53, .27]]); poly(x, [[.4, .29], [.45, .36], [.44, .28]]); poly(x, [[.6, .29], [.55, .36], [.56, .28]]);
      f(3); cir(x, .44, .67, .09); cir(x, .56, .67, .09); f(4); ell(x, .37, .51, .07, .08); ell(x, .63, .51, .07, .08); f(5); ell(x, .37, .52, .028, .06); ell(x, .63, .52, .028, .06); f(6); poly(x, [[.47, .6], [.53, .6], [.5, .64]]); } },
  { id: 'mush', n: T('בית פטרייה', 'Mushroom house'), fam: [fm('#a5e3ff', .09, { m: 'y' }), fm('#7ccf4a', .06), fm('#e53935', .045, { m: 'r' }), fm('#ffffff', .03, { mono: 1 }), fm('#fff1d6', .04), fm('#8d5524', .03), fm('#ffd54f', .03, { mono: 1 }), fm('#ff80ab', .03)],
    draw(x, f) { f(0); x.fillRect(0, 0, 1, 1); f(1); x.fillRect(0, .8, 1, .2); ell(x, .5, .82, .7, .06); f(4); rr(x, .33, .45, .34, .37, .04); f(2); x.beginPath(); x.ellipse(.5, .48, .38, .3, 0, PI, PI * 2); x.closePath(); x.fill();
      f(3); for (const [a, b, r] of [[.33, .36, .045], [.5, .28, .06], [.66, .37, .05], [.42, .44, .03], [.58, .45, .03], [.22, .45, .025], [.78, .45, .025]]) cir(x, a, b, r);
      f(5); x.beginPath(); x.moveTo(.44, .82); x.lineTo(.44, .66); x.arc(.5, .66, .06, PI, 0); x.lineTo(.56, .82); x.closePath(); x.fill(); f(6); cir(x, .39, .58, .03); cir(x, .61, .58, .03);
      f(7); for (const cx of [.12, .22, .8, .9]) { for (let i = 0; i < 5; i++) cir(x, cx + Math.cos(i * 1.26) * .022, .88 + Math.sin(i * 1.26) * .022, .018); } f(6); for (const cx of [.12, .22, .8, .9]) cir(x, cx, .88, .012); } },
  { id: 'light', n: T('מגדלור', 'Lighthouse'), fam: [fm('#9ad0f5', .09, { m: 'y' }), fm('#1e88e5', .06, { m: 'y' }), fm('#78909c', .05), fm('#fafafa', .04), fm('#e53935', .04), fm('#37474f', .03, { mono: 1 }), fm('#ffeb3b', .03, { mono: 1 }), fm('#ffffff', .05)],
    draw(x, f) { f(0); x.fillRect(0, 0, 1, 1); f(7); for (const [a, b, s] of [[.2, .2, 1], [.8, .12, .8]]) { ell(x, a, b, .12 * s, .045 * s); cir(x, a, b - .03 * s, .05 * s); } f(1); x.fillRect(0, .76, 1, .24);
      x.save(); x.beginPath(); x.moveTo(.42, .26); x.lineTo(.58, .26); x.lineTo(.63, .82); x.lineTo(.37, .82); x.closePath(); x.clip(); for (let i = 0; i < 6; i++) { f(i % 2 ? 3 : 4); x.fillRect(0, .26 + i * .1, 1, .1); } x.restore();
      f(5); x.fillRect(.4, .245, .2, .03); rr(x, .43, .15, .14, .1, .01); f(6); x.fillRect(.45, .165, .1, .07); f(5); x.beginPath(); x.arc(.5, .15, .07, PI, 0); x.closePath(); x.fill(); f(6); poly(x, [[.57, .2], [.95, .1], [.95, .3]]); poly(x, [[.43, .2], [.05, .1], [.05, .3]]);
      f(2); ell(x, .5, .86, .32, .09); ell(x, .2, .9, .2, .08); ell(x, .84, .9, .18, .07); } },
  { id: 'rocket', n: T('טיל לחלל', 'Space rocket'), fam: [fm('#1a237e', .08, { m: 'r' }), fm('#ff7043', .05, { m: 'r' }), fm('#26c6da', .05, { m: 'r' }), fm('#ffd54f', .03), fm('#eceff1', .04), fm('#e53935', .035), fm('#4fc3f7', .03, { mono: 1 }), fm('#ffb300', .035), fm('#fff59d', .02, { mono: 1 })],
    draw(x, f) { f(0); x.fillRect(0, 0, 1, 1); f(8); const r = rng(9); for (let i = 0; i < 16; i++) star(x, r(), r(), .022, .009, 4); f(1); cir(x, .2, .24, .13); f(2); cir(x, .8, .76, .12); f(3); x.strokeStyle = x.fillStyle; x.lineWidth = .022; x.beginPath(); x.ellipse(.8, .76, .21, .055, -.3, 0, PI * 2); x.stroke();
      x.save(); x.translate(.5, .5); x.rotate(.55); f(7); poly(x, [[-.06, .2], [0, .4], [.06, .2]]); f(5); poly(x, [[-.07, .06], [-.15, .22], [-.07, .18]]); poly(x, [[.07, .06], [.15, .22], [.07, .18]]); f(4); x.beginPath(); x.moveTo(-.075, .2); x.lineTo(-.075, -.1); x.quadraticCurveTo(-.07, -.28, 0, -.36); x.quadraticCurveTo(.07, -.28, .075, -.1); x.lineTo(.075, .2); x.closePath(); x.fill();
      f(5); x.beginPath(); x.moveTo(-.06, -.2); x.quadraticCurveTo(-.04, -.3, 0, -.36); x.quadraticCurveTo(.04, -.3, .06, -.2); x.closePath(); x.fill(); f(5); x.fillRect(-.075, .12, .15, .03); f(6); cir(x, 0, -.06, .04); x.restore(); } },
  { id: 'owl', n: T('ינשוף', 'Night owl'), fam: [fm('#283593', .09, { m: 'r' }), fm('#fff59d', .05, { m: 'r' }), fm('#6d4c41', .04), fm('#43a047', .04), fm('#8d6e63', .04, { m: 'r' }), fm('#d7ccc8', .035), fm('#ffffff', .03, { mono: 1 }), fm('#ffca28', .025, { mono: 1 }), fm('#ff8f00', .02, { mono: 1 }), fm('#1b1b2f', .02, { mono: 1 })],
    draw(x, f) { f(0); x.fillRect(0, 0, 1, 1); f(1); cir(x, .78, .2, .12); f(7); const r = rng(4); for (let i = 0; i < 10; i++) star(x, r() * .6, r() * .5, .018, .007, 4); f(2); poly(x, [[0, .78], [1, .7], [1, .76], [0, .85]]);
      f(3); for (const [a, b, ro] of [[.1, .76, -.5], [.25, .73, .6], [.82, .68, -.6], [.94, .66, .5]]) ell(x, a, b, .07, .03, ro);
      f(4); poly(x, [[.33, .25], [.38, .1], [.45, .22]]); poly(x, [[.67, .25], [.62, .1], [.55, .22]]); ell(x, .5, .5, .22, .28); f(5); ell(x, .5, .58, .14, .17);
      f(4); ell(x, .3, .52, .07, .17, .25); ell(x, .7, .52, .07, .17, -.25); f(6); cir(x, .41, .37, .085); cir(x, .59, .37, .085); f(7); cir(x, .41, .37, .05); cir(x, .59, .37, .05); f(9); cir(x, .41, .37, .025); cir(x, .59, .37, .025); f(8); poly(x, [[.47, .44], [.53, .44], [.5, .5]]); poly(x, [[.42, .76], [.46, .8], [.38, .8]]); poly(x, [[.58, .76], [.62, .8], [.54, .8]]); } },
  { id: 'hearts', n: T('לבבות', 'Love balloons'), fam: [fm('#fce4ec', .08), fm('#e91e63', .045, { m: 'r' }), fm('#ab47bc', .045, { m: 'r' }), fm('#ff7043', .045, { m: 'r' }), fm('#90a4ae', .02, { mono: 1 }), fm('#ffd54f', .03, { mono: 1 }), fm('#4dd0e1', .045, { m: 'r' })],
    draw(x, f) { f(0); x.fillRect(0, 0, 1, 1); f(5); const r = rng(3); for (let i = 0; i < 12; i++) star(x, r(), r(), .025, .01, 4); f(4); for (const [a, b] of [[.3, .45], [.52, .38], [.72, .48], [.45, .58]]) { x.save(); x.lineWidth = .012; x.strokeStyle = x.fillStyle; x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo(a + .05, (b + .95) / 2, .5, .95); x.stroke(); x.restore(); }
      f(1); heart(x, .3, .34, .17); f(2); heart(x, .53, .27, .19); f(3); heart(x, .74, .38, .15); f(6); heart(x, .45, .52, .12); } },
  { id: 'tulip', n: T('שדה צבעונים', 'Tulip field'), fam: [fm('#bbdefb', .09, { m: 'y' }), fm('#81c784', .07, { m: 'y' }), fm('#e53935', .035), fm('#fdd835', .035), fm('#ec407a', .035), fm('#2e7d32', .03), fm('#8d6e63', .04), fm('#eeeeee', .03), fm('#ffee58', .04, { m: 'r' })],
    draw(x, f) { f(0); x.fillRect(0, 0, 1, 1); f(8); cir(x, .15, .15, .09); f(1); ell(x, .3, .62, .7, .12); ell(x, .9, .64, .5, .1); x.fillRect(0, .62, 1, .4);
      f(6); poly(x, [[.73, .58], [.77, .3], [.83, .3], [.87, .58]]); x.beginPath(); x.arc(.8, .3, .03, PI, 0); x.fill(); f(7); x.save(); x.translate(.8, .3); for (let i = 0; i < 4; i++) { x.save(); x.rotate(i * PI / 2 + .3); x.fillRect(-.012, -.2, .024, .18); x.restore(); } x.restore();
      for (let i = 0; i < 9; i++) { const cx = .07 + i * .107, cy = .7 + (i % 2) * .1, s = .9 + (i % 3) * .1; f(5); x.fillRect(cx - .006, cy, .012, .3); ell(x, cx + .03, cy + .14, .04 * s, .015, -.6); f(2 + i % 3); x.beginPath(); x.moveTo(cx - .04 * s, cy - .07 * s); x.lineTo(cx - .02 * s, cy - .03 * s); x.lineTo(cx, cy - .08 * s); x.lineTo(cx + .02 * s, cy - .03 * s); x.lineTo(cx + .04 * s, cy - .07 * s); x.quadraticCurveTo(cx + .045 * s, cy + .02, cx, cy + .015); x.quadraticCurveTo(cx - .045 * s, cy + .02, cx - .04 * s, cy - .07 * s); x.fill(); } } },
];
const LVL = { rose: 1, fly: 1, balloon: 1, cat: 2, mush: 2, sunset: 2, fish: 2, hearts: 1, light: 3, rocket: 3, owl: 3, tulip: 3 };
const DENS = { 1: 1.75, 2: 1.42, 3: 1.18 }; const densOf = p => DENS[LVL[p.id]];

/* ================= GENERATOR ================= */
function gen(pic, W, dens = 1) {
  const c = document.createElement('canvas'); c.width = c.height = W; const x = c.getContext('2d', { willReadFrequently: true });
  const nf = pic.fam.length; const f = i => { x.fillStyle = `rgb(${i * 12 + 12},0,0)`; };
  x.save(); x.scale(W, W); pic.draw(x, f); x.restore();
  const d = x.getImageData(0, 0, W, W).data, N = W * W, fam = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const v = (d[i * 4] - 12) / 12, k = Math.round(v); fam[i] = Math.abs(v - k) < .08 && k >= 0 && k < nf ? k : 255; }
  for (let i = 0; i < N; i++) if (fam[i] === 255) fam[i] = i % W ? fam[i - 1] : i >= W ? fam[i - W] : 0;
  // voronoi per family on jittered grids
  const r = rng(pic.id.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0); const grids = []; let off = 0;
  for (let k = 0; k < nf; k++) { const cs = pic.fam[k].cell * W * dens, gw = Math.ceil(W / cs) + 1; const sx = new Float32Array(gw * gw), sy = new Float32Array(gw * gw); for (let j = 0; j < gw; j++) for (let i = 0; i < gw; i++) { sx[j * gw + i] = (i + .12 + .76 * r()) * cs; sy[j * gw + i] = (j + .12 + .76 * r()) * cs; } grids.push({ cs, gw, sx, sy, off }); off += gw * gw; }
  const cell = new Int32Array(N);
  for (let y = 0; y < W; y++) for (let X = 0; X < W; X++) { const i = y * W + X, g = grids[fam[i]]; const gx = Math.floor(X / g.cs), gy = Math.floor(y / g.cs); let best = 1e18, bi = 0;
    for (let jy = Math.max(0, gy - 1); jy <= Math.min(g.gw - 1, gy + 1); jy++) for (let jx = Math.max(0, gx - 1); jx <= Math.min(g.gw - 1, gx + 1); jx++) { const s = jy * g.gw + jx, dx = g.sx[s] - X, dy = g.sy[s] - y, dd = dx * dx + dy * dy; if (dd < best) { best = dd; bi = s; } } cell[i] = g.off + bi; }
  // connected components
  const comp = new Int32Array(N).fill(-1), stack = new Int32Array(N); let nc = 0; const cSize = [], cFam = [];
  for (let i = 0; i < N; i++) { if (comp[i] >= 0) continue; const L = cell[i]; let sp = 0; stack[sp++] = i; comp[i] = nc; let cnt = 0;
    while (sp) { const p = stack[--sp]; cnt++; const px = p % W; if (px > 0 && comp[p - 1] < 0 && cell[p - 1] === L) { comp[p - 1] = nc; stack[sp++] = p - 1; } if (px < W - 1 && comp[p + 1] < 0 && cell[p + 1] === L) { comp[p + 1] = nc; stack[sp++] = p + 1; } if (p >= W && comp[p - W] < 0 && cell[p - W] === L) { comp[p - W] = nc; stack[sp++] = p - W; } if (p < N - W && comp[p + W] < 0 && cell[p + W] === L) { comp[p + W] = nc; stack[sp++] = p + W; } }
    cSize.push(cnt); cFam.push(fam[i]); nc++; }
  // merge tiny components into strongest neighbour
  const minPx = N * .00016; const parent = new Int32Array(nc); for (let i = 0; i < nc; i++) parent[i] = i; const nb = new Map();
  for (let i = 0; i < N; i++) { const a = comp[i]; const px = i % W; for (const j of [px < W - 1 ? i + 1 : -1, i < N - W ? i + W : -1]) { if (j < 0) continue; const b = comp[j]; if (a === b) continue; for (const [s, o] of [[a, b], [b, a]]) if (cSize[s] < minPx) { let m = nb.get(s); if (!m) nb.set(s, m = new Map()); m.set(o, (m.get(o) || 0) + 1); } } }
  const order = [...nb.keys()].sort((a, b) => cSize[a] - cSize[b]); const find = a => { while (parent[a] !== a) a = parent[a] = parent[parent[a]]; return a; };
  for (const s of order) { let bo = -1, bc = -1; for (const [o, cnt] of nb.get(s)) { const sc = cnt + (cFam[o] === cFam[s] ? 1000 : 0); if (sc > bc) { bc = sc; bo = o; } } if (bo >= 0) { const ra = find(s), rb = find(bo); if (ra !== rb) { parent[ra] = rb; cSize[rb] += cSize[ra]; } } }
  const remap = new Int32Array(nc).fill(-1); let R = 0; for (let i = 0; i < nc; i++) { const ro = find(i); if (remap[ro] < 0) remap[ro] = R++; remap[i] = remap[ro]; }
  const label = new Int32Array(N); for (let i = 0; i < N; i++) label[i] = remap[comp[i]];
  // region stats
  const cnt = new Int32Array(R), sx = new Float64Array(R), sy = new Float64Array(R), rf = new Int32Array(R).fill(-1), bx0 = new Int32Array(R).fill(W), by0 = new Int32Array(R).fill(W), bx1 = new Int32Array(R), by1 = new Int32Array(R);
  const famCnt = new Map();
  for (let i = 0; i < N; i++) { const l = label[i], X = i % W, y = (i / W) | 0; cnt[l]++; sx[l] += X; sy[l] += y; if (X < bx0[l]) bx0[l] = X; if (X > bx1[l]) bx1[l] = X; if (y < by0[l]) by0[l] = y; if (y > by1[l]) by1[l] = y; const key = l * 64 + fam[i]; famCnt.set(key, (famCnt.get(key) || 0) + 1); }
  for (const [key, v] of famCnt) { const l = Math.floor(key / 64), fa = key % 64; if (rf[l] < 0 || v > (famCnt.get(l * 64 + rf[l]) || 0)) rf[l] = fa; }
  // family bbox for shading
  const fb = pic.fam.map(() => [1, 1, 0, 0]); for (let l = 0; l < R; l++) { const b = fb[rf[l]], cx = sx[l] / cnt[l] / W, cy = sy[l] / cnt[l] / W; b[0] = Math.min(b[0], cx); b[1] = Math.min(b[1], cy); b[2] = Math.max(b[2], cx); b[3] = Math.max(b[3], cy); }
  const keys = new Map(), regs = [];
  for (let l = 0; l < R; l++) { const fa = rf[l], F = pic.fam[fa], cx = sx[l] / cnt[l] / W, cy = sy[l] / cnt[l] / W, b = fb[fa]; let sh = 1;
    if (!F.mono) { let t; const rn = (Math.sin(l * 12.9898 + fa * 78.233) * 43758.5453) % 1; const n = Math.abs(rn) - .5;
      if (F.m === 'y') t = (cy - b[1]) / Math.max(.01, b[3] - b[1]) + n * .35; else if (F.m === 'r') { const mx = (b[0] + b[2]) / 2, my = (b[1] + b[3]) / 2, rad = Math.max(.02, Math.max(b[2] - b[0], b[3] - b[1]) / 2); t = Math.hypot(cx - mx + rad * .25, cy - my + rad * .25) / rad + n * .3; } else t = .5 + .45 * Math.sin(cx * 9 + cy * 5.5 + fa) + n * .55;
      sh = t < .36 ? 0 : t < .7 ? 1 : 2; }
    const key = fa * 3 + sh; if (!keys.has(key)) keys.set(key, 0); regs.push({ key, n: cnt[l], cx: sx[l] / cnt[l], cy: sy[l] / cnt[l], b: [bx0[l], by0[l], bx1[l], by1[l]] }); }
  const pk = [...keys.keys()].sort((a, b) => a - b); const pal = pk.map(k => { const base = hex2(pic.fam[Math.floor(k / 3)].c), s = k % 3; const lu = base[0] * .3 + base[1] * .59 + base[2] * .11; const rgb = s === 0 ? mix(base, [255, 255, 255], lu > 200 ? .45 : .3) : s === 2 ? mix(base, [0, 0, 0], lu > 200 ? .09 : lu > 150 ? .14 : .2) : base; return { rgb, hex: '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join(''), dark: (rgb[0] * .3 + rgb[1] * .59 + rgb[2] * .11) < 130 }; });
  pk.forEach((k, i) => keys.set(k, i)); regs.forEach(g => g.col = keys.get(g.key));
  return { W, N, R, label, fam, regs, pal };
}
function finishGen(G) { // pixel lists, distance labels, lines
  const { W, N, R, label, regs } = G; const off = new Int32Array(R + 1); for (const g of regs) { } const cnt = new Int32Array(R); for (let i = 0; i < N; i++) cnt[label[i]]++; for (let l = 0; l < R; l++) off[l + 1] = off[l] + cnt[l];
  const pix = new Int32Array(N), fillp = off.slice(0, R); for (let i = 0; i < N; i++) pix[fillp[label[i]]++] = i; G.off = off; G.pix = pix;
  const dist = new Uint16Array(N); const INF = 60000;
  for (let i = 0; i < N; i++) { const l = label[i], X = i % W; const edge = X === 0 || X === W - 1 || i < W || i >= N - W || label[i - 1] !== l || label[i + 1] !== l || label[i - W] !== l || label[i + W] !== l; dist[i] = edge ? 0 : INF; }
  for (let y = 1; y < W; y++) for (let X = 1; X < W - 1; X++) { const i = y * W + X; let v = dist[i]; if (!v) continue; v = Math.min(v, dist[i - 1] + 3, dist[i - W] + 3, dist[i - W - 1] + 4, dist[i - W + 1] + 4); dist[i] = v; }
  for (let y = W - 2; y >= 0; y--) for (let X = W - 2; X > 0; X--) { const i = y * W + X; let v = dist[i]; if (!v) continue; v = Math.min(v, dist[i + 1] + 3, dist[i + W] + 3, dist[i + W + 1] + 4, dist[i + W - 1] + 4); dist[i] = v; }
  for (const g of regs) { g.ld = 0; g.lx = g.cx; g.ly = g.cy; }
  for (let i = 0; i < N; i++) { const g = regs[label[i]], d = dist[i] / 3; if (d > g.ld) { g.ld = d; g.lx = i % W; g.ly = (i / W) | 0; } }
  const lc = document.createElement('canvas'); lc.width = lc.height = W; const lx = lc.getContext('2d'); const id = lx.createImageData(W, W), ld = id.data;
  for (let i = 0; i < N; i++) { const l = label[i], X = i % W; const r1 = X < W - 1 && label[i + 1] !== l, d1 = i < N - W && label[i + W] !== l; if (r1 || d1) { const strong = (r1 && G.fam[i] !== G.fam[i + 1]) || (d1 && G.fam[i] !== G.fam[i + W]); const k = i * 4; ld[k] = 70; ld[k + 1] = 64; ld[k + 2] = 86; ld[k + 3] = strong ? 235 : 150; } }
  lx.putImageData(id, 0, 0); G.lines = lc; return G;
}

/* ================= GALLERY ================= */
const prev = {};
function preview(pic) { if (prev[pic.id]) return prev[pic.id]; const W = 200; const G = gen(pic, W, densOf(pic)); const c = document.createElement('canvas'); c.width = c.height = W; const x = c.getContext('2d'); const im = x.createImageData(W, W);
  for (let i = 0; i < G.N; i++) { const p = G.pal[G.regs[G.label[i]].col].rgb, k = i * 4; const g = (p[0] + p[1] + p[2]) / 3; im.data[k] = lerp(g, 250, .55); im.data[k + 1] = lerp(g, 250, .55); im.data[k + 2] = lerp(g, 252, .55); im.data[k + 3] = 255;
    const l = G.label[i]; if ((i % W < W - 1 && G.label[i + 1] !== l) || (i < G.N - W && G.label[i + W] !== l)) { im.data[k] = im.data[k + 1] = 150; im.data[k + 2] = 165; } }
  x.putImageData(im, 0, 0); return prev[pic.id] = c.toDataURL(); }
function renderGal() { $('gal').innerHTML = PICS.map((p, i) => { const pr = S.prog[p.id] || [], tot = S.th[p.id + '_n'] || 0, done = S.done[p.id]; const pct = tot ? Math.round(pr.length / tot * 100) : 0;
  return `<button class="pc" data-i="${i}"><img src="${S.th[p.id] || ''}" data-p="${p.id}" alt=""><span class="lv">${'★'.repeat(LVL[p.id])}</span>${done ? `<span class="ok">✓ ${T('הושלם', 'Done')}</span>` : ''}<b>${p.n}</b><small>${done ? T('לחצו לצפייה', 'Tap to view') : pr.length ? pct + '% ' + T('צבוע', 'colored') : T('חדש!', 'New!')}</small><div class="pb"><i style="width:${done ? 100 : pct}%"></i></div></button>`; }).join('');
  let k = 0; const imgs = [...$('gal').querySelectorAll('img')].filter(im => !im.getAttribute('src')); const step = () => { const im = imgs[k++]; if (!im) return; im.src = preview(PICS.find(p => p.id === im.dataset.p)); setTimeout(step, 0); }; setTimeout(step, 30); }
$('gal').onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; A.ac(); A.tone(660, .06, 'triangle', .05); openPic(+b.dataset.i); };

/* ================= PLAY ================= */
const cv = $('cv'), cx = cv.getContext('2d'); let dpr = 1, VW = 0, VH = 0;
let G = null, pic = null, pi = 0, filled = null, order = [], sel = 0, img = null, imgC = null, imgX = null, view = { s: 1, x: 0, y: 0 }, dirty = true, anims = [], lineA = 1, finished = false, state = 'title', colLeft = [];
const BLANK = [246, 245, 248], HL = [200, 203, 214];
function resize() { dpr = Math.min(devicePixelRatio || 1, 2.5); VW = innerWidth; VH = innerHeight; cv.width = VW * dpr; cv.height = VH * dpr; cv.style.width = VW + 'px'; cv.style.height = VH + 'px'; const fc = $('fin'); fc.width = VW; fc.height = VH; if (G) fitView(false); dirty = true; }
addEventListener('resize', resize);
function area() { const land = matchMedia('(orientation:landscape) and (max-height:620px)').matches; const top = 66; if (land) return { x: 0, y: top, w: VW - $('pal').offsetWidth, h: VH - top - 8 }; return { x: 0, y: top, w: VW, h: VH - top - $('pal').offsetHeight - 6 }; }
function fitView(reset = true) { const a = area(); const s = Math.min(a.w, a.h) / G.W * .97; view.min = s; view.max = s * 9; if (reset || view.s < s) view.s = s; view.s = clamp(view.s, view.min, view.max); if (reset) { view.x = a.x + (a.w - G.W * view.s) / 2; view.y = a.y + (a.h - G.W * view.s) / 2; } clampView(); dirty = true; }
function clampView() { const a = area(), w = G.W * view.s; const m = 60; if (w <= a.w) view.x = a.x + (a.w - w) / 2; else view.x = clamp(view.x, a.x + a.w - w - m, a.x + m); const h = G.W * view.s; if (h <= a.h) view.y = a.y + (a.h - h) / 2; else view.y = clamp(view.y, a.y + a.h - h - m, a.y + m); }
function paintRegion(l, rgb) { const d = img.data; for (let k = G.off[l]; k < G.off[l + 1]; k++) { const p = G.pix[k] * 4; d[p] = rgb[0]; d[p + 1] = rgb[1]; d[p + 2] = rgb[2]; d[p + 3] = 255; } }
function putReg(l) { const b = G.regs[l].b; imgX.putImageData(img, 0, 0, b[0], b[1], b[2] - b[0] + 1, b[3] - b[1] + 1); }
function regColor(l) { const g = G.regs[l]; return filled[l] ? G.pal[g.col].rgb : g.col === sel ? HL : BLANK; }
function openPic(i) { pi = i; pic = PICS[i]; $('loading').hidden = false; state = 'load';
  setTimeout(() => { G = finishGen(gen(pic, SZ, densOf(pic))); filled = new Uint8Array(G.R); order = (S.prog[pic.id] || []).filter(l => l < G.R); order.forEach(l => filled[l] = 1); S.th[pic.id + '_n'] = G.R;
    imgC = document.createElement('canvas'); imgC.width = imgC.height = G.W; imgX = imgC.getContext('2d'); img = imgX.createImageData(G.W, G.W);
    colLeft = G.pal.map(() => 0); G.regs.forEach((g, l) => { if (!filled[l]) colLeft[g.col]++; }); sel = colLeft.findIndex(n => n > 0); if (sel < 0) sel = 0;
    for (let l = 0; l < G.R; l++) paintRegion(l, regColor(l)); imgX.putImageData(img, 0, 0);
    finished = !!S.done[pic.id] && order.length >= G.R; lineA = finished ? 0 : 1; anims = [];
    state = 'play'; $('title').hidden = true; $('hud').hidden = $('pal').hidden = false; $('doneSheet').hidden = true; $('pName').textContent = pic.n; renderPal(); updProg(); resize(); fitView(true); $('loading').hidden = true; dirty = true;
    A.startMusic({ chords: [[60, 64, 67, 71], [57, 60, 64, 67], [65, 69, 72, 76], [62, 65, 69, 72]], bpm: 84, lead: true, kick: false, vol: .55 });
    if (!S.tut) { S.tut = 1; S.save(); toast(T('בחרו צבע למטה ולחצו על האזורים עם אותו מספר. אפשר לגרור כדי לצבוע כמה ברצף, ולהגדיל בשתי אצבעות 🤏', 'Pick a color below and tap the areas with its number. Drag to paint several, pinch to zoom 🤏'), 6000); } }, 30); }
function renderPal() { $('palRow').innerHTML = G.pal.map((p, i) => { const tot = G.regs.filter(g => g.col === i).length, left = colLeft[i]; const pct = tot ? (1 - left / tot) * 100 : 100;
  return `<button class="cb${i === sel ? ' sel' : ''}${left ? '' : ' done'}${p.dark ? ' dk' : ''}" data-c="${i}" style="background:conic-gradient(#ff6a8a ${pct}%, #ece8f0 0)"><i style="background:${p.hex}"></i><span>${left ? i + 1 : '✓'}</span></button>`; }).join(''); }
function updProg() { const p = Math.floor(order.length / G.R * 100); $('pProg').textContent = p + '%'; }
function selectColor(c) { if (c === sel) return; const old = sel; sel = c; for (let l = 0; l < G.R; l++) { const g = G.regs[l]; if (!filled[l] && (g.col === old || g.col === c)) paintRegion(l, regColor(l)); } imgX.putImageData(img, 0, 0); renderPal(); dirty = true; const b = $('palRow').querySelector(`[data-c="${c}"]`); b && b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }
$('palRow').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; A.ac(); A.tone(520 + (+b.dataset.c) * 30, .06, 'sine', .05); selectColor(+b.dataset.c); };
let combo = 0, comboT = 0;
function fill(l, ox, oy) { if (filled[l]) return false; filled[l] = 1; order.push(l); const g = G.regs[l]; colLeft[g.col]--; const b = g.b; const maxd = Math.hypot(Math.max(ox - b[0], b[2] - ox), Math.max(oy - b[1], b[3] - oy)) + 2; anims.push({ l, t: 0, ox, oy, maxd, rgb: G.pal[g.col].rgb });
  const now = performance.now(); combo = now - comboT < 900 ? combo + 1 : 0; comboT = now; const f = 520 * Math.pow(2, Math.min(combo, 12) / 12); A.tone(f, .12, 'sine', .07); A.tone(f * 1.5, .08, 'triangle', .025, .03);
  S.prog[pic.id] = order; saveSoon(); updProg(); if (colLeft[g.col] === 0) { renderPal(); A.tone(880, .1, 'triangle', .06); A.tone(1320, .2, 'triangle', .06, .1); const nx = nextColor(); if (nx >= 0) setTimeout(() => selectColor(nx), 350); else setTimeout(complete, 700); } else if (combo % 3 === 0) renderPal(); return true; }
function nextColor() { for (let k = 1; k <= G.pal.length; k++) { const c = (sel + k) % G.pal.length; if (colLeft[c] > 0) return c; } return -1; }
let saveT = 0; function saveSoon() { clearTimeout(saveT); saveT = setTimeout(() => { makeThumb(); S.save(); }, 800); }
function makeThumb() { if (!G) return; const c = document.createElement('canvas'); c.width = c.height = 200; const x = c.getContext('2d'); x.drawImage(imgC, 0, 0, 200, 200); x.globalAlpha = lineA * .9; x.drawImage(G.lines, 0, 0, 200, 200); try { S.th[pic.id] = c.toDataURL('image/jpeg', .8); } catch (e) { } }
function toImg(px, py) { return [(px - view.x) / view.s, (py - view.y) / view.s]; }
function labelAt(ix, iy) { ix = Math.round(ix); iy = Math.round(iy); if (ix < 0 || iy < 0 || ix >= G.W || iy >= G.W) return -1; return G.label[iy * G.W + ix]; }
function findTarget(px, py, tol = 16) { const [ix, iy] = toImg(px, py); const l = labelAt(ix, iy); if (l >= 0 && !filled[l] && G.regs[l].col === sel) return [l, ix, iy];
  const R = tol / view.s; let best = -1, bd = 1e9, bx = 0, by = 0; const st = Math.max(1, R / 8); for (let dy = -R; dy <= R; dy += st) for (let dx = -R; dx <= R; dx += st) { const d = dx * dx + dy * dy; if (d > R * R || d >= bd) continue; const q = labelAt(ix + dx, iy + dy); if (q >= 0 && !filled[q] && G.regs[q].col === sel) { bd = d; best = q; bx = ix + dx; by = iy + dy; } }
  return best >= 0 ? [best, bx, by] : null; }
// input
const ptr = new Map(); let gest = null;
cv.addEventListener('pointerdown', e => { if (state !== 'play' || finished && !replay) {} if (state !== 'play') return; A.ac(); cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptr.size === 1) { const t = finished ? null : findTarget(e.clientX, e.clientY, isTouchP(e) ? 18 : 10); gest = { mode: t ? 'maybe' : 'pan', sx: e.clientX, sy: e.clientY, t0: performance.now(), tgt: t, lx: e.clientX, ly: e.clientY }; }
  else if (ptr.size === 2) { const [a, b] = [...ptr.values()]; gest = { mode: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; } });
const isTouchP = e => e.pointerType !== 'mouse';
cv.addEventListener('pointermove', e => { if (!ptr.has(e.pointerId) || !gest) return; ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (gest.mode === 'pinch' && ptr.size >= 2) { const [a, b] = [...ptr.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; zoomAt(mx, my, d / gest.d); view.x += mx - gest.mx; view.y += my - gest.my; gest.d = d; gest.mx = mx; gest.my = my; clampView(); dirty = true; return; }
  const dx = e.clientX - gest.sx, dy = e.clientY - gest.sy;
  if (gest.mode === 'maybe' && Math.hypot(dx, dy) > 8) gest.mode = 'paint';
  if (gest.mode === 'paint') { const steps = Math.ceil(Math.hypot(e.clientX - gest.lx, e.clientY - gest.ly) / 4); for (let k = 1; k <= steps; k++) { const px = lerp(gest.lx, e.clientX, k / steps), py = lerp(gest.ly, e.clientY, k / steps); const [ix, iy] = toImg(px, py); const l = labelAt(ix, iy); if (l >= 0 && !filled[l] && G.regs[l].col === sel) fill(l, ix, iy); } if (gest.tgt) { fill(gest.tgt[0], gest.tgt[1], gest.tgt[2]); gest.tgt = null; } }
  if (gest.mode === 'pan') { view.x += e.clientX - gest.lx; view.y += e.clientY - gest.ly; clampView(); dirty = true; }
  gest.lx = e.clientX; gest.ly = e.clientY; });
const pend = e => { if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId); if (gest && gest.mode === 'maybe' && ptr.size === 0) { if (gest.tgt) fill(gest.tgt[0], gest.tgt[1], gest.tgt[2]); }
  else if (gest && gest.mode === 'pan' && ptr.size === 0 && Math.hypot(e.clientX - gest.sx, e.clientY - gest.sy) < 8 && performance.now() - gest.t0 < 500 && !finished) wrongTap(e.clientX, e.clientY);
  if (ptr.size === 0) gest = null; else if (ptr.size === 1 && gest && gest.mode === 'pinch') { const [a] = [...ptr.values()]; gest = { mode: 'pan', sx: a.x, sy: a.y, lx: a.x, ly: a.y, t0: 0 }; } };
cv.addEventListener('pointerup', pend); cv.addEventListener('pointercancel', pend);
cv.addEventListener('wheel', e => { if (state !== 'play') return; e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * .0015)); clampView(); dirty = true; }, { passive: false });
function zoomAt(px, py, k) { const ns = clamp(view.s * k, view.min, view.max); k = ns / view.s; view.x = px - (px - view.x) * k; view.y = py - (py - view.y) * k; view.s = ns; }
function wrongTap(px, py) { const [ix, iy] = toImg(px, py); const l = labelAt(ix, iy); if (l < 0 || filled[l]) return; const c = G.regs[l].col; A.tone(180, .12, 'square', .03); const b = $('palRow').querySelector(`[data-c="${c}"]`); if (b) { b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); } }
$('hintBtn').onclick = () => { if (!G || finished) return; A.ac(); let best = -1, bs = 1e9; for (let l = 0; l < G.R; l++) if (!filled[l] && G.regs[l].col === sel && G.regs[l].n < bs) { bs = G.regs[l].n; best = l; } if (best < 0) return; const g = G.regs[best];
  const a = area(); const ts = clamp(Math.max(view.min * 3, 26 / Math.max(3, g.ld)), view.min, view.max); hintAnim = { t: 0, fs: view.s, fx: view.x, fy: view.y, ts, tx: a.x + a.w / 2 - g.lx * ts, ty: a.y + a.h / 2 - g.ly * ts, l: best }; A.tone(990, .15, 'sine', .05, 0, 1400); };
let hintAnim = null, pulse = null;
$('galBtn').onclick = () => { leavePic(); showTitle(); };
function leavePic() { if (G && pic) { makeThumb(); S.save(); } }

/* ---------- completion & replay ---------- */
let replay = null;
function complete() { if (finished) return; finished = true; S.done[pic.id] = 1; S.save(); lineFade = 1; A.voice('yay', 1.1); [523, 659, 784, 1047].forEach((f, i) => A.tone(f, .3, 'triangle', .07, i * .12)); confetti(); fitView(true);
  setTimeout(() => { makeThumb(); S.save(); $('dT').textContent = T('יצירת מופת! 🎨', 'Masterpiece! 🎨'); $('dP').textContent = T('צבעתם את כל ', 'You colored all ') + G.R + T(' החלקים', ' pieces'); $('dGal').textContent = T('גלריה', 'Gallery'); $('dReplay').textContent = '▶ ' + T('הילוך מהיר', 'Replay'); $('dNext').textContent = T('התמונה הבאה ▶', 'Next picture ▶'); $('doneSheet').hidden = false; }, 2200); }
let lineFade = 0;
$('dGal').onclick = () => { $('doneSheet').hidden = true; leavePic(); showTitle(); };
$('dNext').onclick = () => { $('doneSheet').hidden = true; leavePic(); const nx = PICS.findIndex((p, i) => i > pi && !S.done[p.id]); openPic(nx >= 0 ? nx : (pi + 1) % PICS.length); };
$('dReplay').onclick = () => { $('doneSheet').hidden = true; startReplay(); };
function startReplay() { for (let l = 0; l < G.R; l++) paintRegion(l, BLANK); imgX.putImageData(img, 0, 0); lineA = 1; replay = { k: 0, t: 0, per: Math.max(4, Math.ceil(order.length / 150)) }; fitView(true); }
const fin = $('fin'), fx = fin.getContext('2d'); let conf = [];
function confetti() { const cols = ['#ff6a8a', '#ffd23a', '#4fc3f7', '#7dff9a', '#b26bff', '#ff9a3a']; for (let i = 0; i < 160; i++) conf.push({ x: VW / 2 + (Math.random() - .5) * 80, y: VH * .45, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4, c: cols[i % 6], s: 6 + Math.random() * 6, life: 3 }); }

/* ---------- draw ---------- */
function draw() { cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.fillStyle = '#f6f3ee'; cx.fillRect(0, 0, VW, VH); if (!G || state !== 'play') return;
  cx.save(); cx.translate(view.x, view.y); cx.scale(view.s, view.s); cx.shadowColor = 'rgba(60,40,80,.18)'; cx.shadowBlur = 24; cx.fillStyle = '#fff'; cx.fillRect(0, 0, G.W, G.W); cx.shadowBlur = 0;
  cx.imageSmoothingEnabled = view.s * dpr < 2.2; cx.drawImage(imgC, 0, 0); cx.imageSmoothingEnabled = true; if (lineA > 0) { cx.globalAlpha = lineA; cx.drawImage(G.lines, 0, 0); cx.globalAlpha = 1; } cx.restore();
  if (lineA > .2 && !replay) { cx.textAlign = 'center'; cx.textBaseline = 'middle'; const x0 = -view.x / view.s, y0 = -view.y / view.s, x1 = x0 + VW / view.s, y1 = y0 + VH / view.s;
    for (let l = 0; l < G.R; l++) { if (filled[l]) continue; const g = G.regs[l]; if (g.lx < x0 || g.lx > x1 || g.ly < y0 || g.ly > y1) continue; const fs = Math.min(g.ld * view.s * 1.05, 30); if (fs < 7) continue; const hl = g.col === sel; cx.font = `${hl ? 900 : 700} ${fs}px Rubik, Arial`; cx.fillStyle = hl ? '#2a2440' : '#9a96a8'; cx.fillText(String(g.col + 1), view.x + g.lx * view.s, view.y + g.ly * view.s + fs * .05); } }
  if (pulse) { const g = G.regs[pulse.l]; const k = pulse.t; cx.strokeStyle = `rgba(255,90,140,${1 - k})`; cx.lineWidth = 4; cx.beginPath(); cx.arc(view.x + g.lx * view.s, view.y + g.ly * view.s, 10 + k * 50, 0, 7); cx.stroke(); } }
let last = performance.now();
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000) * (window.__fast || 1); last = now; A.tick();
  if (anims.length) { const d = img.data; for (let a = anims.length - 1; a >= 0; a--) { const an = anims[a]; an.t += dt / .28; const rad = an.maxd * Math.min(1, an.t), r2 = rad * rad; for (let k = G.off[an.l]; k < G.off[an.l + 1]; k++) { const p = G.pix[k], X = p % G.W, Y = (p / G.W) | 0, dx = X - an.ox, dy = Y - an.oy; if (dx * dx + dy * dy <= r2) { const q = p * 4; d[q] = an.rgb[0]; d[q + 1] = an.rgb[1]; d[q + 2] = an.rgb[2]; } } putReg(an.l); if (an.t >= 1) anims.splice(a, 1); } dirty = true; }
  if (hintAnim) { hintAnim.t += dt / .6; const k = 1 - Math.pow(1 - Math.min(1, hintAnim.t), 3); view.s = lerp(hintAnim.fs, hintAnim.ts, k); view.x = lerp(hintAnim.fx, hintAnim.tx, k); view.y = lerp(hintAnim.fy, hintAnim.ty, k); dirty = true; if (hintAnim.t >= 1) { clampView(); pulse = { l: hintAnim.l, t: 0 }; hintAnim = null; } }
  if (pulse) { pulse.t += dt / .9; dirty = true; if (pulse.t >= 1) pulse = pulse.n ? null : { l: pulse.l, t: 0, n: 1 }; }
  if (lineFade > 0 && finished && !replay) { lineA = Math.max(0, lineA - dt * .8); dirty = true; if (!lineA) lineFade = 0; }
  if (replay) { replay.t += dt; while (replay.t > .016 && replay.k < order.length) { replay.t -= .016; for (let j = 0; j < replay.per && replay.k < order.length; j++) { const l = order[replay.k++]; paintRegion(l, G.pal[G.regs[l].col].rgb); putReg(l); } } lineA = Math.max(0, 1 - replay.k / order.length); dirty = true; if (replay.k >= order.length) { replay = null; lineA = 0; setTimeout(() => $('doneSheet').hidden = false, 900); } }
  if (dirty) { dirty = false; draw(); }
  fx.clearRect(0, 0, VW, VH); if (conf.length) { for (let i = conf.length - 1; i >= 0; i--) { const c = conf[i]; c.vy += .35; c.x += c.vx; c.y += c.vy; c.vx *= .99; c.r += c.vr; c.life -= dt; if (c.life <= 0 || c.y > VH + 20) { conf.splice(i, 1); continue; } fx.save(); fx.translate(c.x, c.y); fx.rotate(c.r); fx.fillStyle = c.c; fx.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2); fx.restore(); } } }
function showTitle() { state = 'title'; A.allOff(); A.stopMusic(); $('title').hidden = false; $('hud').hidden = $('pal').hidden = true; $('doneSheet').hidden = true; renderGal(); dirty = true; }
$('galBtn').innerHTML = ICO.grid('#ff4f7a'); $('homeT').innerHTML = ICO.home('#ff4f7a'); soundButton('sndBtn', S, A, '#ff4f7a'); hubButtons(['homeT'], A);
$('tSub').textContent = T('בוחרים צבע, לוחצים על המספרים – ותמונת פסיפס מדהימה נחשפת!', 'Pick a color, tap the numbers – and a stunning mosaic appears!');
addEventListener('pagehide', leavePic); document.addEventListener('visibilitychange', () => { if (document.hidden) leavePic(); });
setTimeout(() => { resize(); showTitle(); $('loading').hidden = true; requestAnimationFrame(frame); window.__mosOK = true; }, 20);
window.__m = { art() { const c = document.createElement('canvas'); c.width = 720; c.height = 491; const x = c.getContext('2d'); x.drawImage(imgC, 0, (G.W - G.W * 491 / 720) / 2, G.W, G.W * 491 / 720, 0, 0, 720, 491); x.globalAlpha = lineA; x.drawImage(G.lines, 0, (G.W - G.W * 491 / 720) / 2, G.W, G.W * 491 / 720, 0, 0, 720, 491); x.globalAlpha = 1; x.textAlign = 'center'; x.textBaseline = 'middle'; const k = 720 / G.W, oy = (G.W - G.W * 491 / 720) / 2; for (let l = 0; l < G.R; l++) { if (filled[l]) continue; const g = G.regs[l]; const fs = Math.min(g.ld * k * 1.05, 22); if (fs < 8) continue; x.font = `700 ${fs}px Rubik, Arial`; x.fillStyle = '#9a96a8'; x.fillText(String(g.col + 1), g.lx * k, (g.ly - oy) * k); } return c.toDataURL('image/jpeg', .85); }, openPic, get G() { return G; }, get sel() { return sel; }, fill, selectColor, fillAll(n = 1e9) { let k = 0; for (let l = 0; l < G.R && k < n; l++) if (!filled[l]) { if (G.regs[l].col !== sel) selectColor(G.regs[l].col); fill(l, G.regs[l].lx, G.regs[l].ly); k++; } }, get view() { return view; }, gen, PICS, findTarget, get state() { return state; } };
