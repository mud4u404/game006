/**
 * 渲染引擎：WebGL 渲染器、后期处理链、分辨率（最高 3840×2160）、主循环
 *
 * 后期处理：RenderPass → UnrealBloom → OutputPass（ACES 色调映射 + sRGB）→ Grade（调色、暗角、黑边、淡入淡出、闪光）
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import type { EnvironmentMood, Quality } from './contracts';

export type Resolution = 'auto' | 'native' | '1080p' | '1440p' | '2160p';

export interface RenderSettings {
  quality: Quality;
  resolution: Resolution;
}

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uSat: { value: 1 },
    uContrast: { value: 1 },
    uVignette: { value: 0.3 },
    uFade: { value: 0 },
    uFlash: { value: new THREE.Vector4(1, 1, 1, 0) },
    uLetterbox: { value: 0 },
    uDesat: { value: 0 },
    uAspect: { value: 1.777 },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec3 uTint; uniform float uSat; uniform float uContrast; uniform float uVignette;
    uniform float uFade; uniform vec4 uFlash; uniform float uLetterbox; uniform float uDesat;
    uniform float uAspect; uniform float uTime;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb * uTint;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat * (1.0 - uDesat));
      col = (col - 0.5) * uContrast + 0.5;
      vec2 d = (vUv - 0.5) * vec2(uAspect, 1.0);
      float v = smoothstep(0.95, 0.25, length(d));
      col *= mix(1.0, v, uVignette);
      // 极细微的胶片颗粒，避免大面积渐变出现色带
      col += (hash(vUv * 1024.0 + uTime) - 0.5) * 0.012;
      col = mix(col, uFlash.rgb, uFlash.a);
      col = mix(col, vec3(0.0), uFade);
      float lb = step(vUv.y, uLetterbox) + step(1.0 - uLetterbox, vUv.y);
      col = mix(col, vec3(0.0), clamp(lb, 0.0, 1.0));
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
};

const MSAA: Record<Quality, number> = { low: 0, medium: 2, high: 4, ultra: 4 };

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly canvas: HTMLCanvasElement;
  scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private renderPass!: RenderPass;
  private bloom!: UnrealBloomPass;
  private grade!: ShaderPass;
  private smaa: SMAAPass | null = null;
  settings: RenderSettings;
  private updaters = new Set<(dt: number, t: number) => void>();
  private timer = new THREE.Timer();
  private time = 0;
  private running = false;
  private shakeAmt = 0;
  private shakeT = 0;
  readonly bufferSize = new THREE.Vector2();
  private mood: EnvironmentMood = {
    exposure: 1,
    bloomStrength: 0.5,
    bloomRadius: 0.5,
    bloomThreshold: 0.85,
    vignette: 0.3,
    tint: '#ffffff',
    saturation: 1,
    contrast: 1,
  };
  /** 时间缩放（加速战斗） */
  timeScale = 1;

  constructor(container: HTMLElement, settings: RenderSettings) {
    this.settings = { ...settings };
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'gl';
    container.appendChild(this.canvas);
    this.camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 600);
    this.buildComposer();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private buildComposer() {
    const q = this.settings.quality;
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: MSAA[q] });
    this.composer?.dispose();
    this.composer = new EffectComposer(this.renderer, rt);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.5, 0.85);
    if (q !== 'low') this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    if (q === 'low') {
      this.smaa = new SMAAPass();
      this.composer.addPass(this.smaa);
    } else this.smaa = null;
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.applyMood();
  }

  setScene(scene: THREE.Scene) {
    this.scene = scene;
    this.renderPass.scene = scene;
  }

  /** 修改画质/分辨率 */
  setSettings(s: Partial<RenderSettings>) {
    const prevQ = this.settings.quality;
    Object.assign(this.settings, s);
    if (s.quality && s.quality !== prevQ) this.buildComposer();
    this.resize();
  }

  /** 目标像素比：让绘制缓冲达到指定分辨率（可超采样） */
  private pixelRatio(cssW: number, cssH: number): number {
    const dpr = window.devicePixelRatio || 1;
    const r = this.settings.resolution;
    const cap = (pr: number) => Math.min(pr, 3840 / cssW, 2160 / cssH, 4);
    switch (r) {
      case 'native':
        return cap(dpr);
      case '1080p':
        return cap(1080 / cssH);
      case '1440p':
        return cap(1440 / cssH);
      case '2160p':
        return cap(2160 / cssH);
      default: {
        const qCap = { low: 1, medium: 1.5, high: 2, ultra: 3 }[this.settings.quality];
        return cap(Math.min(dpr, qCap));
      }
    }
  }

  resize() {
    const w = Math.max(1, this.canvas.parentElement?.clientWidth ?? window.innerWidth);
    const h = Math.max(1, this.canvas.parentElement?.clientHeight ?? window.innerHeight);
    const pr = this.pixelRatio(w, h);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    // Bloom 在半分辨率上计算，4K 下依然流畅
    this.bloom.resolution.set(Math.round((w * pr) / 2), Math.round((h * pr) / 2));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.getDrawingBufferSize(this.bufferSize);
    this.grade.uniforms.uAspect.value = w / h;
  }

  setMood(m: EnvironmentMood) {
    this.mood = { ...m };
    this.applyMood();
  }

  private applyMood() {
    const m = this.mood;
    this.renderer.toneMappingExposure = m.exposure;
    this.bloom.strength = m.bloomStrength;
    this.bloom.radius = m.bloomRadius;
    this.bloom.threshold = m.bloomThreshold;
    const g = this.grade.uniforms;
    (g.uTint.value as THREE.Color).set(m.tint);
    g.uSat.value = m.saturation;
    g.uContrast.value = m.contrast;
    g.uVignette.value = m.vignette;
  }

  onUpdate(fn: (dt: number, t: number) => void): () => void {
    this.updaters.add(fn);
    return () => this.updaters.delete(fn);
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      this.frame();
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }

  /** 推进并渲染一帧（也可由截图脚本手动调用） */
  frame(dtOverride?: number) {
    this.timer.update();
    const raw = dtOverride ?? Math.min(0.05, this.timer.getDelta());
    const dt = raw * this.timeScale;
    this.time += dt;
    for (const fn of this.updaters) fn(dt, this.time);
    this.applyShake(dt);
    this.grade.uniforms.uTime.value = this.time % 100;
    this.composer.render(dt);
  }

  get elapsed() {
    return this.time;
  }

  /* -------------------- 画面效果 -------------------- */

  private tween(fn: (t: number) => void, ms: number): Promise<void> {
    return new Promise((res) => {
      const start = performance.now();
      const step = () => {
        const t = Math.min(1, (performance.now() - start) / Math.max(1, ms));
        fn(t);
        if (t < 1) requestAnimationFrame(step);
        else res();
      };
      step();
    });
  }

  fadeTo(v: number, ms = 400): Promise<void> {
    const from = this.grade.uniforms.uFade.value as number;
    return this.tween((t) => (this.grade.uniforms.uFade.value = from + (v - from) * t), ms);
  }

  setFade(v: number) {
    this.grade.uniforms.uFade.value = v;
  }

  flash(color = '#ffffff', ms = 260, peak = 0.75): Promise<void> {
    const f = this.grade.uniforms.uFlash.value as THREE.Vector4;
    const c = new THREE.Color(color);
    f.set(c.r, c.g, c.b, peak);
    return this.tween((t) => (f.w = peak * (1 - t)), ms);
  }

  letterbox(target: number, ms = 350): Promise<void> {
    const from = this.grade.uniforms.uLetterbox.value as number;
    return this.tween((t) => (this.grade.uniforms.uLetterbox.value = from + (target - from) * (t * t * (3 - 2 * t))), ms);
  }

  desaturate(v: number, ms = 800): Promise<void> {
    const from = this.grade.uniforms.uDesat.value as number;
    return this.tween((t) => (this.grade.uniforms.uDesat.value = from + (v - from) * t), ms);
  }

  shake(strength = 0.15, ms = 300) {
    this.shakeAmt = Math.max(this.shakeAmt, strength);
    this.shakeT = Math.max(this.shakeT, ms / 1000);
  }

  private shakeOffset = new THREE.Vector3();
  private applyShake(dt: number) {
    this.camera.position.sub(this.shakeOffset);
    this.shakeOffset.set(0, 0, 0);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = this.shakeAmt * Math.max(0, this.shakeT * 3);
      this.shakeOffset.set((Math.random() - 0.5) * a, (Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
      this.camera.position.add(this.shakeOffset);
      if (this.shakeT <= 0) this.shakeAmt = 0;
    }
  }
}
