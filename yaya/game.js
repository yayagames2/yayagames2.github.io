/* YAYA LAND – original open-world block builder (Ya Ya Games) */
import { THREE, $, V3, C, clamp, lerp, rnd, rng, T, EN, store, engine, particles, audio, toast, ICO, hubButtons, qualityButton, isTouch, CONFETTI, cutie } from '../lib/kit.js';
const S = store('yaya-save', { seed: 0, pos: null, yaw: .6, pitch: .45, dist: 7, bar: [7, 9, 8, 1, 14, 's_house'], sel: 0, tut: 0, day: 1, fly: 0, mode: 'build', builds: 0 });
if (S.bar.length > 6) S.bar = S.bar.slice(0, 6);
if (!S.seed) { S.seed = 1 + Math.floor(Math.random() * 1e9); S.save(); }
const E = engine(S, { fov: 60, far: 600, bloom: [.22, .4, .9], exposure: 1.0, vignette: .16, sat: 1.1, bg: '#8ccaf0' });
const { scene, camera, renderer } = E;
const A = audio(S); const FX = particles(E, 1600); const GL = particles(E, 600, true);
const TAU = Math.PI * 2;

/* ================= BLOCKS ================= */
// k: s=solid, g=glass, w=water, p=plant
const B = [];
function def(id, he, en, t, k = 's', o = {}) { B[id] = Object.assign({ id, n: T(he, en), t: Array.isArray(t) ? t : [t, t, t], k }, o); }
def(1, 'דשא', 'Grass', [0, 1, 2], 's', { cat: 'n' }); def(2, 'אדמה', 'Dirt', 2, 's', { cat: 'n' }); def(3, 'אבן', 'Stone', 3, 's', { cat: 'n' }); def(4, 'חול', 'Sand', 4, 's', { cat: 'n' });
def(5, 'גזע עץ', 'Log', [6, 5, 6], 's', { cat: 'n' }); def(6, 'עלים', 'Leaves', 7, 's', { cat: 'n' }); def(7, 'קרשים', 'Planks', 8, 's', { cat: 'b' }); def(8, 'זכוכית', 'Glass', 9, 'g', { cat: 'b' });
def(9, 'לבנים', 'Bricks', 10, 's', { cat: 'b' }); def(10, 'אבני חומה', 'Stone bricks', 11, 's', { cat: 'b' }); def(11, 'שלג', 'Snow', 12, 's', { cat: 'n' }); def(12, 'קרח', 'Ice', 13, 's', { cat: 'n' });
def(13, 'מים', 'Water', 14, 'w', { cat: 'n' }); def(14, 'מנורה', 'Lamp', 15, 's', { cat: 'x', em: 1 }); def(15, 'זהב', 'Gold', 16, 's', { cat: 'x', em: .12 }); def(16, 'קריסטל', 'Crystal', 17, 's', { cat: 'x', em: .45 });
def(17, 'רעפים', 'Roof tiles', 18, 's', { cat: 'b' }); def(18, 'שיש', 'Marble', 19, 's', { cat: 'b' });
const COLS = [['לבן', 'White', '#f4f2ec'], ['אדום', 'Red', '#e8443a'], ['כתום', 'Orange', '#ff8f2a'], ['צהוב', 'Yellow', '#ffd23a'], ['ירוק בהיר', 'Lime', '#8ede3a'], ['ירוק', 'Green', '#2fa44a'], ['תכלת', 'Cyan', '#36c8e0'], ['כחול', 'Blue', '#3a6ae8'], ['סגול', 'Purple', '#8e4ae0'], ['ורוד', 'Pink', '#ff7ab8'], ['שחור', 'Black', '#2a2a32'], ['חום', 'Brown', '#8a5a34']];
COLS.forEach((c, i) => def(19 + i, c[0], c[1], 20 + i, 's', { cat: 'c' }));
def(31, 'גזע לבן', 'Birch log', [33, 32, 33], 's', { cat: 'n' }); def(32, 'עלי אורן', 'Pine leaves', 34, 's', { cat: 'n' }); def(33, 'חציר', 'Hay', [36, 35, 36], 's', { cat: 'b' });
def(34, 'אבן חול', 'Sandstone', 43, 's', { cat: 'b' }); def(35, 'עץ כהה', 'Dark wood', 44, 's', { cat: 'b' });
def(40, 'שיחים', 'Tall grass', 37, 'p', { cat: 'p' }); def(41, 'פרח אדום', 'Red flower', 38, 'p', { cat: 'p' }); def(42, 'פרח צהוב', 'Yellow flower', 39, 'p', { cat: 'p' }); def(43, 'פרח כחול', 'Blue flower', 40, 'p', { cat: 'p' }); def(44, 'פטרייה', 'Mushroom', 41, 'p', { cat: 'p' });
const K = new Uint8Array(256); // 0 air 1 solid 2 glass 3 water 4 plant
const EMI = new Float32Array(256);
for (const b of B) if (b) { K[b.id] = { s: 1, g: 2, w: 3, p: 4 }[b.k]; EMI[b.id] = b.em || 0; }
const opaque = id => K[id] === 1, solid = id => K[id] === 1 || K[id] === 2;

/* ================= ATLAS ================= */
const TS = 32, AT = 8, AW = TS * AT;
const atlas = document.createElement('canvas'); atlas.width = atlas.height = AW; const ag = atlas.getContext('2d');
const emC = document.createElement('canvas'); emC.width = emC.height = AW; const eg = emC.getContext('2d'); eg.fillStyle = '#000'; eg.fillRect(0, 0, AW, AW);
const hx = h => { const c = C(h); return [c.r * 255, c.g * 255, c.b * 255]; };
function tile(i, base, f) { const ox = (i % AT) * TS, oy = Math.floor(i / AT) * TS; const R = rng(i * 977 + 13); const img = ag.createImageData(TS, TS); const d = img.data; const b = hx(base);
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const o = (y * TS + x) * 4; let c = f ? f(x, y, R, b) : null; if (!c) { const n = 1 + (R() - .5) * .12; c = [b[0] * n, b[1] * n, b[2] * n, 255]; } d[o] = clamp(c[0], 0, 255); d[o + 1] = clamp(c[1], 0, 255); d[o + 2] = clamp(c[2], 0, 255); d[o + 3] = c[3] ?? 255; }
  ag.putImageData(img, ox, oy); return { ox, oy }; }
const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k, 255];
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), 255];
const bevel = (x, y, c, k = .16) => { const e = Math.min(x, y), e2 = Math.min(TS - 1 - x, TS - 1 - y); if (e < 2) return mul(c, 1 + k); if (e2 < 2) return mul(c, 1 - k * 1.3); return c; };
// value noise for textures
function blotch(R, n) { const g = new Float32Array(n * n); for (let i = 0; i < g.length; i++) g[i] = R(); return (x, y) => { const fx = x / TS * n, fy = y / TS * n; const x0 = Math.floor(fx) % n, y0 = Math.floor(fy) % n, x1 = (x0 + 1) % n, y1 = (y0 + 1) % n; const tx = fx - Math.floor(fx), ty = fy - Math.floor(fy); const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty); return lerp(lerp(g[y0 * n + x0], g[y0 * n + x1], sx), lerp(g[y1 * n + x0], g[y1 * n + x1], sx), sy); }; }
const GR = hx('#52a23a'), GR2 = hx('#78be4c'), DI = hx('#94704e'), ST = hx('#8c8f96');
{ let nz;
  tile(0, '#5cb83c', (x, y, R) => { nz = nz || blotch(rng(1), 6); const v = nz(x, y); const c = mix(GR, GR2, v); return R() < .12 ? mul(c, 1.15) : R() < .1 ? mul(c, .85) : c; });
  const sideN = blotch(rng(2), 8); tile(1, '#8a5c3a', (x, y, R) => { const edge = 8 + Math.round(Math.sin(x * .9) * 1.5 + Math.sin(x * 2.3) * 1.2); if (TS - 1 - y < edge) { const c = mix(GR, GR2, sideN(x, y)); return TS - 1 - y === edge - 1 ? mul(c, .8) : c; } const c = mix(DI, hx('#ad8a62'), sideN(x, y)); return R() < .08 ? mul(c, .8) : c; });
  const dn = blotch(rng(3), 8); tile(2, '#8a5c3a', (x, y, R) => { const c = mix(DI, hx('#ad8a62'), dn(x, y)); return R() < .08 ? mul(c, .78) : R() < .05 ? mix(c, ST, .5) : c; });
  const sn = blotch(rng(4), 5), sn2 = blotch(rng(41), 10); tile(3, '#8c8f96', (x, y, R) => { const v = sn(x, y) * .6 + sn2(x, y) * .4; const c = mix(hx('#7a7d86'), hx('#a4a8b0'), v); return Math.abs(v - .5) < .02 ? mul(c, .75) : c; });
  const sa = blotch(rng(5), 10); tile(4, '#ecd89a', (x, y, R) => { const c = mix(hx('#e2cc88'), hx('#f6e6b0'), sa(x, y)); return R() < .1 ? mul(c, .93) : c; });
  tile(5, '#7a5432', (x, y, R) => { const s = Math.sin(x * .9 + Math.sin(y * .25) * 2) * .5 + .5; const c = mix(hx('#5e3e22'), hx('#8a6038'), s); return R() < .1 ? mul(c, .85) : c; });
  tile(6, '#c89a5e', (x, y) => { const d = Math.hypot(x - 15.5, y - 15.5); if (d > 14.5) return hx('#6a4628'); const r = Math.sin(d * 1.2) * .5 + .5; return mix(hx('#b88a52'), hx('#d8b07a'), r); });
  const ln = blotch(rng(7), 6); tile(7, '#3e9a34', (x, y, R) => { const v = ln(x, y); const c = mix(hx('#2e7e2a'), hx('#58b440'), v); const r = R(); return r < .14 ? mul(c, .7) : r < .24 ? mul(c, 1.18) : c; });
  tile(8, '#c89858', (x, y, R) => { const row = Math.floor(y / 8); const off = row % 2 ? 16 : 0; const c0 = mix(hx('#b8864a'), hx('#d4a868'), (row * .37) % 1); let c = mul(c0, 1 + Math.sin((x + row * 7) * .5) * .04 + (R() - .5) * .05); if (y % 8 === 7) c = mul(c, .7); if ((x + off) % 32 === 0) c = mul(c, .72); return bevel(x, y, c, .08); });
  tile(9, '#cfeefa', (x, y) => { const e = Math.min(x, y, TS - 1 - x, TS - 1 - y); if (e < 2) return [235, 248, 255, 255]; const sh = (x + y > 14 && x + y < 20) || (x + y > 22 && x + y < 25); return sh ? [255, 255, 255, 120] : [190, 232, 250, 60]; });
  tile(10, '#b8523a', (x, y, R) => { const row = Math.floor(y / 8), off = row % 2 ? 8 : 0; if (y % 8 === 7 || (x + off) % 16 === 15) return hx('#d8ccb8'); const c = mix(hx('#a84a34'), hx('#c8643e'), ((Math.floor((x + off) / 16) * 7 + row * 3) % 5) / 5); return R() < .1 ? mul(c, .88) : c; });
  tile(11, '#9a9ca4', (x, y, R) => { const row = Math.floor(y / 16), off = row % 2 ? 8 : 0; if (y % 16 === 15 || (x + off) % 16 === 15) return hx('#6a6c74'); if (y % 16 === 0 || (x + off) % 16 === 0) return hx('#b4b6be'); const c = hx('#9a9ca4'); return mul(c, 1 + (R() - .5) * .1); });
  tile(12, '#f4f8ff', (x, y, R) => mul(hx('#f2f6ff'), 1 - R() * .06));
  tile(13, '#a8d8f8', (x, y, R) => { const c = hx('#a2d4f6'); const cr = Math.abs((x * 1.3 - y + 40) % 23) < .8 || Math.abs((x + y * .6) % 29) < .7; return cr ? hx('#e8f6ff') : mul(c, 1 + (R() - .5) * .06); });
  tile(14, '#3a8ad8', (x, y, R) => { const w = Math.sin(x * .4 + Math.sin(y * .3) * 2) * .5 + .5; const c = mix(hx('#1e8ec8'), hx('#48b8e8'), w); c[3] = 205; return c; });
  tile(15, '#ffe8a0', (x, y) => { const e = Math.min(x, y, TS - 1 - x, TS - 1 - y); if (e < 3) return hx('#6a4a2a'); const d = Math.hypot(x - 15.5, y - 15.5); return mix(hx('#fff6d0'), hx('#ffc850'), clamp(d / 14, 0, 1)); });
  tile(16, '#f2c230', (x, y, R) => { let c = mix(hx('#f8d850'), hx('#d89a18'), (x + y) / 62); if ((x - y + 64) % 13 < 2) c = mul(c, 1.2); return bevel(x, y, c, .18); });
  tile(17, '#6ae8f0', (x, y) => { const cx = x - 15.5, cy = y - 15.5; const f = (Math.abs(cx) + Math.abs(cy)) / 22; let c = mix(hx('#c8fcff'), hx('#2ab0d0'), clamp(f, 0, 1)); if (Math.abs(cx) < 1 || Math.abs(cy) < 1) c = mul(c, 1.15); return bevel(x, y, c, .2); });
  tile(18, '#c8483a', (x, y, R) => { const row = Math.floor(y / 8), off = row % 2 ? 4 : 0; const lx = (x + off) % 8, ly = y % 8; let c = mix(hx('#b83a2e'), hx('#e0604a'), ly / 8); if (lx === 0) c = mul(c, .7); if (ly === 7) c = mul(c, .62); return c; });
  const mn = blotch(rng(19), 4); tile(19, '#eceae4', (x, y, R) => { const v = mn(x, y); let c = mix(hx('#f6f4ee'), hx('#dcd8d0'), v); if (Math.abs(Math.sin(x * .3 + y * .2 + v * 6)) < .04) c = hx('#b8b4c0'); return bevel(x, y, c, .06); });
  COLS.forEach((c, i) => { const b = hx(c[2]); tile(20 + i, c[2], (x, y, R) => { const n = 1 + (R() - .5) * .05; let cc = mul(b, n); const e = Math.min(x, y, TS - 1 - x, TS - 1 - y); if (e === 2) cc = mul(b, .9); return bevel(x, y, cc, .14); }); });
  tile(32, '#ecebe4', (x, y, R) => { const c = mul(hx('#eceae2'), 1 + (R() - .5) * .05); if ((y * 7 + Math.floor(x / 6) * 13) % 11 < 1 && x % 6 < 4) return hx('#3a3a3a'); return c; });
  tile(33, '#e8dcb8', (x, y) => { const d = Math.hypot(x - 15.5, y - 15.5); if (d > 14.5) return hx('#e8e6de'); return mix(hx('#d8c89a'), hx('#f0e4c0'), Math.sin(d * 1.2) * .5 + .5); });
  const pn = blotch(rng(34), 6); tile(34, '#2a6a3a', (x, y, R) => { const c = mix(hx('#1e5a32'), hx('#3a7e46'), pn(x, y)); return R() < .16 ? mul(c, .72) : c; });
  tile(35, '#e0c050', (x, y, R) => { let c = mix(hx('#d8b440'), hx('#f0d468'), R()); if (y > 11 && y < 15 || y > 20 && y < 24) c = hx('#a8822a'); return c; });
  tile(36, '#e0c050', (x, y, R) => { const d = Math.hypot(x - 15.5, y - 15.5); return mul(mix(hx('#c8a038'), hx('#f0d468'), R()), 1 - d / 60); });
  const plant = (i, f) => tile(i, '#000', (x, y, R) => { const c = f(x, y, R); return c || [0, 0, 0, 0]; });
  plant(37, (x, y, R) => { for (let k = 0; k < 6; k++) { const bx = 4 + k * 5 + Math.sin(k * 3) * 2, top = 6 + (k * 7) % 12; const lean = (y - 31) * .15 * (k % 2 ? 1 : -1); if (y > top && Math.abs(x - bx - lean) < 1.2) return mix(hx('#3a9a2a'), hx('#8ad85a'), 1 - y / 32); } return null; });
  const flower = (i, pc) => plant(i, (x, y) => { if (Math.abs(x - 15.5) < 1.2 && y > 12) return hx('#3a8a2a'); if (Math.abs(y - 22 + (x - 15) * .5) < 1.4 && x > 16 && x < 23) return hx('#4aa03a'); const d = Math.hypot(x - 15.5, y - 9); if (d < 2.2) return hx('#ffe24a'); if (d < 7 && Math.cos(Math.atan2(y - 9, x - 15.5) * 5) > -.2) return mix(hx(pc), mul(hx(pc), 1.25), d / 7); return null; });
  flower(38, '#e8343a'); flower(39, '#ffc82a'); flower(40, '#4a7aff');
  plant(41, (x, y) => { if (y > 16 && Math.abs(x - 15.5) < 3) return hx('#f2e8d8'); const dy = y - 16; if (dy <= 0 && dy > -10 && Math.abs(x - 15.5) < Math.sqrt(Math.max(0, 100 - (dy + 1) * (dy + 1) * 1.2)) * 1.1) { const sp = (Math.hypot(x - 11, y - 11) < 2) || (Math.hypot(x - 20, y - 12) < 2) || (Math.hypot(x - 15, y - 8) < 1.6); return sp ? hx('#ffffff') : hx('#e8443a'); } return null; });
  const ssn = blotch(rng(43), 6); tile(43, '#e0c890', (x, y, R) => { let c = mix(hx('#d8bc80'), hx('#ecd8a4'), ssn(x, y)); if (y % 11 === 10) c = mul(c, .82); return bevel(x, y, c, .06); });
  tile(44, '#5a3a24', (x, y, R) => { const row = Math.floor(y / 8); let c = mix(hx('#4a2e1c'), hx('#6a4630'), (row * .41) % 1); c = mul(c, 1 + Math.sin((x + row * 5) * .6) * .05 + (R() - .5) * .05); if (y % 8 === 7) c = mul(c, .65); return bevel(x, y, c, .1); });
  // emissive map
  const emTile = (i, col) => { const ox = (i % AT) * TS, oy = Math.floor(i / AT) * TS; eg.drawImage(atlas, ox, oy, TS, TS, ox, oy, TS, TS); eg.fillStyle = col; eg.globalCompositeOperation = 'multiply'; eg.fillRect(ox, oy, TS, TS); eg.globalCompositeOperation = 'source-over'; };
  emTile(15, '#ffffff'); emTile(17, '#9a9a9a'); emTile(16, '#3a3a3a');
}
const mkTex = c => { const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t; };
const ATX = mkTex(atlas), EMX = mkTex(emC);
const matO = new THREE.MeshLambertMaterial({ map: ATX, vertexColors: true, emissiveMap: EMX, emissive: C('#ffffff') });
const matP = new THREE.MeshLambertMaterial({ map: ATX, vertexColors: true, alphaTest: .5, side: THREE.DoubleSide });
const matT = new THREE.MeshLambertMaterial({ map: ATX, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });

/* ================= WORLD GEN ================= */
const W = 192, H = 64, SEA = 20, CS = 16, NC = W / CS;
let VOX = new Uint8Array(W * W * H);
const I = (x, y, z) => (y * W + z) * W + x;
const inW = (x, y, z) => x >= 0 && z >= 0 && y >= 0 && x < W && z < W && y < H;
const get = (x, y, z) => (x < 0 || z < 0 || y < 0 || x >= W || z >= W || y >= H) ? 0 : VOX[(y * W + z) * W + x];
function noise2(seed) { const R = rng(seed); const P = new Uint8Array(512), G = new Float32Array(256); for (let i = 0; i < 256; i++) { P[i] = i; G[i] = R(); } for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; } for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const h = (x, y) => G[P[(P[x & 255] + y) & 511]]; return (x, y) => { const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty); return lerp(lerp(h(x0, y0), h(x0 + 1, y0), sx), lerp(h(x0, y0 + 1), h(x0 + 1, y0 + 1), sx), sy); }; }
function fbm(n, x, y, o = 4) { let a = 0, f = 1, amp = 1, t = 0; for (let i = 0; i < o; i++) { a += n(x * f, y * f) * amp; t += amp; f *= 2; amp *= .5; } return a / t; }
const HM = new Int16Array(W * W); let SPAWN = V3(W / 2, 40, W / 2);
function gen(seed) { VOX = new Uint8Array(W * W * H); const n1 = noise2(seed), n2 = noise2(seed + 1), n3 = noise2(seed + 2), n4 = noise2(seed + 3); const R = rng(seed + 9); const c = W / 2;
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) {
    let h = 21 + (fbm(n1, x / 48, z / 48) - .5) * 22; const m = clamp((fbm(n2, x / 90, z / 90) - .52) * 4.5, 0, 1); h += m * m * 26;
    const lk = fbm(n4, x / 40 + 7, z / 40 + 3); if (lk < .36) h -= (.36 - lk) * 40;
    const d = Math.max(Math.abs(x - c + .5), Math.abs(z - c + .5)) / (W / 2); h -= clamp((d - .8) / .2, 0, 1) ** 1.5 * 22;
    h = Math.round(clamp(h, 3, H - 6)); HM[z * W + x] = h;
    for (let y = 0; y <= h; y++) { let b = 3; if (y > h - 3) b = 2; if (y === h) b = 1; if (h <= SEA + 1 && y > h - 3) b = 4; if (h >= 44 && y > h - 2) b = 11; else if (h >= 38 && y === h) b = 3; if (y === 0) b = 3; VOX[I(x, y, z)] = b; }
    for (let y = h + 1; y <= SEA; y++) VOX[I(x, y, z)] = 13; }
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) { const h = HM[z * W + x]; if (h + 1 > SEA && get(x, h, z) === 4) { let nearW = false; for (let dz = -2; dz <= 2 && !nearW; dz++) for (let dx = -2; dx <= 2; dx++) if (get(x + dx, SEA, z + dz) === 13) { nearW = true; break; } if (!nearW && h > SEA + 1) VOX[I(x, h, z)] = 1; } }
  // trees & plants
  for (let z = 3; z < W - 3; z++) for (let x = 3; x < W - 3; x++) { const h = HM[z * W + x], top = get(x, h, z); if (top !== 1 || get(x, h + 1, z)) continue; const f = fbm(n3, x / 36, z / 36); const r = R(); const dc = Math.hypot(x - c, z - c);
    const dens = f > .56 ? .07 : f > .48 ? .018 : .004; if (r < dens && dc > 5) { tree(x, h + 1, z, h > 31 ? 'pine' : (R() < .25 ? 'birch' : 'oak'), R); continue; }
    const r2 = R(); if (r2 < .1) VOX[I(x, h + 1, z)] = 40; else if (r2 < .13) VOX[I(x, h + 1, z)] = 41 + Math.floor(R() * 3); else if (r2 < .1305 && f > .5) VOX[I(x, h + 1, z)] = 44; }
  // spawn: flat dry grass area nearest the center
  let best = null, bd = 1e9; for (let z = 20; z < W - 20; z += 2) for (let x = 20; x < W - 20; x += 2) { const h = HM[z * W + x]; if (h <= SEA + 1 || h > 34) continue; let ok = true; for (let dz = -3; dz <= 3 && ok; dz++) for (let dx = -3; dx <= 3; dx++) { const hh = HM[(z + dz) * W + x + dx]; if (Math.abs(hh - h) > 1 || hh <= SEA) { ok = false; break; } } if (!ok) continue; const d = Math.hypot(x - c, z - c); if (d < bd) { bd = d; best = [x, z]; } }
  if (!best) best = [c, c]; { const [x, z] = best; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) for (let y = HM[(z + dz) * W + x + dx] + 1; y < HM[(z + dz) * W + x + dx] + 8; y++) if (inW(x + dx, y, z + dz) && K[VOX[I(x + dx, y, z + dz)]] !== 0) VOX[I(x + dx, y, z + dz)] = 0; SPAWN.set(x + .5, HM[z * W + x] + 1, z + .5); }
}
function tree(x, y, z, kind, R) { const set = (a, b, c, id, ow) => { if (inW(a, b, c) && (ow || !VOX[I(a, b, c)] || K[VOX[I(a, b, c)]] === 4)) VOX[I(a, b, c)] = id; };
  if (kind === 'pine') { const hh = 6 + Math.floor(R() * 3); for (let i = 0; i < hh; i++) set(x, y + i, z, 5, 1); for (let i = 2; i <= hh; i++) { const r = Math.max(0, Math.floor((hh - i) / 2.2)) + (i === hh ? 0 : 1); for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dz) <= r + (r > 1 ? 1 : 0)) set(x + dx, y + i, z + dz, 32); } set(x, y + hh, z, 32); set(x, y + hh + 1, z, 32); return; }
  const hh = 4 + Math.floor(R() * 2), log = kind === 'birch' ? 31 : 5; for (let i = 0; i < hh; i++) set(x, y + i, z, log, 1);
  for (let dy = -2; dy <= 2; dy++) { const r = dy === 2 ? 1 : dy === -2 ? 1.6 : 2.5; for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const d = Math.hypot(dx, dz, dy * .8); if (d <= r + .3 && !(d > r - .4 && R() < .35)) set(x + dx, y + hh - 1 + dy, z + dz, 6); } } }

/* ================= MESHING ================= */
const FACES = [[[1, 0, 0], [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]]], [[-1, 0, 0], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]]], [[0, 1, 0], [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]]], [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]], [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]], [[0, 0, -1], [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]]]];
const FUV = [[0, 0], [1, 0], [1, 1], [0, 1]]; const AOC = [.56, .72, .87, 1]; const ep = .5 / AW;
const tileUV = t => { const u0 = (t % AT) / AT, v1 = 1 - Math.floor(t / AT) / AT; return [u0 + ep, v1 - 1 / AT + ep, u0 + 1 / AT - ep, v1 - ep]; };
function buf() { return { p: [], n: [], u: [], c: [], i: [], v: 0 }; }
function quad(bf, pts, nrm, uv, col, flip) { const v = bf.v; for (let k = 0; k < 4; k++) { bf.p.push(pts[k][0], pts[k][1], pts[k][2]); bf.n.push(nrm[0], nrm[1], nrm[2]); bf.u.push(uv[k][0], uv[k][1]); bf.c.push(col[k], col[k], col[k]); } if (flip) bf.i.push(v + 1, v + 2, v + 3, v + 1, v + 3, v); else bf.i.push(v, v + 1, v + 2, v, v + 2, v + 3); bf.v += 4; }
function toGeo(bf) { if (!bf.v) return null; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(bf.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(bf.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(bf.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(bf.c, 3)); g.setIndex(bf.v > 65000 ? new THREE.Uint32BufferAttribute(bf.i, 1) : new THREE.Uint16BufferAttribute(bf.i, 1)); g.computeBoundingSphere(); return g; }
const CH = []; const world = new THREE.Group(); scene.add(world);
function meshChunk(cx, cz) { const O = buf(), P = buf(), Tt = buf(); const x0 = cx * CS, z0 = cz * CS;
  for (let y = 0; y < H; y++) for (let z = z0; z < z0 + CS; z++) for (let x = x0; x < x0 + CS; x++) { const id = VOX[(y * W + z) * W + x]; if (!id) continue; const k = K[id], bd = B[id];
    if (k === 4) { const uv = tileUV(bd.t[0]); const U = [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]]; const cc = [1, 1, 1, 1], s = .15, e = .85, hh = .9;
      quad(P, [[x + s, y, z + s], [x + e, y, z + e], [x + e, y + hh, z + e], [x + s, y + hh, z + s]], [0, 1, 0], U, cc); quad(P, [[x + e, y, z + s], [x + s, y, z + e], [x + s, y + hh, z + e], [x + e, y + hh, z + s]], [0, 1, 0], U, cc); continue; }
    for (let f = 0; f < 6; f++) { const [nr, cs] = FACES[f]; const nx = x + nr[0], ny = y + nr[1], nz = z + nr[2]; const nb = get(nx, ny, nz); const nk = K[nb];
      if (k === 1) { if (nk === 1) continue; } else if (k === 2) { if (nk === 1 || nb === id) continue; } else if (k === 3) { if (nk === 1 || nk === 3 || (nk === 2 && f !== 2)) continue; if (ny < 0) continue; }
      const t = f === 2 ? bd.t[0] : f === 3 ? bd.t[2] : bd.t[1]; const uv = tileUV(t); const pts = [], col = [], U = [];
      const wTop = k === 3 && K[get(x, y + 1, z)] !== 3; let a0, a1; if (nr[0]) { a0 = 2; a1 = 1; } else if (nr[1]) { a0 = 0; a1 = 2; } else { a0 = 0; a1 = 1; }
      for (let q = 0; q < 4; q++) { const cn = cs[q]; let py = y + cn[1]; if (wTop && cn[1] === 1) py -= .12; pts.push([x + cn[0], py, z + cn[2]]); U.push([FUV[q][0] ? uv[2] : uv[0], FUV[q][1] ? uv[3] : uv[1]]);
        if (k === 1) { const o = [nx, ny, nz]; const s0 = cn[a0] ? 1 : -1, s1 = cn[a1] ? 1 : -1; const p1 = o.slice(), p2 = o.slice(), p3 = o.slice(); p1[a0] += s0; p2[a1] += s1; p3[a0] += s0; p3[a1] += s1; const o1 = opaque(get(p1[0], p1[1], p1[2])) ? 1 : 0, o2 = opaque(get(p2[0], p2[1], p2[2])) ? 1 : 0, o3 = opaque(get(p3[0], p3[1], p3[2])) ? 1 : 0; col.push(AOC[o1 && o2 ? 0 : 3 - o1 - o2 - o3]); }
        else col.push(1); }
      const flip = col[0] + col[2] < col[1] + col[3]; quad(k === 1 ? O : Tt, pts, nr, U, col, flip); } }
  const old = CH[cz * NC + cx]; if (old) for (const m of old) { world.remove(m); m.geometry.dispose(); }
  const ms = []; const shad = E.q !== 'low';
  const go = toGeo(O); if (go) { const m = new THREE.Mesh(go, matO); m.castShadow = shad; m.receiveShadow = shad; ms.push(m); }
  const gp = toGeo(P); if (gp) { const m = new THREE.Mesh(gp, matP); m.receiveShadow = shad; ms.push(m); }
  const gt = toGeo(Tt); if (gt) { const m = new THREE.Mesh(gt, matT); m.renderOrder = 2; m.receiveShadow = shad; ms.push(m); }
  ms.forEach(m => { m.matrixAutoUpdate = false; world.add(m); }); CH[cz * NC + cx] = ms; }
const dirty = new Set();
function markDirty(x, z) { const cx = Math.floor(x / CS), cz = Math.floor(z / CS); dirty.add(cz * NC + cx); const lx = x - cx * CS, lz = z - cz * CS; if (lx === 0 && cx > 0) dirty.add(cz * NC + cx - 1); if (lx === CS - 1 && cx < NC - 1) dirty.add(cz * NC + cx + 1); if (lz === 0 && cz > 0) dirty.add((cz - 1) * NC + cx); if (lz === CS - 1 && cz < NC - 1) dirty.add((cz + 1) * NC + cx); }
function flushDirty(max = 6) { let n = 0; for (const k of dirty) { dirty.delete(k); meshChunk(k % NC, Math.floor(k / NC)); if (++n >= max) break; } }

/* ================= EDITS / SAVE / UNDO ================= */
let DIFF = new Map(); const UNDO = []; let grp = null; let saveAt = 0;
function setB(x, y, z, id, rec = true) { if (!inW(x, y, z) || y === 0) return false; const i = I(x, y, z), old = VOX[i]; if (old === id) return false; VOX[i] = id; DIFF.set(i, id); markDirty(x, z); if (rec) (grp || (UNDO.push([]), UNDO[UNDO.length - 1])).push([i, old, id]); if (rec && !grp && UNDO.length > 80) UNDO.shift(); saveAt = performance.now() + 2500; return true; }
function group(f) { grp = []; try { f(); } finally { if (grp.length) { UNDO.push(grp); if (UNDO.length > 80) UNDO.shift(); } grp = null; } }
function undo() { const g = UNDO.pop(); if (!g) { toast(T('אין מה לבטל', 'Nothing to undo')); return; } for (let k = g.length - 1; k >= 0; k--) { const [i, old] = g[k]; VOX[i] = old; DIFF.set(i, old); const x = i % W, z = Math.floor(i / W) % W; markDirty(x, z); } saveAt = performance.now() + 1000; A.tone(500, .08, 'sine', .06, 0, 300); }
const WKEY = () => 'yaya-world-' + S.seed;
function saveWorld() { try { const a = []; for (const [i, id] of DIFF) a.push(i, id); localStorage.setItem(WKEY(), JSON.stringify(a)); S.pos = [PL.p.x, PL.p.y, PL.p.z]; S.yaw = camYaw; S.pitch = camPitch; S.dist = camDist0; S.save(); } catch (e) { } }
function loadWorld() { DIFF = new Map(); try { const a = JSON.parse(localStorage.getItem(WKEY()) || '[]'); for (let k = 0; k < a.length; k += 2) { DIFF.set(a[k], a[k + 1]); VOX[a[k]] = a[k + 1]; } } catch (e) { } }
function buildAll() { gen(S.seed); loadWorld(); for (let cz = 0; cz < NC; cz++) for (let cx = 0; cx < NC; cx++) meshChunk(cx, cz); }

/* ================= SKY / LIGHT ================= */
const skyU = { top: { value: C('#3a8ae0') }, bot: { value: C('#cfe9ff') }, sunDir: { value: V3(.4, .7, .3).normalize() }, night: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(480, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 bot; uniform vec3 sunDir; uniform float night; varying vec3 vD; void main(){ float h=clamp(vD.y*1.4+.15,0.,1.); vec3 c=mix(bot,top,pow(h,.7)); float s=max(dot(vD,sunDir),0.); c+=vec3(1.,.9,.6)*(pow(s,600.)*3.+pow(s,12.)*.25)*(1.-night); c+=vec3(.85,.9,1.)*pow(max(dot(vD,-sunDir),0.),900.)*2.5*night; gl_FragColor=vec4(c,1.); }' }));
sky.renderOrder = -10; scene.add(sky);
const starG = new THREE.BufferGeometry(); { const p = []; const R = rng(77); for (let i = 0; i < 900; i++) { const a = R() * TAU, b = Math.acos(R() * .95); p.push(Math.sin(b) * Math.cos(a) * 450, Math.cos(b) * 450, Math.sin(b) * Math.sin(a) * 450); } starG.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); }
const stars = new THREE.Points(starG, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); sky.add(stars);
scene.fog = new THREE.Fog('#cfe9ff', 70, 170);
const hemi = new THREE.HemisphereLight('#dff0ff', '#6a8a4a', 1.15); scene.add(hemi); const amb = new THREE.AmbientLight('#ffffff', .35); scene.add(amb);
const sun = new THREE.DirectionalLight('#fff4dc', 2.2); scene.add(sun, sun.target);
if (E.q !== 'low') { sun.castShadow = true; const s = E.q === 'ultra' ? 2048 : 1024; sun.shadow.mapSize.set(s, s); const sc = sun.shadow.camera; sc.left = sc.bottom = -36; sc.right = sc.top = 36; sc.near = 1; sc.far = 160; sun.shadow.bias = -.0006; sun.shadow.normalBias = .03; }
// clouds
const cloudTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); const R = rng(8); for (let i = 0; i < 22; i++) { const x = 40 + R() * 176, y = 50 + R() * 40, r = 18 + R() * 30; const gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const clouds = new THREE.Group(); scene.add(clouds); { const R = rng(31); for (let i = 0; i < 26; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: .9 })); const s = 40 + R() * 50; m.scale.set(s, s * .45, 1); m.position.set(R() * 500 - 150, 78 + R() * 20, R() * 500 - 150); clouds.add(m); } }
let dayK = S.day ? 1 : 0, dayT = dayK;
const SKY = { d: { top: C('#3a8ae0'), bot: C('#cfe9ff'), fog: C('#cfe9ff'), hs: C('#dff0ff'), hg: C('#6a8a4a') }, n: { top: C('#06102a'), bot: C('#1a2a50'), fog: C('#14203e'), hs: C('#5a70b0'), hg: C('#1a2030') } };
function applyDay() { const k = dayK; skyU.top.value.copy(SKY.n.top).lerp(SKY.d.top, k); skyU.bot.value.copy(SKY.n.bot).lerp(SKY.d.bot, k); scene.fog.color.copy(SKY.n.fog).lerp(SKY.d.fog, k); hemi.color.copy(SKY.n.hs).lerp(SKY.d.hs, k); hemi.groundColor.copy(SKY.n.hg).lerp(SKY.d.hg, k);
  hemi.intensity = lerp(.6, 1.55, k); sun.intensity = lerp(.35, 2.1, k); sun.color.set(k > .5 ? '#fff4dc' : '#9ab0ff'); skyU.night.value = 1 - k; stars.material.opacity = (1 - k) ** 2; clouds.children.forEach(c => c.material.opacity = lerp(.25, .9, k)); matO.emissiveIntensity = lerp(1.8, 1, k); E.bloom.strength = lerp(.55, .22, k); }

/* ================= PLAYER (YaYa) ================= */
const YA = cutie({ shirt: '#ff6a3a', pants: '#2a5ad8', cap: '#ffcf3a', hair: '#4a2a16', shoe: '#ffffff' }); const hero = YA.g; hero.scale.setScalar(1.12); scene.add(hero);
YA.g.traverse(m => { if (m.isMesh) m.castShadow = true; });
/* tools in YaYa's hands */
const SWING = .32; const wood = new THREE.MeshLambertMaterial({ color: '#9a6236' }), metal = new THREE.MeshLambertMaterial({ color: '#cfd6de' });
const toolG = new THREE.Group(); toolG.position.set(0, -.42, .03); YA.arms[0].add(toolG); const leftG = new THREE.Group(); leftG.position.set(0, -.45, .08); YA.arms[1].add(leftG);
const handle = (L = .5) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, L, 8), wood); m.rotation.x = Math.PI / 2; m.position.z = L / 2 - .1; return m; };
const TOOLS = { break: new THREE.Group(), build: new THREE.Group(), paint: new THREE.Group() };
{ const k = TOOLS.break; k.add(handle()); const hd = new THREE.Mesh(new THREE.BoxGeometry(.06, .3, .07), metal); hd.position.z = .38; k.add(hd); for (const sg of [-1, 1]) { const tp = new THREE.Mesh(new THREE.ConeGeometry(.04, .14, 6), metal); tp.position.set(0, sg * .2, .36); tp.rotation.x = sg > 0 ? -.35 : Math.PI + .35; k.add(tp); } }
{ const k = TOOLS.build; k.add(handle(.42)); const hd = new THREE.Mesh(new THREE.BoxGeometry(.11, .22, .12), new THREE.MeshLambertMaterial({ color: '#ff7a3a' })); hd.position.z = .3; k.add(hd); const fc = new THREE.Mesh(new THREE.BoxGeometry(.12, .07, .13), metal); fc.position.set(0, .1, .3); k.add(fc); }
const brushTip = new THREE.MeshLambertMaterial({ color: '#ff5a8a' }); { const k = TOOLS.paint; k.add(handle(.4)); const fr = new THREE.Mesh(new THREE.CylinderGeometry(.045, .04, .08, 10), metal); fr.rotation.x = Math.PI / 2; fr.position.z = .32; k.add(fr); const br = new THREE.Mesh(new THREE.ConeGeometry(.05, .14, 10), brushTip); br.rotation.x = Math.PI / 2; br.position.z = .43; k.add(br); }
for (const k in TOOLS) { toolG.add(TOOLS[k]); TOOLS[k].traverse(m => { if (m.isMesh) m.castShadow = true; }); }
const miniMat = new THREE.MeshLambertMaterial({ map: ATX }); const miniGeo = new THREE.BoxGeometry(.2, .2, .2); const mini = new THREE.Mesh(miniGeo, miniMat); mini.castShadow = true; leftG.add(mini);
function setMiniUV(id) { const b = B[id]; const uv = miniGeo.attributes.uv; const tl = [b.t[1], b.t[1], b.t[0], b.t[2], b.t[1], b.t[1]]; for (let f = 0; f < 6; f++) { const r = tileUV(tl[f]); for (let k = 0; k < 4; k++) { const i = f * 4 + k; const u0 = uv.getX(i), v0 = uv.getY(i); uv.setXY(i, u0 ? r[2] : r[0], v0 ? r[3] : r[1]); } } uv.needsUpdate = true; }
function tileColor(id) { const b = B[id]; const ti = b.t[1]; const d = ag.getImageData((ti % AT) * TS + 16, Math.floor(ti / AT) * TS + 16, 1, 1).data; return C(`rgb(${d[0]},${d[1]},${d[2]})`); }
function updTool() { for (const k in TOOLS) TOOLS[k].visible = k === MODE; const sv = S.bar[S.sel]; const blk = typeof sv !== 'string' && B[sv]; mini.visible = MODE === 'build' && !!blk && blk.k !== 'p'; if (mini.visible) setMiniUV(sv); if (blk) brushTip.color.copy(tileColor(sv)); }
const PL = { p: V3(), v: V3(), onG: 1, fly: !!S.fly, inW: 0, face: 0, walk: 0, hw: .3, h: 1.5 };
const inp = { x: 0, y: 0, jump: 0, jh: 0, down: 0 };
function boxHit(px, py, pz) { const x0 = Math.floor(px - PL.hw), x1 = Math.floor(px + PL.hw - 1e-4), y0 = Math.floor(py), y1 = Math.floor(py + PL.h - 1e-4), z0 = Math.floor(pz - PL.hw), z1 = Math.floor(pz + PL.hw - 1e-4); for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { if (y < 0) return true; if (solid(get(x, y, z))) return true; } return false; }
function inWater(px, py, pz) { return K[get(Math.floor(px), Math.floor(py + .4), Math.floor(pz))] === 3; }
function stepPlayer(dt) { const P = PL; const fwd = V3(-Math.sin(camYaw), 0, -Math.cos(camYaw)), rt = V3(Math.cos(camYaw), 0, -Math.sin(camYaw));
  const mv = V3().addScaledVector(fwd, -inp.y).addScaledVector(rt, inp.x); const ml = Math.min(1, mv.length()); if (ml > .05) { mv.normalize(); P.face = Math.atan2(mv.x, mv.z); }
  P.inW = inWater(P.p.x, P.p.y, P.p.z); const spd = P.fly ? 9 : P.inW ? 3.4 : 5.2; const acc = P.onG || P.fly ? 14 : 6;
  P.v.x = lerp(P.v.x, mv.x * spd * ml, Math.min(1, dt * acc)); P.v.z = lerp(P.v.z, mv.z * spd * ml, Math.min(1, dt * acc));
  if (P.fly) { const up = (inp.jh ? 1 : 0) - (inp.down ? 1 : 0); P.v.y = lerp(P.v.y, up * 7, Math.min(1, dt * 8)); }
  else if (P.inW) { P.v.y -= 9 * dt; P.v.y *= Math.pow(.2, dt); if (inp.jh) P.v.y = Math.min(P.v.y + 26 * dt, 4.2); }
  else { P.v.y -= 26 * dt; if (inp.jump && P.onG) { P.v.y = 8.6; P.onG = 0; A.tone(380, .1, 'sine', .04, 0, 620); } }
  inp.jump = 0; P.v.y = Math.max(P.v.y, -30);
  // X/Z
  let blocked = false; for (const ax of ['x', 'z']) { const d = P.v[ax] * dt; if (!d) continue; const np = P.p.clone(); np[ax] += d; if (boxHit(np.x, np.y, np.z)) { // step-up assist
      if ((P.onG || P.inW) && !P.fly && !boxHit(np.x, np.y + 1.05, np.z) && !boxHit(P.p.x, P.p.y + 1.05, P.p.z)) { blocked = true; } P.v[ax] = 0; } else P.p[ax] = np[ax]; }
  if (blocked && P.onG && ml > .3) { P.v.y = 8.0; P.onG = 0; } else if (blocked && P.inW) P.v.y = 5;
  // Y
  const dy = P.v.y * dt; const ny = P.p.y + dy; if (boxHit(P.p.x, ny, P.p.z)) { if (dy < 0) { const land = P.v.y < -12; P.p.y = Math.floor(ny) + 1; if (!P.onG && land) { A.noise(.08, 'lowpass', 400, 1, .05); } P.onG = 1; } else P.p.y = Math.ceil(ny + PL.h) - PL.h - 1e-3; P.v.y = 0; } else { P.p.y = ny; P.onG = 0; }
  if (P.fly && P.onG && !inp.jh) { /* landed while flying */ }
  P.p.x = clamp(P.p.x, .4, W - .4); P.p.z = clamp(P.p.z, .4, W - .4); if (P.p.y > H + 10) P.p.y = H + 10;
  if (P.p.y < -8) { P.p.copy(SPAWN); P.v.set(0, 0, 0); toast(T('חזרת להתחלה', 'Back to start')); }
  P.walk += Math.hypot(P.v.x, P.v.z) * dt; }
function animHero(dt, t) { const P = PL; let d = P.face - hero.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); hero.rotation.y += d * Math.min(1, dt * 14); hero.position.copy(P.p); YA.baseY = P.p.y;
  const sp = Math.hypot(P.v.x, P.v.z); const sw = Math.sin(P.walk * 2.6) * Math.min(1, sp / 4) * .8;
  const air = !P.onG && !P.fly && !P.inW; YA.legs.forEach((l, i) => l.rotation.x = lerp(l.rotation.x, air ? (i ? -.5 : .4) : P.fly ? .25 : (i ? sw : -sw), Math.min(1, dt * 14)));
  const u = actT > 0 ? 1 - actT / SWING : -1;
  YA.arms.forEach((a, i) => { let rx = air ? -2.4 : P.fly ? -.2 : (i ? -sw : sw) * .9; if (i === 0 && !air) rx = -.55 + sw * .25; if (i === 1 && MODE === 'build' && !air && !P.fly) rx = -.7 + sw * .2;
    if (i === 0 && u >= 0) a.rotation.x = u < .38 ? lerp(-.55, -2.8, u / .38) : lerp(-2.8, -.2, (u - .38) / .62); else a.rotation.x = lerp(a.rotation.x, rx, Math.min(1, dt * 14)); a.rotation.z = lerp(a.rotation.z, (i ? 1 : -1) * (P.fly ? 1.1 : air ? .5 : .22), Math.min(1, dt * 10)); });
  YA.body.rotation.x = P.fly ? .35 : 0; YA.update(t, dt); hero.position.y = P.p.y + (P.onG ? Math.abs(Math.sin(P.walk * 2.6)) * Math.min(1, sp / 4) * .06 : 0) + (P.fly ? Math.sin(t * 3) * .06 : 0); }
const blob = new THREE.Mesh(new THREE.CircleGeometry(.36, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .28, depthWrite: false })); blob.rotation.x = -Math.PI / 2; scene.add(blob);

/* ================= ANIMALS ================= */
const animals = []; const ANG = new THREE.Group(); scene.add(ANG);
const sm = c => new THREE.MeshLambertMaterial({ color: c });
function ball(r, m, x, y, z, sx = 1, sy = 1, sz = 1) { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; return o; }
function eyes(g, y, z, sp, r = .05) { const w = sm('#ffffff'), k = sm('#15131a'); for (const s of [-1, 1]) { g.add(ball(r, w, s * sp, y, z)); g.add(ball(r * .6, k, s * sp, y, z + r * .55)); } }
function mkAnimal(kind, R) { const g = new THREE.Group(); const legs = [];
  if (kind === 'bunny') { const fur = sm(R() < .5 ? '#f4f0ea' : R() < .5 ? '#b8946a' : '#9a9aa4'), pink = sm('#ffb0c0'); g.add(ball(.24, fur, 0, .24, 0, 1, .9, 1.2)); const hd = new THREE.Group(); hd.position.set(0, .45, .2); hd.add(ball(.17, fur, 0, 0, 0)); for (const s of [-1, 1]) { const e = ball(.06, fur, s * .07, .22, -.02, 1, 3, .6); e.rotation.z = s * .2; hd.add(e); hd.add(ball(.035, pink, s * .07, .22, .01, 1, 2.2, .3)); } eyes(hd, .04, .14, .07, .035); hd.add(ball(.03, pink, 0, -.03, .17)); g.add(hd); g.add(ball(.08, sm('#ffffff'), 0, .26, -.28)); g.userData.hd = hd; }
  else if (kind === 'sheep') { const wool = sm('#f6f4ee'), dk = sm('#3a3434'); for (let i = 0; i < 9; i++) g.add(ball(.2, wool, (R() - .5) * .3, .55 + (R() - .3) * .16, (R() - .5) * .5)); const hd = new THREE.Group(); hd.position.set(0, .62, .38); hd.add(ball(.15, dk, 0, 0, 0, 1, 1.1, 1.1)); hd.add(ball(.13, wool, 0, .12, -.02)); for (const s of [-1, 1]) hd.add(ball(.06, dk, s * .16, .02, -.03, 1.6, .6, .8)); eyes(hd, .04, .13, .07, .035); g.add(hd); g.userData.hd = hd;
    for (const [x, z] of [[-.14, .18], [.14, .18], [-.14, -.18], [.14, -.18]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .36, 8), dk); l.position.set(x, .18, z); g.add(l); legs.push(l); } }
  else if (kind === 'pig') { const pk = sm('#ffaac0'), dp = sm('#e8809a'); g.add(ball(.3, pk, 0, .38, 0, 1, .9, 1.25)); const hd = new THREE.Group(); hd.position.set(0, .48, .36); hd.add(ball(.2, pk, 0, 0, 0)); hd.add(ball(.09, dp, 0, -.03, .17, 1.2, .9, .6)); for (const s of [-1, 1]) { hd.add(ball(.02, sm('#8a3a4a'), s * .035, -.03, .22)); const e = ball(.07, pk, s * .13, .16, -.02, 1, 1.3, .5); e.rotation.z = s * .5; hd.add(e); } eyes(hd, .06, .16, .08, .035); g.add(hd); g.userData.hd = hd; g.add(ball(.05, dp, 0, .44, -.38));
    for (const [x, z] of [[-.14, .2], [.14, .2], [-.14, -.2], [.14, -.2]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .2, 8), pk); l.position.set(x, .1, z); g.add(l); legs.push(l); } }
  else { const wh = sm(R() < .5 ? '#ffffff' : '#ffe07a'), or = sm('#ff9a2a'); g.add(ball(.2, wh, 0, .12, 0, 1, .8, 1.3)); g.add(ball(.1, wh, 0, .24, -.24, 1, 1, 1.2)); const hd = new THREE.Group(); hd.position.set(0, .36, .2); hd.add(ball(.12, wh, 0, 0, 0)); hd.add(ball(.06, or, 0, -.02, .12, 1.2, .5, 1.3)); eyes(hd, .04, .08, .06, .03); g.add(hd); g.userData.hd = hd; }
  g.traverse(o => { o.userData.animal = g; }); ANG.add(g); const a = { g, kind, legs, p: V3(), dir: R() * TAU, sp: 0, t: R() * 3, hop: 0, pet: 0, ph: R() * 6 }; g.userData.A = a; return a; }
function colTop(x, z, fromY) { const ix = Math.floor(x), iz = Math.floor(z); for (let y = Math.min(H - 1, Math.floor(fromY)); y >= 0; y--) { const k = K[get(ix, y, iz)]; if (k === 1 || k === 2 || k === 3) return { y: y + 1, k }; } return { y: 0, k: 0 }; }
function spawnAnimals() { animals.forEach(a => ANG.remove(a.g)); animals.length = 0; const R = rng(S.seed + 5); const want = { bunny: 10, sheep: 8, pig: 6, duck: 8 };
  for (const kind in want) { let n = 0, tries = 0; while (n < want[kind] && tries++ < 4000) { const x = 8 + R() * (W - 16), z = 8 + R() * (W - 16); const c = colTop(x, z, H - 1); if (kind === 'duck' ? c.k !== 3 : (c.k !== 1 || get(Math.floor(x), c.y - 1, Math.floor(z)) !== 1)) continue; if (kind !== 'duck' && Math.hypot(x - W / 2, z - W / 2) > 70 && R() < .5) continue; const a = mkAnimal(kind, R); a.p.set(x, c.y - (kind === 'duck' ? .14 : 0), z); a.g.position.copy(a.p); animals.push(a); n++; } } }
function stepAnimals(dt, t) { for (const a of animals) { const far = Math.abs(a.p.x - PL.p.x) > 70 || Math.abs(a.p.z - PL.p.z) > 70; a.g.visible = !far; if (far) continue; a.t -= dt;
    if (a.pet > 0) { a.pet -= dt; a.sp = 0; const tg = Math.atan2(PL.p.x - a.p.x, PL.p.z - a.p.z); let dd = tg - a.dir; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); a.dir += dd * Math.min(1, dt * 6); }
    else if (a.t <= 0) { a.t = 1.5 + Math.random() * 4; a.sp = Math.random() < .45 ? 0 : (a.kind === 'bunny' ? 1.8 : a.kind === 'duck' ? .8 : 1); a.dir += (Math.random() - .5) * 2.6; }
    if (a.sp > 0) { const nx = a.p.x + Math.sin(a.dir) * a.sp * dt, nz = a.p.z + Math.cos(a.dir) * a.sp * dt; const c = colTop(nx, nz, a.p.y + 1.6); const ok = nx > 2 && nz > 2 && nx < W - 2 && nz < W - 2 && (a.kind === 'duck' ? c.k === 3 : (c.k === 1 || c.k === 2) && Math.abs(c.y - a.p.y) <= 1.05 && !solid(get(Math.floor(nx), c.y, Math.floor(nz))));
      if (ok) { a.p.x = nx; a.p.z = nz; const ty = c.y - (a.kind === 'duck' ? .14 : 0); a.p.y = ty > a.p.y ? ty : lerp(a.p.y, ty, Math.min(1, dt * 10)); } else { a.dir += Math.PI * (.6 + Math.random() * .8); a.t = 1 + Math.random(); } }
    else { const c = colTop(a.p.x, a.p.z, a.p.y + 1.6); const ty = c.y - (a.kind === 'duck' ? .14 : 0); if (Math.abs(ty - a.p.y) > .01) a.p.y = lerp(a.p.y, ty, Math.min(1, dt * 8)); }
    a.g.position.copy(a.p); a.g.rotation.y = a.dir; const ph = t * 9 + a.ph;
    if (a.kind === 'bunny') a.g.position.y += a.sp > 0 || a.pet > 0 ? Math.abs(Math.sin(ph * .8)) * .25 : 0; if (a.kind === 'duck') { a.g.position.y += Math.sin(t * 2 + a.ph) * .03; a.g.rotation.z = Math.sin(t * 1.5 + a.ph) * .06; }
    a.legs.forEach((l, i) => l.rotation.x = a.sp > 0 ? Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * .5 : 0);
    const hd = a.g.userData.hd; if (hd) hd.rotation.x = a.sp === 0 && a.pet <= 0 && a.kind !== 'duck' ? .35 + Math.sin(t * 3 + a.ph) * .1 : a.pet > 0 ? -.2 : 0; } }
function petAnimal(a) { a.pet = 2.2; a.t = 0; const snd = { bunny: [900, 1300], sheep: [300, 260], pig: [380, 300], duck: [700, 520] }[a.kind]; A.tone(snd[0], .12, a.kind === 'sheep' ? 'sawtooth' : 'triangle', .07, 0, snd[1]); A.tone(snd[0] * 1.1, .12, 'triangle', .05, .14, snd[1]);
  for (let i = 0; i < 6; i++) setTimeout(() => FX.emit(a.p.clone().add(V3(rnd(-.3, .3), .8, rnd(-.3, .3))), V3(rnd(-.4, .4), rnd(1.2, 2), rnd(-.4, .4)), [2.4, .6, 1.1], .14, 1.4, -.5), i * 80); }

/* ================= CAMERA ================= */
let camYaw = S.yaw ?? .6, camPitch = S.pitch ?? .45, camDist0 = S.dist ?? 7, camDist = camDist0; const camT = V3();
function updCam(dt, snap) { const P = PL.p; const tg = V3(P.x, P.y + 1.35, P.z); if (state !== 'title') tg.add(V3(Math.cos(camYaw), 0, -Math.sin(camYaw)).multiplyScalar(.75 * clamp(camDist0 / 6, .4, 1.2))); if (snap) camT.copy(tg); else camT.lerp(tg, Math.min(1, dt * 12));
  if (state === 'title') { camYaw += dt * .08; }
  const ttl = state === 'title', pit = ttl ? .62 : camPitch; const want = ttl ? 19 : camDist0; const dir = V3(Math.sin(camYaw) * Math.cos(pit), Math.sin(pit), Math.cos(camYaw) * Math.cos(pit)); let d = want;
  if (!ttl) for (let s = .4; s <= want; s += .2) { const q = camT.clone().addScaledVector(dir, s); if (opaque(get(Math.floor(q.x), Math.floor(q.y), Math.floor(q.z)))) { d = Math.max(.5, s - .3); break; } }
  camDist = snap || d < camDist ? d : lerp(camDist, d, Math.min(1, dt * 4)); camera.position.copy(camT).addScaledVector(dir, camDist); camera.lookAt(camT);
  hero.visible = camDist > 1.1; const port = innerWidth < innerHeight; const fov = port ? 66 : 58; if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  const sx = Math.round(P.x / 4) * 4, sz = Math.round(P.z / 4) * 4; sun.position.set(sx + 36, P.y + 44, sz + 30); sun.target.position.set(sx, P.y, sz); skyU.sunDir.value.set(36, 44, 30).normalize(); sky.position.copy(camera.position);
  blob.position.set(P.x, colTop(P.x, P.z, P.y + .5).y + .03, P.z); blob.visible = hero.visible && !PL.fly; }

/* ================= BUILD TOOLS ================= */
const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
function rayVox(o, d, max = 48, wantWater = false) { let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z); const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
  const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z); let tmx = (sx > 0 ? x + 1 - o.x : o.x - x) * tdx, tmy = (sy > 0 ? y + 1 - o.y : o.y - y) * tdy, tmz = (sz > 0 ? z + 1 - o.z : o.z - z) * tdz; let n = [0, 0, 0], t = 0, water = null; let first = true;
  while (t <= max) { const id = get(x, y, z); if (id && !first) { const k = K[id]; if (k === 3) { if (!water) water = { x, y, z, n: n.slice(), id }; } else return { x, y, z, n: n.slice(), id }; } first = false;
    if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; n = [-sx, 0, 0]; } else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; n = [0, -sy, 0]; } else { z += sz; t = tmz; tmz += tdz; n = [0, 0, -sz]; }
    if (y < -1 && sy < 0) break; if (y > H + 2 && sy > 0) break; }
  return wantWater && water ? water : (water ? Object.assign(water, { onlyWater: 1 }) : null); }
const hl = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: .9, depthTest: true })); hl.visible = false; scene.add(hl); let hlT = 0;
const ghost = new THREE.Mesh(new THREE.BoxGeometry(1.002, 1.002, 1.002), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .25, depthWrite: false })); ghost.visible = false; scene.add(ghost);
const STAMPS = [{ id: 's_tree', ic: '🌳', n: T('עץ', 'Tree') }, { id: 's_house', ic: '🏠', n: T('בית', 'House') }, { id: 's_tower', ic: '🏰', n: T('מגדל', 'Tower') }, { id: 's_pool', ic: '⛲', n: T('בריכה', 'Pool') }, { id: 's_rainbow', ic: '🌈', n: T('קשת', 'Rainbow') }, { id: 's_bridge', ic: '🌉', n: T('גשר', 'Bridge') }];
let MODE = S.mode || 'build'; let actT = 0;
const isStamp = v => typeof v === 'string';
const selVal = () => S.bar[S.sel];
function overlapsPlayer(x, y, z) { const P = PL.p; return x + 1 > P.x - PL.hw && x < P.x + PL.hw && z + 1 > P.z - PL.hw && z < P.z + PL.hw && y + 1 > P.y && y < P.y + PL.h; }
function blockSnd(id, brk) { const k = K[id]; if (k === 2 || id === 12 || id === 16) A.tone(brk ? 1400 : 1800, .08, 'triangle', .05, 0, brk ? 700 : 2400); else if (k === 3) A.noise(.15, 'lowpass', 900, 1, .06, 0, 300); else if (k === 4 || id === 6 || id === 32) A.noise(.08, 'highpass', 2500, 1, .05); else { A.noise(brk ? .12 : .06, 'bandpass', brk ? 500 : 900, 2, brk ? .12 : .09); A.tone(brk ? 160 : 260, .06, 'sine', .07, 0, brk ? 90 : 180); } }
function burst(x, y, z, id) { const b = B[id]; if (!b) return; const ti = b.t[1]; const ox = (ti % AT) * TS + 16, oy = Math.floor(ti / AT) * TS + 16; const px = ag.getImageData(ox, oy, 1, 1).data; const c = [[px[0] / 255 * 1.2, px[1] / 255 * 1.2, px[2] / 255 * 1.2]]; FX.burst(V3(x + .5, y + .5, z + .5), 14, c, 3.2, .09, .7, 9); }
function act(clientX, clientY, alt) { const r = renderer.domElement.getBoundingClientRect(); ndc.set((clientX - r.left) / r.width * 2 - 1, -(clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera);
  const ah = ray.intersectObjects(ANG.children, true)[0]; const mode = alt ? 'break' : MODE;
  const h = rayVox(ray.ray.origin, ray.ray.direction, 60, mode === 'break');
  if (ah && (!h || ah.distance < camera.position.distanceTo(V3(h.x + .5, h.y + .5, h.z + .5)))) { const a = ah.object.userData.animal?.userData.A; if (a) { petAnimal(a); return; } }
  doAct(h, mode); }
function swingAt(h) { actT = SWING; if (h) { const tx = h.x + .5 - PL.p.x, tz = h.z + .5 - PL.p.z; if (Math.hypot(tx, tz) > .3) PL.face = Math.atan2(tx, tz); } A.noise(.07, 'bandpass', 1400, 1, .03); }
function aimHit(mode) { const dir = camera.getWorldDirection(V3()); const o = camera.position.clone().addScaledVector(dir, Math.max(0, camDist - .9)); return rayVox(o, dir, 9, mode === 'break'); }
function doAct(h, mode) { swingAt(h); if (!h) return; const sv = selVal();
  if (mode === 'break') { if (h.y === 0) return; const id = h.id; if (setB(h.x, h.y, h.z, 0)) { burst(h.x, h.y, h.z, id); blockSnd(id, 1); if (K[get(h.x, h.y + 1, h.z)] === 4) setB(h.x, h.y + 1, h.z, 0); flashHL(h.x, h.y, h.z); } return; }
  if (h.onlyWater && mode !== 'build') return;
  if (mode === 'paint') { if (isStamp(sv) || K[h.id] === 4 && K[sv] !== 4) return; if (setB(h.x, h.y, h.z, sv)) { blockSnd(sv); burst(h.x, h.y, h.z, sv); flashHL(h.x, h.y, h.z); } return; }
  let tx = h.x + h.n[0], ty = h.y + h.n[1], tz = h.z + h.n[2]; if (K[h.id] === 4 || h.onlyWater && !isStamp(sv)) { tx = h.x; ty = h.y; tz = h.z; } if (h.onlyWater && isStamp(sv)) { tx = h.x; ty = h.y + 1; tz = h.z; }
  if (isStamp(sv)) { stamp(sv, tx, ty, tz); return; }
  if (!inW(tx, ty, tz)) return; const cur = get(tx, ty, tz); if (cur && K[cur] !== 3 && K[cur] !== 4) return; if (solid(sv) && overlapsPlayer(tx, ty, tz)) { A.tone(200, .08, 'square', .03); return; }
  if (K[sv] === 4 && !solid(get(tx, ty - 1, tz))) return;
  if (setB(tx, ty, tz, sv)) { blockSnd(sv); flashHL(tx, ty, tz); S.builds = (S.builds || 0) + 1; if (S.builds % 100 === 0) { toast(T('🎉 כבר ', '🎉 ') + S.builds + T(' בלוקים!', ' blocks built!')); GL.burst(V3(tx + .5, ty + 1, tz + .5), 40, CONFETTI, 4, .1, 1.2, 4); } } }
let mouseT = -9; function updAim() { if (performance.now() - mouseT < 2000) return; const h = aimHit(MODE); if (!h || h.onlyWater && MODE !== 'build') { hl.visible = ghost.visible = false; $('aim').classList.remove('on'); return; } $('aim').classList.add('on'); const sv = selVal();
  if (MODE === 'build' && !isStamp(sv) && !h.onlyWater && K[h.id] !== 4) { hl.visible = false; ghost.visible = true; ghost.position.set(h.x + h.n[0] + .5, h.y + h.n[1] + .5, h.z + h.n[2] + .5); } else { ghost.visible = false; hl.visible = true; hl.position.set(h.x + .5, h.y + .5, h.z + .5); } hlT = 99; }
function flashHL(x, y, z) { hl.position.set(x + .5, y + .5, z + .5); hl.visible = true; hlT = .35; }
function hover(clientX, clientY) { mouseT = performance.now(); const r = renderer.domElement.getBoundingClientRect(); ndc.set((clientX - r.left) / r.width * 2 - 1, -(clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera); const h = rayVox(ray.ray.origin, ray.ray.direction, 60); if (!h) { hl.visible = ghost.visible = false; return; }
  hl.position.set(h.x + .5, h.y + .5, h.z + .5); hl.visible = !h.onlyWater; hlT = 99; const sv = selVal(); ghost.visible = MODE === 'build' && !isStamp(sv) && !h.onlyWater && K[h.id] !== 4; if (ghost.visible) ghost.position.set(h.x + h.n[0] + .5, h.y + h.n[1] + .5, h.z + h.n[2] + .5); }
// stamps
function facing() { const a = ((Math.round(-camYaw / (Math.PI / 2)) % 4) + 4) % 4; return [[0, 1], [1, 0], [0, -1], [-1, 0]][a]; } // direction towards camera
function stamp(id, x, y, z) { const [fx, fz] = facing(); const rx = -fz, rz = fx; // right vector
  const P = (a, h, b, bid) => { const X = x + rx * a + fx * b, Z = z + rz * a + fz * b; if (!inW(X, y + h, Z)) return; if (bid && overlapsPlayer(X, y + h, Z) && solid(bid)) return; setB(X, y + h, Z, bid); };
  group(() => {
    if (id === 's_tree') { const R = rng(Date.now() & 0xffff); for (let i = 0; i < 5; i++) P(0, i, 0, 5); for (let dy = -2; dy <= 2; dy++) { const r = dy === 2 ? 1 : dy === -2 ? 1.6 : 2.5; for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) { const d = Math.hypot(a, b, dy * .8); if (d <= r + .3 && !(a === 0 && b === 0 && dy < 1)) P(a, 4 + dy, b, 6); } } }
    else if (id === 's_house') { const w = 3, dz0 = -7; for (let a = -w - 1; a <= w + 1; a++) for (let b = dz0 - 1; b <= 1; b++) for (let h = 0; h < 9; h++) P(a, h, b, 0);
      for (let a = -w; a <= w; a++) for (let b = dz0; b <= 0; b++) { P(a, -1, b, 10); const edge = Math.abs(a) === w || b === dz0 || b === 0; for (let h = 0; h < 4; h++) { if (!edge) continue; const corner = Math.abs(a) === w && (b === dz0 || b === 0); let bid = corner ? 5 : 7; if (h === 1 || h === 2) { if (!corner && ((b === 0 || b === dz0) && Math.abs(a) === 2 || Math.abs(a) === w && (b === -2 || b === dz0 + 2))) bid = 8; } if (b === 0 && a === 0 && h < 2) bid = 0; P(a, h, b, bid); } }
      for (let l = 0; l <= w + 1; l++) for (let b = dz0 - 1; b <= 1; b++) { for (const s of [-1, 1]) P(s * (w + 1 - l), 4 + l, b, 17); if (l > 0) for (let a = -(w - l); a <= w - l; a++) if (b === dz0 || b === 0) P(a, 4 + l - 1, b, 7); }
      for (let b = dz0 - 1; b <= 1; b++) P(0, 4 + w + 1, b, 17); P(0, 3, -3, 14); P(-1, 0, 1, 41); P(1, 0, 1, 42); }
    else if (id === 's_tower') { const r = 2; for (let h = 0; h < 12; h++) for (let a = -r; a <= r; a++) for (let b = -r * 2; b <= 0; b++) { const edge = Math.abs(a) === r || b === -r * 2 || b === 0; let bid = edge ? 10 : 0; if (edge && h % 4 === 2 && (a === 0 || b === -r)) bid = 8; if (b === 0 && a === 0 && h < 2) bid = 0; if (h === 0 && !edge) bid = 10; P(a, h, b, bid); }
      for (let a = -r - 1; a <= r + 1; a++) for (let b = -r * 2 - 1; b <= 1; b++) { P(a, 12, b, 10); const edge = Math.abs(a) === r + 1 || b === -r * 2 - 1 || b === 1; if (edge && (a + b) % 2 === 0) P(a, 13, b, 10); } P(0, 13, -r, 14); for (let h = 1; h < 12; h++) P(0, h, -r * 2 + 1, h % 2 ? 7 : 0); }
    else if (id === 's_pool') { for (let a = -3; a <= 3; a++) for (let b = -6; b <= 0; b++) { const edge = Math.abs(a) === 3 || b === -6 || b === 0; P(a, -1, b, 18); P(a, 0, b, edge ? 18 : 13); P(a, 1, b, 0); } P(0, -1, -3, 16); P(0, 1, -3, 18); P(0, 2, -3, 13); for (const [a, b] of [[-3, 0], [3, 0], [-3, -6], [3, -6]]) P(a, 1, b, 14); }
    else if (id === 's_rainbow') { const cols = [20, 21, 22, 23, 24, 25, 26]; for (let i = 0; i < 7; i++) { const R = 9 - i; for (let k = 0; k <= 60; k++) { const an = k / 60 * Math.PI; const a = Math.round(Math.cos(an) * R), h = Math.round(Math.sin(an) * R); P(a, h, -1, cols[i]); } } for (const s of [-1, 1]) for (let a = 0; a < 3; a++) { P(s * (8 + a - 1), 0, -2, 18); P(s * (8 + a - 1), 0, 0, 18); P(s * (8 + a - 1), 0, -1, 18); } }
    else if (id === 's_bridge') { const L = 14; for (let b = 0; b > -L; b--) { const arc = Math.round(Math.sin((-b) / (L - 1) * Math.PI) * 2); for (let a = -1; a <= 1; a++) { P(a, arc, b, 35); for (let h = 1; h <= 3; h++) P(a, arc + h, b, 0); } P(-2, arc + 1, b, 35); P(2, arc + 1, b, 35); if (b % 4 === 0) { P(-2, arc + 2, b, 14); P(2, arc + 2, b, 14); } } }
  });
  A.tone(523, .1, 'triangle', .07); A.tone(784, .16, 'triangle', .07, .1); GL.burst(V3(x + .5, y + 2, z + .5), 50, CONFETTI, 5, .1, 1.2, 5); }

/* ================= ICONS / HOTBAR / BAG ================= */
const iconCache = {};
function icon(v, sz = 64) { if (isStamp(v)) { const s = STAMPS.find(s => s.id === v); const c = document.createElement('div'); c.className = 'em'; c.textContent = s.ic; return c; }
  const c = document.createElement('canvas'); c.width = c.height = sz; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; const b = B[v]; const src = t => [(t % AT) * TS, Math.floor(t / AT) * TS];
  if (b.k === 'p') { const [sx, sy] = src(b.t[0]); g.drawImage(atlas, sx, sy, TS, TS, 4, 4, sz - 8, sz - 8); return c; }
  const s = sz * .42, cx = sz / 2, top = sz * .1; const faces = [[b.t[0], [s, s * .5, -s, s * .5, cx, top], 1], [b.t[1], [s, s * .5, 0, s, cx - s, top + s * .5], .72], [b.t[1], [s, -s * .5, 0, s, cx, top + s], .86]];
  for (const [t, m, sh] of faces) { const [sx, sy] = src(t); g.save(); g.setTransform(m[0] / TS, m[1] / TS, m[2] / TS, m[3] / TS, m[4], m[5]); g.drawImage(atlas, sx, sy, TS, TS, 0, 0, TS, TS); g.fillStyle = `rgba(0,0,0,${1 - sh})`; g.fillRect(0, 0, TS, TS); g.restore(); }
  return c; }
const nameOf = v => isStamp(v) ? STAMPS.find(s => s.id === v).n : B[v].n;
let nameT = 0; function showName() { $('selName').textContent = nameOf(selVal()); $('selName').classList.add('on'); clearTimeout(nameT); nameT = setTimeout(() => $('selName').classList.remove('on'), 1400); }
function renderBar() { const bar = $('bar'); bar.innerHTML = ''; updTool(); S.bar.forEach((v, i) => { const b = document.createElement('button'); b.appendChild(icon(v)); if (i === S.sel) b.className = 'sel'; b.onclick = () => { A.ac(); S.sel = i; S.save(); renderBar(); showName(); A.tone(700, .04, 'sine', .04); if (MODE === 'break') setMode('build'); }; bar.appendChild(b); });
  const bg = document.createElement('button'); bg.className = 'bag'; bg.textContent = '🎒'; bg.onclick = openBag; bar.appendChild(bg); }
const CATS = [['n', T('🌿 טבע', '🌿 Nature')], ['b', T('🧱 בנייה', '🧱 Build')], ['c', T('🎨 צבעים', '🎨 Colors')], ['x', T('✨ מיוחדים', '✨ Special')], ['p', T('🌸 צמחים', '🌸 Plants')], ['st', T('🏠 מבנים מוכנים', '🏠 Quick builds')]]; let cat = 'b';
function openBag() { A.ac(); $('bagS').hidden = false; $('bagT').textContent = T('🎒 התיק של יאיא – בחרו חומר', '🎒 YaYa’s bag – pick a material'); renderBag(); }
function renderBag() { const tb = $('tabs'); tb.innerHTML = ''; for (const [k, n] of CATS) { const b = document.createElement('button'); b.textContent = n; b.setAttribute('aria-pressed', k === cat); b.onclick = () => { cat = k; renderBag(); }; tb.appendChild(b); }
  const gr = $('grid'); gr.innerHTML = ''; const items = cat === 'st' ? STAMPS.map(s => s.id) : B.filter(b => b && b.cat === cat).map(b => b.id);
  for (const v of items) { const b = document.createElement('button'); b.appendChild(icon(v, 88)); const s = document.createElement('span'); s.textContent = nameOf(v); b.appendChild(s); if (v === selVal()) b.className = 'sel'; b.onclick = () => pick(v); gr.appendChild(b); } }
function pick(v) { const i = S.bar.indexOf(v); if (i >= 0) S.sel = i; else { S.bar.splice(S.sel, 1, v); } S.save(); renderBar(); $('bagS').hidden = true; showName(); A.tone(800, .06, 'sine', .05); if (MODE === 'break') setMode('build'); if (isStamp(v)) tip(T('הקישו על הקרקע כדי להציב את ה', 'Tap the ground to place the ') + nameOf(v) + ' ' + STAMPS.find(s => s.id === v).ic, 3.5); }
$('bagX').onclick = () => $('bagS').hidden = true; $('bagS').onclick = e => { if (e.target === $('bagS')) $('bagS').hidden = true; };
function setMode(m) { MODE = m; S.mode = m; S.save(); $('bA').textContent = { build: '🧱', break: '⛏️', paint: '🖌️' }[m]; setTimeout(updTool, 0); for (const b of $('modes').children) b.setAttribute('aria-pressed', b.dataset.m === m); ghost.visible = false; }
$('modes').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; A.ac(); setMode(b.dataset.m); A.tone(600, .05, 'sine', .05); tip({ build: T('🧱 בנייה – הקישו כדי להוסיף בלוק', '🧱 Build – tap to add a block'), break: T('⛏️ הריסה – הקישו על בלוק כדי להוריד אותו', '⛏️ Remove – tap a block to take it away'), paint: T('🖌️ צביעה – הקישו על בלוק כדי להחליף לחומר שבחרתם', '🖌️ Paint – tap a block to swap it to your material') }[MODE], 2.5); };
{ const L = { build: T('בנייה', 'Build'), break: T('הריסה', 'Remove'), paint: T('צביעה', 'Paint') }; for (const b of $('modes').children) b.querySelector('small').textContent = L[b.dataset.m]; }

/* ================= FLOW ================= */
let state = 'load';
let tipT = 0; function tip(t, d = 4) { $('tip').querySelector('span').textContent = t; $('tip').classList.add('on'); tipT = d; }
function syncBtns() { $('fBtn').classList.toggle('on', PL.fly); $('bD').hidden = !PL.fly || !isTouch; $('dBtn').textContent = dayT ? '🌙' : '☀️'; }
function start() { A.ac(); state = 'play'; document.body.classList.add('play'); ['title', 'pauseS', 'newS'].forEach(i => $(i).hidden = true); ['hud', 'ctl', 'modes', 'bar'].forEach(i => $(i).hidden = false); $('joy').hidden = $('bJ').hidden = !isTouch; syncBtns(); renderBar(); setMode(MODE);
  if (!S.tut) { tip(T('🎯 כוונו את העיגול ולחצו על 🧱 כדי לבנות (או הקישו על המסך) · 🕹️ ג׳ויסטיק להליכה', '🎯 Aim the circle and press 🧱 to build (or tap the screen) · 🕹️ joystick to walk'), 6.5); setTimeout(() => state === 'play' && tip(T('🎒 בתיק יש עוד המון חומרים – וגם בתים, מגדלים וקשת מוכנים!', '🎒 The bag has lots more materials – plus ready-made houses, towers and a rainbow!'), 6), 7000); setTimeout(() => state === 'play' && tip(T('🕊️ כפתור התעופה עוזר לבנות דברים גבוהים · 🌙 לילה מדליק את המנורות', '🕊️ Fly helps you build tall things · 🌙 night lights up your lamps'), 6), 14500); S.tut = 1; S.save(); }
  A.startMusic({ chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], bpm: 76, lead: true, vol: .3 }); }
function toTitle() { state = 'title'; document.body.classList.remove('play'); hl.visible = ghost.visible = false; A.stopMusic(); ['hud', 'ctl', 'modes', 'bar', 'pauseS', 'bagS', 'newS'].forEach(i => $(i).hidden = true); $('title').hidden = false; renderTitle(); }
function renderTitle() { $('tSub').textContent = T('העולם הפתוח של יאיא – בונים כל מה שרוצים!', 'YaYa’s open world – build anything you like!'); $('rec').textContent = S.builds ? `🧱 ${S.builds} ${T('בלוקים נבנו', 'blocks built')}` : '';
  $('goBtn').textContent = S.builds ? T('▶ להמשיך לבנות', '▶ Keep building') : T('▶ לצאת לעולם', '▶ Enter the world'); $('newBtn').textContent = T('🌍 עולם חדש', '🌍 New world'); $('sndChip').textContent = S.mute ? T('🔇 צליל', '🔇 Sound') : T('🔊 צליל', '🔊 Sound'); }
function newWorld() { try { localStorage.removeItem(WKEY()); } catch (e) { } S.seed = 1 + Math.floor(Math.random() * 1e9); S.pos = null; S.builds = 0; S.save(); UNDO.length = 0; world.clear(); CH.length = 0; buildAll(); spawnAnimals(); PL.p.copy(SPAWN); PL.v.set(0, 0, 0); updCam(0, true); }
$('goBtn').onclick = start; $('newBtn').onclick = () => { A.ac(); $('nT').textContent = T('ליצור עולם חדש?', 'Create a new world?'); $('nP').textContent = T('העולם הנוכחי וכל מה שבניתם בו יימחקו.', 'This world and everything you built in it will be deleted.'); $('newS').hidden = false; };
$('nNo').onclick = () => $('newS').hidden = true; $('nYes').onclick = () => { $('newS').hidden = true; $('loading').hidden = false; setTimeout(() => { newWorld(); $('loading').hidden = true; renderTitle(); toast(T('🌍 נוצר עולם חדש!', '🌍 A new world is ready!')); }, 30); };
$('sndChip').onclick = () => { A.setMute(!S.mute); S.save(); renderTitle(); };
$('pBtn').onclick = () => { if (state !== 'play') return; state = 'pause'; saveWorld(); $('pT').textContent = T('הפסקה', 'Paused'); $('pP').textContent = T('העולם שלכם נשמר 💾', 'Your world is saved 💾'); $('pauseS').hidden = false; };
$('pGo').onclick = () => { $('pauseS').hidden = true; state = 'play'; }; $('pMenu').onclick = () => { saveWorld(); toTitle(); };
$('uBtn').onclick = () => { A.ac(); undo(); };
$('fBtn').onclick = () => { A.ac(); PL.fly = !PL.fly; S.fly = PL.fly ? 1 : 0; S.save(); if (PL.fly) PL.v.y = 4; syncBtns(); tip(PL.fly ? T('🕊️ מצב תעופה! ⤒ למעלה · ⤓ למטה', '🕊️ Flying! ⤒ up · ⤓ down') : T('🚶 חזרה להליכה', '🚶 Walking again'), 2.5); A.tone(PL.fly ? 600 : 400, .15, 'sine', .06, 0, PL.fly ? 1000 : 250); };
$('dBtn').onclick = () => { A.ac(); dayT = dayT ? 0 : 1; S.day = dayT; S.save(); syncBtns(); A.tone(dayT ? 660 : 330, .3, 'sine', .05, 0, dayT ? 880 : 220); };
for (const [id, he, en] of [['pGo', '▶ המשך', '▶ Resume'], ['pMenu', '🏠 תפריט', '🏠 Menu'], ['nNo', 'ביטול', 'Cancel'], ['nYes', '🌍 כן, עולם חדש', '🌍 Yes, new world']]) $(id).textContent = T(he, en);

/* ================= INPUT ================= */
(() => { const el = $('joy'), knob = el.querySelector('i'); let id = null, cx = 0, cy = 0; const RR = 46;
  el.addEventListener('pointerdown', e => { e.stopPropagation(); A.ac(); id = e.pointerId; el.setPointerCapture(id); const r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; mv(e); });
  const mv = e => { if (e.pointerId !== id) return; let dx = e.clientX - cx, dy = e.clientY - cy; const L = Math.hypot(dx, dy); if (L > RR) { dx *= RR / L; dy *= RR / L; } knob.style.transform = `translate(${dx}px,${dy}px)`; inp.x = dx / RR; inp.y = dy / RR; };
  el.addEventListener('pointermove', mv); const up = e => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; inp.x = inp.y = 0; }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  const hold = (b, on, off) => { b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); A.ac(); on(); b.classList.add('on'); }); const u = () => { off(); b.classList.remove('on'); }; b.addEventListener('pointerup', u); b.addEventListener('pointercancel', u); b.addEventListener('pointerleave', u); };
  hold($('bJ'), () => { inp.jump = 1; inp.jh = 1; }, () => inp.jh = 0);
  let rep = 0; hold($('bA'), () => { if (state !== 'play') return; doAct(aimHit(MODE), MODE); clearInterval(rep); rep = setInterval(() => { if (state === 'play' && !isStamp(selVal())) doAct(aimHit(MODE), MODE); }, 300); }, () => clearInterval(rep)); hold($('bD'), () => inp.down = 1, () => inp.down = 0);
  const lk = $('look'); const ptrs = new Map(); let pinch = 0;
  lk.addEventListener('pointerdown', e => { A.ac(); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), mv: 0, btn: e.button }); try { lk.setPointerCapture(e.pointerId); } catch (er) { } if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); ptrs.forEach(q => q.mv = 99); } });
  lk.addEventListener('pointermove', e => { const q = ptrs.get(e.pointerId); if (!q) { if (e.pointerType === 'mouse' && state === 'play') hover(e.clientX, e.clientY); return; } const dx = e.clientX - q.x, dy = e.clientY - q.y; q.x = e.clientX; q.y = e.clientY; q.mv = Math.max(q.mv, Math.hypot(q.x - q.sx, q.y - q.sy));
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) camDist0 = clamp(camDist0 * pinch / d, 2.5, 18); pinch = d; return; }
    if (q.mv > 8) { camYaw -= dx * .006; camPitch = clamp(camPitch + dy * .005, -.6, 1.35); } });
  const lu = e => { const q = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = 0; if (!q || state !== 'play') return; if (q.mv < 9 && performance.now() - q.t < 450) act(e.clientX, e.clientY, q.btn === 2); };
  lk.addEventListener('pointerup', lu); lk.addEventListener('pointercancel', e => ptrs.delete(e.pointerId)); lk.addEventListener('contextmenu', e => e.preventDefault());
  lk.addEventListener('wheel', e => { camDist0 = clamp(camDist0 * (e.deltaY > 0 ? 1.1 : .9), 2.5, 18); e.preventDefault(); }, { passive: false }); })();
const keys = {}; addEventListener('keydown', e => { if (keys[e.code]) return; keys[e.code] = 1; A.ac(); if (e.code === 'Space') { inp.jump = 1; inp.jh = 1; e.preventDefault(); } if (e.code === 'ShiftLeft') inp.down = 1;
  if (state === 'play') { if (e.code === 'KeyF') $('fBtn').onclick(); if (e.code === 'KeyB' || e.code === 'KeyE') $('bagS').hidden ? openBag() : ($('bagS').hidden = true); if (e.code === 'KeyZ') undo(); if (e.code === 'KeyR' || e.code === 'Enter') doAct(aimHit(MODE), MODE); if (e.code === 'KeyN') $('dBtn').onclick(); if (e.code === 'Digit1') setMode('build'); if (e.code === 'Digit2') setMode('break'); if (e.code === 'Digit3') setMode('paint'); }
  if (e.code === 'Escape' || e.code === 'KeyP') state === 'play' ? $('pBtn').onclick() : state === 'pause' && $('pGo').onclick(); kb(); });
addEventListener('keyup', e => { keys[e.code] = 0; if (e.code === 'Space') inp.jh = 0; if (e.code === 'ShiftLeft') inp.down = 0; kb(); });
addEventListener('wheel', () => { }, { passive: true });
function kb() { const any = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].some(k => keys[k]); if (!any && isTouch) return; inp.x = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0); inp.y = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0); }
document.addEventListener('visibilitychange', () => { if (document.hidden) { saveWorld(); if (state === 'play') $('pBtn').onclick(); A.stopMusic(); } });
addEventListener('pagehide', saveWorld);

/* ================= LOOP ================= */
let last = performance.now();
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.033, (now - last) / 1000); last = now; A.tick && A.tick(); const t = now / 1000;
  if (state === 'play') { stepPlayer(dt / 2); stepPlayer(dt / 2); updAim(); if (saveAt && now > saveAt) { saveAt = 0; saveWorld(); } }
  else if (state === 'title') { PL.v.set(0, 0, 0); }
  if (Math.abs(dayK - dayT) > .001) { dayK = lerp(dayK, dayT, Math.min(1, dt * 1.6)); applyDay(); }
  animHero(dt, t); stepAnimals(dt, t); updCam(dt); flushDirty(); actT = Math.max(0, actT - dt);
  if (hlT < 50) { hlT -= dt; if (hlT <= 0) hl.visible = false; }
  clouds.position.x = (t * .8) % 200; clouds.children.forEach(c => c.material.rotation = 0);
  if (state === 'play' && Math.random() < dt * 2.2) { const p = PL.p.clone().add(V3(rnd(-10, 10), rnd(.5, 3), rnd(-10, 10))); if (!get(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))) GL.emit(p, V3(rnd(-.4, .4), rnd(-.1, .2), rnd(-.4, .4)), dayK > .5 ? [[1.6, .8, 1.4], [1.6, 1.4, .3], [.6, 1.2, 1.8]][Math.floor(Math.random() * 3)] : [1.4, 1.6, .5], .05, 3, 0); }
  if (tipT > 0) { tipT -= dt; if (tipT <= 0) $('tip').classList.remove('on'); }
  FX.update(dt); GL.update(dt); E.render(); }
hubButtons(['homeT'], A); $('homeT').innerHTML = ICO.home('#1a5a2a'); qualityButton('qBtn', S);
if (EN) { document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr'; }
E.resize(); applyDay();
setTimeout(() => { buildAll(); spawnAnimals(); if (S.pos) PL.p.set(S.pos[0], S.pos[1], S.pos[2]); else PL.p.copy(SPAWN); if (boxHit(PL.p.x, PL.p.y, PL.p.z)) PL.p.copy(SPAWN); PL.face = camYaw + Math.PI; updCam(0, true); toTitle(); $('loading').hidden = true; requestAnimationFrame(frame); window.__yyOK = true; }, 30);
window.__yy = { PL, inp, get, setB, act, stamp, start, toTitle, updCam, undo, VOX, B, K, W, H, SEA, get state() { return state; }, set yaw(v) { camYaw = v; }, set pitch(v) { camPitch = v; }, set dist(v) { camDist0 = v; }, setMode, pick, get SPAWN() { return SPAWN; }, animals, petAnimal, newWorld, saveWorld, set day(v) { dayT = dayK = v; applyDay(); }, openBag, flushDirty, dirty, rayVox };
