import type { ContentPack, FoeDef, QuestDef, StoryDef } from '../types';

/** 序章「瓜洲夜雨」的剧情卡片，流程见 docs/story.md 第三节 */

const STORIES: StoryDef[] = [
  { id: 'p_open', cards: [
    { tag: '序章 · 瓜洲夜雨', title: '童年三忆',
      paras: ['江伯说，人这一辈子，记得住的事不多。', '你记得的，有这么三件。'],
      choices: [{ label: '回想' }] },
    { tag: '七岁', title: '风浪',
      paras: ['那年江伯第一次带你出船。船到江心，天色骤变，浪头一个接一个打上船帮。', '江伯在船尾掌舵，回头冲你喊了一句什么。风太大，你没听清。'],
      choices: [
        { label: '死死抱住桅杆', sub: '体魄 +3　根骨 +2', do: [{ type: 'attr', key: '体魄', delta: 3 }, { type: 'attr', key: '根骨', delta: 2 }],
          result: '你抱着桅杆，任凭浪头一次次打在身上，一声没吭。上岸后江伯摸着你的头说：「是块练武的料子，扛得住。」' },
        { label: '学着江伯的样子撑篙', sub: '身法 +3　踏雪无痕熟练 +50', do: [{ type: 'attr', key: '身法', delta: 3 }, { type: 'prof', skill: 'taxue', amount: 50 }],
          result: '你在摇晃的船头站稳了脚，一篙一篙撑得有模有样。江伯看了你半天，没说话，只是那天晚上多给你盛了一碗鱼汤。' },
        { label: '盯着浪头，默数它的节奏', sub: '悟性 +3', do: [{ type: 'attr', key: '悟性', delta: 3 }],
          result: '三个大浪之后，必有一个小浪。你喊出来的时候，江伯愣了一下，随即顺着那个空当，把船稳稳地带出了风口。' }
      ] },
    { tag: '十二岁', title: '恶少',
      paras: ['镇上王家的少爷带着几个家丁，踢翻了卖鱼阿婆的鱼篮，还要她跪下来一条一条捡。', '围观的人不少，没有一个上前。'],
      choices: [
        { label: '抡起扁担冲上去', sub: '胆魄 +4', do: [{ type: 'attr', key: '胆魄', delta: 4 }, { type: 'flag', flag: 'mem2_pole' }],
          result: '你被家丁按在地上揍了一顿，可那少爷的脑门上，也挨了你结结实实一扁担。' },
        { label: '绕到后面绊他一跤', sub: '身法 +1　悟性 +2', do: [{ type: 'attr', key: '身法', delta: 1 }, { type: 'attr', key: '悟性', delta: 2 }, { type: 'flag', flag: 'mem2_trip' }],
          result: '恶少摔了个狗啃泥，回头找人时，你早已钻进了人堆。' },
        { label: '去叫来巡检，当面对质', sub: '根骨 +2　侠义 +5　结识周巡检', do: [{ type: 'attr', key: '根骨', delta: 2 }, { type: 'xia', delta: 5 }, { type: 'flag', flag: 'mem2_patrol' }],
          result: '姓周的巡检秉公断了案，王家赔了阿婆一篮鱼钱。临走时，他记下了你的名字。' }
      ] },
    { tag: '十六岁', title: '剑光',
      paras: ['一个雨夜，你起身解手，看见江伯独自站在江边。', '他手里握着一柄你从没见过的长剑。剑光起落之间，雨幕像被什么东西生生斩开，又在他身后合拢。'],
      choices: [
        { label: '躲在暗处偷学', sub: '悟性 +2　寒江剑法熟练 +80', do: [{ type: 'attr', key: '悟性', delta: 2 }, { type: 'prof', skill: 'hanjiang', amount: 80 }],
          result: '你记下了七八式，回去在床上比划了一夜。第二天江伯看你的眼神有些古怪，却什么也没说。' },
        { label: '走出去，求他教你', sub: '胆魄 +2　寒江剑法熟练 +40', do: [{ type: 'attr', key: '胆魄', delta: 2 }, { type: 'prof', skill: 'hanjiang', amount: 40 }, { type: 'flag', flag: 'mem3_ask' }],
          result: '江伯沉默了很久，才道：「这剑法，本不该由我来教你。」可从那以后，每个雨夜，他都会带你到江边。' },
        { label: '回屋彻夜难眠，跟着他的呼吸打坐', sub: '根骨 +2　寒江心法熟练 +80', do: [{ type: 'attr', key: '根骨', delta: 2 }, { type: 'prof', skill: 'xinfa', amount: 80 }],
          result: '不知过了多久，你觉得小腹里升起一缕暖意，顺着脊背缓缓流转。天亮时，你一点也不觉得困。' }
      ] },
    { tag: '名字', title: '你叫什么名字', input: 'name',
      paras: ['江伯说，你本姓沈。', '至于名字——'],
      choices: [{ label: '就叫这个名字' }] },
    { tag: '序章 · 瓜洲夜雨', title: '三月初五 · 瓜洲渡',
      paras: ['你在瓜洲渡口长大，跟着江伯打鱼、撑船，偶尔替人送货过江。', '江伯这些日子咳得厉害，人也瘦了一圈。', '今天，天阴得很低。'],
      choices: [{ label: '回到小屋', next: -1 }] }
  ] },

  { id: 'p_night', cards: [
    { tag: '序章', title: '夜雨',
      paras: ['你推开虚掩的门——屋里一片狼藉。', '箱笼被翻了个底朝天，江伯倒在床边，嘴角挂着血。三个黑衣人正举着火折子四处搜寻。', '见你进来，离你最近的那个一言不发，拔出短刀便扑了上来！'],
      choices: [{ label: '拔剑迎敌', do: [{ type: 'fight', foe: 'heiyi' }], next: -1 }] }
  ] },

  { id: 'p_after1', cards: [
    { tag: '序章', title: '雁翎刀',
      paras: ['黑衣人栽倒在地，再也没有起来。', '你还没喘过气，屋梁上又落下一道黑影。这人身形高大，手提一柄雁翎刀，另外两个黑衣人立刻护到他身后。', '「小崽子，」他冷冷道，「把东西交出来。」'],
      choices: [{ label: '握紧长剑', do: [{ type: 'fight', foe: 'heiyi2' }], next: -1 }] }
  ] },

  { id: 'p_death', endChapter: { small: '第一回', big: '扬州' }, cards: [
    { tag: '序章', title: '江伯',
      paras: [
        '黑衣人走了。屋外的雨，下得正大。',
        '江伯靠在你怀里，气息越来越弱。他从怀里摸出半块用红绳系着的玉佩，又把一个油布包塞进你手里。',
        '「这一剑……叫断水……本该……由你爹……亲手教你……」',
        '「{given}……去扬州……大明寺……找了尘……」',
        '他攥紧你的手，用尽最后的力气：「别信……官府的人……」',
        '话音未落，那只手便垂了下去。'
      ],
      choices: [{ label: '江伯——' }] },
    { tag: '获得', title: '江伯的遗物',
      paras: ['玉佩上刻着一个「沈」字，还有半个「寒」字，断口参差，另一半不知在何处。', '油布包里是一页剑谱，墨迹被水洇开了一半，只认得出「断水」二字，和一式剑招的起手。'],
      gains: ['半块玉佩', '断水残页', '习得绝技「断水」· 初窥门径'],
      choices: [{ label: '掩埋江伯', do: [
        { type: 'item', id: 'jade', delta: 1 }, { type: 'item', id: 'scroll', delta: 1 }, { type: 'item', id: 'med', delta: -1 },
        { type: 'learn', skill: 'duanshui', realm: 0, prof: 10 }
      ] }] },
    { tag: '序章', title: '天明',
      paras: [
        '天亮时，雨停了。',
        '你在江边的老柳树下堆起一座新坟，磕了三个头。小屋烧成了一片焦土——火是你亲手点的，那些人还会回来。',
        '黑衣首领逃走时，掉下了一块铜牌，上面铸着一个「厂」字。你把它和玉佩收在了一起。',
        '码头上，一条去扬州的船正要起锚。'
      ],
      choices: [{ label: '登船 · 去扬州', next: -1, do: [
        { type: 'item', id: 'badge', delta: 1 },
        { type: 'quest', id: 'prologue', stage: 3 }, { type: 'chapter', value: 1 },
        { type: 'move', to: 'hu' }, { type: 'time', set: 9 * 60 + 20 }, { type: 'weather', value: '微雨' },
        { type: 'heal', hpAtLeast: 0.8, mp: 'full' },
        { type: 'rel', npc: 'jiangbo', value: '阴阳两隔' }, { type: 'rel', npc: 'liu', value: '素不相识' },
        { type: 'feedReset' },
        { type: 'feed', tag: '传闻', text: '城南的威远镖局正在招募镖师。' },
        { type: 'feed', tag: '传闻', text: '黑风寨劫了漕帮三船盐货，漕帮放出悬赏。' },
        { type: 'feed', tag: '主线', text: '江伯遗言：去扬州大明寺，找了尘大师。' },
        { type: 'quest', id: 'main1', stage: 0 }, { type: 'track', id: 'main1' }
      ] }] }
  ] }
];

const FOES: FoeDef[] = [
  { id: 'heiyi', name: '黑衣人', title: '夜行人', ini: '黑', tone: 'gray', weapon: '短刀', ws: '刀', tag: '序章',
    rank: 0, build: 'outer', weak: 0.25, script: 'cup', firstTell: 3,
    moves: ['毒蛇吐信', '反手撩阴', '横抹咽喉'],
    flourish: ['贴身疾刺', '反手一抹', '刀光一闪'],
    tells: [
      { name: '夺命三刀', text: '黑衣人压低身形，短刀反握，脚下悄无声息地绕向你左侧……', dom: 'su', after: '刀锋划破了窗纸。' }
    ],
    asides: ['雨水从破了的屋顶漏下来，滴在江伯脸上。', '窗外的雨越下越大。'],
    opening: ['刀势一老', '脚下一滑', '收刀时露了空门'],
    intro: '黑衣人一言不发，短刀已到胸前！',
    tips: ['战斗会自动进行，你来决定何时出招。内力够时，点「寒江孤影」。'],
    win: '黑衣人闷哼一声，栽倒在地，再也没有起来。',
    lose: '',
    results: { win: { silent: true, then: [{ type: 'story', id: 'p_after1' }] } } },

  { id: 'heiyi2', name: '黑衣首领', title: '腰悬铜牌', ini: '首', tone: 'red', weapon: '雁翎刀', ws: '刀', tag: '序章',
    rank: 2, script: 'rescue', firstTell: 2,
    moves: ['夜战八方', '雁落平沙', '斜劈华岳'],
    flourish: ['刀光如匹练', '挟着风雨横扫', '自上而下猛斩'],
    tells: [
      { name: '夜叉探海', text: '黑衣首领单手拖刀，刀尖在地上划出一串火星，猛地自下而上撩起……', dom: 'li', after: '桌椅被劈成了两半！' },
      { name: '鬼影迷踪', text: '黑衣首领身形一晃，竟在雨幕里拖出两道残影……', dom: 'su', after: '残影散去，墙上多了三道刀痕。' }
    ],
    asides: ['江伯倒在墙角，胸口微微起伏。', '屋顶漏下的雨水，顺着刀锋往下淌。', '另外两个黑衣人守在门口，一动不动。'],
    opening: ['刀势一老', '回刀稍慢', '用力过猛，身形一晃'],
    intro: '黑衣首领雁翎刀一摆：「小崽子，把东西交出来，留你全尸。」',
    tips: ['这人比刚才那个强得多。撑住！'],
    win: '',
    lose: '',
    results: { win: { silent: true, then: [{ type: 'story', id: 'p_death' }] } } }
];

const QUESTS: QuestDef[] = [
  { id: 'prologue', name: '序章 · 瓜洲夜雨', stages: [
    { title: '和江伯说说话', to: 'gz_home' },
    { title: '去镇上回春堂抓药', to: 'gz_town' },
    { title: '把药带回渡口小屋', to: 'gz_home' },
    { title: '序章 · 完' }
  ] }
];

const pack: ContentPack = { stories: STORIES, foes: FOES, quests: QUESTS };
export default pack;
