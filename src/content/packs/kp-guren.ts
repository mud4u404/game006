import type { Cond, ContentPack, Effect, FoeDef, NpcDef, Range, ShiDef, StoryDef } from '../types';

/**
 * 序章里的三个人，进了扬州（瓜洲）以后接着活（docs/kaipian.md 第三稿第一条，规格见 docs/sheji-021-026.md）：
 * - 褚七（kp_chu）：独臂镖师。运河渡口，入夜扛包。渡了他、请二位上船说清楚、不渡但把他救上了岸，三条路各说各的话；
 *   不渡又没救上来的，他不在扬州（作息的条件里没有这一条路）；
 * - 卫衡（kp_wei）：白天在东关街访人，夜里回广陵客栈。三条路的关系各不相同；
 * - 卞婆婆（kp_bian）：瓜洲渡口小屋门口，上午来放一块豆腐。回瓜洲才碰得到，说焦船后来怎样；不渡又没救人的那条路上，她提一句下游捞起过一个人。
 *
 * 旗标：kp_du / kp_wen / kp_bu / kp_jiu 来自序章（prologue.ts）；
 * kp_chu_name：认得他姓褚（序章里他自报过，或在扬州头一回说话时报的）；kp_chu_met、kp_wei_met：头一回说过话；
 * kp_chu_zuo：褚七说了「雇他的人左手使刀」；kp_wei_pai、kp_zhou_pai：腰牌给卫衡、周捕头看过（周捕头在 fuya.ts）。
 *
 * 第四稿（docs/kaipian.md「序章的人在扬州动起来」）：卫衡寻褚七，是江湖上第一件自己会发生的事（世事 kp_xun，本文件末尾的 SHI）。
 * 三步：访人（进扬州当日）、风声（三日后）、对面（再两日，夜里，运河渡口；这一步有一个江湖日的窗口，下线补日子也不会替玩家了结）；
 * 不插手：多数褚七连夜跑了（pao），少数死在渡口（si，世界种子抽）。玩家能做的，写在「递话」「劝告」「插手」三个动作和 xun_* 几段剧情里。
 * 新旗标：kp_wei_ans（对卫衡回过话）、kp_wei_told（告诉了他下落）、kp_wei_lied（指了错路）、kp_wei_lied_known（他知道被骗了）、
 * kp_chu_gripe（褚七说过那一笔怨）、kp_dui_beat（渡口那夜打赢了卫衡）、kp_zuo_dui（渡口调停成功，左手两条线对上）。
 *
 * 第五稿（docs/kaipian.md「插手要走时间，在场与不在场各有各的收法」）：插手只改安排，不当场收，到「对面」那夜（二十三时）才结算；
 * 那一刻玩家在渡口，走 *_see 那几步（「你看见……没有出手」），不在，走原来的几步。安排用旗标记着，世事的 next.route 读它：
 * kp_chu_warned（提醒了褚七，他躲开了）、kp_chu_meet（劝他当面了结，约在对面那夜）、kp_wei_told（告诉了卫衡，对面提前到次夜）、
 * kp_wei_lied（指了错路，从原定日子再晚两日）；kp_wei_told_said、kp_zou_known 是卫衡已经说过那一句。
 *
 * NpcLife 上的 want、refuse、has 接入 021、022；拒绝限定打听，交谈里的既有剧情仍按旗标、关系分支继续。
 * fear、knows 的打听入口留给后续人物任务，现有交谈先把相应的话说出来。
 * 剧透词（黑水盟、寒江派、账册……）一概不碰。
 */

/** 序章走完了，新开局 */
const NEW: Cond = { quest: { id: 'prologue', atLeast: 3 }, flag: 'kp_xin' };
/** 褚七在扬州：渡了他，请二位上船，或者不渡却把他救上了岸（kp_jiu）。不渡又没救上来的，扬州没有这个人 */
const CHU_HERE: Cond = { ...NEW, any: [{ flag: 'kp_du' }, { flag: 'kp_wen' }, { flag: 'kp_jiu' }] };
const WARM = ['相谈甚欢', '知交', '结拜兄弟', '情缘'];
/** 只算点头之交（不含更好的）：调停的门槛分档用 */
const PLAIN = ['点头之交'];
const CHU_WARM: Cond = { rel: { npc: 'kp_chu', is: WARM } };

/* ---------- 第四稿：卫衡寻褚七 ---------- */
const XUN = 'kp_xun';
/** 这件世事眼下在这几步之一 */
const at = (...steps: string[]): Cond => ({ shi: { id: XUN, at: steps } });
const NIGHT = { from: 21, to: 5 };
/**
 * 对面那一夜「今夜」：对面这一步，且离当夜二十三时结算只剩两三个钟头。
 * 对面是起头后九个半钟头再往后第一个二十三时，起头钟点不同，结算可能落在第二夜；只看「夜里」会让前一夜就看见、插得上手
 */
const TONIGHT: Cond = { shi: { id: XUN, at: ['duimian'], left: { below: 3 } } };
/** 对面那一步，可离当夜结算还有三个钟头以上：这一夜还差着，只能说「挑个夜里」「过一两日」 */
const MORE_THAN_NIGHT: Cond = { shi: { id: XUN, at: ['duimian'], left: { atLeast: 3 } } };
/** 卫衡还在寻、对面还没到的几步：安排（提醒、劝当面、告诉、指错）只谈得上在这几步里 */
const BEFORE = ['fang', 'feng', 'cuo'];
/** 风声以后（褚七知道卫衡在找他）：他还在渡口的几步 */
const AFTER_FENG = ['feng', 'cuo', 'duimian', 'tiaoting'];
/** 了结了的几步（不插手的、安排好的、在场看着的、插手的） */
const ENDS = ['pao', 'pao_see', 'si', 'si_see', 'zou', 'zou_see', 'dangmian', 'dangmian_see', 'tiaoting', 'bangwei', 'hubai', 'duye'];
/** 这件世事眼下在这几步之一，且走到这一步已经过了几个钟头（人物的话随日子换） */
const atAge = (steps: string[], age: Range): Cond => ({ shi: { id: XUN, at: steps, age } });
/** 不低于点头之交，也没有过节 */
const GOOD = ['点头之交', '相谈甚欢', '知交', '结拜兄弟', '情缘'];
/** 渔家的本领：认得浅滩、会放缆绳（序章里选过的，旗标来自 prologue.ts）：夜里撑船过运河靠它 */
const BOATMAN: Cond = { any: [{ flag: 'kp_qiantan' }, { flag: 'kp_lan' }] };

/**
 * 关系往好处走一档、往坏处走一档（rel 效果只会设成某个值，所以按阶梯逐档写）。
 * 次序有讲究：往上的从最高档写起、往下的从最低档写起，同一个人一次只挪一档，不会顺着一路滑下去。
 * 人情备注每条都写上：没有挪动的（已经到顶、到底）备注也换成这一条
 */
const relUp = (npc: string, note: string): Effect[] => [
  { type: 'rel', npc, value: '知交', from: ['相谈甚欢'], note },
  { type: 'rel', npc, value: '相谈甚欢', from: ['点头之交'], note },
  { type: 'rel', npc, value: '点头之交', from: ['素不相识'], note },
  { type: 'rel', npc, value: '点头之交', from: ['心存芥蒂'], note },
  { type: 'rel', npc, value: '心存芥蒂', from: ['有隙'], note }
];
const relDown = (npc: string, note: string): Effect[] => [
  { type: 'rel', npc, value: '有隙', from: ['心存芥蒂'], note },
  { type: 'rel', npc, value: '心存芥蒂', from: ['素不相识'], note },
  { type: 'rel', npc, value: '心存芥蒂', from: ['点头之交'], note },
  { type: 'rel', npc, value: '点头之交', from: ['相谈甚欢'], note },
  { type: 'rel', npc, value: '相谈甚欢', from: ['知交'], note }
];

const NPCS: NpcDef[] = [
  {
    id: 'kp_chu', name: '独臂镖师', altName: { if: { flag: 'kp_chu_name' }, name: '褚七' },
    ini: '褚', tone: 'gray', brief: '扛着盐包', hint: '独臂',
    // 夜里在码头扛包，白天不见人（睡在船篷底下）
    at: { room: 'dukou', if: { ...CHU_HERE, hour: { from: 21, to: 5 } } },
    look: '右袖空荡荡地掖在腰带里，盐包只压左肩，走起路来有些斜。人黑瘦，眼窝很深，像是很久没有睡过一个整觉。',
    gift: '褚七接过酒壶，没有急着喝，先拿袖口擦了擦壶嘴，递回来让了一让，见你摆手，才仰头灌了一口。',
    likes: ['huadiao'],
    verbs: ['交谈', '观察', '赠礼',
      // 卫衡寻褚七：对褚七提醒、劝他当面了结（xun_chu，只改安排，到对面那夜才结算）；对面那一夜在场，伸手管不管（xun_dui）
      { verb: '劝告', if: { ...at(...BEFORE), flag: 'kp_chu_met', notFlag: 'kp_chu_warned', any: [{ notFlag: 'kp_chu_meet' }] } },
      { verb: '插手', if: { ...TONIGHT, hour: NIGHT } }],
    actions: {
      劝告: [{ text: '褚七把盐包撂在垛上，抬头等你开口。', do: [{ type: 'story', id: 'xun_chu' }] }],
      插手: [
        { if: { flag: 'kp_chu_meet' }, text: '褚七朝你点了点头，没有躲：「小哥，今夜我自己说。」', do: [{ type: 'story', id: 'xun_dui' }] },
        { text: '褚七把盐包放下了，目光在你和卫衡之间转了一转。', do: [{ type: 'story', id: 'xun_dui' }] }
      ],
      交谈: [
        // 头一回见面，三条路各不相同
        { if: { flag: 'kp_du', notFlag: 'kp_chu_met' },
          text: '独臂人正把一包盐扛上肩，见是你，慢慢放了下来，用那一只手抱了抱拳。「小哥。」他的嗓子还是哑的，「卫家的人白日在城里打听，我只敢夜里出来，扛一夜包，换两顿饭。」他顿了顿，「那一夜在江上，我的话说了一半。你肯听，往后我慢慢说。」',
          do: [{ type: 'flag', flag: 'kp_chu_met' }, { type: 'flag', flag: 'kp_chu_name' }] },
        { if: { flag: 'kp_wen', notFlag: 'kp_chu_met' },
          text: '独臂人正弯着腰扛包，听见脚步声，肩头一僵，慢慢直起身来。「是你。」他没有抱拳，也没有让路，「那夜船上，当着卫家那位的面，你让我把二十年前的事一件一件说了出来。我不怪你，也谢不了你。」他把盐包往肩上一甩，「在下褚七。小哥，各走各的路罢。」',
          do: [{ type: 'flag', flag: 'kp_chu_met' }, { type: 'flag', flag: 'kp_chu_name' }] },
        { if: { flag: 'kp_bu', notFlag: 'kp_chu_met' },
          text: '独臂人坐在缆桩边，拿那只手拧着衣角，见了你，怔了怔，随即笑了。「那夜我在水里喝了半条江。」他笑了笑，又道：「爬上滩的时候，只记得有个撑船的后生，站在泥里。」他站起身，朝你抱了抱拳，「在下褚七。水里捞上来的命，我记着。」',
          do: [{ type: 'flag', flag: 'kp_chu_met' }, { type: 'flag', flag: 'kp_chu_name' }] },
        // 左手的秘密（NpcLife.knows 的 secret）：他要知道卫衡在找他（风声以后），又和你相谈甚欢，才肯说
        { if: { flag: 'kp_chu_met', notFlag: 'kp_chu_zuo', ...CHU_WARM, shi: { id: XUN, at: AFTER_FENG } },
          text: '褚七蹲在盐垛背风的一边，拿牙咬着草绳，把一包盐的口扎紧了，才道：「当年雇我押那趟镖的人，我没见过脸，可我记得他的手。」他伸出左手，在空中比了一比，「使刀的是左手。刀从下往上撩，收刀的时候，拇指先扣刀镡。这二十年，我在路上见了多少使刀的人，先看的都是手。」他把手缩回袖里，「卫家那位正满城找我，这话我只对你说。」',
          do: [{ type: 'flag', flag: 'kp_chu_zuo' }, { type: 'feed', tag: '江湖', text: '褚七说，二十年前雇他押镖的那个人，使刀用的是左手。' }] },
        // 卫衡寻褚七（第四稿）：这件事走到哪一步，他就说哪一步的话
        { if: { flag: 'kp_wei_told', notFlag: 'kp_chu_gripe' },
          text: '褚七的手停在盐包上，没有回头：「有人把我的下落，递给了姓卫的。」隔了一会儿，又道：「我不问是谁。」',
          do: [{ type: 'flag', flag: 'kp_chu_gripe' }] },
        { if: at('tiaoting'),
          text: '褚七仍旧夜里扛包，只是肩头直了些：「话说出了口，倒睡得着了。」他看了看江面，「那位卫家后生追人去了，我在这儿等着。」' },
        { if: { flag: 'kp_chu_meet', ...at('feng', 'cuo', 'duimian') },
          text: '褚七点了点头：「你说的，我想过了。那夜渡口，我不躲。」他看了看江面，「该来的，总要来。」' },
        { if: { ...TONIGHT },
          text: '褚七站在缆桩边，没有扛包，左手按着缆桩，指节发白：「今夜，该来的要来了。」' },
        { if: at('feng', 'cuo'),
          text: '褚七压低了嗓子：「听人说，城里有个带剑的后生，逢人便问独臂的汉子。」他把左手在腰带上擦了擦，「夜里我只扛最靠里的那一垛。」' },
        { if: { flag: 'kp_wen' },
          text: '褚七头也不抬：「船上的话，我都说完了。」他拿脚尖把地上撒落的盐粒拨到一处，「卫家那位若问起我，小哥只当没见过。」' },
        { if: { flag: 'kp_du' },
          text: '褚七把盐包往肩上一扛，脚下仍是斜的：「白日我睡在船篷底下，夜里出来扛包，一包三文，够活。卫家那位若找来，我不躲了。只是求他，先让我把这口气喘匀。」' },
        { if: { flag: 'kp_bu' },
          text: '褚七用牙咬开一截草绳：「卫家那位和我，各在城里一头，谁也不知道谁在哪。小哥若碰见他，不必替我说话。」' },
        { text: '褚七把盐包往垛上一撂，没有说话。' }
      ],
      观察: [
        { if: { flag: 'kp_wen' },
          text: '汗湿了衣领，露出锁骨底下一道斜斜的疤，一直划到肋下。宽背厚刃，是单刀砍的，砍了不下二十年。' },
        { text: '他扛包只用左肩。盐包压下去，他的腰先弯，膝盖不弯：是练过桩的人。右边的袖管随着步子晃，空荡荡的。' }
      ]
    },
    life: {
      trade: '脚夫', talk: 0.3,
      has: { silver: 6 },
      voice: {
        lead: ['往江面上望了一眼', '拿脚尖拨了拨地上的盐粒', '把那一只手在腰带上蹭了蹭'],
        idle: [
          { if: { flag: 'kp_wen' }, text: '船上的事，我都说过了。你想知道的，卫家那位都问过一遍。' },
          { if: { flag: 'kp_du' }, text: '白日不敢出门，夜里扛包。一包三文，扛到天亮，够吃两顿。江边的风硬，倒比船篷底下睡得踏实。' },
          { text: '这码头夜里歇得晚，盐包一垛一垛的，扛完一垛，天就亮了。' }
        ]
      },
      want: [
        { k: 'chu_hide', text: '躲开卫家的人，先把这口气喘匀', if: { flag: 'kp_du' } },
        { k: 'chu_pay', text: '把欠下的命还给撑船的后生', if: { flag: 'kp_bu' } },
        { k: 'chu_rest', text: '白日里能睡一个整觉，夜里有包可扛' }
      ],
      fear: '卫家的人，还有那只使刀的左手。',
      refuse: [
        { verb: '打听', if: { flag: 'kp_wen' }, why: '船上当着卫衡的面认了旧账，他不愿再提；礼数还在，话已说尽' }
      ],
      knows: [
        { k: 'chu_zuo', text: '二十年前雇他押镖的人，使刀用的是左手', secret: true },
        { k: 'chu_guide', text: '那一夜带路的人，就是他自己', if: { flag: 'kp_du' }, secret: true }
      ]
    }
  },

  {
    id: 'kp_wei', name: '卫衡', ini: '卫', tone: 'blue', brief: '腰悬长剑', hint: '三十来岁',
    // 白天出门访人，夜里回广陵客栈
    at: [
      { room: 'hu', if: { ...NEW, hour: { from: 9, to: 17 } } },
      // 对面那一夜（世事 kp_xun 的第三步）：夜里他在运河渡口，不在店里
      { room: 'dukou', if: { ...NEW, ...TONIGHT, hour: NIGHT } },
      { room: 'jc_yz_kezhan', if: { ...NEW, any: [{ hour: { from: 17, to: 21 } }, { hour: { from: 5, to: 9 } }, { hour: NIGHT, any: [{ shi: { id: XUN, not: ['duimian'] } }, { shi: { id: XUN, at: ['duimian'], left: { atLeast: 3 } } }] }] } }
    ],
    look: '三十来岁，腰悬长剑，站着的时候右肩微微下沉，剑穗的结打得很紧。鞋帮上的泥已经干了，裂出一道一道的纹，是走了很远的路。',
    gift: '卫衡双手接了，道一声谢，却没有往怀里放，仍旧托在手上，像是怕欠下什么。',
    likes: ['huadiao'],
    verbs: ['交谈', '观察', '赠礼',
      // 卫衡寻褚七：他问你知不知道那人在哪里（xun_wei：知道的告诉、指错，没见过的说没见过）；对面那一夜在场，伸手管不管（xun_dui）
      { verb: '递话', if: { ...at('fang', 'feng'), flag: 'kp_wei_met', notFlag: 'kp_wei_ans' } },
      { verb: '插手', if: { ...TONIGHT, hour: NIGHT, notFlag: 'kp_chu_warned' } }],
    actions: {
      递话: [{ text: '卫衡抬起头来，等你开口。', do: [{ type: 'story', id: 'xun_wei' }] }],
      插手: [{ text: '卫衡的手按在剑柄上，眼睛盯着那个扛包的人。', do: [{ type: 'story', id: 'xun_dui' }] }],
      交谈: [
        // 腰牌：不渡的那条路上才有这块牌子；头一回见面先认人，再拿牌子给他看
        { if: { item: { id: 'kp_yaopai' }, flag: 'kp_wei_met', notFlag: 'kp_wei_pai' },
          text: '你把那块腰牌摊在掌心。卫衡只看了一眼，没有伸手去接：「黑风寨的牌子。」他的目光落在牌子背面，「水路，丙。」他停了停，「寨里管水路的头目，不止一个。」',
          do: [{ type: 'flag', flag: 'kp_wei_pai' }, { type: 'feed', tag: '江湖', text: '卫衡认得那块腰牌，是黑风寨水路上的牌子。' }] },
        // 头一回，三条路各不相同
        { if: { flag: 'kp_du', notFlag: 'kp_wei_met' },
          text: '卫衡正拿袖口擦着剑鞘，听见脚步，抬头见是你，手停了停。他抱拳，礼数一分不缺：「江前辈在时，晚辈不敢拦。如今前辈不在眼前，晚辈只问一句：那人在哪里？」他等了片刻，见你没有开口，又道：「你不说，晚辈不勉强。扬州不大，晚辈自己找。」',
          do: [{ type: 'flag', flag: 'kp_wei_met' }] },
        { if: { flag: 'kp_wen', notFlag: 'kp_wei_met' },
          text: '卫衡见了你，先拱了拱手：「那夜多亏你把两边拉住。」他的手一直按在剑柄上，没有挪开，「家父在家里问了晚辈三回，江前辈可有消息，晚辈答不上。」他看了看你头上的斗笠，「你若知道什么，不必告诉晚辈。只求前辈回来的时候，替晚辈道一句：卫家欠的，卫家记着。」',
          do: [{ type: 'flag', flag: 'kp_wei_met' }] },
        { if: { flag: 'kp_bu', notFlag: 'kp_wei_met' },
          text: '卫衡看了你一眼，认了出来。他先道：「那夜船上的少年，没渡人的那个。」口气里没有责备，也没有赞许，又道：「家父说过，有的人不渡，是想得明白；有的人不渡，是怕。你是哪一种，晚辈不问。」他侧身让开半步，「扬州大，各走各的路。」',
          do: [{ type: 'flag', flag: 'kp_wei_met' }] },
        // 指错了路的：到原定那日他才发觉，那时才记恨（世事走到 cuo）
        { if: { flag: 'kp_wei_lied', notFlag: 'kp_wei_lied_known', shi: { id: XUN, not: ['fang', 'feng'] } },
          text: '卫衡没有寒暄：「龙王庙后头，晚辈去了，庙里只有一窝野猫。」他看了你一眼，「你指的路，晚辈记着。」',
          do: [{ type: 'flag', flag: 'kp_wei_lied_known' }, ...relDown('kp_wei', '你给他指了错路，他后来才知道')] },
        // 对面那一夜以后，按过了多少个钟头说话：刚了结的、过了几日的、隔了很久的，各说各的
        { if: atAge(['pao'], { below: 12 }),
          text: '卫衡刚从渡口回来，茶也没有要，只站着：「晚辈到时，铺盖还温着，人已经没了。」他停了停，「扬州码头多，晚辈慢慢找。」' },
        { if: atAge(['pao'], { atLeast: 12, below: 96 }),
          text: '卫衡坐在店堂里，面前那碗茶早已凉透：「那一夜晚辈到时，铺盖还是温的。」他把茶碗转了半圈，「这几日，渡口上下晚辈都问遍了。」' },
        { if: atAge(['pao'], { atLeast: 96, below: 240 }),
          text: '卫衡的话比先前少了：「渡口那条线断了，晚辈只好从头访起。」他看了看窗外，「总有一处问得到。」' },
        { if: atAge(['pao_see'], { below: 24 }),
          text: '卫衡看了你一眼：「方才你在渡口，没有拦晚辈，也没有帮晚辈。」他把话说得很平，「铺盖还温着，人没了。」' },
        { if: atAge(['pao_see'], { atLeast: 24, below: 240 }),
          text: '卫衡朝你点了点头：「那一夜你在渡口，只是看着。晚辈不怪你。」他望向窗外，「人没了，线还没断，晚辈慢慢找。」' },
        { if: atAge(['si'], { below: 12 }),
          text: '卫衡像是很久没有合眼，眼窝陷了下去：「晚辈赶到时，人已经躺在石阶下了。脚夫们都说没看见。」他望着自己的手，「那一句话，往后问谁去。」' },
        { if: atAge(['si'], { atLeast: 12, below: 240 }),
          text: '卫衡不大说话了，隔了半晌才道：「石阶下那个人，晚辈替他在庙里点了一盏灯。」隔了一会儿，又道：「该问的话，埋了。」' },
        { if: atAge(['si_see'], { below: 24 }),
          text: '卫衡的脸色发白，不敢看你：「你也看见了。」他的喉头动了动，「晚辈到时，人已经倒在石阶下了。」' },
        { if: atAge(['si_see'], { atLeast: 24, below: 240 }),
          text: '卫衡看了你一眼：「那一夜你在场，晚辈在场，谁也没有拦住。」他把目光移开，「这话，晚辈不会对旁人说。」' },
        // 提醒了褚七：对面那夜他才扑空，这时才发觉有人递了话，才降关系；告诉过他下落的，他说的是另一句
        { if: { ...at('zou'), notFlag: 'kp_zou_known', flag: 'kp_wei_told' },
          text: '卫衡抬眼看你：「渡口的事，晚辈只对你一个人说过。」他把茶碗放下，「人偏偏走了。」',
          do: [{ type: 'flag', flag: 'kp_zou_known' }, ...relDown('kp_wei', '褚七连夜走了，卫衡知道是你递的话')] },
        { if: { ...at('zou'), notFlag: 'kp_zou_known' },
          text: '卫衡抬眼看你，目光很平：「晚辈赶到渡口，铺盖卷得整整齐齐，人是自己走的。」他停了停，「有人递了话。晚辈不问是谁。」',
          do: [{ type: 'flag', flag: 'kp_zou_known' }, ...relDown('kp_wei', '褚七连夜走了，卫衡知道是你递的话')] },
        { if: atAge(['zou'], { below: 240 }),
          text: '卫衡朝你拱了拱手，话说得很淡：「递话的人，晚辈记着。」他没有再说下去。' },
        { if: { ...at('zou_see'), notFlag: 'kp_zou_known' },
          text: '卫衡看了你一眼：「那夜你在渡口，晚辈看见了。人走得这样巧，晚辈不信是巧。」',
          do: [{ type: 'flag', flag: 'kp_zou_known' }, ...relDown('kp_wei', '褚七连夜走了，卫衡知道是你递的话')] },
        { if: atAge(['zou_see'], { below: 240 }),
          text: '卫衡看你的眼神冷了些：「那夜渡口的事，晚辈记着。」他把话咽了半截，「下回，别拦晚辈的路。」' },
        { if: atAge(['dangmian'], { below: 240 }),
          text: '卫衡回来了，风尘仆仆：「那夜渡口，他没有躲，当面认了。」他把剑往肩上一正，「家父那里，晚辈带他去见过了。」' },
        { if: atAge(['dangmian_see'], { below: 240 }),
          text: '卫衡回来了，风尘仆仆，朝你抱了抱拳：「那夜渡口，你在一旁，都听见了。」他沉吟了一下，「家父那里，晚辈带他去见过了。这一程，你也有份。」' },
        { if: { ...atAge(['tiaoting'], { below: 240 }), flag: 'kp_dui_beat' },
          text: '卫衡回来了，袖口沾着草屑：「左手的线，晚辈还在追。」他看着你，「那一夜你胜了晚辈，却肯请两个人坐下说话，晚辈服气。」' },
        { if: atAge(['tiaoting'], { below: 240 }),
          text: '卫衡回来了，袖口沾着草屑：「左手的线，晚辈还在追。」他停了停，「渡口那一夜，你肯坐下来听，晚辈记着。」' },
        { if: atAge(['bangwei'], { below: 24 }),
          text: '卫衡朝你抱了抱拳，没有多说：「这份情，晚辈欠着。」他的目光往渡口的方向去了，又收回来，「只是那一句话，终究没问出来。」' },
        { if: atAge(['bangwei'], { atLeast: 24, below: 240 }),
          text: '卫衡提起渡口那一夜，声音低了下去：「这份情，晚辈记着，只是睡不踏实。」他摇了摇头，「人是问不出话来了。」' },
        { if: atAge(['hubai'], { below: 24 }),
          text: '卫衡看了你一眼：「那夜你拦在晚辈前头，三招，晚辈记得。」他摇摇头，「人还是跑了。你护他，晚辈不怪你；下回别拦在晚辈前头。」' },
        { if: atAge(['hubai'], { atLeast: 24, below: 240 }),
          text: '卫衡见了你，神色淡淡的：「渡口那一夜，晚辈没有同你计较。」他把话顿住，「各人护各人的人罢。」' },
        { if: atAge(['duye'], { below: 24 }),
          text: '卫衡的衣摆还湿着半截：「那夜渡口有条船离了岸，晚辈追到石阶边，只看得见船尾。」他抬起眼，「撑船的那个后生，晚辈认得。」' },
        { if: atAge(['duye'], { atLeast: 24, below: 240 }),
          text: '卫衡提起那夜的船，话里带了刺：「渡口长大的人，水上的本事不小。」他停了停，「晚辈在水上追不上你。」' },
        { if: { shi: { id: XUN, at: ENDS, age: { atLeast: 240 } } },
          text: '卫衡朝你点了点头：「那件事，晚辈已不愿再提。」他看着街那头，「眼下只管走一步，看一步。」' },
        // 卫衡寻褚七（第四稿）：事情走到哪一步，他说哪一步的话。告诉过他的，对面提前到次夜，他说一回，再问只答一句
        // 对面那一步离当夜结算不到三个钟头（TONIGHT）才说「今夜」；下午就告诉了他、离结算还有一日多，仍说「挑个夜里」
        { if: { flag: 'kp_wei_told', notFlag: 'kp_wei_told_said', ...MORE_THAN_NIGHT },
          text: '卫衡朝你拱了拱手：「运河渡口，夜里扛包。晚辈记下了。」他把剑往肩上一正，「晚辈挑个夜里去看一看，不惊动旁人。」',
          do: [{ type: 'flag', flag: 'kp_wei_told_said' }] },
        { if: { flag: 'kp_wei_told', ...MORE_THAN_NIGHT },
          text: '卫衡点了点头：「晚辈已经问明白了，你不必再费心。」' },
        { if: { flag: 'kp_wei_lied', ...at('fang', 'feng') },
          text: '卫衡朝你点了点头：「龙王庙后头。晚辈这就去访。」' },
        { if: at('feng'),
          text: '卫衡把一张折了又折的字条收进袖里：「有人说，运河渡口夜里扛包的人里，有个独臂的。晚辈过一两日，总要去看一看。」' },
        { if: { ...TONIGHT },
          text: '卫衡的手按在剑柄上，又望了一眼窗外渐暗的天色，道：「晚辈等了二十年，今夜这一关总要过。」' },
        // 以后每回：他还在找人
        { if: { flag: 'kp_du' },
          text: '卫衡的目光越过你，望向码头那头的船桅：「晚辈在找一个独臂的人。扬州码头多，夜里扛包的人更多，一时还找不着。」他收回目光，「你若看见他，还请告诉晚辈一声。」' },
        { if: { flag: 'kp_wen' },
          text: '卫衡在桌边坐着，手里转着茶盏：「晚辈这几日在城里访人，没有消息。那人和江前辈，一个也没找着。」他抬眼看你，「你比晚辈沉得住气。」' },
        { if: { flag: 'kp_bu' },
          text: '卫衡朝你点了点头，便不再多说。他袖口磨得起了毛，鞋底新补过，大约是这几日走的路太多。' },
        { text: '卫衡抱了抱拳，没有说话。' }
      ],
      观察: [
        { text: '他站着不动，肩膀却是松的，一只手随时能搭上剑柄。剑鞘的漆磨掉了几处，露出底下的旧木色，是常年挂在腰间磨出来的。' }
      ]
    },
    life: {
      trade: '游侠', talk: 0.4,
      has: { silver: 30 },
      voice: {
        lead: ['把手搭在剑柄上', '抬眼往街那头看了看', '低头看了看自己的靴尖'],
        idle: [
          { if: { flag: 'kp_du' }, text: '白日里在城里访人，夜里回店。扬州的码头多，一处一处问过去，总有一处问得到。' },
          { if: { flag: 'kp_wen' }, text: '家父的话，晚辈记着。有债必偿，偿给谁，还得先找到人。' },
          { text: '晚辈在城里访人，访的是二十年前的事。访到哪一步，不敢说。' }
        ]
      },
      want: [
        { k: 'wei_chu', text: '找到那个独臂镖师，问出二十年前领路的人是谁', if: { any: [{ flag: 'kp_du' }, { flag: 'kp_jiu' }, { flag: 'kp_wen' }] } },
        { k: 'wei_jiang', text: '找到江前辈，替家父问一声安' }
      ],
      fear: '家父那只拿不得剑的右手，和一件二十年没有人答得上的事。',
      refuse: [
        { verb: '打听', if: { flag: 'kp_du', rel: { npc: 'kp_wei', is: ['心存芥蒂'] } }, why: '那夜你渡了他要找的人，他礼数不缺，话却不肯多说' }
      ],
      knows: [
        { k: 'wei_back', text: '二十年前那一夜，他父亲是江伯背出来的', secret: true },
        { k: 'wei_chu_hands', text: '那镖师的右臂，二十年前就断了', if: { flag: 'kp_wen' } }
      ]
    }
  },

  {
    id: 'kp_bian', name: '卞婆婆', ini: '卞', tone: 'amber', brief: '挑着豆腐担',
    // 回瓜洲才碰得到，上午挑着担子到江伯的小屋门口，放一块豆腐
    at: { room: 'gz_home', if: { ...NEW, hour: { from: 7, to: 12 } } },
    look: '拄着拐，担子上盖着一块湿布，布底下是一板一板的白豆腐。腿不好，站久了要把重心换到另一只脚上。',
    verbs: ['交谈', '观察'],
    actions: {
      交谈: [
        // 不渡又没救上来：下游捞起过一个人，没说死活
        { if: { flag: 'kp_bu', notFlag: 'kp_jiu' },
          text: '卞婆婆揭开湿布，露出一板豆腐：「渡口那条船，烧剩一副骨架，前日叫潮水推走了半截。」她把豆腐刀在布上蹭了蹭，「下游的芦苇荡里，前几日有人捞起过一个人。是死是活，捞的人没说，老婆子也没问。」她看了你一眼，「老婆子只管豆腐。」' },
        { text: '卞婆婆揭开湿布，露出一板豆腐：「渡口那条船，烧剩一副骨架，前日叫潮水推走了半截，木板有人拆了去烧火。」她叹了口气，「老婆子欠老江三个月船钱，人不在，账还在。每日留一块豆腐，搁在他那间屋的门槛上，第二日去看，总是没了，不知是野猫，还是旁的什么。」' }
      ],
      观察: [{ text: '她的拐杖头上缠着一圈旧布条，磨得发亮。担子一头是豆腐，一头是水桶，扁担压在左肩，右肩是歪的。' }]
    },
    life: {
      trade: '豆腐摊', talk: 0.6,
      voice: {
        lead: ['把湿布掀开一角', '拿豆腐刀在布上蹭了蹭', '换了只脚站着'],
        idle: [
          { if: { flag: 'kp_bu', notFlag: 'kp_jiu' }, text: '下游芦苇荡里，隔几日就漂来些东西。老婆子不敢看，只听人说。' },
          { if: { hour: { from: 7, to: 12 } }, text: '每日这个时辰，老婆子挑着担子往渡口小屋走，把一块豆腐搁在门槛上，再慢慢走回来。' },
          { text: '一板豆腐，老婆子磨了三十年，推石磨的那道凹槽，叫我的手磨得发亮。' }
        ]
      },
      knows: [
        { k: 'bian_ship', text: '二十年前深秋，有一条没点灯的船夜里靠岸，下来三个人，走在头里的是个使左手的后生', if: { flag: 'kp_wen' } },
        { k: 'bian_pier', text: '渡口那条烧剩的船，是被潮水推走的' }
      ]
    }
  }
];

/* ---------- 世事：卫衡寻褚七 ---------- */

/** 渡口「寻人」那一行痕迹：一个种类只留最新的一条，了结的几步各用自己的话换掉它 */
const dukouMark = (text: string, days = 30): Effect => ({ type: 'w', op: 'mark', place: 'dukou', k: '寻人', days, text });
/** 渡口那一行痕迹擦掉（没有留下什么可看的结局） */
const DUKOU_CLEAR: Effect = dukouMark('', 0);
const DEAD_MARK = '石阶下有一块洗不净的深色，脚夫们走到那一处，都绕开半步。';
const GONE_CHU: Effect = { type: 'w', op: 'gone', npc: 'kp_chu' };
/** 当面了结以后：两人一前一后出了城，卫衡十日不在店里 */
const DANG_DO = (note: string): Effect[] => [
  GONE_CHU,
  { type: 'w', op: 'gone', npc: 'kp_wei', days: 10, mark: { place: 'jc_yz_kezhan', text: '柜上的伙计说，那位悬剑的客官结了账，同一个独臂人出了城，说是回家去见家父。' } },
  DUKOU_CLEAR,
  ...relUp('kp_wei', note)
];

/**
 * 三步（进扬州当日起头，新档且褚七在扬州）：访人 → 三日后风声 → 再两日对面（夜里，运河渡口）。
 * 对面这一步是预告以后的窗口：玩家下线补日子也不会替他了结（ShiStep.window），回来先有九个多钟头来得及赶到渡口。
 * 对面在当夜二十三时结算（next.clock）：
 *  - 玩家就在渡口，走 *_see（你看见……没有出手）；不在，走原来的那一步；
 *  - 玩家事先安排过的，改走安排的那一步（next.route）：提醒了褚七（kp_chu_warned）走 zou，劝他当面了结（kp_chu_meet）走 dangmian；
 *  - 都没有：多数褚七连夜跑了（pao），少数死在渡口（si，世界种子抽，p = 0.25）。
 * 插手只改安排，不当场收：
 *  - 对卫衡递话（xun_wei）：告诉他下落，对面提前到次夜；指错路，从原定那日再晚两日（风声那一步改走 cuo）；
 *  - 对褚七劝告（xun_chu）：提醒他（他躲开了），或劝他当面了结（要相谈甚欢，约在对面那夜）；
 *  - 对面那一夜在场（xun_dui）：请两人坐下说话（tiaoting）、帮卫衡（bangwei）、拦在褚七前头（hubai，拦不住；胜了转 tiaoting）、
 *    撑船夜渡（duye，要渔家的本领）、低声叫他快走（zou_see）、在一旁听着（dangmian_see，劝过当面的才有）。
 * 每个结局都留去处（褚七走了、死了，卫衡出门追人）、关系、人情备注、传闻、地方的痕迹。
 */
const SHI: ShiDef[] = [
  {
    id: XUN, name: '卫衡寻褚七', region: 'yz', start: CHU_HERE, first: 'fang',
    place: 'dukou', subj: ['kp_wei', 'kp_chu'],
    steps: {
      fang: {
        now: '卫衡白日里在城里逢人打听，一路问到了运河渡口一带，找的是一个独臂的汉子。',
        news: '一个外乡后生在扬州城里逢人打听独臂汉子。',
        news2: '城里来了个带剑的外乡人，到处问独臂的汉子。',
        news3: '有个剑客满扬州找一个断了手的人，不知结了什么仇。',
        juice: 0.4, subj: ['kp_wei'],
        self: { kp_wei: '晚辈在找一个独臂的人。二十年前的事，只有他答得上。' },
        next: { days: 3, to: 'feng' }
      },
      feng: {
        now: '街面上有了风声：运河渡口夜里扛包的脚夫里，有一个独臂的。',
        news: '听说运河渡口夜里扛包的脚夫里，有个独臂的。',
        news2: '都说渡口夜里扛包的人里，有个断了手的，不知是不是人家要找的。',
        news3: '渡口出了个断臂的怪人，夜夜扛包不说话，怕是犯过事。',
        juice: 0.55, subj: ['kp_wei', 'kp_chu'],
        self: {
          kp_wei: '有人说，运河渡口夜里扛包的人里，有个独臂的。过一两日，晚辈总要去看一看。',
          kp_chu: '听说城里有个后生在找我。我夜里扛包，白日里不敢露面。'
        },
        // 指了错路的：原定对面那一日，卫衡先扑个空，再晚两日
        next: { days: 2, to: 'duimian', route: [{ if: { flag: 'kp_wei_lied' }, to: 'cuo' }] }
      },
      cuo: {
        now: '卫衡叫人指错了地方，在龙王庙后头扑了个空，又从头访起。',
        news: '那个带剑的外乡人在龙王庙后头扑了个空，满街问是谁指的路。',
        juice: 0.5, subj: ['kp_wei'],
        next: { days: 2, to: 'duimian' }
      },
      duimian: {
        now: '卫衡打听到了，今夜要去运河渡口，找那个夜里扛包的独臂脚夫。',
        news: '听说那个带剑的外乡人，今夜要去运河渡口找人。',
        news2: '渡口今夜怕要出事，有个带剑的外乡人说要找人。',
        news3: '听说今夜渡口要动刀子，脚夫们都不敢上工。',
        juice: 0.75, subj: ['kp_wei', 'kp_chu'], where: 'dukou', window: true,
        self: { kp_wei: '晚辈今夜去运河渡口。找着了人，只问他一句话。' },
        // 来了人，脚夫们都停了手：只在对面那一夜的前半夜看得见，白天、后半夜渡口照旧
        do: [{ type: 'w', op: 'mark', place: 'dukou', k: '寻人', days: 2, hour: { from: 21, to: 23 }, left: { id: XUN, below: 3 },
          text: '缆桩边站着个按剑的外乡人，脚夫们都收了工，远远地蹲着，没有人过去搬盐包。' }],
        // 当夜二十三时结算：玩家在渡口亲眼看着的走 *_see；事先安排过的走安排的；都没有，种子抽
        next: {
          days: 0.4, clock: 23, to: 'pao', alt: { to: 'si', p: 0.25 },
          route: [{ if: { flag: 'kp_chu_warned' }, to: 'zou' }, { if: { flag: 'kp_chu_meet' }, to: 'dangmian' }],
          here: { pao: 'pao_see', si: 'si_see', zou: 'zou_see', dangmian: 'dangmian_see' }
        }
      },
      // 不插手，多数：褚七连夜跑了。玩家不在渡口，卫衡去迟了一步
      pao: {
        now: '卫衡去迟了一步：那个独臂的脚夫当夜就不见了，铺盖还留在缆桩边。',
        news: '运河渡口那个独臂的脚夫一夜没了踪影，卫家后生扑了个空。',
        news2: '渡口那个断了手的脚夫跑了，听说有人追了他二十年。',
        news3: '渡口有个人逃了二十年的债，叫人堵在了码头上。',
        juice: 0.65, where: 'dukou',
        do: [GONE_CHU, dukouMark('缆桩边留着一卷旧铺盖，没有人来认领。')]
      },
      // 同上，玩家就在渡口，看着，没有出手
      pao_see: {
        now: '你在渡口看着卫衡赶到：缆桩边只剩一卷铺盖，独臂的脚夫早已不知去向。你没有出手。',
        news: '渡口那夜，卫家后生扑了个空，独臂的脚夫已经不见了。',
        juice: 0.65, where: 'dukou',
        do: [GONE_CHU, dukouMark('缆桩边留着一卷旧铺盖，没有人来认领。')]
      },
      // 不插手，少数：死在渡口
      si: {
        now: '渡口夜里出了人命，死的是那个独臂的脚夫，天亮才有人在石阶下发现。',
        news: '运河渡口夜里出了人命，死的是个独臂的脚夫。',
        news2: '渡口夜里死了个脚夫，没人说得清是谁下的手。',
        news3: '渡口出了命案，官府压着，脚夫们都不肯提。',
        juice: 0.85, where: 'dukou',
        do: [{ type: 'w', op: 'dead', npc: 'kp_chu' }, dukouMark(DEAD_MARK)]
      },
      si_see: {
        now: '你在渡口看着那个独臂的脚夫倒在石阶下，下手的人没有露面。你没有出手。',
        news: '渡口夜里死了个独臂的脚夫，有人亲眼看着，没敢作声。',
        juice: 0.85, where: 'dukou',
        do: [{ type: 'w', op: 'dead', npc: 'kp_chu' }, dukouMark(DEAD_MARK)]
      },
      // 安排过：先前对褚七提醒了，他躲开了。对面那夜卫衡才扑空，才知道有人递了话
      zou: {
        now: '你先前递了话，褚七已经走了。卫衡赶到渡口，缆桩边只剩一卷铺盖，卷得整整齐齐。',
        news: '运河渡口那个独臂的脚夫走了，听说有人递过话。',
        juice: 0.6, where: 'dukou',
        do: [GONE_CHU, dukouMark('缆桩边的铺盖卷得整整齐齐，主人走得不慌不忙。')]
      },
      // 同上，玩家就在渡口；渡口那夜低声叫他快走的，也走这一步
      zou_see: {
        now: '渡口那一夜，卫衡赶到时褚七已经走了，铺盖卷得整齐。你在场，卫衡看了你一眼。',
        news: '渡口那夜，卫家后生扑了个空，有人说是叫人提前递了话。',
        juice: 0.6, where: 'dukou',
        do: [GONE_CHU, dukouMark('缆桩边的铺盖卷得整整齐齐，主人走得不慌不忙。')]
      },
      // 安排过：劝褚七当面了结，约在对面那夜，渡口
      dangmian: {
        now: '你劝褚七当面了结。渡口那一夜，他没有躲，同卫衡在石阶上说了半夜的话，次日两人一前一后出了城。',
        news: '独臂的脚夫在渡口等着卫家后生，两人谈了半夜，一前一后出了城。',
        juice: 0.7, where: 'dukou',
        do: DANG_DO('褚七自己登门，是你劝的')
      },
      dangmian_see: {
        now: '你劝褚七当面了结。渡口那一夜，你在一旁听着，两人说了半夜的话，没有动刀。次日，两人一前一后出了城。',
        news: '渡口那夜独臂脚夫同卫家后生当面谈了半夜，有人在旁听着。',
        juice: 0.7, where: 'dukou',
        do: DANG_DO('渡口那夜，你在一旁听着，他和褚七把话说开了')
      },
      // 插手：渡口调停
      tiaoting: {
        now: '渡口那一夜，你请两人在石阶上坐下说话：褚七说了左手，卫衡说他父亲也说过同一句。没有动刀。卫衡次日动身追那个使左手刀的人，褚七仍在渡口扛包。',
        news: '渡口那夜有位少侠请两人坐下说话，没动刀，卫家后生追人去了。',
        juice: 0.6, where: 'dukou',
        do: [DUKOU_CLEAR, { type: 'w', op: 'gone', npc: 'kp_wei', days: 7, mark: { place: 'jc_yz_kezhan', text: '柜上的伙计说，那位悬剑的客官结了账，追一个使左手刀的人去了，七八日才回。' } }]
      },
      // 插手：帮卫衡
      bangwei: {
        now: '你帮着卫衡按住了褚七，他死在渡口。脚夫们看你的眼神都冷了。',
        news: '渡口夜里，卫家后生拿住了独臂脚夫，有人在旁相帮，脚夫没能活。',
        juice: 0.85, where: 'dukou',
        do: [
          { type: 'w', op: 'dead', npc: 'kp_chu' }, dukouMark(DEAD_MARK),
          { type: 'w', op: 'you', fac: 'dong', delta: -8 },
          { type: 'w', op: 'mark', place: 'dukou', k: '记仇', days: 30, text: '脚夫们见了你，各自低下头去搬盐包，背过身去。' }
        ]
      },
      // 插手：拦在褚七前头，没拦住
      hubai: {
        now: '你拦在褚七身前，没有拦住卫衡。趁着乱，褚七跑了，连夜不见。',
        news: '渡口夜里有人拦卫家后生，没拦住，独臂脚夫趁乱跑了。',
        juice: 0.65, where: 'dukou',
        do: [GONE_CHU, dukouMark('石阶上有几处新的划痕，是兵刃拖过的。')]
      },
      // 插手：撑船夜渡
      duye: {
        now: '你撑一条小船，夜里把褚七送过了江。卫衡赶到渡口，扑了个空。',
        news: '听说渡口那夜有人撑一条小船，把独臂脚夫送过了江。',
        juice: 0.6, where: 'dukou',
        do: [GONE_CHU, dukouMark('缆桩上少了一条小船。')]
      }
    }
  }
];

/* ---------- 剧情：玩家能做的事 ---------- */

/**
 * 渡口调停的最后一张：褚七比出左手，卫衡说他父亲也说过。回头看过雨里那一眼的，多一个选项（kp_hui）。
 * 成功给历练和侠义：把两个人从刀口上拉回来
 */
const TIAO_END: Effect[] = [
  { type: 'shi', id: XUN, to: 'tiaoting' },
  { type: 'flag', flag: 'kp_zuo_dui' }, { type: 'flag', flag: 'kp_chu_zuo' },
  { type: 'lilian', amount: 150 }, { type: 'xia', delta: 3 },
  { type: 'feed', tag: '江湖', text: '渡口那一夜，褚七当着卫衡比出那只使刀的左手：收刀时拇指先扣刀镡。卫衡说，他父亲也说过一模一样的话。' },
  ...relUp('kp_wei', '渡口那夜，你请他和褚七坐下说话'),
  ...relUp('kp_chu', '渡口那夜，你请他和卫衡坐下说话')
];
const tiaoCard = (): StoryDef['cards'][number] => ({ tag: '渡口夜话', title: '坐下说话',
  paras: [
    '你伸手在石阶上拍了拍：「坐。」',
    '卫衡看着你，慢慢松开了剑柄，在最低一级坐下。褚七蹲回盐垛背风的那边，半晌没有出声，才把那只手伸到灯下。',
    '他没有再把当年的话从头说一遍，只拿那只手在灯影里比了一个势：自下而上一撩，收刀，拇指先落在刀镡上。',
    '卫衡的脸色变了。他望着那只手，半晌才道：「家父也是这样说的。一个字不差。」',
    '两个人对着运河水坐到后半夜，谁也没有再提那一句。渡口没有见血。'
  ],
  choices: [
    { label: '收场', next: -1, do: TIAO_END },
    { label: '把雨夜回头看见的那个人影，也说给他们听', if: { flag: 'kp_hui' }, next: -1, do: TIAO_END,
      result: '你把芦苇丛里那个人影说了。卫衡和褚七对望了一眼，谁也没有开口。收刀时拇指先扣刀镡：这一句，三个人的口里都有了。' }
  ] });

/** 调停坐不下来的回话（四种缺法，各写各的缺：按钮副标写明缺什么） */
const NO_SIT = '卫衡看了你一眼，手仍按在剑柄上：「你同晚辈有多深的交情，要晚辈听你的？」褚七也没有动。你的话没有人接。';
const weiIs = (is: string[]): Cond => ({ rel: { npc: 'kp_wei', is } });
const chuIs = (is: string[]): Cond => ({ rel: { npc: 'kp_chu', is } });
const SIT = '「请二位坐下说话。」';

const STORIES: StoryDef[] = [
  // 对卫衡：他问那人在哪里。知道的有「告诉」「指错」，没见过的就说没见过
  { id: 'xun_wei', cards: [
    { tag: '卫衡寻人', title: '他要的下落',
      paras: [
        '卫衡在你对面坐下，没有催你。他的鞋帮上沾着干了的泥，一天走的路，比常人三天还多。',
        '他开口问道：「你若知道那人在哪里，晚辈只问一句话，问完便走。」'
      ],
      choices: [
        { label: '告诉他：运河渡口，夜里扛包的那个', if: { flag: 'kp_chu_met' }, sub: '他会记你一份情　褚七那边要记一笔怨　卫衡次夜便去渡口', next: -1,
          do: [{ type: 'flag', flag: 'kp_wei_ans' }, { type: 'flag', flag: 'kp_wei_told' },
            ...relUp('kp_wei', '你告诉他褚七在运河渡口夜里扛包'), ...relDown('kp_chu', '你把他的下落告诉了卫衡'),
            { type: 'shi', id: XUN, to: 'duimian' }],
          result: '卫衡站起身，朝你深深一揖：「晚辈记下了。」他走出几步，又停住：「那人若真是晚辈要找的人，往后晚辈欠你一份情。」' },
        { label: '指给他一个错处：龙王庙后头', if: { flag: 'kp_chu_met' }, sub: '到原定那日他才发觉　再晚两日才到　知道了要记恨', next: -1,
          do: [{ type: 'flag', flag: 'kp_wei_ans' }, { type: 'flag', flag: 'kp_wei_lied' }],
          result: '卫衡看了你一眼，点点头：「龙王庙后头。多谢。」他提了剑，往东去了。' },
        { label: '「没见过什么独臂的人。」', if: { notFlag: 'kp_chu_met' }, next: -1,
          result: '卫衡点点头，没有强求：「晚辈再问问别处。」' },
        { label: '什么也不说', next: -1 }
      ] }
  ] },

  // 对褚七：提醒他，或劝他当面了结。只改安排，到对面那夜才见分晓；两头递话的，他看得出来
  { id: 'xun_chu', cards: [
    { tag: '褚七', title: '夜里的盐垛',
      paras: [
        '褚七把盐包撂在垛上，抬头看你。江上的风吹得他那只空袖子一荡一荡的。',
        '你想说的话，不止一句。'
      ],
      choices: [
        { label: '「卫家的人在找你，夜里小心。」', if: { notFlag: 'kp_wei_told' }, sub: '他会躲开　欠你的更多　卫衡到了对面那夜才知道', next: -1,
          do: [{ type: 'flag', flag: 'kp_chu_warned' }, GONE_CHU, ...relUp('kp_chu', '你夜里递了话，他躲开了，欠你的又多一笔')],
          result: '褚七听完，没有答话，只点了点头，把剩下的几包盐扛完。「这一垛，明晚怕是要换人扛了。」他朝你抱了抱拳，一句多的也没有。' },
        { label: '「卫家的人在找你，夜里小心。」', if: { flag: 'kp_wei_told' }, sub: '他看得出你两头递话　不会领情', next: -1,
          do: [{ type: 'flag', flag: 'kp_chu_warned' }, GONE_CHU, ...relDown('kp_chu', '你一头把他的下落递给卫衡，一头又来提醒他')],
          result: '褚七听完，抬眼看了你很久：「姓卫的知道得这样快，原来是你。」他把盐包撂下，转身往垛后头去了，没有回头。' },
        { label: '「躲不了一世，不如当面了结。」', if: { ...CHU_WARM, notFlag: 'kp_wei_told' }, sub: '约在对面那夜，渡口　你在场就当面谈', next: -1,
          do: [{ type: 'flag', flag: 'kp_chu_meet' }, ...relUp('kp_chu', '你劝他当面了结，他应了')],
          result: '褚七沉默了很久，久到盐垛上的油布被风掀起又落下。「你说得对。」他看了看江面，「那夜渡口，我不躲。」' },
        { label: '「躲不了一世，不如当面了结。」', if: { ...CHU_WARM, flag: 'kp_wei_told' }, sub: '他看得出你两头递话　不会领情', next: -1,
          do: [{ type: 'flag', flag: 'kp_chu_meet' }, ...relDown('kp_chu', '你一头把他的下落递给卫衡，一头又劝他当面了结')],
          result: '褚七看了你一眼，慢慢说：「姓卫的知道得这样快，原来是你。」他的嘴角动了动，「当面就当面，我不躲了。你的话，往后我得掂量。」' },
        { label: '「躲不了一世，不如当面了结。」', if: { rel: { npc: 'kp_chu', not: WARM } }, next: 0,
          result: '褚七摇了摇头：「小哥，话好说，我怕。」他的左手抖了一下，「你我还没到那个份上。」' },
        { label: '「没什么，随口一问。」', next: -1 }
      ] }
  ] },

  // 对面那一夜在场（二十一点到结算前）
  { id: 'xun_dui', cards: [
    { tag: '渡口夜话', title: '石阶上的两个人',
      paras: [
        '夜里的渡口只剩几点灯火。卫衡站在石阶上，剑还在鞘里。褚七把盐包放在脚边，用那一只手攥着腰带，攥得很紧。',
        '「二十年前，领路的人是谁。」卫衡问，声音不高，「你说了，晚辈转身就走。」',
        '褚七没有答话。运河水一下一下拍着石阶。你站在两人中间，江上有风。'
      ],
      choices: [
        { label: '「你们说，我在一旁听着。」', if: { flag: 'kp_chu_meet' }, next: -1,
          do: [{ type: 'shi', id: XUN, to: 'dangmian_see' }],
          result: '你退到最低一级石阶，坐下听着。褚七没有躲，卫衡也没有拔剑。两人隔着盐垛说了半夜，运河水一下一下拍着石阶。' },
        // 调停：两人都在相谈甚欢以上；或一人相谈甚欢、一人点头之交，且回头看见过雨里那个人影；或先打赢卫衡（下面「拦在褚七身前」）
        { label: SIT, sub: '两人都肯听你，才坐得下来', do: [{ type: 'story', id: 'xun_tiao' }],
          if: { ...weiIs(WARM), any: [chuIs(WARM)] } },
        { label: SIT, sub: '一人信你，一人认得你，再有雨里那个人影，说得动他们', do: [{ type: 'story', id: 'xun_tiao' }],
          if: { ...weiIs(WARM), flag: 'kp_hui', any: [chuIs(PLAIN)] } },
        { label: SIT, sub: '一人信你，一人认得你，再有雨里那个人影，说得动他们', do: [{ type: 'story', id: 'xun_tiao' }],
          if: { ...weiIs(PLAIN), flag: 'kp_hui', any: [chuIs(WARM)] } },
        { label: SIT, sub: '卫衡还不肯听你的', next: 0, result: NO_SIT,
          if: { rel: { npc: 'kp_wei', not: GOOD } } },
        { label: SIT, sub: '褚七还不肯信你', next: 0, result: NO_SIT,
          if: { ...weiIs(GOOD), any: [{ rel: { npc: 'kp_chu', not: GOOD } }] } },
        { label: SIT, sub: '两人对你都只是点头之交，不够　或先胜过卫衡', next: 0, result: NO_SIT,
          if: { ...weiIs(PLAIN), any: [chuIs(PLAIN)] } },
        { label: SIT, sub: '差一样：雨夜里回头看见的那个人影　或先胜过卫衡', next: 0, result: NO_SIT,
          if: { ...weiIs(WARM), notFlag: 'kp_hui', any: [chuIs(PLAIN)] } },
        { label: SIT, sub: '差一样：雨夜里回头看见的那个人影　或先胜过卫衡', next: 0, result: NO_SIT,
          if: { ...weiIs(PLAIN), notFlag: 'kp_hui', any: [chuIs(WARM)] } },
        { label: '伸手按住褚七的肩', sub: '褚七活不成　渡口的脚夫记你的仇　有损侠名', next: -1,
          do: [{ type: 'xia', delta: -4 }, { type: 'shi', id: XUN, to: 'bangwei' }, ...relUp('kp_wei', '渡口那夜，你替他按住了褚七'), { type: 'time', add: 60 }],
          result: '你伸手按住了褚七的肩。他没有挣，只回过头来看了你一眼。卫衡的剑出鞘时，一点声响也没有。\n天亮后，缆桩边只剩一卷铺盖。' },
        { label: '抢上一步，拦在褚七身前', sub: '卫衡比你强　输了要受伤', do: [{ type: 'fight', foe: 'xun_weiheng' }] },
        // 撑船夜渡：渔家的本领。卫衡认得你的，记一笔怨
        { label: '解下缆绳，把船撑到石阶下', sub: '渔家的本领　卫衡认得你，要记一笔怨', if: { ...BOATMAN, flag: 'kp_wei_met' }, next: -1,
          do: [{ type: 'shi', id: XUN, to: 'duye' }, ...relUp('kp_chu', '你夜里撑船，把他送过了江'),
            ...relDown('kp_wei', '渡口那夜，你撑船把褚七送走，他认得是你'), { type: 'time', add: 120 }],
          result: '你解了缆绳，撑一条小船横到石阶下，朝褚七低喝了一声。他看了你一眼，把铺盖一卷，跳上船来。卫衡追到石阶边，水已隔开了三篙。\n你借着江心的暗流，贴着芦苇撑了半夜，把他送上南岸。' },
        { label: '解下缆绳，把船撑到石阶下', sub: '渔家的本领', if: { ...BOATMAN, notFlag: 'kp_wei_met' }, next: -1,
          do: [{ type: 'shi', id: XUN, to: 'duye' }, ...relUp('kp_chu', '你夜里撑船，把他送过了江'), { type: 'time', add: 120 }],
          result: '你解了缆绳，撑一条小船横到石阶下，朝褚七低喝了一声。他看了你一眼，把铺盖一卷，跳上船来。卫衡追到石阶边，水已隔开了三篙。\n你借着江心的暗流，贴着芦苇撑了半夜，把他送上南岸。' },
        { label: '解下缆绳，把船撑到石阶下', next: 0, if: { notFlag: 'kp_lan', any: [{ notFlag: 'kp_qiantan' }] },
          result: '你摸到缆绳，才想起自己在渡口不过打过几年下手：夜里的运河暗流，不是你撑得过去的。' },
        { label: '低声叫褚七快走', sub: '他走了　卫衡知道是你', next: -1,
          do: [...relUp('kp_chu', '你夜里递了话，他连夜走了，欠你的又多一笔'), ...relDown('kp_wei', '褚七连夜走了，卫衡知道是你递的话'),
            { type: 'flag', flag: 'kp_zou_known' }, { type: 'shi', id: XUN, to: 'zou_see' }],
          result: '你压低嗓子说了一句。褚七把盐包一撂，翻身便往盐垛后头去了。卫衡抢了两步，石阶下只剩一圈水纹。' },
        { label: '退到一边，不插手', next: -1 }
      ] }
  ] },

  // 渡口调停：请两人坐下说话
  { id: 'xun_tiao', cards: [tiaoCard()] },

  // 拦在褚七前头：胜了卫衡，他收剑，肯坐下听
  { id: 'xun_tiao_win', cards: [
    { tag: '渡口夜话', title: '收剑',
      paras: [
        '卫衡的剑脱了手，当啷落在石阶上。他低头看了看，弯腰拾起，慢慢还入鞘中。',
        '他没有看褚七，开口道：「你的功夫，晚辈输得服气。你要护他，晚辈不拦。只是今夜，晚辈想听一句实话。」'
      ],
      choices: [{ label: '请两人坐下' }] },
    tiaoCard()
  ] },

  // 拦在褚七前头：输了，褚七还是跑了
  { id: 'xun_dui_lose', cards: [
    { tag: '渡口夜话', title: '拦不住',
      paras: [
        '你抢上一步，拦在褚七身前。卫衡看了你一眼，轻轻叹了口气，剑便出了鞘。',
        '三招过后，你的虎口被震得发麻，兵器脱了手。卫衡没有追你，只越过你，往石阶下去。',
        '石阶下水声一响，盐垛后头的人影早没了。夜风里只剩那条缆绳，兀自晃着。'
      ],
      choices: [{ label: '撑着石阶站起来', next: -1,
        do: [{ type: 'shi', id: XUN, to: 'hubai' }, ...relDown('kp_wei', '渡口那夜，你拦在他前头，没拦住'), ...relUp('kp_chu', '渡口那夜，你拦在卫衡前头，他趁乱跑了')] }] }
  ] },

  // 拦在褚七前头：退开了，事情照旧走
  { id: 'xun_dui_flee', cards: [
    { tag: '渡口夜话', title: '退开',
      paras: [
        '你退开几步，撑着石阶喘气。卫衡收了势，没有追。',
        '他开口道：「你要拦，就拿出拦的本事来。」说着转过身，仍旧望着那个扛包的人。'
      ],
      choices: [{ label: '退到一边', next: -1 }] }
  ] }
];

/* ---------- 对手：渡口的卫衡 ---------- */

const FOES: FoeDef[] = [
  { id: 'xun_weiheng', name: '卫衡', title: '腰悬长剑的后生', ini: '卫', tone: 'blue', weapon: '长剑', ws: '剑', tag: '渡口',
    rank: 1.5, build: 'even', firstTell: 3,
    moves: ['平刺', '撩剑', '削腕'],
    flourish: ['剑尖点着石阶', '脚下不退半步', '剑穗在夜风里一荡'],
    tells: [
      { name: '截江一剑', text: '卫衡微微沉肩，长剑自下而上，直取你握兵器的手腕……', dom: 'su', after: '剑锋贴着石阶划过去，溅起一串火星。',
        judge: '你看出这一剑收得极稳，只是起手先沉右肩，沉肩的那一息，是你的空当。' }
    ],
    asides: ['运河水一下一下拍着石阶。', '缆桩边的脚夫远远地蹲着，没有人出声。'],
    opening: ['右肩先沉', '收剑稍缓', '脚下踩着湿苔'],
    intro: '卫衡看了你一眼，剑出鞘半寸：「你要拦，晚辈只好领教。」',
    tips: ['这人比序章里的对手强得多，看准他沉肩的那一息再出手。'],
    prep: [
      { if: { flag: 'kp_qiantan' }, atk: 0.9, big: 0.9,
        text: '你把他引到石阶下最滑的那一级。青苔上怎样落脚，你自小便认得。',
        story: '少年把卫衡引到了石阶下那一级青苔上。' }
    ],
    win: '卫衡的剑脱了手，当啷落在石阶上。',
    lose: '剑脊拍在你腕上，你虎口一麻，兵器脱了手。',
    results: {
      win: { silent: true, do: [{ type: 'flag', flag: 'kp_dui_beat' }, { type: 'heal', hpAtLeast: 0.5 }], then: [{ type: 'story', id: 'xun_tiao_win' }] },
      lose: { silent: true, do: [{ type: 'heal', hpAtLeast: 0.4 }], then: [{ type: 'story', id: 'xun_dui_lose' }] },
      flee: { silent: true, do: [{ type: 'heal', hpAtLeast: 0.5 }], then: [{ type: 'story', id: 'xun_dui_flee' }] }
    } }
];

const pack: ContentPack = {
  npcs: NPCS,
  shi: SHI,
  stories: STORIES,
  foes: FOES
};
export default pack;
