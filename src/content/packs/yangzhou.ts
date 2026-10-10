import type { ContentPack, Effect, FightResult, FoeDef, NpcDef, QuestDef, RoomDef } from '../types';

/** 第一回 · 扬州 */

const BOSS_HERE = { quest: { id: 'main1', is: 1 }, notFlag: 'boss' };

/**
 * 了尘头一回见新开局的玩家（旗标 kp_xin，江伯生死未卜）：先白给一层，再说屠千山。
 * 白给的：江伯是他旧识；那一夜找到瓜洲渡口的人，是冲着寒江的旧账去的，不是冲着你。
 * 屠千山是一条线（那夜江上泊过黑风寨的船），不是价钱：截住他，便是顺着那夜的线往下找。旧存档的文字在后面，一字没动
 */
const liaochenXin = (tail: string): string =>
  '了尘大师看见你腰间那半块玉佩，扫帚停在半空，良久才道：「江老三……终究还是动了那柄剑么。」他把扫帚靠在树上，缓缓道：「他是老衲的旧识。那一夜找到瓜洲渡口的人，是冲着寒江的旧账去的，不是冲着你。」他看了看你头上的斗笠，「他留话叫你来找老衲，是信得过老衲。可他如今人在哪里，老衲也说不准。」他顿了顿，「线头倒有一条：那夜江上泊过黑风寨的船。寨主屠千山这些日子霸着运河渡口，那三船盐是漕帮兄弟半年的血汗。施主去截住他，便是顺着那夜的线往下找。」他又道：「不必急在今日。那人刀下没有庸手，' + tail + '」';
const LIAOCHEN_XIN_DO: Effect[] = [
  { type: 'rel', npc: 'liaochen', value: '点头之交', from: ['素不相识'], note: '江伯留下的话，让你来找他' }, { type: 'quest', id: 'main1', stage: 1 },
  { type: 'feed', tag: '主线', text: '了尘大师说，那夜江上泊过黑风寨的船。去运河渡口截住黑风寨主屠千山，是顺着那夜的线往下找。' }, { type: 'toast', text: '主线更新' }
];
/** 入夜：街市、码头上的人回家了（RoomDef.nightQuiet，engine/world.ts 的 NIGHT_HOME） */
const NIGHT_H = { from: 21, to: 5 };

const ROOMS: RoomDef[] = [
  { id: 'hu', name: '瘦西湖畔', area: '扬州 · 瘦西湖', region: 'yz', t: 0, map: [50, 50], nightQuiet: true,
    desc: [
      { if: { hour: NIGHT_H }, text: '湖上起了夜雾，茶棚收了，条凳倒扣在桌上。只有湖心的画舫还挂着几盏灯笼，丝竹声断断续续飘过来。石桥上空无一人。' },
      { text: '垂柳如烟，画舫在细雨中缓缓靠岸。茶棚里三个佩刀汉子压低声音说着什么；石桥那头，一个青衫书生撑伞而立，似在等人。' }
    ],
    npcs: ['caobang', 'liu'], objs: ['bei'],
    exits: [['北', 'daming'], ['东', 'dukou'], ['南', 'cheng'], ['西', 'jinshan']],
    road: '你折回湖畔，柳丝拂过肩头……' },
  { id: 'daming', name: '大明寺', area: '扬州 · 蜀冈', region: 'yz', t: 30, map: [50, 14],
    desc: [
      { if: { hour: NIGHT_H }, text: '古寺掩了山门，只有大殿里一盏长明灯。蜀冈上风大，古木在黑暗里沙沙地响，禅房那头传来一两声木鱼。' },
      { text: '古寺依冈而建，晨钟初歇，香烟缭绕。平山堂前古木参天，一位白眉老僧正不疾不徐地扫着石阶上的落花。' }
    ],
    npcs: ['liaochen', 'zhike'], exits: [['南', 'hu']],
    road: '你沿着湖堤向北，拾级登上蜀冈……' },
  { id: 'dukou', name: '运河渡口', area: '扬州 · 东关', region: 'yz', t: 15, map: [79, 50], nightQuiet: true,
    desc: [
      // 夜里：脚夫、船夫都回去了，屠千山也回了船上
      { if: { hour: NIGHT_H, ...BOSS_HERE },
        text: '夜里的渡口只剩几点灯火。黑篷快船还泊在漕船边上，船头有人抱着刀守夜；码头上的盐包用油布盖着，屠千山回船上歇了。要截他，得等天亮他上岸。' },
      { if: { hour: NIGHT_H }, text: '夜里的渡口只剩几点灯火，漕船一条挨一条泊着，船篷里有人打鼾。缆桩边的脚夫都散了，只有运河水拍着石阶。' },
      { if: BOSS_HERE, text: '运河上帆樯林立，三条漕船被几艘黑篷快船团团围住。一个虬髯大汉立在码头当中，手按鬼头刀，正吆喝喽啰往岸上搬盐包。' },
      // 码头空出来以后（packs/shishi-yangzhou.ts）：不管它，西舵占了码头；插手的，各有各的样子
      { if: { shi: { id: 'ss_matou', at: ['qi'] } }, text: '码头上又热闹起来，可脚夫们卸货时都不说话，三三两两地往北头瞟：那里多了几个生面孔，抱着胳膊，什么活也不干。' },
      { if: { shi: { id: 'ss_matou', at: ['duizhi'] } }, text: '码头像被人从当中劈成了两半：北头几十个短打汉子守着盐包，领头的是个精瘦的黄脸汉子；南头是东舵的人，老管事也在里头。脚夫们蹲在远处，谁也不敢上工。' },
      { if: { shi: { id: 'ss_matou', at: ['huobing'] } }, text: '码头上的血还没冲干净，缆桩边扔着几把卷了刃的刀。北头的西舵人多了一倍，东舵的人缩在南头的船上，伤号躺了一排。' },
      { if: { shi: { id: 'ss_matou', at: ['xiduo'] } }, text: '码头归了西舵。焦五的人守着跳板，过一回船先交二十文。北头堆着些没有盐引的麻包，用油布盖得严严实实。' },
      { if: { shi: { id: 'ss_matou', at: ['dongduo'] } }, text: '东舵的旗子插回了缆桩上，码头上又热闹起来。老管事背着手在跳板边转悠，见了你，远远就拱手。' },
      { if: { shi: { id: 'ss_matou', at: ['tiaoting'] } }, text: '码头当中钉了一根木桩，桩上刻着「东」「西」两个字。白天东舵的船靠南头，夜里西舵的船靠北头，各走各的。' },
      { if: { shi: { id: 'ss_matou', at: ['guanfu'] } }, text: '码头口新搭了一座税棚，府衙的税吏坐在棚下记账。漕帮两舵的人都不大来了，脚夫少了一半。' },
      { if: { flag: 'boss' }, text: '码头上又热闹起来，脚夫们扛着盐包来来往往。几个船夫蹲在缆桩边，一见你便笑着招手。' },
      { text: '运河上帆樯林立，漕船首尾相接。码头上脚夫扛着盐包来来往往，几个船夫蹲在缆桩边，不时朝江面张望。' }
    ],
    npcs: [{ id: 'tu', if: BOSS_HERE }, 'chuanfu', 'guanshi'], exits: [['西', 'hu']],
    road: '你穿过几条小巷，河风里带着咸腥的盐味……' },
  { id: 'cheng', name: '东关街', area: '扬州城', region: 'yz', t: 15, map: [50, 86], nightQuiet: true,
    desc: [
      // 夜里（packs/shishi-yangzhou.ts 的更夫、黑影只在夜里出来）
      { if: { hour: { from: 21, to: 5 }, shi: { id: 'ss_zei', at: ['qi', 'bang'] } },
        text: '店铺都上了门板，只有望江楼还亮着灯。药铺后墙新钉了几块木板，掌柜说接连几夜遭了贼。更夫的梆子声从巷子那头远远传来。' },
      { if: { hour: { from: 21, to: 5 } }, text: '店铺都上了门板，长街上黑漆漆的，只有望江楼还亮着灯。更夫的梆子声从巷子那头远远传来。' },
      { if: { hour: { from: 18, to: 21 } }, text: '天擦黑了，店铺陆续上了门板。街角说书的场子已经散了，听说说书人晚上在望江楼接着说。' },
      { if: { shi: { id: 'ss_zei', at: ['qi', 'bang'] } },
        text: '青石长街两旁店铺林立，绸缎庄、药铺、酒楼的幌子在细雨里轻轻摇晃。药铺掌柜站在门口骂街，说昨夜又丢了药；街角的说书人拿这事编了段子，引得众人哄笑。' },
      { if: { shi: { id: 'ss_zei', at: ['zhuo'] }, flag: 'ss_zei_fang' },
        text: '青石长街两旁店铺林立。街坊们还在说那个挨了板子的孩子。你想起那夜龙王庙后头草棚里的咳嗽声。' },
      { text: '青石长街两旁店铺林立，绸缎庄、药铺、酒楼的幌子在细雨里轻轻摇晃。街角一个说书人正讲到精彩处，引得众人连声叫好。' }
    ],
    npcs: ['yaopu', 'xiaoer'], exits: [['北', 'hu']],
    road: '你穿过高高的城门洞，市声渐渐近了……' },
  // 负责人 10-09「场景不许像派出所审犯人」：房牙子、布庄掌柜、跑腿的阿七从东关街挪进东圈门
  { id: 'yz_dongquan', name: '东圈门', area: '扬州城 · 东关街北', region: 'yz', t: 5, map: [70, 92], nightQuiet: true,
    desc: [
      { if: { hour: NIGHT_H }, text: '圈门洞里黑魆魆的，两边的高墙挡住了月光，深院里偶尔一声狗叫。巷子尽头挂着一盏灯笼，照着谁家门上的一对铜环。' },
      { text: '东关街往北一拐，穿过一道砖砌的老圈门，便是东圈门。巷子窄窄的，两边高墙深院，墙头探出几枝枇杷、几丛修竹。巷口一家布庄半开着门板，过往的多是住在里头的人家。' }
    ],
    npcs: [], exits: [['街', 'cheng', '巷']],
    road: '你从东关街往北一拐，钻进了老圈门的门洞……' },
  { id: 'jinshan', name: '小金山', area: '瘦西湖 · 湖心', region: 'yz', t: 10, map: [20, 50], nightQuiet: true,
    desc: [
      { if: { hour: { from: 21, to: 5 } }, text: '湖心岛上黑沉沉的，风亭里没有灯。石桌上那局残棋还摆着，棋子叫夜露打湿了，泛着微光。四下里只有湖水拍岸的声音。' },
      { text: '湖心小岛上亭台错落，风亭立在山顶，凭栏可望尽一湖烟雨。亭中石桌上摆着一局残棋，一个老人对着棋盘出神。' }
    ],
    npcs: ['qichi'], objs: ['canqi'], exits: [['东', 'hu']],
    road: '你搭上一条小船，橹声欸乃，向湖心划去……' }
];

const NPCS: NpcDef[] = [
  { id: 'caobang', name: '佩刀汉子', count: 3, ini: '佩', tone: 'red', brief: '神色警惕',
    look: '三人腰牌上都刻着一个「漕」字，刀鞘磨得发亮，显然常年刀口舔血。',
    verbs: ['交谈', '观察', '请教', '切磋', '赠礼', '偷窃'],
    actions: {
      交谈: [
        { if: { flag: 'huafang_good' }, text: '一人朝湖心画舫努了努嘴，压低声音：「汪家那小子这几日不敢上船了，听说是叫一位少侠治的。」另一人瞥了你一眼，端起茶碗，不再言语。' },
        { if: { flag: 'huafang_force_lose' }, text: '一人冷笑道：「前几日有个愣头青上画舫替那歌女出头，叫汪家护院打得爬不起来。」说着上下打量你，似笑非笑。' },
        { if: { flag: 'boss' }, text: '三人一见是你，连忙起身抱拳：「原来是渡口那位少侠！先前多有得罪。」' },
        { text: '其中一人瞪了你一眼：「漕帮的事，少打听。」另一人低声嘀咕：「三船盐啊……帮主非剥了我们的皮不可。」' }
      ],
      请教: [{ text: '「请教？」那汉子嗤笑一声，「老子只会砍人。」' }],
      切磋: [{ text: '三人对视一眼，手按刀柄：「今天没空陪你玩。」' }],
      偷窃: [{ text: '你还没靠近，三人已同时转过头来，目光像刀子一样。你讪讪地走开了。' }]
    } },
  { id: 'liu', name: '青衫书生', altName: { if: { flag: 'liuName' }, name: '柳寒舟' }, ini: '书', tone: 'jade',
    brief: '撑伞而立', hint: '似身负武功',
    look: '步履轻盈，伞沿滴水不沾衣。伞柄比寻常的长了半尺，像是藏着什么。',
    gift: '柳寒舟一怔，接过杏花，轻声道：「……多谢。」',
    likes: ['flower'],
    verbs: ['交谈', '观察', '请教', '切磋', '赠礼', '偷窃'],
    actions: {
      交谈: [
        { if: { yue: 'liu_again' },
          text: '柳寒舟果然撑伞立在石桥边，见你来了，笑了笑：「兄台守信。」他抽出伞中剑，把那天赢你的几剑一招招放慢了拆给你看：哪一剑是虚的，哪一剑该硬接，哪一剑该退。拆完，他收剑入伞：「这几剑，柳某只拆给守约的人看。」',
          do: [{ type: 'yueDone', id: 'liu_again' }, { type: 'flag', flag: 'liuName' },
            { type: 'rel', npc: 'liu', value: '知交', from: ['点头之交', '相谈甚欢'], note: '守了三日之约，他把剑招拆给你看' },
            { type: 'prof', skill: 'hanjiang', amount: 120 }, { type: 'lilian', amount: 80 },
            { type: 'feed', tag: '江湖', text: '你守了柳寒舟的三日之约。他把赢你的那几剑，一招招拆给你看。' }] },
        // 问剑只问一回（审查 A29）
        // 约期还没到：他记着（审查 G37：原来又从头自我介绍一遍）
        { if: { yueAhead: 'liu_again' },
          text: '柳寒舟撑着伞，看了你一眼，笑道：「兄台心急了。说好三日，就是三日——那几剑，柳某也还要再想想怎么拆给你看。」' },
        { if: { flag: 'liu_saw_hanjiang', notFlag: 'liu_wenjian' },
          text: '柳寒舟收了伞，看了你许久：「兄台渡口那一剑……是跟谁学的？」不等你回答，他又笑了笑：「当我没问。改日请兄台喝酒。」',
          do: [{ type: 'flag', flag: 'liuName' }, { type: 'flag', flag: 'liu_wenjian' }] },
        { if: { flag: 'liu_wenjian' }, text: '柳寒舟倚着伞看湖：「那顿酒还欠着。等哪天湖上的雨停了，柳某做东。」' },
        { if: { quest: { id: 'main1', is: 1 }, flag: 'tu_liu' }, text: '「兄台哪天去渡口，柳某哪天到。」柳寒舟只说了这一句。' },
        { if: { quest: { id: 'main1', is: 1 }, rel: { npc: 'liu', is: ['相谈甚欢', '知交'] } },
          text: '柳寒舟听你说起渡口的事，伞尖在青石上轻轻一点：「屠千山？柳某正想去看看热闹。」他抬眼看你，笑意却没到眼底：「兄台动手那天，算我一个。」',
          do: [{ type: 'flag', flag: 'tu_liu' }, { type: 'feed', tag: '主线', text: '柳寒舟说，你去渡口那天，他也去。' }, { type: 'toast', text: '柳寒舟愿去渡口掠阵' }] },
        { if: { flag: 'boss' }, text: '柳寒舟收了伞，笑道：「渡口那一剑，扬州城都传遍了。改日再请兄台喝酒。」',
          do: [{ type: 'flag', flag: 'liuName' }, { type: 'rel', npc: 'liu', value: '点头之交', from: ['素不相识'] }] },
        { text: '书生收了伞，拱手道：「在下柳寒舟。听闻黑风寨近日在运河上屡屡劫船，兄台若要去渡口，千万小心。」',
          do: [{ type: 'flag', flag: 'liuName' }, { type: 'rel', npc: 'liu', value: '点头之交', from: ['素不相识'] }] }
      ],
      请教: [{ text: '柳寒舟微微一笑：「剑法讲究以静制动。对手招式用老之时，便是破绽所在——到时莫要犹豫。」' }],
      切磋: [{ do: [{ type: 'flag', flag: 'liuName' }, { type: 'fight', foe: 'liu' }] }],
      偷窃: [{ text: '你的手刚探向他的钱袋，柳寒舟手腕一翻，已轻轻扣住你的脉门：「兄台，这可不是君子所为。」',
        do: [{ type: 'rel', npc: 'liu', value: '心存芥蒂' }] }]
    } },
  { id: 'huagu', name: '卖花姑娘', ini: '花', tone: 'amber', brief: '挎着花篮',
    // 作息：天亮出来卖花，天黑回家
    at: { room: 'hu', if: { hour: { from: 6, to: 18 } } },
    look: '十五六岁年纪，篮里是新折的杏花，还带着雨水。',
    gift: '姑娘扑哧一笑：「公子，这本来就是我的花呀。」',
    likes: ['flower'],
    verbs: ['交谈', '观察', '购买', '赠礼'],
    actions: {
      交谈: [{ text: '「公子，买枝杏花吧？三文钱一枝，送人最好不过。」' }],
      购买: [
        { if: { silver: 3 }, text: '姑娘挑了枝开得最好的递给你：「公子拿好。」（银两 −3 文）',
          do: [{ type: 'silver', delta: -3 }, { type: 'item', id: 'flower', delta: 1 }, { type: 'toast', text: '杏花 +1' }] },
        { text: '你摸了摸钱袋，空空如也。' }
      ]
    } },
  { id: 'bei', name: '石碑', obj: true, icon: 'stele', brief: '字迹斑驳',
    look: '碑上刻着「寒江」二字，笔力雄健，像是以剑代笔刻成。落款处被人用利器划去了。',
    verbs: ['观察', '细看'],
    actions: {
      细看: [
        { if: { notFlag: 'bei' }, text: '你凑近细看，划痕之下隐约还能辨出一个「沈」字……你心头一跳。',
          do: [{ type: 'flag', flag: 'bei' }, { type: 'feed', tag: '江湖', text: '湖畔石碑的落款下，竟刻着一个「沈」字。' }] },
        { text: '你凑近细看，划痕之下隐约还能辨出一个「沈」字……你心头一跳。' }
      ]
    } },
  // 住在寺里，夜里也在（禅房）
  { id: 'liaochen', name: '了尘大师', ini: '尘', tone: 'gray', brief: '白眉老僧', night: true,
    look: '须眉皆白，扫地时步子不疾不徐，落叶却都自己往簸箕里飘。',
    gift: '了尘大师合十一笑：「阿弥陀佛，拈花一笑，施主有心了。」',
    likes: ['flower'],
    verbs: ['交谈', '观察', '请教', '赠礼'],
    actions: {
      交谈: [
        // 新开局：先白给一层（江伯是他旧识，那夜的人冲着旧账来的），再把屠千山说成一条线，不是价钱
        { if: { quest: { id: 'main1', is: 0 }, item: { id: 'jade' }, flag: 'kp_xin', any: [{ item: { id: 'kp_mujian' } }] },
          text: liaochenXin('施主腰间那柄木剑，拿去会他的鬼头刀，还是先换一柄真的罢。'),
          do: LIAOCHEN_XIN_DO },
        { if: { quest: { id: 'main1', is: 0 }, item: { id: 'jade' }, flag: 'kp_xin' },
          text: liaochenXin('施主先掂一掂自己的斤两。'),
          do: LIAOCHEN_XIN_DO },
        { if: { quest: { id: 'main1', is: 0 }, item: { id: 'jade' } },
          text: '了尘大师看见你腰间那半块玉佩，扫帚停在半空，良久才道：「江老三……终究还是走了么。」他双手合十：「黑风寨主屠千山这些日子霸着运河渡口，那三船盐是漕帮兄弟半年的血汗。施主若能截住他，老衲便把你想知道的事，原原本本说给你听。」他看了看你握剑的手，又道：「不必急在今日。那人刀下没有庸手，施主先掂一掂自己的斤两。」',
          do: [{ type: 'rel', npc: 'liaochen', value: '点头之交', from: ['素不相识'], note: '江伯临终让你来找他' }, { type: 'quest', id: 'main1', stage: 1 },
            { type: 'feed', tag: '主线', text: '了尘大师托你：前往运河渡口，截住黑风寨主屠千山。' }, { type: 'toast', text: '主线更新' }] },
        { if: { quest: { id: 'main1', is: 0 } },
          text: '了尘大师放下扫帚，双手合十：「施主来得正好。黑风寨主屠千山这些日子霸着运河渡口，那三船盐是漕帮兄弟半年的血汗……老衲出家人，不便动手。」',
          do: [{ type: 'rel', npc: 'liaochen', value: '点头之交', from: ['素不相识'], note: '江伯留下的话，让你来找他' }, { type: 'quest', id: 'main1', stage: 1 },
            { type: 'feed', tag: '主线', text: '了尘大师托你：前往运河渡口，截住黑风寨主屠千山。' }, { type: 'toast', text: '主线更新' }] },
        // 渡口一剑怎么赢，不止闭门苦练一条路：知彼、帮手、练手（docs/story.md 第一回）
        { if: { quest: { id: 'main1', is: 1 }, any: [{ flag: 'tu_scar' }, { flag: 'tu_allies' }, { flag: 'tu_liu' }] },
          text: '了尘大师听你说了这几日的事，点了点头：「施主这几日没有白走。江湖上的本事，原本就不全在剑上。」他想了想，又道：「屠千山刀法刚猛，莫与他硬拼。他刀势一老，便是你出手的时候。」' },
        // 在渡口输过一场，被船夫背上山来：了尘先说这一场（审查 A19）
        { if: { quest: { id: 'main1', is: 1 }, flag: 'tu_bai', notFlag: 'lc_bai' },
          text: '了尘大师替你换了药，慢慢道：「船夫背你上山时，你嘴里还念着『刀势一老』。」他把药碗搁下，「刀接不住，便别接。一个人打不过，便去找肯帮你的人。」',
          do: [{ type: 'flag', flag: 'lc_bai' }] },
        // 寒江剑法练到炉火纯青，单打才有五六成；融会贯通时只有四成，话不能说早了（审查 A19）
        { if: { quest: { id: 'main1', is: 1 }, realm: { skill: 'hanjiang', below: 3 } },
          text: '了尘大师伸出两指，在你腕上轻轻一搭，摇了摇头：「施主脚下虚浮，剑上也没有火候。屠千山那口鬼头刀，一刀能劈开青石，你此刻单枪匹马去，是送命。」他拾起扫帚，慢慢道：「江湖上的本事，不全在剑上。渡口的船夫天天看他卸货，漕帮的人恨他入骨，湖边那位撑伞的书生，剑也不在你之下。看不透他，便去问看得透的人；一个人打不过，便去找肯帮你的人。」' },
        { if: { quest: { id: 'main1', is: 1 } }, text: '了尘大师打量你几眼，点了点头：「剑上有火候了，可以去试一试。屠千山刀法刚猛，莫与他硬拼。他刀势一老，便是你出手的时候。」' },
        { text: '「阿弥陀佛。施主仗义出手，漕帮兄弟会记住的。至于湖畔那块石碑……日后再说吧。」' }
      ],
      请教: [
        // 有条件、有代价（负责人 10-08）：了尘不白教。替漕帮截住了屠千山，他才肯领你进禅房调息
        { if: { flag: 'boss', notFlag: 'lc_tiaoxi' },
          text: '了尘大师领你进了禅房，与你盘膝对坐：「渡口那一仗，你是拼着一口气赢的，气到如今还乱着。江老三的心法本是好的，只是你练得太急，气都浮在胸口。」他教你气沉丹田、意随气走。一炷香下来，你只觉周身暖洋洋的，丹田里多了一缕若有若无的气息。（寒江心法熟练 +120）',
          do: [{ type: 'flag', flag: 'lc_tiaoxi' }, { type: 'prof', skill: 'xinfa', amount: 120 }, { type: 'time', add: 60 },
            { type: 'rel', npc: 'liaochen', value: '相谈甚欢', from: ['点头之交'] }, { type: 'toast', text: '寒江心法熟练 +120' }] },
        { text: '「对敌之时，莫问他用的是什么招，要问自己练成了什么。轻功好，便避其锋芒；内力足，便硬碰硬；剑法精，便以巧破拙。修为到了，自然看得出哪一条路最稳。」' }
      ]
    } },
  { id: 'zhike', name: '知客僧', ini: '僧', tone: 'gray', brief: '双手合十',
    look: '年纪尚轻，眉目和善，袈裟洗得发白。',
    verbs: ['交谈', '观察'],
    actions: { 交谈: [
      // 夜里不说「在平山堂前扫地」（审查 A28）
      { if: { hour: { from: 19, to: 5 } }, text: '知客僧提着灯笼开了角门：「施主夜里来，可是有急事？师叔在禅房，还没歇。」' },
      { text: '「施主请随意参拜。了尘师叔在平山堂前扫地呢。」' }
    ] } },
  { id: 'tu', name: '屠千山', ini: '屠', tone: 'red', brief: '黑风寨主', hint: '黑风寨主 · 首领',
    look: '身高八尺，虬髯如戟，鬼头刀背上九个铁环叮当作响。左臂缠着旧伤的布条。',
    verbs: ['交谈', '观察', '动手'],
    actions: {
      交谈: [
        { if: { flag: 'tu_bai' }, text: '屠千山咧开嘴笑了：「又是你？上回是船夫背你走的——这回谁背？」' },
        { text: '屠千山斜眼打量你：「哪来的雏儿？滚远点，别耽误老子卸货！」' }
      ],
      观察: [
        { if: { notFlag: 'tu_saw_arm' },
          text: '你在缆桩后看了半晌。他抡刀吆喝喽啰时，左臂总比右臂慢上半拍，布条底下隐隐渗着血。这伤不是新的，却一直没好利索。',
          do: [{ type: 'flag', flag: 'tu_saw_arm' }] },
        { text: '左臂的布条又换过了，还是渗着血。' }
      ],
      动手: [{ do: [{ type: 'fight', foe: 'tu' }] }]
    } },
  { id: 'chuanfu', name: '船夫', ini: '船', tone: 'blue', brief: '蹲在缆桩边',
    look: '黝黑的脸膛，一双手全是老茧，正闷头抽着旱烟。',
    verbs: ['交谈', '观察'],
    actions: { 交谈: [
      { if: { shi: { id: 'ss_matou', at: ['duizhi', 'huobing'] } }, text: '「两舵要打起来了，客官离码头远些。」船夫把烟锅往鞋底一磕，「刀子不长眼。」' },
      { if: { shi: { id: 'ss_matou', at: ['xiduo'] } }, text: '「过一回船二十文，焦五定的。」船夫往北头啐了一口，「屠千山劫船，焦五收钱，换汤不换药。」' },
      { if: { shi: { id: 'ss_matou', at: ['dongduo'] } }, text: '「东舵的旗子又插回来了！」船夫咧嘴直笑，「客官坐船，我给您留个靠窗的铺。」' },
      { if: { shi: { id: 'ss_matou', at: ['tiaoting'] } }, text: '「白天南头，夜里北头，倒也相安无事。」船夫慢悠悠地抽着烟。' },
      { if: { shi: { id: 'ss_matou', at: ['guanfu'] } }, text: '「税棚一搭，船家倒要先养活官老爷。」船夫闷头抽烟，不再说话。' },
      { if: { flag: 'boss' }, text: '「托您的福，码头又能开船了！」船夫把烟锅往船帮上磕了磕，「往后客官坐船，挑最稳的那条。」' },
      // 自己看出了他左臂的旧伤，也还没听过来历的：先讲来历（审查 A16）
      { if: { quest: { id: 'main1', is: 1 }, flag: 'tu_saw_arm', notFlag: 'tu_chuanfu' },
        text: '船夫往码头当中瞟了一眼，压低声音：「你也瞧见他那条左臂了？去年腊月，他在瓜洲劫我们老帮主的船，老帮主一根分水刺扎穿了他左臂，他是跳江逃的。」他磕了磕烟锅：「那伤落了根。他那口鬼头刀，双手抡起来的时候，左边总要慢半分。」',
        do: [{ type: 'flag', flag: 'tu_scar' }, { type: 'flag', flag: 'tu_chuanfu' }, { type: 'feed', tag: '主线', text: '船夫说：屠千山左臂有旧伤，双手抡刀时左边慢半分。' }, { type: 'toast', text: '探得屠千山的软肋' }] },
      { if: { quest: { id: 'main1', is: 1 }, flag: 'tu_scar' }, text: '「记住了，往他左边走。」船夫闷头抽烟，不再多说。' },
      { if: { quest: { id: 'main1', is: 1 } }, text: '「客官打听那姓屠的？」船夫闷头抽烟，「我一个撑船的，什么都没看见。」他的眼睛却往码头当中那人身上瞟了一下。' },
      { text: '「客官要坐船？去瓜洲的客船，二十文一位。」船夫把缆绳往桩上又绕了一道。' }
    ] } },
  { id: 'guanshi', name: '漕帮管事', altName: { if: { flag: 'tu_with_allies' }, name: '撑篙的老管事' }, ini: '漕', tone: 'blue', brief: '愁眉不展',
    look: '四十来岁，算盘别在腰后，袖口沾着盐粒。',
    verbs: ['交谈', '观察', { verb: '请他帮忙', if: { quest: { id: 'main1', is: 1 }, xia: 20, notFlag: 'tu_allies' } }],
    actions: {
      交谈: [
        // 带着漕帮兄弟打赢的：管事违了帮主的令，丢了差事
        { if: { flag: 'tu_with_allies', notFlag: 'paid' },
          text: '管事的算盘不在腰后了。他苦笑一声：「帮主撤了我的管事，叫我回船上撑篙。」他从怀里摸出一串钱塞给你：「这是我自己的一点心意。三船盐回来了，兄弟们的血汗没白流，值。」（银两 +100 文）',
          do: [{ type: 'flag', flag: 'paid' }, { type: 'silver', delta: 100 }, { type: 'rel', npc: 'guanshi', value: '相谈甚欢', note: '渡口一战，他违了帮主的令，带兄弟替你截住喽啰' }, { type: 'toast', text: '银两 +100 文' }] },
        { if: { flag: 'boss', notFlag: 'paid' }, text: '管事一揖到地：「恩公！这是漕帮的一点心意，万望收下。」（银两 +100 文）',
          do: [{ type: 'flag', flag: 'paid' }, { type: 'silver', delta: 100 }, { type: 'rel', npc: 'guanshi', value: '相谈甚欢', note: '你斗败屠千山，夺回了漕帮的三船盐' }, { type: 'toast', text: '银两 +100 文' }] },
        // 码头空出来以后（packs/shishi-yangzhou.ts）
        { if: { shi: { id: 'ss_matou', at: ['qi'] } },
          text: '管事望着北头那几个生面孔，眉头拧成了疙瘩：「西舵的人。屠千山一倒，焦五就盯上了这块码头。他跟盐号走得近，码头落到他手里，夜里就要走私盐了。」' },
        { if: { shi: { id: 'ss_matou', at: ['duizhi'] } },
          text: '「焦五带人占了北头，说码头是西舵打下来的。」管事咬着牙，「打下来？屠千山是少侠打跑的！帮主远在淮安，管不到这头。」他看着你，欲言又止：「少侠说一句话，焦五兴许肯听。」' },
        { if: { shi: { id: 'ss_matou', at: ['huobing'] } },
          text: '管事胳膊上缠着布，血渗了出来：「昨夜火并，东舵折了三个兄弟。再拖两天，码头就是焦五的了。」' },
        { if: { shi: { id: 'ss_matou', at: ['xiduo'] } },
          text: '管事坐在船头，算盘也不打了：「码头归了西舵，东舵的船过一回也要给焦五交钱。」他苦笑一声，「少侠哪天要替兄弟们出这口气，焦五就在码头上。」' },
        { if: { shi: { id: 'ss_matou', at: ['dongduo'] } },
          text: '「东舵的兄弟都记着少侠。」管事拍着胸口，「往后在运河上行船，报东舵的名号便是。」' },
        { if: { shi: { id: 'ss_matou', at: ['tiaoting'] } },
          text: '「东一半，西一半。」管事叹了口气，又笑了，「总比见血强。少侠这份面子，两舵都记着。」' },
        { if: { shi: { id: 'ss_matou', at: ['guanfu'] } },
          text: '管事看你的眼神有些复杂：「官府插了一手，码头谁也没占着，税倒先收上了。」他顿了顿，「听说，是有人去府衙报的信。」' },
        { if: { flag: 'tu_with_allies' }, text: '「撑篙也挺好。」他笑了笑，「运河上的事，我照样替你打听。」' },
        { if: { flag: 'boss' }, text: '「恩公以后在运河上行船，报漕帮的名号便是。」' },
        { if: { quest: { id: 'main1', is: 1 }, flag: 'tu_allies' }, text: '管事朝盐包那边努努嘴：「兄弟们都在后头候着。少侠一动手，我们就截住那帮喽啰。」' },
        { if: { quest: { id: 'main1', is: 1 }, xia: 20 },
          text: '管事把你拉到盐包后面，声音压得极低：「少侠这几日在扬州做的事，我都听说了，是个信得过的。实不相瞒，帮主不许我们动手，黑风寨背后有人，帮主惹不起。」他咬了咬牙：「可那是兄弟们半年的血汗。少侠若肯出头，我偷偷叫上十几个兄弟，替你截住那帮喽啰。只是事后帮主怪罪下来，我这管事怕是做不成了。」' },
        { if: { quest: { id: 'main1', is: 1 } }, text: '「那姓屠的就在码头上……三船盐，是兄弟们半年的血汗啊。」他上下打量你一眼，像是还想说什么，终究摇了摇头：「扬州城里，谁也不认得少侠啊。」' },
        { text: '「黑风寨劫了我们三船盐，帮主正发愁呢。」' }
      ],
      请他帮忙: [
        { text: '管事重重点了点头，把算盘往腰后一别：「好！少侠哪天动手，我们哪天在盐包后头候着。」',
          do: [{ type: 'flag', flag: 'tu_allies' }, { type: 'feed', tag: '主线', text: '漕帮管事答应违了帮主的令，带兄弟替你截住黑风寨的喽啰。' }, { type: 'toast', text: '漕帮兄弟愿助你一臂之力' }] }
      ]
    } },
  { id: 'shuoshu', name: '说书人', ini: '说', tone: 'purple', brief: '醒木一拍',
    // 作息：白天在东关街街角，晚上在望江楼，夜深了回家
    at: [{ room: 'cheng', if: { hour: { from: 7, to: 18 } } }, { room: 'cheng_tavern', if: { hour: { from: 18, to: 23 } } }],
    look: '一袭旧长衫，折扇上题着「江湖夜雨」四个字。',
    verbs: ['交谈', '观察', '打赏'],
    actions: {
      交谈: [
        { if: { quest: { id: 'main1', is: 2 }, flag: 'bei' }, text: '说书人醒木一拍：「列位看官！{story}」满堂喝彩。说到要紧处，满堂的人都朝你这边看过来。',
          do: [{ type: 'quest', id: 'main1', stage: 3 }, { type: 'feed', tag: '主线', text: '「寒江旧案」第一回完。湖畔石碑上的「沈」字，又是怎么回事？' }, { type: 'toast', text: '第一回 · 完' }] },
        // 没看过湖畔石碑的，不提石碑（审查 A23）
        { if: { quest: { id: 'main1', is: 2 }, flag: 'kp_xin' }, text: '说书人醒木一拍：「列位看官！{story}」满堂喝彩。说到要紧处，满堂的人都朝你这边看过来。',
          do: [{ type: 'quest', id: 'main1', stage: 3 }, { type: 'feed', tag: '主线', text: '「寒江旧案」第一回完。江伯的下落，你还没有头绪。' }, { type: 'toast', text: '第一回 · 完' }] },
        { if: { quest: { id: 'main1', is: 2 } }, text: '说书人醒木一拍：「列位看官！{story}」满堂喝彩。说到要紧处，满堂的人都朝你这边看过来。',
          do: [{ type: 'quest', id: 'main1', stage: 3 }, { type: 'feed', tag: '主线', text: '「寒江旧案」第一回完。江伯临终那几句话，你还没想明白。' }, { type: 'toast', text: '第一回 · 完' }] },
        { if: { flag: 'boss' }, text: '说书人冲你挤挤眼：「少侠的段子，小老儿每天要讲三场。」' },
        { text: '说书人醒木一拍：「上回说到，华山派两位长老为争掌门之位，在玉女峰上斗了三天三夜……」' }
      ],
      打赏: [
        { if: { silver: 5 }, text: '说书人眉开眼笑，凑过来压低声音：「{news}」（银两 −5 文）', do: [{ type: 'silver', delta: -5 }, { type: 'news' }] },
        { text: '你摸了摸钱袋，空空如也。' }
      ]
    } },
  { id: 'yaopu', name: '药铺掌柜', ini: '药', tone: 'jade', brief: '拨着算盘',
    look: '精瘦的老头，药柜上百个抽屉，他闭着眼也能抓对。',
    verbs: ['交谈', '观察', '购买', '买跌打酒', '买内伤药'],
    actions: {
      // 治重伤的药（engine/shang.ts）：重伤自己好不了，看伤贵，带两服药在身上便宜些
      买跌打酒: [
        { if: { silver: 60 }, text: '掌柜从架上取下一小坛跌打酒：「揉在伤处，揉到发热为止。手脚上的重伤，一坛轻一级。」（银两 −60 文）',
          do: [{ type: 'silver', delta: -60 }, { type: 'item', id: 'dieda', delta: 1 }, { type: 'toast', text: '跌打酒 +1' }] },
        { text: '「跌打酒六十文一坛。」掌柜把坛子放回架上。' }
      ],
      买内伤药: [
        { if: { silver: 80 }, text: '掌柜数出一包丸药，用油纸裹好：「温水送服，一日一服。内息的重伤，一服轻一级。」（银两 −80 文）',
          do: [{ type: 'silver', delta: -80 }, { type: 'item', id: 'neishang', delta: 1 }, { type: 'toast', text: '内伤药 +1' }] },
        { text: '「内伤药八十文一包。」掌柜把药包收了回去。' }
      ],
      交谈: [
        // 东关街夜里闹贼（packs/shishi-yangzhou.ts）
        { if: { shi: { id: 'ss_zei', at: ['qi', 'bang'] } }, text: '「昨夜又丢了两包药！专挑治咳嗽的拿，你说这贼是不是有病？」掌柜把算盘拍得山响，「金疮药二十文一包，看好了再买。」' },
        { if: { shi: { id: 'ss_zei', at: ['zhuo'] } }, text: '掌柜叹了口气：「贼拿住了，是个孩子，偷药给他娘治咳嗽。二十板子……早知道，我送他两副也就是了。」' },
        { if: { shi: { id: 'ss_zei', at: ['songguan'] } }, text: '「是少侠拿住的那个贼？」掌柜看了你一眼，没再往下说，低头拨算盘，「金疮药，二十文一包。」' },
        { if: { shi: { id: 'ss_zei', at: ['huanle'] } }, text: '「少侠替那孩子赔了药钱，老朽脸上发烧。」掌柜从柜里取出一包药推过来，「他娘的方子，老朽另配了一副，劳烦少侠带给阿七，不收钱。」' },
        { text: '「金疮药，二十文一包，止血生肌，童叟无欺。」' }
      ],
      购买: [
        { if: { silver: 20 }, text: '掌柜麻利地包好一包金疮药递过来。（银两 −20 文）',
          do: [{ type: 'silver', delta: -20 }, { type: 'item', id: 'jcy', delta: 1 }, { type: 'toast', text: '金疮药 +1' }] },
        { text: '「客官，二十文，一文都不能少。」' }
      ]
    } },
  { id: 'xiaoer', name: '酒楼小二', ini: '二', tone: 'amber', brief: '肩搭白巾',
    look: '手脚麻利，眼睛滴溜溜地转，什么消息都瞒不过他。',
    verbs: ['交谈', '观察'],
    actions: { 交谈: [
      { if: { flag: 'boss' }, text: '「哎哟，这不是渡口那位少侠嘛！今儿个的醉蟹，算小店请的！」' },
      { text: '「客官里边请！今儿个有新到的醉蟹，配上一壶花雕，美得很！」' }
    ] } },
  { id: 'qichi', name: '棋痴', ini: '棋', tone: 'amber', brief: '对着残棋发呆',
    look: '鹤发童颜，手里捏着一枚白子，半个时辰没落下去。',
    verbs: ['交谈', '观察', '请教'],
    actions: {
      交谈: [
        { if: { quest: { id: 'side_caoshangfei', is: 1 }, notFlag: 'csf_clue1' },
          text: '老人头也不抬：「缺指头的后生？前几夜借了我的小船，说是往茱萸湾去。」他终于落下一子：「船到今天还没还。你要是见着他，叫他划回来。」',
          do: [{ type: 'flag', flag: 'csf_clue1' }, { type: 'feed', tag: '江湖', text: '棋痴说，缺指的汉子借了他的小船，往茱萸湾去了。茱萸湾在运河渡口东北。' }] },
        { text: '老人头也不抬：「这局『雁回』残谱，三十年没人解得开。」' }
      ],
      请教: [
        { if: { flag: 'qichi' }, text: '「去去去，别挡着我的光。」' },
        // 残局里藏着剑意：悟性够、见识够（历练）的人才悟得出来，还要对着棋盘熬上半日
        { if: { notLearned: 'jinghong', canLearn: 'jinghong' }, text: '老人指着棋盘：「这一子，退一步，海阔天空。」你盯着那局残棋，从晌午看到日头偏西，三道剑光忽然在眼前连成一线——你竟从棋局里悟出了一套剑法。',
          do: [{ type: 'flag', flag: 'qichi' }, { type: 'time', add: 240 }, { type: 'learn', skill: 'jinghong', realm: 0, prof: 120 }] },
        { if: { notLearned: 'jinghong' }, text: '老人指着棋盘：「这一子，退一步，海阔天空。」你盯着那局残棋看了一个时辰，只看得黑白交错，眼睛发酸。老人头也不抬：「看不懂，就是火候没到。悟性不够的看一辈子也是棋；悟性够了，还得在江湖上碰过壁，才认得出棋里的剑。」',
          do: [{ type: 'time', add: 120 }] },
        { text: '老人指着棋盘：「这一子，退一步，海阔天空。」你望着那局残棋，忽觉「惊鸿照影」的第三剑，原来可以先退后进。',
          do: [{ type: 'flag', flag: 'qichi' }, { type: 'prof', skill: 'jinghong', amount: 120 }] }
      ]
    } },
  { id: 'canqi', name: '残棋', obj: true, icon: 'go', brief: '黑白交错',
    look: '黑子大龙被困，却在角上留着一手「倒脱靴」的余味。看得久了，竟像是三道剑光。',
    verbs: ['观察'], actions: {} }
];

const LIU_REL: Effect = { type: 'rel', npc: 'liu', value: '相谈甚欢', from: ['素不相识', '点头之交'], note: '湖畔切磋，不打不相识' };
const LIU_YIELD: FightResult = {
  tag: '切磋', title: '收剑认输', story: '柳寒舟收剑入伞，拱手道：「承让。兄台若有兴致，改日再来。」',
  do: [{ type: 'prof', skill: 'hanjiang', amount: 20 }], button: '回到湖畔'
};

const FOES: FoeDef[] = [

  { id: 'tu', name: '屠千山', title: '黑风寨主', ini: '屠', tone: 'red', weapon: '鬼头刀', ws: '刀', tag: '首领战',
    rank: 1.5, build: 'outer',
    moves: ['开山式', '横扫千军', '乌云盖顶', '黑虎掏心'],
    flourish: ['自上而下劈落', '拦腰横斩', '挟着风声斜劈', '刀光霍霍，连环砍出'],
    tells: [
      { name: '力劈华山', text: '屠千山双手握刀高举过顶，浑身骨节噼啪作响……', dom: 'li', after: '地上青石崩裂！' },
      { name: '黑风断魂刀', text: '屠千山连退三步，深吸一口气，刀身隐隐泛起黑光……', dom: 'li', after: '黑气激荡，码头上的灯笼齐齐熄灭！' },
      { name: '连环夺命刀', text: '屠千山刀尖虚晃，脚下碎步连踩，刀势忽左忽右……', dom: 'su', after: '七八道刀光交织成网！' }
    ],
    asides: ['码头上的脚夫们远远围着，大气不敢出。', '「好！」船夫们齐声喝彩。', '漕帮管事攥紧了拳头：「打得好！」', '几个黑风寨喽啰握着刀，却没一个敢上前。'],
    opening: ['刀势一老', '收刀稍慢', '用力过猛，身形一晃', '回刀时手腕一滞'],
    intro: '屠千山「呸」地吐了口唾沫，鬼头刀一抖，九个铁环哗啦作响：「找死！」',
    // 渡口一剑不止单挑一条路：知彼、帮手、掠阵，各有代价（docs/story.md 第一回）
    prep: [
      { if: { flag: 'tu_scar' }, atk: 0.85, big: 0.85,
        text: '你记着他左臂那道旧伤，专往屠千山左边走。他双手抡刀时，左臂果然慢了半分。',
        story: '少年早已看破他左臂有旧伤，招招专攻其左。' },
      { if: { flag: 'tu_allies' },
        text: '一声呼哨，十几条漕帮汉子从盐包后头闪出来，把黑风寨的喽啰截在码头另一头。漕帮管事提着一挂铁锚链，冲你点了点头：「少侠只管动手，我们给你掠阵！」',
        ally: { name: '漕帮', share: 0.25, at: [2, 7, 12],
          say: [
            '盐包后头一声呼哨，七八条漕帮汉子挺着竹篙扑上来，乱篙齐下。屠千山挥刀格开，腿上还是挨了两篙。',
            '漕帮管事抡起铁锚链，「哗啦」一声缠住鬼头刀的刀背，硬生生把屠千山拖了个趔趄！',
            '几个漕帮汉子把渔网兜头撒下，屠千山一刀劈开，肩头又结结实实挨了一篙。'
          ] },
        story: '漕帮十几条汉子从盐包后头杀出，截住了黑风寨的喽啰。',
        win: [{ type: 'flag', flag: 'tu_with_allies' }, { type: 'feed', tag: '江湖', text: '渡口一战，漕帮伤了三个兄弟。管事违了帮主的令，怕是要受罚。' }] },
      { if: { flag: 'tu_liu' },
        text: '柳寒舟撑着伞立在缆桩上，冲你一笑：「说好了来看热闹，柳某从不食言。」',
        ally: { name: '柳寒舟', share: 0.15, at: [4, 10, 16],
          say: [
            '缆桩上青影一闪，柳寒舟伞中剑轻轻一点，正点在屠千山握刀的腕子上。屠千山「嘿」了一声，刀势一滞。',
            '柳寒舟笑道：「寨主，看这边。」伞尖一挑，屠千山左肋上多了一道血口。',
            '柳寒舟收伞一拂，伞骨扫过屠千山膝弯，他身形一矮，险些跪倒。'
          ] },
        story: '又有一位撑伞的书生立在缆桩上掠阵，不知是敌是友。',
        win: [{ type: 'flag', flag: 'liu_saw_hanjiang' }] }
    ],
    phase2: '屠千山怒吼一声，一把扯下外袍，露出满身刀疤：「小子，你惹恼老子了！」刀势陡然狂猛。',
    win: '屠千山身子晃了两晃，鬼头刀「当啷」落地，单膝跪倒在泥水之中。渡口上下一片欢呼！',
    lose: '你只觉眼前一黑，耳边最后听见的，是屠千山震天的狂笑……',
    results: {
      win: { tag: '首领战 · 胜', title: '大败黑风寨主', story: '@compose', button: '收下，回到渡口',
        do: [{ type: 'flag', flag: 'boss' }, { type: 'quest', id: 'main1', stage: 2 }, { type: 'title', value: '渡口一剑' },
          { type: 'prof', skill: 'hanjiang', amount: 300 }, { type: 'xia', delta: 20 }, { type: 'silver', delta: 200 },
          { type: 'item', id: 'blade', delta: 1 }, { type: 'attr', key: '胆魄', delta: 2 },
          { type: 'feed', tag: '江湖', text: '有人在运河渡口斗败了黑风寨主屠千山，江湖人称「渡口一剑」。' }] },
      lose: { tag: '首领战 · 负', title: '败走渡口', growth: true, button: '起身',
        story: '你醒来时，已躺在大明寺的禅房里。了尘大师说，是渡口的船夫冒雨把你背上了蜀冈。窗外钟声悠悠，你摸了摸胸口的伤，心里只想着一件事：以眼下的修为，那几刀究竟该怎么接？',
        do: [{ type: 'move', to: 'daming' }, { type: 'heal', hpAtLeast: 0.4 }, { type: 'flag', flag: 'tu_bai' },
          { type: 'feed', tag: '江湖', text: '你在渡口落败，被船夫送到了大明寺。' }] },
      flee: { tag: '首领战', title: '暂避锋芒', button: '回到湖畔',
        story: '你借着漕船脱身，绕了一大圈才回到瘦西湖畔。身后隐约还能听见屠千山的骂声。留得青山在，不怕没柴烧。',
        do: [{ type: 'move', to: 'hu' }] }
    } },

  { id: 'liu', name: '柳寒舟', title: '青衫书生', ini: '柳', tone: 'jade', weapon: '伞中剑', ws: '剑', tag: '切磋', spar: true,
    rank: 0.3, build: 'light', weak: 0.85, firstTell: 2,
    moves: ['春风拂柳', '细雨斜织', '烟锁重楼', '柳浪闻莺'],
    flourish: ['剑尖轻颤', '一剑斜挑', '剑光如丝', '剑走轻灵'],
    tells: [
      { name: '伞中藏锋', text: '柳寒舟收伞为剑，伞尖斜指地面，周身气机一凝……', dom: 'li', after: '伞尖点地，青石上留下一个小坑。' },
      { name: '三分柳影', text: '柳寒舟身形一晃，竟化出三道青影，同时向你围来……', dom: 'qiao', after: '三道青影一合即散。' },
      { name: '寒星点点', text: '柳寒舟足尖一点凌空跃起，剑尖化作点点寒星洒落……', dom: 'su', after: '剑雨落处，湖面溅起一片水花。' }
    ],
    asides: ['茶棚里的汉子们站起身来，伸长了脖子。', '卖花姑娘捂住了嘴，花篮都忘了提。', '画舫上有人推开窗，探出头来张望。'],
    opening: ['剑势用老', '回剑稍慢', '脚下一滑', '收伞时手上一顿'],
    intro: '柳寒舟从伞柄中抽出一柄细剑，含笑拱手：「在下柳寒舟，请。」',
    win: '柳寒舟收剑后退，笑道：「兄台好剑法，柳某佩服。」',
    lose: '柳寒舟剑尖在你喉前三寸停住，随即收剑：「承让。」',
    results: {
      win: { tag: '切磋 · 胜', title: '略胜一筹', button: '回到湖畔',
        story: '柳寒舟收剑入伞，笑道：「兄台的剑，比你的人还要冷。改日渡口若有事，柳某也想去看看热闹。」',
        do: [LIU_REL, { type: 'prof', skill: 'hanjiang', amount: 80 }] },
      lose: { tag: '切磋 · 负', title: '棋差一着', growth: true, button: '回到湖畔',
        story: '柳寒舟收剑入伞：「兄台底子不差，只是火候未到。我出重手时，你该挑自己最有把握的法子应对，而不是最好看的。」他顿了顿，伞尖在青石上一点：「三日后此时，还在这里。柳某等你。」',
        // 约（docs/foundation.md 第三节第三条）：守了约，他把那几剑拆给你看；失了约，他记着
        do: [LIU_REL, { type: 'prof', skill: 'hanjiang', amount: 40 },
          { type: 'yue', id: 'liu_again', npc: 'liu', at: 'hu', inDays: 3, text: '湖畔再见，柳寒舟要把那几剑拆给你看',
            miss: [{ type: 'rel', npc: 'liu', value: '点头之交', from: ['相谈甚欢'], note: '失了三日之约' },
              { type: 'feed', tag: '江湖', text: '柳寒舟在湖畔等了你一整天，天黑才收伞走了。' }] }] },
      yield: LIU_YIELD,
      flee: LIU_YIELD
    } }
];

const QUESTS: QuestDef[] = [
  { id: 'main1', name: '第一回 · 扬州', stages: [
    // 新开局（旗标 kp_xin）心里挂着的是江伯的下落；旧存档江伯已经下葬，还是原来的写法
    { title: '寻访大明寺了尘大师', to: 'daming', who: 'liaochen', hint: '去扬州，大明寺，找了尘——这是你手里仅有的一条去路。玉佩和那页残谱，都在怀里。',
      alt: [{ if: { flag: 'kp_xin' }, title: '江伯去了哪里',
        hint: '江伯走进雨里之前，只留下一句话：扬州，大明寺，了尘。他人在哪里，没人说得准。去大明寺找了尘大师，是你手里仅有的一条线。' }] },
    // 屠千山入夜回船上歇（运河渡口 nightQuiet），导航按作息算，不写进门槛
    { title: '前往运河渡口，截住黑风寨主', to: 'dukou', who: 'tu', hint: '了尘大师说，黑风寨主屠千山霸着运河渡口，那三船盐是漕帮兄弟半年的血汗。要去截他，先掂掂自己的斤两。',
      alt: [{ if: { flag: 'kp_xin' }, title: '江伯去了哪里：顺着那夜的线，去运河渡口截黑风寨的船', hint: '了尘大师说，那夜江上泊过黑风寨的船。黑风寨主屠千山霸着运河渡口，截住他，便是顺着那夜的线往下找。要去截他，先掂掂自己的斤两。' }] },
    { title: '去东关街听听江湖怎么说', to: 'cheng', who: 'shuoshu', hint: '渡口这一仗，想必已经传开了。东关街角的说书人嘴快，去听听江湖上怎么说。' },
    { title: '寒江旧案 · 第一回完' }
  ],
  // 那夜听来的：新开局第一夜的三条路各记一条，后面谁读了牌子、谁说了左手，再添一句（旗标来自 prologue.ts、kp-guren.ts、fuya.ts）
  notes: [
    { if: { flag: 'kp_du' }, text: '那夜听来的：船到江心，独臂镖师说，二十年前领路的人他没看清脸，只记得那人给了他一袋银子，叫他闭嘴，他当夜就走了。三日后的雨夜，他在泥里改了口：带路的人，就是他自己。' },
    { if: { flag: 'kp_wen' }, text: '那夜听来的：船上验伤，镖师肩上有一道单刀砍的旧疤，宽背厚刃，从锁骨斜劈到肋下。卞婆婆说，二十年前深秋有一条没点灯的船靠岸，走在头里的，是个使左手的后生。' },
    { if: { flag: 'kp_bu' }, text: '那夜听来的：镖师的钱袋底下压着一块腰牌，牌面阴刻「黑风」二字，背面一行小字：水路，丙。三日后雨夜，船外那几个人影，腰间挂的也是一样的牌子。' },
    { if: { flag: 'kp_chu_zuo' }, text: '褚七后来说，二十年前雇他押镖的那个人，使刀用的是左手。' },
    { if: { flag: 'kp_wei_pai' }, text: '卫衡认得那块腰牌：黑风寨水路上的牌子，寨里管水路的头目，不止一个。' },
    { if: { flag: 'kp_zhou_pai' }, text: '周捕头看了那块腰牌，说是黑风寨水路上的牌子，能上船的头目才有。' }
  ] }
];

const pack: ContentPack = {
  regions: { yz: { name: '扬州', order: 1, note: '江南道：扬州居运河与大江之会，南过瓜洲渡江是镇江，顺江南运河而下是苏州。' } },
  rooms: ROOMS,
  npcs: NPCS,
  foes: FOES,
  quests: QUESTS
};
export default pack;
