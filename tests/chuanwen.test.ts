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
import { NPCS, npc, room, shiById } from '../src/content';
import { DATING_LEAD, ask, gangOf, hearsay, roomsOf, shiRumor } from '../src/engine/chuanwen';

const T0 = 1791300000000;
beforeEach(() => {
  setNowMs(() => T0);
  setState(skipToYangzhou());
  S.min = 10 * 60;
});

/** 文本是「{名}{开口前的样子}，道：「{话}」」（写过声口的）或「{名}{开口前的样子}：「{话}」」
 *  （没写声口、落分组默认的）；把开口前的样子抠出来。取先出现的那个分隔。 */
const leadOf = (id: string): string => {
  const t = ask(id, { force: true }).text;
  const cuts = [t.indexOf('，道：'), t.indexOf('：「')].filter(i => i >= 0);
  return t.slice(npc(id)!.name.length, Math.min(...cuts));
};

/** 扬州还没写 life 的出家人：分组默认只对他们生效（见引擎 open：有 life 用自己的，
 *  没有才落 DATING_LEAD[gang]）。按 gangOf 和 life 现挑，不写死人名：
 *  谁哪天补了活气，这条用例自己就换人，不用回来改测试。 */
const SENGDAO_BARE: string[] = NPCS
  .filter(n => !n.life && gangOf(n.id) === 'sengdao' && roomsOf(n.id).some(r => room(r)?.region === 'yz'))
  .map(n => n.id);

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
    expect(SENGDAO_BARE.length, '扬州该有没写声口的出家人').toBeGreaterThan(0);
    const id = SENGDAO_BARE[0];
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const lead = leadOf(id);
      seen.add(lead);
      expect(DATING_LEAD.shijing, `第 ${i} 次用了市井的动作：${lead}`).not.toContain(lead);
      expect(DATING_LEAD.sengdao, `第 ${i} 次的动作不在僧道组：${lead}`).toContain(lead);
    }
    // 没得说时那句按人按日定：一天里同一个人开口的动作不跳（这句不抽世界随机，见 plainPick）
    expect(seen.size).toBe(1);
  });
  it('同一个人隔天再问，开口的动作换一个', () => {
    const id = SENGDAO_BARE[0];
    const first = leadOf(id);
    let changed = false;
    for (let d = 1; d <= 30 && !changed; d++) {
      S.day += 1;
      changed = leadOf(id) !== first;
    }
    expect(changed, `一个月里都是「${first}」`).toBe(true);
  });
  it('写了声口的人用自己的动作，不落分组默认', () => {
    // 了尘写过声口（#269 的内容包），他开口用的是自己那几句，不是 DATING_LEAD.sengdao
    const own = npc('liaochen')!.life!.voice!.lead!;
    for (let i = 0; i < 50; i++) {
      const lead = leadOf('liaochen');
      expect(own, `第 ${i} 次的动作「${lead}」不在他自己的声口里`).toContain(lead);
    }
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

/** 三个没有声口、也不认识什么事的人（打听只能落到 hearsay）。
 *  按 lifeOf 为空现挑，不写死人名：谁哪天补了活气，这条用例自己就换人，不用回来改测试 */
const VOICELESS: string[] = NPCS
  .filter(n => !n.life && !n.obj && roomsOf(n.id).some(r => room(r)?.region === 'yz'))
  .slice(0, 3)
  .map(n => n.id);
/** 第四个人：「三条换完了」那几条用例要的。一样按 lifeOf 为空现挑，但必须是另外三个之外的，
 *  否则第四个人就是第三个人，去重那条的结论就不成立。棋痴从 #279 起有了声口，不能再写死他的名字。 */
const VOICELESS4: string = NPCS
  .filter(n => !n.life && !n.obj && roomsOf(n.id).some(r => room(r)?.region === 'yz'))
  .map(n => n.id)
  .find(id => !VOICELESS.includes(id))!;
const forgetAll = (): void => { for (const id of [...VOICELESS, VOICELESS4]) delete S.w.ppl[id]?.know; };

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
    const said = VOICELESS.map(id => ask(id, { force: true }));
    for (const r of said) expect(r.src, `${r.text}`).toBe('old');
    expect(new Set(said.map(r => r.text.replace(/^.*「|」$/g, ''))).size).toBe(3);
    // 扬州只有三条传闻可听，问完第四个人就说没得说了
    const last = ask(VOICELESS4, { force: true });
    expect(last.src).toBe('none');
    expect(last.text).toContain('这几日太平得很');
  });

  it('去重只管打听：说书人的打赏、效果 news 那条路仍照旧拿最耸动的一条', () => {
    fresh([['ss_matou', 'qi'], ['ss_matou', 'duizhi'], ['ss_zei', 'qi']]);
    forgetAll();
    // 打听说过的，记在 S.asked 的「旧话:」前缀键下
    ask(VOICELESS4, { force: true });
    const saidKeys = Object.keys(S.asked ?? {}).filter(k => k.startsWith('旧话:'));
    expect(saidKeys.length).toBe(1);
    expect(saidKeys[0]).not.toBe(VOICELESS4);
    // hearsay 本身不替这一路做主：把见闻清掉，三条老话它照样一条不落地发得出去
    S.heard = [];
    const all = [hearsay(), hearsay(), hearsay()];
    expect(all.every(Boolean)).toBe(true);
    expect(new Set(all).size).toBe(3);
  });

  it('「旧话:」的键跟着 ask 那套按日清理一起走，不跨日留到明天', () => {
    fresh([['ss_matou', 'qi'], ['ss_matou', 'duizhi'], ['ss_zei', 'qi']]);
    forgetAll();
    (S.asked ??= {})['旧话:隔天的老账'] = 0;
    expect(S.asked!['旧话:隔天的老账']).toBe(0);
    // 不用 force：清理就走玩家平时那条路
    ask(VOICELESS4);
    expect(Object.keys(S.asked ?? {})).not.toContain('旧话:隔天的老账');
  });

  it('隔天再说，前一天说过的老话又能拿回来', () => {
    fresh([['ss_matou', 'qi'], ['ss_matou', 'duizhi'], ['ss_zei', 'qi']]);
    forgetAll();
    const a = ask(VOICELESS4, { force: true });
    expect(a.src).toBe('old');
    S.day += 1;
    // 听过就不再说（S.heard 不按日清），这里要验的是「旧话:」那把按日清的键没把老话压住
    S.heard = [];
    forgetAll();
    const b = ask(VOICELESS4, { force: true });
    expect(b.src).toBe('old');
    expect(b.text.replace(/^.*「|」$/g, '')).toBe(a.text.replace(/^.*「|」$/g, ''));
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