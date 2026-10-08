/**
 * 武学库的平衡目标。改动品级系数、火候、克制、修为的规则时，这些测试保证大方向不跑偏。
 * 设计说明见 docs/wuxue.md。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { S, newGame, setState, skipToYangzhou } from '../src/core/state';
import { skillById } from '../src/content';
import type { SkillDef } from '../src/content/types';
import { FOES } from '../src/content';
import { Duel, type Opt } from '../src/engine/duel';
import { RESP_ACT, huohou } from '../src/engine/formulas';
import { activeOuter, autoSlot, counterBonus, defaultLoadout, reachBonus, respSkill, skillPower, xiuwei } from '../src/engine/wuxue';
import { fightKit, foeSpec, heroSpec } from '../src/engine/zhaoshi';
import { huohouOf } from '../src/engine/person';
import type { FoeDef } from '../src/content/types';

/** 对屠千山（或换个性质）出一记重招时，各种应对的选项 */
function opts(nature?: FoeDef['nature']): (Opt & { sname: string })[] {
  const tu = { ...FOES.find(f => f.id === 'tu')!, nature };
  const d = new Duel(heroSpec(S, fightKit(S), tu), foeSpec(tu, []), { rng: () => 0.5 });
  return d.options(d.tells[0]).map(o => ({ ...o, sname: respSkill(S, o.k)?.name ?? RESP_ACT[o.k] }));
}

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
    const plain = opts(undefined).find(o => o.k === 'parry')!;
    const vsHard = opts('刚').find(o => o.k === 'parry')!;
    expect(vsHard.raw - plain.raw).toBeCloseTo(0.08);
  });
});

describe('搭配', () => {
  beforeEach(() => setState(skipToYangzhou()));

  it('老存档按已学武功排出与原来一样的组合', () => {
    // 改版前跳过序章的存档：学过惊鸿剑
    const old = { hanjiang: { r: 1, p: 340 }, jinghong: { r: 0, p: 80 }, taxue: { r: 2, p: 120 }, xinfa: { r: 1, p: 260 }, duanshui: { r: 0, p: 10 } };
    // 寒江剑法和惊鸿剑都是剑法，只有一个兵刃位：功力高的寒江剑法留下
    expect(defaultLoadout(old)).toEqual({ neigong: 'xinfa', qinggong: 'taxue', weapon: 'hanjiang', ult: 'duanshui' });
    expect(defaultLoadout(newGame().skills)).toEqual({ neigong: 'xinfa', qinggong: 'taxue', weapon: 'hanjiang' });
  });

  it('火候：硬接看内功和根骨，闪避看轻功和身法，拆招看出手的外功和悟性，抢攻看出手的外功和胆魄', () => {
    const base = { ...huohouOf({ name: '', attr: { 体魄: 20, 根骨: 20, 身法: 20, 悟性: 20, 胆魄: 20 }, outer: 1, neigong: 1, qinggong: 1, grade: { outer: 1, neigong: 1, qinggong: 1 }, gongli: 1.5 }) };
    expect(base.block).toBe(base.dodge);
    expect(base.rush).toBe(base.parry - 10);
    const h0 = huohou(S, 'block');
    S.skills.xinfa!.r += 2;
    expect(huohou(S, 'block')).toBeGreaterThan(h0 + 10);
    expect(huohou(S, 'parry')).toBe(huohou(skipToYangzhou(), 'parry'));
  });

  it('剑在手里，兵刃位的剑法出手；剑不在手里，换拳脚位的功夫；两样都没有，就没有拆招和抢攻', () => {
    const who = (): string[] => opts().filter(o => o.k === 'parry' || o.k === 'rush').map(o => o.sname);
    expect(activeOuter(S)?.id).toBe('hanjiang');
    expect(who()).toEqual(['寒江剑法', '寒江剑法']);
    S.skills.jh_bagua = { r: 0, p: 0 };
    S.loadout.fist = 'jh_bagua';
    expect(who()).toEqual(['寒江剑法', '寒江剑法']);
    delete S.gear.weapon;
    expect(activeOuter(S)?.id).toBe('jh_bagua');
    expect(who()).toEqual(['八卦掌', '八卦掌']);
    delete S.loadout.fist;
    expect(opts().map(o => o.k)).toEqual(['block', 'dodge']);
  });

  it('兵刃位换成别的剑法，出手的就是它', () => {
    S.skills.jinghong = { r: 0, p: 0 };
    S.loadout.weapon = 'jinghong';
    const o = opts().find(x => x.k === 'rush')!;
    expect(o.sname).toBe('惊鸿剑');
    expect(respSkill(S, 'rush')?.id).toBe('jinghong');
  });

  it('学会新武功时，对应的位置空着才自动放进去；占着的不动', () => {
    setState(newGame());
    autoSlot(S, skillById('jinghong')!);
    expect(S.loadout.weapon).toBe('hanjiang');
    autoSlot(S, skillById('jh_bagua')!);
    expect(S.loadout.fist).toBe('jh_bagua');
    autoSlot(S, skillById('duanshui')!);
    expect(S.loadout.ult).toBe('duanshui');
  });

});

describe('修为', () => {
  it('新人不入流；家传武功练到头是绝顶，再有江湖上得来的武功才成宗师', () => {
    setState(newGame());
    expect(xiuwei(S).rank).toBe('不入流');
    setState(skipToYangzhou());
    for (const id of Object.keys(S.skills)) S.skills[id]!.r = 8;
    expect(xiuwei(S).rank).toBe('绝顶');
    S.skills.jh_bagua = { r: 8, p: 0 };
    S.loadout.fist = 'jh_bagua';
    expect(xiuwei(S).rank).toBe('宗师');
  });
  it('境界越高，修为越高', () => {
    setState(skipToYangzhou());
    const before = xiuwei(S).value;
    S.skills.xinfa!.r += 1;
    expect(xiuwei(S).value).toBeGreaterThan(before);
  });
});
