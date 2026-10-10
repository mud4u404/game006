/**
 * 开局第五稿（docs/kaipian.md「插手要走时间，在场与不在场各有各的收法」）：
 * 一、插手只改安排，不当场收：提醒、劝当面、告诉、指错路，各按各的时间走到「对面」那夜；两头递话的，褚七看得出来；
 * 二、在场与不在场分开收：对面当夜二十三时结算，在渡口看着的走 *_see，不在的才「去迟了一步」；痕迹和台词按实际时辰写；
 * 三、门槛和代价：下水救他也有渔家的本领；调停三种条件，缺什么写在按钮上；左手的秘密到风声以后才说；调停成功给历练和侠义；
 * 四、看得出事情在走：卫衡问话有按钮，见闻簿留前一步、左手并成一行、安排各记一行，了结以后的话随日子换；
 * 五、重复：小动作每样至多两处，歇脚那句有几种说法、不进动态。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou, worldSeed } from '../src/core/state';
import { absMin, advanceMin, setNowMs } from '../src/core/time';
import { QUESTS, SHI, npc, storyById } from '../src/content';
import type { Cond } from '../src/content/types';
import { newOutcome, run, test as cond, type Outcome } from '../src/engine/dsl';
import { initWorld, marksOf, stOf } from '../src/engine/shijie';
import { dueAt, knownShi, shiOf, tickShi } from '../src/engine/shishi';
import { restLine, XIEJIAO } from '../src/engine/shiguang';
import { questNav } from '../src/engine/daohang';
import { act, roomNpcs, verbsOf } from '../src/engine/world';
import kpSrc from '../src/content/packs/kp-guren.ts?raw';
import exploreSrc from '../src/ui/explore.ts?raw';

const XUN = 'kp_xun';
const DAY = 1440;

beforeEach(() => setNowMs(() => 1_000_000_000_000));
afterEach(() => setNowMs(() => Date.now()));

/** 选一个选项（眼下看得见的里，标签含 part 的头一个），执行它的效果 */
function choose(id: string, part: string, card = 0): Outcome {
  const c = storyById(id)!.cards[card].choices.filter(x => cond(x.if)).find(x => x.label.includes(part));
  expect(c, `剧情 ${id} 第 ${card} 张没有看得见的「${part}」`).toBeTruthy();
  const out = newOutcome();
  run(c!.do, out);
  return out;
}
const visible = (id: string, card = 0) => storyById(id)!.cards[card].choices.filter(x => cond(x.if));

/** 新档进扬州：上午九点二十，渡了他的那条路（褚七相谈甚欢、卫衡心存芥蒂），两人都说过话。name 变，世界的种子跟着变 */
function begin(name = '孤舟'): void {
  setState(skipToYangzhou());
  S.name = name;
  S.w = initWorld(worldSeed(name, S.real.start), S.real.startDay);
  S.flags.kp_chu_met = true; S.flags.kp_wei_met = true;
  S.loc = 'hu';
  S.min = 9 * 60 + 20;
  tickShi();
}
const step = (): string => shiOf(XUN)!.at;
const hourOf = (m: number): number => Math.floor((m % DAY) / 60);
/** 半个钟头半个钟头地往后走，每走一步让江湖走一步，直到这件事走到 target（或者超过 maxH 个钟头） */
function until(pred: () => boolean, maxH = 24 * 12): void {
  for (let i = 0; i < maxH * 2 && !pred(); i++) { advanceMin(S, 30); tickShi(); }
}
const toStep = (...ss: string[]): void => until(() => ss.includes(step()));
/** 走到「对面」这一步刚起头 */
const toDuimian = (): void => toStep('duimian');
const ENDS = ['pao', 'pao_see', 'si', 'si_see', 'zou', 'zou_see', 'dangmian', 'dangmian_see', 'tiaoting', 'bangwei', 'hubai', 'duye'];
const ended = (): boolean => ENDS.includes(step());
/** 一路走到了结，返回了结那一刻（江湖的分钟） */
function toEnd(): number { until(ended); return shiOf(XUN)!.since; }
const noteLines = (): string[] => questNav('main1')!.notes;

/* ---------- 引擎：钟点、安排、亲眼看着 ---------- */

describe('世事引擎：clock、route、here、age', () => {
  it('dueAt：日子过了以后，往后取到第一个这个钟点；不写 clock 的照旧', () => {
    const base = 40 * DAY + 9 * 60 + 20;
    expect(dueAt(base, { days: 0.4, to: 'x', clock: 23 })).toBe(40 * DAY + 23 * 60);
    expect(dueAt(40 * DAY + 20 * 60, { days: 0.4, to: 'x', clock: 23 })).toBe(41 * DAY + 23 * 60);
    expect(dueAt(base, { days: 2, to: 'x' })).toBe(base + 2 * DAY);
  });

  it('对面当夜二十三时结算，不拖到次日上午；了结的那一刻就是二十三时', () => {
    begin('二十三时');
    toDuimian();
    const night = Math.floor(absMin(S) / DAY);
    const t = toEnd();
    expect(['pao', 'si']).toContain(step());
    expect(t % DAY, '了结的那一刻是二十三时').toBe(23 * 60);
    expect(Math.floor(t / DAY), '就在对面起头那天夜里').toBe(night);
  });

  it('玩家离得远（歇过了三个钟头才回渡口）不算亲眼看着', () => {
    begin('看不见');
    toDuimian();
    S.loc = 'dukou';
    S.min = 22 * 60;
    advanceMin(S, 6 * 60);
    tickShi();
    expect(['pao', 'si'], '天亮才到渡口').toContain(step());
  });

  it('在渡口守着，到点结算走 *_see；不在渡口走原来的', () => {
    const seen = new Set<string>(), away = new Set<string>();
    for (let n = 0; n < 30; n++) {
      begin(`守${n}`);
      toDuimian();
      S.loc = 'dukou';
      S.min = 22 * 60 + 30;
      advanceMin(S, 45);
      tickShi();
      seen.add(step());
      begin(`守${n}`);
      toDuimian();
      S.loc = 'hu';
      S.min = 22 * 60 + 30;
      advanceMin(S, 45);
      tickShi();
      away.add(step());
    }
    expect([...seen].sort()).toEqual(['pao_see', 'si_see']);
    expect([...away].sort()).toEqual(['pao', 'si']);
  });

  it('条件 shi.age：走到这一步过了几个钟头', () => {
    begin('年岁');
    run([{ type: 'shi', id: XUN, to: 'pao' }]);
    const at = (lo?: number, hi?: number): Cond => ({ shi: { id: XUN, at: ['pao'], age: { atLeast: lo, below: hi } } });
    expect(cond(at(0, 12))).toBe(true);
    expect(cond(at(12))).toBe(false);
    advanceMin(S, 13 * 60);
    expect(cond(at(0, 12))).toBe(false);
    expect(cond(at(12, 96))).toBe(true);
  });

  it('离线补日子（一口气过了很多日）不替玩家了结：对面从玩家回来起算，至少还有九个钟头来得及赶到渡口', () => {
    begin('离线');
    advanceMin(S, 15 * DAY);
    tickShi();
    expect(step()).toBe('duimian');
    const t0 = shiOf(XUN)!.since;
    expect(t0).toBe(absMin(S));
    advanceMin(S, 9 * 60);
    tickShi();
    expect(step()).toBe('duimian');
    until(ended);
    expect(shiOf(XUN)!.since % DAY).toBe(23 * 60);
    expect(shiOf(XUN)!.since - t0).toBeGreaterThanOrEqual(576);
  });
});

/* ---------- 一、插手只改安排 ---------- */

describe('第五稿一：插手只改安排，不当场收', () => {
  it('提醒褚七：他点头不语躲开了（去处走了），世事还在原来的步子上；卫衡到对面那夜才扑空，那时才说有人递了话、才降关系', () => {
    begin('提醒');
    const wei0 = S.rel.kp_wei;
    run(storyById('xun_chu')!.cards[0].choices.find(c => c.label.includes('夜里小心') && cond(c.if))!.do!);
    expect(S.flags.kp_chu_warned).toBe(true);
    expect(stOf('kp_chu')).toBe('gone');
    expect(step(), '当场不收').toBe('fang');
    expect(S.rel.kp_wei, '卫衡此时还不知道').toBe(wei0);
    expect(S.relNote?.kp_wei ?? '').not.toContain('递的话');
    expect(S.rel.kp_chu).toBe('知交');
    // 往后两个夜里渡口都没有他；卫衡白天说的话里没有「有人递了话」
    S.min = 23 * 60;
    expect(roomNpcs('dukou')).not.toContain('kp_chu');
    S.min = 11 * 60;
    expect(act('kp_wei', '交谈').text).not.toContain('递了话');
    expect(act('kp_wei', '交谈').text).not.toContain('走得那样急');
    // 走到对面那夜，二十三时结算为 zou
    toDuimian();
    const t = toEnd();
    expect(step()).toBe('zou');
    expect(t % DAY).toBe(23 * 60);
    expect(S.rel.kp_wei, '到这一刻还没降').toBe(wei0);
    S.min = 23 * 60 + 30;
    const said = act('kp_wei', '交谈').text;
    expect(said).toContain('有人递了话');
    expect(S.rel.kp_wei).toBe('有隙');
    expect(S.relNote?.kp_wei).toContain('卫衡知道是你递的话');
  });

  it('劝当面了结：约在对面那夜，渡口。当夜不在场，两人自己谈（dangmian）；在场，当面谈（dangmian_see），都在二十三时', () => {
    for (const present of [false, true]) {
      begin('当面');
      S.rel.kp_chu = '相谈甚欢';
      choose('xun_chu', '当面了结');
      expect(S.flags.kp_chu_meet).toBe(true);
      expect(step(), '当场不收').toBe('fang');
      expect(stOf('kp_chu'), '他还在渡口').toBe('ok');
      expect(S.rel.kp_chu).toBe('知交');
      const wei0 = S.rel.kp_wei;
      expect(wei0, '卫衡那边这时还没有变').toBe('心存芥蒂');
      toDuimian();
      if (present) {
        S.loc = 'dukou';
        S.min = 22 * 60 + 30;
        advanceMin(S, 45);
        tickShi();
      } else toEnd();
      expect(step()).toBe(present ? 'dangmian_see' : 'dangmian');
      expect(shiOf(XUN)!.since % DAY).toBe(23 * 60);
      expect(stOf('kp_chu')).toBe('gone');
      expect(stOf('kp_wei')).toBe('gone');
      expect(S.rel.kp_wei, '到这一刻才升').toBe('点头之交');
      expect(marksOf('jc_yz_kezhan').join('')).toContain('回家去见家父');
      expect(marksOf('jc_yz_kezhan').join(''), '不写前夜').not.toContain('前夜');
    }
  });

  it('劝当面了结：那夜在场，有「在一旁听着」；关系不够的，话递出去他说怕，世事不动', () => {
    begin('旁听');
    S.rel.kp_chu = '相谈甚欢';
    choose('xun_chu', '当面了结');
    toDuimian();
    S.min = 22 * 60;
    expect(verbsOf(npc('kp_chu')!)).toContain('插手');
    expect(visible('xun_dui').map(c => c.label)).toContain('「你们说，我在一旁听着。」');
    choose('xun_dui', '在一旁听着');
    expect(step()).toBe('dangmian_see');
    begin('不够');
    S.rel.kp_chu = '点头之交';
    const c = visible('xun_chu').find(x => x.label.includes('当面了结'))!;
    expect(c.result).toContain('我怕');
    expect(c.do).toBeUndefined();
    expect(visible('xun_dui').map(x => x.label), '不是对面那夜，也没有这一项').not.toContain('「你们说，我在一旁听着。」');
  });

  it('告诉卫衡：对面提前到次夜，见闻簿记一行；卫衡说一回，再问只答一句，不逐字复读', () => {
    begin('告诉');
    const t0 = absMin(S);
    // 不告诉的对照：对面在五日后
    choose('xun_wei', '运河渡口');
    expect(S.flags.kp_wei_told).toBe(true);
    expect(step(), '对面提前了').toBe('duimian');
    expect(shiOf(XUN)!.since).toBe(t0);
    expect(S.rel.kp_wei).toBe('点头之交');
    expect(S.relNote?.kp_chu).toContain('下落告诉了卫衡');
    expect(noteLines().some(n => n.includes('你把褚七的下落告诉了卫衡'))).toBe(true);
    S.min = 11 * 60;
    const a = act('kp_wei', '交谈').text, b = act('kp_wei', '交谈').text, c = act('kp_wei', '交谈').text;
    expect(a).toContain('晚辈记下了');
    expect(b).not.toBe(a);
    expect(c).toBe(b);
    const t = toEnd();
    expect(t % DAY).toBe(23 * 60);
    expect(t - t0, '次夜：不早于二十一点，不晚于一日半').toBeGreaterThanOrEqual(576);
    expect(t - t0).toBeLessThan(DAY + 14 * 60);
    expect(['pao', 'si']).toContain(step());
  });

  it('指错路：世事不动，到原定那日才转到「扑了空」，对面比不插手的晚两日；卫衡原定那日之后才知道被骗，那时才降关系', () => {
    begin('指错基线');
    toDuimian();
    const base = shiOf(XUN)!.since;
    const baseEnd = toEnd();
    begin('指错基线');
    run([{ type: 'flag', flag: 'kp_wei_ans' }]);
    begin('指错基线');
    choose('xun_wei', '龙王庙');
    expect(S.flags.kp_wei_lied).toBe(true);
    expect(step(), '当场不动').toBe('fang');
    const wei = S.rel.kp_wei;
    S.min = 11 * 60;
    const early = act('kp_wei', '交谈').text;
    expect(early).not.toContain('野猫');
    expect(S.rel.kp_wei, '这时还没发觉').toBe(wei);
    toStep('cuo');
    expect(shiOf(XUN)!.since, '从原定的日子起算，不从今天').toBe(base);
    expect(S.rel.kp_wei).toBe(wei);
    S.min = 11 * 60;
    expect(act('kp_wei', '交谈').text).toContain('一窝野猫');
    expect(S.rel.kp_wei).toBe('有隙');
    toStep('duimian');
    expect(shiOf(XUN)!.since).toBe(base + 2 * DAY);
    const lateEnd = toEnd();
    expect(lateEnd - baseEnd, '晚两日，一刻不差').toBe(2 * DAY);
  });

  it('两头递话（告诉了卫衡又去提醒褚七）：褚七看得出来，关系不升反降，说「姓卫的知道得这样快」；卫衡扑空时说的也是另一句', () => {
    begin('两头');
    choose('xun_wei', '运河渡口');
    expect(S.rel.kp_chu).toBe('点头之交');
    const out = choose('xun_chu', '夜里小心');
    expect(out).toBeTruthy();
    expect(S.rel.kp_chu, '不升反降').toBe('心存芥蒂');
    expect(S.flags.kp_chu_warned).toBe(true);
    const text = visible('xun_chu').find(c => c.label.includes('夜里小心'))!.result!;
    expect(text).toContain('姓卫的知道得这样快');
    toEnd();
    expect(step()).toBe('zou');
    S.min = 23 * 60 + 30;
    expect(act('kp_wei', '交谈').text).toContain('只对你一个人说过');
  });

  it('每条插手的路，了结的江湖时刻不早于「对面」那夜（二十三时结算）；告诉卫衡是次夜，指错路晚两日', () => {
    begin('时刻基线');
    const t0 = absMin(S);
    const baseEnd = toEnd();
    expect(hourOf(baseEnd)).toBe(23);
    const paths: Record<string, () => void> = {
      提醒: () => { choose('xun_chu', '夜里小心'); },
      当面: () => { S.rel.kp_chu = '相谈甚欢'; choose('xun_chu', '当面了结'); }
    };
    for (const [k, f] of Object.entries(paths)) {
      begin('时刻基线');
      f();
      expect(toEnd(), `${k}：和不插手的同一个夜里，一刻不早`).toBe(baseEnd);
    }
    begin('时刻基线');
    choose('xun_wei', '运河渡口');
    const told = toEnd();
    expect(hourOf(told)).toBe(23);
    expect(told, '告诉：次夜').toBeGreaterThan(t0);
    expect(told).toBeLessThan(baseEnd);
    begin('时刻基线');
    choose('xun_wei', '龙王庙');
    expect(toEnd(), '指错：晚两日').toBe(baseEnd + 2 * DAY);
  });

  it('在渡口出手的几条路：只在对面那一夜的二十一点以后才有「插手」', () => {
    begin('在场');
    toDuimian();
    S.min = 11 * 60;
    expect(verbsOf(npc('kp_wei')!)).not.toContain('插手');
    S.min = 22 * 60;
    expect(verbsOf(npc('kp_wei')!)).toContain('插手');
    expect(verbsOf(npc('kp_chu')!)).toContain('插手');
    // 提醒过的：褚七已经走了，卫衡这边也没有可插手的
    run([{ type: 'flag', flag: 'kp_chu_warned' }]);
    expect(verbsOf(npc('kp_wei')!)).not.toContain('插手');
  });

  it('撑船夜渡：卫衡认得你的，记一笔怨（降一档）；没见过他的，卫衡不知道是谁', () => {
    begin('夜渡认得');
    S.flags.kp_qiantan = true;
    toDuimian();
    S.min = 22 * 60;
    expect(S.rel.kp_wei).toBe('心存芥蒂');
    choose('xun_dui', '撑到石阶下');
    expect(step()).toBe('duye');
    expect(S.rel.kp_wei).toBe('有隙');
    expect(S.relNote?.kp_wei).toContain('认得是你');
    begin('夜渡不认得');
    delete S.flags.kp_wei_met;
    S.flags.kp_lan = true;
    toDuimian();
    S.min = 22 * 60;
    choose('xun_dui', '撑到石阶下');
    expect(step()).toBe('duye');
    expect(S.rel.kp_wei).toBe('心存芥蒂');
  });
});

/* ---------- 二、在场与不在场 ---------- */

describe('第五稿二：在场与不在场各有各的收法，痕迹和台词按实际时辰写', () => {
  it('在渡口看着没有出手的：见闻簿、传闻、卫衡的话都不含「去迟」；不在的，见闻簿才写「去迟了一步」', () => {
    const d = SHI.find(x => x.id === XUN)!;
    for (const at of ['pao_see', 'si_see', 'zou_see', 'dangmian_see']) {
      expect(d.steps[at].now, at).toContain(at === 'dangmian_see' ? '你在一旁听着' : at === 'zou_see' ? '你在场' : '你没有出手');
      expect(d.steps[at].now + (d.steps[at].news ?? ''), at).not.toContain('去迟');
      for (const h of [1, 30, 300]) {
        begin(`在场${at}`);
        run([{ type: 'shi', id: XUN, to: at }]);
        shiOf(XUN)!.since = absMin(S) - h * 60;
        expect(act('kp_wei', '交谈').text, `${at} ${h}`).not.toContain('去迟');
      }
    }
    expect(d.steps.pao.now).toContain('去迟了一步');
    for (let n = 0; n < 6; n++) {
      begin(`不在${n}`);
      toEnd();
      expect(['pao', 'si']).toContain(step());
      expect(knownShi().find(r => r.id === XUN)!.now).toBe(d.steps[step()].now);
    }
  });

  it('卫衡的话随日子换：刚了结的、过了几日的、隔了很久的，各不相同；不写前夜、三五日、站到天亮', () => {
    const lines = (at: string, ages: number[]): string[] => ages.map(h => {
      begin(`日子${at}`);
      run([{ type: 'shi', id: XUN, to: at }]);
      shiOf(XUN)!.since = absMin(S) - h * 60;
      S.flags.kp_zou_known = true; S.flags.kp_wei_lied_known = true;
      return act('kp_wei', '交谈').text;
    });
    for (const at of ['pao', 'si', 'bangwei', 'hubai', 'duye', 'pao_see', 'si_see', 'zou_see']) {
      const t = lines(at, [1, 30, 300]);
      expect(new Set(t).size, `${at} 三个时段各说各的`).toBeGreaterThanOrEqual(at === 'pao' ? 3 : 2);
      // 隔了十日以后，每一步说的是同一句收尾，不再复读上一档
      expect(t[2]).not.toBe(t[1]);
    }
    const pao = lines('pao', [1, 30, 120, 300]);
    expect(new Set(pao).size, '不插手的了结有四档说法').toBe(4);
    const src = kpSrc;
    for (const bad of ['三五日', '前夜', '站到天亮']) expect(src, bad).not.toContain(bad);
  });

  it('渡口「按剑的外乡人」那一行只在对面那夜的前半夜看得见；了结以后换成各自的痕迹', () => {
    begin('痕迹');
    toDuimian();
    S.min = 10 * 60;
    expect(marksOf('dukou').join('')).not.toContain('按剑的外乡人');
    S.min = 21 * 60 + 30;
    expect(marksOf('dukou').join('')).toContain('按剑的外乡人');
    S.min = 23 * 60 + 30;
    expect(marksOf('dukou').join('')).not.toContain('按剑的外乡人');
    toEnd();
    for (const h of [0, 10, 22]) {
      S.min = h * 60;
      expect(marksOf('dukou').join(''), `${h} 点`).not.toContain('按剑的外乡人');
    }
    S.min = 12 * 60;
    expect(marksOf('dukou').join('')).toMatch(/旧铺盖|深色/);
    expect(marksOf('dukou').join('')).not.toContain('三五日');
  });

  it('下水救他的路上，也认得浅滩：置 kp_qiantan，对面那夜能撑船', () => {
    const card = storyById('kp_bu')!.cards.find(c => c.title === '落水的人')!;
    const jiu = card.choices.find(c => c.label === '下水救他')!;
    expect(JSON.stringify(jiu.do)).toContain('"flag":"kp_qiantan"');
    expect(jiu.result).toContain('浅滩');
    begin('下水');
    run(jiu.do!.filter(e => e.type === 'flag'));
    expect(S.flags.kp_jiu).toBe(true);
    toDuimian();
    S.min = 22 * 60;
    expect(visible('xun_dui').some(c => c.label.includes('撑到石阶下') && c.do)).toBe(true);
  });
});

/* ---------- 三、门槛和代价 ---------- */

describe('第五稿三：门槛和代价', () => {
  const SIT = '请二位坐下说话';
  const sit = (): { sub?: string; story?: string; unmet: boolean }[] =>
    visible('xun_dui').filter(c => c.label.includes(SIT)).map(c => ({
      sub: c.sub, story: (c.do?.find(e => e.type === 'story') as { id: string } | undefined)?.id, unmet: !c.do
    }));
  const WARM = '相谈甚欢', PLAIN = '点头之交';
  function at(wei: string, chu: string, hui = false): ReturnType<typeof sit> {
    begin('门槛');
    S.rel.kp_wei = wei; S.rel.kp_chu = chu;
    if (hui) S.flags.kp_hui = true;
    return sit();
  }

  it('调停三种条件：两人都相谈甚欢以上；一人相谈甚欢、一人点头之交且回头看见过人影；或先打赢卫衡（另走拦人那一条）', () => {
    for (const [w, c, hui] of [[WARM, WARM, false], [WARM, PLAIN, true], [PLAIN, WARM, true], ['知交', WARM, false]] as const) {
      const r = at(w, c, hui);
      expect(r, `${w}/${c}/${hui}`).toHaveLength(1);
      expect(r[0].story, `${w}/${c}/${hui}`).toBe('xun_tiao');
    }
    for (const [w, c, hui] of [[WARM, PLAIN, false], [PLAIN, WARM, false], [PLAIN, PLAIN, true], [PLAIN, PLAIN, false], ['心存芥蒂', WARM, true], [WARM, '素不相识', true]] as const) {
      const r = at(w, c, hui);
      expect(r, `${w}/${c}/${hui}`).toHaveLength(1);
      expect(r[0].unmet, `${w}/${c}/${hui}`).toBe(true);
    }
    // 先打赢卫衡：拦人胜了，请两人坐下走调停
    expect(storyById('xun_tiao_win')!.cards[1].choices.some(c => c.do)).toBe(true);
  });

  it('条件不够时，按钮副标写明缺什么', () => {
    expect(at(WARM, PLAIN)[0].sub).toContain('雨夜里回头看见的那个人影');
    expect(at(PLAIN, WARM)[0].sub).toContain('雨夜里回头看见的那个人影');
    expect(at(PLAIN, PLAIN)[0].sub).toContain('点头之交');
    expect(at(PLAIN, PLAIN)[0].sub).toContain('先胜过卫衡');
    expect(at('心存芥蒂', WARM)[0].sub).toContain('卫衡还不肯听你的');
    expect(at(WARM, '心存芥蒂')[0].sub).toContain('褚七还不肯信你');
  });

  it('左手的秘密：要到风声以后，且和褚七相谈甚欢以上才说；风声之前再亲近也不说，风声以后关系不够也不说', () => {
    begin('秘密');
    S.rel.kp_chu = WARM;
    expect(step()).toBe('fang');
    S.min = 23 * 60;
    expect(act('kp_chu', '交谈').text).not.toContain('使刀的是左手');
    expect(S.flags.kp_chu_zuo).toBeUndefined();
    toStep('feng');
    S.rel.kp_chu = PLAIN;
    S.min = 23 * 60;
    expect(act('kp_chu', '交谈').text).not.toContain('使刀的是左手');
    expect(S.flags.kp_chu_zuo).toBeUndefined();
    S.rel.kp_chu = WARM;
    const said = act('kp_chu', '交谈').text;
    expect(said).toContain('使刀的是左手');
    expect(said).toContain('正满城找我');
    expect(S.flags.kp_chu_zuo).toBe(true);
  });

  it('调停那张卡不逐字复读褚七先前说过的话', () => {
    const paras = storyById('xun_tiao')!.cards[0].paras.join('');
    expect(paras).not.toContain('使刀的是左手');
    expect(paras).not.toContain('收刀的时候，拇指先扣刀镡');
    expect(paras).not.toContain('我记得他的手');
  });

  it('调停成功给历练和侠义；关系都升', () => {
    begin('调停赏');
    S.rel.kp_wei = WARM; S.rel.kp_chu = WARM;
    toDuimian();
    S.min = 22 * 60;
    const xia = S.xia, lilian = S.lilian ?? 0;
    choose('xun_tiao', '收场');
    expect(step()).toBe('tiaoting');
    expect(S.xia).toBeGreaterThan(xia);
    expect((S.lilian ?? 0) - lilian).toBeGreaterThanOrEqual(100);
    expect(S.rel.kp_wei).toBe('知交');
  });
});

/* ---------- 四、看得出事情在走 ---------- */

describe('第五稿四：看得出事情在走', () => {
  it('卫衡问「那人在哪里」：见过褚七的有「告诉」「指错」，没见过的是「没见过」；两种都不动世事', () => {
    begin('问话');
    expect(verbsOf(npc('kp_wei')!)).toContain('递话');
    expect(visible('xun_wei').map(c => c.label)).toEqual(['告诉他：运河渡口，夜里扛包的那个', '指给他一个错处：龙王庙后头', '什么也不说']);
    delete S.flags.kp_chu_met;
    expect(verbsOf(npc('kp_wei')!), '没见过褚七也有按钮').toContain('递话');
    const labels = visible('xun_wei').map(c => c.label);
    expect(labels).toContain('「没见过什么独臂的人。」');
    expect(labels.join()).not.toContain('告诉他');
    expect(labels.join()).not.toContain('龙王庙');
    const c = visible('xun_wei').find(x => x.label.includes('没见过'))!;
    expect(c.do).toBeUndefined();
    expect(c.result).toContain('再问问别处');
    // 说过没见过的，以后见了褚七还能告诉他
    expect(verbsOf(npc('kp_wei')!)).toContain('递话');
  });

  it('见闻簿这件事留前一步的一行：知道到风声，写风声，前面留访人那一行', () => {
    begin('前一步');
    expect(knownShi().find(r => r.id === XUN)!.before).toBeUndefined();
    toStep('feng');
    const row = knownShi().find(r => r.id === XUN)!;
    const d = SHI.find(x => x.id === XUN)!;
    expect(row.now).toBe(d.steps.feng.now);
    expect(row.before).toBe(d.steps.fang.now);
    toEnd();
    const end = knownShi().find(r => r.id === XUN)!;
    expect(end.before, '前一步是玩家上回知道的，不一定是紧挨着的').toBeTruthy();
    expect(end.before).not.toBe(end.now);
  });

  it('左手相关的见闻簿并成一行，随所知加深改写', () => {
    const combos: [string[], RegExp][] = [
      [['kp_hui'], /回过一次头/],
      [['kp_chu_zuo'], /褚七后来说/],
      [['kp_hui', 'kp_chu_zuo'], /对得上/],
      [['kp_chu_zuo', 'kp_zuo_dui'], /褚七当着卫衡说/],
      [['kp_hui', 'kp_chu_zuo', 'kp_zuo_dui'], /雨里你回头看见过.*他父亲也说过一模一样的话/]
    ];
    const seen = new Set<string>();
    for (const [flags, re] of combos) {
      setState(skipToYangzhou());
      for (const f of flags) S.flags[f] = true;
      const left = noteLines().filter(n => n.includes('左手') || n.includes('刀镡'));
      expect(left, flags.join('+')).toHaveLength(1);
      expect(left[0]).toMatch(re);
      seen.add(left[0]);
    }
    expect(seen.size, '五档各不相同').toBe(5);
    setState(skipToYangzhou());
    expect(noteLines().filter(n => n.includes('左手') || n.includes('刀镡'))).toHaveLength(0);
    // 旗标不是写了没人读
    const notes = QUESTS.find(q => q.id === 'main1')!.notes!;
    for (const f of ['kp_hui', 'kp_zuo_dui', 'kp_chu_zuo']) expect(JSON.stringify(notes), f).toContain(`"flag":"${f}"`);
  });

  it('玩家做过的安排各记一行', () => {
    setState(skipToYangzhou());
    for (const [flag, part] of [['kp_wei_told', '你把褚七的下落告诉了卫衡'], ['kp_wei_lied', '龙王庙后头'], ['kp_chu_warned', '你提醒了褚七'], ['kp_chu_meet', '你劝褚七当面了结']] as const) {
      expect(noteLines().some(n => n.includes(part)), `${flag} 之前`).toBe(false);
      S.flags[flag] = true;
      expect(noteLines().some(n => n.includes(part)), flag).toBe(true);
    }
  });
});

/* ---------- 五、重复 ---------- */

describe('第五稿五：小动作和歇脚的重复', () => {
  it('褚七、卫衡的小动作每样全文件至多两处', () => {
    const src = kpSrc;
    const body = src.slice(src.indexOf('const NPCS'));
    const gestures: Record<string, RegExp> = {
      盐包往肩上: /盐包往肩上/g,
      草绳: /草绳/g,
      剑往肩上一正: /剑往肩上一正/g,
      擦剑鞘: /擦(了擦)?剑鞘|擦着剑鞘/g,
      目光越过你: /目光越过你/g,
      剑横在膝上: /剑横在膝上/g,
      不问是谁: /不问是谁/g
    };
    for (const [k, re] of Object.entries(gestures)) expect((body.match(re) ?? []).length, k).toBeLessThanOrEqual(2);
  });

  it('歇脚那一句有几种说法，不进动态', () => {
    const lines = new Set<string>();
    for (let day = 1; day <= 10; day++) for (const [h, label] of XIEJIAO) lines.add(restLine({ day, min: h * 60 }, label));
    expect(lines.size).toBeGreaterThanOrEqual(5);
    for (const l of lines) expect(l).not.toContain('你找了个地方歇脚');
    const ui = exploreSrc;
    expect(ui).not.toContain("pushFeed('江湖', `你找了个地方歇脚");
    expect(ui).toContain('toast(restLine(S, label))');
  });
});
