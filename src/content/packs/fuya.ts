import type { ContentPack, NpcDef, QuestDef, RoomDef } from '../types';

/** 扬州府衙：周捕头、告示、草上飞缉拿委托（六扇门线入口） */

const ROOMS: RoomDef[] = [
  {
    id: 'yz_fuya', name: '扬州府衙', area: '扬州 · 府前街', region: 'yz', t: 10, map: [24, 84],
    desc: '朱漆大门两旁蹲着一对石狮，照壁上贴满了告示。两个衙役拄着水火棍，打着哈欠。正堂门口，一个穿皂靴的中年汉子正翻着卷宗，眉头拧得像打了结。',
    npcs: ['fuya_zhou', 'fuya_yayi'], objs: ['fuya_gaoshi'],
    exits: [['东', 'cheng', '西']],
    road: '你穿过高高的城门洞，沿城墙根往东，衙门的鼓楼渐渐近了……'
  }
];

const NPCS: NpcDef[] = [
  {
    id: 'fuya_zhou', name: '周捕头', ini: '周', tone: 'blue', brief: '翻着卷宗',
    look: '四十出头，络腮胡刮得发青，两眼布满血丝。皂衣上打了个补丁，腰牌上刻着一个「周」字，漆快掉光了。',
    verbs: ['交谈', '观察', '揭榜', { verb: '交差', if: { quest: { id: 'side_caoshangfei', atLeast: 2 } } }],
    actions: {
      交差: [
        { if: { quest: { id: 'side_caoshangfei', is: 2 }, flag: 'csf_surrender' },
          text: '草上飞跟在你身后走进正堂，自己跪下了。周捕头愣了半晌，转身去后院开了牢门，账房先生跌跌撞撞地跑出来，扑通一声给你磕了个头。周捕头铺开文书，一笔一笔地写：「劫银三百两，一百两济茱萸湾灾民，余银二百两起获归还。」他搁下笔：「府台那里，我替他说话。」又从自己腰间解下钱袋，倒出二两碎银推给你：「赏银要等府台批，这是我的心意。」',
          do: [
            { type: 'quest', id: 'side_caoshangfei', stage: 3 }, { type: 'flag', flag: 'csf_zhangfang_free' },
            { type: 'silver', delta: 2000 }, { type: 'xia', delta: 15 },
            { type: 'rel', npc: 'fuya_zhou', value: '相谈甚欢', from: ['素不相识', '点头之交', '初识', '旧识'] },
            { type: 'feed', tag: '江湖', text: '草上飞自首，账房先生出狱。周捕头在文书上写明了那一百两的去处，要在府台面前替他求情。' }
          ] },
        { if: { quest: { id: 'side_caoshangfei', is: 2 } },
          text: '周捕头一拍桌子站起来：「好！」他亲自给草上飞上了枷，又吩咐衙役去后院放人。账房先生出来时腿都软了，拉着你的袖子说不出话。周捕头从自己腰间解下钱袋，倒出二两碎银推给你：「五十两赏银，要等府台批下来，这是我的一点心意。」他看了一眼堂下的草上飞，没再说什么。',
          do: [
            { type: 'quest', id: 'side_caoshangfei', stage: 3 }, { type: 'flag', flag: 'csf_zhangfang_free' },
            { type: 'silver', delta: 2000 }, { type: 'xia', delta: 5 },
            { type: 'rel', npc: 'fuya_zhou', value: '相谈甚欢', from: ['素不相识', '点头之交', '初识', '旧识'] },
            { type: 'feed', tag: '江湖', text: '你押草上飞回了府衙，刘家的账房先生出了狱。周捕头先垫了二两赏银。' }
          ] },
        { if: { flag: 'csf_freed', notFlag: 'csf_reported' },
          text: '你说草上飞从茱萸湾跑了。周捕头盯着你看了半晌，没有追问。他把那张画像慢慢卷起来，塞进卷宗最底下：「茱萸湾那几户人家，今年冬天倒是没饿死人。」他叹了口气，朝后院努了努嘴：「只是刘家咬定账房是内应。贼拿不着，他就出不来。」',
          do: [{ type: 'flag', flag: 'csf_reported' }] },
        { text: '周捕头点点头：「草上飞的案子结了，少侠辛苦。」' }
      ],
      观察: [{ text: '他手背上有一道旧刀伤，从虎口一直划到腕子上。卷宗里夹着一张画像，画着个短打汉子，左手缺了个小指。' }],
      交谈: [
        { if: { flag: 'boss' },
          text: '周捕头抬起头，愣了一下：「渡口一剑？」他把卷宗一合，快步迎过来：「久仰久仰！眼下有个棘手的案子，草上飞那贼最近在小金山一带出没，悬赏五十两……少侠若有兴致？」',
          do: [
            { type: 'rel', npc: 'fuya_zhou', value: '初识', from: ['素不相识'] },
            { type: 'flag', flag: 'fuya_trust' },
            { type: 'flag', flag: 'caoshangfei_hint1' },
            { type: 'quest', id: 'side_caoshangfei', stage: 0 },
            { type: 'feed', tag: '江湖', text: '周捕头给你开了个悬赏：缉拿江洋大盗「草上飞」，线索说他常在小金山一带出没。' }
          ] },
        { if: { flag: 'mem2_patrol' },
          text: '周捕头忽然睁大眼：「你是……{given}？当年那个去叫来巡检讨公道的孩子！」他叹了口气：「岁月不饶人啊。来，坐下说话。」',
          do: [
            { type: 'rel', npc: 'fuya_zhou', value: '旧识', from: ['素不相识'] },
            { type: 'flag', flag: 'fuya_trust' },
            { type: 'feed', tag: '江湖', text: '周捕头认出了你：当年你叫来巡检，现在他已是扬州府捕头了。' }
          ] },
        { if: { flag: 'fuya_trust' },
          text: '周捕头压低声音：「草上飞这贼狡猾得很。我派了两拨人马去小金山，都扑了空。少侠若愿意帮忙，我这边有个熟人——小金山那个棋痴……或许见过他。」' },
        { if: { flag: 'fuya_bribed' },
          text: '周捕头皱着眉打量你：「衙役说你托他来引见我？也罢，有什么事直说吧。」' },
        { text: '周捕头头也不抬：「没看见正忙着吗？有事递帖子去。」' }
      ],
      揭榜: [
        { if: { quest: { id: 'side_caoshangfei', atLeast: 1 } }, text: '周捕头道：「已经揭过了，少侠别忘了给我个准信。」' },
        { if: { any: [{ flag: 'boss' }, { flag: 'mem2_patrol' }, { flag: 'fuya_trust' }] },
          text: '周捕头点头：「少侠愿意接这趟差，我替扬州百姓先谢过了。」他把一张画像递过来：「草上飞，左手缺小指，常在小金山一带出没。有消息回来找我。」',
          do: [
            { type: 'quest', id: 'side_caoshangfei', stage: 1 },
            { type: 'flag', flag: 'caoshangfei_hint1' },
            { type: 'feed', tag: '江湖', text: '你正式接下了缉拿草上飞的委托：线索一，他常在小金山一带出没。' }
          ] },
        { text: '周捕头摇头：「少侠……你连衙役打点都没做，就想直接接差？」' }
      ]
    }
  },
  {
    id: 'fuya_yayi', name: '衙役', ini: '衙', tone: 'gray', brief: '打着哈欠',
    look: '皂衣歪戴，腰牌上的漆掉了一半，一看就是混日子的。',
    verbs: ['交谈', '观察', '打赏'],
    actions: {
      观察: [{ text: '他的水火棍靠在墙根下，棍头沾着半片落叶。腰间挂着个酒葫芦。' }],
      交谈: [
        { if: { flag: 'boss' }, text: '衙役一见是你，连忙起身抱拳：「少侠恕罪，小的有眼无珠！」' },
        { text: '「有什么事找周捕头？他正忙着呢，有事等着。」' }
      ],
      打赏: [
        { if: { silver: 20 }, text: '衙役把铜钱往袖子里一揣，脸色立刻好看了：「少侠稍等，我这就进去通报一声。」（银两 −20 文）',
          do: [
            { type: 'silver', delta: -20 },
            { type: 'flag', flag: 'fuya_bribed' },
            { type: 'flag', flag: 'fuya_trust' },
            { type: 'rel', npc: 'fuya_yayi', value: '笑脸相迎', from: ['素不相识'] }
          ] },
        { text: '你摸了摸钱袋，空空如也。' }
      ]
    }
  },
  {
    id: 'fuya_gaoshi', name: '告示', obj: true, icon: 'door', brief: '贴满整面照壁',
    look: '告示上盖着扬州府大印，墨迹新鲜。最底下画着一张画像——短打汉子，左手缺了小指，绰号「草上飞」。悬赏白银五十两，有线索者速报。',
    verbs: ['观察', '细看', '揭榜'],
    actions: {
      观察: [{ text: '告示是官府的，落款扬州府。最底下有张画像，一个短打汉子，左手缺了个小指。' }],
      细看: [{ text: '「缉拿江洋大盗草上飞。近来出没于小金山、茱萸湾一带，夜闯商铺三家，劫银百两。有线索者，速报府衙。悬赏白银五十两正。扬州府衙 · 朱」（获得线索一条）',
        do: [{ type: 'flag', flag: 'gaoshi_read' }, { type: 'feed', tag: '江湖', text: '告示缉拿江洋大盗「草上飞」，悬赏五十两白银，线索指向小金山、茱萸湾。' }] }],
      揭榜: [
        { if: { quest: { id: 'side_caoshangfei', atLeast: 1 } }, text: '告示已经揭走了。' },
        { if: { flag: 'gaoshi_read' },
          text: '你伸手揭下告示。衙役连忙往里通报，不一会儿，周捕头亲自迎了出来。',
          do: [
            { type: 'flag', flag: 'fuya_gaoshi_taken' },
            { type: 'flag', flag: 'caoshangfei_hint1' },
            { type: 'quest', id: 'side_caoshangfei', stage: 1 },
            { type: 'feed', tag: '江湖', text: '你揭下了告示，正式接下了缉拿草上飞的委托。' }
          ] },
        { text: '你凑近看了看，告示上的字太小，看不清写的什么。' }
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

const pack: ContentPack = {
  rooms: ROOMS,
  npcs: NPCS,
  quests: QUESTS,
  news: [
    { if: { quest: { id: 'side_caoshangfei', atLeast: 1 } },
      text: '听说扬州府又贴了告示，悬赏缉拿那个左手缺小指的江洋大盗，有人揭了榜。' },
    { if: { flag: 'mem2_patrol' },
      text: '周捕头在府衙里念叨着，说有个老相识要来投奔他。' },
    { if: { flag: 'fuya_bribed' },
      text: '府衙的衙役最近手上宽裕了些，有人私下塞了银子给他。' },
  ]
};

export default pack;
