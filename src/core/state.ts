import type { AttrKey, Effect, FeedTag, SectRank, SkillId } from '../content/types';
import type { Loadout } from '../engine/wuxue';
import { clearSaveSafely, readSave, writeSave } from './save';
import { nowMs } from './time';
import { syncBody } from '../engine/ren';

export interface SkillProg { r: number; p: number }
/** 约：npc 在 at 等你，due 是哪一个江湖日（core/time.ts 的 dayNo）；miss 是失约的后果 */
export interface Yue { id: string; npc: string; at: string; due: number; text: string; miss?: Effect[] }
export interface ShiState { at: string; since: number; seen?: string; done?: number }
export interface FeedEntry { t: FeedTag; x: string; n: number }
export type Tab = 'jianghu' | 'renwu' | 'wugong' | 'xingnang' | 'ditu';
/** 纸娃娃六个装备位在存档里的键：兵器、冠、衣、靴、佩、饰 */
export type GearKey = 'weapon' | 'head' | 'body' | 'feet' | 'waist' | 'ring';

export interface GameState {
  v: 4;
  /** 0 为序章，1 起为第几回 */
  chapter: number;
  /** 名，姓固定为沈 */
  name: string;
  loc: string;
  /** 江湖历的年：景和元年为 0（core/time.ts） */
  year: number;
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
  /** 先天根基，常人各二十（engine/person.ts） */
  attr: Record<AttrKey, number>;
  skills: Partial<Record<SkillId, SkillProg>>;
  /** 搭配：各槽位放的武功，见 docs/zhuangbei.md 第二节 */
  loadout: Loadout;
  /**
   * 身上的装备（纸娃娃，docs/zhuangbei.md 第三节）：装备位到道具 id。
   * 兵器 weapon 决定兵刃位的武功使不使得出来；冠 head、衣 body、靴 feet、佩 waist、饰 ring 给一点护体、闪避、内力、根基。
   * 第四版的旧存档只有 weapon，读档时照样读得出来（core/save.ts 的 repair 把不对的位置空出来）。
   */
  gear: Partial<Record<GearKey, string>>;
  /** 师门：同一时间只有一个，见 docs/menpai.md 第七节 */
  sect?: { school: string; rank: SectRank };
  /** 离开过的师门 */
  /** 离开过的师门：出师的回得去，叛门、被逐出的回不去（engine/shicheng.ts） */
  pastSects?: { school: string; how: '出师' | '叛门' | '逐出' }[];
  /** 功力（年）：一年一百点内力，靠静修的岁月熬（engine/ren.ts） */
  gongli: number;
  /** 身上的伤：手、足、内息各几级（零到三）。吃了重招才落下，打完才起作用，带到下一场；静修、歇息养好 */
  wounds: { hand: number; foot: number; inner: number };
  /**
   * 现实的钟（engine/shiguang.ts）：开局（或换算存档）时的现实时刻和那天的江湖日，上次在线的现实时刻。
   * 江湖跑不过现实：江湖的日数最多比开局以来的现实小时数多十日；下线就是静修，现实一小时算江湖一日。
   */
  real: { start: number; startDay: number; seen: number };
  /** 约：和谁、在哪里、哪一日（江湖日）；失约的后果 */
  yue: Yue[];
  /** 心魔：几层（可以是小数，慢慢淡），为了什么事 */
  xinmo: { n: number; why: string };
  /** 营生（engine/shenfen.ts）：渔家、游侠、镖师……；本行里的地位（零被辞退，一到三）；哪一日入的行 */
  shenfen: { id: string; standing: number; since: number };
  /** 手上的差事：哪一件、约期（江湖日）；办完的差事上回是哪一日办完的 */
  job: { id: string; due: number } | null;
  jobLog: Record<string, number>;
  /** 人情备注：为什么记得这个人，例如「湖畔切磋，不打不相识」 */
  relNote?: Record<string, string>;
  /** 历练：江湖上攒下的见识与实战，闭关时化为武功进境（engine/lilian.ts） */
  lilian: number;
  /** 和每个对手最近交手的记录：七天内反复打同一人，历练一次比一次少 */
  foeLog?: Record<string, { n: number; day: number }>;
  /**
   * 世事（engine/shishi.ts，docs/huojianghu.md）：每件事走到哪一步、哪一刻走到的（core/time.ts 的 absMin）、
   * 玩家知道到哪一步（没有就是还不知道）、了结过几回。还没起头的事不在这里
   */
  shi?: Record<string, ShiState>;
  /** 打听：每个人今天问过没有（江湖日） */
  asked?: Record<string, number>;
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

/** 跳过序章时的根基：和走完童年三忆的样子相当（常人各二十） */
/** 开局时的现实钟：现在，和开局那天的江湖日 */
export const realNow = (day: number): GameState['real'] => ({ start: nowMs(), startDay: day, seen: nowMs() });

export const ATTR0: Record<AttrKey, number> = { 体魄: 22, 根骨: 22, 身法: 23, 悟性: 23, 胆魄: 22 };

/** 新游戏：从序章「瓜洲夜雨」开始。一个只会几招粗浅功夫的渔家少年，属性略低，由童年三忆补上 */
export function newGame(): GameState {
  const s: GameState = {
    v: 4, chapter: 0, name: '孤舟', loc: 'gz_home', year: 0, month: 3, day: 5, min: 15 * 60 + 20, weather: '阴',
    // 气血、内力的上限由「人」算出来（engine/ren.ts 的 syncBody）；功力三年：江伯教过吐纳
    hp: 1e9, hpMax: 0, mp: 150, mpMax: 0, gongli: 3, wounds: { hand: 0, foot: 0, inner: 0 },
    real: realNow(65), yue: [], xinmo: { n: 0, why: '' }, shenfen: { id: 'yumin', standing: 1, since: 65 }, job: null, jobLog: {},
    silver: 30, items: { qingfeng: 1, jcy: 1, fhs: 3 },
    quests: { prologue: 0 }, track: 'prologue',
    flags: {}, rel: { jiangbo: '相依为命' }, title: '', xia: 0, eming: 0,
    attr: { 体魄: 20, 根骨: 20, 身法: 20, 悟性: 20, 胆魄: 20 }, lilian: 0, encLog: {}, lastEnc: -1e9,
    // 渔家少年：江伯只教过几招防身的粗浅功夫，都还没入门（从零练起，见 docs/audit.md）
    skills: { hanjiang: { r: 0, p: 0 }, xinfa: { r: 0, p: 0 }, taxue: { r: 0, p: 0 } },
    loadout: { neigong: 'xinfa', qinggong: 'taxue', weapon: 'hanjiang' }, gear: { weapon: 'qingfeng' },
    feed: [{ t: '传闻', x: '江上这两天来了几条生船，不打鱼，专打听人。', n: 0 }],
    story: '', sel: null, reply: null, tab: 'jianghu'
  };
  syncBody(s);
  s.mp = Math.round(s.mpMax / 2);
  return s;
}

/** 跳过序章，直接从扬州开始：和走完序章的样子相当（江伯故去，学了断水的起手；惊鸿剑要自己去小金山悟） */
export function skipToYangzhou(): GameState {
  const s: GameState = {
    v: 4, chapter: 1, name: '孤舟', loc: 'hu', year: 0, month: 3, day: 7, min: 7 * 60 + 40, weather: '微雨',
    hp: 1e9, hpMax: 0, mp: 1e9, mpMax: 0, gongli: 3, wounds: { hand: 0, foot: 0, inner: 0 },
    real: realNow(67), yue: [], xinmo: { n: 0, why: '' }, shenfen: { id: 'youxia', standing: 1, since: 67 }, job: null, jobLog: {},
    silver: 120, items: { qingfeng: 1, jcy: 3, fhs: 5, jade: 1, scroll: 1 },
    quests: { prologue: 3, main1: 0 }, track: 'main1',
    flags: { skipped: true }, rel: { liu: '素不相识' }, title: '', xia: 12, eming: 0,
    // 历练：序章了结 300，加上那一夜两场被江伯救下的恶战 26 + 180（engine/lilian.ts）
    attr: { ...ATTR0 }, lilian: 506, encLog: {}, lastEnc: -1e9,
    skills: { hanjiang: { r: 0, p: 120 }, taxue: { r: 0, p: 50 }, xinfa: { r: 0, p: 80 }, duanshui: { r: 0, p: 10 } },
    loadout: { neigong: 'xinfa', qinggong: 'taxue', weapon: 'hanjiang', ult: 'duanshui' }, gear: { weapon: 'qingfeng' },
    feed: [
      { t: '江湖', x: '你在扬州城外的破庙里歇了一夜，江伯教的那几招剑法，比划来比划去，总觉得差着火候。', n: 0 },
      { t: '传闻', x: '黑风寨劫了漕帮三船盐货，漕帮放出悬赏。', n: 0 }
    ],
    story: '', sel: 'liu', reply: null, tab: 'jianghu'
  };
  // 气血、内力上限由「人」算出来；那一夜的伤还没全好，气血八成半、内力三分之二
  syncBody(s);
  s.hp = Math.round(s.hpMax * 0.85);
  s.mp = Math.round(s.mpMax * 2 / 3);
  return s;
}

export let S: GameState = newGame();
export function setState(s: GameState): void { S = s; }

/* 存档的读写、迁移、备份都在 core/save.ts，这里只是转一手 */
/** 写存档，顺手记下「上次在线」的现实时刻（下线静修从这一刻算起） */
export function save(): void { S.real.seen = nowMs(); writeSave(S); }

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
