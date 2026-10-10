/**
 * 迎面（engine/yingmian.ts，docs/sheji-youhua-1010.md 第五条）：进场景有人先开口，要适当。
 * 一人一日一次、同场景一次一个人、条件不成立不开口、不动世界的随机数。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { advanceDays, advanceMin, dayNo, setNowMs } from '../src/core/time';
import { NPCS, npc } from '../src/content';
import type { GreetDef } from '../src/content/types';
import { greetNow, refreshGreet, takeTopic } from '../src/engine/yingmian';
import { act } from '../src/engine/world';
import { worldRng } from '../src/engine/shijie';
import { viewJianghu } from '../src/ui/views/jianghu';

/** 画一回场景之前的挑人，再看谁开口（ui/shell.ts 的 render 就是这个顺序） */
const look = (): ReturnType<typeof greetNow> => { refreshGreet(); return greetNow(); };

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.loc = 'daming'; S.min = 9 * 60;
});
afterEach(() => { setNowMs(() => Date.now()); });

describe('迎面', () => {
  it('进场景有人开口，江湖页场景区最上面有这张卡', () => {
    const g = look();
    expect(g?.id).toBe('liaochen');
    expect(g?.topic.length).toBeGreaterThan(0);
    const html = viewJianghu();
    expect(html).toContain('class="card greet"');
    expect(html).toContain('data-act="greet"');
    expect(html.indexOf('card greet')).toBeLessThan(html.indexOf('card scene'));
  });

  it('界面只读：画江湖页不改存档', () => {
    refreshGreet();
    S.sel = 'liaochen';
    const before = structuredClone(S);
    viewJianghu();
    expect(S).toEqual(before);
  });

  it('重画不换人；点了话头走现有动作（交谈），卡片收起', () => {
    const a = look();
    expect(look()).toEqual(a);
    const t = takeTopic();
    expect(t).toEqual({ id: 'liaochen', verb: '交谈' });
    expect(act(t!.id, t!.verb).text).toContain('了尘大师');
    expect(look()).toBeUndefined();
  });

  it('话头可以指定别的动作', () => {
    // 渡口事了、没调息过、主线还在第二步：只有邀进禅房这一条成立，点话头走「请教」
    S.flags.boss = true; S.quests.main1 = 2;
    expect(look()?.go).toBe('请教');
    expect(takeTopic()).toEqual({ id: 'liaochen', verb: '请教' });
  });

  it('同一个人一个江湖日最多主动一次，换了日子再开口', () => {
    expect(look()?.id).toBe('liaochen');
    takeTopic();
    advanceMin(S, 180);
    expect(look()).toBeUndefined();
    advanceMin(S, 180);
    expect(look()).toBeUndefined();
    advanceDays(S, 1);
    S.min = 9 * 60;
    expect(look()?.id).toBe('liaochen');
  });

  it('同场景一次只一个人开口：先看刚来往过的，下一个时辰段再轮到另一位', () => {
    const lines: GreetDef[] = [{ text: '知客僧合十道：「施主请用茶。」', topic: '领茶' }];
    const zhike = npc('zhike')!;
    zhike.greet = lines;
    try {
      S.lastWith = { id: 'zhike', day: dayNo(S) };
      const first = look();
      expect(first?.id).toBe('zhike');
      // 同一个时辰段里不再挑第二个人
      expect(look()?.id).toBe('zhike');
      takeTopic();
      expect(look()).toBeUndefined();
      // 过了一个时辰段，没开过口的了尘开口；知客僧今日已招呼，不再开
      advanceMin(S, 130);
      expect(look()?.id).toBe('liaochen');
    } finally { delete zhike.greet; }
  });

  it('条件不满足就不开口', () => {
    S.quests.main1 = 2;
    expect(look()).toBeUndefined();
    expect(viewJianghu()).not.toContain('card greet');
    // 没有迎面的人也不开口
    S.loc = 'hu';
    expect(look()?.id).not.toBe('liaochen');
  });

  it('不动世界的随机数：开口前后世界状态、随机序列一字不差', () => {
    const w = structuredClone(S.w);
    const probe = (): number => { const c = structuredClone(S.w); const r = worldRng(); S.w = c; return r; };
    const before = probe();
    look(); takeTopic(); advanceMin(S, 130); look();
    expect(S.w.rn).toBe(w.rn);
    expect(S.w.seed).toBe(w.seed);
    expect(probe()).toBe(before);
  });

  it('同一个世界、同一日、同一时辰段，挑出同一条', () => {
    S.flags.boss = true; S.quests.main1 = 3;
    const a = look();
    S.greet = undefined; S.greeted = {};
    expect(look()).toEqual(a);
  });

  it('旧档没有这些字段也能读：缺省即可', () => {
    delete S.greeted; delete S.greet; delete S.lastWith;
    expect(() => look()).not.toThrow();
    expect(look()?.id).toBe('liaochen');
  });

  it('序章里不开口（卡片只在江湖里）', () => {
    S.chapter = 0;
    expect(viewJianghu()).not.toContain('card greet');
  });
});

describe('迎面的内容', () => {
  const TEN: Record<string, number[]> = {
    liaochen: [2, 4], bs2_bao: [2, 4], ss_jiaowu: [2, 4], ss_aqi: [2, 4], jc_yz_ruanniang: [2, 4],
    shuoshu: [2, 4], kp_wei: [2, 4], kp_chu: [2, 4], fuya_zhou: [2, 4], xsb_zhuren: [2, 4]
  };
  it('十个人各二到四条', () => {
    for (const [id, [lo, hi]] of Object.entries(TEN)) {
      const n = npc(id)?.greet?.length ?? 0;
      expect(n, id).toBeGreaterThanOrEqual(lo);
      expect(n, id).toBeLessThanOrEqual(hi);
    }
  });
  it('每条都有话有话头，动作是这个人的动作（交谈、打听之类现有的）', () => {
    for (const n of NPCS) {
      for (const g of n.greet ?? []) {
        expect(g.text.length, n.id).toBeGreaterThan(10);
        expect(g.topic.length, n.id).toBeLessThanOrEqual(8);
        if (g.go) {
          const verbs = n.verbs.map(v => (typeof v === 'string' ? v : v.verb));
          expect(verbs.includes(g.go) || (g.go === '打听' && verbs.includes('交谈')), `${n.id}:${g.go}`).toBe(true);
        }
      }
    }
  });
});
