import { REL_LEGACY } from '../src/engine/renqing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearSaveSafely, exportCode, importCode, listBackups, migrate, readSave, useStore, writeSave, KEY, SAVE_VERSION, type SaveStore } from '../src/core/save';
import { newGame, skipToYangzhou } from '../src/core/state';
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

  it('搭配里指向没学会、已删除、放错位置的武功，或者不认识的位置名，就空出来，不崩', () => {
    const s = migrate({ ...skipToYangzhou(), loadout: { weapon: 'no_such_skill', fist: 'hanjiang', neigong: 'hanjiang', qinggong: 'taxue', main: 'hanjiang' } });
    expect(s.loadout).toEqual({ qinggong: 'taxue' });
  });

  it('手里的兵器已经不在行囊里了，就空着手', () => {
    const t = skipToYangzhou();
    delete t.items.qingfeng;
    expect(migrate(t).gear).toEqual({});
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
    expect(s.v).toBe(4);
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
