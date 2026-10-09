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
import { capWounds, markLight, woundCap } from './shang';

/** 开打前：剧本战撑不住时有人出手，开打时至少留一口气撑一阵 */
export function brace(f: FoeDef): void {
  if (f.script) S.hp = Math.max(S.hp, Math.round(S.hpMax * 0.25) + 300);
}

/**
 * 这一场吃重招落下的伤，打完才起作用，带到下一场（切磋点到为止、剧本战不落伤）。返回新落下的伤。
 * 打赢了按开打前掂的斤两封顶（engine/shang.ts 的 woundCap）：打比你弱的人，赢了不该一身伤（负责人 10-09）
 */
export function takeWounds(f: FoeDef, taken: Partial<Wounds>, res?: DuelRes, odds?: number): Partial<Wounds> {
  const hurt: Partial<Wounds> = {};
  if (f.spar || f.script) return hurt;
  const got = res ? capWounds(taken, woundCap(res, odds)) : taken;
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
  const taught = firstLesson(f, res);
  const effects = [...(r.do ?? []), ...extra].filter(e => e.type !== 'prof' || taught);
  return { r, ll, out: run(effects), effects };
}

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
