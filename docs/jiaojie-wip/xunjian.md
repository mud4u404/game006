# 两个定时巡检的提示（新会话重建用）

## 每小时巡检（cron `22 * * * *`）

每小时巡检。负责人 10-10 定的方向：先把已有部分改好玩，再做后面的；新系统、新地方的任务都挂着「暂缓」，不放出来。机械的查看派 haiku，维护者只读结论。

按顺序做：

0）**负责人的反馈先办**：列出开着的、带「反馈」标签的 Issue（巫师模式发来的）。每件当轮复现，存档码在正文里；能当场修的派 sonnet 修；内容活写成任务，打「给:协作者」；在原 Issue 下回一句「已派 #N」。

1）派一个 haiku：替每家跑 `node scripts/wait-for-work.mjs --once --for <名字>`：codex、codebuddy、qoder、minimax、trae（autoclaw、zcode、workbuddy 已停用，不派）；读看板数据 https://raw.githubusercontent.com/mud4u404/game006/kanban-data/data.json，取 derived 里的 milestone 和各家状况；列出开着的 PR，各自最新提交的 check、smoke、冲突、标签。回一张表。

2）**每家手上至少两件「改已有内容」的活**：来源是 `docs/sheji-youhua-1010.md` 的七条、三个审查角色的试玩报告、`docs/bihuan-1010.md` 的闭环清单、负责人的反馈。不够就当轮写出来派下去。不放出带「暂缓」的件。

3）**有活不动自动报**：wake 名单不为空，汇总里写「要你叫醒：X（手上有 #N）」，并附「读 AGENTS.md，进入自动模式，名字是 x」。

4）**合并**：绿的 PR 按绿档、黄档的规矩 squash 合；红的或要改的，写明改什么，打「要改」和「给:作者」；主线红了，先开 Issue 写明，再修。

5）给负责人一句话汇总：合了什么、派了什么、反馈处理了几件、要叫醒谁。什么都没变就不说。

## 每日巡视（cron `CRON_TZ=Asia/Shanghai 52 8 * * *`）

每日巡视（负责人 10-10：「我希望你有个长期目标，不断派发任务，并且过程中不断感知游戏的变化和需求，从而衍生出新的想法和方向，自主迭代升级」）。照 docs/feilun.md 的五步做一轮，比每小时巡检深一层。省额度：机械的事派 haiku，试玩审查派 sonnet，维护者只做第③步的判断和最后那一页纸。
1）感知（并行派出）：
   - haiku：git fetch 后在最新 main 上跑 `npx vitest run tests/zoubian.test.ts tests/xiansuo.test.ts tests/huo.test.ts` 和 `npm run balance`，汇总：走不到的内容、已知断线还剩几条、闲逛指标、平衡矩阵越界的门派；再列昨天（北京时间）合并的 PR 一行一个。
   - sonnet：照 docs/zishen.md 轮流选一个审查角色（MUD 老玩家 → 商业制作人 → 金庸编辑，按日期轮换），用 .claude/agents/ 里对应的角色试玩最新 main，限定在已有部分（docs/sheji-youhua-1010.md），回报最要紧的五条，每条带复现路径。
   - 读 docs/ledger.md 台账里新记的真实玩家反馈。
2）思考（维护者）：拿感知结果对照北极星（docs/gugan.md 开头）和当前里程碑，挑差距最大的三处；按 docs/feilun.md「什么时候开新方向」判断是修补、加深还是开新方向（负责人 10-10 定：先改好已有部分，新方向一律先问）。
3）拆解：能按原则定的，写成带出处的任务（「为什么要做」第一句写来源），放进备用池或派给对口的协作者（Trae、minimax 多派）；方向级的写进给负责人的一页纸，带推荐项。新发现记进 docs/ledger.md 台账。
4）里程碑：若当前里程碑剩余件数为 0，改做里程碑复盘（四个角色完整试玩 + 请 Codex 在新 Issue 里独立评估 + 写下一个里程碑计划交负责人）。
5）给负责人一页纸（中文、短）：昨天合了什么；新发现（分清真问题和顺手补的）；今天想做的三件和推荐；要负责人定的事。
