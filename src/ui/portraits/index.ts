/**
 * 立绘入口：程序生成的像素立绘（与战场精灵同一套配色）
 * 没有外观定义的说话者显示名字首字。
 */
import type { Emotion } from '../portraitContracts';
import { drawPortrait, PORTRAIT_H, PORTRAIT_W } from '@/art/portrait';
import { portraitLook } from '@/data/portraits';

type Renderer = (id: string, emotion: Emotion, mirrored: boolean) => string | null;

const cache = new Map<string, string>();

/** 默认渲染器：像素立绘 → dataURL（按 id+表情缓存） */
export function pixelPortraitUrl(id: string, emotion: Emotion = 'normal'): string | null {
  const key = `${id}:${emotion}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const look = portraitLook(id);
  if (!look) return null;
  const buf = drawPortrait(look, emotion);
  const c = document.createElement('canvas');
  c.width = PORTRAIT_W;
  c.height = PORTRAIT_H;
  buf.toCanvas(c.getContext('2d')!, 0, 0);
  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

let renderer: Renderer = (id, emotion, mirrored) => {
  const url = pixelPortraitUrl(id, emotion);
  if (!url) return null;
  return `<img class="px-portrait${mirrored ? ' mirrored' : ''}" src="${url}" alt="" draggable="false">`;
};

export function setPortraitRenderer(r: Renderer) {
  renderer = r;
}

/** 返回立绘的 HTML（像素图或占位） */
export function portraitHtml(id: string, name: string, emotion: Emotion = 'normal', mirrored = false): string {
  const html = renderer(id, emotion, mirrored);
  if (html) return html;
  const ch = (name || '？').slice(0, 1);
  return `<div class="initial">${ch}</div>`;
}
