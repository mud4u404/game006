import type { ContentPack, Effect, FightResult, FoeDef, NpcDef, RoomDef } from '../types';

/**
 * 缉拿草上飞的后半段：茱萸湾的线索、夜里的破船、拿人还是放人。
 * 前半段（周捕头、告示、揭榜）在 fuya.ts。任务阶段：0 拿到线索 → 1 追查行踪 → 2 押回府衙 → 3 完。
 */

const Q = 'side_caoshangfei';
const NIGHT = { from: 19, to: 5 };

const ROOMS: RoomDef[] = [
  {
    id: 'zhuyuwan', name: '茱萸湾', area: '扬州 · 运河', region: 'yz', t: 20, map: [90, 26],
    desc: '运河在这里拐了个大弯，岸边一片芦苇荡，十几户渔家的矮屋挤在堤下。网晾在竹竿上，滴着水。芦苇深处歪着一条破船，船篷塌了半边。',
    npcs: ['zy_yuweng', { id: 'zy_csf', if: { quest: { id: Q, is: 1 }, flag: 'csf_clue2', hour: NIGHT } }],
    exits: [['西南', 'dukou', '东北']],
    road: '你沿着运河堤岸往东北走，柳树渐稀，芦苇渐密，风里有了鱼腥味……'
  }
];

const CAUGHT: Effect[] = [
  { type: 'flag', flag: 'csf_caught' }, { type: 'quest', id: Q, stage: 2 },
  { type: 'feed', tag: '江湖', text: '你在茱萸湾拿住了草上飞，该押回府衙交差了。' }
];

const NPCS: NpcDef[] = [
  {
    id: 'zy_yuweng', name: '渔家老汉', ini: '渔', tone: 'blue', brief: '蹲在堤上补网',
    look: '六十来岁，背驼得厉害，一双手泡得发白。补网的梭子在他指间翻飞，眼睛却时不时往芦苇荡那边瞟。',
    verbs: ['交谈', '观察'],
    actions: {
      交谈: [
        { if: { flag: 'csf_freed' }, text: '老汉往你手里塞了两尾刚打上来的鲫鱼，什么也没说，转身又去补网了。' },
        { if: { flag: 'csf_caught' }, text: '老汉看了你一眼，把网往怀里拢了拢：「官爷的事，小老儿不懂。」' },
        { if: { quest: { id: Q, is: 1 } },
          text: '老汉手里的梭子停了停：「缺指头的后生？前几夜是有一个，半夜敲门买干粮，四根指头捏着钱。」他往芦苇深处那条破船努了努嘴：「白天不见人，天黑了才点灯。」顿了顿，又压低声音：「客官……今年发大水，村里断粮那阵，有人夜里往各家门槛下塞碎银子。小老儿只说这么多。」',
          do: [{ type: 'flag', flag: 'csf_clue2' }, { type: 'feed', tag: '江湖', text: '渔家老汉说，缺指的汉子藏在茱萸湾芦苇荡的破船里，天黑才点灯。' }] },
        { text: '「这几年运河上的船多了，鱼倒少了。」老汉叹了口气，低头接着补网。' }
      ]
    }
  },
  {
    id: 'zy_csf', name: '破船里的汉子', altName: { if: { flag: 'csf_talked' }, name: '草上飞' }, ini: '飞', tone: 'red', brief: '就着油灯啃干粮',
    look: '三十上下，短打扮，腿上绑着绑腿，脚边放一对飞爪。左手搭在膝上，小指齐根断了。听见你的脚步，他手里的干粮停在半空。',
    verbs: ['交谈', '观察', '动手', { verb: '放他走', if: { flag: 'csf_talked' } }],
    actions: {
      交谈: [
        { if: { flag: 'csf_talked' }, text: '草上飞把飞爪往脚边一推：「要拿就拿，草上飞认了。只求你别去村里搜银子。」' },
        { text: '汉子盯着你看了半晌，忽然笑了：「府衙请来的？」他把干粮往船板上一放：「盐商刘家那三百两，是我拿的。拿去一百两，买了米，塞进了这村子的门槛底下；剩下的，还压在刘家的地窖里，我没动。」他伸出那只缺了小指的手：「这根指头，是当年给刘家扛盐包，被压断的。」',
          do: [{ type: 'flag', flag: 'csf_talked' }] }
      ],
      动手: [{ text: '你按剑上前，舱里的油灯晃了一晃。', do: [{ type: 'fight', foe: 'zy_csf' }] }],
      放他走: [{ text: '你侧身让开船头。草上飞怔了一怔，抓起飞爪，抱拳道：「这份情，草上飞记下了。」话音未落，人已没入芦苇荡，只剩苇叶沙沙作响。',
        do: [{ type: 'flag', flag: 'csf_freed' }, { type: 'quest', id: Q, stage: 3 }, { type: 'xia', delta: 10 },
          { type: 'feed', tag: '江湖', text: '你在茱萸湾放走了草上飞。这件事，回府衙怎么说，你还没想好。' }] }]
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
    nature: '柔', reach: '长', hp: 1600, atk: [30, 46], big: 120, firstTell: 2,
    moves: ['燕子穿帘', '凌空探爪', '草上飞', '旱地拔葱'],
    flourish: ['飞爪一抖，斜斜抓来', '身子贴着船板滑开', '足尖在船舷上一点', '飞爪绕着桅杆一荡'],
    tells: [
      { name: '双爪锁喉', text: '草上飞退到船尾，两只飞爪在手里越转越快……', pw: { li: 20, su: 35, qiao: 30, xi: 25 }, after: '飞爪擦着船篷飞过，带下一大片苇席。' },
      { name: '踏苇而行', text: '草上飞纵身跃上芦苇梢头，竟在苇叶上站住了……', pw: { li: 15, su: 45, qiao: 25, xi: 30 }, after: '苇梢一弯一弹，他人已到了你身后。' },
      { name: '断指一击', text: '草上飞忽然欺近，缺了小指的左手化掌为刀……', pw: { li: 35, su: 25, qiao: 30, xi: 20 }, after: '掌风扫过，船舷上的油灯应声而灭。' }
    ],
    asides: ['芦苇荡里惊起一群水鸟。', '远处渔家的窗户亮了一亮，又熄了。', '破船吱呀作响，船底渗进水来。'],
    opening: ['飞爪收得慢了', '落脚处船板一滑', '换气时露了空门', '回身稍迟'],
    intro: '草上飞抄起飞爪，身子往后一仰，人已站上了船篷：「想拿我？先追得上再说。」',
    win: '你一剑挑飞了他的飞爪，剑尖抵住他的咽喉。草上飞喘着粗气，慢慢松开了拳头。',
    lose: '你一脚踏空，栽进冰冷的河水里。等你爬上船，只听见芦苇荡里一声唿哨，越去越远。',
    results: {
      win: { tag: '缉拿 · 胜', title: '拿住草上飞', button: '押着他上路',
        story: '你用他自己的绳索把他捆了个结实。草上飞一路没有讨饶，走到堤上时，回头看了一眼那排低矮的渔家，什么也没说。',
        do: [...CAUGHT, { type: 'prof', skill: 'hanjiang', amount: 60 }] },
      lose: LOST,
      flee: LOST
    }
  }
];

const pack: ContentPack = { rooms: ROOMS, npcs: NPCS, foes: FOES };
export default pack;
