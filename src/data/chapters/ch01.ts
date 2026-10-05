/**
 * 第一章 逃亡之路
 * 黄昏的大道上遭帝国骑兵追击。佣兵格伦为掩护商队独自断后，雷恩一行出手相助。
 */
import type { ChapterDef } from '../types';

export const ch01: ChapterDef = {
  id: 'ch01',
  index: 1,
  label: '第一章',
  title: '逃亡之路',
  quote: '「走在前面的人，总要替后面的人挡住风。」',
  map: {
    theme: 'dusk_road',
    seed: 21,
    rows: [
      'nnTT...TTT...nn..TTTnn',
      'nTT..h..TT....n...TTnn',
      'TT...hh......r....TTTn',
      '~~-...........nn.....T',
      '~~B=========.....TT...',
      '~~-...TT...=.......T..',
      '~~....TTT..=======....',
      '~~..n..T.........=....',
      '~~.nnn......TT...=====',
      '~~..n..TT..TTT........',
      '~~-.....T...T..nn.....',
      '~~B=====......nnn..TT.',
      '~~-.....TT.......TTTTT',
      '~~~-..TTTT..n...TTTTTT',
    ],
  },
  chests: [],
  hidden: [{ x: 12, y: 2, item: 'dragon_scale' }],
  victory: { type: 'boss', unit: 'walt' },
  objectiveText: '击败追兵队长 瓦尔特',
  deploy: {
    max: 4,
    slots: [
      [21, 8],
      [20, 8],
      [21, 7],
      [21, 9],
      [20, 7],
      [20, 9],
    ],
    forced: ['rein'],
  },
  units: [
    { id: 'gren', character: 'gren', team: 'ally', x: 13, y: 6, ai: { type: 'aggressive' }, face: 'w' },
    { id: 'c1', classId: 'cavalier', level: 2, team: 'enemy', x: 11, y: 7, ai: { type: 'aggressive' } },
    { id: 'c2', classId: 'cavalier', level: 3, team: 'enemy', x: 11, y: 5, ai: { type: 'aggressive' } },
    { id: 's1', classId: 'soldier', level: 2, team: 'enemy', x: 9, y: 6, ai: { type: 'aggressive' } },
    { id: 's2', classId: 'soldier', level: 3, team: 'enemy', x: 8, y: 4, ai: { type: 'aggressive' } },
    { id: 'a1', classId: 'archer', level: 2, team: 'enemy', x: 7, y: 2, ai: { type: 'hold' } },
    { id: 'a2', classId: 'archer', level: 2, team: 'enemy', x: 5, y: 6, ai: { type: 'hold' } },
    { id: 's3', classId: 'soldier', level: 2, team: 'enemy', x: 4, y: 3, ai: { type: 'hold' } },
    {
      id: 'walt',
      classId: 'cavalier',
      level: 6,
      team: 'enemy',
      x: 3,
      y: 4,
      name: '追兵队长 瓦尔特',
      portrait: 'soldier',
      boss: true,
      ai: { type: 'hold' },
      statMod: { hp: 6, atk: 2, def: 2 },
      drop: 'potion',
      model: { helmet: 'full', cape: true },
    },
  ],
  events: [
    {
      id: 'start',
      when: { on: 'start' },
      do: [
        { do: 'camera', x: 13, y: 6 },
        {
          do: 'say',
          lines: [
            { s: 'gren', t: '啧，帝国的狗还真是没完没了。商队已经过河了吧……那就再多陪你们玩一会儿。', e: 'determined' },
            { s: 'soldier', t: '独眼的佣兵！你坏了瓦尔特队长的好事，就拿命来抵！', e: 'angry', n: '帝国骑兵' },
            { s: 'rein', t: '一个人对付那么多骑兵……副团长！', e: 'surprised' },
            { s: 'balder', t: '我知道。洛伊，你和雷恩去接应他。艾莉西亚，跟在我身后。', e: 'determined' },
            { s: '', t: '【提示】让雷恩走到格伦身旁，可以选择「交谈」。' },
          ],
        },
      ],
    },
    {
      id: 'talk_gren',
      when: { on: 'talk', a: 'rein', b: 'gren' },
      do: [
        {
          do: 'say',
          lines: [
            { s: 'gren', t: '哈？小鬼，你想帮忙？先说好——我可不打免费的仗。', e: 'normal' },
            { s: 'rein', t: '我身上没有钱。但等我们到了王都，赤鳞骑士团一定会付你报酬。', e: 'determined' },
            { s: 'gren', t: '赤鳞……？你们是那座要塞的人？', e: 'surprised' },
            { s: 'gren', t: '……十年前，你们的团长从山贼手里捞过我一回。那老头子，还活着吗？', e: 'thinking' },
            { s: 'rein', t: '……团长他，为了让我们逃出来，留在了要塞。', e: 'sad' },
            { s: 'gren', t: '是吗。……行了，这单我接了。报酬先欠着，记得加上利息。', e: 'determined' },
          ],
        },
        { do: 'join', unit: 'gren' },
        { do: 'flag', flag: 'gren_joined' },
      ],
    },
    {
      id: 'reinforce',
      when: { on: 'turn', turn: 3, phase: 'enemy' },
      do: [
        { do: 'camera', x: 3, y: 11 },
        {
          do: 'spawn',
          units: [
            { id: 'rc1', classId: 'cavalier', level: 3, team: 'enemy', x: 3, y: 11, ai: { type: 'aggressive' } },
            { id: 'rc2', classId: 'soldier', level: 2, team: 'enemy', x: 4, y: 11, ai: { type: 'aggressive' } },
          ],
        },
        { do: 'say', lines: [{ s: 'balder', t: '南边的桥也有骑兵过来了。别被包了饺子。', e: 'determined' }] },
      ],
    },
    {
      id: 'near_walt',
      when: { on: 'enter', area: [2, 2, 7, 6], team: 'player' },
      do: [
        {
          do: 'say',
          lines: [
            { s: 'soldier', t: '赤鳞骑士团的残党吗。哼，一把锈剑、一个老头、几个小鬼——这就是传说中的誓约骑士？', e: 'normal', n: '瓦尔特' },
            { s: 'balder', t: '锈剑砍人也是会疼的。要试试吗？', e: 'smile' },
          ],
        },
      ],
    },
    {
      id: 'stele',
      when: { on: 'enter', area: [11, 1, 15, 3], team: 'player' },
      do: [
        {
          do: 'say',
          lines: [
            { s: 'alicia', t: '这块古碑……上面刻的是龙的鳞片纹样。', e: 'thinking' },
            { s: 'balder', t: '誓约骑士留下的路碑。传说他们在碑下埋了赤龙的信物——在碑旁停留一会儿，说不定能找到什么。', e: 'normal' },
          ],
        },
      ],
    },
    {
      id: 'walt_down',
      when: { on: 'defeat', unit: 'walt' },
      do: [
        { do: 'say', lines: [{ s: 'soldier', t: '可恶……格雷戈将军的大军……很快就会……', e: 'hurt', n: '瓦尔特' }] },
      ],
    },
    {
      id: 'gren_auto',
      when: { on: 'defeat', unit: 'walt' },
      if: '!gren_joined',
      do: [
        {
          do: 'say',
          lines: [
            { s: 'gren', t: '帮了大忙啊，小鬼们。你们也要往王都去？……正好，我的雇主跑了，接下来正缺一份差事。', e: 'smile' },
          ],
        },
        { do: 'join', unit: 'gren' },
      ],
    },
  ],
  intro: [
    {
      backdrop: { type: 'map', focus: [19, 8], zoom: 1.2 },
      music: 'story_calm',
      actors: [
        { id: 'rein', look: 'rein', x: 19, y: 8, face: 'w' },
        { id: 'alicia', look: 'alicia', x: 20, y: 8, face: 'w' },
        { id: 'loy', look: 'loy', x: 20, y: 7, face: 'w' },
        { id: 'balder', look: 'balder', x: 18, y: 8, face: 'w' },
      ],
      lines: [
        { cmd: 'caption', text: '王国东部 · 落日大道', sub: '要塞陷落后的第二天' },
        { s: 'loy', t: '走了一整天……脚都不是自己的了。副团长，王都到底还有多远？', e: 'sad' },
        { s: 'balder', t: '过了西边的河就是王国直辖领。照这个速度，再走五天。', e: 'normal' },
        { s: 'loy', t: '五天！？', e: 'surprised' },
        { s: 'balder', t: '如果你继续抱怨，就是六天。', e: 'smile' },
        { s: 'alicia', t: '……那些人，为什么要抓我呢。我只是礼拜堂的修女，连自己的父母是谁都不知道。', e: 'sad' },
        { s: 'rein', t: '不管是为什么，我都不会让他们得逞。团长把剑交给我，就是为了这个。', e: 'determined' },
        { s: 'alicia', t: '……嗯。谢谢你，雷恩。', e: 'smile' },
        { cmd: 'sfx', id: 'slash' },
        { s: 'balder', t: '……安静。前面有刀剑的声音。', e: 'determined' },
        { cmd: 'camera', at: [12, 6], zoom: 1.1 },
        { cmd: 'spawn', actor: { id: 'gren', look: 'gren', x: 13, y: 6, face: 'w' } },
        { cmd: 'spawn', actor: { id: 'x1', look: 'cavalier', team: 'enemy', x: 11, y: 6, face: 'e' } },
        { cmd: 'anim', actor: 'gren', anim: 'attack' },
        { cmd: 'anim', actor: 'x1', anim: 'hit' },
        { s: 'loy', t: '帝国的骑兵——在围攻一个人！', e: 'surprised' },
        { s: 'balder', t: '是在掩护商队撤退的佣兵。……我们自身难保，本不该多管闲事。', e: 'thinking' },
        { s: 'rein', t: '副团长。', e: 'determined' },
        { s: 'balder', t: '……我知道。「守护该守护的人」，是吧。真是被那老头子教坏了。', e: 'smile' },
      ],
    },
  ],
  outro: [
    {
      backdrop: { type: 'map', focus: [3, 4], zoom: 1.2 },
      music: 'story_calm',
      actors: [
        { id: 'rein', look: 'rein', x: 4, y: 4, face: 'w' },
        { id: 'gren', look: 'gren', x: 3, y: 4, face: 'e' },
        { id: 'balder', look: 'balder', x: 5, y: 4, face: 'w' },
        { id: 'alicia', look: 'alicia', x: 5, y: 5, face: 'w' },
        { id: 'loy', look: 'loy', x: 4, y: 5, face: 'w' },
      ],
      lines: [
        { s: 'gren', t: '格伦。只认金币的佣兵。……你们呢？', e: 'normal' },
        { s: 'rein', t: '雷恩。赤鳞骑士团的见习骑士。', e: 'normal' },
        { s: 'balder', t: '巴尔德。……你这只眼睛，是在北边的银矿战役丢的吧。', e: 'thinking' },
        { s: 'gren', t: '哈，连这个都知道？看来赤鳞的副团长不只会耍嘴皮子。', e: 'smile' },
        { s: 'gren', t: '那个队长死前提到了格雷戈。帝国的「铁壁」格雷戈——你们惹上的，可不是什么小麻烦。', e: 'determined' },
        { s: 'balder', t: '帝国的名将，和灰烬教团混在一起……事情越来越难看了。', e: 'thinking' },
        { s: 'alicia', t: '雷恩……你的脖子，在发光。', e: 'surprised' },
        { s: 'rein', t: '……又在发烫了。就好像，有什么东西在西边呼唤它。', e: 'thinking' },
        { s: 'balder', t: '先过河。天黑之前，我们得找到落脚的地方。', e: 'normal' },
      ],
    },
  ],
  music: { player: 'battle_player', enemy: 'battle_enemy' },
  reward: { gold: 400, items: ['herb', 'herb'] },
  shop: [],
  camp: 'march',
};
