/**
 * 第五章 霜脊之桥
 * 翻越霜脊山口。守桥人哈根加入。帝国追兵与黑骑士西格追至，
 * 巴尔德留在桥上断后，与儿子刀剑相向后，同断桥一起坠入深谷。
 */
import type { ChapterDef } from '../types';
import { npcUnit } from '../npcs';

export const ch05: ChapterDef = {
  id: 'ch05',
  index: 5,
  label: '第五章',
  title: '霜脊之桥',
  quote: '「师父教给徒弟的最后一件事，往往是如何告别。」',
  map: {
    theme: 'snow',
    seed: 65,
    rows: [
      'AAMM*..==..*MMAAAMMA',
      'AM**...==...**MMAMMA',
      'M**..T.==.T...*MMMMA',
      'M*..TT.==..F...**MMM',
      '**...T.==.......**MM',
      '*..h....=...h......*',
      '*.......=..........*',
      'CCCCCCCCBCCCCCCCCCCC',
      'CCCCCCCCBCCCCCCCCCCC',
      'CCCCCCCCBCCCCCCCCCCC',
      '*.......=..........*',
      '*..T....=....TT....*',
      '**.TT...=...TTT...**',
      '*..TTT..==..TT..n..*',
      '*...T....==.....nn.*',
      '**.......==...T....*',
      'M**.......==..TT..**',
      'MM**......==.....**M',
    ],
  },
  chests: [{ x: 3, y: 4, item: 'guard_tonic' }],
  victory: { type: 'escape', area: [5, 0, 10, 1] },
  objectiveText: '雷恩渡过吊桥，抵达北方山口（上方道路）',
  deploy: {
    max: 9,
    slots: [
      [10, 16],
      [11, 16],
      [10, 17],
      [11, 17],
      [9, 16],
      [12, 16],
      [9, 17],
      [12, 17],
      [9, 15],
      [10, 15],
    ],
    forced: ['rein', 'balder'],
  },
  units: [
    { id: 'hagen', character: 'hagen', team: 'ally', x: 8, y: 6, ai: { type: 'hold' }, face: 's' },
    { id: 'w1', classId: 'wolf', level: 6, team: 'enemy', x: 4, y: 4, ai: { type: 'aggressive' } },
    { id: 'w2', classId: 'wolf', level: 6, team: 'enemy', x: 14, y: 4, ai: { type: 'aggressive' } },
    { id: 's1', classId: 'soldier', level: 6, team: 'enemy', x: 7, y: 3, ai: { type: 'hold' } },
    { id: 's2', classId: 'soldier', level: 6, team: 'enemy', x: 10, y: 5, ai: { type: 'aggressive' } },
    { id: 'a1', classId: 'archer', level: 6, team: 'enemy', x: 11, y: 3, ai: { type: 'hold' } },
    { id: 'k1', classId: 'armor_knight', level: 6, team: 'enemy', x: 8, y: 1, ai: { type: 'hold' } },
    { id: 'c1', classId: 'cavalier', level: 6, team: 'enemy', x: 16, y: 13, ai: { type: 'aggressive' } },
    { id: 'c2', classId: 'cavalier', level: 6, team: 'enemy', x: 3, y: 14, ai: { type: 'aggressive' } },
  ],
  events: [
    {
      id: 'start',
      when: { on: 'start' },
      do: [
        { do: 'camera', x: 8, y: 7 },
        {
          do: 'say',
          lines: [
            { s: 'balder', t: '霜脊之桥。过了这座桥，就是王国北境——帝国的骑兵追不过来。', e: 'normal' },
            { s: 'hagen', t: '站住。此桥由雪山氏族看守。不报上来历的人，一步也别想过。', e: 'determined' },
            { s: 'loy', t: '桥那头的大块头……还有，北岸怎么也有帝国兵！？', e: 'surprised' },
            { s: 'balder', t: '先锋已经翻过山了。前后夹击……格雷戈这只老狐狸。', e: 'thinking' },
            { s: '', t: '【提示】雷恩抵达北方山口即可胜利。也可以让伙伴在山口「撤离」，先行离开战场。' },
          ],
        },
      ],
    },
    {
      id: 'talk_hagen',
      when: { on: 'talk', a: 'rein', b: 'hagen' },
      if: '!hagen_joined',
      do: [
        {
          do: 'say',
          lines: [
            { s: 'hagen', t: '……赤红的剑。年轻人，那是赤鳞剑吧。', e: 'surprised' },
            { s: 'rein', t: '我是赤鳞骑士团的雷恩。我们要去龙骸神殿。', e: 'normal' },
            { s: 'hagen', t: '氏族的古谚说：「持赤鳞者过桥，雪山当为其盾。」……我等这一天，等了二十年。', e: 'determined' },
            { s: 'hagen', t: '哈根，随你同行。', e: 'normal' },
          ],
        },
        { do: 'join', unit: 'hagen' },
        { do: 'flag', flag: 'hagen_joined' },
      ],
    },
    {
      id: 'talk_hagen_balder',
      when: { on: 'talk', a: 'balder', b: 'hagen' },
      if: '!hagen_joined',
      do: [
        {
          do: 'say',
          lines: [
            { s: 'balder', t: '哟，哈根。你那颗光头还是那么亮。', e: 'smile' },
            { s: 'hagen', t: '巴尔德。你那张嘴还是那么欠揍。……二十年没见，你老了。', e: 'smile' },
            { s: 'balder', t: '彼此彼此。帮个忙——后面那群孩子，带他们过桥。', e: 'normal' },
            { s: 'hagen', t: '「旧友所托，重于山岳」。交给我。', e: 'determined' },
          ],
        },
        { do: 'join', unit: 'hagen' },
        { do: 'flag', flag: 'hagen_joined' },
      ],
    },
    {
      id: 'r2',
      when: { on: 'turn', turn: 2, phase: 'enemy' },
      do: [
        {
          do: 'spawn',
          units: [
            { id: 'rs1', classId: 'soldier', level: 6, team: 'enemy', x: 6, y: 17, ai: { type: 'aggressive' } },
            { id: 'rs2', classId: 'soldier', level: 6, team: 'enemy', x: 15, y: 17, ai: { type: 'aggressive' } },
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
            { id: 'rc1', classId: 'cavalier', level: 7, team: 'enemy', x: 10, y: 17, ai: { type: 'aggressive' } },
            { id: 'rc2', classId: 'cavalier', level: 7, team: 'enemy', x: 11, y: 17, ai: { type: 'aggressive' } },
            { id: 'ra1', classId: 'archer', level: 6, team: 'enemy', x: 13, y: 17, ai: { type: 'aggressive' } },
          ],
        },
      ],
    },
    {
      id: 'gregor',
      when: { on: 'turn', turn: 4, phase: 'enemy' },
      do: [
        { do: 'camera', x: 10, y: 16 },
        {
          do: 'spawn',
          units: [
            npcUnit('gregor', { id: 'gregor5', team: 'enemy', x: 10, y: 17, level: 12, boss: true, ai: { type: 'hold' }, statMod: { hp: 20, def: 6 } }),
            { id: 'rk1', classId: 'armor_knight', level: 7, team: 'enemy', x: 9, y: 17, ai: { type: 'aggressive' } },
            { id: 'rm1', classId: 'dark_mage', level: 7, team: 'enemy', x: 12, y: 17, ai: { type: 'aggressive' }, portrait: 'cultist' },
          ],
        },
        {
          do: 'say',
          lines: [
            { s: 'gregor', t: '赤鳞的巴尔德。追了你们一路，总算见面了。', e: 'normal' },
            { s: 'balder', t: '帝国的「铁壁」格雷戈亲自出马？真是受宠若惊。', e: 'smile' },
            { s: 'gregor', t: '交出那个修女。我以将军的名誉担保，其余的人可以平安离开。', e: 'determined' },
            { s: 'balder', t: '你的名誉我信。可你身边那些灰袍子的名誉，我一个字也不信。', e: 'determined' },
            { s: 'gregor', t: '……是吗。那么，就只能用剑来谈了。', e: 'sad' },
          ],
        },
      ],
    },
    {
      id: 'gregor_retreat',
      when: { on: 'hp', unit: 'gregor5', below: 60 },
      do: [
        { do: 'say', lines: [{ s: 'gregor', t: '……好剑。可惜，你们的路在北边，不在我这里。', e: 'normal' }] },
        { do: 'leave', unit: 'gregor5' },
      ],
    },
    {
      id: 'r6',
      when: { on: 'turn', turn: 6, phase: 'enemy' },
      do: [
        {
          do: 'spawn',
          units: [
            { id: 'rw1', classId: 'wyvern_rider', level: 7, team: 'enemy', x: 0, y: 8, ai: { type: 'aggressive' } },
            { id: 'rw2', classId: 'wyvern_rider', level: 7, team: 'enemy', x: 19, y: 8, ai: { type: 'aggressive' } },
          ],
        },
        { do: 'say', lines: [{ s: 'sera', t: '飞龙从峡谷里飞上来了！快过桥！', e: 'surprised' }] },
      ],
    },
    {
      id: 'north',
      when: { on: 'enter', area: [0, 0, 19, 6], unit: 'rein' },
      do: [{ do: 'say', lines: [{ s: 'hagen', t: '山口就在前面。……桥头的事，交给我们氏族的老规矩。', e: 'thinking' }] }],
    },
  ],
  intro: [
    {
      backdrop: { type: 'map', focus: [10, 14], zoom: 1.2 },
      music: 'story_calm',
      actors: [
        { id: 'rein', look: 'rein', x: 10, y: 15, face: 'n' },
        { id: 'balder', look: 'balder', x: 11, y: 15, face: 'n' },
        { id: 'alicia', look: 'alicia', x: 10, y: 16, face: 'n' },
        { id: 'sera', look: 'sera', x: 12, y: 15, face: 'w' },
      ],
      lines: [
        { cmd: 'caption', text: '王国北境 · 霜脊山口', sub: '海岸登陆后的第六天' },
        { s: 'alicia', t: '好冷……雷恩，你的手都冻红了。', e: 'sad' },
        { s: 'rein', t: '没事。赤鳞剑一直是热的，握着它就不冷。', e: 'smile' },
        { s: 'balder', t: '……雷恩。', e: 'normal' },
        { s: 'rein', t: '是，副团长？', e: 'normal' },
        { s: 'balder', t: '你出剑的时候，右肩还是会先动。我说过多少次了。', e: 'thinking' },
        { s: 'rein', t: '……对不起。', e: 'sad' },
        { s: 'balder', t: '不过比起一年前，已经好多了。团长要是看到，大概会说「勉强及格」。', e: 'smile' },
        { s: 'rein', t: '副团长……今天怎么突然夸我？', e: 'surprised' },
        { s: 'balder', t: '人老了，话就多。别在意。', e: 'smile' },
        { s: 'sera', t: '前方就是吊桥。……还有，南边的山脊上有火把。很多。', e: 'determined' },
        { s: 'balder', t: '来了吗。走吧——在他们咬住我们的尾巴之前。', e: 'determined' },
      ],
    },
  ],
  outro: [
    {
      backdrop: { type: 'map', focus: [8, 8], zoom: 1.3 },
      music: 'story_tense',
      actors: [
        { id: 'rein', look: 'rein', x: 8, y: 5, face: 's' },
        { id: 'hagen', look: 'hagen', x: 9, y: 5, face: 's' },
        { id: 'alicia', look: 'alicia', x: 7, y: 4, face: 's' },
        { id: 'loy', look: 'loy', x: 9, y: 4, face: 's' },
        { id: 'balder', look: 'balder', x: 8, y: 6, face: 's' },
      ],
      lines: [
        { s: 'hagen', t: '桥下埋着氏族的火药。点燃它，桥就会断，追兵就过不来了。', e: 'determined' },
        { s: 'rein', t: '那就快点火！大家都已经过来了——', e: 'determined' },
        { cmd: 'spawn', actor: { id: 'sieg', look: 'sieg', team: 'enemy', x: 8, y: 10, face: 'n' } },
        { cmd: 'music', id: 'story_sad' },
        { cmd: 'move', actor: 'sieg', to: [8, 8] },
        { s: 'sieg', t: '……父亲。', e: 'normal' },
        { s: 'balder', t: '……西格。', e: 'sad' },
        { s: 'loy', t: '父亲！？那个黑铠的骑士，是副团长的……！？', e: 'surprised' },
        { s: 'sieg', t: '十年了。母亲病死的那天，你在要塞里擦你的剑。今天，你又要为了别人家的孩子挡在我面前吗。', e: 'angry' },
        { s: 'balder', t: '……我欠你和你母亲的，这辈子都还不清。', e: 'sad' },
        { s: 'balder', t: '但是西格，你身后的那些人要的是灭世的黑龙。你母亲若在，绝不会让你站在那里。', e: 'determined' },
        { s: 'sieg', t: '少拿母亲来说教！', e: 'angry' },
        { cmd: 'anim', actor: 'sieg', anim: 'attack' },
        { cmd: 'vfx', id: 'dark', at: [8, 6] },
        { cmd: 'anim', actor: 'balder', anim: 'hit' },
        { s: 'rein', t: '副团长！！', e: 'surprised' },
        { s: 'balder', t: '……别过来！哈根——点火！', e: 'hurt' },
        { s: 'hagen', t: '巴尔德，你……！', e: 'surprised' },
        { s: 'balder', t: '雷恩。我的剑……还没教完你。剩下的，你自己去悟。', e: 'smile' },
        { s: 'balder', t: '把这封信……替我交给那个笨儿子。总有一天，他会愿意读的。', e: 'sad' },
        { s: 'rein', t: '不要……不要！副团长，一起走啊！', e: 'sad' },
        { s: 'balder', t: '这是师父的最后一个命令。……活下去，雷恩。守护该守护的人。', e: 'determined' },
        { cmd: 'move', actor: 'balder', to: [8, 7] },
        { cmd: 'flash', color: '#ffb060' },
        { cmd: 'sfx', id: 'explosion' },
        { cmd: 'shake', strength: 1.2 },
        { cmd: 'tile', x: 8, y: 7, t: 'cliff' },
        { cmd: 'tile', x: 8, y: 8, t: 'cliff' },
        { cmd: 'tile', x: 8, y: 9, t: 'cliff' },
        { cmd: 'remove', actor: 'balder', fx: 'death' },
        { cmd: 'remove', actor: 'sieg', fx: 'warp' },
        { s: 'rein', t: '副团长——————！！', e: 'hurt' },
      ],
    },
    {
      backdrop: { type: 'black' },
      music: 'story_sad',
      lines: [
        { s: '', t: '霜脊之桥在烈焰中崩塌。' },
        { s: '', t: '赤鳞骑士团副团长巴尔德，与断桥一同坠入了万丈深谷。' },
        { s: 'loy', t: '……骗人的吧。副团长那么强……怎么可能……', e: 'sad' },
        { s: 'alicia', t: '……', e: 'sad' },
        { s: 'gren', t: '……那老家伙，到最后都在耍帅。', e: 'sad' },
        { s: 'rein', t: '信封上写着「致西格」。……副团长，我一定会交到他手上。', e: 'sad' },
        { s: 'hagen', t: '「把桥留给敌人的人，是把路留给了朋友。」……他是真正的守桥人。', e: 'sad' },
        { s: 'rein', t: '走吧。龙骸神殿……副团长要我们去的地方。', e: 'determined' },
      ],
    },
  ],
  recruitAfter: ['hagen'],
  leaves: ['balder'],
  music: { player: 'battle_player', enemy: 'battle_enemy' },
  reward: { gold: 1000, items: ['elixir'] },
  shop: ['steel_sword', 'steel_lance', 'steel_axe', 'steel_bow', 'javelin', 'hand_axe', 'thunder_tome', 'frost_tome', 'healing_staff', 'potion', 'elixir', 'antidote', 'steel_cuirass', 'iron_plate'],
  camp: 'full',
};
