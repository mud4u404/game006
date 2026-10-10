/**
 * 打听（engine/chuanwen.ts，Issue #263）：
 * - 开口前的样子按身份分组：没写声口的人也不该都一个腔调；
 * - 认身份看行当字样和地点的 life.tags，推不出来的归市井；
 * - 同一日同一条老话只给一个人说，换不出来就说「这几日太平得很」；
 * - 随机全归世界种子：同一个种子、同样的操作，一字不差。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { setNowMs } from '../src/core/time';
import { npc, shiById } from '../src/content';
import { DATING_LEAD, ask, gangOf, hearsay, shiRumor } from '../src/engine/chuanwen';

const T0 = 1791300000000;
beforeEach(() => {
  setNowMs(() => T0);
  setState(skipToYangzhou());
  S.min = 10 * 60;
});

/** 文本是「{名}{开口前的样子}：「{话}」」；把开口前的样子抠出来 */
const leadOf = (id: string): string => {
  const t = ask(id, { force: true }).text;
  return t.slice(npc(id)!.name.length, t.indexOf('：「'));
};

describe('开口的样子按身份分组', () => {
  it('了尘认作出家人', () => {
    expect(gangOf('liaochen')).toBe('sengdao');
    expect(gangOf('zhike')).toBe('sengdao');
  });
  it('各人认得出来，认不出的归市井', () => {
    expect(gangOf('ss_shuili')).toBe('guanchai');   // 税吏
    expect(gangOf('caobang')).toBe('jianghu');      // 佩刀汉子
    expect(gangOf('xsb_shifu')).toBe('shanghu');    // 布庄掌柜
    expect(gangOf('huagu')).toBe('shijing');        // 卖花姑娘，认不出
  });
  it('僧人打听一百次，开口的动作都出家人，不落市井组', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const lead = leadOf('liaochen');
      seen.add(lead);
      expect(DATING_LEAD.shijing, `第 ${i} 次用了市井的动作：${lead}`).not.toContain(lead);
      expect(DATING_LEAD.sengdao, `第 ${i} 次的动作不在僧道组：${lead}`).toContain(lead);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
  it('同一组里没有两句一样的动作', () => {
    for (const [g, list] of Object.entries(DATING_LEAD)) expect(new Set(list).size, g).toBe(list.length);
  });
  it('出家人那组里没有掰指头、吐草棍这种市井动作', () => {
    expect(DATING_LEAD.sengdao.join('')).not.toMatch(/掰着指头|草棍|咂了咂嘴/);
  });
});

/** 清掉扬州已有的传闻与见闻，再按给定步子造几条（造出来的 news 各不相同） */
const fresh = (steps: [string, string][]): void => {
  S.heard = [];
  for (const r of Object.keys(S.w.rumor)) delete S.w.rumor[r];
  for (const [shi, ph] of steps) {
    delete S.shi?.[shi];
    shiRumor(shiById(shi)!, ph, dayAt(), false);
  }
};
const dayAt = (): number => Math.floor((S.year * 360 + (S.month - 1) * 30 + S.day) * 1440) + S.min;

/** 三个没有声口、也不认识什么事的人（打听只能落到 hearsay） */
const VOICELESS = ['qichi', 'yz_jj1', 'yz_jj3'];
const forgetAll = (): void => { for (const id of VOICELESS) delete S.w.ppl[id]?.know; };

describe('同一日同一条老话只给一个人说', () => {
  it('连着问三个没声口的人，三句老话互不相同', () => {
    fresh([['ss_matou', 'qi'], ['ss_matou', 'duizhi'], ['ss_zei', 'qi']]);
    forgetAll();
    const said = VOICELESS.map(id => ask(id, { force: true }));
    for (const r of said) expect(r.src, `${r.text}`).toBe('old');
    const texts = said.map(r => r.text.replace(/^.*「|」$/g, ''));
    expect(new Set(texts).size, `三个人说了同样的老话：${texts.join(' / ')}`).toBe(3);
  });

  it('三条换完了就说「这几日太平得很」，不把同一条又说一遍', () => {
    fresh([['ss_matou', 'qi'], ['ss_matou', 'duizhi'], ['ss_zei', 'qi']]);
    forgetAll();
    const a = hearsay();
    const b = hearsay();
    const c = hearsay();
    expect([a, b, c].every(Boolean)).toBe(true);
    expect(new Set([a, b, c]).size).toBe(3);
    expect(hearsay()).toBeNull();
    const last = ask('qichi', { force: true });
    expect(last.src).toBe('none');
    expect(last.text).toContain('这几日太平得很');
  });

  it('隔天再说，昨儿说过的老话又能拿回来', () => {
    fresh([['ss_matou', 'qi'], ['ss_matou', 'duizhi'], ['ss_zei', 'qi']]);
    forgetAll();
    const a = hearsay();
    S.day += 1;
    S.heard = [];
    expect(hearsay()).toBe(a);
  });
});

describe('随机归种子：同一个种子、同样的操作，一字不差', () => {
  const play = (): string => {
    setState(skipToYangzhou());
    S.min = 10 * 60;
    fresh([['ss_matou', 'qi'], ['ss_matou', 'duizhi'], ['ss_zei', 'qi']]);
    forgetAll();
    const out = VOICELESS.map(id => ask(id, { force: true }).text);
    for (let i = 0; i < 8; i++) out.push(leadOf('liaochen'), String(hearsay()));
    return JSON.stringify({ out, asked: S.asked, heard: S.heard });
  };

  it('跑两遍一字不差', () => {
    expect(play()).toBe(play());
  });
});