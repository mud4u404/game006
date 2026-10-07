# 项目规则（Trae 会自动读取本文件）

开始任何任务前，先完整阅读仓库根目录的 `AGENTS.md` 和 `docs/content-guide.md`。

要点：

1. 只做你认领的那一个 GitHub Issue。从最新的 main 拉分支，命名为 `trae/<Issue 编号>-<简短英文>`。
2. 内容任务只在 `src/content/packs/` 下新建自己的文件。人物放进已有地点用 `at`，新地点连通已有地点用出口第三项「回程方位」。
3. 不要修改以下位置，除非 Issue 明确允许：
   - `src/engine/`、`src/ui/`、`src/styles/`、`src/core/`
   - `src/content/types.ts`、`src/content/index.ts`、`src/content/skills.ts`
   - `tests/`（可以往 `tests/forbidden-names.ts` 里加名字）
4. 不新增依赖。不删除、不改名已有 id。
5. 不使用金庸、古龙等作品的原创人名、武功名、门派名。对白用「」，嵌套用『』，不用英文引号。
6. 提交前运行 `npm run check` 和 `npm run build`，必须全部通过。
7. PR 标题写成 `[#编号] 任务标题`，正文按模板填写，并写 `Closes #编号`。
8. 发现数据格式表达不了需求时，在 Issue 里说明，等维护者处理，不要自己改引擎绕过去。
