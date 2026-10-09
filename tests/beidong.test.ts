/**
 * 被动与合璧接进实战（src/engine/beidong.ts、duel.ts）：
 * 护体少挨打（被动部分最多两成五，与绝招所给相加封顶五成）、身法多闪避、回血按气血上限的千分比每合生效且每场封顶一成、
 * 涨怒气每合生效、合璧要在手（出手的外功、兵器在手）才成、合璧减益开战即上身、内力见底被动失效；
 * 实战（heroSpec）和模拟（kitOf）共用一套汇总算法。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { FOES, skillById } from '../src/content';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { passivesOf } from '../src/engine/beidong';
import { Duel, PASSIVE_GUARD_CAP, PASSIVE_HEAL_CAP, type FoeSpec, type HeroSpec } from '../src/engine/duel';
import { standard } from '../src/engine/person';
import { mulberry32 } from '../src/engine/rng';
import { fightKit, foeSpec, heroSpec, passivesNow } from '../src/engine/zhaoshi';

const foe = (): FoeSpec => ({ person: standard(2), name: '对手', tells: ['li', 'su', 'qiao'] });
const hero = (more: Partial<HeroSpec> = {}): HeroSpec => ({ person: standard(2), ...more });
/** 取私有方法，直接量 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const priv = (d: Duel): any => d;

describe('被动接进交手：护体、身法', () => {
  it('有护体的人受伤更少：护体二十，一击只剩八成', () => {
    const a = new Duel(hero(), foe(), { rng: mulberry32(1) });
    const b = new Duel(hero({ passive: { guard: 20 } }), foe(), { rng: mulberry32(1) });
    priv(a).hurt(200, null, false, []);
    priv(b).hurt(200, null, false, []);
    const la = a.hpMax - a.hp, lb = b.hpMax - b.hp;
    expect(lb).toBeLessThan(la);
    expect(lb / la).toBeCloseTo(0.8, 1);
  });

  it('被动护体自己封顶两成五：写四十五，也只算二十五', () => {
    expect(PASSIVE_GUARD_CAP).toBe(25);
    const d = new Duel(hero({ passive: { guard: 45 } }), foe(), { rng: mulberry32(1) });
    const base = new Duel(hero(), foe(), { rng: mulberry32(1) });
    priv(d).hurt(200, null, false, []);
    priv(base).hurt(200, null, false, []);
    expect((d.hpMax - d.hp) / (base.hpMax - base.hp)).toBeCloseTo(0.75, 1);
  });

  it('被动护体和绝招给的护体叠加，合起来封顶五成', () => {
    const d = new Duel(hero({ passive: { guard: 45 } }), foe(), { rng: mulberry32(1) });
    d.meSt.guard = { v: 40, r: 2, fresh: false };
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
    const d = new Duel(hero({ passive: { guard: 20, haste: 20 } }), foe(), { rng: mulberry32(1) });
    expect(priv(d).guardNow()).toBe(20);
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
    expect(priv(d).guardNow()).toBe(20);
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

  it('回血按气血上限的千分比：value 20 = 每合回千分之二十；涨怒气每合涨', () => {
    const base = tick1({}), heal = tick1({ passive: { heal: 20 } }), rage = tick1({ passive: { rage: 5 } });
    expect(heal.hp - base.hp).toBe(Math.floor(heal.hpMax * 0.02));
    expect(rage.rage - base.rage).toBe(5);
  });

  it('同样的回血值，气血上限越高回得越多（按比例，不是固定数）', () => {
    const small = new Duel(hero({ person: standard(1), passive: { heal: 20 } }), foe(), { rng: () => 0.5 });
    const big = new Duel(hero({ person: standard(4), passive: { heal: 20 } }), foe(), { rng: () => 0.5 });
    expect(big.hpMax).toBeGreaterThan(small.hpMax);
    for (const d of [small, big]) { d.hp = Math.round(d.hpMax * 0.5); d.nextTell = 99; }
    const s0 = small.hp, b0 = big.hp;
    small.tick(); big.tick();
    expect(big.hp - b0).toBeGreaterThan(small.hp - s0);
  });

  it('回血不超过气血上限', () => {
    const d = new Duel(hero({ passive: { heal: 500 } }), foe(), { rng: () => 0.5 });
    d.hp = d.hpMax - 3;
    d.nextTell = 99;
    d.tick();
    expect(d.hp).toBeLessThanOrEqual(d.hpMax);
  });

  it('每场被动回血总量封顶：不超过气血上限的一成，再多的合数也回不过', () => {
    expect(PASSIVE_HEAL_CAP).toBe(0.1);
    const d = new Duel(hero({ passive: { heal: 50 } }), { ...foe(), spar: true, rounds: 400 }, { rng: () => 0.5 });
    d.hp = Math.round(d.hpMax * 0.4);
    const hp0 = d.hp;
    d.ehp = d.ehpMax = 1e9;  // 对手打不倒；也不出手，免得伤害把回血盖住
    priv(d).atk = [0, 0]; priv(d).big = 0;
    for (let i = 0; i < 100 && !d.over; i++) { d.nextTell = 99; d.tick(); }
    const got = d.hp - hp0;
    expect(got).toBeGreaterThan(d.hpMax * 0.09);
    expect(got).toBeLessThanOrEqual(Math.floor(d.hpMax * 0.1));
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

  it('易筋经打底：护体、回血入常驻；燃木刀在身上又握着刀，合璧再添护体', () => {
    wear({ neigong: 'sl_yijinjing' });
    expect(heroSpec(S, fightKit(S), tu).passive).toMatchObject({ guard: 12, heal: 8 });
    wear({ weapon: 'sl_ranmu' });
    S.gear.weapon = 'jc_yaodao';
    const pv = passivesNow(S);
    expect(pv.combos.find(c => c.combo.name === '刀禅一体')?.on).toBe(true);
    expect(heroSpec(S, fightKit(S), tu).passive).toMatchObject({ guard: 20, heal: 8 });
  });

  it('兵器类的那一门不论当主当搭档，兵器都要在手：易筋经加燃木刀，不握刀不成、握刀成', () => {
    wear({ neigong: 'sl_yijinjing', weapon: 'sl_ranmu' });
    delete S.gear.weapon;
    // 刀禅一体写在易筋经上，燃木刀是搭档：刀不在手，不成，并说得出缘故
    expect(passivesNow(S).combos.find(c => c.combo.name === '刀禅一体')).toMatchObject({ paired: false, idle: true, on: false });
    expect(heroSpec(S, fightKit(S), tu).passive).toMatchObject({ guard: 12, heal: 8 });
    S.gear.weapon = 'jc_yaodao';
    expect(passivesNow(S).combos.find(c => c.combo.name === '刀禅一体')).toMatchObject({ paired: true, idle: false, on: true });
    expect(heroSpec(S, fightKit(S), tu).passive).toMatchObject({ guard: 20, heal: 8 });
  });

  it('外功配外功：太极剑出手、太极拳搭在拳脚位，合璧成；太极剑不出手（剑不在手）就不成', () => {
    wear({ neigong: 'wd_taijishengong', weapon: 'wd_taijijian', fist: 'wd_taijiquan' });
    S.gear.weapon = 'jc_songwen';
    const c = passivesNow(S).combos.find(x => x.combo.name === '太极合璧');
    expect(c).toMatchObject({ paired: true, rooted: true, on: true });
    delete S.gear.weapon;
    expect(passivesNow(S).combos.find(x => x.combo.name === '太极合璧')).toMatchObject({ paired: false, idle: true, on: false });
  });

  it('搭档不在身上，合璧不成；没有本门内功打底，也不成，并说得出缘故', () => {
    wear({ neigong: 'sl_yijinjing' });
    const c1 = passivesNow(S).combos.find(c => c.combo.name === '刀禅一体');
    expect(c1).toMatchObject({ paired: false, idle: false, on: false });
    wear({ neigong: 'jh_tuna', weapon: 'sl_ranmu' });
    S.gear.weapon = 'jc_yaodao';
    // 易筋经不在身上了：刀禅一体也不成
    expect(passivesNow(S).combos.find(c => c.combo.name === '刀禅一体')?.on ?? false).toBe(false);
  });

  it('同一份算法：搭配直接交给 passivesOf，和 heroSpec 汇总一致', () => {
    wear({ neigong: 'sl_yijinjing', weapon: 'sl_ranmu' });
    S.gear.weapon = 'jc_yaodao';
    const pv = passivesOf({ neigong: skillById('sl_yijinjing'), weapon: skillById('sl_ranmu') }, { outer: skillById('sl_ranmu'), weaponReady: true });
    expect(pv.sum.guard).toBe(20);
    expect(heroSpec(S, fightKit(S), tu).passive?.guard).toBe(pv.sum.guard);
    expect(foeSpec(tu, [])).not.toHaveProperty('passive');
  });
});
