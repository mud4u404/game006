import type { Cond, ContentPack, Effect, EyeDef, FoeDef, JobDef, NewsDef, NpcDef, QuestDef, RoomDef, ShiDef } from '../types';

/**
 * 桃花岛的江南道据点（Issue #133）：瓜洲江滩上的听潮小筑，岛上来的弟子曲蘅在此看病、卜卦。
 * 规矩见 docs/menpai.md 第七节，立身之道见 docs/lizu.md 第二节（奇门遁甲、医卜星相、孤傲——岛主青眼才得真传），
 * 写法见 docs/content-guide.md「拜师」「师门差事」，示范见 baishi.ts、shimen-chaishi.ts。
 * id 一律以 smth_ 开头。序章的渡口小屋、江伯坟一个字没碰；寒江旧案的谜，一个字没提。
 *
 * 人物与动机：
 * - 曲蘅：岛上来的弟子，奉命下山历练医卜。他医术是真高，脾气也是真孤——给人看病分文不取，
 *   卜卦卦金不过百，可谁要说他一句好话，他反倒不自在。他收徒只看悟性：「岛主的功夫，笨人学了是糟蹋。」
 *   他在等一封信，等了半年——信不来，他就回不去。（软肋：孤傲，正邪两道都不亲近。）
 * - 阿芦：曲蘅的哑仆。一起在风浪里活下来的船工，不会说话，什么都会：晒药、浇花、撑船。
 *   小筑那半院的桃花，是他从岛上带苗来种的。
 * - 六斤：渔家的孩子，娘咳嗽了一冬。他隔三差五来小筑抓药，药钱用两条鱼抵——曲蘅收鱼，是给他脸面。
 * - 胡三：渔行摆渡的牙人。曲蘅来了以后，相面的、问卦的都往江滩跑，他的生意淡了三成——
 *   他认定这个外来先生是「妖人」，就等一个由头。
 */

const TH: Cond['sect'] = { school: '桃花岛' };
const TH_OUT: Cond['sect'] = { school: '桃花岛', rank: '外门' };
const SHI = 'smth_shi';
/** 乱石阵困了船，火烧小筑的风声起来了 */
const HUO: Cond = { shi: { id: SHI, at: ['huo'] } };

const SHI_DEF: ShiDef[] = [
  {
    id: SHI, name: '乱石阵困船', region: 'gz', start: { flag: 'ssgz_seen' }, first: 'qi',
    steps: {
      qi: {
        now: '江滩上多了一片乱石阵，渔家的船进去就出不来，转半天又回到原处。石头摆的方位透着古怪——是有人按阵法摆的。',
        news: '江滩上多了一片乱石阵，渔船进去就出不来，石头摆的方位透着古怪。',
        next: { days: 2, to: 'huo' }
      },
      huo: {
        now: '两条渔船困在阵里一整天，渔家把账算到小筑头上——渔行的胡三挑头，说要放火烧了那座小筑。曲蘅闭门不出。',
        news: '渔船困在乱石阵里，胡三挑头要火烧听潮小筑，说阵是先生布的。',
        where: 'smth_xiaozhu', next: { days: 3, to: 'shao' }
      },
      shao: {
        now: '小筑叫人放了火，半院桃花烧成灰。曲蘅带着哑芦连夜下了江——渔家的船，后来是一位过路货郎引出来的。瓜洲从此没有看诊卜卦的先生。',
        news: '听潮小筑叫人烧了，曲先生下了江。瓜洲的郎中日，没了。',
        where: 'smth_xiaozhu'
      },
      jie_zhen: {
        now: '乱石阵拆了，困住的渔船出来了。曲蘅当着全镇赔了个不是——滩角码回了石头，烧过的阵眼里种了株新桃。',
        news: '乱石阵拆了，渔船出来了。曲先生赔了不是，听说阵眼上还种了株新桃。'
      },
      quan_huo: {
        now: '胡三的火没放起来——有人劝住了他，曲蘅当面拆了阵。一场火，化成了两家的和气。',
        news: '火烧没起来：有人劝住了胡三，曲先生当面拆了乱石阵，还给他腰上的旧伤包了膏药。'
      },
      duan_huo: {
        now: '胡三叫人打散了，火没放成。曲蘅当面拆了阵，还给他包了膏药——梁子解没解，只有他们自己知道。',
        news: '胡三叫人打散了，火没放成。曲先生当面拆了阵，还倒贴了一贴膏药。'
      }
    }
  }
];

const ROOMS: RoomDef[] = [
  {
    id: 'smth_xiaozhu', name: '听潮小筑', area: '瓜洲 · 江滩', region: 'gz', t: 10, map: [84, 84],
    desc: [
      { if: { shi: { id: SHI, at: ['huo'] } },
        text: '江滩上的小筑竹篱围着，半院桃花开得正好——可篱笆外头聚了一群渔家，个个攥着火把。领头的是渔行的胡三，嘴里喊着「妖人布阵，困我渔船」。' },
      { if: { shi: { id: SHI, at: ['shao'] } },
        text: '小筑烧过了。半院桃花成了一地焦枝，药炉翻倒在竹篱边。门上挂着一把新锁——人走了，瓜洲从此没有看诊卜卦的先生。' },
      { if: { shi: { id: SHI, at: ['jie_zhen'] } },
        text: '小筑的竹篱边围着谢船的渔家。乱石阵拆了，石头码回滩角，阿芦在焦黑的阵眼里种了一株新桃。' },
      { if: { shi: { id: SHI, at: ['quan_huo', 'duan_huo'] } },
        text: '小筑的桃花还开着。江滩上的乱石阵拆了大半，滩上的人散了，只有几个孩子还在石头缝里钻进钻出地玩。' },
      { if: { hour: { from: 21, to: 6 } },
        text: '夜里的听潮小筑只亮一盏灯。曲蘅在院里观星，星图铺在石桌上，镇纸压着四角——听说他在等一封信，等得星星都数熟了。' },
      { text: '江滩上的一座小筑，竹篱柴门，半院桃花——这花在瓜洲见不着，是从海岛上带的苗。晒药的竹匾摆了一廊，药香混着江风。门口一块小木牌：「看病随缘，卜卦百文。」' }
    ],
    npcs: [],
    exits: [['东', 'gz_pier', '筑']],
    road: '你沿江滩往下游走，绕过一片芦苇荡，桃花的香气先一步到了……',
    onEnter: [
      { if: { notFlag: 'smth_seen' },
        do: [{ type: 'flag', flag: 'smth_seen' }, { type: 'feed', tag: '江湖', text: '瓜洲江滩的听潮小筑住着一位岛上来的先生，看病随缘，卜卦百文——就是脾气孤，不好亲近。' }] }
    ]
  }
];

/* ---------- 拜入时的效果 ---------- */

const TH_JOIN: Effect[] = [
  { type: 'sect', school: '桃花岛', rank: '记名' },
  { type: 'flag', flag: 'smth_in' },
  // 走「引阵」拜入的，阵图的任务一并收尾（任务不能再悬在半截）
  { type: 'quest', id: 'smth_zhen', stage: 1 },
  { type: 'rel', npc: 'smth_quheng', value: '点头之交', from: ['素不相识'], note: '听潮小筑的曲先生，看你悟性尚可，收你做了记名弟子' },
  { type: 'feed', tag: '江湖', text: '你拜入桃花岛，做了曲蘅门下的记名弟子。门规宽，别派的功夫尽可学；但医卜的规矩三条：诊金随缘，卦金不过百，骗人钱财者逐出师门。曲蘅说：「岛主的功夫，学得慢不打紧，心术歪了，一天也留不得。」' },
  { type: 'toast', text: '拜入桃花岛 · 记名弟子' }
];

/* ---------- 师门差事：医卜星相 ---------- */

const JOBS: JobDef[] = [
  { id: 'smth_job_yao', sect: '桃花岛', tier: 1, title: '把煎好的药送去六斤家', npc: 'smth_liujin', at: 'gz_yushi', days: 2, again: 2 },
  { id: 'smth_job_fang', sect: '桃花岛', tier: 1, k: 1.5, title: '照方子去回春堂配药，配好带回来', npc: 'smth_liujin', at: 'gz_yushi', days: 2, again: 3 }
];

/* ---------- 人物 ---------- */

const NPCS: NpcDef[] = [
  {
    id: 'smth_quheng', name: '曲蘅', ini: '曲', tone: 'jade', brief: '在廊下筛药', hint: '岛上来的弟子',
    look: '三十来岁，一身洗旧的青衫，袖口全是药渍。他筛药的手腕悬得极稳，一炷香不抖。话少，看人先看眼睛——他信眼睛不会说谎。',
    // 小筑被烧、他连夜下了江以后，就不在瓜洲了（审查 E25）
    at: [{ room: 'smth_xiaozhu', if: { hour: { from: 7, to: 13 }, shi: { id: SHI, not: ['shao'] } } },
         { room: 'gz_town', if: { hour: { from: 13, to: 19 }, shi: { id: SHI, not: ['shao'] } } },
         { room: 'smth_xiaozhu', if: { hour: { from: 19, to: 24 }, shi: { id: SHI, not: ['shao'] } } }],
    verbs: ['交谈', '观察', '看诊', '卜卦',
      { verb: '拜师', if: { notFlag: 'smth_in' } },
      { verb: '入阵', if: { flag: 'smth_asked', notFlag: 'smth_zhen', noSect: true } },
      { verb: '请教', if: { sect: TH } },
      { verb: '讨差事', if: { sect: TH } },
      { verb: '考校', if: { sect: TH, notFlag: 'smth_wai' } },
      { verb: '解阵', if: HUO },
      { verb: '引阵', if: { sect: TH, shi: { id: SHI, at: ['huo'] } } }],
    actions: {
      交谈: [
        { if: { shi: { id: SHI, at: ['huo'] } },
          text: '曲蘅闭着门，声音从板壁后头出来：「阵是我布的，防的是滩上夜里行凶的水匪——没想到困了渔船。困住的船我自然要解。放火？」他冷笑了一声，「让他们烧。烧了小筑，烧不了我的手艺。」' },
        { if: { shi: { id: SHI, at: ['jie_zhen'] } },
          text: '曲蘅把一包药递给来谢的渔家，头一回没有摆脸色：「阵拆了，是应该的。渔船困了两天，误了一汛——这包药，给船上受了寒的。」他看了你一眼，「你也出过力。拿两文钱的卦金，我给你解一卦。」' },
        { if: { shi: { id: SHI, at: ['quan_huo'] } },
          text: '曲蘅听着门外胡三赔不是的声音，手上的筛药没停：「他疑我，不怪他——怪我把阵布在了渔道边上。」他把筛好的药装包，「你的情面，替我省了一场火。记下了。」' },
        { if: { shi: { id: SHI, at: ['duan_huo'] } },
          text: '曲蘅看着散去的渔家，眉头没松：「打散了人，结下了仇。他的火没放成，我的阵也没了道理——拆了罢。」他把药锄递给阿芦，「你替我拆阵。我认这个亏。」' },
        { if: { shi: { id: SHI, at: ['shao'] } },
          text: '门上挂着新锁，谁也叫不开。只有阿芦蹲在焦黑的篱笆边，往灰烬里浇了一瓢水，又浇了一瓢。' },
        { if: { sect: TH_OUT },
          text: '曲蘅筛药的手没停：「外门弟子了。医卜的规矩守着——诊金随缘，卦金不过百。这两条守得住，岛主的功夫，你才接得住。」' },
        { if: { sect: TH },
          text: '曲蘅筛着药：「碧潮心法走柔劲，兰花拂穴手走巧劲，旋风扫叶腿走腿上的刚劲——三样都练，才是桃花岛的底子。练到略有小成，再替小筑办几件差事，把差事办出个样子，我考校你升外门。」他顿了顿，「岛主的功夫，练得慢不打紧——心术歪了，一天也留不得。」' },
        { if: { flag: 'smth_asked', notFlag: 'smth_zhen' },
          text: '曲蘅在院里摆了五块石头：「入门的阵，九宫的底子。你从离位进，照着生门走——走出来，就算过了。走出来走不出来的，都别恼：这个阵，考的不是脚，是心窍。」' },
        { text: '曲蘅筛着药，头也不抬：「看病随缘，卜卦百文。卦金我从不多的——我要的是『算得准』三个字，不是钱。」他把筛好的药倒进罐里，「至于拜师——岛主的功夫，笨人学了是糟蹋。你的心窍开没开，先走个阵我看看再说。」' }
      ],
      观察: [{ text: '他案头压着半张没画完的阵图，边角叫海风浸得发黄。他筛药筛一阵，就要看那图一眼——图上有他没画完的东西，也有他没说完的话。' }],
      // 诊金：本门弟子随缘十文；外人八十文一级（医馆的一半）；没钱能赊一回，赊过的先还账（审查 E03、D06）
      看诊: [
        { if: { silver: 10, wounded: true, sect: TH },
          text: '曲蘅两根手指搭在你腕上，眉头一皱：「筋伤带内伤，还拖了日子。」他从药柜里取出三包药，又在你背心一按——一股柔劲顺着你背走了半圈，伤口像叫温水泡开了一样。「本门的，诊金随缘。」（银两 −10 文）',
          do: [{ type: 'silver', delta: -10 }, { type: 'cure', levels: 1 }, { type: 'heal', hpAtLeast: 1 }, { type: 'time', add: 30 }] },
        { if: { silver: 160, wounded: true, flag: 'smth_qian' },
          text: '曲蘅搭了你的脉，开了药，收钱时连上回赊的那一份一并收了，一文不多，一文不少。（银两 −160 文）',
          do: [{ type: 'silver', delta: -160 }, { type: 'flag', flag: 'smth_qian', value: false }, { type: 'cure', levels: 1 }, { type: 'heal', hpAtLeast: 1 }, { type: 'time', add: 30 }] },
        { if: { wounded: true, flag: 'smth_qian' },
          text: '曲蘅搭了搭你的脉，没开方子：「上回的账还挂着。」他不催，也不松口，「瓜洲的伤号我从来没催过账——可也没有一赊再赊的。」' },
        { if: { silver: 80, wounded: true },
          text: '曲蘅两根手指搭在你腕上，眉头一皱：「筋伤带内伤，还拖了日子。」他从药柜里取出三包药，又在你背心一按——一股柔劲顺着你背走了半圈，伤处松快了一层。（银两 −80 文）',
          do: [{ type: 'silver', delta: -80 }, { type: 'cure', levels: 1 }, { type: 'heal', hpAtLeast: 1 }, { type: 'time', add: 30 }] },
        { if: { wounded: true },
          text: '曲蘅搭了你的脉，把三包药放在你手边：「先记账。瓜洲的伤号，我从来没催过账。」他不收钱，也不看你，「下回来，先把这一回的八十文带上。」',
          do: [{ type: 'flag', flag: 'smth_qian' }, { type: 'cure', levels: 1 }, { type: 'heal', hpAtLeast: 1 }, { type: 'time', add: 30 }] },
        { text: '曲蘅搭了搭你的脉，把手收回去：「没伤。没伤别占郎中的凳——外头排队的那位，先看。」' }
      ],
      卜卦: [
        // 「卦金免了」只有头一回；往后照收一百，也不再长见识（审查 E02）
        { if: { silver: 100, notFlag: 'smth_gua' },
          text: '你摇出一卦。曲蘅盯着卦象看了半晌，眉头动了动：「这一卦……卦金免了。」他把铜钱推回来，不再多说。你起身告辞，走到篱笆外才回过味来——他说的是「免」，不是「不准」。（银两分文未动）',
          do: [{ type: 'flag', flag: 'smth_gua' }, { type: 'lilian', amount: 20 }] },
        { if: { silver: 100 },
          text: '你又摇了一卦。曲蘅看了一眼卦象，收了一百文：「卦是一样的卦。你心里没换，卦也换不了。」（银两 −100 文）',
          do: [{ type: 'silver', delta: -100 }] },
        { text: '曲蘅瞥了一眼你的钱袋：「卦金一百，随缘的诊金可以欠，卦金不能欠。」他把铜钱匣子推了推，「想好了再来摇。」' }
      ],
      拜师: [
        { if: { pastSect: { school: '桃花岛' } },
          text: '曲蘅抬起眼：「岛主的门墙，出去容易回来难。你自己走到哪一步，自己心里有数——什么时候走回岛上跪完了，什么时候再来。」' },
        // 旧存档：走阿芦那条路过了阵、却没拜进门的人，这里补上
        { if: { noSect: true, flag: 'smth_zhen' },
          text: '曲蘅放下药筛：「阵你走过了，我说过算数。」他从案头取过一本手抄的药性赋递给你，「从今往后，你是小筑的人。」',
          do: TH_JOIN },
        { if: { flag: 'cw_qiao' },
          text: '曲蘅把你从头到脚看了一遍，像看一味掺了假的药：「借水鬼敛财的事，江上传遍了。」他把药筛搁下，「医卜这行，骗的是人信。你骗过一回，我教你的每一卦，你都会拿去骗第二回。走吧。」' },
        { if: { eming: 12 },
          text: '曲蘅摇了摇头：「恶名在外。桃花岛的功夫不挑正邪——可挑名声。你这名字传进岛主耳朵里，我也要跟着挨罚。」' },
        { if: { noSect: true, attr: { key: '悟性', atLeast: 24 }, notFlag: 'smth_refused' },
          text: '曲蘅放下药筛，头一回正眼看你——看了很久。「心窍是开的。」他从案头取过阵图的一角，「入门的阵，九宫的底子。你从离位进，照着生门走——走出来，这徒弟我就收。」',
          do: [{ type: 'quest', id: 'smth_zhen', stage: 0 }, { type: 'flag', flag: 'smth_asked' }] },
        { if: { noSect: true, attr: { key: '悟性', atLeast: 24 } },
          text: '曲蘅看了看你：「上回说了不行，这回还来？」他把你上下打量了一遍，「……嗯。心窍比上回开了些。也罢，阵再走一回。」',
          do: [{ type: 'flag', flag: 'smth_refused', value: false }, { type: 'flag', flag: 'smth_asked' }] },
        { if: { noSect: true },
          text: '曲蘅摇了摇头，话很平，不刺人：「岛主的功夫，笨人学了是糟蹋——你现在的悟性，学了是害你。」他把一册手抄的药性赋推过来，「拿去。什么时候把这本读通了，什么时候心窍开了，再来叩门。这条路过两年也作数。」',
          do: [{ type: 'flag', flag: 'smth_refused' }] },
        { text: '曲蘅头也不抬：「你身上挂着别家的名分。桃花岛再孤，也不收吃两家饭的。」' }
      ],
      入阵: [
        { if: { attr: { key: '悟性', atLeast: 26 } },
          text: '你从离位进阵，脚下的方位在心里过了一遍又一遍。生门在西北——你走进去，绕了两圈，眼前忽然一亮：五块石头的影子在地上连成一线，线的那头，就是出口。曲蘅收了石阵，半晌道：「自己走出来的。好。」',
          do: [{ type: 'time', add: 90 }, { type: 'flag', flag: 'smth_zhen' }, { type: 'quest', id: 'smth_zhen', stage: 1 }, ...TH_JOIN] },
        { text: '你在阵里走得满头是汗。阿芦蹲在阵外，捡了根芦苇秆，在地上东一点西一点地画。你顺着他的点连起来一看——原来生门早就在脚底下，是你自己绕远了。曲蘅收了石阵：「他自己没走出来，可他看得懂哑芦的点。也算数。」',
          // 「也算数」就真算数：原来这条路没拜进门，之后入阵按钮没了、拜师又从头说起，卡死（审查 E01）
          do: [{ type: 'time', add: 180 }, { type: 'flag', flag: 'smth_zhen' }, { type: 'quest', id: 'smth_zhen', stage: 1 }, ...TH_JOIN] }
      ],
      请教: [
        { if: { sect: TH, canLearn: 'tq_bichao', notLearned: 'tq_bichao' },
          text: '曲蘅叫你面朝江水坐下：「碧潮心法，气要走潮水的路——涨的时候满，退的时候匀，永远不跟浪头较劲。」你坐了一下午，丹田里那口气，果然随着江潮一起一落。',
          do: [{ type: 'time', add: 240 }, { type: 'learn', skill: 'tq_bichao', prof: 60 }] },
        { if: { sect: TH, canLearn: 'tq_lanhua', notLearned: 'tq_lanhua' },
          text: '「兰花拂穴手，手型如兰，指头是瓣。」曲蘅伸出两指，在你肩井、曲池各轻轻一点，半边身子就麻了，「拂的不是穴，是他发力的那个念头。」他一穴一穴喂给你，喂到你自己的指头也会点人。',
          do: [{ type: 'time', add: 120 }, { type: 'learn', skill: 'tq_lanhua', prof: 60 }] },
        { if: { sect: TH, canLearn: 'tq_xuanfeng', notLearned: 'tq_xuanfeng' },
          text: '「旋风扫叶腿，腿上的功夫——扫的是地上的落叶，练的是腰里的轴。」曲蘅一腿扫过，满院的桃花瓣跟着他的腿风转了一圈，「腿快不算快，腰里的轴转得快才算。」',
          do: [{ type: 'time', add: 120 }, { type: 'learn', skill: 'tq_xuanfeng', prof: 60 }] },
        { if: { sect: TH_OUT, canLearn: 'tq_luoying', notLearned: 'tq_luoying' },
          text: '曲蘅在桃花树下站定：「落英神剑掌，掌出如落英——看着纷纷扬扬，每一片都打在实处。」他一掌拍出，满树桃花瓣跟着掌风转了一圈，竟一瓣没落。「旋风扫叶腿的腰轴没到融会贯通，这掌接不住。先把腿练透。」',
          do: [{ type: 'time', add: 240 }, { type: 'learn', skill: 'tq_luoying', prof: 60 }] },
        { if: { sect: TH_OUT, canLearn: 'tq_yuxiao', notLearned: 'tq_yuxiao' },
          text: '曲蘅取出一管玉箫：「玉箫剑法，箫是剑，剑也是箫。」他横箫一划，江风都跟着拐了个弯，「碧潮心法练到融会贯通，这一划才划得动——潮有了，箫才有声。」',
          do: [{ type: 'time', add: 240 }, { type: 'learn', skill: 'tq_yuxiao', prof: 60 }] },
        { if: { sect: TH_OUT, notLearned: 'tq_luoying' },
          text: '曲蘅摇头：「落英神剑掌从旋风扫叶腿里出。腿上的腰轴没到融会贯通，掌上就是一捧乱花瓣。」' },
        { if: { sect: TH_OUT, notLearned: 'tq_yuxiao' },
          text: '曲蘅摇头：「玉箫剑法要碧潮心法托底。心法没到融会贯通，箫是箫，剑是剑，两样凑不到一处。」' },
        { if: { sect: TH_OUT },
          text: '曲蘅把药筛收了：「外门能传的，都传了。弹指神通是真传——岛主的青眼，不在我的手里，在你往后的医卜功德里。」' },
        { if: { sect: TH },
          text: '曲蘅摆摆手：「记名弟子，学到这儿。三门入门的功夫练到略有小成，再办差事攒够贡献，来考校。落英神剑掌、玉箫剑法——升了外门再传。」' },
        { text: '曲蘅筛着药：「桃花岛的功夫，不传外人。」' }
      ],
      讨差事: [
        { if: { job: 'smth_job_yao' }, text: '曲蘅头也不抬：「药还没送到？六斤他娘咳着等呢——药凉了不要紧，凉了的心要不得。」' },
        { if: { job: 'smth_job_fang' }, text: '曲蘅把方子递给你：「去回春堂照方配药，配好带回来交给六斤——两副药对照着吃，他娘的咳嗽才断得干净。」' },
        { if: { jobOpen: 'smth_job_yao' },
          text: '曲蘅把一包煎好的药递给你：「六斤他娘的药，趁热送去。顺路替我把脉案问了——咳嗽拖了一冬，方子要改。」',
          do: [{ type: 'job', id: 'smth_job_yao' }] },
        { if: { jobOpen: 'smth_job_fang' },
          text: '曲蘅把改好的方子折好封上：「去回春堂照方配一副，带回来。药方这种东西，多一个人对过，就多救一个人。」',
          do: [{ type: 'flag', flag: 'smth_fang_ready', value: false }, { type: 'job', id: 'smth_job_fang' }] },
        { text: '曲蘅摆摆手：「这几日小筑没有差事。」他顿了顿，补了一句，「——去看病的不算差事，那是本分。」' }
      ],
      考校: [
        // 两重境界加贡献：realm 只能写一个，第二个放进只有一项的 any 里
        { if: { sect: TH, realm: { skill: 'tq_lanhua', atLeast: 1 }, any: [{ realm: { skill: 'tq_bichao', atLeast: 1 } }], gongxian: 100 },
          text: '曲蘅叫你在桃花树下走一趟拂穴手，走完了，问：「这一手，拂给谁看？」你答不上来。曲蘅替你答：「拂给病人看——你送过药，知道这一手快一分，病人的疼就少一分。」他难得地点了点头，「从今天起，你是桃花岛的外门弟子。」',
          do: [{ type: 'sect', school: '桃花岛', rank: '外门' }, { type: 'flag', flag: 'smth_wai' }, { type: 'time', add: 60 },
            { type: 'feed', tag: '江湖', text: '你升了桃花岛外门。曲蘅说，落英神剑掌、玉箫剑法都可以学了。' },
            { type: 'toast', text: '桃花岛 · 升外门弟子' }] },
        { if: { sect: TH, realm: { skill: 'tq_lanhua', atLeast: 1 }, any: [{ realm: { skill: 'tq_bichao', atLeast: 1 } }] },
          text: '曲蘅点了点头：「手上有三成了。可桃花岛的功夫是医人的功夫——你还没替人做过什么。去办几件差事，把差事办出个样子，再来。」' },
        { if: { sect: TH, gongxian: 100 },
          text: '曲蘅看了看你的手：「差事办得勤，心是善的。手上还浮着——兰花拂穴手、碧潮心法，都练到略有小成，再来考校。」' },
        { if: { sect: TH },
          text: '曲蘅摇头：「外门考三样：兰花拂穴手、碧潮心法练到略有小成；再替小筑办差事，把差事办出个样子。缺哪样，补哪样。」' },
        { text: '曲蘅筛着药：「你不是桃花岛的人，考校什么？」' }
      ],
      解阵: [
        { if: { flag: 'smth_tu' },
          text: '你揣着记下的阵图走进乱石阵，照图反走，一炷香就把两条渔船引出了阵。滩上的人轰然叫好，胡三的火把垂了下去。',
          do: [{ type: 'time', add: 30 }, { type: 'shi', id: SHI, to: 'jie_zhen' }, { type: 'xia', delta: 3 },
            { type: 'feed', tag: '江湖', text: '你照着阵图反走，把困在乱石阵里的渔船引了出来。' }] },
        { if: { attr: { key: '悟性', atLeast: 25 } },
          text: '你蹲在阵边看了半晌，从石下草倒的方向悟出行走的路数，领着渔船出了阵。',
          do: [{ type: 'time', add: 60 }, { type: 'shi', id: SHI, to: 'jie_zhen' }, { type: 'xia', delta: 3 },
            { type: 'feed', tag: '江湖', text: '你看破了乱石阵的生门，把渔船引了出来。' }] },
        { text: '你围着石阵转了两圈，只觉得石头都长得一样。渔船还在阵里打转，胡三的火把越举越高。要看破这座阵——要么看得出石头底下的路数（悟性要够），要么手里有那张阵图。' }
      ],
      引阵: [
        { text: '你拜在曲蘅门下，学过九宫的底子。你走进阵里，脚下踩着生门，口里念着方位，领着两条渔船东拐西绕——一炷香，船出了阵。曲蘅站在滩上看着，没说话，可他把药锄递给了阿芦：「去，把阵拆了。布阵困人，是我的不是。」',
          do: [{ type: 'time', add: 30 }, { type: 'shi', id: SHI, to: 'jie_zhen' }, { type: 'xia', delta: 3 },
            { type: 'feed', tag: '江湖', text: '你以桃花岛的阵法底子引出渔船，曲蘅当面拆了乱石阵。' }] }
      ]
    }
  },
  {
    id: 'smth_alu', name: '阿芦', ini: '芦', tone: 'gray', brief: '晒药浇花',
    look: '黑瘦的哑仆，不会说话，嗓子是早年一场风浪里哑的。他什么都懂：晒药看天，浇花看土，撑船看水色。半院的桃花是他一棵一棵带苗种活的。',
    at: [{ room: 'smth_xiaozhu', if: { hour: { from: 8, to: 18 } } },
         { room: 'smth_xiaozhu', if: { hour: { from: 20, to: 23 } } }],
    verbs: ['交谈', '观察', '比划'],
    actions: {
      交谈: [
        { text: '阿芦不会说话。你问他什么，他就领你走到什么跟前：问药，他掀开竹匾；问路，他指向江滩；问他自己——他指了指半院的桃花，又指了指自己的心口。' }
      ],
      观察: [{ text: '他的袖口别着一小截芦苇秆，削得溜圆——是画阵图点子用的。他不会写字，可他画的地界，比字还清楚。' }],
      比划: [
        { if: HUO,
          text: '阿芦一把拉住你，往滩上跑。他蹲在乱石阵边，用芦苇秆在地上画：一个圈，圈里画了条鱼，鱼头朝东南——又画了个「曲」字的半边，急得直拍大腿。他是在告诉你：船往东南走，就出得来；这阵，先生自己也在愁。',
          do: [{ type: 'feed', tag: '江湖', text: '阿芦比划着告诉你：乱石阵的生门在东南。' }] },
        { text: '阿芦领你到桃树下，比划了半天：先指桃花，再指海的方向，最后双手交叠放在胸口。你猜了半天——他想说的是：这些桃花的种子，是他和先生从家里带出来的。' }
      ]
    }
  },
  {
    id: 'smth_liujin', name: '六斤', ini: '六', tone: 'amber', brief: '拎着两条鱼',
    at: { room: 'gz_yushi' },
    look: '十一二岁的渔家孩子，瘦得裤腰打卷，手里拎的两条鲫鱼还在弹。他娘咳了一冬，他隔三差五来小筑抓药——药钱，是用鱼抵的。',
    verbs: ['交谈', '观察',
      { verb: '交差', if: { any: [{ job: 'smth_job_yao' }, { job: 'smth_job_fang' }] } }],
    actions: {
      交谈: [
        { if: { shi: { id: SHI, at: ['shao'] } },
          text: '六斤蹲在烧焦的篱笆边，手里的鱼也不拎了：「先生走了……我娘的药，往后上哪儿抓去？」他的眼圈红着，「都怪那伙放火的——先生给人看了一年的病！」' },
        { if: { shi: { id: SHI, at: ['huo'] } },
          text: '六斤拽住你的袖子，声音发抖：「大哥，他们真要放火？先生的药还欠着我娘三副呢！」他往小筑那边望了一眼，「胡三叔平时不是这样的——是渔船困住了，他急的。」' },
        { text: '六斤把两条鱼往你手里塞：「替我交给先生——他看病不收钱，可我娘说，不能白拿人的药。」他挠挠头，「先生收了鱼就笑一下。他笑起来，其实不难看。」' }
      ],
      观察: [{ text: '他的草鞋底磨穿了，脚趾头冻得通红——看病的药钱省下了，鞋钱又叫娘扣下了。渔家的账，都是这么算的。' }],
      交差: [
        { if: { job: 'smth_job_yao' },
          text: '六斤接过药包，一路小跑进了屋。半晌，他娘的咳嗽声从里屋传出来——咳得轻了。六斤跑出来朝你鞠了个躬：「先生还问了脉案……他说，方子要改。」',
          do: [{ type: 'time', add: 20 }, { type: 'jobDone', id: 'smth_job_yao' }] },
        { if: { job: 'smth_job_fang', flag: 'smth_fang_ready' },
          text: '六斤接过封好的药包，对着方子逐味看过，又用细绳扎好，道：「回春堂掌柜对过了，我拿回去给娘煎。」他把药小心地揣进怀里，朝你作了一揖。',
          do: [{ type: 'time', add: 30 }, { type: 'flag', flag: 'smth_fang_ready', value: false }, { type: 'jobDone', id: 'smth_job_fang' }] },
        { if: { job: 'smth_job_fang' },
          text: '六斤看着你手里的方子，道：「药还没配呢。回春堂就在老街上，把方子交到药案上，掌柜才好抓药。」' },
        { text: '六斤眨眨眼：「交什么差？先生这几日没有差事派呀。」' }
      ]
    }
  },
  {
    id: 'smth_yaoan', name: '回春堂药案', obj: true, icon: 'stele', brief: '药秤搁在方子旁', night: true,
    at: { room: 'gz_town', if: { job: 'smth_job_fang' } },
    look: '回春堂柜台旁摆着药秤，秤盘擦得干净。掌柜将曲蘅的方子压在案上，旁边摊着几张包药的纸。',
    verbs: ['观察', '配药'],
    actions: {
      配药: [
        { if: { job: 'smth_job_fang', flag: 'smth_fang_ready' },
          text: '掌柜指着你带在身上的药包，道：「这副已配齐了，送去给六斤，莫把两副混在一处。」' },
        { if: { job: 'smth_job_fang' },
          text: '你把方子铺在药案上。回春堂掌柜逐味称过，将药裹好，在纸上写下六斤他娘的名字，道：「曲先生将药钱记在小筑账上了。这副照方煎，别和先前的混了。」你收好药包，方子也一并带上。',
          do: [{ type: 'time', add: 30 }, { type: 'flag', flag: 'smth_fang_ready' }] },
        { text: '药案上摆着药秤，掌柜收起包药纸，道：「配药得有方子。」' }
      ]
    }
  },
  {
    id: 'smth_husan', name: '胡三', ini: '胡', tone: 'red', brief: '提着火把叫嚷',
    look: '渔行的牙人，膀子粗，嗓门大。他说一不二的名声在瓜洲有一号——可他挑头烧小筑，喊得最响的，眼睛却一直往人群后头瞟。',
    at: { room: 'smth_xiaozhu', if: { shi: { id: SHI, at: ['huo'] } } },
    verbs: ['交谈', '观察', '动手',
      { verb: '听劝', if: HUO }],
    actions: {
      交谈: [
        { text: '胡三把火把往地上一顿：「两条船困了一天一夜！渔家的命就不是命？他曲蘅摆几块破石头就没事了？」他喊得脸红脖子粗，声音却悄悄往下掉，「……再说，他一个外乡人，凭什么在瓜洲滩上摆阵？」' }
      ],
      观察: [{ text: '他手里的火把举得高，火油却只浸了半截——真要放火，他舍不得这一点油钱。他喊的是气势，等的是台阶。' }],
      动手: [{ do: [{ type: 'fight', foe: 'smth_husan' }] }],
      听劝: [
        { if: { any: [{ xia: 20 }, { attr: { key: '胆魄', atLeast: 25 } }] },
          text: '你拦在火把前头：「曲先生布阵护宅，不是困渔船——阵的事，他自己认，当场就拆。你烧了他的小筑，往后渔家病了，谁看？你娘上回的腰腿疼，谁给的膏药？」胡三举着火把愣了半天，一跺脚：「……拆阵！他要是不拆，我——我再来！」人群散了，火把一枝一枝灭在江滩上。',
          do: [{ type: 'shi', id: SHI, to: 'quan_huo' },
            { type: 'feed', tag: '江湖', text: '你劝住了提火把的胡三，小筑的火没放起来，乱石阵当面拆了。' }] },
        { text: '你上前劝了两句。胡三眼一瞪：「你算哪一盘菜的？两条船困着，你赔啊？」他火把一横，人群跟着起哄——劝这样的人，要么有侠义的名声压他，要么有胆气当面把他镇住。' }
      ]
    }
  }
];

const FOES: FoeDef[] = [
  {
    id: 'smth_husan', name: '胡三', title: '渔行的牙人', ini: '胡', tone: 'red', weapon: '一支船桨', ws: '棍', tag: '烧筑',
    nature: '刚', reach: '长', rank: 0.7, build: 'outer', firstTell: 2,
    moves: ['拨浪桨', '横扫滩头', '戳脚', '甩泥点'],
    flourish: ['船桨抡得呼呼响', '一桨扫起半滩沙', '膀子上的肉一疙瘩一疙瘩', '嘴里的叫骂没停过'],
    tells: [
      { name: '横扫滩头', text: '胡三抡圆了船桨，拦腰横扫过来，桨风带着沙……', dom: 'li', after: '桨头砸在竹篱上，篱笆断了两根！' },
      { name: '甩泥点', text: '他忽然弯腰抓了把湿泥甩你的眼……', dom: 'qiao', after: '泥点溅开，糊了半棵桃树！' }
    ],
    asides: ['围着的人往后退了半圈。', '六斤的鱼掉在了地上。', '阿芦挡在小筑门前，一步不让。'],
    opening: ['船桨抡过了头', '脚下踩滑了湿沙', '叫骂岔了气'],
    intro: '胡三把船桨往手里一横：「外乡的妖人！今天这火，谁也拦不住——拦的先过我这一桨！」',
    win: '胡三的船桨飞出去老远。他一屁股坐在沙滩上，火把也忘了捡。人群里有人小声说：「胡三叔平时……也不是这样的人。」他听见了，脸上的横肉抖了抖，到底没再爬起来。',
    lose: '船桨扫在你腿上，你坐倒在沙滩里。胡三的火把往小筑的篱笆上凑——火苗舔上竹篱的声音，刺啦刺啦的。',
    results: {
      win: { tag: '烧筑 · 拦下', title: '火没放起来', button: '扶胡三起来',
        story: '人散了，火把一枝一枝灭在江滩上。胡三坐在沙里喘粗气，半晌，自己嘟囔了一句：「……其实就是船困急了。」曲蘅从小筑里出来，把阵拆了，又给他腰上的旧伤包了一贴膏药。胡三捏着膏药，半天说出一句：「下回……说话好好说。」',
        do: [{ type: 'shi', id: SHI, to: 'duan_huo' },
          { type: 'feed', tag: '江湖', text: '你拦下了放火的胡三，曲蘅当面拆了乱石阵。' }] },
      lose: { tag: '烧筑', title: '叫人围了', button: '爬起来',
        story: '胡三的桨背把你扫了个跟头。他没追打，只是把火把举得更高——人群的火把，一枝一枝都举了起来。',
        do: [{ type: 'heal', hpAtLeast: 0.5 }] }
    }
  }
];

/* ---------- 任务：九宫阵的考验 ---------- */

const QUESTS: QuestDef[] = [
  { id: 'smth_zhen', name: '桃花岛 · 入门阵', stages: [
    { title: '走出曲蘅摆的九宫阵', to: 'smth_xiaozhu', who: 'smth_quheng', hint: '曲蘅说，走出他摆的九宫阵，这徒弟他才肯收。从离位进，照着生门走。',
      need: [{ if: { noSect: true }, text: '了断别家的名分' }],
      // 小筑烧了，曲蘅下了江，再不回瓜洲（世事 smth_shi 的 shao 是尽头）
      fail: { if: { shi: { id: 'smth_shi', at: ['shao'] } }, text: '听潮小筑只剩焦黑的篱笆，曲蘅不知去向，这阵是没人摆了。' } },
    { title: '桃花岛 · 入门阵 · 完' }
  ] }
];

/* ---------- 根基之眼 ---------- */

const EYES: EyeDef[] = [
  { npc: 'smth_quheng', attr: '悟性', atLeast: 29,
    text: '他案头压着半张没画完的阵图，江滩上那片乱石，是照着这图的另一半摆的——图上圈了一个生门的位，和他嘴上说的不一样。',
    do: [{ type: 'flag', flag: 'smth_tu' }] },
  { npc: 'smth_quheng', attr: '根骨', atLeast: 29,
    text: '他筛药的手腕悬得极稳，一炷香不抖——内功走的是柔劲，劲路藏在腕骨里，不显山露水。' },
  { npc: 'smth_quheng', attr: '体魄', atLeast: 25,
    text: '他右手中指第一节有一道旧裂——那不是药杵砸的，是常年弹指弹出来的茧裂了口。这双手，不止会抓药。' },
  { npc: 'smth_alu', attr: '身法', atLeast: 25,
    text: '他晒药的竹匾摆得层层叠叠，人从匾架间穿行，衣角不带一格药。这小院的每一步路，都长在他脚下。' },
  { npc: 'smth_alu', attr: '体魄', atLeast: 25,
    text: '他卷起的裤腿下，小腿上全是旧疮疤——风浪里泡出来的人，疤好了，腿上的力气没丢。' },
  { npc: 'smth_husan', attr: '胆魄', atLeast: 25,
    text: '他喊得最响，火油却只浸了半截火把。他不是真要烧——他在等一个人给他台阶下。' },
  { npc: 'smth_husan', attr: '悟性', atLeast: 25,
    text: '他撺掇人的话一环扣一环，哪句是嘘、哪句是实，他心里门儿清——牙人的嘴，秤比谁都准，他自己那杆秤也一样。' }
];

/* ---------- 传闻 ---------- */

const NEWS: NewsDef[] = [
  { if: { flag: 'smth_in' },
    text: '听潮小筑收了个学生，曲先生头一回正经收徒——瓜洲人都说，先生的卦，如今算得更准了。', who: ['渔家', '船夫', '郎中'], about: 'you' },
  { if: { flag: 'smth_wai' },
    text: '听潮小筑的学生升了桃花岛外门。曲先生难得请全镇喝了一回茶——卦金还是一百，一文没少。', who: ['渔家', '船夫', '货郎'], about: 'you' },
  { if: { shi: { id: SHI, at: ['shao'] } },
    text: '听潮小筑叫人放了火，曲先生连夜下了江。瓜洲的郎中日，从那天起就没了他的份——渔家的病，又没人看了。', who: ['渔家', '船夫', '郎中'] },
  { if: { shi: { id: SHI, at: ['jie_zhen'] } },
    text: '江滩的乱石阵拆了，困住的渔船出来了。曲先生当着全镇的面赔了个不是——瓜洲人说，这先生嘴硬心软。', who: ['渔家', '船夫', '货郎'] }
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
