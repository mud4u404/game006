import { describe, expect, it } from 'vitest';
import { milestoneOf, refsOf, slimIssue } from '../public/kanban/core.mjs';

const jindu = {
  milestone: { name: '里程碑', upto: 4 },
  items: [
    { id: 1, title: '甲', status: 'done' },
    { id: 2, title: '乙', status: 'doing' },
    { id: 3, title: '丙', status: 'doing' },
    { id: 4, title: '丁', status: 'doing' },
    { id: 5, title: '戊（超出范围）', status: 'doing' },
  ],
};

describe('milestoneOf', () => {
  it('四种情况：手写做完、有开着的、只有关闭的、没有任何单', () => {
    const open = [{ n: 100, refs: [1, 2] }, { n: 101, refs: [2] }];
    const closed = [{ n: 90, refs: [3], closed: true }];
    const m = milestoneOf(jindu, open, closed);
    expect(m.total).toBe(4);
    expect(m.done).toBe(2); // 1 手写；3 只有关闭的
    expect(m.remaining).toEqual([
      { id: 2, title: '乙', open: [100, 101], noIssue: false },
      { id: 4, title: '丁', open: [], noIssue: true },
    ]);
  });
  it('既有开着的又有关闭的：仍算还差', () => {
    const m = milestoneOf(jindu, [{ n: 7, refs: [3] }], [{ n: 8, refs: [3], closed: true }]);
    expect(m.remaining.find((r) => r.id === 3)?.open).toEqual([7]);
  });
});

describe('refsOf', () => {
  it('取单项、连写', () => {
    expect(refsOf('做第 004 项')).toEqual([4]);
    expect(refsOf('第 005、006 项')).toEqual([5, 6]);
    expect(slimIssue({ number: 1, title: '第 012 项', body: '另见第 013、014 项', labels: [], created_at: '2026-01-01' }).refs).toEqual([12, 13, 14]);
  });
});
