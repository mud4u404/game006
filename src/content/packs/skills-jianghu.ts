import type { ContentPack, SkillDef } from '../types';

/** 武学库：江湖散学（Issue #32）。天下流传的寻常功夫，谁都能学：品级最高上品，绝招、杀招、合璧、被动一律不带效果 */

const SKILLS: SkillDef[] = [
  {
    id: 'jh_taizu', name: '太祖长拳', grade: '凡品', category: '拳法', school: '江湖', nature: '刚', reach: '徒手',
    desc: '宋太祖传下的长拳，天下流传最广。招式堂堂正正，走的是大开大合的路子，戏班武行都会两手。',
    learn: '天下流传最广的拳法，武行教头都会',
    moves: [
      { name: '黑虎掏心', text: '你一记直拳直捣{foe}胸前，如黑虎掏心，实实砸在其{part}。', wound: '内伤' },
      { name: '天王托塔', text: '你双掌上托，借着{foe}攻势掀其{part}，如天王托塔。', wound: '砸伤' },
      { name: '探马', text: '你双臂一展一收，如探马勒缰，拂开{foe}来势，反拍其{part}。', wound: '瘀伤' },
      { name: '铁牛顶角', text: '你提膝一撞，如铁牛顶角，顶在{foe}{part}上。', wound: '瘀伤', realm: 2 },
      { name: '弓步冲拳', text: '你弓步进身，一记冲拳从腰间打出去，正中{foe}{part}。', wound: '瘀伤', realm: 3 },
      { name: '仆步穿掌', text: '你仆步下势，掌随腰走，穿掌直插{foe}{part}。', wound: '刺伤', realm: 4 },
      { name: '穿手搂打', text: '你穿手搂打，卸开{foe}下盘来势，反掌抹其{part}。', wound: '瘀伤', realm: 5 },
      { name: '霸王卸甲', text: '你连环六拳，如霸王卸甲，一拳重过一拳，把{foe}{part}的门户一层层砸开。', wound: '砸伤', realm: 6 }
    ],
    performs: [
      { name: '黑虎掏心', text: '你一记直拳打出去，没有花巧，全凭千万遍操练出来的准头，结结实实落在{foe}{part}。', mp: 45, cd: 1, hits: 1, dmg: [90, 120], acc: 0.75 }
    ],
    combos: [{ with: 'jh_xingyi', name: '刚拳同源', bonus: 3, text: '你长拳形意交替使出，一板一眼，一刚一沉，打的是同一副筋骨。' }]
  },
  {
    id: 'jh_wuhu', name: '五虎断门刀', grade: '良品', category: '刀法', school: '江湖', nature: '刚', reach: '短',
    desc: '山西镖趟子里的刀法，五路刀法断的是人的活路。镖局护院、山寨头目，使的多是这一路。',
    learn: '山西镖趟子的刀法，护院镖师多会两手',
    moves: [
      { name: '断门一斩', text: '你举刀过顶，一斩劈落，如断门一斩，直奔{foe}{part}。', wound: '砸伤' },
      { name: '虎啸山林', text: '你刀交左手，虚喝一声，趁{foe}分神横刀削其{part}。', wound: '割伤' },
      { name: '猛虎跳涧', text: '你跃身换位，刀随身走，落地时已撩向{foe}{part}。', wound: '割伤' },
      { name: '截虎平川', text: '你拦腰一刀截住{foe}攻势，顺势回削其{part}。', wound: '割伤', realm: 2 },
      { name: '虎入羊群', text: '你连刀砍进{foe}招式里，如虎入羊群，{part}接连中刀。', wound: '割伤', realm: 3 },
      { name: '饿虎拦路', text: '你横刀当路，刀背刀刃两用，磕住{foe}兵刃，反砸其{part}。', wound: '砸伤', realm: 4 },
      { name: '调虎离山', text: '你虚劈一路引{foe}换步，实刀从空当里切进，伤其{part}。', wound: '内伤', realm: 5 },
      { name: '五虎断门', text: '你五路刀法一气呵成，路路都堵在{foe}{part}的要害上——这一套使全，便断了生路。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '断门', text: '你五路刀走一路，专断{foe}的退步，一记斜斩落在{part}，躲无可躲。', mp: 50, cd: 1, hits: 1, dmg: [110, 150], acc: 0.75 }
    ]
  },
  {
    id: 'jh_bagua', name: '八卦掌', grade: '上品', category: '掌法', school: '江湖', nature: '柔', reach: '徒手',
    desc: '走转换掌的功夫。绕圈走转，掌随步换，八八六十四路掌法藏在身法里，打人只在一转身。',
    learn: '八卦掌门名家各有师承，游学可遇',
    // 走转换掌，先得有拳脚的底子
    requires: [{ skill: 'jh_taizu', realm: 2 }],
    moves: [
      { name: '乾三连', text: '你三掌连绵推出，一气不断，如乾三连，尽落{foe}{part}。', wound: '瘀伤' },
      { name: '坤六断', text: '你六掌断续而出，忽轻忽重，如坤六断，{foe}捉摸不定，{part}已着了一掌。', wound: '瘀伤' },
      { name: '震仰盂', text: '你仰掌一震，如雷落地，震得{foe}{part}发麻。', wound: '砸伤' },
      { name: '艮覆碗', text: '你覆掌下压，如艮覆碗，稳稳当当盖住{foe}{part}。', wound: '砸伤', realm: 2 },
      { name: '离中虚', text: '你掌势外实内虚，如离中虚，{foe}实的接了个空，{part}挨了虚里那一下。', wound: '刺伤', realm: 3 },
      { name: '坎中满', text: '你掌力外柔内刚，如坎中满，绵绵渗进{foe}{part}。', wound: '内伤', realm: 4 },
      { name: '兑上缺', text: '你掌缘斜切，如兑上缺，在{foe}门户上豁开一道口子，直取其{part}。', wound: '割伤', realm: 5 },
      { name: '巽下断', text: '你走转中骤然回身，掌断其后路，反袭{foe}{part}。', wound: '割伤', realm: 6 }
    ],
    performs: [
      { name: '走转连环', text: '你绕着{foe}走转，两掌一环扣一环地从转身里打出来，拆了一掌还有一掌。', mp: 20, cd: 1, hits: 2, dmg: [35, 55], acc: 0.75 },
      { name: '游身八卦', realm: 3, text: '你游身疾走，掌影随步而生，两掌叠在{foe}{part}——人还在圈上转，掌已到了两回。', mp: 20, cd: 1, hits: 2, dmg: [45, 60], acc: 0.75 }
    ],
    combos: [{ with: 'jh_yanqing', name: '柔掌相济', bonus: 3, text: '你八卦掌配着燕青的身法，走转里带腾挪，掌掌都从{foe}想不到的地方来。' }]
  },
  {
    id: 'jh_xingyi', name: '形意拳', grade: '良品', category: '拳法', school: '江湖', nature: '刚', reach: '徒手',
    desc: '象形取义的拳法。劈崩钻炮横五行拳打底，直进直出，起如钢锉落如钩，半步崩拳打天下。',
    learn: '形意拳名家收徒极严，武馆偶有传授',
    moves: [
      { name: '劈拳', text: '你一掌劈落复带抓回，如斧劈物，势沉劲整，落在{foe}{part}。', wound: '内伤' },
      { name: '崩拳', text: '你半步跟进一步，一记崩拳贴身打出去，又快又硬，正中{foe}{part}。', wound: '内伤' },
      { name: '钻拳', text: '你拳走弧线向上钻出，如泉水翻涌，顶在{foe}{part}。', wound: '瘀伤' },
      { name: '炮拳', text: '你双拳一开一合，如火药炸响，轰在{foe}{part}。', wound: '砸伤', realm: 2 },
      { name: '横拳', text: '你一拳横拦，如土壅水，截住{foe}劲路，反撞其{part}。', wound: '内伤', realm: 3 },
      { name: '龙形搜骨', text: '你腰脊拧转，节节贯穿，一股劲从脚跟透到拳面，砸进{foe}{part}。', wound: '内伤', realm: 4 },
      { name: '虎扑', text: '你全身扑出，双手齐落，如猛虎扑食，{foe}{part}被这股冲劲撞得生疼。', wound: '砸伤', realm: 5 },
      { name: '鹞子入林', text: '你侧身小转，拳从刁钻角度钻进{foe}门户，直入其{part}。', wound: '瘀伤', realm: 6 }
    ],
    performs: [
      { name: '半步崩拳', text: '你半步一跟，一记崩拳打出去——拳谱说半步崩拳打天下，{foe}{part}上这一下，就是明证。', mp: 50, cd: 1, hits: 1, dmg: [105, 145], acc: 0.78 }
    ]
  },
  {
    id: 'jh_tantui', name: '谭腿', grade: '凡品', category: '腿法', school: '江湖', nature: '刚', reach: '徒手',
    desc: '十二路谭腿，踢的是下三路。腿功看着朴实，练足了数，一脚踢断碗口粗的木桩。',
    learn: '北地武馆的看家腿功，铺子伙计多练过',
    moves: [
      { name: '弓箭冲拳', text: '你弓箭步定住，冲拳带腿，一脚踹在{foe}{part}。', wound: '瘀伤' },
      { name: '弹踢蹬踹', text: '你连环弹踢，脚尖脚跟换着来，尽往{foe}{part}招呼。', wound: '瘀伤' },
      { name: '侧踹连环', text: '你侧身连环侧踹，一脚快过一脚，直踹{foe}{part}。', wound: '瘀伤' },
      { name: '鸳鸯踢腿', text: '你左右脚一前一后踢出，如鸳鸯交颈，双双落在{foe}{part}。', wound: '瘀伤', realm: 2 },
      { name: '旋风扫堂', text: '你腾身旋腿，扫堂腿带着风声，横扫{foe}下盘，带及其{part}。', wound: '砸伤', realm: 3 },
      { name: '二起脚', text: '你腾身二起，连环两脚踢在半空，正中{foe}{part}。', wound: '瘀伤', realm: 4 },
      { name: '铁腿横江', text: '你一腿绷直横扫，如铁门槛江，硬生生扫开{foe}，伤其{part}。', wound: '砸伤', realm: 5 },
      { name: '十路归一', text: '你十二路腿法收作一记，全力蹬出，十路的变化都在这一脚里，直贯{foe}{part}。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '连环弹踢', text: '你腿影连成一片，弹踢蹬踹轮番招呼，{foe}下盘被踢得站不稳，{part}又着结实的一脚。', mp: 45, cd: 1, hits: 1, dmg: [85, 115], acc: 0.75 }
    ]
  },
  {
    id: 'jh_yingzhua', name: '鹰爪功', grade: '良品', category: '爪法', school: '江湖', nature: '刚', reach: '徒手',
    desc: '模仿鹰隼扑食的爪法。十指练得像铁钩，抓筋拿脉，撕开衣裳也撕开皮肉。',
    learn: '鹰爪功门有专攻，猎户捕快也有练的',
    moves: [
      { name: '鹰击长空', text: '你腾身跃起，双爪自上而下抓落，如鹰击长空，直取{foe}{part}。', wound: '割伤' },
      { name: '饿鹰扑兔', text: '你欺身扑下，十指张开扣向{foe}{part}，如饿鹰扑兔。', wound: '瘀伤' },
      { name: '鹰隼试翼', text: '你爪影一晃一试，试探{foe}虚实，实的那下已搭在其{part}。', wound: '割伤' },
      { name: '苍鹰锁喉', text: '你抢入{foe}怀中，单爪锁其颈项一带，带伤其{part}。', wound: '瘀伤', realm: 2 },
      { name: '老鹰晾翅', text: '你双爪一分一合，如老鹰晾翅，撕开{foe}门户，伤其{part}。', wound: '瘀伤', realm: 3 },
      { name: '鹰翻鹞转', text: '你身随爪转，爪随身翻，{foe}看得眼花，{part}又添几道爪痕。', wound: '内伤', realm: 4 },
      { name: '群鹰搏兔', text: '你连环数爪此起彼伏，如群鹰搏兔，{foe}顾头顾不了尾，{part}被抓得稀烂。', wound: '割伤', realm: 5 },
      { name: '鹰扬万里', text: '你全力一爪抓落，爪风猎猎，如雄鹰扬威万里，直裂{foe}{part}。', wound: '割伤', realm: 6 }
    ],
    performs: [
      { name: '鹰撕', text: '你双爪连抓带撕，两下都落在{foe}{part}，衣帛碎裂之声不绝于耳。', mp: 55, cd: 1, hits: 2, dmg: [60, 80], acc: 0.75 }
    ]
  },
  {
    id: 'jh_yanqing', name: '燕青拳', grade: '良品', category: '拳法', school: '江湖', nature: '柔', reach: '徒手',
    desc: '相传浪子燕青所传，故也叫迷踪拳。身法灵巧似燕，拳打三分脚踢七分，踪迹飘忽难测。',
    learn: '燕青拳门户不严，市井把式偶有真传',
    moves: [
      { name: '掠水穿波', text: '你低身掠进，掌如掠水穿波，轻轻一带，卸开{foe}攻势反拂其{part}。', wound: '瘀伤' },
      { name: '燕子衔泥', text: '你拳走轻灵，一点即收，如燕子衔泥，连点{foe}{part}。', wound: '瘀伤' },
      { name: '燕子穿帘', text: '你从{foe}臂弯里穿身而过，反手一拳击其{part}。', wound: '瘀伤' },
      { name: '燕子翻身', text: '你翻身绕到{foe}侧后，拳随身到，落在其{part}。', wound: '瘀伤', realm: 2 },
      { name: '燕子入巢', text: '你欺身抢入{foe}中门，短拳急发，如燕归巢，连击其{part}。', wound: '内伤', realm: 3 },
      { name: '群燕扑雨', text: '你拳影纷飞，如群燕扑雨，纷纷点点落在{foe}{part}。', wound: '瘀伤', realm: 4 },
      { name: '玉燕投怀', text: '你侧身一靠一撞，如玉燕投怀，整条手臂的劲都撞在{foe}{part}。', wound: '内伤', realm: 5 },
      { name: '泥燕剪柳', text: '你双掌交剪，如泥燕剪柳，上下两道劲同时剪向{foe}{part}。', wound: '刺伤', realm: 6 }
    ],
    performs: [
      { name: '迷踪', text: '你身形飘忽，拳从{foe}想不到的角度递进去，着了这一下，还看不清你站在哪里。', mp: 45, cd: 1, hits: 1, dmg: [100, 140], acc: 0.78 }
    ]
  },
  {
    id: 'jh_tuna', name: '吐纳术', grade: '凡品', category: '内功', school: '江湖', nature: '中正',
    desc: '天下通行的吐纳法门。练不出纵横的真气，但一口气息养得绵长，行功走带来得匀实。',
    learn: '走方郎中都会教的养气法门'
  }
];

const pack: ContentPack = { skills: SKILLS };
export default pack;
