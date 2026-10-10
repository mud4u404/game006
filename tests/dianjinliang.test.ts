/**
 * 掂斤两要说真话（Issue #546）：
 * 10-10 试玩两条——不入流被主线推去打屠千山，开战前显示「你 53% / 47% 对手 势均力敌」，
 * 结果 12 合就败，败后才说「对手是三流」；龙王庙四个打手，掂斤两说「他远不如你」，输了。
 *
 * 这三条把「说」钉住：差着档次就按档次说，人多就按总的掂量说，势条和掂斤两方向一致。
 */
import { describe, expect, it } from 'vitest';
import { S, newGame, setState } from '../src/core/state';
import { setNowMs } from '../src/core/time';
import { foeById } from '../src/content';
import type { FoeDef } from '../src/content/types';
import { kanren } from '../src/engine/zhaoshi';
import { tierNow } from '../src/engine/ren';

setNowMs(() => 1_700_000_000_000);

/** 屠千山：三流好手（rank 1.5，档次表里 floor(1.5) = 1 = 三流） */
const 屠千山 = foeById('tu')!;
/** 龙王庙那四个盐号打手：一条 foes 记着四个人，每个人都不强，加起来未必 */
const 盐号打手 = foeById('smcs_dashou')!;

/** 把玩家抬到三流：一门武功到第一重，功力也要够这一档的一半（person.ts 的 tierOf） */
const 抬到三流 = (): void => {
  for (const k of ['hanjiang', 'xinfa', 'taxue'] as const) S.skills[k] = { r: 2, p: 0 };
  // personOf 取的是装备槽上那门武功的境界，只改 skills 不够
  S.loadout = { ...S.loadout, fist: 'hanjiang', neigong: 'xinfa', qinggong: 'taxue', weapon: 'hanjiang' };
  S.gongli = Math.max(S.gongli, 10);
};

/** 把对手的档次改成想要的（不改内容，只在测试里造情形） */
const 档次对手 = (base: FoeDef, rank: number, id = `t${rank}`): FoeDef => ({ ...base, id, rank });

describe('掂斤两按档次说话', () => {
  it('不入流去掂三流：说「高你一档」，不说势均力敌', () => {
    setState(newGame());                       // 新开局：不入流
    expect(tierNow(S).t, '新开局该是不入流').toBeLessThan(1);
    const { say } = kanren(S, 屠千山);
    expect(say, `新入局掂三流的屠千山，说的却是「${say}」`).toContain('高你一档');
    expect(say).toContain('多半要输');
    expect(say).not.toMatch(/旗鼓相当|势均力敌|你胜面大些|深浅看不透/);
  });

  it('差两档说得更重：档数要写出来，不笼统说「一档」', () => {
    setState(newGame());
    const 高两档 = 档次对手(屠千山, 3);
    const { say } = kanren(S, 高两档);
    expect(say).toContain('高你');
    expect(say).toContain('3 档');
  });

  it('比自己高一档的对手：说「他不如你」', () => {
    setState(newGame());
    // 造一个不入流的对手（rank 0），新入局也是不入流——同档，另测
    const 同档 = 档次对手(屠千山, 0);
    const { say } = kanren(S, 同档);
    expect(say).not.toContain('不如你');          // 同档按胜率说，不按档次
    // 真高一档：玩家三流（练一门一品武功到第一重），对手不入流
    抬到三流();
    expect(tierNow(S).t, '功法到第一重、功力够，该升到三流').toBeGreaterThanOrEqual(1);
    const { say: s2 } = kanren(S, 档次对手(屠千山, 0, 't低一档'));
    expect(s2, `对手不入流、玩家三流，说的却是「${s2}」`).toContain('不如你');
  });

  it('一个人对四个打手：不说「他远不如你」', () => {
    setState(newGame());
    const 四个 = 档次对手(盐号打手, tierNow(S).t);   // 同一档的四个打手
    const 一个 = kanren(S, 四个).say;
    const 四个人的 = kanren(S, 四个, 40, false, 4).say;
    expect(一个, '一个人掂同档的对手，本来就该占上风').toMatch(/远不如你|不堪一击|胜面大些/);
    expect(四个人的, `四个人还掂出「${四个人的}」`).not.toMatch(/远不如你|不堪一击/);
  });

  it('势条和掂斤两方向一致：掂「多半要输」，势条就该偏向对手', () => {
    setState(newGame());
    const f = 档次对手(屠千山, tierNow(S).t + 1);   // 强制高一档
    const { p, say } = kanren(S, f);
    expect(say).toContain('多半要输');
    // 势条那条就是拿这个 p 去算的（src/ui/fight.ts 的 updMom 开打前用 odds = kanren(...).p）
    expect(p * 100, `掂斤两说多半要输，胜率却有 ${(p * 100).toFixed(0)}%`).toBeLessThan(50);
  });

  it('低一档：掂出来是占优，势条也不该偏向对手', () => {
    setState(newGame());
    抬到三流();
    const f = 档次对手(屠千山, 0, 't弱一档');
    const { p, say } = kanren(S, f);
    expect(say).toContain('不如你');
    expect(p * 100).toBeGreaterThan(50);
  });
});