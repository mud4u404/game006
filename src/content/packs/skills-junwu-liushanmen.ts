import type { ContentPack, SkillDef } from '../types';

/** 武学库：军伍与六扇门（本作原创，Issue #30）。军伍：浑厚主打、迅捷为辅；六扇门：擒拿主打、浑厚为辅 */

const SKILLS: SkillDef[] = [
  {
    id: 'jl_jishixinfa', name: '缉事心法', grade: '良品', category: '内功', school: '六扇门', nature: '中正',
    desc: '六扇门捕快的入门心法。缉事拿人讲究耳聪目明、气沉胆壮，练的是暗夜里也不慌的那一口气息。',
    learn: '六扇门捕快入门心法，师爷带教',
    teach: '入门',
    passive: [{ kind: 'guard', value: 8 }],
    // 用这门内功硬接成功时的一句（docs/yangban-wuxue.md 第五节）
    resp: {
      生: ['你提起缉事心法的气息硬接下来，胸口一沉，好歹接住了。'],
      熟: ['你把缉事心法一运，气沉胆壮，那一招撞上来，像撞在办案人手里的一堵墙。'],
      精: ['缉事心法的气息平平稳稳，那股力道打在身上，被一寸一寸卸到脚下，站得纹丝不动。'],
      化: ['你连气都不多喘一口，缉事心法自行护体，那一招落下，像一张状纸递进公堂，掀不起半点风浪。']
    }
  },
  {
    id: 'jl_tiejigong', name: '铁脊功', grade: '良品', category: '内功', school: '军伍', nature: '刚',
    desc: '九边将士的打底横练。脊背挺得像枪杆，气血练得像铁石，风沙里站上两个时辰，面不改色。',
    learn: '边军操练场人人过关的底子',
    teach: '入门',
    passive: [{ kind: 'guard', value: 8 }]
  },
  {
    id: 'jl_changqiang', name: '边军大枪', grade: '良品', category: '枪法', school: '军伍', nature: '刚', reach: '长',
    desc: '九边将士的枪术。没有花巧，拦、拿、扎三字练到老；一枪出去，为的是身后整条防线。',
    learn: '九边行伍枪术，队官口传身授',
    teach: '外门',
    requires: [{ skill: 'jl_changquan', realm: 1 }],
    moves: [
      { name: '中平枪', text: '你一枪平扎，高低远近都不离{foe}{part}——中平枪，枪中王。', wound: '刺伤' },
      { name: '拦拿扎', text: '你枪杆一拦一拿，封住{foe}来势，枪尖顺势扎其{part}。', wound: '刺伤' },
      { name: '白蛇吐信', text: '你手腕一抖，枪尖吐出一点寒星，直奔{foe}{part}。', wound: '刺伤' },
      { name: '苍龙摆尾', text: '你枪尾一挑，枪头自下而上摆起，如苍龙摆尾，撞向{foe}{part}。', wound: '砸伤', realm: 2 },
      { name: '灵猫捕鼠', text: '你枪走低势，贴地疾进，如灵猫捕鼠，专袭{foe}下盘，反挑其{part}。', wound: '刺伤', realm: 3 },
      { name: '力贯枪梢', text: '你腰马合一，全身劲力贯到枪梢，一枪震得{foe}{part}发麻。', wound: '砸伤', realm: 4 },
      { name: '枪挑太行', text: '你大喝一声，长枪上撩，如枪挑太行，势道沉猛，直取{foe}{part}。', wound: '砸伤', realm: 5 },
      { name: '长驱直入', text: '你踏步进枪，一枪接一枪，长驱直入，枪枪不离{foe}{part}。', wound: '刺伤', realm: 6 }
    ],
    performs: [
      { name: '枪出如墙', text: '你枪杆横扫如墙推进，逼开{foe}攻势——枪阵里护住自己，才护得住战友。', mp: 65, cd: 2, hits: 1, dmg: [110, 150], acc: 0.75, fx: [{ kind: 'guard', value: 12, rounds: 2 }] },
      { name: '枪锋挑甲', text: '你看准{foe}甲胄接缝，枪锋一挑，破甲而入，{part}防线登时洞开。', mp: 80, cd: 2, hits: 1, dmg: [120, 160], acc: 0.75, fx: [{ kind: 'break', value: 12, rounds: 2 }] }
    ],
    combos: [{ with: 'jl_pozhendao', name: '枪刀合阵', bonus: 3, text: '你枪出如墙，刀走如风，一守一攻，竟似军阵操演般严整。' }]
  },
  {
    id: 'jl_pozhendao', name: '破阵刀', grade: '上品', category: '刀法', school: '军伍', nature: '刚', reach: '短',
    desc: '马上劈砍的刀法，讲的是一刀之上有千军。招式只有劈、斩、扫、拖四路，练到熟极，刀刀都是杀招。',
    learn: '边军破阵刀法，什长以上亲授',
    teach: '内门',
    requires: [{ skill: 'jl_changqiang', realm: 2 }],
    moves: [
      { name: '破阵开路', text: '你斜肩带背一刀劈落，如破阵开路，直奔{foe}{part}。', wound: '砸伤' },
      { name: '斩马断缰', text: '你矮身一刀横斩，如斩马断缰，割向{foe}下盘，带及其{part}。', wound: '割伤' },
      { name: '横扫千军', text: '你双手握刀，横扫一片，如横扫千军，刀风扑面，卷向{foe}{part}。', wound: '割伤' },
      { name: '拖刀回斩', text: '你卖个破绽拖刀便走，{foe}抢步追来，你回身一刀正斩其{part}。', wound: '割伤', realm: 2 },
      { name: '短兵相接', text: '你欺身抢进，刀背刀刃连环磕打，逼住{foe}{part}。', wound: '砸伤', realm: 3 },
      { name: '乘风陷阵', text: '你借着前刀之势全力劈出，如乘风陷阵，一刀重过一刀，尽落{foe}{part}。', wound: '砸伤', realm: 4 },
      { name: '百战余生', text: '你刀势老辣，专拣{foe}换招的空当下手，{part}又添一道刀痕。', wound: '割伤', realm: 5 },
      { name: '气吞万里', text: '你毕生杀伐之气凝于一刀，如气吞万里如虎，轰然斩落{foe}{part}。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '破阵', text: '你连刀砍进阵脚，两刀都是同一路数，{foe}挡得第一刀，挡不住第二刀，{part}被刀锋豁开。', mp: 50, cd: 2, hits: 2, dmg: [65, 85], acc: 0.75, fx: [{ kind: 'bleed', value: 12, rounds: 3 }] },
      { name: '回马刀', realm: 3, text: '你拖刀诱敌，回身一刀得手——刀势用老，气却借这一刀喘匀了，{foe}{part}血涌不止。', mp: 50, cd: 2, hits: 1, dmg: [170, 210], acc: 0.8, fx: [{ kind: 'heal', value: 40 }] }
    ]
  },
  {
    id: 'jl_xingjunbu', name: '行军步', grade: '良品', category: '轻功', school: '军伍', nature: '刚',
    desc: '九边将士的赶路功夫。负甲行军一日百里，落脚生根，喘息不乱，追击撤退都靠它。',
    learn: '九边行伍赶路功夫，新兵操典第一课',
    teach: '入门',
    passive: [{ kind: 'haste', value: 10 }]
  },
  {
    id: 'jl_changquan', name: '军中长拳', grade: '凡品', category: '拳法', school: '军伍', nature: '刚', reach: '徒手',
    desc: '新兵操典里的拳脚。一招一式简简单单，千万人练下来，也自有一股行伍的杀伐气。',
    learn: '军中长拳，新兵操典第一课',
    teach: '入门',
    moves: [
      { name: '直进直出', text: '你一拳直进直出，不绕半分弯子，砸向{foe}{part}。', wound: '砸伤' },
      { name: '一往无前', text: '你抢步欺身，拳随风声，一往无前地连击{foe}{part}。', wound: '瘀伤' },
      { name: '短打贴身', text: '你贴身近战，肘膝并用，专挤{foe}{part}的空当。', wound: '瘀伤' },
      { name: '侧身冲捶', text: '你侧身拧腰，一记冲捶从侧面撞在{foe}{part}。', wound: '砸伤', realm: 2 },
      { name: '马步千斤', text: '你马步一沉，拳势下压，如千斤坠地，震得{foe}{part}发沉。', wound: '内伤', realm: 3 },
      { name: '双风贯耳', text: '你双拳左右一合，如双风贯耳，直冲{foe}{part}。', wound: '砸伤', realm: 4 },
      { name: '铁肘开路', text: '你抬肘横击，如铁肘开路，硬生生撞开{foe}，伤其{part}。', wound: '内伤', realm: 5 },
      { name: '军令如山', text: '你最后一拳势如军令，定而不疑，重重落在{foe}{part}。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '一往无前', text: '你不管不顾抢身猛攻，一拳快过一拳，{foe}竟被这股愣劲逼得手忙脚乱。', mp: 45, cd: 1, hits: 1, dmg: [90, 120], acc: 0.75 }
    ]
  },
  {
    id: 'jl_tieji', name: '铁骑冲阵', grade: '上品', category: '绝技', school: '军伍', nature: '刚',
    desc: '边军冲阵的杀招，融了枪刀马步的底子。一人使出来是孤胆冲阵，千万人使出来，就是铁蹄踏营。',
    learn: '边军统帅亲授，须在阵前冲杀过',
    teach: '内门',
    requires: [{ skill: 'jl_tiejigong', realm: 3 }],
    ult: {
      title: '边军 · 杀招',
      text: '你一声怒喝，拔身直进，如铁骑冲阵——枪挑、刀劈、马蹄踏，千军辟易的声势凝在一瞬间炸开，{foe}只觉天地都随蹄声翻涌，{part}重若千钧，再支撑不住！',
      dmg: [380, 460],
      fx: [{ kind: 'fear', value: 20 }]
    }
  },
  {
    id: 'jl_suolian', name: '锁链擒拿', grade: '良品', category: '手法', school: '六扇门', nature: '中正', reach: '徒手',
    desc: '六扇门捕快的拿人手段。锁、扣、别、缠四字诀，专拿关节穴道，拿住了便似上了枷锁，动弹不得。',
    learn: '六扇门捕快拿人手段，师爷带教',
    teach: '入门',
    moves: [
      { name: '锁腕', text: '你出手如锁，一把扣住{foe}手腕，反拧其{part}。', wound: '瘀伤',
        lv: {
          熟: ['出手如锁，一把扣向{foe}腕子，反手一拧，劲力全逼向{part}。'],
          精: ['手一探，像拿惯了案卷上的印，{foe}还没看清，腕子已到指间，{part}被那股拧劲罩住。'],
          化: ['抬手一搭，{foe}的腕子便像自己送进锁扣，{part}的劲力登时散了。']
        } },
      { name: '扣肘', text: '你侧身让过{foe}来势，反手扣其肘弯，压得{part}发麻。', wound: '瘀伤',
        lv: {
          熟: ['侧身让过来势，反手扣住肘弯，一压一带，{part}被压得发麻。'],
          精: ['身子只偏半寸，{foe}的来势从肩头落空，肘弯已被扣住，{part}像过了电。'],
          化: ['身形一侧，{foe}的肘弯便撞进掌心，像递呈文的人自己把腕子送到官案上。']
        } },
      { name: '别肩', text: '你抢进{foe}怀里，肩靠手别，卸其半身劲力，伤其{part}。', wound: '瘀伤',
        lv: {
          熟: ['抢进{foe}怀里，肩靠手别，卸其半身劲力，{part}受力一沉。'],
          精: ['贴进{foe}怀中，肩膀只一靠，那分劲力便从{foe}肩上卸到脚下，{part}再无着力处。'],
          化: ['肩头轻轻一碰，{foe}的半身劲力便像漏了底的米袋，一路泄到{part}。']
        } },
      { name: '缠腕翻肘', text: '你双手缠住{foe}手腕一翻，{foe}半边身子都跟着拧向{part}。', wound: '内伤', realm: 2,
        lv: {
          熟: ['双手缠住{foe}手腕一翻，{foe}半边身子都跟着拧向{part}。'],
          精: ['双手像两条细索，缠住腕子只一转，{foe}的肩肘便不听使唤，{part}被拧到尽头。'],
          化: ['两手一绕，{foe}的腕子像绕进了线轴，身子不知不觉转了半圈，{part}已抵死。']
        } },
      { name: '分筋错骨', text: '你五指如钩，拿住{foe}{part}筋络一错，{foe}痛得闷哼出声。', wound: '内伤', realm: 3,
        lv: {
          熟: ['五指如钩，直扣{foe}{part}筋络，腕底一拧，便要错开。'],
          精: ['指头按准筋络，只一捻，{foe}半边身子的气力便断了线，{part}僵在那里。'],
          化: ['指头轻轻拂过{part}，{foe}还没觉出疼，那条筋已自己缩成一团。']
        } },
      { name: '擒龙锁虎', text: '你全身滚进，连拿带锁，{foe}挣了两挣，{part}反被你制得更死。', wound: '瘀伤', realm: 4,
        lv: {
          熟: ['全身滚进，连拿带锁，{foe}挣了两挣，{part}反被制得更死。'],
          精: ['身子一滚，像缉拿惯了的老手，{foe}的挣扎反倒把自己送进锁扣，{part}越挣越紧。'],
          化: ['一个侧身，锁拿便成了，{foe}挣不挣都一样，{part}早被制得死死的。']
        } },
      { name: '带子上枷', text: '你借{foe}挣扎的力道顺势一带，如带子上枷，将其劲力全数锁进{part}。', wound: '内伤', realm: 5,
        lv: {
          熟: ['借{foe}挣扎的力道顺势一带，如带子上枷，将其劲力全数锁进{part}。'],
          精: ['顺着{foe}的力道只一带，那分挣扎反成了枷锁，越挣越紧，全数收进{part}。'],
          化: ['手腕只一引，{foe}的力气便像自己钻进枷眼，{part}再难挣动。']
        } },
      { name: '五花大绑', text: '你双手翻飞如穿花蝴蝶，{foe}四面八方都是你的手，{part}被拿得死死的。', wound: '瘀伤', realm: 6,
        lv: {
          熟: ['双手翻飞，{foe}四面八方都是你的手，{part}被拿得死死的。'],
          精: ['十指翻飞，像结网，{foe}往哪边让，锁链便往哪边多缠一道，{part}四周尽是网眼。'],
          化: ['双手轻轻收拢，{foe}像被一张看不见的网罩住，{part}已动不得半分。']
        } }
    ],
    performs: [
      { name: '拿脉封手', text: '你拿住{foe}{part}脉门一按一封，{foe}半边手臂酸麻，出手慢了半拍。', mp: 25, cd: 2, hits: 1, dmg: [80, 110], acc: 0.75, fx: [{ kind: 'busy', rounds: 1, chance: 0.4 }],
        lv: {
          熟: ['你一招「拿脉封手」，拿住{foe}{part}脉门一按一封，{foe}半边手臂酸麻，出手慢了半拍！'],
          精: ['你一招「拿脉封手」，指头按的是{part}脉门，劲力却先一步封住{foe}半边手臂，出招登时慢了！'],
          化: ['你一招「拿脉封手」，只作轻轻一搭，{foe}那半边手臂便像灌了铅，{part}再抬不起来！']
        } },
      { name: '铁壁合围', realm: 3, text: '你双手连环锁拿，护住自身门户，{foe}连番抢攻都撞在你的手上，{part}反着了一下。', mp: 40, cd: 2, hits: 1, dmg: [110, 150], acc: 0.8, fx: [{ kind: 'guard', value: 10, rounds: 2 }],
        lv: {
          熟: ['你一招「铁壁合围」，双手连环锁拿，{foe}连番抢攻都撞在你的手上，{part}反着了一下！'],
          精: ['你一招「铁壁合围」，双手像两扇铁门，{foe}攻到哪边都撞在门楣上，{part}反被带得门户大开！'],
          化: ['你一招「铁壁合围」，双手只在身前一合，{foe}的攻势便像自己撞进围栏，{part}反露了空当！']
        } }
    ],
    combos: [{ with: 'jl_tiechi', name: '公门拿诀', bonus: 4, text: '你锁链手法配着铁尺点穴，拿中带点，点中带拿，{foe}空有浑身力气使不出。' }]
  },
  {
    id: 'jl_tiechi', name: '铁尺点穴', grade: '良品', category: '奇门', school: '六扇门', nature: '中正', reach: '短',
    desc: '六扇门定罪拿人的铁尺功。尺不长不短，点的是人身大穴，点住了便如画押，赖不掉也逃不了。',
    learn: '六扇门铁尺功，老捕头逐穴亲点',
    teach: '入门',
    moves: [
      { name: '曲池', text: '你铁尺一探，正点{foe}肘间曲池穴，其{part}登时一麻。', wound: '内伤' },
      { name: '合谷', text: '你尺尾一敲，正中{foe}虎口合谷穴，兵刃几乎拿捏不住。', wound: '内伤' },
      { name: '肩井', text: '你欺身抢进，铁尺下点肩井穴，{foe}半边{part}使不上力。', wound: '内伤' },
      { name: '章门', text: '你矮身闪过{foe}攻势，铁尺反点其章门穴，{foe}闷哼一声。', wound: '内伤', realm: 2 },
      { name: '哑门', text: '你一尺点向{foe}颈后哑门穴，{foe}急忙缩颈，{part}还是着了一下。', wound: '内伤', realm: 3 },
      { name: '膻中', text: '你铁尺直进，正点{foe}膻中大穴，其{part}气血一滞。', wound: '内伤', realm: 4 },
      { name: '环跳', text: '你尺走下盘，点中{foe}环跳穴，{foe}半边身子一沉，{part}支撑不住。', wound: '内伤', realm: 5 },
      { name: '百会', text: '你腾身而起，铁尺自上而下点向{foe}百会顶门，其{part}嗡的一声。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '画押点', text: '你铁尺连晃，虚点四处大穴，最后一下实点{foe}{part}——六扇门画押，点到你服为止。', mp: 25, cd: 2, hits: 1, dmg: [70, 100], acc: 0.8, fx: [{ kind: 'busy', rounds: 1, chance: 0.5 }] },
      { name: '封脉', realm: 3, text: '你铁尺快如闪电，连点封住{foe}{part}脉路，{foe}半身酸麻，眼看要跪。', mp: 30, cd: 2, hits: 1, dmg: [100, 140], acc: 0.8, fx: [{ kind: 'busy', rounds: 1, chance: 0.6 }] }
    ]
  },
  {
    id: 'jl_zhuifeng', name: '追风步', grade: '良品', category: '轻功', school: '六扇门', nature: '中正',
    desc: '六扇门追逃拿盗的轻功。不用腾云驾雾，只求比贼人多快一步——偏偏这一步，十年功力。',
    learn: '六扇门追逃功夫，老捕头带跑三年',
    teach: '入门',
    passive: [{ kind: 'haste', value: 10 }],
    // 用这门轻功闪避成功时的一句（docs/yangban-wuxue.md 第五节）
    resp: {
      生: ['你脚下追风步一错，堪堪让开。'],
      熟: ['你足尖一点，追风步使开，身子一偏便让了过去。'],
      精: ['你身形一晃，像一阵风从对手手边掠过，那一招落了个空。'],
      化: ['你抬脚时还在原处，落脚时已在三步之外，对手那一招只追到一道风。']
    }
  },
  {
    id: 'jl_fulong', name: '缚龙索', grade: '上品', category: '鞭法', school: '六扇门', nature: '柔', reach: '长',
    desc: '六扇门擒江洋大盗的软鞭。鞭长一丈二，缠上便如龙困浅滩，是拿重犯的镇衙之物。',
    learn: '六扇门镇衙软鞭，须拿过百案方可习练',
    teach: '内门',
    requires: [{ skill: 'jl_suolian', realm: 3 }],
    moves: [
      { name: '缠字诀', text: '你软鞭一抖，鞭梢卷住{foe}{part}，一缠一绞，带得{foe}身形一歪。', wound: '割伤' },
      { name: '鞭扫流云', text: '你长鞭横扫，如鞭扫流云，逼开{foe}门户，抽其{part}。', wound: '割伤' },
      { name: '软鞭卷云', text: '你鞭走轻灵，鞭影如卷云舒展，罩向{foe}{part}。', wound: '瘀伤' },
      { name: '毒龙出洞', text: '你鞭头倏地弹出，如毒龙出洞，直点{foe}{part}。', wound: '刺伤', realm: 2 },
      { name: '回鞭卷帘', text: '你鞭势收而复返，如回鞭卷帘，自上而下罩落{foe}{part}。', wound: '割伤', realm: 3 },
      { name: '套索擒颈', text: '你鞭梢绕成圈儿甩出，套住{foe}肩颈，回手一带，锁其{part}。', wound: '瘀伤', realm: 4 },
      { name: '玉带围腰', text: '你长鞭平扫一周，如玉带围腰，紧紧勒住{foe}腰腹，伤及其{part}。', wound: '割伤', realm: 5 },
      { name: '神龙缠顶', text: '你长鞭腾空而起，如神龙缠顶，将{foe}周身大穴连同{part}一并锁住。', wound: '内伤', realm: 6 }
    ],
    performs: [
      { name: '缠字诀', text: '你长鞭疾卷，缠住{foe}手脚一收一带，{foe}站立不稳，{part}门户洞开。', mp: 45, cd: 2, hits: 1, dmg: [110, 150], acc: 0.78, fx: [{ kind: 'busy', rounds: 1, chance: 0.5 }, { kind: 'disarm', rounds: 1, chance: 0.3 }] },
      { name: '缚龙式', realm: 3, text: '你长鞭连环缠上{foe}持兵刃的手臂，一绞一夺——缚龙索下，再凶的江洋大盗也得撒手。', mp: 20, cd: 3, hits: 1, dmg: [150, 190], acc: 0.8, fx: [{ kind: 'disarm', rounds: 2, chance: 0.5 }] }
    ]
  }
];

const pack: ContentPack = { skills: SKILLS };
export default pack;
