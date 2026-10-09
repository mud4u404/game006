import type { Cond, ContentPack, NpcLife } from '../types';

/**
 * 扬州的人的活气（docs/huo-shijie.md 3.3，engine/chuanwen.ts）：话有来处。
 * 1B 先写七个枢纽人物，1C 补齐扬州二十人。人物都在别的内容包里，这里只补 life，不改别人的文件。
 * - trade：行当。传闻池的 who 按它找人；说书、叫化是枢纽，那一带出了事先知道；船夫跑码头，外地的事经他进来。
 * - faction：势力。帮里的人夜里互通，牵涉本帮的事帮内都知道。
 * - talk：嘴碎。说书人一，捕头零点三。
 * - voice.lead：开口前的样子，引擎接成「{名}{lead}，道：「……」」；voice.idle：没新鲜事时说他自己的日子，按世界状态挑第一条成立的。
 * 「济生堂掌柜」在现有内容里没有这个人（济生堂里是看伤的葛郎中）；卖药、说药价、闹贼丢了药的是东关街的药铺掌柜（yaopu），选他。
 */

const ZEI_OPEN: Cond = { shi: { id: 'ss_zei', at: ['qi', 'bang'] } };
const DUKOU_XI: Cond = { w: { owner: { place: 'dukou', is: ['xi'] } } };

const LIFE: Record<string, NpcLife> = {
  // 说书人：白天东关街街角，晚上望江楼。什么事都爱铺陈
  shuoshu: {
    trade: '说书', talk: 1,
    voice: {
      lead: ['把折扇在掌心一敲', '呷了一口冷茶，清了清嗓子', '把醒木往袖里一揣，凑近了些'],
      idle: [
        { if: DUKOU_XI, text: '渡口换了主人，这一段小老儿还没想好怎么收场：是叫焦五占稳了，还是另有人来翻案？' },
        { if: { shi: { id: 'ss_zei', at: ['zhuo'] } }, text: '东关街那个孩子的事，小老儿编不进书里。编进去，听客要掉眼泪，赏钱就少了。' },
        { if: { flag: 'boss' }, text: '屠千山那一段讲得太熟，听客都会接下句了，小老儿得寻些新鲜的来讲。' },
        { text: '书是人编的，事是人做的。少侠有什么新鲜事，说给小老儿听听，好编进书里。' }
      ]
    }
  },
  // 鲍四：龙王庙，丐帮扬州分舵。市井话，仗义
  bs2_bao: {
    trade: '叫化', faction: 'gai', talk: 0.7,
    voice: {
      lead: ['拿竹杖戳了戳火堆里的炭', '把讨饭碗往怀里一揣', '往火堆里啐了一口'],
      idle: [
        { if: { w: { price: { place: 'cheng', atLeast: 130 } } }, text: '东关街的米又贵了，粥棚的锅一日比一日稀，兄弟们的腰带又得往里勒一扣。' },
        { if: DUKOU_XI, text: '码头归了西舵，夜里有盐船靠岸。老叫化叫兄弟们天黑以后别往那头讨。' },
        { if: { hour: { from: 18, to: 6 } }, text: '天一黑，庙里就挤满了，有从淮安逃荒来的，也有从牢里放出来的。老叫化一个也不赶。' },
        { text: '庙顶漏雨，兄弟们挪了三回铺盖。新鲜事？老叫化这两日只顾着补房顶了。' }
      ]
    }
  },
  // 运河渡口的船夫：东舵的船。话闷，三句不离船钱
  chuanfu: {
    trade: '船夫', faction: 'dong', talk: 0.6,
    voice: {
      lead: ['把烟锅往鞋底一磕', '闷头抽了两口旱烟', '眯眼望了望河面'],
      idle: [
        { if: DUKOU_XI, text: '如今上船先给西舵交钱，客嫌贵，船家落不下几个，一日倒有半日蹲在这里。' },
        { if: { w: { owner: { place: 'dukou', is: ['guan'] } } }, text: '税棚底下坐着个记账的，一船一船地抽，连撑船的自己过河都要抽。' },
        { if: { w: { order: { place: 'dukou', below: 45 } } }, text: '码头上这几日不太平，夜里我把船撑到下游去泊，天亮再撑回来。' },
        { text: '撑船的不问闲事，只问风向水势。今早顺风，跑了两趟瓜洲。' }
      ]
    }
  },
  // 东关街的更夫：只在夜里。话短
  ss_gengfu: {
    trade: '更夫', talk: 0.4,
    voice: {
      lead: ['敲了一下梆子', '把梆子夹在胳肢窝底下', '缩着脖子'],
      idle: [
        { if: { w: { p: { id: 'ss_aqi', st: ['hurt'] } } }, text: '巷口那个跑腿的孩子，叫衙门打了，趴在草棚里动不得。我夜里打那儿过，只听得他娘咳。' },
        { if: ZEI_OPEN, text: '这几夜我多敲两遍梆子，那贼听见了，兴许就不来了。' },
        { if: { w: { order: { place: 'cheng', below: 50 } } }, text: '街上不太平，我打更都绕开暗巷走。' },
        { if: DUKOU_XI, text: '半夜里常听见运河那头有船靠岸，篙子点水，声音压得极低。' },
        { text: '打了半辈子更，三更天的街上只剩我和野猫。' }
      ]
    }
  },
  // 周捕头：府衙前堂。官腔里带着倦
  fuya_zhou: {
    trade: '捕快', faction: 'guan', talk: 0.3,
    voice: {
      lead: ['把卷宗合上，揉了揉眼睛', '端起凉了的茶喝了一口', '打了个哈欠'],
      idle: [
        { if: { w: { fac: { id: 'hei', power: { below: 30 } } } }, text: '黑风寨的残部缩在蜀冈上不出来。府台催着剿，衙门里抽不出人。' },
        { if: { w: { owner: { place: 'dukou', is: ['guan'] } } }, text: '码头的税棚是府台的意思。衙门里多了一份差，我手下的人又少了两个。' },
        { if: ZEI_OPEN, text: '东关街的案子还挂着，府台问了两回。你要是听见什么，来府衙说一声。' },
        { text: '卷宗堆了半人高，我哪有工夫说闲话。真有冤情，递状子来。' }
      ]
    }
  },
  // 东关街的药铺掌柜：卖药，闹贼的苦主。三句不离药价
  yaopu: {
    trade: '掌柜', talk: 0.5,
    voice: {
      lead: ['拨了两下算盘', '从药柜后头探出头来', '把戥子搁下'],
      idle: [
        { if: { w: { price: { place: 'cheng', atLeast: 130 } } }, text: '药材行里一日一个价，老朽这里的金疮药，眼看也压不住了。' },
        { if: { w: { price: { place: 'cheng', below: 90 } } }, text: '这一阵药材贱，老朽多收了几担，就怕入了梅放潮。' },
        { if: { shi: { id: 'ss_zei', at: ['huanle'] } }, text: '阿七那孩子隔三岔五来铺子里帮着晒药，手脚倒勤快。' },
        { text: '开药铺的，人家来得少是好事。这几日铺子冷清，老朽乐得清闲。' }
      ]
    }
  },
  // 东关街酒楼的小二：嘴快，殷勤
  xiaoer: {
    trade: '小二', talk: 0.8,
    voice: {
      lead: ['把白巾往肩上一甩', '凑过来，压低了嗓门', '一面抹着桌子'],
      idle: [
        { if: DUKOU_XI, text: '西舵的人夜里来喝酒，一坐就是半宿，掌柜的不敢赶，小的也不敢多嘴。' },
        { if: { flag: 'boss' }, text: '自打渡口那一仗，楼上天天有人打听那位少侠，小的嘴皮子都说薄了。' },
        { if: { hour: { from: 18, to: 23 } }, text: '晚上说书的一开场，楼上楼下坐满了，小的跑断了腿，赏钱倒多。' },
        { text: '楼上雅座刚走了一拨盐商，赏钱给得爽快。客官要听新鲜的，小的替客官留着耳朵。' }
      ]
    }
  }
};

const pack: ContentPack = { npcLife: LIFE };
export default pack;
