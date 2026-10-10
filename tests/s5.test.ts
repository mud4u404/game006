/**
 * S5 战力与评语（docs/sheji-s5-s6.md）：战力数和 tierCont 一致、离下一档差什么跟着重数变、
 * 评语二十四句齐且过文风检查、认得的人只含交过手的和掂过斤两的。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { FOES, ROOMS, npc as npcOf } from '../src/content';
import { roomNpcs, verbsOf } from '../src/engine/world';
import { cn } from '../src/core/util';
import { tierCont, tierOf } from '../src/engine/person';
import { nextTierLine, personOf, syncBody } from '../src/engine/ren';
import { DIAO_MAX, PINGYU, REN_PER_COL, luOf, pingyuOf, recordDiao, renGuo, zhanliLine, zhanliShu, type Lu } from '../src/engine/zhanli';
import { foePerson } from '../src/engine/zhaoshi';
import { MODERN_WORDS } from './style-rules';
vi.stubGlobal('document', { addEventListener: () => {}, hidden: false, querySelector: () => null });
const { viewRenwu } = await import('../src/ui/views/renwu');
const { viewJianghu } = await import('../src/ui/views/jianghu');

/** 三门搭配着的武功各是第几重（1 起） */
function setRealms(o: number, n: number, q: number): void {
  S.skills.hanjiang = { r: o - 1, p: 0 };
  S.skills.xinfa = { r: n - 1, p: 0 };
  S.skills.taxue = { r: q - 1, p: 0 };
}

beforeEach(() => { setState(skipToYangzhou()); });

describe('战力数与档次', () => {
  it('战力数就是 tierCont 乘一百取整，写在句子里', () => {
    for (const [o, n, q] of [[1, 1, 1], [3, 2, 1], [4, 4, 4], [6, 5, 7], [9, 9, 9]]) {
      setRealms(o, n, q);
      const p = personOf(S), z = zhanliLine(S);
      expect(z.power).toBe(Math.round(tierCont(p) * 100));
      expect(zhanliShu(p)).toBe(z.power);
      expect(z.line).toContain(`战力${cn(z.power)}：`);
    }
  });
  it('档次的说法：三流之上、二流未满；不入流写三流未满；宗师不写下一档', () => {
    setRealms(3, 3, 3);
    S.gongli = 6;
    expect(tierOf(personOf(S))).toBe(1);
    expect(zhanliLine(S).line).toBe('战力一百三十三：三流之上，二流未满。');
    setRealms(1, 1, 1);
    expect(zhanliLine(S).line).toBe('战力零：不入流，三流未满。');
    setRealms(9, 9, 9);
    S.gongli = 90;
    expect(zhanliLine(S).line).toMatch(/：宗师。$/);
  });
  it('受伤不降战力数，另起一句眼下带伤', () => {
    setRealms(3, 3, 3);
    S.wounds = { hand: 0, foot: 0, inner: 0 };
    S.hp = S.hpMax;
    const ok = zhanliLine(S);
    expect(ok.hurt).toBe('');
    S.wounds = { hand: 2, foot: 0, inner: 1 };
    S.hp = Math.round(S.hpMax * 0.3);
    const hurt = zhanliLine(S);
    expect(hurt.power).toBe(ok.power);
    expect(hurt.line).toBe(ok.line);
    expect(hurt.hurt).toContain('眼下带着伤');
  });
});

describe('离下一档差什么', () => {
  it('闭关升重后，人物页写的「差什么」跟着变', () => {
    setRealms(2, 1, 1);
    S.gongli = 3;
    const before = nextTierLine(S)!;
    expect(before).toContain('眼下第二重');
    expect(viewRenwu()).toContain(before);
    setRealms(3, 1, 1);
    const after = nextTierLine(S)!;
    expect(after).not.toBe(before);
    expect(after).toContain('要入二流');
    expect(after).toContain('眼下第三重');
    expect(viewRenwu()).toContain(after);
    expect(viewRenwu()).not.toContain(before);
  });
  it('到了宗师不写', () => {
    setRealms(9, 9, 9);
    S.gongli = 90;
    syncBody(S);
    expect(nextTierLine(S)).toBeNull();
    expect(viewRenwu()).not.toContain('要入');
  });
  it('斤两一块里有战力数、差什么和评语', () => {
    setRealms(3, 2, 2);
    const html = viewRenwu();
    expect(html).toContain('<h2>斤两</h2>');
    expect(html).toContain(zhanliLine(S).line);
    expect(html).toContain(pingyuOf(S));
  });
});

describe('评语二十四句', () => {
  const all = (Object.entries(PINGYU) as [Lu, string[]][]).flatMap(([lu, xs]) => xs.map((x, t) => ({ lu, t, x })));
  it('四种路数各六档，共二十四句，句句不同', () => {
    expect(Object.keys(PINGYU).sort()).toEqual(['even', 'inner', 'light', 'outer']);
    for (const xs of Object.values(PINGYU)) expect(xs.length).toBe(6);
    expect(all.length).toBe(24);
    expect(new Set(all.map(a => a.x)).size).toBe(24);
  });
  it('过文风检查：无现代词、无英文数字、句号收尾、没有「不是……是」、没有数值话', () => {
    for (const { x } of all) {
      expect(x.length).toBeGreaterThan(10);
      expect(x.length).toBeLessThan(40);
      expect(x.endsWith('。')).toBe(true);
      for (const re of MODERN_WORDS) expect(x).not.toMatch(re);
      expect(x).not.toMatch(/[A-Za-z0-9]/);
      expect(x).not.toMatch(/不是.*是/);
      expect(x).not.toMatch(/经验|等级|属性|数值|成功|效率|问题|情况|系统/);
      expect(x).not.toContain('——');
    }
  });
  it('按路数取句：偏哪一门看谁高出一重以上，否则均衡', () => {
    setRealms(5, 3, 3);
    expect(luOf(personOf(S))).toBe('outer');
    setRealms(3, 5, 3);
    expect(luOf(personOf(S))).toBe('inner');
    setRealms(3, 3, 5);
    expect(luOf(personOf(S))).toBe('light');
    setRealms(4, 4, 3);
    expect(luOf(personOf(S))).toBe('even');
    setRealms(1, 1, 1);
    expect(luOf(personOf(S))).toBe('even');
    // 评语用显示的档次
    setRealms(5, 3, 3);
    S.gongli = 3;
    const t = tierOf(personOf(S));
    expect(pingyuOf(S)).toBe(PINGYU.outer[t]);
  });
});

describe('认得的人谁强谁弱', () => {
  const me = (): number => tierCont(personOf(S));
  const byRank = (pred: (c: number) => boolean) => FOES.filter(f => !f.weak && pred(tierCont(foePerson(f))));

  it('谁也没交过手、没掂过：空，页面不显示这一块', () => {
    setRealms(3, 3, 3);
    const g = renGuo(S);
    expect(g.strong.length + g.even.length + g.weak.length).toBe(0);
    expect(viewRenwu()).not.toContain('认得的人');
  });
  it('只含交过手的和掂过斤两的，没打过、没掂过的不会冒出来', () => {
    setRealms(3, 3, 3);
    const strong = byRank(c => c - me() >= 1 / 3);
    const weak = byRank(c => c - me() <= -1 / 3);
    expect(strong.length).toBeGreaterThan(1);
    expect(weak.length).toBeGreaterThan(1);
    S.foeLog = { [strong[0].id]: { n: 1, day: 3 } };
    recordDiao(S, weak[0].id, '某人');
    const g = renGuo(S);
    const ids = [...g.strong, ...g.even, ...g.weak].map(r => r.id).sort();
    expect(ids).toEqual([strong[0].id, weak[0].id].sort());
    expect(g.strong.map(r => r.id)).toEqual([strong[0].id]);
    expect(g.weak.map(r => r.id)).toEqual([weak[0].id]);
    const html = viewRenwu();
    expect(html).toContain('认得的人');
    expect(html).toContain('强过你');
    expect(html).toContain('不如你');
  });
  it('相仿：差不到三分之一档；每栏最多三个，强的在前', () => {
    setRealms(3, 3, 3);
    const near = byRank(c => Math.abs(c - me()) < 1 / 3);
    const weak = byRank(c => c - me() <= -1 / 3);
    expect(near.length).toBeGreaterThan(0);
    expect(weak.length).toBeGreaterThan(REN_PER_COL);
    S.foeLog = {};
    for (const f of [...near.slice(0, 2), ...weak.slice(0, 6)]) S.foeLog[f.id] = { n: 1, day: 1 };
    const g = renGuo(S);
    expect(g.even.length).toBe(Math.min(2, near.length));
    expect(g.weak.length).toBe(REN_PER_COL);
    for (const r of g.even) expect(Math.abs(r.power / 100 - me())).toBeLessThan(1 / 3 + 0.005);
    expect(g.weak.map(r => r.power)).toEqual(g.weak.map(r => r.power).sort((a, b) => b - a));
  });
  it('自己变强，同一个人从强过你挪到不如你', () => {
    const foe = FOES.find(f => !f.weak && tierCont(foePerson(f)) >= 1.4)!;
    S.foeLog = { [foe.id]: { n: 1, day: 1 } };
    setRealms(1, 1, 1);
    expect(renGuo(S).strong.map(r => r.id)).toContain(foe.id);
    setRealms(9, 9, 9);
    expect(renGuo(S).weak.map(r => r.id)).toContain(foe.id);
  });
  it('掂过斤两的记录：同一人不重复、最多二十个、没有这个字段的旧档读得进', () => {
    expect(S.diao).toBeUndefined();
    expect(() => renGuo(S)).not.toThrow();
    recordDiao(S, 'a1', '甲');
    recordDiao(S, 'a2', '乙');
    recordDiao(S, 'a1', '甲');
    expect(S.diao!.map(x => x.id)).toEqual(['a2', 'a1']);
    for (let i = 0; i < 30; i++) recordDiao(S, 'x' + i, '丙' + i);
    expect(S.diao!.length).toBe(DIAO_MAX);
    expect(S.diao![DIAO_MAX - 1].id).toBe('x29');
    expect(S.diao!.some(x => x.id === 'a1')).toBe(false);
  });
  it('在人物详情里点开一个会开打的人，掂了斤两就记下他；重复点开不重复记', () => {
    setRealms(3, 3, 3);
    const room = ROOMS.find(r => roomNpcs(r.id).includes('liu'));
    expect(room).toBeTruthy();
    S.loc = room!.id; S.sel = 'liu';
    expect(verbsOf(npcOf('liu')!).some(v => v === '切磋' || v === '动手')).toBe(true);
    viewJianghu();
    viewJianghu();
    expect(S.diao?.map(x => x.id)).toEqual(['liu']);
    expect(S.diao![0].name).not.toBe('柳寒舟');
    expect(renGuo(S).even.concat(renGuo(S).strong, renGuo(S).weak).map(r => r.id)).toEqual(['liu']);
  });
  it('没有这个人的对手 id 不崩', () => {
    recordDiao(S, 'no_such_foe', '无名');
    expect(renGuo(S)).toEqual({ strong: [], even: [], weak: [] });
  });
});
