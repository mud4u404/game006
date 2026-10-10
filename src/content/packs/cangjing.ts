import type { ContentPack, NpcDef, QuestDef, RoomDef, StoryDef } from '../types';

/** 大明寺藏经阁失窃支线（重做，Issue #46）：线索只给事实，结论留给玩家，处置是两难 */

const ROOMS: RoomDef[] = [
  {
    id: 'daming_cangjing', name: '藏经阁', area: '扬州 · 大明寺', region: 'yz', t: 15, map: [68, 12],
    // 第 45 条：结案以后不再照着「三人各忙各的」写，也不枚举已经走了的人
    desc: [
      { if: { flag: 'cangjing_juan' },
        text: '古木参天处，一座重檐阁楼隐在竹影里。最里那扇柜门合上了，铜锁扣得严实。柜格最里侧多了一卷经，蓝布包着，边上压着一枚铜镇纸。' },
      { if: { flag: 'cangjing_report' },
        text: '古木参天处，一座重檐阁楼隐在竹影里。最里那扇柜门合上了，几格还空着。角落里的扫帚靠在墙上，把上缠的布条散了半截。' },
      { if: { flag: 'cangjing_solved' },
        text: '古木参天处，一座重檐阁楼隐在竹影里。最里那扇柜门合着，香炉换过新灰，阁里只剩扫地的沙沙声。' },
      { text: '古木参天处，一座重檐阁楼隐在竹影里。阁内一排经柜，最里那扇柜门敞着，几格空了。守阁的老僧立在柜旁，一个书贩围着柜子打转，角落里有个小沙弥在扫地。香炉里的灰拨得很乱，阁后泥地上踩了几脚。' }
    ],
    npcs: [
      'cangjing_fakong',
      { id: 'cangjing_mingxin', if: { notFlag: 'cangjing_report' } },
      // 第 46 条：张四在「经卷下落」那张卡片里拿了经卷拱手去了（无论赎与不赎），结案后不该还站在阁里；
      // 指认错了老僧（wrong_fakong）那一条线上他没走，还在
      { id: 'cangjing_zhangs', if: { notFlag: 'cangjing_wrong_zhangs', any: [{ notFlag: 'cangjing_solved' }, { flag: 'cangjing_wrong_fakong' }] } }
    ],
    objs: ['cangjing_gui', 'cangjing_xianglu', 'cangjing_jiaoyin'],
    exits: [['前', 'daming', '后']],
    road: '你沿大明寺后山小路拾级而上，落叶沙沙作响……',
    onEnter: [
      { if: { notFlag: 'cangjing_seen' },
        text: '藏经阁门口贴着一张告示，上面写着「善本经卷失窃」。守阁老僧法空立在柜旁，眉头紧锁。',
        do: [
          { type: 'flag', flag: 'cangjing_seen' },
          { type: 'quest', id: 'side_cangjing', stage: 0 }
        ] },
      { if: { flag: 'cangjing_report' }, text: '案子结了，藏经阁里清静得很，连扫地声也没有了。' },
      { if: { flag: 'cangjing_solved' }, text: '案子结了。阁里安静下来，只剩扫地的沙沙声。' },
      { text: '藏经阁里还是那幅模样，三人各忙各的。' }
    ]
  }
];

const NPCS: NpcDef[] = [
  {
    id: 'cangjing_mingxin', name: '明心', ini: '心', tone: 'amber', brief: '低头扫地',
    look: '十二三岁的小沙弥，袈裟宽得挂到脚面，里头的袍子打着补丁。左袖口沾着一点墨渍，扫帚一下一下，扫得极慢。',
    verbs: ['交谈', '观察', '指认'],
    actions: {
      交谈: [
        { if: { flag: 'cangjing_med' },
          text: '明心朝你深深一揖：「娘的药吃上了，热已经退了。公子的大恩，小僧记一辈子。」' },
        { if: { flag: 'cangjing_mercy' },
          text: '明心低着头：「师父罚小僧抄经三年。抄的不是经，是心。小僧认。」' },
        { if: { flag: 'cangjing_solved' },
          text: '明心扫地的手停了停，没有抬头，扫帚在地上拖出很轻的声音。' },
        { if: { flag: 'clue_xianglu' },
          text: '「炉子里的纸？」明心的扫帚「啪」地掉在地上，「是、是风刮进去的。小僧不知道。」' },
        { if: { flag: 'clue_jiaoyin' },
          text: '「脚印？」明心往后缩了半步，「小僧昨夜在菜园守夜收菜……别的，小僧不知道。」' },
        { text: '「小僧是山下李家村的，家里只剩娘一个人……」他忽然收了声，「小僧什么都没说。施主请罢。」' }
      ],
      指认: [
        // 一条线索都没看就指认，三个人里猜中一个就全得：至少要看过一条（审查 B21）
        { if: { notFlag: 'cangjing_solved', any: [{ flag: 'clue_gui' }, { flag: 'clue_xianglu' }, { flag: 'clue_jiaoyin' }] },
          text: '你盯着扫地的小沙弥：「明心，经卷是你拿的？」扫帚「啪」地倒在地上，他「哇」的一声哭了出来。',
          do: [
            { type: 'quest', id: 'side_cangjing', stage: 2 },
            { type: 'story', id: 'cangjing_verdict' }
          ] },
        { if: { notFlag: 'cangjing_solved' },
          text: '你盯着扫地的小沙弥：「明心，经卷是你拿的？」他攥着扫帚，眼泪在眼眶里打转，一个字也不认。法空从廊下走过来，把他挡在身后：「施主，空口无凭。」' },
        { text: '案子已经了结。明心低着头，不再答话。' }
      ]
    }
  },
  {
    id: 'cangjing_fakong', name: '法空', ini: '空', tone: 'gray', brief: '手指发抖',
    look: '六十来岁的老僧，白眉白须。右手一直在抖，袖口沾着新鲜的泥，像是天没亮就动过土。眼睛里全是血丝。',
    verbs: ['交谈', '观察', '指认'],
    actions: {
      交谈: [
        { if: { flag: 'cangjing_wrong_fakong' },
          text: '法空垂着眼：「老衲认了。施主再问，也是这句。」' },
        { if: { flag: 'cangjing_report' },
          text: '法空望着阁外，长叹一声：「人带走那日，回头看了老衲一眼……唉。是老衲没教好他。」' },
        { if: { flag: 'cangjing_med' },
          text: '法空合十：「施主替他娘垫了药钱，又保住了寺里的体面。这份功德，老衲记下了。」' },
        { if: { flag: 'cangjing_mercy' },
          text: '法空合十：「施主笔下超生。明心，还不谢过施主？」角落里的扫地声顿了顿，没敢抬头。' },
        { if: { flag: 'cangjing_solved' },
          text: '「张施主走了，经卷也没了下落。」法空眼里的血丝更红了，「施主……唉，不提也罢。」' },
        { if: { flag: 'clue_jiaoyin' },
          text: '「脚印？」法空说得太快了些，「老衲今早扫地，见阁后土松，顺手扫了。」' },
        { text: '「失了经卷，老衲这守阁的怕是做到头了。」他的右手一直在抖，「施主，佛门清苦，经卷是借来的善本，赔不起啊。」' }
      ],
      指认: [
        { if: { notFlag: 'cangjing_solved' },
          text: '你盯着老僧：「法空师父，经卷是你拿的？」阁里静了半晌。他忽然直起腰，一字一句：「……罢了。是老衲所为，施主不必再问了。」他的眼睛，自始至终没有离开角落里扫地的明心。',
          do: [
            { type: 'flag', flag: 'cangjing_wrong_fakong' },
            { type: 'flag', flag: 'cangjing_solved' },
            { type: 'quest', id: 'side_cangjing', stage: 3 },
            { type: 'eming', delta: 5 },
            { type: 'feed', tag: '江湖', text: '你指认法空，老僧一口认下，自领禁足面壁。至于经卷怎么出去的，他再不肯多说一个字。' }
          ] },
        { text: '法空闭目不语，只是合十。' }
      ]
    }
  },
  {
    id: 'cangjing_zhangs', name: '张四', ini: '张', tone: 'red', brief: '围着经柜打转',
    look: '四五十岁的书贩，袖口一股旧书的霉味，脚上一双干干净净的新布鞋。围着经柜转了两圈，眼睛发亮，像是在估价。',
    verbs: ['交谈', '观察', '指认'],
    actions: {
      交谈: [
        { if: { flag: 'cangjing_solved', notFlag: 'cangjing_wrong_fakong' },
          text: '张四啧了一声：「小师父的事，听说了。那卷《药师经》，老夫收的时候可是花了真金白银——一百文，一页都不少。」' },
        { if: { flag: 'clue_jiaoyin' },
          text: '「脚印？」张四把新布鞋抬起来给你看，「昨夜老夫宿在城外渡口船上，等今早头班船，摆渡的老周亲眼所见。再说了，老夫这双鞋走一夜路都得磨破，哪还敢光脚下地。」' },
        { text: '「好佛好佛。」张四拱了拱手，眼睛却在经柜上溜了一圈，「听说这庙里几卷善本，别处花银子也见不着？」' }
      ],
      指认: [
        { if: { notFlag: 'cangjing_solved' },
          text: '你指着书贩：「张掌柜，经卷是你拿的吧？」他笑出了声，从怀里摸出一张当票拍在柜上：「昨夜老夫在城外渡口，这是今早换船的船钱收据，摆渡的老周认得。冤枉生意人的账，可不是这么算的。」他收拾起褡裢，「这庙里的生意，不做了！」拂袖而去。',
          do: [
            { type: 'flag', flag: 'cangjing_wrong_zhangs' },
            { type: 'flag', flag: 'cangjing_solved' },
            { type: 'quest', id: 'side_cangjing', stage: 3 },
            { type: 'eming', delta: 5 },
            { type: 'feed', tag: '江湖', text: '你指认书贩张四，他拿出渡口的收据自证清白，拂袖而去。藏经阁失窃的案子，就此不了了之。' }
          ] },
        { text: '「又来？」张四翻了个白眼，「案子不是结了么。」' }
      ]
    }
  },
  {
    id: 'cangjing_gui', name: '经柜', obj: true, icon: 'door', brief: '柜门敞着',
    look: '最里一扇柜门敞着，锁却好好的，铜锁扣得严严实实。几格经书空了。',
    verbs: ['细看'],
    actions: {
      细看: [
        { if: { notFlag: 'clue_gui', quest: { id: 'side_cangjing', is: 0 } },
          text: '你凑近细看：铜锁完好，柜门却是从里侧关不上的。绕到柜后——背板靠墙处有一道裂缝，你伸出手比了比，大人的手塞不进去。柜里的插销，正对着那条缝。',
          do: [
            { type: 'flag', flag: 'clue_gui' },
            { type: 'quest', id: 'side_cangjing', stage: 1 },
            { type: 'feed', tag: '江湖', text: '经柜的锁没坏，柜背有一道大人的手伸不进去的窄缝，插销正对着缝。' }
          ] },
        { if: { notFlag: 'clue_gui' },
          text: '你凑近细看：铜锁完好，柜门却是从里侧关不上的。绕到柜后——背板靠墙处有一道裂缝，你伸出手比了比，大人的手塞不进去。柜里的插销，正对着那条缝。',
          do: [
            { type: 'flag', flag: 'clue_gui' },
            { type: 'feed', tag: '江湖', text: '经柜的锁没坏，柜背有一道大人的手伸不进去的窄缝，插销正对着缝。' }
          ] },
        { text: '柜后那道缝，你已经看得仔仔细细了。' }
      ]
    }
  },
  {
    id: 'cangjing_xianglu', name: '香炉', obj: true, icon: 'stele', brief: '香灰拨乱',
    look: '铜香炉里积着厚厚的香灰，灰拨得很乱，像埋过什么东西。',
    verbs: ['细看'],
    actions: {
      细看: [
        { if: { notFlag: 'clue_xianglu', quest: { id: 'side_cangjing', is: 0 } },
          text: '你从香灰里拨出半张烧剩的纸方，上面剩两味药名：「常山」「草果」，字迹歪歪扭扭，墨迹新鲜。常山草果，是截疟寒热的方子。',
          do: [
            { type: 'flag', flag: 'clue_xianglu' },
            { type: 'quest', id: 'side_cangjing', stage: 1 },
            { type: 'feed', tag: '江湖', text: '香炉里烧剩半张药方，常山草果，是截疟寒热的药，字迹歪歪扭扭。' }
          ] },
        { if: { notFlag: 'clue_xianglu' },
          text: '你从香灰里拨出半张烧剩的纸方，上面剩两味药名：「常山」「草果」，字迹歪歪扭扭，墨迹新鲜。常山草果，是截疟寒热的方子。',
          do: [
            { type: 'flag', flag: 'clue_xianglu' },
            { type: 'feed', tag: '江湖', text: '香炉里烧剩半张药方，常山草果，是截疟寒热的药，字迹歪歪扭扭。' }
          ] },
        { text: '半张截疟的药方，字迹歪歪扭扭。你已记下了。' }
      ]
    }
  },
  {
    id: 'cangjing_jiaoyin', name: '泥脚印', obj: true, icon: 'stele', brief: '阁后墙角',
    look: '阁后墙角的泥地上，草叶子倒了一片，像有人踩过。',
    verbs: ['细看'],
    actions: {
      细看: [
        { if: { notFlag: 'clue_jiaoyin', quest: { id: 'side_cangjing', is: 0 } },
          text: '你蹲下来细看：泥地上几个脚印，光着脚，前后不足六寸，浅浅的，从菜园方向来，到柜后窗下止住。有一处被扫帚扫过，扫得匆忙，反倒更清楚了。',
          do: [
            { type: 'flag', flag: 'clue_jiaoyin' },
            { type: 'quest', id: 'side_cangjing', stage: 1 },
            { type: 'feed', tag: '江湖', text: '阁后泥地有光脚脚印，前后不足六寸，从菜园方向来；有一处被扫帚匆忙扫过。' }
          ] },
        { if: { notFlag: 'clue_jiaoyin' },
          text: '你蹲下来细看：泥地上几个脚印，光着脚，前后不足六寸，浅浅的，从菜园方向来，到柜后窗下止住。有一处被扫帚扫过，扫得匆忙，反倒更清楚了。',
          do: [
            { type: 'flag', flag: 'clue_jiaoyin' },
            { type: 'feed', tag: '江湖', text: '阁后泥地有光脚脚印，前后不足六寸，从菜园方向来；有一处被扫帚匆忙扫过。' }
          ] },
        { text: '光脚的小脚印，从菜园来。你已记下了。' }
      ]
    }
  }
];

const QUESTS: QuestDef[] = [
  { id: 'side_cangjing', name: '奇遇 · 藏经阁失窃', stages: [
    { title: '藏经阁失窃', to: 'daming_cangjing', hint: '善本经卷丢了：经柜敞着，香炉里的灰拨得乱，阁后泥地上也踩了几脚。总得看个明白。' },
    // 指认谁都能了结这件事，认对了才走到下一步；不写找谁，免得替玩家把人点出来
    { title: '细看阁里的线索，指认偷经的人', to: 'daming_cangjing', hint: '守阁的老僧、书贩、扫地的小沙弥，三个人都说不清。线索没拼拢之前，不好冤枉了谁。' },
    // 处置在剧情卡片里定；卡片中途断了，再对明心指认一回就接得上
    { title: '替偷经的人定下去处', to: 'daming_cangjing', who: 'cangjing_mingxin', hint: '明心哭着认了，法空立在一旁，一句话也没有。这孩子往后怎样，总得有个了断。' },
    { title: '藏经阁失窃 · 完' }
  ] }
];

const STORIES: StoryDef[] = [
  { id: 'cangjing_verdict', cards: [
    { tag: '支线', title: '真相',
      paras: [
        '「不是小僧……」明心的扫帚倒了，他跪坐在地上，眼泪大颗大颗往下掉。',
        '「娘入秋打了寒热，郎中说，要常山草果才截得住……药钱一百文，小僧没有。」',
        '「柜里那卷《药师经》，张掌柜说值钱，小僧卖了一百文……夜里怕师父瞧见，又从柜背的缝里摸了两卷，想再卖……还没来得及。」',
        '法空闭目宣了声佛号，一字一句：「佛门清地，养出这般心思。是老衲教管无方。」'
      ],
      choices: [
        { label: '替明心求情', sub: '不收酬金，侠义 +3',
          result: '你合掌道：「幼童初犯，为母治病，其情可悯。经卷追回大半，愿以律例之外的情面，保他一回。」法空久久合十：「施主慈悲。」明心伏在地上，哭得说不出话。',
          do: [
            { type: 'flag', flag: 'cangjing_mercy' }, { type: 'flag', flag: 'cangjing_solved' },
            { type: 'quest', id: 'side_cangjing', stage: 3 },
            { type: 'xia', delta: 3 },
            { type: 'rel', npc: 'liaochen', value: '相谈甚欢', from: ['素不相识', '点头之交'], note: '藏经阁一案，了尘感念你的高义' },
            { type: 'feed', tag: '江湖', text: '你替明心求了情，大明寺罚他抄经三年。这件事，庙里没有声张。' }
          ], next: 1 },
        { label: '送官究办', sub: '得酬金二百文',
          result: '「寺规国法，不能因情废法。」差人来时，明心回头看了你一眼，什么也没说。方丈按例送来二百文酬金。法空立在阁前，一夜没有进屋。',
          do: [
            { type: 'flag', flag: 'cangjing_report' }, { type: 'flag', flag: 'cangjing_solved' },
            { type: 'quest', id: 'side_cangjing', stage: 3 },
            { type: 'silver', delta: 200 },
            { type: 'rel', npc: 'liaochen', value: '相谈甚欢', from: ['素不相识', '点头之交'], note: '藏经阁一案，了尘感念你的高义' },
            { type: 'feed', tag: '江湖', text: '你把偷经卷的小沙弥送了官，领了二百文酬金。藏经阁从此换人扫拂。' }
          ], next: 1 },
        { if: { silver: 100 }, label: '替他娘出药钱', sub: '银两 −100，侠义 +5',
          result: '你把一百文塞进他手里：「先给你娘抓药，别的往后再说。」明心愣了半天，朝你重重磕了两个头。法空别过脸去，抬袖子擦了擦眼睛。',
          do: [
            { type: 'flag', flag: 'cangjing_med' }, { type: 'flag', flag: 'cangjing_solved' },
            { type: 'quest', id: 'side_cangjing', stage: 3 },
            { type: 'silver', delta: -100 },
            { type: 'xia', delta: 5 },
            { type: 'rel', npc: 'liaochen', value: '相谈甚欢', from: ['素不相识', '点头之交'], note: '藏经阁一案，了尘感念你的高义' },
            { type: 'feed', tag: '江湖', text: '你替明心的娘付了一百文药钱。他娘的疟疾，往后有药可医了。' }
          ], next: 1 }
      ] },
    { tag: '支线', title: '经卷下落',
      paras: [
        '张四在旁咳嗽一声：「诸位，那卷《药师经》，老夫可是花一百文收的善本，字纸无冤无佛……」'
      ],
      choices: [
        { if: { silver: 120 }, label: '掏一百二十文赎回', sub: '银两 −120，侠义 +3',
          result: '你数出一百二十文。张四把钱收了，经卷用蓝布包好递来。法空双手接过，抱在怀里，朝你深深合十。',
          do: [
            { type: 'flag', flag: 'cangjing_juan' },
            { type: 'silver', delta: -120 },
            { type: 'xia', delta: 3 },
            { type: 'feed', tag: '江湖', text: '你贴了一百二十文，从书贩手里赎回《药师经》，送回了藏经阁。' }
          ], next: -1 },
        { label: '由它去', sub: '经卷留在书贩手里',
          result: '张四把经卷仔细收进褡裢，拱手去了。法空望着空了的柜格，久久没有说话。',
          do: [
            { type: 'feed', tag: '江湖', text: '《药师经》终究留在书贩的褡裢里，法空望着空了的柜格，久久没有说话。' }
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
    { if: { flag: 'cangjing_mercy' },
      text: '大明寺藏经阁丢了经卷，听说是个小沙弥糊涂，多亏一位过路人说情，庙里罚他抄经了事。', who: ['和尚', '货郎', '小二'], about: 'you' },
    { if: { flag: 'cangjing_report' },
      text: '大明寺报了官，偷经卷的小沙弥叫差人带走了；那二百文酬金，落在一位过路人手里。', who: ['和尚', '衙役', '货郎'], about: 'you' },
    { if: { flag: 'cangjing_med' },
      text: '大明寺小沙弥偷经卷给娘抓药，有位过路人替他垫了药钱；李家村他娘的疟疾，听说见好了。', who: ['和尚', '郎中', '货郎'], about: 'you' },
    { if: { flag: 'cangjing_wrong_fakong' },
      text: '藏经阁失窃案结了：法空师父自认监守自盗，禁足面壁。经卷怎么出去的，庙里讳莫如深。', who: ['和尚', '说书', '小二'] },
    { if: { flag: 'cangjing_wrong_zhangs' },
      text: '有个书贩在大明寺叫人冤枉偷经，当场拿出渡口收据自证，拂袖而去；经卷的案子，不了了之。', who: ['和尚', '书吏', '相公'], about: 'you' }
  ]
};

export default pack;
