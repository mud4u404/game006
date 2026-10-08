/**
 * 交手引擎（src/engine/duel.ts）的验收：实战界面和模拟器用的是同一套规则，这里直接量它。
 * 标准来自地基第三版的验收表（docs/foundation.md，src/lab/model 里先验过）：
 * 同档五五开，高一档胜八成上下，高两档几乎必胜；以己之长明显强过固定套路和随手乱选；
 * 虚实只出在会家子手上；帮手答应来就真的出手，伤害记在明处；剧本战、切磋按约定收场。
 */
import { describe, expect, it } from 'vitest';
import { Duel, NAIVE, RANDOM, ROTE, SKILLED, simulate, type AllySpec, type FoeSpec, type HeroSpec, type Policy } from '../src/engine/duel';
import { standard, type Build, type Person } from '../src/engine/person';
import { mulberry32 } from '../src/engine/rng';

const BUILDS: Build[] = ['outer', 'inner', 'light'];
/** 玩家一方：两门绝招（耗内力一成半、两成半）、一个杀招，和模拟器里验过的一样 */
const hero = (p: Person): HeroSpec => ({
  person: p,
  performs: [
    { name: '绝招一', mp: 45, cd: 3, hits: 1, dmg: [150, 190], acc: 0.85, fx: [] },
    { name: '绝招二', mp: 75, cd: 5, hits: 1, dmg: [220, 280], acc: 0.8, fx: [] }
  ],
  ult: { dmg: [520, 600], fx: [] }
});
const foe = (p: Person, more: Partial<FoeSpec> = {}): FoeSpec => ({ person: p, name: p.name, tells: ['li', 'su', 'qiao'], ...more });

/** 九种偏科配对，每对 n 场，平均胜率 */
function pairs(ht: number, ft: number, pol: Policy = SKILLED, n = 40, salt = 1): number {
  let w = 0, all = 0;
  for (const hb of BUILDS) for (const fb of BUILDS) {
    for (let i = 0; i < n; i++) {
      const d = new Duel(hero(standard(ht, hb)), foe(standard(ft, fb)), { rng: mulberry32(salt * 100003 + all * 7919 + 17) });
      if (simulate(d, pol).res === 'win') w++;
      all++;
    }
  }
  return w / all;
}

describe('交手引擎：胜负跟着本事走', () => {
  it('同档五五开，高一档胜八成上下，高两档几乎必胜', () => {
    const same = pairs(2, 2);
    expect(same).toBeGreaterThan(0.4);
    expect(same).toBeLessThan(0.65);
    const up = pairs(3, 2, SKILLED, 40, 2);
    expect(up).toBeGreaterThan(0.7);
    expect(up).toBeLessThan(0.92);
    expect(pairs(4, 2, SKILLED, 20, 3)).toBeGreaterThan(0.95);
  }, 60000);

  it('以己之长：看清这一招挑成算最高的应对，比固定套路、随手乱选都强', () => {
    const skilled = pairs(2, 2, SKILLED, 50, 4), rote = pairs(2, 2, ROTE, 50, 4), rnd = pairs(2, 2, RANDOM, 50, 4);
    expect(skilled - rote).toBeGreaterThan(0.08);
    expect(skilled - rnd).toBeGreaterThan(0.12);
  }, 60000);
});

describe('虚实', () => {
  it('不入流不使虚招；二流以上的对手有虚有实，按钮上的成算已经并进了虚实', () => {
    const d0 = new Duel(hero(standard(0)), foe(standard(0)), { rng: mulberry32(5) });
    expect(d0.feintR).toBe(0);
    const d2 = new Duel(hero(standard(2)), foe(standard(2)), { rng: mulberry32(5) });
    expect(d2.feintR).toBeGreaterThan(0.2);
    const o = d2.options(d2.tells[0]);
    // 硬接最怕虚招：并进虚实以后，硬接的成算比不算虚实时低得多；拆招不怕
    const blk = o.find(x => x.k === 'block')!, par = o.find(x => x.k === 'parry')!;
    expect(blk.raw - blk.p).toBeGreaterThan(par.raw - par.p);
  });

  it('打二流的对手，每几场就有一次看破虚招、乘虚而入；只看实招成算的人吃亏', () => {
    let saw = 0, fooled = 0;
    for (let i = 0; i < 60; i++) {
      const d = simulate(new Duel(hero(standard(2, 'outer')), foe(standard(2, 'light')), { rng: mulberry32(900 + i) }), SKILLED);
      saw += d.log.saw; fooled += d.log.fooled;
    }
    expect(saw).toBeGreaterThan(10);
    expect(fooled).toBeGreaterThan(0);
    expect(pairs(2, 2, SKILLED, 50, 6)).toBeGreaterThanOrEqual(pairs(2, 2, NAIVE, 50, 6) - 0.02);
  }, 60000);
});

describe('帮手、剧本、切磋', () => {
  it('帮手按约定的合数出手，一共替你打掉约定的几成气血', () => {
    const ally: AllySpec = { name: '漕帮', share: 0.25, at: [2, 5, 8] };
    const d = new Duel(hero(standard(1)), foe(standard(1)), { rng: mulberry32(11), allies: [ally] });
    let got = 0;
    const rounds: number[] = [];
    for (let i = 0; i < 12 && !d.over; i++) {
      for (const e of d.tick()) if (e.k === 'ally') { got += e.dmg; rounds.push(d.round); }
      if (d.prompt) d.respond(null);
      if (d.opening) d.dropOpening();
    }
    expect(rounds).toEqual([2, 5, 8]);
    expect(got / d.ehpMax).toBeCloseTo(0.25, 1);
  });

  it('帮手真的管用：同样的人，有两个帮手胜率高出一大截', () => {
    const allies: AllySpec[] = [{ name: '漕帮', share: 0.25, at: [2, 7, 12] }, { name: '柳寒舟', share: 0.15, at: [4, 10, 16] }];
    let a = 0, b = 0;
    for (let i = 0; i < 120; i++) {
      if (simulate(new Duel(hero(standard(1, 'outer')), foe(standard(2, 'outer')), { rng: mulberry32(300 + i) }), SKILLED).res === 'win') a++;
      if (simulate(new Duel(hero(standard(1, 'outer')), foe(standard(2, 'outer')), { rng: mulberry32(300 + i), allies }), SKILLED).res === 'win') b++;
    }
    expect((b - a) / 120).toBeGreaterThan(0.2);
  }, 60000);

  it('剧本战 rescue：接过第一记重招，再过两合有人出手；对手不会被打死', () => {
    const d = new Duel(hero(standard(0)), foe(standard(2), { script: 'rescue', firstTell: 2 }), { rng: mulberry32(3) });
    let script = false;
    for (let i = 0; i < 30 && !d.over && !script; i++) {
      script = d.tick().some(e => e.k === 'script');
      if (d.prompt) script = d.respond('dodge').some(e => e.k === 'script') || script;
      if (d.opening) d.dropOpening();
    }
    expect(script).toBe(true);
    expect(d.waiting).toBe(true);
    expect(d.ehp).toBeGreaterThan(0);
    d.finishScript();
    expect(d.res).toBe('win');
  });

  it('剧本战 cup：你撑不住时有人出手，气血不会掉到底线以下', () => {
    const d = new Duel({ ...hero(standard(0)), hp: 200, hpMax: 600 }, foe(standard(2), { script: 'cup' }), { rng: mulberry32(8) });
    let script = false;
    for (let i = 0; i < 60 && !d.over && !script; i++) {
      script = d.tick().some(e => e.k === 'script');
      if (d.prompt) script = d.respond(null).some(e => e.k === 'script') || script;
      if (d.opening) d.dropOpening();
    }
    expect(script).toBe(true);
    expect(d.hp).toBe(150);
  });

  it('切磋：打到对手三成气血即止；自己也不会被打到三成以下', () => {
    const d = simulate(new Duel(hero(standard(2)), foe(standard(1), { spar: true }), { rng: mulberry32(21) }), SKILLED);
    expect(d.res).toBe('win');
    expect(d.ehp).toBe(d.efloor);
    const e = simulate(new Duel(hero(standard(0)), foe(standard(2), { spar: true }), { rng: mulberry32(22) }), RANDOM);
    expect(e.hp).toBeGreaterThanOrEqual(e.floor);
  });
});
