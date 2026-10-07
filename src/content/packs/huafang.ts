import type { ContentPack, FoeDef, NpcDef, QuestDef, RoomDef } from '../types';

/** 瘦西湖画舫奇遇：云娘被汪家少爷纠缠 */

const ROOMS: RoomDef[] = [
  {
    id: 'huafang', name: '画舫', area: '瘦西湖 · 湖上月', region: 'yz', t: 5, map: [34, 70],
    desc: [
      { if: { hour: { from: 5, to: 18 } },
        text: '一条精致的花篷画舫泊在湖心，湖面上飘着细碎的荷花香。船头挂着半幅写了「云娘」二字的绸帘，几位船娘正擦洗着舷窗。' },
      { text: '月色如银，花篷画舫泊在湖心。篷内透出几盏宫灯的昏黄，隐约能听见丝竹声和酒杯的叮当。' }
    ],
    npcs: ['yunnian', { id: 'wangshao', if: { notFlag: 'huafang_done', hour: { from: 19, to: 5 } } }],
    exits: [['岸', 'hu', '舟']],
    road: '你搭上一条小船，橹声欸乃，朝湖心划去……'
  }
];

const NPCS: NpcDef[] = [
  {
    id: 'yunnian', name: '云娘', ini: '云', tone: 'jade', brief: '低声唱着',
    look: '一袭素白的舞衣，鬓边斜插一朵晚荷。歌声虽低，却带着一丝说不清的倦意。',
    verbs: ['交谈', '观察', '赠礼', '还债'],
    gift: '云娘接过杏花，愣了一下，轻轻别在鬓边：「多谢公子。」',
    actions: {
      观察: [{ text: '她腰间挂着一把旧琵琶，弦上沾了点酒渍。左手中指缠着一圈褪色的蓝布。' }],
      交谈: [
        { if: { flag: 'huafang_good' },
          text: '云娘抱着琵琶，眼中带着笑意：「公子上次为云娘出头，云娘没齿难忘。日后若有需要，尽管开口。」',
          do: [{ type: 'rel', npc: 'yunnian', value: '知恩图报', from: ['素不相识', '点头之交', '心存感激'] }] },
        { if: { flag: 'huafang_betray' },
          text: '云娘看见你，身子一颤，别过脸去：「公子……云娘还有事先走了。」',
          do: [{ type: 'rel', npc: 'yunnian', value: '心存芥蒂' }] },
        { if: { flag: 'huafang_started' },
          text: '云娘低声道：「那汪家大少还在画舫上呢，公子千万小心。」' },
        { text: '云娘抬眼看了看篷外，声音低得像蚊子哼：「公子……我欠了汪家八十文的债，他说今夜不还钱，就要把我卖去青楼。」',
          do: [
            { type: 'rel', npc: 'yunnian', value: '点头之交', from: ['素不相识'] },
            { type: 'quest', id: 'side_huafang', stage: 0 },
            { type: 'flag', flag: 'huafang_started' },
            { type: 'feed', tag: '江湖', text: '云娘欠了汪家少爷八十文，今晚要么还钱，要么被卖去青楼。' }
          ] }
      ],
      还债: [
        { if: { notFlag: 'huafang_started' }, text: '云娘怔了一下：「公子说笑了，云娘没什么债好还。」' },
        { if: { any: [{ flag: 'huafang_good' }, { flag: 'huafang_betray' }] },
          text: '云娘摇头：「公子已经帮过云娘了，这债……不用还了。」' },
        { if: { silver: 80 },
          text: '你摸出八十文递给云娘：「这是我身上所有的钱，你拿去还债吧。」云娘的眼泪「唰」地流下来，双手接过。',
          do: [
            { type: 'silver', delta: -80 },
            { type: 'flag', flag: 'huafang_pay' }, { type: 'flag', flag: 'huafang_good' },
            { type: 'flag', flag: 'huafang_done' }, { type: 'quest', id: 'side_huafang', stage: 2 },
            { type: 'xia', delta: 5 },
            { type: 'feed', tag: '江湖', text: '你替云娘还了八十文债，汪少爷只得悻悻而去。' }
          ] },
        { text: '你摸了摸钱袋，里面远没有八十文。云娘看见，勉强笑了笑：「公子的心意云娘领了。」' }
      ]
    }
  },
  {
    id: 'wangshao', name: '汪家少爷', ini: '汪', tone: 'red', brief: '摇着折扇',
    look: '锦袍玉带，腰间挂着一块羊脂玉佩，手里折扇摇得正欢。身后立着一个膀大腰圆的护院。',
    verbs: ['交谈', '观察', '动手'],
    actions: {
      观察: [{ text: '护院腰上别着一柄厚背单刀，刀鞘磨得发亮。汪少爷的鞋尖沾着一点没擦干净的湖泥。' }],
      交谈: [
        { if: { flag: 'boss' },
          text: '汪少爷一眼瞥见你腰间的半块玉佩，折扇「啪」地合上：「渡……渡口一剑？」他脸色一白，转身就走，护院赶紧跟上。',
          do: [
            { type: 'flag', flag: 'huafang_nianhao' }, { type: 'flag', flag: 'huafang_good' },
            { type: 'flag', flag: 'huafang_done' },
            { type: 'quest', id: 'side_huafang', stage: 2 },
            { type: 'xia', delta: 5 },
            { type: 'feed', tag: '江湖', text: '汪家少爷认出了「渡口一剑」的名号，当场灰溜溜地走了。' }
          ] },
        { text: '汪少爷斜眼打量你：「你算什么东西？少管闲事。」他往后一招：「来啊，把云娘给我架上岸去！」',
          do: [
            { type: 'flag', flag: 'huafang_provoke' },
            { type: 'feed', tag: '江湖', text: '汪少爷的护院已经按捺不住，你若再不出手，云娘就要被架走了。' }
          ] }
      ],
      动手: [{
        do: [{ type: 'flag', flag: 'huafang_provoke' }, { type: 'fight', foe: 'huafang_guard' }]
      }]
    }
  }
];

const GUARD_FOE: FoeDef = {
  id: 'huafang_guard', name: '汪家护院', title: '拳头上有老茧', ini: '护', tone: 'red',
  weapon: '厚背单刀', ws: '刀', tag: '好手',
  hp: 1400, atk: [32, 52], big: 130,
  moves: ['泼风刀', '拦腰一斩', '夜战八方', '猛虎下山'],
  flourish: ['刀势沉猛', '借醉力劈', '脚下踉跄却刀刀要命', '刀光在宫灯下一闪'],
  tells: [
    { name: '醉后疯砍', text: '护院眼睛血红，双手握刀高举过顶，酒气扑面而来……',
      pw: { li: 38, su: 22, qiao: 22, xi: 18 }, after: '他自己脚下先踉跄了一步！' },
    { name: '拦腰横扫', text: '护院借着醉意踉跄退了半步，忽然一刀横扫，带着风声卷向你的腰肋……',
      pw: { li: 22, su: 40, qiao: 35, xi: 20 }, after: '船板被劈出一道裂口！' }
  ],
  asides: ['云娘捂住嘴，琵琶「哗啦」掉在地上。', '汪少爷脸都白了：「上！给我上！」'],
  opening: ['刀势过老', '脚下打滑', '酒后力竭，收刀慢了半拍'],
  intro: '护院拔出厚背单刀，醉眼朦胧地盯着你：「小子……敢跟汪家较劲？」',
  win: '护院踉跄了两步，单刀「当啷」掉进湖里。他捂着脸，被汪少爷连踢带踹地拖走了。',
  lose: '你只觉左肩一凉，整个人栽倒在木板上。耳中最后听见汪少爷的冷笑：「不知死活的东西。」',
  results: {
    win: { tag: '好手 · 胜', title: '力退护院', button: '扶云娘起来',
      story: '护院被拖走了，湖面归于寂静。云娘扶着船舷，一脸泪痕地看着你。',
      do: [
        { type: 'flag', flag: 'huafang_force' }, { type: 'flag', flag: 'huafang_good' },
        { type: 'flag', flag: 'huafang_done' }, { type: 'quest', id: 'side_huafang', stage: 2 },
        { type: 'xia', delta: 10 },
        { type: 'feed', tag: '江湖', text: '你在画舫上力退汪家护院，云娘的债也就不用还了。' }
      ] },
    lose: { tag: '好手 · 负', title: '不敌护院', growth: true, button: '强忍起身',
      story: '汪少爷临走踹了你一脚：「看你下次还敢多管闲事不。」你爬起来时，肩膀上的伤口还在淌血。',
      do: [
        { type: 'flag', flag: 'huafang_force_lose' },
        { type: 'heal', hpAtLeast: 0.3 },
        { type: 'silver', delta: -15 },
        { type: 'feed', tag: '江湖', text: '你在画舫上败给了汪家护院，云娘还是被带走了……' }
      ] }
  }
};

const FOES: FoeDef[] = [GUARD_FOE];

const QUESTS: QuestDef[] = [
  { id: 'side_huafang', name: '奇遇 · 画舫云娘', stages: [
    { title: '打听湖上画舫的事', to: 'huafang' },
    { title: '了结画舫上的事' },
    { title: '画舫云娘 · 完' }
  ] }
];

const pack: ContentPack = {
  rooms: ROOMS,
  npcs: NPCS,
  foes: FOES,
  quests: QUESTS,
  news: [
    { if: { flag: 'huafang_pay' },
      text: '瘦西湖上有条画舫，那歌女的债不知被谁悄悄还了，汪少爷听说后，一天没说话。' },
    { if: { flag: 'huafang_force' },
      text: '听说昨夜有人在画舫上把汪家的护院打进了湖里，汪少爷抱着脑袋跑了。' },
    { if: { flag: 'huafang_force_lose' },
      text: '汪家最近招了个新护院，刀比之前那个还重，据说是为了对付画舫上那件事。' },
  ]
};

export default pack;
