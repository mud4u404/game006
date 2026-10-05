/**
 * 人形角色的像素绘制（HD-2D 风格精灵）
 * --------------------------------------------------------------
 * 画布 48×64，脚底在 y=61。两种视角：
 *  front：3/4 正面，朝向画面右下方（近侧是角色的右手，在画面左侧，持武器）
 *  back ：3/4 背面，朝向画面右上方（近侧是角色的右手，在画面右侧）
 * 左右朝向通过镜像得到。
 */
import type { HairModel, HelmetModel, UnitModelSpec, WeaponModel } from '@/render/contracts';
import { darken, hex, lighten, PixelBuf, ramp, rgba, type Ramp } from './pixel';

export const SPRITE_W = 48;
export const SPRITE_H = 64;
export type View = 'front' | 'back';

/** 一帧姿势（像素 / 角度） */
export interface Pose {
  bob: number; // 上半身上下
  lean: number; // 上半身左右（正 = 朝向方向）
  tilt: number; // 头部倾斜（弧度）
  nearArm: number; // 近侧手臂：0 = 自然下垂，正 = 向前抬
  nearElbow: number;
  farArm: number;
  farElbow: number;
  nearLeg: number; // 正 = 向前
  farLeg: number;
  nearKnee: number;
  farKnee: number;
  weapon: number; // 武器方向：0 = 朝上，正 = 顺时针（朝前）
  glow: number; // 施法光芒 0..1
  crouch: number; // 下蹲（像素）
  down: number; // 倒地 0..1
  /** 骑乘：只画近侧腿（跨坐在坐骑上），远侧腿被坐骑遮挡 */
  seated?: boolean;
}

export const BASE_POSE: Pose = {
  bob: 0,
  lean: 0,
  tilt: 0,
  nearArm: 0.12,
  nearElbow: 0.35,
  farArm: -0.1,
  farElbow: 0.3,
  nearLeg: 0,
  farLeg: 0,
  nearKnee: 0,
  farKnee: 0,
  weapon: 2.4,
  glow: 0,
  crouch: 0,
  down: 0,
};

interface Palette {
  skin: Ramp;
  hair: Ramp;
  prim: Ramp;
  sec: Ramp;
  metal: Ramp;
  leather: Ramp;
  pants: Ramp;
  eye: number;
  dark: number;
  gold: Ramp;
  wood: Ramp;
  glow: Ramp;
}

function palette(spec: UnitModelSpec): Palette {
  const metal = spec.metal ?? '#b8bec8';
  return {
    skin: ramp(spec.skin ?? '#f4d6bc', { contrast: 0.8 }),
    hair: ramp(spec.hair ?? '#4a3020', { contrast: 1.1 }),
    prim: ramp(spec.primary),
    sec: ramp(spec.secondary),
    metal: ramp(metal, { contrast: 1.25 }),
    leather: ramp('#6a4630'),
    pants: ramp(darkHex(spec.secondary, 0.55)),
    eye: hex(spec.eyes ?? '#3a2a22'),
    dark: rgba(28, 18, 22),
    gold: ramp('#e0b048', { contrast: 1.1 }),
    wood: ramp('#7a5234'),
    glow: ramp(spec.glow ?? '#ffd27a', { contrast: 0.6 }),
  };
}

function darkHex(h: string, k: number): string {
  const n = parseInt(h.replace('#', ''), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

type Pt = [number, number];
const rot = (v: Pt, a: number): Pt => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];

/** 计算手臂关节：从肩部出发，0 角为竖直向下；正角朝 +x（朝向方向） */
function armChain(shoulder: Pt, a: number, elbow: number, up: number, lo: number): { elbow: Pt; hand: Pt } {
  const e = add(shoulder, rot([0, up], -a));
  const h = add(e, rot([0, lo], -(a + elbow)));
  return { elbow: e, hand: h };
}

function legChain(hip: Pt, a: number, knee: number, up: number, lo: number): { knee: Pt; foot: Pt } {
  const k = add(hip, rot([0, up], -a));
  const f = add(k, rot([0, lo], -(a - knee)));
  return { knee: k, foot: f };
}

/* ================================================================== */
/* 主绘制                                                              */
/* ================================================================== */

export function drawHumanoid(buf: PixelBuf, spec: UnitModelSpec, pose: Pose, view: View, ox = 0, oy = 0) {
  const P = palette(spec);
  const heavy = spec.build === 'heavy';
  const slim = spec.build === 'slim' || spec.gender === 'f';
  const armored = ['open', 'full', 'horned'].includes(spec.helmet ?? 'none') || spec.shield === 'tower' || spec.shield === 'kite';
  const robe = (spec.weapon === 'staff' || spec.weapon === 'tome') && !armored && !spec.mount;
  const skeleton = spec.body === 'skeleton';
  const front = view === 'front';
  // 前后视角时朝向的水平方向：front 朝右下，back 朝右上；近侧在 front 为左、back 为右
  const nearSide = front ? -1 : 1;
  const down = pose.down;

  const cx = 24 + ox + pose.lean * (1 - down);
  const groundY = 61 + oy;
  const crouch = pose.crouch + down * 10;
  const hipY = groundY - 22 + crouch;
  const neckY = hipY - 16 + pose.bob * 0.5;
  const headY = neckY - 9 + pose.bob;
  const shW = heavy ? 6.5 : slim ? 4.8 : 5.6;

  const hipC: Pt = [cx, hipY];
  const nearHip: Pt = [cx + nearSide * 2.5, hipY];
  const farHip: Pt = [cx - nearSide * 2.5, hipY];
  const nearSh: Pt = [cx + nearSide * shW, neckY + 2];
  const farSh: Pt = [cx - nearSide * (shW - 0.8), neckY + 2];
  const facing = 1; // 朝向画面右方
  const nA = armChain(nearSh, pose.nearArm * facing, pose.nearElbow, 7, 6.5);
  const fA = armChain(farSh, pose.farArm * facing, pose.farElbow, 6.5, 6);
  const nL = legChain(nearHip, pose.nearLeg * facing, pose.nearKnee, 10, 10.5 - Math.min(crouch, 6) * 0.3);
  const fL = legChain(farHip, pose.farLeg * facing, pose.farKnee, 10, 10.5 - Math.min(crouch, 6) * 0.3);
  // 脚不能穿过地面
  nL.foot[1] = Math.min(nL.foot[1], groundY - 1);
  fL.foot[1] = Math.min(fL.foot[1], groundY - 1);

  const sleeve = armored && !skeleton ? P.metal : P.prim;
  const handR = skeleton ? ramp('#cfc5ad') : armored ? P.metal : P.skin;
  const limbW = heavy ? 2.4 : slim ? 1.6 : 1.9;

  /* ---------- 披风（正面视角在最后方） ---------- */
  const cape = () => {
    if (!spec.cape) return;
    const top = neckY + 1;
    const sway = pose.lean * 0.5;
    if (front) {
      // 正面：披风大部分被身体挡住，只在两侧露出衬里
      const bot = hipY + 11 - Math.min(crouch, 6) * 0.5;
      const lining = darkRamp(P.sec);
      buf.poly(
        [
          [cx - shW - 0.5, top + 1],
          [cx - shW + 2, top + 1],
          [cx - shW + 0.5 - sway, bot],
          [cx - shW - 3.5 - sway, bot - 1],
        ],
        lining,
        { shade: 'down', edge: true },
      );
      buf.poly(
        [
          [cx + shW - 2, top + 1],
          [cx + shW + 0.5, top + 1],
          [cx + shW + 3 - sway, bot - 2],
          [cx + shW - 0.5 - sway, bot - 1],
        ],
        darkRamp(P.prim),
        { shade: 'down', edge: true },
      );
    } else {
      // 背面：披风覆盖整个后背
      const bot = groundY - 4 + Math.min(0, -crouch * 0.4);
      buf.poly(
        [
          [cx - shW - 1, top],
          [cx + shW + 1, top],
          [cx + shW + 4 - sway, bot],
          [cx - shW - 4 - sway, bot + 1],
        ],
        P.prim,
        { shade: 'down', edge: true },
      );
      buf.line(cx - shW, top + 1, cx + shW, top + 1, P.sec[2]);
    }
  };

  /* ---------- 头 ---------- */
  const head = () => {
    const hc: Pt = [cx + (front ? 1 : 0.5) + pose.tilt * 3, headY];
    drawHead(buf, spec, P, hc, view, pose);
  };

  /* ---------- 腿 ---------- */
  const leg = (L: { knee: Pt; foot: Pt }, hip: Pt, near: boolean) => {
    if (robe) return;
    if (pose.seated && !near) return;
    const pants = armored ? P.metal : skeleton ? ramp('#cfc5ad') : P.pants;
    buf.capsule(hip[0], hip[1], L.knee[0], L.knee[1], limbW + 0.6, limbW + 0.2, pants, { edge: true, bias: near ? 0 : -0.25 });
    const boot = armored ? P.metal : P.leather;
    buf.capsule(L.knee[0], L.knee[1], L.foot[0], L.foot[1], limbW + 0.3, limbW + 0.5, boot, { edge: true, bias: near ? 0 : -0.25 });
    // 脚掌
    buf.ellipse(L.foot[0] + (front ? 1.2 : 0.8), L.foot[1] + 0.6, 2.4, 1.4, boot, { edge: true, bias: near ? 0 : -0.25 });
  };

  /* ---------- 躯干 ---------- */
  const torso = () => {
    const waistY = hipY - 4;
    const w = shW;
    const body: Pt[] = [
      [cx - w - 0.5, neckY + 1],
      [cx + w + 0.5, neckY + 1],
      [cx + w - 0.6, neckY + 6],
      [cx + (slim ? 3 : 3.8), waistY],
      [cx + 4.2, hipY + 1],
      [cx - 4.2, hipY + 1],
      [cx - (slim ? 3 : 3.8), waistY],
      [cx - w + 0.6, neckY + 6],
    ];
    if (skeleton) {
      buf.capsule(cx, neckY, cx, hipY, 1.2, 1.2, ramp('#cfc5ad'));
      for (let i = 0; i < 4; i++) buf.capsule(cx - 3.5, neckY + 3 + i * 2.6, cx + 3.5, neckY + 3 + i * 2.6, 0.8, 0.8, ramp('#cfc5ad'), { edge: true });
      return;
    }
    // 长袍下摆 / 衣摆
    if (robe) {
      buf.poly(
        [
          [cx - 4.2, waistY],
          [cx + 4.2, waistY],
          [cx + 7.5, groundY - 0.5],
          [cx - 7.5, groundY - 0.5],
        ],
        P.prim,
        { shade: 'cyl', edge: true },
      );
      // 中线饰带
      buf.poly(
        [
          [cx - 0.8 + (front ? 1 : 0), waistY],
          [cx + 0.8 + (front ? 1 : 0), waistY],
          [cx + 1.6 + (front ? 1 : 0), groundY - 1],
          [cx - 1.6 + (front ? 1 : 0), groundY - 1],
        ],
        P.sec,
        { shade: 'cyl' },
      );
    } else {
      const hem = spec.gender === 'f' ? 8 : 6;
      buf.poly(
        [
          [cx - 4.3, waistY],
          [cx + 4.3, waistY],
          [cx + 5.4, hipY + hem],
          [cx - 5.4, hipY + hem],
        ],
        armored ? P.metal : darkRamp(P.prim),
        { shade: 'cyl', edge: true },
      );
    }
    buf.poly(body, armored ? P.prim : P.prim, { shade: 'cyl', edge: true });
    if (armored) {
      // 胸甲
      buf.ellipse(cx + (front ? 0.8 : 0), neckY + 6, w - 1, 5.5, P.metal, { edge: true });
      // 肩甲
      buf.ellipse(farSh[0], farSh[1] + 0.5, heavy ? 3.6 : 3, 2.6, P.metal, { edge: true, bias: -0.2 });
    }
    // 纹章饰带（骑士）
    if (spec.cape && !robe) {
      buf.poly(
        [
          [cx - 1 + (front ? 0.8 : 0), neckY + 3],
          [cx + 1 + (front ? 0.8 : 0), neckY + 3],
          [cx + 1.2 + (front ? 0.8 : 0), hipY + 5],
          [cx - 1.2 + (front ? 0.8 : 0), hipY + 5],
        ],
        P.sec,
        { shade: 'flat', flat: 2 },
      );
    }
    // 腰带
    buf.poly(
      [
        [cx - 4.4, waistY - 1],
        [cx + 4.4, waistY - 1],
        [cx + 4.4, waistY + 0.8],
        [cx - 4.4, waistY + 0.8],
      ],
      P.leather,
      { shade: 'flat', flat: 1 },
    );
    if (front) buf.set(cx + 1, waistY, P.gold[3]);
    // 领口 / 围巾
    buf.ellipse(cx + (front ? 0.6 : 0), neckY + 1, 3.6, 1.6, spec.cape ? P.sec : darkRamp(P.prim), { edge: true });
    if (armored) buf.ellipse(nearSh[0], nearSh[1] + 0.5, heavy ? 3.8 : 3.2, 2.8, P.metal, { edge: true });
  };

  /* ---------- 手臂 ---------- */
  const arm = (A: { elbow: Pt; hand: Pt }, sh: Pt, near: boolean) => {
    const b = near ? 0 : -0.3;
    buf.capsule(sh[0], sh[1], A.elbow[0], A.elbow[1], limbW + 0.3, limbW, sleeve, { edge: true, bias: b });
    buf.capsule(A.elbow[0], A.elbow[1], A.hand[0], A.hand[1], limbW, limbW - 0.1, armored ? P.metal : skeleton ? ramp('#cfc5ad') : spec.weapon === 'staff' || robe ? P.prim : P.leather, { edge: true, bias: b });
    buf.ellipse(A.hand[0], A.hand[1], 1.6, 1.6, handR, { edge: true, bias: b });
  };

  /* ---------- 武器 / 盾 ---------- */
  const weaponNear = spec.weapon !== 'bow' && spec.weapon !== 'tome';
  const drawWeapon = (hand: Pt) => drawWeaponAt(buf, spec.weapon, hand, pose.weapon, P, spec);
  const drawOff = (hand: Pt) => {
    if (spec.weapon === 'bow') drawWeaponAt(buf, 'bow', hand, 0, P, spec);
    else if (spec.weapon === 'tome') {
      buf.poly(
        [
          [hand[0] - 3, hand[1] - 4],
          [hand[0] + 3, hand[1] - 5],
          [hand[0] + 3.5, hand[1] + 2],
          [hand[0] - 2.5, hand[1] + 3],
        ],
        darkRamp(P.prim),
        { shade: 'flat', flat: 1, edge: true },
      );
      buf.line(hand[0] - 2, hand[1] - 3, hand[0] + 2, hand[1] - 4, P.gold[3]);
    } else if (spec.shield && spec.shield !== 'none') {
      drawShield(buf, spec.shield, hand, P, front);
    }
  };

  /* ---------- 绘制顺序 ---------- */
  if (front) {
    cape();
    if (spec.hairStyle === 'long' || spec.hairStyle === 'braid' || spec.hairStyle === 'ponytail') drawBackHair(buf, spec, P, [cx + 1, headY], pose, view);
    arm(fA, farSh, false);
    if (!weaponNear) drawOff(fA.hand);
    leg(fL, farHip, false);
    leg(nL, nearHip, true);
    torso();
    if (weaponNear && spec.shield && spec.shield !== 'none') drawOff(fA.hand);
    head();
    arm(nA, nearSh, true);
    if (weaponNear) drawWeapon(nA.hand);
  } else {
    // 背面：近侧（持武器）在右
    if (weaponNear) drawWeapon(nA.hand);
    arm(fA, farSh, false);
    if (!weaponNear) drawOff(fA.hand);
    leg(fL, farHip, false);
    leg(nL, nearHip, true);
    torso();
    head();
    cape();
    if (spec.hairStyle === 'long' || spec.hairStyle === 'braid' || spec.hairStyle === 'ponytail') drawBackHair(buf, spec, P, [cx + 0.5, headY], pose, view);
    if (weaponNear && spec.shield && spec.shield !== 'none') drawOff(fA.hand);
    arm(nA, nearSh, true);
  }
  // 施法光芒
  if (pose.glow > 0) {
    const g = weaponNear ? nA.hand : fA.hand;
    const r = 1.2 + pose.glow * 2.2;
    const gx = g[0] + (weaponNear ? -2 : 2);
    buf.ellipse(gx, g[1] - (spec.weapon === 'staff' ? 13 : 5), r, r, P.glow, { bias: 0.7 });
  }
  void hipC;
}

function darkRamp(r: Ramp): Ramp {
  return [darken(r[0], 0.85), r[0], r[1], r[2]];
}

/* ================================================================== */
/* 头部                                                                */
/* ================================================================== */

function drawHead(buf: PixelBuf, spec: UnitModelSpec, P: Palette, c: Pt, view: View, pose: Pose) {
  const [x, y] = c;
  const front = view === 'front';
  const helmet: HelmetModel = spec.helmet ?? 'none';
  const style: HairModel = spec.hairStyle ?? 'short';
  const skeleton = spec.body === 'skeleton';
  const rx = 6.2;
  const ry = 6.6;
  if (skeleton) {
    buf.ellipse(x, y, rx, ry, ramp('#d6ccb4'), { edge: true });
    if (front) {
      buf.ellipse(x - 1, y + 0.5, 1.4, 1.6, ramp('#1a1214'), { flat: 0 });
      buf.ellipse(x + 3, y + 0.5, 1.3, 1.5, ramp('#1a1214'), { flat: 0 });
      buf.set(x - 1, y + 0.5, rgba(255, 90, 60));
      buf.set(x + 3, y + 0.5, rgba(255, 90, 60));
      buf.line(x - 1, y + 4.5, x + 3, y + 4.5, rgba(40, 30, 30));
    }
    return;
  }
  const hooded = helmet === 'hood' || helmet === 'veil';
  // 头发后方体积（在脸之前画）
  if (style !== 'bald' && helmet !== 'full' && !hooded) {
    buf.ellipse(x - (front ? 1.2 : 0), y - 1, rx + 1.2, ry + 0.6, P.hair, { edge: true });
  }
  if (hooded) {
    const cl = helmet === 'veil' ? ramp(spec.secondary === '#f2f0ea' ? '#f2f0ea' : '#f2f0ea') : P.prim;
    const inner = helmet === 'veil' ? P.sec : darkRamp(P.prim);
    buf.ellipse(x - 0.6, y + 0.4, rx + 2.2, ry + 2, helmet === 'veil' ? inner : cl, { edge: true });
    // 垂到肩上的布
    buf.poly(
      [
        [x - rx - 2, y + 2],
        [x + rx + 1.5, y + 2],
        [x + rx + 3, y + 10],
        [x - rx - 3.5, y + 10],
      ],
      helmet === 'veil' ? inner : cl,
      { shade: 'cyl', edge: true },
    );
  }
  if (helmet === 'full') {
    buf.ellipse(x, y, rx + 0.8, ry + 0.6, P.metal, { edge: true });
    if (front) {
      buf.line(x - 3, y + 0.5, x + 5, y + 0.5, P.dark);
      buf.line(x + 1, y + 1, x + 1, y + 5, darken(P.metal[1], 0.8));
    }
    // 盔缨
    buf.capsule(x, y - ry - 0.5, x - 5, y - ry + 3, 1.6, 1, P.sec, { edge: true });
    return;
  }
  // 脸
  if (front) {
    buf.ellipse(x + 0.5, y + 0.6, rx - 0.3, ry - 0.4, P.skin, { bias: 0.15 });
    // 下巴略尖
    buf.poly(
      [
        [x - 3, y + 3],
        [x + 5, y + 3],
        [x + 2.5, y + 6.8],
        [x + 0.5, y + 6.8],
      ],
      P.skin,
      { shade: 'flat', flat: 2 },
    );
    // 耳朵
    buf.ellipse(x - 5, y + 1.2, 1.1, 1.6, P.skin, { flat: 1 });
    drawFace(buf, spec, P, x, y, pose);
  }
  // 前发 / 发顶
  if (style !== 'bald' && !hooded) drawFrontHair(buf, spec, P, x, y, view, rx, ry);
  if (hooded) {
    // 兜帽前沿
    buf.poly(
      [
        [x - rx - 1.5, y - 1],
        [x - 2, y - ry - 2.5],
        [x + 4, y - ry - 2],
        [x + rx + 1.5, y - 1],
        [x + rx - 0.5, y - 3.5],
        [x - rx + 1, y - 3],
      ],
      helmet === 'veil' ? ramp('#f4f2ec') : P.prim,
      { shade: 'dome', edge: true },
    );
    if (front && style !== 'bald') {
      // 露出的刘海
      buf.poly(
        [
          [x - 3.5, y - 3.5],
          [x + 4.5, y - 3.8],
          [x + 3.5, y - 1.2],
          [x + 1.5, y - 2.2],
          [x - 0.5, y - 0.8],
          [x - 2, y - 2.4],
        ],
        P.hair,
        { shade: 'flat', flat: 2 },
      );
    }
    if (helmet === 'veil') buf.line(x - rx, y - 2.5, x + rx, y - 3, P.sec[2]);
  }
  if (spec.beard && front) {
    buf.poly(
      [
        [x - 3.5, y + 2.6],
        [x + 5, y + 2.6],
        [x + 3.5, y + 8.5],
        [x - 1.5, y + 8.5],
      ],
      P.hair,
      { shade: 'dome', edge: true },
    );
    buf.line(x - 0.5, y + 3.6, x + 3, y + 3.6, darken(P.hair[0], 0.8));
  }
  drawHelmet(buf, spec, P, x, y, view, rx, ry);
}

function drawFace(buf: PixelBuf, spec: UnitModelSpec, P: Palette, x: number, y: number, _pose: Pose) {
  const f = spec.face ?? {};
  const eyeY = Math.round(y + 1);
  const ex = [Math.round(x - 0.5), Math.round(x + 3.5)];
  const lash = P.dark;
  const iris = P.eye;
  const irisHi = lighten(iris, 0.35);
  ex.forEach((exx, i) => {
    const patch = f.eyepatch && ((f.eyepatch === 'left' && i === 1) || (f.eyepatch === 'right' && i === 0));
    if (patch) {
      buf.set(exx, eyeY, lash);
      buf.set(exx + 1, eyeY, lash);
      buf.set(exx, eyeY + 1, lash);
      buf.set(exx + 1, eyeY + 1, lash);
      buf.line(exx - 3, eyeY - 2, exx + 4, eyeY - 4, lash);
      return;
    }
    if (f.old) {
      buf.set(exx, eyeY + 1, lash);
      buf.set(exx + (i ? 0 : 1), eyeY + 1, lash);
      return;
    }
    // 日系大眼：上睫毛 + 虹膜（上深下浅）+ 高光
    buf.set(exx, eyeY - 1, lash);
    if (i === 0) buf.set(exx + 1, eyeY - 1, lash);
    buf.set(exx, eyeY, f.glow ? lighten(iris, 0.5) : iris);
    buf.set(exx, eyeY + 1, f.glow ? lighten(iris, 0.7) : irisHi);
    if (i === 0) {
      buf.set(exx + 1, eyeY, f.slit ? lash : rgba(250, 248, 240));
      buf.set(exx + 1, eyeY + 1, iris);
    }
    if (spec.gender === 'f' && i === 1) buf.set(exx + 1, eyeY - 1, lash);
  });
  // 嘴
  buf.set(Math.round(x + 1.5), Math.round(y + 4.6), darken(P.skin[1], 0.75));
  // 腮红
  if (f.blush ?? spec.gender === 'f') {
    buf.set(Math.round(x - 1.5), Math.round(y + 3.2), rgba(244, 150, 140));
    buf.set(Math.round(x + 5), Math.round(y + 3.2), rgba(244, 150, 140));
  }
  if (f.scar) {
    const sx = f.scar === 'left' ? x + 3.5 : x - 0.5;
    buf.line(sx - 1, eyeY - 2, sx + 1, eyeY + 2, rgba(180, 90, 90));
  }
}

function drawFrontHair(buf: PixelBuf, spec: UnitModelSpec, P: Palette, x: number, y: number, view: View, rx: number, ry: number) {
  const style = spec.hairStyle ?? 'short';
  const front = view === 'front';
  if (!front) {
    // 背面：整个后脑都是头发
    buf.ellipse(x, y - 0.4, rx + 1.1, ry + 0.4, P.hair, { edge: true });
    if (style === 'spiky') {
      for (let i = 0; i < 5; i++) {
        const a = -2.4 + i * 0.55;
        const tip: Pt = [x + Math.cos(a) * (rx + 4.5), y + Math.sin(a) * (ry + 4)];
        buf.poly(
          [
            [x + Math.cos(a - 0.3) * rx, y + Math.sin(a - 0.3) * ry],
            tip,
            [x + Math.cos(a + 0.3) * rx, y + Math.sin(a + 0.3) * ry],
          ],
          P.hair,
          { shade: 'flat', flat: i % 2 ? 1 : 2, edge: true },
        );
      }
    }
    if (style === 'ponytail') buf.ellipse(x - 0.5, y - 4, 1.8, 1.4, P.sec, { flat: 2 });
    return;
  }
  // 发顶
  buf.poly(
    [
      [x - rx - 1, y + 0.5],
      [x - rx + 0.2, y - ry + 1.5],
      [x - 1, y - ry - 1.2],
      [x + 4, y - ry - 0.8],
      [x + rx + 1, y - ry + 2.5],
      [x + rx + 1.5, y - 0.5],
    ],
    P.hair,
    { shade: 'dome', edge: true, bias: 0.15 },
  );
  if (style === 'slick') {
    // 背头：额头露出
    buf.line(x - 3, y - ry + 1, x + 4, y - ry + 0.5, P.hair[3]);
    buf.poly(
      [
        [x + 3, y - 3],
        [x + 5, y - 3.5],
        [x + 4.5, y + 0.5],
      ],
      P.hair,
      { shade: 'flat', flat: 2 },
    );
    return;
  }
  // 刘海：锯齿状下沿
  const spiky = style === 'spiky';
  const n = spiky ? 4 : 5;
  const left = x - rx + 0.5;
  const right = x + rx + 1;
  const topY = y - ry + 2;
  const pts: Pt[] = [[left, topY]];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = left + (right - left) * t;
    const tip = y - 1.5 + (i % 2 ? 1.8 : 0) + (spiky ? -0.8 : 0) + (i === 0 || i === n ? 2.2 : 0);
    pts.push([px, tip]);
    if (i < n) pts.push([px + (right - left) / n / 2, y - 3.6]);
  }
  pts.push([right, topY]);
  buf.poly(pts, P.hair, { shade: 'dome', edge: true, bias: 0.25 });
  // 高光（天使环）
  buf.line(x - 2, y - ry + 1, x + 3, y - ry + 0.6, P.hair[3]);
  // 刺发
  if (spiky) {
    const spikes: [number, number][] = [
      [-2.6, 5.5],
      [-2.0, 6.5],
      [-1.4, 6],
      [-0.9, 5],
    ];
    for (const [a, len] of spikes) {
      const b0: Pt = [x + Math.cos(a - 0.35) * rx, y + Math.sin(a - 0.35) * ry];
      const b1: Pt = [x + Math.cos(a + 0.35) * rx, y + Math.sin(a + 0.35) * ry];
      const tip: Pt = [x + Math.cos(a) * (rx + len), y + Math.sin(a) * (ry + len)];
      buf.poly([b0, tip, b1], P.hair, { shade: 'flat', flat: 2, edge: true });
    }
    if (spec.ahoge) buf.line(x + 1, y - ry - 1, x + 3, y - ry - 4, P.hair[2]);
  }
  // 两侧鬓发
  if (style === 'long' || style === 'bob' || style === 'braid' || style === 'twin') {
    buf.poly(
      [
        [x + rx - 0.5, y - 2],
        [x + rx + 2, y - 1],
        [x + rx + 1.6, y + (style === 'bob' ? 5 : 8)],
        [x + rx - 0.2, y + (style === 'bob' ? 5.5 : 9)],
      ],
      P.hair,
      { shade: 'cyl', edge: true },
    );
    buf.poly(
      [
        [x - rx - 1.2, y - 2],
        [x - rx + 1, y - 2],
        [x - rx + 0.8, y + (style === 'bob' ? 4.5 : 8)],
        [x - rx - 1.5, y + (style === 'bob' ? 4 : 8.5)],
      ],
      P.hair,
      { shade: 'cyl', edge: true, bias: -0.2 },
    );
  }
  if (style === 'twin') {
    for (const s of [-1, 1]) buf.capsule(x + s * (rx + 2), y - 3, x + s * (rx + 3.5), y + 9, 2.2, 1.2, P.hair, { edge: true });
  }
  if (style === 'braid') {
    for (let i = 0; i < 5; i++) buf.ellipse(x + rx + 0.5 - i * 0.2, y + 3 + i * 2.6, 1.6, 1.5, P.hair, { edge: true });
  }
}

function drawBackHair(buf: PixelBuf, spec: UnitModelSpec, P: Palette, c: Pt, pose: Pose, view: View) {
  const [x, y] = c;
  const style = spec.hairStyle;
  const sway = -pose.lean * 0.4;
  if (style === 'long') {
    buf.poly(
      [
        [x - 6.5, y - 2],
        [x + 6, y - 2],
        [x + 6.5 + sway, y + 17],
        [x + 2 + sway, y + 19],
        [x - 3 + sway, y + 18],
        [x - 7.5 + sway, y + 16],
      ],
      P.hair,
      { shade: 'cyl', edge: true },
    );
  } else if (style === 'ponytail') {
    const bx = view === 'front' ? x - 6.5 : x - 1;
    buf.capsule(bx, y - 3, bx - 3 + sway, y + 10, 2.4, 1.2, P.hair, { edge: true });
  } else if (style === 'braid' && view === 'back') {
    for (let i = 0; i < 6; i++) buf.ellipse(x - 0.5 + sway * (i / 6), y + 5 + i * 2.5, 1.6, 1.5, P.hair, { edge: true });
  }
}

function drawHelmet(buf: PixelBuf, spec: UnitModelSpec, P: Palette, x: number, y: number, view: View, rx: number, ry: number) {
  const h = spec.helmet ?? 'none';
  const front = view === 'front';
  switch (h) {
    case 'open':
    case 'horned': {
      buf.poly(
        [
          [x - rx - 1.2, y - 1],
          [x - rx, y - ry],
          [x, y - ry - 1.8],
          [x + rx, y - ry],
          [x + rx + 1.4, y - 1],
        ],
        P.metal,
        { shade: 'dome', edge: true },
      );
      buf.line(x - rx - 1, y - 1, x + rx + 1, y - 1, darken(P.metal[1], 0.85));
      if (front) buf.line(x + 1.5, y - 1, x + 1.5, y + 2.5, P.metal[1]);
      if (h === 'horned') {
        buf.capsule(x - rx, y - ry + 1, x - rx - 4, y - ry - 5, 1.6, 0.6, ramp('#e8dcc0'), { edge: true });
        buf.capsule(x + rx, y - ry + 1, x + rx + 4, y - ry - 5, 1.6, 0.6, ramp('#e8dcc0'), { edge: true });
      }
      break;
    }
    case 'circlet':
      buf.line(x - rx, y - 3.5, x + rx + 1, y - 4, P.gold[2]);
      if (front) buf.set(x + 1.5, y - 4, hex(spec.secondary));
      break;
    case 'mitre':
      buf.poly(
        [
          [x - 4.5, y - ry + 1],
          [x + 5.5, y - ry + 1],
          [x + 3, y - ry - 8],
          [x + 0.5, y - ry - 10],
          [x - 2, y - ry - 8],
        ],
        ramp('#f2eee4'),
        { shade: 'cyl', edge: true },
      );
      buf.line(x + 0.5, y - ry - 9, x + 0.5, y - ry + 1, P.gold[2]);
      break;
    case 'wizard':
      buf.ellipse(x + 0.5, y - ry + 2, rx + 4, 2, P.prim, { edge: true });
      buf.poly(
        [
          [x - 4.5, y - ry + 1.5],
          [x + 5.5, y - ry + 1.5],
          [x + 2, y - ry - 7],
          [x - 4, y - ry - 11],
          [x - 1.5, y - ry - 6],
        ],
        P.prim,
        { shade: 'cyl', edge: true },
      );
      buf.line(x - 4, y - ry + 0.5, x + 5, y - ry + 0.5, P.sec[2]);
      break;
    case 'crown':
      buf.poly(
        [
          [x - 4.5, y - ry + 1.5],
          [x + 5.5, y - ry + 1.5],
          [x + 5.5, y - ry - 3],
          [x + 3.5, y - ry - 1],
          [x + 0.5, y - ry - 4],
          [x - 2.5, y - ry - 1],
          [x - 4.5, y - ry - 3],
        ],
        P.gold,
        { shade: 'cyl', edge: true },
      );
      if (front) buf.set(x + 0.5, y - ry - 0.5, rgba(255, 60, 80));
      break;
    default:
      break;
  }
}

/* ================================================================== */
/* 武器与盾                                                            */
/* ================================================================== */

function drawWeaponAt(buf: PixelBuf, type: WeaponModel, hand: Pt, angle: number, P: Palette, spec: UnitModelSpec) {
  const dir: Pt = [Math.sin(angle), -Math.cos(angle)];
  const perp: Pt = [-dir[1], dir[0]];
  const at = (t: number, s = 0): Pt => [hand[0] + dir[0] * t + perp[0] * s, hand[1] + dir[1] * t + perp[1] * s];
  const blade = ramp('#d8dee8', { contrast: 1.3 });
  switch (type) {
    case 'sword':
    case 'greatsword': {
      const big = type === 'greatsword';
      const L = big ? 19 : 14;
      const W = big ? 2.2 : 1.4;
      buf.capsule(...at(-3), ...at(0.5), 0.8, 0.8, P.leather);
      buf.capsule(...at(1, -3), ...at(1, 3), 0.8, 0.8, P.gold, { edge: true });
      buf.poly([at(1.5, -W), at(1.5, W), at(L - 2, W), at(L), at(L - 2, -W)], spec.glow && big ? ramp('#3a3440') : blade, { shade: 'cyl', edge: true });
      buf.line(...at(2, 0), ...at(L - 3, 0), spec.glow && big ? hex(spec.glow) : blade[3]);
      break;
    }
    case 'dagger':
      buf.capsule(...at(-2), ...at(0.5), 0.8, 0.8, P.leather);
      buf.poly([at(1, -1), at(1, 1), at(6, 0.6), at(8), at(6, -0.6)], blade, { shade: 'cyl', edge: true });
      break;
    case 'lance':
      buf.capsule(...at(-9), ...at(19), 0.8, 0.8, P.wood, { edge: true });
      buf.poly([at(18, -1.6), at(18, 1.6), at(25)], blade, { shade: 'cyl', edge: true });
      buf.poly([at(14, 0), at(17, 0), at(16, 4.5)], P.sec, { shade: 'flat', flat: 2 });
      break;
    case 'axe':
      buf.capsule(...at(-3), ...at(13), 0.9, 0.9, P.wood, { edge: true });
      buf.poly([at(9, 0), at(8, 5.5), at(11, 7), at(14, 5.5), at(13, 0)], blade, { shade: 'cyl', edge: true });
      break;
    case 'staff':
      buf.capsule(...at(-6), ...at(16), 0.8, 0.9, P.wood, { edge: true });
      buf.ellipse(...at(18), 2.6, 2.6, P.gold, { edge: true });
      buf.ellipse(...at(18), 1.5, 1.5, P.glow, { bias: 0.4 });
      break;
    case 'bow': {
      const pts: Pt[] = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8 - 0.5;
        pts.push([hand[0] + 3 - Math.abs(t) * 0 + Math.cos(t * 2.2) * 3 - 3 + 0, hand[1] + t * 18]);
      }
      for (let i = 0; i < pts.length - 1; i++) buf.capsule(pts[i][0] + 2.5, pts[i][1], pts[i + 1][0] + 2.5, pts[i + 1][1], 0.9, 0.9, P.wood);
      buf.line(hand[0] + 0.5, hand[1] - 9, hand[0] + 0.5, hand[1] + 9, rgba(230, 230, 220));
      break;
    }
    default:
      break;
  }
}

function drawShield(buf: PixelBuf, type: 'round' | 'kite' | 'tower', hand: Pt, P: Palette, front: boolean) {
  const [x, y] = [hand[0] + (front ? 2.5 : -1.5), hand[1] - 3];
  if (type === 'round') {
    buf.ellipse(x, y, 4.6, 5, P.prim, { edge: true });
    buf.ellipse(x, y, 4.6, 5, P.metal, { edge: false, clipToExisting: true, bias: -2 });
    buf.ellipse(x, y, 3.4, 3.8, P.prim, {});
    buf.ellipse(x + 0.4, y - 0.2, 1.2, 1.2, P.metal, { edge: true });
  } else if (type === 'kite') {
    buf.poly(
      [
        [x - 4.5, y - 5],
        [x + 4.5, y - 5],
        [x + 4, y + 2],
        [x, y + 8],
        [x - 4, y + 2],
      ],
      P.prim,
      { shade: 'dome', edge: true },
    );
    buf.line(x, y - 4, x, y + 6, P.sec[3]);
    buf.line(x - 3, y - 1, x + 3, y - 1, P.sec[3]);
  } else {
    buf.poly(
      [
        [x - 5, y - 7],
        [x + 5, y - 7],
        [x + 5, y + 8],
        [x - 5, y + 8],
      ],
      P.metal,
      { shade: 'cyl', edge: true },
    );
    buf.poly(
      [
        [x - 1, y - 5],
        [x + 1, y - 5],
        [x + 1, y + 6],
        [x - 1, y + 6],
      ],
      P.sec,
      { shade: 'flat', flat: 2 },
    );
  }
}
