// Shared shell for the classic board games: title screen, rules sheet, turn bar, dice, win screen, sounds.
import { $, T, EN, RTL, store, audio, toast, ICO, hubButtons, soundButton } from './kit.js';
export { $, T, EN, toast };

export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };

export function makeApp(cfg) {
  const S = store(cfg.key, Object.assign({ mode: 'cpu', diff: 'normal', w: 0, l: 0, wins: [0, 0] }, cfg.defaults || {}));
  const A = audio(S);
  const sfx = {
    click() { A.tone(720, .05, 'triangle', .05); },
    roll() { for (let i = 0; i < 7; i++) A.noise(.05, 'bandpass', 1800 + Math.random() * 1600, 2, .07, i * .07); A.tone(260, .06, 'square', .02, .5); },
    place() { A.noise(.06, 'bandpass', 900, 3, .16); A.tone(180, .07, 'sine', .08); buzz(8); },
    step() { A.tone(560 + Math.random() * 120, .05, 'triangle', .045); },
    take() { A.noise(.09, 'bandpass', 1400, 2, .18); A.tone(420, .12, 'square', .04, 0, 160); buzz(25); },
    good() { [523, 659, 784].forEach((f, i) => A.tone(f, .12, 'triangle', .06, i * .07)); },
    bad() { A.tone(260, .2, 'sawtooth', .04, 0, 140); },
    win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => A.tone(f, .18, 'triangle', .07, i * .11)); buzz(60); },
    lose() { [392, 330, 262].forEach((f, i) => A.tone(f, .25, 'triangle', .06, i * .18)); },
  };
  const app = { S, A, sfx, cfg };

  /* ---------- DOM ---------- */
  const root = document.createElement('div');
  root.innerHTML = `
<section class="scr" id="title">
  <button class="rb homeT" id="homeT" hidden></button><button class="rb" id="sndBtn" style="position:absolute;top:max(12px,env(safe-area-inset-top));inset-inline-end:12px"></button>
  <h1 class="logo"><span class="a">${cfg.logo[0]}</span><span class="b">${cfg.logo[1]}</span></h1>
  <p class="sub">${cfg.sub}</p>
  <div id="boxes" style="display:contents"></div>
  <div class="tbtns"><button id="rulesBtn">📖 ${T('חוקי המשחק', 'How to play')}</button><button class="big" id="playBtn">▶ ${T('שחקו!', 'Play!')}</button></div>
  <div id="score"></div>
</section>
<div id="game" hidden>
  <div id="gbar"><button class="rb" id="exitBtn" aria-label="menu">✕</button><div id="turn"></div><button class="rb" id="helpBtn" aria-label="rules">?</button><button class="rb" id="snd2"></button></div>
  <div id="stagebox"><div id="hint"></div></div>
</div>
<div class="sheet" id="winS" hidden><div class="card"><div class="emo"></div><h3></h3><p></p><div class="row"><button class="btn" id="wMenu">${T('תפריט', 'Menu')}</button><button class="btn pri" id="wAgain">${T('🔁 עוד משחק', '🔁 Play again')}</button></div></div></div>
<div class="sheet" id="exitS" hidden><div class="card"><div style="font-size:46px">🚪</div><h3>${T('לצאת מהמשחק?', 'Leave the game?')}</h3><p>${T('המשחק הנוכחי לא יישמר', 'This game won’t be saved')}</p><div class="row"><button class="btn" id="xNo">${T('להמשיך לשחק', 'Keep playing')}</button><button class="btn pri" id="xYes">${T('יציאה', 'Leave')}</button></div></div></div>
<div id="toast"></div>`;
  while (root.firstChild) document.body.appendChild(root.firstChild);
  app.stage = $('stagebox');

  /* ---------- title options ---------- */
  const boxes = [];
  if (cfg.modes !== false) boxes.push({ k: 'mode', t: T('👥 מי משחק?', '👥 Who’s playing?'), opts: [['cpu', `🤖 ${T('נגד המחשב', 'vs Computer')}`, T('לבד', 'solo')], ['2p', `👥 ${T('שני שחקנים', '2 players')}`, T('על אותו מכשיר', 'same device')]] });
  if (cfg.diffs !== false) boxes.push({ k: 'diff', t: T('🤖 רמת המחשב', '🤖 Computer level'), opts: [['easy', T('😊 קל', '😊 Easy')], ['normal', T('🙂 רגיל', '🙂 Normal')], ['hard', T('🔥 קשה', '🔥 Hard')]], show: () => S.mode === 'cpu' });
  (cfg.extras || []).forEach(b => boxes.push(b));
  const bx = $('boxes');
  boxes.forEach(b => { const d = document.createElement('div'); d.className = 'box'; d.innerHTML = `<h4>${b.t}</h4><div class="seg">${b.opts.map(o => `<button data-v="${o[0]}">${o[1]}${o[2] ? `<small>${o[2]}</small>` : ''}</button>`).join('')}</div>`; b.el = d; bx.appendChild(d);
    d.querySelector('.seg').onclick = e => { const btn = e.target.closest('button'); if (!btn) return; A.ac(); const v = btn.dataset.v; S[b.k] = isNaN(+v) || v === '' ? v : +v; S.save(); sfx.click(); syncTitle(); }; });
  function syncTitle() { boxes.forEach(b => { b.el.hidden = b.show ? !b.show() : false; b.el.querySelectorAll('button').forEach(btn => btn.setAttribute('aria-pressed', String(String(S[b.k]) === btn.dataset.v))); });
    $('score').textContent = cfg.scoreText ? cfg.scoreText(S) : (S.mode === 'cpu' ? `🏆 ${T('נגד המחשב', 'vs Computer')}: ${S.w} – ${S.l}` : ''); }
  app.syncTitle = syncTitle;

  /* ---------- rules ---------- */
  app.showRules = () => { const R = cfg.rules; const o = document.createElement('div'); o.className = 'rules';
    o.innerHTML = `<div class="rbx" dir="${RTL ? 'rtl' : 'ltr'}"><div class="ic">${R.icon}</div><h3>${R.title}</h3>${R.items.map(r => `<div class="r"><i>${r[0]}</i><div><b>${r[1]}</b><span>${r[2]}</span></div></div>`).join('')}<button class="btn pri">${T('הבנתי, בואו נשחק!', 'Got it, let’s play!')}</button></div>`;
    o.onclick = e => { if (e.target === o || e.target.tagName === 'BUTTON') { o.remove(); S.seenRules = 1; S.save(); } }; document.body.appendChild(o); sfx.click(); };
  $('rulesBtn').onclick = () => { A.ac(); app.showRules(); };
  $('helpBtn').onclick = () => { A.ac(); app.showRules(); };

  /* ---------- flow ---------- */
  let token = 0; app.alive = t => t === token;
  app.start = () => { token++; $('title').hidden = true; $('winS').hidden = true; $('game').hidden = false; app.hint(''); cfg.onStart(token); };
  app.toTitle = () => { token++; cfg.onStop && cfg.onStop(); $('game').hidden = true; $('winS').hidden = true; $('exitS').hidden = true; $('title').hidden = false; syncTitle(); };
  $('playBtn').onclick = () => { A.ac(); sfx.click(); if (!S.seenRules) { app.showRules(); const iv = setInterval(() => { if (!document.querySelector('.rules')) { clearInterval(iv); app.start(); } }, 150); } else app.start(); };
  $('exitBtn').onclick = () => { sfx.click(); $('exitS').hidden = false; };
  $('xNo').onclick = () => { $('exitS').hidden = true; };
  $('xYes').onclick = () => { app.toTitle(); };
  $('wMenu').onclick = () => app.toTitle();
  $('wAgain').onclick = () => { sfx.click(); app.start(); };

  app.turn = html => { $('turn').innerHTML = html; };
  app.hint = txt => { const h = $('hint'); h.textContent = txt || ''; h.style.display = txt ? '' : 'none'; };
  app.win = ({ emo, title, sub, good = true }) => { setTimeout(() => { $('winS').querySelector('.emo').textContent = emo; $('winS').querySelector('h3').textContent = title; $('winS').querySelector('p').textContent = sub || ''; $('winS').hidden = false; if (good) { sfx.win(); confetti(); } else sfx.lose(); }, 500); };
  app.record = (who) => { if (S.mode === 'cpu') { if (who === 0) S.w++; else S.l++; } else S.wins[who] = (S.wins[who] || 0) + 1; S.save(); };

  $('homeT').innerHTML = ICO.home(cfg.deep || '#2a1c10'); hubButtons(['homeT'], A);
  soundButton('sndBtn', S, A, cfg.deep || '#2a1c10'); soundButton('snd2', S, A, cfg.deep || '#2a1c10');
  const s2 = $('snd2'), s1 = $('sndBtn'); const o1 = s1.onclick, o2 = s2.onclick; s1.onclick = () => { o1(); s2.innerHTML = s1.innerHTML; }; s2.onclick = () => { o2(); s1.innerHTML = s2.innerHTML; };
  syncTitle();
  return app;
}

export function confetti() { const c = document.createElement('div'); c.className = 'conf'; const cols = ['#ff4d6d', '#ffd23f', '#3ec1ff', '#5ae08a', '#b46aff', '#ff9a3c'];
  for (let i = 0; i < 70; i++) { const p = document.createElement('i'); p.style.left = Math.random() * 100 + '%'; p.style.background = cols[i % cols.length]; p.style.animationDuration = 1.6 + Math.random() * 1.6 + 's'; p.style.animationDelay = Math.random() * .6 + 's'; p.style.transform = `rotate(${Math.random() * 360}deg)`; c.appendChild(p); }
  document.body.appendChild(c); setTimeout(() => c.remove(), 4000); }

/* ---------- dice ---------- */
const PIPS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const FACE_T = { 1: 'translateZ(calc(var(--s)/2))', 6: 'rotateY(180deg) translateZ(calc(var(--s)/2))', 2: 'rotateY(90deg) translateZ(calc(var(--s)/2))', 5: 'rotateY(-90deg) translateZ(calc(var(--s)/2))', 3: 'rotateX(90deg) translateZ(calc(var(--s)/2))', 4: 'rotateX(-90deg) translateZ(calc(var(--s)/2))' };
const SHOW = { 1: [0, 0], 6: [0, 180], 2: [0, -90], 5: [0, 90], 3: [-90, 0], 4: [90, 0] };
export function makeDie(size = 46, red = false) {
  const el = document.createElement('div'); el.className = 'die'; el.style.setProperty('--s', size + 'px');
  const cube = document.createElement('div'); cube.className = 'cube'; el.appendChild(cube);
  for (let v = 1; v <= 6; v++) { const f = document.createElement('div'); f.className = 'f' + (red ? ' red' : ''); f.style.transform = FACE_T[v]; f.innerHTML = PIPS[v].map(p => `<s style="--a:${Math.ceil(p / 3)}/${(p - 1) % 3 + 1}"></s>`).join(''); cube.appendChild(f); }
  let spins = 0; const d = { el, v: 1,
    set(v, anim = true) { d.v = v; spins += anim ? 2 : 0; const [rx, ry] = SHOW[v]; cube.style.transition = anim ? '' : 'none'; cube.style.transform = `rotateX(${rx + spins * 360}deg) rotateY(${ry + spins * 180 * 2}deg)`; if (!anim) { void cube.offsetWidth; cube.style.transition = ''; } },
    used(b) { el.classList.toggle('used', !!b); } };
  d.set(1 + Math.floor(Math.random() * 6), false);
  return d;
}
export const roll = () => 1 + Math.floor(Math.random() * 6);
