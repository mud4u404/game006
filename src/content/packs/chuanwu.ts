import type { ContentPack, FoeDef, NpcDef, RoomDef } from '../types';

/**
 * 扬州 · 虹桥旧船坞「湖底水鬼」（Issue #83）。
 * 白天听传说、细看物证，夜里才见得到「水鬼」——是盐课底下讨生活的穷盐丁。
 * 四种处置各有代价：报官、通漕帮、放过、勒索。
 */

const ROOMS: RoomDef[] = [
  {
    id: 'yz_chuanwu', name: '虹桥船坞', area: '瘦西湖 · 虹桥', region: 'yz', t: 10, map: [34, 32],
    desc: [
      { if: { hour: { from: 5, to: 18 } },
        text: '虹桥底下是一片废弃的旧船坞，半沉的破船歪在泥里，桅杆斜指着天。日头底下水光粼粼，看什么都是明明白白，只有船坞深处黑洞洞的。' },
      { text: '夜里虹桥底下黑得像一口锅。旧船坞的水面漆黑发亮，风吹过破桅杆，呜呜地响。偶尔「咕咚」一声，不知是什么落了水。' }
    ],
    npcs: [
      { id: 'cw_laotou', if: { hour: { from: 5, to: 18 } } },
      { id: 'cw_shuigui', if: { hour: { from: 19, to: 5 }, notFlag: 'cw_gone' } }
    ],
    objs: ['cw_chenchuan', 'cw_jiaoyin', 'cw_youhua'],
    exits: [['岸', 'hu', '桥']],
    road: '你沿着瘦西湖的湖岸往虹桥走，水汽扑面而来……',
    onEnter: [
      { if: { notFlag: 'cw_seen', hour: { from: 19, to: 5 } },
        do: [
          { type: 'flag', flag: 'cw_seen' },
          { type: 'feed', tag: '江湖', text: '夜里路过虹桥船坞，湖面上「咕咚」一声——湖边人都说，这一带有水鬼。' }
        ] },
      { if: { notFlag: 'cw_seen' },
        do: [
          { type: 'flag', flag: 'cw_seen' },
          { type: 'feed', tag: '江湖', text: '虹桥底下的旧船坞荒了好几年。守桥的老头说，这一带湖里有水鬼。' }
        ] }
    ]
  }
];

const NPCS: NpcDef[] = [
  {
    id: 'cw_laotou', name: '守桥老头', ini: '桥', tone: 'gray', brief: '讲着水鬼',
    look: '干瘦的老头，披一件油亮的旧棉袄，守着桥头的火盆。说起水鬼，唾沫星子横飞。',
    verbs: ['交谈', '观察', '细问'],
    actions: {
      交谈: [
        { if: { notFlag: 'cw_pressed' },
          text: '「那水鬼青黑色的背，水里来水里去，换气都不带响的！」老头唾沫横飞，「三年了，桥底下淹过的醉汉，没有五个也有八个——官府都不敢管！」' },
        { text: '「老头子夜里从不靠桥太近。」他忽然改口，往火盆边缩了缩，「你自便，你自便。」' }
      ],
      观察: [{ text: '火盆边烤着一双干布鞋——守桥的夜里换湿的穿？他的眼睛躲着湖面，手上搓着两个核桃，咯咯地响。' }],
      细问: [
        { if: { notFlag: 'cw_pressed' },
          text: '「你说他换气不带响？」你追了一句，「他既是鬼，何必换气？」老头张口结舌，半晌憋出一句：「他……他每夜都在桥底第三根桩子底下换气，我、我瞧见过两回！」话说到这份上，老头自己把底漏了：水鬼要换气，就不是鬼——是活人，而且有固定的气口。',
          do: [
            { type: 'flag', flag: 'cw_pressed' },
            { type: 'flag', flag: 'cw_qikou' }
          ] },
        { text: '「不知道，不知道，一概不知道。」老头把脑袋埋进了棉袄领子里。' }
      ]
    }
  },
  {
    id: 'cw_shuigui', name: '水鬼', ini: '鬼', tone: 'red', brief: '水中黑影',
    look: '一具湿淋淋的黑影从水里探出半身，斗笠压得很低，手里一柄鱼叉。斗笠底下，只看得见一张晒得黑瘦的脸。',
    altName: { if: { flag: 'cw_zhenxiang' }, name: '盐丁莫六' },
    // 揭了底（知道他是人不是鬼）才有这四条路，选过一条就收起（审查 B17：一直挂着，还剧透了「他是活人」）
    verbs: ['交谈', '观察', '动手', ...(['报官', '通帮', '放过', '勒索'] as const).map(verb => ({ verb, if: { flag: 'cw_zhenxiang', notFlag: 'cw_done' } }))],
    actions: {
      交谈: [
        { if: { flag: 'cw_kanguo', notFlag: 'cw_zhenxiang' },
          text: '你点破了他：水下的「鬼」要换气，湖面的油花是盐卤，沉船里码的是盐——「鬼」再厉害，也得吃饭。水里的人半晌没作声，末了闷闷地说：「……盐课太重，一家人吃不起官盐。夜里驮两包私盐，换几文嚼用。公子要报官，莫六没二话；只求等今夜这趟走完。」',
          do: [
            { type: 'flag', flag: 'cw_zhenxiang' },
            { type: 'feed', tag: '江湖', text: '虹桥下的「水鬼」原是个穷盐丁，官盐吃不起，替人夜里沉盐换几文嚼用。' }
          ] },
        { if: { flag: 'cw_done' },
          text: '「公子说笑了。」他往水里缩了缩，「今夜的事，今夜就完了。」' },
        { text: '「夜里的湖，不是闲逛的地方。」那声音发闷，像隔着一层水，人影一晃就没了。' }
      ],
      观察: [{ text: '斗笠底下的脸黑瘦，手腕上一圈勒痕——常年背着什么沉东西留下的。他的鱼叉倒是好叉，叉头磨得雪亮。' }],
      动手: [{ do: [{ type: 'fight', foe: 'cw_shuigui' }] }],
      报官: [
        { if: { flag: 'cw_zhenxiang', notFlag: 'cw_done' },
          text: '你让他去府衙自首，指望周捕头念他穷苦，从轻发落。他磕了个头，天亮前真去了府衙——盐窝子被抄了，几个盐丁四散奔逃，倒是没人为难他一家老小。',
          do: [
            { type: 'flag', flag: 'cw_baoguan' }, { type: 'flag', flag: 'cw_gone' }, { type: 'flag', flag: 'cw_done' },
            { type: 'feed', tag: '江湖', text: '虹桥船坞的私盐窝子被抄了，带头的盐丁去府衙自首。' }
          ] },
        { text: '「公子说笑了。」' }
      ],
      通帮: [
        { if: { flag: 'cw_zhenxiang', notFlag: 'cw_done' },
          text: '你把这门夜里的生意，透给了漕帮行船的弟兄。半个月后，船坞的沉船旁泊了漕帮的船——盐还是那些盐，苦力还是那些苦力，只是工钱多了一文，腰杆直了一分。莫六朝你磕头，磕得咚咚响。',
          do: [
            { type: 'flag', flag: 'cw_cao' }, { type: 'flag', flag: 'cw_gone' }, { type: 'flag', flag: 'cw_done' },
            { type: 'feed', tag: '江湖', text: '虹桥船坞的私盐营生，叫漕帮接了手。盐丁们的工钱，多了一文。' }
          ] },
        { text: '「公子说笑了。」' }
      ],
      放过: [
        { if: { flag: 'cw_zhenxiang', notFlag: 'cw_done' },
          text: '「今夜没见过你，往后也没有。」你转身走了。湖面上，那驮盐的人影朝你深深弯了一下腰。',
          do: [
            { type: 'flag', flag: 'cw_fang' }, { type: 'flag', flag: 'cw_done' },
            { type: 'feed', tag: '江湖', text: '你放过了虹桥下的「水鬼」。湖里的事，你知道，他知道。' }
          ] },
        { text: '「公子高义。」' }
      ],
      勒索: [
        { if: { flag: 'cw_zhenxiang', notFlag: 'cw_done' },
          text: '你伸出手道：「留下一文，今夜的事便不声张。」水里的人沉默着，摸出一枚湿铜钱放在你掌心。你攥住铜钱，转身上岸。',
          do: [
            { type: 'flag', flag: 'cw_qiao' }, { type: 'flag', flag: 'cw_done' },
            { type: 'eming', delta: 5 }, { type: 'silver', delta: 1 },
            { type: 'feed', tag: '江湖', text: '你从虹桥下的穷盐丁手里勒索了一文钱，湖边的船家也听说了。' }
          ] },
        { text: '莫六缩在水里道：「那一文已经给过了。」' }
      ]
    }
  },
  {
    id: 'cw_chenchuan', name: '沉船', obj: true, icon: 'boat', brief: '半沉在泥里',
    look: '一条废船半沉在泥里，桅杆斜指着天，船舱黑洞洞的，看不真切。',
    verbs: ['观察', '细看'],
    actions: {
      细看: [
        { if: { attr: { key: '悟性', atLeast: 23 } },
          text: '你眯眼细看：沉船舱里码着几口木箱，箱缝里渗出白花花的盐卤。好端端的沉船，装盐做什么？',
          do: [{ type: 'flag', flag: 'cw_kanguo' }] },
        { text: '沉船半沉在泥里，船舱黑洞洞的，水汽里隐隐有股咸腥气。' }
      ]
    }
  },
  {
    id: 'cw_jiaoyin', name: '湿脚印', obj: true, icon: 'stele', brief: '从水边来',
    look: '泥滩上一串湿脚印，从水边一直延伸到桥底，又折返回去，来来回回几十趟。',
    verbs: ['细看'],
    actions: {
      细看: [
        { if: { attr: { key: '悟性', atLeast: 23 } },
          text: '你蹲下细看：脚印赤着脚，可脚踝上有一圈勒痕——是常年绑着什么沉东西留下的。脚印尽头是桥底第三根桩子，桩子上的水草被蹭得精光：那底下，是换气的气口。',
          do: [
            { type: 'flag', flag: 'cw_qikou' },
            { type: 'flag', flag: 'cw_kanguo' }
          ] },
        { text: '脚印泥泞模糊，你只看出是赤脚，来来回回几十趟，终点是桥底第三根桩子。',
          do: [{ type: 'flag', flag: 'cw_kanguo' }] }
      ]
    }
  },
  {
    id: 'cw_youhua', name: '油花', obj: true, icon: 'stele', brief: '水面浮光',
    look: '船坞一角的水面上浮着一层油花，日头底下泛着虹彩。',
    verbs: ['细看'],
    actions: {
      细看: [
        { if: { attr: { key: '悟性', atLeast: 23 } },
          text: '你凑近了闻：油花底下透出盐卤的苦涩味——这不是船漏的油，是盐包浸出来卤水。谁家好端端的，往船坞里沉盐？',
          do: [{ type: 'flag', flag: 'cw_kanguo' }] },
        { text: '水面的油花黑黢黢的，像船漏的油，看不出名堂。' }
      ]
    }
  }
];

const GUARD: FoeDef = {
  id: 'cw_shuigui', name: '水鬼', title: '湖底来客', ini: '鬼', tone: 'red',
  weapon: '鱼叉', ws: '叉', tag: '好手',
  rank: 0, build: 'outer', weak: 0.8,
  moves: ['水底捞月', '浊浪拍岸', '翻波叉', '鬼探首'],
  flourish: ['叉尖带起的水珠还没落地', '湖面被搅出一圈圈油花', '斗笠底下的眼睛盯着你', '黑影在水中一折'],
  tells: [
    { name: '水底捞月', text: '「水鬼」矮身一叉，自下而上撩起，又快又贼，直奔咽喉……', dom: 'li', after: '叉尖带起的水珠还没落地！' },
    { name: '浊浪拍岸', text: '「水鬼」抡叉横扫，带起半人高的水浪，劈头盖脸砸了下来……', dom: 'su', after: '水浪糊了你一脸！' }
  ],
  asides: ['「水鬼」的脚在水里扑腾，搅起一圈圈油花。', '远处更夫的梆子声隔着湖面传来。'],
  opening: ['叉势一滑', '换气急了', '脚下一滑踩上淤泥'],
  intro: '「水鬼」从水里冒出来，手中鱼叉一横，斗笠下的脸看不清楚：「挡人财路，如杀人父母！」',
  win: '「水鬼」的鱼叉脱手沉底。你扯下那颗湿淋淋的斗笠——底下是张晒得黑瘦的人脸，哪里是什么鬼。',
  lose: '你眼前一黑，被按进水里灌了半肚子湖水。「水鬼」把你丢上岸，收了鱼叉，缩回黑暗里去了。',
  results: {
    win: { tag: '好手 · 胜', title: '水鬼现形', button: '扯下斗笠',
      story: '你扯下那颗湿淋淋的斗笠——底下是张晒得黑瘦的人脸。湖底哪有什么水鬼，不过是个背着一家人嚼用的穷盐丁。他跪在泥水里，一句话也说不出来。',
      do: [
        { type: 'flag', flag: 'cw_zhenxiang' },
        { type: 'feed', tag: '江湖', text: '虹桥下的「水鬼」被你按在了泥里——扯下斗笠，是个黑瘦的穷盐丁。' }
      ],
      // 胜负以后：和他身上的「报官、通帮、放过、勒索」是同一件事，选过一次就了结（cw_done）
      after: {
        plea: '莫六跪在泥水里，浑身发抖：「小的……小的家里还有一家老小等着吃饭。盐课太重，夜里驮两包私盐，只是想多挣几个钱……」',
        opts: [
          { label: '让他去府衙自首', sub: '盐窝子要抄', if: { notFlag: 'cw_done' },
            say: '「天亮前去府衙，自己说清楚。周捕头会念你穷苦。」他磕了个头，一步一回头地上了虹桥。',
            do: [{ type: 'flag', flag: 'cw_baoguan' }, { type: 'flag', flag: 'cw_gone' }, { type: 'flag', flag: 'cw_done' },
              { type: 'feed', tag: '江湖', text: '虹桥船坞的私盐窝子被抄了，带头的盐丁去府衙自首。' }],
            later: '府衙怎么判、盐窝子怎么了结，城里的传闻会告诉你。' },
          { label: '把这门营生透给漕帮', sub: '湖上改姓漕', if: { notFlag: 'cw_done' },
            say: '「漕帮的船夜里也走这湖，你们的工钱，我替你去说。」莫六愣住了，半晌才咚咚磕起头来。',
            do: [{ type: 'flag', flag: 'cw_cao' }, { type: 'flag', flag: 'cw_gone' }, { type: 'flag', flag: 'cw_done' },
              { type: 'feed', tag: '江湖', text: '虹桥船坞的私盐营生，叫漕帮接了手。盐丁们的工钱，多了一文。' }],
            later: '漕帮会记下这份人情，湖上的盐丁也会。' },
          { label: '放他回家', sub: '侠义 +3', if: { notFlag: 'cw_done' },
            say: '你把鱼叉从泥里拔出来，丢还给他：「回家去吧。今夜没见过你。」他捧着鱼叉，跪着朝你磕了三个头。',
            do: [{ type: 'xia', delta: 3 }, { type: 'flag', flag: 'cw_fang' }, { type: 'flag', flag: 'cw_done' },
              { type: 'feed', tag: '江湖', text: '你放过了虹桥下的「水鬼」。湖里的事，你知道，他知道。' }],
            later: '湖上的事，往后也许他肯告诉你一两句。' },
          { label: '勒索一文钱', sub: '银两 +1 文 · 恶名 +5', if: { notFlag: 'cw_done' },
            say: '你伸出手道：「拿一文来，今夜便放你走。」莫六摸出一枚铜钱递过来，你接了，挥手叫他退下。',
            do: [{ type: 'flag', flag: 'cw_qiao' }, { type: 'flag', flag: 'cw_done' }, { type: 'eming', delta: 5 }, { type: 'silver', delta: 1 },
              { type: 'feed', tag: '江湖', text: '你从虹桥下的穷盐丁手里勒索了一文钱，湖边的船家也听说了。' }],
            later: '莫六没敢吭声，撑着鱼叉爬回了船上。湖边的船家远远看着。' },
          { label: '下杀手', sub: '恶名 +3', if: { notFlag: 'cw_done' },
            say: '你一剑结果了他。湖面上冒了几个水泡，又静了下来。',
            title: '虹桥下的一条人命',
            story: '你扯下那颗湿淋淋的斗笠，底下是张晒得黑瘦的人脸。湖底哪有什么水鬼，不过是个背着一家人嚼用的穷盐丁。如今，他沉在了湖底。',
            do: [{ type: 'eming', delta: 3 }, { type: 'flag', flag: 'cw_sha' }, { type: 'flag', flag: 'cw_gone' }, { type: 'flag', flag: 'cw_done' }],
            later: '虹桥边的渔家会说起这件事。他家里还有人等他回去。' }
        ]
      } },
    lose: { tag: '好手 · 负', title: '水底失手', growth: true, button: '爬上岸',
      story: '你在泥滩上醒来，灌了半肚子湖水。「水鬼」收了你的兵器凭证，声音闷闷地传来：「夜里的湖，不是你该来的地方。」',
      do: [{ type: 'heal', hpAtLeast: 0.3 }] },
    flee: { tag: '好手 · 走', title: '夺路而逃', button: '上岸',
      story: '你虚晃一招，蹿上虹桥的石阶。身后水声一响，那「水鬼」已缩回湖里去了，只留下一圈圈油花。' }
  },
  prep: [
    { if: { flag: 'cw_qikou' }, atk: 0.85, big: 0.85,
      text: '你记着老头漏嘴的话，堵在桥底第三根桩子——他换气的气口边上。他一头冒出来，正撞在你剑尖前。',
      story: '水鬼换气换到一半，撞上了守株待兔的人。' }
  ]
};

const pack: ContentPack = {
  rooms: ROOMS,
  npcs: NPCS,
  foes: [GUARD],
  news: [
    { if: { flag: 'cw_baoguan' },
      text: '虹桥下的「水鬼」原是私盐的盐丁，叫一名年轻公子送去府衙自首了。盐窝子抄了，湖上清净了。', who: ['渔家', '船夫', '捕快'], about: 'you' },
    { if: { flag: 'cw_cao' },
      text: '漕帮的船近来夜里泊在虹桥下。老漕工说，这湖里的营生，如今姓了漕。', who: ['渔家', '船夫', 'dong'] },
    { if: { flag: 'cw_fang' },
      text: '虹桥下的「水鬼」不闹了。渔家说，是一位过路的少侠放了他一马，那盐丁如今白天在码头扛活。', who: ['渔家', '船夫', '脚夫'], about: 'you' },
    { if: { flag: 'cw_sha' },
      text: '虹桥边的渔家说，那扮水鬼的盐丁叫人杀了。他家里还有老娘和两个孩子，天天在桥头等他回来。', who: ['渔家', '船夫', '脚夫'], about: 'you' },
    { if: { flag: 'cw_qiao' },
      text: '虹桥下那穷盐丁叫人勒索了一文钱。过路的船家看见了，背地里骂那人缺德。', who: ['渔家', '船夫', '更夫'] }
  ]
};

export default pack;
