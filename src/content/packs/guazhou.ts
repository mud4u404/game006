import type { ContentPack, NpcDef, RoomDef } from '../types';

/** 序章 · 瓜洲夜雨 */

const NIGHT = { quest: { id: 'prologue', atLeast: 2 } };

const ROOMS: RoomDef[] = [
  { id: 'gz_home', name: '渡口小屋', area: '瓜洲渡', region: 'gz', t: 10, map: [24, 40],
    desc: [
      { if: NIGHT, text: '天已黑透，大雨倾盆。小屋的门虚掩着，屋里没有点灯，雨声里隐约传来翻箱倒柜的声音。' },
      { text: '江边一间低矮的木屋，屋檐下晾着渔网。屋里飘着草药味，江伯靠在床头，咳得一阵紧过一阵。' }
    ],
    npcs: [{ id: 'jiangbo', if: { quest: { id: 'prologue', below: 2 } } }],
    objs: [{ id: 'door', if: { quest: { id: 'prologue', is: 2 } } }],
    exits: [['东', 'gz_town']],
    road: [
      { if: NIGHT, text: '天色暗了下来，你揣着药往回赶，雨点开始噼啪落下……' },
      { text: '你沿着江堤走回小屋……' }
    ],
    onEnter: [{ if: { quest: { id: 'prologue', is: 2 } }, do: [{ type: 'story', id: 'p_night' }] }] },
  { id: 'gz_town', name: '瓜洲镇', area: '瓜洲 · 老街', region: 'gz', t: 0, map: [62, 40],
    desc: [
      { if: NIGHT, text: '天色暗了，老街上的铺子陆续上了门板。雨点打在青石板上，溅起一层白雾。' },
      { text: '青石老街不过百步长，鱼腥味混着药香。回春堂的门板卸了一半，茶摊上几个闲汉正就着花生说长道短。' }
    ],
    npcs: ['huichun', 'chatan', 'ayp'],
    exits: [['西', 'gz_home'], ['南', 'gz_pier']],
    road: '你沿着江堤往镇上走，风里带着雨意……' },
  { id: 'gz_pier', name: '瓜洲码头', area: '瓜洲渡', region: 'gz', t: 5, map: [62, 78],
    desc: '江面灰蒙蒙的，渔船都已归港。码头尽头泊着两条生船，船上的人不打鱼，只是不住地朝岸上张望。',
    npcs: ['shaogong'], objs: ['shengchuan'],
    exits: [['北', 'gz_town']],
    road: '你穿过老街，走到江边码头……' }
];

const NPCS: NpcDef[] = [
  { id: 'jiangbo', name: '江伯', ini: '江', tone: 'gray', brief: '咳个不停', hint: '养父',
    look: '江伯年过六旬，背却挺得笔直。右手虎口有一层厚茧——那不是撑篙磨出来的。',
    verbs: ['交谈', '观察', '请教'],
    actions: {
      交谈: [
        { if: { quest: { id: 'prologue', is: 0 } },
          text: '「咳咳……{given}，去镇上回春堂抓两副药，就说是老江的方子。」江伯顿了顿，望向窗外：「快去快回。看这天色，夜里要下大雨。」',
          do: [{ type: 'quest', id: 'prologue', stage: 1 }, { type: 'feed', tag: '主线', text: '江伯让你去镇上回春堂抓药。' }, { type: 'toast', text: '任务更新' }] },
        { text: '「去吧，回春堂的掌柜认得我。」' }
      ],
      请教: [{ text: '江伯摆摆手：「等我好些了，再陪你练。」他望着江面出神，像是在想很远的事。' }]
    } },
  { id: 'huichun', name: '回春堂掌柜', ini: '药', tone: 'jade', brief: '在柜台后碾药',
    look: '圆脸的中年人，手指被药汁染成了褐色。',
    verbs: ['交谈', '观察', '抓药'],
    actions: {
      交谈: [{ text: '「哟，{given}来了。老江的咳嗽又犯了？」' }],
      抓药: [
        { if: { quest: { id: 'prologue', is: 1 } },
          text: '掌柜看了方子，抬头打量你一眼：「老江的药？……拿去吧，钱下回再说。」他把药包递过来，又压低声音：「这两天镇上来了些外乡人，打听一个右手使剑的老头。你们……小心些。」',
          do: [{ type: 'quest', id: 'prologue', stage: 2 }, { type: 'item', id: 'med', delta: 1 },
            { type: 'time', set: 18 * 60 + 10 }, { type: 'weather', value: '大雨' },
            { type: 'feed', tag: '主线', text: '药抓好了。天色已晚，快回渡口小屋。' }, { type: 'toast', text: '获得 药 ×2' }] },
        { if: { quest: { id: 'prologue', atLeast: 2 } }, text: '「药已经给你了，快回去吧，要下大雨了。」' },
        { text: '「抓药？方子呢？」' }
      ]
    } },
  { id: 'chatan', name: '茶摊老汉', ini: '茶', tone: 'amber', brief: '就着花生说长道短',
    look: '牙掉了一半，消息却比谁都灵通。',
    verbs: ['交谈', '观察'],
    actions: { 交谈: [{ text: '「听说了没？扬州那边黑风寨又劫了漕船，整整三船盐呐！」老汉嗑着花生，又神神秘秘地凑过来：「还有江上那几条生船——船上的人，穿的是官靴。」' }] } },
  { id: 'ayp', name: '卖鱼阿婆', ini: '婆', tone: 'blue', brief: '守着半篮鲜鱼',
    look: '头发花白，手却利索，刮鳞开膛一气呵成。',
    verbs: ['交谈', '观察'],
    actions: { 交谈: [
      { if: { flag: 'mem2_pole' }, text: '「{given}啊，小时候拿扁担替阿婆出头的就是你吧？阿婆记着呢。」她往你怀里塞了一包鱼干。' },
      { if: { flag: 'mem2_trip' }, text: '「当年绊得王家恶少摔了个狗啃泥的，就是你这个小鬼头吧？」阿婆笑得合不拢嘴。' },
      { if: { flag: 'mem2_patrol' }, text: '「当年你叫来巡检替阿婆讨回了公道。那位周巡检，如今升了扬州府的捕头呢，你去扬州，可以找找他。」',
        do: [{ type: 'flag', flag: 'zhou' }] },
      { text: '「{given}，买条鱼吧？」' }
    ] } },
  { id: 'shaogong', name: '艄公', ini: '艄', tone: 'blue', brief: '蹲在船头补网',
    look: '一顶破斗笠，一杆老旱烟。',
    verbs: ['交谈', '观察'],
    actions: { 交谈: [{ text: '「那两条船？来了三天了，不打鱼，专打听人。昨天还问我，镇上有没有一个右手使剑的老头……」他忽然住了口，看了你一眼，低头继续补网。' }] } },
  { id: 'shengchuan', name: '生船', obj: true, icon: 'boat', brief: '泊在码头尽头',
    look: '船头站着两个汉子，一身渔家短打，脚上却是黑面白底的官靴。见你望过来，其中一人拉低了斗笠。',
    verbs: ['观察'], actions: {} },
  { id: 'door', name: '虚掩的门', obj: true, icon: 'door', brief: '屋里没有点灯',
    look: '门虚掩着，门闩断成了两截。',
    verbs: ['观察', '推门'],
    actions: { 推门: [{ do: [{ type: 'story', id: 'p_night' }] }] } }
];

const pack: ContentPack = {
  regions: { gz: { name: '瓜洲渡', note: '序章 · 瓜洲渡。抵达扬州之后，更大的天下会逐步展开。' } },
  rooms: ROOMS,
  npcs: NPCS
};
export default pack;
