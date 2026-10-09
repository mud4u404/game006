/**
 * 被动与合璧接进实战（src/engine/beidong.ts、duel.ts）：
 * 护体少挨打、身法多闪避、回血和涨怒气每合生效、合璧减益开战即上身、内力见底被动失效；
 * 实战（heroSpec）和模拟（kitOf）共用一套汇总算法。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { FOES, skillById } from '../src/content';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { passivesOf } from '../src/engine/beidong';
import { Duel, type FoeSpec, type HeroSpec } from '../src/engine/duel';
import { standard } from '../src/engine/person';
import { mulberry32 } from '../src/engine/rng';
import { fightKit, foeSpec, heroSpec, passivesNow } from '../src/engine/zhaoshi';

const foe = (): FoeSpec => ({ person: standard(2), name: '对手', tells: ['li', 'su', 'qiao'] });
const hero = (more: Partial<HeroSpec> = {}): HeroSpec => ({ person: standard(2), ...more });
/** 取私有方法，直接量 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const priv = (d: Duel): any => d;

describe('被动接进交手：护体、身法', () => {
  it('有护体的人受伤更少：护体三十，一击只剩七成', () => {
    const a = new Duel(hero(), foe(), { rng: mulberry32(1) });
    const b = new Duel(hero({ passive: { guard: 30 } }), foe(), { rng: mulberry32(1) });
    priv(a).hurt(200, null, false, []);
    priv(b).hurt(200, null, false, []);
    const la = a.hpMax - a.hp, lb = b.hpMax - b.hp;
    expect(lb).toBeLessThan(la);
    expect(lb / la).toBeCloseTo(0.7, 1);
  });

  it('护体和绝招给的护体叠加，合起来封顶五成', () => {
    const d = new Duel(hero({ passive: { guard: 45 } }), foe(), { rng: mulberry32(1) });
    d.meSt.guard = { v: 20, r: 2, fresh: false };
    const base = new Duel(hero(), foe(), { rng: mulberry32(1) });
    priv(d).hurt(200, null, false, []);
    priv(base).hurt(200, null, false, []);
    expect((d.hpMax - d.hp) / (base.hpMax - base.hp)).toBeCloseTo(0.5, 1);
  });

  it('身法并进对手出手时的闪避：身法加得多，对手更常落空', () => {
    const miss = (haste: number): number => {
      const d = new Duel(hero({ passive: { haste } }), foe(), { rng: mulberry32(7) });
      let n = 0;
      for (let i = 0; i < 600; i++) {
        const ev: never[] = [];
        priv(d).foeAuto(ev, false);
        if ((ev[0] as { res: string }).res === 'dodge') n++;
        d.hp = d.hpMax;
      }
      return n;
    };
    expect(miss(40)).toBeGreaterThan(miss(0) + 60);
  });

  it('内力见底（低于一成五），护体、身法都失效；回到一成五以上又来了', () => {
    const d = new Duel(hero({ passive: { guard: 30, haste: 20 } }), foe(), { rng: mulberry32(1) });
    expect(priv(d).guardNow()).toBe(30);
    expect(priv(d).hasteNow()).toBe(20);
    d.mp = d.mpMax * 0.14;
    expect(d.passiveOn()).toBe(false);
    expect(priv(d).guardNow()).toBe(0);
    expect(priv(d).hasteNow()).toBe(0);
    const a = new Duel(hero(), foe(), { rng: mulberry32(1) });
    d.hp = d.hpMax;
    priv(d).hurt(200, null, false, []);
    priv(a).hurt(200, null, false, []);
    expect(d.hpMax - d.hp).toBe(a.hpMax - a.hp);
    d.mp = d.mpMax * 0.15;
    expect(priv(d).guardNow()).toBe(30);
  });
});

describe('被动接进交手：每合回血、涨怒气', () => {
  /** 打一合；对手固定不出手，免得伤害把回血盖住 */
  const tick1 = (more: Partial<HeroSpec>, mp?: number): Duel => {
    const d = new Duel(hero(more), { ...foe(), spar: true, rounds: 30 }, { rng: () => 0.5 });
    d.hp = Math.round(d.hpMax * 0.5);
    d.rage = 10;
    if (mp !== undefined) d.mp = mp;
    d.nextTell = 99;
    d.tick();
    return d;
  };

  it('有回血的人每合回血，有涨怒气的人每合涨怒气', () => {
    const base = tick1({}), heal = tick1({ passive: { heal: 7 } }), rage = tick1({ passive: { rage: 5 } });
    expect(heal.hp - base.hp).toBe(7);
    expect(rage.rage - base.rage).toBe(5);
  });

  it('回血不超过气血上限', () => {
    const d = new Duel(hero({ passive: { heal: 50 } }), foe(), { rng: () => 0.5 });
    d.hp = d.hpMax - 3;
    d.nextTell = 99;
    d.tick();
    expect(d.hp).toBeLessThanOrEqual(d.hpMax);
  });

  it('内力见底，回血、涨怒气断了', () => {
    const base = tick1({}, 0), heal = tick1({ passive: { heal: 7, rage: 5 } }, 0);
    expect(heal.hp).toBe(base.hp);
    expect(heal.rage).toBe(base.rage);
  });
});

describe('合璧减益：开战即上身', () => {
  it('合璧写的减益，一开战就施给对手；没写就干干净净', () => {
    const none = new Duel(hero(), foe(), { rng: mulberry32(3) });
    expect(none.foeStatus()).toEqual([]);
    const d = new Duel(hero({ openers: [{ kind: 'weaken', value: 20, rounds: 3 }, { kind: 'bleed', value: 12, rounds: 3 }] }), foe(), { rng: mulberry32(3) });
    expect(d.foeStatus()).toEqual(expect.arrayContaining(['weaken', 'bleed']));
    expect(d.foeSt.weaken?.v).toBe(20);
  });
});

describe('共用的汇总算法：实战与模拟一致', () => {
  beforeEach(() => setState(skipToYangzhou()));
  const wear = (ids: Partial<Record<'neigong' | 'qinggong' | 'fist' | 'weapon' | 'ult', string>>): void => {
    for (const id of Object.values(ids)) S.skills[id!] = { r: 3, p: 0 };
    Object.assign(S.loadout, ids);
  };
  const tu = FOES.find(f => f.id === 'tu')!;

  it('易筋经打底：护体、回血入常驻；燃木刀在身上，合璧再添护体', () => {
    wear({ neigong: 'sl_yijinjing' });
    expect(heroSpec(S, fightKit(S), tu).passive).toMatchObject({ guard: 12, heal: 8 });
    wear({ weapon: 'sl_ranmu' });
    const pv = passivesNow(S);
    expect(pv.combos.find(c => c.combo.name === '刀禅一体')?.on).toBe(true);
    expect(heroSpec(S, fightKit(S), tu).passive).toMatchObject({ guard: 20, heal: 8 });
  });

  it('搭档不在身上，合璧不成；没有本门内功打底，也不成，并说得出缘故', () => {
    wear({ neigong: 'sl_yijinjing' });
    const c1 = passivesNow(S).combos.find(c => c.combo.name === '刀禅一体');
    expect(c1).toMatchObject({ paired: false, on: false });
    wear({ neigong: 'jh_tuna', fist: 'sl_luohan', weapon: 'sl_weituo' });
    const c2 = passivesNow(S).combos.find(c => c.combo.name === '金刚合击');
    expect(c2).toMatchObject({ paired: true, rooted: false, on: false });
  });

  it('同一份算法：搭配直接交给 passivesOf，和 heroSpec 汇总一致', () => {
    wear({ neigong: 'sl_yijinjing', weapon: 'sl_ranmu' });
    const pv = passivesOf({ neigong: skillById('sl_yijinjing'), weapon: skillById('sl_ranmu') });
    expect(pv.sum.guard).toBe(20);
    expect(heroSpec(S, fightKit(S), tu).passive?.guard).toBe(pv.sum.guard);
    expect(foeSpec(tu, [])).not.toHaveProperty('passive');
  });
});
