/**
 * 被动与合璧：搭配在身上的武功给的常驻效果。模拟（build.ts 的 kitOf）和实战（zhaoshi.ts 的 heroSpec）共用这一套算法。
 *
 * - 内功的 passive：护体 guard、身法 haste、回血 heal、涨怒气 rage，一直生效；
 * - 轻功的 passive 里的身法，加在闪避上；
 * - 合璧（combos）：两门都在身上，且这门武功有内功打底（rootsOn）才生效；
 *   「主」（写这条合璧的那门）若是外功，得是眼下出手的那门（activeOuter）；兵器类的那一门，不论当主还是当搭档，兵器都得在手；
 *   拳掌类的外功当搭档，搭配在身上就算，不必正在出手；
 *   合璧里的增益并进被动，减益（点穴、流血……）开战时施给对手；
 * - 内力低于一成五（MP_FLOOR），被动失效（见 combat.ts、duel.ts）。
 */
import { JIANGHU_RULE } from '../content/skills';
import type { ComboDef, FxDef, FxKind, SkillDef } from '../content/types';
import { rootsOn } from './shicheng';

export const PASSIVE_KINDS: FxKind[] = ['guard', 'haste', 'heal', 'rage'];
export type PassiveKind = 'guard' | 'haste' | 'heal' | 'rage';
export type PassiveSum = Record<PassiveKind, number>;
export const NO_PASSIVE: Readonly<PassiveSum> = { guard: 0, haste: 0, heal: 0, rage: 0 };

/** 身上五个位置的武功 */
export interface WornSkills { neigong?: SkillDef; qinggong?: SkillDef; fist?: SkillDef; weapon?: SkillDef; ult?: SkillDef }

/** 一条合璧眼下的情形：搭档在不在、有没有内功打底、生效了没有 */
export interface ComboState { owner: SkillDef; combo: ComboDef; paired: boolean; rooted: boolean; on: boolean; /** 搭档在身上，可「主」这门外功眼下没出手，或兵器类的那门兵器不在手，所以没成 */ idle: boolean }

export interface Passives {
  /** 内功与合璧给的被动（不含轻功的身法） */
  sum: PassiveSum;
  /** 轻功自带的身法，加在闪避上 */
  qinggongHaste: number;
  /** 合璧里的减益，开战时施给对手 */
  openers: FxDef[];
  /** 合璧的火候加成之和（百分点除以一百） */
  hit: number;
  /** 身上武功写的每一条合璧，附生效情形 */
  combos: ComboState[];
}

/** 这门武功有没有内功打底：没有内功时，只有江湖散学使得出 */
const rootedBy = (ng: SkillDef | undefined) => (k: SkillDef): boolean => (ng ? rootsOn(k, ng) : k.school === JIANGHU_RULE.school);

/**
 * opts.outer：眼下出手的外功（实战为 activeOuter，模拟为 outerOf）。传了，拳脚位、兵刃位里不是它的那门，
 * 自己不能当合璧的「主」，但拳脚位的可以当别人的搭档；opts.weaponReady：兵刃位的武功有没有对得上的兵器在手，
 * 没有，兵刃位这门不论当主当搭档都不算。不传 opts 则身上的都算（只列搭配时用）
 */
export function passivesOf(w: WornSkills, opts?: { outer?: SkillDef; weaponReady?: boolean }): Passives {
  const ng = w.neigong;
  const rooted = rootedBy(ng);
  const sum: PassiveSum = { ...NO_PASSIVE };
  const add = (fx: FxDef): void => { if (PASSIVE_KINDS.includes(fx.kind)) sum[fx.kind as PassiveKind] += fx.value ?? 0; };
  for (const fx of ng?.passive || []) add(fx);
  const qinggongHaste = (w.qinggong?.passive || []).filter(f => f.kind === 'haste').reduce((a, f) => a + (f.value ?? 0), 0);
  const openers: FxDef[] = [];
  let hit = 0;
  const worn = [ng, w.qinggong, w.fist, w.weapon, w.ult].filter((k): k is SkillDef => !!k);
  const combos: ComboState[] = [];
  const live = (k: SkillDef): boolean => !opts || (k !== w.fist && k !== w.weapon) || k === opts.outer;
  const mateOk = (x: SkillDef): boolean => !opts || x !== w.weapon || !!opts.weaponReady;
  for (const k of worn) for (const cb of k.combos || []) {
    const isMate = (x: SkillDef): boolean => cb.with.startsWith('门派:') ? x !== k && x.school === cb.with.slice(3) : x.id === cb.with;
    const mateWorn = worn.some(isMate), paired = live(k) && worn.some(x => isMate(x) && mateOk(x));
    const ok = rooted(k);
    combos.push({ owner: k, combo: cb, paired, rooted: ok, on: paired && ok, idle: !paired && mateWorn });
    if (!paired || !ok) continue;
    hit += cb.bonus / 100;
    for (const fx of cb.fx || []) (PASSIVE_KINDS.includes(fx.kind) ? add(fx) : openers.push(fx));
  }
  return { sum, qinggongHaste, openers, hit, combos };
}
