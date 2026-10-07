/**
 * 武学库的数值规则（纯函数，便于测试）。设计说明见 docs/wuxue.md。
 *
 * - 功力 = 境界 × 10 × 品级系数
 * - 火候 = 槽位里那门武功的功力 + 对应属性 + 同源加成（硬接另加内力充足程度）
 * - 修为 = 各槽位功力的加权和，分为不入流到宗师六档
 * - 克制：柔克刚、刚克阴、阴克阳、阳克柔；兵器一寸长一寸强，一寸短一寸险
 */
import type { GameState } from '../core/state';
import { GRADE_COEF, SLOT_CATS, skillById } from '../content';
import { FX_RULES, PASSIVE_COST } from '../content/skills';
import type { AttrKey, FxDef, PerformDef, SkillDef, SkillNature, SkillReach, Slot, UltDef } from '../content/types';

export type Loadout = Partial<Record<Slot, string>>;
export type RespKey = 'block' | 'dodge' | 'parry' | 'rush';
type CombatSlot = Exclude<Slot, 'ult'>;

/** 每种应对由哪个槽位的武功负责 */
export const RESP_SLOT: Record<RespKey, CombatSlot> = { block: 'neigong', dodge: 'qinggong', parry: 'main', rush: 'off' };
/** 每个槽位看哪项属性 */
export const SLOT_ATTR: Record<CombatSlot, AttrKey> = { neigong: '根骨', qinggong: '身法', main: '悟性', off: '胆魄' };
const SLOTS: Slot[] = ['neigong', 'qinggong', 'main', 'off', 'ult'];

export const skillPower = (def: SkillDef, realm: number): number => realm * 10 * GRADE_COEF[def.grade];
export const fits = (def: SkillDef, slot: Slot): boolean => SLOT_CATS[slot].includes(def.category);

const realmOf = (s: Pick<GameState, 'skills'>, id: string): number => s.skills[id]?.r ?? 0;

/** 槽位里的武功；没放、没学会或不存在时为空 */
export function slotSkill(s: Pick<GameState, 'skills' | 'loadout'>, slot: Slot): SkillDef | undefined {
  const id = s.loadout?.[slot];
  if (!id || !s.skills[id]) return undefined;
  return skillById(id);
}

/** 按已学武功排出默认搭配：每个槽位放功力最高的一门，副手放第二高的外功 */
export function defaultLoadout(skills: GameState['skills']): Loadout {
  const learned = Object.keys(skills).map(id => skillById(id)).filter((d): d is SkillDef => !!d);
  const rank = (d: SkillDef): number => skillPower(d, skills[d.id]!.r) + GRADE_COEF[d.grade] / 100;
  const pick = (slot: Slot, except?: string): string | undefined =>
    learned.filter(d => fits(d, slot) && d.id !== except).sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id))[0]?.id;
  const lo: Loadout = {};
  for (const slot of SLOTS) {
    const id = slot === 'off' ? pick('off', lo.main) : pick(slot);
    if (id) lo[slot] = id;
  }
  return lo;
}

/** 刚学会一门武功时，如果有合适的空槽位，自动放进去 */
export function autoSlot(s: Pick<GameState, 'loadout'>, def: SkillDef): void {
  const lo = (s.loadout ||= {});
  const order: Slot[] = def.category === '内功' ? ['neigong'] : def.category === '轻功' ? ['qinggong'] : def.category === '绝技' ? ['ult'] : ['main', 'off'];
  const free = order.find(slot => !lo[slot]);
  if (free) lo[free] = def.id;
}

/** 同源加成：内功与主手同出一门且都练到「炉火纯青」，火候 +3；内功与主手一阴一阳，彼此相冲，火候 −3 */
export function synergy(s: Pick<GameState, 'skills' | 'loadout'>): number {
  const ng = slotSkill(s, 'neigong'), mn = slotSkill(s, 'main');
  if (!ng || !mn) return 0;
  let v = 0;
  if (ng.school === mn.school && realmOf(s, ng.id) >= 3 && realmOf(s, mn.id) >= 3) v += 3;
  const yy = new Set([ng.nature, mn.nature]);
  if (yy.has('阴') && yy.has('阳')) v -= 3;
  return v;
}

/** 火候：境界、品级、属性、同源合在一起；硬接另加当前内力的充足程度 0 到 10 */
export function huohou(s: GameState, k: RespKey): number {
  const slot = RESP_SLOT[k];
  const def = slotSkill(s, slot);
  let v = (def ? skillPower(def, realmOf(s, def.id)) : 0) + s.attr[SLOT_ATTR[slot]] + synergy(s);
  if (k === 'block') v += Math.round((s.mp / s.mpMax) * 10);
  return Math.round(v);
}

const BEATS: Record<SkillNature, SkillNature | null> = { 柔: '刚', 刚: '阴', 阴: '阳', 阳: '柔', 中正: null };

/** 性质相克：我克对方 +8%，对方克我 −8% */
export function counterBonus(mine?: SkillNature, theirs?: SkillNature): number {
  if (!mine || !theirs) return 0;
  if (BEATS[mine] === theirs) return 0.08;
  if (BEATS[theirs] === mine) return -0.08;
  return 0;
}

const REACH_RANK: Record<SkillReach, number> = { 徒手: 0, 短: 1, 长: 2 };

/** 兵器长短：比对方长，抢攻 +5%；比对方短，拆招 +5% */
export function reachBonus(k: RespKey, mine?: SkillReach, theirs?: SkillReach): number {
  if (!mine || !theirs) return 0;
  const d = REACH_RANK[mine] - REACH_RANK[theirs];
  if (k === 'rush' && d > 0) return 0.05;
  if (k === 'parry' && d < 0) return 0.05;
  return 0;
}

export const XIUWEI: [number, string][] = [[0, '不入流'], [30, '三流'], [80, '二流'], [150, '一流'], [240, '绝顶'], [360, '宗师']];
const XIUWEI_WEIGHT: Record<Slot, number> = { neigong: 1.5, qinggong: 1, main: 1, off: 0.5, ult: 0.5 };

/** 修为：各槽位武功功力的加权和。内功是根基，分量最重 */
export function xiuwei(s: Pick<GameState, 'skills' | 'loadout'>): { value: number; rank: string } {
  let value = 0;
  for (const slot of SLOTS) {
    const def = slotSkill(s, slot);
    if (def) value += skillPower(def, realmOf(s, def.id)) * XIUWEI_WEIGHT[slot];
  }
  value = Math.round(value);
  const rank = XIUWEI.filter(([min]) => value >= min).pop()![1];
  return { value, rank };
}

/* ---------- 绝招预算：伤害与效果折算成同一把尺子，供校验和试算台使用 ---------- */

/** 一个效果折算成的伤害当量（已乘触发几率） */
export function fxCost(fx: FxDef): number {
  const rule = FX_RULES[fx.kind];
  return rule.cost(fx.value ?? 0, fx.rounds ?? 1) * (fx.chance ?? 1);
}

/** 绝招的期望伤害：连击数 × 平均伤害 × 命中率 */
export const performExpected = (p: PerformDef): number => p.hits * ((p.dmg[0] + p.dmg[1]) / 2) * p.acc;

/** 绝招的预算：期望伤害 + 效果当量 */
export const performBudget = (p: PerformDef): number => performExpected(p) + (p.fx || []).reduce((a, f) => a + fxCost(f), 0);

/** 绝招的效率：预算 ÷（耗内力 + 20 × 调息合数） */
export const performEfficiency = (p: PerformDef): number => performBudget(p) / (p.mp + 20 * p.cd);

/** 杀招的预算：平均伤害 + 效果当量 */
export const ultBudget = (u: UltDef): number => (u.dmg[0] + u.dmg[1]) / 2 + (u.fx || []).reduce((a, f) => a + fxCost(f), 0);

/** 被动效果的当量 */
export const passiveCost = (list: FxDef[] = []): number => list.reduce((a, f) => a + (PASSIVE_COST[f.kind] ?? Infinity) * (f.value ?? 0), 0);

