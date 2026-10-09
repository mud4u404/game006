import type { Cond, ContentPack, FoeDef, JobDef, NpcDef, NewsDef } from '../types';

/** 府衙悬赏榜（Issue #108）：游侠的营生。四张榜各是一个人的事。 */

/** 还没补完、暂不挂出来的榜用它（没有地方写这个旗标） */
const PENDING: Cond = { flag: 'xsb_pending_open' };

const NPCS: NpcDef[] = [
  {
    id: 'xsb_zhuren', name: '书办', ini: '书', tone: 'blue', brief: '抄着文书',
    look: '府衙的老书办，五十来岁，一笔馆阁体写得端正。管着海捕文书的张贴和撤换，也管登记领赏。',
    at: { room: 'yz_fuya' },
    // 四张榜都还交不了差（线索、对手都没有入口，审查 B02、D01、F01）：补完以前不挂出来，交 zcode 补。
    // 补完一张，把那一张条件里的 PENDING 删掉
    verbs: ['交谈', '观察', { verb: '揭寻人', if: { jobOpen: 'xsb_xunren', ...PENDING } }, { verb: '揭寻物', if: { jobOpen: 'xsb_xunwu', ...PENDING } }, { verb: '揭缉凶', if: { jobOpen: 'xsb_xiong', ...PENDING } }, { verb: '揭剿匪', if: { jobOpen: 'xsb_jiaofei', ...PENDING } }, { verb: '交寻人', if: { job: 'xsb_xunren', flag: 'xsb_xr_found' } }, { verb: '交寻物', if: { job: 'xsb_xunwu', flag: 'xsb_xw_found' } }, { verb: '交缉凶', if: { job: 'xsb_xiong', flag: 'xsb_xiong_beat' } }, { verb: '交剿匪', if: { job: 'xsb_jiaofei', flag: 'xsb_jf_beat' } }],
    actions: {
      交谈: [
        { if: { flag: 'xsb_xr_done' }, text: '书办翻了翻册子：「寻人的那桩，学徒找到了。他师父已经领人回去了——多亏公子帮着打听。」' },
        { if: { flag: 'xsb_xw_done' }, text: '「寻物的那桩也结了。」书办在册子上画了个勾，「东西找回来了，寡妇的玉佩失而复得。」' },
        { if: { flag: 'xsb_xiong_done' }, text: '书办合上册子：「缉凶的那桩，凶犯到案了。遗孀在灵前烧了纸，说是终于能睡了。」' },
        { if: { flag: 'xsb_jf_han' }, text: '蜀冈山上有个猎户帮着剿匪，箭无虚发。山下的采药人都说老韩好样的。' },
    { if: { flag: 'xsb_jf_ercapt' }, text: '黑风寨的二当家叫人拿住了，匪徒们散伙回了家。蜀冈山道太平了。' },
    { if: { flag: 'xsb_jf_all' }, text: '黑风寨二十三口匪徒尽数拿送府衙，全城称快。' },
    { if: { flag: 'xsb_jf_sha' }, text: '黑风寨叫人一把火烧了。跑得慢的匪徒，烟熏死在了山洞里。' },
    { if: { flag: 'xsb_jf_done' }, text: '「剿匪的那桩，山寨也平了。」书办竖了个大拇指，「四张榜全叫你揭了——游侠里头，你算头一份。」' },
        { text: '书办翻开底册：「寻人、寻物、缉凶、剿匪，府台那边还没批下来，榜还贴不出去。」他蘸了蘸墨，「悬赏榜上的那几桩，公子先去看看。」' },
      ],
      揭寻人: [{ do: [{ type: 'job', id: 'xsb_xunren' }] }],
      揭寻物: [{ do: [{ type: 'job', id: 'xsb_xunwu' }] }],
      揭缉凶: [{ do: [{ type: 'job', id: 'xsb_xiong' }] }],
      揭剿匪: [{ do: [{ type: 'job', id: 'xsb_jiaofei' }] }],
      交寻人: [
        { if: { job: 'xsb_xunren', flag: 'xsb_xr_found' },
          text: '书办在册子上画了个勾：「学徒找到了。」他从柜里点出一串铜钱。',
          do: [
            { type: 'jobDone', id: 'xsb_xunren' },
            { type: 'flag', flag: 'xsb_xr_done' },
            { type: 'feed', tag: '江湖', text: '你完成了寻人的悬赏，领了赏钱。' }
          ] },
        { text: '「寻人的榜还没结果——找到了再来领赏。」' }
      ],
      交寻物: [
        { if: { job: 'xsb_xunwu', flag: 'xsb_xw_found' },
          text: '书办验了玉佩：「正是寡妇周氏丢的那块。」他在册子上画了个勾，他从柜里点出一串铜钱。',
          do: [
            { type: 'jobDone', id: 'xsb_xunwu' },
            { type: 'flag', flag: 'xsb_xw_done' },
            { type: 'feed', tag: '江湖', text: '你完成了寻物的悬赏，领了赏钱。' }
          ] },
        { text: '「寻物的榜还没结果——找到了再来领赏。」' }
      ],
      交缉凶: [
        { if: { job: 'xsb_xiong', flag: 'xsb_xiong_beat' },
          text: '书办验看了凶手：「赵屠户，命案在身——正是海捕文书上的人。」他在册子上画了个勾，他从柜里点出一串铜钱，比前两张榜都沉。',
          do: [
            { type: 'jobDone', id: 'xsb_xiong' },
            { type: 'flag', flag: 'xsb_xiong_done' },
            { type: 'feed', tag: '江湖', text: '你缉拿了命案凶手赵屠户，领了赏钱。' }
          ] },
        { text: '「缉凶的榜还没结果——拿住了再来领赏。」' }
      ],
      交剿匪: [
        { if: { job: 'xsb_jiaofei', flag: 'xsb_jf_beat' },
          text: '书办验了二当家的九环大刀：「黑风寨二当家，正是榜上要拿的人。」他在册子上画了个勾，他让衙役抬出一只钱匣：「剿匪的赏，府台亲批的。」',
          do: [
            { type: 'jobDone', id: 'xsb_jiaofei' },
            { type: 'flag', flag: 'xsb_jf_done' },
            { type: 'feed', tag: '江湖', text: '你剿灭了黑风寨，领了赏钱。' }
          ] },
        { text: '「剿匪的榜还没结果——平了山寨再来领赏。」' }
      ]
    }
  },
  {
    id: 'xsb_shifu', name: '布庄掌柜', ini: '掌', tone: 'amber', brief: '愁着学徒',
    look: '布庄掌柜，五十来岁，袖口磨得起了毛边。学徒走了以后，店里连个跑腿的人都没有。',
    at: { room: 'cheng', if: { job: 'xsb_xunren' } },
    verbs: ['交谈', '观察'],
    actions: {
      交谈: [
        { text: '「那孩子叫小栓，十六了，在我铺子里学了三年徒。」掌柜的叹气，「前几日他舅舅来了一趟，第二天人就没了。我怕他出了什么事。」',
          do: [{ type: 'flag', flag: 'xsb_xr_clue1' }] }
      ]
    }
  },
  {
    id: 'xsb_gufu', name: '寡妇周氏', ini: '周', tone: 'purple', brief: '抹着眼泪',
    look: '一身素服的年轻寡妇，眼圈红肿。她丈夫上个月死在城里，凶手至今没有抓到。',
    at: { room: 'yz_fuya', if: { job: 'xsb_xiong' } },
    verbs: ['交谈', '观察'],
    actions: {
      交谈: [
        { text: '周氏朝你福了一礼：「我丈夫死在自家门口，身上三道刀伤。官府查了一个月没有眉目——求公子替他讨个公道。」',
          do: [{ type: 'flag', flag: 'xsb_xiong_clue' }] }
      ]
    }
  },
  {
    id: 'xsb_liehu', name: '猎户老韩', ini: '韩', tone: 'jade', brief: '磨着箭头',
    look: '黑瘦的猎户，一身腱子肉，背上背着一张硬弓。他住在蜀冈山脚，黑风寨的人占了山头以后，打猎都得绕路。',
    at: { room: 'daming', if: { job: 'xsb_jiaofei' } },
    verbs: ['交谈', '观察'],
    actions: {
      交谈: [
        { text: '「黑风寨占了山头以后，山上的獐子鹿都打不成了。」老韩磨着箭头，「他们有二十来号人，寨墙高、刀也快。你一个人去是送死——得找个帮手，或者摸清他们的换岗时辰。」',
          do: [{ type: 'flag', flag: 'xsb_jf_clue' }] }
      ]
    }
  }
];

const XUNREN: FoeDef = {
  id: 'xsb_xunren', name: '地痞', title: '堵路的混混', ini: '混', tone: 'gray',
  weapon: '木棒', ws: '棒', tag: '杂兵',
  rank: 0, build: 'even', weak: 0.5,
  firstTell: 3,
  moves: ['乱棒', '当头一棒', '扫堂棍'],
  flourish: ['木棒抡得呼呼响', '一脸横肉', '嘴里骂骂咧咧'],
  tells: [
    { name: '当头棒喝', text: '地痞双手抡棒当头砸下，嘴里骂个不停……', dom: 'li', after: '木棒砸在墙上，弹了回去！' },
    { name: '扫堂棍', text: '地痞矮身横扫，专打下盘……', dom: 'su', after: '棍子擦着地面扫过来！' }
  ],
  asides: ['路人在远处探头看热闹。', '一条野狗追着地痞跑了半条街。'],
  opening: ['把木棒在地上戳了戳', '瞪着眼往你跟前凑', '嘴里嚼着草根'],
  intro: '地痞把木棒横在胸前：「走什么走？此路是我开——留下买路钱！」',
  win: '你一把夺过木棍，一脚踹在他屁股上。地痞连滚带爬地跑了。',
  lose: '木棍砸在你肩膀上，你踉跄了几步，地痞趁乱溜了。',
  spar: true,
  results: {
    win: { tag: '路遇', title: '赶走地痞', button: '继续问路',
      story: '地痞跑了，你继续打听学徒的下落。',
      do: [{ type: 'lilian', amount: 10 }] },
    lose: { tag: '路遇', title: '吃了亏', button: '拍拍灰',
      story: '地痞占了上风，你得绕道走了。' }
  }
};

const XIONGFAN: FoeDef = {
  id: 'xsb_xiongfan', name: '赵屠户', title: '命案在身的凶手', ini: '凶', tone: 'red',
  weapon: '剔骨尖刀', ws: '刀', tag: '缉凶',
  rank: 1.5, build: 'outer',
  firstTell: 2,
  moves: ['剔骨刀法', '穿喉刺', '断筋割', '背后一刀'],
  flourish: ['剔骨尖刀在月光下一闪', '他是杀猪的出身，手稳得很', '刀刀往要害招呼，没有一招是虚的', '眼睛里全是绝望的狠劲'],
  tells: [
    { name: '穿喉刺', text: '赵屠户并指如刺，一记直刺快如闪电，直取咽喉……', dom: 'su', after: '刀尖擦着喉结划过去，血珠溅了出来！' },
    { name: '断筋割', text: '赵屠户矮身一刀横扫，专割脚筋，杀猪的手法用在人身上……', dom: 'qiao', after: '刀锋贴着脚踝掠过，险险避开了！' }
  ],
  asides: ['街坊的窗户关得紧紧的，没人敢看。', '一只野猫从墙头窜过，惊起一阵灰尘。'],
  opening: ['把刀在围裙上擦了擦', '握刀的手很稳', '眼睛盯着你不放'],
  intro: '赵屠户提着剔骨刀转过身来：「我等的就是你——来拿我的人？」',
  win: '赵屠户的刀脱手落地。他跪了下来，肩膀塌了下去：「你赢了。跟我走罢。」',
  lose: '剔骨刀划过你的肋下。你倒在地上，看着赵屠户消失在巷口。他没有追——他只要你不跟着他。',
  prep: [
    { if: { flag: 'xsb_xiong_clue' }, atk: 0.85, big: 0.85,
      text: '你记着周氏的话——死者身上三道刀伤，都是正面伤。赵屠户是杀猪的，惯用左手。你站到了他的右侧。',
      story: '你从周氏口中得知死者的伤都在正面，凶手是左撇子。你站到了赵屠户的右侧。' }
  ],
  results: {
    lose: { tag: '缉凶 · 负', title: '刀光一错', button: '揉着肋下',
      story: '双刀的影子在你眼前一错，肋下一凉——赵屠户收了刀：「功夫不错，可惜替汪家看门。」你挣扎着爬起来，人已不见。',
      do: [{ type: 'heal', hpAtLeast: 0.3 }] },
    win: { tag: '缉凶 · 胜', title: '凶手到案', button: '定他的下场',
      story: '赵屠户跪在地上，剔骨刀掉在脚边。他的肩膀塌了下去——杀了人的那天起，他就一直在等这一天。',
      do: [{ type: 'flag', flag: 'xsb_xiong_beat' }],
      after: {
        plea: '「我婆娘病了，郎中说要三十两。我去找布行的钱掌柜借，他不借还骂我……我一刀下去，收不住手。」赵屠户的声音很低，「人是我杀的，我认罪。」',
        opts: [
          { label: '送他去府衙', sub: '杀人偿命，天经地义',
            say: '你摇了摇头：「杀人偿命。走罢。」赵屠户站起来，自己朝府衙走去。',
            do: [
              { type: 'flag', flag: 'xsb_xiong_sent' }, { type: 'flag', flag: 'xsb_xiong_done' },
              { type: 'xia', delta: 2 },
              { type: 'feed', tag: '江湖', text: '你缉拿了命案凶手赵屠户，送去了府衙。遗孀周氏在灵前烧了纸。' }
            ],
            later: '赵屠户被判了斩监候。周氏去牢里送了最后一顿饭。' },
          { label: '听他说完，送他去自首', sub: '侠义 +1',
            say: '你听完他的事，沉默了半晌：「情有可原，法不可饶。但你可以自己走去府衙——比你被我押着去，体面。」',
            do: [
              { type: 'flag', flag: 'xsb_xiong_self' }, { type: 'flag', flag: 'xsb_xiong_done' },
              { type: 'xia', delta: 1 },
              { type: 'feed', tag: '江湖', text: '赵屠户自己走去府衙自首了。周氏说，他总算做了回有担当的人。' }
            ],
            later: '赵屠户自己去了府衙自首。街上的人都说，这个杀猪的，走的时候有骨气。' },
          { label: '放他走', sub: '恶名 +2',
            say: '你收了剑：「走吧。你身上背的人命，你自己掂量。」赵屠户朝你磕了个头，消失在了巷口。',
            do: [
              { type: 'flag', flag: 'xsb_xiong_gone' }, { type: 'flag', flag: 'xsb_xiong_done' },
              { type: 'eming', delta: 2 },
              { type: 'feed', tag: '江湖', text: '你放走了命案凶手赵屠户。城里的人都说，官府不管的事，也没人管得了。' }
            ],
            later: '赵屠户从此销声匿迹。但周氏的冤屈，再也没有人替她讨了。' }
        ]
      } }
  }
};

const JIAOFEI: FoeDef = {
  id: 'xsb_jiaofei', name: '黑风寨二当家', title: '占了蜀冈山头的匪首', ini: '匪', tone: 'red',
  weapon: '九环大刀', ws: '刀', tag: '剿匪',
  rank: 2, build: 'outer',
  firstTell: 2,
  moves: ['九环劈山', '横扫六合', '追命连环', '黑风蔽日'],
  flourish: ['九环大刀上的铁环哗啦啦作响', '刀势狂野，全无章法却快得惊人', '他身后站着十几个持刀的匪徒', '一脚踏碎了脚边的枯枝'],
  tells: [
    { name: '九环劈山', text: '二当家把九环大刀抡过头顶，全力劈下，九环齐响如同炸雷……', dom: 'li', after: '大刀劈在地面上，震得人虎口发麻！' },
    { name: '黑风蔽日', text: '二当家刀交左手，右手从怀里抽出一把飞刀，趁乱掷来……', dom: 'qiao', after: '飞刀擦着耳边飞过，割掉了一撮头发！' }
  ],
  asides: ['山寨里的匪徒在寨墙上探头张望。', '一只乌鸦从枯树梢飞起，惊叫了两声。', '老韩说的换岗时辰快到了。'],
  opening: ['把九环刀往地上一顿', '啐了一口唾沫', '朝身后的匪徒打了个手势'],
  intro: '二当家把九环大刀往肩上一扛：「老韩派来的？回去告诉他——这座山，老子占定了。」',
  win: '二当家的九环大刀脱手飞出，插在寨门上嗡嗡作响。他退了两步，身后的匪徒一哄而散。',
  lose: '九环大刀的刀背重重拍在你胸口，你倒退了几步，撞在寨墙上滑坐下来。',
  prep: [
    { if: { flag: 'xsb_jf_clue' }, atk: 0.85, big: 0.85,
      text: '你记着老韩说的换岗时辰——寅时三刻寨墙上的匪徒换班，足有一炷香的空当。你选在这个时候动手。',
      story: '你按老韩说的换岗时辰摸上了山，寨墙上的匪徒果然正在换班。' },
    { if: { flag: 'xsb_jf_ally' },
      ally: { name: '猎户老韩', share: 0.25, at: [3, 8, 13],
        say: ['老韩的箭从树梢上射下来，钉在匪徒的肩膀上。', '老韩又是一箭，这次射的是二当家的帽缨。', '老韩从岩石后头跳出来，猎刀和九环大刀磕在一起。'] },
      text: '老韩从山道旁的岩石后头闪出，猎弓满弦，一箭射向山寨的哨兵。',
      story: '老韩从岩石后头掠出，箭无虚发，替你清出了上山的路。',
      win: [{ type: 'flag', flag: 'xsb_jf_han' }] }
  ],
  results: {
    lose: { tag: '剿匪 · 负', title: '不敌二当家', button: '退出山寨',
      story: '九环大刀的刀背重重拍在你胸口，你倒退了几步，撞在寨墙上滑坐下来。二当家啐了一口：「回去多练几年。」',
      do: [{ type: 'heal', hpAtLeast: 0.3 }] },
    win: { tag: '剿匪 · 胜', title: '山寨平了', button: '定他的下场',
      story: '二当家被你按在寨前的空地上，身后的匪徒一哄而散。老韩从山道旁走出来，朝你竖了个大拇指。',
      do: [{ type: 'flag', flag: 'xsb_jf_beat' }],
      after: {
        plea: '二当家把九环刀丢在地上：「寨主带着金银跑了，留我们这些炮灰守寨。我家里还有个瞎眼的老娘……」',
        opts: [
          { label: '只拿二当家，散伙匪回家', sub: '侠义 +3',
            say: '你朝匪徒们喊了一声：「寨主跑了，你们散了罢。回家去，种田打猎，别再占山。」匪徒们面面相觑，丢下刀一哄而散。',
            do: [
              { type: 'flag', flag: 'xsb_jf_ercapt' }, { type: 'flag', flag: 'xsb_jf_done' },
              { type: 'xia', delta: 3 },
              { type: 'feed', tag: '江湖', text: '你只拿了二当家，其余匪徒散伙回家。老韩说，蜀冈山道终于太平了。' }
            ],
            later: '蜀冈山道的匪患平了。猎户们重新上山打猎，老韩说这全是你的功劳。' },
          { label: '尽数拿送官府', sub: '银两 +460',
            say: '你把二当家和匪徒们全捆了，押下山去。府衙的吴捕头点人数——二十三口，一个不少。榜外另有人头钱，一口二十文，四百六十文。',
            do: [
              { type: 'flag', flag: 'xsb_jf_all' }, { type: 'flag', flag: 'xsb_jf_done' },
              { type: 'silver', delta: 460 },
              { type: 'feed', tag: '江湖', text: '你把黑风寨的匪徒尽数拿送府衙，另领了四百六十文人头钱。' }
            ],
            later: '黑风寨的匪徒全叫人拿送府衙。蜀冈一带的猎户采药人，都松了一口气。' },
          { label: '烧了山寨，赶尽杀绝', sub: '恶名 +3',
            say: '你放了一把火，把黑风寨烧了个精光。火光照亮了半边天——跑得慢的匪徒，叫烟熏得满山乱窜。',
            do: [
              { type: 'flag', flag: 'xsb_jf_sha' }, { type: 'flag', flag: 'xsb_jf_done' },
              { type: 'eming', delta: 3 },
              { type: 'feed', tag: '江湖', text: '黑风寨的废墟还在冒烟。路过的人都说，那把火烧得太狠了。' }
            ],
            later: '黑风寨的废墟还在冒烟。路过的人都说，那把火烧得太狠了。' }
        ]
      } }
  }
};

const JOBS: JobDef[] = [
  { id: 'xsb_xunren', shenfen: 'youxia', tier: 0, title: '帮布庄掌柜找回走失的学徒小栓', npc: 'xsb_shifu', at: 'cheng', days: 3 },
  { id: 'xsb_xunwu', shenfen: 'youxia', tier: 1, title: '帮寡妇找回被偷的玉佩', npc: 'xsb_gufu', at: 'yz_fuya', days: 3, again: 5 },
  { id: 'xsb_xiong', shenfen: 'youxia', tier: 2, title: '缉拿命案凶手赵屠户', npc: 'xsb_gufu', at: 'yz_fuya', days: 5 },
  { id: 'xsb_jiaofei', shenfen: 'youxia', tier: 3, title: '剿灭蜀冈黑风寨，拿住二当家', npc: 'xsb_liehu', at: 'daming', days: 7, k: 1.5 }
];

const NEWS: NewsDef[] = [
  { if: { flag: 'xsb_xr_done' }, text: '布庄走失的学徒小栓找到了，他师父领着人回去了。街坊说，是一个佩剑的公子帮着打听的。' },
  { if: { flag: 'xsb_xw_done' }, text: '寡妇周氏丢的玉佩找回来了。有人说是一个江湖客从小偷手里追回来的。' },
  { if: { flag: 'xsb_xiong_done' }, text: '命案凶手赵屠户到案了。遗孀周氏说，终于能睡个安稳觉了。' },
  { if: { flag: 'xsb_jf_han' }, text: '蜀冈山上有个猎户帮着剿匪，箭无虚发。山下的采药人都说老韩好样的。' },
    { if: { flag: 'xsb_jf_ercapt' }, text: '黑风寨的二当家叫人拿住了，匪徒们散伙回了家。蜀冈山道太平了。' },
    { if: { flag: 'xsb_jf_all' }, text: '黑风寨二十三口匪徒尽数拿送府衙，全城称快。' },
    { if: { flag: 'xsb_jf_sha' }, text: '黑风寨叫人一把火烧了。跑得慢的匪徒，烟熏死在了山洞里。' },
    { if: { flag: 'xsb_jf_done' }, text: '蜀冈黑风寨叫人平了。山下的猎户采药人，都说是位侠客帮了大忙。' },
    { if: { flag: 'xsb_xr_clue1' }, text: '布庄的学徒小栓失踪前，他舅舅来过一趟。掌柜的逢人便念叨这孩子。' },
    { if: { flag: 'xsb_xiong_sent' }, text: '命案凶手赵屠户被送去了府衙。遗孀周氏说，他走的时候有担当。' },
    { if: { flag: 'xsb_xiong_self' }, text: '赵屠户自己走去府衙自首了。街上的人都说，这个杀猪的，走的时候有骨气。' },
    { if: { flag: 'xsb_xiong_gone' }, text: '命案凶手赵屠户叫人放走了，至今逍遥法外。周氏的眼泪已经流干了。' },
    { if: { flag: 'jy_fei_let' }, text: '汪家货栈夜里丢了一包湖丝，飞贼没抓着，掌柜的说要换锁。' },
    { if: { flag: 'jy_fei_shout' }, text: '汪家货栈夜里进了飞贼，有人喊跑了贼，汪老爷赏了二十文。' }
];

const NPC_OBJ: NpcDef[] = [
  {
    id: 'xsb_bang', name: '海捕文书', obj: true, icon: 'stele', brief: '照壁一角的木榜',
    look: '照壁一角钉着一块木榜，榜上贴着几张海捕文书，画着画像，写着案由和赏银，墨迹有新有旧。揭走了的，留下一块浆糊印。最底下一行小字：有能者揭榜，赴府衙登记。',
    at: { room: 'yz_fuya' },
    verbs: ['观察', '细看'],
    actions: {
      // 海捕文书上的人犯（packs/liushanmen.ts）：一个了结，下一个才贴出来
      细看: [
        { if: { shi: { id: 'lsm_qian', at: ['zaitao', 'zuoan'] } },
          text: '最新的一张：「飞贼『鬼手』钱三，瘦长脸，左眉一颗黑痣，十指细长。窃汪家盐号盐引三十张。拿获者赏银八百文。」画像底下有人用炭笔添了一行小字：辕门桥。',
          do: [{ type: 'shi', id: 'lsm_qian' }] },
        { if: { shi: { id: 'lsm_bai', at: ['zaitao', 'zuoan'] } },
          text: '最新的一张：「游方郎中『玉面』白七郎，面白无须，背药箱，善使银针。在淮安卖假药毒毙三命。拿获者赏银二两。」',
          do: [{ type: 'shi', id: 'lsm_bai' }] },
        { if: { shi: { id: 'lsm_xiong', at: ['zaitao', 'zuoan'] } },
          text: '最新的一张：「边军逃兵熊大，身长八尺，右臂刺『忠勇』二字。杀本营百户，畏罪潜逃。拿获者赏银四两。」画像上的人眉头拧着，像是有话要说。',
          do: [{ type: 'shi', id: 'lsm_xiong' }] },
        { if: { shi: { id: 'lsm_xiong', at: ['taozou'] } }, text: '熊大的那张画像还贴着，边角卷了起来。书办说，人过江往北去了，这张榜撤不撤，府台还没发话。' },
        { if: { shi: { id: 'lsm_xiong', at: ['luowang', 'fang', 'sha'] } }, text: '三张海捕文书都揭了，浆糊印一个挨一个。书办说，新的人犯，还没报上来。' },
        { text: '榜上暂时没有新贴的海捕文书，只剩几块浆糊印。' }
      ]
    }
  }
];

const pack: ContentPack = {
  npcs: [...NPCS, ...NPC_OBJ],
  foes: [XUNREN, XIONGFAN, JIAOFEI],
  jobs: JOBS,
  news: NEWS
};
export default pack;
