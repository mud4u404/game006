/**
 * 上阵：把存档里的玩家、内容里的对手，换成交手引擎（engine/duel.ts）认得的「人」。
 * - 玩家：五项根基、功力、搭配在各位置的武功（重数、品级）；绝招来自出手的那门外功，杀招来自绝技位；
 * - 对手：内容里只写档次和路数（FoeDef.rank、build），数值由 engine/person.ts 的 standard 算出来；
 * - 备战：知彼（对手出手打折）、帮手（答应来的人真的进场出手）。
 */
import type { GameState } from '../core/state';
import { GRADE_COEF } from '../content';
import type { FoeDef, FxKind, PerformDef, PrepDef, SkillDef, UltDef } from '../content/types';
import type { AllySpec, FoeSpec, HeroSpec, RespKey } from './duel';
import { COMMON, standard, type Attr, type Person } from './person';
import { canPerform } from './shicheng';
import { activeOuter, counterBonus, reachBonus, slotSkill, wielded } from './wuxue';
import { test } from './dsl';

/** 绝招按钮最多几个 */
export const MAX_PERFORMS = 3;

export interface FightKit {
  /** 出手的外功；空手又没有拳脚功夫时为空 */
  outer?: SkillDef;
  /** 能用的绝招（境界够、内功为根），按境界先后 */
  performs: PerformDef[];
  /** 学会了、可是境界不够的绝招，按钮上显示「某某境界」 */
  locked: PerformDef[];
  /** 杀招 */
  ult?: { def: SkillDef; u: UltDef };
  /** 外功有绝招，却没有本门内功打底 */
  unrooted: boolean;
}

export function fightKit(s: GameState): FightKit {
  const outer = activeOuter(s);
  const r = outer ? s.skills[outer.id]?.r ?? 0 : 0;
  const rooted = !!outer && canPerform(s, outer);
  const all = outer?.performs ?? [];
  const performs = rooted ? all.filter(p => (p.realm ?? 0) <= r).slice(0, MAX_PERFORMS) : [];
  const locked = rooted ? all.filter(p => (p.realm ?? 0) > r).slice(0, Math.max(0, MAX_PERFORMS - performs.length)) : [];
  const ud = slotSkill(s, 'ult');
  const ult = ud?.ult && canPerform(s, ud) ? { def: ud, u: ud.ult } : undefined;
  return { outer, performs, locked, ult, unrooted: !!outer && all.length > 0 && !rooted };
}

/** 存档里的根基还是旧刻度（常人 13/11/14/13/10），换成常人二十的刻度；存档第四版换算以后去掉 */
export const OLD_COMMON: Attr = { 体魄: 13, 根骨: 11, 身法: 14, 悟性: 13, 胆魄: 10 };
const toNew = (a: GameState['attr']): Attr => ({
  体魄: (COMMON * a.体魄) / OLD_COMMON.体魄, 根骨: (COMMON * a.根骨) / OLD_COMMON.根骨, 身法: (COMMON * a.身法) / OLD_COMMON.身法,
  悟性: (COMMON * a.悟性) / OLD_COMMON.悟性, 胆魄: (COMMON * a.胆魄) / OLD_COMMON.胆魄
});

/** 玩家这个「人」：武功的重数从一起（存档里的境界从零起），功力以年计（内力一百点一年） */
export function personOf(s: GameState): Person {
  const o = activeOuter(s), ng = slotSkill(s, 'neigong'), qg = slotSkill(s, 'qinggong');
  const R = (d?: SkillDef): number => (d ? (s.skills[d.id]?.r ?? 0) + 1 : 1);
  const G = (d?: SkillDef): number => (d ? GRADE_COEF[d.grade] : GRADE_COEF.凡品);
  return {
    name: s.name, attr: toNew(s.attr), outer: R(o), neigong: R(ng), qinggong: R(qg),
    grade: { outer: G(o), neigong: G(ng), qinggong: G(qg) }, gongli: s.mpMax / 100
  };
}

/** 对手这个「人」：档次、路数 */
export const foePerson = (f: FoeDef): Person => standard(f.rank, f.build ?? 'even', f.name);

/** 生效的备战：条件成立的都算，可以叠加 */
export const activePrep = (f: FoeDef): PrepDef[] => (f.prep ?? []).filter(p => test(p.if));

/** 交给引擎的玩家：气血、内力照存档；克制（性质、兵器长短）并进各应对的成算 */
export function heroSpec(s: GameState, kit: FightKit, f: FoeDef): HeroSpec {
  const ng = slotSkill(s, 'neigong'), qg = slotSkill(s, 'qinggong'), o = kit.outer;
  const src: Record<RespKey, SkillDef | undefined> = { block: ng, dodge: qg, parry: o, rush: o };
  const bonus: Partial<Record<RespKey, number>> = {};
  for (const k of Object.keys(src) as RespKey[]) {
    const d = src[k];
    if (d) bonus[k] = counterBonus(d.nature, f.nature) + reachBonus(k, d.reach, f.reach);
  }
  return {
    person: personOf(s), name: s.name, hp: s.hp, hpMax: s.hpMax, mp: s.mp, mpMax: s.mpMax,
    has: { block: !!ng, dodge: !!qg, parry: !!o, rush: !!o }, bonus,
    performs: kit.performs.map(p => ({ name: p.name, mp: p.mp, cd: p.cd, hits: p.hits, dmg: p.dmg, acc: p.acc, fx: p.fx ?? [] })),
    ult: kit.ult ? { dmg: kit.ult.u.dmg, fx: kit.ult.u.fx ?? [] } : undefined
  };
}

/** 交给引擎的对手：知彼的倍数叠乘 */
export function foeSpec(f: FoeDef, prep: PrepDef[]): FoeSpec {
  const mul = (k: 'atk' | 'big'): number => prep.reduce((m, p) => m * (p[k] ?? 1), 1);
  const atk = mul('atk'), big = mul('big');
  return {
    person: foePerson(f), name: f.name, tells: f.tells.map(t => t.dom), firstTell: f.firstTell,
    spar: f.spar, script: f.script, phase2: !!f.phase2, weak: f.weak,
    atkMul: atk !== 1 ? atk : undefined, bigMul: big !== 1 ? big : undefined
  };
}

/** 答应来的帮手 */
export const alliesOf = (prep: PrepDef[]): AllySpec[] =>
  prep.flatMap(p => (p.ally ? [{ name: p.ally.name, share: p.ally.share, at: p.ally.at }] : []));

/** 出手时说的兵器：剑法说「剑」，掌法说「掌」……空手说「拳」 */
export function weaponWord(s: GameState): string {
  const o = activeOuter(s);
  const byCat: Partial<Record<SkillDef['category'], string>> = {
    剑法: '剑', 刀法: '刀', 枪法: '枪', 棍法: '棍', 杖法: '杖', 鞭法: '鞭', 斧法: '斧', 锤法: '锤', 奇门: '招',
    拳法: '拳', 掌法: '掌', 指法: '指', 爪法: '爪', 腿法: '腿', 手法: '手'
  };
  return (o && byCat[o.category]) ?? (wielded(s) ? '招' : '拳');
}

/** 对手身上的状态，对手卡片上显示 */
export const FOE_FX_TAG: Partial<Record<FxKind, [string, string]>> = {
  busy: ['穴道受制', 'warn'], disarm: ['兵刃脱手', 'warn'], bleed: ['流血', 'danger'], poison: ['中毒', 'danger'],
  burn: ['灼伤', 'danger'], chill: ['寒气入体', 'info'], weaken: ['劲力被卸', 'info'], break: ['门户大开', 'danger']
};

/** 效果上身时的一句叙述 */
export const FX_SAY: Partial<Record<FxKind, (foe: string) => string>> = {
  busy: f => `${f}半身一僵，穴道受制，一时动弹不得！`,
  disarm: f => `${f}手腕一麻，兵刃脱手飞出！`,
  bleed: f => `${f}伤口血流不止。`,
  poison: f => `${f}脸上泛起一层青气，中毒了。`,
  burn: f => `${f}衣衫焦黑，灼痛难当。`,
  chill: f => `一股寒气透入${f}经脉，出招慢了下来。`,
  weaken: f => `${f}的劲力被卸去大半，出手轻飘飘的。`,
  break: f => `${f}门户大开，再挨一下就要重伤！`,
  fear: f => `${f}心生怯意，气势一弱。`,
  drain: () => '你借他的内力，补足了自己。',
  guard: () => '你内劲护体，周身一紧。',
  haste: () => '你身形一飘，脚下轻快了许多。',
  heal: () => '你调匀气息，伤势缓了一缓。'
};
