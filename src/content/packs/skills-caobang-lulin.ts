import type { ContentPack, SkillDef } from '../types';

/** 武学库：漕帮与绿林（本作原创，Issue #31）。漕帮：绵柔主打、迅捷为辅；绿林：刚猛主打、浑厚为辅 */

const SKILLS: SkillDef[] = [
  {
    id: 'cl_xinfa', name: '漕帮心法', grade: '良品', category: '内功', school: '漕帮', nature: '中正',
    desc: '漕帮入门心法。运河上讨生活，先要学会在水气里养住一口真气，护住劳碌半生的筋骨。',
    learn: '漕帮入门心法，入帮先立水誓',
    teach: '入门',
    passive: [{ kind: 'guard', value: 8 }]
  },
  {
    id: 'cl_fenshui', name: '分水刺', grade: '良品', category: '奇门', school: '漕帮', nature: '柔', reach: '短',
    desc: '漕帮水路近身的短刺。刺走水路，专挑筋络缝隙，中刺的人当时不觉，上了岸血才止不住。',
    learn: '漕帮水路子弟入门兵器，舵把子发放',
    teach: '入门',
    moves: [
      { name: '顺水推舟', text: '你借着{foe}来势斜刺一记，如顺水推舟，轻轻巧巧点在其{part}。', wound: '刺伤' },
      { name: '逆流截渡', text: '你短刺迎着{foe}兵刃截去，如逆流截渡，硬生生别开一路，直取其{part}。', wound: '刺伤' },
      { name: '分波辨路', text: '你刺尖连晃，如分波辨路，虚虚实实探向{foe}{part}。', wound: '刺伤' },
      { name: '暗流漩卷', text: '你手腕翻转，刺走弧线，如暗流漩卷，绞得{foe}{part}生疼。', wound: '割伤', realm: 2 },
      { name: '浪里挑灯', text: '你刺尖一点寒星，如浪里挑灯，忽明忽暗地逗{foe}{part}。', wound: '刺伤', realm: 3 },
      { name: '逆水回澜', text: '你刺势将尽忽地回卷，如逆水回澜，反手割向{foe}{part}。', wound: '割伤', realm: 4 }
    ],
    performs: [
      { name: '分水', text: '你短刺在水气里淬得冰凉，一记递进{foe}{part}——当时只是一道白印，稍后血才慢慢渗出来。', mp: 45, cd: 2, hits: 1, dmg: [110, 145], acc: 0.75, fx: [{ kind: 'bleed', value: 10, rounds: 3 }] }
    ]
  },
  {
    id: 'cl_fanjiang', name: '翻江掌', grade: '上品', category: '掌法', school: '漕帮', nature: '刚', reach: '徒手',
    desc: '漕帮镇帮掌法。掌势如翻江倒海，绵绵推来，看着不险，却把人的力气一浪一浪卸个干净。',
    learn: '漕帮舵主亲传，须在水上讨十年生活',
    teach: '内门',
    requires: [{ skill: 'cl_fenshui', realm: 3 }],
    moves: [
      { name: '江涛拍岸', text: '你双掌平推，如江涛拍岸，一浪接一浪压向{foe}{part}。', wound: '瘀伤' },
      { name: '浪打礁石', text: '你掌力又急又沉，如浪打礁石，砰砰砸在{foe}{part}。', wound: '砸伤' },
      { name: '推波助澜', text: '你借着{foe}撤劲往前一送，如推波助澜，其劲反伤自身{part}。', wound: '内伤' },
      { name: '翻江搅海', text: '你双掌绞动，如翻江搅海，{foe}立脚不稳，{part}门户大开。', wound: '内伤', realm: 2 },
      { name: '顺流千里', text: '你掌势连绵不断，如顺流千里，追着{foe}{part}一路推去。', wound: '瘀伤', realm: 3 },
      { name: '潮起潮落', text: '你掌力忽起忽落，如潮起潮落，{foe}两下都猜错，{part}着了一掌。', wound: '砸伤', realm: 4 },
      { name: '力挽狂澜', text: '你沉腰坐马，双掌逆势一挽，如力挽狂澜，硬生生截住{foe}攻势，反震其{part}。', wound: '内伤', realm: 5 },
      { name: '海纳百川', text: '你双掌圈圆，来劲尽纳，再连同自家掌力一并奉还{foe}{part}。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '翻江', text: '你双掌绵绵推来，{foe}接是接住了，劲力却像掉进江心的漩涡，被一浪一浪卸走。', mp: 65, cd: 2, hits: 1, dmg: [140, 180], acc: 0.78, fx: [{ kind: 'weaken', value: 12, rounds: 2 }] },
      { name: '倒海', realm: 3, text: '你双掌一沉一起，如倒海翻波，两掌叠在{foe}{part}，掌到之处，劲力先泄了三分。', mp: 62, cd: 2, hits: 2, dmg: [95, 125], acc: 0.75, fx: [{ kind: 'guard', value: 10, rounds: 2 }] }
    ],
    combos: [{ with: 'cl_xinfa', name: '水上同源', bonus: 4, text: '你以漕帮真气催动翻江掌，掌力像涨了潮，一浪叠着一浪，卸起人来更不见痕迹。' }]
  },
  {
    id: 'cl_langli', name: '浪里穿梭', grade: '良品', category: '轻功', school: '漕帮', nature: '中正',
    desc: '漕帮轻功。船板浪头间练出来的步子，落在晃的地方稳，落在实地更轻，挤在人堆里也穿得过去。',
    learn: '漕帮轻功，船头船尾练出来的',
    teach: '入门',
    passive: [{ kind: 'haste', value: 10 }]
  },
  {
    id: 'cl_shangu', name: '山骨功', grade: '良品', category: '内功', school: '绿林', nature: '刚',
    desc: '绿林汉子的横练底子。皮肉糙、骨头硬，山寨里从小挨打，挨出这一身挨得起的骨架。',
    learn: '绿林寨子里人人打底的横练',
    teach: '入门',
    passive: [{ kind: 'guard', value: 8 }]
  },
  {
    id: 'cl_chuanlin', name: '穿林步', grade: '良品', category: '轻功', school: '绿林', nature: '刚',
    desc: '绿林穿林越墙的步子。林子里长大的人，闭着眼也不会撞树，追得上官马，躲得过捕快。',
    learn: '绿林穿林越墙的营生，进山先学这个',
    teach: '入门',
    passive: [{ kind: 'haste', value: 10 }]
  },
  {
    id: 'cl_lianzi', name: '链子枪', grade: '上品', category: '枪法', school: '绿林', nature: '刚', reach: '长',
    desc: '绿林把式的巧宗儿。枪头带链，软硬两用，收起来是枪，抖开了如鞭似索，缠上谁谁头疼。',
    learn: '绿林镖趟子改的把式，寨主点头方可习练',
    teach: '外门',
    moves: [
      { name: '挺枪硬扎', text: '你挺枪硬扎，不绕半分弯子，直奔{foe}{part}。', wound: '刺伤' },
      { name: '链抖三环', text: '你手腕三抖，枪身链节哗啦啦作响，乱人耳目，枪尖暗袭{foe}{part}。', wound: '瘀伤' },
      { name: '收放自如', text: '你枪收如尺、放如鞭，长短忽变，一记点在{foe}{part}。', wound: '刺伤' },
      { name: '链缠枪绕', text: '你枪链缠上{foe}兵刃一绞一带，顺势枪尖划其{part}。', wound: '割伤', realm: 2 },
      { name: '枪走龙蛇', text: '你枪势忽直忽曲，如龙走蛇行，绕开{foe}格挡直取其{part}。', wound: '刺伤', realm: 3 },
      { name: '链锁大江', text: '你长链横江一锁，封死{foe}退路，枪尖自链圈里刺其{part}。', wound: '割伤', realm: 4 },
      { name: '软硬齐施', text: '你软链缠、硬枪扎，两路齐施，{foe}顾此失彼，{part}着了一记。', wound: '内伤', realm: 5 },
      { name: '链舞梨花', text: '你枪链舞成一团梨花，纷纷滚滚罩下，{foe}避无可避，{part}连着数下。', wound: '刺伤', realm: 6 }
    ],
    performs: [
      { name: '绞枪', text: '你枪链绞住{foe}兵刃猛地发力，铁链磨处火星四溅——绞开的那道口子，正是{part}上最不结实的地方。', mp: 65, cd: 2, hits: 1, dmg: [140, 180], acc: 0.78, fx: [{ kind: 'break', value: 12, rounds: 2 }] }
    ]
  },
  {
    id: 'cl_kaibei', name: '开碑手', grade: '良品', category: '掌法', school: '绿林', nature: '刚', reach: '徒手',
    desc: '绿林砸窑破门的掌力。一掌下去砖裂石开，落在人身上，也是一样的道理。',
    learn: '绿林开碑手，砸窑破门的吃饭家伙',
    teach: '入门',
    moves: [
      { name: '一掌开碑', text: '你侧身送掌，一掌劈在{foe}{part}，如一掌开碑，干脆利落。', wound: '砸伤' },
      { name: '双掌擂石', text: '你双掌轮流擂下，如擂石开山，一下比一下沉，尽砸{foe}{part}。', wound: '砸伤' },
      { name: '掌碎青砖', text: '你掌风扫处，{foe}招架的手臂如同垫在青砖上，震得{part}发麻。', wound: '瘀伤' },
      { name: '掌透门板', text: '你掌力隔物相传，透过{foe}格挡的手臂直渗其{part}。', wound: '内伤', realm: 2 },
      { name: '断碑手', text: '你看准{foe}旧伤处一掌切落，如断碑重接处再断，其{part}痛得钻心。', wound: '砸伤', realm: 3 },
      { name: '崩山掌', text: '你毕生掌力凝于一掌，如崩山裂石，轰然拍在{foe}{part}。', wound: '内伤', realm: 4 }
    ],
    performs: [
      { name: '开碑', text: '你一掌拍在{foe}格挡的兵刃上，连兵刃带{part}一并震开——砖石尚且挡不住，何况血肉。', mp: 60, cd: 2, hits: 1, dmg: [125, 165], acc: 0.75, fx: [{ kind: 'break', value: 8, rounds: 2 }] }
    ]
  },
  {
    id: 'cl_guitou', name: '鬼头刀法', grade: '良品', category: '刀法', school: '绿林', nature: '刚', reach: '短',
    desc: '黑风寨的家数。刀头饰着鬼头，劈砍全不讲道理，讲的是谁狠谁活。',
    learn: '黑风寨的家数，寨主亲自点拨',
    teach: '入门',
    moves: [
      { name: '鬼头开山', text: '你双手举刀过顶，当头劈落，如鬼头开山，直砍{foe}{part}。', wound: '砸伤' },
      { name: '恶鬼扑食', text: '你扑身抢进，刀走横里，如恶鬼扑食，撕向{foe}{part}。', wound: '割伤' },
      { name: '过刀山', text: '你连刀泼出，刀光如山，{foe}进也是刀山，退也是刀山，{part}终究躲不过。', wound: '割伤' },
      { name: '判官翻簿', text: '你刀势一翻，如判官翻簿点名，点到谁，{part}便着一刀。', wound: '割伤', realm: 2 },
      { name: '夜叉探海', text: '你矮身探刀，如夜叉探海，自下而上撩其{part}。', wound: '割伤', realm: 3 },
      { name: '无常索命', text: '你贴身缠斗，刀刀不离{foe}{part}要害，如无常索命，躲过初一躲不过十五。', wound: '割伤', realm: 4 },
      { name: '阎罗帖', text: '你拈刀一掷一收，刀背拍在{foe}{part}，如接到阎罗帖，震得心头发寒。', wound: '内伤', realm: 5 },
      { name: '有去无回', text: '你毕生狠劲凝在这一刀，劈出便不收回——{foe}明知这一刀有去无回，{part}还是避不开。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '索命', text: '你刀刀抢攻，招招搏命，{foe}胆气一寒，手上先自慢了半拍。', mp: 40, cd: 2, hits: 1, dmg: [120, 160], acc: 0.78, fx: [{ kind: 'fear', value: 12, chance: 0.5 }] },
      { name: '负伤逞凶', realm: 2, text: '你身上带着伤，越打越狠，刀势竟似不要命——一记狠的砍中{foe}{part}，你的气反倒顺过来了。', mp: 60, cd: 2, hits: 1, dmg: [160, 200], acc: 0.78, fx: [{ kind: 'heal', value: 40 }] }
    ]
  },
  {
    id: 'cl_feizhua', name: '飞爪', grade: '凡品', category: '奇门', school: '绿林', nature: '柔', reach: '长',
    desc: '绿林上房越脊的营生。爪飞出去是钩，收回来是索，墙头树上都走得，落在人身上就不是那么回事了。',
    learn: '绿林飞爪，上房越脊的营生',
    teach: '入门',
    moves: [
      { name: '飞爪探檐', text: '你飞爪甩出，越过{foe}头顶，回手一带，爪尖擦其{part}。', wound: '瘀伤' },
      { name: '索收回环', text: '你爪索收回复甩，一圈一环，绕着{foe}{part}刁钻地掏。', wound: '割伤' },
      { name: '攀墙附壁', text: '你借着爪索横里一荡，贴着{foe}身侧掠过，爪尖划其{part}。', wound: '割伤', realm: 2 },
      { name: '爪中捉鳖', text: '你爪势罩定{foe}退路，等他撞进来，一把抓其{part}。', wound: '瘀伤', realm: 3 },
      { name: '云里倒挂', text: '你爪索挂在高处，倒身荡下，双爪齐取{foe}{part}。', wound: '割伤', realm: 4 },
      { name: '一线飞天', text: '你爪索绷得笔直，人随爪走，一条线撞向{foe}{part}。', wound: '刺伤', realm: 5 }
    ],
    performs: [
      { name: '飞爪', text: '你飞爪甩得又刁又贼，{foe}防了上面防不了下面，{part}被爪尖勾了一道。', mp: 55, cd: 1, hits: 1, dmg: [110, 145], acc: 0.75 }
    ]
  }
];

const pack: ContentPack = { skills: SKILLS };
export default pack;
