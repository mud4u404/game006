/**
 * 坐骑与魔物的像素绘制（HD-2D 精灵）
 * --------------------------------------------------------------
 * 使用一个极简的「3D 部件 → 像素」投影器：
 *  部件定义在生物的局部 3D 空间（a = 朝前，b = 向上，c = 生物右侧），
 *  按视角（3/4 正面 / 3/4 背面）投影到画布，按深度排序后用 PixelBuf 的图元绘制。
 *  同一套骨架即可得到两种视角，与人形精灵的约定一致：
 *  front 朝向画面右下（右侧/近侧在画面左），back 朝向画面右上（近侧在画面右）。
 */
import type { UnitModelSpec } from '@/render/contracts';
import { drawHumanoid, type Pose, type View } from './humanoid';
import { poseFor, type SpriteAnim } from './frames';
import { darken, hex, lighten, PixelBuf, ramp, rgba, type DrawOpts, type Ramp } from './pixel';

export type V3 = [number, number, number];

interface PartOpts extends DrawOpts {
  /** 深度偏移（正 = 更靠前绘制） */
  dz?: number;
  shade?: 'flat' | 'cyl' | 'dome' | 'down';
  rot?: number;
}

const YAW = 0.5;
const PITCH = 0.32;

/* ================================================================== */
/* 投影器                                                              */
/* ================================================================== */

export class Projector {
  private parts: { d: number; i: number; draw: () => void }[] = [];
  private cs: number;
  private sn: number;
  private cp = Math.cos(PITCH);
  private sp = Math.sin(PITCH);
  constructor(
    readonly buf: PixelBuf,
    view: View,
    readonly ox: number,
    readonly oy: number,
    readonly k = 1,
  ) {
    const yaw = view === 'front' ? YAW : -YAW;
    this.cs = Math.cos(yaw);
    this.sn = Math.sin(yaw);
  }

  /** 局部坐标 → [屏幕 x, 屏幕 y, 深度] */
  p(v: V3): [number, number, number] {
    const a = v[0] * this.k;
    const b = v[1] * this.k;
    const c = v[2] * this.k;
    const vx = a * this.cs - c * this.sn;
    const vz = a * this.sn + c * this.cs;
    const sy = b * this.cp - vz * this.sp;
    const d = vz * this.cp + b * this.sp;
    return [this.ox + vx, this.oy - sy, d];
  }

  private push(d: number, draw: () => void) {
    this.parts.push({ d, i: this.parts.length, draw });
  }

  private opts(o: PartOpts, cAvg: number): DrawOpts {
    const far = cAvg < -1.2 ? -0.22 : 0;
    return { edge: o.edge ?? true, bias: (o.bias ?? 0) + far, flat: o.flat, clipToExisting: o.clipToExisting };
  }

  ball(c: V3, rx: number, ry: number, R: Ramp, o: PartOpts = {}) {
    const [x, y, d] = this.p(c);
    const k = this.k;
    const dd = this.opts(o, c[2]);
    this.push(d + (o.dz ?? 0), () => this.buf.ellipse(x, y, rx * k, ry * k, R, dd, o.rot ?? 0));
  }

  cap(a: V3, b: V3, ra: number, rb: number, R: Ramp, o: PartOpts = {}) {
    const pa = this.p(a);
    const pb = this.p(b);
    const k = this.k;
    const dd = this.opts(o, (a[2] + b[2]) / 2);
    this.push((pa[2] + pb[2]) / 2 + (o.dz ?? 0), () => this.buf.capsule(pa[0], pa[1], pb[0], pb[1], ra * k, rb * k, R, dd));
  }

  /** 折线胶囊：沿一串点逐段绘制，半径线性渐变 */
  chain(pts: V3[], r0: number, r1: number, R: Ramp, o: PartOpts = {}) {
    for (let i = 0; i + 1 < pts.length; i++) {
      const t0 = i / (pts.length - 1);
      const t1 = (i + 1) / (pts.length - 1);
      this.cap(pts[i], pts[i + 1], r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1, R, { ...o, edge: i === 0 ? o.edge : false, dz: (o.dz ?? 0) + i * 0.01 });
    }
  }

  poly(pts: V3[], R: Ramp, o: PartOpts = {}) {
    const ps = pts.map((v) => this.p(v));
    const d = ps.reduce((s, q) => s + q[2], 0) / ps.length;
    const dd = this.opts(o, pts.reduce((s, q) => s + q[2], 0) / pts.length);
    this.push(d + (o.dz ?? 0), () => this.buf.poly(ps.map((q) => [q[0], q[1]] as [number, number]), R, { ...dd, shade: o.shade ?? 'cyl' }));
  }

  line(a: V3, b: V3, color: number, dz = 0) {
    const pa = this.p(a);
    const pb = this.p(b);
    this.push((pa[2] + pb[2]) / 2 + dz, () => this.buf.line(pa[0], pa[1], pb[0], pb[1], color));
  }

  dot(at: V3, color: number, dz = 0, size = 1) {
    const [x, y, d] = this.p(at);
    this.push(d + dz, () => {
      this.buf.set(x, y, color);
      if (size > 1) {
        this.buf.set(x + 1, y, color);
        this.buf.set(x, y - 1, color);
        this.buf.set(x + 1, y - 1, color);
      }
    });
  }

  fn(at: V3, f: (x: number, y: number) => void, dz = 0) {
    const [x, y, d] = this.p(at);
    this.push(d + dz, () => f(x, y));
  }

  flush() {
    this.parts.sort((p, q) => p.d - q.d || p.i - q.i);
    for (const p of this.parts) p.draw();
    this.parts = [];
  }
}

/* ================================================================== */
/* 工具                                                                */
/* ================================================================== */

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** 在 a-b 平面内绕 pivot 旋转（正 = 抬头/前端上扬） */
function pitchAround(p: V3, pivot: V3, ang: number): V3 {
  const da = p[0] - pivot[0];
  const db = p[1] - pivot[1];
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return [pivot[0] + da * c - db * s, pivot[1] + da * s + db * c, p[2]];
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/* ================================================================== */
/* 生物姿势                                                            */
/* ================================================================== */

export interface CPose {
  /** 步态相位 0..1，<0 表示站立 */
  gait: number;
  bob: number;
  /** 前冲（正）/ 后撤（负） */
  lunge: number;
  /** 前身上扬 0..1 */
  rear: number;
  /** 抬头（弧度） */
  head: number;
  mouth: number;
  /** 翼：-1 收拢下压 … 1 高举 */
  wing: number;
  tail: number;
  hurt: number;
  down: number;
  glow: number;
}

const BASE_C: CPose = { gait: -1, bob: 0, lunge: 0, rear: 0, head: 0, mouth: 0, wing: 0, tail: 0, hurt: 0, down: 0, glow: 0 };

export function creaturePose(anim: SpriteAnim, f: number): CPose {
  const p: CPose = { ...BASE_C };
  const pick = <T>(arr: T[]) => arr[Math.min(f, arr.length - 1)];
  switch (anim) {
    case 'idle':
      p.bob = f ? -0.7 : 0;
      p.wing = f ? 0.55 : 0.05;
      p.tail = f ? 0.4 : -0.3;
      p.head = f ? 0.04 : 0;
      break;
    case 'walk':
      p.gait = f / 4;
      p.wing = pick([0.9, 0.2, -0.45, 0.3]);
      p.bob = pick([0, -1, 0, -1]);
      p.tail = pick([0.5, 0, -0.5, 0]);
      break;
    case 'attack':
    case 'shoot':
      p.rear = pick([0.55, 0, 0, 0.1]);
      p.lunge = pick([-0.5, 1, 0.75, 0.2]);
      p.head = pick([0.35, -0.3, -0.2, 0]);
      p.mouth = pick([0.45, 1, 0.6, 0.1]);
      p.wing = pick([1, -0.6, -0.3, 0.3]);
      p.tail = pick([-0.6, 0.6, 0.4, 0]);
      break;
    case 'cast':
    case 'heal':
      p.rear = pick([0.45, 0.2, 0]);
      p.head = pick([0.35, 0.05, 0]);
      p.mouth = pick([0.35, 1, 0.2]);
      p.glow = pick([0.35, 1, 0.15]);
      p.wing = pick([0.9, 1, 0.2]);
      p.lunge = pick([-0.3, 0.35, 0]);
      break;
    case 'hit':
      p.hurt = 1;
      p.head = 0.25;
      p.wing = 0.6;
      p.lunge = -0.5;
      p.mouth = 0.5;
      break;
    case 'dodge':
      p.hurt = 0.5;
      p.lunge = -1;
      p.wing = 1;
      break;
    case 'death':
      p.down = pick([0.5, 1]);
      p.hurt = 0.5;
      p.head = pick([-0.2, -0.55]);
      p.wing = pick([-0.4, -1]);
      p.mouth = 0.4;
      break;
    case 'victory':
    case 'levelup':
      p.rear = pick([0.8, 0.35]);
      p.head = pick([0.5, 0.25]);
      p.wing = pick([1, 0.6]);
      p.mouth = pick([0.7, 0.1]);
      break;
  }
  return p;
}

/** 骑手姿势：在人形姿势基础上改为跨坐 */
function riderPose(anim: SpriteAnim, f: number, spec: UnitModelSpec): Pose {
  const p = poseFor(anim === 'walk' ? 'idle' : anim, anim === 'walk' ? (f % 2) : f, spec.weapon);
  p.seated = true;
  p.nearLeg = 1.2;
  p.nearKnee = 1.45;
  p.farLeg = 1.2;
  p.farKnee = 1.45;
  p.crouch = 0;
  p.down = 0;
  if (anim === 'walk') p.bob = f % 2 ? -0.8 : 0;
  if (anim === 'death') {
    p.tilt = f ? 0.5 : 0.25;
    p.lean = f ? -2.5 : -1;
    p.bob = f ? 3 : 1.5;
  }
  if (anim === 'dodge') p.crouch = 0;
  return p;
}

/* ================================================================== */
/* 调色板                                                              */
/* ================================================================== */

interface CPal {
  main: Ramp;
  belly: Ramp;
  dark: Ramp;
  hair: Ramp;
  horn: Ramp;
  claw: Ramp;
  eye: number;
  glow: Ramp;
  cloth: Ramp;
  trim: Ramp;
  membrane: Ramp;
  leather: Ramp;
  metal: Ramp;
}

function basePal(spec: UnitModelSpec): Pick<CPal, 'cloth' | 'trim' | 'leather' | 'metal' | 'glow' | 'claw'> {
  return {
    cloth: ramp(spec.primary),
    trim: ramp(spec.secondary),
    leather: ramp('#6a4630'),
    metal: ramp(spec.metal ?? '#b8bec8', { contrast: 1.2 }),
    glow: ramp(spec.glow ?? '#ffd27a', { contrast: 0.6 }),
    claw: ramp('#e8dcc0'),
  };
}

/* ================================================================== */
/* 四足：马 / 天马 / 狼                                                */
/* ================================================================== */

interface LegCfg {
  hip: V3;
  l1: number;
  l2: number;
  r1: number;
  r2: number;
  front: boolean;
  phase: number;
}

function quadLeg(R: Projector, L: LegCfg, p: CPose, ramp1: Ramp, ramp2: Ramp, hoof: Ramp | null, groundB: number, paw = false) {
  let swing = 0;
  let knee = 0;
  if (p.gait >= 0) {
    const t = (p.gait + L.phase) * Math.PI * 2;
    swing = Math.sin(t) * 0.42;
    knee = Math.max(0, Math.cos(t)) * 0.95;
  }
  if (L.front && p.rear > 0) {
    swing += p.rear * 0.9;
    knee += p.rear * 1.5;
  }
  if (p.down > 0) {
    swing += (L.front ? 0.9 : -0.9) * p.down;
    knee += (L.front ? 1.9 : -1.6) * p.down;
  }
  if (p.hurt > 0 && L.front) swing -= 0.2 * p.hurt;
  const kneeP: V3 = [L.hip[0] + Math.sin(swing) * L.l1, L.hip[1] - Math.cos(swing) * L.l1, L.hip[2]];
  const a2 = swing - knee;
  const foot: V3 = [kneeP[0] + Math.sin(a2) * L.l2, Math.max(groundB + 1, kneeP[1] - Math.cos(a2) * L.l2), L.hip[2]];
  R.cap(L.hip, kneeP, L.r1, L.r2, ramp1);
  R.cap(kneeP, foot, L.r2, L.r2 * 0.8, ramp2, { dz: 0.05, edge: false });
  if (hoof) R.ball(add(foot, [0.6, -0.4, 0]), L.r2 * 0.95, L.r2 * 0.65, hoof, { dz: 0.1 });
  else if (paw) R.ball(add(foot, [0.9, -0.3, 0]), L.r2 * 1.05, L.r2 * 0.7, ramp2, { dz: 0.1 });
}

/** 羽翼（天马） */
function featherWing(R: Projector, root: V3, side: 1 | -1, elev: number, len: number, white: Ramp, dz: number) {
  const ce = Math.cos(elev);
  const se = Math.sin(elev);
  const wrist = add(root, mul([-0.25 - 0.2 * ce, se, side * ce * 0.5], len * 0.45));
  const tip = add(wrist, mul([-0.75, se * 0.55 - 0.05, side * ce * 0.3], len * 0.58));
  const t1 = add(tip, [-len * 0.08, -len * 0.3, 0]);
  const t2 = add(wrist, [-len * 0.45, -len * 0.36, 0]);
  const t3 = add(root, [-len * 0.36, -len * 0.08, 0]);
  R.poly([root, wrist, tip, t1, t2, t3], white, { shade: 'down', dz, bias: 0.15 });
  // 覆羽（上缘一条更亮的带）
  R.poly([root, wrist, tip, lerp3(tip, t1, 0.25), lerp3(wrist, t2, 0.3), lerp3(root, t3, 0.35)], white, { shade: 'flat', flat: 3, edge: false, dz: dz + 0.01 });
  // 飞羽分隔
  const lineC = darken(white[1], 0.92);
  for (let i = 1; i <= 4; i++) {
    const a = lerp3(wrist, tip, i / 5);
    const b = lerp3(t2, t1, i / 5);
    R.line(lerp3(a, b, 0.3), b, lineC, dz + 0.02);
  }
  R.line(lerp3(wrist, t2, 0.3), t2, lineC, dz + 0.02);
}

function drawHorse(R: Projector, spec: UnitModelSpec, p: CPose, rider: Pose | null, view: View, winged: boolean) {
  const B0 = basePal(spec);
  const enemy = spec.team === 'enemy';
  const coats: [string, string][] = [
    ['#8a5634', '#3a2418'], // 栗色
    ['#5e3a26', '#1e1612'], // 骝毛
    ['#a8a29a', '#e8e2da'], // 青灰
    ['#e8e2d8', '#d8d0c4'], // 白马
  ];
  let coat = coats[hashStr(spec.primary + (spec.helmet ?? '')) % coats.length];
  if (enemy) coat = ['#3a3236', '#16121a'];
  if (winged) coat = ['#f2f0ec', '#dfe6f4'];
  const main = ramp(coat[0], { contrast: winged ? 0.75 : 1 });
  const hair = ramp(coat[1], { contrast: 0.9 });
  const hoof = ramp('#3a302c');
  const dark = ramp(darkHex(coat[0], 0.5));

  const lift = p.rear * 0.42;
  const pivot: V3 = [-10, 22, 0];
  const drop = p.down * 12;
  const B = (v: V3): V3 => {
    const r = pitchAround(v, pivot, lift);
    return [r[0] + p.lunge * 2.5 - p.hurt * 1.5, r[1] + p.bob - drop, r[2]];
  };

  // 腿（对角小跑）
  const legs: LegCfg[] = [
    { hip: B([10, 22, 4.2]), l1: 10, l2: 10.5, r1: 3.1, r2: 1.9, front: true, phase: 0 },
    { hip: B([10, 22, -4.2]), l1: 10, l2: 10.5, r1: 3.1, r2: 1.9, front: true, phase: 0.5 },
    { hip: B([-11, 23, 4.2]), l1: 11, l2: 11, r1: 3.6, r2: 1.9, front: false, phase: 0.5 },
    { hip: B([-11, 23, -4.2]), l1: 11, l2: 11, r1: 3.6, r2: 1.9, front: false, phase: 0 },
  ];
  for (const L of legs) quadLeg(R, L, p, L.hip[2] < 0 ? dark : main, L.hip[2] < 0 ? dark : main, hoof, 0);

  // 躯干
  R.ball(B([11, 27.5, 0]), 9, 8.6, main, { dz: 0.2 });
  R.ball(B([-12, 28.5, 0]), 9.4, 8.8, main, { dz: 0.1 });
  R.cap(B([10, 27, 0]), B([-11, 28, 0]), 8.4, 8.6, main, { dz: 0.15, edge: false });

  // 颈与头
  const head = p.head - p.hurt * 0.15 + (p.down > 0 ? -0.6 * p.down : 0);
  const NB = B([13, 31, 0]);
  const NT = pitchAround(B([20, 44, 0]), NB, head);
  R.cap(NB, NT, 6, 4.2, main, { dz: 0.3 });
  R.cap(add(NB, [-3, 5, 0]), add(NT, [-2.6, 1.8, 0]), 2.6, 2.3, hair, { dz: 0.35 });
  const HP = add(NT, [1, 1, 0]);
  const HM = add(NT, [Math.cos(-0.85 + head) * 10.5, Math.sin(-0.85 + head) * 10.5, 0]);
  R.cap(HP, HM, 4.1, 2.8, main, { dz: 0.4 });
  for (const s of [-1.6, 1.6]) R.cap(add(HP, [-1.2, 2.5, s]), add(HP, [-1.8, 6.5, s]), 1.3, 0.6, s < 0 ? dark : main, { dz: s < 0 ? 0.32 : 0.45 });
  R.ball(add(HP, [1.2, 2.2, 0]), 1.8, 1.4, hair, { dz: 0.46 });
  R.dot(add(HP, [2.2, -1.4, 3.2]), rgba(20, 14, 16), 0.5, 1);
  R.dot(add(HM, [0.2, -0.2, 2.2]), darken(main[0], 0.6), 0.5);
  // 缰绳
  R.line(add(HM, [-1.5, -0.5, 2.4]), add(B([-1, 36, 0]), [5, 0, 3]), B0.leather[0], 0.6);

  // 尾
  const TR = B([-20, 31, 0]);
  const sway = p.tail * 2 + (p.gait >= 0 ? Math.sin(p.gait * Math.PI * 2) * 1.5 : 0);
  R.chain([TR, add(TR, [-5, -6, sway * 0.4]), add(TR, [-6.5, -15, sway]), add(TR, [-5.5, -22, sway * 1.3])], 3.2, 1.6, hair, { dz: -0.2 });

  // 鞍与马衣
  const knight = !!spec.cape || ['full', 'horned'].includes(spec.helmet ?? '');
  if (knight) {
    const c = 8.8;
    R.poly([B([13, 33, 6.5]), B([-15, 34, 6.5]), B([-17, 16, c]), B([-4, 14, c]), B([13, 16, c])], B0.cloth, { shade: 'down', dz: 1.2, bias: 0.1 });
    R.line(B([-17, 16.5, c + 0.2]), B([13, 16.5, c + 0.2]), B0.trim[2], 1.25);
    R.line(B([-16.5, 17.5, c + 0.2]), B([12.5, 17.5, c + 0.2]), B0.trim[1], 1.25);
    // 纹章
    R.ball(B([-1, 24, c + 0.4]), 2.6, 2.6, B0.trim, { dz: 1.3, edge: true });
  } else {
    R.poly([B([-8, 36, 5.5]), B([6, 36, 5.5]), B([5, 27, 8.6]), B([-8, 27, 8.6])], B0.cloth, { shade: 'down', dz: 1.2 });
    R.line(B([-8, 27.3, 8.8]), B([5, 27.3, 8.8]), B0.trim[2], 1.25);
  }
  R.ball(B([-1, 36.2, 0]), 6.4, 2.5, B0.leather, { dz: 1.4 });

  // 天马羽翼
  if (winged) {
    const white = ramp('#eef2fa', { contrast: 0.85 });
    const elev = 1.0 + p.wing * 0.5 + p.rear * 0.2;
    featherWing(R, B([4, 35, -4.5]), -1, elev + 0.12, 36, ramp('#c8d4ea', { contrast: 0.8 }), -0.5);
    featherWing(R, B([4, 35, 4.5]), 1, elev - 0.1, 34, white, rider ? -7 : 2);
  }

  // 骑手
  if (rider) {
    const seat = B([-1, 37.5, 0]);
    R.fn(seat, (x, y) => drawHumanoid(R.buf, spec, rider, view, Math.round(x) - 24, Math.round(y) - 39), 8);
  }
}

function drawWolf(R: Projector, spec: UnitModelSpec, p: CPose) {
  const fur = ramp('#6c707c', { contrast: 1.05 });
  const furD = ramp('#4c4e5a');
  const pale = ramp('#b4b4bc', { contrast: 0.8 });
  const drop = p.down * 8;
  const lift = p.rear * 0.3;
  const pivot: V3 = [-7, 12, 0];
  const B = (v: V3): V3 => {
    const r = pitchAround(v, pivot, lift);
    return [r[0] + p.lunge * 3 - p.hurt * 1.5, r[1] + p.bob * 0.6 - drop, r[2]];
  };
  const legs: LegCfg[] = [
    { hip: B([7, 11, 3]), l1: 6, l2: 6, r1: 2.3, r2: 1.4, front: true, phase: 0 },
    { hip: B([7, 11, -3]), l1: 6, l2: 6, r1: 2.3, r2: 1.4, front: true, phase: 0.5 },
    { hip: B([-7, 12, 3]), l1: 6.5, l2: 6.5, r1: 2.8, r2: 1.4, front: false, phase: 0.5 },
    { hip: B([-7, 12, -3]), l1: 6.5, l2: 6.5, r1: 2.8, r2: 1.4, front: false, phase: 0 },
  ];
  for (const L of legs) quadLeg(R, L, p, L.hip[2] < 0 ? furD : fur, L.hip[2] < 0 ? furD : fur, null, 0, true);
  R.ball(B([6, 15.5, 0]), 6.5, 6.2, fur, { dz: 0.2 });
  R.ball(B([-7, 15.5, 0]), 6, 5.6, fur, { dz: 0.1 });
  R.cap(B([6, 15, 0]), B([-7, 15.5, 0]), 5.6, 5.4, fur, { dz: 0.15, edge: false });
  // 背部深色毛
  R.cap(B([5, 20, 0]), B([-8, 19.5, 0]), 2.4, 2, furD, { dz: 0.18, edge: false });
  // 尾
  const sway = p.tail * 2;
  const TR = B([-12, 17, 0]);
  R.chain([TR, add(TR, [-5, -2, sway * 0.5]), add(TR, [-9, -6, sway])], 2.8, 2.2, furD, { dz: -0.1 });
  R.ball(add(TR, [-10, -7.5, sway]), 2, 2.2, pale, { dz: -0.05 });
  // 颈毛 + 头
  const head = p.head - p.hurt * 0.2 - p.down * 0.5;
  const NB = B([10, 18, 0]);
  const HC = pitchAround(B([15, 22, 0]), NB, head);
  R.ball(add(NB, [0.5, -1, 0.5]), 5, 5.4, pale, { dz: 0.3 });
  R.ball(HC, 4.4, 4, fur, { dz: 0.4 });
  const dir = -0.25 + head;
  const snoutTip = add(HC, [Math.cos(dir) * 7, Math.sin(dir) * 7 - 1, 0]);
  R.cap(add(HC, [1.5, -0.5, 0]), snoutTip, 2.7, 1.6, fur, { dz: 0.45 });
  // 下颌（张嘴）
  const jawA = dir - 0.2 - p.mouth * 0.7;
  const jawTip = add(HC, [Math.cos(jawA) * 6.2 + 0.5, Math.sin(jawA) * 6.2 - 2.2, 0]);
  if (p.mouth > 0.2) {
    R.cap(add(HC, [1, -2.5, 0]), jawTip, 1.6, 1.1, ramp('#7a2a2e'), { dz: 0.43 });
    R.dot(add(snoutTip, [-1.2, -1.6, 1.2]), rgba(245, 240, 230), 0.6);
  }
  R.cap(add(HC, [1, -2.6, 0.4]), p.mouth > 0.2 ? jawTip : add(snoutTip, [-1.5, -1.2, 0]), 1.3, 0.9, pale, { dz: 0.44 });
  R.dot(snoutTip, rgba(24, 18, 20), 0.6, 1);
  for (const s of [-2, 2]) R.cap(add(HC, [-1.5, 3, s]), add(HC, [-2.8, 7.5, s * 1.1]), 1.6, 0.5, s < 0 ? furD : fur, { dz: s < 0 ? 0.35 : 0.5 });
  R.dot(add(HC, [2.4, 0.6, 3.2]), hex('#ffb040'), 0.6);
  R.dot(add(HC, [2.9, 0.6, 3.2]), hex('#ffe080'), 0.61);
  void spec;
}

/* ================================================================== */
/* 龙类：飞龙（坐骑/野生）/ 巨龙 / 火蜥蜴                               */
/* ================================================================== */

interface DrakeCfg {
  legs: 2 | 4;
  wings: boolean;
  hover: number;
  /** 整体缩放 */
  bulk: number;
  /** 躯干中心高度、胸/臀半径 */
  bodyY: number;
  chestR: number;
  hipR: number;
  /** 腿：大腿长、小腿长、粗细 */
  leg: [number, number, number, number];
  neck: number;
  /** 颈部整体方向（弧度，越大越挺立） */
  neckAng: number;
  neckR: number;
  headR: number;
  snout: number;
  tail: number;
  tailR: number;
  wingLen: number;
  main: Ramp;
  dark: Ramp;
  belly: Ramp;
  membrane: Ramp;
  horn: Ramp;
  eye: number;
  flame?: boolean;
  spikes: Ramp;
}

function membraneWing(R: Projector, root: V3, side: 1 | -1, elev: number, len: number, cfg: DrakeCfg, dz: number, hipBack: V3) {
  elev = Math.max(0.15, Math.min(1.45, elev));
  const ce = Math.cos(elev);
  const se = Math.sin(elev);
  const elbow = add(root, mul([-0.18, se, side * ce * 0.55], len * 0.36));
  const wrist = add(elbow, mul([0.22, se * 0.8 + 0.2, side * ce * 0.3], len * 0.3));
  const fingers: V3[] = [
    add(wrist, mul([-0.45, 0.3 * se, side * 0.15 * ce], len * 0.6)),
    add(wrist, mul([-0.8, -0.2, side * 0.1 * ce], len * 0.72)),
    add(wrist, mul([-0.6, -0.75, side * 0.05], len * 0.6)),
  ];
  const back: V3 = hipBack;
  const mem = side < 0 ? ramp(hexOf(darken(cfg.membrane[2], 0.72))) : cfg.membrane;
  // 膜：腕 → 各指尖 → 体侧，带弧形后缘
  const sag = (a: V3, b: V3): V3 => add(lerp3(a, b, 0.5), [len * 0.06, -len * 0.05, 0]);
  const pts: V3[] = [root, elbow, wrist, fingers[0], sag(fingers[0], fingers[1]), fingers[1], sag(fingers[1], fingers[2]), fingers[2], sag(fingers[2], back), back];
  R.poly(pts, mem, { shade: 'down', dz, bias: 0.05 });
  const bone = side < 0 ? cfg.dark : cfg.main;
  const k = cfg.bulk;
  R.cap(root, elbow, 2.4 * k, 1.8 * k, bone, { dz: dz + 0.02 });
  R.cap(elbow, wrist, 1.8 * k, 1.3 * k, bone, { dz: dz + 0.03 });
  for (const f of fingers) R.cap(wrist, f, 1 * k, 0.4 * k, bone, { dz: dz + 0.025, edge: false });
  R.cap(wrist, add(wrist, [0.8 * k, 1.8 * k, 0]), 0.8 * k, 0.3 * k, cfg.horn, { dz: dz + 0.04, edge: false });
}

function hexOf(c: number): string {
  const r = c & 255;
  const g = (c >> 8) & 255;
  const b = (c >> 16) & 255;
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function darkHex(h: string, k: number): string {
  const n = parseInt(h.replace('#', ''), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function drawDrake(R: Projector, spec: UnitModelSpec, p: CPose, cfg: DrakeCfg, rider: Pose | null, view: View) {
  const b = cfg.bulk;
  const flying = cfg.hover > 0;
  const hov = (cfg.hover * (1 - p.down) + (flying ? p.bob * 1.5 : p.bob * 0.5)) * b;
  const drop = p.down * (flying ? 0 : cfg.bodyY * 0.45 * b);
  const lift = p.rear * (flying ? 0.3 : 0.4);
  const pivot: V3 = [-8 * b, cfg.bodyY * b, 0];
  const B = (v: V3): V3 => {
    const r = pitchAround(v, pivot, lift);
    return [r[0] + p.lunge * 3 * b - p.hurt * 2 * b, r[1] + hov - drop, r[2]];
  };
  const chest: V3 = [7 * b, cfg.bodyY * b, 0];
  const hip: V3 = [-8 * b, (cfg.bodyY - 0.5) * b, 0];

  // 腿
  const [l1, l2, r1, r2] = cfg.leg;
  const legCfg = (h: V3, front: boolean, phase: number): LegCfg => ({ hip: h, l1: l1 * b, l2: l2 * b, r1: r1 * b, r2: r2 * b, front, phase });
  const legList: LegCfg[] = [];
  const side = cfg.hipR * 0.62 * b;
  legList.push(legCfg(B(add(hip, [0, -cfg.hipR * 0.35 * b, side])), false, 0.5), legCfg(B(add(hip, [0, -cfg.hipR * 0.35 * b, -side])), false, 0));
  if (cfg.legs === 4) legList.push(legCfg(B(add(chest, [1 * b, -cfg.chestR * 0.35 * b, side])), true, 0), legCfg(B(add(chest, [1 * b, -cfg.chestR * 0.35 * b, -side])), true, 0.5));
  for (const L of legList) {
    const R1 = L.hip[2] < 0 ? cfg.dark : cfg.main;
    if (flying && p.down < 0.5) {
      // 悬停：腿向后垂下，爪子张开
      const sw = p.gait >= 0 ? Math.sin((p.gait + L.phase) * 6.28) * 1.5 * b : 0;
      const knee: V3 = add(L.hip, [1.5 * b, -L.l1 * 0.8, 0]);
      const foot: V3 = add(knee, [-3.5 * b + sw, -L.l2 * 0.8, 0]);
      R.cap(L.hip, knee, L.r1, L.r2, R1);
      R.cap(knee, foot, L.r2, L.r2 * 0.8, R1, { dz: 0.05, edge: false });
      for (const t of [-1, 0, 1]) R.cap(foot, add(foot, [1.8 * b, -1.4 * b, t * 0.9 * b]), 0.8 * b, 0.3 * b, cfg.horn, { dz: 0.08, edge: false });
    } else {
      quadLeg(R, L, p, R1, R1, null, 0, true);
      // 爪
      const fx = L.hip[0] + (L.front ? 1 : 0.5) * b;
      for (const t of [-1, 0, 1]) R.dot([fx + 2.4 * b, 0.8 + p.bob * 0, L.hip[2] + t * 1.1 * b], cfg.horn[3], 0.2);
    }
  }

  // 尾
  const sway = p.tail * 3 * b + (p.gait >= 0 ? Math.sin(p.gait * 6.28) * 2 * b : 0);
  const tl = cfg.tail * b;
  const TR = B(add(hip, [-cfg.hipR * 0.6 * b, 0.5 * b, 0]));
  const floor = flying ? -1e9 : 2 * b;
  const tailPts: V3[] = [
    TR,
    add(TR, [-tl * 0.28, -cfg.bodyY * 0.25 * b, sway * 0.3]),
    add(TR, [-tl * 0.56, -cfg.bodyY * 0.45 * b, sway * 0.7]),
    add(TR, [-tl * 0.8, -cfg.bodyY * 0.45 * b + p.tail * 3, sway]),
    add(TR, [-tl, -cfg.bodyY * 0.3 * b + p.tail * 4, sway * 1.2]),
  ];
  for (const q of tailPts) q[1] = Math.max(q[1], floor);
  R.chain(tailPts, cfg.tailR * b, 0.9 * b, cfg.main, { dz: -0.3 });
  const tip = tailPts[tailPts.length - 1];
  // 尾背刺
  for (let i = 0; i < 3; i++) {
    const at = lerp3(tailPts[i], tailPts[i + 1], 0.5);
    const r = cfg.tailR * b * (1 - (i + 0.5) / 4.5);
    R.poly([add(at, [1.6 * b, r * 0.8, 0]), add(at, [-1 * b, r * 0.8 + 2.6 * b, 0]), add(at, [-1.8 * b, r * 0.8, 0])], cfg.spikes, { dz: -0.29, shade: 'flat', flat: 1, edge: false });
  }
  if (cfg.flame) {
    const g = ramp(spec.glow ?? '#ff7a2a', { contrast: 0.5 });
    R.ball(add(tip, [-1.5, 3, 0]), 2.6 + p.glow * 1.5, 4 + p.glow * 2, g, { dz: -0.2, edge: false, bias: 0.5 });
    R.ball(add(tip, [-1.5, 2.5, 0]), 1.4, 2.2, ramp('#fff0a0', { contrast: 0.3 }), { dz: -0.19, edge: false, bias: 0.6 });
  } else {
    R.poly([add(tip, [0.5 * b, 2.2 * b, 0]), add(tip, [-4.5 * b, 0, 0]), add(tip, [0.5 * b, -2.2 * b, 0])], cfg.dark, { dz: -0.25, shade: 'flat', flat: 1 });
  }

  // 躯干
  R.ball(B(chest), cfg.chestR * b, cfg.chestR * 0.92 * b, cfg.main, { dz: 0.2 });
  R.ball(B(hip), cfg.hipR * b, cfg.hipR * 0.92 * b, cfg.main, { dz: 0.1 });
  R.cap(B(chest), B(hip), cfg.chestR * 0.86 * b, cfg.hipR * 0.86 * b, cfg.main, { dz: 0.15, edge: false });
  // 腹甲
  const cr = cfg.chestR * b;
  const hr = cfg.hipR * b;
  R.poly(
    [B(add(chest, [cr * 0.55, -cr * 0.25, cr * 0.75])), B(add(chest, [cr * 0.1, -cr * 0.85, cr * 0.45])), B(add(hip, [0, -hr * 0.85, hr * 0.45])), B(add(hip, [-hr * 0.3, -hr * 0.35, hr * 0.8]))],
    cfg.belly,
    { shade: 'down', dz: 0.25, bias: 0.1 },
  );
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    const a = B(lerp3(add(chest, [cr * 0.4, -cr * 0.5, cr * 0.7]), add(hip, [-hr * 0.1, -hr * 0.55, hr * 0.7]), t));
    R.line(a, add(a, [0, -cr * 0.35, -cr * 0.15]), cfg.belly[1], 0.26);
  }
  // 背刺
  for (let i = 0; i < 5; i++) {
    const at = B(lerp3(add(chest, [0, cr * 0.88, 0]), add(hip, [-2 * b, hr * 0.88, 0]), i / 4));
    R.poly([add(at, [1.6 * b, 0, 0]), add(at, [-1.2 * b, 3.4 * b, 0]), add(at, [-1.9 * b, 0, 0])], cfg.spikes, { dz: 0.12, shade: 'flat', flat: 1, edge: false });
  }

  // 翼
  if (cfg.wings) {
    const elev = 1.0 + p.wing * 0.55 - p.down * 0.6;
    const wl = cfg.wingLen * b;
    const root = (s: number) => B(add(chest, [(rider ? -4 : -1) * b, cr * 0.6, s * cr * 0.45]));
    const back = (s: number) => B(add(hip, [-hr * 0.4, hr * 0.5, s * hr * 0.4]));
    membraneWing(R, root(-1), -1, elev + 0.15, wl, cfg, -0.6, back(-1));
    membraneWing(R, root(1), 1, elev - 0.05, wl, cfg, rider ? -6 : 2.5, back(1));
  }

  // 颈与头（S 形颈）
  const head = p.head - p.hurt * 0.2 - p.down * 0.5;
  const NB = B(add(chest, [cr * 0.5, cr * 0.4, 0]));
  const nl = cfg.neck * b;
  const nr = cfg.neckR * b;
  let HC: V3;
  if (cfg.neck > 2) {
    const ca = Math.cos(cfg.neckAng);
    const sa = Math.sin(cfg.neckAng);
    const N1 = pitchAround(add(NB, [nl * (0.35 * ca + 0.05), nl * 0.5 * sa, 0]), NB, head * 0.4);
    const N2 = pitchAround(add(NB, [nl * 0.55 * ca, nl * 0.95 * sa, 0]), NB, head * 0.7);
    const NT = pitchAround(add(NB, [nl * (ca + 0.1), nl * 1.2 * sa, 0]), NB, head);
    R.cap(NB, N1, nr, nr * 0.85, cfg.main, { dz: 0.3 });
    R.cap(N1, N2, nr * 0.85, nr * 0.72, cfg.main, { dz: 0.31, edge: false });
    R.cap(N2, NT, nr * 0.72, nr * 0.65, cfg.main, { dz: 0.32, edge: false });
    // 颈部腹鳞
    R.cap(add(NB, [nr * 0.4, -nr * 0.2, nr * 0.55]), add(N1, [nr * 0.45, 0, nr * 0.5]), nr * 0.5, nr * 0.42, cfg.belly, { dz: 0.305, edge: false });
    R.cap(add(N1, [nr * 0.45, 0, nr * 0.5]), add(N2, [nr * 0.4, -nr * 0.1, nr * 0.45]), nr * 0.42, nr * 0.36, cfg.belly, { dz: 0.315, edge: false });
    // 颈背刺
    for (const [q, s] of [
      [N1, 0.85],
      [N2, 0.72],
    ] as [V3, number][]) {
      R.poly([add(q, [-nr * s * 0.6, nr * s * 0.7, 0]), add(q, [-nr * s * 1.6, nr * s * 1.3, 0]), add(q, [-nr * s * 1.2, nr * s * 0.2, 0])], cfg.spikes, { dz: 0.29, shade: 'flat', flat: 1, edge: false });
    }
    HC = NT;
  } else {
    HC = add(NB, [3 * b, 1 * b, 0]);
  }
  const hr2 = cfg.headR * b;
  const dir = -0.18 + head * 0.6;
  const sl = cfg.snout * b;
  const snout = add(HC, [Math.cos(dir) * sl, Math.sin(dir) * sl, 0]);
  R.ball(HC, hr2, hr2 * 0.88, cfg.main, { dz: 0.4 });
  R.cap(HC, snout, hr2 * 0.78, hr2 * 0.48, cfg.main, { dz: 0.42 });
  // 眉骨
  R.cap(add(HC, [hr2 * 0.2, hr2 * 0.55, hr2 * 0.4]), add(HC, [hr2 * 1.1, hr2 * 0.35, hr2 * 0.4]), hr2 * 0.32, hr2 * 0.2, cfg.dark, { dz: 0.44, edge: false });
  // 下颌
  const jaw = dir - 0.12 - p.mouth * 0.7;
  const jawTip = add(HC, [Math.cos(jaw) * sl * 0.92, Math.sin(jaw) * sl * 0.92 - hr2 * 0.45, 0]);
  if (p.mouth > 0.2) {
    R.cap(add(HC, [0, -hr2 * 0.4, 0]), lerp3(snout, jawTip, 0.5), hr2 * 0.55, hr2 * 0.3, ramp('#6a1c22'), { dz: 0.41 });
    for (let i = 0; i < 3; i++) R.dot(add(lerp3(HC, snout, 0.45 + i * 0.18), [0, -hr2 * 0.42, hr2 * 0.4]), rgba(240, 232, 214), 0.5);
  }
  R.cap(add(HC, [0, -hr2 * 0.5, 0]), jawTip, hr2 * 0.5, hr2 * 0.28, cfg.belly, { dz: 0.43 });
  // 角（向后弯）
  for (const s of [-1, 1]) {
    const h0 = add(HC, [-hr2 * 0.3, hr2 * 0.6, s * hr2 * 0.45]);
    const hc = s < 0 ? ramp(hexOf(darken(cfg.horn[2], 0.78))) : cfg.horn;
    R.chain([h0, add(h0, [-hr2 * 0.8, hr2 * 0.55, s * 0.4 * b]), add(h0, [-hr2 * 1.6, hr2 * 0.6, s * 0.7 * b]), add(h0, [-hr2 * 2.1, hr2 * 1.05, s * 0.8 * b])], 0.32 * hr2, 0.1 * hr2, hc, { dz: s < 0 ? 0.33 : 0.5 });
  }
  // 颊刺
  R.poly([add(HC, [-hr2 * 0.5, -hr2 * 0.2, hr2 * 0.6]), add(HC, [-hr2 * 1.5, -hr2 * 0.5, hr2 * 0.6]), add(HC, [-hr2 * 0.4, -hr2 * 0.65, hr2 * 0.6])], cfg.horn, { dz: 0.45, shade: 'flat', flat: 2, edge: false });
  // 眼
  const eyeP = add(HC, [hr2 * 0.45, hr2 * 0.2, hr2 * 0.75]);
  R.dot(eyeP, cfg.eye, 0.6, b > 1.5 ? 2 : 1);
  R.dot(add(snout, [-0.4 * b, 0.6 * b, hr2 * 0.38]), darken(cfg.main[0], 0.6), 0.6);
  // 吐息辉光
  if (p.glow > 0.3) {
    const g = ramp(spec.glow ?? '#ff9a3a', { contrast: 0.5 });
    R.ball(add(snout, [3 * b, -1 * b, 0]), (1.5 + p.glow * 3) * b, (1.2 + p.glow * 2.4) * b, g, { dz: 3, edge: false, bias: 0.6 });
  }

  // 骑手与鞍
  if (rider) {
    const B0 = basePal(spec);
    R.ball(B(add(chest, [-1 * b, cr * 0.95, 0])), 5.6, 2.3, B0.leather, { dz: 1.3 });
    R.poly([B(add(chest, [-7, cr * 0.9, 5])), B(add(chest, [4, cr * 0.9, 5])), B(add(chest, [3, 0, 7.5])), B(add(chest, [-6, 0, 7.5]))], B0.cloth, { shade: 'down', dz: 1.2 });
    const seat = B(add(chest, [-1 * b, cr * 0.95 + 1.5, 0]));
    R.fn(seat, (x, y) => drawHumanoid(R.buf, spec, rider, view, Math.round(x) - 24, Math.round(y) - 39), 8);
  }
}

/* ================================================================== */
/* 灰烬魔像                                                            */
/* ================================================================== */

function drawGolem(R: Projector, spec: UnitModelSpec, p: CPose) {
  const stone = ramp('#6e655c', { contrast: 1.1 });
  const stoneD = ramp('#4e4640');
  const glow = ramp(spec.glow ?? '#ff7a2a', { contrast: 0.5 });
  const drop = p.down * 10;
  const lean = p.lunge * 2 - p.hurt * 2;
  const up = p.bob - drop;
  const T = (v: V3): V3 => [v[0] + lean * (v[1] / 40), v[1] + up * (v[1] / 40), v[2]];
  // 腿
  const step = p.gait >= 0 ? Math.sin(p.gait * 6.28) : 0;
  for (const s of [-1, 1]) {
    const hip = T([0, 20, s * 6]);
    const k = s * step * 2.5;
    const foot: V3 = [2 + k, 3, s * 6.8];
    const knee: V3 = [1.5 + k * 0.5, 11 - p.down * 3, s * 6.6];
    const R1 = s < 0 ? stoneD : stone;
    R.cap(hip, knee, 5.4, 4.6, R1);
    R.cap(knee, foot, 4.6, 4.4, R1, { dz: 0.05 });
    R.ball(add(foot, [1.5, -0.6, 0]), 5.8, 3, R1, { dz: 0.1 });
  }
  // 躯干
  R.ball(T([0, 23, 0]), 8, 6, stoneD, { dz: 0.1 });
  R.ball(T([1, 33, 0]), 12.5, 11, stone, { dz: 0.2 });
  // 熔岩裂纹
  const crack = (pts: V3[]) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      R.line(T(pts[i]), T(pts[i + 1]), glow[3], 1.6);
      R.line(add(T(pts[i]), [0, -0.6, 0]), add(T(pts[i + 1]), [0, -0.6, 0]), glow[2], 1.59);
    }
  };
  crack([
    [2, 41, 10],
    [4, 36, 11.5],
    [2, 31, 12],
    [5, 26, 10.5],
  ]);
  crack([
    [-4, 38, 11],
    [-2, 33, 12.2],
  ]);
  R.ball(T([3, 33, 12.5]), 2.2 + p.glow * 1.2, 2.2 + p.glow * 1.2, glow, { dz: 1.7, edge: false, bias: 0.6 });
  // 头
  const head = T([5, 46 - p.hurt * 1.5, 0]);
  R.ball(head, 5.2, 4.6, stone, { dz: 0.5 });
  R.poly([add(head, [1, -0.5, 4.6]), add(head, [5, -0.5, 3]), add(head, [5, 1, 3]), add(head, [1, 1.3, 4.6])], ramp('#1a1210'), { shade: 'flat', flat: 0, dz: 0.6, edge: false });
  R.dot(add(head, [2.2, 0.4, 4.5]), glow[3], 0.7, 1);
  R.dot(add(head, [4.6, 0.4, 3.2]), glow[3], 0.7);
  // 手臂：rear 抬起，lunge 砸下
  for (const s of [-1, 1]) {
    const near = s > 0;
    const sh = T([1, 40, s * 12]);
    R.ball(sh, 6.6, 6, near ? stone : stoneD, { dz: near ? 0.8 : -0.1 });
    const raise = (near ? 1 : 0.7) * (p.rear * 2.2 + Math.max(0, p.lunge) * 0.9) - p.down * 0.3;
    const swing = p.gait >= 0 ? -step * s * 0.25 : 0;
    const ang = raise + swing;
    const elbow = add(sh, [Math.sin(ang) * 10, -Math.cos(ang) * 10, s * 1.5]);
    const ang2 = ang + (p.lunge > 0.5 ? 0.6 : 0.2) + p.rear * 0.8;
    const fist = add(elbow, [Math.sin(ang2) * 10, -Math.cos(ang2) * 10, 0]);
    const R1 = near ? stone : stoneD;
    R.cap(sh, elbow, 5, 4.4, R1, { dz: near ? 0.85 : -0.15 });
    R.cap(elbow, fist, 4.4, 5, R1, { dz: near ? 0.9 : -0.12 });
    R.ball(fist, 6, 5.6, R1, { dz: near ? 0.95 : -0.1 });
    if (near) R.line(add(fist, [-2, 2, 6]), add(fist, [1, -1, 6]), glow[2], 1);
  }
}

/* ================================================================== */
/* 灰烬亡灵                                                            */
/* ================================================================== */

function drawWraith(R: Projector, spec: UnitModelSpec, p: CPose, frame: number) {
  const robe = ramp('#3a3050', { contrast: 1.1 });
  const robeD = ramp('#241e34');
  const inner = ramp('#0a0610');
  const glow = ramp(spec.glow ?? '#9a7cff', { contrast: 0.5 });
  const bone = ramp('#d8d0c0');
  const fy = 9 + p.bob * 1.5 - p.down * 7;
  const lean = p.lunge * 2.5 - p.hurt * 2.5;
  const T = (v: V3): V3 => [v[0] + lean * (v[1] / 40), v[1] + fy * (1 - p.down * 0.3), v[2]];
  // 下摆：破碎的布条
  const n = 6;
  const hem: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = -6 + 12 * t;
    const wob = Math.sin(t * 9 + frame * 1.7) * 1.5;
    hem.push(T([a * 0.4 - 3 + wob * 0.3, (i % 2 ? 2 : -3) + wob, 8 - 16 * t]));
  }
  R.poly([T([0, 33, -6]), ...hem.reverse(), T([0, 33, 6])], robeD, { shade: 'down', dz: -0.4 });
  R.poly([T([-3, 33, -7]), T([3, 33, -7]), T([5, 14, -8]), T([2, 0, -6]), T([-1, 4, 0]), T([-4, -2, 7]), T([-6, 12, 8]), T([-3, 33, 7]), T([3, 33, 7]), T([6, 12, 7])], robe, { shade: 'cyl', dz: 0 });
  // 兜帽
  const hc = T([2, 40 - p.hurt, 0]);
  R.ball(add(hc, [-0.5, 0.5, 0]), 7.6, 7.8, robe, { dz: 0.4 });
  R.ball(add(hc, [2.5, -0.6, 3]), 4.6, 5, inner, { dz: 0.5, edge: false, flat: 0 });
  R.dot(add(hc, [2.6, 0, 5]), glow[3], 0.6, 1);
  R.dot(add(hc, [5.4, 0, 3.4]), glow[3], 0.6, 1);
  // 手臂：伸出的骨爪
  for (const s of [-1, 1]) {
    const near = s > 0;
    const sh = T([1, 32, s * 7]);
    const reach = p.lunge * 0.8 + p.rear * 0.6 + p.glow * 0.9;
    const hand = add(sh, [5 + reach * 6, -5 + p.rear * 10 + p.glow * 6, s * 3]);
    R.cap(sh, hand, 3, 2.4, near ? robe : robeD, { dz: near ? 0.7 : -0.2 });
    for (const t of [-1, 0, 1]) R.cap(add(hand, [1, 0, 0]), add(hand, [3.5, -1.5 + t * 1.3, 0]), 0.7, 0.35, bone, { dz: near ? 0.72 : -0.18 });
  }
  // 魂火
  const orb = T([10 + p.glow * 3, 30 + p.glow * 4, 2]);
  R.ball(orb, 1.5 + p.glow * 2.5, 1.5 + p.glow * 2.5, glow, { dz: 2, edge: false, bias: 0.5 });
}

/* ================================================================== */
/* 入口                                                                */
/* ================================================================== */

export interface CreatureFrameInfo {
  w: number;
  h: number;
  anchorX: number;
  anchorY: number;
  /** 脚下光环直径（世界单位） */
  ring: number;
}

/** 生物精灵的帧尺寸（像素） */
export function creatureFrame(spec: UnitModelSpec): CreatureFrameInfo {
  const mount = spec.mount && spec.mount !== 'none' ? spec.mount : null;
  if (mount === 'horse' || mount === 'pegasus') return { w: 96, h: 96, anchorX: 48, anchorY: 90, ring: 0.86 };
  if (mount === 'wyvern') return { w: 128, h: 112, anchorX: 62, anchorY: 106, ring: 0.9 };
  switch (spec.body) {
    case 'wolf':
      return { w: 64, h: 56, anchorX: 32, anchorY: 51, ring: 0.74 };
    case 'salamander':
      return { w: 80, h: 56, anchorX: 40, anchorY: 51, ring: 0.8 };
    case 'golem':
      return { w: 80, h: 80, anchorX: 38, anchorY: 75, ring: 0.86 };
    case 'wraith':
      return { w: 64, h: 72, anchorX: 30, anchorY: 66, ring: 0.7 };
    case 'wyvern':
      return { w: 128, h: 112, anchorX: 62, anchorY: 106, ring: 0.9 };
    case 'dragon': {
      const k = dragonK(spec);
      const h = Math.ceil((74 * k) / 8) * 8;
      return { w: Math.ceil((96 * k) / 8) * 8, h, anchorX: Math.round(46 * k), anchorY: h - 6, ring: 1.8 };
    }
    default:
      return { w: 64, h: 64, anchorX: 32, anchorY: 60, ring: 0.7 };
  }
}

function dragonK(spec: UnitModelSpec): number {
  return Math.max(1.4, Math.min(2.4, (spec.scale ?? 2.4) * 0.8));
}

/** 绘制生物 / 骑乘单位的一帧 */
export function drawCreature(buf: PixelBuf, spec: UnitModelSpec, anim: SpriteAnim, frame: number, view: View) {
  const info = creatureFrame(spec);
  const p = creaturePose(anim, frame);
  const mount = spec.mount && spec.mount !== 'none' ? spec.mount : null;
  const enemy = spec.team === 'enemy';
  if (mount) {
    // 骑乘时坐骑动作幅度略小
    const mp: CPose = { ...p, rear: anim === 'attack' ? p.rear * 0.5 : p.rear, mouth: p.mouth * 0.6 };
    const rider = riderPose(anim, frame, spec);
    const R = new Projector(buf, view, info.anchorX, info.anchorY);
    if (mount === 'wyvern') drawDrake(R, spec, mp, wyvernCfg(spec, enemy, 1.12), rider, view);
    else drawHorse(R, spec, mp, rider, view, mount === 'pegasus');
    R.flush();
    return;
  }
  switch (spec.body) {
    case 'wolf': {
      const R = new Projector(buf, view, info.anchorX, info.anchorY);
      drawWolf(R, spec, p);
      R.flush();
      return;
    }
    case 'golem': {
      const R = new Projector(buf, view, info.anchorX, info.anchorY, spec.scale ?? 1);
      drawGolem(R, spec, p);
      R.flush();
      return;
    }
    case 'wraith': {
      const R = new Projector(buf, view, info.anchorX, info.anchorY);
      drawWraith(R, spec, p, frame + anim.length);
      R.flush();
      return;
    }
    case 'salamander': {
      const R = new Projector(buf, view, info.anchorX, info.anchorY);
      drawDrake(R, spec, p, {
        legs: 4,
        wings: false,
        hover: 0,
        bulk: 1,
        bodyY: 6.5,
        chestR: 6,
        hipR: 5.6,
        leg: [3.6, 3.4, 2.2, 1.6],
        neck: 0.3,
        neckAng: 1,
        neckR: 4,
        headR: 4.6,
        snout: 6.5,
        tail: 20,
        tailR: 4,
        wingLen: 0,
        main: ramp('#c8461e', { contrast: 1.05 }),
        dark: ramp('#94301a'),
        belly: ramp('#f0a848', { contrast: 0.8 }),
        membrane: ramp('#c8461e'),
        horn: ramp('#3a1a14'),
        eye: hex('#ffe060'),
        flame: true,
        spikes: ramp('#5a1a10'),
      }, null, view);
      R.flush();
      return;
    }
    case 'wyvern': {
      const R = new Projector(buf, view, info.anchorX, info.anchorY);
      drawDrake(R, spec, p, wyvernCfg(spec, true, 1.1), null, view);
      R.flush();
      return;
    }
    case 'dragon': {
      const k = dragonK(spec);
      const R = new Projector(buf, view, info.anchorX, info.anchorY);
      const main = spec.primary;
      drawDrake(R, spec, p, {
        legs: 4,
        wings: true,
        hover: 0,
        bulk: k,
        bodyY: 13,
        chestR: 9.5,
        hipR: 8.5,
        leg: [5, 6, 3.8, 2.8],
        neck: 13,
        neckAng: 1.2,
        neckR: 5,
        headR: 5.2,
        snout: 8,
        tail: 30,
        tailR: 6,
        wingLen: 48,
        main: ramp(main, { contrast: 1.15 }),
        dark: ramp(darkHex(main, 0.6)),
        belly: ramp(spec.secondary, { contrast: 0.9 }),
        membrane: ramp(spec.secondary, { contrast: 1.1 }),
        horn: ramp('#e8dcc0', { contrast: 1.1 }),
        eye: hex(spec.glow ?? '#ffd040'),
        spikes: ramp(darkHex(spec.secondary, 0.7)),
      }, null, view);
      R.flush();
      return;
    }
    default: {
      const R = new Projector(buf, view, info.anchorX, info.anchorY);
      drawWolf(R, spec, p);
      R.flush();
    }
  }
}

function wyvernCfg(spec: UnitModelSpec, enemy: boolean, bulk: number): DrakeCfg {
  const wild = spec.body === 'wyvern';
  const base = wild ? '#5e6a3c' : enemy ? '#5a3a3e' : '#46685a';
  return {
    legs: 2,
    wings: true,
    hover: 12,
    bulk,
    bodyY: 22,
    chestR: 7.5,
    hipR: 7,
    leg: [7, 7.5, 3.2, 2],
    neck: wild ? 12 : 13,
    neckAng: wild ? 1.15 : 0.62,
    neckR: 4.4,
    headR: 4.4,
    snout: 8,
    tail: 26,
    tailR: 5,
    wingLen: wild ? 50 : 44,
    main: ramp(base, { contrast: 1.05 }),
    dark: ramp(darkHex(base, 0.65)),
    belly: ramp(wild ? '#c8b880' : '#d0c49a', { contrast: 0.85 }),
    membrane: ramp(wild ? '#8a6a3a' : enemy ? '#7a3a34' : '#7a6a48', { contrast: 1 }),
    horn: ramp('#e0d4b8'),
    eye: hex(enemy || wild ? '#ffcc30' : '#ffe680'),
    spikes: ramp(darkHex(base, 0.5)),
  };
}

void lighten;
