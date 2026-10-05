/**
 * 游戏数据类型定义（玩法层）
 * 所有静态数据（职业、道具、技能、角色、章节）都遵循这里的结构。
 * 规则说明见 docs/DESIGN.md。
 */
import type { TerrainId, ThemeId, UnitModelSpec, VfxId } from '@/render/contracts';
import type { Emotion } from '@/ui/portraitContracts';
import type { MusicId, SfxId } from '@/audio/contracts';

/* ------------------------------------------------------------------ */
/* 属性                                                                */
/* ------------------------------------------------------------------ */

/** hp/mp 指最大值 */
export type StatKey = 'hp' | 'mp' | 'atk' | 'def' | 'mag' | 'res' | 'agi' | 'mov';
export type Stats = Record<StatKey, number>;
export type GrowthKey = Exclude<StatKey, 'mov'>;
/** 成长率（百分比，可超过 100：100 必定 +1，余数为再 +1 的几率） */
export type Growth = Record<GrowthKey, number>;

export const STAT_KEYS: StatKey[] = ['hp', 'mp', 'atk', 'def', 'mag', 'res', 'agi', 'mov'];
export const GROWTH_KEYS: GrowthKey[] = ['hp', 'mp', 'atk', 'def', 'mag', 'res', 'agi'];
export const STAT_NAMES: Record<StatKey, string> = {
  hp: '生命',
  mp: '魔力值',
  atk: '力量',
  def: '体质',
  mag: '魔力',
  res: '魔防',
  agi: '敏捷',
  mov: '移动',
};

export type Team = 'player' | 'enemy' | 'ally';

/* ------------------------------------------------------------------ */
/* 职业                                                                */
/* ------------------------------------------------------------------ */

export type MoveType = 'foot' | 'armor' | 'horse' | 'fly';

/** 兵种标签：用于特效武器与 AI 判断 */
export type UnitTag =
  | 'infantry'
  | 'cavalry'
  | 'flying'
  | 'armored'
  | 'archer'
  | 'mage'
  | 'healer'
  | 'thief'
  | 'undead'
  | 'beast'
  | 'dragon'
  | 'monster';

export type WeaponType = 'sword' | 'lance' | 'axe' | 'bow' | 'dagger' | 'staff' | 'tome' | 'fang' | 'breath';
export type ArmorType = 'cloth' | 'light' | 'heavy';
export type Element = 'fire' | 'ice' | 'thunder' | 'holy' | 'dark';

export interface ClassDef {
  id: string;
  name: string;
  /** 1 = 基础职业，2 = 进阶职业，3 = 特殊/专属 */
  tier: 1 | 2 | 3;
  desc: string;
  moveType: MoveType;
  tags: UnitTag[];
  weapons: WeaponType[];
  armors: ArmorType[];
  /** 杂兵（敌人）Lv1 时的基础属性 */
  base: Stats;
  /** 杂兵自动成长率 */
  growth: Growth;
  /** 属性上限 */
  caps: Stats;
  /** 可转职为；带 item 的为「隐藏职业」，需持有该道具（转职时消耗） */
  promotesTo?: { to: string; item?: string }[];
  /** 转职时获得的属性加成 */
  promoteBonus?: Partial<Stats>;
  /** 该职业在某等级习得的技能/魔法 */
  learn?: { level: number; skill: string }[];
  /** 外观（模型）默认值 */
  model: Partial<UnitModelSpec>;
  canOpenChests?: boolean;
  canSteal?: boolean;
}

/* ------------------------------------------------------------------ */
/* 道具                                                                */
/* ------------------------------------------------------------------ */

export type ItemKind = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'promotion' | 'key' | 'treasure';

export type StatusId = 'poison' | 'sleep' | 'silence' | 'slow' | 'atk_up' | 'def_up' | 'agi_up' | 'regen';

export interface WeaponData {
  type: WeaponType;
  atk: number;
  hit: number;
  crit: number;
  /** 射程 [最小, 最大]（曼哈顿距离） */
  range: [number, number];
  /** 魔法武器（魔导书）：伤害用 魔力-魔防 计算 */
  magic?: boolean;
  /** 特效：对这些兵种伤害 ×1.5 */
  effective?: UnitTag[];
  element?: Element;
  /** 武器自带的回避加成 */
  ev?: number;
  bonus?: Partial<Stats>;
  /** 吸血：造成伤害的一半回复自身 */
  drain?: boolean;
  /** 附加状态（如毒击） */
  status?: { id: StatusId; chance: number; turns: number };
  /** 可作为道具使用，施放该技能且不消耗 MP（如带魔力的宝杖） */
  castSkill?: string;
}

export interface ArmorData {
  type: ArmorType;
  def: number;
  res: number;
  /** 回避修正（重甲为负） */
  ev?: number;
  bonus?: Partial<Stats>;
}

export type AccessorySpecial = 'regen' | 'exp_up' | 'crit_up' | 'mp_regen' | 'immune';

export interface AccessoryData {
  bonus: Partial<Stats>;
  special?: AccessorySpecial;
}

export interface ConsumableData {
  effect: 'heal' | 'heal_full' | 'mp' | 'cure' | 'stat_up' | 'elixir' | 'status' | 'key';
  amount?: number;
  stat?: StatKey;
  status?: StatusId;
  /** 0 = 只能自己用；1 = 可给相邻队友用 */
  range: number;
}

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  /** 购买价格，0 = 非卖品（只能获得）。卖出价为一半 */
  price: number;
  desc: string;
  weapon?: WeaponData;
  armor?: ArmorData;
  accessory?: AccessoryData;
  consumable?: ConsumableData;
  /** 转职道具：说明文字用（实际规则在 ClassDef.promotesTo） */
  promotion?: string[];
  /** 稀有度：影响名称颜色 */
  rarity?: 1 | 2 | 3 | 4;
  /** 专属：仅限该角色 */
  personal?: string;
}

/* ------------------------------------------------------------------ */
/* 技能 / 魔法                                                          */
/* ------------------------------------------------------------------ */

export type SkillKind = 'magic' | 'heal' | 'buff' | 'debuff' | 'tech';

export interface SkillDef {
  id: string;
  name: string;
  desc: string;
  kind: SkillKind;
  mp: number;
  /** 施放距离 [min,max]；[0,0] = 自身 */
  range: [number, number];
  /** 作用半径（曼哈顿）：0 = 单体，1 = 十字，2 = 大范围 */
  area: number;
  target: 'enemy' | 'ally' | 'self';
  /** magic：威力 + 魔力 - 魔防；heal：威力 + 魔力/2 */
  power?: number;
  element?: Element;
  /** tech（武技）：以武器攻击为基础的倍率 */
  mult?: number;
  /** tech：连续攻击次数（默认 1） */
  hits?: number;
  /** tech：使用武器射程（默认 true；为 false 时使用 range） */
  weaponRange?: boolean;
  hitBonus?: number;
  critBonus?: number;
  /** 不会被反击 */
  noCounter?: boolean;
  status?: { id: StatusId; chance: number; turns: number };
  effective?: UnitTag[];
  /** 复活战场上阵亡的队友 */
  revive?: boolean;
  /** 只能在未移动时施放（大型法术需要原地吟唱） */
  stationary?: boolean;
  /** 命中基础值（法术），默认 90 */
  hit?: number;
  vfx: VfxId;
  sfx: SfxId;
}

/* ------------------------------------------------------------------ */
/* 角色                                                                */
/* ------------------------------------------------------------------ */

export interface Equipment {
  weapon?: string;
  armor?: string;
  accessory?: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  /** 称号，如「赤鳞见习骑士」 */
  title: string;
  classId: string;
  level: number;
  base: Stats;
  growth: Growth;
  equipment: Equipment;
  items?: string[];
  /** 初始技能 */
  skills?: string[];
  /** 个人专属技能：达到（实力）等级时习得 */
  personal?: { level: number; skill: string }[];
  /** 头像 id（PORTRAITS 的 key） */
  portrait: string;
  /** 模型外观覆盖（发色、配色等） */
  model: Partial<UnitModelSpec>;
  bio: string;
  /** 主角：阵亡即失败 */
  lord?: boolean;
}

/* ------------------------------------------------------------------ */
/* 对话 / 剧情                                                          */
/* ------------------------------------------------------------------ */

/** 对话行。s = 说话者 id（角色 id / PORTRAITS id），'' 为旁白 */
export interface DialogueLine {
  s: string;
  t: string;
  e?: Emotion;
  /** 立绘位置，默认自动（新说话者轮流左右） */
  pos?: 'L' | 'R';
  /** 显示名覆盖（如「？？？」「神秘的少女」） */
  n?: string;
}

export interface ActorPlacement {
  id: string;
  /** 外观：角色 id 或 职业 id */
  look: string;
  team?: Team;
  x: number;
  y: number;
  /** 朝向：n=上(-y) s=下(+y) e=右(+x) w=左(-x) */
  face?: 'n' | 's' | 'e' | 'w';
}

export type SceneCommand =
  | { cmd: 'move'; actor: string; to: [number, number]; wait?: boolean }
  | { cmd: 'face'; actor: string; dir: 'n' | 's' | 'e' | 'w' }
  | { cmd: 'spawn'; actor: ActorPlacement }
  | { cmd: 'remove'; actor: string; fx?: VfxId }
  | { cmd: 'anim'; actor: string; anim: 'attack' | 'cast' | 'hit' | 'death' | 'victory' | 'heal' | 'shoot' }
  | { cmd: 'camera'; at: [number, number]; zoom?: number }
  | { cmd: 'shake'; strength?: number }
  | { cmd: 'flash'; color?: string }
  | { cmd: 'sfx'; id: SfxId }
  | { cmd: 'music'; id: MusicId }
  | { cmd: 'vfx'; id: VfxId; at: [number, number]; from?: [number, number] }
  | { cmd: 'wait'; ms: number }
  /** 地点/时间字幕卡 */
  | { cmd: 'caption'; text: string; sub?: string }
  | { cmd: 'tile'; x: number; y: number; t: TerrainId };

export type StoryLine = DialogueLine | SceneCommand;

export interface StoryScene {
  /**
   * 背景：
   *  - map：使用某一章的地图作为 3D 舞台（默认当前章），可放置演员并移动
   *  - black：黑底（回忆、内心独白）
   *  - parchment：羊皮纸卷轴（史书、旁白、序幕）
   */
  backdrop: { type: 'map'; chapter?: string; focus?: [number, number]; zoom?: number } | { type: 'black' } | { type: 'parchment' };
  music?: MusicId;
  actors?: ActorPlacement[];
  lines: StoryLine[];
  /** 仅当旗标为真时播放；以 ! 开头表示旗标为假时播放 */
  if?: string;
}

/* ------------------------------------------------------------------ */
/* 章节 / 战斗                                                          */
/* ------------------------------------------------------------------ */

export type Rect = [number, number, number, number]; // x1,y1,x2,y2（含）

export type AiSpec =
  /** 主动出击，寻找最佳目标 */
  | { type: 'aggressive' }
  /** 原地待命，直到我方进入其威胁范围（或同组单位被攻击）才行动 */
  | { type: 'hold'; group?: string }
  /** 永不移动，只攻击射程内的目标（守王座的 Boss） */
  | { type: 'stationary' }
  /** 前往指定地点/单位 */
  | { type: 'target'; unit?: string; tile?: [number, number] }
  /** 劫掠者：优先前往并摧毁村庄 */
  | { type: 'raider' }
  /** 盗贼：抢夺宝箱后逃往指定地点 */
  | { type: 'thief'; exit: [number, number] }
  /** 到某回合前待命 */
  | { type: 'wait'; turn: number };

export interface UnitPlacement {
  /** 本场战斗唯一 id；队伍角色使用角色 id */
  id: string;
  /** 具名角色 id（我方角色、Boss、剧情 NPC） */
  character?: string;
  /** 杂兵：职业与等级 */
  classId?: string;
  level?: number;
  name?: string;
  team: Team;
  x: number;
  y: number;
  ai?: AiSpec;
  equipment?: Equipment;
  items?: string[];
  skills?: string[];
  /** 击破后掉落（必定掉落） */
  drop?: string;
  boss?: boolean;
  /** 头像 id（杂兵也可指定，例如 soldier） */
  portrait?: string;
  /** 属性微调 */
  statMod?: Partial<Stats>;
  model?: Partial<UnitModelSpec>;
  face?: 'n' | 's' | 'e' | 'w';
}

export type VictoryCond =
  | { type: 'rout' }
  | { type: 'boss'; unit: string }
  | { type: 'seize'; x: number; y: number }
  | { type: 'survive'; turns: number }
  | { type: 'escape'; area: Rect; unit?: string }
  /** 只能由事件触发胜利 */
  | { type: 'event' };

export type DefeatCond =
  | { type: 'unit'; unit: string }
  | { type: 'turns'; turns: number };

export type Trigger =
  | { on: 'start' }
  /** 某回合开始（默认我方阶段开始时） */
  | { on: 'turn'; turn: number; phase?: Team }
  | { on: 'defeat'; unit: string }
  | { on: 'enter'; area: Rect; unit?: string; team?: Team }
  | { on: 'talk'; a: string; b: string }
  | { on: 'hp'; unit: string; below: number }
  | { on: 'visit'; x: number; y: number }
  | { on: 'remaining'; count: number }
  | { on: 'chest'; x: number; y: number };

export type BattleAction =
  | { do: 'say'; lines: StoryLine[] }
  | { do: 'spawn'; units: UnitPlacement[] }
  /** 角色加入我方（阵营转为 player 并加入队伍） */
  | { do: 'join'; unit: string }
  /** 单位撤离战场（非阵亡） */
  | { do: 'leave'; unit: string }
  | { do: 'item'; item: string }
  | { do: 'gold'; amount: number }
  | { do: 'flag'; flag: string; value?: boolean | number }
  | { do: 'ai'; unit: string; ai: AiSpec }
  | { do: 'tile'; x: number; y: number; t: TerrainId }
  | { do: 'win' }
  | { do: 'lose'; reason?: string }
  | { do: 'objective'; text: string; victory?: VictoryCond }
  | { do: 'heal'; unit: string }
  | { do: 'camera'; x: number; y: number };

export interface BattleEvent {
  id: string;
  when: Trigger;
  /** 仅当旗标为真时触发；以 ! 开头表示旗标为假时触发 */
  if?: string;
  /** 默认只触发一次 */
  repeat?: boolean;
  do: BattleAction[];
}

export interface ChestDef {
  x: number;
  y: number;
  item?: string;
  gold?: number;
}

export interface VillageDef {
  x: number;
  y: number;
  lines: StoryLine[];
  item?: string;
  gold?: number;
}

export interface ChapterDef {
  id: string;
  /** 序章 = 0 */
  index: number;
  /** 如「第一章」 */
  label: string;
  title: string;
  /** 章节卡下方的一句引言 */
  quote: string;
  map: {
    theme: ThemeId;
    rows: string[];
    seed?: number;
  };
  chests?: ChestDef[];
  villages?: VillageDef[];
  /** 隐藏宝物：我方单位在此格待机即可获得 */
  hidden?: ChestDef[];
  victory: VictoryCond;
  defeat?: DefeatCond[];
  /** 胜利条件说明（显示在 HUD） */
  objectiveText: string;
  /** 回合上限（默认 255） */
  turnLimit?: number;
  /** 出击：最大人数、可放置格、必须出击的角色 */
  deploy: { max: number; slots: [number, number][]; forced?: string[] };
  units: UnitPlacement[];
  events: BattleEvent[];
  /** 战前剧情 */
  intro: StoryScene[];
  /** 战后剧情 */
  outro: StoryScene[];
  music: { player: MusicId; enemy: MusicId };
  /** 战前加入队伍的角色（剧情加入） */
  joins?: string[];
  /** 战后离队的角色 */
  leaves?: string[];
  /** 战斗中未能说服时，战后仍会加入的角色 */
  recruitAfter?: string[];
  /** 章节通关奖励 */
  reward: { gold: number; items?: string[] };
  /** 本章前营地商店的商品 */
  shop: string[];
  /** 本章之前的营地：full = 完整营地；march = 行军营地（只能整备与存档）；none = 无 */
  camp?: 'full' | 'march' | 'none';
  /** 剧情转职，如 { rein: 'crimson_knight' } */
  storyPromotions?: Record<string, string>;
  /** 剧情装备：战前直接为角色装备武器（旧武器进仓库），如 { rein: 'oath_sword' } */
  storyEquip?: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/* 营地对话 / 羁绊                                                      */
/* ------------------------------------------------------------------ */

export interface CampTalk {
  id: string;
  /** 在此章节开始前的营地出现（ChapterDef.index） */
  chapter: number;
  title: string;
  /** 需要在队伍中且未阵亡的角色 */
  requires: string[];
  lines: StoryLine[];
  reward?: { item?: string; gold?: number };
}

export type SupportRank = 'C' | 'B' | 'A';

export interface SupportDef {
  a: string;
  b: string;
  /** 每级所需的羁绊点数与对话 */
  ranks: { rank: SupportRank; points: number; title: string; lines: StoryLine[] }[];
}

export type { TerrainId, ThemeId, Emotion, MusicId, SfxId, VfxId, UnitModelSpec };
