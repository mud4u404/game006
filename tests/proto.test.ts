/**
 * 原型（docs/foundation.md 第三版第八节）：虚实、胜负以后。
 * 正式的游戏里这些都关着；原型的构建（VITE_PROTO=1）才打开。
 */
import { describe, expect, it } from 'vitest';
import { FOES } from '../src/content';
import { AFTERMATH_IDS, FATE_LABEL, aftermathOf, type FateKey } from '../src/content/aftermath';
import { PROTO, xushiOn } from '../src/core/proto';
import { VS_FEINT, feintRate, mergeOdds } from '../src/engine/xushi';
import { MODERN_WORDS, SPOILER_WORDS } from './style-rules';

const KEYS = Object.keys(FATE_LABEL) as FateKey[];

describe('原型开关', () => {
  it('正式的构建里关着', () => {
    expect(PROTO).toBe(false);
    expect(xushiOn()).toBe(false);
  });
});

describe('虚实（随机应变）', () => {
  it('硬接最怕虚招，拆招最不怕（和模拟里的一样）', () => {
    expect(VS_FEINT.block).toBeLessThan(VS_FEINT.rush);
    expect(VS_FEINT.rush).toBeLessThan(VS_FEINT.dodge);
    expect(VS_FEINT.dodge).toBeLessThan(VS_FEINT.parry);
  });
  it('成算并进虚实：不使虚招就不变；使虚招时，硬接的成算掉得最多', () => {
    expect(mergeOdds(0.6, 'block', 0)).toBe(0.6);
    expect(mergeOdds(0.6, 'parry', 0.25)).toBeCloseTo(0.75 * 0.6 + 0.25 * 0.7);
    expect(0.6 - mergeOdds(0.6, 'block', 0.25)).toBeGreaterThan(0.6 - mergeOdds(0.6, 'dodge', 0.25));
  });
  it('切磋、剧本战、饿急了的孩子不使虚招', () => {
    for (const f of FOES) if (f.spar || f.script) expect(feintRate(f)).toBe(0);
    expect(feintRate({ id: 'ly_xiaozei' })).toBe(0);
    expect(feintRate({ id: 'zy_csf' })).toBeGreaterThan(0);
  });
});

describe('胜负以后', () => {
  it('切磋、剧本战、剧情定了生死的屠千山不问；差事里已经写好放还是杀的草上飞也不问', () => {
    for (const f of FOES) if (f.spar || f.script || f.id === 'tu' || f.id === 'zy_csf') expect(aftermathOf(f)).toBeNull();
  });
  it('只问单独写了的对手', () => {
    for (const f of FOES) expect(aftermathOf(f) !== null).toBe(AFTERMATH_IDS.includes(f.id) && !f.spar && !f.script);
  });
  it('单独写了的对手都在内容里', () => {
    const ids = new Set(FOES.map(f => f.id));
    for (const id of AFTERMATH_IDS) expect(ids.has(id), id).toBe(true);
  });
  it('每种选法都留下旗标（放走的人记得你，留给以后的内容接）', () => {
    for (const f of FOES) {
      const a = aftermathOf(f);
      if (!a) continue;
      for (const k of KEYS) expect(a[k].fx.some(e => e.type === 'flag' && e.flag === `fate_${f.id}_${k}`), `${f.id} ${k}`).toBe(true);
    }
  });
  it('文字守文风：对白用「」，数字写中文，不用现代词，不剧透', () => {
    for (const f of FOES) {
      const a = aftermathOf(f);
      if (!a) continue;
      const texts = [a.plea, ...KEYS.flatMap(k => [a[k].say, a[k].later, ...a[k].fx.flatMap(e => (e.type === 'feed' ? [e.text] : []))])];
      for (const t of texts) {
        expect(t, t).not.toMatch(/[0-9]/);
        expect(t, t).not.toMatch(/["“”]/);
        for (const re of MODERN_WORDS) expect(t, t).not.toMatch(re);
        for (const w of SPOILER_WORDS) expect(t.includes(w), t).toBe(false);
      }
    }
  });
});

describe('原型的存档和正式的分开', () => {
  it('加了前缀的存档只读写自己的键，正式的进度原样不动', async () => {
    const { prefixed } = await import('../src/core/save');
    const m = new Map<string, string>([['jhyy-save-v2', '正式的进度'], ['jhyy-bak-1', '正式的备份']]);
    const base = {
      getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); },
      key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size; }
    };
    const p = prefixed(base, 'jhyy-proto:');
    expect(p.getItem('jhyy-save-v2')).toBeNull();
    p.setItem('jhyy-save-v2', '原型的进度');
    p.setItem('jhyy-bak-2', '原型的备份');
    p.removeItem('jhyy-bak-1');
    expect(m.get('jhyy-save-v2')).toBe('正式的进度');
    expect(m.get('jhyy-bak-1')).toBe('正式的备份');
    expect(p.getItem('jhyy-save-v2')).toBe('原型的进度');
    expect(p.length).toBe(2);
    expect([p.key(0), p.key(1)].sort()).toEqual(['jhyy-bak-2', 'jhyy-save-v2']);
  });
});
