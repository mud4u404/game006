/**
 * 像素立绘（HD-2D 对话头像）
 * --------------------------------------------------------------
 * 80×96 的半身像，3/4 侧脸朝向画面右方（右侧说话者由 UI 镜像）。
 * 眼睛、嘴巴等关键五官逐像素绘制，头发、衣着用带色相偏移的色带填充，
 * 与战场精灵共享同一套配色（同一角色的精灵与立绘颜色一致）。
 */
import type { HairModel } from '@/render/contracts';
import type { Emotion } from '@/ui/portraitContracts';
import { darken, hex, lighten, PixelBuf, ramp, rgba, type Ramp } from './pixel';

export const PORTRAIT_W = 80;
export const PORTRAIT_H = 96;

export type Outfit =
  | 'knight'
  | 'heavy'
  | 'dark'
  | 'nun'
  | 'priest'
  | 'mage'
  | 'leather'
  | 'hunter'
  | 'thief'
  | 'sky'
  | 'dragon'
  | 'noble'
  | 'royal'
  | 'soldier'
  | 'villager'
  | 'cultist'
  | 'sorceress'
  | 'coat';

export type Headwear = 'none' | 'circlet' | 'hood' | 'veil' | 'helm' | 'horned' | 'mitre' | 'crown' | 'wizard' | 'bandana' | 'cowl';

export type Accessory = 'earring' | 'horns' | 'dragon_mark' | 'glasses' | 'freckles' | 'bandage' | 'feather' | 'mole';

export interface PortraitLook {
  gender: 'm' | 'f';
  age?: 'young' | 'adult' | 'old';
  skin: string;
  hair: string;
  eyes: string;
  hairStyle: HairModel;
  /** 眼型：温和 / 锐利 / 圆润 / 狭长（反派） */
  eyeShape?: 'gentle' | 'sharp' | 'round' | 'narrow';
  slit?: boolean;
  glowEyes?: string;
  scar?: 'left' | 'right';
  eyepatch?: 'left' | 'right';
  blush?: boolean;
  ahoge?: boolean;
  beard?: 'none' | 'stubble' | 'beard' | 'full' | 'mustache';
  primary: string;
  secondary: string;
  metal?: string;
  outfit: Outfit;
  headwear?: Headwear;
  accessories?: Accessory[];
  glow?: string;
}

interface Pal {
  skin: Ramp;
  hair: Ramp;
  eye: Ramp;
  prim: Ramp;
  sec: Ramp;
  metal: Ramp;
  leather: Ramp;
  gold: Ramp;
  white: number;
  lash: number;
  mouth: number;
  blush: number;
  glow: Ramp;
}

function palette(L: PortraitLook): Pal {
  const skin = ramp(L.skin, { contrast: 0.62 });
  const hair = ramp(L.hair, { contrast: 1.05 });
  return {
    skin,
    hair,
    eye: ramp(L.eyes, { contrast: 1.2 }),
    prim: ramp(L.primary),
    sec: ramp(L.secondary),
    metal: ramp(L.metal ?? '#b8bec8', { contrast: 1.25 }),
    leather: ramp('#6a4630'),
    gold: ramp('#e0b048', { contrast: 1.1 }),
    white: hex('#fbf7f2'),
    lash: darken(hair[0], 0.45),
    mouth: darken(skin[0], 0.72),
    blush: hex('#f0889a'),
    glow: ramp(L.glow ?? L.glowEyes ?? '#ffd27a', { contrast: 0.5 }),
  };
}

type Pt = [number, number];

/* ================================================================== */
/* 入口                                                                */
/* ================================================================== */

export function drawPortrait(L: PortraitLook, emotion: Emotion = 'normal'): PixelBuf {
  const buf = new PixelBuf(PORTRAIT_W, PORTRAIT_H);
  const P = palette(L);
  const f = L.gender === 'f';
  const style = L.hairStyle;
  const hw = L.headwear ?? 'none';

  // 1. 后发 / 兜帽后部
  backLayer(buf, L, P);
  // 2. 身体与衣着
  body(buf, L, P);
  // 3. 脖子
  buf.poly(
    [
      [33, 52],
      [46, 51],
      [46, 67],
      [32, 67],
    ],
    P.skin,
    { shade: 'flat', flat: 1 },
  );
  buf.poly(
    [
      [33, 56],
      [37, 58],
      [36, 67],
      [32, 67],
    ],
    P.skin,
    { shade: 'flat', flat: 2 },
  );
  collar(buf, L, P);
  // 4. 发冠（脸后方的头发体积）
  if (style !== 'bald' && !['helm', 'horned'].includes(hw)) {
    buf.ellipse(37, 31, 19, 19.5, P.hair, { edge: false });
  }
  if (style === 'bald' || ['helm', 'horned'].includes(hw)) buf.ellipse(38, 31, 16.5, 17, P.skin, { bias: 0.2 });
  // 5. 脸
  face(buf, L, P, f);
  // 6. 五官
  features(buf, L, P, emotion, f);
  // 7. 前发、侧发
  if (style !== 'bald' && !['helm', 'horned'].includes(hw)) frontHair(buf, L, P);
  hairShadow(buf, P);
  if (L.ahoge && !['hood', 'veil', 'helm', 'horned', 'wizard', 'cowl'].includes(hw)) {
    buf.capsule(40, 13, 44, 5, 1.6, 1, P.hair, { edge: true });
    buf.capsule(44, 5, 49, 4, 1, 0.6, P.hair, { edge: true });
  }
  // 8. 头饰
  headwear(buf, L, P);
  accessories(buf, L, P);
  if (emotion === 'hurt') sweat(buf, 56, 34);
  if (emotion === 'surprised') sweat(buf, 57, 30);
  buf.outline(0.32);
  return buf;
}

/** 头发/头饰在脸上投下的 2 像素赛璐璐阴影 */
function hairShadow(buf: PixelBuf, P: Pal) {
  const lit = P.skin[2];
  const shadow = P.skin[1];
  const isSkin = (c: number) => c === lit || c === shadow || c === P.skin[0] || c === P.skin[3];
  const src = buf.data.slice();
  for (let y = 20; y < 60; y++) {
    for (let x = 18; x < 60; x++) {
      if (src[y * buf.w + x] !== lit) continue;
      for (const [dx, dy] of [
        [-1, -1],
        [-1, -2],
        [0, -1],
      ]) {
        const c = src[(y + dy) * buf.w + x + dx];
        if (c >>> 24 && !isSkin(c) && c !== P.white && c !== P.lash && y < 46) {
          buf.data[y * buf.w + x] = shadow;
          break;
        }
      }
    }
  }
}

function sweat(buf: PixelBuf, x: number, y: number) {
  const c = hex('#bfe4ff');
  const d = hex('#6aa8e0');
  buf.set(x, y, c);
  buf.set(x, y + 1, c);
  buf.set(x - 1, y + 2, c);
  buf.set(x, y + 2, hex('#ffffff'));
  buf.set(x + 1, y + 2, d);
  buf.set(x, y + 3, d);
}

/* ================================================================== */
/* 脸                                                                  */
/* ================================================================== */

function face(buf: PixelBuf, L: PortraitLook, P: Pal, f: boolean) {
  const old = L.age === 'old';
  const chin: Pt = f ? [40, 58] : [41, 59.5];
  const outline: Pt[] = [
    [22, 27],
    [53, 26],
    [54.5, 37],
    [53, 45],
    f ? [49.5, 52] : [50, 51],
    f ? [44.5, 56.5] : [45.5, 57.5],
    chin,
    f ? [35.5, 57] : [35, 58],
    f ? [29, 53] : [28.5, 52.5],
    [24.5, 46],
    [22.5, 38],
  ];
  buf.poly(outline, P.skin, { shade: 'flat', flat: 2 });
  // 远侧脸颊阴影
  buf.poly(
    [
      [51, 29],
      [54.5, 37],
      [53, 45],
      f ? [49.5, 52] : [50, 51],
      f ? [44.5, 56.5] : [45.5, 57.5],
      [46, 52],
      [49.5, 46],
      [51, 38],
    ],
    P.skin,
    { shade: 'flat', flat: 1 },
  );
  // 下巴下方阴影线
  buf.line(chin[0] - 3, chin[1] + 0.5, chin[0] + 3, chin[1] - 0.5, P.skin[0]);
  // 耳朵（近侧）
  buf.ellipse(24, 44, 2.6, 4.2, P.skin, { flat: 2, edge: true });
  buf.line(24, 42, 24, 46, P.skin[1]);
  buf.set(25, 41, P.skin[1]);
  if (old) {
    // 皱纹
    buf.line(46, 50, 47, 53, P.skin[0]);
    buf.line(29, 50, 30, 52, P.skin[1]);
  }
  if (L.blush) {
    for (const [x, y] of [
      [27, 50],
      [29, 50],
      [31, 50],
      [48, 50],
      [50, 50],
    ] as Pt[]) {
      buf.set(x, y, P.blush);
      buf.set(x + 1, y - 1, lighten(P.blush, 0.3));
    }
  }
  if (L.accessories?.includes('freckles')) {
    for (const [x, y] of [
      [28, 49],
      [30, 50],
      [32, 49],
      [47, 49],
      [49, 50],
    ] as Pt[])
      buf.set(x, y, P.skin[0]);
  }
}

/* ================================================================== */
/* 五官：眼、眉、鼻、口                                                 */
/* ================================================================== */

interface EyeCfg {
  x: number; // 左上角
  y: number;
  w: number;
  h: number;
  /** 外眼角在左侧（近侧眼）还是右侧（远侧眼） */
  outerLeft: boolean;
}

function features(buf: PixelBuf, L: PortraitLook, P: Pal, emo: Emotion, f: boolean) {
  const shape = L.eyeShape ?? (f ? 'gentle' : 'sharp');
  const tall = shape === 'round' ? 9 : shape === 'gentle' ? 8 : shape === 'narrow' ? 5 : 7;
  const near: EyeCfg = { x: 27, y: 40, w: 9, h: tall, outerLeft: true };
  const far: EyeCfg = { x: 44, y: 40, w: 7, h: tall, outerLeft: false };
  if (tall < 8) {
    near.y += 1;
    far.y += 1;
  }
  const patched = (side: 'near' | 'far') => (L.eyepatch === 'right' && side === 'near') || (L.eyepatch === 'left' && side === 'far');

  // 眉
  brows(buf, L, P, emo, near, far, f, shape);
  // 眼
  for (const [cfg, side] of [
    [near, 'near'],
    [far, 'far'],
  ] as [EyeCfg, 'near' | 'far'][]) {
    if (patched(side)) continue;
    drawEye(buf, L, P, cfg, emo, side, f, shape);
  }
  // 鼻
  buf.set(43, 47, P.skin[1]);
  buf.set(43, 48, P.skin[1]);
  buf.set(42, 49, P.skin[0]);
  buf.set(41, 49, P.skin[1]);
  // 口
  mouth(buf, P, emo, f, L);
  // 伤疤
  if (L.scar) {
    const sx = L.scar === 'right' ? 31 : 47;
    const c = darken(P.skin[0], 0.85);
    const hi = lighten(P.skin[2], 0.25);
    for (let i = 0; i < 9; i++) {
      const x = sx + Math.round(i * 0.35) - 1;
      const y = 36 + i;
      if (y >= near.y && y < near.y + near.h && !(L.eyepatch)) continue;
      buf.set(x, y, c);
      buf.set(x + 1, y, hi);
    }
  }
  // 眼罩
  if (L.eyepatch) {
    const cx = L.eyepatch === 'right' ? 31.5 : 47.5;
    buf.ellipse(cx, 44, L.eyepatch === 'right' ? 5.2 : 4.4, 4.2, ramp('#2a2224'), { edge: true });
    buf.line(cx - 6, 38, 22, 34, hex('#2a2224'));
    buf.line(cx + 4, 41, 55, 36, hex('#2a2224'));
  }
}

function drawEye(buf: PixelBuf, L: PortraitLook, P: Pal, e: EyeCfg, emo: Emotion, side: 'near' | 'far', f: boolean, shape: string) {
  const { x, w, outerLeft } = e;
  let { y, h } = e;
  const lash = P.lash;
  const set = (c: number, cx: number, cy: number) => buf.set(x + cx, y + cy, c);
  // 内外眼角列号
  const outer = outerLeft ? 0 : w - 1;
  const inner = outerLeft ? w - 1 : 0;
  const tInner = (col: number) => (outerLeft ? col / (w - 1) : 1 - col / (w - 1)); // 0 外 → 1 内

  // 闭眼类表情
  if (emo === 'smile' && shape !== 'narrow' && shape !== 'sharp') {
    // ∩ 形笑眼
    for (let c = 0; c < w; c++) {
      const t = (c - (w - 1) / 2) / ((w - 1) / 2);
      const dy = Math.round(t * t * 2.2);
      set(lash, c, Math.round(h * 0.45) + dy - 1);
      if (Math.abs(t) < 0.75) set(lash, c, Math.round(h * 0.45) + dy - 2);
    }
    set(lash, outer + (outerLeft ? -1 : 1), Math.round(h * 0.45) + 1);
    return;
  }
  if (emo === 'hurt' && side === 'near') {
    // > 形紧闭
    const mid = Math.round(h / 2);
    for (let c = 0; c < w; c++) {
      const t = tInner(c);
      const dy = Math.round((1 - t) * 2.5);
      set(lash, c, mid - dy);
      set(lash, c, mid + dy);
    }
    return;
  }

  // 眼睑形状：每列上睑下移量
  let lidAngry = 0;
  let lidSad = 0;
  let lidFlat = 0;
  if (emo === 'angry') lidAngry = 2;
  if (emo === 'determined') lidAngry = 1;
  if (emo === 'sad') lidSad = 2;
  if (emo === 'hurt') lidFlat = 2;
  if (emo === 'smile') lidFlat = 1;
  if (shape === 'narrow') lidAngry = Math.max(lidAngry, 1);
  if (emo === 'surprised') {
    y -= 1;
    h += 2;
  }
  const lid = (col: number) => {
    const t = tInner(col);
    // 拱形：中间略高
    const arch = Math.abs(col - (w - 1) * (outerLeft ? 0.42 : 0.58)) / (w / 2);
    return Math.round(arch * arch * 0.9 + lidAngry * t + lidSad * (1 - t) + lidFlat);
  };
  const bottom = h - 1;

  // 巩膜 + 虹膜
  const irisW = emo === 'surprised' ? Math.max(3, w - 5) : w - (side === 'far' ? 2 : 3);
  const gaze = emo === 'thinking' ? (outerLeft ? 1 : -1) * -1 : 0;
  const irisX0 = Math.round((w - irisW) / 2 + (outerLeft ? 0.5 : -0.5)) + gaze;
  const irisTop = 1;
  const irisBot = bottom - (emo === 'surprised' ? 2 : 0);
  const glowEyes = !!L.glowEyes;
  for (let c = 0; c < w; c++) {
    const top = lid(c) + 2;
    for (let r = top; r < bottom; r++) {
      const inIris = c >= irisX0 && c < irisX0 + irisW && r >= irisTop && r <= irisBot;
      if (!inIris) {
        set(P.white, c, r);
        continue;
      }
      const ir = (r - irisTop) / Math.max(1, irisBot - irisTop);
      let col = ir < 0.34 ? P.eye[0] : ir < 0.62 ? P.eye[1] : ir < 0.86 ? P.eye[2] : P.eye[3];
      if (glowEyes) col = ir < 0.3 ? P.glow[1] : ir < 0.7 ? P.glow[2] : P.glow[3];
      set(col, c, r);
    }
  }
  // 瞳孔
  const pc = irisX0 + Math.floor(irisW / 2) - (irisW % 2 === 0 && outerLeft ? 1 : 0);
  const pupil = glowEyes ? lighten(P.glow[3], 0.6) : darken(P.eye[0], 0.55);
  const pTop = Math.max(irisTop + 1, lid(pc) + 2);
  if (L.slit) {
    for (let r = pTop; r <= irisBot - 1; r++) set(pupil, pc, r);
  } else if (emo !== 'surprised') {
    set(pupil, pc, pTop);
    set(pupil, pc, pTop + 1);
    if (irisW >= 5) {
      set(pupil, pc + (outerLeft ? 1 : -1), pTop);
      set(pupil, pc + (outerLeft ? 1 : -1), pTop + 1);
    }
  } else set(pupil, pc, Math.round((irisTop + irisBot) / 2));
  // 高光：左上 2×2 + 右下 1 点
  if (!glowEyes) {
    const hx = irisX0;
    const hy = Math.max(irisTop + 1, lid(hx) + 2);
    set(P.white, hx, hy);
    set(P.white, hx, hy + 1);
    if (irisW >= 5) {
      set(P.white, hx + 1, hy);
      set(lighten(P.eye[3], 0.5), hx + 1, hy + 1);
    }
    set(lighten(P.eye[3], 0.4), irisX0 + irisW - 1, irisBot - 1);
  }
  // 上睫毛（2 像素粗）
  for (let c = 0; c < w; c++) {
    const t = lid(c);
    set(lash, c, t);
    set(lash, c, t + 1);
  }
  // 外眼角睫毛尾
  const oc = outer + (outerLeft ? -1 : 1);
  set(lash, oc, lid(outer) + 1);
  set(lash, oc, lid(outer) + 2);
  if (f) {
    set(lash, oc + (outerLeft ? -1 : 1), lid(outer));
    set(lash, outer, lid(outer) - 1);
  }
  // 内眼角
  set(darken(P.skin[1], 0.9), inner, lid(inner) + 2);
  // 下眼睑
  const lc = darken(P.skin[0], 0.92);
  for (let c = 0; c < w; c++) {
    const t = tInner(c);
    if (t < 0.45) set(lc, c, bottom);
    else if (t < 0.75 && f) set(P.skin[1], c, bottom);
  }
  if (emo === 'smile') {
    // 下睑上抬
    for (let c = 1; c < w - 1; c++) set(P.skin[1], c, bottom - 1);
  }
}

function brows(buf: PixelBuf, L: PortraitLook, P: Pal, emo: Emotion, near: EyeCfg, far: EyeCfg, f: boolean, shape: string) {
  if (L.headwear === 'helm' || L.headwear === 'horned') return;
  const c = darken(P.hair[0], 0.8);
  const thick = !f && shape !== 'gentle';
  const draw = (e: EyeCfg, isNear: boolean) => {
    const by = e.y - 3;
    const w = e.w + 1;
    for (let i = 0; i < w; i++) {
      const t = i / (w - 1); // 0 = 外侧 → 1 = 内侧（近侧眼外侧在左）
      const tt = isNear ? t : 1 - t;
      const col = isNear ? e.x - 1 + i : e.x + i;
      let dy = 0;
      switch (emo) {
        case 'angry':
          dy = Math.round(tt * 3 - 0.5);
          break;
        case 'determined':
          dy = Math.round(tt * 1.6);
          break;
        case 'sad':
        case 'hurt':
          dy = -Math.round(tt * 2.2) + 1;
          break;
        case 'surprised':
          dy = -2 - Math.round(Math.sin(t * Math.PI) * 1);
          break;
        case 'thinking':
          dy = isNear ? -1 - Math.round(Math.sin(t * Math.PI) * 1.2) : Math.round(tt);
          break;
        default:
          dy = -Math.round(Math.sin((isNear ? t : 1 - t) * Math.PI * 0.9) * 1.2);
      }
      buf.set(col, by + dy, c);
      if (thick && i > 0 && i < w - 1) buf.set(col, by + dy + 1, P.hair[0]);
    }
  };
  draw(near, true);
  draw(far, false);
}

function mouth(buf: PixelBuf, P: Pal, emo: Emotion, f: boolean, L: PortraitLook) {
  const m = P.mouth;
  const x = 41;
  const y = f ? 53 : 54;
  const lip = P.skin[1];
  const s = (dx: number, dy: number, c: number) => buf.set(x + dx, y + dy, c);
  switch (emo) {
    case 'smile':
      if (f || L.age !== 'old') {
        // 张口笑
        s(-2, 0, m);
        s(-1, 0, m);
        s(0, 0, m);
        s(1, 0, m);
        s(2, -1, m);
        s(-1, 1, hex('#b8404a'));
        s(0, 1, hex('#d86070'));
        s(1, 1, m);
        s(-3, -1, m);
      } else {
        s(-2, 0, m);
        s(-1, 0, m);
        s(0, 0, m);
        s(1, -1, m);
      }
      break;
    case 'angry':
    case 'hurt':
      for (let i = -2; i <= 2; i++) {
        s(i, -1, m);
        s(i, 0, P.white);
        s(i, 1, m);
      }
      s(-3, 0, m);
      s(3, 0, m);
      break;
    case 'sad':
      s(-2, 1, m);
      s(-1, 0, m);
      s(0, 0, m);
      s(1, 0, m);
      s(2, 1, m);
      break;
    case 'surprised':
      s(-1, -1, m);
      s(0, -1, m);
      s(-2, 0, m);
      s(-1, 0, hex('#7a2a34'));
      s(0, 0, hex('#7a2a34'));
      s(1, 0, m);
      s(-1, 1, m);
      s(0, 1, m);
      break;
    case 'determined':
      s(-2, 0, m);
      s(-1, 0, m);
      s(0, 0, m);
      s(1, 0, m);
      s(-1, 1, lip);
      s(0, 1, lip);
      break;
    case 'thinking':
      s(-1, 0, m);
      s(0, 0, m);
      s(1, 1, m);
      break;
    default:
      s(-1, 0, m);
      s(0, 0, m);
      s(1, 0, m);
      if (!f) s(-2, 0, m);
      s(0, 1, lip);
  }
}

/* ================================================================== */
/* 头发                                                                */
/* ================================================================== */

function backLayer(buf: PixelBuf, L: PortraitLook, P: Pal) {
  const style = L.hairStyle;
  const hw = L.headwear ?? 'none';
  // 兜帽 / 头巾后部
  if (hw === 'hood' || hw === 'cowl') {
    const cl = hw === 'cowl' ? ramp(darkHex(L.primary, 0.75)) : ramp(darkHex(L.primary, 0.9));
    buf.poly(
      [
        [14, 32],
        [20, 12],
        [38, 6],
        [56, 12],
        [62, 32],
        [64, 66],
        [12, 68],
      ],
      cl,
      { shade: 'cyl', edge: true },
    );
  }
  if (hw === 'veil') {
    const v = ramp(L.secondary);
    buf.poly(
      [
        [14, 30],
        [20, 12],
        [38, 7],
        [56, 12],
        [62, 30],
        [66, 74],
        [10, 76],
      ],
      v,
      { shade: 'cyl', edge: true },
    );
  }
  if (['hood', 'cowl', 'helm', 'horned'].includes(hw)) return;
  const hr = P.hair;
  if (style === 'long' || style === 'braid') {
    buf.poly(
      [
        [16, 28],
        [58, 26],
        [61, 50],
        [64, 80],
        [60, 96],
        [16, 96],
        [11, 78],
        [14, 52],
      ],
      hr,
      { shade: 'cyl', edge: true },
    );
    // 发丝
    for (const [x0, x1] of [
      [20, 16],
      [27, 24],
      [52, 58],
      [57, 62],
    ] as Pt[])
      buf.line(x0, 52, x1, 90, hr[1]);
  }
  if (style === 'ponytail') {
    buf.poly(
      [
        [22, 18],
        [14, 24],
        [7, 38],
        [5, 56],
        [9, 74],
        [12, 64],
        [14, 48],
        [20, 34],
      ],
      hr,
      { shade: 'cyl', edge: true },
    );
    buf.line(10, 40, 8, 64, hr[1]);
  }
  if (style === 'twin') {
    for (const [x, d] of [
      [19, -1],
      [57, 1],
    ] as Pt[]) {
      buf.poly(
        [
          [x - 4 * d, 16],
          [x + 6 * d, 18],
          [x + 12 * d, 36],
          [x + 10 * d, 64],
          [x + 4 * d, 82],
          [x + 2 * d, 60],
          [x - 1 * d, 36],
        ],
        hr,
        { shade: 'cyl', edge: true },
      );
    }
  }
  if (style === 'bob') {
    buf.poly(
      [
        [17, 26],
        [58, 25],
        [60, 54],
        [52, 58],
        [24, 59],
        [15, 54],
      ],
      hr,
      { shade: 'cyl', edge: true },
    );
  }
}

function frontHair(buf: PixelBuf, L: PortraitLook, P: Pal) {
  const style = L.hairStyle;
  const hr = P.hair;
  const hw = L.headwear ?? 'none';
  const hooded = hw === 'hood' || hw === 'veil' || hw === 'cowl';
  // 头顶高光弧（天使环）
  const ring = () => {
    if (hooded || hw === 'wizard' || hw === 'mitre') return;
    for (let x = 25; x <= 47; x++) {
      const t = (x - 36) / 11;
      const y = Math.round(19 + t * t * 4);
      if ((x + y) % 4 === 0) continue;
      if (buf.get(x, y) >>> 24) buf.set(x, y, hr[3]);
      if (x > 28 && x < 44 && (x % 3 !== 0)) buf.set(x, y + 1, hr[3]);
    }
  };

  const drawLocks = (locks: Pt[][], bias = 0.1, baseY = 30) => {
    // 刘海根部实心：只在发梢附近露出额头
    buf.poly(
      [
        [20, 22],
        [37, 17],
        [56, 22],
        [56, baseY - 2],
        [37, baseY],
        [20, baseY],
      ],
      hr,
      { shade: 'dome', edge: false, bias: bias + 0.05 },
    );
    for (const l of locks) buf.poly(l, hr, { shade: 'dome', edge: true, bias });
  };

  if (style === 'slick') {
    // 背头：发际线后移，向后梳的发丝
    buf.poly(
      [
        [19, 34],
        [20, 20],
        [30, 12],
        [44, 11],
        [54, 17],
        [56, 30],
        [52, 26],
        [44, 23],
        [34, 23],
        [26, 26],
        [23, 34],
      ],
      hr,
      { shade: 'dome', edge: true, bias: 0.15 },
    );
    for (let i = 0; i < 4; i++) buf.line(30 + i * 5, 23, 22 + i * 6, 14, hr[1]);
    // 一缕垂发
    buf.poly(
      [
        [41, 23],
        [45, 23],
        [43, 34],
        [40, 30],
      ],
      hr,
      { shade: 'dome', edge: true },
    );
    ring();
    return;
  }

  if (style === 'spiky') {
    const spikes: Pt[][] = [
      [
        [20, 26],
        [8, 16],
        [24, 18],
      ],
      [
        [22, 18],
        [14, 4],
        [32, 12],
      ],
      [
        [30, 13],
        [30, -1],
        [42, 11],
      ],
      [
        [40, 11],
        [50, 0],
        [52, 15],
      ],
      [
        [50, 14],
        [64, 10],
        [56, 24],
      ],
    ];
    for (const s of spikes) buf.poly(s, hr, { shade: 'dome', edge: true, bias: 0.05 });
    buf.ellipse(37, 25, 17, 12, hr, { edge: false, bias: 0.05 });
    drawLocks([
      [
        [20, 24],
        [28, 22],
        [24, 44],
        [21, 36],
      ],
      [
        [26, 22],
        [36, 22],
        [33, 41],
      ],
      [
        [33, 21],
        [44, 22],
        [42, 38],
        [38, 31],
      ],
      [
        [41, 21],
        [52, 22],
        [51, 36],
        [47, 30],
      ],
      [
        [49, 22],
        [56, 26],
        [56, 44],
        [52, 33],
      ],
    ]);
    ring();
    return;
  }

  if (style === 'bald') return;

  // 普通前发（short / long / ponytail / bob / braid / twin）
  const bob = style === 'bob';
  const long = style === 'long' || style === 'braid' || style === 'twin';
  // 顶部体积
  buf.ellipse(37, 24, 18.5, 12.5, hr, { edge: false, bias: 0.12 });
  const locks: Pt[][] = bob
    ? [
        [
          [20, 22],
          [30, 22],
          [30, 37],
          [21, 37],
        ],
        [
          [28, 21],
          [40, 21],
          [40, 37],
          [29, 37],
        ],
        [
          [38, 21],
          [54, 22],
          [54, 36],
          [39, 37],
        ],
      ]
    : [
        [
          [20, 24],
          [29, 21],
          [27, 34],
          [23, 41],
          [21, 33],
        ],
        [
          [26, 21],
          [36, 20],
          [33, 30],
          [31, 39],
          [29, 31],
        ],
        [
          [33, 20],
          [44, 20],
          [41, 29],
          [37, 37],
          [36, 29],
        ],
        [
          [41, 20],
          [52, 21],
          [50, 28],
          [46, 36],
          [44, 28],
        ],
        [
          [49, 21],
          [56, 25],
          [55, 34],
          [52, 40],
          [51, 30],
        ],
      ];
  drawLocks(locks);
  // 发束分隔线
  if (!bob) {
    buf.line(30, 23, 28, 30, hr[0]);
    buf.line(37, 22, 35, 29, hr[0]);
    buf.line(45, 22, 43, 28, hr[0]);
  }
  // 侧发（脸颊两侧）
  const sideLen = long ? 62 : bob ? 57 : 49;
  buf.poly(
    [
      [19, 26],
      [25, 28],
      [26, 40],
      [24, sideLen - 6],
      [21, sideLen],
      [18, 42],
    ],
    hr,
    { shade: 'cyl', edge: true, bias: -0.05 },
  );
  buf.poly(
    [
      [52, 26],
      [57, 27],
      [58, 42],
      [56, sideLen - 4],
      [53, sideLen - 8],
      [53, 38],
    ],
    hr,
    { shade: 'cyl', edge: true, bias: -0.1 },
  );
  if (style === 'braid') {
    // 搭在近侧肩上的辫子
    for (let i = 0; i < 6; i++) {
      const y = 58 + i * 5.5;
      buf.ellipse(20 + (i % 2) * 1.5, y, 4 - i * 0.25, 3.4, hr, { edge: true, bias: 0.1 });
    }
    buf.ellipse(21, 91, 2.4, 1.6, P.sec, { edge: true });
  }
  if (style === 'ponytail') buf.ellipse(20, 21, 3, 2.4, P.sec, { edge: true });
  if (style === 'twin') {
    buf.ellipse(19, 18, 3, 2.6, P.sec, { edge: true });
    buf.ellipse(56, 18, 2.6, 2.4, P.sec, { edge: true });
  }
  ring();
}

/* ================================================================== */
/* 身体与衣着                                                          */
/* ================================================================== */

function darkHex(h: string, k: number): string {
  const n = parseInt(h.replace('#', ''), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const TORSO: Pt[] = [
  [3, 96],
  [6, 80],
  [13, 71],
  [25, 66],
  [33, 64],
  [46, 64],
  [55, 66],
  [65, 71],
  [72, 80],
  [76, 96],
];

function body(buf: PixelBuf, L: PortraitLook, P: Pal) {
  const o = L.outfit;
  const prim = P.prim;
  const dark = ramp(darkHex(L.primary, 0.6));
  // 披风（肩后）
  if (['knight', 'royal', 'dark', 'sky', 'noble'].includes(o)) {
    buf.poly(
      [
        [0, 96],
        [2, 78],
        [10, 70],
        [24, 67],
        [56, 67],
        [68, 70],
        [78, 80],
        [80, 96],
      ],
      o === 'royal' ? ramp('#b02a30') : dark,
      { shade: 'cyl', edge: true },
    );
  }
  const base = ['heavy', 'dark'].includes(o) ? P.metal : prim;
  buf.poly(TORSO, o === 'dark' ? ramp(L.metal ?? '#3a3d48', { contrast: 1.2 }) : base, { shade: 'cyl', edge: true });

  switch (o) {
    case 'knight':
    case 'sky': {
      // 胸甲 + 肩甲 + 饰带
      buf.poly(
        [
          [30, 70],
          [54, 69],
          [57, 96],
          [26, 96],
        ],
        P.metal,
        { shade: 'cyl', edge: true },
      );
      buf.poly(
        [
          [38, 70],
          [46, 70],
          [48, 96],
          [37, 96],
        ],
        P.sec,
        { shade: 'flat', flat: 2 },
      );
      pauldron(buf, P.metal, 15, 76, 12, 8, -0.3, true);
      pauldron(buf, P.metal, 65, 75, 9, 6.5, 0.3, false);
      buf.line(5, 82, 23, 71, P.sec[2]);
      if (o === 'sky') {
        // 羽翼纹饰
        for (let i = 0; i < 3; i++) buf.line(10 + i * 3, 80 - i, 4 + i * 3, 70 - i * 2, hex('#ffffff'));
      }
      break;
    }
    case 'heavy': {
      pauldron(buf, P.metal, 14, 75, 14, 10, -0.25, true);
      pauldron(buf, P.metal, 66, 74, 10.5, 8, 0.25, false);
      // 护喉
      buf.poly(
        [
          [29, 62],
          [50, 62],
          [52, 72],
          [27, 72],
        ],
        P.metal,
        { shade: 'cyl', edge: true },
      );
      buf.line(29, 66, 51, 66, P.metal[0]);
      buf.poly(
        [
          [37, 74],
          [47, 74],
          [46, 96],
          [38, 96],
        ],
        P.prim,
        { shade: 'flat', flat: 2 },
      );
      break;
    }
    case 'dark': {
      const m = ramp(L.metal ?? '#3a3d48', { contrast: 1.3 });
      pauldron(buf, m, 14, 75, 13, 9, -0.25, true);
      pauldron(buf, m, 65, 74, 9.5, 7, 0.25, false);
      // 肩刺
      buf.poly(
        [
          [6, 70],
          [2, 58],
          [12, 68],
        ],
        m,
        { shade: 'flat', flat: 2, edge: true },
      );
      buf.poly(
        [
          [14, 67],
          [14, 55],
          [20, 66],
        ],
        m,
        { shade: 'flat', flat: 2, edge: true },
      );
      buf.poly(
        [
          [68, 69],
          [74, 58],
          [72, 71],
        ],
        m,
        { shade: 'flat', flat: 1, edge: true },
      );
      buf.line(27, 75, 52, 74, P.sec[2]);
      buf.line(27, 76, 52, 75, P.sec[1]);
      break;
    }
    case 'nun': {
      buf.poly(
        [
          [28, 64],
          [51, 64],
          [56, 76],
          [40, 82],
          [24, 76],
        ],
        ramp('#f6f4ee', { contrast: 0.6 }),
        { shade: 'cyl', edge: true },
      );
      buf.poly(
        [
          [37, 80],
          [44, 80],
          [45, 96],
          [36, 96],
        ],
        P.sec,
        { shade: 'flat', flat: 2 },
      );
      // 圣徽
      buf.line(40, 84, 40, 91, P.gold[3]);
      buf.line(37, 86, 43, 86, P.gold[3]);
      break;
    }
    case 'priest':
    case 'cultist': {
      // 层叠长袍 + 圣带
      buf.poly(
        [
          [24, 66],
          [33, 64],
          [36, 96],
          [26, 96],
        ],
        P.sec,
        { shade: 'flat', flat: 2, edge: true },
      );
      buf.poly(
        [
          [45, 64],
          [55, 66],
          [54, 96],
          [46, 96],
        ],
        P.sec,
        { shade: 'flat', flat: 1, edge: true },
      );
      for (let y = 72; y < 96; y += 6) {
        buf.set(30, y, P.gold[3]);
        buf.set(50, y, P.gold[2]);
      }
      if (o === 'cultist') {
        // 灰烬纹样
        buf.line(34, 72, 44, 72, P.sec[3]);
        buf.line(39, 68, 39, 80, P.sec[3]);
      }
      break;
    }
    case 'mage':
    case 'sorceress': {
      // 高领外套
      buf.poly(
        [
          [27, 58],
          [36, 63],
          [35, 74],
          [26, 70],
        ],
        P.prim,
        { shade: 'flat', flat: 1, edge: true },
      );
      buf.poly(
        [
          [52, 57],
          [44, 63],
          [45, 74],
          [54, 69],
        ],
        P.prim,
        { shade: 'flat', flat: 0, edge: true },
      );
      buf.line(27, 58, 35, 63, P.sec[2]);
      buf.line(52, 57, 45, 63, P.sec[2]);
      buf.line(40, 74, 40, 96, P.sec[2]);
      for (let y = 78; y < 96; y += 5) buf.set(42, y, P.gold[3]);
      if (o === 'sorceress') {
        buf.poly(
          [
            [33, 66],
            [47, 66],
            [44, 74],
            [36, 74],
          ],
          P.skin,
          { shade: 'flat', flat: 1 },
        );
        buf.ellipse(40, 72, 1.6, 1.6, ramp(L.glow ?? '#a070ff'), { edge: true });
      }
      break;
    }
    case 'leather':
    case 'coat': {
      buf.poly(
        [
          [33, 66],
          [46, 66],
          [44, 96],
          [36, 96],
        ],
        o === 'coat' ? P.sec : ramp('#d8ccb4'),
        { shade: 'flat', flat: 2, edge: true },
      );
      // 斜挎皮带
      buf.poly(
        [
          [14, 72],
          [19, 70],
          [60, 96],
          [53, 96],
        ],
        P.leather,
        { shade: 'flat', flat: 2, edge: true },
      );
      buf.ellipse(15, 75, 9, 7, o === 'coat' ? ramp(darkHex(L.primary, 0.8)) : P.leather, { edge: true }, -0.3);
      buf.set(36, 82, P.gold[3]);
      break;
    }
    case 'hunter':
    case 'thief': {
      // 兜帽放下堆在肩后 + 围巾
      buf.poly(
        [
          [22, 62],
          [56, 62],
          [60, 72],
          [40, 76],
          [18, 72],
        ],
        o === 'thief' ? P.sec : ramp(darkHex(L.primary, 0.85)),
        { shade: 'cyl', edge: true },
      );
      buf.poly(
        [
          [12, 74],
          [17, 71],
          [56, 96],
          [49, 96],
        ],
        P.leather,
        { shade: 'flat', flat: 2, edge: true },
      );
      break;
    }
    case 'dragon': {
      // 红金华服：高领 + 鳞纹
      buf.poly(
        [
          [28, 60],
          [51, 60],
          [55, 70],
          [24, 70],
        ],
        P.sec,
        { shade: 'cyl', edge: true },
      );
      buf.line(25, 70, 54, 70, P.gold[3]);
      for (let y = 80; y < 96; y += 5)
        for (let x = 16 + ((y / 5) % 2) * 4; x < 66; x += 8) {
          buf.set(x, y, P.prim[1]);
          buf.set(x + 1, y + 1, P.prim[1]);
          buf.set(x - 1, y + 1, P.prim[1]);
        }
      // 金色肩饰
      buf.line(10, 80, 26, 70, P.gold[2]);
      buf.line(54, 70, 68, 78, P.gold[1]);
      buf.ellipse(40, 66, 2, 2, ramp('#ffb030'), { edge: true });
      break;
    }
    case 'noble':
    case 'royal': {
      buf.poly(
        [
          [32, 64],
          [48, 64],
          [45, 96],
          [35, 96],
        ],
        ramp('#f2eee6', { contrast: 0.6 }),
        { shade: 'cyl', edge: true },
      );
      // 翻领
      buf.poly(
        [
          [24, 66],
          [33, 64],
          [38, 84],
        ],
        P.sec,
        { shade: 'flat', flat: 2, edge: true },
      );
      buf.poly(
        [
          [56, 66],
          [47, 64],
          [43, 84],
        ],
        P.sec,
        { shade: 'flat', flat: 1, edge: true },
      );
      if (o === 'royal') {
        // 白貂毛领
        buf.poly(
          [
            [6, 76],
            [16, 66],
            [30, 64],
            [26, 72],
            [12, 82],
          ],
          ramp('#f4f2ee', { contrast: 0.5 }),
          { shade: 'cyl', edge: true },
        );
        for (const [x, y] of [
          [14, 72],
          [20, 68],
          [24, 70],
        ] as Pt[])
          buf.set(x, y, hex('#1a1a1a'));
      }
      buf.ellipse(40, 70, 1.4, 1.4, P.gold, { edge: true });
      break;
    }
    case 'soldier': {
      pauldron(buf, P.metal, 15, 76, 11, 7, -0.3, true);
      pauldron(buf, P.metal, 64, 75, 8.5, 6, 0.3, false);
      buf.poly(
        [
          [31, 70],
          [53, 69],
          [55, 96],
          [28, 96],
        ],
        P.metal,
        { shade: 'cyl', edge: true },
      );
      buf.line(31, 78, 54, 77, P.metal[0]);
      break;
    }
    case 'villager': {
      buf.poly(
        [
          [32, 64],
          [47, 64],
          [40, 74],
        ],
        P.skin,
        { shade: 'flat', flat: 1 },
      );
      buf.line(32, 64, 40, 74, P.prim[0]);
      buf.line(47, 64, 40, 74, P.prim[0]);
      break;
    }
  }
}

/** 肩甲：分层的金属板（上层亮、下层暗，边缘一条高光） */
function pauldron(buf: PixelBuf, m: Ramp, x: number, y: number, rx: number, ry: number, rot: number, near: boolean) {
  const b = near ? 0 : -0.2;
  buf.ellipse(x, y + 2.5, rx * 0.92, ry * 0.8, m, { edge: true, bias: b - 0.25 }, rot);
  buf.ellipse(x, y, rx, ry * 0.78, m, { edge: true, bias: b - 0.05 }, rot);
  // 上缘高光
  const s = Math.sin(rot);
  const c = Math.cos(rot);
  for (let i = -rx * 0.7; i <= rx * 0.7; i++) {
    const t = i / rx;
    const yy = -ry * 0.62 * Math.sqrt(Math.max(0, 1 - t * t));
    buf.set(x + i * c - yy * s, y + i * s + yy * c + 1, m[3]);
  }
}

function collar(buf: PixelBuf, L: PortraitLook, P: Pal) {
  const o = L.outfit;
  if (['knight', 'sky'].includes(o)) {
    // 围巾
    buf.poly(
      [
        [29, 60],
        [50, 59],
        [53, 67],
        [41, 70],
        [26, 67],
      ],
      P.sec,
      { shade: 'cyl', edge: true },
    );
    buf.poly(
      [
        [27, 66],
        [33, 67],
        [30, 78],
        [25, 76],
      ],
      P.sec,
      { shade: 'flat', flat: 1, edge: true },
    );
  }
  if (o === 'leather' || o === 'villager' || o === 'coat') {
    buf.line(31, 64, 48, 64, darken(L.outfit === 'villager' ? P.prim[0] : P.leather[0], 0.9));
  }
}

/* ================================================================== */
/* 头饰与配件                                                          */
/* ================================================================== */

function headwear(buf: PixelBuf, L: PortraitLook, P: Pal) {
  const hw = L.headwear ?? 'none';
  switch (hw) {
    case 'circlet': {
      for (let x = 21; x <= 55; x++) {
        const t = (x - 38) / 17;
        const y = Math.round(25 - t * 1.5 + t * t * 2.5);
        buf.set(x, y, P.gold[2]);
        buf.set(x, y + 1, P.gold[1]);
      }
      buf.ellipse(40, 25, 1.8, 2, P.sec, { edge: true });
      buf.set(39, 24, hex('#ffffff'));
      break;
    }
    case 'bandana': {
      buf.poly(
        [
          [20, 24],
          [56, 22],
          [57, 27],
          [20, 29],
        ],
        P.sec,
        { shade: 'cyl', edge: true },
      );
      buf.poly(
        [
          [18, 26],
          [10, 32],
          [12, 36],
          [20, 29],
        ],
        P.sec,
        { shade: 'flat', flat: 1, edge: true },
      );
      break;
    }
    case 'hood':
    case 'cowl': {
      const cl = hw === 'cowl' ? ramp(darkHex(L.primary, 0.75)) : ramp(darkHex(L.primary, 0.9));
      // 兜帽前沿（压住头顶）
      buf.poly(
        [
          [17, 40],
          [18, 22],
          [28, 12],
          [44, 11],
          [56, 18],
          [59, 36],
          [55, 27],
          [46, 21],
          [32, 21],
          [23, 27],
          [21, 40],
        ],
        cl,
        { shade: 'dome', edge: true, bias: 0.1 },
      );
      if (hw === 'cowl') {
        // 兜帽阴影罩住上半张脸
        for (let y = 26; y < 40; y++)
          for (let x = 22; x < 56; x++) {
            const c = buf.get(x, y);
            if (!(c >>> 24)) continue;
            if (y < 31 + Math.abs(x - 38) * 0.15) buf.set(x, y, darken(c, 0.55));
          }
      }
      break;
    }
    case 'veil': {
      const v = ramp('#f6f4ee', { contrast: 0.6 });
      buf.poly(
        [
          [17, 44],
          [18, 22],
          [28, 12],
          [44, 11],
          [56, 18],
          [59, 40],
          [55, 27],
          [46, 22],
          [32, 22],
          [23, 27],
          [21, 44],
        ],
        v,
        { shade: 'dome', edge: true, bias: 0.15 },
      );
      for (let x = 22; x <= 55; x++) buf.set(x, Math.round(22 + Math.abs(x - 39) * 0.3), P.sec[2]);
      break;
    }
    case 'helm':
    case 'horned': {
      buf.poly(
        [
          [19, 40],
          [18, 24],
          [26, 13],
          [38, 9],
          [50, 12],
          [58, 24],
          [58, 42],
          [54, 30],
          [46, 28],
          [32, 28],
          [24, 30],
          [22, 40],
        ],
        P.metal,
        { shade: 'dome', edge: true, bias: 0.1 },
      );
      buf.line(22, 31, 55, 30, P.metal[0]);
      buf.line(38, 10, 38, 28, P.metal[3]);
      // 护颊
      buf.poly(
        [
          [19, 38],
          [24, 37],
          [26, 50],
          [21, 52],
        ],
        P.metal,
        { shade: 'cyl', edge: true },
      );
      if (hw === 'horned') {
        const h = ramp('#d8ccb0', { contrast: 1.1 });
        buf.capsule(22, 18, 12, 8, 2.6, 1.6, h, { edge: true });
        buf.capsule(12, 8, 14, 0, 1.6, 0.6, h, { edge: true });
        buf.capsule(54, 16, 62, 6, 2.2, 1.4, h, { edge: true, bias: -0.2 });
        buf.capsule(62, 6, 60, -1, 1.4, 0.5, h, { edge: true, bias: -0.2 });
      }
      break;
    }
    case 'mitre': {
      buf.poly(
        [
          [26, 22],
          [30, 2],
          [38, -4],
          [46, 2],
          [52, 22],
        ],
        P.prim,
        { shade: 'cyl', edge: true },
      );
      buf.line(38, -2, 38, 21, P.gold[3]);
      buf.line(27, 21, 51, 21, P.gold[2]);
      break;
    }
    case 'crown': {
      buf.poly(
        [
          [24, 20],
          [26, 10],
          [30, 16],
          [34, 6],
          [38, 15],
          [43, 5],
          [46, 15],
          [51, 9],
          [53, 20],
        ],
        P.gold,
        { shade: 'flat', flat: 2, edge: true },
      );
      buf.line(24, 19, 53, 19, P.gold[1]);
      buf.set(34, 15, hex('#d02a3a'));
      buf.set(43, 14, hex('#3a7ad8'));
      break;
    }
    case 'wizard': {
      buf.poly(
        [
          [8, 25],
          [36, 17],
          [70, 21],
          [60, 27],
          [36, 26],
          [14, 30],
        ],
        P.prim,
        { shade: 'cyl', edge: true },
      );
      buf.poly(
        [
          [24, 21],
          [34, 2],
          [56, -2],
          [44, 6],
          [52, 21],
        ],
        P.prim,
        { shade: 'cyl', edge: true },
      );
      buf.line(25, 20, 51, 20, P.sec[2]);
      break;
    }
  }
}

function accessories(buf: PixelBuf, L: PortraitLook, P: Pal) {
  const acc = L.accessories ?? [];
  if (acc.includes('earring')) {
    buf.set(24, 49, P.gold[3]);
    buf.set(24, 50, P.gold[2]);
  }
  if (acc.includes('horns')) {
    const h = ramp('#f0e4cc', { contrast: 1.1 });
    buf.capsule(28, 17, 22, 8, 2.2, 1.2, h, { edge: true });
    buf.capsule(22, 8, 24, 3, 1.2, 0.5, h, { edge: true });
    buf.capsule(48, 16, 53, 8, 1.8, 1, h, { edge: true, bias: -0.2 });
    buf.capsule(53, 8, 52, 4, 1, 0.4, h, { edge: true, bias: -0.2 });
  }
  if (acc.includes('dragon_mark')) {
    const g = L.glow ? hex(L.glow) : hex('#ff8a3a');
    for (const [x, y] of [
      [30, 60],
      [32, 62],
      [34, 60],
      [31, 64],
      [33, 65],
    ] as Pt[]) {
      buf.set(x, y, g);
      buf.set(x + 1, y, lighten(g, 0.4));
    }
  }
  if (acc.includes('glasses')) {
    const c = hex('#3a3040');
    for (const [x0, x1] of [
      [26, 36],
      [43, 51],
    ] as Pt[]) {
      buf.line(x0, 40, x1, 40, c);
      buf.line(x0, 48, x1, 48, c);
      buf.line(x0, 40, x0, 48, c);
      buf.line(x1, 40, x1, 48, c);
    }
    buf.line(36, 43, 43, 43, c);
  }
  if (acc.includes('bandage')) {
    buf.poly(
      [
        [46, 48],
        [52, 47],
        [52, 50],
        [46, 51],
      ],
      ramp('#f2ece0', { contrast: 0.5 }),
      { shade: 'flat', flat: 2, edge: true },
    );
  }
  if (acc.includes('feather')) {
    buf.capsule(54, 22, 66, 8, 1.8, 0.8, ramp('#e8e4dc'), { edge: true });
    buf.line(55, 21, 65, 9, hex('#a89880'));
  }
  if (acc.includes('mole')) buf.set(36, 55, darken(P.skin[0], 0.7));
  // 胡须
  const beard = L.beard ?? 'none';
  if (beard === 'beard' || beard === 'full') {
    buf.poly(
      [
        [25, 46],
        [30, 52],
        [37, 54],
        [46, 53],
        [52, 46],
        [53, 50],
        [48, 58],
        [42, beard === 'full' ? 66 : 62],
        [34, beard === 'full' ? 64 : 60],
        [27, 55],
      ],
      P.hair,
      { shade: 'dome', edge: true, bias: 0.05 },
    );
    // 留出嘴
    buf.line(38, 54, 44, 54, P.mouth);
    buf.line(37, 52, 46, 52, P.hair[1]);
    buf.line(38, 51, 45, 51, P.hair[2]);
  }
  if (beard === 'mustache') {
    buf.line(37, 52, 45, 52, P.hair[1]);
    buf.line(38, 51, 44, 51, P.hair[2]);
  }
  if (beard === 'stubble') {
    for (let x = 30; x <= 50; x += 2)
      for (let y = 51; y <= 58; y += 2) {
        const c = buf.get(x, y);
        if (c >>> 24 && (x + y) % 4 === 0) buf.set(x, y, darken(c, 0.85));
      }
  }
}

void rgba;
