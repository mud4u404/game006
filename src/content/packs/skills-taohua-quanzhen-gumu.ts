import type { ContentPack, SkillDef } from '../types';

/** 武学库：桃花岛、全真、古墓（Issue #26，门派改造 Issue #62） */

const SKILLS: SkillDef[] = [
  {
    id: 'tq_lanhua', name: '兰花拂穴手', grade: '良品', category: '手法', school: '桃花岛', nature: '柔', reach: '徒手',
    desc: '桃花岛擒拿手法。五指如兰花瓣轻张，拂的就是穴道，看着风雅，被拂上一拂，半边身子就使不上劲。',
    learn: '桃花岛入门手法，弟子自智者习之',
    teach: '入门',
    moves: [
      { name: '兰花初绽', text: '你五指轻张，如兰花初绽，拂向{foe}{part}。', wound: '瘀伤' },
      { name: '玉指拈香', text: '你玉指一拈，似拈香又似点穴，{foe}一晃神，{part}已着了一记。', wound: '瘀伤' },
      { name: '拂柳分花', text: '你手势如拂柳分花，把{foe}招式分向两边，中间全露了出来。', wound: '瘀伤' },
      { name: '兰香拂面', text: '你拂上一拂，掌风带兰香拂过{foe}面门，其{part}跟着一滞。', wound: '瘀伤', realm: 2 },
      { name: '幽兰拂穴', text: '你拂向{foe}曲池、曲泽诸穴，指风幽幽，中者半身酸麻。', wound: '瘀伤', realm: 3 },
      { name: '万花拂穴', text: '你掌影化作万花，瓣瓣都往穴道上拂，{foe}挡了东边挡不了西边。', wound: '瘀伤', realm: 4 }
    ],
    performs: [
      { name: '兰花轻拂', text: '你五指如兰花瓣轻轻一拂，拂的正是{foe}穴道——拂着便罢，拂不着也教他分神。', mp: 35, cd: 2, hits: 1, dmg: [85, 115], acc: 0.78, fx: [{ kind: 'busy', rounds: 1, chance: 0.5 }] }
    ]
  },
  {
    id: 'tq_xuanfeng', name: '旋风扫叶腿', grade: '良品', category: '腿法', school: '桃花岛', nature: '刚', reach: '徒手',
    desc: '桃花岛腿法。腿出如旋风扫落叶，一片腿影卷过去，站着的都得倒。',
    learn: '桃花岛入门腿法，弟子共习',
    teach: '入门',
    moves: [
      { name: '旋风乍起', text: '你一腿横扫，如旋风乍起，扫向{foe}下盘，带及其{part}。', wound: '瘀伤' },
      { name: '落叶纷飞', text: '你连环两腿踢出，如落叶纷飞，踢得{foe}连退带挡。', wound: '瘀伤' },
      { name: '扫叶断枝', text: '你腿势加沉，如扫叶断枝，一脚踢得{foe}{part}发木。', wound: '瘀伤' },
      { name: '旋腿劈风', text: '你旋身起腿，腿风劈啪作响，劈向{foe}{part}。', wound: '瘀伤', realm: 2 },
      { name: '旋风连环', text: '你左右腿连环旋出，一腿快过一腿，{foe}下盘大乱。', wound: '瘀伤', realm: 3 },
      { name: '叶尽风止', text: '你最后一腿全力扫出，风止叶尽，{foe}立足不住，踉跄跌出。', wound: '内伤', realm: 4 }
    ],
    performs: [
      { name: '旋风扫叶', text: '你一腿横扫，如旋风扫落叶，扫得{foe}下盘大乱，门户洞开。', mp: 55, cd: 2, hits: 1, dmg: [100, 140], acc: 0.75, fx: [{ kind: 'break', value: 8, rounds: 2 }] }
    ]
  },
  {
    id: 'tq_bichao', name: '碧潮心法', grade: '良品', category: '内功', school: '桃花岛', nature: '柔',
    desc: '以内功摹拟碧海潮生之意。潮有信，力有节，一波未平一波又起，是桃花岛外门功夫的底子。',
    learn: '桃花岛外门心法，与玉箫同参',
    teach: '外门',
    passive: [{ kind: 'rage', value: 5 }]
  },
  {
    id: 'tq_tanzhi', name: '弹指神通', grade: '绝品', category: '指法', school: '桃花岛', nature: '刚', reach: '徒手',
    desc: '桃花岛镇岛之技。以内力凝于拇指，弹指间激射而出，可碎金裂石，亦可隔空取穴，讲究准、狠、巧。',
    learn: '桃花岛主亲传，须得岛主青眼',
    teach: '真传',
    requires: [{ skill: 'tq_lanhua', realm: 4 }],
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
      { name: '轻拢慢捻', text: '你指法忽拢忽捻，指力一记轻一记重，如拨弦弄筝，声声不离{foe}{part}。', mp: 75, cd: 1, hits: 1, dmg: [200, 260], acc: 0.78 },
      { name: '隔空点穴', realm: 3, text: '你遥遥一指，隔空一弹，一缕指力无声无息，正中{foe}{part}穴道，{foe}半身登时酸麻，动弹不得。', mp: 60, cd: 3, hits: 1, dmg: [200, 250], acc: 0.8, fx: [{ kind: 'busy', rounds: 2 }] },
      { name: '铁骑突出', realm: 4, text: '你指力尽吐，如铁骑破阵，一往无前，{foe}格挡的门户被生生撞开，{part}露出破绽。', mp: 90, cd: 2, hits: 1, dmg: [265, 365], acc: 0.8, fx: [{ kind: 'break', value: 15, rounds: 2 }] }
    ]
  },
  {
    id: 'tq_luoying', name: '落英神剑掌', grade: '上品', category: '掌法', school: '桃花岛', nature: '柔', reach: '徒手',
    desc: '桃花岛掌法。双掌翻飞，掌影如落英缤纷，五虚一实，虚实相生，教人眼花缭乱间已着了道儿。',
    learn: '桃花岛主亲传，入室弟子方可习之',
    teach: '外门',
    requires: [{ skill: 'tq_xuanfeng', realm: 2 }],
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
      { name: '落英缤纷', text: '你双掌连挥，一十六道掌影缤纷而下，其中一道缠上{foe}手腕一带，{foe}拆得一掌又是一掌，{part}应接不暇。', mp: 50, cd: 2, hits: 2, dmg: [75, 100], acc: 0.75, fx: [{ kind: 'busy', rounds: 1, chance: 0.4 }] },
      { name: '乱红飞过', realm: 4, text: '你掌力陡然催急，残红乱飞，势不可收，滚滚掌劲涌向{foe}{part}，压得{foe}气血翻腾。', mp: 85, cd: 2, hits: 2, dmg: [115, 145], acc: 0.75, fx: [{ kind: 'weaken', value: 15, rounds: 2 }] }
    ]
  },
  {
    id: 'tq_yuxiao', name: '玉箫剑法', grade: '上品', category: '剑法', school: '桃花岛', nature: '柔', reach: '短',
    desc: '桃花岛剑法。以箫喻剑，剑走音律，一招一式如奏仙乐，敌人在剑音缭绕中不知不觉已中剑。',
    learn: '桃花岛主亲传，须通晓音律',
    teach: '外门',
    requires: [{ skill: 'tq_bichao', realm: 2 }],
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
      { name: '碧海潮生', text: '你剑势忽如海潮暗涌，一浪高过一浪，{foe}心神摇曳，{part}门户洞开，被这一剑拂中。', mp: 75, cd: 1, hits: 1, dmg: [150, 185], acc: 0.78, fx: [{ kind: 'fear', value: 12 }] },
      { name: '曲终人不见', realm: 3, text: '你剑音渐低，剑光渐淡，如曲终人不见，{foe}一怔之间，寒气已随这一剑渗入{part}。', mp: 85, cd: 2, hits: 1, dmg: [200, 280], acc: 0.8, fx: [{ kind: 'chill', rounds: 2 }] }
    ]
  },
  {
    id: 'tq_xinfa', name: '全真心法', grade: '良品', category: '内功', school: '全真', nature: '阳',
    desc: '全真教入门心法。气沉丹田，抱元守一，是先天功与玄门剑术共同的根基。',
    learn: '全真教入门心法，弟子出家第一课',
    teach: '入门',
    passive: [{ kind: 'guard', value: 8 }]
  },
  {
    id: 'tq_sanhua', name: '三花聚顶掌', grade: '良品', category: '掌法', school: '全真', nature: '中正', reach: '徒手',
    desc: '全真掌法，取三花聚顶之意。掌力自丹田透掌心，打人带着一股道门的清正之气，受者气血归位，伤痛也轻了几分。',
    learn: '全真教入门掌法，与心法同修',
    teach: '入门',
    moves: [
      { name: '三花初聚', text: '你气凝掌心，三掌次第推出，如三花初聚，次第落在{foe}{part}。', wound: '瘀伤' },
      { name: '五气朝元', text: '你五指微张，掌带五气，绵绵推向{foe}{part}。', wound: '瘀伤' },
      { name: '玉炉烧药', text: '你掌力如玉炉烧药，文火慢攻，烘得{foe}{part}气血自暖。', wound: '瘀伤' },
      { name: '周天自转', text: '你掌势如周天运转，一圈复一圈，圈圈不离{foe}{part}。', wound: '瘀伤', realm: 2 },
      { name: '金丹初成', text: '你掌心一实，如金丹初成，一掌沉甸甸地打在{foe}{part}。', wound: '瘀伤', realm: 3 },
      { name: '道法圆通', text: '你掌势圆转如意，化开{foe}来势，反手抚其{part}，抚处气血归位。', wound: '内伤', realm: 4 }
    ],
    performs: [
      { name: '三花聚顶', text: '你三掌聚于一点按落，掌上清正之气渗入{foe}{part}，替{foe}把翻腾的气血理顺了。', mp: 30, cd: 2, hits: 1, dmg: [85, 115], acc: 0.78, fx: [{ kind: 'heal', value: 30 }] }
    ]
  },
  {
    id: 'tq_quanzhen', name: '全真剑法', grade: '上品', category: '剑法', school: '全真', nature: '中正', reach: '短',
    desc: '全真教玄门正宗剑法。剑势端凝厚重，堂堂之阵，正正之旗，越练越见根基，与玉女素心剑法相配更是天作之合。',
    learn: '全真教入门剑法，人人得授',
    teach: '外门',
    requires: [{ skill: 'tq_xinfa', realm: 2 }],
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
      { name: '天罡北斗', text: '你踏位连刺，七剑环攻如北斗环列，其中一剑封住{foe}手脚，困在阵中动弹不得。', mp: 50, cd: 2, hits: 2, dmg: [70, 95], acc: 0.75, fx: [{ kind: 'busy', rounds: 1, chance: 0.5 }] },
      { name: '浪迹天涯', realm: 3, text: '你一剑浪迹而出，人随剑走，剑光缠人如藤，{foe}手腕被剑圈一绞，兵刃几乎拿捏不住。', mp: 70, cd: 2, hits: 1, dmg: [210, 280], acc: 0.8, fx: [{ kind: 'busy', rounds: 1, chance: 0.4 }] }
    ],
    combos: [{ with: 'tq_suxin', name: '双剑合璧', bonus: 8, text: '你与同伴各使一路剑法，一刚一柔，一全真一古墓，两剑竟似心意相通，互补破绽，端的是天衣无缝。' }]
  },
  {
    id: 'tq_tonggui', name: '同归剑法', grade: '绝品', category: '剑法', school: '全真', nature: '中正', reach: '短',
    desc: '全真教绝险剑法。不计自身，只攻敌人要害，剑剑都是与敌同归于尽的打法，未出剑先有三分慑人之势。',
    learn: '全真教压箱的剑法，非死志不能施展',
    teach: '内门',
    requires: [{ skill: 'tq_quanzhen', realm: 4 }],
    moves: [
      { name: '有去无回', text: '你一剑递出便不收回，剑势有去无回，直取{foe}{part}。', wound: '刺伤' },
      { name: '破釜沉舟', text: '你弃了门户，双手握剑全力贯下，剑势如破釜沉舟，直取{foe}{part}。', wound: '刺伤' },
      { name: '孤注一掷', text: '你把周身劲力都压上这一剑，孤注一掷，剑走的就是{foe}想不到的地方。', wound: '刺伤' },
      { name: '背水列阵', text: '你退到无可再退，剑势反而大盛，背水列阵，逼住{foe}{part}。', wound: '割伤', realm: 2 },
      { name: '燃眉当锋', text: '你眉间一点煞气，剑随念走，燃眉之际当锋而进，直刺{foe}{part}。', wound: '刺伤', realm: 3 },
      { name: '玉碎之志', text: '你剑势决绝，宁为玉碎，一剑之烈，震得{foe}手上先软了三分。', wound: '内伤', realm: 4 }
    ],
    performs: [
      { name: '同归于尽', text: '你不顾{foe}兵刃及体，一剑直进，先一步刺在{foe}{part}——这份不要命的打法，谁不心寒。', mp: 45, cd: 2, hits: 1, dmg: [170, 230], acc: 0.75, fx: [{ kind: 'fear', value: 15 }] }
    ]
  },
  {
    id: 'tq_xiantian', name: '先天功', grade: '神品', category: '内功', school: '全真', nature: '阳',
    desc: '全真祖师所创无上内功。先天地而生，浑然无极，练成之后真气生生不息，护体疗伤皆是一等一。',
    learn: '全真祖师嫡传，历代掌教单传',
    teach: '真传',
    requires: [{ skill: 'tq_xinfa', realm: 5 }],
    passive: [{ kind: 'guard', value: 14 }, { kind: 'heal', value: 6 }]
  },
  {
    id: 'tq_jinyan', name: '金雁功', grade: '上品', category: '轻功', school: '全真', nature: '中正',
    desc: '全真教轻功。一纵数丈，凌空如雁翔，落地悄无声息，是玄门弟子入门的根基功夫。',
    learn: '全真教入门轻功，弟子共习',
    teach: '外门',
    passive: [{ kind: 'haste', value: 10 }]
  },
  {
    id: 'tq_gumuxinfa', name: '古墓心法', grade: '良品', category: '内功', school: '古墓', nature: '阴',
    desc: '古墓派入门心法。寒玉床上练出来的内息，至阴至静，人在暗处久了，耳目身法都比常人伶俐。',
    learn: '古墓派入门心法，入门先睡寒玉床',
    teach: '入门',
    passive: [{ kind: 'haste', value: 8 }]
  },
  {
    id: 'tq_yunvjian', name: '玉女剑法', grade: '良品', category: '剑法', school: '古墓', nature: '柔', reach: '短',
    desc: '古墓派入门剑法。剑出如玉女纤纤，轻灵绵密，两剑之间绝无停顿，是素心剑法的底子。',
    learn: '古墓派入门剑法，与天罗地网势同修',
    teach: '入门',
    moves: [
      { name: '玉女投梭', text: '你身形一窜，剑如投梭，直线刺向{foe}{part}。', wound: '刺伤' },
      { name: '天孙织锦', text: '你剑光往来如织，经纬细密，把{foe}{part}罩进剑网里。', wound: '刺伤' },
      { name: '素女掬水', text: '你剑势轻捧，如素女掬水，剑锋兜住{foe}{part}一带一切。', wound: '割伤' },
      { name: '皓腕玉镯', text: '你手腕翻转如皓腕戴镯，剑绕腕一匝，划向{foe}{part}。', wound: '割伤', realm: 2 },
      { name: '锦瑟无端', text: '你剑音轻颤，如锦瑟无端五十弦，弦弦暗指{foe}{part}。', wound: '刺伤', realm: 3 },
      { name: '弄玉吹箫', text: '你剑随身转，如弄玉吹箫，箫声剑影里一剑斜刺{foe}{part}。', wound: '刺伤', realm: 4 }
    ],
    performs: [
      { name: '双燕穿柳', text: '你双剑影一前一后如双燕穿柳，两剑都落在{foe}{part}，轻快得叫人吃惊。', mp: 40, cd: 2, hits: 2, dmg: [60, 85], acc: 0.78 }
    ]
  },
  {
    id: 'tq_tianluo', name: '天罗地网势', grade: '良品', category: '掌法', school: '古墓', nature: '柔', reach: '徒手',
    desc: '古墓派入门掌法。掌影撒开如天罗地网，麻雀从网里都飞不出去，何况刀剑拳脚。',
    learn: '古墓派入门掌法，在拿麻雀篓捉麻雀的活计里练成',
    teach: '入门',
    moves: [
      { name: '天罗初张', text: '你双掌撒开，掌影如天罗初张，罩向{foe}{part}。', wound: '瘀伤' },
      { name: '地网暗结', text: '你掌力贴地下压，如地网暗结，绊得{foe}下盘发沉。', wound: '瘀伤' },
      { name: '麻雀难飞', text: '你掌圈收小再收小，{foe}腾挪几次，{part}终究撞在掌上。', wound: '瘀伤' },
      { name: '网开一面', text: '你故留一面空当，{foe}抢着钻出，正撞上候在网口的另一掌。', wound: '瘀伤', realm: 2 },
      { name: '重帘遮月', text: '你双掌交叠如重帘遮月，把{foe}的视线和去路一并遮住。', wound: '瘀伤' },
      { name: '收网擒雀', text: '你掌力骤然收拢，如收网擒雀，把{foe}连兵带掌一齐缚住，伤其{part}。', wound: '瘀伤', realm: 3 },
    ],
    performs: [
      { name: '天罗地网', text: '你掌影层层收拢，两掌一合如收网，{foe}连挡带避还是着了两掌。', mp: 50, cd: 2, hits: 2, dmg: [70, 95], acc: 0.75 }
    ]
  },
  {
    id: 'tq_yunv', name: '玉女心经', grade: '上品', category: '内功', school: '古墓', nature: '阴',
    desc: '古墓派内功秘要。须二人同修，真气绵绵若存，练成之后身轻如燕，动作如风，最善腾挪闪避。',
    learn: '古墓派内密，须与同门共修',
    teach: '内门',
    requires: [{ skill: 'tq_gumuxinfa', realm: 3 }],
    passive: [{ kind: 'haste', value: 13 }],
    combos: [{ with: 'tq_suxin', name: '素心同修', bonus: 4, text: '你以玉女心经真气催发素心剑意，身随剑走，剑随心动，轻灵更胜平日。', fx: [{ kind: 'haste', value: 10 }] }]
  },
  {
    id: 'tq_suxin', name: '玉女素心剑法', grade: '上品', category: '剑法', school: '古墓', nature: '柔', reach: '短',
    desc: '古墓派剑法，本为双修而设。招名皆取闺阁情事，一招一式缠绵蕴藉，须与全真剑法相互呼应方得大成。',
    learn: '古墓派秘传，须两人合练',
    teach: '内门',
    requires: [{ skill: 'tq_yunvjian', realm: 3 }, { skill: 'tq_yunv', realm: 2 }],
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
      { name: '花前月下', text: '你剑光如月色倾泻，绵绵一剑裹着绵绵一剑，教{foe}在花月温柔里着了道，{part}血线悄然渗出。', mp: 65, cd: 1, hits: 1, dmg: [150, 195], acc: 0.78 },
      { name: '西窗夜话', realm: 3, text: '你剑光忽敛忽吐，如剪烛夜话，低声絮絮，{foe}心神恍惚，寒气已随两剑渗入{part}。', mp: 85, cd: 2, hits: 2, dmg: [105, 140], acc: 0.78, fx: [{ kind: 'chill', rounds: 2 }] }
    ],
    combos: [{ with: 'tq_quanzhen', name: '双剑合璧', bonus: 8, text: '你与同伴各使一路剑法，一柔一刚，一古墓一全真，两剑意趣相合，破绽互为掩映，身法也轻快了几分。', fx: [{ kind: 'haste', value: 8 }] }]
  },
  {
    id: 'tq_yufengzhen', name: '玉蜂针', grade: '绝品', category: '绝技', school: '古墓', nature: '阴',
    desc: '古墓派暗器绝技。细针以玉蜂尾毒淬炼，打出细如牛毛，中者奇痒入骨，纵是高手也须静卧数日。',
    learn: '古墓派镇派暗器，须玉女心经大成',
    teach: '真传',
    requires: [{ skill: 'tq_yunv', realm: 4 }],
    ult: {
      title: '玉蜂针 · 杀招',
      text: '你袖袍一拂，一片细如牛毛的玉蜂针激射而出，针针带着蜂毒！{foe}挥袖格挡，针还是从袖影缝隙里钻了进去，不过片刻，奇痒入骨，坐立皆难。',
      dmg: [360, 430],
      fx: [{ kind: 'poison', value: 12, rounds: 4 }]
    }
  }
];

const pack: ContentPack = { skills: SKILLS };
export default pack;
