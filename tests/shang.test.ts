/**
 * 伤（负责人 10-09）：「你打比你弱的人，赢了，就不应该有很多伤……就算伤了，轻伤它应该会自己慢慢愈合，重伤需要找人医治或者服药。」
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { advanceMin, setNowMs } from '../src/core/time';
import { foeById } from '../src/content';
import { takeWounds } from '../src/engine/jiesuan';
import { capWounds, healLight, woundCap } from '../src/engine/shang';
import { checkYue, jingxiu } from '../src/engine/shiguang';
import { useBlock, useItem } from '../src/engine/daoju';
import { itemById } from '../src/content';
import { act } from '../src/engine/world';

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.min = 10 * 60;
});

describe('落伤看强弱', () => {
  it('打赢了：远不如你的不落伤，稍逊的最多一级，相当的最多两级；比你强的、打输的不封顶', () => {
    expect(woundCap('win', 0.9)).toBe(0);
    expect(woundCap('win', 0.6)).toBe(1);
    expect(woundCap('win', 0.5)).toBe(2);
    expect(woundCap('win', 0.3)).toBe(Infinity);
    // 打输了也按强弱封顶（docs/sheji-s5-s6.md S6）：本该赢的失了手最多两级，相近的三级，差得远的四级；逃跑两级；输了差事一级
    expect(woundCap('lose', 0.9)).toBe(2);
    expect(woundCap('lose', 0.4)).toBe(3);
    expect(woundCap('lose', 0.1)).toBe(4);
    expect(woundCap('lose')).toBe(4);
    expect(woundCap('flee', 0.1)).toBe(2);
    expect(woundCap('lose', 0.1, true)).toBe(1);
    expect(capWounds({ hand: 1, inner: 2 }, 1)).toEqual({ inner: 1 });
  });

  it('同样挨了三级重招，打赢弱的不落伤，打输了落伤，但最多两级', () => {
    const f = foeById('xs_hezei')!;
    takeWounds(f, { hand: 2, inner: 1 }, 'win', 0.9);
    expect(S.wounds).toEqual({ hand: 0, foot: 0, inner: 0 });
    takeWounds(f, { hand: 2, inner: 1 }, 'lose', 0.9);
    expect(S.wounds).toEqual({ hand: 2, foot: 0, inner: 0 });
  });
});

describe('轻伤自己好，重伤要医要药', () => {
  it('一级的伤过一日自己好；二级的不会自己好', () => {
    const f = foeById('xs_hezei')!;
    takeWounds(f, { hand: 1, inner: 2 }, 'lose');
    advanceMin(S, 20 * 60);
    checkYue(S);
    expect(S.wounds.hand).toBe(1);
    advanceMin(S, 5 * 60);
    checkYue(S);
    expect(S.wounds).toEqual({ hand: 0, foot: 0, inner: 2 });
    advanceMin(S, 10 * 1440);
    healLight(S);
    expect(S.wounds.inner).toBe(2);
  });

  it('闭关只养得好轻伤：重伤闭关七日照旧，出关说清去哪儿治', () => {
    S.wounds = { hand: 1, foot: 0, inner: 2 };
    S.silver = 2000;
    const r = jingxiu(S, 7, () => 0.99);
    expect(r.healed).toEqual({ hand: 1 });
    expect(S.wounds).toEqual({ hand: 0, foot: 0, inner: 2 });
  });

  it('内伤药治内息的重伤，一服轻一级；轻到一级以后过一日自己好。没伤的那处，药不让白吃', () => {
    S.wounds = { hand: 0, foot: 0, inner: 2 };
    S.items.neishang = 1;
    S.items.dieda = 1;
    expect(useBlock(itemById('dieda')!)).toContain('没有伤');
    expect(useItem('neishang').ok).toBe(true);
    expect(S.wounds.inner).toBe(1);
    advanceMin(S, 1441);
    checkYue(S);
    expect(S.wounds.inner).toBe(0);
  });

  it('药铺买得到跌打酒、内伤药；郎中看伤一次轻一级', () => {
    S.loc = 'cheng';
    S.silver = 500;
    act('yaopu', '买跌打酒');
    act('yaopu', '买内伤药');
    expect([S.items.dieda, S.items.neishang]).toEqual([1, 1]);
    expect(S.silver).toBe(500 - 60 - 80);
  });
});
