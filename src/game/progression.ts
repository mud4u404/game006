/**
 * 经验、升级、转职
 * 经典规则：每 100 点经验升一级；按造成伤害占敌方 HP 的比例获得经验，最后一击拿满，
 * 并按等级差修正；治疗与辅助也能获得经验。
 */
import { getClass } from '@/data/classes';
import { CHARACTERS } from '@/data/characters';
import { ITEMS } from '@/data/items';
import type { GrowthKey, Stats } from '@/data/types';
import { GROWTH_KEYS } from '@/data/types';
import type { Rng } from '@/core/rng';
import { MAX_LEVEL, maxHp, maxMp, powerLevel, skillsForLevel, type Unit, type UnitSave } from './unit';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** 敌人的经验价值 */
export function expValue(enemy: Unit): number {
  return (30 + 2 * powerLevel(enemy)) * (enemy.boss ? 2.5 : 1);
}

export function levelRatio(me: Unit, enemy: Unit): number {
  return clamp(powerLevel(enemy) / powerLevel(me), 0.2, 2.5);
}

function expMul(u: Unit): number {
  return u.equipment.accessory && ITEMS[u.equipment.accessory]?.accessory?.special === 'exp_up' ? 1.5 : 1;
}

/** 一次攻击获得的经验 */
export function combatExp(me: Unit, enemy: Unit, dmgDealt: number, killed: boolean, anyHit: boolean): number {
  if (me.level >= MAX_LEVEL && getClass(me.classId).tier >= 2) return 0;
  const v = expValue(enemy) * levelRatio(me, enemy);
  let e: number;
  if (killed) e = v;
  else if (anyHit && dmgDealt > 0) e = v * (dmgDealt / maxHp(enemy)) * 0.6;
  else e = 1;
  return clamp(Math.round(e * expMul(me)), 1, 100);
}

/** 治疗/辅助获得的经验 */
export function supportExp(me: Unit, healed: number): number {
  if (me.level >= MAX_LEVEL && getClass(me.classId).tier >= 2) return 0;
  return clamp(Math.round((12 + healed / 2) * expMul(me)), 1, 100);
}

export interface LevelUpResult {
  uid: string;
  level: number;
  gains: Partial<Stats>;
  learned: string[];
}

function growthOf(u: Unit): Record<GrowthKey, number> {
  if (u.charId && CHARACTERS[u.charId]) return CHARACTERS[u.charId].growth;
  return getClass(u.classId).growth;
}

/** 升一级：按成长率判定属性，至少提升 2 项 */
export function levelUp(u: Unit, rng: Rng): LevelUpResult {
  const cls = getClass(u.classId);
  const g = growthOf(u);
  const gains: Partial<Stats> = {};
  const roll = (k: GrowthKey): number => {
    const rate = g[k];
    return Math.floor(rate / 100) + (rng.chance(rate % 100) ? 1 : 0);
  };
  for (const k of GROWTH_KEYS) {
    const room = cls.caps[k] - u.base[k];
    if (room <= 0) continue;
    const v = Math.min(room, roll(k));
    if (v > 0) gains[k] = v;
  }
  // 保底：至少 2 项提升（按成长率从高到低补足）
  const order = [...GROWTH_KEYS].sort((a, b) => g[b] - g[a]);
  for (const k of order) {
    if (Object.keys(gains).length >= 2) break;
    if (gains[k]) continue;
    if (cls.caps[k] - u.base[k] <= 0) continue;
    gains[k] = 1;
  }
  const oldMax = maxHp(u);
  const oldMaxMp = maxMp(u);
  for (const k of Object.keys(gains) as GrowthKey[]) u.base[k] += gains[k]!;
  u.hp += maxHp(u) - oldMax;
  u.mp += maxMp(u) - oldMaxMp;
  u.level += 1;
  const learned: string[] = [];
  for (const s of skillsForLevel(u.classId, u.level, u.charId)) {
    if (!u.skills.includes(s)) {
      u.skills.push(s);
      learned.push(s);
    }
  }
  return { uid: u.uid, level: u.level, gains, learned };
}

/** 获得经验，可能升级（单次最多升一级） */
export function gainExp(u: Unit, amount: number, rng: Rng): LevelUpResult | null {
  if (amount <= 0) return null;
  if (u.level >= MAX_LEVEL) {
    u.exp = Math.min(99, u.exp + amount);
    return null;
  }
  u.exp += amount;
  if (u.exp >= 100) {
    u.exp -= 100;
    const r = levelUp(u, rng);
    if (u.level >= MAX_LEVEL) u.exp = 0;
    return r;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 转职                                                                */
/* ------------------------------------------------------------------ */

export const PROMOTE_LEVEL = 10;

export interface PromoteOption {
  to: string;
  item?: string;
  /** 条件是否满足（等级、道具） */
  available: boolean;
  reason?: string;
}

/** 列出存档单位的转职选项 */
export function promoteOptions(save: UnitSave, inventory: string[]): PromoteOption[] {
  const cls = getClass(save.classId);
  if (!cls.promotesTo) return [];
  return cls.promotesTo.map((p) => {
    let available = save.level >= PROMOTE_LEVEL;
    let reason = available ? undefined : `需要 Lv${PROMOTE_LEVEL} 以上`;
    if (p.item) {
      const has = save.items.includes(p.item) || inventory.includes(p.item);
      if (!has) {
        available = false;
        reason = `需要「${ITEMS[p.item]?.name ?? p.item}」`;
      }
    }
    return { to: p.to, item: p.item, available, reason };
  });
}

/** 执行转职：等级重置为 1，加上转职加成，习得新职业的技能 */
export function promoteSave(save: UnitSave, to: string): Partial<Stats> {
  const next = getClass(to);
  const bonus = next.promoteBonus ?? {};
  for (const k of Object.keys(bonus) as (keyof Stats)[]) {
    save.base[k] = Math.min(next.caps[k], save.base[k] + (bonus[k] ?? 0));
  }
  // 保证不低于新职业的基础值
  for (const k of Object.keys(next.base) as (keyof Stats)[]) {
    if (k === 'mov') save.base.mov = Math.max(save.base.mov, next.base.mov);
  }
  save.classId = to;
  save.level = 1;
  save.exp = 0;
  for (const s of skillsForLevel(to, 1, save.id)) if (!save.skills.includes(s)) save.skills.push(s);
  return bonus;
}
