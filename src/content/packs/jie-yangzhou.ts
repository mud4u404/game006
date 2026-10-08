import type { ContentPack, EncounterDef, FoeDef, NpcDef, StoryDef } from '../types';

/**
 * 扬州城里打得着的人（Issue #102）：三个对手，打赢以后由玩家定他的下场。
 * 每条路写下的旗标，都在同一个文件里有地方读：孙彪本人会依结局改口，李麻子依结局改行，
 * 女飞贼放出后有夜银的后续路遇，再加上带 if 的传闻。表见提交说明。
 */

const NIGHT = { hour: { from: 19, to: 5 } };

const ENCOUNTERS: EncounterDef[] = [
  { id: 'luyu_yz_yan', region: ['yz'], to: ['cheng'], once: true, if: { flag: 'jy_sun_out' }, weight: 0.6, story: 'ly_yz_yan' },
  { id: 'luyu_yz_feizei', region: ['yz'], to: ['zhuyuwan'], once: true, if: NIGHT, weight: 0.7, story: 'ly_yz_feizei' },
  { id: 'luyu_yz_feizei_yin', region: ['yz'], to: ['cheng'], once: true, if: { flag: 'jy_fei_fang' }, weight: 0.8, story: 'ly_yz_feizei_yin' }
];

const NPCS: NpcDef[] = [
  {
    id: 'jy_sunbiao', name: '孙彪', ini: '彪', tone: 'red', brief: '收着份子钱',
    look: '五大三粗的汉子，拳头上全是老茧，虎口一道白疤。腰里挂半串铜钱，是挨家收上来的份子钱。',
    at: { room: 'cheng', if: { notFlag: 'jy_sun_gone' } },
    verbs: ['交谈', '观察', '动手'],
    actions: {
      交谈: [
        { if: { flag: 'jy_sun_chuan' },
          text: '孙彪一瘸一拐地凑上来，声音压得极低：「话带到了。阎爷放话——他要亲自会会你这个多管闲事的。」' },
        { if: { flag: 'jy_sun_jian' },
          text: '「管事的见了你，夜里连觉都睡不踏实了。」孙彪咧嘴，笑得比哭难看，「这盐号上下，就数你叫人睡不好。」' },
        { text: '他拿名册敲着手心：「新面孔？这条街的规矩——铺子住户，月月一份份子钱，给盐号阎爷孝敬。别叫爷动手。」' }
      ],
      观察: [{ text: '拳头上全是老茧，虎口一道白疤。半串铜钱收得随意——收保护费收老了手的人，才这么不把这些钱当钱。' }],
      动手: [{ do: [{ type: 'fight', foe: 'jy_sunbiao' }] }]
    }
  },
  {
    id: 'jy_limazi', name: '李麻子', ini: '李', tone: 'amber', brief: '卖着膏药',
    look: '膀阔腰圆，一身腱子肉涂着桐油，背上背着口豁边的大刀。铜锣敲得山响，嗓门比锣还响。',
    at: { room: 'cheng_tavern', if: { notFlag: 'jy_lei_gone' } },
    verbs: ['交谈', '观察', '拆穿'],
    actions: {
      交谈: [
        { if: { flag: 'jy_lei_tui' },
          text: '李麻子缩在角落里卖大力丸，见了你就把头低下去：「钱……都退了。往后改卖大力丸，凭力气吃饭。」' },
        { if: { flag: 'jy_lei_zha' },
          text: '李麻子不在——听说卷了铺盖去了外县，改行改得彻彻底底。' },
        { if: { flag: 'jy_lei_fan' },
          text: '「刀砍不入是假的，挨刀是真的！」李麻子改行说书，专讲自己挨刀的段子，满座叫好，「这位公子是我恩人——不砸我饭碗，是逼我改行！」' },
        { text: '「南七北六十三省，刀砍不入就我李麻子一家！」他把大刀往背上一抡，「十文钱，看一眼亏不了！」' }
      ],
      观察: [{ text: '你瞅得仔细：大刀抡上背的时候，他腰眼一沉——背上鼓包里垫的不是肉，是货。锣倒是真锣。' }],
      拆穿: [
        { if: { notFlag: 'jy_lei_fought' },
          text: '你一把夺过大刀，往膝盖上一磕——刀身应声而断，里头是块包铁皮的木板。李麻子脸上挂不住了：「拆、拆人台面……你懂不懂行规！」抡起半截断刀就劈了过来。',
          do: [
            { type: 'flag', flag: 'jy_lei_fought' },
            { type: 'fight', foe: 'jy_limazi' }
          ] },
        { text: '「看破不说破，朋友留一线——你不懂行规！」李麻子把脸一横。' }
      ]
    }
  }
];

const SUNBIAO: FoeDef = {
  id: 'jy_sunbiao', name: '孙彪', title: '替盐枭收份子的打手', ini: '彪', tone: 'red',
  weapon: '缠铜钱拳套', ws: '拳', tag: '好手',
  rank: 0.5, build: 'outer',
  moves: ['盐枭铁拳', '断子绝孙腿', '恶虎扑食', '掏心捶'],
  flourish: ['缠着铜钱的拳套呼呼作响', '一腿扫得尘土飞扬', '脸上挂着收钱才有的笑'],
  tells: [
    { name: '盐枭铁拳', text: '孙彪一记直拳带着风声捣来，缠着铜钱的拳套看着就疼……', dom: 'li', after: '铜钱擦着耳根刮过去，火辣辣的疼！' },
    { name: '断子绝孙腿', text: '孙彪矮身扫腿，专往下三路招呼，又快又毒……', dom: 'su', after: '扫得人立足不稳！' }
  ],
  asides: ['街边的摊贩默默把货往屋里收。', '有胆大的孩童远远看着，被大人一把拽回屋里。'],
  opening: ['活动着手腕', '啐了一口唾沫', '把名册往腰里一塞'],
  intro: '孙彪把名册往腰里一塞，捏了捏拳头：「新来的不懂事？爷今日就教教你——份子钱呢？」',
  win: '孙彪被你按在墙上，名册散了一地，半串铜钱也断了线。',
  lose: '你挨了几记缠铜钱的闷拳，钱袋也被他摸了去。孙彪啐了一口：「不交份子钱，还敢动手。」',
  results: {
    lose: { tag: '好手 · 负', title: '不敌打手', button: '咬牙爬起',
      story: '缠铜钱的拳套把你砸得眼冒金星。孙彪拍了拍你的脸：「回去长长眼，这条街不是你能多嘴的。」你爬起来时，嘴里有血腥味。',
      do: [{ type: 'heal', hpAtLeast: 0.3 }, { type: 'silver', delta: -20 }] },
    win: { tag: '好手 · 胜', title: '打手趴下', button: '定他的下场',
      story: '孙彪趴在地上，嘴还硬着：「阎爷不会放过你……」可他抖的手出卖了他——打手再横，也只是拿钱卖力气的人。',
      do: [
        { type: 'flag', flag: 'jy_sun_biaotai' },
        { type: 'feed', tag: '江湖', text: '东关街替盐枭收份子钱的孙彪，叫人当街打趴下了。' }
      ],
      after: {
        plea: '孙彪趴在地上，从牙缝里挤出话来：「爷……爷也是拿钱卖力气。份子钱一个文都不进爷的腰，爷上有老母……你要打，接着打。要放，放爷回去传话。」',
        opts: [
          { label: '放他回去传话', sub: '话带到了，梁子结下了',
            say: '你松开手：「回去告诉你家阎爷——东关街的份子钱，往后一文都别收。」',
            do: [
              { type: 'flag', flag: 'jy_sun_chuan' }, { type: 'flag', flag: 'jy_sun_out' },
              { type: 'feed', tag: '江湖', text: '你把孙彪打了一顿放回去传话：东关街的份子钱，往后一文都别收。' }
            ],
            later: '盐枭阎爷的回话，过几日就会在这条街上出现。' },
          { label: '逼他带你去见管事', sub: '把话说到盐枭脸上',
            say: '「带路。你家管事要是识相，这份子钱的账，往后改规矩。」孙彪咬牙领路，赌坊后屋的管事连夜应下了你的话。',
            do: [
              { type: 'flag', flag: 'jy_sun_jian' }, { type: 'flag', flag: 'jy_sun_out' },
              { type: 'lilian', amount: 40 },
              { type: 'feed', tag: '江湖', text: '孙彪领你见了盐号管事。东关街的份子钱，说好了改规矩。' }
            ],
            later: '规矩改没改，街上看孙彪的脸色就知道。' },
          { label: '送他去府衙', sub: '侠义 +2　恶名 −2',
            say: '「收众勒索，有据有证。周捕头正愁完不成拿贼的数——你这一去，正好。」',
            do: [
              { type: 'flag', flag: 'jy_sun_guan' }, { type: 'flag', flag: 'jy_sun_gone' }, { type: 'flag', flag: 'jy_sun_out' },
              { type: 'xia', delta: 2 }, { type: 'eming', delta: -2 },
              { type: 'feed', tag: '江湖', text: '你把收份子钱的孙彪扭送府衙，挨了二十板子枷号三日。街坊拍手。' }
            ],
            later: '枷号的三日里，街坊轮流给他送水——罪是他的，怨是盐枭的。' },
          { label: '下杀手', sub: '恶名 +3',
            say: '你下手没有留情。半晌，孙彪不动了。',
            title: '东关街的一条人命',
            story: '打手死了。街坊们关门的关门，灭灯的灭灯。半串铜钱滚在地上，没人敢捡——盐枭阎爷的报复，从今夜起挂在这条街头上。',
            do: [
              { type: 'flag', flag: 'jy_sun_sha' }, { type: 'flag', flag: 'jy_sun_gone' }, { type: 'flag', flag: 'jy_sun_out' },
              { type: 'eming', delta: 3 },
              { type: 'feed', tag: '江湖', text: '东关街出了人命：收份子钱的打手叫人打死了。盐枭阎爷放话要报仇。' }
            ],
            later: '这条街的住户，从此见了佩剑的就关门。' }
        ]
      }
    }
  }
};

const LIMAZI: FoeDef = {
  id: 'jy_limazi', name: '李麻子', title: '卖狗皮膏药的「铁布衫」', ini: '李', tone: 'amber',
  weapon: '鬼头大刀', ws: '刀', tag: '好手',
  rank: 0, weak: 0.6, build: 'inner',
  moves: ['开砖断石', '王八拳连环', '铁裆功护体', '横扫千军'],
  flourish: ['大刀裹着棉布，抡起来呼呼作响', '桐油涂亮的腱子肉油光发亮', '铜锣敲得比刀声还响'],
  tells: [
    { name: '开砖断石', text: '李麻子把大刀抡圆了砸下来，刀上裹的棉布扑扑作响，看着吓人……', dom: 'li', after: '砸得人半边身子发麻！' },
    { name: '王八拳连环', text: '李麻子抡起双拳没头没脸地招呼，乱拳之中还夹着闷腿……', dom: 'su', after: '乱拳里夹着一记闷腿！' }
  ],
  asides: ['看热闹的人群里有人喊：「上回他骗了我五文！」', '膏药和大力丸从摊上滚了一地。'],
  opening: ['铜锣敲得山响', '往背上拍桐油', '冲人群抱拳作揖'],
  intro: '李麻子把大刀往背上一拍，铜锣敲得山响：「刀砍不入！铜锤不伤！十文钱，看一眼亏不了！」',
  win: '李麻子一屁股坐在散了架的摊子上，膏药撒了一地，铜锣滚出去老远。',
  lose: '李麻子一把攥住你的手腕，力气大得吓人——骗子有真力气。你被他一屁股撞出摊子。',
  results: {
    lose: { tag: '路遇 · 负', title: '被骗子撵走', button: '揉着腰走开',
      story: '你被他一屁股撞出摊子。看客哄笑：「连铁布衫都敢碰？」李麻子重新敲响铜锣，比刚才更响了。',
      do: [{ type: 'heal', hpAtLeast: 0.4 }] },
    win: { tag: '路遇 · 胜', title: '铁布衫漏了', button: '定他的下场',
      story: '断刀、木板、棉布垫子——刀砍不入的行头散了一地。李麻子揉着腰眼嘟囔：「人要吃饭，鬼要香火……我这是混口饭吃。」',
      do: [{ type: 'flag', flag: 'jy_lei_biaotai' }],
      after: {
        plea: '李麻子揉着腰眼嘟囔：「人要吃饭，鬼要香火……我这是混口饭吃。」',
        opts: [
          { label: '逼他把骗的钱退回去', sub: '侠义 +2',
            say: '你把断刀踩在脚下：「骗的铜钱，一文一文退回去。」街坊们围上来领钱，李麻子耷拉着脑袋，一文一文往外掏。',
            do: [
              { type: 'flag', flag: 'jy_lei_tui' }, { type: 'flag', flag: 'jy_lei_out' },
              { type: 'xia', delta: 2 },
              { type: 'feed', tag: '江湖', text: '卖艺的李麻子把骗的钱一文一文退给了街坊。' }
            ],
            later: '他改行卖了大力丸——这回凭的是真力气。' },
          { label: '砸了他的场子', sub: '恶名 +1',
            say: '你一脚踹翻锣架：「再骗人，见一回砸一回。」铜锣滚出去老远，看客齐声叫好。',
            do: [
              { type: 'flag', flag: 'jy_lei_zha' }, { type: 'flag', flag: 'jy_lei_gone' }, { type: 'flag', flag: 'jy_lei_out' },
              { type: 'eming', delta: 1 },
              { type: 'feed', tag: '江湖', text: '你砸了李麻子的卖艺场子。他卷了铺盖去了外县。' }
            ],
            later: '外县庙会上，又出现了「铁布衫」的招幌。' },
          { label: '留他一口饭', sub: '得饶人处且饶人',
            say: '「砸人饭碗是造孽。改行吧——你这一身力气，说书都够本。」他把大刀收了，头一回没拍胸脯。',
            do: [
              { type: 'flag', flag: 'jy_lei_fan' }, { type: 'flag', flag: 'jy_lei_out' },
              { type: 'feed', tag: '江湖', text: '你放过了李麻子。听说他真去改行说书了。' }
            ],
            later: '说书摊上的李麻子，专讲自己挨刀的段子，座无虚席。' }
        ]
      }
    }
  }
};

const SHUIZEI_FOE: FoeDef = {
  id: 'jy_feizei', name: '女飞贼', title: '梁上的黑影', ini: '贼', tone: 'purple',
  weapon: '柳叶短刀', ws: '刀', tag: '好手',
  rank: 0.4, build: 'light' as const,
  moves: ['燕子三抄水', '回风掠影', '投石问路', '倒挂珠帘'],
  flourish: ['双刀剪出的寒光一闪即逝', '黑影贴着墙脊滑出半丈', '她落脚没有声音'],
  tells: [
    { name: '燕子三抄水', text: '黑影在墙头一点，反身俯冲而下，双刀如燕子剪水，剪向咽喉……', dom: 'su', after: '双刀剪出的寒光擦着头皮掠过！' },
    { name: '回风掠影', text: '她手腕一翻，双刀交叠又分开，明明看着在左，刀锋却到了右……', dom: 'qiao', after: '刀锋贴着肋下掠过！' }
  ],
  asides: ['货栈的狗叫了几声，又缩回窝里去了。', '月光下，她的短刀薄得透光。'],
  opening: ['斗笠压低', '刀在指间转了个花', '身子贴着阴影'],
  intro: '墙脊上的黑影回过头来，斗笠底下只露出下巴：「汪家的狗腿都睡下了——你是哪一路？」',
  win: '她的双刀被你磕飞，插在房檐上嗡嗡作响。黑影停在墙脊上，不逃了。',
  lose: '双刀的影子在你眼前一错，膝弯一麻——她收了刀：「功夫不错，可惜替汪家看门。」你挣扎着爬起来，人已不见。',
  results: {
    lose: { tag: '好手 · 负', title: '刀光一错', button: '揉着膝弯',
      story: '双刀的影子在你眼前一错，膝弯一麻——她收了刀：「功夫不错，可惜替汪家看门。」你挣扎着爬起来，人已不见。',
      do: [{ type: 'heal', hpAtLeast: 0.3 }] },
    win: { tag: '好手 · 胜', title: '梁上现形', button: '定她的下场',
      story: '斗笠落地。月光下是一张年轻的脸，眉眼里全是倔强——她攥着从货栈里带出来的一个包袱，没有松手的意思。',
      do: [{ type: 'flag', flag: 'jy_fei_biaotai' }],
      after: {
        plea: '「我弟弟在金山寺当和尚。寺里叫他白抄半年的经，交上去说是假的——香火钱进了方丈的匣子，人被赶出山门，行李也扣了。那包袱几经转手，抵账抵进了汪家货栈。我不偷钱，我只拿回我爹留下的那串念珠——让庙里和号里都知道，穷人的东西，不是「规矩」两个字就能吞的。」',
        opts: [
          { label: '放她走', sub: '侠义 +2　这份情她记下了',
            say: '你侧开一步，让开了墙头：「拿回你弟弟的东西，别拿第二样。」她愣了愣，朝你一低头，背着包袱消失在夜色里。',
            do: [
              { type: 'flag', flag: 'jy_fei_fang' }, { type: 'flag', flag: 'jy_fei_out' },
              { type: 'xia', delta: 2 },
              { type: 'feed', tag: '江湖', text: '你放走了盗汪家货栈的女飞贼。她背走的包袱里，是一个穷和尚被扣下的行李。' }
            ],
            later: '过了些日子，有人看见一个背短刀的女客上了金山寺，在殿外放下一个旧包袱，磕了三个头，飘然而去。' },
          { label: '送官究办', sub: '银两 +20　汪老爷的谢礼',
            say: '你一声唿哨，家丁们打着灯笼涌出来，把她围在了墙头上。她被押走时没有回头。汪老爷隔着墙扔出二十文：「多谢壮士！」',
            do: [
              { type: 'flag', flag: 'jy_fei_guan' }, { type: 'flag', flag: 'jy_fei_gone' }, { type: 'flag', flag: 'jy_fei_out' },
              { type: 'silver', delta: 20 },
              { type: 'feed', tag: '江湖', text: '盗汪家货栈的女飞贼落了网。汪老爷赏了报信的人二十文——有人听见他冷笑了一声。' }
            ],
            later: '汪家的库房翻了个底朝天——少的是一个旧包袱，报官的册子上，却写成了「湖丝三十匹」。' },
          { label: '问她赃物去了哪里', sub: '听她说完',
            say: '「偷来的财，你花得安稳？」她把包袱抖开给你看——一件旧僧袍，一串磨得发亮的念珠。「旁的湖丝，一匹没动。你抓得着我，抓不着庙里那些吞香火钱的手。」',
            do: [
              { type: 'flag', flag: 'jy_fei_wen' }, { type: 'flag', flag: 'jy_fei_gone' }, { type: 'flag', flag: 'jy_fei_out' },
              { type: 'xia', delta: 1 },
              { type: 'feed', tag: '江湖', text: '盐商货栈飞贼一案有了下文：库里少的是一个旧包袱，湖丝一匹未少——汪老爷却咬定丢了三十匹。' }
            ],
            later: '后来金山寺外多了个摆摊抄经的年轻先生，一字三文，童叟无欺。他姐姐的短刀，再没出过鞘。' }
        ]
      }
    }
  }
};

const YAN_STORY: StoryDef = { id: 'ly_yz_yan', cards: [
    { tag: '路遇', title: '阎爷的回话',
      paras: [
        '巷口等着一个精瘦的汉子，见你过来，迎上半步，拱手当胸。',
        '「公子留步。盐号阎爷听了东关街的信儿，让我带句话——公子怎么接，怎么回，都随公子。」'
      ],
      choices: [
        { label: '「孙彪的话，带到了。」', if: { flag: 'jy_sun_chuan' }, next: 1 },
        { label: '「赌坊后屋，我去过。」', if: { flag: 'jy_sun_jian' }, next: 2 },
        { label: '「府衙的板子，他挨上了。」', if: { flag: 'jy_sun_guan' }, next: 3 },
        { label: '「他收钱的那只手，抬不起来了。」', if: { flag: 'jy_sun_sha' }, next: 4 },
        { label: '不接这话，径直走开',
          result: '你绕开汉子走了。身后传来一声不高不低的话音：「阎爷的话，带到为止——公子慢走。」',
          do: [{ type: 'flag', flag: 'jy_yan_note' }], next: -1 }
      ] },
    { tag: '路遇', title: '好胆色',
      paras: [
        '汉子笑了：「阎爷说，敢把孙彪打一顿放回去的，东关街头一份。你的份子钱，从此不收了——但你这把剑，阎爷记下了。」',
        '他说完就拱手，退回巷子里去了，脚步声轻得听不见。'
      ],
      choices: [
        { label: '「随时奉陪。」', sub: '侠义 +1',
          result: '你按着剑柄，朝巷子深处说了一句：「随时奉陪。」巷子里静了半晌，飘出来两个字：「好胆色。」',
          do: [{ type: 'xia', delta: 1 }, { type: 'flag', flag: 'jy_yan_note' }], next: -1 },
        { label: '「我不惹事，但也不怕事。」', sub: '历练 +20',
          result: '你不卑不亢地站定，把这句话原样捎了回去。巷子里没有回音——你觉得后背发凉，但你知道自己没退。',
          do: [{ type: 'lilian', amount: 20 }], next: -1 }
      ] },
    { tag: '路遇', title: '一杯茶',
      paras: [
        '汉子点点头：「那晚的后屋，公子坐的是客位。阎爷说，敢一个人闯赌坊后屋的，扬州城里数不出三个。」',
        '「阎爷的原话是：东关街的份子钱，公子那一户免了。这杯茶他记着——只是往后公子走船走桥，自己仔细。」'
      ],
      choices: [
        { label: '「替我谢过阎爷的茶。」', sub: '历练 +20',
          result: '你客客气气地回了话。汉子愣了一下，拱手去了——客套话说得滴水不漏的人，比拔剑的更叫人摸不透。',
          do: [{ type: 'lilian', amount: 20 }], next: -1 },
        { label: '「茶不必记，账也不必记。」', sub: '侠义 +1',
          result: '你把话撂下就走。身后静了一瞬，传来一声低低的笑——不知道是笑你，还是笑他自己。',
          do: [{ type: 'xia', delta: 1 }, { type: 'flag', flag: 'jy_yan_note' }], next: -1 }
      ] },
    { tag: '路遇', title: '秤和板子',
      paras: [
        '汉子的脸沉了下来：「阎爷说，衙门的板子，打不断盐号的秤。份子钱还在收，往后改了个名目，叫「船脚」。」',
        '他顿了顿，声音压低：「阎爷还说——公子的名字，他记在另一本册子上了。哪本册子，小人不敢问。」'
      ],
      choices: [
        { label: '「盐号的秤，早晚有人来平。」', sub: '侠义 +1',
          result: '你说完转身就走，没看那汉子的脸色。走出半条街，才发觉自己攥着剑柄的手心全是汗。',
          do: [{ type: 'xia', delta: 1 }, { type: 'flag', flag: 'jy_yan_note' }], next: -1 },
        { label: '把这话记在心里', sub: '历练 +20',
          result: '你点了点头，什么也没说。册子、名目、船脚——盐号换皮不换骨，这一层，你记下了。',
          do: [{ type: 'lilian', amount: 20 }], next: -1 }
      ] },
    { tag: '路遇', title: '一块木牌',
      paras: [
        '汉子没有开口。他从怀里取出一块巴掌大的木牌，轻轻放在你脚边，转身就走。',
        '木牌上一个字，墨深得像刀刻的：「偿」。'
      ],
      choices: [
        { label: '一脚踩碎木牌', sub: '侠义 +1',
          result: '你一脚踩下去，木牌断成两截。巷口传来一声极轻的叹息，随后什么声音都没有了。',
          do: [{ type: 'xia', delta: 1 }, { type: 'flag', flag: 'jy_yan_note' }], next: -1 },
        { label: '把木牌收起来', sub: '历练 +20',
          result: '你把木牌揣进怀里。这笔账迟早要算——是躲，还是迎，你打算想清楚了再动。',
          do: [{ type: 'lilian', amount: 20 }], next: -1 }
      ] }
  ] };

const STORIES: StoryDef[] = [
  YAN_STORY,
  { id: 'ly_yz_feizei', cards: [
    { tag: '路遇', title: '墙脊上的黑影',
      paras: [
        '夜里路过汪家货栈后墙，一条黑影正翻墙而入——身法轻灵如燕，落地没有半点声响。',
        '货栈里的狗叫了几声，又缩回窝里去了。你看见墙脊上多了一道刀光，黑影回过头来，斗笠底下的下巴微微一抬。'
      ],
      choices: [
        { label: '拦下她', sub: '动手',
          do: [{ type: 'fight', foe: 'jy_feizei' }] },
        { label: '让她去',
          result: '你退进阴影里。黑影得手后翻墙而出，消失在夜色中——货栈里的狗叫了半宿，第二天听说汪家丢了一包上等湖丝。',
          do: [{ type: 'flag', flag: 'jy_fei_let' },
            { type: 'feed', tag: '江湖', text: '汪家货栈夜里丢了一包湖丝，家丁说是飞贼，个中高手。' }], next: -1 },
        { label: '喊人', sub: '银两 +20',
          result: '你一声唿哨，家丁们打着灯笼涌出来。黑影翻墙而走，没抓住——但汪老爷隔着墙扔出二十文：「多谢壮士！」你捡起钱，忽然觉得烫手。',
          do: [
            { type: 'silver', delta: 20 },
            { type: 'flag', flag: 'jy_fei_shout' },
            { type: 'feed', tag: '江湖', text: '夜里汪家货栈进了飞贼，有人喊跑了贼。汪老爷赏了二十文。' }
          ], next: -1 }
      ] }
  ] },
  { id: 'ly_yz_feizei_yin', cards: [
    { tag: '路遇', title: '燕子衔来的银',
      paras: [
        '城南巷口的破碗里多了一小串铜钱，碗边压着一张字条：「还债的。」字条上的字迹你认得——是那夜墙脊上的飞贼。',
        '碗旁边蹲着一只瘦猫，舔着爪子看你，像是在替主人道谢。'
      ],
      choices: [
        { label: '把钱留给更需要的人', sub: '侠义 +1',
          result: '你把铜钱放回碗里，又多添了几文。夜风里仿佛有燕子的影子一掠而过。',
          do: [{ type: 'xia', delta: 1 }], next: -1 }
      ] }
  ] }
];

const pack: ContentPack = {
  npcs: NPCS,
  encounters: ENCOUNTERS,
  stories: STORIES,
  foes: [SUNBIAO, LIMAZI, SHUIZEI_FOE],
  news: [
    { if: { flag: 'jy_sun_chuan' }, text: '东关街替盐枭收份子钱的孙彪，叫人打了一顿放回去传话。盐枭阎爷放话：这梁子结下了。' },
    { if: { flag: 'jy_sun_jian' }, text: '打手孙彪领着一位佩剑的公子进了赌坊后屋。据说盐号管事的胆子，一夜之间小了许多。' },
    { if: { flag: 'jy_sun_guan' }, text: '替盐枭收份子钱的孙彪叫人送去了府衙，挨了二十板子枷号三日。东关街的街坊都拍手。' },
    { if: { flag: 'jy_sun_sha' }, text: '东关街出了人命：替盐枭收份子的打手孙彪，叫人打死了。盐枭阎爷放话，要拿凶手祭街。' },
    { if: { flag: 'jy_lei_tui' }, text: '耍把式卖艺的李麻子把骗的铜钱都退了，改行卖了大力丸——这回凭的是真力气。' },
    { if: { flag: 'jy_lei_zha' }, text: '西街卖艺的场子叫人砸了，「铁布衫」李麻子卷了铺盖去了外县。' },
    { if: { flag: 'jy_lei_fan' }, text: '茶馆新添了个说书的李麻子，专讲自己挨刀的故事，座无虚席——骗子的嘴，说苦也动人。' },
    { if: { flag: 'jy_fei_fang' }, text: '城南穷巷，夜里常有人留下一小串铜钱。老人们说，那是燕子衔来还债的。' },
    { if: { flag: 'jy_fei_guan' }, text: '盐商货栈闹飞贼，贼叫人送了官。汪老爷赏了二十文——有人听见他对着账本冷笑。' },
    { if: { flag: 'jy_fei_wen' }, text: '盐商货栈飞贼一案查明：赃物早散给了城南的穷户。民不举，官不究。' },
    { if: { flag: 'jy_fei_let' }, text: '汪家货栈夜里丢了一包湖丝，飞贼没抓着，掌柜的说要换锁。' },
    { if: { flag: 'jy_fei_shout' }, text: '汪家货栈夜里进了飞贼，有人喊跑了贼，汪老爷赏了二十文——街坊都说汪家大方。' },
    { if: { flag: 'jy_yan_note' }, text: '盐枭阎爷放话，东关街的份子钱不收了——但阎爷也记下了一个名字。' },
    { if: { flag: 'jy_sun_biaotai' }, text: '东关街替盐枭收份子的孙彪叫人打趴下了，趴在地上说了半天好话。' },
    { if: { flag: 'jy_sun_out' }, text: '东关街的份子钱这几日没人收了。摊贩们松了口气，又隐隐不安。' },
    { if: { flag: 'jy_lei_biaotai' }, text: '卖艺的李麻子叫人拆穿了刀砍不入的把戏，铜锣哑了好几天。' },
    { if: { flag: 'jy_lei_out' }, text: '西街卖艺场子的锣声停了，不知道李麻子去了哪里。' },
    { if: { flag: 'jy_fei_biaotai' }, text: '汪家货栈墙脊上的黑影叫人揪了下来，原来是个女子。' },
    { if: { flag: 'jy_fei_out' }, text: '汪家货栈的飞贼案有了着落，街坊都说这案子了得干脆。' },
    { if: { flag: 'jy_fei_gone' }, text: '汪家货栈墙外加派了两个更夫，说是怕贼回头。' }
  ]
};
export default pack;
