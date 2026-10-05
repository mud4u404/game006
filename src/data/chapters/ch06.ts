/**
 * 第六章 龙骸神殿
 * 建在古龙骸骨中的神殿。壁画揭示誓约的真相与艾莉西亚的血脉。
 * 雷恩继承誓约，成为「赤鳞骑士」。教团魔女薇丝珀率不死者来袭。
 */
import type { ChapterDef } from '../types';
import { npcUnit } from '../npcs';

export const ch06: ChapterDef = {
  id: 'ch06',
  index: 6,
  label: '第六章',
  title: '龙骸神殿',
  quote: '「誓约不是锁链。是有人愿意握住你的手。」',
  map: {
    theme: 'temple',
    seed: 76,
    rows: [
      '#####################',
      '#___#____SKS____#___#',
      '#___#_I__SSS__I_#___#',
      '#___G___________G___#',
      '#___#__I_____I__#___#',
      '##G##___________##G##',
      '#___#__I__r__I__#___#',
      '#___________________#',
      '#__I__I__r_r__I__I__#',
      '#___________________#',
      '###__I___===___I__###',
      '..#_______=_______#..',
      '..#__I____=____I__#..',
      '..####___===___####..',
      '....T#___===___#T....',
      '...TT.....===.....TT.',
    ],
  },
  chests: [
    { x: 1, y: 1, item: 'dragon_scale' },
    { x: 19, y: 1, item: 'saint_ring' },
    { x: 1, y: 6, item: 'wisdom_tonic' },
    { x: 19, y: 6, item: 'spirit_tonic' },
  ],
  victory: { type: 'boss', unit: 'vesper' },
  objectiveText: '击退教团魔女 薇丝珀',
  deploy: {
    max: 10,
    slots: [
      [9, 14],
      [10, 14],
      [11, 14],
      [8, 14],
      [12, 14],
      [9, 15],
      [10, 15],
      [11, 15],
      [8, 15],
      [12, 15],
      [7, 15],
    ],
    forced: ['rein', 'alicia'],
  },
  units: [
    { id: 'sk1', classId: 'skeleton', level: 7, team: 'enemy', x: 6, y: 7, ai: { type: 'aggressive' } },
    { id: 'sk2', classId: 'skeleton', level: 7, team: 'enemy', x: 14, y: 7, ai: { type: 'aggressive' } },
    { id: 'sk3', classId: 'skeleton', level: 7, team: 'enemy', x: 10, y: 9, ai: { type: 'aggressive' } },
    { id: 'wr1', classId: 'wraith', level: 7, team: 'enemy', x: 10, y: 4, ai: { type: 'hold' } },
    { id: 'dm1', classId: 'dark_mage', level: 7, team: 'enemy', x: 8, y: 4, ai: { type: 'hold' }, portrait: 'cultist' },
    { id: 'so1', classId: 'sorcerer', level: 6, team: 'enemy', x: 12, y: 4, ai: { type: 'hold' }, portrait: 'cultist' },
    { id: 'gl1', classId: 'golem', level: 7, team: 'enemy', x: 10, y: 6, ai: { type: 'hold' } },
    { id: 'cp1', classId: 'cult_priest', level: 7, team: 'enemy', x: 9, y: 2, ai: { type: 'hold' }, portrait: 'cultist' },
    { id: 'th1', classId: 'thief', level: 7, team: 'enemy', x: 2, y: 9, ai: { type: 'thief', exit: [0, 11] }, name: '教团盗贼', drop: 'chest_key' },
    { id: 'th2', classId: 'thief', level: 7, team: 'enemy', x: 18, y: 9, ai: { type: 'thief', exit: [20, 11] }, name: '教团盗贼' },
    npcUnit('vesper', {
      id: 'vesper',
      team: 'enemy',
      x: 10,
      y: 1,
      level: 6,
      boss: true,
      ai: { type: 'stationary' },
      statMod: { hp: 12, res: 3 },
    }),
  ],
  events: [
    {
      id: 'start',
      when: { on: 'start' },
      do: [
        { do: 'camera', x: 10, y: 2 },
        {
          do: 'say',
          lines: [
            { s: 'vesper', t: '哎呀，来得正好。我还以为要在这堆骨头里等上好几天呢。', e: 'smile' },
            { s: 'vesper', t: '巫女的小姑娘，过来吧。摩尔迪斯大主教想见你很久了。', e: 'smile' },
            { s: 'lucas', t: '……摩尔迪斯？', e: 'surprised' },
            { s: 'kia', t: '怎么了，书呆子？脸都白了。', e: 'thinking' },
            { s: 'lucas', t: '不……没什么。只是同名而已。……一定只是同名。', e: 'sad' },
            { s: 'rein', t: '想带走艾莉西亚，先过我这一关！', e: 'angry' },
            { s: 'vesper', t: '真可爱。那么，先让死人陪你们玩一会儿吧。', e: 'smile' },
            { s: '', t: '【提示】不死系敌人惧怕圣属性。两侧房间的宝箱会被盗贼盯上。' },
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
            { id: 'rwr1', classId: 'wraith', level: 7, team: 'enemy', x: 1, y: 9, ai: { type: 'aggressive' } },
            { id: 'rwr2', classId: 'wraith', level: 7, team: 'enemy', x: 19, y: 9, ai: { type: 'aggressive' } },
          ],
        },
        { do: 'say', lines: [{ s: 'vesper', t: '起来吧，三百年前死在这里的可怜虫们。', e: 'smile' }] },
      ],
    },
    {
      id: 'r5',
      when: { on: 'turn', turn: 5, phase: 'enemy' },
      do: [
        {
          do: 'spawn',
          units: [
            { id: 'rsk1', classId: 'skeleton', level: 8, team: 'enemy', x: 6, y: 9, ai: { type: 'aggressive' } },
            { id: 'rsk2', classId: 'skeleton', level: 8, team: 'enemy', x: 14, y: 9, ai: { type: 'aggressive' } },
          ],
        },
      ],
    },
    {
      id: 'ring',
      when: { on: 'chest', x: 19, y: 1 },
      do: [{ do: 'say', lines: [{ s: 'alicia', t: '这枚指环……好温暖。好像在呼唤我。', e: 'thinking' }] }],
    },
    {
      id: 'vesper_flee',
      when: { on: 'hp', unit: 'vesper', below: 50 },
      do: [
        {
          do: 'say',
          lines: [
            { s: 'vesper', t: '……哼，赤鳞的小鬼，倒是有几分本事。', e: 'angry' },
            { s: 'vesper', t: '今天就到这里吧。下次见面时，可别再让我失望哦——巫女小姐。', e: 'smile' },
          ],
        },
        { do: 'leave', unit: 'vesper' },
        { do: 'win' },
      ],
    },
    {
      id: 'vesper_down',
      when: { on: 'defeat', unit: 'vesper' },
      do: [{ do: 'say', lines: [{ s: 'vesper', t: '大主教大人……对不起……', e: 'hurt' }] }],
    },
  ],
  intro: [
    {
      backdrop: { type: 'map', focus: [10, 8], zoom: 1.1 },
      music: 'story_calm',
      actors: [
        { id: 'rein', look: 'rein', x: 10, y: 9, face: 'n' },
        { id: 'alicia', look: 'alicia', x: 9, y: 9, face: 'n' },
        { id: 'hagen', look: 'hagen', x: 11, y: 9, face: 'n' },
        { id: 'lucas', look: 'lucas', x: 10, y: 10, face: 'n' },
      ],
      lines: [
        { cmd: 'caption', text: '霜脊山中 · 龙骸神殿', sub: '三百年前誓约缔结之地' },
        { s: 'lucas', t: '这些柱子……是骨头。整座神殿，是建在一头巨龙的遗骸里面的！', e: 'surprised' },
        { s: 'hagen', t: '氏族称它为「先祖之骨」。三百年前，与黑龙交战而死的龙族，都葬在这片山里。', e: 'normal' },
        { s: 'alicia', t: '墙上的壁画……一位少女跪在龙的面前，手腕上有一个印记……', e: 'thinking' },
        { s: 'alicia', t: '……和我手腕上的这个，一模一样。', e: 'surprised' },
        { s: 'lucas', t: '壁画的铭文是古语：「守印之巫，以血为锁；赤鳞之骑，以身为剑」。', e: 'thinking' },
        { s: 'lucas', t: '巫女的血能加固封印，也能打开封印。教团想要的，就是你，艾莉西亚。', e: 'determined' },
        { s: 'alicia', t: '……我一直以为，我是被人丢在礼拜堂门口的孤儿。', e: 'sad' },
        { s: 'rein', t: '不管你的血是什么，你就是艾莉西亚。这一点不会变。', e: 'determined' },
        { s: 'alicia', t: '……嗯。', e: 'smile' },
        { cmd: 'flash', color: '#ff9040' },
        { s: 'igna', t: '……持赤鳞剑的孩子。你听得见我的声音吗。', e: 'normal', n: '遥远的声音' },
        { s: 'rein', t: '谁！？', e: 'surprised' },
        { s: 'igna', t: '三百年了。我一直在等誓约骑士的血脉回到这里。你颈上的鳞，就是那个人留下的证明。', e: 'normal', n: '遥远的声音' },
        { s: 'igna', t: '你愿意继承誓约吗？不是为了我，是为了你想守护的人。', e: 'normal', n: '遥远的声音' },
        { s: 'rein', t: '……我愿意。团长和副团长守护的东西，我来继续守护。', e: 'determined' },
        { cmd: 'vfx', id: 'promote', at: [10, 9] },
        { cmd: 'sfx', id: 'promote' },
        { s: '', t: '赤鳞剑燃起了真正的火焰。雷恩转职为「赤鳞骑士」！' },
        { s: 'igna', t: '……很好。来烬火山找我吧，小骑士。在那之前——小心身后。', e: 'smile', n: '遥远的声音' },
      ],
    },
  ],
  outro: [
    {
      backdrop: { type: 'map', focus: [10, 3], zoom: 1.2 },
      music: 'story_hope',
      actors: [
        { id: 'rein', look: 'rein', x: 10, y: 3, face: 'n' },
        { id: 'alicia', look: 'alicia', x: 9, y: 3, face: 'n' },
        { id: 'lucas', look: 'lucas', x: 11, y: 4, face: 'w' },
        { id: 'sera', look: 'sera', x: 8, y: 4, face: 'e' },
      ],
      lines: [
        { s: 'lucas', t: '……雷恩，我必须告诉你们一件事。', e: 'sad' },
        { s: 'lucas', t: '我的恩师，魔导学院的院长——他的名字就叫摩尔迪斯。', e: 'sad' },
        { s: 'sera', t: '……教团的大主教，和你的老师同名？', e: 'surprised' },
        { s: 'lucas', t: '老师是最温柔的人。他教我魔法，是为了「让更多的人活下去」。他不可能……', e: 'sad' },
        { s: 'rein', t: '那就去确认吧。在亲眼看到之前，什么都别下结论。', e: 'normal' },
        { s: 'lucas', t: '……嗯。谢谢你。', e: 'smile' },
        { s: 'alicia', t: '如果我的血能打开封印，那它一定也能加固封印。我不想再只是被保护的那个人了。', e: 'determined' },
        { s: 'sera', t: '下山之后便是王都平原。帝国的主力，恐怕已经在那里等着我们了。', e: 'determined' },
        { s: 'rein', t: '……还有那个黑铠的骑士。副团长的信，我必须交给他。', e: 'determined' },
      ],
    },
  ],
  storyPromotions: { rein: 'crimson_knight' },
  music: { player: 'battle_player', enemy: 'boss' },
  reward: { gold: 1200, items: ['elixir'] },
  shop: ['steel_sword', 'silver_sword', 'steel_lance', 'silver_lance', 'steel_axe', 'steel_bow', 'thunder_tome', 'frost_tome', 'light_tome', 'holy_staff', 'potion', 'elixir', 'ether', 'steel_cuirass', 'mithril_mail', 'iron_plate', 'chest_key'],
  camp: 'march',
};
