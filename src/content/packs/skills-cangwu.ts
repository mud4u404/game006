import type { ContentPack, SkillDef } from '../types';

/**
 * 武学库：苍梧剑派（本作原创，Issue #29）。定位：主打擒拿、副阴毒——表面中正平和，暗藏带几率的阴狠后手。
 *
 * 武学树（docs/menpai.md 第七节）：
 *   入门：守拙功（内功）、破云剑、裂石掌、登云纵
 *   外门：苍梧心法、铁骨扇（守拙功融会贯通）、停云剑法（破云剑融会贯通）
 *   真传：青崖剑法（停云剑法炉火纯青）、崩雪（青崖剑法炉火纯青）
 * 擒拿、阴毒都没有合适的内功被动（docs/menpai.md 第五节），苍梧的内功不带被动。
 */

const SKILLS: SkillDef[] = [
  {
    id: 'cw_cangwu', name: '苍梧心法', grade: '上品', category: '内功', school: '苍梧', nature: '阴',
    desc: '苍梧根基内功。明面上养的是浩然正气，行气却走阴柔一路；练到深处，真气绵密如茧，寻常刀剑难伤，触之方知厉害。',
    learn: '苍梧外门弟子共习，进境全看心性',
    teach: '外门',
    requires: [{ skill: 'cw_shouzhuo', realm: 2 }],
    combos: [{ with: 'cw_qingya', name: '青崖同气', bonus: 3, text: '你心法剑法同出一门，真气顺着剑势游走，剑光看着平和，内里一记沉似一记。' }]
  },
  {
    id: 'cw_shouzhuo', name: '守拙功', grade: '良品', category: '内功', school: '苍梧', nature: '中正',
    desc: '苍梧入门的养气功夫，取「守拙归园田」之意，讲究藏锋守拙，不露圭角。功夫浅，却是苍梧一切武功的底子：剑里要藏得住东西，先得把心事藏住。',
    learn: '苍梧入门弟子晨课所习',
    teach: '入门'
  },
  {
    id: 'cw_qingya', name: '青崖剑法', grade: '绝品', category: '剑法', school: '苍梧', nature: '中正', reach: '短',
    desc: '苍梧镇派剑法。剑势端方雍容，如君子立于青崖之上；只是招将老未老之际，往往还多出一记阴柔的后续。',
    learn: '苍梧掌门顾长风亲传，仅真传弟子可得',
    teach: '真传',
    requires: [{ skill: 'cw_tingyun', realm: 3 }],
    moves: [
      { name: '青崖立雪', text: '你长剑斜立，剑尖微垂，如崖上孤松披雪，看似不动，剑尖已暗指{foe}{part}。', wound: '刺伤' },
      { name: '云起青崖', text: '你剑随身转，卷起一片剑光，如云生崖顶，罩向{foe}{part}。', wound: '割伤' },
      { name: '苍梧引凤', text: '你剑尖轻挑，划出一道弧线，如引凤来仪，掠向{foe}{part}。', wound: '刺伤' },
      { name: '九嶷云杳', text: '你剑势忽远忽近，如云杳九嶷，{foe}辨不清虚实，{part}已着一剑。', wound: '割伤', realm: 2 },
      { name: '斑竹滴泪', text: '你剑尖连点，几点寒芒如斑竹垂泪，无声无息落在{foe}{part}。', wound: '刺伤', realm: 3 },
      { name: '湘水回澜', text: '你剑势将尽忽地一翻，如湘水回澜，卷住{foe}兵刃反撩其{part}。', wound: '内伤', realm: 4 },
      { name: '韶乐犹存', text: '你剑势忽而雍容，如闻韶乐，{foe}看得稍懈，剑光已变，直贯其{part}。', wound: '刺伤', realm: 5 },
      { name: '苍梧之野', text: '你毕生功力附剑，一剑平平递出，如苍梧之野莽莽无尽，{foe}退无可退。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '青崖立雪', text: '你一剑端端正正刺出，{foe}依着规矩拆解，却不防剑势一收一圈，{part}已被剑光缠住，半分使不上力。', mp: 55, cd: 2, hits: 1, dmg: [160, 200], acc: 0.85, fx: [{ kind: 'busy', rounds: 1, chance: 0.5 }] },
      { name: '斑竹滴泪', realm: 3, text: '你剑光连闪，几点泪痕似的创口落在{foe}{part}——当时不觉，稍顷便隐隐作痒，血也止不利索。', mp: 45, cd: 2, hits: 1, dmg: [200, 240], acc: 0.85, fx: [{ kind: 'bleed', value: 15, rounds: 3, chance: 0.6 }] }
    ]
  },
  {
    id: 'cw_tingyun', name: '停云剑法', grade: '上品', category: '剑法', school: '苍梧', nature: '柔', reach: '短',
    desc: '苍梧外门剑法，取《停云》之诗，剑势舒缓平和，与世无争。只是剑光里常裹着一点叫人不舒服的凉意。',
    learn: '苍梧外门剑法，弟子共习',
    teach: '外门',
    requires: [{ skill: 'cw_poyun', realm: 2 }],
    moves: [
      { name: '停云霭霭', text: '你长剑缓缓推出，剑光凝而不散，如停云霭霭，压向{foe}{part}。', wound: '割伤' },
      { name: '时雨濛濛', text: '你剑尖连点，细密如濛濛时雨，无声无息落在{foe}{part}。', wound: '刺伤' },
      { name: '静寄东轩', text: '你守中带攻，剑圈如静寄东轩，护住自身，兼削{foe}{part}。', wound: '割伤' },
      { name: '八表同昏', text: '你剑光四面展开，昏昏沉沉罩定{foe}，剑尖暗指其{part}。', wound: '刺伤', realm: 2 },
      { name: '平陆成江', text: '你剑势铺开如大水漫地，平陆成江，{foe}立足不稳，{part}门户洞开。', wound: '割伤', realm: 3 },
      { name: '春醪独抚', text: '你剑势闲适如独抚春醪，{foe}轻敌冒进，{part}正撞在剑锋上。', wound: '刺伤', realm: 4 },
      { name: '搔首延伫', text: '你剑招忽缓，似搔首延伫，{foe}一怔之间，剑尖已到{part}。', wound: '刺伤', realm: 5 },
      { name: '舟车靡从', text: '你连剑绵延不绝，如舟车靡从，追着{foe}{part}一路点去。', wound: '割伤', realm: 6 }
    ],
    performs: [
      { name: '八表同昏', text: '你剑光昏昏沉沉四面罩下，{foe}只觉眼前发暗，出手也慢了半拍。', mp: 65, cd: 1, hits: 1, dmg: [120, 160], acc: 0.8, fx: [{ kind: 'chill', rounds: 2, chance: 0.5 }] },
      { name: '平陆成江', realm: 3, text: '你剑势如大水漫地滚滚而来，{foe}两处受创，劲力竟似被这绵柔剑光卸去了几分。', mp: 45, cd: 2, hits: 2, dmg: [90, 110], acc: 0.75, fx: [{ kind: 'weaken', value: 12, rounds: 2, chance: 0.5 }] }
    ],
    combos: [{ with: 'cw_cangwu', name: '云雨同门', bonus: 3, text: '你以苍梧真气催动停云剑，剑光里那点凉意，比平日更渗人几分。' }]
  },
  {
    id: 'cw_lieshi', name: '裂石掌', grade: '良品', category: '掌法', school: '苍梧', nature: '刚', reach: '徒手',
    desc: '苍梧弟子拳脚。掌力开碑裂石，算是光明正大的功夫——只是掌风过处，叫人双手发麻，握不拢兵器。',
    learn: '苍梧弟子拳脚功夫，入门共习',
    teach: '入门',
    moves: [
      { name: '磐石无转', text: '你马步一沉，一掌稳稳推出，如磐石无转，实实在在拍在{foe}{part}。', wound: '砸伤' },
      { name: '苍崖积翠', text: '你双掌连拍，掌影层层叠叠，如苍崖积翠，压向{foe}{part}。', wound: '瘀伤' },
      { name: '云根初动', text: '你掌力自下而上一掀，如云根初动，震得{foe}{part}发麻。', wound: '砸伤' },
      { name: '危崖坠石', text: '你双掌高举过顶，当头劈落，如危崖坠石，直砸{foe}{part}。', wound: '砸伤', realm: 2 },
      { name: '苍苔侵阶', text: '你掌力又缓又沉，如苍苔侵阶，一点一点渗进{foe}{part}。', wound: '内伤', realm: 3 },
      { name: '石破天惊', text: '你蓄力一掌，轰然拍出，如石破天惊，{foe}气血翻腾。', wound: '内伤', realm: 4 },
      { name: '山崩川竭', text: '你连掌狂攻，掌力如山崩川竭，一浪高过一浪砸向{foe}{part}。', wound: '砸伤', realm: 5 },
      { name: '五丁开山', text: '你毕生掌力凝于双掌，如五丁开山，硬生生劈开{foe}的门户，直捣其{part}。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '石破天惊', text: '你一掌轰在{foe}{part}，声势惊人——掌力震得{foe}双手发麻，半晌握不拢拳。', mp: 40, cd: 2, hits: 1, dmg: [100, 130], acc: 0.75, fx: [{ kind: 'busy', rounds: 1, chance: 0.5 }] }
    ]
  },
  {
    id: 'cw_dengyun', name: '登云纵', grade: '良品', category: '轻功', school: '苍梧', nature: '中正',
    desc: '苍梧轻功。踏崖如履平地，据说传自采药人。落在实处轻飘飘的全不带声，叫人防不胜防。',
    learn: '苍梧轻功，采药人传下来的底子',
    teach: '入门',
    passive: [{ kind: 'haste', value: 10 }]
  },
  {
    id: 'cw_poyun', name: '破云剑', grade: '凡品', category: '剑法', school: '苍梧', nature: '中正', reach: '短',
    desc: '苍梧开蒙剑法。招式简单直白，练的是眼正手稳。不过入门第一课教的，就是剑里可以藏东西。',
    learn: '苍梧开蒙剑法，入门第一课',
    teach: '入门',
    moves: [
      { name: '云出无心', text: '你随手一剑递出，如云出无心，剑尖却已指到{foe}{part}。', wound: '刺伤' },
      { name: '云卷千峰', text: '你剑光连卷，如云卷千峰，一层层裹向{foe}{part}。', wound: '割伤' },
      { name: '拨云见日', text: '你一剑上挑，如拨云见日，直取{foe}{part}。', wound: '刺伤' },
      { name: '云破月来', text: '你剑光一晃，如云破月来，寒光恰恰落在{foe}{part}。', wound: '割伤', realm: 2 },
      { name: '风吹云散', text: '你连剑挥洒，如风吹云散，{foe}招架的门户被一片片削开。', wound: '割伤', realm: 3 },
      { name: '云散水流', text: '你剑势一去不回，如云散水流，径直贯穿{foe}{part}。', wound: '刺伤', realm: 4 },
      { name: '少年拏云', text: '你欺身抢进，剑走轻狂，如少年心事当拏云，连刺{foe}{part}。', wound: '刺伤', realm: 5 },
      { name: '云开万里', text: '你全力一剑挥出，如云开万里，剑光坦坦荡荡直落{foe}{part}。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '云出无心', text: '你随手一剑，看着平平无奇，{foe}中剑之后才觉出{part}上一丝麻痒——入门第一课，剑里可以藏东西。', mp: 50, cd: 1, hits: 1, dmg: [90, 120], acc: 0.75, fx: [{ kind: 'poison', value: 5, rounds: 2, chance: 0.3 }] }
    ]
  },
  {
    id: 'cw_tiegu', name: '铁骨扇', grade: '上品', category: '奇门', school: '苍梧', nature: '阴', reach: '短',
    desc: '苍梧门中文士的装点。铁骨折扇开阖有度，扇面题的是山水，扇骨里却暗藏机簧与淬毒的细针。',
    learn: '苍梧文士装点门的功夫，外门以上可学，机簧要自家琢磨',
    teach: '外门',
    requires: [{ skill: 'cw_shouzhuo', realm: 2 }],
    moves: [
      { name: '优哉游哉', text: '你折扇慢摇，姿态闲适之极，扇沿却悄无声息磕向{foe}{part}。', wound: '瘀伤' },
      { name: '扇底风波', text: '你扇骨一翻，棱角划过{foe}{part}，扇面上山水犹在徐徐展开。', wound: '割伤' },
      { name: '开阖有度', text: '你折扇开阖，啪啪两声脆响，扇骨结结实实敲在{foe}{part}。', wound: '砸伤' },
      { name: '折袖藏锋', text: '你扇中机簧轻响，几点细针混在扇影里，直奔{foe}{part}。', wound: '刺伤', realm: 2 },
      { name: '挥扇断流', text: '你铁骨扇全力挥出，如挥扇断流，硬磕{foe}兵刃，反震其{part}。', wound: '割伤', realm: 3 },
      { name: '羽扇纶巾', text: '你谈笑间扇走轻灵，如羽扇纶巾，{foe}竟看不出这一扇是虚是实，{part}已着了一下。', wound: '内伤', realm: 4 },
      { name: '挥斥八极', text: '你扇势大开，指点挥斥如顾八极，扇影漫天裹向{foe}{part}。', wound: '割伤', realm: 5 },
      { name: '图穷匕见', text: '你扇势将老忽收，扇骨「咔」地弹开一柄短刃——图穷匕见，直刺{foe}{part}。', wound: '刺伤', realm: 6 }
    ],
    performs: [
      { name: '扇底风波', text: '你一扇拍在{foe}{part}，扇面上山水斑驳——{foe}只当受了下钝击，殊不知扇骨针里那点阴毒，已循着创口渗了进去。', mp: 55, cd: 1, hits: 1, dmg: [120, 160], acc: 0.8, fx: [{ kind: 'poison', value: 10, rounds: 3, chance: 0.4 }] },
      { name: '图穷匕见', realm: 4, text: '你扇势平平展开，忽地机簧一响，短刃出匣，直奔{foe}持兵刃的手腕——这一下藏在十成的闲适里，{foe}兵刃险险脱手。', mp: 40, cd: 2, hits: 1, dmg: [150, 190], acc: 0.85, fx: [{ kind: 'disarm', rounds: 1, chance: 0.5 }] }
    ]
  },
  {
    id: 'cw_bengxue', name: '崩雪', grade: '绝品', category: '绝技', school: '苍梧', nature: '阴',
    desc: '苍梧不传之杀招。剑势如崖顶积雪崩落，声势夺人；真正的杀机，却藏在雪浪过后的那一丝静里。',
    learn: '苍梧掌门一脉单传，须过青崖试剑',
    teach: '真传',
    requires: [{ skill: 'cw_qingya', realm: 3 }],
    ult: {
      title: '苍梧剑派 · 杀招',
      text: '你长剑插地，仰天一声清啸——青崖之上万年积雪应声而崩！白茫茫剑气如雪浪倾泻，将{foe}连人带影一并吞没；雪浪过后，{foe}只觉四肢发沉，劲力被这彻骨寒气卸去了几分。',
      dmg: [420, 500],
      fx: [{ kind: 'chill', rounds: 2 }, { kind: 'weaken', value: 12, rounds: 2, chance: 0.5 }]
    }
  }
];

const pack: ContentPack = { skills: SKILLS };
export default pack;
