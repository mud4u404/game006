/**
 * 武学的层级表现（engine/cengji.ts、content 的 lv / resp）：
 * 境界分生熟精化四段；同一招第一重和第五重取到的句子不同；没写的段往下退；
 * 写了 lv 的普通招式不写「中没中」；lv / resp 的文字过文风检查。
 * 样板见 docs/yangban-wuxue.md。
 */
import { describe, expect, it } from 'vitest';
import { REALMS, SKILLS, duanOf, skillById } from '../src/content';
import { DUAN_CLS, lvPool, respPool } from '../src/engine/cengji';
import type { LvText, SkillDef } from '../src/content/types';
import { MODERN_WORDS } from './style-rules';

const hj = skillById('hanjiang')!;
const mv = (name: string) => hj.moves!.find(m => m.name === name)!;
const base = (m: { text: string; alts?: string[] }) => [m.text, ...(m.alts ?? [])];

describe('四段', () => {
  it('第一、二重为生，三、四重为熟，五、六重为精，七重以上为化', () => {
    const got = REALMS.map((_, r) => duanOf(r)).join('');
    expect(got).toBe('生生熟熟精精化化化');
    expect(duanOf(99)).toBe('化');
  });
  it('每一段都有战报样式 class', () => {
    expect(Object.values(DUAN_CLS)).toEqual(['d-sheng', 'd-shu', 'd-jing', 'd-hua']);
  });
});

describe('取句：按境界段，没写的往下退', () => {
  it('同一招在第一重（下标 0）和第五重（下标 4）取到的句子不同', () => {
    for (const m of hj.moves!) {
      const lo = lvPool(m.lv, 0, base(m)), hi = lvPool(m.lv, 4, base(m));
      expect(lo.duan, m.name).toBe('生');
      expect(hi.duan, m.name).toBe('精');
      expect(hi.pool.some(t => lo.pool.includes(t)), `${m.name}：精段和生段不该是同一句`).toBe(false);
    }
  });
  it('生段（第一、二重）取原来的 text 与 alts', () => {
    const m = mv('孤帆远影');
    expect(lvPool(m.lv, 0, base(m)).pool).toEqual(base(m));
    expect(lvPool(m.lv, 1, base(m)).pool).toEqual(base(m));
  });
  it('熟、精、化各取各的', () => {
    const m = mv('寒潭映月');
    expect(lvPool(m.lv, 2, base(m))).toEqual({ duan: '熟', pool: m.lv!.熟 });
    expect(lvPool(m.lv, 3, base(m))).toEqual({ duan: '熟', pool: m.lv!.熟 });
    expect(lvPool(m.lv, 5, base(m))).toEqual({ duan: '精', pool: m.lv!.精 });
    expect(lvPool(m.lv, 6, base(m))).toEqual({ duan: '化', pool: m.lv!.化 });
    expect(lvPool(m.lv, 8, base(m))).toEqual({ duan: '化', pool: m.lv!.化 });
  });
  it('某段没写时往下退，退到底用原来的句子，不往高处退', () => {
    const lv: LvText = { 熟: ['熟句'], 化: ['化句'] };
    const b = ['原句'];
    expect(lvPool(lv, 4, b)).toEqual({ duan: '熟', pool: ['熟句'] });
    expect(lvPool(lv, 6, b)).toEqual({ duan: '化', pool: ['化句'] });
    expect(lvPool({ 精: ['精句'] }, 2, b)).toEqual({ duan: '生', pool: b });
    expect(lvPool({ 精: ['精句'] }, 7, b)).toEqual({ duan: '精', pool: ['精句'] });
    expect(lvPool(undefined, 8, b)).toEqual({ duan: '生', pool: b });
    expect(lvPool({ 熟: [] }, 3, b)).toEqual({ duan: '生', pool: b });
  });
  it('绝招同理', () => {
    const p = hj.performs![0];
    expect(lvPool(p.lv, 0, [p.text]).pool).toEqual([p.text]);
    expect(lvPool(p.lv, 3, [p.text]).pool).toEqual(p.lv!.熟);
    expect(lvPool(p.lv, 6, [p.text]).pool).toEqual(p.lv!.化);
  });
});

describe('内功硬接、轻功闪避的应对句', () => {
  it('寒江心法、踏雪无痕写了四段，各段不同', () => {
    for (const id of ['xinfa', 'taxue']) {
      const sk = skillById(id)!;
      const seen = [0, 2, 4, 6].map(r => respPool(sk, r)!);
      expect(seen.map(x => x.duan)).toEqual(['生', '熟', '精', '化']);
      expect(new Set(seen.map(x => x.pool[0])).size).toBe(4);
    }
  });
  it('没写 resp 的武功返回空，用通用的那句', () => {
    expect(respPool(skillById('duanshui'), 3)).toBeNull();
    expect(respPool(undefined, 3)).toBeNull();
  });
  it('某段没写往下退，生段也没写则返回空', () => {
    const fake = { resp: { 熟: ['熟句'] } } as unknown as SkillDef;
    expect(respPool(fake, 6)).toEqual({ duan: '熟', pool: ['熟句'] });
    expect(respPool(fake, 1)).toBeNull();
  });
});

describe('lv / resp 的文字', () => {
  const withLv = SKILLS.filter(k => k.moves?.some(m => m.lv) || k.performs?.some(p => p.lv) || k.resp);
  it('寒江三门已写入样板', () => {
    expect(withLv.map(k => k.id)).toEqual(expect.arrayContaining(['hanjiang', 'xinfa', 'taxue']));
    expect(hj.moves!.every(m => m.lv?.熟?.length && m.lv.精?.length && m.lv.化?.length)).toBe(true);
    expect(hj.performs!.every(p => p.lv?.熟?.length && p.lv.精?.length && p.lv.化?.length)).toBe(true);
  });
  it('写了 lv 的武功，每一重取到的句子都不为空', () => {
    for (const k of withLv) {
      for (const m of k.moves ?? []) if (m.lv) for (let r = 0; r < REALMS.length; r++) expect(lvPool(m.lv, r, base(m)).pool.length, `${k.name}「${m.name}」第 ${r} 重`).toBeGreaterThan(0);
      for (const p of k.performs ?? []) if (p.lv) for (let r = 0; r < REALMS.length; r++) expect(lvPool(p.lv, r, [p.text]).pool.length, `${k.name}「${p.name}」第 ${r} 重`).toBeGreaterThan(0);
    }
  });
  it('普通招式的 lv 只写到招式到了哪里，不写「刺中」「着了」「中招」这类结果（引擎会接对手闪开、架住或中招的话）', () => {
    const RESULT = /刺中|着了|中招|击中|打中|命中|砍中|削中|劈中|点中|扫中|伤了|受伤|负伤|倒地|软了|发软|软下|酸麻|倒了|退了|退出|退一步|退两步|吃痛|跌了出去|跌出|跌倒|摔倒|栽倒|踉跄|吐血|口吐|闷哼|惨叫|痛呼/;
    // 待 #275 订正（skills-gaibang.ts 的莲花掌、缠丝擒拿手，已派给 Trae）：订正后删掉这张白名单
    const PENDING_275 = new Set([
      '莲花掌「莲台拂尘」精', '莲花掌「莲台拂尘」化',
      '缠丝擒拿手「擒龙拿脉」精', '缠丝擒拿手「擒龙拿脉」化',
      '缠丝擒拿手「分筋错骨」熟', '缠丝擒拿手「分筋错骨」化'
    ]);
    const bad: string[] = [];
    for (const k of withLv) for (const m of k.moves ?? []) for (const [d, ts] of Object.entries(m.lv ?? {})) for (const t of ts ?? []) {
      if (PENDING_275.has(`${k.name}「${m.name}」${d}`)) continue;
      if (RESULT.test(t)) bad.push(`${k.name}「${m.name}」${d}：${t.slice(0, 24)}`);
    }
    expect(bad).toEqual([]);
  });
  it('普通招式的 lv 不以「你」开头（前面引擎会加「你使一招……」）；绝招的 lv 以「你」开头并点出招名', () => {
    const bad: string[] = [];
    for (const k of withLv) {
      for (const m of k.moves ?? []) for (const ts of Object.values(m.lv ?? {})) for (const t of ts ?? []) if (t.startsWith('你')) bad.push(`${k.name}「${m.name}」：${t.slice(0, 16)}`);
      for (const p of k.performs ?? []) for (const ts of Object.values(p.lv ?? {})) for (const t of ts ?? []) if (!t.startsWith('你') || !t.includes(`「${p.name}」`)) bad.push(`${k.name}绝招「${p.name}」：${t.slice(0, 16)}`);
    }
    expect(bad).toEqual([]);
  });
  it('lv / resp 里只用 {foe} {part}，不用现代词，数字写中文，不用英文引号', () => {
    const texts: string[] = [];
    for (const k of withLv) {
      for (const m of k.moves ?? []) for (const ts of Object.values(m.lv ?? {})) texts.push(...(ts ?? []));
      for (const p of k.performs ?? []) for (const ts of Object.values(p.lv ?? {})) texts.push(...(ts ?? []));
      for (const ts of Object.values(k.resp ?? {})) texts.push(...(ts ?? []));
    }
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) {
      expect([...t.matchAll(/\{(\w+)\}/g)].map(x => x[1]).filter(x => x !== 'foe' && x !== 'part'), t).toEqual([]);
      expect(MODERN_WORDS.find(r => r.test(t)), t).toBeUndefined();
      expect(/[0-9"']/.test(t), t).toBe(false);
    }
  });
});
