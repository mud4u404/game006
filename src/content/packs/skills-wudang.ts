import type { ContentPack, SkillDef } from '../types';

/**
 * 武当的九门武功。文风与数值规则见 docs/wuxue.md。
 * id 一律以 wd_ 开头，避免和别的批次重名。修订版（Issue #54）：长拳整门重写、考据订正、描写与机制对齐。
 *
 * 武学树（docs/menpai.md 第七节）：
 *   入门：太和心法（内功）、武当长拳
 *   外门：梯云纵（太和心法略有小成）、绵掌、神门十三剑（武当长拳融会贯通）
 *   内门：太极神功（太和心法炉火纯青）、太极拳（太极神功融会贯通、绵掌炉火纯青）
 *   真传：太极剑（太极神功炉火纯青、太极拳融会贯通）、真武除魔（太极剑登堂入室）
 * 武当是绵柔加浑厚：卸力、护体、疗伤。不缴械、不打破绽，三连击是迅捷门派的路子。
 */
const SKILLS: SkillDef[] = [
  {
    id: 'wd_taijishengong', name: '太极神功', grade: '绝品', category: '内功', school: '武当', nature: '中正',
    desc: '武当内功根基，取太极阴阳相生之意。行功时气走圆转，绵绵不绝，外可卸力护体，内可自愈创伤。',
    learn: '武当掌门亲传，须道心澄明', teach: '内门',
    requires: [{ skill: 'wd_taihe', realm: 3 }],
    passive: [{ kind: 'guard', value: 10 }, { kind: 'heal', value: 7 }],
    combos: [
      { with: '门派:武当', name: '道法自然', text: '你太极神功内息圆转，与身上武当武功浑然相合，举手投足皆合自然之道。', bonus: 5, fx: [{ kind: 'guard', value: 5 }] }
    ]
  },
  {
    id: 'wd_tiyunzong', name: '梯云纵', grade: '上品', category: '轻功', school: '武当', nature: '中正',
    desc: '武当轻功，步步如踏云梯，愈上愈轻。传说练成者能在崖壁间纵跃往来，如履平地。',
    learn: '武当门下弟子皆可学', teach: '外门',
    requires: [{ skill: 'wd_taihe', realm: 1 }],
    passive: [{ kind: 'haste', value: 13 }]
  },
  {
    id: 'wd_taihe', name: '太和心法', grade: '良品', category: '内功', school: '武当', nature: '中正',
    desc: '武当入门的吐纳功夫。武当山古称太和山，取「保合太和」之意：行气不争不抢，周身圆融，挨了打先化后受。太极神功的根脚就在这里。',
    learn: '武当入门弟子早晚功课', teach: '入门',
    passive: [{ kind: 'guard', value: 8 }],
    // 用这门内功硬接成功时的一句（docs/yangban-wuxue.md 第五节）
    resp: {
      生: ['你提起太和心法的内力硬接下来，周身一沉，好歹接住了。'],
      熟: ['你把太和心法一运，气走圆转，那一招的力道撞上来，被周身化去大半，才落到身上。'],
      精: ['太和心法自行流转，不争不抢，那一招的力道先被化开，余下的才慢慢受下。'],
      化: ['你并不运劲，太和心法自行流转，那一招打在身上，先化后受，像水流过石，了无痕迹。']
    }
  },
  {
    id: 'wd_taijiquan', name: '太极拳', grade: '绝品', category: '拳法', school: '武当', nature: '柔', reach: '徒手',
    desc: '武当绝学，以柔克刚，借力打力。拳势如环，无始无终，敌人的力道愈猛，还给它的劲道愈沉。',
    learn: '武当掌门亲授，须先通太极神功', teach: '内门',
    requires: [{ skill: 'wd_taijishengong', realm: 2 }, { skill: 'wd_mianzhang', realm: 3 }],
    moves: [
      { name: '揽雀尾', text: '你双手一捋，将{foe}来势引出，顺势一按，劲发{part}。', wound: '瘀伤' },
      { name: '单鞭', text: '你侧身定势，勾手如鞭、立掌如刀，一臂横展封住{foe}半边攻势，掌沿切其{part}。', wound: '瘀伤' },
      { name: '云手', text: '你双手如云翻涌，一圈圈化去来势，反手拍中{foe}{part}。', wound: '瘀伤' },
      { name: '野马分鬃', text: '你两臂一开，如野马分鬃，掤劲逼向{foe}{part}。', wound: '瘀伤', realm: 2 },
      { name: '白鹤亮翅', text: '你一手上举一手下按，如白鹤亮翅，掌根击向{foe}{part}。', wound: '瘀伤', realm: 2 },
      { name: '搂膝拗步', text: '你搂膝进步，掌随身转，按向{foe}{part}。', wound: '瘀伤', realm: 3 },
      { name: '搬拦捶', text: '你先搬开{foe}拳，再拦住其臂，进步一捶跟上，三下连贯，正打在{foe}{part}。', wound: '内伤', realm: 3 },
      { name: '如封似闭', text: '你双手一封，将来劲闭于身外，沉掌按向{foe}{part}。', wound: '内伤', realm: 4 },
      { name: '海底针', text: '你俯身探手，如海底捞针，一指点向{foe}{part}。', wound: '内伤', realm: 5 }
    ],
    performs: [
      { name: '揽雀尾', text: '你双手一捋一带，将{foe}之力引偏，顺势绵掌按出，{part}受力不稳，劲力已被卸去大半。',
        mp: 65, cd: 2, hits: 1, dmg: [80, 110], acc: 0.8, fx: [{ kind: 'weaken', value: 15, rounds: 2 }, { kind: 'guard', value: 20, rounds: 2 }] },
      { name: '如封似闭', realm: 4, text: '你双手一封，如封似闭，将{foe}来势尽数闭于门外——封得住，闭得严，{foe}愈是催劲，愈是使不上力。',
        mp: 50, cd: 3, hits: 0, dmg: [10, 10], acc: 0.8, fx: [{ kind: 'weaken', value: 20, rounds: 3 }, { kind: 'guard', value: 25, rounds: 3 }] }
    ]
  },
  {
    id: 'wd_taijijian', name: '太极剑', grade: '绝品', category: '剑法', school: '武当', nature: '柔', reach: '短',
    desc: '武当剑法，剑意绵绵不绝。剑走轻灵，神在剑先，讲究以静制动、后发先至。',
    learn: '武当掌门亲授，与太极拳同修', teach: '真传',
    requires: [{ skill: 'wd_taijishengong', realm: 3 }, { skill: 'wd_taijiquan', realm: 2 }],
    moves: [
      { name: '三环套月', text: '你剑尖连环三绕，如三环套月，圈住{foe}来势，剑光不散。', wound: '刺伤' },
      { name: '玉女穿梭', text: '你身形一转，一剑往来穿梭，直刺{foe}{part}。', wound: '刺伤' },
      { name: '大魁星', text: '你举剑上撩，如魁星点斗，剑锋挑向{foe}{part}。', wound: '割伤' },
      { name: '燕子抄水', text: '你剑势贴地一掠，如燕子抄水，划过{foe}{part}。', wound: '割伤', realm: 2 },
      { name: '海底捞月', text: '你剑自下盘捞起，剑光如月，削向{foe}{part}。', wound: '割伤', realm: 2 },
      { name: '宿鸟投林', text: '你一剑直送，如宿鸟投林，奔赴{foe}{part}。', wound: '刺伤', realm: 3 },
      { name: '金鸡独立', text: '你独立提膝，剑势一沉，点向{foe}{part}。', wound: '割伤', realm: 3 },
      { name: '迎风掸尘', text: '你剑走轻灵，如迎风掸尘，拂过{foe}{part}。', wound: '割伤', realm: 4 },
      { name: '风扫梅花', text: '你剑光洒落，如风扫梅花，片片剑影罩住{foe}{part}。', wound: '割伤', realm: 5 }
    ],
    performs: [
      { name: '玉女穿梭', text: '你身形一转，剑如穿梭往来，剑圈一圈圈粘连不绝，{foe}出招如陷泥淖，{part}迟缓难发。',
        mp: 65, cd: 2, hits: 1, dmg: [125, 155], acc: 0.82, fx: [{ kind: 'chill', rounds: 3 }] },
      { name: '绵剑藏锋', realm: 4, text: '你剑走绵密，剑意藏而不露，连绵剑气层层裹住{foe}{part}，将其力缓缓化去。',
        mp: 70, cd: 3, hits: 1, dmg: [285, 370], acc: 0.8, fx: [{ kind: 'weaken', value: 15, rounds: 2 }] }
    ],
    combos: [
      { with: 'wd_taijiquan', name: '太极合璧', text: '你左手太极剑意绵绵，右手太极拳势圆转，剑掌相合，如环无端，{foe}无从下手。', bonus: 7, fx: [{ kind: 'heal', value: 5 }] }
    ]
  },
  {
    id: 'wd_changquan', name: '武当长拳', grade: '凡品', category: '拳法', school: '武当', nature: '中正', reach: '徒手',
    desc: '武当入门拳法。一套拳便是上山的路：从玄岳门走到金顶，冲、架、劈、砸，一步一拳，都是道家的筋骨。',
    learn: '武当入门弟子皆学', teach: '入门',
    moves: [
      { name: '玄岳门', text: '你起手推掌，如推开玄岳门，掌风直撞{foe}{part}。', wound: '瘀伤',
        lv: {
          熟: ['起手一推，像推开玄岳门那道石门，掌风平平正正，直送{foe}{part}。'],
          精: ['手掌只往前一送，玄岳门像本来就开着，那道掌风已到{foe}{part}前。'],
          化: ['掌到{part}前，像山门自己开了。']
        } },
      { name: '遇真宫', text: '你一拳递出复收回，如入遇真宫参拜，礼数里有真劲，{foe}格挡的手臂震得发麻。', wound: '瘀伤',
        lv: {
          熟: ['一拳递出复又收回，像在遇真宫前行礼，礼数周全，拳劲却趁{foe}回礼时送到{part}。'],
          精: ['那一拳只作揖到一半，{foe}分不清是礼是拳，{part}已被那分真劲悄悄罩住。'],
          化: ['拳作一揖，{part}前已多了一分无人察觉的劲。']
        } },
      { name: '太子坡', text: '你拧腰一拳，如太子坡前一折三绕，拳路弯着走，末了落在{foe}{part}。', wound: '瘀伤',
        lv: {
          熟: ['拧腰一拳，拳路像太子坡那道坡，一折三绕，弯到{foe}{part}。'],
          精: ['拳路只折了一折，{foe}顺着拳势去防那折弯处，拳已从另一面到了{part}前。'],
          化: ['拳似直走，到{part}前才轻轻一弯。']
        } },
      { name: '逍遥谷', text: '你步踏逍遥谷，拳势一缓，{foe}抢攻落空，{part}反挨一记冲捶。', wound: '瘀伤', realm: 1,
        lv: {
          熟: ['步踏逍遥谷，拳势一缓，{foe}抢进的那一步正好踏空，冲捶已从{part}前递出。'],
          精: ['拳势缓得像在山谷里闲走，{foe}抢攻落空，那记冲捶已在{part}前等着。'],
          化: ['步子一缓，{foe}抢上来时，那记冲捶已在{part}前落定。']
        } },
      { name: '紫霄宫', text: '你一拳上冲，如直上紫霄，{foe}举臂去架，腰间反倒挨了一记。', wound: '瘀伤', realm: 2,
        lv: {
          熟: ['一拳上冲，像沿山路直上紫霄，{foe}举臂去挡时，拳已到了{part}前。'],
          精: ['拳势先往上走，{foe}目光跟着那拳抬起来，拳却已从低处到了{part}前。'],
          化: ['拳往上一引，{part}前已空了。']
        } },
      { name: '南岩', text: '你拳如南岩石壁，硬架硬打，架开来势，一肘顶在{foe}{part}。', wound: '瘀伤', realm: 3,
        lv: {
          熟: ['拳架如南岩的石壁，硬架开来势，肘底那记劲已送到{foe}{part}。'],
          精: ['石壁只一靠，{foe}的来势自己撞散，肘劲已从{part}前透出。'],
          化: ['肩头一沉，如岩壁移了半寸，{part}前已多了一记肘影。']
        } },
      { name: '琼台', text: '你双拳如琼台玉阶层层递进，一连三拳，捣得{foe}{part}发闷。', wound: '瘀伤', realm: 4,
        lv: {
          熟: ['双拳如琼台玉阶，一层一层递进，三拳连成一线，直逼{foe}{part}。'],
          精: ['拳势如登琼台的玉阶，{foe}只数得出第一层，后两拳已先后到了{part}前。'],
          化: ['双拳一递，如三级玉阶在{part}前升起。']
        } },
      { name: '金顶', text: '你最后一拳全力冲出，如登金顶俯瞰群山，{foe}胸腹间如遭雷击，内里作痛。', wound: '内伤', realm: 6,
        lv: {
          熟: ['最后一拳全力冲出，如登上金顶，居高临下，拳势正压{foe}{part}。'],
          精: ['拳势如登临金顶，{foe}只觉眼前一空，那拳已从高处落到{part}前。'],
          化: ['一拳平出，像金顶上一片云影，到了{part}前才显出分量。']
        } }
    ],
    performs: [
      { name: '拗步冲拳', text: '你拗步进身，一拳冲出，拳风正打在{foe}{part}。',
        mp: 30, cd: 2, hits: 1, dmg: [90, 110], acc: 0.8,
        lv: {
          熟: ['你一招「拗步冲拳」，拗步进身，拳随步到，正撞{foe}{part}，{foe}招架的手腕一沉！'],
          精: ['你一招「拗步冲拳」，步先拗，拳后发，{foe}只防着那一步，拳已抢在步前撞上{foe}{part}！'],
          化: ['你一招「拗步冲拳」，拗步只作虚势，拳到{foe}{part}前才显出沉劲，{foe}再架已迟！']
        } },
      { name: '一拳震山门', text: '你进步发拳，一拳打在{foe}门前的石鼓上，嗡的一声山鸣——{foe}心口如遭这一记震劲，气势矮了半截。',
        mp: 30, cd: 2, hits: 1, dmg: [80, 110], acc: 0.8, fx: [{ kind: 'fear', value: 5 }],
        lv: {
          熟: ['你一招「一拳震山门」，一拳砸在{foe}{part}前的空处，嗡的一声，震劲顺着地传过去，{foe}脚下发虚！'],
          精: ['你一招「一拳震山门」，拳风落在{foe}{part}前，如石鼓嗡鸣，{foe}半边身子的劲都被震散了！'],
          化: ['你一招「一拳震山门」，不见拳到，{foe}{part}已像被石鼓的余震撞上，架子当场散了！']
        } }
    ]
  },
  {
    id: 'wd_mianzhang', name: '绵掌', grade: '良品', category: '掌法', school: '武当', nature: '柔', reach: '徒手',
    desc: '武当掌法，掌力绵软，以柔化劲。出手看似无力，中掌者当时不觉；真被缠上，后劲一浪浪涌来，越挣扎越是吃亏。',
    learn: '武当门下二三代弟子传授', teach: '外门',
    requires: [{ skill: 'wd_changquan', realm: 2 }],
    moves: [
      { name: '绵里藏针', text: '你掌势绵软，指尖却暗藏刚劲，点向{foe}{part}。', wound: '内伤' },
      { name: '软手拂云', text: '你软手轻拂，如拂流云，掌力贴上{foe}{part}。', wound: '瘀伤' },
      { name: '云中探手', text: '你自云手间探出一掌，悄没声地按向{foe}{part}。', wound: '瘀伤' },
      { name: '云封双肘', text: '你双掌如云，封住{foe}两肘，绵劲透进关节。', wound: '瘀伤', realm: 2 },
      { name: '暗吐内劲', text: '你掌面不动声色，内劲暗吐，直透{foe}{part}。', wound: '内伤', realm: 2 },
      { name: '绵掌推山', text: '你双掌前推，掌力绵密如山，压向{foe}{part}。', wound: '内伤', realm: 3 },
      { name: '后劲绵绵', text: '你一掌拍出，前劲方消后劲又至，叠向{foe}{part}。', wound: '内伤', realm: 4 },
      { name: '一拂千里', text: '你五指一拂，劲力遥遥送出，直伤{foe}{part}。', wound: '内伤', realm: 5 }
    ],
    performs: [
      { name: '绵里藏针', text: '你一掌轻按{foe}{part}，掌面绵软，内劲却如针暗吐，直伤脏腑。',
        mp: 75, cd: 1, hits: 1, dmg: [100, 120], acc: 0.85, fx: [{ kind: 'weaken', value: 12, rounds: 2 }] },
      { name: '柔化', realm: 5, text: '你以柔劲化开{foe}攻来的力道，化一分便卸一分，绵掌层层护住自身，{foe}越打越吃亏。',
        mp: 65, cd: 3, hits: 2, dmg: [100, 140], acc: 0.8, fx: [{ kind: 'guard', value: 10, rounds: 2 }] }
    ]
  },
  {
    id: 'wd_shenmen', name: '神门十三剑', grade: '上品', category: '剑法', school: '武当', nature: '中正', reach: '短',
    desc: '武当剑法，专刺手腕神门穴。剑走偏锋，一十三剑不离腕脉，中者五指酸麻，兵刃上使不出力气。',
    learn: '武当剑法精要，须过三关', teach: '外门',
    requires: [{ skill: 'wd_changquan', realm: 2 }],
    moves: [
      { name: '神门一点', text: '你剑尖一点，正中{foe}腕上神门穴，{foe}五指一麻。', wound: '刺伤' },
      { name: '刺腕截脉', text: '你剑走偏锋，绕过{foe}兵刃，直刺其手腕外侧的脉路。', wound: '刺伤' },
      { name: '剑挑腕脉', text: '你剑尖上挑，挑开{foe}腕脉，{foe}五指拿捏不住。', wound: '割伤' },
      { name: '雪拥蓝关', text: '你剑势一分一合，如雪拥蓝关，把{foe}攻势堵在剑圈之外，剑尖自雪隙里刺出。', wound: '刺伤', realm: 2 },
      { name: '迎门三刺', text: '你连出三剑，剑剑不离{foe}手腕。', wound: '刺伤', realm: 2 },
      { name: '柔云绕腕', text: '你剑如柔云绕腕，绕着{foe}手腕转了一圈，剑锋轻轻一割。', wound: '割伤', realm: 3 },
      { name: '剑锁双腕', text: '你剑影一合，封锁{foe}双腕，教他两手都使不上劲。', wound: '刺伤', realm: 3 },
      { name: '一点寒星', text: '你剑尖凝成一点寒星，疾点{foe}{part}。', wound: '刺伤', realm: 4 },
      { name: '十三连刺', text: '你剑光连闪，一十三剑连绵而出，两剑着肉，余者封路。', wound: '刺伤', realm: 5 }
    ],
    performs: [
      { name: '剑锁双腕', text: '你剑影一合，锁住{foe}双腕神门，长剑一震，{foe}虎口发麻，兵刃上的劲力去了大半。',
        mp: 25, cd: 3, hits: 1, dmg: [80, 100], acc: 0.8, fx: [{ kind: 'weaken', value: 15, rounds: 2 }] },
      { name: '十三连刺', realm: 5, text: '你剑光连闪，一十三剑连绵刺出，两剑着肉，余下的剑光封住{foe}去路，{foe}手脚都慢了下来。',
        mp: 60, cd: 2, hits: 2, dmg: [100, 135], acc: 0.78, fx: [{ kind: 'chill', rounds: 2 }] }
    ]
  },
  {
    id: 'wd_zhenwu', name: '真武除魔', grade: '绝品', category: '绝技', school: '武当', nature: '中正',
    desc: '武当剑意的极致。一剑既出，真武荡魔，剑气如江河奔涌，荡尽一切邪祟。',
    learn: '武当掌门秘传，须剑意大成', teach: '真传',
    requires: [{ skill: 'wd_taijijian', realm: 4 }],
    ult: {
      title: '真武除魔 · 杀招',
      text: '你长剑指天，周身剑意如江河奔涌，忽而一剑直落——真武荡魔，剑气化作漫天寒光，将{foe}连人带兵刃罩在光里！寒光敛去，{foe}手脚僵冷，单膝触地，长剑拄进青石板，方才没有栽倒。',
      dmg: [480, 560],
      fx: [{ kind: 'chill', rounds: 2 }, { kind: 'weaken', value: 10, rounds: 1 }]
    }
  }
];

const pack: ContentPack = { skills: SKILLS };
export default pack;
