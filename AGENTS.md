# 给 AI 协作者的说明

本文件写给参与本项目的 AI 协作者，例如 Trae、Codex、Cursor、Gemini。不管用哪个工具，规则都一样。**动手之前，先完整读完本文件，再读任务里指定的文档。**

## 一、项目简介

《江湖夜雨》（暂名）是一款单机的中文文字武侠游戏，运行在手机浏览器里，竖屏，全程点按操作。

- 整体设计见 [docs/design.md](docs/design.md)。
- 剧情与人物见 [docs/story.md](docs/story.md)。
- **写内容必读** [docs/content-guide.md](docs/content-guide.md)。

## 二、分工

| 角色 | 负责 |
|---|---|
| 维护者（Claude） | 世界观、玩法框架、系统架构、数据格式、校验测试、CI；写设计卡和测试用例；拆分任务；每日一审（见 [docs/auto-review.md](docs/auto-review.md)） |
| 协作者（Trae 等） | 认领 GitHub Issue 上的具体任务：<br>· 内容：地点、人物、对话、支线、奇遇、对手、剧情、武功、传闻……<br>· 功能：按维护者写好的设计卡和测试用例实现，测试通过就算验收 |
| 项目负责人 | 决定方向；给协作者发「开工指令」；合并「功能」类 PR |

## 三、常用命令

```bash
npm install        # 安装依赖（第一次）
npm run dev        # 本地运行，手机和电脑在同一网络下可以直接打开显示的地址
npm run check      # 类型检查 + 全部测试（提交前必须通过）
npm run validate   # 只跑内容校验
npm run build      # 打包，产物在 dist/
npm run smoke      # 冒烟测试：无头浏览器从标题一路玩到首领战（需要能跑浏览器的环境）
```

## 四、目录

```
src/
  content/             内容数据（协作者主要工作的地方）
    packs/             内容包：每个文件默认导出一个 ContentPack，会被自动收录
    types.ts           数据格式定义（由维护者维护）
    skills.ts          武功表（由维护者维护）
    index.ts           合并内容包（由维护者维护）
  core/                状态、存档、时间、工具函数
  engine/              规则：条件与效果解释器、世界与寻路、武学公式
  ui/                  界面：外壳、各标签页、战斗、剧情卡片、标题画面
  styles/app.css       全部样式（D「素白卡片」风格的颜色变量与组件）
tests/
  content.test.ts      内容校验：引用、兜底分支、往返出口、禁用名字、引号……
  engine.test.ts       引擎与公式测试
  forbidden-names.ts   不能用的名字（可以往里加）
  style-rules.ts       文风与剧透规则：现代词、剧透词、传闻字数（由维护者维护）
scripts/smoke.mjs      端到端冒烟测试（从标题一路玩到首领战）
prototype/             早期单文件原型，只作参考，不再修改
docs/                  设计文档
```

## 五、工作流程

1. **挑任务**：
   - 挑开着的、还没有对应 PR 的 Issue。在 PR 列表里搜 `[#编号]` 就知道有没有人做过。
   - 能留言就在 Issue 下留言「认领」，不能留言也没关系。
   - 先读 Issue 下的评论。如果之前有人做过、被退回，评论里会写清原因。
   - 可以连续做好几个任务，但要做完一个，再开下一个的分支。
2. **拉分支**：从最新的 `main` 拉出分支，命名为 `<工具名>/<Issue 编号>-<简短英文>`，例如 `trae/12-huafang`、`codex/12-huafang`。
   - 先运行 `git fetch origin`，再运行 `git switch -c trae/12-huafang origin/main`。
   - 不要用 `claude/` 开头，那是维护者的分支。
   - 不要在上一个任务的分支、或者别人的分支上接着做。
3. **只改允许的范围**：
   - 内容任务：只在 `src/content/packs/` 下**新建自己的文件**。
   - 需要把人物放进已有地点时，用 `at` 字段；需要和已有地点连通时，用出口的第三项「回程方位」。这两种情况都不需要改别人的文件。
   - 如果 Issue 明确要求修改某个已有文件，就只改它点名的部分。
   - 功能任务：只改 Issue「允许修改的文件」里列出的文件。Issue 里给出的测试用例，原样放进它指定的测试文件，并让它通过。不要改动其他测试。
4. **自检**：
   - 提交前 `npm run check` 必须全部通过，`npm run build` 必须成功。
   - 运行 `git diff --stat origin/main`，确认只改动了允许范围内的文件。
5. **提 PR**：
   - 目标分支 `main`，标题写成 `[#Issue编号] 任务标题`。
   - 正文按 PR 模板填写，写上 `Closes #Issue编号`。
6. **交完就不要再动这个 PR**：
   - 提交 PR 以后，不要再往这个分支推送。
   - 如果推送被拒，提示 remote contains work，**不要强推**。先看远端分支和 PR 里是不是已经有你的内容，有就算完成了。
7. **自动检查与合并**（详见 [docs/auto-review.md](docs/auto-review.md)）：
   - 只新增内容包的 PR：CI 全部通过就**自动合并**，对应的 Issue 自动关闭，试玩网址自动更新。CI 包括类型检查、内容校验、文风与剧透检查、打包、冒烟测试。
   - 维护者每天集中审一次当天合并的内容，有问题直接修订，不会退回给你。
   - 功能 PR：维护者每日审查后，由项目负责人合并。
   - CI 没通过、或者方向错了的 PR：维护者会修好，或者关闭并在 Issue 下写明原因，Issue 保持打开，等下次重做。

## 六、硬性规定

- **不要改**以下位置：
  - `src/engine/`、`src/ui/`、`src/styles/`、`src/core/`
  - `src/content/types.ts`、`src/content/index.ts`、`src/content/skills.ts`
  - `tests/`。唯一例外是 `tests/forbidden-names.ts`，可以往里加名字。

  如果任务确实需要改这些地方，或者发现现有的数据格式表达不了你要的东西，**先在 Issue 里说明，等维护者处理**，不要自己绕过去。
  例外：Issue 标为「功能」并明确写了允许修改哪些文件。
- 不新增 npm 依赖。
- 不修改 `tests/style-rules.ts`（文风和剧透规则）。觉得规则误伤了，就在 Issue 里说明。
- 不删除、不改名已有内容的 id，否则会损坏玩家存档。修改别人写的文字，要在 PR 里说明理由。
- 不使用金庸、古龙等作品的原创人名、武功名、门派名，详见 `tests/forbidden-names.ts`。少林、武当、峨眉、华山这类现实中存在的门派可以用。
- 一个 PR 只对应一个 Issue。
- 不提交 `dist/`、`node_modules/`。
- 不提交工具自己生成的文件，比如 Trae 的 `CODE_WIKI.md`、`.trae-html-share-packages/`。它们已写进 `.gitignore`，只留在本机。

## 七、完成标准

- [ ] `npm run check` 通过，`npm run build` 通过（能跑浏览器的环境，再跑一下 `npm run smoke`）
- [ ] 新内容在游戏里点得到：新人物出现在某个地点，新地点连上了出口，新任务有触发的入口
- [ ] 每个可点的动作都有回应：分支列表的最后一项不带 `if`
- [ ] 文字符合 [docs/content-guide.md](docs/content-guide.md) 的文风要求
- [ ] PR 描述里写清：新增了哪些 id、玩家怎样触发、完整走一遍的文字演示

## 八、给协作者的开工指令

项目负责人每次只需要把下面这段话复制给协作 AI：

```
读 AGENTS.md。打开 https://github.com/mud4u404/game006/issues ，找出所有开着的、带「内容」或「功能」标签、还没有对应 PR 的任务，按编号从小到大逐个完成。每个任务都从最新的 main 开新分支，自检通过后单独提一个 PR。PR 提交后不要再改它。全部做完后，列出你提了哪些 PR。
```

## 九、更换协作 AI

规则对所有工具都一样，换工具时只需要做下面几步：

1. **连上 GitHub**：新工具要能推送分支、创建 PR。
   - 云端的智能体，比如 TraeWork、Codex、Copilot、Jules：在它的设置里连接 GitHub，授权访问 `mud4u404/game006`。
   - 在本机运行的工具，比如 Cursor、Claude Code、Gemini CLI：电脑上的 git 已经登录 GitHub 就行；要创建 PR，还需要装好并登录 `gh` 命令行。
2. **让它读到规则**：大多数工具会自动读取仓库根目录的 `AGENTS.md`。不会自动读的也没关系，开工指令第一句就是「读 AGENTS.md」。
3. **分支名换成它自己的工具名**：比如 `codex/12-huafang`。自动合并只看改了哪些文件，不看分支名，所以不用改 CI。
4. **同一批任务不要两个工具同时做**，否则会撞车，交出两个 PR。换工具之前，先等上一个工具交完。
5. **如果它会生成自己的缓存或笔记文件**，在 PR 里说明，维护者会把这些文件加进 `.gitignore`。

