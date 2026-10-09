import type { Cond, ContentPack, Effect, EyeDef, FoeDef, JobDef, NewsDef, NpcDef, QuestDef, RoomDef, ShiDef } from '../types';

/**
 * 铁掌帮的苏州分舵（Issue #135）：山塘街西头的铁掌分舵。
 * 立身之道见 docs/lizu.md 第二节（地头蛇、帮众人多、收保护费做生意——官府买通，名声坏），
 * 规矩见 docs/menpai.md 第七节，写法见 docs/content-guide.md，示范见 baishi.ts、shimen-chaishi.ts、liushanmen.ts。
 * id 一律以 smtz_ 开头。
 *
 * 这是一个亦正亦邪的门派：拜进去有好处（官府给方便、来钱快），也有代价（恶名、正道的白眼、六扇门盯着）。
 *
 * 人物与动机：
 * - 雷震山：分舵主。总舵派他下苏州开码头，他要的是场面和进项；帮里三百口的嚼用、官面四季的
 *   孝敬，他张口就来。他知道自己名声坏——他知道，但钱来得快。
 * - 牛五：收账的帮众。拿钱办事，家里老娘的药钱靠帮里的月钱——夜里砸铺子的是他，天亮给他娘
 *   煎药的也是他。
 * - 齐先生：账房。帮里的账干净，人不干净——他记的每一笔平安钱都有名有姓，他心里有一杆秤。
 * - 孟娘子：山塘街的绸缎铺掌柜。丈夫走了，铺子是她的命。铁掌帮要收街，她是头一个不交的。
 */

const TZ: Cond['sect'] = { school: '铁掌帮' };
const TZ_OUT: Cond['sect'] = { school: '铁掌帮', rank: '外门' };
const SHI = 'smtz_shi';
/** 收街的事正在相持 */
const ZA: Cond = { shi: { id: SHI, at: ['za'] } };

const ROOMS: RoomDef[] = [
  {
    id: 'smtz_fenzhang', name: '铁掌分舵', area: '苏州 · 山塘街西', region: 'sz', t: 10, map: [74, 26],
    desc: [
      { if: { hour: { from: 21, to: 6 } },
        text: '夜里分舵的灯还亮着一半，收账的帮众三五成群地出门，腰里都别着家伙。门口的石狮子叫人摸得发亮——进出的帮众都习惯摸一把，讨个彩头。' },
      { text: '山塘街西头一座三进的宅子，门口没挂匾，只有一对石狮子和两排小板凳——坐着的帮众闲聊天，眼睛却把每个过路的都过一遍。门里账房的算盘声从早响到晚。' }
    ],
    npcs: [],
    exits: [['西', 'sz_yamen', '东']],
    road: '你顺着山塘街往西走，市声渐稀，一座没挂匾的宅子立在街尾……',
    onEnter: [
      { if: { notFlag: 'smtz_seen' },
        do: [{ type: 'flag', flag: 'smtz_seen' }, { type: 'feed', tag: '江湖', text: '山塘街西头是铁掌帮的苏州分舵。帮里收平安钱，也包官司——苏州府衙的门，他们进得。' }] }
    ]
  }
];

/* ---------- 拜入时的效果 ---------- */

const TZ_JOIN: Effect[] = [
  { type: 'sect', school: '铁掌帮', rank: '记名' },
  { type: 'flag', flag: 'smtz_in' },
  // 复命拜入的，收钱的任务一并收尾（任务不能再悬在半截）
  { type: 'quest', id: 'smtz_shishi', stage: 2 },
  { type: 'rel', npc: 'smtz_leizhenshan', value: '点头之交', from: ['素不相识'], note: '铁掌帮苏州分舵的分舵主，收你做了记名弟子' },
  { type: 'feed', tag: '江湖', text: '你拜入铁掌帮，做了雷震山手下的记名弟子。帮规三条：上头的账要清，地界要守，出了事帮里兜着。门规宽，别派的功夫尽可学；只是帮里办事，功劳有账，坏名也有账——你自己掂量。' },
  { type: 'toast', text: '拜入铁掌帮 · 记名弟子' }
];

/* ---------- 师门差事：收账、押货（办了加贡献，也沾一点灰） ---------- */

const JOBS: JobDef[] = [
  { id: 'smtz_job_zhang', sect: '铁掌帮', tier: 1, title: '替账房去山塘街收两笔陈账', npc: 'smtz_qixiansheng', at: 'smtz_fenzhang', days: 2, again: 2 },
  { id: 'smtz_job_huo', sect: '铁掌帮', tier: 1, k: 1.5, title: '押一箱「茶叶」出城过官驿', npc: 'smtz_qixiansheng', at: 'smtz_fenzhang', days: 2, again: 3 }
];

/* ---------- 人物 ---------- */

const NPCS: NpcDef[] = [
  {
    id: 'smtz_leizhenshan', name: '雷震山', ini: '雷', tone: 'red', brief: '坐在堂上喝茶', hint: '分舵主',
    at: { room: 'smtz_fenzhang' },
    look: '五十来岁，一身团花缎袄，手掌比茶碗大一圈——虎口的茧是铁桥功打底打出来的。他给你倒茶的手腕沉而不僵，衙门的更鼓一响，他的指头就在桌上点两下。',
    verbs: ['交谈', '观察',
      { verb: '拜师', if: { notFlag: 'smtz_in' } },
      { verb: '接事', if: { flag: 'smtz_asked', notFlag: 'smtz_shi_done', noSect: true } },
      { verb: '复命', if: { quest: { id: 'smtz_shishi', is: 1 }, noSect: true } },
      { verb: '请教', if: { sect: TZ } },
      { verb: '讨差事', if: { sect: TZ } },
      { verb: '考校', if: { sect: TZ, notFlag: 'smtz_wai' } },
      { verb: '压街', if: { sect: TZ, shi: { id: SHI, at: ['fang', 'za'] } } }],
    actions: {
      交谈: [
        { if: { shi: { id: SHI, at: ['fang', 'za'] } },
          text: '雷震山放下茶碗：「山塘街的平安钱，收的是买卖的太平钱。孟娘子不交，还聚人看热闹——」他敲了敲桌面，「帮里三百口人要吃饭。这钱，收定了。识相的，别掺和。」' },
        { if: { shi: { id: SHI, at: ['ya_jie'] } },
          text: '雷震山难得笑出声：「你压街压得漂亮。总舵的信里都提了你——铁掌帮在苏州，站住了。」他把一壶酒推过来，「功劳账上，给你记了一笔大的。」' },
        { if: { shi: { id: SHI, at: ['shou_jie', 'guan_wen'] } },
          text: '雷震山的脸沉着：「街没吃下来，还叫人看了笑话。」他抬眼看你，「账先记着。铁掌帮的钱不白花，面子也不白丢——往后有你好看的。」' },
        { if: { sect: TZ_OUT },
          text: '雷震山呷了口茶：「外门弟子了。帮里的地界你也要守一份——守得住，功劳账上有你；守不住，罚账上也有你。」他把茶碗一磕，「铁掌帮的功夫，入门是底子，真东西在总舵。」' },
        { if: { sect: TZ },
          text: '雷震山放下茶碗：「帮规记着：上头的账要清，地界要守，出事帮里兜。铁桥功养气，排云掌动手——都练到略有小成，再替帮里办几件差事攒够一百贡献，我考校你升外门。」他抬眼，「帮里办事，功劳有账，坏名也有账。想清楚了再来。」' },
        { if: { flag: 'smtz_asked', notFlag: 'smtz_shi_done' },
          text: '雷震山把一张帖子推过来：「山塘街的绸缎铺，孟娘子，月底的平安钱欠着。你去收——收得回来，你就进帮；收不回来，别回来。」' },
        { text: '雷震山坐在堂上喝茶：「铁掌帮在苏州开了码头，收平安钱，也包官司——苏州府衙的门，我们进得。有人骂我们地头蛇。」他笑了一声，「蛇怎么了？蛇认得自己的一亩三分地。」' }
      ],
      观察: [{ text: '他算账不用算盘：帮里三百口的嚼用、官面四季的孝敬，张口就来——这不是打手头子，是做买卖的。' }],
      拜师: [
        { if: { pastSect: { school: '铁掌帮' } },
          text: '雷震山的脸沉了：「叛帮的人，帮规怎么写的你比我清楚。苏州不是你的地界——走。」' },
        { if: { xia: 30 },
          text: '雷震山把你上下打量了一遍，笑了：「侠义名声在外——好名声。可我们帮里办事，下不去手的不收。你这样的进了帮，头一个月就得跟帮规打起来。」他摆摆手，「去别处行你的侠罢。这条路上的钱，脏。」' },
        { if: { noSect: true },
          text: '雷震山打量你的手，又看你的鞋：「能办事么？帮里不看出身，不看名声，看的是能不能办事。」他把一张帖子推过来，「山塘街的绸缎铺，孟娘子，月底的平安钱欠着。你去收——收得回来，你就进帮。」',
          do: [{ type: 'quest', id: 'smtz_shishi', stage: 0 }, { type: 'flag', flag: 'smtz_asked' }] },
        { text: '雷震山摆摆手：「你身上挂着别家的名分。铁掌帮再不讲究，也不收吃两家的。」' }
      ],
      接事: [
        { text: '雷震山把帖子往你手里一塞：「还愣着？帖子收好，人去山塘街。月底的平安钱，二百文——怎么收，是你的事。帮里只看结果。」' }
      ],
      复命: [
        { if: { flag: 'smtz_shou_done' },
          text: '雷震山掂了掂钱袋：「钱收上来了，孟娘子也没闹——行，办事有分寸。」他从账房取来一块木牌，拍在你手里：「铁掌帮记名弟子。帮规三条：上头的账要清，地界要守，出事帮里兜。门规宽，别派的功夫尽可学——只是帮里办事，功劳有账，坏名也有账。」',
          do: TZ_JOIN },
        { if: { flag: 'smtz_dian_done' },
          text: '雷震山听完，盯着你看了半晌：「钱是收上来了——用你自己的钱。」他忽然笑了，「帮里三百口，没一个想过垫钱办事。你这份心思，是当掌柜的还是当打手的？」他把木牌拍在你手里，「记名弟子。帮里记你这个人，也记你这笔垫的钱——下不为例。」',
          do: TZ_JOIN },
        { if: { flag: 'smtz_qiang_done' },
          text: '雷震山听完，眉头拧着：「钱收上来了，人也打了，街坊骂声一片——」他把木牌丢过来，「收了。记名弟子。」他顿了顿，「不过你下手没轻重，往后收账，学会留三分。把人打死了，帮里给你打官司，也是要花钱的。」',
          do: [{ type: 'eming', delta: 2 }, ...TZ_JOIN] },
        { text: '雷震山抬了抬眼皮：「事呢？孟娘子的平安钱呢？收不回来，别回来。」' }
      ],
      请教: [
        { if: { sect: TZ, canLearn: 'mr_tieqiao', notLearned: 'mr_tieqiao' },
          text: '雷震山叫你在院里的石凳上站马步，两块青砖压上你的大腿：「铁桥功，桥是死的，人是活的——桥扛得住千斤，靠的不是硬，是吃劲的位置。」你站了一个下午，青砖碎了，腿没断。',
          do: [{ type: 'time', add: 240 }, { type: 'learn', skill: 'mr_tieqiao', prof: 60 }] },
        { if: { sect: TZ, canLearn: 'mr_paiyun', notLearned: 'mr_paiyun' },
          text: '「排云掌，掌出如推开云雾——不快，但是推得开。」雷震山一掌按在院里的石狮子上，石狮子挪了半寸，「铁掌帮的掌，打的是分量。分量从哪来？从你吃过的苦里来。」',
          do: [{ type: 'time', add: 120 }, { type: 'learn', skill: 'mr_paiyun', prof: 60 }] },
        { if: { sect: TZ_OUT, canLearn: 'mr_shuishangpiao', notLearned: 'mr_shuishangpiao' },
          text: '雷震山指着院里的大水缸：「水上漂，先从缸沿上走。苏州是水乡，帮里吃水路的饭——掉下去一次，就学乖一次。」你走到第七趟才不湿鞋。',
          do: [{ type: 'time', add: 240 }, { type: 'learn', skill: 'mr_shuishangpiao', prof: 60 }] },
        { if: { sect: TZ_OUT, notLearned: 'mr_shuishangpiao' },
          text: '雷震山摇头：「水上漂借的是铁桥功的桩。桥功没到融会贯通，你站缸沿跟站刀口一样。」' },
        { if: { sect: TZ_OUT },
          text: '雷震山把茶喝净：「外门能传的，就这一门。铁掌掌法是总舵的绝学——帮主的功夫，轮不到苏州传。」' },
        { if: { sect: TZ },
          text: '雷震山摆摆手：「记名弟子，学到这儿。铁桥功、排云掌练到略有小成，办差事攒够贡献，来考校。」' },
        { text: '雷震山抬了抬眼皮：「铁掌帮的功夫，不传外人。」' }
      ],
      讨差事: [
        { if: { job: 'smtz_job_zhang' }, text: '雷震山指了指账房：「陈账还没收？齐先生的账本上一笔一笔记着呢——记住，收账收的是钱，不是命。」' },
        { if: { job: 'smtz_job_huo' }, text: '雷震山压低声音：「那箱「茶叶」还没出城？官驿的条子在你手里——半夜走，别看，别问。」' },
        { if: { jobOpen: 'smtz_job_zhang' },
          text: '雷震山把账页撕给你：「山塘街两笔陈账，欠主的名字画了圈。收上来，贡献记你的——收不上来，也记你的。帮里的账，从来两头记。」',
          do: [{ type: 'job', id: 'smtz_job_zhang' }] },
        { if: { jobOpen: 'smtz_job_huo' },
          text: '雷震山压低了声音：「一箱「茶叶」，出城过官驿，驿丞那边有条子。办利索了贡献记你的——这一趟沾灰，你晓得。」',
          do: [{ type: 'job', id: 'smtz_job_huo' }] },
        { text: '雷震山摆摆手：「这几日没有差事。帮里养人，也养闲人——养不了太久。」' }
      ],
      考校: [
        // 两重境界加贡献：realm 只能写一个，第二个放进只有一项的 any 里
        { if: { sect: TZ, realm: { skill: 'mr_tieqiao', atLeast: 1 }, any: [{ realm: { skill: 'mr_paiyun', atLeast: 1 } }], gongxian: 100 },
          text: '雷震山叫你在院里接他三掌。三掌接完，你退了三步，站着没倒。雷震山点头：「桥功在腿上，排云在腰上，都像样了。帮里的差你也办过——替帮里担过事的人，才担得起外门的名字。」他把一块腰牌模样的木牌丢给你，「外门弟子。」',
          do: [{ type: 'sect', school: '铁掌帮', rank: '外门' }, { type: 'flag', flag: 'smtz_wai' }, { type: 'time', add: 60 },
            { type: 'feed', tag: '江湖', text: '你升了铁掌帮外门。雷震山说，水上漂可以学了——铁掌掌法，是总舵的绝学。' },
            { type: 'toast', text: '铁掌帮 · 升外门弟子' }] },
        { if: { sect: TZ, realm: { skill: 'mr_tieqiao', atLeast: 1 }, any: [{ realm: { skill: 'mr_paiyun', atLeast: 1 } }] },
          text: '雷震山点了点头：「桥和掌都有三成了。可外门弟子是替帮里办事的人——你还没替帮里出过力。去讨件差事，攒够一百的贡献，再来。」' },
        { if: { sect: TZ, gongxian: 100 },
          text: '雷震山看了看你的架子：「差事办得勤。功夫还浮——铁桥功、排云掌，都练到略有小成，再来考校。」' },
        { if: { sect: TZ },
          text: '雷震山摇头：「外门考三样：铁桥功、排云掌练到略有小成；办差事攒够一百的贡献。缺哪样，补哪样。」' },
        { text: '雷震山抬了抬眼皮：「你不是铁掌帮的人，考校什么？」' }
      ],
      压街: [
        { text: '雷震山把腰牌往你手里一拍：「帮里的人压街，名正言顺。你带着牛五走一趟山塘街——不用砸，就站在铺子门口喝茶。喝茶，懂么？茶喝到第三天，平安钱自己会来。」他压低声音，「办成了，贡献记大头；惹了事，帮里兜——兜完再算你的账。」',
          do: [{ type: 'shi', id: SHI, to: 'ya_jie' }, { type: 'gongxian', delta: 30 }, { type: 'eming', delta: 2 },
            { type: 'feed', tag: '江湖', text: '你替铁掌帮压街，山塘街的平安钱收齐了。' }] }
      ]
    }
  },
  {
    id: 'smtz_niuwu', name: '牛五', ini: '牛', tone: 'red', brief: '夜里出门办事',
    look: '三十来岁的帮众，膀大腰圆，手指关节比别人大一圈。他夜里出门砸铺子，天亮给他娘煎药——两件事，一张脸，都是木的。',
    at: [{ room: 'smtz_fenzhang', if: { hour: { from: 2, to: 19 } } },
         { room: 'sz_shantang', if: { hour: { from: 19, to: 2 }, shi: { id: SHI, at: ['za'] } } }],
    verbs: ['交谈', '观察', '动手'],
    actions: {
      交谈: [
        { if: { shenfen: 'bukuai' },
          text: '牛五把瓜子皮吐在地上，眼睛眯了：「捕快爷进了我们舵口？帮里正经做买卖的，平安钱官府都收——盘问？把海捕文书拿出来，对上名号再说。」他往门里挪了半步，「齐先生，记一下：六扇门的爷来过。」' },
        { if: { shi: { id: SHI, at: ['za'] } },
          text: '牛五正往锤头上缠布：「缠布是帮里的规矩——砸招牌，不伤人。雷爷说了，街要收，人不能废。」他抬眼看你，「你要替孟娘子出头？成。打赢我，今晚这街我们不砸。」' },
        { text: '牛五靠着门框打盹：「收账的？白天的账找齐先生，夜里的活儿看雷爷的帖子。」他掀开眼皮，「我娘的药钱，靠帮里月钱。你问这个做什么——帮里养人，人替帮里办事，天经地义。」' }
      ],
      观察: [{ text: '他袖口沾着药渣的苦味，指节的茧却收账砸招牌磨的。两副行头，一副心肠——帮里的人，都是这么过的。' }],
      动手: [{ do: [{ type: 'fight', foe: 'smtz_niuwu' }] }]
    } },
  {
    id: 'smtz_qixiansheng', name: '齐先生', ini: '齐', tone: 'gray', brief: '在账房拨算盘',
    at: { room: 'smtz_fenzhang' },
    look: '瘦削的账房先生，长年一件灰布长衫。帮里的账干净，人不干净——他记的每一笔平安钱都有名有姓，他心里有一杆秤。',
    verbs: ['交谈', '观察',
      { verb: '交差', if: { any: [{ job: 'smtz_job_zhang' }, { job: 'smtz_job_huo' }] } }],
    actions: {
      交差: [
        { if: { job: 'smtz_job_zhang' },
          text: '齐先生接过钱，点了两遍，在册子上划掉两笔：「两笔陈账，收齐了。」他顿了顿，笔尖在纸上顿出一个墨点，「账平了。做人的账——另记。」',
          do: [{ type: 'time', add: 20 }, { type: 'eming', delta: 1 }, { type: 'jobDone', id: 'smtz_job_zhang' }] },
        { if: { job: 'smtz_job_huo' },
          text: '齐先生验了官驿的回条，把「茶叶」两个字从册子上勾掉：「货到了，谁也没看见。」他把算盘拨得飞快，「这一趟的灰，记你名下了——帮里记功，别处记名。掂量着。」',
          do: [{ type: 'time', add: 30 }, { type: 'eming', delta: 1 }, { type: 'jobDone', id: 'smtz_job_huo' }] },
        { text: '齐先生抬起眼皮：「交什么差？这几日没有差事派罢。」' }
      ],
      交谈: [
        { if: { shenfen: 'bukuai' },
          text: '齐先生的算盘停了：「捕快爷查账？帮里的账，笔笔有主。」他从柜里推出一本册子，「收了多少平安钱，多少进了官面的孝敬——爷要真想翻，从府衙翻起，别翻我这本。」' },
        { text: '齐先生拨着算盘，头也不抬：「帮里的账，一笔一笔都有名有姓。谁交了，谁欠着，谁被打折了——」他翻了翻册子，「都在这儿。账是死的，记账的人，心里另有一本。」' }
      ],
      观察: [{ text: '他的算盘框上缠着一圈红绳——账房不拜财神拜红绳，问起来，他只说：「记个数。有些账，收不回来，也得记着。」' }]
    }
  },
  {
    id: 'smtz_mengniangzi', name: '孟娘子', ini: '孟', tone: 'amber', brief: '守着绸缎铺',
    look: '三十来岁的铺主娘子，围裙上全是线头。丈夫走了，铺子是她的命。铁掌帮要收街，她是头一个不交的。',
    at: { room: 'sz_shantang' },
    verbs: ['交谈', '观察',
      { verb: '收钱', if: { quest: { id: 'smtz_shishi', is: 0 }, notFlag: 'smtz_shou_done' } },
      { verb: '替垫', if: { quest: { id: 'smtz_shishi', is: 0 }, notFlag: 'smtz_dian_done', silver: 200 } },
      { verb: '硬逼', if: { quest: { id: 'smtz_shishi', is: 0 }, notFlag: 'smtz_qiang_done' } },
      { verb: '递状', if: ZA }],
    actions: {
      收钱: [
        { text: '你把帖子亮出来。孟娘子盯着那张纸看了半晌，转身进了里屋——出来时，手里攥着两块银锞子，指尖掐得发白：「二百文，点清楚。」她把钱拍在柜上，没有看你，「钱给帮里。委屈我认了——铺子留下就行。」你收了钱，一路觉得袖子里沉得不像银子。',
          do: [{ type: 'flag', flag: 'smtz_shou_done' }, { type: 'silver', delta: 200 }, { type: 'quest', id: 'smtz_shishi', stage: 1 }] }
      ],
      替垫: [
        { text: '你把帖子收了回去，从自己钱袋里数出二百文放在柜上：「平安钱我替交——就说钱收到了。铺子是你的命，别为二百文把命搭进去。」孟娘子愣住了，眼泪在眼眶里转了两圈才落下：「公子……这个钱，我记成借的。铺子缓过来，一分不少还。」',
          do: [{ type: 'silver', delta: -200 }, { type: 'flag', flag: 'smtz_dian_done' }, { type: 'quest', id: 'smtz_shishi', stage: 1 }, { type: 'rel', npc: 'smtz_mengniangzi', value: '相谈甚欢', from: ['素不相识'], note: '你替她垫了平安钱，她说这钱记成借的' }] }
      ],
      硬逼: [
        { text: '你把帖子拍在柜上，手按着剑柄：「帮里的规矩，月底的平安钱。你交是不交？」孟娘子的手抖了，到底还是从柜底摸出了钱匣。她把钱推过来，眼睛红了，人却没有哭——她把哭咽了回去。街上有人探头看了一眼，又缩回去。你收了钱，觉得满街的门板都在看你。',
          do: [{ type: 'flag', flag: 'smtz_qiang_done' }, { type: 'eming', delta: 2 }, { type: 'quest', id: 'smtz_shishi', stage: 1 }] }
      ],
      递状: [
        { if: { flag: 'smtz_pao' },
          text: '你把从雷震山指头上看出来的门道告诉孟娘子：「帮里最怕的不是拳头，是文书。状纸上别写砸铺子，写『勾结衙役、把持市面』——八个字，府台盖印之前要先掂量他自己。」孟娘子连夜改了状纸。三日后，府衙来人了。',
          do: [{ type: 'time', add: 30 }, { type: 'shi', id: SHI, to: 'guan_wen' }, { type: 'xia', delta: 2 },
            { type: 'feed', tag: '江湖', text: '你教孟娘子改了状纸的写法，府衙来人过问了收街的事。' }] },
        { if: { silver: 100 },
          text: '你替孟娘子垫了一百文的讼师钱：「状子要写『勾结衙役、把持市面』，别写砸铺子——砸铺子是小事，把持市面是大事。」孟娘子连夜托人写了状。三日后，府衙来人了。',
          do: [{ type: 'silver', delta: -100 }, { type: 'shi', id: SHI, to: 'guan_wen' }, { type: 'xia', delta: 2 },
            { type: 'feed', tag: '江湖', text: '你替孟娘子垫了讼师钱，府衙来人过问了收街的事。' }] },
        { if: { xia: 20 },
          text: '孟娘子抬头看你：「你的侠名，街坊说过。」她把状纸递给你，「会写状子的讼师要一百文——可你的名字押在状子上，比一百文管用。」状子三日后递进了府衙，府衙来人了。',
          do: [{ type: 'shi', id: SHI, to: 'guan_wen' }, { type: 'xia', delta: 2 },
            { type: 'feed', tag: '江湖', text: '你替孟娘子的状子押了名字，府衙来人过问了收街的事。' }] },
        { text: '孟娘子看着你：「状子会写要讼师，讼师要一百文；名字押上去要名声——公子两样占一样，再来说话。」' }
      ],
      交谈: [
        { if: { shi: { id: SHI, at: ['gui_bang'] } },
          text: '孟娘子把铺门的板子上了一半：「交了。钱交了，人留了——街是太平了，就是这条街，再不是街坊的街了。」她压低声音，「你走吧。让人看见你进我的铺子，下个月你的平安钱也要涨。」' },
        { if: { shi: { id: SHI, at: ['ya_jie'] } },
          text: '孟娘子看着柜上的钱匣，半天没说话：「钱收上来了……你也是铁掌帮的？当初在街口，看你不像。」她把一匹素绢推过来，「拿着。别说什么买不买——娘子我认人，不认帮。」' },
        { if: { shi: { id: SHI, at: ['guan_wen'] } },
          text: '孟娘子把府衙的回执压在柜台上，手还在抖：「官府来问话了，帮里收敛了——收的是钱，不是规矩。」她朝你福了一礼，「状子递得值。这街上的铺子，一家一家都记着。」' },
        { if: { shi: { id: SHI, at: ['shou_jie'] } },
          text: '孟娘子把砸裂的门板拆下来，换了新的：「打跑砸铺子的那天，整条街的铺子都出来看。」她笑了，眼角却湿着，「三年了，这条街头一回有人替铺子出头。」' },
        { if: ZA,
          text: '孟娘子把门板一块块上好，声音压得极低：「第二回砸了。招牌劈了，人受了伤——我不交。这铺子是我男人的命换的，交了平安钱，就是告诉他，他的命不值钱。」她攥着门闩，「官府是帮他们说话的，街坊是不敢说话的。我要递状子——哪怕递到府台案头，石沉大海，也递。」' },
        { text: '孟娘子理着柜上的绸缎：「客官看点什么？山塘街的绸，苏州城里数一数二——」她抬起头，「铁掌帮的人来的话，告诉他：钱没有，命一条。」' }
      ],
      观察: [{ text: '她柜台的抽屉上着两把锁——一把锁钱，一把锁状纸的底稿。铺子后头的门闩，是新加的。' }]
    }
  }
];

/* ---------- 世事：收街 ---------- */

const SHI_DEF: ShiDef[] = [
  {
    id: SHI, name: '铁掌帮收街', region: 'sz', start: { flag: 'smtz_seen' }, first: 'fang',
    steps: {
      fang: {
        now: '铁掌帮放话：山塘街的铺面，月底起月月交「平安钱」。几家老铺不交，夜里叫人砸了招牌。',
        news: '铁掌帮要在山塘街收平安钱，不交的铺子夜里叫人砸了招牌。',
        next: { days: 2, to: 'za' }
      },
      za: {
        now: '孟娘子的绸缎铺第二回被砸，人受了伤。街上的铺子交了一半，剩下的在观望——孟娘子还在撑着。',
        news: '绸缎铺孟娘子第二回被砸，山塘街的铺子交了一半平安钱，剩下的在观望。',
        where: 'sz_shantang', next: { days: 5, to: 'gui_bang' }
      },
      gui_bang: {
        now: '山塘街归了铁掌帮，平安钱月月照收。交得起的留下，交不起的搬走——街上比从前「太平」，也没了从前的热闹。',
        news: '山塘街归了铁掌帮，平安钱月月照收。老铺搬了一批，街上冷清了一半。',
        where: 'sz_shantang'
      },
      shou_jie: {
        now: '砸铺子的牛五叫人打跑了，铁掌帮折了面子，暂时没再上门。山塘街的铺子抱成了团——孟娘子的门板，换上了新的。',
        news: '砸铺子的帮众叫人打跑了，山塘街的铺子抱成了团，铁掌帮暂时没再上门。'
      },
      guan_wen: {
        now: '状子递进了府衙，府衙来人过问。铁掌帮交了一笔「规费」，砸铺子的换成了「讲理的」——街上太平了半分，孟娘子的平安钱，也减了半。',
        news: '状子递进府衙，府衙来人过问，铁掌帮交了规费。山塘街太平了半分，平安钱减了半。'
      },
      ya_jie: {
        now: '铁掌帮的人日日在山塘街的铺子门口喝茶，平安钱收齐了，街面太平了——这太平，是帮里给的。',
        news: '铁掌帮的人日日在山塘街铺子门口喝茶，平安钱收齐了。街面太平了——帮里给的太平。'
      }
    }
  }
];

const FOES: FoeDef[] = [
  {
    id: 'smtz_niuwu', name: '牛五', title: '铁掌帮收账的', ini: '牛', tone: 'red', weapon: '缠布短锤', ws: '锤', tag: '收街',
    nature: '刚', reach: '短', rank: 0.9, build: 'outer', firstTell: 2,
    moves: ['砸招牌', '缠丝锤', '贴身靠', '回身锤'],
    flourish: ['锤上缠的布条呼呼作响', '下手有分寸，专砸值钱的', '嘴里骂骂咧咧，眼睛看着别处', '一锤一个坑，绝不多砸第二下'],
    tells: [
      { name: '砸招牌', text: '牛五抡起短锤，照着铺面的招牌狠狠砸下……', dom: 'li', after: '招牌裂成两半，锤头又收了回去！' },
      { name: '缠丝锤', text: '他忽然矮身，缠布的锤头贴着地皮兜你的脚踝……', dom: 'qiao', after: '锤头擦着你的鞋面划过去，带起一溜沙！' }
    ],
    asides: ['孟娘子的门板裂了一条缝。', '街坊们远远地看着，没人敢出声。', '他腰里露出一角药包——给他娘带的。'],
    opening: ['锤头砸偏了，崩了自己的手', '缠布松了，锤头打滑', '叫骂岔了气，锤势一滞'],
    intro: '牛五把短锤往掌心一磕：「孟娘子不交钱，我这锤就夜夜来。你拦——行啊，锤上缠着布，不伤人命。」',
    win: '牛五的短锤脱手，砸翻了自己带来的凳子。他捂着手腕，看看孟娘子紧闭的铺门，忽然把腰里的药包紧了紧：「……今晚不砸了。雷爷问起，就说街坊抱团，不好下手。」',
    lose: '缠布锤扫在你肩上，你跌进孟娘子铺前的门板堆里。牛五收了锤，把孟娘子新上的门板卸走了两块：「明晚再来。」',
    results: {
      win: { tag: '护街 · 胜', title: '今晚不砸了', button: '帮孟娘子上门板',
        story: '牛五走了，走前把他砸裂的门板扶起来靠好。孟娘子从铺子里出来，看着新裂的门板看了半天，回头给街坊们烧了一壶热水——这条街，头一回有人替铺子出头。',
        do: [{ type: 'shi', id: SHI, to: 'shou_jie' },
          { type: 'xia', delta: 3 },
          { type: 'feed', tag: '江湖', text: '你打跑了砸铺子的牛五，山塘街的铺子抱成了团。' }] },
      lose: { tag: '收街', title: '没拦住', button: '爬起来',
        story: '牛五收了锤，卸走两块门板：「明晚再来。」孟娘子的哭声从铺子后头传出来，很低，像怕人听见。',
        do: [{ type: 'heal', hpAtLeast: 0.5 }] }
    }
  }
];

/* ---------- 任务：收钱的两难 ---------- */

const QUESTS: QuestDef[] = [
  { id: 'smtz_shishi', name: '铁掌帮 · 收一份平安钱', stages: [
    // 孟娘子那里收了钱、替垫、硬逼，都推到第 1 步：回分舵复命
    { title: '去山塘街绸缎铺收月底的平安钱', to: 'sz_shantang', who: 'smtz_mengniangzi', hint: '找山塘街的孟娘子收下钱，或替她垫上，或硬逼她交。' },
    { title: '回分舵复命', to: 'smtz_fenzhang', who: 'smtz_leizhenshan', hint: '回山塘街西头的铁掌分舵，向雷震山复命。',
      need: [
        { if: { any: [{ flag: 'smtz_shou_done' }, { flag: 'smtz_dian_done' }, { flag: 'smtz_qiang_done' }] }, text: '从孟娘子那里把平安钱收到手' },
        { if: { noSect: true }, text: '身上没有别家师门' }
      ] },
    { title: '铁掌帮 · 收一份平安钱 · 完' }
  ] }
];

/* ---------- 根基之眼 ---------- */

const EYES: EyeDef[] = [
  { npc: 'smtz_leizhenshan', attr: '胆魄', atLeast: 25,
    text: '衙门的更鼓一响，他的指头就在桌沿点两下——他不怕人，怕的是文书。官府的印一盖，帮里的地界就是纸。',
    do: [{ type: 'flag', flag: 'smtz_pao' }] },
  { npc: 'smtz_leizhenshan', attr: '根骨', atLeast: 29,
    text: '他倒茶的手腕沉而不僵，虎口的茧从掌心长到腕骨——铁桥功的底子打在骨头上，外门的皮相学不来。' },
  { npc: 'smtz_leizhenshan', attr: '悟性', atLeast: 29,
    text: '他算账不用算盘：帮里三百口的嚼用、官面四季的孝敬，张口就来——这个人不止是打手头子，是做买卖的。' },
  { npc: 'smtz_niuwu', attr: '体魄', atLeast: 25,
    text: '他夜里砸铺子，天亮煎药，眼窝深得能盛水——这副身板是拿命换月钱养出来的，撑不了几年了。' },
  { npc: 'smtz_niuwu', attr: '胆魄', atLeast: 25,
    text: '他锤上缠布，砸招牌不伤人——不是心善，是帮规。守帮规守成习惯的人，反而好说话。' },
  { npc: 'smtz_mengniangzi', attr: '胆魄', atLeast: 25,
    text: '她门板换了新的，门闩加了两道，人还守在柜上——这条街被砸成这样，她头一个不交钱。胆子是命换的。' },
  { npc: 'smtz_mengniangzi', attr: '悟性', atLeast: 25,
    text: '柜台的抽屉上两把锁，一把锁钱，一把锁状纸的底稿——会盘账的铺主，心里比谁都清楚什么最要紧。' }
];

/* ---------- 传闻 ---------- */

const NEWS: NewsDef[] = [
  { if: { flag: 'smtz_in' },
    text: '铁掌帮的苏州分舵新收了个记名弟子。街坊们说，帮里如今连读书人都收了——也有人说，收的不是读书人，是会办事的。' },
  { if: { flag: 'smtz_wai' },
    text: '铁掌帮苏州分舵有人升了外门，雷震山亲自倒的茶。帮里人说，这人办差事从来不推——账上也从来不缺他的名。' },
  { if: { shi: { id: SHI, at: ['gui_bang'] } },
    text: '山塘街归了铁掌帮，平安钱月月照收。老铺搬了一批——苏州人说，山塘街的热闹，是搬一半、吓一半搬没的。' },
  { if: { shi: { id: SHI, at: ['shou_jie'] } },
    text: '山塘街的铺子抱成了团，砸铺子的帮众折了面子。铁掌帮暂时没再上门——帮里的账上，记下了这条街。' },
  { if: { shi: { id: SHI, at: ['guan_wen'] } },
    text: '府衙过问了山塘街收街的事，铁掌帮交了规费。街坊们说：官府的印，帮里买得动一时，买不动一世。' }
];

const pack: ContentPack = {
  rooms: ROOMS,
  npcs: NPCS,
  foes: FOES,
  jobs: JOBS,
  quests: QUESTS,
  shi: SHI_DEF,
  eyes: EYES,
  news: NEWS
};
export default pack;
