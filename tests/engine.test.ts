import { beforeEach, describe, expect, it } from 'vitest';
import { S, newGame, setState, skipToYangzhou } from '../src/core/state';
import { cn, cleanName, fmt, liang } from '../src/core/util';
import { dayName, minLabel, shichen, shichenKe } from '../src/core/time';
import { run, test as cond } from '../src/engine/dsl';
import { act, curQuest, enter, hopMin, openExits, pathMin, pathTo, roomNpcs, verbsOf } from '../src/engine/world';
import type { NpcDef } from '../src/content/types';
import { activePrep, alliesOf, fightKit, foeSpec, heroSpec, personOf } from '../src/engine/zhaoshi';
import { Duel, RULES, odds } from '../src/engine/duel';
import { dmgMul } from '../src/engine/person';
import { autoSlot } from '../src/engine/wuxue';
import { npc as npcDef } from '../src/content';
const NPCS_BY = { zhou: () => npcDef('fuya_zhou')!, csf: () => npcDef('zy_csf')! };
import { canLearn, canPerform, realmCap } from '../src/engine/shicheng';
import { ATTR_MAX, COMMON, attrEffects, attrLines, growAttr } from '../src/engine/gengu';
import { houtianOf, syncBody } from '../src/engine/ren';
import type { AttrKey } from '../src/content/types';
import { relGroup, warmer } from '../src/engine/renqing';
import { gainProf, learnSkill } from '../src/engine/growth';
import { SKILLS } from '../src/content';
import type { SkillDef } from '../src/content/types';
import { cheng, huohou } from '../src/engine/formulas';
import { FOE_WINDOW, RETREAT, fightLilian, foeLilian, foeRepeats, gongliCeiling, jingxiuPlan, retreatPlan } from '../src/engine/lilian';
import { settle } from '../src/engine/jiesuan';
import { FOES } from '../src/content';
import { ENC_GAP, ENC_REPEAT_DAYS, eligible, encounterChance, markEncounter, rollEncounter } from '../src/engine/encounter';
import { ENCOUNTERS } from '../src/content';

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
    // 扬州和瓜洲由运河客船连着，单程约两个时辰
    expect(pathTo('dukou', 'gz_pier')).toEqual(['gz_kechuan', 'gz_pier']);
    expect(pathMin('dukou', 'gz_pier')).toBe(120);
    expect(pathTo('gz_pier', 'zj_xijin')).toEqual(['gz_duchuan', 'zj_xijin']);
  });
  it('序章里不开船：江伯在床上等药，坐船去扬州、镇江的路不通（审查 A2）', () => {
    setState(newGame());
    expect(openExits('gz_pier').map(x => x[1])).not.toContain('gz_kechuan');
    expect(pathTo('gz_pier', 'zj_xijin')).toEqual([]);
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
  it('请教棋痴：悟性、历练都够才悟得出惊鸿剑，拿历练去换；不够的看不懂，告诉你还差什么', () => {
    delete S.skills.jinghong;
    S.lilian = 0;
    S.attr.悟性 = 40;
    expect(act('qichi', '请教').text).toContain('历练 250');
    expect(S.skills.jinghong).toBeUndefined();
    S.lilian = 300;
    S.attr.悟性 = 20;
    expect(act('qichi', '请教').text).toContain('看不懂');
    expect(S.skills.jinghong).toBeUndefined();
    S.attr.悟性 = 40;
    act('qichi', '请教');
    expect(S.skills.jinghong).toEqual({ r: 0, p: 120 });
    expect(S.lilian).toBe(50);
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
    const ti = houtianOf(S).体魄;
    expect(cond({ attr: { key: '体魄', atLeast: ti } })).toBe(true);
    expect(cond({ attr: { key: '体魄', atLeast: ti + 1 } })).toBe(false);
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
  it('带条件的动作，条件成立才出现；说得上话的人都能打听', () => {
    const n = { verbs: ['交谈', { verb: '求情', if: { flag: 'truth' } }] } as unknown as NpcDef;
    expect(verbsOf(n)).toEqual(['交谈', '打听']);
    S.flags.truth = true;
    expect(verbsOf(n)).toEqual(['交谈', '打听', '求情']);
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
  it('暗器、杂学不会被自动放进搭配；剑法进兵刃位，掌法进拳脚位', () => {
    const s = { loadout: {} };
    autoSlot(s, { id: 'yishu', category: '杂学' } as SkillDef);
    autoSlot(s, { id: 'feidao', category: '暗器' } as SkillDef);
    expect(s.loadout).toEqual({});
    autoSlot(s, { id: 'jian', category: '剑法' } as SkillDef);
    autoSlot(s, { id: 'zhang', category: '掌法' } as SkillDef);
    expect(s.loadout).toEqual({ weapon: 'jian', fist: 'zhang' });
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
  it('过了酉时再抓药，不会凭空丢一天（试玩第二轮 A3）', () => {
    act('jiangbo', '交谈');
    S.min = 20 * 60;
    const day = S.day;
    act('huichun', '抓药');
    expect(S.day).toBe(day);
    expect(S.quests.prologue).toBe(2);
  });
});

describe('见招拆招成算', () => {
  beforeEach(() => setState(skipToYangzhou()));
  it('成算是一条 S 形曲线：火候和这一招打平时五成（抢攻三成半），差得再多也不到零、不到满', () => {
    expect(odds(RULES, 'dodge', 30, 30)).toBeCloseTo(0.5);
    expect(odds(RULES, 'rush', 30, 30)).toBeCloseTo(0.35);
    expect(odds(RULES, 'block', 200, 0)).toBeLessThan(1);
    expect(odds(RULES, 'block', 0, 200)).toBeGreaterThan(0);
    expect(odds(RULES, 'parry', 40, 30)).toBeGreaterThan(odds(RULES, 'parry', 30, 30));
    expect(cheng(0.2)).toBe('两成');
  });
  it('火候由境界和根基决定：武功每深一重，火候涨五点多', () => {
    const d0 = huohou(S, 'dodge'), p0 = huohou(S, 'parry');
    S.skills.taxue = { r: 2, p: 0 };
    S.skills.hanjiang = { r: 1, p: 0 };
    expect(huohou(S, 'dodge') - d0).toBeGreaterThan(2 * 5);
    expect(huohou(S, 'parry') - p0).toBeGreaterThan(5);
    S.attr.身法 += 3;
    expect(huohou(S, 'dodge')).toBeGreaterThan(d0 + 10);
  });
  it('出手的外功负责拆招和抢攻；没有外功就只剩硬接和闪避；内力不够时硬接不可选', () => {
    S.mp = 20;
    const tu = FOES.find(f => f.id === 'tu')!;
    const duel = (): Duel => new Duel(heroSpec(S, fightKit(S), tu), foeSpec(tu, []), { rng: () => 0.5 });
    const d = duel();
    const opts = d.options(d.tells[0]);
    expect(opts.map(o => o.k)).toEqual(['block', 'dodge', 'parry', 'rush']);
    expect(opts.find(o => o.k === 'block')?.dis).toBe(true);
    delete S.gear.weapon;  // 剑脱手了，又没有拳脚功夫
    const d2 = duel();
    expect(d2.options(d2.tells[0]).map(o => o.k)).toEqual(['block', 'dodge']);
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
    const k = fake({ teach: '外门', requires: [{ skill: 'hanjiang', realm: 3 }], needAttr: { 悟性: 40 } });
    expect(canLearn(S, k)).toMatchObject({ ok: false, why: expect.stringContaining('拜入少林') });
    S.sect = { school: '少林', rank: '记名' };
    expect(canLearn(S, k)).toMatchObject({ ok: false, why: expect.stringContaining('外门弟子') });
    S.sect.rank = '外门';
    expect(canLearn(S, k)).toMatchObject({ ok: false, why: expect.stringContaining('寒江剑法') });
    S.skills.hanjiang = { r: 3, p: 0 };
    expect(canLearn(S, k)).toMatchObject({ ok: false, why: expect.stringContaining('悟性') });
    // 门槛看后天：寒江剑法第四重，悟性后天多八点
    S.attr.悟性 = 32;
    expect(canLearn(S, k).ok).toBe(true);
  });

  it('门规：严门不兼修别派；宽门禁修的打法学不了；江湖散学都能学', () => {
    const wudang = fake({ school: '武当', teach: '奇遇' });
    const xingxiu = fake({ school: '星宿', teach: '奇遇' });
    S.sect = { school: '少林', rank: '内门' };
    expect(canLearn(S, wudang)).toMatchObject({ ok: false, why: expect.stringContaining('门规森严') });
    expect(canLearn(S, SKILLS.find(k => k.id === 'jh_taizu')!).ok).toBe(true);
    S.sect = { school: '丐帮', rank: '内门' };
    expect(canLearn(S, wudang).ok).toBe(true);
    expect(canLearn(S, xingxiu)).toMatchObject({ ok: false, why: expect.stringContaining('禁修阴毒') });
  });

  it('学不成时不学，只记一条见闻；条件 canLearn 跟着变', () => {
    delete S.skills.duanshui;
    delete S.skills.hanjiang;
    expect(cond({ canLearn: 'duanshui' })).toBe(false);
    expect(learnSkill('duanshui')).toEqual([]);
    expect(S.skills.duanshui).toBeUndefined();
    expect(S.feed[0].x).toContain('根基未到');
    // 断水的前置是寒江剑法略有小成（负责人 10-09：开局不给绝技，要自己参悟）
    S.skills.hanjiang = { r: 1, p: 0 };
    // 学艺有代价：断水是绝品，要拿六百历练去换（content/skills.ts 的 LEARN_LILIAN）
    S.lilian = 599;
    expect(cond({ canLearn: 'duanshui' })).toBe(false);
    expect(learnSkill('duanshui')).toEqual([]);
    expect(S.feed[0].x).toContain('见识还浅');
    S.lilian = 650;
    expect(cond({ canLearn: 'duanshui' })).toBe(true);
    expect(learnSkill('duanshui')).toEqual(['习得「断水」']);
    expect(S.lilian).toBe(50);
  });

  it('剧情、奇遇里写明了代价的，不花历练', () => {
    delete S.skills.duanshui;
    S.skills.hanjiang!.r = 1;
    S.lilian = 0;
    run([{ type: 'learn', skill: 'duanshui', lilian: 0 }]);
    expect(S.skills.duanshui).toBeDefined();
    expect(S.lilian).toBe(0);
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
    S.attr = { 体魄: COMMON, 根骨: COMMON, 身法: COMMON, 悟性: COMMON, 胆魄: COMMON }; // 常人根基：练功不加不减，数字才好算
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
  beforeEach(() => {
    setState(skipToYangzhou());
    S.flags.boss = true;
    act('fuya_zhou', '交谈');
    act('fuya_zhou', '揭榜');
  });
  const night = (): void => { S.min = 21 * 60; };

  it('线索两条路：帮渔家老汉一把他才开口；悟性够的人自己细看破船', () => {
    expect(S.quests.side_caoshangfei).toBe(1);
    expect(act('qichi', '交谈').text).toContain('茱萸湾');
    expect(pathTo('dukou', 'zhuyuwan')).toEqual(['zhuyuwan']);
    expect(act('zy_yuweng', '交谈').text).toContain('又是府衙的');
    expect(S.flags.csf_clue2).toBeFalsy();
    S.attr.悟性 = 18;
    expect(act('zy_poshuan', '细看').text).toContain('问问村里的人');
    S.silver = 50;
    act('zy_yuweng', '买鱼');
    expect(S.silver).toBe(20);
    expect(act('zy_yuweng', '交谈').text).toContain('破船');
    expect(S.flags.csf_clue2).toBe(true);
    // 另一条路：悟性够，自己看出来
    delete S.flags.csf_clue2;
    S.attr.悟性 = 21;  // 后天再加寒江剑法第一重的两点，二十三
    expect(act('zy_poshuan', '细看').text).toContain('铁爪');
    expect(S.flags.csf_clue2).toBe(true);
    S.min = 12 * 60;
    expect(roomNpcs('zhuyuwan')).not.toContain('zy_csf');
    night();
    expect(roomNpcs('zhuyuwan')).toContain('zy_csf');
  });

  it('拿下：打赢押回府衙，账房先生出狱', async () => {
    const { FOES } = await import('../src/content');
    S.flags.csf_clue2 = true;
    night();
    run(FOES.find(f => f.id === 'zy_csf')!.results.win.do!);
    expect(S.quests.side_caoshangfei).toBe(2);
    expect(roomNpcs('yz_fuya')).toContain('zy_zhangfang');
    expect(verbsOf(NPCS_BY.zhou())).toContain('交差');
    const silver = S.silver;
    act('fuya_zhou', '交差');
    expect(S.quests.side_caoshangfei).toBe(3);
    expect(S.silver).toBe(silver + 2000);
    expect(roomNpcs('yz_fuya')).not.toContain('zy_zhangfang');
    expect(act('zy_yuweng', '交谈').text).toContain('官爷的事');
  });

  it('劝他自首：先去牢里见过账房，侠义或胆魄够才劝得动', () => {
    S.flags.csf_clue2 = true;
    night();
    act('zy_csf', '交谈');
    expect(verbsOf(NPCS_BY.csf())).not.toContain('劝他自首');
    act('zy_zhangfang', '交谈');
    expect(verbsOf(NPCS_BY.csf())).toContain('劝他自首');
    S.xia = 0; S.attr.胆魄 = 10;
    expect(act('zy_csf', '劝他自首').text).toContain('凭什么让我信你');
    expect(S.quests.side_caoshangfei).toBe(1);
    S.xia = 20;
    act('zy_csf', '劝他自首');
    expect(S.quests.side_caoshangfei).toBe(2);
    expect(act('fuya_zhou', '交差').text).toContain('文书');
    expect(S.flags.csf_zhangfang_free).toBe(true);
  });

  it('放走：听他说完才能放；回府衙周捕头不追问，可账房还关着', () => {
    S.flags.csf_clue2 = true;
    night();
    expect(verbsOf(NPCS_BY.csf())).not.toContain('放他走');
    act('zy_csf', '交谈');
    act('zy_csf', '放他走');
    expect(S.quests.side_caoshangfei).toBe(3);
    expect(act('fuya_zhou', '交差').text).toContain('他就出不来');
    expect(roomNpcs('yz_fuya')).toContain('zy_zhangfang');
    expect(act('zy_zhangfang', '交谈').text).toContain('三天又三天');
  });
});

describe('根基有实效', () => {
  const common = (): Record<AttrKey, number> => ({ 体魄: COMMON, 根骨: COMMON, 身法: COMMON, 悟性: COMMON, 胆魄: COMMON });
  beforeEach(() => { setState(skipToYangzhou()); S.attr = common(); syncBody(S); });

  it('常人各二十；先天高出常人，气血、内力跟着变；改了马上生效，不会重复加', () => {
    const hp = S.hpMax, mp = S.mpMax;
    run([{ type: 'attr', key: '体魄', delta: 10 }]);
    expect(S.hpMax / hp).toBeCloseTo(1.1, 2);
    run([{ type: 'attr', key: '根骨', delta: 10 }]);
    expect(S.mpMax / mp).toBeCloseTo(1.1, 2);
    run([{ type: 'attr', key: '体魄', delta: -10 }]);
    expect(Math.abs(S.hpMax / hp - 1.05 ** 0.07 / 1.05 ** 0.07 * (1 + 0.005 * 10))).toBeLessThan(0.01);
    syncBody(S);
    const again = S.hpMax;
    syncBody(S);
    expect(S.hpMax).toBe(again);
  });

  it('悟性管外功、根骨管内功练得快慢，每高常人一点快一分；身法管赶路', () => {
    S.skills.hanjiang = { r: 0, p: 0 };
    S.attr.悟性 = COMMON + 15;
    gainProf('hanjiang', 100);
    expect(S.skills.hanjiang!.p).toBe(115);
    S.attr.身法 = COMMON + 20;
    expect(attrEffects(S).travel).toBeCloseTo(0.8);
    S.attr.身法 = ATTR_MAX;
    expect(attrEffects(S).travel).toBe(0.7);
  });

  it('先天只有奇遇改得了；后天随武功长，内功每深一重，体魄、根骨各长两点', () => {
    S.skills.xinfa = { r: 1, p: 0 };
    const h0 = houtianOf(S);
    gainProf('xinfa', 600 + 1200);
    expect(S.skills.xinfa!.r).toBe(3);
    expect(S.attr.根骨).toBe(COMMON);
    expect(houtianOf(S).根骨 - h0.根骨).toBe(4);
    expect(houtianOf(S).体魄 - h0.体魄).toBe(4);
    growAttr(S, '根骨', 100, '测试');
    expect(S.attr.根骨).toBe(ATTR_MAX);
  });

  it('根基的条件看后天：武功练深了，看得出的东西多了', () => {
    const need = { attr: { key: '悟性' as const, atLeast: houtianOf(S).悟性 + 2 } };
    expect(cond(need)).toBe(false);
    S.skills.hanjiang!.r += 1;
    expect(cond(need)).toBe(true);
  });

  it('人物页写的是实际的数，不是空话', () => {
    S.attr.体魄 = COMMON + 10;
    expect(attrLines(S).体魄).toContain('天赋 +10%');
    expect(attrLines(S).胆魄).toContain('怒气 +0');
  });
});

describe('人情', () => {
  it('赠礼最多送到相谈甚欢；有过节的不因一份礼就和好', () => {
    expect(warmer(undefined)).toBe('点头之交');
    expect(warmer('点头之交')).toBe('相谈甚欢');
    expect(warmer('相谈甚欢')).toBe('相谈甚欢');
    expect(warmer('有隙')).toBe('有隙');
  });
  it('萍水相逢的人收起来，有意义的人分组', () => {
    expect(relGroup('点头之交')).toBe('萍水相逢');
    expect(relGroup('相谈甚欢')).toBe('交好');
    expect(relGroup('仇敌')).toBe('恩怨');
    expect(relGroup('阴阳两隔')).toBe('至亲至交');
  });
});

describe('从零练武：成长从江湖上来', () => {
  beforeEach(() => setState(skipToYangzhou()));

  it('开局不入流：寒江三门都在初窥门径；出手轻重随境界，初窥门径打八成，大乘一倍六', () => {
    const g = newGame();
    expect(Object.values(g.skills).every(x => x!.r === 0 && x!.p === 0)).toBe(true);
    const lo = dmgMul(personOf(S));
    expect(lo).toBeGreaterThan(0.75);
    expect(lo).toBeLessThan(0.95);
    S.skills.hanjiang!.r = 8;
    expect(dmgMul(personOf(S)) / lo).toBeCloseTo(Math.pow(1.04, 8), 2);
  });

  it('内功每突破一重，气血上限跟着涨（由「人」算出来），涨的那一截直接补上；内力看功力，不看重数；轻功突破不加气血', () => {
    const hp = S.hpMax, mp = S.mpMax, cur = S.hp;
    S.skills.xinfa = { r: 0, p: 0 };
    gainProf('xinfa', 300);
    expect(S.skills.xinfa.r).toBe(1);
    expect(S.hpMax).toBeGreaterThan(hp * 1.07);
    expect(S.hp - cur).toBe(S.hpMax - hp);
    expect(S.mpMax).toBe(mp);
    const hp2 = S.hpMax;
    S.skills.taxue = { r: 0, p: 0 };
    gainProf('taxue', 300);
    expect(S.hpMax).toBe(hp2);
  });

  it('静修：只养得好轻伤（重伤要看伤、服药），日子都拿来打坐长功力；功力有天花板，内功练不上去就熬不深', () => {
    S.wounds = { hand: 1, foot: 0, inner: 2 };
    const p = jingxiuPlan(S, 7);
    expect(p.healed).toEqual({ hand: 1 });
    expect(p.dazuoDays).toBe(7);
    const q = jingxiuPlan({ ...S, wounds: { hand: 0, foot: 0, inner: 0 } }, 30);
    expect(q.gongli).toBeGreaterThan(0.8);
    expect(q.gongli).toBeLessThan(1);
    const capped = jingxiuPlan({ ...S, wounds: { hand: 0, foot: 0, inner: 0 }, gongli: gongliCeiling(S) }, 30);
    expect(capped.gongli).toBe(0);
  });

  it('打一架攒历练：对手每高一档约翻一倍；赢了全得，输了一半，逃跑没有；七天内反复打同一人，一次减半', () => {
    S.lilian = 0;
    const foe = { id: 'tu', rank: 1 };
    expect(foeLilian({ rank: 0 })).toBe(100);
    expect(foeLilian(foe)).toBe(213);
    expect(foeLilian({ rank: 0, weak: 0.1 })).toBe(10);
    expect(fightLilian(S, foe, 'lose')).toBe(107);
    expect(fightLilian(S, foe, 'lose')).toBe(53);
    expect(fightLilian(S, foe, 'win')).toBe(53);
    S.day += FOE_WINDOW;
    expect(fightLilian(S, foe, 'win')).toBe(213);
    expect(fightLilian(S, { id: 'liu', rank: 0.3 }, 'flee')).toBe(0);
  });

  it('切磋结算里的熟练只给第一回；实战里长的熟练按七日内打过几场递减（试玩第二轮 G03）', () => {
    const liu = FOES.find(f => f.id === 'liu')!;
    const hj = (): string => JSON.stringify(S.skills.hanjiang);
    const h0 = hj();
    settle(liu, 'win', []);
    const h1 = hj();
    expect(h1).not.toBe(h0);
    settle(liu, 'win', []);
    expect(hj()).toBe(h1);
    expect(foeRepeats(S, 'liu')).toBe(2);
    S.day += FOE_WINDOW;
    expect(foeRepeats(S, 'liu')).toBe(0);
  });

  it('一件事了结时给历练，只给一次', () => {
    S.lilian = 0;
    run([{ type: 'quest', id: 'side_huafang', stage: 1 }]);
    expect(S.lilian).toBe(0);
    run([{ type: 'quest', id: 'side_huafang', stage: 2 }]);
    expect(S.lilian).toBe(200);
    run([{ type: 'quest', id: 'side_huafang', stage: 2 }]);
    expect(S.lilian).toBe(200);
  });

  it('闭关消化历练；没有历练，闭门造车，进境只有一点', () => {
    S.lilian = 0;
    const idle = retreatPlan(S, 30);
    expect(idle.used).toBe(0);
    expect(idle.gains.reduce((a, [, v]) => a + v, 0)).toBeLessThanOrEqual(RETREAT[30].base + 2);
    S.lilian = 5000;
    const full = retreatPlan(S, 30);
    expect(full.used).toBe(RETREAT[30].cap);
    expect(full.gains.map(([k]) => k)).toEqual(['hanjiang', 'xinfa', 'taxue']);
    expect(full.gains[0][1]).toBeGreaterThan(full.gains[1][1]);
    expect(retreatPlan(S, 1).used).toBe(RETREAT[1].cap);
  });

  it('备战：条件成立的准备都生效，可以叠加；知彼让对手出手打折，帮手真的进场出手', () => {
    const tu = FOES.find(f => f.id === 'tu')!;
    expect(activePrep(tu)).toEqual([]);
    expect(foeSpec(tu, []).bigMul).toBeUndefined();
    S.flags.tu_scar = true;
    S.flags.tu_allies = true;
    const active = activePrep(tu);
    expect(active).toHaveLength(2);
    expect(foeSpec(tu, active).bigMul).toBeCloseTo(0.85);
    const allies = alliesOf(active);
    expect(allies.map(a => a.name)).toEqual(['漕帮']);
    // 帮手按时出手，伤害记在明处
    const d = new Duel(heroSpec(S, fightKit(S), tu), foeSpec(tu, active), { rng: () => 0.99, allies });
    const evs = [];
    for (let i = 0; i < 3 && !d.over; i++) { evs.push(...d.tick()); if (d.prompt) d.respond(null); }
    const hit = evs.find(e => e.k === 'ally');
    expect(hit && hit.k === 'ally' && hit.dmg).toBeGreaterThan(d.ehpMax * 0.05);
  });
});

describe('渡口一剑：弱小的少年怎么赢', () => {
  beforeEach(() => {
    setState(skipToYangzhou());
    S.quests.main1 = 1;
  });

  it('了尘不叫你闭关，而是点你去找船夫、漕帮、柳寒舟', () => {
    const t = act('liaochen', '交谈').text;
    expect(t).toContain('船夫');
    expect(t).toContain('漕帮');
    expect(t).not.toContain('闭关');
  });

  it('知彼：先看出他左臂有伤，船夫才肯说那道伤的来历', () => {
    expect(act('chuanfu', '交谈').text).toContain('什么都没看见');
    act('tu', '观察');
    expect(S.flags.tu_saw_arm).toBe(true);
    expect(act('chuanfu', '交谈').text).toContain('分水刺');
    expect(S.flags.tu_scar).toBe(true);
    expect(act('liaochen', '交谈').text).toContain('没有白走');
  });

  it('帮手：侠义够了，漕帮管事才肯违了帮主的令；打赢以后他丢了差事', async () => {
    const g = (): NpcDef => npcDef('guanshi')!;
    S.xia = 12;
    expect(verbsOf(g())).not.toContain('请他帮忙');
    expect(act('guanshi', '交谈').text).toContain('谁也不认得少侠');
    S.xia = 20;
    expect(verbsOf(g())).toContain('请他帮忙');
    act('guanshi', '请他帮忙');
    expect(S.flags.tu_allies).toBe(true);
    const { FOES } = await import('../src/content');
    const tu = FOES.find(f => f.id === 'tu')!;
    run([...tu.results.win.do!, ...activePrep(tu).flatMap(p => p.win ?? [])]);
    expect(S.flags.tu_with_allies).toBe(true);
    expect(act('guanshi', '交谈').text).toContain('撑篙');
  });

  it('掠阵：和柳寒舟交好了，他才肯去渡口；打完以后，他问起你的剑法', async () => {
    expect(act('liu', '交谈').text).not.toContain('算我一个');
    S.rel.liu = '相谈甚欢';
    expect(act('liu', '交谈').text).toContain('算我一个');
    expect(S.flags.tu_liu).toBe(true);
    const { FOES } = await import('../src/content');
    run(activePrep(FOES.find(f => f.id === 'tu')!).flatMap(p => p.win ?? []));
    S.quests.main1 = 2;
    expect(act('liu', '交谈').text).toContain('跟谁学的');
  });
});

describe('路遇', () => {
  beforeEach(() => { setState(skipToYangzhou()); S.min = 10 * 60; });
  const always = (): number => 0;
  const never = (): number => 0.99;

  it('路越长越容易遇上，最多四成', () => {
    expect(encounterChance(15)).toBeCloseTo(0.1);
    expect(encounterChance(60)).toBeCloseTo(0.4);
    expect(encounterChance(300)).toBe(0.4);
  });

  it('骰子没中、序章里、没有合适的路遇，都不遇', () => {
    expect(rollEncounter('hu', 'cheng', never)).toBeNull();
    expect(rollEncounter('hu', 'daming', always)).toBeNull();
    S.chapter = 0;
    expect(rollEncounter('hu', 'cheng', always)).toBeNull();
  });

  it('遇上了按地区和目的地挑；奇遇一生一次；两次路遇隔两个时辰', () => {
    const e = rollEncounter('hu', 'cheng', always)!;
    expect(e.id).toBe('luyu_maishen');
    markEncounter(e);
    expect(rollEncounter('hu', 'cheng', always)).toBeNull();
    S.min += ENC_GAP;
    expect(rollEncounter('hu', 'cheng', always)!.id).toBe('luyu_xiaozei');
    expect(eligible('cheng').map(x => x.id)).not.toContain('luyu_maishen');
  });

  it('能反复遇的，七天之内不再遇', () => {
    ENCOUNTERS.push({ id: 't_repeat', region: ['yz'], to: ['daming'], story: 'ly_maishen' });
    try {
      const e = rollEncounter('hu', 'daming', always)!;
      expect(e.id).toBe('t_repeat');
      markEncounter(e);
      S.min += ENC_GAP;
      expect(rollEncounter('hu', 'daming', always)).toBeNull();
      S.day += ENC_REPEAT_DAYS;
      expect(rollEncounter('hu', 'daming', always)!.id).toBe('t_repeat');
    } finally { ENCOUNTERS.pop(); }
  });

  it('那个孩子：你当初怎么待他，渡口再遇时他就是什么样子', () => {
    const kid = (): string[] => eligible('dukou').map(x => x.id).filter(id => id.startsWith('luyu_xiaozei'));
    expect(kid()).toEqual([]);
    S.flags.ly_xiaozei_fed = true;
    expect(kid()).toEqual(['luyu_xiaozei_fed']);
  });

  it('同船的老人只在夜里的客船上', () => {
    expect(eligible('gz_kechuan').map(x => x.id)).toEqual([]);
    S.min = 22 * 60;
    expect(eligible('gz_kechuan').map(x => x.id)).toEqual(['luyu_tongchuan']);
  });
});

describe('重回瓜洲', () => {
  beforeEach(() => setState(skipToYangzhou()));

  it('序章以后，小屋是焦土，生船不见了，镇上的人记得江伯', () => {
    expect(roomNpcs('gz_pier')).toContain('shaogong');
    expect(act('chatan', '交谈').text).toContain('还敢回来');
    expect(act('ayp', '交谈').text).toContain('坟');
    expect(S.relNote?.ayp).toContain('照看江伯的坟');
  });

  it('石臼底下的小木剑，回春堂的旧方子，都只给一次', () => {
    act('gz_shijiu', '细看');
    expect(S.items.mujian).toBe(1);
    expect(act('gz_shijiu', '细看').text).toContain('空了');
    act('huichun', '交谈');
    act('huichun', '交谈');
    expect(S.items.fangzi).toBe(1);
  });

  it('坟前祭拜：斗败屠千山以后，有话要对江伯说', () => {
    expect(act('gz_fenmu', '祭拜').text).toContain('磕了三个头');
    S.flags.boss = true;
    expect(act('gz_fenmu', '祭拜').text).toContain('渡口那一剑');
    S.items.huadiao = 1;
    expect(act('gz_fenmu', '祭拜').text).toContain('花雕');
    expect(S.items.huadiao).toBe(0);
  });
});

describe('武功上身：实战里的招式由搭配来', () => {
  beforeEach(() => setState(skipToYangzhou()));

  it('绝招来自出手的那门外功：境界够了才能用，不够的标出要练到哪一重', () => {
    const k = fightKit(S);
    expect(k.outer?.id).toBe('hanjiang');
    expect(k.performs.map(x => x.name)).toEqual(['寒江孤影']);
    expect(k.locked.map(p => p.name)).toEqual(['江枫渔火', '独钓寒江']);
    S.skills.hanjiang!.r = 3;
    expect(fightKit(S).performs.map(x => x.name)).toEqual(['寒江孤影', '江枫渔火', '独钓寒江']);
  });

  it('杀招来自绝技位；没有本门内功打底，绝招、杀招都使不出来', () => {
    // 开局没有断水（要对着残页自己参悟），这里先当已经参出来了
    expect(fightKit(S).ult).toBeUndefined();
    S.skills.duanshui = { r: 0, p: 0 };
    S.loadout.ult = 'duanshui';
    expect(fightKit(S).ult?.def.id).toBe('duanshui');
    S.skills.jh_tuna = { r: 0, p: 0 };
    S.loadout.neigong = 'jh_tuna';
    const k = fightKit(S);
    expect(k.performs).toEqual([]);
    expect(k.unrooted).toBe(true);
    expect(k.ult).toBeUndefined();
  });

  it('剑不在手里，换成拳脚位的功夫出手', () => {
    S.skills.jh_bagua = { r: 0, p: 0 };
    S.loadout.fist = 'jh_bagua';
    delete S.gear.weapon;
    const k = fightKit(S);
    expect(k.outer?.id).toBe('jh_bagua');
    expect(k.performs.length).toBeGreaterThan(0);
    expect(k.performs.every(x => k.outer!.performs!.includes(x))).toBe(true);
  });

  it('绝招的效果交给交手引擎：点穴上身，对手要跳过出手，一次只定一合', () => {
    S.skills.hanjiang!.r = 3;
    S.mp = S.mpMax;
    const k = fightKit(S), foe = FOES.find(f => f.id === 'tu')!;
    const i = k.performs.findIndex(p => p.fx?.some(x => x.kind === 'busy'));
    expect(i).toBeGreaterThanOrEqual(0);
    const d = new Duel(heroSpec(S, k, foe), foeSpec(foe, []), { rng: () => 0 });
    d.perform(i);
    expect(d.foeStatus()).toContain('busy');
    expect(d.ehp).toBeLessThan(d.ehpMax);
    const ev = d.tick();
    expect(ev.some(e => e.k === 'held')).toBe(true);
    expect(d.foeStatus()).not.toContain('busy');
  });
});
