import type { Cond, ContentPack, EncounterDef, FoeDef, StoryDef } from '../types';

/**
 * 路遇 · 扬州一带（Issue #85）：八件路上的事。
 * 两条只在夜里；追贼用胆魄、走失的孩子用悟性；剑客船工与镖局趟子手可反复切磋；
 * 走失的孩子在渡口有后续；威远镖局的趟子手、六扇门的夜捕，牵身份线。
 */

const NIGHT = { hour: { from: 19, to: 5 } };

/** 白天才有的：练剑、练拳、群架、算命、诬赖（审查 B29：子时还遇到这些） */
const DAY: Cond = { hour: { from: 6, to: 19 } };

const ENCOUNTERS: EncounterDef[] = [
  { id: 'luyu_yz_jianke', region: ['yz'], to: ['hu'], if: DAY, story: 'ly_yz_jianke' },
  { id: 'luyu_yz_tangzi', region: ['yz'], to: ['dukou'], if: DAY, story: 'ly_yz_tangzi' },
  { id: 'luyu_yz_zhuifei', region: ['yz'], to: ['cheng'], once: true, if: NIGHT, story: 'ly_yz_zhuifei' },
  { id: 'luyu_yz_huji', region: ['yz'], to: ['dukou'], once: true, if: DAY, story: 'ly_yz_huji' },
  { id: 'luyu_yz_zouhai', region: ['yz'], to: ['cheng'], once: true, if: NIGHT, story: 'ly_yz_zouhai' },
  { id: 'luyu_yz_zouhai_a', region: ['yz'], to: ['dukou'], once: true, if: { flag: 'ly_yz_zouhai_fuya' }, story: 'ly_yz_zouhai_a' },
  { id: 'luyu_yz_zouhai_b', region: ['yz'], to: ['dukou'], once: true, if: { flag: 'ly_yz_zouhai_qian' }, story: 'ly_yz_zouhai_b' },
  { id: 'luyu_yz_suanming', region: ['yz'], to: ['jinshan'], if: DAY, story: 'ly_yz_suanming' },
  { id: 'luyu_yz_shusheng', region: ['yz'], to: ['cheng_tavern'], once: true, if: DAY, story: 'ly_yz_shusheng' }
];

const STORIES: StoryDef[] = [
  { id: 'ly_yz_jianke', cards: [
    { tag: '路遇', title: '使剑的船工',
      paras: [
        '湖边柳树下，一个粗布短打的汉子正在使剑。剑是老剑，招却是好招，一柄剑使得泼水不进。',
        '他看见你腰间的剑，收了势，抱剑一礼：「这位兄弟也是使剑的？湖上讨生活的，难得遇上懂行的——过两招？」'
      ],
      choices: [
        { label: '应战', sub: '切磋',
          do: [{ type: 'flag', flag: 'ly_yz_jianke' }, { type: 'fight', foe: 'ly_yz_jianke' }] },
        { label: '推辞', sub: '赶路要紧',
          result: '你抱拳还礼：「赶路要紧。」他也不恼，咧嘴一笑：「湖上常见，回头再讨教。」',
          do: [{ type: 'flag', flag: 'ly_yz_jianke_bye' }], next: -1 }
      ] }
  ] },

  { id: 'ly_yz_tangzi', cards: [
    { tag: '路遇', title: '趟子手练拳',
      paras: [
        '威远镖局的趟子手在后巷里练拳，一记马步冲拳虎虎生风。他看见你，收了式，抱拳道：「这位爷看着会家子。镖局的规矩，见会家子就想讨教。」',
        '「放心，点到即止——镖行的拳脚，得经得住外人试。」'
      ],
      choices: [
        { label: '过两招', sub: '切磋',
          do: [{ type: 'flag', flag: 'ly_yz_tangzi' }, { type: 'fight', foe: 'ly_yz_tangzi' }] },
        { label: '拱手告辞',
          result: '你抱拳告辞。他也不勉强，继续扎他的马步，嘴里念着镖局的号子。',
          do: [{ type: 'flag', flag: 'ly_yz_tangzi_bye' }], next: -1 }
      ] }
  ] },

  { id: 'ly_yz_zhuifei', cards: [
    { tag: '路遇', title: '夜捕',
      paras: [
        '夜里更鼓刚过，巷子里忽然一阵乱响。一条黑影迎面跑来，身后一个捕快提着铁尺追：「拦住他！六扇门拿人！」',
        '黑影抱着个包袱，慌不择路，眼看就要从你身边撞过去。'
      ],
      choices: [
        { label: '一腿绊倒他', sub: '胆魄',
          result: '你脚下一伸。那贼收势不住，摔了个满脸开花，包袱里滚出几件金银器皿。捕快赶到，铁尺一点：「多谢了！这是城里绸缎庄的赃物。」',
          do: [
            { type: 'flag', flag: 'ly_yz_zhuifei_bang' },
            { type: 'lilian', amount: 60 },
            { type: 'feed', tag: '江湖', text: '夜里你帮六扇门的捕快绊倒了一个飞贼。捕快姓吴，记下了你的名字。' }
          ], next: -1 },
        { label: '闪身让路',
          result: '你往旁边一让。黑影擦着你的衣角跑了，捕快追过去，只撵起一巷子的狗吠。',
          do: [{ type: 'flag', flag: 'ly_yz_zhuifei_walk' }], next: -1 },
        { label: '暗中伸脚，放他走', sub: '这贼跑得心虚',
          result: '你看似让路，脚下却悄悄一偏，让开了条巷口。黑影会意，钻了进去。捕快追丢了，回头狠狠瞪了你一眼。',
          do: [
            { type: 'flag', flag: 'ly_yz_zhuifei_fang' },
            { type: 'feed', tag: '江湖', text: '夜里六扇门拿人，有人暗中放走了那个飞贼。捕头吴爷很是光了一回火。' }
          ], next: -1 }
      ] }
  ] },

  { id: 'ly_yz_huji', cards: [
    { tag: '路遇', title: '一船盐，两家的气',
      paras: [
        '码头上一阵喧哗。漕帮的伙计和盐商的伙计为一条船的装卸钱动起了手，扁担盐包丢了一地。',
        '两边各有十几号人，眼看着要变成一场群架。有人认出你佩着剑，两边都有人朝你喊：「公子给评评理！」'
      ],
      choices: [
        { label: '帮漕帮说话', sub: '装卸钱是苦力钱',
          result: '你说装卸的钱是苦力换的血汗钱，不能欠。漕帮的伙计们齐声叫好，盐商的伙计悻悻去了。此事漕帮管事听说后，记了你个好人情。',
          do: [
            { type: 'flag', flag: 'ly_yz_huji_cao' }, { type: 'xia', delta: 1 },
            { type: 'feed', tag: '江湖', text: '码头装卸钱起了争执，有人帮漕帮的苦力说了话。漕帮管事记下了这份人情。' }
          ], next: -1 },
        { label: '帮盐商说话', sub: '契在纸上有据', if: { attr: { key: '悟性', atLeast: 20 } },
          result: '你要过契纸一看，白纸黑字，装卸钱确实按船计。你把契纸念给众人听。漕帮的把头臊红了脸，盐商的伙计朝你连声道谢。',
          do: [
            { type: 'flag', flag: 'ly_yz_huji_yanhao' }, { type: 'lilian', amount: 30 },
            { type: 'feed', tag: '江湖', text: '码头装卸钱的争执，有人照着契纸评了个明白。' }
          ], next: -1 },
        { label: '各打五十大板',
          result: '你说一个愿打一个愿挨，找官府评去。两边都悻悻的，倒也没真打起来。斗殴散了，码头上安静了。',
          do: [{ type: 'flag', flag: 'ly_yz_huji_none' }], next: -1 }
      ] }
  ] },

  { id: 'ly_yz_zouhai', cards: [
    { tag: '路遇', title: '走失的孩子',
      paras: [
        '夜里灯火半明，一个六七岁的孩子缩在屋檐下抽噎，怀里死死抱着个包袱。',
        '你问他是谁家的孩子，他只说找不着回家的路了。你牵起他的手，他的手冰凉，手腕上有一圈青紫的指印。'
      ],
      choices: [
        { label: '送他去府衙', sub: '官府能找到家人',
          result: '你牵着他到府衙门口，交给值夜的衙役。孩子一步三回头，你朝他挥挥手，看他进去了。',
          do: [
            { type: 'flag', flag: 'ly_yz_zouhai_fuya' },
            { type: 'lilian', amount: 30 },
            { type: 'feed', tag: '江湖', text: '夜里你把一个走失的孩子送到了府衙。' }
          ], next: -1 },
        { label: '蹲下来看看他的手腕', sub: '悟性', if: { attr: { key: '悟性', atLeast: 22 } }, next: 1 },
        { label: '给他几文钱，让他自己找店', if: { silver: 5 },
          result: '你给他几文钱。孩子攥着钱，怯生生地问了家客栈的名号，一步一挪地走了。夜风里，那点小小的背影看着叫人放心不下。',
          do: [{ type: 'silver', delta: -5 }, { type: 'flag', flag: 'ly_yz_zouhai_alone' }], next: -1 }
      ] },
    { tag: '路遇', title: '腕上的指印',
      paras: [
        '你蹲下来细看那圈青紫——是指印，还是新的。孩子的眼泪一下子涌出来：「后爹打的……他嫌我吃闲饭，把我撵出来了。」',
        '包袱里是他亲娘留下的银镯子。「这是娘留给我的，后爹要拿去换酒，我没给。」'
      ],
      choices: [
        { label: '送他去府衙，请官府做主', sub: '虐子有据，官府管得着',
          result: '你牵着他到府衙，把腕上的指印给值夜的衙役看。衙役脸色一变，记下了名字住处：「虐子有据，官府管得着。」孩子抹着眼泪，朝你连连点头。',
          do: [
            { type: 'flag', flag: 'ly_yz_zouhai_fuya' }, { type: 'xia', delta: 2 },
            { type: 'lilian', amount: 30 },
            { type: 'feed', tag: '江湖', text: '你带着一个被后爹打出来的孩子到府衙报了官。' }
          ], next: -1 },
        { if: { silver: 20 }, label: '给他钱，教他去投亲', sub: '银两 −20',
          result: '「你外祖家可还在城里？」孩子点头。你给他二十文，教他天亮就去投外祖。他把银镯子攥得更紧了，一步三回头地走进了夜色。',
          do: [
            { type: 'silver', delta: -20 }, { type: 'xia', delta: 1 },
            { type: 'flag', flag: 'ly_yz_zouhai_qian' },
            { type: 'feed', tag: '江湖', text: '你给了被后爹撵出来的孩子二十文，教他去投外祖家。' }
          ], next: -1 }
      ] }
  ] },

  { id: 'ly_yz_zouhai_a', cards: [
    { tag: '路遇', title: '府衙的回话',
      paras: [
        '渡口上，那孩子远远看见你，挣开衙役的手跑过来，身子比先前壮实了些。',
        '「衙役爷爷做主，把后爹锁了。」他仰着脸，「官老爷判他给我外祖家当苦力，挣钱养我——公子，官府里也有好人。」',
        '他从怀里掏出两个还热着的炊饼，硬塞给你一个。'
      ],
      choices: [
        { label: '收下炊饼', sub: '这是孩子的心意',
          result: '炊饼又软又热。孩子看着你吃，笑得眼睛弯成了月牙。',
          do: [{ type: 'xia', delta: 1 }], next: -1 }
      ] }
  ] },

  { id: 'ly_yz_zouhai_b', cards: [
    { tag: '路遇', title: '外祖家的门',
      paras: [
        '渡口边的茶摊上，那孩子跟着一位老妇人吃面。老妇人一边抹泪一边往孩子碗里夹肉。',
        '「外祖母接了我了。」孩子看见你，跑过来鞠了一躬，「后爹到外祖家闹过一回，叫街坊们骂走了。」',
        '他把包袱里的银镯子给你看：「娘的镯子还在。等长大了，我去学做买卖，再也不叫人欺负。」'
      ],
      choices: [
        { label: '好生记着今日', sub: '侠义 +1',
          result: '孩子重重地点头。老妇人领着他，朝你又道了一回谢，祖孙俩的背影融进了渡口的人潮里。',
          do: [{ type: 'xia', delta: 1 }], next: -1 }
      ] }
  ] },

  { id: 'ly_yz_suanming', cards: [
    { tag: '路遇', title: '铁口直断',
      paras: [
        '小金山脚下的小路旁，一个算命先生，招幌上写着「铁口直断」。他一把拉住你：「这位公子，印堂发黑，三日之内必有血光！」',
        '你抬脚要走，他又拉：「且慢！贫道观公子行走坐卧，是练家子——这一卦，不灵不要钱。」'
      ],
      choices: [
        { if: { silver: 20 }, label: '听他胡诌', sub: '历练 +20',
          result: '他闭着眼掐指一算，从你祖上说到前程，居然真说对了你佩剑的习惯。是江湖上眼线多，还是真有点道行？你给了他二十文润口。',
          do: [
            { type: 'silver', delta: -20 }, { type: 'lilian', amount: 20 },
            { type: 'feed', tag: '江湖', text: '庙墙根的算命先生掐算你的来历，居然说对了七八分。' }
          ], next: -1 },
        { label: '拆他的台', sub: '悟性',
          result: '「你这卦摊朝西，日头一过晌就照不出招牌上的金字；你拉客专挑佩剑的——剑客过路，最忌讳人家说血光。」先生讪讪地收了幌子。',
          do: [{ type: 'flag', flag: 'ly_yz_suanming_chai' }], next: -1 },
        { label: '不理会，走开',
          result: '你甩开他的手走了。身后还在喊：「公子！公子！血光之灾啊——」喊声渐渐远了。', next: -1 }
      ] }
  ] },

  { id: 'ly_yz_shusheng', cards: [
    { tag: '路遇', title: '被诬赖的书生',
      paras: [
        '望江楼斜对面的绸布庄门口围了一圈人。掌柜的揪着一个书生的领子，说他偷了一匹绸缎。书生涨红了脸分辩，怀里却被翻出了一段绸子。',
        '「分明是他撞我一下栽赃！」书生的箱子摔开了，里头全是书，一本绸缎也没有。'
      ],
      choices: [
        { label: '细看那段绸子', sub: '悟性', if: { attr: { key: '悟性', atLeast: 22 } }, next: 1 },
        { if: { silver: 30 }, label: '替他赔钱了事', sub: '银两 −30',
          result: '你替书生赔了绸缎钱。掌柜的收钱放人。书生朝你长揖到地：「君子可欺以其方……但终究是多谢。」他抱着书箱，狼狈地走了。',
          do: [{ type: 'silver', delta: -30 }, { type: 'flag', flag: 'ly_yz_shusheng_pay' }], next: -1 },
        { label: '少管闲事',
          result: '你摇摇头走出人群。身后书生还在喊冤，掌柜的嗓门越来越大。',
          do: [{ type: 'flag', flag: 'ly_yz_shusheng_walk' }], next: -1 }
      ] },
    { tag: '路遇', title: '绸子上的折痕',
      paras: [
        '你拈起那段绸子对着光——折痕是新的，叠得方方正正；可布庄卖绸，从来是卷着拿，哪有先叠好再叫贼偷的？',
        '「掌柜的，你自家柜上的绸，谁叠过？」掌柜的脸色一变，支支吾吾。看客里有人认出，那掌柜上月才诬赖过一个香客。',
        '掌柜的讪讪放了书生。书生朝你长揖到底，抱着书箱，头也不回地走了——读书人的傲气，都在那一揖里。'
      ],
      choices: [
        { label: '教导他江湖险，收起傲气', sub: '历练 +40',
          result: '你叫住他：「方才若不是我，你这傲气要吃大亏。」书生再揖：「受教。」他这一揖，比先前那次深得多了。',
          do: [{ type: 'lilian', amount: 40 }, { type: 'flag', flag: 'ly_yz_shusheng_friend' },
            { type: 'feed', tag: '江湖', text: '你替一个被诬赖的书生洗了冤，还教了他一句江湖险。' }], next: -1 },
        { label: '一笑而去',
          result: '你摆摆手走了。人群里有人竖起大拇指，也有人嘀咕：多一事不如少一事。', next: -1 }
      ] }
  ] }
];

const JIANKE: FoeDef = {
  id: 'ly_yz_jianke', name: '使剑的船工', title: '湖上讨生活的老师傅', ini: '船', tone: 'blue',
  weapon: '老剑', ws: '剑', tag: '路遇', spar: true,
  rank: 0, build: 'light', weak: 0.6, firstTell: 2,
  moves: ['顺水推舟', '逆流斩', '回头浪'],
  flourish: ['剑势如船橹摇水，绵绵不断', '脚下随着不存在的浪头起伏', '哈哈一笑，剑更快了'],
  tells: [
    { name: '顺水推舟', text: '船工长剑平送，借着前冲之势直刺，剑走的是水路的巧劲……', dom: 'qiao', after: '剑尖擦衣而过，带起一缕布屑！' },
    { name: '回头浪', text: '船工剑势一老，忽然回锋倒卷，如回头浪打在船头……', dom: 'li', after: '回锋卷起一片尘土！' }
  ],
  asides: ['湖上有渔船摇过，船家见惯不怪。', '柳絮粘在他的剑穗上。'],
  opening: ['剑势起得慢', '脚步稳', '笑眯眯地活动手腕'],
  intro: '船工抱剑一礼：「湖上的野路子，教得不对的地方，兄弟多担待！」',
  win: '船工的剑被磕飞，他哈哈大笑：「痛快！湖上十年，头一回输得明白！」',
  lose: '你的剑被压在船工腕下。他收剑笑道：「兄弟根骨好，是没吃过水上的苦。」',
  results: {
    win: { tag: '切磋 · 胜', title: '剑压船工', button: '抱拳收势',
      story: '船工抱剑大笑，连说受教。他从怀里摸出一小葫芦酒要请你，你辞了，他也不恼，转身又去摇他的船橹了。',
      do: [{ type: 'feed', tag: '江湖', text: '你在湖边与一个使剑的船工切磋，赢了半个身位。' }] },
    lose: { tag: '切磋 · 负', title: '水路不熟', button: '抱拳认负',
      story: '船工的剑如船橹摇水，绵绵不绝。你败得不冤。他收剑笑道：「水上的巧劲，是摇橹摇出来的，兄弟有空多来湖边走走。」',
      do: [{ type: 'feed', tag: '江湖', text: '你与湖边使剑的船工切磋，输了半个身位，长了见识。' }] },
    flee: { tag: '切磋', title: '改日再会', button: '告辞',
      story: '你抽身退出圈外。船工也不追，扬声道：「湖上常见！」' }
  }
};

const TANGZI: FoeDef = {
  id: 'ly_yz_tangzi', name: '镖局趟子手', title: '威远镖局的年轻人', ini: '趟', tone: 'amber',
  weapon: '单刀', ws: '刀', tag: '路遇', spar: true,
  rank: 0, build: 'outer', weak: 0.5, firstTell: 2,
  moves: ['开山式', '截腰式', '护头式'],
  flourish: ['刀走轻灵，一看就下过苦功', '嘴里念着镖局的口诀', '年轻，劲却足'],
  tells: [
    { name: '开山裂石', text: '趟子手大喝一声，单刀自上而下全力劈落，刀风扑面……', dom: 'li', after: '地上的石板被劈出一道白印！' },
    { name: '缠头裹脑', text: '趟子手刀交左手，刀背护头，刀刃连环横削……', dom: 'qiao', after: '刀光绕着脑袋转了一圈！' }
  ],
  asides: ['后巷里有伙计探头看热闹，喊着加油。', '他的刀穗上拴着一枚铜钱，是镖局的记号。'],
  opening: ['起手式扎得稳', '年轻力壮', '刀鞘还没完全出鞘'],
  intro: '趟子手抱刀一礼：「威远镖局的规矩，会家子过招，点到即止——请！」',
  win: '趟子手的单刀被压在腕下，他红着脸收刀：「受教！总镖头说得对，我还嫩。」',
  lose: '你的招式被他一一拆解。趟子手收刀笑道：「承让承让——镖行的刀，就是吃饭的家伙。」',
  results: {
    win: { tag: '切磋 · 胜', title: '压住趟子手', button: '还刀入鞘',
      story: '趟子手输得心服口服，非要拉你去找总镖头聊聊。你辞了，他把你送到巷子口，一路都在说威远镖局的规矩。',
      do: [{ type: 'feed', tag: '江湖', text: '你与威远镖局的趟子手切磋，赢了。少镖头赵铁衣听说后，记了你一笔。' }] },
    lose: { tag: '切磋 · 负', title: '镖行刀法有名堂', button: '抱拳认负',
      story: '趟子手的刀又快又正，是下过十年苦功的路子。你认负，他反倒不好意思起来：「公子让着小弟了。」',
      do: [{ type: 'feed', tag: '江湖', text: '你与威远镖局的趟子手切磋，输在刀法太正、根基太厚。' }] },
    flee: { tag: '切磋', title: '点到即止', button: '抱拳',
      story: '你跳出圈外抱拳。趟子手还刀入鞘，还礼相送。' }
  }
};

const pack: ContentPack = {
  encounters: ENCOUNTERS,
  stories: STORIES,
  foes: [JIANKE, TANGZI],
  news: [
    { if: { flag: 'ly_yz_zhuifei_bang' }, text: '夜里六扇门拿人，有个佩剑的出手相助，一腿绊倒了飞贼。吴捕头念叨了好几天。' },
    { if: { flag: 'ly_yz_zhuifei_fang' }, text: '夜里六扇门追贼追丢了，有人说，是有人暗中放走了那贼。吴捕头发了好大的火。' },
    { if: { flag: 'ly_yz_zouhai_fuya' }, text: '府衙收留了个被后爹打出来的孩子，官老爷拍案说虐子有据，管定了。' },
    { if: { flag: 'ly_yz_zouhai_qian' }, text: '渡口边有对祖孙，孩子是他娘留下的骨血，听说逃出了一个混账后爹。' },
    { if: { flag: 'ly_yz_shusheng_friend' }, text: '布庄诬赖书生的官司传遍了读书人中间。有人见那书生逢人便说：江湖险，收傲气。' },
    { if: { flag: 'ly_yz_jianke' }, text: '湖边使剑的船工近来逢人便说，输给了一个佩剑的年轻人，输得痛快。' }
  ]
};
export default pack;
