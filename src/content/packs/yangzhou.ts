import type { ContentPack, Effect, FightResult, FoeDef, NpcDef, QuestDef, RoomDef } from '../types';

/** 第一回 · 扬州 */

const BOSS_HERE = { quest: { id: 'main1', is: 1 }, notFlag: 'boss' };

const ROOMS: RoomDef[] = [
  { id: 'hu', name: '瘦西湖畔', area: '扬州 · 瘦西湖', region: 'yz', t: 0, map: [50, 50],
    desc: '垂柳如烟，画舫在细雨中缓缓靠岸。茶棚里三个佩刀汉子压低声音说着什么；石桥那头，一个青衫书生撑伞而立，似在等人。',
    npcs: ['caobang', 'liu', 'huagu'], objs: ['bei'],
    exits: [['北', 'daming'], ['东', 'dukou'], ['南', 'cheng'], ['西', 'jinshan']],
    road: '你折回湖畔，柳丝拂过肩头……' },
  { id: 'daming', name: '大明寺', area: '扬州 · 蜀冈', region: 'yz', t: 30, map: [50, 14],
    desc: '古寺依冈而建，晨钟初歇，香烟缭绕。平山堂前古木参天，一位白眉老僧正不疾不徐地扫着石阶上的落花。',
    npcs: ['liaochen', 'zhike'], exits: [['南', 'hu']],
    road: '你沿着湖堤向北，拾级登上蜀冈……' },
  { id: 'dukou', name: '运河渡口', area: '扬州 · 东关', region: 'yz', t: 15, map: [79, 50],
    desc: [
      { if: BOSS_HERE, text: '运河上帆樯林立，三条漕船被几艘黑篷快船团团围住。一个虬髯大汉立在码头当中，手按鬼头刀，正吆喝喽啰往岸上搬盐包。' },
      { if: { flag: 'boss' }, text: '码头上又热闹起来，脚夫们扛着盐包来来往往。几个船夫蹲在缆桩边，一见你便笑着招手。' },
      { text: '运河上帆樯林立，漕船首尾相接。码头上脚夫扛着盐包来来往往，几个船夫蹲在缆桩边，不时朝江面张望。' }
    ],
    npcs: [{ id: 'tu', if: BOSS_HERE }, 'chuanfu', 'guanshi'], exits: [['西', 'hu']],
    road: '你穿过几条小巷，河风里带着咸腥的盐味……' },
  { id: 'cheng', name: '东关街', area: '扬州城', region: 'yz', t: 15, map: [50, 86],
    desc: '青石长街两旁店铺林立，绸缎庄、药铺、酒楼的幌子在细雨里轻轻摇晃。街角一个说书人正讲到精彩处，引得众人连声叫好。',
    npcs: ['shuoshu', 'yaopu', 'xiaoer'], exits: [['北', 'hu']],
    road: '你穿过高高的城门洞，市声渐渐近了……' },
  { id: 'jinshan', name: '小金山', area: '瘦西湖 · 湖心', region: 'yz', t: 10, map: [20, 50],
    desc: '湖心小岛上亭台错落，风亭立在山顶，凭栏可望尽一湖烟雨。亭中石桌上摆着一局残棋，一个老人对着棋盘出神。',
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
    verbs: ['交谈', '观察', '请教', '切磋', '赠礼', '偷窃'],
    actions: {
      交谈: [
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
    look: '十五六岁年纪，篮里是新折的杏花，还带着雨水。',
    gift: '姑娘扑哧一笑：「公子，这本来就是我的花呀。」',
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
  { id: 'liaochen', name: '了尘大师', ini: '尘', tone: 'gray', brief: '白眉老僧',
    look: '须眉皆白，扫地时步子不疾不徐，落叶却都自己往簸箕里飘。',
    gift: '了尘大师合十一笑：「阿弥陀佛，拈花一笑，施主有心了。」',
    verbs: ['交谈', '观察', '请教', '赠礼'],
    actions: {
      交谈: [
        { if: { quest: { id: 'main1', is: 0 }, item: { id: 'jade' } },
          text: '了尘大师看见你腰间那半块玉佩，扫帚停在半空，良久才道：「江老三……终究还是走了么。」他双手合十：「黑风寨主屠千山今日午时在运河渡口卸货，那三船盐是漕帮兄弟半年的血汗。施主若能截住他，老衲便把你想知道的事，原原本本说给你听。」',
          do: [{ type: 'rel', npc: 'liaochen', value: '初识', from: ['素不相识'] }, { type: 'quest', id: 'main1', stage: 1 },
            { type: 'feed', tag: '主线', text: '了尘大师托你：前往运河渡口，截住黑风寨主屠千山。' }, { type: 'toast', text: '主线更新' }] },
        { if: { quest: { id: 'main1', is: 0 } },
          text: '了尘大师放下扫帚，双手合十：「施主来得正好。黑风寨主屠千山今日午时在运河渡口卸货，那三船盐是漕帮兄弟半年的血汗……老衲出家人，不便动手。」',
          do: [{ type: 'rel', npc: 'liaochen', value: '初识', from: ['素不相识'] }, { type: 'quest', id: 'main1', stage: 1 },
            { type: 'feed', tag: '主线', text: '了尘大师托你：前往运河渡口，截住黑风寨主屠千山。' }, { type: 'toast', text: '主线更新' }] },
        { if: { quest: { id: 'main1', is: 1 } }, text: '「屠千山刀法刚猛，施主千万小心。」' },
        { text: '「阿弥陀佛。施主仗义出手，漕帮兄弟会记住的。至于湖畔那块石碑……日后再说吧。」' }
      ],
      请教: [{ text: '「对敌之时，莫问他用的是什么招，要问自己练成了什么。轻功好，便避其锋芒；内力足，便硬碰硬；剑法精，便以巧破拙。修为到了，自然看得出哪一条路最稳。」' }]
    } },
  { id: 'zhike', name: '知客僧', ini: '僧', tone: 'gray', brief: '双手合十',
    look: '年纪尚轻，眉目和善，袈裟洗得发白。',
    verbs: ['交谈', '观察'],
    actions: { 交谈: [{ text: '「施主请随意参拜。了尘师叔在平山堂前扫地呢。」' }] } },
  { id: 'tu', name: '屠千山', ini: '屠', tone: 'red', brief: '黑风寨主', hint: '黑风寨主 · 首领',
    look: '身高八尺，虬髯如戟，鬼头刀背上九个铁环叮当作响。左臂缠着旧伤的布条。',
    verbs: ['交谈', '观察', '动手'],
    actions: {
      交谈: [{ text: '屠千山斜眼打量你：「哪来的雏儿？滚远点，别耽误老子卸货！」' }],
      动手: [{ do: [{ type: 'fight', foe: 'tu' }] }]
    } },
  { id: 'chuanfu', name: '船夫', ini: '船', tone: 'blue', brief: '蹲在缆桩边',
    look: '黝黑的脸膛，一双手全是老茧，正闷头抽着旱烟。',
    verbs: ['交谈', '观察'],
    actions: { 交谈: [
      { if: { flag: 'boss' }, text: '「托您的福，码头又能开船了！客官要坐船，不收钱！」' },
      { text: '「客官要过江？今日不行喽，黑风寨的船霸着码头呢。」' }
    ] } },
  { id: 'guanshi', name: '漕帮管事', ini: '漕', tone: 'blue', brief: '愁眉不展',
    look: '四十来岁，算盘别在腰后，袖口沾着盐粒。',
    verbs: ['交谈', '观察'],
    actions: { 交谈: [
      { if: { flag: 'boss', notFlag: 'paid' }, text: '管事一揖到地：「恩公！这是漕帮的一点心意，万望收下。」（银两 +100 文）',
        do: [{ type: 'flag', flag: 'paid' }, { type: 'silver', delta: 100 }, { type: 'rel', npc: 'guanshi', value: '感恩戴德' }, { type: 'toast', text: '银两 +100 文' }] },
      { if: { flag: 'boss' }, text: '「恩公以后在运河上行船，报漕帮的名号便是。」' },
      { if: { quest: { id: 'main1', is: 1 } }, text: '「那姓屠的就在码头上……三船盐，是兄弟们半年的血汗啊。」' },
      { text: '「黑风寨劫了我们三船盐，帮主正发愁呢。」' }
    ] } },
  { id: 'shuoshu', name: '说书人', ini: '说', tone: 'purple', brief: '醒木一拍',
    look: '一袭旧长衫，折扇上题着「江湖夜雨」四个字。',
    verbs: ['交谈', '观察', '打赏'],
    actions: {
      交谈: [
        { if: { quest: { id: 'main1', is: 2 } }, text: '说书人醒木一拍：「列位看官！{story}」满堂喝彩，有人朝你这边张望——竟没人认出，说的正是你。',
          do: [{ type: 'quest', id: 'main1', stage: 3 }, { type: 'feed', tag: '主线', text: '「寒江旧案」第一回完。湖畔石碑上的「沈」字，又是怎么回事？' }, { type: 'toast', text: '第一回 · 完' }] },
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
    verbs: ['交谈', '观察', '购买'],
    actions: {
      交谈: [{ text: '「金疮药，二十文一包，止血生肌，童叟无欺。」' }],
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
      交谈: [{ text: '老人头也不抬：「这局『雁回』残谱，三十年没人解得开。」' }],
      请教: [
        { if: { flag: 'qichi' }, text: '「去去去，别挡着我的光。」' },
        { if: { notLearned: 'jinghong' }, text: '老人指着棋盘：「这一子，退一步，海阔天空。」你盯着那局残棋看了半晌，三道剑光忽然在眼前连成一线——你竟从棋局里悟出了一套剑法。',
          do: [{ type: 'flag', flag: 'qichi' }, { type: 'learn', skill: 'jinghong', realm: 0, prof: 120 }] },
        { text: '老人指着棋盘：「这一子，退一步，海阔天空。」你望着那局残棋，忽觉「惊鸿照影」的第三剑，原来可以先退后进。',
          do: [{ type: 'flag', flag: 'qichi' }, { type: 'prof', skill: 'jinghong', amount: 120 }] }
      ]
    } },
  { id: 'canqi', name: '残棋', obj: true, icon: 'go', brief: '黑白交错',
    look: '黑子大龙被困，却在角上留着一手「倒脱靴」的余味。看得久了，竟像是三道剑光。',
    verbs: ['观察'], actions: {} }
];

const LIU_REL: Effect = { type: 'rel', npc: 'liu', value: '不打不相识', from: ['素不相识', '点头之交', '相谈甚欢'] };
const LIU_YIELD: FightResult = {
  tag: '切磋', title: '收剑认输', story: '柳寒舟收剑入伞，拱手道：「承让。兄台若有兴致，改日再来。」',
  do: [{ type: 'prof', skill: 'hanjiang', amount: 20 }], button: '回到湖畔'
};

const FOES: FoeDef[] = [

  { id: 'tu', name: '屠千山', title: '黑风寨主', ini: '屠', tone: 'red', weapon: '鬼头刀', ws: '刀', tag: '首领战',
    hp: 3000, atk: [52, 80], big: 230,
    moves: ['开山式', '横扫千军', '乌云盖顶', '黑虎掏心'],
    flourish: ['自上而下劈落', '拦腰横斩', '挟着风声斜劈', '刀光霍霍，连环砍出'],
    tells: [
      { name: '力劈华山', text: '屠千山双手握刀高举过顶，浑身骨节噼啪作响……', pw: { li: 40, su: 22, qiao: 20, xi: 15 }, after: '地上青石崩裂！' },
      { name: '黑风断魂刀', text: '屠千山连退三步，深吸一口气，刀身隐隐泛起黑光……', pw: { li: 50, su: 30, qiao: 25, xi: 20 }, after: '黑气激荡，码头上的灯笼齐齐熄灭！' },
      { name: '连环夺命刀', text: '屠千山刀尖虚晃，脚下碎步连踩，刀势忽左忽右……', pw: { li: 25, su: 40, qiao: 35, xi: 20 }, after: '七八道刀光交织成网！' }
    ],
    asides: ['码头上的脚夫们远远围着，大气不敢出。', '「好！」船夫们齐声喝彩。', '漕帮管事攥紧了拳头：「打得好！」', '几个黑风寨喽啰握着刀，却没一个敢上前。'],
    opening: ['刀势一老', '收刀稍慢', '用力过猛，身形一晃', '回刀时露了空门'],
    intro: '屠千山「呸」地吐了口唾沫，鬼头刀一抖，九个铁环哗啦作响：「找死！」',
    phase2: '屠千山怒吼一声，一把扯下外袍，露出满身刀疤：「小子，你惹恼老子了！」刀势陡然狂猛。',
    win: '屠千山身子晃了两晃，鬼头刀「当啷」落地，单膝跪倒在泥水之中。渡口上下一片欢呼！',
    lose: '你只觉眼前一黑，耳边最后听见的，是屠千山震天的狂笑……',
    results: {
      win: { tag: '首领战 · 胜', title: '大败黑风寨主', story: '@compose', button: '收下，回到渡口',
        do: [{ type: 'flag', flag: 'boss' }, { type: 'quest', id: 'main1', stage: 2 }, { type: 'title', value: '渡口一剑' },
          { type: 'prof', skill: 'hanjiang', amount: 300 }, { type: 'xia', delta: 20 }, { type: 'silver', delta: 200 },
          { type: 'item', id: 'blade', delta: 1 },
          { type: 'feed', tag: '江湖', text: '有人在运河渡口斗败了黑风寨主屠千山，江湖人称「渡口一剑」。' }] },
      lose: { tag: '首领战 · 负', title: '败走渡口', growth: true, button: '起身',
        story: '你醒来时，已躺在大明寺的禅房里。了尘大师说，是渡口的船夫冒雨把你背上了蜀冈。窗外钟声悠悠，你摸了摸胸口的伤，心里只想着一件事：以眼下的修为，那几刀究竟该怎么接？',
        do: [{ type: 'move', to: 'daming' }, { type: 'heal', hpAtLeast: 0.4 }, { type: 'silver', delta: -30 },
          { type: 'feed', tag: '江湖', text: '你在渡口落败，被船夫送到了大明寺。' }] },
      flee: { tag: '首领战', title: '暂避锋芒', button: '回到湖畔',
        story: '你借着漕船脱身，绕了一大圈才回到瘦西湖畔。身后隐约还能听见屠千山的骂声。留得青山在，不怕没柴烧。',
        do: [{ type: 'move', to: 'hu' }] }
    } },

  { id: 'liu', name: '柳寒舟', title: '青衫书生', ini: '柳', tone: 'jade', weapon: '伞中剑', ws: '剑', tag: '切磋', spar: true,
    hp: 1400, atk: [28, 44], big: 110, firstTell: 2,
    moves: ['春风拂柳', '细雨斜织', '烟锁重楼', '柳浪闻莺'],
    flourish: ['剑尖轻颤', '一剑斜挑', '剑光如丝', '剑走轻灵'],
    tells: [
      { name: '伞中藏锋', text: '柳寒舟收伞为剑，伞尖斜指地面，周身气机一凝……', pw: { li: 30, su: 25, qiao: 25, xi: 20 }, after: '伞尖点地，青石上留下一个小坑。' },
      { name: '三分柳影', text: '柳寒舟身形一晃，竟化出三道青影，同时向你围来……', pw: { li: 15, su: 30, qiao: 40, xi: 25 }, after: '三道青影一合即散。' },
      { name: '寒星点点', text: '柳寒舟足尖一点凌空跃起，剑尖化作点点寒星洒落……', pw: { li: 20, su: 40, qiao: 30, xi: 30 }, after: '剑雨落处，湖面溅起一片水花。' }
    ],
    asides: ['茶棚里的汉子们站起身来，伸长了脖子。', '卖花姑娘捂住了嘴，花篮都忘了提。', '画舫上有人推开窗，探出头来张望。'],
    opening: ['剑势用老', '回剑稍慢', '脚下一滑', '收伞时露了空门'],
    intro: '柳寒舟从伞柄中抽出一柄细剑，含笑拱手：「在下柳寒舟，请。」',
    win: '柳寒舟收剑后退，笑道：「兄台好剑法，柳某佩服。」',
    lose: '柳寒舟剑尖在你喉前三寸停住，随即收剑：「承让。」',
    results: {
      win: { tag: '切磋 · 胜', title: '略胜一筹', button: '回到湖畔',
        story: '柳寒舟收剑入伞，笑道：「兄台的剑，比你的人还要冷。改日渡口若有事，柳某也想去看看热闹。」',
        do: [LIU_REL, { type: 'prof', skill: 'hanjiang', amount: 80 }] },
      lose: { tag: '切磋 · 负', title: '棋差一着', growth: true, button: '回到湖畔',
        story: '柳寒舟收剑入伞：「兄台底子不差，只是火候未到。我出重手时，你该挑自己最有把握的法子应对，而不是最好看的。」',
        do: [LIU_REL, { type: 'prof', skill: 'hanjiang', amount: 40 }] },
      yield: LIU_YIELD,
      flee: LIU_YIELD
    } }
];

const QUESTS: QuestDef[] = [
  { id: 'main1', name: '第一回 · 扬州', stages: [
    { title: '寻访大明寺了尘大师', to: 'daming' },
    { title: '前往运河渡口，截住黑风寨主', to: 'dukou' },
    { title: '去东关街听听江湖怎么说', to: 'cheng' },
    { title: '寒江旧案 · 第一回完' }
  ] }
];

const pack: ContentPack = {
  regions: { yz: { name: '扬州', note: '首发版本开放江南道：瓜洲、扬州、镇江寒江渚、苏州。完整版里，天下分为十余道，坐车乘船皆可一键赶路，途中遇事会停下来交给你处理。' } },
  rooms: ROOMS,
  npcs: NPCS,
  foes: FOES,
  quests: QUESTS
};
export default pack;
