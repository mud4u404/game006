/**
 * 人形单位的部件几何体（全部程序化构建，带顶点色）
 * 两种比例：sd（地图上的大头 Q 版）与 real（战斗特写的写实比例）。
 */
import * as THREE from 'three';
import { jitter, paint, xf } from '../battlefield/geom';
import type { HairModel, HelmetModel, UnitModelSpec, WeaponModel } from '../contracts';

export interface Proportions {
  headR: number;
  headY: number;
  torsoY: number; // 躯干底部
  torsoH: number;
  torsoW: number;
  torsoD: number;
  hipY: number;
  legLen: number;
  legR: number;
  armLen: number;
  armR: number;
  shoulderX: number;
  shoulderY: number;
  handR: number;
  weapon: number; // 武器缩放
  eye: number; // 眼睛大小
}

export const SD: Proportions = {
  headR: 0.235,
  headY: 0.64,
  torsoY: 0.17,
  torsoH: 0.24,
  torsoW: 0.26,
  torsoD: 0.19,
  hipY: 0.2,
  legLen: 0.2,
  legR: 0.052,
  armLen: 0.2,
  armR: 0.046,
  shoulderX: 0.155,
  shoulderY: 0.37,
  handR: 0.048,
  weapon: 0.78,
  eye: 1,
};

export const REAL: Proportions = {
  headR: 0.118,
  headY: 1.6,
  torsoY: 0.92,
  torsoH: 0.56,
  torsoW: 0.34,
  torsoD: 0.21,
  hipY: 0.95,
  legLen: 0.93,
  legR: 0.068,
  armLen: 0.66,
  armR: 0.052,
  shoulderX: 0.21,
  shoulderY: 1.42,
  handR: 0.05,
  weapon: 1.2,
  eye: 0.5,
};

export type Geo = THREE.BufferGeometry;
const C = (c: THREE.ColorRepresentation) => new THREE.Color(c);
const darker = (c: THREE.ColorRepresentation, k: number) => C(c).multiplyScalar(k);

/* ================================================================== */
/* 头部                                                                */
/* ================================================================== */

export function buildHead(spec: UnitModelSpec, P: Proportions): { solid: Geo[]; glow: Geo[]; face: Geo[] } {
  const r = P.headR;
  const skin = spec.skin ?? '#f2d3b4';
  const hair = spec.hair ?? '#5a3a24';
  const solid: Geo[] = [];
  const glow: Geo[] = [];
  const face: Geo[] = [];
  const sd = P === SD;
  // 头颅（中心在原点，外部再平移到 headY）
  solid.push(paint(xf(new THREE.SphereGeometry(r, 28, 20), 0, 0, 0, 0, 1, 0.97, 0.95), skin));
  // 耳朵
  for (const s of [-1, 1]) solid.push(paint(xf(new THREE.SphereGeometry(r * 0.14, 10, 8), s * r * 0.93, -r * 0.08, 0, 0, 0.6, 1, 0.9), skin));
  if (!sd) {
    // 写实比例：脖子、鼻子、下颌
    solid.push(paint(xf(new THREE.CylinderGeometry(r * 0.38, r * 0.45, r * 0.7, 12), 0, -r * 1.05, -r * 0.05), darker(skin, 0.92)));
    solid.push(paint(xf(new THREE.ConeGeometry(r * 0.09, r * 0.25, 6), 0, -r * 0.15, r * 0.93, 0, 1, 1, 1, Math.PI / 2 - 0.3), darker(skin, 0.96)));
  }
  const fullFace = spec.helmet === 'full';
  if (!fullFace) {
    // 眼睛：深色椭圆 + 高光
    const iris = C(spec.eyes ?? '#3a2a22').lerp(C('#140c10'), 0.45);
    const ex = r * (sd ? 0.36 : 0.34);
    const ey = -r * (sd ? 0.06 : 0.02);
    const es = r * 0.15 * P.eye * (sd ? 1 : 1.3);
    // 眼睛贴着脸的曲面
    const ez = (x: number) => Math.sqrt(Math.max(0, r * r * 0.9 - x * x - ey * ey)) * 0.98;
    for (const s of [-1, 1]) {
      const z = ez(ex);
      const yaw = s * Math.asin(Math.min(0.9, ex / r)) * 0.9;
      face.push(paint(xf(new THREE.SphereGeometry(es, 14, 12), s * ex, ey, z, yaw, 0.8, 1.35, 0.32), iris));
      face.push(paint(xf(new THREE.SphereGeometry(es * 0.34, 8, 6), s * ex - es * 0.22, ey + es * 0.45, z + es * 0.12), '#ffffff'));
      face.push(paint(xf(new THREE.SphereGeometry(es * 0.16, 6, 4), s * ex + es * 0.2, ey - es * 0.5, z + es * 0.1), C(spec.eyes ?? '#a08060').lerp(C('#ffffff'), 0.3)));
      // 眉毛
      face.push(paint(xf(new THREE.BoxGeometry(es * 1.4, es * 0.24, es * 0.2), s * ex, ey + es * 1.9, z - es * 0.1, yaw, 1, 1, 1, 0, -s * 0.12), darker(hair, 0.65)));
    }
    // 嘴
    face.push(paint(xf(new THREE.BoxGeometry(r * 0.12, r * 0.03, r * 0.04), 0, -r * 0.5, r * 0.84), '#8a3a32'));
    // 腮红
    if (spec.gender === 'f') for (const s of [-1, 1]) face.push(paint(xf(new THREE.CircleGeometry(r * 0.1, 12), s * r * 0.5, -r * 0.32, r * 0.82, s * 0.55), '#f2a8a0'));
  }
  if (spec.beard) {
    solid.push(paint(xf(new THREE.SphereGeometry(r * 0.62, 16, 12), 0, -r * 0.55, r * 0.42, 0, 1, 0.7, 0.7), hair));
    solid.push(paint(xf(new THREE.CapsuleGeometry(r * 0.07, r * 0.3, 4, 8), 0, -r * 0.33, r * 0.9, 0, 1, 1, 1, 0, Math.PI / 2), darker(hair, 0.9)));
  }
  // 头发
  if (!fullFace) solid.push(...buildHair(spec.hairStyle ?? 'short', hair, r, spec));
  // 头盔
  const h = buildHelmet(spec.helmet ?? 'none', r, spec);
  solid.push(...h.solid);
  glow.push(...h.glow);
  return { solid, glow, face };
}

function bangs(r: number, color: THREE.ColorRepresentation, count: number, spread: number, len: number, spiky = false): Geo[] {
  const out: Geo[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1) - 0.5;
    const a = t * spread;
    const g = new THREE.ConeGeometry(r * 0.2, r * len * (1 - Math.abs(t) * 0.35), 6);
    xf(g, 0, 0, 0, 0, 1, 1, 0.55, Math.PI); // 尖朝下
    xf(g, 0, 0, 0, 0, 1, 1, 1, spiky ? -0.5 : -0.35, -t * 0.6); // 外翻
    xf(g, Math.sin(a) * r * 0.9, r * 0.5, Math.cos(a) * r * 0.86);
    out.push(paint(g, color));
  }
  return out;
}

export function buildHair(style: HairModel, color: THREE.ColorRepresentation, r: number, spec: UnitModelSpec): Geo[] {
  if (style === 'bald') return [];
  const out: Geo[] = [];
  const hood = spec.helmet === 'hood' || spec.helmet === 'veil';
  // 发顶
  out.push(paint(xf(new THREE.SphereGeometry(r * 1.07, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), 0, r * 0.03, -r * 0.05, 0, 1, 1, 1, -0.42), color));
  // 后脑
  out.push(paint(xf(new THREE.SphereGeometry(r * 1.06, 20, 14, Math.PI, Math.PI, 0, Math.PI * 0.82), 0, 0, -r * 0.02), color));
  if (style !== 'slick') out.push(...bangs(r, color, style === 'spiky' ? 5 : 6, 1.9, style === 'spiky' ? 0.5 : 0.42, style === 'spiky'));
  else out.push(paint(xf(new THREE.SphereGeometry(r * 0.5, 12, 8), 0, r * 0.6, r * 0.45, 0, 1.4, 0.5, 0.9), color));
  if (hood) return out;
  switch (style) {
    case 'spiky':
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 1.6 - Math.PI * 0.8 + Math.PI;
        const g = new THREE.ConeGeometry(r * 0.22, r * 0.75, 6);
        xf(g, 0, r * 0.3, 0);
        xf(g, 0, 0, 0, 0, 1, 1, 1, -0.9 + (i % 2) * 0.2, 0);
        xf(g, 0, 0, 0, a);
        xf(g, Math.sin(a) * r * 0.5, r * 0.55, Math.cos(a) * r * 0.5);
        out.push(paint(g, color));
      }
      break;
    case 'long':
    case 'ponytail':
    case 'braid':
    case 'twin':
    case 'bob':
    case 'short':
    default:
      break;
  }
  if (style === 'long') {
    out.push(paint(xf(new THREE.CapsuleGeometry(r * 0.75, r * 1.5, 6, 14), 0, -r * 0.9, -r * 0.42, 0, 1.05, 1, 0.55), color));
    for (const s of [-1, 1]) out.push(paint(xf(new THREE.CapsuleGeometry(r * 0.16, r * 0.9, 4, 8), s * r * 0.82, -r * 0.55, r * 0.25), color));
  }
  if (style === 'ponytail') {
    out.push(paint(xf(new THREE.SphereGeometry(r * 0.2, 10, 8), 0, r * 0.5, -r * 0.95), darker(color, 0.8)));
    out.push(paint(xf(new THREE.CapsuleGeometry(r * 0.2, r * 1.1, 4, 10), 0, -r * 0.05, -r * 1.25, 0, 1, 1, 1, 0.45), color));
  }
  if (style === 'braid') {
    for (let i = 0; i < 6; i++) out.push(paint(xf(new THREE.SphereGeometry(r * (0.2 - i * 0.012), 10, 8), r * 0.55, -r * (0.4 + i * 0.3), -r * 0.35 + i * r * 0.05), color));
  }
  if (style === 'twin') {
    for (const s of [-1, 1]) {
      out.push(paint(xf(new THREE.SphereGeometry(r * 0.16, 10, 8), s * r * 0.9, r * 0.45, -r * 0.2), darker(color, 0.8)));
      out.push(paint(xf(new THREE.CapsuleGeometry(r * 0.18, r * 1.0, 4, 10), s * r * 1.15, -r * 0.2, -r * 0.25, 0, 1, 1, 1, 0, s * -0.3), color));
    }
  }
  if (style === 'bob') {
    for (const s of [-1, 1]) out.push(paint(xf(new THREE.SphereGeometry(r * 0.48, 14, 10), s * r * 0.72, -r * 0.35, -r * 0.05, 0, 0.7, 1.1, 1), color));
  }
  return out;
}

export function buildHelmet(type: HelmetModel, r: number, spec: UnitModelSpec): { solid: Geo[]; glow: Geo[] } {
  const metal = spec.metal ?? '#c7ccd6';
  const prim = spec.primary;
  const sec = spec.secondary;
  const solid: Geo[] = [];
  const glow: Geo[] = [];
  const dome = (col: THREE.ColorRepresentation, k = 1.13, cut = 0.55) => paint(xf(new THREE.SphereGeometry(r * k, 24, 14, 0, Math.PI * 2, 0, Math.PI * cut), 0, r * 0.02, 0), col);
  switch (type) {
    case 'open':
      solid.push(dome(metal));
      solid.push(paint(xf(new THREE.TorusGeometry(r * 1.1, r * 0.06, 6, 28), 0, r * 0.18, 0, 0, 1, 1, 1, Math.PI / 2), darker(metal, 0.8)));
      solid.push(paint(xf(new THREE.BoxGeometry(r * 0.1, r * 0.45, r * 0.08), 0, r * 0.05, r * 1.08), darker(metal, 0.9)));
      for (const s of [-1, 1]) solid.push(paint(xf(new THREE.BoxGeometry(r * 0.12, r * 0.55, r * 0.5), s * r * 1.0, -r * 0.2, r * 0.25), metal));
      break;
    case 'full': {
      solid.push(paint(xf(new THREE.SphereGeometry(r * 1.12, 24, 18), 0, 0, 0, 0, 1, 1.02, 1), metal));
      solid.push(paint(xf(new THREE.BoxGeometry(r * 1.3, r * 0.12, r * 0.2), 0, r * 0.05, r * 1.0), '#141414'));
      solid.push(paint(xf(new THREE.BoxGeometry(r * 0.09, r * 0.7, r * 0.12), 0, -r * 0.35, r * 1.06), darker(metal, 0.85)));
      // 盔缨
      solid.push(paint(xf(new THREE.CapsuleGeometry(r * 0.12, r * 0.9, 4, 8), 0, r * 1.05, -r * 0.15, 0, 1, 1, 1, Math.PI / 2 - 0.2), sec));
      break;
    }
    case 'horned':
      solid.push(dome(metal, 1.14, 0.6));
      solid.push(paint(xf(new THREE.BoxGeometry(r * 1.2, r * 0.1, r * 0.2), 0, r * 0.12, r * 0.98), '#141414'));
      for (const s of [-1, 1]) {
        const g = new THREE.ConeGeometry(r * 0.16, r * 0.95, 8);
        xf(g, 0, r * 0.45, 0);
        xf(g, 0, 0, 0, 0, 1, 1, 1, -0.3, -s * 0.9);
        xf(g, s * r * 0.9, r * 0.45, 0);
        solid.push(paint(g, '#e8dcc0'));
      }
      break;
    case 'circlet':
      solid.push(paint(xf(new THREE.TorusGeometry(r * 1.03, r * 0.045, 6, 32), 0, r * 0.32, 0.0, 0, 1, 1, 1, Math.PI / 2 + 0.12), '#e0b040'));
      glow.push(paint(xf(new THREE.OctahedronGeometry(r * 0.09), 0, r * 0.45, r * 1.0), sec));
      break;
    case 'hood':
    case 'veil': {
      const col = type === 'veil' ? (spec.secondary ?? '#ffffff') : prim;
      const inner = type === 'veil' ? '#f4f2ec' : darker(prim, 0.6);
      // 兜帽：覆盖头顶、两侧与后方，留出面部
      const g = new THREE.SphereGeometry(r * 1.16, 24, 16, Math.PI * 0.78, Math.PI * 1.44, 0, Math.PI * 0.62);
      xf(g, 0, r * 0.1, -r * 0.08, 0, 1, 1, 1, -0.25);
      solid.push(paint(g, col));
      solid.push(paint(xf(new THREE.SphereGeometry(r * 1.1, 24, 16, Math.PI * 0.78, Math.PI * 1.44, 0, Math.PI * 0.62), 0, r * 0.09, -r * 0.06, 0, 1, 1, 1, -0.25), inner));
      // 兜帽前沿的翻边
      solid.push(paint(xf(new THREE.TorusGeometry(r * 1.05, r * 0.07, 6, 20, Math.PI), 0, r * 0.05, r * 0.3, 0, 1, 1.1, 1, -0.5), darker(col, 0.85)));
      // 披下的布
      solid.push(paint(xf(new THREE.CylinderGeometry(r * 0.9, r * 1.25, r * 0.9, 16, 1, true, Math.PI * 0.3, Math.PI * 1.4), 0, -r * 0.8, -r * 0.1), col));
      if (type === 'veil') solid.push(paint(xf(new THREE.TorusGeometry(r * 1.08, r * 0.05, 6, 28), 0, r * 0.3, 0, 0, 1, 1, 1, Math.PI / 2 + 0.15), sec));
      break;
    }
    case 'mitre': {
      const g = new THREE.CylinderGeometry(r * 0.35, r * 0.85, r * 1.3, 4, 1);
      xf(g, 0, r * 1.05, -r * 0.05, Math.PI / 4, 1, 1, 0.6);
      solid.push(paint(g, '#f2eee4'));
      solid.push(paint(xf(new THREE.BoxGeometry(r * 0.1, r * 1.2, r * 0.05), 0, r * 1.05, r * 0.32), '#d8a840'));
      solid.push(paint(xf(new THREE.TorusGeometry(r * 0.88, r * 0.06, 6, 24), 0, r * 0.42, -r * 0.05, 0, 1, 1, 0.65, Math.PI / 2), '#d8a840'));
      break;
    }
    case 'wizard': {
      solid.push(paint(xf(new THREE.CylinderGeometry(r * 1.45, r * 1.45, r * 0.07, 28), 0, r * 0.5, -r * 0.08, 0, 1, 1, 1, -0.28), prim));
      const cone = new THREE.ConeGeometry(r * 0.98, r * 1.9, 20, 4);
      // 帽尖向后弯曲
      const pos = cone.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i) + r * 0.95;
        const t = Math.max(0, y / (r * 1.9));
        pos.setZ(i, pos.getZ(i) - t * t * r * 0.9);
      }
      cone.computeVertexNormals();
      xf(cone, 0, r * 1.38, -r * 0.2, 0, 1, 1, 1, -0.28);
      solid.push(paint(cone, prim));
      solid.push(paint(xf(new THREE.TorusGeometry(r * 0.99, r * 0.08, 6, 24), 0, r * 0.6, -r * 0.1, 0, 1, 1, 1, Math.PI / 2 - 0.28), sec));
      break;
    }
    case 'crown': {
      solid.push(paint(xf(new THREE.CylinderGeometry(r * 0.95, r * 0.9, r * 0.28, 24, 1, true), 0, r * 0.62, 0), '#e8b840'));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        solid.push(paint(xf(new THREE.ConeGeometry(r * 0.12, r * 0.32, 4), Math.sin(a) * r * 0.93, r * 0.9, Math.cos(a) * r * 0.93), '#e8b840'));
      }
      glow.push(paint(xf(new THREE.OctahedronGeometry(r * 0.1), 0, r * 0.65, r * 0.95), '#ff3a4a'));
      break;
    }
    default:
      break;
  }
  return { solid, glow };
}

/* ================================================================== */
/* 躯干                                                                */
/* ================================================================== */

export function buildTorso(spec: UnitModelSpec, P: Proportions, robe: boolean, armored: boolean): { solid: Geo[]; glow: Geo[] } {
  const prim = spec.primary;
  const sec = spec.secondary;
  const metal = spec.metal ?? '#c7ccd6';
  const heavy = spec.build === 'heavy';
  const slim = spec.build === 'slim';
  const w = P.torsoW * (heavy ? 1.18 : slim ? 0.9 : 1);
  const h = P.torsoH;
  const d = P.torsoD * (heavy ? 1.12 : 1);
  const y0 = P.torsoY;
  const solid: Geo[] = [];
  const glow: Geo[] = [];
  // 身体（略呈倒梯形）
  const body = new THREE.CylinderGeometry(w * 0.5, w * 0.42, h, 16, 2);
  xf(body, 0, y0 + h / 2, 0, 0, 1, 1, d / w);
  solid.push(paint(body, prim, 0, 0.18, y0 + h));
  // 衣服下摆
  if (!robe) {
    const skirt = new THREE.CylinderGeometry(w * 0.44, w * 0.56, h * 0.42, 16, 1, true);
    xf(skirt, 0, y0 - h * 0.05, 0, 0, 1, 1, d / w);
    solid.push(paint(skirt, darker(prim, 0.85)));
  } else {
    // 长袍：一直到地面
    const robeG = new THREE.CylinderGeometry(w * 0.45, w * 0.8, y0 + h * 0.2, 18, 2, false);
    xf(robeG, 0, (y0 + h * 0.2) / 2, 0, 0, 1, 1, (d / w) * 1.05);
    solid.push(paint(robeG, prim, 0, 0.25, y0));
    solid.push(paint(xf(new THREE.CylinderGeometry(w * 0.81, w * 0.82, 0.03 * (P === SD ? 1 : 2), 18), 0, 0.02, 0, 0, 1, 1, (d / w) * 1.05), sec));
    solid.push(paint(xf(new THREE.BoxGeometry(w * 0.16, y0 + h * 0.5, 0.01), 0, (y0 + h * 0.5) / 2, d * 0.5), sec));
  }
  // 腰带
  solid.push(paint(xf(new THREE.CylinderGeometry(w * 0.46, w * 0.46, h * 0.12, 16), 0, y0 + h * 0.1, 0, 0, 1, 1, d / w), '#4a3426'));
  solid.push(paint(xf(new THREE.BoxGeometry(w * 0.14, h * 0.12, 0.02), 0, y0 + h * 0.1, d * 0.47), '#e0b040'));
  if (armored) {
    // 胸甲
    const chest = new THREE.SphereGeometry(w * 0.48, 16, 12, -Math.PI * 0.45, Math.PI * 0.9, Math.PI * 0.15, Math.PI * 0.55);
    xf(chest, 0, y0 + h * 0.62, d * 0.02, Math.PI / 2, 1, h / w * 1.1, d / w * 1.2);
    solid.push(paint(chest, metal));
    // 肩甲
    for (const s of [-1, 1]) {
      const pr = w * (heavy ? 0.3 : 0.24);
      solid.push(paint(xf(new THREE.SphereGeometry(pr, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), s * P.shoulderX * 1.02, P.shoulderY + pr * 0.15, 0, 0, 1.1, 0.9, 1), metal));
      solid.push(paint(xf(new THREE.TorusGeometry(pr * 0.95, pr * 0.1, 6, 16), s * P.shoulderX * 1.02, P.shoulderY + pr * 0.12, 0, 0, 1, 1, 1, Math.PI / 2), sec));
    }
  } else {
    // 布衣领口
    solid.push(paint(xf(new THREE.TorusGeometry(w * 0.3, w * 0.06, 6, 18), 0, y0 + h * 0.98, 0, 0, 1, 1, 1, Math.PI / 2), sec));
  }
  // 围巾 / 披肩（主角、骑士）
  if (spec.cape) {
    solid.push(paint(xf(new THREE.TorusGeometry(w * 0.32, w * 0.09, 8, 18), 0, y0 + h * 0.98, 0, 0, 1, 1, 1, Math.PI / 2), sec));
  }
  return { solid, glow };
}

/* ================================================================== */
/* 四肢                                                                */
/* ================================================================== */

/** 手臂：以肩为原点向下 */
export function buildArm(spec: UnitModelSpec, P: Proportions, armored: boolean): Geo[] {
  const L = P.armLen;
  const r = P.armR * (spec.build === 'heavy' ? 1.2 : 1);
  const sleeve = armored ? spec.metal ?? '#c7ccd6' : spec.primary;
  const out: Geo[] = [];
  out.push(paint(xf(new THREE.CapsuleGeometry(r, L * 0.55, 4, 10), 0, -L * 0.35, 0), sleeve));
  // 护腕/手套
  out.push(paint(xf(new THREE.CylinderGeometry(r * 1.15, r * 1.1, L * 0.22, 10), 0, -L * 0.72, 0), armored ? darker(sleeve, 0.85) : '#6a4a32'));
  out.push(paint(xf(new THREE.SphereGeometry(P.handR, 10, 8), 0, -L * 0.92, 0), armored ? '#8a8e96' : spec.skin ?? '#f2d3b4'));
  return out;
}

/** 腿：以髋为原点向下 */
export function buildLeg(spec: UnitModelSpec, P: Proportions, armored: boolean): Geo[] {
  const L = P.legLen;
  const r = P.legR * (spec.build === 'heavy' ? 1.2 : 1);
  const out: Geo[] = [];
  const pants = armored ? darker(spec.metal ?? '#c7ccd6', 0.85) : darker(spec.secondary, 0.55);
  out.push(paint(xf(new THREE.CapsuleGeometry(r, L * 0.5, 4, 10), 0, -L * 0.4, 0), pants));
  const boot = armored ? spec.metal ?? '#c7ccd6' : '#5a3a26';
  out.push(paint(xf(new THREE.CapsuleGeometry(r * 1.15, L * 0.25, 4, 10), 0, -L * 0.78, r * 0.25, 0, 1, 1, 1.15), boot));
  return out;
}

/** 披风：以后颈为原点向下 */
export function buildCape(spec: UnitModelSpec, P: Proportions): Geo[] {
  const len = P.shoulderY - 0.04 * (P === SD ? 1 : 2);
  const w = P.torsoW * 1.25;
  const out: Geo[] = [];
  const mk = (col: THREE.ColorRepresentation, off: number) => {
    const g = new THREE.PlaneGeometry(w, len, 6, 8);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const t = (len / 2 - y) / len; // 0 顶部 → 1 底部
      // 弧形包裹身体，下摆外扩
      const spread = 1 + t * 0.45;
      pos.setX(i, x * spread);
      pos.setZ(i, -Math.cos((x / w) * Math.PI) * w * 0.25 - t * P.torsoD * 0.6 + off);
      pos.setY(i, y - len / 2);
    }
    g.computeVertexNormals();
    return paint(g, col);
  };
  const outer = mk(spec.primary, 0);
  const inner = mk(spec.secondary, 0.006);
  // 内层翻转法线
  const n = inner.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  out.push(outer, inner);
  return out;
}

/* ================================================================== */
/* 武器与盾                                                            */
/* ================================================================== */

/** 武器：握把在原点，刃朝 +Y */
export function buildWeapon(type: WeaponModel, spec: UnitModelSpec, P: Proportions): { solid: Geo[]; glow: Geo[] } {
  const s = P.weapon;
  const metal = '#dfe3ea';
  const gold = '#d8a840';
  const wood = '#7a5232';
  const solid: Geo[] = [];
  const glow: Geo[] = [];
  const blade = (len: number, wid: number) => {
    const shape = new THREE.Shape();
    shape.moveTo(-wid / 2, 0);
    shape.lineTo(wid / 2, 0);
    shape.lineTo(wid / 2, len * 0.86);
    shape.lineTo(0, len);
    shape.lineTo(-wid / 2, len * 0.86);
    shape.lineTo(-wid / 2, 0);
    const g = new THREE.ExtrudeGeometry(shape, { depth: wid * 0.18, bevelEnabled: true, bevelThickness: wid * 0.08, bevelSize: wid * 0.08, bevelSegments: 1 });
    g.translate(0, 0, -wid * 0.09);
    return g;
  };
  switch (type) {
    case 'sword':
    case 'greatsword': {
      const big = type === 'greatsword';
      const L = (big ? 0.62 : 0.42) * s;
      const W = (big ? 0.085 : 0.05) * s;
      solid.push(paint(xf(new THREE.CylinderGeometry(0.012 * s, 0.012 * s, 0.11 * s, 6), 0, 0, 0), '#4a3020'));
      solid.push(paint(xf(new THREE.SphereGeometry(0.02 * s, 8, 6), 0, -0.06 * s, 0), gold));
      solid.push(paint(xf(new THREE.BoxGeometry((big ? 0.17 : 0.13) * s, 0.022 * s, 0.03 * s), 0, 0.06 * s, 0), gold));
      solid.push(paint(xf(blade(L, W), 0, 0.07 * s, 0), spec.glow && big ? '#3a3a44' : metal));
      if (spec.glow && big) glow.push(paint(xf(new THREE.BoxGeometry(W * 0.2, L * 0.8, W * 0.3), 0, 0.07 * s + L * 0.45, 0), spec.glow));
      break;
    }
    case 'dagger': {
      solid.push(paint(xf(new THREE.CylinderGeometry(0.011 * s, 0.011 * s, 0.07 * s, 6), 0, 0, 0), '#3a2a20'));
      solid.push(paint(xf(new THREE.BoxGeometry(0.07 * s, 0.016 * s, 0.022 * s), 0, 0.04 * s, 0), gold));
      solid.push(paint(xf(blade(0.17 * s, 0.035 * s), 0, 0.045 * s, 0), metal));
      break;
    }
    case 'lance': {
      solid.push(paint(xf(new THREE.CylinderGeometry(0.014 * s, 0.016 * s, 1.0 * s, 8), 0, 0.25 * s, 0), wood));
      solid.push(paint(xf(new THREE.ConeGeometry(0.032 * s, 0.17 * s, 6), 0, 0.83 * s, 0), metal));
      solid.push(paint(xf(new THREE.SphereGeometry(0.024 * s, 8, 6), 0, 0.74 * s, 0), gold));
      // 小旗
      const flag = new THREE.BufferGeometry();
      flag.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0.72 * s, 0, 0, 0.6 * s, 0, 0.16 * s, 0.66 * s, 0.0]), 3));
      flag.computeVertexNormals();
      solid.push(paint(flag, spec.secondary));
      const flagB = flag.clone();
      const n = flagB.attributes.normal;
      for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
      const p = flagB.attributes.position;
      p.setXYZ(0, 0, 0.6 * s, 0);
      p.setXYZ(1, 0, 0.72 * s, 0);
      solid.push(paint(flagB, spec.secondary));
      break;
    }
    case 'axe': {
      solid.push(paint(xf(new THREE.CylinderGeometry(0.015 * s, 0.017 * s, 0.62 * s, 8), 0, 0.2 * s, 0), wood));
      const shape = new THREE.Shape();
      shape.moveTo(0, -0.07 * s);
      shape.quadraticCurveTo(0.2 * s, -0.12 * s, 0.17 * s, 0);
      shape.quadraticCurveTo(0.2 * s, 0.12 * s, 0, 0.07 * s);
      shape.lineTo(0, -0.07 * s);
      const head = new THREE.ExtrudeGeometry(shape, { depth: 0.02 * s, bevelEnabled: true, bevelThickness: 0.006 * s, bevelSize: 0.006 * s, bevelSegments: 1 });
      head.translate(0.01 * s, 0.42 * s, -0.01 * s);
      solid.push(paint(head, metal));
      solid.push(paint(xf(new THREE.ConeGeometry(0.02 * s, 0.08 * s, 5), -0.04 * s, 0.42 * s, 0, 0, 1, 1, 1, 0, Math.PI / 2), darker(metal, 0.8)));
      break;
    }
    case 'bow': {
      const arc = new THREE.TorusGeometry(0.3 * s, 0.012 * s, 6, 24, Math.PI * 0.8);
      xf(arc, 0, 0, 0, 0, 1, 1, 1, 0, Math.PI / 2 + Math.PI * 0.1);
      xf(arc, -0.22 * s, 0, 0);
      solid.push(paint(arc, '#6a4428'));
      solid.push(paint(xf(new THREE.CylinderGeometry(0.003 * s, 0.003 * s, 0.57 * s, 4), -0.13 * s, 0, 0), '#eeeeee'));
      solid.push(paint(xf(new THREE.CylinderGeometry(0.017 * s, 0.017 * s, 0.08 * s, 6), 0.075 * s, 0, 0), '#3a2418'));
      break;
    }
    case 'staff': {
      solid.push(paint(xf(new THREE.CylinderGeometry(0.014 * s, 0.018 * s, 0.85 * s, 8), 0, 0.2 * s, 0), wood));
      solid.push(paint(xf(new THREE.TorusGeometry(0.06 * s, 0.012 * s, 6, 18), 0, 0.68 * s, 0), '#d8a840'));
      glow.push(paint(xf(new THREE.IcosahedronGeometry(0.04 * s, 1), 0, 0.68 * s, 0), spec.glow ?? '#9fe0ff'));
      break;
    }
    case 'tome': {
      solid.push(paint(xf(new THREE.BoxGeometry(0.16 * s, 0.2 * s, 0.05 * s), 0, 0.04 * s, 0.03 * s, 0, 1, 1, 1, -0.4), darker(spec.primary, 0.6)));
      solid.push(paint(xf(new THREE.BoxGeometry(0.14 * s, 0.18 * s, 0.045 * s), 0.01 * s, 0.04 * s, 0.035 * s, 0, 1, 1, 1, -0.4), '#f2ead6'));
      glow.push(paint(xf(new THREE.OctahedronGeometry(0.03 * s), 0, 0.2 * s, 0.1 * s), spec.glow ?? '#ffcf6a'));
      break;
    }
    default:
      break;
  }
  return { solid, glow };
}

/** 盾：挂在左臂外侧，面朝 +Z（正面） */
export function buildShield(type: 'round' | 'kite' | 'tower', spec: UnitModelSpec, P: Proportions): Geo[] {
  const s = P === SD ? 1 : 1.9;
  const out: Geo[] = [];
  const face = spec.secondary;
  const rim = spec.metal ?? '#c7ccd6';
  if (type === 'round') {
    out.push(paint(xf(new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 0.025 * s, 20), 0, 0, 0, 0, 1, 1, 1, Math.PI / 2), spec.primary));
    out.push(paint(xf(new THREE.TorusGeometry(0.12 * s, 0.012 * s, 6, 24), 0, 0, 0.012 * s), rim));
    out.push(paint(xf(new THREE.SphereGeometry(0.035 * s, 10, 8), 0, 0, 0.016 * s, 0, 1, 1, 0.6), rim));
  } else {
    const shape = new THREE.Shape();
    const w = (type === 'tower' ? 0.17 : 0.14) * s;
    const top = (type === 'tower' ? 0.2 : 0.13) * s;
    const bot = (type === 'tower' ? -0.2 : -0.2) * s;
    shape.moveTo(-w / 2, top);
    shape.lineTo(w / 2, top);
    if (type === 'tower') {
      shape.lineTo(w / 2, bot);
      shape.lineTo(-w / 2, bot);
    } else {
      shape.quadraticCurveTo(w / 2, bot * 0.4, 0, bot);
      shape.quadraticCurveTo(-w / 2, bot * 0.4, -w / 2, top);
    }
    shape.lineTo(-w / 2, top);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.022 * s, bevelEnabled: true, bevelThickness: 0.008 * s, bevelSize: 0.008 * s, bevelSegments: 2 });
    out.push(paint(g, type === 'tower' ? rim : spec.primary));
    // 纹章：十字
    out.push(paint(xf(new THREE.BoxGeometry(w * 0.16, (top - bot) * 0.6, 0.008 * s), 0, (top + bot) / 2 + 0.01 * s, 0.032 * s), face));
    out.push(paint(xf(new THREE.BoxGeometry(w * 0.6, w * 0.16, 0.008 * s), 0, (top + bot) / 2 + 0.05 * s, 0.032 * s), face));
  }
  return out;
}

/** 箭袋（弓手背后） */
export function buildQuiver(P: Proportions): Geo[] {
  const s = P === SD ? 1 : 1.9;
  const out: Geo[] = [];
  out.push(paint(xf(new THREE.CylinderGeometry(0.035 * s, 0.03 * s, 0.2 * s, 8), 0, 0, 0), '#6a4428'));
  for (let i = 0; i < 3; i++) out.push(paint(xf(new THREE.ConeGeometry(0.012 * s, 0.05 * s, 4), (i - 1) * 0.018 * s, 0.13 * s, 0), '#f2f2f2'));
  return out;
}

export { jitter };
