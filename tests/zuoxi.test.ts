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
import { roomNpcs } from '../src/engine/world';
import { askWhere, askableTargets, canTell, whereaboutsOf, lifeOf, roomsOf } from '../src/engine/chuanwen';
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
  beforeAll(() => { skipToYangzhou(); S.min = 12 * 60; }); // 固定时钟，房间在场人物确定

  const withAt = NPCS.filter(n => n.at && !n.obj);

  // 一对：势力不同、常待处不相交、且此刻不同室 —— 应「不知道」
  function findStranger(): [typeof withAt[number], typeof withAt[number]] {
    for (const a of withAt) for (const b of withAt) {
      if (a.id === b.id) continue;
      const fa = lifeOf(a.id)?.faction, fb = lifeOf(b.id)?.faction;
      if (fa && fb && fa !== fb) {
        const ra = new Set(roomsOf(a.id)), rb = new Set(roomsOf(b.id));
        if (![...ra].some(r => rb.has(r)) && !roomNpcs(S.loc).includes(b.id)) return [a, b];
      }
    }
    throw new Error('找不到势力不同、常待处不相交的两个有作息人物');
  }
  // 一对：势力相同（或常待处相交）—— 应「答得出」
  function findClan(): [typeof withAt[number], typeof withAt[number]] {
    for (const a of withAt) for (const b of withAt) {
      if (a.id === b.id) continue;
      const fa = lifeOf(a.id)?.faction, fb = lifeOf(b.id)?.faction;
      if (fa && fb && fa === fb) return [a, b];
      const ra = new Set(roomsOf(a.id)), rb = new Set(roomsOf(b.id));
      if ([...ra].some(r => rb.has(r))) return [a, b];
    }
    throw new Error('找不到同势力或常待处相交的两个有作息人物');
  }
  const [A0, B0] = findStranger();
  const [A1, B1] = findClan();
  const noAt = NPCS.find(n => !n.at && !n.obj)!;

  it('有作息、玩家认识、活着、不是物件、不是被问者，才进「问人」名单', () => {
    S.sel = B0.id; // 问的是 B0，自己不算
    expect(askableTargets()).not.toContain(B0.id);
    expect(askableTargets()).not.toContain(S.sel);
    S.rel[A0.id] = '点头之交';
    expect(askableTargets()).toContain(A0.id);
    // 物件不列
    const obj = NPCS.find(n => n.obj)!;
    S.rel[obj.id] = '点头之交';
    expect(askableTargets()).not.toContain(obj.id);
  });

  it('不同圈子（势力不同、地方不同）的，只说不知道——含界面路径（目标在「问人」名单里也照样不知道）', () => {
    S.sel = A0.id;
    S.rel[B0.id] = '点头之交'; // 让 B0 进「问人」名单
    expect(askableTargets()).toContain(B0.id);
    expect(canTell(A0.id, B0.id)).toBe(false);
    const r = askWhere(A0.id, B0.id);
    expect(r.src).toBe('unknown');
    expect(r.text).toContain('素不相识');
    expect(r.text).toContain('哪里晓得');
  });

  it('没个准地方的人，照实说不知道', () => {
    S.sel = A0.id;
    const r = askWhere(A0.id, noAt.id);
    expect(r.src).toBe('nosched');
    expect(r.text).toContain('没个准地方');
  });

  it('同一圈子（同势力/同处）才答得出公开去处', () => {
    S.sel = A1.id;
    expect(canTell(A1.id, B1.id)).toBe(true);
    const r = askWhere(A1.id, B1.id);
    expect(r.src).toBe('know');
    expect(r.text).toContain(B1.name);
    expect(/平日的去处我知道|没个准地方/.test(r.text)).toBe(true);
  });

  it('带旗标条件的作息，旗标没成立时不说；成立时才说', () => {
    const n = NPCS.find(x => x.id === A1.id)!;
    const saved = n.at;
    n.at = [{ room: 'yz_zhaobi', if: { flag: '_zuoxi_test_flag' } } as NpcAt];
    expect(whereaboutsOf(A1.id)).toBe(''); // 旗标没成立，这处不公开
    S.flags['_zuoxi_test_flag'] = true;
    expect(whereaboutsOf(A1.id)).toContain('府衙照壁'); // 成立后说出来
    delete S.flags['_zuoxi_test_flag'];
    n.at = saved;
  });

  it('secret 的一处不打听出来', () => {
    const n = NPCS.find(x => x.id === A1.id)!;
    const saved = n.at;
    n.at = [{ room: 'yz_zhaobi', if: { hour: { from: 20, to: 5 } }, secret: true } as NpcAt];
    expect(whereaboutsOf(A1.id)).toBe(''); // secret 的整条都不说
    n.at = saved;
  });

  it('事件打断作息：知情的人才说得出新去处', () => {
    const w = worldOf();
    w.ppl[B1.id] = { at: { room: 'gz_town', until: 999 } };
    // 让 A1 知道这件事（传闻牵涉 B1）
    w.rumor['_t'] = { id: '_t', ev: 'x', ph: '', day: 0, place: '', juice: 0.5, subj: [B1.id] } as any;
    w.ppl[A1.id] = { ...(w.ppl[A1.id] || {}), know: [['_t', 0, 0, '']] };
    S.rel[B1.id] = '点头之交';
    S.sel = A1.id;
    const r = askWhere(A1.id, B1.id);
    expect(r.src).toBe('know');
    expect(r.text).toContain('这几日');
    expect(r.text).toContain('瓜洲镇');
    // 不知情的人（清掉 know）只说平常的去处
    delete (w.ppl[A1.id] as any).know;
    const r2 = askWhere(A1.id, B1.id);
    expect(r2.text).not.toContain('这几日');
  });
});
