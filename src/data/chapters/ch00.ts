/**
 * 序章 赤鳞之夜
 * 教团与帝国先遣队夜袭赤鳞要塞。团长阿尔贝里克死守东门，雷恩一行向西门突围。
 */
import type { ChapterDef } from '../types';
import { npcUnit } from '../npcs';

export const ch00: ChapterDef = {
  id: 'ch00',
  index: 0,
  label: '序章',
  title: '赤鳞之夜',
  quote: '「誓约不会因为一座要塞的陷落而终结。」',
  map: {
    theme: 'night_fort',
    seed: 11,
    rows: [
      '####################',
      '#hh..F....#....F.hh#',
      '#h.......I#I.......#',
      '#....____...____...#',
      '#....____...____...#',
      '##..==========....##',
      'G...=..._____.=....G',
      'G...=..._____.=....G',
      '##..==========....##',
      '#.....T.....T......#',
      '#hh..TT..I.I..TT.hh#',
      '#h...T...___...T..h#',
      '#........###.......#',
      '####################',
    ],
  },
  chests: [{ x: 2, y: 3, item: 'potion' }],
  hidden: [],
  victory: { type: 'escape', area: [0, 6, 1, 7] },
  objectiveText: '雷恩抵达西门（左侧城门）',
  deploy: { max: 0, slots: [] },
  units: [
    { id: 'rein', character: 'rein', team: 'player', x: 10, y: 7, face: 'w' },
    { id: 'alicia', character: 'alicia', team: 'player', x: 11, y: 7, face: 'w' },
    { id: 'balder', character: 'balder', team: 'player', x: 12, y: 6, face: 'w' },
    { id: 'loy', character: 'loy', team: 'player', x: 11, y: 6, face: 'w' },
    npcUnit('alberic', { id: 'alberic', team: 'ally', x: 17, y: 7, level: 12, ai: { type: 'hold' }, face: 'e', equipment: { weapon: 'silver_sword' } }),
    { id: 'k1', classId: 'cavalier', level: 3, team: 'ally', x: 17, y: 6, ai: { type: 'hold' }, name: '骑士团骑士', portrait: 'knight', face: 'e', model: { primary: '#a8262c', secondary: '#e8dcc0' } },
    // 已攻入要塞的敌人
    { id: 'e1', classId: 'soldier', level: 1, team: 'enemy', x: 6, y: 3, ai: { type: 'aggressive' } },
    { id: 'e2', classId: 'soldier', level: 2, team: 'enemy', x: 3, y: 9, ai: { type: 'aggressive' } },
    { id: 'e3', classId: 'archer', level: 1, team: 'enemy', x: 7, y: 1, ai: { type: 'hold' } },
    { id: 'e4', classId: 'dark_mage', level: 1, team: 'enemy', x: 6, y: 11, ai: { type: 'aggressive' }, portrait: 'cultist' },
    { id: 'e5', classId: 'soldier', level: 1, team: 'enemy', x: 14, y: 3, ai: { type: 'aggressive' } },
    {
      id: 'heck',
      classId: 'dark_mage',
      level: 3,
      team: 'enemy',
      x: 2,
      y: 6,
      name: '教团先锋 赫克',
      portrait: 'cultist',
      boss: true,
      ai: { type: 'hold' },
      drop: 'herb',
    },
    { id: 'e6', classId: 'soldier', level: 2, team: 'enemy', x: 2, y: 7, ai: { type: 'hold' } },
  ],
  events: [
    {
      id: 'start',
      when: { on: 'start' },
      do: [
        {
          do: 'say',
          lines: [
            { s: 'balder', t: '东门交给团长。我们的任务只有一个——带艾莉西亚从西门出去。', e: 'determined' },
            { s: 'loy', t: '西门那边也有火光……他们连退路都堵上了？', e: 'surprised' },
            { s: 'balder', t: '所以才需要你们这两把还没开刃的剑。雷恩，你走在最前面。', e: 'normal' },
            { s: 'rein', t: '……是，副团长！', e: 'determined' },
            { s: 'alicia', t: '我会跟在大家身后。受伤了一定要告诉我。', e: 'determined' },
            { s: '', t: '【提示】选中单位后移动，再选择「攻击」。艾莉西亚可以用「治疗」恢复同伴的体力。' },
          ],
        },
      ],
    },
    {
      id: 'reinforce2',
      when: { on: 'turn', turn: 2, phase: 'enemy' },
      do: [
        { do: 'camera', x: 18, y: 6 },
        {
          do: 'spawn',
          units: [
            { id: 'r1', classId: 'soldier', level: 2, team: 'enemy', x: 19, y: 6, ai: { type: 'aggressive' } },
            { id: 'r2', classId: 'soldier', level: 1, team: 'enemy', x: 19, y: 7, ai: { type: 'aggressive' } },
          ],
        },
        {
          do: 'say',
          lines: [
            { s: 'alberic', t: '一个也别想过去！赤鳞骑士团在此！', e: 'angry' },
          ],
        },
      ],
    },
    {
      id: 'alberic_last',
      when: { on: 'turn', turn: 4, phase: 'player' },
      do: [
        { do: 'camera', x: 17, y: 7 },
        {
          do: 'say',
          lines: [
            { cmd: 'vfx', id: 'dark', at: [17, 7] },
            { cmd: 'shake', strength: 0.5 },
            { s: 'alberic', t: '咳……是暗之魔法……教团的人也来了吗……', e: 'hurt' },
            { s: 'rein', t: '团长！！', e: 'surprised' },
            { s: 'alberic', t: '别回头，雷恩！赤鳞剑已经交给你了——那把剑，比我这把老骨头更重要！', e: 'determined' },
            { s: 'balder', t: '……走吧。这是团长的命令。', e: 'sad' },
          ],
        },
        { do: 'leave', unit: 'alberic' },
        { do: 'leave', unit: 'k1' },
        {
          do: 'spawn',
          units: [
            { id: 'r3', classId: 'soldier', level: 2, team: 'enemy', x: 18, y: 6, ai: { type: 'aggressive' } },
            { id: 'r4', classId: 'dark_mage', level: 2, team: 'enemy', x: 18, y: 7, ai: { type: 'aggressive' }, portrait: 'cultist' },
            { id: 'r5', classId: 'soldier', level: 2, team: 'enemy', x: 19, y: 7, ai: { type: 'aggressive' } },
          ],
        },
      ],
    },
    {
      id: 'near_gate',
      when: { on: 'enter', area: [1, 4, 5, 9], team: 'player' },
      do: [
        {
          do: 'say',
          lines: [
            { s: 'cultist', t: '嘿……就是那个修女。大主教要的人。', e: 'normal', n: '教团先锋 赫克' },
            { s: 'alicia', t: '……要我？为什么……', e: 'surprised' },
            { s: 'rein', t: '不管为什么——你们休想碰她一根手指！', e: 'angry' },
          ],
        },
      ],
    },
    {
      id: 'heck_down',
      when: { on: 'defeat', unit: 'heck' },
      do: [
        {
          do: 'say',
          lines: [
            { s: 'cultist', t: '灰烬……终将覆盖一切……大主教大人……', e: 'hurt', n: '教团先锋 赫克' },
          ],
        },
      ],
    },
  ],
  intro: [
    {
      backdrop: { type: 'parchment' },
      music: 'title',
      lines: [
        { cmd: 'caption', text: '烬龙誓约', sub: 'EMBEROATH' },
        { s: '', t: '三百年前，灭世黑龙「冥烬」自地底苏醒。灰烬遮蔽天空，整整七年不见日光。' },
        { s: '', t: '赤龙伊格娜与七名人类骑士立下誓约——赤龙以己身为锁，将黑龙封入烬火山的心脏。' },
        { s: '', t: '骑士们则发誓，世世代代守护封印，守护赤龙永恒的沉眠。' },
        { s: '', t: '人们称之为「烬龙誓约」。骑士们的后裔，便是东境的赤鳞骑士团。' },
        { s: '', t: '三百年后，誓约已成传说。直到那一夜——' },
      ],
    },
    {
      backdrop: { type: 'map', focus: [10, 6], zoom: 1.1 },
      music: 'story_calm',
      actors: [
        { id: 'rein', look: 'rein', x: 9, y: 6, face: 'e' },
        { id: 'loy', look: 'loy', x: 10, y: 6, face: 'w' },
      ],
      lines: [
        { cmd: 'caption', text: '洛斯坦王国东境', sub: '赤鳞要塞 · 深夜' },
        { s: 'loy', t: '喂，雷恩。你又在摸脖子上那块胎记了。', e: 'smile' },
        { s: 'rein', t: '……它今晚一直在发烫。', e: 'thinking' },
        { s: 'loy', t: '哈！说不定是龙在召唤你呢——「赤鳞的勇者啊，醒来吧」之类的。', e: 'smile' },
        { s: 'rein', t: '别拿传说开玩笑，洛伊。被副团长听见，我们又要多守一个月的夜。', e: 'normal' },
        { cmd: 'spawn', actor: { id: 'alicia', look: 'alicia', x: 7, y: 7, face: 'e' } },
        { cmd: 'move', actor: 'alicia', to: [9, 7] },
        { s: 'alicia', t: '两位，辛苦了。我煮了些热茶——夜里风大，别着凉。', e: 'smile' },
        { s: 'loy', t: '艾莉西亚！你简直是这座要塞唯一的光！', e: 'smile' },
        { s: 'alicia', t: '……雷恩？你的脸色不太好。', e: 'normal' },
        { s: 'rein', t: '没什么。只是总觉得……东边的天空，比平时更暗。', e: 'thinking' },
        { cmd: 'sfx', id: 'explosion' },
        { cmd: 'shake', strength: 0.8 },
        { cmd: 'flash', color: '#ff8040' },
        { s: 'loy', t: '什——东门那边起火了！', e: 'surprised' },
        { cmd: 'music', id: 'story_tense' },
        { cmd: 'spawn', actor: { id: 'balder', look: 'balder', x: 13, y: 6, face: 'w' } },
        { cmd: 'move', actor: 'balder', to: [11, 6] },
        { s: 'balder', t: '都还活着？很好。帝国的军旗，还有灰色的长袍——是灰烬教团。', e: 'determined' },
        { cmd: 'spawn', actor: { id: 'alberic', look: 'alberic', x: 15, y: 7, face: 'w' } },
        { cmd: 'move', actor: 'alberic', to: [12, 7] },
        { s: 'alberic', t: '巴尔德，带上孩子们和艾莉西亚，从西门离开要塞，去王都。', e: 'determined' },
        { s: 'balder', t: '团长，要塞里还有——', e: 'surprised' },
        { s: 'alberic', t: '他们的目标是艾莉西亚。我不知道为什么，但教团的人在城墙下喊她的名字。', e: 'normal' },
        { s: 'alicia', t: '……我？', e: 'surprised' },
        { s: 'alberic', t: '雷恩，过来。', e: 'normal' },
        { cmd: 'move', actor: 'rein', to: [11, 7] },
        { s: 'alberic', t: '这是赤鳞剑。骑士团代代相传之物——现在它是你的了。', e: 'determined' },
        { s: 'rein', t: '团长，我只是个见习骑士！这把剑应该——', e: 'surprised' },
        { s: 'alberic', t: '剑选择主人，不看头衔。你脖子上的那块鳞，就是答案。', e: 'smile' },
        { s: 'alberic', t: '活下去，雷恩。守护该守护的人——这便是赤鳞骑士的全部誓言。', e: 'determined' },
        { s: 'rein', t: '……是！', e: 'determined' },
      ],
    },
  ],
  outro: [
    {
      backdrop: { type: 'map', focus: [2, 7], zoom: 1.1 },
      music: 'story_sad',
      actors: [
        { id: 'rein', look: 'rein', x: 1, y: 7, face: 'e' },
        { id: 'alicia', look: 'alicia', x: 1, y: 6, face: 'e' },
        { id: 'balder', look: 'balder', x: 0, y: 6, face: 'w' },
        { id: 'loy', look: 'loy', x: 0, y: 7, face: 'w' },
      ],
      lines: [
        { s: 'loy', t: '要塞……烧起来了……', e: 'sad' },
        { s: 'alicia', t: '团长大人，礼拜堂的大家……愿圣火指引你们的魂灵……', e: 'sad' },
        { s: 'rein', t: '……副团长。他们为什么要抓艾莉西亚？', e: 'angry' },
        { s: 'balder', t: '我不知道。但团长知道些什么——否则不会把赤鳞剑交给你。', e: 'thinking' },
        { s: 'balder', t: '去王都。国王陛下与骑士团有旧约，他会给我们答案。', e: 'determined' },
        { s: 'balder', t: '别回头看，雷恩。往前走，就是对死者最好的祭奠。', e: 'normal' },
        { s: 'rein', t: '（团长……我一定会守住的。不管那是什么样的誓约。）', e: 'determined' },
      ],
    },
  ],
  music: { player: 'battle_player', enemy: 'battle_enemy' },
  reward: { gold: 300, items: ['herb'] },
  shop: [],
  camp: 'none',
};
