import { afterEach, describe, expect, it } from 'vitest';
import { JOBS, NPCS, ROOMS, SHI } from '../src/content';
import { ROOM_MERGED, mergedRoom } from '../src/content/room-alias';
import { migrate } from '../src/core/save';
import { newGame, skipToYangzhou } from '../src/core/state';

/**
 * 负责人 10-10：「同一个地点里堆了太多场景，且毫无逻辑」（docs/sheji-youhua-1010.md 第四条，docs/changjing-1010.md）。
 * 一个地点（RoomDef.area）像一条街、一座寺、一个码头，最多八处；两处并成一处以后，旧 id 要在旧档里映射过去。
 */
const AREA_MAX = 8;

describe('每个地点不超过八处', () => {
  it(`同一个 area 下的场景最多 ${AREA_MAX} 处，area 不许空`, () => {
    const by = new Map<string, string[]>();
    const errs: string[] = [];
    for (const r of ROOMS) {
      if (!r.area.trim()) { errs.push(`${r.id}：area 是空的`); continue; }
      by.set(r.area, [...(by.get(r.area) ?? []), r.id]);
    }
    for (const [area, ids] of by) if (ids.length > AREA_MAX) errs.push(`地点「${area}」有 ${ids.length} 处：${ids.join('、')}。挪一些到对的地点，或者把太像的并成一处`);
    expect(errs, errs.join('\n')).toEqual([]);
  });

  it('同一个地点在同一个地区里（不跨地区）', () => {
    const reg = new Map<string, Set<string>>();
    for (const r of ROOMS) reg.set(r.area, (reg.get(r.area) ?? new Set()).add(r.region));
    const bad = [...reg].filter(([, s]) => s.size > 1).map(([a, s]) => `${a}：${[...s].join('、')}`);
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

describe('被并掉的场景', () => {
  const touched = (id: string): string[] => {
    const hit: string[] = [];
    const has = (v: unknown): boolean => JSON.stringify(v).includes(`"${id}"`);
    for (const r of ROOMS) if (r.exits.some(e => e[1] === id)) hit.push(`${r.id} 的出口`);
    for (const n of NPCS) if (n.at && has(n.at)) hit.push(`人物 ${n.id} 的 at`);
    for (const j of JOBS) if (j.at === id) hit.push(`差事 ${j.id} 的 at`);
    for (const s of SHI) if (has(s)) hit.push(`世事 ${s.id}`);
    return hit;
  };

  afterEach(() => { delete ROOM_MERGED.old_changjing_a; delete ROOM_MERGED.old_changjing_b; });

  it('映射表合法：旧 id 已不在内容里，指向的是现有场景，不成环', () => {
    const errs: string[] = [];
    const ids = new Set(ROOMS.map(r => r.id));
    for (const [old, to] of Object.entries(ROOM_MERGED)) {
      if (ids.has(old)) errs.push(`${old}：映射表里写了它被并掉，内容里却还有这一处`);
      if (!ids.has(mergedRoom(old))) errs.push(`${old} → ${to}：并入的那一处不存在`);
      for (const w of touched(old)) errs.push(`${old}：${w}还指着已经并掉的 id`);
    }
    expect(errs, errs.join('\n')).toEqual([]);
  });

  it('旧档里的旧 id 映射过去：所在、差事的交差处、世界里的地方痕迹都跟着换', () => {
    const target = ROOMS.find(r => r.id === 'cheng')!.id;
    ROOM_MERGED.old_changjing_a = target;
    ROOM_MERGED.old_changjing_b = 'old_changjing_a'; // 链也要走得通
    const s = skipToYangzhou();
    const raw = JSON.parse(JSON.stringify(s)) as typeof s;
    raw.loc = 'old_changjing_b';
    raw.yue = [{ id: 'job_none', npc: 'x', at: 'old_changjing_a', due: 1, text: '' }];
    raw.w.place.old_changjing_a = { order: 12, prosper: 34, price: 1, marks: [] };
    raw.w.ppl.zz_old_changjing = { at: { room: 'old_changjing_b', until: 99999 } };
    const old = Object.keys(raw.w.fac)[0];
    if (old) raw.w.fac[old].holds = ['old_changjing_a', target];
    const got = migrate(raw);
    expect(got.loc).toBe(target);
    expect(got.yue[0].at).toBe(target);
    expect(got.w.ppl.zz_old_changjing?.at?.room).toBe(target);
    expect(got.w.place.old_changjing_a).toBeUndefined();
    expect(got.w.place[target]).toBeDefined();
    if (old) expect(got.w.fac[old].holds.filter(h => h === target)).toHaveLength(1);
  });

  it('没并过的 id 原样不动；新游戏读出来所在不变', () => {
    expect(mergedRoom('cheng')).toBe('cheng');
    const g = newGame();
    expect(migrate(JSON.parse(JSON.stringify(g))).loc).toBe(g.loc);
  });
});
