import type { Cond, ContentPack, NpcDef, NpcLife } from '../types';

/**
 * 码头与市井的关键人物的活气（Issue #270，docs/sheji-004-007.md 第 005 节）。
 * 焦五、阿七、屠千山都在别人的文件里（shishi-yangzhou.ts、yangzhou.ts），这里只补 life，不改别人的文件；
 * 争码头的另一方「东舵舵主」原来没有这个人，矛盾少一头，这里新写（id yzgj_dongduo，樊九思，名字过了 npm run chaming）。
 *
 * 声口分寸（Issue 点名的四条）：
 * - 焦五粗、讲义气：话短，开口是兄弟、拳头、篙；
 * - 樊九思精明、笑里有刀：开口是账、进账、赔不赔本，对谁都是笑着的；
 * - 屠千山狠、话少：talk 零点一五，闲话一句比一句短；
 * - 阿七嘴硬心软：嘴上硬气，句句绕着他娘。
 * 一句话不许在两人身上出现（tests/huo.test.ts 查 lead、idle 的整句重复）。
 *
 * 樊九思的作息读码头的主人（w.owner）：
 * - 码头归东舵（开局、打跑焦五、调停之后）：白天在运河渡口。两舵对峙、火并那两步他躲开了
 *   （那两步北头站着焦五的人，码头上再站他就挤了，tests/content.test.ts「场景不挤」）；
 * - 码头被西舵夺走、或被府衙封了：白天在东关街望江楼的楼上听信，「被夺走时去别处」，
 *   交谈里也留了话：他每日多半在望江楼，玩家见不着他，知道去哪儿找。
 * 不派差事、不写打斗（第 037 项的势力冲突事件以后再接）。
 */

const MATOU = 'ss_matou';
const ZEI = 'ss_zei';
/** 码头归东舵 */
const DONG: Cond = { w: { owner: { place: 'dukou', is: ['dong'] } } };
/** 码头不归东舵了：被西舵夺走，或叫府衙封了 */
const LOST: Cond = { w: { owner: { place: 'dukou', is: ['xi', 'guan'] } } };
/** 对峙、火并、被夺走、报官这几步他不在渡口（前两步躲开，后两步人已经不在码头上） */
const AWAY: Cond = { shi: { id: MATOU, not: ['duizhi', 'huobing', 'xiduo', 'guanfu'] } };

const NPCS: NpcDef[] = [
  {
    id: 'yzgj_dongduo', name: '樊九思', ini: '樊', tone: 'blue', brief: '捻着扳指', hint: '漕帮东舵舵主',
    at: [
      { room: 'dukou', if: { ...DONG, ...AWAY, hour: { from: 6, to: 18 } } },
      { room: 'cheng_tavern', if: { ...LOST, hour: { from: 6, to: 18 } } }
    ],
    look: '四十来岁，青布长衫浆洗得挺括，右手拇指上一枚旧扳指。眼角常带着笑，笑的时候，眼睛还在看你手边的东西。',
    verbs: ['交谈', '观察'],
    actions: {
      交谈: [
        // 码头叫府衙封了：他在望江楼上，替两边算官府的账
        { if: { shi: { id: MATOU, at: ['guanfu'] } },
          text: '樊九思坐在望江楼楼上靠窗的座头，手边摊着一张纸，见你上来，把纸翻过去压在掌下：「府衙的税棚一搭，过一回船十文，东舵的船也在交。」他替你叫了碗茶，「这十文本不该出。官府的账急不得，先记在东舵名下，早晚要算回来。」' },
        // 码头归了西舵：他还在望江楼上，看着焦五能收几日
        { if: LOST,
          text: '樊九思坐在望江楼楼上，见你上来，把面前的纸收进袖里：「码头如今姓焦，过一回船二十文，收得热闹。」他笑了笑，「私盐的买卖见不得光，这二十文收不了几日。」他把茶碗转了半圈：「樊某做买卖，赔本的事不干。码头早晚要谈个价钱回来。」' },
        // 调停：白日归东舵，夜里的进项让给西舵
        { if: { shi: { id: MATOU, at: ['tiaoting'] } },
          text: '樊九思朝你拱了拱手，笑得客气：「多亏少侠说和，白日码头归东舵，船脚钱照旧入账。」他伸出两根指头比了比，「夜里的进项让给西舵，一个月算下来让出三成。这三成记在东舵账上，早晚连本带利收回来。」' },
        // 打跑了焦五，码头守住
        { if: { shi: { id: MATOU, at: ['dongduo'] } },
          text: '樊九思站在跳板边，见你来，远远拱手：「焦五这一走，旗子又插回缆桩上了。」他压低些声音，「少侠这一趟，东舵记在账上。樊某的账不乱记，谁欠谁的，一笔归一笔。」' },
        // 屠千山刚走，西舵的人刚冒头：他按兵不动
        { if: { shi: { id: MATOU, at: ['qi'] } },
          text: '樊九思在盐垛边踱了两步，见你来，笑着让到一旁：「屠千山走了，北头却来了几个抱胳膊的。」他朝那边努了努嘴，「焦五要这块码头，东舵也要。谁先动手，官府先问谁。」他慢慢走开，「樊某再等等。」' },
        // 开局：屠千山还占着码头
        { if: { notFlag: 'boss' },
          text: '樊九思站在盐垛旁看喽啰扛包，见你走近，朝码头当中努了努嘴：「黑风寨的寨主占着码头卸盐，南头的船排着队过不去。」他把袖口理了理，「帮里的兄弟不敢动，官府不爱管。」他笑了笑，「少侠若能拿他下来，东舵欠你一个人情。日后有事，到东关街望江楼的楼上找我。」' },
        { text: '樊九思朝你拱了拱手，笑容客气：「樊某是东舵管船脚钱的，码头上的事一时半会说不清。少侠有什么要问的，问就是。」' }
      ],
      观察: [
        { text: '他站着的时候，脚尖朝着来路。说话不紧不慢，说到数目字，手指会在掌心点一下。' }
      ]
    },
    life: {
      trade: '舵主', faction: 'dong', talk: 0.5,
      voice: {
        lead: ['把袖口的折痕理了理', '笑了一笑，眼角的纹没有动', '伸出两根指头，把桌上的茶碗挪了挪'],
        idle: [
          { if: { shi: { id: MATOU, at: ['dongduo'] } }, text: '南头的船脚钱照旧入账，兄弟们的饭碗稳了。' },
          { if: { shi: { id: MATOU, at: ['tiaoting'] } }, text: '白日码头归东舵，夜里的进项让给西舵。让出去多少，我一笔一笔记着。' },
          { if: { shi: { id: MATOU, at: ['qi'] } }, text: '码头空出来了，北头站了几个抱胳膊的。谁先开口，谁先沉不住气。' },
          { if: LOST, text: '码头换了东家，我在这楼上替他们算进账。二十文也好，十文也好，能收几日，得看焦五的盐卖到哪一日。' },
          { text: '码头这本账，进多少、出多少、谁欠谁的，我心里一本一本都有数。' }
        ]
      },
      want: [
        { k: 'dds_ben', text: '守住码头的船脚钱，一本不赔', if: DONG },
        { k: 'dds_duo', text: '把码头从西舵手里谈回来，价钱合适就赎', if: { w: { owner: { place: 'dukou', is: ['xi'] } } } },
        { k: 'dds_guan', text: '税棚的事早些打点掉，别叫府衙长占着码头', if: { w: { owner: { place: 'dukou', is: ['guan'] } } } },
        { k: 'dds_shou', text: '守住运河渡口，东舵一本不赔' }
      ],
      fear: '西舵和黑风寨联手，码头两头受敌。',
      knows: [
        { k: 'dds_yan', text: '西舵夜里靠岸的盐船走的是汪家的货，每船的水钱他心里有数' },
        { k: 'dds_jiao', text: '焦五撑了半辈子篙，手底下都是不怕死的船工' }
      ]
    }
  }
];

/* ---------- 三个老人物的活气 ---------- */

const LIFE: Record<string, NpcLife> = {
  // 焦五：漕帮西舵舵主，粗、讲义气。只在对峙、火并、被夺走这三步上岸（shishi-yangzhou.ts 的 at）
  ss_jiaowu: {
    trade: '舵主', faction: 'xi', talk: 0.7,
    voice: {
      lead: ['胳膊抱得更紧', '拿布擦着戟刃', '朝南头努了努嘴'],
      idle: [
        { if: { shi: { id: MATOU, at: ['xiduo'] } }, text: '过一回船二十文，这钱不进我腰包，全花在西舵兄弟身上。' },
        { if: { shi: { id: MATOU, at: ['huobing'] } }, text: '昨夜折了两个弟兄，这笔账得记在东舵头上。' },
        { if: { shi: { id: MATOU, at: ['duizhi'] }, hour: { from: 6, to: 12 } }, text: '北头的兄弟守了三宿了。东舵再不让，就别怪我不讲情面。' },
        { if: { shi: { id: MATOU, at: ['duizhi'] }, hour: { from: 18, to: 21 } }, text: '日头落了，北头的灯还亮着，东舵南头的船一条也没动。' },
        { text: '漕帮的规矩立了上百年：谁的拳头硬，码头就归谁。我这双手撑了半辈子篙，没输过。' }
      ]
    },
    want: [
      { k: 'jw_dock', text: '把运河渡口从东舵手里夺回来', if: { shi: { id: MATOU, at: ['duizhi', 'huobing'] } } },
      { k: 'jw_xue', text: '让火并里折了的弟兄不白死', if: { shi: { id: MATOU, at: ['xiduo'] } } },
      { k: 'jw_shou', text: '守住码头，让西舵的兄弟有饭吃' }
    ],
    fear: '东舵坐大，官府的税吏哪天顺着码头查私盐。',
    knows: [
      { k: 'jw_yan', text: '夜里靠岸的盐船走的是汪家的货，水钱都记在他的折子上' },
      { k: 'jw_bao', text: '东舵的人往府衙递过话，焦五防着这一手', secret: true }
    ]
  },

  // 阿七：东圈门巷口跑腿的孩子，嘴硬心软。只在赔了钱、挨了板子、放出来这几步（shishi-yangzhou.ts 的 at）
  ss_aqi: {
    trade: '跑腿', talk: 0.75,
    voice: {
      lead: ['把脸往墙根别过去', '脚底板在地上蹭了两下', '把袖口往下拽了拽'],
      idle: [
        { if: { shi: { id: ZEI, at: ['huanle'] } }, text: '我娘如今能自己烧饭了。恩公有什么要打听的，只管开口。' },
        { if: { shi: { id: ZEI, at: ['songguan'] } }, text: '二十板子我挨下了。娘的药钱，我还得另想法子。' },
        { if: { shi: { id: ZEI, at: ['zhuo'] }, hour: { from: 7, to: 12 } }, text: '板子打的地方结了痂，坐不得硬凳。要打便打，我一声不吭。' },
        { if: { shi: { id: ZEI, at: ['zhuo'] }, hour: { from: 15, to: 19 } }, text: '过了晌午，巷口也没什么跑腿的活了。我挪到墙阴里，把赚来的铜钱数了一遍。' },
        { text: '扬州城里哪条巷子通哪儿，我没有不知道的。谁家丢了鸡，谁家半夜来了生客，我跑一趟就问得出来。' }
      ]
    },
    want: [
      { k: 'aqi_yao', text: '抓够三副药，让娘的病断根', if: { shi: { id: ZEI, at: ['zhuo', 'songguan'] } } },
      { k: 'aqi_qing', text: '把欠恩公的情还上，城里什么事都替他打听', if: { shi: { id: ZEI, at: ['huanle'] } } },
      { k: 'aqi_ma', text: '给娘治病，别再进大牢' }
    ],
    fear: '大牢的板子，和娘没人管的那几日。',
    knows: [
      { k: 'aqi_xiang', text: '东圈门、东关街哪条巷子夜里没人守，他闭着眼都走得过' },
      { k: 'aqi_gai', text: '城里的叫化子都护着他，谁抢他的东西，第二日准叫人堵在巷口', secret: true }
    ]
  },

  // 屠千山：黑风寨主，狠、话少。劫船那阵子在码头上（yangzhou.ts 的 BOSS_HERE）
  tu: {
    trade: '寨主', faction: 'hei', talk: 0.15,
    voice: {
      lead: ['鬼头刀往地上一顿', '拿眼把你从头到脚扫了一遍', '左臂的布条紧了紧'],
      idle: [
        { if: { flag: 'tu_saw_arm' }, text: '这条左臂阴天就痒。痒完了，刀照样劈。' },
        { if: { hour: { from: 6, to: 12 } }, text: '天亮到晌午，三船盐卸了一半。喽啰的手脚太慢。' },
        { if: { hour: { from: 12, to: 18 } }, text: '日头偏西，剩下的盐包天黑前必须卸完。' },
        { text: '三船盐一袋不少卸下岸，黑风寨在扬州就有立足的地界。' }
      ]
    },
    want: [
      { k: 'tu_xie', text: '天黑前把三船盐卸完', if: { hour: { from: 6, to: 18 } } },
      { k: 'tu_qi', text: '黑风寨的旗子插回运河边上' }
    ],
    fear: '围剿的官兵，和左臂这道没好利索的伤。',
    knows: [
      { k: 'tu_shui', text: '运河哪一段水浅、哪一处能藏船，他都踩过点' },
      { k: 'tu_jiu', text: '左臂是去年腊月在瓜洲落的伤，双手抡刀左边慢半分', secret: true }
    ]
  }
};

const pack: ContentPack = { npcs: NPCS, npcLife: LIFE };

export default pack;
