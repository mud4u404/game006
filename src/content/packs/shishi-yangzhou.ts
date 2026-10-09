import type { ContentPack, Cond, FoeDef, NewsDef, NpcDef, ShiDef, StoryDef } from '../types';

/**
 * 扬州的世事示范（docs/huojianghu.md）：江湖自己转，玩家不插手，事情也会走到结局。
 * - 码头空出来以后：屠千山一倒，漕帮东西两舵争运河渡口。不管它，西舵占了码头；插手的有三条路：打跑焦五、调停、报官。
 * - 东关街夜里闹贼：偷药的是个孩子。不管它，衙役拿住他打板子；插手的有两条路：扭送府衙、替他赔钱。
 * 人有作息：更夫、黑影只在夜里出来，阿七白天在街上跑腿。
 */

const MATOU = 'ss_matou';
const ZEI = 'ss_zei';
/** 贼还在偷 */
const ZEI_OPEN: Cond = { shi: { id: ZEI, at: ['qi', 'bang'] } };
/** 夜里：亥时到寅时 */
const NIGHT = { from: 21, to: 5 };

const SHI: ShiDef[] = [
  {
    id: MATOU, name: '码头空出来以后', region: 'yz', start: { flag: 'boss' }, first: 'qi',
    steps: {
      qi: {
        now: '屠千山一倒，运河渡口空了出来。码头北头多了几个西舵的生面孔，抱着胳膊，什么活也不干。',
        news: '屠千山一倒，渡口那块码头成了肥肉，漕帮东西两舵都盯上了。',
        next: { days: 2, to: 'duizhi' }
      },
      duizhi: {
        now: '西舵的焦五带人占了码头北头，东舵的人守着南头，两边谁也不让，脚夫们都不敢上工。',
        news: '渡口上漕帮两舵对峙，脚夫们都不敢上工了。',
        where: 'dukou', next: { days: 3, to: 'huobing' }
      },
      huobing: {
        now: '两舵在码头上动了刀子，东舵折了三个兄弟。西舵人多，再拖两天，码头就是焦五的了。',
        news: '渡口夜里火并，见了血，东舵吃了亏。',
        where: 'dukou', next: { days: 2, to: 'xiduo' }
      },
      xiduo: {
        now: '码头归了西舵。焦五的人守着跳板，过一回船先交二十文；夜里常有盐船悄悄靠岸。',
        news: '渡口归了西舵，过一回船要交二十文，夜里常有盐船靠岸。',
        where: 'dukou'
      },
      dongduo: {
        now: '你打跑了焦五，东舵守住了码头。东舵的兄弟都记着你。',
        news: '渡口那位少侠又出手了，焦五叫他打得丢了码头。'
      },
      tiaoting: {
        now: '你把两舵领头的叫到一处，码头一分为二：白天归东舵，夜里归西舵，没再见血。',
        news: '漕帮两舵不打了，听说是一位少侠从中说和，码头一家一半。'
      },
      guanfu: {
        now: '你报了官。府衙封了码头，搭起税棚，两舵谁也没占着，过船的钱倒先交给了官府。',
        news: '府衙封了渡口，搭了税棚，漕帮两舵都没占着便宜。'
      }
    }
  },
  {
    id: ZEI, name: '东关街夜里闹贼', region: 'yz', start: { quest: { id: 'prologue', atLeast: 3 } }, first: 'qi',
    steps: {
      qi: {
        now: '东关街这几夜接连失窃，药铺丢了药，绸缎庄丢了一匹缎子。街坊说那贼身子轻，翻墙没有声响。',
        news: '东关街夜里闹贼，药铺掌柜骂了一早上。',
        next: { days: 4, to: 'bang' }
      },
      bang: {
        now: '府衙为东关街的贼贴了告示，赏钱五百文。夜里照偷不误，偷的多半是药。',
        news: '府衙贴出告示，捉东关街的贼，赏钱五百文。',
        next: { days: 5, to: 'zhuo' }
      },
      zhuo: {
        now: '衙役在龙王庙后头拿住了那个贼，是个十三四岁的孩子，偷药是给他娘治病。孩子挨了二十板子，他娘的病没人管。',
        news: '东关街的贼拿住了，是个半大孩子，挨了二十板子。'
      },
      songguan: {
        now: '你把偷药的孩子扭送了府衙，领了五百文赏钱。他娘的病，没人管了。'
      },
      huanle: {
        now: '你替阿七赔了药钱和缎子钱，他娘的病有了着落。阿七说，往后扬州城里的事，他替你打听。'
      }
    }
  }
];

const NPCS: NpcDef[] = [
  /* ---------- 码头 ---------- */
  { id: 'ss_jiaowu', name: '焦五', ini: '焦', tone: 'red', brief: '抱着胳膊', hint: '漕帮西舵舵主',
    look: '精瘦的黄脸汉子，两只手又粗又大，撑了半辈子篙。腰里别着一对短戟，戟刃磨得雪亮。',
    at: { room: 'dukou', if: { shi: { id: MATOU, at: ['duizhi', 'huobing', 'xiduo'] } } },
    verbs: ['交谈', '观察', { verb: '调停', if: { shi: { id: MATOU, at: ['duizhi', 'huobing'] } } }, '动手'],
    actions: {
      交谈: [
        { if: { shi: { id: MATOU, at: ['duizhi'] } },
          text: '焦五斜眼看你：「屠千山是你打跑的？那又怎样。码头空着，谁拳头硬就归谁，漕帮的规矩向来如此。」他朝南头努努嘴，「东舵那几个老骨头，守得了几天？」' },
        { if: { shi: { id: MATOU, at: ['huobing'] } },
          text: '焦五拿布擦着短戟上的血：「昨夜的事你听说了？是东舵先动的手。」他笑了笑，「再过两天，这码头就姓焦了。」' },
        { text: '「过船二十文，少侠也不例外。」焦五嘿嘿一笑，「当然，少侠要是肯替西舵办事，那就另说。」' }
      ],
      调停: [
        { if: { any: [{ xia: 30 }, { attr: { key: '胆魄', atLeast: 25 } }] },
          text: '你把东西两舵领头的叫到码头当中，一边一碗酒：「屠千山劫船的时候，两舵谁出过一刀？如今码头空了，倒先拿刀对着自家兄弟。」焦五脸上青一阵白一阵，老管事低头不语。半晌，焦五把碗一摔：「白天归东舵，夜里归西舵。看在你的面子上。」',
          do: [{ type: 'shi', id: MATOU, to: 'tiaoting' }, { type: 'xia', delta: 3 },
            { type: 'rel', npc: 'guanshi', value: '相谈甚欢', from: ['素不相识', '点头之交'], note: '漕帮两舵争码头，你从中说和' },
            { type: 'feed', tag: '江湖', text: '你替漕帮两舵说和：码头一分为二，白天归东舵，夜里归西舵。' }] },
        { text: '焦五上下打量你：「你算哪根葱？扬州城里没几个人认得你，凭什么替两舵说话？」身后的汉子们哄笑起来。要说得动这些人，得有名望，或者有一身压得住场面的胆气。' }
      ],
      动手: [{ do: [{ type: 'fight', foe: 'ss_jiaowu' }] }]
    } },
  { id: 'ss_shuili', name: '税吏', ini: '税', tone: 'gray', brief: '坐在税棚下记账',
    look: '穿着半旧的青袍，账簿摊在膝上，毛笔夹在耳朵后头。',
    at: { room: 'dukou', if: { shi: { id: MATOU, at: ['guanfu'] } } },
    verbs: ['交谈', '观察'],
    actions: { 交谈: [{ text: '「过船一趟，抽十文。府台的告示贴着呢，自己看。」税吏头也不抬，「漕帮？漕帮的船也一样。」' }] } },

  /* ---------- 东关街，夜里 ---------- */
  { id: 'ss_gengfu', name: '更夫', ini: '更', tone: 'gray', brief: '提着梆子',
    look: '佝偻着背，一手梆子一手铜锣，灯笼上写着一个「更」字。',
    at: { room: 'cheng', if: { hour: NIGHT } },
    verbs: ['交谈', '观察'],
    actions: {
      交谈: [
        { if: ZEI_OPEN,
          text: '更夫把灯笼往你脸上照了照，才压低声音：「那贼我见过。个头不高，像个孩子，专往药铺后墙去，子时前后来，往运河堤那边跑。」他敲了一下梆子，「我一个打更的，追不上。」' },
        { if: { shi: { id: ZEI, at: ['zhuo'] } },
          text: '「那孩子挨板子那天，我也在。」更夫叹了口气，「二十板子，一声没哭。」' },
        { text: '「天干物燥，小心火烛——」更夫拖长了调子，走远了。' }
      ]
    } },
  { id: 'ss_heiying', name: '黑影', ini: '影', tone: 'gray', brief: '蹲在药铺后墙根',
    look: '瘦瘦小小的一团，蹲在墙根的阴影里，一动不动，像是在等更夫走远。',
    at: { room: 'cheng', if: { hour: NIGHT, ...ZEI_OPEN } },
    verbs: ['观察', '跟上去'],
    actions: { 跟上去: [{ do: [{ type: 'story', id: 'ss_zei_gen' }] }] } },

  /* ---------- 阿七：替他赔了钱以后，白天在东圈门巷口跑腿 ---------- */
  { id: 'ss_aqi', name: '阿七', ini: '七', tone: 'amber', brief: '在巷口跑腿',
    look: '十三四岁，瘦得像根竹竿，眼睛却亮。屁股上的板子伤还没好利索，走路一瘸一拐的，跑起来倒比谁都快。',
    at: { room: 'yz_dongquan', if: { hour: { from: 7, to: 19 }, shi: { id: ZEI, at: ['huanle'] } } },
    verbs: ['交谈', '观察', '打听'],
    actions: {
      交谈: [{ text: '「恩公！」阿七一溜烟跑过来，「我娘吃了三副药，能下地了。您要打听什么，只管问我。」' }],
      打听: [{ text: '阿七扳着指头，把扬州城里这几日的事一五一十说给你听：码头上谁跟谁不对付，府衙又贴了什么告示，哪家夜里来了生客。',
        do: [{ type: 'shi', id: MATOU }, { type: 'shi', id: ZEI }, { type: 'news' }] }]
    } }
];

const FOES: FoeDef[] = [
  {
    id: 'ss_jiaowu', name: '焦五', title: '漕帮西舵舵主', ini: '焦', tone: 'red', weapon: '双短戟', ws: '刺', tag: '争码头',
    nature: '刚', reach: '短', rank: 1.6, build: 'outer', firstTell: 2,
    moves: ['撑篙式', '双戟锁喉', '翻身上船', '横扫跳板'],
    flourish: ['短戟贴着你的手腕削过来', '一肘撞在你肋下', '脚下踩着湿滑的跳板，稳得像钉子', '双戟一错，铮的一声'],
    tells: [
      { name: '撑篙破浪', text: '焦五双戟并在一处，像撑篙一样往后一缩，脚下扎稳……', dom: 'li', after: '双戟齐出，像一根篙子直捅过来，力道大得能把船撑离岸。' },
      { name: '双戟锁喉', text: '焦五身子一矮，双戟交叉护在胸前，一步一步贴上来……', dom: 'qiao', after: '双戟一张一合，专锁你的咽喉和手腕。' }
    ],
    asides: ['码头两头的汉子都停了手，伸着脖子看。', '老管事攥着算盘，指节都白了。', '脚夫们躲在盐包后头，大气也不敢出。'],
    opening: ['双戟扎得太深，一时拔不回来', '跳板一晃，他脚下乱了半步', '换气时胸口一空'],
    intro: '焦五把双戟在手里一磕：「替东舵出头？好，码头上的事，码头上了。」',
    win: '焦五的左戟脱手，掉进了运河里。他捂着肩膀退到跳板边上，西舵的汉子们面面相觑，没有一个上来。',
    lose: '焦五一肘撞在你胸口，你仰面摔在盐包上。西舵的人哄笑起来。',
    results: {
      win: { tag: '争码头 · 胜', title: '码头守住了', button: '回到码头',
        story: '西舵的人收了家伙，一个个上了船。东舵的汉子们从南头涌过来，把那面东舵的旗子插回缆桩上。老管事一把握住你的手，半天说不出话。',
        do: [{ type: 'shi', id: MATOU, to: 'dongduo' },
          { type: 'rel', npc: 'guanshi', value: '知交', note: '漕帮两舵争码头，你打跑焦五，替东舵守住了码头' }],
        after: {
          plea: '焦五靠在缆桩上喘着粗气：「码头你们拿去。我焦五认栽，可西舵的兄弟没犯什么王法。」',
          opts: [
            { label: '让他带西舵的人走', sub: '他会记着这笔账',
              say: '你朝船那边抬了抬下巴。焦五咬着牙，带西舵的人上了船，临走前回头看了你一眼。',
              do: [{ type: 'flag', flag: 'ss_jiaowu_zou' }],
              later: '焦五丢了码头，不会就这么算了。' },
            { label: '押他去府衙', sub: '侠义 +2',
              say: '你把焦五捆了，交给了府衙。周捕头翻了翻卷宗：「私贩官盐，正想拿他。」',
              do: [{ type: 'flag', flag: 'ss_jiaowu_guan' }, { type: 'xia', delta: 2 }],
              later: '西舵要换舵主了。' }
          ]
        } },
      lose: { tag: '争码头', title: '栽在码头上', button: '爬起来',
        story: '焦五把短戟插回腰里：「回去再练几年。」码头上的事，照旧没人管得了。',
        do: [{ type: 'heal', hpAtLeast: 0.5 }] }
    }
  }
];

const STORIES: StoryDef[] = [
  {
    id: 'ss_zei_gen',
    cards: [
      { tag: '东关街', title: '夜里的黑影',
        paras: ['子时前后，东关街上只剩下更夫的梆子声。药铺后墙根下的黑影蹲了半晌，忽然一纵身上了墙头。',
          '他落地没有一点声响，怀里鼓鼓囊囊的，翻过两条巷子，往运河堤那边去了。'],
        choices: [
          { label: '远远跟上去', sub: '身法够轻，才跟得住', if: { attr: { key: '身法', atLeast: 24 } }, next: 1 },
          { label: '守在药铺后墙，等他再来', sub: '要熬一个时辰', do: [{ type: 'time', add: 60 }], next: 1,
            result: '你在墙根下熬到四更天，那黑影果然又摸了回来。这一回你早有防备，一路跟住了他。' },
          { label: '不关我的事', next: -1 }
        ] },
      { tag: '龙王庙', title: '草棚里的咳嗽声',
        paras: ['黑影钻进龙王庙后头一间漏风的草棚。你凑近门缝：半截蜡烛底下，一个妇人裹着破棉絮咳个不停，黑影蹲在她身边，是个十三四岁的孩子，正把偷来的药一包包拆开，往瓦罐里倒。',
          '「娘，这回是济生堂的方子，郎中说吃三副就好。」妇人咳得说不出话，只拿手摸了摸他的头。',
          '门边的破筐里，还塞着一匹没拆封的缎子。'],
        choices: [
          { label: '把他揪去府衙', sub: '赏钱五百文，他要挨板子',
            do: [{ type: 'shi', id: ZEI, to: 'songguan' }, { type: 'silver', delta: 500 },
              { type: 'feed', tag: '江湖', text: '你把东关街偷药的孩子扭送了府衙，领了五百文赏钱。' }],
            result: '孩子没有跑，只回头看了他娘一眼。你押着他穿过半座扬州城，周捕头验过赃物，点了五百文给你。身后的堂上，板子一下一下地落。', next: -1 },
          { label: '替他赔了药钱和缎子钱', sub: '银两 −400 文，侠义 +5', if: { silver: 400 },
            // 「第二天一早」去赔钱：时辰跟着走到早上
            do: [{ type: 'shi', id: ZEI, to: 'huanle' }, { type: 'silver', delta: -400 }, { type: 'xia', delta: 5 }, { type: 'time', set: 9 * 60 },
              { type: 'rel', npc: 'ss_aqi', value: '相谈甚欢', note: '你替他赔了药钱，他娘的病有了着落' },
              { type: 'feed', tag: '江湖', text: '你替偷药的孩子阿七赔了药钱和缎子钱。阿七说，往后扬州城里的事，他替你打听。' }],
            result: '孩子吓得跪在地上。你把他扶起来，问了名字，叫阿七。第二天一早，你领着他去药铺和绸缎庄赔了钱，又请济生堂的郎中去草棚看了他娘。阿七一路上没说话，临走时冲你磕了个头：「恩公，往后扬州城里的事，我替你打听。」', next: -1 },
          { label: '领他去药铺和绸缎庄赔罪', sub: '侠义够了，掌柜们肯卖你一个面子', if: { xia: 20 },
            do: [{ type: 'shi', id: ZEI, to: 'huanle' }, { type: 'xia', delta: 3 }, { type: 'time', set: 9 * 60 },
              { type: 'rel', npc: 'ss_aqi', value: '相谈甚欢', note: '你领他去赔罪，掌柜们看你的面子没有报官' },
              { type: 'feed', tag: '江湖', text: '你领着偷药的孩子阿七去药铺和绸缎庄赔罪，掌柜们看你的面子，没有报官。' }],
            result: '第二天一早，你领着孩子去了药铺。掌柜认得你，叹了口气，把那几包药钱一笔勾了；绸缎庄的东家收回了缎子，也没再追究。孩子叫阿七，临走时冲你磕了个头：「恩公，往后扬州城里的事，我替你打听。」', next: -1 },
          { label: '悄悄走开，就当没看见', sub: '他还会再偷',
            do: [{ type: 'flag', flag: 'ss_zei_fang' }],
            result: '你退回巷子里。草棚里的咳嗽声跟了你很远。', next: -1 }
        ] }
    ]
  }
];

const NEWS: NewsDef[] = [
  { if: { flag: 'ss_jiaowu_zou' }, text: '西舵的焦五丢了码头，听说去了瓜洲，放话要找回这个场子。' },
  { if: { flag: 'ss_jiaowu_guan' }, text: '漕帮西舵的焦五叫人押进了府衙大牢，西舵换了舵主。' },
  { if: { flag: 'ss_zei_fang', shi: { id: ZEI, at: ['zhuo'] } }, text: '东关街那个偷药的孩子挨了板子，他娘还躺在龙王庙后头的草棚里。' }
];

const pack: ContentPack = { shi: SHI, npcs: NPCS, foes: FOES, stories: STORIES, news: NEWS };
export default pack;
