/**
 * 内容数据的类型定义。
 *
 * 地点、人物、任务、剧情、对手都写成数据，不写逻辑。
 * 带条件的对话和效果用 Branch / Cond / Effect 这套声明式格式表达，
 * 引擎统一解释执行，由 tests/content.test.ts 自动校验引用是否完整。
 * 编写说明见 docs/content-guide.md。
 */

export type SkillId = 'hanjiang' | 'jinghong' | 'taxue' | 'xinfa' | 'duanshui';
export type AttrKey = '体魄' | '根骨' | '身法' | '悟性' | '胆魄';
export type FeedTag = '传闻' | '出关' | '主线' | '江湖' | '突破' | '收获';
export type Tone = 'red' | 'jade' | 'amber' | 'gray' | 'blue' | 'purple';
/**
 * 人物身上可以点的动作。常用的列在这里，也可以自拟两个字的动作名（例如「斗酒」「打听」）。
 * 「观察」由引擎读取 look 字段；「赠礼」「请教」「切磋」「偷窃」不写 actions 时有默认回应。
 */
export type Verb = '交谈' | '观察' | '请教' | '切磋' | '赠礼' | '偷窃' | '购买' | '打赏' | '动手' | '细看' | '抓药' | '推门' | (string & {});

/** 条件：列出的所有字段同时满足才成立；不写 if 的分支总是成立 */
export interface Cond {
  flag?: string;
  notFlag?: string;
  /** 任务进度：is 等于，atLeast 不小于，below 小于 */
  quest?: { id: string; is?: number; atLeast?: number; below?: number };
  chapter?: number;
  /** 银两不少于 */
  silver?: number;
  item?: { id: string; atLeast?: number };
  noItem?: string;
  rel?: { npc: string; is?: string[]; not?: string[] };
  learned?: SkillId;
  notLearned?: SkillId;
  /** 属性不低于 */
  attr?: { key: AttrKey; atLeast: number };
  /** 侠义、恶名不低于 */
  xia?: number;
  eming?: number;
  /** 时辰：from 到 to 点之间（24 小时制，可跨午夜，例如 from: 19, to: 5 表示入夜到天亮） */
  hour?: { from: number; to: number };
  any?: Cond[];
}

/** 效果：按顺序执行 */
export type Effect =
  | { type: 'flag'; flag: string; value?: boolean }
  | { type: 'quest'; id: string; stage: number }
  | { type: 'track'; id: string }
  | { type: 'feed'; tag: FeedTag; text: string }
  | { type: 'toast'; text: string }
  | { type: 'silver'; delta: number }
  | { type: 'item'; id: string; delta: number }
  /** 设置关系；写了 from 时，只有当前关系在 from 里才改 */
  | { type: 'rel'; npc: string; value: string; from?: string[] }
  | { type: 'prof'; skill: SkillId; amount: number }
  | { type: 'learn'; skill: SkillId; realm?: number; prof?: number }
  | { type: 'attr'; key: AttrKey; delta: number }
  | { type: 'xia'; delta: number }
  /** 恶名：与侠义是两条独立的值，不互相抵消 */
  | { type: 'eming'; delta: number }
  | { type: 'title'; value: string }
  | { type: 'chapter'; value: number }
  | { type: 'move'; to: string }
  /** add：往后推若干分钟；set：直接设为当天第几分钟（若早于现在则到第二天） */
  | { type: 'time'; add?: number; set?: number }
  | { type: 'weather'; value: string }
  | { type: 'heal'; hp?: number | 'full'; mp?: number | 'full'; hpAtLeast?: number }
  | { type: 'feedReset' }
  /** 从 NEWS 里随机抽一条传闻，写进见闻，并可在文字里用 {news} 引用 */
  | { type: 'news' }
  /** 开打：战斗结束后由对手定义里的 results 决定后续 */
  | { type: 'fight'; foe: string }
  /** 打开一段剧情卡片 */
  | { type: 'story'; id: string };

/** 分支：从上往下找第一个条件成立的分支，显示 text，执行 do */
export interface Branch { if?: Cond; text?: string; do?: Effect[] }

export interface RoomDef {
  id: string;
  name: string;
  area: string;
  /** 所属区域，地图按区域显示 */
  region: string;
  /** 与相邻地点之间的赶路分钟数（两地取较大值） */
  t: number;
  /** 场景描写；可以按条件给出不同版本 */
  desc: string | Branch[];
  /** 此处的人物；带 if 的只在条件成立时出现 */
  npcs: (string | { id: string; if: Cond })[];
  objs?: (string | { id: string; if: Cond })[];
  /**
   * 出口：[方位, 地点 id] 或 [方位, 地点 id, 回程方位]。
   * 写了回程方位时，系统会自动给对面地点补上回来的出口，新地点不必去改已有地点的文件。
   */
  exits: ([string, string] | [string, string, string])[];
  /** 赶往此处时路上显示的一句话 */
  road?: string | Branch[];
  /** 进入此处时触发；通常配合 notFlag 只触发一次 */
  onEnter?: Branch[];
  /** 在地图上的位置（百分比） */
  map: [number, number];
}

export interface NpcDef {
  id: string;
  name: string;
  /**
   * 把人物放进某个已有地点，免得去改那个地点的文件。
   * 物品（obj: true）放进 objs，人物放进 npcs。
   */
  at?: { room: string; if?: Cond };
  /** 条件成立时改用另一个名字，例如通报姓名之后 */
  altName?: { if: Cond; name: string };
  /** 头像上的单字；物品用 icon */
  ini?: string;
  icon?: 'stele' | 'go' | 'boat' | 'door';
  tone?: Tone;
  obj?: boolean;
  /** 显示在头像上的人数角标 */
  count?: number;
  brief: string;
  hint?: string;
  look: string;
  /** 收到杏花等礼物时的反应，不写则用默认句子 */
  gift?: string;
  /** 动作列表的顺序 */
  verbs: Verb[];
  actions: Partial<Record<Verb, Branch[]>>;
}

/** 对手重招：力、速、巧、隙四项强度，决定玩家各种应对的成算 */
export interface TellDef {
  name: string;
  text: string;
  pw: { li: number; su: number; qiao: number; xi: number };
  after: string;
}

export interface FightResult {
  /** 剧本战用：不弹结算页，直接执行 do 和 then */
  silent?: boolean;
  tag?: string;
  title?: string;
  /** 结算页的叙述；写 '@compose' 时由引擎根据战况生成说书 */
  story?: string;
  do?: Effect[];
  /** 关闭结算页之后执行，通常用来接一段剧情 */
  then?: Effect[];
  button?: string;
  /** 输了时是否显示「变强之道」 */
  growth?: boolean;
}

export interface FoeDef {
  id: string;
  name: string;
  title: string;
  ini: string;
  tone: Tone;
  weapon: string;
  /** 兵器的简称：刀、剑…… */
  ws: string;
  hp: number;
  atk: [number, number];
  big: number;
  /** 切磋：打到三成气血即止 */
  spar?: boolean;
  /** 剧本战：不会战死、不能逃跑认输，由 script 决定如何收场 */
  script?: 'win-at-zero' | 'rescue';
  /** 第几合出第一次重招 */
  firstTell?: number;
  tag: string;
  moves: string[];
  flourish: string[];
  tells: TellDef[];
  asides: string[];
  opening: string[];
  intro: string;
  /** 开场时额外显示的教学提示 */
  tips?: string[];
  phase2?: string;
  win: string;
  lose: string;
  results: { win: FightResult; lose?: FightResult; flee?: FightResult; yield?: FightResult };
}

export interface SkillDef {
  id: SkillId;
  name: string;
  grade: '凡品' | '良品' | '上品' | '绝品' | '神品' | '禁品';
  type: string;
  desc: string;
  moves?: string[];
  use: string;
  /** 见招拆招时对应的应对 */
  resp?: 'block' | 'dodge' | 'parry' | 'rush';
}

export interface ItemDef { id: string; name: string; desc: string; usable?: boolean; hidden?: boolean }

export interface QuestDef { id: string; name: string; stages: { title: string; to?: string }[] }

export interface StoryChoice {
  label: string;
  sub?: string;
  do?: Effect[];
  /** 选完之后先显示的结果文字；不写则直接进入下一步 */
  result?: string;
  /** 下一张卡片的序号；不写为下一张，写 -1 为结束 */
  next?: number;
}

export interface StoryCard {
  tag?: string;
  title: string;
  paras: string[];
  /** 'name'：在这张卡片上请玩家起名 */
  input?: 'name';
  /** 在卡片上展示的收获 */
  gains?: string[];
  choices: StoryChoice[];
}

export interface StoryDef {
  id: string;
  cards: StoryCard[];
  /** 剧情结束后播放的章回题字 */
  endChapter?: { small: string; big: string };
}

export interface NewsDef { if?: Cond; text: string }

export interface RegionDef { name: string; note: string }

/**
 * 内容包：src/content/packs/ 下每个文件默认导出一个内容包，系统自动收录。
 * 新增内容时新建自己的内容包文件，尽量不要改别人的文件。
 */
export interface ContentPack {
  regions?: Record<string, RegionDef>;
  rooms?: RoomDef[];
  npcs?: NpcDef[];
  foes?: FoeDef[];
  quests?: QuestDef[];
  stories?: StoryDef[];
  items?: ItemDef[];
  news?: NewsDef[];
}
