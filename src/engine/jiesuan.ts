/**
 * 打完一场的结算：落伤、胜负以后的去路、历练、结算效果。
 * 实战界面（ui/fight.ts）和机器玩家（tests/zoubian.test.ts）共用这一套，免得两边各算各的。
 */
import { S } from '../core/state';
import { advanceMin } from '../core/time';
import type { AfterOpt, Effect, FightResult, FoeDef, PrepDef } from '../content/types';
import type { DuelRes, Wounds } from './duel';
import { newOutcome, run, test, type Outcome } from './dsl';
import { fightLilian } from './lilian';

/** 开打前：剧本战撑不住时有人出手，开打时至少留一口气撑一阵 */
export function brace(f: FoeDef): void {
  if (f.script) S.hp = Math.max(S.hp, Math.round(S.hpMax * 0.25) + 300);
}

/** 这一场吃重招落下的伤，打完才起作用，带到下一场（切磋点到为止、剧本战不落伤）。返回新落下的伤 */
export function takeWounds(f: FoeDef, taken: Partial<Wounds>): Partial<Wounds> {
  const hurt: Partial<Wounds> = {};
  if (f.spar || f.script) return hurt;
  for (const [z, n] of Object.entries(taken) as [keyof Wounds, number][]) {
    if (n > 0) { S.wounds[z] = Math.min(3, S.wounds[z] + n); hurt[z] = n; }
  }
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
  const effects = [...(r.do ?? []), ...extra];
  return { r, ll, out: run(effects), effects };
}
