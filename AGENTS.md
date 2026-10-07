# 给 AI 协作者的说明

本文件写给参与本项目的 AI 协作者，例如 Trae。**动手之前，先完整读完本文件，再读任务里指定的文档。**

## 一、项目简介

《江湖夜雨》（暂名）是一款单机的中文文字武侠游戏，运行在手机浏览器里，竖屏，全程点按操作。

- 整体设计见 [docs/design.md](docs/design.md)。
- 剧情与人物见 [docs/story.md](docs/story.md)。
- **写内容必读** [docs/content-guide.md](docs/content-guide.md)。

## 二、分工

| 角色 | 负责 |
|---|---|
| 维护者（Claude） | 引擎、界面、样式、数值规则、内容数据格式、校验测试、CI；拆分任务、审查 PR |
| 协作者（Trae 等） | 认领 GitHub Issue 上的具体任务。大多是内容（地点、人物、对话、支线、奇遇、对手、剧情），少数是范围明确的功能 |
| 项目负责人 | 决定方向，合并 PR |

## 三、常用命令

```bash
npm install        # 安装依赖（第一次）
npm run dev        # 本地运行，手机和电脑在同一网络下可以直接打开显示的地址
npm run check      # 类型检查 + 全部测试（提交前必须通过）
npm run validate   # 只跑内容校验
npm run build      # 打包，产物在 dist/
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
scripts/smoke.mjs      端到端冒烟测试（从标题一路玩到首领战）
prototype/             早期单文件原型，只作参考，不再修改
docs/                  设计文档
```

## 五、工作流程

1. **认领**：在 Issue 下留言「认领」。一次只做一个 Issue。
2. **拉分支**：从最新的 `main` 拉出分支，命名为 `trae/<Issue 编号>-<简短英文>`，例如 `trae/12-huafang`。
3. **只改允许的范围**：
   - 内容任务：只在 `src/content/packs/` 下**新建自己的文件**。
   - 需要把人物放进已有地点时，用 `at` 字段；需要和已有地点连通时，用出口的第三项「回程方位」。这两种情况都不需要改别人的文件。
   - 如果 Issue 明确要求修改某个已有文件，就只改它点名的部分。
4. **自检**：提交前 `npm run check` 必须全部通过，`npm run build` 必须成功。
5. **提 PR**：
   - 目标分支 `main`，标题写成 `[#Issue编号] 任务标题`。
   - 正文按 PR 模板填写，写上 `Closes #Issue编号`。
6. **审查**：维护者会审查并留下意见。在同一个分支上继续提交修改，**不要新开 PR**。
7. **合并**：审查通过后由项目负责人合并。

## 六、硬性规定

- **不要改**以下位置：
  - `src/engine/`、`src/ui/`、`src/styles/`、`src/core/`
  - `src/content/types.ts`、`src/content/index.ts`、`src/content/skills.ts`
  - `tests/`。唯一例外是 `tests/forbidden-names.ts`，可以往里加名字。

  如果任务确实需要改这些地方，或者发现现有的数据格式表达不了你要的东西，**先在 Issue 里说明，等维护者处理**，不要自己绕过去。
  例外：Issue 标为「功能」并明确写了允许修改哪些文件。
- 不新增 npm 依赖。
- 不删除、不改名已有内容的 id，否则会损坏玩家存档。修改别人写的文字，要在 PR 里说明理由。
- 不使用金庸、古龙等作品的原创人名、武功名、门派名，详见 `tests/forbidden-names.ts`。少林、武当、峨眉、华山这类现实中存在的门派可以用。
- 一个 PR 只对应一个 Issue。
- 不提交 `dist/`、`node_modules/`。

## 七、完成标准

- [ ] `npm run check` 通过，`npm run build` 通过
- [ ] 新内容在游戏里点得到：新人物出现在某个地点，新地点连上了出口，新任务有触发的入口
- [ ] 每个可点的动作都有回应：分支列表的最后一项不带 `if`
- [ ] 文字符合 [docs/content-guide.md](docs/content-guide.md) 的文风要求
- [ ] PR 描述里写清：新增了哪些 id、玩家怎样触发、完整走一遍的文字演示
