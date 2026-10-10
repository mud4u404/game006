import { describe, expect, it } from 'vitest';
import { yaoqiuLink, yaoqiuStatus, yaoqiuSummary } from '../public/kanban/core.mjs';

const data = {
  merged: [{ n: 10 }, { n: 11 }],
  pulls: [{ n: 20, sha: 'g' }, { n: 21, sha: 'r' }],
  issues: [{ n: 30 }],
  closedIssues: [40],
  checks: { g: { check: 'ok', smoke: 'ok' }, r: { check: 'fail', smoke: 'ok' } },
};

describe('yaoqiuLink', () => {
  it('五种状态：PR 已合、PR 开着绿/红、Issue 开着、Issue 已关，查不到', () => {
    expect(yaoqiuLink(10, data)).toMatchObject({ label: 'PR 已合', done: true });
    expect(yaoqiuLink(20, data)).toMatchObject({ label: 'PR 开着·绿', cls: 'ok', done: false });
    expect(yaoqiuLink(21, data)).toMatchObject({ label: 'PR 开着·红', cls: 'bad', done: false });
    expect(yaoqiuLink(30, data)).toMatchObject({ label: 'Issue 开着', done: false });
    expect(yaoqiuLink(40, data)).toMatchObject({ label: 'Issue 已关', done: true });
    expect(yaoqiuLink(99, data)).toMatchObject({ state: 'unknown', done: false });
  });
  it('没有数据时不报错', () => {
    expect(yaoqiuLink(1, null).state).toBe('unknown');
  });
});

describe('yaoqiuStatus', () => {
  it('doing 且关联全部已合/已关，按完成显示', () => {
    const r = yaoqiuStatus({ status: 'doing', links: [10, 40] }, data);
    expect(r).toMatchObject({ status: 'done', auto: true, note: '关联的都已合/关' });
  });
  it('关联里有一个没合，仍是进行中', () => {
    expect(yaoqiuStatus({ status: 'doing', links: [10, 20] }, data)).toMatchObject({ status: 'doing', auto: false });
  });
  it('links 为空不自动完成；查不到的也不算完成', () => {
    expect(yaoqiuStatus({ status: 'doing', links: [] }, data).status).toBe('doing');
    expect(yaoqiuStatus({ status: 'doing', links: [10, 99] }, data).status).toBe('doing');
  });
  it('todo 不自动变；done 保持 done', () => {
    expect(yaoqiuStatus({ status: 'todo', links: [10] }, data).status).toBe('todo');
    expect(yaoqiuStatus({ status: 'done', links: [] }, data)).toMatchObject({ status: 'done', auto: false });
  });
});

describe('yaoqiuSummary', () => {
  it('统计共几条、完成、进行中、未开始', () => {
    const s = yaoqiuSummary(
      [
        { status: 'done', links: [] },
        { status: 'doing', links: [10] },
        { status: 'doing', links: [20] },
        { status: 'todo', links: [] },
      ],
      data,
    );
    expect(s).toEqual({ total: 4, done: 2, doing: 1, todo: 1, pct: 50 });
  });
});
