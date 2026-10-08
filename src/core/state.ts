import type { AttrKey, FeedTag, SectRank, SkillId } from '../content/types';
import type { Loadout } from '../engine/wuxue';
import { clearSaveSafely, readSave, writeSave } from './save';
import { syncAttr } from '../engine/gengu';

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
  /** 恶名，与侠义互不抵消 */
  eming: number;
  attr: Record<AttrKey, number>;
  skills: Partial<Record<SkillId, SkillProg>>;
  /** 搭配：各槽位放的武功，见 docs/wuxue.md */
  loadout: Loadout;
  /** 师门：同一时间只有一个，见 docs/menpai.md 第七节 */
  sect?: { school: string; rank: SectRank };
  /** 离开过的师门 */
  pastSects?: { school: string; how: '出师' | '叛门' }[];
  /** 根基已经折算进气血、内力上限的部分（engine/gengu.ts 的 syncAttr 用） */
  attrApplied?: { hp: number; mp: number };
  /** 人情备注：为什么记得这个人，例如「湖畔切磋，不打不相识」 */
  relNote?: Record<string, string>;
  /** 历练：江湖上攒下的见识与实战，闭关时化为武功进境（engine/lilian.ts） */
  lilian: number;
  /** 和每个对手最近交手的记录：七天内反复打同一人，历练一次比一次少 */
  foeLog?: Record<string, { n: number; day: number }>;
  /** 路遇：每一条最近遇到是第几天；上一次路遇的时刻（engine/encounter.ts） */
  encLog: Record<string, number>;
  lastEnc: number;
  feed: FeedEntry[];
  /** 战后说书，供说书人复述 */
  story: string;
  sel: string | null;
  reply: { id: string; text: string } | null;
  tab: Tab;
}

export const ATTR0: Record<AttrKey, number> = { 体魄: 14, 根骨: 12, 身法: 16, 悟性: 15, 胆魄: 11 };

/** 新游戏：从序章「瓜洲夜雨」开始。一个只会几招粗浅功夫的渔家少年，属性略低，由童年三忆补上 */
export function newGame(): GameState {
  return {
    v: 2, chapter: 0, name: '孤舟', loc: 'gz_home', month: 3, day: 5, min: 15 * 60 + 20, weather: '阴',
    hp: 600, hpMax: 600, mp: 150, mpMax: 300,
    silver: 30, items: { jcy: 1, fhs: 3 },
    quests: { prologue: 0 }, track: 'prologue',
    flags: {}, rel: { jiangbo: '相依为命' }, title: '', xia: 0, eming: 0,
    attr: { 体魄: 13, 根骨: 11, 身法: 14, 悟性: 13, 胆魄: 10 }, lilian: 0, encLog: {}, lastEnc: -1e9,
    // 渔家少年：江伯只教过几招防身的粗浅功夫，都还没入门（从零练起，见 docs/audit.md）
    skills: { hanjiang: { r: 0, p: 0 }, xinfa: { r: 0, p: 0 }, taxue: { r: 0, p: 0 } },
    loadout: { neigong: 'xinfa', qinggong: 'taxue', main: 'hanjiang' },
    feed: [{ t: '传闻', x: '江上这两天来了几条生船，不打鱼，专打听人。', n: 0 }],
    story: '', sel: null, reply: null, tab: 'jianghu'
  };
}

/** 跳过序章，直接从扬州开始：和走完序章的样子相当（江伯故去，学了断水的起手；惊鸿剑要自己去小金山悟） */
export function skipToYangzhou(): GameState {
  const s: GameState = {
    v: 2, chapter: 1, name: '孤舟', loc: 'hu', month: 3, day: 7, min: 7 * 60 + 40, weather: '微雨',
    hp: 520, hpMax: 600, mp: 200, mpMax: 300,
    silver: 120, items: { jcy: 3, fhs: 5, jade: 1, scroll: 1 },
    quests: { prologue: 3, main1: 0 }, track: 'main1',
    flags: { skipped: true }, rel: { liu: '素不相识' }, title: '', xia: 12, eming: 0,
    // 历练：序章了结 300，加上那一夜两场被江伯救下的恶战 26 + 180（engine/lilian.ts）
    attr: { ...ATTR0 }, lilian: 506, encLog: {}, lastEnc: -1e9,
    skills: { hanjiang: { r: 0, p: 120 }, taxue: { r: 0, p: 50 }, xinfa: { r: 0, p: 80 }, duanshui: { r: 0, p: 10 } },
    loadout: { neigong: 'xinfa', qinggong: 'taxue', main: 'hanjiang', ult: 'duanshui' },
    feed: [
      { t: '江湖', x: '你在扬州城外的破庙里歇了一夜，江伯教的那几招剑法，比划来比划去，总觉得差着火候。', n: 0 },
      { t: '传闻', x: '黑风寨劫了漕帮三船盐货，漕帮放出悬赏。', n: 0 }
    ],
    story: '', sel: 'liu', reply: null, tab: 'jianghu'
  };
  // 根基折算进气血、内力上限（engine/gengu.ts）
  syncAttr(s);
  return s;
}

export let S: GameState = newGame();
export function setState(s: GameState): void { S = s; }

/* 存档的读写、迁移、备份都在 core/save.ts，这里只是转一手 */
export function save(): void { writeSave(S); }

let broken = false;
/** 读存档；读不出来时返回 null，并且 saveBroken() 为真（原存档已另存，不会被覆盖） */
export function load(): GameState | null {
  const r = readSave();
  broken = r.broken;
  return r.state;
}
export const saveBroken = (): boolean => broken;

export function clearSave(): void { clearSaveSafely(); }

export function fullName(): string { return '沈' + S.name; }

export function pushFeed(t: FeedTag, x: string): void {
  S.feed.unshift({ t, x, n: Date.now() });
  S.feed.length = Math.min(S.feed.length, 20);
}
