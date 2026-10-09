import type { AfterOpt, Cond, ContentPack, EyeDef, FoeDef, FightResult, NewsDef, NpcDef, PrepDef, ShiDef } from '../types';

/**
 * 六扇门的立身之道（docs/lizu.md 第四节），做成活的江湖（docs/huojianghu.md）的第一个用户。
 * 海捕文书上的三个人犯是三件世事，一个了结，下一个才贴出来，一个比一个难缠：
 * - 「鬼手」钱三：偷了汪家盐号的盐引，白天在辕门桥转悠，等着销赃；
 * - 「玉面」白七郎：在淮安卖假药毒死了人，夜里在望江楼扮游方郎中；
 * - 逃兵熊大：杀了克扣军粮的百户，躲在镇江打铁巷抡锤。
 * 不去拿，他们会再作案，然后逃出江南。人犯都换了样子：要识破，捕快亮腰牌盘问，别人靠根基之眼、靠打听到的线索。
 * 捕快的特权：盘问人人（engine/shenfen.ts）、拿人时叫得来官兵和保镖、上锁押进大牢、提审出下一个人犯的下落。
 * 捕快的软肋：不能私刑，不能私放；恶名一高，腰牌收回。
 */

const LSM: Cond['sect'] = { school: '六扇门' };
const NOT_LSM: Cond = { notSect: '六扇门' };
/** 人犯还在江南：在逃、又作案 */
const LOOSE = ['zaitao', 'zuoan'];
/** 了结了：逃了、落网、放了、死了 */
const ENDS = ['taozou', 'luowang', 'fang', 'sha'];

/** 一个人犯的世事：在逃 → 又作案 → 逃出江南（没人管时）；插手的三个结局：落网、放了、死了 */
function wanted(id: string, name: string, start: Cond, text: { zaitao: [string, string]; zuoan: [string, string]; taozou: [string, string]; luowang: string; fang: string; sha: string }, days: [number, number]): ShiDef {
  return {
    id, name, region: 'yz', start, first: 'zaitao',
    steps: {
      zaitao: { now: text.zaitao[0], news: text.zaitao[1], where: 'yz_zhaobi', next: { days: days[0], to: 'zuoan' } },
      zuoan: { now: text.zuoan[0], news: text.zuoan[1], next: { days: days[1], to: 'taozou' } },
      taozou: { now: text.taozou[0], news: text.taozou[1] },
      luowang: { now: text.luowang },
      fang: { now: text.fang },
      sha: { now: text.sha }
    }
  };
}

const SHI: ShiDef[] = [
  wanted('lsm_qian', '海捕文书 · 鬼手钱三', { quest: { id: 'prologue', atLeast: 3 } }, {
    zaitao: ['府衙的海捕文书上新贴了一张：飞贼「鬼手」钱三，偷了汪家盐号三十张盐引，赏银八百文。画像上的人瘦长脸，左眉上一颗黑痣。',
      '汪家盐号丢了三十张盐引，府衙贴出海捕文书，拿飞贼「鬼手」钱三。'],
    zuoan: ['钱三又出手了，这回偷的是威远镖局的一包镖银。有人说，辕门桥一带这几日白天总有个瘦高个转悠，拿着几张黄纸找人收。',
      '威远镖局夜里丢了一包镖银，都说又是「鬼手」钱三干的。'],
    taozou: ['钱三带着盐引出了扬州，往苏州去了。海捕文书上他的画像，叫雨淋得看不清了。',
      '「鬼手」钱三出了扬州，往苏州去了，海捕文书白贴了。'],
    luowang: '钱三落了网，押进了府衙大牢，盐引追回了二十几张。他在堂上喊冤，说汪家先冤他偷账，打断了他两根肋骨，他才真偷的。',
    fang: '你放走了钱三。他临走时说，汪家冤他偷账，打断了他两根肋骨，他才真去偷的。',
    sha: '钱三死在你手里。盐引的下落，再也没人知道了。'
  }, [8, 6]),
  wanted('lsm_bai', '海捕文书 · 玉面白七郎', { shi: { id: 'lsm_qian', at: ENDS } }, {
    zaitao: ['府衙又贴出一张海捕文书：游方郎中「玉面」白七郎，在淮安卖假药，一副药毒死了一家三口，赏银二两。听说他逃到了江南。',
      '府衙贴出新的海捕文书：卖假药毒死人的「玉面」白七郎，逃到了江南。'],
    zuoan: ['望江楼上来了个游方郎中，夜里给人看病，药钱比济生堂便宜一半。东关街有个老汉吃了他的药，上吐下泻，差点没了命。',
      '东关街有个老汉吃了游方郎中的药，差点没了命。'],
    taozou: ['白七郎出了扬州，听说往杭州去了。他卖剩下的药丸，济生堂收回来烧了一大筐。',
      '望江楼那个游方郎中不见了，听说往杭州去了。'],
    luowang: '白七郎落了网，押进了府衙大牢。他在牢里冷笑，说淮安那三条人命，是有人花钱买的。',
    fang: '你放走了白七郎。他的药箱留在了你手边，箱底压着一本账，记着淮安那家的田契落到了谁手里。',
    sha: '白七郎死在你手里。淮安那一家三口到底是谁要的命，再也问不出来了。'
  }, [8, 6]),
  wanted('lsm_xiong', '海捕文书 · 逃兵熊大', { shi: { id: 'lsm_bai', at: ENDS } }, {
    zaitao: ['海捕文书上又添了一张：边军逃兵熊大，杀了本营的百户，赏银四两。画像上是个大个子，右臂刺着「忠勇」两个字。',
      '府衙贴出海捕文书：边军逃兵熊大杀了百户，逃到了江南。'],
    zuoan: ['镇江打铁巷新来了个大个子帮工，力气大得吓人，一锤下去砧子都跳。大热天也不脱衣裳，右臂总裹着布。',
      '镇江打铁巷新来了个大个子帮工，一锤能把砧子砸得跳起来。'],
    taozou: ['熊大过江北上了。有人说他去了九边，换了个名字重新投军。',
      '镇江打铁巷那个大个子帮工走了，听说过江往北去了。'],
    luowang: '熊大落了网，押进府衙大牢，秋后问斩。到了牢里他才说出来：那百户克扣军粮，饿死了他营里七个弟兄。',
    fang: '你放熊大过了江。他说，他要去九边换个名字重新投军，死也要死在边墙上。',
    sha: '熊大死在你手里。他到死没说一句软话。'
  }, [8, 6])
];

/*
 * ---------- 帮手：捕快办差叫得来官兵（只在扬州府地界）、保镖 ----------
 * 帮手不白来（负责人 10-08「有条件有代价」，docs/lizu.md 第一节「叫帮手要付代价」）：
 * 官兵拿住了人要分赏钱，老鲁要酒钱，打赢了从你钱袋里出
 */
const GUANBING: PrepDef = {
  if: { sect: LSM },
  text: '你亮出腰牌，喝了一声。两个巡街的官兵提着水火棍赶过来，一左一右堵住了去路。领头的冲你挤挤眼：「拿住了，赏钱分兄弟们一份。」',
  win: [{ type: 'silver', delta: -100 }, { type: 'feed', tag: '江湖', text: '两个帮忙的官兵分走了一百文赏钱。' }],
  ally: { name: '官兵', share: 0.15, at: [2, 6, 10],
    say: ['两个官兵的水火棍一齐扫向对手的腿弯，对手跳起来躲，落地时慢了半拍。',
      '官兵抖开铁链往前一套，链头抽在对手肩上，逼得他往你这边退了一步。',
      '一个官兵的水火棍捅在对手腰眼上，另一个照旧把棍子横在路口。'] },
  story: '两个官兵一左一右堵住了路口。'
};
const BAOBIAO: PrepDef = {
  if: { sect: LSM },
  text: '秦教头派给你的保镖老鲁不知从哪儿冒了出来，抱着一口朴刀站在你身后：「人交给我，你看着他的手。完了事，酒钱你出。」',
  win: [{ type: 'silver', delta: -150 }, { type: 'feed', tag: '江湖', text: '你请老鲁喝了一顿酒，花了一百五十文。' }],
  ally: { name: '老鲁', share: 0.25, at: [3, 8, 13],
    say: ['老鲁的朴刀一横，硬接了对手一招，刀背震得嗡嗡响，他脚下一步没退。',
      '老鲁一刀劈在对手身前三寸的地上，青石崩开，对手的脚步顿时乱了。',
      '老鲁闷声不响地绕到对手背后，朴刀刀背砸在他后腰上。'] },
  story: '保镖老鲁的朴刀压住了阵脚。'
};

/** 打赢了怎样处置：捕快上锁押走、犯了门规的放和杀要降地位；别人扭送府衙领赏 */
function fate(id: string, who: string, bounty: number, bountyText: string, gx: number, say: { ya: string; fang: string; sha: string }, later: { ya: string; fang: string; sha: string }): AfterOpt[] {
  const toLuowang = [{ type: 'shi' as const, id, to: 'luowang' }, { type: 'silver' as const, delta: bounty }];
  return [
    // 捕快押来的人犯，是替六扇门出的力：攒六扇门的贡献（docs/menpai.md 第七节第八条）
    { if: { sect: LSM }, label: '上锁押走', sub: `押进府衙大牢，赏银${bountyText}，地位升一级，六扇门贡献 +${gx}`, say: say.ya,
      do: [...toLuowang, { type: 'standing', delta: 1 }, { type: 'gongxian', delta: gx }, { type: 'flag', flag: `${id}_ya` }], later: later.ya },
    { if: NOT_LSM, label: '扭送府衙', sub: `赏银${bountyText}，侠义 +2`, say: say.ya,
      do: [...toLuowang, { type: 'xia', delta: 2 }, { type: 'flag', flag: `${id}_ya` }], later: later.ya },
    { if: { sect: LSM }, label: '当场放了', sub: '私放人犯，犯了门规：地位降一级', say: say.fang,
      do: [{ type: 'shi', id, to: 'fang' }, { type: 'standing', delta: -1 }, { type: 'xia', delta: 1 }], later: later.fang },
    { if: NOT_LSM, label: '当场放了', sub: `${who}欠你一条命`, say: say.fang,
      do: [{ type: 'shi', id, to: 'fang' }, { type: 'xia', delta: 1 }], later: later.fang },
    { if: { sect: LSM }, label: '下杀手', sub: '私刑，犯了门规：地位降一级，恶名 +3', say: say.sha,
      do: [{ type: 'shi', id, to: 'sha' }, { type: 'standing', delta: -1 }, { type: 'eming', delta: 3 }], later: later.sha },
    { if: NOT_LSM, label: '下杀手', sub: '恶名 +3', say: say.sha,
      do: [{ type: 'shi', id, to: 'sha' }, { type: 'eming', delta: 3 }], later: later.sha }
  ];
}

const LOSE = (who: string, story: string): FightResult => ({
  tag: '缉拿', title: `让${who}跑了`, button: '爬起来', story, do: [{ type: 'heal', hpAtLeast: 0.5 }]
});

const FOES: FoeDef[] = [
  {
    id: 'lsm_qian', name: '钱三', title: '飞贼「鬼手」', ini: '钱', tone: 'gray', weapon: '短匕', ws: '匕', tag: '缉拿',
    nature: '阴', reach: '短', rank: 0.8, build: 'light', firstTell: 2,
    moves: ['顺手牵羊', '袖里藏刀', '贴身滑步', '翻墙脱身'],
    flourish: ['短匕从袖口里滑出来，贴着你的手腕划过', '身子一矮，从你腋下钻了过去', '脚尖在桥栏上一点，人已到了你身后', '手指在你腰间一勾'],
    tells: [
      { name: '妙手空空', text: '钱三忽然不躲了，空着两手迎上来，十根手指又细又长……', dom: 'qiao', after: '他的手指在你身上一拂而过，你腰间的钱袋差点跟着他走了。' },
      { name: '燕子钻帘', text: '钱三退到桥栏边，脚跟抵着石栏，身子绷得像张弓……', dom: 'su', after: '他从桥栏上弹起来，短匕直扎你的咽喉。' }
    ],
    asides: ['桥头卖麻绳的麻三缩回了铺子里。', '当铺的伙计扒着门缝往外看。', '辕门桥下的船家把船撑远了些。'],
    opening: ['落地时脚下一滑', '短匕扎空，收不回来', '回头看退路，慢了半拍'],
    intro: '钱三的短匕在指缝间转了个圈：「官府的狗腿子？还是想分一份盐引的？」',
    win: '你一脚踢飞他的短匕，钱三扑倒在桥栏边，怀里掉出一沓黄纸，纸边盖着朱红的盐运司官印。',
    lose: '钱三一匕首划破你的袖子，趁你一愣，翻过桥栏跳上一条过路的船，没影了。',
    prep: [GUANBING],
    results: {
      win: { tag: '缉拿 · 胜', title: '拿住了「鬼手」', button: '收起盐引',
        story: '你把散落一地的盐引一张张捡起来，一共二十三张。钱三趴在地上喘气，左眉上那颗痣一跳一跳。',
        after: {
          plea: '钱三捂着胸口：「官爷……小的原是汪家盐号的伙计，他们冤我偷账，打断我两根肋骨赶出门。小的这才真偷了他们的盐引。」',
          opts: fate('lsm_qian', '钱三', 800, '八百文', 40,
            { ya: '你把钱三锁了，押回府衙。周捕头点过盐引，在簿子上记了一笔。', fang: '你把盐引收进怀里，朝桥下努了努嘴。钱三磕了个头，跳上一条船走了。', sha: '你一剑结果了钱三。桥头看热闹的人一哄而散。' },
            { ya: '钱三押在府衙大牢里，牢头那里提审得出东西来。', fang: '钱三欠你一条命。汪家丢的盐引，还有几张没找回来。', sha: '杀人的事传得快，扬州城里说你下手狠。' })
        } },
      lose: LOSE('钱三', '钱三跳上船走了。他还在扬州城里，等风头过去，照样要销赃。'),
      flee: LOSE('钱三', '你没追上。钱三还在扬州城里。')
    }
  },
  {
    id: 'lsm_bai', name: '白七郎', title: '「玉面」郎中', ini: '白', tone: 'jade', weapon: '铁骨扇', ws: '扇', tag: '缉拿',
    nature: '阴', reach: '短', rank: 1.8, build: 'even', firstTell: 2,
    moves: ['望闻问切', '银针渡穴', '折扇点穴', '药箱迷烟'],
    flourish: ['扇骨一合，直点你肩井穴', '袖中飞出三根银针，钉在你脚边的楼板上', '药箱一翻，一蓬白烟扑面而来', '扇面一展，挡住了你的视线'],
    tells: [
      { name: '银针渡穴', text: '白七郎把折扇插回腰间，两指拈起三根银针，眯着眼打量你的周身大穴……', dom: 'qiao', after: '三根银针同时出手，分取你的曲池、环跳、膻中。' },
      { name: '迷魂散', text: '白七郎退到窗边，单手拨开了药箱的精钢搭扣……', dom: 'su', after: '药箱里扬起一蓬白粉，他趁你闭眼的工夫，扇骨直戳你的咽喉。' }
    ],
    asides: ['望江楼的酒客们挤在楼梯口，谁也不敢下楼。', '掌柜抱着钱匣子躲在柜台后头。', '说书人的醒木停在半空。'],
    opening: ['银针出手太早，空了一回', '迷烟呛着了他自己', '扇骨点空，身子前倾'],
    intro: '白七郎慢慢合上折扇，脸上还带着笑：「官爷是来看病的？小生这里，正好有一味药，专治多管闲事。」',
    win: '你一剑挑落他的折扇，白七郎撞翻了药箱，瓶瓶罐罐滚了一地，几粒黑药丸滚到你脚边。',
    lose: '一蓬白粉扑面而来，你眼前一黑。等你揉开眼睛，白七郎已经从窗口翻了出去。',
    prep: [GUANBING, BAOBIAO],
    results: {
      win: { tag: '缉拿 · 胜', title: '拿住了「玉面」', button: '收起药箱',
        story: '你把那几粒黑药丸包进手帕。葛郎中说过，里头掺的是砒霜。白七郎靠着墙坐着，白净的脸上全是汗。',
        after: {
          plea: '白七郎喘着气，居然还在笑：「我卖的药是毒，可买药的人心里更毒。淮安那三条人命，是有人花钱买的。拿了我，那人照样睡得着。」',
          opts: fate('lsm_bai', '白七郎', 2000, '二两', 60,
            { ya: '你把白七郎锁了，连人带药箱押回府衙。葛郎中闻讯赶来，把那箱药丸一粒粒验过。', fang: '你踢开药箱，让开了路。白七郎拱了拱手，下楼时脚步还是斯斯文文的。', sha: '你一剑刺穿了他的咽喉。他到死脸上还挂着那副笑。' },
            { ya: '白七郎押在府衙大牢里。淮安那三条人命背后是谁，提审时也许问得出来。', fang: '白七郎还会去别处卖药。', sha: '淮安那桩案子的线头，断在你手里了。' })
        } },
      lose: LOSE('白七郎', '白七郎从窗口翻了出去。他还会回望江楼的，那里的酒客，就是他的病人。'),
      flee: LOSE('白七郎', '你退下楼来。白七郎还在望江楼上，照样给人号脉。')
    }
  },
  {
    id: 'lsm_xiong', name: '熊大', title: '边军逃兵', ini: '熊', tone: 'red', weapon: '铁锤', ws: '锤', tag: '缉拿',
    nature: '刚', reach: '短', rank: 2.6, build: 'outer', firstTell: 2,
    moves: ['开山锤', '横扫千军', '军中刺杀', '铁肘'],
    flourish: ['铁锤抡圆了砸下来，砧子都跟着跳', '一肘撞向你的心口', '脚下站的是军中的桩步，推都推不动', '锤柄一横，硬生生架住了你的兵刃'],
    tells: [
      { name: '破城锤', text: '熊大双手握锤，退了三步，脚底板把地上的铁屑踩得咯吱响……', dom: 'li', after: '这一锤是砸城门的打法，带着风声直贯下来。' },
      { name: '刺杀', text: '熊大忽然把锤柄当枪使，身子一沉，摆出了边军操练时的架势……', dom: 'su', after: '锤柄笔直地捅向你的心窝，快得不像是一个大个子使出来的。' }
    ],
    asides: ['打铁巷的铁匠们都停了锤。', '汤掌柜躲在刀架后头，一声不吭。', '炉子里的火呼呼地响。'],
    opening: ['一锤砸空，锤头陷进了地里', '右臂的旧伤一抽，锤势歪了', '喘了一口粗气'],
    intro: '熊大把铁锤往砧子上一搁，扯掉了右臂的布条，露出「忠勇」两个青字：「来吧。老子在边墙上杀过鞑子，没杀过自己人——除了那一个。」',
    win: '熊大的铁锤脱了手，砸在砧子上，火星四溅。他单膝跪在地上，右臂上的「忠勇」两个字被汗水浸得发亮。',
    lose: '熊大一锤砸在你身前的地上，震得你虎口发麻。他没再追，扛起锤子出了打铁巷。',
    prep: [BAOBIAO],
    results: {
      win: { tag: '缉拿 · 胜', title: '拿住了逃兵', button: '起身',
        story: '熊大没有再起来。他跪在地上，一下一下地喘气，像一头累坏了的牛。',
        after: {
          plea: '熊大抬起头：「那百户克扣军粮，饿死了我营里七个弟兄。我杀他，不后悔。」他顿了顿，「要拿就拿，要杀就杀，熊大不求人。」',
          opts: fate('lsm_xiong', '熊大', 4000, '四两', 80,
            { ya: '你给熊大上了锁。他自己站起来，跟着你走，一路上一句话也没说。', fang: '你把锤子还给了他。熊大看了你一会儿，抱了抱拳，转身往江边去了。', sha: '你一剑刺进了他的胸口。熊大低头看了看，又抬头看了看你，倒了下去。' },
            { ya: '熊大押在府衙大牢里，秋后问斩。牢里的人说，他夜里常对着墙念那七个人的名字。', fang: '熊大过江北上了。', sha: '打铁巷的人都说，那个大个子是条好汉。' })
        } },
      lose: LOSE('熊大', '熊大扛着锤出了打铁巷。他没走远，还在镇江，还在打铁。'),
      flee: LOSE('熊大', '你退出了打铁巷。熊大照旧抡他的锤。')
    }
  }
];

/** 人犯的样子：识破之前只是个路人，识破了才能动手拿人 */
const NPCS: NpcDef[] = [
  {
    id: 'lsm_qian', name: '瘦高个', altName: { if: { flag: 'lsm_qian_shipo' }, name: '鬼手钱三' }, ini: '瘦', tone: 'gray', brief: '在桥头晃悠',
    look: '瘦长脸，左眉上一颗黑痣，十根手指又细又长，袖口总拢着。眼睛不看人的脸，看人家的钱袋。',
    at: { room: 'jc_yz_yuanmen', if: { hour: { from: 9, to: 17 }, shi: { id: 'lsm_qian', at: LOOSE } } },
    verbs: ['交谈', { verb: '盘问', if: { shenfen: 'bukuai' } }, '观察', { verb: '动手', if: { flag: 'lsm_qian_shipo' } }],
    actions: {
      交谈: [
        { if: { flag: 'lsm_qian_shipo' }, text: '钱三往后退了一步，一只手摸到了腰后：「官爷认错人了吧？」' },
        { text: '「借过借过。」瘦高个侧身从你身边挤过去，手在你腰间轻轻一碰。你一摸钱袋，还在。他回头冲你笑了笑。' }
      ],
      盘问: [
        { text: '你亮出腰牌。瘦高个的脸一下子白了，左眉上那颗痣跟着一跳。海捕文书上画的，正是这张脸。',
          do: [{ type: 'flag', flag: 'lsm_qian_shipo' }, { type: 'shi', id: 'lsm_qian' }] }
      ],
      动手: [{ do: [{ type: 'fight', foe: 'lsm_qian' }] }]
    }
  },
  {
    id: 'lsm_bai', name: '游方郎中', altName: { if: { flag: 'lsm_bai_shipo' }, name: '玉面白七郎' }, ini: '郎', tone: 'jade', brief: '在给酒客号脉',
    look: '三十来岁，面皮白净，青布长衫洗得发白，背着一只药箱。说话斯斯文文，号脉时手指搭得极轻。',
    at: { room: 'cheng_tavern', if: { hour: { from: 18, to: 23 }, shi: { id: 'lsm_bai', at: LOOSE } } },
    verbs: ['交谈', { verb: '盘问', if: { shenfen: 'bukuai' } }, '观察', { verb: '动手', if: { flag: 'lsm_bai_shipo' } }],
    actions: {
      交谈: [
        { if: { flag: 'lsm_bai_shipo' }, text: '白七郎慢慢合上折扇：「看来这顿酒，小生是喝不安生了。」' },
        { text: '「客官面色发青，是肝火。」郎中笑吟吟地从药箱里摸出一个小瓷瓶，「小生这里有一味清肝丸，一百文三丸，比济生堂便宜一半。」' }
      ],
      盘问: [
        { text: '你亮出腰牌。郎中的手指在药箱上停了一下，随即笑道：「官爷要看病？」可他的眼睛已经瞟向了窗口。淮安的海捕文书上，画的就是这副白净面皮。',
          do: [{ type: 'flag', flag: 'lsm_bai_shipo' }, { type: 'shi', id: 'lsm_bai' }] }
      ],
      动手: [{ do: [{ type: 'fight', foe: 'lsm_bai' }] }]
    }
  },
  {
    id: 'lsm_xiong', name: '大个子帮工', altName: { if: { flag: 'lsm_xiong_shipo' }, name: '逃兵熊大' }, ini: '熊', tone: 'red', brief: '抡着铁锤',
    look: '比旁人高出一个头，赤着上身，只有右臂裹着一圈脏布条。一锤下去，砧子都跟着跳。',
    at: { room: 'jc_zj_datie', if: { hour: { from: 7, to: 18 }, shi: { id: 'lsm_xiong', at: LOOSE } } },
    verbs: ['交谈', { verb: '盘问', if: { shenfen: 'bukuai' } }, '观察', { verb: '动手', if: { flag: 'lsm_xiong_shipo' } }],
    actions: {
      交谈: [
        { if: { flag: 'lsm_xiong_shipo' }, text: '熊大把锤子搁在砧子上，看着你：「我知道你是来干什么的。等我把这块铁打完。」' },
        { text: '大个子抡着锤，头也不抬：「要打什么？找汤掌柜说去，我只管抡锤。」' }
      ],
      盘问: [
        { text: '你亮出腰牌。大个子手里的锤停在半空，过了好一会儿才落下来，砸偏了，火星溅了一地。他没抬头：「你认得我。」',
          do: [{ type: 'flag', flag: 'lsm_xiong_shipo' }, { type: 'shi', id: 'lsm_xiong' }] }
      ],
      动手: [{ do: [{ type: 'fight', foe: 'lsm_xiong' }] }]
    }
  },
  /* ---------- 府衙大牢：捕快押来的人犯，提审得出下一个人犯的下落 ---------- */
  {
    id: 'lsm_laotou', name: '牢头', ini: '牢', tone: 'gray', brief: '晃着一串钥匙', night: true, at: { room: 'yz_fuya_lao' },
    look: '矮胖，一脸油汗，腰上的钥匙有二三十把，走起路来叮当乱响。大牢里的事，没有他不知道的。',
    verbs: ['交谈', '观察', { verb: '提审', if: { sect: LSM } }],
    actions: {
      交谈: [
        { if: { sect: LSM }, text: '牢头晃着钥匙：「捕头押来的人，小的都好生看着。要提审，只管吩咐。」' },
        { text: '「大牢重地，闲人免进。」牢头把钥匙往身后一藏，「要探监，先找周捕头批条子。」' }
      ],
      提审: [
        { if: { shi: { id: 'lsm_qian', at: ['luowang'] }, notFlag: 'lsm_qian_ts' },
          text: '钱三缩在稻草堆里，见了你直作揖：「官爷，小的拿一句话换二十板子。望江楼上那个夜里给人看病的郎中，不是郎中。小的在淮安见过他，一副药下去，一家三口都没了。」',
          do: [{ type: 'flag', flag: 'lsm_qian_ts' }, { type: 'flag', flag: 'lsm_bai_shipo' }, { type: 'shi', id: 'lsm_bai' },
            { type: 'feed', tag: '江湖', text: '提审钱三：望江楼上夜里看病的游方郎中，就是海捕文书上的白七郎。' }] },
        { if: { shi: { id: 'lsm_bai', at: ['luowang'] }, notFlag: 'lsm_bai_ts' },
          text: '白七郎靠着墙，脸色比墙还白：「淮安那桩，是一个盐商花三十两买的命，田契如今在他手里。」他闭上眼，「你们要找的那个逃兵，在镇江打铁巷。我去配药时见过他，右臂上的字裹着也看得出来。」',
          do: [{ type: 'flag', flag: 'lsm_bai_ts' }, { type: 'flag', flag: 'lsm_xiong_shipo' }, { type: 'shi', id: 'lsm_xiong' },
            { type: 'feed', tag: '江湖', text: '提审白七郎：逃兵熊大躲在镇江打铁巷。淮安的命案，背后是一个盐商。' }] },
        { if: { shi: { id: 'lsm_xiong', at: ['luowang'] }, notFlag: 'lsm_xiong_ts' },
          text: '熊大坐得笔直，一句一句地说：那百户怎么把军粮卖给粮商，营里怎么一天只发半碗稀粥，七个弟兄怎么一个一个倒下去。他念完七个名字，就不再开口了。',
          do: [{ type: 'flag', flag: 'lsm_xiong_ts' },
            { type: 'feed', tag: '江湖', text: '提审熊大：边军百户克扣军粮，饿死了七个人。熊大的供词，周捕头压在卷宗最底下。' }] },
        { text: '牢头翻了翻簿子：「眼下牢里没有捕头押来、还没提审过的人犯。」' }
      ]
    }
  }
];

/** 识破人犯的另一条路：根基之眼（不是捕快也看得出来） */
const EYES: EyeDef[] = [
  { npc: 'lsm_qian', attr: '身法', atLeast: 25,
    text: '他站着时脚跟从不落地，眼睛一直在找能落脚的地方：桥栏、船篷、墙头。是个翻墙越户的老手。' },
  { npc: 'lsm_bai', attr: '悟性', atLeast: 27, if: { notFlag: 'lsm_bai_shipo' },
    text: '你瞄了一眼他开的方子：药名写得像模像样，分量却不对，其中一味写的是「信石」。信石就是砒霜。',
    do: [{ type: 'flag', flag: 'lsm_bai_shipo' }, { type: 'shi', id: 'lsm_bai' }] },
  { npc: 'lsm_xiong', attr: '胆魄', atLeast: 25,
    text: '他抡锤时眼睛不看铁，看巷子口。每有人进来，他的锤就慢一拍。' },
  { npc: 'lsm_qian', attr: '悟性', atLeast: 25, if: { notFlag: 'lsm_qian_shipo' },
    text: '他袖口里露出半张黄纸，纸边盖着朱红的官印，是盐引。左眉上那颗痣，跟府衙海捕文书上画的一模一样。',
    do: [{ type: 'flag', flag: 'lsm_qian_shipo' }, { type: 'shi', id: 'lsm_qian' }] },
  { npc: 'lsm_bai', attr: '根骨', atLeast: 29, if: { notFlag: 'lsm_bai_shipo' },
    text: '他号脉时三根手指一点力道都不使，可药箱的搭扣是精钢的，单手一拨就开。那不是郎中的手，是使暗器的手。',
    do: [{ type: 'flag', flag: 'lsm_bai_shipo' }, { type: 'shi', id: 'lsm_bai' }] },
  { npc: 'lsm_xiong', attr: '体魄', atLeast: 29, if: { notFlag: 'lsm_xiong_shipo' },
    text: '他右臂的布条底下露出半个青黑的刺字，是个「勇」字。边军的兵，臂上都刺着「忠勇」。',
    do: [{ type: 'flag', flag: 'lsm_xiong_shipo' }, { type: 'shi', id: 'lsm_xiong' }] }
];

const NEWS: NewsDef[] = [
  { if: { flag: 'lsm_xiong_ts' }, text: '府衙大牢里那个逃兵的供词传了出来：边军百户克扣军粮，饿死了七个人。' },
  { if: { flag: 'lsm_qian_ya' }, text: '汪家盐号追回了二十几张盐引，毕掌柜在门口放了一挂鞭炮。' },
  { if: { flag: 'lsm_bai_ya' }, text: '济生堂的葛郎中把望江楼那个游方郎中的药丸烧了一大筐，说里头掺的是砒霜。' },
  { if: { flag: 'lsm_xiong_ya' }, text: '镇江打铁巷的铁匠们说，那个被拿走的大个子帮工，打的铁比谁都实在。' }
];

const pack: ContentPack = { shi: SHI, npcs: NPCS, foes: FOES, eyes: EYES, news: NEWS };
export default pack;
