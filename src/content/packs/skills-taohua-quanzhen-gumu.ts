import type { ContentPack, SkillDef } from '../types';

/** 武学库：桃花岛、全真、古墓（Issue #26） */
const SKILLS: SkillDef[] = [
  {
    id: 'tq_tanzhi', name: '弹指神通', grade: '绝品', category: '指法', school: '桃花岛', nature: '刚', reach: '徒手',
    desc: '桃花岛镇岛之技。以内力凝于拇指，弹指间激射而出，可碎金裂石，亦可隔空取穴，讲究准、狠、巧。',
    learn: '桃花岛主亲传，须得岛主青眼',
    moves: [
      { name: '轻拢慢捻', text: '你拇指食指一拢一捻，指力如拨弦般弹出，直点{foe}{part}。', wound: '内伤' },
      { name: '大弦嘈嘈', text: '你指力沉雄，连弹数指，如大弦嘈嘈如急雨，砸向{foe}{part}。', wound: '砸伤' },
      { name: '小弦切切', text: '你改换指法，指力细密急促，如小弦切切如私语，密点{foe}{part}。', wound: '刺伤' },
      { name: '大珠小珠', text: '你十指轮弹，指力如大珠小珠错杂而落，纷纷打在{foe}{part}。', wound: '砸伤', realm: 2 },
      { name: '银瓶乍破', text: '你蓄力一指，倏然弹出一声闷响，如银瓶乍破，指力猛贯{foe}{part}。', wound: '内伤', realm: 3 },
      { name: '铁骑突出', text: '你并指一挥，指力激射，如铁骑突出刀枪鸣，直刺{foe}{part}。', wound: '刺伤', realm: 4 },
      { name: '曲终收拨', text: '你当胸一指，如曲终收拨当心一画，指力尽凝一点，贯穿{foe}{part}。', wound: '内伤', realm: 5 },
      { name: '此时无声', text: '你最后一指悄然弹出，无声无息，{foe}只觉{part}一麻，指力已透穴而入。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '轻拢慢捻', text: '你指法忽拢忽捻，指力一记轻一记重，如拨弦弄筝，声声不离{foe}{part}。', mp: 80, cd: 1, hits: 1, dmg: [130, 170], acc: 0.78 },
      { name: '隔空点穴', realm: 3, text: '你遥遥一指，隔空一弹，一缕指力无声无息，正中{foe}{part}穴道，{foe}半身登时酸麻，动弹不得。', mp: 90, cd: 2, hits: 0, dmg: [10, 10], acc: 0.8, fx: [{ kind: 'busy', rounds: 2 }] },
      { name: '铁骑突出', realm: 4, text: '你指力尽吐，如铁骑破阵，一往无前，{foe}格挡的门户被生生撞开，{part}露出破绽。', mp: 110, cd: 2, hits: 1, dmg: [100, 140], acc: 0.8, fx: [{ kind: 'break', value: 15, rounds: 2 }] }
    ]
  },
  {
    id: 'tq_luoying', name: '落英神剑掌', grade: '上品', category: '掌法', school: '桃花岛', nature: '柔', reach: '徒手',
    desc: '桃花岛掌法。双掌翻飞，掌影如落英缤纷，五虚一实，虚实相生，教人眼花缭乱间已着了道儿。',
    learn: '桃花岛主亲传，入室弟子方可习之',
    moves: [
      { name: '落英缤纷', text: '你双掌翻飞，掌影如落英缤纷，纷纷扬扬罩向{foe}{part}。', wound: '瘀伤' },
      { name: '灼灼其华', text: '你一掌拍出，掌影明艳夺目，如桃花灼灼其华，拍向{foe}{part}。', wound: '瘀伤' },
      { name: '桃之夭夭', text: '你身随掌走，掌势轻盈灵动，如夭桃摇曳，掠向{foe}{part}。', wound: '瘀伤' },
      { name: '芳草鲜美', text: '你掌力铺开，绵绵不绝，如芳草鲜美，一浪一浪卷向{foe}{part}。', wound: '内伤', realm: 2 },
      { name: '人面桃花', text: '你掌影一晃，虚虚实实，如人面桃花相映，{foe}辨不出真假，{part}已中一掌。', wound: '瘀伤', realm: 3 },
      { name: '流水落花', text: '你掌势连绵带出，如流水载着落花，柔劲卷住{foe}{part}一带一送。', wound: '内伤', realm: 4 },
      { name: '花自飘零', text: '你双掌轻扬，掌影如花自飘零水自流，无声无息洒向{foe}{part}。', wound: '内伤', realm: 5 },
      { name: '万点飞红', text: '你全身滚进，双掌幻出万点飞红，漫天花雨般落向{foe}{part}。', wound: '瘀伤', realm: 6 }
    ],
    performs: [
      { name: '落英缤纷', text: '你双掌连挥，一十六道掌影缤纷而下，{foe}拆得一掌又是一掌，{part}应接不暇。', mp: 90, cd: 2, hits: 3, dmg: [55, 75], acc: 0.75 },
      { name: '乱红飞过', realm: 4, text: '你掌力陡然催急，残红乱飞，势不可收，滚滚掌劲涌向{foe}{part}，压得{foe}气血翻腾。', mp: 100, cd: 2, hits: 2, dmg: [70, 90], acc: 0.75, fx: [{ kind: 'weaken', value: 15, rounds: 2 }] }
    ]
  },
  {
    id: 'tq_yuxiao', name: '玉箫剑法', grade: '上品', category: '剑法', school: '桃花岛', nature: '柔', reach: '短',
    desc: '桃花岛剑法。以箫喻剑，剑走音律，一招一式如奏仙乐，敌人在剑音缭绕中不知不觉已中剑。',
    learn: '桃花岛主亲传，须通晓音律',
    moves: [
      { name: '高山流水', text: '你长剑斜引，剑势连绵而起，如高山流水一泻而下，直取{foe}{part}。', wound: '刺伤' },
      { name: '平沙落雁', text: '你剑光低回，贴地平掠，如雁落平沙，削向{foe}{part}。', wound: '割伤' },
      { name: '梅花三弄', text: '你剑尖连点三下，一弄再弄三弄，三点寒芒齐奔{foe}{part}。', wound: '刺伤' },
      { name: '阳春白雪', text: '你剑势清冷高洁，剑光如雪，自上而下洒向{foe}{part}。', wound: '割伤', realm: 2 },
      { name: '渔樵问答', text: '你一剑问，一剑答，两剑一呼一应，分袭{foe}上下，末了剑尖点其{part}。', wound: '刺伤', realm: 3 },
      { name: '凤求凰', text: '你剑走轻灵，绕身一周，如凤求凰，剑光兜住{foe}{part}。', wound: '割伤', realm: 4 },
      { name: '十面埋伏', text: '你剑光四面罩下，处处埋伏，{foe}左右闪避，{part}终究避不过这一剑。', wound: '刺伤', realm: 5 },
      { name: '广陵散', text: '你长剑一振，剑音铮铮如奏绝响，一剑之威激荡而出，直贯{foe}{part}。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '碧海潮生', text: '你剑势忽如海潮暗涌，一浪高过一浪，{foe}心神摇曳，{part}门户洞开，被这一剑拂中。', mp: 75, cd: 1, hits: 1, dmg: [115, 145], acc: 0.78, fx: [{ kind: 'fear', value: 12 }] },
      { name: '曲终人不见', realm: 3, text: '你剑音渐低，剑光渐淡，如曲终人不见，{foe}一怔之间，寒气已随这一剑渗入{part}。', mp: 95, cd: 2, hits: 1, dmg: [100, 140], acc: 0.8, fx: [{ kind: 'chill', rounds: 2 }] }
    ]
  },
  {
    id: 'tq_xiantian', name: '先天功', grade: '神品', category: '内功', school: '全真', nature: '阳',
    desc: '全真祖师所创无上内功。先天地而生，浑然无极，练成之后真气生生不息，护体疗伤皆是一等一。',
    learn: '全真祖师嫡传，历代掌教单传',
    passive: [{ kind: 'guard', value: 14 }, { kind: 'heal', value: 6 }]
  },
  {
    id: 'tq_quanzhen', name: '全真剑法', grade: '上品', category: '剑法', school: '全真', nature: '中正', reach: '短',
    desc: '全真教玄门正宗剑法。剑势端凝厚重，堂堂之阵，正正之旗，越练越见根基，与玉女素心剑法相配更是天作之合。',
    learn: '全真教入门剑法，人人得授',
    moves: [
      { name: '张帆举棹', text: '你长剑斜挑上举，如张帆举棹，借着剑势全力前送，直取{foe}{part}。', wound: '刺伤' },
      { name: '抱元守一', text: '你剑守中宫，剑圈浑圆如一，护住自身，兼削{foe}{part}。', wound: '割伤' },
      { name: '雁行斜击', text: '你斜身掠进，剑走斜势，如雁行斜击，划向{foe}{part}。', wound: '割伤' },
      { name: '枯藤盘根', text: '你剑势忽沉，贴地盘旋，如枯藤盘根，缠向{foe}下盘，反挑其{part}。', wound: '割伤', realm: 2 },
      { name: '浪迹天涯', text: '你一剑随手挥出，行云流水，看似随意，剑尖却始终不离{foe}{part}。', wound: '刺伤', realm: 3 },
      { name: '一气化三清', text: '你一剑刺出，中途忽分三道剑意，如一气化三清，齐落{foe}{part}。', wound: '刺伤', realm: 4 },
      { name: '三花聚顶', text: '你剑光凝顶而落，如三花聚顶，自上而下直压{foe}{part}。', wound: '砸伤', realm: 5 },
      { name: '天罡北斗', text: '你连踏七星方位，长剑连环七刺，剑剑相连如天罡北斗阵，齐指{foe}{part}。', wound: '刺伤', realm: 6 }
    ],
    performs: [
      { name: '天罡北斗', text: '你踏位连刺，七剑环攻，如天罡北斗环列，剑剑相续，罩向{foe}{part}。', mp: 85, cd: 2, hits: 3, dmg: [50, 66], acc: 0.75 },
      { name: '浪迹天涯', realm: 3, text: '你一剑浪迹而出，人随剑走，剑随心动，身法轻灵，{foe}连{part}都看不清。', mp: 95, cd: 2, hits: 1, dmg: [100, 135], acc: 0.8, fx: [{ kind: 'haste', value: 15, rounds: 2 }] }
    ],
    combos: [{ with: 'tq_suxin', name: '双剑合璧', bonus: 8, text: '你与同伴各使一路剑法，一刚一柔，一全真一古墓，两剑竟似心意相通，互补破绽，端的是天衣无缝。' }]
  },
  {
    id: 'tq_suxin', name: '玉女素心剑法', grade: '上品', category: '剑法', school: '古墓', nature: '柔', reach: '短',
    desc: '古墓派剑法，本为双修而设。招名皆取闺阁情事，一招一式缠绵蕴藉，须与全真剑法相互呼应方得大成。',
    learn: '古墓派秘传，须两人合练',
    moves: [
      { name: '花前月下', text: '你剑光朦胧如月色，一剑悄悄递出，如花前月下漫步，轻点{foe}{part}。', wound: '刺伤' },
      { name: '清饮小酌', text: '你剑势从容闲雅，如清饮小酌，剑尖忽地一探，点向{foe}{part}。', wound: '刺伤' },
      { name: '扫雪烹茶', text: '你长剑横扫，如扫雪烹茶，剑光清利，拂过{foe}{part}。', wound: '割伤' },
      { name: '松下对弈', text: '你一剑一式从容应对，如松下对弈，算定{foe}后着，剑尖先候在其{part}。', wound: '刺伤', realm: 2 },
      { name: '池边调鹤', text: '你剑光柔和圆转，如池边调鹤，引着{foe}兵刃偏出，顺势划其{part}。', wound: '割伤', realm: 3 },
      { name: '西窗夜话', text: '你剑光忽敛，如西窗剪烛夜话，{foe}心神一松，{part}已着了一剑。', wound: '刺伤', realm: 4 },
      { name: '彩笔画眉', text: '你剑尖轻挑慢描，如彩笔画眉，在{foe}{part}划下一道剑痕。', wound: '割伤', realm: 5 },
      { name: '举案齐眉', text: '你平剑齐眉一递，堂堂正正，剑随臂展，直贯{foe}{part}。', wound: '刺伤', realm: 6 }
    ],
    performs: [
      { name: '花前月下', text: '你剑光如月色倾泻，绵绵一剑裹着绵绵一剑，教{foe}在花月温柔里着了道，{part}血线悄然渗出。', mp: 70, cd: 1, hits: 1, dmg: [110, 145], acc: 0.78 },
      { name: '西窗夜话', realm: 3, text: '你剑光忽敛忽吐，如剪烛夜话，低声絮絮，{foe}心神恍惚，寒气已随两剑渗入{part}。', mp: 90, cd: 2, hits: 2, dmg: [60, 80], acc: 0.78, fx: [{ kind: 'chill', rounds: 2 }] }
    ],
    combos: [{ with: 'tq_quanzhen', name: '双剑合璧', bonus: 8, text: '你与同伴各使一路剑法，一柔一刚，一古墓一全真，两剑意趣相合，破绽互为掩映，浑然一体。' }]
  },
  {
    id: 'tq_yunv', name: '玉女心经', grade: '上品', category: '内功', school: '古墓', nature: '阴',
    desc: '古墓派内功秘要。须二人同修，真气绵绵若存，练成之后身轻如燕，动作如风，最善腾挪闪避。',
    learn: '古墓派内密，须与同门共修',
    passive: [{ kind: 'haste', value: 13 }],
    combos: [{ with: 'tq_suxin', name: '素心同修', bonus: 4, text: '你以玉女心经真气催发素心剑意，身随剑走，剑随心动，轻灵更胜平日。' }]
  },
  {
    id: 'tq_jinyan', name: '金雁功', grade: '上品', category: '轻功', school: '全真', nature: '中正',
    desc: '全真教轻功。一纵数丈，凌空如雁翔，落地悄无声息，是玄门弟子入门的根基功夫。',
    learn: '全真教入门轻功，弟子共习',
    passive: [{ kind: 'haste', value: 10 }]
  }
];

const pack: ContentPack = { skills: SKILLS };
export default pack;
