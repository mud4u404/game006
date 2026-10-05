/**
 * 第七章 黑骑士
 * 王都平原的会战。雷恩把巴尔德的遗书交给黑骑士西格，西格倒戈。
 */
import type { ChapterDef } from '../types';
import { npcUnit } from '../npcs';

const L = (left: string, river: string, right: string) => left + river + right;

export const ch07: ChapterDef = {
  id: 'ch07',
  index: 7,
  label: '第七章',
  title: '黑骑士',
  quote: '「信纸很轻。轻得装不下十年。」',
  map: {
    theme: 'meadow',
    seed: 87,
    rows: [
      L('..nn....TT..', '~~', '..nnFnn...'),
      L('.nnn...TTT..', '~~', '.n...n....'),
      L('..n.....T...', '~~', '.....F....'),
      L('........====', 'BB', '=====.....'),
      L('..TT......=.', '~~', '.=........'),
      L('.TTT......=.', '~~', '.=...TT...'),
      L('..T.......=.', '~~', '.=..TTT...'),
      L('......n...=.', '~~', '.=...T....'),
      L('.....nnn..=.', '~~', '.======...'),
      L('......n...=.', '~~', '......nn..'),
      L('..........=.', '~~', '.....nnn..'),
      L('...TT.....==', '--', '==....n...'),
      L('..TTT.......', '~~', '......TT..'),
      L('....T...h...', '~~', '.....TTT..'),
      L('..=======...', '~~', '..h.......'),
      L('=====.......', '~~', '..........'),
    ],
  },
  victory: { type: 'boss', unit: 'gregor' },
  objectiveText: '击退帝国将军 格雷戈',
  deploy: {
    max: 11,
    slots: [
      [2, 14],
      [3, 14],
      [4, 14],
      [5, 14],
      [1, 15],
      [2, 15],
      [3, 15],
      [4, 15],
      [5, 15],
      [6, 15],
      [6, 14],
      [1, 13],
    ],
    forced: ['rein'],
  },
  units: [
    { id: 'sieg', character: 'sieg', team: 'enemy', x: 9, y: 8, ai: { type: 'wait', turn: 3 }, face: 'w' },
    { id: 'c1', classId: 'cavalier', level: 9, team: 'enemy', x: 8, y: 7, ai: { type: 'aggressive' } },
    { id: 'c2', classId: 'cavalier', level: 9, team: 'enemy', x: 7, y: 10, ai: { type: 'aggressive' } },
    { id: 'c3', classId: 'cavalier', level: 9, team: 'enemy', x: 9, y: 9, ai: { type: 'wait', turn: 3 } },
    { id: 's1', classId: 'soldier', level: 9, team: 'enemy', x: 10, y: 4, ai: { type: 'aggressive' } },
    { id: 's2', classId: 'soldier', level: 9, team: 'enemy', x: 10, y: 10, ai: { type: 'aggressive' } },
    { id: 'a1', classId: 'archer', level: 9, team: 'enemy', x: 6, y: 7, ai: { type: 'hold' } },
    { id: 's3', classId: 'soldier', level: 9, team: 'enemy', x: 14, y: 3, ai: { type: 'hold' } },
    { id: 's4', classId: 'soldier', level: 10, team: 'enemy', x: 15, y: 3, ai: { type: 'hold' } },
    { id: 'k1', classId: 'armor_knight', level: 9, team: 'enemy', x: 14, y: 11, ai: { type: 'hold' } },
    { id: 'a2', classId: 'archer', level: 9, team: 'enemy', x: 15, y: 5, ai: { type: 'hold' } },
    { id: 'm1', classId: 'dark_mage', level: 9, team: 'enemy', x: 17, y: 8, ai: { type: 'aggressive' }, portrait: 'cultist' },
    { id: 'wy1', classId: 'wyvern_rider', level: 9, team: 'enemy', x: 20, y: 5, ai: { type: 'aggressive' } },
    { id: 'cp1', classId: 'cult_priest', level: 9, team: 'enemy', x: 19, y: 1, ai: { type: 'hold' }, portrait: 'cultist' },
    npcUnit('gregor', {
      id: 'gregor',
      team: 'enemy',
      x: 18,
      y: 0,
      level: 10,
      boss: true,
      ai: { type: 'stationary' },
      statMod: { hp: 12 },
      drop: 'knight_plate',
    }),
  ],
  events: [
    {
      id: 'start',
      when: { on: 'start' },
      do: [
        { do: 'camera', x: 9, y: 8 },
        {
          do: 'say',
          lines: [
            { s: 'sieg', t: '赤鳞剑……你就是雷恩吧。父亲最后收的徒弟。', e: 'normal' },
            { s: 'rein', t: '西格！我有东西必须交给你！', e: 'determined' },
            { s: 'sieg', t: '我没有东西要从你那里拿。……三个回合后，我会亲自来取你的性命。', e: 'normal' },
          ],
        },
        { do: 'camera', x: 18, y: 0 },
        {
          do: 'say',
          lines: [
            { s: 'gregor', t: '这片平原就是你们的终点，赤鳞的孩子们。王都的城门已经对你们关上了。', e: 'normal' },
            { s: 'kia', t: '那个大胡子在说什么啊？王都不是要帮我们的吗？', e: 'thinking' },
            { s: 'sera', t: '……事情恐怕不妙。先突破这里再说。', e: 'determined' },
            { s: '', t: '【提示】让雷恩与西格「交谈」，把巴尔德的信交给他。' },
          ],
        },
      ],
    },
    {
      id: 'talk_sieg',
      when: { on: 'talk', a: 'rein', b: 'sieg' },
      do: [
        {
          do: 'say',
          lines: [
            { s: 'sieg', t: '……要拔剑就快。', e: 'normal' },
            { s: 'rein', t: '副团长在霜脊之桥上，把这封信交给了我。他说，总有一天你会愿意读的。', e: 'determined' },
            { s: 'sieg', t: '……', e: 'thinking' },
            { s: '', t: '「西格。我不是个好父亲，所以这封信写了十年，也没能写完。」' },
            { s: '', t: '「你母亲临终前握着我的手说：告诉西格，不要恨你父亲。他守护的东西，也在守护着我们。」' },
            { s: '', t: '「我一直没有勇气告诉你。如果你还愿意叫我一声父亲——就去做你母亲会为你骄傲的事吧。」' },
            { s: 'sieg', t: '……混蛋老头。到最后，还是要别人替你开口吗。', e: 'sad' },
            { s: 'sieg', t: '……', e: 'sad' },
            { s: 'sieg', t: '帝国的黑骑士，今天死了。雷恩——从现在起，我的剑归赤鳞所有。', e: 'determined' },
          ],
        },
        { do: 'join', unit: 'sieg' },
        { do: 'flag', flag: 'sieg_talked' },
      ],
    },
    {
      id: 'sieg_wake',
      when: { on: 'turn', turn: 3, phase: 'enemy' },
      if: '!sieg_talked',
      do: [{ do: 'say', lines: [{ s: 'sieg', t: '时间到了。……出发。', e: 'normal' }] }],
    },
    {
      id: 'sieg_retreat',
      when: { on: 'hp', unit: 'sieg', below: 35 },
      if: '!sieg_talked',
      do: [
        { do: 'say', lines: [{ s: 'sieg', t: '……这股剑意。和那个老头一模一样。啧——撤！', e: 'hurt' }] },
        { do: 'leave', unit: 'sieg' },
      ],
    },
    {
      id: 'r4',
      when: { on: 'turn', turn: 4, phase: 'enemy' },
      do: [
        {
          do: 'spawn',
          units: [
            { id: 'rc1', classId: 'cavalier', level: 10, team: 'enemy', x: 23, y: 8, ai: { type: 'aggressive' } },
            { id: 'rc2', classId: 'cavalier', level: 10, team: 'enemy', x: 23, y: 9, ai: { type: 'aggressive' } },
          ],
        },
      ],
    },
    {
      id: 'r6',
      when: { on: 'turn', turn: 6, phase: 'enemy' },
      do: [
        {
          do: 'spawn',
          units: [
            { id: 'rk1', classId: 'armor_knight', level: 10, team: 'enemy', x: 23, y: 3, ai: { type: 'aggressive' } },
            { id: 'rw1', classId: 'wyvern_rider', level: 10, team: 'enemy', x: 23, y: 0, ai: { type: 'aggressive' } },
            { id: 'rs1', classId: 'sorcerer', level: 9, team: 'enemy', x: 23, y: 12, ai: { type: 'aggressive' }, portrait: 'cultist' },
          ],
        },
      ],
    },
    {
      id: 'gregor_near',
      when: { on: 'enter', area: [15, 0, 23, 3], team: 'player' },
      do: [
        {
          do: 'say',
          lines: [
            { s: 'gregor', t: '赤鳞的剑……巴尔德教出来的好徒弟。可惜，这里没有桥给你们断后了。', e: 'normal' },
            { s: 'rein', t: '格雷戈将军！你真的认为教团是对的吗！？他们要放出的是灭世的黑龙！', e: 'angry' },
            { s: 'gregor', t: '……我是军人。陛下的命令，就是我的剑的方向。', e: 'sad' },
          ],
        },
      ],
    },
    {
      id: 'gregor_retreat',
      when: { on: 'hp', unit: 'gregor', below: 50 },
      do: [
        {
          do: 'say',
          lines: [
            { s: 'gregor', t: '……够了。全军后撤。', e: 'normal' },
            { s: 'gregor', t: '（陛下……您从什么时候开始，只肯听那个大主教的话了……）', e: 'thinking' },
          ],
        },
        { do: 'leave', unit: 'gregor' },
        { do: 'win' },
      ],
    },
  ],
  intro: [
    {
      backdrop: { type: 'map', focus: [4, 13], zoom: 1.1 },
      music: 'story_tense',
      actors: [
        { id: 'rein', look: 'rein', x: 4, y: 14, face: 'e' },
        { id: 'hagen', look: 'hagen', x: 3, y: 14, face: 'e' },
        { id: 'sera', look: 'sera', x: 5, y: 13, face: 'e' },
        { id: 'loy', look: 'loy', x: 3, y: 15, face: 'e' },
        { id: 'alicia', look: 'alicia', x: 4, y: 15, face: 'e' },
      ],
      lines: [
        { cmd: 'caption', text: '洛斯坦王都 · 西尔维平原', sub: '王都以东二十里' },
        { s: 'sera', t: '我从空中看过了。帝国的主力在河对岸扎营，前锋已经渡河——旗帜是黑底红纹。', e: 'determined' },
        { s: 'loy', t: '黑底红纹……是那个黑骑士。', e: 'angry' },
        { s: 'rein', t: '……西格。', e: 'thinking' },
        { s: 'loy', t: '雷恩，你还真打算把信给他？他可是杀了副团长的人！', e: 'angry' },
        { s: 'rein', t: '副团长到最后都没有恨他。……我想知道，他读完信之后会是什么表情。', e: 'determined' },
        { s: 'loy', t: '……你啊，越来越像副团长了。', e: 'sad' },
        { s: 'hagen', t: '「仇恨是一座桥，走上去的人，永远到不了对岸。」……我陪你去。', e: 'normal' },
      ],
    },
  ],
  outro: [
    {
      if: 'sieg_talked',
      backdrop: { type: 'map', focus: [10, 8], zoom: 1.2 },
      music: 'story_hope',
      actors: [
        { id: 'rein', look: 'rein', x: 10, y: 8, face: 'e' },
        { id: 'sieg', look: 'sieg', x: 11, y: 8, face: 'w' },
        { id: 'loy', look: 'loy', x: 9, y: 9, face: 'e' },
      ],
      lines: [
        { s: 'loy', t: '……我不会这么快原谅你的。', e: 'angry' },
        { s: 'sieg', t: '我也没打算被原谅。……我会用剑来还。', e: 'normal' },
        { s: 'sieg', t: '告诉你们一件事。王都已经不是你们的王都了。埃德蒙公爵宣布国王驾崩，自封摄政王，和帝国签了密约。', e: 'determined' },
        { s: 'rein', t: '什么……！？', e: 'surprised' },
        { s: 'sieg', t: '赤鳞骑士团被定为叛国者。城门不会为你们打开——但我知道一条密道。', e: 'normal' },
      ],
    },
    {
      if: '!sieg_talked',
      backdrop: { type: 'map', focus: [10, 8], zoom: 1.2 },
      music: 'story_sad',
      actors: [
        { id: 'rein', look: 'rein', x: 10, y: 8, face: 'e' },
        { id: 'sieg', look: 'sieg', x: 12, y: 8, face: 'w' },
      ],
      lines: [
        { s: 'rein', t: '西格！等一下！', e: 'determined' },
        { s: 'sieg', t: '……还有什么事。', e: 'normal' },
        { s: 'rein', t: '这是副团长留给你的信。读不读，你自己决定。', e: 'determined' },
        { s: 'sieg', t: '……', e: 'thinking' },
        { s: 'sieg', t: '……混蛋老头。', e: 'sad' },
        { s: 'sieg', t: '帝国的黑骑士，今天死了。王都已经落入埃德蒙公爵之手——跟我来，我知道进城的密道。', e: 'determined' },
      ],
    },
    {
      backdrop: { type: 'black' },
      music: 'story_tense',
      lines: [
        { s: '', t: '洛斯坦王都，摄政公爵埃德蒙宣布老王驾崩，自立为摄政王。' },
        { s: '', t: '赤鳞骑士团被宣告为「勾结黑龙的叛国者」，悬赏通缉。' },
        { s: 'alicia', t: '……他们把一切都颠倒过来了。', e: 'sad' },
        { s: 'rein', t: '那就把它颠倒回来。进城，见国王陛下——无论他是生是死，真相都在王城里。', e: 'determined' },
      ],
    },
  ],
  recruitAfter: ['sieg'],
  music: { player: 'battle_player', enemy: 'battle_enemy' },
  reward: { gold: 1500, items: ['elixir', 'power_tonic'] },
  shop: ['silver_sword', 'silver_lance', 'silver_axe', 'silver_bow', 'killing_edge', 'horseslayer', 'armorslayer', 'flame_tome', 'light_tome', 'holy_staff', 'healing_staff', 'potion', 'elixir', 'ether', 'mithril_mail', 'steel_plate', 'chest_key'],
  camp: 'full',
};
