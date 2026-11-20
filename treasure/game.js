import { $, clamp, lerp, rng, T, EN, store, audio, toast, ICO, hubButtons, soundButton, starsHTML } from '../lib/kit.js';
import { drawPiece, drawCat, drawBox, drawSpecial, COLORS, TAU, GRAINC, drawPip, drawChest } from './art.js';

const S = store('treasure-save', { stars: {}, best: {}, tut: 0 });
const A = audio(S);
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const wait = ms => new Promise(r => setTimeout(r, ms / (window.__fast || 1)));

/* ================= LEVELS ================= */
const NL = 36;
const SHAPES = {
  rect: () => true,
  notch: (r, c, R, C) => !((r < 2 || r > R - 3) && (c < 1 || c > C - 2)),
  cross: (r, c, R, C) => !((r < 3 || r > R - 4) && (c < 2 || c > C - 3)),
  diamond: (r, c, R, C) => Math.abs(r - (R - 1) / 2) / (R / 2) + Math.abs(c - (C - 1) / 2) / (C / 2) <= 1.25,
  hole: (r, c, R, C) => !((r === 4 || r === 3) && (c === 3 || c === 4)),
  hour: (r, c, R, C) => { const m = Math.abs(r - (R - 1) / 2); return Math.abs(c - (C - 1) / 2) <= 1.5 + m * .75; },
};
function levelDef(L) { if (L % 3 === 0) return rescueDef(L); return normalDef(L); }
function rescueDef(L) { const k = Math.floor(L / 3); const tpl = ['left', 'right', 'center', 'both'][k % 4]; const tR = Math.min(5, 3 + Math.floor(k / 3)), hS = 10 - tR; return { L, rescue: 1, tpl, hS, types: L < 6 ? 5 : 6, moves: Math.round(16 + tR * 3 - Math.min(5, k * .35)), goal: 'sand', target: 1500 + L * 300, collect: null, nori: 0, boxes: L > 14 ? 3 : 0, seed: 91 + L * 7, shape: 'rect' }; }
function normalDef(L) { const r = rng(4242 + L * 131); const types = L < 6 ? 5 : 6; const kinds = ['score', 'collect', 'nori', 'score', 'box', 'collect', 'nori', 'mix']; const k = L === 0 ? 'score' : L === 1 ? 'collect' : L === 2 ? 'nori' : L === 4 ? 'box' : kinds[L % kinds.length];
  const shape = L < 3 ? 'rect' : ['rect', 'notch', 'diamond', 'cross', 'hole', 'hour', 'rect'][L % 7]; const moves = Math.round(24 - Math.min(8, L * .3) + (k === 'nori' ? 4 : 0) + (k === 'mix' ? 8 : 0));
  const d = { L, types, shape, moves, goal: k, target: Math.round((2200 + L * 420) / 100) * 100, collect: null, nori: 0, boxes: 0, seed: 77 + L * 13 };
  if (k === 'collect' || k === 'mix') { const a = Math.floor(r() * types), b = (a + 1 + Math.floor(r() * (types - 1))) % types; d.collect = L < 8 ? [[a, 14 + L * 2]] : [[a, Math.round(12 + L * .7)], [b, Math.round(10 + L * .55)]]; }
  if (k === 'nori' || k === 'mix') d.nori = Math.min(1 + Math.floor(L / 10), 2);
  if (k === 'box' || (L > 12 && L % 3 === 0)) d.boxes = Math.min(14, 6 + Math.floor(L / 3));
  return d; }

/* ================= STATE ================= */
let ROWS = 9; const COLS = 8; let RUB = [], SAND = null, SAND0 = 1, drained = 0, sandMoving = 0, hero = null, winning = false; let G = [], MASK = [], NORI = [], LD = null, moves = 0, score = 0, need = {}, busy = false, state = 'map', combo = 0, uid = 1, typesN = 6, lastMove = 0, hintMove = null, partyMode = false;
const cv = $('cv'), cx = cv.getContext('2d'); let VW = 0, VH = 0, dpr = 1, cs = 40, bx = 0, by = 0, topH = 120;
const isN = p => p && p.t >= 0 && p.t !== 9;
const mk = (t, r, c, sp = null) => ({ id: uid++, t, sp, x: c, y: r, vy: 0, sc: 1, rot: 0, gone: false, hp: t === 9 ? 1 : 0, sq: 0 });
function inB(r, c) { return r >= 0 && c >= 0 && r < ROWS && c < COLS && MASK[r][c]; }
function startLevel(L) { LD = levelDef(L); typesN = LD.types; const f = SHAPES[LD.shape]; const r = rng(LD.seed); MASK = []; NORI = []; G = []; ROWS = LD.rescue ? 10 : 9; RUB = new Array(COLS).fill(false); const TPL = LD.rescue ? tplGrid(LD) : null;
  for (let i = 0; i < ROWS; i++) { MASK.push([]); NORI.push([]); G.push([]); for (let j = 0; j < COLS; j++) { MASK[i][j] = TPL ? TPL[i][j] !== 'X' : f(i, j, ROWS, COLS); NORI[i][j] = 0; G[i][j] = null; if (TPL && TPL[i][j] === 'S') RUB[j] = true; } }
  if (LD.nori) { const r0 = LD.L < 10 ? ROWS - 4 : LD.L < 20 ? 3 : 1; for (let i = r0; i < ROWS; i++) for (let j = 0; j < COLS; j++) if (MASK[i][j] && ((i + j) % 2 === 0 || LD.L > 22)) NORI[i][j] = LD.L > 14 && r() < .35 ? 2 : 1; }
  for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) if (MASK[i][j] && !(TPL && TPL[i][j] === 'S')) { let t; do { t = Math.floor(r() * typesN); } while ((j > 1 && G[i][j - 1] && G[i][j - 2] && G[i][j - 1].t === t && G[i][j - 2].t === t) || (i > 1 && G[i - 1][j] && G[i - 2][j] && G[i - 1][j].t === t && G[i - 2][j].t === t)); G[i][j] = mk(t, i, j); G[i][j].y = i - ROWS - 1 - (ROWS - i) * .2; }
  if (LD.boxes) { let n = LD.boxes; for (let k = 0; k < 200 && n > 0; k++) { const i = 3 + Math.floor(r() * (ROWS - 3)), j = Math.floor(r() * COLS); if (MASK[i][j] && G[i][j].t !== 9) { G[i][j].t = 9; G[i][j].hp = LD.L > 16 && r() < .5 ? 2 : 1; n--; } } }
  need = {}; if (LD.collect) LD.collect.forEach(([t, n]) => need['t' + t] = n); if (LD.nori) need.nori = NORI.flat().reduce((a, b) => a + b, 0); if (LD.boxes) need.box = G.flat().filter(p => p && p.t === 9).reduce((a, p) => a + p.hp, 0);
  initSand(TPL, r); winning = false; if (LD.rescue && LD.L < 7) { const hc = Math.floor(hero.fx / K); const rr = ROWS - 1; if (G[rr][hc]) { G[rr][hc].sp = 'v'; } } moves = LD.moves; score = 0; combo = 0; busy = false; partyMode = false; state = 'play'; hintMove = null; lastMove = performance.now(); fx.length = 0; floats.length = 0;
  $('map').hidden = true; $('hud').hidden = false; $('endSheet').hidden = true; layout(); updHud(); ensureMoves();
  A.startMusic({ chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], bpm: 104, lead: true, vol: .45 });
  const g = LD.goal; toast(g === 'sand' ? T('פיפ לכוד! נקו את אבני החן שמתחת לחצץ כדי שיישפך החוצה 🪨', 'Pip is trapped! Clear the gems under the rubble so it pours away 🪨') : g === 'score' ? T(`הגיעו ל־${LD.target} נקודות!`, `Reach ${LD.target} points!`) : g === 'nori' ? T('נקו את כל אריחי הטחב! 🌿', 'Clear all the moss tiles! 🌿') : g === 'box' ? T('שברו את כל אבני המקדש! 🧱', 'Break all the temple stones! 🧱') : T('אספו את אבני החן שבמשימה! 💎', 'Collect the gems in your goal! 💎'), 2200);
  if (!S.tut) { S.tut = 1; S.save(); setTimeout(() => toast(T('החליקו אבן חן כדי ליצור 3 זהות. 4 בשורה = חיצים ↔️ · צורת L = פצצה 💣 · 5 בשורה = כדור הקשת 🌈', 'Swipe gems to line up 3. 4 = arrows ↔️ · L-shape = bomb 💣 · 5 = Rainbow Orb 🌈'), 6500), 2400); } }

/* ================= MATCHING ================= */
function findRuns() { const runs = []; for (let r = 0; r < ROWS; r++) { let c = 0; while (c < COLS) { const p = G[r][c]; if (!isN(p)) { c++; continue; } let e = c + 1; while (e < COLS && isN(G[r][e]) && G[r][e].t === p.t) e++; if (e - c >= 3) runs.push({ dir: 'h', t: p.t, cells: Array.from({ length: e - c }, (_, k) => [r, c + k]) }); c = e; } }
  for (let c = 0; c < COLS; c++) { let r = 0; while (r < ROWS) { const p = G[r][c]; if (!isN(p)) { r++; continue; } let e = r + 1; while (e < ROWS && isN(G[e][c]) && G[e][c].t === p.t) e++; if (e - r >= 3) runs.push({ dir: 'v', t: p.t, cells: Array.from({ length: e - r }, (_, k) => [r + k, c]) }); r = e; } } return runs; }
const key = (r, c) => r * 16 + c;
function planSpecials(runs, pivots) { const made = new Map(), inH = new Map(), inV = new Map(); runs.forEach((run, i) => run.cells.forEach(([r, c]) => (run.dir === 'h' ? inH : inV).set(key(r, c), i)));
  const pv = run => { if (pivots) for (const [r, c] of pivots) if (run.cells.some(q => q[0] === r && q[1] === c)) return [r, c]; return run.cells[Math.floor(run.cells.length / 2)]; };
  runs.forEach(run => { if (run.cells.length >= 5) { const [r, c] = pv(run); made.set(key(r, c), { r, c, sp: 'c', t: -1 }); } });
  for (const [k, i] of inH) if (inV.has(k)) { const r = Math.floor(k / 16), c = k % 16; if (![...made.values()].some(m => runs[i].cells.some(q => q[0] === m.r && q[1] === m.c))) made.set(k, { r, c, sp: 'b', t: runs[i].t }); }
  runs.forEach(run => { if (run.cells.length === 4 && !run.cells.some(([r, c]) => [...made.values()].some(m => m.r === r && m.c === c) || (run.dir === 'h' ? inV : inH).has(key(r, c)))) { const [r, c] = pv(run); made.set(key(r, c), { r, c, sp: run.dir === 'h' ? 'v' : 'h', t: run.t }); } });
  return [...made.values()]; }
function mostType() { const n = {}; for (const row of G) for (const p of row) if (isN(p) && !p.sp) n[p.t] = (n[p.t] || 0) + 1; let b = 0, bk = 0; for (const k in n) if (n[k] > b) { b = n[k]; bk = +k; } return bk; }
function expand(set, triggered, from) { const q = [...set]; while (q.length) { const k = q.shift(); const r = Math.floor(k / 16), c = k % 16, p = G[r] && G[r][c]; if (!p || !p.sp || triggered.has(p.id)) continue; triggered.add(p.id); const add = (rr, cc) => { if (inB(rr, cc)) { const kk = key(rr, cc); if (!set.has(kk)) { set.add(kk); q.push(kk); } } };
    if (p.sp === 'h') { for (let j = 0; j < COLS; j++) add(r, j); beam(r, c, 'h'); A.noise(.3, 'bandpass', 2600, 2, .06, 0, 600); }
    else if (p.sp === 'v') { for (let i = 0; i < ROWS; i++) add(i, c); beam(r, c, 'v'); A.noise(.3, 'bandpass', 2600, 2, .06, 0, 600); }
    else if (p.sp === 'b') { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) add(r + i, c + j); ring(r, c, 1.6); A.noise(.45, 'lowpass', 500, 1, .3); A.tone(80, .3, 'sine', .2, 0, 40); shake = .25; }
    else if (p.sp === 'c') { const t = from != null ? from : mostType(); for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) if (isN(G[i][j]) && G[i][j].t === t) { add(i, j); zap(r, c, i, j); } A.tone(1200, .5, 'sine', .06, 0, 2400); } } return set; }
function hitBoxesNear(cells, set) { const hb = new Set(); for (const k of cells) { const r = Math.floor(k / 16), c = k % 16; for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = r + dr, cc = c + dc; if (inB(rr, cc) && G[rr][cc] && G[rr][cc].t === 9 && !set.has(key(rr, cc))) hb.add(key(rr, cc)); } } return hb; }
async function clearSet(set, made = [], pts = 60) { const triggered = new Set(); expand(set, triggered); const boxes = hitBoxesNear(set, set); for (const k of boxes) set.add(k);
  const madeK = new Set(made.map(m => key(m.r, m.c))); let n = 0;
  for (const k of set) { const r = Math.floor(k / 16), c = k % 16; if (!inB(r, c)) continue; const p = G[r][c]; if (NORI[r][c] > 0 && (!p || p.t !== 9)) { NORI[r][c]--; if (need.nori) need.nori--; puff(r, c, '#3a6a3a', 6); }
    if (!p) continue; if (p.t === 9) { p.hp--; if (need.box > 0) need.box--; p.sq = 1; puff(r, c, '#c8904a', 10); A.noise(.15, 'lowpass', 900, 1, .15); if (p.hp > 0) continue; }
    if (madeK.has(k) && !(p.sp && triggered.has(p.id) && false)) { continue; }
    if (need['t' + p.t] > 0) { need['t' + p.t]--; } p.gone = true; G[r][c] = null; n++; popFx(p, r, c); }
  for (const m of made) { const p = G[m.r][m.c]; if (p) { p.sp = m.sp; if (m.sp === 'c') p.t = -1; p.sc = 1.5; puff(m.r, m.c, '#ffffff', 14); } else { const q = mk(m.t, m.r, m.c, m.sp); q.sc = 1.6; G[m.r][m.c] = q; } A.tone(990, .15, 'triangle', .07); A.tone(1480, .2, 'triangle', .06, .08); }
  const gain = n * pts * Math.max(1, combo); score += gain; if (n) { const cs2 = [...set].map(k => [Math.floor(k / 16), k % 16]); const mr = cs2.reduce((a, b) => a + b[0], 0) / cs2.length, mc = cs2.reduce((a, b) => a + b[1], 0) / cs2.length; floats.push({ x: mc, y: mr, txt: '+' + gain, t: 0, c: '#fff' }); }
  const f = 520 * Math.pow(1.122, Math.min(combo, 12)); A.tone(f, .12, 'sine', .1); A.tone(f * 1.5, .1, 'triangle', .05, .04); updHud(); }
function gravity() { for (let c = 0; c < COLS; c++) { if (RUB[c]) { let ch = true; while (ch) { ch = false; for (let r = ROWS - 2; r >= 0; r--) { const p = G[r][c]; if (!p || p.t === 9 && false) continue; if (MASK[r + 1][c] && !G[r + 1][c] && !sandy(r + 1, c)) { G[r + 1][c] = p; G[r][c] = null; clearGrains(r + 1, c); ch = true; } } } continue; } const rows = []; for (let r = ROWS - 1; r >= 0; r--) if (MASK[r][c]) rows.push(r); const ps = rows.map(r => G[r][c]).filter(Boolean); rows.forEach(r => G[r][c] = null); let k = 0; for (; k < ps.length; k++) { G[rows[k]][c] = ps[k]; }
    let spawn = 0; for (; k < rows.length; k++) { const p = mk(Math.floor(Math.random() * typesN), rows[k], c); spawn++; p.y = Math.min(...rows) - spawn - .3; G[rows[k]][c] = p; } } }
function settled() { for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const p = G[r][c]; if (p && (Math.abs(p.y - r) > .01 || Math.abs(p.x - c) > .01 || p.tw)) return false; } return true; }
const settle = () => new Promise(res => { const chk = () => settled() ? res() : requestAnimationFrame(chk); chk(); });
async function cascade(pivots) { combo = 0; for (let guard = 0; guard < 40; guard++) { const runs = findRuns(); if (!runs.length) break; combo++; const made = planSpecials(runs, pivots); const set = new Set(); runs.forEach(run => run.cells.forEach(([r, c]) => set.add(key(r, c))));
    await clearSet(set, made); if (combo >= 2) comboWord(combo); pivots = null; await wait(200); gravity(); await settle(); await wait(40); } }
function swapAnim(a, b) { const pa = G[a[0]][a[1]], pb = G[b[0]][b[1]]; G[a[0]][a[1]] = pb; G[b[0]][b[1]] = pa; for (const [p, to] of [[pa, b], [pb, a]]) if (p) p.tw = { fx: p.x, fy: p.y, tx: to[1], ty: to[0], t: 0, d: .16 }; }
async function trySwap(a, b) { if (busy || state !== 'play') return; const pa = G[a[0]][a[1]], pb = G[b[0]][b[1]]; if (!pa || !pb || pa.t === 9 || pb.t === 9) return; busy = true; hintMove = null; lastMove = performance.now(); A.noise(.12, 'bandpass', 1800, 1, .05, 0, 600);
  swapAnim(a, b); await settle();
  if (pa.sp && pb.sp || pa.sp === 'c' || pb.sp === 'c') { moves--; updHud(); await comboSwap(pa, pb, a, b); combo = 1; await cascade(); }
  else { const runs = findRuns(); if (!runs.length) { A.tone(220, .15, 'sine', .08, 0, 160); swapAnim(a, b); await settle(); busy = false; return; } moves--; updHud(); await cascade([a, b]); }
  await afterMove(); busy = false; }
async function comboSwap(pa, pb, a, b) { const at = (p) => { for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (G[r][c] === p) return [r, c]; return null; }; const ka = at(pa), kb = at(pb); const set = new Set([key(...ka), key(...kb)]); combo = 1;
  if (pa.sp === 'c' && pb.sp === 'c') { for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (inB(r, c)) { set.add(key(r, c)); } ring(ka[0], ka[1], 6); A.tone(400, .8, 'sawtooth', .06, 0, 2000); shake = .5; pa.sp = pb.sp = null; await clearSet(set, [], 40); }
  else if (pa.sp === 'c' || pb.sp === 'c') { const cat = pa.sp === 'c' ? pa : pb, o = cat === pa ? pb : pa, ck = cat === pa ? ka : kb; const t = o.t; if (o.sp) { const sps = ['h', 'v']; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const p = G[r][c]; if (isN(p) && p.t === t) { p.sp = o.sp === 'b' ? 'b' : sps[Math.floor(Math.random() * 2)]; p.sc = 1.4; zap(ck[0], ck[1], r, c); set.add(key(r, c)); } } A.tone(1400, .6, 'sine', .06, 0, 2800); await wait(450); }
    cat.sp = null; G[ck[0]][ck[1]] = null; cat.gone = true; popFx(cat, ck[0], ck[1]); set.delete(key(...ck)); for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const p = G[r][c]; if (isN(p) && p.t === t) { set.add(key(r, c)); zap(ck[0], ck[1], r, c); } } A.tone(1200, .5, 'sine', .07, 0, 2400); await wait(250); await clearSet(set); }
  else { const s1 = pa.sp, s2 = pb.sp, [r, c] = kb; pa.sp = pb.sp = null;
    if (s1 === 'b' && s2 === 'b') { for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (inB(r + i, c + j)) set.add(key(r + i, c + j)); ring(r, c, 3); shake = .5; A.noise(.7, 'lowpass', 400, 1, .4); }
    else if (s1 === 'b' || s2 === 'b') { for (let k = -1; k <= 1; k++) { for (let j = 0; j < COLS; j++) if (inB(r + k, j)) set.add(key(r + k, j)); for (let i = 0; i < ROWS; i++) if (inB(i, c + k)) set.add(key(i, c + k)); beam(r + k, c, 'h'); beam(r, c + k, 'v'); } shake = .4; }
    else { for (let j = 0; j < COLS; j++) if (inB(r, j)) set.add(key(r, j)); for (let i = 0; i < ROWS; i++) if (inB(i, c)) set.add(key(i, c)); beam(r, c, 'h'); beam(r, c, 'v'); }
    A.noise(.4, 'bandpass', 2400, 2, .08, 0, 500); await clearSet(set); }
  await wait(220); gravity(); await settle(); }
function goalsDone() { if (LD.goal === 'sand' && !(hero && hero.landed)) return false; if (LD.goal === 'score' && score < LD.target) return false; return Object.entries(need).every(([k, v]) => v <= 0); }
async function afterMove() { if (SAND) await rubbleSettle(); updHud(); if (goalsDone()) return finish(); if (moves <= 0) { for (let k = 0; k < 40 && (sandMoving > 0 || !settled()); k++) await wait(100); await rubbleSettle(); if (goalsDone()) return finish(); return lose(); } ensureMoves(); }
async function finish() { if (winning) return; winning = true; busy = true; if (LD.rescue) { bigWord(T('פיפ ניצל! 🎉', 'Pip is saved! 🎉'), '#ffd23a'); A.voice('yay', 1.6); for (let k = 0; k < 30 && hero && !hero.landed; k++) await wait(100); await wait(500); } await party(); win(); }
async function party() { partyMode = true; await wait(300); if (moves > 0) { bigWord(T('מטר אוצרות! 💎', 'Treasure shower! 💎')); await wait(700); }
  while (moves > 0) { const cand = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (isN(G[r][c]) && !G[r][c].sp) cand.push([r, c]); if (!cand.length) break; const [r, c] = cand[Math.floor(Math.random() * cand.length)]; G[r][c].sp = Math.random() < .5 ? 'h' : 'v'; G[r][c].sc = 1.6; moves--; score += 200; updHud(); A.tone(880 + Math.random() * 400, .1, 'triangle', .06); await wait(140); }
  for (let g = 0; g < 12; g++) { const sp = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (G[r][c] && G[r][c].sp) sp.push(key(r, c)); if (!sp.length) break; combo = 1; await clearSet(new Set(sp.slice(0, 3)), [], 80); await wait(200); gravity(); await settle(); await cascade(); } partyMode = false; }
function possibleMoves(first) { const out = []; const test = (a, b) => { const pa = G[a[0]][a[1]], pb = G[b[0]][b[1]]; if (!pa || !pb || pa.t === 9 || pb.t === 9) return false; if ((pa.sp && pb.sp) || pa.sp === 'c' || pb.sp === 'c') return true; G[a[0]][a[1]] = pb; G[b[0]][b[1]] = pa; const ok = findRuns().length > 0; G[a[0]][a[1]] = pa; G[b[0]][b[1]] = pb; return ok; };
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { if (!inB(r, c)) continue; for (const [dr, dc] of [[0, 1], [1, 0]]) { const rr = r + dr, cc = c + dc; if (inB(rr, cc) && test([r, c], [rr, cc])) { out.push([[r, c], [rr, cc]]); if (first) return out; } } } return out; }
function ensureMoves() { let guard = 0; while (!possibleMoves(true).length && guard++ < 50) { const ps = G.flat().filter(p => isN(p) && !p.sp); const ts = ps.map(p => p.t).sort(() => Math.random() - .5); ps.forEach((p, i) => { p.t = ts[i]; p.sc = .3; }); if (guard === 1) toast(T('מערבבים! 🔀', 'Shuffling! 🔀'), 1000); let g2 = 0; while (findRuns().length && g2++ < 40) findRuns().forEach(run => { const [r, c] = run.cells[0]; G[r][c].t = Math.floor(Math.random() * typesN); }); } }

/* ================= FX ================= */
const fx = [], floats = []; let shake = 0;
function popFx(p, r, c) { const col = p.t >= 0 && p.t < 9 ? COLORS[p.t] : '#ffd23a'; for (let i = 0; i < 9; i++) { const a = Math.random() * TAU, v = 2 + Math.random() * 4; fx.push({ k: 'p', x: c + .5, y: r + .5, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: .7, c: i % 3 ? col : '#ffffff', s: .08 + Math.random() * .07, rice: i % 3 === 0 }); } fx.push({ k: 'ghost', p, x: c, y: r, life: .22 }); }
function puff(r, c, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 1 + Math.random() * 3; fx.push({ k: 'p', x: c + .5, y: r + .5, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: .55, c: col, s: .06 + Math.random() * .06 }); } }
function beam(r, c, dir) { fx.push({ k: 'beam', r, c, dir, life: .45 }); }
function ring(r, c, R) { fx.push({ k: 'ring', r, c, R, life: .5 }); }
function zap(r0, c0, r1, c1) { fx.push({ k: 'zap', r0, c0, r1, c1, life: .5 }); }
const WORDS = [[T('יפה!', 'Nice!'), '#ffd23a'], [T('מבריק!', 'Brilliant!'), '#7ad8ff'], [T('מדהים!', 'Amazing!'), '#ff8ac8'], [T('אוצר!', 'Treasure!'), '#9aff7a'], [T('הרפתקן על!', 'Super Explorer!'), '#ffb03a']];
function comboWord(n) { const w = WORDS[Math.min(WORDS.length - 1, n - 2)]; bigWord(w[0], w[1]); if (n >= 3) A.voice('yay', 1 + n * .05); }
function bigWord(s, c = '#ffd23a') { const d = document.createElement('div'); d.className = 'word'; d.textContent = s; d.style.color = c; $('words').innerHTML = ''; $('words').appendChild(d); }

/* ================= RENDER ================= */
const spr = {}; let sprPx = 0;
function sprite(kind) { if (spr[kind]) return spr[kind]; const c = cnv(sprPx, sprPx), x = c.getContext('2d'); x.scale(sprPx / 100, sprPx / 100); if (kind === 'cat') drawCat(x); else if (kind.startsWith('box')) drawBox(x, +kind.slice(3)); else drawPiece(x, +kind); return spr[kind] = c; }
let tileC = null;
function layout() { dpr = Math.min(devicePixelRatio || 1, 2.5); VW = innerWidth; VH = innerHeight; cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr); cv.style.width = VW + 'px'; cv.style.height = VH + 'px'; const land = VW > VH * 1.1; topH = land ? 70 : 132;
  cs = Math.floor(Math.min((VW - 20) / COLS, (VH - topH - 24) / (ROWS + (LD && LD.rescue ? 2.5 : 0)))); bx = Math.round((VW - cs * COLS) / 2); by = Math.round(topH + 6 + (LD && LD.rescue ? cs * 1.2 : 0) + (VH - topH - 12 - cs * (ROWS + (LD && LD.rescue ? 2.5 : 0))) * .3); const px = Math.round(cs * dpr * 1.05); if (px !== sprPx) { sprPx = px; for (const k in spr) delete spr[k]; } buildTiles(); }
function buildTiles() { if (!MASK.length) return; tileC = cnv(Math.round(cs * COLS * dpr) + 20, Math.round(cs * ROWS * dpr) + 20); const x = tileC.getContext('2d'); x.scale(dpr, dpr); x.translate(5, 5);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (MASK[r][c]) { x.fillStyle = 'rgba(60,30,20,.35)'; x.beginPath(); x.roundRect(c * cs - 3, r * cs - 3, cs + 6, cs + 6, cs * .22); x.fill(); }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (MASK[r][c]) { x.fillStyle = RUB[c] ? ((r + c) % 2 ? '#4a4258' : '#544a62') : (r + c) % 2 ? '#f6e6cc' : '#fff2dc'; x.beginPath(); x.roundRect(c * cs + 1, r * cs + 1, cs - 2, cs - 2, cs * .18); x.fill(); } }
function render(now, dt) { const t = now / 1000; cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, VW, VH); if (state === 'map' || !MASK.length) return;
  const sx = (Math.random() - .5) * shake * cs * .3, sy = (Math.random() - .5) * shake * cs * .3; cx.save(); cx.translate(sx, sy); if (tileC) cx.drawImage(tileC, bx - 5, by - 5, tileC.width / dpr, tileC.height / dpr);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (NORI[r][c]) { const x0 = bx + c * cs + 3, y0 = by + r * cs + 3; cx.fillStyle = NORI[r][c] > 1 ? '#2e6a2a' : '#5aa848'; cx.beginPath(); cx.roundRect(x0, y0, cs - 6, cs - 6, cs * .14); cx.fill(); cx.strokeStyle = 'rgba(160,220,140,.35)'; cx.lineWidth = 1.5; cx.stroke(); cx.fillStyle = 'rgba(160,220,140,.14)'; for (let k = 1; k < 4; k++) cx.fillRect(x0 + 2, y0 + k * (cs - 6) / 4, cs - 10, 1.4); }
  if (sel) { cx.strokeStyle = '#fff'; cx.lineWidth = 3; cx.beginPath(); cx.roundRect(bx + sel[1] * cs + 2, by + sel[0] * cs + 2, cs - 4, cs - 4, cs * .2); cx.stroke(); }
  cx.save(); cx.beginPath(); cx.rect(bx - 4, by - 2, cs * COLS + 8, cs * ROWS + 6); cx.clip();
  const hint = hintMove && (now - lastMove > 4500) ? hintMove : null;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const p = G[r][c]; if (!p) continue; drawP(p, t, hint && hint.some(q => q[0] === r && q[1] === c) ? Math.sin(t * 10) * .08 : 0); }
  for (const f of fx) if (f.k === 'ghost') { f.p.sc = Math.max(0, f.life / .22) * 1.2; drawP(f.p, t, 0); }
  drawSand(); cx.restore(); if (LD.rescue) drawPitHero(t, dt);
  for (const f of fx) { const a = Math.max(0, f.life);
    if (f.k === 'p') { cx.globalAlpha = Math.min(1, a * 2); cx.fillStyle = f.c; cx.beginPath(); if (f.rice) cx.ellipse(bx + f.x * cs, by + f.y * cs, f.s * cs, f.s * cs * .55, f.vx, 0, TAU); else cx.arc(bx + f.x * cs, by + f.y * cs, f.s * cs, 0, TAU); cx.fill(); }
    else if (f.k === 'beam') { cx.globalAlpha = a * 2; const g = f.dir === 'h' ? cx.createLinearGradient(0, by + f.r * cs, 0, by + (f.r + 1) * cs) : cx.createLinearGradient(bx + f.c * cs, 0, bx + (f.c + 1) * cs, 0); g.addColorStop(0, 'rgba(255,240,180,0)'); g.addColorStop(.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,240,180,0)'); cx.fillStyle = g; if (f.dir === 'h') cx.fillRect(bx, by + f.r * cs, cs * COLS, cs); else cx.fillRect(bx + f.c * cs, by, cs, cs * ROWS); }
    else if (f.k === 'ring') { cx.globalAlpha = a * 2; cx.strokeStyle = '#fff'; cx.lineWidth = cs * .25 * a * 2; cx.beginPath(); cx.arc(bx + (f.c + .5) * cs, by + (f.r + .5) * cs, cs * f.R * (1.2 - a * 2 + .2), 0, TAU); cx.stroke(); }
    else if (f.k === 'zap') { cx.globalAlpha = a * 2; cx.strokeStyle = '#fff6a0'; cx.lineWidth = 3; cx.shadowColor = '#ffd23a'; cx.shadowBlur = 10; cx.beginPath(); const x0 = bx + (f.c0 + .5) * cs, y0 = by + (f.r0 + .5) * cs, x1 = bx + (f.c1 + .5) * cs, y1 = by + (f.r1 + .5) * cs; cx.moveTo(x0, y0); for (let k = 1; k < 5; k++) cx.lineTo(lerp(x0, x1, k / 5) + (Math.random() - .5) * cs * .4, lerp(y0, y1, k / 5) + (Math.random() - .5) * cs * .4); cx.lineTo(x1, y1); cx.stroke(); cx.shadowBlur = 0; } }
  cx.globalAlpha = 1; for (const f of floats) { cx.globalAlpha = Math.max(0, 1 - f.t / 1.1); cx.font = `900 ${Math.round(cs * .42)}px Rubik, Arial`; cx.textAlign = 'center'; cx.lineWidth = 4; cx.strokeStyle = 'rgba(80,30,10,.8)'; const X = bx + (f.x + .5) * cs, Y = by + (f.y + .5) * cs - f.t * cs * .8; cx.strokeText(f.txt, X, Y); cx.fillStyle = f.c; cx.fillText(f.txt, X, Y); } cx.globalAlpha = 1; cx.restore(); }
function drawP(p, t, wob) { const X = bx + (p.x + .5) * cs, Y = by + (p.y + .5) * cs; if (Y < by - cs * .6) return; const sq = p.sq || 0; const s = cs * 1.02 * (p.sc || 1); cx.save(); cx.translate(X, Y + sq * cs * .08); cx.rotate(wob); cx.scale(1 + sq * .12, 1 - sq * .12);
  if (p.sp === 'c' || p.t === -1) { cx.save(); cx.rotate(t * 1.5); const g = cx.createRadialGradient(0, 0, s * .1, 0, 0, s * .62); g.addColorStop(0, 'rgba(255,240,150,.9)'); g.addColorStop(1, 'rgba(255,120,200,0)'); cx.fillStyle = g; cx.fillRect(-s * .7, -s * .7, s * 1.4, s * 1.4); cx.restore(); cx.drawImage(sprite('cat'), -s / 2, -s / 2, s, s); }
  else if (p.t === 9) cx.drawImage(sprite('box' + p.hp), -s / 2, -s / 2, s, s);
  else { if (p.sp) { cx.shadowColor = 'rgba(255,255,255,.95)'; cx.shadowBlur = cs * .25 * (1 + Math.sin(t * 6) * .3); } cx.drawImage(sprite(String(p.t)), -s / 2, -s / 2, s, s); cx.shadowBlur = 0; if (p.sp) { cx.save(); cx.scale(s / 100, s / 100); cx.translate(-50, -50); drawSpecial(cx, p.sp, t); cx.restore(); } }
  cx.restore(); }
function step(dt) { for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const p = G[r][c]; if (!p) continue;
    if (p.tw) { p.tw.t += dt / p.tw.d; const k = Math.min(1, p.tw.t), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; p.x = lerp(p.tw.fx, p.tw.tx, e); p.y = lerp(p.tw.fy, p.tw.ty, e); if (k >= 1) { p.x = p.tw.tx; p.y = p.tw.ty; p.tw = null; } continue; }
    p.x = c; if (p.y < r) { p.vy = Math.min(22, p.vy + 55 * dt); p.y += p.vy * dt; if (p.y >= r) { p.y = r; if (p.vy > 6) p.sq = .8; p.vy = 0; } } else if (p.y > r) p.y = r;
    if (p.sq > 0) p.sq = Math.max(0, p.sq - dt * 5); if (p.sc !== 1) p.sc = lerp(p.sc, 1, Math.min(1, dt * 10)); }
  for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.life -= dt; if (f.k === 'p') { f.vy += 9 * dt; f.x += f.vx * dt; f.y += f.vy * dt; } if (f.life <= 0) fx.splice(i, 1); }
  for (let i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t > 1.1) floats.splice(i, 1); } shake = Math.max(0, shake - dt * 1.5); }


/* ================= RUBBLE (falling sand) ================= */
const K = 6; let SW = 0, SH = 0, cellSolid = null, frameN = 0, pitG = [], grainSpr = [], grainPx = 0;
function tplGrid(d) { const g = Array.from({ length: 10 }, () => new Array(COLS).fill('.')); const cols = d.tpl === 'left' ? [0, 1, 2] : d.tpl === 'right' ? [5, 6, 7] : d.tpl === 'center' ? [2, 3, 4, 5] : [0, 1, 6, 7];
  for (const c of cols) for (let r = 0; r < 10; r++) g[r][c] = r < d.hS ? 'S' : 'T'; if (d.tpl === 'center') { g[0][1] = g[0][6] = 'X'; }  return g; }
function initSand(TPL, r) { pitG = []; drained = 0; hero = null; if (!TPL) { SAND = null; return; } SW = COLS * K; SH = ROWS * K; SAND = new Uint8Array(SW * SH); cellSolid = new Uint8Array(ROWS * COLS); let n = 0;
  for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) if (TPL[i][j] === 'S') for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) if (r() < .97) { SAND[(i * K + y) * SW + j * K + x] = 1 + Math.floor(r() * GRAINC.length); n++; } SAND0 = n;
  const rc = RUB.map((v, i) => v ? i : -1).filter(i => i >= 0); const mid = LD.tpl === 'both' ? 0.5 : (rc[0] + rc[rc.length - 1] + 1) / 2; hero = { fx: mid * K, y: -1, vy: 0, landed: false, mood: 'help' }; }
function sandy(r, c) { if (!SAND || !RUB[c]) return false; let n = 0; for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) if (SAND[(r * K + y) * SW + c * K + x]) n++; return n > 4; }
function clearGrains(r, c) { if (!SAND) return; for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) { const k = (r * K + y) * SW + c * K + x; if (SAND[k]) { SAND[k] = 0; drained++; } } }
const sandLeft = () => SAND ? Math.max(0, (SAND0 - drained) / SAND0) : 0;
function sandStep() { if (!SAND || state === 'map') return; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cellSolid[r * COLS + c] = !RUB[c] || !MASK[r][c] || (G[r][c] && !G[r][c].gone) ? 1 : 0;
  const free = (x, y) => !SAND[y * SW + x] && !cellSolid[Math.floor(y / K) * COLS + Math.floor(x / K)]; let moved = 0; frameN++;
  for (let pass = 0; pass < 2; pass++) for (let y = SH - 1; y >= 0; y--) { const dir = (y + pass + frameN) & 1 ? 1 : -1; for (let i = 0; i < SW; i++) { const x = dir > 0 ? i : SW - 1 - i, k = y * SW + x, v = SAND[k]; if (!v) continue;
      if (y === SH - 1) { if (RUB[Math.floor(x / K)]) { SAND[k] = 0; drained++; moved++; if (pitG.length < 260) pitG.push({ x: x + .5, y: SH, vy: 2 + Math.random() * 3, vx: (Math.random() - .5) * 2, c: v, life: 1 }); if (Math.random() < .05) A.noise(.05, 'bandpass', 2400 + Math.random() * 2000, 2, .015); } continue; }
      if (free(x, y + 1)) { SAND[k + SW] = v; SAND[k] = 0; moved++; continue; } const d = Math.random() < .5 ? 1 : -1; for (const dd of [d, -d]) { const nx = x + dd; if (nx >= 0 && nx < SW && free(nx, y + 1) && !SAND[y * SW + nx]) { SAND[(y + 1) * SW + nx] = v; SAND[k] = 0; moved++; break; } } } }
  sandMoving = moved; if (moved > 30 && Math.random() < .3) A.noise(.08, 'lowpass', 600 + Math.random() * 400, 1, .02); }
function canFall() { if (!SAND) return false; for (let c = 0; c < COLS; c++) if (RUB[c]) for (let r = 0; r < ROWS - 1; r++) if (G[r][c] && MASK[r + 1][c] && !G[r + 1][c] && !sandy(r + 1, c)) return true; return false; }
async function rubbleSettle() { for (let g = 0; g < 8; g++) { gravity(); await settle(); await cascade(); if (!crumbleLoose()) break; await wait(260); } }
function crumbleLoose() { if (!SAND) return 0; let n = 0; const isT = (r, c) => c >= 0 && c < COLS && G[r] && G[r][c] && MASK[r][c];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const p = G[r][c]; if (!p || !RUB[c] || p.t === 9) continue; if (isT(r, c - 1) || isT(r, c + 1)) continue; let below = 0; for (let k = r + 1; k < ROWS && isT(k, c); k++) below++; let above = 0; for (let k = r - 1; k >= 0 && isT(k, c); k--) above++; if (above + below + 1 >= 3 && false) continue;
    G[r][c] = null; p.gone = true; popFx(p, r, c); puff(r, c, '#c8c0d8', 8); if (need['t' + p.t] > 0) need['t' + p.t]--; score += 30; n++; }
  if (n) { A.noise(.25, 'lowpass', 700, 1, .2); A.tone(300, .12, 'triangle', .05, 0, 150); updHud(); } return n; }
function drawSand() { if (!SAND) return; const fs = cs / K; const px = Math.max(2, Math.round(fs * 1.5 * dpr)); if (px !== grainPx) { grainPx = px; grainSpr = GRAINC.map(c => { const g = cnv(px, px), x = g.getContext('2d'); const gr = x.createRadialGradient(px * .35, px * .3, 0, px / 2, px / 2, px / 2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.25, c); gr.addColorStop(1, '#2a2a3a'); x.fillStyle = gr; x.beginPath(); x.arc(px / 2, px / 2, px / 2 - .3, 0, TAU); x.fill(); return g; }); }
  const w = fs * 1.5; for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { const v = SAND[y * SW + x]; if (v) { const j = ((x * 73 + y * 151) % 7) / 7 - .5, j2 = ((x * 37 + y * 91) % 5) / 5 - .5; cx.drawImage(grainSpr[v - 1], bx + x * fs - fs * .18 + j * fs * .5, by + y * fs - fs * .18 + j2 * fs * .4, w * (1 + j2 * .3), w * (1 + j2 * .3)); } } }
function drawPitHero(t, dt) { const fs = cs / K; const rc = RUB.map((v, i) => v ? i : -1).filter(i => i >= 0); if (!rc.length) return; const x0 = bx + rc[0] * cs, x1 = bx + (rc[rc.length - 1] + 1) * cs, y0 = by + ROWS * cs, ph = cs * 1.25;
  const g = cx.createLinearGradient(0, y0, 0, y0 + ph); g.addColorStop(0, '#2a2236'); g.addColorStop(1, '#4a3a2a'); cx.fillStyle = g; cx.beginPath(); cx.roundRect(x0, y0 + 2, x1 - x0, ph, [0, 0, cs * .3, cs * .3]); cx.fill();
  for (let i = pitG.length - 1; i >= 0; i--) { const p = pitG[i]; p.vy += 60 * dt; p.y += p.vy * dt * 6; p.x += p.vx * dt * 6; const py = by + p.y * fs; if (py > y0 + ph - fs * 2) { p.y = (y0 + ph - fs * 2 - by) / fs; p.vy = 0; p.vx *= .9; p.life -= dt * .6; } if (p.life <= 0) { pitG.splice(i, 1); continue; } cx.globalAlpha = Math.min(1, p.life * 2); cx.drawImage(grainSpr[p.c - 1] || grainSpr[0], bx + p.x * fs, py, fs * 1.35, fs * 1.35); } cx.globalAlpha = 1;
  const chW = cs * 1.4, chX = (x0 + x1) / 2 - chW / 2, chY = y0 + ph - chW * .92; cx.save(); cx.translate(chX, chY); cx.scale(chW / 100, chW / 100); drawChest(cx, hero && hero.landed); cx.restore();
  if (!hero) return; const hc = Math.floor(hero.fx / K), hcs = [Math.max(hc * K, Math.floor(hero.fx) - 2), Math.min(hc * K + K - 1, Math.floor(hero.fx) + 2)]; let surf = SH + (ph / fs) * .55;
  for (let x = hcs[0]; x <= hcs[1]; x++) for (let y = 0; y < SH; y++) if (SAND[y * SW + x]) { surf = Math.min(surf, y); break; } for (let r = 0; r < ROWS; r++) if (G[r][hc] && RUB[hc]) { surf = Math.min(surf, r * K); break; }
  const target = by + surf * fs; if (hero.y < 0) hero.y = target; if (hero.y < target - 1) { hero.vy += cs * 30 * dt; hero.y = Math.min(target, hero.y + hero.vy * dt); } else { hero.y = target; hero.vy = 0; } hero.landed = surf >= SH; hero.mood = hero.landed ? 'happy' : sandLeft() < .35 ? 'ok' : 'help';
  const hs = cs * 1.25 / 60; const hxp = bx + hero.fx * fs; cx.save(); cx.translate(hxp, hero.y - 40 * hs); cx.scale(hs, hs); drawPip(cx, hero.mood, t); cx.restore();
  if (hero.mood === 'help' && state === 'play') { const bx2 = hxp + cs * .9, by2 = hero.y - cs * 1.9 + Math.sin(t * 4) * 3; cx.fillStyle = '#fff'; cx.beginPath(); cx.roundRect(bx2 - cs * .8, by2 - cs * .32, cs * 1.6, cs * .6, cs * .25); cx.fill(); cx.beginPath(); cx.moveTo(bx2 - cs * .4, by2 + cs * .25); cx.lineTo(bx2 - cs * .65, by2 + cs * .5); cx.lineTo(bx2 - cs * .15, by2 + cs * .25); cx.fill(); cx.fillStyle = '#c8302a'; cx.font = `900 ${Math.round(cs * .32)}px Rubik,Arial`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(T('הצילו!', 'Help!'), bx2, by2); } }
/* ================= INPUT ================= */
let sel = null, drag = null;
const cellAt = (x, y) => { const c = Math.floor((x - bx) / cs), r = Math.floor((y - by) / cs); return inB(r, c) ? [r, c] : null; };
cv.addEventListener('pointerdown', e => { if (state !== 'play' || busy) return; A.ac(); const k = cellAt(e.clientX, e.clientY); if (!k) { sel = null; return; } if (sel && Math.abs(sel[0] - k[0]) + Math.abs(sel[1] - k[1]) === 1) { const a = sel; sel = null; trySwap(a, k); return; } drag = { k, x: e.clientX, y: e.clientY }; sel = k; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => { if (!drag || busy) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.max(Math.abs(dx), Math.abs(dy)) < cs * .35) return; const d = Math.abs(dx) > Math.abs(dy) ? [0, Math.sign(dx)] : [Math.sign(dy), 0]; const b = [drag.k[0] + d[0], drag.k[1] + d[1]]; const a = drag.k; drag = null; sel = null; if (inB(...b)) trySwap(a, b); });
cv.addEventListener('pointerup', () => { drag = null; });

/* ================= HUD / FLOW ================= */
const ICON = t => { const c = cnv(64, 64), x = c.getContext('2d'); x.scale(.64, .64); if (t === 'nori') { x.fillStyle = '#4a8a3a'; x.beginPath(); x.roundRect(12, 12, 76, 76, 12); x.fill(); x.strokeStyle = 'rgba(160,220,140,.5)'; x.lineWidth = 4; x.stroke(); } else if (t === 'box') drawBox(x, 1); else drawPiece(x, t); return c.toDataURL(); };
const iconCache = {}; const icon = t => iconCache[t] || (iconCache[t] = ICON(t));
function updHud() { if (!LD) return; $('movesTxt').textContent = Math.max(0, moves); $('scoreTxt').textContent = score; const th = stars3(); const max = th[2] * 1.1; $('barI').style.width = Math.min(100, score / max * 100) + '%'; ['s1', 's2', 's3'].forEach((id, i) => { $(id).style.insetInlineStart = (th[i] / max * 100) + '%'; $(id).classList.toggle('on', score >= th[i]); });
  let g = ''; if (LD.goal === 'sand') g = `<span class="gl${hero && hero.landed ? ' ok' : ''}"><b>🐹</b>${hero && hero.landed ? '✔' : '🪨 ' + Math.ceil(sandLeft() * 100) + '%'}</span>`; if (LD.goal === 'score') g = `<span class="gl"><b>🎯</b>${Math.max(0, LD.target - score) || '✔'}</span>`; for (const [k, v] of Object.entries(need)) { const ic = k === 'nori' ? icon('nori') : k === 'box' ? icon('box') : icon(+k.slice(1)); g += `<span class="gl${v <= 0 ? ' ok' : ''}"><img src="${ic}" alt="">${v > 0 ? v : '✔'}</span>`; } $('goals').innerHTML = g; $('lvTxt').textContent = T('שלב ', 'Level ') + (LD.L + 1); }
const stars3 = () => { const base = LD.goal === 'score' ? LD.target : 1200 + LD.L * 260; return [base, Math.round(base * 1.5), Math.round(base * 2.1)]; };
function win() { state = 'done'; A.stopMusic(); const th = stars3(), st = score >= th[2] ? 3 : score >= th[1] ? 2 : 1; if ((S.stars[LD.L] || 0) < st) S.stars[LD.L] = st; if (!S.best[LD.L] || score > S.best[LD.L]) S.best[LD.L] = score; S.save(); [0, 4, 7, 12, 16].forEach((k, i) => A.tone(523 * Math.pow(2, k / 12), .3, 'triangle', .08, i * .1)); A.voice('yay', 1.2);
  $('eT').textContent = LD.rescue ? T('פיפ מצא את האוצר! 💰', 'Pip found the treasure! 💰') : T('השלב הושלם! 💎', 'Level complete! 💎'); setStarsUI(st); $('eP').textContent = T(`ניקוד: ${score} · שיא: ${S.best[LD.L]}`, `Score: ${score} · Best: ${S.best[LD.L]}`); $('eNext').hidden = LD.L >= NL - 1; $('eAgain').textContent = T('שוב', 'Again'); setTimeout(() => $('endSheet').hidden = false, 500); }
function lose() { state = 'done'; A.stopMusic(); A.voice('aww', 1.1); $('eT').textContent = T('נגמרו המהלכים 😢', 'Out of moves 😢'); setStarsUI(0); $('eP').textContent = LD && LD.rescue ? T('החצץ עדיין לא התנקז. נסו לנקות עמודות שלמות מתחתיו – חיצים עומדים עוזרים מאוד!', 'The rubble is still there. Clear whole columns under it – vertical arrows help a lot!') : T('כמעט! נסו שוב – חפשו מהלכים שיוצרים מיוחדים', 'So close! Try again – look for moves that make specials'); $('eNext').hidden = true; $('eAgain').textContent = T('נסו שוב 🔁', 'Try again 🔁'); $('endSheet').hidden = false; }
function setStarsUI(n) { [...$('eStars').children].forEach((e, k) => { e.classList.toggle('on', k < n); e.style.animationDelay = k * .25 + 's'; }); }
function showMap() { state = 'map'; A.stopMusic(); $('map').hidden = false; $('hud').hidden = true; $('endSheet').hidden = $('pauseSheet').hidden = true; MASK = []; const W = Math.min(innerWidth, 520); let h = ''; const pts = []; for (let i = 0; i < NL; i++) { const x = 50 + Math.sin(i * .9) * 30, y = 120 + i * 92; pts.push([x, y]); }
  const H = 120 + NL * 92 + 60; let path = 'M' + pts.map(([x, y]) => `${x * W / 100},${H - y}`).join(' L'); h += `<svg class="path" width="${W}" height="${H}"><path d="${path}" /></svg>`; pts.forEach(([x, y], i) => { const un = i === 0 || (S.stars[i - 1] || 0) > 0, st = S.stars[i] || 0; h += `<button class="node${i % 3 === 0 ? ' rs' : ''}${un ? '' : ' lock'}${un && !st ? ' cur' : ''}" data-i="${i}" ${un ? '' : 'disabled'} style="left:${x * W / 100}px;top:${H - y}px">${un ? (i % 3 === 0 ? '🐹' : i + 1) : '🔒'}<small>${un ? starsHTML(st) : ''}</small></button>`; });
  ['🌴', '🗿', '🦜', '🌿', '💎', '🐒', '🏺', '🌺', '🪨'].forEach((e, i) => { for (let k = 0; k < 4; k++) h += `<i class="dec" style="left:${((i * 37 + k * 53) % 90) + 2}%;top:${(i * 7 + k * 25) % 100}%">${e}</i>`; }); $('mapIn').style.height = H + 'px'; $('mapIn').style.width = W + 'px'; $('mapIn').innerHTML = h;
  const cur = $('mapIn').querySelector('.cur') || $('mapIn').querySelector('.node'); setTimeout(() => { if (cur) cur.scrollIntoView({ block: 'center' }); }, 30); }
$('mapIn').onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; A.ac(); A.tone(880, .06, 'triangle', .05); startLevel(+b.dataset.i); };
$('pauseBtn').onclick = () => { if (state !== 'play') return; $('pauseSheet').hidden = false; }; $('pGo').onclick = () => $('pauseSheet').hidden = true; $('pMap').onclick = () => showMap(); $('pRe').onclick = () => startLevel(LD.L);
$('eMap').onclick = () => showMap(); $('eAgain').onclick = () => startLevel(LD.L); $('eNext').onclick = () => startLevel(LD.L + 1);
$('pauseBtn').innerHTML = ICO.pause('#7a2a1a'); $('homeT').innerHTML = ICO.home('#7a2a1a'); soundButton('sndBtn', S, A, '#7a2a1a'); hubButtons(['homeT'], A);
$('pT').textContent = T('הפסקה', 'Paused'); $('pMap').textContent = T('מפה', 'Map'); $('pRe').textContent = T('מהתחלה', 'Restart'); $('pGo').textContent = T('המשך ▶', 'Resume ▶'); $('eMap').textContent = T('מפה', 'Map'); $('eNext').textContent = T('השלב הבא ▶', 'Next ▶'); $('movesL').textContent = T('מהלכים', 'moves');
addEventListener('resize', layout);
let last = performance.now();
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000) * (window.__fast || 1); last = now; A.tick(); if (state !== 'map') { step(dt); sandStep(); if (state === 'play' && LD && LD.rescue && !busy && !winning) { if (canFall()) { busy = true; rubbleSettle().then(() => { busy = false; updHud(); if (goalsDone()) finish(); }); } else if (goalsDone()) finish(); if ((frameN++ % 15) === 0) updHud(); } if (state === 'play' && !busy && !hintMove && now - lastMove > 4000) { const m = possibleMoves(true); hintMove = m[0] || null; } } render(now, dt); }
setTimeout(() => { layout(); showMap(); $('loading').hidden = true; requestAnimationFrame(frame); window.__trOK = true; }, 20);
window.__tr = { get sand() { return sandLeft(); }, get hero() { return hero; }, startLevel, get G() { return G; }, get state() { return state; }, get busy() { return busy; }, trySwap, moves: () => possibleMoves(), get score() { return score; }, get need() { return need; }, setSp(r, c, sp) { G[r][c].sp = sp; if (sp === 'c') G[r][c].t = -1; }, layoutInfo: () => ({ bx, by, cs }) };
