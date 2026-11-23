import { THREE, $, V3, C, clamp, lerp, rnd, rng, T, EN, store, engine, studioEnv, std, particles, audio, toast, ICO, hubButtons, qualityButton, isTouch, CONFETTI } from '../lib/kit.js';
const S = store('robo-save', { tro: 0, gears: 60, lv: {}, mode: 'cpu', diff: 'easy', wins: 0, tut: 0 });
const E = engine(S, { fov: 42, far: 300, bloom: [.45, .5, .9], exposure: 1.0, vignette: .3, sat: 1.12, bg: '#070b18' });
const { scene, camera, renderer } = E; studioEnv(E, '#cfe4ff', '#2a3448', .5);
const A = audio(S); const FX = particles(E, 1600, true); const SM = particles(E, 600);
const TAU = Math.PI * 2; const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };
const HX = 9, HZ = 16, RIV = 1.3, BX = 5.2, US = 1.55;

/* ================= DATA ================= */
const CARDS = {
  scout: { n: T('נושא כלים', 'Squire'), cost: 2, hp: 330, spd: 3.2, dmg: 70, rate: .8, range: .95, aggro: 5.5, size: .42, tgt: 'ground', hit: 'any', d: T('אביר צעיר ומהיר עם חרב ומגן', 'Quick young knight with sword & shield') },
  blaster: { n: T('קשתית', 'Archer'), cost: 3, hp: 460, spd: 2.3, dmg: 85, rate: 1.05, range: 4.6, aggro: 6, size: .5, hit: 'any', air: 1, proj: 'arrow', d: T('יורה חיצים, פוגעת גם במעופפים', 'Shoots arrows, hits flyers too') },
  tank: { n: T('טרול סלע', 'Rock Troll'), cost: 5, hp: 2400, spd: 1.3, dmg: 170, rate: 1.5, range: 1.4, aggro: 0, size: 1.0, hit: 'build', d: T('ענק – הולך רק על מגדלים', 'Huge – only attacks towers') },
  drones: { n: T('פיות אש', 'Fire Sprites'), cost: 3, hp: 170, spd: 3.1, dmg: 42, rate: .7, range: 3.2, aggro: 5.5, size: .38, fly: 1, n2: 3, hit: 'any', air: 1, proj: 'fire', d: T('3 פיות מעופפות שזורקות אש', '3 flying sprites that throw fire') },
  sniper: { n: T('צלף קשת', 'Crossbow'), cost: 4, hp: 420, spd: 1.8, dmg: 290, rate: 2.4, range: 6.2, aggro: 7, size: .52, hit: 'any', air: 1, proj: 'bolt', d: T('טווח ענק, פגיעה חזקה', 'Huge range, heavy hit') },
  boom: { n: T('גמד חבית', 'Keg Dwarf'), cost: 2, hp: 320, spd: 3.5, dmg: 520, rate: .1, range: .9, aggro: 4, size: .45, hit: 'any', boom: 2.3, d: T('רץ עם חבית ומתפוצץ!', 'Runs in with a keg and explodes!') },
  squad: { n: T('חוליית אבירים', 'Knight Squad'), cost: 3, hp: 240, spd: 3.0, dmg: 55, rate: .85, range: .95, aggro: 5.5, size: .36, n2: 3, hit: 'any', d: T('3 אבירים קטנים יחד', '3 small knights together') },
  imps: { n: T('שדונים', 'Imp Pack'), cost: 2, hp: 95, spd: 3.8, dmg: 40, rate: .7, range: .85, aggro: 5, size: .3, n2: 5, hit: 'any', d: T('5 שדונים קטנים ומהירים', '5 small, fast imps') },
  rocket: { n: T('מטאור', 'Meteor'), cost: 4, spell: 1, dmg: 420, rad: 2.6, d: T('סלע בוער נופל מהשמיים', 'A flaming rock falls from the sky') },
  emp: { n: T('ברק', 'Thunder'), cost: 2, spell: 1, dmg: 70, rad: 3, stun: 2.6, d: T('ברק שמשתק לכמה שניות', 'Lightning that stuns for a few seconds') },
  medic: { n: T('פיית ריפוי', 'Healing Fairy'), cost: 3, hp: 420, spd: 2.2, dmg: 0, heal: 70, rate: 1, range: 3.4, aggro: 6, size: .45, fly: 1, hit: 'heal', unlock: 150, d: T('מרחפת ומרפאת חברים', 'Hovers and heals allies') },
  turret: { n: T('בליסטרה', 'Ballista'), cost: 4, hp: 900, dmg: 75, rate: .55, range: 6, aggro: 6, size: .8, build: 1, life: 32, hit: 'any', air: 1, proj: 'bolt', unlock: 300, d: T('מבנה הגנה ל־30 שניות', 'Defense for 30 seconds') },
  titan: { n: T('פלדין', 'Paladin'), cost: 7, hp: 3600, spd: 1.15, dmg: 330, rate: 1.7, range: 1.8, aggro: 4, size: 1.25, hit: 'any', splash: 1.8, unlock: 500, d: T('אביר ענק – מכה ששוברת הכול', 'Giant knight – a smash that breaks everything') } };
const BASE = ['scout', 'squad', 'imps', 'blaster', 'tank', 'drones', 'sniper', 'boom', 'rocket', 'emp'];
const ARENAS = [{ t: 0, n: T('האחו הירוק', 'Green Meadow'), ic: '🌳', g1: '#5fae3e', g2: '#56a336', path: '#c9a46a', riv: '#3aa8ff', bg: '#9fd4ff', fog: '#cfe8ff', light: 1, tree: '#3f8f3a', trunk: '#6a4426', stone: '#b9b2a6' },
  { t: 200, n: T('יער הסתיו', 'Autumn Woods'), ic: '🍂', g1: '#b59a3e', g2: '#a88d36', path: '#a87a4a', riv: '#3a9ae8', bg: '#ffd9a8', fog: '#ffe6c4', light: 1, tree: '#e07a2a', trunk: '#5a3a20', stone: '#a89a8a' },
  { t: 450, n: T('פסגות השלג', 'Snowy Peaks'), ic: '🏔️', g1: '#eef4fa', g2: '#e2ebf5', path: '#b8c8da', riv: '#7ad4ff', bg: '#bfe0ff', fog: '#e6f2ff', light: 1.05, tree: '#2f6a52', trunk: '#4a3424', stone: '#9aa6b4', snow: 1 },
  { t: 800, n: T('הר הגעש', 'Volcano'), ic: '🌋', g1: '#4a3c38', g2: '#42342f', path: '#6a5248', riv: '#ff6a1a', bg: '#3a1a14', fog: '#4a2418', light: .85, tree: '#2a2220', trunk: '#1a1410', stone: '#5a4c46', lava: 1 }];
const arenaOf = t => { let a = 0; ARENAS.forEach((q, i) => { if (t >= q.t) a = i; }); return a; };
const lvl = k => S.lv[k] || 1; const mult = k => 1 + (lvl(k) - 1) * .1;
const MAXL = 8, NEED = [0, 2, 4, 10, 20, 40, 80, 150], COINC = [0, 20, 50, 100, 200, 350, 600, 1000];
if (!S.cards) S.cards = {}; const copies = k => S.cards[k] || 0;
const canUp = k => unlocked(k) && lvl(k) < MAXL && copies(k) >= NEED[lvl(k)] && S.gears >= COINC[lvl(k)];
const rarity = k => CARDS[k].cost >= 5 || CARDS[k].unlock ? 2 : CARDS[k].cost >= 4 ? 1 : 0;
const unlocked = k => !CARDS[k].unlock || S.tro >= CARDS[k].unlock;
const TEAMC = ['#2a7aff', '#ff3a3a'];

/* ================= MATERIALS / MODELS ================= */
const M = c => std(c, { roughness: .6 });
const steel = std('#c8d0dc', { metalness: .75, roughness: .3 }), iron = std('#5a606c', { metalness: .6, roughness: .45 }), gold = std('#ffcf3a', { metalness: .85, roughness: .25 }), wood = M('#8a5a30'), wood2 = M('#6a4424'), leather = M('#7a4a26'), cloth = M('#e8dcc4'), dark = M('#2a2a30');
const skins = [M('#f2c3a0'), M('#d9a07a'), M('#9a6a48')];
const teamM = TEAMC.map(c => std(c, { roughness: .55 })), teamD = TEAMC.map(c => std(C(c).multiplyScalar(.6).getStyle(), { roughness: .6 }));
const glowM = TEAMC.map(c => new THREE.MeshBasicMaterial({ color: C(c).multiplyScalar(2.2) }));
const B = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), Cy = (r1, r2, h, m, s = 14) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, s), m), Sp = (r, m, a = 16, b = 12) => new THREE.Mesh(new THREE.SphereGeometry(r, a, b), m), Ca = (r, l, m) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 12), m), Co = (r, h, m, s = 12) => new THREE.Mesh(new THREE.ConeGeometry(r, h, s), m);
const put = (p, o, x, y, z) => { o.position.set(x, y, z); p.add(o); return o; };
// generic chunky humanoid: big head, team tabard, pivoting legs and arms. s = overall scale
function hero(g, o) { const s = o.s || 1, tm = o.tm; const R = { legs: [], arms: [] };
  for (const sd of [-1, 1]) { const lp = new THREE.Group(); lp.position.set(sd * .11 * s, .42 * s, 0); g.add(lp); put(lp, Ca(.075 * s, .2 * s, o.legM || iron), 0, -.18 * s, 0); put(lp, B(.13 * s, .09 * s, .22 * s, o.boot || leather), 0, -.38 * s, .04 * s); R.legs.push(lp); }
  const torso = put(g, Ca(.2 * s, .18 * s, o.body || steel), 0, .66 * s, 0); torso.scale.set(1.05, 1, .78);
  const tab = put(g, B(.3 * s, .34 * s, .05 * s, tm), 0, .62 * s, .15 * s); put(g, B(.31 * s, .05 * s, .3 * s, leather), 0, .5 * s, 0);
  if (o.cape) { const cp = put(g, B(.36 * s, .52 * s, .03 * s, tm), 0, .62 * s, -.17 * s); cp.rotation.x = .12; }
  const head = new THREE.Group(); head.position.y = .98 * s; g.add(head); put(head, Sp(.17 * s, o.skin || skins[0], 18, 14), 0, 0, 0);
  for (const sd of [-1, 1]) put(head, Sp(.025 * s, dark, 8, 6), sd * .06 * s, .02 * s, .155 * s);
  if (o.helm === 'knight') { put(head, Sp(.185 * s, steel, 18, 12), 0, .03 * s, -.01 * s).scale.set(1, .95, 1); put(head, B(.26 * s, .04 * s, .05 * s, dark), 0, .02 * s, .16 * s); const pl = put(head, Ca(.045 * s, .16 * s, tm), 0, .24 * s, -.04 * s); pl.rotation.x = -.5; }
  if (o.helm === 'hood') { const h = put(head, Sp(.2 * s, tm, 18, 12, ), 0, .03 * s, -.03 * s); h.scale.set(1, 1.05, 1.05); put(head, Co(.09 * s, .2 * s, tm, 10), 0, .1 * s, -.2 * s).rotation.x = -1.9; }
  if (o.helm === 'crown') { put(head, Sp(.19 * s, steel, 18, 12), 0, .03 * s, 0); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; put(head, Co(.035 * s, .09 * s, gold, 4), Math.sin(a) * .15 * s, .2 * s, Math.cos(a) * .15 * s); } put(head, Cy(.16 * s, .16 * s, .05 * s, gold, 16), 0, .16 * s, 0); put(head, B(.24 * s, .035 * s, .05 * s, dark), 0, .01 * s, .17 * s); }
  if (o.beard) { const bd = put(head, Co(.12 * s, .22 * s, o.beard, 10), 0, -.12 * s, .1 * s); bd.rotation.x = Math.PI + .25; put(head, Sp(.19 * s, tm, 16, 10), 0, .08 * s, -.01 * s).scale.set(1, .6, 1); }
  for (const sd of [-1, 1]) { const ap = new THREE.Group(); ap.position.set(sd * .27 * s, .8 * s, 0); g.add(ap); put(ap, Ca(.06 * s, .2 * s, o.armM || steel), 0, -.16 * s, 0); put(ap, Sp(.065 * s, o.skin || skins[0], 10, 8), 0, -.33 * s, 0); R.arms.push(ap); }
  R.head = head; return R; }
function model(k, team) { const g = new THREE.Group(), tm = teamM[team], td = teamD[team], gl = glowM[team]; let R = { g, legs: [], arms: [], spin: [], head: null };
  if (k === 'scout') { R = Object.assign(R, hero(g, { tm, helm: 'knight', s: .95 })); const sw = put(R.arms[1], B(.04, .5, .08, steel), 0, -.36, .2); sw.rotation.x = 1.3; put(R.arms[1], B(.16, .04, .05, gold), 0, -.34, .08); const sh = put(R.arms[0], Cy(.2, .2, .05, tm, 18), -.06, -.3, .08); sh.rotation.z = Math.PI / 2; put(R.arms[0], Cy(.07, .07, .06, gold, 10), -.09, -.3, .08).rotation.z = Math.PI / 2; R.weapon = R.arms[1]; }
  if (k === 'squad') { R = Object.assign(R, hero(g, { tm, helm: 'knight', s: .8 })); const sw = put(R.arms[1], B(.035, .42, .07, steel), 0, -.3, .17); sw.rotation.x = 1.3; const sh = put(R.arms[0], Cy(.16, .16, .05, tm, 16), -.05, -.25, .07); sh.rotation.z = Math.PI / 2; R.weapon = R.arms[1]; }
  if (k === 'imps') { const sk = std('#d8402a', { roughness: .6 }); for (const sd of [-1, 1]) { const lp = new THREE.Group(); lp.position.set(sd * .08, .22, 0); g.add(lp); put(lp, Ca(.04, .12, sk), 0, -.1, 0); R.legs.push(lp); } put(g, Ca(.12, .1, sk), 0, .38, 0); put(g, B(.22, .1, .05, tm), 0, .36, .1); const hd = put(g, Sp(.15, sk), 0, .62, 0); for (const sd of [-1, 1]) { put(hd, Co(.035, .14, M('#2a1a1a'), 6), sd * .08, .14, 0).rotation.z = -sd * .4; put(hd, Sp(.03, new THREE.MeshBasicMaterial({ color: '#ffe23a' }), 8, 6), sd * .05, .02, .13); }
    for (const sd of [-1, 1]) { const ap = new THREE.Group(); ap.position.set(sd * .15, .45, 0); g.add(ap); put(ap, Ca(.035, .12, sk), 0, -.1, 0); R.arms.push(ap); } const fk = put(R.arms[1], Cy(.012, .012, .4, iron, 5), 0, -.18, .12); fk.rotation.x = 1.2; R.weapon = R.arms[1]; }
  if (k === 'blaster') { R = Object.assign(R, hero(g, { tm, helm: 'hood', body: cloth, armM: cloth, legM: leather, skin: skins[1] })); const bow = new THREE.Mesh(new THREE.TorusGeometry(.3, .02, 6, 18, Math.PI * 1.1), wood); bow.rotation.set(0, Math.PI / 2, Math.PI / 2 - .55); put(R.arms[0], bow, 0, -.34, .14); put(g, Cy(.07, .07, .4, leather, 10), .12, .78, -.2).rotation.x = .3; for (let i = 0; i < 3; i++) put(g, Cy(.012, .012, .18, tm, 4), .1 + i * .03, 1.02, -.26); R.weapon = R.arms[1]; }
  if (k === 'tank') { const sk = M('#7a8a6a'), skD = M('#5a6a4c'); for (const sd of [-1, 1]) { const lp = new THREE.Group(); lp.position.set(sd * .25, .5, 0); g.add(lp); put(lp, Ca(.15, .3, skD), 0, -.25, 0); R.legs.push(lp); }
    const b = put(g, Ca(.42, .35, sk), 0, 1.0, 0); b.scale.set(1.15, 1, .9); put(g, B(.7, .3, .55, tm), 0, .62, 0); put(g, Sp(.26, sk), 0, 1.55, .12); put(g, B(.3, .06, .05, dark), 0, 1.6, .37); for (const sd of [-1, 1]) put(g, Co(.05, .14, M('#e8e0cc'), 6), sd * .1, 1.44, .35).rotation.x = -.4;
    for (const sd of [-1, 1]) { const ap = new THREE.Group(); ap.position.set(sd * .55, 1.25, 0); g.add(ap); put(ap, Ca(.12, .45, sk), 0, -.33, 0); put(ap, Sp(.15, skD), 0, -.65, 0); R.arms.push(ap); }
    const club = put(R.arms[1], Cy(.08, .17, .9, wood2, 8), 0, -.75, .35); club.rotation.x = 1.4; for (let i = 0; i < 4; i++) put(club, Co(.04, .1, iron, 5), Math.cos(i * 1.6) * .14, .3, Math.sin(i * 1.6) * .14).rotation.z = Math.cos(i * 1.6) * -1.3;
    const fl = put(g, B(.02, .9, .02, wood), -.2, 1.8, -.35); put(fl, B(.4, .26, .02, tm), .2, .3, 0); R.weapon = R.arms[1]; }
  if (k === 'drones') { const core = put(g, Sp(.16, std('#ffb84a', { emissive: C('#ff7a1a'), emissiveIntensity: 1.2 })), 0, 0, 0); put(g, Sp(.1, gl), 0, .12, 0); put(g, Co(.08, .22, std('#ff5a1a', { emissive: C('#ff3a00'), emissiveIntensity: 1 }), 8), 0, .2, -.08).rotation.x = -.9;
    for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(.26, 14), new THREE.MeshBasicMaterial({ color: C(TEAMC[team]).lerp(C('#ffffff'), .5), transparent: true, opacity: .55, side: THREE.DoubleSide })); const wp = new THREE.Group(); wp.position.set(sd * .1, .06, -.05); w.position.x = sd * .24; w.scale.y = .55; wp.add(w); g.add(wp); R.spin.push(wp); wp.userData.side = sd; } R.wings = 1; }
  if (k === 'sniper') { R = Object.assign(R, hero(g, { tm, helm: 'knight', cape: 1, s: 1 })); const cb = new THREE.Group(); put(cb, B(.06, .06, .6, wood), 0, 0, .2); put(cb, B(.62, .04, .05, iron), 0, 0, .44); put(cb, B(.03, .03, .5, steel), 0, .05, .3); cb.position.set(.05, -.3, .1); R.arms[1].add(cb); R.weapon = R.arms[1]; }
  if (k === 'boom') { R = Object.assign(R, hero(g, { tm, s: .85, beard: M('#e07a2a'), body: leather, armM: leather, legM: wood2, skin: skins[0] })); const keg = put(g, Cy(.22, .22, .4, wood, 14), 0, .78, -.3); keg.rotation.x = Math.PI / 2; for (const q of [-.12, .12]) put(keg, Cy(.235, .235, .04, iron, 14), 0, q, 0); const f = put(g, Sp(.06, new THREE.MeshBasicMaterial({ color: '#ffb21a' })), 0, 1.0, -.38); R.fuse = f; put(g, Cy(.015, .015, .14, dark, 5), 0, .92, -.36); }
  if (k === 'medic') { put(g, Sp(.17, M('#ffe8d4')), 0, .12, 0); put(g, Ca(.14, .2, std('#f4fff4', { roughness: .5 })), 0, -.15, 0); put(g, Sp(.18, M('#ffd86a')), 0, .17, -.03).scale.set(1, .7, 1); put(g, new THREE.Mesh(new THREE.TorusGeometry(.12, .015, 6, 18), new THREE.MeshBasicMaterial({ color: '#fff6a0' })), 0, .38, 0).rotation.x = Math.PI / 2;
    const st = put(g, Cy(.015, .015, .55, wood, 5), .16, -.05, .05); put(st, Sp(.06, new THREE.MeshBasicMaterial({ color: '#7aff9a' })), 0, .3, 0); for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(.3, 14), new THREE.MeshBasicMaterial({ color: '#d8fff0', transparent: true, opacity: .5, side: THREE.DoubleSide })); const wp = new THREE.Group(); wp.position.set(sd * .08, .05, -.1); w.position.x = sd * .28; w.scale.y = .6; wp.add(w); g.add(wp); R.spin.push(wp); wp.userData.side = sd; } put(g, Cy(.3, .3, .03, tm, 20), 0, -.42, 0); R.wings = 1; }
  if (k === 'turret') { put(g, Cy(.55, .65, .45, wood2, 8), 0, .22, 0); put(g, Cy(.5, .5, .06, tm, 8), 0, .47, 0); const h = new THREE.Group(); h.position.y = .75; g.add(h); put(h, B(.18, .18, 1.1, wood), 0, 0, .1); const arm = new THREE.Mesh(new THREE.TorusGeometry(.55, .04, 6, 16, Math.PI * .8), wood); arm.rotation.set(Math.PI / 2, 0, Math.PI * .1); put(h, arm, 0, 0, .25); put(h, B(.04, .04, .9, steel), 0, .08, .25); put(h, B(.3, .3, .25, iron), 0, -.05, -.4); R.head = h; }
  if (k === 'titan') { R = Object.assign(R, hero(g, { tm, helm: 'crown', cape: 1, s: 1.45, body: steel })); const sw = put(R.arms[1], B(.08, 1.1, .14, steel), 0, -.75, .35); sw.rotation.x = 1.35; put(R.arms[1], B(.32, .06, .08, gold), 0, -.48, .1); const sh = put(R.arms[0], B(.06, .62, .45, tm), -.12, -.42, .12); put(sh, B(.07, .2, .2, gold), -.01, 0, 0); R.weapon = R.arms[1]; }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; }); return R; }
function towerModel(core, team) { const g = new THREE.Group(); const tm = teamM[team], gl = glowM[team]; const s = core ? 1.35 : 1; const st = std('#b8b0a2', { roughness: .85 }), st2 = std('#9a9284', { roughness: .9 });
  put(g, Cy(1.35 * s, 1.5 * s, .45, st2, 10), 0, .22, 0); const body = put(g, Cy(1.05 * s, 1.2 * s, 1.9 * s, st, 12), 0, 1.35 * s, 0);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + (r % 2) * .3; put(g, B(.5 * s, .22 * s, .08, r % 2 ? st2 : st), Math.cos(a) * 1.11 * s, .6 * s + r * .42 * s, Math.sin(a) * 1.11 * s).rotation.y = -a + Math.PI / 2; }
  put(g, Cy(1.22 * s, 1.22 * s, .22, st2, 12), 0, 2.35 * s, 0); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; put(g, B(.34 * s, .32 * s, .3 * s, st), Math.cos(a) * 1.08 * s, 2.6 * s, Math.sin(a) * 1.08 * s).rotation.y = -a; }
  put(g, B(.5 * s, .8 * s, .1, wood2), 0, .62 * s, 1.17 * s); for (const sd of [-1, 1]) { const bn = put(g, B(.45 * s, .9 * s, .03, tm), sd * .75 * s, 1.55 * s, .9 * s); bn.rotation.y = sd * -.6; put(bn, Co(.1 * s, .2 * s, gold, 4), 0, -.5 * s, 0).rotation.x = Math.PI; }
  const head = new THREE.Group(); head.position.y = 2.55 * s; g.add(head); put(head, Cy(.35 * s, .45 * s, .3, wood2, 10), 0, 0, 0); put(head, B(.16 * s, .16 * s, 1.0 * s, wood), 0, .25, .25 * s); const bow = new THREE.Mesh(new THREE.TorusGeometry(.5 * s, .05, 6, 16, Math.PI * .8), wood); bow.rotation.set(Math.PI / 2, 0, Math.PI * .1); put(head, bow, 0, .25, .45 * s);
  const fp = put(g, Cy(.03, .03, 1.6 * s, wood, 6), 0, 3.4 * s, -.6 * s); const flag = put(fp, B(.7 * s, .42 * s, .03, tm), .37 * s, .55 * s, 0); const orb = put(head, Sp(.12 * s, gl), 0, .55, 0);
  if (core) { put(g, Co(1.0 * s, 1.0 * s, tm, 12), 0, 3.55 * s, .0).position.y = 3.25 * s; put(g, Cy(.12, .12, .5, gold, 8), 0, 3.95 * s, 0); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; put(g, Co(.07, .22, gold, 4), Math.cos(a) * .22, 4.3 * s, Math.sin(a) * .22); } }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return { g, head, orb, flag }; }

/* ================= ARENA ================= */
const world = new THREE.Group(); scene.add(world);
const hemi = new THREE.HemisphereLight('#e8f4ff', '#4a5a3a', .85); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e0', 2.4); sun.position.set(-8, 26, 12); sun.castShadow = renderer.shadowMap.enabled; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 20, bottom: -20, near: 2, far: 70 }); sun.shadow.bias = -.0005; scene.add(sun);
let rivM = null, rivT = null;
function floorTex(a) { const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d'); const r = rng(7);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? a.g1 : a.g2; x.fillRect(i * 64, j * 64, 64, 64); }
  for (let k = 0; k < 2600; k++) { const px = r() * 512, py = r() * 512; x.fillStyle = r() < .5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)'; x.fillRect(px, py, a.snow ? 3 : 2, a.snow ? 3 : 5); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(HX * 2 / 4, HZ * 2 / 4); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function tree(a, x, z, s) { const g = new THREE.Group(); g.position.set(x, 0, z); put(g, Cy(.12 * s, .18 * s, 1 * s, M(a.trunk), 7), 0, .5 * s, 0); const lm = M(a.tree); for (let i = 0; i < 3; i++) put(g, Co((1 - i * .25) * s, 1.1 * s, lm, 8), 0, (1.2 + i * .6) * s, 0); if (a.snow) put(g, Co(.4 * s, .5 * s, M('#ffffff'), 8), 0, 2.75 * s, 0); g.traverse(m => { if (m.isMesh) m.castShadow = true; }); world.add(g); }
function buildArena(ai) { const a = ARENAS[ai]; world.clear(); scene.background = C(a.bg); scene.fog = new THREE.Fog(a.fog, 45, 95); hemi.intensity = .85 * a.light; sun.intensity = 2.4 * a.light; sun.color.set(a.lava ? '#ffb07a' : '#fff4e0');
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2).rotateX(-Math.PI / 2), std('#fff', { map: floorTex(a), roughness: .95 })); fl.receiveShadow = true; world.add(fl);
  // dirt paths: tower → bridge on each lane, plus the king's path
  const pm = std(a.path, { roughness: 1 }); for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, HZ * 2 - 6).rotateX(-Math.PI / 2), pm); p.position.set(s * BX, .008, 0); p.receiveShadow = true; world.add(p); }
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(BX * 2 + 1.5, 1.3).rotateX(-Math.PI / 2), pm); p.position.set(0, .009, s * 12.4); p.receiveShadow = true; world.add(p); }
  // river with banks
  const rc = document.createElement('canvas'); rc.width = 128; rc.height = 128; const rx = rc.getContext('2d'); rx.fillStyle = '#fff'; rx.fillRect(0, 0, 128, 128); rx.strokeStyle = 'rgba(0,0,0,.18)'; rx.lineWidth = 3; for (let i = 0; i < 8; i++) { rx.beginPath(); for (let x = 0; x <= 128; x += 8) rx.lineTo(x, i * 16 + Math.sin(x / 20 + i) * 4); rx.stroke(); } rivT = new THREE.CanvasTexture(rc); rivT.wrapS = rivT.wrapT = THREE.RepeatWrapping; rivT.repeat.set(6, 1);
  const pit = new THREE.Mesh(new THREE.BoxGeometry(HX * 2, .6, RIV * 2), std(a.lava ? '#2a0a04' : '#1a3a5a')); pit.position.y = -.31; world.add(pit);
  rivM = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, RIV * 2).rotateX(-Math.PI / 2), a.lava ? new THREE.MeshBasicMaterial({ color: C(a.riv).multiplyScalar(1.5), map: rivT }) : std(a.riv, { map: rivT, roughness: .15, metalness: .1, transparent: true, opacity: .92 })); rivM.position.y = .02; rivM.renderOrder = 1; world.add(rivM);
  const bk = std(a.stone, { roughness: .9 }); for (const s of [-1, 1]) { const b = put(world, B(HX * 2, .25, .3, bk), 0, .02, s * (RIV + .05)); b.receiveShadow = true; }
  for (const s of [-1, 1]) { const br = new THREE.Group(); br.position.set(s * BX, 0, 0); for (let i = 0; i < 8; i++) put(br, B(2.4, .14, .36, i % 2 ? wood : wood2), 0, .1, -RIV - .3 + i * (RIV * 2 + .6) / 7.5); for (const q of [-1, 1]) { put(br, B(.12, .12, RIV * 2 + .9, wood2), q * 1.2, .55, 0); for (const e of [-1, 0, 1]) put(br, B(.14, .5, .14, wood2), q * 1.2, .3, e * (RIV + .3)); } br.traverse(m => { if (m.isMesh) { m.receiveShadow = true; m.castShadow = true; } }); world.add(br); }
  // low stone walls
  const wm = std(a.stone, { roughness: .9 }); for (const s of [-1, 1]) { put(world, B(.6, .8, HZ * 2 + 1.2, wm), s * (HX + .3), .4, 0); put(world, B(HX * 2 + 1.2, .8, .6, wm), 0, .4, s * (HZ + .3)); for (let i = -HZ; i <= HZ; i += 2) put(world, B(.7, .3, .5, wm), s * (HX + .3), .95, i); }
  // scenery outside the field
  const r = rng(ai + 3); for (let k = 0; k < 70; k++) { const s = r() < .5 ? -1 : 1; const x = s * (HX + 1.6 + r() * 12), z = -HZ - 6 + r() * (HZ * 2 + 12); if (r() < .72) tree(a, x, z, .8 + r() * .7); else { const rk = put(world, new THREE.Mesh(new THREE.DodecahedronGeometry(.5 + r() * .8, 0), wm), x, .2, z); rk.rotation.set(r() * 3, r() * 3, 0); rk.castShadow = true; } }
  for (let k = 0; k < 24; k++) { const x = rnd(-HX - 14, HX + 14), z = (r() < .5 ? -1 : 1) * (HZ + 1.5 + r() * 6); tree(a, x, z, .8 + r() * .6); }
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(140, 140).rotateX(-Math.PI / 2), std(a.g2, { roughness: 1 })); gr.position.y = -.02; gr.receiveShadow = true; world.add(gr);
  if (a.lava) for (let k = 0; k < 40; k++) { const e = Sp(.05 + Math.random() * .06, new THREE.MeshBasicMaterial({ color: '#ff8a3a' }), 4, 3); e.position.set(rnd(-HX, HX), rnd(.5, 6), rnd(-1.5, 1.5)); world.add(e); } }

/* ================= ENTITIES ================= */
let units = [], towers = [], shots = [], G = null, state = 'title', last = performance.now(), sel = [null, null];
const barG = new THREE.PlaneGeometry(1, .12); const barBg = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .6, depthTest: false }); const barM = TEAMC.map(c => new THREE.MeshBasicMaterial({ color: c, depthTest: false }));
function hpBar(o, w, y) { const g = new THREE.Group(); const bg = new THREE.Mesh(barG, barBg); bg.scale.x = w; bg.renderOrder = 10; const fg = new THREE.Mesh(barG, barM[o.team]); fg.scale.x = w; fg.position.z = .001; fg.renderOrder = 11; g.add(bg, fg); g.position.y = y; o.obj.add(g); o.bar = { g, fg, w }; g.visible = false; }
function mkTower(team, x, z, core) { const m = towerModel(core, team); m.g.position.set(x, 0, z); scene.add(m.g); const t = { team, x, z, core, hp: core ? 3000 : 1500, max: core ? 3000 : 1500, dmg: core ? 110 : 90, rate: .8, range: core ? 7.6 : 7.2, cd: 0, r: core ? 1.6 : 1.25, obj: m.g, m, build: 1, tower: 1, dead: 0, active: !core };
  hpBar(t, core ? 2.4 : 1.9, core ? 5.4 : 3.6); t.bar.g.visible = true; towers.push(t); return t; }
function spawn(k, team, x, z) { const D = CARDS[k]; const n = D.n2 || 1; const mu = team === 0 || G.mode === '2p' ? mult(k) : cpuMult(); const out = [];
  for (let i = 0; i < n; i++) { const R = model(k, team); const ox = n > 1 ? Math.cos(i / n * TAU) * .6 : 0, oz = n > 1 ? Math.sin(i / n * TAU) * .6 : 0; const u = { k, D, team, x: clamp(x + ox, -HX + .5, HX - .5), z: z + oz, y: D.fly ? 2 : 0, hp: D.hp * mu, max: D.hp * mu, dmg: D.dmg * mu, cd: .6 + Math.random() * .3, tgt: null, think: 0, stun: 0, dead: 0, R, obj: R.g, born: 0, life: D.life || 0, ph: Math.random() * 6, face: team === 0 ? Math.PI : 0, fly: !!D.fly, build: !!D.build, r: D.size * 1.3 };
    R.g.position.set(u.x, u.y, u.z); R.g.rotation.y = u.face; R.g.scale.setScalar(.01); scene.add(R.g); hpBar(u, Math.max(.7, D.size * 1.3), (k === 'titan' ? 2.4 : k === 'tank' ? 1.5 : D.fly ? .6 : 1.3) / (1)); units.push(u); out.push(u); }
  for (let q = 0; q < 16; q++) FX.emit(V3(x + rnd(-.6, .6), .2, z + rnd(-.6, .6)), V3(rnd(-1, 1), rnd(1, 3), rnd(-1, 1)), team ? [2.4, .6, .6] : [.6, 1.4, 2.6], .12, .6, 3);
  A.tone(team ? 300 : 420, .12, 'square', .04); A.tone(team ? 600 : 840, .14, 'triangle', .04, .06); return out; }
const cpuMult = () => ({ easy: .8, normal: .95, hard: 1.08 })[S.diff] + arenaOf(S.tro) * .03;
const alive = () => units.filter(u => !u.dead);
function enemiesOf(team) { return [...units.filter(u => !u.dead && u.team !== team), ...towers.filter(t => !t.dead && t.team !== team)]; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function laneTarget(u) { const ts = towers.filter(t => !t.dead && t.team !== u.team); const side = u.x < 0 ? -1 : 1; const st = ts.find(t => !t.core && Math.sign(t.x) === side); return st || ts.find(t => t.core) || ts[0]; }
function pickTarget(u) { const D = u.D; if (D.hit === 'heal') { let best = null, bd = 1e9; for (const o of units) if (!o.dead && o.team === u.team && o !== u && o.hp < o.max) { const d = dist(u, o); if (d < bd) { bd = d; best = o; } } return best || units.find(o => !o.dead && o.team === u.team && o !== u && !o.build) || null; }
  if (D.hit === 'build') return laneTarget(u);
  let best = null, bd = 1e9; for (const o of enemiesOf(u.team)) { if (o.fly && !D.air && !o.tower) continue; const d = dist(u, o) - (o.r || .4); if (o.tower ? d < Math.max(D.range + .5, 2.5) || false : d < (D.aggro || 5) && d < bd) { if (d < bd) { bd = d; best = o; } } }
  if (!best && u.build) { for (const o of enemiesOf(u.team)) { if (o.tower) continue; if (o.fly && !D.air) continue; const d = dist(u, o); if (d < D.range && d < bd) { bd = d; best = o; } } return best; }
  return best || laneTarget(u); }
function damage(o, v, src) { if (o.dead) return; o.hp -= v; if (o.bar) o.bar.g.visible = true; o.hitT = .12;
  if (o.hp <= 0) { o.dead = 1; o.hp = 0; boomFX(V3(o.x, (o.y || 0) + .6, o.z), o.tower ? 3 : o.k === 'tank' || o.k === 'titan' ? 1.8 : 1, o.team);
    if (o.tower) { G.crowns[1 - o.team] += o.core ? 3 : 1; if (o.core) G.crowns[1 - o.team] = 3; updTop(); bigText(o.core ? '💥 ' + T('הטירה נפלה!', 'CASTLE DESTROYED!') : '👑 ' + T('מגדל נפל!', 'Tower down!'), '', 1600); shake = 1; buzz([60, 40, 60]); const core = towers.find(t => t.core && t.team === o.team); if (core) core.active = true; o.m.g.visible = false; const ruin = new THREE.Group(); const rm = std('#9a9284', { roughness: .95 }); put(ruin, Cy(1.2, 1.45, .5, rm, 10), 0, .25, 0); for (let i = 0; i < 9; i++) { const rk = put(ruin, new THREE.Mesh(new THREE.DodecahedronGeometry(.25 + Math.random() * .25, 0), rm), rnd(-1, 1), .6, rnd(-1, 1)); rk.rotation.set(Math.random() * 3, Math.random() * 3, 0); } ruin.position.set(o.x, 0, o.z); scene.add(ruin); G.ruins.push(ruin); if (o.core) endMatch(); }
    else { scene.remove(o.obj); } } }
function boomFX(p, s, team) { for (let i = 0; i < 30 * s; i++) FX.emit(p, V3(rnd(-1, 1), rnd(.5, 2), rnd(-1, 1)).multiplyScalar(4 * s), [[3, 1.6, .4], [3, 2.6, 1], [2, .8, .2]][i % 3], .14 * s, .7, 6); for (let i = 0; i < 10 * s; i++) SM.emit(p, V3(rnd(-1, 1), rnd(.5, 1.5), rnd(-1, 1)), [.25, .25, .3], .5 * s, 1.4, -1, .5);
  A.noise(.5 * s, 'lowpass', 500, 1, .18 * Math.min(1.5, s)); A.tone(80, .4, 'sine', .14, 0, 40); }
function beam(a, b, col, w = .06, life = .1) { const d = b.clone().sub(a); const L = d.length(); const m = new THREE.Mesh(new THREE.CylinderGeometry(w, w, L, 6), new THREE.MeshBasicMaterial({ color: C(col).multiplyScalar(2.4), transparent: true })); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); scene.add(m); shots.push({ m, life, max: life }); }
const flights = [];
const arrowG = new THREE.CylinderGeometry(.018, .018, .7, 5).rotateX(Math.PI / 2), tipG = new THREE.ConeGeometry(.04, .12, 5).rotateX(Math.PI / 2), boltG = new THREE.CylinderGeometry(.035, .035, .9, 6).rotateX(Math.PI / 2), fireG = new THREE.SphereGeometry(.16, 10, 8);
const fireM = new THREE.MeshBasicMaterial({ color: '#ffb23a' }), shaftM = M('#c8a070');
function fly(from, to, kind, team) { const g = new THREE.Group(); if (kind === 'fire') { g.add(new THREE.Mesh(fireG, fireM)); } else { const sh = new THREE.Mesh(kind === 'bolt' ? boltG : arrowG, shaftM); g.add(sh); const tp = new THREE.Mesh(tipG, steel); tp.position.z = kind === 'bolt' ? .5 : .38; g.add(tp); const f = new THREE.Mesh(new THREE.BoxGeometry(.1, .02, .14), teamM[team]); f.position.z = -.3; g.add(f); }
  g.position.copy(from); scene.add(g); const d = from.distanceTo(to); flights.push({ g, from: from.clone(), to: to.clone(), t: 0, dur: Math.max(.1, d / (kind === 'fire' ? 11 : 20)), arc: Math.min(1.2, d * .08), kind }); }
function attack(u, o) { const D = u.D; const from = V3(u.x, (u.y || 0) + (u.tower ? (u.core ? 3.4 : 2.6) : D.size * 1.4 + .3), u.z), to = V3(o.x, (o.y || 0) + (o.tower ? 2 : .6), o.z);
  if (u.tower) { fly(from, to, 'bolt', u.team); damage(o, u.dmg, u); A.noise(.07, 'bandpass', 1400, 1, .05); A.tone(u.team ? 260 : 320, .06, 'triangle', .03, 0, 120); return; }
  if (D.hit === 'heal') { beam(from, to, '#3aff7a', .05, .2); o.hp = Math.min(o.max, o.hp + D.heal * mult(u.k)); for (let i = 0; i < 4; i++) FX.emit(to, V3(rnd(-.5, .5), 1.5, rnd(-.5, .5)), [.4, 2.6, .8], .1, .6, 0); return; }
  if (D.boom) { damage(u, 99999); aoe(u.x, u.z, D.boom, u.dmg, u.team, false); boomFX(V3(u.x, .6, u.z), 1.6, u.team); shake = Math.max(shake, .6); return; }
  if (D.proj === 'arrow') { fly(from, to, 'arrow', u.team); u.atk = .3; A.noise(.06, 'highpass', 2600, 1, .04); }
  else if (D.proj === 'bolt') { fly(from, to, 'bolt', u.team); u.atk = .3; A.noise(.12, 'bandpass', 900, 1, .07); A.tone(160, .12, 'triangle', .04, 0, 90); }
  else if (D.proj === 'fire') { fly(from, to, 'fire', u.team); A.noise(.1, 'lowpass', 1200, 1, .04); }
  else { u.atk = .32; A.noise(.08, 'lowpass', 700, 1, .1); for (let i = 0; i < 6; i++) FX.emit(to, V3(rnd(-2, 2), rnd(1, 3), rnd(-2, 2)), [3, 2.2, 1], .07, .3, 6); u.punch = .2; }
  if (D.splash) { aoe(o.x, o.z, D.splash, u.dmg, u.team, true); shake = Math.max(shake, .35); } else damage(o, u.dmg, u);
  for (let i = 0; i < 5; i++) FX.emit(to, V3(rnd(-2, 2), rnd(.5, 2.5), rnd(-2, 2)), [3, 2.4, 1.2], .06, .25, 4); }
function aoe(x, z, r, dmg, team, ground, stun = 0, towerMul = .4) { for (const o of enemiesOf(team)) { const d = Math.hypot(o.x - x, o.z - z) - (o.r || .3) * .5; if (d < r) { if (stun && !o.tower) o.stun = Math.max(o.stun, stun); damage(o, o.tower ? dmg * towerMul : dmg); } } }

/* ================= SPELLS ================= */
const pend = [];
function castSpell(k, team, x, z) { const D = CARDS[k]; const mu = team === 0 || G.mode === '2p' ? mult(k) : cpuMult();
  if (k === 'rocket') { const m = new THREE.Group(); const rock = put(m, new THREE.Mesh(new THREE.DodecahedronGeometry(.7, 0), std('#5a3a2a', { emissive: C('#ff4a0a'), emissiveIntensity: .9, roughness: .8 })), 0, 0, 0); m.userData.rock = rock; put(m, Sp(.95, new THREE.MeshBasicMaterial({ color: '#ff9a2a', transparent: true, opacity: .35 })), 0, 0, 0);
    m.position.set(x + (team ? 5 : -5), 22, z + (team ? -7 : 7)); scene.add(m); pend.push({ t: .95, m, from: m.position.clone(), to: V3(x, .3, z), dur: .95, fire: 1, cb: () => { aoe(x, z, D.rad, D.dmg * mu, team, true); boomFX(V3(x, .5, z), 2.2, team); shake = .8; } }); A.noise(1, 'lowpass', 600, 1, .1, 0, 200); }
  if (k === 'emp') { aoe(x, z, D.rad, D.dmg * mu, team, true, D.stun, 1); const pts = []; let px = x, pz = z; for (let i = 0; i <= 10; i++) { pts.push(V3(px, 14 - i * 1.4, pz)); px += rnd(-.6, .6); pz += rnd(-.6, .6); } pts[10].set(x, 0, z);
    const bolt = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, .09, 5), new THREE.MeshBasicMaterial({ color: '#e6f4ff', transparent: true })); scene.add(bolt); shots.push({ m: bolt, life: .35, max: .35 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(.2, .5, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#bfe4ff', transparent: true, side: THREE.DoubleSide })); ring.position.set(x, .3, z); scene.add(ring); pend.push({ t: .5, dur: .5, ring, r: D.rad }); for (let i = 0; i < 40; i++) FX.emit(V3(x, .5, z), V3(rnd(-1, 1), rnd(0, .5), rnd(-1, 1)).normalize().multiplyScalar(7), [2.4, 2.6, 3], .08, .4, 0); A.noise(.6, 'highpass', 1500, 1, .14); A.tone(90, .5, 'sawtooth', .06, 0, 40); shake = Math.max(shake, .4); } }

/* ================= MATCH ================= */
const P = [0, 1].map(() => ({ en: 5, deck: [], hand: [], next: null }));
function newDeck(team) { let d = team === 1 && G.mode === 'cpu' ? [...BASE, ...['medic', 'turret', 'titan'].filter(k => S.tro >= CARDS[k].unlock - 100)] : [...BASE, ...['medic', 'turret', 'titan'].filter(unlocked)]; d = d.sort(() => Math.random() - .5); return d; }
function drawCard(p) { const k = p.deck.shift(); p.deck.push(k); return k; }
let shake = 0;
function start() { A.ac(); clearMatch(); const ai = arenaOf(S.tro); buildArena(ai); G = { mode: S.mode, t: 180, over: 0, crowns: [0, 0], ot: 0, ruins: [], cpuT: 2, x2: false };
  for (const [team, s] of [[0, 1], [1, -1]]) { mkTower(team, -BX, s * 11, 0); mkTower(team, BX, s * 11, 0); mkTower(team, 0, s * 14, 1); }
  for (const t of [0, 1]) { const p = P[t]; p.en = 5; p.deck = newDeck(t); p.hand = [drawCard(p), drawCard(p), drawCard(p), drawCard(p)]; p.next = drawCard(p); } sel = [null, null];
  $('title').hidden = true; $('endS').hidden = true; $('top').hidden = false; $('quit').hidden = false; $('h0').hidden = false; $('h1').hidden = G.mode !== '2p'; renderHands(); updTop(); fit(); state = 'play';
  A.startMusic({ chords: [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 43, 47]], bpm: 128, kick: true, lead: true, vol: .45 }); bigText('⚔️ ' + T('קרב!', 'FIGHT!'), ARENAS[ai].n, 1500);
  if (!S.tut) { S.tut = 1; S.save(); setTimeout(() => tip(T('גררו קלף לחצי שלכם כדי לשלוח לוחם! המטרה: להפיל את המגדלים האדומים 👑', 'Drag a card onto your half to send a warrior! Goal: knock down the red towers 👑')), 1600); } }
function clearMatch() { for (const u of units) scene.remove(u.obj); for (const t of towers) scene.remove(t.obj); for (const s of shots) scene.remove(s.m); for (const p of pend) { p.m && scene.remove(p.m); p.ring && scene.remove(p.ring); } if (G) for (const r of G.ruins) scene.remove(r); units = []; towers = []; shots = []; pend.length = 0; for (const f of flights) scene.remove(f.g); flights.length = 0; }
function endMatch() { if (G.over) return; G.over = 1; state = 'end'; const c = G.crowns; const w = c[0] > c[1] ? 0 : c[1] > c[0] ? 1 : -1; A.stopMusic();
  setTimeout(() => { let msg = ''; if (G.mode === 'cpu') { const dt = w === 0 ? 30 : w === 1 ? -15 : 5; const gears = w === 0 ? 40 + c[0] * 10 : w < 0 ? 20 : 10; const before = arenaOf(S.tro); S.tro = Math.max(0, S.tro + dt); S.gears += gears; if (w === 0) S.wins++; S.save(); G.reward = makeReward(w, c); const after = arenaOf(S.tro);
      msg = `🏆 ${dt >= 0 ? '+' : ''}${dt} · 🪙 +${gears}` + (after > before ? `<br>🎉 ${T('זירה חדשה נפתחה:', 'New arena unlocked:')} ${ARENAS[after].ic} ${ARENAS[after].n}!` : '');
      const nu = ['medic', 'turret', 'titan'].find(k => CARDS[k].unlock > S.tro - dt && CARDS[k].unlock <= S.tro); if (nu) msg += `<br>🆕 ${T('קלף חדש:', 'New card:')} ${CARDS[nu].n}!`; }
    $('eT').textContent = w < 0 ? T('🤝 תיקו!', '🤝 Draw!') : G.mode === 'cpu' ? (w === 0 ? T('🏆 ניצחון!', '🏆 Victory!') : T('😬 הפסד', '😬 Defeat')) : (w === 0 ? T('🔵 הכחולים ניצחו!', '🔵 Blue wins!') : T('🔴 האדומים ניצחו!', '🔴 Red wins!'));
    $('eC').innerHTML = `<span style="color:#5ab8ff">${'👑'.repeat(c[0]) || '–'}</span> : <span style="color:#ff6a7a">${'👑'.repeat(c[1]) || '–'}</span>`; $('eP').innerHTML = msg; const ec = $('eChest'); ec.hidden = !G.reward; if (G.reward) ec.textContent = '🎁 ' + T('פתחו את התיבה!', 'Open the chest!'); $('endS').hidden = false; $('h0').hidden = $('h1').hidden = true;
    if (w === 0 || G.mode === '2p') { for (let i = 0; i < 6; i++) setTimeout(() => FX.burst(V3(rnd(-5, 5), 4, rnd(-8, 8)), 40, CONFETTI, 6, .14, 1.6, 6), i * 200); A.voice('yay', 1.2); } else A.voice('aww', 1); }, 1500); }
/* ================= CHESTS ================= */
function makeReward(w, c) { const kind = w === 0 ? (c[0] >= 3 ? 'gold' : 'silver') : 'wood'; const nS = kind === 'gold' ? 4 : kind === 'silver' ? 3 : 2;
  const pool = Object.keys(CARDS).filter(unlocked); const out = [];
  for (let i = 0; i < nS; i++) { let k, tr = 0; do { k = pool[Math.floor(Math.random() * pool.length)]; } while (out.some(o => o[0] === k) && tr++ < 30);
    const b = [[3, 7], [2, 4], [1, 2]][rarity(k)]; let n = b[0] + Math.floor(Math.random() * (b[1] - b[0] + 1)); if (kind === 'gold') n = Math.ceil(n * 1.6); if (kind === 'wood') n = Math.max(1, Math.ceil(n * .7));
    const before = copies(k); S.cards[k] = before + n; out.push([k, n, before]); }
  const coins = kind === 'gold' ? 60 : kind === 'silver' ? 35 : 15; S.gears += coins; S.save(); return { kind, stacks: out, coins }; }
function openChest(R) { const sc = $('chestS'); sc.hidden = false; const KN = { wood: T('תיבת עץ', 'Wooden Chest'), silver: T('תיבת כסף', 'Silver Chest'), gold: T('תיבת זהב!', 'Golden Chest!') };
  $('chT').textContent = KN[R.kind]; $('chBox').innerHTML = `<div class="chest ${R.kind}"><div class="base"></div><div class="lid"></div><div class="lock"></div></div>`; $('chH').textContent = T('👆 הקישו כדי לפתוח', '👆 Tap to open');
  let step = -1, busy = false; A.tone(520, .12, 'triangle', .05);
  sc.onclick = () => { if (busy) return; A.ac();
    if (step === -1) { busy = true; const ch = sc.querySelector('.chest'); ch.classList.add('shake'); A.noise(.6, 'lowpass', 500, 1, .08); setTimeout(() => { ch.classList.remove('shake'); ch.classList.add('open'); A.tone(660, .15, 'triangle', .07); A.tone(880, .15, 'triangle', .07, .1); A.tone(1320, .3, 'triangle', .06, .2); buzz(40); busy = false; step = 0; setTimeout(() => sc.onclick(), 650); }, 750); return; }
    if (step < R.stacks.length) { const [k, n, before] = R.stacks[step]; const D = CARDS[k], L = lvl(k), need = NEED[L] || 1, after = before + n;
      $('chT').textContent = D.n; $('chBox').innerHTML = `<div class="rw r${rarity(k)}">${ICON[k] ? `<img src="${ICON[k]}">` : `<span class="ic">${SPELLIC[k]}</span>`}<span class="cnt">×${n}</span><b>L${L}</b></div><div class="rwbar"><em style="width:${Math.min(100, before / need * 100)}%"></em><u>${before}/${need}</u></div>`;
      setTimeout(() => { const bar = sc.querySelector('.rwbar'); if (!bar) return; bar.querySelector('em').style.width = Math.min(100, after / need * 100) + '%'; bar.querySelector('u').textContent = L >= MAXL ? 'MAX' : after + '/' + need; if (after >= need && L < MAXL) { bar.classList.add('full'); bar.querySelector('u').textContent += ' ⬆'; A.tone(1046, .25, 'triangle', .06); } }, 350);
      A.tone(700 + rarity(k) * 200, .12, 'square', .04); A.tone(1050 + rarity(k) * 200, .16, 'triangle', .05, .08); $('chH').textContent = (step + 1) + '/' + R.stacks.length + ' · ' + T('👆 הבא', '👆 Next'); step++; return; }
    if (step === R.stacks.length) { $('chT').textContent = T('מטבעות!', 'Coins!'); $('chBox').innerHTML = `<div class="rw"><span class="ic">🪙</span><span class="cnt">+${R.coins}</span></div>`; $('chH').textContent = T('👆 סיום', '👆 Done'); A.tone(1318, .2, 'triangle', .06); A.tone(1568, .3, 'triangle', .05, .1); step++; return; }
    sc.hidden = true; sc.onclick = null; $('eChest').hidden = true; G.reward = null; }; }
$('eChest').onclick = () => { if (G && G.reward) openChest(G.reward); };
function updTop() { $('cr0').textContent = '👑 ' + G.crowns[0]; $('cr1').textContent = G.crowns[1] + ' 👑'; const t = Math.max(0, Math.ceil(G.t)); $('tm').textContent = (G.ot ? '⏱️ ' : '') + Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); $('tm').classList.toggle('x2', G.x2); }
let bigT = 0; function bigText(a, b, ms = 1800) { const el = $('big'); el.innerHTML = a + (b ? `<small>${b}</small>` : ''); el.className = ''; void el.offsetWidth; el.className = 'on'; clearTimeout(bigT); bigT = setTimeout(() => el.className = '', ms); }
let tipT = 0; function tip(s) { $('tip').textContent = s; clearTimeout(tipT); tipT = setTimeout(() => $('tip').textContent = '', 5000); }

/* ================= HAND UI ================= */
const ICON = {}; const SPELLIC = { rocket: '☄️', emp: '🌩️' };
function cardHTML(k, i, p, nx) { const D = CARDS[k]; const poor = !nx && p.en < D.cost; return `<div class="cd${nx ? ' nx' : ''}${poor ? ' poor' : ''}${!nx && sel[P.indexOf(p)] === i ? ' sel' : ''}" data-i="${nx ? '' : i}">${ICON[k] ? `<img src="${ICON[k]}">` : `<span class="ic">${SPELLIC[k] || '⚔️'}</span>`}<i>${D.cost}</i><b>${D.n}</b>${P.indexOf(p) === 0 || G && G.mode === '2p' ? `<span class="lv">L${lvl(k)}</span>` : ''}</div>`; }
function renderHands() { for (const t of [0, 1]) { const p = P[t]; $('cards' + t).innerHTML = p.hand.map((k, i) => cardHTML(k, i, p)).join('') + cardHTML(p.next, -1, p, 1); } updEnergy(); }
function updEnergy() { for (const t of [0, 1]) { const p = P[t]; const el = $('en' + t); el.querySelector('i').style.width = (p.en / 10 * 100) + '%'; el.querySelector('span').textContent = '⚡ ' + Math.floor(p.en); if (!el.querySelector('.tk')) for (let k = 1; k < 10; k++) { const d = document.createElement('b'); d.className = 'tk'; d.style.left = k * 10 + '%'; el.appendChild(d); }
    $('cards' + t).querySelectorAll('.cd[data-i]').forEach(c => { const i = c.dataset.i; if (i === '') return; c.classList.toggle('poor', p.en < CARDS[p.hand[+i]].cost); }); } }
function play(team, i, x, z) { const p = P[team]; const k = p.hand[i]; const D = CARDS[k]; if (p.en < D.cost) { if (team === 0 || G.mode === '2p') toast(T('אין מספיק אנרגיה ⚡', 'Not enough energy ⚡'), 900); return false; }
  const own = team === 0 ? z > RIV + .4 : z < -RIV - .4; if (!D.spell && !own) return false; x = clamp(x, -HX + .6, HX - .6); z = clamp(z, -HZ + 1, HZ - 1);
  p.en -= D.cost; p.hand[i] = p.next; p.next = drawCard(p); if (D.spell) castSpell(k, team, x, z); else spawn(k, team, x, z); sel[team] = null; renderHands(); return true; }
// drag from cards
const ray = new THREE.Raycaster(), nd = new THREE.Vector2(), plane = new THREE.Plane(V3(0, 1, 0), 0);
function fieldAt(cx, cy) { nd.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(nd, camera); const p = V3(); return ray.ray.intersectPlane(plane, p) ? p : null; }
let drag = null;
for (const t of [0, 1]) { $('cards' + t).addEventListener('pointerdown', e => { const c = e.target.closest('.cd[data-i]'); if (!c || c.dataset.i === '' || state !== 'play') return; A.ac(); const i = +c.dataset.i; sel[t] = sel[t] === i ? null : i; drag = { t, i, id: e.pointerId, moved: false }; renderHands(); e.preventDefault(); }); }
addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; drag.moved = true; const g = $('ghost'); const k = P[drag.t].hand[drag.i]; g.hidden = false; g.style.left = e.clientX + 'px'; g.style.top = e.clientY + 'px'; g.textContent = SPELLIC[k] || '⚔️'; const f = fieldAt(e.clientX, e.clientY); const ok = f && (CARDS[k].spell || (drag.t === 0 ? f.z > RIV + .4 : f.z < -RIV - .4)); g.classList.toggle('bad', !ok); });
addEventListener('pointerup', e => { if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null; $('ghost').hidden = true; if (!d.moved) return; const f = fieldAt(e.clientX, e.clientY); if (f && Math.abs(f.x) < HX && Math.abs(f.z) < HZ) play(d.t, d.i, f.x, f.z); });
$('stage').addEventListener('pointerdown', e => { if (state !== 'play') return; const f = fieldAt(e.clientX, e.clientY); if (!f) return; const team = G.mode === '2p' && f.z < 0 && sel[1] != null ? 1 : sel[0] != null ? 0 : sel[1] != null ? 1 : -1; if (team < 0) { tip(T('בחרו קלף למטה ואז הקישו על המגרש 👇', 'Pick a card below, then tap the field 👇')); return; } if (!play(team, sel[team], f.x, f.z) && !CARDS[P[team].hand[sel[team]]].spell) tip(T('אפשר לשלוח לוחמים רק לחצי שלכם', 'Warriors can only be sent to your half')); });

/* ================= CPU ================= */
function cpu(dt) { const p = P[1]; G.cpuT -= dt; if (G.cpuT > 0) return; const L = ({ easy: [2.7, .4], normal: [2.0, .6], hard: [1.2, .95] })[S.diff]; G.cpuT = L[0] * rnd(.7, 1.3);
  const threats = units.filter(u => !u.dead && u.team === 0 && u.z < 4); const cards = p.hand.map((k, i) => [k, i]).filter(([k]) => CARDS[k].cost <= p.en);
  if (!cards.length) return;
  if (threats.length && Math.random() < L[1]) { const t = threats.sort((a, b) => a.z - b.z)[0]; const grp = threats.filter(u => dist(u, t) < 2.6).length;
    const spell = cards.find(([k]) => k === 'rocket' && grp >= 2) || cards.find(([k]) => k === 'emp' && grp >= 2); if (spell) { play(1, spell[1], t.x, t.z + 1); return; }
    const def = cards.filter(([k]) => !CARDS[k].spell && CARDS[k].hit !== 'build').sort((a, b) => (t.fly && !CARDS[b[0]].air ? -1 : 0) || CARDS[b[0]].cost - CARDS[a[0]].cost)[0]; if (def) { play(1, def[1], clamp(t.x + rnd(-1, 1), -HX + 1, HX - 1), Math.min(-RIV - 1, t.z - 3)); return; } }
  if (p.en >= 7 || G.t < 60 && p.en >= 4 || Math.random() < .25) { const att = cards.filter(([k]) => !CARDS[k].spell).sort(() => Math.random() - .5)[0]; if (att) { const lane = Math.random() < .5 ? -BX : BX; const weak = towers.filter(t => !t.dead && t.team === 0 && !t.core).sort((a, b) => a.hp - b.hp)[0]; const x = weak ? weak.x : lane; play(1, att[1], x + rnd(-1, 1), CARDS[att[0]].hit === 'build' ? -RIV - 1.2 : rnd(-12, -6)); } } }

/* ================= LOOP ================= */
function step(dt) { if (!G || G.over) return; G.t -= dt; const was = G.x2; G.x2 = G.t < 60; if (G.x2 && !was) { bigText('⚡ ' + T('אנרגיה כפולה!', 'DOUBLE ENERGY!'), '', 1500); A.tone(880, .3, 'square', .05); }
  if (G.t <= 0) { if (!G.ot && G.crowns[0] === G.crowns[1]) { G.ot = 1; G.t = 60; bigText('⏱️ ' + T('הארכה!', 'OVERTIME!'), T('הכתר הבא מנצח', 'Next crown wins'), 1600); } else { G.t = 0; updTop(); endMatch(); return; } }
  if (G.ot && G.crowns[0] !== G.crowns[1]) { endMatch(); return; }
  if (Math.floor(G.t * 2) !== Math.floor((G.t + dt) * 2)) updTop();
  const rate = (G.x2 ? 2 : 1) / 2.3; for (const t of [0, 1]) P[t].en = Math.min(10, P[t].en + dt * rate * (t === 1 && G.mode === 'cpu' ? ({ easy: .8, normal: .92, hard: 1 })[S.diff] : 1)); updEnergyThrottled(dt);
  if (G.mode === 'cpu') cpu(dt);
  for (const u of units) { if (u.dead) continue; const D = u.D; u.born += dt; const s = Math.min(1, u.born * 4) * US; u.R.g.scale.setScalar(s);
    if (u.life) { u.life -= dt; u.hp -= u.max / D.life * dt; if (u.hp <= 0) { damage(u, 1); continue; } }
    if (u.stun > 0) { u.stun -= dt; if (Math.random() < .3) FX.emit(V3(u.x, (u.y || 0) + 1, u.z), V3(rnd(-1, 1), 1, rnd(-1, 1)), [1, 2, 3], .06, .3, 0); continue; }
    u.think -= dt; if (u.think <= 0 || !u.tgt || u.tgt.dead) { u.think = .35; u.tgt = pickTarget(u); }
    const o = u.tgt; u.cd -= dt; if (!o) continue; const d = dist(u, o) - (o.r || .3) - u.r * .5;
    if (d <= D.range) { const ang = Math.atan2(o.x - u.x, o.z - u.z); u.face = ang; if (u.cd <= 0) { u.cd = D.rate; attack(u, o); } u.moving = false; }
    else if (!u.build) { let tx = o.x, tz = o.z; if (!u.fly) { const myS = Math.sign(u.z) || (u.team ? -1 : 1), oS = Math.sign(o.z) || myS; const inMid = Math.abs(u.z) < RIV + .6; const bx = Math.abs(u.x - BX) < Math.abs(u.x + BX) ? BX : -BX; const onBridge = inMid && Math.abs(u.x - bx) < 1.1;
        if (myS !== oS || inMid) { if (!onBridge && !inMid) { tx = bx; tz = myS * (RIV + .5); } else { tx = bx; tz = oS * (RIV + 1.0); } } }
      const dx = tx - u.x, dz = tz - u.z, dl = Math.hypot(dx, dz) || 1; const sp = D.spd * dt; u.x += dx / dl * sp; u.z += dz / dl * sp; u.face = Math.atan2(dx, dz); u.moving = true; } }
  // separation
  const al = alive(); for (let i = 0; i < al.length; i++) for (let j = i + 1; j < al.length; j++) { const a = al[i], b = al[j]; if (a.fly !== b.fly || a.build || b.build) continue; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = (a.r + b.r) * .6; if (d < m && d > .001) { const p = (m - d) / 2 / d; a.x -= dx * p; a.z -= dz * p; b.x += dx * p; b.z += dz * p; } }
  for (const u of al) { u.x = clamp(u.x, -HX + .4, HX - .4); u.z = clamp(u.z, -HZ + .4, HZ - .4); if (!u.fly && !u.build && Math.abs(u.z) < RIV && Math.abs(Math.abs(u.x) - BX) > 1.25) u.z = Math.sign(u.z || 1) * RIV; }
  for (const t of towers) { if (t.dead) continue; if (!t.active) { if (t.hp < t.max) t.active = true; else continue; } t.cd -= dt; let best = null, bd = 1e9; for (const o of units) if (!o.dead && o.team !== t.team) { const d = dist(t, o); if (d < t.range && d < bd) { bd = d; best = o; } } if (best) { t.m.head.rotation.y = lerp(t.m.head.rotation.y, Math.atan2(best.x - t.x, best.z - t.z), Math.min(1, dt * 10)); if (t.cd <= 0) { t.cd = t.rate; attack(t, best); } } }
  units = units.filter(u => !u.dead || (scene.remove(u.obj), false)); }
let enT = 0; function updEnergyThrottled(dt) { enT -= dt; if (enT <= 0) { enT = .1; updEnergy(); } }
function animate(dt, t) { for (const u of units) { const R = u.R; R.g.position.set(u.x, u.fly ? 2 + Math.sin(t * 3 + u.ph) * .15 : 0, u.z); const yaw = u.face; let dyaw = yaw - R.g.rotation.y; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw)); R.g.rotation.y += dyaw * Math.min(1, dt * 10);
    const w = u.moving && !u.stun ? Math.sin(t * 12 * (u.D.spd || 1) / 2 + u.ph) : 0; R.legs.forEach((l, i) => l.rotation.x = (i ? w : -w) * .6); if (R.arms) R.arms.forEach((a, i) => a.rotation.x = (i ? -w : w) * .45); if (R.wings) R.spin.forEach(s => s.rotation.y = s.userData.side * Math.sin(t * 28 + u.ph) * .7); if (u.atk > 0) { u.atk -= dt; const sw = Math.sin((1 - u.atk / .32) * Math.PI); if (R.weapon) R.weapon.rotation.x = -1.8 * sw; } if (R.fuse) R.fuse.visible = Math.sin(t * 20) > 0;
    if (u.punch > 0) { u.punch -= dt; R.g.position.x += Math.sin(u.face) * u.punch; R.g.position.z += Math.cos(u.face) * u.punch; }
    if (u.bar) { u.bar.fg.scale.x = u.bar.w * Math.max(0, u.hp / u.max); u.bar.fg.position.x = -u.bar.w * (1 - u.hp / u.max) / 2; u.bar.g.quaternion.copy(camera.quaternion).premultiply(R.g.quaternion.clone().invert()); } }
  for (const tw of towers) { if (tw.dead) continue; tw.bar.fg.scale.x = tw.bar.w * tw.hp / tw.max; tw.bar.fg.position.x = -tw.bar.w * (1 - tw.hp / tw.max) / 2; tw.bar.g.quaternion.copy(camera.quaternion); tw.m.orb.scale.setScalar(1 + Math.sin(t * 3 + tw.x) * .08); if (!tw.active && tw.core) tw.m.orb.material = glowM[tw.team]; }
  for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; s.life -= dt; s.m.material.opacity = Math.max(0, s.life / s.max); if (s.life <= 0) { scene.remove(s.m); s.m.geometry.dispose(); shots.splice(i, 1); } }
  for (let i = pend.length - 1; i >= 0; i--) { const q = pend[i]; q.t -= dt; const k = 1 - Math.max(0, q.t) / q.dur; if (q.m) { q.m.position.lerpVectors(q.from, q.to, k * k); if (q.m.userData.rock) q.m.userData.rock.rotation.x += dt * 6; SM.emit(q.m.position, V3(0, .5, 0), [.5, .45, .42], .5, .8, -1, .4); FX.emit(q.m.position, V3(rnd(-1, 1), rnd(0, 1), rnd(-1, 1)), [3, 1.4, .3], .14, .35, 0); }
    if (q.ring) { q.ring.scale.setScalar(1 + k * q.r * 2); q.ring.material.opacity = 1 - k; }
    if (q.t <= 0) { if (q.m) scene.remove(q.m); if (q.ring) scene.remove(q.ring); q.cb && q.cb(); pend.splice(i, 1); } }
  if (rivT) rivT.offset.x -= dt * .25; for (let i = flights.length - 1; i >= 0; i--) { const f = flights[i]; f.t += dt; const k = Math.min(1, f.t / f.dur); const p = V3().lerpVectors(f.from, f.to, k); p.y += Math.sin(k * Math.PI) * f.arc; f.g.lookAt(p); f.g.position.copy(p); if (f.kind === 'fire') FX.emit(p, V3(0, .3, 0), [3, 1.6, .4], .1, .25, 0); if (k >= 1) { scene.remove(f.g); flights.splice(i, 1); } }
  for (const tw of towers) if (tw.m.flag) tw.m.flag.rotation.y = Math.sin(t * 2.4 + tw.x) * .25; }
let camBase = V3(), camLook = V3();
function fit() { const port = innerHeight > innerWidth, asp = innerWidth / innerHeight; const two = G && G.mode === '2p' && state !== 'title';
  if (two) { camera.fov = 50; camera.position.set(0, 44 / Math.min(1, asp * 1.9), .01); camLook.set(0, 0, 0); }
  else if (port) { camera.fov = 46; const need = (HX + 1.2) / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * asp); camera.position.set(0, need * .86, need * .52 + 4); camLook.set(0, 0, 2.2); }
  else { camera.fov = 40; camera.position.set(0, 30, 18); camLook.set(0, 0, 1); }
  camBase.copy(camera.position); camera.lookAt(camLook); camera.updateProjectionMatrix(); }
E.onResize.push(() => fit());
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; A.tick(); const t = now / 1000;
  if (state === 'play') step(dt); if (state === 'title') { titleSpin += dt * .15; camera.position.set(Math.sin(titleSpin) * 26, 20, Math.cos(titleSpin) * 26); camera.lookAt(0, 0, 0); demo(dt); }
  else { camera.position.copy(camBase); if (shake > 0) { shake = Math.max(0, shake - dt * 2); camera.position.add(V3(rnd(-1, 1), 0, rnd(-1, 1)).multiplyScalar(shake * .35)); } camera.lookAt(camLook); }
  animate(dt, t); FX.update(dt, -1); SM.update(dt, -1); E.render(); }
let titleSpin = 0, demoT = 0; function demo(dt) { demoT -= dt; if (demoT <= 0 && G) { demoT = 2.2; const ks = ['scout', 'blaster', 'tank', 'drones', 'sniper', 'boom']; spawn(ks[Math.floor(Math.random() * ks.length)], Math.random() < .5 ? 0 : 1, rnd(-6, 6), 0); } if (G && G.demo) { stepDemo(dt); } }
function stepDemo(dt) { for (const u of units) { if (u.dead) continue; u.born += dt; u.R.g.scale.setScalar(Math.min(1, u.born * 4) * US); u.z += (u.team ? 1 : -1) * u.D.spd * dt * .5; u.face = u.team ? 0 : Math.PI; u.moving = true; if (Math.abs(u.z) > 13) { u.dead = 1; boomFX(V3(u.x, .5, u.z), .6, u.team); } } units = units.filter(u => !u.dead || (scene.remove(u.obj), false)); }

/* ================= ICONS ================= */
function makeIcons() { const r2 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r2.setSize(160, 160); r2.outputColorSpace = THREE.SRGBColorSpace; r2.toneMapping = THREE.ACESFilmicToneMapping; const sc = new THREE.Scene(); sc.environment = scene.environment; sc.add(new THREE.HemisphereLight('#fff', '#556', 1.6)); const dl = new THREE.DirectionalLight('#fff', 2.5); dl.position.set(2, 4, 3); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 50); for (const k of Object.keys(CARDS)) { if (CARDS[k].spell) continue; const R = model(k, 0); const g = R.g; g.rotation.y = .6; sc.add(g); const bb = new THREE.Box3().setFromObject(g); const c = bb.getCenter(V3()), s = bb.getSize(V3()); const m = Math.max(s.x, s.y, s.z); cam.position.set(c.x, c.y + m * .5, c.z + m * 2.3); cam.lookAt(c); r2.render(sc, cam); ICON[k] = r2.domElement.toDataURL(); sc.remove(g); } r2.dispose(); }

/* ================= TITLE ================= */
function renderTitle() { const ai = arenaOf(S.tro), a = ARENAS[ai]; $('arIc').textContent = a.ic; $('arN').textContent = a.n; const nx = ARENAS[ai + 1]; $('arS').textContent = nx ? T(`הזירה הבאה ב־🏆 ${nx.t}`, `Next arena at 🏆 ${nx.t}`) : T('הזירה האחרונה!', 'Final arena!'); $('troT').textContent = '🏆 ' + S.tro; $('gearT').textContent = '🪙 ' + S.gears;
  document.querySelectorAll('#modeSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === S.mode)); document.querySelectorAll('#diffSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.d === S.diff)); $('diffSeg').hidden = S.mode !== 'cpu';
  $('deck').innerHTML = Object.keys(CARDS).map(k => { const D = CARDS[k], ul = unlocked(k), L = lvl(k), need = NEED[L] || 0, c = copies(k), pct = L >= MAXL ? 100 : Math.min(100, c / need * 100); return `<div class="cd r${rarity(k)}${ul ? '' : ' lock'}${canUp(k) ? ' canup' : ''}" data-k="${k}">${ICON[k] ? `<img src="${ICON[k]}">` : `<span class="ic">${SPELLIC[k]}</span>`}<i>${D.cost}</i>${ul ? `<span class="lv">L${L}</span><span class="pr"><em style="width:${pct}%"></em><u>${L >= MAXL ? 'MAX' : c + '/' + need}</u></span>` : ''}<b>${ul ? D.n : '🔒 🏆' + D.unlock}</b></div>`; }).join('');
  $('sndChip').textContent = S.mute ? T('🔇 צלילים', '🔇 Sound') : T('🔊 צלילים', '🔊 Sound'); }
$('deck').onclick = e => { const c = e.target.closest('[data-k]'); if (!c) return; A.ac(); const k = c.dataset.k, D = CARDS[k]; if (!unlocked(k)) { toast(T(`נפתח ב־🏆 ${D.unlock}`, `Unlocks at 🏆 ${D.unlock}`)); return; } const L = lvl(k);
  if (L >= MAXL) { toast(D.n + ' – ' + D.d + ' · ' + T('רמה מקסימלית!', 'Max level!')); return; }
  if (copies(k) < NEED[L]) { toast(`${D.n}: ${D.d} · ${T('צריך עוד קלפים – זוכים בהם בתיבות!', 'Need more cards – win them in chests!')} (${copies(k)}/${NEED[L]})`, 2600); return; }
  if (S.gears < COINC[L]) { toast(`${D.n} · ${T('צריך', 'Need')} 🪙${COINC[L]}`, 2200); return; }
  S.cards[k] = copies(k) - NEED[L]; S.gears -= COINC[L]; S.lv[k] = L + 1; S.save(); A.tone(660, .1, 'triangle', .07); A.tone(990, .2, 'triangle', .07, .1); A.tone(1320, .3, 'triangle', .06, .2); toast(`⬆ ${D.n} ${T('שודרג לרמה', 'upgraded to level')} ${L + 1}! 💪`); renderTitle(); };
$('modeSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.mode = b.dataset.m; S.save(); renderTitle(); }; $('diffSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.diff = b.dataset.d; S.save(); renderTitle(); };
$('sndChip').onclick = () => { A.setMute(!S.mute); S.save(); renderTitle(); };
function showTitle() { state = 'title'; clearMatch(); G = { demo: 1, mode: 'cpu', crowns: [0, 0], ruins: [] }; buildArena(arenaOf(S.tro)); for (const [team, s] of [[0, 1], [1, -1]]) { mkTower(team, -BX, s * 11, 0); mkTower(team, BX, s * 11, 0); mkTower(team, 0, s * 14, 1); } towers.forEach(t => t.bar.g.visible = false);
  $('title').hidden = false; $('top').hidden = true; $('quit').hidden = true; $('h0').hidden = $('h1').hidden = true; $('endS').hidden = true; A.stopMusic(); renderTitle(); fit(); }
$('goBtn').onclick = () => start(); $('eAgain').onclick = () => start(); $('eMenu').onclick = () => showTitle(); $('quit').onclick = () => { A.ac(); showTitle(); };
$('goBtn').textContent = T('⚔️ לקרב!', '⚔️ Battle!'); $('eMenu').textContent = T('☰ תפריט', '☰ Menu'); $('eAgain').textContent = T('🔁 שוב', '🔁 Again'); $('deckT').textContent = T('🃏 הקלפים שלי – אספו קלפים בתיבות ושדרגו!', '🃏 My cards – collect cards from chests and upgrade!');
const mb = document.querySelectorAll('#modeSeg button'); mb[0].textContent = T('🏰 נגד המחשב', '🏰 vs CPU'); mb[1].textContent = T('👥 2 שחקנים', '👥 2 players'); const db = document.querySelectorAll('#diffSeg button'); db[0].textContent = T('😊 קל', '😊 Easy'); db[1].textContent = T('🙂 רגיל', '🙂 Normal'); db[2].textContent = T('🔥 קשה', '🔥 Hard');
$('quit').innerHTML = ICO.home('#fff'); $('homeT').innerHTML = ICO.home('#fff'); hubButtons(['homeT'], A); qualityButton('qBtn', S);
document.addEventListener('visibilitychange', () => { if (document.hidden) A.stopMusic(); });
if (EN) { document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr'; }
E.resize(); try { makeIcons(); } catch (e) { } showTitle(); setTimeout(() => { $('loading').hidden = true; requestAnimationFrame(frame); window.__roboOK = true; }, 30);
window.__rb = { camBase, camLook, get G() { return G; }, P, get units() { return units; }, towers: () => towers, play, start, S, step, spawn };
