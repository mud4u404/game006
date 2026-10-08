/**
 * 基础设施：治伤（cure 效果、wounded 条件），医馆看伤、客栈住店、兵器铺、当铺（src/content/packs/jichu.ts）。
 * 负责人试玩：「玩家连个治病疗伤的地方都没有」。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { run, test as cond } from '../src/engine/dsl';
import { act, verbsOf } from '../src/engine/world';
import { npc } from '../src/content';

beforeEach(() => setState(skipToYangzhou()));

describe('wounded 条件', () => {
  it('任一处伤大于零为有伤；写 false 表示没伤', () => {
    expect(cond({ wounded: true })).toBe(false);
    expect(cond({ wounded: false })).toBe(true);
    S.wounds.foot = 1;
    expect(cond({ wounded: true })).toBe(true);
    expect(cond({ wounded: false })).toBe(false);
    expect(cond({ wounded: true, silver: S.silver + 1 })).toBe(false);
  });
});

describe('cure 效果', () => {
  it('不写 levels：三处伤全治好，记一条见闻', () => {
    S.wounds = { hand: 2, foot: 1, inner: 3 };
    run([{ type: 'cure' }]);
    expect(S.wounds).toEqual({ hand: 0, foot: 0, inner: 0 });
    expect(S.feed[0].t).toBe('收获');
    expect(S.feed[0].x).toContain('身上的伤都好了');
  });
  it('写了 levels：从最重的那处起，一共减这么多级（一样重先内息）', () => {
    S.wounds = { hand: 2, foot: 1, inner: 3 };
    run([{ type: 'cure', levels: 2 }]);
    expect(S.wounds).toEqual({ hand: 2, foot: 1, inner: 1 });
    expect(S.feed[0].x).toBe('治伤：内息伤轻了两级，还剩一级。');
    run([{ type: 'cure', levels: 3 }]);
    expect(S.wounds).toEqual({ hand: 0, foot: 1, inner: 0 });
  });
  it('没伤时什么也不做，也不记见闻', () => {
    const n = S.feed.length, top = S.feed[0];
    run([{ type: 'cure', levels: 1 }]);
    expect(S.wounds).toEqual({ hand: 0, foot: 0, inner: 0 });
    expect(S.feed.length).toBe(n);
    expect(S.feed[0]).toBe(top);
  });
});

describe('兵器离手', () => {
  it('手里那件兵器当掉、卖掉以后，就不再拿在手里；还剩一件时照旧', () => {
    S.items.jc_yaodao = 2;
    S.gear.weapon = 'jc_yaodao';
    run([{ type: 'item', id: 'jc_yaodao', delta: -1 }]);
    expect(S.gear.weapon).toBe('jc_yaodao');
    run([{ type: 'item', id: 'jc_yaodao', delta: -1 }]);
    expect(S.gear.weapon).toBeUndefined();
  });
});

describe('医馆看伤', () => {
  it('有伤有钱：治最重的一处一级、气血回满，收一百五十文，花半个时辰', () => {
    S.wounds = { hand: 1, foot: 0, inner: 2 };
    S.silver = 1000; S.hp = 10;
    const m = S.min;
    act('jc_yz_langzhong', '看伤');
    expect(S.silver).toBe(850);
    expect(S.wounds).toEqual({ hand: 1, foot: 0, inner: 1 });
    expect(S.hp).toBe(S.hpMax);
    expect(S.min).toBe(m + 30);
  });
  it('三处九级伤全治下来，一千三百来文', () => {
    S.wounds = { hand: 3, foot: 3, inner: 3 };
    S.silver = 5000;
    for (let i = 0; i < 12; i++) act('jc_yz_langzhong', '看伤');
    expect(S.wounds).toEqual({ hand: 0, foot: 0, inner: 0 });
    expect(5000 - S.silver).toBe(1350);
  });
  it('没钱不收钱也不治；没伤说没伤，不收钱', () => {
    S.wounds = { hand: 1, foot: 0, inner: 0 };
    S.silver = 100;
    expect(act('jc_yz_langzhong', '看伤').text).toContain('没钱就回去躺着');
    expect(S.silver).toBe(100);
    expect(S.wounds.hand).toBe(1);
    S.wounds.hand = 0; S.silver = 1000;
    expect(act('jc_yz_langzhong', '看伤').text).toContain('没伤');
    expect(S.silver).toBe(1000);
  });
  it('瓜洲钟郎中：老江的孩子头一回不收钱，全治；第二回照价收', () => {
    S.wounds = { hand: 2, foot: 1, inner: 0 };
    S.silver = 500;
    act('jc_gz_zhong', '看伤');
    expect(S.wounds).toEqual({ hand: 0, foot: 0, inner: 0 });
    expect(S.silver).toBe(500);
    S.wounds.foot = 1;
    act('jc_gz_zhong', '看伤');
    expect(S.silver).toBe(380);
    expect(S.wounds.foot).toBe(0);
  });
});

describe('客栈住店', () => {
  it('一百文一宿，睡到次日卯时，气血内力回满，最重的伤缓一级', () => {
    S.wounds = { hand: 1, foot: 0, inner: 2 };
    S.silver = 300; S.hp = 10; S.mp = 0;
    const day = S.day;
    act('jc_yz_ruanniang', '住店');
    expect(S.silver).toBe(200);
    expect([S.day, S.min]).toEqual([day + 1, 6 * 60]);
    expect([S.hp, S.mp]).toEqual([S.hpMax, S.mpMax]);
    expect(S.wounds).toEqual({ hand: 1, foot: 0, inner: 1 });
  });
  it('后半夜投店睡到当天天亮；卯时前后进门的，也不会才躺下就天亮', () => {
    S.silver = 1000;
    const day = S.day;
    S.min = 3 * 60;
    act('jc_yz_ruanniang', '住店');
    expect([S.day, S.min]).toEqual([day, 6 * 60]);
    act('jc_yz_ruanniang', '住店');
    expect([S.day, S.min]).toEqual([day + 1, 6 * 60]);
    S.min = 5 * 60 + 30;
    act('jc_yz_ruanniang', '住店');
    expect([S.day, S.min]).toEqual([day + 2, 6 * 60]);
  });
  it('没钱住不成，也不会白白睡过去一夜', () => {
    S.silver = 99;
    const [day, min] = [S.day, S.min];
    expect(act('jc_yz_ruanniang', '住店').text).toContain('少一文也不成');
    expect(S.silver).toBe(99);
    expect([S.day, S.min]).toEqual([day, min + 10]);
  });
  it('镇江鲍掌柜：在大市口顶过兵爷的，头一宿不要钱', () => {
    S.flags.zj_chutou = true;
    S.silver = 0;
    act('jc_zj_bao', '住店');
    expect(S.min).toBe(6 * 60);
    expect(S.flags.jc_zj_mianfei).toBe(true);
    S.silver = 100;
    act('jc_zj_bao', '住店');
    expect(S.silver).toBe(0);
  });
});

describe('兵器铺与当铺', () => {
  it('买兵器：扣钱给兵器；已经有一件的不重复卖', () => {
    S.silver = 1000;
    act('jc_yz_tiejiang', '买棍');
    expect(S.silver).toBe(700);
    expect(S.items.jc_qimeigun).toBe(1);
    act('jc_yz_tiejiang', '买棍');
    expect(S.silver).toBe(700);
    expect(S.items.jc_qimeigun).toBe(1);
  });
  it('典当：当铺自动有「典当」；当掉屠千山的刀换一千二百文（买价三千文的四成）', () => {
    expect(verbsOf(npc('jc_yz_chaofeng')!)).toContain('典当');
    S.items.blade = 1;
    const s0 = S.silver;
    act('jc_yz_chaofeng', '典当', 'blade');
    expect(S.silver).toBe(s0 + 1200);
    expect(S.items.blade).toBe(0);
  });
  it('当铺的价钱是买价的三到五成，买了再当只会亏', () => {
    S.silver = 10000;
    const PAIRS = [['买刀', 'jc_yaodao'], ['买剑', 'jc_songwen'], ['买枪', 'jc_huaqiang']] as const;
    for (const [buy, item] of PAIRS) {
      for (const smith of ['jc_yz_tiejiang', 'jc_zj_tang']) {
        for (const shop of ['jc_yz_chaofeng', 'jc_zj_nie']) {
          const a = S.silver;
          act(smith, buy);
          const cost = a - S.silver;
          expect(S.items[item]).toBe(1);
          delete S.gear.weapon;
          act(shop, '典当', item);
          const back = S.silver - (a - cost);
          expect(S.items[item], `${shop} 收下了 ${item}`).toBe(0);
          expect(back / cost, `${smith} 卖、${shop} 当：${item}`).toBeGreaterThanOrEqual(0.3);
          expect(back / cost, `${smith} 卖、${shop} 当：${item}`).toBeLessThanOrEqual(0.5);
        }
      }
    }
  });
});
