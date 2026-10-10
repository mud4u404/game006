import { describe, expect, it } from 'vitest';
import { branchIssue, deps, pickWork, type GhItem } from '../scripts/relay.mjs';

const issue = (number: number, labels: string[], body = ''): GhItem => ({ number, title: `任务 ${number}`, body, labels: labels.map(name => ({ name })) });
const pr = (number: number, title: string, labels: string[] = []): GhItem => ({ number, title, labels: labels.map(name => ({ name })), pull_request: {} });

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

  it('任务分支已推送、PR 还没建好时也跳过；维护者分支不算', () => {
    const items = [issue(24, ['内容']), issue(25, ['内容'])];
    expect(pickWork(items, ['main', 'zcode/24-emei-huashan'])?.number).toBe(25);
    expect(pickWork(items, ['claude/24-x'])?.number).toBe(24);
    expect(branchIssue('trae/7-questbook')).toBe(7);
    expect(branchIssue('feature-x')).toBeNull();
  });

  it('没有任务时返回 null', () => {
    expect(pickWork([])).toBeNull();
  });

  it('依赖的 PR 还没合并也先不做', () => {
    expect(pickWork([issue(23, ['内容'], '依赖：#106'), pr(106, '大换血五')])).toBeNull();
    expect(pickWork([issue(23, ['内容'], '依赖：#106')])?.number).toBe(23);
  });
  it('读出依赖编号', () => {
    expect(deps('背景\n依赖：#12、#13\n其他 #99')).toEqual([12, 13]);
    expect(deps(null)).toEqual([]);
  });

  it('指派：带「给:名字」的任务只给自报名字的人；不报名字的领不到', () => {
    const items = [issue(21, ['内容', '给:trae']), issue(22, ['内容'])];
    expect(pickWork(items)?.number).toBe(22);
    expect(pickWork(items, [], 'trae')?.number).toBe(21);
    expect(pickWork(items, [], 'Trae')?.number).toBe(21);
    expect(pickWork(items, [], 'qoder')?.number).toBe(22);
    expect(pickWork([issue(21, ['内容', '给:trae'])])).toBeNull();
    expect(pickWork([issue(21, ['内容', '给:trae'])], [], 'qoder')).toBeNull();
  });

  it('退回要改的 PR 先给原作者：带「要改」和「给:作者」，排在新任务前面；别人、不报名字的领不到', () => {
    const items = [issue(21, ['内容', '给:zcode']), pr(40, '[#20] 师门差事', ['要改', '给:zcode'])];
    expect(pickWork(items, [], 'zcode')?.number).toBe(40);
    expect(pickWork(items, [], 'trae')).toBeNull();
    expect(pickWork(items)).toBeNull();
    expect(pickWork([pr(40, '[#20] 师门差事', ['要改'])], [], 'zcode')).toBeNull();
    expect(pickWork([issue(21, ['内容', '给:zcode']), pr(40, '[#20] 师门差事', ['给:zcode'])], [], 'zcode')?.number).toBe(21);
    expect(pickWork([pr(40, '[#20] 师门差事', ['要改', '给:zcode', '暂缓'])], [], 'zcode')).toBeNull();
  });
});
