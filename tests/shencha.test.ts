/**
 * 第二轮全面审查（10-09，docs/shiwan.md「第二轮」）修掉的问题，每条一个回归测试。编号对应审查报告。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { S, newGame, setState, skipToYangzhou } from '../src/core/state';
import { advanceDays, dayNo, setNowMs } from '../src/core/time';
import { run } from '../src/engine/dsl';
import { act, roomNpcs, verbsOf } from '../src/engine/world';
import { npc } from '../src/content';
import { checkYue, crossesNight, nightWarn, xinmoLine } from '../src/engine/shiguang';
import { nextTierLine } from '../src/engine/ren';

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.min = 14 * 60;
});

describe('交谈只说话，不替玩家了结世事', () => {
  it('C01 何税吏：交谈不推渡船的事；请他行文要另点，还要三十文规费', () => {
    run([{ type: 'shi', id: 'sszj_du', to: 'qi' }]);
    act('zj_shuli', '交谈');
    expect(S.shi!.sszj_du.at).toBe('qi');
    expect(verbsOf(npc('zj_shuli')!)).toContain('请他行文');
    S.silver = 20;
    act('zj_shuli', '请他行文');
    expect(S.shi!.sszj_du.at).toBe('qi');
    S.silver = 100;
    act('zj_shuli', '请他行文');
    expect(S.shi!.sszj_du.at).toBe('guanfu');
    expect(S.silver).toBe(70);
  });

  it('C02 闻铁匠：交谈只是托你捎话；话带到寒山寺，钟才补', () => {
    run([{ type: 'shi', id: 'sz_zhong', to: 'lie' }]);
    act('sz_wentiejiang', '交谈');
    expect(S.shi!.sz_zhong.at).toBe('lie');
    S.min = 10 * 60;
    expect(verbsOf(npc('sz_benli')!)).toContain('捎话');
    act('sz_benli', '捎话');
    expect(S.shi!.sz_zhong.at).toBe('xiangzhu');
  });
});

describe('桃花岛', () => {
  it('E01 悟性不够、看着阿芦的点走出阵的，也拜进了门', () => {
    S.attr.悟性 = 24;
    S.flags.smth_asked = true;
    act('smth_quheng', '入阵');
    expect(S.sect?.school).toBe('桃花岛');
  });

  it('E02 卜卦只免头一回：往后照收一百，不再长历练', () => {
    S.silver = 500;
    const ll = S.lilian ?? 0;
    act('smth_quheng', '卜卦');
    expect([S.silver, S.lilian]).toEqual([500, ll + 20]);
    act('smth_quheng', '卜卦');
    expect([S.silver, S.lilian]).toEqual([400, ll + 20]);
  });

  it('E03 看诊：没钱只能赊一回，赊过的不还就不再看', () => {
    S.silver = 0;
    S.wounds = { hand: 3, foot: 3, inner: 0 };
    act('smth_quheng', '看诊');
    act('smth_quheng', '看诊');
    act('smth_quheng', '看诊');
    expect(S.wounds.hand + S.wounds.foot).toBe(5);
  });
});

describe('瓜洲的人', () => {
  it('A12 看着你长大的街坊开局就是点头之交；A13 至亲不给「打听」', () => {
    setState(newGame());
    expect(S.rel.chatan).toBe('点头之交');
    expect(S.rel.ayp).toBe('点头之交');
    expect(verbsOf(npc('jiangbo')!)).not.toContain('打听');
  });

  it('C06 道场刚起头，孩子还没丢，孙家娘子不在渡口哭', () => {
    run([{ type: 'shi', id: 'sszj_dao', to: 'qi' }]);
    S.min = 10 * 60;
    expect(roomNpcs('zj_xijin')).not.toContain('sszj_sunnian');
  });
});

describe('约', () => {
  it('G01 今日有约没了结：歇脚、住店跨过半夜先提醒会误约，不拦（10-09 试玩：原来全灰，玩家只能空点熬夜）', () => {
    run([{ type: 'yue', id: 't_yue', npc: 'liu', at: 'hu', inDays: 0, text: '湖畔再见' }]);
    expect(S.yue[0].due).toBe(dayNo(S));
    S.min = 20 * 60;
    expect(nightWarn(S)).toContain('失约');
    expect(crossesNight(S, 6)).toBe(true);
    expect(crossesNight(S, 22)).toBe(false);
    S.loc = 'cheng'; S.silver = 300;
    const day = S.day;
    const r = act('jc_yz_ruanniang', '住店');
    expect(r.text).toContain('失约');
    expect(S.day).not.toBe(day);
  });
});

describe('差事', () => {
  it('G18 悬赏榜上揭的差事误了期：这张榜过几日才能再揭，不生心魔（不对木榜心中有愧）', () => {
    run([{ type: 'job', id: 'xs_hezei' }]);
    expect(S.job?.id).toBe('xs_hezei');
    advanceDays(S, 10);
    checkYue(S);
    expect(S.job).toBeNull();
    expect(S.xinmo.n).toBe(0);
  });
});

describe('修炼的说明', () => {
  it('G10 人物页写下一档要什么、眼下差多少', () => {
    expect(nextTierLine(S)).toMatch(/^要入三流：.*第三重.*功力/);
  });
  it('G17、G19、G26 心魔照实写：静修打几折、几层会走火、随日子淡；淡到很小不写「打十折」', () => {
    S.xinmo = { n: 1, why: '失约于柳寒舟' };
    expect(xinmoLine(S)).toContain('打八折');
    expect(xinmoLine(S)).toContain('走火');
    S.xinmo = { n: 0.1, why: '失约于柳寒舟' };
    expect(xinmoLine(S)).toContain('几乎不受影响');
    expect(xinmoLine(S)).not.toContain('化得开');
  });
});

describe('负责人 10-09 定的', () => {
  it('开局不给绝技：断水要等寒江剑法略有小成、拿六百历练，对着江伯的残页参悟', async () => {
    const { lookItem } = await import('../src/engine/daoju');
    expect(S.skills.duanshui).toBeUndefined();
    setState(newGame());
    expect(S.skills.duanshui).toBeUndefined();
    setState(skipToYangzhou());
    expect(lookItem('scroll').more).toContain('略有小成');
    S.skills.hanjiang = { r: 1, p: 0 };
    S.lilian = 100;
    expect(lookItem('scroll').more).toContain('历练六百');
    expect(S.skills.duanshui).toBeUndefined();
    S.lilian = 700;
    lookItem('scroll');
    expect(S.skills.duanshui).toBeDefined();
    expect(S.lilian).toBe(100);
  });
  it('了尘不白教：截住屠千山以前，请教只给几句话', () => {
    S.loc = 'daming'; S.min = 10 * 60;
    S.quests.main1 = 1;
    const p0 = S.skills.xinfa!.p;
    act('liaochen', '请教');
    expect(S.skills.xinfa!.p).toBe(p0);
    S.flags.boss = true;
    act('liaochen', '请教');
    expect(S.flags.lc_tiaoxi).toBe(true);
  });
});

describe('维护者按原则定的（docs/paiban.md）', () => {
  it('F02 金疮药一场最多两包', async () => {
    const { Duel, JCY_MAX } = await import('../src/engine/duel');
    const { fightKit, foeSpec, heroSpec } = await import('../src/engine/zhaoshi');
    const { foeById } = await import('../src/content');
    const f = foeById('xs_hezei')!;
    const d = new Duel(heroSpec(S, fightKit(S), f), foeSpec(f, []), { rng: () => 0.5 });
    for (let i = 0; i < 4; i++) { d.hp = 1; d.jcy(); }
    expect(d.jcyN).toBe(JCY_MAX);
    expect(JCY_MAX).toBe(2);
  });
  it('F05 说了「接三十招」的考校，撑满三十合就算过', async () => {
    const { FOES } = await import('../src/content');
    const kao = FOES.filter(f => f.rounds === 30).map(f => f.id);
    expect(kao.length).toBeGreaterThanOrEqual(7);
    const { Duel } = await import('../src/engine/duel');
    const { fightKit, foeSpec, heroSpec } = await import('../src/engine/zhaoshi');
    const f = FOES.find(x => x.rounds === 30)!;
    let seed = 7;
    const rng = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const d = new Duel(heroSpec(S, fightKit(S), f), foeSpec(f, []), { rng });
    // 撑得住：每合把气血补满，只看招数
    for (let i = 0; i < 400 && !d.over; i++) { d.hp = d.hpMax; d.tick(); if (d.prompt) d.respond(null); }
    expect(d.res).toBe('win');
    expect(d.round).toBeLessThanOrEqual(30);
  });
  it('G06 铁律的余裕封顶：离开多久，回来也只能往前拨余裕加一次离开的上限', async () => {
    const { allowance, SHIGUANG } = await import('../src/engine/shiguang');
    setNowMs(() => S.real.start + 500 * 3.6e6);
    expect(allowance(S)).toBe(SHIGUANG.slack + SHIGUANG.awayCap);
  });
});

describe('门派：辞别、叛门、师门导航（docs/paiban.md E04、E05）', () => {
  it('辞别：武功留着不封顶、贡献清零、原门派不再收', async () => {
    const { realmCap } = await import('../src/engine/shicheng');
    const { skillById } = await import('../src/content');
    run([{ type: 'sect', school: '少林', rank: '记名' }]);
    S.gongxian = { 少林: 80 };
    S.skills.sl_hunyuan = { r: 1, p: 0 };
    run([{ type: 'leaveSect', how: '辞别' }]);
    expect(S.sect).toBeUndefined();
    expect(S.gongxian?.少林).toBeUndefined();
    expect(realmCap(S, skillById('sl_hunyuan')!)).toBeGreaterThan(1);
    run([{ type: 'sect', school: '少林', rank: '记名' }]);
    expect(S.sect).toBeUndefined();
  });
  it('叛门：恶名加三，本门武功封顶', async () => {
    const { realmCap } = await import('../src/engine/shicheng');
    const { skillById } = await import('../src/content');
    run([{ type: 'sect', school: '少林', rank: '记名' }]);
    S.skills.sl_hunyuan = { r: 1, p: 0 };
    const e0 = S.eming;
    run([{ type: 'leaveSect', how: '叛门' }]);
    expect(S.eming).toBe(e0 + 3);
    expect(realmCap(S, skillById('sl_hunyuan')!)).toBe(1);
  });
  it('师门导航：记名弟子升外门，写出找谁、差什么', async () => {
    const { sectNav } = await import('../src/engine/daohang');
    run([{ type: 'sect', school: '少林', rank: '记名' }]);
    const n = sectNav()!;
    expect(n.next).toBe('外门');
    expect(n.who).toBeTruthy();
    expect(n.needs.map(x => x.text)).toEqual(expect.arrayContaining(['罗汉拳火候还不到', '侠义上还欠些']));
    expect(n.needs.map(x => x.text).join('')).not.toMatch(/\d/);
    expect(n.needs.some(x => !x.ok)).toBe(true);
  });
});

describe('文字（docs/wenfeng.md）', () => {
  it('杀招的题字一律写「· 杀招」', async () => {
    const { SKILLS } = await import('../src/content');
    const bad = SKILLS.filter(k => k.ult?.title && !k.ult.title.endsWith(' · 杀招')).map(k => `${k.id}：${k.ult!.title}`);
    expect(bad).toEqual([]);
  });
});

describe('剧情选项写倾向，不写数（docs/paiban.md A9、A10、H16）', () => {
  it('选之前：侠义、恶名、根基写成倾向，花钱照实写，历练和熟练不提', async () => {
    const { leanText, gainTags } = await import('../src/ui/qingxiang');
    expect(leanText('侠义 +2　恶名 −2')).toBe('侠义之举　洗些恶名');
    expect(leanText('银两 −400 文，侠义 +5')).toBe('花四百文　侠义之举');
    expect(leanText('悟性 +2　寒江剑法熟练 +80')).toBe('悟性见长');
    // 根基五项（AttrKey）都认得，不漏一项
    for (const k of ['体魄', '根骨', '身法', '悟性', '胆魄']) expect(leanText(`${k} +3`), k).toBe(`${k}见长`);
    expect(leanText('恶名 +3　汪家告官')).toBe('会落恶名　汪家告官');
    expect(leanText('历练 +20')).toBe('');
    expect(gainTags('侠义 +2　恶名 −2')).toEqual(['侠义 +2', '恶名 −2']);
  });
  it('童年三忆：三条路给的一样多，「求江伯教你」不再只得一半', async () => {
    const { storyById } = await import('../src/content');
    const card = storyById('p_open')!.cards.find(c => c.choices.some(x => x.label.includes('求他教你')))!;
    const amount = (k: number): number => card.choices[k].do!.filter(e => e.type === 'prof').reduce((a, e) => a + (e as { amount: number }).amount, 0);
    expect(new Set([0, 1, 2].map(amount)).size).toBe(1);
  });
});

describe('序章的默认路径（冒烟脚本和机器玩家都按「第一个选项」往前点）', () => {
  it('「天明」那张卡的第一个选项是登船；「坟前再坐一会儿」只能排在后面', async () => {
    const { storyById } = await import('../src/content');
    const card = storyById('p_death')!.cards.find(c => c.title === '天明')!;
    expect(card.choices[0].label).toContain('登船');
    expect(card.choices.map(c => c.label)).toContain('在坟前再坐一会儿');
  });
});

describe('话有来处（docs/huo-shijie.md 3.4）', () => {
  it('传闻池里每一条都标了「谁嘴里会有这句话」，行当用得规范', async () => {
    const { NEWS } = await import('../src/content');
    const TRADES = new Set('说书 船夫 脚夫 更夫 掌柜 小二 捕快 衙役 叫化 盐商 镖师 郎中 跑腿 和尚 道士 渔家 猎户 铁匠 军汉 书吏 赌客 相公 货郎 牙子'.split(' '));
    const FACS = new Set(['dong', 'xi', 'guan', 'wang', 'gai', 'hei']);
    const bad = NEWS.filter(n => !n.who?.length || n.who.length > 4 || n.who.some(w => !TRADES.has(w) && !FACS.has(w))).map(n => n.text.slice(0, 20));
    expect(bad, '这些传闻没标 who，或行当不在名单里').toEqual([]);
    // 外地的事（far）只给跑码头的人，who 里要有船夫、镖师、说书这类；说玩家事迹的（about）要有条件
    for (const n of NEWS) if (n.far) expect(n.who!.some(w => ['船夫', '镖师', '说书', '脚夫'].includes(w)), n.text.slice(0, 20)).toBe(true);
    for (const n of NEWS) if (n.about) expect(n.if, n.text.slice(0, 20)).toBeTruthy();
  });
});
