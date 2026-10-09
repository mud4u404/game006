import type { ContentPack, NpcDef, QuestDef, RoomDef } from '../types';

/**
 * 扬州 · 汪家盐号（Issue #82）。画舫一案的后果在这里落地：
 * 汪少爷的报复、云娘的身契、汪家的体面，都接在 huafang 的各个 flag 上。只读它的 flag，不改它的文件。
 */

const ROOMS: RoomDef[] = [
  {
    id: 'yz_yanhao', name: '汪家盐号', area: '扬州城 · 东关', region: 'yz', t: 10, map: [80, 66],
    desc: '东关街东头最大的铺面，三开间门脸，匾上「汪家盐号」四个泥金大字。柜上算盘声不断，伙计扛着盐包进进出出，后院隐约有舂捣之声。',
    // 云娘不写在这里：她只在被架进盐号、还没交契时才在（at 带条件，审查 B01）
    npcs: ['yh_bizhang', 'yh_wanglaoye', 'yh_xinger', 'yh_menfang'],
    objs: ['yh_qixia', 'yh_zhangbu'],
    exits: [['西', 'cheng', '东']],
    road: '你沿东关街往东走到头，汪家盐号的金字招牌就在眼前……',
    onEnter: [
      { if: { flag: 'huafang_taken', notFlag: 'yh_taken_seen' },
        do: [
          { type: 'flag', flag: 'yh_taken_seen' }, { type: 'flag', flag: 'yh_seen' },
          { type: 'quest', id: 'side_yanhao', stage: 0 },
          { type: 'feed', tag: '江湖', text: '后院舂盐的女子，正是被汪家架上岸抵债的云娘。她的身契，锁在柜上那口契匣里。' }
        ] },
      { if: { notFlag: 'yh_seen' },
        do: [
          { type: 'flag', flag: 'yh_seen' },
          { type: 'feed', tag: '江湖', text: '东关街东头的汪家盐号，扬州盐商的头一份字号。柜上算盘声从早响到晚。' }
        ] }
    ]
  }
];

const NPCS: NpcDef[] = [
  {
    id: 'yh_bizhang', name: '毕掌柜', ini: '毕', tone: 'blue', brief: '拨着算盘',
    look: '五十来岁，一副精明相，算盘拨得飞快。腰上挂着一串钥匙，走路都不带响的——怕事的人，连钥匙都收得小心。',
    verbs: ['交谈', '观察', '赎人'],
    actions: {
      交谈: [
        { if: { flag: 'yh_freed' },
          text: '「公子……说好了的。」毕掌柜头都不敢抬，「契的事，谁也没见过。」' },
        { if: { quest: { id: 'side_yanhao', is: 1 }, flag: 'yh_zhangmu' },
          text: '你把账上那笔「漕上使费」轻轻放在柜台上，说要拿去给府衙的周捕头看看。毕掌柜脸色由白转青，颤着手开了契匣，取出一张身契：「公子，求你嘴下留情——这契，就当汪家积德放了的。」',
          do: [
            { type: 'flag', flag: 'yh_freed' }, { type: 'flag', flag: 'yh_guanbao' },
            { type: 'item', id: 'yh_shenqi', delta: 1 },
            { type: 'quest', id: 'side_yanhao', stage: 2 },
            { type: 'feed', tag: '江湖', text: '你把汪家账上的亏空轻轻放在柜台上。毕掌柜连夜放出了云娘的身契，只求你别去惊动府衙。' }
          ] },
        { if: { flag: 'huafang_taken', quest: { id: 'side_yanhao', is: 0 } },
          text: '你问起云娘的身契。毕掌柜眼皮都没抬：「身契？二十两。汪家的规矩，卖出去的人，想赎回去，也是这个数——一两都不能少。」',
          do: [{ type: 'quest', id: 'side_yanhao', stage: 1 }] },
        { if: { flag: 'yh_zhangmu' },
          text: '你把账上那笔「漕上使费」轻轻一点，毕掌柜的算盘停了：「客官，账上的事，看看就好。汪家的账，从来经得起查。」手却把账簿合上了。' },
        { if: { flag: 'huafang_pay' },
          text: '「利钱照收，一文不少。」毕掌柜拨了两颗算盘珠，「下期初三来交。汪家的账，从来不记错——也从来不会少记。」' },
        { if: { flag: 'huafang_nianhao' },
          text: '「我家少爷说了，扬州城里叫得出名号的，都是朋友。」话是客气话，眼睛可不客气。' },
        { text: '「客官买盐还是看账？盐不零卖，账不外示。」' }
      ],
      赎人: [
        { if: { flag: 'huafang_taken', notFlag: 'yh_freed', silver: 20000 },
          text: '毕掌柜点清银子，亲自开了契匣，双手把身契奉上：「汪家卖出去的人，头一回有人赎。老爷问起来……就说是汪家积德。」',
          do: [
            { type: 'silver', delta: -20000 },
            { type: 'flag', flag: 'yh_qianshu' }, { type: 'flag', flag: 'yh_freed' },
            { type: 'item', id: 'yh_shenqi', delta: 1 },
            { type: 'quest', id: 'side_yanhao', stage: 2 },
            { type: 'feed', tag: '江湖', text: '你花二十两银子，从汪家盐号赎出了云娘的身契。街坊都说，头一回见汪家松口。' }
          ] },
        { if: { flag: 'huafang_taken', notFlag: 'yh_freed' },
          text: '毕掌柜眼皮都没抬：「二十两。汪家的规矩，卖出去的人，想赎回去，也是这个数。」' },
        { text: '「赎人？赎谁？」毕掌柜合上账簿，「汪家的门，不是谁都能进。」' }
      ]
    }
  },
  {
    id: 'yh_wanglaoye', name: '汪老爷', ini: '汪', tone: 'purple', brief: '捻着佛珠',
    look: '圆领缎袍，手里一串油亮的佛珠。笑起来一团和气，笑到哪儿，伙计的头就低到哪儿。佛珠捻得飞快，像是怕停下来想事情。',
    verbs: ['交谈', '观察', '旧事'],
    actions: {
      交谈: [
        { if: { flag: 'yh_freed' },
          text: '「契都放出去了……家丑。」汪老爷闭着眼，佛珠捻得飞快，「你走吧。汪家不想再见到你。」' },
        { if: { flag: 'huafang_grudge' },
          text: '「打了我汪家的护院，还敢登门？」他拂袖起身，「来人——送客！我汪家做人做事，讲究个明来明往；暗地里动手的，不算好汉。」' },
        { if: { flag: 'huafang_nianhao' },
          text: '「犬子回来说，阁下是个人物。」他捻着佛珠，笑得一团和气，「年轻人，锋芒太露，不是好事。这扬州城啊……大得很。」' },
        { if: { flag: 'huafang_pay' },
          text: '「利钱收齐了，账上清清楚楚。」他掀了掀眼皮，「汪家做事，向来有体面。买汪家盐的人家，吃汪家盐的苦力，都夸汪家有体面。」' },
        { text: '「买盐？盐号做的是大买卖。」他摆摆手，「小客官，去看看粗盐罢。」' }
      ],
      观察: [{ text: '他袖口磨得发亮，佛珠却是真沉香。茶碗里的茶是凉的——坐了一上午，事没谈成，谁也不敢给他续水。' }],
      旧事: [
        { if: { flag: 'huafang_taken', notFlag: 'yh_freed', any: [{ flag: 'ly_maishen_exposed' }, { flag: 'ly_maishen_kind' }, { flag: 'ly_maishen_yanhao' }] },
          text: '你提起当年被撵出盐号、险些冻死在城门洞的老脚夫。汪老爷捻珠的手停了：「……陈年旧账。」半晌，他朝里屋喊：「毕掌柜！把该放的人放了——汪家不做绝事。」',
          do: [
            { type: 'flag', flag: 'yh_ya' }, { type: 'flag', flag: 'yh_freed' },
            { type: 'item', id: 'yh_shenqi', delta: 1 },
            { type: 'quest', id: 'side_yanhao', stage: 2 },
            { type: 'xia', delta: 2 },
            { type: 'feed', tag: '江湖', text: '你拿旧事压住了汪老爷。他为保体面放出了云娘的身契——汪家不做绝事，但汪家记账。' }
          ] },
        { if: { notFlag: 'yh_jiushi' },
          text: '「老脚夫的事……是我汪家亏了德行。」他闭了闭眼，「施主请回吧。」',
          do: [
            { type: 'flag', flag: 'yh_jiushi' },
            { type: 'xia', delta: 1 }
          ] },
        { text: '旧事提过了，汪老爷只当没听见，佛珠捻得更快了。' }
      ]
    }
  },
  {
    id: 'yh_xinger', name: '杏儿', ini: '杏', tone: 'amber', brief: '低头擦壶',
    look: '十四五岁的小丫鬟，袖口冻得通红。擦壶擦得极认真，眼睛却机灵，什么都在看。',
    verbs: ['交谈', '观察'],
    actions: {
      交谈: [
        { if: { flag: 'huafang_taken' },
          text: '杏儿声音压得极低：「后院那个新来的，白天舂盐，夜里哭。」她左右看了看，「她的身契锁在契匣里，钥匙在掌柜腰上——可那匣子的锁，是老爷亲手开的。」' },
        { if: { flag: 'huafang_grudge' },
          text: '「少爷这几日使钱雇闲汉，在东关街堵生面孔呢。」她声音更低，「公子出入，绕着走。」' },
        { if: { flag: 'huafang_pay' },
          text: '「利钱收了……可账上下一期又记上了。」杏儿叹口气，「这盐号啊，利滚利，没有头。」' },
        { if: { flag: 'huafang_nianhao' },
          text: '「少爷回来摔了茶盅，说扬州城有人压他一头。」杏儿吐吐舌头，「这几日，谁也不敢惹他。」' },
        { text: '「盐号的规矩，卖进来的丫头，命就是汪家的。」她把壶擦得锃亮，「我们做丫头的，少听，少看，少说。」' }
      ]
    }
  },
  {
    id: 'yh_menfang', name: '门房', ini: '门', tone: 'red', brief: '堵着门',
    look: '膀大腰圆，眼里精光，是拿钱办事的护院把式。倚着门框嗑瓜子，瓜子皮吐了一地。',
    verbs: ['交谈', '观察'],
    actions: {
      交谈: [
        { text: '「我家老爷交代了，见了你这份面相的，就关门。」他把瓜子皮吐在地上，「不过嘛——做生意的门，也碍不着你从街上瞅两眼。」' }
      ]
    }
  },
  {
    id: 'yh_yunniang', name: '云娘', ini: '云', tone: 'jade', brief: '舂着盐',
    look: '粗布衣裳，袖口挽到肘弯，腕上有一道旧琴弦勒出的细痕。舂盐的木杵举得稳，眼睛却一直望着墙头那一角天。',
    at: { room: 'yz_yanhao', if: { flag: 'huafang_taken', notFlag: 'yh_yun_done' } },
    verbs: ['交谈', '交契'],
    actions: {
      交谈: [
        { if: { flag: 'yh_freed' },
          text: '云娘直起身，手在围裙上擦了又擦：「契的事，掌柜的都说了……公子，契一日不在我自己手里，奴家一日不敢信这是真的。」' },
        { text: '她把木杵放轻了些，声音压得极低：「公子别看奴家。汪家的院子，墙高。」木杵又重重落了下去。' }
      ],
      交契: [
        { if: { item: { id: 'yh_shenqi', atLeast: 1 } },
          text: '你把身契展开，当着她的面念了一遍，然后连纸带印，放进她手里。云娘捏着那张纸，手指抖得捏不拢，半晌，朝着你直挺挺跪了下去。你把她扶起来，她朝着北方磕了三个头：「奴家回泰州老家去，给我爹上坟——把这张契，在坟前烧给他看。」',
          do: [
            { type: 'item', id: 'yh_shenqi', delta: -1 },
            { type: 'flag', flag: 'yh_yun_done' },
            { type: 'xia', delta: 2 },
            { type: 'quest', id: 'side_yanhao', stage: 3 },
            { type: 'feed', tag: '江湖', text: '你把云娘的身契原样交到了她手里。她要回泰州给爹上坟，把这张契在坟前烧了。' }
          ] },
        { text: '你手里没有那张身契。契匣还锁在柜上，钥匙在毕掌柜腰上。' }
      ]
    }
  },
  {
    id: 'yh_qixia', name: '契匣', obj: true, icon: 'door', brief: '黄铜锁',
    look: '柜上一口黑漆契匣，黄铜锁擦得锃亮。听说汪家卖出去的身契，都锁在这匣子里。',
    verbs: ['观察', '细看', '撬锁'],
    actions: {
      细看: [
        { if: { flag: 'huafang_taken', notFlag: 'yh_freed' },
          text: '黄铜锁，钥匙在毕掌柜腰上。匣缝里透出纸张的边角——墨迹新，像是新立的身契，画押的名字你瞧着眼熟。',
          do: [{ type: 'quest', id: 'side_yanhao', stage: 1 }] },
        { text: '匣子上着锁，不知道里头锁着什么。' }
      ],
      撬锁: [
        { if: { flag: 'huafang_taken', notFlag: 'yh_freed', hour: { from: 19, to: 5 }, attr: { key: '身法', atLeast: 26 } },
          text: '夜里你摸到柜前，一根铁签探进锁孔——身法够快，簧片轻轻一让，锁开了。身契到手，匣子照原样摆好，没人察觉。',
          do: [
            { type: 'flag', flag: 'yh_tou' },
            { type: 'flag', flag: 'yh_freed' },
            { type: 'item', id: 'yh_shenqi', delta: 1 },
            { type: 'quest', id: 'side_yanhao', stage: 2 },
            { type: 'feed', tag: '江湖', text: '夜里你撬开汪家盐号的契匣，取出了云娘的身契。匣子照原样摆好——可汪家的账，迟早要对一遍。' }
          ] },
        { if: { flag: 'huafang_taken', notFlag: 'yh_freed', hour: { from: 19, to: 5 } },
          text: '夜里你摸到柜前，铁签刚探进锁孔，手上一滑，「哗啦」一声带翻了柜边的算盘。前堂的灯亮了，你翻窗而走——后半夜，汪家加了双岗。',
          do: [
            { type: 'flag', flag: 'yh_caught' },
            { type: 'eming', delta: 5 },
            { type: 'feed', tag: '江湖', text: '你夜里撬汪家的契匣失了手。汪家加了双岗，四下里说盐号进了贼——你的名声，也跟着脏了一层。' }
          ] },
        { if: { flag: 'huafang_taken', notFlag: 'yh_freed' },
          text: '大白天撬汪家的契匣？你还没疯到这个地步。要动手，也得等夜里。' },
        { text: '匣子上着锁，与你无干。' }
      ]
    }
  },
  {
    id: 'yh_zhangbu', name: '账簿', obj: true, icon: 'stele', brief: '摊在柜上',
    look: '一本摊开的流水账，墨迹新旧不一，有几页折了角。',
    verbs: ['细看'],
    actions: {
      细看: [
        { if: { flag: 'huafang_taken', quest: { id: 'side_yanhao', below: 1 } },
          text: '你逐行看下去：盐引、船脚、官牙钱，笔笔清楚。只有一笔「漕上使费」月月三千两，去向不明——东支西绌，全靠各处的利钱填着。',
          do: [
            { type: 'flag', flag: 'yh_zhangmu' },
            { type: 'quest', id: 'side_yanhao', stage: 1 }
          ] },
        { if: { notFlag: 'yh_zhangmu' },
          text: '你逐行看下去：盐引、船脚、官牙钱，笔笔清楚。只有一笔「漕上使费」月月三千两，去向不明。',
          do: [{ type: 'flag', flag: 'yh_zhangmu' }] },
        { text: '那笔去向不明的「漕上使费」，你已记在了心里。' }
      ]
    }
  }
];

const QUESTS: QuestDef[] = [
  { id: 'side_yanhao', name: '支线 · 汪家身契', stages: [
    { title: '打听云娘的身契' },
    { title: '查出汪家的软处' },
    { title: '身契有了着落' },
    { title: '身契交到云娘手里' }
  ] }
];

const pack: ContentPack = {
  rooms: ROOMS,
  npcs: NPCS,
  quests: QUESTS,
  items: [
    { id: 'yh_shenqi', name: '云娘的身契', kind: '信物', desc: '汪家盐号开出的卖身契，朱印齐全。攥在手里，就是攥着一个人的命。', hidden: true }
  ],
  news: [
    { if: { flag: 'yh_freed' },
      text: '东关街汪家盐号连夜放出一纸身契，掌柜说是汪老爷积德。知情人都笑：汪老爷最怕的从来不是缺德，是官司。' },
    { if: { flag: 'yh_tou' },
      text: '汪家盐号闹了贼，契匣被撬了个空。汪老爷发了话：家贼难防。' },
    { if: { flag: 'yh_qianshu' },
      text: '有人花二十两银子，从汪家盐号赎出一纸身契。街坊都说，头一回见汪家松口。' },
    { if: { flag: 'yh_yun_done' },
      text: '汪家盐号后院舂盐的女子走了，说是回泰州老家。走那天，她在东关街口给一位佩剑的年轻人磕了个头，惊动了半条街。' },
    { if: { flag: 'huafang_grudge' },
      text: '东关街上新添了几条闲汉，见着生面孔就咋呼，说是拿钱办事，替人出气。' }
  ]
};

export default pack;
