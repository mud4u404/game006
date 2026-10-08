import { describe, expect, it } from 'vitest';
import { skillById } from '../src/content';
import { buildState, oddsTable, performReport } from '../src/lab/calc';

describe('试算台', () => {
  it('按搭配和境界构造状态', () => {
    const s = buildState({ neigong: 'xinfa', qinggong: 'taxue', weapon: 'hanjiang' }, { xinfa: 3, taxue: 2, hanjiang: 4 });
    expect(s.loadout.weapon).toBe('hanjiang');
    expect(s.gear.weapon).toBe('qingfeng');
    expect(s.skills.hanjiang?.r).toBe(4);
    expect(s.skills.xinfa?.r).toBe(3);
  });

  it('成算表：每种应对一行，境界越高成算越高', () => {
    const lo = { neigong: 'xinfa', qinggong: 'taxue', weapon: 'hanjiang' };
    const pw = { li: 40, su: 40, qiao: 40, xi: 40 };
    const low = oddsTable(buildState(lo, { xinfa: 1, taxue: 1, hanjiang: 1, jinghong: 1 }), pw);
    const high = oddsTable(buildState(lo, { xinfa: 6, taxue: 6, hanjiang: 6, jinghong: 6 }), pw);
    expect(low.map(r => r.k)).toEqual(['block', 'dodge', 'parry', 'rush']);
    high.forEach((r, i) => expect(r.p).toBeGreaterThanOrEqual(low[i].p));
  });

  it('克制会体现在成算表里', () => {
    const s = buildState({ weapon: 'hanjiang' }, { hanjiang: 3 });
    const pw = { li: 30, su: 30, qiao: 30, xi: 30 };
    const plain = oddsTable(s, pw).find(r => r.k === 'parry')!.p;
    const vsHard = oddsTable(s, pw, { nature: '刚' }).find(r => r.k === 'parry')!.p;
    expect(vsHard).toBeGreaterThan(plain);
  });

  it('绝招预算报告：列出预算、上限、是否超标', () => {
    const rep = performReport(skillById('hanjiang')!);
    expect(rep.map(r => r.name)).toEqual(['寒江孤影', '江枫渔火', '独钓寒江']);
    expect(rep[0].over).toBe(false);
    expect(rep[0].budget).toBeGreaterThan(0);
    expect(rep[1].cap).toBeGreaterThan(rep[0].cap);
  });
});
