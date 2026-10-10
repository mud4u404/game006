/**
 * 来钱路（docs/gugan.md 第四节 S2）：悬赏交差后复位、书办的台词和实付对得上、揭榜按钮标赏钱、
 * 零工每处每个江湖日一回、初来的人一日做两三处够嚼用再买一副小药。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { advanceDays, dayNo, setNowMs, spanLabel } from '../src/core/time';
import { NPCS, jobById, npc as npcDef } from '../src/content';
import { run, test as cond } from '../src/engine/dsl';
import { gigLead, leadsNear } from '../src/engine/daohang';
import { jobGongxian, jobOpen, jobPay } from '../src/engine/shenfen';
import { LODGING } from '../src/engine/shiguang';
import { act, dangerOf, roomNpcs, verbGain, verbsOf } from '../src/engine/world';
import { cn } from '../src/core/util';
import { tierNow } from '../src/engine/ren';

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
      // 赏额在前，后头若加凶险的字样（见下面「榜上标凶险」），以「 · 」隔开
      expect(verbGain('xsb_zhuren', verb)!.split(' · ')[0]).toBe(`赏${pay}`);
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
      // 同一日第二回：不给钱，不费时，按钮上不再标报酬，标「今日已做」
      expect(verbGain(id, verb)).toBe('今日已做');
      at(hour);
      const [s1, t1] = [S.silver, S.min];
      act(id, verb);
      expect(S.silver).toBe(s1);
      expect(S.min).toBe(t1); // 点了不耗时间
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
      const t = S.min;
      act(id, verb);
      expect(S.silver).toBe(s);
      expect(S.min, '窗口外点了不耗时间').toBe(t);
      expect(S.dayLog ?? {}).toEqual({});
    });
  }

  it('每处零工的结构一致：做过了——不在时候——开工——兜底；括号里的工钱和耗时就是实际的', () => {
    for (const [id, verb, , pay, min] of GIGS) {
      const bs = npcDef(id)!.actions[verb]!;
      expect(bs).toHaveLength(3);
      expect(bs[0].if).toEqual({ doneToday: expect.any(String) });
      expect(bs[2].if).toBeUndefined();
      // 做过了、不在时候的回话，点了不耗时间（带一条加零的 time）
      for (const b of [bs[0], bs[2]]) expect(b.do, `${id} 的回话不耗时间`).toEqual([{ type: 'time', add: 0 }]);
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

  it('替更夫二十点到二十二点之间都能开工，一更一个时辰，最晚二十三点多收工，不过半夜', () => {
    for (const [h, m] of [[20, 0], [21, 30], [21, 59]] as const) {
      setState(skipToYangzhou());
      at(h, m);
      expect(roomNpcs('cheng'), `${h}:${m} 更夫在街上`).toContain('ss_gengfu');
      const d = dayNo(S), t = S.min;
      const s = S.silver;
      act('ss_gengfu', '替班');
      expect(S.silver - s, `${h}:${m} 开得了工`).toBe(45);
      expect(S.min - t).toBe(120);
      expect(dayNo(S)).toBe(d);
      expect(S.min).toBeLessThan(24 * 60);
      expect(S.dayLog).toEqual({ lg_tibian: d });
    }
    // 二十二点以后：窗口外，不给钱、不耗时间
    for (const h of [22, 23]) {
      setState(skipToYangzhou());
      at(h);
      const [s, t] = [S.silver, S.min];
      act('ss_gengfu', '替班');
      expect([S.silver, S.min], `${h}点`).toEqual([s, t]);
    }
    // 十九点更夫还没出来
    setState(skipToYangzhou());
    at(19, 30);
    expect(roomNpcs('cheng')).not.toContain('ss_gengfu');
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

describe('榜上标凶险：差事档次比你高，揭榜按钮在赏额后头标出来', () => {
  it('木剑新人（不入流）：寻人没有字样，寻物、河贼稍险，缉凶凶险，剿匪极凶险', () => {
    expect(tierNow(S).t).toBe(0);
    expect(verbGain('xsb_zhuren', '揭寻人')).toBe(`赏${cn(250)}文`);
    expect(verbGain('xsb_zhuren', '揭寻物')).toBe(`赏${cn(800)}文 · 稍险`);
    expect(verbGain('xsb_zhuren', '揭河贼')).toBe(`赏${cn(800)}文 · 稍险`);
    expect(verbGain('xsb_zhuren', '揭缉凶')).toBe(`赏${cn(1500)}文 · 凶险`);
    expect(verbGain('xsb_zhuren', '揭剿匪')).toBe(`赏${cn(3380)}文 · 极凶险`);
  });
  it('档次一高，字样就退了：差事档次不高于你的，不标', () => {
    expect([0, 1, 2, 3, 4].map(t => dangerOf(t))).toEqual([null, '稍险', '凶险', '极凶险', '极凶险']);
    S.gongli = 3;
    // 差事档次不高于玩家档次时不标
    const t = tierNow(S).t;
    expect(dangerOf(t)).toBeNull();
    expect(dangerOf(t - 1)).toBeNull();
  });
  it('师门差事标贡献，不标凶险', () => {
    S.sect = { school: '桃花岛', rank: '记名' };
    expect(verbGain('smth_quheng', '讨差事')).not.toContain('险');
  });
});

describe('第一屏指路：近处有事里添一条零工的去处', () => {
  it('新到扬州、钱不足一百文、今日没做过零工：能看到运河渡口常把头招脚夫；只添一条，不挤掉差事', () => {
    S.silver = 500;
    at(8);
    const base = leadsNear();
    S.silver = 30;
    const ls = leadsNear();
    expect(ls.slice(0, -1), '差事的几行原样不动').toEqual(base);
    const g = ls.at(-1)!;
    expect(g.text).toContain('常把头');
    expect(g.to).toBe('dukou');
    expect(g.min).toBeGreaterThan(0);
    expect(ls.length).toBe(base.length + 1);
    expect(ls.filter(l => /招脚夫|缺人|替一更/.test(l.text)).length).toBe(1);
  });
  it('钱够一百文、做过零工了、不在开工的钟点、序章里：不添', () => {
    at(8);
    S.silver = 100;
    expect(gigLead()).toBeNull();
    S.silver = 99;
    expect(gigLead()).not.toBeNull();
    // 今日做过任何一处零工，不再指
    act('lg_batou', '扛包');
    at(8);
    expect(gigLead()).toBeNull();
    advanceDays(S, 1);
    at(8);
    S.silver = 99;
    expect(gigLead()).not.toBeNull();
    // 夜里二十三点：哪处零工都收了
    at(23);
    expect(gigLead()).toBeNull();
    at(8);
    S.chapter = 0;
    expect(gigLead()).toBeNull();
  });
  it('夜里二十点：指向东关街的更夫', () => {
    at(20);
    S.silver = 30;
    const g = gigLead();
    expect(g?.text).toContain('更夫');
    expect(g?.to).toBe('cheng');
  });
});
