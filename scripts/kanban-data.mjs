// 开发看板的数据：用 GITHUB_TOKEN 调 GitHub API，算好看板要的全部数，写成一个 data.json。
// 由 .github/workflows/kanban-data.yml 每十分钟跑一次，推到孤立分支 kanban-data；
// 页面（public/kanban/index.html）先读这个文件，不再在每个访客的浏览器里匿名调 API（每小时只有 60 次）。
// 取数、整理、统计口径都在 public/kanban/core.mjs，页面直连 API 的退路也用同一份，两边的数不会对不上。
//
// 用法：GITHUB_TOKEN=... node scripts/kanban-data.mjs [输出文件，默认 data.json]
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { REPO, HOUR, computeBoard, processRaw, sumRuns } from '../public/kanban/core.mjs';

/* get(路径) -> 解析好的 JSON；路径从 /repos/<仓库> 之后算起，和页面里的写法一样 */
export async function buildData(get, now = Date.now()) {
  const [issues, openPulls, closedPulls, events1, events2] = await Promise.all([
    get('/issues?state=open&per_page=100'),
    get('/pulls?state=open&per_page=50'),
    get('/pulls?state=closed&sort=updated&direction=desc&per_page=100'),
    get('/events?per_page=100'),
    get('/events?per_page=100&page=2'),
  ]);
  const data = processRaw({ issues, openPulls, closedPulls, events1, events2 }, now);

  // 检查结果：对每个开着的 PR 的最新提交查一次（token 的额度每小时 1000 次，够用）
  const checks = {};
  await Promise.all(data.pulls.map(async (p) => {
    if (!p.sha) return;
    try {
      const j = await get('/commits/' + p.sha + '/check-runs?per_page=30');
      checks[p.sha] = sumRuns(j.check_runs || []);
    } catch { /* 单个查不到就留空，页面显示「未查」 */ }
  }));

  const board = computeBoard(data, checks, now);
  const merged48 = data.merged.filter((m) => now - m.at < 48 * HOUR).length;
  return {
    generatedAt: new Date(now).toISOString(),
    repo: REPO,
    ...data,
    checks,
    // 算数那一刻的快照（页面打开时会按当时的时间重算，用的是同一个函数）
    derived: {
      merged24: board.merged24,
      merged24AtLeast: board.sat24,
      merged48,
      hourly: board.hourly,
      ais: board.ais.map((a) => ({
        k: a.k, done48: a.done48, doing: a.doing, waiting: a.waiting,
        none: a.none, late: a.late, last: a.last, task: a.txt,
        pulls: a.myPulls, claimed: a.claimed, issues: a.waitingIssues,
      })),
      // 待领任务池：开着的 Issue 按「可领 / 暂缓 / 其他」分
      pool: poolOf(data.issues),
    },
  };
}

function poolOf(issues) {
  const task = (i) => i.labels.includes('内容') || i.labels.includes('功能');
  const out = { open: [], paused: [], other: [] };
  for (const i of issues.slice().sort((a, b) => b.created - a.created)) {
    if (task(i) && i.labels.includes('暂缓')) out.paused.push(i.n);
    else if (task(i)) out.open.push(i.n);
    else out.other.push(i.n);
  }
  return out;
}

/* 带 token 的真实取数；403/429 直接报错，让 Actions 这次变红（上一份 data.json 还留在分支上） */
export function githubGetter(repo, token, fetchImpl = fetch) {
  return async (path) => {
    const r = await fetchImpl('https://api.github.com/repos/' + repo + path, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
    });
    if (!r.ok) throw new Error('GitHub ' + r.status + ' ' + path);
    return r.json();
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const repo = process.env.GITHUB_REPOSITORY || REPO;
  const out = process.argv[2] || 'data.json';
  const data = await buildData(githubGetter(repo, process.env.GITHUB_TOKEN));
  writeFileSync(out, JSON.stringify(data) + '\n');
  console.log(`已写 ${out}：${data.pulls.length} 个开着的 PR，${data.issues.length} 个开着的 Issue，近 24 小时合 ${data.derived.merged24} 件`);
}
