/**
 * 玩家设置（本地保存）
 */
import type { Quality } from '@/render/contracts';
import type { Resolution } from '@/render/engine';

export interface Settings {
  quality: Quality;
  resolution: Resolution;
  /** 战斗演出：完整特写 / 简略（不切镜头） / 关闭 */
  battleAnim: 'full' | 'short' | 'off';
  /** 文字速度：每秒字数，0 = 瞬间 */
  textSpeed: number;
  master: number;
  music: number;
  sfx: number;
  /** 所有单位行动完毕后自动结束回合 */
  autoEnd: boolean;
  hpBars: boolean;
  grid: boolean;
  /** 敌方行动速度倍率 */
  enemySpeed: number;
}

const KEY = 'emberoath.settings';

export const DEFAULT_SETTINGS: Settings = {
  quality: 'high',
  resolution: 'auto',
  battleAnim: 'full',
  textSpeed: 45,
  master: 0.8,
  music: 0.7,
  sfx: 0.8,
  autoEnd: true,
  hpBars: true,
  grid: true,
  enemySpeed: 1.5,
};

export function loadSettings(): Settings {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* 忽略 */
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 忽略 */
  }
}
