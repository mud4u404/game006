import { beforeEach, describe, expect, it } from 'vitest';
import { S, newGame, setState, skipToYangzhou } from '../src/core/state';
import { cn, cleanName, fmt, liang } from '../src/core/util';
import { dayName, minLabel, shichen, shichenKe } from '../src/core/time';
import { run, test as cond } from '../src/engine/dsl';
import { act, curQuest, enter, hopMin, pathMin, pathTo, roomNpcs, verbsOf } from '../src/engine/world';
import type { NpcDef } from '../src/content/types';
import { autoSlot } from '../src/engine/wuxue';
import { npc as npcDef } from '../src/content';
const NPCS_BY = { zhou: () => npcDef('fuya_zhou')!, csf: () => npcDef('zy_csf')! };
import { canLearn, canPerform, realmCap } from '../src/engine/shicheng';
import { gainProf, learnSkill } from '../src/engine/growth';
import { SKILLS } from '../src/content';
import type { SkillDef } from '../src/content/types';
import { cheng, huohou, odds, respOptions } from '../src/engine/formulas';

describe('文字与时间', () => {
  it('中文数字', () => {
    expect(cn(0)).toBe('零');
    expect(cn(12)).toBe('十二');
    expect(cn(30)).toBe('三十');
    expect(liang(2)).toBe('两');
  });
  it('时辰与日子', () => {
    expect(shichen(7 * 60 + 40)).toBe('辰时');
    expect(shichen(23 * 60 + 30)).toBe('子时');
    expect(dayName(7)).toBe('初七');
    expect(dayName(10)).toBe('初十');
    expect(dayName(21)).toBe('廿一');
  });
  it('时辰加刻：整时辰只说时辰，一刻十五分钟', () => {
    expect(shichenKe(15 * 60)).toBe('申时');
    expect(shichenKe(15 * 60 + 50)).toBe('申时三刻');
    expect(shichenKe(16 * 60 + 45)).toBe('申时七刻');
    expect(shichenKe(23 * 60 + 15)).toBe('子时一刻');
    expect(shichenKe(0)).toBe('子时四刻');
  });
  it('赶路耗时', () => {
    expect(minLabel(10)).toBe('片刻');
    expect(minLabel(30)).toBe('两刻');
    expect(minLabel(45)).toBe('三刻');
  });
  it('占位符与名字清理', () => {
    expect(fmt('{given}，去吧', { given: '孤舟' })).toBe('孤舟，去吧');
    expect(fmt('{unknown}', {})).toBe('{unknown}');
    expect(cleanName('<b>听雨</b>')).toBe('b听雨b');
    expect(cleanName('寒江孤影剑')).toBe('寒江孤影');
  });
});

describe('世界', () => {
  beforeEach(() => setState(skipToYangzhou()));
  it('寻路经过湖畔', () => {
    expect(pathTo('daming', 'dukou')).toEqual(['hu', 'dukou']);
    expect(pathTo('hu', 'hu')).toEqual([]);
    expect(hopMin('hu', 'daming')).toBe(30);
    expect(pathMin('jinshan', 'daming')).toBe(40);
    expect(pathTo('hu', 'gz_home')).toEqual([]);
  });
  it('屠千山只在接到任务后出现在渡口', () => {
    expect(roomNpcs('dukou')).not.toContain('tu');
    S.quests.main1 = 1;
    expect(roomNpcs('dukou')).toContain('tu');
    S.flags.boss = true;
    expect(roomNpcs('dukou')).not.toContain('tu');
  });
  it('了尘大师推进主线', () => {
    S.loc = 'daming';
    const { text } = act('liaochen', '交谈');
    expect(text).toContain('屠千山');
    expect(S.quests.main1).toBe(1);
    expect(curQuest()?.to).toBe('dukou');
  });
  it('买东西扣钱，钱不够时拒绝', () => {
    S.silver = 25;
    act('yaopu', '购买');
    expect(S.silver).toBe(5);
    expect(S.items.jcy).toBe(4);
    const { text } = act('yaopu', '购买');
    expect(text).toContain('一文都不能少');
  });
  it('请教棋痴：没学过惊鸿剑时习得', () => {
    delete S.skills.jinghong;
    act('qichi', '请教');
    expect(S.skills.jinghong).toEqual({ r: 0, p: 120 });
  });
});

describe('条件与效果', () => {
  beforeEach(() => setState(newGame()));
  it('任务条件', () => {
    expect(cond({ quest: { id: 'prologue', is: 0 } })).toBe(true);
    expect(cond({ quest: { id: 'prologue', atLeast: 1 } })).toBe(false);
    expect(cond({ quest: { id: 'main1', below: 1 } })).toBe(true);
  });
  it('时间设到更早的时刻会跨到第二天', () => {
    run([{ type: 'time', set: 9 * 60 }]);
    expect(S.day).toBe(6);
    expect(S.min).toBe(9 * 60);
  });
  it('银两不会变成负数', () => {
    run([{ type: 'silver', delta: -999 }]);
    expect(S.silver).toBe(0);
  });
  it('关系只在 from 范围内才改', () => {
    run([{ type: 'rel', npc: 'liu', value: '点头之交', from: ['素不相识'] }]);
    expect(S.rel.liu).toBe('点头之交');
    run([{ type: 'rel', npc: 'liu', value: '相谈甚欢', from: ['素不相识'] }]);
    expect(S.rel.liu).toBe('点头之交');
  });
  it('属性、侠义、恶名、时辰条件', () => {
    expect(cond({ attr: { key: '体魄', atLeast: 13 } })).toBe(true);
    expect(cond({ attr: { key: '体魄', atLeast: 14 } })).toBe(false);
    run([{ type: 'eming', delta: 5 }]);
    expect(cond({ eming: 5 })).toBe(true);
    expect(cond({ xia: 1 })).toBe(false);
    S.min = 22 * 60;
    expect(cond({ hour: { from: 19, to: 5 } })).toBe(true);
    S.min = 3 * 60;
    expect(cond({ hour: { from: 19, to: 5 } })).toBe(true);
    S.min = 12 * 60;
    expect(cond({ hour: { from: 19, to: 5 } })).toBe(false);
    expect(cond({ hour: { from: 9, to: 17 } })).toBe(true);
  });
  it('任务进度只升不降', () => {
    run([{ type: 'quest', id: 'side_x', stage: 2 }]);
    run([{ type: 'quest', id: 'side_x', stage: 0 }]);
    expect(S.quests.side_x).toBe(2);
    run([{ type: 'quest', id: 'side_x', stage: 3 }]);
    expect(S.quests.side_x).toBe(3);
  });
  it('带名号再找周捕头交谈，缉拿草上飞的进度不会退回', () => {
    S.flags.boss = true;
    act('fuya_zhou', '交谈');
    expect(S.quests.side_caoshangfei).toBe(0);
    act('fuya_zhou', '揭榜');
    expect(S.quests.side_caoshangfei).toBe(1);
    act('fuya_zhou', '交谈');
    expect(S.quests.side_caoshangfei).toBe(1);
  });
  it('观察：先是外貌，再接上随条件变化的细节', () => {
    const t = act('fuya_zhou', '观察').text;
    expect(t).toContain('络腮胡');
    expect(t).toContain('旧刀伤');
  });
  it('带条件的动作，条件成立才出现', () => {
    const n = { verbs: ['交谈', { verb: '求情', if: { flag: 'truth' } }] } as unknown as NpcDef;
    expect(verbsOf(n)).toEqual(['交谈']);
    S.flags.truth = true;
    expect(verbsOf(n)).toEqual(['交谈', '求情']);
  });
  it('进门时的文字记进见闻', () => {
    enter('daming_cangjing');
    expect(S.feed.some(e => e.x.includes('「善本经卷失窃」'))).toBe(true);
    enter('daming_cangjing');
    enter('daming_cangjing');
    expect(S.feed.filter(e => e.x.includes('「善本经卷失窃」')).length).toBe(1);
    expect(S.feed.filter(e => e.x.includes('还是那幅模样')).length).toBe(1);
  });
  it('做事花时间：交谈十分钟、请教半个时辰；天色变了记一句见闻', () => {
    S.loc = 'daming';
    const m0 = S.min;
    act('liaochen', '观察');
    expect(S.min).toBe(m0 + 5);
    act('liaochen', '交谈');
    expect(S.min).toBe(m0 + 15);
    S.min = 16 * 60 + 55;
    act('liaochen', '观察');
    expect(S.feed[0].x).toBe('日头偏西，天色向晚。');
  });
  it('暗器、杂学不会被自动放进主手、副手', () => {
    const s = { loadout: {} };
    autoSlot(s, { id: 'yishu', category: '杂学' } as SkillDef);
    autoSlot(s, { id: 'feidao', category: '暗器' } as SkillDef);
    expect(s.loadout).toEqual({});
    autoSlot(s, { id: 'jian', category: '剑法' } as SkillDef);
    expect(s.loadout).toEqual({ main: 'jian' });
  });
  it('望江楼买花雕：扣钱，也给酒', () => {
    S.silver = 100;
    act('changgui', '购买');
    expect(S.silver).toBe(70);
    expect(S.items.huadiao).toBe(1);
  });
  it('画舫了结以后，瘦西湖的佩刀汉子会议论，名号在身也一样', () => {
    S.flags.boss = true;
    S.flags.huafang_good = true;
    expect(act('caobang', '交谈').text).toContain('汪家');
  });
  it('序章：江伯 → 抓药 → 入夜', () => {
    act('jiangbo', '交谈');
    expect(S.quests.prologue).toBe(1);
    act('huichun', '抓药');
    expect(S.quests.prologue).toBe(2);
    expect(S.weather).toBe('大雨');
    expect(roomNpcs('gz_home')).not.toContain('jiangbo');
  });
});

describe('见招拆招成算', () => {
  beforeEach(() => setState(skipToYangzhou()));
  it('限制在一成到九成半之间', () => {
    expect(odds('dodge', 100, 0)).toBe(0.95);
    expect(odds('block', 0, 100)).toBe(0.05);
    expect(odds('rush', 20, 20)).toBeCloseTo(0.35);
    expect(cheng(0.2)).toBe('两成');
  });
  it('火候由境界和属性决定', () => {
    expect(huohou(S, 'dodge')).toBe(2 * 10 + 16);
    expect(huohou(S, 'parry')).toBe(1 * 10 + 15);
  });
  it('没学会的武功不会出现在应对里；内力不够时硬接不可选', () => {
    delete S.skills.jinghong;
    S.mp = 50;
    const opts = respOptions(S, { li: 30, su: 30, qiao: 30, xi: 30 });
    expect(opts.map(o => o.k)).toEqual(['block', 'dodge', 'parry']);
    expect(opts.find(o => o.k === 'block')?.dis).toBe(true);
  });
});

describe('内容包合并', () => {
  it('自动补回程出口，按 at 放人物', async () => {
    const { mergePacks } = await import('../src/content');
    const reg = mergePacks([
      { rooms: [
        { id: 'a', name: 'A', area: '', region: 'x', t: 0, map: [50, 50], desc: '', npcs: [], exits: [] },
        { id: 'b', name: 'B', area: '', region: 'x', t: 5, map: [50, 20], desc: '', npcs: [], exits: [['南', 'a', '北']] }
      ] },
      { npcs: [
        { id: 'n1', name: '甲', ini: '甲', tone: 'gray', brief: '', look: '', verbs: ['观察'], actions: {}, at: { room: 'a' } },
        { id: 'o1', name: '碑', obj: true, icon: 'stele', brief: '', look: '', verbs: ['观察'], actions: {}, at: { room: 'b', if: { flag: 'f' } } }
      ] }
    ]);
    const a = reg.ROOMS.find(r => r.id === 'a')!, b = reg.ROOMS.find(r => r.id === 'b')!;
    expect(a.exits).toEqual([['北', 'b']]);
    expect(a.npcs).toEqual(['n1']);
    expect(b.objs).toEqual([{ id: 'o1', if: { flag: 'f' } }]);
  });
});

describe('师承与前置', () => {
  beforeEach(() => setState(skipToYangzhou()));
  const fake = (o: Partial<SkillDef>): SkillDef => ({ id: 'x', name: '某功', grade: '上品', category: '剑法', school: '少林', nature: '刚', desc: '', learn: '', ...o } as SkillDef);

  it('门派武功要拜师、地位够；前置、属性不够学不成', () => {
    const k = fake({ teach: '外门', requires: [{ skill: 'hanjiang', realm: 3 }], needAttr: { 悟性: 30 } });
    expect(canLearn(S, k)).toMatchObject({ ok: false, why: expect.stringContaining('拜入少林') });
    S.sect = { school: '少林', rank: '记名' };
    expect(canLearn(S, k)).toMatchObject({ ok: false, why: expect.stringContaining('外门弟子') });
    S.sect.rank = '外门';
    expect(canLearn(S, k)).toMatchObject({ ok: false, why: expect.stringContaining('寒江剑法') });
    S.skills.hanjiang = { r: 3, p: 0 };
    expect(canLearn(S, k)).toMatchObject({ ok: false, why: expect.stringContaining('悟性') });
    S.attr.悟性 = 30;
    expect(canLearn(S, k).ok).toBe(true);
  });

  it('门规：严门不兼修别派；宽门禁修的打法学不了；江湖散学都能学', () => {
    const wudang = fake({ school: '武当', teach: '奇遇' });
    const xingxiu = fake({ school: '星宿', teach: '奇遇' });
    S.sect = { school: '少林', rank: '内门' };
    expect(canLearn(S, wudang)).toMatchObject({ ok: false, why: expect.stringContaining('门规森严') });
    expect(canLearn(S, SKILLS.find(k => k.id === 'jinghong')!).ok).toBe(true);
    S.sect = { school: '丐帮', rank: '内门' };
    expect(canLearn(S, wudang).ok).toBe(true);
    expect(canLearn(S, xingxiu)).toMatchObject({ ok: false, why: expect.stringContaining('禁修阴毒') });
  });

  it('学不成时不学，只记一条见闻；条件 canLearn 跟着变', () => {
    delete S.skills.duanshui;
    S.skills.hanjiang = { r: 0, p: 0 };
    expect(cond({ canLearn: 'duanshui' })).toBe(false);
    expect(learnSkill('duanshui')).toEqual([]);
    expect(S.skills.duanshui).toBeUndefined();
    expect(S.feed[0].x).toContain('根基未到');
    S.skills.hanjiang = { r: 1, p: 0 };
    expect(cond({ canLearn: 'duanshui' })).toBe(true);
    expect(learnSkill('duanshui')).toEqual(['习得「断水」']);
  });

  it('拜师、升地位只升不降，身在别派时拜不了；出师、叛门都记下来', () => {
    run([{ type: 'sect', school: '少林', rank: '外门' }]);
    expect(cond({ sect: { school: '少林' } })).toBe(true);
    expect(cond({ sect: { school: '少林', rank: '内门' } })).toBe(false);
    run([{ type: 'sect', school: '少林', rank: '记名' }]);
    run([{ type: 'sect', school: '武当', rank: '真传' }]);
    expect(S.sect).toEqual({ school: '少林', rank: '外门' });
    run([{ type: 'leaveSect', how: '叛门' }]);
    expect(S.sect).toBeUndefined();
    expect(S.pastSects).toEqual([{ school: '少林', how: '叛门' }]);
    run([{ type: 'sect', school: '武当', rank: '记名' }]);
    expect(S.sect).toEqual({ school: '武当', rank: '记名' });
  });

  it('内功为根：绝招要本门内功来使，江湖散学不挑', () => {
    const shaolin = fake({});
    expect(canPerform(S, SKILLS.find(k => k.id === 'hanjiang')!)).toBe(true);
    expect(canPerform(S, SKILLS.find(k => k.id === 'jinghong')!)).toBe(true);
    expect(canPerform(S, shaolin)).toBe(false);
    expect(canPerform(S, { ...shaolin, roots: ['xinfa'] })).toBe(true);
    expect(canPerform({ loadout: {} }, SKILLS.find(k => k.id === 'hanjiang')!)).toBe(false);
  });

  it('外功不能比内功高出一重以上；到了瓶颈熟练照涨，内功突破后跟着突破', () => {
    S.skills.xinfa = { r: 1, p: 0 };
    S.skills.hanjiang = { r: 2, p: 0 };
    const hj = SKILLS.find(k => k.id === 'hanjiang')!;
    expect(realmCap(S, hj)).toBe(2);
    expect(realmCap(S, fake({}))).toBe(1);
    expect(gainProf('hanjiang', 1300)).toEqual([]);
    expect(S.skills.hanjiang).toEqual({ r: 2, p: 1300 });
    expect(S.feed[0].x).toContain('瓶颈');
    const outs = gainProf('xinfa', 600);
    expect(outs).toContain('「寒江心法」突破至「融会贯通」');
    expect(outs).toContain('「寒江剑法」突破至「炉火纯青」');
    expect(S.skills.hanjiang).toEqual({ r: 3, p: 100 });
  });

  it('叛出的师门，武功境界封顶', () => {
    const k = fake({ id: 'zz_fake2', category: '内功' });
    SKILLS.push(k);
    try {
      S.skills.zz_fake2 = { r: 4, p: 0 };
      S.pastSects = [{ school: '少林', how: '叛门' }];
      expect(realmCap(S, k)).toBe(4);
      S.pastSects = [{ school: '少林', how: '出师' }];
      expect(realmCap(S, k)).toBe(8);
    } finally { SKILLS.pop(); }
  });
});

describe('缉拿草上飞走得完', () => {
  beforeEach(() => setState(skipToYangzhou()));
  it('揭榜 → 棋痴指路 → 渔家老汉 → 夜里破船 → 放走或拿下 → 回府衙交差', async () => {
    const { FOES } = await import('../src/content');
    S.flags.boss = true;
    act('fuya_zhou', '交谈');
    act('fuya_zhou', '揭榜');
    expect(S.quests.side_caoshangfei).toBe(1);
    expect(act('qichi', '交谈').text).toContain('茱萸湾');
    expect(pathTo('dukou', 'zhuyuwan')).toEqual(['zhuyuwan']);
    act('zy_yuweng', '交谈');
    S.min = 12 * 60;
    expect(roomNpcs('zhuyuwan')).not.toContain('zy_csf');
    S.min = 21 * 60;
    expect(roomNpcs('zhuyuwan')).toContain('zy_csf');
    // 拿下：打赢以后押回府衙
    const won = FOES.find(f => f.id === 'zy_csf')!.results.win.do!;
    run(won);
    expect(S.quests.side_caoshangfei).toBe(2);
    expect(verbsOf(NPCS_BY.zhou())).toContain('交差');
    const silver = S.silver;
    act('fuya_zhou', '交差');
    expect(S.quests.side_caoshangfei).toBe(3);
    expect(S.silver).toBe(silver + 2000);
  });
  it('放走：听他说完才能放，回府衙周捕头不追问', () => {
    S.flags.boss = true;
    act('fuya_zhou', '交谈');
    act('fuya_zhou', '揭榜');
    act('zy_yuweng', '交谈');
    S.min = 21 * 60;
    expect(verbsOf(NPCS_BY.csf())).not.toContain('放他走');
    act('zy_csf', '交谈');
    expect(verbsOf(NPCS_BY.csf())).toContain('放他走');
    act('zy_csf', '放他走');
    expect(S.quests.side_caoshangfei).toBe(3);
    expect(act('fuya_zhou', '交差').text).toContain('就当他跑了');
  });
});
