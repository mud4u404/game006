import type { Cond, ContentPack, GreetDef } from '../types';

/**
 * 迎面的话（engine/yingmian.ts，docs/sheji-youhua-1010.md 第五条）：十个关键人物先开口。
 * 每人二到四条，条件各不相同，一条都不成立就不开口；成立几条时，引擎按世界种子、日子、时辰段挑一条，不碰世界随机数。
 * 话头点了以后走现有动作（缺省「交谈」），所以现有的分支、旗标、后果一概照旧，这里只管开口的那一句。
 * 句式照 docs/wenfeng.md：先写说话人，再用「道」引出对白，不用插入式对白。
 */

const XUN = 'kp_xun';
const MATOU = 'ss_matou';
const ZEI = 'ss_zei';
const at = (...steps: string[]): Cond => ({ shi: { id: XUN, at: steps } });

const GREET: Record<string, GreetDef[]> = {
  /* ---------- 了尘大师：看玩家近来做了什么、主线到哪一步 ---------- */
  liaochen: [
    { if: { quest: { id: 'main1', is: 0 } },
      text: '了尘大师手里的扫帚停在半空，抬眼望过来，道：「施主腰间那件旧物，可否近前来，让老衲看一眼？」',
      topic: '近前答话' },
    { if: { quest: { id: 'main1', is: 1 }, flag: 'tu_bai', notFlag: 'lc_bai' },
      text: '了尘大师端着一碗药走过来，搁在石桌上，道：「趁热喝了。船夫背你上山那夜的事，老衲有几句话说。」',
      topic: '坐下喝药' },
    { if: { flag: 'boss', notFlag: 'lc_tiaoxi' },
      text: '了尘大师合十一礼，道：「渡口的事老衲听说了。施主那口气浮在胸口，进禅房坐一坐罢。」',
      topic: '进禅房调息', go: '请教' },
    { if: { quest: { id: 'main1', atLeast: 3 } },
      text: '了尘大师扫完了阶前的落叶，望向湖畔的方向，道：「那块石碑上的字，施主可曾看仔细了？」',
      topic: '问石碑的事' }
  ],

  /* ---------- 鲍四：丐帮弟子、非丐帮弟子各一种说法 ---------- */
  bs2_bao: [
    { if: { sect: { school: '丐帮' } },
      text: '鲍四拿竹杖敲了敲地，冲你招手，道：「来得正好，火边坐。帮里的规矩，今日再对你说一遍。」',
      topic: '火边坐下' },
    { if: { sect: { school: '丐帮' } },
      text: '鲍四翻了翻背上的麻布口袋，道：「分舵这两日缺人手，你腿脚利索，替帮里跑几趟。」',
      topic: '问差事', go: '讨差事' },
    { if: { noSect: true, notFlag: 'ly_xiaozei_dead' },
      text: '鲍四烤着火，眼皮都不抬，道：「后生，站了半天，是看火，还是看人？想吃这碗饭，先学会讨。」',
      topic: '问入帮的规矩', go: '拜师' },
    { if: { notSect: '丐帮', flag: 'ly_ajiu' },
      text: '鲍四朝你点了点头，道：「渡口扛盐包的阿九，提过你。有人给过他十文钱，没图他半句好话。」',
      topic: '听他说阿九' }
  ],

  /* ---------- 焦五：码头那件世事走到哪一步 ---------- */
  ss_jiaowu: [
    { if: { shi: { id: MATOU, at: ['duizhi'] } },
      text: '焦五抱着胳膊，横在跳板前，斜眼看你，道：「屠千山是你打跑的，码头可不是你一个人的。」',
      topic: '回他的话' },
    { if: { shi: { id: MATOU, at: ['huobing'] } },
      text: '焦五拿布擦着短戟，戟刃上还有没擦净的血，道：「昨夜的事，你听说了没有？」',
      topic: '问昨夜的事' },
    { if: { shi: { id: MATOU, at: ['xiduo'] } },
      text: '焦五把短戟往肩上一扛，冲你咧嘴一笑，道：「码头如今姓焦，往后过船，守西舵的规矩。」',
      topic: '听他的规矩' }
  ],

  /* ---------- 阿七：东关街偷药那件世事 ---------- */
  ss_aqi: [
    { if: { shi: { id: ZEI, at: ['huanle'] } },
      text: '阿七一溜烟跑到你跟前，仰着脸道：「恩公！我娘能下地了。城里这几日的事，我都替你记着呢。」',
      topic: '问问城里的事', go: '打听' },
    { if: { shi: { id: ZEI, at: ['zhuo'] } },
      text: '阿七蹲在青石后头，抬头看见你，又把脸埋进了膝盖，肩头一耸一耸的。',
      topic: '走近些' },
    { if: { shi: { id: ZEI, at: ['songguan'] } },
      text: '阿七背对着巷口站着，听见脚步，没有回头，只道：「你来做什么。」',
      topic: '站住不走' }
  ],

  /* ---------- 阮娘子：夜里添灯，白日算账，见了伤客另有一句 ---------- */
  jc_yz_ruanniang: [
    { if: { hour: { from: 19, to: 5 } },
      text: '阮娘子踮脚往门口的灯笼里添油，回过头来，道：「客官这么晚才靠岸，灯我给你留着。」',
      topic: '谢她留灯' },
    { if: { hour: { from: 5, to: 19 } },
      text: '阮娘子拨着算盘，抬头见了你，道：「客官住店么？热水和早粥都是现成的。」',
      topic: '问房钱' },
    { if: { wounded: true },
      text: '阮娘子放下账簿，上下打量你一回，道：「客官这身伤，在外头硬撑不得。楼上东头还空着一间。」',
      topic: '要一间房', go: '住店' }
  ],

  /* ---------- 说书人：照玩家做过的事说 ---------- */
  shuoshu: [
    { if: { quest: { id: 'main1', is: 2 } },
      text: '说书人手里的醒木往案上一搁，冲你拱手，道：「少侠来得巧，渡口那一回，小老儿正要从头说起。」',
      topic: '听他说书' },
    { if: { quest: { id: 'main1', atLeast: 3 }, flag: 'boss' },
      text: '说书人冲你挤了挤眼，道：「少侠的段子，小老儿每日要讲三场，场场满座。」',
      topic: '问讲到哪儿了' },
    { if: { any: [{ flag: 'ly_xiaozei_dead' }, { shi: { id: ZEI, at: ['songguan'] } }] },
      text: '说书人拿折扇遮了半边脸，朝你勾了勾手指，道：「东关街巷子里的闲话，少侠听说了没有？」',
      topic: '赏几文听听', go: '打赏' },
    { if: { notFlag: 'boss' },
      text: '说书人醒木一拍，朝你这边扬了扬下巴，道：「这位客官，听段书罢？华山掌门之争，正说到紧要处。」',
      topic: '听段书' }
  ],

  /* ---------- 卫衡：寻人那件世事走到哪一步 ---------- */
  kp_wei: [
    { if: { ...at('fang', 'feng', 'cuo'), notFlag: 'kp_wei_met' },
      text: '卫衡远远抱了抱拳，手却仍按在剑柄上，道：「这位朋友，晚辈想打听个人，独臂的，四十来岁。」',
      topic: '听他打听' },
    { if: { ...at('fang', 'feng'), flag: 'kp_wei_met', notFlag: 'kp_wei_ans' },
      text: '卫衡迎上两步，神色比先前更急，道：「这几日你可曾听到那人的消息？一句也好。」',
      topic: '把话递给他', go: '递话' },
    { if: { shi: { id: XUN, at: ['duimian'] }, flag: 'kp_wei_met' },
      text: '卫衡把剑穗的结重新系紧，抬头看了看天色，道：「今夜晚辈要去运河渡口，你若有话，现在说。」',
      topic: '问他今夜' },
    { if: { shi: { id: XUN, at: ['pao', 'pao_see'], age: { below: 48 } } },
      text: '卫衡站在店堂中央，茶也没有要，看见你，道：「渡口那一夜，晚辈到时，铺盖还是温的。」',
      topic: '听他说渡口' }
  ],

  /* ---------- 褚七：同一件世事，从躲到不躲 ---------- */
  kp_chu: [
    { if: { shi: { id: XUN, at: ['fang', 'feng', 'cuo'] }, flag: 'kp_chu_met', notFlag: 'kp_chu_warned' },
      text: '褚七把盐包撂在垛上，看着你，道：「小哥，有句话我一直想找人商量。」',
      topic: '劝他几句', go: '劝告' },
    { if: { shi: { id: XUN, at: ['duimian'] }, flag: 'kp_chu_met' },
      text: '褚七没有扛包，站在缆桩边，左手按着桩头，道：「小哥，今夜你不必陪我。」',
      topic: '陪他站站' },
    { if: { shi: { id: XUN, at: ['tiaoting'] } },
      text: '褚七肩头直了许多，朝你点了点头，道：「话说出口，夜里倒睡得着了。」',
      topic: '问他近况' },
    { if: { flag: 'kp_du', notFlag: 'kp_chu_met' },
      text: '独臂人把一包盐扛上肩，回头看见你，用那一只手抱了抱拳，道：「小哥，又见面了。」',
      topic: '上前叙话' }
  ],

  /* ---------- 周捕头 ---------- */
  fuya_zhou: [
    { if: { flag: 'boss', notFlag: 'fuya_met_name' },
      text: '周捕头从卷宗上抬起眼，把你腰间兵刃看了两眼，道：「渡口那一剑，是你出的？」',
      topic: '上前搭话' },
    { if: { shi: { id: MATOU, at: ['qi', 'duizhi', 'huobing'] } },
      text: '周捕头合上卷宗，道：「运河渡口这几日不太平，你从那边过来，可看见什么？」',
      topic: '报官', go: '报官' },
    { if: { quest: { id: 'side_caoshangfei', is: 2 } },
      text: '周捕头搁下笔，朝你抬了抬下巴，道：「草上飞的案子，你有话要交代？」',
      topic: '交差', go: '交差' },
    { if: { flag: 'caoshangfei_hint1', quest: { id: 'side_caoshangfei', below: 2 } },
      text: '周捕头翻着卷宗，头也不抬，道：「小金山、茱萸湾，两处可有眉目了？」',
      topic: '回他的话' }
  ],

  /* ---------- 书办：有新榜文时开口 ---------- */
  xsb_zhuren: [
    { if: { jobOpen: 'xsb_xunren' },
      text: '书办提起笔，朝照壁指了指，道：「新贴了一张寻人的榜，布庄走了学徒，赏钱不多，却是实打实的。」',
      topic: '看寻人榜' },
    { if: { jobOpen: 'xsb_xunwu' },
      text: '书办翻开底册，点了点其中一行，道：「绣娘丢了玉佩，托衙门贴了榜，赏八百文。」',
      topic: '看寻物榜' },
    { if: { any: [{ jobOpen: 'xsb_xiong', notFlag: 'xsb_xiong_done' }, { jobOpen: 'xsb_jiaofei' }] },
      text: '书办把笔往砚台上一搁，道：「今日又添了两张重榜，一张缉凶，一张剿匪，揭得下的人不多。」',
      topic: '问重榜' },
    { if: { jobOpen: 'xs_hezei' },
      text: '书办在册子上圈了一笔，道：「运河上的河贼夜里又上了岸，官府出了榜文，赏八百文。」',
      topic: '问河贼榜' }
  ]
};

const pack: ContentPack = { npcGreet: GREET };
export default pack;
