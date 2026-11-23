// Mixamo character driven by a game's procedural rig (retargeting, no animation clips needed).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const cache = {};
export function loadMix(url = 'lib/chars/remy.glb') {
  return cache[url] || (cache[url] = new GLTFLoader().loadAsync(url).then(g => g.scene).catch(e => { console.warn('mix char', e); delete cache[url]; return null; }));
}

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m = new THREE.Matrix4();
const DOWN = new THREE.Vector3(0, -1, 0);
// corrections: Mixamo T-pose arms -> arms hanging down (proc rigs rest with arms down)
const ARM_L = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);
const ARM_R = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
export const CORR = { LeftArm: ARM_L, LeftForeArm: ARM_L, LeftHand: ARM_L, RightArm: ARM_R, RightForeArm: ARM_R, RightHand: ARM_R };

export class MixRig {
  // src: loaded gltf scene; height: target height in metres
  constructor(src, height = 1.76) {
    this.holder = new THREE.Group();
    const model = SkeletonUtils.clone(src); this.model = model; this.holder.add(model);
    model.updateMatrixWorld(true);
    const bb = new THREE.Box3(); model.traverse(c => { if (c.isBone) { c.getWorldPosition(_v); bb.expandByPoint(_v); } });
    const headTop = bb.max.y; // HeadTop_End is the highest bone
    const s = height / (headTop * 1.0); model.scale.multiplyScalar(s); model.updateMatrixWorld(true);
    this.B = {}; this.order = []; this.meshes = [];
    model.traverse(c => { if (c.isBone) { const n = c.name.replace(/^mixamorig\d*:?/, ''); if (!this.B[n]) { this.B[n] = c; this.order.push(n); } }
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = false; c.frustumCulled = false; this.meshes.push(c); } });
    // rest data in holder (character) space
    this.restW = {}; this.restL = {}; this.restP = {}; this.parentW = {};
    for (const n of this.order) { const b = this.B[n]; b.getWorldQuaternion(_q); this.restW[n] = _q.clone(); this.restL[n] = b.quaternion.clone(); b.getWorldPosition(_v); this.restP[n] = _v.clone(); }
    for (const n of this.order) { const p = this.B[n].parent; const pn = p && p.isBone ? p.name.replace(/^mixamorig\d*:?/, '') : null; this.parentW[n] = pn; if (!pn) { p.getWorldQuaternion(_q); this.rootParentQ = _q.clone(); this.hipParentInv = new THREE.Matrix4().copy(p.matrixWorld).invert(); } }
    this.hipsRest = this.B.Hips.position.clone();
    this.T = {}; this.W = {};
    const len = (a, b) => this.restP[a].distanceTo(this.restP[b]);
    this.legLen = { thigh: len('LeftUpLeg', 'LeftLeg'), shin: len('LeftLeg', 'LeftFoot') };
    this.ankleH = this.restP.LeftFoot.y; this.hipsH = this.restP.Hips.y;
  }
  // set a character-space world rotation target for a bone
  set(n, q) { (this.T[n] || (this.T[n] = new THREE.Quaternion())).copy(q); }
  // retarget from a proc joint: Rp(frame->joint) * corr * restW
  from(n, joint, frameInvQ) { joint.getWorldQuaternion(_q); _q.premultiply(frameInvQ); if (CORR[n]) _q.multiply(CORR[n]); _q.multiply(this.restW[n]); this.set(n, _q); }
  // aim a limb bone so its rest direction (to child) points along dir (character space)
  aim(n, child, dir, base) { _v.subVectors(this.restP[child], this.restP[n]).normalize(); _q.setFromUnitVectors(_v, dir); if (base) _q.premultiply(base); _q.multiply(this.restW[n]); this.set(n, _q); }
  // 2-bone leg IK in character space. hip: hip joint pos, foot: ankle target, fwd: knee direction
  // generic 2-bone IK: bones u (upper), l (lower), e (end) ; root: upper joint position, target: end position, pole: bend direction
  limbIK(u, l, e, root, target, pole) { const a = this.restP[u].distanceTo(this.restP[l]), b = this.restP[l].distanceTo(this.restP[e]); const d = new THREE.Vector3().subVectors(target, root); let L = d.length(); L = Math.min(Math.max(L, Math.abs(a - b) + 1e-3), a + b - 1e-3); d.normalize();
    const ang = Math.acos(Math.min(1, Math.max(-1, (a * a + L * L - b * b) / (2 * a * L)))); const axis = new THREE.Vector3().crossVectors(d, pole).normalize(); if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);
    const ud = d.clone().applyAxisAngle(axis, ang); const mid = root.clone().addScaledVector(ud, a); const ld = target.clone().sub(mid).normalize(); this.aim(u, l, ud); this.aim(l, e, ld); }
  pos(n, out = new THREE.Vector3()) { this.holder.updateMatrixWorld(true); this.B[n].getWorldPosition(out); return out.applyMatrix4(_m.copy(this.holder.matrixWorld).invert()); }
  legIK(side, hip, foot, fwd) { const a = this.legLen.thigh, b = this.legLen.shin; const d = _v2.subVectors(foot, hip); let L = d.length(); L = Math.min(Math.max(L, Math.abs(a - b) + 1e-3), a + b - 1e-3); d.normalize();
    const ca = (a * a + L * L - b * b) / (2 * a * L), ang = Math.acos(Math.min(1, Math.max(-1, ca)));
    const axis = new THREE.Vector3().crossVectors(d, fwd).normalize(); if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);
    const thighDir = d.clone().applyAxisAngle(axis, ang); const knee = hip.clone().addScaledVector(thighDir, a); const shinDir = foot.clone().sub(knee).normalize();
    this.aim(side + 'UpLeg', side + 'Leg', thighDir); this.aim(side + 'Leg', side + 'Foot', shinDir); }
  hips(deltaPos) { // deltaPos: character-space offset from rest hips position
    // restP was captured with the holder at the origin -> convert to hips parent space
    _v.copy(this.restP.Hips).add(deltaPos).applyMatrix4(this.hipParentInv); this.B.Hips.position.copy(_v); }
  apply(only) { // walk bones parents-first, convert targets into local rotations (only: optional list of bones to update)
    for (const n of this.order) { if (only && !only.includes(n)) continue; const pn = this.parentW[n]; const pW = pn ? this.W[pn] : this.rootParentQ; const w = this.W[n] || (this.W[n] = new THREE.Quaternion());
      if (this.T[n]) w.copy(this.T[n]); else w.copy(pW).multiply(this.restL[n]);
      this.B[n].quaternion.copy(pW).invert().multiply(w); }
    this.T = {}; }
}
