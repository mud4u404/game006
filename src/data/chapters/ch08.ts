/**
 * 第八章 王都的阴影
 * 摄政公爵埃德蒙篡位。经西格所知的密道潜入王城，压制王座。
 * 薇丝珀揭露：教团大主教摩尔迪斯，正是卢卡斯的恩师。
 */
import type { ChapterDef } from '../types';
import { npcUnit } from '../npcs';

export const ch08: ChapterDef = {
  id: 'ch08',
  index: 8,
  label: '第八章',
  title: '王都的阴影',
  quote: '「王冠很重。重到有人愿意为它出卖整个王国。」',
  map: {
    theme: 'castle',
    seed: 98,
    rows: [
      '#######################',
      '#___#_____SKS_____#___#',
      '#___#_I___SSS___I_#___#',
      '#___G_____________G___#',
      '#___#__I_______I__#___#',
      '#####_____===_____#####',
      '#___#_I___===___I_#___#',
      '#___G_____===_____G___#',
      '#___#_____===_____#___#',
      '##S#####GG===GG#####S##',
      '..........===..........',
      '.h..TT....===....TT..h.',
      '.hh.T.....===.....T.hh.',
      '..........===..........',
      '~~~~~~~~~BB=BB~~~~~~~~~',
      '..d.......===.......d..',
    ],
  },
  chests: [
    { x: 1, y: 1, item: 'dragon_scale' },
    { x: 21, y: 1, item: 'shadow_cloak' },
    { x: 1, y: 6, item: 'berserk_seal' },
    { x: 21, y: 6, item: 'ranger_cloak' },
    { x: 3, y: 8, gold: 3000 },
  ],
  victory: { type: 'seize', x: 11, y: 1 },
  objectiveText: '雷恩压制王座',
  deploy: {
    max: 12,
    slots: [
      [10, 15],
      [11, 15],
      [12, 15],
      [9, 15],
      [13, 15],
      [8, 15],
      [14, 15],
      [7, 15],
      [15, 15],
      [6, 15],
      [16, 15],
      [5, 15],
      [17, 15],
    ],
    forced: ['rein', 'lucas'],
  },
  units: [
    { id: 'g1', classId: 'soldier', level: 11, team: 'enemy', x: 11, y: 12, ai: { type: 'aggressive' } },
    { id: 'g2', classId: 'soldier', level: 11, team: 'enemy', x: 10, y: 11, ai: { type: 'aggressive' } },
    { id: 'g3', classId: 'soldier', level: 11, team: 'enemy', x: 12, y: 11, ai: { type: 'aggressive' } },
    { id: 'ar1', classId: 'archer', level: 11, team: 'enemy', x: 4, y: 10, ai: { type: 'aggressive' } },
    { id: 'ar2', classId: 'archer', level: 11, team: 'enemy', x: 18, y: 10, ai: { type: 'aggressive' } },
    { id: 'k1', classId: 'armor_knight', level: 11, team: 'enemy', x: 8, y: 9, ai: { type: 'hold' } },
    { id: 'k2', classId: 'armor_knight', level: 11, team: 'enemy', x: 14, y: 9, ai: { type: 'hold' } },
    { id: 'k3', classId: 'general', level: 6, team: 'enemy', x: 11, y: 7, ai: { type: 'hold' } },
    { id: 'p1', classId: 'paladin', level: 6, team: 'enemy', x: 9, y: 4, ai: { type: 'hold' } },
    { id: 'p2', classId: 'paladin', level: 6, team: 'enemy', x: 13, y: 4, ai: { type: 'hold' } },
    { id: 'so1', classId: 'sorcerer', level: 8, team: 'enemy', x: 7, y: 2, ai: { type: 'hold' }, portrait: 'cultist' },
    { id: 'so2', classId: 'sorcerer', level: 8, team: 'enemy', x: 15, y: 2, ai: { type: 'hold' }, portrait: 'cultist' },
    { id: 'cp1', classId: 'cult_priest', level: 11, team: 'enemy', x: 11, y: 3, ai: { type: 'hold' }, portrait: 'cultist' },
    { id: 'th1', classId: 'thief', level: 11, team: 'enemy', x: 0, y: 12, ai: { type: 'thief', exit: [0, 13] }, name: '宫廷密探' },
    { id: 'th2', classId: 'thief', level: 11, team: 'enemy', x: 22, y: 12, ai: { type: 'thief', exit: [22, 13] }, name: '宫廷密探' },
    npcUnit('edmund', {
      id: 'edmund',
      team: 'enemy',
      x: 11,
      y: 1,
      level: 10,
      boss: true,
      ai: { type: 'stationary' },
      statMod: { hp: 15, def: 3 },
      equipment: { weapon: 'silver_sword' },
      drop: 'life_ring',
    }),
  ],
  events: [
    {
      id: 'start',
      when: { on: 'start' },
      do: [
        { do: 'camera', x: 11, y: 2 },
        {
          do: 'say',
          lines: [
            { s: 'edmund', t: '赤鳞骑士团的余孽，竟敢从下水道爬进王城。真是一群老鼠。', e: 'smile' },
            { s: 'rein', t: '埃德蒙！国王陛下在哪里！', e: 'angry' },
            { s: 'edmund', t: '陛下？那个卧病十年的老头子，早该让位了。洛斯坦需要的是能与帝国、与教团谈判的君主。', e: 'smile' },
            { s: 'sieg', t: '谈判？你只是把王国卖了个好价钱。', e: 'angry' },
            { s: 'edmund', t: '哼，叛变的狗也敢对我吠。卫兵！把他们全部吊在城门上！', e: 'angry' },
            { s: '', t: '【提示】城堡两侧的房间藏有珍贵的道具，宫廷密探会抢先下手。' },
          ],
        },
      ],
    },
    {
      id: 'r3',
      when: { on: 'turn', turn: 3, phase: 'enemy' },
      do: [
        {
          do: 'spawn',
          units: [
            { id: 'rw1', classId: 'wyvern_lord', level: 6, team: 'enemy', x: 0, y: 10, ai: { type: 'aggressive' } },
            { id: 'rw2', classId: 'wyvern_lord', level: 6, team: 'enemy', x: 22, y: 10, ai: { type: 'aggressive' } },
          ],
        },
        { do: 'say', lines: [{ s: 'sera', t: '帝国的飞龙将！连王都的天空都交给他们了吗……', e: 'angry' }] },
      ],
    },
    {
      id: 'r5',
      when: { on: 'turn', turn: 5, phase: 'enemy' },
      do: [
        { do: 'camera', x: 11, y: 14 },
        {
          do: 'spawn',
          units: [
            { id: 'rp1', classId: 'paladin', level: 7, team: 'enemy', x: 10, y: 15, ai: { type: 'aggressive' } },
            { id: 'rp2', classId: 'paladin', level: 7, team: 'enemy', x: 12, y: 15, ai: { type: 'aggressive' } },
          ],
        },
        { do: 'say', lines: [{ s: 'gren', t: '后面也来了！城外的骑兵追进来了！', e: 'surprised' }] },
      ],
    },
    {
      id: 'near_edmund',
      when: { on: 'enter', area: [5, 1, 17, 3], team: 'player' },
      do: [
        {
          do: 'say',
          lines: [
            { s: 'edmund', t: '别过来！我是洛斯坦的摄政王！教团答应过我，黑龙复活之后，洛斯坦会是唯一幸存的王国！', e: 'surprised' },
            { s: 'kia', t: '唯一幸存？你是说，其他的国家都会被烧光？', e: 'angry' },
            { s: 'edmund', t: '弱者被淘汰，是世界的法则！', e: 'angry' },
            { s: 'rein', t: '……我终于明白团长为什么总说「守护」两个字了。因为世上总有你这样的人。', e: 'angry' },
          ],
        },
      ],
    },
    {
      id: 'edmund_down',
      when: { on: 'defeat', unit: 'edmund' },
      do: [{ do: 'say', lines: [{ s: 'edmund', t: '王冠……我的……王冠……', e: 'hurt' }] }],
    },
  ],
  intro: [
    {
      backdrop: { type: 'black' },
      music: 'story_tense',
      lines: [
        { cmd: 'caption', text: '洛斯坦王都 · 地下水道', sub: '深夜' },
        { s: 'sieg', t: '这条水道直通王城的后庭。是我当年在帝国的情报里看到的——讽刺吧。', e: 'normal' },
        { s: 'kia', t: '臭死了……贵族住的地方，下面竟然这么脏。', e: 'angry' },
        { s: 'lucas', t: '……', e: 'thinking' },
        { s: 'alicia', t: '卢卡斯？从神殿出来以后，你一直很少说话。', e: 'sad' },
        { s: 'lucas', t: '我在想老师。如果他真的是教团的大主教……那他教给我的一切，都是谎言吗。', e: 'sad' },
        { s: 'alicia', t: '……不管他是谁，你学到的魔法救过我们很多次。那不是谎言。', e: 'smile' },
        { s: 'lucas', t: '……谢谢。', e: 'smile' },
        { s: 'rein', t: '到出口了。准备好——冲进王城，压制王座！', e: 'determined' },
      ],
    },
  ],
  outro: [
    {
      backdrop: { type: 'map', focus: [11, 2], zoom: 1.2 },
      music: 'story_tense',
      actors: [
        { id: 'rein', look: 'rein', x: 11, y: 2, face: 'n' },
        { id: 'lucas', look: 'lucas', x: 10, y: 3, face: 'n' },
        { id: 'alicia', look: 'alicia', x: 12, y: 3, face: 'n' },
        { id: 'sieg', look: 'sieg', x: 13, y: 3, face: 'w' },
      ],
      lines: [
        { cmd: 'spawn', actor: { id: 'vesper', look: 'vesper', team: 'enemy', x: 11, y: 1, face: 's' } },
        { s: 'vesper', t: '真遗憾。那个蠢公爵，本来还能多拖住你们几天的。', e: 'smile' },
        { s: 'rein', t: '薇丝珀！', e: 'angry' },
        { s: 'vesper', t: '巫女小姐，别紧张。今天我只是来传话的——', e: 'smile' },
        { s: 'vesper', t: '卢卡斯·维恩。摩尔迪斯大人让我转告你：「你的星辉之书，用得还顺手吗？」', e: 'smile' },
        { s: 'lucas', t: '……！', e: 'surprised' },
        { s: 'vesper', t: '没错哦。教团的大主教，魔导学院的前院长，你最敬爱的老师——是同一个人。', e: 'smile' },
        { s: 'vesper', t: '大人在烬火山等你们。日蚀之日，黑龙将会苏醒。带上巫女来吧，这是大人最后的「课堂」。', e: 'smile' },
        { cmd: 'remove', actor: 'vesper', fx: 'warp' },
        { s: 'lucas', t: '……老师……为什么……', e: 'sad' },
        { s: 'rein', t: '卢卡斯。', e: 'normal' },
        { s: 'lucas', t: '……我没事。不，我有事。但是……我要亲口问他。我要听他亲口说出理由。', e: 'determined' },
        { s: 'sieg', t: '地牢里找到了国王陛下。还活着——只是被下了药。', e: 'normal' },
        { s: 'alicia', t: '太好了……！', e: 'smile' },
        { s: 'rein', t: '烬火山……就在赤鳞要塞的背后。我们要回去了。回到一切开始的地方。', e: 'determined' },
      ],
    },
  ],
  music: { player: 'battle_player', enemy: 'boss' },
  reward: { gold: 2500, items: ['elixir', 'elixir'] },
  shop: ['silver_sword', 'silver_lance', 'silver_axe', 'silver_bow', 'killing_edge', 'killer_axe', 'killer_bow', 'longbow', 'flame_tome', 'light_tome', 'holy_staff', 'healing_staff', 'elixir', 'ether', 'mithril_mail', 'steel_plate', 'knight_plate', 'chest_key'],
  camp: 'full',
};
