// 接力规则：从 GitHub 上开着的 Issue 和 PR 里，挑出协作者下一个该做的任务。
// 规则与 AGENTS.md 第五节一致，纯函数，测试见 tests/relay.test.ts。

/** 协作者可以领的标签 */
export const WORK_LABELS = ['内容', '功能'];
/** 带这个标签的 Issue 先不做 */
export const HOLD_LABEL = '暂缓';
/** 维护者退回的 PR 带这个标签（再加「给:作者」）：作者先把它改完，再领新任务 */
export const REDO_LABEL = '要改';
/** 调研任务（读同类作品写笔记，docs/zhishiku/）：没有别的活时才领，排在一切正经活之后 */
export const IDLE_LABEL = '调研';
/**
 * 指派：Issue 带「给:trae」这样的标签，只有自报名字叫 trae 的协作者（node scripts/wait-for-work.mjs --for trae）才领得到；
 * 不报名字的协作者领不到任何带「给:」的任务，所以多个工具同时开着自动模式也不会抢同一件
 */
export const ROUTE_PREFIX = '给:';

const labelNames = item => (item.labels ?? []).map(l => (typeof l === 'string' ? l : l.name));

/** Issue 正文里「依赖：#12、#13」这一行列出的编号 */
export function deps(body) {
  const m = (body ?? '').match(/依赖[:：]([^\n]*)/);
  return m ? [...m[1].matchAll(/#(\d+)/g)].map(x => Number(x[1])) : [];
}

/** 远端分支名里的 Issue 编号：<工具名>/<编号>-<英文>，维护者的 claude/ 分支不算 */
export const branchIssue = name => (name.startsWith('claude/') ? null : Number(name.match(/^[^/]+\/(\d+)-/)?.[1]) || null);

/**
 * items：GitHub 接口 /issues?state=open 返回的数组，Issue 和 PR 混在一起（PR 带 pull_request 字段）。
 * branches：远端分支名。推送了任务分支、CI 还没来得及建 PR 时，也算有人在做。
 * 可以做的任务：带「内容」或「功能」标签，不带「暂缓」，还没有开着的 PR 标题写着 [#编号]，
 * 也没有对应的任务分支，依赖的 Issue、PR 都已关闭（合并），带「给:xxx」的只给自报名字 xxx 的人。编号最小的先做，
 * 带「调研」的排在最后（闲下来才做）；没有就返回 null。
 */
const idle = i => (labelNames(i).includes(IDLE_LABEL) ? 1 : 0);

export function pickWork(items, branches = [], me = '') {
  const prs = items.filter(i => i.pull_request);
  // 退回的 PR 排在最前：带「要改」和「给:我」的，先改它（不带「给:」的不派，免得别人去改不是自己的分支）
  const redo = me
    ? prs
        .filter(p => {
          const names = labelNames(p);
          return names.includes(REDO_LABEL) && !names.includes(HOLD_LABEL) && names.includes(`${ROUTE_PREFIX}${me.toLowerCase()}`);
        })
        .sort((a, b) => a.number - b.number)[0]
    : null;
  if (redo) return redo;
  const issues = items.filter(i => !i.pull_request);
  // 依赖可以是 Issue，也可以是维护者的 PR（例如新格式在那个 PR 里，合并以前写了会报错）：开着的都算没好
  const open = new Set(items.map(i => i.number));
  const taken = new Set([
    ...prs.flatMap(p => [...p.title.matchAll(/\[#(\d+)\]/g)].map(m => Number(m[1]))),
    ...branches.map(branchIssue).filter(Boolean)
  ]);
  return (
    issues
      .filter(i => {
        const names = labelNames(i);
        const routed = names.filter(n => n.startsWith(ROUTE_PREFIX));
        const mine = !routed.length || (me !== '' && routed.includes(`${ROUTE_PREFIX}${me.toLowerCase()}`));
        return names.some(n => WORK_LABELS.includes(n)) && !names.includes(HOLD_LABEL) && !taken.has(i.number) && mine;
      })
      .filter(i => deps(i.body).every(d => !open.has(d)))
      .sort((a, b) => idle(a) - idle(b) || a.number - b.number)[0] ?? null
  );
}

/** 打印给协作者看的一行。标题里已经带着【内容】【功能】这样的前缀就不再重复加 */
export const describe = w => {
  if (w.pull_request) return `有退回要改的 PR #${w.number}：${w.title}。先读 PR 下维护者的评论，改完推回原分支（不要新开分支、不要新开 PR）`;
  const kinds = labelNames(w).filter(n => WORK_LABELS.includes(n));
  const prefix = /【[^】]*】/.test(w.title) || !kinds.length ? '' : `【${kinds.join('、')}】`;
  return `有新任务 #${w.number}${prefix}${w.title}`;
};
