/**
 * 武学库的平衡目标。改动品级系数、火候、克制、修为的规则时，这些测试保证大方向不跑偏。
 * 设计说明见 docs/wuxue.md。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { S, newGame, setState, skipToYangzhou } from '../src/core/state';
import { skillById } from '../src/content';
import type { SkillDef } from '../src/content/types';
import { respOptions } from '../src/engine/formulas';
import { autoSlot, counterBonus, defaultLoadout, huohou, reachBonus, skillPower, synergy, xiuwei } from '../src/engine/wuxue';

const fake = (grade: SkillDef['grade']): SkillDef =>
  ({ id: 'x', name: '测试', grade, category: '剑法', school: '江湖', nature: '中正', reach: '短', desc: '', learn: '' });

describe('品级与境界', () => {
  it('勤学苦练：凡品练到出神入化，胜过上品停在融会贯通', () => {
    expect(skillPower(fake('凡品'), 5)).toBeGreaterThan(skillPower(fake('上品'), 2) * 1.8);
  });
  it('同一境界，品级高的更强，但差距有限', () => {
    const order: SkillDef['grade'][] = ['凡品', '良品', '上品', '绝品', '神品', '禁品'];
    const p = order.map(g => skillPower(fake(g), 4));
    p.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(p[i]));
    expect(p[5] / p[0]).toBeLessThan(2);
  });
  it('相差一重境界，比相差一个品级影响更大', () => {
    expect(skillPower(fake('良品'), 4) - skillPower(fake('良品'), 3)).toBeGreaterThan(skillPower(fake('上品'), 3) - skillPower(fake('良品'), 3));
  });
});

describe('克制', () => {
  it('柔克刚、刚克阴、阴克阳、阳克柔，中正不克也不被克', () => {
    expect(counterBonus('柔', '刚')).toBeCloseTo(0.08);
    expect(counterBonus('刚', '柔')).toBeCloseTo(-0.08);
    expect(counterBonus('刚', '阴')).toBeCloseTo(0.08);
    expect(counterBonus('阴', '阳')).toBeCloseTo(0.08);
    expect(counterBonus('阳', '柔')).toBeCloseTo(0.08);
    expect(counterBonus('中正', '刚')).toBe(0);
    expect(counterBonus('柔', '中正')).toBe(0);
    expect(counterBonus('柔', undefined)).toBe(0);
  });
  it('兵器一寸长一寸强、一寸短一寸险', () => {
    expect(reachBonus('rush', '长', '短')).toBeCloseTo(0.05);
    expect(reachBonus('parry', '短', '长')).toBeCloseTo(0.05);
    expect(reachBonus('parry', '长', '短')).toBe(0);
    expect(reachBonus('dodge', '长', '徒手')).toBe(0);
  });
  it('克制会算进见招拆招的成算', () => {
    setState(skipToYangzhou());
    const pw = { li: 30, su: 30, qiao: 30, xi: 30 };
    const plain = respOptions(S, pw).find(o => o.k === 'parry')!.p;
    const vsHard = respOptions(S, pw, { nature: '刚' }).find(o => o.k === 'parry')!.p;
    expect(vsHard - plain).toBeCloseTo(0.08);
  });
});

describe('搭配', () => {
  beforeEach(() => setState(skipToYangzhou()));

  it('老存档按已学武功排出与原来一样的组合', () => {
    expect(defaultLoadout(S.skills)).toEqual({ neigong: 'xinfa', qinggong: 'taxue', main: 'hanjiang', off: 'jinghong', ult: 'duanshui' });
    expect(defaultLoadout(newGame().skills)).toEqual({ neigong: 'xinfa', qinggong: 'taxue', main: 'hanjiang' });
  });

  it('火候与改版前的公式一致（境界 × 10 + 属性）', () => {
    for (const st of [skipToYangzhou(), newGame()]) {
      setState(st);
      const r = (id: string): number => S.skills[id]?.r ?? 0;
      expect(huohou(S, 'block')).toBe(r('xinfa') * 10 + S.attr.根骨 + Math.round((S.mp / S.mpMax) * 10));
      expect(huohou(S, 'dodge')).toBe(r('taxue') * 10 + S.attr.身法);
      expect(huohou(S, 'parry')).toBe(r('hanjiang') * 10 + S.attr.悟性);
    }
    expect(huohou(skipToYangzhou(), 'rush')).toBe(0 + skipToYangzhou().attr.胆魄);
  });

  it('副手空着就没有抢攻', () => {
    setState(newGame());
    expect(respOptions(S, { li: 30, su: 30, qiao: 30, xi: 30 }).map(o => o.k)).toEqual(['block', 'dodge', 'parry']);
  });

  it('应对显示的是槽位里那门武功', () => {
    const o = respOptions(S, { li: 30, su: 30, qiao: 30, xi: 30 }).find(x => x.k === 'rush')!;
    expect(o.sname).toBe('惊鸿剑');
    expect(o.skill).toBe('jinghong');
  });

  it('学会新武功时，自动放进空着的合适槽位', () => {
    setState(newGame());
    autoSlot(S, skillById('jinghong')!);
    expect(S.loadout.off).toBe('jinghong');
    autoSlot(S, skillById('duanshui')!);
    expect(S.loadout.ult).toBe('duanshui');
  });

  it('内功与主手同出一门，都练到炉火纯青才相辅相成', () => {
    expect(synergy(S)).toBe(0);
    S.skills.xinfa!.r = 3;
    S.skills.hanjiang!.r = 3;
    expect(synergy(S)).toBe(3);
  });
});

describe('修为', () => {
  it('新人是三流，苦练到头可成宗师', () => {
    setState(newGame());
    expect(xiuwei(S).rank).toBe('三流');
    setState(skipToYangzhou());
    for (const id of Object.keys(S.skills)) S.skills[id]!.r = 8;
    expect(xiuwei(S).rank).toBe('宗师');
  });
  it('境界越高，修为越高', () => {
    setState(skipToYangzhou());
    const before = xiuwei(S).value;
    S.skills.xinfa!.r += 1;
    expect(xiuwei(S).value).toBeGreaterThan(before);
  });
});
