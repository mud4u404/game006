/**
 * 序章打斗压短（Issue #545）：
 * 10-10 试玩反馈「新手第一场打斗打了 35～40 合，每次重招都是同一句预兆」。
 * 这条把两件事钉住：
 * - 序章三家对手，认真打（SKILLED）十到十八合能分出胜负；
 * - 每个对手的重招、出招旁白、场边旁白至少三句，别再只抽一句。
 *
 * 合数是实跑出来的：新开局，同一个对手跑 120 局，取平均。改了对手的 rank／weak
 * 这里就跟着动，所以别把它写成「大概十几合」那种话。
 */
import { describe, expect, it } from 'vitest';
import { S, newGame, setState } from '../src/core/state';
import { setNowMs } from '../src/core/time';
import { foeById } from '../src/content';
import { Duel, SKILLED, simulate } from '../src/engine/duel';
import { activePrep, alliesOf, fightKit, foeSpec, heroSpec } from '../src/engine/zhaoshi';
import { brace } from '../src/engine/jiesuan';
import { mulberry32 } from '../src/engine/rng';

setNowMs(() => 1_700_000_000_000);

/** 第一夜那一场：走哪条路都要打的那一个对手 */
const 序章对手 = ['kp_jiading', 'kp_biaoshi', 'kp_zhuibing'] as const;

/** 扬州前期那几个也要够三句，免得同一句在场上反复出 */
const 前期对手 = ['smcs_dashou', 'tu'] as const;

const 局数 = 120;

/** 开一局，量到分出胜负用了多少合 */
function 合数(fid: string, seed: number): number {
  const f = foeById(fid)!;
  setState(newGame());
  brace(f);
  const prep = activePrep(f);
  const d = new Duel(heroSpec(S, fightKit(S), f), foeSpec(f, prep), { rng: mulberry32(seed), allies: alliesOf(prep) });
  let t = 0;
  while (!d.over && t < 400) { t++; simulate(d, SKILLED, 1); }
  return t;
}

const 平均合数 = (fid: string): number => {
  let sum = 0;
  for (let seed = 1; seed <= 局数; seed++) sum += 合数(fid, seed);
  return sum / 局数;
};

describe('序章打斗：短，句子多', () => {
  for (const id of 序章对手) {
    it(`${id} 认真打十到十八合分出胜负（实测）`, () => {
      const avg = 平均合数(id);
      expect(avg, `${id} 实测平均 ${avg.toFixed(1)} 合，出了 10～18 这一档`).toBeGreaterThanOrEqual(10);
      expect(avg, `${id} 实测平均 ${avg.toFixed(1)} 合，出了 10～18 这一档`).toBeLessThanOrEqual(18);
    });
  }

  it('每个对手的重招、出招旁白、场边旁白至少三句', () => {
    const 少: string[] = [];
    for (const id of [...序章对手, ...前期对手]) {
      const f = foeById(id);
      if (!f) { 少.push(`${id} 没有这个对手`); continue; }
      if ((f.tells?.length ?? 0) < 3) 少.push(`${id} 重招只有 ${f.tells?.length ?? 0} 句`);
      if ((f.flourish?.length ?? 0) < 3) 少.push(`${id} 出招旁白只有 ${f.flourish?.length ?? 0} 句`);
      if ((f.asides?.length ?? 0) < 3) 少.push(`${id} 场边旁白只有 ${f.asides?.length ?? 0} 句`);
    }
    expect(少, `这些句子太少，场上会反复出同一句：\n  ${少.join('\n  ')}`).toEqual([]);
  });

  it('序章这三家的重招，li／su／qiao 各有一路，不重着来', () => {
    // 只查序章这三家。tu（首领战）有两条 li，那是他的看家招式，这一件里不动。
    for (const id of 序章对手) {
      const 路 = (foeById(id)!.tells ?? []).map(t => t.dom);
      expect(new Set(路).size, `${id} 的重招里有两路是同一个 dom：${路.join('、')}`).toBe(路.length);
    }
  });
});