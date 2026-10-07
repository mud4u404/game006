import { beforeEach, describe, expect, it } from 'vitest';
import { S, newGame, setState, skipToYangzhou } from '../src/core/state';
import { cn, cleanName, fmt, liang } from '../src/core/util';
import { dayName, minLabel, shichen } from '../src/core/time';
import { run, test as cond } from '../src/engine/dsl';
import { act, curQuest, hopMin, pathMin, pathTo, roomNpcs } from '../src/engine/world';
import { cheng, huohou, odds, respOptions } from '../src/engine/formulas';

describe('文字与时间', () => {
  it('中文数字', () => {
    expect(cn(0)).toBe('零');
    expect(cn(12)).toBe('十二');
    expect(cn(30)).toBe('三十');
    expect(liang(2)).toBe('两');
  });
  it('时辰与日子', () => {
    expect(shichen(7 * 60 + 40)).toBe('辰时');
    expect(shichen(23 * 60 + 30)).toBe('子时');
    expect(dayName(7)).toBe('初七');
    expect(dayName(10)).toBe('初十');
    expect(dayName(21)).toBe('廿一');
  });
  it('赶路耗时', () => {
    expect(minLabel(10)).toBe('片刻');
    expect(minLabel(30)).toBe('两刻');
    expect(minLabel(45)).toBe('三刻');
  });
  it('占位符与名字清理', () => {
    expect(fmt('{given}，去吧', { given: '孤舟' })).toBe('孤舟，去吧');
    expect(fmt('{unknown}', {})).toBe('{unknown}');
    expect(cleanName('<b>听雨</b>')).toBe('b听雨b');
    expect(cleanName('寒江孤影剑')).toBe('寒江孤影');
  });
});

describe('世界', () => {
  beforeEach(() => setState(skipToYangzhou()));
  it('寻路经过湖畔', () => {
    expect(pathTo('daming', 'dukou')).toEqual(['hu', 'dukou']);
    expect(pathTo('hu', 'hu')).toEqual([]);
    expect(hopMin('hu', 'daming')).toBe(30);
    expect(pathMin('jinshan', 'daming')).toBe(40);
    expect(pathTo('hu', 'gz_home')).toEqual([]);
  });
  it('屠千山只在接到任务后出现在渡口', () => {
    expect(roomNpcs('dukou')).not.toContain('tu');
    S.quests.main1 = 1;
    expect(roomNpcs('dukou')).toContain('tu');
    S.flags.boss = true;
    expect(roomNpcs('dukou')).not.toContain('tu');
  });
  it('了尘大师推进主线', () => {
    S.loc = 'daming';
    const { text } = act('liaochen', '交谈');
    expect(text).toContain('屠千山');
    expect(S.quests.main1).toBe(1);
    expect(curQuest()?.to).toBe('dukou');
  });
  it('买东西扣钱，钱不够时拒绝', () => {
    S.silver = 25;
    act('yaopu', '购买');
    expect(S.silver).toBe(5);
    expect(S.items.jcy).toBe(4);
    const { text } = act('yaopu', '购买');
    expect(text).toContain('一文都不能少');
  });
  it('请教棋痴：没学过惊鸿剑时习得', () => {
    delete S.skills.jinghong;
    act('qichi', '请教');
    expect(S.skills.jinghong).toEqual({ r: 0, p: 120 });
  });
});

describe('条件与效果', () => {
  beforeEach(() => setState(newGame()));
  it('任务条件', () => {
    expect(cond({ quest: { id: 'prologue', is: 0 } })).toBe(true);
    expect(cond({ quest: { id: 'prologue', atLeast: 1 } })).toBe(false);
    expect(cond({ quest: { id: 'main1', below: 1 } })).toBe(true);
  });
  it('时间设到更早的时刻会跨到第二天', () => {
    run([{ type: 'time', set: 9 * 60 }]);
    expect(S.day).toBe(6);
    expect(S.min).toBe(9 * 60);
  });
  it('银两不会变成负数', () => {
    run([{ type: 'silver', delta: -999 }]);
    expect(S.silver).toBe(0);
  });
  it('关系只在 from 范围内才改', () => {
    run([{ type: 'rel', npc: 'liu', value: '点头之交', from: ['素不相识'] }]);
    expect(S.rel.liu).toBe('点头之交');
    run([{ type: 'rel', npc: 'liu', value: '相谈甚欢', from: ['素不相识'] }]);
    expect(S.rel.liu).toBe('点头之交');
  });
  it('属性、侠义、恶名、时辰条件', () => {
    expect(cond({ attr: { key: '体魄', atLeast: 13 } })).toBe(true);
    expect(cond({ attr: { key: '体魄', atLeast: 14 } })).toBe(false);
    run([{ type: 'eming', delta: 5 }]);
    expect(cond({ eming: 5 })).toBe(true);
    expect(cond({ xia: 1 })).toBe(false);
    S.min = 22 * 60;
    expect(cond({ hour: { from: 19, to: 5 } })).toBe(true);
    S.min = 3 * 60;
    expect(cond({ hour: { from: 19, to: 5 } })).toBe(true);
    S.min = 12 * 60;
    expect(cond({ hour: { from: 19, to: 5 } })).toBe(false);
    expect(cond({ hour: { from: 9, to: 17 } })).toBe(true);
  });
  it('序章：江伯 → 抓药 → 入夜', () => {
    act('jiangbo', '交谈');
    expect(S.quests.prologue).toBe(1);
    act('huichun', '抓药');
    expect(S.quests.prologue).toBe(2);
    expect(S.weather).toBe('大雨');
    expect(roomNpcs('gz_home')).not.toContain('jiangbo');
  });
});

describe('见招拆招成算', () => {
  beforeEach(() => setState(skipToYangzhou()));
  it('限制在一成到九成半之间', () => {
    expect(odds('dodge', 100, 0)).toBe(0.95);
    expect(odds('block', 0, 100)).toBe(0.05);
    expect(odds('rush', 20, 20)).toBeCloseTo(0.35);
    expect(cheng(0.2)).toBe('两成');
  });
  it('火候由境界和属性决定', () => {
    expect(huohou(S, 'dodge')).toBe(2 * 10 + 16);
    expect(huohou(S, 'parry')).toBe(1 * 10 + 15);
  });
  it('没学会的武功不会出现在应对里；内力不够时硬接不可选', () => {
    delete S.skills.jinghong;
    S.mp = 50;
    const opts = respOptions(S, { li: 30, su: 30, qiao: 30, xi: 30 });
    expect(opts.map(o => o.k)).toEqual(['block', 'dodge', 'parry']);
    expect(opts.find(o => o.k === 'block')?.dis).toBe(true);
  });
});

describe('内容包合并', () => {
  it('自动补回程出口，按 at 放人物', async () => {
    const { mergePacks } = await import('../src/content');
    const reg = mergePacks([
      { rooms: [
        { id: 'a', name: 'A', area: '', region: 'x', t: 0, map: [50, 50], desc: '', npcs: [], exits: [] },
        { id: 'b', name: 'B', area: '', region: 'x', t: 5, map: [50, 20], desc: '', npcs: [], exits: [['南', 'a', '北']] }
      ] },
      { npcs: [
        { id: 'n1', name: '甲', ini: '甲', tone: 'gray', brief: '', look: '', verbs: ['观察'], actions: {}, at: { room: 'a' } },
        { id: 'o1', name: '碑', obj: true, icon: 'stele', brief: '', look: '', verbs: ['观察'], actions: {}, at: { room: 'b', if: { flag: 'f' } } }
      ] }
    ]);
    const a = reg.ROOMS.find(r => r.id === 'a')!, b = reg.ROOMS.find(r => r.id === 'b')!;
    expect(a.exits).toEqual([['北', 'b']]);
    expect(a.npcs).toEqual(['n1']);
    expect(b.objs).toEqual([{ id: 'o1', if: { flag: 'f' } }]);
  });
});
