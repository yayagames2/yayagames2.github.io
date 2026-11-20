import { THREE, $, V3, C, clamp, lerp, rng, T, EN, store, engine, studioEnv, std, cnv, ctex, particles, CONFETTI, audio, toast, ICO, hubButtons, soundButton, qualityButton, starsHTML, cutie, shadowAll } from '../lib/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const S = store('liar-save2', { stars: {}, tier: 0 });
const E = engine(S, { fov: 32, bloom: [.3, .5, 1.25], exposure: 1, bg: '#1b1730', vignette: .35 });
const { scene, camera, renderer } = E; studioEnv(E, '#fff4e8', '#3a3060', .32);
const A = audio(S); const FX = particles(E, 600);

/* ---------- data ---------- */
const ROSTER = [
  ['נועה', 'Noa', 'f', '#f2c3a0', '#ff6fb5', '#5a3018', 1], ['איתי', 'Itai', 'm', '#e8b48a', '#3a8bff', '#2a1a10', 0], ['מאיה', 'Maya', 'f', '#c98a5e', '#ffb31a', '#1a1010', 1], ['יואב', 'Yoav', 'm', '#f5d0b0', '#2fd3a5', '#c8902a', 0],
  ['תמר', 'Tamar', 'f', '#f7d2b4', '#a46bff', '#c84a2a', 1], ['עומר', 'Omer', 'm', '#a8704a', '#ff8a3d', '#1a1010', 0], ['שירה', 'Shira', 'f', '#f2c3a0', '#5fd0ff', '#e8c070', 1], ['דניאל', 'Daniel', 'm', '#e8b48a', '#8bd34a', '#5a3018', 0],
  ['ליה', 'Lia', 'f', '#d89a70', '#ff5a6a', '#3a2010', 1], ['גיא', 'Guy', 'm', '#f5d0b0', '#ffd23a', '#7a4a2a', 0], ['אלה', 'Ella', 'f', '#f7d2b4', '#2f7aff', '#1a1010', 1], ['נדב', 'Nadav', 'm', '#c98a5e', '#ff6fb5', '#2a1a10', 0],
].map(([he, en, g, skin, shirt, hair, long]) => ({ he, en, g, skin, shirt, hair, long: !!long }));
// [he verb (m), he verb (f), en, emoji, clue, scene, evidence he, evidence en, no-clue he, no-clue en]
const CRIMES = [
  ['אכל את העוגה', 'אכלה את העוגה', 'ate the cake', '🎂', 'cream', 'kitchen', 'מי שאכל את העוגה נשאר עם קצפת על האף', 'Whoever ate the cake has cream on their nose', 'אין לי שום קצפת על הפנים', 'There’s no cream on my face'],
  ['לקח את העוגייה האחרונה', 'לקחה את העוגייה האחרונה', 'took the last cookie', '🍪', 'crumbs', 'kitchen', 'מי שלקח את העוגייה מלוכלך בפירורים על החולצה', 'Whoever took the cookie has crumbs on their shirt', 'אין עליי אף פירור', 'There isn’t a single crumb on me'],
  ['פתח את הכלוב של התוכי', 'פתחה את הכלוב של התוכי', 'opened the parrot’s cage', '🦜', 'feather', 'garden', 'התוכי השאיר נוצה ירוקה על מי שפתח את הכלוב', 'The parrot left a green feather on whoever opened the cage', 'אין עליי שום נוצה', 'I don’t have any feather on me'],
  ['החביא את הכדור בבוץ', 'החביאה את הכדור בבוץ', 'hid the ball in the mud', '⚽', 'mud', 'garden', 'הכדור הוחבא בבוץ – למי שהחביא אותו יש נעליים בוציות', 'The ball was hidden in the mud – the culprit has muddy shoes', 'הנעליים שלי נקיות', 'My shoes are clean'],
  ['שבר את האגרטל', 'שברה את האגרטל', 'broke the vase', '🏺', 'bandage', 'living', 'מי ששבר את האגרטל נשרט ושם פלסטר על הלחי', 'Whoever broke the vase got scratched and wears a plaster on the cheek', 'אין לי פלסטר', 'I don’t have a plaster'],
  ['החביא את השלט מתחת לספה', 'החביאה את השלט מתחת לספה', 'hid the remote under the sofa', '📺', 'dust', 'living', 'מתחת לספה יש אבק – למי שזחל לשם יש כתמי אבק על המכנסיים', 'It’s dusty under the sofa – the culprit has dust patches on their pants', 'המכנסיים שלי נקיים', 'My pants are clean'],
  ['צייר על הקיר', 'ציירה על הקיר', 'drew on the wall', '🖍️', 'paint', 'kids', 'למי שצייר על הקיר נשארו ידיים כחולות מצבע', 'Whoever drew on the wall has blue paint on their hands', 'הידיים שלי נקיות', 'My hands are clean'],
  ['שפך מיץ על השטיח', 'שפכה מיץ על השטיח', 'spilled juice on the rug', '🧃', 'stain', 'kids', 'מי ששפך את המיץ התלכלך – יש לו כתם כתום על החולצה', 'Whoever spilled the juice has an orange stain on their shirt', 'אין לי שום כתם', 'I don’t have any stain'],
];
const PLACES = [['במטבח', 'in the kitchen'], ['בגינה', 'in the garden'], ['בסלון', 'in the living room'], ['בחדר', 'in the bedroom'], ['בחצר', 'in the yard']];
const TIERS = [{ n: T('בלש מתחיל', 'Rookie'), d: T('מתחילים בקלות: מי שיש לו את הרמז? אבל מהר מאוד גם לחשודים אחרים יש אותו רמז – ואחד מהם משקר', 'Start easy: who has the clue? Soon other suspects share it – and one of them is lying') }, { n: T('בלש', 'Detective'), d: T('שלושה חשודים עם אותו רמז, רמזים קטנים יותר ומשפטים על אחרים – חייבים לחשוב', 'Three suspects share the clue, clues get smaller and statements point at each other – you must think') }, { n: T('בלש־על', 'Master'), d: T('רמזים זעירים, לפעמים לכולם יש רמז – רק ההיגיון יפתור את התיק', 'Tiny clues, sometimes everyone has one – only logic cracks the case') }];
const g2 = (p, m, f) => EN ? m : (p.g === 'f' ? f : m);

/* ---------- generator ---------- */
function truth(st, c, l, P) { const { t, s, x } = st; switch (t) { case 'deny': return c !== s; case 'accuse': return c === x; case 'clear': return c !== x; case 'liar': return l === x; case 'honest': return l !== x; case 'alibi': return c !== s && c !== x; case 'noclue': return !P[s].clue; } }
function text(st, P) { const s = P[st.s], x = P[st.x];
  switch (st.t) { case 'deny': return T('אני לא עשיתי את זה!', 'I didn’t do it!'); case 'accuse': return EN ? `${x.en} did it!` : `${x.he} ${g2(x, 'עשה', 'עשתה')} את זה!`; case 'clear': return EN ? `${x.en} didn’t do it.` : `${x.he} לא ${g2(x, 'עשה', 'עשתה')} את זה.`;
    case 'liar': return EN ? `${x.en} is lying!` : `${x.he} ${g2(x, 'משקר', 'משקרת')}!`; case 'honest': return EN ? `${x.en} is telling the truth.` : `${x.he} ${g2(x, 'אומר', 'אומרת')} את האמת.`;
    case 'alibi': return EN ? `I was with ${x.en} ${st.p[1]} the whole time.` : `הייתי עם ${x.he} ${st.p[0]} כל הזמן.`;
    case 'noclue': return EN ? CASE_CR[9] : CASE_CR[8]; } }
let CASE_CR = CRIMES[0];
function gen(i, dOv) {
  // difficulty ramps case by case: only the first 2 cases can be solved by the clue alone
  const R = rng(i * 4813 + 77); const pick = a => a[Math.floor(R() * a.length)]; const tier = Math.floor(i / 10), mode = i < 2 ? 0 : 1;
  const n = i < 4 ? 3 : 4; const crime = CRIMES[(i * 3 + Math.floor(i / 8)) % CRIMES.length]; CASE_CR = crime;
  const decoys = dOv ?? (i < 2 ? 0 : i < 9 ? 1 : i < 22 ? 2 : (i % 2 ? 3 : 2));
  const allow = { deny: 1, accuse: 1, clear: 1, noclue: i >= 5, alibi: i >= 6, liar: i >= 10, honest: i >= 12 };
  const minRel = i < 6 ? 0 : i < 14 ? 1 : 2;
  for (let tries = 0; tries < 9000; tries++) {
    const P = ROSTER.slice().sort(() => R() - .5).slice(0, n).map(p => Object.assign({}, p, { clue: false }));
    const c = Math.floor(R() * n), l = Math.floor(R() * n); P[c].clue = true;
    const others = [...Array(n).keys()].filter(k => k !== c).sort(() => R() - .5); for (let k = 0; k < decoys; k++) P[others[k]].clue = true;
    const sts = [];
    for (let s = 0; s < n; s++) { const want = s !== l; const opts = []; const oth = [...Array(n).keys()].filter(k => k !== s);
      for (const t of ['deny', 'accuse', 'clear', 'liar', 'honest', 'alibi', 'noclue']) { if (mode === 0 && t !== 'deny' && t !== 'accuse' && t !== 'clear') continue; if (mode === 1 && !allow[t]) continue;
        if (t === 'deny' || t === 'noclue') { const st = { t, s }; if (truth(st, c, l, P) === want) opts.push(st); }
        else for (const x of oth) { const st = { t, s, x, p: pick(PLACES) }; if (truth(st, c, l, P) === want) opts.push(st); } }
      if (!opts.length) break; sts.push(pick(opts)); }
    if (sts.length !== n) continue;
    const denies = sts.filter(s => s.t === 'deny').length; if (denies > (i < 6 ? 2 : 1)) continue;
    if (sts.filter(s => !['deny', 'noclue'].includes(s.t)).length < minRel) continue;
    const sols = []; for (let cc = 0; cc < n; cc++) { if (!P[cc].clue) continue; for (let ll = 0; ll < n; ll++) if (sts.every(st => truth(st, cc, ll, P) === (st.s !== ll))) sols.push([cc, ll]); }
    if (!sols.length) continue;
    if (mode === 0) { if (!sols.every(s => s[0] === c)) continue; } else { if (sols.length !== 1) continue;
      // the liar must not be obvious from a single statement: ignoring the clue there must be more than one consistent story
      if (i >= 8) { let alt = 0; for (let cc = 0; cc < n; cc++) for (let ll = 0; ll < n; ll++) if (sts.every(st => truth(st, cc, ll, P) === (st.s !== ll))) alt++; if (alt < 2) continue; } }
    return { i, tier, mode, n, P, c, l, sts, crime, clue: crime[4], scene: crime[5], subtle: i < 10 ? 1 : i < 20 ? .72 : .56 };
  }
  return decoys === 3 ? gen(i, 2) : null;
}

/* ---------- scene ---------- */
const hemi = new THREE.HemisphereLight(C('#f4eaff'), C('#5a4a60'), .7); scene.add(hemi);
const key = new THREE.DirectionalLight(C('#fff4e4'), 2.0); key.position.set(-2, 6, 7); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 4, bottom: -1, near: 1, far: 25 }); key.shadow.bias = -.0005; key.shadow.normalBias = .02; scene.add(key);
const env = new THREE.Group(); scene.add(env);
const M = (geo, c, x, y, z, o = {}) => { const m = new THREE.Mesh(geo, c.isMaterial ? c : std(c, o)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; env.add(m); return m; };
const B = (w, h, d, c, x, y, z, r = .03, o) => M(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.1, h / 2.1, d / 2.1)), c, x, y, z, o);
function wallTex(kind) { const c = cnv(256, 256), g = c.getContext('2d');
  if (kind === 'kitchen') { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#e8f4ff' : '#ffffff'; g.fillRect(x * 32, y * 32, 32, 32); } g.strokeStyle = '#c8d8e8'; for (let k = 0; k <= 256; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 256); g.moveTo(0, k); g.lineTo(256, k); g.stroke(); } }
  else if (kind === 'garden') { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#7cc8ff'); gr.addColorStop(1, '#d8f0ff'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.fillStyle = 'rgba(255,255,255,.9)'; for (const [x, y] of [[50, 50], [180, 80], [120, 30]]) { for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + k * 14, y + (k % 2) * 6, 14, 0, 7); g.fill(); } } }
  else if (kind === 'living') { g.fillStyle = '#ffe4c8'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#ffd2a8'; for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 14, 256); }
  else { g.fillStyle = '#efe4ff'; g.fillRect(0, 0, 256, 256); g.font = '28px Arial'; for (let k = 0; k < 8; k++) { g.fillStyle = ['#ffcf3a', '#ff7ab8', '#5fd0ff'][k % 3]; g.fillText('★', (k * 67) % 230, 30 + (k * 53) % 220); } }
  return ctex(c, kind === 'garden' ? 1 : 3, 1); }
function buildScene(kind) { env.clear();
  const wall = M(new THREE.PlaneGeometry(12, 5), new THREE.MeshStandardMaterial({ map: wallTex(kind), roughness: .9 }), 0, 2.5, -1.4); wall.castShadow = false;
  const floorC = { kitchen: '#e8d8c0', garden: '#6fbf5a', living: '#c99a6a', kids: '#b8d8ff' }[kind];
  const fl = M(new THREE.PlaneGeometry(14, 8), floorC, 0, 0, 0, { roughness: .8 }); fl.rotation.x = -Math.PI / 2; fl.castShadow = false;
  if (kind === 'kitchen') { B(2.6, .9, .6, '#7cc6ff', -2.4, .45, -1.05); B(2.7, .06, .66, '#ffffff', -2.4, .92, -1.05); B(.9, 1.9, .7, '#ffffff', 2.6, .95, -1.0, .08);
    const plate = M(new THREE.CylinderGeometry(.3, .26, .04, 24), '#ffffff', -2.4, .97, -1.0); const cake = M(new THREE.CylinderGeometry(.24, .24, .2, 24, 1, false, 0, Math.PI * 1.55), '#ffd8e4', -2.4, 1.09, -1.0); const top = M(new THREE.CylinderGeometry(.245, .245, .04, 24, 1, false, 0, Math.PI * 1.55), '#ffffff', -2.4, 1.2, -1.0); M(new THREE.SphereGeometry(.04, 10, 8), '#ff2a4a', -2.35, 1.25, -.95);
    const jar = M(new THREE.CylinderGeometry(.14, .14, .28, 18), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: .45, roughness: .05 }), -1.6, 1.09, -1.0); M(new THREE.CylinderGeometry(.15, .15, .05, 18), '#c8904a', -1.6, 1.25, -1.0); }
  if (kind === 'garden') { for (let x = -5.5; x <= 5.5; x += .45) B(.14, .9, .06, '#ffffff', x, .45, -1.2, .02); B(11.5, .08, .05, '#ffffff', 0, .72, -1.17, .01);
    M(new THREE.CylinderGeometry(.12, .18, 1.8, 10), '#8a5a3a', 2.9, .9, -.9); const cr = M(new THREE.IcosahedronGeometry(.85, 1), '#4fae54', 2.9, 2.1, -.9); cr.scale.set(1, .85, 1);
    const cage = new THREE.Group(); cage.position.set(-2.6, 0, -.8); env.add(cage); const bars = std('#d6b25e', { metalness: .8, roughness: .3 });
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; if (k === 2 || k === 3) continue; const b = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .8, 6), bars); b.position.set(Math.cos(a) * .3, 1.1, Math.sin(a) * .3); cage.add(b); }
    const tp = new THREE.Mesh(new THREE.SphereGeometry(.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), bars); tp.position.y = 1.5; cage.add(tp); const bs = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .05, 20), bars); bs.position.y = .7; cage.add(bs); const st = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .7, 8), bars); st.position.y = .35; cage.add(st);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(.22, .5), new THREE.MeshStandardMaterial({ color: '#d6b25e', metalness: .8, wireframe: true })); door.position.set(.42, 1.1, .32); door.rotation.y = 1.1; cage.add(door);
    const parrot = new THREE.Group(); parrot.position.set(-1.7, 1.55, -.9); env.add(parrot); const pb = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 12), std('#3ad35a')); pb.scale.set(.9, 1.2, .9); parrot.add(pb); const ph = new THREE.Mesh(new THREE.SphereGeometry(.09, 14, 10), std('#ff4a3a')); ph.position.y = .17; parrot.add(ph); const bk = new THREE.Mesh(new THREE.ConeGeometry(.03, .07, 8), std('#ffd23a')); bk.position.set(0, .15, .09); bk.rotation.x = 1.6; parrot.add(bk); env.userData.parrot = parrot;
    const mud = M(new THREE.CircleGeometry(.5, 24), '#6a4a2a', 1.8, .006, -.9, { roughness: .2 }); mud.rotation.x = -Math.PI / 2; mud.scale.set(1.2, .6, 1); mud.castShadow = false; }
  if (kind === 'living') { B(2.4, .45, .8, '#5a8aff', -2.2, .35, -1.0, .08); B(2.4, .6, .2, '#5a8aff', -2.2, .7, -1.35, .08); B(1.4, .85, .08, '#1c1c28', 2.4, 1.6, -1.35, .02); B(1.2, .5, .5, '#8a5a3a', 2.4, .25, -1.1);
    for (let k = 0; k < 5; k++) { const sh = M(new THREE.TetrahedronGeometry(.08 + k * .01), '#5fb0d8', 1.1 + k * .14, .05, -.6 + (k % 2) * .15); sh.rotation.set(k, k * 2, 0); } }
  if (kind === 'kids') { const c = cnv(256, 128), g = c.getContext('2d'); g.lineWidth = 6; g.lineCap = 'round'; for (let k = 0; k < 6; k++) { g.strokeStyle = ['#2f6bff', '#ff3b6a', '#2fd36a'][k % 3]; g.beginPath(); g.moveTo(20 + k * 35, 100); for (let j = 0; j < 5; j++) g.lineTo(20 + k * 35 + j * 12, 100 - Math.random() * 80); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const sc = M(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshBasicMaterial({ map: t, transparent: true }), -2.4, 1.6, -1.38); sc.castShadow = false;
    const rug = M(new THREE.CircleGeometry(1.6, 6), '#ffd27a', 0, .005, -.2); rug.rotation.x = -Math.PI / 2; rug.castShadow = false; const stn = M(new THREE.CircleGeometry(.35, 20), '#ff9a1a', 1.4, .01, -.5, { roughness: .2 }); stn.rotation.x = -Math.PI / 2; stn.scale.set(1.3, .7, 1); stn.castShadow = false;
    B(.18, .26, .12, '#ff9a1a', 1.85, .13, -.55); B(.5, .5, .5, '#ff7ab8', 2.7, .25, -1.0, .05); B(.4, .4, .4, '#5fd0ff', 3.0, .7, -1.0, .05); }
}
/* clue visuals on a cutie */
function addClue(P, kind, sc = 1) { const H = P.head, hr = .3, mat = (c, o) => std(c, o); const kids0 = new Set([...H.children, ...P.g.children]);
  const sph = (r, c, par, x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat(c)); m.position.set(x, y, z); par.add(m); return m; };
  if (kind === 'cream') { const b = sph(.065, '#ffffff', H, .02, -.05, hr * 1.04); b.scale.set(1.3, .8, .8); sph(.035, '#ffffff', H, -.08, -.1, hr * .96); sph(.028, '#ff2a4a', H, .03, .0, hr * 1.08); }
  if (kind === 'crumbs') for (let k = 0; k < Math.round(14 * sc); k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.035, .035, .02), mat('#8a5020')); m.position.set((Math.random() - .5) * .3, .45 + Math.random() * .3, .235); m.rotation.z = Math.random() * 3; P.g.add(m); }
  if (kind === 'feather') { const f = new THREE.Group(); const v = new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 8), mat('#2fd35a', { side: THREE.DoubleSide })); v.scale.set(.35, 1.5, .08); f.add(v); const st = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .3, 4), mat('#ffffff')); f.add(st); f.position.set(.12, hr * 1.12, .02); f.rotation.z = -.5; H.add(f); }
  if (kind === 'mud') { P.legs.filter((_, q) => sc > .9 || q === 1).forEach(l => { l.children[1].material = mat('#5a3a1a', { roughness: 1 }); const sp = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), mat('#6a4a2a')); sp.position.set(.03, -.22, .07); l.add(sp); }); }
  if (kind === 'bandage') { const b = new THREE.Mesh(new RoundedBoxGeometry(.14, .055, .02, 2, .01), mat('#f2c896')); b.position.set(hr * .52, -hr * .12, hr * .84); b.rotation.set(0, .55, .35); H.add(b); for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.BoxGeometry(.006, .04, .022), mat('#c89a6a')); d.position.copy(b.position).add(V3(s * .02, 0, .003)); d.rotation.copy(b.rotation); H.add(d); } }
  if (kind === 'dust') P.legs.filter((_, q) => sc > .9 || q === 0).forEach(l => { for (let k = 0; k < 2; k++) { const d = new THREE.Mesh(new THREE.CircleGeometry(.055, 12), new THREE.MeshStandardMaterial({ color: '#c8c8c8', roughness: 1 })); d.position.set((k - .5) * .03, -.12 - k * .1, .085); l.add(d); } });
  if (kind === 'paint') P.arms.filter((_, q) => sc > .9 || q === 0).forEach(a => { a.children[1].material = mat('#2f5bff', { roughness: .3 }); a.children[1].scale.setScalar(1.25); });
  if (kind === 'stain') { const st = new THREE.Mesh(new THREE.CircleGeometry(.11, 14), mat('#ff8a1a', { roughness: .3 })); st.position.set(-.05, .62, .235); st.scale.set(1.2, .9, 1); P.g.add(st); const s2 = st.clone(); s2.scale.set(.4, .4, 1); s2.position.set(.06, .5, .232); P.g.add(s2); }
  if (sc < 1) for (const m of [...H.children, ...P.g.children]) if (!kids0.has(m) && m.isMesh || (!kids0.has(m) && m.isGroup)) m.scale.multiplyScalar(sc);
}
let suspects = [], CASE = null, phase = 'liar', sel = -1, hearts = 3, state = 'title', winT = 0, spots = [], zoomK = -1;
const NONRED = ['#3a8bff', '#2fd3a5', '#ffd23a', '#a46bff', '#8bd34a', '#5fd0ff'];
function buildSuspects() {
  suspects.forEach(s => scene.remove(s.g)); spots.forEach(s => scene.remove(s)); suspects = []; spots = []; const n = CASE.n; const gap = 1.05; buildScene(CASE.scene);
  CASE.P.forEach((p, k) => { let shirt = p.shirt; if (CASE.clue === 'stain' && /ff8a3d|ffb31a|ffd23a/.test(shirt)) shirt = NONRED[k]; if (CASE.clue === 'paint' && /2f7aff|3a8bff/.test(shirt)) shirt = '#ff6fb5';
    const o = { skin: p.skin, shirt, hair: p.hair, long: p.long, bun: p.long && k % 2 === 0, pants: CASE.clue === 'dust' ? ['#2a3a5a', '#3a2a4a', '#1c2a3a', '#3a3040'][k % 4] : ['#3b4b6b', '#5a4a3a', '#2a3a5a', '#4a3a6a'][k % 4], shoe: '#ffffff' };
    if (k % 3 === 1) o.cap = ['#ff5a6a', '#3aa8ff', '#5fd36a'][k % 3]; if (k % 4 === 2) o.glasses = '#1c1c28';
    if (CASE.clue === 'feather' && o.cap) { o.cap = null; }
    const P = cutie(o); P.g.position.set((k - (n - 1) / 2) * gap, 0, 0); P.baseY = 0; scene.add(P.g); if (p.clue) addClue(P, CASE.clue, CASE.subtle); shadowAll(P.g, true, false); suspects.push(P);
    const sp = new THREE.Mesh(new THREE.CircleGeometry(.42, 32), new THREE.MeshBasicMaterial({ color: '#fff3c0', transparent: true, opacity: .18, depthWrite: false })); sp.rotation.x = -Math.PI / 2; sp.position.set(P.g.position.x, .01, 0); scene.add(sp); spots.push(sp); });
}
/* ---------- UI ---------- */
const COLS = ['#ff6fb5', '#3a8bff', '#ffb31a', '#2fd3a5'];
function nm(p) { return EN ? p.en : p.he; }
function renderPanel() {
  $('qTxt').textContent = phase === 'liar' ? T('🤥 מי משקר?', '🤥 Who is lying?') : CASE.mode === 0 ? T('🕵️ מי עשה את זה?', '🕵️ Who did it?') : T('🕵️ ומי עשה את זה?', '🕵️ And who did it?');
  $('stList').innerHTML = CASE.sts.map((st, k) => `<button class="sc" data-k="${k}" aria-pressed="${sel === k}"><i style="background:${COLS[k]}">${nm(CASE.P[k]).slice(0, 1)}</i><span><b>${nm(CASE.P[k])}:</b> ״${text(st, CASE.P)}״</span></button>`).join('');
  $('accBtn').disabled = sel < 0; $('accBtn').textContent = sel < 0 ? T('בחרו חשוד', 'Pick a suspect') : (phase === 'liar' ? T('👉 ', '👉 ') + nm(CASE.P[sel]) + T(' משקר/ת!', ' is lying!') : T('👉 ', '👉 ') + nm(CASE.P[sel]) + T(' עשה/תה את זה!', ' did it!'));
  if (!EN && sel >= 0) { const p = CASE.P[sel]; $('accBtn').textContent = '👉 ' + p.he + (phase === 'liar' ? (p.g === 'f' ? ' משקרת!' : ' משקר!') : (p.g === 'f' ? ' עשתה את זה!' : ' עשה את זה!')); }
  $('hearts').textContent = '❤️'.repeat(hearts) + '🤍'.repeat(3 - hearts);
  renderLabels(); }
$('stList').onclick = e => { const b = e.target.closest('[data-k]'); if (!b || state !== 'play') return; select(+b.dataset.k); };
function select(k) { A.ac(); sel = k; A.tone(620 + k * 80, .06, 'triangle', .07); A.voice('hm', [1.4, .9, 1.3, .95][k] || 1); renderPanel(); }
$('accBtn').onclick = () => { if (sel < 0 || state !== 'play') return; const right = phase === 'liar' ? sel === CASE.l : sel === CASE.c;
  if (right) { A.tone(660, .12, 'triangle', .09); A.tone(990, .2, 'triangle', .08, .1);
    if (phase === 'liar') { suspects[sel].setMood('sad'); toast(T('נכון! עכשיו – מי עשה את זה?', 'Right! Now – who did it?')); phase = 'culprit'; sel = -1; renderPanel(); return; }
    return win(); }
  hearts--; A.tone(160, .25, 'square', .06); A.voice('huh', 1.2); const el = $('stList').children[sel]; el.classList.add('bad'); setTimeout(() => el.classList.remove('bad'), 450);
  suspects[sel].setMood('angry'); setTimeout(() => suspects[sel] && suspects[sel].setMood('smile'), 1200);
  if (hearts <= 0) return lose(); toast(CASE.mode === 0 ? T('לא בדיוק… הסתכלו טוב על החשודים 🔍', 'Not quite… look closely at the suspects 🔍') : T('לא בדיוק… בדקו שוב את הרמז והמשפטים', 'Not quite… check the clue and the statements again')); renderPanel(); };
function explain() { const L = CASE.P[CASE.l], Cc = CASE.P[CASE.c]; const ls = text(CASE.sts[CASE.l], CASE.P); const holders = CASE.P.filter(p => p.clue).map(p => EN ? p.en : p.he);
  let s = EN ? `🔍 Clue: ${CASE.crime[7].toLowerCase()} – ${holders.join(', ')}.<br>` : `🔍 הרמז: ${CASE.crime[6]} – ${holders.join(' ו')}.<br>`;
  if (CASE.mode > 0) s += EN ? `<b>${L.en}</b> lied: "${ls}"<br>` : `<b>${L.he}</b> ${L.g === 'f' ? 'שיקרה' : 'שיקר'}: ״${ls}״<br>`;
  s += EN ? `The culprit: <b>${Cc.en}</b>.` : `מי שעשה את זה: <b>${Cc.he}</b>.`; return s; }
function win() { state = 'won'; winT = 0; const s = hearts === 3 ? 3 : hearts === 2 ? 2 : 1; if ((S.stars[CASE.i] || 0) < s) S.stars[CASE.i] = s; S.save();
  suspects.forEach((P, k) => { if (k === CASE.l || (CASE.mode > 0 && k === CASE.c)) P.setMood('sad'); else P.setMood('happy'); }); A.voice('yay', 1.3); [0, 4, 7, 12].forEach((n, k) => A.tone(523 * Math.pow(2, n / 12), .25, 'triangle', .09, k * .1)); FX.burst(V3(0, 2, .5), 70, CONFETTI, 3.5, .07, 1.6, 4);
  setTimeout(() => { $('wT').textContent = [T('פתרתם!', 'Solved!'), T('כל הכבוד, בלש!', 'Well done, detective!'), T('בלש־על! 🕵️', 'Master detective! 🕵️')][s - 1]; $('wP').innerHTML = explain();
    [...$('wStars').children].forEach((e, k) => { e.classList.toggle('on', k < s); e.style.animationDelay = k * .25 + 's'; }); $('wNext').hidden = CASE.i >= 29; $('winSheet').hidden = false; }, 1500); }
function lose() { state = 'lost'; A.voice('aww', 1); setTimeout(() => { $('wT').textContent = T('התיק נסגר בלי פתרון 😅', 'Case closed unsolved 😅'); $('wP').innerHTML = explain(); [...$('wStars').children].forEach(e => e.classList.remove('on')); $('wNext').hidden = true; $('winSheet').hidden = false; }, 600); }

/* labels & tapping on characters */
function renderLabels() { const box = $('labels'); if (!box.children.length || box.children.length !== suspects.length) { box.innerHTML = suspects.map((s, k) => `<div class="lbl" data-k="${k}">${nm(CASE.P[k])}</div>`).join(''); }
  suspects.forEach((P, k) => { const el = box.children[k]; const p = V3(P.g.position.x, -.02, .3).project(camera); el.style.left = (p.x * .5 + .5) * innerWidth + 'px'; el.style.top = (1 - (p.y * .5 + .5)) * innerHeight + 'px'; el.classList.toggle('sel', sel === k); el.style.borderColor = COLS[k]; }); }
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', e => { if (state !== 'play') return; ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  for (let k = 0; k < suspects.length; k++) { if (ray.intersectObject(suspects[k].g, true).length) { select(k); zoomK = zoomK === k ? -1 : k; return; } } zoomK = -1; });

/* ---------- camera ---------- */
function fit() { if (!CASE) return; const W = innerWidth, H = innerHeight; const topPx = $('case').hidden ? 70 : $('case').getBoundingClientRect().bottom + 6; const botPx = $('panel').hidden ? H - 20 : $('panel').getBoundingClientRect().top - 26;
  const band = Math.max(120, botPx - topPx); const th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); const worldH = 1.62, worldW = CASE.n * 1.05 + .3;
  const d = Math.max(worldH * H / (band * 2 * th), worldW / (2 * th * (W / H) * .96)); camBase = d; camera.position.set(0, .85, d); camera.lookAt(0, .78, 0);
  const contentPx = worldH * H / (2 * d * th); const center = Math.max(topPx + band / 2 + 6, botPx - contentPx / 2 - 4); camera.setViewOffset(W, H, 0, H / 2 - center, W, H); camera.updateProjectionMatrix(); }
E.onResize.push(() => setTimeout(fit, 0));

/* ---------- loop ---------- */
let last = performance.now(); const camZ = { x: 0, f: 1 }; let camBase = 8;
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
  suspects.forEach((P, k) => { P.update(t, dt); const s = sel === k && state === 'play'; P.g.scale.setScalar(lerp(P.g.scale.x, s ? 1.08 : 1, dt * 10)); P.head.rotation.y = lerp(P.head.rotation.y, s ? 0 : Math.sin(t * .6 + k) * .25, dt * 3); if (spots[k]) spots[k].material.opacity = lerp(spots[k].material.opacity, s ? .55 : .14, dt * 8); });
  if (CASE) { const fx = zoomK >= 0 && suspects[zoomK] ? suspects[zoomK].g.position.x : 0; const zf = zoomK >= 0 ? .42 : 1; camZ.x = lerp(camZ.x, fx, dt * 5); camZ.f = lerp(camZ.f, zf, dt * 5); camera.position.set(camZ.x, .85 + (1 - camZ.f) * .15, camBase * camZ.f); camera.lookAt(camZ.x, .78 + (1 - camZ.f) * .22, 0); }
  if (CASE && state !== 'title') renderLabels();
  FX.update(dt, 0); A.tick(); E.render(); }

/* ---------- screens ---------- */
let tab = clamp(S.tier || 0, 0, 2);
const unlocked = i => i % 10 === 0 || (S.stars[i - 1] || 0) > 0;
function renderTitle() { $('tabs').innerHTML = TIERS.map((t, k) => `<button data-k="${k}" aria-pressed="${k === tab}">${t.n}</button>`).join(''); $('tdesc').textContent = TIERS[tab].d;
  let h = ''; for (let j = 0; j < 10; j++) { const i = tab * 10 + j, un = unlocked(i), st = S.stars[i] || 0; h += `<button class="lb ${un ? '' : 'lock'}" data-i="${i}" ${un ? '' : 'disabled'}>${un ? i + 1 : '🔒'}<small>${un ? starsHTML(st) : ''}</small></button>`; } $('lgrid').innerHTML = h; }
$('tabs').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; A.ac(); tab = +b.dataset.k; S.tier = tab; S.save(); renderTitle(); };
$('lgrid').onclick = e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; A.ac(); play(+b.dataset.i); };
function play(i) { CASE = gen(i); if (!CASE) { toast('…'); return; } zoomK = -1; phase = CASE.mode === 0 ? 'culprit' : 'liar'; sel = -1; hearts = 3; state = 'play'; buildSuspects(); $('labels').innerHTML = '';
  $('title').hidden = true; $('winSheet').hidden = true; $('hud').hidden = $('case').hidden = $('panel').hidden = false;
  $('lvName').textContent = T('תיק ', 'Case ') + (i + 1); const cr = CASE.crime; CASE_CR = cr; $('caseT').textContent = cr[3] + ' ' + (EN ? `Who ${cr[2]}?` : `מי ${cr[0]}?`) + (CASE.mode ? ' ' + T('רק אחד מהחשודים משקר.', 'Only one suspect is lying.') : '');
  $('caseE').hidden = false; $('caseE').textContent = '🔍 ' + (EN ? cr[7] : cr[6]);
  renderPanel(); setTimeout(fit, 0); A.startMusic({ chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]], bpm: 88, lead: false, vol: .9 });
  if (!S.tut) { toast(T('הסתכלו טוב על החשודים – לחיצה על דמות מגדילה אותה 🔍', 'Look closely at the suspects – tap a character to zoom in 🔍'), 4200); S.tut = 1; S.save(); } }
function showTitle() { state = 'title'; $('title').hidden = false; $('hud').hidden = $('case').hidden = $('panel').hidden = true; $('winSheet').hidden = true; $('labels').innerHTML = ''; renderTitle(); }
$('mapBtn').onclick = () => { tab = CASE.tier; showTitle(); };
$('wMap').onclick = () => { tab = CASE.tier; showTitle(); }; $('wAgain').onclick = () => play(CASE.i); $('wNext').onclick = () => play(CASE.i + 1);
$('mapBtn').innerHTML = ICO.grid('#ff9a1a'); $('homeT').innerHTML = ICO.home('#ff9a1a'); soundButton('sndBtn', S, A, '#ff9a1a'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('tSub').textContent = T('בכל תיק – כמה חשודים, ורק אחד משקר. הקשיבו טוב ופתרו את התעלומה!', 'In every case one suspect is lying. Listen carefully and crack the mystery!');
$('wMap').textContent = T('תיקים', 'Cases'); $('wAgain').textContent = T('שוב', 'Again'); $('wNext').textContent = T('התיק הבא ▶', 'Next case ▶');
setTimeout(() => { E.resize(); CASE = gen(0); buildSuspects(); fit(); showTitle(); $('loading').hidden = true; requestAnimationFrame(frame); window.__liarOK = true; }, 20);
window.__l = { gen, play, get CASE() { return CASE; }, get state() { return state; }, select, acc: () => $('accBtn').click() };
