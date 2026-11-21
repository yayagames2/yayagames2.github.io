import { $, T, EN, store, audio, toast, ICO, hubButtons, soundButton } from '../lib/kit.js';
const S = store('numx-save', { mode: '2p', diff: 'normal', size: 35, wins: [0, 0], cpuW: 0, cpuL: 0 });
const A = audio(S);
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };
const pick = a => a[Math.floor(Math.random() * a.length)];
const PENS = ['#1f3fa8', '#e0303a', '#1a8a4a', '#7a2ac8', '#1c2240', '#d0602a'];
const CPU = { easy: { find: 5.6, cross: .65 }, normal: { find: 4.0, cross: .95 }, hard: { find: 2.8, cross: 1.35 } };

let G = null; // game state
const H = [$('h0'), $('h1')];
const name = i => G && G.mode === 'cpu' ? (i === 0 ? T('אתה', 'You') : T('🤖 מחשב', '🤖 CPU')) : T('שחקן ' + (i + 1), 'Player ' + (i + 1));

/* ---------- title ---------- */
function syncSeg(id, key, val) { document.querySelectorAll(`#${id} button`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[key] === String(val)))); }
function renderTitle() { syncSeg('modeSeg', 'm', S.mode); syncSeg('diffSeg', 'd', S.diff); syncSeg('sizeSeg', 's', S.size); $('diffBox').hidden = S.mode !== 'cpu'; }
$('modeSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; A.ac(); S.mode = b.dataset.m; S.save(); A.tone(700, .06, 'triangle', .05); renderTitle(); };
$('diffSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; A.ac(); S.diff = b.dataset.d; S.save(); A.tone(800, .06, 'triangle', .05); renderTitle(); };
$('sizeSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; A.ac(); S.size = +b.dataset.s; S.save(); A.tone(900, .06, 'triangle', .05); renderTitle(); };
$('playBtn').onclick = () => { A.ac(); start(); };

/* ---------- game ---------- */
function start() { $('title').hidden = true; $('game').hidden = false; $('win').hidden = true; $('game').classList.toggle('cpu', S.mode === 'cpu');
  if (![20, 35, 60].includes(+S.size)) S.size = 35; G = { mode: S.mode, size: +S.size, X: [0, 0], cells: [new Array(+S.size).fill(0), new Array(+S.size).fill(0)], found: [new Set(), new Set()], searcher: Math.random() < .5 ? 0 : 1, target: 0, lock: [0, 0], over: false, cpuT: null, run: false, boards: [layoutBoard(), layoutBoard()] };
  for (const i of [0, 1]) { H[i].querySelector('.who').textContent = name(i); }
  $('midT').textContent = G.mode === 'cpu' ? `${T('אתה', 'You')} ${S.cpuW} : ${S.cpuL} 🤖` : `${S.wins[0]} : ${S.wins[1]}`;
  render(); countdown(); }
function layoutBoard() { const nums = Array.from({ length: 100 }, (_, i) => i + 1).sort(() => Math.random() - .5); const out = []; let k = 0;
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) { const n = nums[k++]; out.push({ n, x: 5 + c * 10 + (Math.random() - .5) * 3, y: 5 + r * 10 + (Math.random() - .5) * 3.4, r: (Math.random() - .5) * 60, s: .82 + Math.random() * .32, col: pick(PENS) }); } return out; }
function newTarget() { const f = G.found[G.searcher]; const left = []; for (let n = 1; n <= 100; n++) if (!f.has(n)) left.push(n); if (!left.length) { f.clear(); return newTarget(); } G.target = pick(left); }
function render() { for (const i of [0, 1]) renderHalf(i); }
function renderHalf(i) { const h = H[i], body = h.querySelector('.body'), role = h.querySelector('.role'); const searching = G.searcher === i;
  role.innerHTML = searching ? `🔍 ${T('מצא את', 'Find')} <b>${G.target}</b>` : `✏️ ${T('ציירו איקסים עם האצבע!', 'Draw X’s with your finger!')}`;
  updProg(i);
  if (searching) { const sz = Math.min(body.clientWidth, body.clientHeight * 1.6) / 10; body.innerHTML = `<div class="paper board${G.lock[i] ? ' lock' : ''}" style="--g:${Math.max(16, sz * .55)}px">${G.boards[i].map(b => `<span class="n${G.found[i].has(b.n) ? ' f' : ''}" data-n="${b.n}" style="left:${b.x}%;top:${b.y}%;--r:${b.r}deg;font-size:${(sz * .38 * b.s).toFixed(1)}px;color:${b.col}">${b.n}</span>`).join('')}</div>`; }
  else { const W = body.clientWidth - 12, Hh = body.clientHeight - 12, N = G.size; let best = null; for (let cols = 4; cols <= 20; cols++) { const rows = Math.ceil(N / cols); const cell = Math.min(W / cols, Hh / rows); if (!best || cell > best.cell) best = { cols, rows, cell }; }
    const cs = Math.floor(best.cell); let cells = ''; for (let k = 0; k < N; k++) cells += `<div class="c" data-k="${k}">${cellSVG(G.cells[i][k])}</div>`;
    body.innerHTML = `<div class="paper"></div><svg class="ink"><polyline points=""/></svg><div class="nb" style="grid-template-columns:repeat(${best.cols},${cs}px);grid-auto-rows:${cs}px;justify-content:center;align-content:center">${cells}</div>`; } }
const XSVG = '<svg viewBox="0 0 100 100"><path d="M15 15 L85 85"/><path d="M85 15 L15 85"/></svg>';
const cellSVG = st => st === 3 ? XSVG : st === 1 ? '<svg viewBox="0 0 100 100"><path d="M15 15 L85 85"/></svg>' : st === 2 ? '<svg viewBox="0 0 100 100"><path d="M85 15 L15 85"/></svg>' : '';
function updProg(i) { const p = H[i].querySelector('.prog'); p.querySelector('span').textContent = `✖ ${G.X[i]}/${G.size}`; p.querySelector('s').style.width = (G.X[i] / G.size * 100) + '%'; }
function countdown() { const ov = $('ov'), t = ov.querySelector('.t'); ov.hidden = false; G.run = false; newTarget(); render();
  const first = name(G.searcher); const seq = [['3', ''], ['2', ''], ['1', ''], [T('צא!', 'GO!'), `🔍 ${first} ${T('מחפש ראשון', 'searches first')}`]]; let k = 0;
  const step = () => { if (k >= seq.length) { ov.hidden = true; G.run = true; cpuPlan(); return; } t.innerHTML = seq[k][0] + (seq[k][1] ? `<span class="s">${seq[k][1]}</span>` : ''); A.tone(k === 3 ? 880 : 440, k === 3 ? .35 : .15, 'square', .06); k++; setTimeout(step, k === 4 ? 900 : 650); }; step(); }
function found(i) { G.found[i].add(G.target); A.tone(784, .1, 'triangle', .08); A.tone(1175, .18, 'triangle', .08, .08); buzz(30); G.run = false; clearTimeout(G.cpuT); clearInterval(G.cpuI);
  setTimeout(() => { for (const j of [0, 1]) H[j].querySelector('.body').classList.add('flip'); A.noise(.3, 'bandpass', 1200, 1, .08, 0, 400);
    setTimeout(() => { G.searcher = 1 - G.searcher; newTarget(); render(); for (const j of [0, 1]) H[j].querySelector('.body').classList.remove('flip'); G.run = true; cpuPlan(); }, 260); }, 380); }
function addX(i, k) { if (G.X[i] >= G.size) return; if (k == null) { k = G.cells[i].findIndex(v => v !== 3); if (k < 0) return; } if (G.cells[i][k] === 3) return; G.cells[i][k] = 3; G.X[i]++; const c = H[i].querySelector(`.nb .c[data-k="${k}"]`); if (c) c.innerHTML = XSVG; updProg(i); A.tone(900, .06, 'triangle', .05); A.noise(.05, 'highpass', 2500 + Math.random() * 1500, 1, .05); if (G.X[i] >= G.size) win(i); }
function stroke(i, pts) { const body = H[i].querySelector('.body'); const nb = body.querySelector('.nb'); if (!nb || pts.length < 2) return; const a = pts[0], b = pts[pts.length - 1]; const mid = pts[Math.floor(pts.length / 2)]; const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  let cell = null; for (const c of nb.children) { const r = c.getBoundingClientRect(); if (mx >= r.left - 4 && mx <= r.right + 4 && my >= r.top - 4 && my <= r.bottom + 4) { cell = c; break; } } if (!cell) return; const r = cell.getBoundingClientRect(); const cs = Math.min(r.width, 60);
  let dx = b[0] - a[0], dy = b[1] - a[1]; if (i === 1 && G.mode === '2p') { dx = -dx; dy = -dy; } if (Math.abs(dx) < cs * .35 || Math.abs(dy) < cs * .35) { cell.classList.remove('nope'); void cell.offsetWidth; cell.classList.add('nope'); return; }
  const type = Math.sign(dx) === Math.sign(dy) ? 1 : 2; const k = +cell.dataset.k; const st = G.cells[i][k]; if (st === 3) return;
  if (st === 0) { G.cells[i][k] = type; cell.innerHTML = cellSVG(type); A.noise(.06, 'highpass', 3000, 1, .05); } else if (st !== type) addX(i, k); }
function win(i) { if (G.over) return; G.over = true; G.run = false; clearTimeout(G.cpuT); clearInterval(G.cpuI);
  if (G.mode === 'cpu') { if (i === 0) S.cpuW++; else S.cpuL++; } else S.wins[i]++; S.save();
  [0, 4, 7, 12, 16].forEach((k, j) => A.tone(523 * Math.pow(2, k / 12), .3, 'triangle', .09, j * .1)); A.voice(G.mode === 'cpu' && i === 1 ? 'aww' : 'yay', 1.3); buzz([60, 40, 120]);
  const w = $('win'); w.className = G.mode === 'cpu' ? 'cpu' : ''; const msg = G.mode === 'cpu' ? (i === 0 ? T('🏆 ניצחת את המחשב!', '🏆 You beat the CPU!') : T('🤖 המחשב ניצח…', '🤖 The CPU won…')) : `🏆 ${name(i)} ${T('ניצח!', 'wins!')}`;
  const sub = G.mode === 'cpu' ? `${S.cpuW} : ${S.cpuL}` : `${S.wins[0]} : ${S.wins[1]}`;
  w.innerHTML = [0, 1].map(() => `<div class="wh"><div><h2>${msg}</h2><p>${T('מילא את כל המחברת באיקסים', 'filled the whole notebook with X’s')} · ${sub}</p><div class="row"><button class="btn pri" data-a="again">🔁 ${T('שוב', 'Again')}</button><button class="btn" data-a="menu">☰ ${T('תפריט', 'Menu')}</button></div></div></div>`).join(''); w.hidden = false; }
$('win').onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; A.ac(); if (b.dataset.a === 'again') start(); else menu(); };
function menu() { if (G) { G.run = false; G.over = true; clearTimeout(G.cpuT); clearInterval(G.cpuI); } $('game').hidden = true; $('win').hidden = true; $('ov').hidden = true; $('title').hidden = false; renderTitle(); }
$('pauseBtn').onclick = () => { A.ac(); menu(); };

/* ---------- input ---------- */
for (const i of [0, 1]) H[i].querySelector('.body').addEventListener('pointerdown', e => { if (!G || !G.run || G.over) return; if (G.mode === 'cpu' && i === 1) return; A.ac();
  if (G.searcher === i) { const el = e.target.closest('.n'); if (!el || G.lock[i]) return; const n = +el.dataset.n;
    if (n === G.target) { el.classList.add('ok'); found(i); }
    else { el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad'); A.tone(150, .18, 'sawtooth', .06); buzz(60); G.lock[i] = 1; const bd = H[i].querySelector('.board'); bd && bd.classList.add('lock'); setTimeout(() => { G.lock[i] = 0; const b2 = H[i].querySelector('.board'); b2 && b2.classList.remove('lock'); }, 650); } }
  else { const body = H[i].querySelector('.body'); try { body.setPointerCapture(e.pointerId); } catch (er) { } inkS[i] = { id: e.pointerId, pts: [[e.clientX, e.clientY]] }; drawInk(i); } });
const inkS = [null, null];
function drawInk(i) { const body = H[i].querySelector('.body'), pl = body.querySelector('.ink polyline'); if (!pl) return; const r = body.getBoundingClientRect(); const st = inkS[i]; if (!st) { pl.setAttribute('points', ''); return; }
  const rot = i === 1 && G.mode === '2p'; pl.setAttribute('points', st.pts.map(([x, y]) => rot ? `${r.right - x},${r.bottom - y}` : `${x - r.left},${y - r.top}`).join(' ')); }
for (const i of [0, 1]) { const body = H[i].querySelector('.body'); body.addEventListener('pointermove', e => { const st = inkS[i]; if (!st || st.id !== e.pointerId) return; st.pts.push([e.clientX, e.clientY]); if (Math.random() < .3) A.noise(.03, 'highpass', 3500 + Math.random() * 1500, 1, .025); drawInk(i); });
  const end = e => { const st = inkS[i]; if (!st || st.id !== e.pointerId) return; inkS[i] = null; drawInk(i); if (G && G.run && !G.over && G.searcher !== i) stroke(i, st.pts); }; body.addEventListener('pointerup', end); body.addEventListener('pointercancel', end); }

/* ---------- CPU ---------- */
function cpuPlan() { if (G.mode !== 'cpu' || !G.run || G.over) return; const d = CPU[S.diff];
  if (G.searcher === 1) { const body = H[1].querySelector('.body'); const mag = document.createElement('div'); mag.className = 'mag'; mag.textContent = '🔍'; body.appendChild(mag); let hops = 0; const t = d.find * (.65 + Math.random() * .7);
    const hop = () => { if (!G.run || G.searcher !== 1) return; const b = pick(G.boards[1]); mag.style.left = b.x + '%'; mag.style.top = b.y + '%'; hops++; };
    hop(); G.cpuI = setInterval(hop, 420);
    G.cpuT = setTimeout(() => { clearInterval(G.cpuI); if (!G.run || G.searcher !== 1) return; const b = G.boards[1].find(q => q.n === G.target); mag.style.left = b.x + '%'; mag.style.top = b.y + '%'; setTimeout(() => { const el = body.querySelector(`.n[data-n="${G.target}"]`); if (el) el.classList.add('ok'); found(1); }, 380); }, t * 1000); }
  else { const iv = 1000 / d.cross; G.cpuI = setInterval(() => { if (!G.run || G.searcher === 1) return; if (Math.random() < .88) addX(1); }, iv); } }

/* ---------- text ---------- */
$('homeT').innerHTML = ICO.home('#1f3fa8'); hubButtons(['homeT'], A); soundButton('sndBtn', S, A, '#1f3fa8');
$('lgA').textContent = T('מצא וסמן', 'FIND &'); document.querySelector('.logo .b').textContent = T('✖ ✖ ✖', 'CROSS'); $('mT').textContent = T('👥 מי משחק?', '👥 Who’s playing?'); $('dT').textContent = T('🤖 רמת המחשב', '🤖 CPU level'); $('sT').textContent = T('📒 גודל המחברת', '📒 Notebook size'); $('hT').textContent = T('❓ איך משחקים', '❓ How to play');
const mb = document.querySelectorAll('#modeSeg button'); mb[0].innerHTML = `👥 ${T('שני שחקנים', '2 players')}<small>${T('על אותו טלפון', 'same phone')}</small>`; mb[1].innerHTML = `🤖 ${T('נגד המחשב', 'vs CPU')}<small>${T('לבד', 'solo')}</small>`;
const db = document.querySelectorAll('#diffSeg button'); db[0].textContent = T('😊 קל', '😊 Easy'); db[1].textContent = T('🙂 רגיל', '🙂 Normal'); db[2].textContent = T('🔥 קשה', '🔥 Hard');
const sb = document.querySelectorAll('#sizeSeg button'); [[T('קצר', 'Short'), 20], [T('רגיל', 'Normal'), 35], [T('ארוך', 'Long'), 60]].forEach(([n, v], k) => sb[k].innerHTML = `${n}<small>${v} ${T('משבצות', 'boxes')}</small>`);
$('how').innerHTML = T('המסך מתחלק לשניים. <b>אחד מחפש</b> מספר בדף המספרים המבולגן, ו<b>השני מצייר איקסים עם האצבע</b> – שני קווים באלכסון בכל משבצת – הכי מהר שאפשר. כשהמספר נמצא – מתחלפים! <b>מי שממלא ראשון את כל המחברת באיקסים – מנצח</b> 🏆<br>טיפ: לחיצה על מספר לא נכון מקפיאה אתכם לרגע.', 'The screen splits in two. <b>One player searches</b> for a number on the messy number page, while <b>the other draws X’s with a finger</b> – two diagonal strokes in each box – as fast as possible. When the number is found – swap! <b>First to fill the whole notebook with X’s wins</b> 🏆<br>Tip: tapping a wrong number freezes you for a moment.');
$('playBtn').textContent = T('▶ שחקו!', '▶ Play!');
addEventListener('resize', () => { if (G && !$('game').hidden) render(); });
renderTitle(); $('loading').hidden = true; window.__nxOK = true;
window.__nx = { get G() { return G; }, start, addX, found, render, S };
