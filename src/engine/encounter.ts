/**
 * 路遇：赶路时在路上遇到的事（docs/content-guide.md「路遇」）。
 *
 * - 路越长越容易遇上：一段路的几率是路程分钟 ÷ 150，最多四成；
 * - 同一条七天内不再遇，奇遇（once）一生一次；
 * - 两次路遇之间至少隔两个时辰；一趟路最多遇一次（由界面停下这趟路保证）；
 * - 序章里不遇。
 */
import { S } from '../core/state';
import { absMin, dayNo } from '../core/time';
import { ENCOUNTERS, room } from '../content';
import type { EncounterDef } from '../content/types';
import { test } from './dsl';
import { hopMin, travelMin } from './world';
import { worldRng } from './shijie';

export const encounterChance = (min: number): number => Math.min(0.4, min / 150);
/** 两次路遇之间至少隔这么多分钟（两个时辰） */
export const ENC_GAP = 240;
/** 同一条路遇，隔这么多天才会再遇 */
export const ENC_REPEAT_DAYS = 7;

/** 走进 to 这一段路上，眼下可能遇到的路遇 */
export function eligible(to: string): EncounterDef[] {
  const region = room(to).region;
  const today = dayNo(S);
  return ENCOUNTERS.filter(e => {
    if (!e.region.includes(region) || (e.to && !e.to.includes(to))) return false;
    const last = S.encLog?.[e.id];
    if (last !== undefined) {
      if (e.once) return false;
      const gap = today - last;
      if (gap >= 0 && gap < ENC_REPEAT_DAYS) return false;
    }
    return test(e.if);
  });
}

/**
 * 走 from → to 这一段路，掷一次骰：遇上了返回那条路遇，否则 null。
 * rand 可以换成固定的数，方便测试；界面不传，用世界的种子随机（engine/shijie.ts）。
 */
export function rollEncounter(from: string, to: string, rand: () => number = worldRng): EncounterDef | null {
  if (S.chapter < 1) return null;
  const since = absMin(S) - (S.lastEnc ?? -Infinity);
  if (since >= 0 && since < ENC_GAP) return null;
  if (rand() >= encounterChance(travelMin(hopMin(from, to)))) return null;
  const pool = eligible(to);
  if (!pool.length) return null;
  const total = pool.reduce((a, e) => a + (e.weight ?? 1), 0);
  let r = rand() * total;
  for (const e of pool) { r -= e.weight ?? 1; if (r < 0) return e; }
  return pool[pool.length - 1];
}

/** 记下这次路遇：七天不重复、奇遇一生一次、两个时辰的间隔都靠它 */
export function markEncounter(e: EncounterDef): void {
  (S.encLog ??= {})[e.id] = dayNo(S);
  S.lastEnc = absMin(S);
}
