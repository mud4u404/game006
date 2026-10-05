/**
 * 立绘入口
 * 原创日系立绘的 SVG 生成器在 ./anime.ts 中实现；没有立绘规格的角色显示名字首字。
 */
import type { Emotion } from '../portraitContracts';

type Renderer = (id: string, emotion: Emotion, mirrored: boolean) => string | null;
let renderer: Renderer | null = null;

export function setPortraitRenderer(r: Renderer) {
  renderer = r;
}

/** 返回立绘的 HTML（SVG 或占位） */
export function portraitHtml(id: string, name: string, emotion: Emotion = 'normal', mirrored = false): string {
  const svg = renderer?.(id, emotion, mirrored);
  if (svg) return svg;
  const ch = (name || '？').slice(0, 1);
  return `<div class="initial">${ch}</div>`;
}
