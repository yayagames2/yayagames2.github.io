import { THREE, $, V3, C, clamp, lerp, rnd, rng, T, EN, store, engine, studioEnv, std, shadowAll, cnv, ctex, particles, CONFETTI, audio, toast, ICO, hubButtons, soundButton, qualityButton, cutie } from '../lib/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { carShape, BS, BT, pillarMesh } from '../lib/carkit.js';

const S = store('flip-save', { money: 15000, rep: 0, sales: 0, car: null, lot: null, li: 0, req: null, total: 0, best: 0, tut: 0 });
const E = engine(S, { fov: 36, bloom: [.42, .5, 1.05], exposure: 1.05, bg: '#1a1d28', vignette: .32 });
const { scene, camera, renderer } = E; studioEnv(E, '#fff6ea', '#3a3f52', .55);
const A = audio(S); const FX = particles(E, 1400);
const V2 = (x, y) => new THREE.Vector2(x, y);
const fmt = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
const r50 = n => Math.round(n / 50) * 50;
const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

/* ================= DATA ================= */
const COLORS = [
  ['#d91c1c', 'אדום', 'Red', 'red'], ['#ff6a00', 'כתום', 'Orange', 'orange'], ['#ffc400', 'צהוב', 'Yellow', 'yellow'], ['#3fbf3f', 'ירוק', 'Green', 'green'], ['#0f5e3a', 'ירוק מרוץ', 'Racing green', 'green'],
  ['#1e7bff', 'כחול', 'Blue', 'blue'], ['#0a1f5c', 'כחול לילה', 'Midnight', 'blue'], ['#00c2d1', 'טורקיז', 'Teal', 'blue'], ['#8a2be2', 'סגול', 'Purple', 'purple'], ['#ff4fa8', 'ורוד', 'Pink', 'pink'],
  ['#f4f4f4', 'לבן', 'White', 'white'], ['#b8bcc4', 'כסוף', 'Silver', 'silver'], ['#4a4f58', 'אפור', 'Grey', 'grey'], ['#121316', 'שחור', 'Black', 'black'], ['#7a1022', 'בורדו', 'Burgundy', 'red'], ['#c8a878', 'חול', 'Sand', 'sand'],
].map(([h, he, en, t], i) => ({ v: i, h, n: T(he, en), t, c: 0, r: 0, tags: [t], lvl: 1 }));
const WCOL = [['#c9ced6', 'כסוף', 'Silver', []], ['#17181c', 'שחור', 'Black', ['street']], ['#4a4e56', 'גראפיט', 'Gunmetal', ['race']], ['#f2f2f2', 'לבן', 'White', ['race']], ['#d4a72c', 'זהב', 'Gold', ['lux']], ['#9a6a32', 'ברונזה', 'Bronze', ['race']], ['#d91c1c', 'אדום', 'Red', ['street']], ['#9aff2a', 'ליים', 'Lime', ['street', 'loud']], ['#1e7bff', 'כחול', 'Blue', ['street']]]
  .map(([h, he, en, tags], i) => ({ v: i, h, n: T(he, en), c: i ? 300 : 0, r: .9, tags, lvl: 1 }));
const o = (v, he, en, ic, c = 0, r = 1, tags = [], lvl = 1) => ({ v, n: T(he, en), ic, c, r, tags, lvl });
const OPT = {
  fin: [o('solid', 'מבריק', 'Gloss', 'g', 600, .9, ['clean']), o('metal', 'מטאלי', 'Metallic', 'm', 900, 1, ['clean', 'metal']), o('matte', 'מט', 'Matte', 'x', 1100, 1.05, ['street', 'matte']),
    o('pearl', 'פנינה', 'Pearl', 'p', 1600, 1.15, ['lux', 'pearl'], 2), o('chrome', 'כרום', 'Chrome', 'c', 2600, 1.1, ['lux', 'loud', 'chrome'], 3), o('carbon', 'קרבון', 'Carbon', 'k', 2400, 1.2, ['race', 'carbon'], 4),
    o('chroma', 'זיקית', 'Chameleon', 'z', 3000, 1.25, ['street', 'loud', 'chroma'], 6), o('gold', 'זהב', 'Gold', 'a', 3800, 1.15, ['lux', 'loud', 'gold'], 8), o('galaxy', 'גלקסיה', 'Galaxy', 'y', 3400, 1.3, ['street', 'loud', 'galaxy'], 9)],
  col: COLORS,
  roof: [o('same', 'כמו הגוף', 'Body', '🚘'), o('black', 'שחור', 'Black', '⬛', 500, 1.1, ['street']), o('white', 'לבן', 'White', '⬜', 500, 1.05, ['lux']), o('carbon', 'קרבון', 'Carbon', '🏁', 1200, 1.2, ['race', 'carbon'], 4)],
  wd: [o('stock', 'מקורי', 'Stock', 'W0'), o('sport', 'ספורט', 'Sport', 'W1', 1200, 1.05, ['race']), o('dish', 'קערה עמוקה', 'Deep dish', 'W2', 1500, 1.1, ['street', 'deep']), o('turbine', 'טורבינה', 'Turbine', 'W3', 1700, 1.1, ['lux'], 2),
    o('mesh', 'רשת', 'Mesh', 'W4', 1600, 1.1, ['lux', 'mesh'], 2), o('forged', 'מחושל', 'Forged', 'W5', 2600, 1.2, ['race', 'forged'], 3)],
  wc: WCOL,
  wsz: [o(0, '17 אינץ׳', '17 inch', '⭕'), o(1, '19 אינץ׳', '19 inch', '🔵', 700, 1.05, ['street', 'big']), o(2, '21 אינץ׳', '21 inch', '🟠', 1300, 1.05, ['lux', 'big'], 2)],
  cal: [o('none', 'מקורי', 'Stock', '#777b84'), o('red', 'אדום', 'Red', '#e01818', 350, 1.1, ['race']), o('yellow', 'צהוב', 'Yellow', '#ffc400', 350, 1.1, ['race']), o('blue', 'כחול', 'Blue', '#1e7bff', 350, 1.05, ['race']), o('lime', 'ליים', 'Lime', '#9aff2a', 350, 1, ['street'])],
  spo: [o('none', 'בלי', 'None', '✖️'), o('lip', 'שפתון', 'Lip', 'S1', 600, 1.05, ['clean']), o('duck', 'זנב ברווז', 'Ducktail', 'S2', 900, 1.1, ['street']), o('gt', 'כנף GT', 'GT wing', 'S3', 1800, 1.1, ['race', 'loud', 'wing'], 2), o('swan', 'צוואר ברבור', 'Swan neck', 'S4', 2600, 1.2, ['race', 'loud', 'wing'], 4)],
  am: [o('body', 'צבע הגוף', 'Body color', '🎨'), o('black', 'שחור מבריק', 'Gloss black', '⬛', 300, 1, ['street']), o('carbon', 'קרבון', 'Carbon', '🏁', 800, 1.2, ['race', 'carbon'], 2)],
  skirt: [o(0, 'בלי', 'None', '✖️'), o(1, 'חצאיות צד', 'Side skirts', 'K', 700, 1.05, ['race'])],
  split: [o(0, 'בלי', 'None', '✖️'), o(1, 'ספליטר קדמי', 'Front splitter', 'P', 600, 1.05, ['race'])],
  diff: [o(0, 'בלי', 'None', '✖️'), o(1, 'מפזר אחורי', 'Rear diffuser', 'D', 700, 1.05, ['race'], 2)],
  scoop: [o('none', 'בלי', 'None', '✖️'), o('scoop', 'סקופ', 'Scoop', 'H1', 600, 1, ['street']), o('vents', 'פתחי אוורור', 'Vents', 'H2', 700, 1.05, ['race']), o('shaker', 'שייקר', 'Shaker', 'H3', 1400, 1.15, ['street', 'loud'], 3)],
  stripe: [o('none', 'בלי', 'None', '✖️'), o('twin', 'פסי מרוץ', 'Twin stripes', 'T1', 700, 1.05, ['race', 'stripes']), o('wide', 'פס רחב', 'Wide stripe', 'T2', 700, 1, ['street', 'stripes']), o('side', 'פס צד', 'Side line', 'T3', 500, 1.05, ['clean', 'stripes'])],
  sc: COLORS,
  decal: [o('none', 'בלי', 'None', '✖️'), o('number', 'מספר מרוץ', 'Race number', '#️⃣', 500, 1.05, ['race', 'decal']), o('star', 'כוכב', 'Star', '⭐', 500, 1, ['clean', 'decal']), o('bolt', 'ברק', 'Lightning', '⚡', 600, 1, ['street', 'decal']),
    o('flames', 'להבות', 'Flames', '🔥', 800, 1, ['street', 'loud', 'decal'], 2), o('checker', 'דגל משובץ', 'Checker', '🏁', 900, 1.05, ['race', 'loud', 'decal'], 3)],
  tint: [o('none', 'שקוף', 'Clear', '#5a7a92'), o('light', 'כהה קל', 'Light', '#2a3a48', 300, 1.05, ['clean', 'tint']), o('dark', 'כהה', 'Dark', '#090a0d', 400, 1.1, ['street', 'tint']), o('blue', 'כחלחל', 'Blue', '#123a7a', 500, 1, ['lux', 'tint']), o('mirror', 'מראה', 'Mirror', '#c7d0dc', 900, 1.1, ['lux', 'tint'], 3)],
  glow: [o('none', 'בלי', 'None', '#333'), o('cyan', 'תכלת', 'Cyan', '#00f0ff', 900, 1, ['street', 'loud', 'neon'], 2), o('pink', 'ורוד', 'Pink', '#ff2fd0', 900, 1, ['street', 'loud', 'neon'], 2), o('lime', 'ירוק', 'Lime', '#7dff2a', 900, 1, ['street', 'loud', 'neon'], 2),
    o('purple', 'סגול', 'Purple', '#8a3cff', 900, 1, ['street', 'loud', 'neon'], 2), o('red', 'אדום', 'Red', '#ff2030', 900, 1, ['street', 'loud', 'neon'], 2)],
  hl: [o('white', 'לבן', 'White', '#ffffff'), o('warm', 'חם', 'Warm', '#ffd27a', 300, 1, ['clean']), o('ice', 'קרח', 'Ice', '#8fd8ff', 400, 1.05, ['lux']), o('purple', 'סגול', 'Purple', '#b26bff', 500, 1, ['street'], 3)],
  eng: [o(0, 'מקורי', 'Stock', '⚙️'), o(1, 'שלב 1', 'Stage 1', '🔧', 1500, 1.1, ['race']), o(2, 'שלב 2', 'Stage 2', '🔩', 3200, 1.15, ['race'], 3), o(3, 'שלב 3 טורבו', 'Stage 3 Turbo', '🚀', 6000, 1.2, ['race', 'loud'], 5)],
  exh: [o('single', 'מקורי', 'Stock', 'E1'), o('dual', 'כפול', 'Dual', 'E2', 500, 1.05, ['street']), o('quad', 'מרובע', 'Quad', 'E3', 900, 1.1, ['race'], 2), o('center', 'מרכזי', 'Center', 'E4', 1200, 1.1, ['race', 'loud'], 4)],
  low: [o(0, 'מקורי', 'Stock', '⬆️'), o(1, 'הנמכה', 'Lowered', '⬇️', 600, 1.05, ['street', 'low']), o(2, 'סופר נמוך', 'Slammed', '⏬', 1100, 1.05, ['street', 'low', 'loud'], 2)],
};
const DEF = { fin: 'solid', col: 0, roof: 'same', wd: 'stock', wc: 0, wsz: 0, cal: 'none', spo: 'none', am: 'body', skirt: 0, split: 0, diff: 0, scoop: 'none', stripe: 'none', sc: 10, decal: 'none', tint: 'none', glow: 'none', hl: 'white', eng: 0, exh: 'single', low: 0 };
const VK = ['fin', 'roof', 'wd', 'wc', 'wsz', 'cal', 'spo', 'am', 'skirt', 'split', 'diff', 'scoop', 'stripe', 'decal', 'tint', 'glow', 'hl', 'eng', 'exh', 'low'];
const TABS = [
  { id: 'paint', ic: '🎨', n: T('צבע', 'Paint'), subs: [['fin', T('גימור', 'Finish')], ['col', T('צבע', 'Color')], ['roof', T('גג', 'Roof')]] },
  { id: 'wheel', ic: '🛞', n: T('גלגלים', 'Wheels'), subs: [['wd', T('עיצוב', 'Design')], ['wc', T('צבע', 'Color')], ['wsz', T('גודל', 'Size')], ['cal', T('קליפרים', 'Calipers')]] },
  { id: 'aero', ic: '🪽', n: T('ערכת גוף', 'Body kit'), subs: [['spo', T('ספוילר', 'Spoiler')], ['skirt', T('חצאיות', 'Skirts')], ['split', T('ספליטר', 'Splitter')], ['diff', T('מפזר', 'Diffuser')], ['scoop', T('מכסה מנוע', 'Hood')], ['am', T('חומר', 'Material')]] },
  { id: 'style', ic: '✨', n: T('סטייל', 'Style'), subs: [['stripe', T('פסים', 'Stripes')], ['sc', T('צבע פסים', 'Stripe color')], ['decal', T('מדבקות', 'Decals')], ['tint', T('חלונות', 'Windows')], ['glow', T('ניאון', 'Neon')], ['hl', T('פנסים', 'Lights')]] },
  { id: 'mech', ic: '🔧', n: T('מנוע', 'Engine'), subs: [['eng', T('מנוע', 'Engine')], ['exh', T('אגזוז', 'Exhaust')], ['low', T('מתלים', 'Suspension')]] },
];
const MODELS = [
  { id: 'kaze', br: 'Nakamura', n: 'Kaze', cls: T('האצ׳בק ספורט', 'Hot hatch'), price: 6000, lvl: 1, fav: 'street', L: 3.9, W: 1.66, wr: .31, fa: 1.22, ra: -1.24, bot: .24, noseY: .6, hoodY: .84, belt: .96, tailY: .92, ws: .66, rf: -.02, rr: -1.55, rb: -1.86, roofY: 1.42, deckEnd: .08, hatch: 1 },
  { id: 'corsa', br: 'Strada', n: 'Corsa', cls: T('קופה', 'Coupe'), price: 14000, lvl: 1, fav: 'race', L: 4.3, W: 1.74, wr: .32, fa: 1.36, ra: -1.32, bot: .2, noseY: .54, hoodY: .8, belt: .86, tailY: .82, ws: .5, rf: -.22, rr: -.98, rb: -1.52, roofY: 1.3, deckEnd: .5 },
  { id: 'hammer', br: 'Vortek', n: 'Hammer V8', cls: T('מכונית שרירים', 'Muscle'), price: 24000, lvl: 2, fav: 'street', L: 4.7, W: 1.86, wr: .34, fa: 1.5, ra: -1.45, bot: .22, noseY: .74, hoodY: .9, belt: .92, tailY: .9, ws: .34, rf: -.3, rr: -1.05, rb: -1.68, roofY: 1.33, deckEnd: .55, grille: 1 },
  { id: 'kestrel', br: 'Kestrel', n: 'RS', cls: T('רודסטר', 'Roadster'), price: 38000, lvl: 3, fav: 'race', L: 4.1, W: 1.78, wr: .32, fa: 1.3, ra: -1.24, bot: .18, noseY: .52, hoodY: .76, belt: .8, tailY: .8, ws: .18, rf: -.18, rr: -.62, rb: -1.1, roofY: 1.13, deckEnd: .5 },
  { id: 'volta', br: 'Aurex', n: 'Volta', cls: T('חשמלית־על', 'Electric GT'), price: 65000, lvl: 5, fav: 'lux', L: 4.55, W: 1.9, wr: .34, fa: 1.45, ra: -1.45, bot: .17, noseY: .52, hoodY: .74, belt: .82, tailY: .84, ws: .78, rf: .05, rr: -1.15, rb: -1.95, roofY: 1.22, deckEnd: .2, ev: 1 },
  { id: 'tempesta', br: 'Bravura', n: 'Tempesta', cls: T('מכונית־על', 'Supercar'), price: 110000, lvl: 7, fav: 'race', L: 4.5, W: 1.96, wr: .33, fa: 1.45, ra: -1.4, bot: .15, noseY: .46, hoodY: .7, belt: .86, tailY: .88, ws: .55, rf: -.08, rr: -.72, rb: -1.82, roofY: 1.13, deckEnd: .2 },
  { id: 'zero', br: 'Helix', n: 'Zero', cls: T('היפר־קאר', 'Hypercar'), price: 200000, lvl: 9, fav: 'lux', L: 4.75, W: 2.0, wr: .34, fa: 1.55, ra: -1.5, bot: .13, noseY: .42, hoodY: .66, belt: .84, tailY: .94, ws: .62, rf: .02, rr: -.6, rb: -1.75, roofY: 1.09, deckEnd: .25, ev: 1 },
];
MODELS.forEach(M => M.k = .4 + M.price / 25000);
const REP = [0, 40, 100, 180, 280, 400, 550, 720, 920, 1150, 1450];
const lvlOf = r => { let l = 1; for (let i = 1; i < REP.length; i++) if (r >= REP[i]) l = i + 1; return Math.min(l, REP.length); };
const level = () => lvlOf(S.rep);
const TAGN = { matte: T('מט', 'Matte'), metal: T('מטאלי', 'Metallic'), pearl: T('פנינה', 'Pearl'), chrome: T('כרום', 'Chrome'), carbon: T('קרבון', 'Carbon'), chroma: T('זיקית', 'Chameleon'), gold: T('זהב', 'Gold'), galaxy: T('גלקסיה', 'Galaxy'),
  wing: T('כנפיים', 'Wings'), neon: T('ניאון', 'Neon'), stripes: T('פסים', 'Stripes'), decal: T('מדבקות', 'Decals'), deep: T('חישוקי קערה', 'Deep dish'), forged: T('מחושלים', 'Forged'), mesh: T('חישוקי רשת', 'Mesh wheels'), tint: T('חלונות כהים', 'Tint'), low: T('הנמכה', 'Lowered'), big: T('חישוקים גדולים', 'Big rims'),
  red: T('אדום', 'Red'), blue: T('כחול', 'Blue'), white: T('לבן', 'White'), black: T('שחור', 'Black'), yellow: T('צהוב', 'Yellow'), green: T('ירוק', 'Green'), orange: T('כתום', 'Orange'), pink: T('ורוד', 'Pink'), purple: T('סגול', 'Purple'), silver: T('כסוף', 'Silver') };
const THEMEN = { race: T('מרוץ', 'Racing'), street: T('רחוב', 'Street'), lux: T('יוקרה', 'Luxury'), clean: T('נקי', 'Clean') };

const optOf = (k, v) => OPT[k].find(x => x.v === v) || OPT[k][0];
const isDef = (k, v) => v === DEF[k];
function tagLvl(t) { let m = 99; for (const k in OPT) for (const x of OPT[k]) if (x.tags.includes(t)) m = Math.min(m, x.lvl); return m; }
const _trC = {}; function trend() { const key = Math.floor(S.sales / 2) + '_' + level(); if (_trC[key]) return _trC[key]; const r = rng(Math.floor(S.sales / 2) * 7919 + 13); const pool = Object.keys(TAGN).filter(t => tagLvl(t) <= level()); const pick = () => pool.splice(Math.floor(r() * pool.length), 1)[0]; return (_trC[key] = { hot: [pick(), pick()], cold: pick() }); }
function partCost(car, k, v, p) { const M = MODELS[car.m]; if (k === 'col') return partCost(car, 'fin', p.fin, p); if (k === 'sc') return 0; return r50(optOf(k, v).c * M.k); }

/* evaluate a car configuration: style 0..100, expected sale price */
function evaluate(car, p, tr = trend()) {
  const M = MODELS[car.m]; const th = { race: 0, street: 0, lux: 0, clean: 0 }; const tags = new Set(); let partsV = 0, loud = 0, mods = 0;
  const paintNew = !car.stock || p.fin !== car.stock.fin || p.col !== car.stock.col;
  for (const k of VK) { const v = p[k]; const op = optOf(k, v); const counts = k === 'fin' ? paintNew : !isDef(k, v); if (k === 'fin') { tags.add(COLORS[p.col].t); op.tags.forEach(t => tags.add(t)); }
    if (!counts) continue; if (k !== 'fin') op.tags.forEach(t => tags.add(t)); mods++;
    let tm = 1; for (const t of op.tags.concat(k === 'fin' ? [COLORS[p.col].t] : [])) { if (tr.hot.includes(t)) tm += .25; if (tr.cold === t) tm -= .15; }
    partsV += partCost(car, k, v, p) * op.r * tm; for (const t of op.tags) { if (th[t] !== undefined) th[t]++; if (t === 'loud') loud++; } }
  let style = 45; const tot = th.race + th.street + th.lux + th.clean; let dom = 'clean', dn = 0; for (const t in th) if (th[t] > dn) { dn = th[t]; dom = t; }
  style += Math.min(dn * 6, 32) - (tot - dn) * 3; if (dn >= 2 && dom === M.fav) style += 10;
  if (loud > 3) style -= (loud - 3) * 10; if (mods <= 3 && loud === 0 && mods > 0) style += 6;
  if (p.stripe !== 'none' && p.sc === p.col) style -= 6; else if (p.stripe !== 'none') style += 2;
  if (p.wc === 4 && (p.fin === 'gold')) style += 4;
  for (const t of tr.hot) if (tags.has(t)) style += 5; if (tags.has(tr.cold)) style -= 6;
  if (car.cond < .8) style -= (.8 - car.cond) * 70;
  style = clamp(style, 5, 100);
  const condF = .55 + .45 * car.cond; const exp = (M.price * condF + partsV * .8) * (.6 + style / 125);
  return { style, exp, dom: dn >= 2 ? dom : null, tags, mods };
}
function reqOk(it, car, p) { if (it.k === 'colT') return COLORS[p.col].t === it.v; if (it.v === '*') return !isDef(it.k, p[it.k]); return p[it.k] === it.v; }
function reqMatch(car, p) { const R = S.req; if (!R) return false; if (R.m >= 0 && car.m !== R.m) return false; return R.items.every(it => reqOk(it, car, p)); }

/* ================= TEXTURES & MATERIALS ================= */
function carbonCanvas() { const c = cnv(128, 128), x = c.getContext('2d'); x.fillStyle = '#0c0d10'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const g = x.createLinearGradient(i * 16, j * 16, i * 16 + 16, j * 16 + 16); const a = (i + j) % 2; g.addColorStop(0, a ? '#2a2d34' : '#16181d'); g.addColorStop(.5, a ? '#3c4049' : '#202228'); g.addColorStop(1, a ? '#1c1e23' : '#101115'); x.fillStyle = g; x.fillRect(i * 16 + 1, j * 16 + 1, 14, 14); } return c; }
const carbonTex = ctex(carbonCanvas(), 5, 5);
function galaxyCanvas() { const c = cnv(512, 512), x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 512, 512); g.addColorStop(0, '#0a0326'); g.addColorStop(.5, '#1a0848'); g.addColorStop(1, '#050218'); x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  const r = rng(7); for (let i = 0; i < 14; i++) { const px = r() * 512, py = r() * 512, rad = 40 + r() * 120; const gg = x.createRadialGradient(px, py, 0, px, py, rad); const cc = ['rgba(255,60,200,', 'rgba(60,120,255,', 'rgba(120,60,255,', 'rgba(0,220,255,'][i % 4]; gg.addColorStop(0, cc + '.55)'); gg.addColorStop(1, cc + '0)'); x.fillStyle = gg; x.fillRect(0, 0, 512, 512); }
  for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(255,255,255,${.4 + r() * .6})`; const s = r() < .05 ? 2.4 : r() * 1.4; x.fillRect(r() * 512, r() * 512, s, s); } return c; }
const galaxyTex = ctex(galaxyCanvas(), .45, .45);
const glowTex = (() => { const c = cnv(128, 128), x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.5, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return ctex(c); })();
const M_TIRE = std('#17171a', { roughness: .88 });
const M_BLACK = new THREE.MeshPhysicalMaterial({ color: C('#0c0d10'), roughness: .25, clearcoat: 1, clearcoatRoughness: .1 });
const M_MATTEB = std('#101114', { roughness: .8 });
const M_CHROME = std('#ffffff', { metalness: 1, roughness: .08 });
const M_DARKM = std('#25272c', { metalness: .6, roughness: .45 });
const M_CARBON = new THREE.MeshPhysicalMaterial({ color: C('#ffffff'), map: carbonTex, metalness: .3, roughness: .35, clearcoat: 1, clearcoatRoughness: .05 });
const M_TAIL = new THREE.MeshStandardMaterial({ color: C('#400000'), emissive: C('#ff1020'), emissiveIntensity: 2.2, roughness: .3 });
const M_RUST = std('#5a3a22', { roughness: 1 });
function paintMat(fin, hex, dirt = 0) {
  const m = new THREE.MeshPhysicalMaterial({ color: C(hex), metalness: 0, roughness: .32, clearcoat: 1, clearcoatRoughness: .05 });
  switch (fin) {
    case 'metal': m.metalness = .62; m.roughness = .3; break;
    case 'matte': m.roughness = .78; m.clearcoat = 0; m.metalness = .12; break;
    case 'pearl': m.metalness = .35; m.roughness = .25; m.iridescence = .8; m.iridescenceIOR = 1.45; m.iridescenceThicknessRange = [240, 520]; m.sheen = .6; m.sheenColor = C('#ffffff'); m.color.lerp(C('#ffffff'), .15); break;
    case 'chrome': m.color = C(hex).lerp(C('#ffffff'), .55); m.metalness = 1; m.roughness = .05; break;
    case 'carbon': m.color = C('#ffffff'); m.map = carbonTex; m.metalness = .3; m.roughness = .35; break;
    case 'chroma': m.metalness = .85; m.roughness = .2; m.iridescence = 1; m.iridescenceIOR = 2.1; m.iridescenceThicknessRange = [300, 900]; break;
    case 'gold': m.color = C('#e2b441'); m.metalness = 1; m.roughness = .14; break;
    case 'galaxy': m.color = C('#ffffff'); m.map = galaxyTex; m.emissiveMap = galaxyTex; m.emissive = C('#ffffff'); m.emissiveIntensity = .4; m.metalness = .2; m.roughness = .3; break;
  }
  if (dirt > 0) { m.color.lerp(C('#6b5a45'), dirt * .55); m.roughness = lerp(m.roughness, .92, dirt * .85); m.clearcoat *= 1 - dirt; m.metalness *= 1 - dirt * .6; }
  return m;
}
function decalCanvas(type, flip, col, num) {
  const W = 512, H = 170, c = cnv(W, H), x = c.getContext('2d'); const X = v => flip ? W - v : v;
  if (type === 'number') { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(X(256), 85, 70, 0, 7); x.fill(); x.lineWidth = 8; x.strokeStyle = col; x.stroke(); x.fillStyle = '#111'; x.font = '900 88px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(num), X(256), 90); }
  if (type === 'star') { const st = (cx, cy, R, f) => { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * .45 : R; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fillStyle = f; x.fill(); }; st(X(300), 85, 70, col); st(X(190), 70, 30, col); st(X(140), 110, 18, col); }
  if (type === 'bolt') { const P = [[470, 40], [300, 70], [330, 92], [60, 135], [260, 88], [228, 70]]; x.beginPath(); P.forEach(([a, b]) => x.lineTo(X(a), b)); x.closePath(); x.fillStyle = col; x.fill(); x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.6)'; x.stroke(); }
  if (type === 'flames') { const r = rng(3); for (let i = 0; i < 7; i++) { const y0 = 40 + i * 15, len = 230 + r() * 230; const g = x.createLinearGradient(X(512), 0, X(512 - len), 0); g.addColorStop(0, '#ffe25a'); g.addColorStop(.45, '#ff8a1a'); g.addColorStop(1, 'rgba(220,20,20,.0)');
    x.beginPath(); x.moveTo(X(512), y0 - 14); x.bezierCurveTo(X(512 - len * .4), y0 - 30, X(512 - len * .7), y0 + 10, X(512 - len), y0 - 6); x.bezierCurveTo(X(512 - len * .6), y0 + 26, X(512 - len * .3), y0 + 22, X(512), y0 + 16); x.closePath(); x.fillStyle = g; x.fill(); } }
  if (type === 'checker') { const s = 22; for (let i = 0; i < 24; i++) for (let j = 0; j < 3; j++) { const xx = i * s, fade = flip ? 1 - i / 24 : i / 24; x.fillStyle = (i + j) % 2 ? `rgba(255,255,255,${fade})` : `rgba(15,15,15,${fade})`; x.fillRect(xx, 100 + j * s, s, s); } }
  return ctex(c);
}

/* ================= CAR BUILDER ================= */
const geomOf = M => carShape(M);
function ribbon(pts, z0, w, off) {
  const pos = [], idx = [], n = pts.length;
  for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; const x = pts[i].x + ty * off, y = pts[i].y - tx * off; pos.push(x, y, z0 - w / 2, x, y, z0 + w / 2); if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function vribbon(pts, z, h) { const pos = [], idx = []; pts.forEach((p, i) => { pos.push(p.x, p.y - h / 2, z, p.x, p.y + h / 2, z); if (i < pts.length - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }
const box = (w, h, d, m, r = 0) => new THREE.Mesh(r ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d), m);
const cyl = (r1, r2, h, m, seg = 24) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m);

function buildWheel(M, p, rimM, calM) {
  const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);
  const sz = [1, 1.04, 1.08][p.wsz], R0 = M.wr * sz, rimR = R0 * [.6, .68, .76][p.wsz], tw = .25 + M.W * .02;
  const lp = [[rimR, -tw / 2], [R0 - .035, -tw / 2], [R0 - .008, -tw / 2 + .022], [R0, -tw / 2 + .055], [R0, tw / 2 - .055], [R0 - .008, tw / 2 - .022], [R0 - .035, tw / 2], [rimR, tw / 2]].map(([a, b]) => V2(a, b));
  const tire = new THREE.Mesh(new THREE.LatheGeometry(lp, 44), M_TIRE); tire.material.side = THREE.DoubleSide; tire.rotation.x = Math.PI / 2; spin.add(tire);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(rimR, rimR, tw * .92, 36, 1, true), M_DARKM); barrel.rotation.x = Math.PI / 2; spin.add(barrel);
  const back = new THREE.Mesh(new THREE.CircleGeometry(rimR * .99, 36), M_MATTEB); back.position.z = tw / 2 - .13; spin.add(back);
  const disc = cyl(rimR * .74, rimR * .74, .022, std('#8a8d94', { metalness: .8, roughness: .35 }), 30); disc.rotation.x = Math.PI / 2; disc.position.z = tw / 2 - .1; spin.add(disc);
  const cal = box(rimR * .32, rimR * .55, .07, calM, .02); cal.position.set(-rimR * .56, rimR * .1, tw / 2 - .085); g.add(cal);
  const deep = p.wd === 'dish', fz = tw / 2 - (deep ? .085 : .035);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(rimR - .012, .016, 8, 44), rimM); lip.position.z = tw / 2 - .014; spin.add(lip);
  if (deep) { const ring = new THREE.Mesh(new THREE.RingGeometry(rimR * .72, rimR - .01, 44), rimM); ring.position.z = tw / 2 - .02; spin.add(ring); const cone = new THREE.Mesh(new THREE.CylinderGeometry(rimR * .73, rimR * .73, .07, 36, 1, true), rimM); cone.rotation.x = Math.PI / 2; cone.position.z = tw / 2 - .055; rimM.side = THREE.DoubleSide; spin.add(cone); }
  const hub = cyl(rimR * .2, rimR * .24, .05, rimM, 20); hub.rotation.x = Math.PI / 2; hub.position.z = fz + .012; spin.add(hub);
  const cap = cyl(rimR * .09, rimR * .09, .02, M_BLACK, 16); cap.rotation.x = Math.PI / 2; cap.position.z = fz + .04; spin.add(cap);
  const spoke = (a, wid, th, r0 = .2, r1 = .97, tw2 = 0, rot = 0) => { const len = rimR * (r1 - r0); const s = box(len, wid, th, rimM); const rr = rimR * (r0 + r1) / 2; s.position.set(Math.cos(a) * rr, Math.sin(a) * rr, fz); s.rotation.z = a + rot; s.rotation.x = tw2; spin.add(s); };
  const d = p.wd;
  if (d === 'stock') { const face = new THREE.Mesh(new THREE.CircleGeometry(rimR * .96, 36), std('#3a3d44', { metalness: .6, roughness: .5 })); face.position.z = fz - .012; spin.add(face); for (let i = 0; i < 5; i++) spoke(i / 5 * Math.PI * 2, rimR * .36, .035); }
  if (d === 'sport') for (let i = 0; i < 10; i++) spoke(i / 10 * Math.PI * 2, rimR * .1, .04);
  if (d === 'dish') for (let i = 0; i < 5; i++) spoke(i / 5 * Math.PI * 2, rimR * .14, .035, .2, .74);
  if (d === 'turbine') for (let i = 0; i < 14; i++) spoke(i / 14 * Math.PI * 2, rimR * .15, .014, .22, .95, .75);
  if (d === 'mesh') { for (let i = 0; i < 10; i++) { spoke(i / 10 * Math.PI * 2, rimR * .05, .03, .2, .97, 0, .38); spoke(i / 10 * Math.PI * 2, rimR * .05, .03, .2, .97, 0, -.38); } }
  if (d === 'forged') for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; spoke(a - .1, rimR * .075, .045); spoke(a + .1, rimR * .075, .045); }
  return { g, spin, R0, tw };
}

let carRoot = null, carRef = null;
const glowL = new THREE.PointLight('#00f0ff', 0, 5, 1.6);
function disposeTree(o) { o.traverse(m => { if (m.isMesh) { if (m.geometry && !m.geometry._keep) m.geometry.dispose(); const ms = Array.isArray(m.material) ? m.material : [m.material]; ms.forEach(x => { if (x && x._own) { x.map && x.map._own && x.map.dispose(); x.dispose(); } }); } }); }
function buildCar(car, p) {
  const M = MODELS[car.m], G = geomOf(M); G.body._keep = G.cab._keep = G.roof._keep = true;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.position.y = -p.low * .025;
  const dirt = clamp((1 - car.cond) * 1.4, 0, .8);
  const own = m => { m._own = true; return m; };
  const paint = own(paintMat(p.fin, COLORS[p.col].h, dirt));
  const amM = p.am === 'carbon' ? M_CARBON : p.am === 'black' ? M_BLACK : paint;
  const bm = new THREE.Mesh(G.body, paint); body.add(bm);
  const tint = optOf('tint', p.tint); const glass = own(new THREE.MeshPhysicalMaterial({ color: C(tint.ic), metalness: p.tint === 'mirror' ? 1 : .35, roughness: .04, clearcoat: 1 }));
  body.add(new THREE.Mesh(G.cab, glass));
  const roofM = p.roof === 'black' ? M_BLACK : p.roof === 'white' ? own(paintMat('solid', '#f4f4f4')) : p.roof === 'carbon' ? M_CARBON : paint;
  body.add(new THREE.Mesh(G.roof, roofM));
  body.add(pillarMesh(M, G, roofM));
  const F = G.F + BS, R = G.R - BS, hw = M.W / 2, yb = M.bot - BS;
  // lights, grille, mirrors
  const hlc = C(optOf('hl', p.hl).ic); const hlM = own(new THREE.MeshStandardMaterial({ color: hlc.clone().multiplyScalar(.6), emissive: hlc, emissiveIntensity: 1.5, roughness: .2 }));
  for (const s of [-1, 1]) { const h = box(.12, .085, .34, hlM, .03); h.position.set(F - .05, M.noseY - .03, s * (hw - .3)); h.rotation.z = -.25; body.add(h);
    const t = box(.07, .07, M.W * .3, M_TAIL, .025); t.position.set(R + .03, M.tailY - .08, s * hw * .55); body.add(t);
    const mr = box(.12, .08, .14, paint, .03); mr.position.set(M.ws - .14, M.hoodY + .08, s * (G.CW / 2 + .1)); body.add(mr); }
  const gr = box(.06, M.grille ? .2 : .12, M.W * (M.grille ? .6 : .45), M.ev ? M_BLACK : M_MATTEB, .02); gr.position.set(F - .02, (M.bot + M.noseY) / 2 - .02, 0); body.add(gr);
  // stripes
  const scM = own(paintMat(p.fin === 'matte' ? 'matte' : 'solid', COLORS[p.sc].h, dirt * .7));
  if (p.stripe === 'twin' || p.stripe === 'wide') {
    const hood = G.topPts.filter(q => q.x > M.ws + .02 && q.y > M.noseY - .14), deck = G.topPts.filter(q => q.x < M.rb - .02 && q.y > M.tailY - .16);
    const lanes = p.stripe === 'twin' ? [[-.17, .17], [.17, .17]] : [[0, .42]];
    for (const [z, w] of lanes) { if (hood.length > 1) body.add(new THREE.Mesh(G.deform(ribbon(hood, z, w, BS + .006)), scM)); if (deck.length > 1) body.add(new THREE.Mesh(G.deform(ribbon(deck, z, w, BS + .006)), scM)); if (G.roofPts.length > 1) body.add(new THREE.Mesh(G.deform(ribbon(G.roofPts, z, w, .072)), scM)); }
  }
  if (p.stripe === 'side') { const ar = M.wr * 1.18 + .05; let seg = []; const segs = [];
    for (const q of G.topPts) { if (q.x > G.F - .2 || q.x < G.R + .2) continue; const y = Math.min(q.y, M.belt) - .14; const nearA = [M.fa, M.ra].some(ax => Math.abs(q.x - ax) < ar && y - .03 < M.wr + ar); if (nearA || y < M.bot + .1) { if (seg.length > 1) segs.push(seg); seg = []; continue; } seg.push(V2(q.x, y)); }
    if (seg.length > 1) segs.push(seg); for (const sg of segs) for (const s of [-1, 1]) body.add(new THREE.Mesh(G.deform(vribbon(sg, s * (hw + .004), .055)), scM)); }
  scM.side = THREE.DoubleSide;
  // decals
  if (p.decal !== 'none') { const ar = M.wr * 1.18; const x0 = M.ra + ar + .06, x1 = M.fa - ar - .06; const wdt = Math.min(1.75, x1 - x0); const cx = (x0 + x1) / 2; const yTop = Math.min(G.topAt(cx), M.belt) - .1; const hgt = Math.min(wdt / 3, yTop - M.bot - .02); const cy = M.bot + .02 + hgt / 2 + Math.max(0, (yTop - M.bot - .02 - hgt) * .35);
    const dc = COLORS[p.sc].h; for (const s of [1, -1]) { const tex = decalCanvas(p.decal, s < 0, dc, (car.seed % 89) + 7); tex._own = true; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; const m = own(new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); if (dirt) m.color.lerp(C('#9a8a70'), dirt * .5);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(hgt * 3, hgt), m); pl.position.set(cx, cy, s * (hw + .005)); if (s < 0) pl.rotation.y = Math.PI; body.add(pl); } }
  // rust spots
  if (car.cond < .97) { const r = rng(car.seed * 31 + 5); const n = Math.round((1 - car.cond) * 18); for (let i = 0; i < n; i++) { const s = r() < .5 ? 1 : -1; const xx = lerp(G.R + .3, G.F - .3, r()); const yy = lerp(M.bot + .06, Math.min(G.topAt(xx), M.belt) - .12, r()); const nearA = [M.fa, M.ra].some(ax => Math.hypot(xx - ax, yy - M.wr) < M.wr * 1.3 + .08); if (nearA) continue;
    const c = new THREE.Mesh(new THREE.CircleGeometry(.03 + r() * .06, 10), M_RUST); c.scale.y = .6 + r() * .6; c.position.set(xx, yy, s * (hw + .006)); if (s < 0) c.rotation.y = Math.PI; body.add(c); } }
  // aero
  const hatch = !!M.hatch; const sx = hatch ? M.rr - .02 : G.R + .24; const sy = hatch ? M.roofY + BS + .02 : G.topAt(G.R + .24) + BS;
  if (p.spo === 'lip') { const l = box(.18, .05, M.W * .84, amM, .02); l.position.set(sx - .02, sy + .02, 0); l.rotation.z = -.22; body.add(l); }
  if (p.spo === 'duck') { const sh = new THREE.Shape(); sh.moveTo(.12, 0); sh.lineTo(-.26, 0); sh.quadraticCurveTo(-.32, .14, -.34, .16); sh.quadraticCurveTo(-.1, .06, .12, 0); const dep = M.W * .82; const g = new THREE.ExtrudeGeometry(sh, { depth: dep, bevelEnabled: true, bevelThickness: .03, bevelSize: .02, bevelSegments: 2 }); g.translate(0, 0, -dep / 2); const d = new THREE.Mesh(g, amM); d.position.set(sx + .06, sy - .01, 0); body.add(d); }
  if (p.spo === 'gt' || p.spo === 'swan') { const hgt = p.spo === 'gt' ? .36 : .42; const w = box(.36, .04, M.W * .98, amM, .018); w.position.set(sx - .02, sy + hgt, 0); w.rotation.z = -.14; body.add(w);
    for (const s of [-1, 1]) { const e = box(.44, .17, .02, amM, .008); e.position.set(sx - .03, sy + hgt + .02, s * M.W * .49); body.add(e);
      if (p.spo === 'gt') { const u = box(.08, hgt, .03, M_BLACK); u.position.set(sx + .02, sy + hgt / 2, s * M.W * .26); u.rotation.z = .12; body.add(u); }
      else { const u = box(.05, hgt + .1, .03, M_BLACK); u.position.set(sx + .05, sy + hgt / 2 + .04, s * M.W * .24); u.rotation.z = -.2; body.add(u); const t = box(.14, .03, .03, M_BLACK); t.position.set(sx - .02, sy + hgt + .045, s * M.W * .24); body.add(t); } } }
  if (p.skirt) { const ar = M.wr * 1.18; const len = (M.fa - M.ra) - 2 * ar - .06; for (const s of [-1, 1]) { const k = box(len, .1, .07, amM, .025); k.position.set((M.fa + M.ra) / 2, yb + .05, s * (hw + .01)); body.add(k); } }
  if (p.split) { const k = box(.32, .03, M.W * .96, p.am === 'body' ? M_CARBON : amM, .01); k.position.set(F - .06, yb + .015, 0); body.add(k); }
  if (p.diff) { const pl = box(.34, .025, M.W * .7, p.am === 'body' ? M_CARBON : amM); pl.position.set(R + .1, yb + .02, 0); body.add(pl); for (let i = -2; i <= 2; i++) { const f = box(.32, .1, .02, p.am === 'body' ? M_CARBON : amM); f.position.set(R + .1, yb + .06, i * M.W * .13); body.add(f); } }
  if (p.scoop !== 'none') { const hx = lerp(M.ws, G.F, .42), hy = G.topAt(hx) + BS, sl = Math.atan2(G.topAt(hx - .1) - G.topAt(hx + .1), -.2); const hg = new THREE.Group(); hg.position.set(hx, hy, 0); hg.rotation.z = -sl; body.add(hg);
    if (p.scoop === 'scoop') { const b = box(.6, .1, .44, paint, .04); b.position.y = .03; hg.add(b); const i = box(.05, .06, .34, M_MATTEB); i.position.set(.29, .04, 0); hg.add(i); }
    if (p.scoop === 'vents') for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const v = box(.28, .02, .05, M_MATTEB); v.position.set(-.05, .01, s * (.22 + k * .08)); hg.add(v); }
    if (p.scoop === 'shaker') { const b = cyl(.16, .18, .16, M_DARKM, 24); b.position.y = .08; hg.add(b); const t = box(.36, .1, .36, paint, .04); t.position.y = .2; hg.add(t); const i = box(.04, .07, .28, M_MATTEB); i.position.set(.18, .2, 0); hg.add(i); } }
  // exhaust
  const ez = { single: [M.W * .3], dual: [-M.W * .32, M.W * .32], quad: [-M.W * .38, -M.W * .28, M.W * .28, M.W * .38], center: [-.07, .07] }[p.exh]; const er = p.exh === 'center' ? .06 : .045;
  for (const z of ez) { const e = cyl(er, er, .22, M_CHROME, 18); e.rotation.z = Math.PI / 2; e.position.set(R + .04, yb + .08, z); body.add(e); const ei = new THREE.Mesh(new THREE.CircleGeometry(er * .75, 16), M_MATTEB); ei.position.set(R - .072, yb + .08, z); ei.rotation.y = -Math.PI / 2; body.add(ei); }
  // underbody (hides arch tunnels)
  const ub = box(M.L * .86, .12, M.W * .7, M_MATTEB); ub.position.set(0, yb + .12, 0); body.add(ub);
  for (const ax of [M.fa, M.ra]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(M.wr * 1.17, M.wr * 1.17, M.W * .62, 24), M_MATTEB); t.rotation.x = Math.PI / 2; t.position.set(ax, M.wr, 0); body.add(t); }
  // wheels
  const rimM = own(new THREE.MeshPhysicalMaterial({ color: C(WCOL[p.wc].h), metalness: .9, roughness: p.wc === 1 ? .35 : .18, clearcoat: .6 }));
  const calM = own(std(optOf('cal', p.cal).ic, { roughness: .35, metalness: .2 }));
  const spins = [];
  for (const ax of [M.fa, M.ra]) for (const s of [-1, 1]) { const w = buildWheel(M, p, rimM, calM); w.g.position.set(ax, w.R0, s * (hw - w.tw / 2 + .03)); if (s < 0) w.g.rotation.y = Math.PI; root.add(w.g); spins.push({ g: w.spin, s, R: w.R0 }); }
  // neon
  if (p.glow !== 'none') { const gc = C(optOf('glow', p.glow).ic); const pl = new THREE.Mesh(new THREE.PlaneGeometry(M.L * 1.1, M.W * 1.6), own(new THREE.MeshBasicMaterial({ color: gc, map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .5 }))); pl.rotation.x = -Math.PI / 2; pl.position.y = .015; root.add(pl);
    const bar = box(M.L * .7, .02, M.W * .62, own(new THREE.MeshBasicMaterial({ color: gc.clone().multiplyScalar(1.3) }))); bar.position.y = yb + .05; body.add(bar); glowL.color.copy(gc); glowL.intensity = 2.2; } else glowL.intensity = 0;
  shadowAll(root, true, false); root.traverse(m => { if (m.isMesh && m.material.transparent) m.castShadow = false; });
  root.add(glowL); glowL.position.set(0, .12, 0);
  return { root, spins, body, M };
}
function showCar(car, p) { if (carRoot) { scene.remove(carRoot.root); disposeTree(carRoot.root); } carRoot = buildCar(car, p); carRef = car; scene.add(carRoot.root); if (setName === 'auction') carRoot.root.position.y = .14; }

/* ================= WORLD ================= */
const hemi = new THREE.HemisphereLight('#ffffff', '#3a3448', .55); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff3e2', 2.3); sun.position.set(4, 8, 5); sun.castShadow = renderer.shadowMap.enabled; sun.shadow.mapSize.set(E.q === 'ultra' ? 2048 : 1024, E.q === 'ultra' ? 2048 : 1024); Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 }); sun.shadow.bias = -.0005; sun.shadow.radius = 4; scene.add(sun);
const fill = new THREE.DirectionalLight('#b8d0ff', .7); fill.position.set(-5, 3, -4); scene.add(fill);
const spots = []; for (const s of [-1, 1]) { const l = new THREE.SpotLight('#ffe2b0', 0, 18, .38, .55, 1.2); l.position.set(s * 3.5, 7, 3); scene.add(l); scene.add(l.target); spots.push(l); }
const sets = { garage: new THREE.Group(), lot: new THREE.Group(), auction: new THREE.Group() }; Object.values(sets).forEach(g => scene.add(g));
function canvasTex(w, h, draw, rx = 1, ry = 1) { const c = cnv(w, h); draw(c.getContext('2d'), w, h); return ctex(c, rx, ry); }
// garage
{ const g = sets.garage;
  const ft = canvasTex(512, 512, (x, w) => { x.fillStyle = '#353a48'; x.fillRect(0, 0, w, w); const r = rng(2); for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '0,0,0'},${r() * .12})`; x.fillRect(r() * w, r() * w, 2, 2); } x.strokeStyle = 'rgba(20,22,30,.55)'; x.lineWidth = 4; x.strokeRect(0, 0, w, w); }, 10, 10);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshPhysicalMaterial({ map: ft, color: C('#8a8f9c'), roughness: .4, metalness: .1, clearcoat: .6, clearcoatRoughness: .25, envMapIntensity: .3 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.MeshPhysicalMaterial({ color: C('#22252f'), roughness: .25, clearcoat: 1, envMapIntensity: .35 })); pad.rotation.x = -Math.PI / 2; pad.position.y = .005; pad.receiveShadow = true; g.add(pad);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, .03, 8, 96), new THREE.MeshBasicMaterial({ color: C('#ff9a3a').multiplyScalar(2.2) })); ring.rotation.x = Math.PI / 2; ring.position.y = .01; g.add(ring);
  const wallM = std('#2a2e3c', { roughness: .85 }); const back = new THREE.Mesh(new THREE.PlaneGeometry(26, 9), wallM); back.position.set(0, 4.5, -7); back.receiveShadow = true; g.add(back);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(20, 9), wallM); w.position.set(s * 10, 4.5, 2); w.rotation.y = -s * Math.PI / 2; g.add(w); }
  const peg = canvasTex(1024, 384, (x, w, h) => { x.fillStyle = '#c9a26a'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(60,40,20,.5)'; for (let i = 12; i < w; i += 24) for (let j = 12; j < h; j += 24) { x.beginPath(); x.arc(i, j, 3.2, 0, 7); x.fill(); }
    x.fillStyle = '#2a2d36'; const tool = (cx, cy, l, a) => { x.save(); x.translate(cx, cy); x.rotate(a); x.fillRect(-8, -l / 2, 16, l); x.beginPath(); x.arc(0, -l / 2, 18, 0, 7); x.fill(); x.restore(); }; for (let i = 0; i < 9; i++) tool(90 + i * 95, 190 + (i % 2) * 20, 140 + (i % 3) * 30, (i % 2 ? .15 : -.15));
    x.fillStyle = '#d33'; x.fillRect(40, 300, 200, 60); x.fillRect(780, 300, 200, 60); });
  const pb = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), std('#ffffff', { map: peg, roughness: .9 })); pb.position.set(-3.5, 2.6, -6.95); g.add(pb);
  const sign = canvasTex(1024, 256, (x, w, h) => { x.clearRect(0, 0, w, h); x.font = '900 150px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#ff7a1a'; x.shadowBlur = 30; x.fillStyle = '#ffd2a0'; x.fillText('FLIP GARAGE', w / 2, h / 2); });
  const sm = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: sign, transparent: true, color: C('#ffffff').multiplyScalar(1.6) })); sm.position.set(3.6, 5.2, -6.9); g.add(sm);
  const ledM = new THREE.MeshBasicMaterial({ color: C('#ffffff').multiplyScalar(2.4) }); for (let i = -2; i <= 2; i++) { const l = box(.18, .06, 9, ledM); l.position.set(i * 2.2, 8.4, -1); g.add(l); }
  const tireM = M_TIRE; for (let k = 0; k < 2; k++) for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.42, .17, 10, 24), tireM); t.rotation.x = Math.PI / 2; t.position.set(6.2 + k * 1.1, .17 + i * .3, -5.8 + k * .3); t.castShadow = true; g.add(t); }
  const tb = box(1.6, 1.3, .7, std('#d42a2a', { roughness: .4, metalness: .3 }), .04); tb.position.set(-7, .65, -5.8); tb.castShadow = true; g.add(tb); for (let i = 0; i < 4; i++) { const d = box(1.5, .02, .02, M_CHROME); d.position.set(-7, .3 + i * .3, -5.44); g.add(d); }
  { const door = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 3.4), new THREE.MeshBasicMaterial({ color: '#06070a' })); door.position.set(-9.97, 1.7, 0); door.rotation.y = Math.PI / 2; g.add(door); const fr = box(.1, .14, 6.7, std('#ff8a1f', { roughness: .4 })); fr.position.set(-9.95, 3.45, 0); g.add(fr); }
  
}
// lot
{ const g = sets.lot;
  const at = canvasTex(512, 512, (x, w) => { x.fillStyle = '#3d4048'; x.fillRect(0, 0, w, w); const r = rng(4); for (let i = 0; i < 6000; i++) { const v = r(); x.fillStyle = `rgba(${v < .5 ? '255,255,255' : '0,0,0'},${r() * .16})`; x.fillRect(r() * w, r() * w, 2, 2); } }, 12, 12);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 48), std('#ffffff', { map: at, roughness: .9 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const lm = new THREE.MeshBasicMaterial({ color: '#d8d8d0' }); for (let i = -2; i <= 2; i++) for (const z of [-1.5, 1.5]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(5.6, .1), lm); l.rotation.x = -Math.PI / 2; l.position.set(i * 6, .01, z); g.add(l); } for (let i = -2; i <= 3; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(.1, 3), lm); l.rotation.x = -Math.PI / 2; l.position.set(i * 6 - 3, .01, 0); g.add(l); }
  const cols = ['#ff3b3b', '#ffd23a', '#3bb0ff', '#3bff7a', '#ff7ad8']; for (let row = 0; row < 2; row++) { const z = -4.5 - row * 1.5; const cable = box(24, .02, .02, M_MATTEB); cable.position.set(0, 4.4 - row * .3, z); g.add(cable); for (let i = 0; i < 40; i++) { const tri = new THREE.Mesh(new THREE.ConeGeometry(.16, .4, 3), std(cols[i % 5], { roughness: .6 })); tri.rotation.x = Math.PI; tri.position.set(-12 + i * .6, 4.2 - row * .3, z); g.add(tri); } }
  for (const x of [-7, 7]) { const p = cyl(.08, .1, 5.4, M_DARKM, 10); p.position.set(x, 2.7, -4.5); g.add(p); const h = box(.9, .18, .4, new THREE.MeshBasicMaterial({ color: C('#fff2c8').multiplyScalar(2) })); h.position.set(x, 5.4, -4.4); g.add(h); }
  const sign = canvasTex(1024, 320, (x, w, h) => { x.fillStyle = '#ffd23a'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8442a'; x.fillRect(0, 0, w, 40); x.fillRect(0, h - 40, w, 40); x.fillStyle = '#1c1c22'; x.font = '900 120px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('AUTO LOT', w / 2, h / 2 - 20); x.font = '800 54px Arial'; x.fillText('★ USED CARS ★', w / 2, h / 2 + 80); });
  const sb = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.56), std('#ffffff', { map: sign, roughness: .6 })); sb.position.set(0, 3.2, -6.5); g.add(sb); for (const s of [-1, 1]) { const p = cyl(.07, .07, 3.4, M_DARKM, 8); p.position.set(s * 2.2, 1.6, -6.55); g.add(p); }
  const bld = new THREE.Mesh(new THREE.BoxGeometry(30, 6, 1), std('#8a6a5a', { roughness: .9 })); bld.position.set(0, 3, -12); g.add(bld);
  for (let i = 0; i < 14; i++) { const t = new THREE.Group(); const tr = cyl(.12, .16, 1.4, std('#6a4a32'), 8); tr.position.y = .7; t.add(tr); const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(.9, 1), std(i % 2 ? '#3f8f4a' : '#4fa85a', { roughness: .8, flatShading: true })); cr.position.y = 1.9; t.add(cr); t.position.set(-13 + i * 2, 0, -10.5 + (i % 3) * .3); g.add(t); }
}
// auction
const bidders = []; let curtain;
{ const g = sets.auction;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshPhysicalMaterial({ color: C('#120f18'), roughness: .35, clearcoat: .8, clearcoatRoughness: .2, envMapIntensity: .15 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const tt = cyl(3.3, 3.4, .14, new THREE.MeshPhysicalMaterial({ color: C('#2a2430'), roughness: .25, metalness: .4, clearcoat: 1 }), 72); tt.position.y = .07; tt.receiveShadow = true; g.add(tt); g.userData.tt = tt;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.38, .035, 8, 96), new THREE.MeshBasicMaterial({ color: C('#ffcc55').multiplyScalar(2.6) })); ring.rotation.x = Math.PI / 2; ring.position.y = .12; g.add(ring);
  const cg = new THREE.PlaneGeometry(26, 13, 160, 1); const pp = cg.attributes.position; for (let i = 0; i < pp.count; i++) pp.setZ(i, Math.sin(pp.getX(i) * 3.2) * .22); cg.computeVertexNormals();
  curtain = new THREE.Mesh(cg, new THREE.MeshPhysicalMaterial({ color: C('#8a0e1e'), roughness: .7, sheen: 1, sheenColor: C('#ff6a7a'), sheenRoughness: .4 })); curtain.position.set(0, 6.5, -6); g.add(curtain);
  const ban = canvasTex(1024, 200, (x, w, h) => { x.font = '900 110px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#ffc040'; x.shadowBlur = 26; x.fillStyle = '#ffe9b0'; x.fillText('★ AUCTION ★', w / 2, h / 2); });
  const bm = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.2), new THREE.MeshBasicMaterial({ map: ban, transparent: true, color: C('#ffffff').multiplyScalar(1.7) })); bm.position.set(0, 5.4, -5.6); g.add(bm);
  const beamM = new THREE.MeshBasicMaterial({ color: C('#ffe2b0'), transparent: true, opacity: .035, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  g.userData.beams = []; for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.ConeGeometry(1.6, 7.4, 32, 1, true), beamM); b.geometry.translate(0, -3.7, 0); b.position.set(s * 3.5, 7, 3); g.add(b); g.userData.beams.push(b); }
  const SK = ['#f2c3a0', '#c98e6a', '#8a5a3c', '#f6d7c0', '#e0ac82'], SH = ['#3a6fe0', '#e04a4a', '#2fb36a', '#8a3cff', '#ff9a2a', '#1c2240'];
  for (let i = 0; i < 6; i++) { const P = cutie({ skin: SK[i % 5], shirt: SH[i], hair: ['#2a1a10', '#d8a040', '#111', '#7a3a1a', '#aaa', '#3a2418'][i], hat: i === 1 ? '#222' : null, cap: i === 4 ? '#e04a4a' : null, glasses: i === 3 ? '#222' : null, long: i % 3 === 2, beard: i === 5 ? '#5a3a24' : null, shoe: '#222' });
    const pd = new THREE.Group(); const hd = cyl(.02, .02, .34, std('#8a6a4a'), 6); hd.position.y = -.12; pd.add(hd); const cardC = canvasTex(128, 128, (x) => { x.fillStyle = '#fff'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.fillStyle = '#e8442a'; x.font = '900 70px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(11 + i * 7), 64, 68); });
    const card = new THREE.Mesh(new THREE.CircleGeometry(.17, 24), new THREE.MeshStandardMaterial({ map: cardC, side: THREE.DoubleSide, roughness: .6 })); card.position.y = -.38; pd.add(card); pd.position.y = -.4; pd.rotation.x = Math.PI; P.arms[1].add(pd);
    P.g.scale.setScalar(.85); g.add(P.g); P.raise = 0; bidders.push(P); }
}
for (const k of ['garage', 'lot']) sets[k].children.forEach(c => { if (!(c.geometry && c.geometry.type === 'CircleGeometry') && !(c.geometry && c.geometry.type === 'TorusGeometry' && c.position.y < .1) && !(c.geometry && c.geometry.type === 'PlaneGeometry' && c.rotation.x < -1)) { const bb = new THREE.Box3().setFromObject(c); const ctr = bb.getCenter(V3()); c.userData.occ = V3(ctr.x, 0, ctr.z); } });
function occlude() { const cx = camera.position.x, cz = camera.position.z, l = Math.hypot(cx, cz) || 1; for (const c of sets[setName].children) { const o = c.userData.occ; if (!o) continue; c.visible = (o.x * cx + o.z * cz) / l < 3; } }
let setName = 'garage';
function setSet(n) { setName = n; for (const k in sets) sets[k].visible = k === n;
  const cfg = { garage: ['#1d2029', .55, 2.3, 0, null], lot: ['#9fd3f2', .9, 2.6, 0, ['#9fd3f2', 26, 70]], auction: ['#0c0a12', .18, .5, 75, null] }[n];
  scene.background = C(cfg[0]); hemi.intensity = cfg[1]; sun.intensity = cfg[2]; spots.forEach(s => s.intensity = cfg[3]); scene.fog = cfg[4] ? new THREE.Fog(cfg[4][0], cfg[4][1], cfg[4][2]) : null;
  if (carRoot) carRoot.root.position.y = n === 'auction' ? .14 : 0; }

/* ================= CAMERA ================= */
const cam = { yaw: .75, pitch: .2, zoom: 1, tY: .55, idle: 0, ph: 0, auto: true };
let dragging = null; const ptrs = new Map();
const stage = $('stage');
stage.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragging = { x: e.clientX, y: e.clientY }; cam.idle = 0; A.ac(); });
addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) return; const pv = ptrs.get(e.pointerId); const dx = e.clientX - pv.x, dy = e.clientY - pv.y; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (cam.pd) cam.zoom = clamp(cam.zoom * cam.pd / d, .6, 1.5); cam.pd = d; return; }
  if (state === 'auction') return; cam.yaw -= dx * .008; cam.pitch = clamp(cam.pitch + dy * .005, .03, .95); cam.idle = 0; });
const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) cam.pd = 0; }; addEventListener('pointerup', up); addEventListener('pointercancel', up);
stage.addEventListener('wheel', e => { cam.zoom = clamp(cam.zoom * (1 + Math.sign(e.deltaY) * .08), .6, 1.5); e.preventDefault(); }, { passive: false });
let viewPH = 0, viewTop = 0; const LANDQ = matchMedia('(orientation:landscape) and (max-height:620px)');
function layoutView() { const w = innerWidth, h = innerHeight; let ph = 0, top = 0, pw = 0; const land = LANDQ.matches; camera.fov = w < h ? 44 : 36;
  if (state === 'garage') { if (land) { pw = $('panel').offsetWidth; top = 40; } else { ph = $('panel').offsetHeight; top = $('estWrap').offsetHeight + 60; } } else if (state === 'lot') { if (land) { pw = $('lotDock').offsetWidth; top = 40; } else { ph = $('lotDock').offsetHeight + 8; top = 60; } } else if (state === 'auction') { ph = 70; top = 150; } else if (state === 'title') { top = h * .5; }
  viewPH = ph; viewTop = top; $('sellBtn').style.bottom = $('side').style.bottom = (state === 'garage' && !land ? ph + 10 : 0) + 'px'; const off = ph - top; const fh = h + Math.abs(off), fw = w + pw; camera.setViewOffset(fw, fh, 0, Math.max(0, off), w, h); camera.aspect = fw / fh; camera.updateProjectionMatrix(); cam.visH = h - ph - top; cam.fullH = fh; cam.fracW = (w - pw) / fw; }
E.onResize.push(layoutView);
function camDist() { const M = carRef ? MODELS[carRef.m] : MODELS[0]; const vf = THREE.MathUtils.degToRad(camera.fov) / 2; const frac = clamp(cam.visH / cam.fullH, .3, 1); const tv = Math.tan(vf) * frac, th = Math.tan(vf) * camera.aspect * (cam.fracW || 1);
  const wNeed = (M.L * .52 + .5) * (state === 'auction' ? 1.15 : 1), hNeed = 1.25; return Math.max(wNeed / th, hNeed / tv) + M.W * .4; }
function updCam(dt) { cam.idle += dt;
  if (state === 'auction') { cam.ph += dt; const d = camDist() * 1.05; const y = 3.1 + Math.sin(cam.ph * .3) * .2; camera.position.set(Math.sin(cam.ph * .12) * 1.2, y, d); camera.lookAt(0, .85, 0); return; }
  if (cam.idle > 3.5 && state !== 'title') cam.yaw += dt * .18; if (state === 'title') cam.yaw += dt * .25;
  const d = camDist() * cam.zoom; const p = cam.pitch; camera.position.set(Math.sin(cam.yaw) * Math.cos(p) * d, cam.tY + Math.sin(p) * d, Math.cos(cam.yaw) * Math.cos(p) * d); camera.lookAt(0, cam.tY, 0); }

/* ================= STATE / UI ================= */
let state = 'title', pv = null, tab = 0, sub = 0, drive = null, auc = null;
const pops = $('pops');
function pop(txt, cls, x = innerWidth / 2, y = innerHeight * .35) { const d = document.createElement('div'); d.className = 'pop ' + (cls || ''); d.textContent = txt; d.style.left = x + 'px'; d.style.top = y + 'px'; pops.appendChild(d); setTimeout(() => d.remove(), 1300); }
function updHud() { $('moneyTxt').textContent = fmt(S.money); const L = level(); $('lvlTxt').textContent = T('רמה ', 'Level ') + L; const a = REP[L - 1] || 0, b = REP[L] || a + 1; $('xpI').style.width = (L >= REP.length ? 100 : clamp((S.rep - a) / (b - a) * 100, 0, 100)) + '%'; }
function trendHTML() { const tr = trend(); return tr.hot.map(t => `<span class="hot">🔥 ${TAGN[t]}</span>`).join('') + `<span class="cold">❄️ ${TAGN[tr.cold]}</span>`; }

/* ---------- lot ---------- */
function genLot() { const L = level(); const av = MODELS.map((M, i) => i).filter(i => MODELS[i].lvl <= L); const lot = [];
  const top = av.slice(-3); for (let k = 0; k < 3; k++) { let m = k === 0 ? av[Math.max(0, av.length - 3 + Math.floor(Math.random() * 2) - 1)] ?? av[0] : top[Math.floor(Math.random() * top.length)]; if (k === 2 && Math.random() < .5) m = av[Math.floor(Math.random() * av.length)];
    const cond = Math.round(rnd(.4, 1) * 100) / 100, M = MODELS[m]; const price = r50(M.price * (.55 + .45 * cond) * rnd(.8, .92)); lot.push({ m, cond, price, col: Math.floor(Math.random() * COLORS.length), fin: Math.random() < .5 ? 'solid' : 'metal', seed: Math.floor(Math.random() * 1e6) }); }
  lot.sort((a, b) => a.price - b.price); S.lot = lot; S.li = 0;
  if (Math.random() < .6) genReq(); else S.req = null; S.save(); }
function genReq() { const L = level(); const av = MODELS.map((M, i) => i).filter(i => MODELS[i].lvl <= L); const pool = [];
  for (const f of OPT.fin) if (f.v !== 'solid' && f.lvl <= L) pool.push({ k: 'fin', v: f.v, n: T('צבע ', 'Paint: ') + f.n });
  for (const t of ['red', 'blue', 'black', 'white', 'yellow', 'green', 'pink', 'orange', 'purple']) pool.push({ k: 'colT', v: t, n: T('בצבע ', 'Color: ') + TAGN[t] });
  for (const k of ['spo', 'wd', 'decal', 'stripe']) for (const x of OPT[k]) if (!isDef(k, x.v) && x.lvl <= L) pool.push({ k, v: x.v, n: x.n });
  pool.push({ k: 'low', v: '*', n: T('מונמכת', 'Lowered') }, { k: 'eng', v: '*', n: T('מנוע משודרג', 'Tuned engine') }, { k: 'tint', v: 'dark', n: T('חלונות כהים', 'Dark windows') }); if (L >= 2) pool.push({ k: 'glow', v: '*', n: T('ניאון', 'Neon') });
  const items = []; const used = new Set(); while (items.length < 2) { const it = pool[Math.floor(Math.random() * pool.length)]; if (used.has(it.k)) continue; used.add(it.k); items.push(it); }
  const NM = EN ? ['Avi', 'Noa', 'Max', 'Lia', 'Omer', 'Zoe', 'Ben', 'Maya'] : ['אבי', 'נועה', 'מקס', 'ליה', 'עומר', 'זואי', 'בן', 'מאיה'];
  S.req = { who: NM[Math.floor(Math.random() * NM.length)], m: Math.random() < .5 ? av[Math.floor(Math.random() * av.length)] : -1, items }; }
function lotCar(i) { const l = S.lot[i]; return { m: l.m, cond: l.cond, seed: l.seed, p: Object.assign({}, DEF, { fin: l.fin, col: l.col }) }; }
function showLot() { state = 'lot'; hideAll(); $('hud').hidden = $('lotDock').hidden = false; if (!S.lot) genLot(); setSet('lot'); renderLot(true); layoutView(); A.startMusic({ chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], bpm: 96, lead: true, kick: true, vol: .7 });
  if (!S.tut) { setTimeout(() => toast(T('קנו מכונית משומשת, שפצו אותה במוסך ומכרו במכירה פומבית ברווח!', 'Buy a used car, tune it in the garage and flip it at auction for profit!'), 5000), 400); } }
function renderLot(rebuild) { const l = S.lot[S.li], M = MODELS[l.m]; if (rebuild) { showCar(lotCar(S.li), lotCar(S.li).p); carRoot.root.position.y = 0; }
  $('lotName').innerHTML = `${M.br} ${M.n}`; $('lotCls').textContent = M.cls; $('lCond').textContent = T('מצב', 'Condition'); $('condTxt').textContent = Math.round(l.cond * 100) + '%';
  $('condI').style.width = l.cond * 100 + '%'; $('condI').style.background = l.cond > .8 ? '#5aff8a' : l.cond > .6 ? '#ffd23a' : '#ff6a4a';
  $('lotHint').textContent = T('שווי מקורי ', 'New value ') + fmt(M.price); $('lotIdx').textContent = (S.li + 1) + '/' + S.lot.length;
  const can = S.money >= l.price && !S.car; $('buyBtn').textContent = (S.car ? T('יש לך מכונית במוסך', 'Garage is full') : T('קנו ב־', 'Buy ') + fmt(l.price)); $('buyBtn').classList.toggle('no', !can);
  $('refreshBtn').textContent = '🔄 ' + T('מכוניות חדשות במגרש', 'New cars on the lot') + ' (' + fmt(refreshCost()) + ')'; }
const refreshCost = () => 100 + level() * 50;
$('lotPrev').onclick = () => { A.tone(500, .06, 'triangle', .05); S.li = (S.li + S.lot.length - 1) % S.lot.length; renderLot(true); };
$('lotNext').onclick = () => { A.tone(560, .06, 'triangle', .05); S.li = (S.li + 1) % S.lot.length; renderLot(true); };
$('refreshBtn').onclick = () => { const c = refreshCost(); if (S.money < c) { toast(T('אין מספיק כסף', 'Not enough money')); return; } S.money -= c; genLot(); updHud(); renderLot(true); A.tone(700, .08, 'square', .04); };
$('buyBtn').onclick = () => { const l = S.lot[S.li]; if (S.car) { goGarage(); return; } if (S.money < l.price) { toast(T('אין מספיק כסף – נסו מכונית זולה יותר', 'Not enough money – try a cheaper car')); A.tone(160, .2, 'square', .05); return; }
  S.money -= l.price; S.car = { m: l.m, cond: l.cond, seed: l.seed, paid: l.price, inv: 0, bias: rnd(-.06, .06), stock: { fin: l.fin, col: l.col }, p: Object.assign({}, DEF, { fin: l.fin, col: l.col }) }; S.lot.splice(S.li, 1); S.li = 0; S.save();
  cash(); pop('-' + fmt(l.price), 'dn'); goGarage(true); };
function cash() { [880, 1320, 1760].forEach((f, i) => A.tone(f, .12, 'triangle', .07, i * .07)); }

/* ---------- garage ---------- */
function goGarage(driveIn) { state = 'garage'; hideAll(); $('hud').hidden = $('panel').hidden = $('estWrap').hidden = $('sellBtn').hidden = $('side').hidden = false; setSet('garage'); pv = Object.assign({}, S.car.p); showCar(S.car, pv); renderPanel(); layoutView(); updEst();
  A.startMusic({ chords: [[52, 55, 59], [48, 52, 55], [50, 53, 57], [47, 50, 54]], bpm: 104, lead: true, kick: true, vol: .65 });
  if (driveIn) { drive = { t: 0, from: -11 }; carRoot.root.position.x = -11; A.loopTone('eng', 'sawtooth', 46, .025); cam.yaw = .9; }
  if (!S.tut) { S.tut = 1; S.save(); setTimeout(() => toast(T('נסו חלקים – הם מוצגים בחינם. רק "התקנה" עולה כסף. שימו לב לשווי המשוער!', 'Try parts for free – only "Install" costs money. Watch the estimated value!'), 5500), 2000); } }
function pending() { const d = []; for (const k of Object.keys(DEF)) if (pv[k] !== S.car.p[k]) d.push(k); return d; }
function pendCost() { const d = pending(); let c = 0; const paintDone = d.includes('fin') || d.includes('col'); if (paintDone) c += partCost(S.car, 'fin', pv.fin, pv); for (const k of d) if (k !== 'fin' && k !== 'col') c += partCost(S.car, k, pv[k], pv); return c; }
function renderPanel() { const L = level(); const tb = TABS[tab]; const [k] = tb.subs[sub];
  $('tabs').innerHTML = TABS.map((t, i) => `<button data-t="${i}" aria-pressed="${i === tab}"><i>${t.ic}</i>${t.n}</button>`).join('');
  $('subs').innerHTML = tb.subs.map(([kk, n], i) => `<button data-s="${i}" aria-pressed="${i === sub}">${n}${pv[kk] !== S.car.p[kk] ? ' •' : ''}</button>`).join('');
  const colorK = k === 'col' || k === 'sc' || k === 'wc';
  $('opts').innerHTML = OPT[k].map(x => { const lock = x.lvl > L; const cur = S.car.p[k] === x.v, sel = pv[k] === x.v; const cost = k === 'col' ? partCost(S.car, 'fin', pv.fin, pv) : partCost(S.car, k, x.v, pv);
    let ic; if (colorK) ic = `<span class="sw" style="background:${x.h}"></span>`; else if (k === 'fin') ic = `<span class="sw" style="background:${finCSS(x.v, COLORS[pv.col].h)}"></span>`; else if (/^#/.test(x.ic)) ic = `<span class="sw" style="background:${x.ic}"></span>`; else ic = `<span class="ic">${iconSVG(x.ic)}</span>`;
    const price = lock ? '🔒 ' + T('רמה ', 'Lv ') + x.lvl : cur ? '✓' : (k === 'sc' ? T('חינם', 'Free') : cost ? fmt(cost) : T('חינם', 'Free'));
    const hot = trend().hot.some(t => x.tags.includes(t)) ? '<span class="tg">🔥</span>' : '';
    return `<button class="op${cur ? ' cur' : ''}${sel && !cur ? ' sel' : ''}${lock ? ' lock' : ''}" data-v="${typeof x.v === 'number' ? 'n' + x.v : x.v}">${hot}${ic}<b>${x.n}</b><small>${price}</small></button>`; }).join('');
  const d = pending(); $('inst').hidden = !d.length; if (d.length) { const c = pendCost(); const e0 = evaluate(S.car, S.car.p).exp * (1 + S.car.bias), e1 = evaluate(S.car, pv).exp * (1 + S.car.bias); const dv = e1 - e0;
    $('instTxt').innerHTML = T('שווי ', 'Value ') + `<span class="${dv >= 0 ? 'up' : 'dn'}" style="direction:ltr;display:inline-block">${dv >= 0 ? '+' : ''}${fmt(dv)}</span>`;
    $('instYes').textContent = (c ? T('התקנה ', 'Install ') + fmt(c) : T('אישור', 'Apply')); $('instYes').classList.toggle('no', c > S.money); }
  const fixC = repairCost(); $('fixBtn').hidden = !fixC; $('fixBtn').textContent = '🧽 ' + T('תיקון ושטיפה ', 'Repair & wash ') + fmt(fixC);
  $('sellBtn').textContent = '🔨 ' + T('למכירה פומבית', 'Auction it!');
  requestAnimationFrame(layoutView); }
function finCSS(f, h) { return { solid: h, metal: `radial-gradient(circle at 35% 30%,#fff 0,${h} 35%,#000 130%)`, matte: h, pearl: `radial-gradient(circle at 35% 30%,#fff,${h} 50%,#d8c8ff)`, chrome: 'radial-gradient(circle at 35% 30%,#fff,#9aa4b4 45%,#2a2e36 80%,#e8eef8)', carbon: 'repeating-linear-gradient(45deg,#111 0 4px,#333 4px 8px)', chroma: 'conic-gradient(#ff2fd0,#2fd0ff,#7dff2a,#ffd23a,#ff2fd0)', gold: 'radial-gradient(circle at 35% 30%,#fff6c8,#e2b441 45%,#7a5410)', galaxy: 'radial-gradient(circle at 30% 30%,#ff5ad0,#4a2aff 40%,#0a0326 75%)' }[f]; }
function iconSVG(ic) { const s = (b) => `<svg viewBox="0 0 48 32" width="48" height="32">${b}</svg>`; const car = '<path d="M4 22 Q4 16 10 15 L16 10 Q20 8 28 8 L34 9 L42 15 Q46 16 46 22Z" fill="#8a8fa0"/><circle cx="13" cy="23" r="4.5" fill="#222"/><circle cx="37" cy="23" r="4.5" fill="#222"/>';
  const wheel = n => { let b = '<circle cx="24" cy="16" r="15" fill="#222"/><circle cx="24" cy="16" r="10" fill="#c9ced6"/>'; for (let i = 0; i < n; i++) { const a = i / n * 6.283; b += `<line x1="24" y1="16" x2="${24 + Math.cos(a) * 9.5}" y2="${16 + Math.sin(a) * 9.5}" stroke="#555" stroke-width="${n > 10 ? 1 : 2.4}"/>`; } return s(b + '<circle cx="24" cy="16" r="2.5" fill="#333"/>'); };
  const M = { W0: wheel(5), W1: wheel(10), W2: s('<circle cx="24" cy="16" r="15" fill="#222"/><circle cx="24" cy="16" r="11" fill="#e8eaee"/><circle cx="24" cy="16" r="7" fill="#9aa"/>'), W3: wheel(14), W4: wheel(20), W5: wheel(12),
    S1: s(car + '<path d="M3 14 L10 13 L10 15 L3 16Z" fill="#ff8a1f"/>'), S2: s(car + '<path d="M2 12 Q6 15 12 14 L4 16Z" fill="#ff8a1f"/>'), S3: s(car + '<rect x="1" y="3" width="13" height="3" fill="#ff8a1f"/><rect x="6" y="6" width="2" height="8" fill="#ff8a1f"/>'), S4: s(car + '<rect x="1" y="5" width="13" height="3" fill="#ff8a1f"/><path d="M8 3 L10 3 L10 14 L8 14Z" fill="#ff8a1f"/>'),
    K: s(car + '<rect x="17" y="21" width="15" height="3" fill="#ff8a1f"/>'), P: s(car + '<rect x="40" y="21" width="8" height="2.5" fill="#ff8a1f"/>'), D: s(car + '<path d="M2 20 L8 20 L8 24 L2 24Z" fill="#ff8a1f"/>'),
    H1: s(car + '<rect x="34" y="10" width="7" height="3" fill="#ff8a1f"/>'), H2: s(car + '<rect x="34" y="11" width="7" height="1" fill="#ff8a1f"/><rect x="34" y="13" width="7" height="1" fill="#ff8a1f"/>'), H3: s(car + '<rect x="34" y="6" width="6" height="5" fill="#ff8a1f"/>'),
    T1: s(car + '<path d="M8 15 L16 10 L28 8 L34 9 L42 15" stroke="#ff8a1f" stroke-width="2" fill="none"/>'), T2: s(car + '<path d="M8 15 L16 10 L28 8 L34 9 L42 15" stroke="#ff8a1f" stroke-width="4" fill="none"/>'), T3: s(car + '<line x1="6" y1="18" x2="44" y2="18" stroke="#ff8a1f" stroke-width="2"/>'),
    E1: s('<rect x="8" y="12" width="28" height="8" rx="4" fill="#888"/>'), E2: s('<rect x="4" y="12" width="18" height="8" rx="4" fill="#bbb"/><rect x="26" y="12" width="18" height="8" rx="4" fill="#bbb"/>'), E3: s('<circle cx="9" cy="16" r="5" fill="#bbb"/><circle cx="19" cy="16" r="5" fill="#bbb"/><circle cx="29" cy="16" r="5" fill="#bbb"/><circle cx="39" cy="16" r="5" fill="#bbb"/>'), E4: s('<circle cx="18" cy="16" r="7" fill="#ddd"/><circle cx="31" cy="16" r="7" fill="#ddd"/>') };
  return M[ic] || ic; }
function updEst() { if (state !== 'garage') return; const car = S.car; const r = evaluate(car, pv), est = r.exp * (1 + car.bias); $('lEst').textContent = T('שווי משוער', 'Est. value'); $('lStyle').textContent = T('סטייל', 'Style') + (r.dom ? ' · ' + THEMEN[r.dom] : ''); $('lProfit').textContent = T('רווח צפוי', 'Profit');
  $('estTxt').textContent = '~' + fmt(r50(est)); const st = Math.round(r.style / 20 * 2) / 2; $('stlTxt').textContent = '★'.repeat(Math.floor(st)) + (st % 1 ? '⯪' : '') + '☆'.repeat(5 - Math.ceil(st));
  const prof = est * (reqMatch(car, pv) ? 1.35 : 1) - car.paid - car.inv - pendCost(); $('profTxt').textContent = (prof >= 0 ? '+' : '') + fmt(prof); $('profTxt').className = 'delta ' + (prof >= 0 ? 'up' : 'dn');
  $('trend').innerHTML = trendHTML();
  const R = S.req; $('req').hidden = !R; if (R) { const mOk = R.m < 0 || R.m === car.m; $('req').innerHTML = `🎩 ${T('האספן', 'Collector')} ${R.who} ${T('משלם ×1.35 על', 'pays ×1.35 for')}: ` + (R.m >= 0 ? `<i class="${mOk ? 'ok' : ''}">${MODELS[R.m].br} ${MODELS[R.m].n} ${mOk ? '✓' : ''}</i>` : '') + R.items.map(it => { const ok = reqOk(it, car, pv); return `<i class="${ok ? 'ok' : ''}">${it.n} ${ok ? '✓' : ''}</i>`; }).join(''); } }
const repairCost = () => S.car && S.car.cond < .995 ? r50((1 - S.car.cond) * MODELS[S.car.m].price * .35) : 0;
$('tabs').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; tab = +b.dataset.t; sub = 0; A.tone(620, .05, 'triangle', .04); renderPanel(); $('opts').scrollLeft = 0; };
$('subs').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; sub = +b.dataset.s; A.tone(700, .04, 'triangle', .04); renderPanel(); $('opts').scrollLeft = 0; };
$('opts').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; const k = TABS[tab].subs[sub][0]; let v = b.dataset.v; if (v[0] === 'n' && !isNaN(+v.slice(1))) v = +v.slice(1); const x = optOf(k, v);
  if (x.lvl > level()) { toast(T('נפתח ברמה ', 'Unlocks at level ') + x.lvl); A.tone(160, .2, 'square', .05); return; }
  pv[k] = v; if (k === 'sc' && pv.stripe === 'none' && pv.decal === 'none') toast(T('בחרו קודם פסים או מדבקה', 'Pick stripes or a decal first'));
  if (k === 'skirt' || k === 'split' || k === 'diff' || k === 'spo') if (v && v !== 'none' && pv.am === 'body') { }
  showCar(S.car, pv); A.tone(900, .05, 'sine', .05); FX.burst(V3(0, 1.1, 0), 10, [[1, .9, .6]], 1.5, .05, .5, 1); renderPanel(); updEst(); cam.idle = 0; focusFor(k); };
function focusFor(k) { const front = ['split', 'scoop', 'hl'], back = ['spo', 'diff', 'exh'], side = ['skirt', 'decal', 'wd', 'wc', 'wsz', 'cal', 'low']; if (front.includes(k)) cam.goal = .95; else if (back.includes(k)) cam.goal = -.95; else if (side.includes(k)) cam.goal = .25; else cam.goal = null; }
$('instNo').onclick = () => { pv = Object.assign({}, S.car.p); showCar(S.car, pv); renderPanel(); updEst(); A.tone(400, .08, 'triangle', .05); };
$('instYes').onclick = () => { const c = pendCost(); if (c > S.money) { toast(T('אין מספיק כסף', 'Not enough money')); A.tone(160, .2, 'square', .05); return; } const d = pending(); S.money -= c; S.car.inv += c; S.car.p = Object.assign({}, pv); S.save(); updHud(); renderPanel(); updEst();
  if (c) pop('-' + fmt(c), 'dn'); installFX(d); };
function installFX(keys) { const k = keys[0] || ''; const t = TABS.findIndex(tb => tb.subs.some(s => keys.includes(s[0])));
  if (t === 0 || k === 'sc' || k === 'stripe' || k === 'decal') { A.noise(.9, 'highpass', 3000, .7, .14); const c = C(COLORS[pv.col].h); for (let i = 0; i < 40; i++) FX.emit(V3(rnd(-2, 2), rnd(.4, 1.4), rnd(-1.2, 1.2)), V3(rnd(-.5, .5), rnd(.2, .8), rnd(-.5, .5)), [c.r * 1.5, c.g * 1.5, c.b * 1.5], .09, 1, 0, .6, .96); }
  else if (t === 1) { for (let i = 0; i < 4; i++) A.noise(.12, 'bandpass', 1800, 2, .18, i * .14); }
  else if (t === 4) { A.tone(55, 1.2, 'sawtooth', .07, 0, 220); A.noise(1, 'lowpass', 400, 1, .12, 0, 1400); if (keys.includes('eng') || keys.includes('exh')) { const M = MODELS[S.car.m]; for (let i = 0; i < 30; i++) FX.emit(V3(-M.L / 2 - .1, .2, rnd(-.5, .5)), V3(rnd(-3, -1.5), rnd(0, .5), rnd(-.2, .2)), [3, 1.4, .3], .12, .5, 0, 1, .92); } }
  else { A.tone(130, .2, 'sine', .1); A.noise(.15, 'lowpass', 900, 1, .15); }
  [1200, 1600, 2000].forEach((f, i) => A.tone(f, .1, 'sine', .04, .1 + i * .06)); FX.burst(V3(0, 1.3, 0), 30, [[1.6, 1.2, .4], [1, 1, 1]], 2.5, .06, .9, 3); }
$('fixBtn').onclick = () => { const c = repairCost(); if (!c) return; if (S.money < c) { toast(T('אין מספיק כסף', 'Not enough money')); return; } S.money -= c; S.car.inv += c; S.car.cond = 1; S.save(); updHud(); showCar(S.car, pv); renderPanel(); updEst(); pop('-' + fmt(c), 'dn');
  A.noise(1.2, 'bandpass', 1200, .8, .12); for (let i = 0; i < 60; i++) FX.emit(V3(rnd(-2.2, 2.2), rnd(.3, 1.5), rnd(-1.3, 1.3)), V3(rnd(-.3, .3), rnd(.3, 1), rnd(-.3, .3)), [2, 2, 2.4], .1, 1.2, -.3, .7, .97); toast(T('המכונית כמו חדשה! ✨', 'Good as new! ✨')); };
$('sellBtn').onclick = () => { if (pending().length) { pv = Object.assign({}, S.car.p); showCar(S.car, pv); }
  const r = evaluate(S.car, S.car.p); $('cT').textContent = T('למכור במכירה פומבית?', 'Send to auction?'); $('cP').innerHTML = T('השמאי מעריך: ', 'Appraiser estimate: ') + `<b style="direction:ltr;display:inline-block">${fmt(r50(r.exp * (1 + S.car.bias) * .9))} – ${fmt(r50(r.exp * (1 + S.car.bias) * 1.1))}</b>` + (reqMatch(S.car, S.car.p) ? '<br>🎩 ' + T('האספן מתעניין! ×1.35', 'The collector is interested! ×1.35') : '');
  $('cNo').textContent = T('עוד לא', 'Not yet'); $('cYes').textContent = '🔨 ' + T('למכירה!', 'Sell!'); $('confSheet').hidden = false; };
$('cNo').onclick = () => $('confSheet').hidden = true;
$('cYes').onclick = () => { $('confSheet').hidden = true; startAuction(); };

/* ---------- auction ---------- */
function startAuction() { const car = S.car; const r = evaluate(car, car.p); const col = reqMatch(car, car.p); const final = r.exp * (col ? 1.35 : 1) * rnd(.93, 1.1);
  state = 'auction'; hideAll(); $('aucUI').hidden = $('hypeUI').hidden = false; $('hypeBtn').textContent = '📣 ' + T('הלהיבו את הקהל!', 'Hype the crowd!'); $('hypeI').style.width = '0%';
  setSet('auction'); showCar(car, car.p); layoutView();
  const nb = clamp(Math.round(2 + r.style / 25), 3, 6); const L = Math.min(innerWidth / innerHeight, 1.8);
  bidders.forEach((P, i) => { P.g.visible = i < nb; const sp = (i - (nb - 1) / 2) * (L < .8 ? .62 : .95); P.g.position.set(sp, 0, 3.7 + (i % 2) * .45); P.baseY = 0; P.g.rotation.y = Math.PI + sp * .12; P.raise = 0; P.setMood('smile'); });
  const start = final * rnd(.5, .58); auc = { t: 0, final, hype: 0, start, price: start, disp: start * .8, i: 0, n: 6 + Math.floor(Math.random() * 4), next: 1.6, phase: 'bid', last: -1, nb, col, style: r.style };
  $('aucSt').textContent = T('המכירה נפתחת!', 'Bidding opens!'); $('aucBdr').textContent = MODELS[car.m].br + ' ' + MODELS[car.m].n; A.stopMusic(); A.loopOn('crowd', 'bandpass', 700, .6, .03, .3); A.voice('wow', 1); }
$('hypeBtn').onpointerdown = e => { e.preventDefault(); if (!auc || auc.phase !== 'bid') return; auc.hype = Math.min(.08, auc.hype + .004); $('hypeI').style.width = auc.hype / .08 * 100 + '%'; A.tone(500 + auc.hype * 8000, .05, 'square', .03); const P = bidders[Math.floor(Math.random() * auc.nb)]; P.g.position.y = .15; if (Math.random() < .3) FX.burst(V3(rnd(-1, 1), 1.5, 3), 4, CONFETTI, 1.5, .05, .6, 3); };
function aucTick(dt) { const a = auc; a.t += dt; const target = a.final * (1 + a.hype);
  if (a.phase === 'bid' && a.t > a.next) { a.i++; a.price = r50(a.start + (target - a.start) * ease(a.i / a.n)); let b; do b = Math.floor(Math.random() * a.nb); while (b === a.last && a.nb > 1); a.last = b; bidders[b].raise = 1;
    $('aucBdr').textContent = T('הצעה ממספר ', 'Bid from paddle ') + (11 + b * 7) + '!'; A.tone(700 + a.i * 40, .08, 'triangle', .06); A.voice(['hm', 'huh', 'wow'][b % 3], .8 + b * .1);
    a.next = a.t + lerp(.55, 1.05, a.i / a.n) * rnd(.85, 1.15); if (a.i >= a.n) { a.phase = 'once'; a.next = a.t + 1.3; $('hypeUI').hidden = true; } }
  else if (a.phase === 'once' && a.t > a.next) { a.price = r50(target); $('aucSt').textContent = T('פעם ראשונה…', 'Going once…'); A.tone(220, .2, 'square', .05); a.phase = 'twice'; a.next = a.t + 1.1; }
  else if (a.phase === 'twice' && a.t > a.next) { $('aucSt').textContent = T('פעם שנייה…', 'Going twice…'); A.tone(220, .2, 'square', .05); a.phase = 'sold'; a.next = a.t + 1.1; }
  else if (a.phase === 'sold' && a.t > a.next) { a.phase = 'done'; a.price = r50(target); $('aucSt').textContent = T('נמכר! 🔨', 'SOLD! 🔨'); A.noise(.15, 'lowpass', 600, 1, .5); A.tone(90, .3, 'sine', .3); cash(); A.loopOff('crowd'); A.noise(1.6, 'bandpass', 1200, .5, .12, .05);
    const w = bidders[a.last]; w.setMood('happy'); FX.burst(V3(0, 2, 0), 160, CONFETTI, 6, .09, 2.2, 5); E.grade.uniforms.uFlash.value = .35; a.next = a.t + 2.4; sold(a.price); }
  else if (a.phase === 'done' && a.t > a.next) { a.phase = 'x'; showResult(); }
  if (a.phase === 'bid' && a.i > 0) $('aucSt').textContent = a.i > a.n * .7 ? T('מי נותן יותר?', 'Any more bids?') : T('ההצעות עולות!', 'Bids are climbing!');
  a.disp = lerp(a.disp, a.price, Math.min(1, dt * 6)); $('aucPr').textContent = fmt(r50(a.disp));
  const tt = sets.auction.userData.tt; if (carRoot) carRoot.root.rotation.y += dt * .35; tt.rotation.y += dt * .35;
  sets.auction.userData.beams.forEach((b, i) => { const ang = a.t * (.6 + i * .2) + i * 2; b.rotation.z = Math.sin(ang) * .25; b.rotation.x = Math.cos(ang * .8) * .2 - .2; spots[i].target.position.set(Math.sin(ang) * 1.2, 0, Math.cos(ang) * .6); }); }
let lastRes = null;
function sold(price) { const car = S.car, M = MODELS[car.m]; const profit = price - car.paid - car.inv; const L0 = level();
  const gain = Math.round(10 + clamp(profit / M.price * 100, -5, 60)) + (auc.col ? 15 : 0); S.money += price; S.rep += Math.max(3, gain); S.sales++; S.total += profit; S.best = Math.max(S.best, profit);
  lastRes = { price, paid: car.paid, inv: car.inv, profit, gain: Math.max(3, gain), L0, L1: level(), col: auc.col, style: auc.style, m: car.m };
  S.car = null; S.lot = null; genLot(); S.save(); updHud(); }
function showResult() { const r = lastRes; const M = MODELS[r.m]; $('rT').textContent = r.profit >= 0 ? (r.profit > M.price * .25 ? T('עסקת ענק! 🤑', 'Huge flip! 🤑') : T('נמכר ברווח! 💰', 'Sold for profit! 💰')) : T('הפסד הפעם 😬', 'A loss this time 😬');
  $('rRes').innerHTML = `<span>${T('נמכר ב־', 'Sold for')}</span><b>${fmt(r.price)}</b><span>${T('מחיר קנייה', 'Bought for')}</span><b>-${fmt(r.paid)}</b><span>${T('שיפורים ותיקונים', 'Parts & repairs')}</span><b>-${fmt(r.inv)}</b>` +
    (r.col ? `<span>🎩 ${T('בונוס אספן', 'Collector bonus')}</span><b>×1.35</b>` : '') + `<span class="tot">${T('רווח', 'Profit')}</span><b class="tot ${r.profit >= 0 ? 'up' : 'dn'}" style="color:${r.profit >= 0 ? '#14a84a' : '#e0302a'}">${r.profit >= 0 ? '+' : ''}${fmt(r.profit)}</b><span>⭐ ${T('מוניטין', 'Reputation')}</span><b>+${r.gain}</b>`;
  let u = ''; if (r.L1 > r.L0) { const items = []; for (let l = r.L0 + 1; l <= r.L1; l++) { MODELS.filter(m => m.lvl === l).forEach(m => items.push('🚗 ' + m.br + ' ' + m.n)); for (const k in OPT) OPT[k].filter(x => x.lvl === l && k !== 'col' && k !== 'sc').forEach(x => items.push(x.n)); }
    u = `<div class="unl">🎉 ${T('עליתם לרמה ', 'Level up! Level ')}${r.L1}${items.length ? '<br>' + T('נפתח: ', 'Unlocked: ') + items.join(' · ') : ''}</div>`; A.voice('yay', 1.2); }
  $('rUnl').innerHTML = u + (Math.floor(S.sales / 2) !== Math.floor((S.sales - 1) / 2) ? `<div class="unl" style="background:#eef2ff;color:#2a3a8a">📈 ${T('טרנד חדש בשוק: ', 'New market trend: ')}${trend().hot.map(t => TAGN[t]).join(', ')}</div>` : '');
  $('rGo').textContent = T('למגרש המכוניות ▶', 'To the car lot ▶'); $('resSheet').hidden = false; }
$('rGo').onclick = () => { $('resSheet').hidden = true; auc = null; bidders.forEach(P => P.setMood('smile')); if (carRoot) carRoot.root.rotation.y = 0; checkBank(); showLot(); };
function checkBank() { if (!S.car && S.lot && S.money < Math.min(...S.lot.map(l => l.price)) && S.money < 5000) { S.money += 6000; S.save(); updHud(); setTimeout(() => toast(T('הבנק נתן לכם מענק של $6,000 כדי להמשיך! 🏦', 'The bank gave you a $6,000 grant to keep going! 🏦'), 4500), 600); } }

/* ---------- title / misc ---------- */
function hideAll() { for (const id of ['title', 'hud', 'lotDock', 'panel', 'estWrap', 'sellBtn', 'side', 'aucUI', 'hypeUI', 'resSheet', 'confSheet', 'helpSheet']) $(id).hidden = true; }
function showTitle() { state = 'title'; hideAll(); A.allOff(); $('title').hidden = false; setSet('garage'); const c = S.car || lotCar(0); showCar(c, S.car ? S.car.p : c.p); cam.pitch = .15; layoutView();
  $('tMoney').textContent = fmt(S.money); $('tLvl').textContent = level(); $('tSales').textContent = S.sales; $('playBtn').textContent = S.car ? T('המשיכו לשפץ ▶', 'Continue ▶') : S.sales ? T('למגרש ▶', 'To the lot ▶') : T('התחילו ▶', 'Start ▶'); }
$('playBtn').onclick = () => { A.ac(); if (S.car) goGarage(); else { checkBank(); showLot(); } };
$('menuBtn').onclick = () => { if (state === 'garage' && pending().length) { pv = Object.assign({}, S.car.p); } showTitle(); };
const HELP = [T('קונים מכונית משומשת במגרש. מכונית במצב גרוע זולה יותר – אבל צריך לתקן אותה.', 'Buy a used car on the lot. Worn cars are cheaper – but need repairs.'),
  T('במוסך מנסים צבעים וחלקים בחינם. רק כשלוחצים "התקנה" משלמים.', 'In the garage, preview paint and parts for free. You only pay when you press "Install".'),
  T('השווי נקבע לפי החלקים, המצב והסטייל. חלקים מאותו סגנון (מרוץ, רחוב, יוקרה) מעלים את הסטייל. יותר מדי תוספות צעקניות – מורידות!', 'Value depends on parts, condition and style. Parts of one theme (racing, street, luxury) boost style. Too many loud add-ons lower it!'),
  T('🔥 טרנדים: מה שחם השבוע שווה יותר. ❄️ מה שקר – שווה פחות. הטרנד מתחלף כל שתי מכירות.', '🔥 Trends: hot items are worth more this week. ❄️ Cold ones less. Trends change every two sales.'),
  T('🎩 אספנים מחפשים מכונית מסוימת – עמדו בדרישות וקבלו ×1.35!', '🎩 Collectors want specific cars – meet their wishes for ×1.35!'),
  T('במכירה הפומבית לחצו "הלהיבו את הקהל" מהר כדי להעלות את המחיר.', 'At the auction, tap "Hype the crowd" fast to push the price up.'),
  T('מכירות מעלות מוניטין ורמה – ופותחות מכוניות וחלקים חדשים.', 'Sales earn reputation and levels – unlocking new cars and parts.')];
const openHelp = () => { $('hT').textContent = T('איך משחקים', 'How to play'); $('hList').innerHTML = HELP.map(h => `<li>${h}</li>`).join(''); $('hClose').textContent = T('יאללה!', 'Got it!'); $('helpSheet').hidden = false; };
$('helpBtn').onclick = openHelp; $('howBtn').onclick = openHelp; $('hClose').onclick = () => $('helpSheet').hidden = true;
$('menuBtn').innerHTML = ICO.grid('#ffffff'); $('homeT').innerHTML = ICO.home('#ffffff'); soundButton('sndBtn', S, A, '#ffffff'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('tSub').textContent = T('קונים מכוניות משומשות, משפצים בסטייל ומוכרים במכירה פומבית. ככה בונים אימפריית מכוניות!', 'Buy used cars, tune them with style and flip them at auction. Build a car empire!');
$('tl1').textContent = T('כסף', 'Money'); $('tl2').textContent = T('רמה', 'Level'); $('tl3').textContent = T('מכירות', 'Sales'); $('howBtn').textContent = '❓ ' + T('איך משחקים', 'How to play'); $('lMoney').textContent = T('כסף', 'Money');

/* ---------- loop ---------- */
let last = performance.now(), tt = 0;
function frame(now) { requestAnimationFrame(frame); let dt = Math.min(.05, (now - last) / 1000) * (window.__fast || 1); last = now; tt += dt; A.tick();
  if (drive && carRoot) { drive.t += dt; const k = ease(drive.t / 1.9); const x = lerp(drive.from, 0, k); const dx = x - carRoot.root.position.x; carRoot.root.position.x = x; carRoot.spins.forEach(w => w.g.rotation.z -= w.s * dx / w.R); if (drive.t > 1.9) { drive = null; A.loopOff('eng'); A.tone(70, .3, 'sawtooth', .05, 0, 40); } }
  if (cam.goal != null && state === 'garage') { let d = cam.goal - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); cam.yaw += d * Math.min(1, dt * 3); if (Math.abs(d) < .02) cam.goal = null; }
  updCam(dt); if (setName !== 'auction') occlude(); if (state === 'auction' && auc) aucTick(dt);
  for (const P of bidders) if (P.g.visible && setName === 'auction') { P.update(tt, dt); P.raise = Math.max(0, P.raise - dt * .8); P.arms[1].rotation.x = lerp(P.arms[1].rotation.x, -P.raise * 2.9, dt * 10); if (P.mood !== 'happy') P.g.position.y = lerp(P.g.position.y, 0, dt * 8); }
  if (setName === 'auction') curtain.material.sheenRoughness = .4;
  FX.update(dt, 0); E.grade.uniforms.uFlash.value *= Math.pow(.02, dt); E.render(); }
setTimeout(() => { if (!S.lot) genLot(); E.resize(); showTitle(); updHud(); $('loading').hidden = true; requestAnimationFrame(frame); window.__flipOK = true; }, 20);
window.__g = { get S() { return S; }, get state() { return state; }, showLot, goGarage, buy: i => { S.li = i; $('buyBtn').onclick(); }, pick(k, v) { pv[k] = v; showCar(S.car, pv); renderPanel(); updEst(); }, install: () => $('instYes').onclick(), sell: startAuction, evaluate, get pv() { return pv; }, get auc() { return auc; }, cam, MODELS, setCar(m) { S.car = { m, cond: 1, seed: 5, paid: MODELS[m].price * .8, inv: 0, bias: 0, stock: { fin: 'solid', col: 0 }, p: Object.assign({}, DEF) }; goGarage(); } };
