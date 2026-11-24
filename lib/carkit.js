// Shared sculpted car builder (side profile + plan-view shaping), used by Garage Flip, Drift and Siren Rush.
// Car space: x = length (front +x), y = up, z = width. carModel() wraps it so the car faces +z.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const V2 = (x, y) => new THREE.Vector2(x, y), C = c => new THREE.Color(c);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, sm = t => t * t * (3 - 2 * t);
export const BS = .06, BT = .1;

export const CARMODELS = {
  kaze: { L: 3.9, W: 1.66, wr: .31, fa: 1.22, ra: -1.24, bot: .24, noseY: .6, hoodY: .84, belt: .96, tailY: .92, ws: .66, rf: -.02, rr: -1.55, rb: -1.86, roofY: 1.42, deckEnd: .08, hatch: 1 },
  corsa: { L: 4.3, W: 1.74, wr: .32, fa: 1.36, ra: -1.32, bot: .2, noseY: .54, hoodY: .8, belt: .86, tailY: .82, ws: .5, rf: -.22, rr: -.98, rb: -1.52, roofY: 1.3, deckEnd: .5 },
  hammer: { L: 4.7, W: 1.86, wr: .34, fa: 1.5, ra: -1.45, bot: .22, noseY: .74, hoodY: .9, belt: .92, tailY: .9, ws: .34, rf: -.3, rr: -1.05, rb: -1.68, roofY: 1.33, deckEnd: .55, grille: 1 },
  kestrel: { L: 4.1, W: 1.78, wr: .32, fa: 1.3, ra: -1.24, bot: .18, noseY: .52, hoodY: .76, belt: .8, tailY: .8, ws: .18, rf: -.18, rr: -.62, rb: -1.1, roofY: 1.13, deckEnd: .5 },
  volta: { L: 4.55, W: 1.9, wr: .34, fa: 1.45, ra: -1.45, bot: .17, noseY: .52, hoodY: .74, belt: .82, tailY: .84, ws: .78, rf: .05, rr: -1.15, rb: -1.95, roofY: 1.22, deckEnd: .2, ev: 1 },
  tempesta: { L: 4.5, W: 1.96, wr: .33, fa: 1.45, ra: -1.4, bot: .15, noseY: .46, hoodY: .7, belt: .86, tailY: .88, ws: .55, rf: -.08, rr: -.72, rb: -1.82, roofY: 1.13, deckEnd: .2 },
  zero: { L: 4.75, W: 2.0, wr: .34, fa: 1.55, ra: -1.5, bot: .13, noseY: .42, hoodY: .66, belt: .84, tailY: .94, ws: .62, rf: .02, rr: -.6, rb: -1.75, roofY: 1.09, deckEnd: .25, ev: 1 },
  sedan: { L: 4.6, W: 1.84, wr: .33, fa: 1.42, ra: -1.4, bot: .24, noseY: .66, hoodY: .86, belt: .94, tailY: .92, ws: .66, rf: .08, rr: -1.0, rb: -1.58, roofY: 1.46, deckEnd: .42 },
  suv: { L: 4.7, W: 1.96, wr: .4, fa: 1.45, ra: -1.4, bot: .4, noseY: .92, hoodY: 1.1, belt: 1.18, tailY: 1.15, ws: .92, rf: .48, rr: -1.95, rb: -2.22, roofY: 1.86, deckEnd: .06, hatch: 1 },
  van: { L: 4.9, W: 2.0, wr: .36, fa: 1.62, ra: -1.55, bot: .32, noseY: .86, hoodY: 1.08, belt: 1.24, tailY: 1.2, ws: 1.62, rf: 1.15, rr: -2.3, rb: -2.42, roofY: 2.15, deckEnd: .04, hatch: 1 },
};

// Plan-view + section shaping applied to every vertex (body, glass, roof, stripes...) so pieces stay matched.
export function deformer(M) {
  const F = M.L / 2, R = -M.L / 2, hw = M.W / 2, Lt = Math.min(.95, M.L * .2), roofH = Math.max(.2, M.roofY - M.belt);
  return (x, y, z) => {
    const tN = sm(clamp((x - (F - Lt)) / Lt, 0, 1)), tT = sm(clamp(((R + Lt * .8) - x) / (Lt * .8), 0, 1));
    let k = 1 - .15 * tN * tN - .1 * tT * tT;                                                     // rounded nose / tail in plan view
    if (y < M.belt + .02) for (const ax of [M.fa, M.ra]) k *= 1 + .045 * Math.exp(-(((x - ax) / (M.wr * 1.7)) ** 2)); // fender flares
    const yy = clamp((y - (M.belt - .04)) / roofH, 0, 1); k *= 1 - .16 * sm(yy);                   // tumblehome (cabin leans in)
    if (y < M.bot + .16) k *= 1 - .06 * (1 - clamp((y - M.bot) / .16, 0, 1));                      // tucked-in sills
    const u = clamp(z / hw, -1.2, 1.2); const up = clamp((y - (M.noseY - .1)) / .25, 0, 1);
    const ny = y + .045 * (1 - u * u) * up - .02 * tN * up;                                       // crowned hood / roof / deck
    return [x, ny, z * k];
  };
}
// smooth normals across shared positions (keeps creases sharper than ~55deg) — geometry stays non-indexed so UVs survive
export function smoothNormals(g, cosT = .57) { g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal, cnt = p.count, fn = new Float32Array(n.array), map = new Map();
  for (let i = 0; i < cnt; i++) { const k = Math.round(p.getX(i) * 1e3) + ',' + Math.round(p.getY(i) * 1e3) + ',' + Math.round(p.getZ(i) * 1e3); let a = map.get(k); if (!a) map.set(k, a = []); a.push(i); }
  for (const a of map.values()) for (const i of a) { let x = 0, y = 0, z = 0; for (const j of a) { const d = fn[i * 3] * fn[j * 3] + fn[i * 3 + 1] * fn[j * 3 + 1] + fn[i * 3 + 2] * fn[j * 3 + 2]; if (d > cosT) { x += fn[j * 3]; y += fn[j * 3 + 1]; z += fn[j * 3 + 2]; } } const l = Math.hypot(x, y, z) || 1; n.setXYZ(i, x / l, y / l, z / l); }
  n.needsUpdate = true; return g; }
function applyDeform(g, d) { if (g.index) g = g.toNonIndexed(); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const r = d(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, r[0], r[1], r[2]); } return smoothNormals(g); }

export function carShape(M) {
  if (M._g) return M._g;
  const F = M.L / 2, R = -M.L / 2, fy = M.wr * 2.18 + .03 - BS;
  let base = [[F - .06, M.noseY], [F - .34, M.noseY + (M.hoodY - M.noseY) * .5], [M.ws, M.hoodY], [M.rb, M.belt], [R + M.deckEnd, lerp(M.belt, M.tailY, .3)], [R + .05, M.tailY]];
  const interp = xx => { for (let i = 0; i < base.length - 1; i++) { const a = base[i], b = base[i + 1]; if (xx <= a[0] && xx >= b[0]) return lerp(a[1], b[1], (a[0] - xx) / (a[0] - b[0] || 1)); } return base[base.length - 1][1]; };
  for (const ax of [M.fa, M.ra]) { const y = interp(ax); if (y < fy) { const near = base.find(p => Math.abs(p[0] - ax) < .2); if (near) near[1] = Math.max(near[1], fy); else base.push([ax, fy]); } }
  base.sort((a, b) => b[0] - a[0]); const clean = []; for (const p of base) if (!clean.length || clean[clean.length - 1][0] - p[0] > .1) clean.push(p);
  const top = [[F - .03, M.bot + .03], [F, (M.bot + M.noseY) / 2], ...clean, [R, (M.tailY + M.bot) / 2], [R + .04, M.bot + .03]].map(([a, b]) => V2(a, b));
  const s = new THREE.Shape(); s.moveTo(R + .07, M.bot);
  for (const ax of [M.ra, M.fa]) { const ar = M.wr * 1.18 + BS, cy = M.wr, d = Math.asin(clamp((cy - M.bot) / ar, -1, 1)); s.lineTo(ax - ar * Math.cos(d), M.bot); s.absarc(ax, cy, ar, Math.PI + d, -d, true); }
  s.lineTo(F - .07, M.bot); s.splineThru(top); s.closePath();
  const dep = M.W - 2 * BT; const body = new THREE.ExtrudeGeometry(s, { depth: dep, steps: 10, bevelEnabled: true, bevelThickness: BT, bevelSize: BS, bevelSegments: 5, curveSegments: 30 }); body.translate(0, 0, -dep / 2);
  const topPts = new THREE.SplineCurve(top).getPoints(140);
  const cb = Math.min(M.hoodY, M.belt) - .14; const cabTop = [V2(M.ws + .03, M.hoodY - .02), V2(lerp(M.ws, M.rf, .55), lerp(M.hoodY, M.roofY, .8)), V2(M.rf, M.roofY), V2((M.rf + M.rr) / 2, M.roofY + .025), V2(M.rr, M.roofY - .01), V2(lerp(M.rr, M.rb, .5), lerp(M.roofY, M.belt, .58)), V2(M.rb - .03, M.belt - .02)];
  const cs = new THREE.Shape(); cs.moveTo(M.ws + .03, cb); cs.lineTo(cabTop[0].x, cabTop[0].y); cs.splineThru(cabTop.slice(1)); cs.lineTo(M.rb - .03, cb); cs.closePath();
  const CW = M.W * .8, cd = CW - .16; const cab = new THREE.ExtrudeGeometry(cs, { depth: cd, steps: 6, bevelEnabled: true, bevelThickness: .08, bevelSize: .04, bevelSegments: 4, curveSegments: 24 }); cab.translate(0, 0, -cd / 2);
  const cabPts = new THREE.SplineCurve(cabTop).getPoints(80);
  const roofPts = cabPts.filter(p => p.x <= M.rf + .06 && p.x >= M.rr - .04);
  const rs = new THREE.Shape(); const up = roofPts.map(p => V2(p.x, p.y + .015)), dn = roofPts.map(p => V2(p.x, p.y - .06)).reverse(); rs.moveTo(up[0].x, up[0].y); up.slice(1).forEach(p => rs.lineTo(p.x, p.y)); dn.forEach(p => rs.lineTo(p.x, p.y)); rs.closePath();
  const roof = new THREE.ExtrudeGeometry(rs, { depth: cd + .02, steps: 6, bevelEnabled: true, bevelThickness: .085, bevelSize: .045, bevelSegments: 4, curveSegments: 4 }); roof.translate(0, 0, -(cd + .02) / 2);
  const deform = deformer(M); [body, cab, roof].forEach(g => applyDeform(g, deform));
  const topAt = xx => { for (let i = 0; i < topPts.length - 1; i++) { const a = topPts[i], b = topPts[i + 1]; if (xx <= a.x && xx >= b.x) return lerp(a.y, b.y, (a.x - xx) / (a.x - b.x || 1)); } return M.belt; };
  M._g = { F, R, body, cab, roof, topPts, cabPts, roofPts, topAt, CW, deform: g => applyDeform(g, deform), dpt: deform };
  return M._g;
}

// ---------- full car (meshes) ----------
const MAT = {};
const mat = (k, f) => MAT[k] || (MAT[k] = f());
export const paintMaterial = (hex, o = {}) => new THREE.MeshPhysicalMaterial({ color: C(hex), metalness: o.metal ?? .25, roughness: o.rough ?? .3, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.3 });
const box = (w, h, d, m, r = 0) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
function wheel(M, rimM, tw) {
  const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin); const R0 = M.wr, rr = R0 * .64;
  const lp = [[rr, -tw / 2], [R0 - .035, -tw / 2], [R0 - .008, -tw / 2 + .022], [R0, -tw / 2 + .055], [R0, tw / 2 - .055], [R0 - .008, tw / 2 - .022], [R0 - .035, tw / 2], [rr, tw / 2]].map(([a, b]) => V2(a, b));
  const tire = new THREE.Mesh(new THREE.LatheGeometry(lp, 28), mat('tire', () => new THREE.MeshStandardMaterial({ color: C('#16161a'), roughness: .85, side: THREE.DoubleSide }))); tire.rotation.x = Math.PI / 2; spin.add(tire);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, .03, 24), mat('rimback', () => new THREE.MeshStandardMaterial({ color: C('#202228'), roughness: .6 }))); disc.rotation.x = Math.PI / 2; disc.position.z = tw / 2 - .07; spin.add(disc);
  const sg = []; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const s = new THREE.BoxGeometry(rr * .82, rr * .2, .04); s.translate(rr * .5, 0, 0); s.rotateZ(a); s.translate(0, 0, tw / 2 - .03); sg.push(s); }
  const lip = new THREE.TorusGeometry(rr - .01, .018, 6, 28); lip.translate(0, 0, tw / 2 - .02); sg.push(lip); const hub = new THREE.CylinderGeometry(rr * .22, rr * .26, .06, 14); hub.rotateX(Math.PI / 2); hub.translate(0, 0, tw / 2 - .02); sg.push(hub);
  spin.add(new THREE.Mesh(mergeGeometries(sg.map(g => g.index ? g.toNonIndexed() : g).map(g => { g.deleteAttribute('uv'); return g; })), rimM));
  return { g, spin };
}
// painted window pillars + belt trim around the glass so the cabin doesn't read as a dark block
function pillarGeo(M, G) { if (G._pil) return G._pil; const d = G.dpt, zc = G.CW / 2 + .005, out = [];
  const tube = (pts, r) => { const c = new THREE.CatmullRomCurve3(pts); const g = new THREE.TubeGeometry(c, Math.max(4, pts.length * 2), r, 6, false); g.deleteAttribute('uv'); out.push(g.index ? g.toNonIndexed() : g); };
  const P = (x, y, z) => { const q = d(x, y, z); return new THREE.Vector3(q[0], q[1], q[2]); };
  const cp = G.cabPts, front = cp.filter(p => p.x >= M.rf - .02), rear = cp.filter(p => p.x <= M.rr + .02), belt = Math.min(M.hoodY, M.belt) - .02;
  for (const s of [-1, 1]) {
    if (front.length > 1) tube(front.map(p => P(p.x, p.y - .01, s * zc)), .045);
    if (rear.length > 1) tube(rear.map(p => P(p.x, p.y - .01, s * zc)), M.hatch ? .05 : .07);
    const bx = (M.rf + M.rr) / 2 + (M.hatch ? .1 : 0); if (M.rf - M.rr > .9) tube([P(bx, belt, s * zc), P(bx, (belt + M.roofY) / 2, s * zc), P(bx, M.roofY - .02, s * zc)], .055);
    const bl = []; for (let i = 0; i <= 10; i++) { const x = lerp(M.ws + .02, M.rb - .02, i / 10); bl.push(P(x, Math.min(G.topAt(x), M.belt) - .005, s * zc * 1.02)); } tube(bl, .03);
  }
  G._pil = smoothNormals(mergeGeometries(out)); G._pil._keep = true; return G._pil; }
export const pillarMesh = (M, G, m) => new THREE.Mesh(pillarGeo(M, G), m);
// opts: paint (hex), roof ('paint'|'black'|hex), glass, rim (hex), police, taxi, spoiler, metal
export function carModel(key, opts = {}) {
  const M = typeof key === 'string' ? CARMODELS[key] : key, G = carShape(M);
  const outer = new THREE.Group(), body = new THREE.Group(); outer.add(body); body.rotation.y = -Math.PI / 2; // +x (front) -> +z
  const paint = opts.paintMat || paintMaterial(opts.paint || '#e8202a', { metal: opts.metal });
  const glass = mat('glass' + (opts.glass || ''), () => new THREE.MeshPhysicalMaterial({ color: C(opts.glass || '#121a26'), metalness: .4, roughness: .05, clearcoat: 1, envMapIntensity: 1.6 }));
  const black = mat('black', () => new THREE.MeshStandardMaterial({ color: C('#121216'), roughness: .5, metalness: .3 }));
  const chrome = mat('chrome', () => new THREE.MeshStandardMaterial({ color: C('#d8dce4'), roughness: .12, metalness: 1 }));
  const hlM = mat('hl', () => new THREE.MeshStandardMaterial({ color: C('#fff6e0'), emissive: C('#fff2d0'), emissiveIntensity: 1.6, roughness: .2 }));
  const tlM = opts.tailMat || mat('tl', () => new THREE.MeshStandardMaterial({ color: C('#400000'), emissive: C('#ff1020'), emissiveIntensity: 1.6, roughness: .3 }));
  const bm = new THREE.Mesh(G.body, paint); body.add(bm); body.add(new THREE.Mesh(G.cab, glass));
  const roofM = opts.roof === 'black' ? black : opts.roof && opts.roof !== 'paint' ? paintMaterial(opts.roof) : paint; body.add(new THREE.Mesh(G.roof, roofM));
  const F = G.F + BS, R = G.R - BS, hw = M.W / 2, d = G.dpt;
  const at = (x, y, z) => { const p = d(x, y, z); return p; };
  body.add(new THREE.Mesh(pillarGeo(M, G), roofM));
  for (const s of [-1, 1]) {
    const hx = F - .06, hz = s * (hw - .32), hp = at(hx, M.noseY - .03, hz); const h = box(.12, .09, .36, hlM); h.position.set(hp[0], hp[1], hp[2]); h.rotation.set(0, -s * .35, -.25); body.add(h);
    const tx = R + .03, tp = at(tx, M.tailY - .08, s * hw * .55); const t = box(.07, .08, M.W * .3, tlM); t.position.set(tp[0], tp[1], tp[2]); t.rotation.y = s * .18; body.add(t);
    const mp = at(M.ws - .12, M.hoodY + .1, s * (G.CW / 2 + .06)); const mr = box(.14, .09, .16, paint); mr.position.set(mp[0], mp[1], mp[2]); body.add(mr);
  }
  const gp = at(F - .02, (M.bot + M.noseY) / 2 - .02, 0); const gr = box(.06, M.grille ? .2 : .12, M.W * (M.grille ? .58 : .44), black); gr.position.set(gp[0] - .02, gp[1], 0); body.add(gr);
  const plate = box(.03, .12, .42, mat('plate', () => new THREE.MeshStandardMaterial({ color: C('#f2f2f2'), roughness: .4 }))); plate.position.set(R - .01, (M.bot + M.tailY) / 2, 0); body.add(plate);
  const bump = box(.12, .1, M.W * .8, black); bump.position.set(R + .02, M.bot + .08, 0); body.add(bump);
  const ex = new THREE.Mesh(new THREE.CylinderGeometry(.045, .05, .14, 10), chrome); ex.rotation.z = Math.PI / 2; ex.position.set(R - .03, M.bot + .07, -hw * .55); body.add(ex);
  if (opts.spoiler) { const sx = M.hatch ? M.rr - .02 : G.R + .26, sy = M.hatch ? M.roofY + .08 : G.topAt(G.R + .26) + BS; const w = box(.34, .04, M.W * .92, black); w.position.set(sx, sy + .3, 0); w.rotation.z = -.12; body.add(w); for (const s of [-1, 1]) { const u = box(.08, .3, .03, black); u.position.set(sx + .02, sy + .15, s * M.W * .26); body.add(u); } }
  let siren = null;
  if (opts.police) { const y = M.roofY + .1, x = (M.rf + M.rr) / 2; const base = box(.32, .08, 1.25, black); base.position.set(x, y, 0); body.add(base); siren = [];
    for (const [s, c] of [[-1, '#ff2030'], [1, '#2060ff']]) { const m = new THREE.Mesh(new THREE.BoxGeometry(.28, .13, .5), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y + .08, s * .3); body.add(m); siren.push(m); } }
  if (opts.taxi) { const sg = box(.3, .2, .7, mat('taxi', () => new THREE.MeshStandardMaterial({ color: C('#ffd23a'), emissive: C('#ffb000'), emissiveIntensity: .5 }))); sg.position.set((M.rf + M.rr) / 2, M.roofY + .15, 0); body.add(sg); }
  // wheels (in outer space: z forward)
  const rimM = opts.rimMat || mat('rim' + (opts.rim || ''), () => new THREE.MeshStandardMaterial({ color: C(opts.rim || '#c8ccd4'), metalness: .9, roughness: .25 }));
  const tw = .27 + M.W * .03, wheels = [];
  for (const [ax, front] of [[M.fa, 1], [M.ra, 0]]) for (const s of [-1, 1]) {
    const w = wheel(M, rimM, tw); const piv = new THREE.Group(); piv.position.set(s * (hw * 1.0 - tw / 2 + .02), M.wr, ax); const flip = new THREE.Group(); flip.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; flip.add(w.g); const sp = new THREE.Group(); sp.add(flip); piv.add(sp); outer.add(piv);
    // spin about local x of the pivot: the wheel's own axle is along x in outer space
    wheels.push({ piv, sp, front, side: s }); }
  outer.traverse(m => { if (m.isMesh) { m.castShadow = true; } });
  return { root: outer, body, bodyMesh: bm, paint, wheels, siren, L: M.L + .1, W: M.W * 1.02, H: M.roofY + .05, wr: M.wr, wb: M.fa, M };
}

// ---------- merged low-draw-call version (vertex colors: white = paint) ----------
const GEOC = {};
export function carMerged(key, opts = {}) {
  const ck = key + JSON.stringify(opts); if (GEOC[ck]) return GEOC[ck];
  const M = CARMODELS[key], G = carShape(M), d = G.dpt;
  const col = (g, c) => { g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv'); const cc = C(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([cc.r, cc.g, cc.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const B = [], L = [], F = G.F + BS, R = G.R - BS, hw = M.W / 2;
  const bodyG = col(G.body.clone(), opts.body || '#ffffff');
  if (opts.doors) { const dc = C(opts.doors), p = bodyG.attributes.position, c = bodyG.attributes.color, x0 = M.ra + M.wr * 1.25, x1 = M.fa - M.wr * 1.25; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); if (x > x0 && x < x1 && y < M.belt - .04 && y > M.bot + .04) c.setXYZ(i, dc.r, dc.g, dc.b); } }
  B.push(bodyG, col(G.cab.clone(), '#141c2a'), col(G.roof.clone(), opts.roofC || opts.body || '#ffffff'));
  B.push(col(pillarGeo(M, G).clone(), opts.roofC || opts.body || '#ffffff'));
  const bx = (w, h, dd, x, y, z, c, arr = B) => { const g = new THREE.BoxGeometry(w, h, dd); const p = d(x, y, z); g.translate(p[0], p[1], p[2]); arr.push(col(g, c)); };
  for (const s of [-1, 1]) { bx(.12, .09, .36, F - .06, M.noseY - .03, s * (hw - .32), '#fff2d0', L); bx(.07, .08, M.W * .3, R + .03, M.tailY - .08, s * hw * .55, '#ff1a1a', L); bx(.14, .09, .16, M.ws - .12, M.hoodY + .1, s * (G.CW / 2 + .06), opts.body || '#ffffff'); }
  bx(.06, M.grille ? .2 : .12, M.W * .5, F - .04, (M.bot + M.noseY) / 2 - .02, 0, '#16161a'); bx(.12, .1, M.W * .8, R + .02, M.bot + .08, 0, '#16161a');
  if (opts.taxi) bx(.3, .2, .7, (M.rf + M.rr) / 2, M.roofY + .15, 0, '#ffd23a', L);
  const tw = .24 + M.W * .02, R0 = M.wr;
  for (const ax of [M.fa, M.ra]) for (const s of [-1, 1]) { const t = new THREE.CylinderGeometry(R0, R0, tw, 16); t.rotateX(Math.PI / 2); t.translate(ax, R0, s * (hw - tw / 2 + .02)); B.push(col(t, '#141416'));
    const r = new THREE.CylinderGeometry(R0 * .62, R0 * .62, .02, 12); r.rotateX(Math.PI / 2); r.translate(ax, R0, s * (hw + .03)); B.push(col(r, '#4a4c54')); }
  const rot = g => { g.rotateY(-Math.PI / 2); return g; };
  return GEOC[ck] = { body: rot(mergeGeometries(B)), lights: rot(mergeGeometries(L)), M, H: M.roofY, L: M.L, W: M.W };
}
