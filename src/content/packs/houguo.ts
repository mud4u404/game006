import type { ContentPack, EncounterDef, StoryDef } from '../types';

/**
 * 后果（Issue #104）：给二十九个「做了选择却没有后果」的旗标接上后续。
 * 传闻覆盖全部旗标，六条后续路遇挑最值得回味的写。
 */


const ENCOUNTERS: EncounterDef[] = [
  // 1) 夜捕让路了，吴捕头又遇上了你
  { id: 'luyu_yz_zhuifei_af', region: ['yz'], to: ['cheng'], once: true, if: { flag: 'ly_yz_zhuifei_walk' }, weight: 0.8, story: 'hg_zhuifei' },
  // 2) 走失的孩子给钱让他自己走，渡口又见他了
  { id: 'luyu_yz_zouhai_af', region: ['yz'], to: ['dukou'], once: true, if: { flag: 'ly_yz_zouhai_alone' }, weight: 0.8, story: 'hg_zouhai' },
  // 3) 帮漕帮说话后，渡口的漕帮伙计认出你
  { id: 'luyu_yz_huji_cao_af', region: ['yz'], to: ['dukou'], once: true, if: { flag: 'ly_yz_huji_cao' }, weight: 0.7, story: 'hg_huji_cao' },
  // 4) 拆了赌局后，同船客人找你
  { id: 'luyu_jiang_duju_af', region: ['gz'], to: ['gz_kechuan'], once: true, if: { flag: 'ly_jiang_duju_chai' }, weight: 0.7, story: 'hg_duju' },
  // 5) 私盐船喝问后，船家在路上又遇你了
  { id: 'luyu_jiang_yanye_af', region: ['gz'], to: ['gz_duchuan'], once: true, if: { flag: 'ly_jiang_yanye_he' }, weight: 0.7, story: 'hg_yanye' },
  // 6) 卖身葬父走开了，渡口又见那块木牌
  { id: 'luyu_maishen_af', region: ['yz'], to: ['dukou'], once: true, if: { flag: 'ly_maishen_walk' }, weight: 0.6, story: 'hg_maishen' }
];

const STORIES: StoryDef[] = [
  { id: 'hg_zhuifei', cards: [
    { tag: '路遇', title: '又见吴捕头',
      paras: [
        '巷口拐角，吴捕头提着铁尺迎面走来。他认出了你，站住了。',
        '「上回那个贼，又作案了。」他的声音里带着疲惫，「绸缎庄又丢了一匹缎子。你要是上回帮着拦一把就好了。」'
      ],
      choices: [
        { label: '记下了', sub: '不作声',
          result: '吴捕头点点头，没有多说什么，提着铁尺走了。他的背影在巷口拐弯处消失了。',
          next: -1 },
        { label: '下次我帮你拦', sub: '侠义 +1',
          result: '吴捕头愣了一下，嘴角微微翘了翘：「好。六扇门记你这份心。」',
          do: [{ type: 'xia', delta: 1 }], next: -1 }
      ] }
  ] },
  { id: 'hg_zouhai', cards: [
    { tag: '路遇', title: '又见那孩子',
      paras: [
        '渡口的缆桩后面，你认出了那个孩子——还穿着那件旧袄，脸更瘦了，怀里也没了包袱。',
        '他看见你，猛地低下了头，手里攥着几文钱，不知是讨来的还是做什么挣的。'
      ],
      choices: [
        { if: { silver: 5 }, label: '蹲下来跟他说几句话', sub: '侠义 +1，银两 −5',
          result: '你问他吃了吗。他摇摇头。你买了两个炊饼给他。他吃得很快，噎住了也不停。你拍拍他的头，走了。',
          do: [
            { type: 'silver', delta: -5 }, { type: 'xia', delta: 1 },
            { type: 'feed', tag: '江湖', text: '你又在渡口遇到那个走失的孩子，给他买了两个炊饼。' }
          ], next: -1 },
        { label: '走开',
          result: '你从他身边走过。他没抬头。渡口的风很大，吹得人眼睛发涩。', next: -1 }
      ] }
  ] },
  { id: 'hg_huji_cao', cards: [
    { tag: '路遇', title: '漕帮的情',
      paras: [
        '渡口上，一个漕帮的伙计老远跑过来，塞给你一小包烟叶：「上回码头的事，多亏公子帮我们说了话。管事的知道了，让我谢您。」',
        '烟叶是自家晒的，粗糙但香。'
      ],
      choices: [
        { label: '收下', sub: '漕帮的情',
          result: '你收了烟叶。漕帮的伙计咧嘴一笑，跑回船上去了。',
          next: -1 },
        { label: '让他留着', sub: '侠义 +1',
          result: '你摆摆手：「帮忙不是为了这个。」伙计把烟叶往你怀里一塞就跑了。',
          do: [{ type: 'xia', delta: 1 }], next: -1 }
      ] }
  ] },
  { id: 'hg_duju', cards: [
    { tag: '路遇', title: '赌桌上的谢意',
      paras: [
        '又上了客船。船舱里没有赌局——庄家早已不在了。',
        '一个同船的老客认出你：「上回拆穿那个千手的，就是你吧？他走后，船上的赌局散了。大伙儿总算能睡个安稳觉。」'
      ],
      choices: [
        { label: '笑而不语', sub: '历练 +10',
          result: '你笑了笑，没说什么。老客也不再追问，自顾自地看起了江景。',
          do: [{ type: 'lilian', amount: 10 }], next: -1 },
        { label: '问他后来呢',
          result: '「后来？听说去了扬州府，改行做了牙人——换了个行当骗人，不过总比在船上坑人强。」老客摇了摇头。',
          do: [{ type: 'lilian', amount: 10 }], next: -1 }
      ] }
  ] },
  { id: 'hg_yanye', cards: [
    { tag: '路遇', title: '船家的底话',
      paras: [
        '又上了渡船。船家认出了你——上回你出声喝问那条没灯的船，他死死捂住了你的嘴。',
        '「公子，那晚的事……」他压低了声音，「那条船走的道，我爹跑了一辈子也没敢碰。你喝问那一声，是拿命在赌。往后，别了。」',
        '他从怀里摸出一小包干粮，硬塞给你。'
      ],
      choices: [
        { label: '收下干粮', sub: '船家的情',
          result: '干粮又干又硬，但你知道这包东西的分量——是船家把最要紧的告诫，包在了里面。',
          next: -1 },
        { label: '问他到底那条船是什么', sub: '他不说',
          result: '「公子——」船家的声音抖了一下，「有些事，知道了就放不下了。求你，别问。」他把脸别到了一边。', next: -1 }
      ] }
  ] },
  { id: 'hg_maishen', cards: [
    { tag: '路遇', title: '空了的路口',
      paras: [
        '又路过那个路口。草席不在了，木牌不在了，跪着的人也不在了。',
        '地上还留着一个浅浅的膝盖印，被雨水泡得发白了。',
        '你站了一会儿，想起那双露着脚趾的旧布鞋，想起那句「卖身葬父」。你没帮她。'
      ],
      choices: [
        { label: '在膝印旁边放下一文钱',
          result: '你放下一文铜钱，转身走了。风把铜钱吹得转了半圈，停在了膝印的正中间。',
          do: [{ type: 'xia', delta: 1 }], next: -1 },
        { label: '匆匆走过',
          result: '你加快了脚步。路口的膝盖印，被来来往往的脚印一点一点磨平了。', next: -1 }
      ] }
  ] }
];

const pack: ContentPack = {
  encounters: ENCOUNTERS,
  stories: STORIES,
  news: [
    // —— luyu-yangzhou.ts ——
    { if: { flag: 'ly_yz_jianke_bye' }, text: '湖边使剑的船工还在练剑，剑势比先前凌厉了——听说他日日对着湖水练，从不间断。', who: ['船夫', '渔家', '货郎'] },
    { if: { flag: 'ly_yz_tangzi' }, text: '威远镖局的趟子手最近逢人便说，遇上了一个好手，打了一架长了见识。', who: ['镖师', '小二', '掌柜'], about: 'you' },
    { if: { flag: 'ly_yz_tangzi_bye' }, text: '威远镖局的趟子手还在后巷练拳，马步扎得比先前更稳了。', who: ['镖师', '小二', '货郎'] },
    { if: { flag: 'ly_yz_zhuifei_walk' }, text: '夜里城里又丢了东西，六扇门的吴捕头追了三条街没追上，脸色铁青。', who: ['捕快', '更夫', '衙役', 'guan'] },
    { if: { flag: 'ly_yz_huji_cao' }, text: '码头装卸钱的争执，漕帮的伙计们占了上风。有人说，有个佩剑的帮他们说了话。', who: ['脚夫', '船夫', 'dong', 'xi'], about: 'you' },
    { if: { flag: 'ly_yz_huji_yanhao' }, text: '码头装卸钱的争执，盐商的伙计拿着契纸赢了。有人说，是位懂行的人帮着念的。', who: ['脚夫', '船夫', 'wang', '盐商'], about: 'you' },
    { if: { flag: 'ly_yz_huji_none' }, text: '码头装卸钱的争执闹到了官府，官老爷各打五十大板，两帮都不服。', who: ['脚夫', '衙役', 'guan', '船夫'] },
    { if: { flag: 'ly_yz_zouhai_alone' }, text: '城里有个走失的孩子，攥着几文钱在街上游荡，没人知道他是谁家的。', who: ['货郎', '更夫', '叫化'] },
    { if: { flag: 'ly_yz_suanming_chai' }, text: '庙墙根的算命先生收了幌子换了地方，说是碰上了懂行的，砸了饭碗。', who: ['货郎', '和尚', '小二'], about: 'you' },
    { if: { flag: 'ly_yz_shusheng_pay' }, text: '布庄诬赖书生的案子，有人替书生赔了钱。书生抱着书箱走了，说是去府城赶考。', who: ['相公', '货郎', '掌柜'], about: 'you' },
    { if: { flag: 'ly_yz_shusheng_walk' }, text: '布庄掌柜诬赖书生偷绸，书生叫人押去了官府。有看客说，那绸子怕是掌柜自己放的。', who: ['相公', '衙役', '货郎', 'guan'] },
    // —— luyu-jiang.ts ——
    { if: { flag: 'ly_jiang_cha_qian' }, text: '运河夜里的查船规矩钱，听说涨了——有客人替船家垫了，船家记了一路的好。', who: ['船夫', '脚夫', 'dong', 'xi'], about: 'you' },
    { if: { flag: 'ly_jiang_cha_kan' }, text: '运河夜里的漕帮查船，有个客人跟头目对视了半晌没眨眼。头目说：这条好汉，记住了。', who: ['船夫', 'dong', 'xi', '脚夫'], about: 'you' },
    { if: { flag: 'ly_jiang_duju_chai' }, text: '船上的赌局散了——有人拆穿了千术，庄家连夜下了船。同船的客人都说睡了个好觉。', who: ['船夫', '赌客', '脚夫'], about: 'you' },
    { if: { flag: 'ly_jiang_duju_gen' }, text: '运河客船上有赌局，跟着庄家押的客人都赢了。有人说那庄家手稳，也有人说他手快。', who: ['船夫', '赌客', '脚夫'], about: 'you' },
    { if: { flag: 'ly_jiang_yanye_he' }, text: '夜里的运河上有人喝问没灯的船，被船家死死捂了嘴。第二天，那条船照旧没灯地走。', who: ['船夫', '渔家', '更夫', 'dong'] },
    { if: { flag: 'ly_jiang_tun_xiang' }, text: '运河上江豚拜风，船家焚了香，风果然来了。有客人帮着收帆，一船人平安靠岸。', who: ['船夫', '渔家', '脚夫'], about: 'you' },
    // —— luyu-demo.ts ——
    { if: { flag: 'ly_maishen_walk' }, text: '东关街卖身葬父的姑娘不见了。有人看见草席还在，人已经不知去向。', who: ['货郎', '脚夫', '小二', '叫化'] },
    { if: { flag: 'ly_maishen_yanhao' }, text: '有人打听东关街上最大的盐号。掌柜的警觉起来，逢人便问是谁在查。', who: ['盐商', 'wang', '掌柜', '小二'], about: 'you' },
    { if: { flag: 'ly_xiaozei_walk' }, text: '东关街拦路的小毛贼还在，棍子换了一根更粗的，嗓门也更大了。', who: ['货郎', '脚夫', '跑腿'] },
    { if: { flag: 'ly_tongchuan' }, text: '运河夜船上有人讲前朝剑客的旧事——剑不在快，在断。听的人都说好，但没人真懂。', who: ['船夫', '说书', '相公'], about: 'you' },
    // —— 其余 ——
    { if: { flag: 'zhou' }, text: '瓜洲渡口的老船工换了人，老的那位说是回乡种田去了，船上的酒葫芦留给了接班的后生。', who: ['船夫', '渔家', '脚夫'] },
    { if: { flag: 'yh_guanbao' }, text: '东关街盐号的账本叫人翻了，掌柜的连夜把后院的门上了三道锁。', who: ['盐商', 'wang', '掌柜', '小二'], about: 'you' },
    { if: { flag: 'yh_ya' }, text: '汪家盐号放了一纸身契，说是老爷积德。知情人都说，是叫人拿住了把柄。', who: ['盐商', 'wang', '牙子', '小二'] },
    { if: { flag: 'yh_caught' }, text: '汪家盐号夜里进了贼，叫人撞见跑了。汪老爷加了双岗，契匣换了个铁的。', who: ['盐商', 'wang', '更夫', '掌柜'] },
    { if: { flag: 'cangjing_juan' }, text: '大明寺藏经阁丢了经卷，方丈说是家贼。知客僧却说，经卷自己长了脚。', who: ['和尚', '货郎', '小二'] },
    { if: { flag: 'fuya_jiang_truth' }, text: '府衙的周捕头提起了瓜洲江家，说江家的孩子有骨气，敢在公堂上说实话。', who: ['捕快', '衙役', 'guan', '书吏'] },
    { if: { flag: 'fuya_jiang_hide' }, text: '府衙的周捕头问起瓜洲的人，没人说得出什么。他叹了口气，没再问。', who: ['捕快', '衙役', 'guan'] },
    { if: { flag: 'mem3_ask' }, text: '瓜洲渡当年那个问巡检名字的孩子，如今已在江湖上行走了。有人说，他还记着那位巡检的名字。', who: ['渔家', '船夫', '说书'] }
  ]
};
export default pack;
