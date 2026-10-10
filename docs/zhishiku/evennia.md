# 参考笔记：Evennia（Python MUD 框架）怎么让世界按时自己转

> 三行总结
> 1. Evennia 把「定时」拆成三套各管一段的零件：**Script**（挂在对象或全局上的数据库实体，带 interval/repeats/persistent）、**TickerHandler**（订阅制，同一间隔的所有订阅者共享一个时钟，几万个对象也只用一个定时器）、**TaskHandler**（一次性延迟任务，**存进数据库，停机重开后到点的一次性补发**，过期的废任务六十秒后自动清扫）。
> 2. 游戏时间与现实时间是**一个显式开关**：`TIMEFACTOR` 定倍率，`IGNORE_DOWNTIMES` 决定停机期间日子走不走——走（按墙上钟折算）或者停（只累计开服时间）。想「在游戏时间的某个时刻触发某事」，`schedule()` 造一个会自己重排的 TimeScript，每次醒来先办完事、再算「离下一个目标时刻还有几个现实秒」。
> 3. NPC 作息框架**不给现成答案，只给零件**：给 NPC 挂 Script、订阅 ticker、在房间的 `at_object_receive` 里对来人起反应、用 MonitorHandler 监视某个属性一变就回调。没有轮询全图的「AI 引擎」——**世界转不转是开发者自己拼的**。

写于 10-10，为 #337 而读。对照我们的 `src/engine/shiguang.ts`（`settleAway` 下线静修）、`src/engine/xingdong.ts`（行动协议 plan/act、防重复领取）和 `whereAt`（NPC 在场）。

## 〇、看了什么、怎么看的

`git clone --depth 1 https://github.com/evennia/evennia /tmp/evennia`（仓库外临时目录），BSD 许可。读的是 Python 源码和源码内的文档串，**没有运行任何东西**。主要文件（路径相对仓库根的 `evennia/` 内层）：`scripts/scripts.py`（Script）、`scripts/tickerhandler.py`、`scripts/taskhandler.py`、`scripts/monitorhandler.py`、`utils/gametime.py`、`objects/objects.py`（移动钩子）。没读的：web 模块、批量建站工具、各 contrib 游戏系统（只扫了目录名）。

## 一、三套定时器，各管一段

### 1.1 Script：定时器的数据库实体（`scripts/scripts.py`）

- Script 是**存进数据库的对象**，不是内存里的闭包：有 key、有 interval（秒）、start_delay（第一次立刻跑还是等一个间隔）、repeats（跑几次后停，零为无限）、persistent（停机后要不要活过来）。
- 可以**挂在一个具体对象上**（`obj.scripts.add()`），也可以全局存在——「这个房间每十分钟长一次草」「整个经济系统每小时结一次账」用的是同一套东西。
- 钩子按生命周期排好：`at_script_creation` → `at_start` → `at_repeat`（每次到点）→ `at_pause` / `at_stop` → `at_script_delete`。服务器重启时，persistent 的 Script 自动重启并接着跑。
- 关键取舍写在文档串里：**能跨重启安全引用的只有数据库实体**。动态造出来的函数、内存对象上的方法，都不许做定时回调——因为没法存。

### 1.2 TickerHandler：订阅制的共享时钟（`scripts/tickerhandler.py`）

- `TICKER_HANDLER.add(15, myobj.at_tick)`：登记「每 15 秒叫我一次」。所有同间隔的订阅者**共享同一个底层定时器**（TickerPool），不是一人一个线程。
- 删订阅要同时给间隔和回调（`remove(15, myobj.at_tick)`），因为一个对象可以订好几个不同间隔的钟。
- 状态跨重启保存，开服自动拉起。

### 1.3 TaskHandler：一次性的延迟任务，停机也要兑现（`scripts/taskhandler.py`）

- `utils.delay(秒, 回调)` 造一个一次性任务；**任务连着回调一起序列化存库**（回调存成「(对象, 方法名)」二元组，重启后能按名找回）。
- 开服 `load()`：从库里读回所有任务重新排班。**停机期间到点的任务，开机立刻补发**（重新排进时钟，过期的时间点立即触发）；被取消却没跑成的「僵尸任务」，过期六十秒后自动清扫（`stale_timeout`）。
- 每个任务有 id，跑完即除名——**天然防重复结算**：同一个任务不会跑两遍，除非你再造一个。

### 1.4 MonitorHandler：不轮询，属性一变就回调（`scripts/monitorhandler.py`）

监视某个数据库字段或 Attribute，**保存的那一刻**触发注册的回调。想「他血量掉到三成就喊救命」，不用每秒看一眼，注册一个监视器等它变。

## 二、NPC 作息：框架不给答案，给零件

Evennia 核心**没有内置的 NPC 作息/AI 调度**。官方给的零件是：

- **给 NPC 挂 Script**：这个 NPC 自己的定时器（睡觉时每小时说一句梦话）；
- **订阅 ticker**：全体 NPC 共享一个「每分钟」的钟，到点各自 `at_tick` 决定动不动；
- **房间侧反应**：`at_object_receive` / `at_object_leave`——有人进村，村口 NPC 在这个钩子里抬头看他一眼；
- **属性监视**：MonitorHandler 盯着 NPC 的某个字段（敌意、任务状态），一变就起反应。

也就是说，Evennia 把「世界怎么转」做成**零件盒**，每个游戏自己拼。它不替你决定 NPC 几点睡觉，只保证你定的闹钟停机不丢、到点就响、几万个也不卡。

## 三、游戏时间与现实时间（`utils/gametime.py`）

- `TIMEFACTOR`：游戏秒 = 现实秒 × 倍率。一天游戏时间多久过完，是一个设置项。
- `IGNORE_DOWNTIMES`：**停机期间日子走不走**。不走（默认）：游戏时间只累计开服时间（`runtime()`），关服多久，江湖就静止多久；走：按墙上钟直接折算。
- `gametime()` 报当前游戏时刻；`real_seconds_until(时,日,月)` 算「离游戏时间的某个目标时刻还有几个现实秒」；`schedule(回调, hour=6)` 造一个 TimeScript——它醒来第一件事是把该办的事办了，第二件事是**算出离下一个目标时刻的真实秒数，把自己重排到那时再醒**。事件对齐游戏时刻（每天卯时上早课），而不是现实间隔。
- `reset_gametime()`：把整个世界的钟归零（新开一局用）。

## 四、存档与防重复

- 一切皆 Django 模型：Script、对象、属性都在库里，`dbserialize` 负责把回调、映射这些难存的东西序列化。
- 防重复结算不靠约定，靠**任务的一次性**：TaskHandler 的任务触发即除名；Script 的 `repeats` 到数即停。要防「同一天领两次赏」，给任务一个稳定的 id，库里查到了就不造第二个。
- 僵尸任务清扫、失效回调（对象没了）在 load 时降级为日志并剔除，不炸启动。

## 五、对照我们的原则

| 我们的做法 | Evennia 的做法 | 谁适合谁 |
|---|---|---|
| 单机，时间按行动推进，下线用 `settleAway` 一次性静修结账 | 常驻服务器，时间按倍率自走，下线世界照转 | 我们单机必须「合账」；它多人必须「不停」——方向不同，但「停机时间算不算日子」两边都得显式回答 |
| `whereAt` 按需计算人在哪 | NPC 挂 Script / 订 ticker 轮询 | 我们玩家独一个，按需算最省；它几百人在线，共享时钟合理 |
| 行动协议 plan/act、防重复领取 | TaskHandler 一次性任务 + id 去重 | 同一形状：**先记档，到点兑现，兑现即销账** |
| 旗标「写了要有人读」（CI 查） | MonitorHandler 属性一变就回调 | 它把「有人读」做成机制；我们用测试拦，暂时够用 |
| `onEnter` 房间入场事件 | `at_object_receive` | 同构，互相印证 |

## 六、建议进设计的三到五条

1. **「停机时间算不算日子」写成一句明文**。Evennia 用 `IGNORE_DOWNTIMES` 把这个选择摆上台面；我们的等价问题是「玩家合上一小时，江湖过去多久」——`settleAway` 已回答（结静修），但**世事导演、差事时限、作物生长对「合盖时间」的态度**应统一写进 `docs/huojianghu.md` 一句总纲：合盖只结静修与账目，江湖的事不因合盖增多。出处：`utils/gametime.py` 的 `IGNORE_DOWNTIMES` 与 `runtime()`。落到 `docs/huojianghu.md` 时间一节。
2. **「到点的世界事件」做成一次性任务，兑现即销账**。我们已有的防重复领取与 TaskHandler 同形；下一步做「三日后张榜」「十日后比武开擂」这类**带日期的世界事件**时，照它抄三条：事件存档带稳定 id、到点兑现、兑现即销账；关机重开先对账，过期的**立即补发**而不是跳过。出处：`scripts/taskhandler.py` 的 load/延迟补发/stale 清扫。落到 `src/engine/xingdong.ts` 行动协议的后续任务（设计层面，动引擎另起单）。
3. **同一间隔的世界节拍共享一个钟**。它用 TickerPool 让同间隔订阅者共享定时器；我们的「每日一结」（修为额度、差事刷新、作息翻面）将来若拆成多个系统，**共用一次每日结算的钟**，别各结各的。出处：`scripts/tickerhandler.py`。落到 `docs/huojianghu.md` 或引擎重构单的备注。
4. **状态反应用「监视」不用「巡查」**：旗标、人情、伤势这类字段的反应（「写了要有人读」），可以考虑注册式的「此值一变 → 谁来读」清单，与现有 CI 的静态检查互补；比每次行动后全量扫描省。出处：`scripts/monitorhandler.py`。落到 `docs/decisions.md` 备查（暂不动引擎，记方向）。
5. **游戏时刻对齐，不按现实间隔**。它的 `schedule()` 事件对准游戏钟（卯时早课），我们做「亥时打更、卯时开市、初一庙会」时同法：**事件挂在时辰上，不挂在「现实过了几分钟」上**，与合盖补算天然兼容。出处：`utils/gametime.py` 的 `real_seconds_until` 与 `TimeScript.at_repeat`。落到 `docs/huojianghu.md` 作息一节（已有时辰系统，补一句事件对齐原则）。

### 没读、别当读过的

web 界面与 websocket 细节、batchprocessor 建站工具、contrib 里的具体游戏系统（成就、手工艺、战斗等只扫了名单）、连接协议与安全模块。
