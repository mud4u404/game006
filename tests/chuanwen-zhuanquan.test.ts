/**
 * 传闻不转圈（10-10 老玩家第二次试玩）：
 * - 玩家听过的传闻，不再从别人嘴里原样再听一遍（意思相同的也算）；实在没有新的，说「这事你已经听说了」；
 * - 传闻栏里意思相同的只显示一条，标「几处都在传」；
 * - 手头有差事，这人知道的里头和差事沾边的先说；
 * - 「听某某说的」，某某不在场就写「听人说」。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { dayNo, setNowMs } from '../src/core/time';
import { NEWS, npc } from '../src/content';
import { worldOf } from '../src/engine/shijie';
import { roomNpcs } from '../src/engine/world';
import { ALREADY, ask, dedupeFeed, gangOf, learn, lifeOf, newsId, sameMeaning, sameTopic, type RumorInst } from '../src/engine/chuanwen';

const T0 = 1791300000000;
const HONGHUO_A = '城南的威远镖局接了一趟往云南的红货，正四处招募镖师。';
const HONGHUO_B = '威远镖局要往云南走一趟红货，茶馆里都说，赵家这趟买卖不小。';
const XIAOSHUAN = '布庄的学徒小栓失踪前，他舅舅来过一趟。掌柜的逢人便念叨这孩子。';
const BIAOSHI = '威远镖局新收了个镖师，听说是赵少镖头在望江楼斗酒斗来的。';

beforeEach(() => {
  setNowMs(() => T0);
  setState(skipToYangzhou());
  S.min = 20 * 60;
  S.loc = 'cheng_tavern';
});

/** 凭空放一条传闻池的传闻，并让这几个人知道（juice 够大，谁都肯说） */
function seed(text: string, who: string[], juice = 0.5, from?: string): string {
  expect(NEWS.some(n => n.text === text), `内容里没有这句：${text}`).toBe(true);
  const w = worldOf(), id = newsId(text), day = dayNo(S);
  const r: RumorInst = { id, ev: id, ph: '', day, place: '', juice, subj: [] };
  w.rumor[id] = r;
  for (const x of who) learn(w, x, id, 0, day, from);
  return id;
}
const livePeople = (): string[] => roomNpcs('cheng_tavern', S.min).filter(id => lifeOf(id) && !npc(id)?.obj);

describe('意思相同', () => {
  it('红货那两句是一回事，招镖师和斗酒不是', () => {
    expect(sameMeaning(HONGHUO_A, HONGHUO_B)).toBe(true);
    expect(sameMeaning(HONGHUO_A, XIAOSHUAN)).toBe(false);
  });
  it('「有人想拜某某的门」句式一样、名字不同的，不算一回事', () => {
    const a = '有人想拜观音庵师太的门，叫人挡了驾——听说手上有人命的，她一概不留。';
    const b = '有人想拜金山寺长老的门，叫长老挡了驾——听说手上有冤孽的，他一概不收。';
    expect(sameMeaning(a, b)).toBe(false);
  });
  it('世事同一步算同一回事，不同步不算', () => {
    const base: RumorInst = { id: 'a', ev: 'ev1', ph: 'p1', day: 0, place: '', juice: 0.5, subj: [] };
    expect(sameTopic(base, { ...base, id: 'b' })).toBe(true);
    expect(sameTopic(base, { ...base, id: 'c', ph: 'p2' })).toBe(false);
  });
});

describe('听过的不再从别人嘴里听第二遍', () => {
  it('三个人都知道同一件事的两种说法：只听一回，后面的人说「已经听说了」', () => {
    const three = livePeople().slice(0, 3);
    expect(three.length, '望江楼夜里该有三个有活气的人').toBe(3);
    seed(HONGHUO_A, three);
    seed(HONGHUO_B, three);
    const got = three.map(id => ask(id));
    expect(got.filter(g => g.src === 'know').length, '这件事只该听到一回').toBe(1);
    expect(got[0].src).toBe('know');
    for (let i = 1; i < 3; i++) {
      // 有自己的日子可说的说自己的，没有的说「已经听说了」；都不再把红货的事讲第二遍
      expect(['idle', 'none']).toContain(got[i].src);
      expect(got[i].text).not.toContain('红货');
      if (got[i].src === 'none') expect(got[i].text).toContain(ALREADY[gangOf(three[i])]);
    }
  });
});

describe('已经听说了', () => {
  it('他有话可说、可你都听过了：按身份说「这事你已经听说了」，不再讲一遍', () => {
    const who = livePeople()[0];
    seed(XIAOSHUAN, [who], 0.5);
    S.heard = [newsId(XIAOSHUAN)];
    const life = lifeOf(who)!;
    const idle = life.voice.idle;
    life.voice.idle = [];   // 不让他先说自己的日子，直接走到兜底
    const r = ask(who);
    life.voice.idle = idle;
    expect(r.src).toBe('none');
    expect(r.text).toContain(ALREADY[gangOf(who)]);
    expect(r.text).not.toContain('小栓');
  });
});

describe('传闻栏去重', () => {
  it('意思相同的传闻只显示一条，标几处都在传', () => {
    S.feed = [
      { t: '传闻', x: HONGHUO_A, n: 3 },
      { t: '传闻', x: XIAOSHUAN, n: 2 },
      { t: '传闻', x: HONGHUO_B, n: 1 },
      { t: '江湖', x: HONGHUO_B, n: 0 }
    ];
    const out = dedupeFeed(S.feed);
    expect(out.filter(e => e.t === '传闻').length).toBe(2);
    expect(out[0].x).toContain('几处都在传');
    expect(out.filter(e => e.x.includes('几处都在传')).length).toBe(1);
    expect(out.some(e => e.t === '江湖')).toBe(true);
    expect(S.feed[0].x).toBe(HONGHUO_A);   // 不动存档里的原样
  });
  it('一模一样的两行也只留一行', () => {
    S.feed = [{ t: '传闻', x: XIAOSHUAN, n: 2 }, { t: '传闻', x: XIAOSHUAN, n: 1 }];
    expect(dedupeFeed(S.feed).length).toBe(1);
  });
});

describe('打听先说手头的事', () => {
  it('手上有寻人差事，望江楼的人先说和小栓有关的，哪怕另一条更耸动', () => {
    const who = livePeople()[0];
    expect(who).toBeTruthy();
    seed(XIAOSHUAN, [who], 0.45);
    seed(BIAOSHI, [who], 0.9);
    S.job = { id: 'xsb_xunren', due: dayNo(S) + 3 };
    const r = ask(who);
    expect(r.src).toBe('know');
    expect(r.text).toContain('小栓');
  });
  it('没有差事，就还是先说最耸动的', () => {
    const who = livePeople()[0];
    seed(XIAOSHUAN, [who], 0.45);
    seed(BIAOSHI, [who], 0.9);
    S.job = null;
    expect(ask(who).text).toContain('镖师');
  });
});

describe('听谁说的', () => {
  it('那个人不在场，写「听人说」，不指名', () => {
    const who = livePeople()[0];
    seed(XIAOSHUAN, [who], 0.5, 'huagu');
    const t = ask(who).text;
    expect(t).toContain('（听人说的）');
    expect(t).not.toContain(npc('huagu')!.name);
  });
  it('那个人此刻就在场，才指名', () => {
    const [who, other] = livePeople();
    seed(XIAOSHUAN, [who], 0.5, other);
    expect(ask(who).text).toContain(`（听${npc(other)!.name}说的）`);
  });
});
