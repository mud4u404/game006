import { describe, expect, it } from 'vitest';
import { deps, pickWork, type GhItem } from '../scripts/relay.mjs';

const issue = (number: number, labels: string[], body = ''): GhItem => ({ number, title: `任务 ${number}`, body, labels: labels.map(name => ({ name })) });
const pr = (number: number, title: string): GhItem => ({ number, title, labels: [], pull_request: {} });

describe('接力：挑下一个任务', () => {
  it('编号最小的先做', () => {
    expect(pickWork([issue(30, ['内容']), issue(21, ['功能']), issue(25, ['内容'])])?.number).toBe(21);
  });

  it('已有开着的 PR 的任务跳过', () => {
    expect(pickWork([issue(21, ['内容']), issue(22, ['内容']), pr(40, '[#21] 丐帮武功')])?.number).toBe(22);
  });

  it('不带「内容」「功能」标签的不做，带「暂缓」的不做', () => {
    expect(pickWork([issue(16, []), issue(17, ['问题']), issue(18, ['内容', '暂缓'])])).toBeNull();
  });

  it('依赖的 Issue 还开着就先不做', () => {
    const items = [issue(22, ['内容'], '依赖：#21'), issue(21, ['功能']), pr(41, '[#21] 试算台')];
    expect(pickWork(items)).toBeNull();
    expect(pickWork([issue(22, ['内容'], '依赖：#21')])?.number).toBe(22);
  });

  it('没有任务时返回 null', () => {
    expect(pickWork([])).toBeNull();
  });

  it('读出依赖编号', () => {
    expect(deps('背景\n依赖：#12、#13\n其他 #99')).toEqual([12, 13]);
    expect(deps(null)).toEqual([]);
  });
});
