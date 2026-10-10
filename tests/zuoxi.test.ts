/**
 * #283 第二十三条：作息不重叠的机器检查 + 打听去处的行为。
 *
 * 作息不重叠（docs/sheji-021-026.md 023 节）：每个写了 at 的人物，一天二十四个时辰各取一刻，
 * at 的条件最多一条成立。条件里读旗标、世界状态的，按「都不成立」「都成立」两种极端各测一次。
 *
 * 现有违规的，列进 WHITELIST（只测、不改内容，人物 id 写在白名单里，回报列出）。
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { NPCS } from '../src/content';
import { test } from '../src/engine/dsl';
import { S, skipToYangzhou } from '../src/core/state';
import { worldOf } from '../src/engine/shijie';
import { askWhere, askableTargets, canTell, whereaboutsOf } from '../src/engine/chuanwen';
import type { NpcAt } from '../src/content/types';

/** 临时白名单：测出来确有过重叠、且现在不该改内容的人物 id。回报里要列出 */
const WHITELIST = new Set<string>([
  // 例如 'xxx_yyy',  // 等跑出违规再填
]);

function atEntries(id: string): NpcAt[] {
  const a = NPCS.find(n => n.id === id)?.at;
  if (!a) return [];
  return Array.isArray(a) ? a : [a];
}

describe('作息不重叠', () => {
  beforeAll(() => skipToYangzhou());

  it('每个人每个时辰最多一处作息成立（旗标按两种极端各测一次）', () => {
    const violators: { id: string; hour: number; active: string[] }[] = [];
    for (const n of NPCS) {
      const entries = atEntries(n.id);
      if (entries.length < 2) continue; // 一处无所谓重叠
      for (let h = 0; h < 24; h++) {
        const m = h * 60 + 15;
        const real = entries.filter(e => { S.min = m; return test(e.if); }).map(e => e.room);
        // 极端一：旗标全成立
        const saved = S.flags;
        S.flags = new Proxy({}, { get: () => true }) as any;
        const allTrue = entries.filter(e => { S.min = m; return test(e.if); }).map(e => e.room);
        // 极端二：旗标全不成立
        S.flags = new Proxy({}, { get: () => false }) as any;
        const allFalse = entries.filter(e => { S.min = m; return test(e.if); }).map(e => e.room);
        S.flags = saved;
        const max = Math.max(real.length, allTrue.length, allFalse.length);
        if (max > 1) violators.push({ id: n.id, hour: h, active: [...new Set([...real, ...allTrue, ...allFalse])] });
      }
    }
    // 违规的都必须在白名单里；白名单里的人也确有其事，免得白名单悄悄掩盖新回归
    for (const v of violators) expect(WHITELIST.has(v.id), `未列入白名单的重叠：${v.id} 在 ${v.hour} 时 ${JSON.stringify(v.active)} 多处成立`).toBe(true);
    for (const id of WHITELIST) {
      const hit = violators.some(v => v.id === id);
      expect(hit, `白名单里的 ${id} 现已不再重叠，请把它从白名单删掉`).toBe(true);
    }
    // 回报用：把违规列出来
    if (violators.length) console.log('作息重叠（白名单内）：', violators.map(v => `${v.id}@${v.hour}`).join(', '));
  });
});

describe('打听去处', () => {
  beforeAll(() => skipToYangzhou());

  const withAt = NPCS.filter(n => n.at);
  const A = withAt[0];
  const B = withAt.find(n => n.id !== A.id)!;

  it('有作息、且玩家认识的人才会进「问人」的名单', () => {
    const before = askableTargets();
    expect(before).not.toContain(A.id);
    S.rel[A.id] = '点头之交';
    expect(askableTargets()).toContain(A.id);
  });

  it('不认识这人，只说不知道', () => {
    S.rel[B.id] = '素不相识';
    const r = askWhere(A.id, B.id);
    expect(r.src).toBe('unknown');
    expect(r.text).toContain('哪知道');
  });

  it('认识（点头之交以上）就答得出公开去处', () => {
    S.rel[B.id] = '点头之交';
    expect(canTell(A.id, B.id)).toBe(true);
    const r = askWhere(A.id, B.id);
    expect(r.src).toBe('know');
    expect(r.text).toContain(B.name);
    // 含作息的公开部分：白日/入夜/常在某处
    expect(/平日的去处我知道|没个准地方/.test(r.text)).toBe(true);
  });

  it('secret 的一处不打听出来', () => {
    const n = NPCS.find(x => x.id === B.id)!;
    const saved = n.at;
    const base: NpcAt[] = Array.isArray(saved) ? saved : saved ? [saved] : [];
    n.at = [...base, { room: 'yz_zhaobi', if: { hour: { from: 20, to: 5 } }, secret: true } as NpcAt];
    const out = whereaboutsOf(B.id);
    expect(out).not.toContain('府衙照壁'); // secret 的那处不出现
    expect(out.length).toBeGreaterThan(0);
    n.at = saved;
  });

  it('事件打断作息：知情的人才说得出新去处', () => {
    const w = worldOf();
    w.ppl[B.id] = { at: { room: 'gz_town', until: 999 } };
    // 让 A 知道这件事（传闻牵涉 B）
    w.rumor['_t'] = { id: '_t', ev: 'x', ph: '', day: 0, place: '', juice: 0.5, subj: [B.id] } as any;
    w.ppl[A.id] = { ...(w.ppl[A.id] || {}), know: [['_t', 0, 0, '']] };
    S.rel[B.id] = '点头之交';
    const r = askWhere(A.id, B.id);
    expect(r.src).toBe('know');
    expect(r.text).toContain('这几日');
    expect(r.text).toContain('瓜洲镇');
    // 不知情的人（清掉 know）只说平常的去处
    delete (w.ppl[A.id] as any).know;
    const r2 = askWhere(A.id, B.id);
    expect(r2.text).not.toContain('这几日');
  });
});
