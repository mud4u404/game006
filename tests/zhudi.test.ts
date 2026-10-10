import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROOMS, SKILLS } from '../src/content';
import type { RoomDef, SkillDef } from '../src/content/types';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { advanceDays, absMin, dayNo, setNowMs } from '../src/core/time';
import { retreatPlan } from '../src/engine/lilian';
import { allowance, jingxiu, SHIGUANG, TIELV_TEXT } from '../src/engine/shiguang';
import { act, plan } from '../src/engine/xingdong';
import { MUREN_LIMIT, murenCount, openMuren, totalProf, zhuangId, zhuangPlan, zhuangReq, ZHUANG } from '../src/engine/zhudi';
import { Duel, SKILLED, simulate } from '../src/engine/duel';
import { foeSpec, fightKit, heroSpec, personOf } from '../src/engine/zhaoshi';
import { settle } from '../src/engine/jiesuan';
import { mulberry32 } from '../src/engine/rng';
import { setMapRegion, viewDitu } from '../src/ui/views/ditu';
import { viewJianghu } from '../src/ui/views/jianghu';

// 内容的索引在导入时建好；测试夹具只补查询入口，所有行动、时间、成长和地图规则仍用真实实现。
vi.mock('../src/content', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/content')>();
  return { ...actual,
    room: (id: string) => actual.ROOMS.find(r => r.id === id) ?? actual.room(id),
    skillById: (id: string) => actual.SKILLS.find(k => k.id === id)
  };
});

const school = '试验门';
const skill: SkillDef = { id: 'test_zhudi_palm', name: '试验掌法', school, grade: '凡品', category: '掌法', nature: '中正', reach: '徒手', desc: '测试夹具', learn: '测试夹具', teach: '入门', moves: [
  { name: '起手', text: '测试夹具', realm: 0 }, { name: '后招', text: '测试夹具', realm: 4 }
] };
const rooms: RoomDef[] = [
  { id: 'test_zhudi_hall', name: '试验正堂', area: '扬州 · 试验门', region: 'yz', t: 1, desc: '测试夹具', npcs: [], map: [50, 15], exits: [['南', 'test_zhudi_yard']] },
  { id: 'test_zhudi_yard', name: '试验练功场', area: '扬州 · 试验门', region: 'yz', t: 1, desc: '测试夹具', npcs: [], map: [50, 50], exits: [['北', 'test_zhudi_hall'], ['南', 'test_zhudi_dorm']], lianzhuang: school, lianzhuangBase: 'jh_tuna' },
  { id: 'test_zhudi_dorm', name: '试验通铺', area: '扬州 · 试验门', region: 'yz', t: 1, desc: '测试夹具', npcs: [], map: [50, 85], exits: [['北', 'test_zhudi_yard']] }
];

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  ROOMS.push(...rooms); SKILLS.push(skill);
  S.loc = rooms[1].id; S.min = 9 * 60;
  S.sect = { school, rank: '内门' };
  S.attr = { 体魄: 20, 根骨: 20, 身法: 20, 悟性: 20, 胆魄: 20 };
  S.skills = { jh_tuna: { r: 0, p: 100 }, [skill.id]: { r: 0, p: 20 } };
  S.loadout = { neigong: 'jh_tuna', fist: skill.id }; S.gear = {};
  S.lilian = 1000; S.hp = S.hpMax;
});
afterEach(() => {
  ROOMS.splice(ROOMS.indexOf(rooms[0]), rooms.length);
  SKILLS.splice(SKILLS.indexOf(skill), 1);
  setNowMs(() => Date.now());
});

describe('练桩的真实行动结算', () => {
  it('先算后做：同样历练的两时辰静修熟练乘 1.2，只结算一次', () => {
    const before = structuredClone(S);
    const normal = retreatPlan({ ...S, loadout: { fist: skill.id } }, ZHUANG.minutes / 1440);
    const req = zhuangReq(), preview = plan(req);
    expect(preview.ok).toBe(true); expect(preview.minutes).toBe(240);
    expect(preview.cost.some(e => e.type === 'heal' && typeof e.hp === 'number' && e.hp < 0)).toBe(true);
    expect(S).toEqual(before);
    const p = zhuangPlan(S), done = act(req);
    expect(done.ok).toBe(true);
    expect(totalProf(S, skill.id) - totalProf(before, skill.id)).toBe(Math.round(normal.gains[0][1] * 1.2));
    expect(before.lilian - S.lilian).toBe(normal.used);
    expect(absMin(S) - absMin(before)).toBe(240);
    expect(S.real.grown).toBeCloseTo(1 / 6);
    expect(S.hp).toBeLessThan(before.hp);
    expect(S.feed.some(x => x.x === p.note)).toBe(true);
    const settled = structuredClone(S);
    expect(act(req).ok).toBe(false); expect(act(zhuangReq()).why).toContain('今日已经练过');
    expect(S).toEqual(settled);
  });
  it('门外的人、别处和基本功不足均拒绝，资源与时间都不扣', () => {
    const scenarios = [() => { delete S.sect; }, () => { S.loc = rooms[2].id; }, () => { S.skills.jh_tuna!.p = 9; }];
    for (const change of scenarios) {
      S.sect = { school, rank: '内门' }; S.loc = rooms[1].id; S.skills.jh_tuna!.p = 100;
      change(); const before = structuredClone(S);
      expect(act(zhuangReq()).ok).toBe(false); expect(S).toEqual(before);
    }
  });
  it('体力作为预付代价，完成条件失败时只退实际体力，时辰不退且凭据不重退', () => {
    const paid = { type: 'heal' as const, hp: -5 };
    const req = { who: 'player', verb: '试练', at: S.loc, key: 'test:zhudi:refund', effects: [paid, { type: 'time' as const, add: 15 }], refundable: [paid], finish: { flag: 'test_zhudi_finish' } };
    const before = structuredClone(S), result = act(req);
    expect(result.ok).toBe(false); expect(S.hp).toBe(before.hp);
    expect(absMin(S) - absMin(before)).toBe(15);
    expect(result.cost).toEqual([{ type: 'time', add: 15 }]);
    const settled = structuredClone(S);
    expect(act(req).ok).toBe(false); expect(S).toEqual(settled);
  });
  it('额度用完仍练，只花时辰，写铁律，不扣历练、体力或多用修为日', () => {
    S.real.grown = SHIGUANG.slack;
    expect(allowance(S)).toBe(0);
    const before = structuredClone(S);
    expect(act(zhuangReq()).ok).toBe(true);
    expect([S.lilian, S.hp, totalProf(S, skill.id), S.real.grown]).toEqual([before.lilian, before.hp, totalProf(before, skill.id), before.real.grown]);
    expect(absMin(S) - absMin(before)).toBe(240);
    expect(S.feed.some(x => x.x === TIELV_TEXT)).toBe(true);
  });
  it('夜间只走时辰；跨午夜仍记开练日，次日可再练', () => {
    S.min = 23 * 60 + 30;
    const before = structuredClone(S), start = dayNo(S);
    expect(act(zhuangReq()).ok).toBe(true);
    expect([S.lilian, S.hp, S.skills]).toEqual([before.lilian, before.hp, before.skills]);
    expect(S.dayLog?.[zhuangId(school)]).toBe(start);
    expect(dayNo(S)).toBe(start + 1);
    expect(act(zhuangReq()).ok).toBe(true);
  });
  it('达到一倍半不再长；最后一次增长截在上限，突破后的累计熟练也受限', () => {
    S.skills[skill.id]!.p = 150;
    const before = structuredClone(S);
    expect(act(zhuangReq()).ok).toBe(true);
    expect([S.lilian, totalProf(S, skill.id)]).toEqual([before.lilian, 150]);
    advanceDays(S, 1); S.min = 9 * 60; S.skills[skill.id]!.p = 149;
    expect(act(zhuangReq()).ok).toBe(true);
    expect(totalProf(S, skill.id)).toBe(150);
    advanceDays(S, 1); S.min = 9 * 60; S.skills[skill.id] = { r: 1, p: 100 };
    const total = totalProf(S, skill.id), lilian = S.lilian;
    expect(act(zhuangReq()).ok).toBe(true);
    expect([totalProf(S, skill.id), S.lilian]).toEqual([total, lilian]);
  });
  it('记录超过三百条也不会让同日练桩重领，旧档缺 daily 字段照常可练', () => {
    delete S.dayLog;
    expect(act(zhuangReq()).ok).toBe(true);
    S.log = Array.from({ length: 300 }, (_, i) => ({ n: i + 1000, day: dayNo(S), min: S.min, who: 'player', verb: '交谈', cost: [], gain: [] }));
    expect(act(zhuangReq()).why).toContain('今日已经练过');
    advanceDays(S, 1); S.min = 9 * 60;
    expect(act(zhuangReq()).ok).toBe(true);
  });
});

describe('师门住处和地图', () => {
  it('练桩和木人放在现有场景动作区，门外的人仍看得见拒绝理由', () => {
    const html = viewJianghu();
    const scene = html.match(/<section class="card scene">[\s\S]*?<\/section>/)?.[0];
    expect(scene).toContain('data-act="lianzhuang"');
    expect(scene).toContain('data-act="muren"');
    expect(html).not.toContain('<h2>练手</h2>');
    delete S.sect;
    const outside = viewJianghu();
    expect(outside).toContain('这是本门弟子练手的地方');
    expect(outside).toContain('data-act="lianzhuang"');
    S.loc = rooms[0].id;
    expect(viewJianghu()).not.toContain('data-act="lianzhuang"');
  });
  it('同样的七日闭关，住师门的功力比住客栈多一成，额度照扣七日', () => {
    S.silver = 10000; S.zhu = 'inn';
    const before = structuredClone(S), inn = jingxiu(S, 7, () => 1);
    setState(before); S.zhu = 'home';
    const home = jingxiu(S, 7, () => 1);
    expect(home.gongli).toBeCloseTo(inn.gongli * 1.1, 2);
    expect(home.gains.reduce((n, [, g]) => n + g, 0)).toBeGreaterThan(inn.gains.reduce((n, [, g]) => n + g, 0));
    expect(home.cost).toBe(0); expect(S.real.grown).toBe(7);
  });
  it('门派地点只画同 area 的场景，出去恢复地区图，城里的普通 area 不收成门派图', () => {
    setMapRegion('zj');
    const local = viewDitu();
    for (const r of rooms) expect(local).toContain(`travelAsk:${r.id}`);
    expect(local).toContain('扬州 · 试验门地图'); expect(local).not.toContain('travelAsk:cheng');
    S.loc = 'cheng';
    const region = viewDitu();
    expect(region).toContain('travelAsk:cheng'); expect(region).toContain('travelAsk:daming');
    expect(region).toContain('aria-label="地区"');
  });
  it('五场景的驻地也逐点按坐标绘图，不把四处器械和住处折成一个正堂点', () => {
    const extra = [0, 1].map(i => ({ ...rooms[2], id: `test_zhudi_extra_${i}`, name: i ? '试验伙房' : '试验执事处', map: [i ? 80 : 20, 50] as [number, number], exits: [['北', rooms[0].id]] as RoomDef['exits'] }));
    const original = rooms.map(r => r.exits);
    ROOMS.push(...extra);
    rooms[0].exits = [...rooms.slice(1), ...extra].map(r => ['南', r.id]);
    for (const r of rooms.slice(1)) r.exits = [['北', rooms[0].id]];
    try {
      const html = viewDitu();
      expect((html.match(/class="node/g) ?? []).length).toBe(5);
      expect(html).not.toContain('class="mhub"');
      for (const r of [...rooms, ...extra]) expect(html).toContain(`travelAsk:${r.id}`);
    } finally {
      ROOMS.splice(ROOMS.indexOf(extra[0]), extra.length);
      rooms.forEach((r, i) => { r.exits = original[i]; });
    }
  });
});

describe('木人的真实切磋和每日名额', () => {
  it('复制开打时的根基、功力、激发武功、装备与气血，低体力仍有合法停止线', () => {
    S.hp = Math.round(S.hpMax * 0.2);
    const before = structuredClone(personOf(S)), hp = S.hp, max = S.hpMax;
    const f = openMuren().foe!, spec = foeSpec(f, []);
    expect(f.moves).toEqual(['起手']);
    expect(spec.person).toEqual(before);
    expect([spec.hp, spec.hpMax]).toEqual([hp, max]);
    S.gongli += 1; S.attr.体魄 += 3;
    expect(spec.person).toEqual(before);
    const d = new Duel(heroSpec(S, fightKit(S), f), spec, { rng: mulberry32(4001) });
    expect(d.ehp).toBe(hp); expect(d.ehpMax).toBe(max);
    expect(d.efloor).toBe(Math.round(hp * 0.5));
  });
  it('每天四回，换场所也不重置；名额拒绝无损耗，隔日恢复，旧档缺 daily 也可打', () => {
    delete S.dayLog;
    for (let i = 0; i < MUREN_LIMIT; i++) expect(openMuren().ok).toBe(true);
    expect(murenCount(S, school)).toBe(MUREN_LIMIT);
    const before = structuredClone(S);
    expect(openMuren().why).toBe('木人被你打坏了，明日再修。');
    expect(S).toEqual(before);
    advanceDays(S, 1);
    expect(openMuren().ok).toBe(true); expect(murenCount(S, school)).toBe(1);
  });
  it('门外的人不能开打，不占名额、不扣体力或时间', () => {
    delete S.sect; const before = structuredClone(S);
    expect(openMuren().why).toBe('这是本门弟子练手的地方。'); expect(S).toEqual(before);
  });
  it('沿用 Duel 实际打赢再结算增长；结算重入不重复长熟练、花时辰或给历练', () => {
    const f = openMuren().foe!;
    const d = simulate(new Duel(heroSpec(S, fightKit(S), f), foeSpec(f, []), { rng: mulberry32(4000) }), SKILLED);
    expect(d.res).toBe('win');
    S.hp = Math.round(d.hp); S.mp = Math.round(d.mp);
    const before = structuredClone(S);
    settle(f, d.res!, []);
    expect(totalProf(S, skill.id)).toBeGreaterThan(totalProf(before, skill.id));
    expect(S.lilian).toBe(before.lilian); expect(S.real.grown).toBeCloseTo(15 / 1440);
    expect(absMin(S) - absMin(before)).toBe(15);
    const after = structuredClone(S);
    settle(f, d.res!, []); expect(S).toEqual(after);
  });
  it('额度用完仍能切磋，打赢没有成长或历练，结算写铁律', () => {
    S.real.grown = SHIGUANG.slack;
    const f = openMuren().foe!;
    const before = structuredClone(S);
    settle(f, 'win', []);
    expect([S.skills, S.lilian, S.real.grown]).toEqual([before.skills, before.lilian, before.real.grown]);
    expect(S.feed.some(x => x.x === TIELV_TEXT)).toBe(true);
  });
  it('实际打输时掉体力，不长熟练，不凭空给历练，也不占成长额度', () => {
    const f = openMuren().foe!, hp = S.hp;
    const before = structuredClone(S);
    const d = simulate(new Duel(heroSpec(S, fightKit(S), f), foeSpec(f, []), { rng: mulberry32(4001) }), SKILLED);
    expect(d.res).toBe('lose');
    S.hp = Math.round(d.hp); S.mp = Math.round(d.mp);
    settle(f, d.res!, []);
    expect(S.hp).toBeLessThan(hp);
    expect([S.skills, S.lilian, S.real.grown]).toEqual([before.skills, before.lilian, before.real.grown]);
  });
});
