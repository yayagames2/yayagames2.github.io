import { makeApp, makeDie, roll, sleep, $, T } from '../lib/board.js';

/* ================= board layout (our own) ================= */
const LADDERS = { 3: 22, 8: 30, 20: 41, 28: 55, 36: 57, 50: 69, 63: 81, 71: 92, 79: 98 };
const SNAKES = { 17: 7, 32: 10, 48: 26, 62: 18, 66: 45, 87: 54, 93: 73, 95: 75, 99: 78 };
const JUMP = Object.assign({}, LADDERS, SNAKES);
const cellXY = n => { const r = Math.floor((n - 1) / 10); let c = (n - 1) % 10; if (r % 2) c = 9 - c; return [c * 100 + 50, (9 - r) * 100 + 50]; };
const TOK = [['🐰', '#ff5a7a'], ['🐻', '#4a8aff'], ['🦊', '#ffa21f'], ['🐸', '#3ac06a']];
const CHARS = ['🐰', '🐻', '🦊', '🐸', '🐼', '🐯', '🦁', '🐵', '🐶', '🐱', '🦄', '🐲', '🐧', '🐙', '🦖', '🐢', '🤖', '👽', '🦸', '🧚', '👸', '🤴', '🧙', '🥷'];

/* ================= app shell ================= */
const app = makeApp({
  key: 'sl-save', deep: '#145a2a', modes: false, diffs: false, defaults: { np: 2, who: 'cpu', six: 1, myW: 0, games: 0 },
  logo: [T('משחק הקופסה הקלאסי', 'THE CLASSIC'), T('סולמות ונחשים', 'SNAKES & LADDERS')],
  sub: T('מגלגלים, טסים למעלה בסולמות – ונזהרים מהנחשים! מי מגיע ראשון ל-100?', 'Roll, climb the ladders – and watch out for snakes! Who reaches 100 first?'),
  extras: [
    { k: 'who', t: T('👥 מי משחק?', '👥 Who’s playing?'), opts: [['cpu', `🤖 ${T('אני נגד המחשב', 'Me vs computer')}`, T('לבד', 'solo')], ['hum', `👨‍👩‍👧 ${T('כולם אנשים', 'All humans')}`, T('על אותו מכשיר', 'same device')]] },
    { k: 'np', t: T('🔢 כמה שחקנים?', '🔢 How many players?'), opts: [['2', '2'], ['3', '3'], ['4', '4']] },
    { k: 'six', t: T('🎲 יצא 6?', '🎲 Rolled a 6?'), opts: [['1', T('עוד תור!', 'Roll again!')], ['0', T('רגיל', 'Normal')]] }],
  scoreText: S => S.games ? `🏆 ${T('ניצחונות שלך', 'Your wins')}: ${S.myW} / ${S.games}` : '',
  rules: { icon: '🐍', title: T('איך משחקים סולמות ונחשים', 'How to play Snakes & Ladders'), items: [
    ['🎯', T('המטרה', 'Goal'), T('להיות הראשונים שמגיעים למשבצת 100.', 'Be the first to reach square 100.')],
    ['🎲', T('תור', 'Your turn'), T('מגלגלים קובייה והחייל מתקדם מספר משבצות לפי המספר שיצא.', 'Roll the die and your piece moves forward that many squares.')],
    ['🪜', T('סולם', 'Ladder'), T('נחתתם בתחתית של סולם? מטפסים ישר למעלה! 🎉', 'Land at the bottom of a ladder? Climb straight up! 🎉')],
    ['🐍', T('נחש', 'Snake'), T('נחתתם על ראש של נחש? מחליקים למטה עד הזנב 😱', 'Land on a snake’s head? Slide down to its tail 😱')],
    ['💯', T('הסוף', 'The end'), T('צריך להגיע ל-100 בדיוק. מספר גדול מדי? מגיעים ל-100 וחוזרים אחורה את מה שנשאר.', 'You must land exactly on 100. Too big a number? Reach 100 and bounce back the rest.')],
    ['6️⃣', T('יצא 6', 'Rolled a 6'), T('אם בחרתם “עוד תור!” – מי שמוציא 6 מגלגל שוב.', 'If you chose “Roll again!” – whoever rolls a 6 rolls once more.')],
    ['👆', T('איך משחקים', 'How to play'), T('לוחצים על הכפתור “גלגלו” (או על הקובייה) – והחייל זז לבד.', 'Tap “Roll” (or the die) – your piece moves by itself.')]] },
  onStart: tk => pickChars(tk), onStop: () => { G = null; const o = document.getElementById('cpick'); if (o) o.hidden = true; },
});
const { S, sfx } = app;

/* ================= drawing ================= */
const NS = 'http://www.w3.org/2000/svg';
app.stage.insertAdjacentHTML('beforeend', `<div id="swrap"><div id="plist"></div><svg id="ssvg" viewBox="0 0 1000 1000" direction="ltr" style="direction:ltr"></svg><div id="sp"><div id="dieBox"></div><button class="rollBtn" id="rollBtn">🎲 ${T('גלגלו', 'Roll')}</button></div></div>`);
const svg = $('ssvg'); const DIE = makeDie(58); $('dieBox').appendChild(DIE.el);
function fit() { const sb = app.stage.getBoundingClientRect(), wide = sb.width > sb.height * 1.25; $('swrap').style.flexDirection = wide ? 'row' : 'column'; $('sp').style.flexDirection = wide ? 'column' : 'row'; $('plist').style.flexDirection = wide ? 'column' : 'row'; const s = Math.max(220, wide ? Math.min(sb.height - 16, sb.width - 360, 760) : Math.min(sb.width - 16, sb.height - 130, 720)); svg.style.width = s + 'px'; svg.style.height = s + 'px'; }
addEventListener('resize', fit);
const el = (tag, at, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
function smooth(pts) { let d = `M${pts[0][0]} ${pts[0][1]}`; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
  d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`; } return d; }
const SNAKE_COL = [['#5ad06a', '#1a8a2a'], ['#ff8a3a', '#c8481a'], ['#b46aff', '#6a2ac8'], ['#ff5a8a', '#c81a4a'], ['#3ac0ff', '#1a6ac8']];
const snakePaths = {};
function drawBoard() { svg.innerHTML = ''; const defs = el('defs', {}, svg);
  const PAL = ['#fff3c4', '#ffd9e6', '#d6f5ff', '#e2ffd6', '#f0e2ff'];
  for (let n = 1; n <= 100; n++) { const [x, y] = cellXY(n); el('rect', { x: x - 50, y: y - 50, width: 100, height: 100, fill: PAL[(n + Math.floor((n - 1) / 10)) % PAL.length] }, svg);
    const t = el('text', { x: x - 42, y: y - 26, 'font-size': 24, 'font-weight': 900, fill: 'rgba(30,40,60,.55)' }, svg); t.textContent = n; }
  const st = el('text', { x: 50, y: 990 - 22, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 900, fill: '#1a8a3a' }, svg); st.textContent = T('התחלה', 'START');
  const [fx, fy] = cellXY(100); const ft = el('text', { x: fx, y: fy + 26, 'text-anchor': 'middle', 'font-size': 44 }, svg); ft.textContent = '🏆';
  // ladders
  for (const a in LADDERS) { const [x0, y0] = cellXY(+a), [x1, y1] = cellXY(LADDERS[a]); const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L * 20, ny = dx / L * 20; const g = el('g', {}, svg);
    for (const s of [-1, 1]) el('line', { x1: x0 + nx * s, y1: y0 + ny * s, x2: x1 + nx * s, y2: y1 + ny * s, stroke: '#8a4a1a', 'stroke-width': 11, 'stroke-linecap': 'round' }, g);
    for (let k = 26; k < L - 10; k += 40) { const px = x0 + dx * k / L, py = y0 + dy * k / L; el('line', { x1: px - nx, y1: py - ny, x2: px + nx, y2: py + ny, stroke: '#c88a3a', 'stroke-width': 8, 'stroke-linecap': 'round' }, g); }
    for (const s of [-1, 1]) el('line', { x1: x0 + nx * s, y1: y0 + ny * s, x2: x1 + nx * s, y2: y1 + ny * s, stroke: '#c8803a', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: .8 }, g); }
  // snakes
  let si = 0; for (const h in SNAKES) { const [x0, y0] = cellXY(+h), [x1, y1] = cellXY(SNAKES[h]); const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L; const seg = Math.max(3, Math.round(L / 90)); const pts = [];
    for (let k = 0; k <= seg; k++) { const t = k / seg, w = Math.sin(t * Math.PI * (seg > 4 ? 3 : 2)) * 32 * (k === 0 || k === seg ? 0 : 1); pts.push([x0 + dx * t + nx * w, y0 + dy * t + ny * w]); }
    const d = smooth(pts), [c1, c2] = SNAKE_COL[si++ % SNAKE_COL.length]; const g = el('g', {}, svg);
    el('path', { d, fill: 'none', stroke: 'rgba(0,0,0,.18)', 'stroke-width': 34, 'stroke-linecap': 'round', transform: 'translate(4 6)' }, g);
    el('path', { d, fill: 'none', stroke: c2, 'stroke-width': 32, 'stroke-linecap': 'round' }, g);
    el('path', { d, fill: 'none', stroke: c1, 'stroke-width': 22, 'stroke-linecap': 'round' }, g);
    el('path', { d, fill: 'none', stroke: 'rgba(255,255,255,.55)', 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-dasharray': '2 26' }, g);
    const p = el('path', { d, fill: 'none', stroke: 'none' }, g); snakePaths[h] = p;
    const ang = Math.atan2(pts[1][1] - y0, pts[1][0] - x0) * 180 / Math.PI + 180; const hg = el('g', { transform: `translate(${x0} ${y0}) rotate(${ang})` }, g);
    el('path', { d: 'M30 0 L44 -5 M44 -5 L50 -10 M44 -5 L50 0', stroke: '#e0202a', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, hg);
    el('ellipse', { cx: 6, cy: 0, rx: 30, ry: 24, fill: c2 }, hg); el('ellipse', { cx: 8, cy: 0, rx: 25, ry: 19, fill: c1 }, hg);
    for (const s of [-1, 1]) { el('circle', { cx: 14, cy: 10 * s, r: 7.5, fill: '#fff' }, hg); el('circle', { cx: 17, cy: 10 * s, r: 4, fill: '#111' }, hg); } }
  const tg = el('g', { id: 'toks' }, svg); return tg; }

/* ================= game ================= */
let G = null;
function players() { const n = +S.np || 2, out = []; for (let i = 0; i < n; i++) { const cpu = S.who === 'cpu' && i > 0; out.push({ i, pos: 0, cpu, name: S.who === 'cpu' ? (i === 0 ? T('אתם', 'You') : `${T('מחשב', 'CPU')} ${n > 2 ? i : ''}`.trim()) : `${T('שחקן', 'Player')} ${i + 1}`, tok: (S.chars && S.chars[i]) || TOK[i][0], photo: S.chars && S.chars[i] === 'photo' ? (S.photos || {})[i] : null, col: TOK[i][1] }); } return out; }
function tokXY(pl, pos) { if (pos === 0) { const [x, y] = cellXY(1); return [x - 30 + pl.i * 20, y + 28]; } const [x, y] = cellXY(pos); const same = G.pl.filter(q => q.pos === pos && q.i !== pl.i).length; const off = [[0, 6], [-20, -12], [20, -12], [0, 24]]; const k = G.pl.filter(q => q.pos === pos && q.i < pl.i).length; return same ? [x + off[k][0], y + off[k][1]] : [x, y + 6]; }
function drawTokens() { const g = $('toks'); g.innerHTML = ''; for (const pl of G.pl) { const [x, y] = tokXY(pl, pl.pos); const t = el('g', { transform: `translate(${x} ${y})`, id: 'tk' + pl.i }, g); tokShape(t, pl); } }
function tokShape(t, pl) { el('ellipse', { cx: 0, cy: 22, rx: 22, ry: 8, fill: 'rgba(0,0,0,.25)' }, t); el('circle', { cx: 0, cy: 0, r: 26, fill: pl.col, stroke: '#fff', 'stroke-width': 5 }, t); if (pl.photo) { const cid = 'clp' + pl.i; if (!document.getElementById(cid)) { const svg = document.getElementById('ssvg'); let defs = svg.querySelector('defs'); if (!defs) defs = el('defs', {}, svg); const cp = el('clipPath', { id: cid }, defs); el('circle', { cx: 0, cy: 0, r: 23 }, cp); } const im = el('image', { href: pl.photo, x: -23, y: -23, width: 46, height: 46, 'clip-path': `url(#${cid})`, preserveAspectRatio: 'xMidYMid slice' }, t); }
  else { const e = el('text', { x: 0, y: 11, 'text-anchor': 'middle', 'font-size': 30 }, t); e.textContent = pl.tok; } if (G.cur === pl.i) el('circle', { cx: 0, cy: 0, r: 33, fill: 'none', stroke: '#ffe24a', 'stroke-width': 5, class: 'hl' }, t); }
function plist() { $('plist').innerHTML = G.pl.map(p => `<div class="pl${p.i === G.cur ? ' on' : ''}" style="--c:${p.col}"><i>${p.photo ? `<img src="${p.photo}" alt="">` : p.tok}</i>${p.name} · ${p.pos || 0}</div>`).join(''); }
function turnBar() { const p = G.pl[G.cur]; app.turn(`<span class="chip"><span class="dot" style="background:${p.col}"></span>${p.name} · ${p.cpu ? T('מגלגל…', 'rolling…') : T('גלגלו!', 'roll!')}</span>`); }
/* ---------- character picker ---------- */
let pickTk = null, photoFor = -1;
function pickChars(tk) { pickTk = tk; if (!S.chars) S.chars = []; if (!S.photos) S.photos = {}; let o = document.getElementById('cpick'); if (!o) { o = document.createElement('div'); o.id = 'cpick'; document.body.appendChild(o); const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.id = 'cpFile'; fi.hidden = true; document.body.appendChild(fi); fi.onchange = onPhoto;
    o.onclick = e => { const b = e.target.closest('button'); if (!b) return; app.A.ac(); sfx.step && sfx.step(); const d = b.dataset;
      if (d.e != null) { S.chars[+d.p] = d.e; S.save(); renderPick(); }
      if (d.ph != null) { photoFor = +d.ph; fi.value = ''; fi.click(); }
      if (b.id === 'cpGo') { o.hidden = true; if (app.alive(pickTk)) newGame(pickTk); } }; }
  renderPick(); o.hidden = false; }
function renderPick() { const o = document.getElementById('cpick'); const n = +S.np || 2; let h = `<div class="cpc"><h3>🎭 ${T('בוחרים דמויות', 'Pick your characters')}</h3>`;
  for (let i = 0; i < n; i++) { const cpu = S.who === 'cpu' && i > 0; const cur = S.chars[i] || TOK[i][0]; const nm = S.who === 'cpu' ? (i === 0 ? T('אתם', 'You') : `${T('מחשב', 'CPU')} ${n > 2 ? i : ''}`) : `${T('שחקן', 'Player')} ${i + 1}`;
    h += `<div class="cpr"><div class="cpn" style="--c:${TOK[i][1]}"><i>${cur === 'photo' && S.photos[i] ? `<img src="${S.photos[i]}" alt="">` : cur}</i><b>${nm}</b></div><div class="cpl">${cpu ? '' : `<button class="cpb ph${cur === 'photo' ? ' on' : ''}" data-ph="${i}">📷</button>`}${CHARS.map(e => `<button class="cpb${cur === e ? ' on' : ''}" data-p="${i}" data-e="${e}">${e}</button>`).join('')}</div></div>`; }
  h += `<p class="cpt">${T('📷 אפשר לשים תמונה שלכם בתור הדמות – היא נשארת רק בטלפון', '📷 You can use your own photo as your piece – it stays on your phone')}</p><button class="btn pri" id="cpGo">▶ ${T('יוצאים לדרך!', 'Let’s play!')}</button></div>`; o.innerHTML = h; }
function onPhoto() { const f = this.files && this.files[0]; if (!f || photoFor < 0) return; const url = URL.createObjectURL(f); const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 128; const m = Math.min(im.width, im.height); c.getContext('2d').drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, 128, 128); URL.revokeObjectURL(url); S.photos[photoFor] = c.toDataURL('image/jpeg', .8); S.chars[photoFor] = 'photo'; S.save(); renderPick(); }; im.src = url; }
function newGame(tk) { fit(); G = { pl: players(), cur: 0, tk, busy: false }; drawBoard(); drawTokens(); plist(); startTurn(); }
function startTurn() { if (!G) return; const p = G.pl[G.cur]; turnBar(); plist(); drawTokens(); $('rollBtn').disabled = p.cpu; $('rollBtn').hidden = p.cpu;
  if (p.cpu) setTimeout(() => doRoll(G.tk), 700); }
$('rollBtn').onclick = () => { app.A.ac(); if (G && !G.busy && !G.pl[G.cur].cpu) doRoll(G.tk); };
DIE.el.onclick = () => $('rollBtn').onclick();
async function moveTok(pl, to, mode) { const g = $('tk' + pl.i); if (!g) return; const [x0, y0] = tokXY(pl, pl.pos);
  if (mode === 'snake' || mode === 'ladder') { const path = snakePaths[pl.pos]; const L = path ? path.getTotalLength() : 0; const [x1, y1] = cellXY(to); const dur = mode === 'snake' ? 1100 : 800; const t0 = performance.now();
    await new Promise(res => { const st = () => { const k = Math.min(1, (performance.now() - t0) / dur); let x, y; if (path) { const pt = path.getPointAtLength(L * k); x = pt.x; y = pt.y; } else { x = x0 + (x1 - x0) * k; y = y0 + (y1 - y0) * k; } g.setAttribute('transform', `translate(${x} ${y})`); k < 1 ? requestAnimationFrame(st) : res(); }; st(); });
    pl.pos = to; return; }
  const [x1, y1] = tokXY({ i: pl.i }, to === pl.pos ? to : to); const t0 = performance.now(), dur = 170; pl.pos = -1;
  await new Promise(res => { const st = () => { const k = Math.min(1, (performance.now() - t0) / dur); g.setAttribute('transform', `translate(${x0 + (x1 - x0) * k} ${y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * 34})`); k < 1 ? requestAnimationFrame(st) : res(); }; st(); });
  pl.pos = to; }
async function doRoll(tk) { if (!G || G.busy || !app.alive(tk)) return; G.busy = true; $('rollBtn').disabled = true; const p = G.pl[G.cur]; const v = roll(); sfx.roll(); DIE.set(v, true); await sleep(750); if (!app.alive(tk)) return;
  app.hint(`${p.name}: ${v}`);
  let pos = p.pos, dir = 1; for (let s = 0; s < v; s++) { if (pos + dir > 100) dir = -1; await moveTok(p, pos + dir, 'step'); pos = p.pos; sfx.step(); if (!app.alive(tk)) return; }
  if (dir === -1 && v > 0) app.hint(T('↩️ נקפצתם אחורה מ-100', '↩️ Bounced back from 100'));
  await sleep(150); if (JUMP[pos]) { const up = !!LADDERS[pos]; if (up) { sfx.good(); app.hint(`🪜 ${p.name} ${T('טיפס בסולם!', 'climbed a ladder!')}`); } else { sfx.bad(); app.hint(`🐍 ${T('אוי! נחש', 'Oh no! A snake')}…`); }
    await moveTok(p, JUMP[pos], up ? 'ladder' : 'snake'); pos = p.pos; }
  drawTokens(); plist(); if (!app.alive(tk)) return;
  if (pos === 100) { G.busy = false; return finish(p); }
  G.busy = false; if (v === 6 && +S.six) { app.hint(`🎲 6! ${p.name} ${T('מגלגל שוב', 'rolls again')}`); startTurn(); return; }
  G.cur = (G.cur + 1) % G.pl.length; startTurn(); }
function finish(p) { drawTokens(); $('rollBtn').hidden = true; S.games++; if (S.who === 'cpu' && p.i === 0) S.myW++; S.save(); const human = !p.cpu;
  app.win({ emo: human ? '🏆' : '🤖', title: S.who === 'cpu' ? (p.i === 0 ? T('ניצחתם!', 'You win!') : `${p.name} ${T('ניצח', 'wins')}`) : `${p.name} ${T('ניצח!', 'wins!')}`, sub: S.who === 'cpu' ? `${T('ניצחונות שלך', 'Your wins')}: ${S.myW} / ${S.games}` : '', good: human }); }

$('loading').hidden = true;
window.__sl = { get G() { return G; }, drawTokens, plist, LADDERS, SNAKES, doRoll, app };
