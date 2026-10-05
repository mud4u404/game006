/**
 * 第二章 林间的箭
 * 受教团雇佣的山贼袭击林边村落。猎户之女菲娜孤身守村。
 */
import type { ChapterDef } from '../types';

export const ch02: ChapterDef = {
  id: 'ch02',
  index: 2,
  label: '第二章',
  title: '林间的箭',
  quote: '「父亲说过，箭要射向该射的地方。」',
  map: {
    theme: 'forest',
    seed: 32,
    rows: [
      'TTTTTTnnTTTTTTTTTTTTTT',
      'TT.F..nTTT..TT...V..TT',
      'T.....TTT....T.......T',
      'T..r..TT..-~-...TT...T',
      'TT....T...-~-..TTT...T',
      'TTT..TTT..-~-...T..V.T',
      'T......T..=B=........T',
      'T..TT.....-~-..TT....T',
      'T..TTT....-~-..TTT...T',
      'TT..T..V..-~-.....T..T',
      'TT........-B-.....TT.T',
      'T.....TT..-~-...TTT..T',
      'T..TT.TTT.-~-..T.....T',
      'TT.TTT....-~-.....TTTT',
      'TTTTT.....-~-....TTTTT',
      'TTTTTTT...-~-...TTTTTT',
    ],
  },
  villages: [
    {
      x: 17,
      y: 1,
      item: 'potion',
      lines: [
        { s: 'villager', t: '谢谢你们赶走了山贼！这瓶药是我们家祖传的方子，请收下吧。', e: 'smile' },
      ],
    },
    {
      x: 19,
      y: 5,
      item: 'speed_tonic',
      lines: [
        { s: 'villager', t: '这里是菲娜家……她父亲是村里最好的猎人。上个月，被那些山贼……', e: 'sad' },
        { s: 'villager', t: '菲娜一直把这瓶疾风药水留着，说要等父亲打猎回来时给他。……请交给她吧。', e: 'sad' },
      ],
    },
    {
      x: 7,
      y: 9,
      item: 'dragon_scale',
      lines: [
        { s: 'elder', t: '赤红的剑……颈上的鳞印……难道你是誓约骑士的后人？', e: 'surprised' },
        { s: 'elder', t: '三百年前，一位誓约骑士在这片林子里隐居。他留下一片龙鳞，嘱咐我们的祖先：「等到持赤鳞剑的人到来，便交给他。」', e: 'normal' },
        { s: 'elder', t: '我们守了三百年。现在，它是你的了。', e: 'smile' },
      ],
    },
  ],
  victory: { type: 'boss', unit: 'buck' },
  objectiveText: '击败山贼头目 巴克',
  deploy: {
    max: 5,
    slots: [
      [14, 14],
      [15, 14],
      [13, 14],
      [16, 14],
      [14, 13],
      [15, 13],
    ],
    forced: ['rein'],
  },
  units: [
    { id: 'fina', character: 'fina', team: 'ally', x: 19, y: 6, ai: { type: 'hold' }, face: 'w' },
    { id: 'b1', classId: 'brigand', level: 3, team: 'enemy', x: 16, y: 2, ai: { type: 'raider' } },
    { id: 'b2', classId: 'brigand', level: 3, team: 'enemy', x: 5, y: 8, ai: { type: 'raider' } },
    { id: 'b3', classId: 'brigand', level: 4, team: 'enemy', x: 20, y: 3, ai: { type: 'aggressive' } },
    { id: 'a1', classId: 'archer', level: 3, team: 'enemy', x: 14, y: 2, ai: { type: 'hold' } },
    { id: 'b4', classId: 'brigand', level: 3, team: 'enemy', x: 8, y: 5, ai: { type: 'aggressive' } },
    { id: 'm1', classId: 'dark_mage', level: 3, team: 'enemy', x: 5, y: 2, ai: { type: 'hold' }, portrait: 'cultist' },
    { id: 'w1', classId: 'wolf', level: 3, team: 'enemy', x: 7, y: 13, ai: { type: 'aggressive' } },
    { id: 'w2', classId: 'wolf', level: 3, team: 'enemy', x: 4, y: 11, ai: { type: 'aggressive' } },
    {
      id: 'buck',
      classId: 'brigand',
      level: 7,
      team: 'enemy',
      x: 3,
      y: 1,
      name: '山贼头目 巴克',
      portrait: 'bandit',
      boss: true,
      ai: { type: 'hold' },
      statMod: { hp: 8, atk: 2, def: 1 },
      drop: 'hand_axe',
    },
  ],
  events: [
    {
      id: 'start',
      when: { on: 'start' },
      do: [
        { do: 'camera', x: 19, y: 6 },
        {
          do: 'say',
          lines: [
            { s: 'fina', t: '想烧村子？先问问我的箭答不答应！', e: 'angry' },
            { s: 'bandit', t: '哈哈！小丫头，你那死鬼老爹也是这么说的！', e: 'smile', n: '山贼' },
            { s: 'fina', t: '……！你们这群——', e: 'angry' },
            { s: 'gren', t: '那些山贼的斧头是新打的，盔甲也比王国的正规兵还好。背后有金主啊。', e: 'thinking' },
            { s: 'rein', t: '先救村子！别让他们靠近民房！', e: 'determined' },
            { s: '', t: '【提示】山贼会前往村庄劫掠。抢先一步「拜访」村庄，能得到村民的谢礼。' },
          ],
        },
      ],
    },
    {
      id: 'talk_fina_rein',
      when: { on: 'talk', a: 'rein', b: 'fina' },
      if: '!fina_joined',
      do: [
        {
          do: 'say',
          lines: [
            { s: 'fina', t: '你、你们又是谁！？那身红色的盔甲……', e: 'surprised' },
            { s: 'rein', t: '赤鳞骑士团的雷恩。我们是来帮忙的。', e: 'normal' },
            { s: 'fina', t: '骑士团……！爸爸说过，赤鳞的骑士是好人。', e: 'thinking' },
            { s: 'fina', t: '我叫菲娜！这片林子里没有我不认识的路——跟我来，从侧面绕过去打他们！', e: 'determined' },
          ],
        },
        { do: 'join', unit: 'fina' },
        { do: 'flag', flag: 'fina_joined' },
      ],
    },
    {
      id: 'talk_fina_loy',
      when: { on: 'talk', a: 'loy', b: 'fina' },
      if: '!fina_joined',
      do: [
        {
          do: 'say',
          lines: [
            { s: 'loy', t: '喂喂，小心点！刚才那一箭差点射中我的头盔啊！', e: 'surprised' },
            { s: 'fina', t: '……是你自己跑进射程里的。你是山贼？看起来不太像，太笨了。', e: 'normal' },
            { s: 'loy', t: '笨！？我可是赤鳞骑士团的洛伊大人！', e: 'angry' },
            { s: 'fina', t: '骑士团！？……那、那就帮我一起赶走他们！我叫菲娜！', e: 'determined' },
          ],
        },
        { do: 'join', unit: 'fina' },
        { do: 'flag', flag: 'fina_joined' },
      ],
    },
    {
      id: 'reinforce',
      when: { on: 'turn', turn: 4, phase: 'enemy' },
      do: [
        { do: 'camera', x: 1, y: 6 },
        {
          do: 'spawn',
          units: [
            { id: 'rb1', classId: 'brigand', level: 4, team: 'enemy', x: 1, y: 6, ai: { type: 'aggressive' } },
            { id: 'rb2', classId: 'archer', level: 3, team: 'enemy', x: 2, y: 7, ai: { type: 'aggressive' } },
          ],
        },
        { do: 'say', lines: [{ s: 'bandit', t: '老大！兄弟们从西边绕过来了！', e: 'smile', n: '山贼' }] },
      ],
    },
    {
      id: 'near_buck',
      when: { on: 'enter', area: [0, 0, 7, 4], team: 'player' },
      do: [
        {
          do: 'say',
          lines: [
            { s: 'bandit', t: '赤鳞骑士团？哈！灰袍子的大人们说得没错，你们果然往这边来了。', e: 'smile', n: '巴克' },
            { s: 'bandit', t: '把那个修女交出来，我就留你们一条全尸！', e: 'angry', n: '巴克' },
          ],
        },
      ],
    },
    {
      id: 'buck_down',
      when: { on: 'defeat', unit: 'buck' },
      do: [{ do: 'say', lines: [{ s: 'bandit', t: '不、不该接这单的……那些灰袍子……说好的……', e: 'hurt', n: '巴克' }] }],
    },
    {
      id: 'fina_auto',
      when: { on: 'defeat', unit: 'buck' },
      if: '!fina_joined',
      do: [
        { do: 'say', lines: [{ s: 'fina', t: '你们……真的把他们打跑了。我、我也要跟你们走！我要找到雇山贼的那些人！', e: 'determined' }] },
        { do: 'join', unit: 'fina' },
      ],
    },
  ],
  intro: [
    {
      backdrop: { type: 'map', focus: [14, 13], zoom: 1.2 },
      music: 'story_tense',
      actors: [
        { id: 'rein', look: 'rein', x: 14, y: 14, face: 'n' },
        { id: 'gren', look: 'gren', x: 15, y: 14, face: 'n' },
        { id: 'loy', look: 'loy', x: 13, y: 14, face: 'n' },
        { id: 'alicia', look: 'alicia', x: 14, y: 15, face: 'n' },
        { id: 'balder', look: 'balder', x: 15, y: 15, face: 'n' },
      ],
      lines: [
        { cmd: 'caption', text: '王国直辖领 · 翠鸣林', sub: '林边村' },
        { s: 'loy', t: '前面有烟……是村子着火了吗？', e: 'surprised' },
        { s: 'gren', t: '山贼。这一带的山贼向来只敢抢商队，今天胆子倒是大了。', e: 'thinking' },
        { cmd: 'sfx', id: 'bow' },
        { cmd: 'vfx', id: 'arrow', at: [13, 13], from: [18, 8] },
        { s: 'loy', t: '哇啊啊！？哪、哪里来的箭！？', e: 'surprised' },
        { s: 'fina', t: '再往前一步，下一箭就射穿你的脑袋！', e: 'angry', n: '？？？' },
        { s: 'balder', t: '……好箭法。若是有心杀人，洛伊现在已经是只刺猬了。', e: 'smile' },
        { s: 'loy', t: '副团长，请不要用那么冷静的语气说可怕的话！', e: 'sad' },
        { cmd: 'sfx', id: 'explosion' },
        { s: 'alicia', t: '村子那边——有人在喊救命！', e: 'surprised' },
        { s: 'rein', t: '走！先救人！', e: 'determined' },
      ],
    },
  ],
  outro: [
    {
      backdrop: { type: 'map', focus: [7, 9], zoom: 1.2 },
      music: 'story_sad',
      actors: [
        { id: 'fina', look: 'fina', x: 7, y: 8, face: 's' },
        { id: 'rein', look: 'rein', x: 6, y: 9, face: 'e' },
        { id: 'alicia', look: 'alicia', x: 8, y: 9, face: 'w' },
        { id: 'elder', look: 'elder', x: 7, y: 10, face: 'n' },
      ],
      lines: [
        { s: 'fina', t: '爸爸……我守住村子了。', e: 'sad' },
        { s: 'alicia', t: '愿圣火温暖你父亲的魂灵。他一定会为你骄傲的。', e: 'sad' },
        { s: 'elder', t: '那些山贼说，雇他们的是一群穿灰袍的人。灰袍子在找一个「巫女」……', e: 'thinking' },
        { s: 'alicia', t: '巫女……？', e: 'surprised' },
        { s: 'elder', t: '老一辈的传说里，守护封印的巫女身上有一枚圣痕，她的血能让沉睡的龙苏醒，也能让它永远沉眠。', e: 'normal' },
        { s: 'alicia', t: '（圣痕……我手腕上的这个印记，修道院长说只是胎记……）', e: 'thinking' },
        { s: 'fina', t: '我要跟你们一起走。雇山贼的那些人——杀了爸爸的真正凶手，我一定要找到他们！', e: 'determined' },
        { s: 'rein', t: '……好。我们一起。', e: 'determined' },
        { s: 'gren', t: '又多了一张吃饭的嘴。副团长，骑士团的报酬是不是该加点了？', e: 'smile' },
        { s: 'balder', t: '等到了王都，你可以去跟国王陛下谈。', e: 'smile' },
      ],
    },
  ],
  music: { player: 'battle_player', enemy: 'battle_enemy' },
  reward: { gold: 600, items: ['herb'] },
  shop: ['iron_sword', 'iron_lance', 'iron_axe', 'iron_bow', 'herb', 'potion', 'antidote', 'leather_armor'],
  camp: 'full',
};
