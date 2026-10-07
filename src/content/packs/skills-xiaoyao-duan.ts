import type { ContentPack, SkillDef } from '../types';

/** 武学库：逍遥一脉（逍遥、灵鹫宫）与大理段氏（Issue #25） */
const SKILLS: SkillDef[] = [
  {
    id: 'xd_beiming', name: '北冥神功', grade: '神品', category: '内功', school: '逍遥', nature: '阴',
    desc: '逍遥派镇派神功。引他人内力化为己用，如百川入海，蓄纳愈厚，取之愈雄，护体真气亦随之深厚。',
    learn: '逍遥派秘籍，须先自散内力方可修习',
    passive: [{ kind: 'guard', value: 15 }],
    combos: [{
      with: 'xd_lingbo', name: '北冥凌波', bonus: 5,
      text: '你步踏卦位，真气自生流转，每一步都借来势一分内力归入丹田，愈战愈厚。',
      fx: [{ kind: 'heal', value: 18 }]
    }]
  },
  {
    id: 'xd_lingbo', name: '凌波微步', grade: '神品', category: '轻功', school: '逍遥', nature: '中正',
    desc: '逍遥派轻功。步法暗合六十四卦方位，踏卦而行，飘忽若神，所谓「凌波微步，罗袜生尘」。',
    learn: '逍遥派秘传步法，须先通晓易理',
    passive: [{ kind: 'haste', value: 15 }]
  },
  {
    id: 'xd_liuyang', name: '天山六阳掌', grade: '绝品', category: '掌法', school: '灵鹫宫', nature: '阳', reach: '徒手',
    desc: '灵鹫宫掌法。纯阳掌力刚猛炽烈，阳极之处又能生出阴寒，收发由心，是运使寒冰真气的根基。',
    learn: '灵鹫宫主亲传，非首席弟子不授',
    moves: [
      { name: '阳春布泽', text: '你双掌缓缓推出，掌风暖热扑面，如春阳布泽，罩向{foe}{part}。', wound: '灼伤' },
      { name: '阳关三叠', text: '你连拍三掌，一掌重过一掌，如阳关叠唱，声声催紧，拍向{foe}{part}。', wound: '内伤' },
      { name: '丽日中天', text: '你双掌高举过顶，当头劈下，势如丽日中天，直照{foe}{part}。', wound: '灼伤' },
      { name: '阳和启蛰', text: '你掌力先敛后发，如春雷启蛰，猛然震在{foe}{part}。', wound: '内伤', realm: 2 },
      { name: '烈日流金', text: '你掌上凝足阳劲，一掌拍出，热浪滚滚，直炙{foe}{part}。', wound: '灼伤', realm: 3 },
      { name: '日轮当午', text: '你双掌画圆，掌力自四面八方一齐压至，如烈日当空，无处可避，尽落{foe}{part}。', wound: '灼伤', realm: 4 },
      { name: '夕阳熔金', text: '你斜掌下切，掌缘赤红如熔金落日，斜斜斩向{foe}{part}。', wound: '灼伤', realm: 5 },
      { name: '纯阳无极', text: '你十成功力凝于双掌，一掌推出，热气蒸腾如雾，直透{foe}{part}。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '阳关三叠', text: '你一掌快过一掌，三掌连绵拍出，掌力一重叠一重，尽数压向{foe}{part}！', mp: 85, cd: 2, hits: 3, dmg: [90, 120], acc: 0.75 },
      { name: '阳极生阴', realm: 4, text: '你炽热掌力忽转阴寒，{foe}{part}先如火烧，继而寒意彻骨，气血滞涩。', mp: 70, cd: 3, hits: 1, dmg: [170, 245], acc: 0.8, fx: [{ kind: 'chill', rounds: 3 }, { kind: 'weaken', value: 20, rounds: 2 }] }
    ]
  },
  {
    id: 'xd_zhemei', name: '天山折梅手', grade: '绝品', category: '手法', school: '逍遥', nature: '柔', reach: '徒手',
    desc: '逍遥派手法。三路掌法三路擒拿，包罗天下武学招数，遇招化招，敌招愈繁，此手愈妙。',
    learn: '灵鹫宫石壁刻谱，悟性高者自通',
    moves: [
      { name: '疏影横斜', text: '你手掌横掠，掌影清瘦斜逸，如疏影横斜，拂向{foe}{part}。', wound: '瘀伤' },
      { name: '暗香浮动', text: '你掌力隐而不发，忽进忽退，如暗香浮动，{foe}未察虚实，{part}已着了一记。', wound: '内伤' },
      { name: '寒梅著花', text: '你五指倏张，掌心翻出，如寒梅乍放，直取{foe}{part}。', wound: '瘀伤' },
      { name: '梅雪争春', text: '你双掌一白一劲，掌影如梅瓣混着雪片，纷纷扬扬扑向{foe}{part}。', wound: '瘀伤', realm: 2 },
      { name: '踏雪寻梅', text: '你足下轻点，欺身而进，掌随人至，轻轻巧巧按上{foe}{part}。', wound: '砸伤', realm: 3 },
      { name: '一枝春信', text: '你单掌前递，掌力凝如一枝递春，不偏不倚，正点{foe}{part}。', wound: '内伤', realm: 4 },
      { name: '雪虐风饕', text: '你掌势骤急，风雪交加之势席卷而出，狂撼{foe}{part}。', wound: '割伤', realm: 5 },
      { name: '凌寒独开', text: '你于重重掌影中独辟一线，一掌破空而出，直贯{foe}{part}。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '暗香浮动', text: '你掌力若有若无，忽东忽西，{foe}捉摸不定，{part}接连中了柔劲！', mp: 75, cd: 1, hits: 1, dmg: [185, 255], acc: 0.78 },
      { name: '随招拆招', realm: 3, text: '你看破{foe}招式来路，就势一带一折，反将其劲路引向自身{part}，破绽尽显。', mp: 90, cd: 2, hits: 1, dmg: [140, 210], acc: 0.8, fx: [{ kind: 'break', value: 25, rounds: 2 }, { kind: 'disarm', rounds: 1 }] }
    ]
  },
  {
    id: 'xd_wuxiang', name: '小无相功', grade: '绝品', category: '内功', school: '逍遥', nature: '中正',
    desc: '逍遥派内功。中正平和，无相无形，以之催动各家武学皆可似模似样，真气护体亦绵密周到。',
    learn: '逍遥派内密，历代只传寥寥数人',
    passive: [{ kind: 'guard', value: 14 }],
    combos: [{
      with: 'xd_zhemei', name: '无相折梅', bonus: 4,
      text: '你以无相真气催动折梅手，招式似是而非，教人捉摸不透路数。'
    }]
  },
  {
    id: 'xd_yiyang', name: '一阳指', grade: '绝品', category: '指法', school: '大理段氏', nature: '阳', reach: '徒手',
    desc: '大理段氏家传指法。以浑厚内力凝于一指，指风所至，洞金穿石，招名取自易经阳气诸卦。',
    learn: '大理段氏家传，皇族子弟始得传授',
    moves: [
      { name: '一阳来复', text: '你食指一伸，一缕阳劲凝而不散，如冬至一阳生，直点{foe}{part}。', wound: '内伤' },
      { name: '丽日经天', text: '你并指如剑，指力炽烈，自下而上撩点，直透{foe}{part}。', wound: '灼伤' },
      { name: '三阳开泰', text: '你食中二指连环点出，三点阳劲齐发，同落{foe}{part}。', wound: '内伤' },
      { name: '阳春有脚', text: '你欺身抢进，指随身走，一路点去，如春阳脚随人行，追着{foe}{part}点。', wound: '瘀伤', realm: 2 },
      { name: '雷天大壮', text: '你蓄力一指，指风激射有声，如雷震天上，猛贯{foe}{part}。', wound: '砸伤', realm: 3 },
      { name: '五阳夬决', text: '你五指轮转，五缕指力决然而发，连绵不断，尽落{foe}{part}。', wound: '内伤', realm: 4 },
      { name: '六阳纯乾', text: '你一指凝尽纯阳之力，指到之处热气蒸腾，灼透{foe}{part}。', wound: '灼伤', realm: 5 },
      { name: '乾元一指', text: '你默运玄功，一指遥遥点出，指力如天行刚健，一往无前，贯穿{foe}{part}。', wound: '灼伤', realm: 6 }
    ],
    performs: [
      { name: '一阳来复', text: '你一指遥点，指力柔中带韧，绵绵渗入{foe}{part}，内里作痛。', mp: 75, cd: 1, hits: 1, dmg: [185, 255], acc: 0.78 },
      { name: '一指封穴', realm: 2, text: '你身形一晃，指风已封住{foe}{part}穴道，{foe}半边身子登时酸麻，动弹不得。', mp: 50, cd: 3, hits: 1, dmg: [145, 180], acc: 0.8, fx: [{ kind: 'busy', rounds: 2 }] }
    ],
    combos: [{
      with: 'xd_liumai', name: '指剑同源', bonus: 6,
      text: '你一阳指力凝而不散，指尖剑气隐隐欲动，指剑相济，威势陡增。'
    }]
  },
  {
    id: 'xd_liumai', name: '六脉神剑', grade: '禁品', category: '指法', school: '大理段氏', nature: '刚', reach: '徒手',
    desc: '大理段氏至高武学。以一阳指指力化作剑气，自六脉激射而出，无形无质，用以代剑，伤人于丈外。',
    learn: '大理天龙寺镇寺绝学，须先通一阳指',
    moves: [
      { name: '少商剑', text: '你拇指少商穴一挺，一缕刚猛剑气激射而出，直刺{foe}{part}，势道雄浑。', wound: '刺伤' },
      { name: '商阳剑', text: '你食指商阳穴剑气吞吐，变幻难测，忽东忽西地袭向{foe}{part}。', wound: '刺伤' },
      { name: '中冲剑', text: '你中指一弹，剑气平直射出，中庸沉稳，却最快抵达{foe}{part}。', wound: '刺伤' },
      { name: '关冲剑', text: '你无名指出手拙滞，剑气却以拙破巧，重重撞在{foe}{part}。', wound: '砸伤', realm: 2 },
      { name: '少冲剑', text: '你小指剑气轻灵迅捷，绕开{foe}格挡，斜斜划过其{part}。', wound: '割伤', realm: 3 },
      { name: '少泽剑', text: '你小指尺侧剑气忽发忽收，忽吞忽吐，教{foe}{part}防不胜防。', wound: '刺伤', realm: 4 },
      { name: '六脉齐发', text: '你十指轮弹，六道剑气纵横交织，交织成网，密密罩向{foe}{part}。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '少商剑', text: '你拇指剑气轰然射出，剑气雄浑如潮，直贯{foe}{part}！', mp: 90, cd: 1, hits: 1, dmg: [290, 400], acc: 0.8 },
      { name: '六脉齐发', realm: 5, text: '你六脉剑气齐出，三道先行袭敌，三道随后封路，{foe}{part}破绽尽露，避无可避。', mp: 85, cd: 3, hits: 3, dmg: [155, 215], acc: 0.75, fx: [{ kind: 'break', value: 20, rounds: 2 }] }
    ]
  },
  {
    id: 'xd_shengsi', name: '生死符', grade: '绝品', category: '绝技', school: '灵鹫宫', nature: '阴',
    desc: '灵鹫宫绝技。以内力化水成冰，弹指打入穴道，冰片化时寒热交攻，中者奇痒剧痛，生死皆操于人手。',
    learn: '灵鹫宫主亲传，须尽得六阳掌法',
    ult: {
      title: '生死符 · 绝招',
      text: '你并指一弹，一枚冰晶无声无息没入{foe}{part}穴道——初时火热难当，继而奇痒彻骨，{foe}满地翻滚，求生不得，求死不能！',
      dmg: [400, 480],
      fx: [{ kind: 'chill', rounds: 2 }, { kind: 'busy', rounds: 1 }]
    }
  }
];

const pack: ContentPack = { skills: SKILLS };
export default pack;
