import type { ContentPack, SkillDef } from '../types';

/**
 * 武学库第一批：峨眉五门、华山五门（Issue #24）。
 *
 * 峨眉的武学树（docs/menpai.md 第七节）：
 *   入门：清音诀（内功）、截手九式
 *   外门：临济十二庄（清音诀融会贯通）、金顶绵掌（截手九式融会贯通）
 *   内门：回风拂柳剑（临济十二庄融会贯通）
 * 峨眉是迅捷加绵柔：身法、连击为主，卸力、护体为辅，不缴械。
 *
 * 华山的武学树：
 *   入门：华山心法（内功）、华山剑法
 *   外门：狂风快剑（华山剑法融会贯通）
 *   内门：紫霞神功（华山心法炉火纯青）
 *   奇遇：独孤九剑（华山剑法炉火纯青，悟性绝高；不挑内功）
 * 华山是迅捷加刚猛：身法、连击为主，破绽为辅，不用寒气。
 */
const SKILLS: SkillDef[] = [
  {
    id: 'eh_linji', name: '临济十二庄', grade: '上品', category: '内功', school: '峨眉', nature: '阴',
    desc: '峨眉临济一脉的筑基内功。以天地、心、游龙、鹤翔等十二庄法行气周天，练成后真气护体，绵绵密密，水火难侵。',
    learn: '峨眉伏虎寺传功师太亲授', teach: '外门',
    requires: [{ skill: 'eh_qingyin', realm: 2 }],
    passive: [{ kind: 'guard', value: 11 }]
  },
  {
    id: 'eh_qingyin', name: '清音诀', grade: '良品', category: '内功', school: '峨眉', nature: '柔',
    desc: '峨眉入门的吐纳功夫，传自山腰清音阁。行气时听双桥下两道溪水相击，气随水走，一呼一吸都轻了，是峨眉轻灵一路的底子。',
    learn: '峨眉入门弟子在清音阁所习', teach: '入门',
    passive: [{ kind: 'haste', value: 8 }]
  },
  {
    id: 'eh_jinding', name: '金顶绵掌', grade: '良品', category: '掌法', school: '峨眉', nature: '柔', reach: '徒手',
    desc: '峨眉金顶一脉的掌法。掌力柔中带绵，粘住敌劲再缓缓化去，招名皆取金顶佛光、云海、圣灯诸般胜景。',
    learn: '峨眉金顶一脉亲传，外门弟子方得', teach: '外门',
    requires: [{ skill: 'eh_jieshou', realm: 2 }],
    moves: [
      { name: '佛光初现', text: '你双掌一圈一按，掌力柔中含劲，如金顶佛光乍现，罩向{foe}{part}。', wound: '瘀伤' },
      { name: '云海千层', text: '你双掌连环推出，一重柔劲接一重，如云海翻涌，层层叠上{foe}{part}。', wound: '内伤' },
      { name: '圣灯照夜', text: '你掌影忽隐忽现，如暗夜圣灯，{foe}未辨虚实，{part}已着了一记。', wound: '瘀伤' },
      { name: '雷洞风雷', text: '你双掌沉腕疾拍，隐隐挟着风雷之声，拍得{foe}{part}一阵发麻。', wound: '内伤', realm: 2 },
      { name: '洗象涤尘', text: '你掌势忽缓，如池水洗象，柔劲贴着{foe}{part}渗将进去。', wound: '内伤', realm: 3 },
      { name: '舍身崖头', text: '你踏进半步，双掌自高处扑压而下，势如临崖，全力拍向{foe}{part}。', wound: '瘀伤', realm: 4 },
      { name: '接引慈航', text: '你双掌缓缓推出，掌力却后发先至，如慈航接引，按向{foe}{part}。', wound: '内伤', realm: 5 },
      { name: '万佛朝宗', text: '你双掌齐出，掌影重重叠叠，如万佛临空，一齐压向{foe}{part}。', wound: '内伤', realm: 6 },
      { name: '佛光普照', text: '你双掌外分内合，掌影如佛光普照，金顶霞光一般罩定{foe}{part}。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '佛光初现', text: '你双掌推出又收，收了再推，一重柔劲叠着一重，如佛光层层荡开，绵绵不绝地涌向{foe}{part}。', mp: 60, cd: 1, hits: 1, dmg: [115, 145], acc: 0.8 },
      { name: '三叠绵掌', realm: 2, text: '你一掌快过一掌，绵劲一叠接着一叠，{foe}卸得一重，又来一重，{part}登时吃不消。', mp: 75, cd: 2, hits: 2, dmg: [65, 85], acc: 0.8, fx: [{ kind: 'weaken', value: 15, rounds: 2 }] }
    ],
    combos: [{ with: 'eh_linji', name: '金顶佛光', text: '你掌力裹上临济真气，柔劲中透出一线暖芒，如金顶佛光，拂身不痛，痛在里子。', bonus: 3 }]
  },
  {
    id: 'eh_huifeng', name: '回风拂柳剑', grade: '上品', category: '剑法', school: '峨眉', nature: '柔', reach: '短',
    desc: '峨眉剑法。身随剑走，剑随风回，一招一式轻柔如拂柳，回风处却暗藏杀机，招名多取咏柳的诗词。',
    learn: '峨眉掌门亲传，须先练成临济十二庄', teach: '内门',
    requires: [{ skill: 'eh_linji', realm: 2 }],
    moves: [
      { name: '回风舞柳', text: '你长剑斜引，剑锋一转又回，如风过柳梢，掠向{foe}{part}。', wound: '割伤' },
      { name: '柳浪闻莺', text: '你剑尖连点，如莺穿柳浪，几点寒芒分袭{foe}{part}。', wound: '刺伤' },
      { name: '烟柳画桥', text: '你剑势朦胧，如烟笼画桥，剑尖却已递到{foe}{part}。', wound: '刺伤' },
      { name: '风回小院', text: '你手腕一抖，剑光绕身一匝，如风回小院，反撩{foe}{part}。', wound: '割伤', realm: 2 },
      { name: '柳暗花明', text: '你剑招将老忽收，斜刺里另起一剑，正奔{foe}{part}。', wound: '刺伤', realm: 3 },
      { name: '杨柳堆烟', text: '你剑光层层叠出，如柳绿堆烟，罩定{foe}{part}。', wound: '割伤', realm: 4 },
      { name: '满城风絮', text: '你身形急转，剑光如飞絮漫天，纷纷扬扬扑向{foe}{part}。', wound: '割伤', realm: 5 },
      { name: '梅子黄时雨', text: '你剑势连绵不尽，忽如黄梅时雨，密密斜斜落在{foe}{part}。', wound: '刺伤', realm: 6 }
    ],
    performs: [
      { name: '柳浪闻莺', text: '你剑光忽聚，连点七八剑，如群莺穿柳，声东击西——七八剑里只一剑着肉，正落在{foe}{part}。', mp: 70, cd: 1, hits: 1, dmg: [150, 190], acc: 0.8 },
      { name: '回风拂柳', realm: 3, text: '你剑势忽地一收，借回风之力再度拂出，剑光柔和如柳，内里却寒意侵人，{foe}{part}又麻又痛。', mp: 85, cd: 2, hits: 2, dmg: [80, 105], acc: 0.78, fx: [{ kind: 'haste', value: 15, rounds: 2 }, { kind: 'chill', rounds: 2 }] }
    ]
  },
  {
    id: 'eh_jieshou', name: '截手九式', grade: '良品', category: '手法', school: '峨眉', nature: '柔', reach: '徒手',
    desc: '峨眉护身手法。讲究后发先至，敌刃未落，我手已截。九式由浅入深，练到头可空手入白刃。',
    learn: '峨眉女尼传下的护身手法', teach: '入门',
    moves: [
      { name: '截云式', text: '你五指一翻，凌空一截，如手摘浮云，把{foe}攻来的招式截在半途。', wound: '瘀伤' },
      { name: '截燕式', text: '你侧身探手，轻轻盈盈一截，恰似掠燕剪风，搭上{foe}{part}。', wound: '瘀伤' },
      { name: '截水式', text: '你手掌一切一带，如快刀断水，截开{foe}来势，顺势拍其{part}。', wound: '瘀伤' },
      { name: '截风式', text: '你袖底翻掌，迎风一截，{foe}这一招便如撞在墙上，{part}生疼。', wound: '瘀伤', realm: 1 },
      { name: '截雪式', text: '你双手连挥，片片如截飞雪，{foe}连番攻势尽被拂开，{part}门户大开。', wound: '瘀伤', realm: 2 },
      { name: '截月式', text: '你腾身探手，如水中捞月，直拿{foe}{part}，拿住便教他使不上力。', wound: '瘀伤', realm: 3 },
      { name: '截岳式', text: '你马步一沉，双掌如截山岳，硬生生架住{foe}来势，震其{part}。', wound: '瘀伤', realm: 4 },
      { name: '截江式', text: '你双手一封一绞，如巨石截江，截断{foe}攻势，反震其{part}。', wound: '内伤', realm: 5 },
      { name: '截天式', text: '你并指如戟，向天一截，{foe}劲力未吐先被截散，{part}气血翻涌。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '顺手截脉', text: '你卖个破绽诱{foe}抢攻，手腕一翻已搭上其{part}，顺着劲路一截一按。', mp: 55, cd: 1, hits: 1, dmg: [105, 145], acc: 0.78 },
      { name: '九式归元', realm: 3, text: '你九式连环使出，末了双掌一错，快逾闪电地截向{foe}持兵的手，一拿一带，{foe}虎口一麻，劲力去了大半。', mp: 25, cd: 3, hits: 1, dmg: [90, 110], acc: 0.8, fx: [{ kind: 'weaken', value: 15, rounds: 2 }] }
    ]
  },
  {
    id: 'eh_zixia', name: '紫霞神功', grade: '上品', category: '内功', school: '华山', nature: '阳',
    desc: '华山内功之最，气宗嫡传。行功时面泛紫气，如紫气东来，绵绵不绝；真气蓄得越足，后劲越是雄浑，战意也一段段涨起来。',
    learn: '华山气宗嫡传，历代只传掌门弟子', teach: '内门',
    requires: [{ skill: 'eh_huashanxinfa', realm: 3 }],
    passive: [{ kind: 'rage', value: 5 }]
  },
  {
    id: 'eh_huashanxinfa', name: '华山心法', grade: '良品', category: '内功', school: '华山', nature: '中正',
    desc: '华山入门的吐纳功夫，剑宗、气宗分家以前便有。不求真气雄厚，只练一口气提得起、沉得下：气提得起，脚下才轻，剑才快得起来。',
    learn: '华山入门弟子早课所习', teach: '入门',
    passive: [{ kind: 'haste', value: 8 }]
  },
  {
    id: 'eh_huashan', name: '华山剑法', grade: '良品', category: '剑法', school: '华山', nature: '中正', reach: '短',
    desc: '华山派入门剑法。中正平和，堂堂正正，后来剑宗气宗分途，这门根基剑法却是两宗同源的。',
    learn: '华山入门弟子人人得授', teach: '入门',
    moves: [
      { name: '白云出岫', text: '你长剑平递，一招「白云出岫」，剑尖直取{foe}{part}，堂堂正正。', wound: '刺伤' },
      { name: '有凤来仪', text: '你剑光一敛复张，自下而上斜挑，如凤展翅，撩向{foe}{part}。', wound: '割伤' },
      { name: '苍松迎客', text: '你横剑当胸，剑势舒展如松枝迎客，护住中门，兼削{foe}{part}。', wound: '割伤' },
      { name: '金雁横空', text: '你纵身前跃，长剑横扫，如金雁掠空，斩向{foe}{part}。', wound: '割伤', realm: 2 },
      { name: '白虹贯日', text: '你蓄力一剑，笔直刺出，剑光如白虹贯日，径取{foe}{part}。', wound: '刺伤', realm: 3 },
      { name: '天绅倒悬', text: '你自上而下一剑劈落，如瀑布倒悬，势道沉猛，直压{foe}{part}。', wound: '割伤', realm: 4 },
      { name: '无边落木', text: '你连剑挥洒，剑叶纷飞，如无边落木萧萧而下，尽落向{foe}{part}。', wound: '割伤', realm: 5 },
      { name: '萧史乘龙', text: '你剑随身走，腾跃如乘龙，一剑快似一剑，绕袭{foe}{part}。', wound: '刺伤', realm: 6 }
    ],
    performs: [
      { name: '有凤来仪', text: '你一招「有凤来仪」，剑光自下而上翩然撩起，凤翅般的剑影罩向{foe}{part}，你身随剑起，步法也跟着轻灵起来。', mp: 70, cd: 1, hits: 1, dmg: [110, 150], acc: 0.8, fx: [{ kind: 'haste', value: 10, rounds: 2 }] },
      { name: '白虹贯日', realm: 3, text: '你气随剑走，一剑刺出，剑光凝如白虹，隐隐透出嗡嗡之声，直贯{foe}{part}。', mp: 75, cd: 2, hits: 1, dmg: [130, 175], acc: 0.78, fx: [{ kind: 'break', value: 15, rounds: 2 }] }
    ],
    combos: [{ with: 'eh_zixia', name: '紫霞剑气', text: '你真气一转，面泛紫气，紫霞内力透上剑尖，剑光隐隐带紫，又添三分威势。', bonus: 4 }]
  },
  {
    id: 'eh_kuangfeng', name: '狂风快剑', grade: '上品', category: '剑法', school: '华山', nature: '刚', reach: '短',
    desc: '华山剑宗快剑。一剑快似一剑，如狂风骤起卷地而来，敌人未看清招式，剑光已到面门。',
    learn: '华山剑宗在中条山自创的一路，私授门下', teach: '外门',
    requires: [{ skill: 'eh_huashan', realm: 2 }],
    moves: [
      { name: '风起青萍', text: '你手腕一抖，剑尖颤出嗡嗡急响，如风起青萍之末，刺向{foe}{part}。', wound: '刺伤' },
      { name: '疾风劲草', text: '你借着前招之势一剑回削，剑未老而劲已至，割向{foe}{part}。', wound: '割伤' },
      { name: '长风万里', text: '你抢上半步，一剑直进，剑风扑面，如长风万里，直指{foe}{part}。', wound: '刺伤' },
      { name: '朔风怒号', text: '你剑交左手疾挥，剑啸呜呜如朔风怒号，绕袭{foe}{part}。', wound: '割伤', realm: 2 },
      { name: '狂飙卷地', text: '你身形贴地一旋，剑走下盘，如狂飙卷地，横扫{foe}{part}。', wound: '割伤', realm: 3 },
      { name: '风卷残云', text: '你连剑卷出，一剑快似一剑，如风卷残云，裹住{foe}{part}。', wound: '割伤', realm: 4 },
      { name: '追风逐电', text: '你身随剑走，疾进数步，连人带剑化作一道电光，直奔{foe}{part}。', wound: '刺伤', realm: 5 },
      { name: '罡风蔽日', text: '你全力挥剑，剑气激荡成罡，漫天剑光罩下，蔽住{foe}{part}。', wound: '割伤', realm: 6 }
    ],
    performs: [
      { name: '风起青萍', text: '你剑尖一颤，嗡的一声轻啸，快剑已递到{foe}{part}——快得连伤口都是迟一步才渗出血来。', mp: 65, cd: 1, hits: 1, dmg: [140, 180], acc: 0.8, fx: [{ kind: 'bleed', value: 8, rounds: 3, chance: 0.5 }] },
      { name: '快剑连环', realm: 2, text: '你长剑连挥，一剑快过一剑，前后三剑一气呵成，剑剑不离{foe}{part}，快得只余一片光幕。', mp: 85, cd: 2, hits: 3, dmg: [75, 100], acc: 0.8, fx: [{ kind: 'bleed', value: 10, rounds: 2 }] }
    ]
  },
  {
    id: 'eh_dugu', name: '独孤九剑', grade: '神品', category: '剑法', school: '华山', nature: '中正', reach: '短',
    desc: '前代剑魔独孤求败所创。重意不重招，无招胜有招，料敌机先，后发先至，九式可破尽天下武功。',
    learn: '华山剑宗隐世前辈口传心授，悟性绝高者自悟', teach: '奇遇',
    requires: [{ skill: 'eh_huashan', realm: 3 }], needAttr: { 悟性: 31 }, roots: ['任意'],
    moves: [
      { name: '总诀式', text: '你随手一剑，看似全无章法，却暗藏三百六十般变化，点向{foe}{part}。', wound: '刺伤' },
      { name: '破剑式', text: '你剑尖斜挑，专找{foe}剑招空隙，轻轻一点，便教长剑使不圆转。', wound: '刺伤' },
      { name: '破刀式', text: '你剑走轻灵，不架不封——对手若使刀，便抢在刀势未老前刺其{part}；使别的，一样照破。', wound: '刺伤' },
      { name: '破枪式', text: '你侧身贴进，避开长兵锋头——若是枪，便让过枪尖；剑锋顺势一掠，割向{foe}{part}。', wound: '割伤', realm: 1 },
      { name: '破鞭式', text: '你看准{foe}短兵旧力已尽——无论是鞭是锏——一剑楔入，直取其{part}。', wound: '刺伤', realm: 2 },
      { name: '破索式', text: '你剑走连环，对手若使软兵，便专截来路；绞不开也缠得住，顺势点其{part}。', wound: '刺伤', realm: 3 },
      { name: '破掌式', text: '你剑圈隐隐罩住{foe}周身，他双掌未递，{part}已在你剑尖之下。', wound: '刺伤', realm: 4 },
      { name: '破箭式', text: '你手腕连抖，剑花洒出——暗器来了便纷纷拨落，没有暗器，这一剑反手仍奔{foe}{part}。', wound: '刺伤', realm: 5 },
      { name: '破气式', text: '你凝神静气，剑随意走，一剑递出，直破{foe}护体真气，伤其{part}。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '料敌机先', text: '你凝神观敌，{foe}招式未出，破绽先露，你后发先至，一剑点到{foe}{part}。', mp: 85, cd: 1, hits: 1, dmg: [210, 280], acc: 0.85, fx: [{ kind: 'break', value: 10, rounds: 2 }] },
      { name: '无招胜有招', realm: 5, text: '你随手挥洒，全无定式，{foe}却处处受制，{part}破绽大开，这一剑正落在破绽最深处。', mp: 80, cd: 3, hits: 1, dmg: [200, 275], acc: 0.82, fx: [{ kind: 'break', value: 30, rounds: 3 }] }
    ]
  }
];

const pack: ContentPack = { skills: SKILLS };
export default pack;
