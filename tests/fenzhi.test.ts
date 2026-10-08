/**
 * 分支挡路：人物动作、地点描写、进门触发都是「从上往下，第一个条件成立的分支生效」。
 * 前面一支的条件，后面一支全都有（还多了别的），后面那支就永远轮不到——写了等于没写。
 * 机器玩家摸底时发现盐号毕掌柜就有这样的毛病（半挡：看过账簿的人，问不出身契的价钱）；这里先把「全挡」的查出来。
 */
import { describe, expect, it } from 'vitest';
import { NPCS, ROOMS } from '../src/content';
import type { Branch, Cond } from '../src/content/types';

/** a 成立时 b 一定成立：a 的每一项要求，b 都原样写着（any 不比，宁可放过） */
function covers(a: Cond | undefined, b: Cond | undefined): boolean {
  if (!a) return true;
  if (a.any) return false;
  return Object.entries(a).every(([k, v]) => b && JSON.stringify((b as Record<string, unknown>)[k]) === JSON.stringify(v));
}

function dead(bs: Branch[] | undefined, where: string, errs: string[]): void {
  (bs ?? []).forEach((b, j) => {
    const i = (bs ?? []).slice(0, j).findIndex(a => covers(a.if, b.if));
    if (i >= 0) errs.push(`${where}：第 ${j + 1} 支永远轮不到，第 ${i + 1} 支（${JSON.stringify(bs![i].if ?? '不带条件')}）把它挡住了`);
  });
}

describe('分支挡路', () => {
  it('没有被前面的分支完全挡住、永远轮不到的分支', () => {
    const errs: string[] = [];
    for (const n of NPCS) for (const [v, bs] of Object.entries(n.actions)) dead(bs, `人物 ${n.id}「${v}」`, errs);
    for (const r of ROOMS) {
      if (Array.isArray(r.desc)) dead(r.desc, `地点 ${r.id} 的描写`, errs);
      if (Array.isArray(r.road)) dead(r.road, `地点 ${r.id} 的路上`, errs);
      dead(r.onEnter, `地点 ${r.id} 的进门触发`, errs);
    }
    expect(errs, '\n' + errs.join('\n')).toEqual([]);
  });
});
