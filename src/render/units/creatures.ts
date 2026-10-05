/**
 * 坐骑与魔物的程序化模型
 * 每个生物返回一组带关节（Pivot）的部件，便于在 model.ts 中统一做程序化动画。
 */
import * as THREE from 'three';
import { jitter, paint, xf } from '../battlefield/geom';
import type { Geo } from './parts';

const C = (c: THREE.ColorRepresentation) => new THREE.Color(c);
const dk = (c: THREE.ColorRepresentation, k: number) => C(c).multiplyScalar(k);

/** 一个可动部件：几何体 + 发光几何体，挂在 pivot 下 */
export interface PartSpec {
  name: string;
  /** 关节在父节点中的位置 */
  pivot: [number, number, number];
  solid: Geo[];
  glow?: Geo[];
  /** 父部件名（默认挂在身体上） */
  parent?: string;
}

export interface CreatureSpec {
  parts: PartSpec[];
  /** 骑手的鞍座位置（仅坐骑） */
  saddle?: [number, number, number];
  /** 视觉高度 */
  height: number;
  /** 腿的部件名（行走动画用） */
  legs: string[];
  wings: string[];
  tail?: string;
  neck?: string;
  /** 漂浮高度（飞行单位） */
  hover: number;
}

/** 整体缩放一个生物（几何体、关节、鞍座、高度） */
export function scaleCreature(c: CreatureSpec, k: number): CreatureSpec {
  for (const p of c.parts) {
    for (const g of [...p.solid, ...(p.glow ?? [])]) g.scale(k, k, k);
    p.pivot = [p.pivot[0] * k, p.pivot[1] * k, p.pivot[2] * k];
  }
  if (c.saddle) c.saddle = [c.saddle[0] * k, c.saddle[1] * k, c.saddle[2] * k];
  c.height *= k;
  return c;
}

/* ================================================================== */
/* 马 / 天马                                                           */
/* ================================================================== */

export function horse(coat: string, mane: string, barding: string | null, trim: string, pegasus: boolean): CreatureSpec {
  const parts: PartSpec[] = [];
  const bodyY = 0.34;
  const body: Geo[] = [];
  body.push(paint(xf(new THREE.CapsuleGeometry(0.13, 0.26, 6, 14), 0, 0, 0, 0, 1, 1, 1, Math.PI / 2), coat));
  // 胸部与臀部更饱满
  body.push(paint(xf(new THREE.SphereGeometry(0.15, 14, 10), 0, 0.01, 0.13), coat));
  body.push(paint(xf(new THREE.SphereGeometry(0.155, 14, 10), 0, 0.02, -0.14), coat));
  if (barding) {
    // 马铠（布）
    const skirt = new THREE.CylinderGeometry(0.17, 0.2, 0.17, 18, 1, true);
    xf(skirt, 0, -0.03, 0, 0, 1, 1, 1.75);
    body.push(paint(skirt, barding));
    body.push(paint(xf(new THREE.TorusGeometry(0.2, 0.012, 6, 24), 0, -0.115, 0, 0, 1, 1.75, 1, Math.PI / 2), trim));
  }
  // 鞍
  body.push(paint(xf(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 14), 0, 0.13, -0.02, 0, 1, 1, 1.25), '#5a3420'));
  parts.push({ name: 'body', pivot: [0, bodyY, 0], solid: body });
  // 颈与头
  const neck: Geo[] = [];
  neck.push(paint(xf(new THREE.CapsuleGeometry(0.075, 0.18, 4, 10), 0, 0.1, 0.03, 0, 1, 1, 1, 0.55), coat));
  neck.push(paint(xf(new THREE.CapsuleGeometry(0.068, 0.13, 4, 10), 0, 0.22, 0.14, 0, 1, 1, 1, Math.PI / 2 - 0.3), coat));
  neck.push(paint(xf(new THREE.SphereGeometry(0.05, 10, 8), 0, 0.17, 0.25), dk(coat, 0.9)));
  for (const s of [-1, 1]) {
    neck.push(paint(xf(new THREE.ConeGeometry(0.022, 0.07, 5), s * 0.035, 0.31, 0.08), coat));
    neck.push(paint(xf(new THREE.SphereGeometry(0.016, 8, 6), s * 0.05, 0.24, 0.17), '#1a1410'));
  }
  // 鬃毛
  for (let i = 0; i < 6; i++) neck.push(paint(xf(new THREE.BoxGeometry(0.03, 0.08, 0.05), 0, 0.06 + i * 0.045, -0.02 + i * 0.025, 0, 1, 1, 1, 0.6), mane));
  if (barding) neck.push(paint(xf(new THREE.BoxGeometry(0.1, 0.06, 0.16), 0, 0.27, 0.13, 0, 1, 1, 1, 0.3), barding));
  parts.push({ name: 'neck', pivot: [0, 0.06, 0.18], solid: neck, parent: 'body' });
  // 尾
  const tail: Geo[] = [paint(xf(new THREE.ConeGeometry(0.05, 0.24, 8), 0, -0.12, 0, 0, 1, 1, 1, Math.PI), mane)];
  parts.push({ name: 'tail', pivot: [0, 0.05, -0.27], solid: tail, parent: 'body' });
  // 腿
  const leg = (): Geo[] => [
    paint(xf(new THREE.CapsuleGeometry(0.035, 0.18, 4, 8), 0, -0.13, 0), coat),
    paint(xf(new THREE.CylinderGeometry(0.035, 0.04, 0.05, 8), 0, -0.26, 0), '#2a2420'),
  ];
  for (const [n, x, z] of [
    ['legFL', -0.08, 0.15],
    ['legFR', 0.08, 0.15],
    ['legBL', -0.08, -0.15],
    ['legBR', 0.08, -0.15],
  ] as const) {
    parts.push({ name: n, pivot: [x, -0.04, z], solid: leg(), parent: 'body' });
  }
  const wings: string[] = [];
  if (pegasus) {
    for (const s of [-1, 1]) {
      const feathers: Geo[] = [];
      for (let i = 0; i < 5; i++) {
        const len = 0.32 - i * 0.04;
        const g = new THREE.SphereGeometry(0.05, 10, 6);
        xf(g, 0, 0, 0, 0, 0.35, 1, len / 0.1);
        xf(g, s * (0.06 + len * 0.45), 0.05 + i * 0.012, -0.03 - i * 0.04, s * 0.45);
        feathers.push(paint(g, i % 2 ? '#f6f4f0' : '#e8ecf4'));
      }
      const name = s < 0 ? 'wingL' : 'wingR';
      parts.push({ name, pivot: [s * 0.08, 0.1, 0.06], solid: feathers, parent: 'body' });
      wings.push(name);
    }
  }
  return {
    parts,
    saddle: [0, bodyY + 0.13, -0.02],
    height: 0.62,
    legs: ['legFL', 'legFR', 'legBL', 'legBR'],
    wings,
    tail: 'tail',
    neck: 'neck',
    hover: pegasus ? 0.18 : 0,
  };
}

/* ================================================================== */
/* 飞龙（坐骑 / 野生）                                                  */
/* ================================================================== */

export function wyvern(scale: number, hide: string, belly: string, membrane: string, eye: string): CreatureSpec {
  const s = scale;
  const parts: PartSpec[] = [];
  const body: Geo[] = [];
  body.push(paint(xf(new THREE.CapsuleGeometry(0.14 * s, 0.26 * s, 6, 14), 0, 0, 0, 0, 1, 1, 1, Math.PI / 2 - 0.15), hide));
  body.push(paint(xf(new THREE.SphereGeometry(0.13 * s, 12, 10), 0, -0.05 * s, 0.08 * s, 0, 1, 0.9, 1), belly));
  for (let i = 0; i < 5; i++) body.push(paint(xf(new THREE.ConeGeometry(0.025 * s, 0.07 * s, 4), 0, 0.14 * s, (0.15 - i * 0.07) * s, 0, 1, 1, 1, -0.4), dk(hide, 0.7)));
  parts.push({ name: 'body', pivot: [0, 0.42 * s, 0], solid: body });
  // 颈与头
  const neck: Geo[] = [];
  neck.push(paint(xf(new THREE.CapsuleGeometry(0.065 * s, 0.22 * s, 4, 10), 0, 0.12 * s, 0.05 * s, 0, 1, 1, 1, 0.5), hide));
  neck.push(paint(xf(new THREE.SphereGeometry(0.085 * s, 12, 10), 0, 0.27 * s, 0.15 * s, 0, 1, 0.85, 1.2), hide));
  neck.push(paint(xf(new THREE.ConeGeometry(0.06 * s, 0.16 * s, 8), 0, 0.25 * s, 0.27 * s, 0, 1, 1, 1, Math.PI / 2), hide));
  neck.push(paint(xf(new THREE.ConeGeometry(0.04 * s, 0.1 * s, 6), 0, 0.2 * s, 0.25 * s, 0, 1, 1, 1, Math.PI / 2 + 0.3), belly));
  for (const x of [-1, 1]) neck.push(paint(xf(new THREE.ConeGeometry(0.018 * s, 0.13 * s, 5), x * 0.045 * s, 0.35 * s, 0.08 * s, 0, 1, 1, 1, -0.9, x * -0.3), '#e8dcc0'));
  const glowEyes = [-1, 1].map((x) => paint(xf(new THREE.SphereGeometry(0.014 * s, 6, 6), x * 0.05 * s, 0.3 * s, 0.22 * s), eye));
  parts.push({ name: 'neck', pivot: [0, 0.06 * s, 0.18 * s], solid: neck, glow: glowEyes, parent: 'body' });
  // 尾
  const tail: Geo[] = [];
  for (let i = 0; i < 4; i++) tail.push(paint(xf(new THREE.ConeGeometry((0.06 - i * 0.012) * s, 0.18 * s, 8), 0, -0.02 * s * i, -(0.08 + i * 0.14) * s, 0, 1, 1, 1, -Math.PI / 2 - 0.15), hide));
  tail.push(paint(xf(new THREE.ConeGeometry(0.04 * s, 0.09 * s, 3), 0, -0.07 * s, -0.66 * s, 0, 1, 0.3, 1, -Math.PI / 2), dk(hide, 0.7)));
  parts.push({ name: 'tail', pivot: [0, 0, -0.18 * s], solid: tail, parent: 'body' });
  // 后腿
  for (const [n, x] of [
    ['legBL', -0.09],
    ['legBR', 0.09],
  ] as const) {
    parts.push({
      name: n,
      pivot: [x * s, -0.08 * s, -0.05 * s],
      parent: 'body',
      solid: [
        paint(xf(new THREE.CapsuleGeometry(0.045 * s, 0.14 * s, 4, 8), 0, -0.12 * s, 0.02 * s, 0, 1, 1, 1, 0.3), hide),
        paint(xf(new THREE.ConeGeometry(0.03 * s, 0.07 * s, 4), 0, -0.28 * s, 0.07 * s, 0, 1, 1, 1, Math.PI / 2), '#e8dcc0'),
      ],
    });
  }
  // 翼（骨架 + 翼膜）
  for (const x of [-1, 1]) {
    const g: Geo[] = [];
    g.push(paint(xf(new THREE.CylinderGeometry(0.012 * s, 0.018 * s, 0.5 * s, 6), x * 0.25 * s, 0.05 * s, 0, 0, 1, 1, 1, 0, x * (Math.PI / 2 - 0.25)), dk(hide, 0.8)));
    const mem = new THREE.BufferGeometry();
    const tip = [x * 0.5 * s, 0.17 * s, 0];
    const v = new Float32Array([
      0, 0, 0.05 * s, ...tip, x * 0.42 * s, -0.08 * s, -0.25 * s,
      0, 0, 0.05 * s, x * 0.42 * s, -0.08 * s, -0.25 * s, x * 0.18 * s, -0.04 * s, -0.3 * s,
      0, 0, 0.05 * s, x * 0.18 * s, -0.04 * s, -0.3 * s, 0, 0, -0.18 * s,
    ]);
    mem.setAttribute('position', new THREE.BufferAttribute(v, 3));
    mem.computeVertexNormals();
    const m1 = paint(mem, membrane);
    const m2 = m1.clone();
    const n = m2.attributes.normal;
    for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
    const p = m2.attributes.position;
    for (let i = 0; i < p.count; i += 3) {
      const tx = p.getX(i + 1), ty = p.getY(i + 1), tz = p.getZ(i + 1);
      p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
      p.setXYZ(i + 2, tx, ty, tz);
    }
    g.push(m1, m2);
    parts.push({ name: x < 0 ? 'wingL' : 'wingR', pivot: [x * 0.08 * s, 0.1 * s, 0.05 * s], solid: g, parent: 'body' });
  }
  return { parts, saddle: [0, 0.57 * s, -0.02 * s], height: 0.75 * s, legs: ['legBL', 'legBR'], wings: ['wingL', 'wingR'], tail: 'tail', neck: 'neck', hover: 0.22 };
}

/* ================================================================== */
/* 魔狼                                                                */
/* ================================================================== */

export function wolf(fur: string, eye: string): CreatureSpec {
  const parts: PartSpec[] = [];
  const body: Geo[] = [];
  body.push(paint(xf(new THREE.CapsuleGeometry(0.11, 0.24, 6, 12), 0, 0, 0, 0, 1, 1, 1, Math.PI / 2), fur));
  body.push(paint(xf(new THREE.SphereGeometry(0.13, 12, 10), 0, 0.03, 0.12, 0, 1, 1, 0.9), dk(fur, 1.15)));
  for (let i = 0; i < 4; i++) body.push(paint(xf(new THREE.ConeGeometry(0.03, 0.09, 4), 0, 0.12, 0.1 - i * 0.07, 0, 1, 1, 1, -0.5), dk(fur, 0.7)));
  parts.push({ name: 'body', pivot: [0, 0.27, 0], solid: body });
  const head: Geo[] = [];
  head.push(paint(xf(new THREE.SphereGeometry(0.1, 14, 10), 0, 0, 0, 0, 1, 0.9, 1), fur));
  head.push(paint(xf(new THREE.BoxGeometry(0.08, 0.07, 0.13), 0, -0.02, 0.1), fur));
  head.push(paint(xf(new THREE.SphereGeometry(0.022, 8, 6), 0, 0, 0.17), '#141010'));
  head.push(paint(xf(new THREE.BoxGeometry(0.06, 0.012, 0.08), 0, -0.05, 0.12), '#e8e0d0'));
  for (const s of [-1, 1]) head.push(paint(xf(new THREE.ConeGeometry(0.035, 0.09, 4), s * 0.055, 0.1, -0.01, 0, 1, 1, 0.6, -0.2, s * -0.2), dk(fur, 0.8)));
  const eyes = [-1, 1].map((s) => paint(xf(new THREE.SphereGeometry(0.016, 8, 6), s * 0.045, 0.02, 0.085), eye));
  parts.push({ name: 'neck', pivot: [0, 0.08, 0.22], solid: head, glow: eyes, parent: 'body' });
  parts.push({ name: 'tail', pivot: [0, 0.04, -0.22], parent: 'body', solid: [paint(xf(new THREE.ConeGeometry(0.045, 0.22, 8), 0, 0.02, -0.1, 0, 1, 1, 1, -Math.PI / 2 - 0.6), fur)] });
  const leg = (): Geo[] => [paint(xf(new THREE.CapsuleGeometry(0.03, 0.14, 4, 8), 0, -0.1, 0), dk(fur, 0.85)), paint(xf(new THREE.SphereGeometry(0.035, 8, 6), 0, -0.19, 0.01), dk(fur, 0.6))];
  for (const [n, x, z] of [
    ['legFL', -0.07, 0.13],
    ['legFR', 0.07, 0.13],
    ['legBL', -0.07, -0.13],
    ['legBR', 0.07, -0.13],
  ] as const) parts.push({ name: n, pivot: [x, -0.04, z], solid: leg(), parent: 'body' });
  return { parts, height: 0.48, legs: ['legFL', 'legFR', 'legBL', 'legBR'], wings: [], tail: 'tail', neck: 'neck', hover: 0 };
}

/* ================================================================== */
/* 火蜥蜴                                                              */
/* ================================================================== */

export function salamander(skin: string, belly: string): CreatureSpec {
  const parts: PartSpec[] = [];
  const body: Geo[] = [];
  body.push(paint(xf(new THREE.CapsuleGeometry(0.1, 0.22, 6, 12), 0, 0, 0, 0, 1, 0.75, 1, Math.PI / 2), skin));
  body.push(paint(xf(new THREE.CapsuleGeometry(0.085, 0.2, 6, 12), 0, -0.035, 0, 0, 1, 0.5, 1, Math.PI / 2), belly));
  for (let i = 0; i < 5; i++) body.push(paint(xf(new THREE.ConeGeometry(0.02, 0.06, 4), 0, 0.075, 0.12 - i * 0.06), dk(skin, 0.6)));
  parts.push({ name: 'body', pivot: [0, 0.14, 0], solid: body });
  const head: Geo[] = [paint(xf(new THREE.SphereGeometry(0.085, 12, 10), 0, 0, 0.04, 0, 1.1, 0.7, 1.4), skin)];
  const eyes = [-1, 1].map((s) => paint(xf(new THREE.SphereGeometry(0.018, 8, 6), s * 0.06, 0.035, 0.06), '#ffe060'));
  parts.push({ name: 'neck', pivot: [0, 0.02, 0.2], solid: head, glow: eyes, parent: 'body' });
  const tail: Geo[] = [];
  for (let i = 0; i < 4; i++) tail.push(paint(xf(new THREE.ConeGeometry(0.06 - i * 0.012, 0.13, 8), 0, 0.02 * i, -0.06 - i * 0.1, 0, 1, 0.7, 1, -Math.PI / 2 - 0.2), skin));
  const flame = [paint(xf(new THREE.ConeGeometry(0.05, 0.16, 8), 0, 0.12, -0.44), '#ffb030')];
  parts.push({ name: 'tail', pivot: [0, 0, -0.18], solid: tail, glow: flame, parent: 'body' });
  for (const [n, x, z] of [
    ['legFL', -0.1, 0.1],
    ['legFR', 0.1, 0.1],
    ['legBL', -0.1, -0.1],
    ['legBR', 0.1, -0.1],
  ] as const) {
    parts.push({ name: n, pivot: [x, -0.02, z], parent: 'body', solid: [paint(xf(new THREE.CapsuleGeometry(0.025, 0.08, 4, 8), x * 0.4, -0.06, 0, 0, 1, 1, 1, 0, x > 0 ? 0.6 : -0.6), skin)] });
  }
  return { parts, height: 0.3, legs: ['legFL', 'legFR', 'legBL', 'legBR'], wings: [], tail: 'tail', neck: 'neck', hover: 0 };
}

/* ================================================================== */
/* 灰烬魔像                                                            */
/* ================================================================== */

export function golem(rock: string, lava: string): CreatureSpec {
  const parts: PartSpec[] = [];
  const body: Geo[] = [];
  const cracks: Geo[] = [];
  body.push(paint(jitter(xf(new THREE.DodecahedronGeometry(0.22, 0), 0, 0.05, 0, 0, 1.15, 1, 0.9), 0.04, 3), rock));
  body.push(paint(jitter(xf(new THREE.DodecahedronGeometry(0.14, 0), 0, 0.3, 0.02), 0.03, 5), dk(rock, 1.1)));
  cracks.push(paint(xf(new THREE.BoxGeometry(0.22, 0.02, 0.02), 0, 0.08, 0.2, 0, 1, 1, 1, 0, 0.4), lava));
  cracks.push(paint(xf(new THREE.BoxGeometry(0.02, 0.18, 0.02), 0.05, 0.02, 0.2, 0, 1, 1, 1, 0, -0.2), lava));
  cracks.push(paint(xf(new THREE.SphereGeometry(0.035, 8, 6), 0, 0.12, 0.19), lava));
  const eyes = [-1, 1].map((s) => paint(xf(new THREE.BoxGeometry(0.04, 0.018, 0.02), s * 0.05, 0.32, 0.135), lava));
  parts.push({ name: 'body', pivot: [0, 0.32, 0], solid: body, glow: [...cracks, ...eyes] });
  for (const s of [-1, 1]) {
    const arm: Geo[] = [
      paint(jitter(xf(new THREE.DodecahedronGeometry(0.09, 0), 0, -0.06, 0), 0.02, 7 + s), rock),
      paint(jitter(xf(new THREE.DodecahedronGeometry(0.11, 0), 0, -0.22, 0.02), 0.025, 9 + s), dk(rock, 0.9)),
    ];
    parts.push({ name: s < 0 ? 'armL' : 'armR', pivot: [s * 0.27, 0.16, 0], solid: arm, glow: [paint(xf(new THREE.BoxGeometry(0.02, 0.1, 0.02), 0, -0.15, 0.09), lava)], parent: 'body' });
    parts.push({ name: s < 0 ? 'legL' : 'legR', pivot: [s * 0.12, -0.14, 0], parent: 'body', solid: [paint(jitter(xf(new THREE.DodecahedronGeometry(0.09, 0), 0, -0.08, 0, 0, 1, 1.1, 1), 0.02, 11 + s), dk(rock, 0.85))] });
  }
  return { parts, height: 0.78, legs: ['legL', 'legR'], wings: [], hover: 0 };
}

/* ================================================================== */
/* 巨龙                                                                */
/* ================================================================== */

export function dragon(scales: string, membrane: string, horn: string, eye: string): CreatureSpec {
  const parts: PartSpec[] = [];
  const body: Geo[] = [];
  body.push(paint(xf(new THREE.CapsuleGeometry(0.17, 0.3, 8, 16), 0, 0, 0, 0, 1, 1, 1, Math.PI / 2 - 0.25), scales));
  body.push(paint(xf(new THREE.SphereGeometry(0.17, 14, 12), 0, -0.04, 0.14, 0, 1, 1, 1), dk(scales, 1.15)));
  body.push(paint(xf(new THREE.CapsuleGeometry(0.12, 0.26, 6, 12), 0, -0.08, 0.04, 0, 1, 0.6, 1, Math.PI / 2 - 0.25), C(membrane).lerp(C('#e8c890'), 0.5)));
  for (let i = 0; i < 6; i++) body.push(paint(xf(new THREE.ConeGeometry(0.03, 0.1, 4), 0, 0.18 - i * 0.012, 0.18 - i * 0.08, 0, 1, 1, 1, -0.5), horn));
  parts.push({ name: 'body', pivot: [0, 0.48, 0], solid: body });
  // 颈与头
  const neck: Geo[] = [];
  for (let i = 0; i < 3; i++) neck.push(paint(xf(new THREE.SphereGeometry(0.085 - i * 0.008, 12, 10), 0, 0.06 + i * 0.09, 0.03 + i * 0.05), scales));
  const hy = 0.36;
  const hz = 0.2;
  neck.push(paint(xf(new THREE.SphereGeometry(0.1, 14, 12), 0, hy, hz, 0, 1, 0.85, 1.15), scales));
  neck.push(paint(xf(new THREE.BoxGeometry(0.11, 0.07, 0.18), 0, hy - 0.02, hz + 0.13), scales));
  neck.push(paint(xf(new THREE.BoxGeometry(0.1, 0.03, 0.16), 0, hy - 0.07, hz + 0.11, 0, 1, 1, 1, 0.15), dk(scales, 0.8)));
  for (const s of [-1, 1]) {
    const g = new THREE.ConeGeometry(0.03, 0.2, 6);
    xf(g, 0, 0.1, 0);
    xf(g, 0, 0, 0, 0, 1, 1, 1, -1.9, s * -0.25);
    xf(g, s * 0.06, hy + 0.06, hz - 0.04);
    neck.push(paint(g, horn));
    neck.push(paint(xf(new THREE.ConeGeometry(0.012, 0.03, 4), s * 0.03, hy - 0.05, hz + 0.21, 0, 1, 1, 1, Math.PI), '#f2eee0'));
  }
  const eyes = [-1, 1].map((s) => paint(xf(new THREE.SphereGeometry(0.018, 8, 6), s * 0.062, hy + 0.025, hz + 0.08, 0, 1, 0.6, 1), eye));
  parts.push({ name: 'neck', pivot: [0, 0.1, 0.22], solid: neck, glow: eyes, parent: 'body' });
  // 尾
  const tail: Geo[] = [];
  for (let i = 0; i < 6; i++) {
    tail.push(paint(xf(new THREE.ConeGeometry(0.1 - i * 0.014, 0.16, 10), 0, -0.04 * i, -(0.06 + i * 0.13), 0, 1, 1, 1, -Math.PI / 2 - 0.2), scales));
    tail.push(paint(xf(new THREE.ConeGeometry(0.018, 0.05, 4), 0, 0.06 - i * 0.04, -(0.08 + i * 0.13), 0, 1, 1, 1, -0.5), horn));
  }
  parts.push({ name: 'tail', pivot: [0, -0.02, -0.25], solid: tail, parent: 'body' });
  // 四肢
  for (const [n, x, z] of [
    ['legFL', -0.13, 0.15],
    ['legFR', 0.13, 0.15],
    ['legBL', -0.13, -0.15],
    ['legBR', 0.13, -0.15],
  ] as const) {
    parts.push({
      name: n,
      pivot: [x, -0.1, z],
      parent: 'body',
      solid: [
        paint(xf(new THREE.CapsuleGeometry(0.055, 0.16, 4, 10), 0, -0.13, 0), scales),
        ...[-1, 0, 1].map((c) => paint(xf(new THREE.ConeGeometry(0.015, 0.06, 4), c * 0.03, -0.29, 0.05, 0, 1, 1, 1, Math.PI / 2), horn)),
      ],
    });
  }
  // 巨翼
  for (const x of [-1, 1]) {
    const g: Geo[] = [];
    const bone = dk(scales, 0.8);
    g.push(paint(xf(new THREE.CylinderGeometry(0.018, 0.026, 0.55, 6), x * 0.27, 0.12, 0, 0, 1, 1, 1, 0, x * (Math.PI / 2 - 0.45)), bone));
    const tipX = x * 0.52;
    const tipY = 0.32;
    for (const [fx, fy, fz] of [
      [x * 0.75, 0.05, -0.15],
      [x * 0.62, -0.08, -0.35],
      [x * 0.38, -0.08, -0.45],
    ]) {
      const len = Math.hypot(fx - tipX, fy - tipY, fz);
      const c = new THREE.CylinderGeometry(0.008, 0.014, len, 5);
      c.translate(0, len / 2, 0);
      const dir = new THREE.Vector3(fx - tipX, fy - tipY, fz).normalize();
      c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
      c.translate(tipX, tipY, 0);
      g.push(paint(c, bone));
    }
    const pts = [
      [0, 0.02, 0.06],
      [tipX, tipY, 0],
      [x * 0.75, 0.05, -0.15],
      [x * 0.62, -0.08, -0.35],
      [x * 0.38, -0.08, -0.45],
      [0, -0.02, -0.3],
    ];
    const tris: number[] = [];
    for (let i = 1; i < pts.length - 1; i++) tris.push(...pts[0], ...pts[i], ...pts[i + 1]);
    const mem = new THREE.BufferGeometry();
    mem.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tris), 3));
    mem.computeVertexNormals();
    const m1 = paint(mem, membrane);
    const m2 = m1.clone();
    const n = m2.attributes.normal;
    for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
    const p = m2.attributes.position;
    for (let i = 0; i < p.count; i += 3) {
      const tx = p.getX(i + 1), ty = p.getY(i + 1), tz = p.getZ(i + 1);
      p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
      p.setXYZ(i + 2, tx, ty, tz);
    }
    g.push(m1, m2);
    parts.push({ name: x < 0 ? 'wingL' : 'wingR', pivot: [x * 0.1, 0.12, 0.08], solid: g, parent: 'body' });
  }
  return { parts, height: 0.95, legs: ['legFL', 'legFR', 'legBL', 'legBR'], wings: ['wingL', 'wingR'], tail: 'tail', neck: 'neck', hover: 0 };
}

/* ================================================================== */
/* 怨灵                                                                */
/* ================================================================== */

export function wraith(cloak: string, eye: string): CreatureSpec {
  const parts: PartSpec[] = [];
  const body: Geo[] = [];
  const robe = new THREE.ConeGeometry(0.2, 0.55, 16, 3, true);
  // 破碎的下摆
  const pos = robe.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < -0.2) {
      const a = Math.atan2(pos.getZ(i), pos.getX(i));
      pos.setY(i, pos.getY(i) + Math.abs(Math.sin(a * 4)) * 0.1);
    }
  }
  robe.computeVertexNormals();
  body.push(paint(xf(robe, 0, 0, 0), cloak));
  const inner = robe.clone();
  const n = inner.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  body.push(paint(inner, dk(cloak, 0.4)));
  body.push(paint(xf(new THREE.SphereGeometry(0.15, 16, 12, Math.PI * 0.7, Math.PI * 1.6, 0, Math.PI * 0.7), 0, 0.3, 0, Math.PI), cloak));
  body.push(paint(xf(new THREE.SphereGeometry(0.12, 12, 10), 0, 0.28, 0.0), '#0a0610'));
  const eyes = [-1, 1].map((s) => paint(xf(new THREE.SphereGeometry(0.022, 8, 6), s * 0.045, 0.29, 0.1, 0, 1.3, 0.7, 1), eye));
  parts.push({ name: 'body', pivot: [0, 0.42, 0], solid: body, glow: eyes });
  for (const s of [-1, 1]) {
    parts.push({ name: s < 0 ? 'armL' : 'armR', pivot: [s * 0.13, 0.15, 0.02], parent: 'body', solid: [paint(xf(new THREE.ConeGeometry(0.05, 0.28, 8, 1, true), 0, -0.12, 0, 0, 1, 1, 1, Math.PI), cloak)] });
  }
  return { parts, height: 0.85, legs: [], wings: [], hover: 0.15 };
}

/* ================================================================== */
/* 骷髅头（替换人形头部）                                               */
/* ================================================================== */

export function skullHead(r: number): { solid: Geo[]; glow: Geo[]; face: Geo[] } {
  const bone = '#e8e0cc';
  const solid: Geo[] = [];
  solid.push(paint(xf(new THREE.SphereGeometry(r, 20, 16), 0, 0.02 * r, 0, 0, 1, 1, 0.95), bone));
  solid.push(paint(xf(new THREE.BoxGeometry(r * 1.0, r * 0.35, r * 0.7), 0, -r * 0.65, r * 0.25), bone));
  for (const s of [-1, 1]) solid.push(paint(xf(new THREE.SphereGeometry(r * 0.22, 10, 8), s * r * 0.36, -r * 0.05, r * 0.82, 0, 1, 1, 0.5), '#1a1210'));
  solid.push(paint(xf(new THREE.ConeGeometry(r * 0.08, r * 0.18, 3), 0, -r * 0.32, r * 0.92, 0, 1, 1, 1, Math.PI), '#1a1210'));
  const glow = [-1, 1].map((s) => paint(xf(new THREE.SphereGeometry(r * 0.08, 8, 6), s * r * 0.36, -r * 0.05, r * 0.9), '#ff5030'));
  return { solid, glow, face: [] };
}
