import type { ContentPack, FoeDef, NpcDef, QuestDef, RoomDef } from '../types';

/** 瘦西湖画舫奇遇（重做，Issue #45）：云娘身契抵债，四种解法各有代价，打输与恶路都留在世界里 */

const ROOMS: RoomDef[] = [
  {
    id: 'huafang', name: '画舫', area: '瘦西湖 · 湖上月', region: 'yz', t: 5, map: [34, 70],
    desc: [
      { if: { notFlag: 'huafang_gone', hour: { from: 5, to: 18 } },
        text: '一条精致的花篷画舫泊在湖心，湖面上飘着细碎的荷花香。船头挂着半幅写了「云娘」二字的绸帘，几位船娘正擦洗着舷窗。' },
      { if: { notFlag: 'huafang_gone' },
        text: '月色如银，花篷画舫泊在湖心。篷内透出几盏宫灯的昏黄，隐约能听见丝竹声，还有一个女子的低唱。' },
      { if: { hour: { from: 5, to: 18 } },
        text: '画舫静静泊在湖心。船头空落落的，那半幅「云娘」的绸帘摘了下来，船娘们埋头擦洗舷窗，谁也不抬头。' },
      { text: '画舫泊在湖心，篷内宫灯还亮着，丝竹声却停了。船头空落落的，只剩湖水一下一下拍着船板。' }
    ],
    npcs: [{ id: 'yunnian', if: { notFlag: 'huafang_gone' } }, { id: 'wangshao', if: { notFlag: 'huafang_done', hour: { from: 19, to: 5 } } }],
    exits: [['岸', 'hu', '舟']],
    road: '你搭上一条小船，橹声欸乃，朝湖心划去……'
  }
];

const NPCS: NpcDef[] = [
  {
    id: 'yunnian', name: '云娘', ini: '云', tone: 'jade', brief: '低声唱着',
    look: '青布衣裙浆洗得发白，鬓边一朵晚荷。腰间挂着一把旧琵琶，弦上沾了点酒渍，左手中指缠着一圈褪色的蓝布。',
    verbs: ['交谈', '观察', '赠礼', '解囊', '劝离'],
    gift: '云娘双手接过杏花，愣了一下，轻轻别在鬓边：「公子费心。奴家没什么好回的，回头给公子唱支新曲。」',
    likes: ['flower'],
    actions: {
      交谈: [
        { if: { flag: 'huafang_pay' },
          text: '云娘把琵琶拢在怀里，勉强笑了笑：「利钱是清了，可身契还押在汪家。公子莫笑奴家不知足——只是下一期呢？奴家夜夜都在想。」',
          do: [{ type: 'rel', npc: 'yunnian', value: '相谈甚欢', from: ['素不相识', '点头之交'], note: '画舫上的歌女，心存感激' }] },
        { if: { flag: 'huafang_force' },
          text: '云娘朝你福了一礼，眼里又是敬又是怕：「汪家的护院都近不得公子的身。只是汪少爷临走脸色很不好，公子往后在扬州行船走桥，多个心眼。」',
          do: [{ type: 'rel', npc: 'yunnian', value: '相谈甚欢', from: ['素不相识', '点头之交'], note: '画舫上的歌女，说要知恩图报' }] },
        { if: { flag: 'huafang_nianhao' },
          text: '云娘抱着琵琶，声音低下去：「公子名号一报，汪少爷是走了，走前却撂下话，说下月的利钱翻倍。奴家多谢公子——只是这份愁，一时半会儿散不了。」' },
        { if: { notFlag: 'huafang_started', hour: { from: 19, to: 5 } },
          text: '云娘往篷外看了一眼，声音压得极低：「奴家的爹生前替汪家盐号记账，亏空了盐课银子，人没了，债留下。奴家押在船上唱曲抵债，身契在汪少爷手里——这一期利钱八十文，他今晚就在船上，收不着就要带人上岸抵债。」',
          do: [
            { type: 'rel', npc: 'yunnian', value: '点头之交', from: ['素不相识'] },
            { type: 'flag', flag: 'huafang_started' },
            { type: 'quest', id: 'side_huafang', stage: 1 },
            { type: 'feed', tag: '江湖', text: '画舫歌女云娘，她爹亏空了盐课银子，身契押在汪家抵债；这一期利钱八十文，汪少爷今夜就在船上讨。' }
          ] },
        { if: { notFlag: 'huafang_started' },
          text: '云娘的手指在弦上停了停：「奴家的爹生前替汪家盐号记账，亏空了盐课银子，人没了，债留下。奴家押在船上唱曲抵债，身契在汪少爷手里。这一期利钱八十文，入夜他就要来收，收不着，就要带奴家上岸抵债。」',
          do: [
            { type: 'rel', npc: 'yunnian', value: '点头之交', from: ['素不相识'] },
            { type: 'flag', flag: 'huafang_started' },
            { type: 'quest', id: 'side_huafang', stage: 0 },
            { type: 'feed', tag: '江湖', text: '画舫歌女云娘，她爹亏空了盐课银子，身契押在汪家抵债；这一期利钱八十文，汪少爷入夜就来收。' }
          ] },
        { if: { quest: { id: 'side_huafang', is: 0 }, hour: { from: 5, to: 18 } },
          text: '云娘摇头苦笑：「八十文，奴家唱一夜也不过几十文。公子若肯管，入夜后再来罢——反正，他总是要来的。」',
          do: [
            { type: 'quest', id: 'side_huafang', stage: 1 }
          ] },
        { if: { quest: { id: 'side_huafang', is: 0 } },
          text: '云娘朝篷内努了努嘴，声音发颤：「汪少爷就在前头吃酒。公子既要管，这就……就在今夜了。」',
          do: [
            { type: 'quest', id: 'side_huafang', stage: 1 }
          ] },
        { if: { hour: { from: 19, to: 5 } },
          text: '云娘低声道：「那护院刀沉得很，汪少爷又带着酒。公子……万万小心。」' },
        { text: '云娘望着湖面，轻轻拨了一下弦：「公子入夜再来罢。白日里船娘多眼杂，奴家不好多说。」' }
      ],
      解囊: [
        { if: { notFlag: 'huafang_started' },
          text: '你摸出一把钱递过去。云娘往后退了半步，把手缩进袖子里：「公子的心意，奴家心领了。素不相识的，这钱奴家不能收。」' },
        { if: { flag: 'huafang_done' },
          text: '「公子已经帮过奴家了，这钱万万不能再收。」云娘把你的手推了回去。' },
        { if: { silver: 80 },
          text: '你把八十文拍在她手心里：「拿去，把这一期的利钱清了。」云娘的手抖起来，眼泪「唰」地落下来，朝你深深福了一礼：「公子……奴家无以为报。只是身契还在汪家，下一期的利钱，奴家还不知道在哪里。」',
          do: [
            { type: 'silver', delta: -80 },
            { type: 'flag', flag: 'huafang_pay' }, { type: 'flag', flag: 'huafang_good' },
            { type: 'flag', flag: 'huafang_done' },
            { type: 'quest', id: 'side_huafang', stage: 2 },
            { type: 'xia', delta: 5 },
            { type: 'feed', tag: '江湖', text: '你替云娘付了这一期八十文的利钱。汪家收了钱，身契却还捏在他们手里。' }
          ] },
        { text: '你摸了摸钱袋，凑不够八十文。云娘瞧见了，勉强笑道：「公子的心，奴家领了。」' }
      ],
      劝离: [
        { if: { flag: 'huafang_done' },
          text: '「多谢公子挂心。债的事，已经了了。」云娘福了一礼，不再多言。' },
        { if: { flag: 'huafang_deal' },
          text: '你把汪家的话说了：上岸画押，利钱一笔勾销。云娘捏着琵琶的手指一点点收紧，半晌，两行泪落了下来：「奴家知道了。公子的六十文，请拿去——只求公子往后听了这段曲子，别想起今日。」',
          do: [
            { type: 'silver', delta: 60 },
            { type: 'eming', delta: 10 },
            { type: 'flag', flag: 'huafang_betray' }, { type: 'flag', flag: 'huafang_gone' },
            { type: 'flag', flag: 'huafang_done' },
            { type: 'quest', id: 'side_huafang', stage: 2 },
            { type: 'rel', npc: 'yunnian', value: '心存芥蒂', from: ['素不相识', '点头之交'] },
            { type: 'feed', tag: '江湖', text: '画舫的歌女跟汪家的人上岸画押去了，说是抵债。船头那半幅「云娘」的绸帘，也摘了下来。' }
          ] },
        { if: { flag: 'huafang_started' },
          text: '云娘拉住你的袖子，声音发颤：「公子，奴家没有别的路了。八十文……公子救救奴家。」' },
        { text: '「劝奴家离船？」云娘怔了怔，随即摇头，「公子说笑了。奴家的身契在汪家，离了这条船，奴家连落脚的地方都没有。」' }
      ]
    }
  },
  {
    id: 'wangshao', name: '汪家少爷', ini: '汪', tone: 'red', brief: '摇着折扇',
    look: '锦袍玉带，腰间一块羊脂玉佩，折扇摇得正欢，一口徽州腔。身后立着个膀大腰圆的护院，腰里别着厚背单刀。他是盐商汪家的独子，画舫这一年来的典账，都经他的手。',
    verbs: ['交谈', '观察', '接事', '动手'],
    actions: {
      观察: [{ text: '护院的刀鞘磨得发亮。汪少爷拇指上套着个翡翠扳指，正一下一下磕着扇骨，像是算着什么账。' }],
      交谈: [
        { if: { flag: 'huafang_deal' },
          text: '「劝好了没有？」汪少爷眉头拧了起来，往湖心啐了一口，「她一个卖唱的，还拿乔不成？六十文，一手交人一手给，本少爷从不含糊。」' },
        { if: { flag: 'boss' },
          text: '汪少爷一眼瞥见你腰间的兵刃，折扇「啪」地合上，勉强拱了拱手：「是……是在下有眼不识泰山。今晚的事，就当没发生过。」他踢醒打盹的护院，自己先跳上接客的小船，躲得远远的——临走却回头剜了云娘一眼。',
          do: [
            { type: 'flag', flag: 'huafang_nianhao' }, { type: 'flag', flag: 'huafang_good' },
            { type: 'flag', flag: 'huafang_done' },
            { type: 'quest', id: 'side_huafang', stage: 2 },
            { type: 'xia', delta: 3 },
            { type: 'feed', tag: '江湖', text: '你报出名号，汪少爷当场认怂，躲去了别的船上——走前却把气撒在了云娘身上，说下月利钱翻倍。' }
          ] },
        { text: '汪少爷折扇一收，斜眼打量你：「哪来的野小子？这是汪家的船，她是汪家押着的人。识相的，一边看曲子去。」' }
      ],
      接事: [
        { if: { flag: 'huafang_deal' },
          text: '「还没劝动？」汪少爷嗑了颗瓜子，「莫非，还要本少爷加钱？」' },
        { text: '汪少爷把你拉到船尾，声音压得只有两个人听得见：「八十文的利钱，本少爷今夜就要个了断。你上去劝她跟本少爷的人上岸，画个押，这六十文就是你的。她上了岸，债就清了，对谁都好。」说着一串铜钱在你眼前晃了晃。',
          do: [{ type: 'flag', flag: 'huafang_deal' }] }
      ],
      动手: [{ do: [{ type: 'fight', foe: 'huafang_guard' }] }]
    }
  }
];

const GUARD_FOE: FoeDef = {
  id: 'huafang_guard', name: '汪家护院', title: '拳头上有老茧', ini: '护', tone: 'red',
  weapon: '厚背单刀', ws: '刀', tag: '好手',
  rank: 0, build: 'outer', weak: 0.9,
  moves: ['泼风刀', '拦腰一斩', '夜战八方', '猛虎下山'],
  flourish: ['刀势沉猛', '借醉力劈', '脚下踉跄却刀刀要命', '刀光在宫灯下一闪'],
  tells: [
    { name: '醉后疯砍', text: '护院眼睛血红，双手握刀高举过顶，酒气扑面而来……',
      dom: 'li', after: '他自己脚下先踉跄了一步！' },
    { name: '拦腰横扫', text: '护院借着醉意踉跄退了半步，忽然一刀横扫，带着风声卷向你的腰肋……',
      dom: 'su', after: '船板被劈出一道裂口！' }
  ],
  asides: ['云娘捂住嘴，琵琶「哗啦」掉在地上。', '汪少爷脸都白了：「上！给我上！」'],
  opening: ['刀势过老', '脚下打滑', '酒后力竭，收刀慢了半拍'],
  intro: '护院拔出厚背单刀，醉眼朦胧地盯着你：「小子……敢跟汪家较劲？」',
  win: '护院踉跄了两步，单刀「当啷」掉进湖里。他捂着脸，被汪少爷连踢带踹地拖走了。',
  lose: '你只觉左肩一凉，整个人栽倒在木板上。耳中最后听见汪少爷的冷笑：「不知死活的东西。架走！」',
  results: {
    win: { tag: '好手 · 胜', title: '力退护院', button: '扶云娘起来',
      story: '护院被拖走后，画舫上静得能听见湖水拍船。云娘抱着琵琶朝你福了一礼。汪少爷扶着船舷直哆嗦，走前撂下一句：「好，好……你等着。」',
      do: [
        { type: 'flag', flag: 'huafang_force' }, { type: 'flag', flag: 'huafang_good' },
        { type: 'flag', flag: 'huafang_grudge' },
        { type: 'flag', flag: 'huafang_done' },
        { type: 'quest', id: 'side_huafang', stage: 2 },
        { type: 'feed', tag: '江湖', text: '你在画舫上力退汪家护院。汪少爷放了狠话走了，这几日怕是不敢再来讨债。' }
      ],
      after: {
        plea: '护院捂着胸口坐倒在船板上，喘着粗气：「好……好功夫。小的不过是吃汪家这碗饭，犯不着把命搭上。」',
        opts: [
          { label: '放他走', sub: '侠义 +10',
            say: '你收了手。他朝你拱一拱手，被汪家的人扶了下去，走到舱门口，又回头看了你一眼。',
            do: [{ type: 'xia', delta: 10 }, { type: 'flag', flag: 'huafang_guard_fang' }],
            later: '他记得你手下留情。汪家的人里，往后也许有一个肯替你说句话。' },
          { label: '问问汪家的底细', sub: '侠义 +10　问出点东西',
            say: '「汪少爷常带人到湖上来闹？」他苦笑一声，压低了嗓子：「少爷看上了谁，谁就得上他的船。云娘不是头一个。汪家在城东盐号里还押着两个，说是抵债。」',
            do: [{ type: 'xia', delta: 10 },
              { type: 'feed', tag: '江湖', text: '汪家护院说：汪少爷看上了谁，谁就得上他的船。汪家在城东盐号里，还押着两个抵债的姑娘。' }],
            later: '城东的盐号，你记下了。' },
          { label: '下杀手', sub: '恶名 +3　汪家告官',
            say: '你一掌拍在他胸口，他哼也没哼一声，便软倒在船板上。画舫上的丝竹声停了，汪少爷的脸白得像纸。',
            title: '画舫上的一条人命',
            story: '护院再也没有起来。汪少爷连滚带爬地上了岸，云娘抱着琵琶，看你的眼神里多了一层怕。湖上的灯一盏一盏地灭了。',
            do: [{ type: 'eming', delta: 3 }, { type: 'flag', flag: 'huafang_guard_dead' }],
            later: '汪家不会善罢甘休。扬州府里，汪家也说得上话。' }
        ]
      } },
    lose: { tag: '好手 · 负', title: '不敌护院', growth: true, button: '强忍起身',
      story: '你在船板上醒来时，湖上只剩水声。船头那半幅「云娘」的绸帘不见了，汪少爷的人也散了。左肩的伤口还在渗血。',
      do: [
        { type: 'flag', flag: 'huafang_force_lose' }, { type: 'flag', flag: 'huafang_taken' },
        { type: 'flag', flag: 'huafang_gone' }, { type: 'flag', flag: 'huafang_done' },
        { type: 'quest', id: 'side_huafang', stage: 2 },
        { type: 'heal', hpAtLeast: 0.3 },
        { type: 'feed', tag: '江湖', text: '你败给汪家护院，云娘叫人架上岸抵债去了。画舫上从此没了她的曲子。' }
      ] },
    flee: { tag: '好手 · 走', title: '脱身下水', button: '湿着上岸',
      story: '你虚晃一招，翻身跃进湖里，扒着船板游到岸边。画舫的宫灯在夜色里晃，汪少爷的笑声追出老远：「跑得了和尚，跑不了庙！」云娘的琵琶声还在风里颤着——她还没被带走，今夜的事，还没完。' }
  }
};

const FOES: FoeDef[] = [GUARD_FOE];

const QUESTS: QuestDef[] = [
  { id: 'side_huafang', name: '奇遇 · 画舫云娘', stages: [
    { title: '画舫歌女云娘的难处', to: 'huafang', who: 'yunnian', hint: '云娘的难处听明白了：八十文利钱，汪少爷入夜便来收。这闲事管不管，总得给她一句话。' },
    // 推进的路有四条：替她付利钱（云娘，白天也行）、报名号、动手、接汪家的事劝她上岸（后三条都在入夜的汪少爷身上）
    { title: '汪少爷上船讨债', to: 'huafang', who: 'wangshao', hint: '八十文利钱，汪少爷入夜便来收。云娘那副神情，叫人放心不下。' },
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
      text: '画舫歌女这一期的利钱，不知叫哪位好心人清了；汪家收了钱，据说脸色很不好看。', who: ['船夫', '小二', 'wang', '赌客'], about: 'you' },
    { if: { flag: 'huafang_force' },
      text: '听说瘦西湖画舫上出了事，汪家护院吃了大亏，汪少爷告了几天假，湖上清净了不少。', who: ['船夫', '小二', 'wang', '渔家'], about: 'you' },
    { if: { flag: 'huafang_nianhao' },
      text: '汪家少爷在画舫上折了颜面，回去摔了只茶壶；那歌女的曲子里，近来添了几分愁味。', who: ['船夫', '小二', 'wang', '赌客'], about: 'you' },
    { if: { flag: 'huafang_betray' },
      text: '画舫的歌女叫汪家接走了，说是抵债；船头那半幅写着「云娘」的绸帘，也摘了下来。', who: ['船夫', '小二', 'wang', '货郎'] },
    { if: { flag: 'huafang_taken' },
      text: '前几日在画舫上出头的年轻人，叫汪家护院打得爬不起来；那歌女，也叫接走了。', who: ['船夫', '小二', 'wang', '货郎'], about: 'you' },
    { if: { flag: 'huafang_guard_fang' },
      text: '汪家那个护院辞了工，回乡下种地去了。临走前在茶棚里说，画舫上那位少侠，手下留了情。', who: ['小二', '货郎', '脚夫'], about: 'you' },
    { if: { flag: 'huafang_guard_dead' },
      text: '瘦西湖画舫上出了人命，汪家一纸状子递进了府衙。周捕头说，这案子他压不住。', who: ['衙役', '捕快', 'guan', 'wang'], about: 'you' },
    { if: { flag: 'huafang_force_lose' },
      text: '汪家新近换了位护院，刀比先前那位更沉，据说是为画舫上的事添的防备。', who: ['wang', '小二', '货郎', '船夫'] }
  ]
};

export default pack;
