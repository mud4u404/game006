/**
 * 战斗与法术特效
 *  - 粒子池（加色发光层 + 普通混合层），CPU 模拟、GPU 绘制
 *  - 网格特效：刀光弧、冲击波环、光柱、闪电、魔法阵、投射物
 *  - 固定数量的点光源池（避免着色器重编译）
 */
import * as THREE from 'three';
import type { CreateVfxSystem, Quality, VfxId, VfxPlayOptions, VfxSystem } from '../contracts';

const COUNT: Record<Quality, number> = { low: 0.35, medium: 0.6, high: 0.85, ultra: 1 };

/* ------------------------------------------------------------------ */
/* 粒子池                                                              */
/* ------------------------------------------------------------------ */

interface Emit {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  gravity?: number;
  drag?: number;
  grow?: number;
  /** 拖尾拉伸（速度方向） */
  spin?: number;
}

class ParticlePool {
  readonly points: THREE.Points;
  private max: number;
  private pos: Float32Array;
  private vel: Float32Array;
  private col: Float32Array;
  private alpha: Float32Array;
  private size: Float32Array;
  private baseSize: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private grav: Float32Array;
  private drag: Float32Array;
  private grow: Float32Array;
  private geo: THREE.BufferGeometry;
  private next = 0;
  private mat: THREE.ShaderMaterial;

  constructor(max: number, additive: boolean) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.alpha = new Float32Array(max);
    this.size = new Float32Array(max);
    this.baseSize = new Float32Array(max);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.grow = new Float32Array(max);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uScale: { value: 400 } },
      vertexShader: /* glsl */ `
        attribute vec3 aColor; attribute float aAlpha; attribute float aSize;
        uniform float uScale;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vColor = aColor; vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uScale / max(0.3, -mv.z);
        }`,
      fragmentShader: additive
        ? /* glsl */ `
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.0, d);
          a = a * a * vAlpha;
          if (a < 0.003) discard;
          gl_FragColor = vec4(vColor * a, a);
        }`
        : /* glsl */ `
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.3, d) * vAlpha;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vColor, a);
        }`,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 20;
  }

  emit(e: Emit) {
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    this.pos.set([e.pos.x, e.pos.y, e.pos.z], i * 3);
    this.vel.set([e.vel.x, e.vel.y, e.vel.z], i * 3);
    this.col.set([e.color.r, e.color.g, e.color.b], i * 3);
    this.baseSize[i] = e.size;
    this.size[i] = e.size;
    this.life[i] = e.life;
    this.maxLife[i] = e.life;
    this.grav[i] = e.gravity ?? 0;
    this.drag[i] = e.drag ?? 0;
    this.grow[i] = e.grow ?? 0;
    this.alpha[i] = 1;
  }

  setScale(s: number) {
    this.mat.uniforms.uScale.value = s;
  }

  update(dt: number) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) {
        if (this.alpha[i] !== 0) {
          this.alpha[i] = 0;
          this.size[i] = 0;
        }
        continue;
      }
      this.life[i] -= dt;
      const k = i * 3;
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[k] *= d;
      this.vel[k + 1] = this.vel[k + 1] * d - this.grav[i] * dt;
      this.vel[k + 2] *= d;
      this.pos[k] += this.vel[k] * dt;
      this.pos[k + 1] += this.vel[k + 1] * dt;
      this.pos[k + 2] += this.vel[k + 2] * dt;
      const t = 1 - this.life[i] / this.maxLife[i];
      this.alpha[i] = Math.max(0, Math.min(1, t * 8) * (1 - t * t));
      this.size[i] = this.baseSize[i] * (1 + this.grow[i] * t);
    }
    for (const n of ['position', 'aColor', 'aAlpha', 'aSize']) (this.geo.attributes[n] as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
  }
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const HDR = (hex: string, k: number) => new THREE.Color(hex).multiplyScalar(k);
function randDir(): THREE.Vector3 {
  const u = Math.random() * 2 - 1;
  const t = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return V(s * Math.cos(t), u, s * Math.sin(t));
}

interface Task {
  t: number;
  dur: number;
  update(t: number, dt: number): void;
  end?(): void;
}

/** 渐变着色器：用于刀光、光柱、冲击波 */
function glowMaterial(color: THREE.Color, mode: 'arc' | 'ring' | 'pillar' | 'rune' | 'streak'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uColor: { value: color }, uAlpha: { value: 1 }, uTime: { value: 0 }, uProg: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uAlpha; uniform float uTime; uniform float uProg;
      varying vec2 vUv;
      void main() {
        float a = 0.0;
        ${
          mode === 'arc'
            ? `// 刀光：沿弧长从尾到头渐亮，径向中心最亮
               float along = vUv.x; float across = abs(vUv.y - 0.5) * 2.0;
               a = smoothstep(0.0, 0.85, along) * smoothstep(1.0, 0.92, along) * pow(1.0 - across, 2.0);`
            : mode === 'ring'
            ? `float r = length(vUv - 0.5) * 2.0;
               a = smoothstep(0.75, 0.95, r) * smoothstep(1.0, 0.95, r) + smoothstep(0.9, 0.0, r) * 0.15;`
            : mode === 'pillar'
            ? `float x = abs(vUv.x - 0.5) * 2.0;
               a = pow(1.0 - x, 3.0) * smoothstep(1.0, 0.2, vUv.y) * (0.8 + 0.2 * sin(vUv.y * 30.0 - uTime * 10.0));`
            : mode === 'rune'
            ? `vec2 p = vUv - 0.5; float r = length(p) * 2.0; float ang = atan(p.y, p.x);
               float ring1 = smoothstep(0.02, 0.0, abs(r - 0.92)); float ring2 = smoothstep(0.02, 0.0, abs(r - 0.7));
               float ticks = smoothstep(0.6, 1.0, sin(ang * 16.0 + uTime * 2.0)) * step(0.72, r) * step(r, 0.9);
               float star = smoothstep(0.02, 0.0, abs(r - 0.7 * (0.75 + 0.25 * cos(ang * 5.0 - uTime))));
               a = (ring1 + ring2 * 0.8 + ticks * 0.6 + star * 0.7) * step(r, 1.0);`
            : `float x = abs(vUv.y - 0.5) * 2.0; a = pow(1.0 - x, 2.0) * smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);`
        }
        a *= uAlpha;
        if (a < 0.003) discard;
        gl_FragColor = vec4(uColor * a, a);
      }`,
  });
}

/* ------------------------------------------------------------------ */
/* 特效系统                                                            */
/* ------------------------------------------------------------------ */

class Vfx implements VfxSystem {
  private scene: THREE.Scene;
  private add: ParticlePool;
  private norm: ParticlePool;
  private tasks: Task[] = [];
  private lights: THREE.PointLight[] = [];
  private lightLife: number[] = [];
  private q: number;
  private group = new THREE.Group();
  private disposables: { dispose(): void }[] = [];

  constructor(scene: THREE.Scene, quality: Quality) {
    this.scene = scene;
    this.q = COUNT[quality];
    this.add = new ParticlePool(Math.round(5000 * this.q) + 400, true);
    this.norm = new ParticlePool(Math.round(1600 * this.q) + 200, false);
    this.group.add(this.add.points, this.norm.points);
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight('#ffffff', 0, 6, 1.6);
      this.lights.push(l);
      this.lightLife.push(0);
      this.group.add(l);
    }
    scene.add(this.group);
  }

  private n(k: number) {
    return Math.max(1, Math.round(k * this.q));
  }

  private flashLight(pos: THREE.Vector3, color: string, intensity: number, dur: number) {
    let best = 0;
    for (let i = 1; i < this.lights.length; i++) if (this.lightLife[i] < this.lightLife[best]) best = i;
    const l = this.lights[best];
    l.position.copy(pos);
    l.color.set(color);
    l.userData.peak = intensity;
    l.userData.dur = dur;
    this.lightLife[best] = dur;
  }

  private task(dur: number, update: (t: number, dt: number) => void, end?: () => void) {
    this.tasks.push({ t: 0, dur, update, end });
  }

  private wait(ms: number) {
    return new Promise<void>((r) => this.task(ms / 1000, () => {}, r));
  }

  /* -------------------- 基础元素 -------------------- */

  private sparks(at: THREE.Vector3, color: string, count: number, speed = 3, size = 0.08, life = 0.45, gravity = 4) {
    for (let i = 0; i < this.n(count); i++) {
      this.add.emit({ pos: at.clone(), vel: randDir().multiplyScalar(rnd(0.3, 1) * speed), color: HDR(color, rnd(2, 4)), size: size * rnd(0.6, 1.2), life: life * rnd(0.6, 1.2), gravity, drag: 2 });
    }
  }

  private smoke(at: THREE.Vector3, color: string, count: number, size = 0.4, life = 1.0) {
    for (let i = 0; i < this.n(count); i++) {
      this.norm.emit({
        pos: at.clone().add(randDir().multiplyScalar(0.15)),
        vel: V(rnd(-0.4, 0.4), rnd(0.3, 0.9), rnd(-0.4, 0.4)),
        color: new THREE.Color(color).multiplyScalar(rnd(0.7, 1.1)),
        size: size * rnd(0.7, 1.3),
        life: life * rnd(0.7, 1.3),
        drag: 1.5,
        grow: 1.5,
      });
    }
  }

  private fireBurst(at: THREE.Vector3, scale = 1, hue: [string, string] = ['#ffb040', '#ff4010']) {
    for (let i = 0; i < this.n(70 * scale); i++) {
      const c = new THREE.Color(hue[0]).lerp(new THREE.Color(hue[1]), Math.random()).multiplyScalar(rnd(2.5, 5));
      this.add.emit({ pos: at.clone().add(randDir().multiplyScalar(0.1 * scale)), vel: randDir().multiplyScalar(rnd(0.5, 2.6) * scale).add(V(0, 0.8, 0)), color: c, size: rnd(0.12, 0.3) * scale, life: rnd(0.35, 0.8), drag: 3, grow: 0.8, gravity: -1.5 });
    }
    this.sparks(at, hue[0], 30 * scale, 4 * scale, 0.06, 0.6);
    this.smoke(at.clone().add(V(0, 0.2, 0)), '#3a2a24', 10 * scale, 0.5 * scale, 1.2);
    this.ring(at, hue[0], 1.4 * scale, 0.4);
  }

  /** 地面冲击波环 */
  private ring(at: THREE.Vector3, color: string, radius: number, dur: number, y = 0.05) {
    const mat = glowMaterial(HDR(color, 2.5), 'ring');
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.copy(at);
    m.position.y = at.y - 0.4 + y;
    this.group.add(m);
    this.task(
      dur,
      (t) => {
        const s = radius * 2 * (0.2 + 0.8 * (1 - Math.pow(1 - t, 3)));
        m.scale.set(s, s, s);
        mat.uniforms.uAlpha.value = 1 - t;
      },
      () => {
        this.group.remove(m);
        m.geometry.dispose();
        mat.dispose();
      },
    );
  }

  /** 光柱 */
  private pillar(at: THREE.Vector3, color: string, height: number, radius: number, dur: number) {
    const mat = glowMaterial(HDR(color, 2.2), 'pillar');
    const g = new THREE.CylinderGeometry(radius, radius, height, 24, 1, true);
    g.translate(0, height / 2, 0);
    const m = new THREE.Mesh(g, mat);
    m.position.set(at.x, at.y - 0.4, at.z);
    this.group.add(m);
    this.task(
      dur,
      (t, ) => {
        mat.uniforms.uTime.value += 0.016;
        const grow = Math.min(1, t * 5);
        m.scale.set(grow * (1 - t * 0.3), 1, grow * (1 - t * 0.3));
        mat.uniforms.uAlpha.value = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      },
      () => {
        this.group.remove(m);
        g.dispose();
        mat.dispose();
      },
    );
  }

  /** 魔法阵 */
  private rune(at: THREE.Vector3, color: string, radius: number, dur: number) {
    const mat = glowMaterial(HDR(color, 2), 'rune');
    const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(at.x, at.y - 0.38, at.z);
    this.group.add(m);
    this.task(
      dur,
      (t) => {
        mat.uniforms.uTime.value = t * 6;
        m.rotation.z = t * 2;
        const s = Math.min(1, t * 5);
        m.scale.set(s, s, s);
        mat.uniforms.uAlpha.value = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
      },
      () => {
        this.group.remove(m);
        m.geometry.dispose();
        mat.dispose();
      },
    );
  }

  /** 刀光弧 */
  private arc(at: THREE.Vector3, from: THREE.Vector3, color: string, size: number, dur: number, tilt = 0.6) {
    const mat = glowMaterial(HDR(color, 3), 'arc');
    // 弧形带：沿 x 为弧长、y 为宽度
    const g = new THREE.RingGeometry(size * 0.55, size, 32, 1, 0, Math.PI * 1.1);
    const uv = g.attributes.uv;
    const pos = g.attributes.position;
    for (let i = 0; i < uv.count; i++) {
      const a = Math.atan2(pos.getY(i), pos.getX(i));
      const r = Math.hypot(pos.getX(i), pos.getY(i));
      uv.setXY(i, a / (Math.PI * 1.1), (r - size * 0.55) / (size * 0.45));
    }
    const m = new THREE.Mesh(g, mat);
    m.position.copy(at);
    const dir = at.clone().sub(from);
    dir.y = 0;
    m.lookAt(at.clone().add(dir.lengthSq() > 0 ? dir.normalize() : V(0, 0, 1)));
    m.rotateZ(tilt + Math.PI * 0.1);
    this.group.add(m);
    this.task(
      dur,
      (t) => {
        m.rotateZ(-0.12);
        const s = 0.8 + t * 0.35;
        m.scale.set(s, s, s);
        mat.uniforms.uAlpha.value = (1 - t) * Math.min(1, t * 10);
      },
      () => {
        this.group.remove(m);
        g.dispose();
        mat.dispose();
      },
    );
  }

  /** 拉长的光线（突刺、速度线） */
  private streak(from: THREE.Vector3, to: THREE.Vector3, color: string, width: number, dur: number) {
    const mat = glowMaterial(HDR(color, 3), 'streak');
    const len = from.distanceTo(to);
    const g = new THREE.PlaneGeometry(len, width);
    g.translate(len / 2, 0, 0);
    const m = new THREE.Mesh(g, mat);
    m.position.copy(from);
    const dir = to.clone().sub(from).normalize();
    m.quaternion.setFromUnitVectors(V(1, 0, 0), dir);
    m.rotateX(Math.PI / 2);
    this.group.add(m);
    const m2 = m.clone();
    m2.rotateX(Math.PI / 2);
    this.group.add(m2);
    this.task(
      dur,
      (t) => {
        mat.uniforms.uAlpha.value = (1 - t) * Math.min(1, t * 12);
        const s = 0.6 + t * 0.6;
        m.scale.set(s, 1 - t * 0.6, 1);
        m2.scale.copy(m.scale);
      },
      () => {
        this.group.remove(m, m2);
        g.dispose();
        mat.dispose();
      },
    );
  }

  /** 闪电：折线带 */
  private bolt(from: THREE.Vector3, to: THREE.Vector3, color: string, dur: number, width = 0.06) {
    const segs = 12;
    const mat = new THREE.MeshBasicMaterial({ color: HDR(color, 6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const group = new THREE.Group();
    const build = () => {
      group.clear();
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= segs; i++) {
        const p = from.clone().lerp(to, i / segs);
        if (i > 0 && i < segs) p.add(V(rnd(-0.18, 0.18), rnd(-0.1, 0.1), rnd(-0.18, 0.18)));
        pts.push(p);
      }
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0);
      const tube = new THREE.TubeGeometry(curve, segs * 2, width, 4, false);
      group.add(new THREE.Mesh(tube, mat));
      const glow = new THREE.TubeGeometry(curve, segs * 2, width * 3, 4, false);
      const gm = new THREE.Mesh(glow, new THREE.MeshBasicMaterial({ color: HDR(color, 1.2), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
      group.add(gm);
    };
    build();
    this.group.add(group);
    let acc = 0;
    this.task(
      dur,
      (t, dt) => {
        acc += dt;
        if (acc > 0.05) {
          acc = 0;
          for (const c of group.children) {
            (c as THREE.Mesh).geometry.dispose();
            if (c !== group.children[0]) ((c as THREE.Mesh).material as THREE.Material).dispose();
          }
          build();
        }
        mat.opacity = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      },
      () => {
        for (const c of group.children) {
          (c as THREE.Mesh).geometry.dispose();
          if ((c as THREE.Mesh).material !== mat) ((c as THREE.Mesh).material as THREE.Material).dispose();
        }
        this.group.remove(group);
        mat.dispose();
      },
    );
  }

  /** 投射物：沿抛物线飞行，返回到达时间的 Promise */
  private projectile(from: THREE.Vector3, to: THREE.Vector3, opts: { color: string; size: number; arc: number; dur: number; trail: string; mesh?: THREE.Object3D; trailRate?: number }) {
    return new Promise<void>((resolve) => {
      const core = opts.mesh ?? new THREE.Mesh(new THREE.SphereGeometry(opts.size, 12, 10), new THREE.MeshBasicMaterial({ color: HDR(opts.color, 4) }));
      this.group.add(core);
      const p = V();
      let acc = 0;
      this.task(
        opts.dur,
        (t, dt) => {
          p.copy(from).lerp(to, t);
          p.y += Math.sin(t * Math.PI) * opts.arc;
          const prev = core.position.clone();
          core.position.copy(p);
          if (opts.mesh) {
            const dir = p.clone().sub(prev);
            if (dir.lengthSq() > 1e-6) core.lookAt(p.clone().add(dir));
          }
          acc += dt;
          const rate = opts.trailRate ?? 0.008;
          while (acc > rate) {
            acc -= rate;
            this.add.emit({ pos: p.clone().add(randDir().multiplyScalar(opts.size * 0.5)), vel: randDir().multiplyScalar(0.3), color: HDR(opts.trail, rnd(1.5, 3)), size: opts.size * rnd(1.2, 2.2), life: rnd(0.2, 0.45), drag: 3, grow: -0.5 });
          }
        },
        () => {
          this.group.remove(core);
          core.traverse((o) => {
            const m = o as THREE.Mesh;
            m.geometry?.dispose();
            (m.material as THREE.Material | undefined)?.dispose?.();
          });
          resolve();
        },
      );
    });
  }

  /** 上升的光点 */
  private motes(at: THREE.Vector3, color: string, count: number, radius: number, speed = 1.2, size = 0.08, life = 1.0) {
    for (let i = 0; i < this.n(count); i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      this.add.emit({ pos: V(at.x + Math.cos(a) * r, at.y - 0.4 + Math.random() * 0.3, at.z + Math.sin(a) * r), vel: V(0, rnd(0.5, 1) * speed, 0), color: HDR(color, rnd(1.5, 3)), size: size * rnd(0.6, 1.3), life: life * rnd(0.6, 1.3), drag: 0.5 });
    }
  }

  /* -------------------- 播放 -------------------- */

  async play(id: VfxId, from: THREE.Vector3, to: THREE.Vector3, opts: VfxPlayOptions = {}): Promise<void> {
    const s = opts.scale ?? 1;
    const impact = () => opts.onImpact?.();
    const T = to.clone();
    switch (id) {
      case 'slash': {
        this.arc(T, from, '#fff2d0', 0.55 * s, 0.28);
        this.sparks(T, '#ffe0a0', 18, 3);
        this.flashLight(T, '#ffe8c0', 3, 0.15);
        impact();
        await this.wait(300);
        break;
      }
      case 'heavy_slash': {
        this.arc(T, from, '#ffd8a0', 0.8 * s, 0.35, 1.2);
        this.sparks(T, '#ffcc80', 30, 4.5);
        this.ring(T, '#ffd8a0', 1.0 * s, 0.4);
        this.smoke(T.clone().add(V(0, -0.3, 0)), '#8a7a6a', 8, 0.35, 0.8);
        this.flashLight(T, '#ffd8a0', 4, 0.2);
        impact();
        await this.wait(380);
        break;
      }
      case 'pierce': {
        const dir = T.clone().sub(from).normalize();
        this.streak(T.clone().sub(dir.clone().multiplyScalar(0.6)), T.clone().add(dir.clone().multiplyScalar(0.35)), '#e0f0ff', 0.12 * s, 0.25);
        this.sparks(T, '#d8ecff', 16, 3.5);
        impact();
        await this.wait(260);
        break;
      }
      case 'claw': {
        for (let i = -1; i <= 1; i++) {
          const off = V(i * 0.1, i * 0.05, 0);
          this.streak(T.clone().add(off).add(V(-0.3, 0.3, 0)), T.clone().add(off).add(V(0.3, -0.3, 0)), '#ff5040', 0.05 * s, 0.3);
        }
        this.sparks(T, '#ff6040', 14, 2.5);
        impact();
        await this.wait(300);
        break;
      }
      case 'impact': {
        this.sparks(T, '#ffe8c0', 14, 2.5);
        impact();
        await this.wait(200);
        break;
      }
      case 'critical': {
        this.flashLight(T, '#ffffff', 8, 0.25);
        this.arc(T, from, '#ffffff', 0.9 * s, 0.3, 0.9);
        for (let i = 0; i < 14; i++) {
          const d = randDir();
          d.y *= 0.4;
          d.normalize();
          this.streak(T.clone().add(d.clone().multiplyScalar(0.25)), T.clone().add(d.clone().multiplyScalar(rnd(1.0, 1.6) * s)), '#fff6e0', 0.035, 0.3);
        }
        this.sparks(T, '#fff0c0', 50, 6, 0.08, 0.6);
        this.ring(T, '#ffffff', 1.6 * s, 0.45);
        impact();
        await this.wait(450);
        break;
      }
      case 'arrow': {
        const arrow = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 4), new THREE.MeshBasicMaterial({ color: '#c8a070' }));
        shaft.rotation.x = Math.PI / 2;
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 4), new THREE.MeshBasicMaterial({ color: '#e8eef8' }));
        tip.rotation.x = Math.PI / 2;
        tip.position.z = 0.22;
        arrow.add(shaft, tip);
        await this.projectile(from, T, { color: '#ffffff', size: 0.03, arc: from.distanceTo(T) * 0.18, dur: 0.32, trail: '#ffffff', mesh: arrow, trailRate: 0.02 });
        this.sparks(T, '#fff0d0', 12, 2.5);
        impact();
        await this.wait(150);
        break;
      }
      case 'fire': {
        await this.projectile(from, T, { color: '#ffcf60', size: 0.1 * s, arc: 0.4, dur: 0.45, trail: '#ff7a20' });
        this.fireBurst(T, s);
        this.flashLight(T, '#ff8a30', 6, 0.5);
        impact();
        await this.wait(500);
        break;
      }
      case 'inferno': {
        this.rune(T, '#ff7a30', 1.6 * s, 1.4);
        await this.wait(250);
        this.flashLight(T, '#ff7020', 8, 0.9);
        for (let k = 0; k < 5; k++) {
          const off = k === 0 ? V() : V(Math.cos(k * 1.57) * 0.9, 0, Math.sin(k * 1.57) * 0.9).multiplyScalar(s);
          const at = T.clone().add(off);
          for (let i = 0; i < this.n(60); i++) {
            const c = new THREE.Color('#ffb040').lerp(new THREE.Color('#ff3010'), Math.random()).multiplyScalar(rnd(2.5, 5));
            this.add.emit({ pos: at.clone().add(V(rnd(-0.25, 0.25), -0.4, rnd(-0.25, 0.25))), vel: V(rnd(-0.3, 0.3), rnd(2, 4.5), rnd(-0.3, 0.3)), color: c, size: rnd(0.15, 0.35), life: rnd(0.4, 0.9), drag: 1.5, grow: 0.6 });
          }
          this.smoke(at.clone().add(V(0, 0.6, 0)), '#2a1a16', 6, 0.6, 1.4);
          if (k === 0) impact();
          await this.wait(60);
        }
        this.ring(T, '#ff9040', 2.2 * s, 0.6);
        await this.wait(650);
        break;
      }
      case 'ice': {
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.09 * s, 0), new THREE.MeshBasicMaterial({ color: HDR('#bff4ff', 2.5) }));
        shard.scale.set(0.6, 0.6, 2.2);
        await this.projectile(from, T, { color: '#bff4ff', size: 0.07 * s, arc: 0.2, dur: 0.38, trail: '#9fe8ff', mesh: shard });
        for (let i = 0; i < this.n(45); i++) this.add.emit({ pos: T.clone(), vel: randDir().multiplyScalar(rnd(1, 3.5)), color: HDR(i % 3 ? '#bff4ff' : '#ffffff', rnd(2, 4)), size: rnd(0.05, 0.12), life: rnd(0.4, 0.8), gravity: 3, drag: 1.5 });
        this.ring(T, '#9fe8ff', 0.9 * s, 0.4);
        this.flashLight(T, '#9fe8ff', 4, 0.35);
        impact();
        await this.wait(450);
        break;
      }
      case 'blizzard': {
        this.rune(T, '#9fe8ff', 2.2 * s, 1.6);
        this.flashLight(T, '#bfefff', 5, 1.2);
        const t0 = performance.now();
        let fired = false;
        await new Promise<void>((res) =>
          this.task(
            1.4,
            (t) => {
              for (let i = 0; i < this.n(10); i++) {
                const a = Math.random() * Math.PI * 2;
                const r = rnd(0.2, 2.0) * s;
                const p = V(T.x + Math.cos(a) * r, T.y - 0.3 + rnd(0, 1.6), T.z + Math.sin(a) * r);
                const tang = V(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(rnd(2, 4));
                this.add.emit({ pos: p, vel: tang.add(V(0, rnd(-0.5, 0.5), 0)), color: HDR(Math.random() < 0.5 ? '#ffffff' : '#9fe8ff', rnd(1.5, 3)), size: rnd(0.05, 0.12), life: rnd(0.4, 0.8), drag: 0.5 });
              }
              if (!fired && t > 0.3) {
                fired = true;
                impact();
              }
            },
            res,
          ),
        );
        void t0;
        break;
      }
      case 'thunder': {
        this.flashLight(T, '#a8c8ff', 10, 0.35);
        this.bolt(T.clone().add(V(rnd(-0.3, 0.3), 6, rnd(-0.3, 0.3))), T.clone().add(V(0, -0.35, 0)), '#cfe0ff', 0.35, 0.05 * s);
        this.sparks(T, '#cfe0ff', 40, 5, 0.06, 0.5);
        this.ring(T, '#a8c8ff', 1.2 * s, 0.4);
        impact();
        await this.wait(400);
        break;
      }
      case 'storm': {
        this.rune(T, '#a8c8ff', 2.0 * s, 1.5);
        await this.wait(200);
        for (let k = 0; k < 5; k++) {
          const off = k === 0 ? V() : V(rnd(-1, 1), 0, rnd(-1, 1)).multiplyScalar(s);
          const at = T.clone().add(off);
          this.bolt(at.clone().add(V(rnd(-0.3, 0.3), 6, rnd(-0.3, 0.3))), at.clone().add(V(0, -0.35, 0)), '#cfe0ff', 0.3, 0.05);
          this.sparks(at, '#cfe0ff', 25, 4, 0.06, 0.4);
          this.flashLight(at, '#a8c8ff', 8, 0.25);
          if (k === 0) impact();
          await this.wait(110);
        }
        await this.wait(300);
        break;
      }
      case 'holy': {
        this.rune(T, '#fff0b0', 1.3 * s, 1.2);
        this.pillar(T, '#fff2c0', 5, 0.45 * s, 1.0);
        this.flashLight(T, '#fff0c0', 7, 0.8);
        this.motes(T, '#fff4c8', 50, 0.7 * s, 2.5, 0.08, 0.8);
        await this.wait(300);
        this.ring(T, '#fff0b0', 1.4 * s, 0.5);
        impact();
        await this.wait(650);
        break;
      }
      case 'dark': {
        this.rune(T, '#b070ff', 1.2 * s, 1.1);
        for (let i = 0; i < this.n(70); i++) {
          const a = Math.random() * Math.PI * 2;
          const r = rnd(0.8, 1.3) * s;
          const p = V(T.x + Math.cos(a) * r, T.y + rnd(-0.3, 0.6), T.z + Math.sin(a) * r);
          const toC = T.clone().sub(p).multiplyScalar(2.2).add(V(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(1.5));
          this.add.emit({ pos: p, vel: toC, color: HDR(i % 2 ? '#9a50ff' : '#5a20a0', rnd(1.5, 3)), size: rnd(0.08, 0.16), life: rnd(0.4, 0.6), drag: 0.5 });
          if (i % 3 === 0) this.norm.emit({ pos: p.clone(), vel: toC.clone().multiplyScalar(0.8), color: new THREE.Color('#120818'), size: rnd(0.2, 0.35), life: 0.5, drag: 1 });
        }
        await this.wait(420);
        this.sparks(T, '#c080ff', 30, 3.5);
        this.flashLight(T, '#9a50ff', 5, 0.4);
        impact();
        await this.wait(400);
        break;
      }
      case 'heal':
      case 'heal_all': {
        const big = id === 'heal_all';
        const r = (big ? 2.0 : 0.5) * s;
        this.rune(T, '#9fffc0', big ? 2.2 * s : 0.7 * s, 1.1);
        this.ring(T, '#a8ffcf', r, 0.8, 0.08);
        this.motes(T, '#b8ffd8', big ? 110 : 45, r, 1.6, 0.09, 1.0);
        this.motes(T, '#fff0b0', big ? 40 : 15, r, 1.2, 0.07, 1.0);
        this.flashLight(T, '#a8ffcf', 4, 0.8);
        await this.wait(350);
        impact();
        await this.wait(650);
        break;
      }
      case 'buff': {
        this.ring(T, '#ffd870', 0.6 * s, 0.6, 0.1);
        await this.wait(120);
        this.ring(T.clone().add(V(0, 0.4, 0)), '#ffd870', 0.5 * s, 0.6, 0.1);
        this.motes(T, '#ffe090', 35, 0.45 * s, 2, 0.07, 0.8);
        impact();
        await this.wait(600);
        break;
      }
      case 'debuff': {
        for (let i = 0; i < this.n(40); i++) {
          const a = Math.random() * Math.PI * 2;
          this.add.emit({ pos: V(T.x + Math.cos(a) * 0.4, T.y + rnd(0.4, 0.9), T.z + Math.sin(a) * 0.4), vel: V(0, rnd(-1.2, -0.6), 0), color: HDR('#9a40d0', rnd(1.5, 2.5)), size: rnd(0.08, 0.14), life: rnd(0.5, 0.9) });
        }
        this.ring(T, '#9a40d0', 0.7 * s, 0.6);
        await this.wait(250);
        impact();
        await this.wait(500);
        break;
      }
      case 'levelup': {
        this.pillar(T, '#ffd870', 3.2, 0.42, 1.1);
        this.ring(T, '#ffe090', 1.0, 0.7);
        for (let i = 0; i < this.n(60); i++) this.add.emit({ pos: T.clone().add(V(0, 0.2, 0)), vel: randDir().multiplyScalar(rnd(1, 3)).add(V(0, 1.5, 0)), color: HDR(i % 2 ? '#ffe090' : '#ffffff', rnd(2, 4)), size: rnd(0.06, 0.12), life: rnd(0.6, 1.1), gravity: 2, drag: 1 });
        this.flashLight(T, '#ffe090', 6, 0.8);
        impact();
        await this.wait(1000);
        break;
      }
      case 'promote': {
        // 龙焰螺旋缠绕光柱
        this.rune(T, '#ffb040', 1.8, 2.2);
        this.flashLight(T, '#ff9a40', 10, 2.0);
        await new Promise<void>((res) =>
          this.task(
            1.6,
            (t) => {
              const rise = t * 3.5;
              for (let k = 0; k < 2; k++) {
                const a = t * 14 + k * Math.PI;
                const r = 0.75 * (1 - t * 0.5);
                for (let i = 0; i < this.n(6); i++) {
                  const p = V(T.x + Math.cos(a) * r, T.y - 0.4 + rise * (0.8 + Math.random() * 0.2), T.z + Math.sin(a) * r);
                  const c = new THREE.Color(k ? '#ffb040' : '#ff4020').lerp(new THREE.Color('#ffe8a0'), Math.random() * 0.4).multiplyScalar(rnd(2.5, 4.5));
                  this.add.emit({ pos: p, vel: randDir().multiplyScalar(0.3), color: c, size: rnd(0.12, 0.26), life: rnd(0.4, 0.8), drag: 2, grow: 0.5, gravity: -0.5 });
                }
              }
            },
            res,
          ),
        );
        this.pillar(T, '#ffe0a0', 6, 0.55, 1.0);
        this.ring(T, '#ffd080', 2.2, 0.7);
        this.sparks(T.clone().add(V(0, 0.6, 0)), '#ffe0a0', 80, 5, 0.08, 0.9);
        impact();
        await this.wait(900);
        break;
      }
      case 'death': {
        for (let i = 0; i < this.n(60); i++) {
          const p = T.clone().add(V(rnd(-0.25, 0.25), rnd(-0.4, 0.4), rnd(-0.25, 0.25)));
          this.norm.emit({ pos: p, vel: V(rnd(-0.3, 0.3), rnd(0.3, 1.0), rnd(-0.3, 0.3)), color: new THREE.Color('#2a2420').lerp(new THREE.Color('#6a5a50'), Math.random()), size: rnd(0.06, 0.14), life: rnd(0.8, 1.6), drag: 0.8 });
          if (i % 3 === 0) this.add.emit({ pos: p.clone(), vel: V(rnd(-0.2, 0.2), rnd(0.4, 1.2), rnd(-0.2, 0.2)), color: HDR('#ff8a40', rnd(1.5, 3)), size: rnd(0.04, 0.08), life: rnd(0.6, 1.2), drag: 0.6 });
        }
        impact();
        await this.wait(900);
        break;
      }
      case 'dragon_breath':
      case 'ash_breath': {
        const ash = id === 'ash_breath';
        const hues: [string, string] = ash ? ['#c070ff', '#3a1060'] : ['#ffd060', '#ff3a10'];
        const dir = T.clone().sub(from);
        const dist = dir.length();
        dir.normalize();
        let fired = false;
        this.flashLight(T, ash ? '#a050ff' : '#ff7a20', 9, 1.2);
        await new Promise<void>((res) =>
          this.task(
            1.2,
            (t) => {
              if (t < 0.8) {
                for (let i = 0; i < this.n(28 * s); i++) {
                  const spread = randDir().multiplyScalar(rnd(0, 0.35));
                  const v = dir.clone().add(spread).normalize().multiplyScalar(rnd(dist * 1.6, dist * 2.4));
                  const c = new THREE.Color(hues[0]).lerp(new THREE.Color(hues[1]), Math.random()).multiplyScalar(rnd(2.5, 5));
                  this.add.emit({ pos: from.clone(), vel: v, color: c, size: rnd(0.15, 0.32) * s, life: rnd(0.35, 0.6), drag: 2.2, grow: 2.5 });
                  if (ash && i % 4 === 0) this.norm.emit({ pos: from.clone(), vel: v.clone().multiplyScalar(0.8), color: new THREE.Color('#140818'), size: rnd(0.3, 0.5) * s, life: 0.6, drag: 2, grow: 2 });
                }
              }
              if (!fired && t > 0.3) {
                fired = true;
                impact();
                this.fireBurst(T, 1.2 * s, hues);
              }
            },
            res,
          ),
        );
        break;
      }
      case 'meteor': {
        const start = T.clone().add(V(-3, 9, -2));
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 * s, 0), new THREE.MeshBasicMaterial({ color: HDR('#ff8a30', 2.5) }));
        this.rune(T, '#ff7a30', 2.0 * s, 1.6);
        await this.projectile(start, T, { color: '#ffb040', size: 0.3 * s, arc: 0, dur: 0.7, trail: '#ff6a20', mesh: rock, trailRate: 0.004 });
        this.fireBurst(T, 2.2 * s);
        this.ring(T, '#ffb060', 3 * s, 0.7);
        this.smoke(T, '#2a1a14', 25, 0.8, 1.8);
        this.flashLight(T, '#ff8a30', 12, 0.9);
        impact();
        await this.wait(800);
        break;
      }
      case 'spawn': {
        this.rune(T, '#ff6a4a', 0.7, 1.0);
        this.smoke(T.clone().add(V(0, -0.2, 0)), '#3a3040', 20, 0.45, 1.0);
        impact();
        await this.wait(700);
        break;
      }
      case 'warp': {
        this.pillar(T, '#bfe0ff', 4, 0.4, 0.9);
        this.motes(T, '#d0e8ff', 40, 0.4, 2.5, 0.07, 0.8);
        impact();
        await this.wait(800);
        break;
      }
      case 'chest': {
        this.flashLight(T, '#ffe090', 5, 0.8);
        for (let i = 0; i < this.n(45); i++) this.add.emit({ pos: T.clone(), vel: V(rnd(-1, 1), rnd(1.5, 3.5), rnd(-1, 1)), color: HDR(i % 2 ? '#ffe090' : '#fff8e0', rnd(2, 4)), size: rnd(0.05, 0.11), life: rnd(0.7, 1.2), gravity: 3, drag: 0.8 });
        impact();
        await this.wait(800);
        break;
      }
      case 'steal': {
        this.streak(from, T, '#8a80ff', 0.08, 0.25);
        this.sparks(T, '#c0b8ff', 20, 2.5);
        impact();
        await this.wait(300);
        break;
      }
      default:
        impact();
    }
  }

  update(dt: number, _time: number) {
    for (let i = this.tasks.length - 1; i >= 0; i--) {
      const t = this.tasks[i];
      t.t += dt;
      const p = Math.min(1, t.t / t.dur);
      t.update(p, dt);
      if (p >= 1) {
        this.tasks.splice(i, 1);
        t.end?.();
      }
    }
    this.add.update(dt);
    this.norm.update(dt);
    for (let i = 0; i < this.lights.length; i++) {
      const l = this.lights[i];
      if (this.lightLife[i] > 0) {
        this.lightLife[i] -= dt;
        const k = Math.max(0, this.lightLife[i] / (l.userData.dur as number));
        l.intensity = (l.userData.peak as number) * k;
      } else l.intensity = 0;
    }
  }

  /** 由引擎每帧设置：粒子像素尺寸系数 */
  setPixelScale(s: number) {
    this.add.setScale(s);
    this.norm.setScale(s);
  }

  dispose() {
    this.scene.remove(this.group);
    this.add.dispose();
    this.norm.dispose();
    for (const d of this.disposables) d.dispose();
  }
}

export const createVfxSystem: CreateVfxSystem = (scene, quality) => new Vfx(scene, quality);
export type VfxImpl = Vfx;
