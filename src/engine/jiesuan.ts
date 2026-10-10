/**
 * 打完一场的结算：落伤、胜负以后的去路、历练、结算效果。
 * 实战界面（ui/fight.ts）和机器玩家（tests/zoubian.test.ts）共用这一套，免得两边各算各的。
 */
import { S } from '../core/state';
import { advanceMin } from '../core/time';
import { cn } from '../core/util';
import type { AfterOpt, Effect, FightResult, FoeDef, PrepDef } from '../content/types';
import type { Duel, DuelRes, Wounds, Zone } from './duel';
import type { TellDom } from './duel';
import { newOutcome, run, test, type Outcome } from './dsl';
import { MP_FLOOR } from './combat';
import { fightLilian } from './lilian';
import { tierName } from './person';
import { ZONES, capWounds, isHeavy, markLight, woundCap } from './shang';

/** 开打前：剧本战撑不住时有人出手，开打时至少留一口气撑一阵 */
export function brace(f: FoeDef): void {
  if (f.script) S.hp = Math.max(S.hp, Math.round(S.hpMax * 0.25) + 300);
}

/**
 * 这一场吃重招落下的伤，打完才起作用，带到下一场（切磋点到为止、剧本战不落伤）。返回新落下的伤。
 * 按开打前掂的斤两封顶（engine/shang.ts 的 woundCap）：打比你弱的人，赢了不该一身伤（负责人 10-09）；
 * 输了、逃了也封顶，输掉差事的再压到一级：败仗要有代价，但不叠加（docs/sheji-s5-s6.md S6）
 */
export function takeWounds(f: FoeDef, taken: Partial<Wounds>, res?: DuelRes, odds?: number): Partial<Wounds> {
  const hurt: Partial<Wounds> = {};
  if (f.spar || f.script) return hurt;
  const jobLost = !!res && res !== 'win' && !!resultOf(f, res)?.do?.some(e => e.type === 'jobFail');
  const got = res ? capWounds(taken, woundCap(res, odds, jobLost)) : taken;
  for (const [z, n] of Object.entries(got) as [keyof Wounds, number][]) {
    if (n > 0) { S.wounds[z] = Math.min(3, S.wounds[z] + n); hurt[z] = n; }
  }
  markLight(S);
  return hurt;
}

/** 胜负以后：打倒对手时可选的路（条件成立的）；一条都没有就不问 */
export function fateOpts(f: FoeDef, res: DuelRes): AfterOpt[] {
  const a = res === 'win' ? f.results.win.after : undefined;
  return a ? a.opts.filter(o => test(o.if)) : [];
}

/** 这个结局用哪份结算：认输没写就用逃跑的，逃跑没写就用认输的，都没有用输的 */
export function resultOf(f: FoeDef, res: DuelRes): FightResult | undefined {
  const rs = f.results;
  return rs[res] ?? (res === 'yield' ? rs.flee : res === 'flee' ? rs.yield : undefined) ?? rs.lose;
}

export interface Settled {
  r?: FightResult;
  /** 这一架攒下的历练 */
  ll: number;
  out: Outcome;
  /** 实际执行的效果（结算的、备战的、胜负以后那条路的），结算页据此列奖励 */
  effects: Effect[];
}

/** 结算：历练、结算效果、带着备战打赢时的后果、胜负以后那条路的后果。不是 silent 的结算，时辰走一刻 */
export function settle(f: FoeDef, res: DuelRes, prep: PrepDef[], pick?: AfterOpt): Settled {
  const r = resultOf(f, res);
  if (!r) return { ll: 0, out: newOutcome(), effects: [] };
  // 剧本战是被人救下的，只算输
  const ll = fightLilian(S, f, f.script ? 'lose' : res);
  const extra = res === 'win' ? prep.flatMap(p => p.win ?? []) : [];
  if (pick?.do) extra.push(...pick.do);
  if (!r.silent) advanceMin(S, 15);
  // 败仗不把人打趴下：输了的结算没写养伤，也至少留三成气血，不叫人抬着一口气去撞下一场
  if (res === 'lose' && !f.script) S.hp = Math.max(S.hp, Math.round(S.hpMax * LOSE_HP));
  const taught = firstLesson(f, res);
  // 写了条件的银两（失物赎回）在这里先判，结算页列的奖励才和实际一致
  const effects = [...(r.do ?? []), ...extra].filter(e => (e.type !== 'prof' || taught) && (e.type !== 'silver' || test(e.if))).filter(e => res === 'win' || keepsGains(e));
  return { r, ll, out: run(effects), effects };
}

/** 输了、逃了、认输了，至少留的气血（占上限几成） */
export const LOSE_HP = 0.3;

/**
 * 败仗只减益、不清空积累（docs/sheji-001-003.md 第 003 项「成长」「失败」）：历练、熟练、属性、武功一样都不扣。
 * 内容里写了扣这些的（旧稿没有，往后的稿子难保没有），败仗结算里一律不执行
 */
export const keepsGains = (e: Effect): boolean =>
  !((e.type === 'prof' || e.type === 'lilian') && e.amount < 0) && !(e.type === 'attr' && e.delta < 0);

/**
 * 切磋结算里写的熟练（高人收剑后点拨你几句），同一个结局只给第一回：再比一场，他也没有新的可说了。
 * 不然反复切磋就能绕开闭关和铁律刷熟练（试玩第二轮 G03）。实战里长的熟练另按 engine/lilian.ts 的 foeRepeats 递减
 */
function firstLesson(f: FoeDef, res: DuelRes): boolean {
  if (!f.spar) return true;
  const k = `taught_${f.id}_${res}`;
  if (S.flags[k]) return false;
  S.flags[k] = true;
  return true;
}

/* ---------- 败仗要说明白：败在哪里、下回怎么补（docs/sheji-s5-s6.md S6 第三条） ---------- */

/** 判输因要用的几样实情：从打完的一场里取（loseFacts），测试里也能直接构造 */
export interface LoseFacts {
  /** 你和对手的档次（engine/person.ts 的 tierCont，可带小数） */
  tier: number;
  foeTier: number;
  /** 你最高的一门武功现在是第几重（1 起，可带小数） */
  maxR: number;
  /** 开打前就带着的伤 */
  wounds: Wounds;
  /** 打完时的内力、上限 */
  mp: number;
  mpMax: number;
  /** 没接住的重招，按路数记 */
  miss: Record<TellDom, number>;
  /** 对手的性质（刚柔阴阳中正），写了才说得出「换一门克他的功夫」 */
  nature?: string;
  /** 对手有备战的路（打听底细、请帮手、占地利），这一场没用上 */
  prepIdle: boolean;
}

export interface LoseNote { why: string; mend: string; kind: 'tier' | 'wound' | 'mp' | 'miss' | 'none' }

/** 从打完的一场里取输因要用的实情。prepOn 是这一场生效的备战 */
export function loseFacts(d: Duel, f: FoeDef, prepOn: PrepDef[]): LoseFacts {
  const p = d.person;
  return {
    tier: d.tier, foeTier: d.eTier, maxR: Math.max(p.outer, p.neigong, p.qinggong), wounds: { ...d.wounds },
    mp: d.mp, mpMax: d.mpMax, miss: { ...d.log.miss }, nature: f.nature,
    prepIdle: !!f.prep?.some(x => !prepOn.includes(x))
  };
}

const DOM_WORD: Record<TellDom, string> = { li: '力道沉猛', su: '出手极快', qiao: '变化刁钻' };
const DOM_MEND: Record<TellDom, string> = {
  li: '力沉的招要靠内功硬接，内功练深一重再来，打到紧要处也别把内力使空',
  su: '快招要靠轻功闪开，轻功练深一重再来',
  qiao: '巧招要靠外功拆开，外功练深一重再来'
};
const ZONE_WORD: Record<Zone, string> = { hand: '手上', foot: '腿上', inner: '内息' };
const ZONE_COST: Record<Zone, string> = { hand: '使兵刃、拆招要差一截', foot: '身法打了折扣，闪避不及', inner: '硬接重招提不起气' };

/** 差的档次，说成「半档」「一档」「一档半」 */
function gapWord(g: number): string {
  const h = Math.max(0.5, Math.round(g * 2) / 2);
  const w = (n: number): string => (n === 2 ? '两' : cn(n));
  return h < 1 ? '半档' : Number.isInteger(h) ? `${w(h)}档` : `${w(Math.floor(h))}档半`;
}

/**
 * 输了写明为什么、下回怎么补：从四样里挑最主要的一条写，只写事实，不说教。
 * 四样各算一个分，取最高的：档次差几档（差不到小半档不算）、开打前带的伤（一级记零点三五分）、
 * 内力打到见底（零点六分）、没接住的重招（一回零点三分，只一回的零点二分）。
 * 四样都不到，就说两下里相差无几、是气血先见了底。
 */
export function loseNote(x: LoseFacts): LoseNote {
  const gap = x.foeTier - x.tier;
  const hurt = ZONES.filter(z => x.wounds[z] > 0).sort((a, b) => x.wounds[b] - x.wounds[a]);
  const lv = hurt.reduce((n, z) => n + x.wounds[z], 0);
  const dom = (['li', 'su', 'qiao'] as const).slice().sort((a, b) => x.miss[b] - x.miss[a])[0];
  const m = x.miss[dom];
  const score = {
    tier: gap >= 0.4 ? gap : 0,
    wound: 0.35 * lv,
    mp: x.mp < x.mpMax * MP_FLOOR ? 0.6 : 0,
    miss: m >= 2 ? 0.3 * m : m === 1 ? 0.2 : 0
  };
  const best = (['tier', 'wound', 'mp', 'miss'] as const).reduce((a, k) => (score[k] > score[a] ? k : a), 'tier');
  if (score[best] <= 0) return { kind: 'none', why: '两下里功夫相差无几，是你的气血先见了底。', mend: '养足了气血再来，他出重招前总有个架势，多看一眼。' };

  if (best === 'tier') {
    const mine = tierName(x.tier), his = tierName(x.foeTier);
    const why = mine === his ? `对手比你高出${gapWord(gap)}，同在${his}里，他更拔尖。` : `对手是${his}，你眼下是${mine}，他高出你${gapWord(gap)}。`;
    const need = Math.max(Math.floor(x.maxR) + 1, Math.ceil(1 + 1.5 * (x.foeTier - 0.4) - 1e-9));
    const alt = [x.nature ? `换一门克他${x.nature}路的功夫` : '', x.prepIdle ? '先把他的底细打听清楚、帮手请来' : ''].filter(Boolean);
    return { kind: 'tier', why, mend: `最高的一门功夫练到第${cn(need)}重再来领教${alt.length ? `；也可${alt.join('，或')}` : ''}。` };
  }
  if (best === 'wound') {
    const heavy = hurt.some(z => isHeavy(x.wounds[z]));
    return {
      kind: 'wound',
      why: `开打前你就带着伤：${hurt.map(z => `${isHeavy(x.wounds[z]) ? '重伤' : '轻伤'}在${ZONE_WORD[z]}，${ZONE_COST[z]}`).join('；')}。`,
      mend: heavy ? '先找郎中看了伤、服了药，伤养好了再来。' : '轻伤过一日自己会好，养上一日再来。'
    };
  }
  if (best === 'mp') return { kind: 'mp', why: '打到后来内力见了底，护体的功夫也撑不住了。', mend: '内力养回来再来；硬接、抢攻都耗内力，省着些用。' };
  return { kind: 'miss', why: `他那几记${DOM_WORD[dom]}的重招，你有${cn(m)}回没接住。`, mend: `${DOM_MEND[dom]}。` };
}
