/**
 * 试玩第三轮（老玩家）：按钮提前说清楚，不要点了才知道。
 * - 闭关：今日有约、铁律挡住时，三个按钮提前灰掉，旁边写明为什么；
 * - 买卖：要花钱的动作，价钱写在按钮底下，钱不够的灰着。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { setNowMs } from '../src/core/time';
import { run } from '../src/engine/dsl';
import { retreatBlock } from '../src/engine/shiguang';
import { verbPoor, verbPrice } from '../src/engine/world';
import { viewJianghu } from '../src/ui/views/jianghu';
import { viewWugong } from '../src/ui/views/wugong';

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.min = 10 * 60;
});

describe('闭关按钮提前灰掉并写原因', () => {
  it('平常能闭关：没有原因，按钮亮着', () => {
    expect(retreatBlock(S)).toBeNull();
    const html = viewWugong();
    expect(html).toContain('data-act="retreat:7"');
    expect(html).not.toMatch(/data-act="retreat:\d+"[^>]*disabled/);
  });

  it('今日有约没了结：闭关三个按钮都灰着，旁边写明是谁的约', () => {
    run([{ type: 'yue', id: 't_yue', npc: 'liu', at: 'hu', inDays: 0, text: '湖畔再见' }]);
    expect(retreatBlock(S)).toContain('约着');
    const html = viewWugong();
    for (const d of ['1', '7', '30']) expect(html).toMatch(new RegExp(`data-act="retreat:${d}"[^>]*disabled`));
    expect(html).toContain('湖畔再见');
  });
});

describe('买卖按钮标价', () => {
  it('要花钱的动作取得到价钱；不花钱的没有', () => {
    expect(verbPrice('jc_yz_tiejiang', '买刀')).toBe(400);
    expect(verbPrice('jc_yz_tiejiang', '买剑')).toBe(600);
    expect(verbPrice('jc_yz_tiejiang', '交谈')).toBeNull();
  });

  it('钱不够也看得见价钱（走到的是「没钱」的回话，价钱不能因此藏起来）', () => {
    S.silver = 0;
    expect(verbPrice('jc_yz_tiejiang', '买刀')).toBe(400);
  });

  it('钱不够但还能赊账治伤的（曲蘅看诊）：按钮不灰；纯回绝的（铁匠买刀）才算买不起', () => {
    S.silver = 5;
    S.wounds = { hand: 1, foot: 0, inner: 0 };
    expect(verbPrice('smth_quheng', '看诊')).toBe(80);
    expect(verbPoor('smth_quheng', '看诊')).toBe(false);
    expect(verbPoor('jc_yz_tiejiang', '买刀')).toBe(true);
    S.silver = 1000;
    expect(verbPoor('jc_yz_tiejiang', '买刀')).toBe(false);
  });

  it('按钮上写着价钱；钱不够的灰着并写明差在哪', () => {
    S.loc = 'jc_yz_yuanmen';
    S.sel = 'jc_yz_tiejiang';
    S.silver = 1000;
    let html = viewJianghu();
    expect(html).toMatch(/data-act="do:买刀"[^>]*>买刀<small>四百文<\/small>/);
    expect(html).not.toMatch(/data-act="do:买刀"[^>]*disabled/);
    S.silver = 100;
    html = viewJianghu();
    expect(html).toMatch(/data-act="do:买刀"[^>]*disabled[^>]*>买刀<small>囊中不足，要四百文<\/small>/);
  });
});
