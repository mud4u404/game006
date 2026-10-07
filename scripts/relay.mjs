// 接力规则：从 GitHub 上开着的 Issue 和 PR 里，挑出协作者下一个该做的任务。
// 规则与 AGENTS.md 第五节一致，纯函数，测试见 tests/relay.test.ts。

/** 协作者可以领的标签 */
export const WORK_LABELS = ['内容', '功能'];
/** 带这个标签的 Issue 先不做 */
export const HOLD_LABEL = '暂缓';

const labelNames = item => (item.labels ?? []).map(l => (typeof l === 'string' ? l : l.name));

/** Issue 正文里「依赖：#12、#13」这一行列出的编号 */
export function deps(body) {
  const m = (body ?? '').match(/依赖[:：]([^\n]*)/);
  return m ? [...m[1].matchAll(/#(\d+)/g)].map(x => Number(x[1])) : [];
}

/**
 * items：GitHub 接口 /issues?state=open 返回的数组，Issue 和 PR 混在一起（PR 带 pull_request 字段）。
 * 可以做的任务：带「内容」或「功能」标签，不带「暂缓」，还没有开着的 PR 标题写着 [#编号]，依赖的 Issue 都已关闭。
 * 编号最小的先做；没有就返回 null。
 */
export function pickWork(items) {
  const prs = items.filter(i => i.pull_request);
  const issues = items.filter(i => !i.pull_request);
  const open = new Set(issues.map(i => i.number));
  const taken = new Set(prs.flatMap(p => [...p.title.matchAll(/\[#(\d+)\]/g)].map(m => Number(m[1]))));
  return (
    issues
      .filter(i => {
        const names = labelNames(i);
        return names.some(n => WORK_LABELS.includes(n)) && !names.includes(HOLD_LABEL) && !taken.has(i.number);
      })
      .filter(i => deps(i.body).every(d => !open.has(d)))
      .sort((a, b) => a.number - b.number)[0] ?? null
  );
}

/** 打印给协作者看的一行 */
export const describe = w => `有新任务 #${w.number}【${labelNames(w).filter(n => WORK_LABELS.includes(n)).join('、')}】${w.title}`;
