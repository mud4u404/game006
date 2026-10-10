/**
 * 上阵：把存档里的玩家、内容里的对手，换成交手引擎（engine/duel.ts）认得的「人」。
 * - 玩家：五项根基、功力、搭配在各位置的武功（重数、品级）；绝招来自出手的那门外功，杀招来自绝技位；
 * - 对手：内容里只写档次和路数（FoeDef.rank、build），数值由 engine/person.ts 的 standard 算出来；
 * - 备战：知彼（对手出手打折）、帮手（答应来的人真的进场出手）。
 */
import type { GameState } from '../core/state';
import type { FoeDef, FxKind, PerformDef, PrepDef, SkillDef, UltDef } from '../content/types';
import { Duel, SKILLED, simulate, type AllySpec, type FoeSpec, type HeroSpec, type RespKey } from './duel';
import { mulberry32 } from './rng';
import { standard, type Person } from './person';
import { personOf, tierNow } from './ren';
import { canPerform } from './shicheng';
import { activeOuter, counterBonus, reachBonus, slotSkill, weaponReady, wielded } from './wuxue';

export { personOf } from './ren';
import { test } from './dsl';
import { passivesOf, type Passives } from './beidong';
import { murenCopy } from './zhudi';

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

/** 对手这个「人」：档次、路数 */
export const foePerson = (f: FoeDef): Person => murenCopy(f)?.person ?? standard(f.rank, f.build ?? 'even', f.name);

/** 生效的备战：条件成立的都算，可以叠加 */
export const activePrep = (f: FoeDef): PrepDef[] => (f.prep ?? []).filter(p => test(p.if));

/** 眼下搭配生效的被动与合璧（实战、搭配页共用；和模拟的 kitOf 同一套算法）。合璧只算眼下出手的外功，兵器类的那一门不论当主当搭档，兵器都要在手 */
export const passivesNow = (s: Pick<GameState, 'skills' | 'loadout'> & { gear?: GameState['gear'] }): Passives =>
  passivesOf({ neigong: slotSkill(s, 'neigong'), qinggong: slotSkill(s, 'qinggong'), fist: slotSkill(s, 'fist'), weapon: slotSkill(s, 'weapon'), ult: slotSkill(s, 'ult') }, { outer: activeOuter(s), weaponReady: weaponReady(s) });

/** 交给引擎的玩家：气血、内力照存档；克制（性质、兵器长短）并进各应对的成算 */
export function heroSpec(s: GameState, kit: FightKit, f: FoeDef): HeroSpec {
  const ng = slotSkill(s, 'neigong'), qg = slotSkill(s, 'qinggong'), o = kit.outer;
  const src: Record<RespKey, SkillDef | undefined> = { block: ng, dodge: qg, parry: o, rush: o };
  const pv = passivesNow(s);
  const bonus: Partial<Record<RespKey, number>> = {};
  for (const k of Object.keys(src) as RespKey[]) {
    const d = src[k];
    if (d) bonus[k] = counterBonus(d.nature, f.nature) + reachBonus(k, d.reach, f.reach);
  }
  return {
    person: personOf(s), name: s.name, hp: s.hp, hpMax: s.hpMax, mp: s.mp, mpMax: s.mpMax, wounds: { ...s.wounds },
    has: { block: !!ng, dodge: !!qg, parry: !!o, rush: !!o }, bonus,
    performs: kit.performs.map(p => ({ name: p.name, mp: p.mp, cd: p.cd, hits: p.hits, dmg: p.dmg, acc: p.acc, fx: p.fx ?? [] })),
    ult: kit.ult ? { dmg: kit.ult.u.dmg, fx: kit.ult.u.fx ?? [] } : undefined,
    // 内功与合璧的被动，轻功的身法并进身法；合璧的减益开战即施给对手
    passive: { ...pv.sum, haste: pv.sum.haste + pv.qinggongHaste },
    openers: pv.openers
  };
}

/** 交给引擎的对手：知彼的倍数叠乘 */
export function foeSpec(f: FoeDef, prep: PrepDef[]): FoeSpec {
  const mul = (k: 'atk' | 'big'): number => prep.reduce((m, p) => m * (p[k] ?? 1), 1);
  const atk = mul('atk'), big = mul('big');
  const copy = murenCopy(f);
  return {
    person: foePerson(f), name: f.name, tells: f.tells.map(t => t.dom), firstTell: f.firstTell,
    spar: f.spar, rounds: f.rounds, script: f.script, phase2: !!f.phase2, weak: f.weak,
    atkMul: atk !== 1 ? atk : undefined, bigMul: big !== 1 ? big : undefined,
    ...(copy ? { hp: copy.hp, hpMax: copy.hpMax, sparFloor: Math.round(Math.min(copy.hpMax * 0.3, copy.hp * 0.5)) } : {})
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

/**
 * 看人（docs/foundation.md 第三节第二条，验证 E1）：后台先替玩家照现在的本事试打几十场（备战、帮手都算上），
 * 按胜率说七句话之一。新手靠它避开打不过的仗。种子固定，同样的本事看同一个人，说法不会忽高忽低。
 */
/** 掂斤两的说法：主语写清是谁强（原来「稍逊一筹」「略胜一筹」一字之差、意思相反，扫一眼就看反，审查 H23） */
const KANREN: [number, string][] = [[0.95, '他不堪一击'], [0.75, '他远不如你'], [0.55, '你胜面大些'], [0.45, '旗鼓相当'], [0.25, '他略强于你'], [0.05, '他远在你之上'], [-1, '深浅看不透']];

/**
 * 掂斤两按档次说话（Issue #546：10-10 试玩「不入流被主线推去打屠千山，交战前说势均力敌，
 * 12 合就败，败后才说对手是三流」）。胜率只当同一档里的话：
 * - 高一档以上：「他高你一档，你多半要输」——差着档次就别拿百分比糊弄人；
 * - 低一档：「他不如你」；
 * - 同档：照旧按胜率说。
 * 对手是几个人（龙王庙那四个打手是一条 foes 记着的「四个人」）时，人多就按总的掂量算：
 * 每人弱，加起来未必弱。人群交给 Duel 的 crowd 真打，不在这里另算一套。
 */
function kanrenSay(s: GameState, f: FoeDef, p: number, heads: number): string {
  const gap = f.rank - tierNow(s).t;          // 差几档；0 是同档
  const 谁 = heads > 1 ? `他们${heads}个` : '他';
  if (gap >= 1) return `${谁}高你${gap >= 2 ? ` ${Math.floor(gap)} 档` : '一档'}，你多半要输`;
  if (gap <= -1) return `${谁}不如你`;
  return KANREN.find(([lo]) => p >= lo)![1];
}

export function kanren(s: GameState, f: FoeDef, n = 40, now = false, heads = 1): { p: number; say: string; hurt: string } {
  const prep = activePrep(f);
  // 掂斤两比的是实力：按玩家满状态（气血、内力回满，伤全好）来算，带着伤不会让「远不如你」变成「远在你之上」；
  // 此刻的吃亏另用 hurt 一句话说。now 为真时按此刻的状态算（开打前给落伤封顶用，engine/shang.ts）
  const hero: GameState = now ? s : { ...s, hp: s.hpMax, mp: s.mpMax, wounds: { hand: 0, foot: 0, inner: 0 } };
  const kit = fightKit(hero);
  let w = 0;
  for (let i = 0; i < n; i++) {
    // heads 几个人就按几个人打（Duel 的 crowd）；maxAtk 限着同时上手的，人多不是一拥而上
    const crowd = heads > 1 ? { n: heads, maxAtk: Math.min(heads, 3) } : undefined;
    const d = new Duel(heroSpec(hero, kit, f), foeSpec(f, prep), { rng: mulberry32(9001 + i * 7919), allies: alliesOf(prep), crowd });
    if (simulate(d, SKILLED).res === 'win') w++;
  }
  const p = w / n;
  return { p, say: kanrenSay(s, f, p, heads), hurt: kanrenHurt(s) };
}

/** 带着伤的提醒：气血掉到九成以下，或手、足、内息任何一处有伤，就多说一句（掂斤两按满状态，此刻吃亏要让玩家知道） */
export function kanrenHurt(s: GameState): string {
  // 气血不到九成、内力不到五成、身上有伤：都算带伤，掂斤两时多说一句
  const w = s.wounds, hurt = s.hp < s.hpMax * 0.9 || s.mp < s.mpMax * 0.5 || w.hand + w.foot + w.inner > 0;
  return hurt ? '你眼下带着伤，真动起手来，要吃些亏。' : '';
}
