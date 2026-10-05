/**
 * 精灵图集：把一个单位的所有视角与动作帧绘制到一张画布上（按外观缓存）
 * 布局：列 = 帧（ANIM_ORDER 顺序），行 0 = 正面，行 1 = 背面
 */
import type { UnitModelSpec } from '@/render/contracts';
import { drawHumanoid, SPRITE_H, SPRITE_W, type View } from './humanoid';
import { ANIM_FRAMES, ANIM_ORDER, FRAME_COLUMN, poseFor, TOTAL_FRAMES, type SpriteAnim } from './frames';
import { PixelBuf } from './pixel';
import { creatureFrame, drawCreature } from './creatures';

export interface SpriteAtlas {
  canvas: HTMLCanvasElement;
  frameW: number;
  frameH: number;
  cols: number;
  rows: number;
  /** 脚底在帧内的像素坐标 */
  anchorX: number;
  anchorY: number;
  /** 待机正面帧最高不透明像素距脚底的像素高度 */
  top: number;
  /** 脚下光环直径（世界单位） */
  ring: number;
  /** 体型缩放已直接画进像素（不再放大面片） */
  baked: boolean;
}

const cache = new Map<string, SpriteAtlas>();

export function atlasKey(spec: UnitModelSpec): string {
  const { team, ...rest } = spec;
  // 坐骑/魔物的配色与阵营有关，人形与阵营无关
  const teamMatters = spec.body !== 'humanoid' && spec.body !== 'skeleton' ? true : !!(spec.mount && spec.mount !== 'none');
  return JSON.stringify(rest) + (teamMatters ? team : '');
}

export function frameIndex(anim: SpriteAnim, frame: number): number {
  return FRAME_COLUMN[anim] + Math.min(frame, ANIM_FRAMES[anim].frames - 1);
}

export function isSpriteHumanoid(spec: UnitModelSpec): boolean {
  return (spec.body === 'humanoid' || spec.body === 'skeleton') && (!spec.mount || spec.mount === 'none');
}

function topOf(buf: PixelBuf, anchorY: number): number {
  for (let y = 0; y < buf.h; y++) for (let x = 0; x < buf.w; x++) if (buf.data[y * buf.w + x] >>> 24) return anchorY - y;
  return anchorY;
}

/** 生成（或取缓存）单位图集：人形步兵、骑乘单位、魔物 */
export function unitAtlas(spec: UnitModelSpec): SpriteAtlas {
  const key = atlasKey(spec);
  const hit = cache.get(key);
  if (hit) return hit;
  const human = isSpriteHumanoid(spec);
  const info = human ? { w: SPRITE_W, h: SPRITE_H, anchorX: 24, anchorY: 61, ring: 0.68 } : creatureFrame(spec);
  const cols = TOTAL_FRAMES;
  const rows = 2;
  const canvas = document.createElement('canvas');
  canvas.width = cols * info.w;
  canvas.height = rows * info.h;
  const ctx = canvas.getContext('2d')!;
  const buf = new PixelBuf(info.w, info.h);
  const views: View[] = ['front', 'back'];
  let top = 0;
  views.forEach((view, row) => {
    for (const anim of ANIM_ORDER) {
      for (let f = 0; f < ANIM_FRAMES[anim].frames; f++) {
        buf.clear();
        if (human) drawHumanoid(buf, spec, poseFor(anim, f, spec.weapon), view);
        else drawCreature(buf, spec, anim, f, view);
        buf.outline(0.38);
        if (row === 0 && anim === 'idle' && f === 0) top = topOf(buf, info.anchorY);
        buf.toCanvas(ctx, frameIndex(anim, f) * info.w, row * info.h);
      }
    }
  });
  const atlas: SpriteAtlas = { canvas, frameW: info.w, frameH: info.h, cols, rows, anchorX: info.anchorX, anchorY: info.anchorY, top, ring: info.ring, baked: !human };
  cache.set(key, atlas);
  return atlas;
}

/** 兼容旧名 */
export const humanoidAtlas = unitAtlas;
