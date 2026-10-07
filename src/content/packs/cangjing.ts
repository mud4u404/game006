import type { Cond, ContentPack, NpcDef, QuestDef, RoomDef } from '../types';

/** 大明寺藏经阁失窃支线：推理指认 */

const ROOMS: RoomDef[] = [
  {
    id: 'daming_cangjing', name: '藏经阁', area: '大明寺 · 藏经阁', region: 'yz', t: 15, map: [68, 12],
    desc: '古木参天处，一座重檐阁楼隐于竹影之中。阁楼的窗棂被撬开过，地上散落着几张泛黄的经书页角。香炉里的灰还带着一丝焦味。',
    npcs: ['cangjing_fakong', 'cangjing_mingxin', 'cangjing_zhangs'],
    objs: ['cangjing_gui', 'cangjing_xianglu', 'cangjing_jiaoyin'],
    exits: [['前', 'daming', '后']],
    road: '你沿大明寺后山小路拾级而上，落叶沙沙作响……',
    onEnter: [
      { if: { notFlag: 'side_cangjing_started' }, text: '藏经阁门口贴着一张告示，上面写着「善本经卷失窃」。守阁老僧法空站在门口，眉头紧锁。',
        do: [
          { type: 'flag', flag: 'side_cangjing_started' },
          { type: 'quest', id: 'side_cangjing', stage: 0 },
          { type: 'feed', tag: '江湖', text: '大明寺藏经阁失窃了，善本经卷不翼而飞。' }
        ] },
      { text: '藏经阁里还是那幅模样，三人各忙各的。' }
    ]
  }
];

/** 辅助：判断线索够不够——三条线索里至少拿到两条，才能指认（Issue #6 的要求） */
const CLUE_ENOUGH: Cond = { any: [
  { flag: 'clue_gui', any: [{ flag: 'clue_xianglu' }, { flag: 'clue_jiaoyin' }] },
  { flag: 'clue_xianglu', any: [{ flag: 'clue_jiaoyin' }] }
] };

const NPCS: NpcDef[] = [
  // —— 嫌疑人 A：明心（小沙弥，真凶）——
  {
    id: 'cangjing_mingxin', name: '明心', ini: '心', tone: 'amber', brief: '低头扫地',
    look: '十二三岁的小沙弥，袈裟宽得挂到脚面上。手腕上系着一根褪得发白的红绳，袖子上沾着一点没洗干净的墨渍。',
    verbs: ['交谈', '观察', '指认', '求情', '送官'],
    actions: {
      观察: [
        { if: { any: [{ flag: 'clue_gui' }, { flag: 'clue_xianglu' }, { flag: 'clue_jiaoyin' }] },
          text: '你盯着明心看了半晌，他的耳朵尖红了，扫地的扫把节奏明显快了起来。' },
        { text: '他扫着地，眼睛却不停地瞟向藏经阁的方向。手腕上那根红绳旧得发白，不知是谁给他系的。' }
      ],
      交谈: [
        { if: { flag: 'cangjing_report' }, text: '明心低着头，眼圈红着，一句话也不说。' },
        { if: { flag: 'cangjing_mercy' }, text: '明心低着头：「施主，小僧知错了。师父罚小僧抄经三年，小僧会好好抄的。」' },
        { if: { flag: 'cangjing_solved' }, text: '明心低着头，小声道：「施主，小僧知错了……」' },
        { if: { any: [{ flag: 'cangjing_wrong_fakong' }, { flag: 'cangjing_wrong_zhangs' }] },
          text: '明心扫着地，头埋得很低，不敢看你一眼。' },
        { if: { flag: 'clue_xianglu' },
          text: '明心「啪」地把扫把掉在地上：「什、什么药？我、我听不懂施主在说什么……」' },
        { if: { any: [{ flag: 'clue_gui' }, { flag: 'clue_jiaoyin' }] },
          text: '明心低着头，声音发颤：「施主……小僧真的没偷东西。您、您去问师父吧。」' },
        { text: '小僧昨夜在菜园里收菜，什么都不知道。' }
      ],
      指认: [
        { if: { quest: { id: 'side_cangjing', atLeast: 2 } }, text: '此案已结，施主不必再查了。' },
        { if: CLUE_ENOUGH,
          text: '你盯着明心：「偷经卷的，是你。」明心的眼泪哗地流下来。法空师父叹了口气：「是我徒弟……他娘得疟疾，他说想卖了经卷换药。我这老骨头……没看住。」说着，从怀里摸出两本经卷还给你。',
          do: [
            { type: 'flag', flag: 'cangjing_solved' }, { type: 'flag', flag: 'cangjing_mingxin_confess' },
            { type: 'quest', id: 'side_cangjing', stage: 2 },
            { type: 'rel', npc: 'liaochen', value: '忘年交', from: ['初识'] },
            { type: 'xia', delta: 5 },
            { type: 'flag', flag: 'cangjing_gongde' },
            { type: 'feed', tag: '江湖', text: '藏经阁失窃告破：明心为母治病偷经卷，如何发落，要看你一句话。' }
          ] },
        { text: '线索还不够，施主再去看看吧。' }
      ],
      求情: [
        { if: { quest: { id: 'side_cangjing', atLeast: 3 } }, text: '此案已结，施主不必再说了。' },
        { if: { quest: { id: 'side_cangjing', atLeast: 2 } },
          text: '你对法空合十：「他为母治病，其情可悯。经卷既已追回，可否从轻发落？」法空沉吟良久，叹道：「罚他抄经三年。酬金，老衲也不敢收施主的情了。」明心扑通跪下，额头磕得青紫。',
          do: [
            { type: 'quest', id: 'side_cangjing', stage: 3 },
            { type: 'flag', flag: 'cangjing_mercy' },
            { type: 'xia', delta: 5 },
            { type: 'feed', tag: '江湖', text: '你替明心求了情，大明寺罚他抄经三年，这件事没有外传。' }
          ] },
        { text: '明心茫然地看着你：「施主要小僧……求什么情？」' }
      ],
      送官: [
        { if: { quest: { id: 'side_cangjing', atLeast: 3 } }, text: '此案已结，施主不必再说了。' },
        { if: { quest: { id: 'side_cangjing', atLeast: 2 } },
          text: '你沉声道：「寺规国法，不能因情废法。」法空红着眼，终于唤来巡检。明心被带走时回头看了你一眼，什么也没说。方丈按例送来二百文酬金。（银两 +200 文）',
          do: [
            { type: 'quest', id: 'side_cangjing', stage: 3 },
            { type: 'flag', flag: 'cangjing_report' },
            { type: 'silver', delta: 200 },
            { type: 'toast', text: '银两 +200 文' },
            { type: 'feed', tag: '江湖', text: '你把偷经的小沙弥明心交给了巡检，拿了寺里的二百文酬金。' }
          ] },
        { text: '明心茫然地看着你：「施主要把小僧……送去哪里？」' }
      ]
    }
  },

  // —— 嫌疑人 B：法空（守阁老僧，假嫌疑人，其实是明心师父）——
  {
    id: 'cangjing_fakong', name: '法空', ini: '空', tone: 'gray', brief: '手指发抖',
    look: '六十来岁的老僧，白眉白须，手指却在不自觉地发抖。藏经阁的经书他背得滚瓜烂熟，今天却连第几本放在哪里都记不清了。',
    verbs: ['交谈', '观察', '指认'],
    actions: {
      观察: [{ text: '他袖口沾着一点新鲜的泥点，像是清晨从菜园那边过来的。手指抖得厉害，攥紧拳头才勉强压住。' }],
      交谈: [
        { if: { flag: 'cangjing_report' }, text: '法空望着空荡荡的竹帚，长叹一声：「国法如此，老衲无话可说。」' },
        { if: { flag: 'cangjing_solved' }, text: '法空长叹一声：「老衲没教好徒弟……施主功德无量。」' },
        { if: { flag: 'cangjing_wrong_fakong' }, text: '法空垂着眼：「施主，老衲认了。这事……就到此为止吧。」' },
        { if: { flag: 'cangjing_wrong_zhangs' }, text: '法空望着你，欲言又止：「张施主走时，说了些不好听的话。」' },
        { text: '法空摇头：「夜里有人撬了经柜，老衲竟半点没察觉。惭愧惭愧……」他目光闪烁了一下，「明心那孩子一直很听话的，贫僧实在想不出还有谁……」' }
      ],
      指认: [
        { if: { quest: { id: 'side_cangjing', atLeast: 2 } }, text: '此案已结，施主不必再查了。' },
        { if: CLUE_ENOUGH,
          text: '你盯着法空：「偷经卷的，是你。」法空一愣，随即苦笑：「施主好眼力……老衲……老衲欠了城中赌坊的钱，不得已才……」说着，他转身回藏经阁，半晌捧出一个布包。',
          do: [
            { type: 'flag', flag: 'cangjing_wrong_fakong' },
            { type: 'quest', id: 'side_cangjing', stage: 3 },
            { type: 'eming', delta: 5 },
            { type: 'feed', tag: '江湖', text: '你指认法空偷经卷……但法空真的是赌债偷书吗？事情好像没那么简单。' }
          ] },
        { text: '线索还不够，施主再去看看吧。' }
      ]
    }
  },

  // —— 嫌疑人 C：张四（香客，假嫌疑人，被黑风寨爪牙利用）——
  {
    id: 'cangjing_zhangs', name: '张四', ini: '张', tone: 'red', brief: '腰间挂着铜牌',
    look: '四十来岁的汉子，穿着短打劲装，腰间挂着一块铜牌，上面好像刻着什么。出手阔绰，进庙就捐了五两银子。',
    verbs: ['交谈', '观察', '指认'],
    actions: {
      观察: [{ text: '那块铜牌上刻着个「风」字？不对，你揉了揉眼——好像是个被磨花了的「厂」字？' }],
      交谈: [
        { if: { flag: 'cangjing_solved' }, text: '张四冷哼一声，转身就走，连捐的银子都没要回来。' },
        { if: { flag: 'cangjing_wrong_zhangs' }, text: '张四一见你，把铜牌往腰里一掖，冷冷道：「冤枉我的账，我记着。」' },
        { text: '张四不耐烦地摆手：「我只是来上香的！你们出家人的事，关我什么事？」' }
      ],
      指认: [
        { if: { quest: { id: 'side_cangjing', atLeast: 2 } }, text: '此案已结，施主不必再查了。' },
        { if: CLUE_ENOUGH,
          text: '你指着张四：「偷经卷的，是你！」张四冷笑：「好，好一个仗义执言的少侠！」他一拍胸脯，铜牌「叮咚」响了一声，「下次别让我在扬州城外遇见你。」',
          do: [
            { type: 'flag', flag: 'cangjing_wrong_zhangs' },
            { type: 'quest', id: 'side_cangjing', stage: 3 },
            { type: 'eming', delta: 5 },
            { type: 'feed', tag: '江湖', text: '你冤枉了张四，他留话要在城外找你算账。' }
          ] },
        { text: '线索还不够，施主再去看看吧。' }
      ]
    }
  },

  // —— 物证 A：被撬的经柜 ——
  {
    id: 'cangjing_gui', name: '被撬的经柜', obj: true, icon: 'door', brief: '柜门歪斜',
    look: '木质经柜的门锁被撬开了，锁扣上留着一道细小的痕迹——像是什么尖锐却又短小的东西刮的。',
    verbs: ['观察', '细看'],
    actions: {
      观察: [{ text: '门锁明显是被硬撬开的，地上掉了两根木楔子。' }],
      细看: [{ text: '你凑近细看，撬痕细小，只有小指粗的东西才能伸得进去——这不像大人干的。柜角还沾了一点泥脚印子。（线索一：撬痕细小，像是小孩手）',
        do: [{ type: 'flag', flag: 'clue_gui' }] }]
    }
  },

  // —— 物证 B：香炉 ——
  {
    id: 'cangjing_xianglu', name: '香炉', obj: true, icon: 'stele', brief: '纸灰没烧完',
    look: '铜香炉里堆着厚厚的香灰，里面有一张纸片只烧了一半，隐约能看见几个字。',
    verbs: ['观察', '细看'],
    actions: {
      观察: [{ text: '香炉里有张纸片没烧干净，边角还留着。' }],
      细看: [{ text: '你小心地把纸片挑出来，看清上面歪歪扭扭写着两个字：「草药」。字是小孩的笔迹。（线索二：药方）',
        do: [{ type: 'flag', flag: 'clue_xianglu' }] }]
    }
  },

  // —— 物证 C：墙角泥脚印 ——
  {
    id: 'cangjing_jiaoyin', name: '泥脚印', obj: true, icon: 'stele', brief: '藏在墙角',
    look: '藏经阁后面的墙角里，有一串泥脚印。被草挡了大半，不仔细看还真发现不了。',
    verbs: ['观察', '细看'],
    actions: {
      观察: [{ text: '墙角好像有什么东西，蹲下来才能看清。' }],
      细看: [{ text: '你蹲下来细看，是一串光脚的泥脚印，偏小，只有三寸宽。脚印从菜园那边一路延伸到藏经阁的后墙根。（线索三：脚印偏小、光脚）',
        do: [{ type: 'flag', flag: 'clue_jiaoyin' }] }]
    }
  }
];

const QUESTS: QuestDef[] = [
  { id: 'side_cangjing', name: '奇遇 · 藏经阁失窃', stages: [
    { title: '听说藏经阁失窃', to: 'daming_cangjing' },
    { title: '收集线索，指认偷经的人' },
    { title: '替偷经的人定下去处' },
    { title: '藏经阁失窃 · 完' }
  ] }
];

const pack: ContentPack = {
  rooms: ROOMS,
  npcs: NPCS,
  quests: QUESTS,
  news: [
    { if: { flag: 'cangjing_mercy' },
      text: '大明寺有个小沙弥偷了经卷，听说被罚抄三年经书，寺里没有外传。' },
    { if: { flag: 'cangjing_report' },
      text: '大明寺有个小沙弥偷经卷换药，被送进了衙门，不少香客替他叹气。' },
    { if: { flag: 'cangjing_gongde' },
      text: '大明寺藏经阁失窃的案子破了，听说是一位年轻施主一条条理出来的。' },
    { if: { flag: 'cangjing_wrong_fakong' },
      text: '大明寺藏经阁失窃好像另有隐情，有人说指认错了，真凶还没抓到。' },
    { if: { flag: 'cangjing_wrong_zhangs' },
      text: '张四最近出了趟远门，临走留话：扬州城里有人冤枉他，这笔账迟早要算。' },
  ]
};

export default pack;
