/**
 * 掏钱的地方要先看钱够不够（机器玩家摸底时发现八处）。
 * 银两扣到零就停（engine/dsl.ts），所以没查钱的选项，玩家身无分文也能选：东西照拿、人情照欠，等于白送。
 * 规矩：剧情选项、人物动作里扣钱的分支，条件里要写 silver 不少于扣的数。
 * 例外：人物动作的最后一支（兜底，例如斗酒输了赔酒钱）和战斗结算（输了被搜走钱），是罚，不是买。
 */
import { describe, expect, it } from 'vitest';
import { NPCS, STORIES } from '../src/content';
import type { Branch, Cond, Effect } from '../src/content/types';

/** 条件保证身上至少有多少文 */
const minSilver = (c?: Cond): number => Math.max(c?.silver ?? 0, c?.any?.length ? Math.min(...c.any.map(minSilver)) : 0);
const paid = (es?: Effect[]): number => -(es ?? []).reduce((a, e) => a + (e.type === 'silver' && e.delta < 0 ? e.delta : 0), 0);

describe('掏钱先看钱够不够', () => {
  it('剧情选项、人物动作里扣钱的，条件里写明银两', () => {
    const errs: string[] = [];
    for (const s of STORIES) s.cards.forEach((c, i) => c.choices.forEach(ch => {
      const n = paid(ch.do);
      if (n > minSilver(ch.if)) errs.push(`剧情 ${s.id} 第 ${i + 1} 张「${ch.label}」：扣 ${n} 文，条件要写 silver: ${n}`);
    }));
    for (const npc of NPCS) for (const [v, bs] of Object.entries(npc.actions) as [string, Branch[]][]) bs.forEach((b, i) => {
      const n = paid(b.do);
      if (n > minSilver(b.if) && i < bs.length - 1) errs.push(`人物 ${npc.id}「${v}」第 ${i + 1} 支：扣 ${n} 文，条件要写 silver: ${n}`);
    });
    expect(errs, '\n' + errs.join('\n')).toEqual([]);
  });
});
