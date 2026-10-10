import type { AttrKey, Effect, FeedTag, LeaveHow, SectRank, SkillId } from '../content/types';
import type { Loadout } from '../engine/wuxue';
import type { EventRec } from '../engine/xingdong';
import { clearSaveSafely, readSave, writeSave } from './save';
import { nowMs } from './time';
import { syncBody } from '../engine/ren';
import { initWorld, type WorldState } from '../engine/shijie';
import { seedOf } from '../engine/rng';

export interface SkillProg { r: number; p: number }
/** 约：npc 在 at 等你，due 是哪一个江湖日（core/time.ts 的 dayNo）；miss 是失约的后果 */
export interface Yue { id: string; npc: string; at: string; due: number; text: string; miss?: Effect[] }
/** 世事：走到哪一步、从何时起、玩家知道到哪一步、了结过几回、玩家插过手没有 */
export interface ShiState { at: string; since: number; seen?: string; /** 玩家上一回知道的那一步（见闻簿留前一步的一行） */ prev?: string; done?: number; hand?: true }
/** 玩家知道到哪一步：换了一步，原来知道的记作 prev */
export function markSeen(st: ShiState, step: string): void {
  if (st.seen === step) return;
  if (st.seen !== undefined) st.prev = st.seen;
  st.seen = step;
}
/** 静修的住处 */
export type Zhu = 'inn' | 'lusu' | 'home';
export interface FeedEntry { t: FeedTag; x: string; n: number }
export type Tab = 'jianghu' | 'renwu' | 'wugong' | 'xingnang' | 'ditu';
/** 纸娃娃六个装备位在存档里的键：兵器、冠、衣、靴、佩、饰 */
export type GearKey = 'weapon' | 'head' | 'body' | 'feet' | 'waist' | 'ring';

export interface GameState {
  /** 范围：个人；写入口：core/save.ts */
  v: 5;
  /** 0 为序章，1 起为第几回；范围：个人；写入口：engine/xingdong.ts */
  chapter: number;
  /** 名，姓固定为沈；范围：个人；写入口：engine/xingdong.ts */
  name: string;
  /** 范围：个人；写入口：engine/world.ts（通行） */
  loc: string;
  /** 江湖历的年：景和元年为 0（core/time.ts）；范围：个人；写入口：core/time.ts（时间引擎） */
  year: number;
  /** 范围：个人；写入口：core/time.ts（时间引擎） */
  month: number;
  /** 范围：个人；写入口：core/time.ts（时间引擎） */
  day: number;
  /** 范围：个人；写入口：core/time.ts（时间引擎） */
  min: number;
  /** 范围：个人；写入口：engine/xingdong.ts（经 engine/dsl.ts 结算） */
  weather: string;
  /** 范围：个人；写入口：engine/xingdong.ts、engine/jiesuan.ts */
  hp: number;
  /** 范围：个人；写入口：engine/ren.ts（人物上限） */
  hpMax: number;
  /** 范围：个人；写入口：engine/xingdong.ts、engine/jiesuan.ts */
  mp: number;
  /** 范围：个人；写入口：engine/ren.ts（人物上限） */
  mpMax: number;
  /** 范围：个人；写入口：engine/xingdong.ts */
  silver: number;
  /** 范围：个人；写入口：engine/xingdong.ts */
  items: Record<string, number>;
  /** 范围：个人；写入口：engine/xingdong.ts */
  quests: Record<string, number>;
  /** 范围：个人；写入口：engine/xingdong.ts */
  track: string;
  /** 范围：个人；写入口：engine/xingdong.ts；混：个人/世界旗标共用旧档容器，逐项范围见 docs/qibiao-fanwei.md */
  flags: Record<string, boolean>;
  /** 范围：个人；写入口：engine/xingdong.ts */
  rel: Record<string, string>;
  /** 范围：个人；写入口：engine/xingdong.ts */
  title: string;
  /** 范围：个人；写入口：engine/xingdong.ts */
  xia: number;
  /** 恶名，与侠义互不抵消；范围：个人；写入口：engine/xingdong.ts */
  eming: number;
  /** 先天根基，常人各二十（engine/person.ts）；范围：个人；写入口：engine/xingdong.ts */
  attr: Record<AttrKey, number>;
  /** 范围：个人；写入口：engine/xingdong.ts */
  skills: Partial<Record<SkillId, SkillProg>>;
  /** 搭配：各槽位放的武功，见 docs/zhuangbei.md 第二节；范围：个人；写入口：engine/xingdong.ts */
  loadout: Loadout;
  /**
   * 身上的装备（纸娃娃，docs/zhuangbei.md 第三节）：装备位到道具 id。
   * 兵器 weapon 决定兵刃位的武功使不使得出来；冠 head、衣 body、靴 feet、佩 waist、饰 ring 给一点护体、闪避、内力、根基。
   * 第四版的旧存档只有 weapon，读档时照样读得出来（core/save.ts 的 repair 把不对的位置空出来）。
   * 范围：个人；写入口：engine/xingdong.ts
   */
  gear: Partial<Record<GearKey, string>>;
  /** 师门：同一时间只有一个，见 docs/menpai.md 第七节；范围：个人；写入口：engine/xingdong.ts */
  sect?: { school: string; rank: SectRank };
  /** 离开过的师门 */
  /** 离开过的师门：出师的回得去，叛门、被逐出的回不去（engine/shicheng.ts）；范围：个人；写入口：engine/xingdong.ts */
  pastSects?: { school: string; how: LeaveHow }[];
  /** 功力（年）：一年一百点内力，靠静修的岁月熬（engine/ren.ts）；范围：个人；写入口：engine/xingdong.ts */
  gongli: number;
  /**
   * 身上的伤：手、足、内息各几级（零到三）。吃了重招才落下，打完才起作用，带到下一场（engine/shang.ts）。
   * 一级是轻伤，过一日自己好；二级以上是重伤，要找郎中看伤或者服药
   * 范围：个人；写入口：engine/xingdong.ts
   */
  wounds: { hand: number; foot: number; inner: number };
  /** 哪几处是轻伤、从江湖历第几分钟起算（过一日自己好，engine/shang.ts 的 healLight）；范围：个人；写入口：engine/xingdong.ts */
  lightSince?: Partial<Record<'hand' | 'foot' | 'inner', number>>;
  /** 到过的最高档次：升了档要提一句（ui/shell.ts 的 render，审查 G13）；范围：个人；写入口：engine/tupo.ts */
  tierTop?: number;
  /**
   * 现实的钟（engine/shiguang.ts）：开局（或换算存档）时的现实时刻和那天的江湖日，上次在线的现实时刻。
   * 江湖跑不过现实：江湖的日数最多比开局以来的现实小时数多十日；下线就是静修，现实一小时算江湖一日。
   * 范围：个人；写入口：core/save.ts、engine/shiguang.ts
   */
  real: { start: number; startDay: number; seen: number; /** 已经用掉的修为日（闭关、静修里真长了修为的日子），铁律只管它（宪章 P7，10-09 改） */ grown?: number };
  /** 约：和谁、在哪里、哪一日（江湖日）；失约的后果；范围：个人；写入口：engine/xingdong.ts */
  yue: Yue[];
  /** 心魔：几层（可以是小数，慢慢淡），为了什么事；范围：个人；写入口：engine/xingdong.ts */
  xinmo: { n: number; why: string };
  /** 营生（engine/shenfen.ts）：渔家、游侠、镖师……；本行里的地位（零被辞退，一到三）；哪一日入的行；范围：个人；写入口：engine/xingdong.ts */
  shenfen: { id: string; standing: number; since: number };
  /** 闭关、下线静修住哪儿：客栈（一日一百文）、露宿（不花钱，打八折）、师门（有师门的，不花钱）。不写是客栈（engine/shiguang.ts 的 zhuOf）；范围：个人；写入口：engine/xingdong.ts */
  zhu?: Zhu;
  /** 手上的差事：哪一件、约期（江湖日）；办完的差事上回是哪一日办完的；范围：个人；写入口：engine/xingdong.ts */
  job: { id: string; due: number } | null;
  /** 范围：个人；写入口：engine/xingdong.ts */
  jobLog: Record<string, number>;
  /** 行动结算记录：只留最近三百条，旧档从空记录继续；范围：个人；写入口：engine/xingdong.ts（事件记录） */
  log: EventRec[];
  /** 正在读的剧情及本次遇见的凭据；刷新沿用，收尾清掉，旧档可缺省；范围：个人；写入口：engine/xingdong.ts */
  storyAt?: { id: string; i: number; started: string };
  /** 一个江湖日只做一回的营生（零工、讨赏钱）：做的是哪一件 → 哪一日做的（dayNo）。效果 today 写、条件 doneToday 读；过了日子的自动清掉；范围：个人；写入口：engine/xingdong.ts */
  dayLog?: Record<string, number>;
  /** 人情备注：为什么记得这个人，例如「湖畔切磋，不打不相识」；范围：个人；写入口：engine/xingdong.ts */
  relNote?: Record<string, string>;
  /** 历练：江湖上攒下的见识与实战，闭关时化为武功进境（engine/lilian.ts）；范围：个人；写入口：engine/xingdong.ts */
  lilian: number;
  /** 和每个对手最近交手的记录：七天内反复打同一人，历练一次比一次少；范围：世界；写入口：engine/lilian.ts、engine/xingdong.ts */
  foeLog?: Record<string, { n: number; day: number }>;
  /** 掂过斤两的人（对手 id、当时看到的称呼），最近的在后，最多二十个（engine/zhanli.ts）；人物页「认得的人」用；范围：个人；写入口：engine/zhanli.ts */
  diao?: { id: string; name: string }[];
  /**
   * 世事（engine/shishi.ts，docs/huojianghu.md）：每件事走到哪一步、哪一刻走到的（core/time.ts 的 absMin）、
   * 玩家知道到哪一步（没有就是还不知道）、了结过几回。还没起头的事不在这里
   * 范围：世界；写入口：engine/shishi.ts、engine/xingdong.ts
   */
  shi?: Record<string, ShiState>;
  /** 门派贡献：每个门派各记各的（替师门办差攒下，升地位、学外门以上的武功拿它去换；docs/menpai.md 第七节第八条）；范围：个人；写入口：engine/xingdong.ts */
  gongxian?: Record<string, number>;
  /** 打听：每个人今天问过没有（江湖日）；范围：个人；写入口：engine/xingdong.ts */
  asked?: Record<string, number>;
  /** 暂时走开的人：到江湖历的第几分钟才回来（效果 away，engine/world.ts）；范围：世界；写入口：engine/xingdong.ts（经 engine/dsl.ts 结算） */
  away?: Record<string, number>;
  /** 路遇：每一条最近遇到是第几天；上一次路遇的时刻（engine/encounter.ts）；范围：世界；写入口：engine/encounter.ts、engine/xingdong.ts */
  encLog: Record<string, number>;
  /** 范围：世界；写入口：engine/encounter.ts、engine/xingdong.ts */
  lastEnc: number;
  /**
   * 世界状态（engine/shijie.ts，docs/huo-shijie.md 3.2，存档第五版）：势力、地方、人的处境、世界的种子。
   * 种子开局定下（名字和开局的现实时刻），同一个种子、同样的操作，跑出同一个江湖
   * 范围：世界；写入口：engine/shijie.ts、engine/xingdong.ts
   */
  w: WorldState;
  /** 玩家亲耳听过的传闻（engine/chuanwen.ts 的传闻 id）：打听、邸报不再重复说。最多留三百条，传闻清掉了跟着清；范围：个人；写入口：engine/xingdong.ts */
  heard: string[];
  /** 范围：界面；写入口：core/state.ts（pushFeed）、ui */
  feed: FeedEntry[];
  /** 战后说书，供说书人复述；范围：个人；写入口：engine/xingdong.ts */
  story: string;
  /** 范围：界面；写入口：ui */
  sel: string | null;
  /** 范围：界面；写入口：ui */
  reply: { id: string; text: string } | null;
  /** 范围：界面；写入口：ui */
  tab: Tab;
}

/** 字段归属约定（docs/sheji-012-013.md 第 012 节），不在此强制拦截旧写入点。
 * 初始化、读档修复统一由 core/state.ts、core/save.ts 写；下表登记日常写入口。
 * flags 的 scope 指旧档容器归个人；mixed 明确其中混有世界旗标，不能只按 scope 分派旗标。
 */
type FieldOwner = Readonly<{ scope: '个人' | '世界' | '界面'; writer: string; mixed?: '混' }>;
export const FIELD_OWNER = Object.freeze({
  v: { scope: '个人', writer: 'core/save.ts' },
  chapter: { scope: '个人', writer: 'engine/xingdong.ts' },
  name: { scope: '个人', writer: 'engine/xingdong.ts' },
  loc: { scope: '个人', writer: 'engine/world.ts（通行）' },
  year: { scope: '个人', writer: 'core/time.ts（时间引擎）' },
  month: { scope: '个人', writer: 'core/time.ts（时间引擎）' },
  day: { scope: '个人', writer: 'core/time.ts（时间引擎）' },
  min: { scope: '个人', writer: 'core/time.ts（时间引擎）' },
  weather: { scope: '个人', writer: 'engine/xingdong.ts（经 engine/dsl.ts 结算）' },
  hp: { scope: '个人', writer: 'engine/xingdong.ts、engine/jiesuan.ts' },
  hpMax: { scope: '个人', writer: 'engine/ren.ts（人物上限）' },
  mp: { scope: '个人', writer: 'engine/xingdong.ts、engine/jiesuan.ts' },
  mpMax: { scope: '个人', writer: 'engine/ren.ts（人物上限）' },
  silver: { scope: '个人', writer: 'engine/xingdong.ts' },
  items: { scope: '个人', writer: 'engine/xingdong.ts' },
  quests: { scope: '个人', writer: 'engine/xingdong.ts' },
  track: { scope: '个人', writer: 'engine/xingdong.ts' },
  flags: { scope: '个人', writer: 'engine/xingdong.ts', mixed: '混' },
  rel: { scope: '个人', writer: 'engine/xingdong.ts' },
  title: { scope: '个人', writer: 'engine/xingdong.ts' },
  xia: { scope: '个人', writer: 'engine/xingdong.ts' },
  eming: { scope: '个人', writer: 'engine/xingdong.ts' },
  attr: { scope: '个人', writer: 'engine/xingdong.ts' },
  skills: { scope: '个人', writer: 'engine/xingdong.ts' },
  loadout: { scope: '个人', writer: 'engine/xingdong.ts' },
  gear: { scope: '个人', writer: 'engine/xingdong.ts' },
  sect: { scope: '个人', writer: 'engine/xingdong.ts' },
  pastSects: { scope: '个人', writer: 'engine/xingdong.ts' },
  gongli: { scope: '个人', writer: 'engine/xingdong.ts' },
  wounds: { scope: '个人', writer: 'engine/xingdong.ts' },
  lightSince: { scope: '个人', writer: 'engine/xingdong.ts' },
  tierTop: { scope: '个人', writer: 'engine/tupo.ts' },
  real: { scope: '个人', writer: 'core/save.ts、engine/shiguang.ts' },
  yue: { scope: '个人', writer: 'engine/xingdong.ts' },
  xinmo: { scope: '个人', writer: 'engine/xingdong.ts' },
  shenfen: { scope: '个人', writer: 'engine/xingdong.ts' },
  zhu: { scope: '个人', writer: 'engine/xingdong.ts' },
  job: { scope: '个人', writer: 'engine/xingdong.ts' },
  jobLog: { scope: '个人', writer: 'engine/xingdong.ts' },
  log: { scope: '个人', writer: 'engine/xingdong.ts（事件记录）' },
  storyAt: { scope: '个人', writer: 'engine/xingdong.ts' },
  dayLog: { scope: '个人', writer: 'engine/xingdong.ts' },
  relNote: { scope: '个人', writer: 'engine/xingdong.ts' },
  lilian: { scope: '个人', writer: 'engine/xingdong.ts' },
  foeLog: { scope: '世界', writer: 'engine/lilian.ts、engine/xingdong.ts' },
  diao: { scope: '个人', writer: 'engine/zhanli.ts' },
  shi: { scope: '世界', writer: 'engine/shishi.ts、engine/xingdong.ts' },
  gongxian: { scope: '个人', writer: 'engine/xingdong.ts' },
  asked: { scope: '个人', writer: 'engine/xingdong.ts' },
  away: { scope: '世界', writer: 'engine/xingdong.ts（经 engine/dsl.ts 结算）' },
  encLog: { scope: '世界', writer: 'engine/encounter.ts、engine/xingdong.ts' },
  lastEnc: { scope: '世界', writer: 'engine/encounter.ts、engine/xingdong.ts' },
  w: { scope: '世界', writer: 'engine/shijie.ts、engine/xingdong.ts' },
  heard: { scope: '个人', writer: 'engine/xingdong.ts' },
  feed: { scope: '界面', writer: 'core/state.ts（pushFeed）、ui' },
  story: { scope: '个人', writer: 'engine/xingdong.ts' },
  sel: { scope: '界面', writer: 'ui' },
  reply: { scope: '界面', writer: 'ui' },
  tab: { scope: '界面', writer: 'ui' },
} as const satisfies Record<keyof GameState, FieldOwner>);
for (const owner of Object.values(FIELD_OWNER)) Object.freeze(owner);

/** 跳过序章时的根基：和走完童年三忆的样子相当（常人各二十） */
/** 开局时的现实钟：现在，和开局那天的江湖日 */
export const realNow = (day: number): GameState['real'] => ({ start: nowMs(), startDay: day, seen: nowMs(), grown: 0 });

/** 开局的世界：种子由名字和开局的现实时刻算出（存档迁移用同一个算法，core/save.ts） */
export const worldSeed = (name: string, start: number): number => seedOf(name, start);
const newWorld = (name: string, real: GameState['real']): WorldState => initWorld(worldSeed(name, real.start), real.startDay);

export const ATTR0: Record<AttrKey, number> = { 体魄: 22, 根骨: 22, 身法: 23, 悟性: 23, 胆魄: 22 };

/** 新游戏：从序章「瓜洲夜雨」开始。一个只会几招粗浅功夫的渔家少年，属性略低，由童年三忆补上 */
export function newGame(): GameState {
  const real = realNow(65);
  const s: GameState = {
    v: 5, chapter: 0, name: '孤舟', loc: 'gz_home', year: 0, month: 3, day: 5, min: 15 * 60 + 20, weather: '阴',
    // 气血、内力的上限由「人」算出来（engine/ren.ts 的 syncBody）；功力三年：江伯教过吐纳
    hp: 1e9, hpMax: 0, mp: 150, mpMax: 0, gongli: 3, wounds: { hand: 0, foot: 0, inner: 0 },
    real, w: newWorld('孤舟', real), heard: [], yue: [], xinmo: { n: 0, why: '' }, shenfen: { id: 'yumin', standing: 1, since: 65 }, job: null, jobLog: {},
    // 兵器是江伯削的木剑（docs/kaipian.md 第三稿）：青锋剑只在旧存档里，真兵刃要到扬州花钱买
    silver: 30, items: { kp_mujian: 1, jcy: 1, fhs: 3 },
    quests: { prologue: 0 }, track: 'prologue',
    // 瓜洲的街坊看着你长大：回春堂掌柜、茶摊老汉、卖鱼阿婆、艄公、钟郎中、谭老栓（审查 A12、C34）
    flags: {}, rel: { jiangbo: '相依为命', ...JIEFANG }, title: '', xia: 0, eming: 0,
    attr: { 体魄: 20, 根骨: 20, 身法: 20, 悟性: 20, 胆魄: 20 }, lilian: 0, encLog: {}, lastEnc: -1e9,
    // 渔家少年：江伯只教过几招防身的粗浅功夫，都还没入门（从零练起，见 docs/audit.md）
    skills: { hanjiang: { r: 0, p: 0 }, xinfa: { r: 0, p: 0 }, taxue: { r: 0, p: 0 } },
    loadout: { neigong: 'xinfa', qinggong: 'taxue', weapon: 'hanjiang' }, gear: { weapon: 'kp_mujian' },
    feed: [{ t: '传闻', x: '江上这两天来了几条生船，不打鱼，专打听人。', n: 0 }],
    log: [], story: '', sel: null, reply: null, tab: 'jianghu'
  };
  syncBody(s);
  s.mp = Math.round(s.mpMax / 2);
  return s;
}

/** 瓜洲看着你长大的街坊：开局就是点头之交 */
const JIEFANG: Record<string, string> = Object.fromEntries(
  ['huichun', 'chatan', 'ayp', 'shaogong', 'jc_gz_zhong', 'jc_gz_tan'].map(id => [id, '点头之交']));

/**
 * 跳过序章，直接从扬州开始：照「渡」那条路走完的结果给，不比走完更肥（docs/kaipian.md 第三稿第五条）：
 * 银两、历练、侠义、药、兵器（木剑）、旗标（kp_du）、褚七和卫衡的关系，都和走一遍一样；
 * 江伯生死未卜，只留下斗笠和断水残页，断水要自己参悟；惊鸿剑要自己去小金山悟。带旗标 kp_xin：新开局的说法
 */
export function skipToYangzhou(): GameState {
  const real = realNow(67);
  const s: GameState = {
    v: 5, chapter: 1, name: '孤舟', loc: 'hu', year: 0, month: 3, day: 7, min: 7 * 60 + 40, weather: '微雨',
    hp: 1e9, hpMax: 0, mp: 1e9, mpMax: 0, gongli: 3, wounds: { hand: 0, foot: 0, inner: 0 },
    real, w: newWorld('孤舟', real), heard: [], yue: [], xinmo: { n: 0, why: '' }, shenfen: { id: 'youxia', standing: 1, since: 67 }, job: null, jobLog: {},
    silver: 30, items: { kp_mujian: 1, jcy: 1, fhs: 3, jade: 1, scroll: 1, kp_douli: 1 },
    quests: { prologue: 3, main1: 0 }, track: 'main1',
    flags: { skipped: true, kp_xin: true, kp_du: true, kp_chu_name: true },
    rel: { jiangbo: '相依为命', liu: '素不相识', kp_chu: '相谈甚欢', kp_wei: '心存芥蒂', ...JIEFANG }, title: '', xia: 2, eming: 0,
    relNote: { kp_chu: '欠你一条命', kp_wei: '你渡了他要找的人' },
    // 历练：序章了结 300，加「渡」那条路上打赢家丁的 55（engine/lilian.ts 的 foeLilian），共 355，和真走一遍一样
    // （原来是 506，多出的约 150 是跳过序章的补偿，第三稿起取消：跳过不比走完更肥）
    attr: { ...ATTR0 }, lilian: 355, encLog: {}, lastEnc: -1e9,
    // 断水不在开局：江伯留下的残页要自己参悟（负责人 10-09）
    skills: { hanjiang: { r: 0, p: 120 }, taxue: { r: 0, p: 50 }, xinfa: { r: 0, p: 80 } },
    // 玉佩挂在腰间、斗笠戴在头上：了尘、卫衡都当面说起，和走一遍一样
    loadout: { neigong: 'xinfa', qinggong: 'taxue', weapon: 'hanjiang' }, gear: { weapon: 'kp_mujian', waist: 'jade', head: 'kp_douli' },
    feed: [
      { t: '江湖', x: '你在扬州城外的破庙里歇了一夜，江伯教的那几招剑法，比划来比划去，总觉得差着火候。', n: 0 },
      { t: '传闻', x: '黑风寨劫了漕帮三船盐货，漕帮吃了哑巴亏。', n: 0 }
    ],
    log: [], story: '', sel: 'liu', reply: null, tab: 'jianghu'
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
