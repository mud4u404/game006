import type { ContentPack, Effect, FoeDef, ItemDef, QuestDef, StoryCard, StoryDef } from '../types';

/**
 * 序章「瓜洲夜雨」。新开局照 docs/kaipian.md（第二稿，负责人 10-09 定）：
 * 童年三忆 → 第一夜「渡不渡」（三条路，各带一场弱对手的打）→ 第二夜（按第一夜的路分三种）→ 天亮，斗笠、油布、去路。
 * 江伯生死未卜：第二夜后不见了，只留一顶斗笠。新开局的存档带旗标 kp_xin，重回瓜洲的文字据此分新旧。
 *
 * 旗标：
 * - kp_du / kp_wen / kp_bu：第一夜走了哪条路（渡 / 请二位上船说清楚 / 不渡），重回瓜洲的人读它；
 * - kp_qiantan / kp_lan / kp_zhong：普通人的本领（认得浅滩 / 放缆绳 / 敲破钟），开打时对手的备战条件读它；
 * - kp_xin：新开局，江伯生死未卜；kp_zuo：天亮后在焦船边多坐了一会儿；
 * - kp_jiu：不渡的那条路上，落水的独臂人被救上了岸（下水救他，或在堤下打退了追兵），扬州才见得到他（packs/kp-guren.ts）；
 * - kp_chu_name：知道独臂镖师姓褚。
 * 三场打都分打赢、打输、逃开，各接一张不同的卡：kp_X_hou（赢）、kp_X_hou_lose、kp_X_hou_flee（不渡路另有 kp_bu_hou，是没有打的两条小路）。
 * 文件末尾「旧序章」那三段（p_night、p_after1、p_death）和 heiyi、heiyi2 是旧版序章（抓药、夜袭、江伯之死）：
 * 新开局不再走到；只留给停在旧序章中途的存档接着玩（id 只增不删，tests/ids.test.ts）。
 */

/** 第一夜过去，三日后的夜里：时辰拨到三更，下起大雨 */
const THREE_DAYS: Effect[] = [{ type: 'time', add: 3 * 1440 }, { type: 'time', until: 23 * 60 + 30 }, { type: 'weather', value: '大雨' }];

/** 三条路合到一处的第二夜前半（来的船、江伯取剑）。下半夜按路分：见 REVEAL_* */
const NIGHT2: StoryCard[] = [
  { tag: '序章 · 第二夜', title: '旧债上门',
    paras: [
      '三日后，下起雨来。',
      '那一夜渡口的事，到底传了出去。三更时分，江上来了几条没点灯的船。',
      '船外有人笑了一声，笑声尖细，不男不女：「江老管家，二十年不见，倒做起渔翁来了。」'
    ],
    choices: [{ label: '屏住呼吸' }] },
  { tag: '序章 · 第二夜', title: '布包里的剑',
    paras: [
      '江伯从船底摸出一个长条布包，一层一层解开，是一柄旧剑。他握住剑柄，手便不抖了。',
      '你这才想起，江伯的咳嗽，今晚一声也没有。'
    ],
    choices: [{ label: '看向船外' }] }
];

/** 第二夜下半：第一夜的选择，这一夜见分晓 */
const REVEAL_DU: StoryCard = { tag: '序章 · 第二夜', title: '芦苇丛里的人',
  paras: [
    '雨里有人从芦苇丛中跌跌撞撞冲出来，是那个独臂人。',
    '他浑身泥水，嘶声喊道：「江前辈！他们是跟着我来的——他们逼我带路，我趁乱挣脱了！」',
    '他跪在泥里，朝你磕了一个头：「小哥，那天船上，我说了假话。二十年前那一夜，我没有走。带路的人，就是我。」',
    '你想起他那句「出了庄门，再没回头」，也想起江伯看他空袖子的那半晌。原来江伯早就知道。'
  ],
  choices: [{ label: '继续' }] };

const REVEAL_WEN: StoryCard = { tag: '序章 · 第二夜', title: '卫衡拔剑',
  paras: [
    '岸上一道人影踏着泥水疾奔而来，剑已出鞘。是卫衡。',
    '他站到江伯身边，没有看你，只对着船外那片黑沉沉的江面，说了一句：「二十年前那一夜，家父是江前辈背出来的。」',
    '追债追到门口的人，原来欠着债主一条命。你这才明白，他三日前向江伯请教的那个道理，是想亲手找一个等了二十年的答案。'
  ],
  choices: [{ label: '继续' }] };

const REVEAL_BU: StoryCard = { tag: '序章 · 第二夜', title: '血染的腰牌',
  paras: [
    '你把手伸进怀里，摸到那块被血浸透的腰牌。三日来你翻来覆去看了无数遍。',
    '此刻船外那几个人影的腰间，挂着同样的东西。',
    '你认得了牌上刻的两个字：黑风。来的是什么人，你心里有数了。'
  ],
  choices: [{ label: '继续' }] };

/** 江伯走进雨里，三条路都一样 */
const RAIN: StoryCard = { tag: '序章 · 第二夜', title: '走进雨里',
  paras: [
    '江伯把剑提在手里，没有回头。他只用竹篙在你脚下的小舢板上轻轻一点，那小船便悄无声息地滑进了芦苇深处。',
    '他自己抬脚跨过船舷，走进了雨里。雨幕在他身前分开，又在他身后合拢，像你十六岁那夜在江边见过的一样。',
    '芦苇叶子刮着你的脸。你听见兵刃相击，一声，两声，然后是一片火光，映红了半条江。',
    '你攥着竹篙，篙头在水里抖个不停。'
  ],
  choices: [{ label: '等到天亮', do: [{ type: 'time', set: 5 * 60 + 40 }, { type: 'weather', value: '阴' }] }] };

/** 天亮以后：焦船、斗笠、油布、玉佩 */
const DAWN: StoryCard[] = [
  { tag: '序章 · 天明', title: '焦船',
    paras: [
      '天亮时，雨停了。渡口那条船只剩一副焦黑的骨架。',
      '江伯不在船上，不在岸上，也不在江里。你沿着江滩找到日头偏西，只在芦苇丛里拾到他那顶旧斗笠。'
    ],
    choices: [{ label: '把斗笠捡起来', do: [{ type: 'time', until: 17 * 60 + 30 }, { type: 'item', id: 'kp_douli', delta: 1 }, { type: 'wear', id: 'kp_douli' }, { type: 'toast', text: '得到 江伯的斗笠' }] }] },
  { tag: '序章 · 天明', title: '油布',
    paras: [
      '船底的布包还在，剑没了，包里夹着一页油布，画着一个持剑的小人，墨迹被水洇了大半。',
      '你贴身还揣着半块玉佩，是第一夜江伯塞给你的，只说了一句：「贴身收着。」',
      '你把斗笠戴在头上，大了一圈。'
    ],
    choices: [{ label: '收好油布', do: [{ type: 'item', id: 'scroll', delta: 1 }, { type: 'toast', text: '得到 断水残页' }] }] }
];

/** 一场打的三种收场 */
type Ending = 'win' | 'lose' | 'flee';

/**
 * 天亮后来传话的人，按第一夜的路各不相同；去路一样：扬州，大明寺，了尘。
 * 打赢、打输、逃开，说的话和记的人情也各不相同：逃开的人，不记人家的恩。
 */
const MSG_DU: Record<Ending, StoryCard> = {
  win: { tag: '序章 · 天明', title: '去路',
    paras: [
      '你回到渡口时，那独臂人已经候在焦船边，半边脸被烟熏得漆黑。他没有看你，只盯着地上的灰烬。',
      '「江前辈入雨之前，让我转告你。」他的声音哑得厉害，「扬州，大明寺，了尘。」',
      '他顿了顿，用仅剩的那只手按住胸口：「在下褚七。我欠你一条命，往后，我来还。」'
    ],
    choices: [{ label: '记下了', do: [
      { type: 'flag', flag: 'kp_chu_name' },
      { type: 'rel', npc: 'kp_chu', value: '相谈甚欢', note: '欠你一条命' },
      { type: 'rel', npc: 'kp_wei', value: '心存芥蒂', note: '你渡了他要找的人' }
    ] }] },
  lose: { tag: '序章 · 天明', title: '去路',
    paras: [
      '你回到渡口时，那独臂人已经候在焦船边，半边脸被烟熏得漆黑。他没有看你，只盯着地上的灰烬。',
      '「江前辈入雨之前，让我转告你。」他的声音哑得厉害，「扬州，大明寺，了尘。」',
      '他的目光落在你的肋下，停了一停，用仅剩的那只手按住胸口：「在下褚七。那一棍本是冲我来的，你替我挨了。这笔账，我来还。」'
    ],
    choices: [{ label: '记下了', do: [
      { type: 'flag', flag: 'kp_chu_name' },
      { type: 'rel', npc: 'kp_chu', value: '相谈甚欢', note: '你替他挨了一棍' },
      { type: 'rel', npc: 'kp_wei', value: '心存芥蒂', note: '你渡了他要找的人' }
    ] }] },
  flee: { tag: '序章 · 天明', title: '去路',
    paras: [
      '你回到渡口时，那独臂人已经候在焦船边，半边脸被烟熏得漆黑。他没有看你，只盯着地上的灰烬。',
      '「江前辈入雨之前，让我转告你。」他的声音哑得厉害，「扬州，大明寺，了尘。」',
      '他顿了顿，用仅剩的那只手按住胸口：「在下褚七。那夜是江前辈出的手，我欠的是他。你肯撑船渡我，我也记着，只是这笔账，不记在你名下。」'
    ],
    choices: [{ label: '记下了', do: [
      { type: 'flag', flag: 'kp_chu_name' },
      { type: 'rel', npc: 'kp_chu', value: '点头之交', note: '那夜你躲进了舱里，是江伯救的他' },
      { type: 'rel', npc: 'kp_wei', value: '心存芥蒂', note: '你渡了他要找的人' }
    ] }] }
};

const MSG_WEN_HEAD = '你回到渡口时，卫衡坐在焦船边的石头上，剑横在膝上，左袖撕了一截，裹着臂上的伤。';
const MSG_WEN: Record<Ending, StoryCard> = {
  win: { tag: '序章 · 天明', title: '去路',
    paras: [
      MSG_WEN_HEAD,
      '「江前辈入雨之前，托我转告你：扬州，大明寺，了尘。」他站起身，「他叫你别追。他还说，你撑篙的样子，像他年轻的时候。」',
      '他抱了抱拳，转身沿着江堤走了。他走出很远，才回了一次头。'
    ],
    choices: [{ label: '记下了', do: [
      { type: 'rel', npc: 'kp_wei', value: '点头之交', note: '那夜你和他站在一边' },
      { type: 'rel', npc: 'kp_chu', value: '心存芥蒂', note: '当着卫衡的面，你逼他认了旧账' }
    ] }] },
  lose: { tag: '序章 · 天明', title: '去路',
    paras: [
      MSG_WEN_HEAD,
      '「江前辈入雨之前，托我转告你：扬州，大明寺，了尘。」他站起身，「他叫你别追。他还说，你肋下那一叉，不必放在心上，他年轻时挨的比这重。」',
      '他抱了抱拳，转身沿着江堤走了。他走出很远，才回了一次头。'
    ],
    choices: [{ label: '记下了', do: [
      { type: 'rel', npc: 'kp_wei', value: '点头之交', note: '那夜船上你挨了一叉，是江伯出声收的场' },
      { type: 'rel', npc: 'kp_chu', value: '心存芥蒂', note: '船上你验他的伤，他拿鱼叉抵着你，是江伯喝住的' }
    ] }] },
  flee: { tag: '序章 · 天明', title: '去路',
    paras: [
      MSG_WEN_HEAD,
      '「江前辈入雨之前，托我转告你：扬州，大明寺，了尘。」他站起身，「他叫你别追。他还说，那夜你的手在抖，不丢人，他头一回见血，也抖过。」',
      '他抱了抱拳，转身沿着江堤走了。他走出很远，才回了一次头。'
    ],
    choices: [{ label: '记下了', do: [
      { type: 'rel', npc: 'kp_wei', value: '点头之交', note: '那夜船上你退到舱口，是江伯一句话收的场' },
      { type: 'rel', npc: 'kp_chu', value: '心存芥蒂', note: '船上你验他的伤，他一叉过来，你退了，是江伯喝住的' }
    ] }] }
};

const MSG_BU_HEAD = [
  '你回到渡口时，卞婆婆拄着拐，由人搀着，站在焦船边。她一夜没睡，眼皮肿着。',
  '「老江那天把话托给了我这个老婆子，」她说，「他说，若有一日渡口出了事，叫我转告你：扬州，大明寺，了尘。」',
  '她看了你一眼，没有再说别的，拄着拐，由人搀着慢慢走了。'
];
/** 不渡：没有打的那两条小路（下水救他、留在船上）用 stay，打了的三种收场各记各的 */
const MSG_BU: Record<Ending | 'stay', StoryCard> = Object.fromEntries(([
  ['stay', '那夜没渡人的那个少年'],
  ['win', '那夜没渡人，却在堤下把持刀的人逼退了'],
  ['lose', '那夜没渡人，堤下的持刀汉子把你打倒在泥里'],
  ['flee', '那夜没渡人，堤下的持刀汉子追来，你拔腿就跑']
] as const).map(([k, note]) => [k, { tag: '序章 · 天明', title: '去路', paras: MSG_BU_HEAD,
  choices: [{ label: '记下了', do: [{ type: 'rel', npc: 'kp_wei', value: '素不相识', note }] }] } satisfies StoryCard])) as Record<Ending | 'stay', StoryCard>;

/** 登船：序章了结，题字「第一回 · 扬州」。idx 是这张卡在整段剧情里的序号，「再坐一会儿」回到这里 */
const finalCard = (idx: number): StoryCard => ({ tag: '序章 · 天明', title: '登船',
  paras: [
    '码头上，一条去扬州的客船正要起锚。',
    '焦黑的船骨还泡在浅水里。江上起了雾，又散了，来来往往的船，没有一条是江伯的。'
  ],
  choices: [
    { label: '登船 · 去扬州', next: -1, do: [
      { type: 'quest', id: 'prologue', stage: 3 }, { type: 'chapter', value: 1 }, { type: 'shenfen', id: 'youxia' },
      { type: 'flag', flag: 'kp_xin' },
      { type: 'move', to: 'hu' }, { type: 'time', set: 9 * 60 + 20 }, { type: 'weather', value: '微雨' },
      { type: 'heal', hpAtLeast: 0.8, mp: 'full' }, { type: 'cure' },
      { type: 'rel', npc: 'liu', value: '素不相识' },
      { type: 'feedReset' },
      { type: 'feed', tag: '传闻', text: '城南的威远镖局正在招募镖师。' },
      { type: 'feed', tag: '传闻', text: '黑风寨劫了漕帮三船盐货，漕帮放出悬赏。' },
      { type: 'feed', tag: '主线', text: '江伯不知所踪，只留下一顶斗笠。去扬州大明寺，找了尘大师。' },
      { type: 'quest', id: 'main1', stage: 0 }, { type: 'track', id: 'main1' }
    ] },
    { label: '在焦船边再坐一会儿', if: { notFlag: 'kp_zuo' }, next: idx, do: [{ type: 'flag', flag: 'kp_zuo' }],
      result: '你在焦船边坐了很久。你想起他补网时总哼的那支调子，哼了两句，哼不下去了。斗笠压在眉上，江风吹过，竟有一点他身上的烟火气。' }
  ] });

/** 第一夜过后的事（打完那一场，或没有打）→ 第二夜 → 天亮，合成一整段 */
function hou(id: string, after: StoryCard[], reveal: StoryCard, msg: StoryCard): StoryDef {
  const cards = [...after, ...NIGHT2, reveal, RAIN, ...DAWN, msg];
  cards.push(finalCard(cards.length));
  return { id, endChapter: { small: '第一回', big: '扬州' }, cards };
}

/** 一场打有三种收场：打赢、打输、逃开，各接一张不同的卡，再合到同一条路的后文 */
const ending = (title: string, paras: string[]): StoryCard => ({ tag: '序章 · 第一夜', title, paras, choices: [{ label: '继续' }] });

/* ---------- 渡：南岸、码头 ---------- */
const DU_MA: StoryCard = { tag: '序章 · 第一夜', title: '码头',
  paras: [
    '你撑船回来时，江伯仍站在码头上，什么也没问，只接过你手里的篙。',
    '「渡了就渡了。」他说，「渡了的人，往后要你自己担。」'
  ],
  choices: [{ label: '三日过去', do: THREE_DAYS }] };
const DU_AFTER: Record<'win' | 'lose' | 'flee', StoryCard[]> = {
  win: [
    ending('南岸', [
      '家丁的短棍脱手，在甲板上滚了两滚，落进水里。堤上的卫衡又喝了一声，这回两个人听见了，湿淋淋地退回划子，没有人再说话。',
      '船靠南岸。镖师爬上岸，回头看了你一眼，嘴唇动了动，终究只说了一句：「这条命，记在你头上。」',
      '卫衡站在北岸的堤上，隔着一江夜色望过来。你看不清他的脸，只知道他记下了你。'
    ]), DU_MA],
  lose: [
    ending('南岸', [
      '你肋下挨了一棍，蹲在船板上，半天直不起腰。镖师一声不吭，用那一只手夺过竹篙，自己撑了几篙。',
      '堤上的卫衡厉声喝住家丁，湿淋淋的两个人这才退回划子。',
      '船靠南岸，镖师把篙还给你，嘴唇动了动，只说了一句：「这条命，记在你头上。」卫衡站在北岸的堤上，隔着一江夜色望过来，你看不清他的脸。'
    ]), DU_MA],
  flee: [
    ending('江伯的篙', [
      '你丢下竹篙，缩到舱里。划子的船头撞了上来，两个家丁抢上船帮，短棍高高扬起。',
      '码头上传来一声咳嗽。一根竹篙贴着水面飞来，削掉了划子的半边船舷，木屑溅了家丁一脸。江伯没有走近，仍站在缆桩边，手还没有放下。',
      '两个人愣在船上，再没有人敢动。卫衡在堤上又喝了一声，他们把划子划了回去。',
      '船靠南岸。镖师爬上岸，回头看了看缆桩边那个人影，又看了你一眼，只说了一句：「这条命，是江前辈给的。」'
    ]), DU_MA]
};
const DU_HOU: StoryDef[] = [
  hou('kp_du_hou', DU_AFTER.win, REVEAL_DU, MSG_DU.win),
  hou('kp_du_hou_lose', DU_AFTER.lose, REVEAL_DU, MSG_DU.lose),
  hou('kp_du_hou_flee', DU_AFTER.flee, REVEAL_DU, MSG_DU.flee)
];

/* ---------- 请二位上船：卞婆婆、一个面子 ---------- */
const WEN_TAIL: StoryCard[] = [
  { tag: '序章 · 第一夜', title: '卞婆婆',
    paras: [
      '你想起了卖豆腐的卞婆婆。她在这渡口摆了三十年摊，记得每一条靠过岸的船。你撑船去东岸，把她接了过来。',
      '老人家腿不好，由你搀着上了船。她眯着眼把镖师看了半晌，慢吞吞道：「那年深秋，是有一条没点灯的船夜里靠岸，下来三个人。走在头里的，是个使左手的后生。」',
      '船上没有人说话。镖师的脸，白得像灯芯上的灰。'
    ],
    choices: [{ label: '继续' }] },
  { tag: '序章 · 第一夜', title: '一个面子',
    paras: [
      '卫衡把剑插回腰间：「今日看在江前辈的面子上，晚辈不动他。」他看了镖师一眼，「但这笔债没完。」',
      '镖师向江伯磕了一个头，什么也没说。江伯摆摆手，起身去舱后咳了几声，回来时脸色有些发灰。',
      '两边都欠了江伯一个面子。你第一次知道，一件二十年前的旧事，可以这样一点一点，从人嘴里查出来。'
    ],
    choices: [{ label: '三日过去', do: THREE_DAYS }] }
];
const WEN_AFTER: Record<'win' | 'lose' | 'flee', StoryCard[]> = {
  win: [ending('鱼叉落地', [
    '你竹篙一磕，镖师手里的鱼叉脱手，当啷落在船板上。',
    '江伯这才开口：「够了。」',
    '镖师软软坐倒，捂着脸，肩头一耸一耸。卫衡的手一直按在剑上，没有拔出来。'
  ]), ...WEN_TAIL],
  lose: [ending('江伯收场', [
    '叉柄撞在你肋下，你踉跄着退到舱口。镖师又是一下递来，叉尖离你的喉头只剩一尺。',
    '竹篙在船板上轻轻一顿。江伯这才开口：「够了。」',
    '镖师手一软，那柄鱼叉当啷落在船板上，人跟着坐倒，捂着脸，肩头一耸一耸。卫衡的手一直按在剑上，没有拔出来。'
  ]), ...WEN_TAIL],
  flee: [ending('江伯收场', [
    '你抽身退到舱口。镖师没有追，只缩在船尾，手里的鱼叉仍旧抖个不停。',
    '江伯在灯下抬了抬眼：「够了。」只两个字，竹篙在船板上轻轻一顿，镖师的手便软了，那柄鱼叉当啷落在船板上。',
    '他软软坐倒，捂着脸，肩头一耸一耸。卫衡的手一直按在剑上，没有拔出来。'
  ]), ...WEN_TAIL]
};
const WEN_HOU: StoryDef[] = [
  hou('kp_wen_hou', WEN_AFTER.win, REVEAL_WEN, MSG_WEN.win),
  hou('kp_wen_hou_lose', WEN_AFTER.lose, REVEAL_WEN, MSG_WEN.lose),
  hou('kp_wen_hou_flee', WEN_AFTER.flee, REVEAL_WEN, MSG_WEN.flee)
];

/* ---------- 不渡：钱袋、江伯 ---------- */
const BU_TAIL: StoryCard[] = [
  { tag: '序章 · 第一夜', title: '钱袋',
    paras: [
      '钱袋还躺在船板上。你把它拾起来，沉甸甸的，倒出来，二十两银子底下，压着一块腰牌。牌子被血浸透了，摸上去还是黏的。',
      '江伯接过去，翻过来看了看背面，又抬眼看了你一眼，把牌子递还给你，什么也没说。'
    ],
    choices: [{ label: '收下腰牌', do: [{ type: 'item', id: 'kp_yaopai', delta: 1 }, { type: 'toast', text: '得到 血染的腰牌' }] }] },
  { tag: '序章 · 第一夜', title: '江伯',
    paras: [
      '二十两银子，江伯一两也没动，原样包好，压在船底。',
      '「你说不渡，我就没渡。」他把钱袋口扎紧，「这二十两，不是咱们的。」'
    ],
    choices: [{ label: '三日过去', do: THREE_DAYS }] }
];
const BU_AFTER: Record<'win' | 'lose' | 'flee', StoryCard[]> = {
  win: [ending('芦苇边', [
    '汉子手里的单刀被你磕飞，插在泥里嗡嗡作响。他啐了一口，捂着手腕，退进了夜色。',
    '水里那个人已经够着了岸，趴在滩上吐水，抬头把你看了很久，什么话也没说，爬起来钻进了芦苇。'
  ]), ...BU_TAIL],
  lose: [ending('芦苇边', [
    '汉子的刀背在你肩头一磕，你半边身子发麻，坐倒在泥里。他不再理你，涉水进了芦苇。',
    '水声响了一阵，他拎着一个湿透的人上来，像拎一只落水的狗，转眼便隐进了夜色。你坐在泥里，看着那堤上的刀痕，半晌才站起来。'
  ]), ...BU_TAIL],
  flee: [ending('江伯收场', [
    '你转身便跑，汉子的脚步声在背后追着，一步，两步。',
    '堤上忽然静了。你回头，江伯不知何时已站在那里，竹篙点在汉子的刀背上，只说了一句：「够了。」汉子看了他一眼，收刀，退进了夜色。',
    '芦苇荡里再没有水声。那个落水的人，再没有露头。'
  ]), ...BU_TAIL]
};
const BU_HOU: StoryDef[] = [
  hou('kp_bu_hou', BU_TAIL, REVEAL_BU, MSG_BU.stay),
  hou('kp_bu_hou_win', BU_AFTER.win, REVEAL_BU, MSG_BU.win),
  hou('kp_bu_hou_lose', BU_AFTER.lose, REVEAL_BU, MSG_BU.lose),
  hou('kp_bu_hou_flee', BU_AFTER.flee, REVEAL_BU, MSG_BU.flee)
];

const STORIES: StoryDef[] = [
  { id: 'p_open', cards: [
    { tag: '序章 · 瓜洲夜雨', title: '童年三忆',
      paras: ['江伯说，人这一辈子，记得住的事不多。', '你记得的，有这么三件。'],
      choices: [{ label: '回想' }] },
    { tag: '七岁', title: '风浪',
      paras: ['七岁那年，江伯第一次带你出船。船到江心，浪头一个接一个打上船帮。', '他在船尾掌舵，回头冲你喊了一句什么。风太大，你没听清。'],
      choices: [
        { label: '死死抱住桅杆', sub: '体魄 +3　根骨 +2', do: [{ type: 'attr', key: '体魄', delta: 3 }, { type: 'attr', key: '根骨', delta: 2 }],
          result: '你抱着桅杆，任凭浪头一次次打在身上，一声没吭。上岸后江伯摸着你的头说：「是块练武的料子，扛得住。」' },
        { label: '学着江伯的样子撑篙', sub: '身法 +3　踏雪无痕熟练 +50', do: [{ type: 'attr', key: '身法', delta: 3 }, { type: 'prof', skill: 'taxue', amount: 50 }],
          result: '你在摇晃的船头站稳了脚，一篙一篙撑得有模有样。江伯看了你半天，没说话，只是那天晚上多给你盛了一碗鱼汤。' },
        { label: '盯着浪头，默数它的节奏', sub: '悟性 +3', do: [{ type: 'attr', key: '悟性', delta: 3 }],
          result: '三个大浪之后，必有一个小浪。你喊出来的时候，江伯愣了一下，随即顺着那个空当，把船稳稳地带出了风口。' }
      ] },
    { tag: '十二岁', title: '恶少',
      paras: ['镇上王家的少爷踢翻了卖鱼阿婆的鱼篮，还要她跪下来一条一条捡。', '围观的人不少，没有一个上前。'],
      choices: [
        { label: '抡起扁担冲上去', sub: '胆魄 +4', do: [{ type: 'attr', key: '胆魄', delta: 4 }, { type: 'flag', flag: 'mem2_pole' }],
          result: '你被家丁按在地上揍了一顿，可那少爷的脑门上，也挨了你结结实实一扁担。' },
        { label: '绕到后面绊他一跤', sub: '身法 +1　悟性 +2', do: [{ type: 'attr', key: '身法', delta: 1 }, { type: 'attr', key: '悟性', delta: 2 }, { type: 'flag', flag: 'mem2_trip' }],
          result: '恶少摔了个狗啃泥，回头找人时，你早已钻进了人堆。' },
        { label: '去叫来巡检，当面对质', sub: '悟性 +2　侠义 +5　结识周巡检', do: [{ type: 'attr', key: '悟性', delta: 2 }, { type: 'xia', delta: 5 }, { type: 'flag', flag: 'mem2_patrol' }],
          result: '姓周的巡检秉公断了案，王家赔了阿婆一篮鱼钱。临走时，他记下了你的名字。' }
      ] },
    { tag: '十六岁', title: '剑光',
      paras: ['一个雨夜，你起身解手，看见江伯独自站在江边，手里握着一柄你从没见过的长剑。', '剑光起落之间，雨幕像被生生斩开，又在他身后合拢。', '你自己手里，只有江伯削的那柄木剑，白日里他叫你对着柳树比划，说剑要先学会拿，才配学着使。'],
      choices: [
        { label: '躲在暗处偷学', sub: '悟性 +2　寒江剑法熟练 +80', do: [{ type: 'attr', key: '悟性', delta: 2 }, { type: 'prof', skill: 'hanjiang', amount: 80 }],
          result: '你记下了七八式，回去在床上比划了一夜。第二天江伯看你的眼神有些古怪，却什么也没说。' },
        { label: '走出去，求他教你', sub: '胆魄 +2　寒江剑法熟练 +80', do: [{ type: 'attr', key: '胆魄', delta: 2 }, { type: 'prof', skill: 'hanjiang', amount: 80 }, { type: 'flag', flag: 'mem3_ask' }],
          result: '江伯沉默了很久，才道：「这剑法，本不该由我来教你。」可从那以后，每个雨夜，他都会带你到江边。' },
        { label: '回屋彻夜难眠，学着他平日的吐纳打坐', sub: '根骨 +2　寒江心法熟练 +80', do: [{ type: 'attr', key: '根骨', delta: 2 }, { type: 'prof', skill: 'xinfa', amount: 80 }],
          result: '不知过了多久，你觉得小腹里升起一缕暖意，顺着脊背缓缓流转。天亮时，你一点也不觉得困。' }
      ] },
    { tag: '名字', title: '你叫什么名字', input: 'name',
      paras: ['江伯说，你本姓沈。', '至于名字——'],
      choices: [{ label: '就叫这个名字' }] },

    // 第一夜（docs/kaipian.md）：卞婆婆、独臂镖师、卫衡、江伯一篙压剑
    { tag: '序章 · 第一夜', title: '一篙压住截江剑　半碗豆腐渡江人',
      paras: [
        '开春以后，江伯的咳嗽一天重过一天。',
        '白日渡人，他仍不肯让你撑船。到了晚上，却把竹篙丢给你，说往后饭不能白吃，明早先去东岸接卖豆腐的卞婆婆。',
        '她欠了三个月船钱。你问还接不接。',
        '江伯低头补着船篷：「她腿不好。」'
      ],
      choices: [{ label: '继续', do: [{ type: 'move', to: 'gz_pier' }, { type: 'time', until: 19 * 60 + 30 }] }] },
    { tag: '序章 · 第一夜', title: '岸边有人喊渡',
      paras: [
        '夜里，卞婆婆托人送来两块豆腐。你们刚端起碗，岸边有人喊渡。',
        '那人穿着镖师的短衣，右袖空荡荡的，左手攥着一只钱袋，指缝里渗出血来。',
        '「去哪里？」江伯问。',
        '「过江。」',
        '「十文。」',
        '那人把钱袋抛上船：「里头是二十两。」',
        '江伯没接。他看着那人的空袖子，看了半晌，才道：「这趟船，你坐不起。」'
      ],
      choices: [{ label: '继续', do: [{ type: 'time', add: 15 }] }] },
    { tag: '序章 · 第一夜', title: '卫衡',
      paras: [
        '岸上另有一个声音接了话：「他当然坐不起。」',
        '来人三十来岁，腰悬长剑，鞋帮上沾着新泥。他不上船，先朝江伯躬身行了一礼：「晚辈卫衡，替家父问江前辈安。」',
        '江伯把你的饭碗往里推了推：「你爹还活着？」',
        '「托前辈的福，还活着。只是右手再也拿不得剑了。」',
        '卫衡望向那独臂镖师：「这人知道当年那桩灭门案，是谁领的路。江前辈若要保他，请给晚辈一个道理。」',
        '那镖师忽然跪下，膝盖撞得船板一响：「我说，我什么都说。先让我过江。」',
        '江伯没有答话。'
      ],
      choices: [{ label: '继续' }] },
    { tag: '序章 · 第一夜', title: '一篙压剑',
      paras: [
        '卫衡的剑仍在鞘中。你却看见，系船的麻绳一股一股地断开。江上没有风。',
        '江伯伸出竹篙，轻轻压在绳上。岸边的泥水猛地翻起，卫衡退了半步。舱里那碗豆腐汤，连一道波纹也没有。',
        '你从没见过江伯这样撑船。',
        '「你爹教你的截江剑，」江伯道，「不是用来杀一个跪着的人的。」',
        '卫衡脸色发白，却站着没动：「家父也教过晚辈：有债必偿。」',
        '江伯缓缓收回竹篙：「这句，他教得对。」'
      ],
      choices: [{ label: '继续' }] },
    { tag: '序章 · 第一夜', title: '渡不渡',
      paras: [
        '他背在身后的左手，不知何时已把一样冰凉的东西塞进你掌心。是半块玉佩。「贴身收着。」他只说了这一句。',
        '然后，他第一次回过头来问你：',
        '「船是你的。这个人，你渡不渡？」'
      ],
      choices: [
        { label: '「渡。」', sub: '撑船离岸，听他说', do: [{ type: 'item', id: 'jade', delta: 1 }, { type: 'wear', id: 'jade' }, { type: 'flag', flag: 'kp_du' }, { type: 'xia', delta: 2 }, { type: 'story', id: 'kp_du' }] },
        { label: '「请二位上船，把话说清楚。」', sub: '拖住两边，查个明白', do: [{ type: 'item', id: 'jade', delta: 1 }, { type: 'wear', id: 'jade' }, { type: 'flag', flag: 'kp_wen' }, { type: 'xia', delta: 2 }, { type: 'story', id: 'kp_wen' }] },
        { label: '「不渡。」', sub: '把他留在岸上', do: [{ type: 'item', id: 'jade', delta: 1 }, { type: 'wear', id: 'jade' }, { type: 'flag', flag: 'kp_bu' }, { type: 'story', id: 'kp_bu' }] }
      ] }
  ] },

  /* ---------- 渡 ---------- */
  { id: 'kp_du', cards: [
    { tag: '序章 · 第一夜', title: '渡',
      paras: [
        '你拿起竹篙，点在码头的石阶上。船离了岸。',
        '江伯没有拦你。他站在码头上，一手扶着缆桩，咳了两声，看着船尾越走越远。',
        '卫衡没有追上船，却沿着江堤跟了一程。他走得不快，剑始终没有出鞘，目光一直落在那镖师的背上。'
      ],
      choices: [{ label: '继续', do: [{ type: 'time', add: 20 }] }] },
    { tag: '序章 · 第一夜', title: '镖师的话',
      paras: [
        '船到江心，镖师伏在舱板上，喘了好一阵，才开了口。',
        '他说，二十年前那个雨夜，他不过是受雇押镖的人，到了地头才知道事情不对。领路的人他没有看清脸，只记得那人给了他一袋银子，叫他闭嘴。',
        '「我当夜就走了，」他低着头，「出了庄门，再没回头。」',
        '你一边撑篙，一边把他的话一句一句记在心里。',
        '忽然，前头芦苇汊里水声大作。卫家的两个家丁抢了一条小划子，斜刺里冲出来，拦在船头。堤上的卫衡厉声喝了一句，那两人像是没有听见。',
        '「老爷的右手，就废在这个人一句话上！」'
      ],
      choices: [
        { label: '把船头偏向西汊口', sub: '认得水', do: [{ type: 'flag', flag: 'kp_qiantan' }, { type: 'fight', foe: 'kp_jiading' }],
          result: '西汊口有一片浅滩，涨潮时看不出来，船底擦过去，不过一寸。渡口长大的人，闭着眼都认得。\n先手在你：家丁的划子吃水深，一头搁了浅，脚下站不稳。' },
        { label: '横篙迎上去', do: [{ type: 'fight', foe: 'kp_jiading' }] }
      ] }
  ] },

  /* ---------- 请二位上船 ---------- */
  { id: 'kp_wen', cards: [
    { tag: '序章 · 第一夜', title: '请二位上船',
      paras: [
        '你把竹篙往船舷一横：「请二位上船，把话说清楚。」',
        '卫衡看向江伯。江伯没有说话，只微微点了点头。卫衡这才踏上跳板，剑仍旧连鞘握在手里。他上船时，船身几乎没有晃。',
        '那镖师缩在船头，一只手攥着衣襟，像是怕人看见什么。',
        '江伯在舱口坐下，把灯芯拨亮：「你们两个，一个一个说。」'
      ],
      choices: [{ label: '验他的旧伤', do: [{ type: 'time', add: 20 }] }] },
    { tag: '序章 · 第一夜', title: '旧伤',
      paras: [
        '你想起江伯常说，旧伤不会说谎。你请镖师解开衣襟。',
        '他右臂的断口早已长平，疤色发白，少说也有二十年。肩上另有一道刀痕，从锁骨斜劈到肋下，宽背厚刃，是单刀砍的。',
        '「那一夜，你在哪里？」你问。',
        '镖师张了张嘴：「我……我早就走了。」',
        '卫衡冷冷道：「走了的人，不会断臂。」',
        '镖师脸色一变，猛地起身，一把抄起船头的鱼叉，退到船尾，叉尖直抖。'
      ],
      choices: [
        { label: '反手松开船尾的缆绳', sub: '知道哪根缆绳一放船就打横', do: [{ type: 'flag', flag: 'kp_lan' }, { type: 'fight', foe: 'kp_biaoshi' }],
          result: '船尾的缆绳一松，船身顺着水势就要打横。你记着这个，是小时候被江伯骂出来的。\n先手在你：船一打横，他只剩一条臂膀，立不稳。' },
        { label: '够到码头上那口破钟，一槌敲下去', sub: '知道钟一响，谁会赶来', do: [{ type: 'flag', flag: 'kp_zhong' }, { type: 'fight', foe: 'kp_biaoshi' }],
          result: '码头上悬着一口破钟，平日只在起大雾时才敲。你探身够到钟槌，使足了力气。\n先手在你：钟声一响，老艄公提着桨会赶来帮手。' },
        { label: '抄起竹篙，架住他', do: [{ type: 'fight', foe: 'kp_biaoshi' }] }
      ] }
  ] },

  /* ---------- 不渡 ---------- */
  { id: 'kp_bu', cards: [
    { tag: '序章 · 第一夜', title: '不渡',
      paras: [
        '你把竹篙在船头一横，拦住了跳板：「不渡。」',
        '镖师愣住了，像是没听懂。他张了张嘴，又转头去看江伯。江伯垂着眼，没有看他。',
        '码头上响起卫衡的脚步声，不紧不慢。',
        '镖师忽然把钱袋往船板上一丢，转身扑通一声，跳进了江里。'
      ],
      choices: [{ label: '继续', do: [{ type: 'time', add: 10 }] }] },
    { tag: '序章 · 第一夜', title: '落水的人',
      paras: [
        '江面上只剩一圈圈散开的水纹。那人不会水，扑腾得很厉害，往下游的芦苇荡漂去。',
        '卫衡站在码头上，没有动。江伯也没有动。他们都在看你。'
      ],
      choices: [
        { label: '下水救他', sub: '体魄 +1', do: [{ type: 'attr', key: '体魄', delta: 1 }, { type: 'flag', flag: 'kp_jiu' }, { type: 'rel', npc: 'kp_chu', value: '相谈甚欢', note: '水里捞上来的命' }, { type: 'story', id: 'kp_bu_hou' }],
          result: '你把竹篙一抛，跃进江里。江水冷得像刀。你记得这一带江心有一道浅滩，脚下一探，果然踩实了。你抓住他的衣领，一寸一寸把他拖上滩。他吐出一口江水，趴在泥里看了你很久，什么话也没说，爬起来钻进了芦苇。' },
        { label: '沿着江堤追他', next: 2 },
        { label: '留在船上，陪着江伯', do: [{ type: 'story', id: 'kp_bu_hou' }],
          result: '你没有动。江伯也没有动。卫衡站在码头上，望着江面上那圈越散越大的水纹，望了很久，才转身走了。' }
      ] },
    { tag: '序章 · 第一夜', title: '堤下的人',
      paras: [
        '你拔脚沿着江堤追下去。镖师在水里扑腾，快漂进芦苇荡了。可堤下另有一个人，比你先到了芦苇边：一身短打，腰间挂着一块牌子，手里的刀已经出鞘。',
        '「这人我们要了。」他头也不回，「小娃娃，让开。」'
      ],
      choices: [
        { label: '抢先踏上那片浅滩', sub: '认得水', do: [{ type: 'flag', flag: 'kp_qiantan' }, { type: 'fight', foe: 'kp_zhuibing' }],
          result: '堤下有一片浅滩，涨潮时看不出来，你脚下一探，便踩实了。\n先手在你：汉子追上来，会一脚踩进烂泥。' },
        { label: '折回渡口，敲响那口破钟', sub: '知道钟一响，谁会赶来', do: [{ type: 'flag', flag: 'kp_zhong' }, { type: 'fight', foe: 'kp_zhuibing' }],
          result: '你转身往回跑。码头上悬着一口破钟，平日只在起大雾时才敲。你够到钟槌，使足了力气。\n先手在你：钟声一响，老艄公提着桨会赶来帮手。' },
        { label: '拦在他面前', do: [{ type: 'fight', foe: 'kp_zhuibing' }] }
      ] }
  ] },

  /* ---------- 第一夜之后，第二夜，天亮：每条路一场打，打赢、打输、逃开各接一张不同的卡 ---------- */
  ...DU_HOU,
  ...WEN_HOU,
  ...BU_HOU,

  // 跳过序章（docs/paiban.md A8）：也要取名，看一张三句话的前情，再去扬州
  { id: 'p_skip', endChapter: { small: '第一回', big: '扬州' }, cards: [
    { tag: '前情', title: '瓜洲夜雨',
      paras: [
        '你在瓜洲渡口长大，跟着江伯打鱼撑船，雨夜里偷看过他在江边练剑。',
        '一个独臂的镖师夜里求渡，江伯一篙压住了追来的剑客，把半块玉佩塞进你手里，问你渡不渡。三日后的雨夜，几条没点灯的船泊到渡口。',
        '天亮时，渡口的船只剩一副焦黑的骨架，江伯不见了，芦苇丛里只留下他的斗笠，和一页画着持剑小人的油布。有人托话：扬州，大明寺，了尘。你搭上了去扬州的船。'
      ],
      choices: [{ label: '往下' }] },
    { tag: '名字', title: '你叫什么名字', input: 'name',
      paras: ['江伯说，你本姓沈。', '至于名字——'],
      choices: [{ label: '就叫这个名字', next: -1 }] }
  ] },

  /* ---------- 旧序章（抓药 → 夜袭 → 江伯之死）：只给停在旧序章中途的存档接着玩，新开局不走到 ---------- */

  { id: 'p_night', cards: [
    { tag: '序章', title: '夜雨',
      paras: ['你推开虚掩的门——屋里一片狼藉。', '箱笼被翻了个底朝天，江伯倒在床边，嘴角挂着血。三个黑衣人正举着火折子四处搜寻。', '见你进来，离你最近的那个一言不发，拔出短刀便扑了上来！'],
      choices: [{ label: '拔剑迎敌', do: [{ type: 'fight', foe: 'heiyi' }], next: -1 }] }
  ] },

  { id: 'p_after1', cards: [
    { tag: '序章', title: '雁翎刀',
      paras: ['黑衣人栽倒在地，再也没有起来。你握剑的手在抖——这是你头一回杀人。', '你还没喘过气，屋梁上又落下一道黑影。这人身形高大，手提一柄雁翎刀，另外两个黑衣人立刻护到他身后。', '「小崽子，」他冷冷道，「把东西交出来。」'],
      choices: [{ label: '握紧长剑', do: [{ type: 'fight', foe: 'heiyi2' }], next: -1 }] }
  ] },

  { id: 'p_death', endChapter: { small: '第一回', big: '扬州' }, cards: [
    { tag: '序章', title: '江伯',
      paras: [
        '黑衣人走了。屋外的雨，下得正大。',
        '江伯靠在你怀里，气息越来越弱。他从怀里摸出半块用红绳系着的玉佩，又把一个油布包塞进你手里。',
        '「这一剑……叫断水……本该……由你爹……亲手教你……」',
        '「{given}……去扬州……大明寺……找了尘……」',
        '他攥紧你的手，用尽最后的力气：「别信……官府的人……」',
        '话音未落，那只手便垂了下去。'
      ],
      choices: [{ label: '江伯——' }] },
    // 江伯刚咽气：不挂「获得」的标签（docs/paiban.md A15，依据「金庸」）
    { tag: '序章', title: '江伯的遗物',
      paras: ['玉佩上刻着一个「沈」字，还有半个「寒」字，断口参差，另一半不知在何处。', '油布包里是一页剑谱，墨迹被水洇开了一半，只认得出「断水」二字，和一式剑招的起手。'],
      // 开局不给绝技（负责人 10-09：「开局就有绝技比较扯」）：残页只是一页残谱，断水要自己参悟（content/packs/core.ts 的 scroll）
      choices: [{ label: '掩埋江伯', do: [
        { type: 'item', id: 'jade', delta: 1 }, { type: 'item', id: 'scroll', delta: 1 }, { type: 'item', id: 'med', delta: -1 }
      ] }] },
    { tag: '序章', title: '天明',
      paras: [
        '天亮时，雨停了。',
        '你在江边的老柳树下堆起一座新坟，磕了三个头。小屋烧成了一片焦土——火是你亲手点的，那些人还会回来。',
        '黑衣首领逃走时，掉下了一块铜牌，上面铸着一个「厂」字。你把它和玉佩收在了一起。',
        '码头上，一条去扬州的船正要起锚。'
      ],
      choices: [
        { label: '登船 · 去扬州', next: -1, do: [
        { type: 'item', id: 'badge', delta: 1 },
        { type: 'quest', id: 'prologue', stage: 3 }, { type: 'chapter', value: 1 }, { type: 'shenfen', id: 'youxia' },
        { type: 'move', to: 'hu' }, { type: 'time', set: 9 * 60 + 20 }, { type: 'weather', value: '微雨' },
        { type: 'heal', hpAtLeast: 0.8, mp: 'full' },
        { type: 'rel', npc: 'jiangbo', value: '阴阳两隔' }, { type: 'rel', npc: 'liu', value: '素不相识' },
        { type: 'feedReset' },
        { type: 'feed', tag: '传闻', text: '城南的威远镖局正在招募镖师。' },
        { type: 'feed', tag: '传闻', text: '黑风寨劫了漕帮三船盐货，漕帮放出悬赏。' },
        { type: 'feed', tag: '主线', text: '江伯遗言：去扬州大明寺，找了尘大师。' },
        { type: 'quest', id: 'main1', stage: 0 }, { type: 'track', id: 'main1' }
      ] },
        { label: '在坟前再坐一会儿', if: { notFlag: 'p_fenqian' }, next: 2, do: [{ type: 'flag', flag: 'p_fenqian' }],
          result: '你在坟前坐了很久。江上起了雾，又散了，来来往往的船，没有一条是江伯的。你想起他补网时总哼的那支调子，哼了两句，哼不下去了。' }
      ] }
  ] }
];

const FOES: FoeDef[] = [
  /* ---------- 新开局：第一夜的三场打。对手都弱，主角不会死；打赢、打输、逃开各接一张不同的卡 ---------- */
  { id: 'kp_jiading', name: '卫家家丁', title: '抡着短棍的老仆', ini: '丁', tone: 'amber', weapon: '短棍', ws: '棍', tag: '序章',
    rank: 0, build: 'outer', weak: 0.55, firstTell: 2,
    moves: ['当头一棍', '横扫腰肋', '戳向心口'],
    flourish: ['短棍抡得呼呼作响', '骂声一句紧似一句', '棍头在船帮上敲得砰砰响'],
    tells: [
      { name: '拼命一棍', text: '家丁双手攥紧短棍，嘴里骂着「还我老爷的手来」，整个人都压在这一棍上……', dom: 'li', after: '棍子砸在船帮上，木屑乱飞！',
        judge: '你看出这一棍全是蛮力，抡得太满，收不回来。' }
    ],
    asides: ['堤上的卫衡又喝了一声，没有人听。', '江水拍着船帮，哗哗地响。'],
    opening: ['抡得太满', '棍头磕在船舷上', '骂得岔了气'],
    intro: '家丁把短棍往船帮上一磕：「老爷的右手，就废在这个人一句话上！今天谁也别想护他！」',
    tips: ['对手使出重招时，战斗会停下来，由你挑一种应对。看清他的招式再挑。'],
    prep: [
      { if: { flag: 'kp_qiantan' }, atk: 0.85, big: 0.85,
        text: '你把船头一偏，擦着浅滩边缘过去。家丁的划子吃水深，一头扎进烂泥里，两人跳下水来，脚下却站不稳。',
        story: '少年认得西汊口的浅滩，引着家丁的划子搁了浅。' }
    ],
    win: '家丁手里的短棍脱手，在甲板上滚了两滚。',
    lose: '你脚下一滑，肋下挨了一棍，疼得眼前发黑。',
    results: {
      win: { silent: true, do: [{ type: 'cure' }, { type: 'heal', hpAtLeast: 0.7 }], then: [{ type: 'story', id: 'kp_du_hou' }] },
      lose: { silent: true, do: [{ type: 'cure' }, { type: 'heal', hpAtLeast: 0.6 }], then: [{ type: 'story', id: 'kp_du_hou_lose' }] },
      flee: { silent: true, do: [{ type: 'cure' }, { type: 'heal', hpAtLeast: 0.7 }], then: [{ type: 'story', id: 'kp_du_hou_flee' }] }
    } },

  { id: 'kp_biaoshi', name: '独臂镖师', title: '走投无路的人', ini: '镖', tone: 'gray', weapon: '鱼叉', ws: '叉', tag: '序章',
    rank: 0, build: 'outer', weak: 0.55, firstTell: 2,
    moves: ['乱戳', '横拍', '直刺心窝'],
    flourish: ['单手攥着鱼叉直抖', '退一步，戳一下', '嘴里念着听不清的话'],
    tells: [
      { name: '拼命一刺', text: '镖师闭上眼，单手攥住鱼叉，朝你胸口直直捅来，像是除此以外，再没有别的法子……', dom: 'su', after: '叉尖钉进船板，震得他虎口发麻。',
        judge: '你看出这一叉没有章法，单臂使叉，劲全在肩上，是怕极了的人才这样刺。' }
    ],
    asides: ['卫衡的手按在剑柄上，没有拔出来。', '灯芯跳了一下，舱里的影子晃得厉害。'],
    opening: ['单臂使叉，收得慢', '叉头够不着舱壁', '脚跟蹭到了缆绳'],
    intro: '镖师退到船尾，鱼叉直抖：「我、我不是逃兵——」',
    tips: ['对手使出重招时，战斗会停下来，由你挑一种应对。看清他的招式再挑。'],
    prep: [
      { if: { flag: 'kp_lan' }, atk: 0.85, big: 0.85,
        text: '你反手松了船尾的缆绳。船身顺着水势猛地打横，镖师本就只有一条臂膀，脚下一滑，叉尖歪了。',
        story: '少年松了缆绳，船身打横，镖师站立不稳。' },
      { if: { flag: 'kp_zhong' },
        text: '破钟当当响了起来，哑得难听，却传得很远。岸上亮起了灯，老艄公提着船桨，沿着跳板冲了上来。',
        ally: { name: '老艄公', share: 0.25, at: [3, 7],
          say: ['老艄公抡起船桨，横着一拍，镖师手里的鱼叉歪到了一边。', '老艄公挥桨再拍，拍得镖师连退两步。'] },
        story: '破钟一响，渡口的老艄公提着桨赶来。' }
    ],
    win: '鱼叉脱手，当啷落在船板上。',
    lose: '叉柄撞在你肋下，你踉跄着退了两步。',
    results: {
      win: { silent: true, do: [{ type: 'cure' }, { type: 'heal', hpAtLeast: 0.7 }], then: [{ type: 'story', id: 'kp_wen_hou' }] },
      lose: { silent: true, do: [{ type: 'cure' }, { type: 'heal', hpAtLeast: 0.6 }], then: [{ type: 'story', id: 'kp_wen_hou_lose' }] },
      flee: { silent: true, do: [{ type: 'cure' }, { type: 'heal', hpAtLeast: 0.7 }], then: [{ type: 'story', id: 'kp_wen_hou_flee' }] }
    } },

  { id: 'kp_zhuibing', name: '持刀汉子', title: '腰挂牌子的人', ini: '汉', tone: 'red', weapon: '单刀', ws: '刀', tag: '序章',
    rank: 0, build: 'even', weak: 0.65, firstTell: 2,
    moves: ['劈', '撩', '横抹'],
    flourish: ['单刀在雨里划出一道白光', '脚下踩着江堤的烂泥', '不耐烦地一刀接一刀'],
    tells: [
      { name: '开山一刀', text: '汉子懒得多说，单刀高举过顶，对着你的肩头直劈下来……', dom: 'li', after: '刀锋砍进堤上的泥里，溅起一片泥点。',
        judge: '你看出这一刀是惯常的劈法，力气有，只是起手太直，一眼看得到底。' }
    ],
    asides: ['江风吹着芦苇，沙沙地响。', '水里的人已经不动了，不知是沉了，还是躲了。'],
    opening: ['刀劈得太直', '靴子陷进烂泥', '用力过猛'],
    intro: '汉子啐了一口：「不识抬举的小东西。」单刀一横，朝你逼来。',
    tips: ['对手使出重招时，战斗会停下来，由你挑一种应对。看清他的招式再挑。'],
    prep: [
      { if: { flag: 'kp_qiantan' }, atk: 0.85, big: 0.85,
        text: '你抢先一步踏上那片浅滩。汉子追上来，一脚踩进烂泥，陷到了膝盖。',
        story: '少年抢先踏上浅滩，汉子一脚陷进了烂泥。' },
      { if: { flag: 'kp_zhong' },
        text: '破钟当当响了起来，哑得难听，却传得很远。堤上亮起灯火，老艄公提着船桨，一路吆喝着赶来。',
        ally: { name: '老艄公', share: 0.25, at: [3, 7],
          say: ['老艄公抡起船桨，隔着几步远一桨扫过去，汉子往后一缩。', '老艄公又是一桨，拍在汉子的刀背上，震得他退了两步。'] },
        story: '破钟一响，渡口的老艄公提着桨赶来。' }
    ],
    win: '汉子手里的单刀被磕飞，插进泥里嗡嗡作响。',
    lose: '汉子刀背在你肩头一磕，你半边身子发麻，坐倒在泥里。',
    results: {
      // 打赢了，落水的人才有命爬上岸（旗标 kp_jiu：褚七在扬州出不出得来）
      win: { silent: true, do: [{ type: 'cure' }, { type: 'heal', hpAtLeast: 0.7 }, { type: 'flag', flag: 'kp_jiu' },
        { type: 'rel', npc: 'kp_chu', value: '相谈甚欢', note: '水里捞上来的命' }], then: [{ type: 'story', id: 'kp_bu_hou_win' }] },
      lose: { silent: true, do: [{ type: 'cure' }, { type: 'heal', hpAtLeast: 0.6 }], then: [{ type: 'story', id: 'kp_bu_hou_lose' }] },
      flee: { silent: true, do: [{ type: 'cure' }, { type: 'heal', hpAtLeast: 0.7 }], then: [{ type: 'story', id: 'kp_bu_hou_flee' }] }
    } },

  /* ---------- 旧序章的两场（黑衣人、黑衣首领）：同上，只给旧存档 ---------- */
  { id: 'heiyi', name: '黑衣人', title: '夜行人', ini: '黑', tone: 'gray', weapon: '短刀', ws: '刀', tag: '序章',
    rank: 0, build: 'outer', weak: 0.25, script: 'cup', firstTell: 3,
    moves: ['毒蛇吐信', '反手撩阴', '横抹咽喉'],
    flourish: ['贴身疾刺', '反手一抹', '刀光一闪'],
    tells: [
      { name: '夺命三刀', text: '黑衣人压低身形，短刀反握，脚下悄无声息地绕向你左侧……', dom: 'su', after: '刀锋划破了窗纸。' }
    ],
    asides: ['雨水从破了的屋顶漏下来，滴在江伯脸上。', '窗外的雨越下越大。'],
    opening: ['刀势一老', '脚下一滑', '收刀时身子一沉'],
    intro: '黑衣人一言不发，短刀已到胸前！',
    tips: ['战斗会自动进行，你来决定何时出招。内力够时，点「寒江孤影」。'],
    win: '黑衣人闷哼一声，栽倒在地，再也没有起来。',
    lose: '',
    results: { win: { silent: true, then: [{ type: 'story', id: 'p_after1' }] } } },

  { id: 'heiyi2', name: '黑衣首领', title: '腰悬铜牌', ini: '首', tone: 'red', weapon: '雁翎刀', ws: '刀', tag: '序章',
    rank: 2, script: 'rescue', firstTell: 2,
    moves: ['夜战八方', '雁落平沙', '斜劈华岳'],
    flourish: ['刀光如匹练', '挟着风雨横扫', '自上而下猛斩'],
    tells: [
      { name: '夜叉探海', text: '黑衣首领单手拖刀，刀尖在地上划出一串火星，猛地自下而上撩起……', dom: 'li', after: '桌椅被劈成了两半！' },
      { name: '鬼影迷踪', text: '黑衣首领身形一晃，竟在雨幕里拖出两道残影……', dom: 'su', after: '残影散去，墙上多了三道刀痕。' }
    ],
    asides: ['江伯倒在墙角，胸口微微起伏。', '屋顶漏下的雨水，顺着刀锋往下淌。', '另外两个黑衣人守在门口，一动不动。'],
    opening: ['刀势一老', '回刀稍慢', '用力过猛，身形一晃'],
    intro: '黑衣首领雁翎刀一摆：「小崽子，把东西交出来，留你全尸。」',
    tips: ['这人比刚才那个强得多。撑住！'],
    win: '',
    lose: '',
    results: { win: { silent: true, then: [{ type: 'story', id: 'p_death' }] } } }
];

const QUESTS: QuestDef[] = [
  { id: 'prologue', name: '序章 · 瓜洲夜雨', stages: [
    { title: '去看看江伯', to: 'gz_home', who: 'jiangbo', hint: '江伯这些日子咳得厉害，人也瘦了一圈。今天天阴得很低。' },
    { title: '去镇上回春堂抓药', to: 'gz_town', who: 'huichun', hint: '江伯要抓两副药，说回春堂的掌柜认得他。看这天色，夜里要下大雨，得快去快回。' },
    { title: '把药带回渡口小屋', to: 'gz_home', hint: '药抓好了，天色已晚，掌柜那几句话还在耳边。得赶回渡口小屋去。' },
    { title: '序章 · 完' }
  ] }
];

const ITEMS: ItemDef[] = [
  { id: 'kp_douli', name: '江伯的斗笠', kind: '信物', equip: { slot: '冠' }, desc: '一顶旧斗笠，竹篾被江风吹得发白，沿口磨得起了毛。你戴上去，大了一圈。' },
  { id: 'kp_yaopai', name: '血染的腰牌', kind: '信物', desc: '独臂镖师的钱袋里掉出来的腰牌，被血浸透了，摸上去还是黏的。牌面阴刻「黑风」两个字，背面另有一行小字：水路，丙。' },
  // 新开局的兵器（docs/kaipian.md 第三稿第四条）：真兵刃要到扬州花钱买。兵器位的剑，寒江剑法照样使得出来；比青锋剑不值钱（青锋剑一千五百文，它二十文）
  { id: 'kp_mujian', name: '木剑', kind: '装备', price: 20, desc: '江伯削的白蜡木剑，剑脊上留着刨刀的纹路，剑柄被你攥得发亮。对着柳树比划尽够。',
    equip: { slot: '兵器', weapon: '剑', reach: '短', grade: '凡品' } }
];

const pack: ContentPack = { stories: STORIES, foes: FOES, quests: QUESTS, items: ITEMS };
export default pack;
