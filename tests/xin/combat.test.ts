import { describe, expect, it } from 'vitest';
import { Duel } from '../../src/engine/duel';
import { Battle, HERO, FOES, batch, clean, simulate, unlocked, windowMs, probabilities } from '../../src/xin/combat';

describe('练武场：旧内核与新尺度', () => {
  it('实战和批量模拟复用旧 Duel，并固定种子', () => {
    const first = simulate(HERO, FOES[1], 1011);
    const next = simulate(HERO, FOES[1], 1011);
    expect(first.duel).toBeInstanceOf(Duel);
    expect(first.entries).toEqual(next.entries);
    expect(first.result).toBe(next.result);
    expect(first.elapsed).toBe(next.elapsed);
    expect(first.result).not.toBeNull();
  });
  it('等级越高招式越多，对手的身体没有随之变强', () => {
    expect([20, 80, 180, 300].map(n => unlocked(n).length)).toEqual([1, 3, 4, 5]);
    const fights = [20, 80, 180].map(level => new Battle({ ...HERO, level }, FOES[1], 7));
    expect(new Set(fights.map(b => b.foe.hpMax)).size).toBe(1);
  });
  it('境界差连续作用于命中与时间窗，悟性延长时间窗', () => {
    const odds = [20, 80, 180].map(level => probabilities({ ...HERO, level }, FOES[1]).hit);
    expect(odds[0]).toBeLessThan(odds[1]);
    expect(odds[1]).toBeLessThan(odds[2]);
    expect(windowMs(-80, 20)).toBeLessThan(windowMs(80, 20));
    expect(windowMs(0, 10)).toBeLessThan(windowMs(0, 30));
    expect(windowMs(0.01, 20) - windowMs(0, 20)).toBeLessThan(5);
  });
  it('配置不会修改输入；无内力也能打完', () => {
    const snapshot = JSON.stringify([HERO, FOES]);
    simulate({ ...HERO, inner: 0, energy: 0 }, FOES[0], 4);
    expect(JSON.stringify([HERO, FOES])).toBe(snapshot);
    expect(clean({ ...HERO, level: NaN, inner: -5 }).level).toBe(0);
  });
  it('输出每档一千场的真实统计', () => {
    const rows = FOES.map(f => ({ foe: f.name, ...batch(HERO, f, 1000, 1011) }));
    console.log(JSON.stringify(rows));
    rows.forEach(r => { expect(r.games).toBe(1000); expect(r.draws).toBe(0); });
    expect(rows[1].seconds).toBeGreaterThanOrEqual(30);
    expect(rows[1].seconds).toBeLessThanOrEqual(60);
    expect(rows[0].winRate).toBeGreaterThan(rows[1].winRate);
    expect(rows[1].winRate).toBeGreaterThan(rows[2].winRate);
  });
  it('主动招式沿用旧内力费用、冷却与削劲效果', () => {
    const b = new Battle(HERO, FOES[1], 1);
    const cost = b.duel.performCost(0), mp = b.hero.mp;
    expect(b.perform(0)).toBe(true);
    expect(b.hero.mp).toBe(mp - cost);
    expect(b.duel.pcd[0]).toBe(6);
    expect(b.duel.foeSt.weaken?.v).toBe(15);
    expect(b.perform(0)).toBe(false);
  });
  it('绝招按等级与劲势开锁，绝对效果仍由旧解释器执行', () => {
    const novice = new Battle({ ...HERO, level: 20 }, FOES[2], 1);
    novice.duel.rage = 100;
    expect(novice.ultimate()).toBe(false);
    const b = new Battle(HERO, FOES[2], 1);
    expect(b.ultimate()).toBe(false);
    b.duel.rage = 100;
    expect(b.ultimate()).toBe(true);
    expect(b.duel.rage).toBe(4); // 旧引擎清空后，本次命中再积四点。
    expect(b.duel.foeSt.busy?.r).toBe(1);
    expect(b.entries.some(e => e.kind === 'ult')).toBe(true);
  });
  it('蓄势不立即出拳，松手存劲；过短、取消与无内力不消费', () => {
    const b = new Battle(HERO, FOES[1], 1);
    const hp = b.foe.hp, mp = b.hero.mp;
    expect(b.beginCharge()).toBe(true); b.releaseCharge(200);
    expect(b.hero.mp).toBe(mp); expect(b.hero.charge).toBe(0);
    b.beginCharge(); b.releaseCharge(2000);
    expect(b.hero.charge).toBe(0.8); expect(b.hero.mp).toBe(mp - 4);
    expect(b.foe.hp).toBe(hp);
    b.beginCharge(); b.cancelCharge(); expect(b.hero.charging).toBe(false);
    expect(new Battle({ ...HERO, energy: 0 }, FOES[1]).beginCharge()).toBe(false);
  });
  it('来招暂停自动走动，缺少的武功不能凭空应对，超时用本能', () => {
    const b = new Battle({ ...HERO, level: 20 }, { ...FOES[1], level: 20 }, 1);
    while (!b.prompt && !b.result) b.tick();
    expect(b.prompt?.kind).toBe('heavy');
    const p = b.prompt!, round = b.round;
    b.tick(); expect(b.round).toBe(round);
    expect(b.respond('rush', 100)).toBe(false);
    expect(b.perform(0)).toBe(false);
    expect(b.respond('dodge', p.duration + 1)).toBe(true);
    expect(b.entries.some(e => e.text.includes('凭本能'))).toBe(true);
  });
  it('先天膂力进拳劲，根骨进气血，身法进闪避', () => {
    const strong = new Battle({ ...HERO, attrs: { ...HERO.attrs, strength: 30 } }, FOES[1]);
    const healthy = new Battle({ ...HERO, attrs: { ...HERO.attrs, constitution: 30 } }, FOES[1]);
    const plain = new Battle(HERO, FOES[1]);
    expect(strong.duel.auto[0]).toBeGreaterThan(plain.duel.auto[0]);
    expect(healthy.hero.hpMax).toBeGreaterThan(plain.hero.hpMax);
    expect(probabilities(FOES[1], { ...HERO, attrs: { ...HERO.attrs, agility: 30 } }).dodge).toBeGreaterThan(probabilities(FOES[1], HERO).dodge);
  });
  it('普通交手每场至多五次选择，提示之间至少隔四合', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const b = simulate(HERO, FOES[1], seed);
      const rounds = b.entries.filter(e => e.kind === 'tell').map(e => e.round);
      expect(rounds.length).toBe(b.choicesDisplayed);
      expect(rounds.length).toBeLessThanOrEqual(5);
      rounds.slice(1).forEach((n, i) => expect(n - rounds[i]).toBeGreaterThanOrEqual(4));
    }
  });
  it('切磋沿用旧收手阈值；高手一记有效出手便能制住普通人', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const b = simulate(HERO, FOES[2], seed);
      expect(b.result).toBe('lose');
      expect(b.entries.filter(e => e.target === 'hero' && (e.damage ?? 0) > 0)).toHaveLength(1);
      expect(b.hero.hp).toBeGreaterThan(0);
    }
  });
  it('四段节奏从试探到收势，免费应对会推迟下一合', () => {
    const b = new Battle(HERO, FOES[1], 1);
    expect(b.phase).toBe('试探'); expect(b.nextRoundMs).toBe(1200);
    while (!b.prompt && !b.result) b.tick();
    expect(b.phase).toBe('相持');
    if (b.prompt?.kind === 'heavy') { b.respond('dodge', 100); expect(b.nextRoundMs).toBe(2000); }
    b.yield(); expect(b.phase).toBe('收势'); expect(b.result).toBe('yield');
  });
});
