import { makeApp, makeDie, roll, sleep, $, T, EN } from '../lib/board.js';

/* ================= rules engine ================= */
// pts[a] > 0 : player 0 (ivory) checkers, < 0 : player 1 (red). Player 0 moves 23 → 0, player 1 moves 0 → 23.
// "own" coordinates: o = 0..23 counted from the player's own home end (0 = last point), 24 = bar, -1 = borne off.
const absOf = (p, o) => p === 0 ? o : 23 - o;
const mineAt = (b, p, a) => p === 0 ? Math.max(b.pts[a], 0) : Math.max(-b.pts[a], 0);
const oppAt = (b, p, a) => mineAt(b, 1 - p, a);
const clone = b => ({ pts: b.pts.slice(), bar: b.bar.slice(), off: b.off.slice() });
function initial() { const pts = new Array(24).fill(0); pts[23] = 2; pts[12] = 5; pts[7] = 3; pts[5] = 5; pts[0] = -2; pts[11] = -5; pts[16] = -3; pts[18] = -5; return { pts, bar: [0, 0], off: [0, 0] }; }
function single(b, p, d) {
  const out = [];
  if (b.bar[p] > 0) { const to = 24 - d, oc = oppAt(b, p, absOf(p, to)); if (oc <= 1) out.push({ from: 24, to, hit: oc === 1 }); return out; }
  let hi = -1, home = true;
  for (let o = 23; o >= 0; o--) if (mineAt(b, p, absOf(p, o)) > 0) { if (hi < 0) hi = o; if (o > 5) home = false; }
  for (let o = 23; o >= 0; o--) { if (!mineAt(b, p, absOf(p, o))) continue; const to = o - d;
    if (to >= 0) { const oc = oppAt(b, p, absOf(p, to)); if (oc <= 1) out.push({ from: o, to, hit: oc === 1 }); }
    else if (home && (to === -1 || o === hi)) out.push({ from: o, to: -1, hit: false }); }
  return out;
}
function apply(b, p, m) { const n = clone(b), s = p === 0 ? 1 : -1;
  if (m.from === 24) n.bar[p]--; else n.pts[absOf(p, m.from)] -= s;
  if (m.to === -1) n.off[p]++; else { const a = absOf(p, m.to); if (m.hit) { n.pts[a] = 0; n.bar[1 - p]++; } n.pts[a] += s; }
  return n; }
const keyOf = b => b.pts.join(',') + '|' + b.bar + '|' + b.off;
function allSeqs(b, p, dice) {
  const res = []; let max = 0;
  const rec = (bb, rem, seq) => { let any = false; const tried = new Set();
    for (let i = 0; i < rem.length; i++) { const d = rem[i]; if (tried.has(d)) continue; tried.add(d);
      for (const m of single(bb, p, d)) { any = true; const r2 = rem.slice(); r2.splice(i, 1); rec(apply(bb, p, m), r2, seq.concat([{ ...m, die: d }])); } }
    if (!any) { if (seq.length > max) max = seq.length; if (seq.length) res.push({ seq, b: bb }); } };
  rec(b, dice, []);
  let r = res.filter(x => x.seq.length === max);
  if (max === 1 && dice.length === 2 && dice[0] !== dice[1]) { const hi = Math.max(...dice); const h = r.filter(x => x.seq[0].die === hi); if (h.length) r = h; }
  return r;
}
const pip = (b, p) => { let s = b.bar[p] * 25; for (let o = 0; o < 24; o++) s += mineAt(b, p, absOf(p, o)) * (o + 1); return s; };

/* ================= computer player ================= */
function evaluate(b, p) {
  const op = 1 - p;
  if (b.off[p] === 15) return 1e6;
  const myPos = [], opPos = []; // opponent positions expressed in MY own coordinates (they move from low to high)
  for (let o = 0; o < 24; o++) { const a = absOf(p, o); const m = mineAt(b, p, a), q = oppAt(b, p, a); if (m) myPos.push([o, m]); if (q) opPos.push([o, q]); }
  const myBack = b.bar[p] ? 24 : Math.max(-1, ...myPos.map(x => x[0])), opFront = b.bar[op] ? -1 : Math.min(24, ...opPos.map(x => x[0]));
  const pipD = pip(b, op) - pip(b, p);
  if (myBack < opFront && b.bar[p] === 0 && b.bar[op] === 0) return pipD * 1.2 + b.off[p] * 4 - b.off[op] * 4; // pure race
  let s = pipD * .7 + b.bar[op] * 14 - b.bar[p] * 10 + b.off[p] * 3;
  const made = new Array(24).fill(false);
  for (const [o, n] of myPos) {
    if (n >= 2) { made[o] = true; s += 2 + (o <= 5 ? 3.5 : 0) + (o >= 3 && o <= 7 ? 2 : 0) + (o >= 18 ? 1.5 : 0); if (n > 3) s -= (n - 3) * .7; }
    else { // blot – how many shots can the opponent see?
      let direct = 0, ind = 0;
      for (const [y, c] of opPos) { const d = o - y; if (d >= 1 && d <= 6) direct += c; else if (d >= 7 && d <= 12) ind += c; }
      if (b.bar[op]) { const d = o + 1; if (d <= 6) direct += 2; else if (d <= 12) ind++; }
      const risk = Math.min(1, (Math.min(direct, 3) * 11 + Math.min(ind, 3) * 2) / 36);
      s -= risk * (6 + (24 - o) * .55);
    }
  }
  let run = 0, best = 0; for (let o = 0; o < 12; o++) { run = made[o] ? run + 1 : 0; best = Math.max(best, run); } s += best * best * 1.3;
  for (const [o, n] of opPos) if (n >= 2 && o <= 5) s -= 2.5; // opponent anchors in my home board
  return s;
}
function cpuChoose(b, p, dice, diff) {
  const seqs = allSeqs(b, p, dice); if (!seqs.length) return null;
  const uniq = new Map(); for (const x of seqs) { const k = keyOf(x.b); if (!uniq.has(k)) uniq.set(k, x); }
  const list = [...uniq.values()]; const noise = { easy: 14, normal: 3.5, hard: 0 }[diff] ?? 3;
  if (diff === 'easy' && Math.random() < .3) return list[Math.floor(Math.random() * list.length)].seq;
  let best = null, bs = -1e9; for (const x of list) { const v = evaluate(x.b, p) + (Math.random() - .5) * noise; if (v > bs) { bs = v; best = x; } }
  return best.seq;
}

/* ================= app shell ================= */
const app = makeApp({
  key: 'bg-save', deep: '#5a2e12',
  logo: [T('משחק הקופסה הקלאסי', 'THE CLASSIC'), T('שש-בש', 'BACKGAMMON')],
  sub: T('מגלגלים קוביות, מזיזים אבנים, אוכלים את היריב ומוציאים את כל ה-15 הביתה!', 'Roll the dice, move your checkers, hit your rival and bear all 15 home!'),
  rules: { icon: '🎲', title: T('איך משחקים שש-בש', 'How to play Backgammon'), items: [
    ['🎯', T('המטרה', 'Goal'), T('להיות הראשונים שמוציאים את כל 15 האבנים שלכם מהלוח.', 'Be the first to bear all 15 of your checkers off the board.')],
    ['🧭', T('כיוון התנועה', 'Direction'), T('האבנים הלבנות (שלכם) נעות נגד כיוון השעון לכיוון הבית – 6 המשולשים שליד מגש ההוצאה. האבנים האדומות נעות לכיוון ההפוך.', 'Your ivory checkers travel around the board towards your home – the 6 points next to the bear-off tray. Red moves the opposite way.')],
    ['🎲', T('קוביות', 'Dice'), T('מגלגלים 2 קוביות. כל קובייה היא מהלך נפרד – אפשר להזיז שתי אבנים, או אבן אחת פעמיים. דאבל (שתי קוביות זהות) = 4 מהלכים!', 'Roll 2 dice. Each die is a separate move – move two checkers, or one checker twice. Doubles = 4 moves!')],
    ['🚫', T('איפה מותר לנחות', 'Where you can land'), T('על משולש ריק, משולש שלכם, או משולש שיש בו אבן אחת בלבד של היריב. 2 אבנים ומעלה של היריב = חסום.', 'On an empty point, your own point, or a point with just ONE rival checker. 2+ rival checkers = blocked.')],
    ['💥', T('אכילה', 'Hitting'), T('נוחתים על אבן בודדת של היריב – היא עפה לאמצע הלוח (הבר) וחייבת להיכנס מחדש מההתחלה לפני כל מהלך אחר.', 'Land on a single rival checker – it goes to the middle bar and must re-enter from the start before any other move.')],
    ['🏠', T('הוצאה', 'Bearing off'), T('רק כשכל 15 האבנים בבית מותר להוציא. קובייה 3 מוציאה אבן מהמשולש השלישי, וכן הלאה. קובייה גבוהה מדי מוציאה את האבן הכי רחוקה.', 'Only when all 15 checkers are home you can bear off. A 3 removes a checker from the 3rd point, etc. A die that’s too high removes your farthest checker.')],
    ['✅', T('חובה לשחק', 'Must play'), T('חייבים להשתמש בשתי הקוביות אם אפשר. אם אפשר רק אחת – חייבים את הגבוהה. אין מהלך? התור עובר.', 'You must use both dice if possible. If only one can be used, it must be the higher. No move? Your turn passes.')],
    ['👆', T('איך מזיזים', 'How to move'), T('נוגעים באבן – והמקומות שאפשר להגיע אליהם מהבהבים בירוק. נוגעים ביעד. טעיתם? ↶ מבטל.', 'Tap a checker – places you can reach glow green. Tap the target. Oops? ↶ undoes.')],
    ['🏆', T('מארס', 'Gammon'), T('ניצחתם לפני שהיריב הוציא אפילו אבן אחת? זה מארס – ניצחון כפול!', 'Won before your rival bore off even one checker? That’s a gammon – a double win!')]] },
  onStart: tk => newGame(tk), onStop: () => { G = null; },
});
const { S, sfx } = app;
const NAMES = () => S.mode === 'cpu' ? [T('אתם', 'You'), T('המחשב', 'Computer')] : [T('שחקן לבן', 'Ivory'), T('שחקן אדום', 'Red')];
const COL = ['#f6ead2', '#d0232f'];

/* ================= board drawing ================= */
const FR = 28, PW = 96, BAR = 76, TRAY = 104, W = FR * 2 + PW * 12 + BAR + TRAY, H = 1000, PH = 410, R = 44;
const NS = 'http://www.w3.org/2000/svg';
app.stage.insertAdjacentHTML('beforeend', `<div id="bwrap"><svg id="bsvg" style="direction:ltr"></svg><div id="panel"><button class="sbtn" id="undoBtn" disabled>↶</button><div class="dice" id="dice"></div><button class="rollBtn" id="rollBtn" hidden>🎲 ${T('גלגלו', 'Roll')}</button></div></div>`);
const svg = $('bsvg'); let rot = false;
const colX = c => FR + (c < 6 ? c * PW : 6 * PW + BAR + (c - 6) * PW) + PW / 2;
const ptCol = a => a < 12 ? 11 - a : a - 12; const ptTop = a => a >= 12;
const barX = FR + 6 * PW + BAR / 2, trayX = W - TRAY / 2 - 6;
function slot(a, k) { const top = ptTop(a); const kk = Math.min(k, 4); return [colX(ptCol(a)), top ? FR + R + kk * 2 * R : H - FR - R - kk * 2 * R]; }
function barSlot(p, k) { return [barX, p === 0 ? H / 2 + 70 + k * 2 * R * .5 : H / 2 - 70 - k * 2 * R * .5]; }
function el(tag, at, parent) { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; }
function checker(g, x, y, p, label) { const c = el('g', {}, g); el('circle', { cx: x, cy: y + 4, r: R, fill: 'rgba(0,0,0,.35)' }, c); el('circle', { cx: x, cy: y, r: R, fill: `url(#ck${p})`, stroke: p ? '#7a0a12' : '#a88a5a', 'stroke-width': 3 }, c); el('circle', { cx: x, cy: y, r: R * .62, fill: 'none', stroke: p ? 'rgba(255,255,255,.25)' : 'rgba(120,90,40,.35)', 'stroke-width': 4 }, c);
  if (label) { const t = el('text', { x, y: y + 13, 'text-anchor': 'middle', 'font-size': 38, 'font-weight': 900, fill: p ? '#fff' : '#5a2e12', transform: rot ? `rotate(-90 ${x} ${y})` : '' }, c); t.textContent = label; } return c; }
function draw() {
  const sb = app.stage.getBoundingClientRect(); rot = sb.width < sb.height * 1.05;
  svg.setAttribute('viewBox', rot ? `0 0 ${H} ${W}` : `0 0 ${W} ${H}`); svg.innerHTML = '';
  const defs = el('defs', {}, svg);
  defs.innerHTML = `<radialGradient id="ck0" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#d8c39a"/></radialGradient><radialGradient id="ck1" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ff5a5a"/><stop offset="1" stop-color="#9a0c16"/></radialGradient><linearGradient id="wood" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#7a4520"/><stop offset=".5" stop-color="#5a2e12"/><stop offset="1" stop-color="#7a4520"/></linearGradient>`;
  const g = el('g', { transform: rot ? `translate(${H},0) rotate(90)` : '' }, svg); G && (G.g = g);
  el('rect', { x: 0, y: 0, width: W, height: H, rx: 34, fill: 'url(#wood)' }, g);
  el('rect', { x: FR, y: FR, width: 6 * PW, height: H - 2 * FR, rx: 8, fill: '#2f6b45' }, g);
  el('rect', { x: FR + 6 * PW + BAR, y: FR, width: 6 * PW, height: H - 2 * FR, rx: 8, fill: '#2f6b45' }, g);
  el('rect', { x: W - TRAY - FR / 2, y: FR, width: TRAY - 8, height: H - 2 * FR, rx: 14, fill: '#3a1c0a' }, g);
  for (let a = 0; a < 24; a++) { const c = ptCol(a), x = colX(c), top = ptTop(a); const y0 = top ? FR : H - FR, y1 = top ? FR + PH : H - FR - PH;
    el('path', { d: `M${x - PW / 2 + 3} ${y0} L${x + PW / 2 - 3} ${y0} L${x} ${y1} Z`, fill: (a % 2) ? '#f0d9a8' : '#9a3a22' }, g); }
  if (!G) return;
  const b = G.b, ov = el('g', {}, g);
  // highlights
  const tg = G.targets || [];
  for (const t of tg) { if (t === 'off') { el('rect', { x: W - TRAY - FR / 2, y: G.cur === 0 ? H / 2 : FR, width: TRAY - 8, height: H / 2 - FR, rx: 14, fill: 'rgba(90,255,140,.45)', class: 'hl' }, ov); continue; }
    const n = Math.abs(b.pts[t]) && Math.sign(b.pts[t]) === (G.cur === 0 ? 1 : -1) ? Math.abs(b.pts[t]) : 0; const [x, y] = slot(t, n); el('circle', { cx: x, cy: y, r: R, fill: 'rgba(90,255,140,.5)', stroke: '#5aff8c', 'stroke-width': 5, class: 'hl' }, ov); }
  const fromable = G.fromable || new Set();
  for (let a = 0; a < 24; a++) { const v = b.pts[a]; if (!v) continue; const p = v > 0 ? 0 : 1, n = Math.abs(v);
    for (let k = 0; k < Math.min(n, 5); k++) { const [x, y] = slot(a, k); checker(g, x, y, p, k === 4 && n > 5 ? '' + n : ''); }
    if (fromable.has(a)) { const [x, y] = slot(a, Math.min(n, 5) - 1); el('circle', { cx: x, cy: y, r: R + 5, fill: 'none', stroke: G.sel === a ? '#ffe24a' : 'rgba(255,226,74,.7)', 'stroke-width': G.sel === a ? 9 : 5, class: G.sel === a ? '' : 'hl' }, g); } }
  for (const p of [0, 1]) for (let k = 0; k < b.bar[p]; k++) { const [x, y] = barSlot(p, Math.min(k, 3)); checker(g, x, y, p, k === 3 && b.bar[p] > 4 ? '' + b.bar[p] : ''); if (fromable.has('bar') && p === G.cur && k === b.bar[p] - 1) el('circle', { cx: x, cy: y, r: R + 5, fill: 'none', stroke: '#ffe24a', 'stroke-width': 8 }, g); }
  for (const p of [0, 1]) for (let k = 0; k < b.off[p]; k++) { const y = p === 0 ? H - FR - 14 - k * 27 : FR + 14 + k * 27; el('rect', { x: trayX - 40, y: y - 11, width: 80, height: 22, rx: 6, fill: COL[p], stroke: p ? '#7a0a12' : '#a88a5a', 'stroke-width': 3 }, g); }
  // hit zones
  for (let a = 0; a < 24; a++) { const x = colX(ptCol(a)), top = ptTop(a); el('rect', { x: x - PW / 2, y: top ? FR : H / 2, width: PW, height: H / 2 - FR, fill: 'transparent', 'data-p': a, class: 'pt' }, g); }
  el('rect', { x: barX - BAR / 2, y: FR, width: BAR, height: H - 2 * FR, fill: 'transparent', 'data-p': 'bar', class: 'pt' }, g);
  el('rect', { x: W - TRAY - FR / 2, y: FR, width: TRAY, height: H - 2 * FR, fill: 'transparent', 'data-p': 'off', class: 'pt' }, g);
}
addEventListener('resize', () => { if (!$('game').hidden) draw(); });

/* ================= dice panel ================= */
const DICE = [makeDie(46), makeDie(46), makeDie(46, true), makeDie(46, true)];
function showDice(vals, p, anim) { const box = $('dice'); box.innerHTML = ''; vals.forEach((v, i) => { const d = DICE[(p === 1 ? 2 : 0) + i]; box.appendChild(d.el); d.used(false); d.el.classList.toggle('dbl', vals.length === 2 && vals[0] === vals[1] && i === 1); d.set(v, anim); }); }
function opening(v0, v1) { const box = $('dice'); box.innerHTML = ''; box.appendChild(DICE[0].el); box.appendChild(DICE[2].el); DICE[0].used(false); DICE[2].used(false); DICE[0].el.classList.remove('dbl'); DICE[0].set(v0, true); DICE[2].set(v1, true); }
function markUsed() { if (!G || !G.dice) return; const [a, c] = G.dice, left = G.left; const box = $('dice'); const ds = [...box.children];
  if (a === c) { ds.forEach(e => e.classList.remove('used')); if (ds[1]) ds[1].classList.toggle('dbl', left.length > 0); if (ds[1] && left.length) ds[1].dataset.n = left.length; if (!left.length) ds.forEach(e => e.classList.add('used')); return; }
  const rem = left.slice(); ds.forEach((e, i) => { const v = G.dice[i], k = rem.indexOf(v); if (k >= 0) { rem.splice(k, 1); e.classList.remove('used'); } else e.classList.add('used'); }); }

/* ================= game flow ================= */
let G = null;
function turnBar() { const nm = NAMES(); const me = G.cur; const msg = G.phase === 'roll' ? (S.mode === 'cpu' && me === 1 ? T('מגלגל…', 'rolling…') : T('גלגלו את הקוביות', 'roll the dice')) : G.phase === 'move' ? (S.mode === 'cpu' && me === 1 ? T('חושב…', 'thinking…') : T('הזיזו אבנים', 'move your checkers')) : '';
  app.turn(`<span class="chip"><span class="dot" style="background:${COL[me]}"></span>${nm[me]}${msg ? ' · ' + msg : ''}</span>`); }
async function newGame(tk) {
  G = { b: initial(), cur: 0, phase: 'open', dice: null, left: [], seqs: [], made: [], hist: [], sel: null, tk };
  $('undoBtn').disabled = true; $('rollBtn').hidden = true; draw(); app.turn(`<span class="chip">🎲 ${T('מי מתחיל?', 'Who starts?')}</span>`);
  await sleep(400); let v0, v1; do { v0 = roll(); v1 = roll(); sfx.roll(); opening(v0, v1); await sleep(900); if (!app.alive(tk)) return; } while (v0 === v1);
  G.cur = v0 > v1 ? 0 : 1; app.hint(`${NAMES()[G.cur]} ${T('מתחילים!', 'start!')} (${v0} : ${v1})`); await sleep(1100); if (!app.alive(tk)) return;
  beginMove([v0, v1].sort((x, y) => y - x), false);
}
function beginTurn() { if (!G) return; G.phase = 'roll'; G.dice = null; G.made = []; G.hist = []; G.sel = null; G.targets = []; G.fromable = new Set(); $('undoBtn').disabled = true; turnBar(); draw(); app.hint('');
  if (S.mode === 'cpu' && G.cur === 1) { $('rollBtn').hidden = true; setTimeout(() => doRoll(G.tk), 650); } else { $('rollBtn').hidden = false; $('dice').innerHTML = ''; } }
$('rollBtn').onclick = () => { app.A.ac(); if (G && G.phase === 'roll') doRoll(G.tk); };
function doRoll(tk) { if (!G || !app.alive(tk) || G.phase !== 'roll') return; $('rollBtn').hidden = true; const a = roll(), c = roll(); sfx.roll(); beginMove([a, c], true); }
async function beginMove(d, anim) { const tk = G.tk; G.dice = d; G.left = d[0] === d[1] ? [d[0], d[0], d[0], d[0]] : d.slice(); showDice(d, G.cur, anim); G.phase = 'move'; G.made = []; G.hist = [];
  G.seqs = allSeqs(G.b, G.cur, G.left); turnBar(); await sleep(anim ? 700 : 200); if (!app.alive(tk)) return; markUsed();
  if (!G.seqs.length) { app.hint(T('אין מהלך אפשרי – התור עובר', 'No legal move – turn passes')); sfx.bad(); await sleep(1500); if (!app.alive(tk)) return; endTurn(); return; }
  if (S.mode === 'cpu' && G.cur === 1) { cpuPlay(tk); return; }
  app.hint(G.b.bar[G.cur] ? T('יש לכם אבן בבר – הכניסו אותה קודם!', 'You have a checker on the bar – enter it first!') : ''); refreshChoices(); }
function nextMoves() { const k = G.made.length; const seqs = G.seqs.filter(s => s.seq.length > k && G.made.every((m, i) => s.seq[i].from === m.from && s.seq[i].to === m.to)); return seqs.map(s => s.seq[k]); }
function refreshChoices() { const nm = nextMoves(); G.fromable = new Set(nm.map(m => m.from === 24 ? 'bar' : absOf(G.cur, m.from)));
  if (G.sel != null && !G.fromable.has(G.sel)) G.sel = null; if (G.sel == null && G.fromable.size === 1) G.sel = [...G.fromable][0];
  G.targets = G.sel == null ? [] : [...new Set(nm.filter(m => (m.from === 24 ? 'bar' : absOf(G.cur, m.from)) === G.sel).map(m => m.to === -1 ? 'off' : absOf(G.cur, m.to)))]; draw(); }
svg.addEventListener('click', e => { if (!G || G.phase !== 'move' || (S.mode === 'cpu' && G.cur === 1) || G.busy) return; const z = e.target.closest('[data-p]'); if (!z) return; let p = z.dataset.p; if (p !== 'bar' && p !== 'off') p = +p;
  if (G.targets.includes(p)) { const nm = nextMoves().filter(m => (m.from === 24 ? 'bar' : absOf(G.cur, m.from)) === G.sel && (m.to === -1 ? 'off' : absOf(G.cur, m.to)) === p); if (!nm.length) return;
    const m = nm.reduce((x, y) => (x.die <= y.die ? x : y)); doMove(m); return; }
  if (G.fromable.has(p)) { G.sel = p; app.A.ac(); sfx.click(); refreshChoices(); return; }
  if (p === 'bar' && G.fromable.has('bar')) { G.sel = 'bar'; refreshChoices(); return; }
  G.sel = null; refreshChoices(); });
function posOf(p, own, b, leaving) { if (own === 24) { return barSlot(p, Math.max(0, Math.min(b.bar[p] - (leaving ? 1 : 0), 3))); } if (own === -1) return [trayX, p === 0 ? H - FR - 14 - b.off[p] * 27 : FR + 14 + b.off[p] * 27];
  const a = absOf(p, own), n = mineAt(b, p, a); return slot(a, Math.min(leaving ? n - 1 : n, 4)); }
async function fly(m, p) { const b = G.b; const [x0, y0] = posOf(p, m.from, b, true); const [x1, y1] = posOf(p, m.to, b, false); const g = G.g; if (!g) return;
  const c = checker(g, x0, y0, p); const t0 = performance.now(), dur = 260; await new Promise(res => { const st = () => { const k = Math.min(1, (performance.now() - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; c.setAttribute('transform', `translate(${(x1 - x0) * e} ${(y1 - y0) * e - Math.sin(k * Math.PI) * 40})`); k < 1 ? requestAnimationFrame(st) : res(); }; st(); }); }
async function doMove(m) { G.busy = true; const p = G.cur; G.hist.push(G.b); G.sel = null; G.targets = []; G.fromable = new Set(); await fly(m, p); G.b = apply(G.b, p, m); G.made.push(m); const i = G.left.indexOf(m.die); if (i >= 0) G.left.splice(i, 1);
  m.hit ? sfx.take() : sfx.place(); if (m.hit) app.hint(T('💥 אכלתם!', '💥 Hit!')); markUsed(); G.busy = false;
  if (G.b.off[p] === 15) { draw(); return finish(p); }
  if (!(S.mode === 'cpu' && p === 1)) $('undoBtn').disabled = false;
  if (!nextMoves().length) { draw(); await sleep(500); endTurn(); return; } if (!(S.mode === 'cpu' && p === 1)) refreshChoices(); else draw(); }
$('undoBtn').onclick = () => { if (!G || G.phase !== 'move' || !G.hist.length || G.busy) return; sfx.click(); G.b = G.hist.pop(); const m = G.made.pop(); G.left.push(m.die); markUsed(); $('undoBtn').disabled = !G.hist.length; G.sel = null; app.hint(''); refreshChoices(); };
function endTurn() { if (!G) return; G.phase = 'wait'; G.cur = 1 - G.cur; beginTurn(); }
async function cpuPlay(tk) { const seq = cpuChoose(G.b, 1, G.left, S.diff); await sleep(500); for (const m of seq || []) { if (!app.alive(tk)) return; await doMove(m); if (!G || G.phase !== 'move') return; await sleep(380); } }
function finish(p) { G.phase = 'over'; const gammon = G.b.off[1 - p] === 0; app.record(p); $('undoBtn').disabled = true; turnBar();
  const nm = NAMES(); const human = S.mode === '2p' || p === 0;
  app.win({ emo: human ? (gammon ? '🏆' : '🎉') : '🤖', title: S.mode === 'cpu' ? (p === 0 ? T('ניצחתם!', 'You win!') : T('המחשב ניצח', 'The computer wins')) : `${nm[p]} ${T('ניצח!', 'wins!')}`,
    sub: (gammon ? T('מארס! ניצחון כפול 🔥 ', 'Gammon! Double win 🔥 ') : '') + (S.mode === 'cpu' ? `${T('תוצאה', 'Score')}: ${S.w} – ${S.l}` : `${S.wins[0] || 0} – ${S.wins[1] || 0}`), good: human }); }

$('loading').hidden = true;
window.__bg = { get G() { return G; }, allSeqs, single, apply, initial, evaluate, cpuChoose, pip, app };
