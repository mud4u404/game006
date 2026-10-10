/** 旧内核退役时保留 Duel 仍有的规则覆盖；断言以实战语义为准。 */
import { describe, expect, it } from 'vitest';
import { Duel, SKILLED, simulate, type HeroSpec, type PerformSpec } from '../src/engine/duel';
import { standard } from '../src/engine/person';
import { mulberry32 } from '../src/engine/rng';
import { STAGES, bestBuild, duel, kitOf, matrix } from './balance-kit';

const move = (more: Partial<PerformSpec> = {}): PerformSpec =>
  ({ name: '招', mp: 0, cd: 0, hits: 1, dmg: [0, 0], acc: 1, fx: [], ...more });
const pair = (more: Partial<HeroSpec> = {}, rng = () => 0.5): Duel =>
  new Duel({ person: standard(2), ...more }, { person: standard(2), name: '乙', tells: ['li', 'su', 'qiao'] }, { rng });

describe('实战仍有的效果', () => {
  it('同种子、同招式和策略完全复现，换种子改变实际战斗', () => {
    const run = (seed: number) => {
      const d = pair({ performs: [move({ dmg: [80, 160], acc: 0.7, mp: 45, cd: 2 })] }, mulberry32(seed));
      simulate(d, SKILLED);
      return { res: d.res, round: d.round, hp: d.hp, ehp: d.ehp, mp: d.mp, log: d.log };
    };
    expect(run(7)).toEqual(run(7)); expect(run(7)).not.toEqual(run(8));
  });

  it('同种毒保留较大的强度和持续时间，每合只跳一次伤害', () => {
    const d = pair({ performs: [
      move({ fx: [{ kind: 'poison', value: 40, rounds: 3 }] }),
      move({ fx: [{ kind: 'poison', value: 20, rounds: 5 }] })
    ] });
    d.perform(0); d.perform(1);
    expect(d.foeSt.poison).toMatchObject({ v: 40, r: 5 });
    const ev = d.tick().filter(e => e.k === 'dot');
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ kind: 'poison', dmg: Math.round(40 * d.dmgK) });
  });

  it('寒气抑制对手出手，玩家绝招仍照常调息', () => {
    const d = pair({ performs: [move({ cd: 3, fx: [{ kind: 'chill', rounds: 3 }] })] }, () => 0.25);
    d.perform(0);
    const ev = d.tick();
    expect(ev).toContainEqual({ k: 'held', why: 'chill' });
    expect(ev.some(e => e.k === 'auto' && e.who === 'foe')).toBe(false);
    expect(d.pcd[0]).toBe(2);
  });

  it('卸力减少对手的真实出手伤害，缴械还能继续减少', () => {
    const hit = (fx: PerformSpec['fx']) => {
      const d = pair({ performs: [move({ fx })] }, () => 0.8);
      d.perform(0);
      return d.tick().find(e => e.k === 'auto' && e.who === 'foe');
    };
    const base = hit([]), weak = hit([{ kind: 'weaken', value: 20, rounds: 3 }]);
    const both = hit([{ kind: 'weaken', value: 20, rounds: 3 }, { kind: 'disarm', rounds: 3 }]);
    expect(base?.k).toBe('auto'); expect(weak?.k).toBe('auto'); expect(both?.k).toBe('auto');
    if (base?.k !== 'auto' || weak?.k !== 'auto' || both?.k !== 'auto') throw new Error('未打出普通出手');
    expect(weak.dmg / base.dmg).toBeCloseTo(0.8, 1);
    expect(both.dmg / base.dmg).toBeCloseTo(0.48, 1);
  });

  it('点穴最多定一合，冲开后的三合保护防止连续控制', () => {
    const d = pair({ performs: [move({ fx: [{ kind: 'busy', rounds: 20 }] })] });
    d.perform(0);
    expect(d.foeSt.busy?.r).toBe(1);
    expect(d.tick()).toContainEqual({ k: 'held', why: 'busy' });
    expect(d.foeImmune).toBe(3);
    expect(d.perform(0).find(e => e.k === 'perform')).toMatchObject({ fx: [] });
    expect(d.foeSt.busy).toBeUndefined();
    for (let i = 0; i < 3; i++) { d.nextTell = 99; d.tick(); }
    expect(d.perform(0).find(e => e.k === 'perform')).toMatchObject({ fx: ['busy'] });
  });

  it('多段招式只结算一次自疗效果；命中后的流血也只记一个效果', () => {
    const d = pair({ performs: [move({ hits: 3, fx: [{ kind: 'heal', value: 70 }, { kind: 'bleed', value: 20, rounds: 2 }] })] });
    d.hp -= 200;
    const before = d.hp;
    expect(d.perform(0).find(e => e.k === 'perform')).toMatchObject({ fx: ['heal', 'bleed'] });
    expect(d.hp - before).toBe(70);
    expect(d.foeSt.bleed).toMatchObject({ v: 20, r: 2 });
  });

  it('打空不施加对手减益，自己的护体仍能上身', () => {
    const d = pair({ performs: [move({ acc: 0, fx: [{ kind: 'poison', value: 30 }, { kind: 'guard', value: 20 }] })] });
    expect(d.perform(0).find(e => e.k === 'perform')).toMatchObject({ hit: false, fx: ['guard'] });
    expect(d.foeSt.poison).toBeUndefined(); expect(d.meSt.guard?.v).toBe(20);
  });

  it('门户大开增加后续的真实伤害，蓄力最多八成且出手后清掉', () => {
    const attack = (opened: boolean, charged: boolean) => {
      const d = pair({ performs: [move({ fx: [{ kind: 'break', value: 20, rounds: 3 }] }), move({ dmg: [100, 100] })] });
      if (opened) d.perform(0);
      if (charged) d.addCharge(10);
      expect(d.charge).toBe(charged ? 0.8 : 0);
      const ev = d.perform(1).find(e => e.k === 'perform');
      expect(d.charge).toBe(0);
      if (ev?.k !== 'perform') throw new Error('没有出手');
      return { damage: ev.dmg, power: d.dmgK };
    };
    const base = attack(false, false), opened = attack(true, false), charged = attack(false, true);
    expect(base.damage).toBe(Math.round(100 * base.power));
    expect(opened.damage).toBe(Math.round(120 * opened.power));
    expect(charged.damage).toBe(Math.round(180 * charged.power));
  });

  it('实战吸纳效果恢复自身内力，恢复不得超过上限', () => {
    const d = pair({ performs: [move({ acc: 0, fx: [{ kind: 'drain', value: 150 }] })] });
    d.mp = d.mpMax - 200;
    d.perform(0); expect(d.mp).toBe(d.mpMax - 50);
    d.perform(0); expect(d.mp).toBe(d.mpMax);
  });

  it('杀招怒气满才放，必中，用完清零', () => {
    const d = pair({ ult: { dmg: [500, 500], fx: [] } }, () => 0.999);
    expect(d.ult()).toEqual([]);
    d.rage = 100;
    const before = d.ehp;
    expect(d.ult().find(e => e.k === 'ult')).toMatchObject({ dmg: Math.round(500 * d.dmgK) });
    expect(d.ehp).toBeLessThan(before);
    // 实战的 dealt 每次命中补四点怒气：杀招先清空，再记这回命中的四点。
    expect(d.rage).toBe(4 * d.rageK);
  });
});

describe('平衡验收走同一套交手', () => {
  it('相同搭配成对轮换角色恰为五成，改名不影响策略；矩阵保留原始玩家胜率', () => {
    const a = kitOf(bestBuild('寒江', STAGES[1]));
    const b = { ...a, name: '镜像', state: { ...a.state, name: '镜像' } };
    expect(duel(a, b, 20, 'mirror')).toBe(0.5);
    const m = matrix([a, b], 20, 'mirror');
    expect(m.rate).toEqual([[0.5, 0.5], [0.5, 0.5]]);
    expect(m.heroRate[0][1]).toBe(m.heroRate[1][0]);
    expect(m.heroRate[0][1]).toBeGreaterThanOrEqual(0);
    expect(m.heroRate[0][1]).toBeLessThanOrEqual(1);
  });
});
