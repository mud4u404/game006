/**
 * 新开局「瓜洲夜雨」（docs/kaipian.md）：三条路都走得通、走完是同一个样子（扬州、第一回、江伯生死未卜），
 * 三场弱对手的打主角不会死、普通人的本领真的让对手变弱，旧存档（没有 kp_xin）读到的还是旧说法。
 */
import { describe, expect, it } from 'vitest';
import { S, newGame, setState, skipToYangzhou } from '../src/core/state';
import { dayNo, setNowMs } from '../src/core/time';
import { NPCS, foeById, itemById, storyById } from '../src/content';
import { newOutcome, run, test as cond, type Outcome } from '../src/engine/dsl';
import { Duel, RANDOM, SKILLED, simulate, type Policy } from '../src/engine/duel';
import { activePrep, alliesOf, fightKit, foeSpec, heroSpec } from '../src/engine/zhaoshi';
import { brace, settle, takeWounds } from '../src/engine/jiesuan';
import { mulberry32 } from '../src/engine/rng';
import { kpBiguanTip, kpOpen, kpPick, kpPos } from '../src/engine/kaipian';
import { act, roomNpcs } from '../src/engine/world';
import { questNav } from '../src/engine/daohang';
import { weaponReady } from '../src/engine/wuxue';

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
          expect(tr.stories.at(-1)!.startsWith(`${path.flag}_hou`), `最后一段是 ${tr.stories.at(-1)}`).toBe(true);
        }
      }
    });
  }

  it('「不渡」的三条小路，每条都至少付出一样（Issue #533：留在船上那条原来白拿）', () => {
    /** 走一遍「不渡」，落水的人那张卡选哪一支 */
    const 走不渡 = (选: string) => {
      setState(newGame());
      const tr: Trace = { stories: [], fights: [], clicks: 0, results: {} };
      walk('p_open', (t, ls) => (t === '渡不渡' ? 2 : t === '落水的人' ? ls.findIndex(x => x.includes(选)) : 0), SKILLED, 1, tr);
      return tr;
    };

    // 一、下水救他：得褚七相谈甚欢，代价是气血掉下去（打的硬仗）
    const 救 = 走不渡('下水救');
    expect(救.fights.length, '下水救他不用打').toBe(0);
    const 救了 = JSON.parse(JSON.stringify(S));
    expect(救了.rel.kp_chu, '救了他，褚七该记着').toBe('相谈甚欢');

    // 二、留在船上：不动 xia（Issue #533），代价落在江伯身上——他一夜没动，看在眼里
    setState(newGame());
    const 留 = newGame();
    walk('p_open', (t, ls) => (t === '渡不渡' ? 2 : t === '落水的人' ? ls.findIndex(x => x.includes('留在船上')) : 0), SKILLED, 1, { stories: [], fights: [], clicks: 0, results: {} });
    expect(S.rel.jiangbo, '缩在船上不动，江伯该淡下来').not.toBe(留.rel.jiangbo);
    expect(S.rel.jiangbo, '留在船上付出的代价是关系').toBe('点头之交');

    // 三、追上去打输：褚七被人带走，人没了
    const 追 = 走不渡('沿着江堤追');
    expect(追.fights.length, '追上去要打一场').toBe(1);
  });

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

  it('默认路径（冒烟脚本、机器玩家都按「第一个选项」往前点）：每条路的最后一张卡，第一个选项是登船；「再坐一会儿」在天明那张卡上、只能排在后面', () => {
    for (const id of ['kp_du_hou', 'kp_wen_hou', 'kp_bu_hou']) {
      const def = storyById(id)!;
      const last = def.cards.at(-1)!;
      expect(last.choices[0].label, id).toContain('登船');
      // 第四稿：「再坐一会儿」在倒数第二张（天明）上，去路和登船并成了最后一张
      const dawn = def.cards.at(-2)!;
      expect(dawn.choices.map(c => c.label)).toContain('在焦船边再坐一会儿');
      expect(dawn.choices[0].label, id).not.toContain('再坐');
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


/** 玩到扬州：第一夜选哪条路（bu_jiu：不渡的路上下水救人；bu_liu：留在船上，没救） */
function arrive(which: 'du' | 'wen' | 'bu_jiu' | 'bu_liu'): void {
  const at = { du: 0, wen: 1, bu_jiu: 2, bu_liu: 2 }[which];
  // 打赢的那一遍才算（赢、输、逃记的关系不同，这里的断言都按打赢写）：换个种子，打到赢为止
  for (let seed = 1; seed <= 30; seed++) {
    setState(newGame());
    const tr: Trace = { stories: [], fights: [], clicks: 0, results: {} };
    walk('p_open', (t, ls) => t === '渡不渡' ? at : t === '落水的人' ? ls.findIndex(x => x.includes(which === 'bu_jiu' ? '下水救' : '留在船上')) : 0, SKILLED, seed, tr);
    expect(S.chapter).toBe(1);
    if (Object.values(tr.results).every(r => r === 'win')) return;
  }
  throw new Error(`${which} 三十个种子都没打赢`);
}
const atHour = (h: number): void => { S.min = h * 60; };
const lifeOf = (id: string) => NPCS.find(n => n.id === id)?.life;

describe('第三稿：序章的人进扬州，关系按路记账', () => {
  it('渡：褚七在运河渡口入夜扛包，相谈甚欢，欠你一条命；卫衡白天在湖畔访人、夜里在广陵客栈，心存芥蒂', () => {
    arrive('du');
    expect(S.rel.kp_chu).toBe('相谈甚欢');
    expect(S.relNote?.kp_chu).toBe('欠你一条命');
    expect(S.rel.kp_wei).toBe('心存芥蒂');
    expect(S.relNote?.kp_wei).toBe('你渡了他要找的人');
    atHour(23); expect(roomNpcs('dukou')).toContain('kp_chu');
    atHour(12); expect(roomNpcs('dukou')).not.toContain('kp_chu');
    atHour(11); expect(roomNpcs('hu')).toContain('kp_wei');
    atHour(19); expect(roomNpcs('jc_yz_kezhan')).toContain('kp_wei');
    atHour(19); expect(roomNpcs('hu')).not.toContain('kp_wei');
    // 头一回交谈：说卫家的人在找他；再谈一回，相谈甚欢以上才肯说「雇他的人左手使刀」
    atHour(23);
    const t1 = act('kp_chu', '交谈').text;
    expect(t1).toContain('卫家');
    expect(S.flags.kp_chu_zuo).toBeUndefined();
    // 第五稿：他要知道卫衡在找他（风声以后）才肯说，之前再谈也不说
    expect(act('kp_chu', '交谈').text).not.toContain('使刀的是左手');
    run([{ type: 'shi', id: 'kp_xun', to: 'feng' }]);
    const t2 = act('kp_chu', '交谈').text;
    expect(t2).toContain('左手');
    expect(S.flags.kp_chu_zuo).toBe(true);
    expect(act('kp_wei', '交谈').text).toContain('那人在哪里');
  });

  it('请二位上船：卫衡点头之交（那夜站在一边），褚七心存芥蒂（当着卫衡的面逼他认了旧账），不肯说左手的事', () => {
    arrive('wen');
    expect(S.rel.kp_wei).toBe('点头之交');
    expect(S.relNote?.kp_wei).toBe('那夜你和他站在一边');
    expect(S.rel.kp_chu).toBe('心存芥蒂');
    expect(S.relNote?.kp_chu).toBe('当着卫衡的面，你逼他认了旧账');
    atHour(23); expect(roomNpcs('dukou')).toContain('kp_chu');
    expect(act('kp_chu', '交谈').text).toContain('各走各的路');
    for (let i = 0; i < 3; i++) expect(act('kp_chu', '交谈').text).not.toContain('使刀的是左手');
    expect(S.flags.kp_chu_zuo).toBeUndefined();
    expect(act('kp_wei', '交谈').text).toContain('多亏你把两边拉住');
  });

  it('不渡、下水救了人：褚七在扬州，相谈甚欢，水里捞上来的命；卫衡素不相识，却认得你', () => {
    arrive('bu_jiu');
    expect(S.flags.kp_jiu).toBe(true);
    expect(S.rel.kp_chu).toBe('相谈甚欢');
    expect(S.relNote?.kp_chu).toBe('水里捞上来的命');
    expect(S.rel.kp_wei).toBe('素不相识');
    atHour(23); expect(roomNpcs('dukou')).toContain('kp_chu');
    expect(act('kp_chu', '交谈').text).toContain('水里捞上来的命');
    expect(act('kp_wei', '交谈').text).toContain('没渡人的那个');
  });

  it('不渡、没救：褚七不在扬州（夜里也不在码头），卫衡照旧认得你；卞婆婆提一句下游捞起过一个人，没说死活', () => {
    arrive('bu_liu');
    expect(S.flags.kp_jiu).toBeUndefined();
    expect(S.rel.kp_chu).toBeUndefined();
    atHour(23); expect(roomNpcs('dukou')).not.toContain('kp_chu');
    atHour(19); expect(roomNpcs('jc_yz_kezhan')).toContain('kp_wei');
    atHour(9); expect(roomNpcs('gz_home')).toContain('kp_bian');
    const t = act('kp_bian', '交谈').text;
    expect(t).toContain('捞起过一个人');
    expect(t).not.toContain('死了');
    expect(t).not.toContain('活着');
    expect(t).not.toContain('船钱的事，不提了');
  });

  it('三条路上卞婆婆都在瓜洲，回瓜洲说焦船后来怎样；序章里不再有「船钱的事，不提了」那份好处', () => {
    for (const w of ['du', 'wen', 'bu_jiu'] as const) {
      arrive(w);
      atHour(9);
      expect(roomNpcs('gz_home'), w).toContain('kp_bian');
      expect(act('kp_bian', '交谈').text, w).toContain('烧剩一副骨架');
    }
    const all = JSON.stringify(['kp_du_hou', 'kp_wen_hou', 'kp_bu_hou'].map(id => storyById(id)));
    expect(all).not.toContain('船钱的事，不提了');
  });

  it('新人物都写了诉求和所知（want、knows）：褚七的 knows 里有「左手」，卫衡的 want 里有找褚七；idle 最后一条不带条件', () => {
    expect(lifeOf('kp_chu')?.knows?.some(k => k.secret && k.text.includes('左手'))).toBe(true);
    expect(lifeOf('kp_wei')?.want?.some(w => w.text.includes('独臂镖师'))).toBe(true);
    for (const id of ['kp_chu', 'kp_wei', 'kp_bian']) expect(lifeOf(id)?.voice.idle.at(-1)?.if, `${id} 的 idle 最后一条要不带条件`).toBeUndefined();
  });

  it('腰牌有人读：卫衡、周捕头各说一句（不渡的路上才有这块牌子），各只说一回', () => {
    arrive('bu_jiu');
    expect(S.items.kp_yaopai).toBe(1);
    expect(act('kp_wei', '交谈').text).toContain('没渡人的那个');
    expect(act('kp_wei', '交谈').text).toContain('黑风寨');
    expect(S.flags.kp_wei_pai).toBe(true);
    expect(act('fuya_zhou', '交谈').text).toContain('黑风寨');
    expect(S.flags.kp_zhou_pai).toBe(true);
    expect(act('kp_wei', '交谈').text).not.toContain('水路，丙');
    expect(act('fuya_zhou', '交谈').text).not.toContain('牌是真的');
  });
});

describe('第三稿：三场打分胜负', () => {
  const FOES3: [string, string][] = [['kp_jiading', 'kp_du_hou'], ['kp_biaoshi', 'kp_wen_hou'], ['kp_zhuibing', 'kp_bu_hou']];

  it('打赢、打输、逃开各接一张不同的卡，三段后文都走到扬州', () => {
    for (const [fid, story] of FOES3) {
      const f = foeById(fid)!;
      const to = (res: 'win' | 'lose' | 'flee'): string => {
        setState(newGame());
        const r = settle(f, res, []).r!;
        return (r.then!.find(e => e.type === 'story') as { id: string }).id;
      };
      const ids = [to('win'), to('lose'), to('flee')];
      expect(new Set(ids).size, `${fid} 三种收场接同一段`).toBe(3);
      for (const id of ids) expect(id.startsWith(story), id).toBe(true);
      const firsts = ids.map(id => JSON.stringify(storyById(id)!.cards[0]));
      expect(new Set(firsts).size, `${fid} 三种收场第一张卡一样`).toBe(3);
      for (const id of ids) {
        const def = storyById(id)!;
        expect(def.endChapter).toEqual({ small: '第一回', big: '扬州' });
        expect(def.cards.at(-1)!.choices[0].label).toContain('登船');
      }
    }
  });

  it('逃开的那张卡：江伯出手收场，不写「脱手」（没有打赢）；打赢的那张，鱼叉才脱手', () => {
    for (const id of ['kp_du_hou_flee', 'kp_wen_hou_flee', 'kp_bu_hou_flee']) {
      const def = storyById(id)!;
      expect(JSON.stringify(def.cards[0]), id).toContain('江伯');
      expect(JSON.stringify(def.cards[0]), id).not.toContain('脱手');
    }
    expect(JSON.stringify(storyById('kp_wen_hou')!.cards[0])).toContain('鱼叉脱手');
  });

  it('请二位上船输、逃两张卡明说鱼叉，不再写「那家伙」', () => {
    for (const id of ['kp_wen_hou_lose', 'kp_wen_hou_flee']) {
      const first = JSON.stringify(storyById(id)!.cards[0]);
      expect(first, id).toContain('鱼叉当啷落在船板上');
      expect(first, id).not.toContain('家伙');
    }
  });

  it('对手的应对框和弱对手对得上：重招的判断句不写「快得惊人」「远在你之上」', () => {
    for (const fid of ['kp_jiading', 'kp_biaoshi', 'kp_zhuibing']) {
      for (const t of foeById(fid)!.tells) {
        expect(t.judge, `${fid}「${t.name}」`).toBeTruthy();
        expect(t.judge).not.toMatch(/快得惊人|远在你之上|内劲极沉/);
      }
    }
  });

  it('三场打的重招、破绽词、招式点缀各写各的，不共用', () => {
    const fs = ['kp_jiading', 'kp_biaoshi', 'kp_zhuibing'].map(id => foeById(id)!);
    const op = fs.flatMap(f => f.opening ?? []);
    expect(new Set(op).size, '破绽词有重复').toBe(op.length);
    const tl = fs.flatMap(f => f.tells.map(t => t.name));
    expect(new Set(tl).size).toBe(tl.length);
    const fl = fs.flatMap(f => f.flourish ?? []);
    expect(new Set(fl).size, '招式点缀有重复').toBe(fl.length);
  });

  it('普通人的本领在开打前单写一行（先手在你）；「渡口长大的人」全篇只留一处', () => {
    for (const id of ['kp_du', 'kp_wen', 'kp_bu']) {
      for (const card of storyById(id)!.cards) for (const c of card.choices) {
        // 开打的选项才要写先手（第五稿：下水救他也置 kp_qiantan，那里不打，只是认得浅滩）
        if (/kp_(qiantan|lan|zhong)/.test(JSON.stringify(c.do ?? [])) && JSON.stringify(c.do).includes('"type":"fight"')) {
          expect(c.result, `${id}「${c.label}」`).toContain('\n先手在你：');
          expect(c.sub ?? '').not.toContain('渡口长大的人');
        }
      }
    }
    const text = JSON.stringify([...['kp_du', 'kp_wen', 'kp_bu'].map(id => storyById(id)), ...['kp_jiading', 'kp_biaoshi', 'kp_zhuibing'].map(id => foeById(id))]);
    expect(text.split('渡口长大的人').length - 1).toBeLessThanOrEqual(1);
  });
});

describe('第三稿：见闻簿、了尘、木剑、跳过序章、闭关提示', () => {
  it('见闻簿：新档的心事是江伯的下落，三条路各记一条「那夜听来的」；旧档心事的写法不变', () => {
    for (const [w, key] of [['du', '带路的人，就是他自己'], ['wen', '使左手的后生'], ['bu_jiu', '黑风']] as const) {
      arrive(w);
      const n = questNav('main1')!;
      expect(n.title, w).toBe('江伯去了哪里');
      expect(n.hint).toContain('扬州，大明寺，了尘');
      expect(n.hint).toContain('没人说得准');
      expect(n.notes.length, w).toBe(1);
      expect(n.notes[0]).toContain('那夜听来的');
      expect(n.notes[0]).toContain(key);
    }
    setState(skipToYangzhou());
    delete S.flags.kp_xin; delete S.flags.kp_du;
    const old = questNav('main1')!;
    expect(old.title).toBe('寻访大明寺了尘大师');
    expect(old.hint).toContain('这是你手里仅有的一条去路');
    expect(old.notes).toEqual([]);
  });

  it('了尘：新档先白给一层，再把屠千山说成「线」，不再是价钱；主线进第一阶段不变；旧档一字不动', () => {
    arrive('du');
    S.loc = 'daming';
    const t = act('liaochen', '交谈').text;
    expect(t).toContain('旧识');
    expect(t).toContain('旧账');
    expect(t).toContain('顺着那夜的线往下找');
    expect(t).toContain('木剑');
    expect(t).not.toContain('你想知道的事');
    expect(S.quests.main1).toBe(1);
    expect(questNav('main1')!.hint).toContain('顺着那夜的线往下找');
    // 旧档：没有 kp_xin，读到的是原来的话
    setState(skipToYangzhou());
    delete S.flags.kp_xin;
    const o = act('liaochen', '交谈').text;
    expect(o).toBe('了尘大师看见你腰间那半块玉佩，扫帚停在半空，良久才道：「江老三……终究还是走了么。」他双手合十：「黑风寨主屠千山这些日子霸着运河渡口，那三船盐是漕帮兄弟半年的血汗。施主若能截住他，老衲便把你想知道的事，原原本本说给你听。」他看了看你握剑的手，又道：「不必急在今日。那人刀下没有庸手，施主先掂一掂自己的斤两。」');
    expect(S.quests.main1).toBe(1);
  });

  it('木剑：新档开局带的是木剑，不是青锋剑；兵器类、比青锋剑便宜，寒江剑法照样使得出来', () => {
    setState(newGame());
    expect(S.items.kp_mujian).toBe(1);
    expect(S.items.qingfeng).toBeUndefined();
    expect(S.gear).toEqual({ weapon: 'kp_mujian' });
    const mu = itemById('kp_mujian')!, qing = itemById('qingfeng')!;
    expect(mu.kind).toBe('装备');
    expect(mu.equip).toMatchObject({ slot: '兵器', weapon: '剑' });
    expect(mu.price!).toBeLessThan(qing.price!);
    expect(S.loadout.weapon).toBe('hanjiang');
    expect(weaponReady(S), '拿着木剑，寒江剑法使得出来').toBe(true);
    setState(skipToYangzhou());
    expect(S.gear).toEqual({ weapon: 'kp_mujian', waist: 'jade', head: 'kp_douli' });
    expect(weaponReady(S)).toBe(true);
    expect(S.items.qingfeng).toBeUndefined();
    // 童年三忆里交代了木剑的来历
    expect(JSON.stringify(storyById('p_open'))).toContain('江伯削的那柄木剑');
  });

  it('跳过序章与「渡」那条路走完的结果一致：银两、历练、侠义、药、兵器、旗标、关系和备注', () => {
    arrive('du');
    const played = JSON.parse(JSON.stringify(S));
    const skip = skipToYangzhou();
    expect(skip.silver).toBe(played.silver);
    expect(skip.lilian).toBe(played.lilian);
    expect(skip.xia).toBe(played.xia);
    expect(skip.items).toEqual(played.items);
    expect(skip.gear).toEqual(played.gear);
    expect(skip.quests).toEqual(played.quests);
    expect(skip.chapter).toBe(played.chapter);
    expect(skip.loc).toBe(played.loc);
    for (const f of ['kp_du', 'kp_xin', 'kp_chu_name']) expect(skip.flags[f], f).toBe(played.flags[f]);
    expect(skip.rel.kp_chu).toBe(played.rel.kp_chu);
    expect(skip.rel.kp_wei).toBe(played.rel.kp_wei);
    expect(skip.relNote).toEqual(played.relNote);
    // 跳过的也碰得到褚七
    setState(skip);
    atHour(23); expect(roomNpcs('dukou')).toContain('kp_chu');
  });

  it('闭关的提示只出一次：第一次歇脚（或走满十步）还没闭关过才提，提过不再提，闭关过的不提，旧档不提', () => {
    setState(skipToYangzhou());
    expect(kpBiguanTip(S, 'rest')).toContain('闭关');
    expect(kpBiguanTip(S, 'rest')).toBeNull();
    expect(kpBiguanTip(S, 'walk')).toBeNull();
    // 走满十步
    setState(skipToYangzhou());
    for (let i = 0; i < 9; i++) expect(kpBiguanTip(S, 'walk'), `第 ${i + 1} 步`).toBeNull();
    expect(kpBiguanTip(S, 'walk')).toContain('闭关');
    for (let i = 0; i < 12; i++) expect(kpBiguanTip(S, 'walk')).toBeNull();
    expect(kpBiguanTip(S, 'rest')).toBeNull();
    // 闭关过了
    setState(skipToYangzhou());
    S.feed.unshift({ t: '出关', x: '闭关三日', n: 0 });
    expect(kpBiguanTip(S, 'rest')).toBeNull();
    // 旧档
    setState(skipToYangzhou());
    delete S.flags.kp_xin;
    expect(kpBiguanTip(S, 'rest')).toBeNull();
    // 序章里不提
    setState(newGame());
    expect(kpBiguanTip(S, 'rest')).toBeNull();
  });
});


describe('第三稿补：序章打的胜负有后果', () => {
  /** 一条路走完某一段「后文」（赢、输、逃各一段），读它记下的关系和备注 */
  function after(id: string): { rel: Record<string, string>; note: Record<string, string> } {
    setState(newGame());
    walk(id, () => 0, SKILLED, 1, { stories: [], fights: [], clicks: 0, results: {} });
    return { rel: { ...S.rel }, note: { ...(S.relNote ?? {}) } };
  }
  const trio = (_path: string, who: string, ids: string[]) => ids.map(id => { const r = after(id); return `${r.rel[who] ?? '无'}|${r.note[who] ?? '无'}`; });

  it('渡：赢记「欠你一条命」，输记「替他挨了一棍」，逃开不记恩（关系降一档，备注如实）', () => {
    const [win, lose, flee] = ['kp_du_hou', 'kp_du_hou_lose', 'kp_du_hou_flee'].map(after);
    expect(win.rel.kp_chu).toBe('相谈甚欢');
    expect(win.note.kp_chu).toBe('欠你一条命');
    expect(lose.rel.kp_chu).toBe('相谈甚欢');
    expect(lose.note.kp_chu).toBe('你替他挨了一棍');
    expect(flee.rel.kp_chu).toBe('点头之交');
    expect(flee.note.kp_chu).toBe('那夜你躲进了舱里，是江伯救的他');
    expect(new Set(trio('du', 'kp_chu', ['kp_du_hou', 'kp_du_hou_lose', 'kp_du_hou_flee'])).size).toBe(3);
    // 逃开的整段后文里，不说「欠你一条命」「记在你头上」
    const t = JSON.stringify(storyById('kp_du_hou_flee'));
    expect(t).not.toContain('欠你一条命');
    expect(t).not.toContain('记在你头上');
    expect(t).toContain('不记在你名下');
  });

  it('请二位上船：赢、输、逃对卫衡、褚七记的备注各不相同', () => {
    const ids = ['kp_wen_hou', 'kp_wen_hou_lose', 'kp_wen_hou_flee'];
    expect(new Set(trio('wen', 'kp_wei', ids)).size).toBe(3);
    expect(new Set(trio('wen', 'kp_chu', ids)).size).toBe(3);
    expect(after(ids[0]).note.kp_wei).toBe('那夜你和他站在一边');
  });

  it('不渡：堤下那一场赢、输、逃，记在卫衡那里的备注各不相同；只有赢了褚七才在扬州', () => {
    const ids = ['kp_bu_hou_win', 'kp_bu_hou_lose', 'kp_bu_hou_flee'];
    expect(new Set(trio('bu', 'kp_wei', ids)).size).toBe(3);
    // 打赢的那条路，褚七的人情在打赢那一刻就记下了（foes 的 win 结算）；输、逃的结算不记
    for (const id of ids.slice(1)) expect(after(id).rel.kp_chu, id).toBeUndefined();
  });

  it('渡、请二位上船两条路的六段后文，没有哪两段记下一样的关系和备注', () => {
    const all = ['kp_du_hou', 'kp_du_hou_lose', 'kp_du_hou_flee', 'kp_wen_hou', 'kp_wen_hou_lose', 'kp_wen_hou_flee'];
    const keys = all.map(id => JSON.stringify([after(id).rel.kp_chu, after(id).note.kp_chu, after(id).rel.kp_wei, after(id).note.kp_wei]));
    expect(new Set(keys).size).toBe(all.length);
  });
});

describe('第三稿补：玉佩、斗笠直接戴上', () => {
  it('新档走完序章：玉佩挂在腰间（佩），斗笠戴在头上（冠），木剑仍在手里；三条路都一样', () => {
    for (const which of ['du', 'wen', 'bu_jiu', 'bu_liu'] as const) {
      arrive(which);
      expect(S.gear, which).toEqual({ weapon: 'kp_mujian', waist: 'jade', head: 'kp_douli' });
    }
  });
  it('跳过序章的和走完一遍一样；斗笠放得进「冠」位，没有数值', () => {
    setState(skipToYangzhou());
    expect(S.gear).toEqual({ weapon: 'kp_mujian', waist: 'jade', head: 'kp_douli' });
    const d = itemById('kp_douli')!;
    expect(d.equip).toEqual({ slot: '冠' });
  });
  it('旧存档不动：没有 kp_xin 的旧序章路径，玉佩只进行囊、不自动戴上', () => {
    setState(newGame());
    run(storyById('p_death')!.cards[1].choices[0].do);
    expect(S.items.jade).toBe(1);
    expect(S.gear.waist).toBeUndefined();
  });
  it('wear 效果：行囊里没有的、不是装备的，什么也不做', () => {
    setState(newGame());
    run([{ type: 'wear', id: 'jade' }, { type: 'wear', id: 'med' }, { type: 'wear', id: 'nobody' }]);
    expect(S.gear).toEqual({ weapon: 'kp_mujian' });
    run([{ type: 'item', id: 'jade', delta: 1 }, { type: 'wear', id: 'jade' }]);
    expect(S.gear.waist).toBe('jade');
  });
});

describe('第三稿补：主线心事标题、文字', () => {
  it('和了尘谈完后，新档的心事标题仍以江伯为主；旧档不动', () => {
    arrive('du');
    S.loc = 'daming';
    act('liaochen', '交谈');
    expect(S.quests.main1).toBe(1);
    const n = questNav('main1')!;
    expect(n.title).toBe('江伯去了哪里：顺着那夜的线，去运河渡口截黑风寨的船');
    setState(skipToYangzhou());
    delete S.flags.kp_xin;
    S.quests.main1 = 1;
    expect(questNav('main1')!.title).toBe('前往运河渡口，截住黑风寨主');
  });

  it('卫衡：露天白日里说得通（不「就着灯」），渡路请你告诉他，不是「只当没看见」；腰牌那句不再说「追在你后头」', () => {
    const wei = JSON.stringify(NPCS.find(n => n.id === 'kp_wei')!.actions);
    expect(wei).not.toContain('就着灯');
    expect(wei).not.toContain('白日里晚辈在城里访人');
    expect(wei).not.toContain('只当没看见');
    expect(wei).toContain('还请告诉晚辈一声');
    expect(wei).not.toContain('追在你后头');
  });
});
