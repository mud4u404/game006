import type { Cond, ContentPack, Effect, FightResult, FoeDef, NewsDef, NpcDef, RoomDef } from '../types';

/**
 * 缉拿草上飞的后半段（前半段：周捕头、告示、揭榜，在 fuya.ts）。
 *
 * 人物与动机：
 * - 草上飞：当年给盐商刘家扛盐包，左手小指被压断，刘家一文没赔。今年运河发大水，茱萸湾断粮，
 *   他夜入刘家劫银三百两，一百两换了米、悄悄塞进各家门槛底下，余下二百两藏在苇荡里，打算入冬再分。
 * - 刘家账房：刘家咬定贼人熟门熟路，是账房里应外合，把他告进了府衙大牢。他是冤枉的。
 * - 渔家老汉：村里受了草上飞的恩，对官差提防得紧；孙子在咳嗽。
 * - 周捕头：要交差，也看得见案子里的人。
 *
 * 两难：拿下草上飞，账房出狱，可茱萸湾的人从此把你当官府的鹰犬；放走他，账房就得替他坐牢。
 * 第三条路：先去牢里见过账房，知道有人替他受罪，再凭侠义或胆魄劝他自首。
 *
 * 线索两条路：帮渔家老汉一把，他才肯开口；悟性够的人，自己细看破船也看得出来。
 * 任务阶段：0 拿到线索 → 1 追查行踪 → 2 押回（或陪他回）府衙 → 3 完。
 */

const Q = 'side_caoshangfei';
const NIGHT = { from: 19, to: 5 };
const HUNTING: Cond = { quest: { id: Q, is: 1 } };

const ROOMS: RoomDef[] = [
  {
    id: 'zhuyuwan', name: '茱萸湾', area: '扬州 · 运河', region: 'yz', t: 20, map: [90, 26],
    desc: '运河在这里拐了个大弯，岸边一片芦苇荡，十几户渔家的矮屋挤在堤下，墙上还留着齐腰高的水痕。网晾在竹竿上，滴着水。芦苇深处歪着一条破船，船篷塌了半边。',
    npcs: ['zy_yuweng', { id: 'zy_csf', if: { ...HUNTING, flag: 'csf_clue2', hour: NIGHT } }],
    objs: ['zy_poshuan'],
    exits: [['西南', 'dukou', '东北']],
    road: '你沿着运河堤岸往东北走，柳树渐稀，芦苇渐密，风里有了鱼腥味……'
  }
];

const FOUND: Effect[] = [
  { type: 'flag', flag: 'csf_clue2' },
  { type: 'feed', tag: '江湖', text: '茱萸湾芦苇荡里的破船上，这几天有人落脚。白天不见人，要等天黑。' }
];

/** 劝得动草上飞：侠义够，或者胆魄够 */
const PERSUADE: Cond = { any: [{ xia: 10 }, { attr: { key: '胆魄', atLeast: 26 } }] };

const NPCS: NpcDef[] = [
  {
    id: 'zy_yuweng', name: '渔家老汉', ini: '渔', tone: 'blue', brief: '蹲在堤上补网',
    look: '六十来岁，背驼得厉害，一双手泡得发白。补网的梭子在他指间翻飞，眼睛却时不时往芦苇荡那边瞟。',
    verbs: ['交谈', '观察', { verb: '买鱼', if: { notFlag: 'csf_yuweng_trust' } }],
    actions: {
      观察: [
        { if: HUNTING, text: '矮屋里传出孩子的咳嗽声，一声接着一声。老汉手上的梭子停了停，又接着补。' },
        { text: '堤下的矮屋门口晾着几串小鱼干，墙上的水痕齐腰高，是今年夏天留下的。' }
      ],
      买鱼: [
        { if: { silver: 30 },
          text: '你挑了两尾鲫鱼，放下三十文——足够买一篓。老汉要找钱，你摆摆手，把鱼推了回去：「给屋里的孩子熬碗汤。」老汉捏着那几十个铜板，半晌没说话。',
          do: [{ type: 'silver', delta: -30 }, { type: 'flag', flag: 'csf_yuweng_trust' }, { type: 'rel', npc: 'zy_yuweng', value: '点头之交', from: ['素不相识'], note: '茱萸湾的渔家，你给他孙子买过鱼' }] },
        { text: '你摸了摸钱袋，里头只剩几个铜板，只好讪讪地缩回手。' }
      ],
      交谈: [
        { if: { flag: 'csf_surrender' }, text: '老汉往你手里塞了两尾刚打上来的鲫鱼：「听说他是自己走进府衙的……周捕头还替他说了话。」他抹了把脸：「村里人都记着。」' },
        { if: { flag: 'csf_caught' }, text: '老汉看了你一眼，把网往怀里拢了拢：「官爷的事，小老儿不懂。」从此再没抬头。' },
        { if: { flag: 'csf_freed' }, text: '老汉什么也没说，只把一串鱼干挂在了你的行囊上。' },
        { if: { ...HUNTING, flag: 'csf_yuweng_trust' },
          text: '老汉朝屋里看了一眼，压低声音：「客官是好人，小老儿不瞒你。缺指头的后生，前几夜半夜敲门买干粮，四根指头捏着钱。他往苇荡里那条破船去了，白天不见人，天黑才点灯。」他顿了顿：「今年发大水，村里断粮那阵，有人夜里往各家门槛底下塞米……客官，你要拿他，小老儿拦不住；只求你别冤了好人。」',
          do: FOUND },
        { if: HUNTING, text: '「又是府衙的？」老汉头也不抬，「前两拨官差把村里翻了个底朝天，什么也没找着。小老儿眼花耳背，什么都不知道。」' },
        { text: '「这几年运河上的船多了，鱼倒少了。」老汉叹了口气，低头接着补网。' }
      ]
    }
  },
  {
    id: 'zy_poshuan', name: '破船', obj: true, icon: 'boat', brief: '歪在芦苇深处',
    look: '一条废弃的渔船，船篷塌了半边，船底积着雨水，苇叶从破洞里钻进来。',
    verbs: ['观察', '细看'],
    actions: {
      细看: [
        { if: { ...HUNTING, notFlag: 'csf_clue2', attr: { key: '悟性', atLeast: 23 } },
          text: '你蹲下细看：船舷上有几道新鲜的划痕，三道一组，像是铁爪抓出来的；舱底散着几粒干粮渣子，还没泡软。有人在这里落脚，就在这几天，而且白天不在。',
          do: FOUND },
        { if: { ...HUNTING, notFlag: 'csf_clue2' }, text: '你绕着破船看了一圈，只看见积水、烂苇席和几只受惊的螃蟹。要是有人在这里落脚，你也看不出来——或许该问问村里的人。' },
        { text: '船底的积水映着天光，几只螃蟹横着爬进了苇丛。' }
      ]
    }
  },
  {
    id: 'zy_zhangfang', name: '牢里的账房', ini: '账', tone: 'gray', brief: '扒着牢门喊冤', night: true,
    at: { room: 'yz_fuya', if: { quest: { id: Q, atLeast: 1 }, notFlag: 'csf_zhangfang_free' } },
    look: '五十来岁，瘦得颧骨突出，长衫皱成一团，袖口还沾着墨迹。他扒着后院牢门的木栅，嗓子已经喊哑了。',
    verbs: ['交谈', '观察'],
    actions: {
      交谈: [
        { if: { flag: 'csf_freed' }, text: '账房先生看见你，又扑到栅栏上：「少侠，贼拿着了没有？」你张了张嘴，什么也没说出来。他慢慢滑坐到地上：「三天又三天……」' },
        { text: '账房先生扒着栅栏：「冤枉啊！刘老爷说贼人熟门熟路，必是我里应外合……我在刘家记了二十年的账，一个铜板都没错过！」他喘了口气，又道：「那贼左手缺个小指头？……五年前，有个扛盐包的脚夫，指头被压断了，刘老爷一文没赔，把人赶了出去。我记过那笔账——一文没赔，记的是一文没赔。」',
          do: [{ type: 'flag', flag: 'csf_knows_zhangfang' }, { type: 'feed', tag: '江湖', text: '刘家的账房先生被当成内应，关在府衙大牢里喊冤。他说，五年前有个扛盐包的脚夫被压断了小指。' }] }
      ]
    }
  },
  {
    id: 'zy_csf', name: '破船里的汉子', altName: { if: { flag: 'csf_talked' }, name: '草上飞' }, ini: '飞', tone: 'red', brief: '就着油灯啃干粮',
    look: '三十上下，短打扮，腿上绑着绑腿，脚边放一对飞爪。左手搭在膝上，小指齐根断了，断口的疤已经发白。听见你的脚步，他手里的干粮停在半空。',
    verbs: ['交谈', '观察', '动手',
      { verb: '劝他自首', if: { flag: 'csf_talked', any: [{ flag: 'csf_knows_zhangfang' }] } },
      { verb: '放他走', if: { flag: 'csf_talked' } }],
    actions: {
      交谈: [
        { if: { flag: 'csf_talked' }, text: '草上飞把飞爪往脚边一推：「要拿就拿，草上飞认了。只求你别去村里搜，那些米，是我欠他们的。」' },
        { text: '汉子盯着你看了半晌，忽然笑了：「府衙请来的？」他把干粮往船板上一放：「刘家那三百两，是我拿的。一百两换了米，塞进了这村子的门槛底下；剩下二百两，埋在苇荡里，原想入冬再分。」他伸出那只缺了小指的手：「这根指头，是五年前给刘家扛盐包压断的。刘老爷说，脚夫的指头不值钱。」',
          do: [{ type: 'flag', flag: 'csf_talked' }] }
      ],
      动手: [{ text: '你按剑上前，舱里的油灯晃了一晃。', do: [{ type: 'fight', foe: 'zy_csf' }] }],
      劝他自首: [
        { if: PERSUADE,
          text: '你把牢里那位账房先生的话原原本本说了。草上飞的脸色一点点白下去：「……他替我坐牢？」他沉默了很久，久到油灯结了一朵灯花。然后他站起来，把飞爪留在船板上：「走吧。苇荡里的二百两，我带你们去挖。」',
          do: [{ type: 'flag', flag: 'csf_surrender' }, { type: 'quest', id: Q, stage: 2 },
            { type: 'feed', tag: '江湖', text: '草上飞答应自首，跟你回扬州府衙。' }] },
        { text: '你把账房先生的事说了。草上飞冷笑一声：「刘家的人，坐几天牢又怎样？」他盯着你：「你凭什么让我信你，信那府衙？」话不投机，他的手已经摸上了飞爪。' }
      ],
      放他走: [{ text: '你侧身让开船头。草上飞怔了一怔，抓起飞爪，抱拳道：「这份情，草上飞记下了。」话音未落，人已没入芦苇荡，只剩苇叶沙沙作响。',
        do: [{ type: 'flag', flag: 'csf_freed' }, { type: 'quest', id: Q, stage: 3 }, { type: 'xia', delta: 5 },
          { type: 'feed', tag: '江湖', text: '你在茱萸湾放走了草上飞。刘家那桩案子，总得有人来担。' }] }]
    }
  }
];

const LOST: FightResult = {
  tag: '缉拿', title: '人去船空', button: '回到茱萸湾',
  story: '等你稳住身形，破船里只剩一盏晃荡的油灯。芦苇荡深处传来一声唿哨，越去越远。他走得匆忙，干粮都没带——明晚，他多半还得回来。',
  do: [{ type: 'heal', hpAtLeast: 0.3 }, { type: 'feed', tag: '江湖', text: '草上飞从你手底下溜了，不过他的干粮还在船上。' }]
};

const FOES: FoeDef[] = [
  {
    id: 'zy_csf', name: '草上飞', title: '江洋大盗', ini: '飞', tone: 'red', weapon: '飞爪', ws: '爪', tag: '缉拿',
    nature: '柔', reach: '长', rank: 0.3, build: 'light', firstTell: 2,
    moves: ['燕子穿帘', '凌空探爪', '草上飞', '旱地拔葱'],
    flourish: ['飞爪一抖，斜斜抓来', '身子贴着船板滑开', '足尖在船舷上一点', '飞爪绕着桅杆一荡'],
    tells: [
      { name: '双爪锁喉', text: '草上飞退到船尾，两只飞爪在手里越转越快……', dom: 'su', after: '飞爪擦着船篷飞过，带下一大片苇席。' },
      { name: '踏苇而行', text: '草上飞纵身跃上芦苇梢头，竟在苇叶上站住了……', dom: 'su', after: '苇梢一弯一弹，他人已到了你身后。' },
      { name: '断指一击', text: '草上飞忽然欺近，缺了小指的左手化掌为刀……', dom: 'li', after: '掌风扫过，船舷上的油灯应声而灭。' }
    ],
    asides: ['芦苇荡里惊起一群水鸟。', '远处渔家的窗户亮了一亮，又熄了。', '破船吱呀作响，船底渗进水来。'],
    opening: ['飞爪收得慢了', '落脚处船板一滑', '换气时露了空门', '回身稍迟'],
    intro: '草上飞抄起飞爪，身子往后一仰，人已站上了船篷：「想拿我？先追得上再说。」',
    win: '你一剑挑飞了他的飞爪，剑尖抵住他的咽喉。草上飞喘着粗气，慢慢松开了拳头。',
    lose: '你一脚踏空，栽进冰冷的河水里。等你爬上船，只听见芦苇荡里一声唿哨，越去越远。',
    results: {
      win: { tag: '缉拿 · 胜', title: '拿住草上飞', button: '押着他上路',
        story: '你用他自己的绳索把他捆了个结实。草上飞一路没有讨饶，走到堤上时，回头看了一眼那排墙上留着水痕的矮屋，什么也没说。',
        do: [{ type: 'flag', flag: 'csf_caught' }, { type: 'quest', id: Q, stage: 2 }, { type: 'prof', skill: 'hanjiang', amount: 60 },
          { type: 'feed', tag: '江湖', text: '你在茱萸湾拿住了草上飞，该押回府衙交差了。' }] },
      lose: LOST,
      flee: LOST
    }
  }
];

const NEWS: NewsDef[] = [
  { if: { flag: 'csf_caught' }, text: '府衙拿住了草上飞。刘家账房出狱那天，在府衙门口磕了三个头。茱萸湾的渔家，几天没人出船。' },
  { if: { flag: 'csf_surrender' }, text: '听说草上飞是自己走进府衙的。周捕头递了文书，说他劫的银子大半济了茱萸湾的灾民。' },
  { if: { flag: 'csf_freed' }, text: '刘家的账房先生还关在府衙大牢里。有人说，草上飞早出了扬州地界。' }
];

const pack: ContentPack = { rooms: ROOMS, npcs: NPCS, foes: FOES, news: NEWS };
export default pack;
