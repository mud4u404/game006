import type { ContentPack, SkillDef } from '../types';

/** 武学库：明教、日月神教、姑苏慕容、铁掌帮（Issue #28） */
const SKILLS: SkillDef[] = [
  {
    id: 'mr_qiankun', name: '乾坤大挪移', grade: '神品', category: '内功', school: '明教', nature: '中正',
    desc: '明教镇教神功。道理在激发自身潜力，牵引挪移敌劲，四两拨千斤，敌招愈猛，化解愈奇。',
    learn: '明教光明顶秘道石壁遗谱',
    passive: [{ kind: 'guard', value: 15 }],
    combos: [{ with: 'mr_shenghuo', name: '圣火乾坤', bonus: 4, text: '你以乾坤心法牵引圣火令的诡异招路，敌招方出便被挪偏三分，越打越是顺遂。' }]
  },
  {
    id: 'mr_shenghuo', name: '圣火令武功', grade: '绝品', category: '奇门', school: '明教', nature: '阳', reach: '短',
    desc: '刻在圣火令上的波斯武功，招式古怪诡谲，全然不合中原武学的路数，教人无从捉摸。',
    learn: '明教圣火令原件，唯教中高层得见',
    moves: [
      { name: '熊熊圣火', text: '你令刃翻飞，招势如烈焰腾起，扫向{foe}{part}。', wound: '割伤' },
      { name: '焚我残躯', text: '你不顾自身门户，连招抢攻，招招搏命，直取{foe}{part}。', wound: '割伤' },
      { name: '波斯胡舞', text: '你身形拧转如胡旋舞，令刃自怪异角度撩出，割向{foe}{part}。', wound: '割伤' },
      { name: '圣火燎原', text: '你双令齐出，招招连环，如圣火燎原，烧向{foe}{part}。', wound: '割伤', realm: 2 },
      { name: '掌中圣火', text: '你令刃贴掌藏招，欺近突发，一记怪招直奔{foe}{part}。', wound: '刺伤', realm: 3 },
      { name: '光明燃灯', text: '你双令交剪，剪出一片火光，罩向{foe}{part}。', wound: '割伤', realm: 4 },
      { name: '胡旋幻影', text: '你急旋如胡舞，幻出数道身影，令影纷飞，尽刺{foe}{part}。', wound: '刺伤', realm: 5 },
      { name: '焚天煮海', text: '你双令高举斜劈，招势如焚天煮海，势不可挡，直落{foe}{part}。', wound: '灼伤', realm: 6 }
    ],
    performs: [
      { name: '怪招百出', text: '你令刃忽左忽右，招式全无章法可循，{foe}两次招架都落了空，胆气先自怯了。', mp: 80, cd: 2, hits: 2, dmg: [125, 160], acc: 0.75, fx: [{ kind: 'fear', value: 12 }] },
      { name: '焚天煮海', realm: 3, text: '你双令挟着风火之势当头压落，{foe}望而生畏，手上一缓，{part}已被令锋燎中。', mp: 90, cd: 2, hits: 1, dmg: [310, 400], acc: 0.78, fx: [{ kind: 'fear', value: 20 }] }
    ]
  },
  {
    id: 'mr_xixing', name: '吸星大法', grade: '神品', category: '内功', school: '日月神教', nature: '阴',
    desc: '日月神教神功。吸人内力贮于己身，威力绝伦，只是异种真气积于经脉，隐患极深，练者不可不慎。',
    learn: '日月神教镇教神功，历代教主相传',
    passive: [{ kind: 'guard', value: 15 }],
    combos: [{ with: '门派:日月神教', name: '吸元化劲', bonus: 5, text: '你吸来的内力顺着招式绵绵渡出，敌手斗得越久气越短，你却越长。' }]
  },
  {
    id: 'mr_pixie', name: '辟邪剑法', grade: '禁品', category: '剑法', school: '日月神教', nature: '阴', reach: '短',
    desc: '福建林家辟邪剑谱，流入日月神教。快到极处，以速破敌，敌招再妙，也快不过这一剑。',
    learn: '辟邪剑谱残卷，须付非常代价',
    moves: [
      { name: '流星赶月', text: '你剑光一闪即至，如流星赶月，快得只剩残影，直刺{foe}{part}。', wound: '刺伤' },
      { name: '快雨惊风', text: '你连剑斜挥，如快雨惊风，眨眼间数剑齐落{foe}{part}。', wound: '割伤' },
      { name: '影里藏花', text: '你剑藏影里，忽前忽后，{foe}眼花之际，剑尖已点其{part}。', wound: '刺伤' },
      { name: '拨草寻蛇', text: '你剑尖急颤，如拨草寻蛇，专挑{foe}下路，疾点其{part}。', wound: '刺伤', realm: 2 },
      { name: '白驹过隙', text: '你一剑抢进又抽出，如白驹过隙，{foe}只觉{part}一凉，剑已收回。', wound: '刺伤', realm: 3 },
      { name: '紫电清霜', text: '你剑光大盛，如紫电清霜，一剑快似一剑，缠绕{foe}{part}。', wound: '割伤', realm: 4 },
      { name: '石火光中', text: '你后发先至，于电光石火间连出两剑，一虚一实，俱取{foe}{part}。', wound: '刺伤', realm: 5 },
      { name: '神龙不见首', text: '你身法剑法快到极处，{foe}只见剑光不见人，{part}已连中数剑。', wound: '刺伤', realm: 6 }
    ],
    performs: [
      { name: '电光石火', text: '你三剑一气呵成，快如电光石火，{foe}只挡开一剑，余下两剑尽数落在{part}，身法也随之一轻。', mp: 85, cd: 3, hits: 3, dmg: [105, 145], acc: 0.8, fx: [{ kind: 'haste', value: 15, rounds: 3 }] },
      { name: '鬼神莫测', realm: 4, text: '你这一剑快得全无征兆，如鬼如魅，{foe}招式使到一半便破了绽，门户大开。', mp: 60, cd: 3, hits: 1, dmg: [380, 400], acc: 0.85, fx: [{ kind: 'break', value: 20, rounds: 2 }] }
    ]
  },
  {
    id: 'mr_canhe', name: '参合指', grade: '上品', category: '指法', school: '姑苏慕容', nature: '中正', reach: '徒手',
    desc: '姑苏慕容家传指法。出自参合庄，指力隔空而发，轻描淡写间点人穴道、伤人脏腑。',
    learn: '姑苏慕容家传，外姓难得真传',
    moves: [
      { name: '凌空虚点', text: '你遥遥一指，指力离手而出，如无形细箭，直点{foe}{part}。', wound: '内伤' },
      { name: '燕山雪重', text: '你指力沉凝，一点而发，如燕山雪重，直压{foe}{part}。', wound: '砸伤' },
      { name: '白虹遥指', text: '你并指遥指，一缕指力如白虹般激射，贯穿{foe}{part}。', wound: '刺伤' },
      { name: '金台点将', text: '你拇指食指一扣一弹，指力疾射，点在{foe}{part}。', wound: '刺伤', realm: 2 },
      { name: '参合一指', text: '你凝神一指，家传指力尽注指尖，透体而入，震荡{foe}{part}。', wound: '内伤', realm: 3 },
      { name: '燕返旧都', text: '你指力吐了又收，收了又吐，如燕返旧都，往复不休，连环点其{part}。', wound: '内伤', realm: 4 },
      { name: '寒潭鹤影', text: '你指影飘忽难测，如寒潭鹤影，{foe}防不胜防，{part}又着一指。', wound: '刺伤', realm: 5 },
      { name: '王谢风流', text: '你衣袖微拂，随意一指，指力却雄浑之极，直透{foe}{part}。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '凌空虚点', text: '你遥遥虚点，指力隔空而至，{foe}只觉{part}一麻，退路已被这一指封死。', mp: 70, cd: 1, hits: 1, dmg: [155, 210], acc: 0.78 },
      { name: '以指代剑', realm: 3, text: '你一指点出，指力如剑引开{foe}劲路，顺势一带一送，{foe}劲力泄了三分，门户洞开。', mp: 75, cd: 2, hits: 1, dmg: [190, 265], acc: 0.8, fx: [{ kind: 'weaken', value: 15, rounds: 2 }] }
    ],
    combos: [{ with: 'mr_douzhuan', name: '还施彼身', bonus: 5, text: '你一指引开敌劲，顺势还施彼身，指力裹着敌手的劲路反激回去。' }]
  },
  {
    id: 'mr_douzhuan', name: '斗转星移', grade: '神品', category: '绝技', school: '姑苏慕容', nature: '中正',
    desc: '姑苏慕容氏绝技。以彼之道，还施彼身，天下各门各派的绝招，都可能被原样奉还。',
    learn: '慕容氏嫡传，须尽通百家方可参悟',
    ult: {
      title: '斗转星移 · 绝招',
      text: '你不闪不避，引{foe}来势一转，还施彼身——{foe}的全力一击竟原路而回，加倍的劲力轰在其自身{part}，天地都似为之翻转！',
      dmg: [520, 600],
      fx: [{ kind: 'weaken', value: 15, rounds: 2 }, { kind: 'break', value: 15, rounds: 2 }]
    }
  },
  {
    id: 'mr_tiezhang', name: '铁掌掌法', grade: '绝品', category: '掌法', school: '铁掌帮', nature: '刚', reach: '徒手',
    desc: '铁掌帮镇帮掌法。掌力刚猛沉雄，一掌既出，开碑裂石，江湖人称铁掌水上漂的功夫底子。',
    learn: '铁掌帮帮主亲传，须立功于帮',
    moves: [
      { name: '开碑裂石', text: '你一掌劈出，掌缘如刀，直剁{foe}{part}，势可开碑。', wound: '砸伤' },
      { name: '沉肩坠肘', text: '你沉肩坐腕，掌力层层下压，如山岳压顶，盖向{foe}{part}。', wound: '砸伤' },
      { name: '铁掌开山', text: '你大喝一声，一掌全力拍出，如铁掌开山，轰在{foe}{part}。', wound: '内伤' },
      { name: '掌断流水', text: '你一掌切落，掌力凝如铁尺，斩在{foe}{part}。', wound: '砸伤', realm: 2 },
      { name: '翻江搅海', text: '你双掌翻飞，掌力如翻江搅海，一浪高过一浪，尽压{foe}{part}。', wound: '内伤', realm: 3 },
      { name: '山摇地动', text: '你一掌顿地，借势掀起，掌力自下而上翻起，直撞{foe}{part}。', wound: '砸伤', realm: 4 },
      { name: '裂石穿云', text: '你凝劲一掌，掌风激射如箭，穿云裂石，直贯{foe}{part}。', wound: '内伤', realm: 5 },
      { name: '五岳同摧', text: '你毕生掌力凝于一掌，轰然拍落，如五岳同摧，尽付{foe}{part}。', wound: '砸伤', realm: 6 }
    ],
    performs: [
      { name: '铁掌开山', text: '你一掌全力拍出，掌力如山崩裂，{foe}硬接之下虎口崩裂，门户大敞。', mp: 85, cd: 1, hits: 1, dmg: [135, 180], acc: 0.78, fx: [{ kind: 'break', value: 15, rounds: 2 }] },
      { name: '一掌破壁', realm: 3, text: '你看准{foe}招式旧力已尽，一掌破壁而入，直捣{part}，{foe}防线登时全面洞开。', mp: 85, cd: 2, hits: 1, dmg: [210, 290], acc: 0.8, fx: [{ kind: 'break', value: 20, rounds: 2 }] }
    ]
  },
  {
    id: 'mr_shuishangpiao', name: '水上漂', grade: '上品', category: '轻功', school: '铁掌帮', nature: '中正',
    desc: '铁掌帮轻功。蹬萍渡水，踏浪而行，论在水上施展，江湖中无出其右。',
    learn: '铁掌帮帮主亲传，须立功于帮',
    passive: [{ kind: 'haste', value: 13 }]
  }
];

const pack: ContentPack = { skills: SKILLS };
export default pack;
