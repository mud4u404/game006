import { describe, expect, it } from 'vitest';
import { buildData, githubGetter } from '../scripts/kanban-data.mjs';

const NOW = Date.parse('2026-10-10T12:00:00Z');
const hAgo = (h: number) => new Date(NOW - h * 3600 * 1000).toISOString();
const lab = (...n: string[]) => n.map((name) => ({ name }));

// 假的 GitHub 接口：只认看板用到的几个路径
const FAKE: Record<string, any> = {
  '/issues?state=open&per_page=100': [
    { number: 10, title: '[#10] 甲：已有 PR', labels: lab('内容', '给:codex'), body: '依赖：#9', created_at: hAgo(30) },
    { number: 11, title: '[#11] 乙：排着', labels: lab('内容', '给:codex'), body: '依赖：#10 #9', created_at: hAgo(20) },
    { number: 12, title: '[#12] 丙：暂缓', labels: lab('内容', '给:trae', '暂缓'), body: '', created_at: hAgo(10) },
    { number: 13, title: '一个讨论', labels: lab('讨论'), body: '', created_at: hAgo(5) },
    { number: 99, title: '这其实是 PR', labels: [], body: '', created_at: hAgo(1), pull_request: {} },
  ],
  '/issues?state=closed&sort=updated&direction=desc&per_page=100': [],
  '/pulls?state=open&per_page=50': [
    { number: 50, title: '[#10] 甲：已有 PR', head: { ref: 'codex/10-jia', sha: 'sha50' }, labels: lab(), updated_at: hAgo(1), draft: false },
    { number: 51, title: '[#20] 丁', head: { ref: 'trae/20-ding', sha: 'sha51' }, labels: lab('要改'), updated_at: hAgo(8), draft: false },
  ],
  '/pulls?state=closed&sort=updated&direction=desc&per_page=100': [
    { number: 40, title: '[#5] 戊', head: { ref: 'codex/5-wu' }, merged_at: hAgo(0.5), updated_at: hAgo(0.5) },
    { number: 41, title: '[#6] 己', head: { ref: 'codex/6-ji' }, merged_at: hAgo(26), updated_at: hAgo(26) },
    { number: 42, title: '[#7] 庚（没合）', head: { ref: 'trae/7-geng' }, merged_at: null, updated_at: hAgo(30) },
    { number: 43, title: '[#8] 辛', head: { ref: 'trae/8-xin' }, merged_at: hAgo(60), updated_at: hAgo(60) },
  ],
  '/events?per_page=100': [
    { type: 'PushEvent', created_at: hAgo(2), payload: { ref: 'refs/heads/trae/30-xx' } },
    { type: 'WatchEvent', created_at: hAgo(3), payload: {} },
  ],
  '/events?per_page=100&page=2': [],
  '/commits/sha50/check-runs?per_page=30': {
    check_runs: [
      { id: 1, name: 'check', status: 'completed', conclusion: 'failure' },
      { id: 2, name: 'check', status: 'completed', conclusion: 'success' },
      { id: 3, name: 'smoke', status: 'in_progress', conclusion: null },
    ],
  },
  '/commits/sha51/check-runs?per_page=30': {
    check_runs: [
      { id: 4, name: 'check', status: 'completed', conclusion: 'success' },
      { id: 5, name: 'smoke', status: 'completed', conclusion: 'failure' },
    ],
  },
};
const get = async (path: string) => {
  if (!(path in FAKE)) throw new Error('没有这个假接口：' + path);
  return FAKE[path];
};

describe('看板数据 kanban-data', () => {
  it('data.json 的结构和计数', async () => {
    const d = await buildData(get, NOW);
    expect(d.generatedAt).toBe(new Date(NOW).toISOString());
    // Issue 里的 PR 被剔掉
    expect(d.issues.map((i) => i.n)).toEqual([10, 11, 12, 13]);
    expect(d.issues[0].dep).toBe('#9');
    expect(d.issues[1].dep).toBe('#10 #9');
    expect(d.pulls.map((p) => p.n)).toEqual([50, 51]);
    // 只算合并了的，按时间新到旧
    expect(d.merged.map((m) => m.n)).toEqual([40, 41, 43]);
    expect(d.pushes).toEqual([{ ref: 'trae/30-xx', t: NOW - 2 * 3600 * 1000 }]);
    // 检查结果：每个 job 取最新一次
    expect(d.checks.sha50).toEqual({ check: 'ok', smoke: 'run' });
    expect(d.checks.sha51).toEqual({ check: 'ok', smoke: 'fail' });
  });

  it('24/48 小时合并数、每小时柱、各家的活、任务池', async () => {
    const d = await buildData(get, NOW);
    expect(d.derived.merged24).toBe(1);
    expect(d.derived.merged24AtLeast).toBe(false);
    expect(d.derived.merged48).toBe(2);
    expect(d.derived.hourly).toHaveLength(24);
    expect(d.derived.hourly[23]).toBe(1);   // 半小时前合的那件落在最近一格
    expect(d.derived.hourly.reduce((a, b) => a + b, 0)).toBe(1);

    const by = Object.fromEntries(d.derived.ais.map((a) => [a.k, a]));
    expect(d.derived.ais).toHaveLength(9);
    // codex：合了 2 件（5、6 在 48 小时内）；开着 PR #50；#11 排着（#10 已有 PR，不算排着）
    expect(by.codex.done48).toBe(2);
    expect(by.codex.doing).toBe(1);
    expect(by.codex.waiting).toBe(1);
    expect(by.codex.issues).toEqual([11]);
    // trae：PR #51（要改），已领分支 trae/30-xx；#12 暂缓不算排着；48 小时内没合并（#8 是 60 小时前）
    expect(by.trae.done48).toBe(0);
    expect(by.trae.doing).toBe(2);
    expect(by.trae.waiting).toBe(0);
    expect(by.trae.claimed).toEqual(['trae/30-xx']);
    expect(by.trae.late).toBe(false);       // 最后动静取较新的：推送在 2 小时前，不算晚
  });

  it('没活的家标 none；任务池按可领、暂缓、其他分', async () => {
    const d = await buildData(get, NOW);
    const by = Object.fromEntries(d.derived.ais.map((a) => [a.k, a]));
    expect(by.qoder.none).toBe(true);
    expect(by.qoder.task).toBe('没活');
    expect(by.codex.none).toBe(false);
    expect(d.derived.pool).toEqual({ open: [11, 10], paused: [12], other: [13] });
  });

  it('githubGetter 带 token，非 2xx 报错', async () => {
    const seen: any[] = [];
    const fake = (async (url: string, init: any) => {
      seen.push([url, init.headers.Authorization]);
      return { ok: url.endsWith('/ok'), status: 403, json: async () => ({ a: 1 }) };
    }) as any;
    const g = githubGetter('x/y', 'tok', fake);
    expect(await g('/ok')).toEqual({ a: 1 });
    expect(seen[0]).toEqual(['https://api.github.com/repos/x/y/ok', 'Bearer tok']);
    await expect(g('/bad')).rejects.toThrow('GitHub 403');
  });
});
