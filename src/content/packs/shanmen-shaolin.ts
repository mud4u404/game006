import type { Cond, ContentPack, Effect, EyeDef, FightResult, FoeDef, JobDef, NewsDef, NpcDef, QuestDef, RoomDef } from '../types';

/**
 * 少林的江南道据点（Issue #116）：镇江金山寺，云游长老寂照在此挂单，收俗家弟子。
 * 规矩见 docs/menpai.md 第七节，写法见 docs/content-guide.md「拜师」，示范见 baishi.ts。
 * id 一律以 smsl_ 开头。
 *
 * 人物与动机：
 * - 寂照长老：北边招兵的名册一年比一年厚，乱世要来了。少林想在江南道留个落脚处，他也想多收几个
 *   「手上有功夫、心里有戒」的俗家弟子——功夫是护人的，不是护财的。所以他亲自考校，考的不是输赢，是分寸。
 * - 圆慧：知客僧。去年有个挂单的刀客吃醉了酒，在斋堂动了刀，伤了两个香客，是圆慧拼着挨了一刀把人架出去的。
 *   从那天起，他见了带兵刃上山的就没好脸色。冷脸不是刻薄，是怕。
 * - 老葛：灶上的火工。当年也想拜在山门下，根骨叫人驳了，舍不得走，留下来挑水，一挑二十年。
 *   他待来拜师的格外热络——那条门槛有多高，他比谁都清楚。
 *
 * 两难与代价：
 * - 一人一师门：拜了少林，别家的门就关上了；门规严，在门期间只学本门功夫。
 * - 戒杀：手上有人命（画舫护院、东关街打手、虹桥盐丁三条路都记着旗标）的，长老不收，什么时候冤孽清了什么时候再来。
 * - 考验两条路：接长老三十招（点到为止）；或者替老葛把山下的水挑上灶房——体魄好的双桶一趟，
 *   不好的老老实实多走两趟。挑水没有恶名，考校输了也不结仇，但都要下力气。
 * - 升外门：罗汉拳、混元一气功都练到略有小成，还得行过侠义——佛门的功夫是护人的，手上没护过人的，不升。
 */

/* ---------- 地点 ---------- */

const ROOMS: RoomDef[] = [
  {
    id: 'smsl_jinshan', name: '金山寺', area: '镇江 · 金山', region: 'zj', t: 15, map: [26, 8],
    desc: [
      { if: { flag: 'smsl_in' },
        text: '金山立在江心，寺在山上，黄墙碧瓦，江风里全是香火气。你上山不用看知客僧的脸色——殿前的知客僧远远看见你，板着的脸松了松，侧身让你进去了。' },
      { text: '金山立在江心，寺在山上，黄墙碧瓦，江风里全是香火气。山门口的知客僧上下打量你腰间的兵刃，板着脸，把半边身子让开门，什么也没说。' }
    ],
    npcs: ['smsl_jizhao', 'smsl_yuanhui', 'smsl_laoge'],
    exits: [['东', 'zj_xijin', '西']],
    road: '你雇了条小船，从西津渡往江心划去，金山的塔尖在树影里一点一点近了……',
    onEnter: [
      { if: { notFlag: 'smsl_seen' },
        do: [{ type: 'flag', flag: 'smsl_seen' }, { type: 'feed', tag: '江湖', text: '金山寺挂单着一位少林来的寂照长老，说是云游，一住半年，要在江南收几个俗家弟子。' }] }
    ]
  }
];

/* ---------- 拜入、升地位时的效果 ---------- */

const SMSL: Cond['sect'] = { school: '少林' };
const SMSL_OUT: Cond['sect'] = { school: '少林', rank: '外门' };

const SM_JOIN: Effect[] = [
  { type: 'sect', school: '少林', rank: '记名' },
  { type: 'flag', flag: 'smsl_in' },
  // 走「领考」拜入的，挑水的任务一并收尾（任务不能再悬在半截）
  { type: 'quest', id: 'smsl_shui', stage: 1 },
  { type: 'rel', npc: 'smsl_jizhao', value: '相谈甚欢', from: ['素不相识', '点头之交'], note: '金山寺挂单的少林长老，收你做了记名弟子' },
  { type: 'feed', tag: '江湖', text: '你拜入少林，做了寂照长老门下的记名弟子。长老当面立了门规：不杀生，不偷盗，不饮酒；门规严，在门期间，不学别派的武功。' },
  { type: 'toast', text: '拜入少林 · 记名弟子' }
];

const yieldOf = (who: string, button: string): FightResult => ({
  tag: '切磋', title: '收手认输', button, story: `你拱手认输。${who}点点头，也收了手：「改日再来。」`
});

/* ---------- 人物 ---------- */

const NPCS: NpcDef[] = [
  {
    id: 'smsl_jizhao', name: '寂照长老', ini: '寂', tone: 'blue', brief: '在廊下抄经',
    look: '七十上下，眉白如霜，一领僧衣洗得发白却浆得笔挺。抄经的手稳得出奇，一笔一画都收着劲。左膝盘坐时，总要先用手垫一下。',
    verbs: ['交谈', '观察',
      { verb: '拜师', if: { notFlag: 'smsl_in' } },
      { verb: '领考', if: { flag: 'smsl_asked', notFlag: 'smsl_shui', noSect: true } },
      { verb: '请教', if: { sect: SMSL } },
      { verb: '讨差事', if: { sect: SMSL } },
      { verb: '考校', if: { sect: SMSL, notFlag: 'smsl_wai' } }],
    actions: {
      交谈: [
        { if: { sect: SMSL_OUT },
          text: '长老点点头：「外门弟子，出门在外，报的是少林的名。名是护身的，不是护短的——记着。」他把抄好的经页吹了吹，「寺里的功夫，你能学的都学得起了。」' },
        { if: { sect: SMSL },
          text: '长老抄经的手没停：「门规记着：不杀生，不偷盗，不饮酒。在门期间，别派的功夫不许碰——不是防你，是护你，练岔了，神仙难救。」他抬了抬眼，「罗汉拳、混元一气功都练到略有小成，再行几件侠义的事，我给你升外门。」' },
        { if: { flag: 'smsl_ju' },
          text: '长老抄经的手停了停：「冤孽没清，寺里的门槛你跨不得。回去多行善事，多积阴德——不为进这扇门，为你自己。」' },
        { if: { flag: 'smsl_asked', notFlag: 'smsl_shui' },
          text: '长老头也没抬：「考校有两条路。想动手，接老衲三十招，点到为止；不想动手，替老葛把山下的水挑上灶房。挑水的，老衲也一样收。」' },
        { text: '长老抄着经，慢慢地说：「北边的募兵名册，一年比一年厚。要乱了。」他把笔搁下，「少林想在江南道留个落脚的地方。老衲在这里收俗家弟子，教的功夫，为的是护人——乱世里，手上有功夫、心里有戒的人，多一个是一个。」' }
      ],
      观察: [{ text: '廊下那壶茶斟了三回，壶嘴离杯半尺，水线细得像一炷香，一滴也没洒在案上。' }],
      领考: [
        { if: { hour: { from: 20, to: 5 } },
          text: '长老搁下笔：「天黑了。佛门不夜战——明儿一早，日头上山门，你来。」' },
        { text: '长老搁下笔，走到殿前的月台上，双掌合十：「来。三十招，点到为止。」', do: [{ type: 'fight', foe: 'smsl_kao' }] }
      ],
      拜师: [
        { if: { pastSect: { school: '少林' } },
          text: '长老睁开了眼：「山门出去容易，回来难。戒律上写着：叛出山门的，要跪着进来。你先想清楚，再来叩这扇门。」' },
        { if: { any: [{ flag: 'huafang_guard_dead' }, { flag: 'jy_sun_sha' }, { flag: 'cw_sha' }] },
          text: '长老的目光落在你的手上，看了半晌：「老衲在江湖上走了一遭，看得出来——你手上，有过人命。」他合十低眉，「我佛慈悲。戒杀是本门第一戒。冤孽未清，这扇门就不开。回去多行善事——不为进这扇门，为你自己。」',
          do: [{ type: 'flag', flag: 'smsl_ju' }] },
        { if: { eming: 12 },
          text: '长老摇了摇头：「俗家弟子出门在外，报的是少林的名。你这个名，少林担不起。先把这些事了一了。」' },
        { if: { noSect: true, flag: 'smsl_shui' },
          text: '长老看见你肩头压出的那两道水担的印子，点了点头：「水挑上来了，人也就有了准头。挑水不伤人，挑得动，是因为肯下力气。」他合十，「从今往后，你是老衲门下的记名弟子。」',
          do: SM_JOIN },
        { if: { noSect: true },
          text: '长老把笔搁下：「拜老衲的门，先过一过考校。想动手的，接老衲三十招，点到为止；不想动手的，替老葛把山下的水挑上灶房——挑水的，老衲也一样收。」他重新提起笔，「想好了，来叩这扇门。」',
          do: [{ type: 'quest', id: 'smsl_shui', stage: 0 }, { type: 'flag', flag: 'smsl_asked' },
            { type: 'feed', tag: '江湖', text: '金山寺的寂照长老说：想拜师，接他三十招，或者替火工老葛把水挑上灶房，两条路都算考校。' }] },
        { text: '长老合十：「佛门不受两家香火。你身上挂着别家的名分，先去那边了断干净。」' }
      ],
      请教: [
        { if: { sect: SMSL, canLearn: 'sl_hunyuan', notLearned: 'sl_hunyuan' },
          text: '长老叫你在蒲团上面壁盘坐，掌心朝上搭在膝上：「混元一气，先求一个『一』字。呼吸绵绵，若有若无——气不是攒出来的，是等出来的。」你从午后坐到日头偏西，丹田里才有一点暖意。',
          do: [{ type: 'time', add: 240 }, { type: 'learn', skill: 'sl_hunyuan', prof: 60 }] },
        { if: { sect: SMSL, canLearn: 'sl_luohan', notLearned: 'sl_luohan' },
          text: '「罗汉拳，一十八手，手手都是最笨的直拳拙掌。」长老一招一式拆给你看，掌出无风，「笨功夫练到不用想，就是罗汉。」你在殿前的青石板上，打了一整个下午。',
          do: [{ type: 'time', add: 120 }, { type: 'learn', skill: 'sl_luohan', prof: 60 }] },
        { if: { sect: SMSL_OUT, canLearn: 'sl_yiwei', notLearned: 'sl_yiwei' },
          text: '长老指着寺前那一段院墙：「一苇渡江，渡的不是江，是自己的身子。先在墙头上走。走得稳了，江水自会渡你。」你在墙头上来来回回走了一个时辰，鞋底磨穿了一层。',
          do: [{ type: 'time', add: 240 }, { type: 'learn', skill: 'sl_yiwei', prof: 60 }] },
        { if: { sect: SMSL_OUT, canLearn: 'sl_jinzhong', notLearned: 'sl_jinzhong' },
          text: '长老拿起木鱼槌，在你身上从肩到背一处一处地敲：「金钟罩，不是硬挨，是把气布在皮里。槌到哪儿，气到哪儿。钟罩住了，槌就只是响。」敲完一轮，你浑身热得像刚出过一身大汗。',
          do: [{ type: 'time', add: 240 }, { type: 'learn', skill: 'sl_jinzhong', prof: 60 }] },
        { if: { sect: SMSL_OUT, canLearn: 'sl_weituo', notLearned: 'sl_weituo' },
          text: '「韦陀掌，掌出如合十——合十是敬人，出掌是护人。」长老双掌一合一推，殿前的香灰被掌风带起一线，「这一掌打出去，先想想替谁打。」',
          do: [{ type: 'time', add: 180 }, { type: 'learn', skill: 'sl_weituo', prof: 60 }] },
        { if: { sect: SMSL_OUT, canLearn: 'sl_fengmo', notLearned: 'sl_fengmo' },
          text: '长老从殿后取出一根齐眉木杖，塞到你手里：「疯魔杖法，仗的不是疯，是忘。忘了我，忘了胜负，杖就是手，手就是杖。」他只演了一遍，你握着杖的手心，全是汗。',
          do: [{ type: 'time', add: 180 }, { type: 'learn', skill: 'sl_fengmo', prof: 60 }] },
        { if: { sect: SMSL_OUT, notLearned: 'sl_yiwei' },
          text: '长老摇头：「混元一气功还没练到融会贯通，接不住一苇渡江。气是根，身法是梢。先把根养足。」' },
        { if: { sect: SMSL_OUT, notLearned: 'sl_jinzhong' },
          text: '长老摇头：「金钟罩接不住——混元一气功还没到融会贯通。罩是气布的，不是皮厚的。」' },
        { if: { sect: SMSL_OUT, notLearned: 'sl_weituo' },
          text: '长老摇头：「韦陀掌从罗汉拳里化出来。你的罗汉拳还没到融会贯通，掌上是空架子。」' },
        { if: { sect: SMSL_OUT, notLearned: 'sl_fengmo' },
          text: '长老摇头：「疯魔杖法也是罗汉拳的根。拳没练到融会贯通，杖就是一根烧火棍。」' },
        { if: { sect: SMSL_OUT },
          text: '长老合十：「外门能传的，都传给你了。拈花指、燃木刀法，是内门的功夫；易筋经、狮子吼，是镇山的宝贝——机缘不到，老衲也做不了主。」' },
        { if: { sect: SMSL },
          text: '长老摆摆手：「记名弟子，学到这儿。罗汉拳、混元一气功练到略有小成，来考校。韦陀掌、疯魔杖法、金钟罩、一苇渡江——升了外门再传。」' },
        { text: '长老合十：「少林的功夫，不传外人。」' }
      ],
      讨差事: [
        { if: { job: 'smsl_job_xun' }, text: '守一道长……寂照长老敲了敲木鱼：「山门还没巡？后半夜露重，僧衣多穿一件。」' },
        { if: { jobOpen: 'smsl_job_xun' },
          text: '寂照长老把一盏灯笼递给你：「近来山下有毛贼，夜里替寺里巡山门。三更一遍，五更一遍——灯在，寺里的人心里就安。」',
          do: [{ type: 'job', id: 'smsl_job_xun' }] },
        { if: { jobOpen: 'smsl_job_shui' },
          text: '寂照长老把扁担递给你：「灶房的水缸见底了。后山泉眼挑两担回来——少林寺的功夫，一半是挑水挑出来的。」',
          do: [{ type: 'job', id: 'smsl_job_shui' }] },
        { text: '寂照长老合十：「这几日寺里没有差事。」' }
      ],
      考校: [
        // 两重境界的条件：realm 只能写一个，第二个放进只有一项的 any 里；外门要替寺里办过差（贡献一百）
        { if: { sect: SMSL, realm: { skill: 'sl_luohan', atLeast: 1 }, any: [{ realm: { skill: 'sl_hunyuan', atLeast: 1 } }], xia: 15, gongxian: 100 },
          text: '长老看了看你的差事簿：「拳成了，侠义行了，寺里的差也办了——三样都齐。罗汉拳这一趟，打给谁看？」他替你答：「打给寺里挑水的、扫地的看。外门弟子，是替人担事的人。」他起身，亲手把你扶起来：「从今天起，你是少林的外门弟子。」',
          do: [{ type: 'sect', school: '少林', rank: '外门' }, { type: 'flag', flag: 'smsl_wai' }, { type: 'time', add: 60 },
            { type: 'feed', tag: '江湖', text: '你升了少林外门。寂照长老说，韦陀掌、疯魔杖法、金钟罩、一苇渡江，都可以学了。' },
            { type: 'toast', text: '少林 · 升外门弟子' }] },
        { if: { sect: SMSL, realm: { skill: 'sl_luohan', atLeast: 1 }, any: [{ realm: { skill: 'sl_hunyuan', atLeast: 1 } }], xia: 15 },
          text: '长老点了点头：「拳成了，侠义行了——只差替寺里办差。去讨件差事，攒够一百的贡献，再来。」' },
        { if: { sect: SMSL, realm: { skill: 'sl_luohan', atLeast: 1 }, any: [{ realm: { skill: 'sl_hunyuan', atLeast: 1 } }], gongxian: 100 },
          text: '长老叫你在殿前打一趟罗汉拳，打完了，问：「这一趟拳，打的是谁？」你答不上来。长老替你答：「护人的时候，打的是拳头；救人拔刀的时候，打的是分寸。你护过人，拳也就有了分寸。」' },
        { if: { sect: SMSL, realm: { skill: 'sl_luohan', atLeast: 1 }, any: [{ realm: { skill: 'sl_hunyuan', atLeast: 1 } }] },
          text: '长老点了点头：「拳和气，都有了三成的样子。可佛门的功夫是护人的——侠义的事，再多做几件；寺里的差，也去讨一件。」' },
        { if: { sect: SMSL, xia: 15 },
          text: '长老看了看你的手：「心是有的。拳和气还浮着——罗汉拳、混元一气功，都练到略有小成，再来考校。」' },
        { if: { sect: SMSL },
          text: '长老摇头：「外门考四样：罗汉拳、混元一气功都练到略有小成；行几件侠义的事；再替寺里办差攒够一百的贡献。缺哪样，补哪样。」' },
        { text: '长老合十：「你不是少林的人，考校什么？」' }
      ]
    }
  },
  {
    id: 'smsl_yuanhui', name: '圆慧', ini: '慧', tone: 'gray', brief: '守在山门口',
    look: '三十来岁的知客僧，眉毛浓黑，一张脸冷得像山门前的石阶。左耳缺了一小块，僧帽遮着，露出来的耳廓上是一道旧刀疤。',
    verbs: ['交谈', '观察',
      { verb: '交差', if: { job: 'smsl_job_xun' } }],
    actions: {
      交差: [
        { text: '圆慧验了你的纱帽和灯笼，往山门内外各看一眼：「一宿干净。」他在差事簿上划了一道，「巡山的活最没味道——没味道，才是太平。贡献记你一笔。」',
          do: [{ type: 'time', add: 30 }, { type: 'jobDone', id: 'smsl_job_xun' }] }
      ],
      交谈: [
        { if: { job: 'smsl_job_xun' },
          text: '圆慧把门钥匙往腰上一挂：「巡山的？三更走一遍山门，五更再走一遍。前几夜毛贼翻过墙——受了惊就走，没敢进殿。你巡你的，撞上了，佛祖也不会怪你动手。」' },
        { if: { flag: 'smsl_in' },
          text: '圆慧侧身让你进门，脸上还是没什么表情：「兵刃留在山门外，酒肉不许沾。守得住，寺里没人再给你冷脸。」他顿了顿，「守不住——我照旧把你架出去。」' },
        { if: { flag: 'smsl_asked' },
          text: '圆慧抱着胳膊看你：「长老收人，看心。我拦人，看刀。」他拍了拍腰间那串门钥匙，「接得下长老的三十招，或者挑得动老葛的水，我再给你开门。别的免谈。」' },
        { text: '圆慧上下打量你腰间的兵刃，眉毛都没动一下：「拜佛的在殿里，吃饭的在斋堂。带刀的——」他把半边身子让开门缝，「东西寄在门房，人可以进，香火钱随喜。」他顿了顿，「去年腊月，有个挂单的刀客吃醉了，在斋堂动了刀，伤了两个香客。是我把他架出去的。」他扯了扯僧帽，露出耳后的旧疤，「从那天起，我见了带兵刃的，就这一张脸。」' }
      ],
      观察: [{ text: '他守门站的位子很讲究：身后是门房，眼前是整条上山道，谁上山他先看见谁。缺了小块的左耳，是拿肉垫过一刀的。' }]
    }
  },
  {
    id: 'smsl_laoge', name: '老葛', ini: '葛', tone: 'jade', brief: '往灶房挑水',
    look: '五十来岁的火工，腰弯得像他的扁担，两条小腿却粗得吓人。一身灰布短打打了十几块补丁，笑起来一口豁牙。',
    verbs: ['交谈', '观察',
      { verb: '挑水', if: { flag: 'smsl_asked', notFlag: 'smsl_shui', noSect: true } },
      { verb: '交水', if: { job: 'smsl_job_shui' } }],
    actions: {
      交谈: [
        { if: { flag: 'smsl_shui' },
          text: '老葛把你的肩膀捏了捏：「好肩膀。水挑上来了，心也就稳了——长老要的就是这个稳。」他咧开豁牙笑，「当年我要有你这副身子，唉，不提了。」' },
        { if: { flag: 'smsl_asked' },
          text: '老葛把两只水桶在你面前摆正：「山下的泉眼在山脚石桥边，挑上灶房，来回三趟的道。别嫌枯燥——长老说了，挑水也算考校。」他压低声音，「我跟你说句掏心的：长老看人不看根骨，看心。你多来几趟，别怕慧师父的冷脸。」' },
        { text: '老葛往灶膛里添着柴：「来拜师的？」他咧嘴一笑，「我当年也想拜在山门下，根骨叫人驳了。舍不得走，就留下来挑水——一挑二十年。」他拍了拍扁担，「这条门槛多高，我比谁都清楚。长老看人不看根骨，看心。」' }
      ],
      观察: [{ text: '他的两只水桶不一样大，一只底厚一只帮高——是拿两只破桶自己箍的。灶房里的水缸，擦得比斋堂的桌子还亮。' }],
      交水: [
        { text: '老葛掀开缸盖看了水平线，咧开豁牙笑：「两担，不多不少。这一缸，灶房明天一天不用再去挑。」他往你手里塞了个烤芋头：「寺里的水，就是这么一担一担养人的。贡献，记你一笔。」',
          do: [{ type: 'time', add: 20 }, { type: 'jobDone', id: 'smsl_job_shui' }] }
      ],
      挑水: [
        { if: { attr: { key: '体魄', atLeast: 25 } },
          text: '老葛把两只桶的绳扣往扁担两头一系：「你这肩膀，双桶一趟就够。」你挑着满满两桶水上山，肩不晃，水不洒，一口气到了灶房。老葛看着水缸里的涟漪，直点头：「稳。比我自己挑得都稳。」',
          do: [{ type: 'time', add: 90 }, { type: 'flag', flag: 'smsl_shui' }, { type: 'quest', id: 'smsl_shui', stage: 1 }] },
        { text: '你挑着水从山脚往灶房走，一趟，两趟，三趟。第三趟倒进缸里的时候，两条腿像灌了铅。老葛舀了瓢凉水递过来：「成了。挑水上山，练的不是肩膀，是肯下这份力气。」',
          do: [{ type: 'time', add: 240 }, { type: 'flag', flag: 'smsl_shui' }, { type: 'quest', id: 'smsl_shui', stage: 1 }] }
      ]
    }
  }
];

/* ---------- 对手：长老的考校 ---------- */

const KAO: FoeDef = {
  id: 'smsl_kao', name: '寂照长老', title: '少林考校', ini: '寂', tone: 'blue',
  weapon: '一双肉掌', ws: '拳', tag: '考校',
  nature: '中正', reach: '短', rank: 0.6, build: 'inner', spar: true, rounds: 30, firstTell: 3,
  moves: ['黑虎掏心', '白猿献果', '罗汉撞钟', '横担铁门闩'],
  flourish: ['掌出无风，收掌有度', '脚下踏着桩步，纹丝不乱', '一掌拍来，掌缘带着衣袂的响', '半个身子始终朝着殿门'],
  tells: [
    { name: '罗汉撞钟', text: '长老双掌合十，忽然一沉一推，掌力像钟声一样撞过来……', dom: 'li', after: '掌力撞在肩上，像撞了半口钟！' },
    { name: '白猿献果', text: '长老身形一晃，欺到近前，一掌轻飘飘托向你的下颌……', dom: 'su', after: '掌到中途忽然变快，快得看不清掌缘！' }
  ],
  asides: ['檐角的风铃叮当响了一声。', '圆慧抱着胳膊站在月门口，手拢在袖子里。', '香炉里一线青烟，笔直。'],
  opening: ['掌势收得太尽', '起脚时左膝沉了一沉', '换气慢了半拍'],
  intro: '长老双掌合十：「佛门考校，不考输赢，考分寸。接老衲三十招——只许点到，不许见血。」',
  win: '长老收掌后退，掸了掸衣襟上的香灰：「好。收得住的拳，才是佛门的拳。」',
  lose: '长老的掌缘在你颈侧停住，离皮肉只差一层纸。他收掌合十：「差着火候，不碍。慢就是快。」',
  prep: [
    { if: { flag: 'smsl_xi' }, atk: 0.9, big: 0.9,
      text: '你记着长老盘坐时先垫一下手的左膝——你偏不跟他拼站立，专等他起身。他一起身慢的那半拍，就是你进手的时候。',
      story: '长老的膝伤，叫你看在了眼里。' }
  ],
  results: {
    win: { tag: '考校 · 过', title: '拜入少林', button: '合十受戒',
      story: '长老收了掌，合十还礼：「点到为止，你收得住。乱世要来了，少林要在江南留个落脚的地方——从今往后，你是老衲门下的记名弟子。门规三条：不杀生，不偷盗，不饮酒；在门期间，不学别派的武功。门规严，是护你，不是困你。」圆慧在月门口，把拢着的袖子放了下来。',
      do: SM_JOIN },
    lose: { tag: '考校', title: '差着火候', growth: true, button: '合十告退',
      story: '长老把你从地上扶起来：「拳是好拳，心是好心，就是差着火候。想动手的再来接三十招，不想动手的，替老葛挑水去——那条路，一样到山顶。」',
      do: [{ type: 'heal', hpAtLeast: 0.5 }] },
    yield: yieldOf('长老', '合十告退'),
    flee: yieldOf('长老', '合十告退')
  }
};

/* ---------- 师门差事：夜里巡山门 ---------- */

const YE = { from: 20, to: 5 };

const ZEI: FoeDef = {
  id: 'smsl_zei', name: '毛贼', title: '打寺院主意的贼', ini: '贼', tone: 'red',
  weapon: '短棍', ws: '棍', tag: '护寺',
  nature: '阴', reach: '短', rank: 0.6, build: 'outer', weak: 0.8, firstTell: 3,
  moves: ['翻墙式', '闷棍', '摸包', '撒腿跑'],
  flourish: ['短棍抡得没有章法', '眼睛一直往殿门瞟', '脚下踩着墙根的影走', '一个劲往你袖口摸'],
  tells: [
    { name: '闷棍', text: '毛贼从墙影里窜出，短棍闷着头砸下来……', dom: 'li', after: '棍头砸在石阶上，崩了一角！' },
    { name: '摸包', text: '他忽然贴上来，一只手往你腰间摸……', dom: 'qiao', after: '袖口被撕开一道口子，铜扣蹦到了石阶上！' }
  ],
  asides: ['山门里的灯笼一动不动。', '远处村落传来两声犬吠。', '夜风把香灰吹起一线。'],
  opening: ['棍子脱了手', '踩上了自己的裤脚', '翻墙时挂破了衣裳'],
  intro: '毛贼把短棍横在胸前：「和尚庙里也有值钱的——别多管闲事！」',
  win: '毛贼的短棍脱手飞进了草丛。他连滚带爬翻出墙去，再没敢回头。山门里，灯笼安安稳稳地亮着。',
  lose: '短棍扫在你的腿上，你跌坐在山门台阶下。毛贼翻墙走了——这一夜，山门里外都不安生。',
  results: {
    win: { tag: '护寺 · 胜', title: '山门清净', button: '回去交差',
      story: '毛贼跑了，山门内外的灯笼一盏没灭。圆慧验了山门，在差事簿上划了一道，难得没有冷脸：「没惊动佛祖。行了。」',
      do: [{ type: 'jobDone', id: 'smsl_job_xun' }] },
    lose: { tag: '护寺', title: '叫贼打了', button: '爬起来',
      story: '毛贼跑了，你的灯笼也灭了。圆慧出来查看，把差事簿合上：「护寺护成这样……回去吧，这一趟不算。」',
      do: [{ type: 'jobFail', id: 'smsl_job_xun' }, { type: 'heal', hpAtLeast: 0.5 }] }
  }
};

const NPCS_EXTRA: NpcDef[] = [
  {
    id: 'smsl_yzei', name: '毛贼', ini: '贼', tone: 'red', brief: '在墙根探头',
    look: '缩在山门墙根的黑影，抱着短棍，一有动静就缩成一团。',
    at: { room: 'smsl_jinshan', if: { hour: YE, job: 'smsl_job_xun' } },
    verbs: ['交谈', '动手'],
    actions: {
      交谈: [{ text: '黑影压着嗓子：「巡山的？今夜就我一个——识相的，绕着殿门走。」' }],
      动手: [{ do: [{ type: 'fight', foe: 'smsl_zei' }] }]
    }
  }
];

/* ---------- 任务：挑水的考验 ---------- */

const JOBS: JobDef[] = [
  { id: 'smsl_job_xun', sect: '少林', tier: 1, title: '夜里替寺里巡山门', npc: 'smsl_yuanhui', at: 'smsl_jinshan', days: 2, again: 2 },
  { id: 'smsl_job_shui', sect: '少林', tier: 1, title: '从后山泉眼挑两担水回灶房', npc: 'smsl_laoge', at: 'smsl_jinshan', days: 2, again: 2 }
];

const QUESTS: QuestDef[] = [
  { id: 'smsl_shui', name: '少林 · 挑水上山', stages: [
    { title: '过寂照长老的考校', to: 'smsl_jinshan', who: 'smsl_laoge', hint: '寂照长老说，拜师先过考校：接他三十招，或是替老葛把山下的水挑上灶房，他一样收。',
      need: [{ if: { noSect: true }, text: '了断别家的名分' }] },
    { title: '少林 · 挑水上山 · 完' }
  ] }
];

/* ---------- 根基之眼 ---------- */

const EYES: EyeDef[] = [
  { npc: 'smsl_jizhao', attr: '体魄', atLeast: 25,
    text: '他盘坐起身的时候，左手总要先在左膝上垫一下——左膝有旧伤。真要动手，逼他起身，他起得比常人慢半拍。',
    do: [{ type: 'flag', flag: 'smsl_xi' }] },
  { npc: 'smsl_jizhao', attr: '根骨', atLeast: 33,
    text: '他给你斟茶，壶嘴离杯半尺，水线细得像一炷香，一滴不洒。没有几十年的内功垫底，这一手倒不出来。' },
  { npc: 'smsl_jizhao', attr: '悟性', atLeast: 29,
    text: '他抄经一笔一画都收着劲——收得住劲的手，是握惯了重东西的手。他说自己是云游，手上却留着比云游重得多的印子。' }
];

/* ---------- 传闻 ---------- */

const NEWS: NewsDef[] = [
  { text: '金山寺来了位挂单的少林长老，说是云游，一住半年，要在江南收几个俗家弟子。', who: ['和尚', '货郎', '渔家'] },
  { if: { flag: 'smsl_ju' },
    text: '有人想拜金山寺长老的门，叫长老挡了驾——听说手上有冤孽的，他一概不收。', who: ['和尚', '货郎', '说书'], about: 'you' },
  { if: { flag: 'smsl_in' },
    text: '金山寺的少林长老收了个俗家弟子。带兵刃上山的，知客僧的脸色头一回收平了。', who: ['和尚', '货郎', '小二'], about: 'you' },
  { if: { flag: 'smsl_wai' },
    text: '金山寺那位俗家弟子升了外门，韦陀掌、金钟罩都摸得着了。香客们都说，寺里要出人物。', who: ['和尚', '货郎', '小二'], about: 'you' }
];

const pack: ContentPack = {
  rooms: ROOMS,
  npcs: [...NPCS, ...NPCS_EXTRA],
  foes: [KAO, ZEI],
  jobs: JOBS,
  quests: QUESTS,
  eyes: EYES,
  news: NEWS
};
export default pack;
