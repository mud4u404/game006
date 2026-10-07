import type { ContentPack, SkillDef } from '../types';

/**
 * 丐帮的八门武功。文风与数值规则见 docs/wuxue.md。
 * id 一律以 gb_ 开头，避免和别的批次重名。
 */
const SKILLS: SkillDef[] = [
  {
    id: 'gb_xianglong', name: '降龙十八掌', grade: '绝品', category: '掌法', school: '丐帮', nature: '刚', reach: '徒手',
    desc: '丐帮镇帮绝学，天下至刚的掌法。招式朴实无华，每一掌都含着十成力道，讲究「有余不尽」，留三分后劲，敌人越强，它越强。',
    learn: '丐帮帮主亲传，须八袋以上弟子',
    moves: [
      { name: '亢龙有悔', text: '你左腿微屈，右臂内弯，右掌划了个圆圈，呼的一声向{foe}{part}推去。', wound: '内伤' },
      { name: '见龙在田', text: '你双掌一错，掌力平平推出，如大河东流，罩住{foe}{part}。', wound: '瘀伤' },
      { name: '鸿渐于陆', text: '你身形一矮，双掌自下而上斜击，掌风扫向{foe}{part}。', wound: '瘀伤' },
      { name: '潜龙勿用', text: '你双掌虚收于胸，忽然翻掌下按，暗劲直透{foe}{part}。', wound: '内伤', realm: 2 },
      { name: '利涉大川', text: '你踏上一步，一掌如长桥横江，排山倒海般压向{foe}{part}。', wound: '内伤', realm: 2 },
      { name: '突如其来', text: '你身形一挫复起，掌势骤急，快得{foe}来不及招架，正中{part}。', wound: '瘀伤', realm: 3 },
      { name: '震惊百里', text: '你一声长啸，双掌齐出，掌风轰然如雷，震得{foe}{part}一麻。', wound: '内伤', realm: 3 },
      { name: '或跃在渊', text: '你腾身而起又骤然落下，掌力自高而下砸向{foe}{part}。', wound: '瘀伤', realm: 4 },
      { name: '密云不雨', text: '你双掌蓄势不发，掌力沉沉如积雨之云，压得{foe}透不过气。', wound: '内伤', realm: 5 },
      { name: '损则有孚', text: '你先退半步卸去来势，再顺{foe}之力反手一送，掌力直透{part}。', wound: '瘀伤', realm: 5 },
      { name: '龙战于野', text: '你双掌翻飞，一刚一柔交替而出，掌影如龙血战于旷野。', wound: '内伤', realm: 7 },
      { name: '神龙摆尾', text: '你身子一转，右掌自背后横扫而出，掌风兜头罩下{foe}{part}。', wound: '瘀伤', realm: 8 }
    ],
    performs: [
      { name: '亢龙有悔', text: '你一掌推出，掌力未尽，后劲又至，一重叠一重压向{foe}{part}，正是「亢龙有悔」！',
        mp: 70, cd: 2, hits: 1, dmg: [150, 190], acc: 0.8, fx: [{ kind: 'break', value: 10, rounds: 2 }] },
      { name: '震惊百里', realm: 4, text: '你长啸声中连发两掌，掌风滚滚如雷，{foe}气血翻涌，脚下站立不稳。',
        mp: 110, cd: 4, hits: 2, dmg: [90, 120], acc: 0.75, fx: [{ kind: 'fear', value: 15 }] }
    ],
    combos: [
      { with: 'gb_dagou', name: '刚柔并济', text: '你左掌右棒，亢龙之势与打狗之巧互为表里，{foe}顾此失彼。', bonus: 5 }
    ]
  },
  {
    id: 'gb_dagou', name: '打狗棒法', grade: '绝品', category: '棍法', school: '丐帮', nature: '柔', reach: '长',
    desc: '丐帮帮主代代相传的棒法，只凭一根青竹棒。棒走轻灵，以绊、劈、缠、戳、挑、引、封、转八字为纲，专破刚猛一路。',
    learn: '丐帮帮主亲传，非帮主不得全授',
    moves: [
      { name: '绊字诀·拦路', text: '你竹棒贴地一绊，{foe}脚下一个踉跄，{part}先吃了一记。', wound: '瘀伤' },
      { name: '劈字诀·劈头', text: '你棒梢一沉，当头劈落，竹影闪处直取{foe}{part}。', wound: '砸伤' },
      { name: '缠字诀·绕树', text: '你手腕一翻，棒身如藤缠树，绕上{foe}臂膀，缠住{part}。', wound: '瘀伤' },
      { name: '戳字诀·夺杖', text: '你棒尖一点，快如蛇信，戳向{foe}{part}。', wound: '刺伤', realm: 2 },
      { name: '挑字诀·朝天', text: '你自下往上一挑，竹棒挑起{foe}{part}，使其门户大开。', wound: '瘀伤', realm: 2 },
      { name: '引字诀·入巷', text: '你故意露个破绽，引{foe}来攻，顺势一带，棒走{part}。', wound: '瘀伤', realm: 3 },
      { name: '封字诀·闭户', text: '你棒影一圈，封住{foe}进路，再进半步取{part}。', wound: '砸伤', realm: 3 },
      { name: '转字诀·如轮', text: '你棒身急转如轮，绞得{foe}兵刃脱手，棒头扫中{part}。', wound: '瘀伤', realm: 4 },
      { name: '绊字诀·横扫', text: '你抡棒横扫，棒风成片，绊倒{foe}，{part}重重着地。', wound: '砸伤', realm: 4 },
      { name: '缠字诀·叠丝', text: '你棒势一圈紧似一圈，缠得{foe}手脚俱滞，{part}受制。', wound: '瘀伤', realm: 5 },
      { name: '挑字诀·千斤', text: '你聚力一挑，四两拨千斤，将{foe}挑得立足不稳。', wound: '瘀伤', realm: 6 },
      { name: '转字诀·棒影漫天', text: '你棒影漫天，千百道竹光兜头罩下，{foe}{part}无处可避。', wound: '砸伤', realm: 7 }
    ],
    performs: [
      { name: '缠字诀', text: '你竹棒先绊后缠，一圈圈绕住{foe}手脚，{part}一麻，兵刃几乎脱手。',
        mp: 60, cd: 3, hits: 0, dmg: [10, 10], acc: 0.8, fx: [{ kind: 'busy', rounds: 1 }, { kind: 'disarm', rounds: 2 }] },
      { name: '劈字诀', text: '你棒走刚猛，当头一劈，竹影压顶，{foe}{part}如遭棒喝。',
        mp: 40, cd: 1, hits: 1, dmg: [120, 150], acc: 0.85 },
      { name: '转字诀', realm: 5, text: '你棒转如轮，连绞带打，{foe}兵刃一偏，{part}接连中棒。',
        mp: 100, cd: 4, hits: 2, dmg: [80, 100], acc: 0.8, fx: [{ kind: 'break', value: 10, rounds: 2 }] }
    ]
  },
  {
    id: 'gb_huntian', name: '混天气功', grade: '上品', category: '内功', school: '丐帮', nature: '阳',
    desc: '丐帮的内功根基，取「混元一气」之意。行功时周身暖意流转，护住心脉，任对手掌力如潮，也难伤及根本。',
    learn: '丐帮长老传授，多在污衣一脉',
    passive: [{ kind: 'guard', value: 8 }, { kind: 'heal', value: 5 }]
  },
  {
    id: 'gb_xiaoyaoyou', name: '逍遥游', grade: '良品', category: '拳法', school: '丐帮', nature: '中正', reach: '徒手',
    desc: '丐帮拳法，取《庄子·逍遥游》之意。身随意走，拳若乘风，看似闲散，实则无一处不着劲力。',
    learn: '丐帮弟子多能学到，八袋以上传其精要',
    moves: [
      { name: '鲲鹏展翅', text: '你双臂一展，拳势开阔如鲲鹏振翼，扫向{foe}{part}。', wound: '瘀伤' },
      { name: '扶摇直上', text: '你拳自下挑起，势如扶摇直上，撞向{foe}{part}。', wound: '瘀伤' },
      { name: '水击三千里', text: '你连出数拳，拳风叠涌如潮，拍击{foe}{part}。', wound: '内伤' },
      { name: '抟风九万里', text: '你借势旋身，一拳卷风而出，直贯{foe}{part}。', wound: '瘀伤', realm: 2 },
      { name: '背负青天', text: '你足下一转，一拳自上而下压落，罩住{foe}{part}。', wound: '内伤', realm: 2 },
      { name: '御风而行', text: '你身形飘忽，拳随人转，{foe}不知拳从何来，{part}已受一击。', wound: '瘀伤', realm: 3 },
      { name: '泠然善也', text: '你气定神闲，一拳轻灵点出，看似无力，正中{foe}{part}。', wound: '内伤', realm: 4 },
      { name: '天池一击', text: '你纵身而起，拳如天池击浪，狠狠砸在{foe}{part}。', wound: '瘀伤', realm: 5 }
    ],
    performs: [
      { name: '扶摇直上', text: '你身形拔起，双拳连挥，如大鹏扶摇，拳拳打向{foe}{part}。',
        mp: 40, cd: 1, hits: 2, dmg: [50, 70], acc: 0.8 },
      { name: '御风而行', text: '你拳势一变，身如御风，闪到{foe}身侧，一拳递向{part}。',
        mp: 50, cd: 2, hits: 1, dmg: [70, 90], acc: 0.8, fx: [{ kind: 'haste', value: 20, rounds: 2 }] }
    ],
    combos: [
      { with: 'gb_babu', name: '御风而游', text: '你脚下八步赶蝉，手上逍遥游走，身形飘忽，{foe}捉摸不定。', bonus: 4 }
    ]
  },
  {
    id: 'gb_lianhua', name: '莲花掌', grade: '良品', category: '掌法', school: '丐帮', nature: '柔', reach: '徒手',
    desc: '丐帮一路绵软掌法，掌势如莲瓣层叠，一瓣未落，一瓣又起。看着轻柔，掌力却已透入肌肤。',
    learn: '丐帮记名弟子亦可学，多在净衣一脉流传',
    moves: [
      { name: '莲开九品', text: '你双掌层叠拍出，掌影如莲开九品，罩向{foe}{part}。', wound: '瘀伤' },
      { name: '步步生莲', text: '你脚下轻移，掌随身走，一步一掌，印向{foe}{part}。', wound: '瘀伤' },
      { name: '莲叶承露', text: '你掌势一托，如莲叶承露，托住{foe}来势，反震{part}。', wound: '瘀伤' },
      { name: '出水芙蓉', text: '你一掌自下斜出，如芙蓉出水，掌缘削向{foe}{part}。', wound: '瘀伤', realm: 2 },
      { name: '莲心暗藏', text: '你掌面看似轻拂，掌心却暗吐内劲，直透{foe}{part}。', wound: '内伤', realm: 2 },
      { name: '拂水莲花', text: '你掌背一拂，如拂水面落花，掌风扫过{foe}{part}。', wound: '内伤', realm: 3 },
      { name: '莲台拂尘', text: '你双掌回旋，掌力绵绵不绝，将{foe}逼得连连后退。', wound: '瘀伤', realm: 4 },
      { name: '万朵莲花', text: '你掌影纷飞，如万朵莲花齐落，{foe}眼花缭乱，{part}连中数掌。', wound: '内伤', realm: 5 }
    ],
    performs: [
      { name: '莲心暗藏', text: '你一掌轻拂{foe}{part}，掌心内劲暗吐，看似绵软，实已伤及脏腑。',
        mp: 50, cd: 1, hits: 1, dmg: [90, 110], acc: 0.85, fx: [{ kind: 'weaken', value: 10, rounds: 2 }] },
      { name: '万朵莲花', realm: 4, text: '你掌影重重，如万朵莲花齐绽，{foe}分不清虚实，{part}连中三掌。',
        mp: 80, cd: 3, hits: 3, dmg: [45, 65], acc: 0.78 }
    ]
  },
  {
    id: 'gb_chansi', name: '缠丝擒拿手', grade: '良品', category: '手法', school: '丐帮', nature: '柔', reach: '徒手',
    desc: '丐帮擒拿手法，讲究以缠代打、以柔锁刚。指腕如丝，缠上便不放松，专拿人腕脉关节。',
    learn: '丐帮刑堂长老传授',
    moves: [
      { name: '缠丝绕腕', text: '你五指搭上{foe}手腕，轻轻一绕，如蚕丝缠腕。', wound: '瘀伤' },
      { name: '金丝缠臂', text: '你指腕并用，顺{foe}臂而上，缠锁其{part}。', wound: '瘀伤' },
      { name: '顺手牵羊', text: '你顺着{foe}来势一牵一带，使其身不由己撞向{part}。', wound: '瘀伤' },
      { name: '回身反锁', text: '你回身一扣，反锁{foe}{part}，令其动弹不得。', wound: '瘀伤', realm: 2 },
      { name: '擒龙拿脉', text: '你五指如钩，扣住{foe}{part}脉门，内劲一吐。', wound: '内伤', realm: 2 },
      { name: '分筋错骨', text: '你手腕一错，分{foe}{part}之筋，令其臂膀一软。', wound: '内伤', realm: 3 },
      { name: '锁喉扣腕', text: '你欺身而进，一手扣腕，一手探向{foe}{part}。', wound: '瘀伤', realm: 4 },
      { name: '反手缠丝', text: '你反手一缠，将{foe}整条臂膀缠住，顺势一送。', wound: '瘀伤', realm: 5 }
    ],
    performs: [
      { name: '缠丝锁腕', text: '你指腕如丝，一圈圈缠上{foe}腕脉，{part}一麻，再也抬不起手。',
        mp: 40, cd: 2, hits: 0, dmg: [10, 10], acc: 0.8, fx: [{ kind: 'busy', rounds: 1 }] },
      { name: '金丝缠腕', text: '你欺身扣住{foe}{part}，借力一拧，只听得骨节轻响。',
        mp: 30, cd: 1, hits: 1, dmg: [70, 90], acc: 0.85 }
    ]
  },
  {
    id: 'gb_babu', name: '八步赶蝉', grade: '良品', category: '轻功', school: '丐帮', nature: '中正',
    desc: '丐帮的轻身功夫，八步之内可赶上一只飞蝉。脚步看似踉跄如醉，实则暗合八卦方位，最擅闪避。',
    learn: '丐帮弟子多在赶路时练成',
    passive: [{ kind: 'haste', value: 10 }]
  },
  {
    id: 'gb_tianxiawugou', name: '天下无狗', grade: '绝品', category: '绝技', school: '丐帮', nature: '柔',
    desc: '打狗棒法的终极一式。棒影漫天，四面八方尽是竹光，天下恶犬无处可逃。非棒法炉火纯青者不能领悟。',
    learn: '打狗棒法练至炉火纯青后自悟',
    ult: {
      title: '打狗棒法 · 杀招',
      text: '你竹棒一抖，棒影漫天而起——四面八方的竹光同时落下，如天罗地网当头罩下！{foe}只觉{part}一麻，周身穴道已被尽数封住，再难动弹分毫。',
      dmg: [430, 500],
      fx: [{ kind: 'busy', rounds: 2 }, { kind: 'break', value: 10, rounds: 1 }]
    }
  }
];

const pack: ContentPack = { skills: SKILLS };
export default pack;