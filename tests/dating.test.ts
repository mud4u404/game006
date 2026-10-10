/**
 * 打听、交谈不再像抽签（试玩 10-10「最想关掉」第一条）：
 * - 传闻只发给该知道的人：同一地区；说的就是自家的事，不给他（管事不讲瓜洲峨眉，孙镖头不讲威远镖局）；
 * - 再问一回不再「改日再来」：先是他自己的旧话、闲话，再是他对你近来所做之事的一句，都说完了按钮灰掉，写「今日已问过」；
 * - 关键人物的交谈按交情、时辰、世事、你做过的事换话；
 * - 挑话不动世界的随机数。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { advanceDays, dayNo, setNowMs } from '../src/core/time';
import { NPCS } from '../src/content';
import { tickWorld, worldOf } from '../src/engine/shijie';
import { tickShi } from '../src/engine/shishi';
import { ask, canAsk, homeRegion, lifeOf, regionOf } from '../src/engine/chuanwen';
import { act, verbPlan, verbsOf } from '../src/engine/world';
import { npc } from '../src/content';

const T0 = 1791300000000;
const SEEDS = [0, 1, 2, 3].map(i => T0 + i * 7_777_777);

/** 一个扬州的江湖：屠千山倒了，先在扬州待几日，再去瓜洲住些日子，回扬州 */
function town(t0: number, days = 20): void {
  setNowMs(() => t0);
  setState(skipToYangzhou());
  S.flags.boss = true;
  S.quests.main1 = 3;
  S.track = '';
  S.loc = 'cheng';
  S.min = 10 * 60;
  const day = (): void => { advanceDays(S, 1); tickWorld(); tickShi(); };
  tickWorld(); tickShi();
  for (let i = 0; i < 3; i++) day();
  S.loc = 'gz_town';
  for (let i = 0; i < days; i++) day();
  S.loc = 'cheng';
}

beforeEach(() => {
  setNowMs(() => T0);
  setState(skipToYangzhou());
  S.min = 10 * 60;
});

describe('传闻发给该知道的人', () => {
  it('传闻池的话（非外地）只落在出处那一带的人耳朵里；说的是自家的事，不给他', () => {
    for (const t of SEEDS) {
      town(t);
      const w = worldOf();
      for (const n of NPCS) {
        if (!n.life) continue;
        for (const k of w.ppl[n.id]?.know ?? []) {
          const r = w.rumor[k[0]];
          if (!r || !r.ev.startsWith('news:') || r.far) continue;
          expect(homeRegion(n.id), `${n.name}（${homeRegion(n.id)}）不该听说出在${regionOf(r)}的传闻 ${r.id}`).toBe(regionOf(r));
        }
      }
    }
  });

  it('漕帮管事问了二十日，不讲瓜洲峨眉师太的事；孙镖头不讲威远镖局自家的事', () => {
    for (const t of SEEDS) {
      town(t, 6);
      for (let i = 0; i < 20; i++) {
        advanceDays(S, 1); tickWorld(); tickShi();
        S.askLog = {};
        for (const [who, bad] of [['guanshi', ['峨眉', '观音庵', '少林']], ['chuanfu', ['少林', '峨眉']], ['bj_sun', ['威远镖局']]] as const) {
          S.loc = who === 'bj_sun' ? 'biaoju' : 'dukou';
          for (let j = 0; j < 4; j++) {
            const a = ask(who);
            if (a.src === 'know') for (const b of bad) expect(a.text, `${who} 说了不相干的：${a.text}`).not.toContain(b);
          }
          S.askLog = {};
        }
      }
    }
  });
});

describe('问谁，就只问出谁知道的', () => {
  it('同一件事，知道的人说得出，不知道的人说不出，互不串话', () => {
    for (const t of SEEDS) {
      town(t, 12);
      const w = worldOf();
      S.askLog = {}; S.asked = {};
      const a = ask('guanshi', { force: true });
      if (a.src !== 'know' || !a.rumor) continue;
      const rid = a.rumor;
      // 把这件事从别人的耳朵里拿掉，只留管事一个人知道
      for (const id of Object.keys(w.ppl)) if (id !== 'guanshi') w.ppl[id].know = (w.ppl[id].know ?? []).filter(k => k[0] !== rid);
      S.heard = (S.heard ?? []).filter(x => x !== rid);
      expect((w.ppl.guanshi?.know ?? []).some(k => k[0] === rid), '知道的人手里有这一条').toBe(true);
      for (const id of ['chuanfu', 'bj_sun', 'liaochen', 'xiaoer', 'bs2_bao']) {
        S.askLog = {}; S.asked = {};
        const b = ask(id, { force: true });
        expect(b.rumor, `${id} 不该说出他没听说的传闻`).not.toBe(rid);
      }
    }
  });

  it('不同身份的人打听，各按自己知道的回答：回答的集合不是全江湖一份', () => {
    for (const t of SEEDS) {
      town(t, 12);
      const byWho = new Map<string, Set<string>>();
      for (const id of ['guanshi', 'chuanfu', 'bj_sun', 'liaochen', 'bs2_bao']) {
        S.askLog = {}; S.asked = {};
        const got = new Set<string>();
        for (let i = 0; i < 6; i++) {
          const a = ask(id, { force: true });
          if (a.src === 'know' && a.rumor) got.add(a.rumor);
        }
        byWho.set(id, got);
      }
      // 每个人说出的传闻，都得是他自己知道的
      const w = worldOf();
      for (const [id, got] of byWho) for (const r of got) {
        expect((w.ppl[id]?.know ?? []).some(k => k[0] === r), `${id} 说了他没听说的 ${r}`).toBe(true);
      }
    }
  });
});

describe('再问一回', () => {
  const EIGHT = ['guanshi', 'chuanfu', 'bj_sun', 'yunnian', 'bs2_bao', 'liaochen', 'yz_jj1', 'xiaoer'];

  it('不再说「改日再来」；一路问下去，每一句都不同；问完了是「今日已问过」', () => {
    for (const t of SEEDS) {
      town(t);
      for (const id of EIGHT) {
        const seen = new Set<string>();
        let last = ask(id);
        seen.add(last.text);
        let n = 1;
        while (last.src !== 'again' && n < 12) {
          last = ask(id); n++;
          if (last.src !== 'again') expect(seen.has(last.text), `${id} 重复了：${last.text}`).toBe(false);
          seen.add(last.text);
        }
        expect(last.src, `${id} 该有问完的时候`).toBe('again');
        for (const x of seen) expect(x).not.toContain('改日再来');
        expect(canAsk(id)).toBe(false);
      }
    }
  });

  it('第二回问到的是他自己的闲话，再往后是对你近来所做之事的一句', () => {
    town(T0);
    S.askLog = {};
    const a = ask('chuanfu'), b = ask('chuanfu');
    expect(a.src).not.toBe('again');
    expect(['idle', 'react']).toContain(b.src);
    // 关系好了，他另有一句话
    S.rel.chuanfu = '知交';
    S.askLog = {};
    const srcs = [ask('chuanfu').src, ask('chuanfu').src, ask('chuanfu').src, ask('chuanfu').src];
    expect(srcs).toContain('react');
  });

  it('问完了按钮灰掉，写「今日已问过」；点它不耗时辰；隔一日又能问', () => {
    town(T0);
    const id = 'bs2_bao';
    S.loc = 'bs2_longwang';
    const vs = () => verbsOf(npc(id)!);
    expect(vs()).toContain('打听');
    expect(verbPlan(id, '打听').ok).toBe(true);
    for (let i = 0; i < 12 && canAsk(id); i++) act(id, '打听');
    expect(canAsk(id)).toBe(false);
    const p = verbPlan(id, '打听');
    expect(p.ok).toBe(false);
    expect(p.why).toBe('今日已问过');
    const min = S.min;
    act(id, '打听');
    expect(S.min, '灰着的按钮点不动，不耗时辰').toBe(min);
    advanceDays(S, 1);
    expect(canAsk(id)).toBe(true);
    expect(verbPlan(id, '打听').ok).toBe(true);
  });

  it('选话不动世界的随机序列', () => {
    town(T0);
    const rn = S.w.rn, seed = S.w.seed;
    for (const id of ['guanshi', 'chuanfu', 'bj_sun', 'bs2_bao', 'liaochen', 'yz_jj1', 'xiaoer', 'yunnian']) {
      for (let i = 0; i < 6; i++) ask(id);
    }
    expect(S.w.rn).toBe(rn);
    expect(S.w.seed).toBe(seed);
    expect(dayNo(S)).toBeGreaterThan(0);
    expect(lifeOf('chuanfu')).toBeTruthy();
  });
});

describe('关键人物的交谈按状况换话', () => {
  /** 在这几种状况下各交谈一回，数有几种不同的话 */
  function variety(id: string, room: string, states: (() => void)[]): number {
    const texts = new Set<string>();
    for (const set of states) {
      setState(skipToYangzhou());
      S.min = 10 * 60;
      S.flags.boss = false;
      S.loc = room;
      set();
      texts.add(act(id, '交谈').text);
    }
    return texts.size;
  }
  const warm = (id: string) => () => { S.rel[id] = '知交'; };
  const boss = () => { S.flags.boss = true; S.quests.main1 = 3; };
  const night = () => { S.min = 21 * 60; };
  const early = () => { S.min = 7 * 60; };

  it('鲍四：平常、交情深、渡口一战之后、夜里，至少三种', () => {
    expect(variety('bs2_bao', 'bs2_longwang', [() => undefined, warm('bs2_bao'), boss, night])).toBeGreaterThanOrEqual(3);
  });
  it('了尘：主线之后，伤着、交情深、夜里、看过石碑，至少三种', () => {
    const done = () => { S.quests.main1 = 3; S.flags.boss = true; };
    expect(variety('liaochen', 'daming', [done, () => { done(); S.rel.liaochen = '知交'; }, () => { done(); night(); }, () => { done(); S.flags.bei = true; }])).toBeGreaterThanOrEqual(3);
  });
  it('卞老三：平常、交情深、渡口一战之后、清早，至少三种', () => {
    expect(variety('yz_jj1', 'jinshan', [() => { S.min = 9 * 60; }, () => { S.min = 9 * 60; warm('yz_jj1')(); }, () => { S.min = 9 * 60; boss(); }, early])).toBeGreaterThanOrEqual(3);
  });
  it('孙镖头：平常、交情深、渡口一战之后、清早，至少三种', () => {
    expect(variety('bj_sun', 'biaoju', [() => { S.min = 14 * 60; }, () => { S.min = 14 * 60; warm('bj_sun')(); }, () => { S.min = 14 * 60; boss(); }, early])).toBeGreaterThanOrEqual(3);
  });
});
