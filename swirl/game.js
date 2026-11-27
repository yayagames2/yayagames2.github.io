import { THREE, $, V3, C, clamp, lerp, rnd, T, EN, store, engine, studioEnv, std, shadowAll, cnv, ctex, particles, CONFETTI, audio, toast, ICO, hubButtons, soundButton, qualityButton, cutie } from '../lib/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { loadMix, MixRig } from '../lib/mixchar.js';

/* ================= save / engine ================= */
const S = store('swirl-save', { coins: 0, served: 0, love: 0, unl: [], gal: [], hop: ['van', 'choc'], tut: {} });
for (const k of ['unl', 'gal']) if (!Array.isArray(S[k])) S[k] = [];
if (!Array.isArray(S.hop) || S.hop.length !== 2) S.hop = ['van', 'choc']; if (!S.tut || typeof S.tut !== 'object') S.tut = {};
const E = engine(S, { fov: 36, bloom: [.18, .5, 1.35], exposure: 1.0, bg: '#ffe3ec', preserve: true, vignette: .2, sat: 1.06 });
const { scene, camera, renderer } = E;
studioEnv(E, '#fff6fa', '#d8b0c4', .4, [[-4, 5, 5, 6, 4, 2.6], [5, 4, 3, 4, 4, 1.5], [0, 6.9, 0, 10, 10, .9], [0, 2, 6, 7, 2, .9], [-6, 2, -2, 3, 3, .8]]);
const A = audio(S); const FX = particles(E, 1400);
const TAU = Math.PI * 2;
const ease = p => { p = clamp(p, 0, 1); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
const eOut = p => 1 - Math.pow(1 - clamp(p, 0, 1), 3);
const pick = a => a[Math.floor(Math.random() * a.length)];
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rgb = h => { const c = C(h); return [c.r, c.g, c.b]; };

/* ================= data ================= */
const FLV = {
  van: { c: '#fff0cc', e: '🍦', n: T('וניל', 'Vanilla'), sp: '#2a1a10', spN: 5, bit: 'pod' },
  choc: { c: '#6a3a20', e: '🍫', n: T('שוקולד', 'Chocolate'), bit: 'chunk', bc: '#3a1d0e' },
  straw: { c: '#ffa0bb', e: '🍓', n: T('תות', 'Strawberry'), sp: '#d0203a', spN: 6, bit: 'berry' },
  mint: { c: '#aef0cf', e: '🌿', n: T('מנטה צ׳יפס', 'Mint chip'), sp: '#3a1d0e', spN: 9, bit: 'leaf' },
  mango: { c: '#ffc048', e: '🥭', n: T('מנגו', 'Mango'), bit: 'cube', bc: '#ff9a1a' },
  blue: { c: '#a898ff', e: '🫐', n: T('אוכמניות', 'Blueberry'), sp: '#4a2a9a', spN: 5, bit: 'ball', bc: '#4a3aa8' },
  banana: { c: '#fff08c', e: '🍌', n: T('בננה', 'Banana'), bit: 'disc', bc: '#fff6c0' },
  pist: { c: '#c4da88', e: '🥜', n: T('פיסטוק', 'Pistachio'), sp: '#5a7a20', spN: 6, bit: 'nut', bc: '#8ab040', price: 30 },
  cara: { c: '#d8984f', e: '🍯', n: T('קרמל', 'Caramel'), bit: 'cube', bc: '#b8651a', price: 40 },
  cookie: { c: '#ede6dc', e: '🍪', n: T('עוגיות ושמנת', 'Cookies & cream'), sp: '#241c18', spN: 14, bit: 'cookie', bc: '#241c18', price: 50 },
  cotton: { c: '#90d4ff', e: '🍭', n: T('שערות סבתא', 'Cotton candy'), bit: 'fluff', bc: '#ffb0e0', price: 60 },
  bubble: { c: '#ff9ade', e: '🫧', n: T('מסטיק', 'Bubblegum'), sp: '#3aa8ff', spN: 6, bit: 'ball', bc: '#ff6ab0', price: 70 },
};
const CONES = {
  waffle: { n: T('גביע וופל', 'Waffle cone') },
  cake: { n: T('גביע קלאסי', 'Classic cone') },
  cup: { n: T('כוס', 'Cup') },
  dip: { n: T('וופל בשוקולד', 'Choc-dipped'), price: 25 },
  party: { n: T('וופל צבעוני', 'Sprinkle cone'), price: 45 },
};
const TOP = {
  rainbow: { n: T('סוכריות צבעוניות', 'Rainbow sprinkles'), k: 'spr', cols: ['#ff3a5e', '#ffd02a', '#3ac8ff', '#6ad86a', '#ff8a2a', '#b87aff', '#ffffff'] },
  lentil: { n: T('עדשים', 'Choc lentils'), k: 'len', cols: ['#e8302a', '#ffc21a', '#2a72e8', '#2aa84a', '#ff7a1a', '#7a3a1a'] },
  chocsp: { n: T('סוכריות שוקולד', 'Choc sprinkles'), k: 'spr', cols: ['#4a2614', '#3a1c0c', '#5a3018'] },
  choc: { n: T('רוטב שוקולד', 'Choc sauce'), k: 'sau', cols: ['#3e1d0c'] },
  cherry: { n: T('דובדבן', 'Cherry'), k: 'big' },
  crumb: { n: T('פירורי עוגיות', 'Cookie crumbs'), k: 'crm', cols: ['#3a2a20', '#2a1e18', '#4a3626', '#5a4430'] },
  jelly: { n: T('סוכריות גומי', 'Jelly beans'), k: 'jel', cols: ['#ff3a5a', '#ffb21a', '#7ad02a', '#a84ae8', '#ff6ab0', '#3ab0ff'] },
  straws: { n: T('רוטב תות', 'Strawberry sauce'), k: 'sau', cols: ['#d0122c'], price: 15 },
  oreo: { n: T('עוגייה', 'Cookie'), k: 'big', price: 20 },
  wafer: { n: T('מקל וופל', 'Wafer stick'), k: 'big', price: 25 },
  marsh: { n: T('מרשמלו', 'Marshmallows'), k: 'msh', cols: ['#ffffff', '#ffd0e4', '#d0f0ff', '#fff2b0'], price: 30 },
  carsau: { n: T('רוטב קרמל', 'Caramel sauce'), k: 'sau', cols: ['#c8761c'], price: 35 },
  stars: { n: T('כוכבי סוכר', 'Sugar stars'), k: 'star', cols: ['#ffd23a', '#ff8ab0', '#ffffff', '#8ad8ff'], price: 40 },
  pearl: { n: T('פניני כסף', 'Silver pearls'), k: 'prl', cols: ['#eef2f8'], price: 50 },
};
const SIZES = { S: { u: 2.2, n: T('קטנה', 'Small'), d: '●' }, M: { u: 3.2, n: T('בינונית', 'Medium'), d: '●●' }, L: { u: 4.2, n: T('גדולה', 'Large'), d: '●●●' } };
const MAXU = 5.3;
const unl = id => { const [t, k] = id.split(':'); const o = t === 'f' ? FLV[k] : t === 'c' ? CONES[k] : TOP[k]; return !o.price || S.unl.includes(id); };
const priceOf = id => { const [t, k] = id.split(':'); return (t === 'f' ? FLV[k] : t === 'c' ? CONES[k] : TOP[k]).price || 0; };
const KIDS = [
  { n: T('נועה', 'Noa'), o: { skin: '#f6cfae', hair: '#5a3420', bun: 1, shirt: '#ff7ab0', pants: '#5a6ab0' }, p: 1.5 },
  { n: T('איתי', 'Itai'), o: { skin: '#e8b48c', hair: '#2a1a10', cap: '#3a8aff', shirt: '#ffd23a', pants: '#3b4b6b' }, p: 1.25 },
  { n: T('מאיה', 'Maya'), o: { skin: '#c98a62', hair: '#1a1010', shirt: '#a86aff', pants: '#2a2a4a' }, p: 1.45 },
  { n: T('יובל', 'Yuval'), o: { skin: '#f2c3a0', hair: '#c8782a', shirt: '#4ad08a', pants: '#3b4b6b', glasses: '#2a2a2a' }, p: 1.3 },
  { n: T('שירה', 'Shira'), o: { skin: '#8a5a3a', hair: '#1a1010', bun: 1, shirt: '#ff9a3a', pants: '#5a3a8a' }, p: 1.55 },
  { n: T('דניאל', 'Daniel'), o: { skin: '#f6d2b8', hair: '#e8c86a', shirt: '#3ab0ff', pants: '#2a3a5a' }, p: 1.2 },
  { n: T('תמר', 'Tamar'), o: { skin: '#e0a880', hair: '#8a3a1a', shirt: '#ffe04a', pants: '#ff6a8a' }, p: 1.5 },
  { n: T('עומר', 'Omer'), o: { skin: '#b87a52', hair: '#2a1a10', hat: '#ff5a5a', shirt: '#7a5aff', pants: '#2a2a3a' }, p: 1.28 },
  { n: T('אלה', 'Ella'), o: { skin: '#fbe0cc', hair: '#f0d090', shirt: '#7ad8ff', pants: '#ff8ab0' }, p: 1.6 },
  { n: T('בן', 'Ben'), o: { skin: '#6a4028', hair: '#1a1010', shirt: '#ff5a5a', pants: '#2a3a5a', glasses: '#c8306e' }, p: 1.18 },
];
const LINES = {
  hi: [T('😋 היי! אפשר בבקשה…', '😋 Hi! Can I please have…'), T('🤩 שלום! אני רוצה…', '🤩 Hello! I want…'), T('😄 יש! גלידה! אני רוצה…', '😄 Yay, ice cream! I’d like…')],
  love: [T('😍 וואו! הכי טעים בעולם!', '😍 Wow! Best ever!'), T('🤩 בדיוק מה שרציתי!', '🤩 Exactly what I wanted!'), T('💖 אתם הכי טובים!', '💖 You’re the best!'), T('😋 יאמי! עוד אחד מחר!', '😋 Yummy! Again tomorrow!')],
  like: [T('😊 טעים! תודה!', '😊 Tasty! Thanks!'), T('👍 ממש טוב!', '👍 Really good!'), T('😄 אהבתי!', '😄 I like it!')],
  meh: [T('🤔 זה בסדר…', '🤔 It’s okay…'), T('😐 לא בדיוק מה שביקשתי', '😐 Not quite what I asked for')],
  yuck: [T('🤢 איכס!', '🤢 Yuck!'), T('😫 ביקשתי משהו אחר!', '😫 I asked for something else!')],
};

/* ================= textures ================= */
function noiseNormal(N = 128, amp = 2.4, oct = 4) {
  const c = cnv(N, N), g = c.getContext('2d'), h = new Float32Array(N * N);
  for (let o = 0; o < oct; o++) { const f = 4 << o, a = 1 / (1 << o), grid = []; for (let i = 0; i < f * f; i++) grid.push(Math.random());
    const G = (i, j) => grid[((j % f + f) % f) * f + ((i % f + f) % f)];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const gx = x / N * f, gy = y / N * f, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      h[y * N + x] += a * lerp(lerp(G(x0, y0), G(x0 + 1, y0), sx), lerp(G(x0, y0 + 1), G(x0 + 1, y0 + 1), sx), sy); } }
  const id = g.createImageData(N, N), H = (i, j) => h[((j + N) % N) * N + ((i + N) % N)];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = (H(x + 1, y) - H(x - 1, y)) * amp, dy = (H(x, y + 1) - H(x, y - 1)) * amp, l = Math.hypot(dx, dy, 1), k = (y * N + x) * 4;
    id.data[k] = (-dx / l * .5 + .5) * 255; id.data[k + 1] = (-dy / l * .5 + .5) * 255; id.data[k + 2] = (1 / l * .5 + .5) * 255; id.data[k + 3] = 255; }
  g.putImageData(id, 0, 0); return ctex(c, 1, 1, false);
}
function grain(g, w, h, n, a, cols) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${pick(cols)},${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } }
function waffleCanvas(base = '#d8984a', line = '#9a5a22') {
  const c = cnv(256, 256), g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 256, 256); grain(g, 256, 256, 3000, .18, ['120,60,20', '255,225,170']);
  g.strokeStyle = line; g.lineWidth = 10; g.globalAlpha = .9;
  for (let k = -256; k <= 512; k += 43) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 256, 256); g.stroke(); g.beginPath(); g.moveTo(k, 256); g.lineTo(k + 256, 0); g.stroke(); }
  g.globalAlpha = .25; g.strokeStyle = '#ffe0a0'; g.lineWidth = 3; for (let k = -256; k <= 512; k += 43) { g.beginPath(); g.moveTo(k + 6, 0); g.lineTo(k + 262, 256); g.stroke(); }
  g.globalAlpha = 1; return c;
}
function cakeCanvas() { const c = cnv(256, 128), g = c.getContext('2d'); g.fillStyle = '#efcf90'; g.fillRect(0, 0, 256, 128); grain(g, 256, 128, 1200, .15, ['150,100,40', '255,240,200']);
  for (let x = 0; x < 256; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, 'rgba(160,100,40,.35)'); gr.addColorStop(.5, 'rgba(255,240,200,.25)'); gr.addColorStop(1, 'rgba(160,100,40,.35)'); g.fillStyle = gr; g.fillRect(x, 0, 16, 128); }
  g.fillStyle = 'rgba(150,90,30,.35)'; for (let y = 10; y < 128; y += 30) g.fillRect(0, y, 256, 3); return c; }
function cupCanvas() { const c = cnv(256, 128), g = c.getContext('2d'); for (let x = 0; x < 256; x += 32) { g.fillStyle = (x / 32) % 2 ? '#ffffff' : '#ff7ab0'; g.fillRect(x, 0, 32, 128); }
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 14); g.fillStyle = '#ffd23a'; for (let x = 8; x < 256; x += 32) { g.beginPath(); g.arc(x + 8, 70, 6, 0, TAU); g.fill(); } return c; }
function stripeCanvas(a, b, n = 8, w = 256, h = 256, vertical = true) { const c = cnv(w, h), g = c.getContext('2d'); for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; if (vertical) g.fillRect(i * w / n, 0, w / n + 1, h); else g.fillRect(0, i * h / n, w, h / n + 1); } return c; }
function brushed(base = '#d0d6dd') { const c = cnv(256, 256), g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { const v = Math.random() < .5 ? 255 : 90; g.fillStyle = `rgba(${v},${v},${v},${Math.random() * .08})`; g.fillRect(0, Math.random() * 256, 256, 1); } return c; }
function marble() { const c = cnv(512, 512), g = c.getContext('2d'); g.fillStyle = '#fbf8f6'; g.fillRect(0, 0, 512, 512); grain(g, 512, 512, 4000, .05, ['150,140,150', '255,255,255']);
  g.lineCap = 'round'; for (let k = 0; k < 14; k++) { let x = Math.random() * 512, y = Math.random() * 512, a = Math.random() * TAU; g.strokeStyle = `rgba(${pick(['190,170,185', '170,160,175', '220,190,205'])},${.25 + Math.random() * .35})`; g.lineWidth = .6 + Math.random() * 2.2; g.beginPath(); g.moveTo(x, y);
    for (let i = 0; i < 60; i++) { a += rnd(-.45, .45); x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); } g.stroke(); } return c; }
function txtCanvas(w, h, draw) { const c = cnv(w, h); draw(c.getContext('2d'), w, h); return c; }
const ICEN = noiseNormal(128, 2.6, 4);

/* ================= icons (2D) for UI ================= */
const ICON = {};
function icon(key, fn) { if (ICON[key]) return ICON[key]; const c = cnv(80, 80), g = c.getContext('2d'); fn(g); return ICON[key] = c.toDataURL(); }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function swirl2D(g, cx, cy, s, colA, colB) { const lay = [[0, 22, 16], [-13, 16, 13], [-24, 10, 10], [-32, 5, 6]];
  lay.forEach(([dy, w, h], i) => { const y = cy + dy * s; const gr = g.createLinearGradient(cx - w * s, y, cx + w * s, y); gr.addColorStop(0, colA); gr.addColorStop(.55, colB || colA); gr.addColorStop(1, colA); g.fillStyle = gr;
    g.beginPath(); g.ellipse(cx, y, w * s, h * s * .62, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(cx - w * s * .35, y - h * s * .2, w * s * .3, h * s * .14, -.2, 0, TAU); g.fill(); });
  g.fillStyle = colB || colA; g.beginPath(); g.moveTo(cx - 4 * s, cy - 34 * s); g.quadraticCurveTo(cx, cy - 46 * s, cx + 6 * s, cy - 38 * s); g.lineTo(cx + 3 * s, cy - 33 * s); g.fill(); }
function flavIcon(k) { const f = FLV[k]; return icon('f' + k, g => { g.fillStyle = '#d89a4a'; g.beginPath(); g.moveTo(26, 46); g.lineTo(54, 46); g.lineTo(40, 78); g.fill(); g.strokeStyle = '#9a5a22'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(28 + i * 7, 46); g.lineTo(40 + i * 3, 74); g.stroke(); }
  swirl2D(g, 40, 46, 1, f.c, f.c); if (f.sp) { g.fillStyle = f.sp; for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(rnd(24, 56), rnd(20, 48), 1.3, 0, TAU); g.fill(); } } }); }
function twistIcon(a, b) { return icon('tw' + a + b, g => { g.fillStyle = '#d89a4a'; g.beginPath(); g.moveTo(26, 46); g.lineTo(54, 46); g.lineTo(40, 78); g.fill(); swirl2D(g, 40, 46, 1, FLV[a].c, FLV[b].c); }); }
function coneIcon(k) { return icon('c' + k, g => {
  if (k === 'cup') { const gr = g.createLinearGradient(18, 0, 62, 0); gr.addColorStop(0, '#ff7ab0'); gr.addColorStop(.5, '#ffd0e4'); gr.addColorStop(1, '#ff7ab0'); g.fillStyle = gr; g.beginPath(); g.moveTo(16, 28); g.lineTo(64, 28); g.lineTo(56, 72); g.lineTo(24, 72); g.fill(); g.fillStyle = '#fff'; g.fillRect(15, 24, 50, 7); return; }
  if (k === 'cake') { g.fillStyle = '#efcf90'; g.beginPath(); g.moveTo(16, 20); g.lineTo(64, 20); g.lineTo(56, 40); g.lineTo(54, 72); g.lineTo(26, 72); g.lineTo(24, 40); g.fill(); g.strokeStyle = '#c09050'; g.lineWidth = 2; for (let x = 30; x < 54; x += 6) { g.beginPath(); g.moveTo(x, 42); g.lineTo(x, 70); g.stroke(); } return; }
  g.fillStyle = '#d8984a'; g.beginPath(); g.moveTo(16, 16); g.lineTo(64, 16); g.lineTo(40, 76); g.fill(); g.save(); g.clip(); g.strokeStyle = '#9a5a22'; g.lineWidth = 3; for (let i = -60; i < 80; i += 10) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 80, 80); g.stroke(); g.beginPath(); g.moveTo(i + 80, 0); g.lineTo(i, 80); g.stroke(); } g.restore();
  if (k === 'dip' || k === 'party') { g.fillStyle = k === 'dip' ? '#3e1d0c' : '#fff4f8'; g.beginPath(); g.moveTo(14, 14); g.lineTo(66, 14); g.lineTo(58, 34); g.quadraticCurveTo(48, 40, 40, 34); g.quadraticCurveTo(30, 40, 22, 34); g.fill();
    if (k === 'party') { for (let i = 0; i < 14; i++) { g.fillStyle = pick(TOP.rainbow.cols.slice(0, 6)); g.save(); g.translate(rnd(20, 60), rnd(17, 32)); g.rotate(rnd(0, 3)); g.fillRect(-3, -1, 6, 2.4); g.restore(); } } }
  g.fillStyle = '#c07a36'; rr(g, 14, 13, 52, 6, 3); g.fill(); }); }
function topIcon(k) { const t = TOP[k]; return icon('t' + k, g => {
  if (t.k !== 'sau' && t.k !== 'big') { g.fillStyle = '#fff4f8'; g.beginPath(); g.ellipse(40, 50, 30, 20, 0, 0, TAU); g.fill(); }
  const R = (a, b) => rnd(a, b);
  if (t.k === 'spr') for (let i = 0; i < 26; i++) { g.save(); g.translate(R(16, 64), R(34, 64)); g.rotate(R(0, 3.2)); g.fillStyle = pick(t.cols); rr(g, -6, -1.8, 12, 3.6, 1.8); g.fill(); g.restore(); }
  if (t.k === 'len') for (let i = 0; i < 12; i++) { const x = R(18, 62), y = R(34, 62); g.fillStyle = pick(t.cols); g.beginPath(); g.ellipse(x, y, 7.5, 6, R(0, 3), 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(x - 2, y - 2, 2, 0, TAU); g.fill(); }
  if (t.k === 'jel') for (let i = 0; i < 9; i++) { g.save(); g.translate(R(20, 60), R(36, 62)); g.rotate(R(0, 3)); g.fillStyle = pick(t.cols); rr(g, -8, -4.5, 16, 9, 4.5); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-4, -3, 6, 2); g.restore(); }
  if (t.k === 'crm') for (let i = 0; i < 18; i++) { g.fillStyle = pick(t.cols); g.beginPath(); const x = R(18, 62), y = R(34, 64); g.moveTo(x, y); for (let j = 0; j < 5; j++) g.lineTo(x + R(-5, 5), y + R(-5, 5)); g.fill(); }
  if (t.k === 'msh') for (let i = 0; i < 9; i++) { g.fillStyle = pick(t.cols); g.strokeStyle = 'rgba(0,0,0,.12)'; rr(g, R(16, 54), R(32, 56), 11, 9, 4); g.fill(); g.stroke(); }
  if (t.k === 'star') for (let i = 0; i < 9; i++) { g.fillStyle = pick(t.cols); g.save(); g.translate(R(20, 60), R(36, 62)); g.rotate(R(0, 3)); g.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? 3 : 7, a = j * Math.PI / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); g.restore(); }
  if (t.k === 'prl') for (let i = 0; i < 16; i++) { const x = R(18, 62), y = R(34, 64), gr = g.createRadialGradient(x - 1.5, y - 1.5, .5, x, y, 4.5); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#9aa4b4'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 4.5, 0, TAU); g.fill(); }
  if (t.k === 'sau') { g.fillStyle = t.cols[0]; g.beginPath(); g.moveTo(12, 22); g.quadraticCurveTo(40, 8, 68, 22); g.lineTo(68, 30); for (let x = 68; x >= 12; x -= 14) { const d = R(10, 34); g.quadraticCurveTo(x - 3, 30 + d, x - 7, 30 + d); g.quadraticCurveTo(x - 11, 30 + d, x - 14, 30); } g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(32, 20, 12, 3, -.1, 0, TAU); g.fill(); }
  if (k === 'cherry') { g.strokeStyle = '#3a6a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(42, 40); g.quadraticCurveTo(46, 18, 60, 10); g.stroke(); const gr = g.createRadialGradient(34, 46, 3, 40, 52, 20); gr.addColorStop(0, '#ff6a7a'); gr.addColorStop(1, '#a8001a'); g.fillStyle = gr; g.beginPath(); g.arc(40, 54, 18, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(33, 47, 5, 3, -.6, 0, TAU); g.fill(); }
  if (k === 'oreo') { g.fillStyle = '#1e1a1a'; g.beginPath(); g.arc(40, 40, 26, 0, TAU); g.fill(); g.strokeStyle = '#3a3434'; g.lineWidth = 2; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.moveTo(40 + Math.cos(a) * 8, 40 + Math.sin(a) * 8); g.lineTo(40 + Math.cos(a) * 22, 40 + Math.sin(a) * 22); g.stroke(); } g.fillStyle = '#f4f0ea'; g.fillRect(14, 60, 52, 6); g.fillStyle = '#1e1a1a'; g.fillRect(14, 66, 52, 6); }
  if (k === 'wafer') { g.save(); g.translate(40, 40); g.rotate(-.7); g.fillStyle = '#e8b870'; rr(g, -34, -7, 68, 14, 7); g.fill(); g.strokeStyle = '#a8702a'; g.lineWidth = 2; for (let x = -30; x < 34; x += 8) { g.beginPath(); g.moveTo(x, -7); g.lineTo(x + 6, 7); g.stroke(); } g.restore(); }
}); }
const sizeIcon = s => icon('s' + s, g => { const u = SIZES[s].u; const sc = .6 + u * .11; g.fillStyle = '#d8984a'; g.beginPath(); g.moveTo(26, 50); g.lineTo(54, 50); g.lineTo(40, 78); g.fill(); swirl2D(g, 40, 50, sc * .9, '#fff0cc', '#fff6e0'); });

/* ================= room ================= */
const TOPY = 1.0;
const hemi = new THREE.HemisphereLight(C('#fff6fa'), C('#c89aa8'), .55); scene.add(hemi);
const key = new THREE.DirectionalLight(C('#fff2e6'), 2.3); key.position.set(-2.0, 5.4, 3.8); key.castShadow = true;
key.shadow.mapSize.set(E.q === 'ultra' ? 2048 : 1024, E.q === 'ultra' ? 2048 : 1024); Object.assign(key.shadow.camera, { left: -2.6, right: 3.6, top: 2.6, bottom: -1.2, near: 1, far: 14 }); key.shadow.bias = -.0003; key.shadow.normalBias = .012;
key.target.position.set(.6, 1.2, 0); scene.add(key, key.target);
const fillL = new THREE.DirectionalLight(C('#e8f2ff'), .6); fillL.position.set(3, 2.5, 3); scene.add(fillL);
const rimL = new THREE.DirectionalLight(C('#ffe0f0'), .55); rimL.position.set(.5, 3, -3); scene.add(rimL);
function buildRoom() {
  const R = new THREE.Group(); scene.add(R);
  const fc = cnv(128, 128), fg = fc.getContext('2d'); for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { fg.fillStyle = (x + y) % 2 ? '#ff9ac4' : '#fff6fa'; fg.fillRect(x * 64, y * 64, 64, 64); }
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), std('#ffffff', { map: ctex(fc, 16, 10), roughness: .35 })); fl.rotation.x = -Math.PI / 2; fl.position.z = 2; fl.receiveShadow = true; R.add(fl);
  const wc = txtCanvas(256, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffe4ee' : '#fff6f0'; g.fillRect(i * 32, 0, 32, h); } g.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 8; i++) g.fillRect(i * 32 + 2, 0, 2, h); });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), std('#ffffff', { map: ctex(wc, 9, 1), roughness: .9 })); wall.position.set(0, 3, -.72); wall.receiveShadow = true; R.add(wall);
  const tile = txtCanvas(128, 128, (g) => { g.fillStyle = '#bff0dc'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#9ad8c0'; g.fillRect(0, 62, 128, 4); g.fillRect(62, 0, 4, 128); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(6, 6, 50, 8); g.fillRect(70, 70, 50, 8); });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(16, .9), std('#ffffff', { map: ctex(tile, 40, 2.2), roughness: .3, metalness: .05 })); back.position.set(0, TOPY + .45, -.715); back.receiveShadow = true; R.add(back);
  // counter
  const cf = txtCanvas(256, 128, (g) => { g.fillStyle = '#ffb6d2'; g.fillRect(0, 0, 256, 128); for (let x = 0; x < 256; x += 32) { g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x, 0, 3, 128); g.fillStyle = 'rgba(160,40,90,.18)'; g.fillRect(x + 28, 0, 4, 128); } });
  const ctr = new THREE.Mesh(new THREE.BoxGeometry(7, TOPY - .04, 1.45), std('#ffffff', { map: ctex(cf, 6, 1), roughness: .5 })); ctr.position.set(0, (TOPY - .04) / 2, -.02); ctr.receiveShadow = ctr.castShadow = true; R.add(ctr);
  const top = new THREE.Mesh(new RoundedBoxGeometry(7.1, .05, 1.52, 2, .02), new THREE.MeshPhysicalMaterial({ map: ctex(marble(), 3, 1), roughness: .18, clearcoat: .6, clearcoatRoughness: .2 })); top.position.set(0, TOPY - .025, -.02); top.receiveShadow = true; R.add(top);
  const kick = new THREE.Mesh(new THREE.BoxGeometry(7, .1, .1), std('#e86aa0', { roughness: .4 })); kick.position.set(0, .05, .66); R.add(kick);
  // menu board
  const mb = txtCanvas(512, 320, (g, w, h) => { g.fillStyle = '#3a2a3a'; rr(g, 0, 0, w, h, 26); g.fill(); g.strokeStyle = '#ffd0e4'; g.lineWidth = 10; rr(g, 8, 8, w - 16, h - 16, 20); g.stroke();
    g.fillStyle = '#ffd23a'; g.font = '900 46px Arial'; g.textAlign = 'center'; g.fillText('ICE CREAM', w / 2, 62);
    const ks = ['van', 'choc', 'straw', 'mint', 'mango', 'blue']; ks.forEach((k, i) => { const x = 70 + (i % 3) * 186, y = 150 + Math.floor(i / 3) * 112; g.fillStyle = '#d8984a'; g.beginPath(); g.moveTo(x - 18, y); g.lineTo(x + 18, y); g.lineTo(x, y + 44); g.fill(); swirl2D(g, x, y, 1.05, FLV[k].c, FLV[k].c);
      g.fillStyle = '#fff'; g.font = '800 26px Arial'; g.textAlign = 'left'; g.fillText('★'.repeat(1 + i % 3), x + 32, y + 14); }); });
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .94), std('#ffffff', { map: ctex(mb), roughness: .6 })); menu.position.set(-1.65, 2.55, -.7); R.add(menu);
  // shelf with topping jars
  const sh = new THREE.Mesh(new RoundedBoxGeometry(1.6, .05, .26, 2, .02), std('#ffffff', { roughness: .4 })); sh.position.set(1.7, 2.1, -.58); sh.castShadow = true; R.add(sh);
  const jarM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .05, transmission: E.q === 'ultra' ? .9 : 0, transparent: true, opacity: .35, thickness: .02, metalness: 0 });
  [['#ff4a6a', '#3ac8ff', '#ffd02a'], ['#3e1d0c'], ['#e8302a', '#2a72e8', '#ffc21a'], ['#ffffff', '#ffd0e4'], ['#ffd23a']].forEach((cols, i) => {
    const x = 1.08 + i * .31, j = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .24, 24), jarM); j.position.set(x, 2.25, -.58); R.add(j);
    const fillg = new THREE.Mesh(new THREE.CylinderGeometry(.092, .092, .17, 20), std(cols[0], { roughness: .6 })); fillg.position.set(x, 2.215, -.58); R.add(fillg);
    if (cols.length > 1) { const cc = txtCanvas(64, 64, g => { g.fillStyle = cols[0]; g.fillRect(0, 0, 64, 64); for (let k = 0; k < 120; k++) { g.fillStyle = pick(cols); g.fillRect(Math.random() * 64, Math.random() * 64, 5, 2.4); } }); fillg.material = std('#fff', { map: ctex(cc, 2, 1), roughness: .6 }); }
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(.104, .104, .03, 24), std(['#ff7ab0', '#7ad8ff', '#ffd23a', '#9ae0a0', '#c8a0ff'][i], { roughness: .35 })); lid.position.set(x, 2.385, -.58); R.add(lid); });
  // lamp glow strip
  const neon = txtCanvas(512, 128, (g, w, h) => { g.font = '900 82px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff5fa2'; g.shadowBlur = 18; g.fillStyle = '#ffe0f0'; g.fillText('SWIRL SHOP', w / 2, h / 2); });
  const nm = new THREE.Mesh(new THREE.PlaneGeometry(1.7, .42), new THREE.MeshBasicMaterial({ map: ctex(neon), transparent: true, toneMapped: false, color: C('#ffffff').multiplyScalar(1.5) })); nm.position.set(1.7, 2.75, -.7); R.add(nm);
  return R;
}
buildRoom();

/* ================= machine ================= */
const NOZY = 1.555, SPX = [-.26, 0, .26], SPZ = .2;
const stainless = new THREE.MeshStandardMaterial({ color: C('#dfe4ea'), metalness: .88, roughness: .3, map: ctex(brushed(), 1, 1) });
const chrome = new THREE.MeshStandardMaterial({ color: C('#f4f6f8'), metalness: 1, roughness: .1 });
const paint = new THREE.MeshPhysicalMaterial({ color: C('#ff9cc6'), metalness: .25, roughness: .3, clearcoat: .8, clearcoatRoughness: .15 });
const dark = std('#2a2430', { roughness: .5 });
const M = { levers: [], liq: [], lids: [], agit: [], frost: [], hopCol: [C(FLV[S.hop[0]].c), C(FLV[S.hop[1]].c)], hopLvl: [.75, .75] };
function buildMachine() {
  const g = new THREE.Group(); scene.add(g);
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.02, 1.0, .72, 4, .07), paint); body.position.set(0, TOPY + .5, -.27); g.add(body);
  const front = new THREE.Mesh(new RoundedBoxGeometry(.9, .94, .04, 3, .015), stainless); front.position.set(0, TOPY + .5, .08); g.add(front);
  // recess (dispense well)
  const well = new THREE.Mesh(new RoundedBoxGeometry(.84, .54, .03, 3, .02), std('#c8ced6', { metalness: .7, roughness: .45 })); well.position.set(0, TOPY + .3, .095); g.add(well);
  // feet
  for (const x of [-.42, .42]) for (const z of [-.55, .0]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(.03, .035, .02, 12), dark); f.position.set(x, TOPY + .005, z); g.add(f); }
  // top deck + hopper tubs
  const deck = new THREE.Mesh(new RoundedBoxGeometry(1.0, .05, .7, 3, .02), stainless); deck.position.set(0, TOPY + 1.0, -.27); g.add(deck);
  for (let i = 0; i < 2; i++) { const x = i ? .24 : -.24, z = -.3;
    const tub = new THREE.Mesh(new THREE.CylinderGeometry(.17, .16, .2, 40, 1, true), new THREE.MeshStandardMaterial({ color: C('#e8ecf0'), metalness: .9, roughness: .22, side: THREE.DoubleSide })); tub.position.set(x, TOPY + 1.12, z); g.add(tub);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(.17, .008, 8, 48), chrome); lip.rotation.x = Math.PI / 2; lip.position.set(x, TOPY + 1.22, z); g.add(lip);
    const bot = new THREE.Mesh(new THREE.CircleGeometry(.16, 32), std('#9aa2ac', { metalness: .8, roughness: .4 })); bot.rotation.x = -Math.PI / 2; bot.position.set(x, TOPY + 1.03, z); g.add(bot);
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(.158, .158, .01, 40), new THREE.MeshPhysicalMaterial({ color: M.hopCol[i], roughness: .25, clearcoat: .6, sheen: .3 })); liq.position.set(x, TOPY + 1.04 + .15 * M.hopLvl[i], z); g.add(liq); M.liq.push(liq);
    const ag = new THREE.Group(); ag.position.set(x, TOPY + 1.03, z); g.add(ag); const rod = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .16, 8), chrome); rod.position.y = .08; ag.add(rod);
    for (let k = 0; k < 2; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(.2, .012, .03), chrome); bl.position.y = .04 + k * .07; bl.rotation.y = k * 1.2; ag.add(bl); } M.agit.push(ag);
    const fr = new THREE.Mesh(new THREE.CylinderGeometry(.172, .162, .2, 40, 1, true), new THREE.MeshStandardMaterial({ color: C('#ffffff'), transparent: true, opacity: 0, roughness: .9, depthWrite: false, map: ctex(frostCanvas()) })); fr.position.copy(tub.position); g.add(fr); M.frost.push(fr);
    const lid = new THREE.Group(); lid.position.set(x, TOPY + 1.225, z - .17); g.add(lid);
    const lm = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .02, 40), new THREE.MeshPhysicalMaterial({ color: C('#ffffff'), roughness: .1, transmission: 0, transparent: true, opacity: .55, clearcoat: 1 })); lm.position.z = .17; lid.add(lm);
    const kn = new THREE.Mesh(new THREE.SphereGeometry(.025, 16, 10), std(i ? '#7ad8ff' : '#ff7ab0', { roughness: .3 })); kn.position.set(0, .02, .3); lid.add(kn); M.lids.push(lid); }
  // display / logo strip
  const ledC = cnv(256, 80); M.ledC = ledC; M.ledT = ctex(ledC); const led = new THREE.Mesh(new THREE.PlaneGeometry(.3, .094), new THREE.MeshBasicMaterial({ map: M.ledT, toneMapped: false })); led.position.set(.2, TOPY + .87, .102); g.add(led);
  const bez = new THREE.Mesh(new RoundedBoxGeometry(.33, .12, .02, 2, .008), dark); bez.position.set(.2, TOPY + .87, .092); g.add(bez);
  const logo = txtCanvas(256, 96, (x, w, h) => { x.fillStyle = '#ff5fa2'; x.font = '900 46px Arial'; x.textAlign = 'center'; x.fillText('YAYA', w / 2, 46); x.fillStyle = '#5a6a7a'; x.font = '800 22px Arial'; x.fillText('SOFT SERVE', w / 2, 80); });
  const lg = new THREE.Mesh(new THREE.PlaneGeometry(.3, .112), new THREE.MeshStandardMaterial({ map: ctex(logo), transparent: true, roughness: .4 })); lg.position.set(-.2, TOPY + .87, .102); g.add(lg);
  const btnCols = ['#5ad87a', '#ffd23a', '#ff5a5a']; btnCols.forEach((c, i) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .012, 16), new THREE.MeshStandardMaterial({ color: C(c), emissive: C(c), emissiveIntensity: .25, roughness: .3 })); b.rotation.x = Math.PI / 2; b.position.set(.04 + i * .0, TOPY + .9 - i * .03, .104); b.position.x = -.03; b.position.y = TOPY + .91 - i * .028; g.add(b); if (i === 0) M.pwr = b; });
  // freezer door + spouts + levers
  const door = new THREE.Mesh(new RoundedBoxGeometry(.8, .17, .16, 3, .03), chrome); door.position.set(0, TOPY + .66, .16); g.add(door);
  for (const x of [-.26, .26]) { const knob = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .03, 24), chrome); knob.rotation.x = Math.PI / 2; knob.position.set(x * 1.45, TOPY + .66, .25); g.add(knob); }
  const starProfile = (r, n = 8) => { const s = new THREE.Shape(); for (let i = 0; i <= 32; i++) { const a = i / 32 * TAU, rr2 = r * (1 + .16 * Math.cos(n * a)); const px = Math.cos(a) * rr2, py = Math.sin(a) * rr2; i ? s.lineTo(px, py) : s.moveTo(px, py); } return s; };
  SPX.forEach((x, i) => {
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(.03, .036, .05, 24), chrome); sp.position.set(x, NOZY + .045, SPZ); g.add(sp);
    const nz = new THREE.Mesh(new THREE.ExtrudeGeometry(starProfile(.024), { depth: .022, bevelEnabled: false }), chrome); nz.rotation.x = Math.PI / 2; nz.position.set(x, NOZY + .022, SPZ); g.add(nz);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(.016, 16), dark); hole.rotation.x = Math.PI / 2; hole.position.set(x, NOZY - .001, SPZ); g.add(hole);
    const lv = new THREE.Group(); lv.position.set(x, TOPY + .74, SPZ + .02); g.add(lv);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(.013, .017, .25, 12), chrome); arm.position.y = .125; lv.add(arm);
    const kb = new THREE.Mesh(new THREE.SphereGeometry(.03, 20, 14), new THREE.MeshPhysicalMaterial({ color: C(['#ff7ab0', '#ffffff', '#7ad8ff'][i]), roughness: .2, clearcoat: 1 })); kb.scale.set(1.25, 1.55, 1.25); kb.position.y = .265; lv.add(kb); lv.userData.knob = kb;
    lv.rotation.x = -.18; lv.userData.k = 0; M.levers.push(lv);
  });
  // drip tray
  const tray = new THREE.Mesh(new RoundedBoxGeometry(.86, .04, .32, 2, .012), chrome); tray.position.set(0, TOPY + .02, .2); g.add(tray);
  const grate = txtCanvas(128, 64, (x) => { x.fillStyle = '#c8ced6'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#3a3a44'; for (let i = 4; i < 128; i += 10) x.fillRect(i, 4, 5, 56); });
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(.8, .28), new THREE.MeshStandardMaterial({ map: ctex(grate, 4, 1), metalness: .8, roughness: .3 })); gr.rotation.x = -Math.PI / 2; gr.position.set(0, TOPY + .041, .2); g.add(gr);
  // side vents
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const v = new THREE.Mesh(new THREE.BoxGeometry(.005, .02, .34), dark); v.position.set(s * .512, TOPY + .25 + k * .05, -.3); g.add(v); }
  shadowAll(g, true, true); M.liq.forEach(m => m.castShadow = false); M.frost.forEach(m => { m.castShadow = false; m.receiveShadow = false; });
  M.g = g; ledText('READY', '#7af0ff');
}
function frostCanvas() { return txtCanvas(128, 64, (x) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 64); for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(190,225,255,${Math.random() * .6})`; x.fillRect(Math.random() * 128, Math.random() * 64, 2, 2); } }); }
function ledText(t, col = '#7af0ff', sub = '') { const g = M.ledC.getContext('2d'); g.fillStyle = '#0c1418'; g.fillRect(0, 0, 256, 80); g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 10; g.font = '900 40px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 128, sub ? 30 : 42); if (sub) { g.font = '700 20px monospace'; g.fillText(sub, 128, 64); } g.shadowBlur = 0; M.ledT.needsUpdate = true; }
buildMachine();

// cone holder (under the spouts) + topping stand
const holder = new THREE.Group(); scene.add(holder);
{ const rod = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, 1, 10), chrome); rod.position.y = -.5; rod.name = 'rod'; holder.add(rod);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.064, .007, 8, 32), chrome); ring.rotation.x = Math.PI / 2; holder.add(ring);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .064, 8), chrome); arm.rotation.z = Math.PI / 2; arm.position.x = 0; arm.position.z = -.064; arm.rotation.set(Math.PI / 2, 0, 0); arm.position.set(0, 0, -.032); holder.add(arm); shadowAll(holder); }
const STAND = V3(0, TOPY, .52);
const stand = new THREE.Group(); stand.position.copy(STAND); scene.add(stand);
{ const base = new THREE.Mesh(new THREE.CylinderGeometry(.11, .13, .03, 40), chrome); base.position.y = .015; stand.add(base);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, .14, 12), chrome); rod.position.y = .1; stand.add(rod);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.064, .008, 10, 40), chrome); ring.rotation.x = Math.PI / 2; ring.position.y = .17; stand.add(ring); shadowAll(stand); stand.visible = false; }

/* ================= soft serve swirl ================= */
const SPT = 92, MAXS = 640, K = 32, KR = K + 1, TR0 = .036, R0 = .061;
const iceMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: .4, clearcoat: .3, clearcoatRoughness: .35, sheen: .35, sheenRoughness: .5, sheenColor: C('#ffffff'), normalMap: ICEN, normalScale: new THREE.Vector2(.32, .32) });
const bitGeo = new THREE.SphereGeometry(1, 6, 4); const bitMat = std('#ffffff', { roughness: .6 });
class Swirl {
  constructor() {
    const g = new THREE.BufferGeometry(); this.g = g;
    this.P = new Float32Array(MAXS * KR * 3); this.N = new Float32Array(MAXS * KR * 3); this.Cc = new Float32Array(MAXS * KR * 3); this.U = new Float32Array(MAXS * KR * 2);
    g.setAttribute('position', new THREE.BufferAttribute(this.P, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('normal', new THREE.BufferAttribute(this.N, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.Cc, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('uv', new THREE.BufferAttribute(this.U, 2).setUsage(THREE.DynamicDrawUsage));
    const idx = []; for (let i = 0; i < MAXS - 1; i++) for (let k = 0; k < K; k++) { const a = i * KR + k, b = a + KR, c = b + 1, d = a + 1; idx.push(a, c, b, a, d, c); } g.setIndex(idx); g.setDrawRange(0, 0);
    g.boundingSphere = new THREE.Sphere(V3(0, .15, 0), .5); g.boundingBox = new THREE.Box3(V3(-.2, -.1, -.2), V3(.2, .45, .2));
    this.mesh = new THREE.Mesh(g, iceMat); this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    this.bits = new THREE.InstancedMesh(bitGeo, bitMat, 900); this.bits.count = 0; this.bits.frustumCulled = false; this.mesh.add(this.bits);
    this.reset();
  }
  reset(cols = ['#fff0cc'], sp = [null]) { this.n = 0; this.u = 0; this.tipV = 0; this.done = false; this.cols = cols.map(c => C(c)); this.sp = sp; this.ox = 0; this.oz = 0; this.wob = 0; this.wn = 0;
    this.Tp = V3(1, 0, 0); this.Np = V3(0, 1, 0); this.last = null; this.tipK = undefined; this.g.setDrawRange(0, 0); this.bits.count = 0; this.top = V3(0, .02, 0); this.end = V3(); this.endTr = TR0; }
  center(u, tip) { // u turns of body, tip 0..1
    let ub = tip > 0 ? this.uRel : u; const rc0 = R0 * Math.max(.12, 1 - .165 * ub), tr0 = TR0 * (1 - .075 * ub), y0 = TR0 * .55 + TR0 * 1.52 * (ub - .04 * ub * ub);
    if (!(tip > 0)) { const st = u < .1 ? .35 + .65 * sstep(0, .1, u) : 1; const ph = u * TAU; return { c: V3(Math.cos(ph) * rc0 + this.ox, y0, -Math.sin(ph) * rc0 + this.oz), tr: tr0 * st, ph }; }
    const v = tip, ph = (ub + .78 * v) * TAU, rc = rc0 * Math.pow(1 - v, 1.4), tr = tr0 * Math.max(.06, 1 - .9 * Math.pow(v, 1.25));
    const c = V3(Math.cos(ph) * rc + this.ox, y0 + tr0 * 1.75 * eOut(v), -Math.sin(ph) * rc + this.oz);
    if (v > .72) { const w = (v - .72) / .28; c.x += Math.cos(ph + 1.2) * tr0 * .7 * w; c.z -= Math.sin(ph + 1.2) * tr0 * .7 * w; c.y -= tr0 * .45 * w * w; }
    return { c, tr, ph };
  }
  addSample(s) {
    if (this.n >= MAXS) return; const i = this.n, c = s.c;
    let Tn; if (this.last) { Tn = c.clone().sub(this.last); if (Tn.lengthSq() < 1e-10) Tn.copy(this.Tp); Tn.normalize(); } else Tn = V3(-Math.sin(s.ph), 0, -Math.cos(s.ph));
    const Nn = this.Np.clone().addScaledVector(Tn, -this.Np.dot(Tn)); if (Nn.lengthSq() < 1e-8) Nn.set(0, 1, 0); Nn.normalize(); const Bn = V3().crossVectors(Tn, Nn);
    if (i === 1) { // fix first ring orientation
      const j = 0; this.writeRing(j, this.first.c, this.first.tr, Tn, Nn, Bn, 0); }
    this.writeRing(i, c, s.tr, Tn, Nn, Bn, i);
    this.Tp.copy(Tn); this.Np.copy(Nn); this.last = c.clone(); if (i === 0) this.first = s;
    this.n++; this.g.setDrawRange(0, Math.max(0, this.n - 1) * K * 6);
    for (const k of ['position', 'normal', 'color', 'uv']) this.g.attributes[k].needsUpdate = true;
    if (c.y + s.tr * .8 > this.top.y) this.top.set(c.x, c.y + s.tr * .8, c.z); this.end.copy(c); this.endTr = s.tr;
  }
  writeRing(i, c, tr, Tn, Nn, Bn, si) {
    const twist = this.cols.length > 1; const P = this.P, Nm = this.N, Cc = this.Cc, U = this.U;
    const shade = .97 + .03 * Math.sin(si * .7);
    for (let k = 0; k <= K; k++) { const th = k / K * TAU, ct = Math.cos(th), st = Math.sin(th);
      const pr = tr * (1 + .12 * Math.cos(8 * th)), dpr = -tr * .96 * Math.sin(8 * th);
      const px = pr * ct * .84, py = pr * st * 1.06; // squash vertical (N) a bit
      const tx = (dpr * ct - pr * st) * .84, ty = (dpr * st + pr * ct) * 1.06; let nx = ty, ny = -tx; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const o = (i * KR + k) * 3;
      P[o] = c.x + Nn.x * px + Bn.x * py; P[o + 1] = c.y + Nn.y * px + Bn.y * py; P[o + 2] = c.z + Nn.z * px + Bn.z * py;
      Nm[o] = Nn.x * nx + Bn.x * ny; Nm[o + 1] = Nn.y * nx + Bn.y * ny; Nm[o + 2] = Nn.z * nx + Bn.z * ny;
      let col = this.cols[0], w = 0;
      if (twist) { const ph = k / K + si / 64; w = sstep(-.06, .06, Math.sin(ph * TAU)); }
      const ridge = .9 + .1 * Math.cos(8 * th), ao = .8 + .2 * sstep(-.6, .6, ct);
      const f = ridge * ao * shade, cA = this.cols[0], cB = this.cols[1] || cA;
      Cc[o] = lerp(cA.r, cB.r, w) * f; Cc[o + 1] = lerp(cA.g, cB.g, w) * f; Cc[o + 2] = lerp(cA.b, cB.b, w) * f;
      const uo = (i * KR + k) * 2; U[uo] = si / 22; U[uo + 1] = k / K * 2;
      // flavor specks
      const spc = twist ? this.sp[w > .5 ? 1 : 0] : this.sp[0];
      if (spc && k < K && i > 2 && this.bits.count < 900 && Math.random() < spc.n / 400 && ct > -.3) { const m = new THREE.Matrix4(), s = rnd(.0028, .0052) * (spc.big || 1);
        m.compose(V3(P[o] + Nm[o] * .0005, P[o + 1] + Nm[o + 1] * .0005, P[o + 2] + Nm[o + 2] * .0005), new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(0, 3), rnd(0, 3), 0)), V3(s, s * .55, s * 1.2));
        this.bits.setMatrixAt(this.bits.count, m); this.bits.setColorAt(this.bits.count, C(spc.c)); this.bits.count++; this.bits.instanceMatrix.needsUpdate = true; if (this.bits.instanceColor) this.bits.instanceColor.needsUpdate = true; }
    }
  }
  grow(du, ox, oz) { // advance body
    if (this.done) return; const target = Math.min(MAXU, this.u + du); this.ox = ox; this.oz = oz;
    if (!this.n) this.addSample(this.center(0, 0));
    while ((this.n) / SPT <= target && this.n < MAXS - 80) { const u = this.n / SPT; this.addSample(this.center(u, 0)); this.wob += Math.hypot(ox, oz); this.wn++; }
    this.u = target;
  }
  tip(dv) { if (this.done) return true; if (!this.n) this.addSample(this.center(0, 0)); if (this.tipV === 0) { this.uRel = Math.max(.05, (this.n - 1) / SPT); }
    const tn = 70; let v0 = this.tipV; this.tipV = Math.min(1, this.tipV + dv);
    while (this.tipK === undefined || this.tipK < Math.round(this.tipV * tn)) { this.tipK = (this.tipK || 0) + 1; if (this.n < MAXS) this.addSample(this.center(0, this.tipK / tn)); else break; }
    if (this.tipV >= 1) { this.done = true; this.tipK = undefined; return true; } return false; }
  wobble() { return this.wn ? this.wob / this.wn : 0; }
}

/* ================= cone + ice group ================= */
const CH = .26; // cone height
const waffleTex = ctex(waffleCanvas(), 5, 3), wafflePale = ctex(waffleCanvas('#e8b468', '#b0702c'), 5, 3);
const coneMats = {
  waffle: new THREE.MeshStandardMaterial({ map: waffleTex, bumpMap: waffleTex, bumpScale: 2.2, roughness: .75 }),
  cake: new THREE.MeshStandardMaterial({ map: ctex(cakeCanvas(), 3, 1), roughness: .7 }),
  cup: new THREE.MeshPhysicalMaterial({ map: ctex(cupCanvas(), 2, 1), roughness: .45, clearcoat: .4, side: THREE.DoubleSide }),
  choc: new THREE.MeshPhysicalMaterial({ color: '#3a1a0a', roughness: .22, clearcoat: .8 }),
  white: new THREE.MeshPhysicalMaterial({ color: '#fff3f6', roughness: .25, clearcoat: .7 }),
};
function lathe(pts, segs = 48) { return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), segs); }
const CONEG = {
  waffle: lathe([[0, 0], [.012, .012], [.081, CH - .012], [.088, CH - .006], [.092, CH + .002], [.088, CH + .01], [.08, CH + .01], [.074, CH - .002], [.069, CH - .02], [0, CH - .03]]),
  cake: lathe([[0, .02], [.05, .02], [.052, .03], [.058, .16], [.072, .2], [.088, CH - .004], [.091, CH + .004], [.086, CH + .01], [.076, CH + .004], [.07, CH - .02], [0, CH - .03]]),
  cup: lathe([[0, .07], [.052, .07], [.054, .074], [.084, CH], [.088, CH + .006], [.084, CH + .01], [.08, CH], [.05, .08], [0, .08]]),
};
const dipG = lathe([[.06, CH * .64], [.084, CH - .012], [.091, CH - .005], [.095, CH + .004], [.09, CH + .013], [.079, CH + .012], [.073, CH - .004]]);
const sprG = new THREE.CapsuleGeometry(.0026, .01, 2, 6), sprMat = std('#ffffff', { roughness: .45 });
function makeCone(kind) {
  const g = new THREE.Group(); const base = kind === 'dip' || kind === 'party' ? 'waffle' : kind;
  const m = new THREE.Mesh(CONEG[base], coneMats[base]); m.castShadow = m.receiveShadow = true; g.add(m); g.userData.hit = [m];
  if (kind === 'dip' || kind === 'party') { const d = new THREE.Mesh(dipG, kind === 'dip' ? coneMats.choc : coneMats.white); d.castShadow = true; g.add(d);
    const im = new THREE.InstancedMesh(sprG, sprMat, 160); const q = new THREE.Quaternion(), mm = new THREE.Matrix4(); let n = 0;
    const cols = kind === 'dip' ? ['#ffffff', '#ff7ab0', '#ffd23a'] : TOP.rainbow.cols; const cnt = kind === 'dip' ? 40 : 150;
    for (let i = 0; i < cnt; i++) { const y = rnd(CH * .7, CH - .006), r = lerp(.061, .089, (y - CH * .64) / (CH * .36)) + .003, a = rnd(0, TAU); const nrm = V3(Math.cos(a), .25, Math.sin(a)).normalize();
      const tg = V3(-Math.sin(a), rnd(-1, 1), Math.cos(a)).normalize(); q.setFromUnitVectors(V3(0, 1, 0), tg); mm.compose(V3(Math.cos(a) * r, y, Math.sin(a) * r).addScaledVector(nrm, .001), q, V3(1, 1, 1)); im.setMatrixAt(n, mm); im.setColorAt(n, C(pick(cols))); n++; }
    im.count = n; g.add(im); }
  return g;
}
let ice = null, swirl = new Swirl();
function newIce(kind) { if (ice) { ice.parent && ice.parent.remove(ice); } ice = new THREE.Group(); ice.add(makeCone(kind)); swirl.reset(); swirl.mesh.position.y = kind === 'cup' ? CH - .03 : CH - .012; ice.add(swirl.mesh); ice.userData.kind = kind; tops.reset(); scene.add(ice); return ice; }

/* ================= toppings ================= */
const starShape = (() => { const s = new THREE.Shape(); for (let j = 0; j < 10; j++) { const r = j % 2 ? .0035 : .0085, a = j * Math.PI / 5 + Math.PI / 2; j ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } return s; })();
const TGEO = {
  spr: sprG, len: new THREE.SphereGeometry(.0085, 14, 8).scale(1, .46, 1), jel: new THREE.CapsuleGeometry(.0052, .0085, 4, 10), crm: new THREE.DodecahedronGeometry(.0068, 0), msh: new THREE.CylinderGeometry(.0068, .0068, .011, 12),
  star: new THREE.ExtrudeGeometry(starShape, { depth: .0024, bevelEnabled: true, bevelSize: .0008, bevelThickness: .0008, bevelSegments: 1 }).rotateX(-Math.PI / 2), prl: new THREE.SphereGeometry(.0042, 10, 8), sau: new THREE.SphereGeometry(.0105, 14, 8), drp: new THREE.CapsuleGeometry(.0052, .016, 4, 10).translate(0, -.013, 0),
};
const TMAT = {
  spr: std('#ffffff', { roughness: .42 }), len: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .22, clearcoat: 1, clearcoatRoughness: .1 }), jel: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .12, clearcoat: 1, sheen: .3, sheenColor: C('#ffffff') }),
  crm: std('#ffffff', { roughness: .95 }), msh: std('#ffffff', { roughness: .85 }), star: std('#ffffff', { roughness: .35, metalness: .2 }), prl: new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 1, roughness: .15 }),
  sau: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .1, clearcoat: 1, clearcoatRoughness: .05 }),
};
TMAT.drp = TMAT.sau;
const tops = {
  im: {}, cnt: {}, hist: [], bigs: [], anims: [],
  reset() { for (const k in this.im) { this.im[k].removeFromParent(); this.im[k].dispose(); } this.im = {}; this.cnt = {}; this.hist = []; this.bigs = []; this.anims = []; },
  IM(kind) { if (!this.im[kind]) { const m = new THREE.InstancedMesh(TGEO[kind], TMAT[kind], kind === 'sau' ? 2400 : 1400); m.count = 0; m.castShadow = true; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.im[kind] = m; ice.add(m); } return this.im[kind]; },
  snap() { const s = { c: {}, cnt: Object.assign({}, this.cnt), b: this.bigs.length }; for (const k in this.im) s.c[k] = this.im[k].count; this.hist.push(s); if (this.hist.length > 40) this.hist.shift(); },
  undo() { const s = this.hist.pop(); if (!s) return false; for (const k in this.im) this.im[k].count = s.c[k] || 0; this.cnt = s.cnt; while (this.bigs.length > s.b) { const b = this.bigs.pop(); b.removeFromParent(); } this.anims = []; return true; },
  add(kind, key, p, n, col, opt = {}) { // p,n in ice-local
    const m = this.IM(kind); if (m.count >= m.instanceMatrix.count) return; const i = m.count++; const q = new THREE.Quaternion(), sc = V3(1, 1, 1);
    const tg = V3().crossVectors(n, Math.abs(n.y) < .9 ? V3(0, 1, 0) : V3(1, 0, 0)).normalize().applyAxisAngle(n, rnd(0, TAU));
    let off = .002;
    if (kind === 'spr' || kind === 'jel') { q.setFromUnitVectors(V3(0, 1, 0), tg); off = kind === 'spr' ? .0026 : .0048; }
    else if (kind === 'len' || kind === 'star' || kind === 'sau') { q.setFromUnitVectors(V3(0, 1, 0), n); q.multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), rnd(0, TAU))); off = kind === 'sau' ? -.0018 : .0028; if (kind === 'sau') sc.set((opt.s || 1) * 1.1, .55, (opt.s || 1) * 1.1); }
    else { q.setFromEuler(new THREE.Euler(rnd(0, 6), rnd(0, 6), rnd(0, 6))); if (kind === 'crm') sc.set(rnd(.6, 1.4), rnd(.5, 1.1), rnd(.6, 1.3)); off = kind === 'msh' ? .0055 : kind === 'prl' ? .0036 : .002; }
    if (kind === 'drp') { const d = V3(0, -1, 0).addScaledVector(n, n.y); if (d.lengthSq() < .01) d.set(0, -1, 0); d.normalize(); q.setFromUnitVectors(V3(0, -1, 0), d); const L = opt.len || 1; sc.set(1, L, .7); off = .0035; }
    const to = p.clone().addScaledVector(n, off); m.setColorAt(i, C(col)); if (m.instanceColor) m.instanceColor.needsUpdate = true;
    const fall = opt.fall !== false; const mm = new THREE.Matrix4();
    if (fall) { const from = to.clone().add(V3(rnd(-.01, .01), .2 + rnd(0, .06), rnd(-.01, .01))); this.anims.push({ m, i, from, to, q, sc, t: 0, d: rnd(.22, .32) }); mm.compose(from, q, sc); }
    else mm.compose(to, q, sc);
    m.setMatrixAt(i, mm); m.instanceMatrix.needsUpdate = true; this.cnt[key] = (this.cnt[key] || 0) + 1;
  },
  tick(dt) { const mm = new THREE.Matrix4(); for (let k = this.anims.length - 1; k >= 0; k--) { const a = this.anims[k];
      if (a.pop) { a.t += dt / .35; const f = Math.min(1, a.t); const s = f < 1 ? 1 + Math.sin(f * Math.PI) * .25 : 1; a.pop.scale.copy(a.s0).multiplyScalar(Math.max(.01, eOut(f) * s)); if (f >= 1) { a.pop.scale.copy(a.s0); this.anims.splice(k, 1); } continue; }
      a.t += dt / a.d; const f = Math.min(1, a.t); const p = a.from.clone().lerp(a.to, f * f);
      mm.compose(p, a.q, a.sc); a.m.setMatrixAt(a.i, mm); a.m.instanceMatrix.needsUpdate = true; if (f >= 1) { this.anims.splice(k, 1); if (Math.random() < .25) A.tone(rnd(2400, 3800), .03, 'sine', .02); } } },
  big(key, p, n) {
    let o;
    if (key === 'cherry') { o = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(.021, 24, 18), new THREE.MeshPhysicalMaterial({ color: '#c8001e', roughness: .12, clearcoat: 1 })); b.scale.set(1, .92, 1); b.position.y = .019; o.add(b);
      const st = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V3(0, .036, 0), V3(.004, .065, 0), V3(.02, .082, .004)), 10, .0022, 6), std('#4a7a1a', { roughness: .6 })); o.add(st);
      const swTop = swirl.top.clone().add(swirl.mesh.position); if (!this.bigs.some(x => x.userData.key === 'cherry' && x.position.distanceTo(swTop) < .02) && p.distanceTo(swTop) < .09) { p = swTop; n = V3(0, 1, 0); }
      o.position.copy(p).addScaledVector(n, -.004); o.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(0, 1, 0).lerp(n, .5).normalize()); }
    if (key === 'oreo') { o = new THREE.Group(); const dk = std('#1e1a1a', { roughness: .7 }); for (const y of [-.0058, .0058]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .0075, 32), dk); d.position.y = y; o.add(d); }
      const cr = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, .0045, 32), std('#f6f2ea', { roughness: .6 })); o.add(cr);
      const ax = V3().crossVectors(n, V3(0, 1, 0)); if (ax.lengthSq() < .01) ax.set(1, 0, 0); ax.normalize(); o.quaternion.setFromUnitVectors(V3(0, 1, 0), ax); o.position.copy(p).addScaledVector(n, .012).add(V3(0, .006, 0)); }
    if (key === 'wafer') { o = new THREE.Group(); const wt = ctex(txtCanvas(64, 128, g => { g.fillStyle = '#ecbc74'; g.fillRect(0, 0, 64, 128); g.strokeStyle = '#a8702a'; g.lineWidth = 4; for (let y = -64; y < 192; y += 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y + 24); g.stroke(); } }), 1, 1);
      const w = new THREE.Mesh(new THREE.CylinderGeometry(.009, .009, .12, 16), std('#ffffff', { map: wt, roughness: .7 })); w.position.y = .06; o.add(w);
      const dirn = n.clone().multiplyScalar(.8).add(V3(0, 1.3, 0)).normalize(); o.quaternion.setFromUnitVectors(V3(0, 1, 0), dirn); o.position.copy(p).addScaledVector(dirn, -.03); }
    shadowAll(o, true, false); o.userData.key = key; ice.add(o); this.bigs.push(o); this.cnt[key] = (this.cnt[key] || 0) + 1;
    const s0 = o.scale.clone(); o.scale.setScalar(.01); this.anims.push({ pop: o, t: 0, s0 });
  },
};
/* ================= kid ================= */
let kid = null, kidD = null; const KIDPOS = V3(2.05, 0, 1.12);
const GUESTS = [{ f: 'zori', n: T('זורי', 'Zori'), p: 1.3 }, { f: 'luna', n: T('לונה', 'Luna'), p: 1.45 }, { f: 'kai', n: T('קאי', 'Kai'), p: 1.15 }, { f: 'rio', n: T('ריו', 'Rio'), p: 1.2 }, { f: 'remy', n: T('רמי', 'Remy'), p: 1.0 }];
const GSRC = {};
function preloadGuest() { const left = GUESTS.filter(g => GSRC[g.f] === undefined); if (!left.length) return; const g = pick(left); GSRC[g.f] = null; loadMix('lib/chars/' + g.f + '.glb').then(src => { if (src) GSRC[g.f] = src; else delete GSRC[g.f]; }); }
const readyGuests = () => GUESTS.filter(g => GSRC[g.f] && g !== kidD);
const _gq = new THREE.Quaternion(), _ge = new THREE.Euler(0, 0, 0, 'YXZ');
function makeGuest(d) {
  const R = new MixRig(GSRC[d.f], 1.55), g = R.holder, P = R.restP; scene.add(g);
  const dummy = () => new THREE.Object3D(); const head = dummy(); head.position.copy(P.Head).add(V3(0, -.17, 0)); g.add(head);
  const armLen = P.RightArm.distanceTo(P.RightForeArm) + P.RightForeArm.distanceTo(P.RightHand);
  const G = { g, head, isGuest: true, rig: R, arms: [dummy(), dummy()], legs: [dummy(), dummy()], eyes: [dummy(), dummy()], open: { visible: false }, smile: { visible: true }, mood: 'smile', baseY: 0, ph: Math.random() * 6, jump: 0, handW: null, tg: {} };
  G.setMood = m => { G.mood = m; G.jump = 0; };
  G.holdW = () => g.localToWorld(V3(-.2, P.Spine2.y - .12, .34));
  G.lickW = () => { const h = V3(); R.B.Head.getWorldPosition(h); const top = (swirl.mesh.position.y + swirl.top.y) * ice.scale.x; return h.add(V3(.02, -.12 - top, .16)); };
  G.update = (t, dt) => { dt = Math.min(dt, .1); const m = G.mood, br = Math.sin(t * 2 + G.ph);
    if (m === 'happy') { G.jump += dt; g.position.y = G.baseY + Math.abs(Math.sin(G.jump * 6)) * .22; } else g.position.y = lerp(g.position.y, G.baseY, dt * 8);
    const yaw = head.rotation.y + (m === 'angry' ? Math.sin(t * 13) * .3 : 0), pitch = head.rotation.x + (m === 'sad' ? .4 : 0) + (G.open.visible ? .25 : 0);
    R.set('Head', _gq.setFromEuler(_ge.set(pitch, yaw, m === 'happy' ? Math.sin(t * 7) * .12 : 0)).multiply(R.restW.Head));
    R.set('Spine2', _gq.setFromEuler(_ge.set((m === 'sad' ? .25 : 0) + br * .02, yaw * .25, 0)).multiply(R.restW.Spine2));
    for (const [side, s] of [['Left', 1], ['Right', -1]]) { const sh = P[side + 'Arm']; let tg, pole = V3(s * .2, 0, -1);
      if (side === 'Right' && G.handW) { tg = g.worldToLocal(G.handW.clone()); pole = V3(-.5, -1, -.3); }
      else if (m === 'happy') tg = sh.clone().add(V3(s * .25, .48 + Math.sin(t * 9 + s) * .05, .08));
      else if (m === 'angry') { tg = P.Hips.clone().add(V3(s * .2, .06, .04)); pole = V3(s, 0, -.4); }
      else if (m === 'wow') tg = sh.clone().add(V3(s * .38, -.12, .28));
      else tg = sh.clone().add(V3(s * .1, -armLen * .93 + br * .01, .05));
      const k = side + m + (G.handW && side === 'Right' ? 'h' : ''); const cur = G.tg[side] || (G.tg[side] = tg.clone()); cur.lerp(tg, Math.min(1, dt * 9));
      R.limbIK(side + 'Arm', side + 'ForeArm', side + 'Hand', sh, cur, pole.normalize()); }
    G.legs.forEach((l, i) => { const a = l.rotation.x, side = i ? 'Right' : 'Left'; if (Math.abs(a) > .01) { R.aim(side + 'UpLeg', side + 'Leg', V3(0, -Math.cos(a), Math.sin(a))); R.aim(side + 'Leg', side + 'Foot', V3(0, -Math.cos(a * .2 - Math.max(0, a) * .6), Math.sin(a * .2))); } });
    R.apply(); };
  return G;
}
function makeKid(d) { if (kid) scene.remove(kid.g); kidD = d; if (d.f) { kid = makeGuest(d); kid.g.position.set(4.2, 0, KIDPOS.z); kid.g.rotation.y = -.35; kid.walk = 1; return kid; } kid = cutie(d.o); kid.g.position.set(4.2, 0, KIDPOS.z); kid.g.rotation.y = -.35; kid.baseY = 0; scene.add(kid.g); kid.walk = 1; kid.look = null; return kid; }

/* ================= camera ================= */
const CAM = { t: V3(0, 1.5, 0), p: V3(0, 1.6, 3), t0: V3(), p0: V3(), t1: V3(), p1: V3(), k: 1, dur: .9, orbit: 0 };
const VIEWS = {
  title: { t: V3(.05, 1.5, .15), d: V3(.3, .16, 1).normalize(), w: 1.5, h: 1.25 },
  over: { t: V3(0, 2.14, -.22), d: V3(0, .62, 1).normalize(), w: 1.35, h: .78 },
  front: { t: V3(0, 1.48, .1), d: V3(0, .08, 1).normalize(), w: 1.15, h: 1.15 },
  pull: { t: V3(.04, 1.55, .22), d: V3(.62, .24, 1).normalize(), w: .8, h: 1.2 },
  top: { t: V3(0, 1.3, .52), d: V3(0, .55, 1).normalize(), w: .42, h: .46 },
  kid: { t: V3(1.85, 1.0, 1.0), d: V3(-.12, .12, 1).normalize(), w: 1.7, h: 1.55 },
  kidG: { t: V3(1.9, 1.02, 1.0), d: V3(-.12, .1, 1).normalize(), w: 1.6, h: 1.75 },
  serveG: { t: V3(2.0, 1.2, 1.1), d: V3(-.1, .06, 1).normalize(), w: 1.15, h: 1.3 },
  serve: { t: V3(2.0, 1.05, 1.1), d: V3(-.1, .08, 1).normalize(), w: 1.15, h: 1.05 },
};
let curView = 'title', viewX = 0;
function topPad() { return curView === 'title' ? 150 : 64; }
function botPad() { if (curView === 'title') return innerHeight * .5; const p = $('panel'); return p.hidden ? 20 : p.offsetHeight + 8; }
function viewPose(name, out) { const v = VIEWS[name], W = innerWidth, H = innerHeight, asp = W / H, th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const use = Math.max(.35, (H - topPad() - botPad()) / H); const dist = Math.max(v.h / (2 * th * use), v.w / (2 * th * asp)) * 1.02;
  out.t.copy(v.t); out.t.x += viewX; out.p.copy(v.t).addScaledVector(v.d, dist); out.p.x += viewX; return out; }
function setView(name, dur = .9, x = null) { curView = name; if (x !== null) viewX = x; CAM.t0.copy(CAM.t); CAM.p0.copy(CAM.p); CAM.k = 0; CAM.dur = dur; }
function camUpdate(dt) { const tgt = viewPose(curView, { t: V3(), p: V3() }); if (curView === 'title') { CAM.orbit += dt * .12; const r = tgt.p.clone().sub(tgt.t); r.applyAxisAngle(V3(0, 1, 0), Math.sin(CAM.orbit) * .22); tgt.p.copy(tgt.t).add(r); }
  if (CAM.k < 1) { CAM.k = Math.min(1, CAM.k + dt / CAM.dur); const e = ease(CAM.k); CAM.t.lerpVectors(CAM.t0, tgt.t, e); CAM.p.lerpVectors(CAM.p0, tgt.p, e); } else { CAM.t.lerp(tgt.t, Math.min(1, dt * 6)); CAM.p.lerp(tgt.p, Math.min(1, dt * 6)); }
  camera.position.copy(CAM.p); camera.lookAt(CAM.t);
  const off = (botPad() - topPad()) / 2; if (Math.abs(off) > 1) camera.setViewOffset(innerWidth, innerHeight + 2 * off, 0, 2 * off, innerWidth, innerHeight); else camera.clearViewOffset(); }
E.onResize.push(() => { });

/* ================= UI helpers ================= */
const panel = $('panel'), opts = $('opts');
let state = 'title', mode = 'cust', order = null, build = null;
function setStep(t, s = '') { $('stepT').textContent = t; $('stepS').textContent = s; }
function updCoins() { $('coinTxt').textContent = '🪙 ' + S.coins; }
function chip(img, label, data, on, extra = '') { return `<button class="ch ${on ? 'on' : ''} ${extra}" ${data}><img src="${img}" alt=""><small>${label}</small></button>`; }
function lockAttr(id) { const p = priceOf(id); return unl(id) ? '' : `lk" data-price="${p}🪙`; }
function chipL(id, img, label, data, on, want) { const lk = !unl(id); return `<button class="ch ${on ? 'on' : ''} ${want ? 'want' : ''} ${lk ? 'lk' : ''}" ${lk ? `data-price="${priceOf(id)}🪙"` : ''} ${data} data-id="${id}"><img src="${img}" alt=""><small>${label}</small></button>`; }
function tryBuy(id) { if (unl(id)) return true; const p = priceOf(id); if (S.coins >= p) { S.coins -= p; S.unl.push(id); S.save(); updCoins(); A.tone(880, .1, 'triangle', .08); A.tone(1320, .2, 'triangle', .08, .08); toast(T('נפתח! 🎉', 'Unlocked! 🎉')); return true; }
  A.tone(180, .2, 'square', .05); toast(T(`צריך עוד ${p - S.coins} מטבעות – הגישו לעוד ילדים! 🪙`, `Need ${p - S.coins} more coins – serve more kids! 🪙`)); return false; }
function showPanel(html) { opts.innerHTML = html; panel.hidden = false; }
function hidePanel() { panel.hidden = true; }
function bubble(html, ms = 0) { const b = $('bub'); b.innerHTML = html; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); clearTimeout(bubble.t); if (ms) bubble.t = setTimeout(() => b.classList.remove('on'), ms); }
function bubOff() { $('bub').classList.remove('on'); }
function placeBub() { const b = $('bub'); if (!kid || !b.classList.contains('on')) return; const p = V3(); kid.head.getWorldPosition(p); p.y += .42; p.project(camera); b.style.left = clamp((p.x * .5 + .5) * innerWidth, 90, innerWidth - 90) + 'px'; b.style.top = Math.max(b.offsetHeight + 70, (-p.y * .5 + .5) * innerHeight) + 'px'; }
function orderHTML(o, compact) { const fl = o.twist ? twistIcon(o.flav[0], o.flav[1]) : flavIcon(o.flav[0]); const fn = o.twist ? FLV[o.flav[0]].n + ' + ' + FLV[o.flav[1]].n : FLV[o.flav[0]].n;
  const ok = compact ? checkOrder() : {};
  let h = `<div class="it ${ok.f ? 'ok' : ''}"><img src="${fl}"><span>${fn}</span></div><div class="it ${ok.c ? 'ok' : ''}"><img src="${coneIcon(o.cone)}"><span>${CONES[o.cone].n}</span></div><div class="it sz ${ok.s ? 'ok' : ''}"><img src="${sizeIcon(o.size)}"><span>${SIZES[o.size].n}</span></div>`;
  if (o.tops.length) h += `<div class="it">${o.tops.map(t => `<img src="${topIcon(t)}" title="${TOP[t].n}" style="${ok.t && ok.t[t] ? 'background:#c8f5d4;border-radius:8px' : ''}">`).join('')}</div>`;
  if (o.no) h += `<div class="it no">🚫 <img src="${topIcon(o.no)}"> ${T('בלי', 'No')} ${TOP[o.no].n}</div>`;
  return h; }
function renderOrder() { const el = $('order'); if (!order || mode !== 'cust') { el.hidden = true; return; } el.hidden = false; el.innerHTML = `<div class="who">${kidD.n} ${T('רוצה:', 'wants:')}</div>` + orderHTML(order, true); }
function checkOrder() { if (!order || !build) return {}; const made = madeFlavors(); const t = {}; for (const k of order.tops) t[k] = (tops.cnt[k] || 0) >= (TOP[k].k === 'big' ? 1 : TOP[k].k === 'sau' ? 8 : 5);
  return { f: made && sameSet(made, order.flav), c: build.cone === order.cone, s: build.done && Math.abs(build.u - SIZES[order.size].u) < .6, t }; }
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
function madeFlavors() { if (!build || build.spout == null) return null; const h = build.hop; return build.spout === 1 ? (h[0] === h[1] ? [h[0]] : [h[0], h[1]]) : [h[build.spout === 0 ? 0 : 1]]; }

/* ---- guide hand (for little kids who can't read) ---- */
const G = { el: null, p3: null, kind: 'tap' };
function guide(el, kind = 'tap') { G.el = el; G.p3 = null; G.kind = kind; }
function guide3(p, kind = 'drag') { G.el = null; G.p3 = p.clone(); G.kind = kind; }
function guideOff() { G.el = null; G.p3 = null; $('guide').hidden = true; }
function guideTick() { const g = $('guide'); let x, y;
  if (G.el) { if (!G.el.isConnected || panel.hidden) { g.hidden = true; return; } const r = G.el.getBoundingClientRect(); if (!r.width) { g.hidden = true; return; } x = r.left + r.width / 2; y = r.top + r.height * .55; }
  else if (G.p3) { const p = G.p3.clone().project(camera); x = (p.x * .5 + .5) * innerWidth; y = (-p.y * .5 + .5) * innerHeight; }
  else { g.hidden = true; return; }
  g.hidden = false; g.className = G.kind; g.textContent = G.kind === 'tap' ? '👆' : '☝️'; g.style.left = x + 'px'; g.style.top = y + 'px'; }

/* ================= flow ================= */
function startGame(m) { mode = m; A.ac(); preloadGuest(); setTimeout(preloadGuest, 4000); if (ice) { ice.removeFromParent(); ice = null; } stand.visible = false; holder.visible = true; $('title').hidden = true; $('hud').hidden = false; updCoins(); build = { hop: S.hop.slice(), cone: 'waffle', spout: null, u: 0, done: false };
  A.startMusic({ chords: [[60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74]], bpm: 112, lead: true, kick: false, vol: .55 });
  if (m === 'cust') goOrder(); else { order = null; renderOrder(); goFill(); } }
function nextCustomer() { build = { hop: S.hop.slice(), cone: 'waffle', spout: null, u: 0, done: false }; if (ice) { ice.removeFromParent(); ice = null; } goOrder(); }
function genOrder() { const lv = S.served; const fl = Object.keys(FLV).filter(k => unl('f:' + k)); const cn = Object.keys(CONES).filter(k => unl('c:' + k)); const tp = Object.keys(TOP).filter(k => unl('t:' + k));
  const o = { twist: lv >= 2 && Math.random() < .38, cone: lv < 1 ? 'waffle' : pick(cn), size: lv < 1 ? 'M' : pick(['S', 'M', 'L']), tops: [], no: null };
  const a = pick(fl); let b = pick(fl); while (b === a) b = pick(fl); o.flav = o.twist ? [a, b] : [a];
  const nt = lv < 1 ? 1 : Math.floor(rnd(0, Math.min(3, 1 + lv / 3) + 1)); const pool = tp.slice().sort(() => Math.random() - .5); o.tops = pool.slice(0, nt);
  if (lv >= 3 && Math.random() < .35) { const rest = pool.filter(t => !o.tops.includes(t)); if (rest.length) o.no = pick(rest); } return o; }
function guestFanfare() { [0, 4, 7, 12, 16, 19].forEach((n, k) => A.tone(523 * Math.pow(2, n / 12), .18, 'triangle', .07, k * .09)); A.noise(.8, 'highpass', 5000, 1, .05, .5); toast(T('⭐ הופעת אורח! ⭐', '⭐ Guest star! ⭐'), 2500);
  setTimeout(() => { FX.burst(V3(KIDPOS.x, 1.9, KIDPOS.z), 70, CONFETTI, 2.6, .045, 1.8, 3); $('flash').style.opacity = .35; setTimeout(() => $('flash').style.opacity = 0, 120); }, 900); }
function goOrder() { state = 'order'; hidePanel(); $('gauge').hidden = true; $('hold').hidden = true; stand.visible = false; setStep(T('לקוח חדש!', 'New customer!'), '');
  const gs = readyGuests(); const guest = gs.length && (window.__forceGuest || S.served >= 1 && (S.served % 4 === 2 || Math.random() < .2)); makeKid(guest ? pick(gs) : pick(KIDS.filter(k => k !== kidD))); preloadGuest(); order = genOrder(); $('order').hidden = true; setView(guest ? 'kidG' : 'kid', 1.1, 0);
  if (guest) guestFanfare(); A.tone(1568, .12, 'sine', .06); A.tone(2093, .25, 'sine', .06, .12);
  setTimeout(() => { if (state !== 'order') return; kid.setMood('happy'); setTimeout(() => kid && kid.setMood('smile'), 700); A.voice('yay', kidD.p);
    bubble(`${kidD.f ? T('⭐ אני ', '⭐ I’m ') + kidD.n + '! ' : ''}${pick(LINES.hi)}<div class="oc">${orderHTML(order).replace(/class="it[^"]*"/g, 'class="it"')}</div>`);
    showPanel(`<div class="nav1"><button class="btn pri big ready" id="goMake">${T('בואו נכין! 🍦', 'Let’s make it! 🍦')}</button></div>`);
    $('goMake').onclick = () => { A.tone(880, .06, 'sine', .06); bubOff(); renderOrder(); $('order').classList.add('pop'); goFill(); }; }, 1500); }

/* ---- fill hoppers ---- */
let pouring = null, freezeT = 0, changed = false;
function goFill() { state = 'fill'; changed = false; setView('over', 1.0, 0); setStep(T('ממלאים את המכונה', 'Fill the machine'), T('בחרו טעם לכל מיכל', 'Pick a flavor for each tank'));
  M.lids.forEach(l => l.userData.open = 1); renderFill(); if (!S.tut.fill) { S.tut.fill = 1; S.save(); setTimeout(() => toast(T('בחרו טעם לכל מיכל – שופכים פנימה את התערובת 🥛', 'Pick a flavor for each tank – pour in the mix 🥛'), 3200), 900); } }
function renderFill() { const want = order ? order.flav : [];
  const row = s => Object.keys(FLV).map(k => chipL('f:' + k, flavIcon(k), FLV[k].n, `data-s="${s}" data-f="${k}"`, build.hop[s] === k, want.includes(k))).join('');
  showPanel(`<div class="tanks"><div class="tank"><div class="lbl">⬅️ <i style="background:${FLV[build.hop[0]].c}"></i></div><div class="tg">${row(0)}</div></div><div class="tank"><div class="lbl" style="justify-content:flex-end"><i style="background:${FLV[build.hop[1]].c}"></i> ➡️</div><div class="tg">${row(1)}</div></div></div>
  <div class="nav1"><button class="btn pri big" id="fillNext">${changed ? T('❄️ הקפאה!', '❄️ Freeze it!') : T('הבא ▶', 'Next ▶')}</button></div>`);
  opts.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { if (pouring) return; const id = b.dataset.id; if (!tryBuy(id)) { renderFill(); return; } const s = +b.dataset.s, f = b.dataset.f; if (build.hop[s] === f && !changed) { A.tone(660, .05, 'sine', .05); return; } pourInto(s, f); });
  $('fillNext').onclick = () => { if (pouring) return; A.tone(880, .06, 'sine', .06); guideOff(); S.hop = build.hop.slice(); S.save(); if (changed) goFreeze(); else goCone(); }; fillGuide(); }
function fillGuide() { if (pouring) { guideOff(); return; } const nx = $('fillNext'); let tgt = null;
  if (order) { const miss = order.flav.filter(f => !build.hop.includes(f)); if (miss.length) { const keep = order.flav.filter(f => build.hop.includes(f)); const s = keep.includes(build.hop[0]) ? 1 : 0; tgt = opts.querySelector(`[data-s="${s}"][data-f="${miss[0]}"]`); } }
  else if (!changed) tgt = opts.querySelector('[data-s="0"]:not(.on):not(.lk)');
  if (tgt) { nx.classList.remove('blink'); tgt.scrollIntoView({ block: 'nearest', inline: 'nearest' }); guide(tgt); } else { nx.classList.add('blink'); guide(nx); } }
const cartonG = new RoundedBoxGeometry(.11, .19, .11, 2, .012);
function pourInto(s, f) { build.hop[s] = f; changed = true; renderFill(); renderOrder();
  const x = s ? .24 : -.24, z = -.3, fl = FLV[f];
  const lab = txtCanvas(128, 256, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 256); g.fillStyle = fl.c; g.fillRect(0, 0, 128, 90); g.fillStyle = fl.c; g.fillRect(0, 200, 128, 56); g.font = '64px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(fl.e, 64, 145); g.fillStyle = '#ff5fa2'; g.font = '900 22px Arial'; g.fillText('MIX', 64, 50); });
  const car = new THREE.Mesh(cartonG, std('#ffffff', { map: ctex(lab), roughness: .5 })); car.castShadow = true; const pv = new THREE.Group(); pv.position.set(x + (s ? .2 : -.2), TOPY + 1.5, z); pv.add(car); car.position.set(0, -.04, 0); scene.add(pv);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(.012, .016, 1, 12), new THREE.MeshPhysicalMaterial({ color: C(fl.c).lerp(C('#ffffff'), .15), roughness: .2, clearcoat: .8 })); st.visible = false; scene.add(st);
  pouring = { s, f, t: 0, pv, car, st, x, z, col0: M.hopCol[s].clone(), col1: C(fl.c), bits: 0, dir: s ? 1 : -1 };
  A.tone(520, .08, 'triangle', .05); }
function pourTick(dt) { const P = pouring; if (!P) return; P.t += dt; const t = P.t;
  const tilt = t < .4 ? eOut(t / .4) : t < 1.7 ? 1 : 1 - eOut((t - 1.7) / .35); P.pv.rotation.z = -P.dir * tilt * 1.9 * -1; P.pv.position.y = TOPY + 1.5 - tilt * .08; P.pv.position.x = P.x + P.dir * (.2 - tilt * .08);
  const flowing = t > .35 && t < 1.75; P.st.visible = flowing; A[flowing ? 'loopOn' : 'loopOff']('pour', 'bandpass', 900, 1.2, .05, 7);
  if (flowing) { const sp = V3(0, .06, 0); P.car.localToWorld(sp); sp.x = lerp(sp.x, P.x + P.dir * .04, .5); const lvlY = M.liq[P.s].position.y; P.st.position.set(sp.x, (sp.y + lvlY) / 2, P.z); P.st.scale.y = Math.max(.01, sp.y - lvlY);
    if (Math.random() < .5) FX.emit(V3(sp.x, lvlY + .01, P.z), V3(rnd(-.3, .3), rnd(.3, .7), rnd(-.3, .3)), rgb(FLV[P.f].c), .012, .35, 6); }
  const k = clamp((t - .35) / 1.3, 0, 1); M.hopCol[P.s].copy(P.col0).lerp(P.col1, sstep(0, .8, k)); M.liq[P.s].material.color.copy(M.hopCol[P.s]); M.hopLvl[P.s] = Math.max(M.hopLvl[P.s], lerp(.3, .85, k)); M.liq[P.s].position.y = TOPY + 1.04 + .15 * M.hopLvl[P.s];
  if (t > .9 && P.bits < 6 && t > .9 + P.bits * .12) { P.bits++; dropBit(P.f, P.x, P.z); }
  if (t > 2.1) { scene.remove(P.pv); scene.remove(P.st); pouring = null; A.loopOff('pour'); A.tone(990, .08, 'triangle', .05); if (state === 'fill') renderFill(); } }
const drops = [];
function dropBit(f, x, z) { const fl = FLV[f]; let m; const c = fl.bc || fl.c;
  if (fl.bit === 'berry') { m = new THREE.Mesh(new THREE.ConeGeometry(.02, .035, 12), std('#e01a3a', { roughness: .35 })); m.rotation.x = Math.PI; }
  else if (fl.bit === 'leaf') { m = new THREE.Mesh(new THREE.SphereGeometry(.022, 10, 6).scale(1, .2, .55), std('#3aa84a', { roughness: .5 })); }
  else if (fl.bit === 'pod') { m = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .09, 8), std('#2a1a10', { roughness: .7 })); m.rotation.z = 1.2; }
  else if (fl.bit === 'disc') { m = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .008, 16), std(c, { roughness: .6 })); }
  else if (fl.bit === 'ball' || fl.bit === 'fluff') { m = new THREE.Mesh(new THREE.SphereGeometry(fl.bit === 'fluff' ? .026 : .014, 12, 10), std(c, { roughness: fl.bit === 'fluff' ? .95 : .3 })); }
  else if (fl.bit === 'cookie') { m = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .007, 16), std('#1e1a1a', { roughness: .7 })); m.rotation.x = 1; }
  else { m = new THREE.Mesh(new THREE.BoxGeometry(.02, .02, .02), std(c, { roughness: .5 })); }
  m.castShadow = true; m.position.set(x + rnd(-.07, .07), TOPY + 1.55, z + rnd(-.07, .07)); m.userData.v = 0; m.userData.s = 1; scene.add(m); drops.push(m); }
function dropsTick(dt) { for (let i = drops.length - 1; i >= 0; i--) { const m = drops[i]; const s = m.position.x > 0 ? 1 : 0; const ly = M.liq[s].position.y;
  if (m.position.y > ly) { m.userData.v += 9 * dt; m.position.y -= m.userData.v * dt; m.rotation.y += dt * 4; if (m.position.y <= ly) { A.tone(rnd(260, 360), .12, 'sine', .07, 0, 140); for (let k = 0; k < 8; k++) FX.emit(V3(m.position.x, ly + .01, m.position.z), V3(rnd(-.4, .4), rnd(.6, 1.2), rnd(-.4, .4)), rgb('#' + M.hopCol[s].getHexString()), .014, .5, 7); } }
  else { m.position.y -= dt * .03; m.userData.s -= dt * .8; m.scale.setScalar(Math.max(.01, m.userData.s)); if (m.userData.s <= 0) { scene.remove(m); drops.splice(i, 1); } } } }

/* ---- freeze ---- */
function goFreeze() { state = 'freeze'; freezeT = 0; M.lids.forEach(l => l.userData.open = 0); setStep(T('מקפיאים…', 'Freezing…'), T('המכונה עובדת', 'The machine is working'));
  showPanel(`<div class="hintP">❄️ ${T('המכונה מערבבת ומקררת את התערובת', 'The machine churns and chills the mix')}</div><div class="meter"><i id="frzI" style="width:0"></i><span id="frzT">20°C</span></div>`);
  setView('front', 1.0, 0); A.loopTone('hum', 'sawtooth', 55, .022); A.loopOn('chill', 'lowpass', 500, 1, .03, 2); }
function freezeTick(dt) { freezeT += dt; const k = clamp(freezeT / 2.6, 0, 1); const temp = Math.round(lerp(20, -6, k)); const i = $('frzI'), tt = $('frzT'); if (i) i.style.width = k * 100 + '%'; if (tt) tt.textContent = temp + '°C';
  ledText(temp + '°C', k < 1 ? '#7af0ff' : '#7aff9a', k < 1 ? 'CHILL' : 'READY'); M.frost.forEach(f => f.material.opacity = .55 * k);
  if (Math.random() < .3) FX.emit(V3(rnd(-.4, .4), TOPY + 1.25, rnd(-.45, -.1)), V3(rnd(-.05, .05), rnd(.1, .25), rnd(-.05, .05)), [1.5, 1.6, 1.7], .05, 1.2, -.02, .25);
  if (k >= 1 && state === 'freeze') { state = 'frozen'; A.loopOff('hum'); A.loopOff('chill'); [0, 4, 7].forEach((n, j) => A.tone(784 * Math.pow(2, n / 12), .18, 'sine', .07, j * .09)); setTimeout(goCone, 500); } }

/* ---- cone ---- */
function goCone() { state = 'cone'; setStep(T('בחרו גביע', 'Pick a cone'), ''); setView('front', .9, 0); ledText('READY', '#7aff9a');
  if (!ice || ice.userData.kind !== build.cone) placeCone(build.cone); renderCone(); }
function placeCone(k) { newIce(k); build.cone = k; holder.position.set(SPX[build.spout == null ? 1 : build.spout], NOZY - .03 - CH * .38, SPZ); ice.position.set(holder.position.x, holder.position.y - CH * .62, SPZ); ice.rotation.set(0, 0, 0); ice.scale.setScalar(1); holderY = holder.position.y; }
let holderY = 0;
function renderCone() { const w = order ? order.cone : null;
  showPanel(`<div class="row2" style="justify-content:center">${Object.keys(CONES).map(k => chipL('c:' + k, coneIcon(k), CONES[k].n, `data-c="${k}"`, build.cone === k, w === k)).join('')}</div><div class="nav1"><button class="btn pri big" id="coneNext">${T('למשוך גלידה ▶', 'Pull the ice cream ▶')}</button></div>`);
  opts.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { if (!tryBuy(b.dataset.id)) { renderCone(); return; } A.tone(700, .06, 'triangle', .06); placeCone(b.dataset.c); renderCone(); renderOrder(); ice.scale.setScalar(.6); popT = 0; });
  $('coneNext').onclick = () => { A.tone(880, .06, 'sine', .06); guideOff(); goPull(); };
  const w2 = order && build.cone !== order.cone ? opts.querySelector(`[data-c="${order.cone}"]`) : null; if (w2) { $('coneNext').classList.remove('blink'); guide(w2); } else { $('coneNext').classList.add('blink'); guide($('coneNext')); } }
let popT = 1;

/* ---- pull ---- */
let holding = false, pullStarted = false, ox = 0, ovx = 0, lastPX = 0, tipping = false, leverK = 0, y0 = 0, topple = null, clk = 0;
function goPull() { state = 'pull'; holding = false; pullStarted = false; tipping = false; ox = 0; ovx = 0; if (build.spout == null) build.spout = order ? (order.twist ? 1 : (build.hop[0] === order.flav[0] ? 0 : build.hop[1] === order.flav[0] ? 2 : 1)) : 1;
  resetSwirl(); build.u = 0; build.done = false; setStep(T('מושכים את הידית!', 'Pull the lever!'), T('גררו את האצבע למטה', 'Drag your finger down'));
  moveHolderTo(build.spout); renderPull(); setView('pull', .9, SPX[build.spout]); $('gauge').hidden = false; drawGauge(); $('hold').hidden = true; topple = null;
  if (!S.tut.pull) { S.tut.pull = 1; S.save(); setTimeout(() => toast(T('גררו את הידית למטה – ככל שמושכים יותר, יוצא יותר מהר. עוזבים בגובה הנכון!', 'Drag the lever down – the more you pull, the faster it flows. Let go at the right height!'), 4200), 700); } }
function renderPull() { const h = build.hop; const sp = [[flavIcon(h[0]), FLV[h[0]].n], [twistIcon(h[0], h[1]), T('טוויסט', 'Twist')], [flavIcon(h[1]), FLV[h[1]].n]];
  showPanel(`<div class="lbl" style="justify-content:center">${T('מאיזה ברז?', 'Which spout?')}</div><div class="row2" style="justify-content:center">${sp.map(([im, n], i) => chip(im, n, `data-sp="${i}"`, build.spout === i)).join('')}</div>
  <div class="nav1" id="pullNav" ${swirl.done ? '' : 'hidden'}><button class="btn big" id="redo" style="flex:.6">${T('🔄 שוב', '🔄 Redo')}</button><button class="btn pri big ready" id="toTop">${T('תוספות ▶', 'Toppings ▶')}</button></div>`);
  opts.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => { if (pullStarted) { if (!swirl.done) return; resetPull(); } build.spout = +b.dataset.sp; resetSwirl(); A.tone(700, .06, 'triangle', .06); moveHolderTo(build.spout); setView('pull', .6, SPX[build.spout]); renderPull(); renderOrder(); });
  const r = $('redo'); if (r) r.onclick = () => { resetPull(); renderPull(); renderOrder(); };
  const n = $('toTop'); if (n) n.onclick = () => { A.tone(880, .06, 'sine', .06); guideOff(); goTop(); }; if (swirl.done) guide(n); }
function resetSwirl() { const f = madeFlavors() || [S.hop[0]]; swirl.reset(f.map(k => FLV[k].c), f.map(k => FLV[k].sp ? { c: FLV[k].sp, n: FLV[k].spN } : null)); }
function resetPull() { resetSwirl(); pullStarted = false; tipping = false; build.u = 0; build.done = false; ox = 0; ovx = 0; holderY = NOZY - .03 - CH * .38; drawGauge(); $('hold').hidden = false; }
let holderX = 0; function moveHolderTo(i) { holderX = SPX[i]; holderY = NOZY - .03 - CH * .38; }
function drawGauge() { const g = $('gauge'); const tgt = order ? order.size : null; let h = `<i id="gaugeI" style="height:${clamp(build.u / MAXU, 0, 1) * 100}%"></i>`;
  if (tgt) { const u = SIZES[tgt].u; h += `<div class="band" style="bottom:${(u - .55) / MAXU * 100}%;height:${1.1 / MAXU * 100}%"></div>`; }
  h += `<div class="danger" style="bottom:${4.65 / MAXU * 100}%;height:${(MAXU - 4.65) / MAXU * 100}%"></div><div class="mk dz" style="bottom:${(MAXU - .15) / MAXU * 100}%">⚠️</div>`;
  for (const s of ['S', 'M', 'L']) h += `<div class="mk ${s === tgt ? 'tg' : ''}" style="bottom:${SIZES[s].u / MAXU * 100}%">${SIZES[s].n}${s === tgt ? ' ⭐' : ''}</div>`; g.innerHTML = h; }
function pullTick(dt) {
  const tnow = performance.now() / 1000;
  if (topple) { topple.t += dt; const k = Math.min(1, topple.t / .75), m = swirl.mesh; m.rotation.z = topple.dir * k * k * 1.7; m.position.x = topple.dir * k * k * .14; m.position.y = topple.y0 - k * k * .3;
    M.levers.forEach(l => { l.userData.k = lerp(l.userData.k, 0, dt * 10); l.rotation.x = -.18 + l.userData.k * 1.25; }); stream.visible = false; A.loopOff('motor'); A.loopOff('squish');
    if (topple.t > .75 && !topple.sp) { topple.sp = 1; const wp = V3(); m.getWorldPosition(wp); A.noise(.35, 'lowpass', 600, 1, .12, 0, 120); A.tone(200, .4, 'sine', .1, 0, 60); buzz(150); for (let i = 0; i < 26; i++) FX.emit(wp.clone().add(V3(topple.dir * .15, -.05, .05)), V3(rnd(-.8, .8), rnd(.4, 1.4), rnd(-.3, .6)), rgb('#' + swirl.cols[0].getHexString()), .03, .8, 6); }
    if (topple.t > 1.7) { m.rotation.z = 0; m.position.set(0, topple.y0, 0); topple = null; resetPull(); renderPull(); } return; }
  const flowing = holding && !swirl.done && !tipping && leverK > .12;
  const lv = M.levers[build.spout]; lv.userData.k = lerp(lv.userData.k, holding && !swirl.done && !tipping ? leverK : 0, Math.min(1, dt * 16)); M.levers.forEach((l, i) => { if (i !== build.spout) l.userData.k = lerp(l.userData.k, 0, dt * 10); l.rotation.x = -.18 + l.userData.k * 1.25; });
  if (flowing) {
    if (!pullStarted) { pullStarted = true; guideOff(); A.tone(220, .05, 'square', .04); }
    swirl.grow(dt * 1.35 * leverK, 0, 0); build.u = swirl.u; A.loopTone('motor', 'sawtooth', 52 + 20 * leverK, .018); A.loopOn('squish', 'lowpass', 520, 2, .05, 3.2);
    if (swirl.u > 4.4) swirl.mesh.rotation.z = Math.sin(tnow * 9) * .045 * (swirl.u - 4.4); if (swirl.u > 4.65 && Math.random() < dt * 3) A.tone(rnd(300, 420), .05, 'square', .025);
    if (swirl.u >= MAXU - .01) { holding = false; leverK = 0; topple = { t: 0, dir: Math.random() < .5 ? -1 : 1, y0: swirl.mesh.position.y }; A.voice('wow', 1.2); toast(T('😱 אופס! היא נפלה – גבוהה מדי!', '😱 Oops! It fell – too tall!'), 2200); return; }
  } else { A.loopOff('motor'); A.loopOff('squish'); swirl.mesh.rotation.z = lerp(swirl.mesh.rotation.z, 0, dt * 6); }
  if (!pullStarted && !swirl.done && !holding) { const kp = V3(); lv.userData.knob.getWorldPosition(kp); guide3(kp); }
  if (pullStarted && !holding && !swirl.done) { tipping = true; if (swirl.tip(dt * 2.2)) { build.done = true; tipping = false; A.tone(1046, .1, 'sine', .07); A.tone(1568, .18, 'sine', .06, .08); A.noise(.06, 'highpass', 3000, 1, .05); renderPull(); renderOrder(); const nav = $('pullNav'); if (nav) nav.hidden = false;
    const tg = order ? SIZES[order.size].u : null; if (tg !== null) { const d = Math.abs(build.u - tg); toast(d < .45 ? T('🎯 גובה מושלם!', '🎯 Perfect height!') : d < .9 ? T('👍 כמעט בגובה הנכון', '👍 Almost the right height') : build.u < tg ? T('קצת קטנה… אפשר ללחוץ "שוב"', 'A bit small… you can tap “Redo”') : T('קצת גדולה מדי…', 'A bit too big…'), 1800); } } }
  // cone follows the stream (keep deposit point just under the nozzle)
  const endY = swirl.n ? swirl.end.y + swirl.endTr * .55 : 0; const tgY = NOZY - .006 - endY - (swirl.mesh.position.y) + CH * .62;
  const hy = swirl.n && !swirl.done ? Math.min(NOZY - .03 - CH * .38, tgY) : holderY; holderY = lerp(holderY, hy, Math.min(1, dt * 10));
  holder.position.set(lerp(holder.position.x, holderX + ox, Math.min(1, dt * 12)), holderY, SPZ); ice.position.set(holder.position.x, holderY - CH * .62, SPZ);
  holder.children[0].scale.y = 1; holder.children[0].position.y = -(holderY - TOPY - .04) / 2; holder.children[0].scale.y = (holderY - TOPY - .04);
  // stream
  if (holding && !swirl.done && !tipping && swirl.n) { const wEnd = swirl.end.clone().add(swirl.mesh.position); ice.localToWorld(wEnd); const top = NOZY, bot = wEnd.y + swirl.endTr * .3; stream.visible = true; stream.position.set(SPX[build.spout], (top + bot) / 2, SPZ); stream.scale.set(1, Math.max(.002, top - bot), 1); streamColor(); }
  else stream.visible = false;
  const gi = $('gaugeI'); if (gi) gi.style.height = clamp(build.u / MAXU, 0, 1) * 100 + '%';
}
const stream = (() => { const g = new THREE.CylinderGeometry(.026, .028, 1, 32, 6, true); const p = g.attributes.position; const cols = [];
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z) * (1 + .14 * Math.cos(8 * a)); p.setX(i, Math.cos(a) * r); p.setZ(i, Math.sin(a) * r); cols.push(1, 1, 1); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals(); const m = new THREE.Mesh(g, iceMat); m.visible = false; scene.add(m); return m; })();
function streamColor() { const f = madeFlavors(); const a = C(FLV[f[0]].c), b = C(FLV[(f[1] || f[0])].c); const p = stream.geometry.attributes.position, c = stream.geometry.attributes.color; const ph = performance.now() / 600;
  for (let i = 0; i < p.count; i++) { const ang = Math.atan2(p.getZ(i), p.getX(i)) / TAU + p.getY(i) * 1.5 + ph; const w = f.length > 1 ? sstep(-.08, .08, Math.sin(ang * TAU)) : 0; const sh = .9 + .1 * Math.cos(8 * Math.atan2(p.getZ(i), p.getX(i))); c.setXYZ(i, lerp(a.r, b.r, w) * sh, lerp(a.g, b.g, w) * sh, lerp(a.b, b.b, w) * sh); } c.needsUpdate = true; }

/* ---- toppings ---- */
let curTop = 'rainbow', moveT = 0, stroke = null;
function goTop() { state = 'top'; $('gauge').hidden = true; $('hold').hidden = true; build.u = swirl.u; setStep(T('תוספות!', 'Toppings!'), T('גררו על הגלידה', 'Drag over the ice cream'));
  const from = ice.position.clone(); moveT = 0; ice.userData.from = from; stand.visible = true; holder.visible = true; renderTop(); setView('top', 1.0, 0);
  topGuide = 1; if (!S.tut.top) { S.tut.top = 1; S.save(); setTimeout(() => toast(T('בחרו תוספת וגררו את האצבע מעל הגלידה ✨', 'Pick a topping and drag your finger over the ice cream ✨'), 3200), 1000); } }
let topGuide = 0;
function renderTop() { const want = order ? order.tops : []; const no = order ? order.no : null;
  showPanel(`<div class="row2"><button class="ch undo" id="undoT">↩️<small>${T('ביטול', 'Undo')}</small></button>${Object.keys(TOP).map(k => chipL('t:' + k, topIcon(k), TOP[k].n, `data-t="${k}"`, curTop === k, want.includes(k), no === k)).join('')}</div>
  <div class="nav1"><button class="btn pri big" id="serveBtn">${mode === 'cust' ? T('להגיש לילד 🍦', 'Serve it 🍦') : T('לטועם המסתורי 🧐', 'To the mystery taster 🧐')}</button></div>`);
  opts.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { if (!tryBuy(b.dataset.id)) { renderTop(); return; } curTop = b.dataset.t; A.tone(760, .05, 'triangle', .05); renderTop(); });
  $('undoT').onclick = () => { if (tops.undo()) { A.tone(400, .08, 'triangle', .05); renderOrder(); } };
  $('serveBtn').onclick = () => { A.tone(880, .06, 'sine', .06); if (mode === 'cust') goServe(); else finishFree(); }; }
function topTick(dt) { moveT += dt; const k = eOut(moveT / .8); const from = ice.userData.from || ice.position; const to = V3(STAND.x, STAND.y + .17 - CH * .62, STAND.z);
  if (moveT < .85) { ice.position.lerpVectors(from, to, k); ice.position.y += Math.sin(k * Math.PI) * .12; holder.position.y = lerp(holder.position.y, NOZY - .03 - CH * .38, dt * 4); holder.children[0].position.y = -(holder.position.y - TOPY - .04) / 2; holder.children[0].scale.y = holder.position.y - TOPY - .04; }
  else { ice.position.copy(to); holder.visible = false; }
  ice.rotation.y += dt * (stroke ? .55 : .35); tops.tick(dt); if (topGuide && moveT > .9) { const c = V3(0, CH + .1, 0); ice.localToWorld(c); guide3(c, 'swipe'); }
  if (stroke && stroke.ptr) { stroke.acc += dt; const t = TOP[curTop]; const rate = t.k === 'big' ? 0 : t.k === 'sau' ? 70 : t.k === 'spr' || t.k === 'crm' ? 55 : 22; while (stroke.acc > 1 / Math.max(1, rate) && rate) { stroke.acc -= 1 / rate; applyTop(stroke.ptr, true); } } }
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function hitIce(px, py) { ndc.set(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); ice.updateMatrixWorld(true);
  const objs = [swirl.mesh, ...ice.children[0].userData.hit]; const hs = ray.intersectObjects(objs, false); if (!hs.length) return null; const h = hs[0];
  return { p: ice.worldToLocal(h.point.clone()), n: hitNormal(h, ray.ray.direction), cone: h.object !== swirl.mesh }; }
function hitNormal(h, dir) { const nw = h.face.normal.clone().transformDirection(h.object.matrixWorld); if (nw.dot(dir) > 0) nw.negate(); return nw.applyQuaternion(ice.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize(); }
function applyTop(ptr, cont) { const t = TOP[curTop]; const jx = t.k === 'sau' ? 2 : 14; const h = hitIce(ptr.x + rnd(-jx, jx), ptr.y + rnd(-jx, jx)); if (!h) return;
  if (t.k === 'big') { if (cont) return; tops.big(curTop, h.p, h.n); A.tone(600, .1, 'sine', .07, 0, 900); renderOrder(); return; }
  if (t.k === 'sau') { if (h.cone && h.p.y < CH * .8) return; const last = stroke.lastP; const pts = [h.p]; if (last && last.distanceTo(h.p) < .05) { const d = last.distanceTo(h.p); const n = Math.floor(d / .006); for (let i = 1; i < n; i++) { const q = last.clone().lerp(h.p, i / n); pts.unshift(q); } }
    for (const q of pts) { const hn = h.n.clone(); tops.add('sau', curTop, q, hn, t.cols[0], { fall: false, s: rnd(1.1, 1.45) }); if (Math.random() < .05 && hn.y < .8 && hn.y > -.3) tops.add('drp', curTop, q, hn, t.cols[0], { fall: false, len: rnd(.7, 1.7) }); }
    stroke.lastP = h.p; A.loopOn('sauce', 'bandpass', 420, 1.5, .03, 5); renderOrderThrottle(); return; }
  tops.add(t.k, curTop, h.p, h.n, pick(t.cols)); renderOrderThrottle(); }
let roT = 0; function renderOrderThrottle() { const n = performance.now(); if (n - roT > 250) { roT = n; renderOrder(); } }

/* ---- serve + suspense ---- */
let serveT = 0, verdict = null;
function goServe() { state = 'serve'; guideOff(); hidePanel(); stroke = null; A.loopOff('sauce'); stand.visible = false; serveT = 0; verdict = mode === 'free' ? scoreFree() : scoreIt(); thumb = snapThumb(); setStep(kidD.n, T('טועם…', 'Tasting…'));
  ice.userData.from = ice.position.clone(); ice.userData.r0 = ice.rotation.y; setView(kid.isGuest ? 'serveG' : 'serve', 1.1, 0); A.music.vol = .2; $('order').hidden = true; }
function serveTick(dt) { serveT += dt; const t = serveT; const kp = kid.g.position; const hand = kid.isGuest ? kid.holdW().sub(V3(0, CH * .46, 0)) : V3(kp.x + .24, .84, kp.z + .34);
  if (t < 1.1) { const k = ease(t / 1.1); ice.position.lerpVectors(ice.userData.from, hand, k); ice.position.y += Math.sin(k * Math.PI) * .4; ice.scale.setScalar(lerp(1, .92, k)); ice.rotation.y = lerp(ice.userData.r0, Math.round(ice.userData.r0 / TAU) * TAU + .4, k); }
  else if (t < 4.2) { // looking & tasting
    const lk = t - 1.1; ice.position.copy(hand); ice.position.y += Math.sin(lk * 3) * .01; kid.arms[1].rotation.z = lerp(kid.arms[1].rotation.z, .9, dt * 5); kid.arms[1].rotation.x = lerp(kid.arms[1].rotation.x, -.6, dt * 5);
    kid.head.rotation.y = Math.sin(lk * 2.2) * .35 + .25; kid.head.rotation.x = .18 + Math.sin(lk * 3.1) * .05;
    if (lk > 1.6 && lk < 2.4) { const k = Math.sin((lk - 1.6) / .8 * Math.PI); ice.position.lerp(kid.isGuest ? kid.lickW() : V3(kp.x + .08, .78, kp.z + .42), k); kid.open.visible = k > .3; kid.smile.visible = k <= .3; kid.eyes.forEach(e => e.scale.y = k > .3 ? .15 : 1); }
    tenseTick(lk); }
  else if (!verdict.shown) { verdict.shown = true; reveal(); }
  if (verdict.shown) { ice.position.copy(hand); if (!kid.isGuest) ice.position.y += (kid.mood === 'happy' ? kid.g.position.y : 0); kid.head.rotation.y = lerp(kid.head.rotation.y, 0, dt * 4); kid.head.rotation.x = lerp(kid.head.rotation.x, 0, dt * 4); } }
function guestHand() { if (kid && kid.isGuest && ice && serveT > .6) kid.handW = ice.position.clone().add(V3(-.055, CH * .5 * ice.scale.x, -.015)); }
function tenseTick(lk) { const el = $('tense'); if (el.hidden) { el.hidden = false; $('tenseT').textContent = T('מה הוא יגיד?…', 'What will they say?…'); A.loopOn('roll', 'bandpass', 180, 1.2, .07, 16); A.voice('hm', kidD.p); bubble('🤔 …'); }
  const fin = clamp(verdict.score / 100, .04, .96); const k = clamp(lk / 3.0, 0, 1); const amp = (1 - k) * .45; const x = clamp(lerp(.5, fin, sstep(.3, 1, k)) + Math.sin(lk * 7.5) * amp * .9, .03, .97);
  const b = $('tenseB'); b.style.left = x * 100 + '%'; b.textContent = x < .25 ? '😖' : x < .45 ? '😕' : x < .62 ? '😐' : x < .8 ? '🙂' : '😍'; }
function scoreIt() { const why = []; let sc = 0; const made = madeFlavors();
  if (sameSet(made, order.flav)) sc += 35; else if (made.some(f => order.flav.includes(f))) { sc += 16; why.push(['fl', T('ביקשתי ', 'I asked for ') + order.flav.map(f => FLV[f].n).join(' + ')]); } else why.push(['fl', T('ביקשתי ', 'I asked for ') + order.flav.map(f => FLV[f].n).join(' + ')]);
  if (build.cone === order.cone) sc += 15; else why.push(['cn', T('רציתי ', 'I wanted a ') + CONES[order.cone].n]);
  const tg = SIZES[order.size].u, d = build.u - tg; sc += 20 * clamp(1 - Math.abs(d) / 1.5, 0, 1); if (d < -.9) why.push(['sz', T('😢 כל כך קטנה?', '😢 So small?')]); else if (d > .9) why.push(['sz', T('😮 ענקית! לא אצליח לגמור', '😮 Huge! I can’t finish it')]);
  if (order.tops.length) { let have = 0; for (const k of order.tops) { const ok = (tops.cnt[k] || 0) >= (TOP[k].k === 'big' ? 1 : TOP[k].k === 'sau' ? 8 : 5); if (ok) have++; else why.push(['tp', T('חסר לי: ', 'Missing: ') + TOP[k].n]); } sc += 20 * have / order.tops.length; } else sc += 20;
  sc += 10 * (1 - clamp((swirl.wobble() - .008) / .03, 0, 1));
  if (order.no && (tops.cnt[order.no] || 0) > 0) { sc -= 35; why.unshift(['no', T('🙅 אמרתי בלי ', '🙅 I said no ') + TOP[order.no].n + '!']); }
  const extras = Object.keys(tops.cnt).filter(k => !order.tops.includes(k) && k !== order.no).length; sc += Math.min(4, extras * 2);
  sc = clamp(Math.round(sc), 0, 100); const tier = sc >= 85 ? 3 : sc >= 62 ? 2 : sc >= 40 ? 1 : 0; return { score: sc, tier, why }; }
function reveal() { A.loopOff('roll'); $('tense').hidden = true; const v = verdict; const tier = v.tier; buzz(tier >= 2 ? [30, 40, 30] : 120);
  const fv = v.why.find(w => w[0] === 'fav'), hv = v.why.find(w => w[0] === 'no' && mode === 'free'); const line = hv ? hv[1] : fv && tier >= 2 ? fv[1] : tier === 3 ? pick(LINES.love) : tier === 2 ? pick(LINES.like) : tier === 1 ? (v.why[0] ? '🤔 ' + v.why[0][1].replace(/^[^\p{L}]+/u, '') : pick(LINES.meh)) : (v.why[0] && v.why[0][0] === 'no' ? v.why[0][1] : pick(LINES.yuck) + (v.why[0] ? ' ' + v.why[0][1].replace(/^[^\p{L}]+/u, '') : ''));
  bubble(line); kid.setMood(tier === 3 ? 'happy' : tier === 2 ? 'smile' : tier === 1 ? 'sad' : 'angry');
  const b3 = $('big3'); b3.textContent = ['🤢', '😕', '😋', '😍'][tier]; b3.classList.add('on'); setTimeout(() => b3.classList.remove('on'), 1300);
  if (tier === 3) { A.voice('yay', kidD.p); [0, 4, 7, 12, 16].forEach((n, k) => A.tone(523 * Math.pow(2, n / 12), .22, 'triangle', .08, k * .08)); A.noise(.6, 'highpass', 6000, 1, .06); FX.burst(V3(KIDPOS.x, 1.5, KIDPOS.z + .2), 80, CONFETTI, 3.2, .05, 1.8, 4); for (let i = 0; i < 12; i++) FX.emit(V3(KIDPOS.x + rnd(-.3, .3), 1.3, KIDPOS.z + .3), V3(rnd(-.3, .3), rnd(.6, 1.2), 0), [2.6, .5, 1.2], .07, 1.6, -.2); $('flash').style.opacity = .5; setTimeout(() => $('flash').style.opacity = 0, 120); }
  else if (tier === 2) { A.voice('wow', kidD.p); [0, 4, 7].forEach((n, k) => A.tone(523 * Math.pow(2, n / 12), .2, 'triangle', .07, k * .08)); FX.burst(V3(KIDPOS.x, 1.4, KIDPOS.z + .2), 30, CONFETTI, 2.2, .045, 1.4, 4); }
  else if (tier === 1) { A.voice('hm', kidD.p * .95); A.tone(392, .3, 'triangle', .06); A.tone(370, .4, 'triangle', .06, .25); }
  else { A.voice('aww', kidD.p); A.tone(392, .25, 'sawtooth', .04); A.tone(370, .25, 'sawtooth', .04, .25); A.tone(349, .25, 'sawtooth', .04, .5); A.tone(330, .7, 'sawtooth', .04, .75, 250); }
  const coins = ([1, 4, 8, 12][tier] + (tier === 3 ? Math.floor(rnd(3, 7)) : 0)) * (kidD.f ? 2 : 1); if (kidD.f) setTimeout(() => toast(T('⭐ אורח מיוחד – מטבעות כפולים!', '⭐ Special guest – double coins!'), 2200), 600); S.coins += coins; if (mode === 'cust') S.served++; if (tier === 3) S.love = (S.love || 0) + 1; saveGal(); S.save(); updCoins();
  for (let i = 0; i < Math.min(8, coins); i++) setTimeout(() => { A.tone(1568 + i * 40, .06, 'square', .03); const el = document.createElement('div'); el.className = 'coinpop'; el.textContent = '🪙'; el.style.left = innerWidth / 2 + rnd(-60, 60) + 'px'; el.style.top = innerHeight * .45 + 'px'; document.body.appendChild(el); setTimeout(() => el.remove(), 1300); }, 500 + i * 90);
  setTimeout(() => showResult(coins), 2200); }
function showResult(coins) { state = 'result'; const v = verdict; const card = $('resCard');
  card.innerHTML = `<div class="rbig">${['🤢', '😕', '😋', '😍'][v.tier]}</div><h3>${[T('אוי לא…', 'Oh no…'), T('לא רע', 'Not bad'), T('טעים!', 'Yummy!'), T('מושלם!!', 'Perfect!!')][v.tier]}</h3><div class="st">${'⭐'.repeat(v.tier)}${'<span style="opacity:.22;filter:grayscale(1)">⭐</span>'.repeat(3 - v.tier)}</div>
  ${thumb ? `<img src="${thumb}">` : ''}<p>${kidD.n}: ${mode === 'free' ? (v.why.length ? v.why.map(w => w[1]).join(' · ') : (v.tier >= 2 ? T('יצירה מדהימה!', 'Amazing creation!') : T('אפשר עוד יותר!', 'You can do even better!'))) : v.tier === 3 ? T('הכי טוב בעולם!', 'The best ever!') : v.why.length ? v.why.slice(0, 2).map(w => w[1]).join(' · ') : T('תודה!', 'Thanks!')}</p><div class="cn">+${coins} 🪙</div>
  <div class="row" style="margin-top:12px"><button class="btn" id="rMenu">${T('תפריט', 'Menu')}</button><button class="btn pri" id="rNext">${mode === 'free' ? T('עוד אחת! ▶', 'Another! ▶') : T('הלקוח הבא ▶', 'Next customer ▶')}</button></div>`;
  $('resSheet').hidden = false; $('rMenu').onclick = () => { $('resSheet').hidden = true; showTitle(); }; $('rNext').onclick = () => { $('resSheet').hidden = true; bubOff(); A.music.vol = .55; if (mode === 'free') { if (kid) { scene.remove(kid.g); kid = null; } build = { hop: S.hop.slice(), cone: build.cone, spout: null, u: 0, done: false }; if (ice) { ice.removeFromParent(); ice = null; } goFill(); } else nextCustomer(); }; }
function finishFree() { guideOff(); const gs = readyGuests(); const gst = gs.length && Math.random() < .35; makeKid(gst ? pick(gs) : pick(KIDS.filter(k => k !== kidD))); preloadGuest(); if (gst) guestFanfare(); kid.g.position.x = KIDPOS.x + 1.2; kidD.fav = pick(Object.keys(FLV)); kidD.hate = pick(Object.keys(TOP).filter(k => unl('t:' + k) && k !== 'cherry'));
  bubble(T('🧐 אני הטועם המסתורי! בואו נראה…', '🧐 I’m the mystery taster! Let’s see…'), 1600); goServe(); }
function scoreFree() { const why = []; const made = madeFlavors(); const kinds = Object.keys(tops.cnt).filter(k => tops.cnt[k] >= (TOP[k].k === 'big' ? 1 : TOP[k].k === 'sau' ? 8 : 5)).length;
  let sc = 28 + Math.min(4, kinds) * 9 + (made.length > 1 ? 7 : 0) + 12 * clamp(1 - Math.abs(build.u - 3.6) / 1.6, 0, 1) + (tops.cnt.cherry ? 5 : 0) + (build.cone !== 'waffle' ? 3 : 0) + rnd(-10, 10);
  if (made.includes(kidD.fav)) { sc += 15; why.push(['fav', T('😍 זה הטעם האהוב עליי: ', '😍 My favorite flavor: ') + FLV[kidD.fav].n]); }
  if ((tops.cnt[kidD.hate] || 0) > 0) { sc -= 28; why.unshift(['no', T('🤢 אני לא אוהב ', '🤢 I don’t like ') + TOP[kidD.hate].n]); }
  if (!kinds) why.push(['tp', T('🤔 קצת חסרות תוספות…', '🤔 Needs some toppings…')]);
  sc = clamp(Math.round(sc), 0, 100); return { score: sc, tier: sc >= 85 ? 3 : sc >= 62 ? 2 : sc >= 40 ? 1 : 0, why }; }
function oldFinishFree() { state = 'showcase'; hidePanel(); stroke = null; A.loopOff('sauce'); thumb = snapThumb(); saveGal(); S.save(); setStep(T('יצירה מושלמת!', 'A masterpiece!'), '');
  [0, 4, 7, 12].forEach((n, k) => A.tone(659 * Math.pow(2, n / 12), .22, 'triangle', .07, k * .08)); FX.burst(V3(STAND.x, 1.6, STAND.z), 70, CONFETTI, 2.6, .04, 1.6, 4);
  setTimeout(() => { const card = $('resCard'); card.innerHTML = `<div class="rbig">🍦✨</div><h3>${T('איזו גלידה!', 'What an ice cream!')}</h3>${thumb ? `<img src="${thumb}">` : ''}<p>${T('נשמר באלבום שלכם', 'Saved to your album')}</p>
    <div class="row" style="margin-top:12px"><button class="btn" id="rMenu">${T('תפריט', 'Menu')}</button><button class="btn pri" id="rNext">${T('עוד אחת! ▶', 'Another! ▶')}</button></div>`; $('resSheet').hidden = false;
    $('rMenu').onclick = () => { $('resSheet').hidden = true; showTitle(); }; $('rNext').onclick = () => { $('resSheet').hidden = true; build = { hop: S.hop.slice(), cone: build.cone, spout: null, u: 0, done: false }; if (ice) { ice.removeFromParent(); ice = null; } stand.visible = false; goFill(); }; }, 1600); }

/* ---- photo for album ---- */
let thumb = null;
function snapThumb() { try { const sv = { p: camera.position.clone(), q: camera.quaternion.clone() }; const wb = new THREE.Box3().setFromObject(ice); const c = wb.getCenter(V3()), sz = wb.getSize(V3());
  camera.clearViewOffset(); const th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), d = Math.max(sz.y * 1.15 / (2 * th), sz.x * 1.25 / (2 * th * camera.aspect)) * 1.12; camera.position.set(c.x, c.y + d * .35, c.z + d); camera.lookAt(c); stream.visible = false; $('bub').classList.remove('on');
  E.render(); const cv = renderer.domElement; const W = cv.width, H = cv.height; const cw = Math.min(W * .94, H * .9 * 5 / 6), ch = cw * 6 / 5; const o = cnv(200, 240); o.getContext('2d').drawImage(cv, (W - cw) / 2, (H - ch) / 2, cw, ch, 0, 0, 200, 240);
  camera.position.copy(sv.p); camera.quaternion.copy(sv.q); return o.toDataURL('image/jpeg', .82); } catch (e) { return null; } }
function saveGal() { if (!thumb) return; S.gal.unshift(thumb); if (S.gal.length > 24) S.gal.length = 24; }

/* ================= input ================= */
const stageEl = $('stage');
stageEl.addEventListener('pointerdown', e => { A.ac(); if (state === 'pull' && !swirl.done && !topple) { if (pullStarted && tipping) return; holding = true; y0 = e.clientY; leverK = 0; clk = 0; stageEl.setPointerCapture(e.pointerId); A.tone(160, .04, 'square', .03); }
  if (state === 'top' && moveT > .8) { if (topGuide) { topGuide = 0; guideOff(); } tops.snap(); stroke = { ptr: { x: e.clientX, y: e.clientY }, acc: 0, lastP: null }; applyTop(stroke.ptr, false); stageEl.setPointerCapture(e.pointerId); } });
stageEl.addEventListener('pointermove', e => { if (state === 'pull' && holding) { leverK = clamp((e.clientY - y0) / (innerHeight * .16), 0, 1); const c = Math.floor(leverK * 4); if (c > clk) { clk = c; buzz(8); A.tone(900 + c * 120, .025, 'square', .025); } else if (c < clk) clk = c; }
  if (stroke) { stroke.ptr = { x: e.clientX, y: e.clientY }; } });
const up = () => { holding = false; leverK = 0; if (stroke) { stroke = null; A.loopOff('sauce'); renderOrder(); } };
stageEl.addEventListener('pointerup', up); stageEl.addEventListener('pointercancel', up);

/* ================= title ================= */
function showTitle() { state = 'title'; guideOff(); A.allOff(); A.stopMusic(); hidePanel(); bubOff(); $('hud').hidden = true; $('order').hidden = true; $('gauge').hidden = true; $('hold').hidden = true; $('tense').hidden = true; $('title').hidden = false; stream.visible = false;
  if (kid) { scene.remove(kid.g); kid = null; } buildDemo(); setView('title', 1.2, 0);
  $('stat').innerHTML = `<span>🪙 ${S.coins}</span><span>🧒 ${S.served}</span><span>😍 ${S.love || 0}</span>`;
  $('galT').textContent = T('📸 האלבום שלי', '📸 My album'); $('gal').innerHTML = S.gal.length ? S.gal.map(s => `<img src="${s}" alt="">`).join('') : `<div class="empty">${T('הגלידות שתכינו יופיעו כאן', 'Your ice creams will appear here')}</div>`; }
function buildDemo() { build = { hop: ['straw', 'van'], cone: 'party', spout: 1, u: 0, done: false }; newIce('party'); swirl.reset([FLV.straw.c, FLV.van.c], [{ c: FLV.straw.sp, n: FLV.straw.spN }, { c: FLV.van.sp, n: FLV.van.spN }]);
  swirl.grow(3.9, 0, 0); while (!swirl.tip(.05)); ice.position.set(STAND.x, STAND.y + .17 - CH * .62, STAND.z); stand.visible = true; holder.visible = false; ice.updateMatrixWorld(true);
  const rs = (n, key, kind, cols) => { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), el = rnd(.15, 1.2); const dir = V3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)); const o = V3(0, CH + .18, 0); ray.set(ice.localToWorld(o.clone().addScaledVector(dir, .4)), ice.localToWorld(o.clone()).sub(ice.localToWorld(o.clone().addScaledVector(dir, .4))).normalize());
    const h = ray.intersectObject(swirl.mesh, false)[0]; if (h) { tops.add(kind, key, ice.worldToLocal(h.point.clone()), hitNormal(h, ray.ray.direction), pick(cols), { fall: false }); } } };
  rs(170, 'rainbow', 'spr', TOP.rainbow.cols); rs(14, 'lentil', 'len', TOP.lentil.cols); tops.big('cherry', swirl.top.clone().add(swirl.mesh.position), V3(0, 1, 0)); tops.anims = []; tops.bigs.forEach(b => b.scale.setScalar(1)); }

/* ================= loop ================= */
let last = performance.now();
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000) * (window.__fast || 1); last = now; const t = now / 1000;
  M.lids.forEach(l => { const o = l.userData.open || 0; l.rotation.x = lerp(l.rotation.x, -o * 1.75, Math.min(1, dt * 6)); });
  M.agit.forEach(a => a.rotation.y += dt * (state === 'freeze' ? 9 : state === 'pull' && holding ? 4 : .6));
  if (state !== 'freeze') M.frost.forEach(f => f.material.opacity = lerp(f.material.opacity, state === 'title' ? .15 : .35, dt));
  if (state === 'fill' || pouring) pourTick(dt); dropsTick(dt);
  if (state === 'freeze') freezeTick(dt);
  if (state === 'cone') { popT = Math.min(1, popT + dt * 3); if (ice) { ice.scale.setScalar(lerp(.6, 1, eOut(popT)) + Math.sin(popT * Math.PI) * .08); holder.position.x = lerp(holder.position.x, SPX[build.spout == null ? 1 : build.spout], dt * 8); ice.position.x = holder.position.x; } holder.visible = true; }
  if (state === 'pull') pullTick(dt);
  if (state === 'top') topTick(dt);
  if (state === 'serve') serveTick(dt); if (state === 'serve' || state === 'result') guestHand();
  if (state === 'title' && ice) ice.rotation.y += dt * .5; if (state === 'showcase' && ice) ice.rotation.y += dt * 1.6;
  if (kid) { if (kid.walk) { const k = kid.g.position; k.x = lerp(k.x, KIDPOS.x, Math.min(1, dt * 3.2)); kid.legs.forEach((l, i) => l.rotation.x = Math.sin(t * 12 + i * Math.PI) * .5 * clamp((k.x - KIDPOS.x) * 3, 0, 1)); if (Math.abs(k.x - KIDPOS.x) < .01) kid.walk = 0; kid.g.rotation.y = lerp(kid.g.rotation.y, -.12, dt * 2); }
    kid.update(t, dt); if (state !== 'serve' && state !== 'result') { kid.head.rotation.y = lerp(kid.head.rotation.y, curView === 'kid' ? 0 : -.6, dt * 3); } }
  if (state === 'cone' || state === 'pull' || state === 'fill' || state === 'freeze') { holder.visible = !!ice && state !== 'fill' && state !== 'freeze'; }
  if (ice && (state === 'fill' || state === 'freeze')) ice.visible = false; else if (ice) ice.visible = true;
  camUpdate(dt); placeBub(); guideTick(); FX.update(dt, TOPY - .3); A.tick(); E.render(); }

/* ================= boot ================= */
$('backBtn').innerHTML = ICO.home ? ICO.grid('#f0508e') : '←'; $('homeT').innerHTML = ICO.home('#f0508e'); soundButton('sndBtn', S, A, '#f0508e'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('backBtn').onclick = () => { $('resSheet').hidden = true; showTitle(); };
$('tSub').textContent = T('ממלאים את מכונת הגלידה, מושכים את הידית, מוסיפים תוספות ומגישים לילדים – האם הם יאהבו?', 'Fill the soft-serve machine, pull the lever, add toppings and serve the kids – will they love it?');
$('custBtn').textContent = T('🧒 להגיש לילדים', '🧒 Serve the kids'); $('freeBtn').textContent = T('🎨 יצירה חופשית', '🎨 Free creation');
$('custBtn').onclick = () => { A.ac(); A.tone(880, .06, 'sine', .06); startGame('cust'); }; $('freeBtn').onclick = () => { A.ac(); A.tone(880, .06, 'sine', .06); startGame('free'); };
setTimeout(() => { E.resize(); viewPose('title', CAM); showTitle(); CAM.k = 1; $('loading').hidden = true; requestAnimationFrame(frame); window.__swOK = true; }, 30);
window.__sw = { preloadAll: () => Promise.all(GUESTS.map(g => loadMix('lib/chars/' + g.f + '.glb').then(x => GSRC[g.f] = x))), get kid() { return kid; }, get pouring() { return !!pouring; }, get state() { return state; }, get build() { return build; }, get order() { return order; }, swirl, tops, startGame, goTop, goServe, hitIce, set holding(v) { holding = v; }, get ice() { return ice; }, get verdict() { return verdict; }, camera, setTop: k => { curTop = k; }, applyAt: (x, y) => { tops.snap(); stroke = { ptr: { x, y }, acc: 0, lastP: null }; applyTop(stroke.ptr, false); }, endStroke: up, S };
