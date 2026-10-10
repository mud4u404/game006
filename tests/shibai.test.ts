/**
 * S6 失败有缓冲（docs/sheji-s5-s6.md，依据 docs/sheji-001-003.md 第 003 项「失败」「成长」）：
 * 出发前先说一声眼下的状态；败仗只减益、不清空积累；输了写明为什么、下回怎么补。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { setNowMs } from '../src/core/time';
import { FOES, foeById } from '../src/content';
import type { FoeDef } from '../src/content/types';
import { Duel, SKILLED, simulate } from '../src/engine/duel';
import { FAR_MIN, chufaLine, chufaTips, tripNeed, verbChufa } from '../src/engine/chufa';
import { LOSE_HP, loseFacts, loseNote, settle, takeWounds, type LoseFacts } from '../src/engine/jiesuan';
import { run } from '../src/engine/dsl';
import { tierCont } from '../src/engine/person';
import { personOf } from '../src/engine/ren';
import { mulberry32 } from '../src/engine/rng';
import { activePrep, alliesOf, fightKit, foeSpec, heroSpec } from '../src/engine/zhaoshi';
import { shenfenText } from '../src/engine/shenfen';

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.min = 10 * 60;
  S.hp = S.hpMax;
  S.mp = S.mpMax;
  S.silver = 800;
});

describe('出发前提示：只提示，不拦', () => {
  it('满状态的人揭榜，什么也不写', () => {
    expect(chufaTips(S)).toEqual([]);
    expect(chufaLine(S)).toBeNull();
    expect(verbChufa('xsb_zhuren')).toBeNull();
  });

  it('带伤的人揭榜，写明伤在哪处、碍着什么', () => {
    S.wounds = { hand: 2, foot: 1, inner: 0 };
    const line = verbChufa('xsb_zhuren')!;
    expect(line).toContain('出发前：');
    expect(line).toContain('手上带着重伤，使兵刃要吃亏');
    expect(line).toContain('腿上带着轻伤，身法要打折扣');
    expect(line).not.toContain('内息');
    S.wounds = { hand: 0, foot: 0, inner: 3 };
    expect(verbChufa('xsb_zhuren')).toContain('内息带着重伤，内力运不顺');
  });

  it('气血不到一半、内力不到三成各说一句，刚好一半、三成不说', () => {
    S.hp = Math.floor(S.hpMax * 0.49);
    expect(chufaTips(S)).toEqual(['气血不到一半']);
    S.hp = Math.ceil(S.hpMax * 0.5);
    expect(chufaTips(S)).toEqual([]);
    S.mp = Math.floor(S.mpMax * 0.29);
    expect(chufaTips(S)).toEqual(['内力不到三成']);
    S.mp = Math.ceil(S.mpMax * 0.3);
    expect(chufaTips(S)).toEqual([]);
  });

  it('钱不够这趟的船钱、过夜的店钱，才提钱', () => {
    // 这趟要四十文船钱，赶到时已过了半夜，再加一夜店钱
    S.min = 22 * 60;
    expect(tripNeed(S, 40, 180)).toBe(40 + 100);
    S.silver = 139;
    expect(chufaLine(S, { fee: 40, min: 180 })).toContain('身上的钱不够这趟的船钱和店钱');
    S.silver = 140;
    expect(chufaLine(S, { fee: 40, min: 180 })).toBeNull();
    // 不写 trip 就不提钱
    S.silver = 0;
    expect(chufaLine(S)).toBeNull();
    // 只有店钱、只有船钱，各按各的说
    S.min = 22 * 60;
    expect(chufaLine(S, { fee: 0, min: 180 })).toContain('店钱');
    expect(chufaLine(S, { fee: 0, min: 180 })).not.toContain('船钱');
    S.min = 8 * 60;
    expect(chufaLine(S, { fee: 40, min: 180 })).toContain('船钱');
    expect(chufaLine(S, { fee: 40, min: 180 })).not.toContain('店钱');
  });

  it('出远门的界线是一个时辰（两个钟头）', () => {
    expect(FAR_MIN).toBe(120);
  });
});

describe('败仗只减益：历练、熟练、修为、武功一样都不扣', () => {
  it('内容里没有一条败仗（输、逃、认输）的结算在扣历练、熟练、属性，也没有逐出师门、白拿物件', () => {
    const bad: string[] = [];
    for (const f of FOES) for (const k of ['lose', 'flee', 'yield'] as const) {
      for (const e of [...(f.results[k]?.do ?? []), ...(f.results[k]?.then ?? [])]) {
        if ((e.type === 'prof' || e.type === 'lilian') && e.amount < 0) bad.push(`${f.id}.${k} ${e.type}`);
        if (e.type === 'attr' && e.delta < 0) bad.push(`${f.id}.${k} attr`);
        if (e.type === 'leaveSect') bad.push(`${f.id}.${k} leaveSect`);
        if (e.type === 'item' && e.delta < 0) bad.push(`${f.id}.${k} item`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('每个对手打输、逃跑、认输以后：历练只增不减，每门武功的重数和熟练、功力、四项根基一样不少', () => {
    const before = () => ({ lilian: S.lilian, skills: JSON.parse(JSON.stringify(S.skills)), gongli: S.gongli, attr: { ...S.attr }, sect: S.sect?.school });
    let n = 0;
    for (const f of FOES) for (const res of ['lose', 'flee', 'yield'] as const) {
      if (!f.results[res]) continue;
      setState(skipToYangzhou());
      S.min = 10 * 60;
      S.lilian = 500;
      const b = before();
      settle(f, res, []);
      expect(S.lilian, `${f.id}.${res} 历练`).toBeGreaterThanOrEqual(b.lilian);
      for (const [id, p] of Object.entries(b.skills) as [string, { r: number; p: number }][]) {
        const now = S.skills[id]!;
        expect(now.r * 1e6 + now.p, `${f.id}.${res} ${id}`).toBeGreaterThanOrEqual(p.r * 1e6 + p.p);
      }
      expect(S.gongli, `${f.id}.${res} 功力`).toBe(b.gongli);
      expect(S.attr, `${f.id}.${res} 根基`).toEqual(b.attr);
      expect(S.sect?.school).toBe(b.sect);
      n++;
    }
    expect(n).toBeGreaterThan(60);
  });

  it('引擎兜底：就算内容写了扣历练、扣熟练，败仗结算也不执行', () => {
    const f: FoeDef = { ...foeById('xs_hezei')!, results: { win: foeById('xs_hezei')!.results.win, lose: { title: '栽了', story: '栽了', do: [{ type: 'lilian', amount: -50 }, { type: 'prof', skill: 'hanjiang', amount: -30 }] } } };
    S.lilian = 200;
    const p0 = S.skills.hanjiang!.p;
    settle(f, 'lose', []);
    expect(S.lilian).toBeGreaterThanOrEqual(200);
    expect(S.skills.hanjiang!.p).toBe(p0);
  });

  it('输了没写养伤的，至少留三成气血，不叫人带着零气血去撞下一场', () => {
    const f = foeById('zb_jie_fei')!;
    expect(f.results.lose!.do!.some(e => e.type === 'heal')).toBe(false);
    S.hp = 0;
    settle(f, 'lose', []);
    expect(S.hp).toBe(Math.round(S.hpMax * LOSE_HP));
    // 打赢了不动气血
    S.hp = 5;
    settle(f, 'win', []);
    expect(S.hp).toBe(5);
  });

  it('伤按强弱封顶：输了最多落四级，本该赢的最多两级；三处伤不会一场全打到封顶', () => {
    const f = foeById('xs_hezei')!;
    const sum = () => S.wounds.hand + S.wounds.foot + S.wounds.inner;
    takeWounds(f, { hand: 3, foot: 3, inner: 3 }, 'lose', 0.1);
    expect(sum()).toBe(4);
    setState(skipToYangzhou());
    takeWounds(f, { hand: 3, foot: 3, inner: 3 }, 'lose', 0.8);
    expect(sum()).toBe(2);
    setState(skipToYangzhou());
    takeWounds(f, { hand: 3, foot: 3, inner: 3 }, 'flee', 0.3);
    expect(sum()).toBe(2);
  });

  it('丢镖、丢了差事的败仗不叠加重伤：最多一级轻伤，过一日自己好', () => {
    for (const id of ['zb_jie_fei', 'bj_jie_gz', 'smcs_dashou']) {
      setState(skipToYangzhou());
      const f = foeById(id)!;
      takeWounds(f, { hand: 3, foot: 3, inner: 3 }, 'lose', 0.05);
      expect(S.wounds.hand + S.wounds.foot + S.wounds.inner, id).toBe(1);
      expect(Math.max(S.wounds.hand, S.wounds.foot, S.wounds.inner), id).toBe(1);
    }
    // 没丢差事的败仗照旧按强弱封顶，不受这一条管
    setState(skipToYangzhou());
    takeWounds(foeById('xs_hezei')!, { hand: 3, foot: 3, inner: 3 }, 'lose', 0.05);
    expect(S.wounds.hand + S.wounds.foot + S.wounds.inner).toBe(4);
  });

  it('差事头一回误了只记一过，再误一回才降地位', () => {
    S.shenfen = { id: 'biaoshi', standing: 1, since: 0 };
    run([{ type: 'job', id: 'bj_gz' }]);
    run([{ type: 'jobFail', id: 'bj_gz' }]);
    expect(S.shenfen.standing).toBe(1);
    expect(S.flags.jobWarn).toBe(true);
    expect(shenfenText(S)).toContain('新进');
    run([{ type: 'job', id: 'bj_gz' }]);
    run([{ type: 'jobFail', id: 'bj_gz' }]);
    expect(S.shenfen.id).toBe('youxia');
  });

  it('失物有赎回的路：败在孙彪手里被摸去二十文，下回赢了他搜回来；没丢过的赢了不多得', () => {
    const f = foeById('jy_sunbiao')!;
    S.silver = 100;
    settle(f, 'lose', []);
    expect(S.silver).toBe(80);
    expect(S.flags.jy_sun_took).toBe(true);
    const win = settle(f, 'win', []);
    expect(S.silver).toBe(100);
    expect(S.flags.jy_sun_took).toBe(false);
    expect(win.effects.some(e => e.type === 'silver')).toBe(true);
    // 再赢一回，没有失物可赎，不凭空多拿
    const again = settle(f, 'win', []);
    expect(S.silver).toBe(100);
    expect(again.effects.some(e => e.type === 'silver')).toBe(false);
  });
});

/** 照真实的一场打：玩家（眼下的存档）对一个对手，种子换着来，挑出打输了的 */
function losses(f: FoeDef, seeds = 200): { d: Duel; f: FoeDef }[] {
  const out: { d: Duel; f: FoeDef }[] = [];
  for (let i = 0; i < seeds; i++) {
    const prep = activePrep(f);
    const d = new Duel(heroSpec(S, fightKit(S), f), foeSpec(f, prep), { rng: mulberry32(7001 + i * 31), allies: alliesOf(prep) });
    simulate(d, SKILLED);
    if (d.res === 'lose') out.push({ d, f });
  }
  return out;
}

describe('输了写明为什么、下回怎么补', () => {
  it('带着重伤去打一个和自己相仿的人，输了，写的是带伤（伤在哪处、怎么养）', () => {
    const t = tierCont(personOf(S));
    const f: FoeDef = { ...foeById('xs_hezei')!, rank: t, weak: undefined, spar: undefined };
    S.wounds = { hand: 3, foot: 3, inner: 3 };
    const ls = losses(f);
    expect(ls.length).toBeGreaterThan(5);
    for (const { d } of ls) {
      const n = loseNote(loseFacts(d, f, []));
      expect(n.kind).toBe('wound');
      expect(n.why).toContain('开打前你就带着伤');
      expect(n.why).toContain('重伤在手上');
      expect(n.mend).toContain('郎中');
    }
  });

  it('满状态去打高出两档的人，输了，写的是档次差几档、练到第几重再来', () => {
    const t = tierCont(personOf(S));
    const f: FoeDef = { ...foeById('xs_hezei')!, rank: t + 2, weak: undefined, spar: undefined, nature: '刚' };
    const ls = losses(f);
    expect(ls.length).toBeGreaterThan(50);
    for (const { d } of ls) {
      const n = loseNote(loseFacts(d, f, []));
      expect(n.kind).toBe('tier');
      expect(n.why).toMatch(/高出你(两档|一档半|两档半)/);
      expect(n.mend).toMatch(/练到第.+重再来领教/);
      expect(n.mend).toContain('换一门克他刚路的功夫');
    }
  });

  it('四样实情各自成立时，挑最主要的一条：内力见底、重招没接住（哪一路）、都不到', () => {
    const base: LoseFacts = { tier: 2, foeTier: 2, maxR: 4, wounds: { hand: 0, foot: 0, inner: 0 }, mp: 80, mpMax: 100, miss: { li: 0, su: 0, qiao: 0 }, prepIdle: false };
    expect(loseNote({ ...base, mp: 10 }).kind).toBe('mp');
    expect(loseNote({ ...base, mp: 10 }).why).toContain('内力见了底');
    for (const [dom, word, mend] of [['li', '力道沉猛', '内功'], ['su', '出手极快', '轻功'], ['qiao', '变化刁钻', '外功']] as const) {
      const n = loseNote({ ...base, miss: { li: 0, su: 0, qiao: 0, [dom]: 3 } });
      expect(n.kind).toBe('miss');
      expect(n.why).toContain(word);
      expect(n.why).toContain('三回没接住');
      expect(n.mend).toContain(mend);
    }
    expect(loseNote(base).kind).toBe('none');
    // 档次差不到小半档不算；带轻伤只说养一日
    expect(loseNote({ ...base, foeTier: 2.3 }).kind).toBe('none');
    const light = loseNote({ ...base, wounds: { hand: 0, foot: 1, inner: 0 } });
    expect(light.kind).toBe('wound');
    expect(light.mend).toContain('养上一日');
    // 档次差得多，盖过带的轻伤；有备战没用上的，下回怎么补里提一句
    const gap = loseNote({ ...base, foeTier: 4, wounds: { hand: 1, foot: 0, inner: 0 }, prepIdle: true });
    expect(gap.kind).toBe('tier');
    expect(gap.why).toContain('高出你两档');
    expect(gap.mend).toContain('帮手请来');
  });

  it('只写事实、不说教：缘故和下回都是一句，不带数值百分比', () => {
    const base: LoseFacts = { tier: 1, foeTier: 3, maxR: 2, wounds: { hand: 0, foot: 0, inner: 0 }, mp: 80, mpMax: 100, miss: { li: 1, su: 0, qiao: 0 }, prepIdle: false };
    const n = loseNote(base);
    expect(n.why.endsWith('。')).toBe(true);
    expect(n.mend.endsWith('。')).toBe(true);
    expect(n.why + n.mend).not.toMatch(/[0-9%]/);
  });
});
