import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearSaveSafely, exportCode, importCode, listBackups, migrate, readSave, useStore, writeSave, KEY, SAVE_VERSION, type SaveStore } from '../src/core/save';
import { newGame, skipToYangzhou } from '../src/core/state';
import { huohou } from '../src/engine/formulas';
import type { GameState } from '../src/core/state';

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
      for (const k of ['name', 'loc', 'chapter', 'silver', 'quests', 'flags', 'items', 'skills', 'rel', 'xia'] as const) expect(s[k], `${file} 的 ${k}`).toEqual(old[k]);
    }
  });

  it('改版前（没有搭配）的存档，按原来的固定搭配排，成算一点不变', () => {
    const s = migrate(JSON.parse(FIXTURES['./fixtures/saves/v2-before-loadout.json']));
    expect(s.loadout).toEqual({ neigong: 'xinfa', qinggong: 'taxue', main: 'hanjiang', off: 'jinghong', ult: 'duanshui' });
    expect(s.eming).toBe(0);
    // 惊鸿剑是上品、境界又不低，自动排槽会把它放进主手；旧存档不能被这样对调
    for (const [main, off] of [[1, 1], [2, 2], [3, 2], [1, 3], [4, 4]]) {
      const t = { ...s, skills: { ...s.skills, hanjiang: { r: main, p: 0 }, jinghong: { r: off, p: 0 } } } as GameState;
      const m = migrate(JSON.parse(JSON.stringify({ ...t, loadout: undefined })));
      expect(m.loadout.main).toBe('hanjiang');
      expect(huohou(m, 'parry')).toBe(huohou(t, 'parry'));
      expect(huohou(m, 'rush')).toBe(huohou(t, 'rush'));
    }
  });

  it('存档里的地点已经不存在时，送回安全的地方，不崩', () => {
    const s = migrate({ ...skipToYangzhou(), loc: 'no_such_place' });
    expect(s.loc).toBe(skipToYangzhou().loc);
    const p = migrate({ ...newGame(), loc: 'no_such_place' });
    expect(p.loc).toBe(newGame().loc);
  });

  it('搭配里指向没学会或已删除的武功，就空出来', () => {
    const s = migrate({ ...skipToYangzhou(), loadout: { main: 'no_such_skill', off: 'hanjiang', neigong: 'hanjiang' } });
    expect(s.loadout.main).toBeUndefined();
    expect(s.loadout.off).toBe('hanjiang');
    expect(s.loadout.neigong).toBeUndefined();
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
    expect(listBackups()[0].label).toBe('重新开始前');
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
});
