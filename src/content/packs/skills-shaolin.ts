import type { ContentPack, SkillDef } from '../types';

/**
 * 少林的十门武功。文风与数值规则见 docs/wuxue.md。
 * id 一律以 sl_ 开头，避免和别的批次重名。修订版（Issue #53）：句式重写、考据订正、描写与机制对齐。
 *
 * 武学树（docs/menpai.md 第七节）：
 *   入门：混元一气功（内功）、罗汉拳
 *   外门：金钟罩（混元一气功融会贯通）、一苇渡江（同上）、韦陀掌、疯魔杖法（罗汉拳融会贯通）
 *   内门：拈花指（韦陀掌炉火纯青）、燃木刀法（金钟罩炉火纯青）
 *   真传：易筋经（金钟罩登堂入室）、狮子吼（混元一气功登堂入室）
 * 少林是浑厚加刚猛：护体、疗伤为主，破绽、震慑为辅。不点穴、不用火毒，那是擒拿、阴毒的路子。
 */
const SKILLS: SkillDef[] = [
  {
    id: 'sl_yijinjing', name: '易筋经', grade: '神品', category: '内功', school: '少林', nature: '中正',
    desc: '少林镇寺之宝，达摩祖师所传。行功时周身气血如江河奔涌，外可护体，内可疗伤，是天下内功的根基之一。',
    learn: '少林方丈亲传，寺中禁地参修', teach: '真传',
    requires: [{ skill: 'sl_jinzhong', realm: 4 }],
    passive: [{ kind: 'guard', value: 12 }, { kind: 'heal', value: 8 }],
    combos: [
      { with: 'sl_ranmu', name: '刀禅一体', text: '你易筋经真气透入刀身，燃木刀的热力更烈，刀锋未至，灼意已先侵人。', bonus: 5, fx: [{ kind: 'guard', value: 8 }] }
    ]
  },
  {
    id: 'sl_yiwei', name: '一苇渡江', grade: '上品', category: '轻功', school: '少林', nature: '中正',
    desc: '少林轻功，取达摩一苇渡江之意。身轻如苇，踏水不沉，练到深处，来去只在一念之间。',
    learn: '少林达摩院首座传授', teach: '外门',
    requires: [{ skill: 'sl_hunyuan', realm: 2 }],
    passive: [{ kind: 'haste', value: 13 }]
  },
  {
    id: 'sl_hunyuan', name: '混元一气功', grade: '良品', category: '内功', school: '少林', nature: '阳',
    desc: '少林入门的内功。不求速成，只讲一个「厚」字：晨钟暮鼓里吐纳打坐，气沉丹田，一层一层往上垒，垒得越厚，挨打越扛得住，伤也好得快。',
    learn: '少林入门武僧晨课所习', teach: '入门',
    passive: [{ kind: 'guard', value: 5 }, { kind: 'heal', value: 5 }],
    // 用这门内功硬接成功时的一句（docs/yangban-wuxue.md 第五节）
    resp: {
      生: ['你提起混元一气功的内力硬接下来，气息一沉，好歹接住了。'],
      熟: ['你把混元一气功一运，气沉丹田，那股力道撞上来，像撞在厚墙上，被稳稳接住。'],
      精: ['混元一气流转自如，那股力道打在身上，一层层被化去，如泥牛入海。'],
      化: ['你并不运劲，混元一气自行护住周身，那一招落下，像撞进一团绵厚的虚空。']
    }
  },
  {
    id: 'sl_jinzhong', name: '金钟罩', grade: '上品', category: '内功', school: '少林', nature: '刚',
    desc: '少林护体的硬功。内息贯注周身皮肉筋骨，练到深处，刀砍上去如撞铜钟，嗡嗡作响；气血也养得厚，挨了重手缓得过来。',
    learn: '少林罗汉堂传外门弟子', teach: '外门',
    requires: [{ skill: 'sl_hunyuan', realm: 2 }],
    passive: [{ kind: 'guard', value: 8 }, { kind: 'heal', value: 5 }]
  },
  {
    id: 'sl_luohan', name: '罗汉拳', grade: '凡品', category: '拳法', school: '少林', nature: '刚', reach: '徒手',
    desc: '少林入门拳法，一招一式规矩端严，如十八罗汉列阵。看似朴素，却是少林武功的根脚。',
    learn: '少林入门武僧皆学', teach: '入门',
    moves: [
      { name: '罗汉伏虎', text: '你沉肩坐马，一拳自腰际击出，如罗汉降虎，正捣在{foe}{part}。', wound: '瘀伤',
        lv: {
          熟: ['拳出如虎伏身一跃，沉肩坐马之势未散，拳已到{foe}{part}。'],
          精: ['一拳递出，不见起势，那分沉劲却像早伏在{foe}肩上，只等{part}撞上来。'],
          化: ['一拳落下，平平常常，{foe}只觉得{part}一沉，像一只蹲了半日的老虎，爪子慢慢落下来。']
        } },
      { name: '罗汉合掌', text: '你双拳合拢又分，如僧人合十行礼，礼未行完，双拳已撞上{foe}{part}。', wound: '瘀伤',
        lv: {
          熟: ['双掌一合一分，合时无声，分时拳风已到{foe}{part}，快得{foe}只来得及看那合十之势。'],
          精: ['合十只作虚礼，拳到半途才分开，{foe}防的是那只手掌，另一只却已到了{part}前。'],
          化: ['双掌合拢又散开，像僧人念了一句佛，那一合之势已到了{foe}{part}。']
        } },
      { name: '童子拜佛', text: '你合掌一拜，拜到一半双拳下沉，{foe}只道你在行礼，{part}已吃了结实的一撞。', wound: '瘀伤',
        lv: {
          熟: ['合掌一拜，拜到半途双拳陡沉，正奔{foe}{part}，{foe}守的仍是上头。'],
          精: ['一拜之势极诚，{foe}顺着那礼让开半步，双拳却从低处递到{part}。'],
          化: ['合掌欠一欠身，像对{foe}行礼，那双手已在{part}前落下。']
        } },
      { name: '黑熊反背', text: '你反背横摆，如黑熊挥臂，扇得{foe}{part}一阵发懵。', wound: '瘀伤', realm: 1,
        lv: {
          熟: ['反背一摆，臂风沉猛，如黑熊挥掌，扫向{foe}{part}。'],
          精: ['背身而立，像全无防备，{foe}欺近时反臂一挥，那记熊掌正候在{part}。'],
          化: ['背过身去，{foe}正要抢进，一条手臂已从肋后甩到{part}前。']
        } },
      { name: '罗汉探海', text: '你矮身探臂，一拳自下撩起，{foe}招上不防下，{part}着了个正着。', wound: '瘀伤', realm: 1,
        lv: {
          熟: ['矮身探臂，拳自下路撩起，{foe}防了上盘，{part}已被这一探逼近。'],
          精: ['身子一矮，像俯身探海，{foe}目光随之下移，那拳已从{part}底下翻起。'],
          化: ['只一矮身，{foe}眼前便空了，再寻时，那一拳已贴着{part}到了。']
        } },
      { name: '罗汉撞钟', text: '你肩背一耸，全身之力涌向拳面，{foe}如被铜钟迎面撞上，踉跄退开。', wound: '瘀伤', realm: 2,
        lv: {
          熟: ['肩背一耸，全身力道贯上拳面，像一头撞钟，闷响直逼{foe}{part}。'],
          精: ['撞钟之势只在肩上一动，拳面已到{foe}{part}，{foe}听不见钟声，只觉身子一晃。'],
          化: ['肩头微微一动，像庙里撞钟的僧人抬眼望钟，那一撞已落在{part}前。']
        } },
      { name: '翻江倒海', text: '你双拳翻搅，拳风一浪接一浪，{foe}气血被搅得翻腾。', wound: '内伤', realm: 3,
        lv: {
          熟: ['双拳翻搅，拳风一浪压一浪，把{foe}的守势搅得七零八落，浪头直扑{part}。'],
          精: ['双拳只一圈，拳风却像在水底搅动了整条江，{foe}立足不稳，{part}已被那股劲力罩住。'],
          化: ['双拳轻翻，{foe}脚下像踩空了一浪，身形一偏，{part}正好迎向那股暗劲。']
        } },
      { name: '朝天一炷香', text: '你并指如香，直上再落，一指正点{foe}{part}。', wound: '瘀伤', realm: 4,
        lv: {
          熟: ['并指如香，直上再落，指风笔直，如一线青烟升空，再落时直指{foe}{part}。'],
          精: ['一指并出，像香头一点火星，明灭之间已到{foe}{part}，那一点指风凝而不散。'],
          化: ['并指一点，像香灰落下来，轻得没有声音，那一点灰却正好落在{part}前。']
        } }
    ],
    performs: [
      { name: '罗汉伏虎', text: '你沉肩坐马，一拳捣出，拳风沉沉，{foe}抬臂硬接，整条手臂都震麻了。',
        mp: 45, cd: 1, hits: 1, dmg: [90, 110], acc: 0.8,
        lv: {
          熟: ['你一招「罗汉伏虎」，拳风沉猛如虎扑，正撞{foe}{part}，{foe}招架的手臂震得发麻！'],
          精: ['你一招「罗汉伏虎」，拳势不见起落，伏虎之力已在{foe}{part}上炸开，{foe}退了一步仍站不稳！'],
          化: ['你一招「罗汉伏虎」，不过是拳往{foe}{part}前一递，那分沉劲便像自己寻着了落处！']
        } },
      { name: '罗汉撞钟', realm: 2, text: '你肩背一耸，全身之力撞上{foe}{part}，如撞铜钟——{foe}招架的手臂震得发麻，门户露出老大空当。',
        mp: 35, cd: 2, hits: 1, dmg: [95, 130], acc: 0.8, fx: [{ kind: 'break', value: 5, rounds: 1 }],
        lv: {
          熟: ['你一招「罗汉撞钟」，全身力道撞在{foe}{part}上，如钟杵撞钟，{foe}门户被震得大开！'],
          精: ['你一招「罗汉撞钟」，肩头一送，力道已透入{foe}{part}，{foe}半个身子都像被钟声震散了！'],
          化: ['你一招「罗汉撞钟」，不闻钟声，{foe}{part}却像被一座无形铜钟迎面撞上，架子登时散了！']
        } }
    ]
  },
  {
    id: 'sl_weituo', name: '韦陀掌', grade: '良品', category: '掌法', school: '少林', nature: '刚', reach: '徒手',
    desc: '少林掌法，取护法韦陀之意。掌势沉厚，一招推出，如金刚怒目，正大刚猛。',
    learn: '少林达摩院传中级弟子', teach: '外门',
    requires: [{ skill: 'sl_luohan', realm: 2 }],
    moves: [
      { name: '韦陀托杵', text: '你双掌上托，如韦陀托杵，把{foe}来势整个托偏。', wound: '瘀伤',
        lv: {
          熟: ['双掌上托，托势沉稳，像韦陀托住金刚杵，把{foe}来势整个拨向{part}。'],
          精: ['双掌只一托，{foe}的劲力便像落在空处，那一托已顺着来势送向{part}。'],
          化: ['双掌微托，如虚拈一物，{foe}的攻势自偏，{part}门户露了出来。']
        } },
      { name: '金刚推山', text: '你双掌齐推，掌力如山，{foe}连人带架被推得倒退。', wound: '瘀伤',
        lv: {
          熟: ['双掌齐推，掌力如山压出，{foe}连人带架被推得步步倒退。'],
          精: ['双掌推出，不见用力，{foe}脚下却像踩着流沙，身子不由自主往后滑去。'],
          化: ['双掌轻轻一送，如山影移过来，{foe}脚下无根，{part}已被掌势罩住。']
        } },
      { name: '力士开山', text: '你踏进半步，掌根吐劲，如力士开山，劈在{foe}{part}。', wound: '瘀伤',
        lv: {
          熟: ['踏进半步，掌根吐劲，如力士开山，一劈直落{foe}{part}。'],
          精: ['半步踏进，掌根劲力像从地底翻起，劈向{foe}{part}时，山已开了半座。'],
          化: ['只跨半步，掌缘一落，像山石自己裂开一道缝，那分劲已到了{part}。']
        } },
      { name: '韦陀伏魔', text: '你掌势一沉，按在{foe}{part}上不动声色，暗劲已透进去三分。', wound: '内伤', realm: 2,
        lv: {
          熟: ['掌势一沉，暗劲像水浸砖缝，顺着{part}那处门户一点点渗过去。'],
          精: ['掌势一沉，像按向{part}前的水面，{foe}觉不出力道，只觉半边身子发沉。'],
          化: ['掌在{part}前轻按即离，{foe}只当没事，走出两步，才觉出半边身子发沉。']
        } },
      { name: '怒目金刚', text: '你双目一睁，喝声未起掌先到，一掌猛击{foe}{part}。', wound: '瘀伤', realm: 2,
        lv: {
          熟: ['双目一睁，喝声未起掌先到，一掌猛击{foe}{part}。'],
          精: ['目中金刚怒意一动，掌已到{foe}{part}，{foe}听见的喝声还在后头。'],
          化: ['眼帘一抬，没有怒容，也没有喝声，那一掌已到了{part}前。']
        } },
      { name: '韦陀献杵', text: '你双掌合十复分，如韦陀献杵，掌缘切在{foe}{part}。', wound: '内伤', realm: 3,
        lv: {
          熟: ['双掌合十复分，如韦陀献杵，掌缘一沉，切向{foe}{part}。'],
          精: ['合十之势才起，掌缘已从{foe}视线之外切到{part}，像杵影从眼前一晃而过。'],
          化: ['双掌一分，像供桌前递了一炷香，那杵影已落在{part}前。']
        } },
      { name: '降魔大力', text: '你双臂一圈一压，掌力如磨盘缓缓碾转，{foe}{part}越抵越沉。', wound: '瘀伤', realm: 4,
        lv: {
          熟: ['双臂一圈一压，掌力如磨盘碾转，{foe}{part}越抵越沉。'],
          精: ['双臂圈转，{foe}的力气像被磨盘牵着走，一圈一圈，{part}越来越重。'],
          化: ['双臂微转，{foe}便觉自己站在磨盘上，脚下打滑，{part}的力气自己泄了。']
        } },
      { name: '韦陀护法', text: '你双掌外分内合，掌影如护法金身立在{foe}面前，{part}尽在掌下。', wound: '内伤', realm: 5,
        lv: {
          熟: ['双掌外分内合，掌影如护法金身立在{foe}面前，{part}尽在掌下。'],
          精: ['掌影一开一合，{foe}眼前像立起一尊金身，无论从哪边进，{part}都撞在掌沿上。'],
          化: ['双掌分合之间，那尊金身只是若隐若现，{foe}每进一步，{part}便自己送进掌下。']
        } }
    ],
    performs: [
      { name: '金刚推山', text: '你双掌齐推，掌力如山压来，{foe}{part}受力不住，门户大开。',
        mp: 65, cd: 1, hits: 1, dmg: [110, 130], acc: 0.85, fx: [{ kind: 'break', value: 8, rounds: 1 }],
        lv: {
          熟: ['你一招「金刚推山」，双掌齐推，掌力如山，{foe}{part}受力不住，门户大开！'],
          精: ['你一招「金刚推山」，掌力像从山根底下翻上来，{foe}抵得住前劲，抵不住后劲，{part}门户登时洞开！'],
          化: ['你一招「金刚推山」，双掌只到{foe}{part}前一停，那山势便自己压了过去，{foe}挡无可挡！']
        } },
      { name: '韦陀护法', realm: 3, text: '你双掌外分，掌影如韦陀金身立在身前，{foe}的攻势撞上来如撞铜墙，你掌缘顺势连切其{part}两记。',
        mp: 65, cd: 3, hits: 2, dmg: [90, 120], acc: 0.8, fx: [{ kind: 'guard', value: 10, rounds: 2 }],
        lv: {
          熟: ['你一招「韦陀护法」，掌影如金身立起，{foe}的攻势撞上来如撞铜墙，掌缘顺势连切其{part}两记！'],
          精: ['你一招「韦陀护法」，金身只一晃，{foe}撞进来的力道全数弹回，{part}反挨了两记掌缘！'],
          化: ['你一招「韦陀护法」，掌影似有似无，{foe}的攻势自己撞散，{part}已被掌缘轻轻带过两下！']
        } }
    ],
    combos: [
      { with: 'sl_luohan', name: '金刚合击', text: '你罗汉拳刚猛，韦陀掌沉厚，两般少林拳掌相合，{foe}难以招架。', bonus: 5 }
    ]
  },
  {
    id: 'sl_nianhua', name: '拈花指', grade: '绝品', category: '指法', school: '少林', nature: '柔', reach: '徒手',
    desc: '少林七十二绝技之一，取世尊拈花、迦叶微笑之意。指力轻灵，举重若轻，一点之下暗劲透骨。',
    learn: '少林般若堂参悟七十二绝技', teach: '内门',
    requires: [{ skill: 'sl_weituo', realm: 3 }],
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
      { name: '拈花一笑', text: '你两指轻轻拂过{foe}{part}，一触即收，指力已透骨；周身真气随之一敛，{foe}再攻过来，如击败絮。',
        mp: 20, cd: 3, hits: 1, dmg: [80, 100], acc: 0.85, fx: [{ kind: 'guard', value: 20, rounds: 2 }] },
      { name: '顽石点头', realm: 4, text: '你屈指连弹，指风铮铮如木鱼急敲，{foe}{part}接连中招，破绽大露。',
        mp: 70, cd: 3, hits: 2, dmg: [150, 190], acc: 0.8, fx: [{ kind: 'break', value: 10, rounds: 2 }] }
    ]
  },
  {
    id: 'sl_ranmu', name: '燃木刀法', grade: '绝品', category: '刀法', school: '少林', nature: '阳', reach: '短',
    desc: '少林七十二绝技之一。刀锋所过，木毫不伤，刀上热力却已透入木纹，从里往外燃起来。练至化境，刀未及身而热气已至。',
    learn: '少林七十二绝技，须过木人巷', teach: '内门',
    requires: [{ skill: 'sl_jinzhong', realm: 3 }],
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
      { name: '燃木焚天', text: '你一刀劈出，刀气赤烈如焰，{foe}{part}衣发俱焦；刀上的热力倒灌回来，你周身热血跟着翻滚。',
        mp: 65, cd: 2, hits: 1, dmg: [170, 205], acc: 0.8, fx: [{ kind: 'rage', value: 30 }] },
      { name: '焚木成灰', realm: 4, text: '你连挥数刀，刀气交织如火网，{foe}{part}无处可避，门户大开；你越砍越热，胸中一团火直往上冒。',
        mp: 70, cd: 3, hits: 2, dmg: [145, 185], acc: 0.78, fx: [{ kind: 'break', value: 8, rounds: 2 }, { kind: 'rage', value: 15 }] }
    ]
  },
  {
    id: 'sl_fengmo', name: '疯魔杖法', grade: '上品', category: '杖法', school: '少林', nature: '刚', reach: '长',
    desc: '少林杖法，人杖合一，杖势颠狂如醉。看似散乱，实则招招藏着杀机，令人防不胜防。',
    learn: '少林达摩院传，须戒律精严', teach: '外门',
    requires: [{ skill: 'sl_luohan', realm: 2 }],
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
    learn: '少林般若堂秘传，须内力深厚', teach: '真传',
    requires: [{ skill: 'sl_hunyuan', realm: 4 }],
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
