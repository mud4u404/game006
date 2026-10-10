// 自动合并的判定：哪些文件算「只动了内容」。纯函数，测试见 tests/automerge.test.ts。
// 规则与 docs/auto-review.md 一致；工作流 .github/workflows/automerge.yml 通过 scripts/automerge-scope.mjs 调用。

/** 分支名 <工具名>/<Issue 编号>-<英文> 拆开；维护者的 claude/ 分支、不合格式的返回 null */
export function parseBranch(name) {
  if (name.startsWith('claude/')) return null;
  const m = name.match(/^([^/]+)\/(\d+)-/);
  return m ? { tool: m[1].toLowerCase(), issue: Number(m[2]) } : null;
}

/** Issue 正文「## 允许修改的文件」（也认「## 允许改的文件」，二、三级标题都认，Issue 表单渲染出来是「###」，标题后带括号说明也行）这一节的文字，到下一个二、三级标题为止；没有这一节返回空串 */
export function allowedSection(body) {
  const lines = String(body ?? '').split(/\r?\n/);
  const start = lines.findIndex(l => /^#{2,3}\s*允许修?改的文件/.test(l));
  if (start < 0) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(l => /^#{2,3}\s/.test(l));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n');
}

// docs 下可以有子目录（如 docs/zhishiku/x.md，调研笔记）；内容包不分子目录
const FULL = /(?<![A-Za-z0-9_./-])(?:src\/content\/packs\/|docs\/(?:[A-Za-z0-9_-]+\/)*)[A-Za-z0-9_.-]+\.(?:ts|md)/g;
// 裸名：前面不是路径字符，例如 `zhaoshi.ts`；写成路径的（src/engine/x.ts）不算裸名
const BARE = /(?<![A-Za-z0-9_./-])[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(?:ts|md)(?![A-Za-z0-9_])/g;

/**
 * 允许的文件（完整路径集合）：Issue 的「允许修改的文件」一节点名的内容包、文档，新增的和已有的都一样要点名。
 * 完整路径 src/content/packs/x.ts、docs/x.md 直接算数；
 * 裸名 x.ts 当作 src/content/packs/x.ts，裸名 x.md 当作 docs/x.md（新增的文件此刻还不存在，所以不查存不存在）。
 */
export function allowedFiles(body) {
  const text = allowedSection(body);
  const out = new Set(text.match(FULL) ?? []);
  for (const name of text.match(BARE) ?? []) out.add(name.endsWith('.ts') ? `src/content/packs/${name}` : `docs/${name}`);
  return out;
}

/**
 * files：GitHub 接口 pulls/:n/files 返回的 { status, deletions, filename }。
 * 只算「只动了内容」：新增或改内容包、新增或改文档，都必须在允许的文件里（新增的也要点名，不点名的内容包不自动合）；forbidden-names 只许加词。
 * 返回 { ok, bad }，bad 是越界的文件名。
 */
export function judgeFiles(files, allowed) {
  const bad = [];
  for (const { status, deletions = 0, filename } of files) {
    const inPack = /^src\/content\/packs\/.+\.ts$/.test(filename);
    const inDocs = /^docs\/.+\.md$/.test(filename);
    let ok = false;
    if ((status === 'added' || status === 'modified') && (inPack || inDocs)) ok = allowed.has(filename);
    else if (status === 'modified' && filename === 'tests/forbidden-names.ts') ok = deletions === 0;
    if (!ok) bad.push(filename);
  }
  return { ok: files.length > 0 && bad.length === 0, bad };
}
