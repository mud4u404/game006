/**
 * 历练：行走江湖的成长（docs/design.md「历练」）。
 *
 * 实战、了结一件事、高人指点，都会积下历练；闭关是把历练消化成功夫。
 * 没有历练，闭门造车，进境有限。成长的源头在江湖上，不在闭关的按钮上。
 */
import { emit } from '../core/bus';
import { dayNo } from '../core/time';
import { pushFeed, type GameState } from '../core/state';
import type { FoeDef, QuestDef, SkillId, Slot } from '../content/types';
import { activeOuter } from './wuxue';
import { gongliAt } from './person';

export function addLilian(s: GameState, n: number): void {
  if (n > 0) s.lilian = (s.lilian ?? 0) + n;
}


export type FightRes = 'win' | 'lose' | 'flee' | 'yield';
const RES_SHARE: Record<FightRes, number> = { win: 1, lose: 0.5, yield: 0.3, flee: 0 };
/** 七天之内再打同一个人，历练减半；隔得久了，重新算 */
export const FOE_WINDOW = 7;

/** 打赢一个对手的历练：不入流一百，每高一档约翻一倍（和功力的阶梯一样）；不是练家子的按比例少 */
export const foeLilian = (f: Pick<FoeDef, 'rank' | 'weak'>): number => Math.round((100 * gongliAt(f.rank)) / gongliAt(0) * (f.weak ?? 1));

/** 七天之内已经和这个人打过几场（不算这一场）。实战里长的熟练、切磋的历练都按它一次比一次少 */
export function foeRepeats(s: GameState, id: string): number {
  const rec = s.foeLog?.[id];
  const gap = rec ? dayNo(s) - rec.day : Infinity;
  return gap >= 0 && gap < FOE_WINDOW ? rec!.n : 0;
}

/**
 * 一场架打下来的历练：对手越强越多；赢了全得，输了得一半，认输三成，逃跑没有。
 * 同一个对手七天内反复打，一次比一次少：该学的已经学到了。
 */
export function fightLilian(s: GameState, f: Pick<FoeDef, 'id' | 'rank' | 'weak'>, res: FightRes): number {
  const n = foeRepeats(s, f.id);
  (s.foeLog ??= {})[f.id] = { n: n + 1, day: dayNo(s) };
  const got = Math.round(foeLilian(f) * RES_SHARE[res] * 0.5 ** n);
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
  // 序章了结在焦船边（旧版在江伯坟前），紧接着题字「第一回」：不弹「历练 +」，动态里记着就够（docs/paiban.md A15）
  if (q.id !== 'prologue') emit('toast', `历练 +${n}`);
  return n;
}

/**
 * 闭关：base 是闭门造车也有的一点进境，cap 是这段日子最多消化多少历练。
 * 一月闭关、历练充足时，和改版前闭关一月的进境相当；没有历练，只有一成多。
 */
export const retreatOf = (days: number): { base: number; cap: number } => ({ base: Math.round(6 * days), cap: Math.round(120 * Math.pow(days, 0.9)) });
export const RETREAT: Record<number, { base: number; cap: number }> = { 1: retreatOf(1), 7: retreatOf(7), 30: retreatOf(30) };
/** 消化出来的功夫怎么分：出手的那门外功最多，内功次之，轻功、另一门外功再次 */
const SHARE: ['outer' | 'other' | Slot, number][] = [['outer', 0.45], ['neigong', 0.3], ['qinggong', 0.15], ['other', 0.1]];

export interface RetreatPlan { used: number; gains: [SkillId, number][] }

/** 算出闭关的收获，不改存档（界面按它扣历练、加熟练） */
export function retreatPlan(s: Pick<GameState, 'lilian' | 'loadout' | 'skills' | 'gear'>, days: number, eff = 1): RetreatPlan {
  const r0 = retreatOf(days), r = { base: r0.base * eff, cap: Math.round(r0.cap * eff) };
  const used = Math.min(s.lilian ?? 0, r.cap);
  const outer = activeOuter(s)?.id;
  const other = [s.loadout.weapon, s.loadout.fist].find(id => id && id !== outer);
  const idOf = (k: (typeof SHARE)[number][0]): string | undefined => (k === 'outer' ? outer : k === 'other' ? other : s.loadout[k]);
  const slots = SHARE.filter(([k]) => { const id = idOf(k); return !!id && !!s.skills[id]; });
  const sum = slots.reduce((a, [, w]) => a + w, 0);
  const total = Math.round(r.base + used);
  return { used, gains: slots.map(([k, w]) => [idOf(k)!, Math.round((total * w) / sum)]) };
}

/**
 * 静修的另外两样（docs/foundation.md 第三节第九条，数由 src/lab/model/life.ts 验过）：
 * - 养伤：只养得好轻伤（一级，过一日自己好）；重伤闭关也养不好，要找郎中看伤或者服药（负责人 10-09，engine/shang.ts）；
 * - 打坐长功力：一日长 0.04 ×（0.7 + 0.06 × 内功重数）年，根骨每高常人一点快一分；
 *   功力有天花板，由内功的重数定（内功练不上去，功力也熬不深）。
 */
export const DAZUO = { rate: 0.04, ceilK: 2.5 };

/** 内功第 R 重时功力的天花板（年） */
export function gongliCeiling(s: GameState): number {
  const R = (s.skills[s.loadout.neigong ?? '']?.r ?? 0) + 1;
  return DAZUO.ceilK * gongliAt(Math.max(0, R / 1.5)) * (1 + 0.01 * (s.attr.根骨 - 20));
}

export interface JingxiuPlan { healed: Partial<Record<'hand' | 'foot' | 'inner', number>>; gongli: number; dazuoDays: number }

/** 算出静修 days 日养好的伤、长的功力，不改存档 */
export function jingxiuPlan(s: GameState, days: number, eff = 1): JingxiuPlan {
  // 轻伤一日就好；重伤闭关养不好（engine/shang.ts），不占打坐的日子
  const healed: JingxiuPlan['healed'] = {};
  if (days >= 1) for (const z of ['inner', 'hand', 'foot'] as const) if (s.wounds[z] === 1) healed[z] = 1;
  const left = days;
  const R = (s.skills[s.loadout.neigong ?? '']?.r ?? 0) + 1;
  const per = DAZUO.rate * (0.7 + 0.06 * R) * (1 + 0.01 * (s.attr.根骨 - 20));
  const cap = gongliCeiling(s);
  const g = Math.max(0, Math.min(cap - s.gongli, per * left * eff));
  return { healed, gongli: Math.round(g * 100) / 100, dazuoDays: left };
}
