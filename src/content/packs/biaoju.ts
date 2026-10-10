import type { ContentPack, FoeDef, FightResult, JobDef, NewsDef, NpcDef, PrepDef, RoomDef } from '../types';

/**
 * 威远镖局：镖师这个身份的示范（docs/foundation.md 第三节第六、八条；写法见 docs/content-guide.md「身份与差事」）。
 *
 * 人物与动机：
 * - 赵老镖头：威远镖局的总镖头，赵铁衣的爹。镖局吃的是信用饭，误一趟镖，十年的招牌就砸了。
 *   他肯用生人，是因为儿子在望江楼替你说了话；可规矩一条不让。
 * - 孙镖头：镖局里管试镖的，刀法扎实，下手有分寸。
 * - 老蔡：走了二十年镖的趟子手，嗓子亮，喊镖号能喊出二里地。镖车由他押着走官道，你轻身先走，到地头会齐。
 * - 钻天鹞：瓜洲镇外劫道的。家里有个瞎眼老娘，劫的都是过路客商。放了他，这条道上从此太平；送了官，他的弟兄们会记着你。
 * - 过江龙：江上的水匪头子，专劫过江的银镖。
 *
 * 入口：望江楼斗酒或请酒结识赵铁衣（旗标 biaoju_invite，在 dongguan-tavern.ts）。
 * 营生：镖师接镖 → 定一个约（几日之内送到）→ 到地头交镖，路上一场劫镖，老蔡作帮手 → 领钱。误了镖期、丢了镖，地位降一级；降到底被辞退。
 * 盼头：镖局兵器架上一口好刀，东圈门房牙子手里一处小院，价钱写明，一时买不起。
 *
 * 悬赏（游侠的营生）也放在这里做示范：府衙照壁上悬赏一栏的河贼，可以反复揭；揭榜、领赏都在照壁下的书办那里（负责人 10-09）。
 */

const ROOMS: RoomDef[] = [
  {
    id: 'biaoju', name: '威远镖局', area: '扬州城 · 东关街', region: 'yz', t: 5, map: [64, 94], nightQuiet: true,
    desc: [
      { if: { hour: { from: 21, to: 5 } },
        text: '镖局的黑漆大门上了闩，门缝里漏出一线灯光。院里两辆镖车蒙着油布，看门的老狗趴在石狮子底下，听见脚步声抬了抬眼皮。要见镖头，明儿一早再来。' },
      { if: { shenfen: 'biaoshi' }, text: '镖局的大门照旧敞着，门楣上「威远」两个金字晒得有些发白。院里停着两辆镖车，趟子手们见了你，笑着喊一声「师傅」。兵器架靠着东墙，最上头挂着一口好刀。' },
      { text: '黑漆大门敞着，门楣上悬着「威远」两个金字，门口一对石狮子被摸得发亮。院里停着两辆镖车，镖旗卷着，几个趟子手正往车上捆麻绳。兵器架靠着东墙，最上头挂着一口好刀。' }
    ],
    npcs: ['bj_zhao', 'bj_sun'], objs: ['bj_jia'],
    exits: [['街', 'cheng', '镖']],
    road: '你顺着东关街往南走，远远就看见一面杏黄镖旗在风里招展……'
  }
];

/** 老蔡在地头喊你：镖车先到一步 */
const CAI_LOOK = '五十来岁，黑瘦，一条腿有点跛，是早年替镖局挡刀落下的。腰里别着一面铜锣，手里攥着镖旗。走了二十年镖，喊镖号能喊出二里地。';

const NPCS: NpcDef[] = [
  {
    id: 'bj_zhao', name: '赵老镖头', ini: '赵', tone: 'amber', brief: '坐在堂上看镖单',
    look: '六十上下，须发花白，坐得笔直。左手少了两根指头，右手边搁着一对铁胆，转得哗哗响。堂上挂着一块匾：「信义为先」。',
    verbs: ['交谈', '观察',
      { verb: '试镖', if: { flag: 'biaoju_invite', notFlag: 'bj_joined' } },
      { verb: '赔罪', if: { flag: 'bj_joined', shenfen: 'youxia' } },
      { verb: '走瓜洲', if: { jobOpen: 'bj_gz' } },
      { verb: '走镇江', if: { jobOpen: 'bj_zj', flag: 'bj_gz_done' } }],
    actions: {
      交谈: [
        { if: { job: 'bj_gz' }, text: '赵老镖头头也不抬：「老蔡押着车走官道，你先走一步，在瓜洲镇跟他会齐。镖期两日，误不得。」' },
        { if: { job: 'bj_zj' }, text: '赵老镖头把铁胆一停：「过江那趟银镖，过江龙盯了半个月了。到了镇江大市口，银子交到银号手里，才算完。」' },
        { if: { shenfen: 'biaoshi' },
          text: '赵老镖头翻着镖单：「镖局吃的是信用饭。镖接下了，就是拿命担着；误了期、丢了镖，赵某也护不住你。」他抬眼看你：「有镖的时候，我自会叫你。」' },
        { if: { flag: 'bj_joined' },
          text: '赵老镖头把铁胆转得哗哗响：「误了镖期的人，镖局本不该再用。铁衣替你说了几回情——你要回来，当面认个错，给弟兄们一个交代。」' },
        { if: { flag: 'biaoju_invite' },
          text: '赵老镖头上下打量你：「铁衣那小子说起过你。」他把镖单一合：「想吃镖局这碗饭，先过试镖。跟孙镖头走几招，接得住，明日就跟车。」' },
        // 不收生人，也得让人知道怎样才不算生人：铁衣在望江楼（packs/dongguan-tavern.ts）
        { text: '赵老镖头看了你一眼：「托镖去柜上。镖局不收生人。」他低头翻镖单，又补了一句：「想吃这碗饭，先找个镖局里的人替你说句话。我那不成器的铁衣，成天泡在望江楼。」' }
      ],
      试镖: [
        { text: '赵老镖头朝院里扬了扬下巴。孙镖头放下手里的麻绳，从兵器架上抽了一口刀：「点到为止。」',
          do: [{ type: 'fight', foe: 'bj_shibiao' }] }
      ],
      赔罪: [
        { text: '你在堂上认了个错，给镖局上下各敬了一杯茶。赵老镖头喝了你敬的那杯，没说什么，只把一面镖旗推到你面前：「旧账不提了。从新进做起，下回别误了期。」',
          do: [{ type: 'shenfen', id: 'biaoshi' },
            { type: 'feed', tag: '江湖', text: '你给威远镖局认了错，赵老镖头重新收下了你。' }] }
      ],
      走瓜洲: [
        { text: '赵老镖头抽出一张镖单：「回春堂的一车药材，送到瓜洲镇。老蔡押车走官道，你先走一步，到地头会齐。镖期两日。」他顿了顿：「瓜洲镇外那片林子，近来不太平。」',
          do: [{ type: 'job', id: 'bj_gz' }] }
      ],
      走镇江: [
        { text: '赵老镖头的铁胆停了：「丰裕银号的一箱银子，过江送到镇江大市口。」他把镖单推过来，压低声音：「江上有个过江龙，盯这趟镖半个月了。老蔡跟着你，镖期三日。」',
          do: [{ type: 'job', id: 'bj_zj' }] }
      ]
    }
  },
  {
    id: 'bj_sun', name: '孙镖头', ini: '孙', tone: 'red', brief: '往镖车上捆麻绳',
    look: '四十来岁，膀大腰圆，一身短打，胳膊上的腱子肉一块一块的。刀不离身，刀鞘磨得油亮。',
    verbs: ['交谈', '观察'],
    actions: {
      交谈: [
        // 放了钻天鹞，他还你一回人情；还过了就两清，下回各凭本事（审查 D08：原来趟趟一声口哨就白拿）
        { if: { flag: 'bj_ztq_free', notFlag: 'bj_ztq_qing' }, text: '孙镖头啐了一口：「瓜洲那条道上的贼，你也放？」他把麻绳勒紧：「也罢，听说那条道如今太平了。镖局的规矩是送到，怎么送到，老头子不管。」' },
        { if: { flag: 'bj_ztq_guan' }, text: '孙镖头拍拍你的肩膀：「钻天鹞送了官，瓜洲那条道上的毛贼都老实了几天。不过他那几个弟兄，你往后走那条道，多留个心眼。」' },
        { if: { shenfen: 'biaoshi' }, text: '孙镖头勒紧麻绳：「走镖，三分靠刀，七分靠嘴。路上碰见拦道的，先让老蔡喊镖号，喊不住再动手。」' },
        { text: '孙镖头头也不抬：「看什么看？托镖去柜上。」' }
      ]
    }
  },
  {
    id: 'bj_jia', name: '兵器架', obj: true, icon: 'door', brief: '最上头挂着一口好刀',
    look: '一排兵器架，刀枪棍棒插得满满当当。最上头单独挂着一口刀，刀鞘是鲨鱼皮的，刀镡上錾着云纹。',
    verbs: ['观察', '细看', '购买'],
    actions: {
      细看: [{ text: '你抽出半截刀身，寒光映得人眉毛发青。孙镖头在一旁道：「龙泉来的，老头子年轻时走镖用过。作价三十两，镖局里没人买得起。」' }],
      购买: [
        { if: { item: { id: 'bj_haodao', atLeast: 1 } }, text: '刀已经在你手上了。' },
        { if: { silver: 30000 },
          text: '你把三十两银子码在案上。赵老镖头把刀摘下来，用袖子擦了擦刀鞘，双手递给你：「刀跟着识它的人。」（银两 −30000 文）',
          do: [{ type: 'silver', delta: -30000 }, { type: 'item', id: 'bj_haodao', delta: 1 },
            { type: 'feed', tag: '收获', text: '你买下了威远镖局兵器架上那口龙泉好刀。' }] },
        { text: '孙镖头笑了：「三十两，一个子儿不能少。走几年镖，攒够了再来。」' }
      ]
    }
  },
  {
    id: 'bj_cai_gz', name: '老蔡', ini: '蔡', tone: 'gray', brief: '守着镖车',
    at: { room: 'gz_town', if: { job: 'bj_gz' } },
    look: CAI_LOOK + '镖车停在回春堂门口，麻绳捆得结结实实。',
    verbs: ['交谈', '观察', '交镖'],
    actions: {
      交谈: [{ text: '老蔡朝镇外那片林子努了努嘴：「来的路上，林子里有人盯着。交了镖再说话。」' }],
      交镖: [
        { if: { flag: 'bj_ztq_guan' },
          text: '回春堂掌柜刚出来点货，镇外林子里窜出几条汉子，为首的一个黑脸膛：「钻天鹞是你送的官？今日连本带利讨回来！」老蔡一把扯开嗓子：「威——远——」',
          do: [{ type: 'fight', foe: 'bj_jie_gz2' }] },
        { if: { flag: 'bj_ztq_free', notFlag: 'bj_ztq_qing' },
          text: '镇外林子里有人吹了一声口哨，三长一短，再没动静。老蔡愣了愣：「钻天鹞的哨子……他认得你。」回春堂掌柜出来点了货，在镖单上按了手印。',
          do: [{ type: 'jobDone', id: 'bj_gz' }, { type: 'flag', flag: 'bj_ztq_qing' }] },
        { if: { flag: 'bj_ztq_qing' },
          text: '镇外林子里又是三长一短的哨子。钻天鹞从树后转出来，冲你抱了抱拳：「上回的情，还过了。今日各凭本事。」老蔡一把扯开嗓子：「威——远——」',
          do: [{ type: 'fight', foe: 'bj_jie_gz' }] },
        { text: '回春堂掌柜刚出来点货，镇外林子里窜出几条汉子，为首的一个瘦长条，手里一对短刀：「药材留下，人滚。」老蔡一把扯开嗓子：「威——远——」',
          do: [{ type: 'fight', foe: 'bj_jie_gz' }] }
      ]
    }
  },
  {
    id: 'bj_cai_zj', name: '老蔡', ini: '蔡', tone: 'gray', brief: '守着银箱',
    at: { room: 'zj_shi', if: { job: 'bj_zj' } },
    look: CAI_LOOK + '银箱用铁链锁在车上，钥匙挂在他脖子上。',
    verbs: ['交谈', '观察', '交镖'],
    actions: {
      交谈: [{ text: '老蔡压低声音：「过江的时候，有条快船一直跟着。银号就在前头，交了才算完。」' }],
      交镖: [
        { text: '银号的朝奉刚掀开门帘，街口的人群忽然分开，一个赤着膊的大汉提着分水刺走过来，身后跟着七八个水手：「过江龙在此。银子留下，镖旗折了，人可以走。」',
          do: [{ type: 'fight', foe: 'bj_jie_zj' }] }
      ]
    }
  },
  /* ---------- 悬赏：游侠的营生。榜在府衙照壁（packs/fuya.ts），揭榜、领赏找书办（packs/xuanshang.ts） ---------- */
  {
    id: 'xs_hezei', name: '河贼', ini: '贼', tone: 'red', brief: '在盐包后头鬼鬼祟祟',
    at: { room: 'dukou', if: { job: 'xs_hezei', notFlag: 'xs_hezei_caught', hour: { from: 19, to: 5 } } },
    look: '短衣赤脚，腰里插一把尖刀，正往一只麻袋里塞漕船上卸下来的货。听见脚步声，他把麻袋往身后一藏。',
    verbs: ['观察', '动手'],
    actions: {
      动手: [{ text: '你从盐包后头转出来。河贼一惊，拔出尖刀就扑。', do: [{ type: 'fight', foe: 'xs_hezei' }] }]
    }
  },
  /* ---------- 盼头：东圈门的房牙子 ---------- */
  {
    id: 'bj_yazi', name: '房牙子', ini: '牙', tone: 'jade', brief: '手里捏着一沓房契',
    at: { room: 'yz_dongquan' },
    look: '瘦小精干，一双眼睛滴溜溜地转，袖子里揣着一沓房契，见人就往上凑。',
    verbs: ['交谈', '观察', '买院子'],
    actions: {
      交谈: [
        { if: { flag: 'yz_xiaoyuan' }, text: '房牙子作了个揖：「东家，院里那棵枇杷今年结得好，小的替您看着呢。」' },
        { text: '房牙子凑过来：「客官要置业？东圈门里有一处小院，两进，带一口井一棵枇杷，作价二百两。」他打量你一眼，笑道：「客官先攒着，小的给您留意着。」' }
      ],
      买院子: [
        { if: { flag: 'yz_xiaoyuan' }, text: '「东家已经有一处了，再买就是置产业了。」房牙子笑得见牙不见眼。' },
        { if: { silver: 200000 },
          text: '你把二百两银票拍在桌上。房牙子手都抖了，连夜请了中人写契：「东家，从今往后，扬州城里您有个落脚的地方了。」（银两 −200000 文）',
          do: [{ type: 'silver', delta: -200000 }, { type: 'flag', flag: 'yz_xiaoyuan' },
            { type: 'feed', tag: '收获', text: '你在扬州东圈门里买下了一处小院，两进，带一口井一棵枇杷。' }] },
        { text: '房牙子把房契往袖子里一揣：「二百两，客官。」他倒也不恼：「小的给您留着，跑不了。」' }
      ]
    }
  }
];

/** 老蔡作帮手：趟子手的本事不大，胜在不要命 */
const CAI: PrepDef = {
  if: { any: [{ job: 'bj_gz' }, { job: 'bj_zj' }] },
  text: '老蔡把镖车往路边一横，抡起镖旗杆子站在你身后：「威远镖局的镖，也敢劫？」',
  ally: { name: '老蔡', share: 0.2, at: [3, 8, 13],
    say: [
      '老蔡抡起镖旗杆子，照着对手后腰就是一下。对手回身一刀，老蔡就地一滚，躲到了镖车后头。',
      '老蔡敲响铜锣，一嗓子「威远——」喊得对手耳朵嗡嗡响，脚下慢了半拍，挨了你一下。',
      '老蔡从镖车上抄起一捆麻绳甩过去，缠住了对手的脚踝，扯得他一个趔趄。'
    ] },
  story: '趟子手老蔡抡着镖旗杆子在旁边帮衬。'
};

const LOST_GZ: FightResult = {
  tag: '劫镖', title: '药材被劫', button: '起身',
  story: '等你爬起来，镖车已经空了。老蔡一瘸一拐地追出去半里地，回来时手里只攥着半截镖旗。回春堂掌柜叹了口气，转身上了门板。这趟镖，砸了。',
  do: [{ type: 'heal', hpAtLeast: 0.3 }, { type: 'jobFail', id: 'bj_gz' }]
};

const LOST_ZJ: FightResult = {
  tag: '劫镖', title: '银镖被劫', button: '起身',
  story: '过江龙扛起银箱，大笑着上了快船。老蔡追到江边，只看见一条白浪越去越远。丰裕银号的朝奉当街就骂开了：「威远镖局？往后谁还敢托镖！」',
  do: [{ type: 'heal', hpAtLeast: 0.3 }, { type: 'jobFail', id: 'bj_zj' }]
};

const FOES: FoeDef[] = [
  {
    id: 'bj_shibiao', name: '孙镖头', title: '试镖', ini: '孙', tone: 'red', weapon: '雁翎刀', ws: '刀', tag: '试镖',
    nature: '刚', reach: '短', rank: 0.8, build: 'outer', spar: true, rounds: 30, firstTell: 3,
    moves: ['缠头裹脑', '拦腰一刀', '劈山式', '顺水推舟'],
    flourish: ['刀背一翻，横拍过来', '一刀斜劈，收得干干净净', '刀走中宫，直取胸前', '脚下踏着镖局的青砖，步步逼近'],
    tells: [
      { name: '开门见山', text: '孙镖头双手握刀，脚下一沉，刀举过顶……', dom: 'li', after: '刀锋停在离地三寸的地方，院里的青砖裂了一道缝。' },
      { name: '回马刀', text: '孙镖头佯装后退，刀藏在身后……', dom: 'qiao', after: '刀光从他腋下翻出来，绕了个弯。' }
    ],
    asides: ['几个趟子手放下手里的活，围过来看热闹。', '赵老镖头在堂上转着铁胆，眼皮都没抬。', '院里的镖旗被风吹得哗哗响。'],
    opening: ['刀势用老了', '回刀稍慢', '脚下一滑'],
    intro: '孙镖头把刀横在胸前：「镖局的刀，不讲花哨。接得住三十招，就算你过了。」',
    win: '孙镖头收刀后退，抱了抱拳：「好身手。」院里的趟子手们一阵叫好。',
    lose: '孙镖头的刀背轻轻拍在你肩上：「差了点火候。练练再来。」',
    results: {
      win: { tag: '试镖 · 过', title: '吃上镖局的饭', button: '谢过赵老镖头',
        story: '赵老镖头从堂上走下来，把一面小小的镖旗塞进你手里：「从新进做起。误一趟镖降一级，降到底，就别再进这个门。」老蔡在一旁咧嘴笑：「往后咱们一块儿走。」',
        do: [{ type: 'flag', flag: 'bj_joined' }, { type: 'shenfen', id: 'biaoshi' },
          { type: 'rel', npc: 'bj_zhao', value: '点头之交', from: ['素不相识'], note: '威远镖局的总镖头，收你做了镖师' }] },
      lose: { tag: '试镖', title: '差了火候', button: '回头再来',
        story: '孙镖头把刀插回架上：「刀法是练出来的，不是想出来的。」赵老镖头没说什么，只朝门口抬了抬下巴。',
        do: [{ type: 'heal', hpAtLeast: 0.5 }] }
    }
  },
  {
    id: 'bj_jie_gz', name: '钻天鹞', title: '劫道的', ini: '鹞', tone: 'red', weapon: '双短刀', ws: '刀', tag: '劫镖',
    nature: '阴', reach: '短', rank: 1, build: 'light', firstTell: 2,
    moves: ['燕子三抄水', '鹞子翻身', '双刀剪', '贴地滚'],
    flourish: ['双刀一错，贴着你的手腕削过', '身子一矮，从镖车底下钻过来', '一纵身上了车辕', '左刀虚晃，右刀直扎'],
    tells: [
      { name: '鹞子钻天', text: '钻天鹞忽然往后一纵，人已上了树梢……', dom: 'su', after: '他从树梢上一头扎下来，双刀直取你的后颈。' },
      { name: '双刀剪喉', text: '钻天鹞双刀交叉，护在胸前，一步步逼近……', dom: 'qiao', after: '双刀一张一合，剪向你的咽喉。' }
    ],
    asides: ['回春堂掌柜躲在门板后头，只露出一只眼睛。', '茶摊上的闲汉一哄而散。', '拉车的骡子惊得直刨蹄子。'],
    opening: ['落地时晃了一晃', '双刀收得慢了', '贪功冒进'],
    intro: '钻天鹞把双刀在手里转了个花：「镖局的人？那更好，药材之外，再添一面镖旗。」',
    win: '你一脚踢飞他左手的刀，剑尖抵住他的咽喉。钻天鹞喘着粗气，右手的刀也松开了。',
    lose: '钻天鹞一刀划过你的肋下，你踉跄着倒在镖车边。他的弟兄们七手八脚地卸下了药材。',
    prep: [CAI],
    results: {
      win: { tag: '劫镖 · 胜', title: '镖到地头', button: '收下镖银',
        story: '回春堂掌柜点了货，一箱不少，在镖单上按了手印。老蔡把镖旗往车上一插，咧嘴笑：「这趟镖，干净。」',
        do: [{ type: 'jobDone', id: 'bj_gz' }, { type: 'flag', flag: 'bj_gz_done' }],
        after: {
          plea: '钻天鹞跪在地上，两把刀扔得远远的：「好汉饶命……家里还有个瞎眼的老娘，劫的都是过路客商，没伤过人命。」',
          opts: [
            { label: '放他走', sub: '这条道上，往后或许太平',
              say: '你踢开他的刀：「往后别在这条道上劫镖。」钻天鹞磕了个头，钻进林子里不见了。',
              do: [{ type: 'flag', flag: 'bj_ztq_free' }, { type: 'xia', delta: 2 }],
              later: '下回再走瓜洲这趟镖，林子里或许只会有一声口哨。孙镖头未必赞成。' },
            { label: '送官', sub: '侠义 +3',
              say: '你把他捆了，交给了瓜洲镇的巡检。钻天鹞一路骂骂咧咧，说他的弟兄不会放过你。',
              do: [{ type: 'flag', flag: 'bj_ztq_guan' }, { type: 'flag', flag: 'bj_ztq_free', value: false }, { type: 'xia', delta: 3 }],
              later: '他的弟兄们还在这条道上。下回走瓜洲，劫镖的还会来。' }
          ]
        } },
      lose: LOST_GZ,
      flee: LOST_GZ
    }
  },
  {
    id: 'bj_jie_zj', name: '过江龙', title: '江上水匪', ini: '龙', tone: 'blue', weapon: '分水刺', ws: '刺', tag: '劫镖',
    nature: '刚', reach: '短', rank: 2.3, build: 'outer', firstTell: 2,
    moves: ['翻江倒海', '分水穿浪', '倒拔垂杨', '浪里白条'],
    flourish: ['分水刺一抖，直扎你的小腹', '赤着的膀子上青筋暴起', '一记肘锤砸过来', '脚下踩着湿漉漉的青石，稳得像钉子'],
    tells: [
      { name: '翻江倒海', text: '过江龙双刺交叉，深吸一口气，胸膛鼓得像面鼓……', dom: 'li', after: '双刺齐出，带起一阵腥风，街边的货摊被扫翻了一片。' },
      { name: '浪里穿梭', text: '过江龙身子一伏，像条大鱼似的往你脚下钻……', dom: 'su', after: '分水刺贴着地皮扫过来，专扎脚踝。' },
      { name: '倒拔垂杨', text: '过江龙一把抓住你的衣襟，膀子上的肉一块块绷起来……', dom: 'li', after: '他要把你整个人抡起来往地上摔！' }
    ],
    asides: ['大市口的人群挤在远处，没人敢出声。', '京口驻军的兵丁远远看着，手按在刀上，却没动。', '银号的朝奉抱着门框直哆嗦。'],
    opening: ['双刺扎得太深，一时拔不回来', '换气时胸口一空', '脚下踩了一摊醋，滑了一下'],
    intro: '过江龙把分水刺在手里一磕：「威远镖局，好大的名头。今日这面镖旗，老子折定了。」',
    win: '过江龙的分水刺脱手飞出，钉在了银号的门板上。他捂着肩膀退了两步，一挥手，水手们抬着他就往江边跑。',
    lose: '过江龙一肘砸在你胸口，你眼前一黑，倒在银箱边上。',
    prep: [CAI],
    results: {
      win: { tag: '劫镖 · 胜', title: '银镖过江', button: '收下镖银',
        story: '银号的朝奉亲自开箱点银，一锭不少，当场写了回执。老蔡把回执揣进怀里，拍了又拍：「过江龙都折在你手里，回去老头子要请你喝酒。」',
        do: [{ type: 'jobDone', id: 'bj_zj' }, { type: 'standing', delta: 1 }] },
      lose: LOST_ZJ,
      flee: LOST_ZJ
    }
  },
  {
    id: 'xs_hezei', name: '河贼', title: '运河上的毛贼', ini: '贼', tone: 'gray', weapon: '尖刀', ws: '刀', tag: '悬赏',
    nature: '阴', reach: '短', rank: 0.6, build: 'light', firstTell: 3,
    moves: ['乱扎', '就地十八滚', '扬沙', '反手一刀'],
    flourish: ['尖刀乱扎', '抓起一把沙子扬过来', '贴着盐包绕圈子', '一脚踹翻了个箩筐'],
    tells: [
      { name: '扬沙迷眼', text: '河贼弯腰抓了一把沙土，攥在手里……', dom: 'qiao', after: '一把沙子劈头盖脸扬过来，尖刀跟在后头。' },
      { name: '狗急跳墙', text: '河贼退到了水边，眼珠子发红……', dom: 'su', after: '他猛地扑上来，尖刀直扎你心窝。' }
    ],
    asides: ['漕船上的灯笼晃了一晃。', '缆桩边的船夫被惊醒了，探出头来。', '河水拍着码头，哗啦哗啦地响。'],
    opening: ['脚下一绊', '刀扎空了', '回头张望退路'],
    intro: '河贼把尖刀横在胸前，眼睛却往水里瞟：「少管闲事！」',
    win: '你一脚踩住他拿刀的手，河贼「哎哟」一声，老老实实趴在了地上。',
    lose: '河贼一刀划破你的袖子，趁你一愣，扑通一声跳进了运河。',
    results: {
      win: { tag: '悬赏 · 胜', title: '拿住河贼', button: '押他去府衙',
        story: '你用他自己的裤腰带把他捆了。漕船上的船夫们跑过来，七嘴八舌地认赃。这贼得押去府衙，才领得到赏。',
        do: [{ type: 'flag', flag: 'xs_hezei_caught' }] },
      lose: { tag: '悬赏', title: '贼跳了河', button: '回到渡口',
        story: '河面上冒了几个泡，再没动静。他水性好，跑不远——明晚多半还得上岸。',
        // 跳了河，今夜不会再上岸
        do: [{ type: 'heal', hpAtLeast: 0.3 }, { type: 'away', npc: 'xs_hezei', hours: 12 }] },
      flee: { tag: '悬赏', title: '你退开了', button: '回到渡口',
        story: '你退到缆桩后头。河贼也不追，扛起麻袋，一猫腰钻进了漕船底下的黑影里。今夜他是不会再露头了。',
        do: [{ type: 'away', npc: 'xs_hezei', hours: 12 }] }
    }
  }
];

/** 钻天鹞送了官以后，来劫镖的是他的弟兄：本事差不多，没有「胜负以后」，每趟都来 */
const ZTQ = FOES.find(f => f.id === 'bj_jie_gz')!;
FOES.push({
  ...ZTQ, id: 'bj_jie_gz2', name: '黑脸汉子', title: '钻天鹞的弟兄', ini: '黑', weapon: '朴刀', ws: '刀', nature: '刚', build: 'outer',
  moves: ['劈柴刀', '泼风刀', '拦路虎', '横扫'],
  flourish: ['朴刀抡圆了劈下来', '一刀砍在车辕上，木屑乱飞', '刀背一磕，震得你虎口发麻', '嘴里骂骂咧咧，刀却不慢'],
  tells: [
    { name: '泼风刀', text: '黑脸汉子把朴刀抡过头顶，转了一圈又一圈……', dom: 'li', after: '刀借着转圈的势劈下来，车辕被砍断了半截。' },
    { name: '拖刀计', text: '黑脸汉子拖着刀往后退，刀尖在地上划出一道沟……', dom: 'qiao', after: '他猛一回身，刀从下往上撩过来。' }
  ],
  intro: '黑脸汉子把朴刀往地上一顿：「钻天鹞的账，今日跟你算清。」',
  win: '你一剑挑开他的朴刀，他踉跄着退到林子边上，招呼弟兄们一溜烟跑了。',
  lose: '黑脸汉子一刀背砸在你背上，你扑倒在镖车边。他的弟兄们七手八脚地卸下了药材。',
  results: {
    win: { tag: '劫镖 · 胜', title: '镖到地头', button: '收下镖银',
      story: '回春堂掌柜点了货，一箱不少，在镖单上按了手印。老蔡往林子那边啐了一口：「钻天鹞那伙人，怕是没完没了。」',
      do: [{ type: 'jobDone', id: 'bj_gz' }] },
    lose: LOST_GZ,
    flee: LOST_GZ
  }
});

const JOBS: JobDef[] = [
  { id: 'bj_gz', shenfen: 'biaoshi', tier: 1, title: '护一车药材去瓜洲镇回春堂', npc: 'bj_cai_gz', at: 'gz_town', days: 2,
    xian: [
      { npc: 'bj_cai_gz', at: 'gz_town', if: { job: 'bj_gz' }, text: '老蔡押着镖车走官道，在瓜洲镇回春堂门口等着会齐。' }
    ] },
  { id: 'bj_zj', shenfen: 'biaoshi', tier: 2, title: '押一箱银子过江，交到镇江大市口', npc: 'bj_cai_zj', at: 'zj_shi', days: 3, again: 5,
    xian: [
      { npc: 'bj_cai_zj', at: 'zj_shi', if: { job: 'bj_zj' }, text: '老蔡跟着镖车过江，银子要当面交到镇江大市口。' }
    ] },
  // 榜上揭的：在照壁下的书办那里揭、那里交差（负责人 10-09：书办是唯一的登记人）；周捕头不管这张榜
  { id: 'xs_hezei', shenfen: 'youxia', tier: 1, title: '拿运河渡口的河贼，押回府衙领赏', npc: 'xsb_zhuren', at: 'yz_zhaobi', days: 3, bang: true,
    xian: [
      { npc: 'xs_hezei', at: 'dukou', if: { job: 'xs_hezei', notFlag: 'xs_hezei_caught' }, text: '那贼入夜才上岸，在运河渡口的盐包后头出没。' }
    ] }
];

const NEWS: NewsDef[] = [
  { if: { flag: 'bj_joined' }, text: '威远镖局新收了个镖师，听说是赵少镖头在望江楼斗酒斗来的。', who: ['镖师', '小二', '掌柜'], about: 'you' },
  { if: { flag: 'bj_ztq_free', notFlag: 'bj_ztq_qing' }, text: '瓜洲镇外那片林子近来太平了。有人说钻天鹞回家伺候老娘去了。', who: ['渔家', '船夫', '脚夫'] },
  { if: { flag: 'bj_ztq_guan' }, text: '钻天鹞关进了瓜洲巡检司。他那几个弟兄放出话来，要找威远镖局算账。', who: ['渔家', '船夫', '镖师', '捕快'] },
  { if: { flag: 'yz_xiaoyuan' }, text: '东圈门里那处带枇杷树的小院，听说卖给了一位江湖上的少年。', who: ['牙子', '掌柜', '货郎'], about: 'you' }
];

const pack: ContentPack = {
  rooms: ROOMS, npcs: NPCS, foes: FOES, news: NEWS, jobs: JOBS,
  items: [
    { id: 'bj_haodao', name: '龙泉刀', kind: '装备', price: 30000, desc: '鲨鱼皮的刀鞘，刀镡上錾着云纹。赵老镖头年轻时走镖用过的刀。',
      equip: { slot: '兵器', weapon: '刀', reach: '短', grade: '上品', stats: { chushou: 4 } } }
  ]
};

export default pack;
