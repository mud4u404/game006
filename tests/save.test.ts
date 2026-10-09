import { REL_LEGACY } from '../src/engine/renqing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearSaveSafely, exportCode, importCode, listBackups, migrate, readSave, useStore, writeSave, KEY, SAVE_VERSION, type SaveStore } from '../src/core/save';
import { newGame, setState, skipToYangzhou, worldSeed } from '../src/core/state';
import { V5_MATOU } from '../src/core/save';
import { dayNo } from '../src/core/time';
import { initWorld, marksOf, ownerOf } from '../src/engine/shijie';
import { seedOf } from '../src/engine/rng';
import { payFare } from '../src/engine/world';
import { moveShi } from '../src/engine/shishi';
import type { GameState } from '../src/core/state';
import { personOf } from '../src/engine/ren';
import { hpMaxOf } from '../src/engine/person';

/** 内存里的 localStorage */
class MemStore implements SaveStore {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  get length() { return this.m.size; }
}

// 每一版发出去的存档都留一份在这里；改了存档格式，旧的这几份必须照样读得出来
const FIXTURES = import.meta.glob<string>('./fixtures/saves/*.json', { query: '?raw', import: 'default', eager: true });

let mem: MemStore;
beforeEach(() => { mem = new MemStore(); useStore(mem); });
afterEach(() => useStore(null));

describe('存档：更新游戏不丢档', () => {
  it('每一份旧版存档都能读出来，关键进度一样不少', () => {
    expect(Object.keys(FIXTURES).length).toBeGreaterThanOrEqual(3);
    for (const [file, raw] of Object.entries(FIXTURES)) {
      const old = JSON.parse(raw);
      const s = migrate(JSON.parse(raw));
      expect(s.v, file).toBe(SAVE_VERSION);
      for (const k of ['name', 'loc', 'chapter', 'silver', 'quests', 'flags', 'skills', 'xia'] as const) expect(s[k], `${file} 的 ${k}`).toEqual(old[k]);
      // 物品一样不少；第二版的存档多了一把青锋剑（原来写死在行囊页上），拿在手里
      expect(s.items, `${file} 的 items`).toEqual(old.v < 3 ? { qingfeng: 1, ...old.items } : old.items);
      if (old.v < 3) expect(s.gear.weapon, `${file} 的兵器`).toBe('qingfeng');
      // 关系：旧称谓换成关系阶梯里对应的词，人一个不少、高低不变
      const rel = Object.fromEntries(Object.entries(old.rel as Record<string, string>).map(([id, v]) => [id, REL_LEGACY[v] ?? v]));
      expect(s.rel, `${file} 的 rel`).toEqual(rel);
    }
  });

  it('第二版的主手、副手按门类分进兵刃、拳脚；同一类的两门，主手那门留下，另一门照样学会', () => {
    // 改版前（没有搭配）的存档：按当时的固定搭配排；寒江剑法和惊鸿剑都是剑法，寒江剑法留在兵刃位
    const s = migrate(JSON.parse(FIXTURES['./fixtures/saves/v2-before-loadout.json']));
    expect(s.loadout).toEqual({ neigong: 'xinfa', qinggong: 'taxue', weapon: 'hanjiang', ult: 'duanshui' });
    expect(s.skills.jinghong).toEqual({ r: 2, p: 40 });
    expect(s.eming).toBe(0);
    // 惊鸿剑是上品、境界再高，旧存档里的寒江剑法也不会被换下来
    for (const [hj, jh] of [[1, 1], [2, 2], [3, 2], [1, 3], [4, 4]]) {
      const raw = JSON.parse(FIXTURES['./fixtures/saves/v2-before-loadout.json']);
      raw.skills = { ...raw.skills, hanjiang: { r: hj, p: 0 }, jinghong: { r: jh, p: 0 } };
      const m = migrate(raw);
      expect(m.loadout.weapon).toBe('hanjiang');
      expect(m.skills.hanjiang).toEqual({ r: hj, p: 0 });
    }
    // 第二版最后的样子：主手寒江剑法、副手八卦掌，各进各的位置
    const latest = migrate(JSON.parse(FIXTURES['./fixtures/saves/v2-latest.json']));
    expect(latest.loadout).toEqual({ neigong: 'xinfa', qinggong: 'taxue', weapon: 'hanjiang', fist: 'jh_bagua', ult: 'duanshui' });
    expect(latest.lilian).toBe(320);
    expect(latest.encLog).toEqual({ luyu_maishen: 67 });
  });

  it('存档里的地点已经不存在时，送回安全的地方，不崩', () => {
    const s = migrate({ ...skipToYangzhou(), loc: 'no_such_place' });
    expect(s.loc).toBe(skipToYangzhou().loc);
    const p = migrate({ ...newGame(), loc: 'no_such_place' });
    expect(p.loc).toBe(newGame().loc);
  });

  it('退役的悬赏榜（xs_bang、xsb_bang，负责人 10-09 拆府衙）：手上的悬赏改到照壁下的书办那里交差，选中的榜不再选着', () => {
    const old = {
      ...skipToYangzhou(), loc: 'yz_fuya', sel: 'xsb_bang', reply: { id: 'xs_bang', text: '旧榜' },
      job: { id: 'xs_hezei', due: 70 },
      yue: [{ id: 'job_xs_hezei', npc: 'xs_bang', at: 'yz_fuya', due: 70, text: '拿运河渡口的河贼，押回府衙领赏', miss: [{ type: 'jobFail', id: 'xs_hezei' }] }]
    };
    const s = migrate(old);
    expect(s.yue[0]).toMatchObject({ id: 'job_xs_hezei', npc: 'xsb_zhuren', at: 'yz_zhaobi', due: 70 });
    expect(s.job).toEqual({ id: 'xs_hezei', due: 70 });
    expect(s.sel).toBeNull();
    expect(s.reply).toBeNull();
    expect(s.loc, '府衙前堂沿用原来的 id').toBe('yz_fuya');
  });

  it('搭配里指向没学会、已删除、放错位置的武功，或者不认识的位置名，就空出来，不崩', () => {
    const s = migrate({ ...skipToYangzhou(), loadout: { weapon: 'no_such_skill', fist: 'hanjiang', neigong: 'hanjiang', qinggong: 'taxue', main: 'hanjiang' } });
    expect(s.loadout).toEqual({ qinggong: 'taxue' });
  });

  it('手里的兵器已经不在行囊里了，就空着手', () => {
    const t = skipToYangzhou();
    delete t.items.qingfeng;
    expect(migrate(t).gear).toEqual({});
  });

  it('纸娃娃：第四版的旧存档只有兵器一个装备位，照样读得出来，其余五个位置空着', () => {
    const raw = JSON.parse(FIXTURES['./fixtures/saves/v4-before-zhiwawa.json']);
    const s = migrate(raw);
    expect(s.gear).toEqual({ weapon: 'qingfeng' });
    expect(s.items).toEqual(raw.items);
    expect(s.hpMax).toBe(hpMaxOf(personOf(s)));
    expect(migrate(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('装备位上不对的东西空出来：不认识的位置、放错的位置、行囊里已经没有的、不是道具的', () => {
    const t = skipToYangzhou();
    t.items = { ...t.items, zb_douli: 1, zb_pijia: 1 };
    const raw = { ...JSON.parse(JSON.stringify(t)), gear: { weapon: 'qingfeng', head: 'zb_douli', body: 'zb_douli', feet: 'zb_kuaixue', waist: 'no_such_item', hat: 'zb_douli' } };
    expect(migrate(raw).gear).toEqual({ weapon: 'qingfeng', head: 'zb_douli' });
    expect(migrate({ ...raw, gear: null }).gear).toEqual({});
    expect(migrate({ ...raw, gear: 'qingfeng' }).gear).toEqual({});
  });

  it('穿着装备的存档：气血上限把护体算进去，反复读档不变', () => {
    const t = skipToYangzhou();
    t.items = { ...t.items, zb_pijia: 1 };
    t.gear = { weapon: 'qingfeng', body: 'zb_pijia' };
    const s = migrate(JSON.parse(JSON.stringify(t)));
    expect(s.gear.body).toBe('zb_pijia');
    expect(personOf(s).gear?.huti).toBe(2);
    expect(s.hpMax).toBe(hpMaxOf(personOf(s)));
    expect(s.hpMax).toBeGreaterThan(skipToYangzhou().hpMax);
    expect(migrate(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('读不出来的存档原样另存，不会被新游戏覆盖掉', () => {
    mem.setItem(KEY, '{坏了');
    const r = readSave();
    expect(r).toEqual({ state: null, broken: true });
    writeSave(newGame());
    const kept = [...mem.m.entries()].filter(([k]) => k.startsWith('jhyy-save-broken-'));
    expect(kept.map(([, v]) => v)).toEqual(['{坏了']);
    readSave();
    expect([...mem.m.keys()].filter(k => k.startsWith('jhyy-save-broken-')).length).toBe(1);
  });

  it('比游戏还新的存档也不覆盖', () => {
    mem.setItem(KEY, JSON.stringify({ ...newGame(), v: SAVE_VERSION + 1 }));
    expect(readSave().broken).toBe(true);
  });

  it('每天留一份备份，最多三份；清空前也留一份', () => {
    for (const d of ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']) mem.setItem('jhyy-bak-' + d, JSON.stringify(newGame()));
    writeSave(skipToYangzhou());
    const days = [...mem.m.keys()].filter(k => /^jhyy-bak-\d/.test(k)).sort();
    expect(days.length).toBe(3);
    expect(days[0] > 'jhyy-bak-2026-10-02').toBe(true);
    clearSaveSafely();
    expect(mem.getItem(KEY)).toBeNull();
    expect(listBackups()[0].label).toBe('上次重来或导入之前');
    expect(listBackups()[0].state?.loc).toBe(skipToYangzhou().loc);
  });

  it('存档码能原样带走，中文不乱', () => {
    const s = skipToYangzhou();
    s.name = '寒舟';
    const back = importCode(exportCode(s));
    expect(back).toEqual(migrate(JSON.parse(JSON.stringify(s))));
    expect(() => importCode('随便一段字')).toThrow('这不是存档码');
    expect(() => importCode(exportCode(s).slice(0, 40))).toThrow('不完整');
  });

  it('关系称谓统一到阶梯：旧词换成阶梯里的词，有味道的留作人情备注；气血上限由「人」算出来，反复读档也不变', () => {
    const s = migrate({ ...skipToYangzhou(), rel: { liu: '不打不相识', fuya_zhou: '初识' }, hpMax: 1000 } as GameState);
    expect(s.rel).toEqual({ liu: '相谈甚欢', fuya_zhou: '点头之交' });
    expect(s.relNote).toEqual({ liu: '湖畔切磋，不打不相识' });
    expect(s.hpMax).toBe(hpMaxOf(personOf(s)));
    expect(migrate(JSON.parse(JSON.stringify(s))).hpMax).toBe(s.hpMax);
  });

  it('第三版升第四版：根基按常人的比例换成二十的刻度；内力去掉根基那一截，一百点算一年功力；气血、内力按原来的比例保留；没有伤', () => {
    const raw = JSON.parse(FIXTURES['./fixtures/saves/v3-latest.json']);
    const s = migrate(raw);
    expect(s.v).toBe(SAVE_VERSION);
    expect(s.attr).toEqual({ 体魄: 22, 根骨: 22, 身法: 23, 悟性: 23, 胆魄: 22 });
    expect(s.gongli).toBeCloseTo((800 - 30) / 100);
    expect(s.wounds).toEqual({ hand: 0, foot: 0, inner: 0 });
    expect(s.hpMax).toBe(hpMaxOf(personOf(s)));
    expect(s.hp / s.hpMax).toBeCloseTo(820 / 1000, 2);
    expect(s.mp / s.mpMax).toBeCloseTo(460 / 800, 2);
    expect((s as unknown as Record<string, unknown>).attrApplied).toBeUndefined();
    expect((s as unknown as Record<string, unknown>).hpFrac).toBeUndefined();
    // 再读一次不变
    expect(migrate(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});

describe('存档第五版：世界状态', () => {
  const raw = (f: string): Record<string, unknown> => JSON.parse(FIXTURES[`./fixtures/saves/${f}.json`]);

  it('还没有世界的第四版存档：升到第五版，种子由名字和开局的现实时刻算，世界是开局的样子；反复读档不变', () => {
    const old = raw('v4-before-world');
    const s = migrate(raw('v4-before-world'));
    expect(s.v).toBe(5);
    expect(s.w.seed).toBe(seedOf('孤舟', 1791300000000));
    expect(s.w.seed).toBe(worldSeed('孤舟', (old.real as { start: number }).start));
    expect(s.w).toEqual(initWorld(s.w.seed, dayNo(s)));
    expect(ownerOf('dukou', s)).toBe('dong');
    expect(s.w.fac.hei.power).toBe(45);
    expect(s.w.fac.dong.holds).toContain('dukou');
    expect(migrate(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('打赢了屠千山、码头归了西舵的第四版存档：黑风寨残部实力十八，码头归西舵，过路钱二十文', () => {
    const s = migrate(raw('v4-matou-xiduo'));
    expect(s.v).toBe(5);
    expect(s.w.seed).toBe(seedOf('寒舟', 1791400000000));
    expect(s.w.day).toBe(dayNo(s));
    expect(s.w.fac.hei.power).toBe(18);
    expect(ownerOf('dukou', s)).toBe('xi');
    expect(s.w.fac.xi.holds).toEqual(['dukou']);
    expect(s.w.fac.dong.holds).not.toContain('dukou');
    // 旗标、世事照旧留着
    expect(s.flags.boss).toBe(true);
    expect(s.shi?.ss_matou.at).toBe('xiduo');
    setState(s);
    s.silver = 100;
    payFare('dukou');
    expect(s.silver).toBe(80);
    expect(migrate(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('码头一事的每一步：迁移推出的主人，和实玩时世事走到这一步写下的主人一样', () => {
    for (const at of ['qi', 'duizhi', 'huobing', 'xiduo', 'dongduo', 'tiaoting', 'guanfu']) {
      const r = raw('v4-matou-xiduo');
      (r.shi as Record<string, { at: string }>).ss_matou.at = at;
      const m = migrate(r);
      expect(ownerOf('dukou', m), `迁移 ${at}`).toBe(V5_MATOU[at] ?? 'dong');
      // 实玩：开局的世界，世事推到这一步
      const live = skipToYangzhou();
      live.flags.boss = true;
      setState(live);
      moveShi('ss_matou', at);
      expect(ownerOf('dukou', live), `实玩 ${at}`).toBe(ownerOf('dukou', m));
      expect(marksOf('dukou', live), `痕迹 ${at}`).toEqual(marksOf('dukou', m));
    }
    const t = raw('v4-matou-xiduo');
    (t.shi as Record<string, { at: string }>).ss_matou.at = 'tiaoting';
    expect(marksOf('dukou', migrate(t)).length).toBe(1);
  });

  it('第五版的存档缺了世界、或者世界缺了几块：按当前的内容补上，不丢档', () => {
    const t = JSON.parse(JSON.stringify(skipToYangzhou()));
    delete t.w;
    const s = migrate(t);
    expect(s.w).toEqual(initWorld(worldSeed(s.name, s.real.start), dayNo(s)));
    const u = JSON.parse(JSON.stringify(skipToYangzhou()));
    delete u.w.fac.gai;
    delete u.w.place.cheng;
    u.w.place.dukou.marks = null;
    u.w.ppl = 'x';
    const m = migrate(u);
    expect(m.w.fac.gai.holds).toEqual(['bs2_longwang']);
    expect(m.w.place.cheng.order).toBe(65);
    expect(m.w.place.dukou.marks).toEqual([]);
    expect(m.w.ppl).toEqual({});
  });

  it('读不出来的第五版存档也原样另存，不覆盖', () => {
    mem.setItem(KEY, JSON.stringify({ ...skipToYangzhou(), v: 5, w: 1, skills: null }).slice(0, -5));
    expect(readSave().broken).toBe(true);
    writeSave(newGame());
    expect([...mem.m.keys()].filter(k => k.startsWith('jhyy-save-broken-')).length).toBe(1);
  });
});
