import type { Cond, ContentPack, NpcLife } from '../types';

/**
 * 扬州三个关键人物的声口（Issue #269，规格 docs/sheji-004-007.md 第 005 节）。
 * 人物都在别的内容包里（yangzhou.ts、xuanshang.ts），这里只补 life，不改别人的文件。
 * 写法承 kp-guren.ts：voice 是打听时说的话；want 是诉求（两条以上，最后一条不带条件）；
 * fear 是他怕的事；knows 是他本来就知道的事，玩家还不能在对话里撞见的标 secret。
 * want、fear、knows 眼下引擎还不读，先把内容写对写足，日后接上。
 * 两句要紧的分寸：
 * - 了尘只在主线里说江伯的旧事，闲话里一个字不碰；
 * - 柳寒舟是柳家公子这件事的底细（父亲的名声）不点名、不点破，只用「家传」「父亲」绕着说。
 */

const XIN: Cond = { flag: 'kp_xin' };
const MORNING: Cond = { hour: { from: 4, to: 8 } };
const OFFICE: Cond = { hour: { from: 8, to: 17 } };

const LIFE: Record<string, NpcLife> = {
  // 了尘：大明寺的白眉老僧，主线开头把玩家引向渡口的人。禅机，点到为止
  liaochen: {
    trade: '僧人', talk: 0.3,
    voice: {
      lead: ['把扫帚靠在银杏树下', '合十，袖口轻轻一垂', '望着寺门外的路，半晌才开口'],
      idle: [
        { if: MORNING, text: '早课的钟声刚过，山门前的石阶还湿着。施主赶路，寺里有一碗热粥。' },
        { if: XIN, text: '这些日子进扬州的人多，渡口也热闹。老衲在山上扫地，听得见山下的脚步。' },
        { if: { flag: 'boss' }, text: '渡口的事了结以后，寺里清净了好些日子。老衲扫地，扫得比从前慢。' },
        { text: '这棵银杏的叶子，落了又长，长了又落。扫地扫了三十年，扫帚换了多少把，老衲记不清了。' }
      ]
    },
    want: [
      { k: 'liaochen_jie', text: '了结当年欠江老三的那桩因果', if: { quest: { id: 'main1', is: 0 } } },
      { k: 'liaochen_watch', text: '看着那后生别走江伯的老路', if: { quest: { id: 'main1', is: 1 } } },
      { k: 'liaochen_clean', text: '把山门前的落叶扫净，该来的人自然会来' }
    ],
    fear: '那后生重蹈江老三的覆辙，又欠下一身还不清的旧账。',
    knows: [
      { k: 'liaochen_jiang', text: '江伯临终托来的后生，带着半块玉佩', secret: true },
      { k: 'liaochen_liu', text: '柳家的公子在扬州与人比剑，只论剑，不论出身' }
    ]
  },
  // 书办：府衙照壁上管悬赏登记的老书办。絮叨、算账、照章办事
  xsb_zhuren: {
    trade: '书吏', faction: 'guan', talk: 0.5,
    voice: {
      lead: ['拿笔杆在墨盒边笃笃两下', '翻开底册，指头点着格子', '从文书堆里抬起眼来'],
      idle: [
        { if: OFFICE, text: '府衙开门，头一件事是看照壁上有没有人揭榜。揭了谁家的，簿子上落一笔。' },
        { if: { flag: 'xsb_xr_done' }, text: '寻人的那桩结了，学徒领回去了，赏钱也发了。簿子上勾了一笔，干净。' },
        { if: { flag: 'xsb_jf_done' }, text: '剿匪的榜也结了，四张榜全办完，我这册子总算能合上了。' },
        { text: '赏格上头批多少，簿上记多少，一文不多一文不少。这个字写错了，改起来要命。' }
      ]
    },
    want: [
      { k: 'xsb_done_all', text: '照壁上贴出去的榜，一张张都有人揭、有人办完' },
      { k: 'xsb_hezei_gone', text: '河贼那八百文也有人拿了去，别在库上压着' },
      { k: 'xsb_quiet', text: '照壁上平平静静，别又贴出什么要人命的新榜' }
    ],
    fear: '揭榜的惹出乱子，上头问下来，担责的是他这张老脸。',
    knows: [
      { k: 'xsb_jine', text: '四张榜的赏格：两百五十文、八百文、一千五百文、三千三百八十文，都是他按府库的规矩拟的' },
      { k: 'xsb_hezei', text: '河贼的榜，上头交代先贴着，赏钱从库银里走' }
    ]
  },
  // 柳寒舟：石桥边撑伞的青衫书生，伞中藏着剑。书生腔、带刺、傲但不下作
  liu: {
    trade: '书生', talk: 0.6,
    voice: {
      lead: ['伞尖在青石上点了点', '收了伞，袖口的水珠还在滴', '抬眼看你，笑意不及眼底'],
      idle: [
        { if: { flag: 'liu_wenjian' }, text: '你那路剑法，柳某想了又想。湖边的雨停了，那顿酒却还欠着。' },
        { if: { flag: 'tu_liu' }, text: '渡口的事，柳某说去就一定会去。' },
        { if: { flag: 'boss' }, text: '渡口那一剑，满城都在说。柳某也该寻个更清静的湖边练剑了。' },
        { text: '伞中剑要练到收放无形，还差着火候。改日再请兄台指教，输赢都要输得明白。' }
      ]
    },
    want: [
      { k: 'liu_win_you', text: '再赢你一回，赢得干净利落' },
      { k: 'liu_sword', text: '伞中剑练到收放无形，不辱没家传的剑名' },
      { k: 'liu_lake', text: '寻一处没人认得柳某的湖边，把剑练熟了' }
    ],
    fear: '辱没了父亲的名声，叫满城人看他笑话。',
    knows: [
      { k: 'liu_hanjiang', text: '那路剑法，看着像瓜洲江边传下来的', if: { flag: 'liu_saw_hanjiang' } },
      { k: 'liu_tu', text: '黑风寨霸着运河渡口，早晚有人去收拾' }
    ]
  }
};

const pack: ContentPack = { npcLife: LIFE };

export default pack;