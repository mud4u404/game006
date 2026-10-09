import type { Cond, ContentPack, Effect, FightResult, FoeDef, ItemDef, NewsDef, NpcDef, QuestDef, RoomDef } from '../types';

/**
 * 拜师：在扬州就能拜师学艺。三派一馆：丐帮扬州分舵、六扇门、边军，加上东关街的广陵武馆。
 * 规矩见 docs/menpai.md 第七节，写法见 docs/content-guide.md「拜师」。以后给别的门派写山门，照这里的样子写：
 *   拜师的动作（条件 noSect，身在别派的另写一个分支）→ 入门考验（切磋或办一件事）→ 拜入（效果 sect），当场告诉门规
 *   → 传艺（「请教」，一门武功一个分支，带 canLearn 和 notLearned）→ 升地位（「考校」，条件写清，效果 sect 升一级）。
 * id 一律以 bs2_ 开头（bs_ 已经是官道帮手 bangshou-guandao.ts 在用）。
 *
 * 人物与动机：
 * - 卢馆主：广陵武馆的馆主。东关街的后生十个里有三个去汪家盐号当了打手；他教拳收钱，图吃饭，
 *   也图拳头长在后生身上，往哪儿打，有人教。教的是江湖散学，不拜师、不论门户，交学费、下苦功就教。
 * - 石墩：武馆的大徒弟，憨，力气大。想去投军，又舍不得只剩他一个徒弟的师父。陪人喂招，一天挨几十拳。
 * - 鲍四：丐帮扬州分舵舵主，六袋弟子。今年运河发大水，茱萸湾、邵伯的灾民逃进城来讨饭，汪家盐号嫌叫化子挡道，
 *   见一个打一个。分舵缺能护人的人手，可他收人先看心：入门先讨一顿饭，不许花钱，不许亮兵刃，不许报名号。
 * - 胡婶：东关街卖烧饼的寡妇，卖不完的饼晚上都给小叫化。她的摊子是丐帮的眼睛，街上的事半个时辰就传到龙王庙。
 * - 秦教头：扬州府的捕快教头，当年追贼从城墙上跳下来摔瘸了腿。府里的捕快多是花钱买的缺，只会收规费；
 *   他想给六扇门留几个真能拿人的，只考周捕头举荐的人。
 * - 韩什长：边军的老什长，跟着冯校尉在官道募兵。九边的新兵头一年埋掉一半，他考人、教人，是想让娃娃们多活几个。
 *
 * 两难与代价：
 * - 一人一师门：拜了一家，别家的门就关上了。
 * - 丐帮：讨饭要放下脸面（胆魄够的唱一段莲花落，脸皮薄的站一个多时辰）；替胡婶帮工，是挣不是讨，鲍四也收，算净衣一路；
 *   花钱买饼最省事，可瞒不过丐帮的眼睛，要空着手再去一回。东关街巷子里杀过讨饭孩子的人，丐帮不收。
 *   丐帮门规宽，可阴毒、吸人内力的功夫不许碰。入门先传百衲功（良品内功，叫化子憋住的一口硬气），
 *   记名弟子换上它，莲花掌、逍遥游的绝招就使得出；升了外门（八步赶蝉练到略有小成、侠义二十），
 *   再传混天气功（百衲功练到略有小成）、缠丝擒拿手（莲花掌练到略有小成）。
 * - 六扇门：拿下草上飞或劝他自首，周捕头才举荐；放走了他，就得凭侠义另找门路。恶名在外的不收。
 *   入了门是官府的人，门规森严，在门期间只学本门功夫和江湖散学。
 * - 军伍：先在冯校尉的名册上画押，名字入了官府的册子，日后征调不得推脱。体魄够的扛石锁，不够的挨三十杆。
 *   门规森严，军令如山，逃了算逃兵。铁脊功、军中长拳都练到略有小成，考校过了升正兵，才摸得着枪。
 * - 武馆：交学费、花时辰；形意拳不教生手，先把太祖长拳练到略有小成。
 *
 * 世界记得：丐帮读小毛贼的下场（ly_xiaozei_dead、ly_xiaozei_beat、ly_ajiu），六扇门读草上飞一案（csf_surrender、csf_caught、csf_freed），
 * 韩什长读投军少年陶小乙的下场（gd_bao、gd_chu）。拜入、升地位、买饼被撵、赢了石墩，各有传闻。
 */

/* ---------- 地点 ---------- */

const ROOMS: RoomDef[] = [
  {
    id: 'bs2_wuguan', name: '广陵武馆', area: '扬州城 · 东关街', region: 'yz', t: 5, map: [38, 94], nightQuiet: true,
    desc: [
      { if: { hour: { from: 21, to: 5 } },
        text: '武馆的院门虚掩着，馆主早回家了。院里的木桩、石锁黑黢黢地立着，只有廊下一盏油灯，石墩就着灯光给自己手上的裂口抹药油。' },
      { text: '东关街拐进一条窄巷，黑漆门上挂着块旧匾「以武会友」，匾角叫虫蛀了。院里立着两排木桩，石锁、沙袋摆了一地，一个大个子正对着木桩一拳一拳地砸，木屑乱飞。' }
    ],
    npcs: ['bs2_lu', 'bs2_shidun'], objs: ['bs2_wg_jia'],
    exits: [['街', 'cheng', '馆']],
    road: '你从东关街拐进窄巷，老远就听见院里砰砰的砸桩声……'
  },
  {
    id: 'bs2_longwang', name: '龙王庙', area: '扬州 · 运河堤', region: 'yz', t: 15, map: [92, 52],
    desc: [
      { if: { flag: 'bs2_gb_in' },
        text: '运河堤下的破庙，龙王爷的金身剥得只剩泥胎。叫化子们挤在稻草堆里烤火，见你进来，往旁边挪了挪，给你让出火边一块地方。铁锅里的粥咕嘟咕嘟冒着泡。' },
      { text: '运河堤下一座破庙，龙王爷的金身剥得只剩泥胎，供桌缺了一条腿，拿砖头垫着。殿里铺着稻草，十几个叫化子挤在一处烤火，豁了边的铁锅里煮着一锅稀粥。' }
    ],
    npcs: ['bs2_bao', 'bs2_xjh'],
    exits: [['西', 'dukou', '东']],
    road: '你出了渡口，沿运河堤往东走了一里来地，河风里飘来一股柴烟味……',
    onEnter: [
      { if: { notFlag: 'bs2_lw_seen' },
        do: [{ type: 'flag', flag: 'bs2_lw_seen' }, { type: 'feed', tag: '江湖', text: '运河堤下的龙王庙里住着一窝叫化子。背着六只口袋的那个跛子，是丐帮扬州分舵的舵主。' }] }
    ]
  }
];

/* ---------- 拜入时的效果：门规写进见闻，玩家随时翻得到 ---------- */

const GB_JOIN: Effect[] = [
  { type: 'item', id: 'bs2_shaobing', delta: -1 },
  { type: 'quest', id: 'bs2_gb_kao', stage: 1 },
  { type: 'sect', school: '丐帮', rank: '记名' },
  { type: 'flag', flag: 'bs2_gb_in' },
  { type: 'rel', npc: 'bs2_bao', value: '相谈甚欢', from: ['素不相识', '点头之交'], note: '丐帮扬州分舵舵主，收你做了记名弟子' },
  { type: 'feed', tag: '江湖', text: '你拜入丐帮，做了扬州分舵的记名弟子。帮规三条：不偷，不欺穷苦，讨来的饭先分给饿着的。门规宽，别家的功夫尽可学，阴毒害人、吸人内力的功夫不许碰。' },
  { type: 'toast', text: '拜入丐帮 · 记名弟子' }
];

const LSM_JOIN: Effect[] = [
  { type: 'sect', school: '六扇门', rank: '记名' },
  // 身份：捕快（engine/shenfen.ts）。腰牌能盘问人人；海捕文书上的人犯见 packs/liushanmen.ts
  { type: 'shenfen', id: 'bukuai' },
  { type: 'flag', flag: 'bs2_lsm_in' },
  { type: 'item', id: 'bs2_yaopai', delta: 1 },
  { type: 'item', id: 'bs2_tiechi', delta: 1 },
  { type: 'rel', npc: 'bs2_qin', value: '相谈甚欢', from: ['素不相识', '点头之交'], note: '扬州府的捕快教头，考校过你的身手' },
  { type: 'feed', tag: '江湖', text: '你做了六扇门的记名捕快，领了腰牌、铁尺。门规：拿人不杀人，人犯交给律法；不收贼赃；不私放人犯。门规森严，在门期间只学本门功夫和江湖散学。' },
  { type: 'toast', text: '拜入六扇门 · 记名弟子' }
];

const JW_JOIN: Effect[] = [
  { type: 'sect', school: '军伍', rank: '记名' },
  { type: 'flag', flag: 'bs2_jw_in' },
  // 安家银进了营才发（审查 C08、D07：原来募兵画个押就白拿三两）
  { type: 'silver', delta: 300 },
  { type: 'rel', npc: 'bs2_han', value: '相谈甚欢', from: ['素不相识', '点头之交'], note: '边军的老什长，收你做了记名兵' },
  { type: 'feed', tag: '江湖', text: '你投了边军，做了韩什长手下的记名兵。军令如山：调你去哪儿就得去哪儿，逃了算逃兵。门规森严，在营里只练军中的功夫和江湖散学。' },
  { type: 'toast', text: '投身军伍 · 记名弟子 · 安家银三百文' }
];

const GB: Cond['sect'] = { school: '丐帮' };
const GB_OUT: Cond['sect'] = { school: '丐帮', rank: '外门' };
const LSM: Cond['sect'] = { school: '六扇门' };
const JW: Cond['sect'] = { school: '军伍' };
const JW_OUT: Cond['sect'] = { school: '军伍', rank: '外门' };
const KAO_GB = 'bs2_gb_kao';

/* ---------- 人物 ---------- */

const NPCS: NpcDef[] = [
  /* ---------- 广陵武馆：江湖散学，交学费、花时辰就教 ---------- */
  {
    id: 'bs2_lu', name: '卢馆主', ini: '卢', tone: 'amber', brief: '背着手看徒弟砸桩',
    look: '五十来岁，个子不高，两条胳膊却比常人粗一圈，指节上全是老茧。青布短褂洗得发白，袖口挽到肘上，露出一道道旧疤。',
    verbs: ['交谈', '观察',
      { verb: '学长拳', if: { notLearned: 'jh_taizu' } },
      { verb: '学谭腿', if: { notLearned: 'jh_tantui' } },
      { verb: '学刀法', if: { notLearned: 'jh_wuhu' } },
      { verb: '学形意', if: { notLearned: 'jh_xingyi' } }],
    actions: {
      交谈: [
        { if: { learned: 'jh_xingyi' },
          text: '卢馆主拍拍你的肩：「形意拳，起如钢锉，落如钩竿。我能教的都教了，往后是你自己的拳。」他望着院里的木桩，「东关街的后生都像你这样肯下苦功，汪家盐号就招不到打手了。」' },
        { if: { any: [{ learned: 'jh_taizu' }, { learned: 'jh_tantui' }, { learned: 'jh_wuhu' }] },
          text: '卢馆主背着手看你打了一趟拳：「架子有了，劲还散。拳是打出来的，不是看出来的——找石墩喂招去。」' },
        { text: '卢馆主背着手：「学拳？广陵武馆教的是江湖上流传的散手：太祖长拳、谭腿、五虎断门刀。不拜师，不论门户，交了学费，下了苦功，就是你的。」他朝巷口努努嘴，「东关街的后生，十个里有三个去盐号当了打手。拳头长在身上，往哪儿打，总得有人教。」' }
      ],
      观察: [{ text: '他看人先看脚，再看手。你走进院子那几步，他已经把你的下盘看了个明白。' }],
      学长拳: [
        { if: { canLearn: 'jh_taizu', silver: 100 },
          text: '卢馆主收下钱，脱了短褂，从起手式教起：冲拳、劈拳、撩阴、贯耳，一招一式，教了足足两个时辰。「太祖长拳，天下最寻常的拳。寻常的拳打得不寻常，才是功夫。」（银两 −100 文）',
          do: [{ type: 'silver', delta: -100 }, { type: 'time', add: 240 }, { type: 'learn', skill: 'jh_taizu', prof: 60 }] },
        { if: { canLearn: 'jh_taizu' }, text: '「学费一百文，一文不赊。」卢馆主摆摆手，「武馆也要吃饭。」' },
        { text: '卢馆主看了你一眼：「你身上的规矩，比我这武馆大。」他没再多说。' }
      ],
      学谭腿: [
        { if: { canLearn: 'jh_tantui', silver: 100 },
          text: '卢馆主叫你扶着木桩，一条腿一条腿地踢：「十二路谭腿，踢的是下三路。踢够一万脚，碗口粗的木桩也踢得断。」你踢到天色变了，两条腿像灌了铅。（银两 −100 文）',
          do: [{ type: 'silver', delta: -100 }, { type: 'time', add: 240 }, { type: 'learn', skill: 'jh_tantui', prof: 60 }] },
        { if: { canLearn: 'jh_tantui' }, text: '「学费一百文。」卢馆主头也不回，「钱凑够了再来。」' },
        { text: '卢馆主看了你一眼：「你身上的规矩，比我这武馆大。」他没再多说。' }
      ],
      学刀法: [
        { if: { canLearn: 'jh_wuhu', silver: 300 },
          text: '卢馆主从刀枪架上抽了口朴刀，一路一路演给你看：「五虎断门刀，断的是人的活路。」刀风扫得院里的落叶打旋。「刀得自己备，架上的朴刀六百文一口。没刀在手，这路刀法你只能比划。」（银两 −300 文）',
          do: [{ type: 'silver', delta: -300 }, { type: 'time', add: 240 }, { type: 'learn', skill: 'jh_wuhu', prof: 60 }] },
        { if: { canLearn: 'jh_wuhu' }, text: '「刀法三百文。」卢馆主道，「刀比拳金贵，刀伤人也比拳狠。」' },
        { text: '卢馆主看了你一眼：「你身上的规矩，比我这武馆大。」他没再多说。' }
      ],
      学形意: [
        { if: { canLearn: 'jh_xingyi', realm: { skill: 'jh_taizu', atLeast: 1 }, silver: 500 },
          text: '卢馆主关了院门，这才拉开架子：劈、崩、钻、炮、横，五行拳一拳一拳打给你看。「形意拳不教生手。你的长拳有了底子，我才肯教。」他教了整整三个时辰，末了说：「半步崩拳打天下——那半步，得你自己走。」（银两 −500 文）',
          do: [{ type: 'silver', delta: -500 }, { type: 'time', add: 360 }, { type: 'learn', skill: 'jh_xingyi', prof: 60 }] },
        { if: { canLearn: 'jh_xingyi', realm: { skill: 'jh_taizu', atLeast: 1 } }, text: '卢馆主点点头：「底子够了。形意拳五百文，少一文不教。」' },
        { if: { canLearn: 'jh_xingyi' }, text: '卢馆主摇头：「形意拳不教生手。先把太祖长拳练到略有小成，让我看看你的底子。」' },
        { text: '卢馆主看了你一眼：「你身上的规矩，比我这武馆大。」他没再多说。' }
      ]
    }
  },
  {
    id: 'bs2_shidun', name: '石墩', ini: '石', tone: 'gray', brief: '对着木桩砸拳', night: true,
    look: '二十出头，膀大腰圆，一张圆脸晒得黑红。拳头上缠着布条，布条渗着血丝，他也不在意。',
    verbs: ['交谈', '观察', '切磋'],
    actions: {
      交谈: [
        { if: { sect: JW },
          text: '石墩一把拉住你：「你投了边军？九边冷不冷？听说那边的馍有拳头大。」他压低声音，「我也想去，可师父就剩我一个徒弟了。」' },
        { if: { flag: 'bs2_wg_win' }, text: '石墩揉着胳膊嘿嘿笑：「你那几下，打得我半边身子都麻了。师父说，挨打也是练功。」' },
        { text: '石墩停下拳头，喘着粗气：「来学拳的？师父教，我陪你喂招。」他挠挠头，「我力气大，就是脑子慢。师父说，慢不怕，怕的是不肯挨打。」' }
      ],
      切磋: [
        { if: { hour: { from: 20, to: 5 } }, text: '石墩打着哈欠：「天黑了，师父不让练了。明儿一早来。」' },
        { text: '石墩把布条缠紧：「来！我只喂招，不下重手。」', do: [{ type: 'fight', foe: 'bs2_wg_shidun' }] }
      ]
    }
  },
  {
    id: 'bs2_wg_jia', name: '刀枪架', obj: true, icon: 'door', brief: '插着几口朴刀',
    look: '靠墙一排刀枪架，插着几口朴刀、几根白蜡杆，刀口都开过，磨得雪亮。',
    verbs: ['观察', '购买'],
    actions: {
      购买: [
        { if: { item: { id: 'bs2_pudao' } }, text: '你已经有一口朴刀了。' },
        { if: { silver: 600 },
          text: '卢馆主从架上抽出一口朴刀，拿拇指试了试刀口，递给你：「刀是好刀，人得配得上。」（银两 −600 文）',
          do: [{ type: 'silver', delta: -600 }, { type: 'item', id: 'bs2_pudao', delta: 1 }, { type: 'toast', text: '买下朴刀，到行囊里装备' }] },
        { text: '卢馆主道：「朴刀六百文一口，不还价。」' }
      ]
    }
  },

  /* ---------- 丐帮扬州分舵：讨一顿饭入帮，腿脚、侠义够了升外门 ---------- */
  {
    id: 'bs2_bao', name: '鲍四', ini: '鲍', tone: 'amber', brief: '拄着竹杖烤火',
    look: '五十上下，背上缝着六只麻布口袋，左腿是跛的，拄一根磨得发亮的青竹杖。衣裳补丁摞补丁，指甲缝却洗得干干净净。',
    verbs: ['交谈', '观察',
      { verb: '拜师', if: { notFlag: 'bs2_gb_in' } },
      { verb: '复命', if: { quest: { id: KAO_GB, is: 0 }, noSect: true } },
      { verb: '请教', if: { sect: GB } },
      { verb: '考校', if: { sect: GB, notFlag: 'bs2_gb_wai' } },
      { verb: '讨差事', if: { sect: GB } },
      { verb: '打探', if: { sect: GB } }],
    actions: {
      交谈: [
        { if: { sect: GB_OUT },
          text: '鲍四往火里添了根柴：「一袋弟子，在外头报得出丐帮的名号了。名号不值钱，可也不能叫人糟践。」他朝门外的运河看了一眼，「盐号的人再打叫化子，你出头，分舵给你撑腰。」' },
        { if: { sect: GB },
          text: '鲍四敲敲竹杖：「帮规记着：不偷，不欺穷苦，讨来的饭先分给饿着的。」他看看你，「记名弟子，先把百衲功那口气养足，腿脚练利索，侠义的事多做几件。混天气功是本帮的根，升了外门才传。」' },
        { if: { flag: 'bs2_gb_mai_once' }, text: '鲍四眼皮都不抬：「还想入帮？这回空着手去，别再掏钱袋。」' },
        { if: { flag: 'ly_xiaozei_dead' }, text: '鲍四的竹杖在地上一顿，庙里的叫化子都不出声了。他盯着你看了半晌，一个字也没说。' },
        { text: '鲍四烤着火：「今年运河发大水，茱萸湾、邵伯的人都逃进城来讨饭。汪家盐号嫌叫化子挡道，见一个打一个。」他把竹杖横在膝上，「分舵三十几口人，能护着他们的，没几个。」' }
      ],
      观察: [{ text: '他背上的六只口袋，有一只补过三回。庙里的小叫化有事没事都往他身边凑，他把讨来的馒头掰成小块，一块一块分出去，自己只喝粥。' }],
      拜师: [
        { if: { flag: 'ly_xiaozei_dead' },
          text: '鲍四的竹杖在地上一顿：「东关街巷子里那个讨饭的孩子，是叫一个佩剑的砍的。」他转过身去，「丐帮的门，不对你开。」' },
        { if: { sect: LSM }, text: '鲍四瞥了一眼你腰里的腰牌，笑了：「官府的人来拜叫化子？」他摇摇头，「丐帮不收吃两家饭的。」' },
        { if: { sect: JW }, text: '鲍四打量着你：「名字上了边军的册子，就是官家的人了。丐帮不收吃两家饭的。」' },
        { if: { noSect: true, quest: { id: KAO_GB, is: 0 } }, text: '鲍四伸出手：「饭呢？东关街就在那儿。」' },
        { if: { noSect: true, flag: 'ly_ajiu' },
          text: '鲍四上下打量你：「渡口扛盐包的阿九，原先是庙里的小叫化。他说有个佩剑的给过他十文钱，是你吧？」他点点头，「心是热的。可规矩不能破：去东关街讨一顿饭回来，不许花自己的钱，不许亮兵刃，不许报名号。」',
          do: [{ type: 'quest', id: KAO_GB, stage: 0 }, { type: 'feed', tag: '江湖', text: '丐帮的鲍四说：想入丐帮，先去东关街讨一顿饭回来，不许花自己的钱，不许亮兵刃。' }] },
        { if: { noSect: true },
          text: '鲍四烤着火，头也不回：「想入丐帮？丐帮的人，先得会讨饭。」他用竹杖拨了拨火，「去东关街讨一顿饭回来。不许花自己的钱，不许亮兵刃，不许报名号。讨得回来，再说。」',
          do: [{ type: 'quest', id: KAO_GB, stage: 0 }, { type: 'feed', tag: '江湖', text: '丐帮的鲍四说：想入丐帮，先去东关街讨一顿饭回来，不许花自己的钱，不许亮兵刃。' }] },
        { text: '鲍四摇摇头：「你身上挂着别家的名分。丐帮不收吃两家饭的，先去那边了断干净。」' }
      ],
      复命: [
        { if: { item: { id: 'bs2_shaobing' }, flag: 'bs2_gb_mai' },
          text: '鲍四看都不看那烧饼：「胡婶的摊子，是丐帮的眼睛。你掏钱袋的时候，庙里就知道了。」他把烧饼掰开分给小叫化，「饼留下，人回去。讨饭讨的是脸面，这回空着手去。」',
          do: [{ type: 'item', id: 'bs2_shaobing', delta: -1 }, { type: 'flag', flag: 'bs2_gb_mai', value: false }, { type: 'flag', flag: 'bs2_gb_mai_once' }] },
        { if: { item: { id: 'bs2_shaobing' }, flag: 'bs2_gb_gong' },
          text: '鲍四掂了掂烧饼：「胡婶说，你替她劈了一个时辰的柴。」他笑了，「这是挣来的，不是讨来的。也罢，丐帮有污衣、净衣两路，自食其力的，算净衣一路。」他把烧饼掰开分给小叫化，从怀里摸出一根打了结的麻绳，系在你手腕上。',
          do: GB_JOIN },
        { if: { item: { id: 'bs2_shaobing' } },
          text: '鲍四接过烧饼，掰开分给身边的小叫化，自己一口没留。「脸面放得下，才讨得来饭；讨来的饭肯分出去，才算丐帮的人。」他从怀里摸出一根打了结的麻绳，系在你手腕上，「从今往后，你是扬州分舵的记名弟子。」',
          do: GB_JOIN },
        { text: '鲍四伸出手，等了半天，又缩了回去：「饭呢？东关街就在那儿。」' }
      ],
      请教: [
        { if: { sect: GB, canLearn: 'gb_baina', notLearned: 'gb_baina' },
          text: '鲍四把你拉到庙门口的风口里站着：「叫化子头一样本事，是挨得住。」他让你憋住一口气，自己拿竹杖在你背上、腿上一下一下地敲，不重，可一下也不停。「挨冻、挨饿、挨打，这口气都不许泄。补丁怎么缝，气就怎么攒，这叫百衲功。」敲到天黑，你背上火辣辣的，胸口那口气却越憋越足。',
          do: [{ type: 'time', add: 180 }, { type: 'learn', skill: 'gb_baina', prof: 60 }] },
        { if: { sect: GB, canLearn: 'gb_babu', notLearned: 'gb_babu' },
          text: '鲍四拄着竹杖，绕着庙里的柱子走给你看。瘸着一条腿，脚步却快得出奇，一步一晃，像醉汉，又像在赶什么。「八步赶蝉。丐帮的人一辈子在路上，腿脚是吃饭的家伙。」你跟着他绕了一个时辰的柱子。',
          do: [{ type: 'time', add: 120 }, { type: 'learn', skill: 'gb_babu', prof: 60 }] },
        { if: { sect: GB, canLearn: 'gb_lianhua', notLearned: 'gb_lianhua' },
          text: '「莲花掌，净衣一路的入门掌法。」鲍四单掌一翻，掌心向上，像托着一朵莲花，「掌面看着软，掌心里要藏一口劲。」他一招一招拆给你看，拆到第九式，天色已经变了。',
          do: [{ type: 'time', add: 120 }, { type: 'learn', skill: 'gb_lianhua', prof: 60 }] },
        { if: { sect: GB, canLearn: 'gb_xiaoyaoyou', notLearned: 'gb_xiaoyaoyou' },
          text: '鲍四把竹杖一扔，双臂一展，拳势开阔：「逍遥游。叫化子吃了上顿没下顿，心里却要逍遥。拳也是这个意思：打得开，收得住。」',
          do: [{ type: 'time', add: 120 }, { type: 'learn', skill: 'gb_xiaoyaoyou', prof: 60 }] },
        { if: { sect: GB_OUT, canLearn: 'gb_huntian', notLearned: 'gb_huntian' },
          text: '鲍四让你盘腿坐在火边，一只手按在你背心：「百衲功攒下的那口硬气，是叫化子的本钱；混天气功，是丐帮的根。叫化子冬天睡破庙，夏天睡桥洞，冻不死、热不死，凭的就是它。」一股暖意顺着他的掌心流进来，在你周身转了一圈。',
          do: [{ type: 'time', add: 240 }, { type: 'learn', skill: 'gb_huntian', prof: 60 }] },
        { if: { sect: GB_OUT, canLearn: 'gb_chansi', notLearned: 'gb_chansi' },
          text: '「缠丝擒拿手，刑堂的功夫。」鲍四五指一搭，扣住你的手腕轻轻一绕，你半条胳膊就酸了，「拿人不伤人。拿住了，听他说话。」',
          do: [{ type: 'time', add: 120 }, { type: 'learn', skill: 'gb_chansi', prof: 60 }] },
        { if: { sect: GB_OUT, notLearned: 'gb_huntian' },
          text: '鲍四按了按你的心口，摇头：「百衲功那口气还浮着，接不住混天气功。先把百衲功练到略有小成，再来。」' },
        { if: { sect: GB_OUT, notLearned: 'gb_chansi' },
          text: '鲍四抓起你的手腕捏了捏：「缠丝擒拿手是从莲花掌里化出来的，你掌上的劲还是死的。先把莲花掌练到略有小成。」' },
        { if: { sect: GB_OUT }, text: '鲍四摇摇头：「扬州分舵能教的，都教给你了。降龙十八掌、打狗棒法，是帮主的东西，不在这座破庙里。」' },
        { if: { sect: GB },
          text: '鲍四摆摆手：「记名弟子学到这儿为止。百衲功那口气先养足了，莲花掌、逍遥游的绝招都靠它使。混天气功、缠丝擒拿手，升了外门才传。」' },
        { text: '鲍四烤着火：「丐帮的功夫，只传帮里的人。」' }
      ],
      讨差事: [
        // 师门差事（packs/shimen-chaishi.ts）：替分舵出力，攒丐帮贡献
        { if: { job: 'smcs_gb_xin' }, text: '鲍四烤着火：「信还没送到？瓜洲镇墙根底下那个老叫化，腰上系着三个结的麻绳。」' },
        { if: { job: 'smcs_gb_zhou' }, text: '鲍四朝门外看了看：「打手是夜里来的。你守着，别走远。」' },
        { if: { jobOpen: 'smcs_gb_zhou', flag: 'bs2_gb_in' },
          text: '鲍四把竹杖往地上一顿：「汪家放了话，龙王庙门口不许支粥棚。今晚他们要来砸。」他看着你，「粥棚是逃荒的人活命的。你守一夜。」',
          do: [{ type: 'job', id: 'smcs_gb_zhou' }] },
        { if: { jobOpen: 'smcs_gb_xin' },
          text: '鲍四从怀里摸出一封封了蜡的信：「送到瓜洲镇，墙根底下晒太阳的老叫化。路上别拆，也别让人看见。」',
          do: [{ type: 'job', id: 'smcs_gb_xin' }] },
        { text: '鲍四摆摆手：「这几日分舵没有差事。去街上走走，看看有没有饿着的。」' }
      ],
      考校: [
        // 升外门要替分舵出过力：丐帮贡献一百（content/skills.ts 的 RANK_GONGXIAN）
        { if: { sect: GB, realm: { skill: 'gb_babu', atLeast: 1 }, xia: 20, gongxian: 100 },
          text: '鲍四往你手里塞了一只盛满水的破碗：「跑到渡口，再跑回来，碗里的水不许洒。」你回来时，碗里的水还是满的。鲍四点点头，解下背上一只空口袋，缝在你的衣襟上：「一袋弟子，丐帮的外门。」',
          do: [{ type: 'sect', school: '丐帮', rank: '外门' }, { type: 'flag', flag: 'bs2_gb_wai' }, { type: 'time', add: 60 },
            { type: 'feed', tag: '江湖', text: '你升了丐帮外门，做了扬州分舵的一袋弟子。鲍四说，混天气功、缠丝擒拿手，可以学了。' },
            { type: 'toast', text: '丐帮 · 升外门弟子' }] },
        { if: { sect: GB, realm: { skill: 'gb_babu', atLeast: 1 }, xia: 20 },
          text: '鲍四点点头：「腿脚、心性都过得去。可丐帮的一袋，是替分舵出过力的人才缝得上。」他用竹杖敲敲地，「分舵的差事，多办几件再来。」' },
        { if: { sect: GB, realm: { skill: 'gb_babu', atLeast: 1 } },
          text: '鲍四看了看你的腿脚：「腿脚利索了。可丐帮看的不光是腿脚。」他用竹杖指指门外，「侠义的事，再多做几件。」' },
        { if: { sect: GB, xia: 20 }, text: '鲍四点点头：「心是正的。腿脚还差火候：八步赶蝉练到略有小成，再来。」' },
        { if: { sect: GB }, text: '鲍四摇头：「一袋弟子，要腿脚快，心要正，还要替分舵出过力。八步赶蝉练到略有小成，侠义的事多做几件，分舵的差事多办几件，再来。」' },
        { text: '鲍四烤着火：「你不是丐帮的人，考校什么？」' }
      ],
      打探: [
        { if: { sect: GB },
          text: '鲍四朝门口的小叫化招招手，嘀咕了两句。小叫化一溜烟跑了，半个时辰后又跑回来，凑在鲍四耳边说了一阵。鲍四转述给你：「{news}」',
          do: [{ type: 'time', add: 60 }, { type: 'news' }] },
        { text: '鲍四烤着火：「丐帮的消息，只给帮里的人。」' }
      ]
    }
  },
  {
    id: 'bs2_xjh', name: '小叫化', count: 3, ini: '化', tone: 'gray', brief: '围着铁锅等粥',
    look: '大的十二三，小的才五六岁，一个个瘦得只剩一双眼睛。最小的那个光着脚，脚背上冻裂的口子还没长好。',
    verbs: ['交谈', '观察'],
    actions: {
      交谈: [
        { if: { flag: 'bs2_gb_in' }, text: '小叫化们围上来，七嘴八舌地叫你「大哥」。最小的那个扯着你的衣角：「大哥，那天的烧饼真香。」' },
        { if: { flag: 'ly_xiaozei_beat' }, text: '几个小叫化一见你腰里的剑，就往龙王爷的泥胎后头躲。大的那个护着小的，瞪着你，一声不吭。' },
        { if: { flag: 'ly_ajiu' }, text: '大的那个凑过来：「阿九哥去渡口扛盐包了，说是有个佩剑的给过他钱。」他看看你的剑，「是你吧？」' },
        { text: '最小的那个伸出手：「大哥哥，赏口吃的吧。」大的一巴掌拍掉他的手：「鲍爷说了，不许跟进庙的人讨。」' }
      ]
    }
  },
  {
    id: 'bs2_hu', name: '胡婶', ini: '胡', tone: 'amber', brief: '守着烧饼炉子', at: { room: 'cheng' },
    look: '四十来岁的寡妇，袖子挽到胳膊肘，一手拍面，一手翻饼，炉膛里的火苗舔着锅沿。摊子边总蹲着一两个小叫化，她也不撵。',
    verbs: ['交谈', '观察', '购买',
      { verb: '讨饭', if: { quest: { id: KAO_GB, is: 0 }, noSect: true } },
      { verb: '帮工', if: { quest: { id: KAO_GB, is: 0 }, noSect: true } }],
    actions: {
      交谈: [
        { if: { flag: 'bs2_gb_in' }, text: '胡婶冲你挤挤眼：「鲍四收你了？那老东西挑得很。」她往你手里塞了个焦了边的烧饼，「拿着，焦的不值钱。」' },
        { if: { quest: { id: KAO_GB, is: 0 }, noSect: true }, text: '胡婶翻着饼，眼睛却瞟着你：「龙王庙来的？鲍四又打发人来讨饭了。」她笑了笑，「讨也行，帮我劈柴也行。」' },
        { text: '胡婶翻着饼：「芝麻烧饼，三文一个，刚出炉的。」她朝摊边的小叫化努努嘴，「卖不完的，晚上都给他们。」' }
      ],
      购买: [
        { if: { quest: { id: KAO_GB, is: 0 }, noSect: true, silver: 3, noItem: 'bs2_shaobing' },
          text: '胡婶收了钱，拿油纸包了个烧饼递给你。她收钱的时候，多看了你一眼。（银两 −3 文）',
          do: [{ type: 'silver', delta: -3 }, { type: 'item', id: 'bs2_shaobing', delta: 1 }, { type: 'flag', flag: 'bs2_gb_mai' }] },
        { if: { silver: 3 }, text: '你买了个热烧饼，站在摊边吃完了，满嘴芝麻香。（银两 −3 文）',
          do: [{ type: 'silver', delta: -3 }, { type: 'heal', hp: 30 }] },
        { text: '胡婶看看你：「三文钱都摸不出来？」她叹了口气，又低头翻她的饼去了。' }
      ],
      讨饭: [
        { if: { item: { id: 'bs2_shaobing' } }, text: '你手里已经有烧饼了，该回龙王庙去。' },
        { if: { attr: { key: '胆魄', atLeast: 24 } },
          text: '你学着叫化子的腔调，敲着破碗唱了一段莲花落。起头两句嗓子发紧，唱到第三句，街上的人都笑了。胡婶笑骂着丢给你一个烧饼：「唱得比哭还难听。拿去！」',
          do: [{ type: 'time', add: 60 }, { type: 'item', id: 'bs2_shaobing', delta: 1 }] },
        { text: '你在摊前站了一个多时辰，那句「赏口饭吃」在嘴边转了几百转，到底没说出口。胡婶看不过眼，丢给你一个冷烧饼：「脸皮这么薄，讨什么饭。」你接住了，脸烧得比炉子还烫。',
          do: [{ type: 'time', add: 150 }, { type: 'item', id: 'bs2_shaobing', delta: 1 }] }
      ],
      帮工: [
        { if: { item: { id: 'bs2_shaobing' } }, text: '你手里已经有烧饼了，该回龙王庙去。' },
        { text: '你挽起袖子，替胡婶劈柴、和面、看炉子，忙了一个时辰，落了一身面粉。胡婶包了个热烧饼塞给你：「这是你挣的，不是讨的。」',
          do: [{ type: 'time', add: 120 }, { type: 'item', id: 'bs2_shaobing', delta: 1 }, { type: 'flag', flag: 'bs2_gb_gong' }] }
      ]
    }
  },

  /* ---------- 六扇门：周捕头举荐，秦教头考校 ---------- */
  {
    id: 'bs2_qin', name: '秦教头', ini: '秦', tone: 'blue', brief: '在廊下擦铁尺', at: { room: 'yz_fuya' },
    look: '五十来岁，又干又瘦，右腿有点瘸，是当年追一个飞贼，从城墙上跳下来摔的。腰里别着一根铁尺，尺身磨得能照见人影。',
    verbs: ['交谈', '观察',
      { verb: '投效', if: { notFlag: 'bs2_lsm_in' } },
      { verb: '请教', if: { sect: LSM } }],
    actions: {
      交谈: [
        { if: { pastSect: { school: '六扇门', how: '逐出' } },
          text: '秦教头擦着铁尺，看都不看你：「腰牌是我亲手收回来的。」他顿了顿，「六扇门的门，你这辈子是进不来了。」' },
        { if: { sect: LSM },
          text: '秦教头拿铁尺敲敲你的腰牌：「门规记着：拿人不杀人，人犯交给律法；不收贼赃，不私放人犯。」他顿了顿，「江湖上有人骂你鹰犬，由他骂。恶名一高，这块牌子我亲手收回来。」' },
        { if: { flag: 'csf_freed' },
          text: '秦教头擦着铁尺，眼睛却没离开你：「草上飞从茱萸湾跑了，是么？」他没等你答话，「周捕头没往下说，我也不问。」' },
        { text: '秦教头擦着铁尺：「扬州府的捕快，十个里有六个是花钱买的缺，只会收规费。府台还嫌饷银花得多。」他把铁尺插回腰里，「周捕头手下真能拿人的，就那么几个。」' }
      ],
      观察: [{ text: '他的铁尺尺尖缺了个小口。府衙里的衙役从他身边过，都放轻了脚步。' }],
      投效: [
        { if: { eming: 10 }, text: '秦教头连眼皮都没抬：「恶名在外的人，穿不得这身皂衣。」' },
        { if: { noSect: true, quest: { id: 'side_caoshangfei', atLeast: 3 }, flag: 'csf_surrender' },
          text: '秦教头放下铁尺，打量你半晌：「劝得动草上飞自首的，就是你？拿人不靠刀，这才是六扇门要的人。」他站起身，「周捕头举荐你。规矩不能破，接我三十招。」',
          do: [{ type: 'fight', foe: 'bs2_lsm_kao' }] },
        { if: { noSect: true, quest: { id: 'side_caoshangfei', atLeast: 3 }, flag: 'csf_caught' },
          text: '秦教头放下铁尺：「草上飞是你押回来的。周捕头说，你下手有分寸，没要他的命。」他站起身，「周捕头举荐的人，我也得亲手试过。接我三十招。」',
          do: [{ type: 'fight', foe: 'bs2_lsm_kao' }] },
        { if: { noSect: true, xia: 30, rel: { npc: 'fuya_zhou', is: ['相谈甚欢', '知交'] } },
          text: '秦教头看了你一眼：「周捕头提过你，说扬州城里行侠仗义的后生，你算一个。」他抽出铁尺，「行侠是一回事，拿人是另一回事。接我三十招。」',
          do: [{ type: 'fight', foe: 'bs2_lsm_kao' }] },
        { if: { noSect: true },
          text: '秦教头摇摇头：「六扇门不是募兵处，不收毛遂自荐的。」他朝公案那边努努嘴，「周捕头手上压着案子。替他办成一件，叫他举荐你，再来说话。」' },
        { text: '秦教头瞥了你一眼：「你身上挂着别家的名分。六扇门的人，只有一个主子。」' }
      ],
      请教: [
        { if: { sect: LSM, canLearn: 'jl_jishixinfa', notLearned: 'jl_jishixinfa' },
          text: '秦教头叫你在廊下盘腿坐好：「缉事心法，先练呼吸。蹲一夜墙根，气不能乱；见了血，心不能慌。心法不上身，锁链、铁尺都只是蛮力。」他叫你闭着眼听院里的动静，一听就是两个时辰。',
          do: [{ type: 'time', add: 240 }, { type: 'learn', skill: 'jl_jishixinfa', prof: 60 }] },
        { if: { sect: LSM, canLearn: 'jl_suolian', notLearned: 'jl_suolian' },
          text: '「锁、扣、别、缠。」秦教头一把扣住你的手腕，一拧一别，你半边身子都跟着转了过去，「拿人拿关节。拿住了，他浑身的力气都使不出来。」',
          do: [{ type: 'time', add: 120 }, { type: 'learn', skill: 'jl_suolian', prof: 60 }] },
        { if: { sect: LSM, canLearn: 'jl_tiechi', notLearned: 'jl_tiechi' },
          text: '秦教头拿铁尺在你身上一处一处地点：「曲池、合谷、肩井、章门……」每点一处，你那一块就是一麻。「铁尺点穴，点到他服为止。记住，是叫他服，不是叫他死。」',
          do: [{ type: 'time', add: 180 }, { type: 'learn', skill: 'jl_tiechi', prof: 60 }] },
        { if: { sect: LSM, canLearn: 'jl_zhuifeng', notLearned: 'jl_zhuifeng' },
          text: '秦教头领你上了府衙后墙，指着远处的屋脊：「追风步，不用飞檐走壁，只要比贼快一步。」他瘸着一条腿翻墙越巷，你竟追不上他。',
          do: [{ type: 'time', add: 120 }, { type: 'learn', skill: 'jl_zhuifeng', prof: 60 }] },
        { if: { sect: LSM }, text: '秦教头摆摆手：「入门的功夫，都教给你了。缚龙索是镇衙的东西，拿过百案才动得。」' },
        { text: '秦教头擦着铁尺：「六扇门的功夫，不教外人。」' }
      ]
    }
  },

  /* ---------- 军伍：冯校尉的名册上画了押，韩什长考校 ---------- */
  {
    id: 'bs2_han', name: '韩什长', ini: '韩', tone: 'red', brief: '在帐前操练新兵', at: { room: 'yz_mubing' },
    look: '四十来岁，半边脸上一大块烧伤的疤，一只耳朵没了。站着像一杆枪，脚边立着一根去了枪头的白蜡杆。',
    verbs: ['交谈', '观察',
      { verb: '投军', if: { notFlag: 'bs2_jw_in' } },
      { verb: '请教', if: { sect: JW } },
      { verb: '考校', if: { sect: JW, notFlag: 'bs2_jw_wai' } },
      { verb: '讨差事', if: { sect: JW } }],
    actions: {
      交谈: [
        // 海捕文书 · 逃兵熊大（packs/liushanmen.ts）：识破他的一条路，也是一桩两难
        { if: { shi: { id: 'lsm_xiong', at: ['zaitao', 'zuoan'] }, notFlag: 'lsm_xiong_shipo' },
          text: '韩什长听你说起熊大，半晌没吭声。「我认得他。九边的兵，右臂上都刺『忠勇』。」他拿白蜡杆在地上划了一道，「那百户克扣军粮，饿死了人，营里谁都知道。」他别过脸去，「当兵的除了杀人，就只会打铁。你去镇江打铁巷看看吧。拿不拿他，你自己定。」',
          do: [{ type: 'flag', flag: 'lsm_xiong_shipo' }, { type: 'shi', id: 'lsm_xiong' }] },
        { if: { shi: { id: 'lsm_xiong', at: ['fang', 'taozou'] } },
          text: '韩什长朝北边望了一眼：「熊大过江了？」他点点头，「九边缺人。他要是换个名字回去，上了阵，也是条好汉。」' },
        { if: { shi: { id: 'lsm_xiong', at: ['luowang', 'sha'] } },
          text: '韩什长拿白蜡杆戳着地，一下一下：「熊大的事，我听说了。」他没再往下说。' },
        { if: { sect: JW_OUT },
          text: '韩什长拿白蜡杆戳戳你的枪：「正兵了。上了阵，枪往前扎，人往前走，别回头看。」他顿了顿，「回头的，都没回来。」' },
        { if: { sect: JW },
          text: '韩什长拿白蜡杆戳戳地：「军令如山。上头一纸调令，调你去哪儿就得去哪儿；逃了，就是逃兵。」他看着你，「在营里只练军中的功夫和江湖散学，别家的花架子，一样不许碰。」' },
        { if: { flag: 'gd_bao' },
          text: '韩什长朝北边望了一眼：「那个姓陶的娃娃，是你替他画的押？」他半晌没说话，「他娘的药钱是有了。他这条命，往后归军中了。」' },
        { if: { flag: 'gd_chu' },
          text: '韩什长哼了一声：「听说你出钱，把那个姓陶的娃娃打发回家了。」他把白蜡杆往地上一顿，「也好。九边不缺死人。」' },
        { text: '韩什长看着官道上来来往往的人：「冯校尉要人，我要的是能活着回来的人。」他摸了摸脸上的疤，「九边的新兵，头一年埋掉一半。我教他们几手，能多活几个是几个。」' }
      ],
      观察: [{ text: '他左手少了两根指头，握白蜡杆却握得极稳。帐前几个新兵站桩，腿一抖，他一杆子抽过去，抽完又亲手把人扶正。' }],
      投军: [
        { if: { noSect: true, notFlag: 'jw_mingce' },
          text: '韩什长摇头：「先去冯校尉那里画押。名字不上册子，我教你的就是私传军中的功夫，要掉脑袋的。」' },
        { if: { noSect: true, attr: { key: '体魄', atLeast: 25 } },
          text: '韩什长指了指帐前那对石锁：「扛起来，绕驿亭三圈。」你把两百来斤的石锁扛上肩，绕了三圈，气都没怎么喘。韩什长眯起眼：「好底子。从今天起，你是边军的记名兵。」',
          do: JW_JOIN },
        { if: { noSect: true },
          text: '韩什长指了指帐前的石锁。你扛到第二圈，腿就软了。韩什长把一根白蜡杆扔给你，自己抄起另一根：「扛不动石锁，就挨打。挨得住我三十杆，也算你过了。」',
          do: [{ type: 'fight', foe: 'bs2_jw_kao' }] },
        { text: '韩什长摇头：「你身上挂着别家的名分。边军的人，只认一面旗。」' }
      ],
      请教: [
        { if: { sect: JW, canLearn: 'jl_tiejigong', notLearned: 'jl_tiejigong' },
          text: '韩什长叫你扎个马步，背上横压一根白蜡杆：「铁脊功，九边将士人人过关的底子。这口气不上身，军中的拳脚枪棒都是庄稼把式。」你站了两个时辰，背上的杆子一回也没掉。',
          do: [{ type: 'time', add: 240 }, { type: 'learn', skill: 'jl_tiejigong', prof: 60 }] },
        { if: { sect: JW, canLearn: 'jl_xingjunbu', notLearned: 'jl_xingjunbu' },
          text: '韩什长叫你背上二十斤沙袋，沿官道跑出去十里再跑回来：「行军步。负甲行军，一日百里，脚下要生根，喘气不能乱。」',
          do: [{ type: 'time', add: 180 }, { type: 'learn', skill: 'jl_xingjunbu', prof: 60 }] },
        { if: { sect: JW, canLearn: 'jl_changquan', notLearned: 'jl_changquan' },
          text: '「军中长拳，新兵操典第一课。」韩什长一拳打出去，直来直去，半点花巧没有，「招式简单，千万人练下来，有一股杀气。你一个人练，也得练出这股气来。」',
          do: [{ type: 'time', add: 120 }, { type: 'learn', skill: 'jl_changquan', prof: 60 }] },
        { if: { sect: JW_OUT, canLearn: 'jl_changqiang', notLearned: 'jl_changqiang' },
          text: '韩什长端起枪：「边军大枪。拦、拿、扎，三个字练到老。」他一枪扎出去，枪尖钉进三丈外的木桩，「一枪出去，为的是身后整条防线。」',
          do: [{ type: 'time', add: 240 }, { type: 'learn', skill: 'jl_changqiang', prof: 60 }] },
        { if: { sect: JW_OUT }, text: '韩什长摇头：「破阵刀、铁骑冲阵，是在阵前冲杀过的人才学的。你还没见过血。」' },
        { if: { sect: JW }, text: '韩什长道：「新兵的功夫就这三样。铁脊功、军中长拳都练到略有小成，来找我考校，过了才摸得着枪。」' },
        { text: '韩什长瞥你一眼：「军中的功夫，不教外人。」' }
      ],
      讨差事: [
        // 师门差事（packs/shimen-chaishi.ts）：替营里出力，攒军伍贡献
        { if: { job: 'smcs_jw_xun' }, text: '韩什长道：「巡营是夜里的事。天黑了去驿亭找哨兵对口令。」' },
        { if: { job: 'smcs_jw_liang' }, text: '韩什长道：「粮车还没到瓜洲？少一袋，营门上又要多挂一颗脑袋。」' },
        { if: { jobOpen: 'smcs_jw_liang' },
          text: '韩什长指了指帐后的粮车：「二十袋军粮，押到瓜洲码头，交给粮官。路上有人问，就说是扬州营的。」',
          do: [{ type: 'job', id: 'smcs_jw_liang' }] },
        { if: { jobOpen: 'smcs_jw_xun' },
          text: '韩什长把一块木牌扔给你：「今夜你巡营。天黑以后去驿亭，跟哨兵对口令。官道上来来往往的人多，眼睛放亮些。」',
          do: [{ type: 'job', id: 'smcs_jw_xun' }] },
        { text: '韩什长摇头：「营里这几日没有差事。去练你的枪。」' }
      ],
      考校: [
        // 两重境界的条件：realm 只能写一个，第二个放进只有一项的 any 里。升正兵还要替营里出过力：军伍贡献一百
        { if: { sect: JW, realm: { skill: 'jl_tiejigong', atLeast: 1 }, any: [{ realm: { skill: 'jl_changquan', atLeast: 1 } }], gongxian: 100 },
          text: '韩什长叫你打一趟军中长拳，背上压着两根白蜡杆。一趟拳打完，杆子一根没掉。韩什长点点头，从帐里拎出一杆白蜡杆枪扔给你：「从今天起，你是边军的正兵，摸得着枪了。」',
          do: [{ type: 'sect', school: '军伍', rank: '外门' }, { type: 'flag', flag: 'bs2_jw_wai' }, { type: 'item', id: 'bs2_qiang', delta: 1 }, { type: 'time', add: 60 },
            { type: 'feed', tag: '江湖', text: '你升了边军正兵，领了一杆白蜡杆枪。韩什长说，边军大枪可以学了。' },
            { type: 'toast', text: '军伍 · 升外门弟子' }] },
        { if: { sect: JW, realm: { skill: 'jl_tiejigong', atLeast: 1 }, any: [{ realm: { skill: 'jl_changquan', atLeast: 1 } }] },
          text: '韩什长点点头：「功夫是有了。可边军的正兵，是巡过营、押过粮的人。」他把白蜡杆往地上一顿，「营里的差事，多办几趟再来。」' },
        { if: { sect: JW }, text: '韩什长摇头：「铁脊功、军中长拳，都练到略有小成，营里的差事也多办几趟，再来。」' },
        { text: '韩什长瞥你一眼：「你不是边军的人。」' }
      ]
    }
  }
];

/* ---------- 对手：三场切磋 ---------- */

const yieldOf = (who: string, button: string): FightResult => ({
  tag: '切磋', title: '收手认输', button, story: `你拱手认输。${who}点点头，也收了手：「改日再来。」`
});

const FOES: FoeDef[] = [
  {
    id: 'bs2_wg_shidun', name: '石墩', title: '武馆大徒弟', ini: '石', tone: 'gray', weapon: '一双铁拳', ws: '拳', tag: '切磋',
    nature: '刚', reach: '徒手', rank: 0.4, build: 'inner', spar: true, firstTell: 3,
    moves: ['冲拳', '劈拳', '撞肩', '扫腿'],
    flourish: ['一拳直来直去', '闷着头撞过来', '拳风呼呼作响', '脚下踩得青砖咚咚响'],
    tells: [
      { name: '霸王举鼎', text: '石墩扎下马步，两条胳膊上的青筋一根根鼓起来……', dom: 'li', after: '一双铁拳当胸砸到，带起一阵风。' },
      { name: '回身扫腿', text: '石墩忽然矮下身子，一条腿贴着地皮往后撤……', dom: 'su', after: '一记扫堂腿横扫过来，又快又低。' }
    ],
    asides: ['卢馆主背着手站在廊下，一声不吭。', '院里的木桩叫拳风带得晃了晃。', '巷口几个半大孩子扒着门缝往里瞧。'],
    opening: ['一拳打空，身子往前栽', '换气时胸口一空', '脚下踩到石锁，晃了一晃'],
    intro: '石墩抱拳行礼，憨憨一笑：「点到为止。我皮厚，你只管打。」',
    win: '石墩一屁股坐在地上，喘着粗气直摆手：「不打了不打了，你赢了。」',
    lose: '石墩的拳头在你鼻尖前停住，他咧嘴一笑：「你脚下虚了。」',
    results: {
      win: { tag: '切磋 · 胜', title: '喂招', button: '收手',
        story: '卢馆主在廊下点了点头：「出手有点样子了。石墩，去打水。」石墩揉着肩膀去了，走两步回头冲你竖了个大拇指。',
        do: [{ type: 'flag', flag: 'bs2_wg_win' }] },
      lose: { tag: '切磋 · 负', title: '挨了几拳', growth: true, button: '揉揉肩膀',
        story: '石墩把你拉起来，拍掉你身上的土。卢馆主在廊下道：「挨打也是练功。挨明白了，就不白挨。」',
        do: [{ type: 'heal', hpAtLeast: 0.5 }] },
      yield: yieldOf('石墩', '收手'),
      flee: yieldOf('石墩', '收手')
    }
  },
  {
    id: 'bs2_lsm_kao', name: '秦教头', title: '六扇门考校', ini: '秦', tone: 'blue', weapon: '铁尺', ws: '尺', tag: '考校',
    nature: '中正', reach: '短', rank: 0.7, build: 'even', spar: true, rounds: 30, firstTell: 3,
    moves: ['锁腕', '点肩井', '别肘', '扫腿'],
    flourish: ['铁尺一晃，点向你的手腕', '瘸腿一拖，人却抢到了你身侧', '反手一尺，敲在你肘弯上', '尺尖贴着你的衣襟滑过去'],
    tells: [
      { name: '画押点', text: '秦教头铁尺虚晃，尺尖在你胸前连点四下，看不出哪一下是实的……', dom: 'qiao', after: '最后一下实实在在点向你的膻中！' },
      { name: '锁喉扣腕', text: '秦教头忽然欺身贴近，一只手已经搭上了你的手腕……', dom: 'su', after: '另一只手直取你的咽喉，要把你按倒在地。' }
    ],
    asides: ['照壁那头的衙役听见动静，拄着水火棍探头进来看热闹，有人押了二十文，赌你撑不过十招。', '周捕头从正堂探出头来看了一眼，又缩了回去。', '廊下的鸽子扑棱棱飞了起来。'],
    opening: ['瘸腿落地时慢了半拍', '铁尺点了个空', '扣腕扣了个空'],
    intro: '秦教头把铁尺横在胸前：「六扇门拿人，讲究一个『拿』字。接得住我三十招，就算你过了。」',
    win: '秦教头收尺后退，揉了揉手腕：「好。拿人的手，稳。」',
    lose: '铁尺轻轻点在你的喉头。秦教头收尺：「你死了。贼人可不会收手。」',
    results: {
      win: { tag: '考校 · 过', title: '穿上皂衣', button: '接过腰牌',
        story: '秦教头从怀里摸出一块腰牌、一根铁尺，一并拍在你手里：「六扇门记名捕快。门规三条：拿人不杀人，人犯交给律法；不收贼赃；不私放人犯。门规森严，在门期间只学本门的功夫和江湖散学。」周捕头在正堂门口，点了点头。',
        do: LSM_JOIN },
      lose: { tag: '考校', title: '差了火候', growth: true, button: '回头再来',
        story: '秦教头把铁尺插回腰里：「出手没错，就是慢。贼人跑的时候，可不等你。」他朝门口抬了抬下巴，「练好了再来。」',
        do: [{ type: 'heal', hpAtLeast: 0.5 }] },
      yield: yieldOf('秦教头', '回头再来'),
      flee: yieldOf('秦教头', '回头再来')
    }
  },
  {
    id: 'bs2_jw_kao', name: '韩什长', title: '边军考校', ini: '韩', tone: 'red', weapon: '白蜡杆', ws: '杆', tag: '考校',
    nature: '刚', reach: '长', rank: 0.7, build: 'inner', spar: true, rounds: 30, firstTell: 3,
    moves: ['拦', '拿', '扎', '杆打一大片'],
    flourish: ['白蜡杆一抖，杆头直点你的胸口', '杆尾一挑，扫向你的脚踝', '一杆砸下来，砸得尘土飞扬', '脚下像钉了钉子，纹丝不动'],
    tells: [
      { name: '中平扎', text: '韩什长沉肩坠肘，白蜡杆端得纹丝不动，杆头对准了你的心口……', dom: 'su', after: '杆头一抖，直扎过来，快得只看见一道白影。' },
      { name: '横扫千军', text: '韩什长双手握住杆尾，腰身一拧……', dom: 'li', after: '白蜡杆抡圆了横扫过来，带着呜呜的风声。' }
    ],
    asides: ['帐前站桩的新兵都扭过头来看，叫韩什长一瞪，又转了回去。', '冯校尉放下名册，远远地看着。', '帐后拴着的马打了个响鼻，刨了刨蹄子。'],
    opening: ['一杆扎空，杆头往下一沉', '换手时慢了一拍', '扫得太猛，收不回来'],
    intro: '韩什长把白蜡杆往地上一顿：「边军不比武，只打仗。挨得住我三十杆，就算你过了。」',
    win: '韩什长收杆后退，抹了把脸上的汗：「行。这身骨头，九边冻不坏。」',
    lose: '白蜡杆抵在你的胸口，韩什长收了杆：「上了阵，你已经死了三回。」',
    results: {
      win: { tag: '考校 · 过', title: '投身行伍', button: '入营',
        story: '韩什长把白蜡杆插回地上：「从今天起，你是边军的记名兵。军令如山，调你去哪儿就得去哪儿，逃了算逃兵。门规森严，在营里只练军中的功夫和江湖散学。」帐前的新兵们冲你咧嘴笑。',
        do: JW_JOIN },
      lose: { tag: '考校', title: '挨了三十杆', growth: true, button: '回头再来',
        story: '韩什长把你从地上拽起来：「底子太薄。去冯校尉那里喝碗茶，歇够了，练好了，再来。」',
        do: [{ type: 'heal', hpAtLeast: 0.5 }] },
      yield: yieldOf('韩什长', '回头再来'),
      flee: yieldOf('韩什长', '回头再来')
    }
  }
];

/* ---------- 物品 ---------- */

const ITEMS: ItemDef[] = [
  { id: 'bs2_shaobing', name: '烧饼', kind: '酒食', price: 5, use: [{ type: 'heal', hpFrac: 0.1 }], desc: '胡婶摊上的芝麻烧饼，用油纸包着，还带着炉膛的热气。' },
  { id: 'bs2_yaopai', name: '六扇门腰牌', kind: '信物', desc: '乌木腰牌，正面刻「扬州府」三字，背面刻一个「捕」字，挂着一截褪了色的红绳。' },
  { id: 'bs2_tiechi', name: '铁尺', kind: '装备', price: 300, desc: '一尺八寸的熟铁尺，尺身方棱，尺尖磨圆了。六扇门拿人点穴的家伙。', equip: { slot: '兵器', weapon: '奇门', reach: '短' } },
  { id: 'bs2_qiang', name: '白蜡杆枪', kind: '装备', price: 450, desc: '白蜡杆的枪身，韧而不折，枪头是边军的制式。', equip: { slot: '兵器', weapon: '枪', reach: '长' } },
  { id: 'bs2_pudao', name: '朴刀', kind: '装备', price: 600, desc: '武馆刀枪架上的朴刀，刀身宽厚，刀口开过，磨得雪亮。', equip: { slot: '兵器', weapon: '刀', reach: '短' } }
];

/* ---------- 任务：丐帮的入门考验 ---------- */

const QUESTS: QuestDef[] = [
  { id: KAO_GB, name: '丐帮 · 讨一顿饭', stages: [
    // 推进在龙王庙鲍四的「复命」；目的地照旧写东关街，烧饼要先在那里讨到
    { title: '空着手去东关街讨一顿饭，带回龙王庙', to: 'cheng', hint: '向东关街的胡婶讨个烧饼，带回龙王庙交给鲍四。',
      need: [
        { if: { item: { id: 'bs2_shaobing' } }, text: '讨到一个烧饼' },
        { if: { notFlag: 'bs2_gb_mai' }, text: '烧饼不能是花钱买的' },
        { if: { noSect: true }, text: '身上没有别家师门' }
      ] },
    { title: '丐帮 · 讨一顿饭 · 完' }
  ] }
];

/* ---------- 传闻 ---------- */

const NEWS: NewsDef[] = [
  { text: '东关街巷子里的广陵武馆，交了学费就教拳，不拜师，不论门户。' },
  { text: '运河堤下的龙王庙住着一窝叫化子，听说丐帮在扬州的分舵就在那里。' },
  { if: { flag: 'bs2_gb_in' }, text: '丐帮扬州分舵新收了个记名弟子。龙王庙的小叫化们，这几日笑得多了。' },
  { if: { flag: 'bs2_gb_mai_once' }, text: '东关街的胡婶说，有人想入丐帮，掏钱买了她的烧饼，叫鲍四撵了回去。' },
  { if: { flag: 'bs2_lsm_in' }, text: '扬州府衙新添了个捕快，是秦教头亲手考校过的，没花一文钱买缺。' },
  { if: { flag: 'bs2_jw_in' }, text: '蜀冈官道的募兵帐前，韩什长又收了个兵，听说是从瓜洲来的后生。' },
  { if: { flag: 'bs2_wg_win' }, text: '广陵武馆的石墩逢人便说，前几日有个后生，三拳两脚把他放倒了。' }
];

const pack: ContentPack = { rooms: ROOMS, npcs: NPCS, foes: FOES, items: ITEMS, quests: QUESTS, news: NEWS };
export default pack;
