import type { ContentPack, SkillDef } from '../types';

/** 武学库：旁门左道（星宿、白驼山、五毒教、血刀门，Issue #27） */
const SKILLS: SkillDef[] = [
  {
    id: 'xm_huagong', name: '化功大法', grade: '绝品', category: '内功', school: '星宿', nature: '阴',
    desc: '星宿派镇派奇功。真气一运，如海绵吸水，将敌手攻来的内力尽数化解，反纳入自家经脉，愈战愈厚。',
    learn: '星宿派秘传，非掌门弟子不授',
    passive: [{ kind: 'guard', value: 14 }],
    combos: [{ with: 'xm_chousui', name: '星宿同源', bonus: 5, text: '你以化功真气催动掌上毒劲，敌手接掌之际，内力被丝丝缕缕抽来为我所用。' }]
  },
  {
    id: 'xm_chousui', name: '抽髓掌', grade: '上品', category: '掌法', school: '星宿', nature: '阴', reach: '徒手',
    desc: '星宿派阴毒掌法。掌力阴寒，专拔人精气，中者初时不觉，片刻后寒毒入髓，悔之晚矣。',
    learn: '星宿派嫡传，师徒名分分毫不让',
    moves: [
      { name: '隔纱抽丝', text: '你掌力若有若无地贴上{foe}{part}，如隔纱抽丝，专拔人的精气。', wound: '内伤' },
      { name: '阴风蚀骨', text: '你一掌阴劲拍出，寒毒随劲渗入，如阴风蚀骨，直透{foe}{part}。', wound: '毒伤' },
      { name: '摄魂一掌', text: '你掌影忽闪，一掌轻飘飘印在{foe}{part}，掌力却直往骨髓里钻。', wound: '毒伤' },
      { name: '剜心蚀髓', text: '你双掌交叠一按，阴毒掌力如虫蚁啃噬，直蚀{foe}{part}。', wound: '毒伤', realm: 2 },
      { name: '腐草沾衣', text: '你掌上带毒，轻轻一拂，毒气如腐草沾衣，无声无息附上{foe}{part}。', wound: '毒伤', realm: 3 },
      { name: '白骨招魂', text: '你掌力阴寒更甚，一掌按落，如白骨招魂，{foe}{part}麻木发凉，气血渐滞。', wound: '毒伤', realm: 4 },
      { name: '阴魂不散', text: '你掌影紧随{foe}身形不散，一掌接着一掌，阴劲层层往其{part}里渗。', wound: '内伤', realm: 5 },
      { name: '夺髓摧心', text: '你十成功力的阴毒一掌印上{foe}{part}，寒毒直奔心脉，{foe}面色登时发青。', wound: '毒伤', realm: 6 }
    ],
    performs: [
      { name: '阴风蚀骨', text: '你一掌拍实，寒毒顺劲直透{foe}{part}，伤口泛出青黑，隐隐发麻。', mp: 80, cd: 1, hits: 1, dmg: [110, 150], acc: 0.78, fx: [{ kind: 'poison', value: 10, rounds: 3 }] },
      { name: '抽髓夺魄', realm: 3, text: '你双掌连环拍出，掌掌阴毒，{foe}连受两掌，寒毒入体，面色青白，四肢渐不听使唤。', mp: 100, cd: 2, hits: 2, dmg: [60, 80], acc: 0.75, fx: [{ kind: 'poison', value: 15, rounds: 3 }] }
    ]
  },
  {
    id: 'xm_zhaixing', name: '摘星功', grade: '上品', category: '轻功', school: '星宿', nature: '中正',
    desc: '星宿派轻功。身形飘忽，凌空摘星，一个起落已在数丈之外，落处全无征兆，教人摸不准路数。',
    learn: '星宿派弟子共习，进阶须师门点头',
    passive: [{ kind: 'haste', value: 12 }]
  },
  {
    id: 'xm_hama', name: '蛤蟆功', grade: '绝品', category: '掌法', school: '白驼山', nature: '刚', reach: '徒手',
    desc: '白驼山绝技。出手前蹲身蓄势，喉中咯咯作响，如老蟾蓄势，一旦发难，一击之力山摇地动。',
    learn: '白驼山嫡传，须自幼打底熬练筋骨',
    moves: [
      { name: '老蟾伏地', text: '你屈身下蹲，双掌拢于胸前，气蕴脊背，如老蟾伏地，蓄势不发。', wound: '内伤' },
      { name: '昂首鼓气', text: '你喉中咯咯作响，气随声发，双掌一昂推出，拍向{foe}{part}。', wound: '砸伤' },
      { name: '灵蟾扑月', text: '你欺身扑进，双掌如蟾扑月，全力拍向{foe}{part}。', wound: '砸伤' },
      { name: '蓄势待扑', text: '你沉腰坐马，劲力一点一点攒起，{foe}进退之间，你猛然发难，轰其{part}。', wound: '内伤', realm: 2 },
      { name: '气撼山河', text: '你一声闷喝，气劲随声暴发，如蛙鸣震池，震荡{foe}{part}。', wound: '内伤', realm: 3 },
      { name: '金蟾戏水', text: '你身形矮处，双掌平推，掌力贴地掀起，如金蟾戏水，直撞{foe}{part}。', wound: '砸伤', realm: 4 },
      { name: '蟾宫折桂', text: '你腾身跃起，自上而下一掌劈落，如蟾宫折桂，直取{foe}{part}。', wound: '砸伤', realm: 5 },
      { name: '气吞日月', text: '你毕生功力凝于一击，双掌缓缓推出，如气吞日月，{foe}避无可避，硬受{part}这一记。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '蓄势待扑', text: '你蹲身蓄劲，忽然暴起，双掌全力扑出，一击之力带着闷雷般的轰响，砸向{foe}{part}！', mp: 80, cd: 1, hits: 1, dmg: [150, 190], acc: 0.78, fx: [{ kind: 'fear', value: 10 }] },
      { name: '蛤蟆吐功', realm: 3, text: '你喉中咕的一声，毕生功力自掌心喷薄而出，一击如山崩，{foe}气血翻涌，胆气先怯了三分。', mp: 120, cd: 3, hits: 1, dmg: [180, 230], acc: 0.75, fx: [{ kind: 'fear', value: 20 }] }
    ],
    combos: [{ with: 'xm_lingshe', name: '白驼绝艺', bonus: 4, text: '你掌上蛤劲与杖上蛇毒相济，刚猛中藏着阴毒，{foe}躲得开掌风，躲不开毒气。' }]
  },
  {
    id: 'xm_lingshe', name: '灵蛇杖法', grade: '上品', category: '杖法', school: '白驼山', nature: '阴', reach: '长',
    desc: '白驼山杖法。杖头养蛇，杖走蛇势，一杖点出如灵蛇噬人，杖影里更藏着毒信，防不胜防。',
    learn: '白驼山嫡传，杖上蛇蜕须自家喂养',
    moves: [
      { name: '灵蛇出洞', text: '你杖头一颤，如灵蛇出洞，直点{foe}{part}。', wound: '刺伤' },
      { name: '毒蛇吐信', text: '你杖尖连点，一吐即收，如毒蛇吐信，急啄{foe}{part}。', wound: '刺伤' },
      { name: '枯藤缠蛇', text: '你杖身横扫再绞，如枯藤缠蛇，绞住{foe}兵刃，反抽其{part}。', wound: '割伤' },
      { name: '白蟒翻身', text: '你杖尾一挑，杖头自下而上翻身撩起，如白蟒翻身，撞向{foe}{part}。', wound: '砸伤', realm: 2 },
      { name: '蛇盘七寸', text: '你杖走连环，圈圈相套，如蛇盘七寸，末了一点正中{foe}{part}。', wound: '内伤', realm: 3 },
      { name: '群蛇乱舞', text: '你杖影纷飞，如群蛇乱舞，杖杖是虚，杖杖又都可能是实，尽指{foe}{part}。', wound: '刺伤', realm: 4 },
      { name: '长蛇吞象', text: '你大开大合，杖势狂放，如长蛇吞象，硬撼{foe}{part}。', wound: '砸伤', realm: 5 },
      { name: '万蛇归洞', text: '你杖尖抖出漫天杖影，如万蛇归洞，齐齐涌向{foe}{part}。', wound: '毒伤', realm: 6 }
    ],
    performs: [
      { name: '毒蛇吐信', text: '你杖尖一抖，杖头毒蛇倏然弹射而出，一口咬向{foe}{part}，毒牙见血。', mp: 75, cd: 1, hits: 1, dmg: [100, 140], acc: 0.78, fx: [{ kind: 'poison', value: 12, rounds: 3 }] },
      { name: '群蛇乱舞', realm: 3, text: '你杖法大开，杖头毒蛇倾巢而出，连人带杖带蛇，三路齐攻，{foe}{part}连中数下，又痛又麻。', mp: 95, cd: 2, hits: 3, dmg: [45, 61], acc: 0.75, fx: [{ kind: 'poison', value: 10, rounds: 2 }] }
    ]
  },
  {
    id: 'xm_qianzhu', name: '千蛛万毒手', grade: '绝品', category: '手法', school: '五毒教', nature: '阴', reach: '徒手',
    desc: '五毒教阴毒手法。以毒功灌注指力，中者初时无痛无痒，毒发时却如万蚁噬骨，求医都难。',
    learn: '五毒教秘传，非教中亲信不授',
    moves: [
      { name: '蛛丝暗结', text: '你五指微张，指力如蛛丝暗结，无声无息罩向{foe}{part}。', wound: '毒伤' },
      { name: '寒蛛垂露', text: '你指尖轻点，一点阴毒如寒蛛垂露，滴在{foe}{part}。', wound: '毒伤' },
      { name: '蛛网密布', text: '你双手连挥，指影如蛛网密布，{foe}四面八方都是指风，{part}尤甚。', wound: '瘀伤' },
      { name: '灵蛛擒虫', text: '你探手疾拿，如灵蛛擒虫，五指一收一拢，扣住{foe}{part}。', wound: '瘀伤', realm: 2 },
      { name: '万毒钻心', text: '你指力裹着阴毒钻入{foe}{part}，初时不觉，片刻后毒发如万蚁噬骨。', wound: '毒伤', realm: 3 },
      { name: '千丝缠腕', text: '你指力化丝，缠住{foe}手腕一带，顺势一引一送，毒劲渡入其{part}。', wound: '毒伤', realm: 4 },
      { name: '作茧缚敌', text: '你指力丝丝缕缕罩落，如作茧缚敌，{foe}{part}酸麻渐重，动转不灵。', wound: '毒伤', realm: 5 },
      { name: '万毒归宗', text: '你毕生毒功凝于十指，一按之下五毒齐发，尽注{foe}{part}。', wound: '毒伤', realm: 6 }
    ],
    performs: [
      { name: '寒蛛垂露', text: '你指尖连点，数点阴毒如露滴落，尽数渗入{foe}{part}，伤口细细密密泛起黑气。', mp: 80, cd: 1, hits: 1, dmg: [100, 140], acc: 0.78, fx: [{ kind: 'poison', value: 15, rounds: 3 }] },
      { name: '万毒噬心', realm: 4, text: '你十指齐出，毒劲如附骨之疽直入{foe}{part}，{foe}面色青黑，喉头一甜，跪倒在地。', mp: 110, cd: 3, hits: 1, dmg: [80, 120], acc: 0.8, fx: [{ kind: 'poison', value: 20, rounds: 5 }] }
    ]
  },
  {
    id: 'xm_xuedao', name: '血刀刀法', grade: '绝品', category: '刀法', school: '血刀门', nature: '刚', reach: '短',
    desc: '血刀门镇门刀法。刀势狂野狠辣，专往血肉要害招呼，刀刀见血，刀光映着血色，如一场血雨。',
    learn: '血刀门嫡传，入门先立投名状',
    moves: [
      { name: '开坛祭血', text: '你斜肩带背一刀劈落，刀势狂野，先声夺人，直奔{foe}{part}。', wound: '割伤' },
      { name: '血影飘忽', text: '你身随刀走，刀光如血影飘忽，忽左忽右，削向{foe}{part}。', wound: '割伤' },
      { name: '一刀断江', text: '你双手握刀，力劈而下，如断江截流，猛砍{foe}{part}。', wound: '砸伤' },
      { name: '血河东流', text: '你连刀横扫，刀光如血河东流，连绵不尽，冲刷{foe}{part}。', wound: '割伤', realm: 2 },
      { name: '血雨腥风', text: '你刀势大作，刀风如腥风，刀光如血雨，层层卷向{foe}{part}。', wound: '割伤', realm: 3 },
      { name: '茹毛饮血', text: '你欺身近战，短刀贴身连剜，如茹毛饮血，专往{foe}{part}要害招呼。', wound: '刺伤', realm: 4 },
      { name: '血海深仇', text: '你双目赤红，一刀重过一刀，刀刀都带着狠劲，尽落{foe}{part}。', wound: '割伤', realm: 5 },
      { name: '白刀进红刀出', text: '你一刀刺进，抽刀时刀锋一带一转，{foe}{part}登时鲜血狂涌。', wound: '割伤', realm: 6 }
    ],
    performs: [
      { name: '白刀进红刀出', text: '你一刀刺进{foe}{part}，抽刀时手腕一翻，刀锋顺势一拉，血光激射。', mp: 80, cd: 1, hits: 1, dmg: [120, 160], acc: 0.78, fx: [{ kind: 'bleed', value: 12, rounds: 3 }] },
      { name: '血海无边', realm: 3, text: '你刀光翻滚如血海掀涛，连剜带削，{foe}{part}两处刀伤血涌不止，怎么按也按不住。', mp: 105, cd: 2, hits: 2, dmg: [75, 95], acc: 0.75, fx: [{ kind: 'bleed', value: 15, rounds: 3 }] }
    ],
    combos: [{ with: 'xm_xuedaojing', name: '血刀归元', bonus: 4, text: '你以血刀经真气催动刀法，见血愈旺，越战越狂，刀势一浪高过一浪。' }]
  },
  {
    id: 'xm_xuedaojing', name: '血刀经', grade: '上品', category: '内功', school: '血刀门', nature: '阳',
    desc: '血刀门内功。至阳至刚的路子，却练得凶戾暴烈，一运功便气血翻涌，杀性大起，怒气来得比谁都快。',
    learn: '血刀门内密，须与刀法同修',
    passive: [{ kind: 'rage', value: 5 }]
  }
];

const pack: ContentPack = { skills: SKILLS };
export default pack;
