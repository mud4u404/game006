/**
 * 内容数据的类型定义。
 *
 * 地点、人物、任务、剧情、对手都写成数据，不写逻辑。
 * 带条件的对话和效果用 Branch / Cond / Effect 这套声明式格式表达，
 * 引擎统一解释执行，由 tests/content.test.ts 自动校验引用是否完整。
 * 编写说明见 docs/content-guide.md。
 */

/** 武功 id：任何内容包都可以新增武功，见 docs/wuxue.md */
export type SkillId = string;
export type AttrKey = '体魄' | '根骨' | '身法' | '悟性' | '胆魄';
export type FeedTag = '传闻' | '出关' | '主线' | '江湖' | '突破' | '收获';
export type Tone = 'red' | 'jade' | 'amber' | 'gray' | 'blue' | 'purple';
/**
 * 人物身上可以点的动作。常用的列在这里，也可以自拟两个字的动作名（例如「斗酒」「打听」）。
 * 「观察」先显示 look，再接上 actions.观察 里第一个条件成立的分支（可以带效果，例如细看出线索）；
 * 「赠礼」「请教」「切磋」「偷窃」不写 actions 时有默认回应。
 */
export type Verb = '交谈' | '观察' | '请教' | '切磋' | '赠礼' | '偷窃' | '购买' | '打赏' | '动手' | '细看' | '抓药' | '推门' | (string & {});

/** 条件：列出的所有字段同时满足才成立；不写 if 的分支总是成立 */
export interface Cond {
  flag?: string;
  notFlag?: string;
  /** 任务进度：is 等于，atLeast 不小于，below 小于 */
  quest?: { id: string; is?: number; atLeast?: number; below?: number };
  chapter?: number;
  /** 银两不少于 */
  silver?: number;
  item?: { id: string; atLeast?: number };
  noItem?: string;
  /** 身上有伤（手、足、内息任一处大于零）；写 false 表示没伤。医馆「看伤」用它分有伤、没伤 */
  /** 气血或内力不满（写 false 表示两样都满）：调养、喝药这类只回气血的，气血满了就别收钱 */
  tired?: boolean;
  wounded?: boolean;
  rel?: { npc: string; is?: string[]; not?: string[] };
  learned?: SkillId;
  notLearned?: SkillId;
  /** 某门武功练到第几重（0 起）：atLeast 不低于，below 低于（没学会算低于任何一重） */
  realm?: { skill: SkillId; atLeast?: number; below?: number };
  /** 后天根基不低于（常人二十，见 engine/ren.ts） */
  attr?: { key: AttrKey; atLeast: number };
  /** 今天是这个约的约期，约还没了结（engine/shiguang.ts） */
  yue?: string;
  /** 现在的营生是这个身份（engine/shenfen.ts）：youxia 游侠、biaoshi 镖师…… */
  shenfen?: string;
  /** 正在办这件差事（接下了，还没交差） */
  job?: string;
  /** 这件差事眼下接得（身份对、手上没有别的差事、上回办完已经隔了几日） */
  jobOpen?: string;
  /** 侠义、恶名不低于 */
  xia?: number;
  eming?: number;
  /** 时辰：from 到 to 点之间（24 小时制，可跨午夜，例如 from: 19, to: 5 表示入夜到天亮） */
  hour?: { from: number; to: number };
  /** 学得了这门武功：前置、属性、师门、门规都满足（见 docs/menpai.md 第七节）。常和 notLearned 一起用 */
  canLearn?: SkillId;
  /** 是某门派的弟子（在门中），rank 写了就要求不低于这个地位 */
  sect?: { school: string; rank?: SectRank };
  /** 眼下没有师门（出过师、叛过门的也算没有）。拜师的分支用它：一人一师门，身在别派的要另写一个分支 */
  noSect?: true;
  any?: Cond[];
}

/** 效果：按顺序执行 */
export type Effect =
  | { type: 'flag'; flag: string; value?: boolean }
  | { type: 'quest'; id: string; stage: number }
  | { type: 'track'; id: string }
  | { type: 'feed'; tag: FeedTag; text: string }
  | { type: 'toast'; text: string }
  | { type: 'silver'; delta: number }
  | { type: 'item'; id: string; delta: number }
  /** 设置关系；写了 from 时，只有当前关系在 from 里才改 */
  /** 改关系：value 只用关系阶梯里的词（engine/renqing.ts）；note 是人情备注，写为什么记得这个人 */
  | { type: 'rel'; npc: string; value: string; from?: string[]; note?: string }
  | { type: 'prof'; skill: SkillId; amount: number }
  /** 历练：江湖上的见识与实战，闭关时化为武功进境（engine/lilian.ts）。高人指点、奇遇用它；打架、了结任务由引擎自动给 */
  | { type: 'lilian'; amount: number }
  | { type: 'learn'; skill: SkillId; realm?: number; prof?: number }
  /** 拜入门派，或在本门升到某个地位（只升不降）；身在别派时无效，要先出师或叛门 */
  | { type: 'sect'; school: string; rank: SectRank }
  /** 离开师门：出师所学全留；叛门则本门武功境界封顶，门派追杀 */
  | { type: 'leaveSect'; how: '出师' | '叛门' }
  | { type: 'attr'; key: AttrKey; delta: number }
  | { type: 'xia'; delta: number }
  /** 恶名：与侠义是两条独立的值，不互相抵消 */
  | { type: 'eming'; delta: number }
  | { type: 'title'; value: string }
  | { type: 'chapter'; value: number }
  | { type: 'move'; to: string }
  /** add：往后推若干分钟；set：直接设为当天第几分钟（若早于现在则到第二天） */
  | { type: 'time'; add?: number; set?: number }
  | { type: 'weather'; value: string }
  /** hpFrac、mpFrac：按上限的几成回，例如金疮药 hpFrac: 0.3 */
  | { type: 'heal'; hp?: number | 'full'; mp?: number | 'full'; hpAtLeast?: number; hpFrac?: number; mpFrac?: number }
  /** 治伤（医馆、郎中）：不写 levels 治好全部伤；写了就从最重的那处起，一共减这么多级。治完记一条见闻 */
  | { type: 'cure'; levels?: number }
  | { type: 'feedReset' }
  /** 从 NEWS 里随机抽一条传闻，写进见闻，并可在文字里用 {news} 引用 */
  | { type: 'news' }
  /**
   * 定约：npc 和你约好 inDays 日后在 at 见（docs/foundation.md 第三节第三条）。下线静修碰到约期会提前出关。
   * 到了那一日在那里了结它（`yueDone`）；过了那一日还没了结，就是失约：执行 miss，再生一层心魔。
   */
  | { type: 'yue'; id: string; npc: string; at: string; inDays: number; text: string; miss?: Effect[] }
  | { type: 'yueDone'; id: string }
  /** 心魔：做了违背信条的事加一层，化解了减一层（还诺、赔罪、了却） */
  | { type: 'xinmo'; delta: number; why?: string }
  /** 换营生：做了镖师、回去做游侠……（engine/shenfen.ts）。原来的营生就此放下 */
  | { type: 'shenfen'; id: string }
  /** 本行里的地位升降：误了差事、违了行规降一级，降到底就被辞退；立了功、赔了罪升一级 */
  | { type: 'standing'; delta: number }
  /** 接一件差事（JobDef）：手上同时只有一件；接下以后定一个约，过了约期没交差就算误事 */
  | { type: 'job'; id: string }
  /** 交差：按身份和这件差事的档次给钱（engine/shenfen.ts 的 jobPay），了结那个约 */
  | { type: 'jobDone'; id: string }
  /** 差事办砸了（镖丢了、人跑了）：不给钱，地位降一级 */
  | { type: 'jobFail'; id: string }
  /** 开打：战斗结束后由对手定义里的 results 决定后续 */
  | { type: 'fight'; foe: string }
  /** 打开一段剧情卡片 */
  | { type: 'story'; id: string };

/** 分支：从上往下找第一个条件成立的分支，显示 text，执行 do */
export interface Branch { if?: Cond; text?: string; do?: Effect[] }

export interface RoomDef {
  id: string;
  name: string;
  area: string;
  /** 所属区域，地图按区域显示 */
  region: string;
  /** 与相邻地点之间的赶路分钟数（两地取较大值） */
  t: number;
  /** 场景描写；可以按条件给出不同版本 */
  desc: string | Branch[];
  /** 此处的人物；带 if 的只在条件成立时出现 */
  npcs: (string | { id: string; if: Cond })[];
  objs?: (string | { id: string; if: Cond })[];
  /**
   * 出口：[方位, 地点 id] 或 [方位, 地点 id, 回程方位]。
   * 写了回程方位时，系统会自动给对面地点补上回来的出口，新地点不必去改已有地点的文件。
   */
  exits: ([string, string] | [string, string, string])[];
  /** 赶往此处时路上显示的一句话 */
  road?: string | Branch[];
  /** 进入此处时触发；通常配合 notFlag 只触发一次 */
  onEnter?: Branch[];
  /** 在地图上的位置（百分比） */
  map: [number, number];
}

/** 基础服务：医馆（看伤）、客栈（住店）、兵器铺、当铺、杂货铺。tests/content.test.ts「基础设施」按它查各地齐不齐 */
export type Service = '医' | '宿' | '兵' | '当' | '杂';

export interface NpcDef {
  id: string;
  name: string;
  /**
   * 把人物放进某个已有地点，免得去改那个地点的文件。
   * 物品（obj: true）放进 objs，人物放进 npcs。
   */
  at?: { room: string; if?: Cond };
  /** 条件成立时改用另一个名字，例如通报姓名之后 */
  altName?: { if: Cond; name: string };
  /** 头像上的单字；物品用 icon */
  ini?: string;
  icon?: 'stele' | 'go' | 'boat' | 'door';
  tone?: Tone;
  obj?: boolean;
  /** 显示在头像上的人数角标 */
  count?: number;
  brief: string;
  hint?: string;
  look: string;
  /** 收到喜欢的礼物（likes 里的）时的反应，不写则用默认句子 */
  gift?: string;
  /** 喜欢的道具 id：「赠礼」送对了关系升一级，送别的只是客气收下（docs/zhuangbei.md 第四节） */
  likes?: string[];
  /** 做什么营生：医馆、客栈、兵器铺、当铺、杂货。CI 按它查各地齐不齐（tests/content.test.ts「基础设施」）。
   * 带「当」的人物自动有「典当」动作（engine/daoju.ts，按买价四成收），不用写进 verbs；其余服务写在动作里 */
  service?: Service[];
  /** 动作列表的顺序。带 if 的动作只在条件成立时出现，例如真相揭开后才有的「求情」，免得按钮先剧透 */
  verbs: (Verb | { verb: Verb; if: Cond })[];
  actions: Partial<Record<Verb, Branch[]>>;
}

/**
 * 对手重招。这一招主要是哪一项：li 力（沉猛，硬接最难）、su 速（快，闪避最难）、qiao 巧（变化多，拆招最难）。
 * 强度不用写：由对手的档次和路数算出来（engine/duel.ts），同一招在高手手里更难接。
 */
export interface TellDef {
  name: string;
  text: string;
  dom: 'li' | 'su' | 'qiao';
  after: string;
}

/** 胜负以后的一条路：放他走、问话、送官、下杀手……写明后果在哪里回来 */
export interface AfterOpt {
  /** 这条路什么时候有（例如事情已经了结过，就不再有）；一条都没有时不问 */
  if?: Cond;
  label: string;
  /** 按钮上的小字：代价或去向 */
  sub?: string;
  /** 选了以后，战斗记录里的一句 */
  say: string;
  /** 换掉结算页的标题和叙述（原来的结算替玩家定了别的结局时） */
  title?: string;
  story?: string;
  do?: Effect[];
  /** 结算页上的「以后」：这件事会在哪里回来（传闻、路遇、人物的话） */
  later: string;
}

/** 胜负以后：打倒对手以后，由玩家定他的下场 */
export interface AfterDef {
  /** 对手倒下以后说的话 */
  plea: string;
  opts: AfterOpt[];
}

export interface FightResult {
  /** 剧本战用：不弹结算页，直接执行 do 和 then */
  silent?: boolean;
  tag?: string;
  title?: string;
  /** 结算页的叙述；写 '@compose' 时由引擎根据战况生成说书 */
  story?: string;
  do?: Effect[];
  /** 关闭结算页之后执行，通常用来接一段剧情 */
  then?: Effect[];
  button?: string;
  /** 输了时是否显示「变强之道」 */
  growth?: boolean;
  /** 胜负以后：先问玩家怎样处置对手，再出结算（只用在 win 上） */
  after?: AfterDef;
}

export interface FoeDef {
  id: string;
  name: string;
  title: string;
  ini: string;
  tone: Tone;
  weapon: string;
  /** 兵器的简称：刀、剑…… */
  ws: string;
  /** 武功的性质与兵器长短，用来算克制（见 docs/wuxue.md）；不写就不算克制 */
  nature?: SkillNature;
  reach?: SkillReach;
  /**
   * 档次：0 不入流、1 三流、2 二流、3 一流、4 绝顶、5 宗师，可以带小数（1.5 是三流里拔尖的）。
   * 气血、出手、重招的强度都由档次和路数算出来（engine/person.ts 的 standard），不用写数。
   */
  rank: number;
  /** 路数：outer 外功见长（出手重、拆招强）、inner 内功深厚（耐打、硬接强）、light 轻功见长（快、难打中）；不写为均衡 */
  build?: 'even' | 'outer' | 'inner' | 'light';
  /** 不是练家子（饿急了的孩子、乌合之众）：气血和出手都乘这个数，例如 0.1；练家子不写 */
  weak?: number;
  /** 切磋：打到三成气血即止 */
  spar?: boolean;
  /** 剧本战：不会战死、不能逃跑认输。rescue：打到六成（或你撑不住）时由人救下；cup：你撑不住时有人出手 */
  script?: 'cup' | 'rescue';
  /** 第几合出第一次重招 */
  firstTell?: number;
  tag: string;
  moves: string[];
  flourish: string[];
  tells: TellDef[];
  asides: string[];
  opening: string[];
  intro: string;
  /** 开场时额外显示的教学提示 */
  tips?: string[];
  phase2?: string;
  win: string;
  lose: string;
  results: { win: FightResult; lose?: FightResult; flee?: FightResult; yield?: FightResult };
  /**
   * 备战：开打前做过的准备，条件成立就生效，可以叠加（engine/beizhan.ts）。
   * 打听到对手的底细、找来帮手、占了地利……弱小的人靠这些也能以弱胜强。
   */
  prep?: PrepDef[];
}

export interface PrepDef {
  if: Cond;
  /** 开打时的叙述，例如「你记着船夫的话，专往他左边走」 */
  text: string;
  /** 知彼：对手普通招式、重招的倍数，例如 0.85（打听到底细，专攻他的软肋） */
  atk?: number;
  big?: number;
  /** 帮手：答应来的人，在战斗里看得见地出手（engine/duel.ts） */
  ally?: AllyDef;
  /** 战后说书里的一句，写成完整的句子 */
  story?: string;
  /** 带着这项准备打赢时，额外执行的效果（准备的代价、后果写在这里） */
  win?: Effect[];
}

/** 帮手：share 是他一共替你打掉对手几成气血（0.15 到 0.3），at 是他在第几合出手，say 是每次出手的叙述（按次序用，用完重复最后一句） */
export interface AllyDef {
  name: string;
  share: number;
  at: number[];
  say: string[];
}

/* ---------- 武功（武学库，详见 docs/wuxue.md） ---------- */

export type SkillGrade = '凡品' | '良品' | '上品' | '绝品' | '神品' | '禁品';
/**
 * 分类参照北大侠客行：拳脚、兵刃各有门类；内功、轻功、绝技单列；杂学是不上阵的学问（读书写字、医术、毒术、琴棋书画）。
 * 能放进哪个搭配槽位，见 src/content/skills.ts 的 SLOT_CATS。
 */
export type SkillCategory =
  | '内功' | '轻功' | '绝技' | '杂学'
  | '拳法' | '掌法' | '指法' | '爪法' | '腿法' | '手法'
  | '剑法' | '刀法' | '枪法' | '棍法' | '杖法' | '鞭法' | '斧法' | '锤法' | '奇门' | '暗器';
/** 武功怎样传授：入门、外门、内门、真传由师门按地位传授；奇遇不靠师门（山洞石壁、前辈遗刻、家传、残谱）。见 docs/menpai.md 第七节 */
export type SkillTeach = '入门' | '外门' | '内门' | '真传' | '奇遇';
/** 门内地位：记名弟子 → 外门 → 内门 → 真传 */
export type SectRank = '记名' | '外门' | '内门' | '真传';
/** 性质相克：柔克刚、刚克阴、阴克阳、阳克柔；中正不克也不被克 */
export type SkillNature = '刚' | '柔' | '阴' | '阳' | '中正';
/** 兵器长短：一寸长一寸强，一寸短一寸险 */
export type SkillReach = '长' | '短' | '徒手';
/**
 * 搭配槽位：内功、轻功、拳脚、兵刃、绝技（docs/zhuangbei.md 第二节）。
 * 出手用哪一门：手里的兵器和兵刃位的武功对得上，用兵刃位的；否则用拳脚位的。
 */
export type Slot = 'neigong' | 'qinggong' | 'fist' | 'weapon' | 'ult';
/** 兵器的类型：剑法配剑、刀法配刀……奇门兵器配奇门武功 */
export type WeaponKind = '剑' | '刀' | '枪' | '棍' | '杖' | '鞭' | '斧' | '锤' | '奇门';
/** 伤势类型，决定战斗里伤势的写法 */
export type WoundKind = '瘀伤' | '内伤' | '刺伤' | '割伤' | '砸伤' | '冻伤' | '灼伤' | '毒伤';

/**
 * 战斗效果（增益与减益）。数值范围和「预算」见 docs/wuxue.md，由 tests/content.test.ts 校验。
 * - busy 点穴、缠绕：对手若干合不能出手
 * - bleed 流血、poison 中毒、burn 灼烧：对手每合掉血 value
 * - chill 寒气：对手出招变慢，重招来得更晚
 * - weaken 卸力、内伤：对手伤害降低 value%
 * - break 破绽、破甲：对手受到的伤害提高 value%
 * - disarm 缴械：对手兵刃脱手，伤害大减
 * - fear 震慑：对手气势（势）下降 value
 * - drain 吸内力：吸取对手内力 value 补给自己
 * - guard 护体：自己受到的伤害降低 value%
 * - haste 身法：自己闪避提高 value%
 * - heal 疗伤：回复自己气血 value
 * - rage 怒气：增加怒气 value
 */
export type FxKind = 'busy' | 'bleed' | 'poison' | 'burn' | 'chill' | 'weaken' | 'break' | 'disarm' | 'fear' | 'drain' | 'guard' | 'haste' | 'heal' | 'rage';
export interface FxDef {
  kind: FxKind;
  /** 数值：伤害、百分比或点数，依效果而定；busy、chill、disarm 不用写 */
  value?: number;
  /** 持续几合；一次性的效果（drain、heal、rage、fear）不用写 */
  rounds?: number;
  /** 触发几率，0.1 到 1，不写为 1 */
  chance?: number;
}

/**
 * 一招：招名加一句描写。描写可用 {foe}（对手名字）和 {part}（部位）。
 * realm：练到第几重境界（0 起）才会使出这一招，不写为一开始就会。
 */
export interface MoveDef { name: string; text: string; realm?: number; wound?: WoundKind }

/** 武功的「绝招」：战斗中点按钮施展，可带效果。参照北大侠客行的 perform */
export interface PerformDef {
  name: string;
  /** 出招描写，可用 {foe} {part} */
  text: string;
  /** 练到第几重境界才能用，不写为一开始就能用 */
  realm?: number;
  /** 耗内力 */
  mp: number;
  /** 用过之后要调息几合 */
  cd: number;
  /** 连击数，0 到 3。0 表示不打伤害，只施加效果 */
  hits: number;
  /** 每一击的伤害区间 */
  dmg: [number, number];
  /** 每一击的命中率，0.5 到 0.9 */
  acc: number;
  fx?: FxDef[];
  /** 蓄势：先蓄一合再出手，伤害加两成；蓄势时被点穴、缴械就落空。只有带刚猛的门派能用，只能是一击（docs/menpai.md 第五节） */
  charge?: boolean;
}

/** 绝技槽的「杀招」：怒气满时施展，全屏题字，震撼收场 */
export interface UltDef {
  /** 题字时显示的小字，例如「寒江剑法 · 绝招」 */
  title: string;
  /** 演出文字，可用 {foe} {part} */
  text: string;
  dmg: [number, number];
  fx?: FxDef[];
}

/** 搭配合璧：和另一门武功（或同一门派的任何武功）同时搭配时触发 */
export interface ComboDef {
  /** 另一门武功的 id，或「门派:少林」这种写法表示该门派任何一门 */
  with: string;
  name: string;
  /** 开战时显示的合璧描写 */
  text: string;
  /** 火候加成，1 到 8 */
  bonus: number;
  fx?: FxDef[];
}

export interface SkillDef {
  id: SkillId;
  name: string;
  grade: SkillGrade;
  category: SkillCategory;
  /** 门派或出处，必须是 src/content/skills.ts 里 SCHOOLS 列出的名字 */
  school: string;
  nature: SkillNature;
  /** 拳脚、兵刃必填 */
  reach?: SkillReach;
  desc: string;
  /** 拳脚、兵刃写 6 到 12 招；其他可以不写 */
  moves?: MoveDef[];
  /** 拳脚、兵刃的绝招，最多 3 个 */
  performs?: PerformDef[];
  /** 搭配在身上时一直生效的效果，例如内功护体、轻功身法 */
  passive?: FxDef[];
  /** 绝技必须有 */
  ult?: UltDef;
  combos?: ComboDef[];
  /** 怎样学到：写给人看的说明，例如「少林寺达摩院首座传授」 */
  learn: string;
  /** 怎样传授（师门按地位，或奇遇）。江湖散学不写。见 docs/menpai.md 第七节 */
  teach?: SkillTeach;
  /** 前置武学：先把这些武功练到第几重（0 起，即 REALMS 的序号），才能学这一门 */
  requires?: { skill: SkillId; realm: number }[];
  /** 属性门槛，例如 { 悟性: 20 } */
  needAttr?: Partial<Record<AttrKey, number>>;
  /** 绝招、杀招、合璧要用哪些内功来使：不写为本门任意内功；写 '任意' 表示不挑内功（只给有高前置的奇遇武功） */
  roots?: string[];
}

/* ---------- 道具与装备（docs/zhuangbei.md 第三到第五节） ---------- */

/**
 * 道具的类，决定行囊里能对它做什么：
 * 药服用（战斗中也能），酒食饮用、请人喝，装备穿戴、典当，信物（含线索）只能细看、不卖不送，杂物赠人、典当。
 */
export type ItemKind = '药' | '酒食' | '装备' | '信物' | '杂物';
/** 纸娃娃的六个装备位 */
export type GearSlot = '兵器' | '冠' | '衣' | '靴' | '佩' | '饰';
/** 装备的品级：凡品到神品（没有禁品） */
export type GearGrade = Exclude<SkillGrade, '禁品'>;
/**
 * 装备的数值：小，锦上添花，一件神兵不能让三流打赢一流。
 * 每件的上限按装备位和品级定（engine/zhuangbei.ts 的 GEAR_POINTS），tests/daoju.test.ts 校验。
 */
export interface GearStats {
  /** 出手：伤害多百分之几（兵器） */
  chushou?: number;
  /** 护体：挨打的伤害少百分之几上下（衣、冠）。和根骨、功力的护体一样，并进气血上限 */
  huti?: number;
  /** 闪避：躲开普通出手的几率多几个百分点（靴、冠） */
  shanbi?: number;
  /** 内力上限多几点（佩） */
  neili?: number;
  /** 后天根基多几点（靴、佩、饰）：火候、检定都算 */
  attr?: Partial<Record<AttrKey, number>>;
}
export interface EquipDef {
  slot: GearSlot;
  /** 兵器位必填：兵器的类型（剑法配剑……）、长短 */
  weapon?: WeaponKind;
  reach?: SkillReach;
  /** 品级，数值的上限跟着它；没有数值的（信物、寻常兵器）可以不写 */
  grade?: GearGrade;
  stats?: GearStats;
}

export interface ItemDef {
  id: string; name: string; desc: string; hidden?: boolean;
  kind: ItemKind;
  /** 服用、饮用的效果（药、酒食必写）：例如 { type: 'heal', hpFrac: 0.3 } 回三成气血 */
  use?: Effect[];
  /** 能穿戴：装备位、兵器类型和长短、品级、数值 */
  equip?: EquipDef;
  /** 买价，单位文。当铺按四成收；信物不写（不卖） */
  price?: number;
  /** 细看：先显示 desc，再接上第一个条件成立的分支（线索随剧情变化，和人物的「观察」一样） */
  look?: Branch[];
}

export interface QuestDef {
  id: string;
  name: string;
  stages: { title: string; to?: string }[];
  /** 了结时给的历练；不写按阶段数算，每阶段 100（engine/lilian.ts） */
  lilian?: number;
}

export interface StoryChoice {
  label: string;
  sub?: string;
  /** 条件成立才出现，例如悟性够了才看得出破绽；每张卡片至少留一个不带条件的选择 */
  if?: Cond;
  do?: Effect[];
  /** 选完之后先显示的结果文字；不写则直接进入下一步 */
  result?: string;
  /** 下一张卡片的序号；不写为下一张，写 -1 为结束 */
  next?: number;
}

export interface StoryCard {
  tag?: string;
  title: string;
  paras: string[];
  /** 'name'：在这张卡片上请玩家起名 */
  input?: 'name';
  /** 在卡片上展示的收获 */
  gains?: string[];
  choices: StoryChoice[];
}

export interface StoryDef {
  id: string;
  cards: StoryCard[];
  /** 剧情结束后播放的章回题字 */
  endChapter?: { small: string; big: string };
}

export interface NewsDef { if?: Cond; text: string }

/** 地区；order 是地图上地区标签的先后，小的在前 */
export interface RegionDef { name: string; note: string; order?: number }

/**
 * 路遇：赶路时在路上遇到的事（engine/encounter.ts，docs/content-guide.md「路遇」）。
 * 内容是一段剧情卡片：有人物动机、两难、代价，和别的任务一样不能潦草（宪章 P9）。
 */
export interface EncounterDef {
  id: string;
  /** 走进这些地区的地点时，路上可能遇到 */
  region: string[];
  /** 只在走进这些地点的路上遇到；不写为地区里任何一段路 */
  to?: string[];
  if?: Cond;
  /** 抽中的分量，默认 1；稀罕的奇遇写小些 */
  weight?: number;
  /** 一生只遇一次（奇遇）；不写的，同一条七天内不再遇 */
  once?: boolean;
  /** 遇到时打开的剧情卡片 */
  story: string;
}

/**
 * 内容包：src/content/packs/ 下每个文件默认导出一个内容包，系统自动收录。
 * 新增内容时新建自己的内容包文件，尽量不要改别人的文件。
 */
/**
 * 差事：营生里能反复办的活（docs/foundation.md 第三节第六、八条）。走镖、悬赏、护院……
 * 钱不写在这里：由身份和档次算（engine/shenfen.ts），本事越大接的活越大，宗师走一趟镖也不过三流的十来倍。
 * 流程写在人物的动作里：发差事的人「接」（{ type: 'job' }），交差的人「交」（{ type: 'jobDone' }），
 * 路上的凶险写成对手（fight），打输了 jobFail。
 */
export interface JobDef {
  id: string;
  /** 哪个身份的差事 */
  shenfen: string;
  /** 档次：0 不入流 … 5 宗师。报酬按它算；路上的对手也该是这一档上下 */
  tier: number;
  /** 差事簿上的一行 */
  title: string;
  /** 交差的人、在哪里、几日之内 */
  npc: string;
  at: string;
  days: number;
  /** 办完以后隔几个江湖日才能再接（不写为三日） */
  again?: number;
  /** 报酬的倍数（难办的差事多给些），不写为一 */
  k?: number;
}

/**
 * 根基之眼（docs/foundation.md 第三节第一条第二款）：交手以外，每种根基读到不同的东西。
 * 后天根基够了，场景描写下面、观察人物时，多出一行带根基名的话；可以顺手写下旗标，解锁别的做法
 * （例如体魄好的人看得出屠千山左臂有旧伤，不必去问船夫）。
 * 只写在关键场面上；一处至少写两种根基，偏科的人也总有自己看得出的那一层。写在自己的内容包里，不必改别人的文件。
 */
export interface EyeDef {
  /** 挂在哪里：地点（场景描写下面）或者人物、物件（观察时），二选一 */
  room?: string;
  npc?: string;
  attr: AttrKey;
  /** 后天根基不低于这个数才看得出（常人二十，上限五十）：二十四上下是比常人强一截，三十以上是出类拔萃 */
  atLeast: number;
  if?: Cond;
  /** 看出来的东西，主语用「你」，写具体的细节，不写「你觉得他不简单」这类空话 */
  text: string;
  /** 看见时执行（只用在人物、物件上，观察时执行），通常是写一个旗标，解锁别处的做法 */
  do?: Effect[];
}

export interface ContentPack {
  regions?: Record<string, RegionDef>;
  rooms?: RoomDef[];
  npcs?: NpcDef[];
  foes?: FoeDef[];
  quests?: QuestDef[];
  stories?: StoryDef[];
  items?: ItemDef[];
  news?: NewsDef[];
  skills?: SkillDef[];
  encounters?: EncounterDef[];
  jobs?: JobDef[];
  eyes?: EyeDef[];
}
