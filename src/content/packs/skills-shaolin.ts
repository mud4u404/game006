import type { ContentPack, SkillDef } from '../types';

/**
 * 少林的八门武功。文风与数值规则见 docs/wuxue.md。
 * id 一律以 sl_ 开头，避免和别的批次重名。修订版（Issue #53）：句式重写、考据订正、描写与机制对齐。
 */
const SKILLS: SkillDef[] = [
  {
    id: 'sl_yijinjing', name: '易筋经', grade: '神品', category: '内功', school: '少林', nature: '中正',
    desc: '少林镇寺之宝，达摩祖师所传。行功时周身气血如江河奔涌，外可护体，内可疗伤，是天下内功的根基之一。',
    learn: '少林方丈亲传，寺中禁地参修',
    passive: [{ kind: 'guard', value: 12 }, { kind: 'heal', value: 8 }],
    combos: [
      { with: 'sl_ranmu', name: '刀禅一体', text: '你易筋经真气透入刀身，燃木刀的热力更烈，刀锋未至，灼意已先侵人。', bonus: 5, fx: [{ kind: 'guard', value: 8 }] }
    ]
  },
  {
    id: 'sl_yiwei', name: '一苇渡江', grade: '上品', category: '轻功', school: '少林', nature: '中正',
    desc: '少林轻功，取达摩一苇渡江之意。身轻如苇，踏水不沉，练到深处，来去只在一念之间。',
    learn: '少林达摩院首座传授',
    passive: [{ kind: 'haste', value: 13 }]
  },
  {
    id: 'sl_luohan', name: '罗汉拳', grade: '凡品', category: '拳法', school: '少林', nature: '刚', reach: '徒手',
    desc: '少林入门拳法，一招一式规矩端严，如十八罗汉列阵。看似朴素，却是少林武功的根脚。',
    learn: '少林入门武僧皆学',
    moves: [
      { name: '罗汉伏虎', text: '你沉肩坐马，一拳自腰际击出，如罗汉降虎，正捣在{foe}{part}。', wound: '瘀伤' },
      { name: '罗汉合掌', text: '你双拳合拢又分，如僧人合十行礼，礼未行完，双拳已撞上{foe}{part}。', wound: '瘀伤' },
      { name: '童子拜佛', text: '你合掌一拜，拜到一半双拳下沉，{foe}只道你在行礼，{part}已吃了结实的一撞。', wound: '瘀伤' },
      { name: '黑熊反背', text: '你反背横摆，如黑熊挥臂，扇得{foe}{part}一阵发懵。', wound: '瘀伤', realm: 1 },
      { name: '罗汉探海', text: '你矮身探臂，一拳自下撩起，{foe}招上不防下，{part}着了个正着。', wound: '瘀伤', realm: 1 },
      { name: '罗汉撞钟', text: '你肩背一耸，全身之力涌向拳面，{foe}如被铜钟迎面撞上，踉跄退开。', wound: '瘀伤', realm: 2 },
      { name: '翻江倒海', text: '你双拳翻搅，拳风一浪接一浪，{foe}气血被搅得翻腾。', wound: '内伤', realm: 3 },
      { name: '朝天一炷香', text: '你并指如香，直上再落，一指正点{foe}{part}。', wound: '瘀伤', realm: 4 }
    ],
    performs: [
      { name: '罗汉伏虎', text: '你沉肩坐马，一拳捣出，拳风沉沉，{foe}抬臂硬接，整条手臂都震麻了。',
        mp: 45, cd: 1, hits: 1, dmg: [90, 110], acc: 0.8 },
      { name: '罗汉撞钟', realm: 2, text: '你肩背一耸，全身之力撞上{foe}{part}，如撞铜钟——{foe}招架的手臂震得发麻，门户露出老大空当。',
        mp: 35, cd: 2, hits: 1, dmg: [95, 130], acc: 0.8, fx: [{ kind: 'break', value: 5, rounds: 1 }] }
    ]
  },
  {
    id: 'sl_weituo', name: '韦陀掌', grade: '良品', category: '掌法', school: '少林', nature: '刚', reach: '徒手',
    desc: '少林掌法，取护法韦陀之意。掌势沉厚，一招推出，如金刚怒目，正大刚猛。',
    learn: '少林达摩院传中级弟子',
    moves: [
      { name: '韦陀托杵', text: '你双掌上托，如韦陀托杵，把{foe}来势整个托偏。', wound: '瘀伤' },
      { name: '金刚推山', text: '你双掌齐推，掌力如山，{foe}连人带架被推得倒退。', wound: '瘀伤' },
      { name: '力士开山', text: '你踏进半步，掌根吐劲，如力士开山，劈在{foe}{part}。', wound: '瘀伤' },
      { name: '韦陀伏魔', text: '你掌势一沉，按在{foe}{part}上不动声色，暗劲已透进去三分。', wound: '内伤', realm: 2 },
      { name: '怒目金刚', text: '你双目一睁，喝声未起掌先到，一掌猛击{foe}{part}。', wound: '瘀伤', realm: 2 },
      { name: '韦陀献杵', text: '你双掌合十复分，如韦陀献杵，掌缘切在{foe}{part}。', wound: '内伤', realm: 3 },
      { name: '降魔大力', text: '你双臂一圈一压，掌力如磨盘缓缓碾转，{foe}{part}越抵越沉。', wound: '瘀伤', realm: 4 },
      { name: '韦陀护法', text: '你双掌外分内合，掌影如护法金身立在{foe}面前，{part}尽在掌下。', wound: '内伤', realm: 5 }
    ],
    performs: [
      { name: '金刚推山', text: '你双掌齐推，掌力如山压来，{foe}{part}受力不住，门户大开。',
        mp: 65, cd: 1, hits: 1, dmg: [110, 130], acc: 0.85, fx: [{ kind: 'break', value: 8, rounds: 1 }] },
      { name: '韦陀护法', realm: 3, text: '你双掌外分，掌影如金身护法笼罩四野，{foe}心头一凛，{part}连中两掌。',
        mp: 65, cd: 3, hits: 2, dmg: [105, 140], acc: 0.8, fx: [{ kind: 'fear', value: 10 }] }
    ],
    combos: [
      { with: 'sl_luohan', name: '金刚合击', text: '你罗汉拳刚猛，韦陀掌沉厚，两般少林拳掌相合，{foe}难以招架。', bonus: 5 }
    ]
  },
  {
    id: 'sl_nianhua', name: '拈花指', grade: '绝品', category: '指法', school: '少林', nature: '柔', reach: '徒手',
    desc: '少林七十二绝技之一，取世尊拈花、迦叶微笑之意。指力轻灵，举重若轻，一点之下暗劲透骨。',
    learn: '少林般若堂参悟七十二绝技',
    moves: [
      { name: '拈花一笑', text: '你两指轻捻，如拈花一笑，指风点向{foe}{part}。', wound: '瘀伤' },
      { name: '一指禅', text: '你并指一点，快得只剩一道细痕，直取{foe}{part}——七十二绝技里最朴素的一式。', wound: '瘀伤' },
      { name: '指上生莲', text: '你指尖轻颤，指影如莲瓣层叠，{foe}数不清点向何处，{part}已着一记。', wound: '瘀伤' },
      { name: '天花乱坠', text: '你指影四散纷落，如天花乱坠，虚虚实实皆奔{foe}{part}。', wound: '内伤', realm: 2 },
      { name: '一指点玄', text: '你一指点出，凝而不发，{foe}摆好架势等了半晌，暗劲却已透进{part}。', wound: '内伤', realm: 2 },
      { name: '落花无声', text: '你落指无声，{foe}尚未察觉，{part}已中招，半边身子热了起来。', wound: '内伤', realm: 3 },
      { name: '顽石点头', text: '你一指点处，如生公说法，{foe}格挡的手臂竟被引得偏开，{part}门户自开。', wound: '内伤', realm: 4 },
      { name: '万法归一', text: '你指影散尽，只余平平一指，千钧之力尽在其中，点向{foe}{part}。', wound: '内伤', realm: 5 }
    ],
    performs: [
      { name: '拈花点穴', text: '你指如拈花，轻轻拂过{foe}腕上，指力一透，{foe}气血立时滞住。',
        mp: 20, cd: 3, hits: 1, dmg: [10, 15], acc: 0.8, fx: [{ kind: 'busy', rounds: 2 }, { kind: 'weaken', value: 10, rounds: 2 }] },
      { name: '顽石点头', realm: 4, text: '你屈指连弹，指风铮铮如木鱼急敲，{foe}{part}接连中招，破绽大露。',
        mp: 70, cd: 3, hits: 2, dmg: [150, 190], acc: 0.8, fx: [{ kind: 'break', value: 10, rounds: 2 }] }
    ]
  },
  {
    id: 'sl_ranmu', name: '燃木刀法', grade: '绝品', category: '刀法', school: '少林', nature: '阳', reach: '短',
    desc: '少林七十二绝技之一。刀锋所过，木毫不伤，刀上热力却已透入木纹，从里往外燃起来。练至化境，刀未及身而热气已至。',
    learn: '少林七十二绝技，须过木人巷',
    moves: [
      { name: '燃木取火', text: '你刀锋掠过廊柱，木面无损，柱心却已焦黑——刀上热力尽数逼向{foe}{part}。', wound: '灼伤' },
      { name: '刀光如焰', text: '你舞刀成圈，刀光如焰腾腾，卷向{foe}{part}。', wound: '割伤' },
      { name: '薪尽火传', text: '你刀势一沉复起，余劲绵延，烙在{foe}{part}。', wound: '灼伤' },
      { name: '赤焰横空', text: '你一刀横斩，刀气赤红，如烈焰横空，扫过{foe}{part}。', wound: '灼伤', realm: 2 },
      { name: '烈火燎原', text: '你连劈数刀，刀气如火四下蔓延，{foe}退无可退，{part}被燎得焦痛。', wound: '灼伤', realm: 3 },
      { name: '焚木成灰', text: '你刀势一收一放，刀气骤烈，直欲焚{foe}{part}成灰。', wound: '灼伤', realm: 3 },
      { name: '火树银花', text: '你刀光四散，如火树银花迸射，罩住{foe}{part}。', wound: '灼伤', realm: 4 },
      { name: '燎原之势', text: '你刀气层层叠加，如野火燎原，压向{foe}{part}。', wound: '灼伤', realm: 5 }
    ],
    performs: [
      { name: '燃木焚天', text: '你一刀劈出，刀气赤烈如焰，灼上{foe}{part}，衣发俱焦。',
        mp: 70, cd: 2, hits: 1, dmg: [170, 205], acc: 0.8, fx: [{ kind: 'burn', value: 20, rounds: 3 }] },
      { name: '焚木成灰', realm: 4, text: '你连挥数刀，刀气交织如火网，{foe}{part}无处可避，皮肉为之焦灼。',
        mp: 70, cd: 3, hits: 2, dmg: [145, 185], acc: 0.78, fx: [{ kind: 'burn', value: 15, rounds: 2 }, { kind: 'break', value: 8, rounds: 2 }] }
    ]
  },
  {
    id: 'sl_fengmo', name: '疯魔杖法', grade: '上品', category: '杖法', school: '少林', nature: '刚', reach: '长',
    desc: '少林杖法，人杖合一，杖势颠狂如醉。看似散乱，实则招招藏着杀机，令人防不胜防。',
    learn: '少林达摩院传，须戒律精严',
    moves: [
      { name: '疯魔乱舞', text: '你杖势大开大合，如疯魔乱舞，杖影罩得{foe}无处转身。', wound: '砸伤' },
      { name: '醉打山门', text: '你脚步踉跄，杖却笔直捣出，正撞{foe}{part}。', wound: '砸伤' },
      { name: '杖扫千军', text: '你抡杖横扫，杖风成片扫过，{foe}跳起避开上盘，落地仍被杖梢扫中{part}。', wound: '砸伤' },
      { name: '疯魔落月', text: '你杖自上而下斜斜压落，如落月西沉，盖向{foe}{part}。', wound: '砸伤', realm: 2 },
      { name: '倒挂金钩', text: '你身形一翻，杖自身后反撩，勾向{foe}{part}。', wound: '砸伤', realm: 2 },
      { name: '狂风卷地', text: '你杖走连环，杖风如狂风卷地，逼向{foe}{part}。', wound: '砸伤', realm: 3 },
      { name: '疯魔伏虎', text: '你杖头下压，如疯魔伏虎，重重按在{foe}{part}。', wound: '砸伤', realm: 4 },
      { name: '一杖擎天', text: '你聚力举杖，一杖擎天而起——落下来的时候，天似乎都矮了半截，正压{foe}{part}。', wound: '砸伤', realm: 5 }
    ],
    performs: [
      { name: '疯魔狂啸', text: '你杖走颠狂，一声狂啸，杖影乱舞，{foe}心神一乱，{part}已中一杖。',
        mp: 55, cd: 2, hits: 1, dmg: [145, 185], acc: 0.8, fx: [{ kind: 'fear', value: 18 }] },
      { name: '一杖擎天', realm: 4, text: '你举杖擎天，一杖落、一杖起，两杖连环砸下，{foe}门户被打得大开。',
        mp: 65, cd: 3, hits: 2, dmg: [115, 150], acc: 0.78, fx: [{ kind: 'break', value: 10, rounds: 2 }] }
    ]
  },
  {
    id: 'sl_shizihou', name: '狮子吼', grade: '绝品', category: '绝技', school: '少林', nature: '刚',
    desc: '佛门正宗吼功，一声长啸，声震屋瓦，百兽辟易。内力愈深，吼声愈远，可乱人心神。',
    learn: '少林般若堂秘传，须内力深厚',
    ult: {
      title: '狮子吼 · 杀招',
      text: '你丹田一沉，张口一声长啸——吼声如万千狮子齐鸣，滚滚而出，声震屋瓦！{foe}心神俱裂，耳中嗡鸣不止，双膝一软当堂跪倒，兵刃拄地才撑住身子。',
      dmg: [500, 560],
      fx: [{ kind: 'fear', value: 20 }, { kind: 'break', value: 10, rounds: 1 }]
    }
  }
];

const pack: ContentPack = { skills: SKILLS };
export default pack;
