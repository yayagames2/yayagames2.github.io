/* Offline post-processing for New York City (SkyPlay).
   Small, self-contained versions of the passes the game uses:
   EffectComposer, RenderPass, ShaderPass, OutputPass, UnrealBloomPass, FXAAShader. */
import * as THREE from 'three';

const VERT = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }';

class FullScreenQuad {
  constructor(material) {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    this.mesh.frustumCulled = false;
  }
  set material(m) { this.mesh.material = m; }
  get material() { return this.mesh.material; }
  render(renderer) { renderer.render(this.mesh, this.camera); }
}

class Pass {
  constructor() { this.enabled = true; this.needsSwap = true; this.clear = false; this.renderToScreen = false; }
  setSize() {}
}

export class RenderPass extends Pass {
  constructor(scene, camera) { super(); this.scene = scene; this.camera = camera; this.needsSwap = false; this.clear = true; }
  render(renderer, writeBuffer, readBuffer) {
    const ac = renderer.autoClear; renderer.autoClear = false;
    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    if (this.clear) renderer.clear(true, true, true);
    renderer.render(this.scene, this.camera);
    renderer.autoClear = ac;
  }
}

export class ShaderPass extends Pass {
  constructor(shader, textureID = 'tDiffuse') {
    super(); this.textureID = textureID;
    this.uniforms = THREE.UniformsUtils.clone(shader.uniforms || {});
    this.material = new THREE.ShaderMaterial({ toneMapped: false, defines: Object.assign({}, shader.defines), uniforms: this.uniforms,
      vertexShader: VERT, fragmentShader: shader.fragmentShader, depthTest: false, depthWrite: false });
    this.quad = new FullScreenQuad(this.material);
  }
  render(renderer, writeBuffer, readBuffer) {
    if (this.uniforms[this.textureID]) this.uniforms[this.textureID].value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this.quad.render(renderer);
  }
}

/* tone mapping + sRGB output, like three's OutputPass (own functions, no shader chunks) */
export class OutputPass extends ShaderPass {
  constructor() {
    super({
      uniforms: { tDiffuse: { value: null }, uExposure: { value: 1 }, uAces: { value: 1 } },
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uExposure; uniform float uAces; varying vec2 vUv;
        vec3 rrtOdt(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
        vec3 acesTM(vec3 c){
          const mat3 IM=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777));
          const mat3 OM=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602));
          c*=uExposure/0.6; c=IM*c; c=rrtOdt(c); c=OM*c; return clamp(c,0.0,1.0); }
        vec3 toSRGB(vec3 c){ return mix(pow(max(c,vec3(0.0)),vec3(1.0/2.4))*1.055-0.055, c*12.92, vec3(lessThanEqual(c,vec3(0.0031308)))); }
        void main(){ vec4 c=texture2D(tDiffuse,vUv); vec3 o=uAces>0.5?acesTM(c.rgb):c.rgb; gl_FragColor=vec4(toSRGB(o),c.a); }`
    });
  }
  render(renderer, writeBuffer, readBuffer) {
    this.uniforms.uExposure.value = renderer.toneMappingExposure;
    this.uniforms.uAces.value = renderer.toneMapping === THREE.ACESFilmicToneMapping ? 1 : 0;
    super.render(renderer, writeBuffer, readBuffer);
  }
}

/* bloom: bright-pass → 5 blurred mip levels → combine → added onto the image */
export class UnrealBloomPass extends Pass {
  constructor(resolution, strength = 1, radius = 0, threshold = 0) {
    super(); this.strength = strength; this.radius = radius; this.threshold = threshold; this.needsSwap = false;
    this.nMips = 5; this.rtH = []; this.rtV = [];
    const opt = { type: THREE.HalfFloatType };
    let w = Math.max(1, Math.round(resolution.x / 2)), h = Math.max(1, Math.round(resolution.y / 2));
    this.rtBright = new THREE.WebGLRenderTarget(w, h, opt);
    for (let i = 0; i < this.nMips; i++) { this.rtH.push(new THREE.WebGLRenderTarget(w, h, opt)); this.rtV.push(new THREE.WebGLRenderTarget(w, h, opt)); w = Math.max(1, Math.round(w / 2)); h = Math.max(1, Math.round(h / 2)); }
    this.hp = new THREE.ShaderMaterial({ toneMapped: false, uniforms: { tDiffuse: { value: null }, thr: { value: threshold }, sw: { value: .01 } }, vertexShader: VERT,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float thr; uniform float sw; varying vec2 vUv;
        void main(){ vec4 t=texture2D(tDiffuse,vUv); float l=dot(t.rgb,vec3(.299,.587,.114)); gl_FragColor=t*smoothstep(thr,thr+sw,l); }`, depthTest: false, depthWrite: false });
    const ks = [3, 5, 7, 9, 11];
    this.blur = ks.map(k => new THREE.ShaderMaterial({ toneMapped: false, defines: { KR: k, SIGMA: k }, uniforms: { tDiffuse: { value: null }, inv: { value: new THREE.Vector2() }, dir: { value: new THREE.Vector2() } }, vertexShader: VERT,
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 inv; uniform vec2 dir; varying vec2 vUv;
        float g(float x){ return 0.39894*exp(-.5*x*x/(float(SIGMA)*float(SIGMA)))/float(SIGMA); }
        void main(){ float ws=g(0.0); vec3 s=texture2D(tDiffuse,vUv).rgb*ws;
          for(int i=1;i<KR;i++){ float x=float(i), w=g(x); vec2 o=dir*inv*x;
            s+=(texture2D(tDiffuse,vUv+o).rgb+texture2D(tDiffuse,vUv-o).rgb)*w; ws+=2.0*w; }
          gl_FragColor=vec4(s/ws,1.0); }`, depthTest: false, depthWrite: false }));
    this.comb = new THREE.ShaderMaterial({ toneMapped: false, uniforms: { b0: { value: null }, b1: { value: null }, b2: { value: null }, b3: { value: null }, b4: { value: null }, strength: { value: strength }, radius: { value: radius },
        f: { value: [1, .8, .6, .4, .2] } }, vertexShader: VERT,
      fragmentShader: `uniform sampler2D b0,b1,b2,b3,b4; uniform float strength; uniform float radius; uniform float f[5]; varying vec2 vUv;
        float lf(float x){ float m=1.2-x; return mix(x,m,radius); }
        void main(){ gl_FragColor=strength*(lf(f[0])*texture2D(b0,vUv)+lf(f[1])*texture2D(b1,vUv)+lf(f[2])*texture2D(b2,vUv)+lf(f[3])*texture2D(b3,vUv)+lf(f[4])*texture2D(b4,vUv)); }`,
      depthTest: false, depthWrite: false });
    this.add = new THREE.ShaderMaterial({ toneMapped: false, uniforms: { tDiffuse: { value: null } }, vertexShader: VERT,
      fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ gl_FragColor=texture2D(tDiffuse,vUv); }',
      blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false });
    this.quad = new FullScreenQuad(this.hp);
  }
  setSize(width, height) {
    let w = Math.max(1, Math.round(width / 2)), h = Math.max(1, Math.round(height / 2));
    this.rtBright.setSize(w, h);
    for (let i = 0; i < this.nMips; i++) { this.rtH[i].setSize(w, h); this.rtV[i].setSize(w, h); this.blur[i].uniforms.inv.value.set(1 / w, 1 / h); w = Math.max(1, Math.round(w / 2)); h = Math.max(1, Math.round(h / 2)); }
  }
  render(renderer, writeBuffer, readBuffer) {
    const ac = renderer.autoClear; renderer.autoClear = false;
    this.hp.uniforms.tDiffuse.value = readBuffer.texture; this.hp.uniforms.thr.value = this.threshold;
    this.quad.material = this.hp; renderer.setRenderTarget(this.rtBright); renderer.clear(); this.quad.render(renderer);
    let input = this.rtBright;
    for (let i = 0; i < this.nMips; i++) {
      const m = this.blur[i]; this.quad.material = m;
      m.uniforms.tDiffuse.value = input.texture; m.uniforms.dir.value.set(1, 0); renderer.setRenderTarget(this.rtH[i]); renderer.clear(); this.quad.render(renderer);
      m.uniforms.tDiffuse.value = this.rtH[i].texture; m.uniforms.dir.value.set(0, 1); renderer.setRenderTarget(this.rtV[i]); renderer.clear(); this.quad.render(renderer);
      input = this.rtV[i];
    }
    const c = this.comb.uniforms; for (let i = 0; i < 5; i++) c['b' + i].value = this.rtV[i].texture;
    c.strength.value = this.strength; c.radius.value = this.radius;
    this.quad.material = this.comb; renderer.setRenderTarget(this.rtH[0]); renderer.clear(); this.quad.render(renderer);
    this.add.uniforms.tDiffuse.value = this.rtH[0].texture; this.quad.material = this.add;
    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer); this.quad.render(renderer);
    renderer.autoClear = ac;
  }
}

export class EffectComposer {
  constructor(renderer, renderTarget) {
    this.renderer = renderer; this.passes = []; this._pr = renderer.getPixelRatio();
    const size = renderer.getSize(new THREE.Vector2()); this._w = size.x; this._h = size.y;
    this.renderTarget1 = renderTarget || new THREE.WebGLRenderTarget(this._w * this._pr, this._h * this._pr, { type: THREE.HalfFloatType });
    this.renderTarget1.texture.name = 'EffectComposer.rt1';
    this.renderTarget2 = this.renderTarget1.clone(); this.renderTarget2.texture.name = 'EffectComposer.rt2';
    this.writeBuffer = this.renderTarget1; this.readBuffer = this.renderTarget2;
    this.copy = new ShaderPass({ uniforms: { tDiffuse: { value: null } }, fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ gl_FragColor=texture2D(tDiffuse,vUv); }' });
  }
  addPass(p) { this.passes.push(p); p.setSize(this._w * this._pr, this._h * this._pr); }
  swap() { const t = this.readBuffer; this.readBuffer = this.writeBuffer; this.writeBuffer = t; }
  setSize(w, h) { this._w = w; this._h = h; const W = w * this._pr, H = h * this._pr;
    this.renderTarget1.setSize(W, H); this.renderTarget2.setSize(W, H); this.passes.forEach(p => p.setSize(W, H)); }
  setPixelRatio(pr) { this._pr = pr; this.setSize(this._w, this._h); }
  render() {
    const r = this.renderer, cur = r.getRenderTarget();
    let last = -1; this.passes.forEach((p, i) => { if (p.enabled) last = i; });
    for (let i = 0; i < this.passes.length; i++) {
      const p = this.passes[i]; if (!p.enabled) continue;
      p.renderToScreen = (i === last);
      p.render(r, this.writeBuffer, this.readBuffer);
      if (p.needsSwap) this.swap();
    }
    r.setRenderTarget(cur);
  }
}

/* FXAA (lite): luma-edge anti-aliasing */
export const FXAAShader = {
  uniforms: { tDiffuse: { value: null }, resolution: { value: new THREE.Vector2(1 / 1024, 1 / 512) } },
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 resolution; varying vec2 vUv;
    float L(vec3 c){ return dot(c,vec3(.299,.587,.114)); }
    void main(){
      vec2 px=resolution;
      vec3 cM=texture2D(tDiffuse,vUv).rgb;
      vec3 cNW=texture2D(tDiffuse,vUv+vec2(-1.0,-1.0)*px).rgb, cNE=texture2D(tDiffuse,vUv+vec2(1.0,-1.0)*px).rgb;
      vec3 cSW=texture2D(tDiffuse,vUv+vec2(-1.0,1.0)*px).rgb, cSE=texture2D(tDiffuse,vUv+vec2(1.0,1.0)*px).rgb;
      float lNW=L(cNW), lNE=L(cNE), lSW=L(cSW), lSE=L(cSE), lM=L(cM);
      float lMin=min(lM,min(min(lNW,lNE),min(lSW,lSE))), lMax=max(lM,max(max(lNW,lNE),max(lSW,lSE)));
      vec2 dir=vec2(-((lNW+lNE)-(lSW+lSE)), ((lNW+lSW)-(lNE+lSE)));
      float red=max((lNW+lNE+lSW+lSE)*.03125,1.0/128.0);
      float rcp=1.0/(min(abs(dir.x),abs(dir.y))+red);
      dir=clamp(dir*rcp,vec2(-8.0),vec2(8.0))*px;
      vec3 a=.5*(texture2D(tDiffuse,vUv+dir*(1.0/3.0-.5)).rgb+texture2D(tDiffuse,vUv+dir*(2.0/3.0-.5)).rgb);
      vec3 b=a*.5+.25*(texture2D(tDiffuse,vUv-dir*.5).rgb+texture2D(tDiffuse,vUv+dir*.5).rgb);
      float lb=L(b);
      gl_FragColor=vec4((lb<lMin||lb>lMax)?a:b,1.0);
    }`
};
