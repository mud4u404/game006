/**
 * 历练：行走江湖的成长（docs/design.md「历练」）。
 *
 * 实战、了结一件事、高人指点，都会积下历练；闭关是把历练消化成功夫。
 * 没有历练，闭门造车，进境有限。成长的源头在江湖上，不在闭关的按钮上。
 */
import { emit } from '../core/bus';
import { pushFeed, type GameState } from '../core/state';
import type { FoeDef, QuestDef, SkillId, Slot } from '../content/types';

export function addLilian(s: GameState, n: number): void {
  if (n > 0) s.lilian = (s.lilian ?? 0) + n;
}

/** 一年三百六十天里的第几天，算交手间隔用 */
const dayNo = (s: Pick<GameState, 'month' | 'day'>): number => (s.month - 1) * 30 + s.day;

export type FightRes = 'win' | 'lose' | 'flee' | 'yield';
const RES_SHARE: Record<FightRes, number> = { win: 1, lose: 0.5, yield: 0.3, flee: 0 };
/** 七天之内再打同一个人，历练减半；隔得久了，重新算 */
export const FOE_WINDOW = 7;

/**
 * 一场架打下来的历练：对手越强越多（气血的十分之一）；赢了全得，输了得一半，认输三成，逃跑没有。
 * 同一个对手七天内反复打，一次比一次少：该学的已经学到了。
 */
export function fightLilian(s: GameState, f: Pick<FoeDef, 'id' | 'hp'>, res: FightRes): number {
  const day = dayNo(s);
  const log = (s.foeLog ??= {});
  const rec = log[f.id];
  const gap = rec ? day - rec.day : Infinity;
  const n = gap >= 0 && gap < FOE_WINDOW ? rec!.n : 0;
  log[f.id] = { n: n + 1, day };
  const got = Math.round((f.hp / 10) * RES_SHARE[res] * 0.5 ** n);
  addLilian(s, got);
  return got;
}

/** 一件事了结时给的历练 */
export const questLilian = (q: QuestDef): number => q.lilian ?? 100 * (q.stages.length - 1);

/** 任务推到了最后一个阶段：给历练，记一条见闻 */
export function questDone(s: GameState, q: QuestDef): number {
  const n = questLilian(q);
  addLilian(s, n);
  pushFeed('江湖', `「${q.name}」了结，历练 +${n}。`);
  emit('toast', `历练 +${n}`);
  return n;
}

/**
 * 闭关：base 是闭门造车也有的一点进境，cap 是这段日子最多消化多少历练。
 * 一月闭关、历练充足时，和改版前闭关一月的进境相当；没有历练，只有一成多。
 */
export const RETREAT: Record<number, { base: number; cap: number }> = {
  1: { base: 6, cap: 120 },
  7: { base: 42, cap: 700 },
  30: { base: 180, cap: 2400 }
};
/** 消化出来的功夫怎么分：主手最多，内功次之，轻功、副手再次 */
const SHARE: [Slot, number][] = [['main', 0.45], ['neigong', 0.3], ['qinggong', 0.15], ['off', 0.1]];

export interface RetreatPlan { used: number; gains: [SkillId, number][] }

/** 算出闭关的收获，不改存档（界面按它扣历练、加熟练） */
export function retreatPlan(s: Pick<GameState, 'lilian' | 'loadout' | 'skills'>, days: number): RetreatPlan {
  const r = RETREAT[days];
  const used = Math.min(s.lilian ?? 0, r.cap);
  const slots = SHARE.filter(([k]) => { const id = s.loadout[k]; return !!id && !!s.skills[id]; });
  const sum = slots.reduce((a, [, w]) => a + w, 0);
  const total = r.base + used;
  return { used, gains: slots.map(([k, w]) => [s.loadout[k]!, Math.round((total * w) / sum)]) };
}
