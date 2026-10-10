/**
 * 东关街的成衣铺（Issue #369）：
 * - zhuangbei.ts 那十五件冠、衣、靴、佩、饰，在这里一件都买得到，别漏；
 * - 买下穿上以后，身上的数值就是这一件自己写的那些，不多不少；
 * - 钱不够的那一支不成立：不给东西，也不扣钱。
 *
 * 不写死十五个 id：直接遍历 items 里 zb_ 开头的那些，zhuangbei.ts 添一件，这里就得跟上。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { S, newGame, setState } from '../src/core/state';
import { setNowMs } from '../src/core/time';
import { ITEMS, npc, room } from '../src/content';
import type { AttrKey, Effect } from '../src/content/types';
import { newOutcome, run, test as cond } from '../src/engine/dsl';
import { gearBonus, keyOfSlot } from '../src/engine/zhuangbei';
import { wear } from '../src/engine/daoju';
import { roomNpcs } from '../src/engine/world';

const SHOP = 'jc_yz_xue';
const SHOP_ROOM = 'yzcy_chengyipu';
// 注意 zb_ 前缀不止衣饰：走镖那边 zb_huadiao（陈年花雕）也是这个前缀。所以按「有 equip、
// 槽位在冠衣靴佩饰里」挑，才正好是 zhuangbei.ts 那十五件。
const 衣饰位 = ['冠', '衣', '靴', '佩', '饰'] as const;
const 衣饰 = ITEMS.filter(i => i.id.startsWith('zb_') && i.equip && 衣饰位.includes(i.equip.slot as never));

beforeEach(() => setNowMs(() => 1_700_000_000_000));

/** 掌柜哪个动作下的哪一支，是真给这件东西的 */
function grantBranch(id: string): { verb: string; if: unknown; do: Effect[] } | null {
  const n = npc(SHOP);
  expect(n, `成衣铺掌柜 ${SHOP} 不见了`).toBeTruthy();
  for (const [verb, branches] of Object.entries(n!.actions)) {
    for (const b of branches ?? []) {
      if (b.do && JSON.stringify(b.do).includes(`"${id}"`)) return { verb, if: b.if, do: b.do };
    }
  }
  return null;
}

/** 那个动作下不成交的兜底支（报个价、劝一句），有几条 */
const fallbacks = (verb: string): number => (npc(SHOP)!.actions[verb] ?? []).filter(b => !b.do).length;

describe('东关街成衣铺：十五件衣饰都有处买', () => {
  it('zhuangbei.ts 里的每件衣饰，掌柜都有一个分支卖它', () => {
    expect(衣饰.length, 'zhuangbei.ts 里的 zb_ 物品一件都没找到').toBe(15);
    const 漏: string[] = [];
    for (const it of 衣饰) if (!grantBranch(it.id)) 漏.push(`${it.id} ${it.name}`);
    expect(漏, `这些买不到：${漏.join('、')}`).toEqual([]);
  });

  it('每一支都卡「钱够」，而且都留了不成交的兜底', () => {
    for (const it of 衣饰) {
      const h = grantBranch(it.id)!;
      expect(h.if, `${it.name} 那一支不卡条件`).toBeTruthy();
      setState(newGame());
      S.silver = it.price! - 1;
      expect(cond(h.if as never), `${it.name} 差一文还成立，白拿`).toBe(false);
      expect(fallbacks(h.verb), `${h.verb} 没有不成交的兜底那一支`).toBeGreaterThan(0);
    }
  });

  it('钱够了才成交：钱够买得到，钱不够既不给东西也不扣钱', () => {
    for (const it of 衣饰) {
      const h = grantBranch(it.id)!;

      setState(newGame());
      S.silver = it.price! - 1;
      expect(cond(h.if as never), `${it.name} 钱不够还成立`).toBe(false);
      // 条件不成立，界面上落到不成交的兜底支：那一支没有 do，钱和行囊都不动
      run([], newOutcome());
      expect(S.items[it.id] ?? 0, `${it.name} 钱不够也到手了`).toBe(0);
      expect(S.silver, `${it.name} 钱不够也扣钱了`).toBe(it.price! - 1);

      setState(newGame());
      S.silver = it.price!;
      expect(cond(h.if as never), `${it.name} 钱够了还不成立`).toBe(true);
      run(h.do, newOutcome());
      expect(S.items[it.id], `${it.name} 钱够了没买到`).toBe(1);
      expect(S.silver, `${it.name} 扣的钱对不上`).toBe(0);
    }
  });

  it('买一件、穿上，身上的数值就是这一件写的那些，不多不少', () => {
    for (const it of 衣饰) {
      const st = it.equip!.stats!;
      setState(newGame());
      S.gear = {};
      S.silver = 100_000;
      run(grantBranch(it.id)!.do, newOutcome());
      expect(S.items[it.id], `${it.name} 没到手`).toBe(1);
      expect(S.silver, `${it.name} 扣的钱对不上`).toBe(100_000 - it.price!);

      expect(wear(keyOfSlot(it.equip!.slot), it.id), `${it.name} 穿不上`).toBeNull();
      const g = gearBonus(S);
      expect(g.huti, `${it.name} 的护体`).toBe(st.huti ?? 0);
      expect(g.shanbi, `${it.name} 的闪避`).toBe(st.shanbi ?? 0);
      expect(g.neili, `${it.name} 的内力`).toBe(st.neili ?? 0);
      for (const [k, v] of Object.entries(st.attr ?? {}) as [AttrKey, number][]) {
        expect(g.attr?.[k] ?? 0, `${it.name} 的${k}`).toBe(v);
      }
    }
  });

  it('铺子开在东关街边，只一扇门通街上；掌柜一个人守着', () => {
    const r = room(SHOP_ROOM);
    expect(r, `成衣铺 ${SHOP_ROOM} 不见了`).toBeTruthy();
    expect(r!.area).toContain('扬州城');
    expect(r!.region).toBe('yz');
    expect(r!.nightQuiet).toBe(true);
    expect(r!.desc!.length, '得有一句夜景').toBeGreaterThan(1);
    // 只通东关街一处：回程出口引擎自动补，不写
    expect(r!.exits!.map(e => e[1]), '成衣铺只该通东关街').toEqual(['cheng']);
    // 挨着东关街（[50, 86]），不压别的地点
    expect(Math.abs(r!.map![0] - 50) + Math.abs(r!.map![1] - 86)).toBeLessThan(20);
    // 一处最多五人
    expect(roomNpcs(SHOP_ROOM).length, '这铺子里挤了太多人').toBeLessThanOrEqual(5);
  });
});