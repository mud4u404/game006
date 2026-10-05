/**
 * 日系动画风格的脸部贴图（Canvas 绘制）
 * 贴在头部正面的球面片上：u 对应水平角度、v 对应竖直角度。
 */
import * as THREE from 'three';

export type FaceExpr = 'normal' | 'closed' | 'angry' | 'hurt' | 'smile';

export interface FaceStyle {
  eyes: string;
  hair: string;
  female: boolean;
  /** 眼型：温和 / 锐利 / 圆润 */
  shape?: 'gentle' | 'sharp' | 'round';
  blush?: boolean;
  /** 竖瞳（龙） */
  slit?: boolean;
  /** 发光的眼睛（魔物/反派） */
  glow?: boolean;
  /** 伤疤：左/右 */
  scar?: 'left' | 'right';
  /** 眼罩 */
  eyepatch?: 'left' | 'right';
  /** 胡子：遮住嘴 */
  beard?: boolean;
  /** 年长：眼睛更小、更细 */
  old?: boolean;
}

const cache = new Map<string, THREE.CanvasTexture>();

function shade(hex: string, k: number): string {
  const c = new THREE.Color(hex);
  if (k >= 1) c.lerp(new THREE.Color('#ffffff'), k - 1);
  else c.multiplyScalar(k);
  return `#${c.getHexString()}`;
}

/** 脸部贴图的水平/竖直覆盖范围（弧度） */
export const FACE_PHI = 1.5; // 水平总角度
export const FACE_THETA_START = 0.36; // 从顶端起算（× π）
export const FACE_THETA_LEN = 0.42; // × π

export function faceTexture(style: FaceStyle, expr: FaceExpr = 'normal', size = 512): THREE.CanvasTexture {
  const key = JSON.stringify([style, expr, size]);
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const g = cv.getContext('2d')!;
  const S = size;
  g.clearRect(0, 0, S, S);
  g.lineCap = 'round';
  g.lineJoin = 'round';

  const shape = style.shape ?? (style.female ? 'gentle' : 'sharp');
  const eyeW = S * (style.old ? 0.085 : 0.1);
  const eyeH = S * (style.old ? 0.1 : shape === 'round' ? 0.17 : shape === 'sharp' ? 0.135 : 0.16);
  const ey = S * 0.47;
  const ex = S * 0.17;

  const drawEye = (cx: number, side: number) => {
    if (style.eyepatch && ((style.eyepatch === 'left' && side < 0) || (style.eyepatch === 'right' && side > 0))) {
      g.fillStyle = '#1c1614';
      g.beginPath();
      g.ellipse(cx, ey, eyeW * 1.25, eyeH * 0.7, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#1c1614';
      g.lineWidth = S * 0.012;
      g.beginPath();
      g.moveTo(cx - side * eyeW * 1.2, ey - eyeH * 0.4);
      g.lineTo(cx + side * S * 0.25, ey - eyeH * 1.6);
      g.stroke();
      return;
    }
    if (expr === 'closed' || expr === 'hurt' || expr === 'smile') {
      g.strokeStyle = '#2a1a1a';
      g.lineWidth = S * 0.016;
      g.beginPath();
      if (expr === 'smile') {
        g.moveTo(cx - eyeW, ey + eyeH * 0.1);
        g.quadraticCurveTo(cx, ey - eyeH * 0.55, cx + eyeW, ey + eyeH * 0.1);
      } else if (expr === 'hurt') {
        g.moveTo(cx - side * eyeW, ey - eyeH * 0.3);
        g.lineTo(cx + side * eyeW * 0.6, ey);
        g.lineTo(cx - side * eyeW, ey + eyeH * 0.3);
      } else {
        g.moveTo(cx - eyeW, ey);
        g.quadraticCurveTo(cx, ey + eyeH * 0.35, cx + eyeW, ey);
      }
      g.stroke();
      return;
    }
    // 眼白
    g.fillStyle = '#fbf7f2';
    g.beginPath();
    g.ellipse(cx, ey + eyeH * 0.05, eyeW * 1.05, eyeH * 0.92, 0, 0, Math.PI * 2);
    g.fill();
    // 虹膜：上深下浅的渐变
    const iw = eyeW * 0.8;
    const ih = eyeH * 0.86;
    const icy = ey + eyeH * 0.1;
    const grad = g.createLinearGradient(cx, icy - ih, cx, icy + ih);
    grad.addColorStop(0, shade(style.eyes, 0.35));
    grad.addColorStop(0.5, shade(style.eyes, 0.85));
    grad.addColorStop(1, shade(style.eyes, 1.35));
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(cx, icy, iw, ih, 0, 0, Math.PI * 2);
    g.fill();
    // 瞳孔
    g.fillStyle = style.glow ? shade(style.eyes, 1.6) : '#140c10';
    g.beginPath();
    if (style.slit) g.ellipse(cx, icy, iw * 0.18, ih * 0.75, 0, 0, Math.PI * 2);
    else g.ellipse(cx, icy - ih * 0.08, iw * 0.45, ih * 0.5, 0, 0, Math.PI * 2);
    g.fill();
    // 虹膜外圈
    g.strokeStyle = shade(style.eyes, 0.3);
    g.lineWidth = S * 0.006;
    g.beginPath();
    g.ellipse(cx, icy, iw, ih, 0, 0, Math.PI * 2);
    g.stroke();
    // 高光
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(cx - side * iw * 0.3 - iw * 0.05, icy - ih * 0.38, iw * 0.34, ih * 0.26, -0.4, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(cx + side * iw * 0.35, icy + ih * 0.42, iw * 0.14, ih * 0.1, 0, 0, Math.PI * 2);
    g.fill();
    // 上眼线（加粗，女性带眼尾上挑）
    const lashY = ey - eyeH * (expr === 'angry' ? 0.55 : 0.78);
    g.strokeStyle = '#1e1214';
    g.lineWidth = S * (style.female ? 0.024 : 0.019);
    g.beginPath();
    g.moveTo(cx - side * eyeW * 1.1, lashY + eyeH * 0.25);
    g.quadraticCurveTo(cx, lashY - eyeH * 0.18, cx + side * eyeW * 1.15, lashY + eyeH * (expr === 'angry' ? -0.05 : 0.15));
    if (style.female) g.lineTo(cx + side * eyeW * 1.35, lashY - eyeH * 0.05);
    g.stroke();
    // 遮住虹膜上缘（让眼神更柔和/锐利）
    if (shape === 'sharp' || expr === 'angry') {
      g.fillStyle = '#00000000';
    }
    // 下眼线
    g.strokeStyle = 'rgba(40,20,20,0.55)';
    g.lineWidth = S * 0.007;
    g.beginPath();
    g.moveTo(cx - eyeW * 0.6, ey + eyeH * 0.98);
    g.lineTo(cx + eyeW * 0.6, ey + eyeH * 0.98);
    g.stroke();
  };

  drawEye(S / 2 - ex, -1);
  drawEye(S / 2 + ex, 1);

  // 眉毛
  g.strokeStyle = shade(style.hair, 0.55);
  g.lineWidth = S * 0.013;
  for (const side of [-1, 1]) {
    const cx = S / 2 + side * ex;
    const by = ey - eyeH * 1.45;
    g.beginPath();
    if (expr === 'angry') {
      g.moveTo(cx - side * eyeW * 0.9, by - eyeH * 0.2);
      g.lineTo(cx + side * eyeW * 1.0, by + eyeH * 0.15);
    } else if (expr === 'hurt') {
      g.moveTo(cx - side * eyeW * 0.9, by + eyeH * 0.15);
      g.lineTo(cx + side * eyeW * 1.0, by - eyeH * 0.15);
    } else {
      g.moveTo(cx - eyeW, by + eyeH * 0.05);
      g.quadraticCurveTo(cx, by - eyeH * 0.15, cx + eyeW, by + eyeH * 0.05);
    }
    g.stroke();
  }

  // 腮红
  if (style.blush ?? style.female) {
    for (const side of [-1, 1]) {
      const rg = g.createRadialGradient(S / 2 + side * ex * 1.25, ey + eyeH * 1.35, 0, S / 2 + side * ex * 1.25, ey + eyeH * 1.35, S * 0.06);
      rg.addColorStop(0, 'rgba(255,120,120,0.45)');
      rg.addColorStop(1, 'rgba(255,120,120,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, S, S);
    }
  }

  // 鼻
  g.fillStyle = 'rgba(160,90,80,0.45)';
  g.beginPath();
  g.ellipse(S / 2, ey + eyeH * 1.15, S * 0.006, S * 0.004, 0, 0, Math.PI * 2);
  g.fill();

  // 嘴
  if (!style.beard) {
    g.strokeStyle = '#7a2a28';
    g.lineWidth = S * 0.009;
    g.beginPath();
    const my = ey + eyeH * 1.75;
    if (expr === 'smile') {
      g.moveTo(S / 2 - S * 0.035, my);
      g.quadraticCurveTo(S / 2, my + S * 0.03, S / 2 + S * 0.035, my);
    } else if (expr === 'angry' || expr === 'hurt') {
      g.fillStyle = '#5a1a1a';
      g.ellipse(S / 2, my + S * 0.006, S * 0.026, S * 0.016, 0, 0, Math.PI * 2);
      g.fill();
    } else {
      g.moveTo(S / 2 - S * 0.02, my);
      g.quadraticCurveTo(S / 2, my + S * 0.008, S / 2 + S * 0.02, my);
    }
    g.stroke();
  }

  // 伤疤
  if (style.scar) {
    const side = style.scar === 'left' ? -1 : 1;
    g.strokeStyle = 'rgba(150,60,60,0.8)';
    g.lineWidth = S * 0.008;
    g.beginPath();
    g.moveTo(S / 2 + side * ex * 0.6, ey - eyeH * 1.9);
    g.lineTo(S / 2 + side * ex * 1.25, ey + eyeH * 0.1);
    g.stroke();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}
