/**
 * 光阴（src/engine/shiguang.ts）：江湖跑不过现实、下线就是静修、约和心魔、江湖历加年。
 * 规则见 docs/foundation.md 第三节第三、九、十条；数由 src/lab/model/life.ts 验过（G7、T1 到 T3、X1）。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { advanceDays, dayNo, fullDate, setNowMs } from '../src/core/time';
import { run, test as cond } from '../src/engine/dsl';
import { SHIGUANG, allowance, checkYue, jingxiu, nianNi, restDays, settleAway, waitUntil, xiejiaoBao } from '../src/engine/shiguang';
import { NPCS } from '../src/content';
import { tickShi } from '../src/engine/shishi';

const H = 3.6e6;
let now = 1_000_000_000_000;
const at = (hours: number): void => { now = 1_000_000_000_000 + hours * H; };

beforeEach(() => {
  at(0);
  setNowMs(() => now);
  setState(skipToYangzhou());
});
afterEach(() => setNowMs(() => Date.now()));

describe('江湖历', () => {
  it('一年十二个月、每月三十天；过了腊月三十是下一年，日子接着数', () => {
    S.month = 12; S.day = 30;
    const d = dayNo(S);
    advanceDays(S, 1);
    expect([S.year, S.month, S.day]).toEqual([1, 1, 1]);
    expect(dayNo(S)).toBe(d + 1);
    expect(fullDate(S)).toBe('景和二年正月初一');
  });
});

describe('江湖跑不过现实：只限成长，不限行动（宪章 P7，10-09 改定）', () => {
  it('开局就有十日的余裕；现实过一小时，多一日；逛、打、办事走掉的日子不吃额度，只有长了修为的日子吃', () => {
    expect(allowance(S)).toBe(SHIGUANG.slack);
    at(5);
    expect(allowance(S)).toBe(SHIGUANG.slack + 5);
    advanceDays(S, 15);
    expect(allowance(S)).toBe(SHIGUANG.slack + 5);
    jingxiu(S, 15);
    expect(allowance(S)).toBe(0);
  });
  it('闭关不再被拦：想闭关一月，日子照走一月，只有额度之内的十日长修为', () => {
    expect(restDays(S, 30)).toMatchObject({ days: 30, grow: 10, why: 'tielv' });
    expect(restDays(S, 7)).toEqual({ days: 7, grow: 7, why: undefined, yue: undefined });
    S.lilian = 5000;
    const d = dayNo(S);
    const r = jingxiu(S, 30, () => 1, 10);
    expect(dayNo(S)).toBe(d + 30);
    expect(r.grow).toBe(10);
    expect(allowance(S)).toBe(0);
    // 额度用完再闭关：日子照走，修为一点不长
    const lilian = S.lilian, gongli = S.gongli;
    const r2 = jingxiu(S, 7, () => 1, 0);
    expect([r2.used, r2.gongli, S.lilian, S.gongli]).toEqual([0, 0, lilian, gongli]);
    expect(dayNo(S)).toBe(d + 37);
  });
});

describe('下线就是静修', () => {
  it('离开不到一小时不算；离开五小时，静修五日；最多十六日', () => {
    at(0.5);
    expect(settleAway(S)).toBeNull();
    const d0 = dayNo(S);
    S.real.seen = now;
    at(5.5);
    const r = settleAway(S, () => 0.99)!;
    expect(r.days).toBe(5);
    expect(dayNo(S)).toBe(d0 + 5);
    S.real.seen = now;
    at(5.5 + 40);
    expect(settleAway(S, () => 0.99)!.days).toBe(SHIGUANG.awayCap);
  });
  it('静修以后气血内力回满，历练化成功夫，功力长一点', () => {
    S.hp = 1; S.lilian = 500;
    const g = S.gongli;
    const r = jingxiu(S, 7, () => 0.99);
    expect(S.hp).toBe(S.hpMax);
    expect(r.used).toBeGreaterThan(0);
    expect(S.lilian).toBe(500 - r.used);
    expect(S.gongli).toBeGreaterThan(g);
  });
});

describe('约', () => {
  const liu = { type: 'yue' as const, id: 'liu_again', npc: 'liu', at: 'hu', inDays: 3, text: '湖畔再见',
    miss: [{ type: 'rel' as const, npc: 'liu', value: '点头之交', from: ['相谈甚欢'] }] };

  it('约期那一天，条件 yue 才成立', () => {
    run([liu]);
    expect(cond({ yue: 'liu_again' })).toBe(false);
    advanceDays(S, 3);
    expect(cond({ yue: 'liu_again' })).toBe(true);
    run([{ type: 'yueDone', id: 'liu_again' }]);
    expect(cond({ yue: 'liu_again' })).toBe(false);
  });

  it('静修碰到约期，那天一早出关', () => {
    run([liu]);
    at(10);
    expect(restDays(S, 7)).toMatchObject({ days: 3, why: 'yue' });
    S.real.seen = 0;
    const r = settleAway(S, () => 0.99)!;
    expect(r.days).toBe(3);
    expect(r.why).toBe('yue');
    expect(cond({ yue: 'liu_again' })).toBe(true);
  });

  it('过了约期还没了结，就是失约：执行失约的后果，生一层心魔，静修打折', () => {
    S.rel.liu = '相谈甚欢';
    S.flags.liuName = true;  // 切磋时已经知道他叫柳寒舟
    run([liu]);
    advanceDays(S, 4);
    const missed = checkYue(S);
    expect(missed).toHaveLength(1);
    expect(S.rel.liu).toBe('点头之交');
    expect(S.xinmo.n).toBe(1);
    expect(S.xinmo.why).toContain('柳寒舟');
    expect(S.yue).toEqual([]);
    // 心魔：同样静修七日，长进少一两成；日子久了慢慢淡
    const a = { ...structuredClone(S), xinmo: { n: 0, why: '' } };
    setState(a); const clean = jingxiu(S, 7, () => 0.99).gongli;
    S.xinmo = { n: 1, why: '失约' };
    S.gongli -= clean;
    const sour = jingxiu(S, 7, () => 0.99).gongli;
    expect(sour / clean).toBeLessThan(0.9);
    expect(S.xinmo.n).toBeLessThan(1);
  });
});

describe('歇脚醒来也有邸报（10-10 试玩第三条）', () => {
  it('歇过一夜、跨了江湖日：复用出关邸报的取法，写这一带的世事', () => {
    S.loc = 'cheng';
    tickShi();
    S.shi!.ss_zei.seen = 'qi';
    S.min = 20 * 60;
    const day0 = dayNo(S);
    // 世事「闹贼」从起头走到贴告示要隔几日：先让几日过去，再歇这一夜（醒来时一并听到）
    advanceDays(S, 6);
    waitUntil(S, 7);
    expect(dayNo(S)).toBeGreaterThan(day0);
    const b = xiejiaoBao(S, day0);
    expect(S.shi?.ss_zei?.at).toBe('bang');
    expect(b.news.some(n => n.includes('告示'))).toBe(true);
    expect(b.news.length).toBeLessThanOrEqual(3);
  });

  it('同一天里歇脚（没跨日）不出邸报', () => {
    S.min = 7 * 60;
    const day0 = dayNo(S);
    waitUntil(S, 12);
    expect(xiejiaoBao(S, day0)).toEqual({ news: [] });
  });

  it('某人惦记着你：热络的熟人眼下有心事，才有这一条；点头之交没有', () => {
    const n = NPCS.find(x => !x.obj && x.life?.want?.length)!;
    S.rel[n.id] = '点头之交';
    expect(nianNi(S)).toBeUndefined();
    S.rel[n.id] = '知交';
    const t = nianNi(S);
    expect(t).toContain('惦记着你');
    S.min = 20 * 60;
    const day0 = dayNo(S);
    waitUntil(S, 7);
    expect(xiejiaoBao(S, day0).nian).toBe(t);
  });
});
