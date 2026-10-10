# 参考笔记：CoffeeMUD 的派系好恶、NPC 经济和行为拼装

> 三行总结
> 1. 派系是**纯数据表，零代码**：一个 INI 文件定义一条派系——数值上下限、分档区间（每档有名字）、出生值按「人物特征掩码」自动给（恶魔生来 -10000）。派系的涨跌也写在表里：`CHANGE` 事件表（什么事、多大概率、冷却多久、算谁头上）、`FACTOR` 表（哪类人涨得快）、`REACTION` 表（NPC 对哪一档的人动手，带台词）。**「帮了甲就得罪乙」是一行 `RELATION`：本派涨一点，另一派按百分比跟着动。**
> 2. 店铺经济的三道闸都很朴素：店主有**预算**（到周期回充，钱收完就收不了你的货）、**压价率**（同类货卖多了贬值）、**好恶倍率**（顾客特征掩码 × 价格系数，邪恶顾客买凶器 1.5 倍）。库存是店主身上的货，专营类型（兵器、丹药、当铺、钱庄、地皮）是店主的一个参数。
> 3. 几十个 NPC「行为」全是**可叠加的字符串参数包**，由统一的节拍驱动：巡逻、守门、受贿放行、乞讨、拾荒、教学、抓捕……一个 NPC 可以同时挂好几个。连整个司法系统也是一份配置：官员是谁、法官是谁、监狱在哪、**刑期四档加假释**、抗拒执法怎么升级。

写于 10-10，为 #338 而读。对照：`src/engine/shenfen.ts`（身份与差事）、`docs/decisions.md`「恶名能洗、命债不能」、#321（恶名高了店家换口气）、#284（物价总表）、`docs/gugan.md` 第二阶段（扬州三股势力、诉求相撞自然生事）。

## 〇、看了什么、怎么看的

`git clone --depth 1 https://github.com/bozimmerman/CoffeeMud /tmp/CoffeeMud`（仓库外临时目录），Apache-2.0 许可。读的是 Java 源码、`resources/factions/*.ini`、`resources/laws.ini` 和 `guides/` 里的文档，**没有编译运行任何东西**。主要文件：`resources/factions/alignment.ini`、`triumph.ini`、`inclination.ini`（派系数据）、`com/planet_ink/coffee_mud/Libraries/Factions.java`（派系库）、`Libraries/CoffeeShops.java`（物价）、`MOBS/StdShopKeeper.java`（店主）、`Common/DefaultFaction.java`、`Behaviors/`（八十来个行为）、`resources/laws.ini`（司法配置）。没读的：战斗与技能系统、天气海洋模拟、网页模块。

## 一、Factions：一条派系一份 INI

### 1.1 数值的骨架

| 配置 | 内容 | 例子（alignment.ini） |
|---|---|---|
| MINIMUM / MAXIMUM | 数值区间 | ±10000 |
| RANGEn | 分档：下限；上限；档名；代码；阵营 | −10000～−7500 = 「纯粹邪恶」PUREEVIL / EVIL |
| DEFAULT / AUTODEFAULTS | 出生值；按人物掩码给不同出生值 | 恶魔、魔鬼出生即 −10000 |
| AUTOCHOICES | 新建人物时让玩家自选的几档 | 三档：−7499 以下 / 0 / 7500 以上 |
| RATEMODIFIER、FACTORX | 全局倍率；按 MOB 类型的增减速率 | 矮人涨善慢、失善快（示例语法） |
| EXPERIENCE | 派系值影响经验获取的几档方案 | 极端阵营经验打折 |
| SCOREDISPLAY 等 | 显不显示、进不进报表 | 界面层的开关 |

### 1.2 涨跌：CHANGE 事件表（triumph.ini 的写法最全）

`CHANGEX = 事件(参数);方向;幅度%;旗标;适用掩码`。事件类型如 DYING（死了）、AREAKILL / AREAASS / AREAEXPLORE（在本区域杀人/暗杀/探索，各带**触发概率** PCT 和**冷却** WAIT）；方向有 UP / DOWN / OPPOSITE / AWAY / TOWARD / MINIMUM / MAXIMUM / REMOVE / ADD；旗标如 OUTSIDER（只算外人）、SELFOK、ANNOUNCE（到档了公告一声）。**派系怎么变，是游戏内容的一部分**，写在数据里，加一条反应就是加一行表。

### 1.3 牵连与反应

- `RELATIONX = 某派 ±百分比`：本派变动时，其他派系按比例联动。**敌对是互为镜像的两行**：甲派 +1%，乙派 −1%。也有只联动一部分的松散关系。
- `REACTIONX = 档名；谁；用什么；参数`：例如「对 EVIL 档的来客，凡掩码匹配的 NPC 挂上 Aggressive 行为，台词『Die Evil Scum!』」。**NPC 对不同档位的人换一副脸，是查表，不是每个 NPC 写死**。

## 二、商店与物价（CoffeeShops.java、StdShopKeeper.java）

- **专营**：店主有一个 `DEAL` 类型（杂货、兵器、盔甲、丹药、珠宝、训练师、银行、地皮、只收不卖……），决定他肯收肯卖什么。
- **预算**：店主收货的钱有上限，按游戏周期回充——**小店主收了几件好货就收不动了**，大店铺预算大。这天然防「无限倒卖」。
- **压价率**（devalueRate）：把货卖回给店，越卖越便宜（同类货堆多了贬值）。
- **好恶倍率**（prejudiceFactor）：一串「人物掩码 = 价格系数」，逐条匹配顾客，命中哪条用哪条——邪恶顾客买兵器贵三成、同门师兄弟买本派东西便宜，全是店主身上的一个字符串参数。另有**按物品的调价掩码**（这间店卖粮便宜卖铁贵）。
- 库存就是店主身上的货物清单，卖完即无，除非配置了补充。

## 三、Behaviors：NPC 的行为是拼装的

八十来个行为类，每个都是**挂在 MOB 上的参数包**（一个字符串），由统一的节拍（ActiveTicker）驱动，一个 NPC 可同时挂多个。按用途分几堆：

| 堆 | 例子 |
|---|---|
| 战斗 | Aggressive / VeryAggressive（对谁动手、概率、掩码）、GoodGuardian（护善惩恶）、FightFlee、Wimpy、NastyAbilities（只干坏事） |
| 执法 | **Arrest**（抓罪犯，配合 laws.ini）、GateGuard、**BribeGateGuard**（门卫受贿放行）、TaxCollector |
| 生计 | Beggar（乞讨）、Scavenger（拾荒）、Healer、MOBTeacher（教技能）、ItemMender（修东西）、MoneyChanger、Hireling（被雇） |
| 移动 | Mobile（乱走）、Patroller（巡逻路线）、Sailor、TaxiBehavior（载客） |
| 生态 | CorpseEater、MOBEater、PuddleMaker（雨后积水）、WeatherAffects、Decay |
| 说话 | MudChat（话题树对话）、Emoter（自言自语）、CommonSpeaker（市井闲话）、QuestChat |
| 兜底 | Scriptable / ScriptableEverymob（用内嵌脚本自写行为） |

## 四、司法是一份配置（laws.ini）

- 官员（OFFICERS）、法官（JUDGE）、监狱（JAIL）、释放地（RELEASEROOM）各是一个房间/人物掩码。
- **刑期四档**（轻→重）加**假释四档**，每档都有判词；累犯有「前科」台词；重罪可处死刑（EXECUTEMSG）。
- 抓捕有完整的口气链：警告 → 威吓 → 逮捕途中解闷的闲话 → 「抗拒逮捕？！」 → 袭警立即升级。哪些种族受保护、哪些怪物不适用（不死生物直接驱逐）都是掩码。

## 五、对照我们的原则

| 我们的原则 | CoffeeMUD 做对了的 | 不学的 |
|---|---|---|
| 有条件有代价 | 好恶档位决定 NPC 反应与价格；店主预算与压价率防白拿 | 派系值联动经验获取（数值层干扰） |
| 活的江湖 | 「帮了甲得罪乙」一行数据；NPC 对不同档换脸色 | 八十个行为类的复杂度（我们用不上这么多） |
| 金庸风格 | 门卫受贿放行、执法闲话的烟火气 | 刑期以「月」计、死囚游街的 MUD 味 |
| 手机上好用 | —（桌面端多窗口思维） | 一屏十几条 REACTION 的信息量，我们只取一句反应 |

## 六、建议进设计的三到五条

1. **恶名的「分档 + 反应表」做成数据，不散写成各处的 if**。店家对恶名的反应（换口气、拒卖、加价）统一成一张小表：恶名几档 → 哪类店家什么反应 → 一句台词。出处：`resources/factions/alignment.ini` 的 RANGEn + `REACTIONX` 查表模式。落到 `docs/decisions.md` 恶名一行（补「反应表」三字）和 #321 的实现规格。
2. **扬州三股势力的相撞用「关系联动」一行表达**。帮盐帮一分，漕帮自动少一分，写成 `甲 +x% ⇄ 乙 −x%` 的一行关系，事件只管给一边加，另一边跟着走，不用写两遍。出处：`triumph.ini` 的 `RELATIONX` 语法。落到 `docs/gugan.md` 第二阶段（势力相撞）的设计段。
3. **店家加「预算 + 压价」两道闸防倒卖**。扬州当铺、药铺若做买卖生意，给店家一日预算（收满了说「今日不便再收」）和压价率（同货越收越贱），玩家的倒卖利就要挑时机、挑店。出处：`StdShopKeeper.java` 的 budget/devalueRate、`CoffeeShops.java` 的 prejudiceFactor。落到 #284 物价总表的设计稿。
4. **差事与值守写成「可复用的行为包」**。CoffeeMUD 的 NPC 行为是叠在人物身上的参数包（守门+受贿+闲话可以三层叠加）；我们的师门差事、六扇门值守、店家买卖，在内容上也可以归纳成几种可复用「性格包」，新驻地按包拼人，少写一次性逻辑。出处：`Behaviors/` 目录的拼装模型。落到 `docs/content-guide.md`「师门差事」一节（写成两三种模板）。
5. **六扇门的执法借「四档刑期 + 抗拒升级」**。罪分四档（警告、罚款、关一两个时辰、逐出地界），抗拒抓捕当场升一档；判词和抓捕途中的口气在 laws.ini 里整段配好——这套口气链几乎可以直接译成金庸的衙门口吻。出处：`resources/laws.ini` 的 JAIL1–4 / PAROLE / RESISTMSG / CHITCHAT。落到 #332 六扇门驻地的规格与 `sz-yamen` 一带的内容包。

### 没读、别当读过的

技能与战斗系统、 clan（帮会）的政务细节、天气海洋模拟、网页与协议模块、quest 引擎（我们已有自己的差事系统，对照价值低）。
