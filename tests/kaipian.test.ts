/**
 * 新开局「瓜洲夜雨」（docs/kaipian.md）：三条路都走得通、走完是同一个样子（扬州、第一回、江伯生死未卜），
 * 三场弱对手的打主角不会死、普通人的本领真的让对手变弱，旧存档（没有 kp_xin）读到的还是旧说法。
 */
import { describe, expect, it } from 'vitest';
import { S, newGame, setState, skipToYangzhou } from '../src/core/state';
import { dayNo, setNowMs } from '../src/core/time';
import { foeById, storyById } from '../src/content';
import { newOutcome, run, test as cond, type Outcome } from '../src/engine/dsl';
import { Duel, RANDOM, SKILLED, simulate, type Policy } from '../src/engine/duel';
import { activePrep, alliesOf, fightKit, foeSpec, heroSpec } from '../src/engine/zhaoshi';
import { brace, settle, takeWounds } from '../src/engine/jiesuan';
import { mulberry32 } from '../src/engine/rng';
import { kpOpen, kpPick, kpPos } from '../src/engine/kaipian';

setNowMs(() => 1_000_000_000_000);

interface Trace { stories: string[]; fights: string[]; clicks: number; results: Record<string, string> }

/** 按玩家的点法读一段剧情：pick 给每张卡挑第几个选项（只在眼下看得见的选项里挑）；开剧情、开打照界面的顺序接下去 */
function walk(id: string, pick: (title: string, labels: string[]) => number, policy: Policy, seed: number, tr: Trace): void {
  const def = storyById(id)!;
  tr.stories.push(id);
  let i = 0;
  for (let guard = 0; guard < 100; guard++) {
    const card = def.cards[i];
    const vis = card.choices.filter(c => cond(c.if));
    expect(vis.length, `${id}#${i}「${card.title}」没有选项`).toBeGreaterThan(0);
    const c = vis[Math.min(pick(card.title, vis.map(x => x.label)), vis.length - 1)];
    tr.clicks += c.result ? 2 : 1;
    const out: Outcome = newOutcome();
    if (card.input === 'name') S.name = '听雨';
    run(c.do, out);
    const next = c.next ?? i + 1;
    if (out.story) { walk(out.story, pick, policy, seed, tr); return; }
    if (out.fight) { fight(out.fight, pick, policy, seed, tr); return; }
    if (next < 0 || next >= def.cards.length) { if (def.endChapter) tr.clicks += 1; return; }
    i = next;
  }
  throw new Error(`剧情 ${id} 走不完`);
}

function fight(fid: string, pick: (title: string, labels: string[]) => number, policy: Policy, seed: number, tr: Trace): void {
  const f = foeById(fid)!;
  tr.fights.push(fid);
  brace(f);
  const prep = activePrep(f);
  const d = new Duel(heroSpec(S, fightKit(S), f), foeSpec(f, prep), { rng: mulberry32(seed), allies: alliesOf(prep) });
  simulate(d, policy);
  S.hp = Math.max(0, Math.round(d.hp));
  S.mp = Math.max(0, Math.round(d.mp));
  tr.results[fid] = d.res!;
  takeWounds(f, d.log.taken, d.res ?? undefined);
  const st = settle(f, d.res!, prep);
  expect(st.r, `对手 ${fid} 打出 ${d.res} 却没有结算`).toBeTruthy();
  expect(S.hp, '打完气血不能是零').toBeGreaterThan(0);
  for (const e of st.r?.then ?? []) if (e.type === 'story') { walk(e.id, pick, policy, seed, tr); return; }
  throw new Error(`对手 ${fid} 的结算没有接下去的剧情`);
}

/** 第一夜「渡不渡」选哪条；之后每张卡的选法：第一个选项，遇到本领的卡选 skill 那个 */
const PATHS = [
  { name: '渡', flag: 'kp_du', at: 0, skill: 'kp_qiantan' },
  { name: '请二位上船', flag: 'kp_wen', at: 1, skill: 'kp_lan' },
  { name: '不渡', flag: 'kp_bu', at: 2, skill: 'kp_zhong' }
] as const;

function play(path: typeof PATHS[number], policy: Policy, seed: number, useSkill: boolean): { tr: Trace; hp: number } {
  setState(newGame());
  const tr: Trace = { stories: [], fights: [], clicks: 0, results: {} };
  // 不渡这一路，第二张卡「落水的人」选「沿着江堤追他」才有打；其余卡选第一个，本领的卡按 useSkill 选
  const pickFn = (title: string, labels: string[]): number => {
    if (title === '渡不渡') return path.at;
    if (title === '落水的人') return labels.findIndex(x => x.includes('追'));
    if (title === '镖师的话' || title === '旧伤' || title === '堤下的人') return useSkill ? 0 : labels.length - 1;
    return 0;
  };
  walk('p_open', pickFn, policy, seed, tr);
  return { tr, hp: S.hp };
}

describe('新开局：瓜洲夜雨', () => {
  for (const path of PATHS) {
    it(`「${path.name}」走得通：第一回扬州，江伯不死，玉佩、油布、斗笠在身上，三种打法都不会死`, () => {
      for (const [policy, useSkill] of [[SKILLED, true], [RANDOM, true], [RANDOM, false]] as const) {
        for (let seed = 1; seed <= 6; seed++) {
          const { tr } = play(path, policy, seed, useSkill);
          expect(tr.fights.length, '三条路各带一场打').toBe(1);
          expect(S.chapter).toBe(1);
          expect(S.quests.prologue).toBe(3);
          expect(S.loc).toBe('hu');
          expect(S.flags[path.flag]).toBe(true);
          expect(S.flags.kp_xin).toBe(true);
          expect(S.items.jade).toBe(1);
          expect(S.items.scroll).toBe(1);
          expect(S.items.kp_douli).toBe(1);
          expect(S.rel.jiangbo).not.toBe('阴阳两隔');
          expect(S.hp).toBeGreaterThan(0);
          expect(tr.stories[0]).toBe('p_open');
          expect(tr.stories.at(-1)).toBe(`${path.flag}_hou`);
        }
      }
    });
  }

  it('「不渡」的另外两条小路（下水救他、留在船上）不用打也走得通', () => {
    for (const label of ['下水救', '留在船上']) {
      setState(newGame());
      const tr: Trace = { stories: [], fights: [], clicks: 0, results: {} };
      walk('p_open', (t, ls) => t === '渡不渡' ? 2 : t === '落水的人' ? ls.findIndex(x => x.includes(label)) : 0, SKILLED, 1, tr);
      expect(tr.fights).toEqual([]);
      expect(S.chapter).toBe(1);
      expect(S.flags.kp_bu).toBe(true);
      expect(S.items.kp_yaopai).toBe(1);
    }
  });

  it('第二夜是三日后的三更，天亮后去扬州：从开局到进扬州过了四天多', () => {
    setState(newGame());
    const d0 = dayNo(S);
    play(PATHS[0], SKILLED, 1, true);
    expect(dayNo(S) - d0).toBeGreaterThanOrEqual(4);
    expect(dayNo(S) - d0).toBeLessThanOrEqual(6);
  });

  it('普通人的本领真有用：认得浅滩、放缆绳、敲破钟，对手更弱或来了帮手', () => {
    for (const [fid, flag] of [['kp_jiading', 'kp_qiantan'], ['kp_biaoshi', 'kp_lan'], ['kp_biaoshi', 'kp_zhong'], ['kp_zhuibing', 'kp_qiantan'], ['kp_zhuibing', 'kp_zhong']] as const) {
      setState(newGame());
      const f = foeById(fid)!;
      expect(activePrep(f)).toEqual([]);
      S.flags[flag] = true;
      expect(activePrep(f).length, `${fid} 带着 ${flag} 开打`).toBe(1);
    }
  });

  it('三场打的对手都是弱对手：开局的主角用乱点的打法也有一半上下打得赢', () => {
    for (const fid of ['kp_jiading', 'kp_biaoshi', 'kp_zhuibing']) {
      let win = 0;
      const N = 60;
      for (let seed = 1; seed <= N; seed++) {
        setState(newGame());
        const f = foeById(fid)!;
        const d = new Duel(heroSpec(S, fightKit(S), f), foeSpec(f, []), { rng: mulberry32(seed) });
        simulate(d, RANDOM);
        if (d.res === 'win') win++;
      }
      expect(win / N, `${fid} 乱点的胜率`).toBeGreaterThan(0.45);
    }
  });

  it('旧存档（没有 kp_xin）不受影响：旧序章的三段和两个对手还在，读到的还是旧说法', () => {
    for (const id of ['p_night', 'p_after1', 'p_death']) expect(storyById(id), id).toBeTruthy();
    for (const id of ['heiyi', 'heiyi2']) expect(foeById(id), id).toBeTruthy();
    setState(skipToYangzhou());
    delete S.flags.kp_xin;
    expect(S.chapter).toBe(1);
    expect(cond({ flag: 'kp_xin' })).toBe(false);
  });

  it('默认路径（冒烟脚本、机器玩家都按「第一个选项」往前点）：每条路的最后一张卡，第一个选项是登船；「再坐一会儿」只能排在后面', () => {
    for (const id of ['kp_du_hou', 'kp_wen_hou', 'kp_bu_hou']) {
      const def = storyById(id)!;
      const last = def.cards.at(-1)!;
      expect(last.choices[0].label, id).toContain('登船');
      expect(last.choices.map(c => c.label)).toContain('在焦船边再坐一会儿');
      expect(def.endChapter).toEqual({ small: '第一回', big: '扬州' });
    }
  });

  it('江伯不死：新序章里没有江伯下葬、临终的字眼', () => {
    const text = ['p_open', 'kp_du', 'kp_wen', 'kp_bu', 'kp_du_hou', 'kp_wen_hou', 'kp_bu_hou', 'p_skip']
      .map(id => JSON.stringify(storyById(id))).join('');
    for (const w of ['下葬', '埋了江伯', '掩埋', '江伯之墓', '坟前', '临终', '遗言', '遗物', '阴阳两隔', '咽气']) expect(text.includes(w), w).toBe(false);
  });

  it('新开局任何一屏刷新都回到新序章：断点存在存档里，接回去效果不重复，走完和不刷新一样', () => {
    for (const path of PATHS) for (const seed of [1, 2]) {
      setState(newGame());
      kpOpen(S, 'p_open', 0);
      let pos = kpPos(S);
      let reloads = 0;
      for (let guard = 0; guard < 200 && pos; guard++) {
        if (pos.kind === 'fight') {
          // 打到一半刷新：回来从头打这一场
          const f = foeById(pos.id)!;
          brace(f);
          const prep = activePrep(f);
          const d = new Duel(heroSpec(S, fightKit(S), f), foeSpec(f, prep), { rng: mulberry32(seed), allies: alliesOf(prep) });
          simulate(d, RANDOM);
          S.hp = Math.max(1, Math.round(d.hp));
          takeWounds(f, d.log.taken, d.res ?? undefined);
          const then = settle(f, d.res!, prep).r!.then!.find(e => e.type === 'story')!;
          kpOpen(S, (then as { id: string }).id, 0);
        } else {
          const def = storyById(pos.id)!;
          const card = def.cards[pos.i];
          const vis = card.choices.filter(c => cond(c.if));
          // 渡不渡选这条路；落水的人选「追」；本领的卡选第一个；其余第一个
          let k = 0;
          if (card.title === '渡不渡') k = path.at;
          if (card.title === '落水的人') k = vis.findIndex(x => x.label.includes('追'));
          const c = vis[k];
          const out: Outcome = newOutcome();
          if (card.input === 'name') S.name = '听雨';
          run(c.do, out);
          kpPick(S, pos.id, def.cards.length, out, c.next ?? pos.i + 1);
        }
        // 刷新：存档原样存下、原样读回
        setState(JSON.parse(JSON.stringify(S)));
        reloads++;
        pos = kpPos(S);
        if (S.chapter === 0) expect(pos, '序章没走完，断点不能丢').not.toBeNull();
      }
      expect(reloads).toBeGreaterThan(10);
      expect(S.chapter).toBe(1);
      expect(Object.keys(S.flags).filter(f => f.startsWith('kp_at:'))).toEqual([]);
      expect(S.items.jade, '玉佩只给一件').toBe(1);
      expect(S.items.scroll).toBe(1);
      expect(S.flags[path.flag]).toBe(true);
      expect(S.flags.kp_xin).toBe(true);
    }
  });

  it('旧序章中途的存档（没有断点旗标）不受影响：kpPos 为空，接着走旧序章', () => {
    setState(newGame());
    S.loc = 'gz_town';
    S.quests.prologue = 1;
    expect(kpPos(S)).toBeNull();
    setState(skipToYangzhou());
    expect(kpPos(S)).toBeNull();
  });

  it('府衙「故人问」分新旧两稿：旧存档读江伯临终的话，新开局读江伯不与官府沾边', () => {
    const old = JSON.stringify(storyById('fuya_jiangjia'));
    const xin = JSON.stringify(storyById('fuya_jiangjia_xin'));
    expect(old).toContain('江伯临终的话还在耳边：别信官府的人。');
    expect(old).toContain('他走了？');
    expect(xin).toContain('江伯向来不与官府沾边');
    expect(xin).toContain('他不见了？');
    expect(xin).not.toContain('临终');
  });
});
