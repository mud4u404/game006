/**
 * 战斗内核：docs/menpai.md 第五节的每一条规则各一个用例。
 */
import { describe, expect, it } from 'vitest';
import { act, apply, createCombat, dodgeOf, fight, greedy, strike, step, takenMul, type Kit, type Move } from '../src/engine/combat';
import { mulberry32 } from '../src/engine/rng';

const move = (o: Partial<Move> = {}): Move => ({ name: '招', mp: 0, cd: 1, hits: 1, dmg: [100, 100], acc: 1, fx: [], ...o });
const kit = (o: Partial<Kit> = {}): Kit => ({
  name: '甲', hpMax: 2000, mpMax: 800, mpRegen: 0, dodge: 0, hit: 0,
  passive: { guard: 0, haste: 0, heal: 0, rage: 0 }, openers: [], moves: [], basic: move({ name: '普通', cd: 0 }), ...o
});
/** 永远返回同一个数的随机数：0 表示「每次都中」，0.999 表示「每次都不中」 */
const fixed = (x: number) => () => x;
const pair = (a: Partial<Kit> = {}, b: Partial<Kit> = {}, rng = fixed(0)) => createCombat(kit(a), kit({ name: '乙', ...b }), rng);

describe('战斗内核', () => {
  it('同一个种子，结果完全一样', () => {
    const a = kit({ moves: [move({ mp: 50, cd: 2, dmg: [80, 160], acc: 0.7 })] }), b = kit({ name: '乙', basic: move({ cd: 0, dmg: [50, 150], acc: 0.8 }) });
    const run = (seed: number) => { const c = createCombat(a, b, mulberry32(seed)); fight(c, greedy); return [c.result, c.round, c.f[0].hp, c.f[1].hp]; };
    expect(run(7)).toEqual(run(7));
    expect(run(7)).not.toEqual(run(8));
  });

  it('破绽抵护体：每 1% 破绽抵 2% 护体，抵完剩下的才加伤害', () => {
    const c = pair({}, { passive: { guard: 30, haste: 0, heal: 0, rage: 0 } });
    const [, b] = c.f;
    expect(takenMul(b)).toBeCloseTo(0.7);
    b.st.break = { v: 10, r: 2, fresh: false };
    expect(takenMul(b)).toBeCloseTo(0.9);
    b.st.break.v = 20;
    expect(takenMul(b)).toBeCloseTo(1.05);
  });

  it('蓄势：重招先空一合；蓄势时被点穴，这一招落空，内力照扣', () => {
    const heavy = move({ mp: 100, cd: 3, dmg: [500, 500], heavy: true });
    const c = pair({ moves: [heavy] });
    const [a, b] = c.f;
    act(c, a, b, { kind: 'move', i: 0 });
    expect(a.windup).toBe(1);
    expect(b.hp).toBe(2000);
    expect(a.mp).toBe(700);
    act(c, a, b, { kind: 'basic' });
    expect(b.hp).toBe(2000 - 600); // 蓄势而发，加两成
    act(c, a, b, { kind: 'move', i: 0 });
    a.cd[0] = 0;
    act(c, a, b, { kind: 'move', i: 0 });
    apply(c, b, a, { kind: 'busy', rounds: 1 });
    expect(a.windup).toBe(0);
  });

  it('内力见底：内力低于一成半，内功被动失效', () => {
    const c = pair({}, { passive: { guard: 30, haste: 0, heal: 0, rage: 0 } });
    const b = c.f[1];
    expect(takenMul(b)).toBeCloseTo(0.7);
    b.mp = 100;
    expect(takenMul(b)).toBe(1);
  });

  it('毒不吃减伤，同一种毒不叠加', () => {
    const c = pair({}, { passive: { guard: 50, haste: 0, heal: 0, rage: 0 } });
    const [a, b] = c.f;
    apply(c, a, b, { kind: 'poison', value: 40, rounds: 3 });
    apply(c, a, b, { kind: 'poison', value: 20, rounds: 5 });
    expect(b.st.poison).toMatchObject({ v: 40, r: 5 });
    b.st.weaken = { v: 30, r: 3, fresh: false };
    step(c, () => ({ kind: 'basic' }));
    expect(2000 - b.hp).toBeGreaterThanOrEqual(40);
    const hpBefore = b.hp;
    c.f[0].kit.basic.dmg = [0, 0];
    step(c, () => ({ kind: 'basic' }));
    expect(hpBefore - b.hp).toBeGreaterThanOrEqual(40);
  });

  it('疗伤驱毒：绝招里的疗伤减两合毒，被动回血不驱毒', () => {
    const c = pair();
    const [a, b] = c.f;
    apply(c, b, a, { kind: 'poison', value: 30, rounds: 4 });
    apply(c, a, b, { kind: 'heal', value: 100 }, false);
    expect(a.st.poison?.r).toBe(4);
    apply(c, a, b, { kind: 'heal', value: 100 });
    expect(a.st.poison?.r).toBe(2);
  });

  it('毒滞身法：中毒或寒气在身，闪避减半', () => {
    const c = pair({}, { dodge: 0.3 });
    const [a, b] = c.f;
    expect(dodgeOf(b)).toBeCloseTo(0.3);
    apply(c, a, b, { kind: 'poison', value: 10, rounds: 2 });
    expect(dodgeOf(b)).toBeCloseTo(0.15);
  });

  it('寒气：一定后手，闪避减半；不拖慢调息', () => {
    const c = pair({ dodge: 0.4 }, { dodge: 0 }, mulberry32(1));
    const [a, b] = c.f;
    apply(c, b, a, { kind: 'chill', rounds: 3 });
    expect(dodgeOf(a)).toBeCloseTo(0.2);
    a.cd = [2];
    const order: string[] = [];
    step(c, (_c, me) => { order.push(me.kit.name); return { kind: 'basic' }; });
    expect(order).toEqual(['乙', '甲']);
    expect(a.cd).toEqual([1]);
  });

  it('卸力按击算：被卸力的人，每一击再减卸力值那么多点', () => {
    const three = move({ hits: 3, dmg: [50, 50] });
    const c = pair();
    const [a, b] = c.f;
    a.st.weaken = { v: 20, r: 2, fresh: false };
    strike(c, a, b, three);
    expect(2000 - b.hp).toBe(3 * (50 * 0.8 - 20));
  });

  it('粘劲、身法闪控：被卸力的人点穴几率减半，身法也能闪开点穴', () => {
    const c = pair({}, {}, fixed(0.6));
    const [a, b] = c.f;
    expect(apply(c, a, b, { kind: 'busy', rounds: 1, chance: 0.9 })).toBe(true);
    delete b.st.busy;
    a.st.weaken = { v: 10, r: 2, fresh: false };
    expect(apply(c, a, b, { kind: 'busy', rounds: 1, chance: 0.9 })).toBe(false);
    delete a.st.weaken;
    b.kit.dodge = 0.4;
    expect(apply(c, a, b, { kind: 'busy', rounds: 1, chance: 0.9 })).toBe(false);
  });

  it('解穴免疫：穴道解开以后，一合之内点不住', () => {
    const c = pair();
    const [a, b] = c.f;
    apply(c, a, b, { kind: 'busy', rounds: 1 });
    act(c, b, a, { kind: 'basic' });
    expect(b.st.busy).toBeUndefined();
    expect(apply(c, a, b, { kind: 'busy', rounds: 1 })).toBe(false);
  });

  it('吸功要接实：打空了吸不到，最多吸走对方现有的内力', () => {
    const suck = move({ fx: [{ kind: 'drain', value: 150 }] });
    const miss = pair({}, {}, fixed(0.999));
    strike(miss, miss.f[0], miss.f[1], suck);
    expect(miss.f[1].mp).toBe(800);
    const c = pair();
    const [a, b] = c.f;
    a.mp = 500; b.mp = 100;
    strike(c, a, b, suck);
    expect(b.mp).toBe(0);
    expect(a.mp).toBe(600);
  });

  it('一招的效果只上一次：三连击不会上三次流血', () => {
    const c = pair();
    const [a, b] = c.f;
    strike(c, a, b, move({ hits: 3, dmg: [10, 10], fx: [{ kind: 'bleed', value: 20, rounds: 2 }] }));
    expect(b.st.bleed).toMatchObject({ v: 20, r: 2 });
  });

  it('久战：满三十合按气血比例判，相差不到 2% 算平手', () => {
    const c = pair({ basic: move({ cd: 0, dmg: [1, 1] }) }, { basic: move({ cd: 0, dmg: [1, 1] }) });
    expect(fight(c, greedy)).toBe(0.5);
    expect(c.round).toBe(30);
    const d = pair({ basic: move({ cd: 0, dmg: [2, 2] }) }, { basic: move({ cd: 0, dmg: [1, 1] }), hpMax: 100 });
    expect(fight(d, greedy)).toBe(0);
  });

  it('杀招：怒气满就放，必中，用完怒气清零', () => {
    const ult = move({ name: '杀招', dmg: [500, 500], acc: 1, sure: true });
    const c = pair({ ult }, { dodge: 0.5 }, fixed(0.99));
    const [a, b] = c.f;
    a.rage = 100;
    expect(greedy(c, a, b)).toEqual({ kind: 'ult' });
    act(c, a, b, { kind: 'ult' });
    expect(b.hp).toBe(1500);
    expect(a.rage).toBe(0);
  });
});
