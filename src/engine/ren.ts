/**
 * 玩家这个「人」：从存档里读出来，交给交手引擎和人物页（docs/foundation.md 第三节第一、九条）。
 * - 五项根基是先天的（常人二十），后天随武功长：内功长体魄、根骨，轻功长身法，外功长悟性、胆魄，每重两点；
 * - 功力以年计，一年一百点内力，靠静修的岁月熬；
 * - 气血、内力的上限不再一笔笔加减，由「人」算出来（engine/person.ts），存档里只是记下当前的数。
 */
import type { GameState } from '../core/state';
import { GRADE_COEF, REALM_NEED } from '../content';
import type { SkillDef } from '../content/types';
import { COMMON, gongliAt, houtian, hpMaxOf, mpMaxOf, realmAt, tierName, tierOf, type Attr, type Person } from './person';
import { cn } from '../core/util';
import { activeOuter, slotSkill } from './wuxue';
import { gearBonus } from './zhuangbei';

/** 武功的重数：存档里的境界从零起，「人」的重数从一起；没有这门武功算第一重 */
const R = (s: Pick<GameState, 'skills'>, d?: SkillDef): number => (d ? (s.skills[d.id]?.r ?? 0) + 1 : 1);
const G = (d?: SkillDef): number => (d ? GRADE_COEF[d.grade] : GRADE_COEF.凡品);

/** 玩家这个「人」：出手的外功、搭配的内功和轻功、身上的装备（行囊 items 给了就只算还在行囊里的） */
export type Body = Pick<GameState, 'name' | 'attr' | 'skills' | 'loadout' | 'gear' | 'gongli'> & { items?: GameState['items'] };

export function personOf(s: Body): Person {
  const o = activeOuter(s), ng = slotSkill(s, 'neigong'), qg = slotSkill(s, 'qinggong');
  return {
    name: s.name, attr: { ...s.attr }, outer: R(s, o), neigong: R(s, ng), qinggong: R(s, qg),
    grade: { outer: G(o), neigong: G(ng), qinggong: G(qg) }, gongli: s.gongli, gear: gearBonus(s)
  };
}

/**
 * 换了装备：气血、内力上限跟着变，当前值按原来的成数保留。
 * 不像 syncBody 那样把涨的一截直接补进当前值，免得脱了又穿、穿了又脱白白回血。
 */
export function syncGear(s: GameState): void {
  const fh = s.hpMax > 0 ? s.hp / s.hpMax : 1, fm = s.mpMax > 0 ? s.mp / s.mpMax : 1;
  const p = personOf(s);
  s.hpMax = hpMaxOf(p);
  s.mpMax = mpMaxOf(p);
  s.hp = Math.max(1, Math.min(s.hpMax, Math.round(s.hpMax * fh)));
  s.mp = Math.max(0, Math.min(s.mpMax, Math.round(s.mpMax * fm)));
}

/**
 * 气血、内力上限由「人」算出来。上限涨了，涨的那一截直接补进当前值（练成一重内功，气血跟着满上去一截）；
 * 降了就截到上限。可以反复调用，返回上限各变了多少。
 */
export function syncBody(s: GameState): { dh: number; dm: number } {
  const p = personOf(s);
  const hpMax = hpMaxOf(p), mpMax = mpMaxOf(p);
  const dh = hpMax - (s.hpMax || 0), dm = mpMax - (s.mpMax || 0);
  s.hpMax = hpMax;
  s.mpMax = mpMax;
  s.hp = Math.max(1, Math.min(hpMax, Math.round(s.hp + Math.max(0, dh))));
  s.mp = Math.max(0, Math.min(mpMax, Math.round(s.mp + Math.max(0, dm))));
  return { dh, dm };
}

/** 后天根基 */
export const houtianOf = (s: Body): Attr => houtian(personOf(s));

/** 档次：练得最高的那门武功到了这一档的重数，功力也够这一档的一半 */
export function tierNow(s: GameState): { t: number; name: string } {
  const t = tierOf(personOf(s));
  return { t, name: tierName(t) };
}

/** 功力怎样说，全游戏一种说法（年、月）：「三年」「一年六月」「九月」；不满一月写「不满一月」。人物页、搭配、出关邸报都用它 */
export function gongliText(g: number): string {
  const total = Math.max(0, Math.round(g * 12 + 1e-9)), y = Math.floor(total / 12), m = total % 12;
  const cnN = (n: number): string => {
    const d = '零一二三四五六七八九';
    if (n < 10) return d[n];
    if (n < 20) return '十' + (n % 10 ? d[n % 10] : '');
    if (n < 100) return d[Math.floor(n / 10)] + '十' + (n % 10 ? d[n % 10] : '');
    return String(n);
  };
  if (total === 0) return '不满一月';
  return (y ? cnN(y) + '年' : '') + (m ? cnN(m) + '月' : '');
}

/**
 * 下一档要什么、差多少（审查 G10：页面上看不到下一档的门槛）。到顶了返回 null。
 * 档次看两样：搭配着的武功里练得最高的那门到了第几重，功力够不够这一档的一半（engine/person.ts 的 tierOf）
 */
export function nextTierLine(s: GameState): string | null {
  const t = tierNow(s).t;
  if (t >= 5) return null;
  const p = personOf(s), r = Math.max(p.outer, p.neigong, p.qinggong);
  const needR = Math.ceil(realmAt(t + 1) - 1e-9), needG = gongliAt(t + 1) * 0.5;
  const a = `搭配着的武功里练得最高的一门到第${cn(needR)}重${r >= needR ? '（已到）' : `（眼下第${cn(r)}重）`}`;
  const b = `功力${gongliText(needG)}${s.gongli >= needG ? '（已到）' : `（眼下${gongliText(s.gongli)}）`}`;
  return `要入${tierName(t + 1)}：${a}，${b}。`;
}

/**
 * 离下一档还有多远，一行字（角色卡、战力旁边）：「距三流：寒江剑法第一重 → 第三重，已 51 / 200」。
 * 搭配着的内功、轻功、出手的外功里，练得最高的那门最近；重数够了就看功力。到顶或一切都够了返回 null
 */
export function jinduLine(s: GameState): string | null {
  const t = tierNow(s).t;
  if (t >= 5) return null;
  const needR = Math.ceil(realmAt(t + 1) - 1e-9), needG = gongliAt(t + 1) * 0.5;
  const defs = [activeOuter(s), slotSkill(s, 'neigong'), slotSkill(s, 'qinggong')].filter((d): d is SkillDef => !!d && !!s.skills[d.id]);
  const top = defs.reduce<SkillDef | undefined>((a, d) => (!a || s.skills[d.id]!.r > s.skills[a.id]!.r ? d : a), undefined);
  const to = tierName(t + 1);
  if (top) {
    const k = s.skills[top.id]!;
    if (k.r + 1 < needR) return `距${to}：${top.name}第${cn(k.r + 1)}重 → 第${cn(needR)}重，已 ${k.p} / ${REALM_NEED[k.r]}`;
  }
  return s.gongli < needG ? `距${to}：功力${gongliText(s.gongli)} → ${gongliText(needG)}` : null;
}

/** 下一档要多少功力（档次看功力够不够这一档的一半） */
export const gongliNeed = (t: number): number => gongliAt(t) * 0.5;

/** 根基离常人多远 */
export const vsCommon = (v: number): number => v - COMMON;
