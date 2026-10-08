import type { ContentPack, SkillDef } from '../types';

/** 武学库：明教、日月神教、姑苏慕容、铁掌帮（Issue #28，门派改造 Issue #64） */

const SKILLS: SkillDef[] = [
  {
    id: 'mr_shenghuoxinfa', name: '圣火心法', grade: '良品', category: '内功', school: '明教', nature: '阳',
    desc: '明教入门内功。以圣火焚身之意行功，气血烧得滚沸，是圣火令武功与乾坤大挪移共同的底子。',
    learn: '明教入门内功，教众入教第一课',
    teach: '入门',
    passive: [{ kind: 'guard', value: 8 }]
  },
  {
    id: 'mr_hanbing', name: '寒冰绵掌', grade: '良品', category: '掌法', school: '明教', nature: '阴', reach: '徒手',
    desc: '青翼蝠王韦一笑的成名掌法，随明教传入中土。掌力阴寒入骨，掌到之处，气血都慢了半拍。',
    learn: '明教掌法，蝠王一路的弟子传承',
    teach: '入门',
    moves: [
      { name: '寒冰初结', text: '你掌心凝出寒气，一掌推出，如寒冰初结，拍在{foe}{part}。', wound: '瘀伤' },
      { name: '寒气砭骨', text: '你掌风砭人肌骨，{foe}格挡的手臂上寒毛倒竖，{part}跟着发僵。', wound: '内伤' },
      { name: '冰封三尺', text: '你连掌三按，寒气一层叠一层，冻得{foe}{part}血脉都慢了。', wound: '瘀伤' },
      { name: '千里冰封', text: '你掌势铺开，寒气千里冰封，{foe}半边身子都僵在原地，{part}尤甚。', wound: '瘀伤', realm: 2 },
      { name: '寒绵透骨', text: '你掌力又绵又寒，如寒绵裹冰，一层层透进{foe}{part}。', wound: '内伤', realm: 3 },
      { name: '冰魄寒绵', text: '你毕生寒气凝于一掌，寒冰绵掌的「绵」字使到尽头，{foe}{part}血脉都冻得慢了。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '寒气砭骨', text: '你一掌拍在{foe}{part}，寒气随掌透入，{foe}使出来的招式都又僵又慢。', mp: 45, cd: 2, hits: 1, dmg: [85, 115], acc: 0.78, fx: [{ kind: 'weaken', value: 10, rounds: 2 }] }
    ]
  },
  {
    id: 'mr_qiankun', name: '乾坤大挪移', grade: '神品', category: '内功', school: '明教', nature: '中正',
    desc: '明教镇教神功。道理在激发自身潜力，牵引挪移敌劲，四两拨千斤，敌招愈猛，化解愈奇。',
    learn: '明教光明顶秘道石壁遗谱',
    teach: '真传',
    requires: [{ skill: 'mr_shenghuoxinfa', realm: 5 }],
    passive: [{ kind: 'guard', value: 15 }],
    combos: [{ with: 'mr_shenghuo', name: '圣火乾坤', bonus: 4, text: '你以乾坤心法牵引圣火令的诡异招路，敌招方出便被挪偏三分，越打越是顺遂。', fx: [{ kind: 'guard', value: 5 }] }]
  },
  {
    id: 'mr_shenghuo', name: '圣火令武功', grade: '绝品', category: '奇门', school: '明教', nature: '阳', reach: '短',
    desc: '刻在圣火令上的波斯武功，招式古怪诡谲，全然不合中原武学的路数，教人无从捉摸。',
    learn: '波斯圣火令原件，唯教中高层得见',
    teach: '奇遇',
    needAttr: { 悟性: 28 },
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
      { name: '怪招百出', text: '你令刃忽左忽右，借力卸劲全在怪异角度里，{foe}两次招架都落了空，劲力被卸得七零八落，胆气先自怯了。', mp: 80, cd: 2, hits: 2, dmg: [125, 160], acc: 0.75, fx: [{ kind: 'fear', value: 12 }, { kind: 'weaken', value: 10, rounds: 1 }] },
      { name: '焚天煮海', realm: 3, text: '你双令挟着风火之势当头压落，{foe}望而生畏，手上一缓，{part}已被令锋燎中。', mp: 90, cd: 2, hits: 1, dmg: [310, 400], acc: 0.78, fx: [{ kind: 'fear', value: 20 }] }
    ]
  },
  {
    id: 'mr_riyuexinfa', name: '日月心法', grade: '良品', category: '内功', school: '日月神教', nature: '阴',
    desc: '日月神教入门心法。日月轮转，吸其阴而藏其锋，教中弟子人人由此入门，练的是一口藏而不发的阴劲。',
    learn: '日月神教入门心法，入教第一课',
    teach: '入门',
    passive: [{ kind: 'guard', value: 8 }]
  },
  {
    id: 'mr_heifengzhang', name: '黑风掌', grade: '良品', category: '掌法', school: '日月神教', nature: '阴', reach: '徒手',
    desc: '日月神教入门掌法。掌出如黑风掠阵，掌中带吸，打在身上是伤，内力也被卷走一把。',
    learn: '日月神教入门掌法，教众共习',
    teach: '入门',
    moves: [
      { name: '黑风乍起', text: '你一掌横扫，如黑风乍起，扫得{foe}{part}生疼。', wound: '瘀伤' },
      { name: '黑风卷刃', text: '你掌缘如刀，卷着{foe}兵刃削过，割其{part}。', wound: '割伤' },
      { name: '风助掌势', text: '你借着{foe}撤劲补上一掌，风助掌势，{part}受力更沉。', wound: '瘀伤' },
      { name: '黑风摧城', text: '你双掌连环，如黑风摧城，一掌重过一掌，撞向{foe}{part}。', wound: '内伤', realm: 2 },
      { name: '风卷残劲', text: '你掌力卷住{foe}劲力不放，连化带吸，{part}渐渐使不上力。', wound: '内伤', realm: 3 },
      { name: '黑风蚀骨', text: '你掌上阴劲透体而入，如黑风蚀骨，{foe}{part}又麻又沉。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '黑风蚀骨', text: '你一掌拍上{foe}{part}，掌力如黑风卷过——力道伤了皮肉，内力也被卷走了一把。', mp: 45, cd: 1, hits: 1, dmg: [90, 120], acc: 0.78, fx: [{ kind: 'drain', value: 20, chance: 0.5 }] }
    ]
  },
  {
    id: 'mr_heifengdao', name: '黑风刀', grade: '良品', category: '刀法', school: '日月神教', nature: '阴', reach: '短',
    desc: '日月神教入门刀法。刀出如黑风卷地，刀刀抢在敌人劲力吐出之前，割开的伤口里都带着吸劲。',
    learn: '日月神教入门刀法，教众共习',
    teach: '入门',
    moves: [
      { name: '黑风出鞘', text: '你黑刀出鞘，如黑风出匣，直奔{foe}{part}。', wound: '割伤' },
      { name: '断风刀', text: '你一刀横断，连{foe}劲力带去路一并斩断，伤其{part}。', wound: '割伤' },
      { name: '黑风绕背', text: '你绕到{foe}背后，刀光自黑影里递出，划其{part}。', wound: '割伤' },
      { name: '风过无痕', text: '你刀快得无痕，{foe}中了刀，才觉出{part}一凉。', wound: '刺伤' },
      { name: '黑风劈岭', text: '你双手握刀全力劈下，如黑风劈岭，砍在{foe}{part}。', wound: '砸伤', realm: 2 },
      { name: '黑风吞日', text: '你最后一刀如黑风吞日，卷着{foe}的气血内力一并吞了，{part}血凉如冰。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '黑风卷刃', text: '你黑刀卷着风割上{foe}{part}，伤口不深，{foe}的内力却顺着刀风淌了出来。', mp: 45, cd: 1, hits: 1, dmg: [90, 120], acc: 0.78, fx: [{ kind: 'drain', value: 20, chance: 0.5 }] }
    ]
  },
  {
    id: 'mr_xixing', name: '吸星大法', grade: '神品', category: '内功', school: '日月神教', nature: '阴',
    desc: '日月神教神功。吸人内力贮于己身，威力绝伦，只是异种真气积于经脉，隐患极深，练者不可不慎。',
    learn: '西湖梅庄湖底铁板刻字，历代教主口耳相传',
    teach: '奇遇',
    needAttr: { 根骨: 36 },
    passive: [{ kind: 'guard', value: 15 }],
    combos: [{ with: '门派:日月神教', name: '吸元化劲', bonus: 5, text: '你吸来的内力顺着招式绵绵渡出，敌手斗得越久气越短，你却越长。', fx: [{ kind: 'guard', value: 8 }] }]
  },
  {
    id: 'mr_pixie', name: '辟邪剑法', grade: '禁品', category: '剑法', school: '日月神教', nature: '阴', reach: '短',
    desc: '福建林家辟邪剑谱，流入日月神教。快到极处，以速破敌，敌招再妙，也快不过这一剑；只是谱上开篇写得分明：习此剑者，须先自宫。',
    learn: '辟邪剑谱残卷，须付非常代价',
    teach: '奇遇',
    needAttr: { 身法: 29 },
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
      { name: '电光石火', text: '你三剑一气呵成，剑剑粘着{foe}的劲力往外带——拆开一剑，内力已被吸走一分，身法也随之一轻。', mp: 85, cd: 3, hits: 3, dmg: [105, 145], acc: 0.8, fx: [{ kind: 'haste', value: 15, rounds: 3 }, { kind: 'drain', value: 20, chance: 0.4 }] },
      { name: '鬼神莫测', realm: 4, text: '你这一剑快得全无征兆，如鬼如魅，{foe}招式使到一半便破了绽，门户大开；剑气过处，内力也被卷去一缕。', mp: 60, cd: 3, hits: 1, dmg: [380, 400], acc: 0.85, fx: [{ kind: 'break', value: 20, rounds: 2 }, { kind: 'drain', value: 20, chance: 0.5 }] }
    ]
  },
  {
    id: 'mr_murongxinfa', name: '慕容心法', grade: '良品', category: '内功', school: '姑苏慕容', nature: '中正',
    desc: '姑苏慕容入门心法。气走中正，不发则已，发必有度——天下武学千般，慕容家先学的是收得住。',
    learn: '姑苏慕容入门心法，家学子弟自幼修习',
    teach: '入门',
    passive: [{ kind: 'guard', value: 8 }]
  },
  {
    id: 'mr_murongjian', name: '慕容剑法', grade: '良品', category: '剑法', school: '姑苏慕容', nature: '中正', reach: '短',
    desc: '姑苏慕容家传剑法。剑走堂皇，却又处处留劲——出手七分，留三分还施彼身，是慕容家的一贯家数。',
    learn: '姑苏慕容家传剑法，家学子弟必修',
    teach: '入门',
    moves: [
      { name: '燕子坞前', text: '你剑出如燕掠水，轻巧一点，刺向{foe}{part}。', wound: '刺伤' },
      { name: '参合庄外', text: '你剑势沉凝，如参合庄外的老松，稳稳压向{foe}{part}。', wound: '刺伤' },
      { name: '姑苏烟雨', text: '你剑光如姑苏烟雨，丝丝缕缕缠向{foe}{part}。', wound: '刺伤' },
      { name: '燕市悲歌', text: '你剑势一悲，如燕市悲歌击筑，一剑慷慨，划向{foe}{part}。', wound: '割伤', realm: 2 },
      { name: '以彼之道', text: '你出手便是{foe}自己最熟的那一路剑——以彼之道，还施彼身，慕容家的规矩。', wound: '刺伤' },
      { name: '王谢堂前', text: '你剑随典故而走，如王谢堂前燕，绕殿一周，落在{foe}{part}。', wound: '刺伤', realm: 6 }
    ],
    performs: [
      { name: '还施彼身', text: '你剑圈一带，将{foe}攻来的力道原样奉还——以彼之道，还施彼身，{foe}{part}挨的正是自家的劲。', mp: 50, cd: 1, hits: 1, dmg: [85, 115], acc: 0.78, fx: [{ kind: 'weaken', value: 10, rounds: 2, chance: 0.5 }] }
    ]
  },
  {
    id: 'mr_canhe', name: '参合指', grade: '上品', category: '指法', school: '姑苏慕容', nature: '中正', reach: '徒手',
    desc: '姑苏慕容家传指法。出自参合庄，指力隔空而发，轻描淡写间点人穴道、伤人脏腑。',
    learn: '姑苏慕容家传，外姓难得真传',
    teach: '外门',
    requires: [{ skill: 'mr_murongxinfa', realm: 2 }],
    moves: [
      { name: '凌空虚点', text: '你遥遥一指，指力离手而出，如无形细箭，直点{foe}{part}。', wound: '内伤' },
      { name: '燕山雪重', text: '你指力沉凝，一点而发，如燕山雪重，直压{foe}{part}。', wound: '瘀伤' },
      { name: '白虹遥指', text: '你并指遥指，一缕指力如白虹般激射，贯穿{foe}{part}。', wound: '刺伤' },
      { name: '金台点将', text: '你拇指食指一扣一弹，指力疾射，点在{foe}{part}。', wound: '刺伤', realm: 2 },
      { name: '参合一指', text: '你凝神一指，家传指力尽注指尖，透体而入，震荡{foe}{part}。', wound: '内伤', realm: 3 },
      { name: '燕返旧都', text: '你指力吐了又收，收了又吐，如燕返旧都，往复不休，连环点其{part}。', wound: '内伤', realm: 4 },
      { name: '寒潭鹤影', text: '你指影飘忽难测，如寒潭鹤影，{foe}防不胜防，{part}又着一指。', wound: '刺伤', realm: 5 },
      { name: '王谢风流', text: '你衣袖微拂，随意一指，指力却雄浑之极，直透{foe}{part}。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '凌空虚点', text: '你遥遥虚点，指力隔空而至，正中{foe}{part}穴道，{foe}退路已被这一指封死。', mp: 70, cd: 2, hits: 1, dmg: [175, 225], acc: 0.78, fx: [{ kind: 'busy', rounds: 1, chance: 0.4 }] },
      { name: '以指代剑', realm: 3, text: '你一指点出，指力如剑引开{foe}劲路，顺势一带一送，{foe}劲力泄了三分，门户洞开。', mp: 75, cd: 2, hits: 1, dmg: [190, 265], acc: 0.8, fx: [{ kind: 'weaken', value: 15, rounds: 2 }] }
    ],
    combos: [{ with: 'mr_douzhuan', name: '还施彼身', bonus: 5, text: '你一指引开敌劲，顺势还施彼身，指力裹着敌手的劲路反激回去。' }]
  },
  {
    id: 'mr_douzhuan', name: '斗转星移', grade: '神品', category: '绝技', school: '姑苏慕容', nature: '中正',
    desc: '姑苏慕容氏绝技。以彼之道，还施彼身，天下各门各派的绝招，都可能被原样奉还。',
    learn: '慕容氏嫡传，须尽通百家方可参悟',
    teach: '真传',
    requires: [{ skill: 'mr_canhe', realm: 4 }],
    ult: {
      title: '斗转星移 · 绝招',
      text: '你不闪不避，引{foe}来势一转，还施彼身——{foe}的全力一击竟原路而回，加倍的劲力轰在其自身{part}；去势未竭，余劲更把{foe}周身劲力卸得七零八落，再也提不起一口真气！',
      dmg: [520, 600],
      fx: [{ kind: 'weaken', value: 15, rounds: 2 }]
    }
  },
  {
    id: 'mr_tieqiao', name: '铁桥功', grade: '良品', category: '内功', school: '铁掌帮', nature: '刚',
    desc: '铁掌帮入门内功。铁桥横江，硬架硬打，练的是一副扛得住千斤的腰马，铁掌帮的「硬」字全从这来。',
    learn: '铁掌帮入门内功，操练场人人过关',
    teach: '入门',
    passive: [{ kind: 'haste', value: 8 }]
  },
  {
    id: 'mr_paiyun', name: '排云掌', grade: '良品', category: '掌法', school: '铁掌帮', nature: '中正', reach: '徒手',
    desc: '铁掌帮入门掌法。掌出如排云见日，两掌连环推出，云开一线，日头照在谁身上，谁就不好受。',
    learn: '铁掌帮入门掌法，弟子共习',
    teach: '入门',
    moves: [
      { name: '排云见日', text: '你双掌平推，如排云见日，直直撞在{foe}{part}。', wound: '瘀伤' },
      { name: '白云千载', text: '你掌力悠悠不绝，如白云千载空悠悠，绵绵拍向{foe}{part}。', wound: '瘀伤' },
      { name: '排云推浪', text: '你两掌连环推出，如排云推浪，一浪接一浪撞在{foe}{part}。', wound: '瘀伤' },
      { name: '云卷千堆', text: '你掌势卷起千堆雪，卷得{foe}{part}东倒西歪。', wound: '瘀伤', realm: 2 },
      { name: '云垂四野', text: '你掌力四下垂落，如云垂四野，压得{foe}{part}抬不起来。', wound: '内伤', realm: 3 },
      { name: '排云直上', text: '你双掌翻上，如排云直上青天，全力顶在{foe}{part}。', wound: '瘀伤', realm: 6 }
    ],
    performs: [
      { name: '排云推浪', text: '你两掌连环推出，掌力如排云见日，{foe}招架的门户被生生推开一线。', mp: 65, cd: 1, hits: 2, dmg: [55, 75], acc: 0.75, fx: [{ kind: 'break', value: 8, rounds: 2, chance: 0.5 }] }
    ]
  },
  {
    id: 'mr_shuishangpiao', name: '水上漂', grade: '上品', category: '轻功', school: '铁掌帮', nature: '中正',
    desc: '铁掌帮轻功。蹬萍渡水，踏浪而行，论在水上施展，江湖中无出其右。',
    learn: '铁掌帮帮主亲传，须立功于帮',
    teach: '外门',
    passive: [{ kind: 'haste', value: 13 }]
  },
  {
    id: 'mr_tiezhang', name: '铁掌掌法', grade: '绝品', category: '掌法', school: '铁掌帮', nature: '刚', reach: '徒手',
    desc: '铁掌帮镇帮掌法。掌力刚猛沉雄，一掌既出，开碑裂石，江湖人称铁掌水上漂的功夫底子。',
    learn: '铁掌帮帮主亲传，须立功于帮',
    teach: '真传',
    requires: [{ skill: 'mr_paiyun', realm: 3 }, { skill: 'mr_tieqiao', realm: 3 }],
    moves: [
      { name: '开碑裂石', text: '你一掌劈出，掌缘如刀，直剁{foe}{part}，势可开碑。', wound: '瘀伤' },
      { name: '沉肩坠肘', text: '你沉肩坐腕，掌力层层下压，如山岳压顶，盖向{foe}{part}。', wound: '瘀伤' },
      { name: '铁掌开山', text: '你大喝一声，一掌全力拍出，如铁掌开山，轰在{foe}{part}。', wound: '内伤' },
      { name: '掌断流水', text: '你一掌切落，掌力凝如铁尺，斩在{foe}{part}。', wound: '瘀伤', realm: 2 },
      { name: '翻江搅海', text: '你双掌翻飞，掌力如翻江搅海，一浪高过一浪，尽压{foe}{part}。', wound: '内伤', realm: 3 },
      { name: '山摇地动', text: '你一掌顿地，借势掀起，掌力自下而上翻起，直撞{foe}{part}。', wound: '瘀伤', realm: 4 },
      { name: '裂石穿云', text: '你凝劲一掌，掌风激射如箭，穿云裂石，直贯{foe}{part}。', wound: '内伤', realm: 5 },
      { name: '五岳同摧', text: '你毕生掌力凝于一掌，轰然拍落，如五岳同摧，尽付{foe}{part}。', wound: '瘀伤', realm: 6 }
    ],
    performs: [
      { name: '铁掌开山', text: '你一掌全力拍出，掌力如山崩裂，{foe}硬接之下虎口崩裂，门户大敞。', mp: 85, cd: 1, hits: 1, dmg: [135, 180], acc: 0.78, fx: [{ kind: 'break', value: 15, rounds: 2 }] },
      { name: '一掌破壁', realm: 3, text: '你看准{foe}招式旧力已尽，一掌破壁而入，直捣{part}，{foe}防线登时全面洞开。', mp: 90, cd: 2, hits: 1, dmg: [210, 290], acc: 0.8, fx: [{ kind: 'break', value: 20, rounds: 2 }] }
    ]
  }
];

const pack: ContentPack = { skills: SKILLS };
export default pack;
