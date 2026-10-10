/**
 * 开局第四稿（docs/kaipian.md「序章的人在扬州动起来」）：
 * 一、第二夜压短到五张卡，加一个决定（听他的走 / 回头），回头的轻伤真的挂上，旧断点能接回；
 * 二、卫衡寻褚七：江湖上第一件自己会发生的事。不插手十日内自己了结，插手的每条路各不相同，同一个种子一字不差，
 *    离线补日子不替玩家了结，「左手」那条线有读者。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { S, newGame, setState, skipToYangzhou, worldSeed } from '../src/core/state';
import { advanceDays, advanceMin, setNowMs } from '../src/core/time';
import { NPCS, QUESTS, SHI, foeById, itemById, npc, storyById } from '../src/content';
import { newOutcome, run, test as cond, type Outcome } from '../src/engine/dsl';
import { Duel, SKILLED, RANDOM, simulate } from '../src/engine/duel';
import { activePrep, alliesOf, fightKit, foeSpec, heroSpec } from '../src/engine/zhaoshi';
import { brace } from '../src/engine/jiesuan';
import { kpMark, kpPos, legacyIndex } from '../src/engine/kaipian';
import { initWorld, marksOf, stOf } from '../src/engine/shijie';
import { knownShi, shiOf, tickShi } from '../src/engine/shishi';
import { checkYue } from '../src/engine/shiguang';
import { questNav } from '../src/engine/daohang';
import { act, roomNpcs, verbsOf } from '../src/engine/world';
import { mulberry32 } from '../src/engine/rng';

const XUN = 'kp_xun';
const HOU = ['kp_du_hou', 'kp_du_hou_lose', 'kp_du_hou_flee', 'kp_wen_hou', 'kp_wen_hou_lose', 'kp_wen_hou_flee',
  'kp_bu_hou', 'kp_bu_hou_win', 'kp_bu_hou_lose', 'kp_bu_hou_flee'];
const MAP = [0, 0, 1, 2, 3, 3, 4, 4];

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
const choose2 = (id: string, part: string, card = 0) => storyById(id)!.cards[card].choices.filter(x => cond(x.if)).find(x => x.label.includes(part))!;
const labels = (id: string, card = 0): string[] => storyById(id)!.cards[card].choices.filter(x => cond(x.if)).map(x => x.label);

/* ---------- 一、第二夜 ---------- */

/** 从第二夜起把这段剧情点到底：RAIN 那张按 back 选回头或听他的，其余点第一个选项 */
function playTail(id: string, back: boolean): void {
  setState(newGame());
  S.flags.kp_du = true;
  const def = storyById(id)!;
  let i = def.cards.findIndex(c => c.title === '旧债上门');
  for (let guard = 0; guard < 20 && i >= 0 && i < def.cards.length; guard++) {
    const card = def.cards[i];
    const vis = card.choices.filter(c => cond(c.if));
    const c = card.title === '走进雨里' ? vis.find(x => x.label === (back ? '回头' : '听他的，走'))! : vis[0];
    run(c.do);
    i = c.next ?? i + 1;
  }
}

describe('第四稿：第二夜压短，加一个决定', () => {
  it('第二夜到登船只剩五张卡：旧债上门、路上的人、走进雨里、天明、去路；登船并进了去路，「再坐一会儿」在天明那张', () => {
    for (const id of HOU) {
      const def = storyById(id)!;
      const at = def.cards.findIndex(c => c.title === '旧债上门');
      const tail = def.cards.slice(at);
      expect(tail.length, id).toBe(5);
      expect(tail.map(c => c.title).slice(2)).toEqual(['走进雨里', '焦船', '去路']);
      // 单按钮的卡不超过三张（旧债上门、路上的人、去路），决定那张有两个选项
      expect(tail.filter(c => c.choices.filter(x => cond(x.if)).length === 1).length, id).toBeLessThanOrEqual(3);
      expect(tail[2].choices.map(c => c.label)).toEqual(['听他的，走', '回头']);
      const dawn = tail[3];
      const sit = dawn.choices.find(c => c.label.includes('再坐'))!;
      expect(sit.next, id).toBe(at + 3);
      expect(tail[4].choices[0].label).toContain('登船');
      expect(def.endChapter).toEqual({ small: '第一回', big: '扬州' });
    }
  });

  it('听他的走：照旧，没有伤、没有那条见闻；回头：旗标、见闻都有，手上挂一处轻伤，进扬州时还没好，过一日自己好', () => {
    for (const id of HOU) {
      playTail(id, false);
      expect(S.chapter, id).toBe(1);
      expect(S.flags.kp_hui).toBeUndefined();
      expect(S.wounds).toEqual({ hand: 0, foot: 0, inner: 0 });
      expect(S.items.kp_douli).toBe(1);
      expect(S.items.scroll).toBe(1);
    }
    for (const id of HOU) {
      playTail(id, true);
      expect(S.chapter, id).toBe(1);
      expect(S.flags.kp_hui, id).toBe(true);
      expect(S.wounds.hand, id).toBe(1);
      expect(S.wounds.foot + S.wounds.inner).toBe(0);
      expect(questNav('main1')!.notes.some(n => n.includes('左手提刀') && n.includes('拇指先扣了刀镡'))).toBe(true);
      // 手上的伤：进扬州的当口还没好，十二个钟头以后也没好，过了一日才好
      checkYue(S);
      expect(S.wounds.hand).toBe(1);
      advanceMin(S, 12 * 60); checkYue(S);
      expect(S.wounds.hand).toBe(1);
      advanceMin(S, 13 * 60); checkYue(S);
      expect(S.wounds.hand).toBe(0);
    }
  });

  it('回头那一眼写明：左手提刀、收刀时拇指先扣刀镡；见闻簿记一条', () => {
    const rain = storyById('kp_du_hou')!.cards.find(c => c.title === '走进雨里')!;
    const back = rain.choices.find(c => c.label === '回头')!;
    expect(back.result).toContain('左手提刀');
    expect(back.result).toContain('拇指先扣上了刀镡');
    playTail('kp_wen_hou', true);
    expect(questNav('main1')!.notes.some(n => n.includes('回过一次头') && n.includes('拇指先扣了刀镡'))).toBe(true);
    playTail('kp_wen_hou', false);
    expect(questNav('main1')!.notes.some(n => n.includes('回过一次头'))).toBe(false);
  });

  it('旧断点（第三稿存下的，没带版本）接回新的卡：落在尾部的按对照换序号，前面的不动', () => {
    for (const id of HOU) {
      const def = storyById(id)!;
      const a = def.cards.length - 5;
      for (let r = 0; r < 8; r++) {
        setState(newGame());
        S.flags[`kp_at:story:${id}:${a + r}`] = true;
        expect(kpPos(S), `${id} 旧第 ${r} 张`).toEqual({ kind: 'story', id, i: a + MAP[r] });
        expect(legacyIndex(id, a + r)).toBe(a + MAP[r]);
      }
      // 尾部以前的序号不动；别的剧情不动
      setState(newGame());
      S.flags[`kp_at:story:${id}:${a - 1}`] = true;
      expect(kpPos(S)).toEqual({ kind: 'story', id, i: a - 1 });
      setState(newGame());
      S.flags['kp_at:story:p_open:3'] = true;
      expect(kpPos(S)).toEqual({ kind: 'story', id: 'p_open', i: 3 });
      // 新写的断点带版本，原样读回，不再换
      setState(newGame());
      kpMark(S, { kind: 'story', id, i: a + 3 });
      expect(Object.keys(S.flags).find(k => k.startsWith('kp_at:'))!.endsWith(':2')).toBe(true);
      expect(kpPos(S)).toEqual({ kind: 'story', id, i: a + 3 });
    }
  });

  it('旧断点接回以后接着点：停在旧「油布」「去路」「登船」的，不多给斗笠、油布，走完照样到扬州', () => {
    for (const r of [4, 5, 6, 7]) {
      setState(newGame());
      S.flags.kp_du = true;
      const id = 'kp_du_hou', def = storyById(id)!, a = def.cards.length - 5;
      // 旧稿里这几站之前的东西都已经给过
      if (r >= 5) { S.items.kp_douli = 1; S.gear.head = 'kp_douli'; }
      if (r >= 6) S.items.scroll = 1;
      S.flags[`kp_at:story:${id}:${a + r}`] = true;
      let i = kpPos(S)!.kind === 'story' ? (kpPos(S) as { i: number }).i : -1;
      for (let guard = 0; guard < 6 && i >= 0 && i < def.cards.length; guard++) {
        const c = def.cards[i].choices.filter(x => cond(x.if))[0];
        run(c.do);
        i = c.next ?? i + 1;
      }
      expect(S.chapter, `旧第 ${r} 张`).toBe(1);
      expect(S.items.kp_douli, `旧第 ${r} 张`).toBe(1);
      expect(S.items.scroll, `旧第 ${r} 张`).toBe(1);
      expect(S.rel.kp_chu).toBe('相谈甚欢');
    }
  });
});

/* ---------- 二、卫衡寻褚七 ---------- */

/** 新档进扬州，「渡」那条路（褚七相谈甚欢、卫衡心存芥蒂）；name 变，世界的种子跟着变 */
function begin(name = '孤舟', extra: string[] = []): void {
  setState(skipToYangzhou());
  S.name = name;
  S.w = initWorld(worldSeed(name, S.real.start), S.real.startDay);
  S.flags.kp_chu_met = true; S.flags.kp_wei_met = true;
  for (const f of extra) S.flags[f] = true;
  S.loc = 'hu';
  tickShi();
}
const step = (): string => shiOf(XUN)!.at;
/** 往后过几个江湖日，每过一日让江湖走一步 */
function days(n: number): void { for (let i = 0; i < n; i++) { advanceDays(S, 1); tickShi(); } }
const night = (): void => { S.min = 23 * 60; };
const shi = (): (typeof SHI)[number] => SHI.find(d => d.id === XUN)!;
/** 此刻世界和关系的样子：用来比较各条路是不是真的不同 */
function sig(): string {
  return JSON.stringify({
    step: step(), wei: S.rel.kp_wei, weiNote: S.relNote?.kp_wei, chu: S.rel.kp_chu, chuNote: S.relNote?.kp_chu,
    chuSt: stOf('kp_chu'), weiSt: stOf('kp_wei'), marks: marksOf('dukou'), kezhan: marksOf('jc_yz_kezhan'),
    news: S.feed.filter(f => f.t === '传闻').map(f => f.x).slice(-1), xia: S.xia
  });
}

describe('卫衡寻褚七：世事写对了', () => {
  it('三步：进扬州当日访人，三日后风声，再两日对面（这一步有窗口）；不插手多数跑、少数死，两个去处都是结局', () => {
    const d = shi();
    expect(d.first).toBe('fang');
    expect(d.steps.fang.next).toEqual({ days: 3, to: 'feng' });
    // 第五稿：指错了路的，原定对面那日改走 cuo；对面当夜二十三时结算（至少留九个多钟头），在场的走 *_see，安排过的走 zou、dangmian
    expect(d.steps.feng.next).toEqual({ days: 2, to: 'duimian', route: [{ if: { flag: 'kp_wei_lied' }, to: 'cuo' }] });
    expect(d.steps.duimian.window).toBe(true);
    expect(d.steps.duimian.next).toMatchObject({ days: 0.4, clock: 23, to: 'pao', alt: { to: 'si', p: 0.25 }, here: { pao: 'pao_see', si: 'si_see', zou: 'zou_see', dangmian: 'dangmian_see' } });
    expect(d.region).toBe('yz');
    expect(d.place).toBe('dukou');
    for (const k of ['pao', 'pao_see', 'si', 'si_see', 'zou', 'zou_see', 'dangmian', 'dangmian_see', 'tiaoting', 'bangwei', 'hubai', 'duye']) expect(d.steps[k].next, k).toBeUndefined();
  });

  it('只在新档、褚七在扬州时起头：不渡又没救上来的那条路上不起', () => {
    setState(skipToYangzhou());
    delete S.flags.kp_du; delete S.flags.kp_xin;
    tickShi();
    expect(shiOf(XUN), '旧档不起').toBeUndefined();
    setState(skipToYangzhou());
    delete S.flags.kp_du; S.flags.kp_bu = true;
    tickShi();
    expect(shiOf(XUN), '不渡又没救，褚七不在扬州，不起').toBeUndefined();
    S.flags.kp_jiu = true; tickShi();
    expect(shiOf(XUN)?.at).toBe('fang');
  });

  it('访人：进扬州当日就在传闻里；风声三日后；对面五日后，夜里卫衡在渡口、不在店里', () => {
    begin();
    expect(step()).toBe('fang');
    expect(S.feed.some(f => f.t === '传闻' && f.x === shi().steps.fang.news)).toBe(true);
    days(2); expect(step()).toBe('fang');
    days(1); expect(step()).toBe('feng');
    expect(S.feed.some(f => f.t === '传闻' && f.x === shi().steps.feng.news)).toBe(true);
    days(1); expect(step()).toBe('feng');
    days(1); expect(step()).toBe('duimian');
    // 渡口那一行只在对面那夜的前半夜看得见（第五稿）
    S.min = 21 * 60 + 30;
    expect(marksOf('dukou').join('')).toContain('按剑的外乡人');
    S.min = 23 * 60;
    expect(roomNpcs('dukou')).toContain('kp_wei');
    expect(roomNpcs('dukou')).toContain('kp_chu');
    expect(roomNpcs('jc_yz_kezhan')).not.toContain('kp_wei');
    S.min = 11 * 60;
    expect(roomNpcs('hu')).toContain('kp_wei');
    expect(roomNpcs('dukou')).not.toContain('kp_wei');
    S.min = 19 * 60;
    expect(roomNpcs('jc_yz_kezhan')).toContain('kp_wei');
  });

  it('不插手：十日之内自己了结；多数褚七连夜跑了，少数死在渡口；见闻簿、传闻、去处、地方的痕迹都对得上', () => {
    const count: Record<string, number> = { pao: 0, si: 0 };
    for (let n = 0; n < 40; n++) {
      begin(`过客${n}`);
      for (let i = 0; i < 10 && ['fang', 'feng', 'duimian'].includes(step()); i++) { advanceDays(S, 1); tickShi(); }
      const at = step();
      expect(['pao', 'si'], `过客${n}`).toContain(at);
      count[at]++;
      const end = shi().steps[at];
      // 见闻簿：玩家在扬州，听到了，记的是这一步；传闻里有这一句
      const row = knownShi().find(r => r.id === XUN)!;
      expect(row.now).toBe(end.now);
      expect(row.ended).toBe(true);
      expect(S.feed.some(f => f.t === '传闻' && f.x === end.news)).toBe(true);
      // 去处：跑了是走了，死了是死了；夜里的渡口再也没有他；渡口留一句痕迹
      expect(stOf('kp_chu')).toBe(at === 'pao' ? 'gone' : 'dead');
      expect(stOf('kp_wei')).toBe('ok');
      S.min = 23 * 60;
      expect(roomNpcs('dukou')).not.toContain('kp_chu');
      expect(marksOf('dukou').join('')).toContain(at === 'pao' ? '旧铺盖' : '深色');
      // 卫衡说的话对得上
      S.min = 11 * 60;
      const said = act('kp_wei', '交谈').text;
      // 第五稿：了结以后卫衡的话随日子换，这里看的是第二天上午那一档
      expect(said).toMatch(at === 'pao' ? /铺盖还(温着|是温的)/ : /躺在石阶下|点了一盏灯/);
    }
    expect(count.pao + count.si).toBe(40);
    expect(count.si, '少数').toBeGreaterThan(0);
    expect(count.pao, '多数').toBeGreaterThan(count.si * 2);
  });

  it('同一个种子，结果一字不差；换种子，抽出来的可以不同', () => {
    const run1 = (name: string): string => {
      begin(name);
      for (let i = 0; i < 8; i++) { advanceDays(S, 1); tickShi(); }
      return JSON.stringify([S.shi, S.feed.map(f => [f.t, f.x]), S.w!.rn, S.w!.ppl, step()]);
    };
    for (const name of ['过客1', '过客2', '过客3', '过客4']) expect(run1(name)).toBe(run1(name));
    const ends = new Set(Array.from({ length: 30 }, (_, i) => { run1(`过客${i}`); return step(); }));
    expect(ends.size).toBe(2);
  });

  it('离线补日子（一口气过了很多日）不替玩家了结：对面这一步从玩家回来起算，当夜二十三时才结算，之前渡口上两人都在', () => {
    begin('离线');
    advanceDays(S, 15);
    tickShi();
    expect(step(), '一口气过了十五日，停在对面这一步等着').toBe('duimian');
    // 玩家回来的这一刻起算（早上七点四十）：十六点四十、二十二点，这一夜渡口上两人都在；过了二十三点才了结
    advanceMin(S, 9 * 60); tickShi();
    expect(step(), '白天还在').toBe('duimian');
    advanceMin(S, 5 * 60 + 20); tickShi();
    expect(step()).toBe('duimian');
    expect(roomNpcs('dukou')).toContain('kp_chu');
    expect(roomNpcs('dukou')).toContain('kp_wei');
    advanceMin(S, 2 * 60); tickShi();
    expect(['pao', 'si']).toContain(step());
  });
});

describe('卫衡寻褚七：玩家能做的，每条路各不相同', () => {
  it('对卫衡递话：知道褚七在哪里才有这个动作；告诉他（关系升、褚七记怨）、指错路（迟两日，他后来知道了降一档）、不说', () => {
    begin('递话');
    expect(verbsOf(npc('kp_wei')!)).toContain('递话');
    // 卫衡问了「那人在哪里」就有按钮：没见过褚七的也有（第五稿，选项是「没见过」，见 tests/kaipian5.test.ts）
    delete S.flags.kp_chu_met;
    expect(verbsOf(npc('kp_wei')!)).toContain('递话');
    S.flags.kp_chu_met = true;
    expect(labels('xun_wei')).toHaveLength(3);
    // 不说：什么也没变
    const before = sig();
    choose('xun_wei', '什么也不说');
    expect(sig()).toBe(before);
    expect(verbsOf(npc('kp_wei')!)).toContain('递话');
    // 告诉他
    choose('xun_wei', '运河渡口');
    expect(S.rel.kp_wei).toBe('点头之交');
    expect(S.relNote?.kp_wei).toContain('运河渡口');
    expect(S.rel.kp_chu).toBe('点头之交');
    expect(S.relNote?.kp_chu).toContain('下落告诉了卫衡');
    expect(S.flags.kp_wei_told).toBe(true);
    expect(verbsOf(npc('kp_wei')!), '答过了不再问').not.toContain('递话');
    S.min = 23 * 60;
    expect(act('kp_chu', '交谈').text).toContain('递给了姓卫的');
    expect(S.flags.kp_chu_gripe).toBe(true);
    expect(step(), '告诉了他，对面提前到次夜').toBe('duimian');
  });

  it('指错路：世事不动，到原定那日转到「扑了空」，再晚两日才到对面；他那时才知道，关系降一档，只说一回', () => {
    begin('指错');
    days(3);
    expect(step()).toBe('feng');
    choose('xun_wei', '龙王庙');
    expect(step(), '当场不动').toBe('feng');
    expect(S.flags.kp_wei_lied).toBe(true);
    const wei = S.rel.kp_wei;
    days(2);
    expect(step()).toBe('cuo');
    S.min = 11 * 60;
    const said = act('kp_wei', '交谈').text;
    expect(said).toContain('一窝野猫');
    expect(S.rel.kp_wei).toBe('有隙');
    expect(wei).toBe('心存芥蒂');
    expect(S.flags.kp_wei_lied_known).toBe(true);
    expect(act('kp_wei', '交谈').text).not.toContain('一窝野猫');
    days(1); expect(step()).toBe('cuo');
    days(1); expect(step()).toBe('duimian');
  });

  it('对褚七提醒：他躲开了（去处走了），欠你的又多一笔；卫衡到对面那夜才扑空、才知道是你递的话', () => {
    begin('提醒');
    expect(verbsOf(npc('kp_chu')!)).toContain('劝告');
    choose('xun_chu', '卫家的人在找你');
    expect(step(), '当场不收').toBe('fang');
    expect(S.rel.kp_chu).toBe('知交');
    expect(S.relNote?.kp_chu).toContain('欠你的又多一笔');
    expect(S.rel.kp_wei).toBe('心存芥蒂');
    expect(stOf('kp_chu')).toBe('gone');
    for (let i = 0; i < 7 && step() !== 'zou'; i++) days(1);
    expect(step()).toBe('zou');
    S.min = 11 * 60;
    expect(act('kp_wei', '交谈').text).toContain('有人递了话');
    expect(S.rel.kp_wei).toBe('有隙');
  });

  it('劝他当面了结：关系到相谈甚欢才肯；不够的，话递出去，他说怕', () => {
    begin('当面');
    expect(labels('xun_chu')).toContain('「躲不了一世，不如当面了结。」');
    // 关系不够：看得见这一句，说出去没用，回到这一张
    S.rel.kp_chu = '点头之交';
    const c = storyById('xun_chu')!.cards[0].choices.filter(x => cond(x.if)).find(x => x.label.includes('当面了结'))!;
    expect(c.result).toContain('我怕');
    expect(c.next).toBe(0);
    expect(c.do).toBeUndefined();
    // 关系够了
    S.rel.kp_chu = '相谈甚欢';
    choose('xun_chu', '当面了结');
    expect(step(), '约在对面那夜，当场不收').toBe('fang');
    expect(S.rel.kp_chu).toBe('知交');
    for (let i = 0; i < 7 && step() !== 'dangmian'; i++) days(1);
    expect(step()).toBe('dangmian');
    expect(stOf('kp_chu')).toBe('gone');
    expect(stOf('kp_wei'), '卫衡带着人回去见家父，十日不在').toBe('gone');
    expect(marksOf('jc_yz_kezhan').join('')).toContain('回家去见家父');
    days(11);
    expect(stOf('kp_wei')).toBe('ok');
  });

  /** 走到对面那一夜 */
  const scene = (name: string): void => { begin(name); days(5); expect(step()).toBe('duimian'); night(); };

  it('对面那一夜在场：卫衡、褚七都有「插手」；白天、别的步骤没有', () => {
    scene('在场');
    expect(verbsOf(npc('kp_wei')!)).toContain('插手');
    expect(verbsOf(npc('kp_chu')!)).toContain('插手');
    expect(verbsOf(npc('kp_chu')!), '这一夜用插手，不用劝告').not.toContain('劝告');
    S.min = 11 * 60;
    expect(verbsOf(npc('kp_wei')!)).not.toContain('插手');
  });

  it('调停：两人都在相谈甚欢以上才坐得下来（另两种条件见 tests/kaipian5.test.ts）；否则这一句没人接', () => {
    scene('调停');
    // 渡口一路：卫衡心存芥蒂，这一句没人接
    expect(S.rel.kp_wei).toBe('心存芥蒂');
    const first = labels('xun_dui');
    expect(first.filter(l => l.includes('请二位坐下说话'))).toHaveLength(1);
    const c = storyById('xun_dui')!.cards[0].choices.filter(x => cond(x.if)).find(x => x.label.includes('坐下说话'))!;
    expect(c.result).toContain('你的话没有人接');
    expect(c.do).toBeUndefined();
    // 点头之交还不够（第五稿：要相谈甚欢）
    S.rel.kp_wei = '点头之交'; S.rel.kp_chu = '点头之交';
    expect(choose2('xun_dui', '坐下说话').do).toBeUndefined();
    // 两人都相谈甚欢，坐得下来
    S.rel.kp_wei = '相谈甚欢'; S.rel.kp_chu = '相谈甚欢';
    const out = choose('xun_dui', '坐下说话');
    expect(out.story).toBe('xun_tiao');
    expect(labels('xun_dui').filter(l => l.includes('坐下说话'))).toHaveLength(1);
  });

  it('调停成功：褚七说出左手，卫衡说他父亲也说过；见闻簿记一条，两人关系都升，卫衡出门追人七日，褚七仍在渡口；回头看过的多一个选项', () => {
    scene('调停成功');
    choose('xun_wei', '运河渡口');
    choose('xun_tiao', '收场');
    expect(step()).toBe('tiaoting');
    expect(S.flags.kp_zuo_dui).toBe(true);
    expect(S.flags.kp_chu_zuo).toBe(true);
    expect(S.rel.kp_wei).toBe('相谈甚欢');
    expect(S.rel.kp_chu).toBe('相谈甚欢');
    expect(S.relNote?.kp_wei).toContain('坐下说话');
    expect(stOf('kp_chu')).toBe('ok');
    expect(stOf('kp_wei')).toBe('gone');
    expect(marksOf('jc_yz_kezhan').join('')).toContain('使左手刀的人');
    expect(S.feed.some(f => f.t === '江湖' && f.x.includes('他父亲也说过一模一样的话'))).toBe(true);
    // 见闻簿：左手那一条
    expect(questNav('main1')!.notes.some(n => n.includes('褚七当着卫衡说') && n.includes('他父亲也说过一模一样的话'))).toBe(true);
    // 褚七留在渡口、不躲了；卫衡七日后回来说话
    S.min = 23 * 60;
    expect(roomNpcs('dukou')).toContain('kp_chu');
    act('kp_chu', '交谈');
    expect(act('kp_chu', '交谈').text).toContain('话说出了口');
    days(8);
    S.min = 11 * 60;
    expect(act('kp_wei', '交谈').text).toContain('左手的线');
    // 回头看过雨里那一眼的，多一个选项
    expect(storyById('xun_tiao')!.cards[0].choices.filter(c => cond(c.if))).toHaveLength(1);
    S.flags.kp_hui = true;
    expect(storyById('xun_tiao')!.cards[0].choices.filter(c => cond(c.if))).toHaveLength(2);
  });

  it('帮卫衡：褚七死，卫衡欠你的情，渡口的脚夫记你的仇，侠义减；撑船夜渡要渔家的本领，没有的话没得选', () => {
    scene('帮卫衡');
    const xia = S.xia;
    const dong = S.w!.fac.dong.you;
    choose('xun_dui', '按住褚七');
    expect(step()).toBe('bangwei');
    expect(stOf('kp_chu')).toBe('dead');
    expect(S.rel.kp_wei).toBe('点头之交');
    expect(S.relNote?.kp_wei).toContain('按住了褚七');
    expect(S.xia).toBe(xia - 4);
    expect(S.w!.fac.dong.you).toBe(dong - 8);
    expect(marksOf('dukou').join('')).toContain('背过身去');
    S.min = 11 * 60;
    expect(act('kp_wei', '交谈').text).toContain('这份情，晚辈欠着');
  });

  it('撑船夜渡：认得浅滩、会放缆绳才有；褚七被送过江，欠你的；卫衡扑空，认得你的记一笔怨', () => {
    scene('夜渡');
    const c = (): string[] => labels('xun_dui').filter(l => l.includes('把船撑到石阶下'));
    expect(c()).toHaveLength(1);
    const noSkill = storyById('xun_dui')!.cards[0].choices.filter(x => cond(x.if)).find(x => x.label.includes('撑到石阶下'))!;
    expect(noSkill.result).toContain('暗流');
    expect(noSkill.do).toBeUndefined();
    for (const f of ['kp_qiantan', 'kp_lan']) {
      scene(`夜渡${f}`);
      S.flags[f] = true;
      const pick = storyById('xun_dui')!.cards[0].choices.filter(x => cond(x.if)).find(x => x.label.includes('撑到石阶下'))!;
      expect(pick.do, f).toBeDefined();
      run(pick.do);
      expect(step()).toBe('duye');
      expect(S.relNote?.kp_chu).toContain('撑船');
      expect(stOf('kp_chu')).toBe('gone');
      expect(S.rel.kp_wei, '卫衡认得你，记一笔怨（第五稿）').toBe('有隙');
    }
  });

  it('拦在褚七前头：输了受伤，褚七还是跑了（卫衡记着你拦过他）；胜了卫衡，他收剑，肯听，转到调停；逃开不算插手', () => {
    scene('拦人');
    const out = choose('xun_dui', '拦在褚七身前');
    expect(out.fight).toBe('xun_weiheng');
    const f = foeById('xun_weiheng')!;
    expect(f.results.lose!.then).toEqual([{ type: 'story', id: 'xun_dui_lose' }]);
    expect(f.results.win.then).toEqual([{ type: 'story', id: 'xun_tiao_win' }]);
    expect(f.results.flee!.then).toEqual([{ type: 'story', id: 'xun_dui_flee' }]);
    // 逃开：世事没动，还在对面这一步
    choose('xun_dui_flee', '退到一边');
    expect(step()).toBe('duimian');
    // 输了
    choose('xun_dui_lose', '站起来');
    expect(step()).toBe('hubai');
    expect(S.rel.kp_wei, '渡的路上他本就心存芥蒂，拦他一回更深').toBe('有隙');
    expect(S.relNote?.kp_wei).toContain('没拦住');
    expect(S.rel.kp_chu).toBe('知交');
    expect(stOf('kp_chu')).toBe('gone');
    // 胜了：旗标有人读，再请两人坐下，走调停
    scene('拦人胜');
    run(f.results.win.do);
    expect(S.flags.kp_dui_beat).toBe(true);
    choose('xun_tiao_win', '请两人坐下', 0);
    choose('xun_tiao_win', '收场', 1);
    expect(step()).toBe('tiaoting');
    S.min = 11 * 60; days(8); S.min = 11 * 60;
    expect(act('kp_wei', '交谈').text).toContain('你胜了晚辈');
  });

  it('卫衡比序章里的对手强：用心打有赢有输，乱打多半输', () => {
    const f = foeById('xun_weiheng')!;
    const rate = (policy: typeof SKILLED): number => {
      let win = 0;
      for (let seed = 1; seed <= 40; seed++) {
        setState(skipToYangzhou());
        brace(f);
        const prep = activePrep(f);
        const d = new Duel(heroSpec(S, fightKit(S), f), foeSpec(f, prep), { rng: mulberry32(seed), allies: alliesOf(prep) });
        simulate(d, policy);
        if (d.res === 'win') win++;
      }
      return win / 40;
    };
    const skilled = rate(SKILLED), random = rate(RANDOM);
    expect(skilled, '用心打，赢得了').toBeGreaterThan(0);
    expect(random, '乱打，多半输').toBeLessThan(0.5);
  });

  it('每条路关系、人情备注、去处、传闻、地方的痕迹各不相同（不算不插手那两个）', () => {
    const sigs = new Map<string, string>();
    const record = (k: string, f: () => void, name = k): void => {
      scene(`路${name}`);
      f();
      sigs.set(k, sig());
    };
    record('zou', () => choose('xun_chu', '卫家的人在找你'), 'a');
    scene('路b'); choose('xun_wei', '运河渡口'); choose('xun_chu', '卫家的人在找你'); sigs.set('told+zou', sig());
    record('dangmian', () => { run(storyById('xun_chu')!.cards[0].choices.find(c => c.label.includes('当面') && c.do)!.do); }, 'c');
    scene('路d'); choose('xun_wei', '运河渡口'); choose('xun_tiao', '收场'); sigs.set('tiaoting', sig());
    record('bangwei', () => choose('xun_dui', '按住褚七'), 'e');
    record('hubai', () => choose('xun_dui_lose', '站起来'), 'f');
    scene('路g'); S.flags.kp_qiantan = true; run(storyById('xun_dui')!.cards[0].choices.find(c => c.label.includes('撑到石阶下') && c.do)!.do); sigs.set('duye', sig());
    // 不插手两个结局
    scene('路h'); days(1); sigs.set(`auto:${step()}`, sig());
    const values = [...sigs.values()];
    expect(new Set(values).size, [...sigs.keys()].join('、')).toBe(values.length);
    // 每个结局的传闻都不同
    const news = SHI.find(d => d.id === XUN)!.steps;
    const ends = ['pao', 'si', 'zou', 'dangmian', 'tiaoting', 'bangwei', 'hubai', 'duye'].map(k => news[k].news);
    expect(new Set(ends).size).toBe(ends.length);
    for (const t of ends) expect(t!.length).toBeLessThanOrEqual(60);
  });

  it('每一步卫衡、褚七的话都对得上，没有一句话互相打架（各步各说各的）', () => {
    const texts = new Set<string>();
    for (const k of ['pao', 'si', 'zou', 'dangmian', 'tiaoting', 'bangwei', 'hubai', 'duye']) {
      begin(`话${k}`);
      S.flags.kp_wei_met = true;
      run([{ type: 'shi', id: XUN, to: k }]);
      S.min = 11 * 60;
      const t = act('kp_wei', '交谈').text;
      texts.add(t);
    }
    expect(texts.size).toBe(8);
  });
});

describe('卫衡寻褚七：「左手」那条线有读者', () => {
  it('回头看见（kp_hui）、渡口调停对上（kp_zuo_dui）、褚七亲口说（kp_chu_zuo）：见闻簿都有读它的一条', () => {
    const notes = (QUESTS.find(q => q.id === 'main1')!.notes ?? []).filter(n => n.text.includes('左手') || n.text.includes('刀镡'));
    const flags = notes.flatMap(n => [n.if.flag]);
    for (const f of ['kp_hui', 'kp_zuo_dui', 'kp_chu_zuo']) expect(flags, f).toContain(f);
    // 旗标不是写了没人读：序章、渡口、扬州的人物和剧情里，条件里都有它
    const all = JSON.stringify([QUESTS, NPCS, storyById('kp_du_hou')]);
    expect(all).toContain('"flag":"kp_hui"');
    expect(all).toContain('"flag":"kp_zuo_dui"');
    expect(itemById('kp_mujian')).toBeTruthy();
  });
});
