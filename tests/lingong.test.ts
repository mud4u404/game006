/**
 * 来钱路（docs/gugan.md 第四节 S2）：悬赏交差后复位、书办的台词和实付对得上、揭榜按钮标赏钱、
 * 零工每处每个江湖日一回、初来的人一日做两三处够嚼用再买一副小药。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { advanceDays, dayNo, setNowMs, spanLabel } from '../src/core/time';
import { NPCS, jobById, npc as npcDef } from '../src/content';
import { run, test as cond } from '../src/engine/dsl';
import { jobGongxian, jobOpen, jobPay } from '../src/engine/shenfen';
import { LODGING } from '../src/engine/shiguang';
import { act, verbGain, verbsOf } from '../src/engine/world';
import { cn } from '../src/core/util';

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.shenfen = { id: 'youxia', standing: 1, since: 0 };
});
afterEach(() => setNowMs(() => Date.now()));

const at = (h: number, m = 0): void => { S.min = h * 60 + m; };
const verbs = (id: string): string[] => verbsOf(npcDef(id)!) as string[];

describe('悬赏交差后复位：冷却一过再揭，不能马上交差', () => {
  // [差事, 揭, 交, 办成的旗标]
  const CASES: [string, string, string, string][] = [
    ['xsb_xunren', '揭寻人', '交寻人', 'xsb_xr_found'],
    ['xsb_xunwu', '揭寻物', '交寻物', 'xsb_xw_found'],
    ['xsb_jiaofei', '揭剿匪', '交剿匪', 'xsb_jf_beat']
  ];
  for (const [job, jie, jiao, flag] of CASES) {
    it(`${job}：交差清掉「${flag}」，冷却过后再揭，不办成就交不了差`, () => {
      act('xsb_zhuren', jie);
      expect(S.job?.id).toBe(job);
      expect(verbs('xsb_zhuren')).not.toContain(jiao);
      S.flags[flag] = true;
      expect(verbs('xsb_zhuren')).toContain(jiao);
      const silver = S.silver;
      act('xsb_zhuren', jiao);
      expect(S.silver - silver).toBe(jobPay(jobById(job)!));
      expect(S.job).toBeNull();
      expect(S.flags[flag]).toBeFalsy();
      // 冷却一过再揭：旗标已经清了，书办那里没有「交」的按钮；硬点也领不到钱
      const cd = jobById(job)!.again ?? 3;
      advanceDays(S, cd - 1);
      expect(jobOpen(S, job)).toBe(false);
      advanceDays(S, 1);
      expect(jobOpen(S, job)).toBe(true);
      act('xsb_zhuren', jie);
      expect(S.job?.id).toBe(job);
      expect(verbs('xsb_zhuren')).not.toContain(jiao);
      const again = S.silver;
      act('xsb_zhuren', jiao);
      expect(S.silver).toBe(again);
      expect(S.job?.id).toBe(job);
    });
  }

  it('寻物办成后，陈三还是那句「这几日一件也没收」（读的是办成过，不是交差前那一刻的旗标）', () => {
    const idle = (): boolean => (npcDef('xsb_chensan')!.life?.voice.idle ?? []).some(b => b.text?.includes('那块玉佩的事') && cond(b.if));
    expect(idle()).toBe(false);
    S.flags.xsb_xw_found = true;
    expect(idle()).toBe(true);
    S.flags.xsb_xw_found = false;
    S.flags.xsb_xw_done = true;
    expect(idle()).toBe(true);
  });
});

describe('书办的台词和实付对得上', () => {
  const BOARD: [string, string][] = [['xsb_xunren', '揭寻人'], ['xsb_xunwu', '揭寻物'], ['xsb_xiong', '揭缉凶'], ['xsb_jiaofei', '揭剿匪'], ['xs_hezei', '揭河贼']];
  it('实付：寻人二百五十、寻物八百、缉凶一千五百、剿匪三千三百八十（一两合一千文）', () => {
    expect(Object.fromEntries(BOARD.map(([job]) => [job, jobPay(jobById(job)!)]))).toEqual({ xsb_xunren: 250, xsb_xunwu: 800, xsb_xiong: 1500, xsb_jiaofei: 3380, xs_hezei: 800 });
  });
  for (const [job, verb] of BOARD) {
    it(`${verb}：书办念的赏额就是实付`, () => {
      const pay = `${cn(jobPay(jobById(job)!))}文`;
      expect(act('xsb_zhuren', verb).text).toContain(pay);
      expect(verbGain('xsb_zhuren', verb)).toBe(`赏${pay}`);
    });
  }
  it('交谈兜底和照壁的榜文如实介绍榜上几张，不再说「榜还贴不出去」', () => {
    const say = act('xsb_zhuren', '交谈').text;
    const gao = act('fuya_gaoshi', '看悬赏').text;
    for (const [job] of BOARD) for (const t of [say, gao]) expect(t).toContain(`${cn(jobPay(jobById(job)!))}文`);
    for (const t of [say, gao]) expect(t).not.toMatch(/没批下来|贴不出去/);
  });
  it('揭榜按钮的副标是通用的：凡接差事的动作都标报酬，师门差事标贡献', () => {
    let seen = 0;
    for (const n of NPCS) for (const [verb, bs] of Object.entries(n.actions)) {
      // 眼下会走到的那个分支（不算银两条件，同 verbPrice）
      const picked = bs?.find(x => cond((({ silver: _s, ...rest }) => rest)(x.if ?? {})));
      for (const e of picked?.do ?? []) {
        if (e.type !== 'job') continue;
        expect(verbGain(n.id, verb), `${n.id}.${verb}`).toContain(`赏${cn(jobPay(jobById(e.id)!))}文`);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(3);
    // 师门差事：给的是门派贡献，不是钱
    S.sect = { school: '桃花岛', rank: '记名' };
    const j = jobById('smth_job_yao')!;
    expect(verbGain('smth_quheng', '讨差事')).toBe(`贡献${cn(jobGongxian(j))}`);
  });
});

describe('零工：每处每个江湖日一回', () => {
  // [人物, 动作, 开工钟点, 工钱, 耗时分钟]
  const GIGS: [string, string, number, number, number][] = [
    ['lg_batou', '扛包', 7, 60, 240],
    ['lg_chushi', '帮厨', 10, 40, 180],
    ['lg_shuzhan', '抄写', 9, 30, 120],
    ['ss_gengfu', '替班', 21, 45, 120]
  ];
  for (const [id, verb, hour, pay, min] of GIGS) {
    it(`${verb}：得${pay}文、耗${min}分钟；当日第二回不给钱；隔日再来`, () => {
      expect(verbs(id)).toContain(verb);
      at(hour);
      expect(verbGain(id, verb)).toBe(`得${cn(pay)}文${min >= 60 ? ` · 耗${spanLabel(min)}` : ''}`);
      const [s0, t0, d0, l0] = [S.silver, S.min, dayNo(S), S.lilian];
      act(id, verb);
      expect(S.silver - s0).toBe(pay);
      expect(S.min - t0).toBe(min);
      // 同一日第二回：不给钱，不费时，按钮上也不再标报酬
      expect(verbGain(id, verb)).toBeNull();
      at(hour);
      const [s1, t1] = [S.silver, S.min];
      act(id, verb);
      expect(S.silver).toBe(s1);
      expect(S.min).toBe(t1 + 10); // 只是说了句话，按「没有列出的动作」的十分钟算
      // 只给工钱，不给历练
      expect(S.lilian).toBe(l0);
      // 隔日再来
      advanceDays(S, 1);
      at(hour);
      expect(dayNo(S)).toBe(d0 + 1);
      const s2 = S.silver;
      act(id, verb);
      expect(S.silver - s2).toBe(pay);
    });
    it(`${verb}：过了时候没有活，不给钱、也不记作做过`, () => {
      at(id === 'ss_gengfu' ? 23 : 20, 30);
      const s = S.silver;
      act(id, verb);
      expect(S.silver).toBe(s);
      expect(S.dayLog ?? {}).toEqual({});
    });
  }

  it('每处零工的结构一致：做过了——不在时候——开工——兜底；括号里的工钱和耗时就是实际的', () => {
    for (const [id, verb, , pay, min] of GIGS) {
      const bs = npcDef(id)!.actions[verb]!;
      expect(bs).toHaveLength(3);
      expect(bs[0].if).toEqual({ doneToday: expect.any(String) });
      expect(bs[2].if).toBeUndefined();
      const key = bs[0].if!.doneToday!;
      expect(bs[1].do![0]).toEqual({ type: 'today', id: key });
      expect(bs[1].do!.findIndex(e => e.type === 'today')).toBeLessThan(bs[1].do!.findIndex(e => e.type === 'time'));
      expect(bs[1].do).toContainEqual({ type: 'time', add: min });
      expect(bs[1].do).toContainEqual({ type: 'silver', delta: pay });
      expect(bs[1].text).toContain(`（银两 +${cn(pay)}文，过去${spanLabel(min)}）`);
      expect(bs[1].do!.some(e => e.type === 'lilian' || e.type === 'rel')).toBe(false);
      // 工钱在二十到六十文之间，耗半个到两个时辰
      expect(pay).toBeGreaterThanOrEqual(20);
      expect(pay).toBeLessThanOrEqual(60);
      expect(min).toBeGreaterThanOrEqual(60);
      expect(min).toBeLessThanOrEqual(240);
    }
    expect(new Set(GIGS.map(([id, v]) => npcDef(id)!.actions[v]![0].if!.doneToday)).size).toBe(GIGS.length);
  });

  it('不要身份：渔家少年也接得到', () => {
    S.shenfen = { id: 'yumin', standing: 1, since: 0 };
    at(7);
    const s = S.silver;
    act('lg_batou', '扛包');
    expect(S.silver - s).toBe(60);
  });

  it('一个刚到扬州的人一日做三处，够一日嚼用，再买一副小药', () => {
    S.silver = 30;
    at(6);
    act('lg_batou', '扛包'); // 六点到十点
    act('lg_chushi', '帮厨'); // 十点到一点
    act('lg_shuzhan', '抄写'); // 一点到三点
    expect(S.min).toBe(15 * 60);
    expect(S.silver - 30).toBe(130);
    expect(S.silver - 30).toBeGreaterThanOrEqual(LODGING.inn + 20);
  });

  it('替更夫只在亥时头上开工，一更走完到不了半夜', () => {
    at(21, 30);
    const d = dayNo(S);
    act('ss_gengfu', '替班');
    expect(dayNo(S)).toBe(d);
    expect(S.dayLog).toEqual({ lg_tibian: d });
  });

  it('干到过了半夜，也算开工那一日（today 排在 time 前头）', () => {
    at(22, 30);
    const d = dayNo(S);
    run([{ type: 'today', id: 'x' }, { type: 'time', add: 120 }]);
    expect(dayNo(S)).toBe(d + 1);
    expect(S.dayLog).toEqual({ x: d });
    expect(cond({ doneToday: 'x' })).toBe(false);
  });
});

describe('一日一回的条件与效果（today / doneToday / notDoneToday）', () => {
  it('记下今天做过；日子一过自动作废，旧的记录顺手清掉', () => {
    expect(cond({ doneToday: 'x' })).toBe(false);
    expect(cond({ notDoneToday: 'x' })).toBe(true);
    run([{ type: 'today', id: 'x' }]);
    expect(cond({ doneToday: 'x' })).toBe(true);
    expect(cond({ notDoneToday: 'x' })).toBe(false);
    expect(cond({ doneToday: 'y' })).toBe(false);
    advanceDays(S, 1);
    expect(cond({ doneToday: 'x' })).toBe(false);
    expect(cond({ notDoneToday: 'x' })).toBe(true);
    run([{ type: 'today', id: 'y' }]);
    expect(S.dayLog).toEqual({ y: dayNo(S) });
  });
  it('耗时的说法', () => {
    expect([60, 120, 180, 240].map(spanLabel)).toEqual(['半个时辰', '一个时辰', '一个半时辰', '两个时辰']);
  });
});
