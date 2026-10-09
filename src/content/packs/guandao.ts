import type { ContentPack, NpcDef, RoomDef } from '../types';

/**
 * 扬州 · 蜀冈官道与边军募兵处（Issue #81）。
 * 军伍身份线的入口：往北的长路从这里起，募兵的校尉、驿卒、投军的少年，各人有各人的难处。
 */

const ROOMS: RoomDef[] = [
  {
    id: 'yz_guandao', name: '蜀冈官道', area: '扬州 · 城北', region: 'yz', t: 25, map: [18, 14], nightQuiet: true,
    desc: [
      { if: { hour: { from: 5, to: 18 } },
        text: '官道沿蜀冈西麓向北而去，直通淮安、京城。道旁驿亭边搭着一顶边军的帐子，旗上写个「募」字。驿卒牵着马换公文，茶棚里的粗茶冒着热气。' },
      { text: '入夜的官道安静下来，驿亭挂着一盏气死风灯。募兵帐前冷冷清清，只有远处巡夜的梆子声，和偶尔碾过碎石的车轮声。' }
    ],
    npcs: ['gd_feng', 'gd_zhou', { id: 'gd_tao', if: { notFlag: 'gd_bao' } }, 'gd_chapo'],
    objs: [],
    exits: [['东', 'daming', '西']],
    road: '你出扬州北门，沿蜀冈西麓的官道向北走，车轮声渐远……',
    onEnter: [
      { if: { notFlag: 'gd_seen' },
        do: [
          { type: 'flag', flag: 'gd_seen' },
          { type: 'feed', tag: '江湖', text: '出扬州北门便是蜀冈官道，往北直达淮安、京城。驿亭边，边军搭了顶帐子在募兵。' }
        ] }
    ]
  }
];

const NPCS: NpcDef[] = [
  {
    id: 'gd_feng', name: '募兵校尉', ini: '冯', tone: 'blue', brief: '点着名册',
    look: '皂衣旧得发白，腰牌上的字磨平了。点名册的手指粗大，指甲缝里全是黄土——不是扬州的土。',
    verbs: ['交谈', '观察', '报名'],
    actions: {
      交谈: [
        { if: { flag: 'jw_mingce' },
          text: '冯校尉朝你一抱拳：「名册上有你的名字了。往后官府有征调，少侠莫要推脱——军中，说话算话。」' },
        { text: '冯校尉头也不抬：「投军？」他翻了翻名册，「上头催得紧，今年要的人比往年多一倍。」至于为什么，他没说。' }
      ],
      观察: [{ text: '他点名册的手指粗大，指甲缝里全是黄土——不是扬州的土。名册最后一页还空着大半，前头的名字却密密麻麻。' }],
      报名: [
        { if: { flag: 'jw_mingce' }, text: '冯校尉道：「报过了。名册报上去，你就是官府记着的人了。」' },
        // 报名只记名，不发钱（审查 C08、D07：原来画个押就白拿三两）；安家银等拜入军伍才发
        { text: '冯校尉把名册转过来：「画押吧。」你签下名字，他把名册合上：「记下了。安家银，等你进了营、过了韩什长那一关再领——边军的银子，不发给只会画押的人。记住——名字入了官府的册子，日后征调，不得推脱。」',
          do: [
            { type: 'flag', flag: 'jw_mingce' },
            { type: 'feed', tag: '江湖', text: '你在蜀冈官道的募兵名册上画了押。名字入了官府的册子，日后征调，不得推脱；安家银要等进了营才发。' }
          ] }
      ]
    }
  },
  {
    id: 'gd_zhou', name: '驿卒', ini: '驿', tone: 'gray', brief: '换着公文',
    look: '十六七岁的半大孩子，鞍袋里插满了公文书信，嘴唇干得起皮，腰上挂着一串驿站的铜钥匙。',
    verbs: ['交谈', '观察'],
    actions: {
      交谈: [
        { text: '「北边的官文一拨接一拨，都是加急的。」驿卒灌了口水，「淮安在造船，京里的驿马跑死了三匹——小的我这一天，腿都快跑细了。」' }
      ]
    }
  },
  {
    id: 'gd_tao', name: '陶小乙', ini: '陶', tone: 'amber', brief: '攥着毡帽',
    look: '粗布短打浆洗得发白，脚上一双新草鞋，像是专程为出门做的。手里攥着一顶毡帽，帽檐都盘毛了。',
    verbs: ['交谈', '观察', '相劝', '出钱', '画押'],
    actions: {
      交谈: [
        { if: { notFlag: 'gd_told' },
          text: '少年攥着毡帽，半天才开口：「公子，我是李家村陶家的独子，我娘病着，抓药要钱……募兵的说，投军有安家银。」他喉结滚了滚，「可我一去九边，我娘怎么办？」',
          do: [{ type: 'flag', flag: 'gd_told' }] },
        { if: { flag: 'gd_shaoding' },
          text: '「这事定了，公子别再费心。」他朝你拱了拱手，眼睛却不看你。' },
        { text: '他攥着毡帽不说话，眼睛却不住地往募兵的帐子上瞟。' }
      ],
      相劝: [
        { if: { notFlag: 'gd_shaoding' },
          text: '你劝他想一想病床上的老娘——安家银能买药，买不回儿子。他低着头不说话，攥紧的拳头慢慢松开了：「……回去，回去也好。」',
          do: [
            { type: 'flag', flag: 'gd_quan' }, { type: 'flag', flag: 'gd_shaoding' },
            { type: 'feed', tag: '江湖', text: '蜀冈官道想投军的少年回乡侍母去了，走的时候，脸色不太好。' }
          ] },
        { text: '「这事定了，公子别再费心。」' }
      ],
      出钱: [
        { if: { notFlag: 'gd_shaoding', silver: 50 },
          text: '你摸出五十文塞给他：「给伯母抓药，先熬过这个月。投军的事，等你娘好了再说。」他愣了半晌，扑通跪下磕了个头，爬起来抹着眼泪往家跑。',
          do: [
            { type: 'silver', delta: -50 },
            { type: 'flag', flag: 'gd_chu' }, { type: 'flag', flag: 'gd_shaoding' },
            { type: 'feed', tag: '江湖', text: '蜀冈官道想投军的少年，收了一位公子的药钱，回家侍母去了。' }
          ] },
        { if: { notFlag: 'gd_shaoding' },
          text: '你摸了摸钱袋，抓药的银钱还凑不齐。少年见了，反倒安慰你：「公子，不碍的。」' },
        { text: '「这事定了，公子别再费心。」' }
      ],
      画押: [
        { if: { notFlag: 'gd_shaoding' },
          text: '你带他到募兵帐前画了押。校尉记下名字：「随队北上，进了营发安家银。」他咬了咬牙，朝你深深一揖，托邻居照看他娘，转身跟队走了，再没回头。',
          do: [
            { type: 'flag', flag: 'gd_bao' }, { type: 'flag', flag: 'gd_shaoding' },
            { type: 'feed', tag: '江湖', text: '蜀冈官道投军的少年随队北上去了，临走把他娘托给了邻居。' }
          ] },
        { text: '「这事定了，公子别再费心。」' }
      ]
    }
  },
  {
    id: 'gd_chapo', name: '孙婆婆', ini: '茶', tone: 'jade', brief: '煨着粗茶',
    look: '守着一把煨在炭上的大茶壶，粗瓷碗摞了半摞，碗沿都磕出了豁口。见人路过就吆喝一声茶。',
    verbs: ['交谈', '观察', '购买'],
    actions: {
      交谈: [
        { text: '「官道上的茶就这个价。」孙婆婆拿抹布擦着碗，「过路的、投军的、送公文的，喝了婆婆一碗茶，都是过路的命。」' }
      ],
      购买: [
        { if: { silver: 2 }, text: '孙婆婆冲上一碗粗茶。茶是粗茶，解渴。（银两 −2 文）',
          do: [{ type: 'silver', delta: -2 }, { type: 'heal', hp: 30 }, { type: 'toast', text: '银两 −2 文' }] },
        { text: '孙婆婆瞟了一眼你的钱袋：「茶钱两文，赊账免谈。」' }
      ]
    }
  }
];

const pack: ContentPack = {
  rooms: ROOMS,
  npcs: NPCS,
  news: [
    { if: { flag: 'gd_quan' },
      text: '蜀冈官道那个想投军的少年回家侍母去了，一路拉着脸；他娘逢人却道，多亏一位好心公子相劝。' },
    { if: { flag: 'gd_chu' },
      text: '听说蜀冈官道有位公子出了药钱，劝下了那个要投军的少年，他娘的药也抓上了。' },
    { if: { flag: 'gd_bao' },
      text: '蜀冈官道募兵的队伍开拔北上，队里有个半大少年，是位公子代他画的押。' },
    { if: { flag: 'jw_mingce' },
      text: '募兵校尉的名册上添了个扬州后生的名字，校尉说今年的名额，比往年紧了一倍。' }
  ]
};

export default pack;
