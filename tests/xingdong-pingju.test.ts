import { afterEach, beforeEach, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { exportCode, importCode, KEY, migrate, readSave, SAVE_VERSION, useStore, type SaveStore } from '../src/core/save';
import { setNowMs } from '../src/core/time';
import { act, LOG_LIMIT, plan, type ActionReq } from '../src/engine/xingdong';

class MemStore implements SaveStore {
  data = new Map<string, string>();
  writes = 0;
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); if (k === KEY) this.writes++; }
  removeItem(k: string) { this.data.delete(k); }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  get length() { return this.data.size; }
}
let mem: MemStore;
beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  mem = new MemStore(); useStore(mem);
});
afterEach(() => { useStore(null); setNowMs(() => Date.now()); });

const prize = (key = 'old-prize'): ActionReq =>
  ({ who: 'player', verb: '领奖', key, effects: [{ type: 'silver', delta: 10 }] });
const fill = (count = LOG_LIMIT): void => {
  for (let i = 0; i < count; i++) expect(act({ who: 'player', verb: '观察', effects: [] }).ok).toBe(true);
};

it('三百条新行动挤掉奖励记录以后，plan 与 act 仍拒绝旧请求且不动状态或存档', () => {
  const req = prize();
  expect(act(req).ok).toBe(true);
  fill();
  expect(S.log).toHaveLength(LOG_LIMIT);
  expect(S.log.some(e => e.key === req.key)).toBe(false);
  expect(S.settledKeys).toEqual([req.key]);
  const before = structuredClone(S), writes = mem.writes;
  expect(plan(req).ok).toBe(false);
  expect(act(req).ok).toBe(false);
  expect(S).toEqual(before); expect(mem.writes).toBe(writes);
});

it('存读与存档码往返保留归档；新凭据仍能领奖，下一次裁剪不重复归档', () => {
  const old = prize();
  expect(act(old).ok).toBe(true);
  fill();
  setState(readSave().state!);
  expect(S.v).toBe(SAVE_VERSION);
  expect(S.settledKeys).toEqual([old.key]);
  expect(act(old).ok).toBe(false);
  setState(importCode(exportCode(S)));
  expect(act(old).ok).toBe(false);
  const silver = S.silver;
  expect(act(prize('new-prize')).ok).toBe(true);
  expect(S.silver).toBe(silver + 10);
  fill();
  expect(S.log).toHaveLength(LOG_LIMIT);
  expect(S.settledKeys).toEqual(['old-prize', 'new-prize']);
  expect(act(prize('new-prize')).ok).toBe(false);
});

it('完成条件失败的凭据也归档；记录被裁掉和重载后不能再次退款', () => {
  const refund = { type: 'silver' as const, delta: -10 };
  const req: ActionReq = {
    who: 'player', verb: '办事', key: 'old-refund',
    effects: [refund, { type: 'silver', delta: -5 }, { type: 'time', add: 20 }, { type: 'silver', delta: 30 }],
    finish: { flag: 'never-finished' }, refundable: [refund]
  };
  const silver = S.silver, minutes = S.min;
  const result = act(req);
  expect(result.ok).toBe(false);
  expect(result.event?.why).toContain('完成条件');
  expect(S.silver).toBe(silver - 5); expect(S.min).toBe(minutes + 20);
  fill();
  setState(readSave().state!);
  const before = structuredClone(S), writes = mem.writes;
  expect(plan(req).why).toContain('已经结算');
  expect(act(req).ok).toBe(false);
  expect(S).toEqual(before); expect(mem.writes).toBe(writes);
  expect(S.settledKeys).toEqual(['old-refund']);
});

it('异常回滚同时撤销裁剪和归档，不占凭据；同一请求修好后可重试', () => {
  expect(act(prize()).ok).toBe(true);
  fill(LOG_LIMIT - 1);
  expect(S.settledKeys).toBeUndefined();
  const before = structuredClone(S), writes = mem.writes, req = prize('retry');
  const failed = act(req, undefined, () => { throw new Error('模拟完成断点失败'); });
  expect(failed.ok).toBe(false); expect(failed.why).toContain('模拟完成断点失败');
  expect(S).toEqual(before); expect(mem.writes).toBe(writes);
  expect(act(req).ok).toBe(true);
  expect(S.silver).toBe(before.silver + 10);
  expect(S.settledKeys).toEqual(['old-prize']);
  expect(S.log).toHaveLength(LOG_LIMIT);
  expect(act(req).ok).toBe(false);
});

it('满记录时父子共用凭据只领一次、只保存一次，裁剪以后仍拒绝', () => {
  fill();
  const req = prize('chain-prize'), silver = S.silver, writes = mem.writes;
  expect(act({ ...req, chains: [req] }).ok).toBe(true);
  expect(S.silver).toBe(silver + 10);
  expect(S.log.filter(e => e.key === req.key)).toHaveLength(1);
  expect(mem.writes).toBe(writes + 1);
  fill();
  expect(S.settledKeys).toEqual(['chain-prize']);
  expect(act(req).ok).toBe(false);
});

it('读档先收被裁掉记录的凭据，再裁长记录；非法归档值过滤，合法值去重', () => {
  expect(act(prize()).ok).toBe(true);
  const first = structuredClone(S.log[0]);
  fill();
  const restored = migrate({
    ...structuredClone(S),
    log: [first, { ...first, n: 2 }, ...S.log],
    settledKeys: ['held', 'held', '', 123, null, {}, '__proto__']
  });
  expect(restored.log).toHaveLength(LOG_LIMIT);
  expect(restored.settledKeys).toEqual(['held', '__proto__', 'old-prize']);
  expect(migrate(structuredClone(restored))).toEqual(restored);
  setState(restored);
  expect(plan(prize()).ok).toBe(false);
  expect(plan(prize('held')).ok).toBe(false);
  expect(plan(prize('__proto__')).ok).toBe(false);
});

it('缺归档的旧档继续玩；无凭据行动不创建归档，非法归档类型修成空清单', () => {
  setState(migrate(skipToYangzhou()));
  expect(S.settledKeys).toBeUndefined();
  fill(LOG_LIMIT + 1);
  expect(S.log).toHaveLength(LOG_LIMIT); expect(S.settledKeys).toBeUndefined();
  const raw = structuredClone(S);
  expect(migrate({ ...raw, settledKeys: { wrong: true } }).settledKeys).toEqual([]);
  expect(migrate({ ...raw, settledKeys: null }).settledKeys).toEqual([]);
  expect(act(prize('fresh-old-save')).ok).toBe(true);
});

it('归档超过三百个凭据不再次截掉，最早的领奖事实在重载后仍有效', () => {
  for (let i = 0; i <= LOG_LIMIT; i++) expect(act(prize(`prize:${i}`)).ok).toBe(true);
  fill();
  setState(readSave().state!);
  expect(S.log).toHaveLength(LOG_LIMIT);
  expect(S.settledKeys).toHaveLength(LOG_LIMIT + 1);
  expect(act(prize('prize:0')).ok).toBe(false);
  expect(act(prize(`prize:${LOG_LIMIT}`)).ok).toBe(false);
});
