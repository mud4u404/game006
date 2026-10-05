/**
 * 战斗计算（纯函数）
 * 经典规则：
 *  - 物理：伤害 = AP×(1+攻方地形攻击%) − DP×(1+守方地形防御%)，可为 0（无效）
 *  - 魔法：伤害 = 魔力 + 威力 − 魔防×(1+地形防御%/2)；法术不会被反击
 *  - 命中 = HIT − EV（5~100）
 *  - 会心：无视一半防御并 ×1.5
 *  - 受到攻击且射程够得着的一方会反击（空手、沉睡、被法术攻击时不能反击）
 */
import { SKILLS } from '@/data/skills';
import type { Element, SkillDef, StatusId, UnitTag } from '@/data/types';
import type { Rng } from '@/core/rng';
import { derived, hasStatus, maxHp, stats, tagsOf, weaponOf, type Unit } from '../unit';
import { manhattan, type BattleMap } from './grid';

export interface StrikeCalc {
  /** 预估伤害（浮动前） */
  dmg: number;
  dmgMin: number;
  dmgMax: number;
  hit: number;
  crit: number;
  magic: boolean;
  effective: boolean;
  element?: Element;
  /** 每次行动的攻击次数 */
  hits: number;
  status?: { id: StatusId; chance: number; turns: number };
  drain: boolean;
  /** 羁绊加成是否生效（界面显示用） */
  bond?: boolean;
}

/** 羁绊加成：由当前战斗提供（相邻且羁绊等级已解锁的同伴） */
export interface BondBonus {
  hit: number;
  ev: number;
  dmg: number;
}
let bondProvider: ((u: Unit) => BondBonus | null) | null = null;
export function setBondProvider(fn: ((u: Unit) => BondBonus | null) | null) {
  bondProvider = fn;
}

export interface Forecast {
  attacker: Unit;
  defender: Unit;
  skill?: SkillDef;
  atk: StrikeCalc;
  /** 反击（null = 不能反击） */
  counter: StrikeCalc | null;
  distance: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function isEffective(list: UnitTag[] | undefined, target: Unit): boolean {
  if (!list) return false;
  const tags = tagsOf(target);
  return list.some((t) => tags.includes(t));
}

/** 地形修正 */
function terrainMods(map: BattleMap, u: Unit) {
  const t = map.def(u.x, u.y);
  return { atk: t.atk / 100, def: t.def / 100 };
}

/** 单位当前武器能否攻击到 distance 距离 */
export function weaponReaches(u: Unit, distance: number): boolean {
  const w = weaponOf(u);
  if (!w) return false;
  return distance >= w.range[0] && distance <= w.range[1];
}

/** 单位能否反击：有武器、射程够得着、没有沉睡 */
export function canCounter(def: Unit, distance: number): boolean {
  if (!def.alive || hasStatus(def, 'sleep')) return false;
  return weaponReaches(def, distance);
}

/**
 * 计算一次攻击（武器普攻或技能）的命中、伤害
 */
export function calcStrike(map: BattleMap, att: Unit, def: Unit, skill?: SkillDef): StrikeCalc {
  const as = stats(att);
  const ds = stats(def);
  const ad = derived(att);
  const dd = derived(def);
  const at = terrainMods(map, att);
  const dt = terrainMods(map, def);
  const w = weaponOf(att);

  const spellMagic = !!skill && (skill.kind === 'magic' || skill.kind === 'debuff');
  const magic = spellMagic || (!skill && ad.magic) || (!!skill && skill.kind === 'tech' && ad.magic);
  const element = skill?.element ?? w?.element;
  const effective = isEffective(skill?.effective, def) || isEffective(w?.effective, def);
  const effMul = effective ? 1.5 : 1;

  let dmg: number;
  let hit: number;
  let crit: number;

  if (spellMagic) {
    // 法术：魔力 + 威力 − 魔防
    const power = (skill!.power ?? 0) + as.mag;
    const mdp = dd.mdp * (1 + dt.def / 2);
    dmg = skill!.kind === 'debuff' ? 0 : Math.max(0, Math.floor((power - mdp) * effMul));
    hit = clamp((skill!.hit ?? 90) + (as.mag - ds.res) + (as.agi - ds.agi), 30, 100);
    crit = 0;
  } else if (magic) {
    // 魔导书普攻 / 魔法系武技
    const mult = skill?.mult ?? 1;
    const ap = ad.ap * mult * (1 + at.atk);
    const mdp = dd.mdp * (1 + dt.def / 2);
    dmg = Math.max(0, Math.floor((ap - mdp) * effMul));
    hit = clamp(ad.hit + (skill?.hitBonus ?? 0) - dd.ev, 5, 100);
    crit = clamp(ad.crit + (skill?.critBonus ?? 0) - Math.floor(ds.agi / 4), 0, 100);
  } else {
    const mult = skill?.mult ?? 1;
    const ap = ad.ap * mult * (1 + at.atk);
    const dp = dd.dp * (1 + dt.def);
    dmg = Math.max(0, Math.floor((ap - dp) * effMul));
    hit = clamp(ad.hit + (skill?.hitBonus ?? 0) - dd.ev, 5, 100);
    crit = clamp(ad.crit + (skill?.critBonus ?? 0) - Math.floor(ds.agi / 4), 0, 100);
  }
  // 羁绊：攻方加命中与伤害，守方加回避
  const ab = bondProvider?.(att) ?? null;
  const db = bondProvider?.(def) ?? null;
  if (ab && dmg > 0 && skill?.kind !== 'debuff') dmg += ab.dmg;
  if (ab) hit += ab.hit;
  if (db) hit -= db.ev;
  hit = clamp(hit, spellMagic ? 30 : 5, 100);
  if (!w && !skill) {
    dmg = 0;
    hit = 0;
  }
  const spread = dmg >= 6 ? Math.max(1, Math.round(dmg * 0.05)) : 0;
  return {
    dmg,
    dmgMin: Math.max(0, dmg - spread),
    dmgMax: dmg + spread,
    hit,
    crit,
    magic,
    effective,
    element,
    hits: skill?.hits ?? 1,
    status: skill?.status ?? w?.status,
    drain: !!w?.drain && !skill && !magic ? true : !!(w?.drain && skill?.kind === 'tech'),
    bond: !!ab || !!db,
  };
}

/** 会心伤害：无视一半防御并 ×1.5 */
export function critDamage(map: BattleMap, att: Unit, def: Unit, skill?: SkillDef): number {
  const ad = derived(att);
  const dd = derived(def);
  const at = terrainMods(map, att);
  const dt = terrainMods(map, def);
  const w = weaponOf(att);
  const effective = isEffective(skill?.effective, def) || isEffective(w?.effective, def);
  const mult = skill?.mult ?? 1;
  const ap = ad.ap * mult * (1 + at.atk);
  const d = ad.magic ? dd.mdp * (1 + dt.def / 2) : dd.dp * (1 + dt.def);
  return Math.max(1, Math.floor((ap - d * 0.5) * 1.5 * (effective ? 1.5 : 1)));
}

export function forecast(map: BattleMap, att: Unit, def: Unit, skill?: SkillDef): Forecast {
  const distance = manhattan(att.x, att.y, def.x, def.y);
  const atk = calcStrike(map, att, def, skill);
  let counter: StrikeCalc | null = null;
  const spell = !!skill && skill.kind !== 'tech';
  if (!spell && !skill?.noCounter && canCounter(def, distance)) {
    counter = calcStrike(map, def, att);
  }
  return { attacker: att, defender: def, skill, atk, counter, distance };
}

/* ------------------------------------------------------------------ */
/* 结算                                                                */
/* ------------------------------------------------------------------ */

export interface StrikeResult {
  attacker: string;
  defender: string;
  counter: boolean;
  hit: boolean;
  crit: boolean;
  dmg: number;
  /** 守方剩余 HP */
  hpAfter: number;
  killed: boolean;
  status?: StatusId;
  /** 吸血回复量 */
  drained: number;
  magic: boolean;
  element?: Element;
  effective: boolean;
}

function rollDamage(c: StrikeCalc, rng: Rng): number {
  if (c.dmgMax <= c.dmgMin) return c.dmg;
  return rng.int(c.dmgMin, c.dmgMax);
}

function applyStatus(def: Unit, st: { id: StatusId; turns: number }) {
  const ex = def.status.find((s) => s.id === st.id);
  if (ex) ex.turns = Math.max(ex.turns, st.turns);
  else def.status.push({ id: st.id, turns: st.turns });
}

function immune(u: Unit): boolean {
  const acc = u.equipment.accessory;
  return !!acc && acc === 'pure_charm';
}

export function strikeOnce(
  map: BattleMap,
  att: Unit,
  def: Unit,
  calc: StrikeCalc,
  rng: Rng,
  isCounter: boolean,
  skill?: SkillDef,
): StrikeResult {
  const hit = rng.chance(calc.hit);
  let crit = false;
  let dmg = 0;
  let status: StatusId | undefined;
  let drained = 0;
  if (hit) {
    crit = calc.crit > 0 && rng.chance(calc.crit);
    dmg = crit ? critDamage(map, att, def, skill) : rollDamage(calc, rng);
    dmg = Math.min(dmg, def.hp);
    def.hp -= dmg;
    if (calc.drain && dmg > 0) {
      drained = Math.min(Math.floor(dmg / 2), maxHp(att) - att.hp);
      att.hp += drained;
    }
    if (calc.status && def.hp > 0 && !immune(def) && rng.chance(calc.status.chance)) {
      applyStatus(def, calc.status);
      status = calc.status.id;
    }
  }
  const killed = def.hp <= 0;
  if (killed) def.alive = false;
  return {
    attacker: att.uid,
    defender: def.uid,
    counter: isCounter,
    hit,
    crit,
    dmg,
    hpAfter: def.hp,
    killed,
    status,
    drained,
    magic: calc.magic,
    element: calc.element,
    effective: calc.effective,
  };
}

/**
 * 结算一次交战：攻方攻击（可能多段）→ 守方反击
 */
export function resolveCombat(map: BattleMap, att: Unit, def: Unit, rng: Rng, skill?: SkillDef): StrikeResult[] {
  const fc = forecast(map, att, def, skill);
  const out: StrikeResult[] = [];
  for (let i = 0; i < fc.atk.hits && def.alive && att.alive; i++) {
    out.push(strikeOnce(map, att, def, fc.atk, rng, false, skill));
  }
  if (fc.counter && def.alive && att.alive) {
    // 受到攻击后状态可能变化（如被催眠），重新判定
    if (canCounter(def, fc.distance)) {
      out.push(strikeOnce(map, def, att, fc.counter, rng, true));
    }
  }
  return out;
}

/** 法术（无反击）对单个目标的结算 */
export function resolveSpellOn(map: BattleMap, caster: Unit, target: Unit, skill: SkillDef, rng: Rng): StrikeResult {
  const calc = calcStrike(map, caster, target, skill);
  if (skill.kind === 'debuff') {
    const hit = rng.chance(calc.hit) && !immune(target);
    if (hit && skill.status) applyStatus(target, skill.status);
    return {
      attacker: caster.uid,
      defender: target.uid,
      counter: false,
      hit,
      crit: false,
      dmg: 0,
      hpAfter: target.hp,
      killed: false,
      status: hit ? skill.status?.id : undefined,
      drained: 0,
      magic: true,
      element: skill.element,
      effective: false,
    };
  }
  return strikeOnce(map, caster, target, calc, rng, false, skill);
}

/** 治疗量 */
export function healAmount(caster: Unit, skill: SkillDef): number {
  return (skill.power ?? 0) + Math.floor(stats(caster).mag / 2);
}

export function getSkillDef(id: string): SkillDef | undefined {
  return SKILLS[id];
}
