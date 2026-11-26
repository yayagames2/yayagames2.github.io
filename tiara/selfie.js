/* Tiara Glow — makeup on your own photo.
   Everything runs on the device: the photo is never uploaded anywhere.
   Face landmarks: @vladmandic/face-api (MIT), loaded lazily from lib/face. */
import { $, clamp, T } from '../lib/kit.js';
import { PI, TAU, sh, rgba, gem, pearl, sparkle } from './art.js';

let D = null, FA = null, SF = null, tool = 'lips', busy = false, sAnim = 0;
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
const ORDER = ['blush', 'shadow', 'brow', 'lens', 'liner', 'lash', 'lips', 'glow'];
const SEL = {};
const TOOLK = ['look', 'flt', 'lips', 'blush', 'shadow', 'liner', 'lash', 'brow', 'glow', 'lens', 'gems'];

/* ---------- geometry ---------- */
const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (a, s) => [a[0] * s, a[1] * s];
const lerpP = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const len = a => Math.hypot(a[0], a[1]) || 1, nrm = a => mul(a, 1 / len(a));
const avg = ps => mul(ps.reduce((s, q) => add(s, q), [0, 0]), 1 / ps.length);
const P = i => SF.p[i];
function cr(pts, n) { const out = []; const m = pts.length - 1; for (let k = 0; k <= n; k++) { const f = k / n * m, i = Math.min(m - 1, Math.floor(f)), t = f - i; const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(m, i + 2)]; const t2 = t * t, t3 = t2 * t;
  out.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } return out; }
function smooth(x, pts) { const n = pts.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; x.beginPath(); const s = m(pts[n - 1], pts[0]); x.moveTo(s[0], s[1]); for (let i = 0; i < n; i++) { const q = m(pts[i], pts[(i + 1) % n]); x.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); } x.closePath(); }
function poly(x, pts) { x.beginPath(); pts.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.closePath(); }
function eyes() { const E = [{ U: [36, 37, 38, 39], A: [36, 37, 38, 39, 40, 41], B: [17, 18, 19, 20, 21], out: 36, inn: 39, lo: [39, 40, 41, 36] }, { U: [45, 44, 43, 42], A: [42, 43, 44, 45, 46, 47], B: [26, 25, 24, 23, 22], out: 45, inn: 42, lo: [42, 47, 46, 45] }];
  return E.map(e => { const c = avg(e.A.map(P)), bc = avg(e.B.map(P)); const up = nrm(sub(bc, c)), od = nrm(sub(P(e.out), P(e.inn))); return { ...e, c, bc, up, od, w: len(sub(P(e.out), P(e.inn))), U: e.U.map(P), A: e.A.map(P), B: e.B.map(P), lo: e.lo.map(P) }; }); }
function hull() { const j = []; for (let i = 0; i <= 16; i++) j.push(P(i)); const E = eyes(); const up = nrm(add(E[0].up, E[1].up)); for (let i = 26; i >= 17; i--) j.push(add(P(i), mul(up, SF.u * .32))); return j; }

/* ---------- layer helpers ---------- */
function lay() { const x = SF.lay.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.filter = 'none'; x.clearRect(0, 0, SF.W, SF.H); return x; }
function soft(src, px) { if (px < .8) return src; let c = src, w = src.width, h = src.height; const tw = Math.max(8, w / (px * 1.6)); let i = 0;
  while (w / 2 >= tw) { w = Math.round(w / 2); h = Math.round(h / 2); const k = 'h' + i++; const d = SF.sm[k] && SF.sm[k].width === w ? SF.sm[k] : (SF.sm[k] = cnv(w, h)); const dx = d.getContext('2d'); dx.clearRect(0, 0, w, h); dx.imageSmoothingQuality = 'high'; dx.drawImage(c, 0, 0, w, h); c = d; }
  if (c === src) { const d = SF.sm.q && SF.sm.q.width === Math.round(w * .6) ? SF.sm.q : (SF.sm.q = cnv(w * .6, h * .6)); const dx = d.getContext('2d'); dx.clearRect(0, 0, d.width, d.height); dx.drawImage(src, 0, 0, d.width, d.height); c = d; }
  return c; }
function put(x, mode, a, src) { x.globalCompositeOperation = mode; x.globalAlpha = a; x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, SF.W, SF.H); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
const col = c => (c || '#000').replace('*', '');
const shim = c => (c || '').endsWith('*');
function glitterIn(x, clipFn, c, n, r) { x.save(); clipFn(x); x.clip(); const u = SF.u; const rr = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); const b = SF.bb; for (let i = 0; i < n; i++) { const px = b[0] + rr() * b[2], py = b[1] + rr() * b[3]; x.fillStyle = rr() < .5 ? 'rgba(255,255,255,.95)' : rgba(sh(col(c), .6), .95); x.beginPath(); x.arc(px, py, u * r * (.4 + rr()), 0, TAU); x.fill(); } x.restore(); }

/* ---------- built-in filters (whole photo) + ready looks (full makeup sets) ---------- */
const FLT = [
  ['warm', '☀️', () => T('חמים', 'Warm')], ['rosy', '🌸', () => T('ורדרד', 'Rosy')], ['glow', '✨', () => T('זוהר', 'Glowy')], ['dream', '🦄', () => T('חלומי', 'Dreamy')],
  ['cool', '❄️', () => T('קריר', 'Cold')], ['retro', '📼', () => T('רטרו', 'Retro')], ['bw', '🖤', () => T('שחור-לבן', 'B&W')]];
const PIX = { warm: [1.08, 1.02, .9, 10, 4, -6, 1.08], rosy: [1.05, .97, 1.01, 12, 0, 10, 1.04], glow: [1.06, 1.06, 1.06, 16, 16, 16, 1.06], dream: [1.02, .98, 1.04, 22, 14, 26, .82],
  cool: [.93, 1.0, 1.08, -4, 4, 14, .95], retro: [1, 1, 1, 0, 0, 0, 1], bw: [1, 1, 1, 0, 0, 0, 0] };
function applyFlt(c, k) { const P2 = PIX[k]; if (!P2) return; const x = c.getContext('2d'), W = c.width, H = c.height; const im = x.getImageData(0, 0, W, H), d = im.data; const [mr, mg, mb, ar, ag, ab, sat] = P2;
  for (let i = 0; i < d.length; i += 4) { let r = d[i], g = d[i + 1], b = d[i + 2]; const l = .299 * r + .587 * g + .114 * b;
    if (k === 'bw') { const v = (l - 128) * 1.12 + 132; r = g = b = v; }
    else if (k === 'retro') { const sr = .393 * r + .769 * g + .189 * b, sg = .349 * r + .686 * g + .168 * b, sb = .272 * r + .534 * g + .131 * b; r = (r * .45 + sr * .55) * .92 + 14; g = (g * .45 + sg * .55) * .92 + 10; b = (b * .45 + sb * .55) * .88 + 8; }
    else { r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat; r = r * mr + ar; g = g * mg + ag; b = b * mb + ab; }
    d[i] = r; d[i + 1] = g; d[i + 2] = b; }
  x.putImageData(im, 0, 0);
  if (k === 'glow' || k === 'dream') { const s = soft(c, Math.max(W, H) * (k === 'dream' ? .012 : .008)); x.globalCompositeOperation = 'screen'; x.globalAlpha = k === 'dream' ? .42 : .3; x.drawImage(s, 0, 0, W, H); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
  if (k === 'dream' || k === 'rosy') { const g = x.createRadialGradient(W / 2, H * .45, Math.min(W, H) * .35, W / 2, H * .45, Math.max(W, H) * .75); g.addColorStop(0, 'rgba(255,200,235,0)'); g.addColorStop(1, k === 'dream' ? 'rgba(255,220,245,.55)' : 'rgba(255,190,220,.3)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
  if (k === 'retro' || k === 'bw') { const g = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .4, W / 2, H / 2, Math.max(W, H) * .78); g.addColorStop(0, 'rgba(30,15,5,0)'); g.addColorStop(1, 'rgba(30,15,5,.42)'); x.fillStyle = g; x.fillRect(0, 0, W, H); } }
function thumbs() { if (SF.th) return SF.th; const b = SF.bb, tw = 64, th = 80; const sc = Math.max(tw / b[2], th / b[3]) * .82; const sw = tw / sc, shh = th / sc; const sx = clamp(b[0] + b[2] / 2 - sw / 2, 0, SF.W - sw), sy = clamp(b[1] + b[3] / 2 - shh / 2, 0, SF.H - shh);
  SF.th = {}; for (const k of ['none', ...FLT.map(f => f[0])]) { const c = cnv(tw * 2, th * 2); c.getContext('2d').drawImage(SF.base, sx, sy, sw, shh, 0, 0, c.width, c.height); if (k !== 'none') applyFlt(c, k); SF.th[k] = c.toDataURL('image/jpeg', .8); } return SF.th; }
const LOOKS = [
  ['natural', '🌸', () => T('טבעי', 'Natural'), { lips: { c: '#e08aa0', st: 'gloss' }, blush: { c: '#ff9a8a' }, brow: { c: '#4a3022', st: 'soft' }, lash: { c: '#141018', st: 'natural' } }],
  ['princess', '👑', () => T('נסיכה', 'Princess'), { lips: { c: '#ff7aa8', st: 'gloss' }, blush: { c: '#ff7a9a' }, shadow: { c: '#ff8ad0' }, liner: { c: '#141018', st: 'thin' }, lash: { c: '#141018', st: 'long' }, glow: { c: '#ffc8d8' } }, 'heart'],
  ['party', '🎉', () => T('מסיבה', 'Party'), { lips: { c: '#e8203a', st: 'glitter' }, shadow: { c: '#b88aff' }, liner: { c: '#6a2a9a', st: 'wing' }, lash: { c: '#141018', st: 'drama' }, blush: { c: '#ff5a7a' }, glow: { c: 'rainbow' } }, 'star'],
  ['star', '💋', () => T('כוכבת', 'Superstar'), { lips: { c: '#b8001a', st: 'matte' }, shadow: { c: '#c8a08a' }, liner: { c: '#141018', st: 'cat' }, lash: { c: '#141018', st: 'drama' }, brow: { c: '#2a1a14', st: 'bold' }, blush: { c: '#e8708a' }, glow: { c: '#ffe08a' } }],
  ['mermaid', '🧜‍♀️', () => T('בת ים', 'Mermaid'), { lips: { c: '#ff9ad0', st: 'glitter' }, shadow: { c: '#5ae8c8' }, liner: { c: '#0a7a8a', st: 'wing' }, lash: { c: '#141018', st: 'long' }, lens: { c: '#2ac8c8' }, glow: { c: '#d8e8ff' } }, 'pearl'],
  ['fairy', '🧚', () => T('פיה', 'Fairy'), { lips: { c: '#ff9ad0', st: 'gloss' }, shadow: { c: '#d8d8f0*' }, blush: { c: '#ff8ad8' }, lash: { c: '#141018', st: 'doll' }, glow: { c: 'rainbow' }, lens: { c: '#9a5aff' } }, 'fly'],
  ['candy', '🍭', () => T('סוכרייה', 'Candy'), { lips: { c: '#ff4a6a', st: 'ombre' }, shadow: { c: '#ff9ad8*' }, liner: { c: '#e83a8a', st: 'wing' }, lash: { c: '#141018', st: 'doll' }, blush: { c: '#ff8ad8' } }, 'gem']];
function lookGems(kind) { const out = []; const gc2 = { heart: '#ff3a8a', star: '#ffd23a', pearl: '#ffffff', fly: '#b87aff', gem: '#3ac8ff' }[kind];
  for (const [eo, jw] of [[36, 1], [45, 15]]) { const q = lerpP(P(eo), P(jw), .5); out.push({ k: kind, c: gc2, x: q[0], y: q[1] + SF.u * .2, s: kind === 'fly' ? .62 : .75, lk: 1 }); } return out; }

/* ---------- effects ---------- */
const FX = {
  lips(x, m) { const u = SF.u, c = col(m.c); const outer = []; for (let i = 48; i <= 59; i++) outer.push(P(i)); const inner = []; for (let i = 60; i <= 67; i++) inner.push(P(i));
    const open = len(sub(P(62), P(66))) > u * .05;
    let l = lay(); l.fillStyle = c; smooth(l, outer); l.fill(); if (open) { l.globalCompositeOperation = 'destination-out'; smooth(l, inner); l.fill(); l.globalCompositeOperation = 'source-over'; }
    const s1 = soft(SF.lay, u * .012); put(x, 'color', m.st === 'matte' ? .8 : .65, s1); put(x, 'multiply', m.st === 'matte' ? .55 : .42, s1); put(x, 'source-over', m.st === 'matte' ? .22 : .12, s1);
    const lc = avg([P(57), P(66), P(56), P(58)]), ld = nrm(sub(P(54), P(48))), ang = Math.atan2(ld[1], ld[0]);
    if (m.st === 'gloss' || m.st === 'glitter') { l = lay(); const g = l.createRadialGradient(lc[0], lc[1], 0, lc[0], lc[1], u * .13); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); l.fillStyle = g; l.beginPath(); l.ellipse(lc[0], lc[1] - u * .01, u * .13, u * .045, ang, 0, TAU); l.fill(); for (const [a, b] of [[50, 61], [52, 63]]) { const q = lerpP(P(a), P(b), .45); l.fillStyle = 'rgba(255,255,255,.7)'; l.beginPath(); l.ellipse(q[0], q[1], u * .035, u * .012, ang, 0, TAU); l.fill(); }
      l.globalCompositeOperation = 'destination-in'; l.fillStyle = '#fff'; smooth(l, outer); l.fill(); put(x, 'screen', .7, soft(SF.lay, u * .01)); }
    if (m.st === 'ombre') { l = lay(); const mc = avg([P(62), P(66)]); const g = l.createRadialGradient(mc[0], mc[1], 0, mc[0], mc[1], u * .22); g.addColorStop(0, rgba(sh(c, .55), 1)); g.addColorStop(1, rgba(sh(c, .55), 0)); l.fillStyle = g; smooth(l, outer); l.fill(); put(x, 'screen', .55, soft(SF.lay, u * .015)); }
    if (m.st === 'glitter') glitterIn(x, y => smooth(y, outer), m.c, 90, .006); },
  blush(x, m) { const u = SF.u, c = col(m.c); const l = lay(); l.save(); smooth(l, hull()); l.clip(); const ld = nrm(sub(P(45), P(36))), ang = Math.atan2(ld[1], ld[0]);
    for (const [mo, eo, jw] of [[48, 36, 2], [54, 45, 14]]) { const C = lerpP(lerpP(P(mo), P(eo), .6), P(jw), .26); const r = u * .36; const g = l.createRadialGradient(C[0], C[1], 0, C[0], C[1], r); g.addColorStop(0, rgba(c, .85)); g.addColorStop(.45, rgba(c, .42)); g.addColorStop(1, rgba(c, 0)); l.fillStyle = g; l.beginPath(); l.ellipse(C[0], C[1], r, r * .72, ang + (mo === 48 ? -.35 : .35), 0, TAU); l.fill(); }
    l.restore(); const s = soft(SF.lay, u * .03); put(x, 'multiply', .2, s); put(x, 'soft-light', .55, s); put(x, 'source-over', .08, s); },
  shadow(x, m) { const u = SF.u, c = col(m.c); const l = lay(); l.fillStyle = c;
    for (const e of eyes()) { const lid = cr(e.U, 10); const top = lid.map((q, i) => { const t = i / (lid.length - 1); const bp = cr(e.B, 10)[Math.round(t * 10)]; return lerpP(q, bp, .62 - .22 * t); }); const ext = add(add(P(e.out), mul(e.od, u * .07)), mul(e.up, u * .06)); const tc = avg(top), g = l.createLinearGradient(e.c[0], e.c[1], tc[0] + e.up[0] * u * .04, tc[1] + e.up[1] * u * .04); g.addColorStop(0, rgba(c, 1)); g.addColorStop(.45, rgba(c, .85)); g.addColorStop(1, rgba(c, .05)); l.fillStyle = g;
      poly(l, [ext, ...top, ...lid.slice().reverse()]); l.fill(); }
    let s = soft(SF.lay, u * .05); const l2 = lay(); l2.drawImage(s, 0, 0, SF.W, SF.H); l2.globalCompositeOperation = 'destination-out'; for (const e of eyes()) { smooth(l2, e.A); l2.fill(); }
    put(x, 'multiply', .5, SF.lay); put(x, 'source-over', .28, SF.lay); if (shim(m.c)) { put(x, 'screen', .25, SF.lay); for (const e of eyes()) glitterIn(x, y => { const lid = cr(e.U, 8); poly(y, [...lid.map(q => add(q, mul(e.up, u * .07))), ...lid.slice().reverse()]); }, m.c, 40, .005); } },
  liner(x, m) { const u = SF.u, c = col(m.c); const l = lay(); l.fillStyle = shim(m.c) ? (() => { const g = l.createLinearGradient(0, SF.bb[1], 0, SF.bb[1] + SF.bb[3]); g.addColorStop(0, sh(c, .5)); g.addColorStop(1, sh(c, -.25)); return g; })() : c;
    const W = { thin: .016, wing: .024, cat: .03, glam: .04 }[m.st] || .022;
    for (const e of eyes()) { const lid = cr(e.U, 14); const n = lid.length; const upE = lid.map((q, i) => add(q, mul(e.up, u * W * (.35 + .65 * (1 - i / (n - 1)))))); const loE = lid.map(q => sub(q, mul(e.up, u * .004)));
      const pts = [...loE.slice().reverse(), ...upE]; if (m.st !== 'thin') { const L2 = { wing: .1, cat: .16, glam: .13 }[m.st]; const tip = add(P(e.out), mul(nrm(add(e.od, mul(e.up, .55))), u * L2)); pts.splice(loE.length, 0, tip); }
      poly(l, pts); l.fill(); if (m.st === 'cat' || m.st === 'glam') { const lo = cr(e.lo, 8).slice(4); l.lineWidth = u * .008; l.strokeStyle = l.fillStyle; l.lineCap = 'round'; l.beginPath(); lo.forEach((q, i) => i ? l.lineTo(q[0], q[1]) : l.moveTo(q[0], q[1])); l.stroke(); } }
    put(x, 'source-over', .92, soft(SF.lay, u * .004)); if (m.st === 'glam') glitterIn(x, y => { for (const e of eyes()) { const lid = cr(e.U, 8); poly(y, [...lid.map(q => add(q, mul(e.up, u * .05))), ...lid.slice().reverse()]); } }, '#ffffff*', 30, .005); },
  lash(x, m) { const u = SF.u, c = col(m.c); const l = lay(); l.strokeStyle = c; l.lineCap = 'round';
    const K = { natural: [.8, 8, .0055], long: [1.1, 10, .0055], drama: [1.4, 12, .007], doll: [1.25, 11, .006] }[m.st] || [1, 10, .0055];
    for (const e of eyes()) { const lid = cr(e.U, 40); l.lineWidth = u * .009; l.beginPath(); lid.forEach((q, i) => i ? l.lineTo(q[0], q[1]) : l.moveTo(q[0], q[1])); l.stroke();
      const N = K[1]; for (let k = 1; k < N; k++) { const t = k / N, q = lid[Math.round(t * (lid.length - 1))]; const o = 1 - t; const a = -.15 + o * 1.05; const dir = nrm(add(mul(e.up, Math.cos(a)), mul(e.od, Math.sin(a)))); const L2 = u * (.035 + .035 * Math.sin(PI * (.25 + .6 * o))) * K[0];
        const tip = add(q, mul(dir, L2)), ctl = add(add(q, mul(dir, L2 * .55)), mul(e.od, L2 * .25 * (o - .3))); l.lineWidth = u * K[2]; l.beginPath(); l.moveTo(q[0], q[1]); l.quadraticCurveTo(ctl[0], ctl[1], tip[0], tip[1]); l.stroke(); }
      if (m.st === 'doll') { const lo = cr(e.lo, 20); for (let k = 3; k < 18; k += 2) { const q = lo[k], dir = mul(e.up, -1); l.lineWidth = u * .005; l.beginPath(); l.moveTo(q[0], q[1]); l.lineTo(q[0] + dir[0] * u * .035, q[1] + dir[1] * u * .035); l.stroke(); } } }
    put(x, 'source-over', .82, soft(SF.lay, u * .003)); },
  brow(x, m) { const u = SF.u, c = col(m.c); const l = lay(); const k = { soft: 1, arch: 1.1, bold: 1.45 }[m.st] || 1;
    for (const e of eyes()) { const b = cr(e.B, 16), n = b.length; const th = i => u * .042 * k * (.45 + .55 * (i / (n - 1))); const upE = b.map((q, i) => add(q, mul(e.up, th(i) * (m.st === 'arch' ? .25 + .25 * Math.sin(PI * i / (n - 1)) : .2)))); const loE = b.map((q, i) => sub(q, mul(e.up, th(i) * .85)));
      l.fillStyle = c; poly(l, [...upE, ...loE.slice().reverse()]); l.fill(); }
    const s = soft(SF.lay, u * .01); put(x, 'multiply', .5, s); put(x, 'source-over', .2, s);
    const l2 = lay(); l2.strokeStyle = rgba(sh(c, -.25), .8); l2.lineWidth = u * .004; let r = 3; const rr = () => (r = (r * 16807) % 2147483647) / 2147483647;
    for (const e of eyes()) { const b = cr(e.B, 30); for (let i = 0; i < 70; i++) { const q = b[Math.floor(rr() * b.length)], o = (rr() - .7) * u * .035 * k; const p0 = add(q, mul(e.up, o)), d = nrm(add(mul(e.od, .9), mul(e.up, .45))); l2.beginPath(); l2.moveTo(p0[0], p0[1]); l2.lineTo(p0[0] - d[0] * u * .035, p0[1] - d[1] * u * .035); l2.stroke(); } }
    put(x, 'multiply', .35, SF.lay); },
  glow(x, m) { const u = SF.u; const rb = m.c === 'rainbow'; const c = rb ? '#ffffff' : col(m.c); const l = lay(); const ld = nrm(sub(P(45), P(36))), ang = Math.atan2(ld[1], ld[0]);
    const dot = (C, rx, ry, a = ang) => { const g = l.createRadialGradient(C[0], C[1], 0, C[0], C[1], rx); g.addColorStop(0, rgba(c, 1)); g.addColorStop(1, rgba(c, 0)); l.fillStyle = g; l.beginPath(); l.ellipse(C[0], C[1], rx, ry, a, 0, TAU); l.fill(); };
    for (const [eo, jw, mo] of [[36, 1, 48], [45, 15, 54]]) dot(lerpP(lerpP(P(eo), P(jw), .45), P(mo), .18), u * .15, u * .06, ang + (eo === 36 ? .5 : -.5));
    l.lineCap = 'round'; const g = l.createLinearGradient(P(27)[0], P(27)[1], P(30)[0], P(30)[1]); g.addColorStop(0, rgba(c, .1)); g.addColorStop(.5, rgba(c, .9)); g.addColorStop(1, rgba(c, .5)); l.strokeStyle = g; l.lineWidth = u * .05; l.beginPath(); l.moveTo(...lerpP(P(27), P(28), .5)); l.lineTo(...P(30)); l.stroke();
    dot(sub(P(51), mul(nrm(sub(P(27), P(8))), -u * .0)), u * .06, u * .03); dot(lerpP(P(8), P(57), .35), u * .07, u * .04);
    if (rb) { l.globalCompositeOperation = 'source-atop'; const r = l.createLinearGradient(P(0)[0], 0, P(16)[0], 0); ['#ff5a8a', '#ffd23a', '#5aff9a', '#5ac8ff', '#b87aff'].forEach((q, i) => r.addColorStop(i / 4, q)); l.fillStyle = r; l.fillRect(0, 0, SF.W, SF.H); l.globalCompositeOperation = 'source-over'; }
    const s = soft(SF.lay, u * .03); put(x, 'screen', rb ? .45 : .32, s); put(x, 'soft-light', .3, s); },
  lens(x, m) { const u = SF.u, c = col(m.c); const l = lay();
    for (const e of eyes()) { const r = e.w * .2; const C = avg(e.A); l.save(); smooth(l, e.A); l.clip(); const g = l.createRadialGradient(C[0], C[1], r * .3, C[0], C[1], r); g.addColorStop(0, sh(c, .25)); g.addColorStop(.8, c); g.addColorStop(1, sh(c, -.35)); l.fillStyle = g; l.beginPath(); l.arc(C[0], C[1], r, 0, TAU); l.fill(); l.globalCompositeOperation = 'destination-out'; l.beginPath(); l.arc(C[0], C[1], r * .36, 0, TAU); l.fill(); l.restore(); }
    const s = soft(SF.lay, u * .006); put(x, 'color', .62, s); put(x, 'soft-light', .45, s); put(x, 'screen', .07, s); },
};
function drawGem(x, g) { const s = SF.u / 42 * (g.s || 1), { k, c } = g, gx = g.x, gy = g.y;
  if (k === 'heart') gem(x, gx, gy, 7.5 * s, c, 'heart'); else if (k === 'star') gem(x, gx, gy, 6.5 * s, c, 'star'); else if (k === 'gem') gem(x, gx, gy, 4.6 * s, c); else if (k === 'pearl') pearl(x, gx, gy, 4.2 * s);
  else if (k === 'freckle') { let r = Math.round(gx * 7 + gy * 13) % 2147483647 || 5; const rr = () => (r = (r * 16807) % 2147483647) / 2147483647; x.fillStyle = 'rgba(120,60,30,.4)'; for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(gx + (rr() - .5) * 40 * s, gy + (rr() - .5) * 18 * s, (1.3 + rr() * 1.3) * s * .8, 0, TAU); x.fill(); } }
  else if (k === 'fly') { x.save(); x.globalAlpha = .92; for (const d of [-1, 1]) { const g2 = x.createRadialGradient(gx + d * 8 * s, gy - 5 * s, 1, gx + d * 8 * s, gy - 5 * s, 12 * s); g2.addColorStop(0, sh(c, .6)); g2.addColorStop(1, c); x.fillStyle = g2; x.beginPath(); x.ellipse(gx + d * 8 * s, gy - 5 * s, 9 * s, 7 * s, d * -.5, 0, TAU); x.fill(); x.beginPath(); x.ellipse(gx + d * 6 * s, gy + 6 * s, 6 * s, 5 * s, d * .5, 0, TAU); x.fill(); } x.fillStyle = '#3a2a4a'; x.beginPath(); x.ellipse(gx, gy, 1.6 * s, 9 * s, 0, 0, TAU); x.fill(); sparkle(x, gx - 9 * s, gy - 6 * s, 3 * s); x.restore(); } }
function compose() { if (!SF) return; const x = SF.comp.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.drawImage(SF.base, 0, 0);
  for (const k of ORDER) if (SF.mk[k]) { try { FX[k](x, SF.mk[k]); } catch (e) { console.warn(k, e); } x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
  if (SF.flt) { try { applyFlt(SF.comp, SF.flt); } catch (e) { console.warn(e); } }
  for (const g of SF.gems) drawGem(x, g); draw(); }

/* ---------- screen ---------- */
const scv = () => $('scv');
let view = { s: 1, ox: 0, oy: 0 };
function layout() { const c = scv(), dpr = Math.min(devicePixelRatio || 1, 2.5), VW = innerWidth, VH = innerHeight; c.width = Math.round(VW * dpr); c.height = Math.round(VH * dpr); c.style.width = VW + 'px'; c.style.height = VH + 'px';
  const land = VW > VH * 1.1, pn = $('spanel'), top = 70; const av = land ? { x: 10, y: top, w: VW - pn.offsetWidth - 20, h: VH - top - 12 } : { x: 10, y: top, w: VW - 20, h: VH - top - pn.offsetHeight - 14 };
  if (SF) { const s = Math.min(av.w / SF.W, av.h / SF.H); view = { s, ox: av.x + (av.w - SF.W * s) / 2, oy: av.y + (av.h - SF.H * s) / 2, dpr }; } else view = { s: 1, ox: 0, oy: 0, dpr }; draw(); }
function draw() { const c = scv(); if (!c) return; const x = c.getContext('2d'), d = view.dpr || 1; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height); if (!SF) return;
  x.setTransform(d, 0, 0, d, 0, 0); const w = SF.W * view.s, h = SF.H * view.s; x.save(); x.shadowColor = 'rgba(200,64,122,.3)'; x.shadowBlur = 24; x.shadowOffsetY = 8; x.fillStyle = '#fff'; x.beginPath(); x.roundRect(view.ox - 6, view.oy - 6, w + 12, h + 12, 26); x.fill(); x.restore();
  x.save(); x.beginPath(); x.roundRect(view.ox, view.oy, w, h, 20); x.clip(); x.imageSmoothingQuality = 'high'; x.drawImage(SF.comp, view.ox, view.oy, w, h);
  if (sAnim > 0) { const k = sAnim; x.fillStyle = `rgba(255,255,255,${k * .5})`; x.fillRect(view.ox, view.oy, w, h); } x.restore(); }
function animFlash() { sAnim = 1; const st = performance.now(); const f = n => { sAnim = Math.max(0, 1 - (n - st) / 350); draw(); if (sAnim > 0) requestAnimationFrame(f); }; requestAnimationFrame(f); }

/* ---------- panel ---------- */
function renderPanel() { if (!D) return; const { TK, STY, icon, swHTML } = D;
  $('stools').innerHTML = TOOLK.map(k => k === 'look' || k === 'flt' ? `<button class="tl tlook${tool === k ? ' on' : ''}" data-st-tool="${k}"><span class="em">${k === 'look' ? '💖' : '🪄'}</span><small>${k === 'look' ? T('לוק מוכן', 'Ready look') : T('פילטרים', 'Filters')}</small>${SF && SF[k] ? '<i></i>' : ''}</button>` : `<button class="tl${k === tool ? ' on' : ''}" data-st-tool="${k}"><img src="${icon(k, k === 'gems' ? SEL.gems.c : (SF && SF.mk[k] ? SF.mk[k].c : SEL[k].c))}" alt=""><small>${TK[k].n}</small>${(k === 'gems' ? SF && SF.gems.length : SF && SF.mk[k]) ? '<i></i>' : ''}</button>`).join('');
  if (tool === 'look') { $('sopts').innerHTML = LOOKS.map(([k, e, n]) => `<button class="ch lk${SF && SF.look === k ? ' on' : ''}" data-look="${k}">${e} ${n()}</button>`).join(''); return; }
  if (tool === 'flt') { const th = SF ? thumbs() : {};
    let op = '';
    op += [['none', '', () => T('בלי', 'None')], ...FLT].map(([k, e, n]) => `<button class="fth${(SF && SF.flt || 'none') === k ? ' on' : ''}" data-flt="${k}">${th[k] ? `<img src="${th[k]}" alt="">` : ''}<small>${e} ${n()}</small></button>`).join('');
    $('sopts').innerHTML = op; return; }
  let op = ''; const cur = k => SF && (k === 'gems' ? true : !!SF.mk[k]);
  if (tool !== 'gems') op += `<button class="ch${cur(tool) ? '' : ' on'}" data-none="1">∅ ${T('בלי', 'None')}</button>`;
  if (STY[tool]) op += STY[tool].map(([k, n]) => `<button class="ch${SEL[tool].st === k ? ' on' : ''}" data-sst="${k}">${n}</button>`).join('') + '<span class="dv"></span>';
  op += TK[tool].cols.map(c => swHTML(c, (tool === 'gems' || cur(tool)) && SEL[tool].c === c, `data-sc="${c}"`)).join('');
  if (tool === 'gems') op += `<span class="dv"></span><button class="ch" data-gclear="1">🗑️ ${T('הסירו קישוטים', 'Remove gems')}</button>`;
  $('sopts').innerHTML = op; }
function snap() { SF.undo.push(JSON.stringify({ mk: SF.mk, gems: SF.gems, flt: SF.flt || null, look: SF.look || null })); if (SF.undo.length > 60) SF.undo.shift(); $('sUndo').disabled = false; }
function onPanel(e) { const b = e.target.closest('button'); if (!b || !SF) return; D.A.ac(); const d = b.dataset;
  if (d.look) { coachNext('color'); const L = LOOKS.find(l => l[0] === d.look); snap(); SF.mk = JSON.parse(JSON.stringify(L[3])); for (const k in L[3]) Object.assign(SEL[k], L[3][k]); SF.gems = SF.gems.filter(g => !g.lk); if (L[4]) SF.gems.push(...lookGems(L[4])); SF.look = L[0]; compose(); animFlash(); D.A.tone(990, .07, 'sine', .05); D.A.tone(1320, .07, 'sine', .04, .06); D.A.tone(1760, .09, 'sine', .04, .12); }
  else if (d.flt) { coachNext('color'); snap(); SF.flt = d.flt === 'none' ? null : d.flt; compose(); animFlash(); D.A.noise(.15, 'highpass', 3500, 1, .05); D.A.tone(1500, .06, 'sine', .04); }
  else if (d.stTool) { tool = d.stTool; if (coachStep) setTimeout(() => coachNext('tool'), 30); D.A.tone(880, .05, 'triangle', .05); if (tool === 'gems') D.toast(T('הקישו על התמונה כדי להדביק קישוט ✨', 'Tap the photo to stick a gem ✨'), 2200); }
  else if (d.none) { if (SF.mk[tool]) { snap(); SF.look = null; SF.mk[tool] = null; compose(); D.A.noise(.2, 'bandpass', 2000, 1, .04); } }
  else if (d.sst) { coachNext('color'); SEL[tool].st = d.sst; if (tool !== 'gems') { snap(); SF.look = null; SF.mk[tool] = { ...SEL[tool] }; compose(); animFlash(); } D.A.tone(1100, .05, 'sine', .04); }
  else if (d.sc) { coachNext('color'); SEL[tool].c = d.sc; if (tool !== 'gems') { snap(); SF.look = null; SF.mk[tool] = { ...SEL[tool] }; compose(); animFlash(); D.A.tone(1000 + Math.random() * 300, .06, 'sine', .05); D.A.tone(1600, .06, 'sine', .03, .05); } else D.A.tone(1200, .05, 'sine', .04); }
  else if (d.gclear) { if (SF.gems.length) { snap(); SF.gems = []; compose(); } }
  renderPanel(); }
function onTap(e) { if (!SF || tool !== 'gems') return; const px = (e.clientX - view.ox) / view.s, py = (e.clientY - view.oy) / view.s; if (px < 0 || py < 0 || px > SF.W || py > SF.H) return; snap(); SF.gems.push({ k: SEL.gems.st, c: SEL.gems.c, x: px, y: py, s: 1 }); compose(); renderPanel(); D.A.tone(1500 + Math.random() * 400, .06, 'sine', .05); D.A.tone(2200, .05, 'sine', .03, .04); }

/* ---------- photo + face ---------- */
async function loadModels() { if (FA) return FA; const m = await import('../lib/face/face-api.esm.js'); let ok = false; try { ok = await m.tf.setBackend('webgl'); } catch (e) { } if (!ok) await m.tf.setBackend('cpu'); await m.tf.ready().catch(() => { });
  await m.nets.tinyFaceDetector.loadFromUri('lib/face'); await m.nets.faceLandmark68Net.loadFromUri('lib/face'); FA = m; return m; }
function loading(on, msg) { $('sload').hidden = !on; if (msg) $('sloadT').textContent = msg; }
async function fromFile(file) { if (!file || busy) return; busy = true; loading(true, T('מחפשים את הפנים… 🔍', 'Finding the face… 🔍')); try { await loadModels(); } catch (e) { console.warn(e); busy = false; loading(false); D.toast(T('זיהוי הפנים לא נטען 😕 פתחו את המשחק מהאפליקציה ונסו שוב', 'Face finder did not load 😕 Open the game from the app and try again'), 4500); return; } loading(true, T('מחפשים את הפנים… 🔍', 'Finding the face… 🔍'));
  try { const url = URL.createObjectURL(file); const img = new Image(); img.src = url; await img.decode(); URL.revokeObjectURL(url);
    const k0 = Math.min(1, 3200 / Math.max(img.naturalWidth, img.naturalHeight)); const full = cnv(img.naturalWidth * k0, img.naturalHeight * k0); full.getContext('2d').drawImage(img, 0, 0, full.width, full.height);
    await startFrom(full); }
  catch (e) { console.warn(e); D.toast(T('לא הצלחנו לפתוח את התמונה – נסו תמונה אחרת', 'Could not open that picture – try another one'), 3000); }
  busy = false; loading(false); }
async function detect(full) { const fa = await loadModels(); const opt = (n, th = .25) => new fa.TinyFaceDetectorOptions({ inputSize: n, scoreThreshold: th });
  const scaled = m => { const kd = Math.min(1, m / Math.max(full.width, full.height)); if (kd >= 1) return [full, 1]; const c = cnv(full.width * kd, full.height * kd); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(full, 0, 0, c.width, c.height); return [c, kd]; };
  const sane = q => { const e1 = avg([36, 37, 38, 39, 40, 41].map(i => q[i])), e2 = avg([42, 43, 44, 45, 46, 47].map(i => q[i])), u = len(sub(e2, e1)); const ex = mul(sub(e2, e1), 1 / u), ey = [-ex[1], ex[0]]; const mid = lerpP(e1, e2, .5);
    const rel = p => { const d = sub(p, mid); return [(d[0] * ex[0] + d[1] * ex[1]) / u, (d[0] * ey[0] + d[1] * ey[1]) / u]; }; const m = rel(avg([48, 54, 51, 57].map(i => q[i]))), n = rel(q[30]), jw = len(sub(q[16], q[0])) / u;
    return m[1] > .65 && m[1] < 1.6 && Math.abs(m[0]) < .35 && n[1] > .3 && n[1] < m[1] && jw > 1.4 && jw < 3.2; };
  const run = async (src, kd, n, ox = 0, oy = 0) => { const r = await fa.detectSingleFace(src, opt(n)).withFaceLandmarks(); if (!r) return null; const pts = r.landmarks.positions.map(q => [ox + q.x / kd, oy + q.y / kd]); return sane(pts) ? { pts, sc: r.detection.score } : null; };
  /* 1. whole picture, normal and big model input */
  for (const [m, n] of [[900, 416], [1600, 608]]) { const [src, kd] = scaled(m); const r = await run(src, kd, n); if (r) return r.pts; }
  /* 2. far-away faces: slide a window over the picture and zoom into each piece */
  loading(true, T('מחפשים פנים בכל התמונה… עוד רגע 🔍', 'Searching the whole picture… one more moment 🔍'));
  for (const div of [1.8, 3.2]) { let best = null; const side = Math.max(240, Math.min(full.width, full.height) / div), step = side * .62;
    for (let y0 = 0; y0 < full.height - side * .4; y0 += step) for (let x0 = 0; x0 < full.width - side * .4; x0 += step) { const tw = Math.min(side, full.width - x0), th = Math.min(side, full.height - y0);
      const kz = Math.min(4, 608 / Math.max(tw, th)); const c = cnv(tw * kz, th * kz); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(full, x0, y0, tw, th, 0, 0, c.width, c.height);
      const r = await run(c, kz, 608, x0, y0); if (r && r.sc > .6 && (!best || r.sc > best.sc)) best = r; }
    if (best) return best.pts; }
  return null; }
async function startFrom(full) { const pts = await detect(full);
  if (!pts) { D.toast(T('לא מצאנו פנים בתמונה 🙈 מומלץ לצלם סלפי מקרוב – פנים ישרות למצלמה ואור טוב 🤳', 'We could not find a face 🙈 Best is a close-up selfie – face straight to the camera, good light 🤳'), 5200); D.A.tone(330, .2, 'triangle', .06); D.A.tone(250, .25, 'triangle', .05, .15); if (!SF) $('sEmpty').hidden = false; return; }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [a, b] of pts) { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, a); y1 = Math.max(y1, b); }
  const fw = x1 - x0, fh = y1 - y0; let cw = fw * 2.1, ch = cw * 1.25; if (cw > full.width) { cw = full.width; ch = cw * 1.25; } if (ch > full.height) { ch = full.height; cw = Math.min(full.width, ch / 1.25); }
  const cxm = (x0 + x1) / 2, cym = (y0 + y1) / 2 - fh * .12; const cx0 = clamp(cxm - cw / 2, 0, full.width - cw), cy0 = clamp(cym - ch / 2, 0, full.height - ch);
  const k = Math.min(4, 1100 / ch); const far = fw < 90; const W = Math.round(cw * k), H = Math.round(ch * k); const base = cnv(W, H); const bx = base.getContext('2d'); bx.imageSmoothingQuality = 'high'; bx.drawImage(full, cx0, cy0, cw, ch, 0, 0, W, H);
  const p = pts.map(([a, b]) => [(a - cx0) * k, (b - cy0) * k]); const ec = [avg([36, 37, 38, 39, 40, 41].map(i => p[i])), avg([42, 43, 44, 45, 46, 47].map(i => p[i]))]; const u = len(sub(ec[1], ec[0]));
  let bb = [Infinity, Infinity, 0, 0]; for (const [a, b] of p) { bb[0] = Math.min(bb[0], a); bb[1] = Math.min(bb[1], b); bb[2] = Math.max(bb[2], a); bb[3] = Math.max(bb[3], b); } bb = [bb[0] - u * .3, bb[1] - u * .6, bb[2] - bb[0] + u * .6, bb[3] - bb[1] + u * .8];
  SF = { base, W, H, p, u, bb, comp: cnv(W, H), lay: cnv(W, H), sm: {}, mk: {}, gems: [], undo: [] }; $('sUndo').disabled = true; $('sEmpty').hidden = true;
  if (!D.S.selfTut) { D.S.selfTut = 1; D.S.save(); setTimeout(() => coach(1), 900); }
  compose(); renderPanel(); layout(); animFlash(); D.A.tone(880, .08, 'triangle', .06); D.A.tone(1320, .1, 'triangle', .05, .08); D.A.voice && D.A.voice('wow', 1.4);
  D.toast(far ? T('מצאנו! 💄 הפנים רחוקות בתמונה, אז הקרבנו אותן. לתוצאה הכי יפה – סלפי מקרוב 🤳', 'Found you! 💄 The face was far away, so we zoomed in. For the best look – a close-up selfie 🤳') : T('מצאנו! 💄 בחרו כלי וצבע – האיפור נמרח לבד', 'Found you! 💄 Pick a tool and a color – the makeup goes on by itself'), far ? 5200 : 3200); }

/* ---------- first-time guide: arrows to the tool row, then the colors ---------- */
let coachStep = 0;
function coach(step) { coachStep = step; const el = $('sCoach'); if (!step || !SF) { el.hidden = true; coachStep = 0; return; }
  const r = $(step === 1 ? 'stools' : 'sopts').getBoundingClientRect(), land = innerWidth > innerHeight * 1.1, sp = $('sSpot'), bb = $('sBub');
  Object.assign(sp.style, { left: r.left - 4 + 'px', top: r.top - 4 + 'px', width: r.width + 8 + 'px', height: r.height + 8 + 'px' });
  $('sBubT').innerHTML = step === 1 ? T('<b>1</b> בוחרים כלי איפור 💄', '<b>1</b> Pick a makeup tool 💄') : T('<b>2</b> לוחצים על צבע – והאיפור מופיע לבד! ✨<br><small>לא צריך לצייר</small>', '<b>2</b> Tap a color – the makeup appears by itself! ✨<br><small>No need to draw</small>');
  $('sArr').textContent = land ? '👉' : '👇'; el.classList.toggle('land', land); bb.style.cssText = land ? `right:${innerWidth - r.left + 14}px;top:${Math.max(70, r.top + r.height / 2 - 50)}px` : `bottom:${innerHeight - $('spanel').getBoundingClientRect().top + 30}px;left:50%;transform:translateX(-50%)`;
  el.hidden = false; D.A.tone(step === 1 ? 990 : 1320, .1, 'triangle', .05); }
function coachNext(from) { if (!coachStep) return; if (from === 'tool' && coachStep === 1 || from === 'tap' && coachStep === 1) coach(2); else if (from === 'color' || from === 'tap') coach(0); }

/* ---------- flow ---------- */
let exitArm = 0;
export function selfieOpen() { if (!D) return; $('title').hidden = true; $('self').hidden = false; tool = 'lips'; renderPanel(); layout(); if (!SF) { $('sEmpty').hidden = false; pick(); } D.A.startMusic({ chords: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]], bpm: 88, lead: true, vol: .45 }); }
function pick() { const i = $('selfIn'); i.value = ''; i.click(); }
function exit(force) { const n = performance.now(); if (!force && SF && n - exitArm > 2500) { exitArm = n; D.toast(T('לחצו שוב כדי לצאת (התמונה לא נשמרת אם לא שמרתם)', 'Tap again to leave (unsaved pictures are not kept)')); return; } SF = null; coach(0); $('self').hidden = true; D.showTitle(); }
async function save() { if (!SF) return; const pad = Math.round(SF.W * .04); const c = cnv(SF.W + pad * 2, SF.H + pad * 2); const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, c.width, c.height); g.addColorStop(0, '#ffb8de'); g.addColorStop(1, '#d8b8ff'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  x.save(); x.beginPath(); x.roundRect(pad, pad, SF.W, SF.H, pad * .8); x.clip(); x.drawImage(SF.comp, pad, pad); x.restore(); for (const [a, b, r] of [[.06, .05, 1], [.94, .06, .8], [.05, .95, .8], [.95, .94, 1]]) sparkle(x, c.width * a, c.height * b, pad * .45 * r);
  const out = cnv(Math.min(c.width, 900), Math.min(c.width, 900) * c.height / c.width); out.getContext('2d').drawImage(c, 0, 0, out.width, out.height); const url = out.toDataURL('image/jpeg', .88);
  const alb = (await D.idb.get('album')) || []; alb.unshift({ id: Date.now(), url, n: 'selfie' }); await D.idb.set('album', alb.slice(0, 40));
  try { const a = document.createElement('a'); a.download = 'tiara-glow.jpg'; a.href = url; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { }
  animFlash(); D.toast(T('נשמר באלבום המלכותי ובגלריה 📸', 'Saved to the royal album and your gallery 📸')); D.A.tone(1800, .05, 'square', .03); D.A.noise(.12, 'highpass', 4000, 1, .2); }
export function selfieInit(deps) { D = deps; for (const k of TOOLK) { if (k === 'look' || k === 'flt') continue; const t = D.TK[k]; SEL[k] = { c: t.cols[0], st: D.STY[k] ? D.STY[k][k === 'lips' ? 1 : 0][0] : undefined }; }
  SEL.lens.c = '#7ac8ff'; SEL.blush.c = '#ff7a9a'; SEL.liner.st = 'wing'; SEL.lash.st = 'long';
  $('selfBtn').innerHTML = `<span>📷</span><b>${T('איפור על התמונה שלי', 'Makeup on my photo')}</b><small>${T('התמונה נשארת רק בטלפון 🔒', 'Your photo stays on this phone 🔒')}</small>`;
  $('selfBtn').onclick = () => { D.A.ac(); D.A.tone(880, .08, 'triangle', .06); selfieOpen(); };
  $('selfIn').onchange = e => { const f = e.target.files && e.target.files[0]; if (f) fromFile(f); };
  $('sEmptyB').textContent = '📷 ' + T('בחרו תמונה', 'Pick a photo'); $('sEmptyT').textContent = T('צלמו סלפי או בחרו תמונה מהגלריה. 💡 הכי טוב: סלפי מקרוב, פנים ישרות למצלמה ואור טוב', 'Take a selfie or pick a photo. 💡 Best: a close-up selfie, face straight to the camera, good light'); $('sEmptyB').onclick = () => { D.A.ac(); pick(); };
  $('sBack').innerHTML = D.ICO.grid('#c8407a'); $('sUndo').innerHTML = D.ICO.undo ? D.ICO.undo('#c8407a') : '↩️'; $('sReset').innerHTML = D.ICO.reset('#c8407a'); $('sNew').textContent = '📷'; $('sSave').textContent = '📸 ' + T('שמירה', 'Save');
  $('sBack').onclick = () => { D.A.ac(); exit(); }; $('sNew').onclick = () => { D.A.ac(); pick(); }; $('sSave').onclick = () => { D.A.ac(); save(); };
  $('sUndo').onclick = () => { if (!SF || !SF.undo.length) return; const z = JSON.parse(SF.undo.pop()); SF.mk = z.mk; SF.gems = z.gems; SF.flt = z.flt; SF.look = z.look; $('sUndo').disabled = !SF.undo.length; compose(); renderPanel(); D.A.tone(420, .07, 'triangle', .06, 0, 300); };
  let rArm = 0; $('sReset').onclick = () => { if (!SF) return; const n = performance.now(); if (n - rArm > 2500) { rArm = n; D.toast(T('🔄 לחצו שוב כדי להוריד את כל האיפור', '🔄 Tap again to remove all the makeup')); return; } rArm = 0; snap(); SF.mk = {}; SF.gems = []; SF.flt = null; SF.look = null; compose(); renderPanel(); D.A.noise(.35, 'highpass', 2500, 1, .08); D.toast(T('✨ פנים נקיות – מתחילים מחדש!', '✨ A fresh face – start again!')); };
  $('sHelp').onclick = () => { D.A.ac(); coach(1); };
  $('self').addEventListener('pointerdown', e => { if (coachStep && !e.target.closest('#spanel') && !e.target.closest('#sHelp')) coachNext('tap'); }, true);
  addEventListener('resize', () => { if (coachStep) requestAnimationFrame(() => coach(coachStep)); });
  $('spanel').addEventListener('click', onPanel); $('scv').addEventListener('pointerup', onTap); addEventListener('resize', () => { if (!$('self').hidden) requestAnimationFrame(layout); });
  window.__sf = { get SF() { return SF; }, startFrom, compose, set tool(v) { tool = v; renderPanel(); }, SEL, onPanel, loadModels }; }
