/**
 * 像素工坊：无抗锯齿的像素光栅化 + 赛璐璐明暗 + 选择性描边
 * --------------------------------------------------------------
 * 所有角色、魔物、立绘都由这里的图元组合而成。
 * 光源固定在左上前方，形状按球面/柱面法线自动分出 4 阶明暗。
 */

export type Ramp = [number, number, number, number]; // 深影、阴影、固有色、高光（打包 RGBA）

/* ------------------------------------------------------------------ */
/* 颜色                                                                */
/* ------------------------------------------------------------------ */

export function rgba(r: number, g: number, b: number, a = 255): number {
  return ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
}

export function unpack(c: number): [number, number, number, number] {
  return [c & 255, (c >>> 8) & 255, (c >>> 16) & 255, (c >>> 24) & 255];
}

export function hex(h: string): number {
  const s = h.replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16);
  return rgba((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h: number;
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (mx === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = (((h % 360) + 360) % 360) / 360;
  const f = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
}

/** 向某个色相靠拢 */
function towards(h: number, target: number, amt: number): number {
  let d = target - h;
  d = ((d + 540) % 360) - 180;
  return h + d * amt;
}

/**
 * 由固有色生成 4 阶色带：阴影偏冷（蓝紫），高光偏暖（金黄），像素画常用的色相偏移
 */
export function ramp(base: string, opts: { contrast?: number; warm?: boolean } = {}): Ramp {
  const [r, g, b] = unpack(hex(base));
  const [h, s, l] = rgbToHsl(r, g, b);
  const k = opts.contrast ?? 1;
  const mk = (hh: number, ss: number, ll: number) => {
    const [rr, gg, bb] = hslToRgb(hh, Math.max(0, Math.min(1, ss)), Math.max(0.02, Math.min(0.97, ll)));
    return rgba(Math.round(rr), Math.round(gg), Math.round(bb));
  };
  const cool = 255;
  // 暖色（红橙黄）阴影的色相偏移减半，否则浅黄会偏成粉红；浅色底的暗部降饱和得到棕色
  const warm = h < 95 || h > 330;
  const shift = warm ? 0.13 : 0.28;
  const desat = 1 - Math.max(0, l - 0.55) * 0.9;
  return [
    mk(towards(h, cool, shift), s * desat + 0.04, l - 0.3 * k),
    mk(towards(h, cool, shift / 2), s * (0.5 + desat * 0.5) + 0.03, l - 0.15 * k),
    mk(h, s, l),
    mk(towards(h, opts.warm === false ? h : 55, 0.12), s * 0.95, l + 0.13 * k),
  ];
}

/* ------------------------------------------------------------------ */
/* 画布                                                                */
/* ------------------------------------------------------------------ */

/** 光照方向（屏幕空间：x 右、y 下、z 朝向观者） */
const L = (() => {
  const v = [-0.55, -0.62, 0.56];
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
})();

export interface DrawOpts {
  /** 在形状边缘、且压在已有像素上方时画深色分隔线 */
  edge?: boolean;
  /** 明暗阈值偏移（>0 更亮） */
  bias?: number;
  /** 不做明暗，只用某一阶 */
  flat?: 0 | 1 | 2 | 3;
  /** 只在已有像素上绘制（用于贴花、阴影） */
  clipToExisting?: boolean;
}

export class PixelBuf {
  readonly w: number;
  readonly h: number;
  readonly data: Uint32Array;
  /** 当前一次绘制的覆盖掩码（复用） */
  private mask: Uint8Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Uint32Array(w * h);
    this.mask = new Uint8Array(w * h);
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[y * this.w + x];
  }

  set(x: number, y: number, c: number) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y * this.w + x] = c;
  }

  /** 内部：把掩码中的像素按明暗函数着色 */
  private commit(ramp: Ramp, shade: (x: number, y: number) => number, o: DrawOpts, x0: number, y0: number, x1: number, y1: number) {
    const { w, mask, data } = this;
    const bias = o.bias ?? 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * w + x;
        if (!mask[i]) continue;
        if (o.clipToExisting && !(data[i] >>> 24)) continue;
        let c: number;
        if (o.flat !== undefined) c = ramp[o.flat];
        else {
          const s = shade(x + 0.5, y + 0.5) + bias;
          c = s > 0.62 ? ramp[3] : s > 0.08 ? ramp[2] : s > -0.45 ? ramp[1] : ramp[0];
        }
        data[i] = c;
      }
    }
    if (o.edge) {
      // 选择性内描边：形状边缘压在已有图像之上时，画最深的一阶
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const i = y * w + x;
          if (!mask[i]) continue;
          const nb = [
            [x - 1, y],
            [x + 1, y],
            [x, y - 1],
            [x, y + 1],
          ];
          for (const [nx, ny] of nb) {
            if (nx < 0 || ny < 0 || nx >= w || ny >= this.h) continue;
            const j = ny * w + nx;
            if (!mask[j] && data[j] >>> 24 && data[j] !== ramp[0]) {
              data[i] = darken(ramp[0], 0.82);
              break;
            }
          }
        }
      }
    }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) mask[y * w + x] = 0;
  }

  private bounds(xs: number[], ys: number[]): [number, number, number, number] {
    const x0 = Math.max(0, Math.floor(Math.min(...xs)));
    const y0 = Math.max(0, Math.floor(Math.min(...ys)));
    const x1 = Math.min(this.w - 1, Math.ceil(Math.max(...xs)));
    const y1 = Math.min(this.h - 1, Math.ceil(Math.max(...ys)));
    return [x0, y0, x1, y1];
  }

  /** 椭圆（球面明暗），rot 为旋转角 */
  ellipse(cx: number, cy: number, rx: number, ry: number, ramp: Ramp, o: DrawOpts = {}, rot = 0) {
    if (rx <= 0 || ry <= 0) return;
    const R = Math.max(rx, ry) + 1;
    const [x0, y0, x1, y1] = this.bounds([cx - R, cx + R], [cy - R, cy + R]);
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const u = (dx * c + dy * s) / rx;
        const v = (-dx * s + dy * c) / ry;
        if (u * u + v * v <= 1) this.mask[y * this.w + x] = 1;
      }
    }
    this.commit(
      ramp,
      (x, y) => {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        const r2 = Math.min(1, dx * dx + dy * dy);
        const nz = Math.sqrt(1 - r2);
        return (dx * L[0] + dy * L[1] + nz * L[2]) * 1.15 - 0.1;
      },
      o,
      x0,
      y0,
      x1,
      y1,
    );
  }

  /** 胶囊（柱面明暗）：从 (ax,ay) 到 (bx,by)，两端半径 ra、rb */
  capsule(ax: number, ay: number, bx: number, by: number, ra: number, rb: number, ramp: Ramp, o: DrawOpts = {}) {
    const R = Math.max(ra, rb) + 1;
    const [x0, y0, x1, y1] = this.bounds([ax - R, bx - R, ax + R, bx + R], [ay - R, by - R, ay + R, by + R]);
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1e-6;
    const len = Math.sqrt(len2);
    const nx = -dy / len;
    const ny = dx / len;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5 - ax;
        const py = y + 0.5 - ay;
        const t = Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
        const r = ra + (rb - ra) * t;
        const qx = px - dx * t;
        const qy = py - dy * t;
        if (qx * qx + qy * qy <= r * r) this.mask[y * this.w + x] = 1;
      }
    }
    this.commit(
      ramp,
      (x, y) => {
        const px = x - ax;
        const py = y - ay;
        const t = Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
        const r = ra + (rb - ra) * t;
        const off = (px * nx + py * ny) / Math.max(0.5, r);
        const o2 = Math.max(-1, Math.min(1, off));
        const nz = Math.sqrt(1 - o2 * o2);
        return (o2 * nx * L[0] + o2 * ny * L[1] + nz * L[2]) * 1.15 - 0.08;
      },
      o,
      x0,
      y0,
      x1,
      y1,
    );
  }

  /** 多边形（扫描线填充）。shade：'flat' | 'cyl'（左右柱面）| 'dome'（中心凸起） */
  poly(pts: [number, number][], ramp: Ramp, o: DrawOpts & { shade?: 'flat' | 'cyl' | 'dome' | 'down' } = {}) {
    if (pts.length < 3) return;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const [x0, y0, x1, y1] = this.bounds(xs, ys);
    for (let y = y0; y <= y1; y++) {
      const sy = y + 0.5;
      const cross: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) cross.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
      }
      cross.sort((a, b) => a - b);
      for (let k = 0; k + 1 < cross.length; k += 2) {
        const xa = Math.max(x0, Math.round(cross[k]));
        const xb = Math.min(x1, Math.round(cross[k + 1]) - 1);
        for (let x = xa; x <= xb; x++) this.mask[y * this.w + x] = 1;
      }
    }
    const cx = (x0 + x1 + 1) / 2;
    const cy = (y0 + y1 + 1) / 2;
    const hw = Math.max(1, (x1 - x0 + 1) / 2);
    const hh = Math.max(1, (y1 - y0 + 1) / 2);
    const mode = o.shade ?? 'cyl';
    this.commit(
      ramp,
      (x, y) => {
        const u = Math.max(-1, Math.min(1, (x - cx) / hw));
        const v = Math.max(-1, Math.min(1, (y - cy) / hh));
        if (mode === 'flat') return 0.3;
        if (mode === 'down') return 0.55 - (v + 1) * 0.45 + -u * 0.2;
        if (mode === 'dome') {
          const nz = Math.sqrt(Math.max(0, 1 - Math.min(1, u * u + v * v)));
          return (u * L[0] + v * L[1] + nz * L[2]) * 1.15 - 0.1;
        }
        const nz = Math.sqrt(1 - u * u);
        return (u * L[0] + nz * L[2]) * 1.1 + -v * 0.18 - 0.08;
      },
      o,
      x0,
      y0,
      x1,
      y1,
    );
  }

  /** 1 像素宽的线（Bresenham） */
  line(x0: number, y0: number, x1: number, y1: number, c: number) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let i = 0; i < 400; i++) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** 外描边：透明像素若与不透明像素相邻，则用该像素颜色的深色版本 */
  outline(strength = 0.42, diagonal = false) {
    const { w, h, data } = this;
    const src = data.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (src[i] >>> 24) continue;
        let n = 0;
        const nbs = diagonal
          ? [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
              [1, 1],
              [-1, -1],
              [1, -1],
              [-1, 1],
            ]
          : [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ];
        for (const [dx, dy] of nbs) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const c = src[yy * w + xx];
          if (c >>> 24) {
            n = c;
            break;
          }
        }
        if (n) data[i] = darken(n, strength);
      }
    }
  }

  /** 输出到 Canvas（左右镜像可选） */
  toCanvas(ctx: CanvasRenderingContext2D, ox: number, oy: number, mirror = false) {
    const img = ctx.createImageData(this.w, this.h);
    const u32 = new Uint32Array(img.data.buffer);
    if (!mirror) u32.set(this.data);
    else {
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) u32[y * this.w + x] = this.data[y * this.w + (this.w - 1 - x)];
    }
    ctx.putImageData(img, ox, oy);
  }

  clear() {
    this.data.fill(0);
  }
}

/** 按比例变暗并略微偏冷 */
export function darken(c: number, k: number): number {
  const [r, g, b] = unpack(c);
  return rgba(Math.round(r * k * 0.92), Math.round(g * k * 0.9), Math.round(b * k + 18 * (1 - k)), 255);
}

export function lighten(c: number, k: number): number {
  const [r, g, b] = unpack(c);
  return rgba(Math.min(255, Math.round(r + (255 - r) * k)), Math.min(255, Math.round(g + (255 - g) * k)), Math.min(255, Math.round(b + (255 - b) * k)), 255);
}
