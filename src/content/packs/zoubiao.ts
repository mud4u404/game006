import type { ContentPack, FoeDef, JobDef, NpcDef, NewsDef } from '../types';

/**
 * 威远镖局 · 再走三趟镖（Issue #107）。
 * 三趟镖凶险各异：不是打架的税关、要打架的劫镖、托镖人有鬼的暗路。
 * 程先生管镖单，三趟都由他派；高档的镖要走过低档的才接得了。
 */

const NPCS: NpcDef[] = [
  {
    id: 'zb_cheng', name: '程先生', ini: '程', tone: 'blue', brief: '拨着算盘理镖单',
    look: '四十来岁的瘦削文人，戴一副断了一条腿、用细绳绑着的老花镜。拨算盘的手指细长，一笔一画都写得端端正正。',
    at: { room: 'biaoju' },
    verbs: ['交谈', '观察',
      { verb: '走布匹', if: { jobOpen: 'zb_bu', shenfen: 'biaoshi' } },
      { verb: '走药材', if: { jobOpen: 'zb_yao', shenfen: 'biaoshi', flag: 'zb_bu_done' } },
      { verb: '走官银', if: { jobOpen: 'zb_yin', shenfen: 'biaoshi', flag: 'zb_yao_done' } }],
    actions: {
      交谈: [
        { if: { job: 'zb_bu' }, text: '程先生推了推老花镜：「布匹装好了，在院里候着。瓜洲布行的朝奉会点数——少一匹，你的工钱扣一半。」' },
        { if: { job: 'zb_yao' }, text: '程先生翻了翻镖单：「药材金贵，路上别受潮。老蔡押车，你护卫。到了镇江百草堂，掌柜的会验货。」' },
        { if: { job: 'zb_yin' }, text: '程先生把镖单压得极低：「官银三百两，从府衙库房直提的。镖期五日——路上少看、少问、少停。」' },
        { if: { flag: 'zb_bu_done', notFlag: 'zb_yao_done' },
          text: '程先生翻了翻账本：「瓜洲那趟布匹，布行回话说点数分毫不差。」他在账上勾了一笔，「下一趟是药材，去镇江。比布匹金贵，也比布匹扎手——你走过一趟了，接不接？」' },
        { text: '程先生拨了两颗算盘珠：「镖单在这里，接不接看你。威远的规矩——误了期，降一级；丢了镖，走人。」' }
      ],
      观察: [{ text: '他的老花镜用细绳绑在耳朵后面，镜片厚得像瓶底。桌上镖单按远近排成一列，最近的那张边角卷了毛边。' }],
      走布匹: [
        { text: '程先生抽出一张镖单递给你：「一车细布，送去瓜洲布行。老蔡押车。路上有个关卡，税吏姓吴，你到了自会明白。」',
          do: [{ type: 'job', id: 'zb_bu' }] }
      ],
      走药材: [
        { text: '程先生把镖单压在算盘底下：「一批川贝和老参，送去镇江百草堂。这趟走水路过江，江上不太平——老蔡跟着你。」',
          do: [{ type: 'job', id: 'zb_yao' }] }
      ],
      走官银: [
        { text: '程先生把门关上了才开口：「官银三百两，府衙直提，送到镇江银号。镖期五日。」他顿了顿，「这趟镖托镖的人——你到了地头就明白了。」',
          do: [{ type: 'job', id: 'zb_yin' }] }
      ]
    }
  },
  {
    id: 'zb_wukai', name: '税吏吴开', ini: '税', tone: 'gray', brief: '守着关卡',
    look: '关卡的木栅栏横在官道中央，吴开坐在旁边的凉棚里摇着蒲扇。他的官服洗得发白，腰带的钩子是黄铜的——擦得倒是亮。',
    at: { room: 'yz_guandao', if: { job: 'zb_bu' } },
    verbs: ['交谈', '观察', '打点'],
    actions: {
      交谈: [
        { text: '吴开摇着蒲扇，头也不抬：「关卡税，车三十文，人十文。镖局的？镖局的也是车——三十文，一文不能少。」' }
      ],
      观察: [{ text: '凉棚柱子上贴了一张价目表：车三十文、马二十文、人十文。表旁边还有一行小字：「军车免——须有牌票」。' }],
      打点: [
        { if: { silver: 30 },
          text: '你把三十文递过去。吴开掂了掂，朝后面的伙计喊了一声：「抬杆——放行！」镖车吱吱呀呀地过了关卡。（银两 −30 文）',
          do: [
            { type: 'silver', delta: -30 },
            { type: 'flag', flag: 'zb_tax_paid' },
            { type: 'feed', tag: '江湖', text: '关卡打点了三十文，镖车顺利过关。' }
          ] },
        { text: '你摸了摸钱袋，三十文还凑不齐。吴开蒲扇一收：「没钱？那货物留下了，人可以走。」' }
      ]
    }
  },
  {
    id: 'zb_zhaofeng', name: '布行朝奉', ini: '布', tone: 'amber', brief: '点着布匹',
    look: '戴一副圆圆的水晶镜，手指干净，翻布匹的手势轻柔得像在摸猫。瓜洲布行的老朝奉，点了三十年的货。',
    at: { room: 'gz_town', if: { job: 'zb_bu' } },
    verbs: ['交谈', '观察', '交镖'],
    actions: {
      交镖: [
        { if: { flag: 'zb_tax_paid', notFlag: 'zb_bu_done' },
          text: '朝奉点了布匹，一匹不少。「威远镖局的货，从来不用操心。」他在镖单上按了手印，「下回还走你们家的镖。」',
          do: [
            { type: 'jobDone', id: 'zb_bu' },
            { type: 'flag', flag: 'zb_bu_done' },
            { type: 'feed', tag: '江湖', text: '瓜洲布行点了货，一匹不少。这趟布匹的镖走完了。' }
          ] },
        { if: { flag: 'zb_tax_name', notFlag: 'zb_bu_done' },
          text: '朝奉听到你亮了威远镖局的名号，笑着点了货：「赵老镖头的面子，谁不买？布匹一件不少。」',
          do: [
            { type: 'jobDone', id: 'zb_bu' },
            { type: 'flag', flag: 'zb_bu_done' },
            { type: 'feed', tag: '江湖', text: '瓜洲布行点了货。威远镖局的名号，瓜洲人都知道。' }
          ] },
        { if: { flag: 'zb_tax_route', notFlag: 'zb_bu_done' },
          text: '朝奉看了一眼天色：「走了小路？布倒是没湿——就是镖期怕是误了。不过威远的名头在，货到了就算数。」',
          do: [
            { type: 'jobDone', id: 'zb_bu' },
            { type: 'flag', flag: 'zb_bu_done' },
            { type: 'feed', tag: '江湖', text: '你走小路把布匹送到了瓜洲布行，镖期擦边赶上了。' }
          ] },
        { text: '朝奉开始点布匹。' }
      ],
      交谈: [
        { if: { flag: 'zb_tax_paid' },
          text: '朝奉点了布匹，一匹不少。「威远镖局的货，从来不用操心。」他在镖单上按了手印，「下回还走你们家的镖。」' },
        { if: { flag: 'zb_tax_name' },
          text: '朝奉听到你亮了威远镖局的名号，笑着点了货：「赵老镖头的面子，谁不买？布匹一件不少。」' },
        { if: { flag: 'zb_tax_route' },
          text: '朝奉看了一眼天色：「走了小路？布倒是没湿——就是镖期怕是误了。不过威远的名头在，货到了就算数。」' },
        { text: '朝奉开始点布匹。' }
      ]
    }
  },
  {
    id: 'jb_zhang', name: '百草堂张掌柜', ini: '张', tone: 'jade', brief: '验着药材',
    look: '精瘦的老者，鼻尖灵敏，一闻就知道药材的产地和年份。验货极仔细，一根参须都不放过。',
    at: { room: 'zj_shi', if: { job: 'zb_yao' } },
    verbs: ['交谈', '观察'],
    actions: {
      交谈: [{ text: '「威远镖局的药材，走的是川陕的货。」张掌柜打开一盒老参闻了闻，「嗯，正货。」' }]
    }
  },
  {
    id: 'jb_yinhao', name: '银号朝奉', ini: '银', tone: 'blue', brief: '等着点银',
    look: '穿着缎面马褂的中年人，手里一杆戥子，称银子的精确到了厘。腰板笔直，不多说一个字。',
    at: { room: 'zj_shi', if: { job: 'zb_yin' } },
    verbs: ['交谈', '观察', '交银'],
    actions: {
      交谈: [{ text: '朝奉把戥子擦了又擦：「三百两，一两都不能差。点了数，写了回执，这趟才算完。」' }],
      交银: [
        { if: { flag: 'zb_yin_sent', notFlag: 'zb_yin_out' },
          text: '朝奉点了银两，一锭不少，写了回执交给你：「威远镖局的信誉，银号信得过。」',
          do: [
            { type: 'jobDone', id: 'zb_yin' },
            { type: 'flag', flag: 'zb_yin_out' },
            { type: 'feed', tag: '江湖', text: '三百两官银安全送到了镇江银号。' }
          ] },
        { if: { flag: 'zb_yin_open', notFlag: 'zb_yin_out' },
          text: '朝奉打开银箱，脸色一变——银子上头压着几包不明包裹。他看了你一眼，什么都没说，写了回执。',
          do: [
            { type: 'jobDone', id: 'zb_yin' },
            { type: 'flag', flag: 'zb_yin_out' },
            { type: 'feed', tag: '江湖', text: '你把官银送到了银号。银箱里夹带的私货，朝奉看见了但没说。' }
          ], },
        { text: '朝奉拨着算盘等银子上门。' }
      ]
    }
  }
];

const JIE: FoeDef = {
  id: 'zb_jie_fei', name: '断云虎', title: '镇江道上劫镖的独行者', ini: '断', tone: 'red',
  weapon: '厚背鬼头刀', ws: '刀', tag: '劫镖',
  rank: 2, build: 'outer',
  firstTell: 2,
  moves: ['开山断岳', '横扫千军', '虎尾绞龙', '劈面藏花'],
  flourish: ['厚背鬼头刀带着风声劈下来', '刀锋在月光下一闪', '他咬着牙，刀势不减速', '一脚踏碎了路旁的石子'],
  tells: [
    { name: '断山劈', text: '断云虎双手握刀高举过头，全身的力气灌进刀刃，劈下来带着风雷之音……', dom: 'li', after: '厚背刀砸在地上，碎石迸飞！' },
    { name: '回风扫叶', text: '断云虎刀交左手，借着转身的势头横扫一记，又低又狠……', dom: 'su', after: '刀锋掠过小腿，衣角被削掉了一截！' }
  ],
  asides: ['老蔡把镖车往后拉了拉，抄起了扁担。', '路旁的乌鸦被惊起来，呱呱地飞远了。'],
  opening: ['把刀往手心吐了口唾沫', '活动着脖子', '从腰间扯下布条缠紧刀柄'],
  intro: '断云虎把厚背鬼头刀横在胸前：「威远镖局？好大的名头。老子截的就是威远的镖。」',
  win: '断云虎的鬼头刀被磕飞出去，插在路旁的泥地里。他踉跄着退了两步，靠在一棵老槐树上直喘。',
  lose: '厚背鬼头刀的刀背重重拍在你肩上，你单膝跪地。断云虎一脚踢开镖车上的油布：「药材？老子要的是银子。」',
  prep: [{
    if: { shenfen: 'biaoshi' },
    ally: { name: '老蔡', share: 0.2, at: [4, 10],
      say: ['老蔡把扁担抡圆了往断云虎腰上砸，扁担和鬼头刀磕在一起叮当响。', '老蔡一记扫膛腿绊过去，趁势用扁担头戳断云虎的肋下。', '老蔡大喊一声威远镖局的号子，扁担抡得更欢了。'] },
    text: '老蔡把镖车拉到路边，抄起扁担站到你身旁：「走了二十年镖，头一回见断云虎亲自出手——小心！」',
    story: '老蔡抄起扁担掠阵，二十年的老镖师不是白当的。'
  }],
  results: {
    lose: { tag: '劫镖 · 负', title: '药材被截', button: '回镖局复命',
      story: '你眼睁睁看着断云虎的人把药材一箱箱搬走。老蔡蹲在路边，一句话不说。这趟镖，丢了。',
      do: [{ type: 'jobFail', id: 'zb_yao' }, { type: 'flag', flag: 'zb_yao_lost' }] },
    flee: { tag: '劫镖', title: '且战且退', button: '撤',
      story: '你护着镖车退回了岔路口。断云虎没有追——他只要镖，不要命。老蔡擦了把汗：「回头多叫几个弟兄再来。」',
      do: [{ type: 'jobFail', id: 'zb_yao' }] },
    win: { tag: '劫镖 · 胜', title: '药材保全', button: '继续赶路',
      story: '断云虎的鬼头刀被磕飞出去，插在路旁的泥地里。他踉跄着退了两步，靠在一棵老槐树上直喘。老蔡把镖车赶了过来。',
      do: [{ type: 'jobDone', id: 'zb_yao' }],
      after: {
        plea: '断云虎靠在老槐树上，喘着粗气：「威远镖局……名不虚传。老子独来独往惯了，今日栽得不冤。」',
        opts: [
          { label: '放他走', sub: '独行者，不赶尽杀绝',
            say: '你收了剑：「滚。别再打威远的镖。」他抱拳，一瘸一拐地消失在了道旁的林子里。',
            do: [{ type: 'flag', flag: 'zb_jie_fang' }],
            later: '镇江道上再没见过断云虎——听说他去投了一支漕运护卫队。' },
          { label: '送他去见官', sub: '劫镖有据',
            say: '你让老蔡把他捆了。断云虎没有反抗，只说了一句：「威远的镖，从此没人敢截。」',
            do: [
              { type: 'flag', flag: 'zb_jie_guan' }, { type: 'flag', flag: 'zb_jie_gone' },
              { type: 'xia', delta: 1 },
              { type: 'feed', tag: '江湖', text: '劫镖的断云虎被你送去了府衙，镇江道上太平了。' }
            ],
            later: '断云虎被判了两年苦役。镇江道上的行商都松了口气。' },
          { label: '问他为什么劫镖', sub: '听他说',
            say: '你蹲在他面前。断云虎沉默了半晌：「漕帮垄断了运河，断了咱们的生计。我不劫道，兄弟们吃什么？」',
            do: [
              { type: 'flag', flag: 'zb_jie_wen' }, { type: 'lilian', amount: 30 },
              { type: 'feed', tag: '江湖', text: '断云虎说，是漕帮垄断运河断了他的生计。' }
            ],
            later: '断云虎的话你记在了心里——漕帮垄断河道，断的不止一个人的路。' }
        ]
      } }
  }
};

const JOBS: JobDef[] = [
  { id: 'zb_bu', shenfen: 'biaoshi', tier: 1, title: '保一车细布去瓜洲布行，路上有关卡', npc: 'zb_zhaofeng', at: 'gz_town', days: 2 },
  { id: 'zb_yao', shenfen: 'biaoshi', tier: 2, title: '押一批川贝老参去镇江百草堂，路上有劫镖的', npc: 'jb_zhang', at: 'zj_shi', days: 3, again: 5 },
  { id: 'zb_yin', shenfen: 'biaoshi', tier: 3, title: '押官银三百两去镇江银号，托镖的人要你亲手交', npc: 'jb_yinhao', at: 'zj_shi', days: 5, k: 1.5 }
];

const NEWS: NewsDef[] = [
  { if: { flag: 'zb_tax_paid' }, text: '蜀冈官道的关卡税吏吴开，近来收打点钱收得更加理直气壮了。' },
  { if: { flag: 'zb_tax_name' }, text: '有人亮了威远镖局的名号过关卡，税吏吴开破例放了行——赵老镖头的面子，比三十文值钱。' },
  { if: { flag: 'zb_tax_route' }, text: '有镖车走了蜀冈西麓的小路，绕过了关卡，多跑了半个时辰但省了三十文。' },
  { if: { flag: 'zb_yao_done' }, text: '镇江百草堂新进了一批川贝老参，掌柜的说威远镖局这趟走得好，断云虎都拦不住。' },
  { if: { flag: 'zb_yao_lost' }, text: '威远镖局一批药材在镇江道上叫人截了。断云虎的名字，在漕运线上响了一分。' },
  { if: { flag: 'zb_jie_fang' }, text: '镇江道上再没见过断云虎——听说他去投了一支漕运护卫队，刀法正用在了正道上。' },
  { if: { flag: 'zb_jie_guan' }, text: '劫镖的断云虎被送去了府衙，判了两年苦役。镇江道上的行商都松了口气。' },
  { if: { flag: 'zb_jie_wen' }, text: '断云虎说漕帮垄断了运河断了生计。这话有人信，也有人说他是给自己的刀找借口。' },
  { if: { flag: 'zb_yin_sent' }, text: '镇江银号收到了三百两官银，银号的朝奉说，押镖的年轻人办事稳妥。' },
  { if: { flag: 'zb_yin_open' }, text: '威远镖局的镖车在半路叫人打开过——里头夹带的私货，据说不少。' },
  { if: { flag: 'zb_yin_refuse' }, text: '威远镖局有一趟官银的镖，镖师半路撂挑子不走了。程先生的账本上，第一次写了「亏」。' },
  { if: { flag: 'zb_jie_gone' }, text: '镇江道上劫镖的断云虎叫人送去了府衙。江湖人说，这号独狼，关不了太久。' }
];

const pack: ContentPack = {
  npcs: NPCS,
  foes: [JIE],
  jobs: JOBS,
  news: NEWS,
  items: [
    { id: 'zb_huadiao', name: '花雕', desc: '陈年花雕，泥封上的红纸写着「百年陈酿」。' }
  ]
};
export default pack;
