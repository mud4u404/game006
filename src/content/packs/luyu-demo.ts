import type { ContentPack, EncounterDef, FoeDef, StoryDef } from '../types';

/**
 * 路遇示范（维护者）：协作者写路遇照这里的样子写（docs/content-guide.md「路遇」）。
 *
 * 路遇也是任务，不能潦草（宪章 P9）：
 * - 人物有动机：卖身葬父的姐弟是被盐号逼的；拦路的孩子是饿的；
 * - 选择有两难、有代价：说破了，姐弟没了活路；给了钱，可能被骗；
 * - 世界记得：传闻会提起，过些日子会在别处再遇到那个孩子；
 * - 根基各有用处：悟性看得出草席底下的破绽，胆魄瞪得退小毛贼。
 */

const NIGHT = { hour: { from: 18, to: 6 } };

const ENCOUNTERS: EncounterDef[] = [
  // 卖身葬父、小毛贼都在白天；小毛贼不在府衙门口拦人（审查 B29）
  { id: 'luyu_maishen', region: ['yz'], to: ['cheng', 'dukou'], once: true, if: { hour: { from: 6, to: 19 } }, story: 'ly_maishen' },
  { id: 'luyu_xiaozei', region: ['yz'], to: ['cheng', 'cheng_tavern', 'hu'], once: true, if: { hour: { from: 6, to: 19 } }, story: 'ly_xiaozei' },
  // 那个孩子，过些日子在渡口又遇上了：你当初怎么待他，他现在就是什么样子
  { id: 'luyu_xiaozei_fed', region: ['yz'], to: ['dukou'], once: true, if: { flag: 'ly_xiaozei_fed' }, story: 'ly_xiaozei_fed' },
  { id: 'luyu_xiaozei_beat', region: ['yz'], to: ['dukou'], once: true, if: { flag: 'ly_xiaozei_beat' }, story: 'ly_xiaozei_beat' },
  { id: 'luyu_xiaozei_scared', region: ['yz'], to: ['dukou'], once: true, if: { flag: 'ly_xiaozei_scared' }, story: 'ly_xiaozei_scared' },
  { id: 'luyu_tongchuan', region: ['gz'], to: ['gz_kechuan'], once: true, weight: 0.5, if: NIGHT, story: 'ly_tongchuan' }
];

const STORIES: StoryDef[] = [
  { id: 'ly_maishen', cards: [
    { tag: '路遇', title: '卖身葬父',
      paras: [
        '路边跪着一个十四五岁的姑娘，面前一张草席，草席底下露出一双旧布鞋。她胸前挂着一块木牌，写着四个字：卖身葬父。',
        '过路的人有的摇头，有的扔下一两个铜板。姑娘低着头，一声不吭。'
      ],
      choices: [
        { label: '给她五十文', sub: '银两 −50　侠义 +2', if: { silver: 50 },
          result: '姑娘磕了个头，把铜钱揣进怀里。她抬头看你的那一眼，有点慌。',
          do: [{ type: 'silver', delta: -50 }, { type: 'xia', delta: 2 }, { type: 'flag', flag: 'ly_maishen_paid' }], next: -1 },
        { label: '仔细看看那张草席', sub: '悟性', if: { attr: { key: '悟性', atLeast: 23 } }, next: 1 },
        // 身上没几个钱的人，也能像路人那样放下几文（不算没帮她）
        { label: '摸出几文钱，放在草席边上', sub: '银两 −5', if: { silver: 5 },
          result: '你摸出五文钱，弯腰放在草席边上。姑娘低着头，小声道了句谢。几文钱葬不了人，可总比扭头走开强。',
          do: [{ type: 'silver', delta: -5 }, { type: 'flag', flag: 'ly_maishen_coin' }], next: -1 },
        { label: '走开',
          result: '你走出老远，回头看了一眼。姑娘还跪在那里，雨水顺着木牌往下淌。',
          do: [{ type: 'flag', flag: 'ly_maishen_walk' }], next: -1 }
      ] },
    { tag: '路遇', title: '草席底下',
      paras: [
        '你蹲下来，假装替她理一理草席。草席底下那人的手指，轻轻动了一下。',
        '姑娘的脸一下子白了。草席底下传来一个少年压得极低的声音：「姐……」',
        '躺着的是她弟弟。他们的爹没死，在盐号扛了二十年盐包，压坏了腰，盐号一文钱没赔，把人撵了出来。家里断了米，姐弟俩才想出这个法子。'
      ],
      choices: [
        { label: '当街说破', sub: '骗人终归是骗人',
          result: '你站起身，大声说了一句：「人还活着。」看热闹的人一哄而散，有人朝姐弟俩啐了一口。姐姐拉起弟弟，头也不回地钻进了巷子。',
          do: [{ type: 'flag', flag: 'ly_maishen_exposed' }, { type: 'feed', tag: '江湖', text: '你当街说破了卖身葬父的姐弟。他们的爹，是被盐号撵出来的老脚夫。' }], next: -1 },
        { label: '不说破，给她钱', sub: '银两 −50　侠义 +4', if: { silver: 50 },
          result: '你把钱塞进她手里，低声说：「给你爹抓药，别再跪了。」姑娘咬着嘴唇，眼泪掉在木牌上。',
          do: [{ type: 'silver', delta: -50 }, { type: 'xia', delta: 4 }, { type: 'flag', flag: 'ly_maishen_kind' },
            { type: 'feed', tag: '江湖', text: '你替盐号撵出来的老脚夫出了药钱，没有说破那对姐弟。' }], next: -1 },
        { label: '问清是哪家盐号', sub: '记下这笔账　历练 +20',
          result: '姑娘犹豫了半天，才说是东关街上最大的那家盐号。你把这个名字记在了心里。扬州的盐商，原来是这样发的财。',
          do: [{ type: 'flag', flag: 'ly_maishen_yanhao' }, { type: 'lilian', amount: 20 },
            { type: 'feed', tag: '江湖', text: '卖身葬父的姐弟说，害他们爹的是东关街上最大的那家盐号。' }], next: -1 }
      ] }
  ] },

  { id: 'ly_xiaozei', cards: [
    { tag: '路遇', title: '拦路的小毛贼',
      paras: [
        '巷子拐角，一个半大孩子横着一根木棍拦在路当中，嗓门扯得老高：「把、把钱交出来！」',
        '他的棍子在抖，草鞋露着脚趾，脸上脏得看不出模样，眼睛却一直往你腰间的钱袋上瞟。'
      ],
      choices: [
        { label: '夺下他的棍子', sub: '动手', do: [{ type: 'flag', flag: 'ly_xiaozei_beat' }, { type: 'fight', foe: 'ly_xiaozei' }] },
        { label: '给他一个烧饼钱', sub: '银两 −10', if: { silver: 10 },
          result: '孩子一把抓过铜钱，愣了一下，扔下棍子就跑。跑出几步，又回头冲你喊了一句：「我会还你的！」',
          do: [{ type: 'silver', delta: -10 }, { type: 'flag', flag: 'ly_xiaozei_fed' }], next: -1 },
        { label: '瞪他一眼', sub: '胆魄', if: { attr: { key: '胆魄', atLeast: 26 } },
          result: '你什么也没说，只看了他一眼。孩子的棍子「当啷」掉在地上，转身钻进了巷子，跑丢了一只草鞋。',
          do: [{ type: 'flag', flag: 'ly_xiaozei_scared' }], next: -1 },
        { label: '绕开他',
          result: '你从他身边走过去。他举着棍子，到底没敢落下来。身后传来一声带着哭腔的骂。',
          do: [{ type: 'flag', flag: 'ly_xiaozei_walk' }], next: -1 }
      ] }
  ] },

  { id: 'ly_xiaozei_fed', cards: [
    { tag: '路遇', title: '扛盐包的孩子',
      paras: [
        '渡口上，一个半大孩子扛着比他还宽的盐包，一步一晃地往船上走。你认出了那双露脚趾的草鞋。',
        '他也认出了你，放下盐包跑过来，从怀里掏出一串铜钱，数了十个塞给你：「说了会还的。」他咧嘴一笑，「我叫阿九，在漕帮的船上跑腿。」'
      ],
      choices: [
        { label: '收下', sub: '银两 +10',
          result: '阿九把盐包重新扛上肩，走了两步又回头：「渡口的事，你想打听什么，问我。」',
          do: [{ type: 'silver', delta: 10 }, { type: 'flag', flag: 'ly_ajiu' }], next: -1 },
        { label: '让他留着', sub: '侠义 +2',
          result: '「留着买双鞋。」阿九愣了半天，用袖子使劲擦了擦脸，扛起盐包跑了。',
          do: [{ type: 'xia', delta: 2 }, { type: 'flag', flag: 'ly_ajiu' }], next: -1 }
      ] }
  ] },

  { id: 'ly_xiaozei_beat', cards: [
    { tag: '路遇', title: '码头上的孩子们',
      paras: [
        '渡口的货堆后头蹲着四五个孩子。你认出了当初拦路的那一个，他身后多了几个更小的。',
        '为首的孩子朝你啐了一口，带着他们跑了。码头上的人说，这帮孩子如今跟着黑风寨的喽啰跑腿，有口饭吃。'
      ],
      choices: [
        { label: '托码头上的人照看他们', sub: '银两 −20　侠义 +2', if: { silver: 20 },
          result: '你把钱交给一个老脚夫。老脚夫掂了掂钱袋，叹了口气：「少侠，饭好给，那口气难消啊。」',
          do: [{ type: 'silver', delta: -20 }, { type: 'xia', delta: 2 }], next: -1 },
        { label: '由他们去',
          result: '你站在原地，看着那几个瘦小的背影钻进了芦苇。',
          do: [{ type: 'feed', tag: '江湖', text: '那个被你夺了棍子的孩子，如今跟着黑风寨的喽啰跑腿。' }], next: -1 }
      ] }
  ] },

  { id: 'ly_xiaozei_scared', cards: [
    { tag: '路遇', title: '缺了一只草鞋',
      paras: [
        '渡口边上，一个孩子缩在缆桩后头讨饭，一只脚穿着草鞋，另一只光着，冻得发紫。',
        '他看见你，猛地往后一缩，把破碗挡在胸前。'
      ],
      choices: [
        { label: '买双草鞋给他', sub: '银两 −5', if: { silver: 5 },
          result: '你从鞋摊上买了双草鞋，放在他面前，转身就走。走出老远，听见身后一声很小的「谢谢」。',
          do: [{ type: 'silver', delta: -5 }, { type: 'xia', delta: 1 }], next: -1 },
        { label: '走开',
          result: '你走开了。渡口的风很大，那只光着的脚往破袄里缩了缩。', next: -1 }
      ] }
  ] },

  { id: 'ly_tongchuan', cards: [
    { tag: '路遇', title: '同船的老人',
      paras: [
        '夜里船舱闷，你走到船尾透气。一个白发老人坐在船舷上，拄着一根竹杖，望着黑沉沉的河水。',
        '「后生，你是使剑的。」他没回头，「你走路，右脚总比左脚轻半分，那是常年握剑压出来的。」'
      ],
      choices: [
        { label: '向他请教', next: 1 },
        { label: '敬他一壶花雕', sub: '花雕 −1', if: { item: { id: 'huadiao' } },
          do: [{ type: 'item', id: 'huadiao', delta: -1 }, { type: 'flag', flag: 'ly_tongchuan_wine' }], next: 1 },
        { label: '回舱睡觉',
          result: '你回到舱里躺下。船尾传来竹杖轻轻敲船舷的声音，一下，一下，像在数着什么。天亮时，老人已经下船了。', next: -1 }
      ] },
    { tag: '路遇', title: '运河上的旧事',
      paras: [
        '「前朝有个剑客，在这条运河上，一夜挑了十八条私盐船。」老人用竹杖在船板上划了一道，「人人都说他剑快。其实不是快，是断。」',
        '「对手的刀才起，他的剑已经断了那一刀的念头。你要等的不是破绽，是对手心里那一下犹豫。」',
        '说完，他把竹杖横在膝上，闭上了眼睛。'
      ],
      choices: [
        { label: '再给他斟上一碗', sub: '历练 +150', if: { flag: 'ly_tongchuan_wine' },
          result: '老人睁开眼，接过酒一饮而尽。竹杖忽然在半空里一顿，就那么一顿。你盯着那一顿，看到天亮。',
          do: [{ type: 'lilian', amount: 150 }, { type: 'flag', flag: 'ly_tongchuan' },
            { type: 'feed', tag: '江湖', text: '运河夜船上，一位老人讲了前朝剑客的旧事。剑不在快，在断。' }], next: -1 },
        { label: '把这话记在心里', sub: '历练 +80',
          result: '你在船尾坐到天亮，把那几句话翻来覆去地想。老人什么时候下的船，你都没留意。',
          do: [{ type: 'lilian', amount: 80 }, { type: 'flag', flag: 'ly_tongchuan' },
            { type: 'feed', tag: '江湖', text: '运河夜船上，一位老人讲了前朝剑客的旧事。剑不在快，在断。' }], next: -1 }
      ] }
  ] }
];

const XIAOZEI: FoeDef = {
  id: 'ly_xiaozei', name: '小毛贼', title: '饿急了的半大孩子', ini: '贼', tone: 'gray',
  weapon: '木棍', ws: '棍', tag: '路遇', nature: '刚', reach: '长',
  rank: 0, weak: 0.1, firstTell: 3,
  moves: ['乱打一气', '当头一棍', '横扫'],
  flourish: ['闭着眼睛抡过来', '棍子抡得呼呼响，脚下却直打晃', '咬着牙捅过来'],
  tells: [
    { name: '拼命一棍', text: '孩子双手攥紧木棍，憋红了脸，像是要把全身的力气都砸下来……', dom: 'li', after: '木棍砸在墙上，断成了两截！' },
    { name: '扑上来抱腿', text: '孩子忽然扔了棍子，弓着身子朝你腿上扑过来……', dom: 'su', after: '他自己收不住脚，踉跄了两步。' }
  ],
  asides: ['巷口有人探头看了一眼，又缩了回去。', '孩子的草鞋带子断了。'],
  opening: ['抡空了棍子', '脚下打滑', '喘得直不起腰'],
  intro: '孩子举着棍子往后退了半步，又硬着头皮站住了：「别、别过来！」',
  win: '你一把攥住棍子，轻轻一拧就夺了下来。',
  lose: '你脚下一滑，后脑挨了一棍，眼前一黑。',
  results: {
    win: { tag: '路遇 · 胜', title: '夺下木棍', button: '收手',
      story: '孩子跌坐在泥里，抱着头等你打。他瘦得肩胛骨支棱着，手腕还没你的剑柄粗。你把木棍扔在他脚边，转身走了。',
      // 胜负以后：三条路各接一条后续（渡口的阿九、码头上跟着喽啰跑腿的孩子们、城里的传闻）
      after: {
        plea: '孩子跌坐在泥里，抱着脑袋直哆嗦：「别、别打了……我三天没吃东西了……」',
        opts: [
          { label: '给他几个铜板', sub: '银两 −10　以后在渡口', if: { silver: 10 },
            say: '你从怀里摸出十文钱，丢在他跟前：「去买两个馒头，往后别干这个了。」',
            title: '十文钱',
            story: '孩子愣愣地看着地上的铜板，又看看你，一把抓起来就跑。跑出几步，他又回头冲你喊了一句：「我会还你的！」',
            do: [{ type: 'silver', delta: -10 }, { type: 'flag', flag: 'ly_xiaozei_beat', value: false }, { type: 'flag', flag: 'ly_xiaozei_fed' }],
            later: '他说会还你。往后去渡口，留心那双露脚趾的草鞋。' },
          { label: '把棍子扔还给他，走人', sub: '以后在渡口',
            say: '你把木棍扔在他脚边，转身走了。',
            do: [{ type: 'feed', tag: '江湖', text: '你在巷子里夺了一个小毛贼的棍子。那孩子瘦得只剩一把骨头。' }],
            later: '东关街的小叫化子们会记得，有个佩剑的打过他们的人。往后在渡口，还会见到他。' },
          { label: '下杀手', sub: '恶名 +3',
            say: '你手起剑落。那孩子瘦得像根柴火，倒在泥里，轻得没有一点声音。',
            title: '巷子里的一条人命',
            story: '巷口探出几个脑袋，又飞快地缩了回去。没有人上前，也没有人说话。你提着剑走出巷子，背后静得出奇。',
            do: [{ type: 'eming', delta: 3 }, { type: 'flag', flag: 'ly_xiaozei_beat', value: false }, { type: 'flag', flag: 'ly_xiaozei_dead' },
              { type: 'feed', tag: '江湖', text: '东关街的巷子里，你杀了一个拦路讨钱的孩子。' }],
            later: '城里会传开这件事。江湖上不会有人为它叫好。' }
        ]
      } },
    lose: { tag: '路遇 · 负', title: '阴沟里翻船', button: '爬起来',
      story: '等你爬起来，钱袋里少了十文，那孩子早跑没了影。巷口有人笑出了声。',
      do: [{ type: 'silver', delta: -10 }, { type: 'heal', hpAtLeast: 0.5 }] },
    flee: { tag: '路遇', title: '绕道而行', button: '走开',
      story: '你退出巷子，绕了个远路。那孩子在后头喊了一声，没有追来。' }
  }
};

const pack: ContentPack = {
  encounters: ENCOUNTERS,
  stories: STORIES,
  foes: [XIAOZEI],
  news: [
    { if: { flag: 'ly_maishen_exposed' }, text: '东关街上卖身葬父的姐弟，叫人当街说破，从此再没在城里露过面。', who: ['货郎', '脚夫', '小二'], about: 'you' },
    { if: { flag: 'ly_maishen_kind' }, text: '盐号撵出来的老脚夫，这几日抓上了药。他逢人便说，有位少侠心善。', who: ['脚夫', '郎中', '货郎'], about: 'you' },
    { if: { flag: 'ly_maishen_paid' }, text: '东关街有个姑娘卖身葬父，讨到了钱就不见了。有人说，她爹压根没死。', who: ['货郎', '脚夫', '小二'] },
    { if: { flag: 'ly_maishen_coin' }, text: '东关街卖身葬父的姑娘还跪着，草席边上的铜钱攒了一小堆，都是过路人三文五文放下的。', who: ['货郎', '脚夫', '小二'] },
    { if: { flag: 'ly_ajiu' }, text: '渡口新来个扛盐包的半大孩子，叫阿九，干活不惜力，见人就笑。', who: ['脚夫', '船夫', '盐商'] },
    { if: { flag: 'ly_xiaozei_beat' }, text: '东关街一带的小叫化子，见了佩剑的人就躲。听说有人当街打过他们一个。', who: ['叫化', 'gai', '货郎'], about: 'you' },
    { if: { flag: 'ly_xiaozei_dead' }, text: '东关街的巷子里死了个讨饭的孩子，听说是叫一个佩剑的砍的。小叫化子们夜里都不敢出来了。', who: ['叫化', 'gai', '货郎', '更夫'], about: 'you' }
  ]
};
export default pack;
