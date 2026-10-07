import type { AttrKey, FeedTag, SkillId } from '../content/types';

export interface SkillProg { r: number; p: number }
export interface FeedEntry { t: FeedTag; x: string; n: number }
export type Tab = 'jianghu' | 'renwu' | 'wugong' | 'xingnang' | 'ditu';

export interface GameState {
  v: 2;
  /** 0 为序章，1 起为第几回 */
  chapter: number;
  /** 名，姓固定为沈 */
  name: string;
  loc: string;
  month: number;
  day: number;
  min: number;
  weather: string;
  hp: number;
  hpMax: number;
  mp: number;
  mpMax: number;
  silver: number;
  items: Record<string, number>;
  quests: Record<string, number>;
  track: string;
  flags: Record<string, boolean>;
  rel: Record<string, string>;
  title: string;
  xia: number;
  attr: Record<AttrKey, number>;
  skills: Partial<Record<SkillId, SkillProg>>;
  feed: FeedEntry[];
  /** 战后说书，供说书人复述 */
  story: string;
  sel: string | null;
  reply: { id: string; text: string } | null;
  tab: Tab;
}

export const ATTR0: Record<AttrKey, number> = { 体魄: 14, 根骨: 12, 身法: 16, 悟性: 15, 胆魄: 11 };

/** 新游戏：从序章「瓜洲夜雨」开始。属性略低，由童年三忆补上 */
export function newGame(): GameState {
  return {
    v: 2, chapter: 0, name: '孤舟', loc: 'gz_home', month: 3, day: 5, min: 15 * 60 + 20, weather: '阴',
    hp: 1000, hpMax: 1000, mp: 600, mpMax: 800,
    silver: 30, items: { jcy: 1, fhs: 3 },
    quests: { prologue: 0 }, track: 'prologue',
    flags: {}, rel: { jiangbo: '相依为命' }, title: '', xia: 0,
    attr: { 体魄: 13, 根骨: 11, 身法: 14, 悟性: 13, 胆魄: 10 },
    skills: { hanjiang: { r: 1, p: 200 }, xinfa: { r: 1, p: 150 }, taxue: { r: 2, p: 0 } },
    feed: [{ t: '传闻', x: '江上这两天来了几条生船，不打鱼，专打听人。', n: 0 }],
    story: '', sel: null, reply: null, tab: 'jianghu'
  };
}

/** 跳过序章，直接从扬州开始（与原型一致的配置） */
export function skipToYangzhou(): GameState {
  return {
    v: 2, chapter: 1, name: '孤舟', loc: 'hu', month: 3, day: 7, min: 7 * 60 + 40, weather: '微雨',
    hp: 820, hpMax: 1000, mp: 460, mpMax: 800,
    silver: 120, items: { jcy: 3, fhs: 5, jade: 1, scroll: 1 },
    quests: { prologue: 3, main1: 0 }, track: 'main1',
    flags: { skipped: true }, rel: { liu: '素不相识' }, title: '', xia: 12,
    attr: { ...ATTR0 },
    skills: { hanjiang: { r: 1, p: 340 }, jinghong: { r: 0, p: 80 }, taxue: { r: 2, p: 120 }, xinfa: { r: 1, p: 260 }, duanshui: { r: 0, p: 10 } },
    feed: [
      { t: '出关', x: '闭关七日，内力 +36，「寒江剑法」略有小成。', n: 0 },
      { t: '传闻', x: '黑风寨劫了漕帮三船盐货，漕帮放出悬赏。', n: 0 }
    ],
    story: '', sel: 'liu', reply: null, tab: 'jianghu'
  };
}

const KEY = 'jhyy-save-v2';

export let S: GameState = newGame();
export function setState(s: GameState): void { S = s; }

export function save(): void {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 隐私模式等情况下存不了，游戏照常进行 */ }
}

export function load(): GameState | null {
  try {
    const t = localStorage.getItem(KEY);
    if (!t) return null;
    const o = JSON.parse(t) as GameState;
    return o && o.v === 2 ? o : null;
  } catch { return null; }
}

export function clearSave(): void {
  try { localStorage.removeItem(KEY); } catch { /* 同上 */ }
}

export function fullName(): string { return '沈' + S.name; }

export function pushFeed(t: FeedTag, x: string): void {
  S.feed.unshift({ t, x, n: Date.now() });
  S.feed.length = Math.min(S.feed.length, 20);
}
