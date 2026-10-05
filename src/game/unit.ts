/**
 * 运行时单位模型与属性计算
 */
import { CLASSES, getClass } from '@/data/classes';
import { CHARACTERS } from '@/data/characters';
import { getItem, ITEMS } from '@/data/items';
import { SKILLS } from '@/data/skills';
import type {
  AiSpec,
  Equipment,
  Growth,
  ItemDef,
  StatKey,
  Stats,
  StatusId,
  Team,
  UnitModelSpec,
  UnitTag,
  WeaponData,
} from '@/data/types';
import { STAT_KEYS } from '@/data/types';

export type Facing = 'n' | 's' | 'e' | 'w';

export interface StatusEffect {
  id: StatusId;
  turns: number;
}

/** 存档中的队员数据 */
export interface UnitSave {
  id: string;
  classId: string;
  level: number;
  exp: number;
  base: Stats;
  equipment: Equipment;
  items: string[];
  skills: string[];
  /** 阵亡（需在教会复活） */
  fallen: boolean;
  kills: number;
  /** 出击次数 */
  battles: number;
}

export interface Unit {
  /** 战场内唯一 id */
  uid: string;
  /** 具名角色 id */
  charId?: string;
  name: string;
  team: Team;
  classId: string;
  level: number;
  exp: number;
  base: Stats;
  growth?: Growth;
  hp: number;
  mp: number;
  equipment: Equipment;
  /** 随身道具（最多 4 个） */
  items: string[];
  skills: string[];
  x: number;
  y: number;
  facing: Facing;
  /** 本阶段已移动 */
  moved: boolean;
  /** 本阶段已执行实际行动（攻击、技能、道具、开箱、拜访、交谈、偷窃） */
  acted: boolean;
  /** 本阶段已结束（待机或行动完毕） */
  done: boolean;
  /** 上一个本方阶段既未移动也未行动（以逸待劳：回复 HP） */
  idle: boolean;
  status: StatusEffect[];
  ai?: AiSpec;
  /** hold 型 AI 是否已被唤醒 */
  awake: boolean;
  boss: boolean;
  lord: boolean;
  portrait?: string;
  drop?: string;
  alive: boolean;
  /** 已撤离战场 */
  gone: boolean;
  model: UnitModelSpec;
  kills: number;
  /** 敌方盗贼抢到的宝物 */
  loot?: { item?: string; gold?: number };
  /** 本阶段移动的起点（取消移动用） */
  origin?: { x: number; y: number };
}

export const MAX_ITEMS = 4;
export const MAX_LEVEL = 20;

/* ------------------------------------------------------------------ */
/* 实力等级                                                            */
/* ------------------------------------------------------------------ */

export function tierOf(u: Unit): number {
  return getClass(u.classId).tier;
}

/** 实力等级 = 等级 + (进阶职业 ? 15 : 0) */
export function powerLevel(u: Pick<Unit, 'classId' | 'level'>): number {
  const tier = getClass(u.classId).tier;
  return u.level + (tier >= 2 ? 15 : 0) + (tier >= 3 ? 5 : 0);
}

/* ------------------------------------------------------------------ */
/* 属性计算                                                            */
/* ------------------------------------------------------------------ */

export function weaponOf(u: Unit): (WeaponData & { id: string; name: string }) | null {
  const id = u.equipment.weapon;
  if (!id) return null;
  const it = ITEMS[id];
  if (!it?.weapon) return null;
  return { ...it.weapon, id, name: it.name };
}

function equipBonus(u: Unit): Partial<Stats> {
  const out: Partial<Stats> = {};
  const add = (b?: Partial<Stats>) => {
    if (!b) return;
    for (const k of STAT_KEYS) if (b[k]) out[k] = (out[k] ?? 0) + (b[k] ?? 0);
  };
  const w = u.equipment.weapon ? ITEMS[u.equipment.weapon] : undefined;
  const a = u.equipment.armor ? ITEMS[u.equipment.armor] : undefined;
  const c = u.equipment.accessory ? ITEMS[u.equipment.accessory] : undefined;
  add(w?.weapon?.bonus);
  add(a?.armor?.bonus);
  add(c?.accessory?.bonus);
  return out;
}

export function hasStatus(u: Unit, id: StatusId): boolean {
  return u.status.some((s) => s.id === id);
}

/** 当前属性（含装备与状态） */
export function stats(u: Unit): Stats {
  const b = equipBonus(u);
  const s = {} as Stats;
  for (const k of STAT_KEYS) s[k] = u.base[k] + (b[k] ?? 0);
  if (hasStatus(u, 'atk_up')) s.atk += Math.max(2, Math.round(u.base.atk * 0.25));
  if (hasStatus(u, 'def_up')) s.def += Math.max(2, Math.round(u.base.def * 0.25));
  if (hasStatus(u, 'agi_up')) {
    s.agi += Math.max(2, Math.round(u.base.agi * 0.25));
    s.mov += 1;
  }
  if (hasStatus(u, 'slow')) {
    s.mov = Math.max(1, s.mov - 2);
    s.agi = Math.round(s.agi * 0.75);
  }
  return s;
}

export function maxHp(u: Unit): number {
  return stats(u).hp;
}

export function maxMp(u: Unit): number {
  return stats(u).mp;
}

export interface Derived {
  /** 攻击力 AP = 力量 + 武器威力（魔法武器为 魔力 + 威力） */
  ap: number;
  /** 防御力 DP = 体质 + 防具防御 */
  dp: number;
  /** 魔法防御 = 魔防 + 防具魔防 */
  mdp: number;
  hit: number;
  ev: number;
  crit: number;
  range: [number, number];
  magic: boolean;
}

export function derived(u: Unit): Derived {
  const s = stats(u);
  const w = weaponOf(u);
  const armor = u.equipment.armor ? ITEMS[u.equipment.armor]?.armor : undefined;
  const acc = u.equipment.accessory ? ITEMS[u.equipment.accessory]?.accessory : undefined;
  const magic = !!w?.magic;
  const ap = w ? (magic ? s.mag + w.atk : s.atk + w.atk) : s.atk;
  const dp = s.def + (armor?.def ?? 0);
  const mdp = s.res + (armor?.res ?? 0);
  const hit = (w?.hit ?? 70) + s.agi * 2;
  const ev = s.agi * 2 + (armor?.ev ?? 0) + (w?.ev ?? 0);
  const crit = (w?.crit ?? 0) + Math.floor(s.agi / 4) + (acc?.special === 'crit_up' ? 15 : 0);
  return { ap, dp, mdp, hit, ev, crit, range: w ? [w.range[0], w.range[1]] : [1, 1], magic };
}

export function tagsOf(u: Unit): UnitTag[] {
  return getClass(u.classId).tags;
}

export function moveTypeOf(u: Unit) {
  return getClass(u.classId).moveType;
}

/* ------------------------------------------------------------------ */
/* 装备判定                                                            */
/* ------------------------------------------------------------------ */

export function canEquip(u: Pick<Unit, 'classId' | 'charId'>, item: ItemDef): boolean {
  const cls = getClass(u.classId);
  if (item.personal && item.personal !== u.charId) return false;
  if (item.weapon) return cls.weapons.includes(item.weapon.type);
  if (item.armor) return cls.armors.includes(item.armor.type);
  if (item.accessory) return true;
  return false;
}

/* ------------------------------------------------------------------ */
/* 技能                                                                */
/* ------------------------------------------------------------------ */

/** 当前可用技能（已习得 + 武器附带） */
export function skillList(u: Unit): string[] {
  const out = [...u.skills];
  const w = u.equipment.weapon ? ITEMS[u.equipment.weapon]?.weapon : undefined;
  if (w?.castSkill && !out.includes(w.castSkill)) out.push(w.castSkill);
  return out.filter((id) => SKILLS[id]);
}

/** 职业与个人技能中，到达当前等级应当已习得的技能 */
export function skillsForLevel(classId: string, level: number, charId?: string): string[] {
  const out: string[] = [];
  const cls = CLASSES[classId];
  for (const l of cls?.learn ?? []) if (l.level <= level && !out.includes(l.skill)) out.push(l.skill);
  const ch = charId ? CHARACTERS[charId] : undefined;
  const pl = powerLevel({ classId, level });
  for (const p of ch?.personal ?? []) if (p.level <= pl && !out.includes(p.skill)) out.push(p.skill);
  return out;
}

/* ------------------------------------------------------------------ */
/* 创建                                                                */
/* ------------------------------------------------------------------ */

const ENEMY_PALETTE: Partial<UnitModelSpec> = { primary: '#5b1d22', secondary: '#2a2a31', metal: '#6f727c' };
const ALLY_PALETTE: Partial<UnitModelSpec> = { primary: '#3c6b45', secondary: '#c9b98e', metal: '#a7acb5' };

export function buildModelSpec(classId: string, team: Team, override?: Partial<UnitModelSpec>, charModel?: Partial<UnitModelSpec>): UnitModelSpec {
  const cls = getClass(classId);
  const palette = team === 'enemy' ? ENEMY_PALETTE : team === 'ally' ? ALLY_PALETTE : { primary: '#2f5fa8', secondary: '#d8c9a0' };
  const spec: UnitModelSpec = {
    body: 'humanoid',
    weapon: 'sword',
    ...palette,
    ...cls.model,
    ...charModel,
    ...override,
    team,
  } as UnitModelSpec;
  if (!spec.primary) spec.primary = '#777777';
  if (!spec.secondary) spec.secondary = '#cccccc';
  return spec;
}

/** 杂兵属性：职业基础 + 平均成长 × (等级 - 1) */
export function genericStats(classId: string, level: number, mod?: Partial<Stats>): Stats {
  const cls = getClass(classId);
  const s = {} as Stats;
  for (const k of STAT_KEYS) {
    const g = k === 'mov' ? 0 : cls.growth[k as Exclude<StatKey, 'mov'>];
    const v = cls.base[k] + Math.floor((g * (level - 1)) / 100);
    s[k] = Math.min(cls.caps[k], v) + (mod?.[k] ?? 0);
  }
  return s;
}

export function defaultEquipment(classId: string, level: number): Equipment {
  const cls = getClass(classId);
  const t = cls.weapons[0];
  const strong = level >= 8 || cls.tier >= 2;
  const veryStrong = cls.tier >= 2 && level >= 8;
  const pick: Record<string, string> = {
    sword: veryStrong ? 'silver_sword' : strong ? 'steel_sword' : 'iron_sword',
    lance: veryStrong ? 'silver_lance' : strong ? 'steel_lance' : 'iron_lance',
    axe: veryStrong ? 'silver_axe' : strong ? 'steel_axe' : 'iron_axe',
    bow: veryStrong ? 'silver_bow' : strong ? 'steel_bow' : 'iron_bow',
    dagger: strong ? 'stiletto' : 'dagger',
    staff: strong ? 'holy_staff' : 'wood_staff',
    tome: strong ? 'flame_tome' : 'shadow_tome',
    fang: classId === 'golem' ? 'stone_fist' : 'fang',
    breath: classId === 'ash_dragon' ? 'ash_dragon_breath' : 'fire_breath',
  };
  const armorType = cls.armors[0];
  const armorPick: Record<string, string> = {
    cloth: strong ? 'sage_robe' : 'mage_robe',
    light: veryStrong ? 'steel_cuirass' : strong ? 'chain_mail' : 'leather_armor',
    heavy: veryStrong ? 'knight_plate' : strong ? 'steel_plate' : 'iron_plate',
  };
  // 魔物没有防具
  const monster = cls.tags.includes('beast') || cls.tags.includes('monster') || cls.tags.includes('undead');
  return { weapon: pick[t], armor: monster ? undefined : armorPick[armorType] };
}

let uidCounter = 0;

export function createUnitFromSave(save: UnitSave, team: Team = 'player'): Unit {
  const ch = CHARACTERS[save.id];
  const u: Unit = {
    uid: save.id,
    charId: save.id,
    name: ch?.name ?? save.id,
    team,
    classId: save.classId,
    level: save.level,
    exp: save.exp,
    base: { ...save.base },
    growth: ch?.growth,
    hp: 0,
    mp: 0,
    equipment: { ...save.equipment },
    items: [...save.items],
    skills: [...save.skills],
    x: 0,
    y: 0,
    facing: 'n',
    moved: false,
    acted: false,
    done: false,
    idle: false,
    status: [],
    awake: true,
    boss: false,
    lord: !!ch?.lord,
    portrait: ch?.portrait ?? save.id,
    alive: true,
    gone: false,
    model: buildModelSpec(save.classId, team, undefined, ch?.model),
    kills: save.kills,
  };
  u.hp = maxHp(u);
  u.mp = maxMp(u);
  return u;
}

export function newSaveFromCharacter(id: string): UnitSave {
  const ch = CHARACTERS[id];
  if (!ch) throw new Error(`未知角色 ${id}`);
  const skills = Array.from(new Set([...(ch.skills ?? []), ...skillsForLevel(ch.classId, ch.level, id)]));
  return {
    id,
    classId: ch.classId,
    level: ch.level,
    exp: 0,
    base: { ...ch.base },
    equipment: { ...ch.equipment },
    items: [...(ch.items ?? [])],
    skills,
    fallen: false,
    kills: 0,
    battles: 0,
  };
}

export interface GenericSpec {
  uid?: string;
  classId: string;
  level: number;
  team: Team;
  name?: string;
  equipment?: Equipment;
  items?: string[];
  skills?: string[];
  statMod?: Partial<Stats>;
  model?: Partial<UnitModelSpec>;
  boss?: boolean;
  portrait?: string;
  ai?: AiSpec;
  drop?: string;
}

export function createGenericUnit(g: GenericSpec): Unit {
  const cls = getClass(g.classId);
  const eq = { ...defaultEquipment(g.classId, g.level), ...g.equipment };
  const u: Unit = {
    uid: g.uid ?? `u${++uidCounter}`,
    name: g.name ?? cls.name,
    team: g.team,
    classId: g.classId,
    level: g.level,
    exp: 0,
    base: genericStats(g.classId, g.level, g.statMod),
    hp: 0,
    mp: 0,
    equipment: eq,
    items: [...(g.items ?? [])],
    skills: Array.from(new Set([...(g.skills ?? []), ...skillsForLevel(g.classId, g.level)])),
    x: 0,
    y: 0,
    facing: 's',
    moved: false,
    acted: false,
    done: false,
    idle: false,
    status: [],
    ai: g.ai ?? { type: 'aggressive' },
    awake: true,
    boss: !!g.boss,
    lord: false,
    portrait: g.portrait,
    drop: g.drop,
    alive: true,
    gone: false,
    model: buildModelSpec(g.classId, g.team, { ...(g.boss ? { scale: 1.15 } : {}), ...g.model }),
    kills: 0,
  };
  u.hp = maxHp(u);
  u.mp = maxMp(u);
  return u;
}

/** 由具名角色（Boss/NPC/客串）创建 */
export function createCharacterUnit(charId: string, team: Team, level?: number): Unit {
  const save = newSaveFromCharacter(charId);
  if (level && level > save.level) {
    // 以平均成长提升到指定等级
    const ch = CHARACTERS[charId];
    const dl = level - save.level;
    for (const k of STAT_KEYS) {
      if (k === 'mov') continue;
      save.base[k] += Math.floor((ch.growth[k as Exclude<StatKey, 'mov'>] * dl) / 100);
    }
    save.level = level;
    save.skills = Array.from(new Set([...save.skills, ...skillsForLevel(save.classId, level, charId)]));
  }
  const u = createUnitFromSave(save, team);
  if (team !== 'player') u.ai = { type: 'aggressive' };
  return u;
}

export function toSave(u: Unit, prev?: UnitSave): UnitSave {
  return {
    id: u.charId ?? u.uid,
    classId: u.classId,
    level: u.level,
    exp: u.exp,
    base: { ...u.base },
    equipment: { ...u.equipment },
    items: [...u.items],
    skills: [...u.skills],
    fallen: prev?.fallen ?? false,
    kills: u.kills,
    battles: prev?.battles ?? 0,
  };
}

export function itemName(id: string): string {
  return ITEMS[id]?.name ?? id;
}

export { getItem };
