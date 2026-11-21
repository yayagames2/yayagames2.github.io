import { THREE, $, V3, C, clamp, lerp, rnd, T, EN, store, engine, studioEnv, std, shadowAll, cnv, ctex, particles, CONFETTI, audio, toast, ICO, hubButtons, soundButton, qualityButton } from '../lib/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const S = store('claw-save', { coins: 15, coinT: Date.now(), got: {}, mach: 0 });
const E = engine(S, { fov: 40, bloom: [.45, .5, 1.1], exposure: 1.05, bg: '#1a0f33' });
const { scene, camera, renderer } = E;
studioEnv(E, '#ffe8f6', '#5a3a7a', .3);
const A = audio(S); const FX = particles(E, 900);

/* ---------- plush catalogue ---------- */
const RN = [T('רגיל', 'Common'), T('נדיר', 'Rare'), T('אפי', 'Epic'), T('אגדי', 'Legendary')], RC = ['#7a8aa8', '#3a8bff', '#a24bff', '#ffb31a'];
const MACH = [
  { id: 'zoo', n: T('חברי הגן', 'Zoo Friends'), ic: '🐻', col: '#ff5fa2', glass: '#ffd0e6', wall: ['#ffe1ee', '#ffc2db'], toys: [
    ['bear', T('דובי', 'Teddy'), '#c98a5a', '#f2d0a8', 'round', '', 0], ['bunny', T('ארנבונית', 'Bunny'), '#f6f1ec', '#ffc8d6', 'long', '', 0], ['kitty', T('חתלתול', 'Kitty'), '#ffa24a', '#ffe8c8', 'cat', 'tail', 0],
    ['frog', T('צפרדעון', 'Froggy'), '#7ad35a', '#d8f5b8', 'bulge', '', 0], ['pig', T('חזרזירה', 'Piggy'), '#ffb0c0', '#ffd8e0', 'cat', 'snout', 0], ['chick', T('אפרוח', 'Chick'), '#ffd84a', '#fff0a8', 'none', 'beak', 0],
    ['panda', T('פנדה', 'Panda'), '#f8f8f4', '#ffffff', 'round', 'patches', 1], ['fox', T('שועלון', 'Foxy'), '#ff7a2a', '#ffffff', 'cat', 'tail', 1], ['uni', T('חד־קרן', 'Unicorn'), '#fff4fb', '#ffe0f4', 'cat', 'horn', 2], ['gbear', T('דובי הזהב', 'Golden Teddy'), '#ffcf3a', '#fff2b0', 'round', 'gold', 3]] },
  { id: 'sea', n: T('חברי הים', 'Ocean Pals'), ic: '🐙', col: '#2fb5ff', glass: '#c8ecff', wall: ['#d8f2ff', '#b0e2ff'], toys: [
    ['fish', T('דגיג', 'Fishy'), '#4fa8ff', '#c8e8ff', 'fins', '', 0], ['octo', T('תמנונית', 'Octo'), '#b07aff', '#e8d8ff', 'none', 'tentacles', 0], ['crab', T('סרטן', 'Crabby'), '#ff5a4a', '#ffd0c8', 'none', 'claws', 0],
    ['turtle', T('צבצב', 'Turtle'), '#6ad38a', '#e8f8d0', 'none', 'shell', 0], ['peng', T('פינגווין', 'Penguin'), '#2a3550', '#ffffff', 'none', 'beak', 0], ['seal', T('כלבון ים', 'Seal'), '#a8b4c4', '#e4eaf2', 'none', 'whisk', 0],
    ['whale', T('לווייתן', 'Whale'), '#3a7bd5', '#cfe4ff', 'fins', 'spout', 1], ['shark', T('כרישון', 'Sharky'), '#8a9ab0', '#ffffff', 'none', 'fin', 1], ['narw', T('נרוול', 'Narwhal'), '#9fd8ff', '#e8f6ff', 'none', 'horn', 2], ['gocto', T('תמנון הזהב', 'Golden Octo'), '#ffcf3a', '#fff2b0', 'none', 'tentacles-gold', 3]] },
  { id: 'space', n: T('חברי החלל', 'Space Buddies'), ic: '👽', col: '#a24bff', glass: '#e4d0ff', wall: ['#2a1d5a', '#1a1240'], toys: [
    ['alien', T('חייזרון', 'Alien'), '#7dff8a', '#d8ffd8', 'antenna', '', 0], ['robo', T('רובוטון', 'Robo'), '#b8c4d4', '#e8eef6', 'box', 'antenna', 0], ['planet', T('כוכבית', 'Planet'), '#ff9a4a', '#ffd8a8', 'none', 'ring', 0],
    ['star', T('כוכבון', 'Starry'), '#ffe14a', '#fff6b8', 'none', 'points', 0], ['astro', T('חתול חלל', 'Astro Cat'), '#ffffff', '#ffe0ec', 'cat', 'helmet', 0], ['ufo', T('צלחתון', 'UFO'), '#5fd0ff', '#d8f4ff', 'none', 'dome', 0],
    ['moon', T('ירחון', 'Moony'), '#d8d8e4', '#f4f4fa', 'none', 'craters', 1], ['comet', T('שביטון', 'Comet'), '#5f8aff', '#d0dcff', 'none', 'tail-glow', 1], ['gwhale', T('לווייתן גלקטי', 'Galaxy Whale'), '#6a3aff', '#c8b0ff', 'fins', 'stars', 2], ['galien', T('חייזר הזהב', 'Golden Alien'), '#ffcf3a', '#fff2b0', 'antenna', 'gold', 3]] },
];
MACH.push(
  { id: 'candy', kind: 'candy', n: T('מכונת הממתקים', 'Candy Crane'), ic: '🍭', col: '#ff4fa8', glass: '#ffe0f0', wall: ['#fff0f6', '#ffd0e6'], toys: [
    ['lolli', T('סוכרייה על מקל', 'Lollipop'), '#ff5fa2', '#ffffff', 'lolli', '', 0], ['wrap', T('סוכרייה עטופה', 'Wrapped Candy'), '#5ac8ff', '#ffffff', 'wrap', '', 0], ['donut', T('דונאט', 'Donut'), '#e0a060', '#ff8ac8', 'donut', '', 0],
    ['cup', T('קאפקייק', 'Cupcake'), '#ffb0d8', '#7ad8ff', 'cup', '', 0], ['mac', T('מקרון', 'Macaron'), '#a8f0c8', '#ffffff', 'mac', '', 0], ['ice', T('גלידה', 'Ice Cream'), '#ffd0e0', '#e8b070', 'ice', '', 0],
    ['choc', T('פרלין שוקולד', 'Choco Bonbon'), '#6a3a20', '#ffd24a', 'bonbon', '', 1], ['gummy', T('דובון גומי', 'Gummy Bear'), '#ff4a5a', '#ff4a5a', 'gummy', '', 1], ['rlolli', T('לוליפופ קשת', 'Rainbow Lolli'), '#ffffff', '#ffffff', 'lolli', 'rainbow', 2], ['gcup', T('קאפקייק הזהב', 'Golden Cupcake'), '#ffcf3a', '#fff2b0', 'cup', 'gold', 3]] },
  { id: 'duck', kind: 'duck', n: T('ברווזי אמבטיה', 'Rubber Duckies'), ic: '🦆', col: '#ffb81a', glass: '#fff2c8', wall: ['#e8f8ff', '#c8ecff'], toys: [
    ['yel', T('ברווזון', 'Ducky'), '#ffd23a', '', 'duck', '', 0], ['pink', T('ברווזה ורודה', 'Pinky Duck'), '#ff9ac8', '', 'duck', 'bow', 0], ['blue', T('ברווז ים', 'Sailor Duck'), '#5ab8ff', '', 'duck', 'cap', 0],
    ['mint', T('ברווז מנטה', 'Minty Duck'), '#7ae8c0', '', 'duck', '', 0], ['chef', T('ברווז שף', 'Chef Duck'), '#fff6e0', '', 'duck', 'chef', 0], ['cool', T('ברווז מגניב', 'Cool Duck'), '#ffa040', '', 'duck', 'shades', 0],
    ['pirate', T('ברווז פיראט', 'Pirate Duck'), '#ffd23a', '', 'duck', 'pirate', 1], ['queen', T('ברווזת מלכה', 'Queen Duck'), '#c89aff', '', 'duck', 'crown', 1], ['unic', T('ברווזקרן', 'Unicorn Duck'), '#ffffff', '', 'duck', 'horn', 2], ['gduck', T('ברווז הזהב', 'Golden Duck'), '#ffcf3a', '', 'duck', 'gold', 3]] },
  { id: 'ball', kind: 'ball', n: T('כדורי ספורט', 'Ball Blast'), ic: '⚽', col: '#2fc36a', glass: '#d8ffe4', wall: ['#e8ffe8', '#c0f0c8'], toys: [
    ['soc', T('כדורגל', 'Soccer Ball'), '#ffffff', '#1c1c24', 'soccer', '', 0], ['bask', T('כדורסל', 'Basketball'), '#ff7a2a', '#2a1a10', 'lines', '', 0], ['ten', T('כדור טניס', 'Tennis Ball'), '#d8f040', '#ffffff', 'tennis', '', 0],
    ['beach', T('כדור חוף', 'Beach Ball'), '#ff4a5a', '#ffffff', 'beach', '', 0], ['volley', T('כדורעף', 'Volleyball'), '#ffffff', '#3a7bff', 'beach', 'two', 0], ['base', T('כדור בייסבול', 'Baseball'), '#f6f2ea', '#e03030', 'tennis', 'stitch', 0],
    ['bowl', T('כדור באולינג', 'Bowling Ball'), '#3a2aa8', '#1a1a30', 'bowl', '', 1], ['disco', T('כדור דיסקו', 'Disco Ball'), '#d8e0f0', '#ffffff', 'disco', '', 1], ['planet', T('כדור כוכב לכת', 'Planet Ball'), '#6a3aff', '#ffb84a', 'planet', '', 2], ['gball', T('כדור הזהב', 'Golden Ball'), '#ffcf3a', '#1c1c24', 'soccer', 'gold', 3]] });
MACH.forEach(m => m.toys = m.toys.map(([id, n, c, b, ears, extra, rar]) => ({ id: m.id + ':' + id, kind: m.kind || 'plush', n, c, b, ears, extra, rar })));

/* ---------- non-plush prizes ---------- */
const GOLDM = () => new THREE.MeshPhysicalMaterial({ color: '#ffcf3a', roughness: .25, metalness: .9, clearcoat: .8 });
const shiny = c => new THREE.MeshPhysicalMaterial({ color: C(c), roughness: .25, clearcoat: 1, clearcoatRoughness: .15 });
function stripeTex(cols, n, kind) { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  if (kind === 'beach') { for (let i = 0; i < n; i++) { x.fillStyle = cols[i % cols.length]; x.fillRect(i * 256 / n, 0, 256 / n + 1, 128); } }
  else if (kind === 'swirl') { for (let i = 0; i < 12; i++) { x.fillStyle = cols[i % cols.length]; x.beginPath(); x.moveTo(128, 64); x.arc(128, 64, 200, i / 12 * 6.283, (i + 1) / 12 * 6.283); x.fill(); } }
  else if (kind === 'planet') { const g = x.createLinearGradient(0, 0, 0, 128); cols.forEach((cc, i) => g.addColorStop(i / (cols.length - 1), cc)); x.fillStyle = g; x.fillRect(0, 0, 256, 128); for (let i = 0; i < 9; i++) { x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, 10 + i * 13, 256, 4); } }
  else if (kind === 'disco') { for (let i = 0; i < 32; i++) for (let j = 0; j < 16; j++) { const v = 150 + Math.random() * 105; x.fillStyle = `rgb(${v},${v},${Math.min(255, v + 20)})`; x.fillRect(i * 8, j * 8, 7, 7); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function makePrize(def, r) { if (def.kind === 'plush') return plush(def, r); const g = new THREE.Group(); const gold = def.extra === 'gold';
  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x * r, y * r, z * r); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); g.add(m); return m; };
  const sph = (k, ws = 20, hs = 14) => new THREE.SphereGeometry(r * k, ws, hs); const dark = std('#1b1420', { roughness: .2 }), white = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const face = (y, z, s = 1) => { for (const k of [-1, 1]) { add(sph(.09 * s, 10, 8), dark, k * .25 * s, y, z, 1, 1, .6); add(sph(.03 * s, 6, 4), white, k * .25 * s + .03, y + .05, z + .05); } };
  const M = gold ? GOLDM() : shiny(def.c), B = gold ? GOLDM() : shiny(def.b || '#ffffff');
  switch (def.ears) {
    case 'lolli': { const tex = stripeTex(def.extra === 'rainbow' ? ['#ff4a5a', '#ffa040', '#ffe04a', '#5ae08a', '#4ab0ff', '#a86aff'] : [def.c, '#ffffff'], 0, 'swirl'); const disc = add(new THREE.CylinderGeometry(r * .95, r * .95, r * .4, 32), [shiny('#ffffff'), new THREE.MeshPhysicalMaterial({ map: tex, roughness: .2, clearcoat: 1 }), new THREE.MeshPhysicalMaterial({ map: tex, roughness: .2, clearcoat: 1 })], 0, .15, 0, 1, 1, 1, Math.PI / 2); add(new THREE.CylinderGeometry(r * .07, r * .07, r * 1.2, 8), std('#ffffff'), 0, -.85, 0); face(.2, .22); break; }
    case 'wrap': add(sph(.62), M, 0, 0, 0, 1.25, 1, 1); for (const k of [-1, 1]) add(new THREE.ConeGeometry(r * .38, r * .55, 10), B, k * 1.0, 0, 0, 1, 1, 1, 0, 0, k * Math.PI / 2); face(.08, .58); break;
    case 'donut': add(new THREE.TorusGeometry(r * .62, r * .32, 16, 32), shiny(def.c), 0, 0, 0, 1, 1, 1, Math.PI / 2.4); add(new THREE.TorusGeometry(r * .62, r * .3, 12, 32), shiny(def.b), 0, .08, 0, 1, 1, .7, Math.PI / 2.4); for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; add(new THREE.CapsuleGeometry(r * .025, r * .1, 3, 6), std(['#ffffff', '#ffe04a', '#5ac8ff', '#5ae08a'][k % 4]), Math.cos(a) * .62, .3 + Math.sin(a) * .2, Math.sin(a) * .5, 1, 1, 1, a, 0, a); } face(.18, .45, .8); break;
    case 'cup': add(new THREE.CylinderGeometry(r * .62, r * .45, r * .7, 16), gold ? GOLDM() : shiny(def.b), 0, -.45, 0); add(sph(.66), M, 0, .1, 0, 1, .8, 1); add(sph(.46), M, 0, .48, 0, 1, .85, 1); add(sph(.16), gold ? GOLDM() : shiny('#e8203a'), 0, .9, 0); face(.05, .62); break;
    case 'mac': for (const y of [-.32, .32]) add(sph(.7, 24, 12), M, 0, y, 0, 1.1, .45, 1.1); add(new THREE.CylinderGeometry(r * .68, r * .68, r * .22, 24), std('#ffffff', { roughness: .8 }), 0, 0, 0); face(.32, .62, .9); break;
    case 'ice': add(new THREE.ConeGeometry(r * .48, r * 1.0, 14), shiny(def.b), 0, -.55, 0, 1, 1, 1, Math.PI); add(sph(.5), M, 0, .1, 0); add(sph(.42), shiny('#8a5a3a'), 0, .62, 0); add(sph(.12), shiny('#e8203a'), 0, 1.02, 0); face(.12, .46, .9); break;
    case 'bonbon': add(sph(.72), M, 0, 0, 0); for (const k of [-1, 1]) add(new THREE.ConeGeometry(r * .32, r * .5, 10), B, k * .95, 0, 0, 1, 1, 1, 0, 0, k * Math.PI / 2); face(.08, .68); break;
    case 'gummy': { const gm = new THREE.MeshPhysicalMaterial({ color: C(def.c), roughness: .1, transmission: .45, thickness: .5, clearcoat: 1 }); add(sph(.55), gm, 0, -.2, 0); add(sph(.42), gm, 0, .45, 0); for (const k of [-1, 1]) { add(sph(.16), gm, k * .3, .78, 0); add(sph(.18), gm, k * .52, -.1, .1); add(sph(.2), gm, k * .3, -.72, .1); } face(.5, .38, .8); break; }
    case 'duck': { const dm = gold ? GOLDM() : shiny(def.c); add(sph(.68), dm, 0, -.25, 0, 1.15, .85, 1); add(sph(.44), dm, 0, .45, .15); add(sph(.22), shiny('#ff8a1a'), 0, .38, .55, 1.2, .45, 1); add(sph(.22), dm, 0, -.1, -.75, .8, .6, .6, -.6); face(.55, .52, .7);
      const ex = def.extra;
      if (ex === 'bow') add(new THREE.TorusKnotGeometry(r * .12, r * .05, 30, 6), shiny('#ff3a8a'), 0, .85, .1);
      if (ex === 'cap') { add(sph(.4, 16, 8), shiny('#2a4aa8'), 0, .65, .1, 1, .55, 1); add(new THREE.CylinderGeometry(r * .25, r * .25, r * .04, 16), shiny('#2a4aa8'), 0, .66, .45, 1, 1, 1); }
      if (ex === 'chef') { add(new THREE.CylinderGeometry(r * .26, r * .3, r * .35, 16), std('#ffffff'), 0, .92, .1); add(sph(.32), std('#ffffff'), 0, 1.18, .1, 1, .7, 1); }
      if (ex === 'shades') for (const k of [-1, 1]) add(new THREE.CylinderGeometry(r * .13, r * .13, r * .04, 16), dark, k * .18, .57, .5, 1, 1, 1, Math.PI / 2);
      if (ex === 'pirate') { add(new THREE.ConeGeometry(r * .42, r * .38, 3), dark, 0, .9, .1, 1.3, 1, .7); add(new THREE.CylinderGeometry(r * .12, r * .12, r * .04, 16), dark, .18, .57, .52, 1, 1, 1, Math.PI / 2); }
      if (ex === 'crown') for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; add(new THREE.ConeGeometry(r * .07, r * .2, 6), GOLDM(), Math.cos(a) * .22, .9, .15 + Math.sin(a) * .22); }
      if (ex === 'horn') add(new THREE.ConeGeometry(r * .09, r * .45, 12), new THREE.MeshStandardMaterial({ color: '#fff2a8', emissive: C('#ffcf5a'), emissiveIntensity: .5 }), 0, .95, .25, 1, 1, 1, .4);
      break; }
    case 'soccer': add(sph(.95, 28, 20), gold ? GOLDM() : shiny(def.c), 0, 0, 0); { const pm = gold ? std('#8a6a10', { metalness: .8 }) : shiny(def.b); const pts = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [.7, .7, 0], [-.7, -.7, 0], [0, .7, .7], [0, -.7, -.7], [.7, 0, -.7], [-.7, 0, .7]]; for (const [a, b2, c2] of pts) { const v = V3(a, b2, c2).normalize().multiplyScalar(.92); const m = add(new THREE.CircleGeometry(r * .2, 5), pm, v.x, v.y, v.z); m.lookAt(V3(v.x, v.y, v.z).multiplyScalar(5 * r)); } } break;
    case 'lines': add(sph(.95, 28, 20), shiny(def.c), 0, 0, 0); for (const [rx, ry] of [[0, 0], [Math.PI / 2, 0], [0, Math.PI / 2]]) add(new THREE.TorusGeometry(r * .955, r * .025, 6, 40), dark, 0, 0, 0, 1, 1, 1, rx, ry); break;
    case 'tennis': add(sph(.85, 28, 20), shiny(def.c), 0, 0, 0); for (const k of [-1, 1]) add(new THREE.TorusGeometry(r * .62, r * .035, 6, 40), def.extra === 'stitch' ? shiny(def.b) : std('#ffffff'), k * .42, 0, 0, 1, 1, 1, 0, Math.PI / 2); break;
    case 'beach': add(sph(.95, 28, 20), new THREE.MeshPhysicalMaterial({ map: stripeTex(def.extra === 'two' ? [def.c, def.b, '#ffe04a'] : ['#ff4a5a', '#ffffff', '#4ab0ff', '#ffe04a', '#5ae08a', '#ffffff'], 6, 'beach'), roughness: .3, clearcoat: 1 }), 0, 0, 0); break;
    case 'bowl': add(sph(.9, 28, 20), new THREE.MeshPhysicalMaterial({ color: C(def.c), roughness: .1, clearcoat: 1, metalness: .2 }), 0, 0, 0); for (const [x2, y2] of [[-.18, .45], [.18, .45], [0, .22]]) add(new THREE.CylinderGeometry(r * .09, r * .09, r * .1, 12), dark, x2, y2, .85, 1, 1, 1, Math.PI / 2); break;
    case 'disco': add(sph(.92, 32, 20), new THREE.MeshStandardMaterial({ map: stripeTex([], 0, 'disco'), metalness: 1, roughness: .15, flatShading: true }), 0, 0, 0); add(new THREE.CylinderGeometry(r * .04, r * .04, r * .3, 6), std('#888'), 0, 1.05, 0); break;
    case 'planet': add(sph(.78, 28, 20), new THREE.MeshPhysicalMaterial({ map: stripeTex([def.c, '#ff6ac8', def.b], 0, 'planet'), roughness: .4, clearcoat: .6 }), 0, 0, 0); add(new THREE.TorusGeometry(r * 1.1, r * .07, 6, 40), new THREE.MeshStandardMaterial({ color: '#ffe0a8', emissive: C('#ffb84a'), emissiveIntensity: .4 }), 0, 0, 0, 1, 1, .3, Math.PI / 2 - .35); break;
  }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); g.userData.r = r; return g; }

/* ---------- plush builder ---------- */
function plushMat(c, gold) { return gold ? new THREE.MeshPhysicalMaterial({ color: c, roughness: .3, metalness: .85, sheen: .3, clearcoat: .6 }) : new THREE.MeshPhysicalMaterial({ color: c, roughness: .95, sheen: 1, sheenRoughness: .45, sheenColor: C(c).lerp(C('#ffffff'), .55) }); }
function plush(def, r = .3) {
  const g = new THREE.Group(); const gold = def.rar === 3 || def.extra === 'gold' || def.extra === 'tentacles-gold'; const M = plushMat(def.c, gold), B = plushMat(def.b, gold && false);
  const body = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), M); body.scale.set(1, .92, .95); g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(r * .62, 20, 14), B); belly.position.set(0, -r * .22, r * .5); belly.scale.set(1, .9, .5); g.add(belly);
  const dark = std('#1b1420', { roughness: .2 }), white = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(r * .11, 14, 10), dark); e.position.set(s * r * .3, r * .14, r * .86); e.scale.z = .6; g.add(e); const h = new THREE.Mesh(new THREE.SphereGeometry(r * .035, 8, 6), white); h.position.set(s * r * .3 + r * .03, r * .19, r * .93); g.add(h);
    const ch = new THREE.Mesh(new THREE.CircleGeometry(r * .1, 14), new THREE.MeshBasicMaterial({ color: '#ff7a9a', transparent: true, opacity: .55, depthWrite: false })); ch.position.set(s * r * .52, -r * .05, r * .8); ch.lookAt(s * r * 1.6, -r * .1, r * 2.2); g.add(ch);
    const arm = new THREE.Mesh(new THREE.SphereGeometry(r * .22, 12, 10), M); arm.position.set(s * r * .88, -r * .25, r * .2); arm.scale.set(.8, 1, .8); g.add(arm);
    const ft = new THREE.Mesh(new THREE.SphereGeometry(r * .24, 12, 10), M); ft.position.set(s * r * .4, -r * .82, r * .35); ft.scale.set(1, .6, 1.2); g.add(ft); }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(r * .07, r * .018, 6, 12, Math.PI), dark); mouth.rotation.z = Math.PI; mouth.position.set(0, -r * .02, r * .92); g.add(mouth);
  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x * r, y * r, z * r); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); g.add(m); return m; };
  const sph = k => new THREE.SphereGeometry(r * k, 14, 10);
  switch (def.ears) {
    case 'round': for (const s of [-1, 1]) { add(sph(.26), M, s * .55, .72, 0); add(sph(.14), B, s * .55, .72, .12, 1, 1, .5); } break;
    case 'long': for (const s of [-1, 1]) { add(sph(.2), M, s * .32, 1.15, -.05, .7, 2.2, .6, 0, 0, s * -.15); add(sph(.12), B, s * .32, 1.15, .05, .6, 1.8, .4, 0, 0, s * -.15); } break;
    case 'cat': for (const s of [-1, 1]) add(new THREE.ConeGeometry(r * .24, r * .42, 4), M, s * .5, .82, 0, 1, 1, .6, 0, 0, s * -.35); break;
    case 'bulge': for (const s of [-1, 1]) { add(sph(.28), M, s * .38, .7, .2); add(sph(.14), dark, s * .38, .75, .44, 1, 1, .6); } break;
    case 'fins': for (const s of [-1, 1]) add(sph(.3), M, s * 1.0, -.1, -.05, .3, .9, .7, 0, 0, s * .5); break;
    case 'antenna': for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(r * .03, r * .03, r * .5, 6), dark, s * .3, 1.05, 0, 1, 1, 1, 0, 0, s * -.3); add(sph(.1), new THREE.MeshStandardMaterial({ color: def.c, emissive: C(def.c), emissiveIntensity: .8 }), s * .43, 1.32, 0); } break;
    case 'box': for (const s of [-1, 1]) add(new THREE.BoxGeometry(r * .2, r * .34, r * .34), std('#7a8aa0', { metalness: .7, roughness: .3 }), s * .98, .1, 0); break;
  }
  const ex = def.extra;
  if (ex === 'beak') add(new THREE.ConeGeometry(r * .13, r * .26, 8), std('#ff9a1f'), 0, -.02, 1.0, 1, 1, 1, Math.PI / 2, 0, 0);
  if (ex === 'snout') { add(sph(.2), B, 0, -.05, .9, 1.2, .8, .5); for (const s of [-1, 1]) add(sph(.04), dark, s * .08, -.04, 1.0); }
  if (ex === 'tail' || ex === 'tail-glow') add(sph(.3), ex === 'tail-glow' ? new THREE.MeshStandardMaterial({ color: '#bfe0ff', emissive: C('#5f8aff'), emissiveIntensity: 1.2 }) : M, 0, -.3, -1.0, .7, .7, 1.6, -.6);
  if (ex === 'patches') { for (const s of [-1, 1]) { add(sph(.17), dark, s * .3, .14, .8, 1.1, 1.3, .4); } g.children.filter(m => m.geometry && m.geometry.parameters && Math.abs(m.geometry.parameters.radius - r * .26) < 1e-6).forEach(m => m.material = dark); }
  if (ex === 'horn') add(new THREE.ConeGeometry(r * .1, r * .55, 12), new THREE.MeshStandardMaterial({ color: '#fff2a8', emissive: C('#ffcf5a'), emissiveIntensity: .4, roughness: .3 }), 0, 1.05, .25, 1, 1, 1, .35);
  if (ex === 'tentacles' || ex === 'tentacles-gold') for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; add(sph(.16), M, Math.cos(a) * .55, -.85, Math.sin(a) * .55, .8, 1.4, .8); }
  if (ex === 'claws') for (const s of [-1, 1]) { add(sph(.24), M, s * 1.05, .2, .3, 1, .8, .6); add(sph(.12), M, s * 1.15, .38, .4); }
  if (ex === 'shell') add(new THREE.SphereGeometry(r * .95, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), std('#5a9a4a', { roughness: .7 }), 0, .05, -.15, 1.05, .85, 1);
  if (ex === 'whisk') for (const s of [-1, 1]) for (const k of [-1, 1]) add(new THREE.CylinderGeometry(r * .012, r * .012, r * .4, 4), dark, s * .25, -.06 + k * .05, .92, 1, 1, 1, 0, 0, Math.PI / 2 + k * .15 * s);
  if (ex === 'spout') for (let k = 0; k < 3; k++) add(sph(.08), new THREE.MeshStandardMaterial({ color: '#cfefff', emissive: C('#7fd0ff'), emissiveIntensity: .6 }), (k - 1) * .12, 1.05 + (k % 2) * .12, 0);
  if (ex === 'fin') add(new THREE.ConeGeometry(r * .22, r * .5, 4), M, 0, 1.0, -.1, .4, 1, 1);
  if (ex === 'ring') add(new THREE.TorusGeometry(r * 1.25, r * .08, 6, 40), std('#ffe0a8', { roughness: .5 }), 0, 0, 0, 1, 1, .35, Math.PI / 2 - .3);
  if (ex === 'points') for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + Math.PI / 2; add(new THREE.ConeGeometry(r * .22, r * .45, 8), M, Math.cos(a) * .95, Math.sin(a) * .95, 0, 1, 1, .6, 0, 0, a - Math.PI / 2); }
  if (ex === 'helmet') add(new THREE.SphereGeometry(r * 1.18, 24, 16), new THREE.MeshPhysicalMaterial({ color: '#dff4ff', transparent: true, opacity: .25, roughness: .05, depthWrite: false }), 0, .05, 0);
  if (ex === 'dome') { add(new THREE.CylinderGeometry(r * 1.3, r * 1.1, r * .3, 28), std('#c8d4e4', { metalness: .8, roughness: .25 }), 0, -.45, 0); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; add(sph(.07), new THREE.MeshBasicMaterial({ color: C('#ffe14a').multiplyScalar(2) }), Math.cos(a) * 1.2, -.45, Math.sin(a) * 1.2); } }
  if (ex === 'craters') for (let k = 0; k < 5; k++) add(sph(.12), std('#b8b8c8', { roughness: 1 }), rnd(-.6, .6), rnd(.2, .7), rnd(.5, .8), 1, 1, .4);
  if (ex === 'stars') for (let k = 0; k < 8; k++) add(sph(.05), new THREE.MeshBasicMaterial({ color: C('#ffffff').multiplyScalar(2) }), rnd(-.8, .8), rnd(-.3, .8), rnd(-.2, .9));
  if (def.id.endsWith(':chick')) add(sph(.12), M, 0, 1.0, 0, .6, 1.4, .6);
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.userData.r = r; return g;
}

/* ---------- arcade room + cabinet ---------- */
const room = new THREE.Group(); scene.add(room); const cab = new THREE.Group(); scene.add(cab);
const W = 1.5, D = 1.1, HGT = 3.1; // inner half sizes / height
const CH = { x0: -W, x1: -W + .72, z0: D - .72, z1: D, h: .55 };
const hemi = new THREE.HemisphereLight(C('#ffe8f6'), C('#3a1a5a'), .45); scene.add(hemi);
const key = new THREE.DirectionalLight(C('#fff2e8'), 1.6); key.position.set(2, 7, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -3, right: 3, top: 4, bottom: -2, near: 1, far: 20 }); key.shadow.bias = -.0005; key.shadow.normalBias = .02; scene.add(key);
const inner = new THREE.PointLight(C('#fff0f8'), 6, 6, 1.5); inner.position.set(0, HGT - .3, .2); scene.add(inner);
let bulbs = [], sign = null, glassM;
function buildRoom() {
  room.clear(); const fl = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), std('#ffffff', { map: (() => { const c = cnv(128, 128), g = c.getContext('2d'); for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? '#2a1a4a' : '#3a2560'; g.fillRect(x * 64, y * 64, 64, 64); } return ctex(c, 14, 14); })(), roughness: .35, metalness: .2 }));
  fl.rotation.x = -Math.PI / 2; fl.position.y = -1.2; fl.receiveShadow = true; room.add(fl);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), std('#231543', { roughness: .9 })); wall.position.set(0, 4, -4); room.add(wall);
  for (const [y, c] of [[2.2, '#ff3fd0'], [5.6, '#2ff3ff']]) { const n = new THREE.Mesh(new THREE.BoxGeometry(30, .06, .06), new THREE.MeshBasicMaterial({ color: C(c).multiplyScalar(2.4) })); n.position.set(0, y, -3.95); room.add(n); }
  for (const x of [-5.2, 5.2]) { const m = new THREE.Group(); m.position.set(x, -1.2, -2.2); const b = new THREE.Mesh(new RoundedBoxGeometry(1.8, 3.6, 1.4, 3, .15), std(x < 0 ? '#3a2a8a' : '#8a1a5a', { roughness: .5 })); b.position.y = 1.8; m.add(b);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1), new THREE.MeshBasicMaterial({ color: C(x < 0 ? '#2ff3ff' : '#ffcf3a').multiplyScalar(1.2) })); scr.position.set(0, 2.5, .71); m.add(scr); room.add(m); }
}
function buildCabinet(mi) {
  cab.clear(); bulbs = []; const M = MACH[mi]; const frameM = new THREE.MeshPhysicalMaterial({ color: M.col, roughness: .35, clearcoat: 1, clearcoatRoughness: .1 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(W * 2 + .5, 1.2, D * 2 + .5, 3, .1), frameM); base.position.y = -.6; cab.add(base);
  const panel = new THREE.Mesh(new RoundedBoxGeometry(W * 2 + .3, .5, .6, 2, .08), std('#2a2040', { roughness: .4 })); panel.position.set(0, -.42, D + .45); panel.rotation.x = .35; cab.add(panel);
  const chuteDoor = new THREE.Mesh(new RoundedBoxGeometry(.7, .5, .06, 2, .03), std('#1a1a28', { roughness: .3 })); chuteDoor.position.set((CH.x0 + CH.x1) / 2, -.7, D + .26); cab.add(chuteDoor);
  const flap = new THREE.Mesh(new THREE.PlaneGeometry(.55, .36), new THREE.MeshBasicMaterial({ color: C('#ffcf3a').multiplyScalar(1.3) })); flap.position.set((CH.x0 + CH.x1) / 2, -.72, D + .30); cab.add(flap);
  for (const x of [-W - .08, W + .08]) for (const z of [-D - .08, D + .08]) { const p = new THREE.Mesh(new RoundedBoxGeometry(.18, HGT + .1, .18, 2, .05), frameM); p.position.set(x, HGT / 2, z); cab.add(p); }
  const top = new THREE.Mesh(new RoundedBoxGeometry(W * 2 + .5, .5, D * 2 + .5, 3, .1), frameM); top.position.y = HGT + .25; cab.add(top);
  const signC = cnv(512, 128), g = signC.getContext('2d'); g.fillStyle = '#1a0f33'; g.fillRect(0, 0, 512, 128); g.font = '900 64px Rubik, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = M.col; g.shadowBlur = 24; g.fillStyle = '#ffffff'; g.fillText(M.ic + ' ' + (M.id === 'zoo' ? 'CLAW ZOO' : M.id === 'sea' ? 'CLAW SEA' : 'CLAW SPACE'), 256, 66);
  const st = new THREE.CanvasTexture(signC); st.colorSpace = THREE.SRGBColorSpace; sign = new THREE.Mesh(new RoundedBoxGeometry(W * 2 + .3, .8, .2, 2, .08), [std('#1a0f33'), std('#1a0f33'), std('#1a0f33'), std('#1a0f33'), new THREE.MeshBasicMaterial({ map: st, color: C('#ffffff').multiplyScalar(1.6) }), std('#1a0f33')]); sign.position.set(0, HGT + .95, D); cab.add(sign);
  for (let k = 0; k < 18; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff3c0' })); const t = k / 17; b.position.set(-W - .1 + t * (W * 2 + .2), HGT + 1.42, D + .05); cab.add(b); bulbs.push(b); const b2 = b.clone(); b2.material = b.material.clone(); b2.position.y = HGT + .48; cab.add(b2); bulbs.push(b2); }
  const wc = cnv(256, 256), wg = wc.getContext('2d'); wg.fillStyle = M.wall[0]; wg.fillRect(0, 0, 256, 256); wg.fillStyle = M.wall[1];
  if (M.id === 'space') { for (let i = 0; i < 70; i++) { wg.fillStyle = Math.random() < .5 ? '#ffffff' : '#a98bff'; wg.beginPath(); wg.arc(Math.random() * 256, Math.random() * 256, Math.random() * 2.4, 0, 7); wg.fill(); } } else if (M.id === 'sea') { wg.lineWidth = 10; wg.strokeStyle = M.wall[1]; for (let y = 20; y < 256; y += 48) { wg.beginPath(); for (let x = 0; x <= 256; x += 8) wg.lineTo(x, y + Math.sin(x / 20) * 8); wg.stroke(); } } else for (let y = 0; y < 256; y += 42) for (let x = 0; x < 256; x += 42) { wg.beginPath(); wg.arc(x + (y / 42 % 2) * 21 + 10, y + 10, 9, 0, 7); wg.fill(); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, HGT), std('#ffffff', { map: ctex(wc, 2, 2), roughness: .9 })); back.position.set(0, HGT / 2, -D); back.receiveShadow = true; cab.add(back);
  for (const s of [-1, 1]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(D * 2, HGT), back.material); sw.rotation.y = -s * Math.PI / 2; sw.position.set(s * W, HGT / 2, 0); sw.receiveShadow = true; cab.add(sw); }
  const flo = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D * 2), std(M.wall[1], { roughness: .95 })); flo.rotation.x = -Math.PI / 2; flo.receiveShadow = true; cab.add(flo);
  // chute walls
  const cw = new THREE.MeshPhysicalMaterial({ color: M.glass, transparent: true, opacity: .35, roughness: .05, depthWrite: false });
  const c1 = new THREE.Mesh(new THREE.BoxGeometry(.04, CH.h, CH.z1 - CH.z0), cw); c1.position.set(CH.x1, CH.h / 2, (CH.z0 + CH.z1) / 2); cab.add(c1);
  const c2 = new THREE.Mesh(new THREE.BoxGeometry(CH.x1 - CH.x0, CH.h, .04), cw); c2.position.set((CH.x0 + CH.x1) / 2, CH.h / 2, CH.z0); cab.add(c2);
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(CH.x1 - CH.x0 - .04, CH.z1 - CH.z0 - .04), new THREE.MeshBasicMaterial({ color: '#0a0612' })); hole.rotation.x = -Math.PI / 2; hole.position.set((CH.x0 + CH.x1) / 2, .004, (CH.z0 + CH.z1) / 2); cab.add(hole);
  const rimC = new THREE.Mesh(new THREE.BoxGeometry(CH.x1 - CH.x0, .05, .05), new THREE.MeshBasicMaterial({ color: C('#ffcf3a').multiplyScalar(2) })); rimC.position.set((CH.x0 + CH.x1) / 2, CH.h, CH.z0); cab.add(rimC);
  // glass
  glassM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: .1, roughness: 0, metalness: 0, envMapIntensity: 1.5, depthWrite: false, side: THREE.DoubleSide });
  const gf = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, HGT), glassM); gf.position.set(0, HGT / 2, D); gf.renderOrder = 8; cab.add(gf);
  const streak = new THREE.Mesh(new THREE.PlaneGeometry(.25, HGT * 1.1), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .06, depthWrite: false })); streak.position.set(.7, HGT / 2, D + .01); streak.rotation.z = .35; cab.add(streak);
  // rails
  const railM = std('#e4e8f0', { metalness: 1, roughness: .2 }); for (const z of [-D + .05, D - .05]) { const r = new THREE.Mesh(new THREE.BoxGeometry(W * 2, .06, .06), railM); r.position.set(0, HGT - .08, z); cab.add(r); }
  shadowAll(cab, true, true); [gf, streak, hole, c1, c2].forEach(m => { m.castShadow = false; });
}
/* claw */
const claw = new THREE.Group(); scene.add(claw); const prongs = [];
const clawM = std('#eef2f8', { metalness: 1, roughness: .18 });
const bridge = new THREE.Mesh(new THREE.BoxGeometry(.08, .08, D * 2 - .1), clawM); scene.add(bridge);
const carriage = new THREE.Mesh(new RoundedBoxGeometry(.3, .16, .3, 2, .04), std('#ffcf3a', { metalness: .6, roughness: .3 })); scene.add(carriage);
const cable = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1, 6), std('#3a3a48', { metalness: .6 })); scene.add(cable);
{ const hub = new THREE.Mesh(new THREE.CylinderGeometry(.13, .16, .2, 20), clawM); claw.add(hub); const cap = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), std('#ff5fa2', { roughness: .3 })); cap.position.y = .1; claw.add(cap);
  for (let k = 0; k < 3; k++) { const piv = new THREE.Group(); piv.rotation.y = k / 3 * Math.PI * 2; const arm = new THREE.Group(); arm.position.set(0, -.08, .12); piv.add(arm);
    const a1 = new THREE.Mesh(new THREE.BoxGeometry(.04, .32, .05), clawM); a1.position.y = -.16; arm.add(a1); const tip = new THREE.Mesh(new THREE.BoxGeometry(.04, .14, .05), clawM); tip.position.set(0, -.35, -.04); tip.rotation.x = .7; arm.add(tip);
    claw.add(piv); prongs.push(arm); } }
shadowAll(claw, true, false);
let clawPos = V3(CH.x0 + .36, HGT - .45, CH.z0 + .36), open = 1;

/* ---------- toys & physics ---------- */
let toys = [], held = null, mi = 0;
function pickToy(M) { const w = [70, 20, 8, 2.4]; const r = Math.random() * w.reduce((a, b) => a + b); let acc = 0, rar = 0; for (let k = 0; k < 4; k++) { acc += w[k]; if (r < acc) { rar = k; break; } } const list = M.toys.filter(t => t.rar === rar); return list[Math.floor(Math.random() * list.length)]; }
function addToy(def, p) { const r = def.rar === 3 ? .27 : rnd(.26, .32); const m = makePrize(def, r); m.position.copy(p); m.rotation.y = rnd(-.6, .6); cab.add(m); const t = { def, m, r, v: V3(), held: false, drop: false, yaw: m.rotation.y }; toys.push(t); return t; }
function fillMachine(mi) { toys.forEach(t => cab.remove(t.m)); toys = []; const M = MACH[mi]; const list = []; for (let k = 0; k < 19; k++) list.push(pickToy(M)); if (!list.some(t => t.rar >= 2)) list[3] = M.toys.find(t => t.rar === 2);
  list.forEach((d, k) => addToy(d, V3(rnd(CH.x1 + .3, W - .3), .4 + k * .25, rnd(-D + .3, D - .3)))); for (let s = 0; s < 360; s++) physics(1 / 60); }
function inChute(x, z) { return x < CH.x1 && z > CH.z0; }
function physics(dt) {
  for (const t of toys) { if (t.held) continue; const p = t.m.position; t.v.y -= 9.8 * dt; t.v.multiplyScalar(.985); p.addScaledVector(t.v, dt);
    if (t.drop) { if (p.y < -1.2) t.gone = true; continue; }
    if (p.y < t.r * .9) { p.y = t.r * .9; t.v.y *= -.15; t.v.x *= .82; t.v.z *= .82; }
    p.x = clamp(p.x, -W + t.r, W - t.r); p.z = clamp(p.z, -D + t.r, D - t.r);
    if (p.x - t.r < CH.x1 && p.z + t.r > CH.z0 && p.y - t.r < CH.h) { const dx = CH.x1 - (p.x - t.r), dz = (p.z + t.r) - CH.z0; if (dx < dz) { p.x += dx; t.v.x = Math.abs(t.v.x) * .2; } else { p.z -= dz; t.v.z = -Math.abs(t.v.z) * .2; } } }
  for (let i = 0; i < toys.length; i++) for (let j = i + 1; j < toys.length; j++) { const a = toys[i], b = toys[j]; if (a.drop || b.drop) continue; const pa = a.m.position, pb = b.m.position; const dx = pb.x - pa.x, dy = pb.y - pa.y, dz = pb.z - pa.z; const d = Math.sqrt(dx * dx + dy * dy + dz * dz), min = (a.r + b.r) * .86;
    if (d < min && d > 1e-5) { const push = (min - d) / d * .5; const ka = a.held ? 0 : b.held ? 1 : .5, kb = a.held ? 1 : b.held ? 0 : .5;
      pa.x -= dx * push * ka * 2; pa.y -= dy * push * ka * 2; pa.z -= dz * push * ka * 2; pb.x += dx * push * kb * 2; pb.y += dy * push * kb * 2; pb.z += dz * push * kb * 2;
      if (!a.held) a.v.multiplyScalar(.9); if (!b.held) b.v.multiplyScalar(.9); } }
}

/* ---------- play state machine ---------- */
let phase = 'ready', timer = 0, keysD = {}, result = null, phT = 0, slipAt = -1, grabbed = null;
const HOME = () => V3((CH.x0 + CH.x1) / 2, HGT - .45, (CH.z0 + CH.z1) / 2);
function regen() { const now = Date.now(); if (S.coins >= 10) { S.coinT = now; return; } const n = Math.floor((now - S.coinT) / 60000); if (n > 0) { S.coins = Math.min(10, S.coins + n); S.coinT += n * 60000; S.save(); } }
function hud() { regen(); $('coinTxt').textContent = '🪙 ' + S.coins; $('coinNext').textContent = S.coins < 10 ? T('עוד מטבע בעוד ', 'next coin ') + Math.max(0, 60 - Math.floor((Date.now() - S.coinT) / 1000)) + T(' שנ׳', 's') : T('מלא', 'full');
  const M = MACH[mi]; const got = M.toys.filter(t => S.got[t.id]).length; $('mName').textContent = M.ic + ' ' + M.n; $('mProg').textContent = S['beat' + mi] ? `🏆 ${got}/10` : `${got}/${GOAL} ${T('לניצחון', 'to win')}`;
  $('grabBtn').textContent = phase === 'ready' ? '🪙 PLAY' : 'GRAB'; $('grabBtn').classList.toggle('ready', phase === 'ready' && S.coins > 0); $('grabBtn').disabled = !(phase === 'ready' || phase === 'aim'); $('timer').hidden = phase !== 'aim'; $('timer').textContent = Math.ceil(timer); }
function press() { A.ac(); if (phase === 'ready') { regen(); if (S.coins < 1) { A.tone(160, .2, 'square', .05); toast(T('אין מטבעות – מטבע חדש מגיע כל דקה ⏳', 'No coins – a new one arrives every minute ⏳')); return; }
    S.coins--; S.save(); A.tone(1200, .06, 'square', .05); A.tone(1600, .1, 'square', .05, .07); phase = 'aim'; timer = 15; sw.set(0, 0, 0); swv.set(0, 0, 0); if (!S.tutSw) { toast(T('המתקן מתנדנד! חכו שיתייצב לפני GRAB 🎯', 'The claw sways! Wait for it to settle before GRAB 🎯'), 3800); S.tutSw = 1; S.save(); } A.startMusic({ chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], bpm: 112, lead: true }); hud(); return; }
  if (phase === 'aim') { phase = 'down'; phT = 0; A.loopTone('mot', 'sawtooth', 90, .025); hud(); } }
$('grabBtn').onclick = press;
document.querySelectorAll('#pad button').forEach(b => { const d = b.dataset.d; const on = e => { e.preventDefault(); keysD[d] = true; b.classList.add('on'); A.ac(); }; const off = () => { keysD[d] = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off); });
addEventListener('keydown', e => { const m = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[e.key]; if (m) { keysD[m] = true; e.preventDefault(); } if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(); } });
addEventListener('keyup', e => { const m = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[e.key]; if (m) keysD[m] = false; });
function topUnder(x, z) { let best = 0, tt = null; for (const t of toys) { if (t.held || t.drop) continue; const p = t.m.position; const d = Math.hypot(p.x - x, p.z - z); if (d < t.r * .9 + .08) { const top = p.y + t.r * .85; if (top > best) { best = top; tt = t; } } } return [best, tt]; }
const sw = V3(), swv = V3(), lastV = V3();
let slowT = 0, dramaK = 0, beatT = 0, dMsg = '', scared = false;
function drama(msg, cls = '') { if (msg === dMsg) return; dMsg = msg; const el = $('drama'); if (!msg) { el.className = ''; return; } el.textContent = msg; el.className = ''; void el.offsetWidth; el.className = 'on ' + cls; }
function heartbeat(dt, near) { beatT -= dt; if (beatT <= 0) { beatT = near ? .38 : .62; A.tone(62, .12, 'sine', .22); A.tone(55, .12, 'sine', .18, .14); try { navigator.vibrate && navigator.vibrate(near ? 25 : 15); } catch (e) {} } }
function step(dt) {
  const sp = 1.25; const pv = clawPos.clone();
  if (phase === 'aim') { timer -= dt; const mv = V3((keysD.right ? 1 : 0) - (keysD.left ? 1 : 0), 0, (keysD.down ? 1 : 0) - (keysD.up ? 1 : 0)); if (mv.lengthSq()) { if (!A.loop('mv')) A.loopTone('mv', 'square', 70, .012); } else A.loopOff('mv');
    clawPos.x = clamp(clawPos.x + mv.x * sp * dt, -W + .25, W - .25); clawPos.z = clamp(clawPos.z + mv.z * sp * dt, -D + .25, D - .25); if (timer <= 0) { A.loopOff('mv'); phase = 'down'; phT = 0; A.loopTone('mot', 'sawtooth', 90, .025); } }
  else if (phase === 'down') { A.loopOff('mv'); const [top] = topUnder(clawPos.x + sw.x, clawPos.z + sw.z); const stopY = Math.max(.42, top + .3); clawPos.y -= dt * 1.3; open = Math.min(1, open + dt * 3); if (clawPos.y <= stopY) { clawPos.y = stopY; phase = 'close'; phT = 0; A.loopOff('mot'); A.tone(300, .1, 'square', .04); } }
  else if (phase === 'close') { phT += dt; open = Math.max(0, 1 - phT * 2.2); if (phT > .55) { // decide grab
      let cand = null, bd = 9; const ex = clawPos.x + sw.x, ez = clawPos.z + sw.z; for (const t of toys) { if (t.drop) continue; const p = t.m.position; const d = Math.hypot(p.x - ex, p.z - ez); const vy = clawPos.y - .35 - (p.y + t.r * .5); if (d < t.r * .95 && vy < .25 && d < bd) { bd = d; cand = t; } }
      if (cand) { const rf = [1, .75, .55, .38][cand.def.rar]; const pc = clamp(1 - bd / (cand.r * .95), 0, 1); const pr = (.25 + .75 * Math.pow(pc, 1.5)) * .85 * rf; { const ok = Math.random() < pr; grabbed = cand; cand.held = true; cand.willSlip = !ok; cand.off = cand.m.position.clone().sub(V3(ex, clawPos.y, ez)); cand.off.x *= .4; cand.off.z *= .4; slipAt = !ok ? rnd(.12, 1.1) : (Math.random() < .12 ? rnd(.3, 1.1) : -1); A.voice('huh', 1.8); } }
      phase = 'up'; phT = 0; scared = false; A.loopTone('mot', 'sawtooth', 110, .025); if (grabbed) { drama(T('😬 תפס...?', '😬 Got it...?')); A.noise(1.2, 'bandpass', 600, 2, .05, 0, 1400); } else drama(T('😅 פספוס', '😅 Missed'), 'meh'); } }
  else if (phase === 'up' || phase === 'home') { const H = HOME(); if (phase === 'up') { clawPos.y = Math.min(HGT - .45, clawPos.y + dt * 1.1); if (clawPos.y >= HGT - .45) phase = 'home'; }
    else { const d = V3(H.x - clawPos.x, 0, H.z - clawPos.z); const L = d.length(); if (L > .02) clawPos.addScaledVector(d.normalize(), Math.min(L, dt * .9)); else { phase = 'drop'; phT = 0; A.loopOff('mot'); } }
    if (grabbed) { const dch = Math.hypot(clawPos.x - H.x, clawPos.z - H.z); heartbeat(dt, phase === 'home' && dch < .7); if (phase === 'home') drama(dch < .55 ? T('😱 כמעט!!!', '😱 Almost!!!') : T('🤞 רק לא ליפול…', '🤞 Don’t drop it…'), dch < .55 ? 'hot' : '');
      if (phase === 'home' && !scared && slipAt < 0 && dch < 1.1 && Math.random() < .5) { scared = true; swv.add(V3(rnd(-1.4, 1.4), 0, rnd(-1.4, 1.4))); A.tone(1400, .12, 'square', .05); A.voice('huh', 2.2); drama(T('😱 אוי!!', '😱 Whoa!!'), 'hot'); } }
    phT += dt; if (grabbed && slipAt > 0 && phT > slipAt * 2.2) { slowT = .9; drama(T('😭 לא!!!', '😭 NOOO!'), 'bad'); grabbed.held = false; grabbed.v.set(rnd(-.3, .3), 0, rnd(-.3, .3)); grabbed = null; slipAt = -1; A.voice('aww', 1.6); toast(T('אוי! הבובה החליקה 😮', 'Oh no! It slipped 😮')); } }
  else if (phase === 'drop') { phT += dt; open = Math.min(1, phT * 2.5); if (grabbed && phT > .25) { slowT = .8; drama(T('🎯 נופל…', '🎯 Dropping…'), 'hot'); grabbed.held = false; grabbed.drop = true; grabbed.v.set(0, -.5, 0); A.tone(500, .3, 'sine', .08, 0, 200); grabbed = null; }
    if (phT > 1.4) { phase = 'ready'; if (!result) drama(''); if (!result) { A.voice('aww', 1.3); toast(T('כמעט! נסו שוב', 'So close! Try again')); } result = null; hud(); } }
  { const v = clawPos.clone().sub(pv).divideScalar(Math.max(dt, 1e-4)); v.y = 0; const acc = v.clone().sub(lastV).divideScalar(Math.max(dt, 1e-4)); lastV.copy(v);
    const k = 16, c = grabbed ? 1.1 : 1.4; swv.addScaledVector(sw, -k * dt).addScaledVector(swv, -c * dt).addScaledVector(acc, -.4 * dt); sw.addScaledVector(swv, dt); sw.y = 0; if (sw.length() > .45) sw.setLength(.45);
    if (grabbed && slipAt < 0 && swv.length() > .9 && Math.random() < dt * 1.2) slipAt = .01; }
  if (grabbed) { grabbed.m.position.copy(clawPos).add(sw).add(V3(grabbed.off.x, -.42 - grabbed.r * .5, grabbed.off.z)); grabbed.m.rotation.z = Math.sin(performance.now() / 300) * .12; }
  for (let i = toys.length - 1; i >= 0; i--) { const t = toys[i]; if (t.gone) { cab.remove(t.m); toys.splice(i, 1); win(t.def); } }
}
function win(def) {
  result = def; drama(T('🎉 יש!!!', '🎉 YES!!!'), 'win'); setTimeout(() => drama(''), 1600); const isNew = !S.got[def.id]; S.got[def.id] = (S.got[def.id] || 0) + 1; let bonus = 0; if (!isNew) { bonus = 2; S.coins += 2; }
  const M = MACH[mi]; const done = M.toys.every(t => S.got[t.id]); if (done && !S['done' + mi]) { S['done' + mi] = 1; S.coins += 20; bonus += 20; } S.save();
  FX.burst(V3((CH.x0 + CH.x1) / 2, -.4, D + .4), 70, CONFETTI, 3.6, .08, 1.6, 5); A.voice('yay', 1.5); [0, 4, 7, 12].forEach((n, k) => A.tone(523 * Math.pow(2, n / 12), .25, 'triangle', .09, k * .09));
  addToy(pickToy(M), V3(rnd(0, W - .4), HGT - .6, rnd(-D + .4, D - .4)));
  setTimeout(() => { $('zT').textContent = isNew ? T('חדש באוסף! 🎉', 'New for the album! 🎉') : T('זכית!', 'You won!'); $('zImg').src = thumb(def); $('zName').textContent = def.n; $('zRar').textContent = RN[def.rar]; $('zRar').style.background = RC[def.rar];
    $('zP').textContent = (isNew ? '' : T('כבר יש לך אחד – ', 'Already have one – ')) + (bonus ? '+' + bonus + ' 🪙' : '') + (done && bonus >= 20 ? T(' · השלמת את המכונה!', ' · machine complete!') : ''); $('prizeSheet').hidden = false; hud(); }, 700);
}
$('zOk').onclick = () => { $('prizeSheet').hidden = true; checkUnlock(); };
const GOAL = 6; function unlocked(k) { return true; }
function checkUnlock() { const M = MACH[mi]; const got = M.toys.filter(t => S.got[t.id]).length; if (got >= GOAL && !S['beat' + mi]) { S['beat' + mi] = 1; S.coins += 15; S.save(); hud(); drama(T('🏆 ניצחת את המכונה!', '🏆 MACHINE BEATEN!'), 'win'); setTimeout(() => drama(''), 2600); A.voice('wow', 1.3); [0, 4, 7, 12, 16, 19, 24].forEach((n, k) => A.tone(523 * Math.pow(2, n / 12), .3, 'triangle', .09, k * .1)); for (let k = 0; k < 6; k++) setTimeout(() => FX.burst(V3(rnd(-W, W), HGT * .7, rnd(-D, D)), 60, CONFETTI, 4, .09, 1.8, 5), k * 180); toast(T('+15 🪙 · נסו עכשיו מכונה אחרת!', '+15 🪙 · Now try another machine!'), 3200); } }

/* ---------- thumbnails ---------- */
let tR = null, tS = null, tC = null; const thumbs = {};
function thumb(def) { if (thumbs[def.id]) return thumbs[def.id];
  if (!tR) { tR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); tR.setSize(160, 160); tR.outputColorSpace = THREE.SRGBColorSpace; tR.toneMapping = THREE.ACESFilmicToneMapping; tS = new THREE.Scene(); tS.add(new THREE.HemisphereLight('#ffffff', '#b8a0d0', 1.3)); const d = new THREE.DirectionalLight('#ffffff', 2); d.position.set(1, 2, 3); tS.add(d); tC = new THREE.PerspectiveCamera(30, 1, .1, 10); tC.position.set(0, .15, 2.3); tC.lookAt(0, .02, 0); }
  const m = makePrize(def, .3); tS.add(m); tR.render(tS, tC); thumbs[def.id] = tR.domElement.toDataURL(); tS.remove(m); return thumbs[def.id]; }
let aTab = 0;
function renderAlbum() { $('aTabs').innerHTML = MACH.map((M, k) => `<button data-k="${k}" aria-pressed="${k === aTab}">${M.ic} ${M.n}</button>`).join(''); const M = MACH[aTab]; const got = M.toys.filter(t => S.got[t.id]).length; $('aP').textContent = got + '/10 ' + T('נאספו', 'collected');
  $('album').innerHTML = M.toys.map(t => { const n = S.got[t.id] || 0; return `<div class="pl r${t.rar} ${n ? '' : 'miss'}"><img src="${thumb(t)}" alt="">${n ? t.n : '???'}${n > 1 ? `<span class="x">x${n}</span>` : ''}</div>`; }).join(''); }
$('aTabs').onclick = e => { const b = e.target.closest('[data-k]'); if (b) { aTab = +b.dataset.k; renderAlbum(); } };
const openAlbum = () => { A.ac(); aTab = mi; renderAlbum(); $('albumSheet').hidden = false; }; $('albumBtn').onclick = openAlbum; $('albumBtn2').onclick = openAlbum; $('aClose').onclick = () => $('albumSheet').hidden = true;

/* ---------- camera ---------- */
function fit() { const a = innerWidth / innerHeight; const port = a < 1; const target = V3(0, port ? .9 : 1.25, 0); const h = port ? 6.4 : 5.0; const fovR = THREE.MathUtils.degToRad(camera.fov / 2);
  let d = Math.max(h / 2 / Math.tan(fovR), (W * 2 + 1.1) / 2 / (Math.tan(fovR) * a)); camera.position.set(0, target.y + d * .46, d * .9 + .2); camera.lookAt(target.x, target.y - .1, target.z); camBase.p = camera.position.clone(); camBase.l = V3(target.x, target.y - .1, target.z); }
const camBase = {};
E.onResize.push(fit);

/* ---------- loop ---------- */
let last = performance.now(), acc = 0, hudT = 0;
function frame(now) { requestAnimationFrame(frame); const rdt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000; const dt = rdt * (slowT > 0 ? .32 : 1); slowT -= rdt;
  dramaK = lerp(dramaK, grabbed && (phase === 'up' || phase === 'home' || phase === 'drop') ? 1 : 0, Math.min(1, rdt * 2.2)); if (camBase.p) { const cp = camBase.p.clone().lerp(V3(clawPos.x * .6, clawPos.y + .5, clawPos.z + 3.6), dramaK * .42); camera.position.copy(cp); const lk = camBase.l.clone().lerp(V3(clawPos.x, clawPos.y - .3, clawPos.z), dramaK * .55); camera.lookAt(lk); }
  acc += dt; let n = 0; while (acc > 1 / 60 && n < 3) { physics(1 / 60); acc -= 1 / 60; n++; } if (acc > .1) acc = 0;
  if (state === 'play') step(dt);
  claw.position.copy(clawPos).add(sw); claw.rotation.set(sw.z * 1.4, 0, -sw.x * 1.4); prongs.forEach(p => p.rotation.x = lerp(-.05, -.75, open)); carriage.position.set(clawPos.x, HGT - .1, clawPos.z); bridge.position.set(clawPos.x, HGT - .08, 0);
  const cl = (HGT - .12) - (clawPos.y + .1); cable.scale.y = Math.max(.01, cl); cable.position.set(clawPos.x + sw.x * .5, clawPos.y + .1 + cl / 2, clawPos.z + sw.z * .5); cable.rotation.set(sw.z * .9 / Math.max(.3, cl), 0, -sw.x * .9 / Math.max(.3, cl));
  bulbs.forEach((b, k) => b.material.color.setScalar(((k + Math.floor(t * 6)) % 4 === 0 ? 3 : 1.1)));
  for (const tt of toys) if (!tt.held) tt.m.rotation.z = lerp(tt.m.rotation.z, 0, dt * 3);
  hudT -= dt; if (hudT <= 0 && state === 'play') { hud(); hudT = .25; }
  FX.update(dt); A.tick(); E.render(); }

/* ---------- screens ---------- */
let state = 'title';
function renderMachines() { $('machines').innerHTML = MACH.map((M, k) => { const un = unlocked(k); const got = M.toys.filter(t => S.got[t.id]).length;
  return `<button class="mb ${un ? '' : 'lock'}" data-k="${k}"><i>${un ? M.ic : '🔒'}</i><span><b>${M.n}</b><small>${S['beat' + k] ? `🏆 ${T('נוצחה!', 'Beaten!')} · ${got}/10` : `${got}/${GOAL} ${T('בובות לניצחון', 'to beat it')}`}</small></span></button>`; }).join(''); }
$('machines').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; A.ac(); const k = +b.dataset.k; if (!unlocked(k)) { A.tone(160, .2, 'square', .05); return; } openMachine(k); };
function openMachine(k) { mi = k; S.mach = k; S.save(); buildCabinet(k); fillMachine(k); clawPos = HOME(); phase = 'ready'; state = 'play'; $('title').hidden = true; $('hud').hidden = $('ctrl').hidden = false; hud();
  if (!S.tut) { toast(T('לחצו PLAY, הזיזו את המתקן עם החצים ולחצו GRAB!', 'Press PLAY, move the claw with the arrows and hit GRAB!'), 4200); S.tut = 1; S.save(); } }
function showTitle() { state = 'title'; A.allOff(); A.stopMusic(); $('title').hidden = false; $('hud').hidden = $('ctrl').hidden = $('timer').hidden = true; renderMachines(); }
$('menuBtn').onclick = () => { if (phase !== 'ready' && phase !== 'aim') return; showTitle(); };
$('menuBtn').innerHTML = ICO.grid('#d61f6e'); $('homeT').innerHTML = ICO.home('#d61f6e');
soundButton('sndBtn', S, A, '#d61f6e'); qualityButton('qBtn', S); hubButtons(['homeT'], A);
$('tSub').textContent = T('בחרו מכונה – אספו 6 פרסים שונים כדי לנצח אותה! 🏆 אפשר לעבור בין המכונות בכל רגע', 'Pick any machine – collect 6 different prizes to beat it! 🏆 Switch machines any time');
$('albumBtn2').textContent = '📒 ' + T('האלבום שלי', 'My album'); $('aT').textContent = T('האלבום שלי', 'My album'); $('aClose').textContent = T('סגור', 'Close'); $('zOk').textContent = T('יופי!', 'Yay!');
buildRoom();
setTimeout(() => { buildCabinet(S.mach || 0); mi = S.mach || 0; fillMachine(mi); clawPos = HOME(); E.resize(); showTitle(); $('loading').hidden = true; requestAnimationFrame(frame); window.__clawOK = true; }, 20);
window.__c = { get phase() { return phase; }, press, toys: () => toys, set pos(v) { clawPos.x = v[0]; clawPos.z = v[1]; }, openMachine, S, thumb, MACH };
