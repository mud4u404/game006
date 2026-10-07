import type { ContentPack, SkillDef } from '../types';

/**
 * 武当的八门武功。文风与数值规则见 docs/wuxue.md。
 * id 一律以 wd_ 开头，避免和别的批次重名。
 */
const SKILLS: SkillDef[] = [
  {
    id: 'wd_taijishengong', name: '太极神功', grade: '绝品', category: '内功', school: '武当', nature: '中正',
    desc: '武当内功根基，取太极阴阳相生之意。行功时气走圆转，绵绵不绝，外可卸力护体，内可自愈创伤。',
    learn: '武当掌门亲传，须道心澄明',
    passive: [{ kind: 'guard', value: 10 }, { kind: 'heal', value: 7 }],
    combos: [
      { with: '门派:武当', name: '道法自然', text: '你太极神功内息圆转，与身上武当武功浑然相合，举手投足皆合自然之道。', bonus: 5 }
    ]
  },
  {
    id: 'wd_tiyunzong', name: '梯云纵', grade: '上品', category: '轻功', school: '武当', nature: '中正',
    desc: '武当轻功，步步如踏云梯，愈上愈轻。传说练成者能在崖壁间纵跃往来，如履平地。',
    learn: '武当门下弟子皆可学',
    passive: [{ kind: 'haste', value: 13 }]
  },
  {
    id: 'wd_taijiquan', name: '太极拳', grade: '绝品', category: '拳法', school: '武当', nature: '柔', reach: '徒手',
    desc: '武当绝学，以柔克刚，借力打力。拳势如环，无始无终，敌人之力愈猛，反弹愈重。',
    learn: '武当掌门亲授，须先通太极神功',
    moves: [
      { name: '揽雀尾', text: '你双手一捋，将{foe}来势引出，顺势一按，劲发{part}。', wound: '瘀伤' },
      { name: '单鞭', text: '你身形一侧，一臂横展如鞭，扫向{foe}{part}。', wound: '瘀伤' },
      { name: '云手', text: '你双手如云翻涌，一圈圈化去来势，反手拍中{foe}{part}。', wound: '瘀伤' },
      { name: '野马分鬃', text: '你两臂一开，如野马分鬃，掤劲逼向{foe}{part}。', wound: '瘀伤', realm: 2 },
      { name: '白鹤亮翅', text: '你一手上举一手下按，如白鹤亮翅，掌根击向{foe}{part}。', wound: '瘀伤', realm: 2 },
      { name: '搂膝拗步', text: '你搂膝进步，掌随身转，按向{foe}{part}。', wound: '瘀伤', realm: 3 },
      { name: '搬拦捶', text: '你搬开来势，拦腰一捶，直捣{foe}{part}。', wound: '内伤', realm: 3 },
      { name: '如封似闭', text: '你双手一封，将来劲闭于身外，沉掌按向{foe}{part}。', wound: '内伤', realm: 4 },
      { name: '海底针', text: '你俯身探手，如海底捞针，一指点向{foe}{part}。', wound: '内伤', realm: 5 }
    ],
    performs: [
      { name: '揽雀尾', text: '你双手一捋一带，将{foe}之力引偏，顺势绵掌按出，{part}受力不稳，劲力已被卸去大半。',
        mp: 65, cd: 2, hits: 1, dmg: [80, 110], acc: 0.8, fx: [{ kind: 'weaken', value: 15, rounds: 2 }, { kind: 'guard', value: 20, rounds: 2 }] },
      { name: '如封似闭', realm: 4, text: '你双手一封，如封似闭，将{foe}来势尽数化去，反手一按，掌力绵密如山，稳稳护住周身。',
        mp: 50, cd: 3, hits: 0, dmg: [10, 10], acc: 0.8, fx: [{ kind: 'weaken', value: 20, rounds: 3 }, { kind: 'guard', value: 25, rounds: 3 }] }
    ]
  },
  {
    id: 'wd_taijijian', name: '太极剑', grade: '绝品', category: '剑法', school: '武当', nature: '柔', reach: '短',
    desc: '武当剑法，剑意绵绵不绝。剑走轻灵，神在剑先，讲究以静制动、后发先至。',
    learn: '武当掌门亲授，与太极拳同修',
    moves: [
      { name: '起势', text: '你剑尖缓缓平举，剑意先到，{foe}只见一片剑光。', wound: '刺伤' },
      { name: '玉女穿梭', text: '你身形一转，一剑往来穿梭，直刺{foe}{part}。', wound: '刺伤' },
      { name: '大魁星', text: '你举剑上撩，如魁星点斗，剑锋挑向{foe}{part}。', wound: '割伤' },
      { name: '燕子抄水', text: '你剑势贴地一掠，如燕子抄水，划过{foe}{part}。', wound: '刺伤', realm: 2 },
      { name: '海底捞月', text: '你剑自下盘捞起，剑光如月，削向{foe}{part}。', wound: '割伤', realm: 2 },
      { name: '宿鸟投林', text: '你一剑直送，如宿鸟投林，奔赴{foe}{part}。', wound: '刺伤', realm: 3 },
      { name: '金鸡独立', text: '你独立提膝，剑势一沉，点向{foe}{part}。', wound: '割伤', realm: 3 },
      { name: '迎风掸尘', text: '你剑走轻灵，如迎风掸尘，拂过{foe}{part}。', wound: '刺伤', realm: 4 },
      { name: '风扫梅花', text: '你剑光洒落，如风扫梅花，片片剑影罩住{foe}{part}。', wound: '割伤', realm: 5 }
    ],
    performs: [
      { name: '玉女穿梭', text: '你身形一转，剑如穿梭往来，寒气随剑而生，{foe}{part}一凉，出招登时迟缓。',
        mp: 65, cd: 2, hits: 1, dmg: [125, 155], acc: 0.82, fx: [{ kind: 'chill', rounds: 3 }] },
      { name: '绵剑藏锋', realm: 4, text: '你剑走绵密，剑意藏而不露，连绵剑气层层裹住{foe}{part}，将其力缓缓化去。',
        mp: 70, cd: 3, hits: 1, dmg: [285, 370], acc: 0.8, fx: [{ kind: 'weaken', value: 15, rounds: 2 }] }
    ],
    combos: [
      { with: 'wd_taijiquan', name: '太极合璧', text: '你左手太极剑意绵绵，右手太极拳势圆转，剑掌相合，如环无端，{foe}无从下手。', bonus: 7 }
    ]
  },
  {
    id: 'wd_changquan', name: '武当长拳', grade: '凡品', category: '拳法', school: '武当', nature: '中正', reach: '徒手',
    desc: '武当入门拳法，招式端正，大开大合。看似寻常，却是武当武功的根基。',
    learn: '武当入门弟子皆学',
    moves: [
      { name: '起手式', text: '你立个门户，起手一拳，直取{foe}{part}。', wound: '瘀伤' },
      { name: '拗步冲拳', text: '你拗步进身，一拳冲出，正中{foe}{part}。', wound: '瘀伤' },
      { name: '弓步冲拳', text: '你弓步沉腰，长拳直出，捣向{foe}{part}。', wound: '瘀伤' },
      { name: '马步架打', text: '你马步一沉，架开来势，反手一拳打向{foe}{part}。', wound: '瘀伤', realm: 1 },
      { name: '歇步冲拳', text: '你歇步一矮，拳自低处冲出，击向{foe}{part}。', wound: '瘀伤', realm: 1 },
      { name: '提膝穿掌', text: '你提膝护身，一掌穿出，直插{foe}{part}。', wound: '瘀伤', realm: 2 },
      { name: '仆步穿掌', text: '你仆步下潜，掌随身穿，扫向{foe}{part}。', wound: '瘀伤', realm: 3 },
      { name: '虚步挑掌', text: '你虚步一点，掌自下挑起，撩向{foe}{part}。', wound: '瘀伤', realm: 4 }
    ],
    performs: [
      { name: '拗步冲拳', text: '你拗步进身，一拳冲出，拳风正打在{foe}{part}。',
        mp: 30, cd: 2, hits: 1, dmg: [90, 110], acc: 0.8 },
      { name: '弓步冲拳', text: '你弓步沉腰，长拳直出，捣向{foe}{part}。',
        mp: 30, cd: 1, hits: 1, dmg: [70, 85], acc: 0.8 }
    ]
  },
  {
    id: 'wd_mianzhang', name: '绵掌', grade: '良品', category: '掌法', school: '武当', nature: '柔', reach: '徒手',
    desc: '武当掌法，掌力绵软，后劲伤人。出手看似无力，中掌者当时不觉，过后内力自溃。',
    learn: '武当门下二三代弟子传授',
    moves: [
      { name: '绵里藏针', text: '你掌势绵软，指尖却暗藏刚劲，点向{foe}{part}。', wound: '内伤' },
      { name: '软手拂云', text: '你软手轻拂，如拂流云，掌力贴上{foe}{part}。', wound: '瘀伤' },
      { name: '云中探手', text: '你自云手间探出一掌，悄没声地按向{foe}{part}。', wound: '瘀伤' },
      { name: '柔丝缠腕', text: '你掌指如丝，缠上{foe}手腕，劲力透入{part}。', wound: '瘀伤', realm: 2 },
      { name: '暗吐内劲', text: '你掌面不动声色，内劲暗吐，直透{foe}{part}。', wound: '内伤', realm: 2 },
      { name: '绵掌推山', text: '你双掌前推，掌力绵密如山，压向{foe}{part}。', wound: '内伤', realm: 3 },
      { name: '后劲绵绵', text: '你一掌拍出，前劲方消后劲又至，叠向{foe}{part}。', wound: '内伤', realm: 4 },
      { name: '一拂千里', text: '你五指一拂，劲力遥遥送出，直伤{foe}{part}。', wound: '内伤', realm: 5 }
    ],
    performs: [
      { name: '绵里藏针', text: '你一掌轻按{foe}{part}，掌面绵软，内劲却如针暗吐，直伤脏腑。',
        mp: 75, cd: 1, hits: 1, dmg: [100, 120], acc: 0.85, fx: [{ kind: 'weaken', value: 12, rounds: 2 }] },
      { name: '后劲绵绵', realm: 5, text: '你掌力一浪接一浪，前劲未消后劲又至，{foe}{part}如陷绵絮，气力渐泄。',
        mp: 65, cd: 3, hits: 2, dmg: [100, 140], acc: 0.8, fx: [{ kind: 'weaken', value: 10, rounds: 2 }] }
    ]
  },
  {
    id: 'wd_shenmen', name: '神门十三剑', grade: '上品', category: '剑法', school: '武当', nature: '中正', reach: '短',
    desc: '武当剑法，专刺手腕神门穴。剑走偏锋，一十三剑不离腕脉，中者兵刃脱手。',
    learn: '武当剑法精要，须过三关',
    moves: [
      { name: '神门一点', text: '你剑尖一点，直取{foe}手腕神门，剑锋点到{part}。', wound: '刺伤' },
      { name: '刺腕截脉', text: '你剑走偏锋，绕过兵刃，刺向{foe}{part}。', wound: '刺伤' },
      { name: '剑挑腕脉', text: '你剑尖上挑，挑开{foe}腕脉，{part}一麻。', wound: '割伤' },
      { name: '分花拂柳', text: '你剑势一分，如分花拂柳，削向{foe}{part}。', wound: '割伤', realm: 2 },
      { name: '迎门三刺', text: '你连出三剑，剑剑不离{foe}{part}。', wound: '刺伤', realm: 2 },
      { name: '回风拂腕', text: '你回剑一拂，剑风绕腕，割向{foe}{part}。', wound: '刺伤', realm: 3 },
      { name: '剑锁双腕', text: '你剑影一合，封锁{foe}双腕，剑锋逼住{part}。', wound: '刺伤', realm: 3 },
      { name: '一点寒星', text: '你剑尖凝成一点寒星，疾点{foe}{part}。', wound: '刺伤', realm: 4 },
      { name: '十三连刺', text: '你剑光连闪，一十三剑连绵而出，尽数落在{foe}{part}。', wound: '刺伤', realm: 5 }
    ],
    performs: [
      { name: '剑锁双腕', text: '你剑影一合，锁住{foe}双腕神门，长剑一震，对手兵刃脱手飞出。',
        mp: 25, cd: 3, hits: 1, dmg: [70, 90], acc: 0.8, fx: [{ kind: 'disarm', rounds: 2 }] },
      { name: '十三连刺', realm: 5, text: '你剑光连闪，一十三剑连绵刺出，剑剑不离{foe}{part}，破绽尽露。',
        mp: 65, cd: 3, hits: 3, dmg: [90, 125], acc: 0.78, fx: [{ kind: 'break', value: 8, rounds: 1 }] }
    ]
  },
  {
    id: 'wd_zhenwu', name: '真武除魔', grade: '绝品', category: '绝技', school: '武当', nature: '中正',
    desc: '武当剑意的极致。一剑既出，真武荡魔，剑气如江河奔涌，荡尽一切邪祟。',
    learn: '武当掌门秘传，须剑意大成',
    ult: {
      title: '真武除魔 · 杀招',
      text: '你长剑指天，周身剑意如江河奔涌，忽而一剑直落——真武荡魔，剑气化作漫天寒光！{foe}邪念尽破，{part}一软，浑身气力登时溃散。',
      dmg: [450, 530],
      fx: [{ kind: 'break', value: 15, rounds: 2 }, { kind: 'weaken', value: 10, rounds: 1 }]
    }
  }
];

const pack: ContentPack = { skills: SKILLS };
export default pack;