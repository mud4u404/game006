import type { ContentPack, SkillDef } from '../types';

/** 武学库：旁门左道（星宿、白驼山、五毒教、血刀门，Issue #27，门派改造 Issue #63） */

const SKILLS: SkillDef[] = [
  {
    id: 'xm_fushi', name: '腐尸功', grade: '良品', category: '内功', school: '星宿', nature: '阴',
    desc: '星宿派入门内功。以腐尸毒气淬炼真气，气味当然不好闻，练成后掌上带毒，是抽髓掌的根基。',
    learn: '星宿派入门内功，新入门先与毒尸同室',
    teach: '入门',
    passive: [{ kind: 'guard', value: 8 }]
  },
  {
    id: 'xm_sanyin', name: '三阴蜈蚣爪', grade: '良品', category: '爪法', school: '星宿', nature: '阴', reach: '徒手',
    desc: '星宿派入门爪法。指爪淬过蜈蚣毒，抓人如百足爬过，伤口不大，毒性却顺着爪痕往里钻。',
    learn: '星宿派入门爪法，与腐尸功同修',
    teach: '入门',
    moves: [
      { name: '蜈蚣百足', text: '你五指如百足蜈蚣，一路抓挠过去，尽往{foe}{part}招呼。', wound: '毒伤' },
      { name: '钩魂索魄', text: '你指爪微钩，钩住{foe}{part}一撕，毒随爪入。', wound: '毒伤' },
      { name: '三阴叉手', text: '你双手三阴脉俱开，爪影叉错而至，挠向{foe}{part}。', wound: '毒伤' },
      { name: '蜈蚣钻缝', text: '你爪走缝隙，专钻{foe}招架不到的空当，一爪挠在{part}。', wound: '毒伤', realm: 2 },
      { name: '毒爪撩阴', text: '你矮身撩爪，反手向上，{foe}急退时{part}已被抓出血痕。', wound: '毒伤', realm: 3 },
      { name: '百足钩魂', text: '你五指如百足钩魂，钩住{foe}{part}一撕，毒随爪入，痛入骨髓。', wound: '毒伤', realm: 6 }
    ],
    performs: [
      { name: '蜈蚣百足', text: '你爪影连抓数下，爪爪带毒，{foe}{part}上现出几道发黑的抓痕。', mp: 45, cd: 1, hits: 1, dmg: [90, 120], acc: 0.78, fx: [{ kind: 'poison', value: 8, rounds: 2, chance: 0.5 }] }
    ]
  },
  {
    id: 'xm_chousui', name: '抽髓掌', grade: '上品', category: '掌法', school: '星宿', nature: '阴', reach: '徒手',
    desc: '星宿派阴毒掌法。掌力阴寒，专拔人精气，中者初时不觉，片刻后寒毒入髓，悔之晚矣。',
    learn: '星宿派嫡传，师徒名分分毫不让',
    teach: '外门',
    requires: [{ skill: 'xm_sanyin', realm: 2 }],
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
      { name: '阴风蚀骨', text: '你一掌拍实，寒毒顺劲直透{foe}{part}，伤口泛出青黑，隐隐发麻。', mp: 75, cd: 1, hits: 1, dmg: [135, 185], acc: 0.78, fx: [{ kind: 'poison', value: 10, rounds: 3 }] },
      { name: '抽髓夺魄', realm: 3, text: '你双掌连环拍出，掌掌阴毒，{foe}连受两掌，寒毒入体，面色青白，四肢渐不听使唤。', mp: 85, cd: 2, hits: 2, dmg: [115, 155], acc: 0.75, fx: [{ kind: 'poison', value: 15, rounds: 3 }] },
      { name: '化功抽髓', text: '你一掌拍上{foe}{part}，掌力吸人精气，反手又把毒气渡了回去——里外都是你的好处。', mp: 20, cd: 2, hits: 1, dmg: [90, 130], acc: 0.78, fx: [{ kind: 'drain', value: 20 }, { kind: 'poison', value: 8, rounds: 2, chance: 0.4 }] }
    ]
  },
  {
    id: 'xm_zhaixing', name: '摘星功', grade: '上品', category: '轻功', school: '星宿', nature: '中正',
    desc: '星宿派轻功。身形飘忽，凌空摘星，一个起落已在数丈之外，落处全无征兆，教人摸不准路数。',
    learn: '星宿派弟子共习，进阶须师门点头',
    teach: '外门',
    requires: [{ skill: 'xm_fushi', realm: 2 }],
    passive: [{ kind: 'haste', value: 12 }]
  },
  {
    id: 'xm_huagong', name: '化功大法', grade: '绝品', category: '内功', school: '星宿', nature: '阴',
    desc: '星宿派镇派奇功。真气一运，将敌手攻来的内力尽数化解，中者真气涣散，苦练多年的功力一朝尽废。',
    learn: '星宿派秘传，非掌门弟子不授',
    teach: '真传',
    requires: [{ skill: 'xm_fushi', realm: 3 }, { skill: 'xm_chousui', realm: 3 }],
    passive: [{ kind: 'guard', value: 14 }],
    combos: [{ with: 'xm_chousui', name: '星宿同源', bonus: 5, text: '你以化功真气催动掌上毒劲，敌手接掌之际，内力被丝丝缕缕抽来为我所用。', fx: [{ kind: 'guard', value: 10 }] }]
  },
  {
    id: 'xm_baituo', name: '白驼心法', grade: '良品', category: '内功', school: '白驼山', nature: '刚',
    desc: '白驼山入门内功。西域的路子，气走刚猛，练的是一副蓄得住力的筋骨，为蛤蟆功打底。',
    learn: '白驼山入门心法，弟子自幼修习',
    teach: '入门',
    passive: [{ kind: 'rage', value: 5 }]
  },
  {
    id: 'xm_shentuo', name: '神驼雪山掌', grade: '良品', category: '掌法', school: '白驼山', nature: '刚', reach: '徒手',
    desc: '白驼山入门掌法。掌势如神驼行雪山，看着慢，蹄子落下来一步一个坑，藏的全是蓄好的劲。',
    learn: '白驼山入门掌法，弟子共习',
    teach: '入门',
    moves: [
      { name: '雪山初霁', text: '你双掌平平推出，如雪山初霁后的第一缕日光，拍在{foe}{part}。', wound: '瘀伤' },
      { name: '神驼踏雪', text: '你踏步进掌，如神驼踏雪，一步一掌，步步都在{foe}{part}上。', wound: '瘀伤' },
      { name: '大漠孤烟', text: '你单掌竖起直进，如大漠孤烟，又直又沉，顶在{foe}{part}。', wound: '内伤' },
      { name: '雪岭双峰', text: '你双掌一错，如雪岭双峰夹击，挤得{foe}{part}无处可让。', wound: '瘀伤', realm: 2 },
      { name: '寒驼卧雪', text: '你身形矮伏，掌自下而上掀，如寒驼卧雪，掀在{foe}{part}。', wound: '内伤', realm: 3 },
      { name: '神驼震岳', text: '你双掌倾力压落，如神驼震岳，{foe}立足之地都跟着一颤。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '神驼震岳', text: '你双掌压到底忽然发力，一掌震得{foe}{part}发麻，心口也突突直跳。', mp: 40, cd: 1, hits: 1, dmg: [95, 125], acc: 0.75, fx: [{ kind: 'fear', value: 8, chance: 0.4 }] }
    ]
  },
  {
    id: 'xm_hama', name: '蛤蟆功', grade: '绝品', category: '掌法', school: '白驼山', nature: '刚', reach: '徒手',
    desc: '白驼山绝技。出手前蹲身蓄势，喉中咯咯作响，如老蟾蓄势，一旦发难，一击之力山摇地动。',
    learn: '白驼山嫡传，须自幼打底熬练筋骨',
    teach: '真传',
    requires: [{ skill: 'xm_baituo', realm: 4 }, { skill: 'xm_shentuo', realm: 3 }],
    moves: [
      { name: '老蟾伏地', text: '你屈身下蹲，双掌拢于胸前，气蕴脊背，如老蟾伏地，蓄势不发。', wound: '内伤' },
      { name: '昂首鼓气', text: '你喉中咯咯作响，气随声发，双掌一昂推出，拍向{foe}{part}。', wound: '瘀伤' },
      { name: '灵蟾扑月', text: '你欺身扑进，双掌如蟾扑月，全力拍向{foe}{part}。', wound: '瘀伤' },
      { name: '蓄势待扑', text: '你沉腰坐马，劲力一点一点攒起，{foe}进退之间，你猛然发难，轰其{part}。', wound: '内伤', realm: 2 },
      { name: '气撼山河', text: '你一声闷喝，气劲随声暴发，如蛙鸣震池，震荡{foe}{part}。', wound: '内伤', realm: 3 },
      { name: '金蟾戏水', text: '你身形矮处，双掌平推，掌力贴地掀起，如金蟾戏水，直撞{foe}{part}。', wound: '瘀伤', realm: 4 },
      { name: '蟾宫折桂', text: '你腾身跃起，自上而下一掌劈落，如蟾宫折桂，直取{foe}{part}。', wound: '瘀伤', realm: 5 },
      { name: '气吞日月', text: '你毕生功力凝于一击，双掌缓缓推出，如气吞日月，{foe}避无可避，硬受{part}这一记。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '蓄势待扑', text: '你蹲身蓄劲，忽然暴起，双掌全力扑出，一击之力带着闷雷般的轰响，砸向{foe}{part}！', mp: 75, cd: 1, hits: 1, dmg: [190, 245], acc: 0.78, fx: [{ kind: 'fear', value: 10 }] },
      { name: '蛤蟆吐功', realm: 3, text: '你喉中咕的一声，毕生功力自掌心喷薄而出，一击如山崩，{foe}气血翻涌，胆气先怯了三分。', mp: 70, cd: 3, hits: 1, dmg: [330, 400], acc: 0.75, fx: [{ kind: 'fear', value: 20 }] }
    ],
    combos: [{ with: 'xm_lingshe', name: '白驼绝艺', bonus: 4, text: '你掌上蛤劲与杖上蛇毒相济，刚猛中藏着阴毒，{foe}躲得开掌风，躲不开毒气。', fx: [{ kind: 'rage', value: 5 }] }]
  },
  {
    id: 'xm_lingshe', name: '灵蛇杖法', grade: '上品', category: '杖法', school: '白驼山', nature: '阴', reach: '长',
    desc: '白驼山杖法。杖头养蛇，杖走蛇势，一杖点出如灵蛇噬人，杖影里更藏着毒信，防不胜防。',
    learn: '白驼山嫡传，杖上蛇蜕须自家喂养',
    teach: '外门',
    requires: [{ skill: 'xm_shentuo', realm: 2 }],
    moves: [
      { name: '灵蛇出洞', text: '你杖头一颤，如灵蛇出洞，直点{foe}{part}。', wound: '刺伤' },
      { name: '毒蛇吐信', text: '你杖尖连点，一吐即收，如毒蛇吐信，急啄{foe}{part}。', wound: '刺伤' },
      { name: '枯藤缠蛇', text: '你杖身横扫再绞，如枯藤缠蛇，绞住{foe}兵刃，反抽其{part}。', wound: '割伤' },
      { name: '白蟒翻身', text: '你杖尾一挑，杖头自下而上翻身撩起，如白蟒翻身，撞向{foe}{part}。', wound: '砸伤', realm: 2 },
      { name: '蛇盘七寸', text: '你杖走连环，圈圈相套，如蛇盘七寸，末了一点正中{foe}{part}。', wound: '内伤', realm: 3 },
      { name: '群蛇乱舞', text: '你杖影纷飞，两路杖影夹着杖上毒蛇齐出，{foe}拆了一路，{part}躲不过另一路。', wound: '刺伤', realm: 4 },
      { name: '长蛇吞象', text: '你大开大合，杖势狂放，如长蛇吞象，硬撼{foe}{part}。', wound: '砸伤', realm: 5 },
      { name: '万蛇归洞', text: '你杖尖抖出漫天杖影，如万蛇归洞，齐齐涌向{foe}{part}。', wound: '毒伤', realm: 6 }
    ],
    performs: [
      { name: '毒蛇吐信', text: '你杖尖一抖，杖头毒蛇倏然弹射而出，一口咬向{foe}{part}，毒牙见血。', mp: 70, cd: 1, hits: 1, dmg: [120, 170], acc: 0.78, fx: [{ kind: 'poison', value: 12, rounds: 3 }] },
      { name: '群蛇乱舞', realm: 3, text: '你杖法大开，杖头毒蛇倾巢而出，两路齐攻，{foe}{part}连中数下，又痛又麻。', mp: 70, cd: 2, hits: 2, dmg: [115, 155], acc: 0.75, fx: [{ kind: 'poison', value: 10, rounds: 2 }] }
    ]
  },
  {
    id: 'xm_yangdu', name: '五毒养身功', grade: '良品', category: '内功', school: '五毒教', nature: '阴',
    desc: '五毒教入门内功。以百毒淬体，毒气养身，练的是以毒养身、越毒越韧的路子，寻常毒物反伤不得。',
    learn: '五毒教入门内功，入门先饲五毒',
    teach: '入门',
    passive: [{ kind: 'heal', value: 5 }]
  },
  {
    id: 'xm_yinshe', name: '银蛇鞭', grade: '良品', category: '鞭法', school: '五毒教', nature: '阴', reach: '长',
    desc: '五毒教入门鞭法。鞭身淬过蛇毒，银亮亮的鞭影里裹着毒，抽上一下，半边身子都跟着发麻。',
    learn: '五毒教入门鞭法，弟子共习',
    teach: '入门',
    moves: [
      { name: '银蛇吐信', text: '你长鞭抖直，鞭梢一点毒光，如银蛇吐信，点向{foe}{part}。', wound: '割伤' },
      { name: '毒痕点点', text: '你鞭梢连点，毒痕点点落在{foe}{part}，沾上就发麻。', wound: '瘀伤' },
      { name: '鞭风缠腕', text: '你鞭身绕腕一缠一带，毒气顺着鞭风扑向{foe}{part}。', wound: '瘀伤' },
      { name: '银蛇缠腰', text: '你长鞭横卷，如银蛇缠腰，抽得{foe}{part}火辣辣地疼。', wound: '割伤', realm: 2 },
      { name: '毒雨潇潇', text: '你鞭梢挑起鞭身毒液，如毒雨潇潇洒落，淋向{foe}{part}。', wound: '瘀伤', realm: 3 },
      { name: '银蛇归洞', text: '你长鞭抖直收回，鞭梢收势带割，如银蛇归洞，割过{foe}{part}。', wound: '割伤', realm: 6 }
    ],
    performs: [
      { name: '银蛇淬毒', text: '你长鞭连抽数下，鞭上蛇毒随鞭痕渗入，{foe}{part}青肿渐起。', mp: 45, cd: 1, hits: 1, dmg: [90, 120], acc: 0.78, fx: [{ kind: 'poison', value: 8, rounds: 2, chance: 0.5 }] }
    ]
  },
  {
    id: 'xm_duzhu', name: '毒蛛掌', grade: '良品', category: '掌法', school: '五毒教', nature: '阴', reach: '徒手',
    desc: '五毒教入门掌法。掌心养着毒蛛，一掌按出，蛛涎随掌而落，沾上便是一层毒。',
    learn: '五毒教入门掌法，掌心养蛛',
    teach: '入门',
    moves: [
      { name: '毒蛛结网', text: '你双掌连挥，掌力如毒蛛结网，罩向{foe}{part}。', wound: '毒伤' },
      { name: '蛛行七步', text: '你步走蛛行七步，绕到{foe}侧后，一掌按其{part}。', wound: '瘀伤' },
      { name: '蛛涎浸掌', text: '你掌心蛛涎一浸，一掌拍实，毒涎渗入{foe}{part}。', wound: '毒伤' },
      { name: '毒雾掌心', text: '你掌心毒雾一吐，{foe}近身格挡，{part}便浸在毒雾里。', wound: '毒伤', realm: 2 },
      { name: '蛛门八锁', text: '你八掌连环如蛛门八锁，锁住{foe}四方，{part}尤受一掌。', wound: '瘀伤', realm: 3 },
      { name: '蛛毒攻心', text: '你掌上蛛毒尽注一按，{foe}{part}发黑，毒气攻心。', wound: '毒伤', realm: 6 }
    ],
    performs: [
      { name: '蛛涎掌', text: '你一掌拍上{foe}{part}，蛛涎随掌印渗入，{foe}奇痒入骨，挠也不是挠不得也不是。', mp: 45, cd: 1, hits: 1, dmg: [90, 120], acc: 0.78, fx: [{ kind: 'poison', value: 8, rounds: 2, chance: 0.5 }] }
    ]
  },
  {
    id: 'xm_jinchan', name: '金蚕蛊掌', grade: '上品', category: '掌法', school: '五毒教', nature: '阴', reach: '徒手',
    desc: '五毒教进阶掌法。以金蚕蛊淬掌，掌力带蛊，蛊随心走，中掌的人，蛊毒跟着他的气血往心口爬。',
    learn: '五毒教进阶掌法，须先养熟金蚕蛊',
    teach: '外门',
    requires: [{ skill: 'xm_yinshe', realm: 2 }, { skill: 'xm_duzhu', realm: 2 }],
    moves: [
      { name: '金蚕吐丝', text: '你掌力如金蚕吐丝，细细密密缠向{foe}{part}。', wound: '毒伤' },
      { name: '蛊烟瘴雨', text: '你双掌拂动，蛊烟瘴雨般洒落，尽沾{foe}{part}。', wound: '毒伤' },
      { name: '金蚕蚀骨', text: '你一掌按实，蛊毒如金蚕蚀骨，直往{foe}{part}深处钻。', wound: '毒伤' },
      { name: '蛊随心走', text: '你掌力随心驱蛊，{foe}躲到东，蛊往东追，{part}躲无可躲。', wound: '毒伤', realm: 2 },
      { name: '万蛊噬心', text: '你万蛊齐发，尽数咬向{foe}心脉，{part}痛入骨髓。', wound: '毒伤', realm: 3 },
      { name: '金蛊天降', text: '你双掌高举，蛊毒如金蛊天降，密密落在{foe}{part}。', wound: '毒伤', realm: 4 }
    ],
    performs: [
      { name: '金蚕蛊', text: '你一掌印在{foe}{part}，金蚕蛊随掌力渡入，蛊毒顺着气血往心口爬。', mp: 55, cd: 1, hits: 1, dmg: [105, 145], acc: 0.78, fx: [{ kind: 'poison', value: 12, rounds: 3 }] }
    ]
  },
  {
    id: 'xm_qianzhu', name: '千蛛万毒手', grade: '绝品', category: '手法', school: '五毒教', nature: '阴', reach: '徒手',
    desc: '五毒教阴毒手法。以毒功灌注指力，中者初时无痛无痒，毒发时却如万蚁噬骨，求医都难。',
    learn: '五毒教秘传，非教中亲信不授',
    teach: '真传',
    requires: [{ skill: 'xm_yangdu', realm: 4 }, { skill: 'xm_jinchan', realm: 3 }],
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
      { name: '寒蛛垂露', text: '你指尖连点，数点阴毒如露滴落，尽数渗入{foe}{part}，伤口细细密密泛起黑气。', mp: 80, cd: 1, hits: 1, dmg: [155, 215], acc: 0.78, fx: [{ kind: 'poison', value: 15, rounds: 3 }] },
      { name: '万毒噬心', realm: 4, text: '你十指齐出，毒劲如附骨之疽直入{foe}{part}，{foe}面色青黑，喉头一甜，跪倒在地。', mp: 70, cd: 3, hits: 1, dmg: [240, 360], acc: 0.8, fx: [{ kind: 'poison', value: 20, rounds: 5 }] },
      { name: '以毒养身', text: '你一掌拍上{foe}{part}，渡过去的是毒，收回来的却是{foe}的血气精华，反过来养了你的身。', mp: 20, cd: 2, hits: 1, dmg: [90, 130], acc: 0.78, fx: [{ kind: 'poison', value: 10, rounds: 2 }, { kind: 'heal', value: 30 }] }
    ]
  },
  {
    id: 'xm_yinxuedao', name: '饮血刀', grade: '良品', category: '刀法', school: '血刀门', nature: '刚', reach: '短',
    desc: '血刀门入门刀法。刀一出鞘就要见血，不见血不收刀，是血刀门立门的第一条规矩。',
    learn: '血刀门入门刀法，入门先立投名状',
    teach: '入门',
    moves: [
      { name: '初试锋刃', text: '你一刀平削，初试锋刃，割向{foe}{part}。', wound: '割伤' },
      { name: '血痕点点', text: '你连刀快点，刀尖点出一片血痕，尽在{foe}{part}。', wound: '割伤' },
      { name: '刀头舔血', text: '你欺身近战，刀背贴着{foe}兵刃滑进，如刀头舔血，剜其{part}。', wound: '刺伤' },
      { name: '快刀斩麻', text: '你快刀连挥，如快刀斩乱麻，{foe}招架的空当被一一斩开。', wound: '割伤', realm: 2 },
      { name: '杀出血路', text: '你一刀开路，硬生生杀出血路，{foe}{part}挡在刀前，先着了一刀。', wound: '割伤', realm: 3 },
      { name: '血洗刀山', text: '你连人带刀撞进{foe}阵里，一刀带回一片血光，{part}血如泉涌。', wound: '割伤', realm: 6 }
    ],
    performs: [
      { name: '放血', text: '你一刀划过{foe}{part}，口子不深，血却放个不停——血刀门的刀，专讲这个讲究。', mp: 25, cd: 2, hits: 1, dmg: [95, 125], acc: 0.78, fx: [{ kind: 'bleed', value: 10, rounds: 2, chance: 0.5 }] }
    ]
  },
  {
    id: 'xm_xueyingbu', name: '血影步', grade: '良品', category: '轻功', school: '血刀门', nature: '刚',
    desc: '血刀门追杀用的轻功。血色身影一晃便到眼前，逃的人只听见背后的脚步声越来越近。',
    learn: '血刀门追杀轻功，拿投名状的头一课',
    teach: '入门',
    passive: [{ kind: 'haste', value: 8 }]
  },
  {
    id: 'xm_xuedao', name: '血刀刀法', grade: '绝品', category: '刀法', school: '血刀门', nature: '刚', reach: '短',
    desc: '血刀门镇门刀法。刀势狂野狠辣，专往血肉要害招呼，刀刀见血，刀光映着血色，如一场血雨。',
    learn: '血刀门嫡传，入门先立投名状',
    teach: '真传',
    requires: [{ skill: 'xm_yinxuedao', realm: 3 }, { skill: 'xm_xuedaojing', realm: 3 }],
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
      { name: '白刀进红刀出', text: '你一刀刺进{foe}{part}，抽刀时手腕一翻，刀锋顺势一拉，血光激射。', mp: 75, cd: 1, hits: 1, dmg: [165, 220], acc: 0.78, fx: [{ kind: 'bleed', value: 12, rounds: 3 }] },
      { name: '血海无边', realm: 3, text: '你刀光翻滚如血海掀涛，连剜带削，{foe}{part}两处刀伤血涌不止，怎么按也按不住。', mp: 90, cd: 2, hits: 2, dmg: [155, 195], acc: 0.75, fx: [{ kind: 'bleed', value: 15, rounds: 3 }] },
      { name: '饮血', text: '你贴身一连数刀，刀刀饮血——{foe}的血顺着刀槽流下来，你的刀势反倒越来越快。', mp: 45, cd: 2, hits: 1, dmg: [170, 210], acc: 0.78, fx: [{ kind: 'bleed', value: 10, rounds: 2, chance: 0.6 }] }
    ]
  },
  {
    id: 'xm_xuedaojing', name: '血刀经', grade: '上品', category: '内功', school: '血刀门', nature: '阳',
    desc: '血刀门内功。至阳至刚的路子，却练得轻快狠戾，气血一到手上，脚下生风，刀法快得邪性。',
    learn: '血刀门秘传，须与刀法同修',
    teach: '外门',
    requires: [{ skill: 'xm_chixue', realm: 2 }],
    passive: [{ kind: 'haste', value: 5 }]
  },
  {
    id: 'xm_chixue', name: '赤血功', grade: '良品', category: '内功', school: '血刀门', nature: '阳',
    desc: '血刀门入门的内功。雪地里赤着膊打坐，逼得一身热血往手脚上冲，冻不死的，人就快了。练法粗野，见效却快，正合血刀门快刀放血的路子。',
    learn: '血刀门入门内功，雪地里熬出来的',
    teach: '入门',
    passive: [{ kind: 'haste', value: 6 }]
  }
];

const pack: ContentPack = { skills: SKILLS };
export default pack;
