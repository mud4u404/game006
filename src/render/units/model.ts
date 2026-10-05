/**
 * 单位模型：组装部件、卡通描边、程序化动画
 */
import * as THREE from 'three';
import { merge } from '../battlefield/geom';
import type { PlayOptions, Quality, UnitAnim, UnitModel, UnitModelSpec } from '../contracts';
import { buildArm, buildCape, buildHead, buildLeg, buildQuiver, buildShield, buildTorso, buildWeapon, REAL, SD, type Geo, type Proportions } from './parts';
import { dragon, golem, horse, salamander, scaleCreature, skullHead, wolf, wraith, wyvern, type CreatureSpec } from './creatures';
import { addSmoothNormals, createOutlineMaterial, createToonMaterial, createUnitUniforms, type UnitUniforms } from './toon';

const TEAM_COLORS: Record<UnitModelSpec['team'], [string, string]> = {
  player: ['#4aa3ff', '#ffd46a'],
  enemy: ['#ff4a3d', '#ff9a6a'],
  ally: ['#4dff88', '#c8ffb0'],
  neutral: ['#d8d8e0', '#ffffff'],
};

const ease = {
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 分段关键帧插值：keys = [[t0,v0],[t1,v1],...] */
function kf(keys: [number, number][], t: number, e: (x: number) => number = ease.inOut): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1];
      const [t1, v1] = keys[i];
      return lerp(v0, v1, e((t - t0) / Math.max(1e-6, t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
}

interface Pose {
  bodyY: number;
  bodyZ: number;
  bodyX: number;
  lean: number;
  roll: number;
  twist: number;
  squash: number;
  headX: number;
  headZ: number;
  armRX: number;
  armRZ: number;
  armLX: number;
  armLZ: number;
  legRX: number;
  legLX: number;
  weapon: number; // 武器绝对俯仰角（相对身体）
  cape: number;
  mount: number; // 坐骑前扬
}

const zeroPose = (): Pose => ({
  bodyY: 0,
  bodyZ: 0,
  bodyX: 0,
  lean: 0,
  roll: 0,
  twist: 0,
  squash: 0,
  headX: 0,
  headZ: 0,
  armRX: 0,
  armRZ: 0,
  armLX: 0,
  armLZ: 0,
  legRX: 0,
  legLX: 0,
  weapon: 0,
  cape: 0,
  mount: 0,
});

interface Action {
  anim: UnitAnim;
  t: number;
  dur: number;
  impactAt: number;
  impacted: boolean;
  onImpact?: () => void;
  resolve: () => void;
  speed: number;
}

const DURATION: Record<UnitAnim, [number, number]> = {
  attack: [0.75, 0.45],
  shoot: [0.8, 0.55],
  cast: [1.0, 0.6],
  heal: [0.9, 0.55],
  hit: [0.45, 0.05],
  dodge: [0.45, 0.2],
  death: [1.1, 0.4],
  victory: [1.0, 0.5],
  levelup: [0.9, 0.4],
};

export class ProceduralUnit implements UnitModel {
  readonly object = new THREE.Group();
  height = 0.9;
  private spec: UnitModelSpec;
  private P: Proportions;
  private uniforms: UnitUniforms;
  private mats: THREE.Material[] = [];
  private geos: THREE.BufferGeometry[] = [];
  private scaler = new THREE.Group();
  private rider = new THREE.Group();
  private bodyPivot = new THREE.Group();
  private j: Record<string, THREE.Object3D> = {};
  private creature: CreatureSpec | null = null;
  private humanoid = false;
  private moving = false;
  private walkT = 0;
  private yaw = 0;
  private targetYaw = 0;
  private action: Action | null = null;
  private flashAmt = 0;
  private flashDecay = 4;
  private ring: THREE.Mesh;
  private ringMat: THREE.ShaderMaterial;
  private highlighted = false;
  private actedT = 0;
  private acted = false;
  private dead = false;
  private seed = Math.random() * 100;
  private glowMat: THREE.MeshBasicMaterial;
  private hover = 0;

  constructor(spec: UnitModelSpec, quality: Quality) {
    this.spec = spec;
    this.P = spec.proportion === 'real' ? REAL : SD;
    const [teamCol, teamAccent] = TEAM_COLORS[spec.team];
    this.uniforms = createUnitUniforms(teamCol);
    const toon = createToonMaterial(this.uniforms);
    const outline = createOutlineMaterial(this.uniforms, this.P === SD ? 0.011 : 0.006);
    this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, toneMapped: true });
    this.glowMat.color.setScalar(3);
    this.mats.push(toon, outline, this.glowMat);
    const useOutline = quality !== 'low';

    // 构建零件的工具
    const makePart = (solid: Geo[], glow: Geo[] = [], flat: Geo[] = []): THREE.Group => {
      const g = new THREE.Group();
      if (flat.length) {
        // 五官等细节：不描边
        const fg = merge(flat);
        this.geos.push(fg);
        g.add(new THREE.Mesh(fg, toon));
      }
      if (solid.length) {
        const geo = addSmoothNormals(merge(solid));
        this.geos.push(geo);
        const m = new THREE.Mesh(geo, toon);
        m.castShadow = true;
        g.add(m);
        if (useOutline) {
          const o = new THREE.Mesh(geo, outline);
          g.add(o);
        }
      }
      if (glow.length) {
        const gg = merge(glow);
        this.geos.push(gg);
        g.add(new THREE.Mesh(gg, this.glowMat));
      }
      return g;
    };

    this.object.add(this.scaler);
    this.scaler.scale.setScalar(spec.scale ?? 1);

    // ---- 生物 / 坐骑 ----
    const body = spec.body;
    let mountSpec: CreatureSpec | null = null;
    if (body === 'humanoid' || body === 'skeleton') {
      const k = this.P === SD ? 1.35 : 2.6;
      if (spec.mount === 'horse') mountSpec = scaleCreature(horse(spec.team === 'enemy' ? '#3a3230' : '#7a5434', '#2e2018', spec.primary, spec.secondary, false), k);
      else if (spec.mount === 'pegasus') mountSpec = scaleCreature(horse('#f4f2ee', '#dfe6f2', null, spec.secondary, true), k);
      else if (spec.mount === 'wyvern') mountSpec = scaleCreature(wyvern(1, '#3e4a3a', '#8a8a62', '#5a3a3a', '#ffd040'), k * 0.85);
    } else {
      switch (body) {
        case 'wolf':
          this.creature = wolf(spec.primary || '#4a4458', '#ff4a3a');
          break;
        case 'salamander':
          this.creature = salamander(spec.primary || '#c8401e', spec.secondary || '#f0b040');
          break;
        case 'golem':
          this.creature = golem(spec.primary || '#4a4240', '#ff7a20');
          break;
        case 'wyvern':
          this.creature = wyvern(1.35, spec.primary || '#3e4a3a', spec.secondary || '#8a8a62', '#5a3030', '#ffd040');
          break;
        case 'dragon':
          this.creature = dragon(spec.primary || '#a8241e', spec.secondary || '#d8902a', '#e8d8b8', spec.glow ?? '#ffd040');
          break;
        case 'wraith':
          this.creature = wraith(spec.primary || '#2a2238', spec.glow ?? '#9a7cff');
          break;
      }
    }
    const cs = this.creature ?? mountSpec;
    if (cs) {
      const nodes: Record<string, THREE.Object3D> = {};
      for (const p of cs.parts) {
        const pivot = new THREE.Group();
        pivot.position.set(...p.pivot);
        pivot.add(makePart(p.solid, p.glow));
        nodes[p.name] = pivot;
        this.j['c_' + p.name] = pivot;
      }
      for (const p of cs.parts) {
        const parent = p.parent ? nodes[p.parent] : this.bodyPivot;
        parent.add(nodes[p.name]);
      }
      this.hover = cs.hover;
      this.height = cs.height;
      if (mountSpec) this.creature = mountSpec;
    }
    this.scaler.add(this.bodyPivot);

    // ---- 人形 ----
    if (body === 'humanoid' || body === 'skeleton') {
      this.humanoid = true;
      this.buildHumanoid(makePart);
      if (mountSpec && mountSpec.saddle) {
        // 骑手坐在鞍上：腿向两侧张开
        const body = this.j['c_body'];
        this.rider.position.set(mountSpec.saddle[0], mountSpec.saddle[1] - body.position.y - this.P.hipY + 0.05, mountSpec.saddle[2]);
        body.add(this.rider);
        this.j.legL.rotation.z = -0.9;
        this.j.legR.rotation.z = 0.9;
        this.height = mountSpec.saddle[1] + this.P.headY + this.P.headR - this.P.hipY + 0.05;
      } else {
        this.bodyPivot.add(this.rider);
        this.height = this.P.headY + this.P.headR + 0.05;
      }
    }
    this.height *= spec.scale ?? 1;

    // ---- 阵营光环 ----
    const rr = (cs && !this.humanoid) || spec.mount ? 0.42 : 0.34;
    this.ringMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(teamCol) },
        uAccent: { value: new THREE.Color(teamAccent) },
        uTime: { value: 0 },
        uAlpha: { value: 1 },
        uHi: { value: 0 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform vec3 uAccent; uniform float uTime; uniform float uAlpha; uniform float uHi;
        varying vec2 vUv;
        void main(){
          vec2 p = vUv - 0.5;
          float d = length(p) * 2.0;
          float ring = smoothstep(0.78, 0.86, d) * smoothstep(1.0, 0.9, d);
          float fill = smoothstep(0.86, 0.0, d) * 0.22;
          float a = atan(p.y, p.x);
          float dash = 0.5 + 0.5 * sin(a * 6.0 + uTime * 1.5);
          vec3 col = mix(uColor, uAccent, dash * 0.3) * (ring * (0.75 + uHi * 1.2) + fill * (0.6 + uHi));
          gl_FragColor = vec4(col, (ring + fill) * uAlpha);
        }`,
    });
    this.ring = new THREE.Mesh(new THREE.PlaneGeometry(rr * 2, rr * 2), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.025;
    this.ring.renderOrder = 3;
    this.ring.scale.setScalar(Math.min(2.2, Math.sqrt(spec.scale ?? 1)));
    this.object.add(this.ring);
    this.geos.push(this.ring.geometry);
    this.mats.push(this.ringMat);
  }

  private buildHumanoid(makePart: (s: Geo[], g?: Geo[], f?: Geo[]) => THREE.Group) {
    const spec = this.spec;
    const P = this.P;
    const armored = ['open', 'full', 'horned', 'crown'].includes(spec.helmet ?? 'none') || spec.build === 'heavy' || spec.shield === 'tower' || spec.shield === 'kite';
    const robe = ['staff', 'tome'].includes(spec.weapon) && !spec.mount && spec.build !== 'heavy' && !armored;
    const skeleton = spec.body === 'skeleton';
    // 躯干
    const torso = buildTorso(spec, P, robe, armored);
    const torsoPart = makePart(torso.solid, torso.glow);
    this.rider.add(torsoPart);
    // 头
    const headPivot = new THREE.Group();
    headPivot.position.set(0, P.headY, 0);
    const head = skeleton ? skullHead(P.headR) : buildHead(spec, P);
    headPivot.add(makePart(head.solid, head.glow, head.face));
    this.rider.add(headPivot);
    this.j.head = headPivot;
    // 手臂
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * P.shoulderX * (spec.build === 'heavy' ? 1.12 : 1), P.shoulderY, 0);
      pivot.add(makePart(buildArm(spec, P, armored && !skeleton)));
      const hand = new THREE.Group();
      hand.position.set(0, -P.armLen * 0.92, 0.01);
      pivot.add(hand);
      this.rider.add(pivot);
      if (side > 0) {
        this.j.armR = pivot;
        this.j.handR = hand;
      } else {
        this.j.armL = pivot;
        this.j.handL = hand;
      }
    }
    // 武器（弓与魔导书在左手）
    const wpn = buildWeapon(spec.weapon, spec, P);
    const wpart = makePart(wpn.solid, wpn.glow);
    const wPivot = new THREE.Group();
    wPivot.add(wpart);
    if (spec.weapon === 'bow' || spec.weapon === 'tome') {
      this.j.handL.add(wPivot);
      if (spec.weapon === 'bow') wpart.rotation.y = -Math.PI / 2;
    } else {
      this.j.handR.add(wPivot);
    }
    this.j.weapon = wPivot;
    // 盾
    if (spec.shield && spec.shield !== 'none' && spec.weapon !== 'bow' && spec.weapon !== 'tome') {
      const sp = makePart(buildShield(spec.shield, spec, P));
      sp.position.set(-P.armR * 1.6, P.armLen * 0.35, 0.02);
      sp.rotation.y = -Math.PI / 2 + 0.35;
      this.j.handL.add(sp);
    }
    // 箭袋
    if (spec.weapon === 'bow') {
      const q = makePart(buildQuiver(P));
      q.position.set(0.06 * (P === SD ? 1 : 2), P.torsoY + P.torsoH * 0.6, -P.torsoD * 0.6);
      q.rotation.z = -0.4;
      this.rider.add(q);
    }
    // 腿
    if (!robe) {
      for (const side of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(side * P.torsoW * 0.22, P.hipY, 0);
        pivot.add(makePart(buildLeg(spec, P, armored && !skeleton)));
        this.rider.add(pivot);
        if (side > 0) this.j.legR = pivot;
        else this.j.legL = pivot;
      }
    } else {
      this.j.legL = new THREE.Group();
      this.j.legR = new THREE.Group();
    }
    // 披风
    if (spec.cape) {
      const cp = new THREE.Group();
      cp.position.set(0, P.shoulderY + 0.02, -P.torsoD * 0.42);
      cp.add(makePart(buildCape(spec, P)));
      this.rider.add(cp);
      this.j.cape = cp;
    }
  }

  /* ================================================================ */
  /* UnitModel 接口                                                   */
  /* ================================================================ */

  play(anim: UnitAnim, opts: PlayOptions = {}): Promise<void> {
    // 正在进行的动作立即结束
    if (this.action) {
      if (!this.action.impacted) this.action.onImpact?.();
      this.action.resolve();
      this.action = null;
    }
    const [dur, impact] = DURATION[anim];
    return new Promise((resolve) => {
      this.action = { anim, t: 0, dur, impactAt: impact, impacted: false, onImpact: opts.onImpact, resolve, speed: opts.speed ?? 1 };
      if (anim === 'death') {
        this.dead = true;
        for (const m of this.mats) m.transparent = true;
      }
    });
  }

  setMoving(moving: boolean) {
    this.moving = moving;
  }

  faceTowards(dx: number, dz: number, immediate = false) {
    if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4) return;
    this.targetYaw = Math.atan2(dx, dz);
    if (immediate) this.yaw = this.targetYaw;
  }

  setActed(acted: boolean) {
    this.acted = acted;
  }

  flash(color: string, duration = 0.25) {
    this.uniforms.uFlash.value.set(color);
    this.flashAmt = 1.2;
    this.flashDecay = 1.2 / Math.max(0.05, duration);
  }

  setHighlighted(on: boolean) {
    this.highlighted = on;
  }

  /* ================================================================ */
  /* 动画                                                              */
  /* ================================================================ */

  update(dt: number, time: number) {
    // 转向
    let d = this.targetYaw - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * 10);
    this.object.rotation.y = this.yaw;

    // 变灰
    this.actedT += ((this.acted ? 1 : 0) - this.actedT) * Math.min(1, dt * 6);
    this.uniforms.uDesat.value = this.actedT * 0.85;
    // 闪光
    this.flashAmt = Math.max(0, this.flashAmt - dt * this.flashDecay);
    this.uniforms.uFlashAmt.value = this.flashAmt;
    // 光环
    this.ringMat.uniforms.uTime.value = time;
    this.ringMat.uniforms.uHi.value += ((this.highlighted ? 1 : 0) - this.ringMat.uniforms.uHi.value) * Math.min(1, dt * 8);
    this.ringMat.uniforms.uAlpha.value = (this.dead ? 0 : 1) * (1 - this.actedT * 0.55);

    const pose = zeroPose();
    const ph = time * 2.2 + this.seed;
    // 待机：呼吸
    pose.bodyY = Math.sin(ph) * 0.006;
    pose.squash = Math.sin(ph) * 0.012;
    pose.armRX = -0.18 + Math.sin(ph) * 0.03;
    pose.armLX = -0.1 + Math.sin(ph + 0.5) * 0.03;
    pose.armRZ = 0.32;
    pose.armLZ = -0.22;
    pose.weapon = -0.25;
    pose.cape = Math.sin(ph * 0.7) * 0.05;
    pose.headX = -0.22 + Math.sin(ph * 0.5) * 0.03;

    // 行走
    if (this.moving) {
      this.walkT += dt * 11;
      const s = Math.sin(this.walkT);
      pose.bodyY += Math.abs(Math.cos(this.walkT)) * 0.035;
      pose.legRX = s * 0.7;
      pose.legLX = -s * 0.7;
      pose.armRX += -s * 0.45;
      pose.armLX += s * 0.45;
      pose.lean = 0.12;
      pose.cape += 0.35 + Math.abs(s) * 0.15;
    }

    // 一次性动作
    if (this.action) {
      const a = this.action;
      a.t += dt * a.speed;
      const t = Math.min(1, a.t / a.dur);
      this.applyAction(a.anim, t, pose);
      if (!a.impacted && a.t >= a.impactAt) {
        a.impacted = true;
        a.onImpact?.();
      }
      if (a.t >= a.dur) {
        this.action = null;
        a.resolve();
      }
    }

    // 死亡后保持倒地并淡出
    if (this.dead && !this.action) {
      pose.lean = -1.35;
      pose.bodyY = -0.1;
      this.uniforms.uOpacity.value = 0;
    }

    this.applyPose(pose, dt, time);
  }

  private applyAction(anim: UnitAnim, t: number, p: Pose) {
    const w = this.spec.weapon;
    switch (anim) {
      case 'attack': {
        if (w === 'lance' || w === 'dagger') {
          // 突刺
          p.armRX = kf([[0, -0.2], [0.35, 0.5], [0.6, -1.5], [1, -0.2]], t);
          p.weapon = kf([[0, -0.15], [0.35, 1.2], [0.6, 1.55], [1, -0.15]], t);
          p.bodyZ = kf([[0, 0], [0.35, -0.06], [0.6, 0.28], [1, 0]], t);
          p.lean = kf([[0, 0], [0.35, -0.12], [0.6, 0.35], [1, 0]], t);
          p.mount = kf([[0, 0], [0.4, 0.25], [0.7, -0.1], [1, 0]], t);
        } else if (w === 'claws' || w === 'none') {
          p.bodyZ = kf([[0, 0], [0.35, -0.1], [0.6, 0.3], [1, 0]], t);
          p.lean = kf([[0, 0], [0.35, -0.3], [0.6, 0.5], [1, 0]], t);
          p.armRX = kf([[0, -0.2], [0.35, -2.2], [0.6, -0.5], [1, -0.2]], t);
          p.armLX = kf([[0, -0.2], [0.35, -2.2], [0.6, -0.5], [1, -0.2]], t);
          p.mount = kf([[0, 0], [0.35, 0.4], [0.6, -0.15], [1, 0]], t);
        } else {
          // 劈砍：举过头顶 → 斜劈
          p.armRX = kf([[0, -0.2], [0.4, -2.7], [0.62, -0.45], [1, -0.2]], t);
          p.weapon = kf([[0, -0.15], [0.4, -2.5], [0.62, 2.2], [1, -0.15]], t);
          p.armRZ = kf([[0, 0.12], [0.4, 0.25], [0.62, -0.25], [1, 0.12]], t);
          p.twist = kf([[0, 0], [0.4, 0.35], [0.62, -0.45], [1, 0]], t);
          p.bodyZ = kf([[0, 0], [0.4, -0.05], [0.62, 0.22], [1, 0]], t);
          p.lean = kf([[0, 0], [0.4, -0.15], [0.62, 0.32], [1, 0]], t);
          p.bodyY += kf([[0, 0], [0.4, 0.05], [0.62, -0.02], [1, 0]], t);
          p.mount = kf([[0, 0], [0.4, 0.3], [0.7, -0.08], [1, 0]], t);
        }
        p.cape += kf([[0, 0], [0.62, 0.6], [1, 0]], t);
        break;
      }
      case 'shoot': {
        p.armLX = kf([[0, -0.1], [0.3, -1.5], [0.85, -1.5], [1, -0.1]], t);
        p.armLZ = kf([[0, -0.12], [0.3, 0.3], [0.85, 0.3], [1, -0.12]], t);
        p.armRX = kf([[0, -0.2], [0.3, -1.4], [0.65, -1.1], [0.72, -1.6], [1, -0.2]], t);
        p.armRZ = kf([[0, 0.12], [0.3, -0.35], [0.65, 0.2], [1, 0.12]], t);
        p.twist = kf([[0, 0], [0.3, 0.6], [0.8, 0.6], [1, 0]], t);
        p.lean = kf([[0, 0], [0.68, -0.1], [0.75, 0.05], [1, 0]], t);
        break;
      }
      case 'cast':
      case 'heal': {
        const up = anim === 'cast' ? -2.6 : -2.0;
        p.armRX = kf([[0, -0.2], [0.45, up], [0.75, up], [1, -0.2]], t);
        p.armLX = kf([[0, -0.1], [0.45, up * 0.6], [0.75, up * 0.6], [1, -0.1]], t);
        p.armLZ = kf([[0, -0.12], [0.45, -0.5], [1, -0.12]], t);
        p.weapon = kf([[0, -0.15], [0.45, 0.3], [1, -0.15]], t);
        p.bodyY += kf([[0, 0], [0.45, 0.08], [0.75, 0.08], [1, 0]], t);
        p.lean = kf([[0, 0], [0.45, -0.18], [0.75, -0.1], [1, 0]], t);
        p.headX = kf([[0, 0], [0.45, -0.25], [1, 0]], t);
        p.cape += kf([[0, 0], [0.5, 0.5], [1, 0]], t);
        break;
      }
      case 'hit': {
        p.lean += kf([[0, 0], [0.15, -0.45], [1, 0]], t, ease.out);
        p.bodyZ = kf([[0, 0], [0.15, -0.12], [1, 0]], t, ease.out);
        p.headX = kf([[0, 0], [0.15, -0.4], [1, 0]], t);
        p.armRX += kf([[0, 0], [0.15, 0.5], [1, 0]], t);
        p.armLX += kf([[0, 0], [0.15, 0.5], [1, 0]], t);
        p.mount = kf([[0, 0], [0.15, 0.2], [1, 0]], t);
        break;
      }
      case 'dodge': {
        p.bodyX = kf([[0, 0], [0.3, 0.28], [0.7, 0.28], [1, 0]], t, ease.out);
        p.roll = kf([[0, 0], [0.3, -0.25], [1, 0]], t);
        p.bodyY += kf([[0, 0], [0.2, 0.08], [0.4, 0], [1, 0]], t);
        break;
      }
      case 'death': {
        p.lean = kf([[0, 0], [0.25, 0.25], [0.6, -1.35], [1, -1.35]], t, ease.in);
        p.bodyY = kf([[0, 0], [0.6, -0.08], [1, -0.1]], t);
        p.armRX = kf([[0, 0], [0.6, -1.2]], t);
        p.armLX = kf([[0, 0], [0.6, -1.0]], t);
        this.uniforms.uOpacity.value = kf([[0, 1], [0.55, 1], [1, 0]], t, (x) => x);
        break;
      }
      case 'victory': {
        p.armRX = kf([[0, -0.2], [0.3, -2.9], [0.8, -2.9], [1, -0.2]], t);
        p.weapon = kf([[0, -0.15], [0.3, 0], [1, -0.15]], t);
        p.bodyY += kf([[0, 0], [0.2, 0.15], [0.35, 0], [1, 0]], t);
        p.mount = kf([[0, 0], [0.3, 0.5], [0.8, 0.5], [1, 0]], t);
        break;
      }
      case 'levelup': {
        p.bodyY += kf([[0, 0], [0.25, 0.25], [0.5, 0], [0.6, 0.06], [0.7, 0]], t);
        p.twist = kf([[0, 0], [0.5, Math.PI * 2]], t, ease.inOut);
        p.armRX = kf([[0, -0.2], [0.25, -2.6], [0.6, -2.6], [1, -0.2]], t);
        p.armLX = kf([[0, -0.1], [0.25, -2.6], [0.6, -2.6], [1, -0.1]], t);
        break;
      }
    }
  }

  private applyPose(p: Pose, dt: number, time: number) {
    const sc = this.spec.scale ?? 1;
    const hover = this.hover > 0 ? this.hover + Math.sin(time * 2 + this.seed) * 0.04 : 0;
    const bp = this.bodyPivot;
    bp.position.set(p.bodyX, p.bodyY + hover, p.bodyZ);
    bp.rotation.set(0, p.twist * (this.humanoid && !this.spec.mount ? 1 : 0.2), p.roll);
    bp.scale.set(1 + p.squash * 0.5, 1 - p.squash, 1 + p.squash * 0.5);
    void sc;

    if (this.humanoid) {
      const r = this.rider;
      // 骑乘时，上半身前倾/后仰作用于骑手
      r.rotation.x = p.lean;
      if (this.spec.mount) r.rotation.y = p.twist * 0.6;
      const j = this.j;
      j.head.rotation.x = p.headX;
      j.head.rotation.z = p.headZ;
      j.armR.rotation.x = p.armRX;
      j.armR.rotation.z = p.armRZ;
      j.armL.rotation.x = p.armLX;
      j.armL.rotation.z = p.armLZ;
      if (!this.spec.mount) {
        j.legR.rotation.x = p.legRX;
        j.legL.rotation.x = p.legLX;
      }
      // 武器的绝对角度 = 手臂角度 + 武器相对角度
      j.weapon.rotation.x = this.spec.weapon === 'bow' || this.spec.weapon === 'tome' ? 0 : p.weapon - p.armRX;
      if (j.cape) j.cape.rotation.x = 0.12 + p.cape * 0.6;
    } else {
      bp.rotation.x = p.lean * 0.35;
    }

    // 生物 / 坐骑
    if (this.creature) {
      const c = this.creature;
      const body = this.j['c_body'];
      const gait = this.moving ? 1 : 0;
      const t = this.walkT || time * 2;
      c.legs.forEach((n, i) => {
        const leg = this.j['c_' + n];
        if (!leg) return;
        const phase = i % 2 === 0 ? 0 : Math.PI;
        const diag = i >= 2 ? Math.PI * 0.5 : 0;
        leg.rotation.x = gait * Math.sin(t + phase + diag) * 0.6 + (i < 2 ? -p.mount * 1.2 : p.mount * 0.3);
      });
      if (body) {
        body.rotation.x = -p.mount * 0.6 + (this.humanoid ? 0 : p.lean * 0.4);
        body.position.y = (c.parts[0].pivot[1] as number) + gait * Math.abs(Math.sin(t)) * 0.03;
      }
      const flap = Math.sin(time * (this.moving ? 9 : 4) + this.seed);
      c.wings.forEach((n, i) => {
        const wg = this.j['c_' + n];
        if (wg) wg.rotation.z = (i === 0 ? 1 : -1) * (0.25 + flap * (this.moving || this.hover ? 0.55 : 0.12));
      });
      if (c.tail) {
        const tl = this.j['c_' + c.tail];
        if (tl) tl.rotation.y = Math.sin(time * 2.5 + this.seed) * 0.25;
      }
      if (c.neck) {
        const nk = this.j['c_' + c.neck];
        if (nk) nk.rotation.x = Math.sin(time * 1.6 + this.seed) * 0.05 - p.mount * 0.3 + (this.humanoid ? 0 : -p.lean * 0.3);
      }
      // 非人形生物的「手臂」（魔像、怨灵）
      for (const side of ['armL', 'armR']) {
        const a = this.j['c_' + side];
        if (a) a.rotation.x = side === 'armR' ? p.armRX : p.armLX;
      }
    }
    void dt;
  }

  dispose() {
    for (const g of this.geos) g.dispose();
    for (const m of this.mats) m.dispose();
    this.object.removeFromParent();
  }
}
