// Reward chest overlay shared by games: shake, open, reveal prizes one by one.
// openChest({ kind: 'wood'|'silver'|'gold', title, prizes: [{ ic, name, sub }], A, onDone })
import { T } from './kit.js';
let css = false;
function addCss() { if (css) return; css = true; const s = document.createElement('style'); s.textContent = `
#oaChest{position:fixed;inset:0;z-index:300;background:radial-gradient(circle at 50% 45%,#7a4610,#0e0802 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#fff;text-align:center;padding:20px;font-family:inherit;direction:rtl}
#oaChest h2{margin:0;font-size:28px;font-weight:900;color:#ffe27a;text-shadow:0 3px 0 #6a3a00}
#oaChest .hint{font-weight:800;opacity:.85;font-size:15px}
#oaChest .rays{position:absolute;width:520px;height:520px;left:50%;top:45%;margin:-260px 0 0 -260px;background:repeating-conic-gradient(rgba(255,220,120,.16) 0 10deg,transparent 10deg 20deg);animation:oaspin 14s linear infinite;pointer-events:none;border-radius:50%;-webkit-mask:radial-gradient(circle,#000 30%,transparent 70%);mask:radial-gradient(circle,#000 30%,transparent 70%)}
@keyframes oaspin{to{transform:rotate(360deg)}}
.oaC{position:relative;width:170px;height:140px;filter:drop-shadow(0 12px 18px rgba(0,0,0,.6))}
.oaC .base{position:absolute;bottom:0;left:0;right:0;height:78px;background:linear-gradient(#b06a2a,#6a3a14);border:5px solid var(--band,#3a1e08);border-radius:12px}
.oaC .lid{position:absolute;top:6px;left:-4px;right:-4px;height:64px;background:linear-gradient(#d08a3e,#8a4a1a);border:5px solid var(--band,#3a1e08);border-radius:60px 60px 10px 10px;transform-origin:50% 100%;transition:transform .45s cubic-bezier(.3,1.6,.5,1)}
.oaC .base::before,.oaC .lid::before{content:'';position:absolute;top:0;bottom:0;left:22%;width:12px;background:var(--gold,#ffcf3a)}.oaC .base::after,.oaC .lid::after{content:'';position:absolute;top:0;bottom:0;right:22%;width:12px;background:var(--gold,#ffcf3a)}
.oaC .lock{position:absolute;left:50%;top:58px;width:30px;height:34px;margin-left:-15px;background:linear-gradient(#ffe27a,#d8901a);border:3px solid #6a3a00;border-radius:6px;z-index:2}
.oaC.silver{--band:#4a5466;--gold:#dfe6f0}.oaC.gold{--band:#7a4a00;--gold:#fff3a0}.oaC.gold .base,.oaC.gold .lid{background:linear-gradient(#ffd23a,#c88a10)}
.oaC.shake{animation:oashk .35s infinite}@keyframes oashk{25%{transform:rotate(-6deg) scale(1.04)}75%{transform:rotate(6deg) scale(1.04)}}
.oaC.open .lid{transform:translateY(-46px) rotate(-28deg)}.oaC.open .lock{opacity:0}
.oaP{width:170px;min-height:200px;border-radius:18px;background:radial-gradient(circle at 50% 35%,#ffffff,#dfe8ff 70%,#aab8e0);border:4px solid #ffcf3a;position:relative;animation:oapop .45s cubic-bezier(.3,1.6,.5,1);box-shadow:0 0 30px rgba(255,210,80,.6);color:#1a2a5a;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px 10px;gap:6px}
.oaP .ic{font-size:72px;line-height:1}.oaP b{font-size:18px;font-weight:900}.oaP small{font-size:13px;font-weight:800;opacity:.75}
.oaP .nw{position:absolute;top:-14px;right:-14px;background:linear-gradient(#ff5a8a,#d81a5a);color:#fff;font-weight:900;font-size:14px;border-radius:999px;padding:5px 10px;border:3px solid #fff}
@keyframes oapop{0%{transform:scale(.2) rotateY(90deg)}100%{transform:scale(1) rotateY(0)}}`; document.head.appendChild(s); }
export function openChest(o) { addCss(); const A = o.A; const tone = (f, d, w, v, t) => { try { A && A.tone(f, d, w, v, t); } catch (e) { } };
  const el = document.createElement('div'); el.id = 'oaChest'; if (document.documentElement.dir === 'ltr') el.style.direction = 'ltr';
  const KN = { wood: T('תיבת עץ', 'Wooden Chest'), silver: T('תיבת כסף', 'Silver Chest'), gold: T('תיבת זהב!', 'Golden Chest!') };
  el.innerHTML = `<div class="rays"></div><h2>${o.title || KN[o.kind]}</h2><div class="box"><div class="oaC ${o.kind}"><div class="base"></div><div class="lid"></div><div class="lock"></div></div></div><div class="hint">${T('👆 הקישו כדי לפתוח', '👆 Tap to open')}</div>`;
  document.body.appendChild(el); const h2 = el.querySelector('h2'), box = el.querySelector('.box'), hint = el.querySelector('.hint'); let step = -1, busy = false; tone(520, .12, 'triangle', .05);
  el.onclick = () => { if (busy) return; try { A && A.ac(); } catch (e) { }
    if (step === -1) { busy = true; const c = el.querySelector('.oaC'); c.classList.add('shake'); setTimeout(() => { c.classList.remove('shake'); c.classList.add('open'); tone(660, .15, 'triangle', .07); tone(880, .15, 'triangle', .07, .1); tone(1320, .3, 'triangle', .06, .2); try { navigator.vibrate && navigator.vibrate(40); } catch (e) { } busy = false; step = 0; setTimeout(() => el.onclick(), 650); }, 750); return; }
    if (step < o.prizes.length) { const p = o.prizes[step]; h2.textContent = p.title || T('הפתעה!', 'Surprise!'); box.innerHTML = `<div class="oaP">${p.isNew ? `<span class="nw">${T('חדש!', 'NEW!')}</span>` : ''}<span class="ic">${p.ic}</span><b>${p.name}</b>${p.sub ? `<small>${p.sub}</small>` : ''}</div>`;
      hint.textContent = (step + 1) + '/' + o.prizes.length + ' · ' + (step + 1 < o.prizes.length ? T('👆 הבא', '👆 Next') : T('👆 סיום', '👆 Done')); tone(900, .12, 'square', .04); tone(1350, .18, 'triangle', .05, .08); step++; return; }
    el.remove(); o.onDone && o.onDone(); }; }
