import { makeApp, sleep, shuffle, $, T } from '../lib/board.js';

/* ================= tiles & rules ================= */
const SET = []; for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) SET.push([a, b]);
const pips = t => t[0] + t[1];
const isD = t => t[0] === t[1];
const handPips = h => h.reduce((s, t) => s + pips(t), 0);

/* ================= app shell ================= */
const app = makeApp({
  key: 'dm-save', deep: '#0e2a4a', defaults: { target: 50 },
  logo: [T('משחק הקופסה הקלאסי', 'THE CLASSIC'), T('דומינו', 'DOMINOES')],
  sub: T('מחברים מספרים זהים, נפטרים מכל האבנים – ואוספים נקודות!', 'Match the numbers, empty your hand – and collect points!'),
  extras: [{ k: 'target', t: T('🏁 משחקים עד', '🏁 Play to'), opts: [['1', T('סיבוב אחד', 'One round')], ['50', T('50 נקודות', '50 points')], ['100', T('100 נקודות', '100 points')]] }],
  rules: { icon: '🁫', title: T('איך משחקים דומינו', 'How to play Dominoes'), items: [
    ['🎯', T('המטרה', 'Goal'), T('להיות הראשונים שנפטרים מכל האבנים ביד.', 'Be the first to get rid of all the tiles in your hand.')],
    ['🁢', T('האבנים', 'The tiles'), T('לכל אבן שני חצאים עם 0 עד 6 נקודות. כל שחקן מקבל 7 אבנים, והשאר נשארות בקופה.', 'Each tile has two halves with 0 to 6 dots. Each player gets 7 tiles; the rest stay in the pile.')],
    ['🔗', T('איך משחקים', 'How to play'), T('בכל תור מניחים אבן אחת בקצה של השרשרת – החצי שנוגע חייב להיות עם אותו מספר כמו הקצה.', 'Each turn place one tile at an end of the chain – the touching half must have the same number as that end.')],
    ['🀄', T('אין התאמה?', 'No match?'), T('שולפים אבנים מהקופה עד שיש אחת שמתאימה. הקופה נגמרה? מוותרים על התור (פס).', 'Draw tiles from the pile until one fits. Pile empty? You pass.')],
    ['👆', T('איך מניחים', 'How to place'), T('האבנים שאפשר לשחק מורמות ומסומנות בצהוב. נוגעים באבן – ואם היא מתאימה לשני הקצוות, בוחרים קצה ירוק.', 'Playable tiles are raised and outlined in yellow. Tap one – if it fits both ends, pick a green end.')],
    ['🏆', T('ניקוד', 'Scoring'), T('מי שגומר ראשון מקבל את סכום הנקודות שנשארו ביד של היריב.', 'Whoever goes out first scores the total dots left in the rival’s hand.')],
    ['🔒', T('משחק חסום', 'Blocked game'), T('אף אחד לא יכול לשחק והקופה ריקה? מי שיש לו פחות נקודות ביד – מנצח בסיבוב.', 'Nobody can play and the pile is empty? Whoever holds fewer dots wins the round.')],
    ['🔁', T('סיבובים', 'Rounds'), T('משחקים סיבובים עד שמישהו מגיע ליעד (50 או 100 נקודות).', 'Play rounds until someone reaches the target (50 or 100 points).')]] },
  onStart: tk => newMatch(tk), onStop: () => { G = null; },
});
const { S, sfx } = app;
const NAMES = () => S.mode === 'cpu' ? [T('אתם', 'You'), T('המחשב', 'Computer')] : [T('שחקן 1', 'Player 1'), T('שחקן 2', 'Player 2')];

/* ================= DOM ================= */
app.stage.insertAdjacentHTML('beforeend', `<div id="dwrap"><div class="hinfo" id="topInfo"></div><div class="hand" id="topHand"></div><div id="table"><div id="chain"></div><div id="tbar"><span id="pile"></span><button class="rollBtn" id="drawBtn" hidden></button></div></div><div class="hand" id="botHand"></div><div class="hinfo" id="botInfo"></div></div>
<div class="sheet" id="passS" hidden><div class="card"><div class="emo">🔄</div><h3 id="passT"></h3><p>${T('אל תציצו באבנים של היריב 😉', 'No peeking at your rival’s tiles 😉')}</p><button class="btn pri" id="passGo" style="width:100%">${T('מוכן! ▶', 'Ready! ▶')}</button></div></div>
<div class="sheet" id="roundS" hidden><div class="card"><div class="emo"></div><h3></h3><table></table><button class="btn pri" id="nextR" style="width:100%">${T('לסיבוב הבא ▶', 'Next round ▶')}</button></div></div>`);
const PIP = { 0: [], 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const PIPH = { 6: [1, 2, 3, 7, 8, 9] };
function half(v, horiz) { const p = horiz && PIPH[v] ? PIPH[v] : PIP[v]; return `<div class="hf">${p.map(k => `<s style="grid-area:${Math.ceil(k / 3)}/${(k - 1) % 3 + 1}"></s>`).join('')}</div>`; }
function tileEl(a, b, horiz, w, h, back) { const d = document.createElement('div'); d.className = 'tile ' + (horiz ? 'h' : 'v') + (back ? ' back' : ''); d.style.width = w + 'px'; d.style.height = h + 'px'; if (!back) d.innerHTML = half(a, horiz) + half(b, horiz); return d; }

/* ================= chain layout ================= */
function layout(W, H) {
  let u = Math.min(W / 13, H / 8, 38);
  for (let tries = 0; tries < 30; tries++) { const res = tryLayout(W, H, u); if (res) return res; u *= .92; }
  return tryLayout(W, H, u, true);
}
function tryLayout(W, H, u, force) {
  const out = [], cx = W / 2, cy = H / 2 - u * .3, pad = u * .35, minX = pad, maxX = W - pad; const C = G.chain; if (!C.first) return { out, ends: [], u };
  const f = C.first; let xR, xL;
  if (isD(f.t)) { out.push({ t: [f.t[0], f.t[0]], x: cx - u / 2, y: cy - u, w: u, h: 2 * u, hz: false }); xR = cx + u / 2; xL = cx - u / 2; }
  else { out.push({ t: [f.l, f.r], x: cx - u, y: cy - u / 2, w: 2 * u, h: u, hz: true }); xR = cx + u; xL = cx - u; }
  const ends = [];
  const arm = (list, x, dir, v) => { let y = cy, after = false;
    for (const it of list) { const dbl = it.near === it.far;
      if (after) { const x0 = dir > 0 ? x : x - 2 * u; out.push({ t: dir > 0 ? [it.near, it.far] : [it.far, it.near], x: x0, y: y - u / 2, w: 2 * u, h: u, hz: true }); x += dir * 2 * u; after = false; continue; }
      const len = dbl ? u : 2 * u, fits = dir > 0 ? x + len + u <= maxX : x - len - u >= minX;
      if (fits) { if (dbl) out.push({ t: [it.near, it.far], x: dir > 0 ? x : x - u, y: y - u, w: u, h: 2 * u, hz: false });
        else out.push({ t: dir > 0 ? [it.near, it.far] : [it.far, it.near], x: dir > 0 ? x : x - 2 * u, y: y - u / 2, w: 2 * u, h: u, hz: true }); x += dir * len; }
      else { const x0 = dir > 0 ? x : x - u, y0 = v > 0 ? y - u / 2 : y - 1.5 * u; out.push({ t: v > 0 ? [it.near, it.far] : [it.far, it.near], x: x0, y: y0, w: u, h: 2 * u, hz: false });
        x = dir > 0 ? x + u : x - u; dir = -dir; y += v * 2 * u; after = true; } }
    // where would the next tile go?
    if (after) ends.push({ x: dir > 0 ? x : x - u, y: y - u / 2, w: u, h: u });
    else { const fits = dir > 0 ? x + 2 * u + u <= maxX : x - 2 * u - u >= minX; if (fits) ends.push({ x: dir > 0 ? x : x - u, y: y - u / 2, w: u, h: u }); else ends.push({ x: dir > 0 ? x : x - u, y: v > 0 ? y - u / 2 : y - u / 2, w: u, h: u }); } };
  arm(C.R, xR, 1, 1); arm(C.L, xL, -1, -1);
  if (!force) for (const r of out) if (r.y < 2 || r.y + r.h > H - 2 || r.x < 0 || r.x + r.w > W) return null;
  return { out, ends, u };
}

/* ================= game state ================= */
let G = null;
const leftEnd = () => { const C = G.chain; return C.L.length ? C.L[C.L.length - 1].far : C.first.l; };
const rightEnd = () => { const C = G.chain; return C.R.length ? C.R[C.R.length - 1].far : C.first.r; };
function canPlay(t) { if (!G.chain.first) return ['F']; const L = leftEnd(), R = rightEnd(), s = []; if (t[0] === L || t[1] === L) s.push('L'); if (t[0] === R || t[1] === R) s.push('R'); return s; }
const playable = p => G.hands[p].filter(t => canPlay(t).length);
const humanSide = () => S.mode === 'cpu' ? 0 : G.cur;
function newMatch(tk) { G = { tk, score: [0, 0], starter: -1, hands: [[], []], pile: [], chain: { first: null, L: [], R: [] }, cur: 0 }; newRound(); }
function newRound() { const deck = shuffle(SET.map(t => t.slice())); G.hands = [deck.slice(0, 7), deck.slice(7, 14)]; G.pile = deck.slice(14); G.chain = { first: null, L: [], R: [] }; G.passes = 0; G.sel = null; G.lacks = [new Set(), new Set()];
  if (G.starter < 0) { let best = -1, who = 0; for (const p of [0, 1]) for (const t of G.hands[p]) if (isD(t) && t[0] > best) { best = t[0]; who = p; } G.starter = who; }
  G.cur = G.starter; $('roundS').hidden = true; render(); app.hint(`${NAMES()[G.cur]} ${T('מתחילים', 'start')}`); setTimeout(() => startTurn(), 600); }
function info(p) { const nm = NAMES(); return `<span>${nm[p]}</span><span class="sc">🁢 ${G.hands[p].length}</span><span class="sc">🏆 ${G.score[p]}${+S.target > 1 ? ' / ' + S.target : ''}</span>`; }
function render() { if (!G) return; const me = humanSide(), op = 1 - me, hide = G.hidden;
  $('botInfo').innerHTML = info(me); $('topInfo').innerHTML = info(op);
  const tw = Math.min(30, (innerWidth - 40) / 12); $('topHand').innerHTML = ''; G.hands[op].forEach(() => $('topHand').appendChild(tileEl(0, 0, false, tw * .75, tw * 1.5, true)));
  const bh = $('botHand'); bh.innerHTML = ''; const n = G.hands[me].length, hw = Math.max(24, Math.min(40, (innerWidth - 24) / Math.min(n, 9) - 6)); const myTurn = G.cur === me && !G.busy && !G.over;
  G.hands[me].forEach((t, i) => { const e = tileEl(t[0], t[1], false, hw, hw * 2, hide); if (myTurn && !hide) { const ok = canPlay(t).length > 0; e.classList.add(ok ? 'ok' : 'dim'); if (G.sel === i) e.classList.add('sel'); } e.onclick = () => tapTile(i); bh.appendChild(e); });
  const tb = $('table').getBoundingClientRect(); const L = layout(tb.width, tb.height); const ch = $('chain'); ch.innerHTML = '';
  for (const r of L.out) { const e = tileEl(r.t[0], r.t[1], r.hz, r.w, r.h); e.style.left = r.x + 'px'; e.style.top = r.y + 'px'; ch.appendChild(e); }
  if (G.sel != null && G.choose) { const [eR, eL] = [L.ends[0], L.ends[1]]; for (const [side, r] of [['R', eR], ['L', eL]]) { if (!r || !G.choose.includes(side)) continue; const m = document.createElement('div'); m.className = 'endmark'; Object.assign(m.style, { left: r.x - 4 + 'px', top: r.y - 4 + 'px', width: r.w + 8 + 'px', height: r.h + 8 + 'px' }); m.onclick = () => place(me, G.sel, side); ch.appendChild(m); } }
  $('pile').textContent = `🀄 ${T('בקופה', 'Pile')}: ${G.pile.length}`;
  const db = $('drawBtn'); const need = myTurn && !hide && !playable(me).length; db.hidden = !need; db.textContent = G.pile.length ? `🀄 ${T('שלפו מהקופה', 'Draw a tile')}` : `⏭ ${T('פס', 'Pass')}`; }
function turnBar() { const nm = NAMES(); app.turn(`<span class="chip">${nm[G.cur]} · ${S.mode === 'cpu' && G.cur === 1 ? T('חושב…', 'thinking…') : T('תורכם', 'your turn')}</span>`); }
function startTurn() { if (!G || G.over) return; G.sel = null; G.choose = null; turnBar();
  if (S.mode === '2p' && G.lastShown !== G.cur && G.chain.first) { G.hidden = true; render(); $('passT').textContent = `${T('העבירו את המכשיר ל', 'Pass the device to ')}${NAMES()[G.cur]}`; $('passS').hidden = false; return; }
  G.hidden = false; G.lastShown = G.cur; render();
  if (S.mode === 'cpu' && G.cur === 1) { setTimeout(() => cpuTurn(G.tk), 700); return; }
  if (!playable(G.cur).length) app.hint(G.pile.length ? T('אין אבן מתאימה – שלפו מהקופה', 'No tile fits – draw from the pile') : T('אין מהלך – פס', 'No move – pass')); else app.hint(''); }
$('passGo').onclick = () => { $('passS').hidden = true; G.hidden = false; G.lastShown = G.cur; sfx.click(); startTurn(); };
function tapTile(i) { if (!G || G.busy || G.over || G.hidden) return; const me = humanSide(); if (G.cur !== me || (S.mode === 'cpu' && G.cur === 1)) return; app.A.ac(); const t = G.hands[me][i]; const s = canPlay(t);
  if (!s.length) { sfx.bad(); app.hint(T('האבן הזו לא מתאימה לאף קצה', 'That tile doesn’t fit either end')); G.sel = null; G.choose = null; render(); return; }
  if (s[0] === 'F') return place(me, i, 'F');
  if (s.length === 1 || leftEnd() === rightEnd()) return place(me, i, s[0]);
  if (G.sel === i) { G.sel = null; G.choose = null; render(); return; }
  G.sel = i; G.choose = s; sfx.click(); app.hint(T('בחרו קצה ירוק', 'Pick a green end')); render(); }
async function place(p, i, side) { if (!G) return; const t = G.hands[p][i]; G.hands[p].splice(i, 1); const C = G.chain;
  if (side === 'F') C.first = { t, l: t[0], r: t[1] };
  else { const e = side === 'L' ? leftEnd() : rightEnd(); const far = t[0] === e ? t[1] : t[0]; (side === 'L' ? C.L : C.R).push({ t, near: e, far }); }
  G.passes = 0; G.sel = null; G.choose = null; sfx.place(); app.hint(''); render();
  if (!G.hands[p].length) return endRound(p, false);
  G.cur = 1 - p; await sleep(250); startTurn(); }
$('drawBtn').onclick = () => { if (!G || G.busy) return; app.A.ac(); const me = humanSide(); if (G.cur !== me) return;
  if (G.pile.length) { G.lacks[me].add(leftEnd()); G.lacks[me].add(rightEnd()); G.hands[me].push(G.pile.pop()); sfx.click(); render(); if (playable(me).length) app.hint(T('יש התאמה! שחקו אותה', 'You got a match! Play it')); }
  else doPass(me); };
function doPass(p) { G.passes++; app.hint(`${NAMES()[p]}: ${T('פס', 'pass')}`); sfx.bad(); if (G.passes >= 2) { const a = handPips(G.hands[0]), b = handPips(G.hands[1]); return endRound(a === b ? -1 : a < b ? 0 : 1, true); } G.cur = 1 - p; setTimeout(startTurn, 700); }
async function cpuTurn(tk) { if (!G || !app.alive(tk) || G.over) return; G.busy = true; render();
  while (!playable(1).length && G.pile.length) { G.lacks[1].add(leftEnd()); G.lacks[1].add(rightEnd()); G.hands[1].push(G.pile.pop()); sfx.click(); render(); await sleep(380); if (!app.alive(tk)) return; }
  G.busy = false; const opts = []; G.hands[1].forEach((t, i) => canPlay(t).forEach(s => opts.push([i, s])));
  if (!opts.length) { render(); return doPass(1); }
  let best = opts[0], bs = -1e9; const L = G.chain.first ? leftEnd() : -1, R = G.chain.first ? rightEnd() : -1;
  for (const [i, s] of opts) { const t = G.hands[1][i]; let v = 0;
    if (S.diff === 'easy') v = Math.random();
    else { v = pips(t) + (isD(t) ? 4 : 0) + Math.random() * (S.diff === 'normal' ? 3 : .5);
      if (S.diff === 'hard') { const e = s === 'F' ? -1 : s === 'L' ? L : R; const far = s === 'F' ? t[1] : (t[0] === e ? t[1] : t[0]); const other = s === 'L' ? R : s === 'R' ? L : t[0];
        if (G.lacks[0].has(far)) v += 7; if (G.lacks[0].has(other) && s !== 'F') v += 2; const rest = G.hands[1].filter((_, k) => k !== i); v += rest.filter(x => x[0] === far || x[1] === far).length * 1.5; } }
    if (v > bs) { bs = v; best = [i, s]; } }
  place(1, best[0], best[1]); }
function endRound(w, blocked) { G.over = false; render(); const nm = NAMES();
  const pts = w < 0 ? 0 : handPips(G.hands[1 - w]); if (w >= 0) G.score[w] += pts; G.starter = w < 0 ? G.starter : w;
  const target = +S.target || 50; const done = target <= 1 ? w >= 0 || true : G.score.some(s => s >= target);
  if (done) { G.over = true; const winner = target <= 1 ? w : (G.score[0] === G.score[1] ? -1 : G.score[0] > G.score[1] ? 0 : 1);
    if (winner < 0) { app.win({ emo: '🤝', title: T('תיקו!', 'Draw!'), sub: `${G.score[0]} – ${G.score[1]}`, good: true }); return; }
    app.record(winner); const human = S.mode === '2p' || winner === 0;
    app.win({ emo: human ? '🏆' : '🤖', title: S.mode === 'cpu' ? (winner === 0 ? T('ניצחתם!', 'You win!') : T('המחשב ניצח', 'The computer wins')) : `${nm[winner]} ${T('ניצח!', 'wins!')}`, sub: (blocked ? T('משחק חסום · ', 'Blocked game · ') : '') + `${T('נקודות', 'Points')}: ${G.score[0]} – ${G.score[1]}`, good: human }); return; }
  const rs = $('roundS'); rs.querySelector('.emo').textContent = w < 0 ? '🤝' : blocked ? '🔒' : '🎉'; rs.querySelector('h3').textContent = w < 0 ? T('תיקו בסיבוב', 'Round tied') : `${nm[w]} ${T('לקח את הסיבוב', 'won the round')} (+${pts})`;
  rs.querySelector('table').innerHTML = [0, 1].map(p => `<tr><td>${nm[p]}</td><td>${T('נשאר ביד', 'Left in hand')}: ${handPips(G.hands[p])}</td><td>🏆 ${G.score[p]}</td></tr>`).join('');
  setTimeout(() => { rs.hidden = false; w === 0 || S.mode === '2p' ? sfx.good() : sfx.bad(); }, 600); }
$('nextR').onclick = () => { sfx.click(); G.lastShown = -1; newRound(); };
addEventListener('resize', () => { if (G && !$('game').hidden) render(); });

$('loading').hidden = true;
window.__dm = { get G() { return G; }, layout, canPlay, app };
