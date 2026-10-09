import type { ContentPack, NpcDef, RoomDef } from '../types';

/** 序章 · 瓜洲夜雨；序章以后的重回瓜洲（江伯坟、烧掉的小屋、镇上的人还记得） */

const NIGHT = { quest: { id: 'prologue', is: 2 } };
/** 序章走完了：江伯已经下葬，小屋烧成了焦土 */
const AFTER = { quest: { id: 'prologue', atLeast: 3 } };

const ROOMS: RoomDef[] = [
  { id: 'gz_home', name: '渡口小屋', area: '瓜洲渡', region: 'gz', t: 10, map: [24, 40],
    desc: [
      { if: AFTER, text: '小屋只剩几根烧黑的柱子，渔网烧成了灰，散在泥地里。江风从没了顶的屋里穿过去，还带着一股焦糊味。' },
      { if: NIGHT, text: '天已黑透，大雨倾盆。小屋的门虚掩着，屋里没有点灯，雨声里隐约传来翻箱倒柜的声音。' },
      { text: '江边一间低矮的木屋，屋檐下晾着渔网。屋里飘着草药味，江伯靠在床头，咳得一阵紧过一阵。' }
    ],
    npcs: [{ id: 'jiangbo', if: { quest: { id: 'prologue', below: 2 } } }],
    objs: [{ id: 'door', if: { quest: { id: 'prologue', is: 2 } } }, { id: 'gz_shijiu', if: AFTER }],
    exits: [['东', 'gz_town']],
    road: [
      { if: AFTER, text: '你沿着江堤往回走，远远就望见那几根烧黑的柱子……' },
      { if: NIGHT, text: '天色暗了下来，你揣着药往回赶，雨点开始噼啪落下……' },
      { text: '你沿着江堤走回小屋……' }
    ],
    onEnter: [{ if: { quest: { id: 'prologue', is: 2 } }, do: [{ type: 'story', id: 'p_night' }] }] },
  { id: 'gz_town', name: '瓜洲镇', area: '瓜洲 · 老街', region: 'gz', t: 0, map: [62, 40], nightQuiet: true,
    desc: [
      { if: { hour: { from: 19, to: 5 } },
        text: '老街上了门板，茶摊的炉子封了火，鱼市口的鱼担也收回了家。街上只有打更的梆子声，一下，一下，敲得夜更长。' },
      { if: { hour: { from: 5, to: 8 } },
        text: '清早的老街刚醒，拐角鱼市口那头已经有了吆喝声，带着江水凉气的鱼腥一阵阵飘过来。回春堂的门板卸了一半，药香混着鱼腥。' },
      { if: AFTER, text: '青石老街还是老样子，鱼腥味混着药香。只是茶摊上的闲汉见了你，都把说到一半的话咽了回去。' },
      { if: NIGHT, text: '天色暗了，老街上的铺子陆续上了门板。雨点打在青石板上，溅起一层白雾。' },
      { text: '青石老街不过百步长，鱼腥味混着药香。回春堂的门板卸了一半，茶摊上几个闲汉正就着花生说长道短。' }
    ],
    npcs: ['huichun'],
    exits: [['西', 'gz_home'], ['南', 'gz_pier']],
    road: '你沿着江堤往镇上走，风里带着雨意……',
    onEnter: [
      // 「还是老样子」是重回瓜洲时说的话：序章里主角天天在这条街上
      { if: { ...AFTER, notFlag: 'ssgz_seen' },
        do: [{ type: 'flag', flag: 'ssgz_seen' }, { type: 'feed', tag: '江湖', text: '瓜洲的老街还是老样子，鱼腥味混着药香。渡口的船来来去去，镇上人的日子照旧过。' }] }
    ] },
  // 负责人 10-09「场景不许像派出所审犯人」：卖鱼阿婆、拎鱼的六斤从老街挪到拐角的鱼市口
  { id: 'gz_yushi', name: '鱼市口', area: '瓜洲 · 老街拐角', region: 'gz', t: 5, map: [42, 58], nightQuiet: true,
    desc: [
      { if: { hour: { from: 21, to: 4 } },
        text: '鱼市口空了，鱼担都收了回去，只剩一地鱼鳞和几只翻过来的竹筐。江风从堤那头吹过来，带着一股潮腥气。' },
      { if: { hour: { from: 13, to: 21 } },
        text: '过了晌午，鱼市口就散了。青石板上只剩一摊摊水渍和鱼鳞，几只野猫钻在竹筐底下翻鱼头，见人来了也不躲。' },
      { text: '老街拐角通江堤的一片空场，青石板常年湿漉漉的，鱼鳞嵌在石缝里闪着光。天不亮渔船靠岸，鱼担就沿着墙根一溜摆开，篮里的鲥鱼、刀鱼还在蹦，讨价还价的嗓门一个比一个大。' }
    ],
    npcs: [],
    exits: [['街', 'gz_town', '市']],
    road: '你拐过老街的墙角，鱼腥味扑面而来……' },
  { id: 'gz_pier', name: '瓜洲码头', area: '瓜洲渡', region: 'gz', t: 5, map: [62, 78],
    desc: [
      // 序章里不开船（engine/world.ts 的 openExits）：江伯在床上等药
      { if: { chapter: 0 },
        text: '码头上的船都系紧了缆绳，艄公把篙收进船舱，冲天上努努嘴：「要下大雨了，今儿不开船。」江面上压着黑沉沉的云。' },
      { if: { hour: { from: 19, to: 3 } },
        text: '夜里的码头泊满了船，艄公早收了船回家。渔火三三两两，夜潮一下一下拍着缆桩，风里全是水汽。' },
      { if: { shi: { id: 'ssgz_xun', at: ['zheng'] } },
        text: '码头上剑拔弩张：渔家的船缩在东头，盐商的货船横在江口，护船的汉子抱着桨在船头踱来踱去。' },
      { if: { shi: { id: 'ssgz_xun', at: ['yuwan'] } },
        text: '盐商的货船横在江口，一船一船的鲥鱼装个不停。码头上冷冷清清，六叔的船倒扣在滩上，底朝天。' },
      { if: { shi: { id: 'ssgz_xun', at: ['dagou'] } },
        text: '码头上热闹起来：渔家的船一条条出了江口，网影张开在晨光里。盐商的货船规规矩矩走在西航道。' },
      { if: { shi: { id: 'ssgz_xun', at: ['huajie'] } },
        text: '江口立了根新木桩，拴着块字据牌：渔网下东汊，货船走西航道。两边的船各行其道，倒也相安。' },
      { if: { shi: { id: 'ssgz_xun', at: ['baoxin'] } },
        text: '码头上，六叔的船安安稳稳泊着，渔家们坐在船头分现钱。盐船的船工扛着号子装货，两边井水不犯河水。' },
      { if: AFTER, text: '码头上渔船进进出出，那两条生船早没了影子。往北去扬州的运河客船、过江去京口的渡船，都泊在这里。' },
      { text: '江面灰蒙蒙的，渔船都已归港。码头尽头泊着两条生船，船上的人不打鱼，只是不住地朝岸上张望。' }
    ],
    npcs: [], objs: [{ id: 'shengchuan', if: { quest: { id: 'prologue', below: 3 } } }],
    exits: [['北', 'gz_town']],
    road: '你穿过老街，走到江边码头……' },
  // 序章里江伯还活着：这里只是江堤上一株老柳，坟是序章以后才有的
  { id: 'gz_fen', name: '江堤老柳', area: '瓜洲 · 江堤', region: 'gz', t: 5, map: [24, 70],
    desc: [
      { if: { quest: { id: 'prologue', below: 3 } },
        text: '江堤下游一株老柳，枝条垂到了水面。江伯补网的时候爱坐在这截树根上，说这里风顺，听得见上游来船。树根叫他坐得发亮。' },
      { if: { flag: 'gz_fen_wine' }, text: '江堤上那株老柳下，坟前的土还洇着酒气。木牌上「江伯之墓」四个字，刻得歪歪扭扭。' },
      { text: '江堤上那株老柳下，一座新坟的土还没长草。坟前插着一块木牌，「江伯之墓」四个字，是那天清晨你用刀一笔一笔刻的。' }
    ],
    npcs: [], objs: [{ id: 'gz_fenmu', if: AFTER }],
    exits: [['北', 'gz_home', '南']],
    road: '你沿着江堤往下游走，老柳的枝条垂到了水面……',
    onEnter: [{ if: { ...AFTER, notFlag: 'gz_fen_seen' },
      text: '你在江伯坟前站了很久。',
      do: [{ type: 'flag', flag: 'gz_fen_seen' }, { type: 'rel', npc: 'jiangbo', value: '阴阳两隔', note: '葬在瓜洲江堤的老柳下' }] }] }
];

const NPCS: NpcDef[] = [
  { id: 'jiangbo', name: '江伯', ini: '江', tone: 'gray', brief: '咳个不停', hint: '养父',
    look: '江伯年过六旬，背却挺得笔直。右手虎口有一层厚茧——那不是撑篙磨出来的。',
    verbs: ['交谈', '观察', '请教'],
    actions: {
      交谈: [
        { if: { quest: { id: 'prologue', is: 0 } },
          text: '「咳咳……{given}，去镇上回春堂抓两副药，就说是老江的方子。」江伯顿了顿，望向窗外：「快去快回。看这天色，夜里要下大雨。」',
          do: [{ type: 'quest', id: 'prologue', stage: 1 }, { type: 'feed', tag: '主线', text: '江伯让你去镇上回春堂抓药。' }, { type: 'toast', text: '任务更新' }] },
        { text: '「去吧，回春堂的掌柜认得我。」' }
      ],
      请教: [{ text: '江伯摆摆手：「等我好些了，再陪你练。」他望着江面出神，像是在想很远的事。' }]
    } },
  // 药铺住在铺子楼上，夜里敲门也开（序章里江伯等着这两副药，过了时辰也得抓得到）
  { id: 'huichun', name: '回春堂掌柜', ini: '药', tone: 'jade', brief: '在柜台后碾药', night: true,
    look: '圆脸的中年人，手指被药汁染成了褐色。',
    verbs: ['交谈', '观察', '抓药'],
    actions: {
      交谈: [
        { if: { quest: { id: 'prologue', atLeast: 3 }, notFlag: 'gz_fangzi' },
          text: '掌柜看见你，手里的药碾停了。他叹了口气：「老江的药，终究没用上。」他从柜台底下摸出一张发黄的方子递给你：「留着吧，是他的字。」',
          do: [{ type: 'flag', flag: 'gz_fangzi' }, { type: 'item', id: 'fangzi', delta: 1 }, { type: 'toast', text: '得到 江伯的药方' }] },
        { if: { quest: { id: 'prologue', atLeast: 3 } }, text: '「在扬州，有个头疼脑热的，记得抓药。」掌柜低头碾药，没再多说。' },
        { text: '「哟，{given}来了。老江的咳嗽又犯了？」' }
      ],
      抓药: [
        { if: { quest: { id: 'prologue', is: 1 } },
          text: '掌柜看了方子，抬头打量你一眼：「老江的药？……拿去吧，钱下回再说。」他把药包递过来，又压低声音：「这两天镇上来了些外乡人，打听一个右手使剑的老头。你们……小心些。」',
          do: [{ type: 'quest', id: 'prologue', stage: 2 }, { type: 'item', id: 'med', delta: 1 },
            { type: 'time', until: 18 * 60 + 10 }, { type: 'weather', value: '大雨' },
            { type: 'feed', tag: '主线', text: '药抓好了。天色已晚，快回渡口小屋。' }, { type: 'toast', text: '获得 药 ×2' }] },
        { if: { quest: { id: 'prologue', is: 2 } }, text: '「药已经给你了，快回去吧，要下大雨了。」' },
        // 序章以后：照常卖金疮药（试玩第二轮 C11）
        { if: { quest: { id: 'prologue', atLeast: 3 }, silver: 20 },
          text: '掌柜包了一包金疮药递给你，收了二十文：「老江常说你练剑不知轻重。……拿着吧。」',
          do: [{ type: 'silver', delta: -20 }, { type: 'item', id: 'jcy', delta: 1 }, { type: 'toast', text: '金疮药 +1' }] },
        { if: { quest: { id: 'prologue', atLeast: 3 } }, text: '「金疮药二十文一包。」掌柜看了看你的钱袋，没再往下说。' },
        { text: '「抓药？方子呢？」' }
      ]
    } },
  { id: 'chatan', name: '茶摊老汉', ini: '茶', tone: 'amber', brief: '就着花生说长道短',
    look: '牙掉了一半，消息却比谁都灵通。',
    at: [{ room: 'gz_town', if: { hour: { from: 6, to: 18 } } }],
    verbs: ['交谈', '观察'],
    actions: { 交谈: [
      { if: { shi: { id: 'ssgz_du', at: ['shu'] } },
        text: '茶摊老汉把花生推到你面前，声音压得极低：「王屠户家的二小子，把婆娘的银镯子押上了赌桌——一夜输了个精光，蹲在客店门口不敢回家。这赌桌再不掀，镇上还要出事。」' },
      // 第 42 条：庄家离镇以后，赌桌这一局的收梢由旁人来讲
      { if: { shi: { id: 'ssgz_du', at: ['shuhuan'] } },
        text: '茶摊老汉磕着花生：「镯子赎回来了，赌桌又开了两夜。」他往客店那头努努嘴，「庄家卷了钱下的江，人早不在镇上了。王二家的婆娘没回娘家——就这么一样，算是好了。」' },
      { if: { shi: { id: 'ssgz_du', at: ['quanhu'] } },
        text: '茶摊老汉把花生往你手里塞了一把：「那几个后生叫人劝回来了，赌桌没人去，自己散了伙。」他眯着眼看你，「劝人回头的手，比掀桌的手金贵。」' },
      { if: { shi: { id: 'ssgz_du', at: ['pao'] } },
        text: '茶摊老汉嗑着花生直摇头：「赌桌卷了钱跑了，天没亮的事。王家的婆娘抱着孩子回了娘家——一镇子人当笑话讲，笑话里是人家的血汗。」' },
      { if: AFTER,
        text: '老汉看见你，花生也不嗑了：「{given}，你还敢回来？那晚江边一片火光，第二天那几条生船就不见了。前些日子又来过两个人，在你家那片焦地上转了半天。」他压低声音：「老江的事，镇上没人敢提。你自己当心。」' },
      { text: '「听说了没？扬州那边黑风寨又劫了漕船，整整三船盐呐！」老汉嗑着花生，又神神秘秘地凑过来：「还有江上那几条生船——船上的人，穿的是官靴。」' }
    ] } },
  { id: 'ayp', name: '卖鱼阿婆', ini: '婆', tone: 'blue', brief: '守着半篮鲜鱼',
    look: '头发花白，手却利索，刮鳞开膛一气呵成。',
    at: [{ room: 'gz_yushi', if: { hour: { from: 4, to: 13 } } }],
    verbs: ['交谈', '观察'],
    actions: { 交谈: [
      { if: { shi: { id: 'ssgz_xun', at: ['zheng', 'yuwan'] } },
        text: '阿婆的鱼篮里空荡荡的：「渔家不敢下江，这鱼就断顿了。」她叹口气，「盐是大生意，鱼是小人家的命。大生意挤小人家，挤得没声没响。」' },
      // 第 43 条：baoxin 是「包下一汛，渔家歇工拿现钱」，阿婆不该庆祝下江捕鱼；恢复捕鱼只留给打跑／划界
      { if: { shi: { id: 'ssgz_xun', at: ['dagou', 'huajie'] } },
        text: '阿婆的鱼篮又满了，抓起一尾活鲫鱼给你看：「下江了！东汊的鱼肥——你嗅嗅，这才叫鱼。」她硬把鱼塞进你怀里，「拿着，阿婆谢你。」' },
      { if: { shi: { id: 'ssgz_xun', at: ['baoxin'] } },
        text: '阿婆的鱼篮里小半篮鱼干，鲜鱼却不多：「这一汛的鱼叫人包了去，渔家没下江，先落了现钱。」她抓了一把鱼干塞给你，「阿婆卖了半辈子鱼，头一回见不打鱼的日子——人歇着，心倒定些。」' },
      // 第 16 条：童年那三件具体的事排在前面，泛泛的问候排在最后——不然回访时巡检那句出不来
      { if: { flag: 'mem2_pole' }, text: '「{given}啊，小时候拿扁担替阿婆出头的就是你吧？阿婆记着呢。」她往你怀里塞了一包鱼干。' },
      { if: { flag: 'mem2_trip' }, text: '「当年绊得王家恶少摔了个狗啃泥的，就是你这个小鬼头吧？」阿婆笑得合不拢嘴。' },
      { if: { flag: 'mem2_patrol' }, text: '「当年你叫来巡检替阿婆讨回了公道。那位周巡检，如今升了扬州府的捕头呢，你去扬州，可以找找他。」',
        do: [{ type: 'flag', flag: 'zhou' }] },
      { if: AFTER,
        text: '阿婆一把拉住你的手，眼圈红了：「老江的坟，阿婆隔几天就去拔拔草。你在扬州，吃得饱么？」她往你怀里塞了一包鱼干，又替你理了理衣领。',
        do: [{ type: 'rel', npc: 'ayp', value: '相谈甚欢', from: ['素不相识', '点头之交'], note: '瓜洲的卖鱼阿婆，替你照看江伯的坟' }] },
      { text: '「{given}，买条鱼吧？」' }
    ] } },
  { id: 'shaogong', name: '艄公', ini: '艄', tone: 'blue', brief: '蹲在船头补网',
    look: '一顶破斗笠，一杆老旱烟。',
    at: [{ room: 'gz_pier', if: { hour: { from: 5, to: 18 } } }],
    verbs: ['交谈', '观察'],
    actions: { 交谈: [
      { if: AFTER,
        text: '艄公补着网，头也不抬：「那晚的火，我看见了。烧得好，那些人回来扑了个空。」他用烟杆朝江边一指：「往北坐客船去扬州，过江坐渡船去京口。要走，就走远些。」' },
      { text: '「那两条船？来了三天了，不打鱼，专打听人。昨天还问我，镇上有没有一个右手使剑的老头……」他忽然住了口，看了你一眼，低头继续补网。' }
    ] } },
  { id: 'shengchuan', name: '生船', obj: true, icon: 'boat', brief: '泊在码头尽头',
    look: '船头站着两个汉子，一身渔家短打，脚上却是黑面白底的官靴。见你望过来，其中一人拉低了斗笠。',
    verbs: ['观察'], actions: {} },
  { id: 'gz_shijiu', name: '门前的石臼', obj: true, icon: 'stele', brief: '被火燎黑了半边',
    look: '门前那只捣药的石臼还在，被火燎黑了半边。江伯的药，都是在这里一下一下捣出来的。',
    verbs: ['观察', '细看'],
    actions: { 细看: [
      { if: { notFlag: 'gz_mujian' },
        text: '你搬开石臼，底下压着一个油布包，火没有烧到。打开来，是一柄小木剑，剑柄被攥得发亮。你五岁那年，江伯削给你的。',
        do: [{ type: 'flag', flag: 'gz_mujian' }, { type: 'item', id: 'mujian', delta: 1 }, { type: 'toast', text: '得到 小木剑' }] },
      { text: '石臼底下空了，只剩一块压得发白的泥地。' }
    ] } },
  { id: 'gz_fenmu', name: '新坟', obj: true, icon: 'stele', brief: '木牌上刻着字',
    look: '坟不高，土是你一捧一捧垒起来的。木牌上的字，被江风吹了些日子，边上起了毛。',
    verbs: ['观察', '祭拜'],
    actions: { 祭拜: [
      { if: { flag: 'boss', notFlag: 'gz_fen_boss' },
        text: '你在坟前跪下：「江伯，渡口那一剑，你看见了么？屠千山跪在泥水里，跟那晚的我一样。」江风吹过，老柳的枝条拂过木牌，像有人轻轻拍了拍你的肩。',
        do: [{ type: 'flag', flag: 'gz_fen_boss' }] },
      { if: { item: { id: 'huadiao' } },
        text: '你拍开泥封，把一壶花雕慢慢洒在坟前。江伯生前爱喝两口，总说等你长大了，陪他喝一回。',
        do: [{ type: 'item', id: 'huadiao', delta: -1 }, { type: 'flag', flag: 'gz_fen_wine' }] },
      { text: '你在坟前跪下，磕了三个头。江面上一条渔船慢慢划过，船上的人朝这边望了一眼，又低下头去。',
        do: [{ type: 'flag', flag: 'gz_fen_bai' }] }
    ] } },
  { id: 'door', name: '虚掩的门', obj: true, icon: 'door', brief: '屋里没有点灯',
    look: '门虚掩着，门闩断成了两截。',
    verbs: ['观察', '推门'],
    actions: { 推门: [{ do: [{ type: 'story', id: 'p_night' }] }] } }
];

const pack: ContentPack = {
  regions: { gz: { name: '瓜洲渡', order: 2, note: '瓜洲渡：运河入江的地方。往北坐运河客船去扬州，过江坐渡船去京口。' } },
  rooms: ROOMS,
  npcs: NPCS,
  items: [
    { id: 'mujian', name: '小木剑', kind: '信物', desc: '江伯削给你的小木剑，剑柄被你小时候攥得发亮。' },
    { id: 'fangzi', name: '江伯的药方', kind: '信物', desc: '回春堂掌柜留着的旧方子，字迹清瘦，是江伯的手笔。' }
  ]
};
export default pack;
