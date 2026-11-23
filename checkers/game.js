import { makeApp, sleep, $, T } from '../lib/board.js';

/* ================= rules engine ================= */
// B[r*8+c]: 0 empty, 1 / 2 = player 0 man / king (red, bottom, moves up), -1 / -2 = player 1 man / king (black, top)
const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const own = v => v > 0 ? 0 : v < 0 ? 1 : -1;
const inB = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
function initial() { const B = new Int8Array(64); for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) { if (r < 3) B[r * 8 + c] = -1; else if (r > 4) B[r * 8 + c] = 1; } return B; }
function capsFrom(B, sq, p, king, long, back, out) {
  const start = sq, v = B[sq]; B[sq] = 0;
  const rec = (s, path, caps) => { const r = s >> 3, c = s & 7; let ext = false;
    for (const [dr, dc] of DIRS) {
      if (!king && !back && dr !== (p === 0 ? -1 : 1)) continue;
      if (king && long) { let rr = r + dr, cc = c + dc; while (inB(rr, cc) && B[rr * 8 + cc] === 0) { rr += dr; cc += dc; }
        if (!inB(rr, cc)) continue; const m = rr * 8 + cc; if (own(B[m]) !== 1 - p || caps.includes(m)) continue;
        let lr = rr + dr, lc = cc + dc; while (inB(lr, lc) && B[lr * 8 + lc] === 0) { ext = true; const l = lr * 8 + lc; rec(l, path.concat(l), caps.concat(m)); lr += dr; lc += dc; } }
      else { const mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc; if (!inB(lr, lc)) continue; const m = mr * 8 + mc, l = lr * 8 + lc;
        if (own(B[m]) === 1 - p && !caps.includes(m) && B[l] === 0) { ext = true; rec(l, path.concat(l), caps.concat(m)); } } }
    if (!ext && caps.length) out.push({ path, caps }); };
  rec(sq, [sq], []); B[start] = v;
}
function genMoves(B, p, long) {
  const caps = [], simple = [];
  for (let s = 0; s < 64; s++) { const v = B[s]; if (own(v) !== p) continue; const king = Math.abs(v) === 2; capsFrom(B, s, p, king, long, long, caps); }
  if (caps.length) return caps;
  for (let s = 0; s < 64; s++) { const v = B[s]; if (own(v) !== p) continue; const king = Math.abs(v) === 2, r = s >> 3, c = s & 7;
    for (const [dr, dc] of DIRS) { if (!king && dr !== (p === 0 ? -1 : 1)) continue; let rr = r + dr, cc = c + dc;
      while (inB(rr, cc) && B[rr * 8 + cc] === 0) { simple.push({ path: [s, rr * 8 + cc], caps: [] }); if (!(king && long)) break; rr += dr; cc += dc; } } }
  return simple;
}
function apply(B, m) { const n = B.slice(), f = m.path[0], t = m.path[m.path.length - 1], v = n[f]; n[f] = 0; for (const c of m.caps) n[c] = 0; n[t] = v;
  if (Math.abs(v) === 1 && ((v > 0 && t < 8) || (v < 0 && t >= 56))) n[t] = v * 2; return n; }

/* ================= computer ================= */
function evaluate(B, p, long) { let s = 0; const KV = long ? 290 : 190;
  for (let i = 0; i < 64; i++) { const v = B[i]; if (!v) continue; const pl = own(v), r = i >> 3, c = i & 7; let val;
    if (Math.abs(v) === 2) val = KV + (c > 1 && c < 6 && r > 1 && r < 6 ? 6 : 0);
    else { const adv = pl === 0 ? 7 - r : r; val = 100 + adv * adv * 1.2 + (adv === 0 ? 10 : 0) + (c > 1 && c < 6 ? 4 : 0) + (c === 0 || c === 7 ? -3 : 0); }
    s += pl === p ? val : -val; }
  return s; }
let nodes = 0, deadline = 0;
function negamax(B, p, depth, a, b, long) { nodes++;
  const ms = genMoves(B, p, long); if (!ms.length) return -100000 - depth;
  if (depth <= 0 && !ms[0].caps.length) return evaluate(B, p, long);
  if (depth <= -6) return evaluate(B, p, long);
  if ((nodes & 1023) === 0 && performance.now() > deadline) throw 'time';
  let best = -1e9; for (const m of ms) { const v = -negamax(apply(B, m), 1 - p, depth - 1, -b, -a, long); if (v > best) best = v; if (v > a) a = v; if (a >= b) break; } return best; }
function cpuChoose(B, p, diff, long) {
  const ms = genMoves(B, p, long); if (!ms.length) return null; if (ms.length === 1) return ms[0];
  if (diff === 'easy' && Math.random() < .35) return ms[Math.floor(Math.random() * ms.length)];
  const maxD = { easy: 1, normal: 3, hard: 9 }[diff] || 3; deadline = performance.now() + (diff === 'hard' ? 1400 : 600); nodes = 0;
  let bestM = ms[0]; let order = ms.slice();
  for (let d = 1; d <= maxD; d++) { let a = -1e9, bm = null, scored = [];
    try { for (const m of order) { const v = -negamax(apply(B, m), 1 - p, d - 1, -1e9, -a, long) + (diff === 'easy' ? Math.random() * 60 : diff === 'normal' ? Math.random() * 8 : 0); scored.push([v, m]); if (v > a) { a = v; bm = m; } } }
    catch (e) { break; }
    bestM = bm; order = scored.sort((x, y) => y[0] - x[0]).map(x => x[1]); }
  return bestM; }

/* ================= app shell ================= */
const app = makeApp({
  key: 'ck-save', deep: '#4a1a10', defaults: { rules: 'il' },
  logo: [T('משחק הקופסה הקלאסי', 'THE CLASSIC'), T('דמקה', 'CHECKERS')],
  sub: T('קופצים מעל אבני היריב, מגיעים לקצה והופכים למלך 👑', 'Jump over your rival’s pieces, reach the far side and become a king 👑'),
  extras: [{ k: 'rules', t: T('📜 חוקים', '📜 Rules'), opts: [['il', T('🇮🇱 ישראלי', '🇮🇱 Israeli'), T('אכילה אחורה, מלך ארוך', 'back captures, flying king')], ['classic', T('🎩 קלאסי', '🎩 Classic'), T('רק קדימה, מלך צעד', 'forward only, short king')]] }],
  rules: { icon: '⚫', title: T('איך משחקים דמקה', 'How to play Checkers'), items: [
    ['🎯', T('המטרה', 'Goal'), T('לאכול את כל האבנים של היריב – או לחסום אותו כך שלא יוכל לזוז.', 'Capture all of your rival’s pieces – or block them so they can’t move.')],
    ['↗️', T('תנועה', 'Moving'), T('אבנים זזות באלכסון, משבצת אחת קדימה, רק על המשבצות הכהות.', 'Pieces move diagonally, one square forward, on the dark squares only.')],
    ['💥', T('אכילה', 'Capturing'), T('אם יש אבן של היריב צמודה באלכסון ומאחוריה משבצת ריקה – קופצים מעליה ואוכלים אותה. אפשר להמשיך לקפוץ שוב ושוב באותו תור!', 'If a rival piece is diagonally next to you with an empty square behind it – jump over it and capture it. Keep jumping in the same turn if you can!')],
    ['⚠️', T('חובת אכילה', 'Must capture'), T('אם אפשר לאכול – חובה לאכול. האבנים שיכולות לאכול מסומנות בצהוב.', 'If you can capture, you must. Pieces that can capture are outlined in yellow.')],
    ['👑', T('מלך', 'King'), T('אבן שמגיעה לשורה האחרונה בצד של היריב הופכת למלך – והיא יכולה לזוז גם אחורה.', 'A piece that reaches the far row becomes a king – and can move backwards too.')],
    ['🇮🇱', T('חוקים ישראליים', 'Israeli rules'), T('אבן רגילה יכולה לאכול גם אחורה, והמלך “ארוך” – זז כמה משבצות שרוצה באלכסון ואוכל גם מרחוק.', 'Men may also capture backwards, and the king “flies” – it moves any distance diagonally and captures from afar.')],
    ['🎩', T('חוקים קלאסיים', 'Classic rules'), T('אוכלים רק קדימה, והמלך זז ואוכל משבצת אחת בכל פעם (לכל הכיוונים).', 'Men capture forward only, and the king moves and captures one square at a time (any direction).')],
    ['🤝', T('תיקו', 'Draw'), T('25 מהלכים לכל צד בלי שום אכילה ובלי תזוזת אבן רגילה = תיקו.', '25 moves each with no capture and no ordinary-piece move = draw.')],
    ['👆', T('איך מזיזים', 'How to play'), T('נוגעים באבן ואז במשבצת הירוקה. בקפיצה כפולה – נוגעים בכל נחיתה בתורה.', 'Tap a piece, then a green square. For a double jump, tap each landing in turn.')]] },
  onStart: tk => newGame(tk), onStop: () => { G = null; },
});
const { S, sfx } = app;
const NAMES = () => S.mode === 'cpu' ? [T('אתם', 'You'), T('המחשב', 'Computer')] : [T('אדום', 'Red'), T('שחור', 'Black')];
const COL = ['#e0303a', '#2a2a33'];

/* ================= DOM ================= */
app.stage.insertAdjacentHTML('beforeend', `<div id="cwrap"><div class="side" id="s1"></div><div id="cb"><div id="grid"></div><div id="pcs"></div></div><div class="side" id="s0"></div></div>`);
const grid = $('grid'), pcs = $('pcs');
for (let i = 0; i < 64; i++) { const d = document.createElement('div'); d.className = 'sq ' + (((i >> 3) + (i & 7)) % 2 ? 'd' : 'l'); d.dataset.i = i; grid.appendChild(d); }
function fit() { const sb = app.stage.getBoundingClientRect(); const s = Math.max(200, Math.min(sb.width - 20, sb.height - 110, 640)); $('cb').style.width = s + 'px'; $('cb').style.height = s + 'px'; }
addEventListener('resize', fit);

let G = null;
function render() { if (!G) return; const seen = new Set();
  for (let i = 0; i < 64; i++) { const id = G.ids[i]; if (!id) continue; seen.add(id); let e = G.els[id];
    if (!e) { e = document.createElement('div'); e.innerHTML = '<b></b>'; pcs.appendChild(e); G.els[id] = e; }
    const v = G.B[i]; e.className = 'pc p' + own(v) + (G.movable.has(i) ? ' can' : '') + (G.sel === i ? ' sel' : ''); e.style.left = (i & 7) * 12.5 + '%'; e.style.top = (i >> 3) * 12.5 + '%'; e.firstChild.textContent = Math.abs(v) === 2 ? '👑' : ''; e.style.opacity = (G.capPending || []).includes(i) ? '.3' : ''; }
  for (const id in G.els) if (!seen.has(+id)) { G.els[id].classList.add('gone'); const e = G.els[id]; delete G.els[id]; setTimeout(() => e.remove(), 350); }
  grid.querySelectorAll('.sq').forEach((d, i) => { d.classList.toggle('tg', G.targets.includes(i)); d.classList.toggle('last', G.last.includes(i)); });
  const nm = NAMES(); const cnt = p => G.B.reduce((a, v) => a + (own(v) === p ? 1 : 0), 0);
  for (const p of [0, 1]) { const taken = 12 - cnt(1 - p); $('s' + p).innerHTML = `<span class="dot" style="width:16px;height:16px;border-radius:50%;background:${COL[p]};box-shadow:0 0 0 2px #fff"></span>${nm[p]} · ${T('אכל', 'took')} ${taken}<span class="caps">${('<i style="background:' + COL[1 - p] + '"></i>').repeat(Math.min(taken, 12))}</span>`; } }
function turnBar() { const nm = NAMES(); const me = G.cur; app.turn(`<span class="chip"><span class="dot" style="background:${COL[me]}"></span>${nm[me]}${S.mode === 'cpu' && me === 1 ? ' · ' + T('חושב…', 'thinking…') : ' · ' + T('תורכם', 'your turn')}</span>`); }

function newGame(tk) { pcs.innerHTML = ''; const B = initial(), ids = new Array(64).fill(0); let n = 1; for (let i = 0; i < 64; i++) if (B[i]) ids[i] = n++;
  G = { B, ids, els: {}, cur: 0, tk, moves: [], movable: new Set(), sel: null, prefix: [], targets: [], last: [], quiet: 0, long: S.rules !== 'classic' };
  fit(); startTurn(); }
function startTurn() { if (!G) return; G.moves = genMoves(G.B, G.cur, G.long); G.sel = null; G.prefix = []; G.targets = []; turnBar();
  if (!G.moves.length) { render(); return finish(1 - G.cur, T('אין מהלכים', 'no moves left')); }
  if (G.quiet >= 50) { render(); return finish(-1); }
  if (S.mode === 'cpu' && G.cur === 1) { G.movable = new Set(); render(); app.hint(''); setTimeout(() => cpuTurn(G.tk), 450); return; }
  G.movable = new Set(G.moves.map(m => m.path[0])); app.hint(G.moves[0].caps.length ? T('⚠️ חובה לאכול!', '⚠️ You must capture!') : ''); render(); }
function candidates() { const k = G.prefix.length; return G.moves.filter(m => m.path.length > k && G.prefix.every((s, i) => m.path[i] === s)); }
grid.addEventListener('click', e => { if (!G || G.busy || (S.mode === 'cpu' && G.cur === 1)) return; const d = e.target.closest('.sq'); if (!d) return; const i = +d.dataset.i; app.A.ac();
  if (G.targets.includes(i)) { stepTo(i); return; }
  if (G.prefix.length > 1) return; // mid multi-jump: must continue
  if (G.movable.has(i)) { G.sel = i; G.prefix = [i]; G.targets = [...new Set(candidates().map(m => m.path[1]))]; sfx.click(); render(); return; }
  if (own(G.B[i]) === G.cur) { sfx.bad(); app.hint(G.moves[0].caps.length ? T('⚠️ חובה לאכול – בחרו אבן מסומנת', '⚠️ You must capture – pick an outlined piece') : T('האבן הזו לא יכולה לזוז', 'That piece can’t move')); }
  G.sel = null; G.prefix = []; G.targets = []; render(); });
async function stepTo(i) { G.busy = true; const k = G.prefix.length; const cands = candidates().filter(m => m.path[k] === i); const from = G.prefix[k - 1];
  const cap = cands[0].caps.length ? cands[0].caps[k - 1] : null; G.prefix.push(i);
  // move piece visually
  const id = G.ids[from]; G.ids[from] = 0; G.ids[i] = id; const v = G.B[from]; G.B[from] = 0; G.B[i] = v; if (cap != null) { G.capPending = (G.capPending || []).concat(cap); }
  G.sel = i; G.targets = []; G.movable = new Set(); render(); if (G.els[id]) { G.els[id].classList.add('jump'); setTimeout(() => G && G.els[id] && G.els[id].classList.remove('jump'), 200); }
  cap != null ? sfx.take() : sfx.place(); await sleep(240); if (!G) return;
  const rest = cands.filter(m => m.path.length > k + 1);
  if (rest.length && cands.every(m => m.path.length > k + 1)) { G.targets = [...new Set(rest.map(m => m.path[k + 1]))]; G.busy = false; render(); if (!(S.mode === 'cpu' && G.cur === 1)) app.hint(T('🔥 עוד קפיצה!', '🔥 Keep jumping!')); return; }
  const m = cands.find(x => x.path.length === k + 1) || cands[0]; finishMove(m); G.busy = false; }
function finishMove(m) { // restore pre-move board then apply properly
  const f = m.path[0], t = m.path[m.path.length - 1], v = G.B[t]; G.B[t] = 0; G.B[f] = v; G.capPending = [];
  const wasMan = Math.abs(G.B[f]) === 1; const nb = apply(G.B, m); const king = wasMan && Math.abs(nb[t]) === 2;
  for (const c of m.caps) G.ids[c] = 0; G.B = nb; G.quiet = (m.caps.length || wasMan) ? 0 : G.quiet + 1; G.last = [f, t];
  if (king) { sfx.good(); app.hint('👑 ' + T('מלך!', 'King!')); } else app.hint('');
  const opp = 1 - G.cur; if (!G.B.some(x => own(x) === opp)) { G.movable = new Set(); G.targets = []; render(); return finish(G.cur); }
  G.cur = opp; startTurn(); }
async function cpuTurn(tk) { if (!G || !app.alive(tk)) return; await sleep(50); const m = cpuChoose(G.B, 1, S.diff, G.long); if (!G || !app.alive(tk)) return; if (!m) return;
  G.sel = m.path[0]; G.prefix = [m.path[0]]; render(); await sleep(350);
  for (let k = 1; k < m.path.length; k++) { if (!G || !app.alive(tk)) return; G.moves = [m]; await stepTo(m.path[k]); if (k < m.path.length - 1) await sleep(260); } }
function finish(p, why) { G.movable = new Set(); G.targets = []; render(); const nm = NAMES();
  if (p < 0) { app.win({ emo: '🤝', title: T('תיקו!', 'Draw!'), sub: T('25 מהלכים בלי אכילה', '25 moves without a capture'), good: true }); return; }
  app.record(p); const human = S.mode === '2p' || p === 0;
  app.win({ emo: human ? '🏆' : '🤖', title: S.mode === 'cpu' ? (p === 0 ? T('ניצחתם!', 'You win!') : T('המחשב ניצח', 'The computer wins')) : `${nm[p]} ${T('ניצח!', 'wins!')}`, sub: (why ? why + ' · ' : '') + (S.mode === 'cpu' ? `${T('תוצאה', 'Score')}: ${S.w} – ${S.l}` : `${S.wins[0] || 0} – ${S.wins[1] || 0}`), good: human }); }

$('loading').hidden = true;
window.__ck = { get G() { return G; }, render, fit, genMoves, apply, initial, cpuChoose, evaluate, app };
