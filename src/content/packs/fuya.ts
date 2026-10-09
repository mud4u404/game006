import type { ContentPack, NpcDef, QuestDef, RoomDef, StoryDef } from '../types';

/** 扬州府衙：周捕头、告示、草上飞缉拿委托（六扇门线入口），修订版（Issue #48） */

const ROOMS: RoomDef[] = [
  {
    id: 'yz_fuya', name: '扬州府衙', area: '扬州 · 府前街', region: 'yz', t: 10, map: [24, 84], nightQuiet: true,
    desc: [
      { if: { hour: { from: 21, to: 5 } },
        text: '府衙的大门关了，只开着一扇角门。门房里一盏油灯，值夜的衙役抱着水火棍打盹；后头大牢里有人在喊冤，喊两声又没了动静。照壁上的告示在风里哗哗地响。' },
      { text: '朱漆大门两旁蹲着一对石狮，照壁上贴满了告示。两个衙役拄着水火棍，打着哈欠。正堂门口，一个穿皂靴的中年汉子正翻着卷宗，眉头拧得像打了结。' }
    ],
    npcs: ['fuya_zhou', 'fuya_yayi'], objs: [{ id: 'fuya_gaoshi', if: { notFlag: 'fuya_gaoshi_taken' } }],
    exits: [['东', 'cheng', '西']],
    road: '你沿城墙根往西走，府衙的鼓楼渐渐近了……'
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
          text: '草上飞跟在你身后走进正堂，自己跪下了。周捕头愣了半晌，转身去后院开了牢门，账房先生跌跌撞撞地跑出来，扑通一声给你磕了个头。周捕头铺开文书，一笔一笔地写：「劫银三百两，一百两济茱萸湾灾民，余银二百两起获归还。」他搁下笔：「府台那里，我替他说话。」又从自己腰间解下钱袋，倒出二两碎银推给你：「赏银要等府台批，这是我的心意。」',
          do: [
            { type: 'quest', id: 'side_caoshangfei', stage: 3 }, { type: 'flag', flag: 'csf_zhangfang_free' },
            { type: 'silver', delta: 2000 }, { type: 'xia', delta: 15 },
            { type: 'rel', npc: 'fuya_zhou', value: '相谈甚欢', from: ['素不相识', '点头之交'], note: '草上飞一案，你劝他自首，周捕头替他求情' },
            { type: 'feed', tag: '江湖', text: '草上飞自首，账房先生出狱。周捕头在文书上写明了那一百两的去处，要在府台面前替他求情。' }
          ] },
        { if: { quest: { id: 'side_caoshangfei', is: 2 } },
          text: '周捕头一拍桌子站起来：「好！」他亲自给草上飞上了枷，又吩咐衙役去后院放人。账房先生出来时腿都软了，拉着你的袖子说不出话。周捕头从自己腰间解下钱袋，倒出二两碎银推给你：「五十两赏银，要等府台批下来，这是我的一点心意。」他看了一眼堂下的草上飞，没再说什么。',
          do: [
            { type: 'quest', id: 'side_caoshangfei', stage: 3 }, { type: 'flag', flag: 'csf_zhangfang_free' },
            { type: 'silver', delta: 2000 }, { type: 'xia', delta: 5 },
            { type: 'rel', npc: 'fuya_zhou', value: '相谈甚欢', from: ['素不相识', '点头之交'], note: '草上飞一案，你把人押回了府衙' },
            { type: 'feed', tag: '江湖', text: '你押草上飞回了府衙，刘家的账房先生出了狱。周捕头先垫了二两赏银。' }
          ] },
        { if: { flag: 'csf_freed', notFlag: 'csf_reported' },
          text: '你说草上飞从茱萸湾跑了。周捕头盯着你看了半晌，没有追问。他把那张画像慢慢卷起来，塞进卷宗最底下：「茱萸湾那几户人家，今年冬天倒是没饿死人。」他叹了口气，朝后院努了努嘴：「只是刘家咬定账房是内应。贼拿不着，他就出不来。」',
          do: [{ type: 'flag', flag: 'csf_reported' }] },
        { text: '周捕头点点头：「草上飞的案子结了，少侠辛苦。」' }
      ],
      交谈: [
        { if: { flag: 'mem2_patrol', notFlag: 'fuya_met_old' },
          text: '周捕头抬起头，忽然怔住了。他放下卷宗，快步走下堂来：「……{given}？瓜洲雨夜，公堂对质——你是当年那个孩子。那桩案子是周某断的，你的名字，周某记到今日。」他把你上下打量了一番，眼眶有些发红：「六扇门的差事不好做，你我总算又见了。」',
          do: [
            { type: 'flag', flag: 'fuya_met_old' },
            { type: 'flag', flag: 'fuya_met_name' },
            { type: 'flag', flag: 'fuya_trust' },
            { type: 'rel', npc: 'fuya_zhou', value: '相谈甚欢', from: ['素不相识'], note: '当年瓜洲公堂的周巡检，就是他' },
            { type: 'feed', tag: '江湖', text: '扬州府的周捕头认出了你——当年瓜洲那位秉公断案的周巡检，如今已是六扇门的捕头。' },
            { type: 'story', id: 'fuya_jiangjia' }
          ] },
        { if: { flag: 'boss', notFlag: 'fuya_met_name' },
          text: '周捕头抬起头，把你腰间的兵刃看了两眼：「渡口一剑？」他把卷宗一合：「草上飞那贼在小金山一带出没，周某两拨弟兄都扑了空。阁下是六扇门要找的人物——肯出手，赏格五十两，一文不少。」',
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
        { text: '「官差不是儿戏。阁下何人，凭什么叫周某信你？」' }
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
        { text: '「有什么事找周捕头？他正忙着呢，有事等着。」' }
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
    id: 'fuya_gaoshi', name: '告示', obj: true, icon: 'door', brief: '贴满整面照壁',
    look: '告示上盖着扬州府大印，墨迹新鲜。最底下画着一张画像——短打汉子，左手缺了小指，绰号「草上飞」。悬赏白银五十两，有线索者速报。',
    verbs: ['观察', '细看', '揭榜'],
    actions: {
      细看: [{ text: '「缉拿江洋大盗草上飞。近来出没于小金山、茱萸湾一带，夜闯商铺三家，劫银三百两。有线索者，速报府衙六扇门。悬赏白银五十两正。扬州府衙 · 朱」（获得线索一条）',
        do: [{ type: 'flag', flag: 'gaoshi_read' }, { type: 'feed', tag: '江湖', text: '告示缉拿江洋大盗「草上飞」，悬赏五十两白银，线索指向小金山、茱萸湾。' }] }],
      揭榜: [
        { if: { quest: { id: 'side_caoshangfei', atLeast: 1 } }, text: '告示已经揭走了。' },
        { if: { flag: 'gaoshi_read', any: [{ flag: 'boss' }, { flag: 'mem2_patrol' }, { flag: 'fuya_trust' }] },
          text: '你伸手揭下告示。衙役认出你是有头面的，连忙往里通报，不一会儿，周捕头亲自迎了出来。',
          do: [
            { type: 'flag', flag: 'fuya_gaoshi_taken' },
            { type: 'flag', flag: 'caoshangfei_hint1' },
            { type: 'quest', id: 'side_caoshangfei', stage: 1 },
            { type: 'feed', tag: '江湖', text: '你揭下了告示，正式接下了缉拿草上飞的委托。' }
          ] },
        { if: { flag: 'gaoshi_read' },
          text: '你伸手揭下告示。衙役把你引到正堂，周捕头上下打量你，眉头拧得更紧：「好大的胆子，六扇门的榜也敢揭？」他沉吟半晌，把告示拍回你手里：「拿得回草上飞，你便是六扇门的人；拿不回——你自己去跟府台说。」',
          do: [
            { type: 'flag', flag: 'fuya_gaoshi_taken' },
            { type: 'flag', flag: 'fuya_trust' },
            { type: 'flag', flag: 'caoshangfei_hint1' },
            { type: 'quest', id: 'side_caoshangfei', stage: 1 },
            { type: 'feed', tag: '江湖', text: '你自荐揭下了缉拿草上飞的告示。周捕头半信半疑，撂下一句狠话：拿不回人，自己去找府台说。' }
          ] },
        // 没细看就揭：先把告示看清楚（审查 B12：原来回「字太小，看不清」，观察时明明读得出）
        { text: '你伸手之前，先把告示从头到尾看了一遍：缉拿江洋大盗草上飞，悬赏白银五十两。看清了，再揭不迟。',
          do: [{ type: 'flag', flag: 'gaoshi_read' }] }
      ]
    }
  }
];

const QUESTS: QuestDef[] = [
  { id: 'side_caoshangfei', name: '六扇门 · 缉拿草上飞', stages: [
    { title: '拿到第一条线索', to: 'jinshan' },
    { title: '追查草上飞的行踪', to: 'zhuyuwan' },
    { title: '押草上飞回府衙交差', to: 'yz_fuya' },
    { title: '缉拿草上飞 · 完' }
  ] }
];

const STORIES: StoryDef[] = [
  { id: 'fuya_jiangjia', cards: [
    { tag: '六扇门', title: '故人问',
      paras: [
        '周捕头给你斟了碗粗茶，在自己对面坐下：「这些年，一直在水陆各道当差。」他顿了顿，「听说你从瓜洲来。瓜洲江家……江老三，你认得么？」',
        '江伯临终的话还在耳边：别信官府的人。',
        '堂外的更鼓敲了两下，周捕头端着茶碗，安静地等你的话。'
      ],
      choices: [
        { label: '实话实说', sub: '侠义 +2',
          result: '「江老三……他走了？」周捕头沉默半晌，把碗里的粗茶一饮而尽，「当年那桩案子，若不是他肯站出来作证，王家那恶婆娘还要害人。他待你如父子——往后在扬州，六扇门的门，为你开着。」',
          do: [
            { type: 'flag', flag: 'fuya_jiang_truth' },
            { type: 'xia', delta: 2 },
            { type: 'rel', npc: 'fuya_zhou', value: '相谈甚欢', from: ['素不相识'] }
          ], next: -1 },
        { label: '只说路过', sub: '不作声张',
          result: '「路过？」周捕头看了你一眼，没有再问，只把茶碗搁下，「瓜洲来的年轻人，眼睛里都有一股不肯服输的劲。罢了，江湖人的来历，周某不该多问。」',
          do: [
            { type: 'flag', flag: 'fuya_jiang_hide' },
            { type: 'rel', npc: 'fuya_zhou', value: '点头之交', from: ['素不相识'] }
          ], next: -1 }
      ] }
  ] }
];

const pack: ContentPack = {
  rooms: ROOMS,
  npcs: NPCS,
  quests: QUESTS,
  stories: STORIES,
  news: [
    { if: { quest: { id: 'side_caoshangfei', atLeast: 1 } },
      text: '听说扬州府又贴了告示，悬赏缉拿那个左手缺小指的江洋大盗，有人揭了榜。' },
    { if: { flag: 'fuya_met_old' },
      text: '府衙的周捕头近来念旧，说等一位瓜洲来的故人，等公事完了要请他喝酒。' },
    { if: { flag: 'fuya_bribed' },
      text: '府衙的衙役最近手上宽裕了些，有人私下塞了银子给他。' }
  ]
};

export default pack;
