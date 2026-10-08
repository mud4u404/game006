/**
 * 根基之眼（engine/yan.ts）：交手以外，每种根基读到不同的东西。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { EYES, NPCS, ROOMS } from '../src/content';
import type { AttrKey } from '../src/content/types';
import { act } from '../src/engine/world';
import { eyesOn } from '../src/engine/yan';

const ATTRS: AttrKey[] = ['体魄', '根骨', '身法', '悟性', '胆魄'];

describe('根基之眼的内容', () => {
  it('挂对了地方，根基、门槛、文字都有效', () => {
    const errs: string[] = [];
    const roomIds = new Set(ROOMS.map(r => r.id)), npcIds = new Set(NPCS.map(n => n.id));
    EYES.forEach((e, i) => {
      const w = `第 ${i + 1} 条眼（${e.room ?? e.npc}，${e.attr}）`;
      if (!!e.room === !!e.npc) errs.push(`${w}：room、npc 要写一个，只写一个`);
      if (e.room && !roomIds.has(e.room)) errs.push(`${w}：地点「${e.room}」不存在`);
      if (e.npc && !npcIds.has(e.npc)) errs.push(`${w}：人物「${e.npc}」不存在`);
      if (!ATTRS.includes(e.attr)) errs.push(`${w}：根基只能是体魄、根骨、身法、悟性、胆魄`);
      if (!(Number.isInteger(e.atLeast) && e.atLeast >= 21 && e.atLeast <= 50)) errs.push(`${w}：atLeast 要是二十一到五十的整数（常人二十）`);
      if (!e.text) errs.push(`${w}：要写 text`);
      if (e.room && e.do?.length) errs.push(`${w}：挂在地点上的眼只是描写，不能带效果（效果写在人物、物件的眼上，观察时执行）`);
    });
    expect(errs, '\n' + errs.join('\n')).toEqual([]);
  });

  it('偏科的人也有自己看得出的那一层：一处至少写两种根基', () => {
    const by = new Map<string, Set<AttrKey>>();
    for (const e of EYES) {
      const k = e.room ? `地点 ${e.room}` : `人物 ${e.npc}`;
      if (!by.has(k)) by.set(k, new Set());
      by.get(k)!.add(e.attr);
    }
    const thin = [...by].filter(([, s]) => s.size < 2).map(([k, s]) => `${k} 只写了${[...s].join('')}`);
    expect(thin, '同一处的眼，至少写两种根基').toEqual([]);
  });

  it('五种根基都用上了，谁也不独大（任何一种不超过四成）', () => {
    const n = (a: AttrKey): number => EYES.filter(e => e.attr === a).length;
    for (const a of ATTRS) {
      expect(n(a), `${a}一条眼都没有`).toBeGreaterThan(0);
      expect(n(a) / EYES.length, `${a}的眼太多`).toBeLessThanOrEqual(0.4);
    }
  });
});

describe('看得出、看不出', () => {
  beforeEach(() => setState(skipToYangzhou()));

  it('后天根基够了才看得出；观察时执行看见的效果', () => {
    S.quests.main1 = 1;
    S.attr.体魄 = 20;
    expect(eyesOn({ npc: 'tu' }).some(e => e.attr === '体魄')).toBe(false);
    S.attr.体魄 = 30;
    expect(eyesOn({ npc: 'tu' }).some(e => e.attr === '体魄')).toBe(true);
    expect(S.flags.tu_scar).toBeFalsy();
    const r = act('tu', '观察');
    expect(r.eyes.some(e => e.attr === '体魄')).toBe(true);
    // 体魄好的人看得出屠千山左臂有旧伤：备战里的「知彼」就此生效，不必去问船夫
    expect(S.flags.tu_scar).toBe(true);
  });

  it('条件不成立就看不出：打败屠千山以后，渡口不再有他的破绽', () => {
    S.attr.身法 = 40;
    S.quests.main1 = 1;
    expect(eyesOn({ room: 'dukou' }).length).toBeGreaterThan(0);
    S.flags.boss = true;
    expect(eyesOn({ room: 'dukou' })).toEqual([]);
  });
});
