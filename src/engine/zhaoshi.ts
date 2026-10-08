/**
 * 实战里能用的招式：由搭配算出（docs/zhuangbei.md 第二节）。
 * - 绝招来自出手的那门外功：练到对应的境界、有本门内功打底才使得出来；
 * - 杀招来自绝技位；
 * - 绝招的效果（点穴、流血、卸力……）交给战斗内核（engine/combat.ts）判定，实战和对战模拟用同一套规则。
 */
import type { GameState } from '../core/state';
import type { FoeDef, FxKind, PerformDef, SkillDef, UltDef } from '../content/types';
import { toMove } from './build';
import { fighter, type Fighter, type Kit, type Move } from './combat';
import { canPerform } from './shicheng';
import { activeOuter, slotSkill, wielded } from './wuxue';

/** 绝招按钮最多几个 */
export const MAX_PERFORMS = 3;

export interface PerformSlot { p: PerformDef; move: Move }
export interface FightKit {
  /** 出手的外功；空手又没有拳脚功夫时为空 */
  outer?: SkillDef;
  /** 能用的绝招（境界够、内功为根），按境界先后 */
  performs: PerformSlot[];
  /** 学会了、可是境界不够的绝招，按钮上显示「某某境界」 */
  locked: PerformDef[];
  /** 杀招 */
  ult?: { def: SkillDef; u: UltDef; move: Move };
  /** 外功有绝招，却没有本门内功打底 */
  unrooted: boolean;
}

export function fightKit(s: GameState): FightKit {
  const outer = activeOuter(s);
  const r = outer ? s.skills[outer.id]?.r ?? 0 : 0;
  const rooted = !!outer && canPerform(s, outer);
  const all = outer?.performs ?? [];
  const performs = rooted ? all.filter(p => (p.realm ?? 0) <= r).slice(0, MAX_PERFORMS).map(p => ({ p, move: toMove(outer!, p) })) : [];
  const locked = rooted ? all.filter(p => (p.realm ?? 0) > r).slice(0, Math.max(0, MAX_PERFORMS - performs.length)) : [];
  const ud = slotSkill(s, 'ult');
  const ult = ud?.ult && canPerform(s, ud)
    ? { def: ud, u: ud.ult, move: { name: ud.name, mp: 0, cd: 0, hits: 1, dmg: ud.ult.dmg, acc: 1, fx: ud.ult.fx ?? [], sure: true } }
    : undefined;
  return { outer, performs, locked, ult, unrooted: !!outer && all.length > 0 && !rooted };
}

const BLANK = { mp: 0, cd: 0, hits: 1, dmg: [0, 0] as [number, number], acc: 0.85, fx: [] };
const quiet = { guard: 0, haste: 0, heal: 0, rage: 0 };

/** 实战里的两个人，交给内核记状态（点穴、流血、护体……）；气血、内力的账仍由实战界面记 */
export function meFighter(s: GameState, kit: FightKit): Fighter {
  const k: Kit = {
    name: '你', hpMax: s.hpMax, mpMax: s.mpMax, mpRegen: 0, nature: kit.outer?.nature,
    dodge: 0, hit: 0, passive: { ...quiet }, openers: [], moves: kit.performs.map(x => x.move),
    basic: { name: '普通招式', ...BLANK }, ult: kit.ult?.move
  };
  return fighter(k);
}

export function foeFighter(f: FoeDef): Fighter {
  const k: Kit = {
    name: f.name, hpMax: f.hp, mpMax: 300, mpRegen: 0, nature: f.nature,
    dodge: 0.1, hit: 0, passive: { ...quiet }, openers: [], moves: [], basic: { name: '普通招式', ...BLANK }
  };
  return fighter(k);
}

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
