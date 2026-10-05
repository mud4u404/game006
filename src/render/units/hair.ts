/**
 * 日系动画风格的头发：由一缕缕带尖的发束组成
 * 坐标系：头部中心为原点，r 为头部半径，+Z 为脸的朝向。
 */
import * as THREE from 'three';
import { paint } from '../battlefield/geom';
import type { HairModel } from '../contracts';

type P3 = [number, number, number];

/**
 * 发束：沿曲线扫掠、末端收尖的扁平管
 * @param pts 控制点（头部局部坐标）
 * @param w 根部宽度（横向）
 * @param t 根部厚度（法向）
 */
export function strand(pts: P3[], w: number, t: number, color: THREE.ColorRepresentation, seg = 10, radial = 6): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  const frames = curve.computeFrenetFrames(seg, false);
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    const c = curve.getPointAt(u);
    // 根部略粗、末端收尖
    const taper = Math.pow(1 - u, 0.85) * (0.75 + 0.25 * Math.sin(Math.min(1, u * 3) * Math.PI * 0.5));
    const n = frames.normals[i];
    const b = frames.binormals[i];
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const x = Math.cos(a) * w * taper;
      const y = Math.sin(a) * t * taper;
      pos.push(c.x + b.x * x + n.x * y, c.y + b.y * x + n.y * y, c.z + b.z * x + n.z * y);
    }
  }
  // 尖端
  const tip = curve.getPointAt(1);
  const tipIdx = pos.length / 3;
  pos.push(tip.x, tip.y, tip.z);
  // 根部封口
  const root = curve.getPointAt(0);
  const rootIdx = pos.length / 3;
  pos.push(root.x, root.y, root.z);
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j;
      const b2 = i * radial + ((j + 1) % radial);
      const c2 = (i + 1) * radial + j;
      const d = (i + 1) * radial + ((j + 1) % radial);
      idx.push(a, c2, b2, b2, c2, d);
    }
  }
  for (let j = 0; j < radial; j++) {
    idx.push(seg * radial + j, tipIdx, seg * radial + ((j + 1) % radial));
    idx.push(rootIdx, j, (j + 1) % radial);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return paint(g, color);
}

/** 以球面坐标描述头皮上的一点：az 水平角（0 为正前方，正值向右），el 仰角 */
function onHead(r: number, az: number, el: number, k = 1): P3 {
  return [Math.sin(az) * Math.cos(el) * r * k, Math.sin(el) * r * k, Math.cos(az) * Math.cos(el) * r * k];
}

/** 刘海：从头顶前方垂到额前 */
function bangs(r: number, col: THREE.ColorRepresentation, n: number, spread: number, len: number, spiky: boolean, part = 0): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    const az = t * spread + part;
    const L = len * (1 - Math.abs(t) * 0.25) * (i % 2 ? 0.88 : 1);
    const root = onHead(r, az * 0.6, 1.0, 0.95);
    const mid = onHead(r, az * 0.9, 0.55, 1.12);
    const end = onHead(r, az * 1.05 + (spiky ? t * 0.2 : 0), 0.55 - L, 1.08);
    out.push(strand([root, mid, end], r * 0.24, r * 0.09, col, 8, 6));
  }
  return out;
}

/** 生成发型 */
export function hairstyle(style: HairModel, r: number, col: THREE.ColorRepresentation, opts: { hooded?: boolean; ahoge?: boolean } = {}): THREE.BufferGeometry[] {
  if (style === 'bald') return [];
  const out: THREE.BufferGeometry[] = [];
  // 发顶：覆盖头顶与后脑的圆壳
  const cap = new THREE.SphereGeometry(r * 1.06, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.62);
  cap.rotateX(-0.5);
  cap.translate(0, r * 0.02, -r * 0.04);
  out.push(paint(cap, col));
  const back = new THREE.SphereGeometry(r * 1.05, 24, 16, Math.PI, Math.PI, 0, Math.PI * 0.85);
  back.translate(0, -r * 0.02, -r * 0.03);
  out.push(paint(back, col));

  if (style !== 'slick') out.push(...bangs(r, col, style === 'spiky' ? 6 : 7, 1.9, style === 'spiky' ? 0.62 : 0.72, style === 'spiky'));
  // 两侧鬓发
  if (style !== 'slick' && style !== 'spiky') {
    for (const s of [-1, 1]) {
      out.push(strand([onHead(r, s * 1.15, 0.6, 1.0), onHead(r, s * 1.3, 0.0, 1.1), onHead(r, s * 1.2, -0.75, 1.12)], r * 0.2, r * 0.08, col, 8, 6));
    }
  }
  if (opts.hooded) return out;

  const backStrands = (count: number, len: number, flare: number) => {
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1) - 0.5;
      const az = Math.PI + t * 2.4;
      const root = onHead(r, az, 0.5, 0.98);
      const mid = onHead(r, az, -0.2, 1.08 + flare * 0.3);
      const end: P3 = [Math.sin(az) * r * (0.75 + flare), -len, Math.cos(az) * r * (0.75 + flare) - r * 0.1];
      out.push(strand([root, mid, end], r * 0.3, r * 0.12, col, 10, 6));
    }
  };

  switch (style) {
    case 'spiky': {
      // 向后上方张扬的尖发
      for (let i = 0; i < 9; i++) {
        const az = Math.PI + (i / 8 - 0.5) * 3.4;
        const root = onHead(r, az * 0.9, 0.9, 0.9);
        const mid = onHead(r, az, 0.75, 1.25);
        const end = onHead(r, az, 0.55 + (i % 2) * 0.25, 1.75);
        out.push(strand([root, mid, end], r * 0.28, r * 0.11, col, 8, 6));
      }
      backStrands(5, r * 0.65, 0.15);
      break;
    }
    case 'short':
      backStrands(6, r * 0.55, 0.1);
      break;
    case 'long':
      backStrands(9, r * 2.6, 0.25);
      for (const s of [-1, 1]) out.push(strand([onHead(r, s * 1.35, 0.3, 1.0), onHead(r, s * 1.45, -0.6, 1.15), [s * r * 0.95, -r * 2.2, r * 0.05]], r * 0.22, r * 0.09, col, 10, 6));
      break;
    case 'ponytail': {
      backStrands(6, r * 0.55, 0.1);
      out.push(paint(new THREE.TorusGeometry(r * 0.16, r * 0.05, 6, 12).translate(0, r * 0.5, -r * 0.98), new THREE.Color(col).multiplyScalar(0.6)));
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * r * 0.12;
        out.push(strand([[off, r * 0.55, -r * 1.0], [off * 1.5, r * 0.6, -r * 1.6], [off * 2, -r * 0.4, -r * 1.75], [off * 2.5, -r * 1.4, -r * 1.4]], r * 0.24, r * 0.16, col, 12, 6));
      }
      break;
    }
    case 'bob':
      for (let i = 0; i < 9; i++) {
        const az = Math.PI + (i / 8 - 0.5) * 4.2;
        out.push(strand([onHead(r, az, 0.4, 1.0), onHead(r, az, -0.35, 1.18), onHead(r, az * 0.97, -0.75, 0.95)], r * 0.32, r * 0.12, col, 8, 6));
      }
      break;
    case 'braid': {
      backStrands(7, r * 1.4, 0.15);
      const bc = new THREE.Color(col);
      for (let i = 0; i < 8; i++) {
        const y = -r * 0.2 - i * r * 0.28;
        const g = new THREE.SphereGeometry(r * (0.2 - i * 0.012), 10, 8);
        g.scale(1, 1.25, 1);
        g.translate(r * 0.55 - i * r * 0.03, y, r * 0.35 - i * r * 0.04);
        out.push(paint(g, bc));
      }
      break;
    }
    case 'twin':
      backStrands(6, r * 0.6, 0.1);
      for (const s of [-1, 1]) {
        out.push(paint(new THREE.SphereGeometry(r * 0.14, 10, 8).translate(s * r * 0.85, r * 0.55, -r * 0.35), new THREE.Color('#e04060')));
        for (let i = 0; i < 2; i++) out.push(strand([[s * r * 0.9, r * 0.5, -r * 0.4], [s * r * 1.5, r * 0.2, -r * 0.5], [s * r * 1.4, -r * 1.4 - i * r * 0.2, -r * 0.4]], r * 0.22, r * 0.15, col, 12, 6));
      }
      break;
    case 'slick':
      // 向后梳的背头
      for (let i = 0; i < 9; i++) {
        const az = (i / 8 - 0.5) * 2.2;
        out.push(strand([onHead(r, az, 0.45, 1.02), onHead(r, az * 1.2, 1.1, 1.1), onHead(r, Math.PI - az * 0.6, 0.6, 1.15), onHead(r, Math.PI - az * 0.4, -0.2, 1.2)], r * 0.26, r * 0.09, col, 12, 6));
      }
      // 垂落的一缕
      out.push(strand([onHead(r, 0.35, 0.95, 1.05), onHead(r, 0.45, 0.4, 1.12), onHead(r, 0.4, -0.15, 1.12)], r * 0.12, r * 0.05, col, 8, 5));
      break;
    default:
      break;
  }
  if (opts.ahoge) out.push(strand([onHead(r, 0.1, 1.45, 1.0), [r * 0.05, r * 1.35, r * 0.1], [r * 0.25, r * 1.45, r * 0.32]], r * 0.07, r * 0.04, col, 8, 5));
  return out;
}
