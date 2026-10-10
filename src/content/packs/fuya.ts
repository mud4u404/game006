import type { ContentPack, Effect, NpcDef, QuestDef, RoomDef, StoryChoice, StoryDef } from '../types';

/**
 * 扬州府衙：周捕头、照壁上的榜、草上飞缉拿委托（六扇门线入口），修订版（Issue #48）。
 * 负责人 10-09「场景不许像派出所审犯人」：府衙拆成三处——照壁（榜、书办、衙役）、前堂（周捕头、秦教头、申伯）、大牢（牢头、押着的人）。
 * 照壁上只有一块榜，分三栏（负责人 10-09 定）：缉拿找前堂的周捕头；悬赏在照壁下的书办那里登记、交差；海捕见到就拿，扭送府衙领赏。
 */

/** 周捕头认出当年瓜洲公堂上那个孩子（新旧开局共用，接下去的「故人问」分新旧两稿） */
const MET_OLD_TEXT = '周捕头抬起头，忽然怔住了。他放下卷宗，快步走下堂来：「……{given}？瓜洲雨夜，公堂对质——你是当年那个孩子。那桩案子是周某断的，你的名字，周某记到今日。」他把你上下打量了一番，眼眶有些发红：「六扇门的差事不好做，你我总算又见了。」';
const MET_OLD_DO: Effect[] = [
  { type: 'flag', flag: 'fuya_met_old' },
  { type: 'flag', flag: 'fuya_met_name' },
  { type: 'flag', flag: 'fuya_trust' },
  { type: 'rel', npc: 'fuya_zhou', value: '相谈甚欢', from: ['素不相识'], note: '当年瓜洲公堂的周巡检，就是他' },
  { type: 'feed', tag: '江湖', text: '扬州府的周捕头认出了你——当年瓜洲那位秉公断案的周巡检，如今已是六扇门的捕头。' }
];

const ROOMS: RoomDef[] = [
  {
    id: 'yz_zhaobi', name: '府衙照壁', area: '扬州 · 府衙', region: 'yz', t: 5, map: [32, 78], nightQuiet: true,
    desc: [
      { if: { hour: { from: 21, to: 5 } },
        text: '府衙的大门关了，只开着一扇角门。门房里一盏油灯，值夜的衙役抱着水火棍打盹。照壁上的榜文叫夜风掀起一角，哗哗地响，画像上的人在灯影里忽明忽暗。' },
      { text: '朱漆大门两旁蹲着一对石狮，门前一堵青砖照壁，正中钉着一块榜，分作三栏：缉拿、悬赏、海捕，画像有新有旧。榜下摆一张条案，书办伏案抄写，几个闲汉围着画像指指点点。' }
    ],
    npcs: ['fuya_yayi'], objs: ['fuya_gaoshi'],
    exits: [['北', 'yz_fuya', '南'], ['东', 'cheng', '西']],
    road: '你沿城墙根往西走，府衙的鼓楼渐渐近了……'
  },
  {
    id: 'yz_fuya', name: '府衙前堂 · 六扇门', area: '扬州 · 府衙', region: 'yz', t: 10, map: [18, 84], nightQuiet: true,
    desc: [
      { if: { hour: { from: 21, to: 5 } },
        text: '前堂黑着，公案上的签筒、惊堂木都收了，只有廊下挂着一盏气死风灯。后头大牢里有人在喊冤，喊两声又没了动静。' },
      { text: '绕过照壁便是前堂，「明镜高悬」的匾额底下，公案上压着一摞卷宗。廊下有人擦铁尺，有人伏案抄案卷；一个穿皂靴的中年汉子正翻着卷宗，眉头拧得像打了结。' }
    ],
    npcs: ['fuya_zhou'],
    exits: [['牢', 'yz_fuya_lao', '堂'], ['南', 'yz_zhaobi', '北']],
    road: '你绕过照壁，进了府衙的仪门……'
  },
  {
    id: 'yz_fuya_lao', name: '府衙大牢', area: '扬州 · 府衙', region: 'yz', t: 5, map: [10, 92],
    desc: [
      { if: { hour: { from: 21, to: 5 } },
        text: '大牢里只点着一盏豆油灯，栅栏的影子一根根投在地上。有人在稻草里翻身，有人在说梦话，牢头的钥匙在黑地里叮当一响，又没了声。' },
      { text: '后院一排青砖矮房，窗洞只有巴掌大，木栅栏碗口粗。过道里一股霉味混着馊饭味，牢头晃着一串钥匙来回踱步，栅栏后头不时有人扒着木头往外张望。' }
    ],
    npcs: [],
    exits: [['堂', 'yz_fuya', '牢']],
    road: '你穿过前堂的夹道，往后院的大牢走去……'
  }
];

const NPCS: NpcDef[] = [
  {
    id: 'fuya_zhou', name: '周捕头', ini: '周', tone: 'blue', brief: '翻着卷宗',
    look: '四十出头，络腮胡刮得发青，两眼布满血丝。皂衣上打了个补丁，腰牌上刻着一个「周」字，漆快掉光了。他手背上有一道旧刀伤，从虎口一直划到腕子上，卷宗里夹着一张画像，画着个短打汉子，左手缺了个小指。',
    verbs: ['交谈', '观察', '揭榜', { verb: '交差', if: { quest: { id: 'side_caoshangfei', atLeast: 2 } } },
      // 码头空出来以后（packs/shishi-yangzhou.ts）：报官是插手的一条路
      { verb: '报官', if: { shi: { id: 'ss_matou', at: ['qi', 'duizhi', 'huobing'] } } }],
    actions: {
      报官: [
        { text: '你把渡口的事说了。周捕头听完，把卷宗一合：「漕帮自家的事，衙门向来不管。可要是见了血，又夹着私盐……」他叫来两个衙役，「封了渡口，搭个税棚。谁的码头？官府的码头。」他看了你一眼，「这事是你报的，漕帮那头，你自己小心。」',
          do: [{ type: 'shi', id: 'ss_matou', to: 'guanfu' },
            { type: 'rel', npc: 'fuya_zhou', value: '点头之交', from: ['素不相识'], note: '你来府衙报了漕帮两舵争码头的事' },
            { type: 'feed', tag: '江湖', text: '你去府衙报了官。府衙封了渡口，搭起税棚，漕帮两舵谁也没占着。' }] }
      ],
      交差: [
        { if: { quest: { id: 'side_caoshangfei', is: 2 }, flag: 'csf_surrender' },
          text: '草上飞跟在你身后走进前堂，自己跪下了。周捕头愣了半晌，转身去后院开了牢门，账房先生跌跌撞撞地跑出来，扑通一声给你磕了个头。周捕头铺开文书，一笔一笔地写：「劫银三百两，一百两济茱萸湾灾民，余银二百两起获归还。」他搁下笔：「府台那里，我替他说话。」又让书办点出二两赏银推给你：「榜上的赏银，一文不少。」',
          do: [
            { type: 'quest', id: 'side_caoshangfei', stage: 3 }, { type: 'flag', flag: 'csf_zhangfang_free' },
            { type: 'silver', delta: 2000 }, { type: 'xia', delta: 15 },
            { type: 'rel', npc: 'fuya_zhou', value: '相谈甚欢', from: ['素不相识', '点头之交'], note: '草上飞一案，你劝他自首，周捕头替他求情' },
            { type: 'feed', tag: '江湖', text: '草上飞自首，账房先生出狱。你领了二两赏银；周捕头在文书上写明了那一百两的去处，要在府台面前替他求情。' }
          ] },
        { if: { quest: { id: 'side_caoshangfei', is: 2 } },
          text: '周捕头一拍桌子站起来：「好！」他亲自给草上飞上了枷，又吩咐衙役去后院放人。账房先生出来时腿都软了，拉着你的袖子说不出话。周捕头让书办点出二两赏银推给你：「这是榜上的赏银，收好。」他看了一眼堂下的草上飞，没再说什么。',
          do: [
            { type: 'quest', id: 'side_caoshangfei', stage: 3 }, { type: 'flag', flag: 'csf_zhangfang_free' },
            { type: 'silver', delta: 2000 }, { type: 'xia', delta: 5 },
            { type: 'rel', npc: 'fuya_zhou', value: '相谈甚欢', from: ['素不相识', '点头之交'], note: '草上飞一案，你把人押回了府衙' },
            { type: 'feed', tag: '江湖', text: '你押草上飞回了府衙，刘家的账房先生出了狱。你领了榜上的二两赏银。' }
          ] },
        { if: { flag: 'csf_freed', notFlag: 'csf_reported' },
          text: '你说草上飞从茱萸湾跑了。周捕头盯着你看了半晌，没有追问。他把那张画像慢慢卷起来，塞进卷宗最底下：「茱萸湾那几户人家，今年冬天倒是没饿死人。」他叹了口气，朝后院努了努嘴：「只是刘家咬定账房是内应。贼拿不着，他就出不来。」',
          do: [{ type: 'flag', flag: 'csf_reported' }] },
        { text: '周捕头点点头：「草上飞的案子结了，少侠辛苦。」' }
      ],
      交谈: [
        // 新开局（江伯生死未卜，旗标 kp_xin）接新稿，旧存档接原稿
        { if: { flag: 'mem2_patrol', notFlag: 'fuya_met_old', any: [{ flag: 'kp_xin' }] },
          text: MET_OLD_TEXT,
          do: [...MET_OLD_DO, { type: 'story', id: 'fuya_jiangjia_xin' }] },
        { if: { flag: 'mem2_patrol', notFlag: 'fuya_met_old' },
          text: MET_OLD_TEXT,
          do: [...MET_OLD_DO, { type: 'story', id: 'fuya_jiangjia' }] },
        // 新开局不渡那条路上带出来的腰牌（序章 prologue.ts）：周捕头认得，只说一句
        { if: { item: { id: 'kp_yaopai' }, notFlag: 'kp_zhou_pai' },
          text: '你把那块腰牌放在案上。周捕头拿起来，翻过去看了看背面，指尖在边上磨了磨：「黑风寨水路上的牌子，能上船的头目才有。牌是真的，丢牌的人，这几日怕是睡不安稳。」他把牌子推回给你，「这东西，别拿到漕帮的人眼前去。」',
          do: [{ type: 'flag', flag: 'kp_zhou_pai' }, { type: 'feed', tag: '江湖', text: '周捕头认得那块腰牌，是黑风寨水路上的牌子。' }] },
        { if: { flag: 'boss', notFlag: 'fuya_met_name' },
          text: '周捕头抬起头，把你腰间的兵刃看了两眼：「渡口一剑？」他把卷宗一合：「草上飞那贼在小金山一带出没，周某两拨弟兄都扑了空。阁下是六扇门要找的人物——肯出手，赏格二两，一文不少。」',
          do: [
            { type: 'flag', flag: 'fuya_met_name' },
            { type: 'flag', flag: 'fuya_trust' },
            { type: 'flag', flag: 'caoshangfei_hint1' },
            { type: 'quest', id: 'side_caoshangfei', stage: 0 },
            { type: 'rel', npc: 'fuya_zhou', value: '点头之交', from: ['素不相识'], note: '扬州府捕头，托你缉拿草上飞' },
            { type: 'feed', tag: '江湖', text: '周捕头给你开了个悬赏：缉拿江洋大盗「草上飞」，线索说他常在小金山一带出没。' }
          ] },
        { if: { flag: 'fuya_met_old', notFlag: 'caoshangfei_hint1' },
          text: '「故人重逢，周某也不绕弯子。」他压低声音，「草上飞这贼狡猾得很，两拨弟兄去小金山都扑了空。你既是江湖中人——小金山那位下棋的老先生，一坐便是一整天，湖上来往的人，多半逃不过他的眼睛。」',
          do: [
            { type: 'flag', flag: 'caoshangfei_hint1' },
            { type: 'quest', id: 'side_caoshangfei', stage: 0 },
            { type: 'feed', tag: '江湖', text: '周捕头托你留心江洋大盗「草上飞」：线索说，小金山那位棋痴或许见过他。' }
          ] },
        { if: { flag: 'fuya_bribed' },
          text: '「塞钱塞到我手下了。」周捕头头也不抬，笔尖没停，「下不为例。有什么事，直说。」' },
        { if: { flag: 'caoshangfei_hint1' },
          text: '周捕头翻着卷宗：「有眉目了么？那贼左手缺根小指，走起路来脚跟不沾地。小金山、茱萸湾，两处都替周某多走走。」' },
        { text: '周捕头头也不抬：「没看见正忙着吗？有事递帖子去。」' }
      ],
      揭榜: [
        { if: { quest: { id: 'side_caoshangfei', atLeast: 1 } }, text: '周捕头道：「已经揭过了，少侠别忘了给我个准信。」' },
        { if: { any: [{ flag: 'boss' }, { flag: 'mem2_patrol' }, { flag: 'fuya_trust' }] },
          text: '周捕头点头：「少侠愿意接这趟差，我替扬州百姓先谢过了。」他把一张画像递过来：「草上飞，左手缺小指，常在小金山一带出没。有消息回来找我。」',
          do: [
            { type: 'flag', flag: 'fuya_gaoshi_taken' },
            { type: 'flag', flag: 'caoshangfei_hint1' },
            { type: 'quest', id: 'side_caoshangfei', stage: 1 },
            { type: 'feed', tag: '江湖', text: '你正式接下了缉拿草上飞的委托：线索一，他常在小金山一带出没。' }
          ] },
        // 看过照壁上的缉拿榜，进来自荐（原来在榜上揭，负责人 10-09：缉拿找周捕头）
        { if: { flag: 'gaoshi_read' },
          text: '你说照壁上缉拿草上飞的那张榜，你要揭。周捕头上下打量你，眉头拧得更紧：「好大的胆子，六扇门的榜也敢揭？」他沉吟半晌，叫衙役去照壁上把那张榜揭了来，拍在你手里：「拿得回草上飞，你便是六扇门的人；拿不回——你自己去跟府台说。」',
          do: [
            { type: 'flag', flag: 'fuya_gaoshi_taken' },
            { type: 'flag', flag: 'fuya_trust' },
            { type: 'flag', flag: 'caoshangfei_hint1' },
            { type: 'quest', id: 'side_caoshangfei', stage: 1 },
            { type: 'feed', tag: '江湖', text: '你自荐揭了缉拿草上飞的榜。周捕头半信半疑，撂下一句狠话：拿不回人，自己去找府台说。' }
          ] },
        { text: '「官差不是儿戏。阁下何人，凭什么叫周某信你？」周捕头把卷宗一合，「照壁上那张榜，先看清楚了再来。」' }
      ]
    }
  },
  {
    id: 'fuya_yayi', name: '衙役', ini: '衙', tone: 'gray', brief: '打着哈欠', night: true,
    look: '皂衣歪戴，腰牌上的漆掉了一半，一看就是混日子的。水火棍靠在墙根下，棍头沾着半片落叶，腰间挂着个酒葫芦。',
    verbs: ['交谈', '观察', '打赏'],
    actions: {
      交谈: [
        { if: { flag: 'boss' }, text: '衙役一见是你，连忙起身抱拳：「少侠恕罪，小的有眼无珠！」' },
        { text: '「有什么事找周捕头？他在前堂忙着呢，有事等着。」衙役朝条案那边努努嘴，「揭悬赏的，找书办登记。」' }
      ],
      打赏: [
        { if: { silver: 20, notFlag: 'fuya_bribed' },
          text: '衙役把铜钱往袖子里一揣，脸色立刻好看了：「少侠稍等，我这就进去通报一声。」（银两 −20 文）',
          do: [
            { type: 'silver', delta: -20 },
            { type: 'flag', flag: 'fuya_bribed' },
            { type: 'flag', flag: 'fuya_trust' },
            { type: 'rel', npc: 'fuya_yayi', value: '点头之交', from: ['素不相识'], note: '府衙的衙役，收过你的赏钱' }
          ] },
        { if: { flag: 'fuya_bribed' }, text: '衙役抱拳笑道：「赏过了赏过了，再赏小的可不敢收。」' },
        { text: '你摸了摸钱袋，空空如也。' }
      ]
    }
  },
  {
    // 照壁上唯一的一块榜（负责人 10-09）：缉拿、悬赏、海捕三栏。榜上只看不揭——缉拿找周捕头，悬赏找书办，海捕见到就拿
    id: 'fuya_gaoshi', name: '榜文', obj: true, icon: 'stele', brief: '照壁正中的一块榜',
    look: '照壁正中钉着一块榜，盖着扬州府大印，分作三栏：右首「缉拿」，左首「悬赏」，底下一栏是「海捕」。画像有新有旧，揭走了的，留下一块浆糊印。榜脚一行小字：缉拿揭榜见捕头，悬赏登记找书办，海捕人犯见即拿送。',
    verbs: ['观察', '看缉拿', '看悬赏', '看海捕'],
    actions: {
      看缉拿: [
        { if: { flag: 'fuya_gaoshi_taken' },
          text: '缉拿那一栏，草上飞的那张已叫人揭了，只剩四角浆糊印。旁边有人用炭笔添了一行小字：已有人接了。' },
        { text: '「缉拿江洋大盗草上飞。近来出没于小金山、茱萸湾一带，夜闯商铺三家，劫银三百两。悬赏白银二两正。有意揭榜者，进前堂见周捕头。扬州府衙 · 朱」画像上是个短打汉子，左手缺了小指。（获得线索一条）',
          do: [{ type: 'flag', flag: 'gaoshi_read' }, { type: 'feed', tag: '江湖', text: '府衙照壁上缉拿江洋大盗「草上飞」，悬赏二两白银，线索指向小金山、茱萸湾；揭榜要进前堂见周捕头。' }] }
      ],
      看悬赏: [
        { if: { job: 'xs_hezei' },
          text: '悬赏那一栏，你揭的那张河贼榜，书办的簿子上记着你的名字：运河渡口的河贼，入夜才上岸，在盐包后头出没。拿住了，押到照壁下交书办验看。' },
        { text: '悬赏那一栏贴着五张，各注着赏额。寻人：布庄走失学徒，赏两百五十文。寻物：绣娘失了玉佩，赏八百文。缉凶：布行掌柜遇害，赏一千五百文。剿匪：蜀冈黑风寨，赏三千三百八十文。末一张是运河渡口的河贼，夜里上岸偷漕船的货，赏八百文。揭榜、交差，都到照壁下找书办登记。' }
      ],
      // 海捕文书上的人犯（packs/liushanmen.ts）：一个了结，下一个才贴出来。见到就拿，不必揭榜
      看海捕: [
        { if: { shi: { id: 'lsm_qian', at: ['zaitao', 'zuoan'] } },
          text: '海捕一栏最新的一张：「飞贼『鬼手』钱三，瘦长脸，左眉一颗黑痣，十指细长。窃汪家盐号盐引三十张。拿获者赏银八百文。」画像底下有人用炭笔添了一行小字：辕门桥。海捕人犯不必揭榜，见到就拿，扭送府衙领赏。',
          do: [{ type: 'shi', id: 'lsm_qian' }] },
        { if: { shi: { id: 'lsm_bai', at: ['zaitao', 'zuoan'] } },
          text: '海捕一栏最新的一张：「游方郎中『玉面』白七郎，面白无须，背药箱，善使银针。在淮安卖假药毒毙三命。拿获者赏银二两。」海捕人犯不必揭榜，见到就拿，扭送府衙领赏。',
          do: [{ type: 'shi', id: 'lsm_bai' }] },
        { if: { shi: { id: 'lsm_xiong', at: ['zaitao', 'zuoan'] } },
          text: '海捕一栏最新的一张：「边军逃兵熊大，身长八尺，右臂刺『忠勇』二字。杀本营百户，畏罪潜逃。拿获者赏银四两。」画像上的人眉头拧着，像是有话要说。海捕人犯不必揭榜，见到就拿，扭送府衙领赏。',
          do: [{ type: 'shi', id: 'lsm_xiong' }] },
        { if: { shi: { id: 'lsm_xiong', at: ['taozou'] } }, text: '熊大的那张画像还贴着，边角卷了起来。书办说，人过江往北去了，这张榜撤不撤，府台还没发话。' },
        { if: { shi: { id: 'lsm_xiong', at: ['luowang', 'fang', 'sha'] } }, text: '海捕一栏的三张文书都揭了，浆糊印一个挨一个。书办说，新的人犯，还没报上来。' },
        { text: '海捕一栏暂时没有新贴的文书，只剩几块浆糊印。哪天贴出来了，见到就拿，扭送府衙领赏。' }
      ]
    }
  }
];

const QUESTS: QuestDef[] = [
  { id: 'side_caoshangfei', name: '六扇门 · 缉拿草上飞', stages: [
    // 这一步在前堂找周捕头揭榜才推进（照壁上的榜只看不揭），小金山的棋痴要揭了榜才开口，所以目的地写府衙前堂
    { title: '接下缉拿草上飞的差事', to: 'yz_fuya', who: 'fuya_zhou', hint: '周捕头为缉拿草上飞一案愁眉不展，盼有人肯出手。这差事接不接，回前堂与他说个明白。' },
    { title: '追查草上飞的行踪', to: 'zhuyuwan', who: 'zy_csf', hint: '周捕头说，草上飞常在小金山一带出没，左手缺着小指。人在哪儿，还得自己多走几处，细细打听。',
      need: [
        { if: { flag: 'csf_clue2' }, text: '线索还不够' },
        { if: { hour: { from: 19, to: 5 } }, text: '入夜以后' }
      ] },
    { title: '带草上飞回府衙交差', to: 'yz_fuya', who: 'fuya_zhou', hint: '人已有了着落，周捕头还在府衙前堂等着回话。' },
    { title: '缉拿草上飞 · 完' }
  ] }
];

/**
 * 「故人问」分新旧两稿：旧存档（江伯已经下葬）读原稿；新开局（旗标 kp_xin，江伯生死未卜）读新稿。
 * 两稿只差中间一句和「实话实说」里周捕头的头一句，其余共用。
 */
const JIANGJIA_ASK = '周捕头给你斟了碗粗茶，在自己对面坐下：「这些年，一直在水陆各道当差。」他顿了顿，「听说你从瓜洲来。瓜洲江家……江老三，你认得么？」';
const JIANGJIA_WAIT = '堂外的更鼓敲了两下，周捕头端着茶碗，安静地等你的话。';
const JIANGJIA_HIDE: StoryChoice = { label: '只说路过', sub: '不作声张',
  result: '「路过？」周捕头看了你一眼，没有再问，只把茶碗搁下，「瓜洲来的年轻人，眼睛里都有一股不肯服输的劲。罢了，江湖人的来历，周某不该多问。」',
  do: [
    { type: 'flag', flag: 'fuya_jiang_hide' },
    { type: 'rel', npc: 'fuya_zhou', value: '点头之交', from: ['素不相识'] }
  ], next: -1 };
const jiangjia = (id: string, mid: string, first: string, tail: string): StoryDef => ({ id, cards: [
  { tag: '六扇门', title: '故人问',
    paras: [JIANGJIA_ASK, mid, JIANGJIA_WAIT],
    choices: [
      { label: '实话实说', sub: '侠义 +2',
        result: `「${first}」周捕头沉默半晌，把碗里的粗茶一饮而尽，「当年那桩案子，若不是他肯站出来作证，王家那恶婆娘还要害人。他待你如父子——${tail}」`,
        do: [
          { type: 'flag', flag: 'fuya_jiang_truth' },
          { type: 'xia', delta: 2 },
          { type: 'rel', npc: 'fuya_zhou', value: '相谈甚欢', from: ['素不相识'] }
        ], next: -1 },
      JIANGJIA_HIDE
    ] }
] });

const STORIES: StoryDef[] = [
  jiangjia('fuya_jiangjia', '江伯临终的话还在耳边：别信官府的人。', '江老三……他走了？', '往后在扬州，六扇门的门，为你开着。'),
  jiangjia('fuya_jiangjia_xin', '江伯向来不与官府沾边，这你是知道的。', '江老三……他不见了？', '人不见了，门还在。往后在扬州，六扇门的门，为你开着。')
];

const pack: ContentPack = {
  rooms: ROOMS,
  npcs: NPCS,
  quests: QUESTS,
  stories: STORIES,
  news: [
    { if: { quest: { id: 'side_caoshangfei', atLeast: 1 } },
      text: '听说扬州府又贴了告示，悬赏缉拿那个左手缺小指的江洋大盗，有人揭了榜。', who: ['捕快', '衙役', 'guan', '书吏'], about: 'you' },
    { if: { flag: 'fuya_met_old' },
      text: '府衙的周捕头近来念旧，说等一位瓜洲来的故人，等公事完了要请他喝酒。', who: ['捕快', '衙役', 'guan'] },
    { if: { flag: 'fuya_bribed' },
      text: '府衙的衙役最近手上宽裕了些，有人私下塞了银子给他。', who: ['衙役', '小二', '赌客', 'guan'] }
  ]
};

export default pack;
