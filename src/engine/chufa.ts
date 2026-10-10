/**
 * 出发前的提示（docs/sheji-s5-s6.md S6 第一条，docs/sheji-001-003.md 第 003 项「不在玩家看不见的地方失败」）：
 * 揭榜、接镖、接差事、出远门（赶路超过一个时辰）之前，按眼下的状态加一行：带伤、气血不到一半、内力不到三成、钱不够这趟的船钱和店钱。
 * 都没有就不写；只提示，不拦。
 */
import { S } from '../core/state';
import { cn } from '../core/util';
import { jobById, npc } from '../content';
import type { GameState } from '../core/state';
import { test } from './dsl';
import { ZONES, isHeavy } from './shang';
import { LODGING, zhuOf } from './shiguang';
import { tripCost, verbsOf } from './world';

/** 赶路超过这么多分钟（一个时辰）才算「出远门」 */
export const FAR_MIN = 120;

const HURT_WORD = { hand: '使兵刃要吃亏', foot: '身法要打折扣', inner: '内力运不顺' } as const;
const HURT_PLACE = { hand: '手上', foot: '腿上', inner: '内息' } as const;

/** 这趟路要备的钱：沿途的船钱，加上过夜的店钱（住店的人，赶到时过了半夜的，一夜一百文；露宿、住师门的不花店钱） */
export const tripNeed = (s: GameState, fee: number, min: number): number =>
  fee + (zhuOf(s) === 'inn' ? LODGING.inn * Math.floor((s.min + min) / 1440) : 0);

export interface Trip { fee: number; min: number }

/** 把眼下的状态说成几句：带伤（写哪处）、气血、内力、钱。没有就是空的。trip 不写就不提钱 */
export function chufaTips(s: GameState, trip?: Trip): string[] {
  const tips: string[] = [];
  for (const z of ZONES) {
    const n = s.wounds[z];
    if (n <= 0) continue;
    tips.push(z === 'inner' ? `内息带着${isHeavy(n) ? '重伤' : '轻伤'}，${HURT_WORD[z]}` : `${HURT_PLACE[z]}带着${isHeavy(n) ? '重伤' : '轻伤'}，${HURT_WORD[z]}`);
  }
  if (s.hp < s.hpMax * 0.5) tips.push('气血不到一半');
  if (s.mp < s.mpMax * 0.3) tips.push('内力不到三成');
  if (trip) {
    const need = tripNeed(s, trip.fee, trip.min);
    if (need > s.silver) {
      const what = trip.fee > 0 && need > trip.fee ? '船钱和店钱' : trip.fee > 0 ? '船钱' : '店钱';
      tips.push(`身上的钱不够这趟的${what}（要${cn(need)}文，眼下只有${cn(s.silver)}文）`);
    }
  }
  return tips;
}

/** 一行提示：「出发前：……。」没有可提的返回 null */
export function chufaLine(s: GameState, trip?: Trip): string | null {
  const t = chufaTips(s, trip);
  return t.length ? `出发前：${t.join('；')}。` : null;
}

/** 这个人此刻能点的动作里，有没有揭榜、接镖、接差事这一类（动作里带 job 效果的，或者就叫「揭榜」） */
function jobVerbs(id: string): { verb: string; jobs: string[] }[] {
  const n = npc(id);
  if (!n) return [];
  const out: { verb: string; jobs: string[] }[] = [];
  for (const v of verbsOf(n)) {
    const bs = n.actions[v as keyof typeof n.actions];
    // 看的是「不算银两条件」时会走到的分支，同 world.ts 的 verbGain
    const b = bs?.find(x => { const { silver: _s, ...rest } = x.if ?? {}; return test(rest); });
    const jobs = (b?.do ?? []).flatMap(e => (e.type === 'job' ? [e.id] : []));
    if (jobs.length || v === '揭榜') out.push({ verb: v, jobs });
  }
  return out;
}

/** 这个人身上有没有揭榜、接镖、接差事的动作：有就列出眼下该提醒的一行（点之前看得到），没有或没什么可提的返回 null */
export function verbChufa(id: string): string | null {
  const vs = jobVerbs(id);
  if (!vs.length) return null;
  // 钱：这几件差事里要备得最多的那一趟（到交差的地方：船钱、过夜的店钱）
  let trip: Trip | undefined;
  for (const j of vs.flatMap(v => v.jobs).map(jobById)) {
    const c = j && j.at !== S.loc ? tripCost(j.at) : null;
    if (c && (!trip || tripNeed(S, c.fee, c.min) > tripNeed(S, trip.fee, trip.min))) trip = { fee: c.fee, min: c.min };
  }
  return chufaLine(S, trip);
}
