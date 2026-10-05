/**
 * 第九章 烬火山
 * 回到一切开始的地方。赤龙伊格娜苏醒加入；醒悟的格雷戈率部阻挡教团援军。
 * 与魔女薇丝珀的最后一战。
 */
import type { ChapterDef } from '../types';
import { npcUnit } from '../npcs';

export const ch09: ChapterDef = {
  id: 'ch09',
  index: 9,
  label: '第九章',
  title: '烬火山',
  quote: '「她这一生只被一个人需要过。所以她把一生都给了那个人。」',
  map: {
    theme: 'volcano',
    seed: 109,
    rows: [
      'MMAaaaLLL##G##LLLaaaAM',
      'MAaa..aLL#_K_#LLa..aaM',
      'Maa...aaLL___LLaa...aM',
      'aa..r...aLL=LLa...r..a',
      'a.....aa..L=L..aa.....',
      '..aa....a.L=L.a....aa.',
      '..a..r....a=a....r..a.',
      '....aaa...===...aaa...',
      'LL....a....=....a....L',
      'LLL..aa.r..=..r.aa..LL',
      'aLL.......===.......La',
      'aaL..a....=....a...Laa',
      'aa...aa...=...aa....aa',
      'a....r....=....r.....a',
      '....aa....=....aa.....',
      '..........=...........',
    ],
  },
  chests: [{ x: 4, y: 3, item: 'life_fruit' }, { x: 18, y: 3, item: 'mana_crystal' }],
  victory: { type: 'boss', unit: 'vesper' },
  objectiveText: '击败魔女 薇丝珀',
  deploy: {
    max: 12,
    slots: [
      [10, 15],
      [11, 15],
      [9, 15],
      [12, 15],
      [10, 14],
      [11, 14],
      [8, 15],
      [13, 15],
      [7, 15],
      [14, 15],
      [9, 14],
      [12, 14],
      [6, 15],
    ],
    forced: ['rein', 'alicia'],
  },
  units: [
    { id: 'so1', classId: 'sorcerer', level: 10, team: 'enemy', x: 8, y: 7, ai: { type: 'aggressive' }, portrait: 'cultist' },
    { id: 'so2', classId: 'sorcerer', level: 10, team: 'enemy', x: 14, y: 7, ai: { type: 'aggressive' }, portrait: 'cultist' },
    { id: 'sa1', classId: 'salamander', level: 11, team: 'enemy', x: 3, y: 9, ai: { type: 'aggressive' } },
    { id: 'sa2', classId: 'salamander', level: 11, team: 'enemy', x: 18, y: 9, ai: { type: 'aggressive' } },
    { id: 'gl1', classId: 'golem', level: 11, team: 'enemy', x: 11, y: 8, ai: { type: 'hold' } },
    { id: 'gl2', classId: 'golem', level: 11, team: 'enemy', x: 11, y: 4, ai: { type: 'hold' } },
    { id: 'wr1', classId: 'wraith', level: 10, team: 'enemy', x: 5, y: 5, ai: { type: 'aggressive' } },
    { id: 'wr2', classId: 'wraith', level: 10, team: 'enemy', x: 16, y: 5, ai: { type: 'aggressive' } },
    { id: 'hp1', classId: 'high_priest', level: 4, team: 'enemy', x: 11, y: 2, ai: { type: 'hold' }, portrait: 'cultist' },
    { id: 'wl1', classId: 'wyvern_lord', level: 8, team: 'enemy', x: 2, y: 2, ai: { type: 'hold' } },
    { id: 'wl2', classId: 'wyvern_lord', level: 8, team: 'enemy', x: 19, y: 2, ai: { type: 'hold' } },
    npcUnit('vesper', {
      id: 'vesper',
      team: 'enemy',
      x: 11,
      y: 1,
      level: 10,
      boss: true,
      ai: { type: 'stationary' },
      statMod: { hp: 18, mag: 3, res: 4 },
      drop: 'elixir',
    }),
  ],
  events: [
    {
      id: 'start',
      when: { on: 'start' },
      do: [
        { do: 'camera', x: 11, y: 1 },
        {
          do: 'say',
          lines: [
            { s: 'vesper', t: '欢迎来到烬火山。大人的仪式就快完成了——再往前一步，你们就会成为黑龙苏醒的第一份祭品。', e: 'smile' },
            { s: 'rein', t: '薇丝珀，让开。我们不想再和你打。', e: 'determined' },
            { s: 'vesper', t: '不想打？呵……你们这些有家、有伙伴、有师父的人，真是天真得让人恶心。', e: 'angry' },
            { s: 'vesper', t: '大人在死人堆里捡到我的那天起，我的命就是大人的了。谁也别想妨碍他！', e: 'angry' },
            { s: '', t: '【提示】熔岩会灼伤站在上面的飞行单位。小心火蜥蜴的吐息。' },
          ],
        },
      ],
    },
    {
      id: 'igna',
      when: { on: 'turn', turn: 2, phase: 'player' },
      do: [
        { do: 'camera', x: 11, y: 12 },
        {
          do: 'say',
          lines: [
            { cmd: 'sfx', id: 'roar' },
            { cmd: 'shake', strength: 1 },
            { cmd: 'flash', color: '#ff7030' },
          ],
        },
        { do: 'spawn', units: [{ id: 'igna', character: 'igna', team: 'ally', x: 11, y: 12, face: 'n' }] },
        {
          do: 'say',
          lines: [
            { s: 'igna', t: '……哈啊。睡得太久，翅膀都僵了。', e: 'normal' },
            { s: 'rein', t: '这个声音……神殿里的那个——！', e: 'surprised' },
            { s: 'igna', t: '是我哦，小骑士。伊格娜——三百年前，和你的祖先缔结誓约的那条龙。', e: 'smile' },
            { s: 'igna', t: '封印松动了，我也就醒了。正好——那个想放出冥烬的家伙，我也想揍他一顿。', e: 'determined' },
            { s: 'alicia', t: '赤龙……是少女的模样……', e: 'surprised' },
            { s: 'igna', t: '龙的样子太大了，会把你们的山弄塌的。走吧，和我一起去山顶！', e: 'smile' },
          ],
        },
        { do: 'join', unit: 'igna' },
      ],
    },
    {
      id: 'r3',
      when: { on: 'turn', turn: 3, phase: 'enemy' },
      do: [
        { do: 'camera', x: 11, y: 15 },
        {
          do: 'spawn',
          units: [
            { id: 'rc1', classId: 'dark_mage', level: 11, team: 'enemy', x: 2, y: 15, ai: { type: 'aggressive' }, portrait: 'cultist' },
            { id: 'rc2', classId: 'sorcerer', level: 10, team: 'enemy', x: 20, y: 15, ai: { type: 'aggressive' }, portrait: 'cultist' },
            { id: 'rc3', classId: 'golem', level: 11, team: 'enemy', x: 1, y: 14, ai: { type: 'aggressive' } },
            { id: 'rc4', classId: 'golem', level: 11, team: 'enemy', x: 21, y: 14, ai: { type: 'aggressive' } },
          ],
        },
        { do: 'say', lines: [{ s: 'hagen', t: '山脚下来了教团的援军！要被包围了！', e: 'surprised' }] },
      ],
    },
    {
      id: 'gregor',
      when: { on: 'turn', turn: 4, phase: 'player' },
      do: [
        { do: 'camera', x: 11, y: 15 },
        {
          do: 'spawn',
          units: [
            npcUnit('gregor', { id: 'gregor', team: 'ally', x: 10, y: 15, level: 12, ai: { type: 'aggressive' } }),
            { id: 'gk1', classId: 'paladin', level: 8, team: 'ally', x: 9, y: 15, ai: { type: 'aggressive' }, name: '帝国骑士' },
            { id: 'gk2', classId: 'paladin', level: 8, team: 'ally', x: 12, y: 15, ai: { type: 'aggressive' }, name: '帝国骑士' },
          ],
        },
        {
          do: 'say',
          lines: [
            { s: 'gregor', t: '赤鳞的孩子们！后背交给帝国——不，交给我格雷戈！', e: 'determined' },
            { s: 'sieg', t: '格雷戈将军……！', e: 'surprised' },
            { s: 'gregor', t: '陛下被那个大主教的「灰烬之言」操纵了十年。我竟然到今天才看清。', e: 'sad' },
            { s: 'gregor', t: '帝国军人的荣誉，不是用来献给黑龙的。去吧！', e: 'determined' },
          ],
        },
      ],
    },
    {
      id: 'vesper_near',
      when: { on: 'enter', area: [8, 0, 14, 3], team: 'player' },
      do: [
        {
          do: 'say',
          lines: [
            { s: 'lucas', t: '薇丝珀！老师他……真的相信黑龙能「净化」世界吗？', e: 'determined' },
            { s: 'vesper', t: '……大人说，这个世界病了。战争、饥荒、背叛——只有灰烬能让一切重新开始。', e: 'normal' },
            { s: 'vesper', t: '我不懂那些大道理。我只知道，大人是唯一一个对我伸出手的人。', e: 'sad' },
          ],
        },
      ],
    },
    {
      id: 'vesper_down',
      when: { on: 'defeat', unit: 'vesper' },
      do: [
        {
          do: 'say',
          lines: [
            { s: 'vesper', t: '……啊啊。输了呢。', e: 'hurt' },
            { s: 'vesper', t: '大人……对不起……我……没能……成为您的骄傲……', e: 'sad' },
            { s: 'alicia', t: '……', e: 'sad' },
          ],
        },
      ],
    },
  ],
  intro: [
    {
      backdrop: { type: 'map', chapter: 'ch00', focus: [17, 7], zoom: 1.2 },
      music: 'story_sad',
      actors: [
        { id: 'rein', look: 'rein', x: 16, y: 7, face: 'e' },
        { id: 'loy', look: 'loy', x: 15, y: 7, face: 'e' },
        { id: 'alicia', look: 'alicia', x: 16, y: 6, face: 'e' },
      ],
      lines: [
        { cmd: 'caption', text: '赤鳞要塞 · 废墟', sub: '一切开始的地方' },
        { s: 'loy', t: '……东门。团长就是在这里，挡住了所有的敌人。', e: 'sad' },
        { s: 'rein', t: '团长，我们回来了。赤鳞剑，我一直带在身边。', e: 'sad' },
        { s: 'alicia', t: '礼拜堂的钟楼还在……塔顶的圣火，居然还没有熄灭。', e: 'surprised' },
        { s: 'loy', t: '雷恩。等这一切结束了……我们一起重建骑士团吧。', e: 'determined' },
        { s: 'rein', t: '……嗯。约好了。', e: 'smile' },
        { cmd: 'shake', strength: 0.6 },
        { cmd: 'sfx', id: 'explosion' },
        { s: 'alicia', t: '烬火山……在冒烟。天空开始变暗了。', e: 'surprised' },
        { s: 'rein', t: '日蚀要开始了。走吧——去山顶！', e: 'determined' },
      ],
    },
  ],
  outro: [
    {
      backdrop: { type: 'map', focus: [11, 1], zoom: 1.2 },
      music: 'story_tense',
      actors: [
        { id: 'rein', look: 'rein', x: 11, y: 2, face: 'n' },
        { id: 'igna', look: 'igna', x: 12, y: 2, face: 'n' },
        { id: 'lucas', look: 'lucas', x: 10, y: 2, face: 'n' },
        { id: 'alicia', look: 'alicia', x: 11, y: 3, face: 'n' },
      ],
      lines: [
        { cmd: 'spawn', actor: { id: 'mordis', look: 'mordis', team: 'enemy', x: 11, y: 0, face: 's' } },
        { s: 'mordis', t: '……薇丝珀。你做得很好。', e: 'sad' },
        { s: 'lucas', t: '老师！！', e: 'angry' },
        { s: 'mordis', t: '卢卡斯。你长大了。星辉之书……你用得很好。', e: 'smile' },
        { s: 'lucas', t: '为什么！？你教我魔法，是为了让更多的人活下去——那句话也是谎言吗！？', e: 'angry' },
        { s: 'mordis', t: '不是谎言。正因为想让人活下去，我才明白：这个世界的伤口，靠治疗是治不好的。', e: 'normal' },
        { s: 'mordis', t: '战争、饥荒、背叛，三百年来周而复始。只有灰烬，能让一切归零，让新的世界从零开始。', e: 'determined' },
        { s: 'igna', t: '归零？我见过冥烬烧过的世界，老头子。那里什么都不会再长出来。', e: 'angry' },
        { s: 'mordis', t: '赤龙。三百年来，你用自己的身体当锁。你不累吗？我来替你解脱。', e: 'normal' },
        { s: 'mordis', t: '来吧。到誓约的尽头来。日蚀之下，一切都会结束。', e: 'smile' },
        { cmd: 'remove', actor: 'mordis', fx: 'warp' },
      ],
    },
  ],
  music: { player: 'battle_player', enemy: 'boss' },
  reward: { gold: 3000, items: ['elixir', 'elixir'] },
  shop: ['silver_sword', 'silver_lance', 'silver_axe', 'silver_bow', 'killing_edge', 'killer_axe', 'killer_bow', 'flame_tome', 'light_tome', 'holy_staff', 'elixir', 'ether', 'knight_plate', 'mithril_mail'],
  camp: 'full',
};
