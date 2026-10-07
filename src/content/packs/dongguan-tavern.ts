import type { ContentPack, NpcDef, RoomDef } from '../types';

/** 东关街酒楼「望江楼」：斗酒结识威远镖局少镖头赵铁衣（镖局线入口） */

const ROOMS: RoomDef[] = [
  {
    id: 'cheng_tavern', name: '望江楼', area: '扬州城 · 东关街', region: 'yz', t: 5, map: [74, 80],
    desc: '二楼雅间，窗外便是东关街的喧嚣。柜台上堆着几坛未开封的花雕酒，一个络腮胡的壮汉正抱着酒坛猛灌。',
    npcs: ['changgui', 'zhao_tieyi'],
    exits: [['街', 'cheng', '楼']],
    road: '你顺着楼梯登上二楼，酒香扑面而来……'
  }
];

const NPCS: NpcDef[] = [
  {
    id: 'changgui', name: '掌柜', ini: '掌', tone: 'amber', brief: '擦着杯子',
    look: '五十来岁，围着油迹斑斑的白围裙，一张笑脸见牙不见眼。',
    verbs: ['交谈', '观察', '购买'],
    actions: {
      观察: [{ text: '柜台后面的酒架上摆满了酒坛，标着「花雕」「竹叶青」「女儿红」。' }],
      交谈: [{ text: '「客官好眼力，今儿个新到的花雕，三十文一壶，要不要来一坛？」' }],
      购买: [
        { if: { silver: 30 }, text: '掌柜麻利地倒了一壶花雕递过来。（银两 −30 文）',
          do: [{ type: 'silver', delta: -30 }, { type: 'toast', text: '银两 −30 文' }] },
        { text: '「三十文一壶，一文不能少。」' }
      ]
    }
  },
  {
    id: 'zhao_tieyi', name: '赵铁衣', ini: '赵', tone: 'red', brief: '抱着酒坛猛灌',
    look: '络腮胡扎得像钢针，一口酒气，左眉上横着一道刀疤，把半截眉毛削得没了踪影。腰上别着一柄窄刃长刀，鞘尾挂着威远镖局的铜牌。',
    verbs: ['交谈', '观察', '斗酒', '请酒'],
    actions: {
      观察: [{ text: '酒坛已经空了三个，脚边还放着一坛没开封的花雕。左眉那道刀疤早已发白，是多年前的旧伤。' }],
      交谈: [
        { if: { flag: 'boss' },
          text: '赵铁衣放下酒坛，哈哈大笑：「渡口一剑！扬州城都传疯了！我赵铁衣，威远镖局少镖头。哪天要往云南走一趟红货，兄弟若有兴致，来搭个伴？」',
          do: [
            { type: 'rel', npc: 'zhao_tieyi', value: '相谈甚欢', from: ['素不相识', '点头之交'] },
            { type: 'flag', flag: 'biaoju_invite' },
            { type: 'feed', tag: '江湖', text: '威远镖局少镖头赵铁衣邀你日后同行一趟押镖。' }
          ] },
        { if: { flag: 'biaoju_invite' },
          text: '赵铁衣举坛跟你一碰：「兄弟，云南那趟红货我还没动，等你准备好了，来找我。」' },
        { if: { flag: 'zhao_please' },
          text: '赵铁衣打了个酒嗝：「方才的酒算我回敬。镖师嘛，讲究的就是一个爽快。」' },
        { if: { flag: 'zhao_doujiu' },
          text: '赵铁衣拍拍你的肩膀：「兄弟好酒量！以后威远镖局的门，永远为你开着。」' },
        { text: '赵铁衣斜眼打量你，酒气直冲过来：「找我？」他指了指脚边的空坛，「要喝就喝，别磨磨唧唧。」' }
      ],
      斗酒: [
        { if: { flag: 'biaoju_invite' }, text: '赵铁衣笑着摆手：「已经结交了，就不必再斗了吧？」' },
        { if: { attr: { key: '体魄', atLeast: 15 } },
          text: '赵铁衣跟你连碰三坛，你脸不变色。他放下酒坛，哈哈大笑：「好！好兄弟！」一拍酒坛：「威远镖局少镖头赵铁衣，请了！」',
          do: [
            { type: 'rel', npc: 'zhao_tieyi', value: '相谈甚欢', from: ['素不相识', '点头之交'] },
            { type: 'flag', flag: 'zhao_doujiu' },
            { type: 'flag', flag: 'biaoju_invite' },
            { type: 'feed', tag: '江湖', text: '你跟赵铁衣斗酒赢了，拿到了威远镖局的邀请。' }
          ] },
        { text: '三坛下去，你眼前发黑，脑袋「咚」地磕在酒坛上……醒来时，天色已近傍晚。（银两 −10 文，过去半个时辰）',
          do: [
            { type: 'flag', flag: 'zhao_doujiu_lose' },
            { type: 'silver', delta: -10 },
            { type: 'time', add: 60 },
            { type: 'rel', npc: 'zhao_tieyi', value: '点头之交', from: ['素不相识'] },
            { type: 'feed', tag: '江湖', text: '你跟赵铁衣斗酒输了，但他说了一句「下次再来」。' }
          ] }
      ],
      请酒: [
        { if: { flag: 'biaoju_invite' }, text: '赵铁衣摆手：「酒钱已经结过了，不必客气。」' },
        { if: { silver: 30 },
          text: '你喊掌柜搬了一壶花雕过来。赵铁衣眼睛一亮，倒了两碗跟你一碰：「够意思！我赵铁衣交你这个朋友。」（银两 −30 文）',
          do: [
            { type: 'silver', delta: -30 },
            { type: 'rel', npc: 'zhao_tieyi', value: '点头之交', from: ['素不相识'] },
            { type: 'flag', flag: 'zhao_please' },
            { type: 'flag', flag: 'biaoju_invite' },
            { type: 'feed', tag: '江湖', text: '你请赵铁衣喝了一壶花雕，拿到了威远镖局的邀请。' }
          ] },
        { text: '你摸了摸钱袋，银两不够一壶花雕的。赵铁衣笑道：「没钱也不要紧，能坐下来喝一口，就是朋友。」' }
      ]
    }
  }
];

const pack: ContentPack = {
  rooms: ROOMS,
  npcs: NPCS,
  news: [
    { if: { flag: 'zhao_doujiu' },
      text: '望江楼里最近来了个年轻人，一连三坛花雕面不改色，跟威远镖局的赵少镖头拜了把子似的。' },
    { if: { flag: 'zhao_doujiu_lose' },
      text: '威远镖局的赵少镖头说，有个后生跟他斗酒，三坛下去就趴在桌上睡了半日。' },
    { if: { flag: 'zhao_please' },
      text: '听说望江楼有人请了威远镖局的赵少镖头喝酒，一壶花雕就换了个朋友。' },
  ]
};

export default pack;
